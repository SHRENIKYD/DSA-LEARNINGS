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
          frames.push(fr('Call <b>' + names[i] + '</b> → a new frame is pushed on top of the stack.' + (i === handler ? ' Note: ' + notes[i] + '.' : ''), [stk(stack), tx(i === 3 ? 'about to run <code>int(\'abc\')</code>' : 'running normally', 'Status')]));
        }
        stack.push("int('abc')");
        frames.push(fr('<code>int(\'abc\')</code> raises <b>ValueError</b>. Python stops the line and starts looking for a handler, starting at the TOP frame.', [{ type: 'stack', label: 'Call stack (bottom → top)', items: stack.slice(), hl: { 4: 'bad' } }, tx('<span class="c-r">ValueError: invalid literal for int() with base 10: \'abc\'</span>', 'Exception in flight')]));
        stack.pop();
        for (var j = 3; j >= 0; j--) {
          var hl = {};
          hl[j] = j === handler ? 'ok' : 'bad';
          if (j === handler) {
            frames.push(fr('<b>' + names[j] + '</b> has a matching <code>except ValueError</code> → <span class="c-g">caught!</span> Unwinding stops here. Frames above it are already gone.', [{ type: 'stack', label: 'Call stack (bottom → top)', items: stack.slice(), hl: hl }, tx('Handled in ' + names[j] + '. Execution continues after its try/except as if nothing happened.', 'Status')]));
            frames.push(fr('Everything below keeps running normally. Lesson: the error is handled by the <b>nearest enclosing handler</b> on the call stack — not necessarily in the function where it happened.', [stk(stack, null, 'ok'), tx('Callers never even see the error.', 'Result')]));
            return frames;
          }
          frames.push(fr('<b>' + names[j] + '</b> has no matching except → its <code>finally</code> blocks (if any) run, then the frame is <b>discarded</b>. The exception moves to the caller.', [{ type: 'stack', label: 'Call stack (bottom → top)', items: stack.slice(), hl: hl }, tx('<span class="c-r">ValueError still in flight</span>', 'Status')]));
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
registerModule({ id: 'py09', title: 'Errors, Type Hints & Testing', intro: `<p>tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro</p>`, goals: ['aaaaaaaaaaaa','bbbbbbbbbbbbb','cccccccccccc'], prereqs: `aaaaaaaaaaaaaaaaaaaa`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
