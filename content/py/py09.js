(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // Shared test harness: runs each case as python lines in a fresh namespace; returns repr of every non-None expression, or !ExceptionName.
  var PYT = String.raw`
def run_lines(lines):
    g = dict(globals())
    out = []
    for ln in lines:
        try:
            try:
                code = compile(ln, '<t>', 'eval')
            except SyntaxError:
                code = None
            if code is None:
                exec(compile(ln, '<t>', 'exec'), g)
            else:
                v = eval(code, g)
                if v is not None:
                    out.append(repr(v))
        except Exception as e:
            out.append('!' + type(e).__name__)
    return out
`;

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
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['sum_valid([\'4\', \' 10 \', \'x\', \'\', \'-3\'])']],
         ['(11, [2, 3])']],
        [[['sum_valid([])']],
         ['(0, [])']],
        [[['sum_valid([\'²\', \'1_000\'])']],
         ['(1000, [0])']],
        [[['sum_valid([\'+5\', \' -0 \', \'0x10\', \'1e3\', \'1 2\', \'3.0\', \'--1\'])']],
         ['(5, [2, 3, 4, 5, 6])']],
        [[['sum_valid([\'１２\', \'٣\', \' \\t7\\n\'])']],
         ['(22, [])']],
        [[['r = sum_valid([str(i) if i % 2 else "z" for i in range(100000)])',
           'r[0]',
           'len(r[1])',
           'r[1][:3]']],
         ['2500000000',
          '50000',
          '[0, 2, 4]']],
        [[['sum_valid(["9" * 20, "-" + "9" * 19])']],
         ['(90000000000000000000, [])']],
      ] },
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
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['data = {\'users\': [{\'name\': \'Asha\', \'tags\': [\'admin\']}], \'empty\': None}',
           'deep_get(data, [\'users\', 0, \'tags\', 0])',
           'deep_get(data, [\'users\', -1, \'name\'])',
           'deep_get(data, [\'users\', 5, \'name\'], \'?\')',
           'deep_get(data, [\'nope\'], \'missing\')',
           'deep_get(data, [\'empty\'], \'d\') is None',
           'deep_get(data, []) is data']],
         ['\'admin\'',
          '\'Asha\'',
          '\'?\'',
          '\'missing\'',
          'True',
          'True']],
        [[['data = {\'users\': [{\'name\': \'Asha\'}], \'empty\': None}',
           'deep_get(data, [\'users\', \'name\'])',
           'deep_get(data, [\'empty\', \'x\'])',
           'deep_get({\'a\': 1}, [\'a\', \'b\'])']],
         ['!TypeError',
          '!TypeError',
          '!TypeError']],
        [[['deep_get({\'a\': \'str\'}, [\'a\', 0])',
           'deep_get({\'a\': \'str\'}, [\'a\', 9], \'d\')',
           'deep_get({\'a\': 0}, [\'a\'], 5)',
           'deep_get({\'a\': []}, [\'a\'], 5)',
           'deep_get({}, [\'a\']) is None']],
         ['\'s\'',
          '\'d\'',
          '0',
          '[]',
          'True']],
        [[['deep_get([1, 2, 3], [-1])',
           'deep_get([1, 2, 3], [-3])',
           'deep_get([1, 2, 3], [-4], \'x\')',
           'deep_get([1, 2, 3], [3], \'x\')',
           'deep_get([], [0], \'x\')']],
         ['3',
          '1',
          '\'x\'',
          '\'x\'',
          '\'x\'']],
        [[['deep_get({1: \'one\'}, [1])',
           'deep_get((10, 20), [1])',
           'deep_get({\'a\': {\'b\': {\'c\': 7}}}, [\'a\', \'b\', \'c\'])',
           'deep_get({\'a\': {\'b\': {}}}, [\'a\', \'b\', \'c\'], \'gone\')']],
         ['\'one\'',
          '20',
          '7',
          '\'gone\'']],
        [[['d = "leaf"',
           'for i in range(100): d = {"k": [d]}',
           'deep_get(d, ["k", 0] * 100)',
           'deep_get(d, ["k", 0] * 100 + ["x"], "no")',
           'deep_get(d, ["k", 1], "no")']],
         ['\'leaf\'',
          '!TypeError',
          '\'no\'']],
      ] },
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
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['accounts = {"a1": 70}',
           'withdraw(accounts, "a1", 20)',
           'accounts',
           'withdraw(accounts, "a1", 50)',
           'accounts']],
         ['50',
          '{\'a1\': 50}',
          '0',
          '{\'a1\': 0}']],
        [[[String.raw`def err(accounts, acc, amt):
    try:
        withdraw(accounts, acc, amt)
    except Exception as e:
        return (type(e).__name__, str(e), e.__cause__)`,
           'err({"a1": 50}, "a1", 100)',
           'err({"a1": 5}, "zz", 5)']],
         ['(\'InsufficientFundsError\', \'need 50 more (balance 50, amount 100)\', None)',
          '(\'AccountNotFoundError\', "no account \'zz\'", KeyError(\'zz\'))']],
        [[[String.raw`def err(accounts, acc, amt):
    try:
        withdraw(accounts, acc, amt)
    except Exception as e:
        return (type(e).__name__, str(e))`,
           'err({"a": 5}, "a", 0)',
           'err({"a": 5}, "a", -5)',
           'err({}, "zz", 0)']],
         ['(\'ValueError\', \'amount must be positive, got 0\')',
          '(\'ValueError\', \'amount must be positive, got -5\')',
          '(\'ValueError\', \'amount must be positive, got 0\')']],
        [[[String.raw`try:
    withdraw({"a": 70}, "a", 100)
except InsufficientFundsError as e:
    info = (e.balance, e.amount, e.shortfall, str(e))`,
           'info']],
         ['(70, 100, 30, \'need 30 more (balance 70, amount 100)\')']],
        [[['issubclass(InsufficientFundsError, BankError)',
           'issubclass(AccountNotFoundError, KeyError)',
           'issubclass(AccountNotFoundError, BankError)',
           'issubclass(InsufficientFundsError, KeyError)',
           'issubclass(BankError, Exception)',
           String.raw`try:
    withdraw({}, "x", 1)
except KeyError as e:
    caught = (type(e).__name__, e.acc_id)`,
           'caught']],
         ['True',
          'True',
          'True',
          'False',
          'True',
          '(\'AccountNotFoundError\', \'x\')']],
        [[[String.raw`def err(accounts, acc, amt):
    try:
        withdraw(accounts, acc, amt)
    except Exception as e:
        return type(e).__name__`,
           'a = {"x": 10}',
           'err(a, "x", 11)',
           'err(a, "x", 0)',
           'err(a, "y", 1)',
           'a',
           'withdraw(a, "x", 10)',
           'a',
           'withdraw({"a": 10**12}, "a", 10**12 - 1)']],
         ['\'InsufficientFundsError\'',
          '\'ValueError\'',
          '\'AccountNotFoundError\'',
          '{\'x\': 10}',
          '0',
          '{\'x\': 0}',
          '1']],
      ] },
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
print('(numbers vary by machine and Python version: measure, do not guess)')` }, { lang: 'python', run: true, title: 'When misses are common, exceptions get expensive', code: `import timeit

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
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['import os, tempfile',
           'd = tempfile.mkdtemp()',
           'real = os.path.join(d, "app.toml")',
           'with open(real, "w", encoding="utf-8") as f: f.write("port = 8080")',
           'r = read_first([os.path.join(d, "missing.toml"), d, real])',
           'os.path.basename(r[0])',
           'r[1]',
           'r[0] == real']],
         ['\'app.toml\'',
          '\'port = 8080\'',
          'True']],
        [[['import os, tempfile',
           'd = tempfile.mkdtemp()',
           String.raw`try:
    read_first([os.path.join(d, "a.toml"), os.path.join(d, "b.toml")])
except FileNotFoundError as e:
    msg = str(e).replace(d, "<tmp>")`,
           'msg']],
         ['\'no readable config; tried <tmp>/a.toml: FileNotFoundError; <tmp>/b.toml: FileNotFoundError\'']],
        [[['import os, tempfile',
           'd = tempfile.mkdtemp()',
           'p1 = os.path.join(d, "one.txt")',
           'p2 = os.path.join(d, "two.txt")',
           'with open(p1, "w", encoding="utf-8") as f: f.write("first")',
           'with open(p2, "w", encoding="utf-8") as f: f.write("second")',
           'read_first([p1, p2]) == (p1, "first")',
           'read_first([p2, p1]) == (p2, "second")',
           'read_first([os.path.join(d, "none"), p2]) == (p2, "second")']],
         ['True',
          'True',
          'True']],
        [[['import os, tempfile',
           'd = tempfile.mkdtemp()',
           String.raw`try:
    read_first([d])
except FileNotFoundError as e:
    msg = str(e).replace(d, "<tmp>")`,
           'msg',
           'read_first([os.path.join(d, "x")])']],
         ['\'no readable config; tried <tmp>: IsADirectoryError\'',
          '!FileNotFoundError']],
        [[['import os, tempfile',
           'd = tempfile.mkdtemp()',
           'p = os.path.join(d, "empty.txt")',
           'with open(p, "wb") as f: f.write(b"")',
           'read_first([p])[1]',
           'read_first([p])[0] == p']],
         ['\'\'',
          'True']],
        [[['import os, tempfile',
           'd = tempfile.mkdtemp()',
           'p = os.path.join(d, "u.txt")',
           'with open(p, "w", encoding="utf-8") as f: f.write("naïve 日本")',
           'read_first([p])[1]']],
         ['\'naïve 日本\'']],
        [[['import os, tempfile',
           'd = tempfile.mkdtemp()',
           'p = os.path.join(d, "big.txt")',
           'with open(p, "w", encoding="utf-8") as f: f.write("x" * 1000000)',
           'len(read_first([p])[1])',
           'len(read_first([os.path.join(d, str(i)) for i in range(19)] + [p])[1])']],
         ['1000000',
          '1000000']],
      ] },
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

  /* ================= TOPIC 5: Type hints + typing module ================= */
  topics.push({
    title: 'Type Hints and the typing Module: Labels That Tools (Not Python) Check',
    analogy: `<p>Type hints are like <b>labels on moving boxes</b>: "KITCHEN — plates". The truck driver (the Python interpreter) does not read labels; he carries whatever you give him, even if the "plates" box is full of shoes. But the <b>person unpacking</b> (you, your teammates, your editor and a checker like mypy) reads every label, and can shout <i>"this box says plates but you're putting shoes in it!"</i> <b>before</b> anything breaks.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A type hint says what kind of value a variable, parameter or return value should hold:</p>
<pre>def greet(name: str, times: int = 1) -&gt; str:
    return ('hi ' + name + '! ') * times

count: int = 0
scores: dict[str, list[int]] = {}</pre>
<p><b>Python itself ignores them at runtime.</b> <code>greet(5, 'x')</code> still runs (and crashes or misbehaves). Hints are read by <b>tools</b>: mypy/pyright (type checkers), your IDE (autocomplete, red squiggles), and libraries like pydantic, FastAPI and dataclasses that read them on purpose.</p>
<p>🔵 <b>The vocabulary you need (Python 3.10+ spelling):</b></p>
${H.table(['Write', 'Means', 'Example'], [['<code>int</code>, <code>str</code>, <code>bool</code>, <code>None</code>', 'that exact type', '<code>def f() -&gt; None</code>'], ['<code>list[int]</code>, <code>dict[str, float]</code>, <code>set[str]</code>', 'container of …', '<code>ids: list[int]</code>'], ['<code>tuple[int, str]</code> / <code>tuple[int, ...]</code>', 'fixed pair / any length of ints', '<code>point: tuple[float, float]</code>'], ['<code>int | str</code>', 'either (Union)', '<code>key: int | str</code>'], ['<code>str | None</code> (= <code>Optional[str]</code>)', 'may be None', '<code>middle_name: str | None = None</code>'], ['<code>Callable[[int, int], bool]</code>', 'a function taking two ints returning bool', 'comparators, callbacks'], ['<code>Iterable[str]</code>, <code>Sequence[int]</code>, <code>Mapping[str, int]</code>', 'anything that behaves like… (from <code>collections.abc</code>)', 'flexible parameters'], ['<code>Any</code>', 'turn checking OFF for this value', 'escape hatch'], ['<code>object</code>', 'anything, but you may only use what every object has', 'safe "anything"'], ['<code>Literal["r", "w"]</code>', 'only these exact values', 'modes, flags'], ['<code>Final</code>', 'must not be reassigned', '<code>MAX: Final = 10</code>']])}
<p><b>Generics: functions that keep the type.</b> <code>def first(xs: list[T]) -&gt; T</code> says "whatever type goes in, the same comes out". With a <code>TypeVar</code> (or the 3.12 syntax <code>def first[T](xs: list[T]) -&gt; T</code>), mypy knows <code>first([1, 2])</code> is an <code>int</code> and <code>first(['a'])</code> is a <code>str</code>.</p>
<p><b>Shapes of data:</b> <code>TypedDict</code> describes a dict with known keys (JSON!), <code>NamedTuple</code>/<code>dataclass</code> describe records, and <code>Protocol</code> describes "anything with these methods" — static duck typing.</p>
<p><b>Golden rule:</b> be <b>generous in what you accept</b> (<code>Iterable[str]</code>, <code>Mapping</code>, <code>Sequence</code>) and <b>specific in what you return</b> (<code>list[str]</code>, <code>dict[str, int]</code>).</p>`,
    clues: [
      '"make the code self-documenting / safer to refactor in a large codebase" → type hints + a checker in CI',
      '"this function returns either a value or nothing" → <code>X | None</code> (and callers must handle None)',
      '"function works for any element type and returns the same type" → generics (TypeVar or <code>def f[T]</code>)',
      '"accept anything with a .read() / .area() method" → <code>Protocol</code> (structural typing), not a base class',
      '"JSON object with known fields" → <code>TypedDict</code> (static) or pydantic model (runtime validation)',
      '"do type hints make Python faster / enforce types?" → No: CPython ignores them at runtime (mypyc and Cython can use them to compile)',
      '"Any vs object" → Any disables checking; object allows only operations every object supports'
    ],
    code: [{ lang: 'python', run: true, title: 'A tour of the typing vocabulary (runs fine: hints are not enforced)', code: `from collections.abc import Callable, Iterable, Mapping, Sequence
from typing import Final, Literal, NamedTuple, Protocol, TypedDict, TypeVar

T = TypeVar('T')
MAX_RETRIES: Final = 3


def first(items: Sequence[T]) -> T | None:
    """Generic: first([1, 2]) is int | None, first(['a']) is str | None."""
    return items[0] if items else None


def apply_all(fn: Callable[[int], int], xs: Iterable[int]) -> list[int]:
    return [fn(x) for x in xs]          # accept any iterable, return a concrete list


def open_mode(mode: Literal['r', 'w']) -> str:
    return f'opening in {mode!r} mode'


class Point(NamedTuple):
    x: float
    y: float


class UserJSON(TypedDict):
    id: int
    name: str
    tags: list[str]


class HasArea(Protocol):                  # structural: no inheritance needed
    def area(self) -> float: ...


class Square:
    def __init__(self, side: float) -> None:
        self.side = side

    def area(self) -> float:
        return self.side ** 2


def total_area(shapes: Iterable[HasArea]) -> float:
    return sum(s.area() for s in shapes)


def word_lengths(counts: Mapping[str, int]) -> dict[str, int]:
    return {w: len(w) * n for w, n in counts.items()}


print(first([10, 20]), first([]), first('xyz'))
print(apply_all(lambda v: v * v, range(4)))
print(open_mode('r'))
print(Point(1.5, 2.0))
user: UserJSON = {'id': 1, 'name': 'Asha', 'tags': ['admin']}
print(user['name'], total_area([Square(2), Square(3)]))
print(word_lengths({'hi': 2}), MAX_RETRIES)` }, { lang: 'python', run: true, title: 'Hints live in __annotations__ and are NOT enforced', code: `import typing


def double(x: int) -> int:
    return x * 2


print(double.__annotations__)        # {'x': <class 'int'>, 'return': <class 'int'>}
print(double(21))                    # 42
print(double('ab'))                  # 'abab' - Python happily ignores the hint!
print(double([1]))                   # [1, 1]


class Config:
    host: str
    port: int = 8080


print(typing.get_type_hints(Config))   # resolved hints, also from base classes
print(hasattr(Config, 'host'))         # False: annotation without value creates no attribute` }],
    codeTitle: ['typing vocabulary tour', 'Annotations at runtime'],
    viz: [{
      title: 'Hints are labels: Python stores them, the checker reads them, the runtime ignores them',
      input: "'ab'",
      inputLabel: "Argument to pass to double(x: int) -> int  (try: 21 · 'ab' · [1, 2] · None)",
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).trim();
        if (!raw) throw new Error("Type a Python literal: 21, 'ab', [1, 2] or None");
        var kind, rt, res, err = null;
        if (/^-?\d+$/.test(raw)) { kind = 'int'; res = String(parseInt(raw, 10) * 2); }
        else if (/^-?\d+\.\d+$/.test(raw)) { kind = 'float'; res = String(parseFloat(raw) * 2); if (res.indexOf('.') < 0) res += '.0'; }
        else if (/^'[^']*'$/.test(raw) || /^"[^"]*"$/.test(raw)) { kind = 'str'; var inner = raw.slice(1, -1); res = "'" + inner + inner + "'"; }
        else if (/^\[.*\]$/.test(raw)) { kind = 'list[int]'; var body = raw.slice(1, -1).trim(); res = '[' + (body ? body + ', ' + body : '') + ']'; }
        else if (raw === 'None') { kind = 'None'; err = "TypeError: unsupported operand type(s) for *: 'NoneType' and 'int'"; }
        else if (raw === 'True' || raw === 'False') { kind = 'bool'; res = String(raw === 'True' ? 2 : 0); }
        else throw new Error("Use a simple literal: 21, 2.5, 'ab', [1, 2], None, True");
        var code = ['def double(x: int) -> int:', '    return x * 2', '', 'print(double.__annotations__)', 'print(double(' + raw + '))'].join('\n');
        var frames = [];
        frames.push(fr('Python runs the <code>def</code>. It evaluates the annotations and stores them in a dict on the function — that is <b>all</b> it does with them.', [cp(code, 1, 'cur'), { type: 'map', label: 'double.__annotations__', entries: [['x', "<class 'int'>"], ['return', "<class 'int'>"]], hl: { x: 'ok', return: 'ok' } }]));
        frames.push(fr('Printing <code>__annotations__</code> shows the stored labels. Frameworks like FastAPI, pydantic and dataclasses read exactly this dict.', [cp(code, 4, 'ok'), tx("<pre>{'x': &lt;class 'int'&gt;, 'return': &lt;class 'int'&gt;}</pre>", 'Printed')]));
        frames.push(fr('Now the call <code>double(' + esc(raw) + ')</code>. The argument\'s real type is <b>' + kind + '</b>. Does Python check it against <code>int</code>? <b>No.</b> It just binds <code>x</code>.', [cp(code, 5, 'cur'), vp({ x: raw, 'type(x)': kind, 'hint says': 'int' }, 'type(x)', kind === 'int' || kind === 'bool' ? 'ok' : 'bad')]));
        if (err) frames.push(fr('The body runs <code>x * 2</code> and fails <b>at runtime</b>, deep inside — the hint did not stop the bad value at the door.', [cp(code, 2, 'bad'), tx('<span class="c-r">' + esc(err) + '</span>', 'Runtime result')]));
        else frames.push(fr('The body runs <code>x * 2</code>' + (kind === 'int' ? ' as intended.' : kind === 'bool' ? ' — bool is a subclass of int, so this is even type-correct.' : kind === 'float' ? ' and works numerically — but it returns a <b>float</b>, not the int the hint promises. Code downstream that needs an int (e.g. <code>range(n)</code>) would fail later.' : ' and <b>silently does something else</b>: <code>*</code> means repetition for ' + kind + '. No error, wrong meaning.'), [cp(code, 2, kind === 'int' || kind === 'bool' ? 'ok' : 'cur'), tx('<b>' + esc(res) + '</b>', 'Returned at runtime')]));
        var ok = kind === 'int' || kind === 'bool';
        frames.push(fr('Now run <b>mypy</b> (a separate program that reads the source without running it). It compares the argument\'s type to the label <code>int</code>.', [cp(code, 5, ok ? 'ok' : 'bad', 'mypy reading the source'), tx(ok ? '<span class="c-g">Success: no issues found in 1 source file</span>' : '<span class="c-r">app.py:5: error: Argument 1 to "double" has incompatible type "' + (kind === 'list[int]' ? 'list[int]' : kind) + '"; expected "int"  [arg-type]</span>', '$ mypy app.py')]));
        frames.push(fr('Takeaway: hints catch bugs <b>before</b> running (in your editor and CI), document intent, and power tools — but they are <b>not</b> runtime validation. For untrusted input (HTTP, JSON, files) validate at runtime too (pydantic, manual checks).', [{ type: 'table', label: 'Who reads the hints?', columns: ['reader', 'reads hints?', 'effect'], rows: [['CPython interpreter', 'stores only', 'no checking, no speed-up'], ['mypy / pyright / IDE', 'yes', 'errors before running'], ['pydantic / FastAPI / dataclasses', 'yes, at runtime', 'validation, parsing, generated code'], ['mypyc / Cython', 'yes', 'compile to faster C']], hl: { 1: 'ok' } }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Optional means "you must handle None"', html: `<p><code>dict.get</code> returns <code>V | None</code>. mypy forces you to deal with the None before calling string methods — exactly the bug class (<code>AttributeError: 'NoneType' object has no attribute …</code>) that is most common in Python production crashes.</p>`, code: { lang: 'python', run: true, code: `def find_email(users: dict[str, str], name: str) -> str | None:
    return users.get(name)


def shout_email(users: dict[str, str], name: str) -> str:
    email = find_email(users, name)
    # email.upper() here -> mypy: Item "None" of "str | None" has no attribute "upper"
    if email is None:
        return 'no email'
    return email.upper()        # mypy knows email is str here (narrowing)


print(shout_email({'asha': 'a@x.com'}, 'asha'), shout_email({}, 'bob'))` } },
      { title: 'Protocol: static duck typing', html: `<p>Any class with a matching <code>read()</code> method satisfies <code>Readable</code> — no inheritance, no registration. <code>@runtime_checkable</code> additionally lets <code>isinstance</code> check that the method <b>exists</b> (not its signature). Output: ${H.c('g', '5 4 True')}.</p>`, code: { lang: 'python', run: true, code: `import io
from typing import Protocol, runtime_checkable


@runtime_checkable
class Readable(Protocol):
    def read(self) -> str: ...


class FakeFile:
    def read(self) -> str:
        return 'hello'


def count_chars(src: Readable) -> int:
    return len(src.read())


print(count_chars(FakeFile()), count_chars(io.StringIO('abcd')), isinstance(FakeFile(), Readable))` } },
      { title: 'TypedDict for JSON payloads', html: `<p>A TypedDict is a plain dict at runtime (zero cost) but mypy checks the keys and value types. <code>NotRequired</code> marks optional keys.</p>${H.table(['code', 'mypy says'], [['<code>u["nmae"]</code>', H.c('r', 'TypedDict "User" has no key "nmae"')], ['<code>u["id"] + "x"</code>', H.c('r', 'Unsupported operand types for + ("int" and "str")')], ['<code>u.get("nick")</code>', H.c('g', 'OK, type str | None')]])}`, code: { lang: 'python', run: true, code: `from typing import NotRequired, TypedDict


class User(TypedDict):
    id: int
    name: str
    nick: NotRequired[str]


def label(u: User) -> str:
    return f"#{u['id']} {u.get('nick', u['name'])}"


print(label({'id': 7, 'name': 'Asha'}), label({'id': 8, 'name': 'Ben', 'nick': 'B'}))
print(type({'id': 1, 'name': 'x'}))     # just a dict at runtime` } },
      { title: 'New syntax cheat sheet (3.12+)', html: `${H.table(['old style', 'modern', 'since'], [['<code>List[int]</code>, <code>Dict[str, int]</code>', '<code>list[int]</code>, <code>dict[str, int]</code>', '3.9'], ['<code>Union[int, str]</code>, <code>Optional[str]</code>', '<code>int | str</code>, <code>str | None</code>', '3.10'], ['<code>T = TypeVar("T")</code> + <code>def f(x: T) -&gt; T</code>', '<code>def f[T](x: T) -&gt; T</code>', '3.12'], ['<code>Vector: TypeAlias = list[float]</code>', '<code>type Vector = list[float]</code>', '3.12'], ['<code>"Node"</code> forward-reference strings', 'plain <code>Node</code> (lazy annotations, PEP 649)', '3.14']])}` }
    ],
    deepDive: `<p>🟣 <b>When annotations are evaluated.</b> Before 3.14, annotations on functions and classes are evaluated at definition time (so forward references to a class not yet defined need quotes: <code>-&gt; "Node"</code>). <code>from __future__ import annotations</code> (PEP 563) turns them all into strings. Python 3.14 (PEP 649/749) makes annotations <b>lazy</b> by default: they are computed only when someone reads <code>__annotations__</code> (via <code>annotationlib</code>), which fixes forward references and import-time cost. Annotations on local variables inside functions are never evaluated at all.</p>
<p><b>Variance (an interview favourite).</b> <code>list[int]</code> is <b>not</b> a <code>list[float]</code>, even though an int is acceptable where a float is expected (mypy special-cases int→float). Lists are <b>mutable</b>, so a function taking <code>list[float]</code> could append <code>3.14</code> into your list of ints. Read-only types are <b>covariant</b>: <code>Sequence[int]</code> <i>is</i> a <code>Sequence[float]</code>. Callables are contravariant in their arguments. This is why "accept Sequence/Iterable/Mapping" is not just style — it makes your function accept more callers.</p>
<p><b>Advanced tools you will see:</b> <code>@overload</code> (different return types for different argument types), <code>ParamSpec</code> + <code>Concatenate</code> (typing decorators that keep the wrapped signature), <code>Self</code> (3.11, for fluent methods/classmethods), <code>NewType("UserId", int)</code> (zero-cost distinct type), <code>Annotated[int, Gt(0)]</code> (attach metadata that pydantic/FastAPI read), <code>TypeGuard</code>/<code>TypeIs</code> (user-defined narrowing functions; TypeIs is 3.13), <code>Never</code> (functions that always raise), <code>@override</code> (3.12).</p>
<p><b>Runtime cost.</b> Hints cost a tiny bit of import time (building the annotation dicts) and nothing per call. <code>typing.get_type_hints</code> resolves string annotations and is what frameworks call. <code>isinstance(x, list[int])</code> raises TypeError — parametrised generics cannot be checked at runtime, which is why libraries like pydantic/beartype exist.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> type hints are now one of the best ways to <b>steer</b> code assistants: a precise signature (<code>def merge(a: Mapping[str, int], b: Mapping[str, int]) -&gt; dict[str, int]</code>) acts as a mini-spec, and the checker immediately flags generated code that does not fit. Typed codebases get noticeably better AI completions and safer AI refactors.</p>
<p><b>Use AI as a partner:</b> "add type hints to this module, prefer Protocol/Sequence for parameters, run under mypy --strict" is a great mechanical task to delegate. Structured-output APIs and agent tool definitions are typically generated from pydantic models or TypedDicts, so typing skills now directly shape how LLMs call your code.</p>
<p><b>Where AI goes wrong:</b> sprinkling <code>Any</code> to make errors disappear, outdated spellings (<code>List</code>, <code>Optional</code> everywhere in new code), <code>cast()</code> to silence real bugs, and believing hints validate input at runtime. <b>What you must still own:</b> designing good types — they are your API contract.</p>`,
    problems: [{
      title: 'Typed group_by: a Generic Function',
      level: 'Medium', tags: ['generics', 'TypeVar', 'Callable'], companies: ['Meta', 'Dropbox'],
      statement: `<p>Write a fully typed <code>group_by(items, key)</code> that groups any iterable of elements by the value of a key function, preserving input order inside each group. A type checker must infer precise types: grouping <code>list[str]</code> by <code>len</code> must give <code>dict[int, list[str]]</code>.</p>`,
      constraints: `items is any Iterable (possibly a one-shot generator); key returns a hashable value; do not use Any.`,
      example: `<p><code>group_by(['apple', 'fig', 'kiwi', 'pear'], len)</code> → ${H.c('g', "{5: ['apple'], 3: ['fig'], 4: ['kiwi', 'pear']}")}, inferred type ${H.c('b', 'dict[int, list[str]]')} — because T = str (from the items) and K = int (from len's return type).</p>`,
      brute: { why: `<p>Annotating with <code>list</code>, <code>dict</code> and <code>Callable</code> (unparametrised) or <code>Any</code> runs fine but throws the type information away: callers get <code>dict[Any, Any]</code>, so a typo like <code>groups[3][0].uper()</code> is not caught.</p>`, code: `from typing import Any, Callable

def group_by_loose(items: list, key: Callable) -> dict[Any, Any]:
    out: dict[Any, Any] = {}
    for x in items:
        out.setdefault(key(x), []).append(x)
    return out` },
      mcq: { q: 'Why two type variables (T and K) instead of one?', options: ['The element type and the key type are independent (str elements, int keys)', 'TypeVars must always come in pairs', 'K is needed only for performance', 'One TypeVar cannot appear in a return type'], answer: 0, explain: 'T links the element type to the lists in the result; K links the key function\'s return type to the dict keys. They vary independently, so they need separate variables.' },
      hints: [`<p>Hint 1: Declare <code>T = TypeVar('T')</code> and <code>K = TypeVar('K', bound=Hashable)</code>, or use 3.12 syntax <code>def group_by[T, K: Hashable](...)</code>.</p>`, `<p>Hint 2: Parameters: <code>items: Iterable[T]</code>, <code>key: Callable[[T], K]</code>. Return: <code>dict[K, list[T]]</code>.</p>`, `<p>Hint 3: Body: one pass with <code>out.setdefault(key(x), []).append(x)</code> (or defaultdict, converting back to dict). Annotate the empty dict: <code>out: dict[K, list[T]] = {}</code>.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['group_by([\'apple\', \'fig\', \'kiwi\', \'pear\'], len)']],
         ['{5: [\'apple\'], 3: [\'fig\'], 4: [\'kiwi\', \'pear\']}']],
        [[['group_by(range(7), lambda n: n % 2 == 0)']],
         ['{True: [0, 2, 4, 6], False: [1, 3, 5]}']],
        [[['words = [\'apple\', \'fig\', \'kiwi\', \'pear\']',
           'group_by((w for w in words), lambda w: w[0])']],
         ['{\'a\': [\'apple\'], \'f\': [\'fig\'], \'k\': [\'kiwi\'], \'p\': [\'pear\']}']],
        [[['group_by([], len)',
           'group_by(iter([]), lambda x: x)',
           'group_by([1, 2], lambda x: None)']],
         ['{}',
          '{}',
          '{None: [1, 2]}']],
        [[['g = (x for x in range(5))',
           'group_by(g, lambda x: x % 2)',
           'list(g)']],
         ['{0: [0, 2, 4], 1: [1, 3]}',
          '[]']],
        [[['group_by([1], lambda x: [x])',
           'group_by(["ab", "ba", "cc"], lambda s: tuple(sorted(s)))',
           'group_by([5, 3, 5, 1, 3], lambda x: x)']],
         ['!TypeError',
          '{(\'a\', \'b\'): [\'ab\', \'ba\'], (\'c\', \'c\'): [\'cc\']}',
          '{5: [5, 5], 3: [3, 3], 1: [1]}']],
        [[['r = group_by(range(10**5), lambda n: n % 3)',
           'sorted(r)',
           '[len(r[k]) for k in (0, 1, 2)]',
           'r[1][:3]']],
         ['[0, 1, 2]',
          '[33334, 33333, 33333]',
          '[1, 4, 7]']],
      ] },
      solution: {
        approach: `<p>Two TypeVars connect inputs to outputs: elements flow into the lists (T), key results become dict keys (K, bounded by Hashable). Accept the most general input (<code>Iterable</code>) and return a concrete <code>dict</code>.</p>`,
        code: { lang: 'python', run: true, code: `from collections.abc import Callable, Hashable, Iterable
from typing import TypeVar

T = TypeVar('T')
K = TypeVar('K', bound=Hashable)


def group_by(items: Iterable[T], key: Callable[[T], K]) -> dict[K, list[T]]:
    out: dict[K, list[T]] = {}
    for x in items:                       # single pass: works for generators too
        out.setdefault(key(x), []).append(x)
    return out


words = ['apple', 'fig', 'kiwi', 'pear']
by_len = group_by(words, len)              # mypy: dict[int, list[str]]
print(by_len)
evens = group_by(range(7), lambda n: n % 2 == 0)   # dict[bool, list[int]]
print(evens)
print(group_by((w for w in words), lambda w: w[0]))  # generator input` },
        alt: [{ lang: 'python', code: `# Python 3.12+ type-parameter syntax: no module-level TypeVars needed
from collections.abc import Callable, Hashable, Iterable


def group_by[T, K: Hashable](items: Iterable[T], key: Callable[[T], K]) -> dict[K, list[T]]:
    out: dict[K, list[T]] = {}
    for x in items:
        out.setdefault(key(x), []).append(x)
    return out` }],
        dry: { head: ['x', 'key(x)', 'out after'], rows: [["'apple'", '5', "{5: ['apple']}"], ["'fig'", '3', "{5: ['apple'], 3: ['fig']}"], ["'kiwi'", '4', "{…, 4: ['kiwi']}"], ["'pear'", '4', "{…, 4: ['kiwi', 'pear']}"]] },
        complexity: `<p>O(N) time (one key call and one amortised O(1) append per element), O(N) space. Type checking cost is zero at runtime.</p>`,
        followUps: ['Add an optional value function: group_by(items, key, value=lambda x: x) — how do the types change (a third TypeVar V)?', 'Use @overload so that omitting value returns dict[K, list[T]] but passing it returns dict[K, list[V]].', 'Why would itertools.groupby give a different result on this input?']
      }
    }]
  });

  /* ================= TOPIC 6: mypy, narrowing, gradual typing ================= */
  topics.push({
    title: 'mypy in Practice: Type Narrowing, Gradual Typing, Strict Mode and Escape Hatches',
    analogy: `<p>mypy is a <b>spell-checker for meaning</b>. A spell-checker reads your essay without "performing" it, and underlines words that cannot be right. mypy reads your code without running it and underlines calls that cannot be right: "you might be calling <code>.upper()</code> on <code>None</code> here". Like a spell-checker, it learns from context: after you write "if the name is missing, stop", it knows that <b>below that line</b> the name is definitely present. That learning is called <b>narrowing</b>.</p>`,
    explain: `<p>🟢 <b>What mypy does.</b> <code>pip install mypy</code>, then <code>mypy src/</code>. It reads your annotations, <b>infers</b> types for everything else (<code>x = [1, 2]</code> → <code>list[int]</code>), and reports places where types cannot fit. It never runs your code.</p>
<pre>$ mypy app.py
app.py:12: error: Item "None" of "str | None" has no attribute "upper"  [union-attr]
Found 1 error in 1 file (checked 1 source file)</pre>
<p>🔵 <b>Narrowing — how mypy follows your if-statements.</b> Inside a branch, mypy shrinks a union based on the check you wrote:</p>
${H.table(['check', 'inside the if', 'after an early return'], [['<code>if x is None:</code>', '<code>None</code>', 'everything except None'], ['<code>if isinstance(x, int):</code>', '<code>int</code>', 'the rest of the union'], ['<code>if x:</code> (on <code>str | None</code>)', '<code>str</code> (non-empty)', '<code>str | None</code>'], ['<code>if mode == "r":</code> (on a Literal)', '<code>Literal["r"]</code>', 'remaining literals'], ['<code>assert x is not None</code>', '—', 'not None'], ['<code>match</code> statement cases', 'the matched class', 'remaining cases']])}
<p><b>Gradual typing.</b> You do not have to annotate everything at once. By default mypy <b>skips the bodies of unannotated functions</b> and treats unknown things as <code>Any</code>. Teams adopt typing module by module, then tighten flags:</p>
<ul>
<li><code>--strict</code> turns on the useful extras: <code>disallow_untyped_defs</code>, <code>warn_return_any</code>, <code>no_implicit_optional</code>, <code>strict_equality</code>, and more.</li>
<li>Configure per-module in <code>pyproject.toml</code> under <code>[tool.mypy]</code> and <code>[[tool.mypy.overrides]]</code>.</li>
</ul>
<p><b>Escape hatches</b> (use sparingly, leave a comment why):</p>
<ul>
<li><code>reveal_type(expr)</code> — mypy prints what it thinks the type is. Your best debugging tool.</li>
<li><code>cast(int, value)</code> — "trust me". No runtime effect, no check. Lies here become runtime crashes.</li>
<li><code># type: ignore[arg-type]</code> — silence one specific error code on one line (with <code>warn_unused_ignores</code> so stale ignores get flagged).</li>
<li><code>Any</code> — opt out completely for that value; it spreads silently, so contain it at the edges.</li>
</ul>
<p><b>Libraries without hints</b> need <b>stubs</b> (<code>.pyi</code> files): many ship them (a <code>py.typed</code> marker), others have <code>types-requests</code>-style packages from <b>typeshed</b>.</p>`,
    clues: [
      '"Item None of X | None has no attribute …" → add a None check (narrowing) or change the design so None is impossible',
      '"we have a big untyped codebase, how do we adopt types?" → gradual typing: start with new modules, CI on changed files, per-module strictness overrides, ratchet up',
      '"mypy says Incompatible types: list[int] vs list[float]" → invariance; accept <code>Sequence[float]</code> instead',
      '"I am sure it is not None but mypy disagrees" → narrow with an <code>if</code>/<code>assert</code>, not <code>cast</code> or ignore',
      '"what type does mypy think this is?" → <code>reveal_type(x)</code>',
      '"Library has no type hints" → install <code>types-…</code> stubs, or write a <code>.pyi</code> stub, or <code>ignore_missing_imports</code> for that module only',
      '"mypy vs pyright" → both are static checkers following the same PEPs; pyright powers VS Code\'s Pylance and is faster; results differ in edge cases'
    ],
    code: [{ lang: 'python', run: true, title: 'Narrowing patterns mypy understands (all valid under --strict)', code: `from typing import Literal, assert_never

Shape = Literal['circle', 'square']


def describe(x: int | str | None) -> str:
    if x is None:
        return 'nothing'                 # x: None
    if isinstance(x, int):
        return f'number {x + 1}'         # x: int
    return x.upper()                     # x: str (only option left)


def area(shape: Shape, size: float) -> float:
    if shape == 'circle':
        return 3.14159 * size ** 2       # shape: Literal['circle']
    elif shape == 'square':
        return size * size
    else:
        assert_never(shape)              # mypy errors here if a case is forgotten


def first_word(text: str | None) -> str:
    if not text:                          # None AND '' handled together
        return ''
    return text.split()[0]


for v in (None, 41, 'hi', True):
    print(repr(v), '->', describe(v))     # True is an int subclass -> 'number 2'
print(area('circle', 1.0), area('square', 3.0), repr(first_word('')), first_word('hello world'))` }, { lang: 'python', run: true, title: 'Variance: why list[int] is not a list[float]', code: `from collections.abc import Sequence


def add_pi(xs: list[float]) -> None:
    xs.append(3.14)                       # legal for a list[float]


def total(xs: Sequence[float]) -> float:  # read-only view: covariant, accepts list[int]
    return sum(xs)


ints: list[int] = [1, 2, 3]
print(total(ints))                         # fine for mypy AND at runtime
add_pi(ints)                               # mypy: Argument 1 has incompatible type "list[int]"; expected "list[float]"
print(ints)                                # [1, 2, 3, 3.14] - our list[int] now holds a float!
try:
    print([n.bit_length() for n in ints])  # code trusting list[int] breaks later
except AttributeError as e:
    print('runtime crash far away:', e)` }, { lang: 'text', check: false, title: 'pyproject.toml: a realistic gradual-strictness setup', code: `[tool.mypy]
python_version = "3.12"
strict = true                     # new code: everything typed
warn_unused_ignores = true
plugins = ["pydantic.mypy"]

[[tool.mypy.overrides]]
module = ["legacy.*"]             # old code: checked, but not strictly
disallow_untyped_defs = false
check_untyped_defs = true

[[tool.mypy.overrides]]
module = ["some_untyped_lib.*"]   # third-party without stubs
ignore_missing_imports = true` }],
    codeTitle: ['Narrowing patterns', 'Variance trap', 'mypy configuration'],
    viz: [{
      title: 'Type narrowing: what mypy believes on each line vs what actually runs',
      input: 'None',
      inputLabel: "Runtime value for x (try: None · 41 · 'hi' · True)",
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).trim();
        var kind;
        if (raw === 'None') kind = 'None';
        else if (raw === 'True' || raw === 'False') kind = 'bool';
        else if (/^-?\d+$/.test(raw)) kind = 'int';
        else if (/^'[^']*'$/.test(raw) || /^"[^"]*"$/.test(raw)) kind = 'str';
        else throw new Error("Type None, an integer like 41, a string like 'hi', or True");
        var code = ['def describe(x: int | str | None) -> str:', '    if x is None:', "        return 'nothing'", '    if isinstance(x, int):', "        return f'number {x + 1}'", '    return x.upper()'].join('\n');
        var frames = [];
        function tbl(hlRow) { return { type: 'table', label: 'mypy\'s view of x, line by line', columns: ['line', 'static type of x', 'why'], rows: [['1', 'int | str | None', 'the annotation'], ['3', 'None', 'inside "if x is None"'], ['4', 'int | str', 'None was returned on line 3'], ['5', 'int', 'inside isinstance(x, int)'], ['6', 'str', 'int returned on line 5 → only str left']], hl: hlRow === undefined ? {} : (function () { var h = {}; h[hlRow] = 'cur'; return h; })() }; }
        frames.push(fr('mypy reads the signature: <code>x</code> may be <b>int, str or None</b>. Calling <code>x.upper()</code> right here would be an error ("Item int has no attribute upper").', [cp(code, 1), tbl(0), vp({ 'runtime x': raw, 'runtime type': kind })]));
        frames.push(fr('<code>if x is None:</code> — mypy splits the world in two. Inside the branch, x is <b>None</b>; after the branch (because it returns), x is <b>int | str</b>.', [cp(code, 2), tbl(1), vp({ 'runtime x': raw, 'x is None?': kind === 'None' ? 'True' : 'False' }, 'x is None?', kind === 'None' ? 'ok' : 'bad')]));
        if (kind === 'None') {
          frames.push(fr('At runtime x really is None → return <code>\'nothing\'</code>. The remaining lines never run, but mypy still checked them for every possible type.', [cp(code, 3, 'ok'), tbl(1), tx("<b>'nothing'</b>", 'Returned')]));
        } else {
          frames.push(fr('Not None at runtime → continue. mypy now knows x: <b>int | str</b>.', [cp(code, 4), tbl(2), vp({ 'runtime x': raw })]));
          var isInt = kind === 'int' || kind === 'bool';
          frames.push(fr('<code>isinstance(x, int)</code> narrows again: inside → <b>int</b>, after → <b>str</b>.' + (kind === 'bool' ? ' Note: <code>True</code> is a <b>bool</b>, and bool is a subclass of int, so this is True!' : ''), [cp(code, 4, isInt ? 'ok' : 'bad'), tbl(3), vp({ 'isinstance(x, int)': isInt ? 'True' : 'False' }, 'isinstance(x, int)', isInt ? 'ok' : 'bad')]));
          if (isInt) {
            var n = kind === 'bool' ? (raw === 'True' ? 1 : 0) : parseInt(raw, 10);
            frames.push(fr('mypy allows <code>x + 1</code> because x is an int here. Runtime result: <b>number ' + (n + 1) + '</b>.', [cp(code, 5, 'ok'), tbl(3), tx("<b>'number " + (n + 1) + "'</b>", 'Returned')]));
          } else {
            var s = raw.slice(1, -1);
            frames.push(fr('Only <b>str</b> is left, so <code>x.upper()</code> type-checks — no cast, no ignore. Runtime result: <b>' + esc(s.toUpperCase()) + '</b>.', [cp(code, 6, 'ok'), tbl(4), tx("<b>'" + esc(s.toUpperCase()) + "'</b>", 'Returned')]));
          }
        }
        frames.push(fr('If you deleted the <code>if x is None</code> check, mypy would report on line 6: <span class="c-r">Item "None" of "str | None" has no attribute "upper"</span> — the bug is caught without running a single test.', [cp(code.replace("    if x is None:\n        return 'nothing'\n", ''), 4, 'bad', 'Without the None check'), tx('<span class="c-r">error: Item "None" of "str | None" has no attribute "upper"  [union-attr]</span>', '$ mypy')]));
        return frames;
      }
    }, {
      title: 'Why list[int] cannot be passed as list[float] (invariance)',
      gen: function () {
        var code = ['def add_pi(xs: list[float]) -> None:', '    xs.append(3.14)', '', 'ints: list[int] = [1, 2, 3]', 'add_pi(ints)          # mypy error', 'ints[3].bit_length()  # runtime crash'].join('\n');
        return [
          fr('<code>ints</code> is declared as a list of ints. Code elsewhere trusts that every element has int methods like <code>bit_length()</code>.', [cp(code, 4), { type: 'array', label: 'ints (list[int])', values: [1, 2, 3] }]),
          fr('<code>add_pi</code> takes a <code>list[float]</code>. An int is acceptable as a float, so it is tempting to think a list of ints is a list of floats…', [cp(code, 1), { type: 'array', label: 'ints', values: [1, 2, 3] }]),
          fr('…but <code>add_pi</code> is allowed to <b>append a float</b> to a list[float]. Passing our list in would let it write 3.14 into a list[int].', [cp(code, 2, 'bad'), { type: 'array', label: 'ints (now polluted)', values: [1, 2, 3, 3.14], hl: { 3: 'bad' } }]),
          fr('Later, code that trusted list[int] crashes: <code>float</code> has no <code>bit_length</code>. That is why <b>mutable</b> containers are <b>invariant</b> and mypy rejects line 5.', [cp(code, 6, 'bad'), tx('<span class="c-r">AttributeError: \'float\' object has no attribute \'bit_length\'</span>', 'Runtime')]),
          fr('Fix: if the function only <b>reads</b>, accept <code>Sequence[float]</code> (read-only, <b>covariant</b>) — then list[int] is accepted safely. If it must write, it needs exactly list[float].', [{ type: 'table', label: 'Variance cheat sheet', columns: ['type', 'variance', 'list[int] accepted where X[float] expected?'], rows: [['list[T], dict[K, V], set[T]', 'invariant (mutable)', 'no'], ['Sequence[T], Iterable[T], tuple[T, ...], Mapping[K, V] values', 'covariant (read-only)', 'yes'], ['Callable[[T], R] arguments', 'contravariant', 'reversed']], hl: { 1: 'ok' } }])
        ];
      }
    }],
    examples: [
      { title: 'reveal_type: ask mypy what it thinks', html: `<p><code>reveal_type</code> is understood by mypy/pyright; since 3.11 it also exists in <code>typing</code> at runtime (prints the runtime type to stderr and returns the value). mypy output for this file:</p>${H.table(['line', 'mypy note'], [['<code>reveal_type(nums)</code>', 'Revealed type is "builtins.list[builtins.int]"'], ['<code>reveal_type(lookup)</code>', 'Revealed type is "builtins.dict[builtins.str, builtins.float]"'], ['<code>reveal_type(lookup.get("a"))</code>', 'Revealed type is "builtins.float | None"']])}`, code: { lang: 'python', run: true, code: `from typing import reveal_type

nums = [1, 2, 3]
lookup = {'a': 1.5}
reveal_type(nums)                 # at runtime: prints "Runtime type is 'list'" to stderr
x = reveal_type(lookup.get('a'))  # returns its argument unchanged
print('value passed through:', x)` } },
      { title: 'cast lies, narrowing proves', html: `<p><code>cast</code> changes nothing at runtime — it only silences mypy. If the assumption is wrong, the crash just moves. Prefer a real check that both mypy and the runtime respect.</p>`, code: { lang: 'python', run: true, code: `from typing import cast


def parse_id_cast(raw: object) -> int:
    return cast(int, raw) + 1          # mypy happy; runtime: TypeError if raw is a str


def parse_id_checked(raw: object) -> int:
    if not isinstance(raw, int):       # narrowing: object -> int
        raise TypeError(f'expected int, got {type(raw).__name__}')
    return raw + 1


print(parse_id_checked(41))
for fn in (parse_id_cast, parse_id_checked):
    try:
        fn('41')
    except TypeError as e:
        print(fn.__name__, '->', e)` } },
      { title: 'Gradual typing: unannotated bodies are skipped', html: `<p>By default, mypy does not check inside a function with <b>no</b> annotations, so this obvious bug passes. Adding a single annotation (or <code>check_untyped_defs = true</code>, or <code>--strict</code>) makes mypy look inside.</p>${H.table(['function', 'default mypy', '--strict'], [['<code>def total(xs): return sum(xs) + "!"</code>', H.c('y', 'not checked'), H.c('r', 'error: missing annotations')], ['<code>def total(xs: list[int]) -&gt; int: return sum(xs) + "!"</code>', H.c('r', 'Unsupported operand types for + ("int" and "str")'), H.c('r', 'same error')]])}` },
      { title: 'TypeGuard / TypeIs: teach mypy your own checks', html: `<p>A helper like <code>is_str_list(x)</code> returns bool, so mypy cannot narrow from it — unless its return type is <code>TypeGuard[list[str]]</code> (3.10) or <code>TypeIs[...]</code> (3.13, which also narrows the else-branch). The code below uses TypeGuard so it runs on 3.10+.</p>`, code: { lang: 'python', run: true, code: `from typing import TypeGuard


def is_str_list(val: list[object]) -> TypeGuard[list[str]]:
    return all(isinstance(x, str) for x in val)


def join_words(val: list[object]) -> str:
    if is_str_list(val):
        return ' '.join(val)          # mypy: val is list[str] here
    return '<mixed list>'


print(join_words(['type', 'guards']), join_words([1, 'a']))` } }
    ],
    deepDive: `<p>🟣 <b>How a checker works.</b> mypy parses every module, builds a symbol table, resolves imports (including stubs from typeshed), then type-checks each function body with <b>flow-sensitive</b> analysis: it tracks the narrowed type of each variable along each branch, joining types where branches merge. It caches results in <code>.mypy_cache</code> and supports a daemon (<code>dmypy</code>) for fast incremental runs on huge codebases.</p>
<p><b>The ecosystem in 2026.</b> <b>mypy</b> is the reference checker (and powers <code>mypyc</code>, which compiles typed Python to C extensions — mypy itself is compiled with it). <b>pyright</b> (Microsoft; inside VS Code's Pylance) is faster and stricter about inference. Newer Rust-based checkers from Astral (<code>ty</code>) and Meta (<code>pyrefly</code>) aim at much higher speed for monorepos. They implement the same typing PEPs but disagree in corners — pick one for CI and stick to it.</p>
<p><b>Soundness limits.</b> Python typing is <b>not sound</b>: <code>Any</code>, <code>cast</code>, ignores, untyped libraries, runtime monkeypatching and the int→float promotion all let wrong types through. Narrowing on <b>attributes</b> (<code>if self.x is not None: self.method(); self.x.foo()</code>) is invalidated by calls that may change the attribute — copy to a local first. Mutable-default and <code>**kwargs</code> typing need <code>TypedDict</code> + <code>Unpack</code>.</p>
<p><b>Runtime checking options.</b> For trust boundaries (HTTP bodies, configs, LLM outputs!), static types are not enough: use <b>pydantic</b> (parse + validate into typed models), <b>msgspec</b>/<b>attrs</b>, or <b>beartype</b>/<b>typeguard</b> (decorators that check hints on every call, mostly for tests). A common architecture: validate at the edge once, then pass well-typed objects inward where mypy guarantees the rest.</p>
<p><b>Adoption strategy that works:</b> (1) run mypy in CI with a baseline; (2) require hints on new/changed code; (3) turn on <code>strict</code> per package as it gets clean; (4) track the count of <code>Any</code>/ignores as a metric.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> type checkers are the cheapest, fastest <b>verifier</b> for AI-written code. An agent loop of "generate → run mypy/pyright → fix the reported errors" catches a large share of hallucinated attributes, wrong argument orders and forgotten None-checks before any test runs. Many teams now run the checker as a pre-commit and as a tool the coding agent must satisfy.</p>
<p><b>Where AI goes wrong:</b> when asked to "fix the mypy errors", models often reach for <code>cast</code>, <code>Any</code> or <code># type: ignore</code> instead of narrowing or fixing the design. Insist: "fix without cast/ignore/Any; explain each change". They also confuse mypy and pyright behaviour and outdated flags.</p>
<p><b>What you must still own:</b> reading error messages (union-attr, arg-type, return-value), knowing variance, and choosing where runtime validation must live.</p>`,
    problems: [{
      title: 'parse_port: Pass mypy --strict Without cast or ignore',
      level: 'Medium', tags: ['narrowing', 'mypy', 'unions'], companies: ['Google', 'Shopify'],
      statement: `<p>Implement <code>parse_port(value: str | int | None, default: int = 8080) -&gt; int</code> so that it passes <code>mypy --strict</code> with <b>no</b> <code>cast</code>, <code>Any</code> or <code># type: ignore</code>.</p><ul><li><code>None</code> → <code>default</code></li><li><code>int</code> → itself, if 1 ≤ port ≤ 65535</li><li><code>str</code> → stripped and converted; empty string → <code>default</code></li><li>out of range or non-numeric → <code>ValueError</code> with a clear message</li><li><code>bool</code> is technically an int — reject it with <code>TypeError</code>.</li></ul>`,
      constraints: `Pure function, no I/O. Must be correct at runtime too: mypy cannot stop someone passing a float from untyped code.`,
      example: `<p><code>parse_port(None)</code> → ${H.c('g', '8080')}; <code>parse_port(' 443 ')</code> → ${H.c('g', '443')}; <code>parse_port(70000)</code> → ${H.c('r', 'ValueError: port must be 1-65535, got 70000')}; <code>parse_port(True)</code> → ${H.c('r', 'TypeError')}.</p>`,
      brute: { why: `<p>The "make mypy quiet" version uses <code>cast</code> and <code>int(value)</code> blindly: mypy passes, but <code>int(True)</code> is 1, <code>int(None)</code> raises a confusing TypeError, and range is never checked. Static silence is not correctness.</p>`, code: `from typing import cast

def parse_port_bad(value: str | int | None, default: int = 8080) -> int:
    return int(cast(str, value)) if value else default   # lies to mypy` },
      mcq: { q: 'In which order should the checks go so mypy narrows correctly and bools are rejected?', options: ['None → bool → int → str', 'int → bool → None → str', 'str → int → None', 'Order does not matter'], answer: 0, explain: 'Handle None first (removes it from the union). bool must be checked before int, because isinstance(True, int) is True. After int is handled, mypy knows only str is left.' },
      hints: [`<p>Hint 1: Each <code>isinstance</code>/<code>is None</code> check that returns early removes one member from the union; after them mypy knows exactly what is left.</p>`, `<p>Hint 2: Check <code>isinstance(value, bool)</code> <b>before</b> <code>isinstance(value, int)</code>. Put the range check in a small helper used by both branches.</p>`, `<p>Hint 3: For str: <code>s = value.strip()</code>; empty → default; <code>try: n = int(s) except ValueError as e: raise ValueError(f'not a number: {value!r}') from e</code>. Final fallback for weird runtime types: raise TypeError.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['parse_port(None)',
           'parse_port(None, 3000)',
           'parse_port(\' 443 \')',
           'parse_port(\'\')',
           'parse_port(\'   \')',
           'parse_port(\'\', default=9)']],
         ['8080',
          '3000',
          '443',
          '8080',
          '8080',
          '9']],
        [[['parse_port(1)',
           'parse_port(65535)',
           'parse_port(0)',
           'parse_port(65536)',
           'parse_port(-1)',
           'parse_port(70000)']],
         ['1',
          '65535',
          '!ValueError',
          '!ValueError',
          '!ValueError',
          '!ValueError']],
        [[['parse_port(\'80\')',
           'parse_port(\' 8443 \')',
           'parse_port(\'http\')',
           'parse_port(\'0\')',
           'parse_port(\'70000\')',
           'parse_port(\'12.5\')',
           'parse_port(\'-1\')',
           'parse_port(\'+80\')',
           'parse_port(\'８０\')']],
         ['80',
          '8443',
          '!ValueError',
          '!ValueError',
          '!ValueError',
          '!ValueError',
          '!ValueError',
          '80',
          '80']],
        [[['parse_port(True)',
           'parse_port(False)',
           'parse_port(80.0)',
           'parse_port([80])',
           'parse_port(b\'80\')']],
         ['!TypeError',
          '!TypeError',
          '!TypeError',
          '!TypeError',
          '!TypeError']],
        [[[String.raw`def msg(v):
    try:
        parse_port(v)
    except Exception as e:
        return str(e), type(e.__cause__).__name__`,
           'msg(70000)',
           'msg(\'http\')',
           'msg(\'0\')',
           'msg(True)']],
         ['(\'port must be 1-65535, got 70000\', \'NoneType\')',
          '("not a number: \'http\'", \'ValueError\')',
          '(\'port must be 1-65535, got 0\', \'NoneType\')',
          '(\'bool is not a valid port\', \'NoneType\')']],
        [[['all(parse_port(i) == i for i in range(1, 65536))',
           'all(parse_port(str(i)) == i for i in range(1, 65536, 7))',
           'parse_port(None, 1)']],
         ['True',
          'True',
          '1']],
      ] },
      solution: {
        approach: `<p>Narrow step by step: None → bool → int → str. Each branch returns, so mypy\'s view of <code>value</code> shrinks until only <code>str</code> remains. A final defensive <code>TypeError</code> handles calls from untyped code (mypy marks it unreachable, which is fine).</p>`,
        code: { lang: 'python', run: true, code: `def _check_range(port: int) -> int:
    if not 1 <= port <= 65535:
        raise ValueError(f'port must be 1-65535, got {port}')
    return port


def parse_port(value: str | int | None, default: int = 8080) -> int:
    if value is None:                      # value: str | int | None -> None
        return default
    if isinstance(value, bool):            # bool is an int subclass: reject first
        raise TypeError('bool is not a valid port')
    if isinstance(value, int):             # value: int
        return _check_range(value)
    if isinstance(value, str):             # value: str (only option left)
        s = value.strip()
        if not s:
            return default
        try:
            n = int(s)
        except ValueError as e:
            raise ValueError(f'not a number: {value!r}') from e
        return _check_range(n)
    # Unreachable for mypy, but untyped callers can still pass a float:
    raise TypeError(f'unsupported type {type(value).__name__}')


for v in (None, 443, ' 8443 ', '', 70000, 'http', True, 80.0):
    try:
        print(repr(v), '->', parse_port(v))   # 80.0 tests the runtime fallback
    except (ValueError, TypeError) as e:
        print(repr(v), '->', type(e).__name__ + ':', e)` },
        dry: { head: ['value', 'branch taken', 'static type there', 'result'], rows: [['None', 'is None', 'None', '8080'], ['443', 'isinstance int', 'int', '443'], ["' 8443 '", 'isinstance str', 'str', '8443'], ["''", 'str, empty', 'str', '8080'], ['70000', 'int → _check_range', 'int', '<span class="c-r">ValueError</span>'], ['True', 'isinstance bool', 'bool', '<span class="c-r">TypeError</span>'], ['80.0', 'none match', 'Never (unreachable)', '<span class="c-r">TypeError</span>']] },
        complexity: `<p>O(L) for a string of length L, O(1) otherwise. Statically: zero casts, zero ignores, zero Any.</p>`,
        followUps: ['Accept "localhost:8080" and return (host, port) — what return type?', 'Make the default configurable via an environment variable; how do you type os.environ.get?', 'Rewrite the branching with a match statement — does mypy narrow the same way?']
      }
    }]
  });

  /* ================= TOPIC 7: unittest vs pytest ================= */
  topics.push({
    title: 'Testing: unittest vs pytest, Assertions, Parametrize and What Makes a Good Test',
    analogy: `<p>A test is a <b>smoke alarm</b> for your code. You install it once; it stays quiet while things are fine and screams the moment something breaks — even months later, when someone else changes a line far away. <b>unittest</b> is the classic alarm that ships with every house (the standard library): reliable, a bit formal, needs mounting brackets (classes). <b>pytest</b> is the modern alarm everyone buys: same job, simpler to install (plain functions and <code>assert</code>), and it tells you <i>which room</i> is on fire and <i>why</i>.</p>`,
    explain: `<p>🟢 <b>The shape of every test: Arrange → Act → Assert.</b> Set up inputs, call the code, check the result. One behaviour per test, a name that says what should happen.</p>
<pre>def test_discount_is_capped_at_50_percent():
    cart = Cart(total=100)            # Arrange
    cart.apply_discount(80)           # Act
    assert cart.total == 50           # Assert</pre>
<p>🔵 <b>The two main frameworks side by side:</b></p>
${H.table(['', '<b>unittest</b> (stdlib)', '<b>pytest</b> (third party, the de-facto standard)'], [['Test shape', '<code>class TestX(unittest.TestCase)</code> with <code>test_*</code> methods', 'plain <code>def test_*():</code> functions (classes optional)'], ['Assertions', '<code>self.assertEqual(a, b)</code>, <code>assertTrue</code>, <code>assertIn</code>, <code>assertAlmostEqual</code>…', 'plain <code>assert a == b</code> — pytest rewrites it to show both values'], ['Expected errors', '<code>with self.assertRaises(ValueError):</code>', '<code>with pytest.raises(ValueError, match="positive"):</code>'], ['Setup / teardown', '<code>setUp</code>/<code>tearDown</code>, <code>setUpClass</code>, <code>addCleanup</code>', 'fixtures with <code>yield</code>, scopes, dependency injection'], ['Many inputs', '<code>with self.subTest(x=x):</code> in a loop', '<code>@pytest.mark.parametrize("x, expected", [...])</code>'], ['Run', '<code>python -m unittest discover</code>', '<code>pytest</code> (also runs unittest-style tests!)'], ['Extras', '<code>unittest.mock</code>, <code>IsolatedAsyncioTestCase</code>', 'huge plugin ecosystem: pytest-cov, pytest-xdist, pytest-asyncio, hypothesis']])}
<p><b>pytest discovery rules:</b> files named <code>test_*.py</code> or <code>*_test.py</code>, functions named <code>test_*</code>, classes named <code>Test*</code> (without <code>__init__</code>). Handy flags: <code>-k "leap and not 1900"</code> (filter by name), <code>-x</code> (stop at first failure), <code>--lf</code> (re-run last failures), <code>-v</code>, <code>-q</code>, <code>--pdb</code> (debugger on failure).</p>
<p><b>Parametrize</b> turns one test into a table of cases, each reported separately (<code>test_leap[1900-False]</code>), so one failing row does not hide the others.</p>
<p><b>What makes a test good:</b> fast (milliseconds), isolated (no shared state, any order), deterministic (no real clock/network/randomness), tests <b>behaviour</b> not implementation details, and fails with a message that tells you what broke. Think in edge cases: empty, one element, duplicates, negative, zero, huge, unicode, None, boundary values (off-by-one).</p>`,
    clues: [
      '"how would you test this function?" → list cases (happy path, edges, errors), then a parametrized table + <code>pytest.raises</code> for the error cases',
      '"unittest or pytest?" → pytest for new projects (less boilerplate, better failure output, fixtures, plugins); unittest when you cannot add dependencies — pytest runs both',
      '"the test passes on my machine but fails in CI / sometimes" → flaky: shared state, ordering, time, randomness or network; make it deterministic',
      '"check that it raises with a specific message" → <code>pytest.raises(E, match=regex)</code> / <code>assertRaisesRegex</code>',
      '"compare floats" → <code>pytest.approx</code> / <code>assertAlmostEqual</code>, never <code>==</code>',
      '"same test for many inputs" → <code>@pytest.mark.parametrize</code> or <code>subTest</code>',
      '"test pyramid" → many fast unit tests, fewer integration tests, very few end-to-end tests'
    ],
    code: [{ lang: 'python', run: true, title: 'unittest: classes, assert methods, subTest — runnable here', code: `import io
import unittest


def is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


class TestIsLeap(unittest.TestCase):
    def test_typical_leap_year(self):
        self.assertTrue(is_leap(2024))

    def test_century_is_not_leap(self):
        self.assertFalse(is_leap(1900))

    def test_table(self):
        cases = {2000: True, 2023: False, 2100: False, 2400: True}
        for year, expected in cases.items():
            with self.subTest(year=year):          # each case reported separately
                self.assertEqual(is_leap(year), expected)

    def test_rejects_strings(self):
        with self.assertRaises(TypeError):
            is_leap('2024')                        # str % int -> TypeError


suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestIsLeap)
stream = io.StringIO()
result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
print(stream.getvalue())
print('all passed?', result.wasSuccessful())` }, { lang: 'python', title: 'The same tests in pytest style (run with: pytest test_leap.py)', code: `import pytest

from leap import is_leap


@pytest.mark.parametrize(
    'year, expected',
    [
        (2024, True),      # divisible by 4
        (2023, False),     # not divisible by 4
        (1900, False),     # century, not divisible by 400
        (2000, True),      # divisible by 400
    ],
    ids=['typical', 'odd-year', 'century', 'quad-century'],
)
def test_is_leap(year, expected):
    assert is_leap(year) == expected       # pytest shows both sides on failure


def test_rejects_strings():
    with pytest.raises(TypeError, match='not all arguments converted'):
        is_leap('2024')


def test_float_maths():
    assert 0.1 + 0.2 == pytest.approx(0.3)


@pytest.mark.skip(reason='calendar reform not supported yet')
def test_julian_calendar():
    assert is_leap(1500)` }],
    codeTitle: ['unittest (stdlib)', 'pytest equivalent'],
    viz: [{
      title: 'A pytest run: collect → parametrize → run each case → report (with a buggy is_leap)',
      input: '2024 1900 2000 2023',
      inputLabel: 'Years to put in the parametrize table (max 8). Buggy code under test: year % 4 == 0',
      gen: function (input) {
        var ys = words(input).map(Number);
        if (!ys.length || ys.some(function (y) { return !Number.isInteger(y) || y < 1; })) throw new Error('Enter positive years, e.g. 2024 1900 2000');
        if (ys.length > 8) throw new Error('Use at most 8 years');
        var good = function (y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0); };
        var bad = function (y) { return y % 4 === 0; };
        var py = function (b) { return b ? 'True' : 'False'; };
        var ids = ys.map(function (y) { return 'test_leap[' + y + '-' + py(good(y)) + ']'; });
        var frames = [];
        var code = ['def is_leap(year):', '    return year % 4 == 0          # BUG: forgets the century rule', '', "@pytest.mark.parametrize('year, expected', CASES)", 'def test_leap(year, expected):', '    assert is_leap(year) == expected'].join('\n');
        frames.push(fr('<b>Collection.</b> pytest imports <code>test_leap.py</code>, finds <code>test_leap</code>, and expands the parametrize table into <b>' + ys.length + '</b> separate test items, each with its own id.', [cp(code, 4, 'cur'), { type: 'queue', label: 'collected test items', items: ids, frontLabel: 'next', backLabel: 'last' }]));
        var results = [], pass = 0, fail = 0, q = ids.slice();
        ys.forEach(function (y, i) {
          var got = bad(y), exp = good(y), ok = got === exp;
          var hlq = {}; hlq[0] = 'cur';
          frames.push(fr('Run <code>' + ids[i] + '</code>: call <code>is_leap(' + y + ')</code> → ' + y + ' % 4 = ' + (y % 4) + ' → returns <b>' + py(got) + '</b>; expected <b>' + py(exp) + '</b>.', [cp(code, 6, ok ? 'ok' : 'bad'), { type: 'queue', label: 'remaining items', items: q.slice(), hl: hlq }, vp({ year: y, 'is_leap(year)': py(got), expected: py(exp) }, 'is_leap(year)', ok ? 'ok' : 'bad')]));
          q.shift();
          if (ok) pass++; else fail++;
          results.push([ids[i], ok ? 'PASSED' : 'FAILED']);
          if (!ok) frames.push(fr('<span class="c-r">FAILED.</span> Thanks to <b>assertion rewriting</b>, pytest shows the values on both sides — no need for assertEqual. The other cases still run.', [tx('<pre>    def test_leap(year, expected):\n&gt;       assert is_leap(year) == expected\nE       assert ' + py(got) + ' == ' + py(exp) + '\nE        +  where ' + py(got) + ' = is_leap(' + y + ')</pre>', 'Failure report'), { type: 'table', label: 'results so far', columns: ['test id', 'outcome'], rows: results.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; results.forEach(function (r, k) { h[k] = r[1] === 'PASSED' ? 'ok' : 'bad'; }); return h; })() }]));
        });
        frames.push(fr('<b>Summary line.</b> ' + (fail ? 'The century cases expose the bug. Fix: <code>year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)</code>.' : 'All passed — but notice: if your table has no century year like 1900 or 2100, this buggy code passes! <b>Tests are only as good as their edge cases.</b>'), [{ type: 'table', label: 'pytest -v', columns: ['test id', 'outcome'], rows: results.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; results.forEach(function (r, k) { h[k] = r[1] === 'PASSED' ? 'ok' : 'bad'; }); return h; })() }, tx('<b>' + (fail ? '<span class="c-r">' + fail + ' failed</span>, ' : '') + '<span class="c-g">' + pass + ' passed</span></b> in 0.01s', 'Summary')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: assert with a tuple is always true', html: `<p>Classic trap: <code>assert (x == 2, "message")</code> asserts a <b>non-empty tuple</b>, which is truthy — it never fails. Python emits a <code>SyntaxWarning: assertion is always true</code>. Correct form: <code>assert x == 2, "message"</code>. Output: ${H.c('r', 'tuple form passed')} then ${H.c('g', 'AssertionError: x should be 2')}.</p>`, code: { lang: 'python', run: true, code: `x = 3
cond = (x == 2, 'x should be 2')      # what the buggy assert evaluates
if cond:
    print('tuple form passed (non-empty tuple is truthy)')
try:
    assert x == 2, 'x should be 2'     # correct form
except AssertionError as e:
    print('AssertionError:', e)` } },
      { title: 'Testing exceptions precisely', html: `<p>Check the <b>type</b> and the <b>message</b>, and keep the <code>with</code> block to the single call that should raise — otherwise an earlier line raising the same type would make the test pass for the wrong reason.</p>${H.table(['unittest', 'pytest'], [['<code>with self.assertRaisesRegex(ValueError, "positive"):</code>', '<code>with pytest.raises(ValueError, match="positive") as exc:</code>'], ['<code>cm.exception.args</code>', '<code>exc.value.args</code>, <code>exc.type</code>'], ['<code>self.assertRaises(E, fn, *args)</code>', '—']])}`, code: { lang: 'python', run: true, code: `import unittest


def withdraw(balance, amount):
    if amount <= 0:
        raise ValueError(f'amount must be positive, got {amount}')
    return balance - amount


class T(unittest.TestCase):
    def test_negative_amount(self):
        with self.assertRaisesRegex(ValueError, 'must be positive') as cm:
            withdraw(100, -5)
        self.assertIn('-5', str(cm.exception))


r = unittest.TextTestRunner(verbosity=0).run(unittest.defaultTestLoader.loadTestsFromTestCase(T))
print('ok' if r.wasSuccessful() else 'failed')` } },
      { title: 'Write tests from the edge cases, not the happy path', html: `<p>For <code>chunk(xs, n)</code> (split a list into pieces of size n), a strong case table:</p>${H.table(['case', 'input', 'expected'], [['empty', '([], 3)', '[]'], ['exact fit', '([1,2,3,4], 2)', '[[1,2],[3,4]]'], ['remainder', '([1,2,3], 2)', '[[1,2],[3]]'], ['n bigger than list', '([1], 5)', '[[1]]'], ['invalid n', '([1], 0)', 'ValueError']])}`, code: { lang: 'python', run: true, code: `def chunk(xs, n):
    if n <= 0:
        raise ValueError('n must be positive')
    return [xs[i:i + n] for i in range(0, len(xs), n)]


cases = [(([], 3), []), (([1, 2, 3, 4], 2), [[1, 2], [3, 4]]),
         (([1, 2, 3], 2), [[1, 2], [3]]), (([1], 5), [[1]])]
for args, expected in cases:
    got = chunk(*args)
    assert got == expected, f'chunk{args} = {got}, expected {expected}'
try:
    chunk([1], 0)
    raise AssertionError('expected ValueError')
except ValueError:
    pass
print('all', len(cases) + 1, 'checks passed')` } },
      { title: 'The test pyramid in one table', html: `${H.table(['level', 'tests what', 'speed', 'how many', 'Python tools'], [['unit', 'one function/class, dependencies faked', 'ms', 'hundreds–thousands', 'pytest, unittest, hypothesis'], ['integration', 'your code + real DB/queue/files', '100 ms–s', 'tens–hundreds', 'pytest + testcontainers, tmp_path'], ['end-to-end', 'the whole system as a user', 'seconds–minutes', 'a handful', 'playwright, requests against staging']])}<p>Inverted pyramids (mostly slow E2E tests) give slow, flaky CI — a common anti-pattern.</p>` }
    ],
    deepDive: `<p>🟣 <b>How pytest's assertion rewriting works.</b> pytest installs an <b>import hook</b> for test modules (and <code>conftest.py</code>, and plugins). Before compiling, it rewrites the AST of every <code>assert</code> statement into code that saves each sub-expression in temporaries, so on failure it can print <code>assert 3 == 4</code> plus "where 3 = f(2)". Rewritten bytecode is cached in <code>__pycache__</code> with a pytest-specific tag. That is why helper modules outside tests show plain AssertionErrors unless you call <code>pytest.register_assert_rewrite</code>.</p>
<p><b>Property-based testing.</b> <b>Hypothesis</b> generates hundreds of inputs from a strategy (<code>@given(st.lists(st.integers()))</code>), checks <b>properties</b> (e.g. "sorting twice equals sorting once", "decode(encode(x)) == x"), and when it finds a failure it <b>shrinks</b> it to a minimal counterexample. It finds edge cases humans forget (empty lists, huge ints, NaN, unicode surrogates).</p>
<p><b>Coverage and mutation testing.</b> <code>pytest --cov=src --cov-branch</code> measures which lines/branches ran. 100% coverage does not mean correct (a test without asserts covers lines); <b>mutation testing</b> (mutmut, cosmic-ray) changes your code (<code>&lt;</code> to <code>&lt;=</code>) and checks that some test fails — a much stronger signal of test quality.</p>
<p><b>Scale tricks:</b> <code>pytest-xdist -n auto</code> runs tests in parallel processes (forces isolation!), <code>pytest-randomly</code> shuffles order to expose hidden coupling, markers (<code>@pytest.mark.slow</code> + <code>-m "not slow"</code>) split fast and slow suites, <code>--durations=10</code> finds the slowest tests. <code>doctest</code> runs examples embedded in docstrings — good for docs, weak as a test suite. For async code: <code>pytest-asyncio</code> or <code>unittest.IsolatedAsyncioTestCase</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> writing test boilerplate is nearly free now: "write pytest tests for this function, parametrized, including edge cases and error cases" gives a solid first draft in seconds. Tests have become the main way to <b>verify AI-generated code</b> and to give coding agents a target ("make these tests pass without editing them").</p>
<p><b>Where AI goes wrong:</b> it writes tests that mirror the implementation (and therefore its bugs), asserts on whatever the code currently returns (snapshotting bugs into "expected" values), over-mocks so nothing real is tested, or weakens/deletes a failing test to make the suite green. Always ask: <i>where did each expected value come from — the spec, or the code?</i></p>
<p><b>What you must still own:</b> choosing the cases (especially the boundaries), deciding what is a unit, keeping tests deterministic, and reviewing AI tests as critically as AI code. Writing a few tests <b>before</b> asking AI for the implementation is a powerful habit.</p>`,
    problems: [{
      title: 'Find the Bug With a Test Table (is_leap)',
      level: 'Easy', tags: ['parametrize', 'edge cases', 'pytest'], companies: ['Amazon', 'Atlassian'],
      statement: `<p>A teammate wrote <code>is_leap(year)</code> as <code>return year % 4 == 0</code>. Write a <b>table-driven test</b> (a list of <code>(year, expected)</code> pairs run in a loop, the same thing <code>@pytest.mark.parametrize</code> produces) that <b>fails</b> on this implementation and <b>passes</b> on a correct one, and report every failing row, not just the first.</p>`,
      constraints: `Use plain asserts or a results list so it runs anywhere. Cover all four rules of the Gregorian calendar with the fewest rows.`,
      example: `<p>Rows <code>(2024, True)</code>, <code>(2023, False)</code>, <code>(1900, False)</code>, <code>(2000, True)</code>. On the buggy version only ${H.c('r', '1900')} fails (1900 % 4 == 0 but centuries are not leap unless divisible by 400). ${H.c('g', '2000')} passes by luck — it IS divisible by 400.</p>`,
      brute: { why: `<p>One test with only <code>assert is_leap(2024)</code> passes on the buggy code — the bug survives. A long list of random years usually also passes, because only 3 in every 400 years trigger the century rule. Quantity of tests is not quality; the boundary cases matter.</p>`, code: `def buggy_is_leap(year):
    return year % 4 == 0

def test_weak():
    assert buggy_is_leap(2024)        # passes: proves nothing about centuries
    assert not buggy_is_leap(2023)

test_weak()
print('weak test passed on buggy code')` },
      mcq: { q: 'Which single row exposes the bug in <code>year % 4 == 0</code>?', options: ['(1900, False)', '(2000, True)', '(2024, True)', '(2023, False)'], answer: 0, explain: '1900 is divisible by 4, so the buggy code says True, but it is a century not divisible by 400, so the correct answer is False. 2000 is divisible by 400, so both versions agree.' },
      hints: [`<p>Hint 1: There are 4 rules: divisible by 4 → leap; but divisible by 100 → not leap; but divisible by 400 → leap; otherwise not leap. One row per rule.</p>`, `<p>Hint 2: Loop over the rows, collect failures in a list instead of stopping at the first assert — that is what parametrize gives you for free.</p>`, `<p>Hint 3: Run the same table against the buggy and the fixed function. A good test table is "red" on the bug and "green" on the fix.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['run_table(buggy_is_leap)',
           'run_table(is_leap)']],
         ['[\'buggy_is_leap(1900) = True, expected False\']',
          '[]']],
        [[['import calendar',
           'all(calendar.isleap(y) == e for y, e in CASES)',
           'len(CASES)',
           'sorted(y for y, e in CASES)']],
         ['True',
          '4',
          '[1900, 2000, 2023, 2024]']],
        [[['def m1(y): return y % 4 == 0 and y % 100 != 0',
           'run_table(m1)']],
         ['[\'m1(2000) = False, expected True\']']],
        [[['def m4(y): return True',
           'def m5(y): return False',
           'run_table(m4)',
           'run_table(m5)']],
         ['[\'m4(2023) = True, expected False\', \'m4(1900) = True, expected False\']',
          '[\'m5(2024) = False, expected True\', \'m5(2000) = False, expected True\']']],
        [[['def m6(y): return y % 400 == 0 or (y % 4 == 0 and y % 100 != 0)',
           'run_table(m6)',
           'def m7(y): return y % 100 != 0 or y % 400 == 0',
           'run_table(m7)']],
         ['[]',
          '[\'m7(2023) = True, expected False\']']],
        [[['is_leap(1600)',
           'is_leap(2100)',
           'is_leap(1)',
           'is_leap(0)',
           'import calendar',
           'all(is_leap(y) == calendar.isleap(y) for y in range(1, 10000))']],
         ['True',
          'False',
          'False',
          'True',
          'True']],
      ] },
      solution: {
        approach: `<p>Choose one representative year for each rule (a classic <b>equivalence partition</b> + <b>boundary</b> approach), then run the table against both implementations and print every failing row.</p>`,
        code: { lang: 'python', run: true, code: `CASES = [
    (2024, True),    # rule 1: divisible by 4
    (2023, False),   # not divisible by 4
    (1900, False),   # rule 2: century -> not leap
    (2000, True),    # rule 3: divisible by 400 -> leap
]


def buggy_is_leap(year):
    return year % 4 == 0


def is_leap(year):
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def run_table(fn):
    failures = []
    for year, expected in CASES:          # like @pytest.mark.parametrize
        got = fn(year)
        if got != expected:
            failures.append(f'{fn.__name__}({year}) = {got}, expected {expected}')
    return failures


for fn in (buggy_is_leap, is_leap):
    fails = run_table(fn)
    print(fn.__name__, 'FAILED' if fails else 'PASSED', fails)` },
        alt: [{ lang: 'python', code: `# pytest version (save as test_leap.py and run: pytest -v)
import pytest

from leap import is_leap


@pytest.mark.parametrize('year, expected', [(2024, True), (2023, False), (1900, False), (2000, True)])
def test_is_leap(year, expected):
    assert is_leap(year) == expected` }],
        dry: { head: ['year', 'expected', 'buggy result', 'fixed result'], rows: [['2024', 'True', 'True ✅', 'True ✅'], ['2023', 'False', 'False ✅', 'False ✅'], ['1900', 'False', '<span class="c-r">True ❌</span>', 'False ✅'], ['2000', 'True', 'True ✅', 'True ✅']] },
        complexity: `<p>4 rows, O(1) each. The value is in the choice of rows: each one pins down a different rule, so any single wrong rule turns the table red.</p>`,
        followUps: ['Add a property-based test with Hypothesis: "exactly 97 leap years in any 400-year window".', 'What should is_leap(0) or negative years return? Write the test first, then decide.', 'Compare against calendar.isleap as an oracle for years 1..3000.']
      }
    }]
  });

  /* ================= TOPIC 8: Fixtures and mocking ================= */
  var FIX = { db: { scope: 'session', deps: [] }, client: { scope: 'function', deps: ['db'] }, tmp: { scope: 'function', deps: [] }, user: { scope: 'function', deps: ['db'] } };

  topics.push({
    title: 'Fixtures and Mocking: Setup/Teardown, pytest Fixtures, unittest.mock and "Patch Where It Is Looked Up"',
    analogy: `<p>A <b>film set</b>. Before each scene, the crew builds the room and places props (<b>setup / fixtures</b>); after the scene they clear it so the next scene starts clean (<b>teardown</b>). Expensive things like the lighting rig are set up <b>once for the whole day</b> (a session-scoped fixture). And when a scene needs an explosion or a real lion, you do not use the real thing — you use a <b>stunt double</b> that looks right and lets you check exactly what happened (<b>mocks</b>). The trick: put the double <b>where the actor will actually look</b>, not in the warehouse it came from.</p>`,
    explain: `<p>🟢 <b>Fixtures</b> prepare what a test needs (objects, temp files, a database) and clean up afterwards — so tests stay short and independent.</p>
${H.table(['', 'unittest', 'pytest'], [['per test', '<code>setUp()</code> / <code>tearDown()</code> methods', 'function-scoped fixture: <code>@pytest.fixture</code> + <code>yield</code>'], ['once per class/module', '<code>setUpClass</code> / <code>setUpModule</code>', '<code>scope="class"</code> / <code>"module"</code>'], ['once per run', '—', '<code>scope="session"</code>'], ['guaranteed cleanup', '<code>self.addCleanup(fn)</code>', 'code after <code>yield</code> (runs even if the test fails)'], ['share across files', 'base TestCase class', '<code>conftest.py</code> (auto-discovered)'], ['built-ins', '—', '<code>tmp_path</code>, <code>monkeypatch</code>, <code>capsys</code>, <code>caplog</code>, <code>request</code>']])}
<pre>@pytest.fixture
def db():
    conn = sqlite3.connect(':memory:')     # setup
    conn.execute('CREATE TABLE users(name TEXT)')
    yield conn                             # the test runs here
    conn.close()                           # teardown (always)

def test_insert(db):                       # asked for by NAME: dependency injection
    db.execute("INSERT INTO users VALUES ('asha')")
    assert db.execute('SELECT count(*) FROM users').fetchone() == (1,)</pre>
<p>Fixtures can depend on other fixtures, and pytest builds them in dependency order and tears them down in <b>reverse</b> order (last built, first destroyed — a stack).</p>
<p>🔵 <b>Mocking</b> replaces a slow, random or dangerous dependency (HTTP API, clock, payment gateway, email) with a fake object you control and can inspect. <code>unittest.mock</code> is in the standard library:</p>
<ul>
<li><code>m = Mock()</code> — any attribute or call works and is <b>recorded</b>. <code>MagicMock</code> also supports dunders (<code>len(m)</code>, <code>with m:</code>, <code>m[0]</code>).</li>
<li><code>m.return_value = 42</code> — what a call returns. <code>m.side_effect = TimeoutError()</code> — raise instead; <code>side_effect = [1, 2, 3]</code> — return successive values; <code>side_effect = fn</code> — compute the result.</li>
<li><code>m.assert_called_once_with(city='Pune')</code>, <code>m.call_count</code>, <code>m.call_args_list</code> — verify the interaction.</li>
<li><code>patch('app.fetch_temp')</code> (decorator or <code>with</code>) — temporarily replace a name, restore it afterwards.</li>
</ul>
<p><b>The #1 mocking rule: patch where it is looked up, not where it is defined.</b> If <code>app.py</code> does <code>from weather import fetch_temp</code>, then <code>app</code> has its <b>own</b> name <code>fetch_temp</code>. Patching <code>weather.fetch_temp</code> changes the weather module's name only; <code>app</code> still calls the real one. Patch <code>app.fetch_temp</code>.</p>
<p><b>Safety:</b> use <code>autospec=True</code> / <code>create_autospec</code> / <code>spec=</code> so the mock has the real signature and attributes — otherwise calls with wrong arguments, or calls to methods that no longer exist on the real object, silently "pass". (Mock does protect you from misspelled assertion helpers: names starting with <code>assret</code>, and since 3.12 <code>asert</code>/<code>aseert</code>/<code>assrt</code>, raise AttributeError.)</p>`,
    clues: [
      '"test code that calls an external API / sends email / charges a card" → mock the boundary (patch or inject a fake), assert on the call',
      '"my patch has no effect, the real function still runs" → you patched where it is defined; patch where it is imported/looked up',
      '"expensive setup (DB, container) shared by many tests" → session/module-scoped fixture; per-test isolation via transactions rolled back in a function fixture',
      '"cleanup must run even when the test fails" → <code>yield</code> fixture / <code>addCleanup</code> / context manager',
      '"simulate a timeout then success (retry logic)" → <code>side_effect=[TimeoutError(), 200]</code>',
      '"test depends on the current time / random numbers" → inject a clock/rng, or patch <code>time.time</code>/use freezegun; seed randomness',
      '"temporarily set an env var / attribute" → pytest <code>monkeypatch.setenv</code> / <code>setattr</code> (auto-undone)'
    ],
    code: [{ lang: 'python', run: true, title: 'unittest.mock essentials: return_value, side_effect, assertions, patch', code: `from unittest import mock

# 1) A Mock records everything
api = mock.Mock()
api.get_user.return_value = {'id': 7, 'name': 'Asha'}
print(api.get_user(7))                         # {'id': 7, 'name': 'Asha'}
api.get_user.assert_called_once_with(7)
print(api.get_user.call_count, api.get_user.call_args)

# 2) side_effect: exceptions, sequences, functions
flaky = mock.Mock(side_effect=[TimeoutError('slow'), 'ok'])
for attempt in range(2):
    try:
        print('attempt', attempt, '->', flaky())
    except TimeoutError as e:
        print('attempt', attempt, '-> timeout:', e)

square = mock.Mock(side_effect=lambda x: x * x)
print(square(9))                               # 81

# 3) spec/autospec: catch wrong usage of the fake
def send_email(to, subject, body):
    raise RuntimeError('would really send!')

fake_send = mock.create_autospec(send_email, return_value=True)
fake_send('a@x.com', 'hi', 'hello')
try:
    fake_send('a@x.com')                       # missing args -> TypeError, like the real one
except TypeError as e:
    print('autospec caught bad call:', e)

# 4) patch: temporarily replace an attribute on an object/module
import random
with mock.patch.object(random, 'randint', return_value=4):
    print('dice:', random.randint(1, 6))       # always 4 inside the block
print('restored:', random.randint.__name__)` }, { lang: 'python', title: 'pytest fixtures: yield, scope, dependencies, built-ins (run with pytest)', code: `import sqlite3

import pytest


@pytest.fixture(scope='session')
def db():
    conn = sqlite3.connect(':memory:')                 # built ONCE per test run
    conn.execute('CREATE TABLE users(name TEXT UNIQUE)')
    yield conn
    conn.close()                                       # after the last test


@pytest.fixture
def clean_db(db):                                      # depends on db
    yield db
    db.execute('DELETE FROM users')                    # per-test cleanup keeps tests isolated


@pytest.fixture
def user(clean_db):
    clean_db.execute("INSERT INTO users VALUES ('asha')")
    return 'asha'


def test_user_exists(clean_db, user):
    rows = clean_db.execute('SELECT name FROM users').fetchall()
    assert rows == [(user,)]


def test_starts_empty(clean_db):
    assert clean_db.execute('SELECT count(*) FROM users').fetchone() == (0,)


def test_writes_file(tmp_path, monkeypatch):
    monkeypatch.setenv('APP_MODE', 'test')             # undone automatically
    path = tmp_path / 'out.txt'                        # unique temp dir per test
    path.write_text('hi')
    assert path.read_text() == 'hi'` }],
    codeTitle: ['unittest.mock essentials', 'pytest fixtures'],
    viz: [{
      title: 'Fixture setup/teardown flow: scopes, dependencies and reverse-order teardown',
      input: 'a:db,tmp b:client c:tmp,user',
      inputLabel: 'tests as name:fixtures (fixtures: db = session; client, user need db; tmp). Max 5 tests',
      gen: function (input) {
        var tests = String(input || '').trim().split(/\s+/).filter(function (x) { return x; }).map(function (t) {
          var p = t.split(':');
          if (p.length !== 2 || !p[0]) throw new Error('Format: name:fix1,fix2  e.g.  a:db,tmp b:client');
          var fx = p[1].split(',').filter(function (x) { return x; });
          fx.forEach(function (f) { if (!FIX[f]) throw new Error('Unknown fixture "' + f + '". Use db, client, user, tmp'); });
          return { name: 'test_' + p[0], fx: fx };
        });
        if (!tests.length || tests.length > 5) throw new Error('Give 1-5 tests');
        var frames = [], active = [], log = [];
        function stackPart(hlTop, cls) {
          var hl = {};
          if (hlTop !== undefined) hl[hlTop] = cls;
          return { type: 'stack', label: 'active fixtures (bottom = oldest)', items: active.map(function (a) { return a + ' [' + FIX[a].scope + ']'; }), hl: hl };
        }
        function logPart() { return tx(log.length ? '<pre>' + log.slice(-8).map(esc).join('\n') + '</pre>' : '<i>(nothing yet)</i>', 'pytest -s output (latest lines)'); }
        frames.push(fr('pytest collects ' + tests.length + ' tests. Nothing is set up yet: fixtures are created <b>lazily</b>, only when a test asks for them by parameter name.', [stackPart(), { type: 'queue', label: 'tests to run', items: tests.map(function (t) { return t.name + '(' + t.fx.join(', ') + ')'; }) }]));
        tests.forEach(function (t, ti) {
          var order = [];
          var visit = function (f) { FIX[f].deps.forEach(visit); if (order.indexOf(f) < 0) order.push(f); };
          t.fx.forEach(visit);
          var created = [];
          order.forEach(function (f) {
            if (active.indexOf(f) >= 0) {
              frames.push(fr('<code>' + t.name + '</code> needs <b>' + f + '</b>. It is ' + FIX[f].scope + '-scoped and already alive → <b>reused</b>, no setup.', [stackPart(active.indexOf(f), 'win'), logPart()]));
              return;
            }
            active.push(f); created.push(f);
            log.push('SETUP    ' + f + (FIX[f].deps.length ? ' (uses ' + FIX[f].deps.join(', ') + ')' : ''));
            frames.push(fr('<code>' + t.name + '</code> needs <b>' + f + '</b>' + (FIX[f].deps.length ? ', which itself depends on <b>' + FIX[f].deps.join(', ') + '</b> (built first)' : '') + '. Run its code <b>up to <code>yield</code></b> → push it.', [stackPart(active.length - 1, 'ok'), logPart()]));
          });
          log.push('RUN      ' + t.name);
          frames.push(fr('All fixtures ready → run <b>' + t.name + '</b>. The fixture values are passed in as arguments.', [stackPart(active.length - 1, 'cur'), logPart(), { type: 'queue', label: 'tests left', items: tests.slice(ti + 1).map(function (x) { return x.name; }) }]));
          for (var k = active.length - 1; k >= 0; k--) {
            var f = active[k];
            if (FIX[f].scope !== 'function') continue;
            frames.push(fr('Test finished → tear down function-scoped <b>' + f + '</b> (code after its <code>yield</code>). Reverse order: newest first, so nothing is destroyed while something still depends on it.', [stackPart(k, 'bad'), logPart()]));
            log.push('TEARDOWN ' + f);
            active.splice(k, 1);
          }
        });
        for (var s = active.length - 1; s >= 0; s--) {
          frames.push(fr('All tests done → tear down session-scoped <b>' + active[s] + '</b>. It was built once and shared by every test that asked for it.', [stackPart(s, 'bad'), logPart()]));
          log.push('TEARDOWN ' + active[s]);
          active.splice(s, 1);
        }
        frames.push(fr('Finished. Setup is stack-like (push on demand) and teardown is LIFO. Session fixtures save time; function fixtures keep tests isolated.', [stackPart(), logPart()]));
        return frames;
      }
    }, {
      title: 'Patch where it is looked up: app.fetch vs weather.fetch',
      input: 'weather.fetch',
      inputLabel: 'patch target (weather.fetch or app.fetch)',
      gen: function (input) {
        var t = String(input || '').trim();
        if (t !== 'weather.fetch' && t !== 'app.fetch') throw new Error('Type weather.fetch or app.fetch');
        var appCode = ['# app.py', 'from weather import fetch', '', 'def alert(city):', '    t = fetch(city)        # looks up "fetch" in app\'s globals', "    return 'HOT' if t > 35 else 'ok'"].join('\n');
        var g = function (hl, eh, tags) { return { type: 'graph', label: 'names → objects', directed: true, height: 40, nodes: [{ id: 'W', label: 'weather.fetch', x: 18, y: 8, shape: 'box' }, { id: 'A', label: 'app.fetch', x: 18, y: 32, shape: 'box' }, { id: 'R', label: 'real fetch() (HTTP!)', x: 72, y: 8, shape: 'box' }, { id: 'M', label: 'MagicMock(return_value=40)', x: 72, y: 32, shape: 'box' }], edges: eh, hl: hl || {}, tags: tags || {} }; };
        var frames = [];
        frames.push(fr('<code>weather.py</code> defines <code>fetch</code>. The name <code>weather.fetch</code> points to the real function (which makes an HTTP call).', [g({ W: 'cur', R: 'cur' }, [['W', 'R']]), cp(appCode, 1)]));
        frames.push(fr('<code>from weather import fetch</code> <b>copies the reference</b> into app\'s own namespace. Now TWO names point to the same function object.', [g({ A: 'ok' }, [['W', 'R'], ['A', 'R']]), cp(appCode, 2, 'ok')]));
        if (t === 'weather.fetch') {
          frames.push(fr('<code>patch("weather.fetch")</code> rebinds the name in the <b>weather</b> module to a mock…', [g({ W: 'cur', M: 'ok' }, [['W', 'M'], ['A', 'R']]), tx('with patch("weather.fetch", return_value=40): ...', 'test code')]));
          frames.push(fr('…but <code>alert()</code> looks up <code>fetch</code> in <b>app\'s</b> globals, which still points to the <span class="c-r">real</span> function. The test makes a real HTTP call (slow, flaky) and the mock is never called.', [g({ A: 'bad', R: 'bad' }, [['W', 'M'], ['A', 'R']], { A: 'used by alert()' }), cp(appCode, 5, 'bad'), tx('<span class="c-r">AssertionError: Expected \'fetch\' to have been called once. Called 0 times.</span>', 'test result')]));
          frames.push(fr('Fix: patch the name where it is <b>used</b> → <code>patch("app.fetch")</code>. (Alternatively, write <code>import weather</code> + <code>weather.fetch(city)</code> in app.py; then patching <code>weather.fetch</code> works because the lookup goes through the module.)', [tx('<b>Rule:</b> patch the name in the namespace of the code under test.', 'Takeaway')]));
        } else {
          frames.push(fr('<code>patch("app.fetch")</code> rebinds the name in <b>app\'s</b> namespace to a mock. weather.fetch is untouched.', [g({ A: 'cur', M: 'ok' }, [['W', 'R'], ['A', 'M']]), tx('with patch("app.fetch", return_value=40) as m: ...', 'test code')]));
          frames.push(fr('<code>alert("Pune")</code> looks up <code>fetch</code> in app\'s globals → finds the <span class="c-g">mock</span> → returns 40 → <b>"HOT"</b>. No network.', [g({ A: 'ok', M: 'ok' }, [['W', 'R'], ['A', 'M']], { A: 'used by alert()' }), cp(appCode, 5, 'ok'), tx("<span class=\"c-g\">alert('Pune') == 'HOT'; m.assert_called_once_with('Pune') passes</span>", 'test result')]));
          frames.push(fr('When the <code>with</code> block exits, patch <b>restores</b> the original binding, so other tests see the real function again.', [g({}, [['W', 'R'], ['A', 'R']]), tx('<b>Rule:</b> patch the name in the namespace of the code under test.', 'Takeaway')]));
        }
        return frames;
      }
    }],
    examples: [
      { title: 'patch where it is looked up — runnable proof', html: `<p>We build two tiny modules in memory (<code>weather</code> and <code>app</code>, where app does <code>from weather import fetch</code>) and patch each target. Output: patching <code>weather.fetch</code> → ${H.c('r', 'real fetch called')}; patching <code>app.fetch</code> → ${H.c('g', 'HOT')}.</p>`, code: { lang: 'python', run: true, code: `import sys
import types
from unittest import mock

weather = types.ModuleType('weather')
exec("def fetch(city):\\n    print('  real fetch called (network!)')\\n    return 20", weather.__dict__)
sys.modules['weather'] = weather

app = types.ModuleType('app')
exec("from weather import fetch\\ndef alert(city):\\n    return 'HOT' if fetch(city) > 35 else 'ok'", app.__dict__)
sys.modules['app'] = app

with mock.patch('weather.fetch', return_value=40) as m:
    print('patch weather.fetch ->', app.alert('Pune'), '| mock calls:', m.call_count)

with mock.patch('app.fetch', return_value=40) as m:
    print('patch app.fetch     ->', app.alert('Pune'), '| mock calls:', m.call_count)
    m.assert_called_once_with('Pune')` } },
      { title: 'Prefer dependency injection over patching', html: `<p>If the function <b>receives</b> its dependency as a parameter (with a sensible default), tests just pass a fake — no patch strings, no import-path traps, and the design gets clearer.</p>`, code: { lang: 'python', run: true, code: `import time


def is_expired(created_at, ttl_seconds, now=time.time):
    """now is injectable: production uses the real clock, tests pass a fake."""
    return now() - created_at > ttl_seconds


def fake_clock():
    return 1_000.0

print(is_expired(900.0, 60, now=fake_clock))   # True: 100 s old
print(is_expired(990.0, 60, now=fake_clock))   # False: 10 s old` } },
      { title: 'unittest setUp / addCleanup order', html: `<p><code>setUp</code> runs before each test, <code>tearDown</code> after; <code>addCleanup</code> callbacks run after tearDown in <b>LIFO</b> order, even if setUp fails partway — safer for multi-resource setup.</p>`, code: { lang: 'python', run: true, code: `import unittest

log = []


class T(unittest.TestCase):
    def setUp(self):
        log.append('setUp')
        self.addCleanup(log.append, 'cleanup 1 (registered first)')
        self.addCleanup(log.append, 'cleanup 2 (registered second)')

    def tearDown(self):
        log.append('tearDown')

    def test_x(self):
        log.append('test_x runs')


unittest.TextTestRunner(verbosity=0).run(unittest.defaultTestLoader.loadTestsFromTestCase(T))
print('\\n'.join(log))` } },
      { title: 'Test doubles vocabulary', html: `${H.table(['double', 'what it is', 'example'], [['dummy', 'passed but never used', '<code>None</code> for an unused logger'], ['stub', 'returns canned answers', '<code>Mock(return_value=200)</code>'], ['fake', 'working lightweight implementation', 'in-memory repository, SQLite instead of Postgres'], ['spy', 'real object + records calls', '<code>Mock(wraps=real_fn)</code>'], ['mock', 'pre-programmed expectations, verified', '<code>m.assert_called_once_with(...)</code>']])}<p>Rule of thumb: mock at the <b>boundary of your system</b> (network, clock, filesystem, third-party SDK), not your own internal classes — over-mocking makes tests pass while the real wiring is broken.</p>` }
    ],
    deepDive: `<p>🟣 <b>How patch works.</b> <code>patch('pkg.mod.name')</code> imports <code>pkg.mod</code>, saves <code>getattr(mod, 'name')</code>, does <code>setattr(mod, 'name', MagicMock())</code>, and restores the original in <code>__exit__</code> (or after the decorated function). It is just attribute assignment on a module object — that is why the lookup location matters. Patching a method on a class (<code>patch.object(Class, 'method')</code>) affects all instances, including ones created elsewhere during the test. Patching builtins: <code>patch('builtins.open', mock_open(read_data='x'))</code>.</p>
<p><b>Mock pitfalls.</b> A plain <code>Mock</code> accepts <b>any</b> attribute, so a renamed method in production code keeps tests green (they call a method that no longer exists on the real class). <code>autospec=True</code> copies signatures recursively and fixes this. <code>AsyncMock</code> (3.8+) is needed for <code>await</code>-ed calls; <code>patch</code> picks it automatically for async functions. Mocks are not thread-safe for assertions in timing-sensitive tests. And <code>mock.call_args</code> compares with <code>==</code> — pass <code>mock.ANY</code> for values you do not care about.</p>
<p><b>Fixture internals.</b> pytest builds a dependency graph from parameter names, caches each fixture value per scope key (one per function / class / module / package / session), and finalizers run in reverse order of setup. <code>autouse=True</code> applies a fixture to every test in scope; <code>@pytest.fixture(params=[...])</code> runs dependent tests once per param; <code>request.addfinalizer</code> and <code>request.param</code> give fine control. A wider-scoped fixture cannot depend on a narrower one (ScopeMismatch error). With <code>pytest-xdist</code>, "session" means "per worker process".</p>
<p><b>Production-grade test infrastructure.</b> Integration tests often use a session-scoped container (Testcontainers) plus a function-scoped fixture that wraps each test in a <b>transaction rolled back</b> at teardown — fast and isolated. HTTP mocking libraries (<code>responses</code>, <code>respx</code>, VCR-style recorders) intercept at the transport layer, which is more realistic than patching your own client function. Time: <code>freezegun</code>/<code>time-machine</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate fixtures and mocks quickly, and agents increasingly run your test suite themselves. Good fixtures (a <code>conftest.py</code> with clear, named building blocks) make AI-written tests better, because the model reuses them instead of inventing setup.</p>
<p><b>Where AI goes wrong:</b> the most common bug in AI-written tests is <b>patching the wrong target</b> (where defined instead of where looked up), followed by mocks without <code>autospec</code>, asserting on the mock's own return value (testing the mock, not the code), and mocking so much that the test exercises nothing real. Also watch for tests that hit the real network or the real clock.</p>
<p><b>Testing LLM features themselves:</b> mock the model client in unit tests (deterministic canned responses, including malformed JSON and timeouts via <code>side_effect</code>), and keep separate, non-blocking <b>eval</b> suites that call the real model and score outputs. <b>What you must still own:</b> deciding where the system boundary is and what behaviour actually matters.</p>`,
    problems: [{
      title: 'Test a Weather Alert Without Touching the Network',
      level: 'Medium', tags: ['mock', 'patch', 'side_effect'], companies: ['Uber', 'Airbnb', 'Spotify'],
      statement: `<p><code>app.alert(city)</code> calls <code>fetch(city)</code> (imported with <code>from weather import fetch</code>, a real HTTP call) and returns <code>'HOT'</code> if the temperature is above 35, <code>'ok'</code> otherwise, and <code>'unknown'</code> if fetch raises <code>TimeoutError</code> twice in a row (it retries once). Write tests for all three behaviours <b>without any network access</b>, verifying the number of calls.</p>`,
      constraints: `Use unittest.mock (stdlib). The real fetch must never run. Tests must be deterministic.`,
      example: `<p>With fetch mocked to return 40 → ${H.c('g', "'HOT'")}, called once with 'Pune'. With <code>side_effect=[TimeoutError(), 20]</code> → ${H.c('g', "'ok'")}, called twice. With <code>side_effect=TimeoutError()</code> → ${H.c('y', "'unknown'")}, called twice.</p>`,
      brute: { why: `<p>Calling the real API in tests: slow, rate-limited, fails offline, and the temperature changes every day so you cannot assert on 'HOT'. Patching <code>weather.fetch</code> instead of <code>app.fetch</code> looks right but still calls the real function.</p>`, code: `from unittest import mock

def test_alert_wrong_target(app):
    # Looks reasonable, but app has its own name 'fetch' -> real HTTP call happens
    with mock.patch('weather.fetch', return_value=40):
        assert app.alert('Pune') == 'HOT'` },
      mcq: { q: 'How do you simulate "timeout on the first call, 20 degrees on the second"?', options: ['<code>side_effect=[TimeoutError(), 20]</code>', '<code>return_value=[TimeoutError(), 20]</code>', '<code>side_effect=TimeoutError</code> then change it manually', 'You cannot do this with Mock'], answer: 0, explain: 'When side_effect is an iterable, each call takes the next item: exception instances are raised, other values are returned. return_value would return the list itself.' },
      hints: [`<p>Hint 1: Patch <code>'app.fetch'</code> — the name the code under test looks up.</p>`, `<p>Hint 2: <code>return_value</code> for a normal reading; <code>side_effect</code> as a list for "fail then succeed"; <code>side_effect</code> as an exception for "always fail".</p>`, `<p>Hint 3: After each call assert both the result and the interaction: <code>m.call_count == 2</code>, <code>m.assert_called_with('Pune')</code>. Use <code>autospec=True</code> so a wrong signature is caught.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[[String.raw`def run_suite():
    r = unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestAlert))
    return r.testsRun, len(r.failures), len(r.errors)`,
           'import io',
           'run_suite()']],
         ['(3, 0, 0)']],
        [[[String.raw`def run_suite():
    r = unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestAlert))
    return r.testsRun, len(r.failures), len(r.errors)`,
           'import io',
           'orig = app.alert',
           'app.alert = lambda city: "ok"',
           'run_suite()',
           'app.alert = orig',
           'run_suite()']],
         ['(3, 3, 0)',
          '(3, 0, 0)']],
        [[[String.raw`def run_suite():
    r = unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestAlert))
    return r.testsRun, len(r.failures), len(r.errors)`,
           'import io',
           'orig = app.alert',
           String.raw`def noretry(city):
    try:
        t = app.fetch(city)
    except TimeoutError:
        return "unknown"
    return "HOT" if t > 35 else "ok"`,
           'app.alert = noretry',
           'run_suite()',
           'app.alert = orig']],
         ['(3, 2, 0)']],
        [[['weather.fetch("Pune")',
           'app.fetch is weather.fetch',
           'sorted(n for n in dir(TestAlert) if n.startswith("test_"))']],
         ['!RuntimeError',
          'True',
          '[\'test_gives_up\', \'test_hot\', \'test_retry_then_ok\']']],
        [[['from unittest import mock',
           'with mock.patch(\'app.fetch\', return_value=36): r1 = app.alert(\'x\')',
           'with mock.patch(\'app.fetch\', return_value=35): r2 = app.alert(\'x\')',
           'with mock.patch(\'app.fetch\', return_value=-5): r3 = app.alert(\'x\')',
           '(r1, r2, r3)']],
         ['(\'HOT\', \'ok\', \'ok\')']],
        [[['from unittest import mock',
           'with mock.patch(\'app.fetch\', side_effect=[TimeoutError(), TimeoutError()]) as m: r = app.alert(\'x\')',
           '(r, m.call_count)',
           'with mock.patch(\'app.fetch\', side_effect=[TimeoutError(), 40]) as m: r = app.alert(\'x\')',
           '(r, m.call_count)',
           'with mock.patch(\'app.fetch\', side_effect=ValueError(\'bug\')): r = app.alert(\'x\')']],
         ['(\'unknown\', 2)',
          '(\'HOT\', 2)',
          '!ValueError']],
      ] },
      solution: {
        approach: `<p>Patch the looked-up name with an autospecced mock, drive behaviour with <code>return_value</code>/<code>side_effect</code>, and assert both the returned value and the calls. Each test is independent because <code>patch</code> restores the original afterwards.</p>`,
        code: { lang: 'python', run: true, code: `import sys
