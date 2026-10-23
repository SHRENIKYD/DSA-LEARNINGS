(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (py02) ---------- */
  // Python-style text for a JS value (lists, tuples, strings, None, booleans).
  function rp(v) {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (Array.isArray(v)) return '[' + v.map(rp).join(', ') + ']';
    if (typeof v === 'object' && v.__tuple) return '(' + v.items.map(rp).join(', ') + (v.items.length === 1 ? ',' : '') + ')';
    if (typeof v === 'string') return "'" + v + "'";
    return String(v);
  }
  function tup(items) { return { __tuple: true, items: items.slice() }; }
  // Build a code part with one highlighted line.
  function cp(code, line, cls, label) {
    var hl = {};
    if (line) hl[line] = cls || 'cur';
    return { type: 'code', label: label || 'Python code (current line highlighted)', lang: 'python', code: code, hl: hl };
  }
  // Build a vars part; values are converted to Python text.
  function vp(obj, hlKey, cls, label) {
    var vals = {}, hl = {};
    Object.keys(obj).forEach(function (k) { vals[k] = rp(obj[k]); });
    if (hlKey) String(hlKey).split(',').forEach(function (k) { hl[k] = cls || 'ok'; });
    return { type: 'vars', label: label || 'Variables (names → objects)', vals: vals, hl: hl };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // Parse a Python-ish literal token: int, float, 'str', "str", True/False/None, else bare word as string.
  function lit(t) {
    t = String(t).trim();
    if (/^-?\d+$/.test(t)) return parseInt(t, 10);
    if (/^-?\d*\.\d+$/.test(t)) return parseFloat(t);
    if (/^'.*'$/.test(t) || /^".*"$/.test(t)) return t.slice(1, -1);
    if (t === 'True') return true;
    if (t === 'False') return false;
    if (t === 'None') return null;
    return t;
  }
  function words(s) { return String(s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }

  /* ================= TOPIC 1: if / elif / else, truthiness ================= */
  topics.push({
    title: 'Making Decisions: if / elif / else, Truthiness & Short-Circuit Logic',
    analogy: `<p>Think of a <b>security guard at a club door</b> with a checklist. He reads the rules <b>top to bottom</b>: "On the VIP list? → VIP lounge. Else, over 18? → main hall. Else → go home." The moment one rule matches, he stops reading — he never checks the rest. That is exactly how <code>if / elif / else</code> works: first match wins, everything below is skipped.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A program usually needs to do <i>different things in different situations</i>. In Python you write that with <code>if</code>, optional <code>elif</code> ("else if") branches, and an optional final <code>else</code>. Python checks each condition <b>in order</b>, runs the <b>first</b> block whose condition is true, and skips all the others.</p>
<pre>score = 73
if score &gt;= 90:
    grade = 'A'
elif score &gt;= 75:
    grade = 'B'
elif score &gt;= 50:
    grade = 'C'      # ← 73 lands here (first true check)
else:
    grade = 'F'</pre>
<p><b>Indentation is the syntax.</b> Python has no <code>{ }</code> braces — the block is "everything indented under the colon". The standard is 4 spaces. Mixing tabs and spaces gives a <code>TabError</code>.</p>
<p><b>Comparison operators</b> give back <code>True</code> or <code>False</code>: <code>==  !=  &lt;  &lt;=  &gt;  &gt;=</code>, plus <code>in</code> / <code>not in</code> (membership) and <code>is</code> / <code>is not</code> (same object — use it only for <code>None</code>). Python lets you <b>chain</b> them like in maths: <code>0 &lt;= x &lt; 10</code> means <code>0 &lt;= x and x &lt; 10</code>.</p>
<p><b>Truthiness.</b> Any object can stand in a condition. These are <b>falsy</b> (behave like False):</p>
${H.table(['Falsy value', 'Kind'], [['<code>False</code>, <code>None</code>', 'special constants'], ['<code>0</code>, <code>0.0</code>, <code>0j</code>', 'numeric zero'], ['<code>\'\'</code>, <code>[]</code>, <code>()</code>, <code>{}</code>, <code>set()</code>, <code>range(0)</code>', 'empty containers']])}
<p>Everything else is <b>truthy</b> — including <code>'0'</code>, <code>'False'</code>, <code>[0]</code> and <code>-1</code>. So <code>if items:</code> is the Pythonic way to say "if the list is not empty".</p>
<p><b>and / or / not</b> are words, not symbols. They <b>short-circuit</b>: <code>a and b</code> stops at the first falsy value; <code>a or b</code> stops at the first truthy value — and they return <b>that object</b>, not necessarily <code>True</code>/<code>False</code>. That is why <code>name = typed or 'Guest'</code> gives a default.</p>
<p><b>One-line choice</b> (conditional expression): <code>label = 'even' if n % 2 == 0 else 'odd'</code>.</p>
<p><b>match / case</b> (Python 3.10+) compares a value against <b>shapes</b> (patterns) — handy for commands like <code>('move', x, y)</code>. For simple number ranges, plain <code>if/elif</code> is still clearer.</p>`,
    clues: [
      '"return X if …, otherwise Y" / "classify into categories" → an <code>if / elif / else</code> ladder, ordered from most specific to most general',
      '"check if the list/string is empty" → <code>if not items:</code> (truthiness), never <code>len(items) == 0</code> in idiomatic code',
      '"default value when missing/blank" → <code>x or default</code> (but beware: 0 and \'\' are also falsy)',
      '"value is between a and b" → chained comparison <code>a &lt;= x &lt;= b</code>',
      '"compare to None" → <code>is None</code> / <code>is not None</code>, never <code>== None</code>',
      '"avoid division by zero / index error" → short-circuit guard <code>if d != 0 and n / d &gt; 2</code>',
      '"dispatch on a command shape" → <code>match / case</code> with tuple or class patterns (3.10+)'
    ],
    code: [{ lang: 'python', run: true, title: 'Grading ladder, truthiness and short-circuit (runnable)', code: `def grade(score):
    # Ladder is ordered from highest to lowest: the first True branch wins.
    if score >= 90:
        return 'A'
    elif score >= 75:
        return 'B'
    elif score >= 50:
        return 'C'
    else:
        return 'F'

for s in [95, 80, 73, 12]:
    print(s, '->', grade(s))

# Truthiness: empty containers, 0 and None are falsy.
for value in [0, 1, '', 'hi', [], [0], None]:
    print(repr(value).ljust(6), 'is truthy?', bool(value))

# Short-circuit: 'or' returns the first truthy operand (or the last one).
typed = ''
name = typed or 'Guest'
print('Hello,', name)

# Chained comparison reads like maths.
x = 7
print(0 <= x < 10)          # True

# Conditional expression (ternary).
label = 'even' if x % 2 == 0 else 'odd'
print(x, 'is', label)` },
    { lang: 'python', run: true, title: 'match / case (Python 3.10+) for command shapes', code: `def handle(cmd):
    match cmd:
        case ('move', x, y):          # a 3-item tuple starting with 'move'
            return f'moving to ({x}, {y})'
        case ('say', text):
            return f'saying {text!r}'
        case 'quit' | 'exit':          # either string
            return 'bye'
        case _:                        # wildcard = else
            return 'unknown command'

print(handle(('move', 3, 4)))
print(handle(('say', 'hi')))
print(handle('exit'))
print(handle(42))` }],
    codeTitle: ['Decisions in Python', 'Structural pattern matching'],
    viz: [{
      title: 'Walk an if / elif / else ladder',
      input: '73',
      inputLabel: 'score (integer)',
      gen: function (input) {
        var s = parseInt(String(input).trim(), 10);
        if (isNaN(s)) throw new Error('Enter one integer, e.g. 73');
        if (s < -1000 || s > 1000) throw new Error('Keep the score between -1000 and 1000');
        var code = ['score = ' + s, 'if score >= 90:', "    grade = 'A'", 'elif score >= 75:', "    grade = 'B'", 'elif score >= 50:', "    grade = 'C'", 'else:', "    grade = 'F'", 'print(grade)'].join('\n');
        var frames = [], v = { score: s };
        frames.push(fr('Line 1 binds the name <b>score</b> to the int object <b>' + s + '</b>. No decision yet.', [cp(code, 1, 'ok'), vp(v, 'score')]));
        var tests = [[2, 90, 3, 'A'], [4, 75, 5, 'B'], [6, 50, 7, 'C']], g = null;
        for (var i = 0; i < tests.length; i++) {
          var t = tests[i], ok = s >= t[1];
          frames.push(fr('Check line ' + t[0] + ': is <code>' + s + ' &gt;= ' + t[1] + '</code>? → <b>' + (ok ? '<span class="c-g">True</span>' : '<span class="c-r">False</span>') + '</b>. ' + (ok ? 'First true branch found — enter it.' : 'False, so Python skips this block and moves to the next <code>elif</code>.'), [cp(code, t[0], ok ? 'ok' : 'bad'), vp(v), tx('<code>' + s + ' &gt;= ' + t[1] + '</code> → <b>' + (ok ? 'True' : 'False') + '</b>', 'condition')]));
          if (ok) {
            g = t[3]; v.grade = g;
            frames.push(fr('Run the block on line ' + t[2] + ': <b>grade = \'' + g + '\'</b>. Every remaining <code>elif</code>/<code>else</code> is <b>skipped without being checked</b>.', [cp(code, t[2], 'ok'), vp(v, 'grade')]));
            break;
          }
        }
        if (!g) {
          frames.push(fr('No condition was true, so the <code>else</code> on line 8 catches everything left.', [cp(code, 8, 'cur'), vp(v)]));
          g = 'F'; v.grade = g;
          frames.push(fr('Line 9 runs: <b>grade = \'F\'</b>.', [cp(code, 9, 'ok'), vp(v, 'grade')]));
        }
        frames.push(fr('After the ladder, execution continues at line 10 and prints <b>' + g + '</b>. Exactly <b>one</b> branch ran.', [cp(code, 10, 'sel'), vp(v, 'grade', 'sel'), tx('<b>Output:</b> <code>' + g + '</code>', 'stdout')]));
        return frames;
      }
    }, {
      title: 'Truthiness & short-circuit: name = typed or "Guest"',
      input: "'' 'Asha' 0 [] [0] None 'False'",
      inputLabel: "values to try (Python literals separated by spaces: '' 0 [] None 'x' ...)",
      gen: function (input) {
        var toks = String(input).match(/'[^']*'|"[^"]*"|\[[^\]]*\]|\(\)|\{\}|\S+/g) || [];
        if (!toks.length) throw new Error("Enter some Python literals, e.g. '' 'Asha' 0 []");
        if (toks.length > 10) throw new Error('Use at most 10 values');
        var code = ['typed = <value>', "name = typed or 'Guest'", 'print(name)'].join('\n');
        var frames = [fr('<code>or</code> looks at the left operand first. If it is <b>truthy</b>, that object is the answer and the right side is <b>never evaluated</b>. If it is falsy, the answer is the right operand.', [cp(code, 2, 'cur'), tx('Falsy: <code>False None 0 0.0 \'\' [] () {} set()</code>. Everything else is truthy.', 'rule')])];
        var rows = [];
        toks.forEach(function (t) {
          var falsy = /^(''|""|0|0\.0|\[\s*\]|\(\)|\{\}|None|False)$/.test(t);
          var res = falsy ? "'Guest'" : t;
          rows.push([t, falsy ? 'False' : 'True', res]);
          frames.push(fr('<code>typed = ' + esc(t) + '</code> → <code>bool(typed)</code> is <b>' + (falsy ? '<span class="c-r">False</span>' : '<span class="c-g">True</span>') + '</b>, so <code>or</code> ' + (falsy ? 'moves on and returns the right side <b>\'Guest\'</b>.' : 'stops immediately and returns <b>' + esc(t) + '</b> itself (not the word True!).'), [
            cp(code.replace('<value>', t), 2, falsy ? 'bad' : 'ok'),
            { type: 'vars', label: 'Variables', vals: { typed: t, name: res }, hl: { name: falsy ? 'bad' : 'ok' } },
            { type: 'table', label: 'Results so far', columns: ['typed', 'bool(typed)', 'name'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[rows.length - 1] = 'cur'; return h; })() }
          ]));
        });
        frames.push(fr('Notice the traps: <code>0</code> and <code>[]</code> fall back to Guest (maybe not what you want for a real count!), while <code>\'False\'</code> and <code>[0]</code> are truthy because they are non-empty. Use <code>x if x is not None else default</code> when 0/empty are valid values.', [{ type: 'table', label: 'Summary', columns: ['typed', 'bool(typed)', 'name'], rows: rows }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Order matters in an elif ladder', html: `<p>If you check <code>score &gt;= 50</code> <b>before</b> <code>score &gt;= 90</code>, a 95 would get 'C' because the first true branch wins. Always go from the <b>narrowest / highest</b> condition to the broadest.</p>`, code: { lang: 'python', run: true, code: `score = 95
# WRONG order: broad check first swallows everything
if score >= 50:
    print('wrong ladder says C')
elif score >= 90:
    print('never reached for 95')

# RIGHT order: strictest first
if score >= 90:
    print('right ladder says A')
elif score >= 50:
    print('C')` } },
      { title: 'and / or return objects, not just True/False', html: `<p><code>and</code> returns the first falsy operand (or the last one); <code>or</code> returns the first truthy operand (or the last one). This explains outputs like <code>[] or 0</code> → <code>0</code>.</p>`, code: { lang: 'python', run: true, code: `print(3 and 5)        # 5   (both truthy -> last one)
print(0 and 5)        # 0   (stops at first falsy)
print('' or 'x')      # x
print([] or 0)        # 0   (both falsy -> last one)
print(None or [] or 'found')   # found
print(not [])         # True` } },
      { title: 'Short-circuit as a safety guard', html: `<p>Because Python stops early, the right side of <code>and</code> only runs when the left side is truthy. That protects you from crashes such as dividing by zero or indexing an empty list.</p>`, code: { lang: 'python', run: true, code: `items = []
# items[0] would raise IndexError, but 'and' never gets there:
if items and items[0] > 10:
    print('big first item')
else:
    print('empty or small')

d = 0
print(d != 0 and 10 / d > 1)   # False, no ZeroDivisionError` } },
      { title: 'Chained comparisons and "is None"', html: `<p><code>1 &lt; x &lt; 5</code> is evaluated as <code>1 &lt; x and x &lt; 5</code>, with <code>x</code> computed once. Use <code>is</code> only for singletons like <code>None</code>; for values use <code>==</code>.</p>`, code: { lang: 'python', run: true, code: `x = 3
print(1 < x < 5)        # True
print(1 < x > 2)        # True  (1 < 3 and 3 > 2) - legal but confusing
result = None
if result is None:
    print('no result yet')
print([1, 2] == [1, 2], [1, 2] is [1, 2])   # True False` } }
    ],
    deepDive: `<p>🟣 <b>How Python decides "truthy".</b> <code>bool(x)</code> first calls <code>x.__bool__()</code>; if the class has no <code>__bool__</code>, it calls <code>__len__()</code> and checks for 0; if neither exists, the object is truthy. That is why your own classes are truthy by default, and why a NumPy array or pandas Series raises <i>"The truth value of an array is ambiguous"</i> — they deliberately refuse to pick a meaning; use <code>.any()</code> / <code>.all()</code>.</p>
<p><b>Chained comparisons</b> compile to a sequence with a jump: in <code>a &lt; f() &lt; c</code>, <code>f()</code> is called <b>once</b>. A classic gotcha: <code>x == y == z</code> means <code>x == y and y == z</code>, and <code>1 in [1] == True</code> is <code>(1 in [1]) and ([1] == True)</code> → <b>False</b>.</p>
<p><b><code>is</code> vs <code>==</code>.</b> <code>is</code> compares identity (same object), <code>==</code> compares value via <code>__eq__</code>. CPython caches small ints (-5..256) and interns some strings, so <code>a is b</code> may "work" by accident on small values and then fail on 1000 — never rely on it. Use <code>is</code> only for <code>None</code>, <code>True</code>/<code>False</code> sentinels, and your own sentinel objects.</p>
<p><b>Ternary precedence.</b> <code>x if c else y</code> has the lowest precedence among expressions (except <code>lambda</code>), so <code>1 + 2 if False else 10</code> is <code>10</code>, not <code>11</code>. Add parentheses when mixing.</p>
<p><b>match/case is not a switch.</b> A bare name in a case (<code>case limit:</code>) is a <b>capture pattern</b> that always matches and <i>binds</i> the name — it does not compare to an existing variable. Compare against constants with dotted names (<code>case Color.RED:</code>) or literals, or use a guard: <code>case n if n &gt; limit:</code>.</p>
<p><b>Performance reality:</b> a long <code>if/elif</code> chain is O(number of branches). If you dispatch on many exact keys, a <b>dict of functions</b> (<code>handlers[cmd]()</code>) is O(1) and easier to extend.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Copilot-style tools write <code>if/elif</code> ladders instantly, so the skill that matters is <b>reviewing</b> them: is the order right, are the boundaries (<code>&gt;=</code> vs <code>&gt;</code>) correct, is <code>0</code> accidentally treated as "missing"?</p>
<p><b>Use AI as a partner:</b> ask <code>"List the boundary values I should test for this grading function"</code> — you get 89, 90, 74, 75, 49, 50, negatives, None. Ask it to convert a 15-branch ladder into a dict dispatch and explain the trade-off.</p>
<p><b>Where AI goes wrong:</b> generated code often writes <code>if x == None</code>, <code>if len(lst) == 0</code>, or <code>value or default</code> where <code>0</code> is a legal value (a real bug: "quantity 0 becomes 1"). It also sometimes uses <code>match</code> with a bare variable name, silently creating a catch-all.</p>
<p><b>What you must still own:</b> knowing the truthiness rules by heart, predicting short-circuit output in interviews ("what does <code>[] or 0</code> print?"), and choosing the clearest structure for the next human reader.</p>`,
    problems: [{
      title: 'Leap Year Checker', level: 'Easy', tags: ['if/elif', 'boolean logic'], companies: ['TCS', 'Infosys', 'Amazon'],
      statement: `<p>Write <code>is_leap(year)</code> that returns <code>True</code> if <code>year</code> is a leap year in the Gregorian calendar. Rules: divisible by 4 → leap, <b>except</b> years divisible by 100 are not leap, <b>except</b> years divisible by 400 are leap again.</p>`,
      constraints: `1 ≤ year ≤ 10<sup>9</sup>`,
      example: `<p>${H.c('g', '2024 → True')} (÷4, not ÷100) · ${H.c('r', '1900 → False')} (÷100 but not ÷400) · ${H.c('g', '2000 → True')} (÷400) · ${H.c('r', '2023 → False')} (not ÷4).</p>`,
      brute: { why: `<p>A deeply nested if/else works but is hard to read and easy to get wrong (people forget the 400 rule). The "waste" here is not speed — it is readability and bug risk.</p>`, code: `def is_leap(year):
    if year % 4 == 0:
        if year % 100 == 0:
            if year % 400 == 0:
                return True
            else:
                return False
        else:
            return True
    else:
        return False` },
      mcq: { q: 'Which order of checks lets you write a clean if/elif ladder?', options: ['Check ÷400 first, then ÷100, then ÷4', 'Check ÷4 first, then ÷100, then ÷400', 'Order does not matter'], answer: 0, explain: 'Most specific rule first: ÷400 → True, else ÷100 → False, else ÷4 → True, else False. First match wins.' },
      hints: [`<p>Hint 1: The rules are exceptions-of-exceptions. In a ladder, the <b>most specific</b> rule (÷400) must be tested first.</p>`, `<p>Hint 2: Or express it as one boolean: "÷4 and not ÷100, or ÷400". <code>and</code> binds tighter than <code>or</code>.</p>`, `<p>Hint 3: Test 1900, 2000, 2024, 2023 and 4. Recipe: if y%400==0 → True; elif y%100==0 → False; else → y%4==0.</p>`],
      tests: {
        sig: 'int -> bool',
        fn: 'isLeap', also: { python: ['is_leap_one_line'] },
        cases: [
          [[2024], true],
          [[1900], false],
          [[2000], true],
          [[2023], false],
          [[1], false],
          [[4], true],
          [[100], false],
          [[400], true],
          [[2100], false],
          [[2400], true],
          [[1000000000], true],
          [[999999999], false],
          [[1600], true],
          [[1700], false],
          [[3], false],
          [[8], true],
          [[2096], true]
        ]
      },
      solution: {
        approach: `<p>Flatten the nesting with an ordered ladder (most specific first), or a single boolean expression. Both are O(1).</p>`,
        code: { lang: 'python', run: true, code: `def is_leap(year):
    # Most specific rule first: the first match wins.
    if year % 400 == 0:
        return True
    elif year % 100 == 0:
        return False
    else:
        return year % 4 == 0

def is_leap_one_line(year):
    # 'and' binds tighter than 'or'
    return year % 4 == 0 and year % 100 != 0 or year % 400 == 0

for y in [2024, 1900, 2000, 2023]:
    print(y, is_leap(y), is_leap_one_line(y))` },
        dry: { head: ['year', '%400==0?', '%100==0?', '%4==0?', 'result'], rows: [['2024', 'no', 'no', 'yes', '<span class="c-g">True</span>'], ['1900', 'no', 'yes → stop', '—', '<span class="c-r">False</span>'], ['2000', 'yes → stop', '—', '—', '<span class="c-g">True</span>'], ['2023', 'no', 'no', 'no', '<span class="c-r">False</span>']] },
        complexity: `<p>Time O(1), space O(1). (The standard library has <code>calendar.isleap</code> too.)</p>`,
        followUps: ['Count leap years between two years without a loop (inclusion–exclusion: ⌊y/4⌋ − ⌊y/100⌋ + ⌊y/400⌋).', 'Rewrite with match/case and a guard — is it clearer?']
      }
    }]
  });

  /* ================= TOPIC 2: for / while / range / break / continue / else ================= */
  topics.push({
    title: 'Loops: for, while, range(), break, continue & the Loop else',
    analogy: `<p>A <b>for loop</b> is a <b>postman with a bag of letters</b>: he takes one letter at a time until the bag is empty — he knows the job ends when the items run out. A <b>while loop</b> is <b>stirring soup until it boils</b>: you do not know how many stirs it takes, you just keep checking "is it boiling yet?". <code>break</code> is "found it, stop early", <code>continue</code> is "skip this one, next please".</p>`,
    explain: `<p>🟢 <b>for loops walk over things.</b> In Python, <code>for</code> does not count numbers by itself — it walks over <b>any iterable</b>: a list, a string (letter by letter), a dict (its keys), a file (line by line), a <code>range</code>.</p>
<pre>for letter in 'hey':
    print(letter)      # h, e, y</pre>
<p><b>range(start, stop, step)</b> produces numbers lazily: start is included, <b>stop is excluded</b>, step defaults to 1. <code>range(5)</code> → 0,1,2,3,4 (five numbers). <code>range(2, 10, 3)</code> → 2,5,8. <code>range(5, 0, -1)</code> → 5,4,3,2,1.</p>
${H.arr([0, 1, 2, 3, 4], { label: 'range(5)', hl: { 0: 'g' } })}
<p>Why exclude <code>stop</code>? Because <code>range(len(items))</code> then gives exactly the valid indexes, and <code>range(a, b)</code> has <code>b - a</code> numbers. It is the same "half-open" idea as slicing.</p>
<p>🟢 <b>while loops repeat while a condition is true.</b> Use them when you do not know the number of steps in advance (reading until a sentinel, halving a number, retrying). Make sure something inside changes the condition — otherwise you get an <b>infinite loop</b>.</p>
<pre>n = 37
steps = 0
while n &gt; 1:
    n //= 2         # integer halving
    steps += 1
print(steps)        # 5</pre>
<p><b>break</b> leaves the nearest loop immediately. <b>continue</b> jumps to the next iteration. <b>pass</b> does nothing (a placeholder where a statement is required).</p>
<p><b>The loop <code>else</code></b> — Python's unusual feature: an <code>else</code> after a loop runs <b>only if the loop finished without hitting break</b>. Read it as "no break". Perfect for searches: "for each candidate… if found: break; else: not found".</p>
${H.table(['Situation', 'Use'], [['Go through every item of a collection', '<code>for x in items</code>'], ['Need the numbers 0..n-1', '<code>for i in range(n)</code>'], ['Unknown number of repetitions', '<code>while condition:</code>'], ['Stop as soon as found', '<code>break</code> (+ loop <code>else</code> for "not found")'], ['Skip bad items', '<code>continue</code>']])}
<p><b>Golden rule:</b> do not add or remove items from a list <i>while</i> you loop over it — loop over a copy (<code>for x in items[:]</code>) or build a new list.</p>`,
    clues: [
      '"for each item / every element / process all" → <code>for x in items</code> (no index needed)',
      '"repeat until …" / "keep doing while …" / "number of steps unknown" → <code>while</code>',
      '"first / any / find" → loop with <code>break</code>; "if none found" → loop <code>else</code> or a flag',
      '"count down", "every 2nd number", "from a to b inclusive" → <code>range(a, b + 1, step)</code> or negative step',
      '"skip invalid / negative entries" → <code>continue</code> at the top of the loop body (guard clause)',
      '"halve until 1" / "digits of a number" → <code>while n &gt; 0: n //= 10</code> style loop, O(log n)',
      'N ≤ 10<sup>7</sup> simple loop is OK-ish in Python (~1 s); 10<sup>8</sup> plain Python loop is too slow'
    ],
    code: [{ lang: 'python', run: true, title: 'for, range, while, break, continue, else (runnable)', code: `# 1) for over different iterables
for ch in 'abc':
    print(ch, end=' ')
print()
print(list(range(5)), list(range(2, 10, 3)), list(range(5, 0, -1)))

# 2) sum 1..100 with range (stop is exclusive, so use 101)
total = 0
for i in range(1, 101):
    total += i
print('sum 1..100 =', total)

# 3) while: how many times can we halve 37 until it is 1?
n, steps = 37, 0
while n > 1:
    n //= 2
    steps += 1
print('halvings:', steps)

# 4) continue + break + loop-else
nums = [4, -3, 9, 14, 20]
for n in nums:
    if n < 0:
        continue          # skip negatives
    if n % 7 == 0:
        print('first multiple of 7:', n)
        break
else:
    print('no multiple of 7')   # runs only when no break happened

# 5) nested loops: break leaves ONLY the inner loop
for row in range(3):
    for col in range(3):
        if col > row:
            break
        print((row, col), end=' ')
print()` }],
    codeTitle: ['Loops in action'],
    viz: [{
      title: 'for i in range(start, stop, step) — summing step by step',
      input: '1 10 2',
      inputLabel: 'start stop step (integers, step ≠ 0)',
      gen: function (input) {
        var p = words(input).map(Number);
        if (p.length < 1 || p.length > 3 || p.some(isNaN)) throw new Error('Enter 1–3 integers: stop | start stop | start stop step');
        var start = 0, stop, step = 1;
        if (p.length === 1) stop = p[0]; else { start = p[0]; stop = p[1]; if (p.length === 3) step = p[2]; }
        if (step === 0) throw new Error('range() step must not be zero (Python raises ValueError)');
        var vals = [];
        for (var x = start; step > 0 ? x < stop : x > stop; x += step) { vals.push(x); if (vals.length > 20) throw new Error('That range has more than 20 numbers — pick a smaller one'); }
        var code = ['total = 0', 'for i in range(' + start + ', ' + stop + ', ' + step + '):', '    total += i', 'print(total)'].join('\n');
        var frames = [], total = 0;
        frames.push(fr('<code>range(' + start + ', ' + stop + ', ' + step + ')</code> will produce <b>' + vals.length + '</b> number(s): start <b>' + start + '</b> is included, stop <b>' + stop + '</b> is <b>excluded</b>' + (step < 0 ? ', and a negative step counts down' : '') + '. <code>total</code> starts at 0.', [cp(code, 1, 'ok'), { type: 'array', label: 'values range() will hand out', values: vals.length ? vals : ['(empty)'] }, vp({ total: 0 }, 'total')]));
        if (!vals.length) {
          frames.push(fr('The range is <b>empty</b> (' + (step > 0 ? 'start ≥ stop with a positive step' : 'start ≤ stop with a negative step') + '), so the loop body never runs. No error — just zero iterations.', [cp(code, 2, 'bad'), vp({ total: 0 })]));
        }
        vals.forEach(function (v, k) {
          var ptr = {}, hl = {}; ptr[k] = 'i'; hl[k] = 'cur';
          for (var d = 0; d < k; d++) hl[d] = 'done';
          frames.push(fr('Iteration ' + (k + 1) + ': the loop asks range for the next value → <b>i = ' + v + '</b>.', [cp(code, 2, 'cur'), { type: 'array', label: 'range values', values: vals, ptr: ptr, hl: hl }, vp({ i: v, total: total }, 'i', 'cur')]));
          total += v;
          frames.push(fr('Body: <code>total += i</code> → <b>' + (total - v) + ' + ' + v + ' = ' + total + '</b>.', [cp(code, 3, 'ok'), { type: 'array', label: 'range values', values: vals, ptr: ptr, hl: hl }, vp({ i: v, total: total }, 'total')]));
        });
        frames.push(fr('range is exhausted → the loop ends by itself (no break needed). Line 4 prints <b>' + total + '</b>. Note: <code>i</code> still exists after the loop' + (vals.length ? ' and holds the last value ' + vals[vals.length - 1] : '') + ' — Python loop variables leak into the enclosing scope.', [cp(code, 4, 'sel'), vp(vals.length ? { i: vals[vals.length - 1], total: total } : { total: total }, 'total', 'sel'), tx('<b>Output:</b> <code>' + total + '</code>', 'stdout')]));
        return frames;
      }
    }, {
      title: 'continue, break and the loop else (search for a multiple of 7)',
      input: '4 -3 9 14 20',
      inputLabel: 'numbers (space separated, up to 12)',
      gen: function (input) {
        var a = words(input).map(Number);
        if (!a.length || a.some(isNaN)) throw new Error('Enter integers separated by spaces');
        if (a.length > 12) throw new Error('Use at most 12 numbers');
        var code = ['for n in nums:', '    if n < 0:', '        continue', '    if n % 7 == 0:', "        print('found', n)", '        break', 'else:', "    print('no multiple of 7')"].join('\n');
        var frames = [fr('Search <code>nums</code> for the first non-negative multiple of 7. Negative numbers are skipped with <code>continue</code>; a hit triggers <code>break</code>; the <code>else</code> belongs to the <b>for</b>, not the if.', [cp(code, 1, 'cur'), { type: 'array', label: 'nums', values: a }])];
        for (var k = 0; k < a.length; k++) {
          var n = a[k], ptr = {}, hl = {}; ptr[k] = 'n';
          for (var d = 0; d < k; d++) hl[d] = 'done';
          hl[k] = 'cur';
          frames.push(fr('Next item: <b>n = ' + n + '</b>.', [cp(code, 1, 'cur'), { type: 'array', label: 'nums', values: a, ptr: ptr, hl: hl }, vp({ n: n }, 'n', 'cur')]));
          if (n < 0) {
            hl[k] = 'bad';
            frames.push(fr('<code>' + n + ' &lt; 0</code> is True → <b>continue</b>: skip the rest of the body and jump straight back to the <code>for</code> line.', [cp(code, 3, 'bad'), { type: 'array', label: 'nums', values: a, ptr: ptr, hl: hl }, vp({ n: n })]));
            continue;
          }
          var hit = ((n % 7) + 7) % 7 === 0;
          frames.push(fr('<code>' + n + ' % 7</code> = ' + (((n % 7) + 7) % 7) + ' → ' + (hit ? '<span class="c-g">it is a multiple of 7!</span>' : 'not a multiple, keep going.'), [cp(code, 4, hit ? 'ok' : 'bad'), { type: 'array', label: 'nums', values: a, ptr: ptr, hl: hl }, vp({ n: n })]));
          if (hit) {
            hl[k] = 'sel';
            frames.push(fr('Print and <b>break</b>: the loop stops immediately. Because we left via break, the loop\'s <code>else</code> is <b>skipped</b>.', [cp(code, 6, 'sel'), { type: 'array', label: 'nums', values: a, ptr: ptr, hl: hl }, vp({ n: n }, 'n', 'sel'), tx('<b>Output:</b> <code>found ' + n + '</code>', 'stdout')]));
            return frames;
          }
        }
        frames.push(fr('The loop ran out of items <b>without a break</b>, so the <code>else</code> block runs. Read loop-else as "<b>no break</b>".', [cp(code, 8, 'sel'), { type: 'array', label: 'nums', values: a, hl: a.reduce(function (h, _, i) { h[i] = 'done'; return h; }, {}) }, tx('<b>Output:</b> <code>no multiple of 7</code>', 'stdout')]));
        return frames;
      }
    }, {
      title: 'while loop: Collatz steps until n == 1',
      input: '6',
      inputLabel: 'starting n (1–200)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 200) throw new Error('Enter an integer from 1 to 200');
        var code = ['steps = 0', 'while n != 1:', '    if n % 2 == 0:', '        n //= 2', '    else:', '        n = 3 * n + 1', '    steps += 1', 'print(steps)'].join('\n');
        var hist = [n], steps = 0, frames = [fr('A <b>while</b> loop because we cannot know in advance how many steps it takes. Condition checked <b>before</b> every pass.', [cp(code, 1, 'ok'), vp({ n: n, steps: 0 }), { type: 'bars', label: 'values of n so far', values: hist.slice() }])];
        while (n !== 1 && steps < 40) {
          var even = n % 2 === 0, old = n;
          n = even ? n / 2 : 3 * n + 1; steps++; hist.push(n);
          frames.push(fr('<code>n != 1</code> is True (n = ' + old + '). ' + old + ' is ' + (even ? 'even → <code>n //= 2</code>' : 'odd → <code>n = 3*n + 1</code>') + ' → <b>' + n + '</b>. steps = ' + steps + '.', [cp(code, even ? 4 : 6, 'ok'), vp({ n: n, steps: steps }, 'n'), { type: 'bars', label: 'values of n so far', values: hist.slice(), hl: (function () { var h = {}; h[hist.length - 1] = 'cur'; return h; })() }]));
        }
        if (n !== 1) frames.push(fr('Stopping the demo after 40 steps to keep it short (real Python would keep going).', [cp(code, 2, 'bad'), vp({ n: n, steps: steps })]));
        else frames.push(fr('<code>n != 1</code> is now <b>False</b> → the while loop exits. Total: <b>' + steps + '</b> steps. If nothing inside the body changed <code>n</code>, this would loop forever.', [cp(code, 8, 'sel'), vp({ n: n, steps: steps }, 'steps', 'sel'), { type: 'bars', label: 'the whole journey', values: hist.slice() }]));
        while (frames.length < 4) frames.push(fr('Already at 1: the condition was False on the very first check, so the body ran zero times.', [cp(code, 8, 'sel'), vp({ n: n, steps: steps })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Count down and step by 2', html: `<p>Negative steps count down; the stop value is still excluded, so to reach 0 you stop at -1.</p>`, code: { lang: 'python', run: true, code: `print(list(range(10, -1, -2)))   # [10, 8, 6, 4, 2, 0]
print(list(range(3, 3)))          # [] - empty, no error
for i in range(3, 0, -1):
    print('T-minus', i)
print('liftoff')` } },
      { title: 'Prime check with loop-else', html: `<p>The <code>else</code> runs only if no divisor caused a <code>break</code> — no need for an <code>is_prime = True</code> flag.</p>`, code: { lang: 'python', run: true, code: `for n in [2, 9, 13, 21, 29]:
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            print(n, 'is composite, divisor', d)
            break
    else:
        print(n, 'is prime')` } },
      { title: 'Do not mutate while iterating', html: `<p>Removing from a list while looping over it shifts items left and the loop <b>skips</b> the next one. Build a new list instead.</p>`, code: { lang: 'python', run: true, code: `nums = [2, 4, 5, 6, 8]
for x in nums:
    if x % 2 == 0:
        nums.remove(x)        # BUG: skips neighbours
print('buggy:', nums)          # [4, 5, 8] - evens survived!

nums = [2, 4, 5, 6, 8]
nums = [x for x in nums if x % 2 != 0]   # safe: new list
print('fixed:', nums)          # [5]` } },
      { title: 'Digits of a number with while', html: `<p><code>n % 10</code> gives the last digit, <code>n //= 10</code> drops it. The loop runs once per digit — O(number of digits) = O(log n).</p>`, code: { lang: 'python', run: true, code: `n = 90417
digit_sum, count = 0, 0
while n > 0:
    digit_sum += n % 10
    n //= 10
    count += 1
print('digits:', count, 'sum:', digit_sum)   # digits: 5 sum: 21` } }
    ],
    deepDive: `<p>🟣 <b>What <code>for</code> really does.</b> <code>for x in obj</code> calls <code>iter(obj)</code> once to get an iterator, then calls <code>next()</code> on it repeatedly until it raises <code>StopIteration</code>, which the loop swallows silently. That is why the same <code>for</code> works for lists, strings, dicts, files and generators (module py07 goes deeper).</p>
<p><b>range is a lazy sequence, not a list.</b> <code>range(10**12)</code> costs a few dozen bytes; it computes values on demand. It supports <code>len()</code>, indexing, slicing (<code>range(0, 100)[::10]</code> is another range) and O(1) membership for ints: <code>10**11 in range(10**12)</code> is instant because it does arithmetic, not a scan.</p>
<p><b>Loop variables leak.</b> After <code>for i in range(3): pass</code>, <code>i</code> is 2 — Python has function scope, not block scope. And if the loop ran zero times, <code>i</code> was never assigned (NameError if you use it). Comprehension variables, by contrast, do <b>not</b> leak (since Python 3).</p>
<p><b>Speed reality.</b> A plain CPython loop does roughly 10–50 million simple operations per second (CPython 3.11+ got 10–60% faster with the specializing adaptive interpreter). Built-ins like <code>sum()</code>, <code>max()</code>, <code>any()</code> run the loop in C and are typically several times faster than a hand-written loop. For numeric arrays, NumPy vectorization beats both by 10–100×.</p>
<p><b>Breaking out of nested loops.</b> <code>break</code> only exits the innermost loop. Options: put the loops in a function and <code>return</code>; use a flag; use <code>for … else: continue</code> + <code>break</code> trick; or flatten with <code>itertools.product</code>.</p>
<p><b>Infinite loops on purpose:</b> <code>while True:</code> with a <code>break</code> inside is the idiomatic "loop-and-a-half" (e.g. retry until success). The walrus operator (3.8+) can shorten read loops: <code>while (line := f.readline()):</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate loops in seconds, and often produce C-style code like <code>for i in range(len(items)): x = items[i]</code>. Your job is to recognise and rewrite it into Pythonic iteration (<code>for x in items</code>, <code>enumerate</code>, built-ins).</p>
<p><b>Use AI as a partner:</b> ask <code>"Find off-by-one risks in this range() call"</code> or <code>"Rewrite this loop using sum()/any()/a comprehension and tell me which is faster"</code>. Paste a slow loop and ask whether it can be vectorised.</p>
<p><b>Where AI goes wrong:</b> <code>range(1, n)</code> when <code>n</code> should be included; mutating a list while iterating it; forgetting the loop-else semantics (it often thinks <code>else</code> runs when the loop "fails"); infinite <code>while</code> loops that never update the condition variable.</p>
<p><b>What you must still own:</b> predicting exactly how many iterations a range produces, reading loop-else correctly in "predict the output" rounds, and estimating whether a Python loop of size N will finish in time.</p>`,
    problems: [{
      title: 'Prime Number Test (sqrt bound + loop-else)', level: 'Easy', tags: ['loops', 'math', 'for-else'], companies: ['Infosys', 'Wipro', 'Google'],
      statement: `<p>Write <code>is_prime(n)</code> returning <code>True</code> if <code>n</code> is a prime number (exactly two divisors: 1 and itself), else <code>False</code>.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>12</sup> (a single call must finish quickly)`,
      example: `<p>${H.c('g', 'is_prime(29) → True')} — no d in 2..5 divides 29. ${H.c('r', 'is_prime(21) → False')} — 3 divides 21. ${H.c('r', 'is_prime(1) → False')} — 1 has only one divisor.</p>`,
      brute: { why: `<p>Trying every d from 2 to n−1 is O(n): for n ≈ 10<sup>12</sup> that is a trillion iterations — hours in Python. The waste: if n = a·b with a ≤ b, then a ≤ √n, so checking beyond √n never finds a <i>new</i> smallest divisor.</p>`, code: `def is_prime(n):
    if n < 2:
        return False
    for d in range(2, n):
        if n % d == 0:
            return False
    return True` },
      mcq: { q: 'Why is it enough to test divisors up to √n?', options: ['Any factor pair (a, b) with a·b = n has a ≤ √n', 'Primes are always below √n', 'Python cannot loop further'], answer: 0, explain: 'If both factors were > √n, their product would exceed n.' },
      hints: [`<p>Hint 1: Handle n &lt; 2 first — 0 and 1 are not prime. 2 is the only even prime.</p>`, `<p>Hint 2: Loop d over <code>range(2, isqrt(n) + 1)</code> (+1 because range excludes stop). <code>math.isqrt</code> avoids float rounding issues for huge n.</p>`, `<p>Hint 3: Use <code>break</code> when a divisor is found and the loop <code>else</code> for "no divisor found". Bonus: test 2 separately and step by 2 over odd numbers only.</p>`],
      tests: {
        sig: 'long -> bool',
        fn: 'isPrime',
        cases: [
          [[0], false],
          [[1], false],
          [[2], true],
          [[3], true],
          [[4], false],
          [[5], true],
          [[9], false],
          [[25], false],
          [[29], true],
          [[21], false],
          [[97], true],
          [[100], false],
          [[1000000007], true],
          [[1000000000000], false],
          [[999999999989], true],
          [[999966000289], false],
          [[999962000357], false],
          [[561], false],
          [[7919], true],
          [[1000000000039], true]
        ]
      },
      solution: {
        approach: `<p>Reject n &lt; 2. Try divisors 2..⌊√n⌋. If one divides n → composite (break). If the loop completes without break → prime (loop-else). Use <code>math.isqrt</code> for an exact integer square root.</p>`,
        code: { lang: 'python', run: true, code: `from math import isqrt

def is_prime(n):
    if n < 2:
        return False
    for d in range(2, isqrt(n) + 1):   # +1: range excludes stop
        if n % d == 0:
            break                        # found a divisor
    else:
        return True                      # loop finished with no break
    return False

print([x for x in range(30) if is_prime(x)])
print(is_prime(1_000_000_007))           # True, ~31,623 iterations` },
        dry: { head: ['n', 'isqrt(n)', 'divisors tried', 'break?', 'result'], rows: [['29', '5', '2,3,4,5', 'no → else', '<span class="c-g">True</span>'], ['21', '4', '2,3', 'yes at 3', '<span class="c-r">False</span>'], ['1', '—', 'none (n &lt; 2)', '—', '<span class="c-r">False</span>'], ['4', '2', '2', 'yes at 2', '<span class="c-r">False</span>']] },
        complexity: `<p>Time O(√n) — about 10<sup>6</sup> iterations for n = 10<sup>12</sup> (well under a second). Space O(1).</p>`,
        followUps: ['Skip even divisors to halve the work (6k ± 1 trick for a third).', 'All primes up to N: Sieve of Eratosthenes in O(N log log N).']
      }
    }]
  });

  /* ================= TOPIC 3: enumerate & zip ================= */
  topics.push({
    title: 'enumerate() and zip(): Looping Like a Pythonista',
    analogy: `<p><b>enumerate</b> is the <b>ticket machine at a bakery</b>: every customer gets a number <i>and</i> keeps their own identity — "#1 Asha, #2 Ben". <b>zip</b> is a <b>zipper on a jacket</b>: it joins the left teeth and right teeth pair by pair, and when one side runs out, the zipper stops.</p>`,
    explain: `<p>🟢 <b>The problem.</b> Beginners coming from C or Java write <code>for i in range(len(names)): print(i, names[i])</code>. It works, but it is noisy and easy to break. Python gives two built-ins that make loops cleaner.</p>
<p><b>enumerate(iterable, start=0)</b> hands you <b>(index, item)</b> pairs:</p>
<pre>for i, name in enumerate(['Asha', 'Ben', 'Cy'], start=1):
    print(i, name)      # 1 Asha / 2 Ben / 3 Cy</pre>
<p><b>zip(a, b, …)</b> walks several iterables <b>in lockstep</b> and hands you tuples <code>(a[0], b[0])</code>, <code>(a[1], b[1])</code>, … It <b>stops at the shortest</b> input.</p>
${H.arr(['Asha', 'Ben', 'Cy'], { label: 'names' })}
${H.arr([91, 78, 85, 60], { label: 'scores', hl: { 3: 'r' } })}
<p>→ pairs <code>('Asha', 91)</code>, <code>('Ben', 78)</code>, <code>('Cy', 85)</code>; the extra <span class="c-r">60</span> is silently dropped.</p>
<p><b>Common power moves:</b></p>
${H.table(['Goal', 'Idiom'], [['index + item', '<code>for i, x in enumerate(items)</code>'], ['two lists side by side', '<code>for a, b in zip(xs, ys)</code>'], ['build a dict from two lists', '<code>dict(zip(keys, values))</code>'], ['neighbours (x, next x)', '<code>zip(items, items[1:])</code>'], ['"unzip" pairs back into columns', '<code>names, scores = zip(*pairs)</code>'], ['insist on equal lengths (3.10+)', '<code>zip(a, b, strict=True)</code>'], ['keep going to the longest', '<code>itertools.zip_longest(a, b, fillvalue=0)</code>']])}
<p>Both are <b>lazy</b>: they produce one pair at a time instead of building a big list. Wrap them in <code>list()</code> if you want to see everything at once.</p>`,
    clues: [
      '"position / index of each element" while looping → <code>enumerate</code> (use <code>start=1</code> for human numbering)',
      '"two arrays of the same length", "corresponding elements", "parallel lists" → <code>zip</code>',
      '"adjacent pairs", "compare each element with the next" → <code>zip(a, a[1:])</code> (or <code>itertools.pairwise</code>, 3.10+)',
      '"build a mapping from keys list and values list" → <code>dict(zip(keys, values))</code>',
      '"transpose a matrix" / "unzip" → <code>list(zip(*matrix))</code>',
      '"lists must have equal length or it is a bug" → <code>zip(..., strict=True)</code>',
      'seeing <code>range(len(x))</code> in your own code → probably an <code>enumerate</code>/<code>zip</code> rewrite'
    ],
    code: [{ lang: 'python', run: true, title: 'enumerate and zip recipes (runnable)', code: `names = ['Asha', 'Ben', 'Cy']
scores = [91, 78, 85, 60]

# enumerate: index + item, numbering from 1
for rank, name in enumerate(names, start=1):
    print(rank, name)

# zip: stops at the shortest input (60 is dropped)
for name, score in zip(names, scores):
    print(f'{name:<5}{score}')

# dict from two lists
report = dict(zip(names, scores))
print(report)

# adjacent pairs: did the value go up or down?
temps = [20, 23, 21, 25]
for prev, cur in zip(temps, temps[1:]):
    print(prev, '->', cur, 'up' if cur > prev else 'down')

# unzip and transpose with the * operator
pairs = [('a', 1), ('b', 2), ('c', 3)]
letters, numbers = zip(*pairs)
print(letters, numbers)
matrix = [[1, 2, 3], [4, 5, 6]]
print([list(col) for col in zip(*matrix)])   # transpose

# both together: index + two parallel lists
for i, (n, s) in enumerate(zip(names, scores)):
    print(i, n, s)

# strict=True (Python 3.10+) turns a silent bug into an error
try:
    list(zip(names, scores, strict=True))
except ValueError as e:
    print('ValueError:', e)` }],
    codeTitle: ['enumerate & zip'],
    viz: [{
      title: 'zip() pairing two lists (stops at the shortest)',
      input: 'Asha Ben Cy | 91 78 85 60',
      inputLabel: 'list A | list B (space separated, ≤ 8 each)',
      gen: function (input) {
        var halves = String(input).split('|');
        if (halves.length !== 2) throw new Error('Use the format: a b c | 1 2 3');
        var A = words(halves[0]).map(lit), B = words(halves[1]).map(lit);
        if (!A.length || !B.length) throw new Error('Both lists need at least one item');
        if (A.length > 8 || B.length > 8) throw new Error('At most 8 items per list');
        var code = ['pairs = []', 'for a, b in zip(A, B):', '    pairs.append((a, b))', 'print(pairs)'].join('\n');
        var n = Math.min(A.length, B.length), pairs = [], frames = [];
        frames.push(fr('zip gets one iterator for A and one for B. Each round it asks <b>both</b> for their next item; the moment <b>either</b> is empty, zip stops. Lengths: ' + A.length + ' and ' + B.length + ' → expect <b>' + n + '</b> pair(s).', [cp(code, 1, 'ok'), { type: 'array', label: 'A', values: A.map(rp) }, { type: 'array', label: 'B', values: B.map(rp) }, { type: 'list', label: 'pairs', values: [] }]));
        for (var k = 0; k < n; k++) {
          var hlA = {}, hlB = {}, ptrA = {}, ptrB = {};
          for (var d = 0; d < k; d++) { hlA[d] = 'done'; hlB[d] = 'done'; }
          hlA[k] = 'cur'; hlB[k] = 'cur'; ptrA[k] = 'a'; ptrB[k] = 'b';
          pairs.push(rp(tup([A[k], B[k]])));
          frames.push(fr('Round ' + (k + 1) + ': take A[' + k + '] = <b>' + esc(rp(A[k])) + '</b> and B[' + k + '] = <b>' + esc(rp(B[k])) + '</b>, glue them into the tuple <b>' + esc(pairs[k]) + '</b>, and unpack it into <code>a, b</code>.', [cp(code, 3, 'ok'), { type: 'array', label: 'A', values: A.map(rp), hl: hlA, ptr: ptrA }, { type: 'array', label: 'B', values: B.map(rp), hl: hlB, ptr: ptrB }, vp({ a: A[k], b: B[k] }, 'a,b', 'cur'), { type: 'list', label: 'pairs', values: pairs.slice(), hl: (function () { var h = {}; h[k] = 'ok'; return h; })() }]));
        }
        var longer = A.length > B.length ? 'A' : (B.length > A.length ? 'B' : null);
        if (longer) {
          var L = longer === 'A' ? A : B, hl = {};
          for (var j = 0; j < L.length; j++) hl[j] = j < n ? 'done' : 'bad';
          frames.push(fr('List <b>' + longer + '</b> still has ' + (L.length - n) + ' item(s), but the other side is empty → zip <b>stops silently</b>. The leftover is <span class="c-r">dropped without any error</span>. Use <code>strict=True</code> (3.10+) to get a ValueError, or <code>itertools.zip_longest</code> to keep them.', [cp(code, 2, 'bad'), { type: 'array', label: longer + ' (leftovers in red)', values: L.map(rp), hl: hl }, { type: 'list', label: 'pairs', values: pairs.slice() }]));
        } else {
          frames.push(fr('Both lists ran out at the same time — a clean, equal-length zip. Nothing is lost.', [cp(code, 2, 'ok'), { type: 'list', label: 'pairs', values: pairs.slice() }]));
        }
        frames.push(fr('Final result: <code>' + esc('[' + pairs.join(', ') + ']') + '</code>. Tip: <code>dict(zip(A, B))</code> would turn these pairs straight into a dictionary.', [cp(code, 4, 'sel'), { type: 'list', label: 'pairs', values: pairs.slice(), hl: pairs.reduce(function (h, _, i) { h[i] = 'sel'; return h; }, {}) }]));
        return frames;
      }
    }, {
      title: 'enumerate(items, start) — index and item together',
      input: 'tea coffee juice | 1',
      inputLabel: 'items | start number',
      gen: function (input) {
        var halves = String(input).split('|');
        var items = words(halves[0]).map(lit);
        var start = halves.length > 1 ? parseInt(halves[1].trim(), 10) : 0;
        if (!items.length) throw new Error('Enter some items, e.g. tea coffee juice | 1');
        if (items.length > 10) throw new Error('At most 10 items');
        if (isNaN(start)) throw new Error('start must be an integer');
        var code = ['for i, item in enumerate(items, start=' + start + '):', "    print(f'{i}. {item}')"].join('\n');
        var frames = [fr('enumerate wraps the list and keeps its own counter that begins at <b>' + start + '</b>. It does <b>not</b> change the list, and <b>start</b> only changes the printed number — not which items are visited.', [cp(code, 1, 'ok'), { type: 'array', label: 'items (real indexes underneath)', values: items.map(rp) }, vp({ counter: start })])], out = [];
        items.forEach(function (it, k) {
          var ptr = {}, hl = {}; ptr[k] = 'i=' + (k + start); hl[k] = 'cur';
          out.push((k + start) + '. ' + it);
          frames.push(fr('enumerate yields the tuple <b>(' + (k + start) + ', ' + esc(rp(it)) + ')</b>; the <code>for</code> line unpacks it into <code>i</code> and <code>item</code>.', [cp(code, 2, 'ok'), { type: 'array', label: 'items', values: items.map(rp), ptr: ptr, hl: hl }, vp({ i: k + start, item: it }, 'i,item', 'cur'), tx('<pre>' + esc(out.join('\n')) + '</pre>', 'stdout so far')]));
        });
        frames.push(fr('Done. Compare with <code>for i in range(len(items)): item = items[i]</code> — same result, but enumerate also works on things you cannot index (files, generators, sets).', [cp(code, 1, 'sel'), tx('<pre>' + esc(out.join('\n')) + '</pre>', 'stdout')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Find all positions of a value', html: `<p>enumerate gives the index for free, so collecting positions is a one-liner.</p>`, code: { lang: 'python', run: true, code: `word = 'banana'
positions = [i for i, ch in enumerate(word) if ch == 'a']
print(positions)    # [1, 3, 5]` } },
      { title: 'Dot product and element-wise compare with zip', html: `<p>Pairing numbers from two vectors: no index arithmetic, no out-of-range bugs.</p>`, code: { lang: 'python', run: true, code: `a = [1, 2, 3]
b = [4, 5, 6]
print(sum(x * y for x, y in zip(a, b)))   # 32
print([x == y for x, y in zip('cat', 'cut')])   # [True, False, True]` } },
      { title: 'Is a list sorted? (adjacent pairs)', html: `<p><code>zip(a, a[1:])</code> yields neighbours; <code>all()</code> stops at the first violation (short-circuit).</p>`, code: { lang: 'python', run: true, code: `def is_sorted(a):
    return all(x <= y for x, y in zip(a, a[1:]))

print(is_sorted([1, 2, 2, 5]), is_sorted([3, 1, 2]), is_sorted([]))` } },
      { title: 'zip(*rows) transposes a grid', html: `<p>The star spreads each row as a separate argument, so zip pairs up column by column.</p>`, code: { lang: 'python', run: true, code: `grid = [[1, 2, 3],
        [4, 5, 6]]
cols = list(zip(*grid))
print(cols)          # [(1, 4), (2, 5), (3, 6)]
# rotate 90 degrees clockwise = reverse rows, then transpose
print([list(r) for r in zip(*grid[::-1])])   # [[4, 1], [5, 2], [6, 3]]` } }
    ],
    deepDive: `<p>🟣 <b>Both are lazy iterators.</b> <code>zip(a, b)</code> and <code>enumerate(a)</code> return iterator objects that compute one tuple per <code>next()</code> call. Memory is O(1) regardless of input size, which matters for files or generators with millions of items. The flip side: an iterator is <b>single-use</b>. <code>z = zip(a, b); list(z); list(z)</code> → the second list is empty.</p>
<p><b>Order of exhaustion.</b> zip pulls from inputs left to right. When the first input is exhausted, it stops without touching the rest; if a <i>later</i> input runs out, one item from the earlier ones has already been consumed and is lost. This matters when you zip iterators you continue using afterwards. That subtlety is one reason <code>strict=True</code> was added (PEP 618, Python 3.10).</p>
<p><b>Chunking trick:</b> <code>zip(*[iter(data)] * 3)</code> groups data into triples because all three arguments are the <i>same</i> iterator. Python 3.12 added the readable <code>itertools.batched(data, 3)</code>.</p>
<p><b>Performance:</b> CPython reuses the result tuple when nobody holds a reference to it, so <code>for a, b in zip(...)</code> allocates almost nothing per step. <code>enumerate</code> is faster than <code>range(len())</code> + indexing because it avoids a separate index lookup per item.</p>
<p><b>When NOT to use them:</b> if you need to look at <code>items[i-1]</code> and <code>items[i+1]</code> or jump around (two pointers moving at different speeds), index-based loops are clearer. Pythonic is about clarity, not avoiding indexes at all costs.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI tools are very good at rewriting <code>range(len())</code> loops into <code>enumerate</code>/<code>zip</code> — a cheap win to ask for during code review. Linters can flag these automatically: Pylint <code>consider-using-enumerate</code> catches <code>range(len())</code> loops, and Ruff <code>SIM113</code> catches a manual counter you increment by hand.</p>
<p><b>Use AI as a partner:</b> <code>"Here are two lists that should be the same length; write the loop and make length mismatches fail loudly"</code> — a good assistant will answer with <code>strict=True</code>. Ask it for test cases with unequal lengths.</p>
<p><b>Where AI goes wrong:</b> it may zip two lists of different lengths and silently drop data (a real production bug: "last batch of records never saved"), reuse an exhausted zip object, or forget that <code>enumerate(start=1)</code> only changes the counter, not the slice of items.</p>
<p><b>What you must still own:</b> the "stops at shortest" rule, the single-use nature of iterators, and spotting when an index-based loop is actually the clearest choice.</p>`,
    problems: [{
      title: 'Hamming Distance with Mismatch Positions', level: 'Easy', tags: ['zip', 'enumerate', 'strings'], companies: ['Google', 'Microsoft'],
      statement: `<p>Given two strings <code>a</code> and <code>b</code> of equal length, return a tuple <code>(distance, positions)</code> where <code>distance</code> is the number of positions where the characters differ and <code>positions</code> is the list of those indexes. If the lengths differ, raise <code>ValueError</code>.</p>`,
      constraints: `0 ≤ len(a), len(b) ≤ 10<sup>6</sup>`,
      example: `${H.arr(['k', 'a', 'r', 'o', 'l', 'i', 'n'], { label: 'a', hl: { 2: 'r', 3: 'r', 4: 'r' } })}${H.arr(['k', 'a', 't', 'h', 'r', 'i', 'n'], { label: 'b', hl: { 2: 'r', 3: 'r', 4: 'r' } })}<p><code>hamming("karolin", "kathrin")</code> → <b>(3, [2, 3, 4])</b> because ${H.c('r', 'r≠t, o≠h, l≠r')} at indexes 2, 3, 4; every other position matches.</p>`,
      brute: { why: `<p>An index loop works in O(n) too, but it repeats <code>a[i]</code>/<code>b[i]</code> lookups, forgets the length check, and is easy to get off-by-one. The "waste" is clarity and safety, not big-O.</p>`, code: `def hamming(a, b):
    count = 0
    positions = []
    for i in range(len(a)):          # crashes or silently ignores extra chars of b
        if a[i] != b[i]:
            count += 1
            positions.append(i)
    return count, positions` },
      mcq: { q: 'What does list(zip("abc", "xy")) give?', options: ['[("a","x"), ("b","y")]', '[("a","x"), ("b","y"), ("c", None)]', 'ValueError'], answer: 0, explain: 'zip stops at the shortest input; only strict=True raises, only zip_longest pads.' },
      hints: [`<p>Hint 1: You need both the index and the pair of characters → combine <code>enumerate</code> and <code>zip</code>.</p>`, `<p>Hint 2: <code>for i, (x, y) in enumerate(zip(a, b))</code> — the inner parentheses unpack the pair.</p>`, `<p>Hint 3: Check <code>len(a) != len(b)</code> first (or use <code>zip(a, b, strict=True)</code>). Then a comprehension collects mismatching i; the distance is its length.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [['hamming(\'karolin\', \'kathrin\')'], [3, [2, 3, 4]]],
          [['hamming(\'\', \'\')'], [0, []]],
          [['hamming(\'a\', \'a\')'], [0, []]],
          [['hamming(\'a\', \'b\')'], [1, [0]]],
          [['hamming(\'abc\', \'abc\')'], [0, []]],
          [['hamming(\'0000\', \'1111\')'], [4, [0, 1, 2, 3]]],
          [['hamming(\'abcdef\', \'abXdeX\')'], [2, [2, 5]]],
          [['hamming(\'ab\', \'abc\')'], '!ValueError'],
          [['hamming(\'\', \'a\')'], '!ValueError'],
          [['hamming(\'a\' * 10**6, \'a\' * 500000 + \'b\' + \'a\' * 499999)'], [1, [500000]]],
          [['hamming(\'a\' * 10**6, \'b\' * 10**6)[0]'], 1000000]
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
        approach: `<p>Validate the lengths, then one pass with <code>enumerate(zip(a, b))</code> collecting indexes where the characters differ. The distance is simply <code>len(positions)</code>.</p>`,
        code: { lang: 'python', run: true, code: `def hamming(a, b):
    if len(a) != len(b):
        raise ValueError('strings must have equal length')
    positions = [i for i, (x, y) in enumerate(zip(a, b)) if x != y]
    return len(positions), positions

print(hamming('karolin', 'kathrin'))   # (3, [2, 3, 4])
print(hamming('', ''))                 # (0, [])
try:
    hamming('ab', 'abc')
except ValueError as e:
    print('error:', e)` },
        dry: { head: ['i', 'x (a)', 'y (b)', 'x != y?', 'positions'], rows: [['0', 'k', 'k', 'no', '[]'], ['1', 'a', 'a', 'no', '[]'], ['2', 'r', 't', '<span class="c-r">yes</span>', '[2]'], ['3', 'o', 'h', '<span class="c-r">yes</span>', '[2, 3]'], ['4', 'l', 'r', '<span class="c-r">yes</span>', '[2, 3, 4]'], ['5–6', 'in', 'in', 'no', '[2, 3, 4] → (3, …)']] },
        complexity: `<p>Time O(n), extra space O(k) for k mismatches (O(1) if you only count with <code>sum(x != y for x, y in zip(a, b))</code>).</p>`,
        followUps: ['Count only — do it in one line with sum() over booleans.', 'Bits version: Hamming distance of two ints = popcount(x ^ y) → <code>(x ^ y).bit_count()</code> (3.10+).']
      }
    }]
  });

  /* ================= TOPIC 4: functions, defaults, keyword args ================= */
  topics.push({
    title: 'Functions: def, return, Default & Keyword Arguments',
    analogy: `<p>A function is a <b>coffee machine</b>. You press it with some inputs (<b>arguments</b>: bean type, sugar, milk) and it hands you a result (<b>return value</b>: a cup). <b>Default arguments</b> are the machine's factory settings — "1 sugar, with milk" unless you say otherwise. <b>Keyword arguments</b> are pressing labelled buttons ("milk = no") instead of remembering the order of unlabelled ones.</p>`,
    explain: `<p>🟢 <b>Defining and calling.</b></p>
<pre>def area(width, height):        # width, height are PARAMETERS (names)
    """Return the area of a rectangle."""   # docstring
    return width * height

print(area(3, 4))                # 3, 4 are ARGUMENTS (values) → 12</pre>
<p><b>return</b> sends a value back and <b>ends the function immediately</b>. A function with no return (or a bare <code>return</code>) gives back <code>None</code>. Need several results? Return a tuple: <code>return lo, hi</code> → caller writes <code>lo, hi = min_max(nums)</code>.</p>
<p><b>Ways to pass arguments:</b></p>
${H.table(['Kind', 'Looks like', 'Rule'], [['Positional', '<code>area(3, 4)</code>', 'matched by <b>order</b>'], ['Keyword', '<code>area(height=4, width=3)</code>', 'matched by <b>name</b>, any order'], ['Mixed', '<code>area(3, height=4)</code>', 'positional <b>first</b>, then keywords'], ['Default', '<code>def tea(kind, sugar=1)</code>', 'used when the caller leaves it out']])}
<p><b>Defaults</b> must come after the required parameters: <code>def f(a, b=2)</code> is fine, <code>def f(a=1, b)</code> is a SyntaxError.</p>
<p><b>The #1 Python gotcha — mutable defaults.</b> A default value is created <b>once, when the <code>def</code> line runs</b>, not on every call. So a default list is <b>shared</b> by all calls:</p>
<pre>def add(item, bucket=[]):     # ONE list, created at def time
    bucket.append(item)
    return bucket
add('a')   # ['a']
add('b')   # ['a', 'b']   ← surprise!</pre>
<p>Fix: use <code>None</code> as the default and create the list inside: <code>if bucket is None: bucket = []</code>.</p>
<p><b>Forcing styles</b> (useful for clear APIs): parameters after a bare <code>*</code> are <b>keyword-only</b>; parameters before a <code>/</code> are <b>positional-only</b> (3.8+).</p>
<pre>def connect(host, port=5432, *, timeout=10):   # timeout must be named
    ...
connect('db', timeout=3)       # OK
connect('db', 5432, 3)         # TypeError: too many positional</pre>
<p><b>Scope in one sentence:</b> names you assign inside a function are <b>local</b> (they vanish when it returns); the function can <b>read</b> outer/global names, but assigning to one creates a new local unless you declare <code>global</code> (rarely a good idea — return values instead). Closures and <code>nonlocal</code> come in module py06.</p>
<p><b>*args and **kwargs</b> (preview): <code>def f(*args, **kwargs)</code> collects extra positional arguments into a tuple and extra keyword arguments into a dict.</p>`,
    clues: [
      '"the same steps appear 3+ times" → extract a function with a clear name and a docstring',
      '"optional setting with a sensible default" → default argument <code>def f(x, retries=3)</code>',
      '"default should be an empty list/dict" → <code>None</code> sentinel, never <code>=[]</code> / <code>={}</code>',
      '"return both min and max / quotient and remainder" → return a tuple, unpack at the call site',
      '"boolean flag argument that callers confuse" → make it keyword-only with <code>*</code>',
      '"function accepts any number of values" → <code>*args</code>; "any named options" → <code>**kwargs</code>',
      'interview "what does this print?" with a default list → shared default object bug'
    ],
    code: [{ lang: 'python', run: true, title: 'Parameters, defaults, keyword-only, multiple returns (runnable)', code: `def make_tea(kind, sugar=1, milk=True):
    """Describe a cup of tea. kind is required; sugar and milk have defaults."""
    extras = 'with milk' if milk else 'no milk'
    return f'{kind} tea, {sugar} sugar, {extras}'

print(make_tea('green'))                     # defaults used
print(make_tea('black', 2))                  # positional
print(make_tea('masala', milk=False))        # skip sugar, name milk
print(make_tea(sugar=0, kind='mint'))        # all keyword, any order

def min_max(nums):
    """Return the smallest and largest values as a tuple."""
    return min(nums), max(nums)

lo, hi = min_max([7, 2, 9, 4])
print(lo, hi)

def shout(text):
    print(text.upper())     # no return statement

result = shout('hi')
print('returned:', result)  # None

# keyword-only after * ; positional-only before /
def connect(host, /, port=5432, *, timeout=10):
    return f'{host}:{port} (timeout {timeout}s)'

print(connect('db.local', timeout=3))
try:
    connect('db.local', 5432, 3)
except TypeError as e:
    print('TypeError:', e)

# *args / **kwargs preview
def total(*args, **kwargs):
    print('args =', args, 'kwargs =', kwargs)
    return sum(args)

print(total(1, 2, 3, unit='kg'))` }, { lang: 'python', run: true, title: 'The mutable default trap and its fix', code: `def add_bad(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add_bad('a'))     # ['a']
print(add_bad('b'))     # ['a', 'b']  <- same list reused!
print(add_bad.__defaults__)   # the shared list lives on the function

def add_good(item, bucket=None):
    if bucket is None:      # fresh list on every call
        bucket = []
    bucket.append(item)
    return bucket

print(add_good('a'))    # ['a']
print(add_good('b'))    # ['b']` }],
    codeTitle: ['Functions in practice', 'Mutable default argument'],
    viz: [{
      title: 'How Python binds arguments to parameters',
      input: "'masala', milk=False",
      inputLabel: "arguments for make_tea(kind, sugar=1, milk=True) — e.g. 'green', 2   or   sugar=0, kind='mint'",
      gen: function (input) {
        var raw = String(input).trim();
        var toks = raw.length ? raw.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; }) : [];
        if (toks.length > 5) throw new Error('At most 5 arguments');
        var params = ['kind', 'sugar', 'milk'], defs = { sugar: 1, milk: true };
        var code = ['def make_tea(kind, sugar=1, milk=True):', "    extras = 'with milk' if milk else 'no milk'", "    return f'{kind} tea, {sugar} sugar, {extras}'", '', 'make_tea(' + raw + ')'].join('\n');
        var bound = {}, frames = [], pos = [], kw = [], seenKw = false, err = null;
        toks.forEach(function (t) {
          var m = t.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
          if (m) { kw.push([m[1], lit(m[2])]); seenKw = true; }
          else { if (seenKw && !err) err = 'SyntaxError: positional argument follows keyword argument'; pos.push(lit(t)); }
        });
        function slots() { return params.map(function (p) { return [p, p in bound ? rp(bound[p]) : '(empty)']; }); }
        frames.push(fr('Python creates a fresh <b>local namespace</b> for this call with three empty slots: kind, sugar, milk. Arguments are matched in a fixed order: <b>positional first, then keywords, then defaults</b>.', [cp(code, 5, 'cur'), { type: 'map', label: 'parameter slots', entries: slots() }]));
        if (err) { frames.push(fr('<span class="c-r">' + err + '</span>. Python refuses to even run this — positional arguments must come before keyword arguments.', [cp(code, 5, 'bad'), tx('<b>' + err + '</b>', 'error')])); frames.push(fr('Fix: move all plain values to the front, e.g. <code>make_tea(\'green\', milk=False)</code>.', [cp(code, 5, 'bad'), { type: 'map', label: 'parameter slots', entries: slots() }])); return frames; }
        for (var i = 0; i < pos.length; i++) {
          if (i >= params.length) { err = 'TypeError: make_tea() takes from 1 to 3 positional arguments but ' + pos.length + ' were given'; break; }
          bound[params[i]] = pos[i];
          var h = {}; h[params[i]] = 'ok';
          frames.push(fr('Positional argument #' + (i + 1) + ' <b>' + esc(rp(pos[i])) + '</b> goes to the slot in the same position: <b>' + params[i] + '</b>.', [cp(code, 1, 'cur'), { type: 'map', label: 'parameter slots', entries: slots(), hl: h }]));
        }
        if (!err) for (var j = 0; j < kw.length; j++) {
          var name = kw[j][0], val = kw[j][1], hk = {};
          if (params.indexOf(name) < 0) { err = "TypeError: make_tea() got an unexpected keyword argument '" + name + "'"; break; }
          if (name in bound) { err = "TypeError: make_tea() got multiple values for argument '" + name + "'"; hk[name] = 'bad'; frames.push(fr('Keyword <b>' + name + '=' + esc(rp(val)) + '</b>, but the slot <b>' + name + '</b> is already filled by a positional argument!', [cp(code, 5, 'bad'), { type: 'map', label: 'parameter slots', entries: slots(), hl: hk }])); break; }
          bound[name] = val; hk[name] = 'ok';
          frames.push(fr('Keyword argument <b>' + name + '=' + esc(rp(val)) + '</b> is matched <b>by name</b> — its position in the call does not matter.', [cp(code, 1, 'cur'), { type: 'map', label: 'parameter slots', entries: slots(), hl: hk }]));
        }
        if (!err) {
          params.forEach(function (p) {
            if (!(p in bound)) {
              var hd = {};
              if (p in defs) { bound[p] = defs[p]; hd[p] = 'win'; frames.push(fr('Slot <b>' + p + '</b> is still empty, so its <b>default</b> <code>' + rp(defs[p]) + '</code> is used. (That default object was created once, when <code>def</code> ran.)', [cp(code, 1, 'cur'), { type: 'map', label: 'parameter slots', entries: slots(), hl: hd }])); }
              else { err = "TypeError: make_tea() missing 1 required positional argument: '" + p + "'"; }
            }
          });
        }
        if (err) {
          frames.push(fr('<span class="c-r">' + esc(err) + '</span> — the call fails before the body runs.', [cp(code, 5, 'bad'), { type: 'map', label: 'parameter slots', entries: slots() }, tx('<b>' + esc(err) + '</b>', 'error')]));
          return frames;
        }
        var extras = bound.milk ? 'with milk' : 'no milk';
        frames.push(fr('All slots filled. The body runs: <code>milk</code> is ' + rp(bound.milk) + ' (truthiness!), so extras = <b>\'' + extras + '\'</b>.', [cp(code, 2, 'ok'), vp({ kind: bound.kind, sugar: bound.sugar, milk: bound.milk, extras: extras }, 'extras')]));
        var out = (typeof bound.kind === 'string' ? bound.kind : rp(bound.kind)) + ' tea, ' + (typeof bound.sugar === 'string' ? bound.sugar : rp(bound.sugar)) + ' sugar, ' + extras;
        frames.push(fr('<code>return</code> builds the f-string and hands it back to the caller; the local namespace is thrown away.', [cp(code, 3, 'sel'), tx('<b>Return value:</b> <code>\'' + esc(out) + '\'</code>', 'result')]));
        return frames;
      }
    }, {
      title: 'Mutable default: one list shared by every call',
      input: 'a b c',
      inputLabel: 'items to add, one call each (≤ 6)',
      gen: function (input) {
        var items = words(input).map(lit);
        if (!items.length) throw new Error('Enter a few items, e.g. a b c');
        if (items.length > 6) throw new Error('At most 6 items');
        var code = ['def add(item, bucket=[]):', '    bucket.append(item)', '    return bucket', ''].concat(items.map(function (it) { return 'print(add(' + rp(it) + '))'; })).join('\n');
        var shared = [], frames = [fr('When the <code>def</code> line runs, Python evaluates <code>[]</code> <b>once</b> and stores that single list object in <code>add.__defaults__</code>. Every call that omits <code>bucket</code> will receive <b>this same object</b>.', [cp(code, 1, 'cur'), { type: 'array', label: 'add.__defaults__[0]  (id 0x7f..a0)', values: ['(empty)'] }])];
        items.forEach(function (it, k) {
          shared.push(it);
          var hl = {}; hl[shared.length - 1] = 'ok';
          for (var d = 0; d < shared.length - 1; d++) hl[d] = 'bad';
          frames.push(fr('Call ' + (k + 1) + ': <code>add(' + esc(rp(it)) + ')</code> — no bucket passed, so <code>bucket</code> is bound to the <b>shared default list</b>. <code>append</code> mutates it in place → ' + esc(rp(shared)) + (k ? '. <span class="c-r">Items from earlier calls are still there!</span>' : '. Looks fine… so far.'), [cp(code, 2, k ? 'bad' : 'ok'), { type: 'array', label: 'the ONE shared default list', values: shared.map(rp), hl: hl }, vp({ item: it, bucket: shared.slice() }, 'bucket', k ? 'bad' : 'ok'), tx('<code>' + esc(rp(shared)) + '</code>', 'printed')]));
        });
        frames.push(fr('The fix: <code>def add(item, bucket=None):</code> then <code>if bucket is None: bucket = []</code>. Now the <code>[]</code> runs <b>inside</b> the body, creating a brand-new list on every call.', [cp(['def add(item, bucket=None):', '    if bucket is None:', '        bucket = []      # new list each call', '    bucket.append(item)', '    return bucket'].join('\n'), 3, 'ok'), { type: 'table', label: 'outputs after the fix', columns: ['call', 'returns'], rows: items.map(function (it) { return ['add(' + rp(it) + ')', rp([it])]; }) }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Early return makes code flatter', html: `<p><code>return</code> exits immediately, so "guard clauses" at the top remove nesting.</p>`, code: { lang: 'python', run: true, code: `def discount(price, is_member):
    if price <= 0:
        return 0               # guard clause: bail out early
    if not is_member:
        return price
    return round(price * 0.9, 2)

print(discount(100, True), discount(100, False), discount(-5, True))` } },
      { title: 'Defaults are evaluated once — even timestamps', html: `<p>Not just lists: any expression in a default runs at definition time. A default like <code>stamp=time.time()</code> freezes the time the module was loaded.</p>`, code: { lang: 'python', run: true, code: `counter = 0
def next_id():
    global counter
    counter += 1
    return counter

def make_user(name, uid=next_id()):   # next_id() runs ONCE, at def time
    return name, uid

print(make_user('a'), make_user('b'))   # both get uid 1
print('next_id was called', counter, 'time(s)')` } },
      { title: 'Functions are objects you can pass around', html: `<p>A function name is just a variable pointing to a function object. You can store it in a dict and call it later — a clean replacement for long if/elif chains.</p>`, code: { lang: 'python', run: true, code: `def add(a, b): return a + b
def sub(a, b): return a - b

ops = {'+': add, '-': sub}
print(ops['+'](7, 3), ops['-'](7, 3))
print(sorted(['bob', 'Al', 'cy'], key=str.lower))   # pass a function as key` } },
      { title: 'Local vs global names', html: `<p>Assigning inside a function creates a <b>local</b> name. Reading an outer name is fine; assigning to it without <code>global</code> makes Python treat it as local everywhere in that function — hence <code>UnboundLocalError</code>.</p>`, code: { lang: 'python', run: true, code: `count = 10

def read_only():
    return count + 1          # reading global is fine

def broken():
    try:
        count += 1            # assignment makes 'count' local -> not yet bound
    except UnboundLocalError as e:
        return 'UnboundLocalError: ' + str(e)

print(read_only())
print(broken())` } }
    ],
    deepDive: `<p>🟣 <b>Defaults live on the function object.</b> <code>def</code> is an executable statement: it evaluates defaults and stores them in <code>f.__defaults__</code> (and keyword-only ones in <code>f.__kwdefaults__</code>). Each call that omits the argument binds the parameter to <b>that stored object</b>. Mutating it (append, update, +=) changes it for all future calls. Immutable defaults (ints, strings, tuples, None) are safe because they cannot be changed in place.</p>
<p><b>Argument binding algorithm</b> (what the visualizer shows): (1) fill positional parameters left to right; extras go to <code>*args</code> or raise TypeError; (2) match keywords by name; duplicate → "got multiple values"; unknown → goes to <code>**kwargs</code> or raises; (3) fill gaps from defaults; still-missing → "missing required argument". Full signature order: <code>def f(pos_only, /, normal, *args, kw_only, **kwargs)</code>.</p>
<p><b>Pass by object reference</b> ("call by sharing"): the parameter name is bound to the <b>same object</b> the caller passed. Mutating it (<code>lst.append</code>) is visible to the caller; rebinding it (<code>lst = []</code>) is not. Python is neither pure pass-by-value nor pass-by-reference.</p>
<p><b>Call cost.</b> A Python function call costs roughly 50–100 ns in CPython 3.11+ (3.11 made frames much cheaper), so millions of tiny calls in a hot loop still add up. Deep recursion is capped by <code>sys.getrecursionlimit()</code> (default 1000) — Python has no tail-call optimisation.</p>
<p><b>Type hints & docstrings</b> (<code>def area(w: float, h: float) -&gt; float:</code>) are not enforced at runtime but power IDEs, mypy and AI assistants; they become central in module py09.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write function bodies quickly when the <b>signature + docstring</b> are good. Designing clear names, parameters, defaults and return types is now the high-leverage human skill — a precise signature is the best prompt you can write.</p>
<p><b>Use AI as a partner:</b> <code>"Suggest a better signature for this function: which params should be keyword-only, which defaults are risky?"</code>, or <code>"Write pytest cases covering every way to call this function, including TypeErrors"</code>.</p>
<p><b>Where AI goes wrong:</b> it still produces <code>def f(x, cache={})</code> or <code>items=[]</code> defaults (linters flag this: Ruff <code>B006</code>, Pylint <code>dangerous-default-value</code>), boolean positional flags (<code>process(data, True, False)</code>), and functions that both print and return inconsistently.</p>
<p><b>What you must still own:</b> explaining the shared-default bug from first principles (default evaluated at def time), the binding rules behind each TypeError, and "pass by object reference" — these are classic interview questions that test understanding, not typing speed.</p>`,
    problems: [{
      title: 'Tag Collector without the Shared-Default Bug', level: 'Easy', tags: ['functions', 'default args', 'gotcha'], companies: ['Google', 'Meta', 'Stripe'],
      statement: `<p>Write <code>add_tag(tag, tags=None)</code> that appends <code>tag</code> to the list <code>tags</code> (creating a new list when none is given), <b>skipping duplicates</b>, and returns the list. Calls that do not pass <code>tags</code> must never see tags from earlier calls.</p>`,
      constraints: `Up to 10<sup>4</sup> calls; each list ≤ 100 tags; tags are non-empty strings.`,
      example: `<p><code>add_tag('py')</code> → ${H.c('g', "['py']")}; next <code>add_tag('js')</code> → ${H.c('g', "['js']")} (NOT ['py', 'js']); <code>t = ['a']; add_tag('a', t)</code> → ${H.c('b', "['a']")} (duplicate skipped).</p>`,
      brute: { why: `<p>The "obvious" version uses <code>tags=[]</code>. It passes the first test, then fails the second: the default list was created once at def time, so the second call returns <code>['py', 'js']</code>. It is not slow — it is <b>wrong</b>.</p>`, code: `def add_tag(tag, tags=[]):
    # BUG: this [] is shared by every call that omits tags
    if tag not in tags:
        tags.append(tag)
    return tags` },
      mcq: { q: 'When is the default value of a parameter evaluated?', options: ['Once, when the def statement runs', 'On every call that omits the argument', 'Only when the module is imported twice'], answer: 0, explain: 'Defaults are evaluated once and stored in f.__defaults__.' },
      hints: [`<p>Hint 1: Use an immutable "nothing given" marker as the default — <code>None</code>.</p>`, `<p>Hint 2: Inside, <code>if tags is None: tags = []</code> creates a fresh list per call. Use <code>is None</code>, not truthiness, so that a caller's empty list is still used.</p>`, `<p>Hint 3: Skip duplicates with <code>if tag not in tags</code> (O(n), fine for ≤ 100). For big lists keep a set alongside.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [['add_tag(\'py\'); result = add_tag(\'js\')'], ['js']],
          [['t = [\'a\']; result = add_tag(\'a\', t)'], ['a']],
          [['t = []; add_tag(\'x\', t); result = t'], ['x']],
          [['result = add_tag(\'a\')'], ['a']],
          [['t = [\'a\', \'b\']; result = add_tag(\'c\', t)'], ['a', 'b', 'c']],
          [['a = add_tag(\'x\'); b = add_tag(\'y\'); result = [a, b, a is b]'], [['x'], ['y'], false]],
          [['t = [\'a\']; add_tag(\'b\', t); result = add_tag(\'z\')'], ['z']],
          [
            [
              'for i in range(10000):\n' +
                '    add_tag(str(i))\n' +
                'result = add_tag(\'q\')'
            ],
            ['q']
          ],
          [
            [
              't = []\n' +
                'for i in range(100):\n' +
                '    add_tag(str(i), t)\n' +
                'for i in range(100):\n' +
                '    add_tag(str(i), t)\n' +
                'result = len(t)'
            ],
            100
          ],
          [['t = [\'b\']; result = add_tag(\'a\', t) is t'], true]
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
        approach: `<p>Default to <code>None</code>; create the list inside the body so each call gets its own. Check <code>is None</code> (not <code>if not tags</code>, which would replace a caller's empty list with a new one and break aliasing). Append only if absent.</p>`,
        code: { lang: 'python', run: true, code: `def add_tag(tag, tags=None):
    """Append tag to tags (new list if None), skipping duplicates."""
    if tags is None:
        tags = []              # fresh list on every call that omits tags
    if tag not in tags:
        tags.append(tag)
    return tags

print(add_tag('py'))           # ['py']
print(add_tag('js'))           # ['js']   - no leakage
mine = ['a']
print(add_tag('a', mine))      # ['a']    - duplicate skipped
empty = []
add_tag('x', empty)
print(empty)                   # ['x']    - caller's list was used` },
        dry: { head: ['call', 'tags is None?', 'list used', 'returns'], rows: [["add_tag('py')", 'yes → new []', 'list #1', "['py']"], ["add_tag('js')", 'yes → new []', 'list #2', "['js']"], ["add_tag('a', ['a'])", 'no', "caller's", "['a'] (dup)"], ["add_tag('x', [])", 'no (empty but not None)', "caller's", "['x']"]] },
        complexity: `<p>O(n) per call for the <code>in</code> check on a list of n tags; O(1) extra space besides the list.</p>`,
        followUps: ['Make it O(1) per call by keeping a set of seen tags.', 'Why would <code>if not tags: tags = []</code> be a subtle bug for the last test?']
      }
    }]
  });

  /* ================= TOPIC 5: lists & tuples ================= */
  topics.push({
    title: 'Lists and Tuples: Ordered Collections',
    analogy: `<p>A <b>list</b> is a <b>row of numbered lockers you can rearrange</b>: add a locker at the end, squeeze one in the middle (everyone after it shifts down one), take one out. A <b>tuple</b> is a <b>sealed envelope</b> with a fixed set of things inside — you can read what is in it, but you cannot add, remove or swap items once it is sealed.</p>`,
    explain: `<p>🟢 <b>Lists</b> hold items <b>in order</b>, allow duplicates, can mix types, and can change (they are <b>mutable</b>).</p>
<pre>nums = [10, 20, 30]
nums[0]        # 10   (indexes start at 0)
nums[-1]       # 30   (negative = count from the end)
len(nums)      # 3</pre>
${H.arr([10, 20, 30], { label: 'nums', idx: true })}
<p><b>Most used list methods</b> (all change the list <b>in place</b> and mostly return <code>None</code>):</p>
${H.table(['Operation', 'Example → result', 'Cost'], [['append(x)', '<code>[1,2].append(3)</code> → [1,2,3]', 'O(1) amortised'], ['extend(iter)', '<code>[1].extend([2,3])</code> → [1,2,3]', 'O(k)'], ['insert(i, x)', '<code>[1,3].insert(1, 2)</code> → [1,2,3]', 'O(n) (shifts)'], ['pop()', 'removes &amp; returns last', 'O(1)'], ['pop(0)', 'removes &amp; returns first', '<span class="c-r">O(n)</span>'], ['remove(x)', 'deletes first x (ValueError if missing)', 'O(n)'], ['x in lst / index(x) / count(x)', 'linear search', 'O(n)'], ['sort() / sorted(lst)', 'in place / new list', 'O(n log n)'], ['reverse() / lst[::-1]', 'in place / new list', 'O(n)']])}
<p><b>sort() vs sorted():</b> <code>lst.sort()</code> changes the list and returns <code>None</code> (so <code>x = lst.sort()</code> makes x None!). <code>sorted(lst)</code> returns a <b>new</b> list and works on any iterable. Both accept <code>key=</code> and <code>reverse=True</code>.</p>
<p>🟢 <b>Tuples</b> are like lists but <b>immutable</b>: <code>point = (3, 4)</code>. The comma makes the tuple, not the brackets: <code>t = 5,</code> is a tuple, <code>(5)</code> is just the int 5, so a one-item tuple is <code>(5,)</code>. Use tuples for <b>fixed records</b> (x, y), function returns, and dictionary keys (lists cannot be keys).</p>
<p>🟢 <b>Names are labels, not boxes.</b> <code>b = a</code> does <b>not</b> copy a list — both names point at the <b>same</b> list. Change it through b and a "changes" too. To copy: <code>a[:]</code>, <code>list(a)</code> or <code>a.copy()</code> (these are <b>shallow</b> copies — module py05 covers deep copies).</p>
<p><b>Grid trap:</b> <code>[[0] * 3] * 3</code> repeats the <b>same inner list</b> three times; use <code>[[0] * 3 for _ in range(3)]</code>.</p>`,
    clues: [
      '"ordered collection that grows" / "stack" → list with <code>append</code> + <code>pop()</code> (both O(1))',
      '"remove from the front repeatedly" / "queue" → <b>not</b> <code>list.pop(0)</code> (O(n)); use <code>collections.deque</code>',
      '"fixed record like (x, y)" / "use as a dict key" / "return several values" → tuple',
      '"sorted copy, keep the original" → <code>sorted(lst)</code>; "sort in place, save memory" → <code>lst.sort()</code>',
      '"sort by second field / length / case-insensitive" → <code>key=</code> (e.g. <code>key=len</code>, <code>key=lambda p: p[1]</code>)',
      '"2-D grid / matrix" → list comprehension of rows, never <code>[[0]*m]*n</code>',
      '"check membership many times" → convert the list to a set first (O(1) vs O(n))'
    ],
    code: [{ lang: 'python', run: true, title: 'List and tuple essentials (runnable)', code: `fruits = ['apple', 'kiwi', 'fig']
fruits.append('mango')          # add to end
fruits.insert(1, 'banana')      # squeeze in at index 1
print(fruits)
print(fruits.pop(), fruits)     # removes and returns last item
fruits.remove('kiwi')           # remove by value (first match)
print(fruits, len(fruits), 'fig' in fruits)

# sort vs sorted
nums = [5, 2, 9, 1]
print(sorted(nums), nums)       # new list; original unchanged
result = nums.sort()            # in place, returns None
print(result, nums)
words = ['Pear', 'fig', 'apple']
print(sorted(words, key=str.lower))          # case-insensitive
print(sorted(words, key=len, reverse=True))  # longest first

# tuples: immutable, comma makes the tuple
point = (3, 4)
single = (5,)
not_tuple = (5)
print(type(single).__name__, type(not_tuple).__name__)
try:
    point[0] = 10
except TypeError as e:
    print('TypeError:', e)

# aliasing vs copying
a = [1, 2, 3]
b = a            # same list, two names
c = a[:]         # new (shallow) copy
b.append(4)
print(a, c, a is b, a is c)

# grid trap
bad = [[0] * 3] * 3
bad[0][0] = 1
good = [[0] * 3 for _ in range(3)]
good[0][0] = 1
print(bad)
print(good)` }],
    codeTitle: ['Lists & tuples'],
    viz: [{
      title: 'List operations, one at a time (with their cost)',
      input: 'append 5; insert 0 9; append 7; pop 0; remove 5; extend 3 1; sort; reverse; pop',
      inputLabel: 'start = [4, 8]; ops separated by ; (append x, insert i x, pop, pop i, remove x, extend a b, sort, reverse)',
      gen: function (input) {
        var ops = String(input).split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!ops.length) throw new Error('Enter operations like: append 5; pop');
        if (ops.length > 14) throw new Error('At most 14 operations');
        var L = [4, 8], frames = [fr('Start with <code>lst = [4, 8]</code>. A Python list is a dynamic array: items sit in consecutive slots, so the <b>end</b> is cheap to change and the <b>front/middle</b> requires shifting.', [{ type: 'array', label: 'lst', values: L.slice() }, cp('lst = [4, 8]', 1, 'ok')])];
        ops.forEach(function (op) {
          var p = op.split(/\s+/), name = p[0], hl = {}, narr = '', cls = 'ok', line = 'lst.' + op;
          var args = p.slice(1).map(lit);
          if (name === 'append') {
            if (args.length !== 1) throw new Error('append needs exactly one value');
            L.push(args[0]); hl[L.length - 1] = 'ok';
            line = 'lst.append(' + rp(args[0]) + ')';
            narr = 'append puts <b>' + esc(rp(args[0])) + '</b> in the next free slot at the end. Nothing moves → <b>O(1)</b> (amortised: occasionally the array grows and copies).';
          } else if (name === 'insert') {
            if (args.length !== 2 || typeof args[0] !== 'number') throw new Error('insert needs: insert index value');
            var i = args[0]; if (i < 0) i = Math.max(0, L.length + i); if (i > L.length) i = L.length;
            L.splice(i, 0, args[1]); hl[i] = 'ok';
            for (var s = i + 1; s < L.length; s++) hl[s] = 'win';
            line = 'lst.insert(' + args[0] + ', ' + rp(args[1]) + ')';
            narr = 'insert at index ' + i + ': the ' + (L.length - 1 - i) + ' item(s) after it shift right one slot (blue) → <b>O(n)</b>. (Out-of-range indexes are clamped, never an error.)';
          } else if (name === 'pop') {
            if (!L.length) { frames.push(fr('<span class="c-r">IndexError: pop from empty list</span>. Always check <code>if lst:</code> first.', [{ type: 'array', label: 'lst', values: ['(empty)'] }, cp('lst.pop()', 1, 'bad')])); return; }
            var j = args.length ? args[0] : L.length - 1; if (j < 0) j += L.length;
            if (j < 0 || j >= L.length) { frames.push(fr('<span class="c-r">IndexError: pop index out of range</span>.', [{ type: 'array', label: 'lst', values: L.map(rp) }, cp('lst.' + op, 1, 'bad')])); return; }
            var before = L.slice(), hb = {}; hb[j] = 'bad';
            var v = L.splice(j, 1)[0];
            line = 'x = lst.pop(' + (args.length ? args[0] : '') + ')';
            frames.push(fr('pop' + (args.length ? '(' + args[0] + ')' : '()') + ' removes and <b>returns</b> ' + esc(rp(v)) + (j === before.length - 1 ? ' from the end → <b>O(1)</b>.' : '. Everything after index ' + j + ' must shift left → <b>O(n)</b>. That is why queues use <code>deque.popleft()</code>.'), [{ type: 'array', label: 'lst (before)', values: before.map(rp), hl: hb }, { type: 'array', label: 'lst (after)', values: L.length ? L.map(rp) : ['(empty)'] }, vp({ x: v }, 'x'), cp(line, 1, j === before.length - 1 ? 'ok' : 'bad')]));
            return;
          } else if (name === 'remove') {
            var k = -1;
            for (var q = 0; q < L.length; q++) if (rp(L[q]) === rp(args[0])) { k = q; break; }
            if (k < 0) { frames.push(fr('remove(' + esc(rp(args[0])) + '): scanned all ' + L.length + ' items, not found → <span class="c-r">ValueError: list.remove(x): x not in list</span>.', [{ type: 'array', label: 'lst', values: L.map(rp), hl: L.reduce(function (h, _, i2) { h[i2] = 'done'; return h; }, {}) }, cp('lst.remove(' + rp(args[0]) + ')', 1, 'bad')])); return; }
            var bf = L.slice(), hr = {}; for (var r = 0; r < k; r++) hr[r] = 'done'; hr[k] = 'bad';
            L.splice(k, 1);
            frames.push(fr('remove(' + esc(rp(args[0])) + ') searches left to right (' + (k + 1) + ' comparison(s)), deletes the <b>first</b> match at index ' + k + ', then shifts the rest left → <b>O(n)</b>.', [{ type: 'array', label: 'lst (before)', values: bf.map(rp), hl: hr }, { type: 'array', label: 'lst (after)', values: L.length ? L.map(rp) : ['(empty)'] }, cp('lst.remove(' + rp(args[0]) + ')', 1, 'ok')]));
            return;
          } else if (name === 'extend') {
            var st = L.length; args.forEach(function (x) { L.push(x); });
            for (var e = st; e < L.length; e++) hl[e] = 'ok';
            line = 'lst.extend(' + rp(args) + ')';
            narr = 'extend appends <b>each</b> item of the iterable (k = ' + args.length + ') → O(k). Compare: <code>append([3, 1])</code> would add <b>one</b> nested list.';
          } else if (name === 'sort') {
            L.sort(function (x, y) { return (typeof x === 'number' && typeof y === 'number') ? x - y : String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0; });
            L.forEach(function (_, i3) { hl[i3] = 'sel'; });
            line = 'lst.sort()'; cls = 'sel';
            narr = 'sort() reorders <b>in place</b> using Timsort, O(n log n), and returns <b>None</b>. Use <code>sorted(lst)</code> if you need a new list.';
          } else if (name === 'reverse') {
            L.reverse(); L.forEach(function (_, i4) { hl[i4] = 'win'; });
            line = 'lst.reverse()';
            narr = 'reverse() flips the list in place in O(n) and returns None. <code>lst[::-1]</code> gives a reversed <b>copy</b> instead.';
          } else {
            throw new Error('Unknown operation "' + name + '". Use append, insert, pop, remove, extend, sort, reverse');
          }
          frames.push(fr(narr, [{ type: 'array', label: 'lst', values: L.length ? L.map(rp) : ['(empty)'], hl: hl }, cp(line, 1, cls), vp({ 'len(lst)': L.length })]));
        });
        frames.push(fr('Final list: <b>' + esc(rp(L)) + '</b>. Rule of thumb: work at the <b>end</b> of a list whenever you can.', [{ type: 'array', label: 'lst', values: L.length ? L.map(rp) : ['(empty)'] }]));
        while (frames.length < 4) frames.push(fr('Add more operations to see more steps.', [{ type: 'array', label: 'lst', values: L.length ? L.map(rp) : ['(empty)'] }]));
        return frames;
      }
    }, {
      title: 'Names are labels: b = a vs c = a[:]',
      gen: function () {
        function g(edges, hl, ehl, tags, objs) {
          var nodes = [{ id: 'a', label: 'a', x: 10, y: 12, shape: 'box', w: 10 }, { id: 'b', label: 'b', x: 10, y: 32, shape: 'box', w: 10 }, { id: 'c', label: 'c', x: 10, y: 52, shape: 'box', w: 10 }, { id: 'L1', label: objs[0], x: 65, y: 20, shape: 'box', w: 40 }];
          if (objs[1]) nodes.push({ id: 'L2', label: objs[1], x: 65, y: 50, shape: 'box', w: 40 });
          return { type: 'graph', label: 'names (left) → list objects (right)', directed: true, height: 62, nodes: nodes.filter(function (n) { return n.id === 'L1' || n.id === 'L2' || edges.some(function (e) { return e[0] === n.id; }); }), edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var code = ['a = [1, 2, 3]', 'b = a', 'c = a[:]', 'b.append(4)', 'print(a, b, c)'].join('\n');
        return [
          fr('<code>a = [1, 2, 3]</code> creates a list object and ties the name <b>a</b> to it. The name is a label, the list lives elsewhere in memory.', [cp(code, 1, 'ok'), g([['a', 'L1']], { L1: 'ok' }, { 'a-L1': 'ok' }, { L1: 'id 0x01' }, ['[1, 2, 3]'])]),
          fr('<code>b = a</code> copies <b>nothing</b>. It just ties a second label to the <b>same</b> object. Now <code>a is b</code> is True.', [cp(code, 2, 'cur'), g([['a', 'L1'], ['b', 'L1']], { b: 'cur' }, { 'b-L1': 'cur' }, { L1: 'id 0x01' }, ['[1, 2, 3]'])]),
          fr('<code>c = a[:]</code> slices the whole list, which <b>builds a new list object</b> with the same items. <code>a is c</code> is False, <code>a == c</code> is True.', [cp(code, 3, 'ok'), g([['a', 'L1'], ['b', 'L1'], ['c', 'L2']], { c: 'ok', L2: 'ok' }, { 'c-L2': 'ok' }, { L1: 'id 0x01', L2: 'id 0x02' }, ['[1, 2, 3]', '[1, 2, 3]'])]),
          fr('<code>b.append(4)</code> mutates the object that <b>b</b> points to — which is also <b>a</b>\'s object. The copy behind <b>c</b> is untouched.', [cp(code, 4, 'bad'), g([['a', 'L1'], ['b', 'L1'], ['c', 'L2']], { L1: 'bad' }, { 'a-L1': 'bad', 'b-L1': 'bad' }, { L1: 'mutated!' }, ['[1, 2, 3, 4]', '[1, 2, 3]'])]),
          fr('Output: <code>[1, 2, 3, 4] [1, 2, 3, 4] [1, 2, 3]</code>. Remember: <b>assignment never copies</b>. Use <code>a[:]</code>, <code>list(a)</code> or <code>a.copy()</code> for a shallow copy.', [cp(code, 5, 'sel'), tx('<code>[1, 2, 3, 4] [1, 2, 3, 4] [1, 2, 3]</code>', 'stdout')]),
          fr('The same trap hides in <code>[[0] * 3] * 3</code>: the outer <code>* 3</code> copies the <b>reference</b> to one inner list three times, so changing <code>grid[0][0]</code> changes every row.', [g([['a', 'L1'], ['b', 'L1'], ['c', 'L1']], { L1: 'bad' }, {}, { L1: 'one inner list' }, ['[0, 0, 0]']), tx('Think of a, b, c here as grid[0], grid[1], grid[2].', 'analogy')])
        ];
      }
    }],
    examples: [
      { title: 'append vs extend vs +', html: `<p><code>append</code> adds <b>one</b> item (even if it is a list). <code>extend</code> adds <b>each</b> item. <code>+</code> builds a <b>new</b> list; <code>+=</code> on a list behaves like <code>extend</code> (in place).</p>`, code: { lang: 'python', run: true, code: `a = [1, 2]
a.append([3, 4])
print(a)            # [1, 2, [3, 4]]
b = [1, 2]
b.extend([3, 4])
print(b)            # [1, 2, 3, 4]
c = b + [5]
print(c, b)         # new list; b unchanged` } },
      { title: 'Sorting records with key=', html: `<p>Tuples sort element by element (lexicographically), so sorting by "score descending, then name" can use a key returning a tuple.</p>`, code: { lang: 'python', run: true, code: `people = [('Ben', 82), ('Asha', 95), ('Cy', 82)]
print(sorted(people, key=lambda p: p[1]))            # by score (stable: Ben before Cy)
print(sorted(people, key=lambda p: (-p[1], p[0])))   # score desc, then name
print(max(people, key=lambda p: p[1]))               # top scorer` } },
      { title: 'Tuples as dictionary keys', html: `<p>Because tuples are immutable (and hashable when their items are), they can be keys — perfect for grid coordinates.</p>`, code: { lang: 'python', run: true, code: `board = {(0, 0): 'X', (1, 1): 'O'}
print(board[(1, 1)])
print((2, 2) in board)
try:
    bad = {[0, 0]: 'X'}
except TypeError as e:
    print('TypeError:', e)` } },
      { title: 'A list as a stack', html: `<p><code>append</code> = push, <code>pop()</code> = pop, <code>lst[-1]</code> = peek. All O(1). Classic use: checking balanced brackets.</p>`, code: { lang: 'python', run: true, code: `def balanced(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in '([{':
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack

print(balanced('([]{})'), balanced('(]'), balanced('(('))` } }
    ],
    deepDive: `<p>🟣 <b>A list is an array of pointers.</b> CPython's <code>PyListObject</code> stores a C array of <code>PyObject*</code> plus <code>size</code> and <code>allocated</code>. That is why a list can mix types (every slot is just a pointer) and why indexing is O(1).</p>
<p><b>Amortised O(1) append.</b> When the array is full, CPython allocates a bigger one (growth ≈ 1.125× plus a small constant) and copies the pointers. Copies are rare enough that the average cost per append stays constant. You can watch it: <code>sys.getsizeof([])</code> jumps in steps as you append.</p>
<p><b>Timsort</b> (Python's sort since 2002, with Powersort merge-policy since 3.11) is a hybrid merge/insertion sort: O(n log n) worst case, O(n) on already-sorted or reversed data, and <b>stable</b> — equal keys keep their original order, which allows multi-pass sorting (sort by name, then by score). <code>key=</code> is computed once per item (decorate-sort-undecorate under the hood).</p>
<p><b>Tuples are leaner.</b> A tuple stores its items inline in one allocation, has no spare capacity, and small tuples are recycled via free lists — so they are a bit smaller and faster to create than lists. Tuple immutability is <b>shallow</b>: <code>t = ([1], 2)</code>; <code>t[0].append(3)</code> works. Famous puzzle: <code>t[0] += [4]</code> mutates the list <i>and then</i> raises TypeError (the item assignment fails after the in-place add succeeded).</p>
<p><b>Hashability:</b> a tuple is hashable only if all its items are; <code>hash((1, [2]))</code> raises TypeError.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI writes list-manipulating code fast, but it frequently picks the wrong structure: <code>list.pop(0)</code> in a BFS queue, <code>x in big_list</code> inside a loop (accidental O(n²)), or <code>[[0]*m]*n</code> grids. Spotting those costs is now your main value.</p>
<p><b>Use AI as a partner:</b> <code>"Annotate each line of this function with its Big-O"</code> and check its answers against the table above; <code>"Is this sort stable and does my code depend on that?"</code>.</p>
<p><b>Where AI goes wrong:</b> writing <code>x = lst.sort()</code> and using x (None), confusing <code>append</code> with <code>extend</code>, or claiming tuples are "faster in every case". It may also mutate a list argument the caller did not expect to change.</p>
<p><b>What you must still own:</b> the cost model of lists (end = cheap, front/middle = O(n)), aliasing vs copying, and the sort-vs-sorted return values — all frequent "predict the output" interview items.</p>`,
    problems: [{
      title: 'Merge Two Sorted Lists (array version)', level: 'Medium', tags: ['lists', 'two pointers', 'sorting'], companies: ['Amazon', 'Microsoft', 'Apple'],
      statement: `<p>Given two lists <code>a</code> and <code>b</code>, each sorted in non-decreasing order, return one new sorted list containing all their items. Do not modify the inputs.</p>`,
      constraints: `0 ≤ len(a), len(b) ≤ 10<sup>5</sup>; values fit in normal Python ints.`,
      example: `${H.arr([1, 4, 7], { label: 'a' })}${H.arr([2, 3, 9, 10], { label: 'b' })}${H.arr([1, 2, 3, 4, 7, 9, 10], { label: 'result', hl: { 0: 'g', 3: 'g', 4: 'g' } })}<p>Green items came from a; the rest from b. Each step takes the <b>smaller front</b> item.</p>`,
      brute: { why: `<p><code>sorted(a + b)</code> is short and correct, but costs O((n+m) log(n+m)) and throws away the fact that both inputs are already sorted. (In practice Timsort detects the two runs and is fast — but interviewers want the O(n+m) merge.)</p>`, code: `def merge(a, b):
    return sorted(a + b)` },
      mcq: { q: 'With pointers i (in a) and j (in b), when should you take a[i]?', options: ['When a[i] <= b[j]', 'When i < j', 'Always alternate a, b, a, b'], answer: 0, explain: 'Take the smaller front element; using <= keeps the merge stable (a\'s equal items first).' },
      hints: [`<p>Hint 1: The smallest remaining item is always at the front of a or the front of b.</p>`, `<p>Hint 2: Keep two indexes i, j. Compare a[i] and b[j], append the smaller, move that pointer.</p>`, `<p>Hint 3: When one list runs out, the rest of the other is already sorted — <code>result.extend(a[i:])</code> and <code>result.extend(b[j:])</code>.</p>`],
      tests: {
        sig: 'int[] int[] -> int[]',
        fn: 'merge',
        cases: [
          [[[1, 4, 7], [2, 3, 9, 10]], [1, 2, 3, 4, 7, 9, 10]],
          [[[], [5]], [5]],
          [[[2, 2], [2]], [2, 2, 2]],
          [[[], []], []],
          [[[1], []], [1]],
          [[[-5, -1, 0], [-3, 0, 4]], [-5, -3, -1, 0, 0, 4]],
          [[[1, 2, 3], [4, 5, 6]], [1, 2, 3, 4, 5, 6]],
          [[[4, 5, 6], [1, 2, 3]], [1, 2, 3, 4, 5, 6]],
          [[[0, 0], [0, 0]], [0, 0, 0, 0]],
          [[{ $range: [0, 200000, 2] }, { $range: [1, 200000, 2] }], { $range: [0, 200000, 1] }]
        ]
      },
      solution: {
        approach: `<p>Two-pointer merge: compare fronts, append the smaller, advance its pointer; when one side is exhausted, extend with the remainder. Each item is touched once.</p>`,
        code: { lang: 'python', run: true, code: `def merge(a, b):
    i, j = 0, 0
    result = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:          # <= keeps equal items from a first (stable)
            result.append(a[i])
            i += 1
        else:
            result.append(b[j])
            j += 1
    result.extend(a[i:])          # leftovers (at most one of these is non-empty)
    result.extend(b[j:])
    return result

print(merge([1, 4, 7], [2, 3, 9, 10]))   # [1, 2, 3, 4, 7, 9, 10]
print(merge([], [5]), merge([2, 2], [2]))` },
        alt: [{ lang: 'python', code: `import heapq

def merge(a, b):
    # standard library: lazy k-way merge of sorted iterables
    return list(heapq.merge(a, b))` }],
        dry: { head: ['i', 'j', 'a[i]', 'b[j]', 'take', 'result'], rows: [['0', '0', '1', '2', 'a', '[1]'], ['1', '0', '4', '2', 'b', '[1, 2]'], ['1', '1', '4', '3', 'b', '[1, 2, 3]'], ['1', '2', '4', '9', 'a', '[1, 2, 3, 4]'], ['2', '2', '7', '9', 'a', '[1, 2, 3, 4, 7]'], ['3', '2', '—', '—', 'extend b[2:]', '[1, 2, 3, 4, 7, 9, 10]']] },
        complexity: `<p>Time O(n + m), extra space O(n + m) for the output.</p>`,
        followUps: ['Merge k sorted lists → heap, O(N log k).', 'Merge in place into a with spare room at the end (fill from the back).']
      }
    }]
  });

  /* ================= TOPIC 6: dicts & sets ================= */
  topics.push({
    title: 'Dictionaries and Sets: Fast Lookup by Key',
    analogy: `<p>A <b>dictionary</b> is a <b>phone contacts app</b>: you type a name (the <b>key</b>) and instantly get the number (the <b>value</b>) — you never scroll through the whole list. A <b>set</b> is a <b>guest list at the door</b>: it only cares <i>whether</i> a name is on it, each name appears once, and checking is instant.</p>`,
    explain: `<p>🟢 <b>dict = key → value pairs.</b></p>
<pre>ages = {'asha': 31, 'ben': 25}
ages['asha']          # 31
ages['cy'] = 40       # add or overwrite
'ben' in ages         # True   (checks KEYS, O(1) on average)
ages.get('zed')       # None   (no KeyError)
ages.get('zed', 0)    # 0      (custom default)
del ages['ben']       # remove (KeyError if missing)
ages.pop('cy', None)  # remove and return, safe default</pre>
${H.kv([['asha', 31], ['ben', 25], ['cy', 40]], { label: 'ages', hl: { cy: 'g' } })}
<p><b>Looping:</b> <code>for k in d</code> (keys), <code>for v in d.values()</code>, <code>for k, v in d.items()</code>. Since Python 3.7, dicts <b>remember insertion order</b> — they print and loop in the order keys were first added.</p>
<p><b>Keys must be hashable</b> (immutable-ish): str, int, float, tuple of those, frozenset. Lists, dicts and sets cannot be keys. Values can be anything.</p>
<p><b>Two everyday patterns:</b></p>
${H.table(['Pattern', 'Code'], [['Counting', '<code>counts[w] = counts.get(w, 0) + 1</code>'], ['Grouping', '<code>groups.setdefault(key, []).append(item)</code>'], ['Invert a mapping', '<code>{v: k for k, v in d.items()}</code>'], ['Merge (3.9+)', '<code>merged = d1 | d2</code> (right side wins)']])}
<p>🟢 <b>set = unique items, no order, O(1) membership.</b></p>
<pre>seen = {3, 1, 3, 2}   # {1, 2, 3} - duplicates vanish
seen.add(5)
seen.discard(9)       # no error if missing (remove() would raise)
empty = set()         # NOT {} - that is an empty dict!</pre>
<p><b>Set maths:</b> <code>a | b</code> union, <code>a &amp; b</code> intersection, <code>a - b</code> difference, <code>a ^ b</code> symmetric difference (in one but not both), <code>a &lt;= b</code> subset.</p>
${H.chips([1, 2, 3, 4], { label: 'a', hl: { 3: 'g', 4: 'g' } })}${H.chips([3, 4, 5], { label: 'b', hl: { 3: 'g', 4: 'g' } })}<p>a &amp; b = {3, 4} (green) · a | b = {1, 2, 3, 4, 5} · a − b = {1, 2} · a ^ b = {1, 2, 5}</p>`,
    clues: [
      '"count occurrences / frequency / most common" → dict counting (or <code>collections.Counter</code>, module py11)',
      '"have I seen this before?" / "duplicates" / "unique" → set',
      '"find a pair with sum / complement" → dict of value → index (Two Sum pattern), O(n)',
      '"group by" / "anagrams" / "bucket items by a property" → dict of lists with <code>setdefault</code> or <code>defaultdict(list)</code>',
      '"common elements" / "in A but not in B" → set intersection / difference',
      '"lookup inside a loop over another list" → precompute a set/dict to turn O(n·m) into O(n + m)',
      '"preserve first-seen order while removing duplicates" → <code>list(dict.fromkeys(items))</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'dict and set essentials (runnable)', code: `ages = {'asha': 31, 'ben': 25}
ages['cy'] = 40                  # insert
ages['ben'] += 1                 # update
print(ages, len(ages))
print(ages.get('zed'), ages.get('zed', 0))
for name, age in ages.items():   # insertion order is guaranteed (3.7+)
    print(name, age)

# counting words
text = 'the cat and the hat and the bat'
counts = {}
for w in text.split():
    counts[w] = counts.get(w, 0) + 1
print(counts)
print(max(counts, key=counts.get))   # most frequent word

# grouping by first letter
groups = {}
for w in ['apple', 'avocado', 'banana', 'blueberry', 'cherry']:
    groups.setdefault(w[0], []).append(w)
print(groups)

# sets: uniqueness and set algebra
a = {1, 2, 3, 4}
b = {3, 4, 5}
print(a | b, a & b, a - b, a ^ b)
print({1, 2} <= a, 5 in a)
print(type({}).__name__, type(set()).__name__)

# order-preserving de-duplication
items = ['b', 'a', 'b', 'c', 'a']
print(list(dict.fromkeys(items)))    # ['b', 'a', 'c']
print(sorted(set(items)))            # ['a', 'b', 'c'] (order lost, then sorted)` }],
    codeTitle: ['Dicts & sets'],
    viz: [{
      title: 'Counting words with dict.get(word, 0) + 1',
      input: 'the cat and the hat and the bat',
      inputLabel: 'words (space separated, ≤ 16)',
      gen: function (input) {
        var w = words(input);
        if (!w.length) throw new Error('Enter some words');
        if (w.length > 16) throw new Error('At most 16 words');
        var code = ['counts = {}', 'for w in words:', '    counts[w] = counts.get(w, 0) + 1', 'print(counts)'].join('\n');
        var counts = [], frames = [fr('Start with an empty dict. For each word we ask "how many so far?" with <code>get(w, 0)</code> — 0 if the key is new — add 1, and store it back.', [cp(code, 1, 'ok'), { type: 'array', label: 'words', values: w }, { type: 'map', label: 'counts', entries: [] }])];
        w.forEach(function (word, k) {
          var idx = -1;
          for (var i = 0; i < counts.length; i++) if (counts[i][0] === word) idx = i;
          var old = idx < 0 ? 0 : counts[idx][1];
          if (idx < 0) counts.push([word, 1]); else counts[idx][1] = old + 1;
          var hl = {}; hl[word] = idx < 0 ? 'ok' : 'cur';
          var ah = {}, ap = {}; for (var d = 0; d < k; d++) ah[d] = 'done'; ah[k] = 'cur'; ap[k] = 'w';
          frames.push(fr('<b>w = \'' + esc(word) + '\'</b>: ' + (idx < 0 ? 'not a key yet → <code>get</code> returns the default <b>0</b>; store 0 + 1 = <b>1</b>. New keys go to the <b>end</b> (insertion order).' : 'already a key with value ' + old + ' → store ' + old + ' + 1 = <b>' + (old + 1) + '</b>. The key keeps its original position.') + ' Hash lookup: O(1) on average.', [cp(code, 3, idx < 0 ? 'ok' : 'cur'), { type: 'array', label: 'words', values: w, hl: ah, ptr: ap }, { type: 'map', label: 'counts', entries: counts.map(function (e) { return [e[0], e[1]]; }), hl: hl }]));
        });
        var best = counts.reduce(function (b, e) { return e[1] > b[1] ? e : b; }, counts[0]);
        var hb = {}; hb[best[0]] = 'sel';
        frames.push(fr('Done: one pass, O(n). <code>max(counts, key=counts.get)</code> → <b>\'' + esc(best[0]) + '\'</b> (' + best[1] + ' times; ties go to the first key in insertion order). Without a dict you would rescan the list for every word: O(n²).', [cp(code, 4, 'sel'), { type: 'map', label: 'counts', entries: counts.map(function (e) { return [e[0], e[1]]; }), hl: hb }]));
        return frames;
      }
    }, {
      title: 'Set algebra: |  &  -  ^',
      input: '1 2 3 4 | 3 4 5',
      inputLabel: 'set A | set B (numbers or words)',
      gen: function (input) {
        var halves = String(input).split('|');
        if (halves.length !== 2) throw new Error('Use the format: 1 2 3 | 3 4');
        function uniq(xs) { var o = []; xs.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
        var rawA = words(halves[0]), rawB = words(halves[1]);
        var A = uniq(rawA), B = uniq(rawB);
        if (!A.length || !B.length) throw new Error('Both sets need at least one item');
        if (A.length > 12 || B.length > 12) throw new Error('At most 12 items per set');
        function hl(items, pick) { var h = {}; items.forEach(function (x) { if (pick(x)) h[x] = 'ok'; }); return h; }
        var inA = function (x) { return A.indexOf(x) >= 0; }, inB = function (x) { return B.indexOf(x) >= 0; };
        var U = uniq(A.concat(B)), I = A.filter(inB), D = A.filter(function (x) { return !inB(x); }), S = U.filter(function (x) { return inA(x) !== inB(x); });
        var frames = [];
        frames.push(fr('Building the sets removes duplicates automatically' + (rawA.length !== A.length || rawB.length !== B.length ? ' (some of your repeats vanished!)' : '') + '. A set stores each item once, keyed by its hash.', [{ type: 'set', label: 'A', items: A }, { type: 'set', label: 'B', items: B }, cp('A = {' + A.join(', ') + '}\nB = {' + B.join(', ') + '}', 1, 'ok')]));
        frames.push(fr('<b>Union</b> <code>A | B</code>: everything in <i>either</i> set → {' + U.join(', ') + '}.', [{ type: 'set', label: 'A', items: A, hl: hl(A, function () { return true; }) }, { type: 'set', label: 'B', items: B, hl: hl(B, function () { return true; }) }, { type: 'set', label: 'A | B', items: U, hl: hl(U, function () { return true; }) }]));
        frames.push(fr('<b>Intersection</b> <code>A &amp; B</code>: only items in <i>both</i> → {' + I.join(', ') + '}' + (I.length ? '' : ' (empty: shown as set())') + '. Python loops over the smaller set and checks the other in O(1).', [{ type: 'set', label: 'A', items: A, hl: hl(A, inB) }, { type: 'set', label: 'B', items: B, hl: hl(B, inA) }, { type: 'set', label: 'A & B', items: I }]));
        frames.push(fr('<b>Difference</b> <code>A - B</code>: in A but <i>not</i> in B → {' + D.join(', ') + '}. Order matters: <code>B - A</code> would be different.', [{ type: 'set', label: 'A', items: A, hl: hl(A, function (x) { return !inB(x); }) }, { type: 'set', label: 'B', items: B }, { type: 'set', label: 'A - B', items: D }]));
        frames.push(fr('<b>Symmetric difference</b> <code>A ^ B</code>: in exactly one of them → {' + S.join(', ') + '}. Equals <code>(A | B) - (A &amp; B)</code>.', [{ type: 'set', label: 'A', items: A, hl: hl(A, function (x) { return !inB(x); }) }, { type: 'set', label: 'B', items: B, hl: hl(B, function (x) { return !inA(x); }) }, { type: 'set', label: 'A ^ B', items: S }]));
        frames.push(fr('Membership: <code>' + esc(A[0]) + ' in B</code> → <b>' + (inB(A[0]) ? 'True' : 'False') + '</b>, computed by hashing — no scan, O(1) on average. With lists it would be O(n).', [{ type: 'set', label: 'B', items: B, hl: (function () { var h = {}; if (inB(A[0])) h[A[0]] = 'sel'; return h; })() }, { type: 'table', label: 'summary', columns: ['expression', 'result'], rows: [['A | B', '{' + U.join(', ') + '}'], ['A & B', I.length ? '{' + I.join(', ') + '}' : 'set()'], ['A - B', D.length ? '{' + D.join(', ') + '}' : 'set()'], ['A ^ B', S.length ? '{' + S.join(', ') + '}' : 'set()']] }]));
        return frames;
      }
    }],
    examples: [
      { title: 'KeyError vs get vs in', html: `<p>Square brackets raise <code>KeyError</code> for a missing key. Use <code>in</code> to check, <code>get</code> for a default, or <code>try/except</code> when a missing key is truly exceptional.</p>`, code: { lang: 'python', run: true, code: `stock = {'apple': 5}
print('pear' in stock, stock.get('pear', 0))
try:
    stock['pear']
except KeyError as e:
    print('KeyError:', e)` } },
      { title: 'Group anagrams with a dict of lists', html: `<p>Words that are anagrams share the same sorted letters, so use that as the key.</p>`, code: { lang: 'python', run: true, code: `words = ['eat', 'tea', 'tan', 'ate', 'nat', 'bat']
groups = {}
for w in words:
    key = ''.join(sorted(w))          # 'aet' for eat/tea/ate
    groups.setdefault(key, []).append(w)
print(list(groups.values()))   # [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]` } },
      { title: 'Do not change a dict while looping over it', html: `<p>Adding/removing keys during iteration raises <code>RuntimeError</code>. Loop over a snapshot (<code>list(d)</code>) or build a new dict.</p>`, code: { lang: 'python', run: true, code: `prices = {'a': 0, 'b': 3, 'c': 0}
try:
    for k in prices:
        if prices[k] == 0:
            del prices[k]
except RuntimeError as e:
    print('RuntimeError:', e)

prices = {'a': 0, 'b': 3, 'c': 0}
prices = {k: v for k, v in prices.items() if v != 0}
print(prices)` } },
      { title: 'Speed-up: list lookups → set lookups', html: `<p>Checking membership in a list inside a loop is O(n·m). Converting once to a set makes it O(n + m).</p>`, code: { lang: 'python', run: true, code: `import time
banned = list(range(0, 4000, 2))
users = list(range(4000))

t = time.perf_counter()
ok_slow = [u for u in users if u not in banned]        # list scan each time
t_list = time.perf_counter() - t

banned_set = set(banned)
t = time.perf_counter()
ok_fast = [u for u in users if u not in banned_set]    # hash lookup
t_set = time.perf_counter() - t

print(ok_slow == ok_fast, f'list {t_list:.3f}s vs set {t_set:.5f}s')` } }
    ],
    deepDive: `<p>🟣 <b>Hash tables under the hood.</b> <code>hash(key)</code> turns a key into a big integer; its low bits choose a slot. CPython dicts (since 3.6) use a <b>compact layout</b>: a small sparse <i>index table</i> plus a dense <i>entries array</i> in insertion order. That design saves memory and is why insertion order is preserved (made a language guarantee in 3.7).</p>
<p><b>Collisions</b> use open addressing with a perturbed probe sequence (not linked lists). The table is resized when about 2/3 full, so lookups stay O(1) on average. Worst case is O(n) if many keys collide; string hashes are randomised per process (<code>PYTHONHASHSEED</code>) to stop attackers from crafting colliding keys (hash-flooding DoS).</p>
<p><b>The hash/eq contract:</b> if <code>a == b</code> then <code>hash(a) == hash(b)</code>. Note <code>1 == 1.0 == True</code>, so <code>{1: 'a', 1.0: 'b', True: 'c'}</code> is a dict with <b>one</b> key (1) and value 'c'. Mutable objects are unhashable because their hash would change after insertion and they would be "lost" in the wrong slot.</p>
<p><b>Sets</b> are hash tables with keys only (no values) and are <b>not</b> ordered — iteration order depends on hashes and can differ between runs for strings. <code>frozenset</code> is the immutable, hashable version (can be a dict key or live inside another set).</p>
<p><b>Memory:</b> dicts and sets trade memory for speed — an empty dict is ~64 bytes and each entry costs tens of bytes. For millions of small records, consider tuples, <code>__slots__</code> classes, or arrays.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "use a hash map" is the first optimisation AI suggests — and it is usually right. Your value is recognising <i>which</i> key to use (sorted letters for anagrams, complement for Two Sum, (row, col) tuples for grids) and checking hashability.</p>
<p><b>Use AI as a partner:</b> <code>"This function is O(n²); can a dict or set bring it to O(n)?"</code>; <code>"Generate tricky keys for this dict: 1 vs 1.0 vs True, tuples with lists"</code>.</p>
<p><b>Where AI goes wrong:</b> deleting keys while iterating, writing <code>{}</code> to mean an empty set, assuming set iteration order is stable, and using <code>dict[key]</code> where a missing key is normal (KeyError in production at 3 a.m.).</p>
<p><b>What you must still own:</b> the O(1)-average / O(n)-worst story, the hash/eq contract, why lists cannot be keys, and the counting/grouping/complement patterns that unlock dozens of interview problems.</p>`,
    problems: [{
      title: 'Two Sum (return indexes)', level: 'Easy', tags: ['dict', 'hashing', 'complement'], companies: ['Amazon', 'Google', 'Meta', 'Adobe'],
      statement: `<p>Given a list <code>nums</code> and an integer <code>target</code>, return the indexes <code>[i, j]</code> (i &lt; j) of the two numbers that add up to <code>target</code>. Exactly one answer exists; you may not use the same element twice.</p>`,
      constraints: `2 ≤ len(nums) ≤ 10<sup>5</sup>; −10<sup>9</sup> ≤ nums[i], target ≤ 10<sup>9</sup>`,
      example: `${H.arr([2, 7, 11, 15], { label: 'nums', hl: { 0: 'g', 1: 'g' } })}<p>target = 9 → <b>[0, 1]</b> because ${H.c('g', '2 + 7 = 9')}. At index 1 we need 9 − 7 = 2, and 2 was already seen at index 0.</p>`,
      brute: { why: `<p>Check every pair (i, j): n(n−1)/2 ≈ 5·10<sup>9</sup> pairs for n = 10<sup>5</sup> — far too slow in Python. The waste: for each number we <i>rescan</i> to find its partner instead of remembering what we have seen.</p>`, code: `def two_sum(nums, target):
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []` },
      mcq: { q: 'At index j with value x, what should you look up in the dict?', options: ['target - x', 'x', 'target + x', 'j - target'], answer: 0, explain: 'You need a partner p with p + x = target, i.e. p = target − x, seen earlier.' },
      hints: [`<p>Hint 1: For each number x you need its <b>complement</b> target − x. Have you seen it before?</p>`, `<p>Hint 2: A dict <code>value → index</code> of numbers seen so far answers that in O(1).</p>`, `<p>Hint 3: Check <b>before</b> inserting the current number (so you never pair an element with itself). Recipe: for j, x in enumerate(nums): if target-x in seen → return [seen[target-x], j]; else seen[x] = j.</p>`],
      tests: {
        sig: 'int[] int -> int[]',
        fn: 'twoSum',
        cases: [
          [[[2, 7, 11, 15], 9], [0, 1]],
          [[[3, 2, 4], 6], [1, 2]],
          [[[3, 3], 6], [0, 1]],
          [[[-3, 4, 3, 90], 0], [0, 2]],
          [[[0, 4, 3, 0], 0], [0, 3]],
          [[[1, 2], 3], [0, 1]],
          [[[-1000000000, 1000000000, 5], 0], [0, 1]],
          [[[5, 75, 25], 100], [1, 2]],
          [[[-1, -2, -3, -4, -5], -8], [2, 4]],
          [[{ $range: [0, 100000, 1] }, 199997], [99998, 99999]]
        ]
      },
      solution: {
        approach: `<p>One pass with <code>enumerate</code>. Keep <code>seen = {value: index}</code>. For each x, if <code>target − x</code> is in seen, we found the pair; otherwise record x. Checking before inserting handles duplicates like [3, 3] with target 6.</p>`,
        code: { lang: 'python', run: true, code: `def two_sum(nums, target):
    seen = {}                       # value -> index where we saw it
    for j, x in enumerate(nums):
        need = target - x
        if need in seen:            # O(1) average lookup
            return [seen[need], j]
        seen[x] = j                 # insert AFTER the check
    return []

print(two_sum([2, 7, 11, 15], 9))   # [0, 1]
print(two_sum([3, 2, 4], 6))        # [1, 2]
print(two_sum([3, 3], 6))           # [0, 1]` },
        dry: { head: ['j', 'x', 'need = 9 − x', 'need in seen?', 'seen after'], rows: [['0', '2', '7', 'no', '{2: 0}'], ['1', '7', '2', '<span class="c-g">yes → [0, 1]</span>', '—']] },
        complexity: `<p>Time O(n) average, space O(n) for the dict.</p>`,
        followUps: ['Input is sorted → two pointers with O(1) extra space.', 'Return all unique pairs / count pairs → dict of counts.', 'Three Sum → sort + two pointers, O(n²).']
      }
    }]
  });

  /* ================= TOPIC 7: slicing ================= */
  topics.push({
    title: 'Slicing: seq[start:stop:step] Without Off-by-One Errors',
    analogy: `<p>Slicing is <b>cutting a loaf of bread with a ruler</b>. The numbers on the ruler mark the <b>gaps between slices</b>, not the slices themselves. <code>bread[2:5]</code> means "cut at mark 2 and at mark 5" — you get the 3 slices in between. The step is "take every 2nd slice". And you can measure from the <b>back end</b> of the loaf with negative numbers.</p>`,
    explain: `<p>🟢 <b>The shape:</b> <code>seq[start:stop:step]</code> works on lists, tuples, strings, ranges and bytes. It always returns a <b>new</b> object of the same type and <b>never raises IndexError</b> — out-of-range bounds are simply clamped.</p>
<ul><li><b>start</b> is included, <b>stop</b> is excluded (half-open, just like <code>range</code>).</li><li>Leave any part out to use the default: start → beginning, stop → end, step → 1.</li><li>Negative indexes count from the end: <code>-1</code> is the last item.</li></ul>
${H.arr(['P', 'Y', 'T', 'H', 'O', 'N'], { label: 's = "PYTHON"', hl: { 1: 'g', 2: 'g', 3: 'g' } })}
${H.table(['Slice', 'Result', 'How to read it'], [['<code>s[1:4]</code>', "'YTH'", 'items 1, 2, 3 (stop 4 excluded)'], ['<code>s[:3]</code>', "'PYT'", 'first 3'], ['<code>s[3:]</code>', "'HON'", 'from index 3 to the end'], ['<code>s[-2:]</code>', "'ON'", 'last 2'], ['<code>s[:-1]</code>', "'PYTHO'", 'everything except the last'], ['<code>s[::2]</code>', "'PTO'", 'every 2nd item'], ['<code>s[::-1]</code>', "'NOHTYP'", 'reversed copy'], ['<code>s[1:100]</code>', "'YTHON'", 'stop clamped, no error'], ['<code>s[4:1]</code>', "''", 'empty: start is after stop with a positive step']])}
<p><b>Handy facts:</b> <code>len(s[a:b]) == b - a</code> (for valid non-negative a ≤ b); <code>s[:k] + s[k:] == s</code> for every k — the two halves always rebuild the original. <code>lst[:]</code> is the classic shallow copy.</p>
<p><b>Negative step</b> walks backwards, so start should be to the <b>right</b> of stop: <code>s[4:1:-1]</code> → 'OHT' (indexes 4, 3, 2).</p>
<p><b>Lists also allow slice assignment and deletion</b> (strings and tuples do not — they are immutable):</p>
<pre>nums = [0, 1, 2, 3, 4, 5]
nums[1:3] = ['a', 'b', 'c']   # replace 2 items with 3 → [0,'a','b','c',3,4,5]
del nums[::2]                  # delete every 2nd item
nums[:] = []                   # empty the SAME list (others holding it see it)</pre>`,
    clues: [
      '"first k / last k elements" → <code>a[:k]</code>, <code>a[-k:]</code> (careful: <code>a[-0:]</code> is the whole list when k = 0)',
      '"reverse a string/list" / "palindrome" → <code>s[::-1]</code>',
      '"rotate by k" → <code>a[-k:] + a[:-k]</code> after <code>k %= n</code>',
      '"every other element" / "even positions" → <code>a[::2]</code>, odd positions <code>a[1::2]</code>',
      '"copy the list before changing it" → <code>a[:]</code> or <code>a.copy()</code>',
      '"substring from i to j inclusive" → <code>s[i:j+1]</code> (stop is exclusive)',
      'slicing inside a loop over n items → hidden O(n²) copies; prefer indexes or <code>itertools.islice</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'Slicing cookbook (runnable)', code: `s = 'PYTHON'
print(s[1:4], s[:3], s[3:], s[-2:], s[:-1])
print(s[::2], s[1::2], s[::-1], s[4:1:-1])
print(repr(s[1:100]), repr(s[4:1]))        # clamped / empty, never an error

nums = list(range(10))
print(nums[2:8:3])            # [2, 5]
print(nums[-3:])              # last three
k = 3
print(nums[-k:] + nums[:-k])  # rotate right by 3

# s[:k] + s[k:] always rebuilds s
print(all(s[:i] + s[i:] == s for i in range(-10, 10)))

# slice assignment / deletion (lists only)
nums = [0, 1, 2, 3, 4, 5]
nums[1:3] = ['a', 'b', 'c']
print(nums)
del nums[::2]
print(nums)

# a slice is a copy: changing it does not touch the original
orig = [1, 2, 3]
part = orig[:2]
part[0] = 99
print(orig, part)

# palindrome check
word = 'Racecar'
print(word.lower() == word.lower()[::-1])

# slice objects can be named and reused
LAST_TWO = slice(-2, None)
print('PYTHON'[LAST_TWO], [1, 2, 3, 4][LAST_TWO])` }],
    codeTitle: ['Slicing'],
    viz: [{
      title: 'Slice explorer: how Python picks indexes',
      input: 'P Y T H O N | 1:5:2',
      inputLabel: 'items | start:stop:step (any part may be blank, e.g. ::-1 or -3:)',
      gen: function (input) {
        var halves = String(input).split('|');
        if (halves.length !== 2) throw new Error('Use the format: a b c d | 1:3  (or ::-1)');
        var items = words(halves[0]);
        if (!items.length || items.length > 12) throw new Error('Give 1–12 items');
        var sp = halves[1].trim().split(':');
        if (sp.length < 2 || sp.length > 3) throw new Error('Slice must look like start:stop or start:stop:step');
        function num(t) { t = (t || '').trim(); if (!t.length) return null; var v = parseInt(t, 10); if (isNaN(v) || String(v) !== t.replace(/^\+/, '')) throw new Error('Slice parts must be integers or blank'); return v; }
        var a0 = num(sp[0]), b0 = num(sp[1]), c0 = sp.length === 3 ? num(sp[2]) : null;
        var n = items.length, step = c0 === null ? 1 : c0;
        if (step === 0) throw new Error('ValueError: slice step cannot be zero');
        var idxL = items.map(function (_, i) { return i + ' / ' + (i - n); });
        var txt = '[' + (a0 === null ? '' : a0) + ':' + (b0 === null ? '' : b0) + (sp.length === 3 ? ':' + (c0 === null ? '' : c0) : '') + ']';
        var frames = [fr('Each item has two addresses: a <b>positive</b> index (from the front, 0…' + (n - 1) + ') and a <b>negative</b> one (from the back, −' + n + '…−1). We will evaluate <code>seq' + txt + '</code>.', [{ type: 'array', label: 'seq (index / negative index)', values: items, idxLabels: idxL }, vp({ 'len(seq)': n, step: step })])];
        var start, stop, why = [];
        if (step > 0) {
          if (a0 === null) { start = 0; why.push('start blank → 0 (front)'); } else { start = a0 < 0 ? a0 + n : a0; if (a0 < 0) why.push('start ' + a0 + ' → ' + a0 + ' + ' + n + ' = ' + start); if (start < 0) { start = 0; why.push('clamped to 0'); } if (start > n) { start = n; why.push('clamped to ' + n); } }
          if (b0 === null) { stop = n; why.push('stop blank → ' + n + ' (just past the end)'); } else { stop = b0 < 0 ? b0 + n : b0; if (b0 < 0) why.push('stop ' + b0 + ' → ' + b0 + ' + ' + n + ' = ' + stop); if (stop < 0) { stop = 0; why.push('stop clamped to 0'); } if (stop > n) { stop = n; why.push('stop clamped to ' + n + ' (no IndexError!)'); } }
        } else {
          if (a0 === null) { start = n - 1; why.push('start blank with negative step → ' + (n - 1) + ' (last item)'); } else { start = a0 < 0 ? a0 + n : a0; if (a0 < 0) why.push('start ' + a0 + ' → ' + start); if (start < 0) { start = -1; why.push('start before the front → nothing to take'); } if (start >= n) { start = n - 1; why.push('start clamped to ' + (n - 1)); } }
          if (b0 === null) { stop = -1; why.push('stop blank with negative step → "before index 0" (so index 0 is included)'); } else { stop = b0 < 0 ? b0 + n : b0; if (b0 < 0) why.push('stop ' + b0 + ' → ' + stop); if (stop < 0) { stop = -1; why.push('stop clamped to "before 0"'); } if (stop >= n) { stop = n - 1; why.push('stop clamped to ' + (n - 1)); } }
        }
        frames.push(fr('Step 1 — normalise the bounds: ' + why.join('; ') + '. Now: start = <b>' + start + '</b>, stop = <b>' + (stop === -1 && step < 0 ? 'before 0' : stop) + '</b> (excluded), step = <b>' + step + '</b>.', [{ type: 'array', label: 'seq', values: items, idxLabels: idxL, ptr: (function () { var p = {}; if (start >= 0 && start < n) p[start] = 'start'; if (stop >= 0 && stop < n) p[stop] = (p[stop] ? p[stop] + '/' : '') + 'stop'; return p; })() }, vp({ start: start, stop: stop, step: step }, 'start,stop')]));
        var picked = [], res = [], i = start, guard = 0;
        while ((step > 0 ? i < stop : i > stop) && guard++ < 40) {
          picked.push(i); res.push(items[i]);
          var hl = {}, ptr = {}; picked.forEach(function (q) { hl[q] = 'done'; }); hl[i] = 'ok'; ptr[i] = 'i';
          frames.push(fr('i = ' + i + ' is ' + (step > 0 ? 'below' : 'above') + ' stop → take <b>' + esc(items[i]) + '</b>, then i ' + (step > 0 ? '+' : '−') + '= ' + Math.abs(step) + '.', [{ type: 'array', label: 'seq', values: items, idxLabels: idxL, hl: hl, ptr: ptr }, { type: 'array', label: 'result so far', values: res.slice() }, vp({ i: i, step: step })]));
          i += step;
        }
        frames.push(fr('i = ' + i + ' has ' + (step > 0 ? 'reached/passed' : 'reached/passed') + ' stop → done. <code>seq' + txt + '</code> = <b>' + (res.length ? '[' + res.map(esc).join(', ') + ']' : '[] (empty — no error)') + '</b>, a brand-new object of ' + res.length + ' item(s).', [{ type: 'array', label: 'seq', values: items, idxLabels: idxL, hl: picked.reduce(function (h, q) { h[q] = 'sel'; return h; }, {}) }, { type: 'array', label: 'result', values: res.length ? res : ['(empty)'], hl: res.reduce(function (h, _, q) { h[q] = 'sel'; return h; }, {}) }]));
        return frames;
      }
    }, {
      title: 'Slice assignment: replacing a range with a different-length list',
      gen: function () {
        var code = ['nums = [0, 1, 2, 3, 4, 5]', "nums[1:3] = ['a', 'b', 'c']", 'del nums[::2]', 'nums[:0] = [9]'].join('\n');
        return [
          fr('Start: six items. Slice assignment can <b>grow or shrink</b> a list in one move — something plain indexing cannot do.', [cp(code, 1, 'ok'), { type: 'array', label: 'nums', values: [0, 1, 2, 3, 4, 5] }]),
          fr('<code>nums[1:3]</code> selects the gap between marks 1 and 3: items <b>1, 2</b> (red).', [cp(code, 2, 'cur'), { type: 'array', label: 'nums', values: [0, 1, 2, 3, 4, 5], hl: { 1: 'bad', 2: 'bad' }, ptr: { 1: 'start', 3: 'stop' } }]),
          fr('They are replaced by <b>three</b> new items — the list grows by one and the tail shifts right. Result: [0, \'a\', \'b\', \'c\', 3, 4, 5].', [cp(code, 2, 'ok'), { type: 'array', label: 'nums', values: [0, "'a'", "'b'", "'c'", 3, 4, 5], hl: { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'win', 5: 'win', 6: 'win' } }]),
          fr('<code>del nums[::2]</code> removes indexes 0, 2, 4, 6 (every second item, starting at 0).', [cp(code, 3, 'bad'), { type: 'array', label: 'nums', values: [0, "'a'", "'b'", "'c'", 3, 4, 5], hl: { 0: 'bad', 2: 'bad', 4: 'bad', 6: 'bad' } }]),
          fr('Left: [\'a\', \'c\', 4].', [cp(code, 3, 'ok'), { type: 'array', label: 'nums', values: ["'a'", "'c'", 4] }]),
          fr('<code>nums[:0] = [9]</code> assigns into the <b>empty</b> slice at the front → an insert at index 0: [9, \'a\', \'c\', 4]. (Same as <code>nums.insert(0, 9)</code>, and also O(n).)', [cp(code, 4, 'ok'), { type: 'array', label: 'nums', values: [9, "'a'", "'c'", 4], hl: { 0: 'ok' } }]),
          fr('Strings and tuples are immutable: <code>s[0:2] = \'hi\'</code> raises <span class="c-r">TypeError</span>. Build a new string instead: <code>s = \'hi\' + s[2:]</code>.', [tx('<code>TypeError: \'str\' object does not support item assignment</code>', 'error')])
        ];
      }
    }],
    examples: [
      { title: 'Inclusive substring i..j', html: `<p>Because stop is exclusive, an inclusive range i..j needs <code>j + 1</code>.</p>`, code: { lang: 'python', run: true, code: `s = 'interview'
i, j = 2, 5
print(s[i:j + 1])    # 'terv' (indexes 2, 3, 4, 5)
print(len(s[i:j + 1]) == j - i + 1)` } },
      { title: 'The k = 0 trap with negative slices', html: `<p><code>a[-k:]</code> is meant to be "the last k items", but when k = 0, <code>-0</code> is <code>0</code> and you get the <b>whole</b> list. Guard it or use <code>a[len(a)-k:]</code>.</p>`, code: { lang: 'python', run: true, code: `a = [1, 2, 3, 4]
for k in [2, 1, 0]:
    print(k, a[-k:], a[len(a) - k:])
# k=0: a[-0:] -> whole list (!), a[4:] -> []` } },
      { title: 'Chunks of size k', html: `<p>Slicing with a range of start positions splits a sequence into pieces; the last chunk may be shorter (slices never fail).</p>`, code: { lang: 'python', run: true, code: `data = list(range(1, 11))
k = 4
chunks = [data[i:i + k] for i in range(0, len(data), k)]
print(chunks)   # [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10]]` } },
      { title: 'In-place clear vs rebinding', html: `<p><code>lst[:] = []</code> (or <code>lst.clear()</code>) empties the <b>same</b> object, so every other name holding it sees the change. <code>lst = []</code> just points one name at a new list.</p>`, code: { lang: 'python', run: true, code: `a = [1, 2, 3]
b = a
a = []              # rebinding: b still sees the old list
print(b)            # [1, 2, 3]
a = b
a[:] = []           # mutate in place: b sees it
print(b)            # []` } }
    ],
    deepDive: `<p>🟣 <b>Slices are objects.</b> <code>s[1:5:2]</code> calls <code>s.__getitem__(slice(1, 5, 2))</code>. <code>slice(1, 5, 2).indices(len(s))</code> returns the normalised <code>(start, stop, step)</code> — exactly the clamping rules the visualizer shows. Your own classes can support slicing by handling a <code>slice</code> argument in <code>__getitem__</code> (module py08).</p>
<p><b>Cost model.</b> Slicing a list/str/tuple <b>copies</b> the selected references: O(k) time and memory for k items. So <code>while s: s = s[1:]</code> is O(n²), and recursive helpers like <code>f(arr[1:])</code> or <code>binary_search(arr[mid:])</code> silently turn O(log n) into O(n). Pass indexes instead. <code>s[::-1]</code> is O(n) but runs in C, so it is still the fastest way to reverse a string in Python.</p>
<p><b>Zero-copy alternatives:</b> <code>memoryview(b)[a:b]</code> slices bytes without copying; NumPy slices are <b>views</b> that share memory with the original (mutating a view changes the array — the opposite of list slicing!). <code>itertools.islice(it, a, b)</code> lazily slices any iterator (no negative indexes).</p>
<p><b>Shallow copy reminder:</b> <code>grid[:]</code> copies the outer list only; inner lists are shared. <code>copy.deepcopy</code> copies recursively.</p>
<p><b>Extended slice assignment</b> (step ≠ 1) must keep the same length: <code>a[::2] = [0]</code> on a 4-item list raises <code>ValueError: attempt to assign sequence of size 1 to extended slice of size 2</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> slicing one-liners are where AI is both most helpful and most dangerous: it will happily write <code>arr[-k:] + arr[:-k]</code> and forget <code>k %= n</code> or the k = 0 case. Treat every generated slice as a boundary-condition test target.</p>
<p><b>Use AI as a partner:</b> <code>"List the edge cases for this slice expression: empty list, k = 0, k &gt; n, negative k"</code>; <code>"Is there a hidden O(n²) from slicing in this recursive function?"</code>.</p>
<p><b>Where AI goes wrong:</b> recursion on <code>arr[1:]</code> in "efficient" solutions, assuming NumPy slices are copies (or that list slices are views), and off-by-one errors with inclusive ranges (<code>s[i:j]</code> vs <code>s[i:j+1]</code>).</p>
<p><b>What you must still own:</b> the half-open rule, defaults for negative steps, clamping instead of errors, and slice-copy cost — they come up in nearly every "predict the output" round.</p>`,
    problems: [{
      title: 'Rotate a List Right by k', level: 'Easy', tags: ['slicing', 'lists', 'modulo'], companies: ['Microsoft', 'Amazon', 'Bloomberg'],
      statement: `<p>Given a list <code>nums</code> and a non-negative integer <code>k</code>, return a new list rotated to the right by <code>k</code> steps (the last k items move to the front).</p>`,
      constraints: `0 ≤ len(nums) ≤ 10<sup>5</sup>; 0 ≤ k ≤ 10<sup>9</sup>`,
      example: `${H.arr([1, 2, 3, 4, 5, 6, 7], { label: 'nums', hl: { 4: 'b', 5: 'b', 6: 'b' } })}<p>k = 3 → ${H.arr([5, 6, 7, 1, 2, 3, 4], { hl: { 0: 'b', 1: 'b', 2: 'b' } })} The last 3 (blue) jump to the front. With k = 10 the answer is the same, because 10 % 7 = 3.</p>`,
      brute: { why: `<p>Rotating by one step k times (pop the last, insert at front) costs O(n) per step because <code>insert(0, x)</code> shifts everything: O(n·k) — with k up to 10<sup>9</sup>, hopeless. The waste: rotating by n brings you back to the start, and you can move all k items in one go.</p>`, code: `def rotate(nums, k):
    nums = nums[:]
    for _ in range(k):
        if nums:
            nums.insert(0, nums.pop())
    return nums` },
      mcq: { q: 'Why compute k %= len(nums) first?', options: ['Rotating by n gives the original list, so only k mod n matters', 'Slices fail for big k', 'To make k negative'], answer: 0, explain: 'Rotation repeats every n steps, so only k mod n matters. It also keeps the cut point n - k inside the list for huge k.' },
      hints: [`<p>Hint 1: The answer is just "the last k items" followed by "everything else".</p>`, `<p>Hint 2: <code>nums[-k:] + nums[:-k]</code> — but watch out when k = 0: <code>nums[-0:]</code> is the whole list and <code>nums[:-0]</code> is empty… which happens to give the right answer, yet a version with <code>len(nums) - k</code> is clearer.</p>`, `<p>Hint 3: Handle the empty list (avoid modulo by zero), reduce k with <code>k %= n</code>, then split at <code>n - k</code>: <code>nums[n-k:] + nums[:n-k]</code>.</p>`],
      tests: {
        sig: 'int[] int -> int[]',
        fn: 'rotate',
        cases: [
          [[[1, 2, 3, 4, 5, 6, 7], 3], [5, 6, 7, 1, 2, 3, 4]],
          [[[1, 2, 3, 4, 5, 6, 7], 10], [5, 6, 7, 1, 2, 3, 4]],
          [[[1, 2, 3], 0], [1, 2, 3]],
          [[[], 5], []],
          [[[1], 100], [1]],
          [[[1, 2], 1000000000], [1, 2]],
          [[[1, 2, 3, 4], 4], [1, 2, 3, 4]],
          [[[1, 2, 3, 4], 5], [4, 1, 2, 3]],
          [[[5, 6, 7], 1], [7, 5, 6]],
          [[{ $range: [0, 100000, 1] }, 999999999], { $concat: [{ $range: [1, 100000, 1] }, [0]] }]
        ]
      },
      solution: {
        approach: `<p>Reduce k modulo n, then glue two slices: the tail of length k and the head of length n − k. Splitting at index <code>n − k</code> avoids negative-zero confusion.</p>`,
        code: { lang: 'python', run: true, code: `def rotate(nums, k):
    n = len(nums)
    if n == 0:
        return []
    k %= n                       # rotating by n changes nothing
    cut = n - k                  # head is nums[:cut], tail is nums[cut:]
    return nums[cut:] + nums[:cut]

print(rotate([1, 2, 3, 4, 5, 6, 7], 3))    # [5, 6, 7, 1, 2, 3, 4]
print(rotate([1, 2, 3, 4, 5, 6, 7], 10))   # same, 10 % 7 == 3
print(rotate([1, 2], 0), rotate([], 5))` },
        alt: [{ lang: 'python', code: `from collections import deque

def rotate(nums, k):
    d = deque(nums)
    d.rotate(k)          # positive k rotates right, in C
    return list(d)` }],
        dry: { head: ['nums', 'k', 'n', 'k % n', 'cut = n − k', 'nums[cut:] + nums[:cut]'], rows: [['[1..7]', '3', '7', '3', '4', '[5,6,7] + [1,2,3,4]'], ['[1..7]', '10', '7', '3', '4', '[5,6,7,1,2,3,4]'], ['[1, 2]', '0', '2', '0', '2', '[] + [1, 2]'], ['[]', '5', '0', '—', '—', '[] (early return)']] },
        complexity: `<p>Time O(n), extra space O(n) for the new list. In-place O(1)-space version: reverse all, reverse first k, reverse the rest.</p>`,
        followUps: ['Rotate in place with the triple-reverse trick.', 'Rotate left instead (use k → n − k).', 'Check whether string b is a rotation of a: <code>len(a) == len(b) and b in a + a</code>.']
      }
    }]
  });

  /* ================= TOPIC 8: unpacking ================= */
  topics.push({
    title: 'Unpacking: Tuple Assignment, Swaps, *rest and ** Spreading',
    analogy: `<p>Unpacking is <b>emptying a grocery bag onto labelled spots on the counter</b>: "first item → fridge, last item → shelf, <i>everything in between</i> → basket". Packing is the reverse — sweeping loose items into a bag. Python does both with commas and stars.</p>`,
    explain: `<p>🟢 <b>Packing:</b> writing values separated by commas makes a tuple: <code>t = 1, 2, 3</code>.</p>
<p><b>Unpacking:</b> put several names on the left; Python hands out the items in order:</p>
<pre>x, y = (3, 4)             # x = 3, y = 4
name, age = ['Asha', 31]  # works with any iterable
a, b, c = 'hey'           # a='h', b='e', c='y'</pre>
<p>The number of names must match the number of items — otherwise <code>ValueError: too many values to unpack</code> / <code>not enough values to unpack</code>.</p>
<p><b>The famous swap.</b> <code>a, b = b, a</code> works without a temporary variable because Python <b>evaluates the entire right side first</b> (building the tuple <code>(b, a)</code>), and only then assigns left to right.</p>
<p><b>Star catches "the rest"</b> (as a <b>list</b>, possibly empty):</p>
${H.arr([1, 2, 3, 4, 5], { label: 'first, *middle, last = [1, 2, 3, 4, 5]', hl: { 0: 'g', 1: 'b', 2: 'b', 3: 'b', 4: 'y' } })}
<p>→ <code>first = 1</code>, <code>middle = [2, 3, 4]</code>, <code>last = 5</code>. Only <b>one</b> starred name is allowed per assignment.</p>
${H.table(['Where', 'Example', 'Meaning'], [['Loop targets', '<code>for k, v in d.items()</code>', 'unpack each pair'], ['Nested', '<code>(a, b), c = (1, 2), 3</code>', 'shape on the left mirrors the right'], ['Ignore parts', '<code>_, ext = name.rsplit(\'.\', 1)</code>', '<code>_</code> = "don\'t care" by convention'], ['Call with a list', '<code>print(*[1, 2, 3])</code>', 'same as <code>print(1, 2, 3)</code>'], ['Call with a dict', '<code>f(**{\'sep\': \'-\'})</code>', 'same as <code>f(sep=\'-\')</code>'], ['Build lists', '<code>[*a, *b, 0]</code>', 'concatenate any iterables'], ['Merge dicts', '<code>{**d1, **d2}</code>', 'later keys win']])}`,
    clues: [
      '"swap two values" / "update two variables at once" → <code>a, b = b, a</code> (right side evaluated first)',
      '"function returns several values" → return a tuple, unpack at the call site',
      '"first element and the rest" / "head and tail" → <code>head, *tail = items</code>',
      '"ignore some fields" / "only need the extension" → <code>_</code> placeholders',
      '"pass a list as separate arguments" → <code>f(*lst)</code>; "pass options from a dict" → <code>f(**opts)</code>',
      '"merge configs, later overrides earlier" → <code>{**defaults, **user}</code> or <code>defaults | user</code> (3.9+)',
      '"iterate pairs/records" → unpack in the for target: <code>for name, (x, y) in points</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'Unpacking in all its forms (runnable)', code: `# packing and unpacking
point = 3, 4                 # packing -> tuple
x, y = point                 # unpacking
print(x, y, type(point).__name__)

# swap: right side is fully evaluated first
a, b = 1, 2
a, b = b, a
print(a, b)

# star unpacking
first, *middle, last = [1, 2, 3, 4, 5]
print(first, middle, last)
head, *tail = 'abc'
print(head, tail)            # tail is a list of characters
*init, final = [42]
print(init, final)           # [] 42 - star can be empty

# nested and ignored parts
(name, age), city = ('Asha', 31), 'Pune'
print(name, age, city)
_, ext = 'report.final.pdf'.rsplit('.', 1)
print(ext)

# unpacking in loops
scores = {'asha': 91, 'ben': 78}
for who, score in scores.items():
    print(who, score)
for i, (px, py) in enumerate([(0, 0), (2, 5)]):
    print(i, px, py)

# * and ** at call sites and in literals
nums = [3, 1, 2]
print(*nums, sep=' | ')
opts = {'sep': '-', 'end': '!\\n'}
print('a', 'b', **opts)
merged = [*nums, *'xy', 0]
print(merged)
defaults = {'color': 'red', 'size': 'M'}
user = {'size': 'L'}
print({**defaults, **user})

# mismatched counts raise ValueError
try:
    p, q = [1, 2, 3]
except ValueError as e:
    print('ValueError:', e)` }],
    codeTitle: ['Unpacking'],
    viz: [{
      title: 'Starred assignment: who gets what?',
      input: 'first, *middle, last = 1 2 3 4 5',
      inputLabel: 'names = values  (e.g. a, b = 1 2   or   *init, x = 7 8 9)',
      gen: function (input) {
        var m = String(input).split('=');
        if (m.length !== 2) throw new Error('Use the format: a, *b, c = 1 2 3 4');
        var names = m[0].split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        var vals = words(m[1]).map(lit);
        if (!names.length || names.length > 6) throw new Error('Use 1–6 names on the left');
        if (vals.length > 12) throw new Error('At most 12 values');
        names.forEach(function (n) { if (!/^\*?[A-Za-z_]\w*$/.test(n)) throw new Error('Bad name "' + n + '" — use plain names, at most one starred'); });
        var stars = names.filter(function (n) { return n[0] === '*'; }).length;
        var code = names.join(', ') + ' = ' + rp(vals);
        var frames = [fr('Python first evaluates the <b>right side</b> completely and turns it into a sequence of ' + vals.length + ' item(s). Only then does it look at the names on the left.', [cp(code, 1, 'cur'), { type: 'array', label: 'right-hand side', values: vals.length ? vals.map(rp) : ['(empty)'] }])];
        if (stars > 1) { frames.push(fr('<span class="c-r">SyntaxError: multiple starred expressions in assignment</span> — Python could not know how to split the middle.', [cp(code, 1, 'bad'), tx('Only one <code>*name</code> per assignment.', 'rule')])); frames.push(fr('Fix: keep one star, e.g. <code>a, *rest = …</code>.', [cp(code, 1, 'bad'), { type: 'array', label: 'values', values: vals.map(rp) }])); return frames; }
        var fixed = names.length - stars;
        if (stars === 0 && vals.length !== names.length) {
          var msg = vals.length > names.length ? 'ValueError: too many values to unpack (expected ' + names.length + ')' : 'ValueError: not enough values to unpack (expected ' + names.length + ', got ' + vals.length + ')';
          frames.push(fr('No star, so the counts must match exactly: ' + names.length + ' name(s) vs ' + vals.length + ' value(s) → <span class="c-r">' + esc(msg) + '</span>.', [cp(code, 1, 'bad'), { type: 'array', label: 'right-hand side', values: vals.length ? vals.map(rp) : ['(empty)'], hl: vals.reduce(function (h, _, i) { if (i >= names.length) h[i] = 'bad'; return h; }, {}) }, tx(esc(msg), 'error')]));
          frames.push(fr('Fixes: add/remove names, slice the right side, or add a starred name to absorb extras.', [cp(names.concat(['*rest']).join(', ') + ' = ' + rp(vals), 1, 'ok'), tx('A star absorbs any extra items (it may also be empty).', 'tip')]));
          return frames;
        }
        if (stars === 1 && vals.length < fixed) {
          var msg2 = 'ValueError: not enough values to unpack (expected at least ' + fixed + ', got ' + vals.length + ')';
          frames.push(fr('Even with a star, the ' + fixed + ' plain name(s) each need one item → <span class="c-r">' + esc(msg2) + '</span>.', [cp(code, 1, 'bad'), tx(esc(msg2), 'error')]));
          frames.push(fr('The star can take <b>zero</b> items, but never fewer.', [cp(code, 1, 'bad'), { type: 'array', label: 'values', values: vals.length ? vals.map(rp) : ['(empty)'] }]));
          return frames;
        }
        var si = names.findIndex(function (n) { return n[0] === '*'; }), bound = {}, colors = ['ok', 'cur', 'sel', 'win', 'ok', 'cur'];
        var nBefore = si < 0 ? names.length : si, nAfter = si < 0 ? 0 : names.length - si - 1;
        var vh = {};
        for (var i = 0; i < nBefore; i++) {
          bound[names[i]] = vals[i]; vh[i] = 'ok';
          frames.push(fr('Name <b>' + names[i] + '</b> (position ' + i + ' from the left) takes item ' + i + ': <b>' + esc(rp(vals[i])) + '</b>.', [cp(code, 1, 'cur'), { type: 'array', label: 'right-hand side', values: vals.map(rp), hl: JSON.parse(JSON.stringify(vh)), ptr: (function () { var p = {}; p[i] = names[i]; return p; })() }, vp(bound, names[i])]));
        }
        for (var j = 0; j < nAfter; j++) {
          var nm = names[names.length - 1 - j], vi = vals.length - 1 - j;
          bound[nm] = vals[vi]; vh[vi] = 'sel';
          frames.push(fr('Names after the star are filled <b>from the right end</b>: <b>' + nm + '</b> takes item ' + vi + ': <b>' + esc(rp(vals[vi])) + '</b>.', [cp(code, 1, 'cur'), { type: 'array', label: 'right-hand side', values: vals.map(rp), hl: JSON.parse(JSON.stringify(vh)), ptr: (function () { var p = {}; p[vi] = nm; return p; })() }, vp(bound, nm)]));
        }
        if (si >= 0) {
          var mid = vals.slice(nBefore, vals.length - nAfter), sname = names[si].slice(1);
          for (var q = nBefore; q < vals.length - nAfter; q++) vh[q] = 'win';
          bound[sname] = mid;
          frames.push(fr('The starred name <b>' + sname + '</b> collects everything left in the middle as a <b>list</b> (not a tuple!): <b>' + esc(rp(mid)) + '</b>' + (mid.length ? '' : ' — empty is fine') + '.', [cp(code, 1, 'ok'), { type: 'array', label: 'right-hand side', values: vals.map(rp), hl: vh }, vp(bound, sname, 'win')]));
        }
        var ordered = {}; names.forEach(function (n) { var k = n.replace('*', ''); ordered[k] = bound[k]; });
        frames.push(fr('Done. Every name is bound; the right-hand tuple is thrown away.', [cp(code, 1, 'sel'), vp(ordered, Object.keys(ordered).join(','), 'sel')]));
        while (frames.length < 4) frames.push(fr('Try a longer example such as <code>a, *b, c = 1 2 3 4 5</code>.', [cp(code, 1, 'sel'), vp(ordered)]));
        return frames;
      }
    }, {
      title: 'a, b = b, a + b — the right side is built first (Fibonacci)',
      input: '7',
      inputLabel: 'number of steps (1–15)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 15) throw new Error('Enter an integer from 1 to 15');
        var code = ['a, b = 0, 1', 'for _ in range(n):', '    a, b = b, a + b', 'print(a)'].join('\n');
        var a = 0, b = 1, seq = [0], frames = [fr('Start: <code>a, b = 0, 1</code>. We will step n = ' + n + ' times; after k steps, a holds the k-th Fibonacci number.', [cp(code, 1, 'ok'), vp({ a: a, b: b }, 'a,b'), { type: 'bars', label: 'a after each step', values: seq.slice() }])];
        for (var k = 1; k <= n; k++) {
          var t0 = b, t1 = a + b;
          frames.push(fr('Step ' + k + ', phase 1: evaluate the <b>whole right side</b> using the <b>old</b> values → temporary tuple <b>(' + t0 + ', ' + t1 + ')</b>. Nothing is assigned yet.', [cp(code, 3, 'cur'), vp({ a: a, b: b }), { type: 'stack', label: 'temporary tuple (right side)', items: ['b = ' + t0, 'a + b = ' + t1] }]));
          a = t0; b = t1; seq.push(a);
          frames.push(fr('Phase 2: unpack the tuple into <code>a, b</code> → a = <b>' + a + '</b>, b = <b>' + b + '</b>. With two separate lines (<code>a = b; b = a + b</code>) the second line would see the <i>new</i> a and break the sequence.', [cp(code, 3, 'ok'), vp({ a: a, b: b }, 'a,b'), { type: 'bars', label: 'a after each step', values: seq.slice(), hl: (function () { var h = {}; h[seq.length - 1] = 'ok'; return h; })() }]));
        }
        frames.push(fr('Loop done: <code>print(a)</code> → <b>' + a + '</b> (F(' + n + ')). O(n) time, O(1) memory, zero temp variables in your code.', [cp(code, 4, 'sel'), vp({ a: a, b: b }, 'a', 'sel'), { type: 'bars', label: 'Fibonacci numbers produced', values: seq.slice() }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Swap list items in one line', html: `<p>Works for list positions too — useful in reversing and sorting algorithms.</p>`, code: { lang: 'python', run: true, code: `a = [1, 2, 3, 4, 5]
i, j = 0, len(a) - 1
while i < j:
    a[i], a[j] = a[j], a[i]
    i, j = i + 1, j - 1
print(a)   # [5, 4, 3, 2, 1]` } },
      { title: 'Parsing records', html: `<p>Split a line and unpack straight into names; a star absorbs optional fields.</p>`, code: { lang: 'python', run: true, code: `lines = ['asha,31,pune', 'ben,25,delhi,admin,beta']
for line in lines:
    name, age, city, *flags = line.split(',')
    print(name, int(age), city, flags)` } },
      { title: 'Transpose and unzip with *', html: `<p><code>zip(*rows)</code> spreads each row into a separate argument; combined with unpacking you split columns into names.</p>`, code: { lang: 'python', run: true, code: `rows = [('asha', 91), ('ben', 78), ('cy', 85)]
names, scores = zip(*rows)
print(names)
print(scores, sum(scores) / len(scores))` } },
      { title: 'A tricky order-of-assignment puzzle', html: `<p>The right side is evaluated first, but targets on the left are assigned <b>left to right</b>. When a later target depends on an earlier one, results surprise people.</p>`, code: { lang: 'python', run: true, code: `nums = [1, 0]
i = 0
i, nums[i] = 1, 9      # i becomes 1 first, THEN nums[1] = 9
print(i, nums)         # 1 [1, 9]` } }
    ],
    deepDive: `<p>🟣 <b>Bytecode view.</b> <code>a, b = b, a</code> compiles to "load b, load a, swap, store a, store b" — CPython optimises small tuple swaps into stack operations (<code>SWAP</code>) without allocating a tuple at all. For longer right sides, it builds a tuple then runs <code>UNPACK_SEQUENCE</code>; starred targets use <code>UNPACK_EX</code>, which always builds a <b>list</b> for the starred part.</p>
<p><b>Assignment order:</b> the right side is fully evaluated first; then targets are assigned <b>left to right</b>. That is why <code>i, nums[i] = 1, 9</code> writes to <code>nums[1]</code>, and why <code>nums[i], i = 9, 1</code> writes to <code>nums[0]</code>. In linked-list reversal, <code>prev, cur.next, cur = cur, prev, cur.next</code> only works with targets in the right order — a classic interview trap.</p>
<p><b>Unpacking consumes iterators.</b> <code>a, b = some_generator()</code> pulls items with <code>next()</code> and then checks there is nothing left (it must pull one extra item to raise "too many values"). Unpacking a dict gives its <b>keys</b>: <code>x, y = {'p': 1, 'q': 2}</code> → x = 'p'.</p>
<p><b>Generalisations (PEP 448, 3.5+):</b> multiple stars in calls and literals (<code>f(*a, *b, **c, **d)</code>, <code>[*a, *b]</code>, <code>{**d1, **d2}</code>). Duplicate keyword names across <code>**</code> spreads in a <b>call</b> raise TypeError, while in a <b>dict literal</b> the later one silently wins.</p>
<p><b>Pattern matching</b> (<code>match</code>, 3.10+) extends unpacking with type checks: <code>case [first, *rest]:</code> or <code>case {'type': 'click', 'pos': (x, y)}:</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI tools love dense unpacking one-liners. They are great when clear (<code>lo, hi = hi, lo</code>), but multi-target assignments that depend on each other (linked-list pointer juggling) are exactly where generated code quietly breaks.</p>
<p><b>Use AI as a partner:</b> <code>"Expand this tuple assignment into explicit steps with a temporary tuple and tell me the order"</code>; <code>"Write a test where the starred part is empty"</code>.</p>
<p><b>Where AI goes wrong:</b> assuming the starred variable is a tuple (it is a list), unpacking a dict expecting values, mixing up <code>*</code> and <code>**</code> at call sites, and reordering targets in <code>a, b.next, b = …</code> style statements.</p>
<p><b>What you must still own:</b> the two-phase rule (evaluate right side, then assign left to right), the ValueError messages, and when a plain two-line version is simply clearer for your teammates.</p>`,
    problems: [{
      title: 'Nth Fibonacci Number with Tuple Assignment', level: 'Easy', tags: ['unpacking', 'loops', 'dp'], companies: ['Amazon', 'Adobe', 'TCS'],
      statement: `<p>Return F(n) where F(0) = 0, F(1) = 1 and F(n) = F(n−1) + F(n−2). Your solution must handle n up to 10<sup>5</sup> quickly (Python ints never overflow).</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>`,
      example: `<p>F(0..10) = ${H.arr([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55], { hl: { 10: 'g' } })} so <b>fib(10) = 55</b>: each value is the sum of the two before it.</p>`,
      brute: { why: `<p>Direct recursion recomputes the same subproblems again and again: fib(n) calls fib(n−1) and fib(n−2), which both call fib(n−3)… about φ<sup>n</sup> ≈ 1.6<sup>n</sup> calls. fib(40) already takes seconds; fib(10<sup>5</sup>) also hits the recursion limit (1000).</p>`, code: `def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)` },
      mcq: { q: 'Why does a, b = b, a + b work while a = b; b = a + b does not?', options: ['The right side is fully evaluated using old values before any assignment', 'Tuples are faster', 'Python assigns right to left'], answer: 0, explain: 'Phase 1 builds (b, a + b) from the old a and b; phase 2 assigns. The two-line version uses the new a in the second line.' },
      hints: [`<p>Hint 1: You only ever need the last two values — keep them in two variables.</p>`, `<p>Hint 2: Each step, the pair (a, b) becomes (b, a + b). Tuple assignment updates both at once using the old values.</p>`, `<p>Hint 3: Start with a, b = 0, 1, loop n times, return a. Check n = 0 → 0 and n = 1 → 1 without special cases.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [['[fib(i) for i in range(11)]'], [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]],
          [['fib(100)'], '354224848179261915075'],
          [['fib(90)'], '2880067194370816120'],
          [['fib(1)'], 1],
          [['fib(2)'], 1],
          [['fib(0)'], 0],
          [['fib(78)'], 8944394323791464],
          [['fib(79)'], '14472334024676221'],
          [['fib(100000).bit_length()'], 69424],
          [['fib(100000) % 10**18'], '895374653428746875'],
          [['fib(100000) == fib(99999) + fib(99998)'], true]
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
        approach: `<p>Iterate n times, sliding the pair (a, b) forward with one tuple assignment. After k steps, a = F(k). Constant memory, no recursion.</p>`,
        code: { lang: 'python', run: true, code: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b      # right side uses OLD a and b
    return a

print([fib(i) for i in range(11)])
print(fib(100))
# Big ints never overflow. (str() of ints over 4300 digits is blocked by
# default since 3.11 as a DoS guard, so measure bits instead.)
print(fib(100_000).bit_length(), 'bits')` },
        dry: { head: ['step', 'old (a, b)', 'right side (b, a+b)', 'new (a, b)'], rows: [['1', '(0, 1)', '(1, 1)', '(1, 1)'], ['2', '(1, 1)', '(1, 2)', '(1, 2)'], ['3', '(1, 2)', '(2, 3)', '(2, 3)'], ['4', '(2, 3)', '(3, 5)', '(3, 5)'], ['5', '(3, 5)', '(5, 8)', '(5, 8) → fib(5) = 5']] },
        complexity: `<p>O(n) additions (each on growing big ints, so truly ~O(n²) bit operations for huge n), O(1) variables.</p>`,
        followUps: ['Memoised recursion with <code>functools.lru_cache</code> (module py06).', 'O(log n) with matrix exponentiation or fast doubling.', 'Return F(n) mod 10<sup>9</sup>+7 for n up to 10<sup>18</sup>.']
      }
    }]
  });

  /* ================= PRACTICE (Easy → Medium → Hard) ================= */
  practice.push({
    title: 'Count Vowels, Consonants and Others', level: 'Easy', tags: ['loops', 'strings', 'membership'], companies: ['Infosys', 'Accenture'],
    statement: `<p>Given a string <code>s</code>, return a tuple <code>(vowels, consonants, others)</code>: the number of vowel letters (a, e, i, o, u, either case), consonant letters, and every other character (digits, spaces, punctuation).</p>`,
    constraints: `0 ≤ len(s) ≤ 10<sup>6</sup>; ASCII text`,
    example: `<p><code>"Hello, World 42!"</code> → <b>(3, 7, 6)</b>: vowels ${H.c('g', 'e o o')}; consonants ${H.c('b', 'H l l W r l d')}; others ${H.c('m', '", " " " "4" "2" "!"')} (comma, two spaces, 4, 2, !).</p>`,
    brute: { why: `<p>Writing <code>if ch == 'a' or ch == 'e' or …</code> with ten comparisons per character (upper and lower case) is slow to read and easy to get wrong. Checking membership in a <b>list</b> of vowels is O(10) per char — fine, but a set or string with <code>in</code> plus <code>lower()</code> is cleaner.</p>`, code: `def classify(s):
    v = c = o = 0
    for ch in s:
        if ch == 'a' or ch == 'e' or ch == 'i' or ch == 'o' or ch == 'u' or ch == 'A' or ch == 'E' or ch == 'I' or ch == 'O' or ch == 'U':
            v += 1
        elif ('a' <= ch <= 'z') or ('A' <= ch <= 'Z'):
            c += 1
        else:
            o += 1
    return v, c, o` },
    mcq: { q: 'Which check correctly identifies an ASCII letter?', options: ['ch.isalpha() and ch.isascii()', 'ch in "aeiou"', 'ch != " "'], answer: 0, explain: 'isalpha alone also accepts letters like é; combined with isascii it matches exactly A–Z/a–z.' },
    hints: [`<p>Hint 1: Lower-case each character once, then a vowel test is just <code>ch in 'aeiou'</code>.</p>`, `<p>Hint 2: Order the if/elif ladder: vowel first, then "is a letter" (consonant), else other.</p>`, `<p>Hint 3: Use <code>ch.isalpha()</code> (plus <code>isascii()</code> to ignore accented letters). Return the three counters as a tuple.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['classify(\'Hello, World 42!\')'], [3, 7, 6]],
        [['classify(\'\')'], [0, 0, 0]],
        [['classify(\'AEIOUaeiou\')'], [10, 0, 0]],
        [['classify(\'bcdfg\')'], [0, 5, 0]],
        [['classify(\'1234 !?\')'], [0, 0, 7]],
        [['classify(\'xyz\')'], [0, 3, 0]],
        [['classify(\'Y y\')'], [0, 2, 1]],
        [['classify(\'The quick brown fox\')'], [5, 11, 3]],
        [['classify(\'ab \' * 333333)'], [333333, 333333, 333333]]
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
      approach: `<p>One pass. For each character: vowel? → v; else ASCII letter? → c; else → o. A set of vowels gives O(1) membership.</p>`,
      code: { lang: 'python', run: true, code: `VOWELS = set('aeiou')

def classify(s):
    v = c = o = 0
    for ch in s:
        low = ch.lower()
        if low in VOWELS:
            v += 1
        elif ch.isascii() and ch.isalpha():
            c += 1
        else:
            o += 1
    return v, c, o

print(classify('Hello, World 42!'))   # (3, 7, 6)
print(classify(''))                   # (0, 0, 0)` },
      dry: { head: ['ch', 'lower', 'vowel?', 'letter?', '(v, c, o)'], rows: [['H', 'h', 'no', 'yes', '(0, 1, 0)'], ['e', 'e', 'yes', '—', '(1, 1, 0)'], ['l', 'l', 'no', 'yes', '(1, 2, 0)'], ['l', 'l', 'no', 'yes', '(1, 3, 0)'], ['o', 'o', 'yes', '—', '(2, 3, 0)'], [',', ',', 'no', 'no', '(2, 3, 1)'], ['… rest', '', '', '', '(3, 7, 6)']] },
      complexity: `<p>Time O(n), space O(1).</p>`,
      followUps: ['Return a dict with counts per vowel.', 'Do it with sum() and generator expressions in three lines.']
    }
  });

  practice.push({
    title: 'Second Largest Distinct Value', level: 'Easy', tags: ['loops', 'sets', 'tracking'], companies: ['Amazon', 'Flipkart'],
    statement: `<p>Return the second largest <b>distinct</b> value in a list of integers, or <code>None</code> if it does not exist (fewer than two distinct values).</p>`,
    constraints: `0 ≤ len(nums) ≤ 10<sup>6</sup>`,
    example: `<p>[4, 9, 9, 2, 7] → <b>7</b> (largest is ${H.c('g', '9')}, the next distinct value is ${H.c('b', '7')}). [5, 5] → <b>None</b>.</p>`,
    brute: { why: `<p><code>sorted(set(nums))[-2]</code> is short but O(n log n) and crashes with IndexError when fewer than two distinct values exist. The waste: sorting everything just to find two numbers.</p>`, code: `def second_largest(nums):
    distinct = sorted(set(nums))
    return distinct[-2] if len(distinct) >= 2 else None` },
    mcq: { q: 'Current (first, second) = (9, 7). Next value is 9. What happens?', options: ['Nothing — it equals first, not a new distinct value', 'second becomes 9', 'first becomes 9 and second 9'], answer: 0, explain: 'Duplicates of the maximum must be skipped, or second would wrongly become 9.' },
    hints: [`<p>Hint 1: Track two variables, <code>first</code> and <code>second</code>, starting at <code>None</code>.</p>`, `<p>Hint 2: If x &gt; first: shift first into second, then first = x. Elif x is strictly between second and first: second = x.</p>`, `<p>Hint 3: Skip x == first (duplicate max). Handle None comparisons carefully (or start with float('-inf') and convert back).</p>`],
    tests: {
      sig: 'int[] -> int',
      fn: 'secondLargest',
      cases: [
        [[[4, 9, 9, 2, 7]], 7],
        [[[5, 5]], null],
        [[[]], null],
        [[[-1, -3]], -3],
        [[[1]], null],
        [[[2, 1]], 1],
        [[[9, 9, 8, 8]], 8],
        [[[1, 2, 3, 4, 5]], 4],
        [[[5, 4, 3]], 4],
        [[[0, 0, -1]], -1],
        [[[-5, -5, -5]], null],
        [[[3, 1, 1]], 1],
        [[[1, 3, 3, 3, 2]], 2],
        [[{ $range: [0, 1000000, 1] }], 999998],
        [[{ $rep: 7, n: 1000000 }], null],
        [[{ $concat: [{ $rep: 5, n: 500000 }, { $rep: 4, n: 499999 }, [-1000000000]] }], 4]
      ]
    },
    solution: {
      approach: `<p>Single pass keeping the top two <b>distinct</b> values; tuple assignment shifts them in one line.</p>`,
      code: { lang: 'python', run: true, code: `def second_largest(nums):
    first = second = None
    for x in nums:
        if first is None or x > first:
            first, second = x, first          # shift down
        elif x != first and (second is None or x > second):
            second = x
    return second

print(second_largest([4, 9, 9, 2, 7]))   # 7
print(second_largest([5, 5]))            # None
print(second_largest([]))                # None
print(second_largest([-1, -3]))          # -3` },
      dry: { head: ['x', 'first', 'second'], rows: [['4', '4', 'None'], ['9', '9', '4'], ['9', '9 (dup, skip)', '4'], ['2', '9', '4'], ['7', '9', '<span class="c-g">7</span>']] },
      complexity: `<p>Time O(n), space O(1).</p>`,
      followUps: ['Generalise to k-th largest distinct → heapq.nlargest on a set, or a size-k heap.']
    }
  });

  practice.push({
    title: 'Reverse the Words in a Sentence', level: 'Easy', tags: ['strings', 'slicing', 'split/join'], companies: ['Microsoft', 'Goldman Sachs'],
    statement: `<p>Given a sentence <code>s</code>, return a string with the words in reverse order, separated by single spaces. Leading, trailing and repeated spaces must disappear.</p>`,
    constraints: `0 ≤ len(s) ≤ 10<sup>5</sup>`,
    example: `<p><code>"  the sky   is blue "</code> → <b>"blue is sky the"</b>. ${H.c('m', 'Extra spaces vanish because split() with no argument splits on runs of whitespace.')}</p>`,
    brute: { why: `<p>Building the result with <code>result = word + ' ' + result</code> in a loop copies the growing string every time: O(n²) characters for long inputs. The waste: repeated string concatenation of immutable strings.</p>`, code: `def reverse_words(s):
    result = ''
    for word in s.split():
        result = word + ' ' + result     # copies the whole string each time
    return result.strip()` },
    mcq: { q: "What does '  a  b '.split() return?", options: ["['a', 'b']", "['', '', 'a', '', 'b', '']", "['a  b']"], answer: 0, explain: 'split() with no argument splits on any whitespace run and drops empty strings. split(" ") would keep empties.' },
    hints: [`<p>Hint 1: <code>s.split()</code> (no argument) already gives clean words.</p>`, `<p>Hint 2: Reverse the list with slicing <code>[::-1]</code> or <code>reversed()</code>.</p>`, `<p>Hint 3: <code>' '.join(...)</code> builds the final string in one O(n) pass — never concatenate in a loop.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 'reverseWords',
      cases: [
        [['  the sky   is blue '], 'blue is sky the'],
        [[''], ''],
        [['one'], 'one'],
        [['   '], ''],
        [['a b'], 'b a'],
        [['a  b   c '], 'c b a'],
        [['hello world'], 'world hello'],
        [[' x'], 'x'],
        [[{ $rep: 'ab ', n: 33333 }], { $concat: [{ $rep: 'ab ', n: 33332 }, 'ab'] }]
      ]
    },
    solution: {
      approach: `<p>Split into words, reverse with a slice, join with single spaces. Each step is linear.</p>`,
      code: { lang: 'python', run: true, code: `def reverse_words(s):
    return ' '.join(s.split()[::-1])

print(repr(reverse_words('  the sky   is blue ')))   # 'blue is sky the'
print(repr(reverse_words('')))                       # ''
print(repr(reverse_words('one')))` },
      dry: { head: ['step', 'value'], rows: [['s.split()', "['the', 'sky', 'is', 'blue']"], ['[::-1]', "['blue', 'is', 'sky', 'the']"], ["' '.join", "'blue is sky the'"]] },
      complexity: `<p>Time O(n), space O(n).</p>`,
      followUps: ['Reverse the characters of each word but keep word order.', 'Do it in place on a list of characters (reverse all, then each word).']
    }
  });

  practice.push({
    title: 'Find the Missing Number', level: 'Easy', tags: ['math', 'sets', 'loops'], companies: ['Amazon', 'Apple', 'Cisco'],
    statement: `<p>A list contains <code>n</code> distinct numbers taken from <code>0, 1, …, n</code> — exactly one number in that range is missing. Return it.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>6</sup>`,
    example: `<p>[3, 0, 1] (n = 3, range 0..3) → <b>2</b>. Expected sum 0+1+2+3 = 6, actual sum 4, so ${H.c('g', '6 − 4 = 2')}.</p>`,
    brute: { why: `<p>For each candidate k in 0..n, scan the list with <code>k in nums</code>: O(n) per check → O(n²) ≈ 10<sup>12</sup> for n = 10<sup>6</sup>. The waste: re-scanning a list for membership.</p>`, code: `def missing(nums):
    for k in range(len(nums) + 1):
        if k not in nums:          # O(n) list scan each time
            return k` },
    mcq: { q: 'Sum of 0..n equals…', options: ['n·(n+1)/2', 'n²', '(n−1)·n/2 + 1'], answer: 0, explain: 'Gauss: pair the ends (0+n, 1+(n−1), …).' },
    hints: [`<p>Hint 1: You know what the full range should add up to.</p>`, `<p>Hint 2: <code>n * (n + 1) // 2 - sum(nums)</code> — use <code>//</code> to stay an int.</p>`, `<p>Hint 3: Alternatives: a set difference <code>set(range(n+1)) - set(nums)</code> (O(n) memory) or XOR of all indexes and values.</p>`],
    tests: {
      sig: 'int[] -> int',
      fn: 'missing', also: { python: ['missing_set'] },
      cases: [
        [[[3, 0, 1]], 2],
        [[[9, 6, 4, 2, 3, 5, 7, 0, 1]], 8],
        [[[0]], 1],
        [[[1]], 0],
        [[[0, 1]], 2],
        [[[1, 2]], 0],
        [[[2, 0]], 1],
        [[[0, 2, 3]], 1],
        [[{ $concat: [{ $range: [0, 500000, 1] }, { $range: [500001, 1000001, 1] }] }], 500000],
        [[{ $range: [1000000, 0, -1] }], 0]
      ]
    },
    solution: {
      approach: `<p>Expected total minus actual total. Python ints never overflow, so no worry for big n.</p>`,
      code: { lang: 'python', run: true, code: `def missing(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)

def missing_set(nums):
    # same answer via set difference
    (k,) = set(range(len(nums) + 1)) - set(nums)   # unpack the single item
    return k

print(missing([3, 0, 1]), missing_set([3, 0, 1]))             # 2 2
print(missing([9, 6, 4, 2, 3, 5, 7, 0, 1]))                   # 8
print(missing([0]))                                           # 1` },
      dry: { head: ['nums', 'n', 'expected n(n+1)/2', 'sum', 'answer'], rows: [['[3, 0, 1]', '3', '6', '4', '2'], ['[0]', '1', '1', '0', '1']] },
      complexity: `<p>Time O(n), space O(1) (the set version uses O(n)).</p>`,
      followUps: ['Two numbers missing → use sum and sum of squares, or a set.', 'Find the duplicate and the missing number together.']
    }
  });

  practice.push({
    title: 'First Non-Repeating Character', level: 'Medium', tags: ['dict', 'counting', 'enumerate'], companies: ['Amazon', 'Bloomberg', 'Goldman Sachs'],
    statement: `<p>Return the index of the first character in <code>s</code> that appears exactly once, or <code>-1</code> if there is none.</p>`,
    constraints: `1 ≤ len(s) ≤ 10<sup>5</sup>; lowercase letters`,
    example: `<p><code>"leetcode"</code> → <b>0</b> (${H.c('g', 'l')} appears once). <code>"loveleetcode"</code> → <b>2</b> (${H.c('g', 'v')}). <code>"aabb"</code> → <b>-1</b>.</p>`,
    brute: { why: `<p>For every index, count that character with <code>s.count(ch)</code>, which scans the whole string: O(n²) — 10<sup>10</sup> steps for n = 10<sup>5</sup>. The waste: counting the same letters again and again.</p>`, code: `def first_unique(s):
    for i, ch in enumerate(s):
        if s.count(ch) == 1:        # O(n) scan inside an O(n) loop
            return i
    return -1` },
    mcq: { q: 'Why do we need a second pass over s (not over the dict)?', options: ['To respect the original order of characters in s', 'Dicts cannot be iterated', 'To recount characters'], answer: 0, explain: 'The answer is defined by position in s. (Iterating the dict in insertion order also works, but you need the index — scanning s with enumerate gives it.)' },
    hints: [`<p>Hint 1: Two passes: first count every character, then find the first with count 1.</p>`, `<p>Hint 2: Counting: <code>counts[ch] = counts.get(ch, 0) + 1</code>.</p>`, `<p>Hint 3: Second pass with <code>enumerate(s)</code>; return i at the first ch with counts[ch] == 1, else -1.</p>`],
    tests: {
      sig: 'string -> int',
      fn: 'firstUnique',
      cases: [
        [['leetcode'], 0],
        [['loveleetcode'], 2],
        [['aabb'], -1],
        [['a'], 0],
        [['aa'], -1],
        [['abcabcd'], 6],
        [['aadadaad'], -1],
        [['abab'], -1],
        [['zxyzx'], 2],
        [[{ $concat: [{ $rep: 'a', n: 50000 }, 'b', { $rep: 'a', n: 49999 }] }], 50000],
        [[{ $rep: 'zz', n: 50000 }], -1]
      ]
    },
    solution: {
      approach: `<p>Count with a dict in pass 1 (O(n)); scan again with enumerate in pass 2 and return the first index whose count is 1.</p>`,
      code: { lang: 'python', run: true, code: `def first_unique(s):
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    for i, ch in enumerate(s):
        if counts[ch] == 1:
            return i
    return -1

print(first_unique('leetcode'))       # 0
print(first_unique('loveleetcode'))   # 2
print(first_unique('aabb'))           # -1` },
      dry: { head: ['pass', 'state'], rows: [['1 (count) "loveleetcode"', "{'l': 2, 'o': 2, 'v': 1, 'e': 4, 't': 1, 'c': 1, 'd': 1}"], ['2: i=0 l', 'count 2 → skip'], ['2: i=1 o', 'count 2 → skip'], ['2: i=2 v', '<span class="c-g">count 1 → return 2</span>']] },
      complexity: `<p>Time O(n), space O(k) for k distinct characters (≤ 26 here → O(1)).</p>`,
      followUps: ['Streaming version: characters arrive one by one; report the first unique so far after each (dict + ordered structure).']
    }
  });

  practice.push({
    title: 'Group Anagrams', level: 'Medium', tags: ['dict', 'tuples as keys', 'sorting'], companies: ['Amazon', 'Uber', 'Meta'],
    statement: `<p>Given a list of lowercase words, group the anagrams together (words made of the same letters). Return a list of groups; groups appear in order of their first word, and words keep their input order inside a group.</p>`,
    constraints: `1 ≤ len(words) ≤ 10<sup>4</sup>; 0 ≤ len(word) ≤ 100`,
    example: `<p>["eat","tea","tan","ate","nat","bat"] → <b>[["eat","tea","ate"], ["tan","nat"], ["bat"]]</b>. Key for ${H.c('g', 'eat/tea/ate')} is "aet".</p>`,
    brute: { why: `<p>Compare every word with every existing group using <code>sorted(a) == sorted(b)</code>: O(n² · L log L). The waste: recomputing the "signature" of each word against every group instead of using it as a dictionary key.</p>`, code: `def group_anagrams(words):
    groups = []
    for w in words:
        for g in groups:
            if sorted(g[0]) == sorted(w):
                g.append(w)
                break
        else:
            groups.append([w])
    return groups` },
    mcq: { q: 'Which key works for a dict of anagram groups?', options: ['tuple(sorted(word)) or "".join(sorted(word))', 'sorted(word) (a list)', 'set(word)'], answer: 0, explain: 'Lists are unhashable; set(word) loses counts ("aab" vs "ab" collide).' },
    hints: [`<p>Hint 1: Anagrams share the same sorted letters — that is a perfect dictionary key.</p>`, `<p>Hint 2: The key must be hashable: <code>''.join(sorted(w))</code> or <code>tuple(sorted(w))</code>.</p>`, `<p>Hint 3: <code>groups.setdefault(key, []).append(w)</code>; dicts keep insertion order, so <code>list(groups.values())</code> is already in first-seen order.</p>`],
    tests: {
      sig: 'string[] -> string[][]',
      fn: 'groupAnagrams',
      cases: [
        [[['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]],
        [[['', '']], [['', '']]],
        [[['a']], [['a']]],
        [[['ab', 'ba', 'ab']], [['ab', 'ba', 'ab']]],
        [[['abc', 'def']], [['abc'], ['def']]],
        [
          [['listen', 'silent', 'enlist', 'google', 'gogole']],
          [['listen', 'silent', 'enlist'], ['google', 'gogole']]
        ],
        [[['b', 'a', 'b']], [['b', 'b'], ['a']]],
        [[['ab', 'a', 'ba', '']], [['ab', 'ba'], ['a'], ['']]],
        [[{ $rep: 'ab', n: 10000 }], [{ $rep: 'ab', n: 10000 }]]
      ]
    },
    solution: {
      approach: `<p>Map each word to a canonical signature (sorted letters) and bucket words by signature in a dict of lists.</p>`,
      code: { lang: 'python', run: true, code: `def group_anagrams(words):
    groups = {}
    for w in words:
        key = ''.join(sorted(w))            # canonical form
        groups.setdefault(key, []).append(w)
    return list(groups.values())

print(group_anagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']))
print(group_anagrams(['', '']))` },
      alt: [{ lang: 'python', code: `def group_anagrams(words):
    # O(L) signature: letter counts as a tuple (no sorting)
    groups = {}
    for w in words:
        counts = [0] * 26
        for ch in w:
            counts[ord(ch) - ord('a')] += 1
        groups.setdefault(tuple(counts), []).append(w)
    return list(groups.values())` }],
      dry: { head: ['word', 'key', 'groups'], rows: [['eat', 'aet', "{aet: [eat]}"], ['tea', 'aet', "{aet: [eat, tea]}"], ['tan', 'ant', "{aet: [...], ant: [tan]}"], ['ate', 'aet', "aet → [eat, tea, ate]"], ['nat', 'ant', 'ant → [tan, nat]'], ['bat', 'abt', 'abt → [bat]']] },
      complexity: `<p>Time O(n · L log L) with sorting (O(n · L) with the count-tuple key), space O(n · L).</p>`,
      followUps: ['Return only groups of size ≥ 2.', 'Words may contain uppercase/unicode — how does the key change?']
    }
  });

  practice.push({
    title: 'Longest Run of Equal Adjacent Values', level: 'Medium', tags: ['loops', 'zip', 'tracking'], companies: ['Google', 'Atlassian'],
    statement: `<p>Return a tuple <code>(value, length)</code> describing the longest block of consecutive equal values in a list. If several blocks tie, return the first. For an empty list return <code>(None, 0)</code>.</p>`,
    constraints: `0 ≤ len(a) ≤ 10<sup>6</sup>`,
    example: `${H.arr([1, 1, 2, 2, 2, 3, 2, 2], { hl: { 2: 'g', 3: 'g', 4: 'g' } })}<p>→ <b>(2, 3)</b>: the green block. The later [2, 2] is a separate, shorter block.</p>`,
    brute: { why: `<p>From each start index, walk right while values match: O(n²) in the worst case (all equal). The waste: the inner walk re-covers elements already measured.</p>`, code: `def longest_run(a):
    best = (None, 0)
    for i in range(len(a)):
        j = i
        while j < len(a) and a[j] == a[i]:
            j += 1
        if j - i > best[1]:
            best = (a[i], j - i)
    return best` },
    mcq: { q: 'When the current value differs from the previous one, the current run length becomes…', options: ['1', '0', 'unchanged'], answer: 0, explain: 'The new value starts a fresh block containing itself.' },
    hints: [`<p>Hint 1: Walk once; keep the current run length and the best seen so far.</p>`, `<p>Hint 2: <code>zip(a, a[1:])</code> gives (previous, current) pairs; equal → run += 1, else run = 1.</p>`, `<p>Hint 3: Update best only on strictly greater (keeps the first tie). Handle the empty list up front.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['longest_run([1, 1, 2, 2, 2, 3, 2, 2])'], [2, 3]],
        [['longest_run([])'], [null, 0]],
        [['longest_run([7])'], [7, 1]],
        [['longest_run(list(\'aabbb\'))'], ['b', 3]],
        [['longest_run([1, 1, 2, 2])'], [1, 2]],
        [['longest_run([5, 5, 5])'], [5, 3]],
        [['longest_run([1, 2, 3])'], [1, 1]],
        [['longest_run([3] * 10**6)'], [3, 1000000]],
        [['longest_run([0, 1] * 500000)'], [0, 1]],
        [['longest_run([1, 1, 2, 2, 2, 3, 3, 3])'], [2, 3]]
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
      approach: `<p>One pass over adjacent pairs, tracking the current run and the best run. Strict &gt; keeps the earliest tie.</p>`,
      code: { lang: 'python', run: true, code: `def longest_run(a):
    if not a:
        return (None, 0)
    best_val, best_len, run = a[0], 1, 1
    for prev, cur in zip(a, a[1:]):
        run = run + 1 if cur == prev else 1
        if run > best_len:
            best_val, best_len = cur, run
    return best_val, best_len

print(longest_run([1, 1, 2, 2, 2, 3, 2, 2]))   # (2, 3)
print(longest_run([]), longest_run([7]))      # (None, 0) (7, 1)
print(longest_run(list('aabbb')))             # ('b', 3)` },
      alt: [{ lang: 'python', code: `from itertools import groupby

def longest_run(a):
    best = (None, 0)
    for value, grp in groupby(a):     # groupby splits into equal-value blocks
        n = sum(1 for _ in grp)
        if n > best[1]:
            best = (value, n)
    return best` }],
      dry: { head: ['prev', 'cur', 'run', 'best'], rows: [['1', '1', '2', '(1, 2)'], ['1', '2', '1', '(1, 2)'], ['2', '2', '2', '(1, 2)'], ['2', '2', '3', '<span class="c-g">(2, 3)</span>'], ['2', '3', '1', '(2, 3)'], ['…', '…', '≤ 2', '(2, 3)']] },
      complexity: `<p>Time O(n). <code>a[1:]</code> copies the list (O(n) memory); use <code>itertools.pairwise</code> (3.10+) or indexes to avoid it.</p>`,
      followUps: ['Run-length encode a string: "aaabcc" → "a3b1c2".', 'Longest run allowing one change (sliding window).']
    }
  });

  practice.push({
    title: 'Rotate a Square Matrix 90° Clockwise', level: 'Medium', tags: ['lists', 'zip', 'slicing', 'unpacking'], companies: ['Microsoft', 'Amazon', 'Apple'],
    statement: `<p>Given an n × n matrix as a list of lists, return a new matrix rotated 90° clockwise. Then (follow-up) do it <b>in place</b>.</p>`,
    constraints: `1 ≤ n ≤ 500`,
    example: `<p>[[1, 2, 3], [4, 5, 6], [7, 8, 9]] → <b>[[7, 4, 1], [8, 5, 2], [9, 6, 3]]</b>. The first ${H.c('g', 'column read bottom-up (7, 4, 1)')} becomes the first row.</p>`,
    brute: { why: `<p>Index arithmetic <code>new[j][n-1-i] = m[i][j]</code> works in O(n²), but it needs a pre-built grid — and beginners often build it with <code>[[0]*n]*n</code>, which aliases rows and corrupts the result. The "waste" is bug surface, not big-O.</p>`, code: `def rotate(m):
    n = len(m)
    new = [[0] * n for _ in range(n)]     # NOT [[0]*n]*n
    for i in range(n):
        for j in range(n):
            new[j][n - 1 - i] = m[i][j]
    return new` },
    mcq: { q: 'Clockwise rotation equals…', options: ['reverse the rows, then transpose', 'transpose, then reverse every column', 'reverse every row only'], answer: 0, explain: 'zip(*m[::-1]) — reversing row order then transposing turns columns (read bottom-up) into rows.' },
    hints: [`<p>Hint 1: Look at where the first output row comes from: the first column, read from bottom to top.</p>`, `<p>Hint 2: <code>m[::-1]</code> reverses row order; <code>zip(*rows)</code> transposes.</p>`, `<p>Hint 3: zip yields tuples — convert each to a list. In place: transpose with swaps <code>m[i][j], m[j][i] = m[j][i], m[i][j]</code> for j &gt; i, then reverse each row.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [['m = [[1]]\nresult = rotate(m)'], [[1]]],
        [['m = [[1]]\nrotate_in_place(m)\nresult = m'], [[1]]],
        [['m = [[1, 2], [3, 4]]\nresult = rotate(m)'], [[3, 1], [4, 2]]],
        [['m = [[1, 2], [3, 4]]\nrotate_in_place(m)\nresult = m'], [[3, 1], [4, 2]]],
        [['m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\nresult = rotate(m)'], [[7, 4, 1], [8, 5, 2], [9, 6, 3]]],
        [
          [
            'm = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\n' +
              'rotate_in_place(m)\n' +
              'result = m'
          ],
          [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
        ],
        [
          [
            'm = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]\n' +
              'result = rotate(m)'
          ],
          [[13, 9, 5, 1], [14, 10, 6, 2], [15, 11, 7, 3], [16, 12, 8, 4]]
        ],
        [
          [
            'm = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]\n' +
              'rotate_in_place(m)\n' +
              'result = m'
          ],
          [[13, 9, 5, 1], [14, 10, 6, 2], [15, 11, 7, 3], [16, 12, 8, 4]]
        ],
        [['m = [[0, -1], [-2, 0]]\nresult = rotate(m)'], [[-2, 0], [0, -1]]],
        [['m = [[0, -1], [-2, 0]]\nrotate_in_place(m)\nresult = m'], [[-2, 0], [0, -1]]],
        [['m = [[1, 2], [3, 4]]\nr = rotate(m)\nresult = [m, r]'], [[[1, 2], [3, 4]], [[3, 1], [4, 2]]]],
        [
          [
            'm = [[i * 500 + j for j in range(500)] for i in range(500)]\n' +
              'r = rotate(m)\n' +
              'result = [r[i][j] for i, j in [(0, 0), (0, 499), (499, 0), (499, 499), (7, 11)]]'
          ],
          [249500, 0, 249999, 499, 244007]
        ],
        [
          [
            'm = [[i * 500 + j for j in range(500)] for i in range(500)]\n' +
              'rotate_in_place(m)\n' +
              'result = [m[i][j] for i, j in [(0, 0), (0, 499), (499, 0), (499, 499), (7, 11)]]'
          ],
          [249500, 0, 249999, 499, 244007]
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
      approach: `<p>Reverse the rows, then transpose with <code>zip(*…)</code>. For in-place: transpose via tuple swaps above the diagonal, then reverse each row with <code>row.reverse()</code>.</p>`,
      code: { lang: 'python', run: true, code: `def rotate(m):
    return [list(row) for row in zip(*m[::-1])]

def rotate_in_place(m):
    n = len(m)
    for i in range(n):
        for j in range(i + 1, n):            # above the diagonal only
            m[i][j], m[j][i] = m[j][i], m[i][j]
    for row in m:
        row.reverse()

grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
print(rotate(grid))
rotate_in_place(grid)
print(grid)` },
      dry: { head: ['step', 'matrix'], rows: [['start', '[[1,2,3],[4,5,6],[7,8,9]]'], ['m[::-1]', '[[7,8,9],[4,5,6],[1,2,3]]'], ['zip(*…)', '(7,4,1), (8,5,2), (9,6,3)'], ['list(row)', '[[7,4,1],[8,5,2],[9,6,3]]']] },
      complexity: `<p>Time O(n²); the zip version uses O(n²) extra space, the in-place version O(1).</p>`,
      followUps: ['Counter-clockwise: <code>list(zip(*m))[::-1]</code>.', 'Rotate a non-square m × n matrix (in-place is impossible — why?).']
    }
  });

  practice.push({
    title: 'Merge Overlapping Intervals', level: 'Medium', tags: ['sorting with key', 'unpacking', 'lists'], companies: ['Google', 'Meta', 'Bloomberg', 'Salesforce'],
    statement: `<p>Given a list of intervals <code>[start, end]</code> (inclusive), merge all overlapping intervals and return them sorted by start. Touching intervals like [1, 4] and [4, 5] count as overlapping.</p>`,
    constraints: `1 ≤ len(intervals) ≤ 10<sup>5</sup>; 0 ≤ start ≤ end ≤ 10<sup>9</sup>`,
    example: `<p>[[8, 10], [1, 3], [2, 6], [15, 18]] → <b>[[1, 6], [8, 10], [15, 18]]</b> since ${H.c('g', '[1, 3] and [2, 6] overlap')} → [1, 6].</p>`,
    brute: { why: `<p>Repeatedly scan all pairs, merge any overlapping pair, and restart until nothing changes: O(n²) per round, up to n rounds → O(n³). The waste: without sorting, any interval could overlap any other.</p>`, code: `def merge(intervals):
    res = [list(x) for x in intervals]
    changed = True
    while changed:
        changed = False
        for i in range(len(res)):
            for j in range(i + 1, len(res)):
                (a, b), (c, d) = res[i], res[j]
                if a <= d and c <= b:              # overlap
                    res[i] = [min(a, c), max(b, d)]
                    del res[j]
                    changed = True
                    break
            if changed:
                break
    return sorted(res)` },
    mcq: { q: 'After sorting by start, when does the next interval [s, e] overlap the last merged one [ls, le]?', options: ['s <= le', 'e <= le', 's >= ls'], answer: 0, explain: 'Sorted by start, so s ≥ ls is guaranteed; overlap only depends on s ≤ le.' },
    hints: [`<p>Hint 1: Sort by start: <code>sorted(intervals, key=lambda iv: iv[0])</code>. Now overlaps can only happen with the most recent merged interval.</p>`, `<p>Hint 2: Keep <code>merged</code>; for each [s, e] compare s with <code>merged[-1][1]</code>.</p>`, `<p>Hint 3: If overlapping, extend the end with <code>max</code> (the new one might be inside). Else append a copy. Unpack with <code>for s, e in …</code>.</p>`],
    tests: {
      sig: 'int[][] -> int[][]',
      fn: 'merge',
      cases: [
        [[[[8, 10], [1, 3], [2, 6], [15, 18]]], [[1, 6], [8, 10], [15, 18]]],
        [[[[1, 4], [4, 5]]], [[1, 5]]],
        [[[[1, 10], [2, 3]]], [[1, 10]]],
        [[[[5, 5]]], [[5, 5]]],
        [[[[1, 2], [3, 4]]], [[1, 2], [3, 4]]],
        [[[[2, 3], [1, 10]]], [[1, 10]]],
        [[[[0, 0], [0, 0]]], [[0, 0]]],
        [[[[1, 4], [0, 4]]], [[0, 4]]],
        [[[[1, 4], [2, 3], [5, 6], [0, 0]]], [[0, 0], [1, 4], [5, 6]]],
        [[[[0, 1000000000], [1000000000, 1000000000]]], [[0, 1000000000]]],
        [[[[1, 3], [2, 4], [3, 5], [10, 11]]], [[1, 5], [10, 11]]],
        [[{ $rep: [0, 1], n: 100000 }], [[0, 1]]]
      ]
    },
    solution: {
      approach: `<p>Sort by start, then sweep once, either extending the last merged interval or starting a new one.</p>`,
      code: { lang: 'python', run: true, code: `def merge(intervals):
    merged = []
    for s, e in sorted(intervals, key=lambda iv: iv[0]):
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)   # extend
        else:
            merged.append([s, e])                    # new block (a fresh list)
    return merged

print(merge([[8, 10], [1, 3], [2, 6], [15, 18]]))   # [[1, 6], [8, 10], [15, 18]]
print(merge([[1, 4], [4, 5]]))                       # [[1, 5]]
print(merge([[1, 10], [2, 3]]))                      # [[1, 10]]` },
      dry: { head: ['[s, e]', 'last merged', 'overlap?', 'merged'], rows: [['[1, 3]', '—', '—', '[[1, 3]]'], ['[2, 6]', '[1, 3]', '2 ≤ 3 yes', '[[1, 6]]'], ['[8, 10]', '[1, 6]', '8 ≤ 6 no', '[[1, 6], [8, 10]]'], ['[15, 18]', '[8, 10]', 'no', '[[1, 6], [8, 10], [15, 18]]']] },
      complexity: `<p>Time O(n log n) for sorting + O(n) sweep; space O(n).</p>`,
      followUps: ['Insert one new interval into an already merged list in O(n).', 'Minimum meeting rooms (count max overlap) with a sweep of +1/−1 events.']
    }
  });

  practice.push({
    title: 'Valid Sudoku Board', level: 'Medium', tags: ['sets', 'tuples as keys', 'nested loops'], companies: ['Amazon', 'Apple', 'Uber'],
    statement: `<p>A 9 × 9 board is given as a list of 9 strings; each character is a digit '1'–'9' or '.' for empty. Return <code>True</code> if no digit repeats in any row, any column, or any of the nine 3 × 3 boxes (the board does not have to be solvable).</p>`,
    constraints: `board is exactly 9 strings of length 9`,
    example: `<p>If row 0 is <code>"53..7...."</code> and row 1 is <code>"6..195..."</code>, no conflict there. Changing row 1 to <code>"5..195..."</code> would repeat ${H.c('r', '5')} in column 0 and in box (0, 0) → <b>False</b>.</p>`,
    brute: { why: `<p>Check each row, then each column, then each box in three separate loops, building fresh lists and testing <code>len(digits) == len(set(digits))</code>. It is O(81)·3 — fine in speed — but triple code means triple chances for index bugs. A single pass with keyed sets is cleaner.</p>`, code: `def is_valid(board):
    def ok(cells):
        digits = [c for c in cells if c != '.']
        return len(digits) == len(set(digits))
    rows = all(ok(row) for row in board)
    cols = all(ok([board[r][c] for r in range(9)]) for c in range(9))
    boxes = all(ok([board[r][c] for r in range(br, br + 3) for c in range(bc, bc + 3)])
                for br in range(0, 9, 3) for bc in range(0, 9, 3))
    return rows and cols and boxes` },
    mcq: { q: 'Which expression gives the box id (0–8) of cell (r, c)?', options: ['(r // 3) * 3 + c // 3', 'r * 3 + c', '(r + c) // 3'], answer: 0, explain: 'r // 3 and c // 3 give the box row and box column (0–2 each).' },
    hints: [`<p>Hint 1: One set of "seen" facts is enough if each fact records <i>where</i>: ('row', r, d), ('col', c, d), ('box', r//3, c//3, d).</p>`, `<p>Hint 2: Tuples are hashable, so they can live in a set. If a fact is already present → duplicate → False.</p>`, `<p>Hint 3: Loop with <code>for r, row in enumerate(board): for c, d in enumerate(row):</code>, skip '.', check and add three facts.</p>`],
    tests: {
      sig: 'string[] -> bool',
      fn: 'isValid',
      cases: [
        [
          [
            [
              '53..7....',
              '6..195...',
              '.98....6.',
              '8...6...3',
              '4..8.3..1',
              '7...2...6',
              '.6....28.',
              '...419..5',
              '....8..79'
            ]
          ],
          true
        ],
        [
          [
            [
              '53..7....',
              '5..195...',
              '.98....6.',
              '8...6...3',
              '4..8.3..1',
              '7...2...6',
              '.6....28.',
              '...419..5',
              '....8..79'
            ]
          ],
          false
        ],
        [
          [
            [
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........'
            ]
          ],
          true
        ],
        [
          [
            [
              '11.......',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........'
            ]
          ],
          false
        ],
        [
          [
            [
              '1........',
              '.........',
              '.........',
              '.........',
              '.........',
              '1........',
              '.........',
              '.........',
              '.........'
            ]
          ],
          false
        ],
        [
          [
            [
              '1........',
              '.1.......',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........'
            ]
          ],
          false
        ],
        [
          [
            [
              '534678912',
              '672195348',
              '198342567',
              '859761423',
              '426853791',
              '713924856',
              '961537284',
              '287419635',
              '345286179'
            ]
          ],
          true
        ],
        [
          [
            [
              '534678912',
              '672195348',
              '198342567',
              '859761423',
              '426853791',
              '713924856',
              '961537284',
              '287419635',
              '345286173'
            ]
          ],
          false
        ],
        [
          [
            [
              '934678912',
              '672195348',
              '198342567',
              '859761423',
              '426853791',
              '713924856',
              '961537284',
              '287419635',
              '345286179'
            ]
          ],
          false
        ],
        [
          [
            [
              '1........',
              '.........',
              '.........',
              '.........',
              '....1....',
              '.........',
              '.........',
              '.........',
              '.........'
            ]
          ],
          true
        ],
        [
          [
            [
              '1........',
              '.........',
              '.........',
              '....1....',
              '.........',
              '.........',
              '.........',
              '.........',
              '.........'
            ]
          ],
          true
        ]
      ]
    },
    solution: {
      approach: `<p>Single pass over the 81 cells; encode each constraint as a tuple and keep them in one set. A repeated tuple means a repeated digit in that row/column/box.</p>`,
      code: { lang: 'python', run: true, code: `def is_valid(board):
    seen = set()
    for r, row in enumerate(board):
        for c, d in enumerate(row):
            if d == '.':
                continue
            facts = (('row', r, d), ('col', c, d), ('box', r // 3, c // 3, d))
            for f in facts:
                if f in seen:
                    return False
                seen.add(f)
    return True

board = ['53..7....', '6..195...', '.98....6.', '8...6...3', '4..8.3..1',
         '7...2...6', '.6....28.', '...419..5', '....8..79']
print(is_valid(board))                 # True
bad = board[:]
bad[1] = '5..195...'                    # 5 repeats in column 0 and box (0, 0)
print(is_valid(bad))                   # False` },
      dry: { head: ['cell', 'd', 'new facts', 'result'], rows: [['(0, 0)', '5', "('row',0,'5'), ('col',0,'5'), ('box',0,0,'5')", 'added'], ['(0, 1)', '3', 'row 0 / col 1 / box (0,0) with 3', 'added'], ['(1, 0) in bad', '5', "('col',0,'5') already in seen", '<span class="c-r">False</span>']] },
      complexity: `<p>O(81) = O(1) for a fixed board; O(n²) for an n × n board. Space O(n²).</p>`,
      followUps: ['Use 27 separate sets (9 rows, 9 cols, 9 boxes) — compare readability.', 'Solve the Sudoku with backtracking (module on recursion).']
    }
  });

  practice.push({
    title: 'Longest Substring Without Repeating Characters', level: 'Hard', tags: ['dict', 'sliding window', 'enumerate'], companies: ['Amazon', 'Google', 'Microsoft', 'Bloomberg'],
    statement: `<p>Return the length of the longest substring of <code>s</code> with all characters distinct.</p>`,
    constraints: `0 ≤ len(s) ≤ 10<sup>5</sup>; any ASCII characters`,
    example: `<p><code>"abcabcbb"</code> → <b>3</b> (${H.c('g', '"abc"')}). <code>"pwwkew"</code> → <b>3</b> ("wke" — "pwke" is not contiguous). <code>"bbbb"</code> → 1.</p>`,
    brute: { why: `<p>Check every substring s[i:j] with <code>len(set(s[i:j])) == j - i</code>: O(n²) substrings × O(n) to build each set = O(n³), about 10<sup>15</sup> steps for n = 10<sup>5</sup>. The waste: when a window is valid, extending it by one only needs to check one new character.</p>`, code: `def longest(s):
    best = 0
    for i in range(len(s)):
        for j in range(i + 1, len(s) + 1):
            if len(set(s[i:j])) == j - i:
                best = max(best, j - i)
    return best` },
    mcq: { q: 'The window is s[left..i]. You see ch at i, and ch was last seen at index p ≥ left. New left = ?', options: ['p + 1', 'i', 'left + 1'], answer: 0, explain: 'Jump just past the previous occurrence; everything between p+1 and i is still distinct.' },
    hints: [`<p>Hint 1: Keep a window [left, i] that never contains a duplicate; grow i one step at a time.</p>`, `<p>Hint 2: A dict <code>last[ch] = index</code> tells you where ch was last seen.</p>`, `<p>Hint 3: If <code>last.get(ch, -1) &gt;= left</code>, move left to <code>last[ch] + 1</code> (never move left backwards). Then update last[ch] = i and best = max(best, i - left + 1).</p>`],
    tests: {
      sig: 'string -> int',
      fn: 'longest',
      cases: [
        [['abcabcbb'], 3],
        [['pwwkew'], 3],
        [['bbbb'], 1],
        [[''], 0],
        [['abba'], 2],
        [['a'], 1],
        [['dvdf'], 3],
        [[' '], 1],
        [['tmmzuxt'], 5],
        [['abcdefg'], 7],
        [['aab'], 2],
        [[{ $rep: 'ab', n: 50000 }], 2],
        [
          [
            {
              $rep: '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
              n: 1000
            }
          ],
          94
        ],
        [[{ $concat: [{ $rep: 'a', n: 50000 }, { $rep: 'b', n: 50000 }] }], 2]
      ]
    },
    solution: {
      approach: `<p>Sliding window with a dict of last positions. Each index enters the window once and <code>left</code> only moves forward, so the whole thing is linear.</p>`,
      code: { lang: 'python', run: true, code: `def longest(s):
    last = {}          # char -> last index seen
    left = best = 0
    for i, ch in enumerate(s):
        if last.get(ch, -1) >= left:     # ch is inside the current window
            left = last[ch] + 1          # jump past its previous copy
        last[ch] = i
        best = max(best, i - left + 1)
    return best

for t in ['abcabcbb', 'pwwkew', 'bbbb', '', 'abba']:
    print(repr(t), longest(t))` },
      dry: { head: ['i', 'ch', 'last[ch] before', 'left', 'window', 'best'], rows: [['0', 'a', '—', '0', 'a', '1'], ['1', 'b', '—', '0', 'ab', '2'], ['2', 'c', '—', '0', 'abc', '3'], ['3', 'a', '0 ≥ 0', '1', 'bca', '3'], ['4', 'b', '1 ≥ 1', '2', 'cab', '3'], ['5', 'c', '2 ≥ 2', '3', 'abc', '3'], ['6', 'b', '4 ≥ 3', '5', 'cb', '3'], ['7', 'b', '6 ≥ 5', '7', 'b', '3']] },
      complexity: `<p>Time O(n), space O(k) for k distinct characters.</p>`,
      followUps: ['Return the substring itself, not just the length.', 'At most k distinct characters (dict of counts + shrinking window).', 'Why does "abba" break a version that forgets the >= left check?']
    }
  });

  practice.push({
    title: 'Spiral Order of a Matrix', level: 'Hard', tags: ['loops', 'boundaries', 'lists'], companies: ['Microsoft', 'Amazon', 'Paytm'],
    statement: `<p>Return all elements of an m × n matrix in clockwise spiral order, starting at the top-left corner.</p>`,
    constraints: `1 ≤ m, n ≤ 100`,
    example: `<p>[[1, 2, 3], [4, 5, 6], [7, 8, 9]] → <b>[1, 2, 3, 6, 9, 8, 7, 4, 5]</b>: ${H.c('g', 'top row →')}, ${H.c('b', 'right column ↓')}, ${H.c('y', 'bottom row ←')}, ${H.c('p', 'left column ↑')}, then the centre.</p>`,
    brute: { why: `<p>Simulate walking with a direction vector and a <code>visited</code> grid, turning right whenever the next cell is outside or visited. It is O(m·n) too, but needs O(m·n) extra memory and fiddly turning logic. The boundary-shrinking approach is simpler to prove correct.</p>`, code: `def spiral(m):
    rows, cols = len(m), len(m[0])
    seen = [[False] * cols for _ in range(rows)]
    dr, dc = [0, 1, 0, -1], [1, 0, -1, 0]
    r = c = d = 0
    out = []
    for _ in range(rows * cols):
        out.append(m[r][c])
        seen[r][c] = True
        nr, nc = r + dr[d], c + dc[d]
        if not (0 <= nr < rows and 0 <= nc < cols) or seen[nr][nc]:
            d = (d + 1) % 4
            nr, nc = r + dr[d], c + dc[d]
        r, c = nr, nc
    return out` },
    mcq: { q: 'After walking the top row and the right column, why check top <= bottom before walking the bottom row?', options: ['A single remaining row would otherwise be printed twice', 'To avoid IndexError only', 'It is not needed'], answer: 0, explain: 'When top passes bottom, the "bottom row" is the same row already printed left-to-right.' },
    hints: [`<p>Hint 1: Keep four boundaries: top, bottom, left, right. Peel one layer at a time.</p>`, `<p>Hint 2: Each lap: top row (left→right), top += 1; right column (top→bottom), right −= 1; bottom row reversed, bottom −= 1; left column upward, left += 1.</p>`, `<p>Hint 3: Guard the bottom row with <code>if top &lt;= bottom</code> and the left column with <code>if left &lt;= right</code>; use <code>range(right, left - 1, -1)</code> for backwards walks.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]])'], [1, 2, 3, 6, 9, 8, 7, 4, 5]],
        [['spiral([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])'], [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]],
        [['spiral([[1], [2], [3]])'], [1, 2, 3]],
        [['spiral([[1, 2, 3]])'], [1, 2, 3]],
        [['spiral([[1]])'], [1]],
        [
          ['spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]])'],
          [1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8]
        ],
        [['spiral([[1, 2], [3, 4]])'], [1, 2, 4, 3]],
        [['spiral([[-1, 0], [0, -1]])'], [-1, 0, -1, 0]],
        [
          [
            '(lambda r: [len(r), r[:5], r[-3:], sum(i * v for i, v in enumerate(r))])(spiral([[i * 100 + j for j in range(100)] for i in range(100)]))'
          ],
          [10000, [0, 1, 2, 3, 4], [4950, 5050, 5049], 251204086650]
        ],
        [['spiral([[i] for i in range(100)]) == list(range(100))'], true]
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
      approach: `<p>Shrink four boundaries after each side of the current layer. The two guards prevent re-visiting a lone row or column in the middle.</p>`,
      code: { lang: 'python', run: true, code: `def spiral(m):
    out = []
    top, bottom, left, right = 0, len(m) - 1, 0, len(m[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):          # top row, left -> right
            out.append(m[top][c])
        top += 1
        for r in range(top, bottom + 1):          # right column, downwards
            out.append(m[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):  # bottom row, right -> left
                out.append(m[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):  # left column, upwards
                out.append(m[r][left])
            left += 1
    return out

print(spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
print(spiral([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]))
print(spiral([[1], [2], [3]]))` },
      dry: { head: ['lap step', 'cells', 'boundaries after (t, b, l, r)'], rows: [['top row', '1 2 3', '(1, 2, 0, 2)'], ['right col', '6 9', '(1, 2, 0, 1)'], ['bottom row', '8 7', '(1, 1, 0, 1)'], ['left col', '4', '(1, 1, 1, 1)'], ['lap 2 top row', '5', '(2, 1, 1, 0) → loop ends']] },
      complexity: `<p>Time O(m·n) — every cell once; extra space O(1) besides the output.</p>`,
      followUps: ['Generate an n × n spiral matrix filled with 1..n².', 'One-liner trick: <code>m[0] + spiral(list(zip(*m[1:]))[::-1])</code> — what does it cost?']
    }
  });

  practice.push({
    title: 'Top K Frequent Words with Tie-Breaking', level: 'Hard', tags: ['dict', 'sorting key', 'tuples'], companies: ['Amazon', 'Yelp', 'Uber'],
    statement: `<p>Given a list of words and an integer <code>k</code>, return the <code>k</code> most frequent words, ordered by frequency (highest first). Words with the same frequency are ordered alphabetically.</p>`,
    constraints: `1 ≤ len(words) ≤ 10<sup>5</sup>; 1 ≤ k ≤ number of distinct words`,
    example: `<p>["i","love","code","i","love","coding"], k = 2 → <b>["i", "love"]</b>: both appear twice; ${H.c('g', '"i" &lt; "love"')} alphabetically. With k = 3 the third is ${H.c('b', '"code"')} (ties at 1: code &lt; coding).</p>`,
    brute: { why: `<p>For every distinct word call <code>words.count(w)</code> (O(n) each → O(n·d)), then sort. With 10<sup>5</sup> words that is up to 10<sup>10</sup> operations. The waste: counting by rescanning instead of a single dictionary pass.</p>`, code: `def top_k(words, k):
    distinct = set(words)
    pairs = [(w, words.count(w)) for w in distinct]      # O(n) per word
    pairs.sort(key=lambda p: (-p[1], p[0]))
    return [w for w, _ in pairs[:k]]` },
    mcq: { q: 'Which sort key gives "count descending, then word ascending"?', options: ['key=lambda w: (-counts[w], w)', 'key=lambda w: (counts[w], w), reverse=True', 'key=counts.get'], answer: 0, explain: 'Negating the count flips its order while keeping the word ascending. reverse=True would also reverse the words.' },
    hints: [`<p>Hint 1: Count all words in one pass with a dict.</p>`, `<p>Hint 2: Sort the distinct words with a <b>tuple key</b>; tuples compare element by element.</p>`, `<p>Hint 3: <code>sorted(counts, key=lambda w: (-counts[w], w))[:k]</code>. For huge d with small k, use <code>heapq.nsmallest(k, counts, key=…)</code>.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['top_k([\'i\', \'love\', \'code\', \'i\', \'love\', \'coding\'], 2)'], ['i', 'love']],
        [['top_k([\'i\', \'love\', \'code\', \'i\', \'love\', \'coding\'], 3)'], ['i', 'love', 'code']],
        [
          ['top_k([\'i\', \'love\', \'code\', \'i\', \'love\', \'coding\'], 4)'],
          ['i', 'love', 'code', 'coding']
        ],
        [['top_k([\'a\'], 1)'], ['a']],
        [['top_k([\'c\', \'b\', \'a\'], 3)'], ['a', 'b', 'c']],
        [['top_k([\'b\', \'a\', \'b\', \'a\'], 2)'], ['a', 'b']],
        [
          [
            'top_k([\'the\', \'day\', \'is\', \'sunny\', \'the\', \'the\', \'the\', \'sunny\', \'is\', \'is\'], 4)'
          ],
          ['the', 'is', 'sunny', 'day']
        ],
        [['top_k([\'x\', \'y\'], 1)'], ['x']],
        [['top_k([\'x\'] * 50000 + [\'y\'] * 30000 + [\'z\'] * 20000, 2)'], ['x', 'y']],
        [['top_k([\'b\', \'a\'] * 50000, 1)'], ['a']],
        [['top_k_heap([\'i\', \'love\', \'code\', \'i\', \'love\', \'coding\'], 2)'], ['i', 'love']],
        [['top_k_heap([\'i\', \'love\', \'code\', \'i\', \'love\', \'coding\'], 3)'], ['i', 'love', 'code']],
        [
          ['top_k_heap([\'i\', \'love\', \'code\', \'i\', \'love\', \'coding\'], 4)'],
          ['i', 'love', 'code', 'coding']
        ],
        [['top_k_heap([\'a\'], 1)'], ['a']],
        [['top_k_heap([\'c\', \'b\', \'a\'], 3)'], ['a', 'b', 'c']],
        [['top_k_heap([\'b\', \'a\', \'b\', \'a\'], 2)'], ['a', 'b']],
        [
          [
            'top_k_heap([\'the\', \'day\', \'is\', \'sunny\', \'the\', \'the\', \'the\', \'sunny\', \'is\', \'is\'], 4)'
          ],
          ['the', 'is', 'sunny', 'day']
        ],
        [['top_k_heap([\'x\', \'y\'], 1)'], ['x']],
        [['top_k_heap([\'x\'] * 50000 + [\'y\'] * 30000 + [\'z\'] * 20000, 2)'], ['x', 'y']],
        [['top_k_heap([\'b\', \'a\'] * 50000, 1)'], ['a']]
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
      approach: `<p>Dict counting (O(n)), then sort the d distinct words with the tuple key (−count, word) and take the first k.</p>`,
      code: { lang: 'python', run: true, code: `import heapq

def top_k(words, k):
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    return sorted(counts, key=lambda w: (-counts[w], w))[:k]

def top_k_heap(words, k):
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    return heapq.nsmallest(k, counts, key=lambda w: (-counts[w], w))

ws = ['i', 'love', 'code', 'i', 'love', 'coding']
print(top_k(ws, 2), top_k(ws, 3))
print(top_k_heap(ws, 3))` },
      dry: { head: ['word', 'count', 'key (−count, word)', 'rank'], rows: [['i', '2', "(-2, 'i')", '1'], ['love', '2', "(-2, 'love')", '2'], ['code', '1', "(-1, 'code')", '3'], ['coding', '1', "(-1, 'coding')", '4']] },
      complexity: `<p>Time O(n + d log d) with sorting, O(n + d log k) with the heap; space O(d).</p>`,
      followUps: ['Stream of words that never ends → keep counts + a size-k heap, or Count-Min Sketch for approximate counts.', 'Why can a tuple key not negate a string? (Use reverse sorting tricks or a wrapper class.)']
    }
  });

  practice.push({
    title: 'Flatten Arbitrarily Nested Lists', level: 'Hard', tags: ['recursion', 'isinstance', 'lists', 'stack'], companies: ['Meta', 'LinkedIn', 'Airbnb'],
    statement: `<p>Given a list that may contain integers and other lists nested to any depth, return a flat list of all the integers in left-to-right order. Tuples should be treated like lists. Strings never appear.</p>`,
    constraints: `Total items ≤ 10<sup>5</sup>; nesting depth may exceed 1000 (so avoid deep recursion in the final version)`,
    example: `<p>[1, [2, [3, 4], 5], [], (6, [7])] → <b>[1, 2, 3, 4, 5, 6, 7]</b>. Empty lists contribute nothing.</p>`,
    brute: { why: `<p>Repeatedly loop "if any item is a list, splice it in" (e.g. rebuilding the whole list each pass) is O(n · depth). The natural recursive solution is O(n) but crashes with <code>RecursionError</code> past ~1000 levels because CPython limits recursion depth.</p>`, code: `def flatten(items):
    out = []
    for x in items:
        if isinstance(x, (list, tuple)):
            out.extend(flatten(x))        # recursion: fine until depth ~1000
        else:
            out.append(x)
    return out` },
    mcq: { q: 'Using an explicit stack, how do you keep left-to-right order when pushing a sub-list?', options: ['Push its items in reverse so the first item is popped first', 'Push them in normal order', 'Sort them first'], answer: 0, explain: 'A stack is LIFO; reversing on push restores the original order on pop.' },
    hints: [`<p>Hint 1: Recursion mirrors the structure: flatten each sub-list and extend.</p>`, `<p>Hint 2: To survive deep nesting, replace the call stack with your own list used as a stack.</p>`, `<p>Hint 3: Start with <code>stack = list(reversed(items))</code>; pop; if it is a list/tuple, push its items reversed; else append to output.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [['result = flatten([1, [2, [3, 4], 5], [], (6, [7])])'], [1, 2, 3, 4, 5, 6, 7]],
        [['result = flatten([])'], []],
        [['result = flatten([[]])'], []],
        [['result = flatten([[[[]]]])'], []],
        [['result = flatten([1])'], [1]],
        [['result = flatten([(1, (2,)), [3]])'], [1, 2, 3]],
        [['result = flatten([[1, 2], [3, [4, [5, [6]]]], 7])'], [1, 2, 3, 4, 5, 6, 7]],
        [['result = flatten([0, [-1, [-2]], 0])'], [0, -1, -2, 0]],
        [
          [
            'deep = [0]\n' +
              'for i in range(1, 5000):\n' +
              '    deep = [deep, i]\n' +
              'r = flatten(deep)\n' +
              'result = [len(r), r[:5], r[-1]]'
          ],
          [5000, [0, 1, 2, 3, 4], 4999]
        ],
        [
          [
            'deep = [0]\n' +
              'for i in range(1, 30000):\n' +
              '    deep = [deep, i]\n' +
              'r = flatten(deep)\n' +
              'result = r == list(range(30000))'
          ],
          true
        ],
        [['result = flatten([[i] for i in range(100000)]) == list(range(100000))'], true]
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
      approach: `<p>Iterative DFS with an explicit stack: pop an item; if it is a list or tuple, push its children in reverse order; otherwise append it. No recursion limit, O(n) total work.</p>`,
      code: { lang: 'python', run: true, code: `def flatten(items):
    out = []
    stack = list(reversed(items))
    while stack:
        x = stack.pop()
        if isinstance(x, (list, tuple)):
            stack.extend(reversed(x))     # reversed keeps left-to-right order
        else:
            out.append(x)
    return out

print(flatten([1, [2, [3, 4], 5], [], (6, [7])]))   # [1, 2, 3, 4, 5, 6, 7]

deep = [0]
for i in range(1, 5000):                 # 5000 levels: recursion would fail
    deep = [deep, i]
print(len(flatten(deep)), flatten(deep)[:5])` },
      alt: [{ lang: 'python', code: `def flatten_gen(items):
    # generator version (recursive): elegant, still limited by depth
    for x in items:
        if isinstance(x, (list, tuple)):
            yield from flatten_gen(x)
        else:
            yield x` }],
      dry: { head: ['pop', 'is list?', 'stack after (top at right)', 'out'], rows: [['1', 'no', '[(6,[7]), [], [2,[3,4],5]]', '[1]'], ['[2,[3,4],5]', 'yes', '[…, 5, [3,4], 2]', '[1]'], ['2', 'no', '[…, 5, [3,4]]', '[1, 2]'], ['[3,4]', 'yes', '[…, 5, 4, 3]', '[1, 2]'], ['3, 4, 5', 'no', '[(6,[7]), []]', '[1, 2, 3, 4, 5]'], ['[] then (6,[7])…', '', '[]', '[1, …, 7]']] },
      complexity: `<p>Time O(total items + total lists), space O(max stack size) ≤ O(n).</p>`,
      followUps: ['Also handle strings safely (do not iterate a str — it would recurse forever on 1-char strings).', 'Return the depth of each integer as well.']
    }
  });

  /* ================= QUIZ (many are "predict the output") ================= */
  quiz.push(
    { q: `Predict the output: <pre>print([] or 0 or 'x')</pre>`, options: [`x`, `[]`, `0`, `False`], answer: 0, explain: `<code>or</code> returns the first truthy operand: [] is falsy, 0 is falsy, 'x' is truthy → prints x.` },
    { q: `Predict the output: <pre>for i in range(3):
    pass
else:
    print('done', i)</pre>`, options: [`done 2`, `done 3`, `nothing — else only runs on break`, `NameError`], answer: 0, explain: `The loop finished without break, so the loop-else runs. The loop variable keeps its last value, 2.` },
    { q: `What is <code>list(range(10, 0, -3))</code>?`, options: [`[10, 7, 4, 1]`, `[10, 7, 4, 1, -2]`, `[10, 7, 4]`, `[]`], answer: 0, explain: `Start 10, step −3, stop 0 is excluded: 10, 7, 4, 1 (the next, −2, is past the stop).` },
    { q: `Predict the output: <pre>def f(x, acc=[]):
    acc.append(x)
    return acc
f(1)
print(f(2))</pre>`, options: [`[1, 2]`, `[2]`, `[1]`, `TypeError`], answer: 0, explain: `The default list is created once at def time and shared between calls.` },
    { q: `Predict the output: <pre>a = [1, 2, 3]
b = a
b += [4]
print(a)</pre>`, options: [`[1, 2, 3, 4]`, `[1, 2, 3]`, `[4]`, `TypeError`], answer: 0, explain: `b = a makes an alias; += on a list extends it in place, so a sees the change. (b = b + [4] would create a new list.)` },
    { q: `What is <code>type((5))</code> and <code>type((5,))</code>?`, options: [`int and tuple`, `tuple and tuple`, `int and int`, `tuple and list`], answer: 0, explain: `Parentheses alone just group; the trailing comma is what makes a tuple.` },
    { q: `Predict the output: <pre>s = 'python'
print(s[-3:], s[::-2])</pre>`, options: [`hon nhy`, `hon nohtyp`, `tho nhy`, `hon pto`], answer: 0, explain: `s[-3:] = last three 'hon'. s[::-2] starts at the last index 5 and steps −2: indexes 5, 3, 1 → n, h, y.` },
    { q: `Predict the output: <pre>d = {1: 'a', 1.0: 'b', True: 'c'}
print(d)</pre>`, options: [`{1: 'c'}`, `{1: 'a', 1.0: 'b', True: 'c'}`, `{True: 'c'}`, `TypeError`], answer: 0, explain: `1 == 1.0 == True and they hash equally, so they are the same key. The first key object (1) is kept; the value is overwritten twice, ending as 'c'.` },
    { q: `Predict the output: <pre>first, *rest = 'ab'
print(rest)</pre>`, options: [`['b']`, `('b',)`, `'b'`, `ValueError`], answer: 0, explain: `A starred target always becomes a list, even when unpacking a string.` },
    { q: `Predict the output: <pre>print(sorted([3, 1, 2]), [3, 1, 2].sort())</pre>`, options: [`[1, 2, 3] None`, `[1, 2, 3] [1, 2, 3]`, `None None`, `[3, 1, 2] None`], answer: 0, explain: `sorted() returns a new list; list.sort() sorts in place and returns None.` },
    { q: `What is <code>list(zip([1, 2, 3], 'ab'))</code>?`, options: [`[(1, 'a'), (2, 'b')]`, `[(1, 'a'), (2, 'b'), (3, None)]`, `ValueError`, `[(1, 2, 3), ('a', 'b')]`], answer: 0, explain: `zip stops at the shortest input. Only zip(..., strict=True) raises; zip_longest pads.` },
    { q: `Predict the output: <pre>nums = [2, 4, 6, 7]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)
print(nums)</pre>`, options: [`[4, 7]`, `[7]`, `[2, 4, 6, 7]`, `RuntimeError`], answer: 0, explain: `Removing 2 shifts 4 into index 0, which the loop has already passed; next it sees 6 (removed), then the list ends. Never mutate a list while iterating it.` },
    { q: `Given <code>def f(a, b=2, *, c=3)</code>, which call raises TypeError?`, options: [`f(1, 2, 3)`, `f(1, c=5)`, `f(a=1)`, `f(1, 2, c=0)`], answer: 0, explain: `c is keyword-only (after the bare *), so a third positional argument has nowhere to go.` },
    { q: `What does <code>print(1 &lt; 3 &gt; 2)</code> print?`, options: [`True`, `False`, `SyntaxError`, `1`], answer: 0, explain: `Chained comparison: (1 &lt; 3) and (3 &gt; 2) → True.` },
    { q: `What does <code>type({})</code> return, and how do you make an empty set?`, options: [`dict; set()`, `set; {}`, `dict; {,}`, `set; set[]`], answer: 0, explain: `Braces with nothing inside are an empty dict for historical reasons. Use set() for an empty set.` },
    { q: `Predict the output: <pre>i = 0
nums = [5, 5]
i, nums[i] = 1, 9
print(nums)</pre>`, options: [`[5, 9]`, `[9, 5]`, `[9, 9]`, `IndexError`], answer: 0, explain: `The right side (1, 9) is built first, then targets are assigned left to right: i = 1, then nums[1] = 9.` }
  );

  /* ================= INTERVIEW Q&A ================= */
  interview.push(
    { q: `What is the difference between a list and a tuple? When do you pick each?`, level: 'B', a: `<p>Both are ordered sequences that allow duplicates and any types. A <b>list</b> is mutable (append, remove, sort in place), so it suits collections that grow or change. A <b>tuple</b> is immutable, so it suits fixed records like <code>(x, y)</code>, function return values, and dictionary keys/set members (a tuple is hashable when all its items are). Tuples are slightly smaller and faster to create, and immutability communicates intent ("this will not change"). Note tuple immutability is shallow: a tuple can hold a list that is mutated.</p>`, followUps: ['Why can a tuple be a dict key but a list cannot?', 'What does <code>t = ([1], 2); t[0] += [3]</code> do?'] },
    { q: `Which values are falsy in Python, and what does <code>x or default</code> really return?`, level: 'B', a: `<p>Falsy: <code>False</code>, <code>None</code>, numeric zeros (0, 0.0, 0j, Decimal 0), and empty containers ('', [], (), {}, set(), range(0)). Everything else is truthy unless its class defines <code>__bool__</code> or <code>__len__</code> to say otherwise. <code>or</code> returns the <b>first truthy operand</b> (or the last operand if none is truthy) — it returns the object, not a bool. So <code>name or 'Guest'</code> is a quick default, but it also replaces legitimate falsy values like 0 or '' — use <code>x if x is not None else default</code> when those are valid.</p>`, followUps: ['What does <code>0 and 1/0</code> evaluate to?', 'Why does a NumPy array raise in an if statement?'] },
    { q: `Explain the mutable default argument problem and how to fix it.`, level: 'I', a: `<p>Default values are evaluated <b>once</b>, when the <code>def</code> statement executes, and stored on the function (<code>f.__defaults__</code>). If the default is a mutable object like a list or dict and the function mutates it, the change persists across calls: <code>def add(x, acc=[])</code> returns [1], then [1, 2], … The fix is a sentinel: <code>def add(x, acc=None): if acc is None: acc = []</code>. Occasionally the shared default is used deliberately as a cache, but <code>functools.lru_cache</code> is clearer. Linters (Ruff B006) flag this pattern.</p>`, followUps: ['Why is <code>if not acc: acc = []</code> subtly different from <code>if acc is None</code>?', 'Does the same issue apply to <code>stamp=datetime.now()</code>?'] },
    { q: `Is Python pass-by-value or pass-by-reference?`, level: 'I', a: `<p>Neither exactly — it is <b>pass-by-object-reference</b> (call by sharing). The parameter name is bound to the <b>same object</b> the caller passed. If the function <b>mutates</b> that object (append to a list, set a dict key), the caller sees the change. If the function <b>rebinds</b> the parameter (<code>lst = [0]</code>) only the local name changes; the caller's variable still points to the old object. Immutable objects (int, str, tuple) cannot be mutated, so they behave as if passed by value.</p>`, followUps: ['Write a function that clears a caller\'s list in place.', 'How would you avoid accidentally mutating an argument?'] },
    { q: `How does a <code>for</code> loop work under the hood?`, level: 'I', a: `<p><code>for x in obj</code> calls <code>iter(obj)</code> to get an iterator (via <code>__iter__</code>, or the old <code>__getitem__</code> protocol), then repeatedly calls <code>next()</code> on it, binding each result to x and running the body. When the iterator raises <code>StopIteration</code>, the loop ends quietly and the optional loop-<code>else</code> runs (unless a <code>break</code> happened). This uniform protocol is why the same loop syntax works for lists, strings, dicts (keys), files (lines), ranges and generators. It also explains why iterators are single-use.</p>`, followUps: ['Write the equivalent while loop with iter/next and try/except.', 'Why does iterating a zip object twice give nothing the second time?'] },
    { q: `What does <code>else</code> on a for/while loop do? Give a good use case.`, level: 'B', a: `<p>The loop's <code>else</code> block runs only when the loop ends <b>normally</b> — the iterable is exhausted (for) or the condition becomes false (while) — and is <b>skipped if the loop exits via break</b> (or return/exception). Think "no break". The classic use is search: <code>for d in range(2, isqrt(n)+1): if n % d == 0: break</code> / <code>else: return True</code> to report "prime" without a flag variable. Many teams avoid it because readers misread it, so a well-named helper function with return can be clearer.</p>`, followUps: ['Does a loop-else run if the loop body never executes?', 'Rewrite a search with any() instead.'] },
    { q: `Why are dict lookups O(1) on average, and are dicts ordered?`, level: 'I', a: `<p>A dict is a <b>hash table</b>: <code>hash(key)</code> picks a slot in an index array, so finding a key costs a hash plus (usually) one or two probes, independent of the dict's size. Collisions are resolved with open addressing (perturbed probing), and the table resizes at about 2/3 load to keep probe chains short. Worst case is O(n) when many keys collide. Since CPython 3.6 the layout is compact (index table + dense entries array), and since Python 3.7 <b>insertion order is guaranteed</b> by the language: iteration follows the order keys were first inserted (updating a value does not move it).</p>`, followUps: ['What breaks if a key\'s hash changes after insertion?', 'Why are string hashes randomized per process?'] },
    { q: `Why can't a list be a dictionary key or set member?`, level: 'I', a: `<p>Keys must be <b>hashable</b>: their hash must never change while they are in the table, and equal objects must have equal hashes. A list is mutable — if you appended to it after insertion, its hash (based on content) would change and the dict would look in the wrong slot, effectively losing the entry. So <code>list.__hash__</code> is None and <code>{[1]: 'x'}</code> raises <code>TypeError: unhashable type: 'list'</code>. Convert to a tuple (<code>tuple(lst)</code>) or a frozenset for unordered content.</p>`, followUps: ['Is <code>(1, [2])</code> hashable?', 'How do user-defined classes hash by default?'] },
    { q: `Explain slicing rules and the cost of slicing. How is it different from NumPy?`, level: 'I', a: `<p><code>seq[start:stop:step]</code> includes start, excludes stop, supports negative indexes (counted from the end) and clamps out-of-range bounds instead of raising. Defaults depend on the step's sign (for negative steps, start defaults to the last item and stop to "before index 0"). For built-in sequences a slice <b>copies</b> the selected references: O(k) time and memory, so slicing inside loops or recursion (<code>f(arr[1:])</code>) can silently add an O(n) factor. <b>NumPy</b> basic slices are <b>views</b> sharing memory with the original — mutating the slice mutates the array — which is the opposite of list behaviour.</p>`, followUps: ['What does <code>a[-0:]</code> return?', 'How would you slice an iterator lazily?'] },
    { q: `What is the difference between <code>is</code> and <code>==</code>?`, level: 'B', a: `<p><code>==</code> compares <b>values</b> by calling <code>__eq__</code>; <code>is</code> compares <b>identity</b> — whether both names point to the very same object (same <code>id()</code>). Two separately built lists <code>[1, 2] == [1, 2]</code> is True but <code>is</code> is False. Use <code>is</code> only for singletons such as <code>None</code> (PEP 8: <code>if x is None</code>) and sentinel objects. CPython caches small ints (−5…256) and interns some strings, so <code>is</code> may look like it works on small values and then fail on larger ones — a classic bug.</p>`, followUps: ['Why is <code>x == None</code> discouraged?', 'What does <code>id()</code> represent in CPython?'] },
    { q: `How does <code>a, b = b, a</code> work, and where can multiple assignment go wrong?`, level: 'I', a: `<p>Python first evaluates the <b>entire right-hand side</b> using the current values, producing (conceptually) a tuple <code>(b, a)</code>, and then assigns its items to the targets <b>left to right</b>. No temporary variable is needed. It goes wrong when a later target depends on an earlier one: <code>i, nums[i] = 1, 9</code> writes to nums[1] because i is rebound first. In linked-list reversal, <code>prev, cur, cur.next = cur, cur.next, prev</code> fails because cur changes before <code>cur.next</code> is assigned — order the targets carefully or use separate lines.</p>`, followUps: ['Write Fibonacci in O(1) memory with tuple assignment.', 'What bytecode does CPython emit for a two-name swap?'] },
    { q: `append vs extend, and why is <code>list.pop(0)</code> a performance trap?`, level: 'I', a: `<p><code>append(x)</code> adds x as <b>one</b> item (even if x is a list); <code>extend(iterable)</code> adds <b>each</b> item. A list is a dynamic array of pointers: operations at the end (append, pop()) are O(1) amortised, but inserting or removing at the front/middle shifts every following pointer, O(n). Using <code>pop(0)</code> as a queue in a loop over n items is therefore O(n²). Use <code>collections.deque</code>, whose <code>popleft()</code> and <code>appendleft()</code> are O(1).</p>`, followUps: ['Why is append amortised O(1) and not strictly O(1)?', 'When is a list still fine as a queue?'] },
    { q: `Explain <code>*args</code>, <code>**kwargs</code>, keyword-only and positional-only parameters. When would you use each?`, level: 'A', a: `<p><code>*args</code> collects extra positional arguments into a tuple; <code>**kwargs</code> collects extra keyword arguments into a dict — used for wrappers, decorators and flexible APIs. Parameters after a bare <code>*</code> (or after *args) are <b>keyword-only</b>: callers must name them, which is great for boolean flags and options (<code>sort(items, *, reverse=False)</code>). Parameters before <code>/</code> (3.8+) are <b>positional-only</b>: their names are not part of the public API, so you can rename them later, and they cannot clash with **kwargs. Full order: <code>def f(a, /, b, *args, c, **kwargs)</code>.</p>`, followUps: ['What happens with <code>f(**{"a": 1})</code> when a is positional-only?', 'How do you forward all arguments to another function?'] },
    { q: `How do you remove duplicates from a list while preserving the original order?`, level: 'B', a: `<p>Use the fact that dicts keep insertion order and keys are unique: <code>list(dict.fromkeys(items))</code> — O(n) and one line. Or loop with a <code>seen</code> set: append x to the result only if it is not yet in seen, then add it. Both require hashable items. <code>list(set(items))</code> also removes duplicates but <b>loses the order</b> (set order depends on hashes). For unhashable items (lists), fall back to an O(n²) membership check against the result list or convert items to tuples.</p>`, followUps: ['Remove duplicates in place from a sorted list with two pointers.', 'Keep the <i>last</i> occurrence instead of the first.'] }
  );

  /* Every visualizer must show at least 4 frames, even for tiny custom inputs. */
  topics.forEach(function (t) {
    [].concat(t.viz).forEach(function (v) {
      var gen = v.gen;
      v.gen = function (inp) {
        var f = gen(inp);
        var tips = ['Recap: try a different input above to see another path through the code.', 'Tip: predict the next state yourself before pressing Next — that is how interview "predict the output" rounds feel.', 'Edge cases (empty input, one item, negatives) are where most bugs live — try them here.'];
        var k = 0;
        while (f.length < 4) { f.push({ narr: tips[k++ % tips.length], parts: f[f.length - 1].parts }); }
        return f;
      };
    });
  });

  registerModule({
    id: 'py02',
    title: 'Control Flow, Functions & Core Collections',
    intro: `<p>This is where Python starts to feel powerful. You will learn how programs <b>make decisions</b> (<code>if / elif / else</code>, truthiness, short-circuit logic), how they <b>repeat work</b> (<code>for</code>, <code>while</code>, <code>range</code>, <code>break</code>, <code>continue</code> and the unusual loop <code>else</code>), and how to loop the Pythonic way with <code>enumerate</code> and <code>zip</code>.</p>
<p>Then we package logic into <b>functions</b> — positional, keyword and default arguments, and the famous mutable-default trap — and meet Python's four workhorse collections: <b>lists, tuples, dicts and sets</b>, including what each operation really costs. We finish with two superpowers interviewers love to probe: <b>slicing</b> (<code>seq[start:stop:step]</code>) and <b>unpacking</b> (<code>a, b = b, a</code>, <code>first, *rest = items</code>).</p>
<p>Every topic has a step-by-step visualizer, runnable examples, "predict the output" puzzles and interview-style problems such as Two Sum, Merge Intervals and Longest Substring Without Repeating Characters.</p>`,
    goals: [
      'Write correct <code>if/elif/else</code> ladders and predict the result of <code>and</code>/<code>or</code>/<code>not</code> on any values using truthiness and short-circuit rules',
      'Choose between <code>for</code>, <code>while</code>, <code>range</code>, <code>enumerate</code> and <code>zip</code>, and use <code>break</code>/<code>continue</code>/loop-<code>else</code> without off-by-one errors',
      'Define functions with positional, keyword, default, keyword-only and <code>*args/**kwargs</code> parameters, and explain (and avoid) the mutable default argument bug',
      'Use lists, tuples, dicts and sets fluently, state the Big-O of their common operations, and pick the right one from a problem\'s wording',
      'Slice and unpack sequences confidently (negative indexes, steps, star-unpacking, swaps) and answer "predict the output" questions about them',
      'Solve classic interview problems (Two Sum, Group Anagrams, Merge Intervals, Spiral Matrix, Longest Substring) with idiomatic Python'
    ],
    prereqs: `<b>py01 (Python Setup, Syntax, Types &amp; I/O)</b>: running Python, variables as names bound to objects, int/float/str/bool/None, operators and f-strings. No prior data-structure knowledge needed.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
