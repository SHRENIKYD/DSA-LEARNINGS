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
          else if (base === 'LOAD_FAST') { var nm = /\((\w+)\)/.exec(ins[pc][1])[1]; stack.push(loc[nm]); narr = '<code>LOAD_FAST ' + nm + '</code> pushes <b>' + loc[nm] + '</b> straight from the locals array. (3.13 would fuse the two loads on line 4 into <code>LOAD_FAST_LOAD_FAST</code>.)'; }
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
registerModule({ id: 'py12', title: 'CPython Internals', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