import types
import unittest
from unittest import mock

# --- the code under test, built as real modules so 'app.fetch' is patchable ---
weather = types.ModuleType('weather')
exec("def fetch(city):\\n    raise RuntimeError('REAL NETWORK CALL - must not happen in tests')", weather.__dict__)
sys.modules['weather'] = weather
app = types.ModuleType('app')
exec('''
from weather import fetch

def alert(city):
    for attempt in range(2):           # one retry
        try:
            t = fetch(city)
        except TimeoutError:
            continue
        return 'HOT' if t > 35 else 'ok'
    return 'unknown'
''', app.__dict__)
sys.modules['app'] = app


class TestAlert(unittest.TestCase):
    @mock.patch('app.fetch', autospec=True, return_value=40)
    def test_hot(self, m):
        self.assertEqual(app.alert('Pune'), 'HOT')
        m.assert_called_once_with('Pune')

    @mock.patch('app.fetch', autospec=True, side_effect=[TimeoutError(), 20])
    def test_retry_then_ok(self, m):
        self.assertEqual(app.alert('Oslo'), 'ok')
        self.assertEqual(m.call_count, 2)

    @mock.patch('app.fetch', autospec=True, side_effect=TimeoutError('slow'))
    def test_gives_up(self, m):
        self.assertEqual(app.alert('Lima'), 'unknown')
        self.assertEqual(m.call_count, 2)


