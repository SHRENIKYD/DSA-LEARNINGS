(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (py06) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  // code part with highlighted lines: hl may be a line number or {line: cls}
  function cp(code, hl, cls, label) {
    var h = {};
    if (typeof hl === 'number') h[hl] = cls || 'cur';
    else if (hl && typeof hl === 'object') h = hl;
    return { type: 'code', label: label || 'Python code (current line highlighted)', lang: 'python', code: code, hl: h };
  }
  function vp(vals, hl, label) {
    var v = {}, h = {};
    Object.keys(vals).forEach(function (k) { v[k] = String(vals[k]); });
    if (typeof hl === 'string') String(hl).split(',').forEach(function (k) { if (k) h[k] = 'ok'; });
    else if (hl) h = hl;
    return { type: 'vars', label: label || 'Variables', vals: v, hl: h };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function words(s) { return String(s || '').trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }
  function copyObj(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }
  /* ================= TOPIC 1: First-class functions ================= */
  topics.push({
    title: 'First-Class Functions: Functions Are Just Objects',
    analogy: `<p>Think of a <b>TV remote</b>. The remote is a thing you can hold, hand to a friend, put in a drawer, or label "living room". Pressing the button is a separate act. A Python function is the same: <code>greet</code> is the <b>remote</b> (an object you can pass around, store in a list or dict, give a new name), and <code>greet()</code> — with parentheses — is <b>pressing the button</b>. Most beginner bugs here come from mixing up "handing over the remote" with "pressing it".</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In Python, <b>functions are objects</b>, exactly like ints, strings and lists. "First-class" means you can do everything with a function that you can do with any other value:</p>
<ul>
<li><b>Name it</b>: <code>say = print</code> — now <code>say('hi')</code> works.</li>
<li><b>Store it</b> in a list or dict: <code>ops = {'add': add, 'mul': mul}</code>.</li>
<li><b>Pass it</b> as an argument: <code>sorted(words, key=len)</code> — we hand over <code>len</code> without calling it.</li>
<li><b>Return it</b> from another function: a "function factory" like <code>make_multiplier(3)</code>.</li>
</ul>
<p><b>Parentheses are the difference.</b> <code>len</code> is the function object. <code>len('abc')</code> calls it and gives <code>3</code>. Writing <code>key=len()</code> by mistake calls it immediately (and crashes); <code>key=len</code> hands it over to be called later.</p>
${H.table(['You write', 'What it means', 'Result'], [['<code>f</code>', 'the function object itself', '<code>&lt;function f at 0x…&gt;</code>'], ['<code>f()</code>', 'call it now', 'whatever f returns'], ['<code>g = f</code>', 'second name, same object', '<code>g is f</code> → True'], ['<code>apply(f, 3)</code>', 'pass the object in', 'apply decides when to call']])}
<p><b>Higher-order function</b> = a function that takes a function, returns a function, or both. Built-in examples: <code>sorted(key=…)</code>, <code>min/max(key=…)</code>, <code>map</code>, <code>filter</code>, and later <code>functools.reduce</code> and every decorator.</p>
<p><b>lambda</b> makes a tiny <b>anonymous</b> function in one expression: <code>lambda x: x * 2</code>. It can only hold a single expression (no statements, no assignments). Use it for short keys and callbacks; give anything bigger a real <code>def</code> with a name.</p>
<p><b>Dispatch table.</b> Instead of a long <code>if cmd == 'add' … elif cmd == 'sub' …</code>, put functions in a dict and look them up: <code>OPS[cmd](a, b)</code>. It is O(1), shorter, and you can add new commands without touching the lookup code.</p>
<p><b>Functions carry data too.</b> A function object has attributes: <code>__name__</code>, <code>__doc__</code>, <code>__defaults__</code>, <code>__code__</code>, and you may even attach your own (<code>f.calls = 0</code>). Default argument values are evaluated <b>once</b>, when <code>def</code> runs — the source of the famous mutable-default bug.</p>`,
    clues: [
      '"pass a function as a parameter" / "callback" / "strategy" → first-class functions; hand over <code>f</code>, not <code>f()</code>',
      '"sort by length / by second element / by multiple keys" → <code>sorted(..., key=lambda x: (…))</code>',
      '"replace a long if/elif chain on a command name" → <b>dict of functions</b> (dispatch table)',
      '"return a function" / "function factory" / "configure once, call many times" → higher-order function (and usually a closure)',
      '"TypeError: \'int\' object is not callable" → you shadowed a function name with a value, or called the result twice',
      '"default list keeps growing between calls" → defaults are evaluated once at <code>def</code> time'
    ],
    code: [{ lang: 'python', run: true, title: 'Functions as values: name, store, pass, return', code: `def shout(text):
    """Return text in upper case with an exclamation mark."""
    return text.upper() + '!'

def whisper(text):
    return text.lower() + '...'

# 1) A second name for the same object (no call, no parentheses)
yell = shout
print(yell is shout, yell.__name__)        # True shout

# 2) Store functions in a list and loop over them
for style in [shout, whisper]:
    print(style.__name__, '->', style('Hello'))

# 3) Pass a function into another function (higher-order)
def apply_twice(func, value):
    return func(func(value))

print(apply_twice(lambda n: n * 3, 2))     # 2*3*3 = 18

# 4) Return a function from a function (a factory)
def make_greeter(greeting):
    def greeter(name):
        return f'{greeting}, {name}'
    return greeter

hi = make_greeter('Hi')
print(hi('Asha'), '|', make_greeter('Namaste')('Ravi'))` },
    { lang: 'python', run: true, title: 'Dispatch table instead of if/elif', code: `import operator

# Map a command word to a function object (operator.add is just a function)
OPS = {
    'add': operator.add,
    'sub': operator.sub,
    'mul': operator.mul,
    'max': max,
}

def run(command):
    name, a, b = command.split()
    func = OPS.get(name)               # look up the object, do NOT call yet
    if func is None:
        return f'unknown command {name!r}'
    return func(int(a), int(b))        # now press the button

for cmd in ['add 3 4', 'mul 2 5', 'max 9 1', 'pow 2 3']:
    print(cmd, '=>', run(cmd))` }],
    codeTitle: ['Functions are values', 'Dict of functions'],
    viz: [{
      title: 'Dispatch table: look up a function object, then call it',
      input: 'add 3 4; mul 2 5; sub 9 1; pow 2 3',
      inputLabel: 'commands "op a b" separated by ; (ops: add sub mul max min)',
      gen: function (input) {
        var cmds = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!cmds.length) throw new Error('Enter commands like: add 3 4; mul 2 5');
        if (cmds.length > 6) throw new Error('Use at most 6 commands');
        var impl = { add: function (a, b) { return a + b; }, sub: function (a, b) { return a - b; }, mul: function (a, b) { return a * b; }, max: function (a, b) { return Math.max(a, b); }, min: function (a, b) { return Math.min(a, b); } };
        var entries = [['add', '<function add>'], ['sub', '<function sub>'], ['mul', '<function mul>'], ['max', '<built-in max>'], ['min', '<built-in min>']];
        var code = ['OPS = {"add": add, "sub": sub, "mul": mul,', '       "max": max, "min": min}', 'def run(cmd):', '    name, a, b = cmd.split()', '    func = OPS.get(name)      # object, not a call', '    if func is None:', '        return "unknown"', '    return func(int(a), int(b))  # call now'].join('\n');
        var frames = [], results = [];
        frames.push(fr('We build a dict whose <b>values are function objects</b>. Notice: <code>add</code>, not <code>add()</code> — nothing is called yet. The dict just holds five "remotes".', [cp(code, { 1: 'ok', 2: 'ok' }), { type: 'map', label: 'OPS (str → function object)', entries: entries }]));
        cmds.forEach(function (c) {
          var p = c.split(/\s+/);
          if (p.length !== 3 || isNaN(Number(p[1])) || isNaN(Number(p[2]))) throw new Error('Each command must look like: add 3 4');
          var name = p[0], a = parseInt(p[1], 10), b = parseInt(p[2], 10), f = impl[name];
          var hl = {}; if (f) hl[name] = 'cur';
          frames.push(fr('<code>run("' + esc(c) + '")</code>: split into name=<b>' + esc(name) + '</b>, a=' + a + ', b=' + b + '. Now <code>OPS.get("' + esc(name) + '")</code> looks up the object in O(1).', [cp(code, 4), { type: 'map', label: 'OPS', entries: entries, hl: hl }, vp({ name: "'" + name + "'", a: "'" + a + "'", b: "'" + b + "'" }, 'name')]));
          if (!f) {
            results.push([c, 'unknown']);
            frames.push(fr('No key <b>' + esc(name) + '</b> in the dict, so <code>.get</code> returns <b>None</b>. We return a friendly message instead of crashing with <code>KeyError</code> or <code>TypeError: \'NoneType\' object is not callable</code>.', [cp(code, { 6: 'bad', 7: 'bad' }), vp({ func: 'None' }, { func: 'bad' }), { type: 'table', label: 'results', columns: ['command', 'result'], rows: results.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[results.length - 1] = 'bad'; return h; })() }]));
          } else {
            var r = f(a, b);
            results.push([c, String(r)]);
            frames.push(fr('<code>func</code> now names the same object as <code>OPS["' + esc(name) + '"]</code>. The parentheses in <code>func(' + a + ', ' + b + ')</code> press the button → <b>' + r + '</b>.', [cp(code, 8, 'ok'), { type: 'stack', label: 'call stack', items: ['<module>', 'run("' + esc(c) + '")', name + '(' + a + ', ' + b + ')'], hl: { 2: 'cur' } }, vp({ func: '<function ' + name + '>', result: r }, 'result'), { type: 'table', label: 'results', columns: ['command', 'result'], rows: results.map(function (x) { return x.slice(); }), hl: (function () { var h = {}; h[results.length - 1] = 'ok'; return h; })() }]));
          }
        });
        frames.push(fr('Adding a new command is one dict line — the <code>run</code> function never changes. That is the <b>open/closed</b> benefit of treating functions as data.', [{ type: 'table', label: 'all results', columns: ['command', 'result'], rows: results }, tx('Compare: an if/elif chain checks commands one by one (O(k)); the dict jumps straight to the right function (O(1)).', 'why it matters')]));
        return frames;
      }
    }, {
      title: 'sorted(words, key=len): Python calls YOUR function for each item',
      input: 'banana kiwi apple fig cherry',
      inputLabel: 'words separated by spaces',
      gen: function (input) {
        var w = words(input);
        if (w.length < 2) throw new Error('Enter at least 2 words');
        if (w.length > 10) throw new Error('Use at most 10 words');
        var frames = [], keys = [];
        var code = 'words = ' + JSON.stringify(w).replace(/"/g, "'").replace(/,/g, ', ') + '\nresult = sorted(words, key=len)   # pass len, do not call it\nprint(result)';
        frames.push(fr('We pass the function object <code>len</code> as <code>key</code>. <code>sorted</code> will call it once per item ("decorate"), then sort by those keys.', [cp(code, 2), { type: 'array', label: 'words', values: w.slice() }]));
        for (var i = 0; i < w.length; i++) {
          keys.push(w[i].length);
          var h = {}; h[i] = 'cur';
          frames.push(fr('sorted calls <code>len(\'' + esc(w[i]) + '\')</code> → <b>' + w[i].length + '</b>. Each key is computed exactly once.', [{ type: 'array', label: 'words', values: w.slice(), hl: h }, { type: 'bars', label: 'keys computed so far: len(word)', values: keys.slice(), texts: w.slice(0, keys.length) }]));
        }
        var idx = w.map(function (x, k) { return k; }).sort(function (a, b) { return (w[a].length - w[b].length) || (a - b); });
        var sw = idx.map(function (k) { return w[k]; }), sk = idx.map(function (k) { return w[k].length; });
        frames.push(fr('Now sort by the keys. Python\'s sort is <b>stable</b>: words with equal length keep their original order.', [{ type: 'bars', label: 'keys after sorting', values: sk, texts: sw }, { type: 'array', label: 'result', values: sw, hl: { 0: 'ok' } }]));
        frames.push(fr('Output: <code>' + esc(JSON.stringify(sw).replace(/"/g, "'")) + '</code>. Change the key to <code>lambda s: (-len(s), s)</code> to get longest first, ties alphabetical.', [cp(code, 3, 'sel'), tx('<code>' + esc(JSON.stringify(sw).replace(/"/g, "'")) + '</code>', 'stdout')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Calling vs referencing: the classic TypeError', html: `<p>If you write <code>key=len()</code> Python calls <code>len</code> right away with no argument → <code>TypeError</code>. If you accidentally rebind a function name to a value (<code>max = 10</code>), later calls give <i>"'int' object is not callable"</i>.</p>`, code: { lang: 'python', run: true, code: `words = ['pear', 'fig', 'banana']
print(sorted(words, key=len))          # correct: pass the object

try:
    sorted(words, key=len())           # calls len() immediately
except TypeError as e:
    print('TypeError:', e)

total = sum                            # alias is fine
print(total([1, 2, 3]))
sum = 10                               # shadowing the builtin...
try:
    print(sum([1, 2]))
except TypeError as e:
    print('TypeError:', e)
del sum                                # remove our global; builtin visible again
print(sum([1, 2]))` } },
      { title: 'map / filter vs comprehensions', html: `<p><code>map(f, xs)</code> calls <code>f</code> on each item; <code>filter(pred, xs)</code> keeps items where <code>pred</code> is truthy. Both return <b>lazy iterators</b>. In modern Python a comprehension is usually clearer; <code>map</code> shines when you already have a named function.</p>`, code: { lang: 'python', run: true, code: `nums = [3, -1, 4, -1, 5]
print(list(map(abs, nums)))                     # reuse a named function
print(list(filter(lambda n: n > 0, nums)))      # lambda predicate
print([n * n for n in nums if n > 0])           # comprehension: often clearest

m = map(str, nums)          # lazy: nothing computed yet
print(next(m), next(m))     # pulls two items
print(list(m))              # the rest - an iterator is used up once` } },
      { title: 'Sorting records with key functions', html: `<p>A key function turns each record into something comparable. Return a <b>tuple</b> to sort by several fields; negate numbers for descending order on one field only.</p>`, code: { lang: 'python', run: true, code: `from operator import itemgetter

people = [('Asha', 31), ('Ben', 25), ('Chen', 31), ('Dev', 25)]
# age descending, then name ascending
print(sorted(people, key=lambda p: (-p[1], p[0])))
# itemgetter(1) is a ready-made key function: p -> p[1]
print(sorted(people, key=itemgetter(1)))
oldest = max(people, key=itemgetter(1))
print('oldest:', oldest)` } },
      { title: 'Mutable default argument: evaluated once at def time', html: `<p>The default <code>[]</code> is created <b>once</b>, when <code>def</code> runs, and stored on the function in <code>__defaults__</code>. Every call that uses the default shares that same list. Use <code>None</code> as a sentinel instead.</p>`, code: { lang: 'python', run: true, code: `def add_bad(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add_bad('a'))           # ['a']
print(add_bad('b'))           # ['a', 'b']  <- surprise, same list
print(add_bad.__defaults__)   # (['a', 'b'],) the shared object

def add_good(item, bucket=None):
    if bucket is None:        # fresh list on every call
        bucket = []
    bucket.append(item)
    return bucket

print(add_good('a'), add_good('b'))` } }
    ],
    deepDive: `<p>🟣 <b>What a function object really is.</b> <code>def</code> is an <i>executable statement</i>: when Python reaches it, it builds a <code>function</code> object from a pre-compiled <b>code object</b> (<code>f.__code__</code>: bytecode, constants, local names) plus runtime context: <code>__globals__</code> (the module dict it will look names up in), <code>__defaults__</code> / <code>__kwdefaults__</code> (evaluated now, once), <code>__closure__</code> (captured cells — next topics) and <code>__annotations__</code>. Two <code>def</code> runs of the same source give two different function objects sharing one code object.</p>
<p><b>Callables beyond functions.</b> Anything with <code>__call__</code> is callable: classes (calling one builds an instance), bound methods (<code>obj.method</code> packs <code>self</code> in), <code>functools.partial</code> objects, and your own classes. <code>callable(x)</code> tells you. "Duck typing" means higher-order code should accept <i>any</i> callable, not only <code>def</code> functions.</p>
<p><b>Bound methods are created on attribute access.</b> <code>m1 = obj.f; m2 = obj.f</code> gives <code>m1 == m2</code> but <code>m1 is not m2</code>. Storing <code>obj.method</code> as a callback keeps <code>obj</code> alive (a common source of memory leaks in event systems — <code>weakref.WeakMethod</code> exists for this).</p>
<p><b>lambda limits are a feature.</b> A lambda's <code>__name__</code> is <code>'&lt;lambda&gt;'</code>, which makes tracebacks and logs less useful, and PEP 8 says not to assign a lambda to a name (<code>f = lambda x: …</code>) — use <code>def</code>. <code>operator.itemgetter</code>, <code>attrgetter</code> and <code>methodcaller</code> are faster C-implemented keys that also pickle cleanly (lambdas do not pickle, which matters for <code>multiprocessing</code>).</p>
<p><b>Performance.</b> A Python-level call costs roughly tens of nanoseconds in 3.11+ (the "faster CPython" work made calls much cheaper and 3.13/3.14 continue that), but in a hot loop over millions of items, <code>sorted(key=…)</code> is still much faster than <code>cmp_to_key</code> because the key is computed once per item (N calls) instead of once per comparison (≈ N log N calls).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate callbacks, key functions and dispatch tables in seconds, and modern AI SDKs are built on first-class functions: you register Python functions as <b>tools</b>, and the framework reads <code>__name__</code>, <code>__doc__</code> and type hints to build the JSON schema the model sees.</p>
<p><b>Use AI as a partner:</b> ask <code>"Rewrite this 12-branch if/elif on command names as a dict dispatch, keep the error message for unknown commands"</code>, or <code>"Give me tricky inputs for this sort key: ties, negatives, None values"</code>.</p>
<p><b>Where AI goes wrong:</b> it writes <code>key=len()</code>-style calls inside callback registrations (e.g. <code>button.on_click(handler())</code>), assigns lambdas to names, uses mutable default arguments in "helper" functions, and sorts with a lambda that crashes on <code>None</code>.</p>
<p><b>What you must still own:</b> the reference-vs-call distinction, predicting what <code>__defaults__</code> holds, and choosing between a named function, a lambda, and an <code>operator</code> helper for clarity and picklability.</p>`,
    problems: [{
      title: 'Calculator with a Dispatch Table', level: 'Easy', tags: ['first-class functions', 'dict', 'dispatch'], companies: ['Amazon', 'Flipkart', 'Zoho'],
      statement: `<p>Write <code>evaluate(commands)</code>. Each command is a string <code>"op a b"</code> where <code>op</code> is one of <code>add</code>, <code>sub</code>, <code>mul</code>, <code>div</code> (integer floor division) and <code>a</code>, <code>b</code> are integers. Return a list of results. For an unknown op return the string <code>'error'</code>; for division by zero also return <code>'error'</code>. Do <b>not</b> use an if/elif chain on the op name.</p>`,
      constraints: `1 ≤ len(commands) ≤ 10<sup>5</sup>; |a|, |b| ≤ 10<sup>9</sup>`,
      example: `<p>Input <code>["add 2 3", "div 7 2", "pow 2 3", "div 1 0"]</code> → ${H.c('g', '[5, 3, \'error\', \'error\']')}. <code>pow</code> is not in the table and <code>1 // 0</code> raises <code>ZeroDivisionError</code>, which we turn into 'error'.</p>`,
      brute: { why: `<p>An if/elif ladder works but checks op names one by one (O(k) per command), duplicates the parse/convert code in every branch, and must be edited every time a new op is added.</p>`, code: `def evaluate(commands):
    out = []
    for c in commands:
        op, a, b = c.split()
        a, b = int(a), int(b)
        if op == 'add':
            out.append(a + b)
        elif op == 'sub':
            out.append(a - b)
        elif op == 'mul':
            out.append(a * b)
        elif op == 'div':
            out.append(a // b if b != 0 else 'error')
        else:
            out.append('error')
    return out` },
      mcq: { q: 'What should the dict values be?', options: ['Function objects like <code>operator.add</code>', 'The results of calling <code>operator.add()</code>', 'Strings like <code>"a + b"</code> to pass to eval'], answer: 0, explain: 'Store the remotes, not the button presses. Calling while building the dict fails (no arguments yet), and eval on strings is unsafe and slow.' },
      hints: [`<p>Hint 1: The op name is just a key. A dict can map that key straight to the function that does the work.</p>`, `<p>Hint 2: Use <code>operator.add</code>, <code>operator.sub</code>, <code>operator.mul</code>, <code>operator.floordiv</code>, and <code>OPS.get(op)</code> which returns None for unknown keys.</p>`, `<p>Hint 3: Edge cases: unknown op → 'error'; division by zero → catch <code>ZeroDivisionError</code>. Recipe: split, look up, if None append 'error', else try call and append result.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [['evaluate([\'add 2 3\', \'div 7 2\', \'pow 2 3\', \'div 1 0\'])'], [5, 3, 'error', 'error']],
          [
            ['evaluate([\'div -7 2\', \'div 7 -2\', \'div -7 -2\', \'div 0 5\', \'div 0 0\'])'],
            [-4, -4, 3, 0, 'error']
          ],
          [
            ['evaluate([\'mul 1000000000 1000000000\', \'sub 0 1000000000\', \'add -1000000000 -1000000000\'])'],
            ['1000000000000000000', -1000000000, -2000000000]
          ],
          [['evaluate([\'ADD 1 2\', \'Add 1 2\', \'mod 5 3\', \'div 5 2\'])'], ['error', 'error', 'error', 2]],
          [['evaluate([\'sub 5 8\'])'], [-3]],
          [['evaluate([\'mul 0 7\', \'mul -3 4\', \'mul -3 -4\'])'], [0, -12, 12]],
          [
            ['(lambda r: [len(r), r[0], r[-1], sorted(set(r))])(evaluate([\'add 1 2\'] * 100000))'],
            [100000, 3, 3, [3]]
          ],
          [['evaluate([\'div 1000000000 -1000000000\', \'div -1000000000 3\'])'], [-1, -333333334]]
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
        approach: `<p>Build the table once at module level. For each command: split, look up the function object in O(1), call it inside a <code>try</code> so division by zero becomes <code>'error'</code>. Adding an op later is a one-line change.</p>`,
        code: { lang: 'python', run: true, code: `import operator

OPS = {
    'add': operator.add,
    'sub': operator.sub,
    'mul': operator.mul,
    'div': operator.floordiv,   # integer floor division, like //
}

def evaluate(commands):
    out = []
    for c in commands:
        op, a, b = c.split()
        func = OPS.get(op)                 # function object or None
        if func is None:
            out.append('error')
            continue
        try:
            out.append(func(int(a), int(b)))
        except ZeroDivisionError:
            out.append('error')
    return out

print(evaluate(['add 2 3', 'div 7 2', 'pow 2 3', 'div 1 0']))` },
        dry: { head: ['command', 'OPS.get(op)', 'call', 'out'], rows: [['add 2 3', 'operator.add', 'add(2, 3) = 5', '[5]'], ['div 7 2', 'operator.floordiv', '7 // 2 = 3', '[5, 3]'], ['pow 2 3', '<span class="c-r">None</span>', '—', "[5, 3, 'error']"], ['div 1 0', 'operator.floordiv', '<span class="c-r">ZeroDivisionError</span>', "[5, 3, 'error', 'error']"]] },
        complexity: `<p>O(n) total for n commands — each lookup is O(1) average. Extra space O(1) for the table plus the output list.</p>`,
        followUps: ['Let users register new ops at runtime with a decorator <code>@op("pow")</code>.', 'Support a variable number of operands (<code>"add 1 2 3 4"</code>) using <code>functools.reduce</code>.']
      }
    }]
  });
  /* ================= TOPIC 2: Scopes & LEGB ================= */
  topics.push({
    title: 'Scopes & the LEGB Rule: Where Python Looks Up a Name',
    analogy: `<p>Imagine you hear someone shout "<b>Where are the keys?</b>" You look in <b>your own pocket</b> first (Local). Not there? Check <b>the room you are in</b> — the bigger space that contains you (Enclosing). Then <b>the whole house</b> (Global). Finally the <b>city's lost-and-found</b> that everybody shares (Built-in). You stop at the <b>first</b> place you find keys — even if there are other keys further out. And you never look <i>inside</i> someone else's pocket. That search order is LEGB.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <b>scope</b> is a "region where a name lives". When Python sees a name like <code>total</code> it searches four layers, in this exact order, and uses the <b>first</b> match:</p>
<ol>
<li><b>L — Local</b>: names assigned inside the current function (including its parameters).</li>
<li><b>E — Enclosing</b>: locals of any outer <code>def</code>s that wrap this one (innermost first).</li>
<li><b>G — Global</b>: names at the top level of the current <b>module</b> (file).</li>
<li><b>B — Built-in</b>: names Python gives you for free: <code>len</code>, <code>print</code>, <code>range</code>, <code>ValueError</code>…</li>
</ol>
<p>If none has it → <code>NameError: name 'x' is not defined</code>.</p>
${H.table(['Layer', 'Created by', 'Example'], [['Local', 'assignment / parameter / for / import inside a def', '<code>def f(a): b = 1</code> → a, b'], ['Enclosing', 'locals of the outer function', '<code>def outer(): y = 2; def inner(): print(y)</code>'], ['Global', 'top-level of the file', '<code>RATE = 0.18</code>'], ['Built-in', 'the <code>builtins</code> module', '<code>len, print, max</code>']])}
<p><b>The rule that surprises everyone:</b> Python decides whether a name is local <b>when it compiles the function</b>, not while it runs. If a name is <b>assigned anywhere</b> in the function body (<code>=</code>, <code>+=</code>, <code>for x in</code>, <code>import x</code>, <code>def x</code>), it is local <b>for the whole function</b> — even on lines before the assignment. Reading it before it gets a value raises <code>UnboundLocalError</code>.</p>
<pre>count = 0
def bump():
    count += 1      # UnboundLocalError: count is local here (because of +=)
</pre>
<p><b>Two keywords change the rule:</b> <code>global count</code> says "assignments to count go to the module scope"; <code>nonlocal count</code> (next topic) says "go to the nearest enclosing function's variable". Reading never needs a keyword — only <b>rebinding</b> does.</p>
<p><b>Not scopes:</b> <code>if</code>, <code>for</code>, <code>while</code>, <code>with</code> and <code>try</code> blocks do <b>not</b> create scopes in Python (unlike Java/C). A variable assigned inside an <code>if</code> is visible after it. Only <b>modules, functions, classes, lambdas and comprehensions</b> create scopes.</p>
<p><b>Shadowing.</b> A local named <code>list</code> or <code>id</code> hides the built-in for that scope. Legal, but it causes "<code>'list' object is not callable</code>" later. Avoid built-in names for variables.</p>`,
    clues: [
      '"UnboundLocalError: local variable referenced before assignment" → the name is assigned somewhere in the function, so it is local everywhere in it',
      '"what does this print?" with the same name defined at several levels → walk L → E → G → B and stop at the first hit',
      '"modify a module-level counter from inside a function" → <code>global</code> (or better: return the value / use an object)',
      '"\'list\' object is not callable" / "\'str\' object is not callable" → a built-in name was shadowed',
      '"does the loop variable exist after the loop / comprehension?" → for loops leak it (no block scope); comprehensions do not',
      '"method cannot see a class attribute by bare name" → class bodies are not enclosing scopes for methods; use <code>self.x</code> or <code>ClassName.x</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'LEGB in one program', code: `x = 'global x'                  # G

def outer():
    x = 'enclosing x'             # E (for inner)
    y = 'enclosing y'
    def inner():
        x = 'local x'             # L
        print('inner sees:', x, '|', y, '|', len('abc'))  # L, E, B
    inner()
    print('outer sees:', x)

outer()
print('module sees:', x)

def no_local():
    print('no_local sees:', x)    # nothing local -> falls back to G

no_local()` },
    { lang: 'python', run: true, title: 'UnboundLocalError and the two fixes', code: `count = 0

def bump_broken():
    count += 1          # compiler: 'count' is local everywhere in this function
    return count

try:
    bump_broken()
except UnboundLocalError as e:
    print('UnboundLocalError:', e)

def bump_global():
    global count        # fix 1: rebind the module-level name
    count += 1
    return count

def bump_pure(c):       # fix 2 (usually better): pass in, return out
    return c + 1

print(bump_global(), bump_global())   # 1 2
count = bump_pure(count)
print(count)                          # 3` }],
    codeTitle: ['Lookup order', 'Reading vs rebinding'],
    viz: [{
      title: 'LEGB lookup: walk the scopes and stop at the first match',
      input: 'y | L: z=10 | E: y=20 | G: x=30 y=99',
      inputLabel: 'name to look up | L: k=v ... | E: k=v ... | G: k=v ...  (B = built-ins: len print sum max min range abs int str list)',
      gen: function (input) {
        var secs = String(input || '').split('|').map(function (s) { return s.trim(); });
        var name = secs[0];
        if (!name || !/^[A-Za-z_]\w*$/.test(name)) throw new Error('Start with a valid name, e.g. y | L: z=10 | E: y=20 | G: x=30');
        var sc = { L: [], E: [], G: [] };
        secs.slice(1).forEach(function (s) {
          var m = s.match(/^([LEG])\s*:\s*(.*)$/i);
          if (!m) throw new Error('Each section must look like  L: a=1 b=2');
          var key = m[1].toUpperCase();
          words(m[2]).forEach(function (kv) {
            var q = kv.split('=');
            if (q.length !== 2 || !/^[A-Za-z_]\w*$/.test(q[0])) throw new Error('Use name=value pairs like z=10');
            sc[key].push([q[0], q[1]]);
          });
          if (sc[key].length > 6) throw new Error('At most 6 names per scope');
        });
        var B = ['len', 'print', 'sum', 'max', 'min', 'range', 'abs', 'int', 'str', 'list'];
        var order = [['L', 'Local (inner)'], ['E', 'Enclosing (outer)'], ['G', 'Global (module)'], ['B', 'Built-in']];
        var lines = [];
        sc.G.forEach(function (kv) { lines.push(kv[0] + ' = ' + kv[1] + '          # G'); });
        lines.push('def outer():');
        sc.E.forEach(function (kv) { lines.push('    ' + kv[0] + ' = ' + kv[1] + '      # E'); });
        lines.push('    def inner():');
        sc.L.forEach(function (kv) { lines.push('        ' + kv[0] + ' = ' + kv[1] + '  # L'); });
        lines.push('        print(' + name + ')     # <- lookup');
        lines.push('    inner()');
        lines.push('outer()');
        var code = lines.join('\n'), lookLine = lines.length - 2;
        var nodes = [{ id: 'L', label: 'L: inner()', x: 11, y: 28, shape: 'box', w: 19 }, { id: 'E', label: 'E: outer()', x: 37, y: 28, shape: 'box', w: 19 }, { id: 'G', label: 'G: module', x: 63, y: 28, shape: 'box', w: 19 }, { id: 'B', label: 'B: builtins', x: 89, y: 28, shape: 'box', w: 19 }];
        var edges = [['L', 'E', 'miss'], ['E', 'G', 'miss'], ['G', 'B', 'miss']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'search path for "' + name + '"', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        function scopeMap(k) {
          if (k === 'B') return { type: 'set', label: 'builtins (a few)', items: B.slice(), hl: (function () { var h = {}; if (B.indexOf(name) >= 0) h[name] = 'ok'; return h; })() };
          var hl = {}; sc[k].forEach(function (kv) { if (kv[0] === name) hl[kv[0]] = 'ok'; });
          return { type: 'map', label: k + ' scope dict', entries: sc[k].map(function (kv) { return [kv[0], kv[1]]; }), hl: hl };
        }
        var frames = [fr('Python reaches <code>print(' + esc(name) + ')</code> inside <code>inner</code>. It will search <b>L → E → G → B</b> and use the <b>first</b> scope that has the name.', [cp(code, lookLine, 'cur'), g({ L: 'cur' })])];
        var hl = {}, ehl = {}, found = null, foundVal = null;
        for (var i = 0; i < order.length; i++) {
          var k = order[i][0];
          var has = k === 'B' ? B.indexOf(name) >= 0 : sc[k].some(function (kv) { return kv[0] === name; });
          var cur = copyObj(hl); cur[k] = has ? 'ok' : 'cur';
          if (has) {
            found = k;
            foundVal = k === 'B' ? '<built-in function ' + name + '>' : sc[k].filter(function (kv) { return kv[0] === name; })[0][1];
            frames.push(fr('Check <b>' + order[i][1] + '</b>: <span class="c-g">found <code>' + esc(name) + '</code></span> → ' + esc(foundVal) + '. Search <b>stops here</b>.', [g(cur, ehl, (function () { var t = {}; t[k] = 'found'; return t; })()), scopeMap(k)]));
            break;
          }
          frames.push(fr('Check <b>' + order[i][1] + '</b>: no <code>' + esc(name) + '</code> here' + (i < 3 ? ', so move one layer outward.' : '.'), [g(cur, ehl), scopeMap(k)]));
          hl[k] = 'done';
          if (i < 3) ehl[k + '-' + order[i + 1][0]] = 'cur';
        }
        if (!found) {
          frames.push(fr('<span class="c-r">Not found in any of the four layers → <b>NameError: name \'' + esc(name) + '\' is not defined</b>.</span> Python never looks in sibling functions or in callers.', [g({ L: 'bad', E: 'bad', G: 'bad', B: 'bad' }, ehl), tx('NameError: name \'' + esc(name) + '\' is not defined', 'stderr')]));
        } else {
          var shadowed = [];
          order.forEach(function (o, j) {
            if (j <= ['L', 'E', 'G', 'B'].indexOf(found)) return;
            var has2 = o[0] === 'B' ? B.indexOf(name) >= 0 : sc[o[0]].some(function (kv) { return kv[0] === name; });
            if (has2) shadowed.push(o[1]);
          });
          var fin = {}; fin[found] = 'sel';
          shadowed.forEach(function (s) { fin[s.charAt(0)] = 'bad'; });
          frames.push(fr('The program prints <b>' + esc(foundVal) + '</b>. ' + (shadowed.length ? 'Note: <b>' + shadowed.join(', ') + '</b> also had <code>' + esc(name) + '</code>, but it is <b>shadowed</b> — never reached.' : 'No outer layer has the same name, so nothing is shadowed.'), [g(fin, ehl, (function () { var t = {}; t[found] = 'winner'; shadowed.forEach(function (s) { t[s.charAt(0)] = 'shadowed'; }); return t; })()), tx('<code>' + esc(foundVal) + '</code>', 'stdout')]));
        }
        frames.push(fr('Rule to remember: lookup goes <b>outward only</b> (inner can see outer, outer can never see inner\'s locals), and the <b>first</b> hit wins. Try names like <code>len</code>, <code>x</code>, or <code>nope</code>.', [g({ L: 'win', E: 'win', G: 'win', B: 'win' }), tx('L → E → G → B, stop at first match, else NameError', 'LEGB')]));
        return frames;
      }
    }, {
      title: 'Why count += 1 crashes: scope is decided at compile time',
      gen: function () {
        var code = ['count = 0', 'def bump():', '    print("before")', '    count += 1      # assignment!', '    return count', 'bump()'].join('\n');
        var fixed = ['count = 0', 'def bump():', '    global count', '    count += 1', '    return count', 'bump()'].join('\n');
        return [
          fr('Step 0 — <b>compile time</b>. Before any line runs, Python scans the body of <code>bump</code>. It sees <code>count += 1</code>, which is an <b>assignment</b>, so it marks <code>count</code> as <b>local to bump</b> for the entire function.', [cp(code, { 2: 'cur', 4: 'bad' }), { type: 'table', label: 'symbol table for bump', columns: ['name', 'scope chosen by compiler'], rows: [['count', 'LOCAL (because it is assigned)'], ['print', 'GLOBAL → BUILTIN (only read)']], hl: { 0: 'bad' } }]),
          fr('Run time: line 1 creates the module-level <code>count = 0</code> in the <b>global</b> scope.', [cp(code, 1, 'ok'), vp({ 'G.count': 0 }, 'G.count')]),
          fr('<code>bump()</code> is called. A new frame is created with an <b>empty local slot</b> for <code>count</code>. <code>print("before")</code> runs fine.', [cp(code, 3, 'ok'), { type: 'stack', label: 'call stack', items: ['<module>', 'bump()'], hl: { 1: 'cur' } }, vp({ 'G.count': 0, 'L.count': '(unbound)' }, { 'L.count': 'cur' })]),
          fr('<code>count += 1</code> means <code>count = count + 1</code>. Reading the <b>local</b> slot first — but it has no value yet. The global <code>count</code> is <b>not</b> consulted, because the compiler already said "local". → <span class="c-r">UnboundLocalError</span>.', [cp(code, 4, 'bad'), vp({ 'G.count': 0, 'L.count': '(unbound)' }, { 'L.count': 'bad' }), tx("UnboundLocalError: cannot access local variable 'count' where it is not associated with a value", 'stderr')]),
          fr('Fix: <code>global count</code> tells the compiler "<code>count</code> in this function means the module variable". Now the read and the write both go to G.', [cp(fixed, { 3: 'ok', 4: 'ok' }), { type: 'table', label: 'symbol table for bump (fixed)', columns: ['name', 'scope'], rows: [['count', 'GLOBAL (declared)']], hl: { 0: 'ok' } }, vp({ 'G.count': 1 }, 'G.count')]),
          fr('Better design in real code: avoid shared mutable globals. Pass the value in and return the new value, or keep state in a closure (next topic) or an object.', [tx('<code>def bump(c): return c + 1</code><br><code>count = bump(count)</code>', 'pure version'), vp({ count: 1 }, 'count')])
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: shadowing at three levels', html: `<p>Each function sees its <b>own</b> nearest <code>x</code>. Changing a local never changes the outer one. Output: <code>3 2 1</code> then <code>1</code>.</p>`, code: { lang: 'python', run: true, code: `x = 1
def a():
    x = 2
    def b():
        x = 3
        print(x, end=' ')
    b()
    print(x, end=' ')
a()
print(x)
print(x)` } },
      { title: 'No block scope: if / for variables survive', html: `<p>Unlike Java, a variable created inside <code>if</code> or <code>for</code> lives on after the block. Comprehension variables, however, have their <b>own scope</b> and do not leak.</p>`, code: { lang: 'python', run: true, code: `if True:
    inside_if = 'still here'
print(inside_if)

for i in range(3):
    pass
print('loop var after loop:', i)        # 2 - leaks

squares = [k * k for k in range(3)]
try:
    print(k)
except NameError as e:
    print('NameError:', e)              # comprehension var does not leak` } },
      { title: 'Class body is NOT an enclosing scope for methods', html: `<p>Names defined in a class body are attributes, not enclosing variables. Methods must use <code>self.rate</code> or <code>Tax.rate</code>. A bare <code>rate</code> inside a method skips the class and goes to G → B.</p>`, code: { lang: 'python', run: true, code: `rate = 'global rate'

class Tax:
    rate = 0.18
    def show(self):
        # bare 'rate' skips the class body: L -> (no E) -> G
        return rate, self.rate, Tax.rate

print(Tax().show())` } },
      { title: 'global vs reading: you only need the keyword to rebind', html: `<p>Reading a global or calling a method on it (mutating) needs no keyword. Only <b>rebinding</b> the name with <code>=</code> needs <code>global</code>. This is why <code>CACHE[key] = v</code> works without <code>global CACHE</code>.</p>`, code: { lang: 'python', run: true, code: `CACHE = {}
TOTAL = 0

def remember(k, v):
    CACHE[k] = v          # mutation of the object: fine, no keyword

def add(n):
    global TOTAL          # rebinding the name: keyword required
    TOTAL = TOTAL + n

remember('a', 1)
add(5); add(7)
print(CACHE, TOTAL)` } }
    ],
    deepDive: `<p>🟣 <b>How CPython implements scopes.</b> At compile time the <i>symbol table</i> pass classifies every name in every code block as local, global (implicit or explicit), free (from an enclosing function) or cell (a local captured by an inner function). The bytecode then uses different instructions: <code>LOAD_FAST</code> for locals (an index into a fixed array in the frame — the fastest lookup), <code>LOAD_DEREF</code> for cell/free variables, <code>LOAD_GLOBAL</code> for globals/builtins (a dict lookup in <code>__globals__</code>, then in <code>__builtins__</code>, sped up by inline caches since 3.11), and <code>LOAD_NAME</code> for module/class bodies (dict lookups). You can see it with <code>import dis; dis.dis(f)</code>.</p>
<p><b>Consequences.</b> (1) <code>UnboundLocalError</code> is a subclass of <code>NameError</code> raised when a <code>LOAD_FAST</code> slot is empty. (2) You cannot create locals dynamically in a function: <code>exec('y = 1')</code> inside a function does not make <code>y</code> visible to later code. Since Python 3.13 (PEP 667), <code>locals()</code> in a function returns an independent <b>snapshot</b> each call, and <code>frame.f_locals</code> is a write-through proxy — the old "sometimes it updates" behaviour is gone. (3) Copying a global to a local in a hot loop (<code>append = out.append</code>) used to be a big speed trick; it still helps a little, but adaptive specialisation in 3.11+ shrank the gap.</p>
<p><b>Edge cases interviewers love.</b> <code>except E as e:</code> deletes <code>e</code> at the end of the handler (to break a traceback reference cycle), so <code>e</code> is unbound afterwards. The walrus <code>:=</code> inside a comprehension binds in the <b>containing</b> function scope (PEP 572). Comprehensions were inlined in 3.12 (PEP 709) for speed, but they still behave as if they had their own scope — the iteration variable does not leak. A class body <i>is</i> a scope for code directly in it, which is why <code>[x for _ in range(3)]</code> in a class body cannot see a class-level <code>x</code> (the comprehension acts like a nested function, and class scope is skipped).</p>
<p><b>Production reality.</b> Module-level globals are shared by every thread and every import of the module; mutable globals make tests order-dependent. Prefer constants (UPPER_CASE) at module level and pass state explicitly or wrap it in objects.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI writes most boilerplate, but "predict the output" scope puzzles remain a favourite interview filter precisely because you must <b>simulate the interpreter</b> in your head — and AI-generated code silently relies on these rules.</p>
<p><b>Use AI as a partner:</b> ask <code>"Explain step by step why this raises UnboundLocalError, mentioning the symbol table"</code>, or paste code and ask <code>"Which names are local, global, free and builtin in each function?"</code> then verify with <code>dis.dis</code>.</p>
<p><b>Where AI goes wrong:</b> it sprinkles <code>global</code> to "fix" errors instead of restructuring, shadows built-ins (<code>id</code>, <code>type</code>, <code>input</code>, <code>list</code>) in generated variable names, and occasionally claims Python has block scope like Java. Older training data may also describe pre-3.13 <code>locals()</code> behaviour.</p>
<p><b>What you must still own:</b> the compile-time "assigned anywhere = local" rule, LEGB order, and the judgement to remove global state rather than add more <code>global</code> statements.</p>`,
    problems: [{
      title: 'Resolve a Name like the Interpreter (ChainMap)', level: 'Medium', tags: ['LEGB', 'scopes', 'ChainMap'], companies: ['Google', 'Microsoft', 'Atlassian'],
      statement: `<p>You are writing a tiny interpreter. Scopes are given as a list of dicts from innermost to outermost: <code>[local, enclosing1, …, global, builtins]</code>. Implement <code>resolve(name, scopes)</code> that returns the value Python's LEGB rule would find, or raises <code>NameError</code> if no scope has it. Also implement <code>assign(name, value, scopes)</code> that always writes to the <b>innermost</b> scope (like a plain assignment without <code>global</code>/<code>nonlocal</code>).</p>`,
      constraints: `1 ≤ number of scopes ≤ 50; up to 10<sup>4</sup> names per scope; up to 10<sup>5</sup> lookups`,
      example: `<p><code>scopes = [{'z': 1}, {'y': 2}, {'x': 3, 'y': 99}, {'len': len}]</code><br><code>resolve('y', scopes)</code> → ${H.c('g', '2')} (enclosing wins; the global <code>y = 99</code> is shadowed). <code>resolve('w', scopes)</code> → ${H.c('r', 'NameError')}.</p>`,
      brute: { why: `<p>Merging all dicts into one big dict on <b>every</b> lookup (outermost first so inner ones overwrite) gives the right answer but costs O(total names) per lookup — 10<sup>5</sup> lookups × 5·10<sup>5</sup> names is far too slow.</p>`, code: `def resolve(name, scopes):
    merged = {}
    for scope in reversed(scopes):     # outermost first
        merged.update(scope)           # inner scopes overwrite outer ones
    if name not in merged:
        raise NameError(f"name {name!r} is not defined")
    return merged[name]

def assign(name, value, scopes):
    scopes[0][name] = value` },
      mcq: { q: 'In which order should resolve() check the dicts?', options: ['Innermost (local) to outermost (builtins), stop at first hit', 'Builtins first, then global, then local', 'Check all and return the last match'], answer: 0, explain: 'LEGB: the nearest definition wins. Checking outward and stopping early is also the fastest.' },
      hints: [`<p>Hint 1: You do not need to merge anything. Just ask each dict, from the inside out, "do you have this key?"</p>`, `<p>Hint 2: <code>collections.ChainMap(*scopes)</code> does exactly this: lookups search the maps in order, and writes go to the first map.</p>`, `<p>Hint 3: Edge cases: name missing everywhere → raise NameError; a key whose value is <code>None</code> still counts as found (use <code>in</code>, not truthiness). Recipe: for s in scopes: if name in s: return s[name]; raise NameError.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'scopes = [{\'z\': 1}, {\'y\': 2}, {\'x\': 3, \'y\': 99}, {\'len\': len}]\n' +
                'result = [resolve(\'y\', scopes), resolve(\'z\', scopes), resolve(\'x\', scopes), resolve(\'len\', scopes)(\'abc\')]'
            ],
            [2, 1, 3, 3]
          ],
          [['scopes = [{\'z\': 1}, {\'y\': 2}]\nresult = resolve(\'w\', scopes)'], '!NameError'],
          [['result = resolve(\'a\', [{\'a\': None}, {\'a\': 1}])'], null],
          [
            [
              'scopes = [{}, {\'q\': 5}]\n' +
                'assign(\'q\', 7, scopes)\n' +
                'result = [scopes[0], scopes[1], resolve(\'q\', scopes)]'
            ],
            [{ q: 7 }, { q: 5 }, 7]
          ],
          [
            [
              'scopes = [{}, {}]\n' +
                'assign(\'n\', 0, scopes)\n' +
                'result = [scopes, resolve(\'n\', scopes)]'
            ],
            [[{ n: 0 }, {  }], 0]
          ],
          [
            [
              'scopes = [{\'v%d\' % i: i} for i in range(50)]\n' +
                'result = [resolve(\'v49\', scopes), resolve(\'v0\', scopes), resolve(\'v25\', scopes)]'
            ],
            [49, 0, 25]
          ],
          [
            [
              'scopes = [{} for _ in range(49)] + [{\'deep\': \'found\'}]\n' +
                'r = 0\n' +
                'for _ in range(100000):\n' +
                '    r += len(resolve(\'deep\', scopes))\n' +
                'result = r'
            ],
            500000
          ],
          [
            [
              'scopes = [{\'k%d\' % i: i for i in range(10000)}, {\'k5\': \'outer\'}]\n' +
                'result = [resolve(\'k5\', scopes), resolve(\'k9999\', scopes)]'
            ],
            [5, 9999]
          ],
          [
            [
              'scopes = [{\'x\': 1}]\n' +
                'result = [resolve(\'x\', scopes), resolve(\'y\', scopes)]'
            ],
            '!NameError'
          ],
          [['scopes = [{\'x\': 0}, {\'x\': 1}]\nresult = resolve(\'x\', scopes)'], 0],
          [['scopes = [{}, {\'e\': \'\'}]\nresult = resolve(\'e\', scopes)'], ''],
          [
            [
              'scopes = [{\'a\': 1}, {\'a\': 2}]\n' +
                'assign(\'a\', 3, scopes)\n' +
                'result = [resolve(\'a\', scopes), scopes[1][\'a\']]'
            ],
            [3, 2]
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
        approach: `<p>Walk the scopes innermost → outermost and return at the first dict that contains the key (O(depth) dict lookups). <code>ChainMap</code> packages the same behaviour, and its write semantics (first mapping only) match a plain assignment.</p>`,
        code: { lang: 'python', run: true, code: `from collections import ChainMap

def resolve(name, scopes):
    # LEGB: innermost first, first hit wins
    for scope in scopes:
        if name in scope:            # 'in', so a stored None still counts
            return scope[name]
    raise NameError(f"name {name!r} is not defined")

def assign(name, value, scopes):
    scopes[0][name] = value          # plain assignment binds in the local scope

scopes = [{'z': 1}, {'y': 2}, {'x': 3, 'y': 99}, {'len': len}]
print(resolve('y', scopes))          # 2 (global y is shadowed)
print(resolve('len', scopes)('abc')) # 3 from builtins
try:
    resolve('w', scopes)
except NameError as e:
    print('NameError:', e)

# The same thing with ChainMap
env = ChainMap(*scopes)
env['y'] = 'new local y'             # writes go to the first map
print(env['y'], scopes[0], scopes[2]['y'])` },
        dry: { head: ['lookup', 'L {z}', 'E {y}', 'G {x, y}', 'B {len}', 'result'], rows: [["'y'", 'miss', '<span class="c-g">hit</span>', 'not checked', 'not checked', '2'], ["'len'", 'miss', 'miss', 'miss', '<span class="c-g">hit</span>', '&lt;built-in len&gt;'], ["'w'", 'miss', 'miss', 'miss', 'miss', '<span class="c-r">NameError</span>']] },
        complexity: `<p>O(d) average per lookup where d = number of scopes (each check is an O(1) dict lookup); no extra space. The brute force costs O(total names) per lookup.</p>`,
        followUps: ['Add <code>declare_global(name)</code> so later assigns to that name go to the global dict.', 'How would you implement <code>nonlocal</code>: find the nearest enclosing (not local, not global) dict that already has the name?']
      }
    }]
  });
  /* ================= TOPIC 3: Closures & nonlocal ================= */
  topics.push({
    title: 'Closures & nonlocal: Functions That Remember',
    analogy: `<p>A closure is like a <b>backpack</b>. When a little function is born inside a bigger one, it packs a backpack with the outer variables it uses. Later, even after the bigger function has finished and its "house" is torn down, the little function still carries the backpack and can open it. Each time you call the factory, a <b>new</b> little function gets its <b>own</b> backpack. And <code>nonlocal</code> is the permission slip that lets the little function <b>replace</b> what is inside the backpack, not just look at it.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <b>closure</b> is an inner function that <b>uses variables from an enclosing function</b>, and keeps access to them after the outer function has returned.</p>
<pre>def make_counter():
    count = 0                 # lives in make_counter's scope
    def counter():
        nonlocal count        # we want to REBIND count, not create a local
        count += 1
        return count
    return counter            # return the function object (no call!)

c1 = make_counter()
c1(); c1()                    # 1, 2
c2 = make_counter()           # a brand-new, independent count
c2()                          # 1</pre>
<p><b>Three ingredients</b> make a closure: (1) a nested function, (2) it refers to a variable of the enclosing function, (3) the enclosing function returns (or otherwise hands out) the nested function.</p>
<p><b>Where is the remembered value stored?</b> In a <b>cell</b>. When Python sees that <code>count</code> is used by an inner function, it keeps <code>count</code> in a small box (a cell object) instead of the normal local slot. Both functions point at the same box. You can peek: <code>c1.__closure__[0].cell_contents</code> → current count; <code>c1.__code__.co_freevars</code> → <code>('count',)</code>.</p>
<p><b>Why nonlocal?</b> Because of the compile-time rule from the last topic: <code>count += 1</code> is an assignment, so without help Python would make <code>count</code> local to <code>counter</code> → <code>UnboundLocalError</code>. <code>nonlocal count</code> says "rebind the variable in the nearest enclosing function". You do <b>not</b> need it to read the value, or to mutate a mutable object (<code>items.append(x)</code>) — only to rebind the name.</p>
${H.table(['Inside the inner function', 'Needs nonlocal?'], [['<code>print(count)</code> (read)', 'No'], ['<code>items.append(x)</code> (mutate the object)', 'No'], ['<code>count += 1</code> / <code>count = 0</code> (rebind)', '<b>Yes</b>'], ['name exists only at module level', 'Use <code>global</code> (nonlocal gives SyntaxError)']])}
<p><b>The late-binding trap.</b> Closures capture <b>variables</b>, not <b>values</b>. In <code>[lambda: i for i in range(3)]</code>, all three lambdas share one <code>i</code>, which ends at 2 — so all return 2. Fix by binding the current value at creation time: <code>lambda i=i: i</code> (default values are evaluated immediately) or <code>functools.partial</code>.</p>
<p><b>Closures vs classes.</b> A closure is a lightweight object with one method. Use it for small state (counters, caches, configured callbacks). When you need several methods, inspection or pickling, write a class.</p>`,
    clues: [
      '"function that remembers state between calls without a global or class" → closure',
      '"factory that returns customised functions (make_multiplier, make_validator)" → closure over the factory\'s parameters',
      '"UnboundLocalError inside an inner function that does x += 1" → missing <code>nonlocal x</code>',
      '"all the callbacks print the last loop value" → late binding; capture with a default argument <code>i=i</code> or <code>partial</code>',
      '"running average / running total / call counter / rate limiter" → closure with <code>nonlocal</code> state',
      '"what is __closure__ / cell_contents / co_freevars" → cells hold captured variables'
    ],
    code: [{ lang: 'python', run: true, title: 'Counters with independent backpacks', code: `def make_counter(start=0):
    count = start                  # will live in a cell
    def counter():
        nonlocal count             # rebind the enclosing variable
        count += 1
        return count
    return counter

c1 = make_counter()
c2 = make_counter(100)
print(c1(), c1(), c1())            # 1 2 3
print(c2(), c2())                  # 101 102  (independent cell)
print(c1())                        # 4

# Peek inside the closure
print(c1.__code__.co_freevars)                 # ('count',)
print(c1.__closure__[0].cell_contents)         # 4
print(c1.__closure__[0] is c2.__closure__[0])  # False: different cells` },
    { lang: 'python', run: true, title: 'Late binding trap and three fixes', code: `from functools import partial

# Trap: all lambdas share ONE variable i
fs = [lambda: i for i in range(3)]
print([f() for f in fs])                 # [2, 2, 2]

# Fix 1: default argument evaluated now
fs = [lambda i=i: i for i in range(3)]
print([f() for f in fs])                 # [0, 1, 2]

# Fix 2: a factory creates a new scope (new cell) per value
def make(i):
    return lambda: i
fs = [make(i) for i in range(3)]
print([f() for f in fs])                 # [0, 1, 2]

# Fix 3: partial freezes the argument value
def show(i):
    return i
fs = [partial(show, i) for i in range(3)]
print([f() for f in fs])                 # [0, 1, 2]` }],
    codeTitle: ['Closures + nonlocal', 'Late binding'],
    viz: [{
      title: 'Closure cells: each counter carries its own backpack',
      input: 'c1 c1 c2 c1 c2 c3',
      inputLabel: 'sequence of calls using names c1, c2, c3 (created on first use)',
      gen: function (input) {
        var calls = words(input);
        if (!calls.length) throw new Error('Enter calls like: c1 c1 c2');
        if (calls.length > 12) throw new Error('Use at most 12 calls');
        calls.forEach(function (c) { if (!/^c[1-3]$/.test(c)) throw new Error('Use only c1, c2 or c3'); });
        var code = ['def make_counter():', '    count = 0', '    def counter():', '    nonlocal count', '        count += 1', '        return count', '    return counter'].join('\n').replace('    nonlocal', '        nonlocal');
        var cells = {}, order = [], frames = [];
        function cellVars(hl) { var v = {}; order.forEach(function (n) { v[n + '  → cell(count)'] = cells[n]; }); var h = {}; if (hl) h[hl + '  → cell(count)'] = 'ok'; return vp(v, h, 'cells held in each closure (__closure__[0].cell_contents)'); }
        frames.push(fr('<code>make_counter</code> is defined. Nothing is captured yet — a backpack is only packed when the factory <b>runs</b>.', [cp(code, 1), tx('No counters exist yet.', 'heap')]));
        calls.forEach(function (c) {
          if (!(c in cells)) {
            cells[c] = 0; order.push(c);
            frames.push(fr('First use of <b>' + c + '</b>: run <code>' + c + ' = make_counter()</code>. Line 2 creates <code>count = 0</code> in a <b>new cell</b>; line 7 returns the inner function holding a reference to that cell. The factory\'s frame is then destroyed — the cell survives.', [cp(code, { 2: 'ok', 7: 'ok' }), { type: 'stack', label: 'call stack', items: ['<module>', 'make_counter()'], hl: { 1: 'cur' } }, cellVars(c)]));
          }
          cells[c] += 1;
          frames.push(fr('<code>' + c + '()</code>: <code>nonlocal count</code> means "the count in my cell". <code>count += 1</code> → <b>' + cells[c] + '</b>. Other counters\' cells are untouched.', [cp(code, { 4: 'cur', 5: 'ok' }), { type: 'stack', label: 'call stack', items: ['<module>', c + '()  [counter]'], hl: { 1: 'cur' } }, cellVars(c), tx('returns <b>' + cells[c] + '</b>', c + '()')]));
        });
        var rows = order.map(function (n) { return [n, String(cells[n])]; });
        frames.push(fr('Final state: every call to <code>make_counter()</code> produced a <b>separate</b> cell, so the counters never interfere. This is private, persistent state without globals or classes.', [{ type: 'table', label: 'summary', columns: ['closure', 'count in its cell'], rows: rows }, tx('<code>c.__code__.co_freevars == (\'count\',)</code> for every counter; only the cell objects differ.', 'introspection')]));
        return frames;
      }
    }, {
      title: 'Late binding: lambdas in a loop share ONE variable',
      input: '3',
      inputLabel: 'n for range(n) (1..6)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 6) throw new Error('Enter n between 1 and 6');
        var code = ['fs = []', 'for i in range(' + n + '):', '    fs.append(lambda: i)      # captures the VARIABLE i', 'print([f() for f in fs])'].join('\n');
        var frames = [], fs = [];
        for (var i = 0; i < n; i++) {
          fs.push('λ → i');
          frames.push(fr('Loop sets <code>i = ' + i + '</code> and appends a lambda. The lambda does <b>not</b> copy the value ' + i + '; it remembers <b>where</b> <code>i</code> lives.', [cp(code, { 2: 'cur', 3: 'ok' }), vp({ i: i }, { i: 'cur' }, 'the one shared variable'), { type: 'array', label: 'fs', values: fs.slice(), hl: (function () { var h = {}; h[fs.length - 1] = 'ok'; return h; })() }]));
        }
        var res = []; for (var k = 0; k < n; k++) res.push(n - 1);
        frames.push(fr('The loop ends with <code>i = ' + (n - 1) + '</code>. Now we call the lambdas. Each looks up <code>i</code> <b>now</b> → all see <b>' + (n - 1) + '</b>.', [cp(code, 4, 'bad'), vp({ i: n - 1 }, { i: 'bad' }, 'the one shared variable'), { type: 'array', label: 'results', values: res, hl: (function () { var h = {}; for (var q = 0; q < n; q++) h[q] = 'bad'; return h; })() }]));
        var fixed = ['fs = []', 'for i in range(' + n + '):', '    fs.append(lambda i=i: i)  # default = value NOW', 'print([f() for f in fs])'].join('\n');
        var good = []; for (var j = 0; j < n; j++) good.push(j);
        frames.push(fr('Fix: <code>lambda i=i: i</code>. Default values are evaluated when the lambda is <b>created</b>, so each lambda stores its own copy of the current value in <code>__defaults__</code>.', [cp(fixed, 3, 'ok'), { type: 'array', label: 'each lambda\'s __defaults__', values: good.map(function (x) { return '(' + x + ',)'; }) }]));
        frames.push(fr('Now the calls return <b>' + good.join(', ') + '</b>. Same idea works with <code>partial(func, i)</code> or a small factory function.', [cp(fixed, 4, 'sel'), { type: 'array', label: 'results', values: good, hl: (function () { var h = {}; for (var q = 0; q < n; q++) h[q] = 'ok'; return h; })() }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Mutating vs rebinding: when nonlocal is needed', html: `<p>Appending to a captured list mutates the object — no keyword needed. Replacing the number <code>total</code> rebinds the name — needs <code>nonlocal</code>.</p>`, code: { lang: 'python', run: true, code: `def make_logger():
    lines = []            # captured list
    total = 0             # captured int
    def log(msg):
        nonlocal total    # needed: we rebind total
        lines.append(msg) # not needed: we mutate the list object
        total += len(msg)
        return len(lines), total
    return log

log = make_logger()
print(log('hi'))       # (1, 2)
print(log('hello'))    # (2, 7)` } },
      { title: 'nonlocal targets the NEAREST enclosing function', html: `<p>With two enclosing levels both having <code>x</code>, <code>nonlocal x</code> binds to the closest one. And <code>nonlocal</code> can never reach module globals.</p>`, code: { lang: 'python', run: true, code: `def outer():
    x = 'outer'
    def middle():
        x = 'middle'
        def inner():
            nonlocal x       # the middle() x, the nearest one
            x = 'changed by inner'
        inner()
        return x
    return middle(), x

print(outer())   # ('changed by inner', 'outer')` } },
      { title: 'Closure as a configurable function (factory)', html: `<p>Factories bake configuration into a function once. The returned function is cheap to call and carries its settings in cells.</p>`, code: { lang: 'python', run: true, code: `def make_validator(min_len, must_have_digit):
    def validate(password):
        if len(password) < min_len:
            return 'too short'
        if must_have_digit and not any(ch.isdigit() for ch in password):
            return 'needs a digit'
        return 'ok'
    return validate

strict = make_validator(10, True)
loose = make_validator(4, False)
for pw in ['abc', 'abcdef', 'abcdefghij', 'abcdefghi9']:
    print(pw, strict(pw), loose(pw))
print(strict.__code__.co_freevars)   # ('min_len', 'must_have_digit')` } },
      { title: 'Running average without a class', html: `<p>Keep only <code>count</code> and <code>total</code> in the closure, not the whole history — O(1) memory per call.</p>`, code: { lang: 'python', run: true, code: `def make_averager():
    count = 0
    total = 0.0
    def add(x):
        nonlocal count, total
        count += 1
        total += x
        return total / count
    return add

avg = make_averager()
for x in [10, 20, 60]:
    print(avg(x))       # 10.0 15.0 30.0` } }
    ],
    deepDive: `<p>🟣 <b>Cells, cellvars and freevars.</b> When the compiler sees that a local of <code>outer</code> is used by a nested function, it lists it in <code>outer.__code__.co_cellvars</code> and in the inner function's <code>co_freevars</code>. At run time, <code>outer</code>'s frame stores a <b>cell object</b> for it (instruction <code>MAKE_CELL</code>), and building the inner function packs a tuple of those cells into <code>__closure__</code>. Reads and writes use <code>LOAD_DEREF</code>/<code>STORE_DEREF</code>, which go through the cell — one extra pointer hop compared with <code>LOAD_FAST</code>. Because both frames share the same cell, a change by either is visible to the other.</p>
<p><b>Lifetime and memory.</b> The cell (and anything it points to) lives as long as some function holds it. A closure capturing a big DataFrame or <code>self</code> keeps it alive — a classic leak with long-lived callbacks. A cell captured by a function stored on the same object it references creates a reference cycle (collected by the cyclic GC, but later). Python 3.8+ lets you replace <code>cell_contents</code> directly, and <code>types.CellType</code> exists for building cells manually — useful in debuggers, rarely in apps.</p>
<p><b>nonlocal rules.</b> It is a <b>compile-time</b> declaration: the name must already be bound in some enclosing <i>function</i> scope, otherwise <code>SyntaxError: no binding for nonlocal 'x' found</code>. It cannot target module globals or class bodies. A name cannot be both a parameter and nonlocal.</p>
<p><b>Late binding is by design.</b> Python resolves free variables at call time so that mutually recursive inner functions and closures over loop state work. The same rule is behind the "all buttons do the last action" bug in GUI and async code (<code>for task in tasks: loop.call_soon(lambda: run(task))</code>). <code>asyncio.create_task(run(task))</code> avoids it because the coroutine object is created with the current value immediately.</p>
<p><b>Closures vs classes vs partial — performance.</b> Calling a closure is as fast as calling any function; attribute access on a class instance (<code>self.count</code>) is a dict/slot lookup, slightly slower than a cell deref. In practice choose for clarity: class when there are multiple operations or you need <code>__repr__</code>, pickling, or type hints on state.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI happily generates factories and callbacks, and async/event-driven code (web handlers, agent tool callbacks, UI event loops) leans on closures everywhere. Reviewing them for <b>late binding</b> and <b>captured heavy objects</b> is now a key human skill.</p>
<p><b>Use AI as a partner:</b> ask <code>"Find every closure in this file and tell me which variables each captures"</code>, or <code>"Rewrite this closure-based counter as a class and list the trade-offs"</code>. Ask it to generate a "predict the output" quiz with loops of lambdas for practice.</p>
<p><b>Where AI goes wrong:</b> it creates callbacks in loops (<code>for url in urls: futures.append(lambda: fetch(url))</code>) — every callback fetches the last URL; it adds <code>global</code> where <code>nonlocal</code> was meant; and it sometimes claims closures copy values.</p>
<p><b>What you must still own:</b> the "variables not values" mental model, knowing when <code>nonlocal</code> is required, and noticing when a closure keeps a large object or <code>self</code> alive longer than intended.</p>`,
    problems: [{
      title: 'Running Average with a Closure', level: 'Easy', tags: ['closure', 'nonlocal', 'state'], companies: ['Amazon', 'Goldman Sachs', 'Swiggy'],
      statement: `<p>Write <code>make_averager()</code> that returns a function <code>add(x)</code>. Each call records the number <code>x</code> and returns the average of <b>all numbers seen so far</b> by that averager. Two averagers must be independent. Use O(1) memory per averager.</p>`,
      constraints: `Up to 10<sup>6</sup> calls; |x| ≤ 10<sup>9</sup>`,
      example: `<p><code>a = make_averager(); a(10) → 10.0; a(20) → 15.0; a(60) → 30.0</code>. ${H.c('g', '(10+20+60)/3 = 30.0')}. A second averager <code>b(5)</code> → <code>5.0</code>, unaffected by <code>a</code>.</p>`,
      brute: { why: `<p>Storing every number in a captured list and calling <code>sum(history) / len(history)</code> on every call works (no nonlocal needed since we only append), but each call is O(n) and memory grows without bound: 10<sup>6</sup> calls → ~5·10<sup>11</sup> additions.</p>`, code: `def make_averager():
    history = []
    def add(x):
        history.append(x)                  # mutation: no nonlocal needed
        return sum(history) / len(history) # O(n) every call
    return add` },
      mcq: { q: 'You keep <code>count</code> and <code>total</code> as ints in the enclosing function. What must the inner function do?', options: ['Declare <code>nonlocal count, total</code> before rebinding them', 'Declare <code>global count, total</code>', 'Nothing — inner functions can always assign outer variables'], answer: 0, explain: '<code>count += 1</code> rebinds the name, so without nonlocal the compiler makes it local → UnboundLocalError. global would point to module variables shared by all averagers.' },
      hints: [`<p>Hint 1: The average only needs two numbers: how many values and their sum. You never need the old values themselves.</p>`, `<p>Hint 2: Keep <code>count</code> and <code>total</code> in the factory's scope; the inner function captures them in cells.</p>`, `<p>Hint 3: Since ints are immutable, <code>count += 1</code> rebinds → add <code>nonlocal count, total</code>. Recipe: count += 1; total += x; return total / count.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [['a = make_averager()\nresult = [a(10), a(20), a(60)]'], [10, 15, 30]],
          [
            [
              'a = make_averager()\n' +
                'b = make_averager()\n' +
                'a(10); a(20)\n' +
                'result = [b(5), a(0)]'
            ],
            [5, 10]
          ],
          [['a = make_averager()\nresult = a(0)'], 0],
          [['a = make_averager()\nresult = [a(-1), a(1)]'], [-1, 0]],
          [
            [
              'a = make_averager()\n' +
                'for i in range(10**6):\n' +
                '    last = a(10**9)\n' +
                'result = last'
            ],
            1000000000
          ],
          [
            [
              'a = make_averager()\n' +
                'for i in range(10**6):\n' +
                '    last = a(i % 10)\n' +
                'result = last'
            ],
            4.5
          ],
          [['a = make_averager()\nresult = [a(1), a(2), a(3), a(4)]'], [1, 1.5, 2, 2.5]],
          [['a = make_averager()\nresult = [a(-10**9), a(10**9)]'], [-1000000000, 0]],
          [
            [
              'a, b = make_averager(), make_averager()\n' +
                'a(100)\n' +
                'b(1)\n' +
                'result = [a(0), b(3)]'
            ],
            [50, 2]
          ],
          [
            [
              'a = make_averager()\n' +
                'result = [callable(a), type(a(1)).__name__]'
            ],
            [true, 'float']
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
        approach: `<p>Capture two numbers in the closure and update them with <code>nonlocal</code>. Every factory call creates fresh cells, so averagers are independent.</p>`,
        code: { lang: 'python', run: true, code: `def make_averager():
    count = 0
    total = 0.0
    def add(x):
        nonlocal count, total   # we rebind both names
        count += 1
        total += x
        return total / count
    return add

a = make_averager()
print(a(10), a(20), a(60))     # 10.0 15.0 30.0
b = make_averager()
print(b(5))                    # 5.0 - independent cells
print(a.__closure__[0].cell_contents, a.__closure__[1].cell_contents)  # 3 90.0` },
        dry: { head: ['call', 'count (cell)', 'total (cell)', 'returns'], rows: [['a(10)', '1', '10.0', '10.0'], ['a(20)', '2', '30.0', '15.0'], ['a(60)', '3', '90.0', '<span class="c-g">30.0</span>'], ['b(5)', '1 (b\'s own cell)', '5.0', '5.0']] },
        complexity: `<p>O(1) time and O(1) memory per call; the brute force is O(n) time per call and O(n) memory.</p>`,
        followUps: ['Return a moving average of only the last k values (hint: <code>collections.deque(maxlen=k)</code> plus a running sum).', 'Add a <code>reset()</code> — how do you expose two functions sharing the same cells? (return a tuple, or attach as a function attribute)']
      }
    }]
  });
  /* ================= TOPIC 4: *args / **kwargs ================= */
  topics.push({
    title: '*args, **kwargs & Parameter Kinds: Packing, Unpacking, Forwarding',
    analogy: `<p>Think of a <b>restaurant order counter</b>. The menu card has fixed slots: "main dish", "drink". Anything extra you say in order ("also fries, also salad") goes into a <b>tray of extras</b> — that is <code>*args</code>, a tuple of leftover positional items. Special requests with labels ("spice=mild", "ice=no") go into a <b>notes envelope</b> — that is <code>**kwargs</code>, a dict of leftover named items. And a waiter who passes your entire order unchanged to the kitchen is <b>forwarding</b>: <code>kitchen(*args, **kwargs)</code>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A star in a <b>function definition</b> means "collect extras"; a star in a <b>function call</b> means "spread this out".</p>
${H.table(['Where', 'Syntax', 'Meaning'], [['def', '<code>def f(*args)</code>', 'pack extra positional arguments into a <b>tuple</b>'], ['def', '<code>def f(**kwargs)</code>', 'pack extra keyword arguments into a <b>dict</b>'], ['call', '<code>f(*seq)</code>', 'unpack any iterable into positional arguments'], ['call', '<code>f(**mapping)</code>', 'unpack a dict into keyword arguments']])}
<p>The names <code>args</code>/<code>kwargs</code> are just convention — the stars do the work.</p>
<p><b>The five parameter kinds</b>, in the only allowed order:</p>
<pre>def f(a, b, /, c, d=4, *args, e, f=6, **kwargs):
#     ^^^^      ^^^^^^          ^^^^^^^
#  positional-  normal        keyword-only (after * or *args)
#  only (3.8+)</pre>
<ul>
<li><b>Positional-only</b> (before <code>/</code>): must be passed by position. Lets you rename them freely later. Many built-ins use this: <code>len(obj, /)</code>.</li>
<li><b>Normal</b>: by position or by name.</li>
<li><b>*args</b>: leftovers by position.</li>
<li><b>Keyword-only</b> (after <code>*</code> or <code>*args</code>): must be passed by name — great for flags: <code>sorted(xs, reverse=True)</code>.</li>
<li><b>**kwargs</b>: leftovers by name.</li>
</ul>
<p><b>How Python binds a call</b>: fill positional slots left to right; extras go to <code>*args</code> (or <code>TypeError</code> if there is none); then match each keyword to a parameter by name (<code>TypeError: got multiple values</code> if already filled); unknown names go to <code>**kwargs</code> (or <code>TypeError: unexpected keyword</code>); finally fill defaults, and complain about anything still missing.</p>
<p><b>Forwarding</b> is the killer use: <code>def wrapper(*args, **kwargs): return func(*args, **kwargs)</code> passes <b>any</b> call through unchanged. Every decorator in the next topics depends on it.</p>
<p><b>Unpacking extras</b> (PEP 448): <code>[*a, *b]</code>, <code>{**defaults, **overrides}</code> (later keys win), <code>f(*xs, 0, *ys)</code>, and in assignments <code>first, *rest = items</code>.</p>`,
    clues: [
      '"accept any number of arguments" / "variadic" → <code>*args</code>',
      '"accept arbitrary named options / config" → <code>**kwargs</code>',
      '"wrapper must work for ANY function signature" → forward with <code>func(*args, **kwargs)</code>',
      '"force callers to name a flag" / "prevent boolean trap f(x, True)" → keyword-only parameter after <code>*</code>',
      '"parameter name is an implementation detail / may change" → positional-only <code>/</code>',
      '"merge dicts, later wins" → <code>{**a, **b}</code> or <code>a | b</code> (3.9+)',
      '"TypeError: got multiple values for argument" → the same parameter was filled by position and by keyword'
    ],
    code: [{ lang: 'python', run: true, title: 'Packing in the definition, unpacking at the call', code: `def report(title, *args, sep=', ', **kwargs):
    # args is a tuple, kwargs is a dict - both may be empty
    print('title :', title)
    print('args  :', args)
    print('sep   :', repr(sep))
    print('kwargs:', kwargs)
    print('joined:', sep.join(str(a) for a in args))
    print('-' * 20)

report('scores', 90, 75, 88)
report('tags', 'py', 'ai', sep=' | ', owner='asha', level=3)

nums = [1, 2, 3]
opts = {'sep': '+', 'unit': 'kg'}
report('spread', *nums, **opts)     # same as report('spread', 1, 2, 3, sep='+', unit='kg')` },
    { lang: 'python', run: true, title: 'All parameter kinds and the binding errors', code: `def f(a, b, /, c, d=4, *args, e, g=6, **kwargs):
    return dict(a=a, b=b, c=c, d=d, args=args, e=e, g=g, kwargs=kwargs)

print(f(1, 2, 3, e=5))
print(f(1, 2, 3, 40, 50, 60, e=5, z=26))

def attempt(label, call):
    try:
        call()
    except TypeError as err:
        print(label, '->', err)

attempt('a by name', lambda: f(a=1, b=2, c=3, e=5))       # positional-only
attempt('missing e', lambda: f(1, 2, 3))                  # keyword-only missing
attempt('c twice', lambda: f(1, 2, 3, c=9, e=5))          # multiple values` }],
    codeTitle: ['Packing and unpacking', 'Parameter kinds'],
    viz: [{
      title: 'Argument binding: which slot does each argument land in?',
      input: '1, 2, 3, 4, flag=True, color=red',
      inputLabel: 'call arguments for  def f(a, b=10, *args, flag=False, **kwargs)  — e.g. 1, 2, 3, flag=True, x=5',
      gen: function (input) {
        var raw = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (raw.length > 10) throw new Error('Use at most 10 arguments');
        var code = ['def f(a, b=10, *args, flag=False, **kwargs):', '    print(a, b, args, flag, kwargs)', '', 'f(' + raw.join(', ') + ')'].join('\n');
        var slots = { a: '(empty)', b: '(empty)', args: '()', flag: '(empty)', kwargs: '{}' };
        var argsT = [], kw = [], frames = [], seenKw = false, err = null;
        function state(hl) {
          var s = copyObj(slots);
          s.args = '(' + argsT.join(', ') + (argsT.length === 1 ? ',' : '') + ')';
          s.kwargs = '{' + kw.map(function (p) { return "'" + p[0] + "': " + p[1]; }).join(', ') + '}';
          return vp(s, hl, 'parameter slots of f');
        }
        frames.push(fr('Python binds the call <code>f(' + esc(raw.join(', ')) + ')</code> to the parameters. Slots start empty; <code>args</code> starts as an empty tuple and <code>kwargs</code> as an empty dict.', [cp(code, 4), state()]));
        var pos = ['a', 'b'], pi = 0;
        for (var i = 0; i < raw.length && !err; i++) {
          var t = raw[i], m = t.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
          if (!m) {
            if (seenKw) { err = 'SyntaxError: positional argument follows keyword argument'; frames.push(fr('<span class="c-r">' + err + '</span>. Positional arguments must come before any <code>name=value</code> argument — Python refuses to even compile this call.', [cp(code, 4, 'bad'), state()])); break; }
            if (pi < pos.length) {
              slots[pos[pi]] = t;
              var h = {}; h[pos[pi]] = 'ok';
              frames.push(fr('Positional <b>' + esc(t) + '</b> fills the next named slot, <code>' + pos[pi] + '</code>.', [cp(code, 1, 'cur'), state(h)]));
              pi++;
            } else {
              argsT.push(t);
              frames.push(fr('All named positional slots are full, so <b>' + esc(t) + '</b> is packed into the <code>*args</code> tuple.', [cp(code, 1, 'cur'), state({ args: 'ok' })]));
            }
          } else {
            seenKw = true;
            var nm = m[1], val = m[2];
            if (nm === 'a' || nm === 'b' || nm === 'flag') {
              if (slots[nm] !== '(empty)') { err = "TypeError: f() got multiple values for argument '" + nm + "'"; var hb = {}; hb[nm] = 'bad'; frames.push(fr('<span class="c-r">' + esc(err) + '</span> — <code>' + nm + '</code> was already filled by position.', [cp(code, 4, 'bad'), state(hb)])); break; }
              slots[nm] = val;
              var h2 = {}; h2[nm] = 'ok';
              frames.push(fr('Keyword <b>' + esc(nm) + '=' + esc(val) + '</b> matches a parameter name, so it goes straight into that slot' + (nm === 'flag' ? ' (flag is keyword-only: it can ONLY be set this way).' : '.'), [cp(code, 1, 'cur'), state(h2)]));
            } else if (nm === 'args' || nm === 'kwargs') {
              kw.push([nm, val]);
              frames.push(fr('Careful: <b>' + nm + '</b> is not a normal parameter name you can target, so <b>' + esc(nm) + '=' + esc(val) + '</b> lands in <code>**kwargs</code>.', [cp(code, 1, 'cur'), state({ kwargs: 'ok' })]));
            } else {
              if (kw.some(function (p) { return p[0] === nm; })) { err = 'SyntaxError: keyword argument repeated: ' + nm; frames.push(fr('<span class="c-r">' + esc(err) + '</span>', [cp(code, 4, 'bad'), state({ kwargs: 'bad' })])); break; }
              kw.push([nm, val]);
              frames.push(fr('No parameter is called <b>' + esc(nm) + '</b>, so <b>' + esc(nm) + '=' + esc(val) + '</b> is packed into the <code>**kwargs</code> dict.', [cp(code, 1, 'cur'), state({ kwargs: 'ok' })]));
            }
          }
        }
        if (!err) {
          var filled = [];
          if (slots.b === '(empty)') { slots.b = '10'; filled.push('b=10'); }
          if (slots.flag === '(empty)') { slots.flag = 'False'; filled.push('flag=False'); }
          frames.push(fr(filled.length ? 'Now defaults fill any empty slot that has one: <b>' + filled.join(', ') + '</b>. Defaults were computed once, when <code>def</code> ran.' : 'Every slot with a default was filled explicitly — no defaults needed.', [cp(code, 1, 'cur'), state({ b: filled.indexOf('b=10') >= 0 ? 'ok' : '', flag: filled.indexOf('flag=False') >= 0 ? 'ok' : '' })]));
          if (slots.a === '(empty)') {
            frames.push(fr('<span class="c-r">TypeError: f() missing 1 required positional argument: \'a\'</span> — <code>a</code> has no default and nothing filled it.', [cp(code, 4, 'bad'), state({ a: 'bad' })]));
          } else {
            var argsS = '(' + argsT.join(', ') + (argsT.length === 1 ? ',' : '') + ')';
            var kwS = '{' + kw.map(function (p) { return "'" + p[0] + "': " + p[1]; }).join(', ') + '}';
            frames.push(fr('Binding succeeded. The body runs and prints the slots. Note the <b>types</b>: <code>args</code> is always a tuple, <code>kwargs</code> always a fresh dict.', [cp(code, 2, 'sel'), state({ a: 'sel', b: 'sel', args: 'sel', flag: 'sel', kwargs: 'sel' }), tx('<code>' + esc(slots.a + ' ' + slots.b + ' ' + argsS + ' ' + slots.flag + ' ' + kwS) + '</code>', 'stdout')]));
          }
        }
        frames.push(fr('Try: <code>flag=True, 1</code> (positional after keyword), <code>1, a=2</code> (multiple values), or just <code>x=1</code> (missing a).', [tx('Order of binding: positional → *args → keywords by name → **kwargs → defaults → check missing', 'rule')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Forwarding: a wrapper that works for any signature', html: `<p><code>*args, **kwargs</code> in the wrapper's definition collects whatever the caller sent; the same stars in the inner call spread it back out unchanged.</p>`, code: { lang: 'python', run: true, code: `def logged(func, *args, **kwargs):
    print(f'calling {func.__name__} with args={args} kwargs={kwargs}')
    result = func(*args, **kwargs)        # forward exactly
    print('result:', result)
    return result

logged(max, 3, 9, 4)
logged(sorted, [3, 1, 2], reverse=True)
logged(round, 3.14159, ndigits=2)` } },
      { title: 'Keyword-only flags avoid the boolean trap', html: `<p>A call like <code>connect('db', True, False)</code> is unreadable. Putting a bare <code>*</code> forces callers to write names.</p>`, code: { lang: 'python', run: true, code: `def connect(host, *, ssl=True, retries=3):
    return f'{host} ssl={ssl} retries={retries}'

print(connect('db.local', ssl=False))
try:
    connect('db.local', False)            # positional flag rejected
except TypeError as e:
    print('TypeError:', e)` } },
      { title: 'Unpacking in literals and assignments', html: `<p>Stars also work outside calls: merge lists and dicts, and split a sequence into head and tail.</p>`, code: { lang: 'python', run: true, code: `a, b = [1, 2], (3, 4)
print([*a, *b, 5])                        # [1, 2, 3, 4, 5]
defaults = {'theme': 'light', 'lang': 'en'}
user = {'theme': 'dark'}
print({**defaults, **user})               # later keys win
print(defaults | user)                    # same with | (3.9+)
first, *middle, last = range(6)
print(first, middle, last)                # 0 [1, 2, 3, 4] 5` } },
      { title: 'Predict the output: args is a tuple, kwargs a new dict', html: `<p>Even one extra argument becomes a 1-tuple. Mutating <code>kwargs</code> inside the function never affects the caller's dict, because <code>**</code> builds a fresh dict per call.</p>`, code: { lang: 'python', run: true, code: `def show(*args, **kwargs):
    kwargs['seen'] = True
    return args, kwargs

opts = {'x': 1}
print(show(5))               # ((5,), {'seen': True})
print(show(**opts))          # ((), {'x': 1, 'seen': True})
print(opts)                  # {'x': 1}  caller's dict untouched` } }
    ],
    deepDive: `<p>🟣 <b>How binding is implemented.</b> CPython stores the parameter layout in the code object: <code>co_argcount</code> (positional incl. positional-only), <code>co_posonlyargcount</code>, <code>co_kwonlyargcount</code>, and flags <code>CO_VARARGS</code>/<code>CO_VARKEYWORDS</code>. On a call, the interpreter copies positional args into the first local slots, builds a tuple for the overflow and a new dict for unknown keywords, and then fills from <code>__defaults__</code>/<code>__kwdefaults__</code>. Because <code>*args</code> always allocates a tuple and <code>**kwargs</code> a dict, ultra-hot paths sometimes avoid them — but since 3.11 the cost is small.</p>
<p><b>Positional-only is a public-API tool.</b> With <code>def get(key, default=None, /)</code> callers cannot write <code>get(key='x')</code>, so you can rename the parameter later without breaking anyone, and it frees the name for <code>**kwargs</code>: <code>def fmt(template, /, **fields)</code> can accept a field literally named <code>template</code>. <code>inspect.signature(f)</code> shows kinds as <code>POSITIONAL_ONLY</code>, <code>POSITIONAL_OR_KEYWORD</code>, <code>VAR_POSITIONAL</code>, <code>KEYWORD_ONLY</code>, <code>VAR_KEYWORD</code>, and <code>sig.bind(*args, **kwargs)</code> runs the exact binding algorithm without calling — handy for validation decorators.</p>
<p><b>Typing variadics.</b> <code>def f(*args: int, **kwargs: str)</code> annotates <i>each</i> element. For precise keyword types use <code>**kwargs: Unpack[MyTypedDict]</code> (PEP 692, 3.12). For decorators that forward, <code>ParamSpec</code> (<code>P.args</code>, <code>P.kwargs</code>) preserves the wrapped signature for type checkers; <code>TypeVarTuple</code> handles variadic generics.</p>
<p><b>Pitfalls.</b> (1) A huge <code>f(*generator)</code> materialises the whole generator into a tuple first. (2) <code>**kwargs</code> keys must be strings. (3) Swallowing unknown kwargs silently (<code>def f(x, **_)</code>) hides typos like <code>retires=3</code>; prefer explicit keyword-only parameters in public APIs. (4) Default values are shared across calls — never use mutable defaults.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> LLM tool-calling sends arguments as JSON objects, which map naturally to <code>**kwargs</code>: frameworks call <code>tool(**arguments)</code>. Getting the parameter kinds right decides whether the model's call binds or throws.</p>
<p><b>Use AI as a partner:</b> ask <code>"Generate calls to this function that should raise TypeError, and the exact message"</code>; ask it to add <code>ParamSpec</code> types to your forwarding decorator; ask for a <code>Signature.bind</code>-based validator.</p>
<p><b>Where AI goes wrong:</b> it overuses <code>**kwargs</code> in public APIs (losing autocomplete and typo detection), forgets to forward <code>**kwargs</code> in wrappers (silently dropping options), and mixes up "positional after keyword" ordering in generated calls.</p>
<p><b>What you must still own:</b> the binding algorithm, the five parameter kinds and their order, and API design taste: explicit keyword-only parameters for options, positional-only for names you may change, and forwarding only where you truly wrap something.</p>`,
    problems: [{
      title: 'Layered Settings Merger', level: 'Medium', tags: ['*args', '**kwargs', 'dict merge'], companies: ['Microsoft', 'Uber', 'Razorpay'],
      statement: `<p>Write <code>merge_settings(*layers, skip_none=True, **overrides)</code>. Each layer is a dict (defaults first, most specific last). Later layers win; keyword overrides win over everything. If <code>skip_none</code> is true, a value of <code>None</code> in a later layer or override does <b>not</b> replace an earlier real value. Return a new dict; do not modify the inputs. <code>skip_none</code> must be keyword-only.</p>`,
      constraints: `0 ≤ number of layers ≤ 100; each layer ≤ 10<sup>4</sup> keys`,
      example: `<p><code>merge_settings({'theme': 'light', 'lang': 'en'}, {'theme': None, 'font': 12}, lang='hi')</code><br>→ ${H.c('g', "{'theme': 'light', 'lang': 'hi', 'font': 12}")}: the None theme is skipped, the override sets lang.</p>`,
      brute: { why: `<p>For every key that appears anywhere, scan all layers again from the last to the first to find the winning value: O(K · L) work with K distinct keys and L layers, plus repeated scans of overrides. Correct but wasteful compared with one forward pass.</p>`, code: `def merge_settings(*layers, skip_none=True, **overrides):
    all_layers = list(layers) + [overrides]
    keys = []
    for layer in all_layers:
        for k in layer:
            if k not in keys:          # O(K) list check each time
                keys.append(k)
    result = {}
    for k in keys:
        for layer in reversed(all_layers):   # rescan for every key
            if k in layer and not (skip_none and layer[k] is None):
                result[k] = layer[k]
                break
    return result` },
      mcq: { q: 'Why is <code>skip_none</code> placed after <code>*layers</code>?', options: ['Anything after *args is keyword-only, so a dict can never be mistaken for it', 'It makes the function faster', 'Python requires booleans to come last'], answer: 0, explain: 'All extra positional arguments are swallowed by *layers, so skip_none can only be set by name — exactly what we want for a flag.' },
      hints: [`<p>Hint 1: Process layers in order and simply overwrite: the last writer wins automatically. Treat the overrides dict as one final layer.</p>`, `<p>Hint 2: <code>for layer in (*layers, overrides): for k, v in layer.items(): ...</code> — one pass over all keys.</p>`, `<p>Hint 3: Edge cases: no layers at all; None in the very first layer (keep it — nothing to protect yet, but a later real value should replace it); never mutate inputs. Recipe: result = {}; for each pair: if skip_none and v is None and k in result: continue; result[k] = v.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [
            [
              'merge_settings({\'theme\': \'light\', \'lang\': \'en\'}, {\'theme\': None, \'font\': 12}, lang=\'hi\')'
            ],
            { theme: 'light', lang: 'hi', font: 12 }
          ],
          [
            [
              'merge_settings({\'theme\': \'light\', \'lang\': \'en\'}, {\'theme\': None, \'font\': 12}, skip_none=False)'
            ],
            { theme: null, lang: 'en', font: 12 }
          ],
          [['merge_settings()'], {  }],
          [['merge_settings({\'a\': None}, {\'a\': None})'], { a: null }],
          [['merge_settings({\'a\': 1}, a=None)'], { a: 1 }],
          [['merge_settings({\'a\': 1}, {\'a\': 0})'], { a: 0 }],
          [['merge_settings({\'a\': 1}, {\'a\': \'\'}, {\'a\': False})'], { a: false }],
          [['merge_settings({\'a\': 1}, {\'b\': 2}, {\'a\': 3, \'c\': 4}, b=5)'], { a: 3, b: 5, c: 4 }],
          [['merge_settings({\'a\': 1}, a=None, skip_none=False)'], { a: null }],
          [
            ['(lambda d, u: [merge_settings(d, u, z=1), d, u])({\'a\': {\'k\': 1}}, {\'a\': {\'j\': 2}})'],
            [{ a: { j: 2 }, z: 1 }, { a: { k: 1 } }, { a: { j: 2 } }]
          ],
          [
            ['str(__import__(\'inspect\').signature(merge_settings).parameters[\'skip_none\'].kind)'],
            'KEYWORD_ONLY'
          ],
          [['len(merge_settings(*[{k: i for k in range(10000)} for i in range(100)]))'], 10000],
          [['merge_settings(*[{k: i for k in range(10000)} for i in range(100)])[5]'], 99],
          [['merge_settings(*[{\'a\': (None if i % 2 else i)} for i in range(100)])'], { a: 98 }],
          [['merge_settings({}, {}, {})'], {  }]
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
        approach: `<p>One forward pass: start with an empty dict, walk the layers and finally the overrides, and assign each key. Later assignments overwrite earlier ones, which is exactly "later wins". The only special case is a <code>None</code> that would overwrite an existing value.</p>`,
        code: { lang: 'python', run: true, code: `def merge_settings(*layers, skip_none=True, **overrides):
    result = {}
    for layer in (*layers, overrides):          # overrides act as the last layer
        for key, value in layer.items():
            if skip_none and value is None and key in result:
                continue                        # keep the earlier real value
            result[key] = value
    return result

base = {'theme': 'light', 'lang': 'en'}
user = {'theme': None, 'font': 12}
print(merge_settings(base, user, lang='hi'))
print(merge_settings(base, user, skip_none=False))
print(merge_settings())                         # {}
print(base)                                     # inputs untouched` },
        dry: { head: ['layer', 'key=value', 'action', 'result'], rows: [['base', "theme='light'", 'set', "{theme: light}"], ['base', "lang='en'", 'set', "{theme: light, lang: en}"], ['user', 'theme=None', '<span class="c-y">skip (None)</span>', 'unchanged'], ['user', 'font=12', 'set', '{…, font: 12}'], ['overrides', "lang='hi'", '<span class="c-g">overwrite</span>', "{theme: light, lang: hi, font: 12}"]] },
        complexity: `<p>O(total number of key/value pairs) time, O(K) extra space for the result. The brute force is O(K · L).</p>`,
        followUps: ['Support nested dicts (deep merge) recursively.', 'Return, for each key, which layer it came from (for debugging config).']
      }
    }]
  });
  /* ================= TOPIC 5: Decorators ================= */
  topics.push({
    title: 'Decorators: Wrapping a Function in Layers',
    analogy: `<p>A decorator is <b>gift wrapping</b>. The gift (your function) stays the same inside, but you can wrap it in paper that adds something: a ribbon that logs who opened it, a box that times how long unwrapping took, a lock that checks your ID first. Several wraps stack: the <b>last wrap you put on is the first one people touch</b>. And <code>functools.wraps</code> is the <b>label</b> you stick on the outside so everyone still knows what gift is inside.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A decorator is a function that <b>takes a function and returns a (usually new) function</b>. The <code>@</code> line is only shorthand:</p>
<pre>@timer
def work(): ...

# is exactly the same as:
def work(): ...
work = timer(work)</pre>
<p>The standard shape uses everything from the earlier topics — first-class functions, a closure over <code>func</code>, and <code>*args/**kwargs</code> forwarding:</p>
<pre>import functools

def timer(func):                      # receives the original function
    @functools.wraps(func)            # copy name/doc onto the wrapper
    def wrapper(*args, **kwargs):     # accepts ANY call
        start = time.perf_counter()
        result = func(*args, **kwargs)    # call the original
        print(func.__name__, time.perf_counter() - start)
        return result                 # don't forget to return it!
    return wrapper                    # the replacement function</pre>
<p><b>Two moments in time.</b> (1) <b>Decoration time</b> — when the <code>def</code> runs (usually at import): <code>timer(work)</code> executes once and returns <code>wrapper</code>. (2) <b>Call time</b> — every <code>work()</code> actually runs <code>wrapper</code>, which runs your extra code around the original.</p>
<p><b>Stacking.</b> With</p>
<pre>@bold
@italic
def hello(): return 'hi'</pre>
<p>Python applies the decorator <b>nearest the def first</b>: <code>hello = bold(italic(hello))</code>. At call time the <b>outermost</b> (top) wrapper runs first, calls the next one in, and results come back out in reverse. Think of layers of an onion.</p>
<p><b>Why functools.wraps?</b> Without it, the decorated function's <code>__name__</code> becomes <code>'wrapper'</code> and its docstring disappears — breaking logs, <code>help()</code>, debuggers, test frameworks and web routers that register by name. <code>@wraps(func)</code> copies <code>__name__</code>, <code>__qualname__</code>, <code>__doc__</code>, <code>__module__</code>, <code>__annotations__</code> and the <code>__dict__</code>, and sets <code>wrapper.__wrapped__ = func</code>.</p>
<p><b>Common real decorators:</b> <code>@functools.cache</code>, <code>@lru_cache</code>, <code>@property</code>, <code>@staticmethod</code>, <code>@classmethod</code>, <code>@dataclass</code>, <code>@contextlib.contextmanager</code>, web routes (<code>@app.get('/users')</code>), test markers (<code>@pytest.mark.parametrize</code>), and auth/retry/timing in production code.</p>`,
    clues: [
      '"add logging / timing / auth / caching to many functions without editing them" → decorator',
      '"cross-cutting concern" / "aspect" / "middleware for functions" → decorator',
      '"__name__ shows wrapper / docstring disappeared after decorating" → missing <code>@functools.wraps(func)</code>',
      '"decorated function returns None" → the wrapper forgot to <code>return func(...)</code>',
      '"in which order do stacked decorators run?" → applied bottom-up, executed top-down',
      '"code in the decorator runs on import" → decoration time vs call time'
    ],
    code: [{ lang: 'python', run: true, title: 'A complete, well-behaved decorator', code: `import functools
import time

def timer(func):
    """Report how long each call takes."""
    @functools.wraps(func)                    # keep func's name and docstring
    def wrapper(*args, **kwargs):             # forward any signature
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)      # call the original and return its result
        finally:
            ms = (time.perf_counter() - start) * 1000
            print(f'{func.__name__} took {ms:.2f} ms')
    return wrapper

@timer
def slow_sum(n):
    """Add the numbers 0..n-1."""
    return sum(range(n))

print(slow_sum(100_000))
print(slow_sum.__name__, '|', slow_sum.__doc__)
print(slow_sum.__wrapped__(10))               # the original, undecorated function` },
    { lang: 'python', run: true, title: 'Decoration time vs call time, and stacking order', code: `def announce(tag):
    def deco(func):
        print(f'[decoration time] {tag} wraps {func.__name__}')
        def wrapper(*args, **kwargs):
            print(f'  -> enter {tag}')
            result = func(*args, **kwargs)
            print(f'  <- leave {tag}')
            return f'{tag}({result})'
        return wrapper
    return deco

@announce('outer')        # applied second
@announce('inner')        # applied first (closest to def)
def hello():
    print('  running hello')
    return 'hi'

print('--- now calling ---')
print(hello())` }],
    codeTitle: ['timer with wraps', 'When things run'],
    viz: [{
      title: 'Stacked decorators: built bottom-up, run top-down',
      input: 'stars upper exclaim',
      inputLabel: 'decorators top → bottom (choose from: upper exclaim stars brackets twice reverse)',
      gen: function (input) {
        var decos = words(input);
        var F = { upper: function (s) { return s.toUpperCase(); }, exclaim: function (s) { return s + '!'; }, stars: function (s) { return '*' + s + '*'; }, brackets: function (s) { return '[' + s + ']'; }, twice: function (s) { return s + ' ' + s; }, reverse: function (s) { return s.split('').reverse().join(''); } };
        if (!decos.length) throw new Error('Enter at least one decorator, e.g. stars upper');
        if (decos.length > 5) throw new Error('Use at most 5 decorators');
        decos.forEach(function (d) { if (!F[d]) throw new Error('Unknown decorator "' + d + '". Use: upper exclaim stars brackets twice reverse'); });
        var codeLines = decos.map(function (d) { return '@' + d; }).concat(['def greet():', "    return 'hi'", '', 'print(greet())']);
        var code = codeLines.join('\n'), n = decos.length, frames = [];
        var layers = ['greet (original)'];
        frames.push(fr('Decoration time starts when Python runs the <code>def</code>. First the plain function object <b>greet</b> is created.', [cp(code, n + 1, 'ok'), { type: 'stack', label: 'layers around greet (bottom = original)', items: layers.slice(), hl: { 0: 'ok' } }]));
        var expr = 'greet';
        for (var i = n - 1; i >= 0; i--) {
          expr = decos[i] + '(' + expr + ')';
          layers.push(decos[i] + ' wrapper');
          var h = {}; h[layers.length - 1] = 'ok';
          frames.push(fr('Apply <code>@' + decos[i] + '</code> (line ' + (i + 1) + '), the nearest one not yet applied. Now <code>greet = ' + esc(expr) + '</code>. The name <b>greet</b> points at the new outer wrapper.', [cp(code, i + 1, 'cur'), { type: 'stack', label: 'layers around greet (bottom = original)', items: layers.slice(), hl: h }, vp({ greet: '<' + decos[i] + ' wrapper>' }, 'greet')]));
        }
        var call = [];
        for (var j = 0; j < n; j++) {
          call.push(decos[j] + ' wrapper');
          var hc = {}; hc[call.length - 1] = 'cur';
          frames.push(fr('Call time: <code>greet()</code> enters the <b>outermost</b> layer first. <b>' + decos[j] + '</b> wrapper runs its "before" code and calls the next layer inward.', [cp(code, n + 4, 'cur'), { type: 'stack', label: 'call stack', items: ['<module>'].concat(call), hl: (function () { var t = {}; t[call.length] = 'cur'; return t; })() }]));
        }
        call.push('greet()  [original]');
        var val = 'hi';
        frames.push(fr('Finally the original body runs and returns <b>\'hi\'</b>.', [cp(code, n + 2, 'ok'), { type: 'stack', label: 'call stack', items: ['<module>'].concat(call), hl: (function () { var t = {}; t[call.length] = 'ok'; return t; })() }, vp({ value: "'hi'" }, 'value')]));
        for (var k = n - 1; k >= 0; k--) {
          var before = val;
          val = F[decos[k]](val);
          call.pop();
          frames.push(fr('Unwinding: <b>' + decos[k] + '</b> wrapper receives <code>\'' + esc(before) + '\'</code> and returns <code>\'' + esc(val) + '\'</code>. Inner layers transform the result <b>first</b> on the way out.', [{ type: 'stack', label: 'call stack', items: ['<module>'].concat(call), hl: (function () { var t = {}; t[call.length] = 'cur'; return t; })() }, vp({ before: "'" + before + "'", after: "'" + val + "'" }, 'after')]));
        }
        frames.push(fr('Output: <code>' + esc(val) + '</code>. Rule: <b>applied bottom-up, entered top-down, results flow bottom-up</b>. Swap two decorators and see how the output changes.', [cp(code, n + 4, 'sel'), tx('<code>' + esc(val) + '</code>', 'stdout'), tx('<code>greet = ' + esc(expr) + '</code>', 'equivalent')]));
        return frames;
      }
    }, {
      title: 'functools.wraps: what the decorated function remembers about itself',
      gen: function () {
        var bare = ['def deco(func):', '    def wrapper(*args, **kwargs):', '        return func(*args, **kwargs)', '    return wrapper', '', '@deco', 'def area(r):', '    """Area of a circle."""', '    return 3.14159 * r * r'].join('\n');
        var good = ['import functools', 'def deco(func):', '    @functools.wraps(func)', '    def wrapper(*args, **kwargs):', '        return func(*args, **kwargs)', '    return wrapper'].join('\n');
        return [
          fr('Before decorating, <code>area</code> is an ordinary function with its own metadata.', [cp(bare, { 7: 'ok', 8: 'ok' }), vp({ __name__: "'area'", __doc__: "'Area of a circle.'", __wrapped__: '(none)' }, '__name__,__doc__', 'area metadata')]),
          fr('<code>@deco</code> replaces the name <code>area</code> with <code>wrapper</code>. The behaviour is fine, but the <b>identity</b> is now wrapper\'s.', [cp(bare, { 2: 'cur', 6: 'cur' }), vp({ __name__: "'wrapper'", __doc__: 'None', __wrapped__: '(none)' }, { __name__: 'bad', __doc__: 'bad' }, 'area metadata (no wraps)')]),
          fr('Why it matters: logs say "wrapper took 3 ms", <code>help(area)</code> shows nothing, routers that register by function name collide, and <code>inspect.signature</code> shows <code>(*args, **kwargs)</code>.', [{ type: 'table', label: 'who reads metadata', columns: ['tool', 'reads', 'without wraps'], rows: [['logging / tracing', '__name__ / __qualname__', 'every function is "wrapper"'], ['help() / IDE', '__doc__', 'docs lost'], ['inspect.signature', '__wrapped__', '(*args, **kwargs)'], ['web routers / test runners', '__name__', 'name clashes']], hl: { 0: 'bad', 2: 'bad' } }]),
          fr('<code>@functools.wraps(func)</code> is itself a decorator (built on <code>update_wrapper</code>) applied to <code>wrapper</code>: it copies the metadata from <code>func</code> and adds <code>__wrapped__</code>.', [cp(good, 3, 'ok'), vp({ __name__: "'area'", __doc__: "'Area of a circle.'", __wrapped__: '<function area>' }, '__name__,__doc__,__wrapped__', 'area metadata (with wraps)')]),
          fr('Bonus: <code>__wrapped__</code> lets tools reach the original — <code>inspect.signature</code> follows it to show <code>(r)</code>, and tests can call <code>area.__wrapped__(2)</code> to bypass the decorator.', [vp({ 'inspect.signature(area)': '(r)', 'area.__wrapped__(2)': '12.56636' }, 'inspect.signature(area)'), tx('Rule: <b>every</b> wrapper you write gets <code>@functools.wraps(func)</code>.', 'habit')])
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: forgetting to return', html: `<p>The wrapper calls the function but drops its result, so every decorated call returns <code>None</code>. One of the most common decorator bugs.</p>`, code: { lang: 'python', run: true, code: `import functools

def log_calls(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print('calling', func.__name__)
        func(*args, **kwargs)            # BUG: result thrown away
    return wrapper

@log_calls
def add(a, b):
    return a + b

print(add(2, 3))                         # calling add, then None` } },
      { title: 'Decorators that do not wrap: registration', html: `<p>A decorator may return the <b>same</b> function after recording it somewhere. This is how plugin systems, CLI command tables and web routers work — no wrapper, zero call overhead.</p>`, code: { lang: 'python', run: true, code: `HANDLERS = {}

def register(func):
    HANDLERS[func.__name__] = func     # side effect at decoration time
    return func                        # return the original unchanged

@register
def start():
    return 'starting'

@register
def stop():
    return 'stopping'

print(sorted(HANDLERS))
print(HANDLERS['stop']())` } },
      { title: 'Stateful decorator: counting calls with a function attribute', html: `<p>The wrapper is an object, so it can carry state as attributes. Each decorated function gets its own wrapper and therefore its own counter.</p>`, code: { lang: 'python', run: true, code: `import functools

def count_calls(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)
    wrapper.calls = 0
    return wrapper

@count_calls
def ping():
    return 'pong'

for _ in range(3):
    ping()
print(ping.calls, ping.__name__)       # 3 ping` } },
      { title: 'Decorating methods: self arrives in args', html: `<p>A function-based decorator works on methods unchanged, because the wrapper is a plain function: when called as <code>obj.method()</code>, <code>self</code> is simply the first item of <code>args</code>.</p>`, code: { lang: 'python', run: true, code: `import functools

def trace(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f'{func.__qualname__} args={args[1:]} (self={type(args[0]).__name__})')
        return func(*args, **kwargs)
    return wrapper

class Account:
    def __init__(self):
        self.balance = 0
    @trace
    def deposit(self, amount):
        self.balance += amount
        return self.balance

acct = Account()
print(acct.deposit(50))` } }
    ],
    deepDive: `<p>🟣 <b>Grammar and evaluation.</b> Since Python 3.9 (PEP 614) the thing after <code>@</code> can be <b>any expression</b> (<code>@buttons[0].on_click</code>, <code>@(lambda f: f)</code>). The decorator expressions are evaluated <b>top to bottom</b> first, then applied <b>bottom to top</b> to the freshly created function, and only then is the name bound — so inside a decorator, the module-level name still refers to the <i>old</i> object (or does not exist yet).</p>
<p><b>What <code>wraps</code> really does.</b> <code>functools.wraps(func)</code> returns <code>partial(update_wrapper, wrapped=func)</code>. <code>update_wrapper</code> copies <code>WRAPPER_ASSIGNMENTS</code> (<code>__module__</code>, <code>__name__</code>, <code>__qualname__</code>, <code>__doc__</code>, <code>__annotations__</code>, and since 3.12 <code>__type_params__</code>), merges <code>__dict__</code> (so attributes like <code>cache_info</code> propagate), and sets <code>__wrapped__</code>. <code>inspect.unwrap(f)</code> follows the <code>__wrapped__</code> chain to the bottom.</p>
<p><b>Class-based decorators.</b> A class with <code>__call__</code> can be a decorator (<code>self.func = func</code> in <code>__init__</code>), handy for complex state. Gotcha: an instance of such a class is <b>not a descriptor</b>, so applied to a method it will not receive <code>self</code> — you must implement <code>__get__</code> (e.g. return <code>functools.partial(self.__call__, instance)</code>). Plain function wrappers avoid this because functions are descriptors.</p>
<p><b>Async and generators.</b> A sync wrapper around an <code>async def</code> returns the coroutine without awaiting it, so timing/try-except code is wrong. Write <code>async def wrapper(...): return await func(...)</code> (check with <code>inspect.iscoroutinefunction</code>). Since 3.12, <code>inspect.markcoroutinefunction</code> helps frameworks detect wrapped coroutines.</p>
<p><b>Typing decorators.</b> Use <code>ParamSpec</code> + <code>TypeVar</code>: <code>def timer[**P, R](func: Callable[P, R]) -&gt; Callable[P, R]</code> (3.12 syntax) so type checkers keep the original signature. <code>Concatenate</code> expresses decorators that add or remove a leading argument.</p>
<p><b>Cost.</b> Each layer adds one Python-level call, packing of <code>*args</code>/<code>**kwargs</code>, and a frame. Negligible for I/O work, measurable for tight numeric loops — there, decorate the outer function, not the inner kernel.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> decorators are how you plug Python into AI frameworks: tool registration (<code>@tool</code> / <code>@mcp.tool()</code>), tracing and observability for LLM calls, retries with backoff, rate limits and caching of expensive model responses. These frameworks read <code>__name__</code>, <code>__doc__</code> and the signature to describe your function to the model — so <b>missing <code>functools.wraps</code> can literally change what the model sees</b>.</p>
<p><b>Use AI as a partner:</b> ask <code>"Write an async-aware version of this decorator with ParamSpec typing and tests"</code>; ask <code>"In which order do these five stacked decorators run? Draw it"</code> and verify by running it.</p>
<p><b>Where AI goes wrong:</b> forgets <code>wraps</code>, forgets to return the result, wraps async functions with sync wrappers, and stacks <code>@staticmethod</code>/<code>@property</code> in the wrong order relative to custom decorators.</p>
<p><b>What you must still own:</b> the <code>f = deco(f)</code> desugaring, decoration time vs call time, stacking order, and judging when a decorator hides too much behaviour from readers.</p>`,
    problems: [{
      title: 'Write @count_calls (with wraps)', level: 'Easy', tags: ['decorator', 'closure', 'functools.wraps'], companies: ['Amazon', 'Paytm', 'Adobe'],
      statement: `<p>Write a decorator <code>count_calls</code> that counts how many times the decorated function has been called. Expose the count as <code>func.calls</code> and add <code>func.reset()</code> to set it back to 0. The decorated function must keep its original <code>__name__</code> and docstring and must return exactly what the original returns, for any arguments.</p>`,
      constraints: `Works for any signature (positional, keyword, *args, **kwargs); counters of different functions are independent.`,
      example: `<p><code>@count_calls def add(a, b): return a + b</code> → <code>add(1, 2); add(3, b=4)</code> → ${H.c('g', 'add.calls == 2')}, <code>add.__name__ == 'add'</code>; after <code>add.reset()</code> → <code>add.calls == 0</code>.</p>`,
      brute: { why: `<p>Editing every function body to bump a global counter dict works, but it mixes bookkeeping into business logic, must be repeated in every function, and is easy to forget. Decorators exist exactly to remove this duplication.</p>`, code: `CALLS = {}

def add(a, b):
    CALLS['add'] = CALLS.get('add', 0) + 1     # copy-pasted bookkeeping
    return a + b

def mul(a, b):
    CALLS['mul'] = CALLS.get('mul', 0) + 1     # ... in every function
    return a * b` },
      mcq: { q: 'Where should the counter live so that two decorated functions have separate counts?', options: ['On (or in a closure of) each wrapper created by the decorator', 'In one module-level integer', 'Inside the original function body'], answer: 0, explain: 'The decorator runs once per decorated function, creating a new wrapper each time — state attached to that wrapper is per-function automatically.' },
      hints: [`<p>Hint 1: The decorator runs once per function. Anything you create inside it (a new wrapper, a new attribute) belongs to that function only.</p>`, `<p>Hint 2: Use <code>@functools.wraps(func)</code> on a <code>wrapper(*args, **kwargs)</code>, set <code>wrapper.calls = 0</code>, and attach a small <code>reset</code> function.</p>`, `<p>Hint 3: Remember to <b>return</b> the original's result. Recipe: wrapper increments wrapper.calls, then returns func(*args, **kwargs); define reset() that sets wrapper.calls = 0; attach it; return wrapper.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              '@count_calls\n' +
                'def add(a, b):\n' +
                '    """Add two numbers."""\n' +
                '    return a + b\n' +
                '\n' +
                '@count_calls\n' +
                'def greet(name=\'world\'):\n' +
                '    return \'hello \' + name\n' +
                'add(1, 2); add(3, b=4)\n' +
                'result = [add.calls, add.__name__, add.__doc__]'
            ],
            [2, 'add', 'Add two numbers.']
          ],
          [
            [
              '@count_calls\n' +
                'def add(a, b):\n' +
                '    """Add two numbers."""\n' +
                '    return a + b\n' +
                '\n' +
                '@count_calls\n' +
                'def greet(name=\'world\'):\n' +
                '    return \'hello \' + name\n' +
                'add(1, 2)\n' +
                'add.reset()\n' +
                'result = add.calls'
            ],
            0
          ],
          [
            [
              '@count_calls\n' +
                'def add(a, b):\n' +
                '    """Add two numbers."""\n' +
                '    return a + b\n' +
                '\n' +
                '@count_calls\n' +
                'def greet(name=\'world\'):\n' +
                '    return \'hello \' + name\n' +
                'r = [add(1, 2), add(3, b=4), greet(), greet(name=\'py\'), greet()]\n' +
                'result = [r, add.calls, greet.calls]'
            ],
            [[3, 7, 'hello world', 'hello py', 'hello world'], 2, 3]
          ],
          [
            [
              '@count_calls\n' +
                'def add(a, b):\n' +
                '    """Add two numbers."""\n' +
                '    return a + b\n' +
                '\n' +
                '@count_calls\n' +
                'def greet(name=\'world\'):\n' +
                '    return \'hello \' + name\n' +
                'result = [add.calls, greet.calls]'
            ],
            [0, 0]
          ],
          [
            [
              '@count_calls\n' +
                'def add(a, b):\n' +
                '    """Add two numbers."""\n' +
                '    return a + b\n' +
                '\n' +
                '@count_calls\n' +
                'def greet(name=\'world\'):\n' +
                '    return \'hello \' + name\n' +
                'add(1, 2); add.reset(); add(1, 2); add(1, 2)\n' +
                'result = [add.calls, greet.calls]'
            ],
            [2, 0]
          ],
          [
            [
              '@count_calls\n' +
                'def f(*args, **kwargs):\n' +
                '    return (args, kwargs)\n' +
                'result = [f(1, 2, k=3), f(), f.calls]'
            ],
            [[[1, 2], { k: 3 }], [[], {  }], 2]
          ],
          [
            [
              '@count_calls\n' +
                'def f(x):\n' +
                '    return x\n' +
                'for i in range(10**6):\n' +
                '    f(i)\n' +
                'result = [f.calls, f(5)]'
            ],
            [1000000, 5]
          ],
          [
            [
              '@count_calls\n' +
                'def f(x):\n' +
                '    raise ValueError(\'boom\')\n' +
                'try:\n' +
                '    f(1)\n' +
                'except ValueError:\n' +
                '    pass\n' +
                'result = f.calls'
            ],
            1
          ],
          [
            [
              '@count_calls\n' +
                'def f():\n' +
                '    return None\n' +
                'result = [f(), f.calls]'
            ],
            [null, 1]
          ],
          [
            [
              '@count_calls\n' +
                'def f(a, b=2, *, c=3):\n' +
                '    return a + b + c\n' +
                'result = [f(1), f(1, 1), f(1, c=0), str(__import__(\'inspect\').signature(f))]'
            ],
            [6, 5, 3, '(a, b=2, *, c=3)']
          ],
          [
            [
              '@count_calls\n' +
                'def fib(n):\n' +
                '    return n if n < 2 else fib(n - 1) + fib(n - 2)\n' +
                'result = [fib(10), fib.calls]'
            ],
            [55, 177]
          ],
          [
            [
              '@count_calls\n' +
                'def add(a, b):\n' +
                '    """Add two numbers."""\n' +
                '    return a + b\n' +
                '\n' +
                '@count_calls\n' +
                'def greet(name=\'world\'):\n' +
                '    return \'hello \' + name\n' +
                'result = [add.reset(), add.calls]'
            ],
            [null, 0]
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
        approach: `<p>Create a wrapper per decorated function, keep the count as an attribute on the wrapper (readable from outside as <code>add.calls</code>), and attach a <code>reset</code> closure that rebinds that attribute. <code>wraps</code> preserves identity.</p>`,
        code: { lang: 'python', run: true, code: `import functools

def count_calls(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)     # return the original result
    def reset():
        wrapper.calls = 0
    wrapper.calls = 0
    wrapper.reset = reset
    return wrapper

@count_calls
def add(a, b):
    """Add two numbers."""
    return a + b

@count_calls
def greet(name='world'):
    return f'hello {name}'

print(add(1, 2), add(3, b=4), greet(), greet(name='py'), greet())
print(add.calls, greet.calls)            # 2 3
print(add.__name__, add.__doc__)
add.reset()
print(add.calls)                         # 0` },
        dry: { head: ['call', 'add.calls', 'greet.calls', 'returned'], rows: [['add(1, 2)', '1', '0', '3'], ['add(3, b=4)', '2', '0', '7'], ['greet()', '2', '1', "'hello world'"], ["greet(name='py')", '2', '2', "'hello py'"], ['greet()', '2', '3', "'hello world'"], ['add.reset()', '<span class="c-g">0</span>', '3', 'None']] },
        complexity: `<p>O(1) extra time per call and O(1) space per decorated function.</p>`,
        followUps: ['Make it thread-safe (hint: <code>threading.Lock</code> around the increment, or <code>itertools.count</code>).', 'Count calls per distinct argument tuple.']
      }
    }]
  });
  /* ================= TOPIC 6: Decorators with arguments ================= */
  topics.push({
    title: 'Decorators with Arguments: Factories, Retry, Optional Parens & Class Decorators',
    analogy: `<p>A plain decorator is a <b>gift-wrapping machine</b> with one fixed paper. A decorator <b>with arguments</b> is a <b>machine shop</b>: you first tell it the settings ("red paper, 3 ribbons") and it <b>builds you a wrapping machine</b> with those settings; then that machine wraps your gift. So there are three steps: <b>configure the shop</b> → get a machine → wrap the gift. That is why decorators with arguments have <b>three nested functions</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>@retry(times=3)</code> is not "retry applied to the function". Python first <b>calls</b> <code>retry(times=3)</code>; whatever that returns is the real decorator, which is then applied:</p>
<pre>@retry(times=3)
def fetch(url): ...

# means:
decorator = retry(times=3)     # step 1: factory call with settings
fetch = decorator(fetch)       # step 2: normal decoration</pre>
<p>So you write <b>three levels</b>:</p>
<pre>def retry(times=3, exceptions=(Exception,)):   # level 1: settings (factory)
    def decorator(func):                          # level 2: receives the function
        @functools.wraps(func)
        def wrapper(*args, **kwargs):             # level 3: runs on every call
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise                     # give up: re-raise the last error
        return wrapper
    return decorator</pre>
${H.table(['Level', 'Runs when', 'Captures (closure)'], [['<code>retry(times=3)</code>', 'once, at decoration time', '—'], ['<code>decorator(func)</code>', 'once, right after', '<code>times</code>, <code>exceptions</code>'], ['<code>wrapper(*a, **kw)</code>', 'every call', '<code>times</code>, <code>exceptions</code>, <code>func</code>']])}
<p><b>Common mistake:</b> writing <code>@retry</code> (no parentheses) on a factory: Python calls <code>retry(fetch)</code>, so <code>times</code> becomes the function and your function name now points at <code>decorator</code>. Calling <code>fetch(url)</code> then gives confusing errors.</p>
<p><b>Optional-argument decorators</b> support both <code>@trace</code> and <code>@trace(prefix='&gt;&gt;')</code> using a sentinel first parameter: <code>def trace(func=None, *, prefix='')</code> — if <code>func</code> is given we were used bare; otherwise return a decorator.</p>
<p><b>Class decorators</b> take a <b>class</b> and return a (usually the same, modified) class: <code>@dataclass</code>, <code>@functools.total_ordering</code>, a <code>@register</code> that adds the class to a plugin registry. And a <b>class can be a decorator</b> if its instances are callable (<code>__call__</code>).</p>`,
    clues: [
      '"configurable decorator" / "@retry(times=3)" / "@rate_limit(per_second=5)" → three-level decorator factory',
      '"support both @deco and @deco(option=...)" → <code>def deco(func=None, *, option=...)</code> pattern',
      '"retry with exponential backoff on transient errors" → retry decorator with <code>exceptions</code> tuple and <code>delay * 2**attempt</code>',
      '"register handlers by event name / route path" → decorator factory that records into a dict',
      '"TypeError: decorator() missing 1 required positional argument" or the function becomes a decorator object → parentheses mismatch between definition and usage',
      '"modify every method of a class / auto-generate __init__" → class decorator (<code>@dataclass</code>-style)'
    ],
    code: [{ lang: 'python', run: true, title: 'retry(times, exceptions, delay) with exponential backoff', code: `import functools
import time

def retry(times=3, exceptions=(Exception,), delay=0.0):
    """Retry the call up to 'times' attempts on the given exceptions."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            wait = delay
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as err:
                    print(f'attempt {attempt} failed: {err!r}')
                    if attempt == times:
                        raise                      # out of attempts
                    time.sleep(wait)
                    wait *= 2                      # exponential backoff
        return wrapper
    return decorator

outcomes = iter(['fail', 'fail', 'ok'])           # simulate a flaky service

@retry(times=3, exceptions=(ConnectionError,), delay=0.001)
def fetch():
    if next(outcomes) == 'fail':
        raise ConnectionError('timeout')
    return 'data!'

print(fetch())

@retry(times=2, exceptions=(ValueError,))
def always_bad():
    raise ValueError('bad input')

try:
    always_bad()
except ValueError as e:
    print('gave up:', e)` },
    { lang: 'python', run: true, title: 'Optional arguments: @trace and @trace(prefix=...)', code: `import functools

def trace(func=None, *, prefix='TRACE'):
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            result = f(*args, **kwargs)
            print(f'{prefix} {f.__name__}{args} -> {result}')
            return result
        return wrapper
    if func is not None:          # used as @trace (no parentheses)
        return decorator(func)
    return decorator              # used as @trace(...) -> return the real decorator

@trace
def double(x):
    return 2 * x

@trace(prefix='>>')
def square(x):
    return x * x

double(4)
square(5)` }],
    codeTitle: ['Decorator factory', 'Optional-argument decorator'],
    viz: [{
      title: '@retry(times=N): three levels, then attempts at call time',
      input: '3 | fail fail ok',
      inputLabel: 'times | outcome of each attempt (fail / ok)',
      gen: function (input) {
        var p = String(input || '').split('|');
        var times = parseInt((p[0] || '').trim(), 10);
        if (isNaN(times) || times < 1 || times > 6) throw new Error('times must be 1..6, e.g.  3 | fail fail ok');
        var outs = words(p[1] || 'ok');
        outs.forEach(function (o) { if (o !== 'fail' && o !== 'ok') throw new Error('Outcomes must be fail or ok'); });
        if (outs.length > 8) throw new Error('At most 8 outcomes');
        var code = ['def retry(times):', '    def decorator(func):', '        def wrapper(*args, **kwargs):', '            for attempt in range(1, times + 1):', '                try:', '                    return func(*args, **kwargs)', '                except Exception:', '                    if attempt == times: raise', '                    sleep(delay); delay *= 2', '        return wrapper', '    return decorator', '', '@retry(times=' + times + ')', 'def fetch(): ...'].join('\n');
        var frames = [];
        frames.push(fr('Decoration step 1: the expression after <code>@</code> is <b>called</b>: <code>retry(times=' + times + ')</code>. It returns the inner <code>decorator</code> function, which captures <code>times</code> in a cell.', [cp(code, { 13: 'cur', 1: 'ok', 11: 'ok' }), { type: 'stack', label: 'nested function levels', items: ['retry(times=' + times + ')  → returns decorator'], hl: { 0: 'cur' } }, vp({ times: times }, 'times', 'captured by decorator')]));
        frames.push(fr('Decoration step 2: <code>decorator(fetch)</code> runs once and returns <code>wrapper</code>, a closure over <b>times</b> and <b>func</b>. Now <code>fetch = wrapper</code>.', [cp(code, { 2: 'cur', 10: 'ok', 14: 'ok' }), { type: 'stack', label: 'nested function levels', items: ['retry(times=' + times + ')', 'decorator(fetch)  → returns wrapper'], hl: { 1: 'cur' } }, vp({ times: times, func: '<function fetch>' }, 'func', 'captured by wrapper (cells)')]));
        var queue = outs.slice(), delay = 1, result = null;
        for (var a = 1; a <= times; a++) {
          var o = queue.length ? queue.shift() : 'ok';
          var qh = {};
          frames.push(fr('Call time, attempt <b>' + a + '</b> of ' + times + ': <code>wrapper()</code> calls the real <code>fetch()</code>.', [cp(code, { 4: 'cur', 6: 'cur' }), { type: 'stack', label: 'call stack', items: ['<module>', 'wrapper()  [fetch]', 'fetch()  original'], hl: { 2: 'cur' } }, vp({ attempt: a, times: times, delay: delay + 's' }, 'attempt'), { type: 'queue', label: 'remaining simulated outcomes', items: [o].concat(queue), hl: (qh[0] = o === 'ok' ? 'ok' : 'bad', qh) }]));
          if (o === 'ok') { result = 'ok'; frames.push(fr('<span class="c-g">Success</span> on attempt ' + a + '. <code>return func(...)</code> exits the loop immediately and the caller gets the data.', [cp(code, 6, 'ok'), vp({ attempt: a, result: "'data'" }, 'result')])); break; }
          if (a === times) { result = 'raise'; frames.push(fr('<span class="c-r">Failed on the last attempt</span>. <code>raise</code> (bare) re-raises the <b>original</b> exception with its traceback, so the caller sees the real error, not a vague "retry failed".', [cp(code, 8, 'bad'), vp({ attempt: a, times: times }, { attempt: 'bad' }), tx('ConnectionError: timeout', 'stderr')])); break; }
          frames.push(fr('Attempt ' + a + ' <span class="c-r">failed</span>. Not the last one, so sleep <b>' + delay + 's</b> and double the delay (exponential backoff) to give the service time to recover.', [cp(code, { 7: 'bad', 9: 'cur' }), vp({ attempt: a, 'next delay': (delay * 2) + 's' }, 'next delay')]));
          delay *= 2;
        }
        frames.push(fr(result === 'ok' ? 'Summary: the caller never saw the transient failures. In production, retry <b>only</b> on transient errors (timeouts, 503s) and only for idempotent operations.' : 'Summary: all ' + times + ' attempts failed, the last error propagated. Add jitter (random extra delay) in real systems so many clients do not retry in lock-step.', [{ type: 'table', label: 'three levels recap', columns: ['level', 'runs', 'captures'], rows: [['retry(times)', 'once', '—'], ['decorator(func)', 'once', 'times'], ['wrapper(*a, **kw)', 'every call', 'times, func']], hl: { 2: 'sel' } }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Event bus: a factory decorator that registers by name', html: `<p>The factory captures the event name; the decorator records the function and returns it unchanged. Several handlers can listen to the same event.</p>`, code: { lang: 'python', run: true, code: `from collections import defaultdict

LISTENERS = defaultdict(list)

def on(event):
    def decorator(func):
        LISTENERS[event].append(func)
        return func
    return decorator

def emit(event, **payload):
    return [handler(**payload) for handler in LISTENERS[event]]

@on('signup')
def send_welcome(user):
    return f'welcome mail to {user}'

@on('signup')
def add_to_crm(user):
    return f'crm record for {user}'

print(emit('signup', user='asha'))
print(emit('logout', user='asha'))     # no listeners -> []` } },
      { title: 'Predict the output: forgetting the parentheses', html: `<p>Using a factory without <code>()</code> passes the function in as <code>times</code>. The name now points at <code>decorator</code>, and calling it with a URL treats the URL as the function to wrap.</p>`, code: { lang: 'python', run: true, code: `import functools

def repeat(times):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return [func(*args, **kwargs) for _ in range(times)]
        return wrapper
    return decorator

@repeat(3)
def hi():
    return 'hi'
print(hi())                      # ['hi', 'hi', 'hi']

@repeat                          # WRONG: no parentheses
def oops():
    return 'oops'
print(oops.__name__)             # 'decorator' - oops is not what we think
try:
    oops()
except TypeError as e:
    print('TypeError:', e)` } },
      { title: 'Class decorator: add behaviour to every method', html: `<p>A class decorator receives the class object. Here we wrap every public method with a logger and return the same class.</p>`, code: { lang: 'python', run: true, code: `import functools

def log_methods(cls):
    for name, attr in list(vars(cls).items()):
        if callable(attr) and not name.startswith('_'):
            def make(f):
                @functools.wraps(f)
                def wrapper(*args, **kwargs):
                    print('call', f.__qualname__)
                    return f(*args, **kwargs)
                return wrapper
            setattr(cls, name, make(attr))   # factory avoids late binding of f
    return cls

@log_methods
class Cart:
    def __init__(self):
        self.items = []
    def add(self, item):
        self.items.append(item)
        return len(self.items)

c = Cart()
print(c.add('pen'), c.add('book'))` } },
      { title: 'A class as a decorator (callable instances)', html: `<p>Instances with <code>__call__</code> can replace functions. Good for decorators with lots of state; remember they do not bind <code>self</code> on methods unless you add <code>__get__</code>.</p>`, code: { lang: 'python', run: true, code: `import functools

class CallLimit:
    def __init__(self, limit):
        self.limit = limit
    def __call__(self, func):                     # acts as the decorator
        count = 0
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal count
            if count >= self.limit:
                raise RuntimeError(f'{func.__name__} called more than {self.limit} times')
            count += 1
            return func(*args, **kwargs)
        return wrapper

@CallLimit(2)
def launch():
    return 'launched'

print(launch(), launch())
try:
    launch()
except RuntimeError as e:
    print('RuntimeError:', e)` } }
    ],
    deepDive: `<p>🟣 <b>Why three levels, formally.</b> The decorator syntax only knows one rule: evaluate the expression after <code>@</code>, then call the result with the function. With arguments, the expression is a call, so you need a function that <i>returns</i> a decorator. You can flatten it with <code>functools.partial</code>: <code>def retry(func=None, *, times=3): if func is None: return partial(retry, times=times)</code> — the same optional-parens trick, written with partial.</p>
<p><b>Retry done right (production).</b> Retry only <b>idempotent</b> operations (GET, read, upsert with idempotency key), only on <b>transient</b> errors (timeouts, connection resets, HTTP 429/503 — not 400/404), cap total time, use exponential backoff <b>with jitter</b> (AWS's "full jitter": sleep random(0, base·2<sup>n</sup>)) to avoid thundering herds, honour <code>Retry-After</code> headers, and log each attempt. Libraries like <code>tenacity</code> and <code>backoff</code> implement this; know how to write the core yourself. For <code>async</code> functions, use <code>await asyncio.sleep</code>, never <code>time.sleep</code>, which would block the event loop.</p>
<p><b>Decorator order with built-ins.</b> <code>@staticmethod</code>/<code>@classmethod</code>/<code>@property</code> return descriptor objects, not functions; put them <b>outermost</b> (top) so your decorator wraps the plain function underneath. <code>@functools.cache</code> above <code>@property</code> fails; use <code>functools.cached_property</code> instead. Abstract methods: <code>@abstractmethod</code> should be innermost.</p>
<p><b>Class decorators vs metaclasses.</b> Class decorators run once after the class is built and are far simpler than metaclasses; prefer them (or <code>__init_subclass__</code>) for registration and validation. <code>@dataclass</code> is a class decorator that generates <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code> by inspecting annotations.</p>
<p><b>Testing decorated code.</b> Decorators with side effects at import (registration) make tests order-dependent; give registries a <code>clear()</code> or inject them. Use <code>func.__wrapped__</code> to unit-test the core logic without retries/caching.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> calls to LLM APIs are slow, rate-limited and occasionally fail — so <code>@retry(...)</code>, <code>@rate_limit(...)</code>, <code>@timeout(...)</code> and <code>@trace(...)</code> decorators are everywhere in AI application code, and agent frameworks use factory decorators like <code>@tool(name=..., description=...)</code>.</p>
<p><b>Use AI as a partner:</b> ask <code>"Write a retry decorator with full jitter, a max total time, async support and tests that don't actually sleep"</code>, then review: does it retry non-idempotent calls? Does it swallow the final exception?</p>
<p><b>Where AI goes wrong:</b> retries on <i>every</i> exception (including bugs like <code>KeyError</code>), uses <code>time.sleep</code> inside async code, loses the original traceback by raising a new generic exception, and mixes up <code>@deco</code> vs <code>@deco()</code> for factory decorators.</p>
<p><b>What you must still own:</b> the three-level mental model, which errors are safe to retry, and keeping decorators small and obvious so reviewers can see what each call really does.</p>`,
    problems: [{
      title: 'Write @retry(times, exceptions)', level: 'Medium', tags: ['decorator factory', 'exceptions', 'closure'], companies: ['Google', 'Stripe', 'Zomato'],
      statement: `<p>Write a decorator factory <code>retry(times=3, exceptions=(Exception,))</code>. The decorated function is called up to <code>times</code> times. If it raises one of <code>exceptions</code>, try again; if it succeeds, return its result immediately. If the last attempt fails, re-raise that last exception (not a new one). Exceptions not in the tuple must propagate immediately without retrying. Record the number of attempts used by the last call in <code>wrapper.last_attempts</code>.</p>`,
      constraints: `1 ≤ times ≤ 10; must preserve the original function's name and docstring.`,
      example: `<p>A function that fails twice with <code>ConnectionError</code> then returns <code>'ok'</code>, decorated with <code>@retry(times=3, exceptions=(ConnectionError,))</code> → returns ${H.c('g', "'ok'")} with <code>last_attempts == 3</code>. If it raised <code>KeyError</code> instead → ${H.c('r', 'KeyError raised immediately')}, <code>last_attempts == 1</code>.</p>`,
      brute: { why: `<p>Copy-pasting a <code>for</code>/<code>try</code> loop inside every function that needs retrying duplicates logic, gets subtle details wrong in some copies (catching everything, losing the traceback) and mixes infrastructure with business code.</p>`, code: `def fetch_user(load):
    last_error = None
    for attempt in range(3):                # duplicated in every function...
        try:
            return load()
        except Exception as e:             # catches bugs too
            last_error = e
    raise RuntimeError('failed') from last_error   # loses the original type` },
      mcq: { q: 'How many nested functions does <code>retry(times=3)</code> need?', options: ['Three: factory(settings) → decorator(func) → wrapper(*args, **kwargs)', 'One: wrapper only', 'Two: the factory can take func and settings together'], answer: 0, explain: '<code>@retry(times=3)</code> first calls retry with settings; the result must be a decorator that takes func and returns the wrapper.' },
      hints: [`<p>Hint 1: Write the plain decorator first (decorator + wrapper), then wrap it in an outer function that receives the settings and returns it.</p>`, `<p>Hint 2: Inside wrapper: <code>for attempt in range(1, times + 1): try: return func(...) except exceptions: if attempt == times: raise</code>. A bare <code>raise</code> re-raises the current exception unchanged.</p>`, `<p>Hint 3: Exceptions outside the tuple are simply not caught, so they propagate on the first attempt. Set <code>wrapper.last_attempts = attempt</code> before each try. Use <code>@functools.wraps(func)</code>.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'def make_flaky(script):\n' +
                '    steps = iter(script)\n' +
                '    def call():\n' +
                '        step = next(steps)\n' +
                '        if step == \'fail\':\n' +
                '            raise ConnectionError(\'timeout\')\n' +
                '        if step == \'bug\':\n' +
                '            raise KeyError(\'missing\')\n' +
                '        return step\n' +
                '    return call\n' +
                'w = retry(times=3, exceptions=(ConnectionError,))(make_flaky([\'fail\', \'fail\', \'ok\']))\n' +
                'result = [w(), w.last_attempts]'
            ],
            ['ok', 3]
          ],
          [
            [
              'def make_flaky(script):\n' +
                '    steps = iter(script)\n' +
                '    def call():\n' +
                '        step = next(steps)\n' +
                '        if step == \'fail\':\n' +
                '            raise ConnectionError(\'timeout\')\n' +
                '        if step == \'bug\':\n' +
                '            raise KeyError(\'missing\')\n' +
                '        return step\n' +
                '    return call\n' +
                'w = retry(times=3, exceptions=(ConnectionError,))(make_flaky([\'bug\']))\n' +
                'try:\n' +
                '    w()\n' +
                'except KeyError:\n' +
                '    result = [\'KeyError\', w.last_attempts]'
            ],
            ['KeyError', 1]
          ],
          [
            [
              'def make_flaky(script):\n' +
                '    steps = iter(script)\n' +
                '    def call():\n' +
                '        step = next(steps)\n' +
                '        if step == \'fail\':\n' +
                '            raise ConnectionError(\'timeout\')\n' +
                '        if step == \'bug\':\n' +
                '            raise KeyError(\'missing\')\n' +
                '        return step\n' +
                '    return call\n' +
                'w = retry(times=2, exceptions=(ConnectionError,))(make_flaky([\'fail\', \'fail\']))\n' +
                'try:\n' +
                '    w()\n' +
                'except ConnectionError:\n' +
                '    result = [\'ConnectionError\', w.last_attempts]'
            ],
            ['ConnectionError', 2]
          ],
          [
            [
              'def make_flaky(script):\n' +
                '    steps = iter(script)\n' +
                '    def call():\n' +
                '        step = next(steps)\n' +
                '        if step == \'fail\':\n' +
                '            raise ConnectionError(\'timeout\')\n' +
                '        if step == \'bug\':\n' +
                '            raise KeyError(\'missing\')\n' +
                '        return step\n' +
                '    return call\n' +
                'w = retry()(make_flaky([\'ok\']))\n' +
                'result = [w(), w.last_attempts]'
            ],
            ['ok', 1]
          ],
          [
            [
              'raised = []\n' +
                'def f():\n' +
                '    e = ConnectionError(str(len(raised)))\n' +
                '    raised.append(e)\n' +
                '    raise e\n' +
                'w = retry(times=3, exceptions=(ConnectionError,))(f)\n' +
                'try:\n' +
                '    w()\n' +
                'except ConnectionError as err:\n' +
                '    result = [err is raised[-1], str(err), len(raised)]'
            ],
            [true, '2', 3]
          ],
          [
            [
              'calls = []\n' +
                '@retry(times=1)\n' +
                'def f():\n' +
                '    calls.append(1)\n' +
                '    raise ValueError(\'x\')\n' +
                'try:\n' +
                '    f()\n' +
                'except ValueError:\n' +
                '    pass\n' +
                'result = [len(calls), f.last_attempts]'
            ],
            [1, 1]
          ],
          [
            [
              'calls = []\n' +
                '@retry(times=10)\n' +
                'def f():\n' +
                '    calls.append(1)\n' +
                '    raise ValueError(\'x\')\n' +
                'try:\n' +
                '    f()\n' +
                'except ValueError:\n' +
                '    pass\n' +
                'result = [len(calls), f.last_attempts]'
            ],
            [10, 10]
          ],
          [
            [
              '@retry(times=3)\n' +
                'def f(a, b=1):\n' +
                '    """doc"""\n' +
                '    return a + b\n' +
                'result = [f(1), f(1, b=5), f.__name__, f.__doc__]'
            ],
            [2, 6, 'f', 'doc']
          ],
          [
            [
              '@retry(times=3, exceptions=(ValueError,))\n' +
                'def f():\n' +
                '    raise KeyboardInterrupt()\n' +
                'try:\n' +
                '    f()\n' +
                'except KeyboardInterrupt:\n' +
                '    result = f.last_attempts'
            ],
            1
          ],
          [
            [
              '@retry(times=3)\n' +
                'def f():\n' +
                '    return 1\n' +
                'result = [f.last_attempts, f(), f.last_attempts]'
            ],
            [0, 1, 1]
          ],
          [
            [
              'def make_flaky(script):\n' +
                '    steps = iter(script)\n' +
                '    def call():\n' +
                '        step = next(steps)\n' +
                '        if step == \'fail\':\n' +
                '            raise ConnectionError(\'timeout\')\n' +
                '        if step == \'bug\':\n' +
                '            raise KeyError(\'missing\')\n' +
                '        return step\n' +
                '    return call\n' +
                'w = retry(times=3, exceptions=(ConnectionError,))(make_flaky([\'fail\', \'ok\', \'ok\']))\n' +
                'r = [w(), w.last_attempts, w(), w.last_attempts]\n' +
                'result = r'
            ],
            ['ok', 2, 'ok', 1]
          ],
          [
            [
              'a = retry(times=2)(lambda: 1)\n' +
                'b = retry(times=5)(lambda: 2)\n' +
                'a(); b()\n' +
                'result = [a.last_attempts, b.last_attempts]'
            ],
            [1, 1]
          ],
          [
            [
              'def make_flaky(script):\n' +
                '    steps = iter(script)\n' +
                '    def call():\n' +
                '        step = next(steps)\n' +
                '        if step == \'fail\':\n' +
                '            raise ConnectionError(\'timeout\')\n' +
                '        if step == \'bug\':\n' +
                '            raise KeyError(\'missing\')\n' +
                '        return step\n' +
                '    return call\n' +
                'w = retry(times=3, exceptions=(ConnectionError, KeyError))(make_flaky([\'fail\', \'bug\', \'done\']))\n' +
                'result = [w(), w.last_attempts]'
            ],
            ['done', 3]
          ],
          [
            [
              'n = [0]\n' +
                '@retry(times=5, exceptions=(ValueError,))\n' +
                'def f():\n' +
                '    n[0] += 1\n' +
                '    if n[0] < 5:\n' +
                '        raise ValueError(n[0])\n' +
                '    return n[0]\n' +
                'result = [f(), f.last_attempts]'
            ],
            [5, 5]
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
        approach: `<p>Three levels: the factory captures <code>times</code> and <code>exceptions</code>; the decorator captures <code>func</code>; the wrapper loops over attempts and returns on success. Catch only the configured exceptions; on the last attempt use bare <code>raise</code> so the original exception and traceback reach the caller.</p>`,
        code: { lang: 'python', run: true, code: `import functools

def retry(times=3, exceptions=(Exception,)):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                wrapper.last_attempts = attempt
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise              # re-raise the ORIGINAL last exception
        wrapper.last_attempts = 0
        return wrapper
    return decorator

def make_flaky(script):
    """Return a function that follows the script: 'fail' raises, anything else returns."""
    steps = iter(script)
    def call():
        step = next(steps)
        if step == 'fail':
            raise ConnectionError('timeout')
        if step == 'bug':
            raise KeyError('missing')
        return step
    return call

ok_later = retry(times=3, exceptions=(ConnectionError,))(make_flaky(['fail', 'fail', 'ok']))
print(ok_later(), ok_later.last_attempts)          # ok 3

bug = retry(times=3, exceptions=(ConnectionError,))(make_flaky(['bug']))
try:
    bug()
except KeyError as e:
    print('KeyError', e, 'after', bug.last_attempts, 'attempt')

dead = retry(times=2, exceptions=(ConnectionError,))(make_flaky(['fail', 'fail']))
try:
    dead()
except ConnectionError as e:
    print('ConnectionError', e, 'after', dead.last_attempts, 'attempts')` },
        dry: { head: ['attempt', 'func outcome', 'caught?', 'action'], rows: [['1', 'ConnectionError', 'yes (in tuple)', 'attempt &lt; times → loop'], ['2', 'ConnectionError', 'yes', 'loop'], ['3', "returns 'ok'", '—', '<span class="c-g">return ok</span>'], ['1 (bug case)', 'KeyError', '<span class="c-r">no</span>', 'propagates immediately']] },
        complexity: `<p>At most <code>times</code> calls of the function per invocation; O(1) extra space. Real versions add sleeps: total wait with backoff base·(2<sup>times−1</sup> − 1).</p>`,
        followUps: ['Add exponential backoff with full jitter and a <code>max_delay</code> cap.', 'Support <code>async def</code> functions with <code>asyncio.sleep</code>.', 'Make <code>@retry</code> usable without parentheses too.']
      }
    }]
  });
  /* ================= TOPIC 7: functools ================= */
  topics.push({
    title: 'functools Toolkit: partial, lru_cache / cache, reduce (and friends)',
    analogy: `<p><b>partial</b> is a <b>pre-filled form</b>: the office prints a form with your name and address already filled in, so you only add the date each time. <b>lru_cache</b> is a <b>sticky-note board</b> next to a slow calculator: before calculating, look for a note with the answer; if the board is full, throw away the note nobody has looked at for the longest time. <b>reduce</b> is a <b>snowball rolling downhill</b>: it starts small and picks up one item at a time until one big ball is left.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>functools</code> is the standard library's toolbox for higher-order functions. Four tools appear in almost every interview:</p>
<h4>1. functools.partial — freeze some arguments</h4>
<pre>from functools import partial
parse_binary = partial(int, base=2)
parse_binary('1011')        # 11, same as int('1011', base=2)</pre>
<p>It returns a new callable that remembers <code>func</code>, some positional <code>args</code> (added at the front) and some <code>keywords</code> (which callers may still override). Inspect them as <code>p.func</code>, <code>p.args</code>, <code>p.keywords</code>.</p>
<h4>2. functools.lru_cache / functools.cache — memoize</h4>
<pre>from functools import lru_cache
@lru_cache(maxsize=128)       # keep the 128 most recently used results
def fib(n):
    return n if n &lt; 2 else fib(n - 1) + fib(n - 2)</pre>
<p>It stores <code>arguments → result</code> in a dict. A repeat call with the same arguments returns the stored result instantly (a <b>hit</b>). When the cache is full it evicts the <b>Least Recently Used</b> entry. <code>@cache</code> (3.9+) = <code>lru_cache(maxsize=None)</code>: unbounded, a bit faster. Check effectiveness with <code>fib.cache_info()</code> → <code>CacheInfo(hits, misses, maxsize, currsize)</code>; empty it with <code>fib.cache_clear()</code>. Arguments must be <b>hashable</b> (no lists/dicts), and the function should be <b>pure</b> (same input → same output, no side effects).</p>
<h4>3. functools.reduce — fold a sequence into one value</h4>
<pre>from functools import reduce
reduce(lambda acc, x: acc + x, [1, 2, 3, 4], 0)    # ((((0+1)+2)+3)+4) = 10</pre>
<p>It keeps an accumulator: <code>acc = f(acc, item)</code> for each item. Always pass the <b>initial</b> value when the sequence might be empty (otherwise <code>TypeError</code>). For plain sums, products, max, joins, prefer <code>sum</code>, <code>math.prod</code>, <code>max</code>, <code>''.join</code> — they are clearer and faster.</p>
<h4>4. functools.wraps — covered in the decorator topic: always use it in wrappers.</h4>
${H.table(['Tool', 'Use it when', 'Watch out'], [['<code>partial</code>', 'callbacks, key functions, configuring a function once', 'keywords can be overridden by the caller'], ['<code>lru_cache</code>/<code>cache</code>', 'pure, expensive, repeated calls (DP, I/O lookups)', 'hashable args only; memory; methods keep self alive'], ['<code>reduce</code>', 'fold with a custom combine (compose, merge, gcd of list)', 'empty input needs initial; readability'], ['<code>wraps</code>', 'every decorator', 'forgetting it hides name/doc']])}
<p><b>Friends worth knowing:</b> <code>cached_property</code> (compute an attribute once per instance), <code>total_ordering</code> (write <code>__eq__</code> + one of <code>__lt__</code>… and get the rest), <code>singledispatch</code> (choose an implementation by the type of the first argument), <code>cmp_to_key</code> (use an old-style compare function as a sort key), and <code>partialmethod</code>.</p>`,
    clues: [
      '"overlapping subproblems" / "same recursive call repeated" / "memoize" → <code>@lru_cache(maxsize=None)</code> or <code>@cache</code> on a pure function',
      '"bounded memory cache / evict least recently used" → <code>lru_cache(maxsize=k)</code> (or OrderedDict for a hand-written LRU)',
      '"fix some arguments and pass the rest later" / "callback needs extra parameters" → <code>partial</code>',
      '"combine a list into one value with a custom operation" / "compose functions" → <code>reduce</code>',
      '"TypeError: unhashable type: \'list\'" from a cached function → convert args to tuples',
      '"sort with a custom comparator returning -1/0/1" → <code>cmp_to_key</code>',
      '"function behaves differently per argument type" → <code>singledispatch</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'lru_cache turns exponential recursion into linear', code: `from functools import lru_cache, cache
import sys

calls = 0
def fib_slow(n):
    global calls
    calls += 1
    return n if n < 2 else fib_slow(n - 1) + fib_slow(n - 2)

print(fib_slow(25), 'calls:', calls)          # ~240k calls

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(25), fib.cache_info())              # 26 misses only
print(fib(90))                                # instant
fib.cache_clear()
print(fib.cache_info())

@cache                                        # same as lru_cache(maxsize=None)
def grid_paths(r, c):
    if r == 0 or c == 0:
        return 1
    return grid_paths(r - 1, c) + grid_paths(r, c - 1)

print(grid_paths(16, 16))
print(sys.getrecursionlimit() > 100)` },
    { lang: 'python', run: true, title: 'partial and reduce in practice', code: `from functools import partial, reduce
import operator

# partial: freeze arguments
parse_bin = partial(int, base=2)
parse_hex = partial(int, base=16)
print(parse_bin('1011'), parse_hex('ff'))           # 11 255
print(parse_bin.func, parse_bin.args, parse_bin.keywords)

def power(base, exp):
    return base ** exp
square = partial(power, exp=2)
cube = partial(power, exp=3)
print(square(7), cube(2), square(3, exp=4))         # keyword can be overridden

# reduce: fold left with an accumulator
nums = [3, 1, 4, 1, 5]
print(reduce(operator.add, nums, 0))                # 14
print(reduce(lambda acc, x: acc * 10 + x, nums))    # 31415 - digits to number
print(reduce(operator.add, [], 0))                  # 0 thanks to initial

# compose functions right-to-left with reduce
def compose(*fns):
    return reduce(lambda f, g: lambda x: f(g(x)), fns, lambda x: x)
inc_then_double = compose(lambda x: x * 2, lambda x: x + 1)
print(inc_then_double(5))                           # (5+1)*2 = 12` }],
    codeTitle: ['Memoization', 'partial + reduce'],
    viz: [{
      title: 'lru_cache(maxsize): hits, misses and LRU eviction',
      input: '3 | 1 2 3 1 4 2 5 1',
      inputLabel: 'maxsize | sequence of calls f(x) (f(x) = x*x, pretend it is slow)',
      gen: function (input) {
        var p = String(input || '').split('|');
        var maxsize = parseInt((p[0] || '').trim(), 10);
        if (isNaN(maxsize) || maxsize < 1 || maxsize > 6) throw new Error('maxsize must be 1..6, e.g.  3 | 1 2 3 1 4');
        var calls = words(p[1]).map(Number);
        if (!calls.length || calls.some(isNaN)) throw new Error('After | give numbers, e.g. 1 2 3 1');
        if (calls.length > 14) throw new Error('At most 14 calls');
        var order = [], cache = {}, hits = 0, misses = 0, frames = [];
        var code = ['@lru_cache(maxsize=' + maxsize + ')', 'def f(x):', '    return x * x    # imagine: slow DB / API call'].join('\n');
        function parts(hlKey, cls, qhl) {
          var ents = order.map(function (k) { return [String(k), String(cache[k])]; });
          var mh = {}; if (hlKey !== null && hlKey !== undefined) mh[String(hlKey)] = cls;
          return [{ type: 'queue', label: 'recency order', items: order.map(String), frontLabel: 'LRU (evict next)', backLabel: 'MRU', hl: qhl || {} }, { type: 'map', label: 'cache dict: args → result', entries: ents, hl: mh }, vp({ hits: hits, misses: misses, currsize: order.length, maxsize: maxsize }, cls === 'ok' ? 'hits' : (cls === 'cur' ? 'misses' : ''))];
        }
        frames.push(fr('<code>@lru_cache(maxsize=' + maxsize + ')</code> wraps <code>f</code> with a dict for results plus a recency list. Empty at first.', [cp(code, 1, 'cur')].concat(parts(null))));
        calls.forEach(function (x) {
          var pos = order.indexOf(x);
          if (pos >= 0) {
            hits++;
            order.splice(pos, 1); order.push(x);
            var qh = {}; qh[order.length - 1] = 'ok';
            frames.push(fr('<code>f(' + x + ')</code>: key <b>' + x + '</b> is in the cache → <span class="c-g">HIT</span>. Return ' + cache[x] + ' without running the body, and move ' + x + ' to the <b>most recently used</b> end.', [cp(code, 1, 'ok')].concat(parts(x, 'ok', qh))));
          } else {
            misses++;
            var evicted = null;
            if (order.length >= maxsize) {
              evicted = order[0];
              var qb = {}; qb[0] = 'bad';
              frames.push(fr('<code>f(' + x + ')</code>: <span class="c-r">MISS</span> and the cache is full (' + maxsize + '). Evict the <b>least recently used</b> key <b>' + evicted + '</b> first.', [cp(code, 1, 'bad')].concat(parts(evicted, 'bad', qb))));
              order.shift(); delete cache[evicted];
            }
            cache[x] = x * x; order.push(x);
            var qn = {}; qn[order.length - 1] = 'cur';
            frames.push(fr('<code>f(' + x + ')</code>: ' + (evicted === null ? '<span class="c-r">MISS</span> → ' : '') + 'run the real body (' + x + '*' + x + ' = ' + (x * x) + '), store it under key ' + x + ' as the most recent entry.', [cp(code, 3, 'cur')].concat(parts(x, 'cur', qn))));
          }
        });
        frames.push(fr('<code>f.cache_info()</code> → <b>CacheInfo(hits=' + hits + ', misses=' + misses + ', maxsize=' + maxsize + ', currsize=' + order.length + ')</b>. Hit rate ' + Math.round(100 * hits / calls.length) + '%. A bigger maxsize trades memory for more hits.', [tx('CacheInfo(hits=' + hits + ', misses=' + misses + ', maxsize=' + maxsize + ', currsize=' + order.length + ')', 'cache_info()'), { type: 'bars', label: 'hits vs misses', values: [hits, misses], texts: [hits + ' hits', misses + ' misses'], hl: { 0: 'ok', 1: 'bad' } }]));
        return frames;
      }
    }, {
      title: 'reduce: the accumulator rolls through the list',
      input: '3 1 4 1 5 | +',
      inputLabel: 'numbers | operation (+ * max min digits)',
      gen: function (input) {
        var p = String(input || '').split('|');
        var xs = words(p[0]).map(Number);
        var op = (p[1] || '+').trim();
        if (!xs.length || xs.some(isNaN)) throw new Error('Enter numbers, then | and an op, e.g. 3 1 4 | +');
        if (xs.length > 10) throw new Error('At most 10 numbers');
        var ops = { '+': [function (a, b) { return a + b; }, 'lambda acc, x: acc + x', 0], '*': [function (a, b) { return a * b; }, 'lambda acc, x: acc * x', 1], 'max': [function (a, b) { return Math.max(a, b); }, 'lambda acc, x: acc if acc >= x else x', null], 'min': [function (a, b) { return Math.min(a, b); }, 'lambda acc, x: acc if acc <= x else x', null], 'digits': [function (a, b) { return a * 10 + b; }, 'lambda acc, x: acc * 10 + x', 0] };
        if (!ops[op]) throw new Error('Op must be one of: + * max min digits');
        var f = ops[op][0], init = ops[op][2];
        var code = 'from functools import reduce\nresult = reduce(' + ops[op][1] + ', ' + JSON.stringify(xs).replace(/,/g, ', ') + (init === null ? '' : ', ' + init) + ')\nprint(result)';
        var frames = [], acc, start, hist = [];
        if (init === null) { acc = xs[0]; start = 1; frames.push(fr('No initial value given, so the <b>first item</b> (' + xs[0] + ') becomes the starting accumulator. (With an empty list this would raise <code>TypeError</code>.)', [cp(code, 2), { type: 'array', label: 'items', values: xs, hl: { 0: 'done' } }, vp({ acc: acc }, 'acc')])); }
        else { acc = init; start = 0; frames.push(fr('Start with the <b>initial</b> value <b>' + init + '</b> (the identity for this op, so an empty list safely returns ' + init + ').', [cp(code, 2), { type: 'array', label: 'items', values: xs }, vp({ acc: acc }, 'acc')])); }
        hist.push(acc);
        for (var i = start; i < xs.length; i++) {
          var before = acc; acc = f(acc, xs[i]); hist.push(acc);
          var h = {}; for (var d = 0; d < i; d++) h[d] = 'done'; h[i] = 'cur';
          frames.push(fr('Step: <code>acc = f(' + before + ', ' + xs[i] + ')</code> → <b>' + acc + '</b>. The function sees only the running result and the next item.', [cp(code, 2, 'cur'), { type: 'array', label: 'items', values: xs, hl: h, ptr: (function () { var t = {}; t[i] = 'x'; return t; })() }, vp({ acc: acc, x: xs[i] }, 'acc'), { type: 'bars', label: 'accumulator after each step', values: hist.slice() }]));
        }
        frames.push(fr('All items consumed → <code>reduce</code> returns <b>' + acc + '</b>. That is <code>f(f(f(…), …), …)</code> — a left fold.' + (op === '+' ? ' For this case, <code>sum(xs)</code> is clearer and faster.' : op === '*' ? ' For this case, <code>math.prod(xs)</code> is clearer.' : ''), [cp(code, 3, 'sel'), tx('<code>' + acc + '</code>', 'stdout')]));
        return frames;
      }
    }],
    examples: [
      { title: 'partial for callbacks and sort keys', html: `<p>Callbacks often receive fewer arguments than your function needs. <code>partial</code> pre-fills the extra ones — and unlike a lambda in a loop, it captures the <b>value</b> right away.</p>`, code: { lang: 'python', run: true, code: `from functools import partial

def notify(channel, user, message):
    return f'[{channel}] @{user}: {message}'

alert_ops = partial(notify, 'ops')            # channel frozen
print(alert_ops('asha', 'disk 90% full'))

callbacks = [partial(notify, 'build', u) for u in ['ravi', 'mei']]
print([cb('passed') for cb in callbacks])     # each keeps its own user

def distance(point, origin):
    return abs(point[0] - origin[0]) + abs(point[1] - origin[1])
pts = [(5, 5), (1, 2), (3, 0)]
print(sorted(pts, key=partial(distance, origin=(0, 0))))` } },
      { title: 'lru_cache gotchas: unhashable args and typed=', html: `<p>The cache key is built from the arguments, so they must be hashable. <code>typed=True</code> keeps <code>f(3)</code> and <code>f(3.0)</code> as separate entries. Keyword order also produces different keys.</p>`, code: { lang: 'python', run: true, code: `from functools import lru_cache

@lru_cache(maxsize=None)
def total(items):
    return sum(items)

try:
    total([1, 2, 3])
except TypeError as e:
    print('TypeError:', e)
print(total((1, 2, 3)))                 # tuples are hashable

@lru_cache(maxsize=None, typed=True)
def describe(x):
    return f'{x!r} of {type(x).__name__}'
print(describe(3), '|', describe(3.0))
print(describe.cache_info().currsize)   # 2 separate entries` } },
      { title: 'cached_property, total_ordering, singledispatch', html: `<p>Three more functools helpers: compute an attribute once per instance; generate comparison methods; dispatch on argument type.</p>`, code: { lang: 'python', run: true, code: `from functools import cached_property, total_ordering, singledispatch

class Report:
    def __init__(self, rows):
        self.rows = rows
    @cached_property
    def total(self):
        print('  (computing total once)')
        return sum(self.rows)

r = Report([5, 10, 20])
print(r.total, r.total)               # computed once, then stored on r

@total_ordering
class Version:
    def __init__(self, major, minor):
        self.key = (major, minor)
    def __eq__(self, other):
        return self.key == other.key
    def __lt__(self, other):
        return self.key < other.key

print(Version(1, 2) <= Version(1, 3), Version(2, 0) > Version(1, 9))

@singledispatch
def size(obj):
    return 'unknown'
@size.register
def _(obj: str):
    return f'{len(obj)} chars'
@size.register
def _(obj: list):
    return f'{len(obj)} items'
print(size('hello'), '|', size([1, 2]), '|', size(3.5))` } },
      { title: 'reduce beyond sums: gcd of a list and merging dicts', html: `<p><code>reduce</code> shines when the combine step has no built-in equivalent across a whole list.</p>`, code: { lang: 'python', run: true, code: `from functools import reduce
from math import gcd

print(reduce(gcd, [48, 180, 36, 12]))          # 12
configs = [{'a': 1}, {'b': 2}, {'a': 3, 'c': 4}]
print(reduce(lambda acc, d: acc | d, configs, {}))   # later wins
words = ['map', 'filter', 'reduce', 'partial']
print(reduce(lambda best, w: w if len(w) > len(best) else best, words))` } }
    ],
    deepDive: `<p>🟣 <b>lru_cache internals.</b> CPython's <code>lru_cache</code> is implemented in C (<code>_functools._lru_cache_wrapper</code>). It builds a key from the positional args plus (if any) a marker and the keyword items — so <code>f(a=1, b=2)</code> and <code>f(b=2, a=1)</code> may be cached separately. With a bounded <code>maxsize</code> it keeps a <b>dict + circular doubly linked list</b>: a hit moves the node to the front in O(1), a miss on a full cache unlinks the oldest node in O(1). With <code>maxsize=None</code> there is no linked list at all (pure dict), so <code>@cache</code> is the fastest option. The structure is safe to use from several threads (it will not corrupt), but two threads can both miss and compute the same value concurrently — the function may run more than once for a key.</p>
<p><b>Memory and methods.</b> A cache holds strong references to every argument and result. Decorating an instance method with <code>@lru_cache</code> stores <code>self</code> in the keys → instances are never freed (a classic leak flagged by linters, e.g. flake8-bugbear B019). Use <code>cached_property</code>, a per-instance dict, or cache a module-level function keyed by an ID. <code>cache_parameters()</code> (3.9+) reports maxsize/typed. For async functions, <code>lru_cache</code> would cache the coroutine object (which can be awaited only once) — use an async-aware cache library instead.</p>
<p><b>Recursion depth.</b> Memoized recursion still recurses: <code>fib(5000)</code> with an empty cache can hit the recursion limit (default 1000). Warm the cache bottom-up (<code>for i in range(n): fib(i)</code>) or convert to iterative DP.</p>
<p><b>partial details.</b> <code>partial</code> objects are implemented in C, are picklable (unlike lambdas — important for <code>multiprocessing</code> and <code>concurrent.futures</code>), flatten nested partials, and have a proper <code>repr</code>. Keywords supplied at call time override frozen ones; positional args are appended after the frozen ones. Python 3.14 adds <code>functools.Placeholder</code> so you can freeze a <i>later</i> positional argument while leaving an earlier one open. <code>partialmethod</code> is the descriptor-aware version for classes.</p>
<p><b>reduce and readability.</b> Guido moved <code>reduce</code> out of builtins in Python 3 because most uses were clearer as loops or built-ins. Keep it for genuine folds (compose, gcd/lcm of many numbers, merging); for anything with branching logic, write the loop.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> caching is now money: LLM calls cost real dollars and seconds, so memoizing deterministic calls (embeddings of the same text, tool results) with <code>@cache</code>-style decorators or a persistent cache is standard. <code>partial</code> is everywhere in agent code to pre-bind clients, model names and settings into tool callables.</p>
<p><b>Use AI as a partner:</b> ask <code>"Is this function safe to lru_cache? List hidden inputs (time, globals, randomness, mutable args)"</code>; ask it to convert a memoized recursion into bottom-up DP and compare <code>cache_info()</code>.</p>
<p><b>Where AI goes wrong:</b> puts <code>@lru_cache</code> on methods (leaking instances), on impure functions (stale data), on async functions (caching coroutines), or with list arguments (TypeError at runtime). It also over-uses <code>reduce</code> with dense lambdas where <code>sum</code>/<code>max</code> would do.</p>
<p><b>What you must still own:</b> purity and hashability checks, choosing maxsize from memory budgets, invalidation strategy (<code>cache_clear</code>, TTL), and knowing when a plain loop beats <code>reduce</code>.</p>`,
    problems: [{
      title: 'Climbing Stairs with Memoization', level: 'Medium', tags: ['lru_cache', 'recursion', 'dynamic programming'], companies: ['Amazon', 'Adobe', 'Google'],
      statement: `<p>You can climb 1, 2 or 3 steps at a time. Write <code>ways(n)</code> returning how many distinct ways reach step <code>n</code> exactly. First write the natural recursion, then make it fast with <code>functools.lru_cache</code>. Also write your own <code>memoize</code> decorator (dict-based, with <code>functools.wraps</code>) and show it gives the same answers.</p>`,
      constraints: `0 ≤ n ≤ 900 (stay under the default recursion limit); answer can be huge (Python ints are unbounded).`,
      example: `<p><code>ways(4)</code> → ${H.c('g', '7')}: 1+1+1+1, 1+1+2, 1+2+1, 2+1+1, 2+2, 1+3, 3+1. Base cases: <code>ways(0) = 1</code> (one way: do nothing), negative n → 0.</p>`,
      brute: { why: `<p>Plain recursion recomputes the same subproblems again and again: <code>ways(n-1)</code>, <code>ways(n-2)</code> and <code>ways(n-3)</code> each recurse into overlapping calls, giving roughly O(1.84<sup>n</sup>) calls — n = 40 already takes ages.</p>`, code: `def ways(n):
    if n < 0:
        return 0
    if n == 0:
        return 1
    return ways(n - 1) + ways(n - 2) + ways(n - 3)` },
      mcq: { q: 'Why does adding <code>@lru_cache(maxsize=None)</code> make this O(n)?', options: ['Each distinct n is computed once; repeats are dictionary hits', 'lru_cache runs the calls in parallel', 'It converts recursion into a loop automatically'], answer: 0, explain: 'There are only n+1 distinct arguments. After the first computation of ways(k), every other call with k is an O(1) cache hit.' },
      hints: [`<p>Hint 1: Draw the call tree for ways(5): ways(3) and ways(2) appear many times. Same input, same output → cache it.</p>`, `<p>Hint 2: <code>@lru_cache(maxsize=None)</code> (or <code>@cache</code>) on the recursive function. For your own version: a dict keyed by <code>args</code> inside a decorator.</p>`, `<p>Hint 3: Edge cases: n = 0 → 1; negative → 0; deep n → recursion limit (warm the cache with increasing n or go iterative). Recipe: if args in memo return it; else compute, store, return.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [
            ['ways(900)'],
            '9457636273862243878761234674352694703563982835999712736789279740329521710815023415136511638604388002624829216747964076582517657140957316362167211537427470364571635015262635876089965598136437548819125631924360572238630616525404905759078151'
          ],
          [['[ways(i) for i in range(8)]'], [1, 1, 2, 4, 7, 13, 24, 44]],
          [['ways(4)'], 7],
          [['ways(0)'], 1],
          [['ways(-1)'], 0],
          [['ways(1)'], 1],
          [['ways(2)'], 2],
          [['ways(3)'], 4],
          [['ways(50)'], 10562230626642],
          [['ways(100)'], '180396380815100901214157639'],
          [
            ['ways(899)'],
            '5142012928136931300021872768969652793717198815316315917037620854832054771904331024644867062480490657831150631020196968620542854514861297849551008692550433706398687596531134708069230259254050030160326039715530826136215638497198333669887556'
          ],
          [['[ways2(i) for i in range(8)]'], [1, 1, 2, 4, 7, 13, 24, 44]],
          [['ways2(300)'], '15350287614359738671843506567023635268924281173051801861566524609184461020990367'],
          [['ways2(50) == ways(50)'], true],
          [['ways2.__name__'], 'ways2'],
          [['ways.__name__'], 'ways'],
          [['ways2(0)'], 1],
          [['ways2(-5)'], 0],
          [['all(ways(i) == ways2(i) for i in range(0, 301))'], true]
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
        approach: `<p>Same recursion, plus memoization. With <code>lru_cache</code>, each <code>ways(k)</code> for 0 ≤ k ≤ n runs its body once. The hand-written <code>memoize</code> shows what <code>lru_cache</code> does underneath (without the LRU eviction).</p>`,
        code: { lang: 'python', run: true, code: `import functools

@functools.lru_cache(maxsize=None)
def ways(n):
    if n < 0:
        return 0
    if n == 0:
        return 1
    return ways(n - 1) + ways(n - 2) + ways(n - 3)

def memoize(func):
    memo = {}                                # lives in the closure
    @functools.wraps(func)
    def wrapper(*args):
        if args not in memo:
            memo[args] = func(*args)         # compute once
        return memo[args]
    wrapper.memo = memo
    return wrapper

@memoize
def ways2(n):
    if n < 0:
        return 0
    if n == 0:
        return 1
    return ways2(n - 1) + ways2(n - 2) + ways2(n - 3)

print([ways(i) for i in range(8)])           # [1, 1, 2, 4, 7, 13, 24, 44]
print(ways(50), ways2(50) == ways(50))
print(ways.cache_info())
print(len(ways2.memo), ways2.__name__)` },
        dry: { head: ['call', 'cache state', 'action', 'value'], rows: [['ways(0)', 'empty', 'miss → base case', '1'], ['ways(1)', '{0}', 'miss → ways(0)+ways(-1)+ways(-2)', '1'], ['ways(2)', '{-2..1}', 'miss → 1+1+0', '2'], ['ways(3)', '{…, 2}', 'miss → 2+1+1 (all hits)', '4'], ['ways(4)', '{…, 3}', 'miss → 4+2+1 (all hits)', '<span class="c-g">7</span>']] },
        complexity: `<p>O(n) time (each n computed once, O(1) work plus hits) and O(n) space for the cache and recursion stack. The brute force is O(1.84<sup>n</sup>).</p>`,
        followUps: ['Rewrite bottom-up with three rolling variables for O(1) space.', 'Allowed step sizes come as a list argument — how do you keep it cacheable? (pass a tuple)']
      }
    }]
  });
  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Apply a Function N Times', level: 'Easy', tags: ['higher-order', 'closure'], companies: ['Infosys', 'Amazon'],
    statement: `<p>Write <code>repeat_fn(f, n)</code> that returns a <b>new function</b> <code>g</code> such that <code>g(x) == f(f(…f(x)…))</code> with <code>f</code> applied <code>n</code> times. For <code>n = 0</code>, <code>g</code> is the identity. Do not call <code>f</code> until <code>g</code> is called.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; f is any one-argument callable.`,
    example: `<p><code>add3 = repeat_fn(lambda x: x + 1, 3)</code> → <code>add3(10)</code> = ${H.c('g', '13')}. <code>repeat_fn(lambda s: s + '!', 2)('hi')</code> = ${H.c('g', "'hi!!'")}. <code>repeat_fn(abs, 0)(-5)</code> = ${H.c('g', '-5')} (identity).</p>`,
    brute: { why: `<p>Building a nested chain of lambdas (one per repetition) works for small n, but each level adds a Python call frame — n = 10<sup>5</sup> overflows the recursion limit when called. A simple loop inside one closure has no such problem.</p>`, code: `def repeat_fn(f, n):
    g = lambda x: x
    for _ in range(n):
        g = (lambda prev: (lambda x: f(prev(x))))(g)   # nests n levels deep
    return g` },
    mcq: { q: 'What must <code>repeat_fn</code> return?', options: ['A function object (the closure), not a value', 'The result of <code>f(x)</code>', 'A list of n functions'], answer: 0, explain: 'It is a higher-order function: configuration now (f, n), work later when the returned function is called with x.' },
    hints: [`<p>Hint 1: Return an inner function that remembers <code>f</code> and <code>n</code> through the closure.</p>`, `<p>Hint 2: Inside it, loop <code>n</code> times: <code>x = f(x)</code>, then return <code>x</code>. No nesting needed.</p>`, `<p>Hint 3: n = 0 means the loop does nothing → identity for free. You do not need <code>functools.wraps</code> here: g is a new function, not a disguise for f.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [['result = repeat_fn(lambda x: x + 1, 3)(10)'], 13],
        [['result = repeat_fn(lambda s: s + \'!\', 2)(\'hi\')'], 'hi!!'],
        [['result = repeat_fn(abs, 0)(-5)'], -5],
        [['result = repeat_fn(lambda x: x * 2, 10)(1)'], 1024],
        [['result = repeat_fn(lambda x: x + 1, 100000)(0)'], 100000],
        [['result = repeat_fn(lambda x: x + 1, 1)(0)'], 1],
        [['result = repeat_fn(str, 3)(7)'], '7'],
        [['result = repeat_fn(lambda x: -x, 5)(3)'], -3],
        [['result = repeat_fn(lambda x: -x, 6)(3)'], 3],
        [['result = (lambda g: [g(1), g(1), g(2)])(repeat_fn(lambda x: x * 3, 2))'], [9, 9, 18]],
        [['result = repeat_fn(lambda x: x // 2, 100000)(10**9)'], 0],
        [
          [
            'calls = []\n' +
              'g = repeat_fn(lambda x: calls.append(x) or x, 3)\n' +
              'before = len(calls)\n' +
              'g(1)\n' +
              'result = [before, len(calls)]'
          ],
          [0, 3]
        ],
        [['x = [1]\nresult = repeat_fn(lambda v: v, 0)(x) is x'], true],
        [['g = repeat_fn(lambda x: x + [0], 3)\nresult = [g([]), g([])]'], [[0, 0, 0], [0, 0, 0]]],
        [
          [
            'g = repeat_fn(lambda x: x + 1, 2)\n' +
              'h = repeat_fn(lambda x: x * 2, 2)\n' +
              'result = [g(0), h(1), g(5)]'
          ],
          [2, 4, 7]
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
      approach: `<p>Return a closure that loops: O(n) per call, constant stack depth. <code>f</code> and <code>n</code> are captured in cells and read (never rebound), so no <code>nonlocal</code> is needed.</p>`,
      code: { lang: 'python', run: true, code: `def repeat_fn(f, n):
    def g(x):
        for _ in range(n):       # f and n come from the enclosing scope
            x = f(x)             # rebinding x: it is g's own parameter
        return x
    return g

add3 = repeat_fn(lambda x: x + 1, 3)
print(add3(10))                                   # 13
print(repeat_fn(lambda s: s + '!', 2)('hi'))      # hi!!
print(repeat_fn(abs, 0)(-5))                      # -5
print(repeat_fn(lambda x: x * 2, 10)(1))          # 1024
print(repeat_fn(lambda x: x + 1, 100000)(0))      # no recursion problem` },
      dry: { head: ['loop step', 'x before', 'f(x)'], rows: [['1', '10', '11'], ['2', '11', '12'], ['3', '12', '<span class="c-g">13</span>']] },
      complexity: `<p>Creating g: O(1). Calling g: O(n) calls of f, O(1) extra space.</p>`,
      followUps: ['Compute f applied 2<sup>k</sup> times faster when f is linear (x → ax + b) by composing coefficients.']
    }
  });

  practice.push({
    title: 'Fix the Mutable Default Argument', level: 'Easy', tags: ['defaults', 'function objects'], companies: ['Google', 'Microsoft', 'Zoho'],
    statement: `<p>This function is supposed to return a <b>new</b> list containing just the given tag each time it is called without a list, but calls leak into each other:</p><pre>def tag_list(tag, tags=[]):
    tags.append(tag)
    return tags</pre><p>Explain the bug (what does <code>tag_list.__defaults__</code> show?) and write a fixed version that still lets the caller pass an existing list to extend.</p>`,
    constraints: `Must keep the same call signature: tag_list(tag) and tag_list(tag, existing_list).`,
    example: `<p>Buggy: <code>tag_list('a')</code> → ['a'], then <code>tag_list('b')</code> → ${H.c('r', "['a', 'b']")}. Fixed: second call → ${H.c('g', "['b']")}. <code>tag_list('c', ['x'])</code> → <code>['x', 'c']</code> in both.</p>`,
    brute: { why: `<p>The default list is created <b>once</b> when <code>def</code> runs and stored in <code>tag_list.__defaults__</code>; every call that omits <code>tags</code> mutates that same shared object. Workarounds like copying the default on every call (<code>tags = list(tags)</code>) hide the symptom but also break the "extend the caller's list" behaviour.</p>`, code: `def tag_list(tag, tags=[]):
    tags = list(tags)        # copies even the caller's list - changes behaviour
    tags.append(tag)
    return tags` },
    mcq: { q: 'When is the default value <code>[]</code> evaluated?', options: ['Once, when the def statement executes', 'On every call that omits the argument', 'Lazily on first use, then cached per caller'], answer: 0, explain: 'Defaults are evaluated at function definition time and stored on the function object in __defaults__.' },
    hints: [`<p>Hint 1: Print <code>tag_list.__defaults__</code> after two calls — you will see the shared list growing.</p>`, `<p>Hint 2: Use an immutable sentinel such as <code>None</code> as the default, and create the list inside the body.</p>`, `<p>Hint 3: Compare with <code>is None</code>, not truthiness — an empty list passed by the caller must still be extended, not replaced.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [['r = [tag_list(\'a\'), tag_list(\'b\')]\nresult = r'], [['a'], ['b']]],
        [['mine = []\nr = tag_list(\'c\', mine)\nresult = [r is mine, mine]'], [true, ['c']]],
        [['result = tag_list(\'c\', [\'x\'])'], ['x', 'c']],
        [
          [
            'for i in range(1000):\n' +
              '    tag_list(str(i))\n' +
              'result = tag_list(\'z\')'
          ],
          ['z']
        ],
        [['a = tag_list(\'a\')\nb = tag_list(\'b\')\nresult = a is not b'], true],
        [['t = [\'p\', \'q\']\ntag_list(\'r\', t)\ntag_list(\'s\', t)\nresult = t'], ['p', 'q', 'r', 's']],
        [['result = tag_list(\'a\', None)'], ['a']],
        [
          [
            't = []\n' +
              'result = [tag_list(\'a\', t) is t, tag_list(\'a\', tags=t), tag_list(tag=\'b\')]'
          ],
          [true, ['a', 'a'], ['b']]
        ],
        [['tag_list(\'first\')\nresult = tag_list(\'second\')'], ['second']],
        [
          [
            'shared = [\'s\']\n' +
              'result = [tag_list(\'1\', shared), tag_list(\'2\')]'
          ],
          [['s', '1'], ['2']]
        ],
        [
          [
            'tag_list(\'x\')\n' +
              'result = tag_list.__defaults__ in [(None,), None] or not any(isinstance(d, list) for d in (tag_list.__defaults__ or ()))'
          ],
          true
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
      approach: `<p>Replace the mutable default with <code>None</code> and build a fresh list per call. Use <code>is None</code> so that a caller-supplied empty list is respected.</p>`,
      code: { lang: 'python', run: true, code: `def tag_list_buggy(tag, tags=[]):
    tags.append(tag)
    return tags

print(tag_list_buggy('a'), tag_list_buggy('b'))     # same list printed twice
print('defaults now:', tag_list_buggy.__defaults__)

def tag_list(tag, tags=None):
    if tags is None:          # sentinel: fresh list for each call
        tags = []
    tags.append(tag)
    return tags

print(tag_list('a'), tag_list('b'))                 # ['a'] ['b']
mine = []
tag_list('c', mine)
print(mine)                                         # ['c'] - caller's empty list extended
print(tag_list.__defaults__)                        # (None,)` },
      complexity: `<p>O(1) per call. The point is correctness: no hidden shared state between calls.</p>`,
      followUps: ['When is a mutable default intentionally useful? (a deliberate per-function cache — but prefer lru_cache or an explicit attribute)', 'What does <code>dataclasses.field(default_factory=list)</code> solve?']
    }
  });

  practice.push({
    title: 'Leaderboard Sort with Key Functions', level: 'Easy', tags: ['sorted', 'key', 'lambda', 'operator'], companies: ['Flipkart', 'Meta', 'Swiggy'],
    statement: `<p>Given a list of <code>(name, score, time_seconds)</code> tuples, return the names in leaderboard order: <b>higher score first</b>; ties broken by <b>lower time</b>; remaining ties by <b>name alphabetically</b>. Use <code>sorted</code> with a key function (no custom comparison loops).</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>; scores and times are integers.`,
    example: `<p><code>[('mei', 90, 50), ('asha', 95, 70), ('ravi', 90, 40), ('bo', 90, 40)]</code> → ${H.c('g', "['asha', 'bo', 'ravi', 'mei']")}: asha has the top score; bo and ravi tie on 90/40 so the name decides; mei is slower.</p>`,
    brute: { why: `<p>A hand-written bubble sort with an if-chain comparator is O(N²) — 10<sup>10</sup> comparisons for 10<sup>5</sup> players — and easy to get wrong on ties. A key tuple lets Timsort do it in O(N log N).</p>`, code: `def leaderboard(rows):
    rows = list(rows)
    n = len(rows)
    for i in range(n):
        for j in range(n - 1 - i):
            a, b = rows[j], rows[j + 1]
            if (a[1] < b[1]) or (a[1] == b[1] and a[2] > b[2]) or (a[1] == b[1] and a[2] == b[2] and a[0] > b[0]):
                rows[j], rows[j + 1] = b, a
    return [r[0] for r in rows]` },
    mcq: { q: 'How do you make score descending but time and name ascending in one key?', options: ['Return <code>(-score, time, name)</code>', 'Use <code>reverse=True</code> with <code>(score, time, name)</code>', 'Sort three separate times with different keys in any order'], answer: 0, explain: 'Negating a number flips only that field. reverse=True would flip all three fields. (Multiple stable sorts also work, but must go from least to most important key.)' },
    hints: [`<p>Hint 1: Tuples compare field by field, left to right — exactly "first by…, then by…".</p>`, `<p>Hint 2: Key: <code>lambda r: (-r[1], r[2], r[0])</code>. Negate the field you want descending.</p>`, `<p>Hint 3: If a field cannot be negated (e.g. strings descending), use two stable sorts: sort by the secondary key first, then by the primary.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [
          ['leaderboard([(\'mei\', 90, 50), (\'asha\', 95, 70), (\'ravi\', 90, 40), (\'bo\', 90, 40)])'],
          ['asha', 'bo', 'ravi', 'mei']
        ],
        [['leaderboard([(\'x\', 1, 1)])'], ['x']],
        [['leaderboard([(\'b\', 5, 5), (\'a\', 5, 5)])'], ['a', 'b']],
        [['leaderboard([(\'B\', 1, 1), (\'a\', 1, 1)])'], ['B', 'a']],
        [['leaderboard([(\'a\', -5, 3), (\'b\', -1, 9), (\'c\', -1, 2)])'], ['c', 'b', 'a']],
        [['leaderboard([(\'a\', 0, 0), (\'a\', 0, 0)])'], ['a', 'a']],
        [['leaderboard([(\'p\', 10, 100), (\'q\', 10, 99), (\'r\', 9, 1)])'], ['q', 'p', 'r']],
        [
          [
            '(lambda r: [len(r), r[:3], r[-3:]])(leaderboard([(\'n%d\' % i, i % 100, (i * 7) % 50) for i in range(100000)]))'
          ],
          [100000, ['n10099', 'n10199', 'n10299'], ['n99700', 'n99800', 'n99900']]
        ]
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
      approach: `<p>One <code>sorted</code> call with a tuple key. The key is computed once per row (N calls), then Timsort compares tuples.</p>`,
      code: { lang: 'python', run: true, code: `from operator import itemgetter

def leaderboard(rows):
    ordered = sorted(rows, key=lambda r: (-r[1], r[2], r[0]))
    return [name for name, _, _ in ordered]

rows = [('mei', 90, 50), ('asha', 95, 70), ('ravi', 90, 40), ('bo', 90, 40)]
print(leaderboard(rows))

# Alternative: two stable sorts (least important key first)
step1 = sorted(rows, key=itemgetter(0))           # name
step2 = sorted(step1, key=itemgetter(2))          # time
step3 = sorted(step2, key=itemgetter(1), reverse=True)  # score desc
print([r[0] for r in step3])` },
      dry: { head: ['row', 'key (-score, time, name)'], rows: [["('mei', 90, 50)", "(-90, 50, 'mei')"], ["('asha', 95, 70)", "<span class=\"c-g\">(-95, 70, 'asha')</span> smallest"], ["('ravi', 90, 40)", "(-90, 40, 'ravi')"], ["('bo', 90, 40)", "(-90, 40, 'bo') &lt; ravi"]] },
      complexity: `<p>O(N log N) time, O(N) space for keys and the output.</p>`,
      followUps: ['Return the top 3 only in O(N log 3) with <code>heapq.nsmallest(3, rows, key=...)</code>.']
    }
  });

  practice.push({
    title: 'Predict & Fix: Multipliers Created in a Loop', level: 'Easy', tags: ['closure', 'late binding', 'predict the output'], companies: ['Google', 'Atlassian'],
    statement: `<p>Predict the output, explain it, then fix <code>make_multipliers()</code> so that <code>[m(10) for m in make_multipliers()]</code> gives <code>[0, 10, 20, 30]</code>:</p><pre>def make_multipliers():
    return [lambda x: i * x for i in range(4)]

print([m(10) for m in make_multipliers()])</pre>`,
    constraints: `Keep each multiplier a one-argument function.`,
    example: `<p>Actual output: ${H.c('r', '[30, 30, 30, 30]')}. All four lambdas close over the same variable <code>i</code>, whose final value is 3. Expected after fix: ${H.c('g', '[0, 10, 20, 30]')}.</p>`,
    brute: { why: `<p>Writing four separate named functions by hand avoids the bug but does not scale, and does not explain the cause: closures capture <b>variables</b>, and the lookup of <code>i</code> happens when the lambda is <b>called</b>, after the loop is finished.</p>`, code: `def make_multipliers():
    def times0(x): return 0 * x
    def times1(x): return 1 * x
    def times2(x): return 2 * x
    def times3(x): return 3 * x
    return [times0, times1, times2, times3]` },
    mcq: { q: 'Why do all four lambdas return 30 for input 10?', options: ['They share one cell for i, which holds 3 when they are called', 'range(4) is evaluated lazily and resets', 'Lambdas cannot capture loop variables'], answer: 0, explain: 'Late binding: free variables are looked up at call time. The comprehension has one i; by call time it is 3.' },
    hints: [`<p>Hint 1: Ask "when is <code>i</code> looked up?" — at call time, not when the lambda is created.</p>`, `<p>Hint 2: Default arguments are evaluated at creation time: <code>lambda x, i=i: i * x</code>.</p>`, `<p>Hint 3: Other fixes: a factory <code>def times(i): return lambda x: i * x</code>, or <code>functools.partial(operator.mul, i)</code>. Beware: the default-arg trick adds an overridable parameter.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['[m(10) for m in make_multipliers()]'], [0, 10, 20, 30]],
        [['[m(0) for m in make_multipliers()]'], [0, 0, 0, 0]],
        [['len(make_multipliers())'], 4],
        [['[m(-1) for m in make_multipliers()]'], [0, -1, -2, -3]],
        [['[m(1.5) for m in make_multipliers()]'], [0, 1.5, 3, 4.5]],
        [['(lambda ms: [ms[2](5), ms[3](1), ms[2](5)])(make_multipliers())'], [10, 3, 10]],
        [['[[m(2) for m in make_multipliers()] == [m(2) for m in make_multipliers()]]'], [true]],
        [['all(callable(m) for m in make_multipliers())'], true],
        [['[m(7) for m in reversed(make_multipliers())]'], [21, 14, 7, 0]],
        [['(lambda a, b: [a[1](4), b[1](4)])(make_multipliers(), make_multipliers())'], [4, 4]]
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
      approach: `<p>Bind the current value at creation time. <code>partial(mul, i)</code> is the cleanest: no extra parameter visible to callers, picklable, and explicit.</p>`,
      code: { lang: 'python', run: true, code: `from functools import partial
from operator import mul

def make_multipliers_buggy():
    return [lambda x: i * x for i in range(4)]

print([m(10) for m in make_multipliers_buggy()])     # [30, 30, 30, 30]

def make_multipliers_default():
    return [lambda x, i=i: i * x for i in range(4)]  # i captured as a default

def make_multipliers_factory():
    def times(i):
        return lambda x: i * x                       # new scope per i
    return [times(i) for i in range(4)]

def make_multipliers():
    return [partial(mul, i) for i in range(4)]       # value frozen now

for maker in (make_multipliers_default, make_multipliers_factory, make_multipliers):
    print(maker.__name__, [m(10) for m in maker()])` },
      complexity: `<p>O(k) to build k multipliers, O(1) per call.</p>`,
      followUps: ['Why does <code>asyncio.create_task(work(i))</code> in a loop not have this problem?']
    }
  });
  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'compose(*fns) with reduce', level: 'Medium', tags: ['reduce', '*args', 'higher-order'], companies: ['Uber', 'Twitter (X)', 'Razorpay'],
    statement: `<p>Write <code>compose(*fns)</code> returning one function that applies the given functions <b>right to left</b>: <code>compose(f, g, h)(x) == f(g(h(x)))</code>. <code>compose()</code> with no functions returns the identity. Also write <code>pipe(*fns)</code> that applies them <b>left to right</b>. The innermost function may take any arguments (<code>*args, **kwargs</code>); the others take one argument.</p>`,
    constraints: `0 ≤ number of functions ≤ 10<sup>4</sup>; calls must not hit the recursion limit.`,
    example: `<p><code>compose(str, lambda x: x * 2, abs)(-4)</code> → abs → 4, ×2 → 8, str → ${H.c('g', "'8'")}. <code>pipe(abs, lambda x: x * 2, str)(-4)</code> gives the same. <code>compose(max)(3, 9, 2)</code> → ${H.c('g', '9')}.</p>`,
    brute: { why: `<p>Composing pairwise into nested lambdas (<code>reduce(lambda f, g: lambda x: f(g(x)), fns)</code>) is elegant but creates a call chain as deep as the number of functions: with 10<sup>4</sup> functions each call recurses 10<sup>4</sup> levels and raises <code>RecursionError</code>. It also forces every function to take exactly one argument.</p>`, code: `from functools import reduce

def compose(*fns):
    if not fns:
        return lambda x: x
    return reduce(lambda f, g: lambda x: f(g(x)), fns)    # nesting depth = len(fns)` },
    mcq: { q: 'Why might the nested-lambda version crash for 5000 functions?', options: ['Each call goes through ~5000 nested Python frames → RecursionError', 'reduce cannot handle more than 1000 items', 'Lambdas cannot be returned from reduce'], answer: 0, explain: 'reduce builds f1(f2(…)) as lambdas calling lambdas; calling it descends one frame per function, exceeding the default limit of 1000.' },
    hints: [`<p>Hint 1: Instead of building nested functions, store the tuple of functions and loop over it at call time.</p>`, `<p>Hint 2: For compose, call the <b>last</b> function first with <code>*args, **kwargs</code>, then feed the result through the rest in reverse order.</p>`, `<p>Hint 3: pipe is compose with the order reversed: <code>pipe(*fns) = compose(*reversed(fns))</code>. Handle zero functions: return the single argument unchanged.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['compose(str, lambda x: x * 2, abs)(-4)'], '8'],
        [['pipe(abs, lambda x: x * 2, str)(-4)'], '8'],
        [['compose(max)(3, 9, 2)'], 9],
        [['compose()(42)'], 42],
        [['pipe()(42)'], 42],
        [['compose(*[lambda x: x + 1] * 10000)(0)'], 10000],
        [['pipe(*[lambda x: x + 1] * 10000)(0)'], 10000],
        [['compose(lambda s: s + \'a\', lambda s: s + \'b\')(\'x\')'], 'xba'],
        [['pipe(lambda s: s + \'a\', lambda s: s + \'b\')(\'x\')'], 'xab'],
        [['compose(str.upper, lambda *, s: s + \'!\')(s=\'hi\')'], 'HI!'],
        [['(lambda c: [c(0), c(10)])(compose(lambda x: x + 1, lambda x: x + 1))'], [2, 12]],
        [['compose(lambda x: x * 10, lambda a, b=1: a + b)(2, b=3)'], 50],
        [['compose(sorted)([3, 1, 2])'], [1, 2, 3]],
        [['compose(len, str, abs)(-12345)'], 5],
        [['pipe(max, str)(1, 5, 3)'], '5'],
        [['compose(*[lambda x: x * 2] * 10)(1)'], 1024]
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
      approach: `<p>Capture the functions in a closure and apply them with a loop at call time — constant stack depth. <code>reduce</code> is still a perfect fit for the loop itself: fold the value through the remaining functions.</p>`,
      code: { lang: 'python', run: true, code: `from functools import reduce

def compose(*fns):
    if not fns:
        def identity(x):
            return x
        return identity
    *rest, innermost = fns
    def composed(*args, **kwargs):
        value = innermost(*args, **kwargs)         # first call may take anything
        # fold right-to-left through the rest: no nesting, no recursion
        return reduce(lambda acc, f: f(acc), reversed(rest), value)
    return composed

def pipe(*fns):
    return compose(*reversed(fns))

print(compose(str, lambda x: x * 2, abs)(-4))       # '8'
print(pipe(abs, lambda x: x * 2, str)(-4))          # '8'
print(compose(max)(3, 9, 2))                        # 9
print(compose()(42))                                # 42
inc = lambda x: x + 1
print(compose(*[inc] * 10000)(0))                   # 10000, no RecursionError` },
      dry: { head: ['step', 'function', 'value'], rows: [['1 (innermost)', 'abs(-4)', '4'], ['2', 'lambda x: x * 2', '8'], ['3', 'str', "<span class=\"c-g\">'8'</span>"]] },
      complexity: `<p>Building: O(k). Calling: O(k) function calls, O(1) stack depth beyond each function's own.</p>`,
      followUps: ['Add type hints with <code>Callable</code> and explain why fully typing variadic compose is hard.', 'Short-circuit when any step returns None (a "maybe" pipeline).']
    }
  });

  practice.push({
    title: '@timed(sink) Decorator Factory', level: 'Medium', tags: ['decorator factory', 'functools.wraps', 'finally'], companies: ['Datadog', 'Microsoft', 'PhonePe'],
    statement: `<p>Write <code>timed(sink, label=None)</code>: a decorator factory. Every call of the decorated function appends a tuple <code>(name, elapsed_ms, ok)</code> to the list <code>sink</code>, where <code>name</code> is <code>label</code> or the function's <code>__qualname__</code>, and <code>ok</code> is <code>False</code> if the call raised (the exception must still propagate). Preserve metadata with <code>functools.wraps</code> and return the original result unchanged.</p>`,
    constraints: `Must work on plain functions and methods; use time.perf_counter.`,
    example: `<p><code>log = []; @timed(log) def add(a, b): return a + b</code>; <code>add(1, 2)</code> → returns ${H.c('g', '3')}, <code>log == [('add', 0.0012, True)]</code> (time varies). A call that raises appends <code>(…, False)</code> and re-raises.</p>`,
    brute: { why: `<p>Timing inline with <code>start = …; result = f(); log.append(…)</code> in each function duplicates code, and most copies forget the failure case: if <code>f</code> raises, nothing is logged. Using <code>try/finally</code> in one decorator fixes both.</p>`, code: `import time

def add(a, b, log):
    start = time.perf_counter()
    result = a + b                         # if this raised, nothing would be logged
    log.append(('add', (time.perf_counter() - start) * 1000, True))
    return result` },
    mcq: { q: 'Where should the append to <code>sink</code> happen so failures are recorded too?', options: ['In a <code>finally</code> block (with an ok flag set on success)', 'After <code>return func(...)</code>', 'Inside an <code>except</code> that does not re-raise'], answer: 0, explain: 'finally runs on both success and exception; code after return never runs; swallowing the exception changes behaviour.' },
    hints: [`<p>Hint 1: Three levels: <code>timed(sink, label)</code> → <code>decorator(func)</code> → <code>wrapper(*args, **kwargs)</code>.</p>`, `<p>Hint 2: Set <code>ok = False</code> before the call, set it to True right after a successful call, and append in <code>finally</code>.</p>`, `<p>Hint 3: Compute the name once at decoration time (<code>label or func.__qualname__</code>). Methods just work because <code>self</code> is in <code>args</code>.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'log = []\n' +
              '@timed(log)\n' +
              'def add(a, b):\n' +
              '    return a + b\n' +
              'r = add(1, 2)\n' +
              'result = [r, [(n, ok) for n, _, ok in log], isinstance(log[0][1], float), log[0][1] >= 0]'
          ],
          [3, [['add', true]], true, true]
        ],
        [
          [
            'log = []\n' +
              '@timed(log, label=\'parse\')\n' +
              'def parse_int(s):\n' +
              '    return int(s)\n' +
              'parse_int(\'4\')\n' +
              'result = [(n, ok) for n, _, ok in log]'
          ],
          [['parse', true]]
        ],
        [
          [
            'log = []\n' +
              'class Repo:\n' +
              '    @timed(log)\n' +
              '    def get(self, key):\n' +
              '        return key.upper()\n' +
              'r = Repo().get(\'k\')\n' +
              'result = [r, log[0][0], log[0][2]]'
          ],
          ['K', 'Repo.get', true]
        ],
        [
          [
            'log = []\n' +
              '@timed(log, label=\'p\')\n' +
              'def parse_int(s):\n' +
              '    return int(s)\n' +
              'try:\n' +
              '    parse_int(\'oops\')\n' +
              'except ValueError:\n' +
              '    caught = True\n' +
              'result = [caught, [(n, ok) for n, _, ok in log]]'
          ],
          [true, [['p', false]]]
        ],
        [
          [
            'log = []\n' +
              '@timed(log)\n' +
              'def f():\n' +
              '    """doc"""\n' +
              'result = [f.__name__, f.__doc__, f()]'
          ],
          ['f', 'doc', null]
        ],
        [
          [
            'import time\n' +
              'log = []\n' +
              '@timed(log)\n' +
              'def nap():\n' +
              '    time.sleep(0.02)\n' +
              'nap()\n' +
              'result = 19 <= log[0][1] < 5000'
          ],
          true
        ],
        [
          [
            'a, b = [], []\n' +
              '@timed(a)\n' +
              'def f():\n' +
              '    pass\n' +
              '@timed(b)\n' +
              'def g():\n' +
              '    pass\n' +
              'f(); f(); g()\n' +
              'result = [len(a), len(b)]'
          ],
          [2, 1]
        ],
        [
          [
            'log = []\n' +
              '@timed(log)\n' +
              'def f(x):\n' +
              '    return x\n' +
              'for i in range(100000):\n' +
              '    f(i)\n' +
              'result = [len(log), log[-1][0], all(ok for _, _, ok in log)]'
          ],
          [100000, 'f', true]
        ],
        [
          [
            'log = []\n' +
              '@timed(log)\n' +
              'def f(*a, **k):\n' +
              '    return (a, k)\n' +
              'result = f(1, z=2)'
          ],
          [[1], { z: 2 }]
        ],
        [
          [
            'log = []\n' +
              '@timed(log)\n' +
              'def f():\n' +
              '    raise RuntimeError(\'x\')\n' +
              'for _ in range(3):\n' +
              '    try:\n' +
              '        f()\n' +
              '    except RuntimeError:\n' +
              '        pass\n' +
              'result = [len(log), [ok for _, _, ok in log]]'
          ],
          [3, [false, false, false]]
        ],
        [
          [
            'log = []\n' +
              '@timed(log)\n' +
              'def f():\n' +
              '    return 1\n' +
              'f()\n' +
              'result = [len(log[0]), type(log[0]).__name__]'
          ],
          [3, 'tuple']
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
      approach: `<p>Factory captures <code>sink</code> and <code>label</code>; the wrapper measures with <code>perf_counter</code> and records in <code>finally</code>, so both outcomes are logged while exceptions still propagate.</p>`,
      code: { lang: 'python', run: true, code: `import functools
import time

def timed(sink, label=None):
    def decorator(func):
        name = label or func.__qualname__          # computed once
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            ok = False
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                ok = True
                return result
            finally:
                elapsed = (time.perf_counter() - start) * 1000
                sink.append((name, elapsed, ok))
        return wrapper
    return decorator

log = []

@timed(log)
def add(a, b):
    return a + b

@timed(log, label='parse')
def parse_int(s):
    return int(s)

class Repo:
    @timed(log)
    def get(self, key):
        return key.upper()

print(add(1, 2), parse_int('42'), Repo().get('k'))
try:
    parse_int('oops')
except ValueError as e:
    print('ValueError:', e)
print([(n, ok) for n, _, ok in log])
print(add.__name__, all(ms >= 0 for _, ms, _ in log))` },
      complexity: `<p>O(1) overhead per call (two clock reads and an append); the sink grows by one entry per call.</p>`,
      followUps: ['Make it async-aware.', 'Replace the list with a callback or a metrics client, and sample only 1% of calls.']
    }
  });

  practice.push({
    title: 'Rate Limiter Closure (k calls per window)', level: 'Medium', tags: ['closure', 'nonlocal', 'deque', 'sliding window'], companies: ['Stripe', 'Cloudflare', 'Amazon'],
    statement: `<p>Write <code>make_limiter(k, window)</code> that returns <code>allow(now)</code>. <code>allow</code> returns <code>True</code> if fewer than <code>k</code> calls were allowed in the half-open interval <code>(now − window, now]</code>, recording this call; otherwise it returns <code>False</code> and records nothing. Timestamps passed in are non-decreasing. Each limiter is independent.</p>`,
    constraints: `1 ≤ k ≤ 10<sup>5</sup>; up to 10<sup>6</sup> calls; timestamps are floats in seconds.`,
    example: `<p><code>allow = make_limiter(2, 10)</code>: <code>allow(1)</code> ${H.c('g', 'True')}, <code>allow(2)</code> ${H.c('g', 'True')}, <code>allow(3)</code> ${H.c('r', 'False')} (2 already in (−7, 3]), <code>allow(11)</code> ${H.c('g', 'True')} (the call at 1 has expired: 1 ≤ 11 − 10).</p>`,
    brute: { why: `<p>Keeping every allowed timestamp in a list and counting those inside the window on every call is O(n) per call and the list grows forever — 10<sup>6</sup> calls give ~10<sup>12</sup> steps.</p>`, code: `def make_limiter(k, window):
    history = []
    def allow(now):
        recent = [t for t in history if t > now - window]   # O(n) every call
        if len(recent) < k:
            history.append(now)
            return True
        return False
    return allow` },
    mcq: { q: 'Which structure keeps only timestamps inside the window efficiently?', options: ['A deque: pop expired items from the left, append new ones on the right', 'A set of timestamps', 'A sorted list with binary search insertions'], answer: 0, explain: 'Timestamps arrive in order, so expired ones are always at the left end: O(1) amortized per call with a deque (sliding window).' },
    hints: [`<p>Hint 1: Since time never goes backwards, the oldest timestamps expire first — classic sliding window.</p>`, `<p>Hint 2: Keep a <code>collections.deque</code> in the closure. You only mutate it (popleft/append), so <code>nonlocal</code> is not required.</p>`, `<p>Hint 3: Expired means <code>t &lt;= now - window</code>. After evicting, allow if <code>len(q) &lt; k</code>. Rejected calls are not recorded.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'allow = make_limiter(2, 10)\n' +
              'result = [allow(t) for t in [1, 2, 3, 11, 12, 12.5, 21]]'
          ],
          [true, true, false, true, true, false, true]
        ],
        [
          [
            'allow = make_limiter(1, 5)\n' +
              'result = [allow(t) for t in [1, 2, 6, 6.5, 11]]'
          ],
          [true, false, true, false, true]
        ],
        [
          [
            'allow = make_limiter(3, 1)\n' +
              'result = [allow(t) for t in [0, 0, 0, 0, 0.5, 1, 1, 1.5]]'
          ],
          [true, true, true, false, false, true, true, true]
        ],
        [
          [
            'allow = make_limiter(1, 10)\n' +
              'result = [allow(t) for t in [0, 10, 10, 20, 20.5]]'
          ],
          [true, true, false, true, false]
        ],
        [
          [
            'allow = make_limiter(5, 100)\n' +
              'result = [allow(t) for t in [1, 2, 3]]'
          ],
          [true, true, true]
        ],
        [
          [
            'allow = make_limiter(2, 0.5)\n' +
              'result = [allow(t) for t in [0, 0.25, 0.5, 0.75, 1.0, 1.25]]'
          ],
          [true, true, true, true, true, true]
        ],
        [
          [
            'allow = make_limiter(1, 1)\n' +
              'result = [allow(t) for t in [5, 5, 5, 5]]'
          ],
          [true, false, false, false]
        ],
        [
          [
            'allow = make_limiter(2, 10)\n' +
              'other = make_limiter(1, 5)\n' +
              'result = [other(1), other(2), allow(30), allow(30), allow(30)]'
          ],
          [true, false, true, true, false]
        ],
        [
          [
            'allow = make_limiter(1000, 1.0)\n' +
              'n = 0\n' +
              'for i in range(10**6):\n' +
              '    n += allow(i * 0.001)\n' +
              'result = n'
          ],
          999990
        ],
        [
          [
            'allow = make_limiter(100000, 1.0)\n' +
              'n = sum(allow(0.0) for _ in range(100001))\n' +
              'result = [n, allow(1.0)]'
          ],
          [100000, true]
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
      approach: `<p>Sliding-window log in a deque captured by the closure: evict expired timestamps from the left, then decide. Each timestamp is appended and popped at most once → O(1) amortized.</p>`,
      code: { lang: 'python', run: true, code: `from collections import deque

def make_limiter(k, window):
    stamps = deque()                      # allowed call times inside the window
    def allow(now):
        while stamps and stamps[0] <= now - window:
            stamps.popleft()              # expired
        if len(stamps) < k:
            stamps.append(now)            # mutation: no nonlocal needed
            return True
        return False
    return allow

allow = make_limiter(2, 10)
print([allow(t) for t in [1, 2, 3, 11, 12, 12.5, 21]])
other = make_limiter(1, 5)
print(other(1), other(2), allow(30))      # independent limiters` },
      dry: { head: ['now', 'deque after evict', 'decision', 'deque after'], rows: [['1', '[]', 'True', '[1]'], ['2', '[1]', 'True', '[1, 2]'], ['3', '[1, 2]', '<span class="c-r">False</span>', '[1, 2]'], ['11', '[2] (1 expired)', 'True', '[2, 11]'], ['12', '[11] (2 expired)', 'True', '[11, 12]']] },
      complexity: `<p>O(1) amortized time per call; O(k) memory per limiter.</p>`,
      followUps: ['Implement a token bucket instead (two numbers in the closure, needs nonlocal).', 'Turn it into a decorator <code>@rate_limited(k, window)</code> that raises when exceeded.']
    }
  });

  practice.push({
    title: 'Event Bus with @on(event) and Unsubscribe', level: 'Medium', tags: ['decorator factory', 'registry', '**kwargs'], companies: ['Atlassian', 'Shopify', 'Swiggy'],
    statement: `<p>Build a tiny event bus. <code>bus = EventBus()</code>; <code>@bus.on('order_paid')</code> registers a handler (returning the function unchanged). <code>bus.emit(event, **payload)</code> calls each handler for that event <b>in registration order</b> with <code>**payload</code> and returns the list of results. <code>bus.off(event, handler)</code> removes it. If a handler raises, record the exception object in the results and keep calling the rest.</p>`,
    constraints: `Up to 10<sup>4</sup> handlers per event; emit with no handlers returns [].`,
    example: `<p>Two handlers on 'order_paid': <code>emit('order_paid', order_id=7)</code> → ${H.c('g', "['email sent for 7', 'stock updated for 7']")}. After <code>off</code> of the first → only the second result.</p>`,
    brute: { why: `<p>Hard-coding calls inside <code>emit</code> (<code>if event == 'order_paid': send_email(...); update_stock(...)</code>) couples the publisher to every subscriber; every new feature means editing the bus. A decorator-based registry inverts that dependency.</p>`, code: `def send_email(order_id):
    return f'email sent for {order_id}'

def update_stock(order_id):
    return f'stock updated for {order_id}'

def emit(event, **payload):
    if event == 'order_paid':                  # bus knows every subscriber
        return [send_email(**payload), update_stock(**payload)]
    return []` },
    mcq: { q: 'What should the inner decorator returned by <code>bus.on(event)</code> return?', options: ['The original function unchanged (after registering it)', 'A wrapper that calls emit', 'None'], answer: 0, explain: 'Registration decorators record and return the same function, so the name in the module still refers to the callable handler.' },
    hints: [`<p>Hint 1: <code>on(event)</code> is a factory: it captures the event name and returns <code>decorator(func)</code>.</p>`, `<p>Hint 2: Store handlers in <code>defaultdict(list)</code>; emit loops over a <b>copy</b> of the list so handlers can unsubscribe during emit safely.</p>`, `<p>Hint 3: Wrap each handler call in try/except Exception and append the exception object instead of crashing.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'bus = EventBus()\n' +
              '@bus.on(\'order_paid\')\n' +
              'def send_email(order_id):\n' +
              '    return \'email sent for %s\' % order_id\n' +
              '@bus.on(\'order_paid\')\n' +
              'def update_stock(order_id):\n' +
              '    return \'stock updated for %s\' % order_id\n' +
              'result = bus.emit(\'order_paid\', order_id=7)'
          ],
          ['email sent for 7', 'stock updated for 7']
        ],
        [
          [
            'bus = EventBus()\n' +
              '@bus.on(\'order_paid\')\n' +
              'def send_email(order_id):\n' +
              '    return \'email sent for %s\' % order_id\n' +
              '@bus.on(\'order_paid\')\n' +
              'def update_stock(order_id):\n' +
              '    return \'stock updated for %s\' % order_id\n' +
              'bus.off(\'order_paid\', send_email)\n' +
              'result = bus.emit(\'order_paid\', order_id=8)'
          ],
          ['stock updated for 8']
        ],
        [
          [
            'bus = EventBus()\n' +
              '@bus.on(\'order_paid\')\n' +
              'def send_email(order_id):\n' +
              '    return \'email sent for %s\' % order_id\n' +
              '@bus.on(\'order_paid\')\n' +
              'def update_stock(order_id):\n' +
              '    return \'stock updated for %s\' % order_id\n' +
              'result = bus.emit(\'nothing\')'
          ],
          []
        ],
        [
          [
            'bus = EventBus()\n' +
              '@bus.on(\'order_paid\')\n' +
              'def send_email(order_id):\n' +
              '    return \'email sent for %s\' % order_id\n' +
              '@bus.on(\'order_paid\')\n' +
              'def update_stock(order_id):\n' +
              '    return \'stock updated for %s\' % order_id\n' +
              '@bus.on(\'order_paid\')\n' +
              'def flaky(order_id):\n' +
              '    raise RuntimeError(\'crm down\')\n' +
              'r = bus.emit(\'order_paid\', order_id=1)\n' +
              'result = [r[0], r[1], type(r[2]).__name__, str(r[2])]'
          ],
          ['email sent for 1', 'stock updated for 1', 'RuntimeError', 'crm down']
        ],
        [
          [
            'bus = EventBus()\n' +
              'def f():\n' +
              '    return 1\n' +
              'result = bus.on(\'e\')(f) is f'
          ],
          true
        ],
        [
          [
            'a, b = EventBus(), EventBus()\n' +
              '@a.on(\'e\')\n' +
              'def f():\n' +
              '    return \'a\'\n' +
              'result = [a.emit(\'e\'), b.emit(\'e\')]'
          ],
          [['a'], []]
        ],
        [
          [
            'bus = EventBus()\n' +
              'order = []\n' +
              'for i in range(5):\n' +
              '    bus.on(\'e\')(lambda i=i: order.append(i))\n' +
              'bus.emit(\'e\')\n' +
              'result = order'
          ],
          [0, 1, 2, 3, 4]
        ],
        [
          [
            'bus = EventBus()\n' +
              'def make(i):\n' +
              '    return lambda **p: i\n' +
              'for i in range(10000):\n' +
              '    bus.on(\'e\')(make(i))\n' +
              'r = bus.emit(\'e\', x=1)\n' +
              'result = [len(r), r[0], r[-1]]'
          ],
          [10000, 0, 9999]
        ],
        [
          [
            'bus = EventBus()\n' +
              'def h1(**p):\n' +
              '    bus.off(\'e\', h1)\n' +
              '    return \'h1\'\n' +
              'def h2(**p):\n' +
              '    return \'h2\'\n' +
              'bus.on(\'e\')(h1); bus.on(\'e\')(h2)\n' +
              'result = [bus.emit(\'e\'), bus.emit(\'e\')]'
          ],
          [['h1', 'h2'], ['h2']]
        ],
        [
          [
            'bus = EventBus()\n' +
              '@bus.on(\'a\')\n' +
              'def fa(**p):\n' +
              '    return (\'a\', p)\n' +
              '@bus.on(\'b\')\n' +
              'def fb(**p):\n' +
              '    return (\'b\', p)\n' +
              'result = [bus.emit(\'a\', x=1, y=2), bus.emit(\'b\')]'
          ],
          [[['a', { x: 1, y: 2 }]], [['b', {  }]]]
        ],
        [
          [
            'bus = EventBus()\n' +
              'def h(**p):\n' +
              '    return None\n' +
              'bus.on(\'e\')(h)\n' +
              'bus.off(\'e\', h)\n' +
              'result = [bus.emit(\'e\'), bus.emit(\'e\')]'
          ],
          [[], []]
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
      approach: `<p>A dict of lists maps event → handlers. <code>on</code> is a method that returns a decorator closing over the event name; it appends and returns the function. <code>emit</code> forwards <code>**payload</code> and isolates handler failures.</p>`,
      code: { lang: 'python', run: true, code: `from collections import defaultdict

class EventBus:
    def __init__(self):
        self._handlers = defaultdict(list)

    def on(self, event):
        def decorator(func):
            self._handlers[event].append(func)
            return func                       # unchanged
        return decorator

    def off(self, event, handler):
        self._handlers[event].remove(handler)

    def emit(self, event, **payload):
        results = []
        for handler in list(self._handlers[event]):   # copy: safe if handlers unsubscribe
            try:
                results.append(handler(**payload))
            except Exception as exc:
                results.append(exc)
        return results

bus = EventBus()

@bus.on('order_paid')
def send_email(order_id):
    return f'email sent for {order_id}'

@bus.on('order_paid')
def update_stock(order_id):
    return f'stock updated for {order_id}'

@bus.on('order_paid')
def flaky(order_id):
    raise RuntimeError('crm down')

print(bus.emit('order_paid', order_id=7))
bus.off('order_paid', send_email)
print(bus.emit('order_paid', order_id=8))
print(bus.emit('nothing'))` },
      complexity: `<p>Register O(1); emit O(h) for h handlers; off O(h) (list removal).</p>`,
      followUps: ['Use <code>weakref.WeakMethod</code> so bound-method handlers do not keep objects alive.', 'Add priorities: handlers with higher priority run first.']
    }
  });

  practice.push({
    title: 'Predict the Output: Scope & nonlocal Puzzle', level: 'Medium', tags: ['LEGB', 'nonlocal', 'global', 'predict the output'], companies: ['Google', 'Goldman Sachs', 'Microsoft'],
    statement: `<p>Predict exactly what this program prints, line by line, and explain each line using LEGB, <code>global</code> and <code>nonlocal</code>:</p><pre>x = 'G'
def outer():
    x = 'E'
    def a():
        print('a:', x)
    def b():
        nonlocal x
        x = 'E2'
    def c():
        global x
        x = 'G2'
    a(); b(); a(); c(); a()
    return x
print(outer(), x)</pre>`,
    constraints: `No running allowed in the interview — reason it out, then verify.`,
    example: `<p>Answer: ${H.c('g', "a: E / a: E2 / a: E2 / E2 G2")}. <code>a</code> reads the enclosing x; <code>b</code> rebinds the enclosing x; <code>c</code> rebinds the <b>module</b> x, which <code>a</code> never sees because E shadows G.</p>`,
    brute: { why: `<p>Guessing from "the last assignment wins" gives <code>a: G2</code> for the final call — wrong. The global and the enclosing <code>x</code> are two separate variables; <code>c</code> changes only the module one.</p>`, code: `# Naive mental model: "there is only one x"
x = 'G'
history = []
for new in ['E', 'E2', 'G2']:
    x = new
    history.append(x)
print(history[-1])      # wrongly predicts 'G2' for every later read` },
    mcq: { q: 'After <code>c()</code> runs, what does <code>a()</code> print?', options: ['a: E2', 'a: G2', 'a: E'], answer: 0, explain: 'a looks up x: not local → enclosing outer.x, which b set to E2. The global x (now G2) is shadowed.' },
    hints: [`<p>Hint 1: There are two different variables named x: <code>outer</code>'s local (E) and the module global (G).</p>`, `<p>Hint 2: <code>nonlocal x</code> in b targets outer's x; <code>global x</code> in c targets the module x.</p>`, `<p>Hint 3: a has no assignment to x, so it always reads the nearest enclosing x — outer's.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'a: E\na: E2\na: E2\nE2 G2' }] },
    solution: {
      approach: `<p>Track the two variables separately: outer.x goes E → E2 (by b); module x goes G → G2 (by c). a always reads outer.x. outer returns outer.x; the final print reads module x.</p>`,
      code: { lang: 'python', run: true, code: `x = 'G'

def outer():
    x = 'E'
    def a():
        print('a:', x)          # reads enclosing x
    def b():
        nonlocal x              # rebinds outer's x
        x = 'E2'
    def c():
        global x                # rebinds the module x
        x = 'G2'
    a(); b(); a(); c(); a()
    return x

print(outer(), x)` },
      dry: { head: ['step', 'outer.x', 'module x', 'printed'], rows: [['a()', 'E', 'G', 'a: E'], ['b()', '<span class="c-y">E2</span>', 'G', '—'], ['a()', 'E2', 'G', 'a: E2'], ['c()', 'E2', '<span class="c-y">G2</span>', '—'], ['a()', 'E2', 'G2', 'a: E2'], ['print', 'returns E2', 'G2', '<span class="c-g">E2 G2</span>']] },
      complexity: `<p>Not an algorithm question — the skill is exact scope reasoning. O(1).</p>`,
      followUps: ['What error do you get if outer had no <code>x = \'E\'</code> line but b still says <code>nonlocal x</code>? (SyntaxError at compile time)']
    }
  });
  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Build Your Own @lru_cache(maxsize)', level: 'Hard', tags: ['decorator factory', 'OrderedDict', 'LRU', 'kwargs'], companies: ['Google', 'Amazon', 'Bloomberg'],
    statement: `<p>Implement <code>my_lru_cache(maxsize=128)</code>, a decorator factory that memoizes a function. Requirements: keys built from positional <b>and</b> keyword arguments (keyword order must not matter); O(1) hit/miss/evict; when full, evict the least recently used entry; expose <code>cache_info()</code> returning <code>(hits, misses, maxsize, currsize)</code> and <code>cache_clear()</code>; <code>maxsize=None</code> means unbounded; preserve metadata with <code>wraps</code>.</p>`,
    constraints: `Up to 10<sup>6</sup> calls; arguments are hashable; maxsize ≥ 1 or None.`,
    example: `<p>maxsize = 2, calls f(1), f(2), f(1), f(3), f(2): f(1) miss, f(2) miss, f(1) ${H.c('g', 'hit')} (1 becomes most recent), f(3) miss → evicts ${H.c('r', '2')}, f(2) miss → evicts 1. <code>cache_info()</code> → (1, 4, 2, 2).</p>`,
    brute: { why: `<p>A dict plus a Python list for recency order works, but moving a key to the end requires <code>list.remove(key)</code> — O(n) per hit — so a full cache of 10<sup>5</sup> entries makes each call slow. An <code>OrderedDict</code> (hash map + doubly linked list) does move/evict in O(1).</p>`, code: `import functools

def my_lru_cache(maxsize=128):
    def decorator(func):
        cache, order = {}, []
        @functools.wraps(func)
        def wrapper(*args):
            if args in cache:
                order.remove(args)          # O(n)
                order.append(args)
                return cache[args]
            result = func(*args)
            cache[args] = result
            order.append(args)
            if len(order) > maxsize:
                del cache[order.pop(0)]     # O(n) shift
            return result
        return wrapper
    return decorator` },
    mcq: { q: 'Which operation sequence implements an O(1) cache hit with OrderedDict?', options: ['<code>od.move_to_end(key)</code> then return <code>od[key]</code>', '<code>sorted(od)</code> then take the first', '<code>od.popitem(last=True)</code>'], answer: 0, explain: 'move_to_end marks the key most-recent in O(1); popitem(last=False) evicts the least-recent in O(1).' },
    hints: [`<p>Hint 1: You need a hash map for lookup and an ordering for recency — <code>collections.OrderedDict</code> gives both, with <code>move_to_end</code> and <code>popitem(last=False)</code>.</p>`, `<p>Hint 2: Key = <code>args</code> plus, if kwargs exist, a sentinel and <code>tuple(sorted(kwargs.items()))</code> so <code>f(a=1, b=2)</code> and <code>f(b=2, a=1)</code> share an entry.</p>`, `<p>Hint 3: Keep hits/misses in a small mutable object or use <code>nonlocal</code>. Evict only after inserting, while <code>len &gt; maxsize</code>. maxsize=None → never evict.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'calls = []\n' +
              '@my_lru_cache(maxsize=2)\n' +
              'def f(x):\n' +
              '    calls.append(x)\n' +
              '    return x * x\n' +
              'for v in [1, 2, 1, 3, 2]:\n' +
              '    f(v)\n' +
              'result = [tuple(f.cache_info()), calls]'
          ],
          [[1, 4, 2, 2], [1, 2, 3, 2]]
        ],
        [
          [
            '@my_lru_cache(maxsize=None)\n' +
              'def area(w, h=1):\n' +
              '    return w * h\n' +
              'area(2, h=3); area(2, h=3); area(w=2, h=3); area(h=3, w=2)\n' +
              'result = [tuple(area.cache_info()), area.__name__]'
          ],
          [[2, 2, null, 2], 'area']
        ],
        [
          [
            '@my_lru_cache(maxsize=None)\n' +
              'def f(x):\n' +
              '    return x\n' +
              'for i in range(1000):\n' +
              '    f(i)\n' +
              'r = tuple(f.cache_info())\n' +
              'f.cache_clear()\n' +
              'result = [r, tuple(f.cache_info())]'
          ],
          [[0, 1000, null, 1000], [0, 0, null, 0]]
        ],
        [
          [
            '@my_lru_cache(maxsize=1)\n' +
              'def f(x):\n' +
              '    return x\n' +
              'f(1); f(1); f(2); f(1)\n' +
              'result = tuple(f.cache_info())'
          ],
          [1, 3, 1, 1]
        ],
        [
          [
            '@my_lru_cache()\n' +
              'def f(x):\n' +
              '    """doc"""\n' +
              '    return x\n' +
              'result = [f.__name__, f.__doc__, tuple(f.cache_info())]'
          ],
          ['f', 'doc', [0, 0, 128, 0]]
        ],
        [
          [
            '@my_lru_cache(maxsize=3)\n' +
              'def f(x):\n' +
              '    return x\n' +
              'for v in [1, 2, 3, 1, 4, 2]:\n' +
              '    f(v)\n' +
              'result = tuple(f.cache_info())'
          ],
          [1, 5, 3, 3]
        ],
        [
          [
            'calls = []\n' +
              '@my_lru_cache(maxsize=2)\n' +
              'def f(x):\n' +
              '    calls.append(x)\n' +
              '    return x\n' +
              'for v in [1, 2, 1, 3, 1, 2]:\n' +
              '    f(v)\n' +
              'result = calls'
          ],
          [1, 2, 3, 2]
        ],
        [
          [
            '@my_lru_cache(maxsize=2)\n' +
              'def f(a, b=0, *, c=0):\n' +
              '    return a + b + c\n' +
              'result = [f(1, 2, c=3), f(1, 2, c=3), f(1, c=3, b=2), tuple(f.cache_info())]'
          ],
          [6, 6, 6, [1, 2, 2, 2]]
        ],
        [
          [
            '@my_lru_cache(maxsize=2)\n' +
              'def f():\n' +
              '    return \'z\'\n' +
              'result = [f(), f(), tuple(f.cache_info())]'
          ],
          ['z', 'z', [1, 1, 2, 1]]
        ],
        [
          [
            'import random, functools\n' +
              'rnd = random.Random(1)\n' +
              'calls = [0]\n' +
              'def base(x, y=0):\n' +
              '    calls[0] += 1\n' +
              '    return x * 31 + y\n' +
              'mine = my_lru_cache(maxsize=5)(base)\n' +
              'ref = functools.lru_cache(maxsize=5)(base)\n' +
              'ok = True\n' +
              'for _ in range(3000):\n' +
              '    x = rnd.randrange(12)\n' +
              '    if rnd.random() < 0.5:\n' +
              '        ok = ok and mine(x) == ref(x)\n' +
              '    else:\n' +
              '        y = rnd.randrange(3)\n' +
              '        ok = ok and mine(x, y=y) == ref(x, y=y)\n' +
              '    mi, ri = mine.cache_info(), ref.cache_info()\n' +
              '    ok = ok and tuple(mi) == tuple(ri)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random, functools\n' +
              'rnd = random.Random(2)\n' +
              'calls = [0]\n' +
              'def base(x, y=0):\n' +
              '    calls[0] += 1\n' +
              '    return x * 31 + y\n' +
              'mine = my_lru_cache(maxsize=1)(base)\n' +
              'ref = functools.lru_cache(maxsize=1)(base)\n' +
              'ok = True\n' +
              'for _ in range(2000):\n' +
              '    x = rnd.randrange(4)\n' +
              '    if rnd.random() < 0.5:\n' +
              '        ok = ok and mine(x) == ref(x)\n' +
              '    else:\n' +
              '        y = rnd.randrange(3)\n' +
              '        ok = ok and mine(x, y=y) == ref(x, y=y)\n' +
              '    mi, ri = mine.cache_info(), ref.cache_info()\n' +
              '    ok = ok and tuple(mi) == tuple(ri)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random, functools\n' +
              'rnd = random.Random(3)\n' +
              'calls = [0]\n' +
              'def base(x, y=0):\n' +
              '    calls[0] += 1\n' +
              '    return x * 31 + y\n' +
              'mine = my_lru_cache(maxsize=None)(base)\n' +
              'ref = functools.lru_cache(maxsize=None)(base)\n' +
              'ok = True\n' +
              'for _ in range(2000):\n' +
              '    x = rnd.randrange(50)\n' +
              '    if rnd.random() < 0.5:\n' +
              '        ok = ok and mine(x) == ref(x)\n' +
              '    else:\n' +
              '        y = rnd.randrange(3)\n' +
              '        ok = ok and mine(x, y=y) == ref(x, y=y)\n' +
              '    mi, ri = mine.cache_info(), ref.cache_info()\n' +
              '    ok = ok and tuple(mi) == tuple(ri)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random, functools\n' +
              'rnd = random.Random(4)\n' +
              'calls = [0]\n' +
              'def base(x, y=0):\n' +
              '    calls[0] += 1\n' +
              '    return x * 31 + y\n' +
              'mine = my_lru_cache(maxsize=100)(base)\n' +
              'ref = functools.lru_cache(maxsize=100)(base)\n' +
              'ok = True\n' +
              'for _ in range(300000):\n' +
              '    x = rnd.randrange(150)\n' +
              '    if rnd.random() < 0.5:\n' +
              '        ok = ok and mine(x) == ref(x)\n' +
              '    else:\n' +
              '        y = rnd.randrange(3)\n' +
              '        ok = ok and mine(x, y=y) == ref(x, y=y)\n' +
              '    mi, ri = mine.cache_info(), ref.cache_info()\n' +
              '    ok = ok and tuple(mi) == tuple(ri)\n' +
              'result = ok'
          ],
          true
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
      approach: `<p>Three-level decorator factory. The closure holds an OrderedDict and counters. Hit: <code>move_to_end</code> + count. Miss: compute, insert at the end, evict from the front if over capacity. The key is normalized so keyword order does not matter. Attach <code>cache_info</code>/<code>cache_clear</code> as function attributes.</p>`,
      code: { lang: 'python', run: true, code: `import functools
from collections import OrderedDict, namedtuple

CacheInfo = namedtuple('CacheInfo', 'hits misses maxsize currsize')
_KW = object()                                  # separates args from kwargs in keys

def my_lru_cache(maxsize=128):
    def decorator(func):
        cache = OrderedDict()
        hits = misses = 0

        def make_key(args, kwargs):
            if not kwargs:
                return args
            return args + (_KW,) + tuple(sorted(kwargs.items()))

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal hits, misses
            key = make_key(args, kwargs)
            if key in cache:
                hits += 1
                cache.move_to_end(key)          # now most recently used
                return cache[key]
            misses += 1
            result = func(*args, **kwargs)
            cache[key] = result
            if maxsize is not None and len(cache) > maxsize:
                cache.popitem(last=False)       # evict least recently used
            return result

        def cache_info():
            return CacheInfo(hits, misses, maxsize, len(cache))

        def cache_clear():
            nonlocal hits, misses
            cache.clear()
            hits = misses = 0

        wrapper.cache_info = cache_info
        wrapper.cache_clear = cache_clear
        return wrapper
    return decorator

@my_lru_cache(maxsize=2)
def square(x):
    print('  computing', x)
    return x * x

for v in [1, 2, 1, 3, 2]:
    square(v)
print(square.cache_info())                      # hits=1 misses=4 maxsize=2 currsize=2

@my_lru_cache(maxsize=None)
def area(w, h=1):
    return w * h
area(2, h=3); area(2, h=3); area(w=2, h=3); area(h=3, w=2)
print(area.cache_info(), area.__name__)         # kwargs order does not matter` },
      dry: { head: ['call', 'hit/miss', 'order (LRU → MRU)', 'evicted'], rows: [['square(1)', 'miss', '[1]', '—'], ['square(2)', 'miss', '[1, 2]', '—'], ['square(1)', '<span class="c-g">hit</span>', '[2, 1]', '—'], ['square(3)', 'miss', '[1, 3]', '<span class="c-r">2</span>'], ['square(2)', 'miss', '[3, 2]', '<span class="c-r">1</span>']] },
      complexity: `<p>O(1) average per call (plus key building, O(number of args)); O(maxsize) memory.</p>`,
      followUps: ['Add a TTL so entries expire after t seconds.', 'Make it thread-safe with a lock — and explain why you should not hold the lock while calling func.', 'Add <code>typed=True</code> support.']
    }
  });

  practice.push({
    title: '@trace That Works With or Without Arguments', level: 'Hard', tags: ['decorator', 'optional arguments', 'inspect', 'async'], companies: ['Meta', 'Microsoft', 'Netflix'],
    statement: `<p>Write a decorator <code>trace</code> usable as <code>@trace</code>, <code>@trace()</code> and <code>@trace(prefix='DB', show_result=False)</code>. On each call it appends a line to the module-level list <code>TRACE_LOG</code>: <code>"{prefix} {qualname}({args}) -&gt; {result}"</code> (omit <code>-&gt; …</code> when <code>show_result=False</code>), where args are rendered with <code>repr</code> (keyword args as <code>k=v</code>). It must preserve the signature (<code>inspect.signature</code>), work on methods, and work on <code>async def</code> functions (awaiting them).</p>`,
    constraints: `prefix and show_result are keyword-only; default prefix 'TRACE'.`,
    example: `<p><code>@trace def add(a, b)</code> → <code>add(2, b=3)</code> logs ${H.c('g', "'TRACE add(2, b=3) -&gt; 5'")}. <code>@trace(prefix='DB', show_result=False)</code> on <code>get(self, key)</code> logs <code>"DB Repo.get(&lt;Repo&gt;, 'k')"</code> style lines.</p>`,
    brute: { why: `<p>Writing two separate decorators (<code>trace</code> and <code>trace_with(prefix)</code>) and a third for async functions triplicates the logic, and users must remember which to use. One decorator that detects how it was called (and whether the target is a coroutine function) keeps the API simple.</p>`, code: `import functools

TRACE_LOG = []

def trace(func):                      # only works as @trace
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        TRACE_LOG.append(f'TRACE {func.__qualname__} -> {result!r}')
        return result
    return wrapper

def trace_with(prefix):               # second copy just for arguments
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            TRACE_LOG.append(f'{prefix} {func.__qualname__} -> {result!r}')
            return result
        return wrapper
    return decorator` },
    mcq: { q: 'How can one function tell <code>@trace</code> apart from <code>@trace(prefix="x")</code>?', options: ['Make the first parameter <code>func=None</code> and the options keyword-only; func is set only in the bare form', 'Check <code>len(sys.argv)</code>', 'Inspect the caller\'s source line'], answer: 0, explain: 'Bare @trace calls trace(func). With parentheses, trace is called with only keywords, so func is None → return the real decorator.' },
    hints: [`<p>Hint 1: Signature: <code>def trace(func=None, *, prefix='TRACE', show_result=True)</code>. If <code>func</code> is None, return <code>functools.partial(trace, prefix=..., show_result=...)</code> or an inner decorator.</p>`, `<p>Hint 2: Use <code>inspect.iscoroutinefunction(func)</code> to choose between a sync wrapper and an <code>async def</code> wrapper that <code>await</code>s.</p>`, `<p>Hint 3: <code>functools.wraps</code> sets <code>__wrapped__</code>, which makes <code>inspect.signature</code> report the original parameters. Format args with <code>', '.join([*map(repr, args), *(f'{k}={v!r}' for k, v in kwargs.items())])</code>.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'TRACE_LOG.clear()\n' +
              '@trace\n' +
              'def add(a, b):\n' +
              '    return a + b\n' +
              'r = add(2, b=3)\n' +
              'result = [r, list(TRACE_LOG)]'
          ],
          [5, ['TRACE add(2, b=3) -> 5']]
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              '@trace()\n' +
              'def neg(x):\n' +
              '    return -x\n' +
              'neg(4)\n' +
              'result = list(TRACE_LOG)'
          ],
          ['TRACE neg(4) -> -4']
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              'class Repo:\n' +
              '    def __repr__(self):\n' +
              '        return \'Repo()\'\n' +
              '    @trace(prefix=\'DB\', show_result=False)\n' +
              '    def get(self, key):\n' +
              '        return key.upper()\n' +
              'r = Repo().get(\'k\')\n' +
              'result = [r, list(TRACE_LOG)]'
          ],
          ['K', ['DB Repo.get(Repo(), \'k\')']]
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              'import asyncio\n' +
              '@trace(prefix=\'ASYNC\')\n' +
              'async def fetch(n):\n' +
              '    return n * 10\n' +
              'r = asyncio.run(fetch(5))\n' +
              'result = [r, list(TRACE_LOG)]'
          ],
          [50, ['ASYNC fetch(5) -> 50']]
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              'import inspect\n' +
              '@trace\n' +
              'def add(a, b=1):\n' +
              '    """doc"""\n' +
              '    return a + b\n' +
              'result = [str(inspect.signature(add)), add.__name__, add.__doc__]'
          ],
          ['(a, b=1)', 'add', 'doc']
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              '@trace\n' +
              'def f(*args, **kwargs):\n' +
              '    return len(args)\n' +
              'f(\'x\', 2, k=\'v\', z=None)\n' +
              'result = list(TRACE_LOG)'
          ],
          ['TRACE f(\'x\', 2, k=\'v\', z=None) -> 2']
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              '@trace(show_result=False)\n' +
              'def f():\n' +
              '    return 1\n' +
              'f()\n' +
              'result = list(TRACE_LOG)'
          ],
          ['TRACE f()']
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              '@trace(prefix=\'P\')\n' +
              'def f(s):\n' +
              '    return s\n' +
              'f(\'a\'); f(\'b\')\n' +
              'result = TRACE_LOG'
          ],
          ['P f(\'a\') -> \'a\'', 'P f(\'b\') -> \'b\'']
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              '@trace\n' +
              'def f(x):\n' +
              '    return x\n' +
              'for i in range(100000):\n' +
              '    f(i)\n' +
              'result = [len(TRACE_LOG), TRACE_LOG[0], TRACE_LOG[-1]]'
          ],
          [100000, 'TRACE f(0) -> 0', 'TRACE f(99999) -> 99999']
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              'import inspect\n' +
              '@trace\n' +
              'async def g():\n' +
              '    return 1\n' +
              'result = [inspect.iscoroutinefunction(g), g.__name__]'
          ],
          [true, 'g']
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              'import asyncio\n' +
              '@trace\n' +
              'async def g(x):\n' +
              '    await asyncio.sleep(0)\n' +
              '    return [x]\n' +
              'r = asyncio.run(g(3))\n' +
              'result = [r, list(TRACE_LOG)]'
          ],
          [[3], ['TRACE g(3) -> [3]']]
        ],
        [
          [
            'TRACE_LOG.clear()\n' +
              '@trace\n' +
              'def f(x):\n' +
              '    raise ValueError(\'bad\')\n' +
              'try:\n' +
              '    f(1)\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = list(TRACE_LOG)'
          ],
          []
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
      approach: `<p>Optional-argument pattern with a <code>func=None</code> sentinel and keyword-only options. A shared <code>record</code> helper formats the line; two wrapper variants handle sync and async targets. <code>wraps</code> keeps name, doc and signature.</p>`,
      code: { lang: 'python', run: true, code: `import asyncio
import functools
import inspect

TRACE_LOG = []

def trace(func=None, *, prefix='TRACE', show_result=True):
    if func is None:                                  # used as @trace(...) or @trace()
        return functools.partial(trace, prefix=prefix, show_result=show_result)

    def record(args, kwargs, result):
        shown = ', '.join([*map(repr, args), *(f'{k}={v!r}' for k, v in kwargs.items())])
        line = f'{prefix} {func.__qualname__}({shown})'
        if show_result:
            line += f' -> {result!r}'
        TRACE_LOG.append(line)

    if inspect.iscoroutinefunction(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)      # really await the coroutine
            record(args, kwargs, result)
            return result
        return async_wrapper

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        record(args, kwargs, result)
        return result
    return wrapper

@trace
def add(a, b):
    return a + b

@trace()
def neg(x):
    return -x

class Repo:
    def __repr__(self):
        return 'Repo()'
    @trace(prefix='DB', show_result=False)
    def get(self, key):
        return key.upper()

@trace(prefix='ASYNC')
async def fetch(n):
    await asyncio.sleep(0)
    return n * 10

add(2, b=3); neg(4); Repo().get('k'); asyncio.run(fetch(5))
print(*TRACE_LOG, sep='\\n')
print(inspect.signature(add), add.__name__)` },
      complexity: `<p>O(size of the rendered arguments) per call for formatting; O(1) otherwise. One extra frame per call.</p>`,
      followUps: ['Type it with <code>ParamSpec</code> and overloads so both usages type-check.', 'Truncate long reprs (e.g. <code>reprlib.repr</code>) to avoid giant log lines.']
    }
  });

  practice.push({
    title: 'Implement functools.partial Yourself', level: 'Hard', tags: ['closures', 'callable class', '*args/**kwargs'], companies: ['Google', 'Jane Street', 'Microsoft'],
    statement: `<p>Implement <code>my_partial(func, *args, **keywords)</code> returning a callable object with attributes <code>func</code>, <code>args</code> (tuple) and <code>keywords</code> (dict). Calling it with <code>*more, **kw</code> calls <code>func(*args, *more, **{**keywords, **kw})</code> (call-time keywords override frozen ones). Nesting must <b>flatten</b>: <code>my_partial(my_partial(f, 1), 2).func is f</code> and <code>.args == (1, 2)</code>. Provide a readable <code>repr</code>.</p>`,
    constraints: `func is any callable; must not mutate the stored keywords dict on calls.`,
    example: `<p><code>p = my_partial(int, base=2)</code>; <code>p('101')</code> → ${H.c('g', '5')}; <code>p('ff', base=16)</code> → ${H.c('g', '255')} (override). <code>q = my_partial(my_partial(max, 3), 9)</code>; <code>q(4)</code> → 9, <code>q.args == (3, 9)</code>.</p>`,
    brute: { why: `<p>A closure (<code>def p(*more, **kw): return func(*args, *more, **{**keywords, **kw})</code>) behaves correctly but exposes no <code>func/args/keywords</code> attributes, cannot flatten nested partials (each layer adds a call frame), and has an unhelpful repr.</p>`, code: `def my_partial(func, *args, **keywords):
    def p(*more, **kw):
        return func(*args, *more, **{**keywords, **kw})
    return p` },
    mcq: { q: 'Which merge gives call-time keywords priority over frozen ones?', options: ['<code>{**self.keywords, **kw}</code>', '<code>{**kw, **self.keywords}</code>', '<code>self.keywords.update(kw)</code>'], answer: 0, explain: 'In a dict display later keys win, so kw goes last. update() would permanently mutate the stored dict — a bug across calls.' },
    hints: [`<p>Hint 1: A small class with <code>__init__</code> storing the pieces and <code>__call__</code> doing the forward is the natural shape (that is how the real one works).</p>`, `<p>Hint 2: Flattening: if <code>func</code> is itself a <code>my_partial</code>, take its func, prepend its args, and merge its keywords under the new ones.</p>`, `<p>Hint 3: Copy keywords into a new dict in <code>__init__</code>; never mutate it in <code>__call__</code>. Check <code>callable(func)</code> and raise TypeError otherwise.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'p = my_partial(int, base=2)\n' +
              'result = [p(\'101\'), p(\'ff\', base=16), p.keywords]'
          ],
          [5, 255, { base: 2 }]
        ],
        [
          [
            'q = my_partial(my_partial(max, 3), 9)\n' +
              'result = [q(4), q.func is max, q.args]'
          ],
          [9, true, [3, 9]]
        ],
        [['p = my_partial(int, base=2)\nresult = repr(p)'], 'my_partial(<class \'int\'>, base=2)'],
        [['result = my_partial(42)'], '!TypeError'],
        [
          [
            'p = my_partial(int, base=2)\n' +
              'p(\'ff\', base=16)\n' +
              'result = p.keywords'
          ],
          { base: 2 }
        ],
        [['result = my_partial(lambda *a: a, 1, 2)(3, 4)'], [1, 2, 3, 4]],
        [
          [
            'def f(**k):\n' +
              '    return k\n' +
              'p = my_partial(my_partial(f, a=1), a=2, b=3)\n' +
              'result = [p.keywords, p()]'
          ],
          [{ a: 2, b: 3 }, { a: 2, b: 3 }]
        ],
        [
          [
            'p = my_partial(print)\n' +
              'result = [p.args, p.keywords, p.func is print]'
          ],
          [[], {  }, true]
        ],
        [
          [
            'def f(a, b, c):\n' +
              '    return (a, b, c)\n' +
              'p = my_partial(f, 1)\n' +
              'result = [p(2, 3), p(2, c=9), p.args]'
          ],
          [[1, 2, 3], [1, 2, 9], [1]]
        ],
        [
          [
            'p = f = len\n' +
              'for _ in range(10000):\n' +
              '    p = my_partial(p, 1)\n' +
              'result = [p.func is len, len(p.args), type(p).__name__]'
          ],
          [true, 10000, 'my_partial']
        ],
        [
          [
            'kw = {\'base\': 2}\n' +
              'p = my_partial(int, **kw)\n' +
              'kw[\'base\'] = 16\n' +
              'result = [p(\'11\'), p.keywords]'
          ],
          [3, { base: 2 }]
        ],
        [['p = my_partial(max, key=len)\nresult = p([\'a\', \'bbb\', \'cc\'])'], 'bbb'],
        [
          [
            'p = my_partial(my_partial(my_partial(pow, 2), 3), 5)\n' +
              'result = [p.args, p()]'
          ],
          [[2, 3, 5], 3]
        ],
        [['p = my_partial(int)\nresult = [p(\'7\'), repr(p)]'], [7, 'my_partial(<class \'int\'>)']]
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
      approach: `<p>A callable class: <code>__init__</code> validates and flattens, <code>__call__</code> forwards with unpacking, <code>__repr__</code> mirrors the standard one. Using <code>__slots__</code> keeps instances small.</p>`,
      code: { lang: 'python', run: true, code: `class my_partial:
    __slots__ = ('func', 'args', 'keywords')

    def __init__(self, func, *args, **keywords):
        if not callable(func):
            raise TypeError('the first argument must be callable')
        if isinstance(func, my_partial):              # flatten nested partials
            args = func.args + args
            keywords = {**func.keywords, **keywords}
            func = func.func
        self.func = func
        self.args = args
        self.keywords = dict(keywords)                # own copy

    def __call__(self, *more, **kw):
        return self.func(*self.args, *more, **{**self.keywords, **kw})

    def __repr__(self):
        parts = [repr(self.func), *map(repr, self.args),
                 *(f'{k}={v!r}' for k, v in self.keywords.items())]
        return f"my_partial({', '.join(parts)})"

p = my_partial(int, base=2)
print(p('101'), p('ff', base=16), p.keywords)          # 5 255 {'base': 2}
q = my_partial(my_partial(max, 3), 9)
print(q(4), q.func is max, q.args)                      # 9 True (3, 9)
print(repr(p))
try:
    my_partial(42)
except TypeError as e:
    print('TypeError:', e)` },
      complexity: `<p>O(a + k) per call to build the argument tuple and keyword dict; O(a + k) storage.</p>`,
      followUps: ['Add <code>__get__</code> so it can be used as a method (that is what <code>partialmethod</code> solves).', 'Support a placeholder sentinel to leave an early positional slot open (like Python 3.14\'s <code>functools.Placeholder</code>).']
    }
  });

  practice.push({
    title: '@enforce_types: Runtime Checks from Annotations', level: 'Hard', tags: ['decorator', 'inspect.signature', 'bind', 'annotations'], companies: ['Stripe', 'Databricks', 'Atlassian'],
    statement: `<p>Write <code>@enforce_types</code>. For each call, bind the actual arguments to the function's parameters (respecting defaults, keyword-only, <code>*args</code> and <code>**kwargs</code>), and for every parameter whose annotation is a plain <b>class</b> (like <code>int</code>, <code>str</code>), raise <code>TypeError("param 'x' expected int, got str")</code> if <code>isinstance</code> fails. Check the return value too if <code>return</code> is annotated with a class. Ignore annotations that are not classes (e.g. <code>list[int]</code>). Do the expensive introspection <b>once</b>, at decoration time.</p>`,
    constraints: `Must preserve metadata; errors from wrong argument counts should be the normal Python TypeError.`,
    example: `<p><code>@enforce_types def scale(x: int, factor: float = 2.0) -&gt; float</code>: <code>scale(3, 1.5)</code> → ${H.c('g', '4.5')}; <code>scale('3')</code> → ${H.c('r', "TypeError: param 'x' expected int, got str")}.</p>`,
    brute: { why: `<p>Hand-written <code>if not isinstance(...)</code> lines at the top of every function duplicate the annotations, drift out of sync, and still miss tricky binding cases (keyword vs positional, defaults). Calling <code>inspect.signature</code> on <b>every call</b> also wastes time.</p>`, code: `def scale(x, factor=2.0):
    if not isinstance(x, int):                 # duplicated knowledge
        raise TypeError("param 'x' expected int")
    if not isinstance(factor, float):
        raise TypeError("param 'factor' expected float")
    return x * factor` },
    mcq: { q: 'Which tool maps a call\'s actual arguments to parameter names exactly like Python does?', options: ['<code>inspect.signature(func).bind(*args, **kwargs)</code>', '<code>zip(func.__code__.co_varnames, args)</code>', '<code>func.__defaults__</code>'], answer: 0, explain: 'Signature.bind implements the full binding algorithm, including keyword arguments, *args/**kwargs and errors; apply_defaults() fills the rest.' },
    hints: [`<p>Hint 1: At decoration time: <code>sig = inspect.signature(func)</code> and collect <code>{name: annotation}</code> for annotations that are classes (<code>isinstance(ann, type)</code>).</p>`, `<p>Hint 2: At call time: <code>bound = sig.bind(*args, **kwargs)</code>; <code>bound.apply_defaults()</code>; then loop over <code>bound.arguments</code>.</p>`, `<p>Hint 3: For a <code>*args</code> parameter the bound value is a tuple — check each element; for <code>**kwargs</code> check each value. Note <code>bool</code> is a subclass of <code>int</code>, so <code>True</code> passes an <code>int</code> check.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'result = [scale(3, 1.5), scale(x=4), scale(True)]'
          ],
          [4.5, 8, 2]
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'try:\n' +
              '    scale(\'3\')\n' +
              '    result = \'no error\'\n' +
              'except TypeError as e:\n' +
              '    result = str(e)'
          ],
          'param \'x\' expected int, got str'
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'try:\n' +
              '    scale(3, \'f\')\n' +
              '    result = \'no error\'\n' +
              'except TypeError as e:\n' +
              '    result = str(e)'
          ],
          'param \'factor\' expected float, got str'
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'result = [total(1, 2, 3, label=\'t\', unit=\'kg\'), total()]'
          ],
          [6, 0]
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'try:\n' +
              '    total(1, \'x\')\n' +
              '    result = \'no error\'\n' +
              'except TypeError as e:\n' +
              '    result = str(e)'
          ],
          'param \'nums\' item expected int, got str'
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'try:\n' +
              '    total(1, note=5)\n' +
              '    result = \'no error\'\n' +
              'except TypeError as e:\n' +
              '    result = str(e)'
          ],
          'param \'extra\' value expected str, got int'
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'try:\n' +
              '    total(1, label=5)\n' +
              '    result = \'no error\'\n' +
              'except TypeError as e:\n' +
              '    result = str(e)'
          ],
          'param \'label\' expected str, got int'
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'try:\n' +
              '    scale()\n' +
              '    result = \'no error\'\n' +
              'except TypeError as e:\n' +
              '    result = \'missing\' in str(e)'
          ],
          true
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              '@enforce_types\n' +
              'def bad() -> int:\n' +
              '    return \'x\'\n' +
              'try:\n' +
              '    bad()\n' +
              'except TypeError as e:\n' +
              '    result = str(e)'
          ],
          'return value expected int, got str'
        ],
        [
          [
            '@enforce_types\n' +
              'def f(x: list[int], y) -> list:\n' +
              '    return x\n' +
              'result = [f([1], \'anything\'), f([\'a\'], 2)]'
          ],
          [[1], ['a']]
        ],
        [
          [
            '@enforce_types\n' +
              'def f(a, b=2):\n' +
              '    """doc"""\n' +
              '    return a + b\n' +
              'result = [f(1), f.__name__, f.__doc__]'
          ],
          [3, 'f', 'doc']
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'import inspect\n' +
              'result = [str(inspect.signature(scale)), scale.__name__]'
          ],
          ['(x: int, factor: float = 2.0) -> float', 'scale']
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'import inspect\n' +
              'orig = inspect.signature\n' +
              'n = [0]\n' +
              'def counting(*a, **k):\n' +
              '    n[0] += 1\n' +
              '    return orig(*a, **k)\n' +
              'inspect.signature = counting\n' +
              'try:\n' +
              '    for i in range(1000):\n' +
              '        scale(i)\n' +
              'finally:\n' +
              '    inspect.signature = orig\n' +
              'result = n[0]'
          ],
          0
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'n = 0\n' +
              'for i in range(100000):\n' +
              '    n += scale(i, 1.0) > -1\n' +
              'result = n'
          ],
          100000
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'result = [scale(1, 3.5), scale(-2)]'
          ],
          [3.5, -4]
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'try:\n' +
              '    scale(1, 2, 3)\n' +
              'except TypeError:\n' +
              '    result = \'arity\''
          ],
          'arity'
        ],
        [
          [
            '@enforce_types\n' +
              'def scale(x: int, factor: float = 2.0) -> float:\n' +
              '    return x * factor\n' +
              '\n' +
              '@enforce_types\n' +
              'def total(*nums: int, label: str = \'sum\', **extra: str) -> int:\n' +
              '    return sum(nums)\n' +
              'try:\n' +
              '    scale(y=1)\n' +
              'except TypeError:\n' +
              '    result = \'kw\''
          ],
          'kw'
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
      approach: `<p>Precompute the signature and the class-typed annotations once. On each call, use <code>Signature.bind</code> (raises the normal TypeError for bad arity), check each bound value (element-wise for variadics), call the function, then check the return annotation.</p>`,
      code: { lang: 'python', run: true, code: `import functools
import inspect

def enforce_types(func):
    sig = inspect.signature(func)                       # once, at decoration time
    checks = {name: p.annotation for name, p in sig.parameters.items()
              if isinstance(p.annotation, type) and p.annotation is not p.empty}   # 'empty' is itself a class!
    kinds = {name: p.kind for name, p in sig.parameters.items()}
    ret = sig.return_annotation
    ret = ret if isinstance(ret, type) and ret is not sig.empty else None

    def check(label, value, expected):
        if not isinstance(value, expected):
            raise TypeError(f"{label} expected {expected.__name__}, got {type(value).__name__}")

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        bound = sig.bind(*args, **kwargs)              # normal TypeError on bad arity
        bound.apply_defaults()
        for name, value in bound.arguments.items():
            if name not in checks:
                continue
            if kinds[name] is inspect.Parameter.VAR_POSITIONAL:
                for v in value:
                    check(f"param '{name}' item", v, checks[name])
            elif kinds[name] is inspect.Parameter.VAR_KEYWORD:
                for v in value.values():
                    check(f"param '{name}' value", v, checks[name])
            else:
                check(f"param '{name}'", value, checks[name])
        result = func(*args, **kwargs)
        if ret is not None:
            check('return value', result, ret)
        return result
    return wrapper

@enforce_types
def scale(x: int, factor: float = 2.0) -> float:
    return x * factor

@enforce_types
def total(*nums: int, label: str = 'sum', **extra: str) -> int:
    return sum(nums)

print(scale(3, 1.5), scale(x=4))
print(total(1, 2, 3, label='t', unit='kg'))
for bad in (lambda: scale('3'), lambda: total(1, 'x'), lambda: total(1, note=5), lambda: scale()):
    try:
        bad()
    except TypeError as e:
        print('TypeError:', e)
print(scale.__name__, inspect.signature(scale))` },
      complexity: `<p>Decoration: O(p) for p parameters. Per call: O(number of arguments) checks plus binding overhead.</p>`,
      followUps: ['Support <code>list[int]</code> and <code>int | None</code> using <code>typing.get_origin/get_args</code>.', 'Why do libraries like Pydantic generate validators ahead of time instead of introspecting per call?']
    }
  });

  practice.push({
    title: '@curry: f(a)(b)(c) == f(a, b, c)', level: 'Hard', tags: ['closures', 'recursion', 'partial application'], companies: ['Jane Street', 'Google', 'Two Sigma'],
    statement: `<p>Write a decorator <code>curry</code> for functions with a fixed number of required positional parameters. The curried function accepts arguments in any grouping: <code>f(1)(2)(3)</code>, <code>f(1, 2)(3)</code>, <code>f(1)(2, 3)</code> and <code>f(1, 2, 3)</code> all return the same result. Calling with zero arguments returns an equivalent curried function. Too many arguments raise <code>TypeError</code>. Each intermediate function must be independent (reusing <code>g = f(1)</code> twice must work).</p>`,
    constraints: `Arity from the function's signature (count required positional parameters), 1 ≤ arity ≤ 20.`,
    example: `<p><code>@curry def vol(l, w, h): return l * w * h</code> → <code>vol(2)(3)(4)</code> = ${H.c('g', '24')}; <code>g = vol(2); g(3, 4)</code> = 24 and <code>g(5)(1)</code> = ${H.c('g', '10')} (g reused). <code>vol(1, 2, 3, 4)</code> → ${H.c('r', 'TypeError')}.</p>`,
    brute: { why: `<p>Hand-nesting lambdas (<code>lambda a: lambda b: lambda c: f(a, b, c)</code>) only supports one-at-a-time calls, must be rewritten for each arity, and cannot accept grouped calls like <code>f(1, 2)(3)</code>.</p>`, code: `def curry3(f):
    return lambda a: lambda b: lambda c: f(a, b, c)    # one shape only

vol = curry3(lambda l, w, h: l * w * h)
print(vol(2)(3)(4))` },
    mcq: { q: 'Why must each step return a NEW function that captures the collected arguments, instead of appending to one shared list?', options: ['So intermediate functions can be reused independently (no shared mutable state)', 'Because lists are slow', 'Because closures cannot capture lists'], answer: 0, explain: 'If g = f(1) appended into a shared list, calling g(3, 4) and then g(5)(1) would mix arguments. Immutable tuples per step keep branches independent.' },
    hints: [`<p>Hint 1: Find the arity once: count parameters that are positional and have no default (<code>inspect.signature</code>).</p>`, `<p>Hint 2: Write a helper <code>collect(got)</code> that returns a function <code>step(*more)</code>: <code>args = got + more</code>; if enough → call f; else → return <code>collect(args)</code>.</p>`, `<p>Hint 3: Use tuples (immutable) for collected args so branches never interfere. Raise TypeError if <code>len(args) &gt; arity</code>. Use <code>functools.wraps</code> on each step.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            '@curry\n' +
              'def vol(l, w, h):\n' +
              '    return l * w * h\n' +
              'result = [vol(2)(3)(4), vol(2, 3)(4), vol(2)(3, 4), vol(2, 3, 4), vol()(2)()(3)(4)]'
          ],
          [24, 24, 24, 24, 24]
        ],
        [
          [
            '@curry\n' +
              'def vol(l, w, h):\n' +
              '    return l * w * h\n' +
              'g = vol(2)\n' +
              'result = [g(3, 4), g(5)(1), g(1)(1)]'
          ],
          [24, 10, 2]
        ],
        [
          [
            '@curry\n' +
              'def vol(l, w, h):\n' +
              '    return l * w * h\n' +
              'try:\n' +
              '    vol(1, 2, 3, 4)\n' +
              'except TypeError:\n' +
              '    result = \'TypeError\''
          ],
          'TypeError'
        ],
        [
          [
            '@curry\n' +
              'def vol(l, w, h):\n' +
              '    return l * w * h\n' +
              'result = vol.__name__'
          ],
          'vol'
        ],
        [['@curry\ndef neg(x):\n    return -x\nresult = [neg(5), neg()(6)]'], [-5, -6]],
        [
          [
            '@curry\n' +
              'def s20(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18, a19):\n' +
              '    return sum((a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18, a19,))\n' +
              'f = s20\n' +
              'for i in range(20):\n' +
              '    f = f(i)\n' +
              'result = f'
          ],
          190
        ],
        [
          [
            '@curry\n' +
              'def f(a, b, c=10):\n' +
              '    return a + b + c\n' +
              'result = f(1)(2)'
          ],
          13
        ],
        [
          [
            '@curry\n' +
              'def f(a, b, c=10):\n' +
              '    return a + b + c\n' +
              'try:\n' +
              '    f(1, 2, 3)\n' +
              'except TypeError:\n' +
              '    result = \'too many\''
          ],
          'too many'
        ],
        [
          [
            '@curry\n' +
              'def vol(l, w, h):\n' +
              '    return l * w * h\n' +
              'g = vol(1)\n' +
              'h = g(2)\n' +
              'result = [h(3), h(4), g(5, 6), h(7)]'
          ],
          [6, 8, 30, 14]
        ],
        [
          [
            '@curry\n' +
              'def vol(l, w, h):\n' +
              '    return l * w * h\n' +
              'try:\n' +
              '    vol(1)(2)(3)(4)\n' +
              'except TypeError:\n' +
              '    result = \'TypeError\''
          ],
          'TypeError'
        ],
        [
          [
            '@curry\n' +
              'def f(a, b):\n' +
              '    return [a, b]\n' +
              'result = [f(\'x\')(\'y\'), f(\'x\', \'y\')]'
          ],
          [['x', 'y'], ['x', 'y']]
        ],
        [
          [
            '@curry\n' +
              'def f(a, b, c):\n' +
              '    """doc"""\n' +
              '    return a - b - c\n' +
              'result = [f(10)(3)(2), f.__doc__]'
          ],
          [5, 'doc']
        ],
        [
          [
            '@curry\n' +
              'def vol(l, w, h):\n' +
              '    return l * w * h\n' +
              'r = []\n' +
              'for i in range(100000):\n' +
              '    r.append(vol(1)(i)(2))\n' +
              'result = [len(r), r[-1]]'
          ],
          [100000, 199998]
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
      approach: `<p>Recursive closure factory. <code>collect(got)</code> closes over an immutable tuple of arguments so far and returns a step function; each call either completes (enough args) or returns a fresh <code>collect</code> with a longer tuple.</p>`,
      code: { lang: 'python', run: true, code: `import functools
import inspect

def curry(func):
    params = inspect.signature(func).parameters.values()
    arity = sum(1 for p in params
                if p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD)
                and p.default is p.empty)

    def collect(got):
        @functools.wraps(func)
        def step(*more):
            args = got + more                       # new tuple: branches stay independent
            if len(args) > arity:
                raise TypeError(f'{func.__name__} takes {arity} arguments, got {len(args)}')
            if len(args) == arity:
                return func(*args)
            return collect(args)                    # need more: new closure
        return step
    return collect(())

@curry
def vol(l, w, h):
    return l * w * h

print(vol(2)(3)(4), vol(2, 3)(4), vol(2)(3, 4), vol(2, 3, 4), vol()(2)()(3)(4))
g = vol(2)
print(g(3, 4), g(5)(1))                             # 24 10 - g reused safely
try:
    vol(1, 2, 3, 4)
except TypeError as e:
    print('TypeError:', e)
print(vol.__name__)` },
      dry: { head: ['call', 'got (tuple)', 'len vs arity 3', 'returns'], rows: [['vol(2)', '(2,)', '1 &lt; 3', 'new step'], ['(3)', '(2, 3)', '2 &lt; 3', 'new step'], ['(4)', '(2, 3, 4)', '3 == 3', '<span class="c-g">24</span>'], ['g(5) with g = vol(2)', '(2, 5)', '2 &lt; 3', 'new step (g unchanged)']] },
      complexity: `<p>Each step copies the argument tuple: O(arity) per step, O(arity²) worst case across one-at-a-time calls (arity ≤ 20, negligible).</p>`,
      followUps: ['Support keyword arguments in the curried calls.', 'How is currying different from partial application?']
    }
  });
  /* ================= QUIZ ================= */
  quiz.push(
    { q: `What is printed?<pre>def f(): return 'hi'
g = f
f = None
print(g())</pre>`, options: ['<code>hi</code>', '<code>TypeError: \'NoneType\' object is not callable</code>', '<code>None</code>', '<code>NameError</code>'], answer: 0, explain: '<code>g = f</code> binds a second name to the same function object. Rebinding <code>f</code> to None does not affect the object or the name g.' },
    { q: `What happens?<pre>total = 0
def add(n):
    total += n
add(5)</pre>`, options: ['<code>UnboundLocalError</code>', 'total becomes 5', '<code>NameError</code> at definition time', 'total stays 0 silently'], answer: 0, explain: '<code>+=</code> is an assignment, so the compiler makes <code>total</code> local to add for the whole body; reading it before it has a value raises UnboundLocalError (a NameError subclass).' },
    { q: 'In which order does Python search for a name used inside a nested function?', options: ['Local → Enclosing → Global → Built-in', 'Global → Local → Enclosing → Built-in', 'Built-in → Global → Enclosing → Local', 'Local → Global → Enclosing → Built-in'], answer: 0, explain: 'LEGB: nearest scope first, stop at the first match, NameError if none.' },
    { q: `Output?<pre>fs = [lambda: i for i in range(3)]
print([f() for f in fs])</pre>`, options: ['<code>[2, 2, 2]</code>', '<code>[0, 1, 2]</code>', '<code>[0, 0, 0]</code>', 'NameError'], answer: 0, explain: 'Late binding: all lambdas share one variable i, looked up at call time, when it is 2. Fix with <code>lambda i=i: i</code> or partial.' },
    { q: 'When is <code>nonlocal x</code> required inside an inner function?', options: ['When the inner function rebinds x (e.g. <code>x += 1</code>) and x belongs to an enclosing function', 'Whenever the inner function reads x', 'When x is a module-level global', 'When x is a list and you call <code>x.append</code>'], answer: 0, explain: 'Only rebinding needs a declaration. Reading and mutating objects do not. Module globals need <code>global</code>; nonlocal would be a SyntaxError.' },
    { q: 'For <code>def f(a, b=2, *args, c, **kw)</code>, which call is valid?', options: ['<code>f(1, 2, 3, c=4, d=5)</code>', '<code>f(1, 2, 3, 4)</code>', '<code>f(1, a=1, c=3)</code>', '<code>f(c=3, 1)</code>'], answer: 0, explain: 'c is keyword-only and required. Option 2 misses c, option 3 gives a twice, option 4 puts a positional after a keyword (SyntaxError).' },
    { q: `<pre>@A
@B
def f(): ...</pre> is equivalent to…`, options: ['<code>f = A(B(f))</code>', '<code>f = B(A(f))</code>', '<code>f = A(f); f = B(f)</code> run in parallel', '<code>f = A(f) + B(f)</code>'], answer: 0, explain: 'Decorators are applied bottom-up (nearest to def first). At call time the outer wrapper A runs first.' },
    { q: 'What does <code>functools.wraps(func)</code> NOT do?', options: ['Make the wrapper run faster', 'Copy <code>__name__</code> and <code>__doc__</code> to the wrapper', 'Set <code>wrapper.__wrapped__ = func</code>', 'Update the wrapper\'s <code>__dict__</code> with func\'s'], answer: 0, explain: 'wraps only copies metadata (update_wrapper) and sets __wrapped__; it has no effect on speed.' },
    { q: 'Why does <code>@retry(times=3)</code> need three nested functions?', options: ['retry(times=3) is called first and must return the decorator, which returns the wrapper', 'Python limits decorators to three levels', 'To make it thread-safe', 'Because wraps requires it'], answer: 0, explain: 'The expression after @ is evaluated (a call to the factory); its result is applied to the function and must return the wrapper.' },
    { q: 'Which function is UNSAFE to decorate with <code>@lru_cache</code>?', options: ['<code>def now_plus(s): return time.time() + s</code>', '<code>def fib(n): ...</code> (pure recursion)', '<code>def is_prime(n): ...</code>', '<code>def edit_distance(a: str, b: str): ...</code>'], answer: 0, explain: 'It depends on a hidden input (the clock), so cached results become wrong. Cache only pure functions with hashable arguments.' },
    { q: 'What does <code>reduce(lambda a, x: a * x, [])</code> do?', options: ['Raises <code>TypeError</code> (empty sequence, no initial value)', 'Returns 1', 'Returns 0', 'Returns None'], answer: 0, explain: 'Without an initial value, reduce needs at least one item. Pass the identity: <code>reduce(mul, [], 1)</code> → 1.' },
    { q: '<code>p = partial(pow, exp=2)</code>. What is <code>p(3, exp=3)</code>?', options: ['27 — call-time keywords override frozen ones', '9 — frozen keywords always win', 'TypeError: multiple values for exp', '6'], answer: 0, explain: 'partial merges keywords as {**frozen, **call_time}, so the call-time exp=3 wins: 3**3 = 27.' },
    { q: 'A loop variable and a comprehension variable — which one is still defined after the statement finishes (at module level)?', options: ['Only the for-loop variable', 'Only the comprehension variable', 'Both', 'Neither'], answer: 0, explain: 'Python has no block scope, so for-loop variables leak. Comprehensions have their own scope, so their variable does not.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'What does it mean that functions are first-class objects in Python?', level: 'B', a: `<p>A function is a value like any other: you can bind it to another name, store it in lists and dicts, pass it as an argument and return it from another function. <code>def</code> creates a <code>function</code> object with attributes such as <code>__name__</code>, <code>__doc__</code>, <code>__defaults__</code>, <code>__code__</code> and <code>__closure__</code>. This enables higher-order functions (<code>sorted(key=…)</code>, <code>map</code>), dispatch tables (<code>OPS[cmd](a, b)</code>), callbacks, closures and decorators. The key distinction is <code>f</code> (the object) vs <code>f()</code> (calling it).</p>`, followUps: ['What else is callable besides functions?', 'What is stored in <code>__defaults__</code> and when is it evaluated?'] },
    { q: 'Explain the LEGB rule and the UnboundLocalError.', level: 'B', a: `<p>Name lookup searches Local, Enclosing function scopes (innermost first), Global (module) and Built-in, stopping at the first match. Scope is decided at <b>compile time</b>: if a function assigns a name anywhere (=, +=, for, import, def), the name is local throughout that function. So <code>count += 1</code> with only a global <code>count</code> raises <code>UnboundLocalError</code> — the local slot is empty when read. Fix with <code>global</code>/<code>nonlocal</code> declarations, or better, pass values in and return them.</p>`, followUps: ['Do if/for blocks create scopes?', 'Why can a method not see a class attribute by its bare name?'] },
    { q: 'What is a closure and how does Python implement it?', level: 'I', a: `<p>A closure is a nested function that references variables of its enclosing function and keeps them alive after the outer function returns. CPython stores such variables in <b>cell objects</b>: the outer code object lists them in <code>co_cellvars</code>, the inner in <code>co_freevars</code>, and the inner function's <code>__closure__</code> is a tuple of the shared cells (<code>cell_contents</code> shows the value). Access uses <code>LOAD_DEREF</code>/<code>STORE_DEREF</code>. Each call to the factory creates new cells, so closures from different calls are independent. Closures capture variables, not values (late binding).</p>`, followUps: ['How do you fix the lambda-in-a-loop bug?', 'When would you prefer a class over a closure?'] },
    { q: 'global vs nonlocal: when do you need each, and when do you need neither?', level: 'I', a: `<p><code>global x</code> makes assignments to x in the function rebind the module-level x. <code>nonlocal x</code> rebinds x in the nearest enclosing <b>function</b> scope; the name must already exist there (else SyntaxError) and it can never target globals. You need neither to <b>read</b> a variable or to <b>mutate</b> a mutable object it refers to (<code>cache[k] = v</code>, <code>items.append(x)</code>) — only to rebind the name. In production, prefer avoiding global state; nonlocal is fine for small closure state like counters.</p>`, followUps: ['What does <code>nonlocal</code> do if two enclosing levels define x?', 'Why is mutable global state hard to test?'] },
    { q: 'Explain *args and **kwargs, and the order of parameter kinds.', level: 'B', a: `<p>In a definition, <code>*args</code> collects extra positional arguments into a tuple and <code>**kwargs</code> collects extra keyword arguments into a new dict. In a call, <code>*seq</code> and <code>**mapping</code> unpack. The allowed order is: positional-only (before <code>/</code>), positional-or-keyword, <code>*args</code> (or bare <code>*</code>), keyword-only, <code>**kwargs</code>. Binding fills positionals left to right, overflow to *args, keywords by name (duplicates → TypeError), unknown names to **kwargs, then defaults. The main use is forwarding: <code>func(*args, **kwargs)</code> in wrappers.</p>`, followUps: ['Why use keyword-only parameters?', 'What problem does positional-only (/) solve?'] },
    { q: 'Write a decorator from scratch and explain what happens at import time vs call time.', level: 'I', a: `<p><code>def deco(func): @functools.wraps(func) def wrapper(*args, **kwargs): ... return func(*args, **kwargs); return wrapper</code>. At import (definition) time, <code>@deco</code> runs <code>func = deco(func)</code> once: the decorator body executes and returns the wrapper, which closes over <code>func</code>. At call time, every call goes to <code>wrapper</code>, which runs the extra logic and forwards to the original. Side effects in the decorator body (like registration) therefore happen on import, and stacking applies bottom-up but executes top-down.</p>`, followUps: ['What breaks if you forget to return the result?', 'How do you decorate an async function correctly?'] },
    { q: 'Why is functools.wraps important? What exactly does it copy?', level: 'I', a: `<p>Without it, a decorated function's identity becomes the wrapper's: <code>__name__ == 'wrapper'</code>, docstring lost, <code>inspect.signature</code> shows <code>(*args, **kwargs)</code>. That breaks logging, help(), debuggers, test runners, web routers and AI tool registries that read names and docstrings. <code>wraps</code> calls <code>update_wrapper</code>, which copies <code>__module__</code>, <code>__name__</code>, <code>__qualname__</code>, <code>__doc__</code>, <code>__annotations__</code> (and <code>__type_params__</code> in 3.12+), updates <code>__dict__</code>, and sets <code>__wrapped__</code> so <code>inspect.signature</code> and <code>inspect.unwrap</code> can reach the original.</p>`, followUps: ['How can a test bypass the decorator?', 'Does wraps change the runtime behaviour?'] },
    { q: 'Implement a decorator that takes arguments, e.g. @retry(times=3). Then make it work without parentheses too.', level: 'A', a: `<p>Three levels: <code>def retry(times=3, exceptions=(Exception,)):</code> returns <code>decorator(func)</code>, which returns <code>wrapper(*args, **kwargs)</code> looping over attempts, returning on success and using bare <code>raise</code> on the last failure to keep the original exception. For optional parentheses: <code>def retry(func=None, *, times=3): if func is None: return functools.partial(retry, times=times)</code>, otherwise build the wrapper directly. Production details: retry only transient errors and idempotent operations, use exponential backoff with jitter, and async-aware sleeping.</p>`, followUps: ['What happens if a user writes @retry on the three-level version?', 'Why use a bare raise instead of raising a new exception?'] },
    { q: 'How does lru_cache work internally, and what are its pitfalls?', level: 'A', a: `<p>It is a C-implemented wrapper holding a dict from a key (positional args + keyword items, optionally types with <code>typed=True</code>) to results, plus a circular doubly linked list for recency when <code>maxsize</code> is bounded: hits move to the front, misses insert and evict the oldest in O(1). <code>maxsize=None</code> (or <code>@cache</code>) skips the list. Pitfalls: arguments must be hashable; only for pure functions; it holds strong references (memory, and on methods it keeps <code>self</code> alive → use cached_property or a per-instance cache); keyword order can create separate entries; concurrent misses may compute twice; async functions would cache single-use coroutines; deep recursion still hits the recursion limit.</p>`, followUps: ['How would you add a TTL?', 'How do you implement an LRU cache by hand in O(1)?'] },
    { q: 'What is functools.partial and how is it different from a lambda?', level: 'I', a: `<p><code>partial(func, *args, **kw)</code> returns a callable that remembers the function and some arguments: call-time positional args are appended, and call-time keywords override the frozen ones. Differences from a lambda: it captures argument <b>values</b> immediately (no late-binding bug in loops), is introspectable (<code>.func</code>, <code>.args</code>, <code>.keywords</code>), has a useful repr, flattens nested partials, and is <b>picklable</b> when the function is — important for multiprocessing. A lambda is more flexible (can reorder arguments or compute), but anonymous and not picklable.</p>`, followUps: ['How would you freeze the second positional argument only?', 'What is partialmethod for?'] },
    { q: 'When would you use functools.reduce, and when should you avoid it?', level: 'I', a: `<p><code>reduce(f, iterable, initial)</code> left-folds a sequence: <code>acc = f(acc, x)</code> for each item. Use it for genuine folds with no built-in equivalent: composing functions, gcd/lcm of a list, merging dicts, applying a sequence of transformations. Always pass an initial value if the iterable may be empty (else TypeError). Avoid it when <code>sum</code>, <code>math.prod</code>, <code>max</code>, <code>any</code>/<code>all</code>, <code>''.join</code> or a plain loop with clear variable names would be more readable — which is why it was moved out of builtins in Python 3.</p>`, followUps: ['Write compose(*fns) with reduce.', 'Is reduce lazy?'] },
    { q: 'Class-based decorators: how do they work and what goes wrong on methods?', level: 'E', a: `<p>Any callable can be a decorator. A class decorator-implementation stores the function in <code>__init__</code> and runs logic in <code>__call__</code>; a decorator <i>factory</i> class takes settings in <code>__init__</code> and the function in <code>__call__</code>. Problem: if the instance itself replaces a method, attribute access does not bind <code>self</code>, because instances are not descriptors — functions are (they implement <code>__get__</code>). Fix by implementing <code>__get__</code> returning <code>functools.partial(self.__call__, instance)</code> or <code>types.MethodType(self, instance)</code>, or simply return a function wrapper from <code>__call__</code>. Also call <code>functools.update_wrapper(self, func)</code> to keep metadata.</p>`, followUps: ['Explain the descriptor protocol briefly.', 'How do @property and @staticmethod interact with custom decorators in a stack?'] },
    { q: 'How do you type-annotate a decorator so type checkers keep the original signature?', level: 'E', a: `<p>Use <code>ParamSpec</code> and a <code>TypeVar</code> for the return: <code>def timer[**P, R](func: Callable[P, R]) -&gt; Callable[P, R]</code> (3.12 syntax; earlier: <code>P = ParamSpec('P')</code>, <code>R = TypeVar('R')</code>). The wrapper is declared <code>def wrapper(*args: P.args, **kwargs: P.kwargs) -&gt; R</code>. For decorators that add or remove a leading parameter use <code>Concatenate[Request, P]</code>. For decorator factories, annotate the factory as returning <code>Callable[[Callable[P, R]], Callable[P, R]]</code>; for optional-parentheses decorators add <code>@overload</code>s. Async wrappers use <code>Callable[P, Awaitable[R]]</code>.</p>`, followUps: ['What does Concatenate express?', 'Why do untyped decorators hurt IDE autocomplete?'] }
  );
  /* Spread correct answers across positions (deterministic rotation). */
  function rotate(m, k) {
    if (!m || !m.options) return;
    var n = m.options.length, s = k % n;
    if (!s) return;
    m.options = m.options.slice(n - s).concat(m.options.slice(0, n - s));
    m.answer = (m.answer + s) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i); });
  practice.forEach(function (p, i) { rotate(p.mcq, i + 1); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p) { rotate(p.mcq, i + 2); }); });

  registerModule({
    id: 'py06',
    title: 'Closures, Decorators & functools',
    intro: `<p>This module is where Python stops being "a list of statements" and becomes a language of <b>functions that build, wrap and remember other functions</b>. You will learn to treat functions as values, predict exactly which variable a name refers to (the <b>LEGB</b> rule and the dreaded <code>UnboundLocalError</code>), build <b>closures</b> that carry private state, master <code>*args</code>/<code>**kwargs</code> forwarding, and write <b>decorators</b> — plain, stacked, with arguments, and class-based — the way production libraries do. Finally you will use the <code>functools</code> toolkit (<code>wraps</code>, <code>partial</code>, <code>lru_cache</code>/<code>cache</code>, <code>reduce</code> and friends).</p>
<p>Interviewers love this area because "predict the output" puzzles (late binding, scope, decorator order) instantly reveal whether you can simulate the interpreter in your head, and because <code>@retry</code>, <code>@timer</code> and <code>@lru_cache</code> show up in real code every day — including AI apps, where tools, tracing, retries and caching are all decorators.</p>`,
    goals: [
      'Use functions as values: pass, return and store them; build dispatch tables and key functions; avoid the mutable-default trap',
      'Predict any name lookup with LEGB, explain <code>UnboundLocalError</code>, and choose correctly between <code>global</code>, <code>nonlocal</code> and returning values',
      'Build closures with private state, inspect <code>__closure__</code> cells, and fix the late-binding bug in loops',
      'Explain the argument-binding algorithm and the five parameter kinds; forward any call with <code>*args, **kwargs</code>',
      'Write correct decorators: <code>functools.wraps</code>, stacking order, decorator factories (<code>@retry(times=3)</code>), optional-parentheses and class decorators',
      'Apply <code>partial</code>, <code>lru_cache</code>/<code>cache</code> and <code>reduce</code> appropriately, and implement an LRU memoizer and <code>partial</code> yourself'
    ],
    prereqs: `Python 2 (Control Flow, Functions & Core Collections), Python 4 (OOP Basics — for methods and callable classes) and Python 5 (Data Structure Internals — dicts/hashing for caches). Comfort with writing small functions and reading tracebacks.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
