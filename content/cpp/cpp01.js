(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* ---------- shared visualizer helpers (cpp01) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function cp(code, hl, label) { return { type: 'code', label: label || 'C++ (current line highlighted)', lang: 'cpp', code: code, hl: hl || {} }; }
  function vp(obj, hl, label) {
    var vals = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl || {} };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function copy(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }
  /* BigInt-free helpers: we only work with values that fit in a JS double exactly (|v| < 2^53) */
  function toBin(v, width) {
    // two's complement bit string of v in `width` bits (width <= 32)
    var mod = Math.pow(2, width);
    var u = ((v % mod) + mod) % mod;
    var s = u.toString(2);
    while (s.length < width) s = '0' + s;
    return s;
  }
  function asUnsigned(v, width) { var mod = Math.pow(2, width); return ((v % mod) + mod) % mod; }
  function asSigned(v, width) { var u = asUnsigned(v, width); return u >= Math.pow(2, width - 1) ? u - Math.pow(2, width) : u; }

  /* ======================================================================
     TOPIC 1 — The build pipeline: preprocessor → compiler → assembler → linker
     ====================================================================== */
  topics.push({
    title: 'From Source to Executable: Preprocessor → Compiler → Assembler → Linker',
    analogy: R`<p>Think of making a <b>printed cookbook</b>. First an <b>editor's assistant</b> (the <b>preprocessor</b>) goes through your draft and does pure copy-paste jobs: "insert the standard measurements page here", "replace every <i>TBSP</i> with <i>tablespoon</i>". She does not understand cooking at all — she only moves text around. Next a <b>translator</b> (the <b>compiler</b>) reads the finished draft, checks that every sentence makes sense, and rewrites it in the printer's machine language. Then the <b>typesetter</b> (the <b>assembler</b>) turns that into actual printed pages for each chapter. Finally the <b>binder</b> (the <b>linker</b>) collects all the chapters, fills in the "see page 42" cross-references, adds the pages borrowed from other books (the standard library), and glues everything into one book you can open: the <b>executable</b>.</p>
<p>When something goes wrong, <b>who complained</b> tells you where to look: the assistant ("file not found"), the translator ("expected ';'"), or the binder ("undefined reference" — a cross-reference points to a page nobody wrote).</p>`,
    explain: R`<h4>🟢 The big idea in one sentence</h4>
<p>C++ is a <b>compiled</b> language: before your program can run, a tool chain turns your text files (<code>.cpp</code>) into a native machine-code file that the CPU runs directly. There is no virtual machine in between (unlike Java or Python). That is why C++ is fast — and also why you must understand the steps, because each one has its own kind of error.</p>
<h4>The four stages</h4>
${H.table(['Stage', 'Input → Output', 'What it does', 'Try it with g++'], [
  ['1. Preprocessor', '<code>main.cpp</code> → <code>main.i</code>', 'Pure <b>text</b> work: pastes <code>#include</code> files, expands <code>#define</code> macros, keeps/drops <code>#if</code> blocks, strips comments', '<code>g++ -E main.cpp -o main.i</code>'],
  ['2. Compiler', '<code>main.i</code> → <code>main.s</code>', 'Parses C++, checks types, optimizes, emits <b>assembly</b> for your CPU', '<code>g++ -S main.cpp</code>'],
  ['3. Assembler', '<code>main.s</code> → <code>main.o</code>', 'Turns assembly into binary machine code + a <b>symbol table</b> ("I define main; I need <code>add</code>")', '<code>g++ -c main.cpp</code>'],
  ['4. Linker', '<code>*.o</code> + libraries → <code>app</code>', 'Matches every "I need X" with an "I define X", patches addresses, produces the executable', '<code>g++ main.o math.o -o app</code>']
])}
<p>Usually you type a single command — <code>g++ -std=c++20 -O2 main.cpp math.cpp -o app</code> — and the driver program <code>g++</code> runs all four stages for you, deleting the temporary files. The flags <code>-E</code>, <code>-S</code> and <code>-c</code> simply mean "stop after stage 1 / 2 / 3".</p>
<h4>Translation unit — the most important word in this module</h4>
<p>A <b>translation unit</b> (TU) is <i>one</i> <code>.cpp</code> file <b>after</b> the preprocessor has pasted all its headers in. The compiler works on <b>one TU at a time</b> and knows nothing about your other <code>.cpp</code> files. Only the linker sees the whole program. Keep this in mind and most C++ build errors suddenly make sense.</p>
<h4>The preprocessor's toolbox</h4>
${H.table(['Directive', 'Meaning', 'Typical use'], [
  ['<code>#include &lt;iostream&gt;</code>', 'paste a <b>system/library</b> header here', 'standard library'],
  ['<code>#include "math.h"</code>', 'paste <b>your</b> header (searched next to the file first)', 'project headers'],
  ['<code>#define PI 3.14159</code>', 'replace the token <code>PI</code> with that text everywhere after', 'old-style constants (prefer <code>constexpr</code>)'],
  ['<code>#define SQ(x) ((x)*(x))</code>', 'function-like macro: text substitution with parameters', 'rare today; prefer functions'],
  ['<code>#ifdef DEBUG</code> … <code>#endif</code>', 'keep the block only if <code>DEBUG</code> is defined', 'debug logging, platform code'],
  ['<code>#if __cplusplus &gt;= 202002L</code>', 'condition on a number known at preprocessing time', 'feature checks'],
  ['<code>#pragma once</code>', 'compiler-specific: "include this header only once per TU"', 'header guard (universally supported)'],
  ['<code>#error "msg"</code>', 'stop the build with a message', 'unsupported platform']
])}
<p>Golden rule: the preprocessor <b>does not know C++</b>. It does not know types, scopes or precedence. <code>#define SQ(x) x*x</code> turns <code>SQ(a+1)</code> into <code>a+1*a+1</code> — the visualizer below shows exactly why that gives the wrong answer.</p>
<h4>Which stage produced my error?</h4>
${H.table(['Error message (g++/clang)', 'Stage', 'Usual cause'], [
  ['<code>fatal error: math.h: No such file or directory</code>', 'preprocessor', 'wrong path; missing <code>-I include/</code>'],
  ["<code>error: expected ';' before 'return'</code>", 'compiler', 'syntax mistake'],
  ["<code>error: 'add' was not declared in this scope</code>", 'compiler', 'forgot the header / declaration'],
  ["<code>undefined reference to 'add(int, int)'</code>", H.c('r', 'linker'), 'declared but never defined, or the <code>.cpp</code> that defines it was not compiled/linked'],
  ["<code>multiple definition of 'add(int, int)'</code>", H.c('r', 'linker'), 'function body in a header included by two <code>.cpp</code> files'],
  ['<code>Segmentation fault</code>', 'run time', 'not a build error at all — the program crashed while running']
])}`,
    clues: [
      '"What happens when you compile a C++ program?" → walk through preprocess → compile → assemble → link, naming the file at each step (.i, .s, .o, executable)',
      '"undefined reference to …" → a <b>linker</b> error: the declaration was seen, the definition was not linked in',
      '"multiple definition of …" → a non-inline function or global variable is defined in a header included by two .cpp files (One Definition Rule)',
      '"Why do macros cause bugs?" → text substitution ignores precedence, types, scope and evaluates arguments more than once',
      '"What is a translation unit?" → one .cpp after preprocessing; the compiler only sees one at a time',
      '"Why is C++ faster to run but slower to build than Python?" → ahead-of-time native compilation; headers re-parsed in every TU',
      'Interviewer types <code>g++ -E</code>, <code>-S</code>, <code>-c</code> → they want the stage each flag stops at'
    ],
    code: [R`
// A single translation unit that shows the preprocessor and compiler at work.
// Build:  g++ -std=c++20 -Wall -Wextra -O2 demo.cpp -o demo
#include <iostream>          // preprocessor pastes ~tens of thousands of lines here

#define OLD_PI 3.14159       // macro: blind text replacement, no type, no scope
constexpr double PI = 3.14159;   // modern C++: a real, typed, scoped constant

#define SQUARE_BAD(x) x * x            // missing parentheses -> precedence bug
#define SQUARE_OK(x)  ((x) * (x))      // safer, but still evaluates x twice

// Best: a constexpr function. Type-checked, evaluates its argument once,
// and can still be computed at compile time.
constexpr long long square(long long x) { return x * x; }

int main() {
    int a = 3;
    std::cout << SQUARE_BAD(a + 1) << '\n';   // expands to a + 1 * a + 1  -> 7  (wrong!)
    std::cout << SQUARE_OK(a + 1)  << '\n';   // expands to ((a + 1) * (a + 1)) -> 16
    std::cout << square(a + 1)     << '\n';   // 16, and a+1 is computed only once

    static_assert(square(12) == 144);         // checked by the COMPILER, costs nothing at run time

#ifdef DEBUG                                   // only compiled with: g++ -DDEBUG ...
    std::cout << "debug build\n";
#endif

    std::cout << "compiled as C++" << __cplusplus << '\n';   // e.g. 202002 for C++20
    std::cout << OLD_PI * 2 << ' ' << PI * 2 << '\n';
    return 0;
}`, { lang: 'bash', code: R`
# Run each stage by hand to SEE the pipeline (Linux / macOS / WSL)
g++ -std=c++20 -E main.cpp -o main.i     # 1. preprocess only: open main.i, it is huge!
wc -l main.i                             #    a 10-line file becomes ~30,000+ lines with <iostream>
g++ -std=c++20 -S main.cpp -o main.s     # 2. compile to human-readable assembly
g++ -std=c++20 -c main.cpp -o main.o     # 3. assemble to an object file (machine code + symbols)
g++ -std=c++20 -c math.cpp -o math.o
nm -C main.o                             #    'U add(int, int)' = Undefined: needed, not defined here
nm -C math.o                             #    'T add(int, int)' = defined in the Text (code) section
g++ main.o math.o -o app                 # 4. link: resolve U symbols against T symbols
./app                                    # run it
echo $?                                  # the value main returned (exit status)

# The everyday one-liner does all four steps at once:
g++ -std=c++20 -Wall -Wextra -O2 main.cpp math.cpp -o app`, title: 'Each stage by hand (shell)' }],
    codeTitle: ['Preprocessor vs real constants (single TU)', 'Each stage by hand (shell)'],
    viz: [{
      title: 'Build pipeline: watch each .cpp travel to the executable',
      input: 'main.cpp math.cpp',
      inputLabel: '1–3 source files (first one has main)',
      gen: function (input) {
        var files = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!files.length) throw new Error('Type 1 to 3 file names like: main.cpp math.cpp');
        if (files.length > 3) throw new Error('Use at most 3 files, e.g. main.cpp math.cpp io.cpp');
        files.forEach(function (f) {
          if (!/^[A-Za-z_][A-Za-z0-9_]{0,7}\.(cpp|cc)$/.test(f)) throw new Error('Each name must look like name.cpp (letters/digits/_, max 8 chars before .cpp)');
        });
        var bases = files.map(function (f) { return f.replace(/\.(cpp|cc)$/, ''); });
        var H0 = 14 * files.length + 16;
        var nodes = [], edges = [];
        bases.forEach(function (b, i) {
          var y = 10 + i * 14;
          nodes.push({ id: 'src' + i, label: files[i], x: 9, y: y, shape: 'box' });
          nodes.push({ id: 'i' + i, label: b + '.i', x: 29, y: y, shape: 'box' });
          nodes.push({ id: 's' + i, label: b + '.s', x: 47, y: y, shape: 'box' });
          nodes.push({ id: 'o' + i, label: b + '.o', x: 65, y: y, shape: 'box' });
          edges.push(['src' + i, 'i' + i, 'cpp'], ['i' + i, 's' + i, 'cc1plus'], ['s' + i, 'o' + i, 'as']);
        });
        var midY = 10 + (files.length - 1) * 7;
        nodes.push({ id: 'ld', label: 'ld', x: 81, y: midY, shape: 'box' });
        nodes.push({ id: 'lib', label: 'libstdc++', x: 81, y: H0 - 4, shape: 'box' });
        nodes.push({ id: 'exe', label: 'app', x: 94, y: midY, shape: 'box' });
        bases.forEach(function (b, i) { edges.push(['o' + i, 'ld']); });
        edges.push(['lib', 'ld'], ['ld', 'exe']);
        function g(hl, ehl, tags) { return { type: 'graph', label: 'g++ driver running the tool chain', directed: true, height: H0, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        function fn(b) { return b + '_value'; }
        function mangled(b) { return '_Z' + fn(b).length + fn(b) + 'v'; }
        var frames = [];
        var hl0 = {}; bases.forEach(function (b, i) { hl0['src' + i] = 'cur'; });
        frames.push(fr('You have <b>' + files.length + '</b> source file(s) on disk. Each one will travel through the pipeline <b>on its own</b> — the compiler never looks at two <code>.cpp</code> files together. Only the linker (<code>ld</code>) at the end sees everything.', [g(hl0, {}, {}),
          tx('In this demo <code>' + files[0] + '</code> holds <code>main()</code>' + (files.length > 1 ? ' and calls ' + bases.slice(1).map(function (b) { return '<code>' + fn(b) + '()</code>'; }).join(', ') + ', which live in the other file(s).' : ' and prints a message using <code>std::cout</code>.'), 'Setup')]));
        var doneHl = {};
        bases.forEach(function (b, i) {
          var isMain = i === 0;
          var src = isMain
            ? '#include <iostream>\n' + bases.slice(1).map(function (o) { return 'int ' + fn(o) + '();      // declaration only'; }).join('\n') + (bases.length > 1 ? '\n' : '') + 'int main() {\n    std::cout << ' + (bases.length > 1 ? bases.slice(1).map(function (o) { return fn(o) + '()'; }).join(' + ') : '"hi"') + ' << \'\\n\';\n}'
            : '// ' + files[i] + '\nint ' + fn(b) + '() {          // the definition (the body)\n    return ' + (i * 10 + 2) + ';\n}';
          var hl = copy(doneHl); hl['src' + i] = 'cur'; hl['i' + i] = 'ok';
          var eh = {}; eh['src' + i + '-i' + i] = 'ok';
          frames.push(fr('<b>Stage 1 — preprocess ' + files[i] + '.</b> Pure copy-paste: every <code>#include</code> is replaced by the whole header file, macros are expanded, comments vanish. ' + (isMain ? 'Because of <code>&lt;iostream&gt;</code> this small file grows to <b>tens of thousands of lines</b>. ' : 'This file includes nothing, so it barely changes. ') + 'The result (<code>' + b + '.i</code>) is one <b>translation unit</b>.', [g(hl, eh, { ['i' + i]: 'TU' }), cp(src, isMain ? { 1: 'cur' } : {}, files[i] + ' (what you wrote)')]));
          var pre = isMain
            ? '# 1 "' + files[i] + '"\n// ... ~30,000 lines of <iostream> pasted here ...\nnamespace std { extern ostream cout; /* ... */ }\n' + bases.slice(1).map(function (o) { return 'int ' + fn(o) + '();'; }).join('\n') + (bases.length > 1 ? '\n' : '') + 'int main() { /* ... */ }'
            : '# 1 "' + files[i] + '"\nint ' + fn(b) + '() {\n    return ' + (i * 10 + 2) + ';\n}';
          hl = copy(doneHl); hl['i' + i] = 'cur'; hl['s' + i] = 'ok';
          eh = {}; eh['i' + i + '-s' + i] = 'ok';
          frames.push(fr('<b>Stage 2 — compile ' + b + '.i.</b> Now real C++ rules apply: syntax, types, overload resolution, templates, optimizations. ' + (isMain && bases.length > 1 ? 'Calling <code>' + fn(bases[1]) + '()</code> is fine because a <b>declaration</b> was seen — the compiler trusts that the body exists <i>somewhere</i>. ' : '') + 'Output: assembly text for your CPU (<code>' + b + '.s</code>).', [g(hl, eh), cp(pre, {}, b + '.i (after preprocessing)')]));
          var asm = isMain
            ? 'main:\n    sub  rsp, 8\n' + (bases.length > 1 ? bases.slice(1).map(function (o) { return '    call ' + mangled(o) + '   ; address unknown yet!'; }).join('\n') + '\n' : '') + '    ; ... call into std::cout ...\n    xor  eax, eax          ; return 0\n    ret'
            : mangled(b) + ':          ; mangled name of ' + fn(b) + '()\n    mov  eax, ' + (i * 10 + 2) + '\n    ret';
          hl = copy(doneHl); hl['s' + i] = 'cur'; hl['o' + i] = 'ok';
          eh = {}; eh['s' + i + '-o' + i] = 'ok';
          var syms = isMain
            ? [['T', 'main', 'defined here']].concat(bases.slice(1).map(function (o) { return ['U', mangled(o), 'needed, not defined here']; })).concat([['U', '_ZSt4cout', 'needed (std::cout)']])
            : [['T', mangled(b), 'defined here']];
          frames.push(fr('<b>Stage 3 — assemble ' + b + '.s.</b> Assembly becomes binary machine code in an <b>object file</b> (<code>' + b + '.o</code>). It also gets a <b>symbol table</b>: <span class="c-g">T</span> = "I define this", <span class="c-r">U</span> = "I use this but someone else must provide it". Names are <b>mangled</b> (e.g. <code>' + (bases.length > 1 ? mangled(bases[bases.length - 1]) : '_ZSt4cout') + '</code>) so overloads get unique names.', [g(hl, eh), cp(asm, {}, b + '.s (simplified x86-64)'), { type: 'table', label: 'nm ' + b + '.o', columns: ['kind', 'symbol', 'meaning'], rows: syms, hl: {} }]));
          doneHl['src' + i] = 'done'; doneHl['i' + i] = 'done'; doneHl['s' + i] = 'done'; doneHl['o' + i] = 'ok';
        });
        var hlL = copy(doneHl); hlL.ld = 'cur'; hlL.lib = 'ok';
        var ehL = { 'lib-ld': 'ok' }; bases.forEach(function (b, i) { ehL['o' + i + '-ld'] = 'ok'; });
        var rows = [];
        bases.slice(1).forEach(function (o, k) { rows.push([mangled(o), 'main.o asks (U)', files[k + 1] + ' gives it (T)', 'resolved']); });
        rows.push(['_ZSt4cout', files[0] + ' asks (U)', 'libstdc++ gives it', 'resolved']);
        rows.push(['main', '—', files[0] + ' (T)', 'entry point']);
        frames.push(fr('<b>Stage 4 — link.</b> The linker gathers all object files plus the C++ standard library and plays a matching game: every <span class="c-r">U</span> must meet exactly <b>one</b> <span class="c-g">T</span>. Then it patches the "address unknown yet" holes in the machine code with real addresses.', [g(hlL, ehL), { type: 'table', label: 'Linker symbol resolution', columns: ['symbol', 'needed by', 'defined by', 'status'], rows: rows, hl: {} }]));
        if (bases.length > 1) {
          var bad = copy(doneHl); bad['o' + (bases.length - 1)] = 'bad'; bad.ld = 'bad';
          frames.push(fr('<b>What if you forget a file?</b> Say you run <code>g++ ' + files.slice(0, -1).join(' ') + '</code> without <code>' + files[files.length - 1] + '</code>. Stages 1–3 still succeed for the others (each TU only needed the <i>declaration</i>). The linker finds a <span class="c-r">U</span> with no <span class="c-g">T</span> and fails.', [g(bad, {}), tx('<code class="c-r">undefined reference to `' + fn(bases[bases.length - 1]) + '()\'</code><br>collect2: error: ld returned 1 exit status', 'g++ output')]));
        }
        var hlE = copy(doneHl); hlE.ld = 'done'; hlE.exe = 'sel'; hlE.lib = 'done';
        frames.push(fr('<b>Done!</b> <code>app</code> is a native executable (ELF on Linux, Mach-O on macOS, PE <code>.exe</code> on Windows). When you run it, the OS loader maps it into memory, links shared libraries such as <code>libstdc++.so</code>, runs global constructors, and finally calls <code>main()</code>.', [g(hlE, { 'ld-exe': 'ok' }), { type: 'table', label: 'Stop early with these flags', columns: ['flag', 'stops after', 'you get'], rows: [['-E', 'preprocessor', '.i text'], ['-S', 'compiler', '.s assembly'], ['-c', 'assembler', '.o object file'], ['(none)', 'linker', 'executable']] }]));
        return frames;
      }
    }, {
      title: 'Macro expansion: why SQUARE(x) x*x lies to you',
      input: 'a+1',
      inputLabel: 'Argument passed to SQUARE (use a, digits, + - * / and parentheses; a = 3)',
      gen: function (input) {
        var arg = String(input || '').replace(/\s+/g, '');
        if (!arg) throw new Error('Type an argument such as a+1 or 2*a');
        if (arg.length > 20) throw new Error('Keep the argument under 20 characters');
        if (!/^[a0-9+\-*/()]+$/.test(arg)) throw new Error('Only a, digits, + - * / and parentheses are allowed');
        // tiny recursive-descent evaluator with integer (C++ style, truncating) division
        function evaluate(expr) {
          var i = 0;
          function peek() { return expr[i]; }
          function prim() {
            var c = peek();
            if (c === '(') { i++; var v = add(); if (peek() !== ')') throw new Error('Unbalanced parentheses'); i++; return v; }
            if (c === '-') { i++; return -prim(); }
            if (c === '+') { i++; return prim(); }
            if (c === 'a') { i++; return 3; }
            var st = i; while (i < expr.length && /[0-9]/.test(expr[i])) i++;
            if (st === i) throw new Error('Could not read the expression near position ' + (i + 1));
            return Number(expr.slice(st, i));
          }
          function mul() {
            var v = prim();
            while (peek() === '*' || peek() === '/') {
              var op = expr[i++], r = prim();
              if (op === '/' && r === 0) throw new Error('Division by zero');
              v = op === '*' ? v * r : Math.trunc(v / r);
            }
            return v;
          }
          function add() {
            var v = mul();
            while (peek() === '+' || peek() === '-') { var op = expr[i++], r = mul(); v = op === '+' ? v + r : v - r; }
            return v;
          }
          var out = add();
          if (i !== expr.length) throw new Error('Unexpected character "' + expr[i] + '"');
          return out;
        }
        var argVal = evaluate(arg);
        var bad = arg + '*' + arg;
        var good = '((' + arg + ')*(' + arg + '))';
        var badVal = evaluate(bad), goodVal = evaluate(good);
        var defs = '#define SQUARE(x) x*x\nint a = 3;\nint r = SQUARE(' + arg + ');';
        var frames = [];
        frames.push(fr('Your code calls <code>SQUARE(' + esc(arg) + ')</code> with <code>a = 3</code>. You <i>expect</i> (' + esc(arg) + ')² = ' + argVal + '² = <b>' + (argVal * argVal) + '</b>. Let us see what the preprocessor actually does.', [cp(defs, { 3: 'cur' }), vp({ a: 3, 'expected r': argVal * argVal })]));
        frames.push(fr('The preprocessor sees the name <code>SQUARE</code> followed by <code>(</code>. It grabs the argument as <b>raw text</b>: <code>' + esc(arg) + '</code>. It does not compute it, does not know its type — it is just characters.', [cp(defs, { 1: 'cur', 3: 'cur' }), { type: 'map', label: 'Macro parameter → captured text', entries: [['x', arg]], hl: { x: 'cur' } }]));
        frames.push(fr('Blind substitution: every <code>x</code> in <code>x*x</code> is replaced by that text, giving <code>' + esc(bad) + '</code>. This is what the <b>compiler</b> receives (check with <code>g++ -E</code>).', [cp('int a = 3;\nint r = ' + bad + ';', { 2: 'bad' }, 'After preprocessing (main.i)'), tx('No parentheses were added — the macro body had none.', 'Note')]));
        frames.push(fr('Now normal C++ precedence applies: <code>*</code> and <code>/</code> bind tighter than <code>+</code> and <code>-</code>. So the expression is <b>not</b> "(' + esc(arg) + ') times (' + esc(arg) + ')" unless the argument is a single token.', [cp('int r = ' + bad + ';', { 1: 'cur' }, 'Compiler parses with precedence'), tx('For a+1 the compiler reads it as <code>a + (1*a) + 1</code>.', 'Precedence')]));
        frames.push(fr('Result with the bad macro: <b class="' + (badVal === argVal * argVal ? 'c-g' : 'c-r') + '">' + badVal + '</b>, expected <b>' + (argVal * argVal) + '</b>. ' + (badVal === argVal * argVal ? 'Lucky this time — the argument has no operators that clash. Try <code>a+1</code> to see it break.' : 'Wrong answer, and no compiler error or warning told you!'), [vp({ a: 3, 'r (macro)': badVal, expected: argVal * argVal }, { 'r (macro)': badVal === argVal * argVal ? 'ok' : 'bad' })]));
        frames.push(fr('Classic fix #1: wrap every parameter <i>and</i> the whole body in parentheses: <code>#define SQUARE(x) ((x)*(x))</code>. Expansion: <code>' + esc(good) + '</code> = <b class="c-g">' + goodVal + '</b>.', [cp('#define SQUARE(x) ((x)*(x))\nint r = ' + good + ';', { 2: 'ok' }), vp({ r: goodVal }, { r: 'ok' })]));
        frames.push(fr('But <code>SQUARE(a++)</code> would still paste <code>((a++)*(a++))</code>: <code>a</code> is modified twice with no ordering = <b class="c-r">undefined behavior</b>. Real fix: a <code>constexpr</code> function. It is typed, evaluates the argument <b>once</b>, respects scope, shows up in the debugger, and can still run at compile time.', [cp('constexpr long long square(long long x) { return x * x; }\nint r = square(' + arg + ');   // ' + (argVal * argVal), { 1: 'ok', 2: 'ok' }), { type: 'table', label: 'Macro vs constexpr function', columns: ['', 'macro', 'constexpr fn'], rows: [['type checked', 'no', 'yes'], ['arg evaluated', 'every use', 'once'], ['respects namespaces', 'no', 'yes'], ['compile-time capable', 'yes', 'yes']] }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: a macro with no parentheses', html: R`<p><code>#define DOUBLE(x) x + x</code> then <code>cout &lt;&lt; 3 * DOUBLE(2);</code>. The preprocessor writes <code>3 * 2 + 2</code>, which is <b>8</b>, not 12. Fix: <code>#define DOUBLE(x) ((x) + (x))</code> — or better, a function. Interviewers love this one because nothing warns you.</p>`, code: R`
#include <iostream>
#define DOUBLE(x) x + x
int main() {
    std::cout << 3 * DOUBLE(2) << '\n';   // prints 8, because it becomes 3 * 2 + 2
}` },
      { title: 'What does the compiler do? Declaration without definition', html: R`<p>A file declares <code>int add(int, int);</code> and calls it, but no <code>.cpp</code> provides the body. <b>The compiler is happy</b> (it trusts the declaration). <b>The linker fails</b>: <code>undefined reference to 'add(int, int)'</code>. If you never <i>call</i> it, there is no error at all — the linker only hunts for symbols that are actually used.</p>`, code: R`
int add(int a, int b);          // declaration: "trust me, this exists somewhere"
int main() {
    return add(2, 3);           // compiles fine; would fail at LINK time if no .cpp defines add
}
// Uncommenting this definition makes the program link:
// int add(int a, int b) { return a + b; }` },
      { title: 'Conditional compilation for debug logging', html: R`<p><code>#ifdef</code> lets one source file produce different programs. Build with <code>g++ -DDEBUG main.cpp</code> and the logging line is compiled in; build without it and the line is <b>removed before the compiler even sees it</b> — zero cost. <code>NDEBUG</code> works the same way to switch off <code>assert</code> in release builds.</p>`, code: R`
#include <cassert>
#include <iostream>
int main() {
    int balance = 100;
#ifdef DEBUG
    std::cerr << "[debug] balance = " << balance << '\n';   // only in -DDEBUG builds
#endif
    assert(balance >= 0);    // disappears when compiled with -DNDEBUG
    std::cout << balance << '\n';
}` },
      { title: 'Predefined macros the compiler gives you', html: R`<p>Every compiler defines some macros for free: <code>__FILE__</code>, <code>__LINE__</code>, <code>__cplusplus</code> (<code>201703L</code> for C++17, <code>202002L</code> for C++20, <code>202302L</code> for C++23), plus platform ones like <code>_WIN32</code> or <code>__linux__</code>. Since C++20 you can use <code>std::source_location</code> instead of <code>__FILE__</code>/<code>__LINE__</code> — it is a real object, not a macro.</p>`, code: R`
#include <iostream>
#include <source_location>
void log(const char* msg, std::source_location loc = std::source_location::current()) {
    std::cout << loc.file_name() << ':' << loc.line() << ' ' << msg << '\n';
}
int main() {
    std::cout << "__LINE__ = " << __LINE__ << ", C++ version " << __cplusplus << '\n';
    log("hello");   // prints this file name and line number
}` }
    ],
    deepDive: R`<h4>🟣 What really happens inside g++</h4>
<p><code>g++</code> is just a <b>driver</b>. Run <code>g++ -v main.cpp</code> to see the real programs: <code>cc1plus</code> (preprocessor + compiler in one process — modern compilers do not write the <code>.i</code> file unless you ask), <code>as</code> (the GNU assembler) and <code>collect2</code>/<code>ld</code> (the linker; many teams swap in the faster <code>lld</code> or <code>mold</code> with <code>-fuse-ld=mold</code>). Clang works the same way with <code>clang++</code>; MSVC uses <code>cl.exe</code> and <code>link.exe</code>, and its objects are <code>.obj</code>.</p>
<h4>The formal "phases of translation"</h4>
<p>The standard lists phases: map characters, splice lines ending in <code>\</code>, split into preprocessing tokens and remove comments, run directives and expand macros, then translate. Macros operate on <b>tokens</b>, not characters — that is why <code>#define PI 3.14</code> does not change the word <code>PIZZA</code>. Two special operators exist: <code>#x</code> turns an argument into a string literal and <code>a##b</code> glues tokens together.</p>
<h4>Object files and relocation</h4>
<p>An object file (ELF on Linux) has sections: <code>.text</code> (code), <code>.data</code> (initialized globals), <code>.bss</code> (zero-initialized globals — they take no space in the file), <code>.rodata</code> (string literals, constants), plus a <b>symbol table</b> and <b>relocation entries</b> ("at offset 0x1c, put the address of <code>_Z3addii</code>"). The linker resolves symbols and applies relocations. Symbols are <b>mangled</b> to encode namespaces and parameter types (<code>add(int,int)</code> → <code>_Z3addii</code>); <code>c++filt _Z3addii</code> or <code>nm -C</code> un-mangles them. <code>extern "C"</code> switches mangling off so C code can call you.</p>
<h4>Static vs dynamic linking</h4>
<p>A <b>static library</b> (<code>.a</code> / <code>.lib</code>) is an archive of <code>.o</code> files copied into your executable. A <b>shared library</b> (<code>.so</code> / <code>.dylib</code> / <code>.dll</code>) is loaded at start-up by the dynamic loader; updates do not require relinking but bring "works on my machine" version issues. Library <b>order</b> matters with GNU ld: <code>g++ main.o -lfoo</code> works, <code>g++ -lfoo main.o</code> may give undefined references, because ld scans left to right.</p>
<h4>Why C++ builds are slow — and the fixes</h4>
<p>Every TU re-parses every header it includes. Include <code>&lt;iostream&gt;</code> in 500 files and the compiler parses it 500 times. Mitigations: include only what you use, forward declarations, <b>precompiled headers</b>, unity builds, <code>ccache</code>, distributed builds — and <b>C++20 modules</b> (<code>import std;</code> is standard in C++23), which are compiled once into a binary interface. Module support is mature in MSVC and arriving in Clang and GCC in 2025–26; most codebases still use headers, so you must know both.</p>
<h4>Link-time optimization</h4>
<p>Because the compiler sees one TU at a time, it cannot inline a function defined in another <code>.cpp</code>. <code>-flto</code> stores an intermediate representation in the object files so the linker can optimize across TUs — often 5–15% faster binaries for large programs.</p>`,
    aiEra: R`<p><b>What AI changes:</b> assistants and IDE copilots can generate a whole <code>CMakeLists.txt</code>, explain a 200-line template error, or decode <code>_ZNSt6vectorIiSaIiEE9push_backEOi</code> instantly. Build-system boilerplate is no longer where you should spend your energy.</p>
<p><b>Use AI as a partner:</b> paste the <i>first</i> error line plus the command you ran and ask "which stage produced this and why?" Ask it to "show the preprocessed output of this macro call" and then verify with <code>g++ -E</code>. Ask "list every symbol main.o needs" and check with <code>nm -C</code>.</p>
<p><b>Where AI goes wrong:</b> it often "fixes" an <code>undefined reference</code> by pasting the function body into the header (now you get <code>multiple definition</code> in a bigger project), adds <code>#include</code>s that do not exist on your platform, mixes MSVC and GCC flags, or suggests <code>#define</code> constants where <code>constexpr</code> is correct. It also confidently invents compiler flags — check <code>man g++</code>.</p>
<p><b>What you must still own:</b> knowing that the compiler sees one TU, the difference between a compile error and a link error, how to read the very first error message, and how to reproduce a build by hand. In interviews this is the "tell me what happens when you compile" question — no tool answers it for you on a whiteboard.</p>`,
    problems: [{
      title: 'Macro Trap: Replace SQUARE with Something Safe',
      level: 'Easy', tags: ['preprocessor', 'macros', 'constexpr'], companies: ['Qualcomm', 'NVIDIA', 'Bloomberg'],
      statement: R`<p>A legacy program reads <b>T</b> integers and, for each <code>v</code>, prints <code>SQUARE(v + 1)</code> where <code>#define SQUARE(x) x*x</code>. Users report wrong numbers. Rewrite it so that each line prints the true value of (v + 1)² — without using a macro — and make sure large inputs do not overflow.</p>`,
      constraints: R`1 ≤ T ≤ 10<sup>5</sup>, |v| ≤ 10<sup>9</sup>. Output one number per line.`,
      example: R`<p>Input: <code>3</code> / <code>2 -1 9</code><br>Buggy output: <span class="c-r">5 -1 19</span> (because <code>v+1*v+1</code> = 2v+1)<br>Correct output: <span class="c-g">9 0 100</span>. For v = 2: (2+1)² = 9.</p>`,
      brute: { why: R`<p>The original code uses a function-like macro. The preprocessor pastes text, so <code>SQUARE(v + 1)</code> becomes <code>v + 1*v + 1</code> = 2v + 1. Even with parentheses, <code>int</code> overflows: (10<sup>9</sup>+1)² ≈ 10<sup>18</sup> needs 64 bits.</p>`, code: R`
#include <iostream>
#define SQUARE(x) x*x            // BUG 1: no parentheses  BUG 2: int arithmetic overflows
int main() {
    int t; std::cin >> t;
    while (t--) {
        int v; std::cin >> v;
        std::cout << SQUARE(v + 1) << '\n';   // becomes v + 1*v + 1
    }
}` },
      mcq: { q: 'What does <code>SQUARE(v + 1)</code> become with <code>#define SQUARE(x) x*x</code>?', options: ['<code>(v+1)*(v+1)</code>', '<code>v + 1*v + 1</code>', 'A compile error', '<code>v*v + 1</code>'], answer: 1, explain: 'The preprocessor pastes the argument text into x*x verbatim: v + 1*v + 1. Multiplication binds first, so the result is 2v + 1.' },
      hints: [
        R`<p>Hint 1: the preprocessor never computes anything — write out the expansion by hand and apply precedence.</p>`,
        R`<p>Hint 2: replace the macro with a <code>constexpr</code> function taking <code>long long</code>; the argument is evaluated once and typed.</p>`,
        R`<p>Hint 3: |v + 1| ≤ 10<sup>9</sup>+1, so the square is ≤ ~10<sup>18</sup> &lt; 9.22·10<sup>18</sup> (the <code>long long</code> max). Read with fast I/O because T is up to 10<sup>5</sup>. Recipe: read T; loop; read v as long long; print square(v + 1).</p>`
      ],
      solution: {
        approach: R`<p>Use a <code>constexpr long long square(long long)</code> function. Read each value into a <code>long long</code> so <code>v + 1</code> is already computed in 64 bits, then square it. Turn on fast I/O and use <code>'\n'</code> instead of <code>endl</code>.</p>`,
        code: R`
#include <iostream>

// Typed, evaluated once, overflow-safe for |x| <= ~3*10^9.
constexpr long long square(long long x) { return x * x; }

int main() {
    std::ios::sync_with_stdio(false);   // fast I/O (explained in the I/O topic)
    std::cin.tie(nullptr);

    int t;
    if (!(std::cin >> t)) return 0;
    while (t--) {
        long long v;
        std::cin >> v;
        std::cout << square(v + 1) << '\n';   // argument computed ONCE, in 64-bit
    }
    static_assert(square(3) == 9, "constexpr works at compile time too");
    return 0;
}`,
        dry: { head: ['v', 'macro expansion', 'macro result', 'square(v+1)'], rows: [['2', '2+1*2+1', '<span class="c-r">5</span>', '<span class="c-g">9</span>'], ['-1', '-1+1*-1+1', '<span class="c-r">-1</span>', '<span class="c-g">0</span>'], ['9', '9+1*9+1', '<span class="c-r">19</span>', '<span class="c-g">100</span>'], ['10<sup>9</sup>', 'int overflow even with parens', '<span class="c-r">UB</span>', '<span class="c-g">1000000002000000001</span>']] },
        complexity: R`<p>O(T) time, O(1) extra memory. The function call is inlined by the optimizer, so it costs exactly what the macro did.</p>`,
        followUps: ['Write a macro that stringifies its argument with <code>#</code> and explain where macros are still the right tool (include guards, platform switches, logging with __LINE__).', 'What happens to <code>square(i++)</code> vs <code>SQUARE(i++)</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Header vs source files, declarations vs definitions, ODR
     ====================================================================== */
  topics.push({
    title: 'Header vs Source Files: Declarations, Definitions, Include Guards & the ODR',
    analogy: R`<p>A <b>restaurant menu</b> versus the <b>kitchen</b>. The menu (the <b>header</b>, <code>.h</code>) tells customers <i>what</i> they can order and what each dish contains — "Pasta(sauce, size) → plate". The kitchen (the <b>source file</b>, <code>.cpp</code>) is <i>how</i> the dish is actually cooked. You can photocopy the menu and put it on every table (include the header in many files) — no problem. But if you build <b>two kitchens</b> that both claim to be "the" pasta kitchen, the waiter (the linker) does not know where to send the order: "multiple definition". And if a dish is on the menu but no kitchen cooks it, the order fails: "undefined reference".</p>`,
    explain: R`<h4>🟢 Declaration vs definition</h4>
<p>A <b>declaration</b> introduces a name and its type: "a function called <code>area</code> exists, it takes a <code>double</code> and returns a <code>double</code>". A <b>definition</b> is the declaration <i>plus the actual thing</i>: the function body, or the storage for a variable. You may declare something many times, but (with a few exceptions) define it <b>exactly once</b> in the whole program.</p>
${H.table(['Code', 'Declaration?', 'Definition?'], [
  ['<code>double area(double r);</code>', H.c('g', 'yes'), 'no — no body'],
  ['<code>double area(double r) { return 3.14 * r * r; }</code>', H.c('g', 'yes'), H.c('g', 'yes')],
  ['<code>extern int counter;</code>', H.c('g', 'yes'), 'no — storage lives elsewhere'],
  ['<code>int counter = 0;</code>', H.c('g', 'yes'), H.c('g', 'yes') + ' — reserves 4 bytes'],
  ['<code>struct Point;</code>', H.c('g', 'yes') + ' (forward declaration)', 'no — size unknown'],
  ['<code>struct Point { int x, y; };</code>', H.c('g', 'yes'), H.c('g', 'yes') + ' (a class definition)']
])}
<h4>The standard split</h4>
<p>Put <b>declarations</b> (the "menu") in a header <code>geometry.h</code>. Put <b>definitions</b> (the "kitchen") in <code>geometry.cpp</code>. Any file that wants to use the functions includes the header. Every <code>.cpp</code> is compiled separately; the linker connects the calls to the one definition.</p>
<pre>// ---------- geometry.h ----------       // ---------- geometry.cpp ----------
#pragma once                             #include "geometry.h"
double area(double r);                   double area(double r) { return 3.14159 * r * r; }
struct Point { double x, y; };
                                         // ---------- main.cpp ----------
                                         #include &lt;iostream&gt;
                                         #include "geometry.h"
                                         int main() { std::cout &lt;&lt; area(2.0); }

$ g++ -std=c++20 main.cpp geometry.cpp -o app      # BOTH .cpp files on the command line</pre>
<h4>What may live in a header?</h4>
${H.table(['Safe in a header (can appear in many TUs)', 'Must be in exactly ONE .cpp (unless marked inline)'], [
  ['function declarations', 'normal (non-inline) function bodies'],
  ['class / struct / enum definitions', 'non-inline global variable definitions: <code>int g = 0;</code>'],
  ['<code>inline</code> functions and <code>inline</code> variables (C++17)', 'definitions of non-inline static data members'],
  ['templates (their full bodies!)', '—'],
  ['<code>constexpr</code> variables and functions (implicitly inline / internal)', '—'],
  ['<code>extern int g;</code> declarations', '—']
])}
<h4>Include guards: one copy per TU</h4>
<p>If <code>main.cpp</code> includes <code>shapes.h</code> and <code>colors.h</code>, and <b>both</b> of those include <code>point.h</code>, then <code>struct Point</code> would be pasted <b>twice</b> into the same TU → <code>error: redefinition of 'struct Point'</code>. The fix is an <b>include guard</b>:</p>
<pre>#ifndef MYAPP_POINT_H      // first time: not defined yet → keep going
#define MYAPP_POINT_H      // remember that we've been here
struct Point { int x, y; };
#endif                     // second time: everything above is skipped</pre>
<p>Or the one-liner <code>#pragma once</code>. It is not in the ISO standard but every major compiler (GCC, Clang, MSVC) supports it, and most modern codebases use it. Guards protect <b>one TU</b> from double inclusion; they do <b>not</b> stop the same header being included in <i>different</i> TUs — that is normal and fine.</p>
<h4>The One Definition Rule (ODR) in plain English</h4>
<ul><li>Inside one TU: nothing may be defined twice.</li>
<li>In the whole program: every non-inline function or variable that is used must be defined <b>exactly once</b>.</li>
<li>Classes, inline functions, inline variables and templates may be defined in several TUs, but every copy must be <b>token-for-token identical</b>. Breaking this is undefined behavior and often <i>not diagnosed</i>.</li></ul>`,
    clues: [
      '"What goes in a .h vs a .cpp?" → declarations and inline/template code in headers; normal function bodies and global variable definitions in exactly one .cpp',
      '"redefinition of struct X" (compile error) → header included twice in the same TU → missing include guard / #pragma once',
      '"multiple definition of X" (link error) → non-inline definition in a header included from several .cpp files',
      '"How do you share a global variable across files?" → <code>extern</code> declaration in the header + one definition in a .cpp, or C++17 <code>inline</code> variable',
      '"Why must templates be defined in headers?" → the compiler needs the body to instantiate it in each TU that uses it',
      '"Circular includes" / "incomplete type" → break the cycle with a forward declaration and pointers/references',
      '"What is the ODR?" → One Definition Rule; violations across TUs are often silent UB'
    ],
    code: [R`
// One file that SIMULATES a header + source split, so it compiles on its own.
// In a real project the three sections below live in three different files.

// ======================= geometry.h (the "menu") =======================
#ifndef GEOMETRY_H            // include guard: second inclusion becomes empty
#define GEOMETRY_H
#include <string>

namespace geo {
    struct Point { double x = 0, y = 0; };          // class definition: OK in headers

    double distance(Point a, Point b);              // declaration only
    inline double sq(double v) { return v * v; }    // inline: may appear in many TUs
    extern int callCount;                           // declaration of a shared global
    inline const std::string unitName = "metres";   // C++17 inline variable: one object program-wide
}
#endif

// Including it a second time is harmless thanks to the guard:
#ifndef GEOMETRY_H
#error "never reached"
#endif

// ======================= geometry.cpp (the "kitchen") ===================
#include <cmath>
namespace geo {
    int callCount = 0;                                  // THE single definition
    double distance(Point a, Point b) {                 // THE single definition
        ++callCount;
        return std::sqrt(sq(a.x - b.x) + sq(a.y - b.y));
    }
}

// ======================= main.cpp ======================================
#include <iostream>
int main() {
    geo::Point p{0, 0}, q{3, 4};
    std::cout << geo::distance(p, q) << ' ' << geo::unitName << '\n';   // 5 metres
    std::cout << "calls: " << geo::callCount << '\n';                    // calls: 1
}`, { lang: 'bash', code: R`
# A tiny real project layout
# app/
#   include/geo/geometry.h
#   src/geometry.cpp
#   src/main.cpp
#   CMakeLists.txt

g++ -std=c++20 -Iinclude -c src/geometry.cpp -o geometry.o   # -I adds a header search path
g++ -std=c++20 -Iinclude -c src/main.cpp     -o main.o
g++ geometry.o main.o -o app

# Change only geometry.cpp?  Recompile just that one file, then relink. That is
# the whole point of separate compilation: big projects rebuild in seconds.

# Minimal CMakeLists.txt (the de-facto build system):
#   cmake_minimum_required(VERSION 3.20)
#   project(app CXX)
#   set(CMAKE_CXX_STANDARD 20)
#   add_executable(app src/main.cpp src/geometry.cpp)
#   target_include_directories(app PRIVATE include)
cmake -S . -B build && cmake --build build`, title: 'Real layout + build commands' }],
    codeTitle: ['Header / source split (simulated in one file)', 'Real layout + build commands'],
    viz: {
      title: 'Include guards & the One Definition Rule',
      input: 'no-guard',
      inputLabel: 'Scenario: no-guard | guard | body-in-header | inline',
      gen: function (input) {
        var sc = String(input || '').trim().toLowerCase();
        var ok = ['no-guard', 'guard', 'body-in-header', 'inline'];
        if (ok.indexOf(sc) < 0) throw new Error('Type one of: no-guard, guard, body-in-header, inline');
        var frames = [];
        if (sc === 'no-guard' || sc === 'guard') {
          var guarded = sc === 'guard';
          var nodes = [
            { id: 'm', label: 'main.cpp', x: 12, y: 25, shape: 'box' },
            { id: 's', label: 'shapes.h', x: 42, y: 10, shape: 'box' },
            { id: 'c', label: 'colors.h', x: 42, y: 40, shape: 'box' },
            { id: 'p', label: 'point.h', x: 78, y: 25, shape: 'box' }
          ];
          var edges = [['m', 's', '1st'], ['m', 'c', '2nd'], ['s', 'p'], ['c', 'p']];
          var G = function (hl, ehl, tags) { return { type: 'graph', label: 'Who includes whom (one TU: main.cpp)', directed: true, height: 50, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; };
          var ph = guarded ? '#ifndef POINT_H\n#define POINT_H\nstruct Point { int x, y; };\n#endif' : 'struct Point { int x, y; };';
          frames.push(fr('<code>main.cpp</code> includes <code>shapes.h</code> and <code>colors.h</code>. Both of them need <code>Point</code>, so both include <code>point.h</code>. ' + (guarded ? 'This time <code>point.h</code> <b>has an include guard</b>.' : '<code>point.h</code> has <b>no include guard</b>.'), [G({ m: 'cur' }, {}), cp(ph, {}, 'point.h')]));
          frames.push(fr('The preprocessor starts pasting. First <code>#include "shapes.h"</code> → inside it, <code>#include "point.h"</code> → ' + (guarded ? '<code>POINT_H</code> is not defined yet, so it defines it and pastes <code>struct Point</code>.' : '<code>struct Point</code> is pasted.'), [G({ s: 'cur', p: 'ok' }, { 'm-s': 'ok', 's-p': 'ok' }), { type: 'table', label: 'Macros defined so far', columns: ['macro'], rows: guarded ? [['POINT_H']] : [['(none)']] }, cp('struct Point { int x, y; };   // copy #1\nstruct Shape { Point center; };', { 1: 'ok' }, 'TU so far')]));
          if (guarded) {
            frames.push(fr('Next, <code>#include "colors.h"</code> → <code>#include "point.h"</code> again. The guard asks <code>#ifndef POINT_H</code> — but <code>POINT_H</code> <b>is</b> defined now, so <b>everything up to #endif is skipped</b>. Nothing is pasted.', [G({ c: 'cur', p: 'done' }, { 'm-c': 'ok', 'c-p': 'bad' }, { p: 'skipped' }), cp('#ifndef POINT_H      // false: already defined\n#define POINT_H\nstruct Point { int x, y; };\n#endif', { 1: 'cur', 2: 'done', 3: 'done' }, 'point.h, second visit')]));
            frames.push(fr('The final TU contains <code>struct Point</code> exactly <b>once</b>. The compiler is happy. <code>#pragma once</code> achieves the same in one line.', [G({ m: 'ok', s: 'done', c: 'done', p: 'done' }, {}), cp('struct Point { int x, y; };   // copy #1 only\nstruct Shape { Point center; };\nstruct Color { int r, g, b; Point at; };\nint main() { }', { 1: 'ok' }, 'Final TU')]));
            frames.push(fr('Remember the limit: guards work <b>per TU</b>. If <code>geometry.cpp</code> also includes <code>point.h</code>, it gets its own copy — that is <b>correct</b>, because a class definition is allowed once <i>per TU</i>.', [{ type: 'table', label: 'Per-TU view', columns: ['TU', 'copies of struct Point', 'OK?'], rows: [['main.cpp', '1', 'yes'], ['geometry.cpp', '1', 'yes']], hl: { 0: 'ok', 1: 'ok' } }]));
          } else {
            frames.push(fr('Next, <code>#include "colors.h"</code> → <code>#include "point.h"</code> again. With no guard, the preprocessor pastes <code>struct Point</code> a <b>second time</b> into the same TU.', [G({ c: 'cur', p: 'bad' }, { 'm-c': 'ok', 'c-p': 'bad' }), cp('struct Point { int x, y; };   // copy #1\nstruct Shape { Point center; };\nstruct Point { int x, y; };   // copy #2 !!\nstruct Color { int r, g, b; Point at; };', { 3: 'bad' }, 'TU so far')]));
            frames.push(fr('The compiler reads the TU and stops: the same class is defined twice in one TU. This is a <b>compile</b> error (not a link error), and it points at the second copy.', [tx('<code class="c-r">point.h:1:8: error: redefinition of \'struct Point\'</code><br><code>point.h:1:8: note: previous definition of \'struct Point\'</code>', 'g++ output'), G({ p: 'bad' }, {})]));
            frames.push(fr('Fix: add <code>#pragma once</code> as the first line of <code>point.h</code> (or a classic <code>#ifndef</code> guard). Type <b>guard</b> in the input box to replay this with the fix.', [cp('#pragma once\nstruct Point { int x, y; };', { 1: 'ok' }, 'point.h (fixed)')]));
          }
        } else {
          var isInline = sc === 'inline';
          var hdr = (isInline ? 'inline ' : '') + 'int twice(int v) { return 2 * v; }';
          var nodes2 = [
            { id: 'h', label: 'util.h', x: 12, y: 25, shape: 'box' },
            { id: 'a', label: 'a.cpp', x: 36, y: 10, shape: 'box' },
            { id: 'b', label: 'b.cpp', x: 36, y: 40, shape: 'box' },
            { id: 'ao', label: 'a.o', x: 60, y: 10, shape: 'box' },
            { id: 'bo', label: 'b.o', x: 60, y: 40, shape: 'box' },
            { id: 'ld', label: 'ld', x: 84, y: 25, shape: 'box' }
          ];
          var edges2 = [['h', 'a', 'include'], ['h', 'b', 'include'], ['a', 'ao'], ['b', 'bo'], ['ao', 'ld'], ['bo', 'ld']];
          var G2 = function (hl, ehl, tags) { return { type: 'graph', label: 'Two TUs share one header', directed: true, height: 50, nodes: nodes2, edges: edges2, hl: hl, ehl: ehl, tags: tags || {} }; };
          frames.push(fr('<code>util.h</code> contains a function <b>with its body</b>' + (isInline ? ', marked <code>inline</code>' : ' (not inline)') + '. Two different source files, <code>a.cpp</code> and <code>b.cpp</code>, include it. Each has a guard — that does not matter here, because these are <b>two separate TUs</b>.', [G2({ h: 'cur' }, {}), cp(hdr, { 1: isInline ? 'ok' : 'cur' }, 'util.h')]));
          frames.push(fr('Each TU is compiled on its own. Both compile fine — inside each TU <code>twice</code> is defined once. Each object file gets its own machine code for <code>twice</code>.', [G2({ a: 'ok', b: 'ok', ao: 'ok', bo: 'ok' }, { 'h-a': 'ok', 'h-b': 'ok', 'a-ao': 'ok', 'b-bo': 'ok' }), { type: 'table', label: 'Symbol tables', columns: ['object', 'symbol', 'kind'], rows: [['a.o', '_Z5twicei', isInline ? 'W (weak / COMDAT)' : 'T (strong)'], ['b.o', '_Z5twicei', isInline ? 'W (weak / COMDAT)' : 'T (strong)']], hl: {} }]));
          if (isInline) {
            frames.push(fr('The linker sees two copies, but both are marked <b>inline</b> (weak / COMDAT). The rule says: inline definitions may appear in many TUs <b>if they are identical</b>. The linker keeps <b>one</b> and silently discards the rest.', [G2({ ld: 'ok', ao: 'done', bo: 'done' }, { 'ao-ld': 'ok', 'bo-ld': 'ok' }, { ld: 'keeps 1' }), tx('Link succeeds ✅', 'Result')]));
            frames.push(fr('Takeaway: <code>inline</code> today means "<b>may be defined in multiple TUs</b>" more than "please inline the call" (the optimizer decides inlining on its own). Templates, functions defined inside a class body, and <code>constexpr</code> functions are implicitly inline. C++17 extends this to variables: <code>inline int counter = 0;</code>.', [cp('inline int twice(int v) { return 2 * v; }   // OK in headers\nstruct S { int f() { return 1; } };         // implicitly inline\ntemplate <class T> T id(T v) { return v; }  // templates: OK in headers\ninline int counter = 0;                     // C++17 inline variable', { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' })]));
          } else {
            frames.push(fr('The linker sees two <b>strong</b> definitions of the same symbol. The One Definition Rule says a non-inline function must be defined exactly once in the program → <b>link error</b>.', [G2({ ld: 'bad', ao: 'bad', bo: 'bad' }, { 'ao-ld': 'bad', 'bo-ld': 'bad' }), tx('<code class="c-r">b.o: in function `twice(int)\': multiple definition of `twice(int)\'; a.o: first defined here</code>', 'ld output')]));
            frames.push(fr('Three correct fixes: (1) keep only the declaration <code>int twice(int);</code> in the header and move the body into <b>one</b> <code>util.cpp</code>; (2) mark it <code>inline</code>; (3) make it <code>static</code> / put it in an unnamed namespace (each TU gets a <i>private</i> copy — fine for tiny helpers, but duplicates code). Type <b>inline</b> to replay with fix 2.', [{ type: 'table', label: 'Fixes', columns: ['fix', 'header contains', 'result'], rows: [['declaration + util.cpp', 'int twice(int);', '1 strong definition'], ['inline', 'inline int twice(int v) {...}', 'linker keeps 1 copy'], ['static / unnamed ns', 'static int twice(int v) {...}', 'private copy per TU']], hl: { 0: 'ok', 1: 'ok' } }]));
          }
        }
        return frames;
      }
    },
    examples: [
      { title: 'What does the compiler/linker do? Global variable in a header', html: R`<p><code>config.h</code> contains <code>int maxUsers = 100;</code> and is included by <code>a.cpp</code> and <code>b.cpp</code>. Both compile. The <b>linker</b> fails with <code>multiple definition of 'maxUsers'</code>. Fixes: <code>extern int maxUsers;</code> in the header plus <code>int maxUsers = 100;</code> in one <code>.cpp</code>; or C++17 <code>inline int maxUsers = 100;</code>; or, if it never changes, <code>constexpr int maxUsers = 100;</code> (const globals have internal linkage, so each TU gets its own harmless copy).</p>`, code: R`
// config.h (fixed, C++17 style)
inline int maxUsers = 100;          // one shared object across all TUs
constexpr int kMaxRetries = 3;      // compile-time constant, fine in a header
extern int requestCount;            // declared here, defined in exactly one .cpp
int requestCount = 0;               // (this line would live in config.cpp)
int main() { return maxUsers + kMaxRetries + requestCount - 103; }` },
      { title: 'Forward declarations break include cycles', html: R`<p><code>Employee</code> points to its <code>Team</code>, and <code>Team</code> holds a list of <code>Employee*</code>. If each header includes the other, you get a cycle and "incomplete type" errors. Since a <b>pointer</b> or <b>reference</b> does not need to know the size of the class, a forward declaration <code>struct Team;</code> is enough. Bonus: fewer includes → faster builds.</p>`, code: R`
#include <vector>
struct Team;                         // forward declaration: "Team exists"
struct Employee {
    const char* name;
    Team* team = nullptr;            // pointer to incomplete type: OK
};
struct Team {
    std::vector<Employee*> members;  // Employee is complete here
};
int main() {
    Team t; Employee e{"Asha", &t};
    t.members.push_back(&e);
    return static_cast<int>(t.members.size()) - 1;   // 0
}` },
      { title: 'Templates must live in headers', html: R`<p>If you declare <code>template&lt;class T&gt; T maxOf(T, T);</code> in a header and put the body in <code>maxof.cpp</code>, calling <code>maxOf(2, 3)</code> from <code>main.cpp</code> gives an <b>undefined reference</b>. Why? A template is a <i>recipe</i>, not code. The compiler can only cook <code>maxOf&lt;int&gt;</code> in a TU where it sees the recipe. So template bodies go in the header (or you explicitly instantiate the types you need in the <code>.cpp</code>).</p>`, code: R`
// maxof.h — the whole template is in the header
template <class T>
T maxOf(T a, T b) { return a < b ? b : a; }

int main() {
    return maxOf(2, 3) + static_cast<int>(maxOf(1.5, 0.5)) - 4;   // 3 + 1 - 4 = 0
}` },
      { title: 'Internal linkage: helpers private to one file', html: R`<p>A helper used only inside <code>parser.cpp</code> should not leak into the global symbol table — another file might have a helper with the same name, and the linker would complain (or worse, silently pick one if both are inline). Put it in an <b>unnamed namespace</b> (or mark it <code>static</code>). It then has <b>internal linkage</b>: invisible to the linker.</p>`, code: R`
#include <cctype>
#include <string>
namespace {                                   // unnamed namespace = file-private
    bool isIdentChar(char c) { return std::isalnum(static_cast<unsigned char>(c)) || c == '_'; }
}
bool isIdentifier(const std::string& s) {     // the public function (external linkage)
    if (s.empty() || std::isdigit(static_cast<unsigned char>(s[0]))) return false;
    for (char c : s) if (!isIdentChar(c)) return false;
    return true;
}
int main() { return isIdentifier("max_len2") ? 0 : 1; }` }
    ],
    deepDive: R`<h4>🟣 Linkage, precisely</h4>
<p>Every name has a <b>linkage</b>: <i>external</i> (visible to other TUs: normal functions and globals), <i>internal</i> (private to its TU: <code>static</code> functions/variables, anything in an unnamed namespace, and namespace-scope <code>const</code>/<code>constexpr</code> variables that are not <code>inline</code> or <code>extern</code>), or <i>none</i> (locals). Only external-linkage names enter the linker's game.</p>
<h4>How inline really works</h4>
<p>On ELF platforms the compiler emits inline functions (and template instantiations) into <b>COMDAT</b> sections / weak symbols. The linker keeps one and discards duplicates without checking that they are identical. That is why an ODR violation — two TUs compiled with different <code>#define</code>s changing a class layout, or two different inline functions with the same name — usually links silently and then crashes in strange ways. Tools that catch it: <code>-flto -Wodr</code> (GCC), AddressSanitizer's ODR checker, and Gold/LLD diagnostics.</p>
<h4>Header hygiene in production</h4>
<ul><li><b>Include what you use</b> (the IWYU tool automates it): every file includes the headers for the names it uses, and nothing more.</li>
<li>Never put <code>using namespace</code> in a header — it leaks into every file that includes it.</li>
<li>Order: own header first in its <code>.cpp</code> (proves the header is self-contained), then standard headers, then third-party.</li>
<li>Prefer forward declarations in headers; include the full header in the <code>.cpp</code>.</li>
<li><b>Pimpl</b> (pointer to implementation) hides private members so changing them does not force every client to recompile — an ABI-stability idiom covered in the expert module.</li></ul>
<h4>Guards vs #pragma once</h4>
<p>Classic guards are 100% portable but need unique macro names (collisions are a real bug source: two libraries both using <code>UTILS_H</code>). <code>#pragma once</code> relies on the compiler recognizing the same file; it can be fooled by the same header reached through two different hard links or network mounts. Compilers also optimize classic guards so they do not even reopen the file. Both are acceptable; be consistent.</p>
<h4>Modules (C++20) change the picture</h4>
<p>A module interface (<code>export module geo;</code>) is compiled once into a binary module interface. Importers see only what is <code>export</code>ed, macros do not leak in or out, and order of imports does not matter. The ODR still applies, but whole classes of header problems disappear. Expect mixed codebases (headers + modules) for years.</p>`,
    aiEra: R`<p><b>What AI changes:</b> an assistant can split a 2,000-line file into headers and sources in seconds, generate include guards, and write the CMake target. Tools like clangd + IWYU (often wrapped by AI agents) suggest missing or unused includes automatically.</p>
<p><b>Use AI as a partner:</b> ask "which of these definitions would violate the ODR if this header were included in two .cpp files?" or "generate a forward-declaration-only version of this header". Then compile with two TUs yourself to confirm.</p>
<p><b>Where AI goes wrong:</b> it frequently "solves" link errors by moving bodies into headers without <code>inline</code>, adds <code>static</code> to globals that were meant to be shared (now each TU has its <i>own</i> counter — a silent logic bug), puts <code>using namespace std;</code> in headers, or forgets that templates need their bodies visible. It may also generate include guards with clashing names like <code>UTILS_H</code>.</p>
<p><b>What you must still own:</b> the declaration/definition distinction, linkage, and the ODR. When a generated refactor links but behaves differently, only this mental model tells you that a <code>static</code> just split one global into many.</p>`,
    problems: [{
      title: 'Share One Counter Across Files (Fix the multiple definition)',
      level: 'Medium', tags: ['linkage', 'extern', 'inline variables', 'ODR'], companies: ['Microsoft', 'Adobe', 'Bloomberg'],
      statement: R`<p>A team wrote <code>stats.h</code> containing <code>int requests = 0;</code> and included it from <code>server.cpp</code> (which increments it per request) and <code>report.cpp</code> (which prints it). The build fails with <code>multiple definition of 'requests'</code>. A teammate "fixed" it with <code>static int requests = 0;</code>: it now links, but the report always prints <b>0</b>. Write the correct design so that one counter is shared, then simulate N requests and print the count.</p>`,
      constraints: R`0 ≤ N ≤ 10<sup>6</sup>. Must compile as C++17 or later. Output the final count.`,
      example: R`<p>Input <code>5</code> → output <span class="c-g">5</span>. With the <code>static</code> "fix" the report would print <span class="c-r">0</span>: <code>server.cpp</code> increments <i>its own private copy</i>, <code>report.cpp</code> reads <i>a different</i> copy that nobody touched.</p>`,
      brute: { why: R`<p>Two broken versions: (a) a plain definition in a header — each TU defines <code>requests</code> → linker sees two strong symbols; (b) <code>static</code> — each TU gets an <b>internal</b> variable with the same name, so there are two counters and writes in one file are invisible in the other.</p>`, code: R`
// ---- stats.h (BROKEN "fix") ----
static int requests = 0;        // internal linkage: every TU gets its OWN copy
// ---- server.cpp ----
void handleRequest() { ++requests; }          // increments server.cpp's copy
// ---- report.cpp ----
// int report() { return requests; }          // would read report.cpp's copy: always 0
int main() {
    for (int i = 0; i < 5; ++i) handleRequest();
    return requests;   // in ONE TU this looks fine, which is why the bug hides in demos
}` },
      mcq: { q: 'Which header line gives exactly ONE shared counter across all TUs (C++17)?', options: ['<code>int requests = 0;</code>', '<code>static int requests = 0;</code>', '<code>inline int requests = 0;</code>', '<code>const int requests = 0;</code>'], answer: 2, explain: 'An inline variable may be defined in many TUs; the linker merges them into one object. static and const give internal linkage (one copy per TU), and a plain definition breaks the ODR.' },
      hints: [
        R`<p>Hint 1: ask "how many objects named <code>requests</code> exist in the final program?" for each version.</p>`,
        R`<p>Hint 2: classic answer: <code>extern int requests;</code> (declaration) in the header and <code>int requests = 0;</code> (definition) in exactly one <code>.cpp</code>. Modern answer: <code>inline int requests = 0;</code> in the header.</p>`,
        R`<p>Hint 3: even better design — hide the global behind functions (<code>void addRequest(); long long requestCount();</code>) so only one file touches the variable. If threads increment it, it must be <code>std::atomic&lt;long long&gt;</code>.</p>`
      ],
      solution: {
        approach: R`<p>Declare in the header, define once. We show the C++17 <code>inline</code> variable plus an encapsulated API. In a multi-file build, the header section goes in <code>stats.h</code>, and every <code>.cpp</code> that includes it refers to the same object.</p>`,
        code: R`
#include <iostream>
// ===== stats.h =====
#pragma once
namespace stats {
    inline long long requests = 0;                  // ONE object program-wide (C++17)
    inline void addRequest() { ++requests; }
    inline long long requestCount() { return requests; }
}
// ===== server.cpp =====
void handleRequest() { stats::addRequest(); }
// ===== report.cpp =====
void printReport() { std::cout << stats::requestCount() << '\n'; }
// ===== main.cpp =====
int main() {
    long long n;
    if (!(std::cin >> n)) n = 0;
    for (long long i = 0; i < n; ++i) handleRequest();
    printReport();                                   // prints n
}`,
        alt: [{ lang: 'cpp', title: 'Pre-C++17: extern + one definition', code: R`
#include <iostream>
// ===== stats.h =====
extern long long requests;          // declaration only: no storage
// ===== stats.cpp =====
long long requests = 0;             // THE definition (exactly one .cpp)
// ===== server.cpp / report.cpp =====
void handleRequest() { ++requests; }
int main() {
    for (int i = 0; i < 5; ++i) handleRequest();
    std::cout << requests << '\n';  // 5
}` }],
        dry: { head: ['version', 'objects named requests', 'link?', 'report prints (N=5)'], rows: [['int requests = 0; in header', '2 (strong)', '<span class="c-r">multiple definition</span>', '—'], ['static int requests = 0;', '2 (private)', 'OK', '<span class="c-r">0</span>'], ['extern + 1 definition', '1', 'OK', '<span class="c-g">5</span>'], ['inline long long requests', '1 (merged)', 'OK', '<span class="c-g">5</span>']] },
        complexity: R`<p>O(N) time for the simulation, O(1) memory. The fix is purely about linkage; it has zero run-time cost.</p>`,
        followUps: ['How would you make the counter thread-safe? (std::atomic, relaxed increments)', 'Why is a function-local static (Meyers singleton) often preferred over a global? (initialization order across TUs)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — main(), program structure and core syntax
     ====================================================================== */
  topics.push({
    title: 'main(), Program Structure & Core Syntax (variables, initialization, scope)',
    analogy: R`<p><code>main</code> is the <b>front door</b> of your house. The operating system is the visitor: it always knocks on the same door, hands you a <b>bag of notes</b> at the doorstep (the command-line arguments, <code>argc</code>/<code>argv</code>), waits while you do your thing, and when you leave you hand back a <b>single number on a sticky note</b> — the exit status. <code>0</code> means "all good", anything else means "something went wrong, here is a code". Scripts, CI pipelines and Docker health checks read that sticky note.</p>`,
    explain: R`<h4>🟢 The smallest valid program</h4>
<pre>int main() { }      // a complete, valid C++ program: does nothing, returns 0</pre>
<p>Every C++ program (that runs on an operating system) has exactly one function called <code>main</code>. It is where your code starts. Rules:</p>
<ul><li>It must return <code>int</code>. <code>void main()</code> is <b>not</b> valid C++ (some old compilers allowed it).</li>
<li>If you reach the closing <code>}</code> of <code>main</code> without a <code>return</code>, it behaves as <code>return 0;</code>. This special case applies to <code>main</code> only.</li>
<li>Two standard signatures: <code>int main()</code> and <code>int main(int argc, char* argv[])</code> (same as <code>char** argv</code>).</li>
<li>You may not call <code>main</code> yourself, take its address, or overload it.</li></ul>
<h4>argc and argv</h4>
<p>Run <code>./app 5 hello</code> and the OS gives you:</p>
${H.table(['', 'value', 'notes'], [
  ['<code>argc</code>', '3', 'count of arguments, <b>including</b> the program name'],
  ['<code>argv[0]</code>', '"./app"', 'program name (as typed; may be empty on some systems)'],
  ['<code>argv[1]</code>', '"5"', 'always <b>text</b> — convert with <code>std::stoi</code> / <code>std::from_chars</code>'],
  ['<code>argv[2]</code>', '"hello"', ''],
  ['<code>argv[3]</code>', 'nullptr', 'the array always ends with a null pointer']
])}
<h4>Statements, blocks and comments</h4>
<p>A <b>statement</b> ends with <code>;</code>. A <b>block</b> <code>{ ... }</code> groups statements and creates a <b>scope</b>: variables declared inside are destroyed at the closing brace. Comments: <code>// to end of line</code> and <code>/* multi-line */</code>. C++ is <b>case-sensitive</b> (<code>Count</code> ≠ <code>count</code>) and mostly whitespace-insensitive.</p>
<h4>Declaring and initializing variables</h4>
${H.table(['Syntax', 'Name', 'Notes'], [
  ['<code>int a;</code>', 'default init', H.c('r', 'local int holds garbage') + '; reading it is undefined behavior'],
  ['<code>int b = 5;</code>', 'copy init', 'classic, fine'],
  ['<code>int c(5);</code>', 'direct init', 'same result for ints'],
  ['<code>int d{5};</code>', 'brace / list init', H.c('g', 'preferred') + ': rejects narrowing like <code>int x{3.7};</code>'],
  ['<code>int e{};</code>', 'value init', 'zero: <code>e == 0</code>'],
  ['<code>auto f = 5;</code>', 'type deduction', '<code>f</code> is <code>int</code>; <code>auto g = 5LL;</code> is <code>long long</code>'],
  ['<code>const int g = 10;</code>', 'constant', 'cannot be changed after initialization'],
  ['<code>constexpr int h = 10 * 10;</code>', 'compile-time constant', 'computed by the compiler; usable as array size']
])}
<h4>Operators you will use daily</h4>
<p><code>+ - * / %</code> (integer <code>/</code> <b>truncates toward zero</b>: <code>7 / 2 == 3</code>, <code>-7 / 2 == -3</code>, <code>-7 % 2 == -1</code>), <code>++i</code> / <code>i++</code>, compound <code>+= -= *=</code>, comparison <code>== != &lt; &lt;= &gt; &gt;=</code>, logical <code>&amp;&amp; || !</code> (short-circuit), and the C++20 three-way comparison <code>&lt;=&gt;</code>. <code>=</code> assigns, <code>==</code> compares — <code>if (x = 5)</code> compiles and is always true (turn on <code>-Wall</code>!).</p>
<h4>Scope and lifetime in one picture</h4>
<pre>int g = 1;                 // global: lives for the whole program
int main() {
    int x = 2;             // local to main
    {
        int x = 3;         // a NEW x that "shadows" the outer one inside this block
        // here x == 3
    }                      // inner x destroyed here
    // here x == 2 again
}</pre>`,
    clues: [
      '"Is <code>void main()</code> valid?" → no; main must return int, and falling off the end returns 0',
      '"What is argc / argv?" → count of arguments including the program name; array of C strings ending with nullptr',
      '"What is the value of an uninitialized local int?" → indeterminate; reading it is undefined behavior (globals are zero-initialized)',
      '"Why prefer <code>int x{3.7};</code> style?" → brace initialization forbids narrowing conversions at compile time',
      '"-7 / 2 and -7 % 2 in C++?" → -3 and -1 (truncation toward zero since C++11)',
      '"What does <code>if (x = 0)</code> do?" → assigns 0 and is always false; compilers warn with -Wall',
      '"What runs before main?" → static initialization of globals (constructors of global objects)'
    ],
    code: [R`
#include <iostream>
#include <string>

int globalCounter;                 // globals are zero-initialized: starts at 0

int main(int argc, char* argv[]) {
    // argv holds C strings; argv[argc] is guaranteed to be nullptr
    std::cout << "program: " << argv[0] << ", extra args: " << argc - 1 << '\n';
    for (int i = 1; i < argc; ++i)
        std::cout << "  argv[" << i << "] = \"" << argv[i] << "\"\n";

    int a = 7, b = 2;
    std::cout << a / b << ' ' << a % b << '\n';        // 3 1   (integer division truncates)
    std::cout << -a / b << ' ' << -a % b << '\n';      // -3 -1 (toward zero)
    std::cout << static_cast<double>(a) / b << '\n';   // 3.5   (convert first!)

    int braces{42};               // brace init
    // int narrow{3.7};           // ERROR: narrowing conversion from double to int
    int copied = 3.7;             // compiles: silently truncates to 3 (warning with -Wconversion)
    auto big = 5'000'000'000LL;   // digit separators (C++14) + LL suffix -> long long
    constexpr int kSize = 4 * 4;  // compile-time constant
    int grid[kSize] = {};         // array size must be a constant expression

    {                             // a new scope
        int braces = 1;           // shadows the outer 'braces' (-Wshadow warns)
        std::cout << braces << '\n';   // 1
    }
    std::cout << braces << ' ' << copied << ' ' << big << ' ' << grid[0] << ' ' << globalCounter << '\n';
    return 0;                     // exit status: 0 = success (optional in main)
}`, R`
#include <cstdlib>     // EXIT_SUCCESS, EXIT_FAILURE, std::exit
#include <iostream>

struct Announcer {                          // a global object's constructor runs BEFORE main
    Announcer()  { std::cout << "1. before main\n"; }
    ~Announcer() { std::cout << "4. after main returns\n"; }
};
Announcer announcer;

int main() {
    std::cout << "2. inside main\n";
    if (std::getenv("FAIL")) {
        std::cerr << "failing on purpose\n";
        return EXIT_FAILURE;                // usually 1; shell sees it in $?
    }
    std::cout << "3. leaving main\n";
    return EXIT_SUCCESS;                    // 0
}`],
    codeTitle: ['argc/argv, division, initialization, scope', 'Life before and after main'],
    viz: {
      title: 'Step through main(argc, argv)',
      input: './app 5 7',
      inputLabel: 'Command line (program name + arguments)',
      gen: function (input) {
        var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!toks.length) throw new Error('Type a command line such as: ./app 5 7');
        if (toks.length > 6) throw new Error('Use at most 5 arguments after the program name');
        toks.forEach(function (t) { if (t.length > 14) throw new Error('Keep each argument under 15 characters'); });
        var code = '#include <iostream>\n#include <string>\nint main(int argc, char* argv[]) {\n    if (argc != 3) {\n        std::cerr << "usage: app A B\\n";\n        return 1;\n    }\n    int a = std::stoi(argv[1]);\n    int b = std::stoi(argv[2]);\n    int sum{a + b};\n    std::cout << a << " + " << b << " = " << sum << \'\\n\';\n    return 0;\n}';
        var argvVals = toks.map(function (t) { return '"' + t + '"'; }).concat(['nullptr']);
        var argvPart = function (hl) { return { type: 'array', label: 'argv (array of C strings)', values: argvVals, hl: hl || {} }; };
        var frames = [];
        var argc = toks.length;
        frames.push(fr('You type <code>' + esc(toks.join(' ')) + '</code>. The shell splits it on spaces and the OS builds <code>argv</code>: one C string per word, then a <code>nullptr</code> at the end. <code>argc = ' + argc + '</code> (the program name counts!). Before <code>main</code> runs, global objects are initialized.', [argvPart({}), vp({ argc: argc }, { argc: 'ok' }, 'Parameters of main'), cp(code, { 3: 'cur' })]));
        frames.push(fr('Line 4: <code>argc != 3</code>? We have argc = ' + argc + ' → ' + (argc !== 3 ? '<b class="c-r">true</b>: wrong number of arguments.' : '<b class="c-g">false</b>, so we skip the usage message.'), [cp(code, { 4: argc !== 3 ? 'bad' : 'ok' }), vp({ argc: argc })]));
        if (argc !== 3) {
          frames.push(fr('Line 5 prints the usage message to <code>std::cerr</code> (the error stream — it is not buffered, so it shows up immediately even if the program crashes later).', [cp(code, { 5: 'cur' }), tx('<code>usage: app A B</code>', 'stderr')]));
          frames.push(fr('Line 6: <code>return 1;</code> ends <code>main</code> with exit status <b>1</b>. In a shell, <code>echo $?</code> prints 1; in a CI pipeline this step is marked <span class="c-r">failed</span>.', [cp(code, { 6: 'bad' }), vp({ 'exit status': 1 }, { 'exit status': 'bad' }, 'Returned to the OS')]));
          return frames;
        }
        function stoiSim(s) {
          var m = /^\s*([+-]?\d+)/.exec(s);
          if (!m) return { err: 'std::invalid_argument' };
          var v = Number(m[1]);
          if (v > 2147483647 || v < -2147483648) return { err: 'std::out_of_range' };
          return { v: v, rest: s.slice(m[0].length) };
        }
        var vars = { argc: argc };
        var aR = stoiSim(toks[1]);
        if (aR.err) {
          frames.push(fr('Line 8: <code>std::stoi("' + esc(toks[1]) + '")</code> cannot parse a number, so it <b>throws</b> <code>' + aR.err + '</code>. Nobody catches it…', [cp(code, { 8: 'bad' }), argvPart({ 1: 'bad' })]));
          frames.push(fr('An uncaught exception calls <code>std::terminate()</code> → <code>abort()</code>. The program dies with a message like <code>terminate called after throwing an instance of \'' + aR.err + '\'</code> and exit status <b>134</b> (128 + SIGABRT 6). Lesson: validate input, or use <code>std::from_chars</code>, which returns an error code instead of throwing.', [vp({ 'exit status': 134 }, { 'exit status': 'bad' }, 'Returned to the OS')]));
          return frames;
        }
        vars.a = aR.v;
        frames.push(fr('Line 8: <code>argv[1]</code> is the <b>text</b> <code>"' + esc(toks[1]) + '"</code>. <code>std::stoi</code> converts it to the int <b>' + aR.v + '</b>.' + (aR.rest ? ' Note: stoi stops at the first non-digit and ignores the rest (<code>"' + esc(aR.rest) + '"</code>) — a classic silent bug.' : ''), [cp(code, { 8: 'cur' }), argvPart({ 1: 'cur' }), vp(vars, { a: 'ok' })]));
        var bR = stoiSim(toks[2]);
        if (bR.err) {
          frames.push(fr('Line 9: <code>std::stoi("' + esc(toks[2]) + '")</code> throws <code>' + bR.err + '</code> → <code>std::terminate</code> → exit status 134.', [cp(code, { 9: 'bad' }), argvPart({ 2: 'bad' }), vp(vars)]));
          return frames;
        }
        vars.b = bR.v;
        frames.push(fr('Line 9: <code>argv[2]</code> = <code>"' + esc(toks[2]) + '"</code> → <code>b = ' + bR.v + '</code>.' + (bR.rest ? ' (trailing <code>"' + esc(bR.rest) + '"</code> silently ignored)' : ''), [cp(code, { 9: 'cur' }), argvPart({ 2: 'cur' }), vp(vars, { b: 'ok' })]));
        var s = aR.v + bR.v;
        var overflow = s > 2147483647 || s < -2147483648;
        vars.sum = overflow ? 'UB! (overflow)' : s;
        frames.push(fr('Line 10: <code>int sum{a + b};</code> brace-initializes a new local. ' + (overflow ? '<span class="c-r">a + b does not fit in a 32-bit int — signed overflow is undefined behavior!</span> Use <code>long long</code>.' : 'sum = ' + s + '. It lives on the <b>stack</b> and dies at the closing <code>}</code>.'), [cp(code, { 10: overflow ? 'bad' : 'cur' }), vp(vars, { sum: overflow ? 'bad' : 'ok' })]));
        frames.push(fr('Line 11: <code>std::cout &lt;&lt;</code> chains several outputs. Text goes into a buffer and reaches the terminal soon after (at the latest when the program exits).', [cp(code, { 11: 'cur' }), tx('<code>' + aR.v + ' + ' + bR.v + ' = ' + (overflow ? '??? (UB)' : s) + '</code>', 'stdout')]));
        frames.push(fr('Line 12: <code>return 0;</code> → exit status 0 = success. Locals <code>a</code>, <code>b</code>, <code>sum</code> are destroyed, global destructors run, buffers are flushed, and the OS gets the 0.', [cp(code, { 12: 'ok' }), vp({ 'exit status': 0 }, { 'exit status': 'ok' }, 'Returned to the OS')]));
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: integer division and modulo with negatives', html: R`<p><code>cout &lt;&lt; 7/2 &lt;&lt; ' ' &lt;&lt; -7/2 &lt;&lt; ' ' &lt;&lt; 7%-2 &lt;&lt; ' ' &lt;&lt; -7%2;</code> prints <b>3 -3 1 -1</b>. Division truncates toward zero, and the sign of <code>%</code> follows the <b>left</b> operand. That is why "is x odd?" must be written <code>x % 2 != 0</code>, not <code>x % 2 == 1</code> (fails for negative x). Python differs: <code>-7 // 2 == -4</code>.</p>`, code: R`
#include <iostream>
int main() {
    std::cout << 7 / 2 << ' ' << -7 / 2 << ' ' << 7 % -2 << ' ' << -7 % 2 << '\n';  // 3 -3 1 -1
    int x = -3;
    std::cout << (x % 2 == 1) << ' ' << (x % 2 != 0) << '\n';                        // 0 1
}` },
      { title: 'What does the compiler do? Brace init catches narrowing', html: R`<p><code>int n = 3.99;</code> compiles and silently stores 3. <code>int n{3.99};</code> is a <b>compile error</b>: "narrowing conversion of '3.99e+0' from 'double' to 'int'". Same for <code>char c{300};</code> (does not fit) and <code>unsigned u{-1};</code>. Braces turn silent data loss into an error at build time — the cheapest bug you will ever fix.</p>`, code: R`
int main() {
    int a = 3.99;          // OK but loses .99 (a == 3)
    // int b{3.99};        // error: narrowing conversion
    int c{static_cast<int>(3.99)};   // explicit: "yes, I mean it"
    long long big{2'000'000'000};    // fits: OK
    return a + c - 6;      // 0
}` },
      { title: 'Uninitialized locals vs globals', html: R`<p>A global or <code>static</code> <code>int</code> starts at 0. A <b>local</b> <code>int</code> without an initializer holds whatever bits were left on the stack; reading it is <b>undefined behavior</b> — the optimizer may assume it never happens and produce bizarre results. C++26 softens this ("erroneous behavior" with a fixed value), but you should never rely on it: always initialize, e.g. <code>int sum = 0;</code> or <code>int sum{};</code>.</p>`, code: R`
#include <iostream>
int g;                       // 0
int main() {
    static int s;            // 0 (static storage)
    int local{};             // 0 because of {}
    // int bad; std::cout << bad;   // UB: never do this
    std::cout << g << s << local << '\n';   // 000
}` },
      { title: 'Exit codes in practice', html: R`<p>Shell scripts chain commands with <code>&amp;&amp;</code>: <code>./build &amp;&amp; ./test &amp;&amp; ./deploy</code> only continues while each step returns 0. A C++ tool should therefore return <b>non-zero on failure</b>. Exit codes are 0–255 on POSIX (the value is taken modulo 256, so <code>return 256;</code> looks like success!). Convention: 1 = general error, 2 = bad usage; 128+N means "killed by signal N" (139 = segfault, 134 = abort).</p>`, code: R`
#include <cstdlib>
#include <fstream>
#include <iostream>
int main(int argc, char* argv[]) {
    if (argc < 2) { std::cerr << "usage: wc FILE\n"; return 2; }
    std::ifstream in(argv[1]);
    if (!in) { std::cerr << "cannot open " << argv[1] << '\n'; return EXIT_FAILURE; }
    long long lines = 0;
    for (std::string s; std::getline(in, s); ) ++lines;
    std::cout << lines << '\n';
    return EXIT_SUCCESS;
}` }
    ],
    deepDive: R`<h4>🟣 What really happens before main</h4>
<p>The OS loader does not call <code>main</code> directly. It jumps to an entry point (<code>_start</code> on Linux, provided by the C runtime <code>crt1.o</code>), which sets up the stack, calls <code>__libc_start_main</code>, runs <b>static initializers</b> (constructors of globals, in order within one TU but in <b>unspecified order across TUs</b> — the infamous "static initialization order fiasco"), then calls <code>main</code>. When <code>main</code> returns, <code>exit()</code> runs destructors of statics in reverse order, flushes stdio buffers and hands the status to the kernel. <code>std::quick_exit</code> and <code>std::_Exit</code> skip some of that; <code>std::abort</code> skips all of it.</p>
<h4>Initialization: the honest version</h4>
<p>C++ has many initialization forms: default, value, zero, copy, direct, list, aggregate, designated (C++20: <code>Point p{.x = 1, .y = 2};</code>). The practical rules: (1) always initialize; (2) prefer <code>{}</code> to prevent narrowing; (3) beware <code>std::vector&lt;int&gt; v{10, 2};</code> (two elements: 10 and 2) vs <code>v(10, 2)</code> (ten 2s) — braces prefer <code>initializer_list</code> constructors; (4) <code>auto x{5};</code> is <code>int</code> since C++17, but <code>auto x = {5};</code> is <code>std::initializer_list&lt;int&gt;</code>.</p>
<h4>Undefined behavior starts here</h4>
<p>Reading an uninitialized local, signed overflow, out-of-bounds indexing, and modifying a variable twice without sequencing (<code>i = i++ + 1</code> was UB before C++17) are "undefined behavior": the standard places <b>no</b> requirements on the program. Compilers exploit this to optimize, so UB bugs often appear only at <code>-O2</code>. Build debug versions with <code>-Wall -Wextra -g -fsanitize=address,undefined</code> to catch them early.</p>
<h4>Freestanding and other entry points</h4>
<p>Embedded "freestanding" programs may not have <code>main</code> at all (the entry point is implementation-defined). Windows GUI apps use <code>WinMain</code>/<code>wWinMain</code>; unit-test frameworks like GoogleTest supply their own <code>main</code>. Some platforms pass a third parameter <code>envp</code> (environment variables) — non-standard; use <code>std::getenv</code>.</p>
<h4>Evaluation order</h4>
<p>In <code>f(a(), b())</code> the order of <code>a()</code> and <code>b()</code> is <b>unspecified</b>. C++17 fixed several cases: in <code>cout &lt;&lt; a() &lt;&lt; b()</code>, <code>a()</code> now runs first; in <code>x = expr</code> the right side is evaluated first. Do not write code that depends on the rest.</p>`,
    aiEra: R`<p><b>What AI changes:</b> boilerplate like argument parsing is now generated instantly — and in production you would use a library (CLI11, cxxopts, Boost.Program_options) rather than hand-parsing <code>argv</code>. AI also explains "what does this line do" for unfamiliar syntax very well.</p>
<p><b>Use AI as a partner:</b> "List every undefined-behavior risk in this function" and "Which of these initializations narrow?" are great prompts. Ask for test command lines that break your parser (empty args, <code>"12abc"</code>, <code>"99999999999"</code>).</p>
<p><b>Where AI goes wrong:</b> generated code often uses <code>std::stoi</code> without catching exceptions, declares <code>int sum;</code> without initializing it, uses <code>atoi</code> (no error reporting), writes <code>void main</code> when converting C examples, or returns <code>0</code> on failure. It also sometimes claims <code>-7 % 2 == 1</code> (that is Python's rule).</p>
<p><b>What you must still own:</b> knowing which behaviors are undefined, what <code>main</code> returns and who reads it, and how initialization rules interact with types. Interviewers ask "what does this print?" precisely because tools cannot be consulted.</p>`,
    problems: [{
      title: 'Sum the Command-Line Arguments Safely',
      level: 'Easy', tags: ['main', 'argv', 'exit codes', 'from_chars'], companies: ['Google', 'Meta', 'Cisco'],
      statement: R`<p>Write a program <code>sumargs</code> that adds up all integer arguments: <code>./sumargs 4 -2 10</code> prints <code>12</code> and exits with status 0. If <b>any</b> argument is not a complete integer (like <code>"12abc"</code>, <code>""</code> or a number that does not fit in 64 bits), print <code>bad argument: &lt;arg&gt;</code> to <b>stderr</b> and exit with status 1. With no arguments, print 0.</p>`,
      constraints: R`Up to 1000 arguments; each must fit in <code>long long</code>; the total is guaranteed to fit in <code>long long</code>.`,
      example: R`<p><code>./sumargs 4 -2 10</code> → <span class="c-g">12</span>, exit 0.<br><code>./sumargs 4 12abc</code> → stderr <span class="c-r">bad argument: 12abc</span>, exit 1 (because <code>std::stoi</code> would silently read 12 — we must reject it).</p>`,
      brute: { why: R`<p>The naive version uses <code>atoi</code>: it returns 0 for <code>"abc"</code> (indistinguishable from a real 0), reads only the leading digits of <code>"12abc"</code>, and has undefined behavior on overflow. It also always returns 0, so scripts think it succeeded.</p>`, code: R`
#include <cstdlib>
#include <iostream>
int main(int argc, char* argv[]) {
    int total = 0;                          // int: may overflow
    for (int i = 1; i < argc; ++i)
        total += std::atoi(argv[i]);        // "12abc" -> 12, "abc" -> 0, no error reporting
    std::cout << total << '\n';
    return 0;                               // always "success"
}` },
      mcq: { q: 'Which conversion lets you detect BOTH trailing garbage and overflow without exceptions?', options: ['<code>std::atoi</code>', '<code>std::stoi</code>', '<code>std::from_chars</code>', '<code>static_cast&lt;int&gt;(argv[i])</code>'], answer: 2, explain: 'std::from_chars returns {ptr, ec}: ec == errc::result_out_of_range on overflow, ec == errc::invalid_argument if nothing parsed, and ptr tells you where parsing stopped (must equal the end of the string).' },
      hints: [
        R`<p>Hint 1: <code>argv[i]</code> is text. The question is how to convert text to a number <i>and know whether it worked</i>.</p>`,
        R`<p>Hint 2: <code>std::from_chars(first, last, value)</code> (header <code>&lt;charconv&gt;</code>) returns a struct with <code>ptr</code> and <code>ec</code>. Success = <code>ec == std::errc{}</code> <b>and</b> <code>ptr == last</code>.</p>`,
        R`<p>Hint 3: Recipe: total = 0 (long long); for i in 1..argc-1: len = strlen(argv[i]); parse; if failed → print to cerr, return 1; else total += v. Print total, return 0. Note: from_chars does not accept a leading '+'.</p>`
      ],
      solution: {
        approach: R`<p>Loop over <code>argv[1..argc-1]</code>, convert each with <code>std::from_chars</code> into a <code>long long</code>, and verify that the whole string was consumed and no overflow happened. Report errors on <code>std::cerr</code> and signal failure through the exit status.</p>`,
        code: R`
#include <charconv>
#include <cstring>
#include <iostream>
#include <system_error>

int main(int argc, char* argv[]) {
    long long total = 0;
    for (int i = 1; i < argc; ++i) {
        const char* first = argv[i];
        const char* last  = first + std::strlen(first);
        long long value = 0;
        auto [ptr, ec] = std::from_chars(first, last, value);   // no exceptions, no locale
        if (ec != std::errc{} || ptr != last || first == last) {  // overflow, garbage, or empty
            std::cerr << "bad argument: " << argv[i] << '\n';
            return 1;                                             // failure for scripts/CI
        }
        total += value;
    }
    std::cout << total << '\n';
    return 0;
}`,
        dry: { head: ['argv[i]', 'from_chars ec', 'ptr == last?', 'total'], rows: [['"4"', 'ok', 'yes', '4'], ['"-2"', 'ok', 'yes', '2'], ['"10"', 'ok', 'yes', '<span class="c-g">12 → print, exit 0</span>'], ['"12abc" (other run)', 'ok', '<span class="c-r">no (stopped at a)</span>', '<span class="c-r">exit 1</span>'], ['"99999999999999999999"', '<span class="c-r">result_out_of_range</span>', '—', '<span class="c-r">exit 1</span>']] },
        complexity: R`<p>O(total characters) time, O(1) extra memory.</p>`,
        followUps: ['Accept a leading <code>+</code> sign', 'Also detect overflow of the running total (use <code>__builtin_add_overflow</code>)', 'Read numbers from stdin when no arguments are given']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Fundamental types and their sizes
     ====================================================================== */
  var TYPE_ROWS = [
    // name, bits, signed, min, max  (for LP64 Linux/macOS 64-bit)
    ['signed char', 8, true, -128, 127],
    ['unsigned char', 8, false, 0, 255],
    ['short', 16, true, -32768, 32767],
    ['unsigned short', 16, false, 0, 65535],
    ['int', 32, true, -2147483648, 2147483647],
    ['unsigned int', 32, false, 0, 4294967295],
    ['long long', 64, true, '-9.22e18', '9.22e18'],
    ['unsigned long long', 64, false, 0, '1.84e19']
  ];
  topics.push({
    title: 'Fundamental Types & Their Sizes (int, long long, char, bool, float, double, size_t)',
    analogy: R`<p>Types are <b>containers of fixed sizes</b> in a kitchen: an egg cup, a mug, a jug, a bucket. A <code>char</code> is the egg cup (1 byte), an <code>int</code> a mug (usually 4 bytes), a <code>long long</code> a bucket (8 bytes). Pour 5 litres into a mug and it <b>overflows</b> — C++ will not hand you a bigger mug automatically like Python does. Choosing the type means choosing the container <b>before</b> you pour, based on the largest amount you might ever have. And <code>float</code>/<code>double</code> are not containers of exact amounts at all — they are more like a <b>measuring tape with marks</b>: very long, but values between the marks get rounded to the nearest mark.</p>`,
    explain: R`<h4>🟢 Built-in ("fundamental") types</h4>
${H.table(['Type', 'Typical size (64-bit Linux/macOS)', 'Range / precision', 'Use it for'], [
  ['<code>bool</code>', '1 byte', '<code>true</code> / <code>false</code>', 'flags, conditions'],
  ['<code>char</code>', '1 byte (always, by definition)', '-128..127 <b>or</b> 0..255 (platform!)', 'characters, raw bytes'],
  ['<code>short</code>', '2 bytes', '-32,768 .. 32,767', 'rarely; compact storage'],
  ['<code>int</code>', '4 bytes', '≈ ±2.1 × 10<sup>9</sup> (2<sup>31</sup>−1 = 2,147,483,647)', 'default integer'],
  ['<code>long</code>', H.c('y', '8 bytes (but 4 on Windows!)'), 'depends on platform', 'avoid in portable code'],
  ['<code>long long</code>', '8 bytes', '≈ ±9.22 × 10<sup>18</sup>', 'sums, products, timestamps'],
  ['<code>float</code>', '4 bytes', '~7 significant digits', 'graphics, ML tensors'],
  ['<code>double</code>', '8 bytes', '~15–16 significant digits', 'default for decimals'],
  ['<code>long double</code>', '16 bytes x86-64 Linux (80-bit inside); 8 on MSVC', 'platform-dependent', 'rarely'],
  ['<code>std::size_t</code>', '8 bytes', '0 .. 1.8 × 10<sup>19</sup> (unsigned)', 'sizes, indexes, <code>sizeof</code> result'],
  ['pointer <code>T*</code>', '8 bytes', 'an address', 'covered in Module 3']
])}
<p>Each type also has an <code>unsigned</code> twin (<code>unsigned int</code>, <code>unsigned long long</code>…) with the same size but no negative values — next topic.</p>
<h4>What the standard actually promises</h4>
<p>Surprise: the C++ standard does <b>not</b> say "int is 4 bytes". It only guarantees minimum widths and an ordering:</p>
<pre>1 == sizeof(char) ≤ sizeof(short) ≤ sizeof(int) ≤ sizeof(long) ≤ sizeof(long long)
char ≥ 8 bits, short ≥ 16, int ≥ 16, long ≥ 32, long long ≥ 64</pre>
<p>Real platforms follow a "data model":</p>
${H.table(['Data model', 'int', 'long', 'long long', 'pointer', 'Who'], [
  ['<b>LP64</b>', '32', H.c('b', '64'), '64', '64', 'Linux, macOS, Android, iOS (64-bit)'],
  ['<b>LLP64</b>', '32', H.c('y', '32'), '64', '64', 'Windows 64-bit (MSVC and MinGW)'],
  ['<b>ILP32</b>', '32', '32', '64', '32', '32-bit systems, many embedded chips, wasm32']
])}
<p>That is why portable code uses <b>fixed-width</b> types from <code>&lt;cstdint&gt;</code> when the exact size matters: <code>std::int8_t</code>, <code>int16_t</code>, <code>int32_t</code>, <code>int64_t</code> and the <code>uint…_t</code> versions (file formats, network protocols, hashing).</p>
<h4>sizeof — ask the compiler</h4>
<p><code>sizeof(T)</code> or <code>sizeof expr</code> gives the size in <b>bytes</b> (as a <code>size_t</code>), computed at compile time. <code>std::numeric_limits&lt;T&gt;::max()</code> / <code>min()</code> / <code>lowest()</code> / <code>digits10</code> give ranges. Constants like <code>INT_MAX</code> and <code>LLONG_MAX</code> live in <code>&lt;climits&gt;</code>.</p>
<h4>Literals and their types</h4>
${H.table(['Literal', 'Type', 'Note'], [
  ['<code>42</code>', 'int', 'smallest of int/long/long long that fits'],
  ['<code>42u</code>, <code>42L</code>, <code>42LL</code>, <code>42ULL</code>', 'unsigned, long, long long, unsigned long long', 'suffixes'],
  ['<code>0x2A</code>, <code>0b101010</code>, <code>052</code>', 'int', 'hex, binary (C++14), ' + H.c('r', 'octal! a leading 0 means base 8')],
  ['<code>1\'000\'000</code>', 'int', 'digit separators (C++14)'],
  ['<code>3.14</code>, <code>3.14f</code>, <code>1e9</code>', 'double, float, ' + H.c('y', 'double (not int!)'), '<code>1e9</code> is a double'],
  ["<code>'A'</code>", 'char (value 65)', 'single quotes = one character'],
  ['<code>"A"</code>', 'const char[2]', 'double quotes = string: <code>A</code> plus <code>\\0</code>']
])}
<h4>The competitive-programming rule of thumb</h4>
<p><code>int</code> holds about <b>2 × 10<sup>9</sup></b>. If a value can be a <b>sum</b> of many numbers, a <b>product</b> of two numbers above ~46,341, or anything near 10<sup>10</sup> and beyond, use <code>long long</code> (≈ 9.2 × 10<sup>18</sup>). Beyond that: <code>__int128</code> (GCC/Clang extension) or a big-integer library.</p>`,
    clues: [
      '"N ≤ 2·10<sup>5</sup>, A[i] ≤ 10<sup>9</sup>, print the sum" → the sum reaches 2·10<sup>14</sup>: needs <code>long long</code>',
      '"answer modulo 10<sup>9</sup>+7" → products of two residues reach 10<sup>18</sup>: multiply in <code>long long</code>',
      '"What is sizeof(int)? sizeof(long)?" → 4 and 8 on Linux/macOS (LP64), 4 and 4 on Windows (LLP64); the standard only gives minimums',
      '"Is char signed?" → implementation-defined: signed on x86, unsigned on ARM Linux; use signed char / unsigned char when it matters',
      '"Why is 0.1 + 0.2 != 0.3?" → binary floating point cannot represent 0.1 exactly',
      '"Store money" → never float/double for currency; use integer cents (int64_t) or a decimal library',
      'Binary file/network format → fixed-width <code>std::uint32_t</code>, <code>std::int64_t</code>, plus an explicit byte order'
    ],
    code: [R`
#include <climits>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <limits>

int main() {
    std::cout << "bool        " << sizeof(bool)        << '\n'
              << "char        " << sizeof(char)        << '\n'   // always 1
              << "short       " << sizeof(short)       << '\n'
              << "int         " << sizeof(int)         << '\n'
              << "long        " << sizeof(long)        << '\n'   // 8 on Linux, 4 on Windows
              << "long long   " << sizeof(long long)   << '\n'
              << "float       " << sizeof(float)       << '\n'
              << "double      " << sizeof(double)      << '\n'
              << "long double " << sizeof(long double) << '\n'
              << "size_t      " << sizeof(std::size_t) << '\n'
              << "void*       " << sizeof(void*)       << '\n';

    std::cout << "int range:       " << INT_MIN << " .. " << INT_MAX << '\n';
    std::cout << "long long max:   " << std::numeric_limits<long long>::max() << '\n';
    std::cout << "unsigned max:    " << std::numeric_limits<unsigned>::max() << '\n';
    std::cout << "double digits:   " << std::numeric_limits<double>::digits10 << '\n';   // 15
    std::cout << "char is signed?  " << std::numeric_limits<char>::is_signed << '\n';

    std::int32_t exact32 = 123;        // exactly 32 bits on every platform that has it
    std::uint64_t hash = 14695981039346656037ULL;   // FNV-1a offset basis needs 64 bits
    static_assert(sizeof(std::int64_t) == 8);
    std::cout << exact32 << ' ' << hash << '\n';

    std::cout << std::setprecision(17) << 0.1 + 0.2 << '\n';   // 0.30000000000000004
    std::cout << (0.1 + 0.2 == 0.3) << '\n';                   // 0  (false!)
}`, R`
#include <iostream>
int main() {
    // The classic competitive-programming overflow
    int n = 200000, value = 1000000000;
    long long good = 0;
    int bad = 0;
    for (int i = 0; i < n; ++i) {
        good += value;                 // 64-bit accumulator: exact
        // bad += value;               // would overflow int after 3 additions -> UB
    }
    std::cout << good << '\n';         // 200000000000000

    int a = 100000, b = 100000;
    long long wrong = a * b;           // int * int overflows BEFORE the conversion to long long
    long long right = 1LL * a * b;     // promote first: 10000000000
    std::cout << right << '\n';
    (void)wrong; (void)bad;

    char c = 'A';
    std::cout << c << ' ' << int(c) << ' ' << char(c + 2) << '\n';   // A 65 C
    std::cout << sizeof('A') << ' ' << sizeof("A") << '\n';          // 1 2
    std::cout << 052 << ' ' << 0x2A << ' ' << 0b101010 << '\n';      // 42 42 42 (052 is octal!)
}`],
    codeTitle: ['Ask the compiler: sizes and limits', 'Pick types that do not overflow'],
    viz: [{
      title: 'Which container fits this number?',
      input: '300',
      inputLabel: 'An integer (|n| < 9·10^15)',
      gen: function (input) {
        var t = String(input || '').trim();
        if (!/^-?\d{1,16}$/.test(t)) throw new Error('Type a whole number like 300, -40000 or 5000000000 (at most 16 digits)');
        var v = Number(t);
        if (Math.abs(v) >= 9e15) throw new Error('Keep |n| below 9·10^15 so the browser can count exactly');
        var rows = TYPE_ROWS.map(function (r) { return [r[0], r[1] + ' bits', r[3] + ' .. ' + r[4], '?']; });
        var frames = [];
        frames.push(fr('We want to store <b>' + v + '</b>. Let us try each integer type from the smallest container up and see which ones can hold it. (Sizes shown are the common 64-bit Linux/macOS ones.)', [{ type: 'table', label: 'Integer types (LP64)', columns: ['type', 'size', 'range', 'fits ' + v + '?'], rows: rows.map(function (r) { return r.slice(); }), hl: {} }]));
        var firstFit = -1;
        for (var k = 0; k < TYPE_ROWS.length; k++) {
          var r = TYPE_ROWS[k], bits = r[1], fits;
          if (bits === 64) fits = r[2] ? true : v >= 0;
          else fits = v >= r[3] && v <= r[4];
          rows[k][3] = fits ? 'yes' : 'NO';
          if (fits && firstFit < 0) firstFit = k;
          var hl = {}; hl[k] = fits ? 'ok' : 'bad';
          var parts = [{ type: 'table', label: 'Integer types (LP64)', columns: ['type', 'size', 'range', 'fits ' + v + '?'], rows: rows.map(function (x) { return x.slice(); }), hl: hl }];
          var w = Math.min(bits, 32);
          if (bits <= 32) {
            var stored = r[2] ? asSigned(v, bits) : asUnsigned(v, bits);
            parts.push({ type: 'bits', label: r[0] + ' bit pattern', value: asUnsigned(v, bits), width: w, dec: fits ? String(v) : stored + '  (wrapped!)', hl: {} });
            if (!fits) parts.push(tx('Forcing ' + v + ' into a <code>' + r[0] + '</code> keeps only the low ' + bits + ' bits → it reads back as <b class="c-r">' + stored + '</b>. ' + (r[2] ? '(Converting an out-of-range value to a signed type wraps modulo 2<sup>' + bits + '</sup> since C++20; arithmetic <i>overflow</i> on signed types is still undefined behavior.)' : '(Unsigned types always wrap modulo 2<sup>' + bits + '</sup>.)'), 'What would happen'));
          } else {
            parts.push(tx(fits ? '64 bits is plenty: up to ≈ 9.22·10<sup>18</sup> signed or 1.84·10<sup>19</sup> unsigned.' : 'Unsigned types cannot hold negatives: −1 would become 18,446,744,073,709,551,615.', r[0]));
          }
          frames.push(fr('<code>' + r[0] + '</code> (' + bits + ' bits) holds ' + r[3] + ' .. ' + r[4] + '. ' + (fits ? '<span class="c-g">' + v + ' fits.</span>' : '<span class="c-r">' + v + ' does not fit.</span>'), parts));
        }
        var best = firstFit >= 0 ? TYPE_ROWS[firstFit][0] : 'none';
        var hlF = {}; if (firstFit >= 0) hlF[firstFit] = 'sel';
        frames.push(fr('Smallest type that fits: <b>' + best + '</b>. In practice: use <code>int</code> by default, <code>long long</code> when values can exceed ~2·10<sup>9</sup>, and fixed-width <code>std::int32_t</code>/<code>std::int64_t</code> when the exact size is part of a file or network format.', [{ type: 'table', label: 'Result', columns: ['type', 'size', 'range', 'fits ' + v + '?'], rows: rows, hl: hlF }]));
        return frames;
      }
    }, {
      title: 'Inside memory: the bytes of an int (little-endian)',
      input: '305419896',
      inputLabel: 'A 32-bit int value (e.g. 305419896 = 0x12345678, or -1)',
      gen: function (input) {
        var t = String(input || '').trim();
        if (!/^-?\d{1,10}$/.test(t)) throw new Error('Type a 32-bit integer like 305419896 or -1');
        var v = Number(t);
        if (v < -2147483648 || v > 4294967295) throw new Error('Value must fit in 32 bits (-2147483648 .. 4294967295)');
        var u = asUnsigned(v, 32);
        var hexs = u.toString(16).toUpperCase(); while (hexs.length < 8) hexs = '0' + hexs;
        var bytes = [hexs.slice(0, 2), hexs.slice(2, 4), hexs.slice(4, 6), hexs.slice(6, 8)];
        var frames = [];
        frames.push(fr('An <code>int</code> is 4 bytes = 32 bits. Your value <b>' + v + '</b> in binary (two\'s complement) looks like this:', [{ type: 'bits', label: 'int x = ' + v, value: u, width: 32, dec: String(asSigned(v, 32)) }]));
        frames.push(fr('Group the 32 bits into 4 bytes (8 bits each) and write each byte in <b>hex</b> (two hex digits per byte): <code>0x' + hexs + '</code>. The leftmost byte <code>0x' + bytes[0] + '</code> is the <b>most significant</b>.', [{ type: 'array', label: 'bytes, most significant first', values: bytes.map(function (b) { return '0x' + b; }), hl: { 0: 'cur' }, idxLabels: ['MSB', '', '', 'LSB'] }]));
        frames.push(fr('x86-64 and (practically all) ARM CPUs are <b>little-endian</b>: the <b>least</b> significant byte is stored at the <b>lowest</b> address. So in RAM the bytes appear "backwards".', [{ type: 'array', label: 'memory at &x (little-endian)', values: bytes.slice().reverse().map(function (b) { return '0x' + b; }), hl: { 0: 'ok' }, idxLabels: ['&x+0', '&x+1', '&x+2', '&x+3'] }]));
        frames.push(fr('Network protocols use <b>big-endian</b> ("network byte order"), where memory order equals reading order. That is why socket code calls <code>htonl()</code>, and C++23 adds <code>std::byteswap</code>; C++20 gives <code>std::endian::native</code> to ask which one you are on.', [{ type: 'array', label: 'big-endian (network order)', values: bytes.map(function (b) { return '0x' + b; }), idxLabels: ['+0', '+1', '+2', '+3'] }, { type: 'array', label: 'little-endian (x86, ARM)', values: bytes.slice().reverse().map(function (b) { return '0x' + b; }), idxLabels: ['+0', '+1', '+2', '+3'] }]));
        frames.push(fr('Same bits, different <b>meaning</b>: the type decides how the bits are read. As <code>int</code> this pattern is <b>' + asSigned(v, 32) + '</b>; as <code>unsigned int</code> it is <b>' + u + '</b>. Bits have no type — your declaration gives them one.', [vp({ 'as int': asSigned(v, 32), 'as unsigned': u, 'hex': '0x' + hexs, 'sizeof(int)': 4 }, { 'as int': 'cur', 'as unsigned': 'sel' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: int * int stored in long long', html: R`<p><code>int a = 100000, b = 100000; long long p = a * b;</code> — what is <code>p</code>? Not 10<sup>10</sup>! The multiplication happens in <code>int</code> (both operands are int), overflows (undefined behavior; in practice you usually see 1410065408), and <i>then</i> the broken value is converted. Fix: <code>1LL * a * b</code> or <code>static_cast&lt;long long&gt;(a) * b</code>. The type of an expression depends on its <b>operands</b>, never on where you store the result.</p>`, code: R`
#include <iostream>
int main() {
    int a = 100000, b = 100000;
    long long right = static_cast<long long>(a) * b;   // 10000000000
    std::cout << right << '\n';
}` },
      { title: 'Floating point surprises', html: R`<p><code>float f = 16777217;</code> prints <b>16777216</b> — a float has only 24 bits of mantissa, so integers above 2<sup>24</sup> are rounded. <code>double</code> is exact for integers up to 2<sup>53</sup> ≈ 9·10<sup>15</sup>. Never compare floats with <code>==</code> after arithmetic; use a tolerance: <code>std::abs(a - b) &lt; 1e-9</code>. And <code>1e9</code> is a <b>double</b> literal — <code>int x = 1e9;</code> works, but <code>long long y = 1e18 + 1;</code> loses the +1.</p>`, code: R`
#include <cmath>
#include <iostream>
int main() {
    float f = 16777217.0f;
    std::cout << static_cast<long long>(f) << '\n';        // 16777216
    double a = 0.1 + 0.2, b = 0.3;
    std::cout << (a == b) << ' ' << (std::abs(a - b) < 1e-9) << '\n';   // 0 1
    long long y = 1e18 + 1;                                 // double arithmetic: +1 is lost
    std::cout << y << '\n';                                 // 1000000000000000000
}` },
      { title: 'What does the compiler do? char arithmetic and promotion', html: R`<p><code>char c = 'a'; cout &lt;&lt; c + 1;</code> prints <b>98</b>, not <code>b</code>. Any arithmetic on <code>char</code>/<code>short</code>/<code>bool</code> first <b>promotes</b> them to <code>int</code>, so the result is an <code>int</code> and <code>cout</code> prints a number. Write <code>char(c + 1)</code> to get a character back. Similarly <code>true + true == 2</code>.</p>`, code: R`
#include <iostream>
int main() {
    char c = 'a';
    std::cout << c + 1 << ' ' << char(c + 1) << ' ' << (true + true) << '\n';   // 98 b 2
    std::cout << sizeof(c) << ' ' << sizeof(c + 1) << '\n';                     // 1 4
}` },
      { title: 'Money: integers, not doubles', html: R`<p>Storing ₹0.10 as a double and adding it 10 times gives 0.9999999999999999, not 1. Banks and payment systems store <b>integer minor units</b> (paise, cents) in a 64-bit integer: ₹12.34 → <code>1234</code>. Format only when printing.</p>`, code: R`
#include <cstdint>
#include <iomanip>
#include <iostream>
int main() {
    double d = 0; for (int i = 0; i < 10; ++i) d += 0.10;
    std::cout << std::setprecision(17) << d << '\n';             // 0.99999999999999989
    std::int64_t paise = 0; for (int i = 0; i < 10; ++i) paise += 10;
    std::cout << paise / 100 << '.' << std::setw(2) << std::setfill('0') << paise % 100 << '\n';   // 1.00
}` }
    ],
    deepDive: R`<h4>🟣 Object representation</h4>
<p>Every object occupies <code>sizeof(T)</code> contiguous bytes; a byte has <code>CHAR_BIT</code> bits (8 on every mainstream platform; some DSPs use 16 or 32). Integer types may contain <b>padding bits</b> in theory; in practice none of the mainstream ones do. Since C++20, signed integers are required to use <b>two's complement</b> representation (ones' complement and sign-magnitude were removed).</p>
<h4>Floating point is IEEE 754 (in practice)</h4>
<p><code>float</code> = 1 sign bit + 8 exponent bits + 23 fraction bits; <code>double</code> = 1 + 11 + 52. Special values: <code>+0.0</code> and <code>-0.0</code> (compare equal!), <code>inf</code>, and <code>NaN</code> (not equal even to itself — <code>x != x</code> is the classic NaN test; prefer <code>std::isnan</code>). <code>-ffast-math</code> lets the compiler assume no NaN/inf and reorder math — faster, but it can break NaN checks and change results. C++23 adds <code>std::float16_t</code>, <code>std::bfloat16_t</code> etc. in <code>&lt;stdfloat&gt;</code> (optional, compiler-dependent) — important for ML workloads.</p>
<h4>char is three types</h4>
<p><code>char</code>, <code>signed char</code> and <code>unsigned char</code> are <b>three distinct types</b>; whether plain <code>char</code> is signed is implementation-defined (signed on x86 Linux/Windows, unsigned on ARM Linux and PowerPC). This bites when you pass a <code>char</code> with value ≥ 128 to <code>std::isalpha</code> (UB for negative values) — cast to <code>unsigned char</code> first. For raw memory, C++17 offers <code>std::byte</code>; for UTF-8 text, C++20 adds <code>char8_t</code> (<code>u8"..."</code> literals), plus <code>char16_t</code>/<code>char32_t</code>. <code>wchar_t</code> is 4 bytes on Linux but 2 on Windows.</p>
<h4>size_t, ptrdiff_t and friends</h4>
<p><code>std::size_t</code> is the unsigned type of <code>sizeof</code> and container sizes; it is wide enough for the largest object. <code>std::ptrdiff_t</code> is the signed result of subtracting pointers. <code>std::intptr_t</code>/<code>uintptr_t</code> can hold a pointer value. <code>int_fast32_t</code> ("fastest type with at least 32 bits") and <code>int_least32_t</code> exist for portability; <code>intmax_t</code> is the widest standard integer. GCC/Clang offer <code>__int128</code> (handy for 64×64-bit products) but it is not standard and <code>cout</code> cannot print it directly.</p>
<h4>Performance note</h4>
<p>Smaller types are not automatically faster: arithmetic is done in at least <code>int</code> width anyway. What smaller types buy you is <b>memory and cache</b>: an array of 10<sup>8</sup> <code>int8_t</code> is 100 MB, as <code>int64_t</code> it is 800 MB. Choose by range first, then by memory footprint for large arrays.</p>`,
    aiEra: R`<p><b>What AI changes:</b> tools can instantly print a size/range table for any platform, and static analyzers (clang-tidy, CodeQL, AI reviewers) flag <code>int</code> sums that might overflow or <code>long</code> used in portable formats.</p>
<p><b>Use AI as a partner:</b> give it the constraints of a problem and ask "what is the largest intermediate value in this algorithm and which type holds it?" — then check the arithmetic yourself. Ask it to write a <code>static_assert</code> that documents your size assumptions.</p>
<p><b>Where AI goes wrong:</b> it often states "<code>long</code> is 64 bits" as universal (false on Windows), uses <code>int</code> for sums of 10<sup>5</sup> values up to 10<sup>9</sup>, writes <code>long long x = a * b</code> with int operands, compares doubles with <code>==</code>, uses <code>double</code> for money, or assumes <code>char</code> is signed. It also tends to say "int is 4 bytes by the standard" — it is only a convention.</p>
<p><b>What you must still own:</b> reading constraints and computing the worst-case magnitude of every intermediate value. That 10-second estimate ("2·10<sup>5</sup> × 10<sup>9</sup> = 2·10<sup>14</sup> → long long") prevents the single most common wrong answer in coding interviews.</p>`,
    problems: [{
      title: 'Will It Fit? Smallest Integer Type for a Huge Number',
      level: 'Medium', tags: ['types', 'ranges', 'strings', 'numeric_limits'], companies: ['Amazon', 'Goldman Sachs', 'Intel'],
      statement: R`<p>You are given an integer <b>as a string</b> (it may have up to 100 digits and a leading <code>-</code>). Print the <b>smallest</b> type that can store it, checking in this order: <code>signed char</code>, <code>short</code>, <code>int</code>, <code>long long</code>, <code>unsigned long long</code>. If none can, print <code>BigInteger</code>. Assume 8/16/32/64-bit two's complement types.</p>`,
      constraints: R`1 ≤ length ≤ 100; no leading <code>+</code>; may have leading zeros (e.g. <code>-007</code>).`,
      example: R`<p><code>127</code> → <span class="c-g">signed char</span> (max is 127). <code>128</code> → <span class="c-g">short</span>. <code>-2147483648</code> → <span class="c-g">int</span> (the minimum int is −2<sup>31</sup>, one more than the max in magnitude). <code>18446744073709551615</code> → <span class="c-g">unsigned long long</span>. <code>-9223372036854775809</code> → <span class="c-r">BigInteger</span>.</p>`,
      brute: { why: R`<p>Reading the value with <code>cin &gt;&gt; long long</code> fails for anything beyond 64 bits (the stream sets failbit and stores the max), so you cannot even <i>see</i> the number. Using <code>std::stoll</code>/<code>stoull</code> with try/catch works for most inputs but treats <code>-5</code> as valid for <code>stoull</code> (it wraps!) and leans on exceptions for control flow.</p>`, code: R`
#include <iostream>
#include <string>
int main() {
    std::string s; std::cin >> s;
    long long v;
    try { v = std::stoll(s); }
    catch (...) {                                   // out of range for long long
        try { std::stoull(s); std::cout << "unsigned long long\n"; }   // BUG: "-1" never gets here, but
        catch (...) { std::cout << "BigInteger\n"; }                   // stoull("-5") silently wraps
        return 0;
    }
    if (v >= -128 && v <= 127) std::cout << "signed char\n";
    else if (v >= -32768 && v <= 32767) std::cout << "short\n";
    else if (v >= -2147483648LL && v <= 2147483647LL) std::cout << "int\n";
    else std::cout << "long long\n";
}` },
      mcq: { q: 'Why can −128 fit in a <code>signed char</code> but +128 cannot?', options: ['Because of padding bits', 'Two\'s complement has one more negative value than positive: range is −2<sup>n−1</sup> .. 2<sup>n−1</sup>−1', 'Because char is unsigned', 'It cannot: both fail'], answer: 1, explain: '8 bits give 256 patterns. Zero takes one of the non-negative patterns, so there are 128 negatives (−128..−1) and 128 non-negatives (0..127).' },
      hints: [
        R`<p>Hint 1: never convert the whole string to a number — compare it <b>as text</b> against the limits written as text.</p>`,
        R`<p>Hint 2: strip the sign and leading zeros to get the magnitude. Two magnitudes (without leading zeros) compare by <b>length first</b>, then lexicographically. The negative limit of each signed type is one larger than the positive limit: 128, 32768, 2147483648, 9223372036854775808.</p>`,
        R`<p>Hint 3: Recipe: neg = s[0]=='-'; mag = strip zeros (empty → "0", and "-0" is just 0, not negative). For each signed type: limit = neg ? minMag : maxMag; if mag ≤ limit → print. Then if !neg and mag ≤ 18446744073709551615 → unsigned long long. Else BigInteger.</p>`
      ],
      solution: {
        approach: R`<p>Work entirely with strings. Normalize to (sign, magnitude), then compare the magnitude with each type's limit using "shorter is smaller, same length → compare characters". This handles 100-digit inputs, leading zeros and "−0" with no overflow risk at all.</p>`,
        code: R`
#include <iostream>
#include <string>
#include <vector>

// a <= b for non-negative decimal strings without leading zeros
bool magLessEq(const std::string& a, const std::string& b) {
    if (a.size() != b.size()) return a.size() < b.size();
    return a <= b;                       // same length: lexicographic == numeric
}

int main() {
    std::string s;
    std::cin >> s;
    bool neg = !s.empty() && s[0] == '-';
    std::string mag = neg ? s.substr(1) : s;
    std::size_t nz = mag.find_first_not_of('0');
    mag = (nz == std::string::npos) ? "0" : mag.substr(nz);
    if (mag == "0") neg = false;         // "-0" is just zero

    struct Limit { const char* name; const char* maxMag; const char* minMag; };
    const std::vector<Limit> signedTypes = {
        {"signed char", "127", "128"},
        {"short", "32767", "32768"},
        {"int", "2147483647", "2147483648"},
        {"long long", "9223372036854775807", "9223372036854775808"},
    };
    for (const auto& t : signedTypes) {
        if (magLessEq(mag, neg ? t.minMag : t.maxMag)) { std::cout << t.name << '\n'; return 0; }
    }
    if (!neg && magLessEq(mag, "18446744073709551615")) { std::cout << "unsigned long long\n"; return 0; }
    std::cout << "BigInteger\n";
}`,
        dry: { head: ['input', 'neg', 'mag', 'first limit ≥ mag', 'output'], rows: [['127', 'no', '127', '127 (signed char max)', 'signed char'], ['128', 'no', '128', '32767', 'short'], ['-2147483648', 'yes', '2147483648', '2147483648 (int min mag)', 'int'], ['-007', 'yes', '7', '128', 'signed char'], ['18446744073709551615', 'no', '1844…615', 'ULL max', 'unsigned long long'], ['-9223372036854775809', 'yes', '…809', 'none (> …808)', '<span class="c-r">BigInteger</span>']] },
        complexity: R`<p>O(L) time for a string of length L (constant number of comparisons, each O(L)), O(L) memory for the copy.</p>`,
        followUps: ['Also report the smallest <b>unsigned</b> type when the number is non-negative', 'Generate the limit strings with <code>std::to_string(std::numeric_limits&lt;T&gt;::max())</code> instead of hard-coding them']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Signed vs unsigned, two's complement, overflow, conversions
     ====================================================================== */
  topics.push({
    title: 'Signed vs Unsigned: Two\'s Complement, Overflow & Sneaky Conversions',
    analogy: R`<p>An <b>unsigned</b> integer is a car's <b>odometer</b>: it only counts up from 0, and after 999,999 it rolls over to 000,000 — predictable, by design. A <b>signed</b> integer is a <b>thermometer</b> with both negative and positive marks. If the mercury goes past the top of a thermometer, it does not neatly roll over — the glass <b>breaks</b>, and what happens next is anyone's guess. That is C++: unsigned overflow <b>wraps</b> (defined), signed overflow is <b>undefined behavior</b>. And whenever you compare a thermometer reading with an odometer reading, C++ quietly converts the thermometer into an odometer — so −1 °C becomes "4,294,967,295 km".</p>`,
    explain: R`<h4>🟢 Two flavours of every integer</h4>
${H.table(['8-bit type', 'Bit pattern 0000 0000', '0111 1111', '1000 0000', '1111 1111'], [
  ['<code>unsigned char</code> (0..255)', '0', '127', '128', '255'],
  ['<code>signed char</code> (−128..127)', '0', '127', H.c('r', '−128'), H.c('r', '−1')]
])}
<p>Same bits, different meaning. In <b>two's complement</b> (mandatory since C++20) the top bit has a <b>negative</b> weight: for 8 bits it is worth −128 instead of +128. So <code>1111 1111</code> = −128 + 127 = <b>−1</b>.</p>
<h4>Negating a number in two's complement</h4>
<p>To get −x: <b>flip all bits, then add 1</b>. Example with 8 bits: 5 = <code>0000 0101</code> → flip → <code>1111 1010</code> → +1 → <code>1111 1011</code> = −5. Check: −128 + 64 + 32 + 16 + 8 + 2 + 1 = −5 ✅. The beauty: the CPU uses the <b>same adder circuit</b> for signed and unsigned addition.</p>
${H.bits(5, 8, { label: '5' })}
${H.bits(250, 8, { label: 'flipped (~5)', dec: false })}
${H.bits(251, 8, { label: '−5 (= flipped + 1)', hl: { 7: 'r' }, dec: false })}
<h4>Overflow: the critical difference</h4>
${H.table(['', 'unsigned', 'signed'], [
  ['Range for N bits', '0 .. 2<sup>N</sup> − 1', '−2<sup>N−1</sup> .. 2<sup>N−1</sup> − 1'],
  ['Going past the max', H.c('g', 'wraps to 0 — well defined (arithmetic modulo 2<sup>N</sup>)'), H.c('r', 'undefined behavior')],
  ['<code>UINT_MAX + 1u</code> / <code>INT_MAX + 1</code>', '<code>0</code>', 'anything: wrong value, an "impossible" branch taken, a crash'],
  ['<code>0u - 1u</code> / <code>INT_MIN - 1</code>', '<code>4294967295</code>', 'undefined behavior'],
  ['Typical use', 'bit masks, hashes, sizes, modular math', 'everyday counts and arithmetic']
])}
<h4>Conversions that happen behind your back</h4>
<p>When a binary operator gets an <code>int</code> and an <code>unsigned int</code>, the <b>usual arithmetic conversions</b> turn the <code>int</code> into <code>unsigned</code>. Converting a negative value to unsigned adds 2<sup>N</sup>. So:</p>
<pre>-1 &lt; 1u          // false!  -1 becomes 4294967295u
std::vector&lt;int&gt; v;     // empty
v.size() - 1      // 18446744073709551615, not -1  (size() is unsigned size_t)</pre>
${H.table(['Operands', 'Converted to', 'Why'], [
  ['<code>char</code>, <code>short</code>, <code>bool</code> (any arithmetic)', '<code>int</code>', 'integral promotion'],
  ['<code>int</code> op <code>unsigned</code>', '<code>unsigned</code>', 'same rank → unsigned wins'],
  ['<code>int</code> op <code>long long</code>', '<code>long long</code>', 'higher rank wins'],
  ['<code>unsigned</code> op <code>long long</code>', '<code>long long</code>', 'long long can represent every unsigned value'],
  ['<code>long long</code> op <code>size_t</code> (64-bit)', '<code>unsigned long long</code>', 'same width → unsigned wins'],
  ['any integer op <code>double</code>', '<code>double</code>', 'floating point wins']
])}
<h4>How to stay safe</h4>
<ul><li>Compile with <code>-Wall -Wextra</code> (includes <code>-Wsign-compare</code>) and fix every warning.</li>
<li>Prefer <b>signed</b> integers for quantities you subtract or compare; use <code>std::ssize(v)</code> (C++20) to get a signed size.</li>
<li>Use C++20 <code>std::cmp_less(a, b)</code>, <code>std::cmp_equal</code>… (in <code>&lt;utility&gt;</code>) to compare mixed signedness correctly.</li>
<li>Check for overflow <b>before</b> it happens: <code>if (a &gt; INT_MAX - b)</code>, or use <code>__builtin_add_overflow(a, b, &amp;res)</code> (GCC/Clang).</li>
<li>Test with <code>-fsanitize=undefined</code>: it reports signed overflow at run time.</li></ul>`,
    clues: [
      '"Reverse an integer; return 0 if it overflows 32-bit" → check <code>ans &gt; INT_MAX / 10</code> before multiplying',
      '"for (size_t i = v.size() - 1; i &gt;= 0; --i)" → infinite loop / crash: unsigned is always ≥ 0, and size()−1 wraps when empty',
      '"Why is −1 &lt; 1u false?" → usual arithmetic conversions turn −1 into UINT_MAX',
      '"Is unsigned overflow UB?" → no, it wraps modulo 2<sup>N</sup>; signed overflow is UB',
      '"mid = (lo + hi) / 2 overflows" → use <code>lo + (hi - lo) / 2</code> or <code>std::midpoint</code>',
      '"abs(INT_MIN)" / "INT_MIN / -1" → undefined: the result does not fit',
      '"Hash function", "bit manipulation", "mod 2<sup>64</sup>" → unsigned is the right tool'
    ],
    code: [R`
#include <climits>
#include <cstdint>
#include <iostream>
#include <utility>     // std::cmp_less (C++20)
#include <vector>

int main() {
    unsigned int u = UINT_MAX;
    std::cout << u + 1u << '\n';                  // 0         (defined wrap-around)
    std::cout << 0u - 1u << '\n';                 // 4294967295

    std::cout << (-1 < 1u) << '\n';               // 0  !! -1 converted to 4294967295
    std::cout << std::cmp_less(-1, 1u) << '\n';   // 1  correct mathematical comparison

    std::vector<int> v;                           // empty
    std::cout << v.size() - 1 << '\n';            // 18446744073709551615
    for (std::ptrdiff_t i = std::ssize(v) - 1; i >= 0; --i)   // signed index: safe reverse loop
        std::cout << v[i] << ' ';

    // Conversions between signed and unsigned of the same width keep the BITS:
    int neg = -5;
    unsigned int asU = static_cast<unsigned int>(neg);        // 4294967291  (2^32 - 5)
    int back = static_cast<int>(asU);                         // -5 (well-defined since C++20)
    std::cout << asU << ' ' << back << '\n';

    // Detect overflow BEFORE it happens
    int a = INT_MAX - 3, b = 10, sum;
    if (__builtin_add_overflow(a, b, &sum))       // GCC/Clang builtin: returns true on overflow
        std::cout << "overflow detected\n";
    if (b > 0 && a > INT_MAX - b)                 // portable pre-check, no UB
        std::cout << "would overflow\n";

    std::uint8_t level = 250;
    level += 10;                                  // promoted to int, then converted back: 260 mod 256
    std::cout << int(level) << '\n';              // 4
}`, R`
#include <climits>
#include <iostream>
// Why signed overflow being UB matters: the optimizer TRUSTS it never happens.
bool alwaysBigger(int x) {
    return x + 1 > x;      // GCC/Clang at -O2 compile this to "return true;"
}                          // even for x == INT_MAX, where the "real" math would wrap
int main() {
    std::cout << alwaysBigger(INT_MAX) << '\n';   // often prints 1 with -O2, 0 with -O0 (UB!)
    // Build with -fsanitize=undefined to get: "signed integer overflow: 2147483647 + 1
    // cannot be represented in type 'int'"
}`],
    codeTitle: ['Wrap-around, conversions and safe checks', 'UB in action: the optimizer assumes no signed overflow'],
    viz: [{
      title: 'Binary addition: when do signed and unsigned overflow?',
      input: '100 50 8',
      inputLabel: 'a b width (width = 4, 8 or 16; a, b may be negative)',
      gen: function (input) {
        var tk = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (tk.length < 2 || tk.length > 3 || tk.some(function (x) { return !/^-?\d+$/.test(x); })) throw new Error('Type two integers and an optional width, e.g. 100 50 8');
        var w = tk.length === 3 ? Number(tk[2]) : 8;
        if ([4, 8, 16].indexOf(w) < 0) throw new Error('Width must be 4, 8 or 16');
        var a = Number(tk[0]), b = Number(tk[1]);
        var lo = -Math.pow(2, w - 1), hi = Math.pow(2, w) - 1;
        if (a < lo || a > hi || b < lo || b > hi) throw new Error('With width ' + w + ', each value must be in ' + lo + ' .. ' + hi);
        var ua = asUnsigned(a, w), ub = asUnsigned(b, w);
        var A = toBin(ua, w), B = toBin(ub, w);
        var frames = [];
        frames.push(fr('Add <b>' + a + '</b> and <b>' + b + '</b> in a ' + w + '-bit register. The CPU does <b>not</b> know whether you meant signed or unsigned — it just adds bits. Interpretation comes later.', [
          { type: 'bits', label: 'a', value: ua, width: w, dec: 'unsigned ' + ua + ' / signed ' + asSigned(ua, w) },
          { type: 'bits', label: 'b', value: ub, width: w, dec: 'unsigned ' + ub + ' / signed ' + asSigned(ub, w) }
        ]));
        var carry = 0, res = 0, carryIn7 = 0;
        for (var i = 0; i < w; i++) {
          var bitA = Number(A[w - 1 - i]), bitB = Number(B[w - 1 - i]);
          var s = bitA + bitB + carry;
          var bit = s % 2;
          if (i === w - 1) carryIn7 = carry;
          var cin = carry;
          carry = s >= 2 ? 1 : 0;
          res += bit * Math.pow(2, i);
          var hlA = {}, hlB = {}, hlR = {}; hlA[i] = 'cur'; hlB[i] = 'cur'; hlR[i] = 'ok';
          if (w <= 8 || i % 2 === 1 || i === w - 1) {
            frames.push(fr('Column ' + i + ': ' + bitA + ' + ' + bitB + ' + carry-in ' + cin + ' = ' + s + ' → write <b>' + bit + '</b>, carry <b>' + carry + '</b> to the next column.' + (i === w - 1 ? ' This is the <b>top (sign) bit</b>.' : ''), [
              { type: 'bits', label: 'a', value: ua, width: w, hl: hlA, showDec: false },
              { type: 'bits', label: 'b', value: ub, width: w, hl: hlB, showDec: false },
              { type: 'bits', label: 'result so far', value: res, width: w, hl: hlR, showDec: false },
              vp({ 'carry out': carry }, { 'carry out': carry ? 'cur' : '' })
            ]));
          }
        }
        var uSum = ua + ub, sSum = asSigned(ua, w) + asSigned(ub, w);
        var uOver = carry === 1, sOver = carryIn7 !== carry;
        frames.push(fr('Done. The register holds <code>' + toBin(res, w) + '</code>. Final carry out of the top bit = <b>' + carry + '</b>.', [{ type: 'bits', label: 'result register', value: res, width: w, dec: 'unsigned ' + res + ' / signed ' + asSigned(res, w), hl: {} }]));
        frames.push(fr('<b>Unsigned view:</b> ' + ua + ' + ' + ub + ' = ' + uSum + '. ' + (uOver ? '<span class="c-y">Too big for ' + w + ' bits (max ' + (Math.pow(2, w) - 1) + '), so it wraps: ' + uSum + ' − ' + Math.pow(2, w) + ' = <b>' + res + '</b>. In C++ this is <b>well-defined</b> (the carry flag was set).</span>' : '<span class="c-g">Fits — result ' + res + '.</span>'), [vp({ 'math answer': uSum, 'register (unsigned)': res, 'unsigned overflow?': uOver ? 'yes (defined wrap)' : 'no' }, { 'unsigned overflow?': uOver ? 'cur' : 'ok' }, 'unsigned interpretation')]));
        frames.push(fr('<b>Signed view:</b> ' + asSigned(ua, w) + ' + ' + asSigned(ub, w) + ' = ' + sSum + '. ' + (sOver ? '<span class="c-r">Outside ' + lo + ' .. ' + (Math.pow(2, w - 1) - 1) + '! The register says ' + asSigned(res, w) + ', but for signed types C++ calls this <b>undefined behavior</b> — the compiler may assume it never happens.</span> (Hardware rule: signed overflow ⇔ carry into the sign bit ≠ carry out.)' : '<span class="c-g">Fits — result ' + asSigned(res, w) + '. No signed overflow (carry into the sign bit equals carry out).</span>'), [vp({ 'math answer': sSum, 'register (signed)': asSigned(res, w), 'signed overflow?': sOver ? 'YES → UB in C++' : 'no' }, { 'signed overflow?': sOver ? 'bad' : 'ok' }, 'signed interpretation')]));
        frames.push(fr('Try these inputs: <code>127 1 8</code> (signed overflow only), <code>200 100 8</code> (unsigned overflow only), <code>-1 1 8</code> (unsigned wraps to 0, signed is fine: −1 + 1 = 0), <code>7 1 4</code>.', [{ type: 'table', label: 'Which flag fires?', columns: ['a + b (8-bit)', 'unsigned overflow', 'signed overflow'], rows: [['100 + 50', 'no', 'YES (150 > 127)'], ['200 + 100', 'YES', 'no (−56 + 100 = 44)'], ['-1 + 1', 'YES (255+1)', 'no'], ['-100 + -100', 'YES', 'YES (−200 < −128)']] }]));
        return frames;
      }
    }, {
      title: 'The size() - 1 trap with an unsigned loop',
      input: '0',
      inputLabel: 'Vector length n (0 to 4)',
      gen: function (input) {
        var t = String(input || '').trim();
        if (!/^[0-4]$/.test(t)) throw new Error('Type a length from 0 to 4');
        var n = Number(t);
        var vals = []; for (var i = 0; i < n; i++) vals.push((i + 1) * 10);
        var code = 'std::vector<int> v = {...};\nfor (std::size_t i = 0; i <= v.size() - 1; ++i)\n    std::cout << v[i] << \' \';';
        var big = '18446744073709551615';
        var frames = [];
        frames.push(fr('We loop over a vector of <b>' + n + '</b> element(s) using <code>i &lt;= v.size() - 1</code>. Looks innocent. <code>v.size()</code> returns <code>std::size_t</code>, an <b>unsigned</b> 64-bit type.', [{ type: 'array', label: 'v', values: vals.length ? vals : ['(empty)'], hl: {} }, cp(code, { 1: 'cur' })]));
        var lim = n === 0 ? big : String(n - 1);
        frames.push(fr('Compute <code>v.size() - 1</code> = ' + n + ' − 1 in <b>unsigned</b> arithmetic → <b>' + lim + '</b>' + (n === 0 ? '. <span class="c-r">0 − 1 wrapped around to the maximum 64-bit value!</span>' : '. Fine, because size ≥ 1.'), [cp(code, { 2: n === 0 ? 'bad' : 'cur' }), vp({ 'v.size()': n, 'v.size() - 1': lim }, { 'v.size() - 1': n === 0 ? 'bad' : 'ok' })]));
        if (n === 0) {
          frames.push(fr('Check <code>0 &lt;= ' + big + '</code> → true. The loop body runs and reads <code>v[0]</code> of an <b>empty</b> vector: out of bounds → undefined behavior (garbage or a crash).', [cp(code, { 2: 'cur', 3: 'bad' }), vp({ i: 0, 'i <= limit': 'true' }, { i: 'bad' }), { type: 'array', label: 'v (no elements!)', values: ['?'], hl: { 0: 'bad' } }]));
          frames.push(fr('It keeps going: <code>v[1]</code>, <code>v[2]</code>, … for up to 1.8·10<sup>19</sup> iterations, until the program segfaults. The compiler warned you: <code>-Wsign-compare</code> is often silent here because both sides are unsigned — that is what makes this bug sneaky.', [cp(code, { 3: 'bad' }), tx('<span class="c-r">Segmentation fault (core dumped)</span>', 'Typical result')]));
        } else {
          for (var k = 0; k < n; k++) {
            var hl = {}; hl[k] = 'cur';
            frames.push(fr('i = ' + k + ': <code>' + k + ' &lt;= ' + (n - 1) + '</code> → print <b>' + vals[k] + '</b>.', [cp(code, { 3: 'cur' }), { type: 'array', label: 'v', values: vals, hl: hl, ptr: (function () { var p = {}; p[k] = 'i'; return p; })() }, vp({ i: k })]));
          }
          frames.push(fr('Works for n = ' + n + '. Now type <b>0</b>: the very same code explodes on an empty vector. Bugs that only appear on edge cases are exactly what interviewers probe.', [cp(code, {}), vp({ 'n = 0 result': 'out-of-bounds UB' }, { 'n = 0 result': 'bad' })]));
        }
        frames.push(fr('Fixes: write <code>i &lt; v.size()</code> (never subtract from an unsigned size), use a range-for <code>for (int x : v)</code>, or use a signed index with <code>std::ssize(v)</code>. For reverse loops: <code>for (auto i = std::ssize(v) - 1; i &gt;= 0; --i)</code>.', [cp('for (std::size_t i = 0; i < v.size(); ++i) { }        // fine\nfor (int x : v) { }                                     // best\nfor (auto i = std::ssize(v) - 1; i >= 0; --i) { }       // reverse, signed', { 1: 'ok', 2: 'ok', 3: 'ok' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: comparing int with unsigned', html: R`<p><code>int a = -1; unsigned b = 1; cout &lt;&lt; (a &lt; b ? "less" : "not less");</code> prints <b>not less</b>. <code>a</code> is converted to <code>unsigned</code> → 4294967295. With <code>-Wall</code> you get "comparison of integer expressions of different signedness". Fix: <code>std::cmp_less(a, b)</code> or cast <code>b</code> to a wider signed type.</p>`, code: R`
#include <iostream>
#include <utility>
int main() {
    int a = -1; unsigned b = 1;
    std::cout << (a < b ? "less" : "not less") << '\n';              // not less
    std::cout << (std::cmp_less(a, b) ? "less" : "not less") << '\n';  // less
    std::cout << (a < static_cast<long long>(b) ? "less" : "not less") << '\n'; // less
}` },
      { title: 'Safe midpoint for binary search', html: R`<p><code>int mid = (lo + hi) / 2;</code> overflows when <code>lo + hi &gt; INT_MAX</code> (e.g. lo = hi = 1.5·10<sup>9</sup>) — this exact bug sat in Java's and many C libraries' binary search for years. Use <code>lo + (hi - lo) / 2</code>, or C++20 <code>std::midpoint(lo, hi)</code> from <code>&lt;numeric&gt;</code>, which is overflow-free for integers and pointers.</p>`, code: R`
#include <iostream>
#include <numeric>
int main() {
    int lo = 1'500'000'000, hi = 2'000'000'000;
    // int bad = (lo + hi) / 2;                 // UB: lo + hi overflows int
    int good = lo + (hi - lo) / 2;              // 1750000000
    std::cout << good << ' ' << std::midpoint(lo, hi) << '\n';
}` },
      { title: 'What does the compiler do? The UB-based optimization', html: R`<p>Given <code>for (int i = 0; i &lt;= n; ++i)</code>, the compiler may assume <code>i</code> never overflows, so it knows the loop runs exactly n + 1 times and can vectorize it. With <code>unsigned i</code>, it must handle wrap-around (if n == UINT_MAX the loop is infinite), which blocks some optimizations. This is one reason signed loop counters are often <i>faster</i>. The cost: if your signed math does overflow, behaviour is unpredictable.</p>`, code: R`
#include <iostream>
long long sumTo(int n) {
    long long s = 0;
    for (int i = 0; i <= n; ++i) s += i;     // compiler may turn this into n*(n+1)/2
    return s;
}
int main() { std::cout << sumTo(100000) << '\n'; }   // 5000050000` },
      { title: 'Unsigned is perfect for hashing and modular arithmetic', html: R`<p>Hash functions <i>want</i> wrap-around: FNV-1a multiplies by a prime and lets the result wrap mod 2<sup>64</sup>. With <code>std::uint64_t</code> that is well-defined and fast; with signed <code>long long</code> it would be UB. Rule: <b>bits and hashes → unsigned; quantities → signed.</b></p>`, code: R`
#include <cstdint>
#include <iostream>
#include <string_view>
std::uint64_t fnv1a(std::string_view s) {
    std::uint64_t h = 14695981039346656037ULL;     // offset basis
    for (unsigned char c : s) { h ^= c; h *= 1099511628211ULL; }   // wraps mod 2^64: defined
    return h;
}
int main() { std::cout << std::hex << fnv1a("hello") << '\n'; }   // a430d84680aabd0b` }
    ],
    deepDive: R`<h4>🟣 What C++20 changed (and did not)</h4>
<p>P1236 made two's complement the only allowed representation, and conversions from any integer to a signed type are now <b>defined</b> as modulo 2<sup>N</sup> (before C++20, converting an out-of-range value to signed was implementation-defined). Right-shifting a negative number is now defined as an <b>arithmetic</b> shift (sign bit copied). But arithmetic <b>overflow</b> of signed types is still UB — the committee kept it deliberately because optimizers rely on it.</p>
<h4>Integer promotion pitfalls</h4>
<p><code>uint16_t a = 65535, b = 65535; auto p = a * b;</code> — both promote to <b>int</b> (signed!), and 65535 × 65535 = 4,294,836,225 overflows <code>int</code> → UB, even though everything was "unsigned". Similarly <code>uint8_t x = 0xFF; ~x</code> is the int <code>-256</code>, not <code>0x00</code>. Shifts: <code>1 &lt;&lt; 31</code> was UB before C++20 (now gives INT_MIN); <code>1 &lt;&lt; 32</code> with a 32-bit int is still UB (shift ≥ width). Use <code>1ULL &lt;&lt; k</code> for 64-bit masks.</p>
<h4>Detecting overflow properly</h4>
<ul><li>Pre-checks: add: <code>b &gt; 0 ? a &gt; MAX − b : a &lt; MIN − b</code>; multiply: <code>a &gt; MAX / b</code> (careful with signs and zero).</li>
<li>Builtins: <code>__builtin_add_overflow</code>, <code>__builtin_sub_overflow</code>, <code>__builtin_mul_overflow</code> (GCC/Clang) compile to a single instruction plus a flag check. C23 standardized them as <code>ckd_add</code> etc. in <code>&lt;stdckdint.h&gt;</code>, and C++26 adopts that header.</li>
<li>Wider type: compute in <code>long long</code> or <code>__int128</code> and compare with the limits.</li>
<li>Compiler flags: <code>-ftrapv</code> (trap on signed overflow), <code>-fwrapv</code> (define signed overflow as wrapping — used by the Linux kernel), <code>-fsanitize=signed-integer-overflow</code>.</li></ul>
<h4>Signed or unsigned for sizes? The great debate</h4>
<p>The standard library uses unsigned <code>size_t</code> for sizes (a historical decision Bjarne Stroustrup and others have called a mistake). Many style guides (Google, Core Guidelines ES.100–ES.107) say: use signed integers for arithmetic, avoid mixing, use unsigned only for bit manipulation. C++20 added <code>std::ssize</code> and the <code>cmp_*</code> functions to make the signed style easier. In interviews: show you know the trap and pick one consistent style.</p>
<h4>Real-world disasters</h4>
<p>Ariane 5 (1996) exploded after a 64-bit float was converted to a 16-bit signed integer that overflowed. The "Gangnam Style" YouTube counter exceeded 2<sup>31</sup>−1 views in 2014 and had to be moved to 64-bit. Boeing 787 generators needed a reboot every 248 days — 2<sup>31</sup> hundredths of a second. Overflow is not an academic problem.</p>`,
    aiEra: R`<p><b>What AI changes:</b> AI code reviewers and static analyzers now routinely flag sign-compare warnings, unchecked multiplications, and <code>size() - 1</code> patterns. You can ask an assistant to "add overflow checks to this function" and get correct builtin-based code in seconds.</p>
<p><b>Use AI as a partner:</b> ask it to produce adversarial test inputs — <code>INT_MAX</code>, <code>INT_MIN</code>, <code>-1</code>, empty containers, values right at the boundary. Ask "under which inputs does this expression overflow?" and verify with <code>-fsanitize=undefined</code>.</p>
<p><b>Where AI goes wrong:</b> it frequently claims "signed overflow wraps around in C++" (it is UB), writes reversal/atoi code that checks overflow <i>after</i> the multiplication (too late — the UB already happened), uses <code>abs(x)</code> on <code>INT_MIN</code>, mixes <code>int</code> and <code>size_t</code> in loops, and "fixes" a sign-compare warning with a cast that hides the real bug.</p>
<p><b>What you must still own:</b> the two's complement mental model, the promotion/conversion rules, and the habit of checking <b>before</b> the operation. These are classic interview filters: "Reverse Integer" and "String to Integer (atoi)" exist precisely to test them.</p>`,
    problems: [{
      title: 'Reverse a 32-bit Integer Without Overflow',
      level: 'Medium', tags: ['overflow', 'signed', 'math'], companies: ['Amazon', 'Apple', 'Bloomberg', 'Adobe'],
      statement: R`<p>Given a signed 32-bit integer <code>x</code>, return <code>x</code> with its digits reversed. If the reversed value is outside the 32-bit signed range [−2<sup>31</sup>, 2<sup>31</sup> − 1], return <b>0</b>. Pretend the environment cannot store 64-bit integers (so no "compute in long long and compare").</p>`,
      constraints: R`−2<sup>31</sup> ≤ x ≤ 2<sup>31</sup> − 1.`,
      example: R`<p><code>123</code> → <span class="c-g">321</span>. <code>-120</code> → <span class="c-g">-21</span> (in C++ <code>-120 % 10 == 0</code>, <code>-12 % 10 == -2</code>: the sign travels with the digits). <code>1534236469</code> → reversed 9646324351 &gt; 2147483647 → <span class="c-r">0</span>.</p>`,
      brute: { why: R`<p>The naive loop does <code>ans = ans * 10 + d</code> in <code>int</code> and checks afterwards. By then the overflow has already happened — undefined behavior; with optimizations the "after" check can even be deleted by the compiler because it "cannot be true". The 64-bit shortcut works in practice but breaks the stated constraint.</p>`, code: R`
#include <iostream>
int reverseBad(int x) {
    int ans = 0;
    while (x != 0) {
        ans = ans * 10 + x % 10;     // may overflow -> UB, BEFORE any check
        x /= 10;
    }
    return ans;                      // garbage for 1534236469
}
int main() { std::cout << reverseBad(123) << '\n'; }` },
      mcq: { q: 'Right before computing <code>ans * 10 + d</code> (ans ≥ 0, d ≥ 0), which condition guarantees an overflow?', options: ['<code>ans * 10 + d &gt; INT_MAX</code>', '<code>ans &gt; INT_MAX / 10 || (ans == INT_MAX / 10 &amp;&amp; d &gt; 7)</code>', '<code>ans &gt; INT_MAX</code>', '<code>d &gt; 7</code>'], answer: 1, explain: 'INT_MAX = 2147483647, so INT_MAX / 10 = 214748364 and the last digit is 7. The check uses only values that are themselves in range, so it cannot overflow.' },
      hints: [
        R`<p>Hint 1: the danger is the single step <code>ans * 10 + d</code>. Check whether it <i>would</i> exceed the limit using division instead of multiplication.</p>`,
        R`<p>Hint 2: INT_MAX = 214748364<b>7</b>, INT_MIN = −214748364<b>8</b>. Positive: overflow if ans &gt; 214748364, or ans == 214748364 and d &gt; 7. Negative: underflow if ans &lt; −214748364, or ans == −214748364 and d &lt; −8.</p>`,
        R`<p>Hint 3: C++ <code>%</code> keeps the sign of x, so for negative x the digits d are negative and you never need <code>abs(x)</code> (which is UB for INT_MIN). Recipe: while x ≠ 0: d = x % 10; x /= 10; if would-overflow → return 0; ans = ans·10 + d.</p>`
      ],
      solution: {
        approach: R`<p>Pop digits with <code>% 10</code> and <code>/ 10</code> (both keep the sign in C++). Before pushing a digit, compare <code>ans</code> with <code>INT_MAX / 10</code> and <code>INT_MIN / 10</code> plus the last digit. No intermediate value ever leaves the int range, so the code is UB-free.</p>`,
        code: R`
#include <climits>
#include <iostream>

int reverseInt(int x) {
    int ans = 0;
    while (x != 0) {
        int d = x % 10;              // -9..9, sign follows x
        x /= 10;
        if (ans > INT_MAX / 10 || (ans == INT_MAX / 10 && d > 7))  return 0;   // would exceed  2147483647
        if (ans < INT_MIN / 10 || (ans == INT_MIN / 10 && d < -8)) return 0;   // would go below -2147483648
        ans = ans * 10 + d;          // now guaranteed to fit
    }
    return ans;
}

int main() {
    for (int x : {123, -120, 1534236469, INT_MIN, 1463847412})
        std::cout << x << " -> " << reverseInt(x) << '\n';
    // 123 -> 321, -120 -> -21, 1534236469 -> 0, -2147483648 -> 0, 1463847412 -> 2147483641
}`,
        alt: [{ lang: 'python', code: R`def reverse(x):
    # Python ints never overflow, so we must simulate the 32-bit limit explicitly
    sign = -1 if x < 0 else 1
    r = sign * int(str(abs(x))[::-1])
    return r if -2**31 <= r <= 2**31 - 1 else 0

print(reverse(123), reverse(-120), reverse(1534236469))` }],
        dry: { head: ['x', 'd = x % 10', 'ans before', 'check', 'ans after'], rows: [['-120', '0', '0', 'ok', '0'], ['-12', '-2', '0', 'ok', '-2'], ['-1', '-1', '-2', 'ok', '<span class="c-g">-21</span>'], ['1534236469 … (9 digits later)', '1', '964632435', '<span class="c-r">964632435 &gt; 214748364</span>', '<span class="c-r">return 0</span>']] },
        complexity: R`<p>O(number of digits) = O(log₁₀|x|) ≤ 10 iterations, O(1) memory.</p>`,
        followUps: ['Do the same for 64-bit <code>long long</code> using <code>std::numeric_limits</code>', 'Rewrite the check with <code>__builtin_mul_overflow</code> and <code>__builtin_add_overflow</code>']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — cin / cout, getline, formatting and fast I/O
     ====================================================================== */
  topics.push({
    title: 'Input & Output: cin/cout, getline, Formatting and Fast I/O',
    analogy: R`<p>Picture a <b>conveyor belt</b> of characters arriving at your desk (the <b>input buffer</b>). <code>cin &gt;&gt; x</code> is a picky worker: he <b>throws away blank space</b> at the front of the belt, then grabs characters only while they still look like the thing he wants (digits for an <code>int</code>), and leaves everything else — including the Enter key — sitting on the belt. <code>getline</code> is a different worker who takes <b>everything up to the next Enter</b>, even if that means taking nothing. Output works the other way: <code>cout</code> puts letters into a <b>mailbag</b> (the output buffer) and only walks to the post office (a slow system call) when the bag is full — unless you shout <code>endl</code>, which forces a trip every single line.</p>`,
    explain: R`<h4>🟢 The four standard streams</h4>
${H.table(['Stream', 'Connected to', 'Buffered?', 'Use for'], [
  ['<code>std::cin</code>', 'standard input (keyboard / pipe / file)', 'yes', 'reading input'],
  ['<code>std::cout</code>', 'standard output', 'yes', 'normal results'],
  ['<code>std::cerr</code>', 'standard error', H.c('y', 'no — written immediately'), 'errors, diagnostics'],
  ['<code>std::clog</code>', 'standard error', 'yes', 'logging']
])}
<p><code>&gt;&gt;</code> is the "extraction" operator (data flows <i>out of</i> the stream into your variable) and <code>&lt;&lt;</code> is "insertion". They chain: <code>cin &gt;&gt; a &gt;&gt; b;</code> and <code>cout &lt;&lt; a &lt;&lt; ' ' &lt;&lt; b &lt;&lt; '\n';</code>. Include <code>&lt;iostream&gt;</code>.</p>
<h4>How <code>cin &gt;&gt;</code> really reads</h4>
<ol><li>Skip leading whitespace (spaces, tabs, newlines).</li>
<li>Read characters while they fit the target type (<code>int</code>: optional sign + digits; <code>std::string</code>: everything up to the next whitespace).</li>
<li>Stop and <b>leave</b> the next character in the buffer.</li>
<li>If nothing valid could be read, set the <b>fail</b> state: every later read does nothing until you call <code>cin.clear()</code>.</li></ol>
<p>The stream itself can be tested like a <code>bool</code>, so the idiomatic "read until end of input" loop is:</p>
<pre>long long x, sum = 0;
while (std::cin &gt;&gt; x) sum += x;      // stops at end-of-file (Ctrl+D / Ctrl+Z) or bad input</pre>
<h4>Whole lines: getline and the newline trap</h4>
<p><code>std::getline(std::cin, s)</code> reads up to (and removes) the next <code>'\n'</code>, keeping spaces. Mixing it with <code>&gt;&gt;</code> causes the most famous beginner bug: after <code>cin &gt;&gt; age;</code> the Enter is still on the belt, so the next <code>getline</code> immediately returns an <b>empty</b> line. Fix with <code>std::cin &gt;&gt; std::ws;</code> (skip whitespace) or <code>std::cin.ignore(std::numeric_limits&lt;std::streamsize&gt;::max(), '\n');</code> before <code>getline</code>. Step through it in the visualizer below.</p>
<h4>Formatting output</h4>
${H.table(['Want', 'iostream way', 'C++20 std::format'], [
  ['3 decimals: 3.142', '<code>cout &lt;&lt; fixed &lt;&lt; setprecision(3) &lt;&lt; pi</code>', '<code>format("{:.3f}", pi)</code>'],
  ['width 5, zero padded: 00042', '<code>cout &lt;&lt; setw(5) &lt;&lt; setfill(\'0\') &lt;&lt; 42</code>', '<code>format("{:05}", 42)</code>'],
  ['hex: ff', '<code>cout &lt;&lt; hex &lt;&lt; 255</code> (sticky!)', '<code>format("{:x}", 255)</code>'],
  ['true / false', '<code>cout &lt;&lt; boolalpha &lt;&lt; flag</code>', '<code>format("{}", flag)</code>']
])}
<p><code>setprecision</code>, <code>fixed</code>, <code>hex</code>, <code>setfill</code> are <b>sticky</b> (stay until changed); only <code>setw</code> resets after one output. C++23 adds <code>std::print("{} + {} = {}\n", a, b, a + b);</code> (header <code>&lt;print&gt;</code>; GCC 14+, Clang 18+, MSVC 2022 17.7+). C-style <code>printf</code>/<code>scanf</code> still work and are fast, but are not type-safe.</p>
<h4>endl vs '\n'</h4>
<p><code>std::endl</code> = write <code>'\n'</code> <b>and flush</b> the buffer (force the trip to the post office). <code>'\n'</code> just writes the newline. Printing 10<sup>6</sup> lines with <code>endl</code> can be <b>10× slower</b>. Use <code>'\n'</code> by default; flush explicitly only when someone must see the output <i>now</i> (interactive problems, progress bars, before a crash-prone section).</p>
<h4>Fast I/O: the two magic lines</h4>
<pre>std::ios::sync_with_stdio(false);   // stop keeping cin/cout in lock-step with C's scanf/printf
std::cin.tie(nullptr);              // stop flushing cout before every cin read</pre>
<p>By default C++ streams are synchronized with C stdio so you can mix <code>printf</code> and <code>cout</code> safely — that synchronization costs a lot. And <code>cin</code> is <b>tied</b> to <code>cout</code>: before every read, <code>cout</code> is flushed (great for prompts like "Enter age:", wasteful for judges). After <code>sync_with_stdio(false)</code>, <b>do not mix</b> <code>printf</code>/<code>scanf</code> with <code>cout</code>/<code>cin</code> — output may come out in the wrong order.</p>`,
    clues: [
      '"Input size up to 10<sup>6</sup> numbers" / "TLE with cin" → add <code>sync_with_stdio(false)</code> + <code>cin.tie(nullptr)</code> and use <code>\'\\n\'</code>',
      '"Number of test cases is not given; read until end of file" → <code>while (cin &gt;&gt; x)</code>',
      '"Read a full name / sentence with spaces" → <code>getline</code>; after <code>&gt;&gt;</code>, skip the leftover newline with <code>cin &gt;&gt; ws</code>',
      '"Interactive problem" → flush after every query (<code>endl</code> or <code>cout.flush()</code>), and do not untie if you rely on auto-flush',
      '"Print with exactly 6 decimals" → <code>fixed</code> + <code>setprecision(6)</code> or <code>std::format("{:.6f}")</code>',
      '"Output order is scrambled" → mixing printf and cout after sync_with_stdio(false), or cout vs unbuffered cerr',
      '"Why is endl slow?" → it flushes, causing a system call per line'
    ],
    code: [R`
#include <iomanip>
#include <iostream>
#include <limits>
#include <string>

int main() {
    int age;
    std::string fullName;

    std::cout << "Age? ";              // prompt: cin is tied to cout, so this appears before reading
    if (!(std::cin >> age)) {          // always check: the user may type "abc"
        std::cerr << "not a number\n";
        return 1;
    }
    std::cin >> std::ws;               // eat the '\n' left behind by >>  (or use ignore)
    std::cout << "Full name? ";
    std::getline(std::cin, fullName);  // reads "Ada Lovelace" including the space

    double score = 97.123456;
    std::cout << fullName << " (" << age << ")\n";
    std::cout << std::fixed << std::setprecision(2) << score << '\n';    // 97.12
    std::cout << std::setw(6) << std::setfill('*') << 42 << '\n';        // ****42
    std::cout << std::hex << 255 << std::dec << ' ' << 255 << '\n';      // ff 255
    std::cout << std::boolalpha << (age >= 18) << '\n';                  // true / false

    // Recovering from bad input:
    int n;
    while (!(std::cin >> n) && !std::cin.eof()) {
        std::cin.clear();                                                // clear the fail state
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // throw away the bad line
        std::cout << "try again: ";
    }
}`, R`
#include <cstdio>
#include <format>      // C++20
#include <iostream>
#include <vector>

// Competitive-programming style: fast I/O, read until EOF, '\n' not endl
int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    std::vector<long long> nums;
    long long x;
    while (std::cin >> x) nums.push_back(x);          // unknown count: read to end of input

    long long sum = 0;
    for (long long v : nums) sum += v;
    std::cout << nums.size() << ' ' << sum << '\n';
    std::cout << std::format("avg = {:.3f}\n", nums.empty() ? 0.0 : double(sum) / nums.size());
    // C++23:  std::print("avg = {:.3f}\n", avg);   (header <print>)
    // C style (fine if you never use cout in the same program after unsyncing):
    // std::printf("%lld\n", sum);
}`, R`
#include <cstdio>
#include <iostream>

// The fastest common technique: read big blocks with fread and parse by hand.
// Useful when input is ~10^7 numbers; for ordinary problems the two magic lines are enough.
static char buf[1 << 16];
static std::size_t len = 0, pos = 0;

inline int nextChar() {
    if (pos == len) { len = std::fread(buf, 1, sizeof buf, stdin); pos = 0; if (len == 0) return -1; }
    return buf[pos++];
}
inline bool readLL(long long& out) {
    int c = nextChar();
    while (c != -1 && c != '-' && (c < '0' || c > '9')) c = nextChar();   // skip separators
    if (c == -1) return false;
    bool neg = (c == '-');
    if (neg) c = nextChar();
    long long v = 0;
    for (; c >= '0' && c <= '9'; c = nextChar()) v = v * 10 + (c - '0');
    out = neg ? -v : v;
    return true;
}
int main() {
    long long x, sum = 0, cnt = 0;
    while (readLL(x)) { sum += x; ++cnt; }
    std::printf("%lld %lld\n", cnt, sum);
}`],
    codeTitle: ['cin/cout, getline, formatting, error recovery', 'Fast I/O + read until EOF + std::format', 'Custom buffered reader (fread)'],
    viz: [{
      title: 'The input buffer: cin >> vs getline',
      input: '42\\nAda Lovelace\\n',
      inputLabel: 'What the user types (write \\n for Enter)',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).replace(/\\n/g, '\n');
        if (!raw.length) throw new Error('Type some input, e.g. 42\\nAda Lovelace\\n');
        if (raw.length > 30) throw new Error('Keep the input under 30 characters');
        var show = function (ch) { return ch === '\n' ? '⏎' : ch === ' ' ? '␣' : ch === '\t' ? '⇥' : ch; };
        var code = 'int age; std::string name;\nstd::cin >> age;\nstd::getline(std::cin, name);\n// fix: std::cin >> std::ws; before getline';
        var pos = 0;
        var belt = function (from, hl) {
          var vals = raw.slice(from).split('').map(show);
          return { type: 'queue', label: 'input buffer (front = next char to read)', items: vals.length ? vals : ['EOF'], hl: hl || {}, frontLabel: 'next', backLabel: 'later' };
        };
        var frames = [];
        frames.push(fr('The user typed this. Every keystroke — including <b>Enter</b> (⏎) and spaces (␣) — sits in the input buffer in order. Our program reads an <code>int</code>, then a whole line.', [belt(0), cp(code, { 1: 'cur' })]));
        // cin >> age
        var start = pos, skipped = 0;
        while (pos < raw.length && /\s/.test(raw[pos])) { pos++; skipped++; }
        var numStart = pos;
        if (pos < raw.length && (raw[pos] === '-' || raw[pos] === '+')) pos++;
        var digStart = pos;
        while (pos < raw.length && /[0-9]/.test(raw[pos])) pos++;
        if (pos === digStart) {
          frames.push(fr('<code>cin &gt;&gt; age</code> skips ' + skipped + ' whitespace char(s), then sees <code>' + esc(show(raw[numStart] || 'EOF')) + '</code> — not a digit. Extraction <b class="c-r">fails</b>: <code>age</code> is set to 0, the stream enters the <b>fail state</b>, and every later read silently does nothing until <code>cin.clear()</code>.', [belt(start, { 0: 'bad' }), cp(code, { 2: 'bad' }), vp({ age: 0, 'cin.fail()': 'true' }, { 'cin.fail()': 'bad' })]));
          frames.push(fr('<code>getline</code> is skipped because the stream is in the fail state; <code>name</code> stays empty. Always test reads: <code>if (!(cin &gt;&gt; age)) { ... }</code>.', [cp(code, { 3: 'bad' }), vp({ age: 0, name: '""', 'cin.fail()': 'true' }, { name: 'bad' })]));
          frames.push(fr('Try the default input <code>42\\nAda Lovelace\\n</code> to see the famous newline trap.', [tx('Tip: <code>cin.clear(); cin.ignore(numeric_limits&lt;streamsize&gt;::max(), \'\\n\');</code> recovers from bad input.', 'Recovery')]));
          frames.push(fr('Summary: <code>&gt;&gt;</code> failing is not an exception by default — it is a <b>state flag</b> you must check.', [vp({ 'good()': 'false', 'fail()': 'true', 'eof()': String(pos >= raw.length) })]));
          return frames;
        }
        var age = Number(raw.slice(numStart, pos));
        var hl1 = {}; for (var q = 0; q < pos - start; q++) hl1[q] = q < skipped ? 'done' : 'ok';
        frames.push(fr('<code>cin &gt;&gt; age</code>: skip leading whitespace (' + skipped + ' char), read <code>' + esc(raw.slice(numStart, pos)) + '</code> while the characters look like an int, and <b>stop</b> at <code>' + esc(show(raw[pos] || 'EOF')) + '</code>. That character is <b>left in the buffer</b>.', [belt(start, hl1), cp(code, { 2: 'cur' }), vp({ age: age }, { age: 'ok' })]));
        frames.push(fr('After the read, the buffer starts with <code>' + esc(show(raw[pos] || 'EOF')) + '</code>.' + (raw[pos] === '\n' ? ' That leftover <b>Enter</b> is about to cause trouble…' : ''), [belt(pos, { 0: raw[pos] === '\n' ? 'bad' : 'cur' }), vp({ age: age })]));
        // getline (buggy)
        var gp = pos, line = '';
        while (gp < raw.length && raw[gp] !== '\n') { line += raw[gp]; gp++; }
        var consumedNl = gp < raw.length;
        var hl2 = {}; for (var r = 0; r < gp - pos + (consumedNl ? 1 : 0); r++) hl2[r] = r === gp - pos ? 'done' : 'ok';
        frames.push(fr('<code>getline(cin, name)</code> takes everything up to the next ⏎ and discards the ⏎. ' + (line === '' && consumedNl ? '<b class="c-r">The very first char is ⏎, so name = "" (empty)!</b> The user never got to type a name — this is the classic bug.' : 'name = "' + esc(line) + '".'), [belt(pos, hl2), cp(code, { 3: line === '' ? 'bad' : 'cur' }), vp({ age: age, name: '"' + line + '"' }, { name: line === '' ? 'bad' : 'ok' })]));
        // fixed version
        var fp = pos;
        while (fp < raw.length && /\s/.test(raw[fp])) fp++;
        var line2 = '', g2 = fp;
        while (g2 < raw.length && raw[g2] !== '\n') { line2 += raw[g2]; g2++; }
        var hl3 = {}; for (var z = 0; z < fp - pos; z++) hl3[z] = 'done';
        frames.push(fr('<b>Replay with the fix:</b> right after <code>cin &gt;&gt; age</code>, run <code>cin &gt;&gt; std::ws</code>. It eats all whitespace (' + (fp - pos) + ' char) at the front of the buffer, including the leftover ⏎.', [belt(pos, hl3), cp(code, { 4: 'ok' }), vp({ age: age })]));
        frames.push(fr('Now <code>getline</code> reads <b>"' + esc(line2) + '"</b> — spaces inside the line are kept, unlike <code>cin &gt;&gt; string</code>, which would stop at the first space.', [belt(fp, (function () { var h = {}; for (var y = 0; y < line2.length; y++) h[y] = 'ok'; return h; })()), vp({ age: age, name: '"' + line2 + '"' }, { name: 'ok' })]));
        frames.push(fr('Rules to remember: <code>&gt;&gt;</code> skips whitespace <i>before</i> and leaves it <i>after</i>; <code>getline</code> skips nothing and eats the ⏎. When switching from <code>&gt;&gt;</code> to <code>getline</code>, drop the leftover newline first.', [{ type: 'table', label: 'Cheat sheet', columns: ['call', 'skips leading ws?', 'stops at', 'removes the stop char?'], rows: [['cin >> int', 'yes', 'non-digit', 'no'], ['cin >> string', 'yes', 'any whitespace', 'no'], ['getline(cin, s)', 'no', '\\n', 'yes'], ['cin >> ws', 'yes (that is all it does)', 'non-whitespace', '—']] }]));
        return frames;
      }
    }, {
      title: 'Why endl and tied streams are slow: counting system calls',
      input: '6',
      inputLabel: 'Number of queries the program answers (1–12)',
      gen: function (input) {
        var t = String(input || '').trim();
        if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > 12) throw new Error('Type a number of queries from 1 to 12');
        var n = Number(t);
        var slow = 'int x;\nwhile (std::cin >> x)\n    std::cout << 2 * x << std::endl;   // flush every line';
        var fast = 'std::ios::sync_with_stdio(false);\nstd::cin.tie(nullptr);\nint x;\nwhile (std::cin >> x)\n    std::cout << 2 * x << \'\\n\';       // just a newline';
        var frames = [];
        frames.push(fr('Two programs answer the same ' + n + ' queries. A <b>system call</b> (asking the OS kernel to write bytes) costs on the order of a microsecond — hundreds of times more than appending a byte to a buffer. Let us count the <code>write()</code> calls.', [cp(slow, {}, 'Program A (default settings + endl)'), cp(fast, {}, 'Program B (fast I/O + \'\\n\')')]));
        var a = 0, b = 0, bufB = 0;
        for (var i = 1; i <= n; i++) {
          a += 1;           // endl flush -> one write per line
          bufB += String(2 * i).length + 1;
          var bars = { type: 'bars', label: 'write() system calls so far', values: [a, b], idxLabels: ['A: endl', 'B: \\n'], hl: { 0: 'bad', 1: 'ok' } };
          if (i <= 3 || i === n) {
            frames.push(fr('Query ' + i + ': both programs read <code>' + i + '</code> and produce <code>' + 2 * i + '</code>. <b>A</b>: <code>endl</code> forces a flush → <b>1 write()</b> (total ' + a + '). <b>B</b>: the bytes are appended to a 4–64 KB memory buffer → <b>0 write()</b> (buffer holds ' + bufB + ' bytes).', [bars, vp({ 'A writes': a, 'B writes': b, 'B buffered bytes': bufB }, { 'A writes': 'bad', 'B buffered bytes': 'ok' })]));
          }
        }
        b = 1;
        frames.push(fr('End of input. Program B flushes its buffer <b>once</b> at exit: 1 write() for all ' + n + ' lines. Program A made ' + a + '. With 10<sup>6</sup> lines that is 10<sup>6</sup> vs ~100 system calls — the difference between a TLE and a pass.', [{ type: 'bars', label: 'total write() system calls', values: [a, b], idxLabels: ['A: endl', 'B: \\n'], hl: { 0: 'bad', 1: 'ok' } }]));
        frames.push(fr('What the two magic lines remove: <code>sync_with_stdio(false)</code> lets <code>cin</code>/<code>cout</code> use their own fast buffers instead of going through C stdio for every operation; <code>cin.tie(nullptr)</code> stops "flush cout before every read". Price: never mix <code>printf</code>/<code>scanf</code> with <code>cout</code>/<code>cin</code> afterwards, and flush manually in interactive problems.', [{ type: 'graph', label: 'Default wiring (left) and what fast I/O cuts', directed: true, height: 40, nodes: [{ id: 'cin', label: 'cin', x: 12, y: 10, shape: 'box' }, { id: 'cout', label: 'cout', x: 12, y: 30, shape: 'box' }, { id: 'stdio', label: 'C stdio buffers', x: 50, y: 20, shape: 'box' }, { id: 'os', label: 'OS (read/write)', x: 86, y: 20, shape: 'box' }], edges: [['cin', 'cout', 'tie: flush'], ['cin', 'stdio', 'sync'], ['cout', 'stdio', 'sync'], ['stdio', 'os']], hl: { stdio: 'bad' }, ehl: { 'cin-cout': 'bad', 'cin-stdio': 'bad', 'cout-stdio': 'bad' } }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: reading a word vs a line', html: R`<p>Input: <code>New York</code>. <code>string city; cin &gt;&gt; city;</code> stores just <b>"New"</b> — <code>&gt;&gt;</code> stops at whitespace, and <code>"York"</code> stays in the buffer for the next read. To read the whole line use <code>getline(cin, city)</code>.</p>`, code: R`
#include <iostream>
#include <sstream>
#include <string>
int main() {
    std::istringstream in("New York\n");   // pretend this is the keyboard
    std::string w1, w2;
    in >> w1;                              // "New"
    in >> w2;                              // "York"
    std::cout << '[' << w1 << "] [" << w2 << "]\n";   // [New] [York]
}` },
      { title: 'Parsing a line with stringstream', html: R`<p>A common pattern: read a whole line with <code>getline</code>, then parse it with an <code>std::istringstream</code>. Example input line <code>"3 5 7 9"</code> — you do not know how many numbers it has, but you know they are on one line. The inner <code>while (ss &gt;&gt; x)</code> stops at the end of <i>that line</i>.</p>`, code: R`
#include <iostream>
#include <sstream>
#include <string>
int main() {
    std::istringstream input("3 5 7 9\n10 20\n");
    std::string line;
    while (std::getline(input, line)) {
        std::istringstream ss(line);
        long long x, sum = 0; int count = 0;
        while (ss >> x) { sum += x; ++count; }
        std::cout << count << " numbers, sum " << sum << '\n';   // 4 numbers, sum 24 / 2 numbers, sum 30
    }
}` },
      { title: 'What does the program do? Output order after unsyncing', html: R`<p>After <code>sync_with_stdio(false)</code>, <code>printf("A\n"); cout &lt;&lt; "B\n"; printf("C\n");</code> can print <b>A C B</b> (or other orders) when redirected to a file: C's <code>stdout</code> buffer and <code>cout</code>'s own buffer flush independently. Pick one family per program.</p>`, code: R`
#include <cstdio>
#include <iostream>
int main() {
    std::ios::sync_with_stdio(false);
    std::printf("A\n");
    std::cout << "B\n";        // separate buffer now: may appear after C when output is a file
    std::printf("C\n");
}` },
      { title: 'Formatted table with std::format (C++20)', html: R`<p><code>std::format</code> uses Python-like <code>{}</code> placeholders, is type-safe (unlike <code>printf</code>) and does not change stream state (unlike <code>setprecision</code>). Alignment: <code>{:&lt;10}</code> left, <code>{:&gt;8}</code> right, <code>{:^6}</code> centre; numbers: <code>{:.2f}</code>, <code>{:08.3f}</code>, <code>{:#x}</code>.</p>`, code: R`
#include <format>
#include <iostream>
int main() {
    struct Row { const char* item; int qty; double price; };
    Row rows[] = {{"apple", 3, 0.5}, {"bread", 1, 2.25}, {"milk", 2, 1.1}};
    std::cout << std::format("{:<8}{:>5}{:>9}\n", "item", "qty", "total");
    for (const auto& r : rows)
        std::cout << std::format("{:<8}{:>5}{:>9.2f}\n", r.item, r.qty, r.qty * r.price);
}` }
    ],
    deepDive: R`<h4>🟣 How iostreams are built</h4>
<p><code>std::cin</code> is an <code>std::istream</code> object that formats/parses, sitting on top of a <b>stream buffer</b> (<code>std::streambuf</code>) that actually moves bytes. Formatting goes through the stream's <b>locale</b> (for things like thousands separators), which is one reason iostreams are slower than hand-written parsers. Every stream has a state: <code>goodbit</code>, <code>eofbit</code>, <code>failbit</code>, <code>badbit</code>; <code>operator bool</code> returns <code>!fail()</code>. You can make a stream throw instead with <code>cin.exceptions(std::ios::failbit)</code>.</p>
<h4>Buffering modes</h4>
<p>C <code>stdout</code> is <b>line-buffered</b> when connected to a terminal and <b>fully buffered</b> when redirected to a file or pipe; <code>stderr</code> is unbuffered. That is why a program that crashes may lose its last <code>printf</code> lines when piped, but not when run in a terminal — and why debug output should go to <code>cerr</code>. <code>std::unitbuf</code> makes a stream flush after every operation (<code>cerr</code> has it set).</p>
<h4>How fast is fast?</h4>
<p>Rough order of magnitude for reading 10<sup>7</sup> integers (varies a lot by machine and library): default <code>cin</code> is the slowest; <code>scanf</code> and <code>cin</code> with the two magic lines are several times faster; a custom <code>fread</code> + manual parser is several times faster again, close to the disk/pipe speed. <code>std::from_chars</code> (C++17) is a locale-free, non-allocating, non-throwing number parser — the fastest standard building block, and the C++17 <code>&lt;charconv&gt;</code> <code>to_chars</code> is its output twin.</p>
<h4>Text vs binary, and Windows</h4>
<p>On Windows, text-mode streams translate <code>\n</code> ↔ <code>\r\n</code>; files read with <code>getline</code> may end lines with a stray <code>'\r'</code> if produced on Windows and read on Linux — trim it. Binary I/O uses <code>std::ios::binary</code> with <code>read</code>/<code>write</code>. UTF-8 is the de-facto encoding; <code>std::print</code> (C++23) writes UTF-8 correctly to the Windows console, which <code>cout</code> historically did not.</p>
<h4>std::format / std::print internals</h4>
<p><code>std::format</code> checks the format string <b>at compile time</b> (a <code>consteval</code> constructor), so <code>format("{:d}", "text")</code> is a compile error. It is based on the open-source {fmt} library, which is still widely used for older standards and is typically faster than both iostreams and printf.</p>`,
    aiEra: R`<p><b>What AI changes:</b> competitive-programming templates with fast I/O, debug macros and readers are generated in a second, and assistants can convert old <code>printf</code> code to <code>std::format</code>. In production, logging libraries (spdlog, built on {fmt}) handle most formatted output.</p>
<p><b>Use AI as a partner:</b> ask it to generate a large random input file to benchmark your reader, to explain why an interactive judge reports "Idleness limit exceeded" (missing flush), or to write a parser for a weird input format — then test with edge cases: empty input, no trailing newline, Windows line endings, extra spaces.</p>
<p><b>Where AI goes wrong:</b> it often adds the fast-I/O lines and then uses <code>printf</code> too (scrambled output), uses <code>endl</code> inside loops, forgets the leftover newline before <code>getline</code>, writes <code>while (!cin.eof())</code> (processes the last value twice — the correct idiom is <code>while (cin &gt;&gt; x)</code>), or unties <code>cin</code> in an interactive problem and never flushes.</p>
<p><b>What you must still own:</b> the buffer mental model. When output is missing, duplicated, out of order or slow, the fix is always one of: buffering, flushing, tie, sync, or a stream left in the fail state.</p>`,
    problems: [{
      title: 'Sum Until End of Input (unknown count, huge input)',
      level: 'Easy', tags: ['I/O', 'EOF', 'fast I/O'], companies: ['Codeforces-style', 'Google', 'Uber'],
      statement: R`<p>The input contains an <b>unknown</b> number of integers separated by spaces and/or newlines, possibly across many lines, up to the end of the file. Print two numbers on one line: how many integers there were, and their sum.</p>`,
      constraints: R`Up to 2·10<sup>6</sup> integers, each |a| ≤ 10<sup>9</sup>. Time limit 1 s.`,
      example: R`<p>Input:<br><code>3 4</code><br><code>-2</code><br><code>&nbsp;&nbsp;10</code><br>Output: <span class="c-g">4 15</span> — four numbers (3, 4, −2, 10), sum 15. Line structure does not matter because <code>&gt;&gt;</code> skips all whitespace, including newlines.</p>`,
      brute: { why: R`<p>Common slow/buggy version: loop on <code>while (!cin.eof())</code> — after the last number, eof is not yet set (the reader stopped <i>before</i> the end), so the loop runs once more, the read fails, and the last value is added <b>twice</b>. It also uses an <code>int</code> sum (2·10<sup>6</sup> × 10<sup>9</sup> overflows) and default, synced, tied streams that may TLE.</p>`, code: R`
#include <iostream>
int main() {
    int x = 0, sum = 0, count = 0;           // int sum overflows
    while (!std::cin.eof()) {                 // BUG: one extra iteration at the end
        std::cin >> x;                        // fails on the extra pass; x keeps (or zeroes) its value
        sum += x; ++count;
    }
    std::cout << count << ' ' << sum << std::endl;
}` },
      mcq: { q: 'What is the correct loop to read integers until the end of input?', options: ['<code>while (!cin.eof()) { cin &gt;&gt; x; ... }</code>', '<code>while (cin &gt;&gt; x) { ... }</code>', '<code>for (;;) { cin &gt;&gt; x; if (x == 0) break; }</code>', '<code>while (cin.good()) { ... }</code>'], answer: 1, explain: 'The extraction itself returns the stream; it converts to false as soon as a read fails (end of file or bad data), so the body only runs for values that were actually read.' },
      hints: [
        R`<p>Hint 1: let the <b>read</b> be the loop condition, so you never use a value that was not read.</p>`,
        R`<p>Hint 2: 2·10<sup>6</sup> × 10<sup>9</sup> = 2·10<sup>15</sup> → <code>long long</code> sum. 2·10<sup>6</sup> numbers in 1 s → enable fast I/O.</p>`,
        R`<p>Hint 3: Recipe: two magic lines; <code>long long x, sum = 0, cnt = 0; while (cin &gt;&gt; x) { sum += x; ++cnt; }</code>; print with <code>'\n'</code>. Empty input prints <code>0 0</code>.</p>`
      ],
      solution: {
        approach: R`<p>Use the stream's truthiness as the loop condition: <code>while (cin &gt;&gt; x)</code>. Accumulate in <code>long long</code>. Turn off sync and tie for speed. Whitespace layout (spaces vs newlines) is irrelevant to <code>&gt;&gt;</code>.</p>`,
        code: R`
#include <iostream>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    long long x, sum = 0, count = 0;
    while (std::cin >> x) {      // false at EOF (or on non-numeric junk)
        sum += x;
        ++count;
    }
    std::cout << count << ' ' << sum << '\n';
    return 0;
}`,
        alt: [{ lang: 'python', code: R`import sys
data = sys.stdin.buffer.read().split()   # read everything at once: fast
nums = list(map(int, data))
print(len(nums), sum(nums))` }],
        dry: { head: ['buffer front', 'cin >> x', 'x', 'count', 'sum'], rows: [['3␣4⏎-2⏎␣␣10⏎', 'ok', '3', '1', '3'], ['␣4⏎-2⏎…', 'ok (skips ␣)', '4', '2', '7'], ['⏎-2⏎…', 'ok (skips ⏎)', '-2', '3', '5'], ['⏎␣␣10⏎', 'ok', '10', '4', '15'], ['⏎', '<span class="c-r">fails: EOF</span> → loop ends', '—', '4', '<span class="c-g">15</span>']] },
        complexity: R`<p>O(N) time, O(1) memory (no need to store the numbers).</p>`,
        followUps: ['Also print the maximum and minimum (careful with empty input)', 'Write the same with the fread-based reader and measure the difference on 10<sup>7</sup> numbers']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Namespaces, using, name lookup
     ====================================================================== */
  topics.push({
    title: 'Namespaces: std::, using, Aliases, Unnamed & Inline Namespaces, Name Lookup',
    analogy: R`<p>In a big school there may be three students called <b>Priya</b>. Teachers avoid confusion with <b>surnames</b>: Priya Sharma, Priya Nair, Priya Das. A <b>namespace</b> is a surname for code: <code>std::count</code>, <code>mylib::count</code>, <code>geo::count</code>. <code>using namespace std;</code> is like announcing "from now on, call everyone in the Sharma family by first name only" — handy in a small class, chaos in a school assembly, because the moment two Priyas are present nobody knows who you mean (the compiler says <b>"ambiguous"</b>).</p>`,
    explain: R`<h4>🟢 Why namespaces exist</h4>
<p>Large programs combine code from many libraries. Without namespaces, two libraries that both define <code>log()</code> or <code>Point</code> would collide. A namespace groups names under a prefix so they can coexist. Everything in the standard library lives in <code>namespace std</code>.</p>
<pre>namespace geo {
    struct Point { double x, y; };
    double distance(Point a, Point b);
}
geo::Point p{1, 2};            // :: is the scope-resolution operator
::globalThing;                 // a leading :: means "the global namespace"</pre>
<h4>Three ways to refer to a name</h4>
${H.table(['Style', 'Example', 'Brings in', 'Verdict'], [
  ['Fully qualified', '<code>std::vector&lt;int&gt; v;</code>', 'nothing', H.c('g', 'always safe; standard in headers')],
  ['using-declaration', '<code>using std::cout;</code>', 'exactly one name', H.c('g', 'fine in .cpp files and function bodies')],
  ['using-directive', '<code>using namespace std;</code>', 'every name in std (hundreds)', H.c('y', 'OK for tiny programs / contests; ') + H.c('r', 'never in headers')]
])}
<h4>Why <code>using namespace std;</code> can bite</h4>
<p><code>std</code> contains names like <code>count</code>, <code>distance</code>, <code>size</code>, <code>data</code>, <code>max</code>, <code>min</code>, <code>swap</code>, <code>hash</code>, <code>byte</code>, <code>left</code>, <code>right</code>… After the directive, declaring your own global <code>int count;</code> and then using <code>count</code> gives <code>error: reference to 'count' is ambiguous</code>. Worse, a new C++ version can <b>add</b> names to <code>std</code> (C++17 added <code>std::size</code>, <code>std::data</code>, <code>std::byte</code>), so code that compiled yesterday breaks after a compiler upgrade. And if it is in a header, every file that includes the header inherits the problem.</p>
<h4>Handy namespace features</h4>
${H.table(['Feature', 'Syntax', 'Use'], [
  ['Nested (C++17 short form)', '<code>namespace company::net::http { }</code>', 'organizing big codebases'],
  ['Alias', '<code>namespace fs = std::filesystem;</code>', 'shorten long names: <code>fs::path</code>'],
  ['Unnamed (anonymous)', '<code>namespace { int helper(); }</code>', 'file-private helpers (internal linkage)'],
  ['Inline namespace', '<code>inline namespace v2 { }</code>', 'library versioning; <code>std::literals</code>'],
  ['Open / reopenable', '<code>namespace geo { }</code> again in another file', 'spread one namespace across many files']
])}
<h4>How the compiler finds a name (simplified)</h4>
<p>For an unqualified name like <code>count</code>, the compiler searches <b>outward</b>: the current block → the enclosing function → the enclosing class → each enclosing namespace → the global namespace. It <b>stops at the first scope that has the name</b> (inner names hide outer ones). Names pulled in by a <code>using namespace</code> directive behave as if they were declared in the nearest namespace that contains both the directive and the used namespace (for <code>using namespace std;</code> at file scope: the global namespace). If two different entities are found at the same level → <b>ambiguous</b>. For function calls there is one extra rule, <b>ADL</b>: the namespaces of the argument types are searched too — that is how <code>std::cout &lt;&lt; s</code> finds <code>std::operator&lt;&lt;</code> without you writing <code>std::</code>.</p>`,
    clues: [
      '"Why is <code>using namespace std;</code> considered bad practice?" → pollutes the scope, causes ambiguities, breaks on new std names, and leaks from headers',
      '"error: reference to \'count\' is ambiguous" → your global name collides with a std name pulled in by a using-directive',
      '"\'helper\' was not declared in this scope" though it exists → it lives in another namespace: qualify it or add a using-declaration',
      '"How do you make a function private to one .cpp file?" → unnamed namespace (or <code>static</code>)',
      '"What is ADL / Koenig lookup?" → function names are also looked up in the namespaces of their arguments',
      '"How do libraries version their ABI?" → inline namespaces (e.g. libc++ uses <code>std::__1</code>)',
      '"Shorten std::chrono::duration_cast" → namespace alias or a using-declaration inside the function'
    ],
    code: [R`
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

namespace inventory {                                   // our own "surname"
    int count(const std::vector<std::string>& items, const std::string& name) {
        int c = 0;
        for (const auto& it : items) if (it == name) ++c;
        return c;
    }
    namespace detail {                                  // nested: inventory::detail
        std::string normalize(std::string s) {
            for (char& ch : s) ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
            return s;
        }
    }
}

namespace company::app::v1 {                            // C++17 nested namespace definition
    constexpr const char* name = "shop";
}
namespace app = company::app::v1;                       // namespace alias

int main() {
    std::vector<std::string> items = {"apple", "pear", "apple"};

    // Same short name, different namespaces, no clash:
    std::cout << inventory::count(items, "apple") << '\n';                       // 2
    std::cout << std::count(items.begin(), items.end(), std::string("pear")) << '\n';  // 1

    using inventory::detail::normalize;                 // using-declaration: ONE name, local scope
    std::cout << normalize("ApPlE") << ' ' << app::name << '\n';                 // apple shop

    using namespace std::string_literals;               // brings the ""s suffix (inline namespace)
    auto s = "hello"s;                                  // std::string, not const char*
    std::cout << s.size() << '\n';                      // 5
}`, R`
#include <iostream>
#include <utility>

namespace shapes {
    struct Box { int w, h; };
    // Found by ADL: the argument's type lives in 'shapes'
    void print(const Box& b) { std::cout << b.w << 'x' << b.h << '\n'; }
    void swap(Box& a, Box& b) noexcept { std::cout << "custom swap\n"; std::swap(a.w, b.w); std::swap(a.h, b.h); }
}

template <class T>
void generic_swap(T& a, T& b) {
    using std::swap;   // the "two-step": make std::swap a fallback...
    swap(a, b);        // ...but let ADL pick a better, type-specific swap if one exists
}

int main() {
    shapes::Box a{1, 2}, b{3, 4};
    print(a);                // no shapes:: needed — argument-dependent lookup
    generic_swap(a, b);      // prints "custom swap"
    print(a);                // 3x4
    int x = 1, y = 2;
    generic_swap(x, y);      // ints: falls back to std::swap
    std::cout << x << y << '\n';   // 21
}`],
    codeTitle: ['Own namespaces, nesting, alias, using-declaration, literals', 'ADL and the std::swap two-step'],
    viz: {
      title: 'Name lookup: where does the compiler find this name?',
      input: 'count main',
      inputLabel: 'name (count | max | helper | local) + where it is used (main | run)',
      gen: function (input) {
        var tk = String(input || '').trim().split(/\s+/);
        var names = ['count', 'max', 'helper', 'local'], wheres = ['main', 'run'];
        if (tk.length !== 2 || names.indexOf(tk[0]) < 0 || wheres.indexOf(tk[1]) < 0) throw new Error('Type a name (count, max, helper, local) and a place (main, run), e.g. "count main" or "helper run"');
        var nm = tk[0], where = tk[1];
        var program = '#include <algorithm>     // declares std::count, std::max\nusing namespace std;     // directive at global scope\nint count = 0;           // a global named count\nnamespace app {\n    int count = 10;      // app::count\n    namespace util { int helper() { return 7; } }\n    void run() {\n        int local = 1;\n        /* use NAME here */\n    }\n}\nint main() {\n    /* use NAME here */\n}';
        var useLine = where === 'run' ? 9 : 13;
        // scopes from inner to outer; each has the names it declares
        var scopes = where === 'run'
          ? [{ id: 'blk', label: 'block of run()', has: ['local'] }, { id: 'app', label: 'namespace app', has: ['count', 'util', 'run'] }, { id: 'glob', label: 'global ::', has: ['count', 'app', 'main'] }]
          : [{ id: 'blk', label: 'block of main()', has: [] }, { id: 'glob', label: 'global ::', has: ['count', 'app', 'main'] }];
        var stdHas = ['count', 'max', 'min', 'swap', 'vector', '…'];
        var nodes = [], edges = [];
        scopes.forEach(function (s, i) { nodes.push({ id: s.id, label: s.label, x: 14 + i * 26, y: 12, shape: 'box' }); if (i > 0) edges.push([scopes[i - 1].id, s.id, 'outward']); });
        nodes.push({ id: 'std', label: 'std (via using)', x: 14 + (scopes.length - 1) * 26, y: 36, shape: 'box' });
        nodes.push({ id: 'util', label: 'app::util', x: 86, y: 36, shape: 'box' });
        edges.push(['std', 'glob', 'visible as if global']);
        var G = function (hl, ehl) { return { type: 'graph', label: 'Scopes searched (inner → outer)', directed: true, height: 48, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; };
        var frames = [];
        frames.push(fr('The code uses the unqualified name <code>' + nm + '</code> inside <code>' + (where === 'run' ? 'app::run()' : 'main()') + '</code>. The compiler searches scopes from the <b>innermost outward</b> and stops at the first scope that declares the name.', [cp(program.replace(/NAME/g, nm), (function () { var h = {}; h[useLine] = 'cur'; return h; })()), G({ blk: 'cur' })]));
        for (var i = 0; i < scopes.length; i++) {
          var s = scopes[i];
          var foundHere = s.has.indexOf(nm) >= 0;
          var stdToo = s.id === 'glob' && stdHas.indexOf(nm) >= 0;
          var hl = {}; scopes.forEach(function (o, j) { if (j < i) hl[o.id] = 'done'; }); hl[s.id] = foundHere || stdToo ? 'ok' : 'cur';
          if (s.id === 'glob') hl.std = stdToo ? 'ok' : 'cur';
          var tbl = { type: 'table', label: 'Names declared in ' + s.label + (s.id === 'glob' ? ' (+ std via using-directive)' : ''), columns: ['name', 'from'], rows: s.has.map(function (n) { return [n, s.label]; }).concat(s.id === 'glob' ? stdHas.map(function (n) { return [n, 'std (using namespace)']; }) : []), hl: {} };
          tbl.rows.forEach(function (r, k) { if (r[0] === nm) tbl.hl[k] = 'sel'; });
          if (s.id === 'glob' && foundHere && stdToo) {
            frames.push(fr('In the <b>global</b> scope the compiler finds <b>two different</b> <code>' + nm + '</code>s at the same level: the global <code>int count</code> and <code>std::count</code> (made visible here by <code>using namespace std;</code>). It refuses to guess.', [G((function () { hl.glob = 'bad'; hl.std = 'bad'; return hl; })()), tbl]));
            frames.push(fr('<span class="c-r">error: reference to \'' + nm + '\' is ambiguous</span>. Fixes: write <code>::count</code> (the global) or <code>std::count</code>; better, delete <code>using namespace std;</code> and put your own names in your own namespace.', [tx('<code class="c-r">error: reference to \'count\' is ambiguous</code><br><code>note: candidates are: \'int count\'</code><br><code>note: \'template&lt;class _IIter, class _Tp&gt; ... std::count(...)\'</code>', 'g++ output'), cp('::count = 5;          // the global one\napp::count = 6;       // the one in app\nstd::count(v.begin(), v.end(), 3);   // the algorithm', { 1: 'ok', 2: 'ok', 3: 'ok' }, 'Qualified names never clash')]));
            return frames;
          }
          if (foundHere || stdToo) {
            var who = foundHere ? (s.id === 'app' ? 'app::' + nm : s.id === 'blk' ? 'the local variable ' + nm : '::' + nm) : 'std::' + nm;
            frames.push(fr('Looking in <b>' + s.label + '</b>… <span class="c-g">found <code>' + nm + '</code></span> → it means <b>' + who + '</b>. Lookup <b>stops here</b>; outer scopes are not consulted, so ' + (nm === 'count' ? 'the global <code>count</code> and <code>std::count</code> are <b>hidden</b> — no ambiguity.' : 'nothing else can conflict.'), [G(hl), tbl]));
            var skipped = scopes.slice(i + 1).map(function (o) { return o.label; });
            if (s.id !== 'glob') skipped.push('std (via using)');
            frames.push(fr('Scopes <b>not consulted</b> because lookup already stopped: ' + (skipped.length ? skipped.join(', ') : 'none') + '. An inner declaration <b>hides</b> any outer one with the same name — this is called <i>name hiding</i> (and <code>-Wshadow</code> warns about it for variables).', [G((function () { var h2 = {}; h2[s.id] = 'sel'; scopes.slice(i + 1).forEach(function (o) { h2[o.id] = 'done'; }); if (s.id !== 'glob') h2.std = 'done'; return h2; })()), { type: 'table', label: 'Skipped scopes', columns: ['scope', 'consulted?'], rows: skipped.length ? skipped.map(function (x) { return [x, 'no']; }) : [['(none — this was the last scope)', '—']] }]));
            frames.push(fr('Result: <code>' + nm + '</code> in ' + (where === 'run' ? '<code>app::run()</code>' : '<code>main()</code>') + ' resolves to <b>' + who + '</b>. ' + (nm === 'count' && where === 'run' ? 'Try <code>count main</code> to see the same name become ambiguous one scope further out.' : nm === 'max' ? 'This only works because of the using-directive; without it you must write <code>std::max</code>.' : ''), [vp({ name: nm, 'used in': where, 'resolves to': who }, { 'resolves to': 'ok' })]));
            return frames;
          }
          frames.push(fr('Looking in <b>' + s.label + '</b>… no <code>' + nm + '</code> declared here' + (s.id === 'glob' ? ', and <code>std</code> has none either' : '') + '. Move one scope <b>outward</b>.', [G(hl, (function () { var e = {}; if (i + 1 < scopes.length) e[s.id + '-' + scopes[i + 1].id] = 'cur'; return e; })()), tbl]));
        }
        frames.push(fr('No scope on the path declares <code>' + nm + '</code>. ' + (nm === 'helper' ? 'It exists — but inside <code>app::util</code>, which is <b>not</b> on the outward path. ' : '') + '<span class="c-r">error: \'' + nm + '\' was not declared in this scope</span>' + (nm === 'helper' ? '; did you mean <code>app::util::helper</code>?' : '.'), [G({ util: nm === 'helper' ? 'sel' : '', blk: 'bad' })]));
        frames.push(fr(nm === 'helper' ? 'Fixes: call <code>util::helper()</code> (from inside <code>app</code>), <code>app::util::helper()</code> (from anywhere), or add <code>using app::util::helper;</code> in the function first.' : (nm === 'local' ? 'A local variable of <code>run()</code> is invisible in <code>main()</code> — scopes nest, they do not leak sideways.' : 'Declare the name or qualify it.'), [cp(nm === 'helper' ? 'void run() {\n    int a = util::helper();            // relative to app\n    int b = app::util::helper();       // fully qualified\n    using app::util::helper;           // using-declaration\n    int c = helper();\n}' : 'int main() {\n    // run()\'s local is gone; pass values as parameters instead\n}', { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' })]));
        return frames;
      }
    },
    examples: [
      { title: 'What does the compiler do? A global name meets using namespace std', html: R`<p>With <code>using namespace std;</code> at the top, a global <code>int distance = 5;</code> compiles, but the line <code>cout &lt;&lt; distance;</code> fails: "reference to 'distance' is ambiguous" (<code>std::distance</code> is a function template). Qualifying with <code>::distance</code> fixes it — or simply do not use the directive. Interviewers like this because it shows you understand <i>why</i> the guideline exists.</p>`, code: R`
#include <iostream>
int distanceKm = 5;                 // a non-clashing name (with 'distance' it would be ambiguous)
int main() {
    std::cout << ::distanceKm << '\n';    // leading :: = global namespace
}` },
      { title: 'Unnamed namespace vs static', html: R`<p>Both give <b>internal linkage</b> — the name is invisible to other <code>.cpp</code> files, so two files can each have a helper called <code>parseLine</code> without a linker clash. The unnamed namespace is the modern preferred form because it also works for types (<code>static struct</code> does not mean that).</p>`, code: R`
#include <iostream>
namespace {                          // everything here is private to this file
    struct Config { int retries = 3; };
    int parseLine() { return 42; }
}
static int legacyHelper() { return 1; }   // C-style equivalent for functions
int main() { std::cout << Config{}.retries + parseLine() + legacyHelper() << '\n'; }   // 46` },
      { title: 'Inline namespaces and versioning', html: R`<p>Members of an <code>inline namespace</code> are visible as if they were in the enclosing namespace, so <code>lib::parse()</code> finds <code>lib::v2::parse()</code>. Old clients can still ask for <code>lib::v1::parse()</code> explicitly. The mangled names include <code>v2</code>, so mixing binaries built against different versions fails at link time instead of crashing at run time. The standard library uses this for literals: <code>std::literals::chrono_literals</code>.</p>`, code: R`
#include <chrono>
#include <iostream>
namespace lib {
    namespace v1 { int parse() { return 1; } }
    inline namespace v2 { int parse() { return 2; } }   // the default version
}
int main() {
    using namespace std::chrono_literals;
    auto timeout = 250ms;                                 // std::chrono::milliseconds
    std::cout << lib::parse() << ' ' << lib::v1::parse() << ' ' << timeout.count() << '\n';   // 2 1 250
}` },
      { title: 'Competitive programming vs production', html: R`<p>In a 2-hour contest, <code>#include &lt;bits/stdc++.h&gt;</code> + <code>using namespace std;</code> saves typing and is universal. In production both are discouraged: <code>bits/stdc++.h</code> is a GCC-internal header (not available on MSVC, slows builds by including everything), and the directive causes the clashes above. Know both styles and say so in interviews.</p>`, code: R`
// Production style: explicit headers, explicit std::, using-declarations only where helpful
#include <iostream>
#include <string>
#include <vector>
int main() {
    using std::cout;                     // one name, one scope
    std::vector<std::string> names{"ada", "linus"};
    for (const auto& n : names) cout << n << '\n';
}` }
    ],
    deepDive: R`<h4>🟣 Name lookup in full</h4>
<p>C++ distinguishes <b>qualified</b> lookup (<code>a::b</code>: search only in <code>a</code>, plus inline namespaces and using-directives inside it) and <b>unqualified</b> lookup (scope-by-scope outward, stopping at the first scope with a declaration). For an unqualified <b>function call</b>, the result is merged with <b>argument-dependent lookup</b> (ADL): the namespaces (and classes) associated with each argument type are searched too, then <b>overload resolution</b> picks the best match. Name hiding happens <i>before</i> overload resolution — a common surprise: a member function <code>print(int)</code> in a derived class hides <code>print(std::string)</code> from the base, even though the parameter types differ.</p>
<h4>ADL: the good and the bad</h4>
<p>Good: operators work naturally (<code>a + b</code> for <code>bigint::Int</code> finds <code>bigint::operator+</code>), and the "<code>using std::swap; swap(a, b);</code>" two-step lets types provide optimized swaps. Bad: ADL can pull in unexpected overloads from an argument's namespace; that is why generic library code sometimes calls <code>std::move</code> or <code>::std::addressof</code> fully qualified. C++20 "customization point objects" (like <code>std::ranges::swap</code>) were designed to tame ADL.</p>
<h4>Rules about std</h4>
<p>You may <b>not</b> add declarations to <code>namespace std</code> (undefined behavior), with narrow exceptions: you may specialize certain templates for your own types, e.g. <code>std::hash&lt;MyType&gt;</code> and <code>std::formatter&lt;MyType&gt;</code>. Names starting with an underscore followed by a capital letter (<code>_Foo</code>) or containing double underscores (<code>__x</code>) are reserved for the implementation everywhere — that is why library internals look like <code>__first</code>.</p>
<h4>Namespaces and linkage/ABI</h4>
<p>Namespace names become part of the <b>mangled</b> symbol (<code>geo::area(double)</code> → <code>_ZN3geo4areaEd</code>), so namespaces also prevent linker collisions between libraries. <code>extern "C"</code> functions ignore namespaces for linkage purposes — two <code>extern "C" void init()</code> in different namespaces are the same symbol. libstdc++'s <code>std::__cxx11</code> inline namespace (introduced with GCC 5's new <code>std::string</code>) is the famous real-world example of ABI versioning.</p>
<h4>Modules and namespaces are orthogonal</h4>
<p>C++20 modules control <b>visibility</b> (what is exported); namespaces still control <b>naming</b>. A module <code>geo</code> usually exports a namespace <code>geo</code>, but nothing requires it. <code>import std;</code> (C++23) gives you <code>std::</code> names and <code>import std.compat;</code> additionally puts C library functions in the global namespace.</p>`,
    aiEra: R`<p><b>What AI changes:</b> autocompletion and AI assistants fill in long qualified names (<code>std::chrono::duration_cast&lt;std::chrono::milliseconds&gt;</code>) instantly, so the "typing cost" argument for <code>using namespace std;</code> has mostly disappeared. Refactoring tools can wrap a codebase in a namespace safely.</p>
<p><b>Use AI as a partner:</b> ask it to explain a long "ambiguous" or "no matching function" error by listing the candidates and which lookup rule found each. Ask it to "find every using-directive in headers" across a repo.</p>
<p><b>Where AI goes wrong:</b> generated snippets very often start with <code>#include &lt;bits/stdc++.h&gt;</code> and <code>using namespace std;</code> — fine in contests, wrong in production headers. It may name your helpers <code>count</code>, <code>data</code> or <code>size</code> and trigger ambiguities, add specializations or helpers into <code>namespace std</code> (UB except the allowed specializations), or call <code>std::swap(a, b)</code> directly in generic code, bypassing a type's custom swap.</p>
<p><b>What you must still own:</b> the lookup model (outward search, first scope wins, ADL for calls) and the habits: own namespace per project, unnamed namespace for file-private helpers, no directives in headers. These show seniority in code reviews.</p>`,
    problems: [{
      title: 'Two Libraries, One Name: area()',
      level: 'Easy', tags: ['namespaces', 'qualified names', 'aliases'], companies: ['Microsoft', 'Autodesk', 'Unity'],
      statement: R`<p>You integrate two libraries. The <b>geometry</b> library has <code>double area(double radius)</code> (circle area). The <b>graphics</b> library has <code>long long area(int width, int height)</code> (pixels in a rectangle). Both were written as global functions, and the team also wants their own helper <code>area(const Room&amp;)</code>. Organize the code with namespaces so all three coexist, then read <code>r w h</code> and print the circle area with 2 decimals and the pixel count.</p>`,
      constraints: R`0 ≤ r ≤ 10<sup>4</sup>; 1 ≤ w, h ≤ 10<sup>5</sup> (so w·h can reach 10<sup>10</sup>).`,
      example: R`<p>Input <code>1 1920 1080</code> → output <span class="c-g">3.14 2073600</span>. The call <code>geom::area(1.0)</code> picks the circle version and <code>gfx::area(1920, 1080)</code> picks the pixel version — the namespace decides, not luck with overload resolution.</p>`,
      brute: { why: R`<p>The C-style workaround is <b>name prefixes</b>: <code>geom_area</code>, <code>gfx_area</code>. It compiles, but every name in every library must be manually prefixed, you cannot shorten them with aliases or using-declarations, ADL cannot help, and everything still lands in the one global namespace where the next library may clash. (Leaving both as plain overloads of <code>area</code> also "works" until someone calls <code>area(5)</code> — is that a radius or a mistake?)</p>`, code: R`
#include <cstdio>
// C-style: prefixes instead of namespaces
double geom_area(double r) { return 3.141592653589793 * r * r; }
long long gfx_area(int w, int h) { return 1LL * w * h; }
int main() {
    double r; int w, h;
    if (std::scanf("%lf %d %d", &r, &w, &h) != 3) return 1;
    std::printf("%.2f %lld\n", geom_area(r), gfx_area(w, h));
}` },
      mcq: { q: 'Inside <code>namespace gfx</code>, an unqualified call <code>area(3.0)</code> is made, and <code>gfx</code> declares <code>area(int, int)</code> only. Global <code>area(double)</code> also exists. What happens?', options: ['Global area(double) is called', 'Compile error: lookup stops in gfx, which has area — but no matching overload', 'Ambiguity error', 'gfx::area converts 3.0 to (3, 0)'], answer: 1, explain: 'Unqualified lookup stops at the first scope that declares the name (gfx). The outer area(double) is hidden, and gfx::area(int,int) cannot take one argument → error. Qualify the call or add a using-declaration.' },
      hints: [
        R`<p>Hint 1: give each library its own namespace: <code>namespace geom { ... }</code> and <code>namespace gfx { ... }</code>. Your own code goes in a third, e.g. <code>namespace home</code>.</p>`,
        R`<p>Hint 2: call with qualified names. If a name is long, use an alias: <code>namespace g = geom;</code>. Inside a function you may write <code>using gfx::area;</code> to bring in just that one function.</p>`,
        R`<p>Hint 3: w·h up to 10<sup>10</sup> → <code>long long</code>, multiply as <code>1LL * w * h</code>. Use <code>std::numbers::pi</code> (C++20) and print with <code>fixed &lt;&lt; setprecision(2)</code>.</p>`
      ],
      solution: {
        approach: R`<p>Wrap each library in its own namespace; call through qualified names or an alias. The team's helper gets its own namespace and is found naturally via ADL because its parameter type lives there.</p>`,
        code: R`
#include <iomanip>
#include <iostream>
#include <numbers>   // std::numbers::pi (C++20)

namespace geom {                                     // library 1
    double area(double radius) { return std::numbers::pi * radius * radius; }
}
namespace gfx {                                      // library 2
    long long area(int width, int height) { return 1LL * width * height; }
}
namespace home {                                     // our own code
    struct Room { double w, h; };
    double area(const Room& r) { return r.w * r.h; }
}
namespace g = geom;                                  // alias for brevity

int main() {
    double r; int w, h;
    if (!(std::cin >> r >> w >> h)) return 1;
    std::cout << std::fixed << std::setprecision(2) << g::area(r) << ' ';
    std::cout << gfx::area(w, h) << '\n';

    home::Room kitchen{3.0, 4.0};
    double k = area(kitchen);                        // ADL: Room lives in 'home' -> home::area
    (void)k;                                         // 12.0
}`,
        dry: { head: ['call', 'lookup', 'resolved to', 'value (1 1920 1080)'], rows: [['g::area(r)', 'alias g → geom; qualified', 'geom::area(double)', '3.14'], ['gfx::area(w, h)', 'qualified in gfx', 'gfx::area(int,int)', '2073600'], ['area(kitchen)', 'unqualified + ADL (home)', 'home::area(const Room&amp;)', '12.00'], ['area(5) (hypothetical)', 'no area at global scope', '<span class="c-r">error: not declared</span>', '—']] },
        complexity: R`<p>O(1) time and memory. Namespaces have <b>zero</b> run-time cost — they only change names at compile/link time (mangling).</p>`,
        followUps: ['Put <code>geom</code> into its own header and source file pair', 'Add <code>inline namespace v2</code> to <code>gfx</code> with an updated <code>area</code> while keeping <code>gfx::v1::area</code> callable']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Platform Size Report',
    level: 'Easy', tags: ['sizeof', 'types', 'static_assert'], companies: ['Qualcomm', 'Arm', 'Samsung'],
    statement: R`<p>Write a program that prints one line per type in the format <code>name: N bytes</code> for <code>char</code>, <code>short</code>, <code>int</code>, <code>long</code>, <code>long long</code>, <code>float</code>, <code>double</code>, <code>void*</code> and <code>size_t</code>, followed by a final line <code>model: LP64</code>, <code>model: LLP64</code> or <code>model: ILP32</code> (other combinations: <code>model: other</code>). The program must also <b>refuse to compile</b> on a platform where <code>int</code> is smaller than 4 bytes.</p>`,
    constraints: R`No input. Must compile with any standard C++17/20 compiler.`,
    example: R`<p>On 64-bit Linux the last lines are <code>long: 8 bytes</code>, …, <span class="c-g">model: LP64</span>. On 64-bit Windows: <code>long: 4 bytes</code> and <span class="c-g">model: LLP64</span>. The difference is only <code>long</code> — which is why portable code avoids it.</p>`,
    brute: { why: R`<p>Hard-coding the table ("int: 4 bytes") is the naive approach: it is wrong on some platforms and silently lies. The other naive move is to assume the model from the OS name with <code>#ifdef _WIN32</code>, which breaks on 32-bit Windows and exotic targets.</p>`, code: R`
#include <iostream>
int main() {
    std::cout << "int: 4 bytes\nlong: 8 bytes\nmodel: LP64\n";   // guesses, not facts
}` },
    mcq: { q: 'Which data model has 32-bit <code>long</code> but 64-bit pointers?', options: ['LP64', 'LLP64', 'ILP32', 'ILP64'], answer: 1, explain: 'LLP64 (Windows 64-bit): only long long and pointers are 64-bit. LP64 (Linux/macOS) makes long 64-bit too; ILP32 has 32-bit pointers.' },
    hints: [
      R`<p>Hint 1: let the compiler tell you — <code>sizeof(T)</code> is evaluated at compile time and is always correct for the platform you build on.</p>`,
      R`<p>Hint 2: decide the model from <code>sizeof(long)</code> and <code>sizeof(void*)</code>: (8,8) → LP64, (4,8) → LLP64, (4,4) → ILP32.</p>`,
      R`<p>Hint 3: <code>static_assert(sizeof(int) &gt;= 4, "message");</code> stops the build with your message on unsupported platforms. A small helper function or macro keeps the printing tidy.</p>`
    ],
    solution: {
      approach: R`<p>Print <code>sizeof</code> for each type, derive the data model from the sizes of <code>long</code> and <code>void*</code>, and guard assumptions with <code>static_assert</code> so a wrong platform fails at build time instead of at run time.</p>`,
      code: R`
#include <cstddef>
#include <iostream>

static_assert(sizeof(int) >= 4, "this program needs int of at least 32 bits");

template <class T>
void report(const char* name) { std::cout << name << ": " << sizeof(T) << " bytes\n"; }

int main() {
    report<char>("char");
    report<short>("short");
    report<int>("int");
    report<long>("long");
    report<long long>("long long");
    report<float>("float");
    report<double>("double");
    report<void*>("void*");
    report<std::size_t>("size_t");

    const char* model = "other";
    if (sizeof(long) == 8 && sizeof(void*) == 8) model = "LP64";
    else if (sizeof(long) == 4 && sizeof(void*) == 8) model = "LLP64";
    else if (sizeof(long) == 4 && sizeof(void*) == 4 && sizeof(int) == 4) model = "ILP32";
    std::cout << "model: " << model << '\n';
}`,
      complexity: R`<p>O(1). All <code>sizeof</code> values are compile-time constants; the <code>if</code> chain is folded away by the optimizer.</p>`,
      followUps: ['Also print <code>numeric_limits&lt;T&gt;::max()</code> for each integer type', 'Print whether plain <code>char</code> is signed on this platform']
    }
  });

  practice.push({
    title: 'Celsius to Fahrenheit: the Integer Division Trap',
    level: 'Easy', tags: ['integer division', 'types', 'formatting'], companies: ['TCS', 'Infosys', 'Accenture'],
    statement: R`<p>Read an integer temperature <code>C</code> in Celsius and print the Fahrenheit value <code>F = C × 9 / 5 + 32</code> with exactly <b>one</b> digit after the decimal point.</p>`,
    constraints: R`−10<sup>6</sup> ≤ C ≤ 10<sup>6</sup>.`,
    example: R`<p><code>37</code> → <span class="c-g">98.6</span>. The buggy integer version prints <span class="c-r">98</span> (37 × 9 = 333, 333 / 5 = 66 truncated, + 32 = 98). The even buggier <code>9 / 5 * C + 32</code> prints <span class="c-r">69</span>, because <code>9 / 5</code> is 1 in integer arithmetic.</p>`,
    brute: { why: R`<p>All operands are <code>int</code>, so every <code>/</code> is integer division and throws away the fraction. Writing <code>9 / 5</code> first is the worst version: it becomes <code>1</code> before C is even involved.</p>`, code: R`
#include <iostream>
int main() {
    int c; std::cin >> c;
    int f = 9 / 5 * c + 32;          // 9/5 == 1  -> f = c + 32
    std::cout << f << '\n';
}` },
    mcq: { q: 'Which expression gives 98.6 for C = 37?', options: ['<code>c * 9 / 5 + 32</code>', '<code>9 / 5 * c + 32</code>', '<code>c * 9.0 / 5 + 32</code>', '<code>(double)(c * 9 / 5) + 32</code>'], answer: 2, explain: 'Making one operand a double (9.0) turns the multiplication and division into floating-point arithmetic. Casting after the integer division is too late.' },
    hints: [
      R`<p>Hint 1: the type of <code>a / b</code> depends only on the types of <code>a</code> and <code>b</code>. Two ints → integer division, fraction lost.</p>`,
      R`<p>Hint 2: promote early: <code>c * 9.0 / 5 + 32</code> or <code>static_cast&lt;double&gt;(c) * 9 / 5 + 32</code>.</p>`,
      R`<p>Hint 3: print with <code>std::fixed &lt;&lt; std::setprecision(1)</code> (or <code>std::format("{:.1f}", f)</code>). Check a negative input: −40 → −40.0.</p>`
    ],
    solution: {
      approach: R`<p>Convert to <code>double</code> <i>before</i> dividing, then format with one decimal.</p>`,
      code: R`
#include <iomanip>
#include <iostream>
int main() {
    long long c;
    if (!(std::cin >> c)) return 1;
    double f = static_cast<double>(c) * 9.0 / 5.0 + 32.0;
    std::cout << std::fixed << std::setprecision(1) << f << '\n';   // 37 -> 98.6, -40 -> -40.0
}`,
      dry: { head: ['C', 'c*9/5+32 (int)', '9/5*c+32 (int)', 'double version'], rows: [['37', '98', '69', '98.6'], ['-40', '-40', '-8', '-40.0'], ['1', '33', '33', '33.8']] },
      complexity: R`<p>O(1) time and memory: one multiplication, one division and one addition in double precision.</p>`,
      followUps: ['Round to the nearest integer instead (std::lround)', 'Convert a whole table from −40 to 100 in steps of 10']
    }
  });

  practice.push({
    title: 'Greeting with a Full Name (the getline trap)',
    level: 'Easy', tags: ['cin', 'getline', 'whitespace'], companies: ['Wipro', 'Cognizant', 'Zoho'],
    statement: R`<p>The first line contains an integer <code>age</code>. The second line contains a person's full name, which may contain spaces. Print <code>Hello, NAME! Next year you will be AGE+1.</code></p>`,
    constraints: R`1 ≤ age ≤ 150; the name has 1..100 characters and may contain spaces (no leading spaces).`,
    example: R`<p>Input:<br><code>29</code><br><code>Grace Brewster Hopper</code><br>Output: <span class="c-g">Hello, Grace Brewster Hopper! Next year you will be 30.</span><br>The buggy version prints <span class="c-r">Hello, ! Next year you will be 30.</span></p>`,
    brute: { why: R`<p>Two classic mistakes: (1) <code>cin &gt;&gt; name</code> stops at the first space ("Grace"); (2) switching to <code>getline</code> right after <code>cin &gt;&gt; age</code> reads the leftover newline and returns an <b>empty</b> name.</p>`, code: R`
#include <iostream>
#include <string>
int main() {
    int age; std::string name;
    std::cin >> age;
    std::getline(std::cin, name);      // reads the '\n' left by >> : name == ""
    std::cout << "Hello, " << name << "! Next year you will be " << age + 1 << ".\n";
}` },
    mcq: { q: 'After <code>cin &gt;&gt; age;</code>, what is the first character left in the buffer for input "29⏎Grace…"?', options: ['<code>G</code>', '<code>\'\\n\'</code>', '<code>9</code>', 'Nothing; the buffer is empty'], answer: 1, explain: '>> stops reading the int at the first non-digit and leaves it in the buffer — the newline from pressing Enter.' },
    hints: [
      R`<p>Hint 1: draw the buffer: <code>2 9 ⏎ G r a c e …</code>. Track what each read consumes.</p>`,
      R`<p>Hint 2: before <code>getline</code>, discard the leftover whitespace with <code>std::cin &gt;&gt; std::ws</code> (or <code>cin.ignore(numeric_limits&lt;streamsize&gt;::max(), '\n')</code>).</p>`,
      R`<p>Hint 3: names from Windows files may end with <code>'\r'</code>; strip it with <code>if (!name.empty() &amp;&amp; name.back() == '\r') name.pop_back();</code>.</p>`
    ],
    solution: {
      approach: R`<p>Read the int with <code>&gt;&gt;</code>, skip the leftover newline with <code>std::ws</code>, then read the full line with <code>getline</code>.</p>`,
      code: R`
#include <iostream>
#include <string>
int main() {
    int age;
    std::string name;
    if (!(std::cin >> age)) return 1;
    std::cin >> std::ws;                         // drop the '\n' (and any blanks)
    std::getline(std::cin, name);
    if (!name.empty() && name.back() == '\r') name.pop_back();   // Windows line endings
    std::cout << "Hello, " << name << "! Next year you will be " << age + 1 << ".\n";
}`,
      dry: { head: ['step', 'buffer front', 'variable'], rows: [['cin >> age', '29⏎Grace…', 'age = 29 (⏎ left)'], ['cin >> ws', '⏎Grace…', 'skips ⏎'], ['getline', 'Grace Brewster Hopper⏎', 'name = "Grace Brewster Hopper"']] },
      complexity: R`<p>O(length of input) time; O(length of the name) memory for the string.</p>`,
      followUps: ['Read T such (age, name) pairs', 'What changes if the name line could legitimately start with spaces? (use ignore up to newline instead of ws)']
    }
  });

  practice.push({
    title: 'Count Odd Numbers (including negatives)',
    level: 'Easy', tags: ['modulo', 'negative numbers'], companies: ['Amazon', 'Paytm'],
    statement: R`<p>Read <code>N</code> and then <code>N</code> integers (which may be negative). Print how many of them are <b>odd</b>.</p>`,
    constraints: R`1 ≤ N ≤ 2·10<sup>5</sup>; −10<sup>9</sup> ≤ a<sub>i</sub> ≤ 10<sup>9</sup>.`,
    example: R`<p>Input <code>5</code> / <code>3 -3 4 -7 0</code> → output <span class="c-g">3</span> (3, −3, −7). The buggy version prints <span class="c-r">1</span>: in C++ <code>-3 % 2 == -1</code>, not 1.</p>`,
    brute: { why: R`<p>The check <code>x % 2 == 1</code> is borrowed from Python, where <code>%</code> follows the sign of the divisor. In C++, the remainder takes the sign of the <b>dividend</b>, so negative odd numbers give −1 and are missed.</p>`, code: R`
#include <iostream>
int main() {
    int n; std::cin >> n;
    int odd = 0;
    for (int i = 0; i < n; ++i) { int x; std::cin >> x; if (x % 2 == 1) ++odd; }   // misses negatives
    std::cout << odd << '\n';
}` },
    mcq: { q: 'What is <code>-7 % 2</code> in C++?', options: ['1', '-1', '0', 'Undefined'], answer: 1, explain: 'Since C++11 integer division truncates toward zero: -7 / 2 == -3, and -7 % 2 == -7 - (-3 * 2) == -1.' },
    hints: [
      R`<p>Hint 1: compute <code>-3 / 2</code> and <code>-3 % 2</code> by the C++ rule (truncate toward zero) — you get −1 and −1.</p>`,
      R`<p>Hint 2: test against zero instead: <code>x % 2 != 0</code>. Or use the lowest bit: <code>(x &amp; 1) != 0</code>, which works for negatives in two's complement.</p>`,
      R`<p>Hint 3: Recipe: fast I/O; read N; loop reading x; if x % 2 != 0 → ++count; print count.</p>`
    ],
    solution: {
      approach: R`<p>An integer is odd exactly when its remainder by 2 is <b>non-zero</b>, whatever its sign.</p>`,
      code: R`
#include <iostream>
int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n;
    if (!(std::cin >> n)) return 0;
    int odd = 0;
    for (int i = 0; i < n; ++i) {
        long long x;
        std::cin >> x;
        if (x % 2 != 0) ++odd;          // correct for negative numbers too
    }
    std::cout << odd << '\n';
}`,
      dry: { head: ['x', 'x % 2', '== 1 ?', '!= 0 ?'], rows: [['3', '1', 'yes', 'yes'], ['-3', '-1', '<span class="c-r">no</span>', '<span class="c-g">yes</span>'], ['4', '0', 'no', 'no'], ['-7', '-1', '<span class="c-r">no</span>', '<span class="c-g">yes</span>'], ['0', '0', 'no', 'no']] },
      complexity: R`<p>O(N) time, O(1) memory.</p>`,
      followUps: ['Implement Python-style modulo ((x % m) + m) % m and explain when you need it', 'Count numbers divisible by k for negative k']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Safe Addition: Detect 32-bit Overflow',
    level: 'Medium', tags: ['overflow', 'signed', 'INT_MAX'], companies: ['Google', 'Microsoft', 'Nvidia'],
    statement: R`<p>Each of <code>Q</code> queries gives two 32-bit signed integers <code>a</code> and <code>b</code>. Print <code>a + b</code> if it fits in a 32-bit signed <code>int</code>, otherwise print <code>OVERFLOW</code>. Do it <b>without</b> ever executing an overflowing <code>int</code> operation.</p>`,
    constraints: R`1 ≤ Q ≤ 10<sup>5</sup>; −2<sup>31</sup> ≤ a, b ≤ 2<sup>31</sup> − 1.`,
    example: R`<p><code>2147483647 1</code> → <span class="c-r">OVERFLOW</span>. <code>-2147483648 -1</code> → <span class="c-r">OVERFLOW</span>. <code>2147483647 -1</code> → <span class="c-g">2147483646</span>. <code>-5 3</code> → <span class="c-g">-2</span>.</p>`,
    brute: { why: R`<p>Adding first and checking afterwards (<code>if (a &gt; 0 &amp;&amp; b &gt; 0 &amp;&amp; s &lt; 0)</code>) relies on wrap-around, but signed overflow is <b>undefined behavior</b>; optimizers may delete the check. It "works" at <code>-O0</code> and fails at <code>-O2</code>.</p>`, code: R`
#include <iostream>
int main() {
    int q; std::cin >> q;
    while (q--) {
        int a, b; std::cin >> a >> b;
        int s = a + b;                                        // UB when it overflows
        if ((a > 0 && b > 0 && s < 0) || (a < 0 && b < 0 && s >= 0)) std::cout << "OVERFLOW\n";
        else std::cout << s << '\n';
    }
}` },
    mcq: { q: 'For b &gt; 0, which test detects that <code>a + b</code> would overflow, using only safe operations?', options: ['<code>a + b &lt; a</code>', '<code>a &gt; INT_MAX - b</code>', '<code>a &gt; INT_MAX + b</code>', '<code>a * b &gt; INT_MAX</code>'], answer: 1, explain: 'INT_MAX − b cannot overflow when b > 0, and a + b > INT_MAX ⇔ a > INT_MAX − b.' },
    hints: [
      R`<p>Hint 1: move the dangerous addition to the other side of the inequality: a + b &gt; MAX ⇔ a &gt; MAX − b.</p>`,
      R`<p>Hint 2: two cases: b &gt; 0 (check the top: <code>a &gt; INT_MAX - b</code>), b &lt; 0 (check the bottom: <code>a &lt; INT_MIN - b</code>). b == 0 never overflows.</p>`,
      R`<p>Hint 3: alternatives: compute in <code>long long</code> and compare with the limits (simple and fast), or <code>__builtin_add_overflow(a, b, &amp;res)</code>.</p>`
    ],
    solution: {
      approach: R`<p>Pre-check with rearranged inequalities so that no intermediate value leaves the int range. Shown alongside: the builtin version.</p>`,
      code: R`
#include <climits>
#include <iostream>

bool addOverflows(int a, int b) {
    if (b > 0) return a > INT_MAX - b;     // would exceed the top
    if (b < 0) return a < INT_MIN - b;     // would go below the bottom
    return false;
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int q;
    if (!(std::cin >> q)) return 0;
    while (q--) {
        int a, b;
        std::cin >> a >> b;
        if (addOverflows(a, b)) std::cout << "OVERFLOW\n";
        else std::cout << a + b << '\n';   // safe now
    }
}`,
      alt: [{ lang: 'cpp', title: 'GCC/Clang builtin', code: R`
#include <iostream>
int main() {
    int a = 2147483647, b = 1, r;
    if (__builtin_add_overflow(a, b, &r)) std::cout << "OVERFLOW\n";
    else std::cout << r << '\n';
}` }],
      dry: { head: ['a', 'b', 'check', 'output'], rows: [['2147483647', '1', 'a &gt; 2147483646 → true', 'OVERFLOW'], ['-2147483648', '-1', 'a &lt; -2147483647 → true', 'OVERFLOW'], ['2147483647', '-1', 'a &lt; INT_MIN+1 → false', '2147483646'], ['-5', '3', 'a &gt; INT_MAX-3 → false', '-2']] },
      complexity: R`<p>O(1) per query, O(Q) total.</p>`,
      followUps: ['Do the same for subtraction (careful: −INT_MIN overflows)', 'Saturating addition: clamp to INT_MAX / INT_MIN instead of reporting']
    }
  });

  practice.push({
    title: 'Overflow-free Floor Average of Two Ints',
    level: 'Medium', tags: ['bit manipulation', 'overflow', 'two\'s complement'], companies: ['Apple', 'Jane Street', 'Citadel'],
    statement: R`<p>Given two 32-bit signed integers <code>a</code> and <code>b</code>, print ⌊(a + b) / 2⌋ (the mathematical floor, so ⌊−1.5⌋ = −2). You may <b>not</b> use any type wider than 32 bits.</p>`,
    constraints: R`−2<sup>31</sup> ≤ a, b ≤ 2<sup>31</sup> − 1.`,
    example: R`<p><code>2147483647 2147483645</code> → <span class="c-g">2147483646</span> (a + b would overflow!). <code>-3 0</code> → <span class="c-g">-2</span> (note: <code>(a + b) / 2</code> in C++ gives −1 because division truncates toward zero). <code>5 6</code> → <span class="c-g">5</span>.</p>`,
    brute: { why: R`<p><code>(a + b) / 2</code> fails twice: the sum overflows for large values (UB), and truncation toward zero gives the wrong answer for negative odd sums. <code>a + (b - a) / 2</code> fixes the overflow only when a and b have the same sign (<code>b - a</code> can overflow too).</p>`, code: R`
#include <iostream>
int main() {
    int a, b; std::cin >> a >> b;
    std::cout << (a + b) / 2 << '\n';      // overflow + wrong rounding for negatives
}` },
    mcq: { q: 'Why does <code>(a &amp; b) + ((a ^ b) &gt;&gt; 1)</code> equal ⌊(a + b) / 2⌋?', options: ['Because &amp; and ^ are faster than +', 'Because a + b = 2·(a &amp; b) + (a ^ b): common bits counted twice, differing bits once; halving gives (a &amp; b) + (a ^ b)/2', 'It only works for positive numbers', 'Because &gt;&gt; rounds up'], answer: 1, explain: 'Binary addition splits into carries (a & b, which shift left) and partial sums (a ^ b). Halving the total gives (a & b) + (a ^ b) / 2, and an arithmetic right shift is exactly floor division by 2 (guaranteed since C++20).' },
    hints: [
      R`<p>Hint 1: a + b = 2·(a &amp; b) + (a ^ b). Write out 6 + 5 in binary to convince yourself.</p>`,
      R`<p>Hint 2: divide both parts by 2: (a &amp; b) is exact; (a ^ b) / 2 must be <b>floored</b> — a right shift does that, also for negatives (arithmetic shift, defined since C++20).</p>`,
      R`<p>Hint 3: the result always lies between a and b, so the final addition cannot overflow. Note <code>std::midpoint(a, b)</code> rounds toward <code>a</code>, not down — different spec.</p>`
    ],
    solution: {
      approach: R`<p>Use the carry/partial-sum decomposition of addition: <code>(a &amp; b) + ((a ^ b) &gt;&gt; 1)</code>. No intermediate exceeds 32 bits and the arithmetic shift floors correctly.</p>`,
      code: R`
#include <iostream>

int floorAverage(int a, int b) {
    return (a & b) + ((a ^ b) >> 1);   // >> on negative int: arithmetic shift (C++20) = floor(x/2)
}

int main() {
    int a, b;
    if (!(std::cin >> a >> b)) return 1;
    std::cout << floorAverage(a, b) << '\n';
}`,
      dry: { head: ['a', 'b', 'a &amp; b', 'a ^ b', '(a^b) &gt;&gt; 1', 'answer'], rows: [['5', '6', '4', '3', '1', '5'], ['-3', '0', '0', '-3', '-2', '-2'], ['-1', '-2', '-2', '1', '0', '-2'], ['2147483647', '2147483645', '2147483645', '2', '1', '2147483646']] },
      complexity: R`<p>O(1); three bit operations and one addition.</p>`,
      followUps: ['Compute the ceiling average without overflow: (a | b) − ((a ^ b) &gt;&gt; 1)', 'Average of N ints without overflow (use long long or the quotient/remainder method)']
    }
  });

  practice.push({
    title: 'Adjacent Differences (the size() − 1 trap)',
    level: 'Medium', tags: ['unsigned', 'size_t', 'edge cases'], companies: ['Meta', 'Atlassian', 'Flipkart'],
    statement: R`<p>Read <code>N</code> and an array of <code>N</code> integers. Print the <code>N − 1</code> adjacent differences <code>a[i+1] − a[i]</code> on one line, separated by spaces. If <code>N &lt; 2</code>, print an empty line. Your loop must be correct for <code>N = 0</code> and <code>N = 1</code>.</p>`,
    constraints: R`0 ≤ N ≤ 2·10<sup>5</sup>; |a<sub>i</sub>| ≤ 2·10<sup>9</sup> (differences reach 4·10<sup>9</sup>).`,
    example: R`<p><code>4</code> / <code>1 4 9 16</code> → <span class="c-g">3 5 7</span>. <code>0</code> → (empty line). The buggy loop <code>for (size_t i = 0; i &lt; v.size() - 1; ++i)</code> crashes for N = 0: <code>0 − 1</code> wraps to 18446744073709551615.</p>`,
    brute: { why: R`<p>Two bugs hide in the naive code: <code>v.size() - 1</code> wraps around for an empty vector (unsigned arithmetic), so the loop reads far out of bounds; and <code>int</code> differences overflow because |a<sub>i</sub>| ≤ 2·10<sup>9</sup> means a difference can be 4·10<sup>9</sup>.</p>`, code: R`
#include <iostream>
#include <vector>
int main() {
    std::size_t n; std::cin >> n;
    std::vector<int> v(n);
    for (auto& x : v) std::cin >> x;
    for (std::size_t i = 0; i < v.size() - 1; ++i)       // n == 0: limit is 2^64-1 -> out of bounds
        std::cout << v[i + 1] - v[i] << ' ';             // int overflow for large values
    std::cout << '\n';
}` },
    mcq: { q: 'What is <code>v.size() - 1</code> for an empty <code>std::vector</code> on a 64-bit system?', options: ['-1', '0', '18446744073709551615', 'It throws std::out_of_range'], answer: 2, explain: 'size() returns size_t (unsigned 64-bit). 0 − 1 wraps modulo 2^64 to the maximum value.' },
    hints: [
      R`<p>Hint 1: never subtract from an unsigned size in a loop condition. Rewrite <code>i &lt; size - 1</code> as <code>i + 1 &lt; size</code> — addition cannot wrap here.</p>`,
      R`<p>Hint 2: or convert once to a signed count: <code>long long n = std::ssize(v);</code> and loop <code>for (long long i = 0; i &lt; n - 1; ++i)</code>.</p>`,
      R`<p>Hint 3: store values and differences in <code>long long</code>. Print with spaces between items (no trailing-space issues if you print the separator before every item except the first).</p>`
    ],
    solution: {
      approach: R`<p>Use the condition <code>i + 1 &lt; v.size()</code>, which is correct for every size including 0, and compute differences in 64-bit.</p>`,
      code: R`
#include <iostream>
#include <vector>
int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    std::size_t n = 0;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;
    for (std::size_t i = 0; i + 1 < v.size(); ++i) {     // safe for n = 0 and n = 1
        if (i) std::cout << ' ';
        std::cout << v[i + 1] - v[i];
    }
    std::cout << '\n';
}`,
      alt: [{ lang: 'cpp', title: 'Using std::adjacent_difference', code: R`
#include <iostream>
#include <numeric>
#include <vector>
int main() {
    std::vector<long long> v{1, 4, 9, 16}, d(v.size());
    std::adjacent_difference(v.begin(), v.end(), d.begin());   // d[0] = v[0], d[i] = v[i] - v[i-1]
    for (std::size_t i = 1; i < d.size(); ++i) std::cout << d[i] << (i + 1 < d.size() ? ' ' : '\n');
}` }],
      dry: { head: ['n', 'v.size() - 1', 'i + 1 &lt; size, first check', 'iterations'], rows: [['0', '<span class="c-r">18446744073709551615</span>', '1 &lt; 0 → false', '0'], ['1', '0', '1 &lt; 1 → false', '0'], ['4', '3', '1 &lt; 4 → true', '3']] },
      complexity: R`<p>O(N) time, O(N) memory.</p>`,
      followUps: ['Print the array in reverse using a signed index', 'Find the maximum adjacent difference in one pass without storing the array']
    }
  });

  practice.push({
    title: 'Two\'s Complement Binary of a 32-bit Int',
    level: 'Medium', tags: ['two\'s complement', 'bitset', 'unsigned conversion'], companies: ['Intel', 'AMD', 'Texas Instruments'],
    statement: R`<p>For each of <code>T</code> signed 32-bit integers, print its 32-bit two's complement bit pattern, a space, and the value obtained by reading the same bits as an <b>unsigned</b> 32-bit integer.</p>`,
    constraints: R`1 ≤ T ≤ 10<sup>4</sup>; −2<sup>31</sup> ≤ x ≤ 2<sup>31</sup> − 1.`,
    example: R`<p><code>5</code> → <span class="c-g">00000000000000000000000000000101 5</span><br><code>-1</code> → <span class="c-g">11111111111111111111111111111111 4294967295</span><br><code>-2147483648</code> → <span class="c-g">10000000000000000000000000000000 2147483648</span></p>`,
    brute: { why: R`<p>The naive approach repeatedly does <code>x % 2</code> and <code>x / 2</code>. For negative numbers that produces −1 remainders and stops after a few steps, never showing the 1-bits of the two's complement form. Taking <code>abs(x)</code> first is UB for INT_MIN.</p>`, code: R`
#include <iostream>
#include <string>
int main() {
    int x; std::cin >> x;
    std::string bits;
    while (x != 0) { bits = char('0' + x % 2) + bits; x /= 2; }   // negative: '0' + (-1) -> '/'
    std::cout << bits << '\n';
}` },
    mcq: { q: 'What does <code>static_cast&lt;std::uint32_t&gt;(-1)</code> evaluate to?', options: ['1', '-1', '4294967295', 'Undefined behavior'], answer: 2, explain: 'Converting to an unsigned type is always defined: the value is taken modulo 2^32, so −1 becomes 2^32 − 1. The bit pattern is unchanged.' },
    hints: [
      R`<p>Hint 1: the bits are already there; you only need to stop the sign from getting in the way. Convert to <code>std::uint32_t</code> first — that conversion is well-defined and keeps the bit pattern.</p>`,
      R`<p>Hint 2: <code>std::bitset&lt;32&gt;(u)</code> prints 32 binary digits; or loop <code>for (int k = 31; k &gt;= 0; --k) out += ((u &gt;&gt; k) &amp; 1u) ? '1' : '0';</code></p>`,
      R`<p>Hint 3: shift the <b>unsigned</b> value, not the signed one, and use <code>1u</code> masks so every operand is unsigned. C++20 also offers <code>std::bit_cast</code> for same-size reinterpretation.</p>`
    ],
    solution: {
      approach: R`<p>Convert each value to <code>std::uint32_t</code> (modulo 2<sup>32</sup>, same bits), then print with <code>std::bitset&lt;32&gt;</code> and print the unsigned value itself.</p>`,
      code: R`
#include <bitset>
#include <cstdint>
#include <iostream>
int main() {
    int t;
    if (!(std::cin >> t)) return 0;
    while (t--) {
        std::int32_t x;
        std::cin >> x;
        auto u = static_cast<std::uint32_t>(x);          // well-defined, keeps the bits
        std::cout << std::bitset<32>(u) << ' ' << u << '\n';
    }
}`,
      dry: { head: ['x', 'u = (uint32_t)x', 'top bit', 'pattern (short)'], rows: [['5', '5', '0', '0…0101'], ['-1', '4294967295', '1', '1…1111'], ['-2147483648', '2147483648', '1', '10…000'], ['-5', '4294967291', '1', '1…1011']] },
      complexity: R`<p>O(32) per value → O(T).</p>`,
      followUps: ['Count the set bits with <code>std::popcount</code> (C++20)', 'Print the 8-bit pattern of a <code>signed char</code> using <code>std::bitset&lt;8&gt;</code>']
    }
  });

  practice.push({
    title: 'Range-Sum Queries with Heavy I/O',
    level: 'Medium', tags: ['fast I/O', 'prefix sums', 'long long'], companies: ['Codeforces-style', 'Google', 'Directi'],
    statement: R`<p>Read an array of <code>N</code> integers and then <code>Q</code> queries <code>l r</code> (1-indexed, inclusive). For each query print the sum <code>a[l] + … + a[r]</code> on its own line.</p>`,
    constraints: R`1 ≤ N, Q ≤ 10<sup>6</sup>; |a<sub>i</sub>| ≤ 10<sup>9</sup>; time limit 1 s. Input and output are each up to ~20 MB.`,
    example: R`<p>a = <code>3 -1 4 1 5</code>, queries <code>1 3</code>, <code>2 5</code>, <code>4 4</code> → <span class="c-g">6</span>, <span class="c-g">9</span>, <span class="c-g">1</span>. Prefix p = [0, 3, 2, 6, 7, 12]; sum(l..r) = p[r] − p[l−1], e.g. p[3] − p[0] = 6.</p>`,
    brute: { why: R`<p>The naive version loops from l to r for every query (up to 10<sup>12</sup> steps), keeps sums in <code>int</code> (10<sup>6</sup> × 10<sup>9</sup> overflows), and prints with <code>endl</code> (10<sup>6</sup> flushes). Each of the three alone can cause TLE or WA.</p>`, code: R`
#include <iostream>
#include <vector>
int main() {
    int n, q; std::cin >> n >> q;
    std::vector<int> a(n + 1);
    for (int i = 1; i <= n; ++i) std::cin >> a[i];
    while (q--) {
        int l, r; std::cin >> l >> r;
        int s = 0;
        for (int i = l; i <= r; ++i) s += a[i];      // O(N) per query, int overflow
        std::cout << s << std::endl;                  // flush per line
    }
}` },
    mcq: { q: 'Which change alone fixes the "1 million lines of output is slow" part?', options: ['Using <code>printf</code> together with <code>cout</code>', 'Replacing <code>endl</code> with <code>\'\\n\'</code> (plus untie/unsync)', 'Using <code>long long</code>', 'Adding <code>-O3</code>'], answer: 1, explain: 'endl forces a flush (system call) per line. Writing \'\\n\' lets the stream buffer many lines into one write.' },
    hints: [
      R`<p>Hint 1: precompute prefix sums p[i] = a[1] + … + a[i] once; each query is then p[r] − p[l−1] in O(1).</p>`,
      R`<p>Hint 2: |p[i]| ≤ 10<sup>6</sup> · 10<sup>9</sup> = 10<sup>15</sup> → <code>long long</code>.</p>`,
      R`<p>Hint 3: add the two fast-I/O lines and print with <code>'\n'</code>. For even more speed, build the output in a <code>std::string</code> and write it once.</p>`
    ],
    solution: {
      approach: R`<p>Prefix sums in 64-bit, O(1) per query, fast input, buffered output.</p>`,
      code: R`
#include <iostream>
#include <vector>
int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n, q;
    if (!(std::cin >> n >> q)) return 0;
    std::vector<long long> p(n + 1, 0);
    for (int i = 1; i <= n; ++i) { long long x; std::cin >> x; p[i] = p[i - 1] + x; }
    while (q--) {
        int l, r;
        std::cin >> l >> r;
        std::cout << p[r] - p[l - 1] << '\n';
    }
}`,
      dry: { head: ['query', 'p[r]', 'p[l-1]', 'answer'], rows: [['1 3', '6', '0', '6'], ['2 5', '12', '3', '9'], ['4 4', '7', '6', '1']] },
      complexity: R`<p>O(N + Q) time, O(N) memory. I/O dominates: with fast I/O this runs well under 1 s for 10<sup>6</sup> + 10<sup>6</sup>.</p>`,
      followUps: ['Support point updates too (Fenwick tree)', 'Answer queries modulo 10<sup>9</sup>+7 with negative numbers present']
    }
  });

  practice.push({
    title: 'Byte Order: Little-Endian vs Big-Endian Bytes',
    level: 'Medium', tags: ['endianness', 'bit shifts', 'uint32_t'], companies: ['Cisco', 'Juniper', 'Arista'],
    statement: R`<p>Read an unsigned 32-bit integer <code>v</code>. Print two lines: <code>LE: b0 b1 b2 b3</code> — the bytes as they are stored in memory on a little-endian machine (lowest address first) — and <code>BE: …</code> — network (big-endian) order. Print each byte as two uppercase hex digits. Your output must be the same on <b>any</b> machine.</p>`,
    constraints: R`0 ≤ v ≤ 4294967295.`,
    example: R`<p><code>305419896</code> (= 0x12345678) → <span class="c-g">LE: 78 56 34 12</span> and <span class="c-g">BE: 12 34 56 78</span>.</p>`,
    brute: { why: R`<p>The tempting approach reinterprets memory: <code>auto* p = reinterpret_cast&lt;unsigned char*&gt;(&amp;v)</code> and prints p[0..3]. That prints the <b>native</b> order, so the "LE" line is wrong on a big-endian machine — the output depends on the hardware instead of on the problem.</p>`, code: R`
#include <cstdint>
#include <cstdio>
int main() {
    std::uint32_t v; if (std::scanf("%u", &v) != 1) return 1;
    auto* p = reinterpret_cast<unsigned char*>(&v);           // native order, not portable
    std::printf("LE: %02X %02X %02X %02X\n", p[0], p[1], p[2], p[3]);
}` },
    mcq: { q: 'Which expression extracts byte k (k = 0 is least significant) portably?', options: ['<code>((unsigned char*)&amp;v)[k]</code>', '<code>(v &gt;&gt; (8 * k)) &amp; 0xFF</code>', '<code>v / 8 * k</code>', '<code>v &lt;&lt; (8 * k)</code>'], answer: 1, explain: 'Shifts and masks operate on the value, not on memory layout, so they give the same result on every architecture.' },
    hints: [
      R`<p>Hint 1: think in values, not memory: the least significant byte is <code>v &amp; 0xFF</code>, the next is <code>(v &gt;&gt; 8) &amp; 0xFF</code>, and so on.</p>`,
      R`<p>Hint 2: little-endian memory order = bytes 0,1,2,3 (least significant first); big-endian = 3,2,1,0.</p>`,
      R`<p>Hint 3: print with <code>std::format("{:02X}", b)</code> or <code>std::hex &lt;&lt; std::uppercase &lt;&lt; std::setw(2) &lt;&lt; std::setfill('0')</code> — cast bytes to <code>unsigned</code> so they are not printed as characters.</p>`
    ],
    solution: {
      approach: R`<p>Extract bytes with shifts and masks (portable), then print them in the two orders.</p>`,
      code: R`
#include <bit>        // std::endian (C++20)
#include <cstdint>
#include <format>
#include <iostream>
int main() {
    std::uint32_t v;
    if (!(std::cin >> v)) return 1;
    unsigned b[4];
    for (int k = 0; k < 4; ++k) b[k] = (v >> (8 * k)) & 0xFFu;   // b[0] = least significant
    std::cout << std::format("LE: {:02X} {:02X} {:02X} {:02X}\n", b[0], b[1], b[2], b[3]);
    std::cout << std::format("BE: {:02X} {:02X} {:02X} {:02X}\n", b[3], b[2], b[1], b[0]);
    std::cout << "this machine is " << (std::endian::native == std::endian::little ? "little" : "big") << "-endian\n";
}`,
      dry: { head: ['k', 'v &gt;&gt; 8k', '&amp; 0xFF'], rows: [['0', '0x12345678', '0x78'], ['1', '0x00123456', '0x56'], ['2', '0x00001234', '0x34'], ['3', '0x00000012', '0x12']] },
      complexity: R`<p>O(1): four shifts and masks, independent of the machine's byte order.</p>`,
      followUps: ['Implement <code>bswap32</code> with shifts; compare with C++23 <code>std::byteswap</code>', 'Serialize a struct of mixed-size integers into a big-endian byte vector']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'String to Integer (atoi) with 32-bit Clamping',
    level: 'Hard', tags: ['parsing', 'overflow', 'edge cases'], companies: ['Amazon', 'Microsoft', 'Bloomberg', 'Meta'],
    statement: R`<p>Implement <code>int myAtoi(const std::string&amp; s)</code>: skip leading spaces; read an optional <code>+</code> or <code>-</code>; read digits until the first non-digit; ignore the rest. If no digits were read, return 0. If the value is outside [−2<sup>31</sup>, 2<sup>31</sup> − 1], <b>clamp</b> it to the nearest limit. You may not use 64-bit integers or library conversion functions.</p>`,
    constraints: R`0 ≤ |s| ≤ 200; s contains letters, digits, spaces, <code>+</code>, <code>-</code>, <code>.</code>.`,
    example: R`<p><code>"   -42abc"</code> → <span class="c-g">-42</span>. <code>"4193 with words"</code> → <span class="c-g">4193</span>. <code>"words 987"</code> → <span class="c-g">0</span> (first non-space is not a digit or sign). <code>"-91283472332"</code> → <span class="c-g">-2147483648</span> (clamped). <code>"+-12"</code> → <span class="c-g">0</span>.</p>`,
    brute: { why: R`<p>The naive loop accumulates <code>ans = ans * 10 + d</code> in an <code>int</code> and checks for overflow afterwards — too late, the overflow was already undefined behavior. Applying the sign at the end also fails for −2147483648, whose magnitude 2147483648 does not fit in an int.</p>`, code: R`
#include <iostream>
#include <string>
int atoiBad(const std::string& s) {
    std::size_t i = 0;
    while (i < s.size() && s[i] == ' ') ++i;
    int sign = 1;
    if (i < s.size() && (s[i] == '+' || s[i] == '-')) sign = (s[i++] == '-') ? -1 : 1;
    int ans = 0;
    while (i < s.size() && s[i] >= '0' && s[i] <= '9')
        ans = ans * 10 + (s[i++] - '0');          // overflows for long inputs (UB)
    return sign * ans;                            // can never produce INT_MIN correctly
}
int main() { std::cout << atoiBad("   -42abc") << '\n'; }` },
    mcq: { q: 'Accumulating as a <b>negative</b> number (ans = ans·10 − d) is a known trick. Why?', options: ['It is faster', 'The negative range is one larger, so −2147483648 can be built without overflow', 'Negative numbers cannot overflow', 'It avoids checking the sign'], answer: 1, explain: 'INT_MIN has no positive counterpart. Building the value in the negative range covers every representable result; flip the sign at the end only if it fits (and clamp otherwise).' },
    hints: [
      R`<p>Hint 1: split the work into phases: spaces → sign → digits. Write each as a tiny loop with an index <code>i</code> that only moves forward.</p>`,
      R`<p>Hint 2: before pushing digit d, check: positive case <code>ans &gt; (INT_MAX - d) / 10</code> → clamp to INT_MAX; negative case <code>ans &lt; (INT_MIN + d) / 10</code> → clamp to INT_MIN, where you accumulate negative numbers as <code>ans * 10 - d</code>.</p>`,
      R`<p>Hint 3: edge cases to test: "", "   ", "+", "-", "+-12", "00000123", "2147483647", "2147483648", "-2147483648", "-2147483649", "  0000000000012345678".</p>`
    ],
    solution: {
      approach: R`<p>Three phases with a moving index. Accumulate in the sign's direction (positive with <code>+d</code>, negative with <code>−d</code>) and check against the limit <b>before</b> each step using division-based inequalities, so no operation can overflow.</p>`,
      code: R`
#include <climits>
#include <iostream>
#include <string>

int myAtoi(const std::string& s) {
    std::size_t i = 0, n = s.size();
    while (i < n && s[i] == ' ') ++i;                           // 1. leading spaces
    bool neg = false;
    if (i < n && (s[i] == '+' || s[i] == '-')) neg = (s[i++] == '-');   // 2. optional sign
    int ans = 0;
    for (; i < n && s[i] >= '0' && s[i] <= '9'; ++i) {          // 3. digits
        int d = s[i] - '0';
        if (!neg) {
            if (ans > (INT_MAX - d) / 10) return INT_MAX;       // ans*10 + d would exceed INT_MAX
            ans = ans * 10 + d;
        } else {
            if (ans < (INT_MIN + d) / 10) return INT_MIN;       // ans*10 - d would go below INT_MIN
            ans = ans * 10 - d;
        }
    }
    return ans;
}

int main() {
    for (const char* t : {"   -42abc", "4193 with words", "words 987", "-91283472332",
                          "2147483647", "2147483648", "-2147483648", "+-12", ""})
        std::cout << '"' << t << "\" -> " << myAtoi(t) << '\n';
}`,
      dry: { head: ['input', 'after spaces/sign', 'digits read', 'check', 'result'], rows: [['"   -42abc"', 'neg, "42abc"', '4, 2', 'fine', '-42'], ['"2147483648"', 'pos', '214748364 then 8', '214748364 &gt; (2147483647−8)/10 = 214748363 → clamp', '2147483647'], ['"-2147483648"', 'neg', '…then 8', '-214748364 &lt; (INT_MIN+8)/10 = -214748364? no', '-2147483648'], ['"+-12"', 'pos, "-12"', 'none', '—', '0']] },
      complexity: R`<p>O(|s|) time, O(1) memory.</p>`,
      followUps: ['Return an error code instead of clamping (like std::from_chars)', 'Support hexadecimal input with a 0x prefix']
    }
  });

  practice.push({
    title: 'Multiply Modulo M with 64-bit Operands',
    level: 'Hard', tags: ['overflow', '__int128', 'modular arithmetic'], companies: ['Jane Street', 'Tower Research', 'Google'],
    statement: R`<p>For each query, read <code>a</code>, <code>b</code>, <code>m</code> and print <code>(a × b) mod m</code>. The product of two 60-bit numbers needs 120 bits, so plain <code>long long</code> multiplication overflows. Provide a solution using <code>unsigned __int128</code> <b>and</b> one that uses only 64-bit arithmetic.</p>`,
    constraints: R`1 ≤ Q ≤ 10<sup>5</sup>; 0 ≤ a, b &lt; 10<sup>18</sup>; 1 ≤ m ≤ 10<sup>18</sup>.`,
    example: R`<p><code>123456789012345678 987654321098765432 1000000000000000007</code> → <span class="c-g">the exact residue</span> (computed with 128-bit arithmetic). Small check: <code>7 8 5</code> → 56 mod 5 = <span class="c-g">1</span>. The naive <code>a * b % m</code> silently prints garbage for the big case.</p>`,
    brute: { why: R`<p><code>a * b</code> with 10<sup>18</sup>-sized operands reaches 10<sup>36</sup>, far beyond <code>long long</code>'s 9.2·10<sup>18</sup>: signed overflow → undefined behavior; with <code>unsigned long long</code> it wraps mod 2<sup>64</sup>, which is defined but gives the wrong residue.</p>`, code: R`
#include <iostream>
int main() {
    long long a, b, m;
    std::cin >> a >> b >> m;
    std::cout << a * b % m << '\n';      // overflow for large a, b
}` },
    mcq: { q: 'In the 64-bit-only "double-and-add" method, why is <code>(res + a) % m</code> safe when res, a &lt; m ≤ 10<sup>18</sup>?', options: ['Because % prevents overflow', 'Because res + a &lt; 2·10<sup>18</sup> &lt; 2<sup>63</sup> ≈ 9.22·10<sup>18</sup>', 'Because the compiler promotes to 128 bits', 'It is not safe'], answer: 1, explain: 'Each operand is already reduced below m, so their sum is below 2m ≤ 2·10^18, which fits comfortably in a signed or unsigned 64-bit integer.' },
    hints: [
      R`<p>Hint 1: the simplest fix is a wider type: <code>(unsigned __int128)a * b % m</code>. GCC and Clang support <code>__int128</code> on 64-bit targets (MSVC does not).</p>`,
      R`<p>Hint 2: without 128-bit types, use binary multiplication: a·b = a·(bits of b). Walk the bits of b; keep <code>res</code> and a "doubling" <code>a</code>, both reduced mod m after each addition.</p>`,
      R`<p>Hint 3: Recipe: a %= m; res = 0; while b: if b &amp; 1 → res = (res + a) % m; a = (a + a) % m; b &gt;&gt;= 1. That is O(log b) ≈ 60 steps, all sums &lt; 2m.</p>`
    ],
    solution: {
      approach: R`<p>Primary: widen to 128 bits for the product, reduce, narrow back. Portable alternative: Russian-peasant (double-and-add) multiplication with modular reduction at every step so no intermediate exceeds 2m.</p>`,
      code: R`
#include <cstdint>
#include <iostream>

using u64 = std::uint64_t;

u64 mulmod128(u64 a, u64 b, u64 m) {
    return static_cast<u64>(static_cast<unsigned __int128>(a) * b % m);   // GCC/Clang extension
}

u64 mulmodPortable(u64 a, u64 b, u64 m) {
    a %= m;
    u64 res = 0;
    while (b > 0) {
        if (b & 1) res = (res + a) % m;   // res, a < m <= 1e18 -> sum < 2e18: fits
        a = (a + a) % m;                  // double a
        b >>= 1;
    }
    return res;
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int q;
    if (!(std::cin >> q)) return 0;
    while (q--) {
        u64 a, b, m;
        std::cin >> a >> b >> m;
        u64 r1 = mulmod128(a, b, m), r2 = mulmodPortable(a, b, m);
        std::cout << r1 << (r1 == r2 ? "" : " MISMATCH") << '\n';
    }
}`,
      dry: { head: ['b (binary)', 'bit', 'res', 'a (doubled) mod 5'], rows: [['1000 (8)', '0', '0', '7%5=2 → 4'], ['100', '0', '0', '4 → 3'], ['10', '0', '0', '3 → 1'], ['1', '1', '(0+1)%5 = 1', '1 → 2'], ['0', 'stop', '<span class="c-g">1 = 56 mod 5</span>', '—']] },
      complexity: R`<p>128-bit version: O(1) per query (one multiply + one 128-bit division, which compiles to a library call). Portable version: O(log b) ≈ 60 iterations with two <code>%</code> each.</p>`,
      followUps: ['Use it for fast modular exponentiation with a 64-bit modulus (needed in Miller–Rabin)', 'Montgomery multiplication: avoiding division entirely']
    }
  });

  practice.push({
    title: 'Blazing Input: Sum 10^7 Integers in Under a Second',
    level: 'Hard', tags: ['fast I/O', 'fread', 'parsing'], companies: ['HFT firms', 'Codeforces-style', 'Google'],
    statement: R`<p>The input is a single integer <code>N</code> followed by <code>N</code> integers (possibly negative), separated by arbitrary whitespace. Print their sum. <code>N</code> can be 10<sup>7</sup> (~110 MB of text), and the time limit is tight enough that even unsynced <code>cin</code> is borderline. Write a custom buffered reader.</p>`,
    constraints: R`1 ≤ N ≤ 10<sup>7</sup>; |a<sub>i</sub>| ≤ 10<sup>9</sup>; the sum fits in <code>long long</code>.`,
    example: R`<p>Input <code>5</code> / <code>1 -2 3 -4 5</code> → <span class="c-g">3</span>. The reader skips spaces/newlines, handles the leading <code>-</code>, and accumulates digits as <code>v = v * 10 + (c - '0')</code>.</p>`,
    brute: { why: R`<p>Default <code>cin</code> (synchronized with stdio, tied to cout) does locale-aware formatting per number and can take several seconds for 10<sup>7</sup> values. <code>scanf("%lld")</code> is better but still parses the format string for every call.</p>`, code: R`
#include <iostream>
int main() {
    long long n, x, sum = 0;
    std::cin >> n;                                  // no fast-I/O setup
    for (long long i = 0; i < n; ++i) { std::cin >> x; sum += x; }
    std::cout << sum << std::endl;
}` },
    mcq: { q: 'Why does reading input in 64 KB chunks with <code>fread</code> beat calling <code>getchar()</code> per character?', options: ['fread uses a faster CPU instruction', 'It replaces millions of small function calls (with locking) by a few large reads and a tight loop over a local buffer', 'getchar reads from the network', 'fread decompresses input'], answer: 1, explain: 'Per-character library calls carry overhead (and thread-safety locks in getchar). A big block read followed by array indexing is cache-friendly and branch-predictable.' },
    hints: [
      R`<p>Hint 1: keep a static buffer (e.g. 1 &lt;&lt; 16 bytes), an index and a length. When the index reaches the length, refill with <code>fread</code>; length 0 means end of input.</p>`,
      R`<p>Hint 2: to read a number: skip anything that is not a digit or <code>'-'</code>; remember the sign; then loop while the char is a digit.</p>`,
      R`<p>Hint 3: make the functions <code>inline</code>/<code>static</code> so the compiler can inline them; avoid <code>std::isdigit</code> (locale lookups) — compare with <code>'0'</code> and <code>'9'</code>. Validate against the plain <code>cin</code> version on small tests.</p>`
    ],
    solution: {
      approach: R`<p>A minimal buffered scanner: refill a fixed buffer with <code>fread</code>, parse integers by hand. This is how top competitive programmers and log-processing tools read huge inputs.</p>`,
      code: R`
#include <cstdio>

namespace fastio {
    constexpr std::size_t kSize = 1 << 16;
    char buf[kSize];
    std::size_t len = 0, pos = 0;

    inline int get() {                       // next byte, or -1 at end of input
        if (pos == len) {
            len = std::fread(buf, 1, kSize, stdin);
            pos = 0;
            if (len == 0) return -1;
        }
        return static_cast<unsigned char>(buf[pos++]);
    }
    inline bool readInt(long long& out) {
        int c = get();
        while (c != -1 && c != '-' && (c < '0' || c > '9')) c = get();
        if (c == -1) return false;
        bool neg = false;
        if (c == '-') { neg = true; c = get(); }
        long long v = 0;
        while (c >= '0' && c <= '9') { v = v * 10 + (c - '0'); c = get(); }
        out = neg ? -v : v;
        return true;
    }
}

int main() {
    long long n = 0, x, sum = 0;
    if (!fastio::readInt(n)) return 0;
    for (long long i = 0; i < n && fastio::readInt(x); ++i) sum += x;
    std::printf("%lld\n", sum);
}`,
      dry: { head: ['bytes seen', 'state', 'v', 'sum'], rows: [['5⏎', 'read n', '5', '0'], ['1␣', 'number', '1', '1'], ['-2␣', 'neg number', '2 → -2', '-1'], ['3␣-4␣5⏎', 'three more numbers', '3, -4, 5', '<span class="c-g">3</span>']] },
      complexity: R`<p>O(input bytes) time with a tiny constant; O(64 KB) memory regardless of N.</p>`,
      followUps: ['Add a matching buffered writer (fill a char buffer, fwrite once)', 'Use mmap to map the whole input file into memory']
    }
  });

  practice.push({
    title: 'Detect 64-bit Multiplication Overflow Without Builtins',
    level: 'Hard', tags: ['overflow', 'signed', 'LLONG_MAX'], companies: ['Microsoft', 'Oracle', 'Two Sigma'],
    statement: R`<p>For each query with two signed 64-bit integers <code>a</code> and <code>b</code>, print <code>a × b</code> if it fits in <code>long long</code>, otherwise <code>OVERFLOW</code>. No 128-bit types, no compiler builtins, and no overflowing operation may ever execute (also not in the check).</p>`,
    constraints: R`1 ≤ Q ≤ 10<sup>5</sup>; −2<sup>63</sup> ≤ a, b ≤ 2<sup>63</sup> − 1.`,
    example: R`<p><code>3037000499 3037000499</code> → <span class="c-g">9223372030926249001</span> (just fits). <code>3037000500 3037000500</code> → <span class="c-r">OVERFLOW</span>. <code>-9223372036854775808 1</code> → <span class="c-g">-9223372036854775808</span>. <code>-9223372036854775808 -1</code> → <span class="c-r">OVERFLOW</span> (2<sup>63</sup> does not fit).</p>`,
    brute: { why: R`<p>The common trick "multiply, then check <code>p / b == a</code>" executes the overflowing multiplication first (UB), and the division itself can overflow for <code>LLONG_MIN / -1</code>. Using <code>abs()</code> on both operands breaks on <code>LLONG_MIN</code>.</p>`, code: R`
#include <iostream>
int main() {
    long long a, b; std::cin >> a >> b;
    long long p = a * b;                            // UB if it overflows
    if (a != 0 && p / a != b) std::cout << "OVERFLOW\n";   // too late, and LLONG_MIN / -1 is UB too
    else std::cout << p << '\n';
}` },
    mcq: { q: 'Both a and b are negative. Which check is correct and overflow-free?', options: ['<code>a * b &gt; LLONG_MAX</code>', '<code>b &lt; LLONG_MAX / a</code>', '<code>-a &gt; LLONG_MAX / -b</code>', '<code>abs(a) &gt; LLONG_MAX / abs(b)</code>'], answer: 1, explain: 'With a < 0, LLONG_MAX / a is a safe negative number; the product a·b exceeds LLONG_MAX exactly when b < LLONG_MAX / a. Negating a or b fails for LLONG_MIN.' },
    hints: [
      R`<p>Hint 1: split by signs into four cases. In each, compare one operand with a limit divided by the other — division by a non-zero value that cannot overflow.</p>`,
      R`<p>Hint 2: a&gt;0,b&gt;0: <code>a &gt; MAX/b</code>; a&gt;0,b≤0: <code>b &lt; MIN/a</code>; a≤0,b&gt;0: <code>a &lt; MIN/b</code>; a≤0,b≤0: <code>a != 0 &amp;&amp; b &lt; MAX/a</code>.</p>`,
      R`<p>Hint 3: none of these divisions is <code>MIN / -1</code>: in each case the divisor is positive, or the dividend is MAX. Test LLONG_MIN with 1, −1, 0, 2 and ±3037000500.</p>`
    ],
    solution: {
      approach: R`<p>The four-case sign analysis (as in the SEI CERT C rule INT32-C). Each comparison only divides a limit by a value whose sign is known, guaranteeing that the check itself is UB-free.</p>`,
      code: R`
#include <climits>
#include <iostream>

bool mulOverflows(long long a, long long b) {
    if (a > 0) {
        if (b > 0) return a > LLONG_MAX / b;      // + * +
        return b < LLONG_MIN / a;                 // + * (- or 0)
    }
    if (b > 0) return a < LLONG_MIN / b;          // (- or 0) * +
    return a != 0 && b < LLONG_MAX / a;           // (- or 0) * (- or 0)
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int q;
    if (!(std::cin >> q)) return 0;
    while (q--) {
        long long a, b;
        std::cin >> a >> b;
        if (mulOverflows(a, b)) std::cout << "OVERFLOW\n";
        else std::cout << a * b << '\n';          // proven safe
    }
}`,
      alt: [{ lang: 'cpp', title: 'Same check via the GCC/Clang builtin (for comparison)', code: R`
#include <iostream>
int main() {
    long long a = 3037000500LL, b = 3037000500LL, r;
    std::cout << (__builtin_mul_overflow(a, b, &r) ? "OVERFLOW" : std::to_string(r)) << '\n';
}` }],
      dry: { head: ['a', 'b', 'case', 'check', 'result'], rows: [['3037000499', '3037000499', '+,+', '3037000499 &gt; MAX/3037000499 = 3037000500? no', '9223372030926249001'], ['3037000500', '3037000500', '+,+', '3037000500 &gt; MAX/3037000500 = 3037000499? yes', 'OVERFLOW'], ['LLONG_MIN', '1', '−,+', 'MIN &lt; MIN/1? no', 'LLONG_MIN'], ['LLONG_MIN', '-1', '−,−', '-1 &lt; MAX/MIN = 0? yes', 'OVERFLOW']] },
      complexity: R`<p>O(1) per query: at most one division plus comparisons.</p>`,
      followUps: ['Saturating multiplication: return LLONG_MAX / LLONG_MIN with the correct sign', 'Check whether a^k overflows using repeated checks (fast exponentiation)']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: R`Which stage reports <code>undefined reference to 'parse(std::string const&amp;)'</code>?`, options: ['Preprocessor', 'Compiler', 'Assembler', 'Linker'], answer: 3, explain: R`"Undefined reference" means a symbol was used (U) but no object file or library defined it (T). Only the linker sees all object files, so only it can notice.` },
    { q: R`What does the compiler receive after preprocessing <code>#define TWICE(x) x + x</code> and <code>int r = 10 * TWICE(3);</code>?`, options: ['<code>int r = 10 * (3 + 3);</code>', '<code>int r = 10 * 3 + 3;</code>', '<code>int r = 60;</code>', 'A compile error'], answer: 1, explain: R`Macros substitute text without adding parentheses. The compiler then evaluates 10 * 3 + 3 = 33, not 60.` },
    { q: R`A header defines <code>int limit = 5;</code> (no <code>inline</code>, no <code>const</code>) and is included by <code>a.cpp</code> and <code>b.cpp</code>. What happens on <code>g++ a.cpp b.cpp</code>?`, options: ['Works; the linker merges them', 'Compile error: redefinition', 'Link error: multiple definition of <code>limit</code>', 'Each file silently gets its own copy'], answer: 2, explain: R`Each TU defines a strong external symbol <code>limit</code>; the ODR allows only one. Include guards do not help across TUs. Fix with <code>extern</code> + one definition, or <code>inline int limit = 5;</code>.` },
    { q: R`On 64-bit Windows (MSVC), what is <code>sizeof(long)</code>?`, options: ['2', '4', '8', '16'], answer: 1, explain: R`Windows uses the LLP64 data model: int and long are 32-bit; only long long and pointers are 64-bit. Linux/macOS (LP64) make long 64-bit.` },
    { q: R`What does <code>std::cout &lt;&lt; (-1 &lt; 1u);</code> print?`, options: ['1', '0', '-1', 'It does not compile'], answer: 1, explain: R`The usual arithmetic conversions convert -1 to unsigned (4294967295), which is not less than 1. Use std::cmp_less for a mathematically correct comparison.` },
    { q: R`Which of these is <b>undefined behavior</b>?`, options: ['<code>unsigned u = 0; u = u - 1;</code>', '<code>int x = INT_MAX; x = x + 1;</code>', '<code>unsigned char c = 300;</code>', '<code>int y = static_cast&lt;int&gt;(4000000000u);</code> (C++20)'], answer: 1, explain: R`Signed arithmetic overflow is UB. Unsigned arithmetic wraps (defined), conversions to unsigned are modulo 2^N (defined), and since C++20 conversions to signed are also defined modulo 2^N.` },
    { q: R`<code>int a = 100000, b = 100000; long long p = a * b;</code> — what is the problem?`, options: ['None; p is 10000000000', 'The multiplication is done in int and overflows before conversion', 'long long cannot hold 10^10', 'It is a compile error'], answer: 1, explain: R`The type of a * b depends on the operands (both int), not on the destination. Write 1LL * a * b or static_cast&lt;long long&gt;(a) * b.` },
    { q: R`Input is <code>25⏎Alan Turing⏎</code>. After <code>cin &gt;&gt; age; getline(cin, name);</code>, what is <code>name</code>?`, options: ['"Alan Turing"', '"Alan"', '"" (empty)', '"25"'], answer: 2, explain: R`&gt;&gt; leaves the newline in the buffer; getline reads up to that newline immediately and returns an empty string. Use cin &gt;&gt; ws first.` },
    { q: R`What do <code>std::ios::sync_with_stdio(false); std::cin.tie(nullptr);</code> do?`, options: ['Make cin read binary data', 'Stop syncing C++ streams with C stdio and stop flushing cout before each cin read', 'Disable all buffering', 'Enable multithreaded I/O'], answer: 1, explain: R`They remove two sources of overhead. Consequences: do not mix printf/scanf with cout/cin afterwards, and flush manually when output must appear before input (interactive problems).` },
    { q: R`Why is <code>std::endl</code> slower than <code>'\n'</code>?`, options: ['It writes two characters', 'It flushes the stream, typically causing a system call', 'It converts to Unicode', 'It is not slower'], answer: 1, explain: R`endl = newline + flush. Flushing per line turns one buffered write into thousands of OS calls for large outputs.` },
    { q: R`With <code>using namespace std;</code> at global scope and a global <code>int count = 0;</code>, what does <code>count++;</code> in <code>main</code> give?`, options: ['Increments the global', 'Calls std::count', 'error: reference to <code>count</code> is ambiguous', 'Undefined behavior'], answer: 2, explain: R`The using-directive makes std::count visible as if declared in the global namespace, next to ::count. Unqualified lookup finds two different entities at the same level → ambiguous.` },
    { q: R`What is the purpose of an unnamed namespace <code>namespace { ... }</code>?`, options: ['To make names globally visible', 'To give the names internal linkage: private to this translation unit', 'To speed up compilation', 'To create a namespace you can reopen elsewhere'], answer: 1, explain: R`Names in an unnamed namespace are unique to the TU, so other .cpp files cannot see them and no linker clash can happen. It is the modern replacement for file-scope static.` },
    { q: R`What does <code>cout &lt;&lt; -7 / 2 &lt;&lt; ' ' &lt;&lt; -7 % 2;</code> print?`, options: ['-4 1', '-3 -1', '-3 1', '-4 -1'], answer: 1, explain: R`C++ integer division truncates toward zero (-3.5 → -3), and the remainder satisfies (a/b)*b + a%b == a, giving -1.` },
    { q: R`Which statement about <code>main</code> is correct?`, options: ['<code>void main()</code> is valid C++', 'Falling off the end of main returns 0', 'You may call main recursively', 'argv[argc] is the last argument'], answer: 1, explain: R`main must return int; reaching its closing brace is equivalent to return 0. Calling main yourself is ill-formed, and argv[argc] is a null pointer.` },
    { q: R`Why must a function <b>template</b>'s body usually be in a header?`, options: ['Templates cannot be in .cpp files by rule', 'The compiler must see the body in every TU that instantiates it with new types', 'Headers compile faster', 'The linker cannot handle templates'], answer: 1, explain: R`A template is a recipe. The compiler generates code for maxOf&lt;int&gt; only where it sees both the recipe and the use. Otherwise you get undefined references (unless you add explicit instantiations).` }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: R`Walk me through what happens when you run <code>g++ main.cpp util.cpp -o app</code>.`, level: 'B', a: R`<p>The <code>g++</code> driver runs four stages per source file. (1) <b>Preprocessing</b>: <code>#include</code>s are pasted, macros expanded, <code>#if</code> blocks resolved — the result is a <b>translation unit</b>. (2) <b>Compilation</b>: the TU is parsed, type-checked and optimized into assembly. (3) <b>Assembly</b>: assembly becomes an object file (<code>.o</code>) with machine code, a symbol table (defined and undefined symbols, mangled names) and relocation entries. Each <code>.cpp</code> goes through 1–3 independently. (4) <b>Linking</b>: the linker combines all <code>.o</code> files plus libraries (libstdc++, libc), resolves every undefined symbol to exactly one definition, patches addresses and writes the executable. At run time the loader maps it, resolves shared libraries, runs static initializers, then calls <code>main</code>.</p>`, followUps: ['Which flags stop after each stage? (-E, -S, -c)', 'What is name mangling and why is it needed?', 'What does -flto change?'] },
    { q: R`What is the difference between a declaration and a definition? Give examples.`, level: 'B', a: R`<p>A <b>declaration</b> introduces a name and its type so the compiler can check uses of it: <code>int add(int, int);</code>, <code>extern int counter;</code>, <code>struct Node;</code>. A <b>definition</b> additionally provides the entity: a function body, storage for a variable, or the full member list of a class: <code>int add(int a, int b) { return a + b; }</code>, <code>int counter = 0;</code>. Every definition is also a declaration. You can declare something many times, but by the One Definition Rule a non-inline function or variable may be defined only once in the whole program, and a class only once per translation unit (identically across TUs). Headers therefore mostly hold declarations, class definitions, inline functions and templates.</p>`, followUps: ['Is <code>int x;</code> at namespace scope a declaration or a definition?', 'Why can you have a pointer to an incomplete type but not an object of it?'] },
    { q: R`What is the difference between a compile error and a link error? How do you debug an "undefined reference"?`, level: 'B', a: R`<p>A <b>compile error</b> comes from one translation unit: bad syntax, type mismatch, an undeclared name. A <b>link error</b> appears only when combining object files: a symbol is used but never defined (<i>undefined reference</i>), or defined more than once (<i>multiple definition</i>). To debug an undefined reference: (1) check the definition exists and its <b>signature matches exactly</b> (const, parameter types, namespace, class qualification like <code>Foo::bar</code>); (2) make sure the <code>.cpp</code> that defines it is compiled and passed to the linker (or the library is linked with <code>-l</code>, in the right order); (3) for templates, ensure the body is visible in the header; (4) for C functions called from C++, check <code>extern "C"</code>. <code>nm -C file.o</code> shows which symbols each object defines (T) and needs (U).</p>`, followUps: ['Why does link order matter with static libraries?', 'What is extern "C" for?'] },
    { q: R`Why do we need include guards or <code>#pragma once</code>? Do they prevent multiple-definition linker errors?`, level: 'B', a: R`<p>Headers are pasted textually. If two headers both include <code>point.h</code> and a <code>.cpp</code> includes both, <code>struct Point</code> appears twice in one translation unit → "redefinition" compile error. An include guard (<code>#ifndef X / #define X / #endif</code>) or <code>#pragma once</code> makes the second inclusion empty <b>within that TU</b>. They do <b>not</b> prevent multiple-definition <b>link</b> errors: each <code>.cpp</code> is a separate TU and gets its own copy. If the header contains a non-inline function body or variable definition, two TUs produce two strong symbols and the linker fails. Fix that with <code>inline</code>, <code>extern</code> + one definition, or moving the definition into a <code>.cpp</code>.</p>`, followUps: ['Pros and cons of #pragma once vs guards?', 'What does inline mean in modern C++?'] },
    { q: R`What sizes do the fundamental types have? What does the standard actually guarantee?`, level: 'B', a: R`<p>The standard guarantees <code>sizeof(char) == 1</code> and minimum widths: char ≥ 8 bits, short and int ≥ 16, long ≥ 32, long long ≥ 64, with <code>short ≤ int ≤ long ≤ long long</code> in size. In practice on 64-bit platforms: char 1, short 2, int 4, long long 8, float 4, double 8, pointers and size_t 8. <code>long</code> is 8 bytes on Linux/macOS (LP64) but 4 on Windows (LLP64). <code>long double</code> is 16 bytes (80-bit extended) on x86-64 Linux but 8 on MSVC. Whether <code>char</code> is signed is implementation-defined. When exact width matters (file formats, protocols, hashing) use <code>&lt;cstdint&gt;</code> types like <code>std::int32_t</code>/<code>std::uint64_t</code>, and document assumptions with <code>static_assert</code>.</p>`, followUps: ['When would you use int_fast32_t?', 'How big is bool, and why not 1 bit?'] },
    { q: R`Explain two's complement. Why does the range of <code>int8_t</code> go from −128 to 127?`, level: 'I', a: R`<p>In two's complement the most significant bit has a negative weight: for 8 bits it is worth −128, the others +64 … +1. So <code>0111 1111</code> = 127 and <code>1000 0000</code> = −128; <code>1111 1111</code> = −1. To negate, flip all bits and add one. There are 256 patterns; zero uses one of the non-negative ones, leaving 128 negatives and 128 non-negatives (0..127) — hence the asymmetry, which is why <code>-INT_MIN</code>, <code>abs(INT_MIN)</code> and <code>INT_MIN / -1</code> overflow. Advantages: one representation of zero, and the same adder hardware works for signed and unsigned. Since C++20 two's complement is mandatory, but signed <b>overflow</b> is still undefined behavior.</p>`, followUps: ['How would you compute the absolute value of INT_MIN safely?', 'What does right-shifting a negative number do in C++20?'] },
    { q: R`Signed vs unsigned overflow: what does C++ say, and why does the difference matter for optimization?`, level: 'I', a: R`<p>Unsigned arithmetic is defined modulo 2<sup>N</sup>: <code>UINT_MAX + 1 == 0</code>. Signed overflow is <b>undefined behavior</b>. Because the compiler may assume signed overflow never happens, it can simplify <code>x + 1 &gt; x</code> to <code>true</code>, compute exact trip counts for <code>for (int i = 0; i &lt;= n; ++i)</code>, widen loop indices and vectorize. With unsigned counters it must preserve wrap-around semantics, which sometimes blocks those optimizations. The flip side: an actual signed overflow can make "impossible" branches execute or checks disappear. Defenses: check before the operation (<code>a &gt; INT_MAX - b</code>), use <code>__builtin_*_overflow</code> or C++26 <code>&lt;stdckdint.h&gt;</code>, compute in a wider type, and test with <code>-fsanitize=undefined</code>. <code>-fwrapv</code> defines wrapping if a codebase depends on it.</p>`, followUps: ['Show an overflow check that the optimizer would delete', 'When is unsigned the right choice?'] },
    { q: R`What are the usual arithmetic conversions? Give a real bug they cause.`, level: 'I', a: R`<p>Before a binary operator, operands are brought to a common type: first <b>integral promotion</b> (bool, char, short → int), then if types still differ, the one with lower rank converts to the higher rank; if ranks are equal and one is unsigned, the signed operand converts to unsigned; if a signed type can represent all values of the unsigned one, both become the signed type; anything with a floating type converts to that floating type. Real bugs: <code>if (i &lt; v.size() - 1)</code> with an empty vector (size_t wraps to 2<sup>64</sup>−1); <code>-1 &lt; 1u</code> is false; <code>uint16_t a = 65535; a * a</code> promotes to <b>int</b> and overflows (UB) despite unsigned inputs. Fixes: <code>-Wall -Wextra -Wsign-conversion</code>, <code>std::ssize</code>, <code>std::cmp_less</code>, explicit casts to a wide signed type.</p>`, followUps: ["What is the type of <code>'a' + 1</code>?", 'What does std::cmp_less do differently?'] },
    { q: R`How do you make C++ I/O fast for 10<sup>6</sup>+ numbers? What are the trade-offs?`, level: 'I', a: R`<p>Three steps cover almost all cases: <code>std::ios::sync_with_stdio(false)</code> lets iostreams use their own buffers instead of synchronizing with C stdio on every operation; <code>std::cin.tie(nullptr)</code> stops flushing <code>cout</code> before each read; and print <code>'\n'</code> instead of <code>std::endl</code> to avoid a flush per line. Trade-offs: after unsyncing, mixing <code>printf</code>/<code>scanf</code> with <code>cout</code>/<code>cin</code> can reorder output; after untying, prompts are not auto-flushed, so interactive programs must flush explicitly. For extreme inputs (10<sup>7</sup>+), read big blocks with <code>fread</code> (or <code>mmap</code>) and parse manually, or use <code>std::from_chars</code>; build output in a buffer and write it once.</p>`, followUps: ['Why does an interactive problem hang without a flush?', 'Why is while(!cin.eof()) wrong?'] },
    { q: R`Why is <code>using namespace std;</code> discouraged, and when is it acceptable?`, level: 'B', a: R`<p>It injects hundreds of names (<code>count</code>, <code>distance</code>, <code>size</code>, <code>data</code>, <code>max</code>, <code>byte</code>…) into the scope. Your own names then become ambiguous or silently resolve to a different overload; new standards add names, so code can break on a compiler upgrade; and in a <b>header</b> it leaks into every file that includes it — you impose the pollution on all users. Acceptable: tiny programs, competitive programming, tests, and inside a function body or a <code>.cpp</code> file where the scope is small. Better habits: qualify with <code>std::</code>, use targeted using-declarations (<code>using std::cout;</code>), and namespace aliases for long names (<code>namespace fs = std::filesystem;</code>).</p>`, followUps: ['What is the difference between a using-declaration and a using-directive?', 'Is using namespace std::literals OK?'] },
    { q: R`What is argument-dependent lookup (ADL) and why does the swap idiom rely on it?`, level: 'A', a: R`<p>For an unqualified function call, besides normal scope-by-scope lookup, the compiler also searches the namespaces (and classes) associated with the argument types. That is why <code>std::cout &lt;&lt; s</code> finds <code>std::operator&lt;&lt;</code> for a <code>std::string</code>, and why <code>print(box)</code> finds <code>shapes::print</code> when <code>box</code> is a <code>shapes::Box</code>. The swap idiom — <code>using std::swap; swap(a, b);</code> — makes <code>std::swap</code> a fallback via the using-declaration, while ADL finds a type-specific, more efficient <code>swap</code> in the type's namespace if one exists; overload resolution picks the better match. Calling <code>std::swap(a, b)</code> directly would bypass custom swaps. ADL can also surprise you by pulling unexpected overloads, which is why C++20 ranges use customization point objects.</p>`, followUps: ['Does ADL apply to function templates with explicit template arguments?', 'What is a hidden friend?'] },
    { q: R`What runs before <code>main</code>, and what is the static initialization order fiasco?`, level: 'A', a: R`<p>The C runtime entry point (<code>_start</code>) sets up the process, then <b>static initialization</b> happens: zero/constant initialization of globals (often baked into the binary), followed by <b>dynamic initialization</b> — running constructors and initializer expressions of non-local static objects. Within one TU they run in declaration order; <b>across TUs the order is unspecified</b>. The fiasco: a global in <code>a.cpp</code> whose constructor uses a global from <code>b.cpp</code> that may not be constructed yet — it works or crashes depending on link order. Fixes: function-local statics ("construct on first use", thread-safe since C++11), <code>constinit</code>/<code>constexpr</code> to force compile-time initialization, or avoiding non-trivial globals. After <code>main</code> returns, <code>exit</code> runs static destructors in reverse order and flushes stdio.</p>`, followUps: ['What does constinit (C++20) guarantee?', 'Why can destruction order also be a problem?'] },
    { q: R`How would you share a configuration variable across many .cpp files? Compare the options.`, level: 'I', a: R`<p>(1) <b>extern declaration + one definition</b>: header has <code>extern int maxConn;</code>, exactly one <code>.cpp</code> has <code>int maxConn = 100;</code>. Classic, works in every standard. (2) <b>C++17 inline variable</b>: <code>inline int maxConn = 100;</code> in the header; the linker merges all copies into one object. Simplest today. (3) If it never changes, <code>constexpr int kMaxConn = 100;</code> in the header: each TU gets its own internal copy, which is fine for constants and enables compile-time use. (4) Encapsulate: a function returning a reference to a function-local static avoids the initialization-order fiasco and lets you control access. Anti-pattern: <code>static int maxConn</code> in a header — it links, but every TU has a separate variable, so writes in one file are invisible in others.</p>`, followUps: ['How would you make it thread-safe if it changes at run time?', 'Why does const at namespace scope imply internal linkage?'] },
    { q: R`What is undefined behavior? Name five examples relevant to this module and how you would detect them.`, level: 'A', a: R`<p>Undefined behavior means the standard imposes <b>no requirements</b> — the program may appear to work, produce wrong results, crash, or be "optimized" in surprising ways, and results can change with compiler flags. Examples here: signed integer overflow (<code>INT_MAX + 1</code>); reading an uninitialized local; shifting by a negative amount or by ≥ the bit width (<code>1 &lt;&lt; 32</code> on a 32-bit int); out-of-bounds access (e.g. the <code>size() - 1</code> loop on an empty vector); <code>INT_MIN / -1</code> and <code>abs(INT_MIN)</code>; modifying a variable twice without sequencing; passing a negative <code>char</code> to <code>std::isalpha</code>. Detection: compile with <code>-Wall -Wextra -Wconversion</code>, run tests under <code>-fsanitize=address,undefined</code>, use static analysis (clang-tidy, cppcheck), constexpr evaluation (UB is a compile error inside constant evaluation), and fuzzing.</p>`, followUps: ['Difference between UB, unspecified and implementation-defined behavior?', 'What is "erroneous behavior" in C++26?'] }
  );

  registerModule({
    id: 'cpp01',
    title: 'Compilation Model, Syntax, Types & I/O',
    intro: R`<p>Welcome to C++! Before we write clever algorithms, we need to understand how a C++ program is <b>born</b>: how a few text files become a native executable through the <b>preprocessor → compiler → assembler → linker</b> pipeline, why we split code into <b>headers and source files</b>, and why the errors you see come from different stages. Then we meet the building blocks every line of C++ uses: <code>main</code>, variables and initialization, the <b>fundamental types</b> and their real sizes, the tricky world of <b>signed vs unsigned</b> integers and overflow, reading and writing with <code>cin</code>/<code>cout</code> (including the <b>fast I/O</b> tricks every competitive programmer uses), and <b>namespaces</b>.</p>
<p>Each topic starts with an everyday analogy, then shows exactly what the compiler and CPU do — with step-by-step visualizers for the build pipeline, macro expansion, include guards, <code>argv</code>, type ranges, bit-level overflow, the input buffer and name lookup. Interviewers love this material because it separates people who <i>use</i> C++ from people who <i>understand</i> it: "what happens when you compile?", "why is <code>-1 &lt; 1u</code> false?", "why did my <code>getline</code> return an empty string?". By the end you will answer those confidently and avoid the overflow and I/O bugs that cause most wrong answers in coding rounds.</p>`,
    goals: [
      'Explain the four build stages, name the file produced by each (<code>.i</code>, <code>.s</code>, <code>.o</code>, executable), and tell compile errors from link errors at a glance',
      'Organize code into headers and source files correctly: declarations vs definitions, include guards, <code>inline</code>/<code>extern</code>, and the One Definition Rule',
      'Write correct <code>main</code> functions with <code>argc</code>/<code>argv</code>, exit codes and safe initialization (brace init, no uninitialized locals)',
      'Choose the right integer/floating type from problem constraints (<code>int</code> vs <code>long long</code> vs fixed-width) and know sizes on LP64 vs LLP64',
      'Predict signed/unsigned conversions, detect overflow before it happens, and explain two\'s complement on a whiteboard',
      'Read and write data correctly and fast: <code>&gt;&gt;</code> vs <code>getline</code>, EOF loops, formatting, <code>sync_with_stdio</code>/<code>tie</code>, <code>\'\\n\'</code> vs <code>endl</code>',
      'Use namespaces professionally: qualified names, using-declarations, aliases, unnamed namespaces, and explain name lookup and ADL'
    ],
    prereqs: R`<p>No prior C++ needed. Helpful: basic programming in any language (variables, loops, functions) and comfort with a terminal. If you know Java or Python, compare with <b>Java 1 (JDK, JRE, JVM &amp; Java Basics)</b> — C++ compiles to native code instead of bytecode. Have <code>g++</code> (13+) or <code>clang++</code> (17+) installed, or use an online compiler such as Compiler Explorer (godbolt.org).</p>`,
    hours: 10,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
