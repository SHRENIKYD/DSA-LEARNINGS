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
        frames.push({ narr: 'Step 1 · <b>Compile.</b> CPython turns your ' + P.stmts.length + ' line(s) into a <b>code object</b>. Constants go into <code>co_consts</code>, names into <code>co_names</code>.' + (P.folds.length ? ' The optimizer already <b>folded</b> constant maths at compile time: <code>' + esc(P.folds.join(' ; ')) + '</code>.' : ' Nothing could be folded: folding only happens when both operands are constants and the result computes without an error (CPython never folds <code>1 // 0</code>; it leaves the error for runtime).'), parts: [
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

  /* ======================================================================
     TOPIC 2: The Evaluation Loop (frames, value stack, jumps, specialization)
     ====================================================================== */
  topics.push({
    title: 'The Evaluation Loop: Frames, Jumps & the Specializing Interpreter',
    analogy: R`<p>Picture a factory worker with a <b>clipboard</b> of numbered steps and a finger pointing at the current step. Loop forever: read the step under the finger, do it, move the finger down. Some steps say "go back to step 7" (a loop) or "skip to step 14 if the tray is empty" (an if). When a step says "call the paint department", the worker clips a <b>new clipboard</b> on top of the old one, finishes it, then removes it and continues where the finger was. After doing the same step many times on the same kind of part, a smart worker writes a shortcut next to it: "these are always ints, skip the checks". That is CPython's evaluation loop, its frame stack, and its <b>specializing</b> interpreter.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> At the heart of CPython is one huge C function, <code>_PyEval_EvalFrameDefault</code> in <code>Python/ceval.c</code> (its instruction bodies are generated from <code>Python/bytecodes.c</code>). Stripped down, it is:</p>
      <pre>for (;;) {
    opcode = next_instr->op.code;     // fetch
    oparg  = next_instr->op.arg;
    next_instr++;
    switch (opcode) {                 // dispatch (computed gotos in real builds)
        case LOAD_FAST:  PUSH(locals[oparg]); break;
        case BINARY_OP:  b = POP(); a = POP(); PUSH(a + b); break;
        case POP_JUMP_IF_FALSE: if (!POP()) next_instr += oparg; break;
        /* ... ~200 more ... */
    }
}</pre>
      <p><b>A frame</b> is the "clipboard" for one running function call. It holds:</p>
      ${H.table(['Part of the frame', 'What it is', 'Python view'], [
        ['code', 'which code object is running', '<code>frame.f_code</code>'],
        ['instruction pointer', 'which instruction is next', '<code>frame.f_lasti</code>, <code>f_lineno</code>'],
        ['fast locals', 'an array: arguments, locals, cells', '<code>frame.f_locals</code> (a snapshot/proxy)'],
        ['value stack', 'the "tray" for temporary values', 'not exposed'],
        ['globals / builtins', 'dicts used by LOAD_GLOBAL', '<code>frame.f_globals</code>, <code>f_builtins</code>'],
        ['previous frame', 'who called us', '<code>frame.f_back</code>']
      ])}
      <p><b>Control flow is just jumps.</b> <code>if</code> compiles to <code>POP_JUMP_IF_FALSE</code> (skip ahead), <code>while</code>/<code>for</code> end with <code>JUMP_BACKWARD</code>, and <code>for</code> uses <code>FOR_ITER</code>, which calls <code>next()</code> on the iterator and jumps out of the loop when it raises <code>StopIteration</code> (handled in C, no real exception object for built-in iterators).</p>
      <p><b>Calls push frames.</b> Calling a Python function creates a new frame on top; <code>return</code> pops it and pushes the return value onto the caller's value stack. Since 3.11, Python-to-Python calls do <b>not</b> recurse into a new C call of the eval function, and frames live in a cheap per-thread array; a full <code>frame</code> object is created lazily only if someone asks (a traceback, <code>sys._getframe()</code>, a debugger). The default recursion limit (<code>sys.getrecursionlimit()</code>, 1000) protects you from runaway recursion.</p>
      <p><b>The specializing adaptive interpreter (PEP 659, 3.11+).</b> Each "generic" instruction counts how often it runs. After a short warm-up it is rewritten in place ("quickened") into a specialized version for the types it actually saw: <code>BINARY_OP</code> → <code>BINARY_OP_ADD_INT</code>, <code>LOAD_ATTR</code> → <code>LOAD_ATTR_INSTANCE_VALUE</code>, <code>LOAD_GLOBAL</code> → <code>LOAD_GLOBAL_BUILTIN</code>, <code>FOR_ITER</code> → <code>FOR_ITER_RANGE</code>. Each specialized instruction checks a cheap <b>guard</b> (is it still an int? is the dict version unchanged?) and falls back ("deoptimizes") if the guard fails. You can watch this with <code>dis.dis(f, adaptive=True)</code> after calling <code>f</code> a few times.</p>
      <p><b>The "eval breaker".</b> Every so often (on backward jumps and calls) the loop checks a flag for pending work: signal handlers (Ctrl+C → <code>KeyboardInterrupt</code>), a request from another thread to drop the GIL (every <code>sys.getswitchinterval()</code> = 5 ms), a scheduled garbage collection, or async exceptions. This is why a pure-C call like a giant <code>sum()</code> cannot be interrupted until it returns.</p>`,
    clues: [
      '"What happens when you call a function in CPython?" → new frame, arguments copied into fast locals, eval loop runs, return value pushed on caller\'s stack',
      '"Why did Python 3.11 get ~25% faster?" → specializing adaptive interpreter, cheaper frames, zero-cost exceptions, inlined Python calls',
      '"RecursionError: maximum recursion depth exceeded" → each call is a frame; limit from <code>sys.setrecursionlimit</code>',
      '"Why can\'t I Ctrl+C out of this C-level call?" → eval breaker is only checked between bytecodes',
      '"How do generators pause?" → the frame is kept alive with its instruction pointer and stack',
      '"Does Python have a JIT?" → 3.13+ has an experimental copy-and-patch JIT (off by default); PyPy has a tracing JIT'
    ],
    code: [{ lang: 'python', title: 'Watch specialization happen (runnable)', run: true, code: R`import dis, sys

def total_to(n):
    total = 0
    for i in range(n):
        total += i
    return total

before = [i.opname for i in dis.get_instructions(total_to)]
for _ in range(20):           # warm the function up
    total_to(1000)

after = [i.opname for i in dis.get_instructions(total_to, adaptive=True)]
print("Python", sys.version.split()[0])
for b, a in zip(before, after):
    mark = "  <-- specialized" if a != b else ""
    print(f"{b:<22} -> {a}{mark}")
` }],
    codeTitle: ['Quickening in action'],
    viz: [{
      title: 'The eval loop running a for-loop (with specialization after warm-up)',
      input: '4',
      inputLabel: 'n for total_to(n) (0 to 6)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 0 || n > 6) throw new Error('Enter n between 0 and 6');
        var src = 'def total_to(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total';
        var ins = [
          ['RESUME', '0', 1], ['LOAD_CONST', '1 (0)', 2], ['STORE_FAST', '1 (total)', 2], ['LOAD_GLOBAL', '1 (range + NULL)', 3],
          ['LOAD_FAST', '0 (n)', 3], ['CALL', '1', 3], ['GET_ITER', '', 3], ['FOR_ITER', '7 (to 28)', 3], ['STORE_FAST', '2 (i)', 3],
          ['LOAD_FAST', '1 (total)', 4], ['LOAD_FAST', '2 (i)', 4], ['BINARY_OP', '13 (+=)', 4], ['STORE_FAST', '1 (total)', 4],
          ['JUMP_BACKWARD', '9 (to 14)', 4], ['END_FOR', '', 3], ['LOAD_FAST', '1 (total)', 5], ['RETURN_VALUE', '', 5]
        ];
        var names = ins.map(function (x) { return x[0]; });
        var runs = {};
        var SPEC = { 'BINARY_OP': 'BINARY_OP_ADD_INT', 'FOR_ITER': 'FOR_ITER_RANGE', 'STORE_FAST': 'STORE_FAST', 'LOAD_GLOBAL': 'LOAD_GLOBAL_BUILTIN', 'CALL': 'CALL_BUILTIN_CLASS' };
        function listing() {
          return names.map(function (nm, i) { var o = String(i * 2); while (o.length < 3) o = ' ' + o; var p = nm; while (p.length < 20) p += ' '; return o + ' ' + p + ' ' + ins[i][1]; }).join('\n');
        }
        var frames = [], stack = [], loc = { n: n, total: '(unbound)', i: '(unbound)' }, it = null, pc = 0, guard = 0;
        frames.push({ narr: 'The caller ran <code>total_to(' + n + ')</code>. A new <b>frame</b> is pushed: argument <code>n</code> is copied into fast-local slot 0, other slots start empty, the value stack is empty, and the instruction pointer sits at offset 0.', parts: [
          { type: 'code', label: 'Source', lang: 'python', code: src, hl: { 1: 'cur' } },
          { type: 'code', label: 'Bytecode', lang: 'text', code: listing(), hl: { 1: 'cur' } },
          { type: 'stack', label: 'Frame stack', items: ['<module>', 'total_to(n=' + n + ')'], hl: { 1: 'cur' } },
          { type: 'vars', label: 'Fast locals', vals: Object.assign({}, loc) }
        ] });
        while (pc < ins.length && guard++ < 200) {
          var op = names[pc], base = op.replace(/_ADD_INT|_RANGE|_BUILTIN(_CLASS)?/, ''), narr = '', next = pc + 1, specNote = '';
          runs[pc] = (runs[pc] || 0) + 1;
          if (base === 'RESUME') narr = '<code>RESUME</code>: a bookkeeping instruction at the start of every function (and after every yield). It also checks the eval breaker.';
          else if (base === 'LOAD_CONST') { stack.push(0); narr = '<code>LOAD_CONST 0</code> pushes the constant 0.'; }
          else if (base === 'STORE_FAST') { var v = stack.pop(); var slot = ins[pc][1].indexOf('total') >= 0 ? 'total' : 'i'; loc[slot] = v; narr = '<code>STORE_FAST ' + slot + '</code> pops ' + v + ' into the fast-local array slot for <code>' + slot + '</code> (a C array index, no dict).'; }
          else if (base === 'LOAD_GLOBAL') { stack.push('range'); narr = '<code>' + op + '</code> looks up <code>range</code>: not in module globals, found in builtins. Pushes the builtin.'; }
          else if (base === 'LOAD_FAST') { var nm = /\((\w+)\)/.exec(ins[pc][1])[1]; stack.push(loc[nm]); narr = '<code>LOAD_FAST ' + nm + '</code> pushes <b>' + loc[nm] + '</b> straight from the locals array.' + (ins[pc][2] === 4 ? ' (3.13 fuses the two loads on line 4 into one <code>LOAD_FAST_LOAD_FAST</code> superinstruction.)' : ''); }
          else if (base === 'CALL') { stack.pop(); stack.pop(); stack.push('range(0, ' + n + ')'); narr = '<code>' + op + ' 1</code> calls <code>range(n)</code> with 1 argument and pushes the range object. This is a C function, so no new Python frame is needed.'; }
          else if (base === 'GET_ITER') { stack.pop(); it = 0; stack.push('range_iterator'); narr = '<code>GET_ITER</code> replaces the range with <code>iter(range)</code>. The iterator stays on the stack for the whole loop.'; }
          else if (base === 'FOR_ITER') {
            if (it < n) { stack.push(it); narr = '<code>' + op + '</code> asks the iterator for the next value: <b>' + it + '</b>. It stays inside the loop.'; it++; }
            else { next = 14; narr = '<code>' + op + '</code>: the iterator is exhausted. Instead of raising a real <code>StopIteration</code>, the C code just <b>jumps</b> to <code>END_FOR</code> after the loop.'; }
          } else if (base === 'BINARY_OP') { var b2 = stack.pop(), a2 = stack.pop(); stack.push(a2 + b2); narr = '<code>' + op + ' (+=)</code> pops ' + a2 + ' and ' + b2 + ', pushes <b>' + (a2 + b2) + '</b>.' + (op !== base ? ' The specialized version only checks "both exact ints that fit in one digit?" and adds directly, skipping the generic type dispatch.' : ' Generic version: it must look up <code>int.__add__</code> through the type slots.'); }
          else if (base === 'JUMP_BACKWARD') { next = 7; narr = '<code>JUMP_BACKWARD</code> moves the instruction pointer back to <code>FOR_ITER</code>. Backward jumps also check the <b>eval breaker</b> (signals, GIL drop requests, pending GC), so infinite Python loops stay interruptible.'; }
          else if (base === 'END_FOR') { stack.pop(); narr = '<code>END_FOR</code> pops the exhausted iterator. The stack is clean again.'; }
          else if (base === 'RETURN_VALUE') { var rv = stack.pop(); narr = '<code>RETURN_VALUE</code> pops <b>' + rv + '</b>, the frame is popped off the frame stack, and ' + rv + ' is pushed onto the caller\'s value stack. Total = ' + rv + '.'; }
          if (SPEC[base] && runs[pc] === 2 && names[pc] === base && SPEC[base] !== base) { names[pc] = SPEC[base]; specNote = ' <span class="c-p">Quickened!</span> After warming up (simplified here to 2 runs) <code>' + base + '</code> was rewritten in place to <code>' + SPEC[base] + '</code>.'; }
          var codeHl = {}; codeHl[pc + 1] = specNote ? 'sel' : 'cur'; if (next < pc) codeHl[next + 1] = 'win';
          var sHl = {}; sHl[ins[pc][2]] = 'cur';
          frames.push({ narr: 'offset ' + (pc * 2) + ' · ' + narr + specNote, parts: [
            { type: 'code', label: 'Source', lang: 'python', code: src, hl: sHl },
            { type: 'code', label: 'Bytecode (rewritten in place as it warms up)', lang: 'text', code: listing(), hl: codeHl },
            { type: 'stack', label: 'Value stack', items: stack.map(String), hl: stack.length ? (function () { var h = {}; h[stack.length - 1] = 'ok'; return h; })() : {} },
            { type: 'vars', label: 'Fast locals', vals: Object.assign({}, loc), hl: base === 'STORE_FAST' ? (function () { var h = {}; h[/total/.test(ins[pc][1]) ? 'total' : 'i'] = 'ok'; return h; })() : {} }
          ] });
          if (base === 'RETURN_VALUE') break;
          pc = next;
        }
        return frames;
      }
    }, {
      title: 'Frames stacking up: one clipboard per call',
      gen: function () {
        var src = 'def square(x):\n    return x * x\n\ndef hyp(a, b):\n    return square(a) + square(b)\n\nprint(hyp(3, 4))';
        var F = [];
        function fr(narr, line, frames, stacks, hlTop) {
          var parts = [{ type: 'code', label: 'Source', lang: 'python', code: src, hl: lines([line], 'cur') },
            { type: 'stack', label: 'Frame stack (f_back chain, bottom = oldest)', items: frames, hl: hlTop ? (function () { var h = {}; h[frames.length - 1] = hlTop; return h; })() : {} }];
          stacks.forEach(function (s) { parts.push({ type: 'stack', label: 'Value stack of ' + esc(s[0]), items: s[1] }); });
          F.push({ narr: narr, parts: parts });
        }
        fr('The module frame runs line 7. It pushes <code>print</code>, then <code>hyp</code>, then the constants 3 and 4, and executes <code>CALL 2</code>.', 7, ['<module>'], [['<module>', ['print', 'hyp', '3', '4']]], 'cur');
        fr('<code>CALL</code> creates a frame for <code>hyp</code>: slots a=3, b=4. The module frame is <b>paused</b> with its own value stack intact; <code>hyp.f_back</code> points at it.', 5, ['<module>', 'hyp(a=3, b=4)'], [['<module>', ['print']], ['hyp', []]], 'ok');
        fr('<code>hyp</code> pushes <code>square</code> and <code>a</code>, then calls. A third frame appears.', 2, ['<module>', 'hyp(a=3, b=4)', 'square(x=3)'], [['hyp', []], ['square', ['3', '3']]], 'ok');
        fr('<code>square</code> computes 3*3 = 9 and returns. Its frame is popped; 9 lands on <b>hyp\'s</b> value stack.', 5, ['<module>', 'hyp(a=3, b=4)'], [['hyp', ['9']]], 'cur');
        fr('Second call: <code>square(4)</code> gets a brand-new frame (frames are per call, not per function, which is why recursion works).', 2, ['<module>', 'hyp(a=3, b=4)', 'square(x=4)'], [['hyp', ['9']], ['square', ['4', '4']]], 'ok');
        fr('Returns 16. <code>hyp</code> now has 9 and 16 on its stack; <code>BINARY_OP +</code> makes 25.', 5, ['<module>', 'hyp(a=3, b=4)'], [['hyp', ['25']]], 'cur');
        fr('<code>hyp</code> returns 25 to the module frame, which calls <code>print(25)</code>. If an exception had happened inside <code>square</code>, the traceback would be built by walking exactly this frame chain.', 7, ['<module>'], [['<module>', ['print', '25']]], 'sel');
        return F;
      }
    }],
    examples: [
      { title: 'Walk the frame chain yourself', html: R`<p><code>sys._getframe()</code> returns the current frame; following <code>f_back</code> walks to the callers. This is what tracebacks, loggers (<code>%(funcName)s</code>) and debuggers do.</p>
        ${H.arr(['inner', 'outer', '<module>'], { label: 'f_back chain', hl: { 0: 'y' } })}`, code: { lang: 'python', run: true, code: R`import sys

def who_called_me():
    f = sys._getframe(1)          # 1 = skip my own frame
    chain = []
    while f is not None:
        chain.append(f"{f.f_code.co_name}@line{f.f_lineno}")
        f = f.f_back
    return chain

def outer():
    return inner()

def inner():
    return who_called_me()

print(" <- ".join(outer()))
` } },
      { title: 'A generator is a paused frame', html: R`<p>A generator object owns a frame that is <b>not</b> popped at <code>yield</code>: the instruction pointer and locals are frozen until the next <code>next()</code>. You can see the frozen line with <code>gen.gi_frame.f_lineno</code>; after it finishes, <code>gi_frame</code> becomes <code>None</code>.</p>`, code: { lang: 'python', run: true, code: R`def countdown(n):
    while n > 0:
        yield n
        n -= 1

g = countdown(2)
print("created, running?", g.gi_running, "frame line:", g.gi_frame.f_lineno)
print(next(g), "paused at line", g.gi_frame.f_lineno, "locals:", g.gi_frame.f_locals)
print(next(g), "locals:", g.gi_frame.f_locals)
print(list(g), "frame after finishing:", g.gi_frame)
` } },
      { title: 'RecursionError is a frame-count guard', html: R`<p>Each recursive call is one more frame. The interpreter stops you at <code>sys.getrecursionlimit()</code> (default 1000) with <code>RecursionError</code> instead of crashing the C stack. Raising the limit is a band-aid; for deep recursion on DSA problems, convert to an explicit stack (a list) or use iteration.</p>
        ${H.table(['depth', 'frames alive'], [['10', '≈ 11'], ['999', '≈ 1000 → still OK'], ['5000', H.c('r', 'RecursionError')]])}`, code: { lang: 'python', run: true, code: R`import sys

def depth(n):
    return 0 if n == 0 else 1 + depth(n - 1)

print("limit:", sys.getrecursionlimit())
print(depth(500))
try:
    depth(50_000)
except RecursionError as e:
    print("RecursionError:", e)
` } }
    ],
    deepDive: R`<p>🟣 <b>Dispatch.</b> GCC/Clang builds use <b>computed gotos</b> (a jump table of label addresses, one indirect jump per instruction) instead of a <code>switch</code>, which helps branch prediction. 3.14 adds an optional <b>tail-calling interpreter</b> (each instruction is a small C function that tail-calls the next; enabled on builds with new enough Clang) for a further speed-up.</p>
      <p><b>Frames internals.</b> 3.11 split frames into <code>_PyInterpreterFrame</code> (a struct in a per-thread contiguous "data stack") and the user-visible <code>PyFrameObject</code>, created lazily. <code>localsplus</code> is one array holding locals, cells, free variables and then the value stack. Since 3.13, <code>frame.f_locals</code> in a function returns a <b>write-through proxy</b> (PEP 667), so debuggers can change locals reliably; <code>locals()</code> returns an independent snapshot.</p>
      <p><b>Specialization details.</b> Specialized instructions store state in the inline <code>CACHE</code> slots (type version tags, dict key versions, indexes). Changing a class (<code>Cls.method = …</code>) bumps its version tag, which makes guards fail and code deoptimize; code that constantly mutates classes or mixes many types at one call site ("megamorphic") does not benefit.</p>
      <p><b>Tier 2 and the JIT.</b> 3.13 added an experimental tier-2 optimizer: hot loops are translated into "micro-ops" (uops) traces, optimized, and optionally compiled to machine code by a <b>copy-and-patch JIT</b> (stencils pre-compiled by LLVM at build time). It is off by default (<code>PYTHON_JIT=1</code> on JIT-enabled builds); gains in 3.13–3.14 are modest. Do not promise interviewers big JIT wins; say "experimental, improving each release".</p>
      <p><b>Free-threaded builds.</b> PEP 703 builds (<code>python3.13t</code>, officially supported from 3.14 under PEP 779) run the same eval loop without the GIL. Specialization was initially disabled there and is being re-enabled in thread-safe forms. <code>sys._is_gil_enabled()</code> tells you which mode you are in.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> you can ask an assistant to walk through <code>ceval.c</code>/<code>bytecodes.c</code> or summarise "what changed in the interpreter in 3.14". It is great at orienting you in a huge C file. It is weaker at the exact release a feature landed in; verify against the official "What's New" pages.</p>
      <p><b>Use AI as a partner:</b> <code>I profiled my code and the hot loop calls obj.value 10M times with obj being one of 6 classes. Explain whether LOAD_ATTR specialization will help, and how to check with dis(adaptive=True).</code></p>
      <p><b>Where AI goes wrong:</b> saying "the GIL is released every 100 bytecodes" (that was Python 2; Python 3 uses a 5 ms time interval), claiming generators copy their stack on every yield, or that the 3.13 JIT is on by default.</p>
      <p><b>What you must still own:</b> a crisp picture of fetch-decode-execute with frames and a value stack, why specialization needs stable types, and the ability to reason about performance from first principles before trusting a generated "optimization".</p>`,
    problems: [{
      title: 'Build a Tiny Stack Virtual Machine',
      level: 'Medium', tags: ['interpreter', 'stack machine', 'simulation'], companies: ['Meta', 'Jane Street', 'Stripe'],
      statement: R`<p>Implement <code>run(program, env)</code>, a mini eval loop. <code>program</code> is a list of <code>(opname, arg)</code> tuples using: <code>LOAD_CONST v</code>, <code>LOAD_NAME n</code>, <code>STORE_NAME n</code>, <code>BINARY_ADD</code>, <code>BINARY_SUB</code>, <code>BINARY_MUL</code>, <code>COMPARE_LT</code>, <code>POP_JUMP_IF_FALSE target</code>, <code>JUMP target</code>, <code>RETURN_VALUE</code>. Targets are instruction indexes. Return the returned value. Raise <code>RuntimeError</code> if more than <code>max_steps</code> instructions run (an "eval breaker").</p>`,
      constraints: R`<p>Up to 10<sup>3</sup> instructions, at most 10<sup>6</sup> steps. Operands are ints. Stack underflow must raise <code>RuntimeError</code>.</p>`,
      example: R`<p>The program for "<code>i = 0; s = 0; while i &lt; 5: s = s + i; i = i + 1; return s</code>" returns ${H.c('g', '10')} (0+1+2+3+4). The loop is a <code>COMPARE_LT</code> + <code>POP_JUMP_IF_FALSE</code> at the top and a <code>JUMP</code> back at the bottom, exactly like CPython's bytecode.</p>`,
      brute: { why: R`<p>A naive approach re-dispatches by a long <code>if/elif</code> chain of string comparisons on every step, and tracks the instruction pointer with <code>program.index(...)</code> lookups (O(n) each). It works but each step costs O(#opcodes + n). A dict of handlers and an integer <code>pc</code> make dispatch O(1), the same reason CPython uses a jump table.</p>`, code: R`def run_slow(program, env):
    stack, pc = [], 0
    while True:
        op, arg = program[pc]
        if op == "LOAD_CONST":
            stack.append(arg)
        elif op == "LOAD_NAME":
            stack.append(env[arg])
        elif op == "STORE_NAME":
            env[arg] = stack.pop()
        elif op == "BINARY_ADD":
            b, a = stack.pop(), stack.pop(); stack.append(a + b)
        elif op == "RETURN_VALUE":
            return stack.pop()
        pc = program.index((op, arg), pc) + 1    # O(n) and wrong for jumps
` },
      mcq: { q: 'In <code>a - b</code>, after <code>LOAD a</code>, <code>LOAD b</code>, what must <code>BINARY_SUB</code> do?', options: ['Pop b first (top), then a, push a − b', 'Pop a first, then b, push a − b', 'Pop b, then a, push b − a', 'Read both without popping'], answer: 0, explain: 'The right operand was pushed last, so it is on top. Popping gives b, then a, and the result is a − b. Swapping them is the classic stack-VM bug.' },
      hints: [R`<p>Hint 1: the whole VM is <code>while True: op, arg = program[pc]; pc += 1; …</code>. Jumps simply overwrite <code>pc</code>.</p>`, R`<p>Hint 2: binary ops pop the <b>right</b> operand first. Use a small dict of lambdas (<code>operator.add</code>, <code>operator.sub</code>…) to keep dispatch O(1) and the code short.</p>`, R`<p>Hint 3: guard underflow with a helper <code>pop()</code> that raises <code>RuntimeError</code>; count steps and raise when over <code>max_steps</code>. Test with a loop program and with an infinite loop.</p>`],
      solution: {
        approach: R`<p>Keep a list as the value stack and an integer instruction pointer. Fetch, advance, dispatch. Arithmetic and comparisons share one generic handler using the <code>operator</code> module. Jumps assign to <code>pc</code>. A step counter acts as the "eval breaker".</p>`,
        code: { lang: 'python', run: true, code: R`import operator

BINOPS = {"BINARY_ADD": operator.add, "BINARY_SUB": operator.sub,
          "BINARY_MUL": operator.mul, "COMPARE_LT": operator.lt}

def run(program, env=None, max_steps=1_000_000):
    env = {} if env is None else env
    stack, pc, steps = [], 0, 0

    def pop():
        if not stack:
            raise RuntimeError(f"stack underflow at pc={pc - 1}")
        return stack.pop()

    while True:
        steps += 1
        if steps > max_steps:
            raise RuntimeError("step limit exceeded (infinite loop?)")
        op, arg = program[pc]
        pc += 1                                # point at the next instruction
        if op == "LOAD_CONST":
            stack.append(arg)
        elif op == "LOAD_NAME":
            stack.append(env[arg])
        elif op == "STORE_NAME":
            env[arg] = pop()
        elif op in BINOPS:
            right = pop()                      # right operand is on top
            left = pop()
            stack.append(BINOPS[op](left, right))
        elif op == "POP_JUMP_IF_FALSE":
            if not pop():
                pc = arg
        elif op == "JUMP":
            pc = arg
        elif op == "RETURN_VALUE":
            return pop()
        else:
            raise RuntimeError(f"unknown opcode {op}")

# i = 0; s = 0; while i < 5: s = s + i; i = i + 1; return s
prog = [
    ("LOAD_CONST", 0), ("STORE_NAME", "i"),          # 0, 1
    ("LOAD_CONST", 0), ("STORE_NAME", "s"),          # 2, 3
    ("LOAD_NAME", "i"), ("LOAD_CONST", 5),           # 4, 5   loop top
    ("COMPARE_LT", None), ("POP_JUMP_IF_FALSE", 17), # 6, 7
    ("LOAD_NAME", "s"), ("LOAD_NAME", "i"),          # 8, 9
    ("BINARY_ADD", None), ("STORE_NAME", "s"),       # 10, 11
    ("LOAD_NAME", "i"), ("LOAD_CONST", 1),           # 12, 13
    ("BINARY_ADD", None), ("STORE_NAME", "i"),       # 14, 15
    ("JUMP", 4),                                     # 16     back edge
    ("LOAD_NAME", "s"), ("RETURN_VALUE", None),      # 17, 18
]
print(run(prog))                                     # 10
try:
    run([("JUMP", 0)], max_steps=1000)
except RuntimeError as e:
    print("caught:", e)
` },
        dry: { head: ['pc', 'op', 'stack after', 'env'], rows: [['0–3', 'init', '[]', 'i=0, s=0'], ['4–6', 'LOAD i, LOAD 5, LT', '[True]', 'i=0'], ['7', 'POP_JUMP_IF_FALSE', '[] (falls through)', ''], ['8–11', 's = s + i', '[]', 's=0'], ['12–16', 'i = i + 1; JUMP 4', '[]', 'i=1'], ['… 4 more loops', '', '', 's=10, i=5'], ['6–7', '5 &lt; 5 is False → jump 17', '[]', ''], ['17–18', 'LOAD s; RETURN', H.c('g', 'returns 10'), '']] },
        complexity: R`<p>O(1) per executed instruction, so O(steps) time; O(max stack depth + #names) memory.</p>`,
        followUps: ['Add <code>CALL_FUNCTION</code> with a frame stack so programs can call sub-programs.', 'Add a "specialization" pass that rewrites <code>BINARY_ADD</code> to <code>BINARY_ADD_INT</code> after seeing ints twice, with a guard and deopt.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3: The Object Model (PyObject, type objects, layouts)
     ====================================================================== */
  topics.push({
    title: 'The Object Model: PyObject, Types & Memory Layout',
    analogy: R`<p>In a giant warehouse, every box (no matter what is inside) has the <b>same sticker</b> on its lid with two fields: <i>"how many order slips point at me"</i> and <i>"my product category card"</i>. The category card is itself stored in a box and says how to open, print, compare and add things of that kind. Boxes holding a variable number of pieces (a tray of eggs) have one extra field: <i>"number of pieces"</i>. Python variables are just <b>order slips</b>: they point at boxes, they are not boxes. That sticker is <code>PyObject</code>, the category card is the <b>type object</b>, and the order slips are references.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> In CPython <b>everything</b> is an object: ints, functions, classes, modules, even <code>None</code> and types themselves. Every object starts with the same C header:</p>
      <pre>typedef struct {
    Py_ssize_t   ob_refcnt;   // how many references point here
    PyTypeObject *ob_type;    // pointer to the type object (int, list, MyClass ...)
} PyObject;

typedef struct {               // for variable-size objects (list, tuple, int*, str*)
    PyObject   ob_base;
    Py_ssize_t ob_size;        // number of items
} PyVarObject;</pre>
      <p>Because every object begins with this header, C code can treat any object as a <code>PyObject*</code>, read its type, and ask the type what to do. That is how one interpreter loop can add ints, concatenate strings and call your <code>__add__</code> with the same <code>BINARY_OP</code> instruction.</p>
      <p><b>Variables are references.</b> <code>a = [1, 2]</code> creates a list object and makes the name <code>a</code> point to it. <code>b = a</code> copies the <b>pointer</b>, not the list. <code>id(x)</code> in CPython is the memory address of the object; <code>a is b</code> compares addresses; <code>a == b</code> calls <code>__eq__</code> to compare values.</p>
      <p><b>Type objects hold the behaviour</b> in "slots" (C function pointers):</p>
      ${H.table(['Python operation', 'Type slot CPython calls', 'Dunder that fills it'], [
        ['<code>repr(x)</code>', '<code>tp_repr</code>', '<code>__repr__</code>'],
        ['<code>hash(x)</code>', '<code>tp_hash</code>', '<code>__hash__</code>'],
        ['<code>a + b</code>', '<code>tp_as_number-&gt;nb_add</code>', '<code>__add__</code> / <code>__radd__</code>'],
        ['<code>len(x)</code>', '<code>sq_length</code> / <code>mp_length</code>', '<code>__len__</code>'],
        ['<code>x.attr</code>', '<code>tp_getattro</code>', '<code>__getattribute__</code> / <code>__getattr__</code>'],
        ['<code>x()</code>', '<code>tp_call</code>', '<code>__call__</code>'],
        ['<code>del</code> last reference', '<code>tp_dealloc</code>', '(<code>__del__</code> via <code>tp_finalize</code>)']
      ])}
      <p>When you define <code>__add__</code> in a class, CPython puts a small C "slot wrapper" in <code>nb_add</code> that calls your Python method. That is why dunders are looked up on the <b>type</b>, not the instance: <code>obj.__len__ = lambda: 5</code> does not change <code>len(obj)</code>.</p>
      <p><b>Three layouts worth knowing:</b></p>
      ${H.table(['Type', 'Layout', 'Consequence'], [
        ['<code>int</code>', 'header + size/sign + array of <b>30-bit digits</b>', 'arbitrary precision; <code>getsizeof(2**30)</code> &gt; <code>getsizeof(2**30 - 1)</code>'],
        ['<code>list</code>', 'header + size + pointer to a separate array of <code>PyObject*</code> + <code>allocated</code>', 'append is amortized O(1) thanks to over-allocation'],
        ['<code>tuple</code>', 'header + size + pointers <b>inline</b>', 'one allocation, immutable, smaller than a list'],
        ['<code>str</code>', 'PEP 393 compact: 1, 2 or 4 bytes per char depending on the widest char', '<code>"é" * 1000</code> uses 1 byte/char, one emoji makes it 4']
      ])}`,
    clues: [
      '"Everything in Python is an object, what does that mean in C?" → PyObject header with refcount + type pointer',
      '"Difference between <code>is</code> and <code>==</code>?" → address comparison vs <code>__eq__</code>',
      '"Why is a tuple smaller/faster to create than a list?" → items inline, one allocation, no over-allocation',
      '"Why is <code>sys.getsizeof</code> of a list of big strings so small?" → it is shallow: the list stores pointers',
      '"How does Python have unlimited-size ints?" → array of 30-bit digits, arbitrary length',
      '"Why does setting <code>obj.__len__</code> not change <code>len(obj)</code>?" → special methods are looked up on the type (slots)'
    ],
    code: [{ lang: 'python', title: 'Inspect headers, types and sizes (runnable)', run: true, code: R`import sys

a = [1, 2]
b = a                      # copies the reference, not the list
print("same object?", a is b, "| id equal?", id(a) == id(b))
print("type of a:", type(a), "| type of list:", type(list), "| type of type:", type(type))

# Shallow sizes (64-bit CPython; exact numbers vary by version)
for obj in [0, 2**30, 2**60, "", "hello", (), (1, 2), [], [1, 2], {}, object()]:
    print(f"{obj!r:>22}  {type(obj).__name__:<7} {sys.getsizeof(obj):>4} bytes")

# A list stores POINTERS: its size does not depend on how big the items are
small = ["x"] * 3
big = ["x" * 10_000] * 3
print("list sizes:", sys.getsizeof(small), sys.getsizeof(big))
` }],
    codeTitle: ['Objects, types, sizes'],
    viz: [{
      title: 'How CPython stores an int: 30-bit digits',
      input: '1234567890123456789',
      inputLabel: 'An integer (up to 60 digits, may be negative)',
      gen: function (input) {
        var s = String(input).trim().replace(/_/g, '');
        if (!/^-?\d{1,60}$/.test(s)) throw new Error('Enter an integer like 1234567890123 (max 60 digits)');
        var big = BigInt(s), neg = big < 0n, mag = neg ? -big : big, BASE = 1n << 30n;
        var digits = [], frames = [], rest = mag;
        frames.push({ narr: 'We want to store <b>' + esc(s) + '</b>. CPython does not use a fixed 64-bit box: it splits the magnitude into "digits" in <b>base 2<sup>30</sup></b> (= 1,073,741,824), least significant first, and stores the sign separately.', parts: [
          { type: 'vars', label: 'PyLongObject (3.12+ layout)', vals: { ob_refcnt: '…', ob_type: '&int', lv_tag: '(digit count + sign, filled below)', ob_digit: '[ ]' } },
          { type: 'text', html: 'Why 30 bits? Two digits multiplied fit in a 64-bit C integer with room for carries, so the C code stays simple and fast.' }
        ] });
        if (mag === 0n) digits.push(0);
        var guard = 0;
        while (rest > 0n && guard++ < 20) {
          var d = rest % BASE, q = rest / BASE;
          digits.push(Number(d));
          frames.push({ narr: 'divmod(' + rest.toString() + ', 2<sup>30</sup>) → quotient <b>' + q.toString() + '</b>, remainder <b>' + d.toString() + '</b>. The remainder becomes <code>ob_digit[' + (digits.length - 1) + ']</code>.', parts: [
            { type: 'array', label: 'ob_digit (least significant first)', values: digits.slice(), hl: (function () { var h = {}; h[digits.length - 1] = 'ok'; return h; })(), showIdx: true },
            { type: 'bits', label: 'ob_digit[' + (digits.length - 1) + '] as 30 bits', value: Number(d), width: 30, showDec: true },
            { type: 'vars', vals: { remaining: q.toString() } }
          ] });
          rest = q;
        }
        var nd = Math.max(1, digits.length);
        var size = 24 + 4 * nd;
        frames.push({ narr: 'Done: <b>' + digits.length + '</b> digit(s). The header records the digit count and sign (' + (neg ? 'negative' : mag === 0n ? 'zero' : 'positive') + '). <code>sys.getsizeof</code> on 3.12+ (64-bit) = 24-byte header + 4 bytes × ' + nd + ' digit(s) = <b>' + size + ' bytes</b>.', parts: [
          { type: 'vars', label: 'PyLongObject', vals: { ob_refcnt: '…', ob_type: '&int', 'digit count': digits.length, sign: neg ? '−' : (mag === 0n ? '0' : '+'), 'getsizeof (3.12+)': size }, hl: { 'getsizeof (3.12+)': 'sel' } },
          { type: 'array', label: 'ob_digit', values: digits.slice(), showIdx: true }
        ] });
        var terms = digits.map(function (d, i) { return d + '×2<sup>' + (30 * i) + '</sup>'; });
        frames.push({ narr: 'Reading it back: value = ' + (neg ? '−(' : '') + terms.join(' + ') + (neg ? ')' : '') + ' = <b>' + esc(s) + '</b>. Arithmetic works digit by digit like long multiplication at school (Karatsuba kicks in for very large numbers).', parts: [
          { type: 'table', label: 'Reconstruction', columns: ['i', 'ob_digit[i]', 'weight', 'contribution'], rows: digits.map(function (d, i) { return [i, d, '2^' + (30 * i), (BigInt(d) << BigInt(30 * i)).toString()]; }) }
        ] });
        var n = Number(s);
        var small = Math.abs(n) < 1e6 && n >= -5 && n <= 256;
        frames.push({ narr: small ? '<b>' + esc(s) + '</b> is in the range −5…256, so CPython never builds a new object for it: it hands out the <b>pre-built, cached (and since 3.12 immortal)</b> small int. Every <code>' + esc(s) + '</code> in your program is the same object.' : 'This value is outside −5…256, so each computation that produces it may create a <b>fresh object</b>. Ints are <b>immutable</b>: <code>x += 1</code> never changes this object, it builds a new one and rebinds <code>x</code>.', parts: [
          { type: 'vars', vals: { 'small-int cache?': small ? 'yes (shared singleton)' : 'no (new object per result)', mutable: 'never' }, hl: { 'small-int cache?': small ? 'ok' : 'cur' } }
        ] });
        return frames;
      }
    }, {
      title: 'list.append and over-allocation (ob_size vs allocated)',
      input: '18',
      inputLabel: 'Number of appends (1 to 40)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 40) throw new Error('Enter a number of appends between 1 and 40');
        var frames = [], size = 0, alloc = 0, reallocs = 0, copies = 0;
        function view(hlNew, grew) {
          var vals = [], hl = {};
          for (var i = 0; i < alloc; i++) { vals.push(i < size ? 'p' + i : '·'); hl[i] = i < size ? (i === hlNew ? 'cur' : 'ok') : 'done'; }
          if (!vals.length) { vals.push('(NULL)'); }
          return [
            { type: 'array', label: 'ob_item[] (pointer slots; · = spare capacity)', values: vals, hl: hl, showIdx: true },
            { type: 'vars', label: 'PyListObject', vals: { ob_size: size, allocated: alloc, 'getsizeof': 56 + 8 * alloc, reallocations: reallocs, 'pointers copied': copies }, hl: grew ? { allocated: 'sel', getsizeof: 'sel' } : { ob_size: 'ok' } }
          ];
        }
        frames.push({ narr: '<code>lst = []</code>: a 56-byte header (refcount, type, ob_size, the <code>ob_item</code> pointer, <code>allocated</code>, plus the GC links) and <b>no item array yet</b>.', parts: view(-1, false) });
        for (var k = 0; k < n; k++) {
          var newsize = size + 1, grew = false, old = alloc, narr;
          if (newsize > alloc) {
            var na = (newsize + (newsize >> 3) + 6) & ~3;
            copies += size; reallocs++; alloc = na; grew = true;
          }
          size = newsize;
          if (grew) narr = 'append #' + (k + 1) + ': no free slot (' + (size - 1) + ' of ' + old + ' used). CPython reallocates to <code>(n + n//8 + 6) &amp; ~3</code> = <b>' + alloc + '</b> slots and copies ' + (size - 1) + ' pointer(s). Growth is ~12.5% plus a little, which keeps the <b>average</b> cost of append O(1).';
          else narr = 'append #' + (k + 1) + ': a spare slot exists, so CPython just writes the pointer and bumps <code>ob_size</code> to ' + size + '. O(1), no copying.';
          if (!grew && k + 1 !== n && n > 14 && size % 3 !== 0) continue;
          frames.push({ narr: narr, parts: view(size - 1, grew) });
        }
        frames.push({ narr: 'Finished ' + n + ' appends with only <b>' + reallocs + '</b> reallocations and ' + copies + ' pointer copies in total (' + (copies / n).toFixed(2) + ' per append on average; with a growth factor of about 1.125 this settles near 8 for big lists, a constant, so append is amortized O(1). In practice <code>realloc</code> can often grow the block in place without copying at all). Note: <code>sys.getsizeof</code> counts the pointer array but not the objects the pointers lead to.', parts: view(-1, false) });
        return frames;
      }
    }],
    examples: [
      { title: 'The [[0]*3]*3 trap explained by references', html: R`<p><code>grid = [[0] * 3] * 3</code> builds <b>one</b> inner list and then a list holding <b>three pointers to it</b>. Changing <code>grid[0][0]</code> shows up in every row. A comprehension calls <code>[0] * 3</code> three times, giving three separate lists.</p>
        ${H.table(['Expression', 'distinct inner lists', 'grid after grid[0][0] = 9'], [['<code>[[0]*3]*3</code>', H.c('r', '1'), '[[9,0,0],[9,0,0],[9,0,0]]'], ['<code>[[0]*3 for _ in range(3)]</code>', H.c('g', '3'), '[[9,0,0],[0,0,0],[0,0,0]]']])}`, code: { lang: 'python', run: true, code: R`bad = [[0] * 3] * 3
good = [[0] * 3 for _ in range(3)]
bad[0][0] = good[0][0] = 9
print(bad)
print(good)
print("distinct rows:", len({id(r) for r in bad}), "vs", len({id(r) for r in good}))
` } },
      { title: 'Immutable rebinding vs in-place mutation', html: R`<p><code>+=</code> means different things for immutable and mutable objects. For an int, <code>x += 1</code> builds a <b>new</b> object and rebinds the name (the id changes). For a list, <code>+=</code> calls <code>list.__iadd__</code>, which <b>extends in place</b> (same id), so every other name pointing at that list sees the change.</p>`, code: { lang: 'python', run: true, code: R`x = 1000
before = id(x)
x += 1
print("int  same object after += ?", id(x) == before)

items = [1, 2]
alias = items
before = id(items)
items += [3]
print("list same object after += ?", id(items) == before, "| alias sees:", alias)
` } },
      { title: 'Dunders are looked up on the type', html: R`<p>Because built-in operations go through <b>type slots</b>, assigning a dunder on an instance has no effect on the operator, while assigning it on the class does. This also makes operators fast: no instance dict lookup on every <code>len()</code>.</p>
        ${H.table(['Assignment', 'len(obj) uses it?'], [['<code>obj.__len__ = …</code>', H.c('r', 'no')], ['<code>Cls.__len__ = …</code>', H.c('g', 'yes (slot updated)')]])}`, code: { lang: 'python', run: true, code: R`class Box:
    def __len__(self):
        return 1

b = Box()
b.__len__ = lambda: 99          # instance attribute: ignored by len()
print(len(b), b.__len__())     # 1 99
Box.__len__ = lambda self: 42   # class attribute: slot is updated
print(len(b))                   # 42
` } }
    ],
    deepDive: R`<p>🟣 <b>Hidden headers.</b> Container objects that can form cycles (lists, dicts, instances, …) carry an extra <code>PyGC_Head</code> <b>before</b> the <code>PyObject</code> header (two pointers used by the cyclic GC). <code>sys.getsizeof</code> includes it; <code>type.__basicsize__</code> does not. Instances of ordinary classes also reserve space for <code>__dict__</code> and <code>__weakref__</code>. Since 3.11 instance attributes are often stored as <b>inline values</b> with keys shared by all instances of the class (an evolution of PEP 412 key-sharing dicts); the real <code>dict</code> is only materialized if you touch <code>obj.__dict__</code> in unusual ways. <code>__slots__</code> removes the per-instance dict entirely and stores attributes at fixed offsets (exposed as member descriptors).</p>
      <p><b>Allocation.</b> Small objects (≤ 512 bytes) come from <b>pymalloc</b>: memory is grouped into arenas (1 MiB since 3.10) split into pools (16 KiB) of fixed-size blocks in 16-byte size classes. This avoids calling <code>malloc</code> for every tiny int or tuple and is why freed memory is often reused by the next object of the same size. Free lists for floats, tuples, lists and dicts recycle whole objects. The free-threaded build uses <b>mimalloc</b> instead, because it needs thread-safe allocation and the ability to scan the heap.</p>
      <p><b>Immortal objects (PEP 683, 3.12).</b> <code>None</code>, <code>True</code>, small ints, many interned strings and static types have a refcount marked "immortal": increments and decrements do not change it, which avoids cache-line writes on hugely shared objects and is essential for per-interpreter GIL and free threading. That is why <code>sys.getrefcount(None)</code> shows a huge fixed number.</p>
      <p><b>Free-threaded header.</b> In PEP 703 builds each object also stores an owning thread id plus a local and a shared reference count (<b>biased reference counting</b>): the owning thread updates its count without atomics, other threads use atomic operations on the shared count.</p>
      <p><b>Identity caveat:</b> <code>id()</code> is only unique among objects that are alive at the same time. After an object dies its address can be reused, so <code>id([]) == id([])</code> is often <code>True</code> (two short-lived lists at the same address).</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> an assistant can instantly produce struct diagrams of <code>PyObject</code>, <code>PyListObject</code> or <code>PyDictObject</code> and explain fields. These diagrams are frequently <b>out of date</b> (pre-3.11 dict layout, <code>ob_size</code> for ints instead of the 3.12 <code>lv_tag</code>, missing the managed dict). Cross-check with <code>Include/cpython/*.h</code> for your version.</p>
      <p><b>Use AI as a partner:</b> <code>Estimate the memory of 10 million instances of this class with and without __slots__ on 64-bit CPython 3.13, then give me a tracemalloc script to measure it.</code> The estimate is a hypothesis; the measurement is the truth.</p>
      <p><b>Where AI goes wrong:</b> treating <code>sys.getsizeof</code> as deep size, saying Python ints are 64-bit, or claiming <code>is</code> is a "faster <code>==</code>" you can use for numbers and strings.</p>
      <p><b>What you must still own:</b> the reference-vs-object mental model (it explains aliasing bugs, default-argument bugs and copy semantics), knowing which types are mutable, and being able to reason about memory from layouts.</p>`,
    problems: [{
      title: 'Detect list Capacity Jumps',
      level: 'Medium', tags: ['object model', 'sys.getsizeof', 'amortized analysis'], companies: ['Microsoft', 'Dropbox'],
      statement: R`<p>Write <code>capacity_jumps(n)</code> that appends <code>n</code> items to an empty list one by one and returns a list of <code>(length_after_append, new_capacity)</code> pairs for every append that triggered a reallocation. Derive capacity from <code>sys.getsizeof</code> (do not hard-code the growth formula). Then compute the average number of pointer copies per append.</p>`,
      constraints: R`<p>1 ≤ n ≤ 10<sup>5</sup>. 64-bit CPython (pointer = 8 bytes). Must work across versions (the empty-list size differs).</p>`,
      example: R`<p><code>capacity_jumps(20)</code> on CPython 3.9+ returns ${H.c('g', '[(1, 4), (5, 8), (9, 16), (17, 24)]')}. Why: capacity grows to (n + n//8 + 6) &amp; ~3 each time the list is full.</p>`,
      brute: { why: R`<p>Hard-coding the formula (<code>(n + (n &gt;&gt; 3) + 6) &amp; ~3</code>) "works" but only proves you memorised the C source of one version; it breaks on PyPy, older CPython (different formula) or future changes. Measuring the actual object is version-proof.</p>`, code: R`def capacity_jumps_hardcoded(n):
    out, cap = [], 0
    for size in range(1, n + 1):
        if size > cap:
            cap = (size + (size >> 3) + 6) & ~3
            out.append((size, cap))
    return out

print(capacity_jumps_hardcoded(20))
` },
      mcq: { q: 'Why does <code>sys.getsizeof</code> of a list change only at some appends?', options: ['It measures the header plus the allocated pointer array, which grows in jumps', 'Python garbage-collects the list every few appends', 'Small ints are stored inline in the list', 'getsizeof is random by design'], answer: 0, explain: 'The list over-allocates its pointer array. Until capacity runs out, appends only bump <code>ob_size</code>, so the allocated size (what getsizeof reports beyond the header) stays the same.' },
      hints: [R`<p>Hint 1: <code>capacity = (getsizeof(lst) - getsizeof([])) // 8</code> because each slot is an 8-byte pointer on 64-bit.</p>`, R`<p>Hint 2: remember the previous capacity; whenever it changes after an append, record <code>(len(lst), capacity)</code>. When capacity jumps, the old <code>len - 1</code> pointers were copied.</p>`, R`<p>Hint 3: use <code>struct.calcsize("P")</code> for the pointer size to be safe. Recipe: base = getsizeof([]); loop; compute cap; compare; accumulate copies; return jumps and copies / n.</p>`],
      solution: {
        approach: R`<p>Measure, do not assume: derive capacity from the actual object size, record each jump, and count how many pointers had to be moved. The average settles at a constant (about 8 copies per append for a 1.125 growth factor, since 1/(1.125 − 1) = 8, and often less because <code>realloc</code> can grow in place), which is the practical proof that <code>append</code> is amortized O(1).</p>`,
        code: { lang: 'python', run: true, code: R`import struct
import sys

PTR = struct.calcsize("P")          # 8 on 64-bit builds

def capacity_jumps(n):
    lst = []
    base = sys.getsizeof(lst)        # header only (no item array yet)
    prev_cap, jumps, copies = 0, [], 0
    for i in range(n):
        lst.append(i)
        cap = (sys.getsizeof(lst) - base) // PTR
        if cap != prev_cap:
            jumps.append((len(lst), cap))
            copies += len(lst) - 1   # old items moved to the new array
            prev_cap = cap
    return jumps, copies / n

jumps, avg = capacity_jumps(20)
print(jumps)
_, avg_big = capacity_jumps(100_000)
print(f"average pointer copies per append (n=100000): {avg_big:.2f}")
` },
        dry: { head: ['append #', 'len', 'getsizeof − base', 'cap', 'jump?'], rows: [['1', '1', '32', '4', H.c('g', 'yes (1, 4)')], ['2–4', '2–4', '32', '4', 'no'], ['5', '5', '64', '8', H.c('g', 'yes (5, 8)')], ['9', '9', '128', '16', H.c('g', 'yes (9, 16)')], ['17', '17', '192', '24', H.c('g', 'yes (17, 24)')]] },
        complexity: R`<p>O(n) time, O(n) memory for the list itself; the jump list has O(log n) entries because capacity grows geometrically (factor ≈ 1.125).</p>`,
        followUps: ['Why does a 12.5% growth factor still give amortized O(1)? (Any constant factor &gt; 1 does.)', 'What does <code>[None] * n</code> do differently from n appends? (Exact allocation, no spare slots.)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4: Reference Counting
     ====================================================================== */
  function refcountSim(input) {
    var L = String(input || '').replace(/\r/g, '').split(/[\n;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!L.length) throw new Error('One command per line, e.g.  a = []   b = a   a.append(b)   del a   b = None');
    if (L.length > 12) throw new Error('Use at most 12 commands');
    var names = {}, nameOrder = [], objs = [], frames = [];
    function obj(id) { return objs[id - 1]; }
    function label(id) { return 'list#' + id; }
    function snapshot(narr, li, hlObjs, hlNames) {
      var nodes = [], edges = [], hl = {}, tags = {}, live = objs;
      nameOrder.forEach(function (nm, i) {
        nodes.push({ id: 'n_' + nm, label: nm, x: 10, y: 8 + i * (52 / Math.max(1, nameOrder.length)), shape: 'box' });
        if (names[nm] !== undefined && names[nm] !== null) edges.push(['n_' + nm, 'o' + names[nm]]);
        if (hlNames && hlNames[nm]) hl['n_' + nm] = hlNames[nm];
      });
      live.forEach(function (o, i) {
        var col = i % 2, row = Math.floor(i / 2);
        nodes.push({ id: 'o' + o.id, label: label(o.id), x: 52 + col * 30, y: 10 + row * 18 + (col ? 8 : 0) });
        tags['o' + o.id] = o.alive ? 'rc=' + o.rc : 'freed';
        if (!o.alive) hl['o' + o.id] = 'done';
        if (o.alive) o.children.forEach(function (c) { edges.push(['o' + o.id, 'o' + c]); });
        if (hlObjs && hlObjs[o.id]) hl['o' + o.id] = hlObjs[o.id];
      });
      var rows = objs.map(function (o) { return [label(o.id), o.alive ? o.rc : 0, o.children.map(label).join(', ') || '—', o.alive ? 'alive' : 'FREED']; });
      var rowHl = {}; objs.forEach(function (o, i) { if (hlObjs && hlObjs[o.id]) rowHl[i] = hlObjs[o.id]; else if (!o.alive) rowHl[i] = 'done'; });
      var nameVals = {}; nameOrder.forEach(function (nm) { nameVals[nm] = names[nm] === undefined ? '(deleted)' : names[nm] === null ? 'None' : '→ ' + label(names[nm]); });
      frames.push({ narr: narr, parts: [
        { type: 'code', label: 'Program', lang: 'python', code: L.join('\n'), hl: li >= 0 ? lines([li + 1], 'cur') : {} },
        { type: 'graph', label: 'Names (boxes) → objects (circles)', directed: true, height: 62, nodes: nodes.length ? nodes : [{ id: 'empty', label: '(nothing yet)', x: 50, y: 30, shape: 'box' }], edges: edges, hl: hl, tags: tags },
        { type: 'table', label: 'Heap objects', columns: ['object', 'ob_refcnt', 'holds pointers to', 'status'], rows: rows.length ? rows : [['—', '—', '—', '—']], hl: rowHl },
        { type: 'vars', label: 'Namespace', vals: nameOrder.length ? nameVals : { '(empty)': '' } }
      ] });
    }
    var freedLog;
    function decref(id) {
      var o = obj(id); if (!o || !o.alive) return;
      o.rc--;
      if (o.rc === 0) {
        o.alive = false; freedLog.push(label(id));
        var kids = o.children.slice(); o.children = [];
        kids.forEach(decref);
      }
    }
    function incref(id) { obj(id).rc++; }
    function addName(nm) { if (nameOrder.indexOf(nm) < 0) { if (nameOrder.length >= 6) throw new Error('Use at most 6 different names'); nameOrder.push(nm); } }
    function bound(nm, li) { if (names[nm] === undefined || names[nm] === null) throw new Error('Line ' + (li + 1) + ': "' + nm + '" is not bound to a list'); return names[nm]; }
    snapshot('Start: an empty namespace. Each line will add or remove <b>references</b>; watch <code>ob_refcnt</code> on every object.', -1);
    L.forEach(function (line, li) {
      var m, narr, hlO = {}, hlN = {};
      freedLog = [];
      if ((m = /^([A-Za-z_]\w*)\s*=\s*\[\s*\]$/.exec(line))) {
        if (objs.length >= 6) throw new Error('Use at most 6 lists');
        var id = objs.length + 1; objs.push({ id: id, rc: 0, children: [], alive: true });
        addName(m[1]); var old = names[m[1]];
        incref(id); names[m[1]] = id; if (old) decref(old);
        hlO[id] = 'ok'; hlN[m[1]] = 'ok';
        narr = '<code>' + esc(line) + '</code> allocates <b>' + label(id) + '</b> and binds <code>' + m[1] + '</code> to it → refcount 1.' + (old ? ' The name used to point at ' + label(old) + ', so that object loses one reference.' : '');
      } else if ((m = /^([A-Za-z_]\w*)\s*=\s*None$/.exec(line))) {
        addName(m[1]); var o2 = names[m[1]]; names[m[1]] = null;
        if (o2) { decref(o2); hlO[o2] = obj(o2).alive ? 'cur' : 'bad'; }
        hlN[m[1]] = 'cur';
        narr = '<code>' + esc(line) + '</code> rebinds <code>' + m[1] + '</code> to <code>None</code> (an immortal singleton, so its count never matters).' + (o2 ? ' ' + label(o2) + ' drops to ' + obj(o2).rc + '.' : '');
      } else if ((m = /^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)$/.exec(line))) {
        var tgt = bound(m[2], li); addName(m[1]); var o3 = names[m[1]];
        incref(tgt); names[m[1]] = tgt; if (o3) decref(o3);
        hlO[tgt] = 'ok'; hlN[m[1]] = 'ok';
        narr = '<code>' + esc(line) + '</code> copies the <b>reference</b>, not the list. Both names now point at ' + label(tgt) + ', whose refcount rises to <b>' + obj(tgt).rc + '</b>.';
      } else if ((m = /^del\s+([A-Za-z_]\w*)$/.exec(line))) {
        if (names[m[1]] === undefined) throw new Error('Line ' + (li + 1) + ': NameError, "' + m[1] + '" is not defined');
        var o4 = names[m[1]]; delete names[m[1]];
        if (o4) { decref(o4); hlO[o4] = obj(o4).alive ? 'cur' : 'bad'; }
        hlN[m[1]] = 'bad';
        narr = '<code>' + esc(line) + '</code> deletes the <b>name</b>, not the object. ' + (o4 ? label(o4) + ' loses one reference → ' + obj(o4).rc + '.' : '');
      } else if ((m = /^([A-Za-z_]\w*)\.append\(\s*([A-Za-z_]\w*)\s*\)$/.exec(line))) {
        var host = bound(m[1], li), item = bound(m[2], li);
        obj(host).children.push(item); incref(item);
        hlO[item] = 'ok'; hlO[host] = 'cur';
        narr = '<code>' + esc(line) + '</code> stores a pointer to ' + label(item) + ' <b>inside</b> ' + label(host) + '. Containers hold references too: ' + label(item) + ' is now at <b>' + obj(item).rc + '</b>.' + (host === item ? ' <span class="c-y">A list containing itself: a reference cycle!</span>' : '');
      } else if ((m = /^([A-Za-z_]\w*)\.clear\(\)$/.exec(line))) {
        var h2 = bound(m[1], li), kids = obj(h2).children.slice(); obj(h2).children = [];
        kids.forEach(function (k) { decref(k); hlO[k] = obj(k).alive ? 'cur' : 'bad'; });
        narr = '<code>' + esc(line) + '</code> drops the pointers stored inside ' + label(h2) + '; each former item loses one reference.';
      } else {
        throw new Error('Line ' + (li + 1) + ' not understood. Use: x = [] | x = y | x = None | del x | x.append(y) | x.clear()');
      }
      if (freedLog.length) narr += ' <span class="c-r">Refcount hit 0 → freed immediately: ' + freedLog.join(', ') + (freedLog.length > 1 ? ' (a cascade: freeing a container decrements everything it held).' : '.') + '</span>';
      snapshot(narr, li, hlO, hlN);
    });
    var leaked = objs.filter(function (o) { return o.alive; }).filter(function (o) {
      // reachable from a name?
      var seen = {}, st = nameOrder.map(function (nm) { return names[nm]; }).filter(function (x) { return x; });
      while (st.length) { var c = st.pop(); if (seen[c]) continue; seen[c] = 1; obj(c).children.forEach(function (k) { st.push(k); }); }
      return !seen[o.id];
    });
    var lk = {}; leaked.forEach(function (o) { lk[o.id] = 'bad'; });
    snapshot(leaked.length ? '<b>End.</b> <span class="c-r">' + leaked.map(function (o) { return label(o.id); }).join(', ') + ' cannot be reached from any name, yet refcount &gt; 0</span> because the only references left come from inside a cycle. Reference counting alone can never free them; the <b>cyclic garbage collector</b> (next topic) exists for exactly this.' : '<b>End.</b> Every object is either reachable from a name or already freed. Reference counting handled everything with no pauses, freeing each object the instant its last reference vanished.', -1, lk);
    return frames;
  }

  topics.push({
    title: 'Reference Counting: Who Is Holding This Object?',
    analogy: R`<p>Think of a <b>helium balloon</b> held by strings. Every variable, list slot or attribute that refers to the object is one string. Tie on a new string: count + 1. Cut a string: count − 1. The instant the <b>last</b> string is cut, the balloon floats away (memory is freed) right then, not later. If the balloon was holding other balloons' strings, those strings are cut too, so a whole bunch can float away at once. The catch: two balloons tied <b>only to each other</b> keep each other "held" forever, even though nobody on the ground holds either.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Every object's header has <code>ob_refcnt</code>, the number of references pointing at it. CPython's C code calls <code>Py_INCREF</code> whenever it creates a new reference and <code>Py_DECREF</code> when one goes away. When the count reaches <b>0</b>, the object's type <code>tp_dealloc</code> runs <b>immediately</b>: it decrements everything the object referenced and returns the memory.</p>
      ${H.table(['Action', 'Refcount effect'], [
        ['<code>x = obj</code>, passing <code>obj</code> to a function, <code>lst.append(obj)</code>, <code>self.a = obj</code>', H.c('g', '+1')],
        ['pushing <code>obj</code> on the value stack during an expression', H.c('g', '+1 (temporary)')],
        ['<code>del x</code>, rebinding <code>x = other</code>, a local going out of scope at return', H.c('r', '−1')],
        ['removing from a container, the container itself dying', H.c('r', '−1 for each item')],
        ['a <b>weak</b> reference (<code>weakref.ref(obj)</code>)', H.c('m', '0, does not keep it alive')]
      ])}
      <p><b><code>del</code> removes a name, not an object.</b> The object is destroyed only when <b>all</b> references are gone. Conversely, an object you no longer use is still alive if anything (a cache, a global list, a closure, an exception traceback) still points at it: that is a Python "memory leak".</p>
      <p><b>Measuring:</b> <code>sys.getrefcount(x)</code> returns the count <b>plus one</b>, because passing <code>x</code> as the argument creates a temporary reference. A brand-new list bound to one name shows <code>2</code>. For <code>None</code>, small ints and other <b>immortal</b> objects (3.12+) it returns a huge constant.</p>
      <p><b>Why CPython chose refcounting:</b></p>
      ${H.table(['Pro', 'Con'], [
        ['Memory is freed immediately and predictably (files and sockets close when the last reference dies)', 'Every assignment touches memory (<code>INCREF</code>/<code>DECREF</code>), costing time and cache traffic'],
        ['No long "stop the world" pauses for most garbage', 'Not thread-safe without a lock: a big reason the <b>GIL</b> exists'],
        ['Simple mental model; C extensions manage lifetimes explicitly', 'Cannot free <b>reference cycles</b> → needs a separate cycle collector']
      ])}`,
    clues: [
      '"When is an object freed in CPython?" → the moment its refcount hits zero (or when the cycle GC collects it)',
      '"What does <code>del x</code> do?" → unbinds the name and decrements the object\'s count; it does not force destruction',
      '"Why does <code>sys.getrefcount</code> return 2 for a new object?" → the argument itself is a temporary reference',
      '"Memory keeps growing, nothing is leaking in C" → something still references the objects (cache, global, closure, traceback)',
      '"Why does Python have a GIL?" → refcount updates must be atomic; a single lock made that cheap',
      '"Cache that should not keep objects alive" → <code>weakref</code> / <code>WeakValueDictionary</code>'
    ],
    code: [{ lang: 'python', title: 'Watch refcounts move (runnable)', run: true, code: R`import sys

data = []                               # one reference: the name 'data'
print("fresh list     :", sys.getrefcount(data))   # 2 = name + argument

alias = data
holder = [data, data]                  # a list holds references too
print("after alias + 2 slots:", sys.getrefcount(data))

del alias                              # removes a NAME, not the object
holder.clear()
print("after del + clear:", sys.getrefcount(data))

class Noisy:
    def __del__(self):
        print("  Noisy freed")

print("creating Noisy and dropping the only reference ...")
n = Noisy()
n = None                               # refcount -> 0, freed right here
print("... next line runs after the object is already gone")
print("None is immortal, refcount reports:", sys.getrefcount(None))
` }],
    codeTitle: ['Refcounts in action'],
    viz: {
      title: 'Reference counting step by step (try making a cycle!)',
      input: 'a = []\nb = a\nc = []\nc.append(a)\ndel a\nb = None\ndel c\nd = []\nd.append(d)\ndel d',
      inputLabel: 'Commands, one per line: x = [] | x = y | x = None | del x | x.append(y) | x.clear()',
      gen: refcountSim
    },
    examples: [
      { title: 'Predict the output: when does __del__ run?', html: R`<p>Three names point at one object. The finalizer runs only when the <b>third</b> reference disappears, not at the first <code>del</code>.</p>
        ${H.table(['Line', 'refcount after', 'printed'], [['<code>a = Res("db")</code>', '1', '—'], ['<code>b = a; c = [a]</code>', '3', '—'], ['<code>del a</code>', '2', '—'], ['<code>b = None</code>', '1', '—'], ['<code>c.pop()</code>', '0', H.c('g', 'closing db')]])}`, code: { lang: 'python', run: true, code: R`class Res:
    def __init__(self, name):
        self.name = name
    def __del__(self):
        print("closing", self.name)

a = Res("db")
b = a
c = [a]
del a
print("after del a")
b = None
print("after b = None")
c.pop()                 # last reference gone -> __del__ runs now
print("after pop")
` } },
      { title: 'Exceptions keep frames (and locals) alive', html: R`<p>A traceback references every frame it passed through, and frames reference their locals. Keep an exception around and you keep huge local data alive. That is why Python <b>automatically deletes</b> the name in <code>except E as e:</code> at the end of the block, and why storing <code>sys.exc_info()</code> or exceptions in a list can leak memory.</p>`, code: { lang: 'python', run: true, code: R`import weakref

class Big:
    pass

saved = []

def work():
    payload = Big()                    # a local that should die at return
    ref = weakref.ref(payload)
    try:
        raise ValueError("boom")
    except ValueError as e:
        saved.append(e)                # e.__traceback__ -> frame -> payload
    return ref

r = work()
print("payload alive while exception is saved?", r() is not None)
saved.clear()
print("payload alive after clearing?", r() is not None)
` } },
      { title: 'weakref: point at something without keeping it alive', html: R`<p>A <b>weak reference</b> does not increase <code>ob_refcnt</code>. Calling it returns the object, or <code>None</code> once the object is gone. <code>weakref.WeakValueDictionary</code> builds caches that evaporate automatically; <code>weakref.finalize</code> is a safer alternative to <code>__del__</code> for cleanup.</p>
        ${H.kv([['strong refs', '1 → 0'], ['weak refs', 'do not count'], ['after last strong ref dies', 'wr() → None']])}`, code: { lang: 'python', run: true, code: R`import weakref

class Image:
    def __init__(self, name):
        self.name = name

cache = weakref.WeakValueDictionary()
img = Image("cat.png")
cache["cat"] = img
weakref.finalize(img, print, "finalizer: cat.png released")
print("in cache:", "cat" in cache)
del img                                   # last strong reference
print("in cache after del:", "cat" in cache)
` } }
    ],
    deepDive: R`<p>🟣 <b>Borrowed vs new references (C API).</b> Every C API function documents whether it returns a <b>new</b> reference (you must <code>Py_DECREF</code> it) or a <b>borrowed</b> one (you must not). Most extension-module memory bugs are a missing or extra DECREF: missing → leak, extra → use-after-free crash. Tools: debug builds track the total refcount (<code>sys.gettotalrefcount()</code>), and <code>tracemalloc</code> shows where leaked memory was allocated.</p>
      <p><b>Deallocation cascades and the "trashcan".</b> Freeing the head of a 1-million-node linked list would recurse 1 million levels deep in C. CPython's <i>trashcan</i> mechanism limits the nesting depth of deallocations and defers the rest, preventing C stack overflows.</p>
      <p><b><code>__del__</code> caveats.</b> It runs when the count hits zero, which may be at an unexpected point (inside another function's DECREF), it may <b>resurrect</b> the object by storing <code>self</code> somewhere, exceptions inside it are only printed as "Exception ignored in…", and at interpreter shutdown globals may already be <code>None</code>. Prefer context managers (<code>with</code>) for deterministic cleanup and <code>weakref.finalize</code> for "when it dies" hooks. Also: PyPy, GraalPy and Jython do not use refcounting, so code relying on "the file closes when the variable is overwritten" is CPython-only.</p>
      <p><b>Modern refcounting.</b> 3.12 immortal objects skip count updates for shared singletons. 3.14 reduces refcount traffic further: the compiler emits <code>LOAD_FAST_BORROW</code> when it can prove a local outlives its stack use, so <code>sys.getrefcount</code> may report <b>smaller</b> numbers than older versions (do not write tests that assert exact counts). The free-threaded build uses <b>biased reference counting</b> (cheap non-atomic updates by the owning thread, atomic for others) and <b>deferred reference counting</b> for objects like functions and modules that many threads touch.</p>
      <p><b>Production leak hunting:</b> <code>tracemalloc.take_snapshot()</code> + <code>compare_to</code> to find growing allocation sites; <code>gc.get_referrers(obj)</code> to see who holds an object; <code>objgraph</code>/memray to visualize; and the usual suspects: unbounded module-level dicts, <code>functools.lru_cache</code> on methods (it holds <code>self</code>), callbacks/event listeners never unregistered, and saved exceptions.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> assistants are quick at spotting classic leaks in a code review ("this module-level dict grows forever", "this lru_cache on a method pins every instance") and at writing <code>tracemalloc</code> harnesses. That is real leverage on large codebases.</p>
      <p><b>Use AI as a partner:</b> <code>Here is a tracemalloc compare_to diff from two snapshots 10 minutes apart. Rank the top suspects and tell me what reference is likely keeping them alive.</code> Then confirm with <code>gc.get_referrers</code>.</p>
      <p><b>Where AI goes wrong:</b> recommending <code>del x</code> or <code>gc.collect()</code> everywhere "to free memory" (it rarely helps; the real fix is removing the lingering reference), asserting exact <code>getrefcount</code> numbers that change between versions, or generating C extension code with unbalanced <code>Py_INCREF</code>/<code>Py_DECREF</code>.</p>
      <p><b>What you must still own:</b> the reasoning "who still points at this object?", the difference between names and objects, and the judgement of when to use weak references, context managers or a bounded cache.</p>`,
    problems: [{
      title: 'Prove an Object Gets Freed',
      level: 'Medium', tags: ['weakref', 'refcount', 'testing'], companies: ['Instagram', 'Dropbox', 'Netflix'],
      statement: R`<p>Write <code>is_freed_after(make, release)</code>: it calls <code>make()</code> to create an object, takes a <b>weak</b> reference to it, calls <code>release(obj)</code> (which should drop the references your code created), deletes its own local reference, and returns <code>True</code> if the object is gone. Use it to show that a bounded design frees objects while a "registry" leaks them.</p>`,
      constraints: R`<p>The object's class must support weak references (normal classes do; <code>int</code>/<code>tuple</code> do not). Must not depend on exact refcount numbers.</p>`,
      example: R`<p>If <code>release</code> stores the object in a global list, the answer is ${H.c('r', 'False')} (a strong reference survives). If <code>release</code> does nothing, the answer is ${H.c('g', 'True')} once our own local is deleted.</p>`,
      brute: { why: R`<p>Comparing <code>sys.getrefcount</code> before and after is fragile: the number includes temporary references, differs across versions (3.14 borrows references), and cannot tell you whether the object was actually deallocated. A weak reference answers the real question directly.</p>`, code: R`import sys

def is_freed_brute(make, release):
    obj = make()
    before = sys.getrefcount(obj)
    release(obj)
    after = sys.getrefcount(obj)
    return after <= before          # does not prove anything about freeing

print(is_freed_brute(lambda: [], lambda o: None))
` },
      mcq: { q: 'Your weakref still returns the object after you deleted your variable. What is the most likely cause?', options: ['Something else still holds a strong reference', 'Weak references always keep objects alive for one GC cycle', 'del only works inside functions', 'The object is immortal because it is a list'], answer: 0, explain: 'A weakref dies with the object. If it still resolves, a strong reference exists somewhere (a registry, a closure, a traceback, a cycle not yet collected). Lists are not immortal.' },
      hints: [R`<p>Hint 1: <code>wr = weakref.ref(obj)</code> does not change the refcount; <code>wr()</code> returns <code>None</code> once the object is gone.</p>`, R`<p>Hint 2: after <code>release(obj)</code>, run <code>del obj</code> so your own function no longer holds it. If cycles might be involved, call <code>gc.collect()</code> before checking.</p>`, R`<p>Hint 3: recipe: obj = make(); wr = weakref.ref(obj); release(obj); del obj; gc.collect(); return wr() is None. Test one leaking release and one clean release.</p>`],
      solution: {
        approach: R`<p>A weak reference is the ground truth for "is it alive?". We drop our own strong reference, optionally run the cycle collector (so cycles do not give false negatives), and check whether the weakref is dead.</p>`,
        code: { lang: 'python', run: true, code: R`import gc
import weakref

def is_freed_after(make, release, collect_cycles=True):
    obj = make()
    wr = weakref.ref(obj)          # does not keep obj alive
    release(obj)
    del obj                        # drop OUR reference
    if collect_cycles:
        gc.collect()               # cycles are not freed by refcounting
    return wr() is None

class Session:
    pass

REGISTRY = []

def leaky_release(s):
    REGISTRY.append(s)             # strong reference survives -> leak

def clean_release(s):
    pass

def cyclic_release(s):
    s.me = s                       # self-cycle: needs the cycle GC

print("leaky :", is_freed_after(Session, leaky_release))
print("clean :", is_freed_after(Session, clean_release))
print("cycle (no gc.collect):", is_freed_after(Session, cyclic_release, collect_cycles=False))
print("cycle (with collect) :", is_freed_after(Session, cyclic_release))
` },
        dry: { head: ['release', 'strong refs after del obj', 'gc.collect needed?', 'result'], rows: [['leaky_release', '1 (REGISTRY)', 'no help', H.c('r', 'False')], ['clean_release', '0', 'no', H.c('g', 'True')], ['cyclic_release, no collect', '1 (s.me → s)', 'yes', H.c('r', 'False')], ['cyclic_release, collect', '1 but unreachable', 'collected', H.c('g', 'True')]] },
        complexity: R`<p>O(1) apart from <code>gc.collect()</code>, which is O(number of tracked container objects). Use it in tests, not hot paths.</p>`,
        followUps: ['Turn this into a pytest fixture that fails a test when a request handler leaks its request object.', 'How would you find WHO holds the object when the answer is False? (<code>gc.get_referrers</code>)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5: The Cyclic Garbage Collector
     ====================================================================== */
  function gcSim(input) {
    var toks = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
    if (!toks.length) throw new Error('Enter edges like: x->A A->B B->A (lowercase = outside reference, Uppercase = container object)');
    var edges = [], objs = [], roots = [];
    toks.forEach(function (t) {
      var m = /^([A-Za-z]\w*)->([A-Za-z]\w*)$/.exec(t);
      if (!m) throw new Error('Bad edge "' + t + '". Use FROM->TO, e.g. x->A or A->B');
      if (!/^[A-Z]/.test(m[2])) throw new Error('"' + m[2] + '": edges must point AT container objects (start with an uppercase letter)');
      var src = m[1], dst = m[2];
      (/^[A-Z]/.test(src) ? objs : roots).indexOf(src) < 0 && (/^[A-Z]/.test(src) ? objs : roots).push(src);
      if (objs.indexOf(dst) < 0) objs.push(dst);
      edges.push([src, dst]);
    });
    if (objs.length > 8) throw new Error('Use at most 8 container objects');
    if (roots.length > 4) throw new Error('Use at most 4 outside references');
    if (edges.length > 20) throw new Error('Use at most 20 edges');
    var H0 = 64, nodes = [];
    roots.forEach(function (r, i) { nodes.push({ id: r, label: r, x: 6, y: 8 + i * (48 / Math.max(1, roots.length - 1 || 1)), shape: 'box', w: 8 }); });
    objs.forEach(function (o, i) {
      var ang = -Math.PI / 2 + (2 * Math.PI * i) / objs.length;
      nodes.push({ id: o, label: o, x: Math.round(60 + 30 * Math.cos(ang)), y: Math.round(32 + 24 * Math.sin(ang)) });
    });
    var rc = {}, gcr = {};
    objs.forEach(function (o) { rc[o] = 0; });
    edges.forEach(function (e) { rc[e[1]]++; });
    var frames = [];
    function g(hl, ehl, tags, label) { return { type: 'graph', label: label || 'Object graph (boxes = outside references: stack, globals, other generations)', directed: true, height: H0, nodes: nodes, edges: edges.map(function (e) { return [e[0], e[1]]; }), hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
    function tagsOf(map, pre) { var t = {}; objs.forEach(function (o) { t[o] = pre + map[o]; }); return t; }
    function tbl(extra) { return { type: 'table', label: 'Per-object bookkeeping', columns: ['object', 'ob_refcnt', 'gc_refs', 'state'], rows: objs.map(function (o) { return [o, rc[o], gcr[o] === undefined ? '—' : gcr[o], extra[o] || '']; }) }; }
    frames.push({ narr: 'The collector looks only at <b>container</b> objects in the generation being collected (circles). It cannot see the stack or other references directly; it only knows each object\'s <code>ob_refcnt</code> and can ask each container "who do you point at?" (<code>tp_traverse</code>).', parts: [g({}, {}, tagsOf(rc, 'rc=')), tbl({})] });
    objs.forEach(function (o) { gcr[o] = rc[o]; });
    frames.push({ narr: '<b>Step 1 · copy:</b> <code>gc_refs = ob_refcnt</code> for every object. This counts <i>all</i> references, from inside the group and from outside.', parts: [g({}, {}, tagsOf(gcr, 'gc=')), tbl({})] });
    objs.forEach(function (o) {
      var outs = edges.filter(function (e) { return e[0] === o; });
      if (!outs.length) return;
      var ehl = {}, hl = {}; hl[o] = 'cur';
      outs.forEach(function (e) { gcr[e[1]]--; ehl[e[0] + '-' + e[1]] = 'cur'; hl[e[1]] = hl[e[1]] || 'win'; });
      frames.push({ narr: '<b>Step 2 · subtract internal references:</b> traverse <b>' + o + '</b>; for each object it points at (' + outs.map(function (e) { return e[1]; }).join(', ') + '), do <code>gc_refs -= 1</code>. References between tracked objects cancel out.', parts: [g(hl, ehl, tagsOf(gcr, 'gc=')), tbl({})] });
    });
    var reach = {}, st = [], state = {};
    objs.forEach(function (o) { if (gcr[o] > 0) { reach[o] = true; st.push(o); state[o] = 'external ref → root'; } });
    var hl0 = {}; objs.forEach(function (o) { hl0[o] = reach[o] ? 'ok' : 'cur'; });
    frames.push({ narr: '<b>Step 3 · find roots:</b> any object with <code>gc_refs &gt; 0</code> must be referenced from <b>outside</b> the group, so it is definitely alive: ' + (st.length ? '<b>' + st.join(', ') + '</b>' : '<span class="c-r">none!</span>') + '. Objects with 0 are <i>tentatively</i> unreachable.', parts: [g(hl0, {}, tagsOf(gcr, 'gc=')), tbl(state)] });
    var guard = 0;
    while (st.length && guard++ < 50) {
      var cur = st.shift(), found = [], ehl = {};
      edges.forEach(function (e) { if (e[0] === cur) { ehl[e[0] + '-' + e[1]] = 'ok'; if (!reach[e[1]]) { reach[e[1]] = true; found.push(e[1]); st.push(e[1]); state[e[1]] = 'reachable via ' + cur; } } });
      if (!found.length) continue;
      var hl = {}; objs.forEach(function (o) { hl[o] = reach[o] ? 'ok' : 'cur'; }); hl[cur] = 'sel';
      frames.push({ narr: '<b>Step 4 · propagate:</b> ' + cur + ' is alive, so everything it points at is alive too: <b>' + found.join(', ') + '</b> → marked reachable (a gc_refs of 0 does not matter once a live object points at you).', parts: [g(hl, ehl, tagsOf(gcr, 'gc=')), tbl(state)] });
    }
    var dead = objs.filter(function (o) { return !reach[o]; });
    var hlF = {}, ehlF = {};
    objs.forEach(function (o) { hlF[o] = reach[o] ? 'ok' : 'bad'; if (!reach[o]) state[o] = 'UNREACHABLE → collect'; });
    edges.forEach(function (e) { if (!reach[e[1]] && dead.indexOf(e[0]) >= 0) ehlF[e[0] + '-' + e[1]] = 'bad'; });
    frames.push({ narr: dead.length ? '<b>Step 5 · collect:</b> <span class="c-r">' + dead.join(', ') + '</span> are only kept alive by each other. CPython runs finalizers (<code>__del__</code>, PEP 442) and weakref callbacks, then calls <code>tp_clear</code> on them to break the links; ordinary reference counting then frees the whole group.' : '<b>Step 5 · collect:</b> nothing is unreachable; every object is held (directly or indirectly) from outside. Survivors move to the next (older) generation.', parts: [g(hlF, ehlF, tagsOf(gcr, 'gc=')), tbl(state)] });
    frames.push({ narr: 'Result: <b>' + (objs.length - dead.length) + '</b> survivor(s) are promoted to an older generation (checked less often), <b>' + dead.length + '</b> object(s) freed. <code>gc.collect()</code> would return ' + dead.length + ' here (the count of unreachable objects found).', parts: [
      { type: 'set', label: 'survivors (promoted)', items: objs.filter(function (o) { return reach[o]; }), hl: {} },
      { type: 'set', label: 'collected', items: dead, hl: (function () { var h = {}; dead.forEach(function (d) { h[d] = 'bad'; }); return h; })() }
    ] });
    return frames;
  }

  topics.push({
    title: 'The Cyclic Garbage Collector: Cleaning Up Islands',
    analogy: R`<p>A members-only club lets you stay as long as someone <b>vouches</b> for you. Two members, Ana and Ben, vouch only for each other; nobody outside the club knows them. Simple counting says "both have one voucher, keep them". So once in a while an <b>auditor</b> visits: for every member, she counts vouches, then <b>crosses out vouches that come from other members</b>. Anyone with a vouch left must be known by someone outside: they stay, and so does everyone <i>they</i> vouch for. Whoever is left over is a closed island of mutual vouching, and gets shown the door. That auditor is CPython's cyclic garbage collector.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Reference counting cannot free a <b>cycle</b>: <code>a.friend = b; b.friend = a; del a, b</code> leaves both counts at 1 forever. CPython therefore runs a second, occasional collector that finds groups of objects reachable only from each other, and frees them.</p>
      <p><b>Which objects does it watch?</b> Only <b>containers</b> that could be part of a cycle: lists, dicts, sets, instances of your classes, functions, frames… (<code>gc.is_tracked(obj)</code>). Ints, floats and strings are never tracked. CPython even <b>untracks</b> tuples that contain only atomic values and dicts holding only atomic keys and values, to keep the work small.</p>
      <p><b>The algorithm</b> (the visualizer below runs it):</p>
      <ol>
        <li>For every tracked object in the generation: <code>gc_refs = ob_refcnt</code>.</li>
        <li>For every reference <b>between</b> those objects: subtract 1 from the target's <code>gc_refs</code>.</li>
        <li>Objects still above 0 are referenced from outside (stack, globals, older objects): they are <b>roots</b>.</li>
        <li>Everything reachable from a root is alive.</li>
        <li>The rest is garbage: run finalizers, clear references, let refcounting free it.</li>
      </ol>
      <p><b>Generations: most objects die young.</b> Classic CPython keeps three generations. New containers go into generation 0; a collection starts when allocations minus deallocations of containers exceed <code>threshold0</code>. Survivors are promoted to gen 1, then gen 2, which are scanned less and less often.</p>
      ${H.table(['Version', 'Thresholds / design'], [
        ['≤ 3.12', '<code>gc.get_threshold()</code> = (700, 10, 10): gen0 every 700 net allocations, gen1 every 10 gen0 runs, gen2 every 10 gen1 runs (plus a rule that full collections wait until long-lived objects grow by 25%)'],
        ['3.13', '(2000, 10, 10): a bigger young generation, fewer collections'],
        ['3.14', 'an <b>incremental</b> collector with a young and an old generation that scans the old space a slice at a time, cutting long pauses (check the <code>gc</code> docs of your exact version)'],
        ['free-threaded build', 'non-generational, stop-the-world collector that scans the mimalloc heap']
      ])}
      <p><b>Everyday API:</b> <code>gc.collect()</code> (returns the number of unreachable objects found), <code>gc.disable()</code>/<code>enable()</code>, <code>gc.get_threshold()</code>/<code>set_threshold()</code>, <code>gc.get_count()</code>, <code>gc.freeze()</code> (move everything to a permanent generation, great before <code>fork()</code>), <code>gc.callbacks</code> (measure pause times), <code>gc.get_referrers()</code>/<code>get_referents()</code> (debugging).</p>`,
    clues: [
      '"How does Python free circular references?" → generational cycle collector on top of refcounting',
      '"Two objects reference each other and have <code>__del__</code>, are they collected?" → yes since 3.4 (PEP 442); before that they went to <code>gc.garbage</code>',
      '"Latency spikes in a service that allocates many objects" → GC pauses; tune thresholds, <code>gc.freeze()</code>, reduce cycles',
      '"Pre-fork server (gunicorn/uWSGI) memory grows after fork" → GC touching objects breaks copy-on-write; <code>gc.freeze()</code>',
      '"Is it safe to <code>gc.disable()</code>?" → only if you do not create cycles (or collect manually); refcounting still works',
      '"Why aren\'t ints tracked by the GC?" → they cannot reference other objects, so they cannot form cycles'
    ],
    code: [{ lang: 'python', title: 'Create a cycle, then collect it (runnable)', run: true, code: R`import gc
import weakref

class Node:
    def __init__(self, name):
        self.name = name
        self.peer = None

gc.disable()                       # make the demo deterministic
a, b = Node("a"), Node("b")
a.peer, b.peer = b, a              # a <-> b cycle
probe = weakref.ref(a)
del a, b                           # refcounts are still 1 each (the cycle)
print("alive after del (refcounting alone):", probe() is not None)

found = gc.collect()               # the cycle collector finds the island
print("gc.collect() found", found, "unreachable objects")
print("alive after collect:", probe() is not None)
gc.enable()

print("thresholds:", gc.get_threshold())
print("tracked? int:", gc.is_tracked(42), "| list:", gc.is_tracked([]),
      "| dict of atoms:", gc.is_tracked({"k": 1}))
` }],
    codeTitle: ['Cycles vs refcounting'],
    viz: {
      title: 'Mark phase of the cycle collector (gc_refs subtraction)',
      input: 'x->A A->B B->A B->C C->B D->E E->D E->F F->F y->G',
      inputLabel: 'Edges FROM->TO. lowercase = outside reference (stack/global), Uppercase = tracked container',
      gen: gcSim
    },
    examples: [
      { title: 'Predict: which objects survive?', html: R`<p>Graph: <code>x→A, A→B, B→A, C→D, D→C</code>. Refcounts: A=2 (x, B), B=1, C=1, D=1. After subtracting internal edges: A=1, B=0, C=0, D=0. A is a root; B is reachable from A. C and D form an island.</p>
        ${H.table(['object', 'ob_refcnt', 'gc_refs after step 2', 'verdict'], [['A', '2', '1', H.c('g', 'root')], ['B', '1', '0', H.c('g', 'reachable from A')], ['C', '1', '0', H.c('r', 'collected')], ['D', '1', '0', H.c('r', 'collected')]])}
        <p>Try exactly this input in the visualizer above.</p>` },
      { title: 'gc.freeze() for pre-fork servers', html: R`<p>Servers like gunicorn load the app, then <code>fork()</code> workers that share memory pages copy-on-write. A GC pass writes to object headers (the GC links and <code>gc_refs</code>), which copies those pages into every worker, multiplying memory. Instagram famously disabled GC to avoid this; the cleaner fix added in 3.7 is <code>gc.freeze()</code> just before forking: all current objects move to a permanent generation the collector ignores.</p>`, code: { lang: 'python', run: true, code: R`import gc

app_state = [{"route": i} for i in range(10_000)]   # imagine a loaded app
gc.collect()
gc.freeze()                       # everything existing is now "permanent"
print("frozen objects:", gc.get_freeze_count())
# ... os.fork() workers would happen here ...
gc.unfreeze()                     # (just to leave the demo clean)
print("after unfreeze:", gc.get_freeze_count())
` } },
      { title: 'Measure GC pauses with gc.callbacks', html: R`<p><code>gc.callbacks</code> lets you hook the start and stop of every collection, so you can log pause times per generation in production and decide whether tuning matters. Most services spend well under 1% of time in GC; when it is more, it is usually because of huge numbers of long-lived container objects.</p>`, code: { lang: 'python', run: true, code: R`import gc
import time

pauses = []
_start = [0.0]

def on_gc(phase, info):
    if phase == "start":
        _start[0] = time.perf_counter()
    else:
        pauses.append((info["generation"], (time.perf_counter() - _start[0]) * 1000))

gc.callbacks.append(on_gc)
junk = []
for i in range(200_000):
    junk.append([i])               # many container allocations trigger gen0 runs
gc.callbacks.remove(on_gc)
print("collections:", len(pauses))
if pauses:
    print("max pause ms: %.3f" % max(p for _, p in pauses))
` } }
    ],
    deepDive: R`<p>🟣 <b>Where gc_refs lives.</b> Each tracked object has a <code>PyGC_Head</code> just before it: two words linking it into its generation's doubly linked list. During a collection one of those words temporarily holds <code>gc_refs</code> and flag bits. The algorithm is linear in the number of objects in the collected generations, which is why the young generation is kept small.</p>
      <p><b>Finalization order (PEP 442).</b> For unreachable objects CPython: (1) handles weak references (clears them, schedules callbacks), (2) calls <code>tp_finalize</code> (<code>__del__</code>) once per object, (3) <b>re-checks reachability</b>, because a finalizer may resurrect objects by storing them somewhere, (4) calls <code>tp_clear</code> to break references among the remaining garbage. Since 3.4, cycles with <code>__del__</code> are collected; <code>gc.garbage</code> is now only filled with <code>gc.DEBUG_SAVEALL</code> or by unusual C extensions.</p>
      <p><b>Why full collections are rate limited.</b> If gen2 were scanned every 10 × 10 × 700 allocations, building a large data structure would be quadratic. CPython waits until the number of objects that survived into gen2 since the last full collection exceeds 25% of the long-lived total.</p>
      <p><b>Tuning in practice.</b> Raising <code>threshold0</code> (e.g. <code>gc.set_threshold(50_000, 20, 20)</code>) reduces the number of young collections for allocation-heavy batch jobs; <code>gc.freeze()</code> after startup removes long-lived objects from future scans; avoiding cycles (use <code>weakref</code> for parent pointers, break caches explicitly) lets refcounting do all the work. Measure with <code>gc.callbacks</code> or <code>gc.get_stats()</code> before and after; do not tune blindly.</p>
      <p><b>Other implementations:</b> PyPy uses an incremental generational moving GC with no refcounts (objects may move; <code>id()</code> is emulated). The free-threaded CPython build needs all threads paused for its collector and finds objects by walking mimalloc heaps instead of generation lists.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> an assistant can read a heap dump summary or <code>gc.get_stats()</code> output and suggest whether GC is a real bottleneck, and it writes good instrumentation (callbacks, Prometheus metrics for pause time). It is also handy for drawing object graphs from <code>gc.get_referrers</code> output.</p>
      <p><b>Use AI as a partner:</b> <code>Our p99 latency spikes every few seconds. Here are gc callback logs (generation, ms). Is GC the cause, and what would gc.freeze() or threshold changes do? List risks.</code></p>
      <p><b>Where AI goes wrong:</b> it repeats outdated facts (thresholds 700 on 3.13, "cycles with __del__ are never collected", "Python uses mark-and-sweep only"), or recommends <code>gc.disable()</code> globally without noticing the code creates cycles (memory then grows without bound).</p>
      <p><b>What you must still own:</b> knowing that refcounting does most of the work and the cycle GC is a backstop, the subtract-internal-references idea, and how to verify a tuning change with measurements.</p>`,
    problems: [{
      title: 'Simulate the Cycle Collector',
      level: 'Hard', tags: ['graph', 'garbage collection', 'BFS'], companies: ['Google', 'Microsoft', 'Databricks'],
      statement: R`<p>You are given the tracked objects of one generation: <code>refcnt</code>, a dict mapping each object id to its <code>ob_refcnt</code>, and <code>refs</code>, a dict mapping each object id to the list of ids it references (only references to objects in this generation are listed). Return the set of ids that are <b>unreachable</b> (garbage) according to CPython's algorithm.</p>`,
      constraints: R`<p>Up to 10<sup>5</sup> objects and 10<sup>6</sup> references. <code>refcnt[o]</code> ≥ number of listed references to <code>o</code>. An object may reference itself or reference the same target several times (each counts).</p>`,
      example: R`<p><code>refcnt = {A: 2, B: 1, C: 1, D: 1}</code>, <code>refs = {A: [B], B: [A], C: [D], D: [C]}</code> → ${H.c('r', '{C, D}')}. A has one reference from outside (2 − 1 from B), B is reachable from A; C and D only hold each other.</p>`,
      brute: { why: R`<p>For each object, try to prove it is externally reachable by searching backwards over all objects and edges: O(N · (N + E)). The insight is that "external references" can be computed for <b>all</b> objects at once by subtraction, followed by a single forward BFS: O(N + E).</p>`, code: R`def unreachable_brute(refcnt, refs):
    incoming = {o: [] for o in refcnt}
    for src, targets in refs.items():
        for t in targets:
            incoming[t].append(src)
    def externally_held(o):
        return refcnt[o] > len(incoming[o])
    garbage = set()
    for o in refcnt:                       # backward search per object: slow
        seen, stack, alive = set(), [o], False
        while stack:
            cur = stack.pop()
            if cur in seen:
                continue
            seen.add(cur)
            if externally_held(cur):
                alive = True
                break
            stack.extend(incoming[cur])
        if not alive:
            garbage.add(o)
    return garbage

print(unreachable_brute({"A": 2, "B": 1, "C": 1, "D": 1}, {"A": ["B"], "B": ["A"], "C": ["D"], "D": ["C"]}))
` },
      mcq: { q: 'After subtracting internal references, object X has gc_refs = 0. What can you conclude?', options: ['Nothing yet: X may still be reachable from a root', 'X is garbage', 'X has no references at all', 'X is immortal'], answer: 0, explain: 'gc_refs = 0 only means no reference comes from OUTSIDE the generation directly. X may be referenced by a root object inside the generation, so the reachability pass decides.' },
      hints: [R`<p>Hint 1: copy the refcounts, then for every edge <code>src → dst</code> subtract 1 from <code>dst</code>. What remains counts references from outside the group.</p>`, R`<p>Hint 2: objects with a positive remainder are roots. BFS/DFS from all roots along <code>refs</code>; everything visited is alive.</p>`, R`<p>Hint 3: the answer is all objects minus the visited set. Use a deque for BFS; duplicates in <code>refs</code> must subtract more than once; self-references subtract from themselves.</p>`],
      solution: {
        approach: R`<p>Exactly CPython's mark phase: (1) <code>gc_refs = refcnt</code>; (2) subtract one per internal edge; (3) roots are objects with <code>gc_refs &gt; 0</code>; (4) BFS from roots; (5) everything not reached is garbage.</p>`,
        code: { lang: 'python', run: true, code: R`from collections import deque

def unreachable(refcnt, refs):
    gc_refs = dict(refcnt)                         # step 1: copy
    for src, targets in refs.items():              # step 2: subtract internal refs
        for t in targets:
            gc_refs[t] -= 1
    alive = {o for o, r in gc_refs.items() if r > 0}   # step 3: roots
    queue = deque(alive)
    while queue:                                    # step 4: propagate
        cur = queue.popleft()
        for t in refs.get(cur, ()):
            if t not in alive:
                alive.add(t)
                queue.append(t)
    return set(refcnt) - alive                      # step 5: garbage

print(sorted(unreachable({"A": 2, "B": 1, "C": 1, "D": 1},
                         {"A": ["B"], "B": ["A"], "C": ["D"], "D": ["C"]})))
# self-cycle plus a chain hanging off it
print(sorted(unreachable({"S": 1, "T": 1, "U": 2},
                         {"S": ["S"], "T": ["U"], "U": []})))
` },
        dry: { head: ['step', 'A', 'B', 'C', 'D', 'note'], rows: [['copy', '2', '1', '1', '1', 'gc_refs = refcnt'], ['A→B', '2', '0', '1', '1', ''], ['B→A', '1', '0', '1', '1', ''], ['C→D, D→C', '1', '0', '0', '0', ''], ['roots', H.c('g', '✓'), '', '', '', 'only A &gt; 0'], ['BFS', H.c('g', '✓'), H.c('g', '✓'), '', '', 'A reaches B'], ['result', '', '', H.c('r', 'garbage'), H.c('r', 'garbage'), '{C, D}']] },
        complexity: R`<p>O(N + E) time and O(N) extra memory: one pass to subtract, one BFS.</p>`,
        followUps: ['Second example: S references only itself (gc_refs 1 − 1 = 0, garbage); T has a reference from outside (no internal referrers) so it is a root, and it keeps U alive too.', 'How would you add generations: what must you do about references from OLDER objects into the young generation?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6: Small-Int Cache & String Interning
     ====================================================================== */
  topics.push({
    title: 'Small-Int Cache, String Interning & Why "is" Lies to You',
    analogy: R`<p>A busy school keeps a <b>shared drawer of ready-made number badges</b> from −5 to 256. Whenever anyone needs "7", they grab the drawer's one and only "7" badge instead of printing a new one; for "1000" a fresh badge is printed every time. For words, the school office keeps an <b>official register</b>: popular names like <code>count</code> or <code>self</code> are written once and everybody shares that copy. Asking "is this the <i>same badge</i>?" (<code>is</code>) therefore gives answers that depend on the drawer and the register, while "does it <i>say</i> the same thing?" (<code>==</code>) always works.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> <code>==</code> compares <b>values</b>. <code>is</code> compares <b>identity</b> (same object, same address). CPython reuses some objects to save time and memory, so <code>is</code> sometimes returns <code>True</code> for equal values "by accident". Never rely on it except for true singletons: <code>None</code>, <code>True</code>, <code>False</code>, <code>...</code>, <code>NotImplemented</code> and your own sentinel objects.</p>
      <p><b>1. The small-int cache.</b> At startup CPython pre-creates the ints <b>−5 … 256</b>. Any operation producing one of these returns the cached object (since 3.12 they are also <b>immortal</b>). Anything outside the range is a new object each time it is computed.</p>
      ${H.table(['Expression (runtime)', 'Result', 'Why'], [
        ['<code>int("256") is int("256")</code>', H.c('g', 'True'), 'both come from the cache'],
        ['<code>int("257") is int("257")</code>', H.c('r', 'False'), 'two separate objects'],
        ['<code>int("-5") is int("-5")</code>', H.c('g', 'True'), 'cache starts at −5'],
        ['<code>int("-6") is int("-6")</code>', H.c('r', 'False'), 'outside the cache']
      ])}
      <p><b>2. Constants are shared within one compilation.</b> When a whole file (module) is compiled, equal constants are merged, so in a script <code>a = 1000; b = 1000; a is b</code> is <code>True</code>, while typing the two lines separately in the REPL gives <code>False</code> (each line is compiled on its own). This "it works in my script but not in the REPL" effect is the #1 interning puzzle.</p>
      <p><b>3. String interning.</b> CPython keeps a table of <b>interned</b> strings: one canonical object per value. It interns automatically:</p>
      ${H.table(['Interned automatically', 'Not interned automatically'], [
        ['names: variables, functions, attributes, keyword arguments, <code>co_names</code>', 'strings built at runtime: <code>"".join(...)</code>, f-strings, <code>input()</code>, file data, slicing (except 0/1-char results)'],
        ['string literals that look like identifiers (<code>"user_id"</code>)', 'literals with spaces or punctuation (<code>"hello world"</code>), only merged within one compilation'],
        ['the empty string and single Latin-1 characters (cached singletons)', '']
      ])}
      <p><b>Why bother?</b> Attribute and global lookups are dict lookups keyed by strings. If both keys are the same interned object, the dict can compare <b>pointers</b> instead of characters, and the hash is already cached in the string. You can intern runtime data yourself with <code>sys.intern(s)</code>: useful when you load millions of repeated strings (column names, enum-like values, JSON keys) to save memory and speed up comparisons.</p>`,
    clues: [
      '"Why is <code>a is b</code> True for 256 but False for 257?" → small-int cache −5…256',
      '"Works in a script, different in the REPL" → constants merged per compilation unit',
      '"SyntaxWarning: \"is\" with a literal" → you meant <code>==</code>',
      '"Millions of duplicate strings eating memory" → <code>sys.intern</code> or a dedupe dict',
      '"Why are attribute lookups fast?" → interned names + cached hashes → pointer comparison in dicts',
      '"When is <code>is</code> correct?" → <code>None</code>, booleans, sentinels, identity checks of the same object'
    ],
    code: [{ lang: 'python', title: 'Identity experiments (runnable; avoids literal-is warnings)', run: true, code: R`import sys

def make_int(text):
    return int(text)               # built at runtime, like data from a file

for t in ["-6", "-5", "100", "256", "257", "1000"]:
    a, b = make_int(t), make_int(t)
    print(f"{t:>5}: a == b {a == b!s:5}  a is b {a is b}")

p = "".join(["user", "_id"])       # runtime strings: equal but separate
q = "".join(["user", "_id"])
print("runtime strings is? ", p is q)
print("after sys.intern is?", sys.intern(p) is sys.intern(q))

single = "abc"[0]                  # 1-char Latin-1 strings are cached
other = "xa"[1]
print("single-char cached? ", single is other)
e1, e2 = tuple(), tuple([])
print("empty tuple shared? ", e1 is e2)
` }],
    codeTitle: ['is vs =='],
    viz: {
      title: 'Same object or not? Small ints, literals and interning',
      input: "256, 257, -5, -6, 'a', 'user_id', 'hello world'",
      inputLabel: "Comma-separated ints or quoted strings (max 8), e.g. 1000, 'x', 'my name'",
      gen: function (input) {
        var raw = String(input || '').match(/'[^']*'|"[^"]*"|-?\d+/g);
        if (!raw || !raw.length) throw new Error("Enter values like: 256, 257, 'a', 'hello world'");
        if (raw.length > 8) throw new Error('Use at most 8 values');
        var frames = [], rows = [], interned = ['self', 'name', '__init__'];
        frames.push({ narr: 'For each value we ask three questions: (1) if the program <b>builds</b> it twice at runtime (e.g. <code>int(text)</code> or <code>"".join(parts)</code>), are the results the same object? (2) if it appears <b>twice as a literal</b> in one file? (3) after <code>sys.intern</code> (strings only)?', parts: [
          { type: 'bars', label: 'small-int cache: -5 … 256 (262 pre-built immortal objects)', values: [5, 10, 15, 20, 25], texts: ['-5', '0', '1', '…', '256'] },
          { type: 'set', label: 'interned-strings table (a few of thousands)', items: interned.slice() }
        ] });
        raw.forEach(function (tok) {
          var isStr = /^['"]/.test(tok), runtime, lit, intern, why, hlSet = {};
          if (!isStr) {
            var v = parseInt(tok, 10);
            var cached = v >= -5 && v <= 256;
            runtime = cached; lit = true; intern = 'n/a';
            why = cached ? '<b>' + v + '</b> is inside −5…256, so every computation that yields it returns the one cached object.' : '<b>' + v + '</b> is outside −5…256: each <code>int(text)</code> builds a brand-new object, so <code>is</code> is False. Two literals in the same file are still merged into one constant (True), which is why scripts and the REPL disagree.';
          } else {
            var s = tok.slice(1, -1);
            var ident = /^[A-Za-z0-9_]*$/.test(s);
            var tiny = s.length === 0 || (s.length === 1 && s.charCodeAt(0) < 256);
            runtime = tiny; lit = true; intern = true;
            if (ident && !tiny && interned.indexOf(s) < 0) { interned.push(s); hlSet[s] = 'ok'; }
            why = tiny ? 'Empty and single Latin-1 character strings are <b>cached singletons</b>: even runtime-built copies are the same object.' :
              ident ? '<code>' + esc(tok) + '</code> looks like an identifier, so the compiler <b>interns</b> the literal (added to the table). But a copy built at runtime with <code>"".join</code> is a separate object until you call <code>sys.intern</code>.' :
                '<code>' + esc(tok) + '</code> contains characters that are not identifier characters, so it is <b>not</b> interned automatically. Two literals in the same file are merged as constants; runtime copies are separate objects. <code>sys.intern</code> makes them identical.';
            if (!ident && !tiny) hlSet = {};
          }
          rows.push([tok, runtime ? 'True' : 'False', lit ? 'True' : 'False', intern === 'n/a' ? 'n/a' : 'True', 'True (always)']);
          var rh = {}; rh[rows.length - 1] = runtime ? 'ok' : 'cur';
          frames.push({ narr: why, parts: [
            { type: 'table', label: 'a is b ?', columns: ['value', 'built twice at runtime', 'two literals, same file', 'after sys.intern', 'a == b'], rows: rows.map(function (r) { return r.slice(); }), hl: rh },
            { type: 'set', label: 'interned-strings table', items: interned.slice(), hl: hlSet }
          ] });
        });
        frames.push({ narr: '<b>Lesson:</b> the middle columns change with Python version, REPL vs script and how the value was made. Only the last column is guaranteed. Use <code>==</code> for values and keep <code>is</code> for <code>None</code>, <code>True</code>/<code>False</code> and sentinels.', parts: [
          { type: 'table', label: 'Summary', columns: ['value', 'built twice at runtime', 'two literals, same file', 'after sys.intern', 'a == b'], rows: rows, hl: {} }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: script vs REPL', html: R`<p>Saved in a file and run with <code>python demo.py</code>, the first print is <code>True</code>: the compiler merged the two <code>1000</code> constants. Typed line by line in the REPL, it is <code>False</code>. The second print is <code>False</code> in both, because <code>x + 1</code> is computed at runtime.</p>
        ${H.table(['Line', 'script', 'REPL'], [['<code>a = 1000; b = 1000; a is b</code>', H.c('g', 'True'), H.c('r', 'False') + ' (separate lines)'], ['<code>x = 999; (x + 1) is a</code>', H.c('r', 'False'), H.c('r', 'False')]])}`, code: { lang: 'python', run: true, code: R`a = 1000
b = 1000
print("same compilation unit:", a is b)       # constants merged -> True

x = 999
c = x + 1                                     # computed at runtime
print("computed at runtime  :", c is a, "| equal?", c == a)

# simulate the REPL: compile each line separately
ns = {}
exec(compile("p = 1000", "<line1>", "exec"), ns)
exec(compile("q = 1000", "<line2>", "exec"), ns)
print("separate compiles    :", ns["p"] is ns["q"])
` } },
      { title: 'The classic bug: comparing strings with is', html: R`<p><code>if status is "ok":</code> may pass in tests (literal interned) and fail in production when <code>status</code> comes from JSON or a database (runtime string). Python 3.8+ warns at compile time: <code>SyntaxWarning: "is" with 'str' literal</code>. Linters (ruff <code>F632</code>) flag it too.</p>
        ${H.table(['status came from', 'status is "ok"', 'status == "ok"'], [['a literal in code', H.c('g', 'True'), H.c('g', 'True')], ['<code>json.loads</code> / network', H.c('r', 'False (usually)'), H.c('g', 'True')]])}`, code: { lang: 'python', run: true, code: R`import json

OK = "ok"
from_code = "ok"
from_json = json.loads('{"status": "o' + 'k"}')["status"]
print("literal  is:", from_code is OK, "| ==:", from_code == OK)
print("from json is:", from_json is OK, "(do not rely on this) | ==:", from_json == OK)
` } },
      { title: 'sys.intern to shrink repeated data', html: R`<p>Loading a CSV with 1 million rows where a <code>country</code> column has 200 distinct values creates up to 1 million separate string objects. Interning (or a simple dedupe dict) keeps only 200 and makes equality checks pointer-fast.</p>
        ${H.kv([['before', '≈ 1,000,000 str objects'], ['after sys.intern', '≈ 200 str objects']])}`, code: { lang: 'python', run: true, code: R`import sys

rows = ["".join(["coun", "try_", str(i % 200)]) for i in range(100_000)]
print("distinct objects before:", len({id(s) for s in rows}))
rows = [sys.intern(s) for s in rows]
print("distinct objects after :", len({id(s) for s in rows}))
` } }
    ],
    deepDive: R`<p>🟣 <b>Where the caches live.</b> Small ints are a static array of <code>PyLongObject</code>s in the runtime state (shared by sub-interpreters, immortal since 3.12). Single-character Latin-1 strings and the empty string are also static singletons. Interned strings live in a dict owned by the interpreter; since 3.12, statically allocated and many interned strings are immortal.</p>
      <p><b>Compile-time merging.</b> The compiler keeps a constant cache per compilation, so equal constants (ints, floats, strings, tuples of constants) across all functions in one module become one object. Constant strings made only of ASCII letters, digits and underscores are interned (the "all name chars" rule); others are merged but not interned. Constant folding results follow the same rules: <code>"hel" + "lo"</code> is folded to an interned <code>"hello"</code>.</p>
      <p><b>Hash caching.</b> Every <code>str</code> caches its hash after the first computation (the <code>hash</code> field, −1 meaning "not computed yet"). Dict lookup first compares pointers, then hashes, and only then characters, so interned keys hit the fastest path. String hashes are randomized per process (<code>PYTHONHASHSEED</code>) to defend against hash-flooding attacks, which is why set iteration order of strings differs between runs.</p>
      <p><b>Other identity traps:</b> <code>id()</code> values are reused after objects die; <code>[] is []</code> is False but <code>() is ()</code> is True (the empty tuple is a singleton); <code>float("nan") is float("nan")</code> is False and <code>nan == nan</code> is also False, yet <code>x = nan; [x].count(x)</code> is 1 because containers check identity before equality. PyPy and other implementations make different choices, so all of this is a CPython implementation detail.</p>
      <p><b>When to intern manually:</b> parsers, ETL jobs and caches with heavy repetition. Measure with <code>tracemalloc</code>; interning has a lookup cost and pins strings in the table, so do not intern unbounded unique data (user IDs, UUIDs).</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> "predict the output" puzzles about <code>is</code> are now trivial to look up, so interviewers care more about <b>why</b> (per-compilation constant merging, cache range, runtime construction) and whether you would ever write such code (you would not).</p>
      <p><b>Use AI as a partner:</b> <code>Scan this repository for identity comparisons against literals, ints or strings (is / is not) that should be ==, and explain each one.</code> Combine with a linter rule so it stays fixed.</p>
      <p><b>Where AI goes wrong:</b> stating the cache range as 0–255 or −128–127 (that is Java's <code>Integer</code> cache), claiming "all strings are interned", or suggesting <code>sys.intern</code> on unique IDs where it only adds overhead.</p>
      <p><b>What you must still own:</b> the identity-vs-equality distinction, the rule "only use <code>is</code> for singletons", and the ability to explain surprising results from first principles in an interview.</p>`,
    problems: [{
      title: 'Build Your Own Intern Pool',
      level: 'Easy', tags: ['interning', 'dict', 'memory'], companies: ['Bloomberg', 'Two Sigma'],
      statement: R`<p>Implement a class <code>InternPool</code> with <code>intern(s)</code> that returns a canonical object for each distinct string value (the first one seen), plus <code>stats()</code> returning <code>(calls, distinct)</code>. Use it to deduplicate a list of runtime-built strings and verify that equal values now share identity.</p>`,
      constraints: R`<p>Up to 10<sup>6</sup> strings. O(1) average per call. Must not use <code>sys.intern</code> (you are re-implementing the idea).</p>`,
      example: R`<p>Interning <code>["a1", "b2", "a1", "a1"]</code> (each built at runtime) gives ${H.c('g', 'stats() = (4, 2)')} and the three <code>"a1"</code> results satisfy <code>is</code>. Why: the dict maps each value to the first object stored.</p>`,
      brute: { why: R`<p>Keeping a list of canonical strings and scanning it with <code>==</code> for every call is O(D) per call (D distinct values), so O(N·D) overall. A dict keyed by the string itself does the lookup in O(1) average, which is exactly how CPython's interned table works.</p>`, code: R`class SlowPool:
    def __init__(self):
        self.canon = []
    def intern(self, s):
        for c in self.canon:          # linear scan: O(D) per call
            if c == s:
                return c
        self.canon.append(s)
        return s

p = SlowPool()
print(p.intern("".join(["a", "1"])) is p.intern("".join(["a", "1"])))
` },
      mcq: { q: 'What should <code>intern(s)</code> return when <code>s</code> was already seen?', options: ['The object stored the first time (canonical copy)', 'The new object s', 'A copy of s', 'hash(s)'], answer: 0, explain: 'The whole point is that all equal values map to one canonical object; returning the stored one lets callers drop their duplicate.' },
      hints: [R`<p>Hint 1: a dict can map a value to itself: <code>table.setdefault(s, s)</code> returns the existing key's value if present, otherwise stores and returns <code>s</code>.</p>`, R`<p>Hint 2: count calls in a counter; distinct = <code>len(table)</code>.</p>`, R`<p>Hint 3: build test strings with <code>"".join</code> or <code>str(i)</code> so they are separate runtime objects; compare <code>len({id(x) for x in data})</code> before and after.</p>`],
      solution: {
        approach: R`<p>A dict from value to canonical object. <code>setdefault</code> does the "get or insert" in one hash lookup. This is the same design as <code>sys.intern</code>, minus the immortality and interpreter-wide scope.</p>`,
        code: { lang: 'python', run: true, code: R`class InternPool:
    """Map every distinct string value to one canonical object."""

    def __init__(self):
        self._table = {}
        self._calls = 0

    def intern(self, s):
        self._calls += 1
        return self._table.setdefault(s, s)   # one hash lookup: get or insert

    def stats(self):
        return self._calls, len(self._table)

pool = InternPool()
raw = ["".join([c, str(n)]) for c, n in [("a", 1), ("b", 2), ("a", 1), ("a", 1)]]
print("distinct objects before:", len({id(x) for x in raw}))
canon = [pool.intern(x) for x in raw]
print("distinct objects after :", len({id(x) for x in canon}))
print("canon[0] is canon[2]   :", canon[0] is canon[2])
print("stats (calls, distinct):", pool.stats())
` },
        dry: { head: ['call', 's (new object)', 'in table?', 'returned', 'stats'], rows: [['1', '"a1" #1', 'no → store', '#1', '(1, 1)'], ['2', '"b2" #2', 'no → store', '#2', '(2, 2)'], ['3', '"a1" #3', H.c('g', 'yes'), '#1', '(3, 2)'], ['4', '"a1" #4', H.c('g', 'yes'), '#1', '(4, 2)']] },
        complexity: R`<p>O(1) average per call (one hash + possible equality check), O(D) memory for D distinct values. The duplicates can now be garbage collected.</p>`,
        followUps: ['Make the pool bounded (LRU) so it cannot grow forever.', 'Why can\'t you use a <code>WeakValueDictionary</code> for <code>str</code> values? (str does not support weak references.)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7: Descriptors & Attribute Lookup
     ====================================================================== */
  var DESC_SRC = [
    'class Temp:',
    '    unit = "C"                  # plain class attribute',
    '    def __init__(self, c):',
    '        self.c = c',
    '    @property',
    '    def kelvin(self):           # property = DATA descriptor',
    '        return self.c + 273.15',
    '    def show(self):             # function = NON-DATA descriptor',
    '        return f"{self.c}{self.unit}"',
    '    def __getattr__(self, name):  # last resort',
    '        return f"<no {name}>"',
    '',
    't = Temp(21)',
    't.__dict__.update(unit="F", kelvin=0, show="shadowed!")'
  ].join('\n');

  topics.push({
    title: 'Descriptors: How obj.attr Really Works',
    analogy: R`<p>Think of an office building. When you ask for something by name, the building checks in a fixed order: first the <b>security desk</b> (data descriptors, like <code>property</code>): if security manages that name, it <i>always</i> handles the request, even if you have your own copy. Next, your <b>personal locker</b> (the instance <code>__dict__</code>). Then the <b>shared notice board</b> of the company (class attributes and methods, which can personalise themselves for you). Finally <b>lost and found</b> (<code>__getattr__</code>). Descriptors are the "staff" who can intercept a name and run code instead of just handing over a value.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> A <b>descriptor</b> is any object, stored as a <b>class</b> attribute, whose class defines at least one of these methods:</p>
      ${H.table(['Method', 'Called on', 'Kind'], [
        ['<code>__get__(self, obj, objtype=None)</code>', 'reading <code>obj.attr</code> (obj is None when read from the class)', 'non-data if this is the only one'],
        ['<code>__set__(self, obj, value)</code>', '<code>obj.attr = value</code>', H.c('p', 'makes it a DATA descriptor')],
        ['<code>__delete__(self, obj)</code>', '<code>del obj.attr</code>', H.c('p', 'also DATA')],
        ['<code>__set_name__(self, owner, name)</code>', 'once, when the class is created', 'tells the descriptor its attribute name']
      ])}
      <p><b>The lookup order for <code>obj.name</code></b> (implemented in <code>object.__getattribute__</code>):</p>
      <ol>
        <li>Search <code>type(obj).__mro__</code> for <code>name</code> (cached per type). Call the result <code>attr</code>.</li>
        <li>If <code>attr</code> is a <b>data descriptor</b> → return <code>attr.__get__(obj, type(obj))</code>. It wins over the instance.</li>
        <li>Else if <code>name</code> is in <code>obj.__dict__</code> → return that value.</li>
        <li>Else if <code>attr</code> is a <b>non-data descriptor</b> → return <code>attr.__get__(obj, type(obj))</code>.</li>
        <li>Else if <code>attr</code> was found → return it as is (plain class attribute).</li>
        <li>Else raise <code>AttributeError</code>, which triggers <code>__getattr__</code> if the class defines it.</li>
      </ol>
      <p><b>Assignment</b> <code>obj.name = v</code> is simpler: if the type has a data descriptor for <code>name</code>, call its <code>__set__</code>; otherwise store into <code>obj.__dict__</code>.</p>
      <p><b>You already use descriptors every day:</b></p>
      ${H.table(['Feature', 'Descriptor type', 'What __get__ returns'], [
        ['plain methods (<code>def</code>)', 'function: non-data', 'a <b>bound method</b> remembering <code>self</code>'],
        ['<code>@property</code>', 'data (has <code>__set__</code>, which raises if there is no setter)', 'result of the getter'],
        ['<code>@classmethod</code> / <code>@staticmethod</code>', 'non-data', 'method bound to the class / the raw function'],
        ['<code>__slots__</code> entries', '<code>member_descriptor</code>: data', 'value stored at a fixed offset in the object'],
        ['<code>functools.cached_property</code>', 'non-data', 'computes once, stores in <code>obj.__dict__</code>, which then shadows it'],
        ['ORM fields (Django, SQLAlchemy), <code>dataclasses.field</code> defaults', 'custom', 'column values, validation']
      ])}`,
    clues: [
      '"What is the difference between a property and a method?" → property is a data descriptor; a function is a non-data descriptor producing bound methods',
      '"How does <code>self</code> get passed?" → <code>function.__get__(obj, cls)</code> returns a bound method',
      '"Why can I shadow a method on an instance but not a property?" → data descriptors beat the instance dict, non-data do not',
      '"Reusable validation for many attributes" → write a descriptor class with <code>__set_name__</code>',
      '"<code>__getattr__</code> vs <code>__getattribute__</code>" → fallback on failure vs intercept every access',
      '"How does <code>cached_property</code> work without a lock or setter?" → non-data descriptor writing into the instance dict'
    ],
    code: [{ lang: 'python', title: 'Precedence demo: data descriptor > instance dict > non-data (runnable)', run: true, code: R`class Temp:
    unit = "C"                       # plain class attribute
    def __init__(self, c):
        self.c = c
    @property
    def kelvin(self):                # data descriptor
        return self.c + 273.15
    def show(self):                  # non-data descriptor (function)
        return f"{self.c}{self.unit}"
    def __getattr__(self, name):     # only called when lookup FAILS
        return f"<no {name}>"

t = Temp(21)
t.__dict__.update(unit="F", kelvin=0, show="shadowed!")

print("t.kelvin ->", t.kelvin)       # property wins over t.__dict__['kelvin']
print("t.show   ->", t.show)         # instance dict wins over the function
print("t.unit   ->", t.unit)         # instance dict wins over class attribute
print("t.nope   ->", t.nope)         # falls through to __getattr__

f = Temp.__dict__["show"]            # the raw function stored in the class
bound = f.__get__(Temp(5), Temp)     # what t.show does under the hood
print(type(bound).__name__, bound())
` }],
    codeTitle: ['Lookup precedence'],
    viz: {
      title: 'Follow object.__getattribute__ for each attribute name',
      input: 'kelvin show unit c nope',
      inputLabel: 'Attribute names to look up on t (space separated, max 6)',
      gen: function (input) {
        var names = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!names.length) throw new Error('Enter attribute names like: kelvin show unit nope');
        if (names.length > 6) throw new Error('Use at most 6 names');
        names.forEach(function (n) { if (!/^[A-Za-z_]\w*$/.test(n)) throw new Error('"' + n + '" is not a valid attribute name'); });
        var cls = { unit: ['plain class attribute', '"C"'], kelvin: ['property (DATA descriptor)', 'getter → c + 273.15'], show: ['function (NON-DATA descriptor)', 'bound method'], __init__: ['function (NON-DATA descriptor)', 'bound method'], __getattr__: ['function (NON-DATA descriptor)', 'bound method'] };
        var inst = { c: '21', unit: '"F"', kelvin: '0', show: '"shadowed!"' };
        var nodes = [
          { id: 'S', label: 't.name', x: 8, y: 12, shape: 'box' }, { id: 'M', label: 'scan type(t).__mro__', x: 32, y: 12, shape: 'box' },
          { id: 'D', label: 'data descriptor?', x: 60, y: 12, shape: 'box' }, { id: 'I', label: 'in t.__dict__?', x: 88, y: 12, shape: 'box' },
          { id: 'N', label: 'non-data descriptor?', x: 84, y: 48, shape: 'box' }, { id: 'C', label: 'plain class attr?', x: 56, y: 48, shape: 'box' },
          { id: 'G', label: '__getattr__', x: 30, y: 48, shape: 'box' }, { id: 'E', label: 'AttributeError', x: 8, y: 48, shape: 'box' }
        ];
        var edges = [['S', 'M'], ['M', 'D'], ['D', 'I', 'no'], ['I', 'N', 'no'], ['N', 'C', 'no'], ['C', 'G', 'no'], ['G', 'E', 'if absent']];
        var frames = [];
        function mapParts(name) {
          var ih = {}, ch = {}; ih[name] = 'cur'; ch[name] = 'cur';
          return [
            { type: 'map', label: 't.__dict__ (instance)', entries: Object.keys(inst).map(function (k) { return [k, inst[k]]; }), hl: ih },
            { type: 'map', label: 'Temp.__dict__ (class; then object)', entries: Object.keys(cls).map(function (k) { return [k, cls[k][0]]; }), hl: ch }
          ];
        }
        frames.push({ narr: 'Setup: <code>Temp</code> defines a plain attribute, a property, a method and <code>__getattr__</code>. We then stuffed <code>t.__dict__</code> with <code>unit</code>, <code>kelvin</code> and <code>show</code> to see who wins.', parts: [{ type: 'code', label: 'The class', lang: 'python', code: DESC_SRC, hl: {} }].concat(mapParts('')) });
        names.forEach(function (name) {
          var path = ['S', 'M'], result, where, why;
          var c = cls[name], inI = Object.prototype.hasOwnProperty.call(inst, name);
          if (c && /DATA descriptor/.test(c[0]) && !/NON-DATA/.test(c[0])) { path.push('D'); where = 'D'; result = name === 'kelvin' ? '294.15' : c[1]; why = '<code>' + name + '</code> is a <b>property</b> found on the class. Properties define <code>__set__</code>, so they are <b>data descriptors</b> and are checked <b>before</b> the instance dict. <code>t.__dict__["kelvin"] = 0</code> is ignored → <b>294.15</b>.'; }
          else if (inI) { path.push('D', 'I'); where = 'I'; result = inst[name]; why = c ? 'The class has <code>' + name + '</code> (' + c[0] + '), but it is not a data descriptor, so the <b>instance dict wins</b>: → <b>' + esc(inst[name]) + '</b>.' + (name === 'show' ? ' Methods can be shadowed per instance!' : '') : 'Not on the class at all; found in the instance dict → <b>' + esc(inst[name]) + '</b>. This is the most common path.'; }
          else if (c && /NON-DATA/.test(c[0])) { path.push('D', 'I', 'N'); where = 'N'; result = '<bound method Temp.' + name + '>'; why = '<code>' + name + '</code> is a function on the class (non-data descriptor) and nothing shadows it, so Python calls <code>function.__get__(t, Temp)</code> and returns a <b>bound method</b> that remembers <code>self = t</code>.'; }
          else if (c) { path.push('D', 'I', 'N', 'C'); where = 'C'; result = c[1]; why = 'Plain class attribute, returned as is.'; }
          else { path.push('D', 'I', 'N', 'C', 'G'); where = 'G'; result = '"<no ' + name + '>"'; why = '<code>' + name + '</code> is nowhere: the normal lookup raises <code>AttributeError</code>, and because <code>Temp</code> defines <code>__getattr__</code>, Python calls it as a fallback → <b>' + esc(result) + '</b>. Without <code>__getattr__</code> you would get the AttributeError.'; }
          for (var k = 2; k <= path.length; k++) {
            var hl = {}, ehl = {};
            for (var j = 0; j < k; j++) hl[path[j]] = j === k - 1 ? (k === path.length ? 'ok' : 'cur') : 'done';
            for (var e = 1; e < k; e++) ehl[path[e - 1] + '-' + path[e]] = 'win';
            var tags = {}; if (k === path.length) tags[where] = '→ ' + result;
            var step = path[k - 1], txt = {
              M: 'Scan <code>Temp</code>, then <code>object</code>, for <code>' + name + '</code>: ' + (c ? 'found in <code>Temp</code> (' + c[0] + ').' : 'not found on the class.'),
              D: 'Is the class attribute a <b>data</b> descriptor (has <code>__set__</code>/<code>__delete__</code>)? ' + (where === 'D' ? 'Yes.' : 'No.'),
              I: 'Look in <code>t.__dict__</code>: ' + (inI ? 'found <code>' + esc(inst[name]) + '</code>.' : 'not there.'),
              N: 'Is the class attribute a non-data descriptor (only <code>__get__</code>)? ' + (where === 'N' ? 'Yes.' : 'No.'),
              C: 'Was a plain class attribute found? ' + (where === 'C' ? 'Yes.' : 'No.'),
              G: 'Lookup failed → <code>AttributeError</code> is raised internally → <code>__getattr__</code> runs.'
            }[step] || '';
            frames.push({ narr: '<code>t.' + name + '</code> · ' + txt + (k === path.length ? ' ' + why : ''), parts: [
              { type: 'graph', label: 'object.__getattribute__ decision path', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags }
            ].concat(mapParts(name)) });
          }
        });
        return frames;
      }
    },
    examples: [
      { title: 'Methods are just functions + __get__', html: R`<p><code>Temp.show</code> (from the class) is a plain function: <code>__get__(None, Temp)</code> returns the function itself. <code>t.show</code> calls <code>__get__(t, Temp)</code> and gets a <b>bound method</b> holding <code>__self__ = t</code> and <code>__func__ = show</code>. Calling it inserts <code>self</code> as the first argument. That is the whole secret of <code>self</code>.</p>
        ${H.table(['Expression', 'Result'], [['<code>Temp.show</code>', 'function'], ['<code>t.show</code>', 'bound method (<code>t.show.__self__ is t</code>)'], ['<code>t.show()</code>', '<code>Temp.show(t)</code>']])}`, code: { lang: 'python', run: true, code: R`class Greeter:
    def hi(self, name):
        return f"hi {name} from {type(self).__name__}"

g = Greeter()
raw = Greeter.__dict__["hi"]
print(raw is Greeter.hi)                      # class access returns the function
m = raw.__get__(g, Greeter)                   # what g.hi does
print(type(m).__name__, m.__self__ is g, m.__func__ is raw)
print(m("Ana"), "==", Greeter.hi(g, "Ana"))
` } },
      { title: 'A reusable validating descriptor with __set_name__', html: R`<p>Instead of writing ten nearly identical properties, write one descriptor class. <code>__set_name__</code> (3.6+) tells each instance the attribute name it was assigned to, so error messages and storage keys are automatic. Because it defines <code>__set__</code> it is a data descriptor and cannot be bypassed by the instance dict.</p>`, code: { lang: 'python', run: true, code: R`class Positive:
    def __set_name__(self, owner, name):
        self.public = name
        self.private = "_" + name            # where the value really lives

    def __get__(self, obj, objtype=None):
        if obj is None:                       # accessed on the class
            return self
        return getattr(obj, self.private)

    def __set__(self, obj, value):
        if not isinstance(value, (int, float)) or value <= 0:
            raise ValueError(f"{self.public} must be a positive number, got {value!r}")
        setattr(obj, self.private, value)

class Order:
    qty = Positive()
    price = Positive()
    def __init__(self, qty, price):
        self.qty, self.price = qty, price     # goes through __set__

o = Order(3, 9.5)
print(o.qty * o.price, vars(o))
try:
    o.qty = -1
except ValueError as e:
    print("ValueError:", e)
` } },
      { title: 'cached_property: a non-data descriptor trick', html: R`<p><code>functools.cached_property</code> has only <code>__get__</code>. The first access computes the value and stores it in <code>obj.__dict__</code> under the same name. From then on step 3 of the lookup (instance dict) finds it <b>before</b> step 4 (non-data descriptor), so the function never runs again. Delete the key to force a recompute. It does not work with <code>__slots__</code> classes that lack <code>__dict__</code>.</p>
        ${H.table(['access', 'found by', 'compute?'], [['1st', 'non-data descriptor', H.c('y', 'yes')], ['2nd', 'instance dict', H.c('g', 'no')]])}`, code: { lang: 'python', run: true, code: R`from functools import cached_property

class Report:
    @cached_property
    def total(self):
        print("  computing total ...")
        return sum(range(1_000_000))

r = Report()
print(r.total)
print(r.total)                 # served from r.__dict__, no recompute
print("cached in __dict__:", "total" in vars(r))
del r.total                    # invalidate
print(r.total)
` } }
    ],
    deepDive: R`<p>🟣 <b>Speed: the type attribute cache and LOAD_ATTR specialization.</b> Step 1 (MRO scan) would be slow if done every time, so CPython keeps a global method cache keyed by (type version tag, name). Each type has a version tag that changes whenever the class or a base is modified. The 3.11+ specializing interpreter goes further: <code>LOAD_ATTR_INSTANCE_VALUE</code> reads an instance attribute straight from the inline values array after checking the type version, <code>LOAD_ATTR_PROPERTY</code> calls a property's getter directly, and <code>LOAD_ATTR_METHOD_WITH_VALUES</code> pushes the function and <code>self</code> without creating a bound-method object at all (the old <code>LOAD_METHOD</code> optimization).</p>
      <p><b>Class-level lookup</b> (<code>Cls.name</code>) runs <code>type.__getattribute__</code>: data descriptors on the <b>metaclass</b> first, then the class's own MRO (calling <code>__get__(None, Cls)</code> on descriptors found there), then non-data descriptors / attributes on the metaclass. That is how <code>Cls.__name__</code> and <code>Cls.__mro__</code> (data descriptors defined on <code>type</code>) work.</p>
      <p><b><code>__getattribute__</code> vs <code>__getattr__</code>.</b> Overriding <code>__getattribute__</code> intercepts every access (including <code>self.x</code> inside your own methods) and disables most specializations; call <code>object.__getattribute__(self, name)</code> inside it to avoid infinite recursion. <code>__getattr__</code> is only consulted after normal lookup raises <code>AttributeError</code>; beware that an <code>AttributeError</code> raised accidentally inside a property getter also falls through to <code>__getattr__</code>, hiding the real bug.</p>
      <p><b>Special method lookup bypasses all of this.</b> Implicit calls like <code>len(x)</code>, <code>x + y</code> and <code>with x:</code> look the dunder up on the type directly (slots), skipping <code>__getattribute__</code> and the instance dict. Also: <code>super()</code> returns a proxy whose <code>__getattribute__</code> continues the MRO search after the current class; and since 3.13 <code>classmethod</code> no longer wraps other descriptors (the 3.9-era "classmethod property" chaining was removed).</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> assistants write descriptors, properties and validation layers quickly, and many libraries (pydantic, attrs, SQLAlchemy) already package these patterns. Your value is choosing the right tool and debugging when lookup does something surprising.</p>
      <p><b>Use AI as a partner:</b> <code>Explain, step by step using the descriptor lookup order, why obj.config returns the class default instead of the value I set in __init__.</code> (Typical answer: a data descriptor without storage per instance, or a typo storing to a different name.)</p>
      <p><b>Where AI goes wrong:</b> storing per-instance values on the descriptor itself (<code>self.value = value</code>), which shares one value across <b>all</b> instances; forgetting the <code>obj is None</code> case in <code>__get__</code>; confusing data and non-data precedence; or recommending <code>__getattribute__</code> overrides that silently kill performance.</p>
      <p><b>What you must still own:</b> the 6-step lookup order from memory, the data vs non-data rule, and the fact that methods, properties, slots and classmethods are all descriptors. That one model answers a whole family of interview questions.</p>`,
    problems: [{
      title: 'Typed Attribute Descriptor',
      level: 'Medium', tags: ['descriptors', '__set_name__', 'validation'], companies: ['Stripe', 'Robinhood', 'Palantir'],
      statement: R`<p>Write a descriptor <code>Typed(kind, default=None)</code> that enforces <code>isinstance(value, kind)</code> on assignment, returns <code>default</code> if the attribute was never set, stores values <b>per instance</b>, and when accessed on the class returns the descriptor itself. Use it to build a <code>User</code> class with <code>name: str</code> and <code>age: int</code>.</p>`,
      constraints: R`<p>Must work for many instances simultaneously, must not leak memory (no global dict keyed by instance), must produce a helpful error message naming the attribute.</p>`,
      example: R`<p><code>u = User("ana", 30); u.age = "31"</code> → ${H.c('r', 'TypeError: age must be int, got str')}. <code>User.age</code> → the <code>Typed</code> object. Two users keep independent ages.</p>`,
      brute: { why: R`<p>The tempting version stores the value on the descriptor (<code>self.value = value</code>). Since the descriptor is a single class attribute shared by every instance, all users end up with the <b>same</b> age. Storing in a dict keyed by instance fixes sharing but leaks every instance forever.</p>`, code: R`class TypedBroken:
    def __init__(self, kind):
        self.kind = kind
        self.value = None
    def __get__(self, obj, objtype=None):
        return self.value                     # shared by ALL instances!
    def __set__(self, obj, value):
        if not isinstance(value, self.kind):
            raise TypeError("bad type")
        self.value = value

class P:
    age = TypedBroken(int)

a, b = P(), P()
a.age = 1
b.age = 2
print(a.age, b.age)                           # 2 2  -> bug
` },
      mcq: { q: 'Where should a data descriptor store each instance\'s value?', options: ['In the instance\'s __dict__ under a private name', 'On the descriptor object itself', 'In a module-level dict keyed by id(obj)', 'In the class __dict__'], answer: 0, explain: 'The instance dict is per object and dies with it. The descriptor is shared by all instances, an id-keyed dict leaks and can collide after ids are reused, and the class dict is shared too.' },
      hints: [R`<p>Hint 1: use <code>__set_name__(self, owner, name)</code> to learn the attribute name and derive a private storage key such as <code>"_typed_age"</code>.</p>`, R`<p>Hint 2: in <code>__get__</code>, return <code>self</code> when <code>obj is None</code>; otherwise <code>obj.__dict__.get(key, default)</code>. In <code>__set__</code>, validate then write <code>obj.__dict__[key] = value</code>.</p>`, R`<p>Hint 3: because <code>Typed</code> has <code>__set__</code>, it is a data descriptor, so even if the instance dict had the public name the descriptor still wins. Test: two instances, wrong type, class access.</p>`],
      solution: {
        approach: R`<p>A data descriptor that learns its name via <code>__set_name__</code>, validates in <code>__set__</code>, and stores each value in the instance's own <code>__dict__</code> under a private key. Class access returns the descriptor for introspection.</p>`,
        code: { lang: 'python', run: true, code: R`class Typed:
    def __init__(self, kind, default=None):
        self.kind = kind
        self.default = default

    def __set_name__(self, owner, name):
        self.name = name
        self.key = "_typed_" + name           # per-instance storage key

    def __get__(self, obj, objtype=None):
        if obj is None:                         # User.age -> the descriptor
            return self
        return obj.__dict__.get(self.key, self.default)

    def __set__(self, obj, value):
        if not isinstance(value, self.kind):
            raise TypeError(f"{self.name} must be {self.kind.__name__}, "
                            f"got {type(value).__name__}")
        obj.__dict__[self.key] = value

class User:
    name = Typed(str, default="anonymous")
    age = Typed(int, default=0)
    def __init__(self, name, age):
        self.name, self.age = name, age

a, b = User("ana", 30), User("ben", 41)
a.age += 1
print(a.name, a.age, "|", b.name, b.age)
print(type(User.age).__name__, User.age.name)
try:
    a.age = "31"
except TypeError as e:
    print("TypeError:", e)
` },
        dry: { head: ['statement', 'descriptor call', 'a.__dict__ after'], rows: [['class body', '__set_name__(User, "age")', '—'], ['User("ana", 30)', '__set__(a, 30)', "{'_typed_name': 'ana', '_typed_age': 30}"], ['a.age += 1', '__get__ → 30, __set__(a, 31)', "{… '_typed_age': 31}"], ['User.age', '__get__(None, User) → descriptor', 'unchanged'], ['a.age = "31"', '__set__ raises', H.c('r', 'TypeError, unchanged')]] },
        complexity: R`<p>O(1) per get/set (one dict operation plus <code>isinstance</code>). Memory: one entry per attribute per instance, freed with the instance.</p>`,
        followUps: ['Support <code>__slots__</code> classes (hint: store via a slot such as <code>_typed_age</code> using <code>setattr</code>).', 'Read the type from annotations instead: <code>age: int = Typed()</code> using <code>owner.__annotations__</code> in <code>__set_name__</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8: Metaclasses & Class Creation
     ====================================================================== */
  var META_SRC = [
    'class Meta(type):',                                   // 1
    '    @classmethod',                                    // 2
    '    def __prepare__(mcs, name, bases, **kw):',         // 3
    '        return {}                    # namespace',      // 4
    '    def __new__(mcs, name, bases, ns, **kw):',        // 5
    '        cls = super().__new__(mcs, name, bases, ns)', // 6
    '        return cls',                                  // 7
    '    def __init__(cls, name, bases, ns, **kw):',       // 8
    '        super().__init__(name, bases, ns)',           // 9
    '    def __call__(cls, *args, **kw):',                 // 10
    '        return super().__call__(*args, **kw)',        // 11
    '',                                                    // 12
    'class Field:',                                        // 13
    '    def __set_name__(self, owner, name): ...',        // 14
    '',                                                    // 15
    'class Base:',                                         // 16
    '    def __init_subclass__(cls, **kw): ...',           // 17
    '',                                                    // 18
    'class Plugin(Base, metaclass=Meta):',                 // 19
    '    x = Field()',                                     // 20
    '    def __init__(self): ...',                         // 21
    '',                                                    // 22
    'p = Plugin()'                                         // 23
  ].join('\n');

  topics.push({
    title: 'Metaclasses: The Class of a Class',
    analogy: R`<p>Objects are <b>cookies</b>, classes are <b>cookie cutters</b>. But who makes the cookie cutters? A <b>cutter factory</b>: that is a metaclass. Python's standard factory is called <code>type</code>, and it makes every ordinary class. You can build a custom factory that stamps a serial number on every cutter it makes, refuses to make cutters without a handle, or registers each new cutter in a catalogue. Most of the time, though, a simple sticker added after the cutter is made (a class decorator) or a rule written on the parent cutter (<code>__init_subclass__</code>) does the job with far less machinery.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Classes are objects too, so they have a type. The type of a class is its <b>metaclass</b>. By default it is <code>type</code>: <code>type(int) is type</code>, <code>type(MyClass) is type</code>, and even <code>type(type) is type</code>. Calling <code>type(name, bases, namespace)</code> builds a class at runtime, exactly what the <code>class</code> statement does for you.</p>
      <p><b>What really happens on a <code>class</code> statement</b> (verified order, 3.6+):</p>
      ${H.table(['#', 'Step', 'Hook you can customise'], [
        ['1', 'evaluate the base classes (and <code>__mro_entries__</code> for things like <code>Generic[T]</code>)', '—'],
        ['2', 'pick the metaclass: the explicit <code>metaclass=</code> or the most derived metaclass of the bases', 'metaclass conflict → <code>TypeError</code>'],
        ['3', 'create the namespace', '<code>Meta.__prepare__</code>'],
        ['4', 'run the class body inside that namespace (defs and assignments fill it)', 'the body itself'],
        ['5', 'call <code>Meta(name, bases, ns, **kwargs)</code> → <code>Meta.__new__</code> → <code>type.__new__</code> builds the class and its MRO', '<code>Meta.__new__</code>'],
        ['6', 'inside <code>type.__new__</code>: call <code>__set_name__</code> on every attribute that has it', 'descriptors'],
        ['7', 'inside <code>type.__new__</code>: call the parent\'s <code>__init_subclass__</code>', '<code>__init_subclass__</code>'],
        ['8', '<code>Meta.__init__</code>, then class decorators, then bind the name', 'decorators']
      ])}
      <p><b>Creating an instance</b> is also a metaclass job: <code>Plugin()</code> calls <code>type(Plugin).__call__</code>, which calls <code>Plugin.__new__</code> (allocate) and then, if the result is an instance of <code>Plugin</code>, <code>Plugin.__init__</code> (initialise). Overriding <code>Meta.__call__</code> lets you control instantiation (singletons, caching, instance counting).</p>
      <p><b>The rule of thumb</b> (Tim Peters): "Metaclasses are deeper magic than 99% of users should ever worry about." Prefer, in this order:</p>
      ${H.table(['Need', 'Simplest tool'], [
        ['run code for every subclass (registry, validation)', '<code>__init_subclass__</code>'],
        ['attribute knows its own name', 'descriptor with <code>__set_name__</code>'],
        ['modify one class after creation', 'class decorator'],
        ['customise the namespace, <code>isinstance</code> behaviour, or class-level operators', H.c('p', 'metaclass')]
      ])}
      <p>Real metaclasses you use: <code>abc.ABCMeta</code> (abstract methods, <code>register</code>), <code>enum.EnumType</code> (makes <code>Color.RED</code> singletons and iteration over the class), Django's <code>ModelBase</code>, pydantic's model metaclass.</p>`,
    clues: [
      '"What is a metaclass?" → the type of a class; <code>type</code> by default',
      '"What does <code>type(name, bases, dict)</code> do?" → creates a class dynamically',
      '"Register every subclass automatically" → <code>__init_subclass__</code> (metaclass only if you need more)',
      '"Singleton pattern in Python" → module-level instance, or <code>Meta.__call__</code> caching',
      '"TypeError: metaclass conflict" → bases with unrelated metaclasses; create a combined metaclass',
      '"How do Enum / ABC / ORMs work?" → metaclasses customise class creation and class-level behaviour'
    ],
    code: [{ lang: 'python', title: 'Trace the full class-creation sequence (runnable)', run: true, code: R`log = []

class Meta(type):
    @classmethod
    def __prepare__(mcs, name, bases, **kw):
        log.append(f"__prepare__({name})")
        return {}
    def __new__(mcs, name, bases, ns, **kw):
        log.append(f"Meta.__new__ ns keys={[k for k in ns if not k.startswith('__')]}")
        cls = super().__new__(mcs, name, bases, ns)
        log.append("type.__new__ finished")
        return cls
    def __init__(cls, name, bases, ns, **kw):
        log.append("Meta.__init__")
        super().__init__(name, bases, ns)
    def __call__(cls, *args, **kw):
        log.append("Meta.__call__ (instance creation)")
        return super().__call__(*args, **kw)

class Field:
    def __set_name__(self, owner, name):
        log.append(f"__set_name__({owner.__name__}, {name!r})")

class Base:
    def __init_subclass__(cls, **kw):
        log.append(f"__init_subclass__({cls.__name__})")
        super().__init_subclass__(**kw)

class Plugin(Base, metaclass=Meta):
    log.append("class body runs")
    x = Field()
    def __init__(self):
        log.append("Plugin.__init__")

p = Plugin()
for i, line in enumerate(log, 1):
    print(i, line)
print(type(p).__name__, "->", type(Plugin).__name__, "->", type(Meta).__name__, "->", type(type).__name__)
` }],
    codeTitle: ['Class creation trace'],
    viz: {
      title: 'class Plugin(Base, metaclass=Meta): every hook in order',
      gen: function () {
        var F = [];
        function fr(narr, ln, calls, ns, extra) {
          var parts = [{ type: 'code', label: 'Program', lang: 'python', code: META_SRC, hl: lines(ln, 'cur') },
            { type: 'stack', label: 'Call stack', items: calls, hl: calls.length ? (function () { var h = {}; h[calls.length - 1] = 'cur'; return h; })() : {} }];
          if (ns) parts.push({ type: 'map', label: 'class namespace (ns)', entries: ns, hl: extra && extra.nsHl || {} });
          if (extra && extra.graph) parts.push(extra.graph);
          F.push({ narr: narr, parts: parts });
        }
        fr('Python reaches <code>class Plugin(Base, metaclass=Meta):</code>. First it evaluates the bases (<code>Base</code>) and the keyword <code>metaclass=Meta</code>. The metaclass must be a subclass of the metaclass of every base (<code>type(Base)</code> is <code>type</code>; <code>Meta</code> derives from <code>type</code>, so OK).', [19], ['<module>'], null);
        fr('<b>Step 3 · <code>Meta.__prepare__</code></b> returns the mapping that will hold the class body\'s names. Usually a plain dict; you could return a custom mapping (e.g. one that forbids duplicate names).', [3, 4], ['<module>', 'Meta.__prepare__'], []);
        fr('<b>Step 4 · the class body runs</b> like a function body, but its "locals" are the namespace. Python adds <code>__module__</code> and <code>__qualname__</code>, then executes <code>x = Field()</code> and <code>def __init__</code>.', [20, 21], ['<module>', 'class body of Plugin'], [['__module__', "'__main__'"], ['__qualname__', "'Plugin'"], ['x', 'Field object'], ['__init__', 'function']], { nsHl: { x: 'ok', __init__: 'ok' } });
        fr('<b>Step 5 · <code>Meta("Plugin", (Base,), ns)</code></b> is called, which runs <code>Meta.__new__</code>. At this point the class does not exist yet: you only have the name, bases and namespace, so this is where you can add, rename or reject attributes.', [5], ['<module>', 'Meta.__new__'], [['__module__', "'__main__'"], ['__qualname__', "'Plugin'"], ['x', 'Field object'], ['__init__', 'function']]);
        fr('<code>super().__new__</code> → <b><code>type.__new__</code></b> allocates the class object, copies the namespace into <code>Plugin.__dict__</code> and computes the MRO <code>(Plugin, Base, object)</code>.', [6], ['<module>', 'Meta.__new__', 'type.__new__'], null);
        fr('<b>Step 6 · still inside <code>type.__new__</code>:</b> for each attribute that has <code>__set_name__</code>, it calls <code>Field.__set_name__(x_obj, Plugin, "x")</code>. The descriptor learns its owner and name.', [14], ['<module>', 'Meta.__new__', 'type.__new__', 'Field.__set_name__'], null);
        fr('<b>Step 7 · still inside <code>type.__new__</code>:</b> it calls <code>super(Plugin).__init_subclass__()</code>, i.e. <code>Base.__init_subclass__(Plugin)</code>. Parents can validate or register children here without any metaclass.', [17], ['<module>', 'Meta.__new__', 'type.__new__', 'Base.__init_subclass__'], null);
        fr('Back in <code>Meta.__new__</code>, which returns the finished class. Then <b>Step 8 · <code>Meta.__init__</code></b> runs on the already-created class (useful for post-processing).', [7, 8, 9], ['<module>', 'Meta.__init__'], null);
        fr('Class decorators (none here) would run now, and finally the name <code>Plugin</code> is bound in the module namespace. Class creation is done.', [19], ['<module>'], null);
        fr('<code>p = Plugin()</code>: calling a class means calling its <b>type</b>, so <code>Meta.__call__</code> runs. That is the hook for singletons, caches or instance counting.', [23, 10, 11], ['<module>', 'Meta.__call__'], null);
        fr('<code>type.__call__</code> calls <code>Plugin.__new__</code> (inherited from <code>object</code>: allocate an empty instance) and then, because the result is a <code>Plugin</code>, <code>Plugin.__init__(p)</code>.', [21], ['<module>', 'Meta.__call__', 'type.__call__', 'Plugin.__init__'], null);
        fr('Done. The "type of" chain: <code>p</code> → <code>Plugin</code> → <code>Meta</code> → <code>type</code> → <code>type</code> (type is its own type). The "inherits from" chain is separate: <code>Plugin</code> → <code>Base</code> → <code>object</code>, and <code>Meta</code> → <code>type</code> → <code>object</code>.', [23], ['<module>'], null, { graph: { type: 'graph', label: 'solid arrows = "is an instance of" / "inherits from"', directed: true, height: 56, nodes: [
          { id: 'p', label: 'p', x: 8, y: 12, shape: 'box' }, { id: 'P', label: 'Plugin', x: 32, y: 12, shape: 'box' }, { id: 'M', label: 'Meta', x: 58, y: 12, shape: 'box' }, { id: 'T', label: 'type', x: 86, y: 12, shape: 'box' },
          { id: 'B', label: 'Base', x: 32, y: 44, shape: 'box' }, { id: 'O', label: 'object', x: 70, y: 44, shape: 'box' }],
          edges: [['p', 'P', 'instance of'], ['P', 'M', 'instance of'], ['M', 'T', 'instance of'], ['T', 'T', 'instance of'], ['P', 'B', 'inherits'], ['B', 'O', 'inherits'], ['T', 'O', 'inherits']], hl: { M: 'sel', T: 'ok' }, ehl: { 'P-M': 'sel', 'M-T': 'sel' } } });
        return F;
      }
    },
    examples: [
      { title: 'Creating a class with type() directly', html: R`<p>The <code>class</code> statement is syntax sugar. <code>type("Point", (), ns)</code> builds the same class at runtime, which is how ORMs, serializers and test frameworks generate classes from schemas.</p>
        ${H.table(['Argument', 'Meaning'], [['<code>"Point"</code>', '<code>__name__</code>'], ['<code>(Base,)</code>', 'bases tuple'], ['<code>{"x": 0, "norm": fn}</code>', 'namespace → <code>__dict__</code>']])}`, code: { lang: 'python', run: true, code: R`def norm(self):
    return (self.x ** 2 + self.y ** 2) ** 0.5

Point = type("Point", (), {"x": 0, "y": 0, "norm": norm,
                           "__repr__": lambda self: f"Point({self.x}, {self.y})"})
p = Point()
p.x, p.y = 3, 4
print(p, p.norm(), type(Point).__name__, Point.__mro__)
` } },
      { title: 'Singleton via Meta.__call__', html: R`<p>Because instantiation goes through <code>type(cls).__call__</code>, a metaclass can return a cached instance instead of creating a new one. (In Python, a module-level instance is usually the simpler singleton; use this only when a class API is required.) Note that <code>__init__</code> also runs only once, because we skip <code>super().__call__</code> on later calls.</p>`, code: { lang: 'python', run: true, code: R`class SingletonMeta(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Config(metaclass=SingletonMeta):
    def __init__(self, env="prod"):
        print("  Config.__init__ runs with", env)
        self.env = env

a = Config("dev")
b = Config("test")            # returns the cached instance, no __init__
print(a is b, b.env)
` } },
      { title: 'Registry without a metaclass: __init_subclass__', html: R`<p>The most common historical reason for a metaclass, "register every subclass", is now a 5-line <code>__init_subclass__</code>. It even accepts class keyword arguments: <code>class Csv(Exporter, ext="csv")</code>.</p>
        ${H.kv([['csv', 'Csv'], ['json', 'Json']], { label: 'Exporter.registry' })}`, code: { lang: 'python', run: true, code: R`class Exporter:
    registry = {}
    def __init_subclass__(cls, *, ext, **kw):
        super().__init_subclass__(**kw)
        if ext in Exporter.registry:
            raise TypeError(f"duplicate exporter for .{ext}")
        Exporter.registry[ext] = cls

class Csv(Exporter, ext="csv"):
    pass

class Json(Exporter, ext="json"):
    pass

print({k: v.__name__ for k, v in Exporter.registry.items()})
try:
    class Csv2(Exporter, ext="csv"):
        pass
except TypeError as e:
    print("TypeError:", e)
` } },
      { title: 'Metaclass conflict', html: R`<p>A class's metaclass must be a (non-strict) subclass of the metaclasses of all its bases. Mixing an <code>ABC</code> (metaclass <code>ABCMeta</code>) with a class using an unrelated custom metaclass raises <code>TypeError: metaclass conflict</code>. The fix is a combined metaclass: <code>class Both(ABCMeta, MyMeta): pass</code>. This is one more reason libraries avoid metaclasses: they do not compose well.</p>`, code: { lang: 'python', run: true, code: R`from abc import ABC, ABCMeta

class MyMeta(type):
    pass

class Mine(metaclass=MyMeta):
    pass

try:
    class Broken(ABC, Mine):
        pass
except TypeError as e:
    print("TypeError:", e)

class BothMeta(ABCMeta, MyMeta):
    pass

class Fixed(ABC, Mine, metaclass=BothMeta):
    pass

print(type(Fixed).__name__, [c.__name__ for c in type(Fixed).__mro__])
` } }
    ],
    deepDive: R`<p>🟣 <b><code>type.__call__</code> details.</b> It calls <code>cls.__new__(cls, *args, **kw)</code>; if the result is an instance of <code>cls</code> it calls <code>type(result).__init__(result, *args, **kw)</code>, otherwise <code>__init__</code> is skipped. That is why <code>__new__</code> is the hook for immutable types (<code>class Celsius(float)</code> must set its value in <code>__new__</code>) and for returning cached instances.</p>
      <p><b>Metaclass methods vs class methods.</b> A method defined on the metaclass is visible on the <b>class</b> (<code>Plugin.meta_method()</code>) but <b>not</b> on instances (<code>p.meta_method</code> → <code>AttributeError</code>), because instance lookup searches <code>type(p).__mro__</code>, not the metaclass. This is how <code>Enum</code> classes support <code>len(Color)</code> and iteration (<code>EnumType.__len__</code>, <code>__iter__</code>) while members do not, and how <code>ABCMeta.__instancecheck__</code> customises <code>isinstance</code>.</p>
      <p><b>Namespace tricks with <code>__prepare__</code>.</b> Since 3.6 the default dict preserves definition order, so the old "OrderedDict namespace" reason is gone; <code>__prepare__</code> is still used for DSLs, e.g. <code>Enum</code>'s <code>_EnumDict</code> detects duplicate member names and handles <code>auto()</code>.</p>
      <p><b>New class attributes.</b> 3.13 adds <code>__firstlineno__</code> and <code>__static_attributes__</code> (names assigned via <code>self.x</code> in methods) to the namespace. 3.14 implements PEP 649/749: annotations are no longer evaluated eagerly; the class gets an <code>__annotate__</code> function and <code>__annotations__</code> is computed on first access, which matters for metaclasses and decorators that read annotations during class creation (use <code>annotationlib.get_annotations</code>).</p>
      <p><b>Cost and compatibility.</b> Metaclasses run once per class (cheap), but they affect every subclass forever, conflict with other libraries' metaclasses, and confuse type checkers. <code>typing</code> generics use <code>__class_getitem__</code> (PEP 560) precisely to avoid needing a metaclass for <code>List[int]</code>-style subscription.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> ask an assistant for a "plugin system" or "singleton" and it often reaches for a metaclass because older blog posts did. In 2026 the idiomatic answer is usually <code>__init_subclass__</code>, a decorator, a dataclass or a module-level object. Push back and ask for the simplest mechanism.</p>
      <p><b>Use AI as a partner:</b> <code>Here is our legacy metaclass. Rewrite it using __init_subclass__ and __set_name__ if possible, keep behaviour identical, and list any behaviour that truly requires a metaclass.</code> Then verify with tests that cover subclass-of-subclass cases.</p>
      <p><b>Where AI goes wrong:</b> wrong hook order (claiming <code>__init_subclass__</code> runs after <code>Meta.__init__</code>; it runs inside <code>type.__new__</code>), forgetting to forward <code>**kwargs</code> to <code>super().__init_subclass__</code>, or producing metaclass conflicts when mixing with ABCs.</p>
      <p><b>What you must still own:</b> the class-creation sequence, the fact that instantiation is <code>type(cls).__call__</code>, and the engineering judgement to avoid metaclasses unless they buy something a simpler tool cannot.</p>`,
    problems: [{
      title: 'Enforce an Interface at Class-Creation Time',
      level: 'Hard', tags: ['metaclass', '__init_subclass__', 'validation'], companies: ['Google', 'Atlassian', 'Shopify'],
      statement: R`<p>Write a base class <code>Plugin</code> such that any subclass declaring <code>required = ("run", "name")</code> style requirements is checked <b>when the subclass is defined</b>: each name in the nearest <code>required</code> tuple must be defined somewhere in the subclass's MRO (other than on <code>Plugin</code> itself) and, if it is a method, be callable. A violation raises <code>TypeError</code> listing all missing names. Also keep a registry of valid concrete plugins by class name.</p>`,
      constraints: R`<p>Must fail at definition time (not instantiation). Must support multi-level inheritance: an intermediate abstract class may mark itself with <code>abstract=True</code> to skip checks. No third-party libraries.</p>`,
      example: R`<p><code>class Bad(Plugin): name = "x"</code> → ${H.c('r', "TypeError: Bad is missing: run")}. <code>class Good(Plugin): name = "g"; def run(self): ...</code> → registered: ${H.c('g', "{'Good': Good}")}.</p>`,
      brute: { why: R`<p>Checking in <code>__init__</code> (or each time you call the plugin) finds the problem late, only when someone instantiates the class, possibly in production. A metaclass or <code>__init_subclass__</code> moves the error to import time, where tests and CI catch it immediately.</p>`, code: R`class PluginLate:
    required = ("run", "name")
    def __init__(self):
        missing = [r for r in self.required if not hasattr(self, r)]
        if missing:                           # discovered only at instantiation
            raise TypeError(f"missing {missing}")

class Bad(PluginLate):
    name = "bad"                              # defining it does NOT fail

try:
    Bad()
except TypeError as e:
    print("found late:", e)
` },
      mcq: { q: 'Which hook runs for every new subclass, at definition time, without writing a metaclass?', options: ['<code>__init_subclass__</code>', '<code>__init__</code>', '<code>__new__</code> of the subclass', '<code>__class_getitem__</code>'], answer: 0, explain: '<code>type.__new__</code> calls the parent\'s <code>__init_subclass__</code> right after the class object is created. <code>__init__</code>/<code>__new__</code> run per instance; <code>__class_getitem__</code> handles <code>Cls[...]</code>.' },
      hints: [R`<p>Hint 1: in <code>__init_subclass__(cls, abstract=False, **kw)</code>, <code>cls</code> is the brand-new subclass. Return early if <code>abstract</code>.</p>`, R`<p>Hint 2: for each required name, walk <code>cls.__mro__</code> excluding <code>Plugin</code> and <code>object</code>; the name is satisfied if it appears in some class's <code>__dict__</code>. Collect all missing names before raising.</p>`, R`<p>Hint 3: names that are methods on <code>Plugin</code> as placeholders should not count, which is why you skip <code>Plugin</code> in the MRO walk. Register with <code>Plugin.registry[cls.__name__] = cls</code>. Show the metaclass version as an alternative.</p>`],
      solution: {
        approach: R`<p>Use <code>__init_subclass__</code> so the check runs inside <code>type.__new__</code> for every subclass, at import time. Walk the MRO manually so placeholders on the base class do not count. A metaclass version (same logic in <code>Meta.__init__</code>) is shown as the alternative; it is needed only if you also want to customise the namespace or class-level operators.</p>`,
        code: { lang: 'python', run: true, code: R`class Plugin:
    required = ("run", "name")
    registry = {}

    def __init_subclass__(cls, abstract=False, **kw):
        super().__init_subclass__(**kw)
        if abstract:
            return
        missing = []
        for attr in cls.required:
            owners = [k for k in cls.__mro__ if k not in (Plugin, object)]
            if not any(attr in vars(k) for k in owners):
                missing.append(attr)
        if missing:
            raise TypeError(f"{cls.__name__} is missing: {', '.join(missing)}")
        Plugin.registry[cls.__name__] = cls

class Exporter(Plugin, abstract=True):       # intermediate, skipped
    required = ("run", "name", "ext")
    def run(self):
        return f"exporting .{self.ext}"

class Csv(Exporter):
    name, ext = "csv", "csv"

try:
    class Broken(Exporter):
        name = "broken"                      # forgot ext
except TypeError as e:
    print("TypeError:", e)

print(sorted(Plugin.registry), Csv().run())
` },
        alt: [{ lang: 'python', code: R`class RequireMeta(type):
    def __init__(cls, name, bases, ns, abstract=False, **kw):
        super().__init__(name, bases, ns, **kw)
        if not bases or abstract:            # the root class itself, or abstract
            return
        missing = [a for a in getattr(cls, "required", ())
                   if not any(a in vars(k) for k in cls.__mro__[:-2])]
        if missing:
            raise TypeError(f"{name} is missing: {', '.join(missing)}")

    def __new__(mcs, name, bases, ns, abstract=False, **kw):
        return super().__new__(mcs, name, bases, ns, **kw)

class Base(metaclass=RequireMeta):
    required = ("run",)

class Ok(Base):
    def run(self):
        return "ok"

print(Ok().run())
` }],
        dry: { head: ['class statement', 'abstract?', 'required', 'found in MRO (minus Plugin)', 'result'], rows: [['Exporter', 'yes', '—', '—', 'skipped'], ['Csv', 'no', 'run, name, ext', 'run (Exporter), name/ext (Csv)', H.c('g', 'registered')], ['Broken', 'no', 'run, name, ext', 'run, name', H.c('r', 'TypeError: missing ext')]] },
        complexity: R`<p>O(R × M) per class definition (R required names, M classes in the MRO), paid once at import time; zero cost per instance.</p>`,
        followUps: ['Also verify that required methods have the right number of parameters using <code>inspect.signature</code>.', 'How does <code>abc.ABCMeta</code> do something similar, and why does it fail at instantiation instead of definition?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 9: The Import System
     ====================================================================== */
  function importSim(input) {
    var reqs = String(input || '').split(/[\s,;]+/).map(function (s) { return s.replace(/^import\s+/, '').trim(); }).filter(Boolean);
    if (!reqs.length) throw new Error('Enter module names like: json, os, myapp.utils');
    if (reqs.length > 6) throw new Error('Use at most 6 imports');
    reqs.forEach(function (r) { if (!/^[A-Za-z_]\w*(\.[A-Za-z_]\w*)*$/.test(r)) throw new Error('"' + r + '" is not a valid dotted module name'); });
    var BUILTIN = ['sys', 'builtins', 'marshal', 'posix', '_imp', '_thread', '_io', '_weakref', '_warnings', 'itertools', 'time', 'math'];
    var FROZEN = ['os', 'io', 'abc', 'codecs', 'site', 'stat', 'posixpath', 'genericpath', '_collections_abc', 'zipimport', 'runpy'];
    var STDLIB = { json: ['decoder', 'encoder', 'scanner', 'tool'], collections: [], asyncio: ['tasks', 'events', 'queues'], logging: ['handlers', 'config'], unittest: ['mock'], email: ['message', 'utils'], http: ['client', 'server'], xml: ['etree', 'dom'], importlib: ['util', 'metadata', 'resources'], concurrent: ['futures'] };
    var STDMOD = ['re', 'random', 'datetime', 'typing', 'functools', 'dataclasses', 'pathlib', 'string', 'enum', 'decimal', 'csv', 'heapq', 'bisect', 'statistics', 'copy', 'pickle', 'socket', 'threading', 'subprocess', 'tempfile', 'weakref', 'inspect', 'dis', 'ast', 'operator', 'textwrap', 'uuid', 'hashlib', 'shutil', 'glob', 'argparse', 'pprint', 'timeit', 'traceback', 'contextlib', 'fractions', 'secrets', 'struct', 'array', 'queue', 'sched', 'select', 'signal', 'zlib', 'gc'];
    var THIRD = ['numpy', 'requests', 'pandas', 'django', 'flask', 'pydantic', 'fastapi', 'httpx', 'torch', 'pytest', 'sqlalchemy', 'attrs'];
    var PATHS = ['/home/me/project', '/usr/lib/python3.13', '/usr/lib/python3.13/lib-dynload', '/…/site-packages'];
    var mods = ['sys', 'builtins', '_imp', '_io', 'marshal', 'posix', '_thread', '_warnings', '_weakref', 'zipimport', 'codecs', 'io', 'abc', 'site', 'os', 'stat', 'posixpath', '_collections_abc'];
    var ns = {}, nsOrder = [], frames = [];
    var nodes = [
      { id: 'S', label: 'import X', x: 8, y: 9, shape: 'box' }, { id: 'C', label: 'sys.modules?', x: 32, y: 9, shape: 'box' },
      { id: 'B', label: 'BuiltinImporter', x: 58, y: 9, shape: 'box' }, { id: 'F', label: 'FrozenImporter', x: 86, y: 9, shape: 'box' },
      { id: 'P', label: 'PathFinder', x: 86, y: 33, shape: 'box' }, { id: 'L', label: 'loader.exec_module', x: 50, y: 33, shape: 'box' },
      { id: 'N', label: 'bind name', x: 14, y: 33, shape: 'box' },
      { id: 'p0', label: 'project dir', x: 12, y: 58, shape: 'box' }, { id: 'p1', label: 'stdlib', x: 37, y: 58, shape: 'box' },
      { id: 'p2', label: 'lib-dynload', x: 62, y: 58, shape: 'box' }, { id: 'p3', label: 'site-packages', x: 88, y: 58, shape: 'box' }
    ];
    var edges = [['S', 'C'], ['C', 'B', 'miss'], ['B', 'F', 'miss'], ['F', 'P', 'miss'], ['P', 'p0'], ['P', 'p1'], ['P', 'p2'], ['P', 'p3'], ['C', 'N', 'hit'], ['B', 'L', 'spec'], ['F', 'L', 'spec'], ['L', 'N']];
    function graph(path, endCls, tags) {
      var hl = {}, ehl = {};
      path.forEach(function (id, i) { hl[id] = i === path.length - 1 ? (endCls || 'cur') : 'done'; if (i) ehl[path[i - 1] + '-' + id] = endCls === 'bad' && i === path.length - 1 ? 'bad' : 'win'; });
      return { type: 'graph', label: 'Import machinery', directed: true, height: 66, nodes: nodes, edges: edges.concat([['p0', 'L'], ['p1', 'L'], ['p2', 'L'], ['p3', 'L']]), hl: hl, ehl: ehl, tags: tags || {} };
    }
    function state(newMods) {
      var shown = mods.slice(-8), h = {};
      (newMods || []).forEach(function (m) { h[m] = 'ok'; });
      var vals = {}; nsOrder.forEach(function (k) { vals[k] = ns[k]; });
      return [
        { type: 'set', label: 'sys.modules (' + mods.length + ' entries, last 8 shown)', items: shown, hl: h },
        { type: 'vars', label: 'Your module\'s namespace', vals: nsOrder.length ? vals : { '(nothing imported yet)': '' } }
      ];
    }
    function push(narr, path, endCls, tags, newMods) { frames.push({ narr: narr, parts: [graph(path, endCls, tags)].concat(state(newMods)) }); }
    frames.push({ narr: 'Interpreter start-up already imported ~' + mods.length + ' modules (sys, builtins, the frozen import machinery, os, site, …). <code>sys.meta_path</code> = [BuiltinImporter, FrozenImporter, PathFinder]; <code>sys.path</code> = [script dir, stdlib, lib-dynload, site-packages].', parts: [graph(['S'], 'cur')].concat(state([])) });
    function locate(full, parentKind) {
      var parts = full.split('.'), leaf = parts[parts.length - 1], top = parts[0];
      if (parts.length === 1) {
        if (BUILTIN.indexOf(full) >= 0) return { via: 'B', origin: 'built-in (compiled into the interpreter binary)', pkg: false };
        if (FROZEN.indexOf(full) >= 0) return { via: 'F', origin: 'frozen (bytecode baked into the binary for fast start-up)', pkg: false };
        if (STDLIB[full]) return { via: 'p1', origin: PATHS[1] + '/' + full + '/__init__.py', pkg: true, kind: 'std' };
        if (STDMOD.indexOf(full) >= 0) return { via: 'p1', origin: PATHS[1] + '/' + full + '.py', pkg: false };
        if (THIRD.indexOf(full) >= 0) return { via: 'p3', origin: PATHS[3] + '/' + full + '/__init__.py', pkg: true, kind: 'third' };
        if (/^(my|app|proj)/i.test(full)) return { via: 'p0', origin: PATHS[0] + '/' + full + '/__init__.py', pkg: true, kind: 'local' };
        return null;
      }
      if (!parentKind || !parentKind.pkg) return { notpkg: true };
      if (parentKind.kind === 'std') return (STDLIB[top] || []).indexOf(leaf) >= 0 ? { via: 'p1', origin: parentKind.origin.replace(/__init__\.py$/, '') + leaf + '.py', pkg: false } : null;
      return { via: parentKind.via, origin: parentKind.origin.replace(/__init__\.py$/, '') + leaf + '.py', pkg: false, kind: parentKind.kind };
    }
    var known = {};
    reqs.forEach(function (req) {
      var parts = req.split('.'), parentInfo = null, failed = false;
      for (var i = 0; i < parts.length && !failed; i++) {
        var full = parts.slice(0, i + 1).join('.');
        if (mods.indexOf(full) >= 0) {
          parentInfo = known[full] || { pkg: STDLIB[full] !== undefined || THIRD.indexOf(full) >= 0, kind: 'std', origin: '', via: 'p1' };
          push('<code>' + (i ? 'import ' + req + '</code> (step for <code>' + full + '</code>)' : 'import ' + esc(req) + '</code>') + ': <b>' + full + '</b> is already in <code>sys.modules</code> → <b>cache hit</b>. No searching, no re-execution: modules run only once per process.', ['S', 'C', 'N'], 'ok', { C: 'hit' }, [full]);
          continue;
        }
        var info = locate(full, parentInfo);
        if (info && info.notpkg) {
          push('<code>import ' + esc(req) + '</code>: <span class="c-r">ModuleNotFoundError: No module named \'' + full + '\'; \'' + parts.slice(0, i).join('.') + '\' is not a package</span>. Only packages (with <code>__path__</code>) can contain submodules.', ['S', 'C', 'B', 'F', 'P'], 'bad', { P: 'not a package' });
          failed = true; break;
        }
        if (!info) {
          push('<code>import ' + esc(req) + '</code>: <b>' + full + '</b> not in <code>sys.modules</code>; BuiltinImporter, FrozenImporter and every <code>sys.path</code> entry say "not mine". <span class="c-r">ModuleNotFoundError: No module named \'' + full + '\'</span>. Typical causes: typo, wrong virtualenv, package not installed.', ['S', 'C', 'B', 'F', 'P'], 'bad', { P: 'not found' });
          failed = true; break;
        }
        var path = ['S', 'C', 'B'];
        if (info.via !== 'B') path.push('F');
        if (/^p/.test(info.via)) { path.push('P'); path.push(info.via); }
        var where = { B: 'BuiltinImporter (which modules are built in varies by build: see sys.builtin_module_names)', F: 'FrozenImporter', p0: 'PathFinder → project dir (sys.path[0])', p1: 'PathFinder → stdlib directory', p2: 'PathFinder → lib-dynload', p3: 'PathFinder → site-packages' }[info.via];
        var tg = {}; tg[info.via] = 'found';
        push('<code>' + esc(full) + '</code> is not cached, so each finder on <code>sys.meta_path</code> is asked <code>find_spec("' + full + '")</code> in order. <b>' + where + '</b> returns a <b>ModuleSpec</b>' + (i ? ' (searching only inside the parent package\'s <code>__path__</code>)' : '') + ': origin = <code>' + esc(info.origin) + '</code>.', path, 'sel', tg);
        mods.push(full); known[full] = info;
        var execNarr = 'The loader creates an empty module object, <b>puts it in <code>sys.modules</code> first</b> (so circular imports find a partially initialised module instead of looping), then executes its code' + (info.via === 'B' ? ' (C init function).' : info.via === 'F' ? ' (frozen bytecode).' : '. For source files it reuses <code>__pycache__/' + esc(full.split('.').pop()) + '.cpython-313.pyc</code> if it is up to date, otherwise compiles and writes it.');
        push(execNarr, path.concat(['L']), 'cur', {}, [full]);
        parentInfo = info;
      }
      if (!failed) {
        var top = parts[0];
        if (nsOrder.indexOf(top) < 0) nsOrder.push(top);
        ns[top] = '<module \'' + top + '\'>';
        push('<code>import ' + esc(req) + '</code> finishes by binding the name <b><code>' + top + '</code></b> in your namespace' + (parts.length > 1 ? ' (the <b>top-level</b> package; you reach the submodule as <code>' + esc(req) + '</code>, an attribute set on the parent when the submodule loaded).' : '.'), ['L', 'N'], 'ok', { N: top });
      }
    });
    return frames;
  }

  topics.push({
    title: 'The Import System: sys.modules, Finders, Loaders & Circular Imports',
    analogy: R`<p>You ask for a book. First you check <b>your desk</b> (books you already borrowed: <code>sys.modules</code>); if it is there, done. Otherwise you ask the librarians in a fixed order: the <b>reference shelf</b> clerk (built-in modules), the <b>display case</b> clerk (frozen modules), and the <b>stacks</b> clerk, who walks the aisles in the order listed on the map (<code>sys.path</code>). Whoever finds it hands you a <b>catalogue card</b> (a <i>spec</i>); a <b>loader</b> then fetches the book and reads it to you once (executes the module). You put it on your desk with a sticky note (the name you imported). Ask again later: it is already on the desk.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> <code>import json</code> means: "give me the module object called <code>json</code>, creating and running it if this process has not done so yet, and bind it to the name <code>json</code>". The machinery is mostly written in Python (<code>importlib._bootstrap</code>, frozen into the interpreter):</p>
      <pre>def import_module(name):
    if name in sys.modules:                    # 1. cache
        return sys.modules[name]
    parent_path = import_parent_first(name)    # 2. "a.b" imports "a" first
    for finder in sys.meta_path:               # 3. ask each finder
        spec = finder.find_spec(name, parent_path)
        if spec: break
    else:
        raise ModuleNotFoundError(name)
    module = module_from_spec(spec)            # 4. empty module object
    sys.modules[name] = module                 # 5. cache BEFORE running
    spec.loader.exec_module(module)            # 6. run its code once
    return module</pre>
      ${H.table(['Piece', 'Role', 'Inspect'], [
        ['<code>sys.modules</code>', 'cache: name → module object', '<code>"json" in sys.modules</code>'],
        ['<code>sys.meta_path</code>', 'finders, asked in order: BuiltinImporter, FrozenImporter, PathFinder', '<code>print(sys.meta_path)</code>'],
        ['<code>sys.path</code>', 'directories/zips PathFinder searches: script dir, <code>PYTHONPATH</code>, stdlib, site-packages', '<code>python -m site</code>'],
        ['ModuleSpec', 'what was found: name, origin, loader, <code>submodule_search_locations</code>', '<code>importlib.util.find_spec("json")</code>'],
        ['loader', 'creates and executes the module (source, .pyc, extension .so/.pyd, builtin, frozen)', '<code>module.__spec__.loader</code>']
      ])}
      <p><b>Statement flavours:</b></p>
      ${H.table(['You write', 'What is imported', 'Name bound'], [
        ['<code>import a.b.c</code>', '<code>a</code>, then <code>a.b</code>, then <code>a.b.c</code>', '<code>a</code> only'],
        ['<code>import a.b as m</code>', 'same chain', '<code>m</code> = the <code>a.b</code> module'],
        ['<code>from a import b</code>', '<code>a</code>; then attribute <code>b</code>, or submodule <code>a.b</code> if no such attribute', '<code>b</code>'],
        ['<code>from . import x</code>', 'relative to the current package (<code>__package__</code>)', '<code>x</code>']
      ])}
      <p><b>Packages</b> are modules with a <code>__path__</code>: a directory with <code>__init__.py</code> (regular package) or, without it, a <b>namespace package</b> (PEP 420) that can span several directories. <b>Modules execute once</b>: the second <code>import</code> anywhere in the process is just a dict lookup; <code>importlib.reload(m)</code> re-executes the code into the same module object (old references to functions/classes remain stale).</p>
      <p><b>Circular imports</b> work only partially: because the module is put in <code>sys.modules</code> before its code runs, a cycle gets a <b>partially initialised</b> module. <code>import b</code> inside <code>a</code> succeeds, but <code>from b import thing</code> fails if <code>thing</code> is not defined yet: <code>ImportError: cannot import name 'thing' from partially initialized module 'b' (most likely due to a circular import)</code>.</p>`,
    clues: [
      '"What happens when you import a module twice?" → second time is a <code>sys.modules</code> hit; code runs once',
      '"ImportError: cannot import name X from partially initialized module" → circular import; move the import, import the module not the name, or restructure',
      '"My file named <code>random.py</code> broke everything" → <code>sys.path[0]</code> (script dir) shadows the stdlib',
      '"Load plugins from a database / zip / network" → custom finder on <code>sys.meta_path</code> or a path hook',
      '"Slow start-up of a CLI" → <code>python -X importtime</code>, lazy imports',
      '"<code>if __name__ == \"__main__\"</code>" → the script runs as module <code>__main__</code>; importing it runs it again under its real name'
    ],
    code: [{ lang: 'python', title: 'Inspect the machinery (runnable)', run: true, code: R`import importlib.util
import sys

print("finders:", [getattr(f, "__name__", type(f).__name__) for f in sys.meta_path])
print("modules already loaded at start-up:", len(sys.modules))

for name in ["sys", "os", "json", "json.decoder"]:
    spec = importlib.util.find_spec(name)
    loader = spec.loader if isinstance(spec.loader, type) else type(spec.loader)
    print(f"{name:<13} loader={loader.__name__:<17} package={spec.submodule_search_locations is not None}")

import json
import json as again                    # cache hit: same object
print("same module object:", json is again is sys.modules["json"])
print("json file:", json.__spec__.origin.rsplit("/", 2)[-2:])
` }],
    codeTitle: ['Finders, specs, cache'],
    viz: {
      title: 'Follow import statements through sys.modules, finders and loaders',
      input: 'json, os, json, myapp.utils, json.decoder, missing_mod',
      inputLabel: 'Module names, comma separated (max 6). Names starting with my/app are your project; try numpy, math, random.choice',
      gen: importSim
    },
    examples: [
      { title: 'Module code runs once; reload runs it again', html: R`<p>We create a module file at runtime that prints when executed. Importing it twice prints once. <code>importlib.reload</code> re-executes the file into the <b>same</b> module object, but objects created before the reload (like <code>old_fn</code>) still point at the old code: a classic hot-reload gotcha.</p>
        ${H.table(['action', 'module code runs?'], [['first import', H.c('g', 'yes')], ['second import', H.c('m', 'no (cache hit)')], ['reload', H.c('y', 'yes, same module object')]])}`, code: { lang: 'python', run: true, code: R`import importlib
import pathlib
import sys
import tempfile

tmp = pathlib.Path(tempfile.mkdtemp())
(tmp / "greet.py").write_text('print("  executing greet.py")\ndef hello():\n    return "v1"\n')
sys.path.insert(0, str(tmp))

import greet
import greet                          # cache hit, prints nothing
old_fn = greet.hello
(tmp / "greet.py").write_text('print("  executing greet.py again")\ndef hello():\n    return "v2"\n')
importlib.invalidate_caches()
greet2 = importlib.reload(greet)
print(greet2 is greet, greet.hello(), old_fn())   # True v2 v1
sys.path.remove(str(tmp))
` } },
      { title: 'Reproduce and fix a circular import', html: R`<p><code>a.py</code> does <code>from b import helper</code>; <code>b.py</code> does <code>from a import CONFIG</code>. Importing <code>a</code> starts running <code>a</code>, which imports <code>b</code>, which asks <code>a</code> (partially initialised, <code>CONFIG</code> not defined yet) for <code>CONFIG</code> → ImportError. Fixes: import the <b>module</b> (<code>import a</code>, then use <code>a.CONFIG</code> later at call time), move the shared constant to a third module, or do the import inside the function that needs it.</p>
        ${H.table(['step', 'sys.modules', 'a.CONFIG defined?'], [['import a starts', 'a (empty)', 'no'], ['a: from b import helper', 'a, b (empty)', 'no'], ['b: from a import CONFIG', '', H.c('r', 'no → ImportError')]])}`, code: { lang: 'python', run: true, code: R`import importlib
import pathlib
import sys
import tempfile

tmp = pathlib.Path(tempfile.mkdtemp())
(tmp / "cyc_a.py").write_text("from cyc_b import helper\nCONFIG = {'debug': True}\n")
(tmp / "cyc_b.py").write_text("from cyc_a import CONFIG\ndef helper():\n    return CONFIG\n")
sys.path.insert(0, str(tmp))
try:
    import cyc_a
except ImportError as e:
    print("ImportError:", e)
for name in ("cyc_a", "cyc_b"):
    sys.modules.pop(name, None)       # forget the half-built modules

# Fix: import the MODULE and look the name up at call time
(tmp / "cyc_b.py").write_text("import cyc_a\ndef helper():\n    return cyc_a.CONFIG\n")
importlib.invalidate_caches()
import cyc_a
print("fixed:", cyc_a.helper())
sys.path.remove(str(tmp))
` } },
      { title: 'Shadowing the standard library', html: R`<p>The directory of the script you run is <code>sys.path[0]</code>, searched <b>before</b> the stdlib. A file named <code>random.py</code>, <code>json.py</code> or <code>email.py</code> in your project silently replaces the real module for everything that imports it, causing baffling errors like <code>AttributeError: module 'random' has no attribute 'randint'</code>. Python 3.13 detects this and adds a hint ("consider renaming … since it has the same name as the standard library module"). Since 3.11 you can run with <code>-P</code> or <code>PYTHONSAFEPATH=1</code> to not prepend the script directory at all.</p>
        ${H.arr(['/home/me/project', '/usr/lib/python3.13', '…/site-packages'], { label: 'sys.path order', hl: { 0: 'r' } })}` }
    ],
    deepDive: R`<p>🟣 <b>PathFinder internals.</b> For each <code>sys.path</code> entry, PathFinder asks <code>sys.path_hooks</code> for a path-entry finder (FileFinder for directories, <code>zipimporter</code> for zip files) and caches it in <code>sys.path_importer_cache</code>. FileFinder caches directory listings, which is why code that writes a new module at runtime must call <code>importlib.invalidate_caches()</code>. It tries, per directory: a package directory, extension modules (<code>.cpython-313-x86_64-linux-gnu.so</code>, <code>.pyd</code>), source <code>.py</code>, and sourceless <code>.pyc</code>.</p>
      <p><b>.pyc validation.</b> <code>SourceFileLoader</code> checks <code>__pycache__/name.cpython-313.pyc</code>: the magic number must match and, by default, the stored source mtime and size must match the <code>.py</code> file (or a source hash for "checked/unchecked hash" pycs, PEP 552, used for reproducible builds). Read-only installs ship pre-compiled pycs (<code>python -m compileall</code>).</p>
      <p><b>Thread safety.</b> Each module being imported has its own import lock, so two threads importing the same module do not run it twice; deadlocks between circular imports in different threads are detected and broken. Avoid starting threads that import things as a side effect of importing a module.</p>
      <p><b>Start-up and laziness.</b> 3.11 froze the core stdlib modules needed at start-up into the binary ("deep-frozen" code objects), cutting start-up time. <code>python -X importtime -c "import mypkg"</code> prints a tree of cumulative import times; large CLIs (and tools like Mercurial) use lazy imports. Today you can use <code>importlib.util.LazyLoader</code> or a module-level <code>__getattr__</code> (PEP 562) to defer imports; PEP 810 adds explicit <code>lazy import</code> syntax, accepted for Python 3.15.</p>
      <p><b>Security notes.</b> <code>.pth</code> files in site-packages can execute code at start-up (a known supply-chain persistence trick); typo-squatted packages exploit <code>pip install</code> mistakes; and anything on <code>sys.path</code> that an attacker can write to is code execution. Use virtual environments, pinned and hashed dependencies, and <code>-I</code>/<code>-P</code> for sensitive scripts.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> assistants are very good at diagnosing <code>ModuleNotFoundError</code> and circular-import tracebacks if you paste the traceback, <code>sys.path</code> and the project tree. They also generate packaging configs (<code>pyproject.toml</code>) quickly. Many "import errors" in AI-generated code are <b>hallucinated packages or modules</b>, and attackers register those names on PyPI ("slopsquatting").</p>
      <p><b>Use AI as a partner:</b> <code>Here is my project tree, the traceback and sys.path. Explain which file each import resolves to and propose the smallest restructuring that removes the circular import.</code></p>
      <p><b>Where AI goes wrong:</b> suggesting <code>sys.path.append(...)</code> hacks instead of a proper package install (<code>pip install -e .</code>), recommending package names that do not exist, mixing up <code>from a import b</code> semantics, or "fixing" a cycle by moving imports to the bottom of a file without understanding why it worked.</p>
      <p><b>What you must still own:</b> the cache → finders → loader → bind sequence, the "cached before executed" rule that explains circular imports, and verifying that every dependency an assistant suggests actually exists and is the one you meant.</p>`,
    problems: [{
      title: 'Serve Modules from a Dict (Custom Meta Path Finder)',
      level: 'Hard', tags: ['importlib', 'finder', 'loader'], companies: ['Dropbox', 'Bloomberg', 'Anthropic'],
      statement: R`<p>Implement <code>DictImporter(sources)</code>, where <code>sources</code> maps module names (e.g. <code>"plugins"</code>, <code>"plugins.hello"</code>) to source code strings. Installing it on <code>sys.meta_path</code> must make <code>import plugins.hello</code> work without any files on disk. A name is a package if some other key starts with <code>name + "."</code>. Modules must get a correct <code>__spec__</code>, and normal caching in <code>sys.modules</code> must apply.</p>`,
      constraints: R`<p>Use the modern protocol (<code>find_spec</code> + <code>exec_module</code>); return <code>None</code> for names you do not own so other finders keep working. Up to 10<sup>3</sup> modules.</p>`,
      example: R`<p>sources = <code>{"plugins": "", "plugins.hello": "def hi(): return 'hi from memory'"}</code>; after installing, <code>from plugins.hello import hi; hi()</code> → ${H.c('g', "'hi from memory'")}. Why: our finder returns a spec for both names; <code>plugins</code> gets <code>__path__</code> because <code>plugins.hello</code> exists.</p>`,
      brute: { why: R`<p>Write every source string to a temporary directory and add it to <code>sys.path</code>. It works, but touches the disk, needs cleanup, races with other processes, and leaks a writable directory onto <code>sys.path</code> (a security risk). The import system is designed to be extended in memory instead.</p>`, code: R`import pathlib
import sys
import tempfile

def install_via_disk(sources):
    root = pathlib.Path(tempfile.mkdtemp())
    for name, src in sources.items():
        parts = name.split(".")
        is_pkg = any(k.startswith(name + ".") for k in sources)
        target = root.joinpath(*parts)
        if is_pkg:
            target.mkdir(parents=True, exist_ok=True)
            (target / "__init__.py").write_text(src)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.with_suffix(".py").write_text(src)
    sys.path.insert(0, str(root))
    return root

root = install_via_disk({"diskpkg": "", "diskpkg.m": "X = 1"})
import diskpkg.m
print(diskpkg.m.X)
sys.path.remove(str(root))
` },
      mcq: { q: 'Why must the finder return <code>None</code> for module names it does not know?', options: ['So the next finder on sys.meta_path gets a chance', 'Because raising would be faster', 'To make the module a namespace package', 'It must raise ImportError instead'], answer: 0, explain: 'The import system tries each finder in order; returning None means "not mine". Raising would abort the whole import, breaking every other module.' },
      hints: [R`<p>Hint 1: subclass <code>importlib.abc.MetaPathFinder</code> and <code>importlib.abc.Loader</code> (one class can be both). <code>find_spec(name, path, target=None)</code> returns <code>importlib.util.spec_from_loader(name, self, is_package=...)</code>.</p>`, R`<p>Hint 2: <code>exec_module(module)</code> compiles <code>sources[module.__name__]</code> with a fake filename like <code>"&lt;dict:plugins.hello&gt;"</code> and <code>exec</code>s it in <code>module.__dict__</code>. <code>create_module</code> returning None means "use the default module object".</p>`, R`<p>Hint 3: for packages, <code>spec_from_loader(..., is_package=True)</code> sets <code>submodule_search_locations</code> so <code>__path__</code> exists. Insert the finder at the front of <code>sys.meta_path</code>; remove it and the cached modules when done.</p>`],
      solution: {
        approach: R`<p>One object acting as both finder and loader. <code>find_spec</code> claims only names in the dict and marks packages; <code>exec_module</code> compiles and runs the stored source in the fresh module's namespace. Everything else (parent-first imports, <code>sys.modules</code> caching, attribute binding of submodules) is handled by importlib.</p>`,
        code: { lang: 'python', run: true, code: R`import importlib.abc
import importlib.util
import sys

class DictImporter(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    def __init__(self, sources):
        self.sources = dict(sources)

    def _is_package(self, name):
        return any(key.startswith(name + ".") for key in self.sources)

    # ---- finder protocol ----
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in self.sources:
            return None                                  # not ours
        return importlib.util.spec_from_loader(
            fullname, self, origin=f"<dict:{fullname}>",
            is_package=self._is_package(fullname))

    # ---- loader protocol ----
    def create_module(self, spec):
        return None                                      # default module object

    def exec_module(self, module):
        name = module.__name__
        code = compile(self.sources[name], f"<dict:{name}>", "exec")
        exec(code, module.__dict__)

sources = {
    "plugins": "REGISTRY = []",
    "plugins.hello": "import plugins\nplugins.REGISTRY.append('hello')\n"
                     "def hi():\n    return 'hi from memory'\n",
}
finder = DictImporter(sources)
sys.meta_path.insert(0, finder)
try:
    from plugins.hello import hi
    import plugins
    print(hi(), plugins.REGISTRY, plugins.__path__ is not None)
    print(plugins.hello.__spec__.origin)
finally:
    sys.meta_path.remove(finder)
    for mod in ("plugins.hello", "plugins"):
        sys.modules.pop(mod, None)
` },
        dry: { head: ['import step', 'find_spec result', 'sys.modules after', 'effect'], rows: [['plugins (parent first)', 'spec, is_package=True', 'plugins', 'REGISTRY = []'], ['plugins.hello', 'spec, is_package=False', 'plugins, plugins.hello', "REGISTRY = ['hello'], hi defined"], ['bind', '—', '—', 'plugins.hello attribute set; from-import binds hi'], ['import plugins again', 'not called (cache hit)', 'unchanged', 'same module object']] },
        complexity: R`<p><code>find_spec</code> is O(1) for the lookup plus O(K) for the package check (K keys; precompute a set of prefixes for O(1)). Executing a module costs its compile time, paid once thanks to <code>sys.modules</code>.</p>`,
        followUps: ['Make it reload-safe: what happens with <code>importlib.reload(plugins.hello)</code>?', 'Add <code>get_source</code> so tracebacks and <code>inspect.getsource</code> show the in-memory code (hint: <code>linecache</code>).']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Same Object or Just Equal?',
    level: 'Easy', tags: ['identity', 'is vs ==', 'interning'], companies: ['Amazon', 'Infosys', 'Accenture'],
    statement: R`<p>Write <code>relation(a, b)</code> returning <code>"same object"</code> if <code>a is b</code>, <code>"equal, different objects"</code> if <code>a == b</code> but not identical, else <code>"different"</code>. Then <b>predict</b> the result for runtime-built pairs: <code>int("256")</code> twice, <code>int("257")</code> twice, <code>"".join(["ab","c"])</code> twice, and <code>[1]</code> vs <code>[1]</code>.</p>`,
    constraints: R`<p>Any Python objects. Must check identity <b>first</b> (an object can be identical but not equal to itself, e.g. <code>float("nan")</code>).</p>`,
    example: R`<p>${H.table(['pair', 'result'], [['int("256") ×2', H.c('g', 'same object') + ' (small-int cache)'], ['int("257") ×2', H.c('y', 'equal, different objects')], ['"".join ×2', H.c('y', 'equal, different objects') + ' (runtime strings)'], ['[1], [1]', H.c('y', 'equal, different objects')], ['nan, same variable', H.c('g', 'same object') + ' (though nan != nan)']])}</p>`,
    brute: { why: R`<p>Comparing <code>str(a) == str(b)</code> or <code>id(a) == id(b)</code> computed at different times looks similar but is wrong: string forms can collide across types (<code>1</code> vs <code>"1"</code>), and ids of objects that are not alive at the same time can be reused.</p>`, code: R`def relation_brute(a, b):
    if str(a) == str(b):              # 1 and "1" look "equal" here: wrong
        return "equal"
    return "different"

print(relation_brute(1, "1"))
` },
    mcq: { q: 'For <code>x = float("nan")</code>, what is <code>relation(x, x)</code> with identity checked first?', options: ['"same object"', '"equal, different objects"', '"different"', 'It raises'], answer: 0, explain: 'Identity holds even though <code>nan == nan</code> is False. Checking <code>==</code> first would wrongly report "different".' },
    hints: [R`<p>Hint 1: order matters: test <code>a is b</code> first, then <code>a == b</code>, then fall through to "different".</p>`, R`<p>Hint 2: build values at runtime (<code>int(text)</code>, <code>"".join</code>) so the compiler cannot merge constants and fool your experiment.</p>`, R`<p>Hint 3: remember the cache range −5…256 for ints and that only empty / one-char Latin-1 strings are cached at runtime.</p>`],
    solution: {
      approach: R`<p>Three ordered checks. The experiment builds every value at runtime so that results reflect real program data rather than merged literals.</p>`,
      code: { lang: 'python', run: true, code: R`def relation(a, b):
    if a is b:
        return "same object"
    if a == b:
        return "equal, different objects"
    return "different"

pairs = {
    'int("256") x2': (int("256"), int("256")),
    'int("257") x2': (int("257"), int("257")),
    'join x2': ("".join(["ab", "c"]), "".join(["ab", "c"])),
    '[1] vs [1]': ([1], [1]),
    '1 vs "1"': (1, "1"),
}
for label, (a, b) in pairs.items():
    print(f"{label:<14} -> {relation(a, b)}")
nan = float("nan")
print("nan vs itself  ->", relation(nan, nan))
` },
      complexity: R`<p>O(1) for identity; <code>==</code> costs whatever the type's <code>__eq__</code> costs (O(n) for long strings or lists).</p>`,
      followUps: ['Why does <code>[nan] == [nan]</code> return True when <code>nan == nan</code> is False?']
    }
  });

  practice.push({
    title: 'Did the Compiler Fold It?',
    level: 'Easy', tags: ['bytecode', 'constant folding', 'co_consts'], companies: ['Google', 'Meta'],
    statement: R`<p>Write <code>is_precomputed(func, value)</code> returning <code>True</code> if <code>value</code> appears among the constants of <code>func</code> or of any code object nested inside it (inner functions, lambdas, generator expressions). Use it to check whether expressions like <code>24 * 60 * 60</code>, <code>2 ** 10</code> and <code>"ab" * 3</code> are folded.</p>`,
    constraints: R`<p>Do not use <code>dis</code> text output. Nested code objects live in <code>co_consts</code>. Compare with <code>==</code> but also require the same type (so <code>1 == True</code> does not count).</p>`,
    example: R`<p><code>def f(): return 24 * 60 * 60</code> → <code>is_precomputed(f, 86400)</code> = ${H.c('g', 'True')}. <code>def g(x): return x * 60</code> → <code>is_precomputed(g, 60)</code> = ${H.c('g', 'True')} (the literal) but <code>3600</code> ${H.c('r', 'False')}, because <code>x</code> is not constant.</p>`,
    brute: { why: R`<p>Calling the function and timing it cannot tell folded from unfolded code (both are fast), and looking only at the top-level <code>co_consts</code> misses constants inside nested functions.</p>`, code: R`def is_precomputed_shallow(func, value):
    return value in func.__code__.co_consts      # misses nested code objects

def outer():
    def inner():
        return 2 ** 10
    return inner

print(is_precomputed_shallow(outer, 1024))       # False: wrong
` },
    mcq: { q: 'Where does the bytecode of an inner function defined inside <code>outer</code> live?', options: ['As a code object inside <code>outer.__code__.co_consts</code>', 'In <code>outer.__dict__</code>', 'In the module globals only', 'It is created from source text at call time'], answer: 0, explain: 'The compiler stores nested code objects as constants; <code>MAKE_FUNCTION</code> wraps them in a new function object each time <code>outer</code> runs.' },
    hints: [R`<p>Hint 1: <code>types.CodeType</code> instances inside <code>co_consts</code> are nested code objects; recurse into them.</p>`, R`<p>Hint 2: compare with <code>type(c) is type(value) and c == value</code> to avoid <code>True == 1</code> surprises.</p>`, R`<p>Hint 3: use an explicit stack of code objects to avoid recursion limits; start with <code>func.__code__</code>.</p>`],
    solution: {
      approach: R`<p>Depth-first walk over code objects via <code>co_consts</code>, checking each constant with a type-strict comparison.</p>`,
      code: { lang: 'python', run: true, code: R`import types

def is_precomputed(func, value):
    stack = [func.__code__]
    while stack:
        code = stack.pop()
        for c in code.co_consts:
            if isinstance(c, types.CodeType):
                stack.append(c)                  # nested function / lambda / genexpr
            elif type(c) is type(value) and c == value:
                return True
    return False

def seconds():
    return 24 * 60 * 60

def outer():
    def inner():
        return 2 ** 10
    return inner

def scaled(x):
    return x * 60

print(is_precomputed(seconds, 86400))
print(is_precomputed(outer, 1024))
print(is_precomputed(scaled, 3600), is_precomputed(scaled, 60))
print(is_precomputed(lambda: "ab" * 3, "ababab"))
` },
      complexity: R`<p>O(total number of constants across all nested code objects).</p>`,
      followUps: ['Why does CPython refuse to fold <code>"a" * 10_000_000</code>? (Size limits keep .pyc files small.)']
    }
  });

  practice.push({
    title: 'List the Global Lookups in a Function',
    level: 'Easy', tags: ['dis', 'LOAD_GLOBAL', 'performance'], companies: ['Bloomberg', 'Jane Street'],
    statement: R`<p>Write <code>global_lookups(func)</code> that returns a dict mapping each name read with <code>LOAD_GLOBAL</code> to how many times it appears in <code>func</code>'s bytecode. These are dict lookups (globals, then builtins) on every execution; names inside loops are candidates for hoisting into locals in very hot pure-Python code.</p>`,
    constraints: R`<p>Use <code>dis.get_instructions</code>. On 3.11+ <code>argval</code> is the plain name; <code>argrepr</code> may say <code>"len + NULL"</code>, so use <code>argval</code>.</p>`,
    example: R`<p>For a loop calling <code>len(x)</code> and <code>math.sqrt</code> per item, the result contains ${H.c('y', "{'len': 1, 'math': 1}")}: one instruction each, but executed once <b>per iteration</b>.</p>`,
    brute: { why: R`<p>Scanning the <b>source text</b> with a regex for names finds locals, attributes and comments too, and cannot tell a global from a local. The compiler already classified every name; the bytecode tells you exactly.</p>`, code: R`import inspect
import re

def global_lookups_regex(func):
    src = inspect.getsource(func)
    return sorted(set(re.findall(r"[A-Za-z_]\w*", src)))   # everything, useless
` },
    mcq: { q: 'Inside a function, which instruction reads a builtin like <code>len</code>?', options: ['LOAD_GLOBAL', 'LOAD_FAST', 'LOAD_NAME', 'LOAD_DEREF'], answer: 0, explain: 'Function code uses LOAD_GLOBAL for names that are neither local nor closure variables; it checks module globals and then builtins. LOAD_NAME is for module/class bodies.' },
    hints: [R`<p>Hint 1: filter instructions with <code>ins.opname == "LOAD_GLOBAL"</code> and collect <code>ins.argval</code>.</p>`, R`<p>Hint 2: <code>collections.Counter</code> does the counting.</p>`, R`<p>Hint 3: compare two versions of the same loop: one calling <code>math.sqrt</code>, one with <code>sqrt = math.sqrt</code> hoisted before the loop (or passed as a default argument).</p>`],
    solution: {
      approach: R`<p>Count <code>LOAD_GLOBAL</code> instructions by name. Then show that hoisting (binding globals to default arguments, which are evaluated once at <code>def</code> time) removes every <code>LOAD_GLOBAL</code> from the function: the loop body now reads only <code>LOAD_FAST</code> slots.</p>`,
      code: { lang: 'python', run: true, code: R`import dis
import math
from collections import Counter

def global_lookups(func):
    return dict(Counter(ins.argval for ins in dis.get_instructions(func)
                        if ins.opname == "LOAD_GLOBAL"))

def norms(rows):
    out = []
    for r in rows:
        out.append(math.sqrt(sum(v * v for v in r)) / len(r))
    return out

def norms_hoisted(rows, sqrt=math.sqrt, _sum=sum, _len=len):
    out = []
    append = out.append
    for r in rows:
        append(sqrt(_sum(v * v for v in r)) / _len(r))
    return out

print("plain  :", global_lookups(norms))
print("hoisted:", global_lookups(norms_hoisted))
print(norms([[3, 4]]) == norms_hoisted([[3, 4]]))
` },
      complexity: R`<p>O(number of instructions). Note: since 3.11, <code>LOAD_GLOBAL_BUILTIN</code>/<code>LOAD_GLOBAL_MODULE</code> specializations make global lookups much cheaper, so hoisting gains are smaller than in older blog posts. Measure before uglifying code.</p>`,
      followUps: ['Use <code>timeit</code> to measure the real difference on your Python version.']
    }
  });

  practice.push({
    title: 'Code Object Report Card',
    level: 'Easy', tags: ['code objects', 'closures', 'inspect'], companies: ['Microsoft', 'Adobe'],
    statement: R`<p>Write <code>report(func)</code> returning a dict with: <code>args</code> (positional parameter names), <code>locals</code> (other local names), <code>cellvars</code> (locals captured by inner functions), <code>freevars</code> (variables this function captures from outside), and <code>kind</code>: <code>"generator"</code>, <code>"coroutine"</code> or <code>"function"</code>.</p>`,
    constraints: R`<p>Use only <code>func.__code__</code> attributes and <code>inspect</code> flag constants (<code>inspect.CO_GENERATOR</code>, <code>inspect.CO_COROUTINE</code>).</p>`,
    example: R`<p>For <code>def counter(start): count = start; def inc(): nonlocal count; ...</code>: <code>counter</code> has ${H.c('b', "cellvars ('count',)")}, while <code>inc</code> has ${H.c('p', "freevars ('count',)")}. That pair is how closures share one "cell" box.</p>`,
    brute: { why: R`<p>Parsing the function's source with string operations (looking for <code>yield</code>, <code>nonlocal</code>) breaks on comments, strings and nested functions. The compiler stored all of this precisely in the code object.</p>`, code: R`import inspect

def report_brute(func):
    src = inspect.getsource(func)
    return {"generator": "yield" in src}      # fooled by a comment saying yield
` },
    mcq: { q: 'A variable defined in <code>outer</code> and used by a nested <code>inner</code> appears in…', options: ['outer.co_cellvars and inner.co_freevars', 'outer.co_freevars and inner.co_cellvars', 'only co_names of both', 'co_consts'], answer: 0, explain: 'The owner stores it in a cell (cellvar); the nested function receives that cell in its closure (freevar) and accesses it with LOAD_DEREF.' },
    hints: [R`<p>Hint 1: positional parameters are <code>co_varnames[:co_argcount]</code>; the remaining <code>co_varnames</code> are other locals.</p>`, R`<p>Hint 2: <code>co_cellvars</code> and <code>co_freevars</code> are tuples of names. <code>func.__closure__</code> holds the actual cell objects.</p>`, R`<p>Hint 3: test flags with <code>co_flags &amp; inspect.CO_GENERATOR</code> and <code>CO_COROUTINE</code>.</p>`],
    solution: {
      approach: R`<p>Read the compiler's bookkeeping straight from the code object; flags tell the function kind.</p>`,
      code: { lang: 'python', run: true, code: R`import inspect

def report(func):
    co = func.__code__
    kind = ("generator" if co.co_flags & inspect.CO_GENERATOR else
            "coroutine" if co.co_flags & inspect.CO_COROUTINE else "function")
    return {
        "args": co.co_varnames[:co.co_argcount],
        "locals": co.co_varnames[co.co_argcount:],
        "cellvars": co.co_cellvars,
        "freevars": co.co_freevars,
        "kind": kind,
    }

def counter(start):
    count = start
    def inc(step=1):
        nonlocal count
        count += step
        return count
    return inc

inc = counter(10)
print(report(counter))
print(report(inc), "cell value:", inc.__closure__[0].cell_contents)

def gen(n):
    yield from range(n)

async def fetch():
    return 1

print(report(gen)["kind"], report(fetch)["kind"])
` },
      complexity: R`<p>O(number of names). No execution of the function needed.</p>`,
      followUps: ['Where do keyword-only parameters appear? (<code>co_kwonlyargcount</code>, right after the positional ones in <code>co_varnames</code>.)']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Which Attribute Wins?',
    level: 'Medium', tags: ['descriptors', 'attribute lookup', 'MRO'], companies: ['Stripe', 'Palantir', 'Google'],
    statement: R`<p>Write <code>lookup_source(obj, name)</code> that re-implements the decision logic of <code>object.__getattribute__</code> and returns one of: <code>"data descriptor"</code>, <code>"instance dict"</code>, <code>"non-data descriptor"</code>, <code>"class attribute"</code>, <code>"__getattr__"</code> or <code>"missing"</code>. It must agree with what Python actually does.</p>`,
    constraints: R`<p>Search <code>type(obj).__mro__</code> by reading each class's <code>__dict__</code> (do not call <code>getattr</code>, which would trigger descriptors). A data descriptor's type defines <code>__set__</code> or <code>__delete__</code>. Ignore metaclass subtleties.</p>`,
    example: R`<p>For a class with <code>@property kelvin</code>, method <code>show</code>, class attribute <code>unit</code>, and an instance dict containing <code>kelvin</code>, <code>show</code>, <code>c</code>: ${H.table(['name', 'answer'], [['kelvin', 'data descriptor'], ['show', 'instance dict'], ['c', 'instance dict'], ['unit', 'class attribute'], ['nope', '__getattr__ (if defined) else missing']])}</p>`,
    brute: { why: R`<p>Calling <code>getattr(obj, name)</code> and comparing the result with <code>obj.__dict__</code> or the class dict cannot distinguish cases where values coincide, and it executes property getters (side effects, exceptions). You need to inspect the raw dictionaries in the right order.</p>`, code: R`def lookup_source_brute(obj, name):
    value = getattr(obj, name, None)                # runs descriptors!
    if name in vars(obj) and vars(obj)[name] is value:
        return "instance dict"
    return "class something"
` },
    mcq: { q: 'An instance dict has key <code>"x"</code> and the class has a property <code>x</code>. What does <code>obj.x</code> return?', options: ['The property getter result', 'The instance dict value', 'Whichever was set last', 'AttributeError'], answer: 0, explain: 'property is a data descriptor (it defines __set__), and data descriptors take precedence over the instance dict.' },
    hints: [R`<p>Hint 1: find the class attribute first: <code>for k in type(obj).__mro__: if name in k.__dict__: attr = k.__dict__[name]; break</code>.</p>`, R`<p>Hint 2: check descriptor-ness on the attribute's <b>type</b>: <code>hasattr(type(attr), "__set__")</code>, <code>hasattr(type(attr), "__get__")</code>.</p>`, R`<p>Hint 3: follow the order data descriptor → instance dict → non-data descriptor → class attribute → <code>__getattr__</code> on the type → missing. Use <code>getattr(obj, "__dict__", {})</code> for slotted objects.</p>`],
    solution: {
      approach: R`<p>Replicate CPython's <code>_PyObject_GenericGetAttrWithDict</code> decision order using raw <code>__dict__</code> reads, never triggering descriptors. Verify the answers against actual attribute access.</p>`,
      code: { lang: 'python', run: true, code: R`_MISSING = object()

def lookup_source(obj, name):
    tp = type(obj)
    attr = _MISSING
    for klass in tp.__mro__:                         # step 1: class-level search
        if name in klass.__dict__:
            attr = klass.__dict__[name]
            break
    attr_type = type(attr)
    if attr is not _MISSING and (hasattr(attr_type, "__set__") or hasattr(attr_type, "__delete__")):
        return "data descriptor"                     # step 2
    inst = getattr(obj, "__dict__", {})
    if name in inst:
        return "instance dict"                       # step 3
    if attr is not _MISSING and hasattr(attr_type, "__get__"):
        return "non-data descriptor"                 # step 4
    if attr is not _MISSING:
        return "class attribute"                     # step 5
    if any("__getattr__" in k.__dict__ for k in tp.__mro__):
        return "__getattr__"                         # step 6
    return "missing"

class Temp:
    unit = "C"
    def __init__(self, c):
        self.c = c
    @property
    def kelvin(self):
        return self.c + 273.15
    def show(self):
        return "method"
    def __getattr__(self, name):
        return f"<no {name}>"

t = Temp(21)
t.__dict__.update(kelvin=0, show="shadowed")
for n in ["kelvin", "show", "c", "unit", "nope", "__init__"]:
    print(f"{n:<9} {lookup_source(t, n):<20} actual={getattr(t, n)!r}"[:70])
` },
      dry: { head: ['name', 'class attr found', 'data desc?', 'in inst dict?', 'answer'], rows: [['kelvin', 'property', 'yes', '(yes, ignored)', 'data descriptor'], ['show', 'function', 'no', 'yes', 'instance dict'], ['unit', '"C"', 'no', 'no', 'class attribute'], ['__init__', 'function', 'no', 'no', 'non-data descriptor'], ['nope', '—', '—', 'no', '__getattr__']] },
      complexity: R`<p>O(length of the MRO) per lookup. CPython makes step 1 O(1) on average with its per-type attribute cache.</p>`,
      followUps: ['Extend it for lookups on classes (<code>Temp.kelvin</code>), which involve the metaclass.']
    }
  });

  practice.push({
    title: 'Re-implement cached_property',
    level: 'Medium', tags: ['descriptors', 'caching', 'non-data descriptor'], companies: ['Dropbox', 'Instagram'],
    statement: R`<p>Implement a decorator class <code>cached</code> that behaves like <code>functools.cached_property</code>: the first access computes the value and stores it in the instance's <code>__dict__</code>; later accesses never call the function again; <code>del obj.attr</code> forces recomputation; accessing on the class returns the descriptor.</p>`,
    constraints: R`<p>Must be a <b>non-data</b> descriptor (only <code>__get__</code>, plus <code>__set_name__</code>). Raise <code>TypeError</code> with a clear message if the instance has no <code>__dict__</code> (slots).</p>`,
    example: R`<p><code>r.total</code> twice prints "computing" ${H.c('g', 'once')}; after <code>del r.total</code>, the next access computes again.</p>`,
    brute: { why: R`<p>A property with a manual <code>if self._cache is None</code> check works per attribute but needs boilerplate everywhere, and since property is a <b>data</b> descriptor every access still goes through a Python-level getter call. The non-data trick lets the instance dict serve cached values at full attribute speed.</p>`, code: R`class ReportSlow:
    def __init__(self):
        self._total = None
    @property
    def total(self):                       # getter runs on every access
        if self._total is None:
            self._total = sum(range(1000))
        return self._total
` },
    mcq: { q: 'Why does a cached value stored in <code>obj.__dict__["total"]</code> bypass the descriptor next time?', options: ['Non-data descriptors lose to the instance dict in lookup order', 'Python deletes the descriptor after first use', '__dict__ is checked before the class for all descriptors', 'Because __set_name__ renamed it'], answer: 0, explain: 'Step 3 (instance dict) comes before step 4 (non-data descriptor). Data descriptors would still win, which is why cached must NOT define __set__.' },
    hints: [R`<p>Hint 1: store the function in <code>__init__</code>, learn the attribute name in <code>__set_name__</code>.</p>`, R`<p>Hint 2: in <code>__get__</code>: if <code>obj is None</code> return self; compute <code>value = self.func(obj)</code>; write <code>obj.__dict__[self.name] = value</code>; return value.</p>`, R`<p>Hint 3: <code>getattr(obj, "__dict__", None)</code> is None for slotted classes, so raise TypeError there. Do not define <code>__set__</code> or <code>__delete__</code>: <code>del obj.total</code> then just deletes the dict key.</p>`],
    solution: {
      approach: R`<p>A non-data descriptor that writes its result into the instance dict under its own name, so the normal lookup order turns later accesses into a plain dict hit.</p>`,
      code: { lang: 'python', run: true, code: R`class cached:
    def __init__(self, func):
        self.func = func
        self.__doc__ = func.__doc__

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        d = getattr(obj, "__dict__", None)
        if d is None:
            raise TypeError(f"cannot cache {self.name!r}: instance has no __dict__")
        value = self.func(obj)
        d[self.name] = value              # next lookup hits the instance dict
        return value

class Report:
    calls = 0
    @cached
    def total(self):
        Report.calls += 1
        return sum(range(1_000))

r = Report()
print(r.total, r.total, "computations:", Report.calls)
del r.total                               # just removes the dict entry
print(r.total, "computations:", Report.calls)
print(type(Report.total).__name__)
` },
      complexity: R`<p>First access: cost of the function. Later accesses: an ordinary attribute lookup (dict hit), no Python-level call.</p>`,
      followUps: ['Make it thread-safe for expensive computations without a global lock (per-instance lock, or accept double computation like the stdlib does since 3.12).']
    }
  });

  practice.push({
    title: 'Count Live Instances per Class',
    level: 'Medium', tags: ['metaclass', 'weakref', '__call__'], companies: ['Microsoft', 'Unity'],
    statement: R`<p>Create a metaclass <code>Tracked</code> so that every class using it records <b>live</b> instances: <code>Cls.live()</code> returns how many instances currently exist, and <code>Cls.created</code> how many were ever created. Instances must not be kept alive by the tracking.</p>`,
    constraints: R`<p>Each class (including subclasses) has its own counters. Use <code>weakref.WeakSet</code>. Do not require any code in the user classes' <code>__init__</code>.</p>`,
    example: R`<p>Create 3 <code>Bullet</code>s, delete 2 → ${H.c('g', 'Bullet.live() = 1, Bullet.created = 3')}.</p>`,
    brute: { why: R`<p>Appending instances to a plain list in <code>__init__</code> keeps every object alive forever (a memory leak) and must be repeated in each class. Counting in <code>__del__</code> is unreliable with cycles and resurrection.</p>`, code: R`class BulletLeaky:
    all = []
    def __init__(self):
        BulletLeaky.all.append(self)       # strong refs: nothing is ever freed
` },
    mcq: { q: 'Which hook sees every instance creation of every class using the metaclass?', options: ['<code>Tracked.__call__</code>', '<code>Tracked.__init__</code>', '<code>Tracked.__prepare__</code>', '<code>object.__init_subclass__</code>'], answer: 0, explain: 'Calling a class runs type(cls).__call__. Meta.__init__ runs once per class creation, __prepare__ before the class body.' },
    hints: [R`<p>Hint 1: in <code>Tracked.__init__</code> (once per class) give the class its own <code>_instances = weakref.WeakSet()</code> and <code>created = 0</code>.</p>`, R`<p>Hint 2: override <code>__call__</code>: <code>obj = super().__call__(*a, **kw)</code>, add to <code>cls._instances</code>, increment <code>cls.created</code>.</p>`, R`<p>Hint 3: define <code>live</code> as a method on the <b>metaclass</b>, so <code>Bullet.live()</code> works but instances do not get it.</p>`],
    solution: {
      approach: R`<p>Per-class state is created in the metaclass's <code>__init__</code>, every instantiation passes through the metaclass's <code>__call__</code>, and a <code>WeakSet</code> tracks liveness without owning objects. <code>live</code> is a metaclass method, visible on classes only.</p>`,
      code: { lang: 'python', run: true, code: R`import weakref

class Tracked(type):
    def __init__(cls, name, bases, ns, **kw):
        super().__init__(name, bases, ns, **kw)
        cls._instances = weakref.WeakSet()    # each class gets its own
        cls.created = 0

    def __call__(cls, *args, **kwargs):
        obj = super().__call__(*args, **kwargs)
        cls._instances.add(obj)
        cls.created += 1
        return obj

    def live(cls):                            # metaclass method: class-only
        return len(cls._instances)

class Bullet(metaclass=Tracked):
    def __init__(self, speed):
        self.speed = speed

class Rocket(Bullet):
    pass

shots = [Bullet(i) for i in range(3)]
r = Rocket(9)
del shots[:2]
print("Bullet live/created:", Bullet.live(), Bullet.created)
print("Rocket live/created:", Rocket.live(), Rocket.created)
print("instances see live()?", hasattr(r, "live"))
` },
      complexity: R`<p>O(1) per instantiation. Memory: one weak reference per live instance; entries vanish automatically when instances die.</p>`,
      followUps: ['Implement the same with <code>__init_subclass__</code> plus overriding <code>__new__</code> on a base class. What changes?']
    }
  });

  practice.push({
    title: 'Leak-Free Event Bus with Weak Methods',
    level: 'Medium', tags: ['weakref', 'refcount', 'observer'], companies: ['Spotify', 'Discord', 'Uber'],
    statement: R`<p>Build <code>EventBus</code> with <code>subscribe(callback)</code> and <code>publish(event)</code>. Subscribers are usually bound methods of UI or service objects; the bus must <b>not</b> keep those objects alive. When a subscriber object is garbage collected, its callback silently disappears.</p>`,
    constraints: R`<p>Support both plain functions (kept strongly) and bound methods (kept weakly). Publishing must skip and clean up dead entries.</p>`,
    example: R`<p>Two widgets subscribe; one is deleted; publishing <code>"tick"</code> reaches ${H.c('g', 'only the live widget')} and the dead widget's entry is dropped (plain-function subscribers such as a logger stay).</p>`,
    brute: { why: R`<p>Storing callbacks in a plain list holds a strong reference to each bound method, and a bound method holds <code>__self__</code>. Every subscriber therefore lives as long as the bus: the classic observer-pattern leak. <code>weakref.ref(obj.method)</code> does not work either: the bound method object is temporary and dies immediately.</p>`, code: R`class LeakyBus:
    def __init__(self):
        self.subs = []
    def subscribe(self, cb):
        self.subs.append(cb)              # bound method -> keeps its object alive
    def publish(self, event):
        for cb in self.subs:
            cb(event)
` },
    mcq: { q: 'Why does <code>weakref.ref(widget.on_event)</code> die immediately?', options: ['The bound method is a temporary object created on attribute access', 'Widgets cannot be weakly referenced', 'Methods are immortal', 'weakref only works on functions'], answer: 0, explain: 'Each widget.on_event creates a new bound-method object; nothing else references it, so the weakref dies at once. WeakMethod stores weak refs to the object and the function separately.' },
    hints: [R`<p>Hint 1: <code>weakref.WeakMethod(bound)</code> recreates the bound method on call and returns None once <code>__self__</code> is dead.</p>`, R`<p>Hint 2: detect bound methods with <code>hasattr(cb, "__self__") and hasattr(cb, "__func__")</code>; wrap plain functions in a lambda that returns them, so both kinds look like "call me to get the callback".</p>`, R`<p>Hint 3: in <code>publish</code>, build a new list of live entries while dispatching; replace the old list at the end.</p>`],
    solution: {
      approach: R`<p>Store "resolvers": for bound methods a <code>WeakMethod</code>, for functions a strong closure. Publishing resolves each; dead ones are dropped. No subscriber's lifetime is extended by the bus.</p>`,
      code: { lang: 'python', run: true, code: R`import weakref

class EventBus:
    def __init__(self):
        self._subs = []

    def subscribe(self, cb):
        if hasattr(cb, "__self__") and hasattr(cb, "__func__"):
            self._subs.append(weakref.WeakMethod(cb))     # weak to the object
        else:
            self._subs.append(lambda cb=cb: cb)           # plain function: strong
        return cb

    def publish(self, event):
        alive = []
        for resolve in self._subs:
            cb = resolve()
            if cb is None:
                continue                                  # subscriber was collected
            alive.append(resolve)
            cb(event)
        self._subs = alive

    def __len__(self):
        return len(self._subs)

class Widget:
    def __init__(self, name):
        self.name = name
    def on_event(self, event):
        print(f"  {self.name} got {event}")

bus = EventBus()
a, b = Widget("A"), Widget("B")
bus.subscribe(a.on_event)
bus.subscribe(b.on_event)
bus.subscribe(lambda e: print("  logger got", e))
bus.publish("tick-1")
del b                                    # B's only strong reference is gone
bus.publish("tick-2")
print("subscribers left:", len(bus))
` },
      complexity: R`<p>O(S) per publish for S subscribers, including cleanup. Memory O(live subscribers).</p>`,
      followUps: ['Add <code>weakref.WeakMethod(cb, callback)</code> to remove dead entries eagerly instead of at the next publish.']
    }
  });

  practice.push({
    title: 'Lazy Attributes for a Module (PEP 562)',
    level: 'Medium', tags: ['import system', 'module __getattr__', 'startup time'], companies: ['Netflix', 'Databricks'],
    statement: R`<p>Write <code>make_lazy_module(name, mapping)</code> returning a module object where accessing <code>mod.attr</code> imports <code>mapping[attr]</code> (a <code>"module:attribute"</code> string) on first use only, caches it in the module's namespace, and raises <code>AttributeError</code> for unknown names. <code>dir(mod)</code> should list the lazy names.</p>`,
    constraints: R`<p>Use <code>types.ModuleType</code> and a module-level <code>__getattr__</code>/<code>__dir__</code> (PEP 562). Register it in <code>sys.modules</code> so <code>import name</code> works.</p>`,
    example: R`<p><code>tools = make_lazy_module("tools", {"dumps": "json:dumps"})</code>; <code>"dumps" in vars(tools)</code> is ${H.c('r', 'False')} until the first <code>tools.dumps(...)</code> call, then ${H.c('g', 'True')}.</p>`,
    brute: { why: R`<p>Importing everything eagerly at the top of a package's <code>__init__.py</code> makes <code>import mypkg</code> pay for heavy dependencies (pandas, torch) even when the user only needs one small helper. CLIs feel slow; <code>python -X importtime</code> shows the culprit.</p>`, code: R`import types
import importlib

def make_eager_module(name, mapping):
    mod = types.ModuleType(name)
    for attr, target in mapping.items():
        modname, _, obj = target.partition(":")
        setattr(mod, attr, getattr(importlib.import_module(modname), obj))  # all upfront
    return mod
` },
    mcq: { q: 'When does a module-level <code>__getattr__</code> run?', options: ['Only when normal lookup in the module dict fails', 'On every attribute access', 'Only at import time', 'Only for names starting with an underscore'], answer: 0, explain: 'PEP 562: module attribute access first checks the module __dict__; only if the name is missing is __getattr__ called. Caching the result in the dict makes later accesses normal.' },
    hints: [R`<p>Hint 1: create <code>mod = types.ModuleType(name)</code>, then define <code>def __getattr__(attr): ...</code> and store it as <code>mod.__getattr__</code> (it lives in the module dict).</p>`, R`<p>Hint 2: inside, look up <code>mapping[attr]</code>, <code>importlib.import_module</code> the module part, <code>getattr</code> the object part, then <code>setattr(mod, attr, value)</code> to cache.</p>`, R`<p>Hint 3: unknown attr → <code>raise AttributeError(f"module {name!r} has no attribute {attr!r}")</code>. <code>__dir__</code> returns sorted module dict keys plus mapping keys.</p>`],
    solution: {
      approach: R`<p>PEP 562 gives modules a fallback <code>__getattr__</code>. We resolve on first access and cache into the module dict so subsequent accesses are ordinary dict lookups.</p>`,
      code: { lang: 'python', run: true, code: R`import importlib
import sys
import types

def make_lazy_module(name, mapping):
    mod = types.ModuleType(name)

    def __getattr__(attr):
        try:
            target = mapping[attr]
        except KeyError:
            raise AttributeError(f"module {name!r} has no attribute {attr!r}") from None
        modname, _, objname = target.partition(":")
        value = getattr(importlib.import_module(modname), objname)
        setattr(mod, attr, value)               # cache: next access is a dict hit
        return value

    def __dir__():
        return sorted(set(vars(mod)) | set(mapping))

    mod.__getattr__ = __getattr__
    mod.__dir__ = __dir__
    sys.modules[name] = mod
    return mod

tools = make_lazy_module("tools", {"dumps": "json:dumps", "sqrt": "math:sqrt"})
print("loaded before use?", "dumps" in vars(tools))
import tools as t2                              # sys.modules hit
print(t2.dumps({"a": 1}), t2.sqrt(16.0))
print("loaded after use? ", "dumps" in vars(tools))
print([n for n in dir(tools) if not n.startswith("__")])
try:
    tools.nope
except AttributeError as e:
    print("AttributeError:", e)
del sys.modules["tools"]
` },
      complexity: R`<p>First access: one import (possibly already cached in <code>sys.modules</code>). Later: O(1) dict lookup. Start-up cost moves to first use.</p>`,
      followUps: ['Compare with <code>importlib.util.LazyLoader</code> and with the <code>lazy import</code> syntax from PEP 810.']
    }
  });

  practice.push({
    title: '__slots__ vs __dict__: Measure the Memory',
    level: 'Medium', tags: ['object model', 'tracemalloc', '__slots__'], companies: ['Amazon', 'Two Sigma', 'Citadel'],
    statement: R`<p>Write <code>bytes_per_instance(cls, n=10_000)</code> that measures, with <code>tracemalloc</code>, the average memory allocated per instance when creating <code>n</code> instances of <code>cls</code> (each with three int attributes set in <code>__init__</code>). Compare a regular class, a <code>__slots__</code> class and a <code>@dataclass(slots=True)</code>.</p>`,
    constraints: R`<p>Exclude allocations that existed before the measurement. Keep the instances alive until measured. Results vary by version (3.11+ inline values shrank regular instances), so report numbers, do not hard-code them.</p>`,
    example: R`<p>Typical 3.13 numbers: regular ≈ 90–100 bytes, slots ≈ 55–60 bytes (attribute values are small cached ints, so they add nothing). Older versions (≤ 3.10) showed regular instances at 150+ bytes because each had a real dict.</p>`,
    brute: { why: R`<p><code>sys.getsizeof(obj)</code> is shallow: for a regular class it ignores the attribute storage (and the result changed across versions), so it can even suggest slots save nothing. Measuring real allocations is the reliable approach.</p>`, code: R`import sys

class P:
    def __init__(self):
        self.x, self.y, self.z = 1, 2, 3

print(sys.getsizeof(P()))          # shallow: misses attribute storage
` },
    mcq: { q: 'What does <code>__slots__ = ("x", "y")</code> remove from each instance?', options: ['The per-instance __dict__ (and __weakref__ unless listed)', 'The type pointer', 'The reference count', 'Nothing, it only speeds up access'], answer: 0, explain: 'Slots store attributes at fixed offsets via member descriptors, so no per-instance dict is needed. Every object still has a refcount and type pointer.' },
    hints: [R`<p>Hint 1: <code>tracemalloc.start()</code>, take <code>get_traced_memory()[0]</code> before and after creating the list of instances.</p>`, R`<p>Hint 2: subtract the list's own size (about <code>8 * n</code> bytes of pointers plus a header) by pre-building <code>[None] * n</code> and filling it.</p>`, R`<p>Hint 3: call <code>gc.collect()</code> before measuring and <code>tracemalloc.stop()</code> afterwards; divide by n.</p>`],
    solution: {
      approach: R`<p>Pre-allocate the holder list so it does not count, then measure the allocation delta while creating n instances. Divide by n. Compare three class styles.</p>`,
      code: { lang: 'python', run: true, code: R`import gc
import tracemalloc
from dataclasses import dataclass

class Regular:
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z

class Slotted:
    __slots__ = ("x", "y", "z")
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z

@dataclass(slots=True)
class DataSlotted:
    x: int
    y: int
    z: int

def bytes_per_instance(cls, n=10_000):
    holder = [None] * n                   # allocate the container first
    gc.collect()
    tracemalloc.start()
    before = tracemalloc.get_traced_memory()[0]
    for i in range(n):
        holder[i] = cls(1, 2, 3)          # small ints: cached, add no memory
    after = tracemalloc.get_traced_memory()[0]
    tracemalloc.stop()
    return (after - before) / n

for cls in (Regular, Slotted, DataSlotted):
    print(f"{cls.__name__:<12} ~{bytes_per_instance(cls):6.1f} bytes/instance")
` },
      complexity: R`<p>O(n) time; memory for n instances during the measurement.</p>`,
      followUps: ['Why can slotted instances not be weakly referenced by default, and how do you allow it? (add <code>"__weakref__"</code> to slots)']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Find Reference Cycles Among Your Objects',
    level: 'Hard', tags: ['gc', 'graph', 'Tarjan SCC'], companies: ['Meta', 'Dropbox', 'Datadog'],
    statement: R`<p>Given a dict <code>objs</code> of <code>label → object</code> (your own class instances), return every <b>reference cycle</b> among them as a sorted list of labels. Object A "points to" B if B can be reached from A through <code>gc.get_referents</code>, passing only through plain containers (<code>dict</code>, <code>list</code>, <code>tuple</code>, <code>set</code>) that are not themselves in <code>objs</code>. A self-reference counts as a cycle.</p>`,
    constraints: R`<p>Up to 10<sup>4</sup> objects. Do not walk into types, modules or functions. Must work whether instances store attributes in a real <code>__dict__</code> (≤ 3.10) or inline values (3.11+), which changes what <code>gc.get_referents</code> returns.</p>`,
    example: R`<p>a ⇄ b, c → c, d → e, f → [g] (a list) and g → f ⇒ ${H.c('r', "[['a', 'b'], ['c'], ['f', 'g']]")}. d and e are not in a cycle.</p>`,
    brute: { why: R`<p>For every pair (A, B) run a reachability search A ⇝ B and B ⇝ A: O(N² · (N + E)). Strongly connected components (Tarjan or Kosaraju) find all cycles in one O(N + E) pass once the object graph is built.</p>`, code: R`import gc

def reaches(src, dst, ids):
    stack, seen = [src], set()
    while stack:
        cur = stack.pop()
        for r in gc.get_referents(cur):
            if r is dst:
                return True
            if id(r) not in seen and isinstance(r, (dict, list, tuple, set)):
                seen.add(id(r))
                stack.append(r)
            elif id(r) in ids and id(r) not in seen:
                seen.add(id(r))
                stack.append(r)
    return False

def cycles_brute(objs):
    ids = {id(o) for o in objs.values()}
    labels = list(objs)
    return [(x, y) for i, x in enumerate(labels) for y in labels[i:]
            if reaches(objs[x], objs[y], ids) and reaches(objs[y], objs[x], ids)]
` },
    mcq: { q: 'Why must the edge builder pass through plain dicts and lists?', options: ['References often go via a container (an attribute dict or a list attribute) rather than directly', 'gc.get_referents only returns dicts', 'To include every object in the program', 'Because tuples are immortal'], answer: 0, explain: 'f.items = [g] means f → list → g. Depending on the version, attributes may also sit in a __dict__ dict. Walking through plain containers recovers the logical edge f → g.' },
    hints: [R`<p>Hint 1: build the graph: for each object, BFS over <code>gc.get_referents</code>; when you hit an object in your set, add an edge and stop there; when you hit a plain container not in the set, keep walking; ignore everything else.</p>`, R`<p>Hint 2: run Tarjan's SCC (or Kosaraju) on the label graph. An SCC with more than one node, or one node with a self-edge, is a cycle.</p>`, R`<p>Hint 3: key objects by <code>id()</code> while they are alive; keep a <code>seen</code> set of container ids per BFS so you do not loop through container cycles. Sort labels inside each cycle and the list of cycles.</p>`],
    solution: {
      approach: R`<p>Two phases. (1) Edge extraction: BFS from each object through referents, crossing plain containers, stopping at tracked objects. (2) Tarjan's algorithm (iterative-friendly recursion is fine at this size) to find strongly connected components; report SCCs that are real cycles.</p>`,
      code: { lang: 'python', run: true, code: R`import gc
from collections import deque

PLAIN = (dict, list, tuple, set, frozenset)

def build_edges(objs):
    by_id = {id(o): label for label, o in objs.items()}
    edges = {label: set() for label in objs}
    for label, obj in objs.items():
        seen, queue = set(), deque(gc.get_referents(obj))
        while queue:
            r = queue.popleft()
            rid = id(r)
            if rid in by_id:
                edges[label].add(by_id[rid])          # reached a tracked object
            elif isinstance(r, PLAIN) and rid not in seen:
                seen.add(rid)
                queue.extend(gc.get_referents(r))      # walk through plumbing
    return edges

def find_cycles(objs):
    edges = build_edges(objs)
    index, low, on_stack, stack, out, counter = {}, {}, set(), [], [], [0]

    def strongconnect(v):
        index[v] = low[v] = counter[0]; counter[0] += 1
        stack.append(v); on_stack.add(v)
        for w in edges[v]:
            if w not in index:
                strongconnect(w)
                low[v] = min(low[v], low[w])
            elif w in on_stack:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:                         # v is an SCC root
            comp = []
            while True:
                w = stack.pop(); on_stack.discard(w); comp.append(w)
                if w == v:
                    break
            if len(comp) > 1 or v in edges[v]:
                out.append(sorted(comp))

    for v in edges:
        if v not in index:
            strongconnect(v)
    return sorted(out)

class Node:
    def __init__(self, name):
        self.name = name
        self.link = None
        self.items = []

a, b, c, d, e, f, g = (Node(x) for x in "abcdefg")
a.link, b.link = b, a                 # a <-> b
c.link = c                            # self-cycle
d.link = e                            # chain, no cycle
f.items = [g]; g.link = f             # cycle through a list
objs = dict(a=a, b=b, c=c, d=d, e=e, f=f, g=g)
print(find_cycles(objs))
` },
      complexity: R`<p>Edge building O(total referents visited); Tarjan O(N + E). Memory O(N + E).</p>`,
      followUps: ['Break each cycle automatically by converting one edge to a <code>weakref</code>. Which edge would you pick in a parent/child tree?', 'Why might <code>gc.get_referents</code> miss references held by C extension objects that do not implement <code>tp_traverse</code>?']
    }
  });

  practice.push({
    title: 'Compile Expressions to Stack Bytecode with ast',
    level: 'Hard', tags: ['ast', 'compiler', 'stack machine'], companies: ['Jane Street', 'Hudson River Trading', 'Google'],
    statement: R`<p>Write <code>compile_expr(src)</code> that parses a Python arithmetic expression with <code>ast</code> and emits a list of instructions for a stack machine (<code>LOAD_CONST</code>, <code>LOAD_NAME</code>, <code>BINARY_OP op</code>, <code>UNARY_NEG</code>), performing <b>constant folding</b> like CPython. Then write <code>execute(code, env)</code> and check your results against <code>eval</code> on many random expressions.</p>`,
    constraints: R`<p>Support <code>+ - * / // % **</code>, unary minus/plus, parentheses, int/float constants and variable names. Reject anything else (calls, attributes) with <code>ValueError</code>. Do not fold operations that raise (e.g. <code>1 / 0</code>).</p>`,
    example: R`<p><code>"x * (2 + 3) - -4"</code> → ${H.c('b', "[LOAD_NAME x, LOAD_CONST 5, BINARY_OP *, LOAD_CONST 4, BINARY_OP +]")}? No! Subtracting −4 folds the unary minus into the constant −4, giving <code>LOAD_CONST -4, BINARY_OP -</code>. With x = 2 the result is ${H.c('g', '14')}.</p>`,
    brute: { why: R`<p>Calling <code>eval(src)</code> gives the answer but no bytecode and runs arbitrary code. A hand-written string parser with precedence rules is long and buggy. The <code>ast</code> module already gives a correct tree; the remaining work is a post-order walk, exactly what CPython's code generator does.</p>`, code: R`def compile_with_eval(src, env):
    return eval(src, {"__builtins__": {}}, env)       # no bytecode, unsafe in general

print(compile_with_eval("x * (2 + 3)", {"x": 2}))
` },
    mcq: { q: 'In which order must a post-order code generator emit <code>a - b</code>?', options: ['code(a), code(b), BINARY_OP -', 'BINARY_OP -, code(a), code(b)', 'code(b), code(a), BINARY_OP -', 'code(a), BINARY_OP -, code(b)'], answer: 0, explain: 'Operands first (left then right), operator last. The VM pops b (top) then a and computes a − b.' },
    hints: [R`<p>Hint 1: <code>ast.parse(src, mode="eval").body</code> is the root. Map <code>ast.Add</code>, <code>ast.Sub</code>… to symbols and Python functions from <code>operator</code>.</p>`, R`<p>Hint 2: write <code>fold(node)</code> returning either <code>("const", value)</code> or a list of instructions. For a BinOp whose both sides are constants, try computing; on exception keep the instructions (like CPython).</p>`, R`<p>Hint 3: the VM is the classic loop: push constants/names, pop two for BINARY_OP (right first), negate for UNARY_NEG. Test with a seeded random generator of expressions over a few names, skipping cases where <code>eval</code> raises.</p>`],
    solution: {
      approach: R`<p>A recursive emitter over the AST that returns constants when sub-trees are constant (folding), and instruction lists otherwise. The VM executes the list with a value stack. A randomized differential test against <code>eval</code> gives confidence.</p>`,
      code: { lang: 'python', run: true, code: R`import ast
import operator
import random

OPS = {ast.Add: ("+", operator.add), ast.Sub: ("-", operator.sub),
       ast.Mult: ("*", operator.mul), ast.Div: ("/", operator.truediv),
       ast.FloorDiv: ("//", operator.floordiv), ast.Mod: ("%", operator.mod),
       ast.Pow: ("**", operator.pow)}
FUNCS = {sym: fn for sym, fn in OPS.values()}

def compile_expr(src):
    def gen(node):
        """Return ('const', v) for constant subtrees, else ('code', [instructions])."""
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return ("const", node.value)
        if isinstance(node, ast.Name):
            return ("code", [("LOAD_NAME", node.id)])
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            kind, val = gen(node.operand)
            if isinstance(node.op, ast.UAdd):
                return (kind, val)
            if kind == "const":
                return ("const", -val)                       # fold -4
            return ("code", val + [("UNARY_NEG", None)])
        if isinstance(node, ast.BinOp) and type(node.op) in OPS:
            sym, fn = OPS[type(node.op)]
            left, right = gen(node.left), gen(node.right)
            if left[0] == "const" and right[0] == "const":
                try:
                    return ("const", fn(left[1], right[1]))    # fold if it succeeds
                except (ArithmeticError, ValueError):
                    pass
            def code(part):
                return [("LOAD_CONST", part[1])] if part[0] == "const" else part[1]
            return ("code", code(left) + code(right) + [("BINARY_OP", sym)])
        raise ValueError(f"unsupported syntax: {ast.dump(node)[:40]}")

    kind, val = gen(ast.parse(src, mode="eval").body)
    return [("LOAD_CONST", val)] if kind == "const" else val

def execute(code, env):
    stack = []
    for op, arg in code:
        if op == "LOAD_CONST":
            stack.append(arg)
        elif op == "LOAD_NAME":
            stack.append(env[arg])
        elif op == "UNARY_NEG":
            stack.append(-stack.pop())
        else:
            right, left = stack.pop(), stack.pop()
            stack.append(FUNCS[arg](left, right))
    return stack.pop()

prog = compile_expr("x * (2 + 3) - -4")
print(prog, "->", execute(prog, {"x": 2}))
print(compile_expr("24 * 60 * 60"), compile_expr("1 / 0 + x"))

rng = random.Random(7)
def rand_expr(depth=0):
    if depth > 3 or rng.random() < 0.3:
        return rng.choice(["x", "y", str(rng.randint(1, 9))])
    op = rng.choice(["+", "-", "*", "//", "%"])
    return f"({rand_expr(depth + 1)} {op} {rand_expr(depth + 1)})"

ok = total = 0
for _ in range(500):
    src, env = rand_expr(), {"x": rng.randint(-5, 5), "y": rng.randint(1, 5)}
    try:
        expected = eval(src, {}, env)
    except ZeroDivisionError:
        continue
    total += 1
    ok += execute(compile_expr(src), env) == expected
print(f"differential test: {ok}/{total} match eval")
` },
      complexity: R`<p>Compile O(n) in the AST size; execute O(instructions). Folding can shrink the program dramatically for constant-heavy expressions.</p>`,
      followUps: ['Add comparisons and short-circuit <code>and</code>/<code>or</code> (needs jump instructions).', 'Why does CPython refuse to fold <code>2 ** 10_000_000</code>? Add a size guard.']
    }
  });

  practice.push({
    title: 'Block Forbidden Imports with a Meta Path Hook',
    level: 'Hard', tags: ['import system', 'sys.meta_path', 'context manager'], companies: ['Anthropic', 'OpenAI', 'Replit'],
    statement: R`<p>Implement a context manager <code>block_imports(*names)</code>. Inside the block, importing any blocked module or any submodule of a blocked package raises <code>ImportError("import of 'X' is blocked")</code>, <b>even if the module was already imported earlier</b>. On exit, everything is restored exactly. (Used for tests that assert code paths never touch the network, or for plugin linting.)</p>`,
    constraints: R`<p>Must be first on <code>sys.meta_path</code> while active. Must temporarily hide already-loaded blocked modules from <code>sys.modules</code> and restore them afterwards. Not a security sandbox: document why.</p>`,
    example: R`<p>Inside <code>with block_imports("socket", "ctypes"):</code> → <code>import socket</code> and <code>import ctypes.util</code> raise ${H.c('r', 'ImportError')}; <code>import json</code> works. After the block, <code>import socket</code> ${H.c('g', 'works again')}.</p>`,
    brute: { why: R`<p>Monkey-patching <code>builtins.__import__</code> catches <code>import</code> statements but misses <code>importlib.import_module</code>, interacts badly with other patchers, and is slower for every import. Forgetting the <code>sys.modules</code> cache is the other classic hole: an already-imported module is returned without consulting any finder.</p>`, code: R`import builtins

_real_import = builtins.__import__

def guarded_import(name, *args, **kwargs):
    if name.split(".")[0] in {"socket"}:
        raise ImportError(f"blocked {name}")
    return _real_import(name, *args, **kwargs)

builtins.__import__ = guarded_import          # global patch, misses importlib paths
builtins.__import__ = _real_import            # (restored immediately in this demo)
` },
    mcq: { q: 'Why is hiding blocked entries in <code>sys.modules</code> necessary?', options: ['A cached module is returned before any finder is consulted', 'Finders only run for packages', 'sys.modules is read-only', 'It speeds up the import'], answer: 0, explain: 'Step 1 of import is the sys.modules lookup. If socket is cached, your finder never runs, so the block would be silently bypassed.' },
    hints: [R`<p>Hint 1: a finder whose <code>find_spec</code> raises <code>ImportError</code> for blocked names (check <code>name == b or name.startswith(b + ".")</code>) and returns <code>None</code> otherwise.</p>`, R`<p>Hint 2: on enter, pop blocked names (and their submodules) out of <code>sys.modules</code> into a stash; insert the finder at index 0 of <code>sys.meta_path</code>.</p>`, R`<p>Hint 3: on exit (in <code>finally</code>), remove the finder, delete any blocked entries that appeared meanwhile, and put the stash back. Use <code>contextlib.contextmanager</code>.</p>`],
    solution: {
      approach: R`<p>A meta path finder that vetoes blocked names, plus temporary removal of cached modules so the finder is actually consulted. Everything is undone in <code>finally</code>. It is a guard rail for tests, not a sandbox: code can still reach the stashed module objects through other references (e.g. <code>sys.modules</code> of another module's attributes, <code>gc.get_objects()</code>), and C extensions can do anything.</p>`,
      code: { lang: 'python', run: true, code: R`import contextlib
import importlib
import importlib.abc
import sys

class _Blocker(importlib.abc.MetaPathFinder):
    def __init__(self, names):
        self.names = names

    def blocked(self, fullname):
        return any(fullname == n or fullname.startswith(n + ".") for n in self.names)

    def find_spec(self, fullname, path=None, target=None):
        if self.blocked(fullname):
            raise ImportError(f"import of {fullname!r} is blocked")
        return None                                   # let other finders work

@contextlib.contextmanager
def block_imports(*names):
    finder = _Blocker(names)
    stash = {k: sys.modules.pop(k) for k in list(sys.modules) if finder.blocked(k)}
    sys.meta_path.insert(0, finder)
    try:
        yield finder
    finally:
        sys.meta_path.remove(finder)
        for k in [k for k in sys.modules if finder.blocked(k)]:
            del sys.modules[k]                        # anything loaded meanwhile
        sys.modules.update(stash)

import socket                                         # loaded BEFORE the block
with block_imports("socket", "ctypes"):
    for name in ["socket", "ctypes.util", "json"]:
        try:
            importlib.import_module(name)
            print(f"{name:<12} allowed")
        except ImportError as e:
            print(f"{name:<12} ImportError: {e}")
import socket as again
print("restored, same object as before:", again is socket)
` },
      complexity: R`<p>O(M) on enter/exit to scan <code>sys.modules</code> (M modules); O(B) per import check for B blocked names (use a set of top-level names for O(1)).</p>`,
      followUps: ['Also block <code>from x import y</code> where <code>x</code> is allowed but re-exports a blocked module object. Is that possible with an import hook alone?', 'How would you implement the same guarantee for subprocesses? (environment, network namespaces, seccomp.)']
    }
  });

  practice.push({
    title: 'An auto_slots Class Decorator',
    level: 'Hard', tags: ['__slots__', 'class creation', 'descriptors'], companies: ['Bloomberg', 'Citadel', 'Microsoft'],
    statement: R`<p>Write a class decorator <code>auto_slots</code> that turns an annotated class into a slotted one: <code>__slots__</code> = the annotated names, defaults (class attributes with the same names) become constructor defaults, and a generated <code>__init__</code> accepts the fields positionally or by keyword (only if the class does not define its own). The result must have no per-instance <code>__dict__</code>.</p>`,
    constraints: R`<p><code>__slots__</code> only works if present when the class is <b>created</b>, so the decorator must build a <b>new</b> class. A slot name may not also be a class attribute (Python raises <code>ValueError</code>), so defaults must be removed from the namespace. Use <code>inspect.get_annotations</code> (works with 3.14's lazy annotations).</p>`,
    example: R`<p><code>@auto_slots class P: x: int; y: int = 0</code> → <code>P(3)</code> has ${H.c('g', 'x=3, y=0')}, <code>hasattr(P(3), "__dict__")</code> is ${H.c('g', 'False')}, and <code>P(3).z = 1</code> raises ${H.c('r', 'AttributeError')}.</p>`,
    brute: { why: R`<p>Setting <code>cls.__slots__ = (...)</code> after the class exists does nothing: the instance layout (member descriptors at fixed offsets, no dict) is decided inside <code>type.__new__</code>. You must recreate the class with the slots in its namespace.</p>`, code: R`def auto_slots_wrong(cls):
    cls.__slots__ = tuple(cls.__annotations__)    # too late: layout already fixed
    return cls

@auto_slots_wrong
class P:
    x: int

p = P()
p.anything = 1                                   # still has a __dict__
print(hasattr(p, "__dict__"))
` },
    mcq: { q: 'Why does <code>class A: __slots__ = ("x",); x = 0</code> raise ValueError?', options: ['The slot creates a member descriptor named x, which would clash with the class attribute x', 'Slots cannot have defaults in any form', 'x is a reserved name', 'Slots require a metaclass'], answer: 0, explain: '__slots__ makes type.__new__ add a member descriptor called x to the class namespace; an existing class attribute x conflicts with it.' },
    hints: [R`<p>Hint 1: collect <code>names = tuple(inspect.get_annotations(cls))</code> and <code>defaults = {n: cls.__dict__[n] for n in names if n in cls.__dict__}</code>.</p>`, R`<p>Hint 2: build <code>ns</code> from <code>cls.__dict__</code> minus the slot names, <code>__dict__</code>, <code>__weakref__</code> and annotation bookkeeping keys; add <code>__slots__</code>; create <code>type(cls)(cls.__name__, cls.__bases__, ns)</code>.</p>`, R`<p>Hint 3: generate <code>__init__(self, *args, **kwargs)</code> that binds args to names in order, then kwargs, then defaults, raising <code>TypeError</code> for missing or unexpected arguments. Restore <code>__annotations__</code> and <code>__qualname__</code> on the new class.</p>`],
    solution: {
      approach: R`<p>Recreate the class (same metaclass, name, bases) with a cleaned namespace that includes <code>__slots__</code>, then attach a generated <code>__init__</code> and copy annotations. This mirrors what <code>@dataclass(slots=True)</code> does internally. Limitation: methods using zero-argument <code>super()</code> keep a <code>__class__</code> cell pointing at the old class (the stdlib patches those cells; we document it as a follow-up).</p>`,
      code: { lang: 'python', run: true, code: R`import inspect

def auto_slots(cls):
    ann = dict(inspect.get_annotations(cls))
    names = tuple(ann)
    defaults = {n: cls.__dict__[n] for n in names if n in cls.__dict__}
    skip = set(names) | {"__dict__", "__weakref__"}
    ns = {k: v for k, v in cls.__dict__.items()
          if k not in skip and not k.startswith("__annotat")}
    ns["__slots__"] = names

    if "__init__" not in ns:
        def __init__(self, *args, **kwargs):
            if len(args) > len(names):
                raise TypeError(f"expected at most {len(names)} positional arguments")
            values = dict(zip(names, args))
            for k, v in kwargs.items():
                if k not in names:
                    raise TypeError(f"unexpected argument {k!r}")
                if k in values:
                    raise TypeError(f"argument {k!r} given twice")
                values[k] = v
            for n in names:
                if n not in values:
                    if n not in defaults:
                        raise TypeError(f"missing argument {n!r}")
                    values[n] = defaults[n]
                setattr(self, n, values[n])
        ns["__init__"] = __init__
        ns["__repr__"] = ns.get("__repr__") or (lambda self: f"{type(self).__name__}(" +
                         ", ".join(f"{n}={getattr(self, n)!r}" for n in names) + ")")

    new = type(cls)(cls.__name__, cls.__bases__, ns)
    new.__qualname__ = cls.__qualname__
    new.__annotations__ = ann
    return new

@auto_slots
class Point:
    x: int
    y: int = 0
    def norm2(self):
        return self.x ** 2 + self.y ** 2

p = Point(3, y=4)
print(p, p.norm2(), "has __dict__:", hasattr(p, "__dict__"))
print(Point(5), type(Point.__dict__["x"]).__name__)
try:
    p.z = 1
except AttributeError as e:
    print("AttributeError:", e)
try:
    Point()
except TypeError as e:
    print("TypeError:", e)
` },
      complexity: R`<p>Decoration is O(namespace size), once per class. Each instance saves the dict overhead (see the slots memory practice problem); attribute access goes through fast member descriptors.</p>`,
      followUps: ['Fix zero-argument <code>super()</code> in methods by rewriting each function\'s <code>__class__</code> closure cell to the new class.', 'Support inheritance: a slotted subclass of a slotted base must only list its <b>new</b> fields.']
    }
  });

  /* ============================== QUIZ ============================== */
  quiz.push({
    q: `In CPython 3.12+, what does <code>dis.dis(lambda x: x + 1)</code> show for the addition?`,
    options: [`<code>BINARY_ADD</code>`, `<code>BINARY_OP</code> with the argument <code>+</code>`, `<code>CALL</code> on <code>int.__add__</code>`, `<code>ADD_INT</code> straight away`],
    answer: 1,
    explain: `Since 3.11 all binary operators share one generic instruction, <code>BINARY_OP</code>, whose argument says which operator. <code>BINARY_ADD</code> is the pre-3.11 name. After warm-up the specializing interpreter may rewrite it to <code>BINARY_OP_ADD_INT</code> at runtime, but plain <code>dis</code> shows the generic form (use <code>adaptive=True</code> to see the specialized one).`
  });
  quiz.push({
    q: `<code>x = []</code> then <code>print(sys.getrefcount(x))</code> prints 2 on CPython 3.12. Why not 1?`,
    options: [`The list is stored twice in memory`, `Passing <code>x</code> as an argument creates a temporary extra reference for the duration of the call`, `The garbage collector holds one reference to every list`, `Lists always start with refcount 2`],
    answer: 1,
    explain: `The name <code>x</code> holds one reference; the call argument holds a second, temporary one. The docs say the result is "generally one higher than you might expect". (3.14 can report lower numbers because of borrowed references, so never assert exact counts in tests.)`
  });
  quiz.push({
    q: `Which of these objects is <b>tracked</b> by the cyclic garbage collector?`,
    options: [`An <code>int</code> such as 10**20`, `A <code>str</code>`, `An instance of a user-defined class`, `A <code>float</code>`],
    answer: 2,
    explain: `Only <b>containers</b> (objects that can hold references to other objects) can be part of a cycle, so only they are tracked: lists, dicts, sets, instances, functions, frames. Atomic objects like ints, floats and strs can never form a cycle, so the GC skips them. <code>gc.is_tracked(obj)</code> tells you.`
  });
  quiz.push({
    q: `Which integers does CPython pre-allocate in its small-int cache?`,
    options: [`0 to 255`, `−5 to 256`, `−128 to 127`, `All ints that fit in 64 bits`],
    answer: 1,
    explain: `CPython keeps singletons for −5 … 256 (immortal since 3.12). That is why <code>a = 256; b = 256; a is b</code> is always True while 257 depends on whether both values came from the same code object's constants. Never use <code>is</code> to compare numbers.`
  });
  quiz.push({
    q: `A class defines <code>@property def name(self)</code>. You do <code>obj.__dict__['name'] = 'X'</code> and then read <code>obj.name</code>. What do you get?`,
    options: [`'X', the instance dict always wins`, `The property's return value, because a property is a data descriptor and beats the instance dict`, `AttributeError`, `Whichever was set last`],
    answer: 1,
    explain: `Lookup order in <code>object.__getattribute__</code>: <b>data descriptors on the type</b> (those with <code>__set__</code> or <code>__delete__</code>, like property) → instance <code>__dict__</code> → non-data descriptors and plain class attributes → <code>__getattr__</code>. Property has <code>__set__</code> (it raises if no setter), so it always wins.`
  });
  quiz.push({
    q: `How does <code>obj.method</code> turn a plain function stored on the class into a bound method?`,
    options: [`The compiler rewrites every method call`, `Functions are non-data descriptors: <code>func.__get__(obj, type(obj))</code> returns a bound method`, `The class stores a bound method per instance`, `<code>__getattr__</code> on <code>object</code> wraps it`],
    answer: 1,
    explain: `<code>function</code> implements <code>__get__</code> only, so it is a non-data descriptor. Accessed through an instance it returns a <code>method</code> object that remembers <code>self</code>; through the class it returns the function itself. (CPython 3.7+ also has <code>LOAD_ATTR</code> method fast paths that avoid allocating the bound method for <code>obj.m()</code> calls.)`
  });
  quiz.push({
    q: `For <code>class P(Base, metaclass=Meta): ...</code>, what is the correct order of events?`,
    options: [
      `Body runs → <code>Meta.__prepare__</code> → <code>Meta.__init__</code> → <code>Meta.__new__</code>`,
      `<code>Meta.__prepare__</code> → body runs in that namespace → <code>Meta.__new__</code> (inside it <code>type.__new__</code> calls <code>__set_name__</code> then <code>__init_subclass__</code>) → <code>Meta.__init__</code>`,
      `<code>Base.__init_subclass__</code> → body → <code>Meta.__call__</code>`,
      `<code>Meta.__call__</code> → <code>Meta.__new__</code> → body`
    ],
    answer: 1,
    explain: `Python resolves the metaclass, asks <code>__prepare__</code> for the namespace mapping, executes the body into it, then calls <code>Meta(name, bases, ns)</code>. <code>type.__new__</code> builds the class, calls each attribute's <code>__set_name__</code>, then the parent's <code>__init_subclass__</code>. <code>Meta.__call__</code> only runs later, when you create an <b>instance</b>.`
  });
  quiz.push({
    q: `<code>a.py</code> runs <code>from b import f</code>, and <code>b.py</code> runs <code>from a import CONFIG</code> (defined near the bottom of <code>a.py</code>). Running <code>import a</code> raises ImportError. Why?`,
    options: [
      `Python forbids two modules importing each other`,
      `<code>a</code> is put in <code>sys.modules</code> <b>before</b> its code finishes, so <code>b</code> gets the half-built module, which does not have <code>CONFIG</code> yet`,
      `The <code>.pyc</code> files are stale`,
      `<code>from</code> imports are always lazy`
    ],
    answer: 1,
    explain: `The import system inserts the new module object into <code>sys.modules</code> first and then runs its code. When <code>b</code> asks for <code>a</code>, it gets that partially initialised module. <code>import a</code> plus <code>a.CONFIG</code> at call time, moving shared names to a third module, or a function-level import all fix it.`
  });
  quiz.push({
    q: `<code>x = 10</code> at module level; <code>def f(): print(x); x = 5</code>. Calling <code>f()</code> gives?`,
    options: [`Prints 10`, `Prints 5`, `<code>UnboundLocalError</code>`, `<code>NameError</code> at definition time`],
    answer: 2,
    explain: `Scope is decided at <b>compile</b> time: because <code>x</code> is assigned anywhere in <code>f</code>, it is local for the whole body, so <code>print(x)</code> compiles to <code>LOAD_FAST x</code> on an empty slot. Use <code>global x</code> (or better, a parameter) if you really meant the module variable.`
  });
  quiz.push({
    q: `Why is reading a local variable inside a hot loop faster than reading a module global?`,
    options: [
      `Locals are stored in CPU registers`,
      `<code>LOAD_FAST</code> indexes a fixed slot in the frame's array, while <code>LOAD_GLOBAL</code> must consult the globals dict and then builtins (cached by dict version, but still more work)`,
      `Globals are re-parsed on every access`,
      `There is no difference in CPython`
    ],
    answer: 1,
    explain: `The compiler assigns each local a slot number, so access is an array index. Globals live in a dict; 3.11+ specializes <code>LOAD_GLOBAL</code> with cached dict-keys versions, which narrows the gap, but locals remain the cheapest. That is why old code did <code>append = out.append</code> before a loop.`
  });
  quiz.push({
    q: `What does <code>del x</code> actually do?`,
    options: [
      `Immediately frees the object's memory`,
      `Removes the name binding <code>x</code> and decrements the object's refcount; the object is freed only if that count reaches zero`,
      `Calls the garbage collector`,
      `Calls <code>x.__del__()</code> directly`
    ],
    answer: 1,
    explain: `<code>del</code> deletes a <b>name</b>, not an object. If other references (another variable, a list, a cache, a traceback) still point to the object, it stays alive. <code>__del__</code> runs only when the object is really deallocated.`
  });
  quiz.push({
    q: `What did PEP 659 (Python 3.11) add to the evaluation loop?`,
    options: [
      `A mandatory JIT compiler`,
      `Removal of the GIL`,
      `A specializing adaptive interpreter: instructions observe the types they see and rewrite themselves into specialized versions (e.g. <code>LOAD_ATTR_INSTANCE_VALUE</code>) with inline caches`,
      `Register-based bytecode`
    ],
    answer: 2,
    explain: `After a few executions ("warm-up"), a generic instruction is quickened into a type-specialized variant guarded by cheap checks; if the guard fails often it de-optimizes back. This, plus cheaper frames and zero-cost exceptions, gave 3.11 its roughly 25% average speed-up. The JIT came later (experimental, 3.13+) and free-threading is PEP 703.`
  });
  quiz.push({
    q: `When does <code>sys.intern(s)</code> genuinely help?`,
    options: [
      `Whenever you compare any two strings`,
      `When a program holds millions of copies of a small set of repeated strings built at runtime (e.g. parsed keys/labels), saving memory and making dict lookups compare pointers first`,
      `It makes strings mutable`,
      `It is required for using strings as dict keys`
    ],
    answer: 1,
    explain: `Literals that look like identifiers are interned automatically at compile time, but strings created at runtime (from files, JSON, network) are not. Interning repeated runtime strings deduplicates them; equality still works without it, so use <code>==</code> for comparison, never <code>is</code>.`
  });

  /* ============================ INTERVIEW ============================ */
  interview.push({
    q: `Is Python compiled or interpreted?`,
    level: 'B',
    a: `<p><b>Both.</b> CPython first <b>compiles</b> your source: tokenizer → parser (a PEG parser since 3.9) → AST → symbol table (decides local/global/free for every name) → compiler → <b>code objects</b> full of bytecode. Then the <b>interpreter</b> (the evaluation loop in <code>Python/ceval.c</code>) executes that bytecode one instruction at a time on a value stack.</p>
<p>Imported modules have their bytecode cached as <code>.pyc</code> files in <code>__pycache__</code>; the script you run directly is compiled fresh each time. Bytecode is a CPython implementation detail: it changes every minor version and other implementations (PyPy with its tracing JIT, GraalPy) work differently. Since 3.13 CPython also ships an experimental JIT that compiles hot traces to machine code, so the honest answer is "compiled to bytecode, then interpreted, with an optional JIT in recent builds".</p>`,
    followUps: [`Where does the <code>.pyc</code> live, and how does Python know it is stale?`, `What is a code object and which attributes does it have?`, `Why do bytecode-level tricks not port between Python versions?`]
  });
  interview.push({
    q: `What is the difference between <code>is</code> and <code>==</code>, and why does <code>a is b</code> sometimes return True for equal numbers or strings?`,
    level: 'B',
    a: `<p><code>==</code> asks "equal value?" and calls <code>__eq__</code>. <code>is</code> asks "the <b>same object</b>?" and compares identities (in CPython, memory addresses). Equal values can be different objects.</p>
<p>It sometimes looks like <code>is</code> works because of caching: CPython keeps one shared object for each int from −5 to 256, interns string literals that look like identifiers, and merges equal constants inside one code object (so <code>a = 1000; b = 1000</code> in the same function can share an object, while two separate REPL lines usually do not). These are optimizations, not guarantees, and they change across versions and implementations. Rule: use <code>is</code> only for singletons (<code>None</code>, <code>True</code>, <code>False</code>, sentinels like <code>_MISSING = object()</code>). Since 3.8 the compiler even warns: <code>SyntaxWarning: "is" with a literal</code>.</p>`,
    followUps: [`Why is <code>x is None</code> preferred over <code>x == None</code>?`, `When would you call <code>sys.intern</code> yourself?`, `Can two different objects ever have the same <code>id()</code>?`]
  });
  interview.push({
    q: `Explain reference counting in CPython. What are its strengths and weaknesses?`,
    level: 'I',
    a: `<p>Every object starts with a header: <code>ob_refcnt</code> (how many references point at it) and <code>ob_type</code>. Binding a name, putting the object in a list, or passing it as an argument does <code>Py_INCREF</code>; dropping the reference does <code>Py_DECREF</code>. When the count hits zero the type's <code>tp_dealloc</code> runs <b>immediately</b>, which releases its own references (possibly cascading) and returns the memory to pymalloc.</p>
<p><b>Strengths:</b> deterministic and prompt cleanup (files closed right away, low peak memory), simple to reason about, work spread evenly so no long pauses. <b>Weaknesses:</b> (1) it cannot reclaim <b>cycles</b> (an object that refers to itself never reaches zero) so a separate cyclic GC is needed; (2) every pointer copy writes to memory, which costs cache traffic and breaks copy-on-write after <code>fork</code>; (3) count updates are not thread-safe, which is the main reason the GIL exists. Modern CPython mitigates these with immortal objects (3.12, PEP 683), borrowed-reference instructions (3.14) and biased reference counting in the free-threaded build.</p>`,
    followUps: [`Why does <code>sys.getrefcount</code> report one more than you expect?`, `What does "immortal object" mean and why was it needed?`, `How does reference counting interact with <code>fork()</code> and copy-on-write?`]
  });
  interview.push({
    q: `If CPython has reference counting, why does it also need a garbage collector? How does that collector work?`,
    level: 'A',
    a: `<p>Reference counting cannot free <b>cycles</b>: a doubly linked list node, a parent ↔ child tree, an object storing a bound method of itself, or an exception holding a traceback that holds the frame that holds the exception. Once unreachable, each member still has count ≥ 1.</p>
<p>The cyclic GC only tracks <b>container</b> objects. For a set of tracked objects it: (1) copies each refcount into a scratch field <code>gc_refs</code>; (2) for every reference <b>between</b> tracked objects, subtracts 1 from the target; (3) anything still above 0 is referenced from outside (a root), so it and everything reachable from it is alive; (4) the rest is garbage: weakref callbacks are handled, finalizers (<code>__del__</code>, safe since PEP 442 in 3.4) run, then references are cleared to break the cycle and refcounting frees the objects.</p>
<p>It is <b>generational</b>: most objects die young, so the young generation is scanned often and old objects rarely. Collection is triggered by allocation counts (<code>gc.get_threshold()</code>), not by time. 3.14 made the old-generation work <b>incremental</b> to cut pause times. Production levers: <code>gc.freeze()</code> before forking workers (Instagram's trick to keep copy-on-write pages shared), raising thresholds for allocation-heavy batch jobs, and <code>gc.callbacks</code> to measure pause times.</p>`,
    followUps: [`What is <code>gc.garbage</code> and when do objects end up there?`, `Why did Instagram disable and later freeze the GC?`, `How would you prove that a cycle, not a leak in C code, is what keeps memory high?`]
  });
  interview.push({
    q: `What is a descriptor? Show how <code>property</code>, methods, <code>staticmethod</code> and <code>classmethod</code> are all built on it.`,
    level: 'A',
    a: `<p>A descriptor is any object, stored as a <b>class</b> attribute, whose type defines <code>__get__</code>, <code>__set__</code> or <code>__delete__</code>. When you access the attribute, Python calls those hooks instead of returning the object. With <code>__set__</code>/<code>__delete__</code> it is a <b>data</b> descriptor (beats the instance dict); with only <code>__get__</code> it is a <b>non-data</b> descriptor (the instance dict can shadow it).</p>
<ul><li><b>Functions</b> are non-data descriptors: <code>f.__get__(obj, cls)</code> returns a bound method carrying <code>self</code>. That is the whole method-binding mechanism.</li>
<li><b>property</b> is a data descriptor whose <code>__get__</code>/<code>__set__</code> call your getter/setter; without a setter its <code>__set__</code> raises <code>AttributeError</code>, which is how read-only attributes work.</li>
<li><b>staticmethod</b>'s <code>__get__</code> returns the raw function; <b>classmethod</b>'s returns a method bound to the class.</li>
<li><b>functools.cached_property</b> is a non-data descriptor that stores the computed value in the instance <code>__dict__</code>, so the next read never reaches the descriptor.</li>
<li><code>__slots__</code> creates member descriptors that read fixed offsets in the object.</li></ul>
<p>ORMs (Django fields, SQLAlchemy columns) and validation libraries use descriptors plus <code>__set_name__</code> (3.6+) so each field learns its own attribute name.</p>`,
    followUps: [`Why does <code>cached_property</code> not work on a class with <code>__slots__</code> and no <code>__dict__</code>?`, `Write a typed descriptor that validates on assignment.`, `What does <code>__set_name__</code> receive and when is it called?`]
  });
  interview.push({
    q: `Walk me through exactly what happens when Python evaluates <code>obj.attr</code>.`,
    level: 'A',
    a: `<p><code>obj.attr</code> compiles to <code>LOAD_ATTR</code>, which calls <code>type(obj).__getattribute__(obj, 'attr')</code>. For ordinary objects that is <code>object.__getattribute__</code>:</p>
<ol><li>Walk <code>type(obj).__mro__</code> to find <code>attr</code> on the class (CPython caches this per type with a version tag).</li>
<li>If found and it is a <b>data descriptor</b> → return <code>desc.__get__(obj, type(obj))</code>.</li>
<li>Else if <code>attr</code> is in <code>obj.__dict__</code> → return that.</li>
<li>Else if the class attribute was found: a non-data descriptor → call its <code>__get__</code>; a plain value → return it.</li>
<li>Else raise <code>AttributeError</code>; if the class defines <code>__getattr__</code>, Python calls it as a last resort.</li></ol>
<p>Setting (<code>obj.attr = v</code>) is simpler: a data descriptor's <code>__set__</code> if present on the type, else write into <code>obj.__dict__</code>. On classes, <code>type.__getattribute__</code> also checks the metaclass. In 3.11+ the specializing interpreter turns hot <code>LOAD_ATTR</code>s into variants like <code>LOAD_ATTR_INSTANCE_VALUE</code> or <code>LOAD_ATTR_PROPERTY</code>, guarded by the type version, which is why monkey-patching classes in hot paths de-optimizes them.</p>`,
    followUps: [`What is the difference between <code>__getattr__</code> and <code>__getattribute__</code>?`, `Why can an instance shadow a method but not a property?`, `How do you avoid infinite recursion inside a custom <code>__getattribute__</code>?`]
  });
  interview.push({
    q: `What is a metaclass? When would you actually write one, and what would you use instead?`,
    level: 'A',
    a: `<p>A metaclass is the <b>class of a class</b>. Instances are made by classes; classes are made by metaclasses; the default is <code>type</code>. The <code>class</code> statement ends with <code>Meta(name, bases, namespace)</code>, so a metaclass can inspect or rewrite the class while it is being created (<code>__prepare__</code>, <code>__new__</code>, <code>__init__</code>) and can control instance creation (<code>__call__</code>).</p>
<p><b>Real uses:</b> ABCMeta (abstract methods), Enum's <code>EnumType</code> (members are created at class creation and the class becomes iterable), ORM declarative bases, registering plugins automatically, and singletons via <code>__call__</code>.</p>
<p><b>Prefer lighter tools first:</b> a class decorator (runs after creation, composes cleanly), <code>__init_subclass__</code> (parent hook for validation and registration, 3.6+), <code>__set_name__</code> on descriptors, or <code>dataclasses</code>. Metaclasses do not compose: a class whose bases use unrelated metaclasses raises <code>TypeError: metaclass conflict</code>. Tim Peters' line still holds: if you wonder whether you need one, you don't.</p>`,
    followUps: [`Implement a plugin registry with <code>__init_subclass__</code> instead of a metaclass.`, `What does <code>type(type)</code> return and why?`, `How would you make a class iterable over its own subclasses?`]
  });
  interview.push({
    q: `Explain how <code>import foo</code> works. What is <code>sys.modules</code>, and why do circular imports fail?`,
    level: 'I',
    a: `<p><code>import foo</code> calls <code>__import__</code> → <code>importlib._bootstrap._find_and_load</code>:</p>
<ol><li>Check <code>sys.modules</code>, the cache of already-imported modules. If present, just bind the name: modules execute <b>once</b>.</li>
<li>Otherwise ask each finder in <code>sys.meta_path</code> (BuiltinImporter, FrozenImporter, PathFinder) for a <b>ModuleSpec</b>. PathFinder walks <code>sys.path</code> (script dir, PYTHONPATH, stdlib, site-packages) using path-entry finders that understand directories, zip files and namespace packages.</li>
<li>The spec's <b>loader</b> creates the module object, which is <b>inserted into <code>sys.modules</code> before</b> its code runs, then <code>exec_module</code> executes the code (from a cached <code>.pyc</code> if it is fresh).</li></ol>
<p>Circular imports: <code>a</code> imports <code>b</code>, and <code>b</code> does <code>from a import X</code> while <code>a</code> is still half-way through; <code>b</code> finds the partial module in <code>sys.modules</code> and <code>X</code> is not defined yet → ImportError "partially initialized module". Fixes: restructure (move shared code to a third module), import the module not the name and access attributes at call time, defer the import into a function, or use <code>if TYPE_CHECKING:</code> for imports needed only by type hints.</p>`,
    followUps: [`How would you write a custom finder that loads modules from a database?`, `What does <code>importlib.reload</code> not update?`, `Why can a file named <code>random.py</code> in your project break other libraries?`]
  });
  interview.push({
    q: `What does a CPython object look like in memory, and why does <code>__slots__</code> save memory?`,
    level: 'A',
    a: `<p>Every object begins with <code>PyObject</code>: a reference count and a pointer to its type. Variable-size objects (<code>PyVarObject</code>, e.g. tuples, ints) add <code>ob_size</code>. The type object holds the behaviour: slots like <code>tp_getattro</code>, <code>tp_hash</code>, <code>tp_as_number</code>. In CPython <code>id(obj)</code> is the object's address, and objects never move.</p>
<p>A normal class instance additionally needs storage for its attributes. Historically that was a separate per-instance <code>__dict__</code>; 3.11+ stores values inline with shared keys and only creates the dict on demand, which already cut memory a lot. Containers also carry a GC header for the cyclic collector. With <code>__slots__ = ('x', 'y')</code> the class instead reserves fixed pointer fields in the object itself and creates member descriptors to read them, so there is <b>no <code>__dict__</code> and no <code>__weakref__</code></b> slot unless you ask. For millions of small records that is often 2–3× less memory and slightly faster attribute access. Costs: no dynamic attributes, every class in a hierarchy must declare slots to get the benefit, and tools that rely on <code>__dict__</code> (some pickling, <code>cached_property</code>) need adjusting. <code>@dataclass(slots=True)</code> (3.10+) is the modern easy way.</p>`,
    followUps: [`How would you measure the per-instance saving reliably?`, `Why must you add <code>'__weakref__'</code> to slots to allow weak references?`, `What happens if a subclass of a slotted class does not define <code>__slots__</code>?`]
  });
  interview.push({
    q: `How did Python 3.11+ get so much faster, and does Python have a JIT now?`,
    level: 'E',
    a: `<p>The Faster CPython project changed the evaluation loop rather than the language. Main pieces in 3.11: (1) the <b>specializing adaptive interpreter</b> (PEP 659): after a short warm-up, generic instructions such as <code>LOAD_ATTR</code>, <code>LOAD_GLOBAL</code>, <code>BINARY_OP</code>, <code>CALL</code> rewrite themselves into type-specialized variants using inline caches in the bytecode, with cheap guards that fall back if types change; (2) <b>cheaper frames</b> allocated in a contiguous per-thread chunk and only turned into full Python frame objects when someone inspects them; (3) Python-to-Python calls that do not recurse in C ("inlined" calls); (4) <b>zero-cost exceptions</b> using an exception table instead of setup instructions. The result was roughly 1.25× on the pyperformance suite.</p>
<p>3.12 inlined comprehensions (PEP 709) and generated the interpreter from a DSL (<code>bytecodes.c</code>). 3.13 added an <b>experimental</b> tier-2 optimizer and a copy-and-patch <b>JIT</b> that is off by default; gains so far are modest. 3.14 added an optional tail-calling interpreter on new Clang builds. In parallel, the free-threaded (no-GIL) build from PEP 703 became officially supported in 3.14. In an interview: specialization is the big, always-on win; the JIT is real but young; measure with your workload.</p>`,
    followUps: [`What is an inline cache and where does it live?`, `Why does monkey-patching a class in a hot loop slow it down?`, `How would you check whether your function got specialized?`]
  });
  interview.push({
    q: `How does the GIL relate to reference counting, and how does free-threaded CPython (PEP 703) cope without it?`,
    level: 'E',
    a: `<p>Reference counts are updated on almost every operation. Without a lock, two threads doing <code>Py_INCREF</code> on the same object can lose an update and free a live object. The GIL makes all bytecode execution mutually exclusive, so the counts (and dicts, lists, the allocator) stay consistent for free. The eval loop drops and re-acquires it periodically (<code>sys.getswitchinterval()</code>, 5 ms by default) and around blocking I/O, which is why threads still help I/O-bound code but not pure-Python CPU work.</p>
<p>The free-threaded build (<code>python3.13t</code>, supported in 3.14) removes the GIL and replaces its guarantees piece by piece: <b>biased reference counting</b> (the owning thread updates a local count non-atomically, other threads use an atomic shared count), <b>immortal objects</b> for shared singletons, <b>deferred reference counting</b> for frequently shared objects like functions and modules, per-object locks inside list and dict operations, <b>mimalloc</b> as a thread-safe allocator, and stop-the-world pauses for the cyclic GC. Single-thread speed is a little lower, C extensions must declare themselves safe, and your own code still needs locks for compound operations like <code>counter += 1</code>.</p>`,
    followUps: [`Is <code>list.append</code> thread-safe? Is <code>x += 1</code>?`, `How do you check at runtime whether the GIL is enabled?`, `Why must C extensions opt in to free-threading?`]
  });
  interview.push({
    q: `A long-running Python service slowly grows to several GB. How do you find out what is holding the memory?`,
    level: 'E',
    a: `<p><b>1. Confirm it is Python objects.</b> Watch RSS versus <code>tracemalloc</code> totals; if RSS grows but Python allocations do not, suspect a C extension, memory fragmentation, or arenas that cannot be released.</p>
<p><b>2. Find where allocations come from.</b> <code>tracemalloc.start(25)</code>, take a snapshot, run traffic, take another, and compare with <code>snapshot.compare_to(old, 'traceback')</code>: you get the file and line that allocated the growth.</p>
<p><b>3. Find who keeps them alive.</b> Count live objects by type (<code>gc.get_objects()</code> plus a Counter of type names), then follow <code>gc.get_referrers</code> chains (or <code>objgraph.show_backrefs</code>) from a sample object back to a root. Typical culprits: unbounded caches or module-level dicts, <code>functools.lru_cache</code> on methods (it holds every <code>self</code>), listeners never unsubscribed, stored exceptions whose tracebacks pin whole frames, and reference cycles with expensive objects that only die at the next full collection.</p>
<p><b>4. Fix and guard.</b> Bound caches, use <code>weakref.WeakValueDictionary</code>/<code>WeakMethod</code> for observers, break cycles explicitly, and add a regression test that loops the operation and asserts memory stays flat. Profilers such as memray (native and Python stacks) help when C code is involved.</p>`,
    followUps: [`Why does <code>lru_cache</code> on an instance method leak?`, `Why might RSS not drop even after the objects are freed?`, `How do weak references avoid keeping objects alive?`]
  });
  interview.push({
    q: `When have you used <code>dis</code> (or would you), and what can bytecode tell you that the source cannot?`,
    level: 'I',
    a: `<p><code>dis</code> disassembles code objects into instructions. It answers questions that are invisible in source: whether a name is local (<code>LOAD_FAST</code>), global (<code>LOAD_GLOBAL</code>) or a closure variable (<code>LOAD_DEREF</code>), which explains <code>UnboundLocalError</code> and late-binding closure bugs; whether the compiler folded a constant (<code>24*60*60</code> becomes <code>86400</code>); whether an operation is a single instruction (relevant when reasoning about atomicity under the GIL: <code>x += 1</code> is load, add, store, so it is not atomic); and why one idiom is faster than another (a comprehension versus <code>append</code> in a loop).</p>
<p>Practical habits: <code>dis.dis(fn, adaptive=True)</code> after warm-up shows specialized instructions; <code>dis.get_instructions</code> lets you analyse code programmatically (linters, coverage tools and debuggers do this); <code>fn.__code__.co_varnames</code>, <code>co_consts</code> and <code>co_freevars</code> describe the code object. Caveat: bytecode differs between minor versions, so never build production logic on specific opcodes, and always confirm performance hypotheses with <code>timeit</code>.</p>`,
    followUps: [`Disassemble <code>a, b = b, a</code>: is a tuple built?`, `Why is <code>x += 1</code> on a shared global not thread-safe?`, `What is in <code>co_consts</code> for a function containing a nested function?`]
  });

  registerModule({
    id: 'py12',
    title: 'CPython Internals',
    lang: 'python',
    intro: `<p>So far you have used Python like a car: turn the key, it drives. This module opens the bonnet. You will watch your source code become <b>bytecode</b>, see the <b>evaluation loop</b> run it one instruction at a time on a little value stack, and learn what every Python value really is underneath: a <code>PyObject</code> with a <b>reference count</b> and a pointer to its type.</p>
<p>From there we follow an object's whole life: who keeps it alive (reference counting), who rescues memory from cycles (the <b>cyclic garbage collector</b>), why <code>a is b</code> sometimes "works" for numbers and strings (small-int cache and <b>interning</b>), how <code>obj.attr</code> is really resolved (<b>descriptors</b>), what builds a class (<b>metaclasses</b>), and how <code>import</code> finds, loads and caches modules.</p>
<p>Why it matters: senior Python interviews love "explain what happens when…" questions, and real production problems (memory leaks, mysterious <code>UnboundLocalError</code>, circular imports, slow attribute access, GC pauses after <code>fork</code>) are only solvable once you can picture these mechanisms. Every topic has a step-by-step visualizer, runnable examples you can poke at, and notes on what changed in 3.11–3.14 (specializing interpreter, immortal objects, JIT, free-threading).</p>`,
    goals: [
      'Read <code>dis</code> output and explain how a function compiles to bytecode, including why <code>UnboundLocalError</code> and late-binding closures happen',
      'Describe the evaluation loop, frames and the 3.11+ specializing adaptive interpreter well enough to predict what gets faster and why',
      'Explain the <code>PyObject</code> layout, reference counting, immortal objects and when the cyclic GC is needed, and use <code>gc</code>, <code>weakref</code> and <code>tracemalloc</code> to hunt leaks',
      'Predict identity results involving the small-int cache and string interning, and always choose correctly between <code>is</code> and <code>==</code>',
      'Write data and non-data descriptors, recite the full attribute lookup order, and implement <code>cached_property</code>-style tools',
      'Trace class creation through <code>__prepare__</code>, <code>__new__</code>, <code>__set_name__</code>, <code>__init_subclass__</code> and choose between metaclasses, class decorators and <code>__init_subclass__</code>',
      'Explain <code>sys.modules</code>, finders, loaders and specs, fix circular imports, and build a custom meta-path import hook'
    ],
    prereqs: `Python track modules 5 (Data Structure Internals), 6 (Closures, Decorators &amp; functools), 7 (Iterators, Generators &amp; Context Managers), 8 (Advanced OOP: Dunder Methods, MRO &amp; Dataclasses) and 10 (Concurrency: GIL, Threads, Processes &amp; asyncio). Comfort with classes, closures and generators is essential; no C knowledge is required (we explain the C structs in plain words).`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
