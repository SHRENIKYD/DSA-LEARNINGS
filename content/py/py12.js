(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // String.raw keeps backslashes exactly as typed, so Python code like "a\nb" stays "a\nb".
  var R = String.raw;

  /* ----------------------------------------------------------------------
     Shared visualizer helpers for py12 (CPython Internals)
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Python-ish repr of a JS value used inside the visualizers.
  function pyRepr(v) {
    if (v === null || v === undefined) return 'None';
    if (typeof v === 'number') {
      if (Number.isInteger(v) && !v.__float) return String(v);
      return String(v);
    }
    if (typeof v === 'object' && v.f !== undefined) {
      var s = String(v.f);
      return /[.eE]|Infinity|NaN/.test(s) ? s : s + '.0';
    }
    return String(v);
  }
  // Lay out n nodes on a circle inside a graph box of the given height.
  function circleLayout(ids, height) {
    var n = ids.length, out = [];
    ids.forEach(function (id, i) {
      var ang = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
      out.push({ id: id, x: Math.round(50 + 34 * Math.cos(ang)), y: Math.round(height / 2 + (height / 2 - 8) * Math.sin(ang)) });
    });
    return out;
  }
  // Highlight map for a list of 1-based code lines.
  function lines(arr, cls) { var h = {}; arr.forEach(function (n) { h[n] = cls; }); return h; }

  /* ======================================================================
     TOPIC 1: Bytecode & dis
     ====================================================================== */
  // A tiny compiler + stack VM that mimics what CPython does for simple
  // "name = expression" programs (constant folding included).
  function bcCompileAndRun(input) {
    var src = String(input || '').replace(/\r/g, '');
    var stmts = src.split(/[\n;]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s && s.charAt(0) !== '#'; });
    if (!stmts.length) throw new Error('Type statements like:  x = 4 ; y = x * 2 + 3');
    if (stmts.length > 6) throw new Error('Use at most 6 statements');
    function tokenize(s) {
      var t = [], re = /\s*(\d+|[A-Za-z_]\w*|\/\/|[-+*\/%()=])/y, m, pos = 0;
      s = s.replace(/\s+$/, '');
      while (pos < s.length) {
        re.lastIndex = pos; m = re.exec(s);
        if (!m) throw new Error('Only integers, names, + - * / // % ( ) and = are supported (problem near "' + s.slice(pos) + '")');
        t.push(m[1]); pos = re.lastIndex;
      }
      return t;
    }
    var PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '//': 2, '%': 2 };
    function parseExpr(toks) {
      var i = 0;
      function primary() {
        var tk = toks[i];
        if (tk === undefined) throw new Error('Expression ended too early');
        if (tk === '(') { i++; var e = expr(0); if (toks[i] !== ')') throw new Error('Missing ")"'); i++; return e; }
        if (tk === '-') { i++; return { k: 'neg', e: primary() }; }
        if (/^\d+$/.test(tk)) { i++; return { k: 'num', v: { t: 'int', v: Number(tk) } }; }
        if (/^[A-Za-z_]\w*$/.test(tk)) { i++; return { k: 'name', n: tk }; }
        throw new Error('Unexpected "' + tk + '"');
      }
      function expr(minP) {
        var left = primary();
        while (i < toks.length && PREC[toks[i]] !== undefined && PREC[toks[i]] > minP - 1 && PREC[toks[i]] >= minP) {
          var op = toks[i]; i++;
          var right = expr(PREC[op] + 1);
          left = { k: 'bin', op: op, l: left, r: right };
        }
        return left;
      }
      var e = expr(0);
      if (i !== toks.length) throw new Error('Unexpected "' + toks[i] + '"');
      return e;
    }
    function show(v) {
      if (v === null) return 'None';
      if (v.t === 'float') { var s = String(v.v); return /[.e]|Infinity|NaN/.test(s) ? s : s + '.0'; }
      return String(v.v);
    }
    function binop(op, a, b) {
      var isF = a.t === 'float' || b.t === 'float';
      if (op === '+') return { t: isF ? 'float' : 'int', v: a.v + b.v };
      if (op === '-') return { t: isF ? 'float' : 'int', v: a.v - b.v };
      if (op === '*') return { t: isF ? 'float' : 'int', v: a.v * b.v };
      if (b.v === 0) return { err: 'ZeroDivisionError: division by zero' };
      if (op === '/') return { t: 'float', v: a.v / b.v };
      if (op === '//') return { t: isF ? 'float' : 'int', v: Math.floor(a.v / b.v) };
      if (op === '%') { var r = a.v % b.v; if (r !== 0 && (r < 0) !== (b.v < 0)) r += b.v; return { t: isF ? 'float' : 'int', v: r }; }
      return { err: 'bad op' };
    }
    var folds = [];
    function fold(n) {
      if (n.k === 'bin') {
        n.l = fold(n.l); n.r = fold(n.r);
        if (n.l.k === 'num' && n.r.k === 'num') {
          var r = binop(n.op, n.l.v, n.r.v);
          if (!r.err && Math.abs(r.v) < 1e15) { folds.push(show(n.l.v) + ' ' + n.op + ' ' + show(n.r.v) + ' → ' + show(r)); return { k: 'num', v: r }; }
        }
      } else if (n.k === 'neg') {
        n.e = fold(n.e);
        if (n.e.k === 'num') { var nv = { t: n.e.v.t, v: -n.e.v.v }; folds.push('-' + show(n.e.v) + ' → ' + show(nv)); return { k: 'num', v: nv }; }
      }
      return n;
    }
    var consts = [], names = [], code = [];
    function cidx(v) { var s = show(v) + '|' + (v ? v.t : 'none'); for (var i = 0; i < consts.length; i++) if (consts[i].key === s) return i; consts.push({ key: s, v: v }); return consts.length - 1; }
    function nidx(n) { var i = names.indexOf(n); if (i < 0) { names.push(n); i = names.length - 1; } return i; }
    var OPN = { '+': 0, '//': 2, '*': 5, '%': 6, '-': 10, '/': 11 };
    function emit(n, line) {
      if (n.k === 'num') { var ci = cidx(n.v); code.push({ op: 'LOAD_CONST', arg: ci, txt: show(n.v), line: line }); }
      else if (n.k === 'name') { var ni = nidx(n.n); code.push({ op: 'LOAD_NAME', arg: ni, txt: n.n, line: line }); }
      else if (n.k === 'neg') { emit(n.e, line); code.push({ op: 'UNARY_NEGATIVE', arg: '', txt: '', line: line }); }
      else { emit(n.l, line); emit(n.r, line); code.push({ op: 'BINARY_OP', arg: OPN[n.op], txt: n.op, sym: n.op, line: line }); }
    }
    stmts.forEach(function (s, li) {
      var m = /^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/.exec(s);
      var target = m ? m[1] : null, ex = m ? m[2] : s;
      var tree = fold(parseExpr(tokenize(ex)));
      emit(tree, li + 1);
      if (target) { var ni = nidx(target); code.push({ op: 'STORE_NAME', arg: ni, txt: target, line: li + 1 }); }
      else code.push({ op: 'POP_TOP', arg: '', txt: '', line: li + 1 });
    });
    var noneIdx = cidx(null);
    code.push({ op: 'RETURN_CONST', arg: noneIdx, txt: 'None', line: stmts.length });
    if (code.length > 60) throw new Error('Program too long for the visualizer: keep it under ~60 instructions');
    var listing = code.map(function (c, i) {
      var off = String(i * 2); while (off.length < 3) off = ' ' + off;
      var opn = c.op; while (opn.length < 15) opn += ' ';
      return off + ' ' + opn + ' ' + c.arg + (c.txt !== '' ? ' (' + c.txt + ')' : '');
    }).join('\n');
    var constsShown = consts.map(function (c) { return show(c.v); });
    return { stmts: stmts, code: code, listing: listing, consts: constsShown, constVals: consts.map(function (c) { return c.v; }), names: names, folds: folds, show: show, binop: binop };
  }

  topics.push({
    title: 'Bytecode & dis: What Your Code Turns Into',
    analogy: R`<p>Imagine a cookbook written in beautiful prose: "gently fold the eggs into the flour". A <b>robot cook</b> cannot read prose, so a translator rewrites the recipe as a list of tiny numbered orders: <i>"1. pick up eggs. 2. pick up flour. 3. combine the top two things on the tray. 4. put the result in bowl B."</i> The robot has one <b>tray stack</b>: it puts things on top and takes things off the top. CPython works exactly like that. Your <code>.py</code> file is the prose, <b>bytecode</b> is the numbered list of orders, the <b>value stack</b> is the tray, and the <code>dis</code> module is the window that lets you read the robot's instruction sheet.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Python does not run your text directly. When you run or import a file, CPython first <b>compiles</b> it into <b>bytecode</b>: a compact list of simple instructions for a <b>stack machine</b>. Then a big loop in C (the <b>interpreter</b>, next topic) executes those instructions one by one. "Compiled" here does not mean machine code; it means "translated into this simpler instruction list".</p>
      <p><b>The pipeline, step by step:</b></p>
      ${H.table(['Stage', 'What happens', 'Peek at it with'], [
        ['1. Tokenize', 'text is cut into tokens: <code>NAME x</code>, <code>OP =</code>, <code>NUMBER 4</code>', '<code>python -m tokenize file.py</code>'],
        ['2. Parse', 'tokens become an <b>AST</b> (abstract syntax tree)', '<code>ast.dump(ast.parse(src), indent=2)</code>'],
        ['3. Symbol table', 'each name is classified: local, global, free (closure) or cell', '<code>symtable.symtable(src, "f", "exec")</code>'],
        ['4. Compile + optimize', 'AST becomes bytecode; constants are folded (<code>24*60*60</code> becomes <code>86400</code>), jumps are tidied', '<code>dis.dis(func)</code>'],
        ['5. Code object', 'bytecode + constants + names are packed in a <code>code</code> object', '<code>func.__code__</code>'],
        ['6. Cache to disk', 'imported modules are saved as <code>__pycache__/mod.cpython-313.pyc</code>', '<code>python -m py_compile</code>'],
        ['7. Execute', 'the evaluation loop runs the instructions', 'next topic']
      ])}
      <p><b>What is inside a code object?</b> The important attributes:</p>
      ${H.kv([['co_code', 'the raw bytes (2 bytes per instruction: opcode + argument)'], ['co_consts', 'tuple of constants: numbers, strings, None, nested code objects'], ['co_names', 'global / attribute names used'], ['co_varnames', 'local variable names (arguments first)'], ['co_argcount', 'how many positional parameters'], ['co_firstlineno / co_lines()', 'mapping back to your source lines']], { label: 'func.__code__' })}
      <p><b>Reading <code>dis</code> output.</b> Each row is <code>line · offset · OPNAME · arg · (human-readable arg)</code>. For <code>c = a * b + 1</code> inside a function, Python 3.12 shows roughly:</p>
      <pre>LOAD_FAST   a        # push a on the stack
LOAD_FAST   b        # push b
BINARY_OP   5 (*)    # pop two, push a*b
LOAD_CONST  1 (1)    # push the constant 1
BINARY_OP   0 (+)    # pop two, push (a*b)+1
STORE_FAST  c        # pop into local slot c</pre>
      <p>(3.13 fuses the two loads into one <b>superinstruction</b> <code>LOAD_FAST_LOAD_FAST (a, b)</code>; same meaning, one fewer dispatch.)</p>
      <p><b>The four "load a name" families</b> tell you how the compiler classified each name, and they explain many interview puzzles:</p>
      ${H.table(['Opcode', 'Used for', 'Speed'], [
        ['<code>LOAD_FAST</code>', 'function locals and parameters: an array slot, index known at compile time', H.c('g', 'fastest')],
        ['<code>LOAD_DEREF</code>', 'variables captured by a closure (a "cell" box)', H.c('g', 'fast')],
        ['<code>LOAD_GLOBAL</code>', 'module globals, then builtins: dict lookups (cached in 3.11+)', H.c('y', 'slower')],
        ['<code>LOAD_NAME</code>', 'module-level / class-body code: locals dict → globals → builtins', H.c('y', 'slower')],
        ['<code>LOAD_ATTR</code>', '<code>obj.attr</code>: goes through the descriptor protocol', H.c('y', 'varies')]
      ])}
      <p>Key insight: <b>scope is decided at compile time</b>. If a function assigns to <code>x</code> anywhere, <code>x</code> is local in the <i>whole</i> function, so reading it before the assignment raises <code>UnboundLocalError</code> even if a global <code>x</code> exists.</p>`,
    clues: [
      '"What does <code>dis</code> show for…" / "walk me through the bytecode" → stack machine: loads push, operations pop and push, stores pop',
      '"Why is a local variable faster than a global?" → <code>LOAD_FAST</code> (array index) vs <code>LOAD_GLOBAL</code> (dict lookups)',
      '"UnboundLocalError even though the global exists" → compile-time scope decision',
      '"Is Python compiled or interpreted?" → both: compiled to bytecode, then the bytecode is interpreted (plus a JIT in newer builds)',
      '"What is a .pyc file / __pycache__?" → cached code object (marshal format) with a magic number + source check',
      '"Why does <code>24*60*60</code> cost nothing at runtime?" → constant folding into <code>co_consts</code>',
      '"Can I rely on bytecode across versions?" → no; opcodes change every release'
    ],
    code: [{ lang: 'python', title: 'Peek at the compiler: code object + dis (runnable)', run: true, code: R`import dis

def area(w, h):
    """Rectangle area plus a fixed border of 24*60*60 units (folded!)."""
    border = 24 * 60 * 60          # constant expression: folded at compile time
    return w * h + border

code = area.__code__
print("arg count  :", code.co_argcount)
print("locals     :", code.co_varnames)   # params first, then other locals
print("constants  :", code.co_consts)     # 86400 is already computed!
print("raw bytes  :", len(code.co_code), "bytes")
print()
# One row per instruction: opname + human-readable argument
for ins in dis.get_instructions(area):
    print(f"{ins.offset:>3}  {ins.opname:<22} {ins.argrepr}")
` }],
    codeTitle: ['Code object + dis'],
    viz: {
      title: 'Compile a tiny program, then run its bytecode on a value stack',
      input: 'x = 4\ny = x * 2 + 3\nz = (y - 1) // 2 + 24 * 60',
      inputLabel: 'Statements: name = expression (ints, names, + - * / // % and parentheses; one per line or separated by ;)',
      gen: function (input) {
        var P = bcCompileAndRun(input);
        var frames = [];
        var srcCode = P.stmts.join('\n');
        frames.push({ narr: 'Step 1 · <b>Compile.</b> CPython turns your ' + P.stmts.length + ' line(s) into a <b>code object</b>. Constants go into <code>co_consts</code>, names into <code>co_names</code>.' + (P.folds.length ? ' The optimizer already <b>folded</b> constant maths at compile time: <code>' + esc(P.folds.join(' ; ')) + '</code>.' : ' Nothing here could be folded, because every operation involves a variable.'), parts: [
          { type: 'code', label: 'Your source', lang: 'python', code: srcCode, hl: {} },
          { type: 'array', label: 'co_consts', values: P.consts.slice(), showIdx: true },
          { type: 'array', label: 'co_names', values: P.names.length ? P.names.slice() : ['(none)'], showIdx: true },
          { type: 'code', label: 'dis output (simplified 3.12 style)', lang: 'text', code: P.listing, hl: {} }
        ] });
        var stack = [], env = {}, envOrder = [];
        for (var pc = 0; pc < P.code.length; pc++) {
          var ins = P.code[pc], narr = '', hlVars = {}, stHl = {}, bad = false;
          if (ins.op === 'LOAD_CONST') {
            stack.push(P.constVals[ins.arg]);
            narr = '<code>LOAD_CONST ' + ins.arg + '</code> pushes <code>co_consts[' + ins.arg + ']</code> = <b>' + esc(P.show(P.constVals[ins.arg])) + '</b> on top of the stack.';
            stHl[stack.length - 1] = 'ok';
          } else if (ins.op === 'LOAD_NAME') {
            if (!Object.prototype.hasOwnProperty.call(env, ins.txt)) {
              narr = '<code>LOAD_NAME ' + esc(ins.txt) + '</code>: looked in locals → globals → builtins and found nothing. <span class="c-r">NameError: name \'' + esc(ins.txt) + '\' is not defined</span>. The frame stops here.';
              bad = true;
            } else {
              stack.push(env[ins.txt]);
              narr = '<code>LOAD_NAME ' + esc(ins.txt) + '</code> looks the name up (module code uses a dict) and pushes its value <b>' + esc(P.show(env[ins.txt])) + '</b>.';
              hlVars[ins.txt] = 'cur'; stHl[stack.length - 1] = 'ok';
            }
          } else if (ins.op === 'BINARY_OP') {
            var b = stack.pop(), a = stack.pop(), r = P.binop(ins.sym, a, b);
            if (r.err) { narr = '<code>BINARY_OP (' + esc(ins.sym) + ')</code> popped ' + esc(P.show(a)) + ' and ' + esc(P.show(b)) + '. <span class="c-r">' + r.err + '</span>: an exception unwinds the frame.'; bad = true; }
            else { stack.push(r); narr = '<code>BINARY_OP ' + ins.arg + ' (' + esc(ins.sym) + ')</code> pops the top two (<b>' + esc(P.show(a)) + '</b> and <b>' + esc(P.show(b)) + '</b>), computes them, and pushes <b>' + esc(P.show(r)) + '</b>. Order matters: the item pushed first is the left operand.'; stHl[stack.length - 1] = 'ok'; }
          } else if (ins.op === 'UNARY_NEGATIVE') {
            var u = stack.pop(); var nv = { t: u.t, v: -u.v }; stack.push(nv);
            narr = '<code>UNARY_NEGATIVE</code> pops ' + esc(P.show(u)) + ' and pushes ' + esc(P.show(nv)) + '.'; stHl[stack.length - 1] = 'ok';
          } else if (ins.op === 'STORE_NAME') {
            var v = stack.pop();
            if (!Object.prototype.hasOwnProperty.call(env, ins.txt)) envOrder.push(ins.txt);
            env[ins.txt] = v; hlVars[ins.txt] = 'ok';
            narr = '<code>STORE_NAME ' + esc(ins.txt) + '</code> pops <b>' + esc(P.show(v)) + '</b> and binds the name <code>' + esc(ins.txt) + '</code> to it. The stack is empty again: every statement leaves the stack as it found it.';
          } else if (ins.op === 'POP_TOP') {
            var pv = stack.pop();
            narr = '<code>POP_TOP</code> throws away ' + esc(P.show(pv)) + ': an expression statement computes a value nobody stored (the REPL would print it, a script does not).';
          } else {
            narr = '<code>RETURN_CONST None</code>: module code always ends by returning None (3.14 spells this <code>LOAD_CONST None</code> + <code>RETURN_VALUE</code>). Done!';
          }
          var vals = {}; envOrder.forEach(function (k) { vals[k] = P.show(env[k]); });
          if (!envOrder.length) vals['(no names yet)'] = '';
          var codeHl = {}; codeHl[pc + 1] = bad ? 'bad' : 'cur';
          var srcHl = {}; srcHl[ins.line] = bad ? 'bad' : 'cur';
          frames.push({ narr: 'offset ' + (pc * 2) + ' · ' + narr, parts: [
            { type: 'code', label: 'Source line', lang: 'python', code: srcCode, hl: srcHl },
            { type: 'code', label: 'Bytecode (instruction pointer)', lang: 'text', code: P.listing, hl: codeHl },
            { type: 'stack', label: 'Value stack (bottom → top)', items: stack.map(P.show), hl: stHl },
            { type: 'vars', label: 'Names (module globals dict)', vals: vals, hl: hlVars }
          ] });
          if (bad) break;
        }
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: UnboundLocalError', html: R`<p>Many people expect this to print 10. It crashes, because the compiler saw <code>x = 1</code> inside <code>bump</code> and marked <code>x</code> as <b>local for the whole function</b>. The first line therefore compiles to <code>LOAD_FAST x</code>, and that slot is still empty.</p>
        ${H.table(['Line', 'Bytecode', 'Effect'], [['print(x)', '<code>LOAD_FAST x</code>', H.c('r', 'slot empty → UnboundLocalError')], ['x = 1', '<code>STORE_FAST x</code>', 'never reached']])}
        <p>Fix: add <code>global x</code> (compiles to <code>LOAD_GLOBAL</code>/<code>STORE_GLOBAL</code>) or, better, pass and return values.</p>`, code: { lang: 'python', run: true, code: R`import dis

x = 10

def bump():
    print(x)      # compiled as LOAD_FAST because of the line below
    x = 1

try:
    bump()
except UnboundLocalError as e:
    print("UnboundLocalError:", e)

ops = [i.opname for i in dis.get_instructions(bump) if "x" == i.argval]
print("opcodes touching x:", ops)
` } },
      { title: 'Constant folding and smarter constants', html: R`<p>The compiler pre-computes constant expressions and even upgrades literals: a list literal used only for <code>in</code> becomes a <b>tuple constant</b>, and a set literal becomes a <b>frozenset constant</b>, so nothing is built at runtime.</p>
        ${H.table(['You write', 'co_consts gets', 'Runtime work'], [['<code>24 * 60 * 60</code>', '<code>86400</code>', 'one LOAD_CONST'], ['<code>x in [1, 2, 3]</code>', '<code>(1, 2, 3)</code>', 'no list built'], ['<code>x in {1, 2, 3}</code>', '<code>frozenset({1, 2, 3})</code>', 'O(1) hash lookup']])}`, code: { lang: 'python', run: true, code: R`def seconds_per_day():
    return 24 * 60 * 60

def is_small(x):
    return x in {1, 2, 3}

print(seconds_per_day.__code__.co_consts)   # 86400 already there
print(is_small.__code__.co_consts)          # a frozenset constant
` } },
      { title: 'Swapping without a tuple', html: R`<p><code>a, b = b, a</code> looks like it builds a tuple and unpacks it. Since 3.11 the compiler is smarter: for two or three names it just loads both values and stores them in reverse order (in 3.13: <code>LOAD_FAST_LOAD_FAST (b, a)</code> then <code>STORE_FAST_STORE_FAST (b, a)</code>), so no tuple object is ever allocated. Lesson: <b>idiomatic code is often the fast code</b>, because the compiler is tuned for idioms.</p>
        ${H.arr(['b', 'a'], { label: 'stack after loads', hl: { 1: 'g' } })}`, code: { lang: 'python', run: true, code: R`import dis

def swap(a, b):
    a, b = b, a
    return a, b

print(swap(1, 2))
print([i.opname for i in dis.get_instructions(swap)])
` } },
      { title: 'Comprehensions got inlined (PEP 709, 3.12)', html: R`<p>Before 3.12 every list/dict/set comprehension compiled to a hidden nested function, so each one paid for a function call. Since 3.12 they are <b>inlined</b> into the enclosing code (you will see <code>LOAD_FAST_AND_CLEAR</code> and <code>SWAP</code> in <code>dis</code> that save and restore the loop variable). Generator expressions are still separate code objects, because they must pause and resume.</p>
        <p>Check: <code>[c for c in f.__code__.co_consts if hasattr(c, 'co_code')]</code> is empty for a list comprehension in 3.12+, but contains a <code>&lt;genexpr&gt;</code> code object for <code>sum(x for x in xs)</code>.</p>` }
    ],
    deepDive: R`<p>🟣 <b>Wordcode and inline caches.</b> Since 3.6 every instruction is exactly 2 bytes (opcode, oparg); arguments above 255 are built with <code>EXTENDED_ARG</code> prefixes. Since 3.11 many instructions are followed by hidden <code>CACHE</code> entries (see <code>dis.dis(f, show_caches=True)</code>) where the specializing interpreter stores type versions, dict keys versions and indexes. That is why <code>len(co_code)</code> is bigger than "number of instructions × 2".</p>
      <p><b>Line numbers and exceptions are tables, not instructions.</b> <code>co_linetable</code> (compact varint format, PEP 626) maps offsets to lines and columns, which powers the fine-grained <code>^^^^</code> carets in 3.11+ tracebacks (PEP 657). <code>co_exceptiontable</code> maps offset ranges to handlers: a <code>try</code> block costs <b>zero</b> instructions when nothing is raised ("zero-cost exceptions", 3.11).</p>
      <p><b>.pyc files.</b> A <code>.pyc</code> is a 16-byte header (magic number for the bytecode version, flags, then source mtime+size or a source hash per PEP 552) followed by the code object serialized with <code>marshal</code>. The magic number changes whenever the bytecode format changes, which is why <code>cpython-312.pyc</code> and <code>cpython-313.pyc</code> live side by side. <code>python -O</code> drops <code>assert</code> statements and <code>if __debug__:</code> blocks (<code>.opt-1.pyc</code>); <code>-OO</code> also drops docstrings.</p>
      <p><b>Bytecode is an implementation detail.</b> Opcodes are added, removed and renamed every release (3.11 replaced the <code>BINARY_ADD</code> family with <code>BINARY_OP</code>; 3.12 added <code>RETURN_CONST</code> and 3.14 removed it again; 3.13 added superinstructions; 3.14 added <code>LOAD_FAST_BORROW</code>). PyPy, GraalPy and MicroPython use different formats entirely. Never ship, cache across versions or pattern-match on exact bytecode in production; use <code>ast</code> for source analysis and <code>dis</code> for learning and debugging.</p>
      <p><b>Production uses:</b> explaining performance differences (globals in hot loops, attribute chains), confirming what the optimizer did, understanding coverage tools and debuggers (which rely on <code>sys.monitoring</code>, PEP 669, since 3.12), and auditing obfuscated <code>.pyc</code>-only malware.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> assistants will happily "explain this dis output" line by line, and they are usually right about the stack semantics. They are often <b>wrong about version details</b>: they mix up <code>BINARY_ADD</code> (≤ 3.10) with <code>BINARY_OP</code>, forget superinstructions, or invent opcodes. Always run <code>dis</code> on your own interpreter and compare.</p>
      <p><b>Use AI as a partner:</b> <code>Here is dis output from Python 3.13 for my hot loop. Which instructions are dict lookups, and how could I turn them into LOAD_FAST? Do not rewrite the algorithm.</code> Or ask it to generate "predict the bytecode" drills, then check them with <code>dis</code>.</p>
      <p><b>Where AI goes wrong:</b> claiming "Python is interpreted line by line", suggesting micro-optimizations (local aliases of builtins) that the 3.11+ specializing interpreter already made mostly unnecessary, or "optimizing" code by hand-editing bytecode.</p>
      <p><b>What you must still own:</b> the mental model (compile once, run a stack machine), the compile-time scope rule, and the judgement of when bytecode-level reasoning matters (hot loops in pure Python) versus when to reach for a better algorithm, NumPy or a C extension.</p>`,
    problems: [{
      title: 'Opcode Histogram of a Function',
      level: 'Easy', tags: ['dis', 'bytecode', 'Counter'], companies: ['Google', 'Bloomberg'],
      statement: R`<p>Write <code>opcode_histogram(func)</code> that returns a dict mapping each opcode name used by <code>func</code> to how many times it appears, sorted by count (highest first, ties alphabetically). Ignore the bookkeeping opcodes <code>RESUME</code>, <code>CACHE</code> and <code>NOP</code>. Use it to compare a loop that reads a global against one that reads a local.</p>`,
      constraints: R`<p>Any Python function. Must not parse the printed text of <code>dis.dis</code>. Must work on 3.11+ (opcode names differ by version, so do not hard-code them).</p>`,
      example: R`<p><code>def f(a, b): return a * b + 1</code> on 3.12 gives ${H.kv([['LOAD_FAST', 2], ['BINARY_OP', 2], ['LOAD_CONST', 1], ['RETURN_VALUE', 1]])} On 3.13 the two loads become one <code>LOAD_FAST_LOAD_FAST</code>. ${H.c('g', 'Why:')} two variable reads, two arithmetic operations, one constant, one return.</p>`,
      brute: { why: R`<p>Capture the text that <code>dis.dis</code> prints and split each line. It works on one version but breaks on the next: column widths, labels like <code>L1:</code> and line-number prefixes change, and you parse output meant for humans. Fragile string parsing is the wasted effort here.</p>`, code: R`import dis, io, contextlib

def opcode_histogram_brute(func):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        dis.dis(func)
    counts = {}
    for line in buf.getvalue().splitlines():
        for word in line.split():
            if word.isupper() and "_" in word or word in ("NOP",):
                counts[word] = counts.get(word, 0) + 1
                break
    return counts

print(opcode_histogram_brute(lambda a, b: a * b + 1))
` },
      mcq: { q: 'Which API gives you structured instruction objects instead of printed text?', options: ['<code>dis.get_instructions(func)</code>', '<code>func.__code__.co_names</code>', '<code>inspect.getsource(func)</code>', '<code>ast.parse(func)</code>'], answer: 0, explain: '<code>dis.get_instructions</code> yields <code>Instruction</code> named tuples with <code>opname</code>, <code>arg</code>, <code>argval</code>, <code>offset</code> and more. <code>co_names</code> only lists names; <code>inspect</code>/<code>ast</code> work on source.' },
      hints: [R`<p>Hint 1: <code>dis.get_instructions(func)</code> gives you one object per instruction, with an <code>.opname</code> string. No text parsing needed.</p>`, R`<p>Hint 2: <code>collections.Counter</code> counts in one line; then sort its items with a key of <code>(-count, name)</code> and build a plain dict (dicts keep insertion order).</p>`, R`<p>Hint 3: filter out <code>RESUME</code>, <code>CACHE</code>, <code>NOP</code>. Recipe: iterate instructions → skip ignored → count → sort → dict. For the demo, compare a function that reads a global in a loop vs one that copies it into a local first.</p>`],
      solution: {
        approach: R`<p>Use the structured API, count with <code>Counter</code>, then sort deterministically. The demo shows <code>LOAD_GLOBAL</code> inside the loop of the first function becoming <code>LOAD_FAST</code> in the second.</p>`,
        code: { lang: 'python', run: true, code: R`import dis
from collections import Counter

IGNORE = {"RESUME", "CACHE", "NOP"}

def opcode_histogram(func):
    """Map opcode name -> count, most frequent first (ties alphabetical)."""
    counts = Counter(ins.opname for ins in dis.get_instructions(func)
                     if ins.opname not in IGNORE)
    return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

SCALE = 3

def uses_global(xs):
    total = 0
    for x in xs:
        total += x * SCALE        # global read on every iteration
    return total

def uses_local(xs, scale=SCALE):
    total = 0
    for x in xs:
        total += x * scale        # local (array slot) read
    return total

print(opcode_histogram(lambda a, b: a * b + 1))
g, l = opcode_histogram(uses_global), opcode_histogram(uses_local)
print("LOAD_GLOBAL count:", g.get("LOAD_GLOBAL", 0), "vs", l.get("LOAD_GLOBAL", 0))
print(uses_global([1, 2, 3]), uses_local([1, 2, 3]))
` },
        dry: { head: ['instruction (3.12)', 'skipped?', 'Counter after'], rows: [['RESUME', 'yes', '{}'], ['LOAD_FAST a', 'no', '{LOAD_FAST: 1}'], ['LOAD_FAST b', 'no', '{LOAD_FAST: 2}'], ['BINARY_OP *', 'no', '{…, BINARY_OP: 1}'], ['LOAD_CONST 1', 'no', '{…, LOAD_CONST: 1}'], ['BINARY_OP +', 'no', '{…, BINARY_OP: 2}'], ['RETURN_VALUE', 'no', H.c('g', 'sorted: LOAD_FAST 2, BINARY_OP 2, …')]] },
        complexity: R`<p>O(n log n) for n instructions (the sort; counting is O(n)). Memory O(k) for k distinct opcodes.</p>`,
        followUps: ['Also report which source line each LOAD_GLOBAL is on (use <code>ins.positions</code> or <code>co_lines()</code>).', 'Recurse into nested code objects found in <code>co_consts</code> (inner functions, genexprs).']
      }
    }]
  });
registerModule({ id: 'py12', title: 'CPython Internals', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