result = unittest.TextTestRunner(verbosity=0).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestAlert))
print('ran', result.testsRun, 'tests; success =', result.wasSuccessful())` },
        dry: { head: ['test', 'mock behaviour', 'calls', 'alert() returns'], rows: [['test_hot', 'return_value=40', '1', "'HOT'"], ['test_retry_then_ok', 'side_effect=[TimeoutError(), 20]', '2 (raise, then 20)', "'ok'"], ['test_gives_up', 'side_effect=TimeoutError', '2 (raise, raise)', "'unknown'"]] },
        complexity: `<p>Each test runs in microseconds with zero I/O. The real fetch raising RuntimeError acts as a tripwire: any wrong patch target would make the tests fail loudly.</p>`,
        followUps: ['Refactor alert to accept fetch as a parameter (dependency injection) and rewrite the tests without patch.', 'Add exponential backoff with time.sleep — how do you test it without waiting? (inject/patch sleep and assert its calls)', 'Write the same tests in pytest using monkeypatch.setattr(app, "fetch", fake).']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Predict the Output: finally, return and print order',
    level: 'Easy', tags: ['predict the output', 'finally'], companies: ['Amazon', 'TCS', 'Infosys'],
    statement: `<p>Without running it, write down exactly what this program prints, line by line. Then run it to check.</p><pre>def f(n):
    try:
        print('try', n)
        if n == 0:
            raise ValueError('zero')
        return 'ret-' + str(n)
    except ValueError:
        print('except')
        return 'handled'
    finally:
        print('finally', n)

