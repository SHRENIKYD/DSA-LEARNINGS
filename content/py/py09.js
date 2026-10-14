(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (py09) ---------- */
  function cpm(code, hlMap, label) {
    return { type: 'code', label: label || 'Python code (current line highlighted)', lang: 'python', code: code, hl: hlMap || {} };
  }
  function cp(code, line, cls, label) {
    var hl = {};
    if (line) hl[line] = cls || 'cur';
    return cpm(code, hl, label);
  }
  function vp(obj, hlKeys, cls, label) {
    var vals = {}, hl = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    if (hlKeys) String(hlKeys).split(',').forEach(function (k) { hl[k] = cls || 'ok'; });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function words(s) { return String(s === undefined ? '' : s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }
  function outBox(lines) { return tx(lines.length ? '<pre>' + lines.map(esc).join('\n') + '</pre>' : '<i>(nothing printed yet)</i>', 'Printed output'); }
  function stk(items, label, top) {
    var hl = {};
    if (items.length) hl[items.length - 1] = top || 'cur';
    return { type: 'stack', label: label || 'Call stack (bottom → top)', items: items.slice(), hl: hl };
  }

  /* ================= TOPIC 1: try / except / else / finally + propagation ================= */
  topics.push({
    title: 'Exceptions 101: try / except / else / finally and How Errors Travel Up the Call Stack',
    analogy: `<p>Think of a <b>relay of managers</b> in a company. A junior employee hits a problem they cannot fix (an <b>exception</b>). They do not quietly ignore it — they pass it <b>up</b> to their manager. If that manager knows how to handle it, the problem stops there. If not, it goes up again, to the director, then the CEO. If nobody handles it, the whole company stops and prints a report of who passed it to whom (the <b>traceback</b>). And no matter what happens, everyone still locks their office door on the way out — that is <code>finally</code>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> An <b>exception</b> is Python's way of saying "something went wrong and I cannot continue normally". Examples: dividing by zero (<code>ZeroDivisionError</code>), converting <code>'abc'</code> to <code>int</code> (<code>ValueError</code>), a missing dict key (<code>KeyError</code>), a missing file (<code>FileNotFoundError</code>). When one happens, Python <b>stops the current line immediately</b> and looks for a handler.</p>
<p>You write handlers with four blocks. Each one has a clear job:</p>
${H.table(['Block', 'When it runs', 'Use it for'], [['<code>try:</code>', 'always (first)', 'the risky code — keep it SMALL'], ['<code>except SomeError:</code>', 'only if that error (or a subclass) happened inside <code>try</code>', 'recover, retry, log, or translate the error'], ['<code>else:</code>', 'only if <code>try</code> finished with <b>no</b> exception', 'the "happy path" follow-up that should NOT be protected by the except'], ['<code>finally:</code>', '<b>always</b> — success, error, <code>return</code>, <code>break</code>, even an un-caught error', 'cleanup: close files, release locks, stop timers']])}
<pre>def divide(a, b):
    try:
        result = int(a) / int(b)     # risky
    except ZeroDivisionError:
        print('cannot divide by zero')
        return None
    except ValueError:
        print('not a number')
        return None
    else:
        print('ok', result)          # only when no error
        return result
    finally:
        print('cleanup')             # ALWAYS, even after return</pre>
<p>🔵 <b>How errors travel.</b> When <code>raise</code> happens (by you or by Python), the interpreter <b>unwinds the call stack</b>: it checks the current function for a matching <code>except</code>; if there is none, it runs that function's <code>finally</code> (if any), throws the frame away, and repeats in the caller. This continues until a handler matches or the stack is empty — then Python prints a <b>traceback</b> (most recent call <b>last</b>) and the program exits with status 1.</p>
${H.arr(['main()', 'load_config()', 'parse_line()', "int('abc') 💥"], { label: 'call stack at the moment of the error (bottom → top)', hl: { 3: 'r' } })}
<p><b>Golden rules for beginners:</b></p>
<ul>
<li>Catch <b>specific</b> exceptions (<code>except ValueError</code>), never a bare <code>except:</code> — it would also swallow Ctrl+C and typos in your own code.</li>
<li>Keep the <code>try</code> block <b>tiny</b>: only the line that can fail. Put the rest in <code>else</code>.</li>
<li>Use <code>except ValueError as e:</code> to get the exception object; <code>str(e)</code> is its message.</li>
<li>Catch several at once with a tuple: <code>except (KeyError, IndexError):</code>.</li>
<li>Prefer <code>with open(...)</code> over manual <code>finally: f.close()</code> — a context manager <i>is</i> a packaged try/finally.</li>
</ul>`,
    clues: [
      '"the program must not crash on bad input" / "skip invalid lines and continue" → try/except around the single risky conversion, count or log the failures',
      '"always release the lock / close the connection / stop the timer" → <code>finally</code> (or a <code>with</code> block)',
      '"what does this function return?" with <code>return</code> inside both <code>try</code> and <code>finally</code> → the <code>finally</code> return wins (and silently eats the exception)',
      '"read the traceback and tell me where it failed" → the LAST frame is where it was raised; read bottom-up for the cause, top-down for the call path',
      '"why use else instead of putting code in try?" → so the except does not accidentally catch errors from the follow-up code',
      '"handle the error at the right level" → let it propagate to the caller that has enough context to decide (retry, ask the user, return 400)'
    ],
    code: [{ lang: 'python', run: true, title: 'All four blocks — run it and watch the order', code: `def divide(a, b):
    try:
        result = int(a) / int(b)      # the only risky line
    except ZeroDivisionError:
        print('  except: cannot divide by zero')
        return None
    except ValueError as e:
        print('  except: not a number ->', e)
        return None
    else:
        print('  else: ok, result =', result)
        return result
    finally:
        # runs on EVERY path, even after the return statements above
        print('  finally: cleanup')


for a, b in [('10', '2'), ('10', '0'), ('ten', '2')]:
    print(f'divide({a!r}, {b!r})')
    print('  returned', divide(a, b))` }, { lang: 'python', run: true, title: 'Propagation: the error climbs until someone catches it', code: `def parse_line(line):
    print('    parse_line starts')
    return int(line)                  # ValueError is raised HERE


def load_config(lines):
    print('  load_config starts')
    try:
        return [parse_line(x) for x in lines]
    finally:
        # no except here: we do not handle it, but cleanup still runs
        print('  load_config finally (stack is unwinding)')


def main():
    print('main starts')
    try:
        load_config(['1', 'abc', '3'])
    except ValueError as e:
        print('main caught:', type(e).__name__, '-', e)
    print('main continues normally')


main()` }],
    codeTitle: ['try / except / else / finally', 'Propagation through the call stack'],
    viz: [{
      title: 'try / except / else / finally: which lines run, in what order?',
      input: '10 0',
      inputLabel: 'Two values a b (try: 10 2 · 10 0 · ten 2)',
      gen: function (input) {
        var w = words(input);
        if (w.length !== 2) throw new Error('Type exactly two values, e.g. 10 2');
        var a = w[0], b = w[1];
        var code = ['def divide(a, b):', '    try:', '        result = int(a) / int(b)', '    except ZeroDivisionError:', "        print('cannot divide by zero')", '        return None', '    except ValueError:', "        print('not a number')", '        return None', '    else:', "        print('ok', result)", '        return result', '    finally:', "        print('cleanup')"].join('\n');
        var isInt = function (s) { return /^[+-]?\d+$/.test(s); };
        var frames = [], out = [];
        var args = { a: "'" + a + "'", b: "'" + b + "'" };
        frames.push(fr('Call <code>divide(' + esc(args.a) + ', ' + esc(args.b) + ')</code>. Python enters the <b>try</b> block first, always.', [cp(code, 2), vp(args), outBox(out)]));
        var kind;
        if (!isInt(a) || !isInt(b)) kind = 'value';
        else if (parseInt(b, 10) === 0) kind = 'zero';
        else kind = 'ok';
        if (kind === 'value') {
          var bad = !isInt(a) ? a : b;
          frames.push(fr('<code>int(' + esc("'" + bad + "'") + ')</code> fails → Python raises <b>ValueError</b>. The rest of this line is abandoned instantly.', [cp(code, 3, 'bad'), vp(args), tx('<span class="c-r">ValueError: invalid literal for int() with base 10: ' + esc("'" + bad + "'") + '</span>', 'Exception in flight'), outBox(out)]));
          frames.push(fr('Python checks the except clauses <b>top to bottom</b>. Is a ValueError a ZeroDivisionError? <b>No</b> → skip this clause.', [cp(code, 4, 'done'), vp(args), outBox(out)]));
          frames.push(fr('Is it a ValueError? <b>Yes</b> → this handler runs. The exception is now "handled".', [cp(code, 7, 'ok'), vp(args), outBox(out)]));
          out.push('not a number');
          frames.push(fr('Handler body prints its message.', [cp(code, 8), vp(args), outBox(out)]));
          frames.push(fr('<code>return None</code> is <b>scheduled</b> — but before the function can leave, <b>finally</b> must run.', [cp(code, 9, 'win'), vp({ a: args.a, b: args.b, 'pending return': 'None' }, 'pending return', 'sel'), outBox(out)]));
        } else if (kind === 'zero') {
          frames.push(fr('<code>int(a)</code> and <code>int(b)</code> work, but dividing by 0 raises <b>ZeroDivisionError</b>. <code>result</code> is never assigned.', [cp(code, 3, 'bad'), vp(args), tx('<span class="c-r">ZeroDivisionError: division by zero</span>', 'Exception in flight'), outBox(out)]));
          frames.push(fr('First except clause: is it a ZeroDivisionError? <b>Yes</b> → run this handler. Later except clauses are ignored.', [cp(code, 4, 'ok'), vp(args), outBox(out)]));
          out.push('cannot divide by zero');
          frames.push(fr('Handler prints its message.', [cp(code, 5), vp(args), outBox(out)]));
          frames.push(fr('<code>return None</code> is <b>scheduled</b>. The function wants to leave, but <b>finally</b> runs first.', [cp(code, 6, 'win'), vp({ a: args.a, b: args.b, 'pending return': 'None' }, 'pending return', 'sel'), outBox(out)]));
        } else {
          var r = parseInt(a, 10) / parseInt(b, 10);
          var rs = (Math.round(r * 1e6) / 1e6).toString();
          if (rs.indexOf('.') < 0) rs += '.0';
          frames.push(fr('No problem: <code>result = ' + rs + '</code> (true division <code>/</code> always gives a float).', [cp(code, 3, 'ok'), vp({ a: args.a, b: args.b, result: rs }, 'result'), outBox(out)]));
          frames.push(fr('No exception happened, so <b>every except clause is skipped</b> and Python jumps to <b>else</b>.', [cpm(code, { 4: 'done', 7: 'done', 10: 'ok' }), vp({ a: args.a, b: args.b, result: rs }), outBox(out)]));
          out.push('ok ' + rs);
          frames.push(fr('The else body runs — this is the happy path, deliberately outside the protection of the except clauses.', [cp(code, 11), vp({ a: args.a, b: args.b, result: rs }), outBox(out)]));
          frames.push(fr('<code>return result</code> is <b>scheduled</b>. Before leaving, <b>finally</b> runs.', [cp(code, 12, 'win'), vp({ a: args.a, b: args.b, result: rs, 'pending return': rs }, 'pending return', 'sel'), outBox(out)]));
        }
        frames.push(fr('<b>finally</b> runs on every path — success, handled error, or even an un-handled one.', [cp(code, 13, 'cur'), outBox(out)]));
        out.push('cleanup');
        frames.push(fr('Cleanup printed. Only now does the pending return actually happen.', [cp(code, 14, 'ok'), outBox(out)]));
        frames.push(fr('Done. Order to remember: <b>try → (one except OR else) → finally → return</b>.', [tx('try ' + (kind === 'ok' ? '→ else' : '→ except ' + (kind === 'zero' ? 'ZeroDivisionError' : 'ValueError')) + ' → finally → return ' + (kind === 'ok' ? 'value' : 'None'), 'Path taken'), outBox(out)]));
        return frames;
      }
    }, {
      title: 'Exception propagation: unwinding the call stack until a handler matches',
      input: 'main',
      inputLabel: 'Which function has the except ValueError? (main · load_config · parse_line · none)',
      gen: function (input) {
        var h = String(input || '').trim().toLowerCase();
        if (['main', 'load_config', 'parse_line', 'none'].indexOf(h) < 0) throw new Error('Type one of: main, load_config, parse_line, none');
        var names = ['<module>', 'main()', 'load_config()', 'parse_line()'];
        var handler = { main: 1, load_config: 2, parse_line: 3, none: -1 }[h];
        var frames = [], stack = [];
        var notes = {
          1: 'main has <code>try/except ValueError</code>',
          2: 'load_config has <code>try/except ValueError</code>',
          3: 'parse_line has <code>try/except ValueError</code>'
        };
        for (var i = 0; i < names.length; i++) {
          stack.push(names[i]);
          frames.push(fr('Call <b>' + esc(names[i]) + '</b> → a new frame is pushed on top of the stack.' + (i === handler ? ' Note: ' + notes[i] + '.' : ''), [stk(stack), tx(i === 3 ? 'about to run <code>int(\'abc\')</code>' : 'running normally', 'Status')]));
        }
        stack.push("int('abc')");
        frames.push(fr('<code>int(\'abc\')</code> raises <b>ValueError</b>. Python stops the line and starts looking for a handler, starting at the TOP frame.', [{ type: 'stack', label: 'Call stack (bottom → top)', items: stack.slice(), hl: { 4: 'bad' } }, tx('<span class="c-r">ValueError: invalid literal for int() with base 10: \'abc\'</span>', 'Exception in flight')]));
        stack.pop();
        for (var j = 3; j >= 0; j--) {
          var hl = {};
          hl[j] = j === handler ? 'ok' : 'bad';
          if (j === handler) {
            frames.push(fr('<b>' + esc(names[j]) + '</b> has a matching <code>except ValueError</code> → <span class="c-g">caught!</span> Unwinding stops here. Frames above it are already gone.', [{ type: 'stack', label: 'Call stack (bottom → top)', items: stack.slice(), hl: hl }, tx('Handled in ' + esc(names[j]) + '. Execution continues after its try/except as if nothing happened.', 'Status')]));
            frames.push(fr('Everything below keeps running normally. Lesson: the error is handled by the <b>nearest enclosing handler</b> on the call stack — not necessarily in the function where it happened.', [stk(stack, null, 'ok'), tx('Callers never even see the error.', 'Result')]));
            return frames;
          }
          frames.push(fr('<b>' + esc(names[j]) + '</b> has no matching except → its <code>finally</code> blocks (if any) run, then the frame is <b>discarded</b>. The exception moves to the caller.', [{ type: 'stack', label: 'Call stack (bottom → top)', items: stack.slice(), hl: hl }, tx('<span class="c-r">ValueError still in flight</span>', 'Status')]));
          stack.pop();
        }
        frames.push(fr('Stack is empty and nobody caught it → Python prints the <b>traceback</b> (most recent call LAST) and exits with status 1.', [{ type: 'stack', label: 'Call stack', items: ['(empty)'], hl: { 0: 'bad' } }, tx('<pre>Traceback (most recent call last):\n  File "app.py", line 20, in &lt;module&gt;\n    main()\n  File "app.py", line 15, in main\n    load_config(lines)\n  File "app.py", line 9, in load_config\n    return [parse_line(x) for x in lines]\n  File "app.py", line 3, in parse_line\n    return int(line)\nValueError: invalid literal for int() with base 10: \'abc\'</pre>', 'stderr')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: return inside try, print inside finally', html: `<p>What prints? <code>finally</code> runs <b>after</b> the return value is computed but <b>before</b> the function actually returns.</p><p>Output: ${H.c('g', 'finally runs')} then ${H.c('g', 'got 1')}. The value 1 was already computed and "parked"; printing in finally does not change it.</p>`, code: { lang: 'python', run: true, code: `def f():
    try:
        return 1
    finally:
        print('finally runs')

print('got', f())` } },
      { title: 'Predict the output: return in finally overrides everything (a trap)', html: `<p>A <code>return</code> inside <code>finally</code> <b>replaces</b> the pending return value and even <b>swallows an exception</b> in flight. That is why linters flag it, and Python 3.14 (PEP 765) emits a <code>SyntaxWarning</code> for <code>return</code>/<code>break</code>/<code>continue</code> inside <code>finally</code>.</p><p>Output: ${H.c('r', '2')} and ${H.c('r', 'no error seen')}.</p>`, code: { lang: 'python', run: true, code: `def g():
    try:
        return 1
    finally:
        return 2          # overrides the 1

def h():
    try:
        1 / 0
    finally:
        return 'no error seen'   # the ZeroDivisionError silently vanishes

print(g())
print(h())` } },
      { title: 'Skip bad lines, keep going (the everyday pattern)', html: `<p>Read numbers from messy input: wrap only the conversion, count the failures, keep the good ones. The <code>else</code> keeps the append outside the protected zone.</p>${H.table(['line', 'int(line)', 'outcome'], [['"10"', '10', H.c('g', 'kept')], ['"x"', 'ValueError', H.c('r', 'skipped, bad += 1')], ['"7"', '7', H.c('g', 'kept')]])}`, code: { lang: 'python', run: true, code: `lines = ['10', 'x', '7', '', '-3']
good, bad = [], 0
for line in lines:
    try:
        n = int(line)
    except ValueError:
        bad += 1
    else:
        good.append(n)
print(good, 'bad =', bad)   # [10, 7, -3] bad = 2` } },
      { title: 'Reading a traceback like a pro', html: `<p>Read the <b>last line first</b>: it names the exception type and message. Then read the frame just above it: that is the exact line that raised. Then read upward to see <b>who called whom</b>. In Python 3.11+ tracebacks also show <code>~~~^^^</code> markers under the exact sub-expression that failed (e.g. which index in <code>a[i][j]</code>), and 3.13 adds colour in the terminal.</p>` }
    ],
    deepDive: `<p>🟣 <b>Zero-cost try (3.11+).</b> Since CPython 3.11, entering a <code>try</code> block costs nothing at runtime: instead of pushing a "block" on every entry (the old <code>SETUP_FINALLY</code> opcode), the compiler builds an <b>exception table</b> mapping bytecode ranges to handlers. Only when an exception is actually raised does the interpreter look up the table. So wrapping code in try is free; <b>raising</b> is the expensive part (it creates an object, a traceback chain, and unwinds frames) — roughly tens of times a plain dict lookup.</p>
<p><b>What exactly happens on raise.</b> Python creates the exception object, attaches a <code>__traceback__</code> (a linked list of traceback objects, one per frame it passes through), and unwinds. In an <code>except E as e:</code> block, Python <b>deletes <code>e</code> at the end of the block</b> (an implicit <code>del e</code>), because the traceback references the frame, which references <code>e</code> — a reference cycle that would keep every local variable alive. If you need it later, assign it to another name.</p>
<p><b>finally + control flow.</b> A <code>return</code>, <code>break</code> or <code>continue</code> in <code>finally</code> discards the pending exception — almost always a bug. <code>finally</code> runs on <code>sys.exit()</code> too (SystemExit is an exception) but <b>not</b> on <code>os._exit()</code> or a hard kill (SIGKILL), so never rely on it for durability; use transactions/fsync.</p>
<p><b>Generators and finally.</b> If a generator with a <code>try/finally</code> is abandoned, its finally runs when the generator is closed or garbage-collected (via <code>GeneratorExit</code>) — timing you do not control. Prefer explicit <code>with</code> or <code>contextlib.closing</code>.</p>
<p><b>Production reality.</b> At the top of a service you usually have <b>one</b> catch-all (a web framework error middleware, or <code>except Exception: logger.exception(...)</code>) that logs the full traceback and returns a 500, while inner code catches only what it can actually fix. <code>logger.exception()</code> inside an except block logs the traceback automatically; <code>traceback.format_exc()</code> gives it as a string.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are excellent at reading a 60-line traceback and pointing at the failing frame, and at writing boilerplate try/except. Paste the traceback, not a paraphrase — the frame list is the most valuable context you can give.</p>
<p><b>Where AI goes wrong:</b> generated code loves <code>except Exception: pass</code> or <code>except Exception as e: print(e)</code> "to make it robust" — that hides bugs and turns crashes into silent data corruption. It also wraps 30 lines in one try, so a typo-induced <code>NameError</code> gets reported as "file not found". Review every except clause: <i>which exact error, raised by which exact line, and what is the recovery?</i></p>
<p><b>Use AI as a partner:</b> "List every exception this function can raise and from which line" is a great review prompt. <b>What you must still own:</b> deciding at which layer an error is handled, and making sure nothing is silently swallowed.</p>`,
    problems: [{
      title: 'Sum the Valid Numbers (and Report the Bad Ones)',
      level: 'Easy', tags: ['try/except/else', 'parsing'], companies: ['Amazon', 'Stripe'],
      statement: `<p>You receive a list of strings from a CSV column. Return a tuple <code>(total, bad)</code> where <code>total</code> is the sum of every string that is a valid integer (surrounding spaces allowed) and <code>bad</code> is the list of <b>indexes</b> of strings that are not. The function must never crash on bad data.</p>`,
      constraints: `0 ≤ len(values) ≤ 10<sup>5</sup>; each string length ≤ 20; do not use regex — use exception handling.`,
      example: `<p>Input <code>['4', ' 10 ', 'x', '', '-3']</code> → Output ${H.c('g', '(11, [2, 3])')}. ${H.c('g', "'4' + ' 10 ' + '-3' = 11")} (int() ignores surrounding whitespace); ${H.c('r', "'x'")} and ${H.c('r', "''")} raise ValueError, so their indexes 2 and 3 are reported.</p>`,
      brute: { why: `<p>LBYL with <code>str.isdigit()</code> looks simpler but is <b>wrong</b>: it rejects <code>'-3'</code> and <code>' 10 '</code>, and accepts <code>'²'</code> (superscript two is a digit but <code>int('²')</code> fails). Re-implementing int's rules by hand is endless; let int() decide.</p>`, code: `def sum_valid_lbyl(values):
    total, bad = 0, []
    for i, s in enumerate(values):
        if s.isdigit():          # misses '-3', ' 10 ', accepts '²'
            total += int(s)
        else:
            bad.append(i)
    return total, bad` },
      mcq: { q: 'Where should <code>total += n</code> go?', options: ['In the <code>else</code> block after the try/except', 'Inside the <code>try</code> right after int()', 'In <code>finally</code>', 'Outside the loop'], answer: 0, explain: 'Putting it in else means only the int() call is protected, so an unexpected error in the addition is not mistaken for "bad input". (Inside try also works here, but else expresses intent.) finally would run even for bad values.' },
      hints: [`<p>Hint 1: Let <code>int()</code> be the judge of what a valid integer is — it already handles signs and whitespace.</p>`, `<p>Hint 2: Loop with <code>enumerate</code> so you have the index; wrap only <code>int(s)</code> in try, catch <b>ValueError</b> only.</p>`, `<p>Hint 3: Recipe: for i, s → try n = int(s) / except ValueError: bad.append(i) / else: total += n. Edge cases: empty list → (0, []); empty string → bad.</p>`],
      solution: {
        approach: `<p>One pass. Try the conversion; on <code>ValueError</code> record the index; on success (<code>else</code>) add to the total. We catch only ValueError, so a <code>None</code> in the list (TypeError) would still crash loudly — which is what you want for data that breaks the contract.</p>`,
        code: { lang: 'python', run: true, code: `def sum_valid(values):
    total, bad = 0, []
    for i, s in enumerate(values):
        try:
            n = int(s)               # the ONLY risky call
        except ValueError:
            bad.append(i)            # not an integer -> remember where
        else:
            total += n               # happy path, unprotected on purpose
    return total, bad


print(sum_valid(['4', ' 10 ', 'x', '', '-3']))   # (11, [2, 3])
print(sum_valid([]))                             # (0, [])
print(sum_valid(['²', '1_000']))                 # (1000, [0]) underscores are valid in int()` },
        dry: { head: ['i', 's', 'int(s)', 'branch', 'total', 'bad'], rows: [['0', "'4'", '4', 'else', '4', '[]'], ['1', "' 10 '", '10', 'else', '14', '[]'], ['2', "'x'", '<span class="c-r">ValueError</span>', 'except', '14', '[2]'], ['3', "''", '<span class="c-r">ValueError</span>', 'except', '14', '[2, 3]'], ['4', "'-3'", '-3', 'else', '11', '[2, 3]']] },
        complexity: `<p>O(N · L) time for N strings of length L, O(B) extra space for B bad indexes. Exceptions are only raised for bad rows, so clean data runs at full speed.</p>`,
        followUps: ['Also accept floats like "2.5" but report them separately.', 'Return the error messages too, e.g. {2: "invalid literal ..."}.', 'Stop and raise after more than 10% bad rows — which exception type would you raise?']
      }
    }]
  });

  /* ================= TOPIC 2: Exception hierarchy ================= */
  var EXC_PARENT = {
    BaseException: null, SystemExit: 'BaseException', KeyboardInterrupt: 'BaseException', GeneratorExit: 'BaseException', Exception: 'BaseException',
    ArithmeticError: 'Exception', LookupError: 'Exception', ValueError: 'Exception', TypeError: 'Exception', OSError: 'Exception',
    ZeroDivisionError: 'ArithmeticError', KeyError: 'LookupError', IndexError: 'LookupError', FileNotFoundError: 'OSError'
  };
  var EXC_NODES = [
    { id: 'BaseException', x: 50, y: 6 },
    { id: 'SystemExit', x: 10, y: 20 }, { id: 'KeyboardInterrupt', x: 34, y: 20 }, { id: 'GeneratorExit', x: 60, y: 20 }, { id: 'Exception', x: 85, y: 20 },
    { id: 'ArithmeticError', x: 12, y: 36 }, { id: 'LookupError', x: 34, y: 36 }, { id: 'ValueError', x: 53, y: 36 }, { id: 'TypeError', x: 70, y: 36 }, { id: 'OSError', x: 88, y: 36 },
    { id: 'ZeroDivisionError', x: 13, y: 52 }, { id: 'KeyError', x: 33, y: 52 }, { id: 'IndexError', x: 49, y: 52 }, { id: 'FileNotFoundError', x: 86, y: 52 }
  ];
  function excGraph(hl, ehl, tags, label) {
    var edges = [];
    Object.keys(EXC_PARENT).forEach(function (k) { if (EXC_PARENT[k]) edges.push([EXC_PARENT[k], k]); });
    return { type: 'graph', label: label || 'Built-in exception hierarchy (simplified)', directed: true, height: 60, nodes: EXC_NODES.map(function (n) { return { id: n.id, label: n.id, x: n.x, y: n.y, shape: 'box' }; }), edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }
  function excMro(name) { var out = []; while (name) { out.push(name); name = EXC_PARENT[name]; } out.push('object'); return out; }

  topics.push({
    title: 'The Exception Hierarchy: Why except LookupError Catches KeyError',
    analogy: `<p>Think of a hospital triage desk with signs: <b>"Broken bones"</b>, <b>"Any injury"</b>, <b>"Any patient"</b>. A patient with a broken arm matches all three signs, because a broken arm <i>is</i> an injury, and an injured person <i>is</i> a patient. The nurse walks the signs <b>from top to bottom</b> and sends you to the <b>first</b> desk that matches. Exceptions work the same: every exception is a class, classes form a family tree, and <code>except X</code> matches X <b>and all its children</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Every exception in Python is an <b>object</b> whose class inherits from <code>BaseException</code>. The classes form a tree. <code>except LookupError:</code> catches a <code>KeyError</code> because <code>KeyError</code> is a <b>subclass</b> of <code>LookupError</code> — exactly like <code>isinstance(err, LookupError)</code> being <code>True</code>.</p>
${H.table(['Family', 'Members you will meet', 'Typical cause'], [['<code>ArithmeticError</code>', '<code>ZeroDivisionError</code>, <code>OverflowError</code>', 'maths went wrong'], ['<code>LookupError</code>', '<code>KeyError</code>, <code>IndexError</code>', 'a key/index is missing'], ['<code>ValueError</code>', '<code>UnicodeDecodeError</code>, <code>json.JSONDecodeError</code>', 'right type, wrong value (<code>int("x")</code>)'], ['<code>TypeError</code>', '—', 'wrong type (<code>"a" + 1</code>)'], ['<code>OSError</code>', '<code>FileNotFoundError</code>, <code>PermissionError</code>, <code>TimeoutError</code>, <code>ConnectionError</code>', 'the outside world (files, sockets)'], ['<code>RuntimeError</code>', '<code>RecursionError</code>, <code>NotImplementedError</code>', 'generic "should not happen"'], ['<code>AttributeError</code>, <code>NameError</code>, <code>ImportError</code>', '<code>ModuleNotFoundError</code>', 'usually bugs or missing packages']])}
<p>🔵 <b>The two-level split that matters most.</b> At the very top:</p>
<ul>
<li><code>BaseException</code> — the root. Its direct children <code>SystemExit</code> (from <code>sys.exit()</code>), <code>KeyboardInterrupt</code> (Ctrl+C) and <code>GeneratorExit</code> are <b>not errors</b>: they are signals to stop. You almost never want to catch them.</li>
<li><code>Exception</code> — the parent of every "normal" error. When you need a catch-all, write <code>except Exception:</code>, <b>never</b> a bare <code>except:</code> (which means <code>except BaseException:</code> and would trap Ctrl+C and sys.exit()).</li>
</ul>
<p><b>Order of except clauses matters.</b> Python tests them top to bottom and runs only the <b>first</b> match. So put <b>specific</b> classes first and general ones last. If you write <code>except Exception:</code> above <code>except KeyError:</code>, the KeyError clause can never run (pylint calls this "bad-except-order").</p>
<pre>try:
    value = config['port']
except KeyError:          # specific first
    value = 8080
except LookupError:       # broader
    raise
except Exception:         # broadest last (log and re-raise)
    raise</pre>
<p><b>Useful facts:</b> <code>OSError</code> has an <code>errno</code> attribute and Python maps common errnos to subclasses, so <code>open('missing.txt')</code> raises <code>FileNotFoundError</code> (which is an <code>OSError</code>). <code>IOError</code> and <code>EnvironmentError</code> are just old aliases of <code>OSError</code>. Exceptions you write yourself should inherit from <code>Exception</code> (next topic).</p>`,
    clues: [
      '"catch both a missing key and a bad index" → <code>except LookupError</code> (their common parent) or a tuple <code>(KeyError, IndexError)</code>',
      '"Ctrl+C does not stop my program" → a bare <code>except:</code> or <code>except BaseException</code> is swallowing <code>KeyboardInterrupt</code>',
      '"why is this except clause never reached?" → a broader class is listed above it; specific → general order',
      '"what is the difference between Exception and BaseException?" → BaseException also includes exit signals (SystemExit, KeyboardInterrupt, GeneratorExit)',
      '"handle any file problem" → <code>except OSError</code> covers FileNotFoundError, PermissionError, IsADirectoryError…',
      '"which exception is raised when…" (int("x"), d["k"], [][0], "a"+1, 1/0) → ValueError, KeyError, IndexError, TypeError, ZeroDivisionError'
    ],
    code: [{ lang: 'python', run: true, title: 'Walk the family tree with __mro__ and isinstance', code: `# Every exception class knows its ancestors (Method Resolution Order).
for cls in (KeyError, ZeroDivisionError, FileNotFoundError, KeyboardInterrupt):
    chain = ' -> '.join(c.__name__ for c in cls.__mro__)
    print(f'{cls.__name__:18} {chain}')

err = KeyError('port')
print(isinstance(err, LookupError))   # True: a KeyError IS a LookupError
print(isinstance(err, Exception))     # True
print(issubclass(KeyboardInterrupt, Exception))   # False! it is a BaseException only

# Which exception does each mistake raise?
tests = {
    'int("x")': lambda: int('x'),
    '{}["k"]': lambda: {}['k'],
    '[][0]': lambda: [][0],
    '"a" + 1': lambda: 'a' + 1,
    '1 / 0': lambda: 1 / 0,
    'open("nope.txt")': lambda: open('nope.txt'),
    'None.upper()': lambda: None.upper(),
}
for text, fn in tests.items():
    try:
        fn()
    except Exception as e:
        print(f'{text:18} -> {type(e).__name__}')` }, { lang: 'python', run: true, title: 'First matching except clause wins', code: `def classify(exc):
    try:
        raise exc
    except (ZeroDivisionError, ValueError):
        return 'bad math or bad value'
    except LookupError:
        return 'missing key or index'
    except OSError:
        return 'file / network problem'
    except Exception:
        return 'something else went wrong'


for exc in [KeyError('k'), IndexError(0), ZeroDivisionError(), FileNotFoundError('x'),
            TypeError('t'), UnicodeDecodeError('utf-8', b'\\xff', 0, 1, 'bad byte')]:
    print(f'{type(exc).__name__:20} -> {classify(exc)}')

# KeyboardInterrupt is NOT an Exception, so except Exception does not catch it:
try:
    classify(KeyboardInterrupt())
except KeyboardInterrupt:
    print('KeyboardInterrupt escaped every handler (as it should)')` }],
    codeTitle: ['Inspecting the hierarchy', 'Clause order in action'],
    viz: [{
      title: 'Which except clause catches it? Walk up the family tree, then down the clauses',
      input: 'KeyError',
      inputLabel: 'Exception class (e.g. KeyError, IndexError, ZeroDivisionError, FileNotFoundError, TypeError, KeyboardInterrupt, SystemExit)',
      gen: function (input) {
        var name = String(input || '').trim();
        if (!EXC_PARENT.hasOwnProperty(name)) throw new Error('Pick one of: ' + Object.keys(EXC_PARENT).join(', '));
        var mro = excMro(name);
        var code = ['try:', '    risky()            # raises ' + name, 'except (ZeroDivisionError, ValueError):', "    print('bad math or bad value')", 'except LookupError:', "    print('missing key or index')", 'except OSError:', "    print('file / network problem')", 'except Exception:', "    print('something else')"].join('\n');
        var clauses = [{ line: 3, cls: ['ZeroDivisionError', 'ValueError'] }, { line: 5, cls: ['LookupError'] }, { line: 7, cls: ['OSError'] }, { line: 9, cls: ['Exception'] }];
        var frames = [], hl = {}, ehl = {}, tags = {};
        hl[name] = 'bad';
        frames.push(fr('<code>risky()</code> raises a <b>' + name + '</b>. Here is where its class sits in the built-in hierarchy.', [excGraph(hl, {}, { }), cp(code, 2, 'bad')]));
        for (var i = 1; i < mro.length - 1; i++) {
          hl[mro[i]] = 'win';
          ehl[mro[i] + '-' + mro[i - 1]] = 'win';
          frames.push(fr('Walk up: a <b>' + name + '</b> IS-A <b>' + mro[i] + '</b>. So <code>isinstance(err, ' + mro[i] + ')</code> is True.', [excGraph(Object.assign({}, hl), Object.assign({}, ehl)), tx('<code>' + name + '.__mro__</code> = ' + mro.slice(0, i + 1).join(' → ') + ' …', 'Ancestors so far')]));
        }
        frames.push(fr('Full ancestry (<code>__mro__</code>): <b>' + mro.join(' → ') + '</b>. An except clause matches if its class is ANY of these.', [excGraph(Object.assign({}, hl), Object.assign({}, ehl)), { type: 'set', label: 'Classes that would catch it', items: mro.slice(0, -1), hl: (function () { var h = {}; h[name] = 'bad'; return h; })() }]));
        for (var c = 0; c < clauses.length; c++) {
          var cl = clauses[c];
          var hit = cl.cls.some(function (k) { return mro.indexOf(k) >= 0; });
          var hlc = {};
          for (var p = 0; p < c; p++) hlc[clauses[p].line] = 'done';
          hlc[cl.line] = hit ? 'ok' : 'bad';
          var g = {}; cl.cls.forEach(function (k) { g[k] = hit ? 'ok' : 'cur'; }); g[name] = hit ? 'ok' : 'bad';
          frames.push(fr('Clause ' + (c + 1) + ': <code>except ' + (cl.cls.length > 1 ? '(' + cl.cls.join(', ') + ')' : cl.cls[0]) + '</code> → is ' + cl.cls.join(' or ') + ' in the ancestry? ' + (hit ? '<span class="c-g"><b>Yes — this handler runs</b></span>; later clauses are skipped.' : '<span class="c-r">No</span> → try the next clause.'), [cpm(code, hlc), excGraph(g)]));
          if (hit) {
            var hl2 = {}; hl2[cl.line + 1] = 'ok';
            frames.push(fr('Handled. Lesson: put <b>specific</b> clauses above <b>general</b> ones, because the first match wins.', [cpm(code, hl2), tx('Printed: <b>' + ['bad math or bad value', 'missing key or index', 'file / network problem', 'something else'][c] + '</b>', 'Output')]));
            return frames;
          }
        }
        frames.push(fr('<span class="c-r">No clause matched!</span> <b>' + name + '</b> is a BaseException but <b>not</b> an Exception, so even <code>except Exception</code> lets it through. That is deliberate: Ctrl+C and sys.exit() must be able to stop your program.', [excGraph((function () { var h = {}; h[name] = 'bad'; h.Exception = 'cur'; return h; })()), tx('The exception propagates to the caller (and probably ends the program).', 'Result')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: wrong clause order', html: `<p>Because <code>Exception</code> is listed first, it catches the KeyError and the specific clause is <b>dead code</b>. Output: ${H.c('r', 'generic')}.</p>`, code: { lang: 'python', run: true, code: `try:
    {}['missing']
except Exception:
    print('generic')
except KeyError:          # unreachable: Exception already matched
    print('specific')` } },
      { title: 'One clause for two related errors', html: `<p>Looking something up by key OR by position? Both failures are <code>LookupError</code>s. Output: ${H.c('g', 'default default 2')}.</p>`, code: { lang: 'python', run: true, code: `def pick(container, key, default='default'):
    try:
        return container[key]
    except LookupError:          # KeyError for dicts, IndexError for lists
        return default

print(pick({'a': 1}, 'b'), pick([1, 2], 5), pick([1, 2], 1))` } },
      { title: 'Why a bare except is dangerous', html: `<p><code>except:</code> catches <b>BaseException</b>, including <code>SystemExit</code>. Here <code>sys.exit()</code> is silently cancelled and the program keeps running — imagine the same with Ctrl+C inside a retry loop: the user can never stop it. Output: ${H.c('r', 'swallowed SystemExit; still running')}.</p>`, code: { lang: 'python', run: true, code: `import sys

try:
    sys.exit(1)
except:                      # noqa: E722  (bare except: catches EVERYTHING)
    print('swallowed SystemExit; still running')

try:
    sys.exit(1)
except Exception:
    print('never printed')
except SystemExit as e:
    print('SystemExit is not an Exception; exit code was', e.code)` } },
      { title: 'OSError subclasses chosen by errno', html: `<p>The OS reports failures as numeric error codes (errno). Python maps them to friendly subclasses so you can catch exactly the case you can fix.</p>${H.table(['errno', 'subclass', 'typical fix'], [['ENOENT', '<code>FileNotFoundError</code>', 'create the file / use a default'], ['EACCES', '<code>PermissionError</code>', 'tell the user, do not retry'], ['ETIMEDOUT', '<code>TimeoutError</code>', 'retry with backoff'], ['ECONNREFUSED', '<code>ConnectionRefusedError</code>', 'service down → retry later']])}` }
    ],
    deepDive: `<p>🟣 <b>How matching really works.</b> For <code>except X</code>, CPython runs the <code>CHECK_EXC_MATCH</code> opcode, which is essentially <code>issubclass(type(exc), X)</code> (or any element of a tuple). <code>X</code> must be a class deriving from BaseException, or a tuple of them — <code>except "oops"</code> raises <code>TypeError</code> at the moment it is checked. It walks the <b>real</b> inheritance chain (CPython uses <code>PyType_IsSubtype</code>), so "virtual subclasses" registered on an ABC with <code>register()</code> do <b>not</b> count for except matching, even though <code>issubclass()</code> says True.</p>
<p><b>Designing with the hierarchy.</b> Good libraries expose <b>one base class</b> (<code>requests.RequestException</code>, <code>sqlalchemy.exc.SQLAlchemyError</code>, <code>botocore.exceptions.ClientError</code>) so callers can catch "anything from this library" in one line, and specific subclasses for things callers can fix. Some library exceptions use <b>multiple inheritance</b> to fit two families: <code>json.JSONDecodeError</code> is a <code>ValueError</code>; <code>requests.exceptions.JSONDecodeError</code> inherits from both the requests base and the json one.</p>
<p><b>Version notes.</b> Python 3.3 (PEP 3151) collapsed IOError/EnvironmentError/socket.error into <code>OSError</code> with errno subclasses. 3.11 added <code>BaseExceptionGroup</code>/<code>ExceptionGroup</code> for several errors at once (next topic) and <code>add_note()</code>. <code>asyncio.CancelledError</code> became a <b>BaseException</b> subclass in 3.8 precisely so that <code>except Exception</code> in user code would stop accidentally swallowing task cancellation — a real-world example of why the BaseException/Exception split exists.</p>
<p><b>Performance.</b> Matching is a short MRO walk, trivially cheap. The expensive part is creating and propagating the exception, not the number of except clauses.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can instantly tell you which exception a library call raises — but it often <b>guesses</b> from naming patterns. Verify with the docs or by triggering the error in a REPL (<code>type(e).__mro__</code> is the ground truth).</p>
<p><b>Where AI goes wrong:</b> catching <code>Exception</code> where a specific class is known; ordering clauses general-first; catching <code>BaseException</code> in async code (which swallows <code>CancelledError</code> and makes tasks un-cancellable); inventing exception classes that do not exist (e.g. <code>requests.TimeoutException</code> — the real one is <code>requests.Timeout</code>).</p>
<p><b>What you must still own:</b> knowing the top of the tree by heart (BaseException vs Exception, LookupError, OSError, ArithmeticError) so you can spot a wrong catch in a code review in two seconds.</p>`,
    problems: [{
      title: 'deep_get: Safe Lookup in Nested JSON',
      level: 'Medium', tags: ['LookupError', 'exception hierarchy', 'EAFP'], companies: ['Google', 'Datadog'],
      statement: `<p>Implement <code>deep_get(data, path, default=None)</code>. <code>data</code> is nested dicts and lists (parsed JSON). <code>path</code> is a list of keys (strings) and indexes (ints). Walk the path; if any step is <b>missing</b> (missing key or out-of-range index), return <code>default</code>. If the path is <b>malformed</b> for the data (e.g. a string index into a list), do <b>not</b> hide it — let the <code>TypeError</code> propagate, because that is a bug in the caller.</p>`,
      constraints: `Path length ≤ 100. Negative indexes behave like Python's (−1 = last). Do not use <code>isinstance</code> checks for the missing case — use the exception hierarchy.`,
      example: `<p><code>data = {'users': [{'name': 'Asha', 'tags': ['admin']}]}</code></p><ul><li><code>deep_get(data, ['users', 0, 'tags', 0])</code> → ${H.c('g', "'admin'")}</li><li><code>deep_get(data, ['users', 5, 'name'], '?')</code> → ${H.c('y', "'?'")} (IndexError → LookupError)</li><li><code>deep_get(data, ['users', 'name'])</code> → ${H.c('r', 'TypeError')} propagates: list indices must be integers.</li></ul>`,
      brute: { why: `<p>An LBYL version checks <code>isinstance(cur, dict) and key in cur</code>, then <code>isinstance(cur, list) and -len(cur) &lt;= key &lt; len(cur)</code>… It is long, misses other mappings/sequences (tuples, OrderedDict, custom classes with <code>__getitem__</code>), and re-implements negative-index rules by hand.</p>`, code: `def deep_get_lbyl(data, path, default=None):
    cur = data
    for step in path:
        if isinstance(cur, dict):
            if step not in cur:
                return default
            cur = cur[step]
        elif isinstance(cur, list):
            if not isinstance(step, int) or not -len(cur) <= step < len(cur):
                return default       # also hides malformed paths - wrong!
            cur = cur[step]
        else:
            return default
    return cur` },
      mcq: { q: 'Which except clause gives "missing key OR missing index → default" but lets a malformed path crash?', options: ['<code>except LookupError</code>', '<code>except Exception</code>', '<code>except (KeyError, TypeError)</code>', 'bare <code>except:</code>'], answer: 0, explain: 'KeyError and IndexError both inherit from LookupError. TypeError is not a LookupError, so it propagates — exactly the behaviour we want. Exception/bare except would hide the bug.' },
      hints: [`<p>Hint 1: <code>cur = cur[step]</code> works for dicts, lists, tuples and anything with <code>__getitem__</code>. Let it do the work.</p>`, `<p>Hint 2: KeyError (dict) and IndexError (list) share the parent <b>LookupError</b>. Catch that one class.</p>`, `<p>Hint 3: Recipe: cur = data; try: for step in path: cur = cur[step] / except LookupError: return default / return cur. Edge cases: empty path → return data; a stored value of None is a real value, not "missing".</p>`],
      solution: {
        approach: `<p>EAFP plus the hierarchy: one subscript per step, one handler for the whole family of "not found" errors. TypeError (wrong kind of step) and anything else propagate untouched, so bugs stay visible.</p>`,
        code: { lang: 'python', run: true, code: `def deep_get(data, path, default=None):
    cur = data
    try:
        for step in path:
            cur = cur[step]          # dict key, list index, tuple index...
    except LookupError:              # KeyError OR IndexError
        return default
    return cur


data = {'users': [{'name': 'Asha', 'tags': ['admin']}], 'empty': None}
print(deep_get(data, ['users', 0, 'tags', 0]))        # admin
print(deep_get(data, ['users', -1, 'name']))          # Asha
print(deep_get(data, ['users', 5, 'name'], '?'))      # ?
print(deep_get(data, ['nope'], 'missing'))            # missing
print(deep_get(data, ['empty']))                      # None (a real value)
print(deep_get(data, []))                             # the whole dict
try:
    deep_get(data, ['users', 'name'])                 # malformed path
except TypeError as e:
    print('TypeError propagated:', e)` },
        dry: { head: ['step', 'cur before', 'cur[step]', 'outcome'], rows: [["'users'", 'whole dict', 'list of 1 user', 'continue'], ['5', 'list (len 1)', '<span class="c-r">IndexError</span>', 'caught as LookupError → return default'], ["'users', 'name'", 'list', '<span class="c-r">TypeError</span>', 'not a LookupError → propagates'], ["'users', 0, 'tags', 0", '…', "'admin'", 'return value']] },
        complexity: `<p>O(P) time for a path of length P (each subscript is O(1) for dicts and lists), O(1) extra space.</p>`,
        followUps: ['Support dotted string paths like "users.0.name" (careful: is "0" a key or an index?).', 'Add deep_set that creates missing dicts along the way.', 'Should an AttributeError on objects count as missing? How would you support getattr steps?']
      }
    }]
  });

  /* ================= TOPIC 3: Raising, custom exceptions, chaining, groups ================= */
  topics.push({
    title: 'Raising Exceptions, Custom Exception Classes, Chaining (raise from) and ExceptionGroup',
    analogy: `<p>A restaurant waiter gets a problem from the kitchen: "the oven broke". Telling the customer "oven broke" is useless to them. A good waiter says <b>"Sorry, your pizza is delayed"</b> (a new, meaningful error for the customer) — but writes <b>"cause: oven broke"</b> on the internal ticket so the manager can fix the real problem. That is <code>raise PizzaDelayed(...) from oven_error</code>: a clear error for the caller <b>plus</b> the original cause attached. And if three tables have problems at once, the waiter hands the manager <b>one folder with three complaints</b> — an <code>ExceptionGroup</code>.</p>`,
    explain: `<p>🟢 <b>Raising.</b> You signal a problem with <code>raise</code>. Raise an <b>instance</b> with a helpful message: <code>raise ValueError(f'age must be ≥ 0, got {age}')</code>. Pick the built-in that fits: wrong value → <code>ValueError</code>, wrong type → <code>TypeError</code>, missing key → <code>KeyError</code>, "not implemented yet" → <code>NotImplementedError</code>.</p>
<p><b>Re-raising.</b> Inside an <code>except</code> block, a bare <code>raise</code> re-throws the <b>same</b> exception with its original traceback — use it after logging or cleanup: <code>except Exception: log.exception('failed'); raise</code>.</p>
<p>🔵 <b>Custom exceptions.</b> When your code has its own failure cases, create classes. Rules of thumb:</p>
<ul>
<li>Inherit from <code>Exception</code> (never directly from BaseException). Name them <code>…Error</code>.</li>
<li>Give your package <b>one base class</b> (<code>class PaymentError(Exception)</code>) and specific children (<code>CardDeclinedError(PaymentError)</code>). Callers can catch everything from you with one clause, or one specific case.</li>
<li>Store useful data as <b>attributes</b> (amount, field name, HTTP status) and pass a readable message to <code>super().__init__(message)</code> so <code>str(e)</code> and tracebacks look right.</li>
<li>Multiple inheritance is allowed to fit in two families: <code>class InvalidAmountError(PaymentError, ValueError)</code> can be caught as either.</li>
</ul>
<p><b>Chaining — keeping the root cause.</b></p>
${H.table(['You write', 'Attribute set', 'Traceback says', 'Use when'], [['<code>raise New() from e</code>', '<code>__cause__ = e</code>', '"The above exception was the <b>direct cause</b> of the following exception"', 'translating a low-level error into your own (best practice)'], ['<code>raise New()</code> inside an except', '<code>__context__ = e</code> (automatic)', '"<b>During handling</b> of the above exception, another exception occurred"', 'usually an accident: a bug inside your handler'], ['<code>raise New() from None</code>', '<code>__suppress_context__ = True</code>', 'only the new exception', 'the old error is pure noise (e.g. KeyError behind an AttributeError)']])}
<p><b>Notes (3.11+).</b> <code>e.add_note('while loading user 42')</code> appends extra lines to the traceback without changing the exception type — great for adding context when re-raising.</p>
<p><b>ExceptionGroup and except* (3.11+).</b> Sometimes several things fail at once (10 parallel downloads, validating 5 form fields). <code>raise ExceptionGroup('3 fields invalid', [ValueError(...), TypeError(...)])</code> bundles them. <code>except* ValueError:</code> handles <b>only the ValueErrors inside</b> the group; the rest keep propagating. <code>asyncio.TaskGroup</code> raises exactly this.</p>
<p><b>assert is not error handling.</b> <code>assert x &gt; 0</code> raises <code>AssertionError</code>, but asserts are <b>removed</b> when Python runs with <code>-O</code>. Use them for "this can never happen" internal checks and in tests — never to validate user input.</p>`,
    clues: [
      '"translate a low-level error (KeyError, SQL error) into a domain error" → custom exception + <code>raise … from e</code>',
      '"During handling of the above exception, another exception occurred" in a traceback → implicit chaining; usually a bug in the handler or a missing <code>from</code>',
      '"callers should be able to catch all errors from my library" → one base exception class per package',
      '"the error should carry the amount / field / status code" → custom exception with attributes + <code>super().__init__(msg)</code>',
      '"report ALL validation errors, not just the first" / "several tasks failed" → <code>ExceptionGroup</code> + <code>except*</code>',
      '"log it and let it continue up" → bare <code>raise</code> inside the except block (keeps the original traceback)',
      '"input validation with assert" → wrong: asserts vanish under <code>python -O</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'A small custom exception hierarchy with data', code: `class PaymentError(Exception):
    """Base class: catch this to handle ANY payment problem."""


class CardDeclinedError(PaymentError):
    def __init__(self, card_last4, reason):
        self.card_last4 = card_last4
        self.reason = reason
        # A readable message for str(e) and tracebacks:
        super().__init__(f'card ****{card_last4} declined: {reason}')


class InvalidAmountError(PaymentError, ValueError):
    """Also a ValueError, so generic validation code can catch it too."""


def charge(amount, card_last4='4242'):
    if amount <= 0:
        raise InvalidAmountError(f'amount must be positive, got {amount}')
    if amount > 1000:
        raise CardDeclinedError(card_last4, 'limit exceeded')
    return f'charged {amount}'


for amt in (50, -5, 5000):
    try:
        print(charge(amt))
    except CardDeclinedError as e:
        print('declined ->', e, '| reason attr:', e.reason)
    except PaymentError as e:              # catches InvalidAmountError too
        print(type(e).__name__, '->', e, '| is ValueError?', isinstance(e, ValueError))` }, { lang: 'python', run: true, title: 'raise from, implicit context, from None, add_note', code: `import traceback


class ConfigError(Exception):
    pass


def load_port(cfg, mode):
    try:
        return int(cfg['port'])
    except KeyError as e:
        if mode == 'from':
            raise ConfigError('port is missing from config') from e
        if mode == 'implicit':
            raise ConfigError('port is missing from config')
        raise ConfigError('port is missing from config') from None


for mode in ('from', 'implicit', 'none'):
    try:
        load_port({}, mode)
    except ConfigError as err:
        print(f'--- mode={mode}')
        print('  __cause__           =', repr(err.__cause__))
        print('  __context__         =', repr(err.__context__))
        print('  __suppress_context__=', err.__suppress_context__)

# add_note (3.11+): extra context without changing the type
try:
    try:
        int('abc')
    except ValueError as e:
        e.add_note('while parsing row 17 of users.csv')
        raise
except ValueError as e:
    print(''.join(traceback.format_exception_only(e)).strip())` }, { lang: 'python', run: true, title: 'ExceptionGroup + except* (Python 3.11+)', code: `def validate(user):
    errors = []
    if not user.get('name'):
        errors.append(ValueError('name is required'))
    if not isinstance(user.get('age'), int):
        errors.append(TypeError('age must be an int'))
    elif user['age'] < 0:
        errors.append(ValueError('age must be >= 0'))
    if '@' not in user.get('email', ''):
        errors.append(ValueError('email looks invalid'))
    if errors:
        raise ExceptionGroup('user is invalid', errors)


try:
    validate({'name': '', 'age': 'ten', 'email': 'nope'})
except* ValueError as group:          # gets a sub-group with ONLY the ValueErrors
    for e in group.exceptions:
        print('value problem:', e)
except* TypeError as group:           # the TypeErrors, handled separately
    for e in group.exceptions:
        print('type problem :', e)` }],
    codeTitle: ['Custom exceptions', 'Exception chaining', 'Exception groups'],
    viz: [{
      title: 'raise ... from: how the exception chain is built',
      input: 'from',
      inputLabel: 'Mode: from · implicit · none',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (['from', 'implicit', 'none'].indexOf(mode) < 0) throw new Error('Type one of: from, implicit, none');
        var raiseLine = mode === 'from' ? "        raise ConfigError('port missing') from e" : mode === 'implicit' ? "        raise ConfigError('port missing')" : "        raise ConfigError('port missing') from None";
        var code = ['def load_port(cfg):', '    try:', "        return int(cfg['port'])", '    except KeyError as e:', raiseLine, '', 'load_port({})'].join('\n');
        var frames = [];
        frames.push(fr('Call <code>load_port({})</code> with an empty config.', [cp(code, 7), { type: 'stack', label: 'Exceptions alive', items: ['(none)'] }]));
        frames.push(fr("<code>cfg['port']</code> raises <b>KeyError('port')</b>. It is caught by <code>except KeyError as e</code>.", [cpm(code, { 3: 'bad', 4: 'ok' }), { type: 'stack', label: 'Exceptions alive', items: ["KeyError('port')"], hl: { 0: 'bad' } }]));
        frames.push(fr('Inside the handler we raise a <b>new</b> ConfigError. Python <b>always</b> records the exception currently being handled in the new one\'s <code>__context__</code> — automatically.', [cp(code, 5, 'cur'), { type: 'stack', label: 'Exceptions alive', items: ["KeyError('port')", "ConfigError('port missing')"], hl: { 1: 'cur' } }, vp({ '__context__': "KeyError('port')" }, '__context__', 'win', 'ConfigError attributes')]));
        var attrs = { '__context__': "KeyError('port')", '__cause__': 'None', '__suppress_context__': 'False' };
        var expl;
        if (mode === 'from') { attrs.__cause__ = "KeyError('port')"; attrs.__suppress_context__ = 'True'; expl = '<code>from e</code> sets <code>__cause__ = e</code> (and, as a side effect, <code>__suppress_context__ = True</code>, so only the cause is shown — once).'; }
        else if (mode === 'none') { attrs.__suppress_context__ = 'True'; expl = '<code>from None</code> sets <code>__cause__ = None</code> and <code>__suppress_context__ = True</code>: the KeyError is still stored in __context__ but hidden from the traceback.'; }
        else { expl = 'No <code>from</code>: <code>__cause__</code> stays None and the context is <b>not</b> suppressed.'; }
        frames.push(fr(expl, [cp(code, 5, 'cur'), vp(attrs, mode === 'implicit' ? '__context__' : '__cause__,__suppress_context__', 'sel', 'ConfigError attributes')]));
        var chain = mode === 'none' ? ["ConfigError('port missing')"] : ["KeyError('port')", "ConfigError('port missing')"];
        frames.push(fr('The ConfigError escapes. When printing, Python follows the chain backwards and prints the <b>oldest first</b>.', [{ type: 'list', label: 'Chain printed (oldest → newest)', values: chain, hl: (function () { var h = {}; h[chain.length - 1] = 'bad'; return h; })() }]));
        var tb;
        if (mode === 'from') tb = "Traceback (most recent call last):\n  File \"app.py\", line 3, in load_port\nKeyError: 'port'\n\n<b>The above exception was the direct cause of the following exception:</b>\n\nTraceback (most recent call last):\n  File \"app.py\", line 5, in load_port\nConfigError: port missing";
        else if (mode === 'implicit') tb = "Traceback (most recent call last):\n  File \"app.py\", line 3, in load_port\nKeyError: 'port'\n\n<b class=\"c-r\">During handling of the above exception, another exception occurred:</b>\n\nTraceback (most recent call last):\n  File \"app.py\", line 5, in load_port\nConfigError: port missing";
        else tb = "Traceback (most recent call last):\n  File \"app.py\", line 5, in load_port\nConfigError: port missing";
        frames.push(fr(mode === 'from' ? '<span class="c-g">Best practice:</span> the reader sees a clear domain error AND the real root cause, with a message saying it was deliberate.' : mode === 'implicit' ? '<span class="c-y">Looks like an accident:</span> "During handling…" suggests your handler itself crashed. Add <code>from e</code> to say it was intentional.' : '<span class="c-b">Clean:</span> only the domain error. Good when the low-level error adds nothing — but you lose debugging info, so use sparingly.', [tx('<pre>' + tb + '</pre>', 'Traceback text')]));
        return frames;
      }
    }, {
      title: 'ExceptionGroup + except*: each handler takes its share of the group',
      input: 'ValueError TypeError ValueError KeyError',
      inputLabel: 'Exceptions inside the group (ValueError, TypeError, KeyError, IndexError, OSError) — max 8',
      gen: function (input) {
        var allowed = { ValueError: 1, TypeError: 1, KeyError: 1, IndexError: 1, OSError: 1 };
        var items = words(input);
        if (!items.length || items.length > 8 || items.some(function (x) { return !allowed[x]; })) throw new Error('List 1-8 of: ValueError TypeError KeyError IndexError OSError');
        var code = ['try:', '    raise ExceptionGroup("batch failed", errors)', 'except* ValueError as g:', '    print("values:", len(g.exceptions))', 'except* LookupError as g:', '    print("lookups:", len(g.exceptions))'].join('\n');
        var labels = items.map(function (x, i) { return x + '#' + (i + 1); });
        var remaining = labels.slice();
        var frames = [], out = [];
        frames.push(fr('Several operations failed. Instead of keeping only the first error, we bundle <b>all ' + items.length + '</b> into one <code>ExceptionGroup</code>.', [cp(code, 2, 'bad'), { type: 'array', label: 'ExceptionGroup.exceptions', values: labels.slice() }]));
        var clauses = [{ line: 3, name: 'ValueError', match: { ValueError: 1 } }, { line: 5, name: 'LookupError', match: { KeyError: 1, IndexError: 1 } }];
        clauses.forEach(function (cl) {
          var hl = {}, taken = [];
          remaining.forEach(function (lab, i) { var t = lab.split('#')[0]; if (cl.match[t]) { hl[i] = 'ok'; taken.push(lab); } else hl[i] = 'cur'; });
          frames.push(fr('<code>except* ' + cl.name + '</code> calls <code>group.split(' + cl.name + ')</code>: the matching exceptions (green) form a sub-group for this handler; the rest stay in flight.' + (taken.length ? '' : ' Nothing matches, so this handler is <b>skipped</b>.'), [cp(code, cl.line, taken.length ? 'ok' : 'done'), { type: 'array', label: 'still unhandled', values: remaining.slice(), hl: hl }]));
          if (taken.length) {
            out.push((cl.name === 'ValueError' ? 'values: ' : 'lookups: ') + taken.length);
            remaining = remaining.filter(function (l) { return taken.indexOf(l) < 0; });
            frames.push(fr('Handler body runs <b>once</b> with a group of ' + taken.length + '. Unlike plain except, <b>several</b> except* clauses can run for one raise.', [cp(code, cl.line + 1, 'ok'), { type: 'array', label: 'still unhandled', values: remaining.length ? remaining.slice() : ['(none)'] }, outBox(out)]));
          }
        });
        if (remaining.length) frames.push(fr('<span class="c-r">Leftovers</span> (' + remaining.join(', ') + ') are re-raised automatically as a new ExceptionGroup containing only them.', [{ type: 'array', label: 'propagates to the caller', values: remaining.slice(), hl: (function () { var h = {}; remaining.forEach(function (_, i) { h[i] = 'bad'; }); return h; })() }, outBox(out)]));
        else frames.push(fr('<span class="c-g">Everything was handled</span>; nothing propagates.', [{ type: 'array', label: 'still unhandled', values: ['(none)'], hl: { 0: 'ok' } }, outBox(out)]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: bare raise keeps the original', html: `<p>A bare <code>raise</code> re-throws the very same object, so identity is preserved. Output: ${H.c('g', 'logged: boom')} then ${H.c('g', 'same object? True')}.</p>`, code: { lang: 'python', run: true, code: `original = None
try:
    try:
        original = RuntimeError('boom')
        raise original
    except RuntimeError as e:
        print('logged:', e)
        raise                     # re-raise the SAME exception
except RuntimeError as e2:
    print('same object?', e2 is original)` } },
      { title: 'Forgetting super().__init__ breaks str(e)', html: `<p>If your <code>__init__</code> does not pass a message up, <code>str(e)</code> is empty and <code>e.args</code> is wrong — tracebacks show a blank message. (Python still stores the constructor args in <code>args</code> via <code>__new__</code>, so you see the raw tuple, not your nice message.)</p>`, code: { lang: 'python', run: true, code: `class BadError(Exception):
    def __init__(self, field):
        self.field = field            # forgot super().__init__(...)

class GoodError(Exception):
    def __init__(self, field):
        self.field = field
        super().__init__(f'invalid field: {field}')

print(repr(str(BadError('age'))))     # 'age'  (raw args, no nice message)
print(repr(str(GoodError('age'))))    # 'invalid field: age'` } },
      { title: 'Library pattern: one base class, catch at the boundary', html: `<p>Inside the library, raise specific errors. At the HTTP boundary, map them to status codes with <b>one</b> table.</p>${H.table(['exception', 'HTTP status'], [['<code>NotFoundError(AppError)</code>', '404'], ['<code>PermissionDeniedError(AppError)</code>', '403'], ['<code>ValidationError(AppError)</code>', '422'], ['any other <code>Exception</code>', '500 + log traceback']])}`, code: { lang: 'python', run: true, code: `class AppError(Exception):
    status = 500

class NotFoundError(AppError):
    status = 404

class ValidationError(AppError):
    status = 422

def handle(request_fn):
    try:
        return 200, request_fn()
    except AppError as e:            # all domain errors: use their status
        return e.status, str(e)
    except Exception:                # real bugs: 500 (and log it in real life)
        return 500, 'internal error'

def get_user():
    raise NotFoundError('user 7 not found')

print(handle(get_user))
print(handle(lambda: 1 / 0))
print(handle(lambda: 'ok'))` } },
      { title: 'assert vanishes under -O', html: `<p><code>python -O app.py</code> strips every assert statement, so <code>assert amount &gt; 0</code> protects nothing in production. Raise a real exception for inputs; keep assert for internal invariants and tests.</p>${H.table(['statement', 'normal run', 'python -O'], [['<code>assert amount &gt; 0</code>', 'AssertionError if false', H.c('r', 'skipped entirely')], ['<code>if amount &lt;= 0: raise ValueError(...)</code>', 'ValueError if false', H.c('g', 'still checked')]])}` }
    ],
    deepDive: `<p>🟣 <b>What raise does internally.</b> <code>raise X</code> with a class instantiates it (<code>X()</code>). The interpreter then sets <code>__context__</code> to the exception currently being handled (if any, and if it is not the same object), attaches the traceback, and starts unwinding. <code>raise A from B</code> sets <code>A.__cause__ = B</code> and <code>A.__suppress_context__ = True</code>. The default traceback printer shows <code>__cause__</code> if set; otherwise shows <code>__context__</code> unless suppressed. Chains can be arbitrarily long; Python guards against cycles when printing.</p>
<p><b>Pickling custom exceptions.</b> Exceptions are pickled via <code>(type, self.args)</code>. If your <code>__init__</code> takes different parameters than what ends up in <code>args</code>, unpickling (e.g. when a <code>multiprocessing</code> or <code>concurrent.futures.ProcessPoolExecutor</code> worker sends the error back) fails with a confusing TypeError. Fix: make <code>args</code> match the constructor (pass the original params to <code>super().__init__</code>) or implement <code>__reduce__</code>. Dataclass-style exceptions need the same care.</p>
<p><b>ExceptionGroup details.</b> <code>BaseExceptionGroup</code> can hold BaseExceptions; <code>ExceptionGroup</code> only Exceptions. <code>eg.split(T)</code> returns <code>(match, rest)</code> preserving nesting; <code>eg.subgroup(pred)</code> filters. You cannot mix <code>except</code> and <code>except*</code> in one try; <code>break/continue/return</code> are not allowed inside except*. A plain <code>except ValueError</code> does <b>not</b> match an ExceptionGroup containing ValueErrors — that is why libraries switching to groups (asyncio.TaskGroup, Trio, anyio) is a breaking change for callers.</p>
<p><b>Warnings vs exceptions.</b> For "this still works but is deprecated", use <code>warnings.warn('…', DeprecationWarning, stacklevel=2)</code> — not an exception. Tests can turn warnings into errors with <code>-W error</code> or pytest's <code>filterwarnings</code>.</p>
<p><b>Production reality.</b> Error messages are an API: include the bad value and what was expected (<code>f'expected 1-65535, got {port!r}'</code>), never secrets (passwords, tokens) — tracebacks end up in logs and error trackers like Sentry.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> generating a tidy exception hierarchy, the HTTP-mapping middleware and the tests for it is now a 30-second job. Ask the model to "list the failure modes of this function and propose one exception class per actionable case" — a good design conversation starter.</p>
<p><b>Where AI goes wrong:</b> it forgets <code>from e</code> (producing confusing "During handling…" traces), writes custom exceptions that break pickling, over-engineers 15 exception classes nobody catches, or puts secrets into messages. It also sometimes writes <code>raise Exception('...')</code> — impossible for callers to catch selectively.</p>
<p><b>What you must still own:</b> deciding which failures are <i>actionable</i> for the caller (deserve their own class), what the public base class is, and what data each error carries.</p>`,
    problems: [{
      title: 'Bank Account Errors: A Custom Exception Hierarchy',
      level: 'Medium', tags: ['custom exceptions', 'raise from', 'design'], companies: ['Stripe', 'JPMorgan', 'Revolut'],
      statement: `<p>Design exceptions for a tiny bank module and implement two functions.</p><ul><li><code>BankError(Exception)</code> — base class.</li><li><code>InsufficientFundsError(BankError)</code> with attributes <code>balance</code>, <code>amount</code> and <code>shortfall</code>, message like <code>"need 30 more (balance 70, amount 100)"</code>.</li><li><code>AccountNotFoundError(BankError, KeyError)</code>.</li></ul><p><code>withdraw(accounts, acc_id, amount)</code> returns the new balance, raising <code>ValueError</code> for amount ≤ 0, <code>AccountNotFoundError</code> (chained <b>from</b> the original KeyError) for an unknown id, or <code>InsufficientFundsError</code>.</p>`,
      constraints: `accounts is a dict id → int balance. Do not modify balances when an error is raised.`,
      example: `<p><code>accounts = {'a1': 70}</code></p><ul><li><code>withdraw(accounts, 'a1', 20)</code> → ${H.c('g', '50')}</li><li><code>withdraw(accounts, 'a1', 100)</code> → ${H.c('r', 'InsufficientFundsError: need 50 more (balance 50, amount 100)')}, <code>e.shortfall == 50</code></li><li><code>withdraw(accounts, 'zz', 5)</code> → ${H.c('r', 'AccountNotFoundError')} whose <code>__cause__</code> is the KeyError.</li></ul>`,
      brute: { why: `<p>Returning error codes or strings (<code>return -1</code>, <code>return 'no money'</code>) forces every caller to remember to check, mixes errors with real values (is -1 a balance?), and carries no data. A single generic <code>raise Exception('error')</code> cannot be caught selectively.</p>`, code: `def withdraw_codes(accounts, acc_id, amount):
    if amount <= 0:
        return 'bad amount'
    if acc_id not in accounts:
        return 'no account'
    if accounts[acc_id] < amount:
        return 'no money'
    accounts[acc_id] -= amount
    return accounts[acc_id]       # caller cannot tell errors from balances easily` },
      mcq: { q: 'Why make <code>AccountNotFoundError</code> also inherit from <code>KeyError</code>?', options: ['So old code that catches KeyError (or LookupError) keeps working', 'Because exceptions must have two parents', 'To make it faster', 'So that it cannot be caught by except BankError'], answer: 0, explain: 'Multiple inheritance places it in both families: callers can catch it as a BankError (new code) or as a KeyError/LookupError (existing code that expected a dict miss).' },
      hints: [`<p>Hint 1: Check the cheap, caller-mistake case first: amount ≤ 0 → <code>ValueError</code> with the bad value in the message.</p>`, `<p>Hint 2: Look up the balance with EAFP: <code>try: balance = accounts[acc_id] except KeyError as e: raise AccountNotFoundError(acc_id) from e</code>.</p>`, `<p>Hint 3: Compute <code>shortfall = amount - balance</code> in the exception's <code>__init__</code>, then call <code>super().__init__(message)</code>. Only subtract after all checks pass, so a failed call never changes state.</p>`],
      solution: {
        approach: `<p>One base class, specific subclasses that carry data, messages built in <code>__init__</code>, translation of the low-level KeyError with <code>raise … from e</code>, and "validate everything, then mutate" so errors leave no half-done state.</p>`,
        code: { lang: 'python', run: true, code: `class BankError(Exception):
    """Base class for every error raised by this module."""


class InsufficientFundsError(BankError):
    def __init__(self, balance, amount):
        self.balance = balance
        self.amount = amount
        self.shortfall = amount - balance
        super().__init__(f'need {self.shortfall} more (balance {balance}, amount {amount})')


class AccountNotFoundError(BankError, KeyError):
    def __init__(self, acc_id):
        self.acc_id = acc_id
        super().__init__(f'no account {acc_id!r}')

    def __str__(self):                 # KeyError.__str__ would add quotes; keep it readable
        return self.args[0]


def withdraw(accounts, acc_id, amount):
    if amount <= 0:
        raise ValueError(f'amount must be positive, got {amount}')
    try:
        balance = accounts[acc_id]
    except KeyError as e:
        raise AccountNotFoundError(acc_id) from e
    if balance < amount:
        raise InsufficientFundsError(balance, amount)
    accounts[acc_id] = balance - amount   # mutate only after all checks
    return accounts[acc_id]


accounts = {'a1': 70}
print(withdraw(accounts, 'a1', 20))       # 50
for args in [('a1', 100), ('zz', 5), ('a1', 0)]:
    try:
        withdraw(accounts, *args)
    except InsufficientFundsError as e:
        print('Insufficient:', e, '| shortfall =', e.shortfall)
    except BankError as e:
        print(type(e).__name__ + ':', e, '| cause =', repr(e.__cause__), '| is KeyError?', isinstance(e, KeyError))
    except ValueError as e:
        print('ValueError:', e)
print(accounts)                            # {'a1': 50} unchanged by failures` },
        dry: { head: ['call', 'check', 'result', 'accounts after'], rows: [["('a1', 20)", 'amount ok, found 70, 70 ≥ 20', 'returns 50', "{'a1': 50}"], ["('a1', 100)", 'found 50, 50 &lt; 100', '<span class="c-r">InsufficientFundsError</span>, shortfall 50', "{'a1': 50}"], ["('zz', 5)", 'KeyError caught', '<span class="c-r">AccountNotFoundError</span> from KeyError', "{'a1': 50}"], ["('a1', 0)", 'amount ≤ 0', '<span class="c-r">ValueError</span>', "{'a1': 50}"]] },
        complexity: `<p>O(1) per call. The design value is in the API: callers can catch <code>BankError</code> broadly, <code>InsufficientFundsError</code> specifically (and read <code>shortfall</code>), or <code>KeyError</code> for legacy code.</p>`,
        followUps: ['Add transfer(src, dst, amount) that is atomic — if the deposit fails, the withdrawal is rolled back.', 'Make the exceptions picklable so a ProcessPoolExecutor can send them back.', 'Validate a batch of 1,000 withdrawals and report every failure with an ExceptionGroup.']
      }
    }]
  });

  /* ================= TOPIC 4: EAFP vs LBYL ================= */
  topics.push({
    title: 'EAFP vs LBYL: "Just Try It" vs "Check First"',
    analogy: `<p>Two ways to enter a friend's flat. <b>LBYL</b> ("Look Before You Leap"): phone first — "are you home? is the door unlocked?" — then walk over. But between the call and your arrival they might go out. <b>EAFP</b> ("Easier to Ask Forgiveness than Permission"): just walk over and try the door; if it is locked, deal with it then. Python culture prefers EAFP: <b>try the operation, handle the failure</b> — because the check and the action can drift apart, and because the action itself is usually the most accurate check.</p>`,
    explain: `<p>🟢 <b>Two styles for the same job.</b></p>
${H.table(['', 'LBYL (check first)', 'EAFP (try, then handle)'], [['dict key', '<code>if k in d: v = d[k]</code>', '<code>try: v = d[k]</code><br><code>except KeyError: …</code>'], ['attribute', '<code>if hasattr(o, "x"): o.x</code>', '<code>try: o.x</code><br><code>except AttributeError: …</code>'], ['file', '<code>if os.path.exists(p): open(p)</code>', '<code>try: open(p)</code><br><code>except FileNotFoundError: …</code>'], ['number', '<code>if s.isdigit(): int(s)</code>', '<code>try: int(s)</code><br><code>except ValueError: …</code>']])}
<p>🔵 <b>Why Python leans EAFP.</b></p>
<ul>
<li><b>No race conditions.</b> Between <code>exists()</code> and <code>open()</code>, another process can delete the file (a <b>TOCTOU</b> bug: Time Of Check to Time Of Use). With EAFP, the open <i>is</i> the check — atomic.</li>
<li><b>The real operation is the best validator.</b> <code>s.isdigit()</code> is not the same rule as <code>int(s)</code> (it rejects <code>"-5"</code>, accepts <code>"²"</code>). Let the real code decide.</li>
<li><b>Duck typing.</b> "Does it support <code>[key]</code>?" is better answered by trying than by <code>isinstance(x, dict)</code>, which rejects perfectly good mapping types.</li>
<li><b>Speed on the happy path.</b> Since 3.11 a try block costs nothing until something is raised; LBYL does the lookup <b>twice</b> on success (<code>in</code> + <code>[]</code>).</li>
</ul>
<p><b>When LBYL is better:</b></p>
<ul>
<li>The failure is <b>common</b> (say, more than ~10–20% of calls) — raising is much slower than an <code>if</code>.</li>
<li>The action has <b>side effects</b> you cannot undo halfway (sending an email, charging a card): validate everything first.</li>
<li>A cheap built-in exists that does both: <code>d.get(k, default)</code>, <code>d.setdefault</code>, <code>collections.defaultdict</code>, <code>getattr(o, 'x', None)</code>, <code>next(it, None)</code>. These beat both styles — one lookup, no exception.</li>
</ul>
<p><b>Keep EAFP honest:</b> the try block must contain only the operation you are "asking forgiveness" for, and the except must name the exact error. <code>try: big_function() except KeyError:</code> will also hide a KeyError <i>bug</i> deep inside <code>big_function</code>.</p>`,
    clues: [
      '"check if the file exists, then open it" → TOCTOU race; use EAFP (<code>try: open</code> / <code>except FileNotFoundError</code>)',
      '"Pythonic way to read a key that may be missing" → <code>d.get(k, default)</code>, or try/except KeyError when the miss is rare and needs real handling',
      '"most lookups hit" → EAFP (one lookup, zero-cost try); "most lookups miss" → LBYL or <code>.get</code> (raising is expensive)',
      '"accept anything that behaves like a dict/sequence" → duck typing + EAFP instead of isinstance checks',
      '"validate before charging the card / sending the email" → LBYL for irreversible side effects',
      '"hasattr vs try/except AttributeError" → hasattr itself is implemented as getattr + catching AttributeError'
    ],
    code: [{ lang: 'python', run: true, title: 'Four ways to count words — and how fast each is', code: `import timeit
from collections import Counter, defaultdict

words = ('the cat and the hat and the bat ' * 2000).split()

def lbyl():
    d = {}
    for w in words:
        if w in d:            # lookup #1
            d[w] += 1         # lookup #2 (+ store)
        else:
            d[w] = 1
    return d

def eafp():
    d = {}
    for w in words:
        try:
            d[w] += 1         # one lookup; KeyError only on first sighting
        except KeyError:
            d[w] = 1
    return d

def with_get():
    d = {}
    for w in words:
        d[w] = d.get(w, 0) + 1
    return d

def with_counter():
    return Counter(words)     # C-accelerated counting loop

assert lbyl() == eafp() == with_get() == dict(with_counter())
for fn in (lbyl, eafp, with_get, with_counter):
    t = timeit.timeit(fn, number=20)
    print(f'{fn.__name__:13} {t * 1000:7.1f} ms')
print('(numbers vary by machine; Counter is usually fastest)')` }, { lang: 'python', run: true, title: 'When misses are common, exceptions get expensive', code: `import timeit

d = {i: i for i in range(100)}
keys_hit = list(range(100)) * 50          # 100% hits
keys_miss = list(range(100, 200)) * 50    # 100% misses

def eafp(keys):
    total = 0
    for k in keys:
        try:
            total += d[k]
        except KeyError:
            pass
    return total

def lbyl(keys):
    total = 0
    for k in keys:
        if k in d:
            total += d[k]
    return total

for name, keys in (('all hits', keys_hit), ('all misses', keys_miss)):
    te = timeit.timeit(lambda: eafp(keys), number=20)
    tl = timeit.timeit(lambda: lbyl(keys), number=20)
    print(f'{name:10}  EAFP {te * 1000:6.1f} ms   LBYL {tl * 1000:6.1f} ms')` }],
    codeTitle: ['Counting words four ways', 'Hit rate decides the winner'],
    viz: [{
      title: 'Cost race: LBYL vs EAFP vs dict.get as hits and misses arrive',
      input: 'a b c | a b z a q c',
      inputLabel: 'dict keys | lookups (space separated, max 12 lookups)',
      gen: function (input) {
        var parts = String(input || '').split('|');
        if (parts.length !== 2) throw new Error('Format: keys | lookups   e.g.  a b c | a z c');
        var keys = words(parts[0]), looks = words(parts[1]);
        if (!keys.length || !looks.length) throw new Error('Give at least one key and one lookup');
        if (looks.length > 12 || keys.length > 10) throw new Error('Use at most 10 keys and 12 lookups');
        var RAISE = 10;
        var cost = { lbyl: 0, eafp: 0, get: 0 };
        var frames = [], hits = 0;
        var entries = keys.map(function (k, i) { return [k, i + 1]; });
        frames.push(fr('A dict with ' + keys.length + ' keys. Each strategy pays <b>1 unit per hash lookup</b> and roughly <b>' + RAISE + ' units to raise + catch</b> a KeyError (a rough CPython ballpark: creating the exception object and unwinding is far slower than a lookup).', [{ type: 'map', label: 'd', entries: entries }, { type: 'bars', label: 'total cost so far', values: [0, 0, 0], idxLabels: ['LBYL', 'EAFP', 'get'] }]));
        looks.forEach(function (k, i) {
          var hit = keys.indexOf(k) >= 0;
          var dl, de, dg = 1;
          if (hit) { hits++; dl = 2; de = 1; } else { dl = 1; de = 1 + RAISE; }
          cost.lbyl += dl; cost.eafp += de; cost.get += dg;
          var hl = {}; if (hit) hl[k] = 'ok';
          var best = Math.min(cost.lbyl, cost.eafp, cost.get);
          var bh = {}; [cost.lbyl, cost.eafp, cost.get].forEach(function (c, j) { if (c === best) bh[j] = 'ok'; });
          frames.push(fr('Lookup ' + (i + 1) + ': <code>' + esc(k) + '</code> is a ' + (hit ? '<span class="c-g">HIT</span>. LBYL pays 2 (<code>in</code> then <code>[]</code>), EAFP pays 1 (no exception), get pays 1.' : '<span class="c-r">MISS</span>. LBYL pays 1 (<code>in</code> says no), EAFP pays 1 + ' + RAISE + ' (KeyError raised and caught), get pays 1.'), [
            { type: 'map', label: 'd', entries: entries, hl: hl },
            { type: 'table', label: 'This lookup', columns: ['strategy', 'code', 'cost'], rows: [['LBYL', 'if k in d: d[k]', '+' + dl], ['EAFP', 'try: d[k] / except KeyError', '+' + de], ['get', 'd.get(k)', '+' + dg]], hl: hit ? { 1: 'ok' } : { 1: 'bad' } },
            { type: 'bars', label: 'total cost so far (lower is better)', values: [cost.lbyl, cost.eafp, cost.get], idxLabels: ['LBYL', 'EAFP', 'get'], hl: bh }
          ]));
        });
        var rate = Math.round(hits * 100 / looks.length);
        frames.push(fr('Hit rate <b>' + rate + '%</b>. ' + (cost.eafp < cost.lbyl ? 'With mostly hits, <b>EAFP beats LBYL</b>.' : cost.eafp > cost.lbyl ? 'With many misses, <b>EAFP loses</b>: every miss pays for an exception.' : 'EAFP and LBYL tie here.') + ' <code>dict.get</code> is cheapest whenever a default value is all you need. Rule: choose by expected hit rate and by what a miss <i>means</i>.', [{ type: 'bars', label: 'final cost', values: [cost.lbyl, cost.eafp, cost.get], idxLabels: ['LBYL', 'EAFP', 'get'] }, vp({ lookups: looks.length, hits: hits, 'hit rate': rate + '%' })]));
        return frames;
      }
    }, {
      title: 'TOCTOU: why "check, then open" is a race',
      gen: function () {
        var cols = ['time', 'Process A (your code)', 'Process B (log rotation)', 'file exists?'];
        var rows = [['t1', 'if os.path.exists(p):  → True', '', 'yes']];
        var frames = [];
        frames.push(fr('LBYL: process A checks that the file exists. It does.', [cp("if os.path.exists(p):\n    with open(p) as f:\n        data = f.read()", 1, 'ok', 'Process A — LBYL'), { type: 'table', label: 'Timeline', columns: cols, rows: rows.slice() }]));
        rows.push(['t2', '(scheduler pauses A)', 'os.remove(p)', 'no']);
        frames.push(fr('The OS pauses A for a moment. Meanwhile process B deletes (rotates) the file. A has no idea.', [cp("if os.path.exists(p):\n    with open(p) as f:\n        data = f.read()", 1, 'done', 'Process A — LBYL'), { type: 'table', label: 'Timeline', columns: cols, rows: rows.slice(), hl: { 1: 'bad' } }]));
        rows.push(['t3', 'open(p)  → FileNotFoundError 💥', '', 'no']);
        frames.push(fr('A resumes and calls <code>open(p)</code> — the check is now <b>stale</b>. Crash, despite the "safety" check. Rare in tests, real in production.', [cp("if os.path.exists(p):\n    with open(p) as f:\n        data = f.read()", 2, 'bad', 'Process A — LBYL'), { type: 'table', label: 'Timeline', columns: cols, rows: rows.slice(), hl: { 2: 'bad' } }]));
        frames.push(fr('EAFP: the <code>open</code> call <b>is</b> the check, done atomically by the OS. Whatever B does, A either gets the file or a FileNotFoundError it handles.', [cp("try:\n    with open(p) as f:\n        data = f.read()\nexcept FileNotFoundError:\n    data = ''          # handled, no race window", 2, 'ok', 'Process A — EAFP'), { type: 'table', label: 'Timeline', columns: ['time', 'Process A (EAFP)', 'Process B', 'outcome'], rows: [['t1', 'open(p)', '', 'opened OR FileNotFoundError'], ['t2', 'read…', 'os.remove(p)', 'A still holds an open file handle (on POSIX the data stays readable)']], hl: { 0: 'ok', 1: 'ok' } }]));
        frames.push(fr('Same idea elsewhere: <code>os.makedirs(p, exist_ok=True)</code> instead of "if not exists: mkdir", <code>open(p, "x")</code> (fail if exists) instead of "if not exists: create", and database UPSERTs instead of "SELECT then INSERT".', [tx('<b>Rule:</b> when another actor can change the world between your check and your action, let the action itself be the check.', 'Takeaway')]));
        return frames;
      }
    }],
    examples: [
      { title: 'hasattr is EAFP in disguise', html: `<p><code>hasattr(obj, name)</code> literally calls <code>getattr</code> and returns False if it raises <b>AttributeError</b>. So a property that has a bug raising AttributeError inside looks like "attribute missing" — a classic confusing bug. Output: ${H.c('r', 'False')}.</p>`, code: { lang: 'python', run: true, code: `class User:
    @property
    def email(self):
        return self.profile.email      # bug: self.profile does not exist

u = User()
print(hasattr(u, 'email'))             # False - the real bug is hidden!
try:
    u.email
except AttributeError as e:
    print('real cause:', e)` } },
      { title: 'Duck typing: accept anything indexable', html: `<p>An EAFP <code>first()</code> works on lists, tuples, strings, ranges and any custom class with <code>__getitem__</code>. An <code>isinstance(x, list)</code> version would reject all but one. Output: ${H.c('g', "1 'h' 0 None")}.</p>`, code: { lang: 'python', run: true, code: `def first(seq, default=None):
    try:
        return seq[0]
    except (IndexError, KeyError):
        return default

print(first([1, 2]), repr(first('hi')), first(range(5)), first([]))` } },
      { title: 'Best of both: the built-in that does it for you', html: `${H.table(['task', 'LBYL', 'EAFP', 'idiomatic built-in'], [['default for missing key', 'if k in d', 'try/except KeyError', '<code>d.get(k, 0)</code>'], ['group into lists', 'if k not in d: d[k] = []', 'try/except KeyError', '<code>defaultdict(list)</code> or <code>d.setdefault(k, [])</code>'], ['optional attribute', 'hasattr', 'try/except AttributeError', '<code>getattr(o, "x", None)</code>'], ['first item or None', 'if it: …', 'try/except StopIteration', '<code>next(iter(x), None)</code>'], ['create dir', 'if not exists: mkdir', 'try/except FileExistsError', '<code>os.makedirs(p, exist_ok=True)</code>']])}` },
      { title: 'LBYL for irreversible actions', html: `<p>Before charging a card, sending 10,000 emails or deleting files, <b>validate everything first</b> — once half the emails are out, "asking forgiveness" is too late. A mix is common: LBYL validation up front, EAFP around the actual I/O.</p>`, code: { lang: 'python', run: true, code: `def send_campaign(recipients, send):
    # LBYL: validate the whole batch BEFORE any side effect
    bad = [r for r in recipients if '@' not in r]
    if bad:
        raise ValueError(f'invalid addresses: {bad}')
    sent = 0
    for r in recipients:
        try:                       # EAFP around each real I/O call
            send(r)
            sent += 1
        except ConnectionError:
            print('retry later:', r)
    return sent

def fake_send(addr):
    if addr.startswith('down'):
        raise ConnectionError(addr)

print(send_campaign(['a@x.com', 'down@x.com', 'b@x.com'], fake_send))
try:
    send_campaign(['a@x.com', 'oops'], fake_send)
except ValueError as e:
    print(e)` } }
    ],
    deepDive: `<p>🟣 <b>Actual costs (CPython 3.11–3.13, ballpark).</b> A dict lookup hit is ~20–40 ns. Entering a try block is ~0 ns (exception tables). Raising and catching a built-in exception in the same frame is roughly 100–300 ns — about 5–15× a lookup — and more when it unwinds several frames or builds long tracebacks. So EAFP is faster when misses are rare, slower when they are frequent. Always measure with <code>timeit</code> on your data; the gap changes between versions.</p>
<p><b>Atomicity, more precisely.</b> EAFP avoids TOCTOU only when the operation itself is atomic at the OS/DB level: <code>open(p, 'x')</code> uses <code>O_CREAT|O_EXCL</code>; <code>os.replace</code> is an atomic rename on the same filesystem; <code>os.mkdir</code> fails atomically if the dir exists. Python-level sequences like <code>d[k] += 1</code> are <b>not</b> atomic across threads (read, add, store are separate bytecodes — even with the GIL, and certainly in free-threaded 3.13t+ builds) — EAFP does not fix data races; locks do.</p>
<p><b>Hidden-exception traps.</b> <code>hasattr</code>, <code>getattr(o, n, default)</code>, <code>dict.get</code> on a dict subclass with a buggy <code>__missing__</code>, and iteration (StopIteration) are all EAFP internally. Since PEP 479 (3.7), a StopIteration leaking out of a generator body becomes a RuntimeError, precisely because silently treating a bug as "end of data" was so dangerous.</p>
<p><b>Security angle.</b> TOCTOU is a classic privilege-escalation bug class (check permissions on a path, attacker swaps a symlink, privileged code opens the target). Mitigations: open first and then <code>os.fstat</code> the file descriptor; use <code>dir_fd</code>/<code>follow_symlinks=False</code> parameters; prefer atomic primitives.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> both styles are trivial to generate, so the skill shifts to <b>choosing</b>: ask "what is the expected hit rate, can another actor change state between check and use, and is the action reversible?"</p>
<p><b>Where AI goes wrong:</b> LLM-written code often defaults to LBYL with <code>os.path.exists</code> before <code>open</code> (TOCTOU), or to huge EAFP blocks with <code>except Exception</code>. It also "optimises" a loop with try/except when misses are common, making it slower. Ask it to justify the choice and to benchmark with <code>timeit</code>.</p>
<p><b>What you must still own:</b> spotting race windows in code review and knowing the idiomatic built-ins (<code>get</code>, <code>setdefault</code>, <code>defaultdict</code>, <code>exist_ok</code>, <code>'x'</code> mode) that make the debate unnecessary.</p>`,
    problems: [{
      title: 'Read the First Available Config File (Race-Free)',
      level: 'Medium', tags: ['EAFP', 'files', 'TOCTOU'], companies: ['Microsoft', 'Cloudflare'],
      statement: `<p>Implement <code>read_first(paths)</code>: try each path in order and return <code>(path, text)</code> for the first file that can be opened and read. Skip paths that do not exist or that you have no permission to read. If none works, raise <code>FileNotFoundError</code> listing all tried paths. Do <b>not</b> use <code>os.path.exists</code> or <code>os.access</code> (they create a race window).</p>`,
      constraints: `1 ≤ len(paths) ≤ 20. A path may point to a directory — treat that as "skip" too (IsADirectoryError on Linux/macOS, PermissionError on Windows).`,
      example: `<p>Paths <code>['./app.local.toml', '~/.app.toml', '/etc/app.toml']</code> where only the last exists → ${H.c('g', "('/etc/app.toml', '…contents…')")}. The first two raise ${H.c('r', 'FileNotFoundError')}, which is caught and skipped.</p>`,
      brute: { why: `<p>The LBYL version checks <code>os.path.isfile(p) and os.access(p, os.R_OK)</code>, then opens. Between the check and the open, the file can be deleted or its permissions changed (TOCTOU), and <code>os.access</code> checks the <b>real</b> uid, not the effective one, so it can lie for setuid programs.</p>`, code: `import os

def read_first_lbyl(paths):
    for p in paths:
        if os.path.isfile(p) and os.access(p, os.R_OK):
            with open(p, encoding='utf-8') as f:   # may still fail: race!
                return p, f.read()
    raise FileNotFoundError(f'none of {paths} could be read')` },
      mcq: { q: 'Which single except clause skips missing files, unreadable files AND directories?', options: ['<code>except (FileNotFoundError, PermissionError, IsADirectoryError)</code>', '<code>except Exception</code>', '<code>except ValueError</code>', '<code>except FileExistsError</code>'], answer: 0, explain: 'All three are OSError subclasses we can sensibly skip. except OSError would also work but additionally hides things like disk I/O errors (EIO), which you may want to surface. Exception would hide bugs such as UnicodeDecodeError on a corrupt file.' },
      hints: [`<p>Hint 1: The <code>open()</code> call is the check. Wrap only <code>open + read</code> in try.</p>`, `<p>Hint 2: Catch the specific OSError subclasses you can skip: FileNotFoundError, PermissionError, IsADirectoryError. Let anything else (e.g. UnicodeDecodeError) propagate.</p>`, `<p>Hint 3: Recipe: tried = []; for p in paths: try: open+read → return / except (...) as e: tried.append(f'{p}: {type(e).__name__}') / after loop: raise FileNotFoundError('; '.join(tried)).</p>`],
      solution: {
        approach: `<p>Pure EAFP: attempt the real operation for each candidate, skip the specific failures we expect, and remember why each was skipped so the final error is actionable.</p>`,
        code: { lang: 'python', run: true, code: `import os
import tempfile

SKIPPABLE = (FileNotFoundError, PermissionError, IsADirectoryError)


def read_first(paths):
    tried = []
    for p in paths:
        try:
            with open(p, encoding='utf-8') as f:   # the open IS the check
                return p, f.read()
        except SKIPPABLE as e:
            tried.append(f'{p}: {type(e).__name__}')
    raise FileNotFoundError('no readable config; tried ' + '; '.join(tried))


with tempfile.TemporaryDirectory() as d:
    real = os.path.join(d, 'app.toml')
    with open(real, 'w', encoding='utf-8') as f:
        f.write('port = 8080')
    candidates = [os.path.join(d, 'missing.toml'), d, real]   # missing, a directory, real
    path, text = read_first(candidates)
    print(os.path.basename(path), '->', text)
    try:
        read_first([os.path.join(d, 'a.toml'), os.path.join(d, 'b.toml')])
    except FileNotFoundError as e:
        print('error:', str(e).replace(d, '<tmp>'))` },
        dry: { head: ['path', 'open() result', 'action', 'tried'], rows: [['missing.toml', '<span class="c-r">FileNotFoundError</span>', 'skip', '[missing: FileNotFoundError]'], ['&lt;tmp dir&gt;', '<span class="c-r">IsADirectoryError</span>', 'skip', '[…, dir: IsADirectoryError]'], ['app.toml', 'opened, read "port = 8080"', '<span class="c-g">return</span>', '—']] },
        complexity: `<p>O(P + S) for P paths and S bytes read. No race window: each file is checked and used in the same atomic open call.</p>`,
        followUps: ['Expand ~ and environment variables in paths (os.path.expanduser / expandvars).', 'Merge ALL existing files (later ones override earlier keys) instead of returning the first.', 'Write the config atomically: write to a temp file, fsync, then os.replace.']
      }
    }]
  });
registerModule({ id: 'py09', title: 'Errors, Type Hints & Testing', intro: `<p>tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro</p>`, goals: ['aaaaaaaaaaaa','bbbbbbbbbbbbb','cccccccccccc'], prereqs: `aaaaaaaaaaaaaaaaaaaa`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
