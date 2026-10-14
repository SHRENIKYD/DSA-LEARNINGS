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
    aiEra: `<p>🤖 <b>What AI changes:</b> AI tools are very good at rewriting <code>range(len())</code> loops into <code>enumerate</code>/<code>zip</code> — a cheap win to ask for during code review. Linters (Ruff rule <code>SIM113</code>, Pylint <code>consider-using-enumerate</code>) also flag these automatically.</p>
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
<p><b>Call cost.</b> A Python function call costs roughly 50–100 ns in CPython 3.11+ (frames became much cheaper with the 3.11 "zero-cost" frame redesign), so millions of tiny calls in a hot loop still add up. Deep recursion is capped by <code>sys.getrecursionlimit()</code> (default 1000) — Python has no tail-call optimisation.</p>
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
registerModule({ id: 'py02', title: 'tmp', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