print(f(1))
print(f(0))</pre>`,
    constraints: `No tools — trace it by hand first. Pay attention to WHEN the return value is printed relative to finally.`,
    example: `<p>The first call prints ${H.c('b', 'try 1')}, ${H.c('b', 'finally 1')}, then the caller prints ${H.c('g', 'ret-1')}. The value is computed in try, finally runs before the function actually leaves, and only then does <code>print(f(1))</code> get the value.</p>`,
    brute: { why: `<p>The common wrong mental model: "return leaves the function immediately, so finally does not print" or "finally prints after the caller's print". Here is code that matches that wrong model (no finally semantics) — compare its output with the real one.</p>`, code: `def f_wrong_model(n):
    print('try', n)
    if n == 0:
        print('except')
        return 'handled'          # the wrong model forgets finally entirely
    return 'ret-' + str(n)

print(f_wrong_model(1))
print(f_wrong_model(0))` },
    mcq: { q: 'What is the last line printed?', options: ['handled', 'finally 0', 'except', 'ret-0'], answer: 0, explain: 'For f(0): try 0 → except → (return "handled" scheduled) → finally 0 → the caller prints handled. So "handled" is last.' },
    hints: [`<p>Hint 1: A return inside try/except computes the value and parks it; the finally block runs before the function really exits.</p>`, `<p>Hint 2: <code>print(f(1))</code> can only print after <code>f(1)</code> has completely finished — including its finally.</p>`, `<p>Hint 3: Trace f(0): try 0 → raise → except prints "except" → return scheduled → finally 0 → caller prints the parked value.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         'cap(lambda: f(1))']],
       ['(\'try 1\\nfinally 1\\n\', \'ret-1\')']],
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         'cap(lambda: f(0))']],
       ['(\'try 0\\nexcept\\nfinally 0\\n\', \'handled\')']],
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         'cap(lambda: print(f(1)))',
         'cap(lambda: print(f(0)))']],
       ['(\'try 1\\nfinally 1\\nret-1\\n\', None)',
        '(\'try 0\\nexcept\\nfinally 0\\nhandled\\n\', None)']],
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         'cap(lambda: (print(f(1)), print(f(0))))']],
       ['(\'try 1\\nfinally 1\\nret-1\\ntry 0\\nexcept\\nfinally 0\\nhandled\\n\', (None, None))']],
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         'cap(lambda: print(f(1), f(0)))']],
       ['(\'try 1\\nfinally 1\\ntry 0\\nexcept\\nfinally 0\\nret-1 handled\\n\', None)']],
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         'cap(lambda: f(-3))',
         'cap(lambda: f("a"))',
         'cap(lambda: f(0.0))']],
       ['(\'try -3\\nfinally -3\\n\', \'ret--3\')',
        '(\'try a\\nfinally a\\n\', \'ret-a\')',
        '(\'try 0.0\\nexcept\\nfinally 0.0\\n\', \'handled\')']],
    ] },
    solution: {
      approach: `<p>Order inside a call: try body → (except body if raised) → finally → actual return → caller continues. Output: <code>try 1</code>, <code>finally 1</code>, <code>ret-1</code>, <code>try 0</code>, <code>except</code>, <code>finally 0</code>, <code>handled</code>.</p>`,
      code: { lang: 'python', run: true, code: `def f(n):
    try:
        print('try', n)
        if n == 0:
            raise ValueError('zero')
        return 'ret-' + str(n)     # value computed and parked here
    except ValueError:
        print('except')
        return 'handled'           # parked again (for n == 0)
    finally:
        print('finally', n)        # runs BEFORE the parked value is delivered

print(f(1))
print(f(0))
# try 1 / finally 1 / ret-1 / try 0 / except / finally 0 / handled` },
      dry: { head: ['step', 'printed', 'why'], rows: [['1', 'try 1', 'try body'], ['2', 'finally 1', 'return parked, finally first'], ['3', 'ret-1', 'caller print'], ['4', 'try 0 / except', 'ValueError handled'], ['5', 'finally 0', 'before return'], ['6', 'handled', 'caller print']] },
      complexity: `<p>O(1). The concept: finally always runs between "decide to leave" and "actually leave".</p>`,
      followUps: ['Add return in finally — what changes, and why do linters forbid it?', 'What if the except block itself raises a new error? Which message appears in the traceback?']
    }
  });

  practice.push({
    title: 'Parse key=value Config Lines, Skipping Bad Ones',
    level: 'Easy', tags: ['EAFP', 'ValueError', 'parsing'], companies: ['Cisco', 'Red Hat'],
    statement: `<p>Write <code>parse_config(lines)</code> that turns lines like <code>"port = 8080"</code> into a dict. Values that look like integers become <code>int</code>, others stay strings. Ignore blank lines and lines starting with <code>#</code>. Lines without exactly one <code>=</code> are bad: skip them and return their line numbers (1-based) in a second list.</p>`,
    constraints: `≤ 10<sup>4</sup> lines. Use exception handling for the int conversion and for the unpacking of the split result.`,
    example: `<p><code>["# app", "port = 8080", "host=localhost", "oops", "a=b=c", ""]</code> → ${H.c('g', "({'port': 8080, 'host': 'localhost'}, [4, 5])")}. Line 4 has no '=', line 5 has two — both make <code>key, value = line.split('=')</code> raise ${H.c('r', 'ValueError')} (wrong number of values to unpack).</p>`,
    brute: { why: `<p>LBYL with counting and digit checks: <code>line.count('=') == 1</code> and <code>v.isdigit()</code>. It works for simple cases but <code>isdigit</code> rejects <code>-1</code> and accepts <code>²</code>, and the counting duplicates the logic that unpacking already performs.</p>`, code: `def parse_config_lbyl(lines):
    out, bad = {}, []
    for no, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if line.count('=') != 1:
            bad.append(no)
            continue
        k, v = line.split('=')
        v = v.strip()
        out[k.strip()] = int(v) if v.isdigit() else v   # misses '-1'
    return out, bad` },
    mcq: { q: 'What does <code>k, v = "a=b=c".split("=")</code> raise?', options: ['ValueError: too many values to unpack', 'KeyError', 'TypeError', 'Nothing, v is "b=c"'], answer: 0, explain: 'split gives 3 items, unpacking into 2 names raises ValueError. (split("=", 1) would give 2 items, but here we want to reject such lines.)' },
    hints: [`<p>Hint 1: Tuple unpacking raises ValueError on the wrong count — use it as the validity check for "exactly one =".</p>`, `<p>Hint 2: Nested EAFP for the value: <code>try: value = int(v) except ValueError: value = v</code>.</p>`, `<p>Hint 3: Use <code>enumerate(lines, 1)</code> for 1-based numbers; strip whitespace around keys and values; skip blanks and comments before anything else.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['parse_config([\'# app\', \'port = 8080\', \'host=localhost\', \'oops\', \'a=b=c\', \'\'])']],
       ['({\'port\': 8080, \'host\': \'localhost\'}, [4, 5])']],
      [[['parse_config([])',
         'parse_config([\'\', \'   \', \'# only comment\', \'  # indented\'])']],
       ['({}, [])',
        '({}, [])']],
      [[['parse_config([\'retries=-1\', \'x = 007\', \'y=+5\', \'z=1_000\', \'w=3.5\', \'v=0x10\'])']],
       ['({\'retries\': -1, \'x\': 7, \'y\': 5, \'z\': 1000, \'w\': \'3.5\', \'v\': \'0x10\'}, [])']],
      [[['parse_config([\'  name  =  Ada Lovelace  \', \'url=http://a/b#c\', \'key=\'])']],
       ['({\'name\': \'Ada Lovelace\', \'url\': \'http://a/b#c\', \'key\': \'\'}, [])']],
      [[['parse_config([\'a=1\', \'a=2\'])',
         'parse_config([\'# c\', \'\', \'bad\', \'ok=1\', \'also bad\'])']],
       ['({\'a\': 2}, [])',
        '({\'ok\': 1}, [3, 5])']],
      [[['r = parse_config(["k%d=%d" % (i, i) for i in range(10000)] + ["bad"])',
         'len(r[0])',
         'r[1]',
         'r[0]["k9999"]']],
       ['10000',
        '[10001]',
        '9999']],
    ] },
    solution: {
      approach: `<p>For each meaningful line, let unpacking validate the shape, then let <code>int()</code> decide whether the value is numeric. Both failures are ValueError, but they mean different things, so they are handled in separate small try blocks.</p>`,
      code: { lang: 'python', run: true, code: `def parse_config(lines):
    out, bad = {}, []
    for no, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        try:
            key, value = line.split('=')       # exactly one '=' or ValueError
        except ValueError:
            bad.append(no)
            continue
        value = value.strip()
        try:
            value = int(value)                 # '8080' -> 8080, '-1' -> -1
        except ValueError:
            pass                               # keep as string
        out[key.strip()] = value
    return out, bad


print(parse_config(['# app', 'port = 8080', 'host=localhost', 'oops', 'a=b=c', '', 'retries=-1']))` },
      complexity: `<p>O(total characters). Exceptions only fire on bad or non-numeric lines.</p>`,
      followUps: ['Support quoted values containing "=" (e.g. url = "a=b").', 'Raise a ConfigError with all bad line numbers if more than 3 lines are bad.', 'Parse booleans true/false too — in which order should the conversions be tried?']
    }
  });

  practice.push({
    title: 'ValidationError With a Field Name',
    level: 'Easy', tags: ['custom exceptions', 'raise'], companies: ['Stripe', 'Zalando'],
    statement: `<p>Create <code>ValidationError(ValueError)</code> that stores <code>field</code> and <code>reason</code> attributes and has the message <code>"&lt;field&gt;: &lt;reason&gt;"</code>. Then write <code>validate_user(d)</code> that raises it for: missing or empty <code>name</code>, <code>age</code> not an int (bools are not ints here), or age outside 0–150. Return the dict unchanged when valid.</p>`,
    constraints: `Check fields in the order name, age. Raise on the first problem.`,
    example: `<p><code>validate_user({'name': 'Asha', 'age': 200})</code> → ${H.c('r', 'ValidationError: age: must be between 0 and 150')}; <code>e.field == 'age'</code>; and because it subclasses ValueError, generic <code>except ValueError</code> code still catches it.</p>`,
    brute: { why: `<p>Raising a bare <code>ValueError('bad age')</code> works, but callers that want to highlight the wrong form field must parse the message string — fragile. Structured attributes are the fix.</p>`, code: `def validate_user_plain(d):
    if not d.get('name'):
        raise ValueError('bad name')   # which field? parse the string...
    if not isinstance(d.get('age'), int):
        raise ValueError('bad age')
    return d` },
    mcq: { q: 'Why inherit from ValueError rather than directly from Exception?', options: ['Existing code catching ValueError keeps working, and it describes the error kind', 'Exception cannot have attributes', 'ValueError is faster', 'It is required for custom exceptions'], answer: 0, explain: 'A validation failure is a "right type, wrong value" kind of error. Subclassing ValueError lets both specific (except ValidationError) and generic (except ValueError) handlers catch it.' },
    hints: [`<p>Hint 1: In <code>__init__(self, field, reason)</code> store both attributes, then call <code>super().__init__(f'{field}: {reason}')</code>.</p>`, `<p>Hint 2: <code>isinstance(True, int)</code> is True — check <code>isinstance(age, bool)</code> first or use <code>type(age) is int</code>.</p>`, `<p>Hint 3: Use <code>d.get('name')</code> so a missing key is just "falsy" and gets the same error as an empty string.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['u = {"name": "Asha", "age": 30}',
         'validate_user(u) is u',
         'validate_user({"name": "A", "age": 1, "x": 2}) == {"name": "A", "age": 1, "x": 2}']],
       ['True',
        'True']],
      [[[String.raw`def err(d):
    try:
        validate_user(d)
    except ValidationError as e:
        return (e.field, e.reason, str(e))`,
         'err({\'name\': \'\', \'age\': 3})',
         'err({})',
         'err({\'name\': \'Ben\', \'age\': True})',
         'err({\'name\': \'Cy\', \'age\': 200})',
         'err({\'name\': \'Cy\', \'age\': -1})']],
       ['(\'name\', \'is required\', \'name: is required\')',
        '(\'name\', \'is required\', \'name: is required\')',
        '(\'age\', \'must be an integer\', \'age: must be an integer\')',
        '(\'age\', \'must be between 0 and 150\', \'age: must be between 0 and 150\')',
        '(\'age\', \'must be between 0 and 150\', \'age: must be between 0 and 150\')']],
      [[[String.raw`def err(d):
    try:
        validate_user(d)
    except ValidationError as e:
        return e.field`,
         'err({\'name\': \'Z\', \'age\': 151})',
         'err({\'name\': \'Z\', \'age\': 30.5})',
         'err({\'name\': \'Z\', \'age\': \'30\'})',
         'err({\'name\': \'Z\'})',
         'err({\'name\': \'\', \'age\': \'x\'})',
         'err({\'age\': \'x\'})',
         'err({"name": 0, "age": 1})',
         'validate_user({"name": "Z", "age": 150}) == {"name": "Z", "age": 150}',
         'validate_user({"name": "Z", "age": 0}) == {"name": "Z", "age": 0}']],
       ['\'age\'',
        '\'age\'',
        '\'age\'',
        '\'age\'',
        '\'name\'',
        '\'name\'',
        '\'name\'',
        'True',
        'True']],
      [[['issubclass(ValidationError, ValueError)',
         String.raw`try:
    validate_user({"name": "A", "age": 999})
except ValueError as e:
    f = (e.field, type(e).__name__)`,
         'f']],
       ['True',
        '(\'age\', \'ValidationError\')']],
      [[['len(validate_user({"name": "x" * 100000, "age": 1})["name"])',
         'e = ValidationError("f", "r")',
         '(e.field, e.reason, str(e))',
         'e.args']],
       ['100000',
        '(\'f\', \'r\', \'f: r\')',
        '(\'f: r\',)']],
      [[['validate_user({"name": "A", "age": 0})["age"]',
         'validate_user({"name": " ", "age": 5})["name"]',
         'validate_user({"name": "A", "age": 150})["age"]']],
       ['0',
        '\' \'',
        '150']],
    ] },
    solution: {
      approach: `<p>A small exception class with structured data plus a readable message, and a validator that raises it with the field name at the first failed rule.</p>`,
      code: { lang: 'python', run: true, code: `class ValidationError(ValueError):
    def __init__(self, field, reason):
        self.field = field
        self.reason = reason
        super().__init__(f'{field}: {reason}')


def validate_user(d):
    if not d.get('name'):
        raise ValidationError('name', 'is required')
    age = d.get('age')
    if isinstance(age, bool) or not isinstance(age, int):
        raise ValidationError('age', 'must be an integer')
    if not 0 <= age <= 150:
        raise ValidationError('age', 'must be between 0 and 150')
    return d


for user in ({'name': 'Asha', 'age': 30}, {'name': '', 'age': 3}, {'name': 'Ben', 'age': True}, {'name': 'Cy', 'age': 200}):
    try:
        print('ok', validate_user(user))
    except ValueError as e:                       # catches ValidationError too
        print(type(e).__name__, '| field =', e.field, '| message =', e)` },
      complexity: `<p>O(1) per user: a fixed number of checks, no loops.</p>`,
      followUps: ['Collect ALL problems instead of the first, and raise one ExceptionGroup of ValidationErrors.', 'Make the error JSON-serialisable for an API response: {"field": ..., "reason": ...}.']
    }
  });

  practice.push({
    title: 'Type the average() Function Correctly',
    level: 'Easy', tags: ['type hints', 'Optional', 'Iterable'], companies: ['Microsoft', 'JetBrains'],
    statement: `<p>Write <code>average(values)</code> with full type hints. It must accept <b>any iterable</b> of ints or floats (list, tuple, generator) and return <code>None</code> for an empty input. Make the hints honest: what is the parameter type and the return type? Then show a caller that handles the None case so mypy would accept it.</p>`,
    constraints: `Single pass (generators can only be read once). No Any.`,
    example: `<p><code>average([1, 2, 3, 4])</code> → ${H.c('g', '2.5')}; <code>average(x for x in [])</code> → ${H.c('y', 'None')}; signature ${H.c('b', 'def average(values: Iterable[float]) -&gt; float | None')} (ints are accepted where float is expected).</p>`,
    brute: { why: `<p><code>def average(values: list) -&gt; float</code> lies twice: it rejects tuples/generators for no reason (to mypy) and claims it always returns a float while <code>sum(values) / len(values)</code> crashes on empty input (ZeroDivisionError) and <code>len()</code> fails on generators.</p>`, code: `def average_bad(values: list) -> float:
    return sum(values) / len(values)    # ZeroDivisionError on [], TypeError on generators` },
    mcq: { q: 'Why <code>Iterable[float]</code> and not <code>list[float]</code>?', options: ['It accepts lists, tuples, sets and generators — anything we can loop over once', 'Iterable is faster at runtime', 'list[float] is not valid syntax', 'mypy requires Iterable for numbers'], answer: 0, explain: 'We only need to iterate once, so we should ask for the weakest capability. Also Iterable is covariant, so Iterable[int] values are accepted too.' },
    hints: [`<p>Hint 1: Accept <code>Iterable[float]</code> from <code>collections.abc</code>; mypy lets ints pass where floats are expected.</p>`, `<p>Hint 2: Count and sum in one loop, because a generator has no <code>len()</code> and cannot be read twice.</p>`, `<p>Hint 3: Return <code>float | None</code>; callers then must write <code>if (avg := average(xs)) is None: ...</code> before using it as a number.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['average([1, 2, 3, 4])',
         'average((2.5, 3.5))',
         'average(x for x in []) is None',
         'average([]) is None']],
       ['2.5',
        '3.0',
        'True',
        'True']],
      [[['report([10, 20])',
         'report([])',
         'report([1, 2])',
         'report([1 / 3])']],
       ['\'average = 15.00\'',
        '\'no data\'',
        '\'average = 1.50\'',
        '\'average = 0.33\'']],
      [[['average(x for x in range(1, 101))',
         'average(iter([2, 4]))',
         'g = (x for x in [1, 2, 3])',
         'average(g)',
         'average(g) is None']],
       ['50.5',
        '3.0',
        '2.0',
        'True']],
      [[['average([0])',
         'average([-1, 1])',
         'average([-5, -7])',
         'average([1, 2.5])']],
       ['0.0',
        '0.0',
        '-6.0',
        '1.75']],
      [[['average(range(10**6))',
         'average([0.5] * 1000)',
         'type(average([1, 2])).__name__',
         'report(range(3))']],
       ['499999.5',
        '0.5',
        '\'float\'',
        '\'average = 1.00\'']],
      [[['hints = average.__annotations__',
         'hints["return"] == (float | None)',
         'hints["values"] == Iterable[float]',
         'sorted(hints)']],
       ['True',
        'True',
        '[\'return\', \'values\']']],
    ] },
    solution: {
      approach: `<p>Weakest parameter type (Iterable), honest return type (float | None), single pass with a running total and count.</p>`,
      code: { lang: 'python', run: true, code: `from collections.abc import Iterable


def average(values: Iterable[float]) -> float | None:
    total = 0.0
    count = 0
    for v in values:          # single pass: works for generators
        total += v
        count += 1
    if count == 0:
        return None
    return total / count


def report(values: Iterable[float]) -> str:
    avg = average(values)
    if avg is None:                       # mypy forces this branch
        return 'no data'
    return f'average = {avg:.2f}'         # avg narrowed to float


print(average([1, 2, 3, 4]), average((2.5, 3.5)), average(x for x in []))
print(report([10, 20]), '|', report([]))` },
      complexity: `<p>O(N) time, O(1) memory.</p>`,
      followUps: ['Return statistics.fmean-like precision for huge inputs (use math.fsum).', 'Make it generic so Decimal inputs return Decimal — what TypeVar bound would you use?']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'retry Decorator for Specific Exceptions',
    level: 'Medium', tags: ['decorators', 'exceptions', 'testing'], companies: ['Netflix', 'AWS', 'Razorpay'],
    statement: `<p>Write a decorator factory <code>retry(times, exceptions, sleep=time.sleep, base_delay=0.1)</code>. The decorated function is called up to <code>times</code> attempts; if it raises one of <code>exceptions</code>, wait <code>base_delay * 2**attempt</code> (exponential backoff) and try again. Other exceptions propagate immediately. After the last failed attempt, re-raise the last exception. <code>sleep</code> is injectable so tests do not actually wait.</p>`,
    constraints: `times ≥ 1. Preserve the wrapped function's name/docstring (functools.wraps). Do not catch BaseException.`,
    example: `<p>A function failing with ConnectionError twice, then returning "ok", decorated with <code>@retry(3, (ConnectionError,), sleep=fake)</code> → returns ${H.c('g', '"ok"')} and the fake sleep was called with ${H.c('b', '[0.1, 0.2]')}. A ValueError on the first call propagates at once with no sleeps.</p>`,
    brute: { why: `<p>A copy-pasted loop at every call site with <code>except Exception: time.sleep(1)</code> retries bugs (TypeError) as well as transient errors, hides the final error, and makes tests take seconds of real sleeping.</p>`, code: `import time

def call_with_retry(fn):
    for _ in range(3):
        try:
            return fn()
        except Exception:        # retries bugs too
            time.sleep(1)        # real waiting in tests
    return None                  # final error swallowed` },
    mcq: { q: 'After the final failed attempt, what should happen?', options: ['Re-raise the last exception (bare raise inside the except, or raise saved_exc)', 'Return None', 'Raise a generic Exception("failed")', 'Retry forever'], answer: 0, explain: 'The caller needs the real error (type and traceback) to decide what to do. Returning None hides failure; a generic Exception loses information.' },
    hints: [`<p>Hint 1: Three layers: <code>retry(...)</code> returns <code>decorator(fn)</code>, which returns <code>wrapper(*args, **kwargs)</code> decorated with <code>@functools.wraps(fn)</code>.</p>`, `<p>Hint 2: Loop <code>for attempt in range(times)</code>; in <code>except exceptions:</code> if it is the last attempt, <code>raise</code>; otherwise <code>sleep(base_delay * 2 ** attempt)</code>.</p>`, `<p>Hint 3: Test with a fake sleep that appends to a list, and a function that uses a counter or an iterator of outcomes. Check the delays and the number of calls.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['delays = []',
         'outcomes = iter([ConnectionError("down"), ConnectionError("down"), "ok"])',
         String.raw`@retry(3, (ConnectionError,), sleep=delays.append)
def fetch():
    """Fetch something flaky."""
    r = next(outcomes)
    if isinstance(r, Exception):
        raise r
    return r`,
         'fetch()',
         'delays',
         'fetch.__name__',
         'fetch.__doc__']],
       ['\'ok\'',
        '[0.1, 0.2]',
        '\'fetch\'',
        '\'Fetch something flaky.\'']],
      [[['delays = []',
         'calls = []',
         String.raw`@retry(3, (ConnectionError,), sleep=delays.append)
def broken():
    calls.append(1)
    raise ValueError("bug, not transient")`,
         'broken()',
         'len(calls)',
         'delays']],
       ['!ValueError',
        '1',
        '[]']],
      [[['delays = []',
         'calls = []',
         String.raw`@retry(3, (ConnectionError,), sleep=delays.append)
def always():
    calls.append(1)
    raise ConnectionError("n%d" % len(calls))`,
         String.raw`def last(f):
    try:
        f()
    except Exception as e:
        return str(e)`,
         'last(always)',
         'len(calls)',
         'delays']],
       ['\'n3\'',
        '3',
        '[0.1, 0.2]']],
      [[['delays = []',
         'calls = []',
         String.raw`@retry(1, (ConnectionError,), sleep=delays.append)
def once():
    calls.append(1)
    raise ConnectionError("x")`,
         'once()',
         'len(calls)',
         'delays',
         'retry(0, (ValueError,))',
         'retry(-2, (ValueError,))']],
       ['!ConnectionError',
        '1',
        '[]',
        '!ValueError',
        '!ValueError']],
      [[['delays = []',
         'calls = []',
         String.raw`@retry(5, (OSError,), sleep=delays.append, base_delay=1)
def slow():
    calls.append(1)
    raise ConnectionError("x")`,
         'slow()',
         'len(calls)',
         'delays']],
       ['!ConnectionError',
        '5',
        '[1, 2, 4, 8]']],
      [[['delays = []',
         'state = {"n": 0}',
         String.raw`@retry(3, (KeyError, TimeoutError), sleep=delays.append)
def add(a, b=0):
    state["n"] += 1
    if state["n"] == 1:
        raise TimeoutError()
    return a + b`,
         'add(1, b=2)',
         'state["n"]',
         'delays',
         'add(5)',
         'delays']],
       ['3',
        '2',
        '[0.1]',
        '5',
        '[0.1]']],
      [[['delays = []',
         'calls = []',
         String.raw`@retry(3, (Exception,), sleep=delays.append)
def stop():
    calls.append(1)
    raise KeyboardInterrupt()`,
         String.raw`def raises(f):
    try:
        f()
    except BaseException as e:
        return type(e).__name__`,
         'raises(stop)',
         'len(calls)',
         'delays']],
       ['\'KeyboardInterrupt\'',
        '1',
        '[]']],
    ] },
    solution: {
      approach: `<p>Catch only the configured exception tuple, back off exponentially with an injected sleep, and re-raise the final failure untouched. Non-retryable exceptions are never caught, so they propagate on the first attempt.</p>`,
      code: { lang: 'python', run: true, code: `import functools
import time


def retry(times, exceptions, sleep=time.sleep, base_delay=0.1):
    if times < 1:
        raise ValueError('times must be >= 1')

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return fn(*args, **kwargs)
                except exceptions:
                    if attempt == times - 1:
                        raise                          # last attempt: original error
                    sleep(base_delay * 2 ** attempt)   # 0.1, 0.2, 0.4, ...
        return wrapper
    return decorator


# --- tests with a fake clock ---
delays = []
outcomes = iter([ConnectionError('down'), ConnectionError('down'), 'ok'])


@retry(3, (ConnectionError,), sleep=delays.append)
def fetch():
    """Fetch something flaky."""
    result = next(outcomes)
    if isinstance(result, Exception):
        raise result
    return result


print(fetch(), delays, fetch.__name__, fetch.__doc__)

calls = []


@retry(3, (ConnectionError,), sleep=delays.append)
def broken():
    calls.append(1)
    raise ValueError('bug, not transient')


try:
    broken()
except ValueError as e:
    print('propagated immediately:', e, '| calls =', len(calls))` },
      complexity: `<p>At most <code>times</code> calls; total wait base·(2<sup>times−1</sup> − 1). O(1) extra memory.</p>`,
      followUps: ['Add jitter (random 0–100% of the delay) to avoid thundering herds — how do you keep tests deterministic?', 'Support async functions (asyncio.sleep) with the same decorator.', 'Add a max_delay cap and a per-call deadline.']
    }
  });

  practice.push({
    title: 'Build Your Own pytest.raises',
    level: 'Medium', tags: ['context managers', 'testing', 'exceptions'], companies: ['Google', 'Bloomberg'],
    statement: `<p>Implement a context manager <code>expect_raises(exc_type, match=None)</code> usable as <code>with expect_raises(ValueError, match="positive") as info:</code>. It must: pass silently and expose the caught exception as <code>info.value</code> if the block raises <code>exc_type</code> (or a subclass) whose message matches the regex <code>match</code>; raise <code>AssertionError</code> if nothing was raised or the message does not match; let any <b>other</b> exception type propagate unchanged.</p>`,
    constraints: `Use a class with __enter__/__exit__ (no contextlib). Use re.search for matching.`,
    example: `<p><code>with expect_raises(ZeroDivisionError) as info: 1 / 0</code> → passes, <code>info.value</code> is the ZeroDivisionError. <code>with expect_raises(KeyError): pass</code> → ${H.c('r', 'AssertionError: DID NOT RAISE KeyError')}. A TypeError inside <code>expect_raises(ValueError)</code> → the ${H.c('r', 'TypeError')} propagates.</p>`,
    brute: { why: `<p>The manual pattern repeated in every test — try / call / <code>assert False</code> / except — is easy to get wrong: the <code>assert False</code> inside try gets caught by a broad except, or a forgotten <code>assert False</code> makes the test pass when nothing is raised.</p>`, code: `def test_manual():
    try:
        int('x')
        assert False, 'should have raised'   # caught below if except is too broad!
    except Exception:
        pass` },
    mcq: { q: 'What must <code>__exit__</code> return to swallow the expected exception?', options: ['A truthy value (True)', 'None', 'The exception object', 'It must re-raise it'], answer: 0, explain: 'If __exit__ returns a truthy value, Python suppresses the exception. Returning None/False lets it propagate — which is what we want for unexpected types.' },
    hints: [`<p>Hint 1: <code>__exit__(self, exc_type, exc, tb)</code> receives <code>None</code>s when the block finished without error → raise AssertionError there.</p>`, `<p>Hint 2: If <code>not issubclass(exc_type, self.expected)</code> → <code>return False</code> so it propagates unchanged.</p>`, `<p>Hint 3: If <code>match</code> is set and <code>re.search(match, str(exc))</code> fails → raise AssertionError with both the pattern and the actual message; otherwise store <code>self.value = exc</code> and <code>return True</code>.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[[String.raw`with expect_raises(ZeroDivisionError) as info:
    1 / 0`,
         'type(info.value).__name__',
         'isinstance(info.value, ZeroDivisionError)']],
       ['\'ZeroDivisionError\'',
        'True']],
      [[[String.raw`def blk_none():
    with expect_raises(KeyError):
        pass`,
         String.raw`def msg(f):
    try:
        f()
    except AssertionError as e:
        return str(e)`,
         'msg(blk_none)',
         'blk_none()']],
       ['\'DID NOT RAISE KeyError\'',
        '!AssertionError']],
      [[[String.raw`with expect_raises(ValueError):
    "a" + 1`]],
       ['!TypeError']],
      [[[String.raw`with expect_raises(ValueError, match="positive") as i:
    raise ValueError("must be positive")`,
         'str(i.value)',
         String.raw`def msg(f):
    try:
        f()
    except AssertionError as e:
        return str(e)`,
         String.raw`def wrong():
    with expect_raises(ValueError, match="positive"):
        raise ValueError("oops")`,
         'msg(wrong)']],
       ['\'must be positive\'',
        '"pattern \'positive\' not found in \'oops\'"']],
      [[[String.raw`with expect_raises(LookupError) as i:
    {}["k"]`,
         'type(i.value).__name__',
         String.raw`with expect_raises(KeyError):
    [][0]`]],
       ['\'KeyError\'',
        '!IndexError']],
      [[[String.raw`with expect_raises(ValueError, match=r"^\d+$"):
    raise ValueError("123")`,
         String.raw`with expect_raises(ValueError, match=r"^\d+$"):
    raise ValueError("a123")`,
         String.raw`with expect_raises(ValueError, match="base 10"):
    int("abc")`,
         String.raw`with expect_raises(ValueError, match=""):
    raise ValueError()`,
         String.raw`with expect_raises(ValueError, match="x"):
    raise ValueError()`]],
       ['!AssertionError',
        '!AssertionError']],
      [[['ran = []',
         String.raw`with expect_raises(ValueError):
    ran.append(1)
    raise ValueError()
    ran.append(2)`,
         'ran',
         'e = expect_raises(ValueError)',
         'e.value is None',
         String.raw`with expect_raises(Exception) as j:
    raise OSError("disk")`,
         'str(j.value)']],
       ['[1]',
        'True',
        '\'disk\'']],
    ] },
    solution: {
      approach: `<p>The context-manager protocol gives us exactly the hooks pytest uses: __exit__ sees the exception (or its absence), decides whether it is the expected one, and returns True to suppress it.</p>`,
      code: { lang: 'python', run: true, code: `import re


class expect_raises:
    def __init__(self, expected, match=None):
        self.expected = expected
        self.match = match
        self.value = None

    def __enter__(self):
        return self                              # 'as info' gets this object

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            raise AssertionError(f'DID NOT RAISE {self.expected.__name__}')
        if not issubclass(exc_type, self.expected):
            return False                         # unexpected type: propagate
        if self.match is not None and not re.search(self.match, str(exc)):
            raise AssertionError(f'pattern {self.match!r} not found in {str(exc)!r}')
        self.value = exc
        return True                              # swallow the expected exception


with expect_raises(ZeroDivisionError) as info:
    1 / 0
print('caught:', repr(info.value))

with expect_raises(ValueError, match=r'base 10') as info:
    int('abc')
print('matched:', info.value)

for label, block in [('nothing raised', lambda: None), ('wrong message', lambda: int('x'))]:
    try:
        with expect_raises(ValueError, match='positive'):
            block()
    except AssertionError as e:
        print(label, '->', e)

try:
    with expect_raises(ValueError):
        'a' + 1
except TypeError as e:
    print('other type propagated:', type(e).__name__)` },
      complexity: `<p>O(1) plus the regex search on the message.</p>`,
      followUps: ['Support a tuple of expected types.', 'Also work as a decorator (hint: contextlib.ContextDecorator).', 'Add a warns() equivalent using warnings.catch_warnings(record=True).']
    }
  });

  practice.push({
    title: 'Predict the Output: An Error Inside the Handler',
    level: 'Medium', tags: ['predict the output', 'chaining', 'finally'], companies: ['Meta', 'Goldman Sachs'],
    statement: `<p>Predict the full output, including which exception finally escapes and what its <code>__context__</code> is.</p><pre>def risky():
    try:
        return {}['k']
    except KeyError:
        print('handling KeyError')
        return 1 / 0
    finally:
        print('cleanup')

try:
    risky()
except Exception as e:
    print(type(e).__name__, '| context:', type(e.__context__).__name__)</pre>`,
    constraints: `Trace by hand first. Note: no "from" is used.`,
    example: `<p>Output: ${H.c('b', 'handling KeyError')}, ${H.c('b', 'cleanup')}, ${H.c('r', 'ZeroDivisionError | context: KeyError')}. The handler itself crashed; Python automatically attached the KeyError being handled as <code>__context__</code>, and finally still ran before the error left the function.</p>`,
    brute: { why: `<p>Wrong model #1: "the except block protects everything inside it" — no, an error raised <i>inside</i> an except block is a brand-new exception. Wrong model #2: "finally does not run if the handler crashes" — it always runs. This code encodes the wrong model #1:</p>`, code: `def risky_wrong_model():
    print('handling KeyError')
    return 'handled safely'     # imagines the except block cannot fail

print(risky_wrong_model())` },
    mcq: { q: 'What would the traceback text say between the two exceptions?', options: ['During handling of the above exception, another exception occurred', 'The above exception was the direct cause of the following exception', 'Nothing; only ZeroDivisionError is shown', 'KeyError: k only'], answer: 0, explain: 'Implicit chaining (no "from") sets __context__ and prints "During handling of the above exception…". "direct cause" is printed only for raise … from.' },
    hints: [`<p>Hint 1: The except clause catches the KeyError; then <code>1 / 0</code> raises ZeroDivisionError inside the handler.</p>`, `<p>Hint 2: Any exception raised while another is being handled gets <code>__context__</code> set automatically.</p>`, `<p>Hint 3: finally runs on the way out, printing "cleanup", before the ZeroDivisionError reaches the outer except.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         String.raw`def probe(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        try:
            fn()
            e = None
        except Exception as ex:
            e = ex
    return buf.getvalue(), type(e).__name__, type(e.__context__).__name__, e.__cause__, e.__suppress_context__`,
         'probe(risky)']],
       ['(\'handling KeyError\\ncleanup\\n\', \'ZeroDivisionError\', \'KeyError\', None, False)']],
      [[[String.raw`try:
    risky()
except Exception as e:
    ctx = e.__context__`,
         'ctx.args',
         'ctx.__context__ is None',
         'type(ctx)']],
       ['(\'k\',)',
        'True',
        '<class \'KeyError\'>']],
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         String.raw`def probe(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        try:
            fn()
        except Exception as ex:
            return buf.getvalue().count("cleanup"), buf.getvalue().count("handling KeyError")`,
         'probe(risky)',
         'probe(risky)']],
       ['(1, 1)',
        '(1, 1)']],
      [[[String.raw`try:
    risky()
except Exception as e:
    err = e`,
         'isinstance(err, ArithmeticError)',
         'isinstance(err, KeyError)',
         'err.__traceback__ is not None',
         'err.args']],
       ['True',
        'False',
        'True',
        '(\'division by zero\',)']],
      [[[String.raw`def with_from():
    try:
        {}["k"]
    except KeyError as k:
        raise ZeroDivisionError from k`,
         String.raw`try:
    with_from()
except Exception as e:
    chain = (type(e.__cause__).__name__, type(e.__context__).__name__, e.__suppress_context__)`,
         'chain']],
       ['(\'KeyError\', \'KeyError\', True)']],
      [[[String.raw`def with_none():
    try:
        {}["k"]
    except KeyError:
        raise ZeroDivisionError from None`,
         String.raw`try:
    with_none()
except Exception as e:
    chain = (e.__cause__, type(e.__context__).__name__, e.__suppress_context__)`,
         'chain']],
       ['(None, \'KeyError\', True)']],
      [[[String.raw`def finally_wins():
    try:
        return {}["k"]
    except KeyError:
        return 1 / 0
    finally:
        return "finally"`,
         'finally_wins()']],
       ['\'finally\'']],
    ] },
    solution: {
      approach: `<p>Sequence: KeyError raised → caught → "handling KeyError" printed → ZeroDivisionError raised in the handler (context = KeyError) → finally prints "cleanup" → outer except prints the type and context.</p>`,
      code: { lang: 'python', run: true, code: `def risky():
    try:
        return {}['k']
    except KeyError:
        print('handling KeyError')
        return 1 / 0               # new exception INSIDE the handler
    finally:
        print('cleanup')           # still runs


try:
    risky()
except Exception as e:
    print(type(e).__name__, '| context:', type(e.__context__).__name__)
    print('cause:', e.__cause__, '| suppressed:', e.__suppress_context__)` },
      complexity: `<p>O(1). The lesson: handlers can fail too; chaining keeps both errors visible.</p>`,
      followUps: ['Change the handler to raise RuntimeError("bad config") from None — what prints now?', 'What if finally contained return 0?']
    }
  });

  practice.push({
    title: 'Validate a Batch and Report Every Error (ExceptionGroup)',
    level: 'Medium', tags: ['ExceptionGroup', 'except*', 'validation'], companies: ['Shopify', 'Intuit'],
    statement: `<p>Write <code>import_orders(rows)</code>. Each row is a dict with <code>id</code>, <code>qty</code> and <code>price</code>. Convert valid rows into tuples <code>(id, qty, price)</code>. For invalid rows collect errors: <code>KeyError</code> for missing fields, <code>ValueError</code> for non-numeric or non-positive qty/price. Each collected error must get a note (<code>add_note</code>) saying which row index failed. If any row failed, raise <code>ExceptionGroup("n bad rows", errors)</code>; otherwise return the list. Then write a caller that handles KeyErrors and ValueErrors separately with <code>except*</code>.</p>`,
    constraints: `Python 3.11+. Do not stop at the first bad row.`,
    example: `<p>Rows <code>[{'id': 1, 'qty': '2', 'price': '9.5'}, {'id': 2, 'qty': 'x', 'price': '1'}, {'id': 3, 'price': '4'}]</code> → ExceptionGroup with ${H.c('r', "ValueError (row 1)")} and ${H.c('r', "KeyError 'qty' (row 2)")}. The caller prints one line per group.</p>`,
    brute: { why: `<p>Stopping at the first error forces the user into a fix-one-rerun loop for a 10,000-row file. Returning a list of error strings loses exception types, so callers cannot react differently to missing columns vs bad values.</p>`, code: `def import_orders_first_error(rows):
    out = []
    for r in rows:
        out.append((r['id'], int(r['qty']), float(r['price'])))   # dies on first bad row
    return out` },
    mcq: { q: 'Will a plain <code>except ValueError:</code> catch the ExceptionGroup?', options: ['No — the group is an ExceptionGroup, not a ValueError; use except* ValueError', 'Yes, it looks inside', 'Only if there is exactly one ValueError inside', 'Only in Python 3.13+'], answer: 0, explain: 'ExceptionGroup is not a subclass of ValueError. except* splits the group and matches the members; plain except only matches the group object itself.' },
    hints: [`<p>Hint 1: Wrap each row's conversion in try/except (KeyError, ValueError) as e → <code>e.add_note(f'row {i}')</code> → errors.append(e).</p>`, `<p>Hint 2: Raise ValueError yourself when qty ≤ 0 or price ≤ 0, with a clear message.</p>`, `<p>Hint 3: After the loop: <code>if errors: raise ExceptionGroup(f'{len(errors)} bad rows', errors)</code>. Caller: <code>except* KeyError as g:</code> and <code>except* ValueError as g:</code>, iterating <code>g.exceptions</code> and their <code>__notes__</code>.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[[String.raw`def eg(rows):
    try:
        return import_orders(rows)
    except ExceptionGroup as g:
        return g.message, [(type(e).__name__, str(e), e.__notes__) for e in g.exceptions]`,
         'eg([{\'id\': 1, \'qty\': \'2\', \'price\': \'9.5\'}, {\'id\': 2, \'qty\': \'x\', \'price\': \'1\'}, {\'id\': 3, \'price\': \'4\'}])']],
       ['(\'2 bad rows\', [(\'ValueError\', "invalid literal for int() with base 10: \'x\'", [\'row 1 (id=2)\']), (\'KeyError\', "\'qty\'", [\'row 2 (id=3)\'])])']],
      [[['import_orders([{\'id\': 1, \'qty\': \'2\', \'price\': \'9.5\'}])',
         'import_orders([])',
         'import_orders([{\'id\': 7, \'qty\': 3, \'price\': 2}, {\'id\': 8, \'qty\': \' 4 \', \'price\': \' 0.5 \'}])']],
       ['[(1, 2, 9.5)]',
        '[]',
        '[(7, 3, 2.0), (8, 4, 0.5)]']],
      [[[String.raw`def eg(rows):
    try:
        return import_orders(rows)
    except ExceptionGroup as g:
        return g.message, [(type(e).__name__, str(e), e.__notes__) for e in g.exceptions]`,
         'eg([{\'id\': 4, \'qty\': \'0\', \'price\': \'3\'}])',
         'eg([{\'id\': 5, \'qty\': \'1\', \'price\': \'-2.5\'}])',
         'eg([{\'id\': 1, \'qty\': \'1\', \'price\': \'abc\'}])',
         'eg([{\'id\': 1, \'qty\': \'2.5\', \'price\': \'1\'}])']],
       ['(\'1 bad rows\', [(\'ValueError\', \'qty and price must be positive, got 0, 3.0\', [\'row 0 (id=4)\'])])',
        '(\'1 bad rows\', [(\'ValueError\', \'qty and price must be positive, got 1, -2.5\', [\'row 0 (id=5)\'])])',
        '(\'1 bad rows\', [(\'ValueError\', "could not convert string to float: \'abc\'", [\'row 0 (id=1)\'])])',
        '(\'1 bad rows\', [(\'ValueError\', "invalid literal for int() with base 10: \'2.5\'", [\'row 0 (id=1)\'])])']],
      [[[String.raw`def eg(rows):
    try:
        return import_orders(rows)
    except ExceptionGroup as g:
        return g.message, [(type(e).__name__, str(e), e.__notes__) for e in g.exceptions]`,
         'eg([{\'qty\': \'1\', \'price\': \'1\'}, {\'id\': 2}, {\'id\': 3, \'qty\': \'1\'}, {}])']],
       ['(\'4 bad rows\', [(\'KeyError\', "\'id\'", [\'row 0 (id=None)\']), (\'KeyError\', "\'qty\'", [\'row 1 (id=2)\']), (\'KeyError\', "\'price\'", [\'row 2 (id=3)\']), (\'KeyError\', "\'qty\'", [\'row 3 (id=None)\'])])']],
      [[[String.raw`def split(rows):
    out = {"k": [], "v": []}
    try:
        import_orders(rows)
    except* KeyError as g:
        out["k"] = [str(e) for e in g.exceptions]
    except* ValueError as g:
        out["v"] = [str(e) for e in g.exceptions]
    return out`,
         'split([{\'id\': 1, \'qty\': \'2\', \'price\': \'9.5\'}, {\'id\': 2, \'qty\': \'x\', \'price\': \'1\'}, {\'id\': 3, \'price\': \'4\'}, {\'id\': 4, \'qty\': \'0\', \'price\': \'3\'}])',
         'split([{\'id\': 1, \'qty\': \'2\', \'price\': \'9.5\'}])']],
       ['{\'k\': ["\'qty\'"], \'v\': ["invalid literal for int() with base 10: \'x\'", \'qty and price must be positive, got 0, 3.0\']}',
        '{\'k\': [], \'v\': []}']],
      [[[String.raw`def eg(rows):
    try:
        return import_orders(rows)
    except ExceptionGroup as g:
        return g.message, [(type(e).__name__, str(e), e.__notes__) for e in g.exceptions]`,
         'rows = [{"id": i, "qty": "1" if i % 1000 else "x", "price": "2"} for i in range(10000)]',
         'r = eg(rows)',
         'r[0]',
         'len(r[1])',
         'r[1][0][2]',
         'r[1][-1][2]',
         'len(import_orders([{"id": i, "qty": "1", "price": "2"} for i in range(10000)]))']],
       ['\'10 bad rows\'',
        '10',
        '[\'row 0 (id=0)\']',
        '[\'row 9000 (id=9000)\']',
        '10000']],
    ] },
    solution: {
      approach: `<p>Validate every row, attach context with notes, and bundle all failures. except* lets the caller route each family of errors to its own handler.</p>`,
      code: { lang: 'python', run: true, code: `def import_orders(rows):
    good, errors = [], []
    for i, r in enumerate(rows):
        try:
            qty = int(r['qty'])
            price = float(r['price'])
            if qty <= 0 or price <= 0:
                raise ValueError(f'qty and price must be positive, got {qty}, {price}')
            good.append((r['id'], qty, price))
        except (KeyError, ValueError) as e:
            e.add_note(f'row {i} (id={r.get("id")})')
            errors.append(e)
    if errors:
        raise ExceptionGroup(f'{len(errors)} bad rows', errors)
    return good


rows = [{'id': 1, 'qty': '2', 'price': '9.5'}, {'id': 2, 'qty': 'x', 'price': '1'},
        {'id': 3, 'price': '4'}, {'id': 4, 'qty': '0', 'price': '3'}]
try:
    import_orders(rows)
except* KeyError as g:
    for e in g.exceptions:
        print('missing field', e, '->', e.__notes__)
except* ValueError as g:
    for e in g.exceptions:
        print('bad value:', e, '->', e.__notes__)

print(import_orders(rows[:1]))` },
      complexity: `<p>O(N) over rows; O(E) memory for E errors.</p>`,
      followUps: ['Cap the number of collected errors at 100 and add a note "and 2,341 more".', 'Return partial results AND the errors instead of raising — when is that better?']
    }
  });

  practice.push({
    title: 'A Tiny Test Runner: PASS, FAIL and ERROR',
    level: 'Medium', tags: ['testing', 'introspection', 'exceptions'], companies: ['JetBrains', 'GitLab'],
    statement: `<p>Write <code>run_tests(namespace)</code> that finds every callable whose name starts with <code>test_</code> in a dict (like <code>globals()</code>), runs each one, and classifies it: <b>PASS</b> (returned normally), <b>FAIL</b> (raised AssertionError — a wrong result) or <b>ERROR</b> (raised any other Exception — a crash). Return a dict name → status and print a summary like pytest's (<code>2 passed, 1 failed, 1 error</code>). Tests run in sorted name order; one failing test must not stop the others.</p>`,
    constraints: `Do not catch BaseException (Ctrl+C must still stop the run).`,
    example: `<p>Tests: <code>test_add</code> (passes), <code>test_sub</code> (<code>assert 5 - 3 == 1</code>), <code>test_div</code> (<code>1/0</code>), <code>helper</code> (ignored) → ${H.c('g', 'test_add PASS')}, ${H.c('r', 'test_div ERROR')}, ${H.c('y', 'test_sub FAIL')}, summary ${H.c('b', '1 passed, 1 failed, 1 error')}.</p>`,
    brute: { why: `<p>Calling tests one after another in a script stops at the first failure and cannot distinguish "the code returned a wrong answer" (AssertionError) from "the test or the code crashed" (any other exception) — a distinction every real runner makes.</p>`, code: `def test_a():
    assert 1 + 1 == 2

def test_b():
    assert 2 * 2 == 5

test_a()
test_b()          # AssertionError stops everything here
print('never reached')` },
    mcq: { q: 'Which order of except clauses classifies correctly?', options: ['except AssertionError first, then except Exception', 'except Exception first, then except AssertionError', 'Only except BaseException', 'Order does not matter'], answer: 0, explain: 'AssertionError is a subclass of Exception. If Exception came first, failures would be reported as errors.' },
    hints: [`<p>Hint 1: <code>sorted(name for name, obj in ns.items() if name.startswith('test_') and callable(obj))</code>.</p>`, `<p>Hint 2: try: fn() / except AssertionError: FAIL / except Exception: ERROR / else: PASS.</p>`, `<p>Hint 3: Keep the exception message for the report (<code>f'{type(e).__name__}: {e}'</code>) and count statuses with a Counter for the summary line.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[[String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         'def test_add(): assert 2 + 3 == 5',
         String.raw`def test_sub():
    got = 5 - 3
    assert got == 1, f"expected 1, got {got}"`,
         'def test_div(): return 1 / 0',
         'def helper(): raise RuntimeError("never called")',
         'ns = dict(test_add=test_add, test_sub=test_sub, test_div=test_div, helper=helper)',
         'run_tests(ns)',
         'cap(lambda: run_tests(ns))[0].splitlines()[-1]',
         'len(cap(lambda: run_tests(ns))[0].splitlines())']],
       ['{\'test_add\': \'PASS\', \'test_div\': \'ERROR\', \'test_sub\': \'FAIL\'}',
        '\'1 passed, 1 failed, 1 error\'',
        '4']],
      [[['run_tests({})',
         'run_tests({"helper": lambda: 1, "not_test_x": lambda: 1})',
         String.raw`import io, contextlib
def cap(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        r = fn()
    return buf.getvalue(), r`,
         'cap(lambda: run_tests({}))[0]']],
       ['{}',
        '{}',
        '\'0 passed, 0 failed, 0 error\\n\'']],
      [[['run_tests({"test_x": 5, "test_y": lambda: None})',
         'run_tests({"test_z": print})']],
       ['{\'test_y\': \'PASS\'}',
        '{\'test_z\': \'PASS\'}']],
      [[['def test_b(): pass',
         'def test_a(): pass',
         'def test_c(): pass',
         'list(run_tests({"test_b": test_b, "test_a": test_a, "test_c": test_c}))']],
       ['[\'test_a\', \'test_b\', \'test_c\']']],
      [[[String.raw`def raises(f):
    try:
        f()
    except BaseException as e:
        return type(e).__name__`,
         'def test_ctrl(): raise KeyboardInterrupt()',
         'raises(lambda: run_tests({"test_ctrl": test_ctrl}))',
         'def test_exit(): raise SystemExit(1)',
         'raises(lambda: run_tests({"test_exit": test_exit}))']],
       ['\'KeyboardInterrupt\'',
        '\'SystemExit\'']],
      [[['def test_1(): assert False',
         'def test_2(): raise ValueError("boom")',
         'class Custom(Exception): pass',
         'def test_3(): raise Custom()',
         'def test_4(): assert True',
         'def test_5(): raise AssertionError',
         'run_tests(dict(test_1=test_1, test_2=test_2, test_3=test_3, test_4=test_4, test_5=test_5))']],
       ['{\'test_1\': \'FAIL\', \'test_2\': \'ERROR\', \'test_3\': \'ERROR\', \'test_4\': \'PASS\', \'test_5\': \'FAIL\'}']],
      [[['ns = {"test_%05d" % i: (lambda i=i: None if i % 3 else 1 / 0) for i in range(3000)}',
         'r = run_tests(ns)',
         'len(r)',
         'sum(1 for v in r.values() if v == "ERROR")',
         'sum(1 for v in r.values() if v == "PASS")',
         'list(r)[:2]']],
       ['3000',
        '1000',
        '2000',
        '[\'test_00000\', \'test_00001\']']],
    ] },
    solution: {
      approach: `<p>Discovery by naming convention, isolation by catching per test, and classification by exception type: exactly the core loop of unittest and pytest.</p>`,
      code: { lang: 'python', run: true, code: `from collections import Counter


def run_tests(ns):
    results = {}
    for name in sorted(n for n, obj in ns.items() if n.startswith('test_') and callable(obj)):
        try:
            ns[name]()
        except AssertionError as e:
            results[name] = 'FAIL'
            print(f'{name:10} FAIL   {e}')
        except Exception as e:
            results[name] = 'ERROR'
            print(f'{name:10} ERROR  {type(e).__name__}: {e}')
        else:
            results[name] = 'PASS'
            print(f'{name:10} PASS')
    c = Counter(results.values())
    print(f"{c['PASS']} passed, {c['FAIL']} failed, {c['ERROR']} error")
    return results


def test_add():
    assert 2 + 3 == 5

def test_sub():
    got = 5 - 3
    assert got == 1, f'expected 1, got {got}'

def test_div():
    return 1 / 0

def helper():
    raise RuntimeError('not a test, never called')

print(run_tests(dict(test_add=test_add, test_sub=test_sub, test_div=test_div, helper=helper)))` },
      complexity: `<p>O(T log T) for sorting T tests plus the tests' own cost.</p>`,
      followUps: ['Add setup/teardown hooks around every test (setup_function / teardown_function).', 'Add a skip decorator that sets an attribute the runner checks.', 'Run each test with a timeout — what are your options in pure Python?']
    }
  });

  practice.push({
    title: 'Verify Interactions With a Mock: Overdue Invoice Reminders',
    level: 'Medium', tags: ['mock', 'call_args_list', 'dependency injection'], companies: ['Intuit', 'Freshworks', 'Xero'],
    statement: `<p><code>send_reminders(invoices, today, send)</code> must call <code>send(email, subject)</code> once per invoice that is unpaid and overdue (due date before <code>today</code>), with subject <code>"Invoice &lt;id&gt; is &lt;n&gt; days overdue"</code>, and return the number sent. If <code>send</code> raises <code>ConnectionError</code> for one customer, skip that one and continue. Write the function <b>and</b> its tests using <code>unittest.mock.Mock</code> — no real email.</p>`,
    constraints: `invoices: list of dicts with id, email, due (datetime.date), paid (bool).`,
    example: `<p>today = 2026-03-10; invoices #1 due 03-01 unpaid, #2 due 03-20 unpaid, #3 due 02-01 paid → exactly ${H.c('g', "one call: send('a@x.com', 'Invoice 1 is 9 days overdue')")}.</p>`,
    brute: { why: `<p>Testing by sending real emails to a test inbox is slow, needs credentials and network, and you still have to scrape the inbox to verify. Printing instead of sending gives nothing to assert on.</p>`, code: `import smtplib

def send_real(email, subject):
    with smtplib.SMTP('smtp.example.com') as s:    # real network in tests: no
        s.sendmail('billing@example.com', [email], subject)` },
    mcq: { q: 'How do you check that the SECOND call had specific arguments?', options: ['<code>send.call_args_list[1] == mock.call(email, subject)</code>', '<code>send.assert_called_once_with(...)</code>', '<code>send.return_value[1]</code>', '<code>send.call_count == 2</code>'], answer: 0, explain: 'call_args_list keeps every call in order as call objects. assert_called_once_with would fail when there are several calls; call_count does not check arguments.' },
    hints: [`<p>Hint 1: Inject <code>send</code> as a parameter — then the test passes <code>Mock()</code> with no patching at all.</p>`, `<p>Hint 2: Days overdue = <code>(today - inv['due']).days</code>; condition <code>not paid and days &gt; 0</code>.</p>`, `<p>Hint 3: For the failure case use <code>Mock(side_effect=[ConnectionError(), None])</code> and assert the return value is 1 while call_count is 2.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['from datetime import date, timedelta',
         'sent = []',
         'def send(e, s): sent.append((e, s))',
         'today = date(2026, 3, 10)',
         'invs = [{\'id\': 1, \'email\': \'a@x.com\', \'due\': date(2026, 3, 1), \'paid\': False}, {\'id\': 2, \'email\': \'b@x.com\', \'due\': date(2026, 3, 20), \'paid\': False}, {\'id\': 3, \'email\': \'c@x.com\', \'due\': date(2026, 2, 1), \'paid\': True}]',
         'send_reminders(invs, today, send)',
         'sent']],
       ['1',
        '[(\'a@x.com\', \'Invoice 1 is 9 days overdue\')]']],
      [[['from datetime import date',
         'from unittest import mock',
         'today = date(2026, 3, 10)',
         'invs = [{\'id\': 1, \'email\': \'a@x.com\', \'due\': date(2026, 3, 1), \'paid\': False}, {\'id\': 2, \'email\': \'b@x.com\', \'due\': date(2026, 3, 20), \'paid\': False}, {\'id\': 3, \'email\': \'c@x.com\', \'due\': date(2026, 2, 1), \'paid\': True}, {\'id\': 4, \'email\': \'d@x.com\', \'due\': date(2026, 2, 28), \'paid\': False}]',
         'm = mock.Mock()',
         'send_reminders(invs, today, m)',
         'm.call_args_list == [mock.call(\'a@x.com\', \'Invoice 1 is 9 days overdue\'), mock.call(\'d@x.com\', \'Invoice 4 is 10 days overdue\')]',
         'm.call_count']],
       ['2',
        'True',
        '2']],
      [[['from datetime import date',
         'sent = []',
         'def send(e, s): sent.append(s)',
         'today = date(2026, 3, 10)',
         'invs = [{\'id\': 5, \'email\': \'e\', \'due\': date(2026, 3, 10), \'paid\': False}, {\'id\': 6, \'email\': \'f\', \'due\': date(2026, 3, 9), \'paid\': False}, {\'id\': 7, \'email\': \'g\', \'due\': date(2026, 3, 11), \'paid\': False}]',
         'send_reminders(invs, today, send)',
         'sent']],
       ['1',
        '[\'Invoice 6 is 1 days overdue\']']],
      [[['from datetime import date',
         'sent = []',
         String.raw`def send(e, s):
    if e == "bad@x.com":
        raise ConnectionError("down")
    sent.append(e)`,
         'today = date(2026, 3, 10)',
         'invs = [{\'id\': i, \'email\': e, \'due\': date(2026, 3, 1), \'paid\': False} for i, e in enumerate([\'a@x.com\', \'bad@x.com\', \'c@x.com\'])]',
         'send_reminders(invs, today, send)',
         'sent']],
       ['2',
        '[\'a@x.com\', \'c@x.com\']']],
      [[['from datetime import date',
         'def send(e, s): raise ValueError("bug")',
         'invs = [{\'id\': 1, \'email\': \'a\', \'due\': date(2026, 3, 1), \'paid\': False}]',
         'send_reminders(invs, date(2026, 3, 10), send)']],
       ['!ValueError']],
      [[['from datetime import date',
         'sent = []',
         'def send(e, s): sent.append(s)',
         'send_reminders([], date(2026, 3, 10), send)',
         'send_reminders([{\'id\': 1, \'email\': \'a\', \'due\': date(2020, 1, 1), \'paid\': True}], date(2026, 3, 10), send)',
         'sent']],
       ['0',
        '0',
        '[]']],
      [[['from datetime import date, timedelta',
         'sent = []',
         'def send(e, s): sent.append((e, s))',
         'today = date(2026, 3, 10)',
         'invs = [{"id": i, "email": "u%d@x.com" % i, "due": today - timedelta(days=i + 1), "paid": i % 2 == 1} for i in range(10000)]',
         'send_reminders(invs, today, send)',
         'sent[0]',
         'sent[-1]',
         'len(sent)']],
       ['5000',
        '(\'u0@x.com\', \'Invoice 0 is 1 days overdue\')',
        '(\'u9998@x.com\', \'Invoice 9998 is 9999 days overdue\')',
        '5000']],
    ] },
    solution: {
      approach: `<p>Dependency injection makes the side effect replaceable; the Mock records each call so the test asserts the exact interactions (who, what, how many), including the partial-failure path.</p>`,
      code: { lang: 'python', run: true, code: `from datetime import date
from unittest import mock


def send_reminders(invoices, today, send):
    sent = 0
    for inv in invoices:
        days = (today - inv['due']).days
        if inv['paid'] or days <= 0:
            continue
        try:
            send(inv['email'], f"Invoice {inv['id']} is {days} days overdue")
        except ConnectionError:
            continue                      # skip this customer, keep going
        sent += 1
    return sent


invoices = [
    {'id': 1, 'email': 'a@x.com', 'due': date(2026, 3, 1), 'paid': False},
    {'id': 2, 'email': 'b@x.com', 'due': date(2026, 3, 20), 'paid': False},
    {'id': 3, 'email': 'c@x.com', 'due': date(2026, 2, 1), 'paid': True},
    {'id': 4, 'email': 'd@x.com', 'due': date(2026, 2, 28), 'paid': False},
]
today = date(2026, 3, 10)

send = mock.Mock()
assert send_reminders(invoices, today, send) == 2
assert send.call_args_list == [
    mock.call('a@x.com', 'Invoice 1 is 9 days overdue'),
    mock.call('d@x.com', 'Invoice 4 is 10 days overdue'),
]
print('happy path ok:', send.call_args_list)

flaky = mock.Mock(side_effect=[ConnectionError('smtp down'), None])
assert send_reminders(invoices, today, flaky) == 1
assert flaky.call_count == 2
print('partial failure ok: sent 1 of 2 attempts')` },
      complexity: `<p>O(N) over invoices; tests run in microseconds.</p>`,
      followUps: ['Use create_autospec on the real send function so a signature change breaks the test.', 'Make "today" default to date.today() while keeping tests deterministic.', 'Batch sends: one call with a list — how do the assertions change?']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Mini pytest Fixture Engine (Dependency Injection + Yield Teardown + Scopes)',
    level: 'Hard', tags: ['fixtures', 'generators', 'inspect', 'design'], companies: ['Google', 'Datadog', 'JetBrains'],
    statement: `<p>Build a tiny fixture system:</p><ul><li><code>reg.fixture(scope='function'|'session')</code> decorator registers a fixture by its function name. A fixture may <code>return</code> a value or <code>yield</code> once (code after yield = teardown).</li><li>Fixtures and tests request other fixtures by <b>parameter name</b> (use <code>inspect.signature</code>).</li><li><code>reg.run(test)</code> resolves the test's fixtures (recursively), runs it, classifies PASS/FAIL/ERROR, then tears down this test's function-scoped fixtures in <b>reverse</b> creation order — even if the test failed.</li><li>Session fixtures are created once, cached, and torn down (reverse order) by <code>reg.close()</code>.</li><li>A session fixture depending on a function fixture raises <code>ScopeMismatch</code>; an unknown name raises <code>LookupError</code>.</li></ul>`,
    constraints: `Pure Python stdlib. Each fixture instance is created at most once per its scope.`,
    example: `<p>Fixtures <code>db</code> (session, yields), <code>user(db)</code> (function, yields). Running <code>test_a(user)</code> then <code>test_b(db, user)</code>, then close() logs: ${H.c('g', 'setup db, setup user, test_a, teardown user, setup user, test_b, teardown user, teardown db')} — db built once, user per test.</p>`,
    brute: { why: `<p>Hard-coding setup in every test (<code>db = make_db(); try: … finally: db.close()</code>) duplicates code, rebuilds expensive resources for every test, and gets teardown order wrong as soon as resources depend on each other.</p>`, code: `import sqlite3

def test_a():
    db = sqlite3.connect(':memory:')       # rebuilt for every test
    try:
        db.execute('CREATE TABLE t(x)')
        assert db.execute('SELECT 1').fetchone() == (1,)
    finally:
        db.close()` },
    mcq: { q: 'How do you run a generator fixture\'s teardown and verify it yielded exactly once?', options: ['Call next(gen) once more and expect StopIteration; if it yields again, raise an error', 'Call gen.close() only', 'Delete the generator and rely on garbage collection', 'Call gen.send(None) twice'], answer: 0, explain: 'The second next() resumes after the yield, running the teardown code; a correct fixture then finishes with StopIteration. Relying on GC makes teardown timing unpredictable; close() would raise GeneratorExit at the yield and skip teardown code that is not in a finally block.' },
    hints: [`<p>Hint 1: Store <code>name → (fn, scope)</code>. Resolution is a recursive DFS over parameter names with a per-test cache dict and a per-test teardown list (plus a session cache and session teardown list).</p>`, `<p>Hint 2: After calling a fixture function, <code>inspect.isgenerator(result)</code> → value = <code>next(result)</code> and push the generator onto the correct teardown list; otherwise the result is the value.</p>`, `<p>Hint 3: In <code>run</code>, use try/except AssertionError/except Exception/finally; in finally pop teardown generators in reverse, calling next() and expecting StopIteration. Check scope mismatch when a session fixture's dependency is function-scoped.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[[String.raw`log = []
reg = Registry()
@reg.fixture(scope='session')
def db():
    log.append('setup db')
    yield {'users': []}
    log.append('teardown db')
@reg.fixture()
def user(db):
    log.append('setup user')
    db['users'].append('asha')
    yield 'asha'
    db['users'].remove('asha')
    log.append('teardown user')
def test_a(user):
    log.append('test_a')
    assert user == 'asha'
def test_b(db, user):
    log.append('test_b')
    assert db['users'] == ['asha', 'ben']
def test_c(missing):
    pass`,
         'reg.run(test_a)',
         'reg.run(test_b)',
         'reg.run(test_c)',
         'reg.close()',
         'log']],
       ['\'PASS\'',
        '\'FAIL\'',
        '"ERROR (LookupError: fixture \'missing\' not found)"',
        '[\'setup db\', \'setup user\', \'test_a\', \'teardown user\', \'setup user\', \'test_b\', \'teardown user\', \'teardown db\']']],
      [[[String.raw`log = []
reg = Registry()
@reg.fixture()
def res():
    log.append('open')
    yield 1
    log.append('close')
def test_fail(res):
    log.append('body')
    assert res == 2
def test_err(res):
    raise ValueError('boom')`,
         'reg.run(test_fail)',
         'reg.run(test_err)',
         'log']],
       ['\'FAIL\'',
        '\'ERROR (ValueError: boom)\'',
        '[\'open\', \'body\', \'close\', \'open\', \'close\']']],
      [[[String.raw`reg = Registry()
@reg.fixture()
def f():
    return 1
@reg.fixture(scope='session')
def s(f):
    return f
def test_x(s):
    pass`,
         'reg.run(test_x)',
         'reg.close()']],
       ['"ERROR (ScopeMismatch: session fixture \'s\' cannot use function fixture \'f\')"']],
      [[[String.raw`reg = Registry()
def test_x(nope):
    pass
def test_y():
    pass`,
         'reg.run(test_x)',
         'reg.run(test_y)',
         'issubclass(ScopeMismatch, Exception)']],
       ['"ERROR (LookupError: fixture \'nope\' not found)"',
        '\'PASS\'',
        'True']],
      [[[String.raw`log = []
reg = Registry()
@reg.fixture(scope='session')
def conn():
    log.append('conn+')
    yield 'c'
    log.append('conn-')
@reg.fixture()
def base():
    log.append('base+')
    return 'b'
@reg.fixture()
def left(base):
    return base + 'L'
@reg.fixture()
def right(base):
    return base + 'R'
def test_1(conn, left, right):
    log.append((conn, left, right))
def test_2(conn, base):
    log.append(base)`,
         'reg.run(test_1)',
         'reg.run(test_2)',
         'reg.close()',
         'log']],
       ['\'PASS\'',
        '\'PASS\'',
        '[\'conn+\', \'base+\', (\'c\', \'bL\', \'bR\'), \'base+\', \'b\', \'conn-\']']],
      [[[String.raw`log = []
reg = Registry()
@reg.fixture()
def a():
    log.append('a+')
    yield 'a'
    log.append('a-')
@reg.fixture()
def b(a):
    log.append('b+')
    yield a + 'b'
    log.append('b-')
@reg.fixture()
def c(b):
    log.append('c+')
    yield b + 'c'
    log.append('c-')
@reg.fixture()
def n():
    return 5
def test_chain(c):
    assert c == 'abc'
def test_n_ok(n):
    assert n == 5
def test_n_bad(n):
    assert n == 6`,
         'reg.run(test_chain)',
         'log',
         'reg.run(test_n_ok)',
         'reg.run(test_n_bad)']],
       ['\'PASS\'',
        '[\'a+\', \'b+\', \'c+\', \'c-\', \'b-\', \'a-\']',
        '\'PASS\'',
        '\'FAIL\'']],
      [[[String.raw`reg = Registry()
@reg.fixture()
def twice():
    yield 1
    yield 2
def test_t(twice):
    pass`,
         'reg.run(test_t)']],
       ['!RuntimeError']],
      [[[String.raw`log = []
reg = Registry()
@reg.fixture(scope='session')
def s1():
    log.append('s1+')
    yield
    log.append('s1-')
@reg.fixture(scope='session')
def s2(s1):
    log.append('s2+')
    yield
    log.append('s2-')
def test_s(s2):
    pass`,
         'reg.run(test_s)',
         'reg.run(test_s)',
         'log',
         'reg.close()',
         'log',
         'reg.close()',
         'len(log)']],
       ['\'PASS\'',
        '\'PASS\'',
        '[\'s1+\', \'s2+\']',
        '[\'s1+\', \'s2+\', \'s2-\', \'s1-\']',
        '4']],
      [[[String.raw`reg = Registry()
@reg.fixture()
def a(b):
    return 1
@reg.fixture()
def b(a):
    return 2
def test_cyc(a):
    pass`,
         'reg.run(test_cyc)']],
       ['\'ERROR (RuntimeError: fixture cycle: a -> b -> a)\'']],
    ] },
    solution: {
      approach: `<p>A recursive resolver with two caches (per-test and session) and two LIFO teardown stacks. Generators give us setup/teardown in one function, exactly like pytest's yield fixtures.</p>`,
      code: { lang: 'python', run: true, code: `import inspect


class ScopeMismatch(Exception):
    pass


class Registry:
    def __init__(self):
        self.defs = {}                       # name -> (fn, scope)
        self.session_cache = {}
        self.session_teardowns = []

    def fixture(self, scope='function'):
        def deco(fn):
            self.defs[fn.__name__] = (fn, scope)
            return fn
        return deco

    def _resolve(self, name, cache, teardowns, path=()):
        if name not in self.defs:
            raise LookupError(f'fixture {name!r} not found')
        fn, scope = self.defs[name]
        store = self.session_cache if scope == 'session' else cache
        if name in store:
            return store[name]
        if name in path:
            raise RuntimeError('fixture cycle: ' + ' -> '.join(path + (name,)))
        kwargs = {}
        for dep in inspect.signature(fn).parameters:
            if scope == 'session' and self.defs.get(dep, (None, 'session'))[1] == 'function':
                raise ScopeMismatch(f'session fixture {name!r} cannot use function fixture {dep!r}')
            kwargs[dep] = self._resolve(dep, cache, teardowns, path + (name,))
        result = fn(**kwargs)
        if inspect.isgenerator(result):
            value = next(result)                                    # run setup
            (self.session_teardowns if scope == 'session' else teardowns).append((name, result))
        else:
            value = result
        store[name] = value
        return value

    @staticmethod
    def _finish(name, gen):
        try:
            next(gen)                                               # run teardown
        except StopIteration:
            return
        raise RuntimeError(f'fixture {name!r} yielded more than once')

    def run(self, test):
        cache, teardowns = {}, []
        try:
            kwargs = {p: self._resolve(p, cache, teardowns) for p in inspect.signature(test).parameters}
            test(**kwargs)
            status = 'PASS'
        except AssertionError:
            status = 'FAIL'
        except Exception as e:
            status = f'ERROR ({type(e).__name__}: {e})'
        finally:
            for name, gen in reversed(teardowns):                  # LIFO
                self._finish(name, gen)
        return status

    def close(self):
        while self.session_teardowns:
            self._finish(*self.session_teardowns.pop())


log = []
reg = Registry()


@reg.fixture(scope='session')
def db():
    log.append('setup db')
    yield {'users': []}
    log.append('teardown db')


@reg.fixture()
def user(db):
    log.append('setup user')
    db['users'].append('asha')
    yield 'asha'
    db['users'].remove('asha')
    log.append('teardown user')


def test_a(user):
    log.append('test_a')
    assert user == 'asha'


def test_b(db, user):
    log.append('test_b')
    assert db['users'] == ['asha', 'ben']       # fails on purpose


def test_c(missing):
    pass


print(reg.run(test_a), reg.run(test_b), reg.run(test_c))
reg.close()
print(log)` },
      complexity: `<p>Resolution is O(F + E) per test for F fixtures and E dependency edges (each resolved once thanks to caches). Teardown is O(F).</p>`,
      followUps: ['Add module scope keyed by test.__module__.', 'Support autouse fixtures and params=[...] (run a test once per param).', 'Make teardown errors not hide the test result, but report both (hint: ExceptionGroup).']
    }
  });

  practice.push({
    title: 'Write a Tiny Mock From Scratch',
    level: 'Hard', tags: ['mock', 'dunder methods', '__getattr__', 'testing'], companies: ['Meta', 'Stripe'],
    statement: `<p>Implement <code>TinyMock</code> supporting:</p><ul><li>Calling it records <code>(args, kwargs)</code> in <code>.calls</code>; <code>.call_count</code> property.</li><li><code>return_value</code> (default: a child TinyMock, created once and reused).</li><li><code>side_effect</code>: an exception class/instance → raise it; a callable → return its result; an iterable → return (or raise, if an exception) the next item per call.</li><li>Any unknown public attribute returns a child TinyMock, created once and cached (so <code>m.api.get(1)</code> works and is recorded on <code>m.api.get</code>).</li><li><code>assert_called_once_with(*args, **kwargs)</code> raising a helpful AssertionError.</li></ul>`,
    constraints: `Attributes beginning with "_" must raise AttributeError (otherwise copy/pickle/inspection probes go crazy). No unittest.mock.`,
    example: `<p><code>m = TinyMock(); m.client.get.return_value = 200; m.client.get('/x')</code> → ${H.c('g', '200')}; <code>m.client.get.assert_called_once_with('/x')</code> passes; <code>TinyMock(side_effect=[1, KeyError('k')])</code> → first call ${H.c('g', '1')}, second ${H.c('r', 'raises KeyError')}.</p>`,
    brute: { why: `<p>A hand-written stub class per test (<code>class FakeClient: def get(self, url): return 200</code>) works but records nothing, so you cannot assert how it was called, and you write a new one for every dependency.</p>`, code: `class FakeClient:
    def get(self, url):
        return 200          # no record of calls, cannot verify interaction

print(FakeClient().get('/x'))` },
    mcq: { q: 'Why implement child attributes with <code>__getattr__</code> rather than <code>__getattribute__</code>?', options: ['__getattr__ is only called when normal lookup fails, so real attributes (calls, return_value) work normally', '__getattribute__ does not exist', '__getattr__ is faster for every attribute', 'They are identical'], answer: 0, explain: '__getattribute__ intercepts EVERY attribute access, including self.calls, making infinite recursion easy. __getattr__ is the fallback for missing names — exactly "unknown attribute → child mock".' },
    hints: [`<p>Hint 1: In <code>__init__</code> set real attributes (<code>calls</code>, <code>side_effect</code>, <code>_children</code>, <code>_name</code>). <code>__getattr__(self, name)</code> is only consulted for names not found normally.</p>`, `<p>Hint 2: For side_effect classify in order: exception instance or class → raise; callable → call it; otherwise iterable → keep an iterator in <code>self.__dict__</code> created on first use.</p>`, `<p>Hint 3: Make <code>return_value</code> a property that lazily creates a child mock when never set, so <code>m().foo()</code> chains work like unittest.mock.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['m = TinyMock()',
         'm.client.get.return_value = 200',
         'm.client.get(\'/x\')',
         'm.client.get.call_count',
         'm.client.get.assert_called_once_with(\'/x\') is None',
         'm.client.get.calls']],
       ['200',
        '1',
        'True',
        '[((\'/x\',), {})]']],
      [[['s = TinyMock(side_effect=[1, KeyError("k")])',
         's()',
         's()',
         's()',
         's.call_count']],
       ['1',
        '!KeyError',
        '!StopIteration',
        '3']],
      [[['sq = TinyMock(side_effect=lambda x: x * x)',
         'sq(7)',
         'sq(x=3)',
         'sq.call_count',
         'TinyMock(side_effect=ValueError)()',
         'TinyMock(side_effect=KeyError("a"))()']],
       ['49',
        '9',
        '2',
        '!ValueError',
        '!KeyError']],
      [[[String.raw`def msg(f):
    try:
        f()
    except AssertionError as e:
        return str(e)`,
         'a = TinyMock()',
         'a.assert_called_once_with()',
         '_ = a(1)',
         'a.assert_called_once_with(2)',
         '_ = a(1)',
         'msg(lambda: a.assert_called_once_with(1))',
         'b = TinyMock(name="b")',
         '_ = b(1, k=2)',
         'msg(lambda: b.assert_called_once_with(1))',
         'b.assert_called_once_with(1, k=2) is None']],
       ['!AssertionError',
        '!AssertionError',
        '"Expected \'mock\' to be called once. Called 2 times."',
        '"b called with ((1,), {\'k\': 2}), expected ((1,), {})"',
        'True']],
      [[['m = TinyMock()',
         'm.api.get is m.api.get',
         'm.api.get is m.api.post',
         'm() is m()',
         'm.return_value is m()',
         'm.anything(1).chained() is m.anything(2).chained()',
         'm.x.return_value = 5',
         'm.x()',
         'TinyMock(return_value=None)() is None']],
       ['True',
        'False',
        'True',
        'True',
        'True',
        '5',
        'True']],
      [[['m = TinyMock()',
         'hasattr(m, "__deepcopy__")',
         'm._private',
         'repr(m)',
         'm.api.get',
         'm()',
         'm().x',
         'm.side_effect is None']],
       ['False',
        '!AttributeError',
        '\'<TinyMock mock>\'',
        '<TinyMock mock.api.get>',
        '<TinyMock mock()>',
        '<TinyMock mock().x>',
        'True']],
      [[['c = TinyMock()',
         'c(1, 2, a=3)',
         'c("x")',
         'c.calls',
         'c.call_count']],
       ['<TinyMock mock()>',
        '<TinyMock mock()>',
        '[((1, 2), {\'a\': 3}), ((\'x\',), {})]',
        '2']],
      [[['big = TinyMock()',
         'for i in range(100000): big(i)',
         'big.call_count',
         'big.calls[-1]',
         'big.foo = 5',
         'big.foo']],
       ['100000',
        '((99999,), {})',
        '5']],
    ] },
    solution: {
      approach: `<p>Real attributes hold state; <code>__getattr__</code> lazily creates and caches child mocks for unknown public names; <code>__call__</code> records then applies side_effect / return_value.</p>`,
      code: { lang: 'python', run: true, code: `_UNSET = object()


class TinyMock:
    def __init__(self, return_value=_UNSET, side_effect=None, name='mock'):
        self._name = name
        self._children = {}
        self._return_value = return_value
        self.side_effect = side_effect
        self.calls = []

    # --- attributes -------------------------------------------------
    def __getattr__(self, attr):                 # only for MISSING attributes
        if attr.startswith('_'):
            raise AttributeError(attr)
        if attr not in self._children:
            self._children[attr] = TinyMock(name=f'{self._name}.{attr}')
        return self._children[attr]

    @property
    def return_value(self):
        if self._return_value is _UNSET:
            self._return_value = TinyMock(name=f'{self._name}()')
        return self._return_value

    @return_value.setter
    def return_value(self, value):
        self._return_value = value

    @property
    def call_count(self):
        return len(self.calls)

    # --- calling ----------------------------------------------------
    def __call__(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        se = self.side_effect
        if se is None:
            return self.return_value
        if isinstance(se, BaseException) or (isinstance(se, type) and issubclass(se, BaseException)):
            raise se
        if callable(se):
            return se(*args, **kwargs)
        if '_effects' not in self.__dict__:
            self.__dict__['_effects'] = iter(se)
        item = next(self._effects)               # StopIteration when exhausted, like unittest.mock
        if isinstance(item, BaseException):
            raise item
        return item

    # --- assertions -------------------------------------------------
    def assert_called_once_with(self, *args, **kwargs):
        if self.call_count != 1:
            raise AssertionError(f'Expected {self._name!r} to be called once. Called {self.call_count} times.')
        if self.calls[0] != (args, kwargs):
            raise AssertionError(f'{self._name} called with {self.calls[0]}, expected {(args, kwargs)}')

    def __repr__(self):
        return f'<TinyMock {self._name}>'


m = TinyMock()
m.client.get.return_value = 200
print(m.client.get('/x'), m.client.get.call_count)
m.client.get.assert_called_once_with('/x')
print(m.anything(1).chained(), '<- auto child of return_value')

seq = TinyMock(side_effect=[1, KeyError('k')], name='seq')
print(seq())
try:
    seq()
except KeyError as e:
    print('raised', repr(e))

sq = TinyMock(side_effect=lambda x: x * x)
print(sq(7))
try:
    sq.assert_called_once_with(8)
except AssertionError as e:
    print('AssertionError:', e)
print(hasattr(m, '__deepcopy__'))        # False: private names are not auto-created` },
      complexity: `<p>O(1) per call/attribute (dict-cached children); memory grows with recorded calls.</p>`,
      followUps: ['Add spec=SomeClass so unknown attributes raise AttributeError (like autospec).', 'Support magic methods (len(m), m[0], with m:) — why must they be defined on the class, not the instance?', 'Implement call_args_list with call objects that compare equal to call(...).']
    }
  });

  practice.push({
    title: 'Runtime Type Checker for Type Hints (check_type)',
    level: 'Hard', tags: ['typing', 'get_origin', 'get_args', 'recursion'], companies: ['Microsoft', 'Pydantic', 'Bloomberg'],
    statement: `<p>Write <code>check_type(value, hint) -&gt; bool</code> that checks a value against a type hint at runtime. Support: plain classes (<code>int</code>, <code>str</code>, custom classes), <code>Any</code>, <code>None</code>, <code>list[T]</code>, <code>set[T]</code>, <code>dict[K, V]</code>, <code>tuple[A, B]</code> and <code>tuple[T, ...]</code>, unions (<code>int | str</code>, <code>Optional[X]</code>), and <code>Literal[...]</code>. Rules: <code>bool</code> is <b>not</b> accepted as <code>int</code>; <code>int</code> <b>is</b> accepted as <code>float</code> (like mypy). Unsupported hints raise <code>TypeError</code>.</p>`,
    constraints: `Use typing.get_origin / get_args. Recursive containers checked element by element (O(size)).`,
    example: `<p><code>check_type({'a': [1, 2]}, dict[str, list[int]])</code> → ${H.c('g', 'True')}; <code>check_type([1, 'x'], list[int])</code> → ${H.c('r', 'False')}; <code>check_type(True, int)</code> → ${H.c('r', 'False')}; <code>check_type(3, float)</code> → ${H.c('g', 'True')}; <code>check_type('r', Literal['r', 'w'])</code> → ${H.c('g', 'True')}.</p>`,
    brute: { why: `<p><code>isinstance(value, hint)</code> fails immediately: <code>isinstance([1], list[int])</code> raises <code>TypeError: isinstance() argument 2 cannot be a parameterized generic</code>. Stripping to the origin (<code>isinstance(v, list)</code>) ignores the element types completely.</p>`, code: `def check_type_naive(value, hint):
    return isinstance(value, hint)     # TypeError for list[int], dict[str, int], Literal[...]

try:
    check_type_naive([1], list[int])
except TypeError as e:
    print(e)` },
    mcq: { q: 'What does <code>typing.get_origin(dict[str, int])</code> return?', options: ['<code>dict</code>', '<code>(str, int)</code>', '<code>typing.Dict</code>', '<code>None</code>'], answer: 0, explain: 'get_origin gives the unparametrised base (dict); get_args gives the parameters (str, int). For a plain class like int, get_origin returns None.' },
    hints: [`<p>Hint 1: Handle the leaves first: Any → True; None/NoneType → value is None; <code>get_origin(hint) is None</code> → plain class → isinstance with the bool/int/float special cases.</p>`, `<p>Hint 2: Unions: origin is <code>typing.Union</code> (from Optional/Union[...]) or <code>types.UnionType</code> (from <code>int | str</code>) → any(check each arg). Literal → value equals one arg AND has the same type (so True does not match Literal[1]).</p>`, `<p>Hint 3: Containers: check isinstance with the origin, then recurse on every element. Tuples: <code>(T, Ellipsis)</code> means homogeneous any length; otherwise lengths must match and check pairwise.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['check_type({"a": [1, 2]}, dict[str, list[int]])',
         'check_type([1, "x"], list[int])',
         'check_type(True, int)',
         'check_type(3, float)',
         'check_type(\'r\', Literal[\'r\', \'w\'])',
         'check_type(5, Any)',
         'check_type(None, Any)']],
       ['True',
        'False',
        'False',
        'True',
        'True',
        'True',
        'True']],
      [[['check_type(None, None)',
         'check_type(0, None)',
         'check_type(None, Optional[str])',
         'check_type("a", Optional[str])',
         'check_type(1, Optional[str])',
         'check_type("hi", int | str)',
         'check_type(1.5, int | str)',
         'check_type([1], Union[int, list[int]])',
         'check_type(None, type(None))']],
       ['True',
        'False',
        'True',
        'True',
        'False',
        'True',
        'False',
        'True',
        'True']],
      [[['check_type((1, "a"), tuple[int, str])',
         'check_type((1,), tuple[int, str])',
         'check_type((1, 2, 3), tuple[int, ...])',
         'check_type((), tuple[int, ...])',
         'check_type((1, "x"), tuple[int, ...])',
         'check_type((1, 2), tuple[int])',
         'check_type([1, 2], tuple[int, int])',
         'check_type((), tuple[()])',
         'check_type((1,), tuple[()])']],
       ['True',
        'False',
        'True',
        'True',
        'False',
        'False',
        'False',
        'True',
        'False']],
      [[['check_type(True, Literal[1])',
         'check_type(1, Literal[1])',
         'check_type(\'a\', Literal[\'a\', \'b\'])',
         'check_type(\'c\', Literal[\'a\', \'b\'])',
         'check_type(1, Literal[True])',
         'check_type(True, Literal[True])',
         'check_type(1.5, int)',
         'check_type(True, float)',
         'check_type(1, float)',
         'check_type(2.5, float)',
         'check_type("1", float)']],
       ['False',
        'True',
        'True',
        'False',
        'False',
        'True',
        'False',
        'False',
        'True',
        'True',
        'False']],
      [[['check_type({1, 2}, set[int])',
         'check_type({1, "a"}, set[int])',
         'check_type(frozenset({1}), frozenset[int])',
         'check_type({1}, frozenset[int])',
         'check_type([], list[int])',
         'check_type({}, dict[str, int])',
         'check_type({"a": 1}, dict[str, int])',
         'check_type({"a": "b"}, dict[str, int])',
         'check_type({1: 1}, dict[str, int])',
         'check_type([[1], [2, "x"]], list[list[int]])',
         'check_type([[1], [2]], list[list[int]])',
         'check_type((1, 2), list[int])']],
       ['True',
        'False',
        'True',
        'False',
        'True',
        'True',
        'True',
        'False',
        'False',
        'False',
        'True',
        'False']],
      [[['class A: pass',
         'class B(A): pass',
         'check_type(B(), A)',
         'check_type(A(), B)',
         'check_type(A(), object)',
         'check_type("s", str)',
         'check_type(b"s", str)',
         'check_type({"k": [A(), B()]}, dict[str, list[A]])']],
       ['True',
        'False',
        'True',
        'True',
        'False',
        'True']],
      [[['check_type([], typing.Callable[[int], int])',
         'check_type(1, "int")',
         'check_type(1, 5)',
         'check_type(1, typing.Callable)',
         'check_type([1], typing.Sequence[int])']],
       ['!TypeError',
        '!TypeError',
        '!TypeError',
        '!TypeError',
        '!TypeError']],
      [[['check_type(list(range(10**5)), list[int])',
         'check_type(list(range(10**5)) + ["x"], list[int])',
         'check_type({i: [i] for i in range(20000)}, dict[int, list[int]])',
         'check_type(tuple(range(10**5)), tuple[int, ...])']],
       ['True',
        'False',
        'True',
        'True']],
    ] },
    solution: {
      approach: `<p>A recursive dispatcher on <code>get_origin(hint)</code>. This is the core of what pydantic, beartype and typeguard do (with many more cases and caching).</p>`,
      code: { lang: 'python', run: true, code: `import types
import typing
from typing import Any, Literal, Optional, Union, get_args, get_origin


def check_type(value, hint) -> bool:
    if hint is Any:
        return True
    if hint is None or hint is type(None):
        return value is None
    origin = get_origin(hint)
    if origin is None:                                   # a plain class
        if hint is int:
            return isinstance(value, int) and not isinstance(value, bool)
        if hint is float:
            return isinstance(value, (int, float)) and not isinstance(value, bool)
        if isinstance(hint, type):
            return isinstance(value, hint)
        raise TypeError(f'unsupported hint {hint!r}')
    args = get_args(hint)
    if origin is Union or origin is types.UnionType:    # Optional[X], Union[...], X | Y
        return any(check_type(value, a) for a in args)
    if origin is Literal:
        return any(value == a and type(value) is type(a) for a in args)
    if origin in (list, set, frozenset):
        return isinstance(value, origin) and all(check_type(v, args[0]) for v in value)
    if origin is dict:
        k_hint, v_hint = args
        return isinstance(value, dict) and all(
            check_type(k, k_hint) and check_type(v, v_hint) for k, v in value.items())
    if origin is tuple:
        if not isinstance(value, tuple):
            return False
        if len(args) == 2 and args[1] is Ellipsis:      # tuple[int, ...]
            return all(check_type(v, args[0]) for v in value)
        if args == ((),):                                # tuple[()] - empty tuple
            return value == ()
        return len(value) == len(args) and all(check_type(v, a) for v, a in zip(value, args))
    raise TypeError(f'unsupported hint {hint!r}')


tests = [
    ({'a': [1, 2]}, dict[str, list[int]], True),
    ([1, 'x'], list[int], False),
    (True, int, False),
    (3, float, True),
    (None, Optional[str], True),
    ('hi', int | str, True),
    ((1, 'a'), tuple[int, str], True),
    ((1, 2, 3), tuple[int, ...], True),
    ((1, 2), tuple[int], False),
    ('r', Literal['r', 'w'], True),
    (True, Literal[1], False),
    ({1, 2}, set[int], True),
]
for value, hint, expected in tests:
    got = check_type(value, hint)
    print('ok ' if got == expected else 'BUG', repr(value), hint, '->', got)
try:
    check_type([], typing.Callable[[int], int])
except TypeError as e:
    print('TypeError:', e)` },
      complexity: `<p>O(total number of elements in the nested value) time; recursion depth = nesting depth of the hint.</p>`,
      followUps: ['Support TypedDict (hint: __required_keys__, __annotations__) and dataclasses.', 'Return a path to the first mismatch, e.g. "$.a[1]: expected int, got str".', 'Write a @typechecked decorator that checks arguments and the return value using inspect.signature + typing.get_type_hints.']
    }
  });

  practice.push({
    title: 'Circuit Breaker With Custom Exceptions and a Fake Clock',
    level: 'Hard', tags: ['custom exceptions', 'state machine', 'testing', 'dependency injection'], companies: ['Netflix', 'Uber', 'Flipkart'],
    statement: `<p>Implement <code>CircuitBreaker(threshold=3, reset_timeout=30.0, clock=time.monotonic, expected=(ConnectionError, TimeoutError))</code> with method <code>call(fn, *args, **kwargs)</code>:</p><ul><li><b>closed</b>: call fn. Each expected exception increments a failure counter and is re-raised; a success resets the counter. At <code>threshold</code> consecutive failures → <b>open</b>.</li><li><b>open</b>: do not call fn; raise <code>CircuitOpenError</code> (a custom exception with a <code>retry_in</code> attribute). After <code>reset_timeout</code> seconds → <b>half-open</b>.</li><li><b>half-open</b>: allow one trial call: success → closed, failure → open again (timer restarts).</li><li>Unexpected exceptions (e.g. ValueError) propagate without counting.</li></ul><p>Test every transition deterministically using an injected fake clock.</p>`,
    constraints: `No real sleeping. Single-threaded is fine.`,
    example: `<p>threshold 2, timeout 10: fail, fail → ${H.c('r', 'open')}; call at t=5 → ${H.c('r', 'CircuitOpenError(retry_in=5.0)')} without touching fn; at t=12 → half-open trial succeeds → ${H.c('g', 'closed')}.</p>`,
    brute: { why: `<p>Plain retries keep hammering a dead dependency, adding load exactly when it is struggling and making every user request wait for timeouts. Testing it with real <code>time.sleep(30)</code> makes the suite take minutes.</p>`, code: `import time

def call_with_hope(fn):
    while True:
        try:
            return fn()
        except ConnectionError:
            time.sleep(1)       # hammers a dead service forever` },
    mcq: { q: 'Why should a ValueError from fn NOT count as a failure?', options: ['It signals a bug or bad input, not an unhealthy dependency; opening the circuit would block healthy calls', 'ValueError cannot be caught', 'Because it is a BaseException', 'It should count; all errors are equal'], answer: 0, explain: 'The breaker protects against an unavailable dependency. Caller mistakes say nothing about the dependency\'s health, so only the configured "expected" (transient/infra) exceptions count.' },
    hints: [`<p>Hint 1: State = 'closed' | 'open' | 'half-open', plus <code>failures</code> and <code>opened_at</code>. Check for "open → half-open" lazily at the start of each call using the clock.</p>`, `<p>Hint 2: <code>try: result = fn(...) except self.expected: self._failure(); raise else: self._success(); return result</code> — only expected exceptions touch the counter.</p>`, `<p>Hint 3: Fake clock: <code>now = [0.0]; clock = lambda: now[0]</code>; advance with <code>now[0] = 12</code>. Assert state after each step and that fn was not called while open.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[[String.raw`now = [0.0]
cb = CircuitBreaker(threshold=2, reset_timeout=10, clock=lambda: now[0])
calls = []
def down():
    calls.append('down')
    raise ConnectionError('service down')
def up():
    calls.append('up')
    return 'ok'
def hit(fn):
    try:
        return cb.call(fn)
    except Exception as e:
        return type(e).__name__`,
         'hit(down)',
         'hit(down)',
         'cb.state',
         'now[0] = 5',
         'hit(up)',
         'calls',
         String.raw`try:
    cb.call(up)
except CircuitOpenError as e:
    ri = (e.retry_in, str(e))`,
         'ri',
         'now[0] = 12',
         'cb.call(up)',
         'cb.state',
         'cb.failures']],
       ['\'ConnectionError\'',
        '\'ConnectionError\'',
        '\'open\'',
        '\'CircuitOpenError\'',
        '[\'down\', \'down\']',
        '(5.0, \'circuit open; retry in 5.0s\')',
        '\'ok\'',
        '\'closed\'',
        '0']],
      [[[String.raw`now = [0.0]
cb = CircuitBreaker(threshold=2, reset_timeout=10, clock=lambda: now[0])
calls = []
def down():
    calls.append('down')
    raise ConnectionError('service down')
def up():
    calls.append('up')
    return 'ok'
def hit(fn):
    try:
        return cb.call(fn)
    except Exception as e:
        return type(e).__name__`,
         'hit(down)',
         'hit(down)',
         'now[0] = 10',
         'hit(down)',
         'cb.state',
         'now[0] = 15',
         'hit(up)',
         'now[0] = 19.9',
         'hit(up)',
         'now[0] = 20',
         'hit(up)',
         'cb.state',
         'calls']],
       ['\'ConnectionError\'',
        '\'ConnectionError\'',
        '\'ConnectionError\'',
        '\'open\'',
        '\'CircuitOpenError\'',
        '\'CircuitOpenError\'',
        '\'ok\'',
        '\'closed\'',
        '[\'down\', \'down\', \'down\', \'up\']']],
      [[[String.raw`now = [0.0]
cb = CircuitBreaker(threshold=2, reset_timeout=10, clock=lambda: now[0])
calls = []
def down():
    calls.append('down')
    raise ConnectionError('service down')
def up():
    calls.append('up')
    return 'ok'
def hit(fn):
    try:
        return cb.call(fn)
    except Exception as e:
        return type(e).__name__`,
         'hit(down)',
         'cb.failures',
         'hit(up)',
         'cb.failures',
         'hit(down)',
         'cb.state',
         'hit(down)',
         'cb.state']],
       ['\'ConnectionError\'',
        '1',
        '\'ok\'',
        '0',
        '\'ConnectionError\'',
        '\'closed\'',
        '\'ConnectionError\'',
        '\'open\'']],
      [[[String.raw`now = [0.0]
cb = CircuitBreaker(threshold=2, reset_timeout=10, clock=lambda: now[0])
calls = []
def down():
    calls.append('down')
    raise ConnectionError('service down')
def up():
    calls.append('up')
    return 'ok'
def hit(fn):
    try:
        return cb.call(fn)
    except Exception as e:
        return type(e).__name__`,
         'hit(lambda: int("x"))',
         'hit(lambda: int("x"))',
         'hit(lambda: int("x"))',
         'cb.state',
         'cb.failures',
         'hit(down)',
         'cb.failures',
         'hit(lambda: int("x"))',
         'cb.failures']],
       ['\'ValueError\'',
        '\'ValueError\'',
        '\'ValueError\'',
        '\'closed\'',
        '0',
        '\'ConnectionError\'',
        '1',
        '\'ValueError\'',
        '1']],
      [[['cb = CircuitBreaker(threshold=1, expected=(KeyError,), clock=lambda: 0.0)',
         String.raw`def hit(fn):
    try:
        return cb.call(fn)
    except Exception as e:
        return type(e).__name__`,
         'hit(lambda: 1 / 0)',
         'cb.state',
         'hit(lambda: {}["k"])',
         'cb.state',
         'hit(lambda: 1)']],
       ['\'ZeroDivisionError\'',
        '\'closed\'',
        '\'KeyError\'',
        '\'open\'',
        '\'CircuitOpenError\'']],
      [[['cb = CircuitBreaker()',
         'cb.call(lambda a, b=0: a + b, 1, b=2)',
         'cb.call(lambda *a, **k: (a, k), 1, 2, x=3)',
         '(cb.threshold, cb.reset_timeout, cb.state)']],
       ['3',
        '((1, 2), {\'x\': 3})',
        '(3, 30.0, \'closed\')']],
      [[['cb2 = CircuitBreaker(clock=lambda: 100.0)',
         String.raw`def boom():
    raise TimeoutError("slow")`,
         String.raw`def hit(fn):
    try:
        return cb2.call(fn)
    except Exception as e:
        return type(e).__name__`,
         'hit(boom)',
         'hit(boom)',
         'cb2.state',
         'cb2.failures',
         'hit(boom)',
         'cb2.state',
         'cb2.opened_at',
         'hit(boom)']],
       ['\'TimeoutError\'',
        '\'TimeoutError\'',
        '\'closed\'',
        '2',
        '\'TimeoutError\'',
        '\'open\'',
        '100.0',
        '\'CircuitOpenError\'']],
      [[[String.raw`now = [0.0]
cb = CircuitBreaker(threshold=2, reset_timeout=10, clock=lambda: now[0])
calls = []
def down():
    calls.append('down')
    raise ConnectionError('service down')
def up():
    calls.append('up')
    return 'ok'
def hit(fn):
    try:
        return cb.call(fn)
    except Exception as e:
        return type(e).__name__`,
         'issubclass(CircuitOpenError, RuntimeError)',
         'hit(down)',
         'hit(down)',
         'n = len(calls)',
         'now[0] = 3',
         'hit(up)',
         'hit(up)',
         'hit(up)',
         'len(calls) == n',
         'CircuitOpenError(2.25).retry_in',
         'str(CircuitOpenError(2.25))']],
       ['True',
        '\'ConnectionError\'',
        '\'ConnectionError\'',
        '\'CircuitOpenError\'',
        '\'CircuitOpenError\'',
        '\'CircuitOpenError\'',
        'True',
        '2.25',
        '\'circuit open; retry in 2.2s\'']],
    ] },
    solution: {
      approach: `<p>A three-state machine. Expected exceptions are counted and re-raised (callers still see the real error); while open we fail fast with a custom exception carrying how long to wait. The clock is injected, so tests control time.</p>`,
      code: { lang: 'python', run: true, code: `import time


class CircuitOpenError(RuntimeError):
    def __init__(self, retry_in):
        self.retry_in = retry_in
        super().__init__(f'circuit open; retry in {retry_in:.1f}s')


class CircuitBreaker:
    def __init__(self, threshold=3, reset_timeout=30.0, clock=time.monotonic,
                 expected=(ConnectionError, TimeoutError)):
        self.threshold = threshold
        self.reset_timeout = reset_timeout
        self.clock = clock
        self.expected = expected
        self.state = 'closed'
        self.failures = 0
        self.opened_at = 0.0

    def call(self, fn, *args, **kwargs):
        if self.state == 'open':
            waited = self.clock() - self.opened_at
            if waited < self.reset_timeout:
                raise CircuitOpenError(self.reset_timeout - waited)   # fail fast
            self.state = 'half-open'                                  # allow one trial
        try:
            result = fn(*args, **kwargs)
        except self.expected:
            self._failure()
            raise                                                     # caller sees real error
        self._success()
        return result

    def _failure(self):
        self.failures += 1
        if self.state == 'half-open' or self.failures >= self.threshold:
            self.state = 'open'
            self.opened_at = self.clock()

    def _success(self):
        self.failures = 0
        self.state = 'closed'


# ---- deterministic tests with a fake clock ----
now = [0.0]
cb = CircuitBreaker(threshold=2, reset_timeout=10, clock=lambda: now[0])
calls = []

def down():
    calls.append('down')
    raise ConnectionError('service down')

def up():
    calls.append('up')
    return 'ok'

for _ in range(2):
    try:
        cb.call(down)
    except ConnectionError:
        pass
assert cb.state == 'open'

now[0] = 5
try:
    cb.call(up)
except CircuitOpenError as e:
    print('fast fail:', e, '| retry_in =', e.retry_in)
assert calls == ['down', 'down']            # fn NOT called while open

now[0] = 12
print('trial call:', cb.call(up), '| state =', cb.state)

try:
    cb.call(lambda: int('x'))               # ValueError: a bug, not counted
except ValueError:
    pass
print('after ValueError: state =', cb.state, '| failures =', cb.failures)

for t in (20, 21):                           # open again, then half-open trial fails
    now[0] = t
    try:
        cb.call(down)
    except ConnectionError:
        pass
now[0] = 32
try:
    cb.call(down)                            # half-open trial fails -> open again
except ConnectionError:
    pass
print('half-open failure -> state =', cb.state, '| opened_at =', cb.opened_at)` },
      complexity: `<p>O(1) per call, O(1) memory. All transitions tested in microseconds thanks to the injected clock.</p>`,
      followUps: ['Make it thread-safe and allow only ONE trial call in half-open when many threads arrive.', 'Use a failure-rate window (e.g. 50% of the last 20 calls) instead of consecutive failures.', 'Expose it as a decorator and emit metrics on every state change.']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'Which block runs <b>only</b> when the <code>try</code> block finished without raising?', options: ['<code>else</code>', '<code>finally</code>', '<code>except</code>', 'the code after the whole statement'], answer: 0, explain: 'else runs only on success; finally runs always; except runs only on a matching error. Code after the statement also runs after a handled error.' },
    { q: 'Predict the output: <pre>def f():\n    try:\n        return "try"\n    finally:\n        return "finally"\nprint(f())</pre>', options: ['finally', 'try', 'try then finally', 'SyntaxError'], answer: 0, explain: 'A return in finally replaces the pending return value (and would also swallow an exception). Python 3.14 warns about this (PEP 765); linters flag it.' },
    { q: 'Why does <code>except LookupError:</code> catch a <code>KeyError</code>?', options: ['KeyError is a subclass of LookupError, and except matches subclasses', 'LookupError is an alias of KeyError', 'Python tries all except clauses until one works', 'Because both end with "Error"'], answer: 0, explain: 'except X matches any exception whose class is X or inherits from X (an issubclass check on the real MRO).' },
    { q: 'Which statement about a bare <code>except:</code> is true?', options: ['It catches BaseException, including KeyboardInterrupt and SystemExit', 'It catches only Exception subclasses', 'It is a SyntaxError in Python 3', 'It catches nothing unless you name a class'], answer: 0, explain: 'Bare except is equivalent to except BaseException, so it can swallow Ctrl+C and sys.exit(). Use except Exception for a catch-all.' },
    { q: 'Predict the output: <pre>try:\n    {}["a"]\nexcept KeyError as e:\n    pass\nprint(e)</pre>', options: ['NameError: name \'e\' is not defined', "'a'", 'KeyError', 'None'], answer: 0, explain: 'Python deletes the "as" name at the end of the except block (to break the traceback → frame → e reference cycle). Using e afterwards raises NameError.' },
    { q: 'What does <code>raise ConfigError("bad") from err</code> set on the new exception?', options: ['<code>__cause__ = err</code> and <code>__suppress_context__ = True</code>', 'Only <code>__context__ = err</code>', '<code>__traceback__ = err</code>', 'Nothing; "from" is just a comment'], answer: 0, explain: 'Explicit chaining sets __cause__; the traceback then says "The above exception was the direct cause of the following exception". __context__ is still set automatically.' },
    { q: 'You check <code>os.path.exists(p)</code> and then <code>open(p)</code>. What is the risk?', options: ['A TOCTOU race: the file can disappear between check and use', 'exists() is slow', 'open() requires an absolute path', 'No risk at all'], answer: 0, explain: 'Time-Of-Check to Time-Of-Use: another process may delete or replace the file. EAFP (try open / except FileNotFoundError) is atomic.' },
    { q: 'When is LBYL (check first) usually the better choice?', options: ['When failures are frequent or the action has irreversible side effects', 'Always, because exceptions are forbidden in hot loops', 'When working with files', 'Never in Python'], answer: 0, explain: 'Raising is costly when misses are common, and you should validate before irreversible actions (sending emails, charging cards). Otherwise EAFP is idiomatic.' },
    { q: 'Predict the output: <pre>def double(x: int) -&gt; int:\n    return x * 2\nprint(double("ab"))</pre>', options: ['abab', 'TypeError', '0', 'mypy error at runtime'], answer: 0, explain: 'CPython ignores type hints at runtime. A checker like mypy would flag the call, but the interpreter just runs "ab" * 2.' },
    { q: 'Why does mypy reject passing a <code>list[int]</code> to a parameter typed <code>list[float]</code>?', options: ['list is invariant: the function could append a float into your list of ints', 'int and float are unrelated types', 'mypy does not support floats', 'Lists cannot be annotated'], answer: 0, explain: 'Mutable containers are invariant. Accept Sequence[float] (read-only, covariant) if you only read.' },
    { q: 'After <code>if x is None: return</code>, what type does mypy give <code>x: str | None</code>?', options: ['str', 'str | None', 'None', 'Any'], answer: 0, explain: 'Narrowing: the None case returned early, so only str remains for the rest of the function.' },
    { q: 'In pytest, how do you run the same test for many inputs, each reported separately?', options: ['<code>@pytest.mark.parametrize</code>', 'A for loop with assert inside one test', '<code>@pytest.fixture(scope="session")</code>', '<code>pytest.raises</code>'], answer: 0, explain: 'parametrize generates one test item per row (test_x[case-id]); a failing row does not hide the others. A plain loop stops at the first failing assert.' },
    { q: 'app.py does <code>from weather import fetch</code>. Which patch target makes <code>app.alert()</code> use the mock?', options: ['<code>patch("app.fetch")</code>', '<code>patch("weather.fetch")</code>', '<code>patch("fetch")</code>', 'Either one works'], answer: 0, explain: 'from-import copies the reference into app\'s namespace. alert() looks up fetch in app\'s globals, so patch it there: patch where it is looked up.' },
    { q: 'In a pytest fixture, where does the teardown code go?', options: ['After the <code>yield</code>', 'Before the <code>yield</code>', 'In a separate tearDown method', 'Fixtures cannot have teardown'], answer: 0, explain: 'Code before yield is setup, the yielded value goes to the test, and code after yield runs after the test (even if it failed).' },
    { q: 'What does <code>Mock(side_effect=[TimeoutError(), 42])</code> do on its first two calls?', options: ['Raises TimeoutError, then returns 42', 'Returns the list both times', 'Returns 42 both times', 'Raises TimeoutError both times'], answer: 0, explain: 'An iterable side_effect yields one item per call; exception instances are raised, other values returned.' },
    { q: 'Why use <code>autospec=True</code> when patching?', options: ['The mock copies the real signature, so wrong calls and non-existent methods fail the test', 'It makes the mock run the real code', 'It speeds up tests', 'It is required for patch to work'], answer: 0, explain: 'A plain Mock accepts any attribute and any arguments, so tests can keep passing after the real API changes. autospec enforces the real interface.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'Explain try / except / else / finally. When does each block run?', level: 'B', a: `<p><b>try</b> holds the risky code. <b>except E</b> runs only if an exception of type E (or a subclass) was raised inside try — the first matching clause wins. <b>else</b> runs only if try finished <b>without</b> an exception; it keeps follow-up code out of the protected zone so the except does not accidentally catch its errors. <b>finally</b> runs <b>always</b> — success, handled error, unhandled error, return, break — and is for cleanup. Order: try → (one except or else) → finally → then the pending return/exception continues. A <code>with</code> statement is usually a cleaner packaged try/finally.</p>`, followUps: ['What happens if finally contains a return?', 'Does finally run on os._exit() or SIGKILL?', 'Why keep the try block small?'] },
    { q: 'What is the difference between Exception and BaseException? Why is a bare except bad?', level: 'B', a: `<p><code>BaseException</code> is the root of all exceptions. Its direct children include <code>SystemExit</code> (sys.exit), <code>KeyboardInterrupt</code> (Ctrl+C), <code>GeneratorExit</code> and <code>Exception</code>. Everything that is a normal "error" inherits from <code>Exception</code>. A bare <code>except:</code> means <code>except BaseException</code>, so it swallows Ctrl+C and sys.exit() (programs that cannot be stopped) and hides bugs like NameError. If you need a catch-all at a boundary, use <code>except Exception</code>, log with the traceback, and usually re-raise. Similarly, <code>asyncio.CancelledError</code> is a BaseException so normal handlers do not swallow task cancellation.</p>`, followUps: ['Which exceptions inherit from LookupError and OSError?', 'Why did CancelledError move to BaseException in 3.8?'] },
    { q: 'How do you design custom exceptions for a library?', level: 'I', a: `<p>Create one public base class per package (<code>class PaymentError(Exception)</code>) so callers can catch everything from you in one clause, then specific subclasses only for cases a caller can act on differently (<code>CardDeclinedError</code>, <code>InsufficientFundsError</code>). Name them <code>…Error</code>, store useful data as attributes (amount, field, status code) and pass a readable message to <code>super().__init__</code>. Use multiple inheritance to fit existing families (<code>InvalidAmountError(PaymentError, ValueError)</code>). Translate low-level errors at your boundary with <code>raise MyError(...) from e</code> so the root cause is preserved. Keep them picklable (args matching the constructor) so they survive multiprocessing, and never put secrets in messages.</p>`, followUps: ['How many exception classes is too many?', 'Why might unpickling a custom exception fail?', 'Should the base class subclass Exception or RuntimeError?'] },
    { q: 'Explain exception chaining: raise from, __cause__, __context__ and from None.', level: 'I', a: `<p>When you raise inside an except block, Python automatically stores the exception being handled in the new one's <code>__context__</code>; the traceback shows both with "During handling of the above exception, another exception occurred" — which reads like a bug in the handler. <code>raise New(...) from e</code> sets <code>__cause__ = e</code> (and <code>__suppress_context__ = True</code>), and the traceback says "The above exception was the direct cause of…", signalling a deliberate translation. <code>raise New(...) from None</code> suppresses the context display entirely — useful when the low-level error is noise (e.g. a KeyError behind an AttributeError in <code>__getattr__</code>). Since 3.11 you can also add context with <code>e.add_note(...)</code> and re-raise.</p>`, followUps: ['When would you use from None in real code?', 'What is printed first in a chained traceback?'] },
    { q: 'EAFP vs LBYL — which is more Pythonic and when would you choose the other?', level: 'I', a: `<p><b>EAFP</b> (try the operation, catch the specific failure) is the Python default: it avoids TOCTOU races (the operation itself is the check), uses the real operation's rules instead of re-implementing them (isdigit ≠ int()), supports duck typing, and since 3.11 a try costs nothing unless something is raised. <b>LBYL</b> wins when failures are <b>common</b> (raising + catching is roughly 5–15× a dict lookup), when the action is <b>irreversible</b> (validate the whole batch before sending emails), or when a check is required for security/business rules. Often the best answer is neither: <code>dict.get</code>, <code>setdefault</code>, <code>defaultdict</code>, <code>getattr(o, n, None)</code>, <code>os.makedirs(exist_ok=True)</code>.</p>`, followUps: ['Show a TOCTOU bug with files and fix it.', 'Why can hasattr hide bugs?', 'Is d[k] += 1 atomic across threads?'] },
    { q: 'Do type hints affect runtime behaviour or performance in CPython?', level: 'B', a: `<p>Mostly no. CPython evaluates annotations (lazily from 3.14) and stores them in <code>__annotations__</code>, but never checks arguments against them and does not run faster because of them. They are consumed by tools: type checkers (mypy, pyright) and IDEs before runtime, and by libraries at runtime that read them on purpose — dataclasses (fields), pydantic/FastAPI (validation and parsing), functools.singledispatch, typer. Compilers like mypyc and Cython can use them to generate faster code. For untrusted input you still need runtime validation; <code>isinstance(x, list[int])</code> even raises TypeError.</p>`, followUps: ['What does from __future__ import annotations change?', 'How does FastAPI use your annotations?'] },
    { q: 'What is the difference between Any and object in type hints?', level: 'I', a: `<p><code>Any</code> switches type checking off: every operation on an Any value is allowed, and Any is compatible in both directions with every type, so it silently spreads through code. <code>object</code> is the top type: any value can be <b>assigned</b> to it, but you can only use operations every object supports (<code>str()</code>, <code>==</code>, <code>hash</code>) until you narrow it with isinstance. Use <code>object</code> for "I accept anything and will check it", Any only as a last-resort escape hatch at untyped boundaries. Under --strict, <code>warn_return_any</code> and <code>disallow_any_*</code> flags help contain Any.</p>`, followUps: ['Where does Any sneak in without you writing it?', 'How do you type json.loads results safely?'] },
    { q: 'Explain variance with list[int] vs Sequence[float].', level: 'A', a: `<p>An int is acceptable where a float is expected, but <code>list[int]</code> is <b>not</b> a <code>list[float]</code>: a function taking list[float] may <b>append</b> 3.14, corrupting your list of ints. Mutable generics are therefore <b>invariant</b>. Read-only generics like <code>Sequence[T]</code>, <code>Iterable[T]</code>, <code>tuple[T, ...]</code> and Mapping values are <b>covariant</b>: Sequence[int] is a Sequence[float] because nothing can be written. Callables are <b>contravariant</b> in their arguments: a function accepting float can be used where a function accepting int is required. Practical rule: accept the most abstract read-only type you need (Iterable, Sequence, Mapping) and return concrete types.</p>`, followUps: ['How do you declare a covariant TypeVar?', 'Why is dict invariant in its key type?'] },
    { q: 'How would you introduce type checking into a large untyped codebase?', level: 'A', a: `<p>Gradually. 1) Add mypy (or pyright) to CI with a permissive config so it passes, possibly with a baseline of known errors. 2) Require annotations for new and changed code (<code>disallow_untyped_defs</code> per module via <code>[[tool.mypy.overrides]]</code>). 3) Type the most-imported modules and the boundaries first (API schemas with pydantic/TypedDict, DB layer), because they give the most inference downstream. 4) Install stubs (<code>types-*</code>) or write <code>.pyi</code> for key untyped libraries; ignore_missing_imports only per module. 5) Turn on <code>strict</code> package by package; enable <code>warn_unused_ignores</code>. 6) Track metrics: % typed functions, number of Any/ignores. Use tools like MonkeyType or AI assistants to draft annotations, and always review them.</p>`, followUps: ['mypy or pyright for CI?', 'How do you handle a library with no stubs?'] },
    { q: 'unittest vs pytest: what are the differences and which would you pick?', level: 'B', a: `<p><b>unittest</b> is in the standard library, xUnit style: <code>TestCase</code> classes, <code>self.assert*</code> methods, setUp/tearDown, subTest. <b>pytest</b> is third-party but the de-facto standard: plain functions with <code>assert</code> (rewritten to show values on failure), powerful <b>fixtures</b> with scopes and dependency injection, <code>parametrize</code>, markers, rich plugins (coverage, xdist, asyncio, hypothesis), better filtering (<code>-k</code>, <code>--lf</code>). pytest can run unittest suites unchanged, so migration is incremental. Pick pytest for new projects; unittest when no third-party dependencies are allowed (some stdlib-only environments). Both use <code>unittest.mock</code> for mocking.</p>`, followUps: ['How does pytest show values in a failing assert?', 'How do you test that an exception message matches?'] },
    { q: 'Explain pytest fixture scopes and how teardown works.', level: 'I', a: `<p>A fixture is a function decorated with <code>@pytest.fixture</code>; tests request it by parameter name and pytest injects the value (dependency injection, recursively). Scope decides how long one instance lives: <b>function</b> (default, fresh per test), <b>class</b>, <b>module</b>, <b>package</b>, <b>session</b> (once per run, or per worker with xdist). Fixtures that <code>yield</code> run setup before the yield and teardown after it — even if the test failed — and pytest tears down in <b>reverse</b> order of setup. A wider-scoped fixture cannot depend on a narrower one (ScopeMismatch). Typical pattern: session-scoped DB container + function-scoped fixture that opens a transaction and rolls it back, giving fast and isolated tests. Shared fixtures live in <code>conftest.py</code>.</p>`, followUps: ['What does autouse do and when is it dangerous?', 'How do you parametrize a fixture?', 'What changes with pytest-xdist?'] },
    { q: 'What does "patch where it is looked up, not where it is defined" mean?', level: 'I', a: `<p><code>mock.patch("a.b.name")</code> temporarily rebinds the attribute <code>name</code> on module <code>a.b</code>. If <code>app.py</code> did <code>from weather import fetch</code>, then <code>app</code> holds its <b>own</b> reference called <code>fetch</code>; patching <code>weather.fetch</code> leaves app's reference pointing at the real function, so the test still makes a real call. You must patch <code>app.fetch</code>, the namespace where the code under test looks the name up. If app instead does <code>import weather</code> and calls <code>weather.fetch()</code>, the lookup goes through the module attribute and patching <code>weather.fetch</code> works. Dependency injection avoids the whole issue.</p>`, followUps: ['How do you patch a method for all instances of a class?', 'How do you patch builtins.open?'] },
    { q: 'When is mocking harmful? How do you avoid over-mocking?', level: 'A', a: `<p>Mocks verify that your code calls collaborators in a certain way — they do not verify that the real system works. Over-mocking (mocking your own internal classes, mocking every call) produces tests that mirror the implementation, break on every refactor, and still pass when the real wiring is broken. Guidelines: mock only at <b>boundaries you do not own</b> or that are slow/non-deterministic (network, clock, randomness, payment, email); prefer <b>fakes</b> (in-memory repository, SQLite, local test server) and real objects otherwise; use <code>autospec</code> so mocks match real signatures; assert on <b>outcomes</b> more than on calls; back unit tests with a few integration tests (e.g. Testcontainers) that use the real dependency.</p>`, followUps: ['Difference between a stub, a fake, a spy and a mock?', 'How would you test code that calls an LLM API?'] },
    { q: 'How do you test code that depends on time, randomness or the network deterministically?', level: 'A', a: `<p>Make the non-determinism an <b>input</b>. Time: inject a clock function (<code>now=time.monotonic</code>) or patch it / use <code>freezegun</code>/<code>time-machine</code>; inject <code>sleep</code> so backoff code runs instantly. Randomness: pass a <code>random.Random(seed)</code> instance rather than using the global module. Network: mock at the client boundary (<code>unittest.mock</code>, <code>responses</code>/<code>respx</code> for HTTP), use recorded cassettes (VCR) for realism, and keep a separate, explicitly-marked integration suite against real services. Also isolate the filesystem (<code>tmp_path</code>) and environment (<code>monkeypatch.setenv</code>), and run tests in random order (<code>pytest-randomly</code>) and in parallel to expose hidden coupling.</p>`, followUps: ['How do you test a retry with exponential backoff in milliseconds?', 'How do you find which test leaks state into another?'] },
    { q: 'What is ExceptionGroup / except* and where does it appear in practice?', level: 'E', a: `<p>Added in Python 3.11 (PEP 654). <code>ExceptionGroup(msg, [e1, e2, …])</code> carries several unrelated exceptions at once — needed when concurrent tasks fail independently or when validation should report every problem. <code>except* T</code> matches the members of type T inside the group (it calls <code>group.split(T)</code>), runs its handler with a sub-group, and lets the unmatched rest continue; several except* clauses can run for one raise. You cannot mix except and except* in one try, and a plain <code>except ValueError</code> does <b>not</b> match a group containing ValueErrors. In practice it comes from <code>asyncio.TaskGroup</code>, Trio/anyio nurseries, <code>concurrent.futures</code> wrappers and batch validators, which is why adopting TaskGroup can change what callers must catch.</p>`, followUps: ['How do BaseExceptionGroup and ExceptionGroup differ?', 'How would you log every exception inside a nested group?'] }
  );

  registerModule({
    id: 'py09',
    title: 'Errors, Type Hints & Testing',
    intro: `<p>Real Python code spends a surprising amount of its life <b>going wrong</b> — missing keys, bad input, dead networks — and the difference between a junior and a senior engineer is how calmly their code (and their tests) handle it. This module covers the three skills that make Python code <b>trustworthy</b>:</p>
<ul>
<li>🧯 <b>Errors:</b> how exceptions travel up the call stack, the exception family tree, raising and designing your own exceptions, chaining with <code>raise … from</code>, ExceptionGroups, and the Pythonic EAFP vs LBYL debate.</li>
<li>🏷️ <b>Type hints:</b> the typing vocabulary (unions, generics, Protocol, TypedDict, Literal), what mypy actually checks, narrowing, variance, and gradual adoption — without forgetting that Python ignores hints at runtime.</li>
<li>🧪 <b>Testing:</b> unittest vs pytest, parametrized test tables, fixtures with setup/teardown and scopes, and mocking with <code>unittest.mock</code> — including the famous "patch where it is looked up" rule.</li>
</ul>
<p>Every topic has a step-by-step visualizer (watch an exception unwind the stack, a fixture stack build and tear down, mypy narrow a type line by line), runnable examples, "predict the output" puzzles, and AI-era advice: in 2026, tests and type checkers are how you <b>verify</b> code that an assistant wrote.</p>`,
    goals: [
      'Predict exactly which of try / except / else / finally run, and in what order, including returns inside finally and errors raised inside handlers',
      'Choose the right exception class from the built-in hierarchy, order except clauses correctly, and design a custom exception hierarchy with attributes and <code>raise … from</code>',
      'Decide between EAFP and LBYL from hit rate, race conditions and side effects, and spot TOCTOU bugs',
      'Write precise type hints (unions, generics, Protocol, TypedDict, Literal), read mypy errors, use narrowing instead of cast, and explain variance',
      'Write table-driven tests in unittest and pytest, test exceptions precisely, and explain why a test suite is (or is not) catching bugs',
      'Use fixtures (scopes, yield teardown) and mocks (return_value, side_effect, autospec, patch targets) to test code with databases, clocks and networks deterministically'
    ],
    prereqs: `Python modules 1–8, especially <b>Closures, Decorators &amp; functools</b> (for retry decorators and fixtures as decorators), <b>Iterators, Generators &amp; Context Managers</b> (yield fixtures, __enter__/__exit__) and <b>Advanced OOP</b> (inheritance and MRO behind the exception hierarchy).`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
