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
registerModule({ id: 'py02', title: 'tmp', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
