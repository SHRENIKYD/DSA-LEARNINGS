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
        ${H.arr(['inner', 'outer', '&lt;module&gt;'], { label: 'f_back chain', hl: { 0: 'y' } })}`, code: { lang: 'python', run: true, code: R`import sys

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
registerModule({ id: 'py12', title: 'CPython Internals', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
