(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // C++ code uses R`...` so '\n' stays a C++ escape. CMake code uses normal backticks with \${VAR}.

  /* ---------------- shared helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function lines(input, def, max, hint) {
    var s = String(input === undefined || input === null ? def : input).trim();
    if (!s) throw new Error(hint);
    var a = s.split(/\s*;\s*|\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (a.length > max) throw new Error('Use at most ' + max + ' entries. ' + hint);
    return a;
  }
  function okName(n, hint) {
    if (!/^[A-Za-z_][A-Za-z0-9_.:+-]{0,15}$/.test(n || '')) throw new Error(hint + ' (bad name "' + n + '")');
    return n;
  }
  /* Parse "a: b c; b: c; c:" into {order:[names], deps:{name:[deps]}} */
  function parseDeps(input, def, hint) {
    var ls = lines(input, def, 9, hint), order = [], deps = {};
    ls.forEach(function (l) {
      var i = l.indexOf(':');
      if (i < 0) throw new Error(hint);
      var n = okName(l.slice(0, i).trim(), hint);
      if (!deps[n]) { order.push(n); deps[n] = []; }
      l.slice(i + 1).trim().split(/\s+/).filter(Boolean).forEach(function (d) { deps[n].push(okName(d, hint)); });
    });
    Object.keys(deps).forEach(function (n) { deps[n].forEach(function (d) { if (!deps[d]) { order.push(d); deps[d] = []; } }); });
    if (order.length > 9) throw new Error('At most 9 distinct names, please. ' + hint);
    return { order: order, deps: deps };
  }
  /* Lay out nodes in layers (dependencies at the bottom). */
  function layout(g) {
    var depth = {}, guard = 0;
    function d(n, seen) {
      if (depth[n] !== undefined) return depth[n];
      if (seen[n] || ++guard > 500) return 0;
      seen[n] = 1;
      var m = 0; g.deps[n].forEach(function (x) { m = Math.max(m, d(x, seen) + 1); });
      seen[n] = 0; depth[n] = m; return m;
    }
    g.order.forEach(function (n) { d(n, {}); });
    var maxD = 0; g.order.forEach(function (n) { maxD = Math.max(maxD, depth[n]); });
    var byD = {}; g.order.forEach(function (n) { (byD[depth[n]] = byD[depth[n]] || []).push(n); });
    var height = Math.max(50, (maxD + 1) * 18 + 10), nodes = [];
    Object.keys(byD).forEach(function (k) {
      var row = byD[k];
      row.forEach(function (n, i) { nodes.push({ id: n, label: n, x: Math.round((i + 1) * 100 / (row.length + 1)), y: height - 10 - (+k) * 18, shape: 'box', w: Math.max(12, n.length * 2.4 + 6) }); });
    });
    var edges = [];
    g.order.forEach(function (n) { g.deps[n].forEach(function (x) { edges.push([n, x]); }); });
    return { nodes: nodes, edges: edges, height: height };
  }
  function gpart(label, L, hl, ehl, tags) {
    return { type: 'graph', label: label, directed: true, height: L.height, nodes: L.nodes, edges: L.edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }

  /* ======================================================================
     TOPIC 1 — Toolchains: GCC, Clang, MSVC, the driver and the linker
     ====================================================================== */
  topics.push({
    title: 'Toolchains: GCC, Clang, MSVC — the Driver, Flags, Standard Libraries and Linkers',
    analogy: `<p>Think of a <b>restaurant kitchen</b>. You hand one order slip to the <b>head chef</b> (the compiler <i>driver</i>: <code>g++</code>, <code>clang++</code>, <code>cl.exe</code>). The head chef never cooks; they pass the slip to the prep cook (preprocessor), the line cook (compiler proper), the plating cook (assembler) and finally the waiter who assembles the full meal on one tray (the <b>linker</b>). Different restaurants (GCC, Clang, MSVC) have different cooks and different slang on the slip, but the stations are the same. A <b>toolchain</b> is the whole kitchen crew plus the pantry: compiler, assembler, linker, standard library and system headers that all agree with each other.</p>`,
    explain: `<p>In C++ 1 you ran the four stages by hand. At scale, the question is not "what are the stages?" but "<b>which tools, which flags, and do they all agree?</b>"</p>
<h4>The three big compiler families</h4>
${H.table(['', 'GCC 13+', 'Clang 17+', 'MSVC (VS 2022)'], [
  ['Driver', '<code>g++</code>', '<code>clang++</code> (or <code>clang-cl</code> for MSVC-style flags)', '<code>cl.exe</code>'],
  ['Default standard library', 'libstdc++', 'libstdc++ on Linux, libc++ on macOS (pick with <code>-stdlib=libc++</code>)', 'MSVC STL'],
  ['Default linker', 'GNU ld (bfd); <code>-fuse-ld=gold|lld|mold</code>', 'system linker; <code>-fuse-ld=lld</code>', '<code>link.exe</code> (or <code>lld-link</code>)'],
  ['Flag style', '<code>-O2 -Wall -std=c++20</code>', 'same as GCC', '<code>/O2 /W4 /std:c++20</code>'],
  ['Default dialect', 'gnu++17', 'gnu++17', 'C++14 (needs <code>/std:c++20</code>)']])}
<h4>Flags you must be able to read</h4>
<ul><li><code>-std=c++20</code> picks the language. <code>-std=gnu++20</code> adds GNU extensions (the default family). Pick explicitly.</li>
<li><code>-O0/-O1/-O2/-O3/-Os/-Og</code>: optimisation. <code>-g</code>: debug info (independent of -O!). The <b>last</b> <code>-O</code> wins.</li>
<li><code>-Wall -Wextra -Wpedantic -Werror</code>: warnings. <code>-Wall</code> is not "all".</li>
<li><code>-DNAME=VAL</code> / <code>-UNAME</code>: define/undefine macros, processed <b>left to right</b>. <code>-DNDEBUG</code> turns off <code>assert</code>.</li>
<li><code>-I dir</code> (user headers), <code>-isystem dir</code> (third-party headers: warnings suppressed), <code>-L dir</code> + <code>-lfoo</code> (link with <code>libfoo</code>).</li>
<li><code>-fPIC</code> (position-independent code for shared libraries), <code>-fvisibility=hidden</code>, <code>-flto</code>, <code>-fsanitize=address,undefined</code>.</li></ul>
<h4>Why "the toolchain must agree"</h4>
<p>Object files from different compilers can usually be linked on Linux because GCC and Clang share the <b>Itanium C++ ABI</b> (name mangling, vtable layout, exception handling). But the <b>standard library</b> is part of the ABI too: an object built against libc++ cannot pass a <code>std::string</code> to one built against libstdc++. On Windows, MSVC has its own ABI, and mixing the debug and release runtime (<code>/MDd</code> vs <code>/MD</code>) breaks things.</p>`,
    clues: [
      '"What happens when you run <code>g++ main.cpp</code>?" → the driver runs cc1plus, as and ld (or collect2) for you',
      '"Works with GCC, fails with Clang/MSVC" → non-standard extension, different default dialect, or missing <code>#include</code> that one library pulled in transitively',
      '"<code>undefined reference to std::__cxx11::basic_string</code>" → ABI mismatch (libstdc++ dual ABI) between objects',
      '"Debug build crashes only when linked with a release library on Windows" → mixed MSVC runtimes (<code>/MD</code> vs <code>/MDd</code>)',
      '"Link step is the slowest part of the build" → try <code>lld</code> or <code>mold</code>, split debug info, or thin LTO',
      '"Same flag twice with different values" → for <code>-O</code> and <code>-D</code>, the last one wins'
    ],
    code: [{ lang: 'bash', title: 'Look inside the driver (GCC/Clang)', code: `# -v shows every sub-tool the driver launches and the include search path
g++ -std=c++20 -O2 -v -c main.cpp -o main.o 2>&1 | grep -E 'cc1plus|#include <...>' -A3

# -### prints the commands without running them (Clang and GCC)
clang++ -std=c++20 -### main.cpp -o app

# Which macros does a flag set produce? Dump the predefined macros.
g++ -std=c++20 -O2 -dM -E -x c++ /dev/null | grep -E '__cplusplus|__OPTIMIZE__'

# Pick a faster linker without changing anything else
clang++ -fuse-ld=lld main.o util.o -o app
g++ -fuse-ld=mold main.o util.o -o app` },
    { lang: 'cpp', title: 'Which toolchain compiled me? (portable checks)', code: R`#include <iostream>
#include <version>

int main() {
#if defined(__clang__)
    std::cout << "Clang " << __clang_major__ << '\n';
#elif defined(__GNUC__)
    std::cout << "GCC " << __GNUC__ << '\n';
#elif defined(_MSC_VER)
    std::cout << "MSVC " << _MSC_VER << '\n';
#endif
#if defined(_LIBCPP_VERSION)
    std::cout << "standard library: libc++\n";
#elif defined(__GLIBCXX__)
    std::cout << "standard library: libstdc++\n";
#endif
    // MSVC reports 199711L here unless you pass /Zc:__cplusplus
    std::cout << "__cplusplus = " << __cplusplus << '\n';
#ifdef NDEBUG
    std::cout << "asserts are OFF (NDEBUG defined)\n";
#endif
}` }],
    codeTitle: ['Look inside the driver (GCC/Clang)', 'Which toolchain compiled me? (portable checks)'],
    viz: {
      title: 'Follow one command line through the driver',
      input: '-O0 -DLEVEL=1 -O2 -DNDEBUG -ULEVEL',
      inputLabel: 'Compiler flags (space separated, -O / -D / -U / anything)',
      gen: function (input) {
        var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!toks.length) throw new Error('Type some flags, e.g. -O0 -DLEVEL=1 -O2 -DNDEBUG');
        if (toks.length > 12) throw new Error('At most 12 flags');
        var frames = [], opt = '-O0 (default)', mac = {}, others = [];
        var nodes = [{ id: 'drv', label: 'driver g++', x: 50, y: 8, shape: 'box', w: 26 }, { id: 'cpp', label: 'preprocessor', x: 15, y: 30, shape: 'box', w: 24 },
          { id: 'cc', label: 'cc1plus', x: 50, y: 30, shape: 'box', w: 18 }, { id: 'ld', label: 'linker ld', x: 85, y: 30, shape: 'box', w: 20 }];
        function pic(hl) { return { type: 'graph', label: 'Who receives each flag', directed: true, height: 42, nodes: nodes, edges: [['drv', 'cpp'], ['drv', 'cc'], ['drv', 'ld']], hl: hl || {} }; }
        function state() { var e = Object.keys(mac).sort().map(function (k) { return [k, mac[k]]; }); return { type: 'map', label: 'Macros the preprocessor will see', entries: e.length ? e : [['(none)', '']] }; }
        frames.push({ narr: 'The <b>driver</b> reads the whole command line first, then hands each flag to the stage that understands it. Flags are processed <b>left to right</b>.', parts: [pic({ drv: 'cur' }), state(), { type: 'vars', label: 'Effective settings', vals: { optimisation: opt } }] });
        toks.forEach(function (t, i) {
          var hl = { drv: 'done' }, msg;
          if (/^-O[0-3sgz]?$|^-Ofast$/.test(t)) { opt = t; hl.cc = 'cur'; msg = '<code>' + H.esc(t) + '</code> goes to the compiler proper. A later <code>-O</code> <b>replaces</b> an earlier one, so the optimisation level is now ' + H.esc(t) + '.'; }
          else if (/^-D./.test(t)) { var b = t.slice(2), k = b.split('=')[0], v = b.indexOf('=') >= 0 ? b.slice(b.indexOf('=') + 1) : '1'; mac[k] = v; hl.cpp = 'ok'; msg = '<code>' + H.esc(t) + '</code> defines macro <b>' + H.esc(k) + '</b> = ' + H.esc(v) + ' (no value means 1). Redefining it later overwrites it.'; }
          else if (/^-U./.test(t)) { var u = t.slice(2), had = mac[u] !== undefined; delete mac[u]; hl.cpp = 'bad'; msg = '<code>' + H.esc(t) + '</code> undefines <b>' + H.esc(u) + '</b>' + (had ? ' — it was defined earlier, so it is gone now.' : ' — it was not defined, so nothing changes (no error).'); }
          else if (/^-(l|L|fuse-ld|Wl,)/.test(t)) { others.push(t); hl.ld = 'cur'; msg = '<code>' + H.esc(t) + '</code> is a <b>linker</b> flag; the compile stages ignore it.'; }
          else { others.push(t); hl.cc = 'cur'; msg = '<code>' + H.esc(t) + '</code> is passed to the compiler (warnings, -std, -g, -f… flags).'; }
          frames.push({ narr: 'Flag ' + (i + 1) + ': ' + msg, parts: [pic(hl), state(), { type: 'vars', label: 'Effective settings', vals: { optimisation: opt, other: others.join(' ') || '-' }, hl: one('optimisation', /^-O/.test(t) ? 'cur' : '') }] });
        });
        frames.push({ narr: 'Final result: the compiler runs with <b>' + H.esc(opt) + '</b> and the macros on the right. This "last one wins" rule is why build systems put user flags <i>after</i> default flags — so you can override them.', parts: [pic({ cpp: 'ok', cc: 'ok', ld: 'ok' }), state(), { type: 'vars', label: 'Effective settings', vals: { optimisation: opt, other: others.join(' ') || '-' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Same code, different compiler: the missing include', html: `<p>Code that uses <code>std::accumulate</code> but only includes <code>&lt;vector&gt;</code> compiles with one standard library (which happens to include <code>&lt;numeric&gt;</code> internally) and fails with another: <code>'accumulate' is not a member of 'std'</code>. The fix is never "use the other compiler": include what you use. Testing on two toolchains in CI catches this early.</p>`, code: R`#include <vector>
#include <numeric>   // required for std::accumulate; do not rely on <vector> pulling it in
int total(const std::vector<int>& v) { return std::accumulate(v.begin(), v.end(), 0); }` },
      { title: 'Reading a mangled linker error', html: `<p><code>undefined reference to '_Z3addii'</code> is the mangled name. <code>c++filt _Z3addii</code> prints <code>add(int, int)</code>. GCC and Clang already demangle in their messages; <code>nm -C</code> demangles symbol listings. On MSVC the decorated name looks like <code>?add@@YAHHH@Z</code> and <code>undname</code> decodes it.</p>`, code: { lang: 'bash', code: `nm -C build/libmath.a | grep add     # T = defined in text section, U = undefined
c++filt _Z3addii                      # add(int, int)` } },
      { title: 'The libstdc++ dual ABI', html: `<p>Since GCC 5, libstdc++ ships two <code>std::string</code> layouts. The macro <code>_GLIBCXX_USE_CXX11_ABI</code> (default 1) selects which. A prebuilt library compiled with <code>=0</code> exports functions taking the old string, so your code (with <code>=1</code>) gets <code>undefined reference to foo(std::__cxx11::basic_string…)</code>. Fix: rebuild the library, or build everything with the same value. Package managers solve this by encoding the ABI in the package id (Conan's <code>compiler.libcxx=libstdc++11</code>).</p>`, code: { lang: 'text', code: `undefined reference to 'parse(std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> > const&)'
# The library exports parse(std::basic_string<...>)  (old ABI, no __cxx11)` } },
      { title: 'Last -O wins, -g is independent', html: `<p><code>g++ -O0 -g -O2 main.cpp</code> builds with <b>-O2</b> and debug info. Debug info does not turn off optimisation; it only adds DWARF sections. This is exactly what CMake's <code>RelWithDebInfo</code> does: <code>-O2 -g -DNDEBUG</code>. Use <code>-Og</code> for a debug build that is still reasonably fast and debuggable.</p>`, code: { lang: 'bash', code: `g++ -O0 -g -O2 -c main.cpp -o main.o
g++ -O2 -dM -E -x c++ /dev/null | grep __OPTIMIZE__   # defined: optimisation is on` } }
    ],
    deepDive: `<p><b>What the driver really runs.</b> <code>g++</code> calls <code>cc1plus</code> (preprocess + compile to assembly), <code>as</code>, then <code>collect2</code>, which wraps <code>ld</code> and adds the C runtime start files (<code>crt1.o</code>, <code>crti.o</code>, <code>crtbegin.o</code>) and <code>-lstdc++ -lm -lgcc_s -lc</code>. That is why linking C++ objects with <code>gcc</code> instead of <code>g++</code> fails with undefined <code>operator new</code>: the C driver does not add libstdc++.</p>
<p><b>Linkers.</b> GNU <b>ld.bfd</b> is the reference; <b>gold</b> is faster but deprecated in binutils 2.44 (2025); <b>lld</b> (LLVM) is fast and cross-platform; <b>mold</b> is fastest on Linux for large binaries thanks to heavy parallelism. On macOS, Apple's <code>ld</code> (ld-prime since Xcode 15). On Windows, <code>link.exe</code> or <code>lld-link</code>. Linker choice changes speed and a few semantics (archive ordering, see the next topic) but not the output's meaning.</p>
<p><b>The sysroot and target triple.</b> Clang is a cross compiler by design: <code>--target=aarch64-linux-gnu --sysroot=/opt/sysroot</code> builds for ARM using that directory's headers and libraries. GCC needs a separate build per target (<code>aarch64-linux-gnu-g++</code>). The triple <code>arch-vendor-os-abi</code> names the platform precisely.</p>
<p><b>ABI stability.</b> The Itanium ABI is stable, and libstdc++ has kept backward compatibility since GCC 5 (new symbols are added with version tags such as <code>GLIBCXX_3.4.32</code>). Running a binary on a system with an older libstdc++ fails with <code>version 'GLIBCXX_3.4.32' not found</code>: build on the oldest platform you support, or link libstdc++ statically (<code>-static-libstdc++</code>). MSVC has kept binary compatibility across VS 2015–2022 (v14x toolsets), so libraries built with an older toolset link into newer ones, but not the other way around.</p>
<p><b>Feature-test macros.</b> Instead of checking compiler versions, check features: <code>#if __cpp_lib_format &gt;= 201907L</code> after <code>#include &lt;version&gt;</code>. They are reliable across all three compilers.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are excellent at decoding a 40-line template error or a mangled linker message, and at translating flags between GCC and MSVC (<code>-Wall</code> ≈ <code>/W4</code>, <code>-O2</code> ≈ <code>/O2</code>, <code>-fsanitize=address</code> ≈ <code>/fsanitize=address</code>). Paste the full first error, the compiler version and the command line, and you usually get the right diagnosis in seconds.</p>
<p><b>Where AI goes wrong:</b> it often suggests flags from old blog posts (<code>-std=c++0x</code>, <code>-fno-elide-constructors</code> for "performance", gold as the fast linker), invents MSVC switches, or "fixes" an ABI mismatch by adding <code>-D_GLIBCXX_USE_CXX11_ABI=0</code> to just one target, which moves the error somewhere else. It also cannot see which toolchain your CI actually uses.</p>
<p><b>What you still own:</b> knowing which compiler, standard library and linker produce your shipped binary, keeping them consistent across every dependency, and verifying with <code>-v</code>, <code>nm</code>, <code>ldd</code> or <code>dumpbin</code> instead of trusting a guess.</p>`,
    problems: [{
      title: 'Effective Macros After -D and -U Flags', level: 'Easy', tags: ['compiler flags', 'preprocessor', 'hash map'], companies: ['Google', 'Bloomberg'],
      statement: `<p>A compiler driver processes <code>-D</code> and <code>-U</code> options <b>in the order given</b>. Given the list of command-line tokens, return the macros that are defined at the end, as <code>NAME=VALUE</code> strings sorted by name.</p>
<ul><li><code>-DNAME</code> defines NAME with value <code>1</code>.</li><li><code>-DNAME=VAL</code> defines NAME with value VAL (VAL may be empty or contain more <code>=</code>; only the first <code>=</code> splits).</li>
<li><code>-UNAME</code> removes NAME (no error if it was not defined).</li><li><code>-D</code> or <code>-U</code> alone takes the <b>next</b> token as its argument (<code>-D FAST</code>).</li><li>Every other token is ignored.</li></ul>`,
      constraints: `0 ≤ tokens ≤ 1000; names are non-empty identifiers.`,
      example: `<p><code>["-O2", "-DNDEBUG", "-DVERSION=3", "-Wall"]</code> → <b>${H.c('g', '["NDEBUG=1", "VERSION=3"]')}</b>. <code>["-DDEBUG", "-UDEBUG"]</code> → <b>[]</b> because the later -U wins; <code>["-UDEBUG", "-DDEBUG"]</code> → <b>["DEBUG=1"]</b>.</p>`,
      brute: { why: `<p>Keep a vector of (name, value) pairs and, for every flag, linearly search it to replace or erase the entry: O(F·M) for F flags and M macros, and you still have to sort at the end. Fine for a handful of flags, wasteful for a generated command line with hundreds of <code>-D</code>s.</p>`, code: R`vector<string> effectiveMacrosBrute(vector<string> flags) {
    vector<pair<string, string>> defs;
    for (size_t i = 0; i < flags.size(); i++) {
        string f = flags[i];
        if ((f == "-D" || f == "-U") && i + 1 < flags.size()) f += flags[++i];
        if (f.size() < 3 || f[0] != '-' || (f[1] != 'D' && f[1] != 'U')) continue;
        string body = f.substr(2), name = body.substr(0, body.find('='));
        auto it = find_if(defs.begin(), defs.end(), [&](auto& p) { return p.first == name; });
        if (f[1] == 'U') { if (it != defs.end()) defs.erase(it); continue; }
        string val = body.find('=') == string::npos ? "1" : body.substr(body.find('=') + 1);
        if (it != defs.end()) it->second = val; else defs.push_back({name, val});
    }
    sort(defs.begin(), defs.end());
    vector<string> out;
    for (auto& [n, v] : defs) out.push_back(n + "=" + v);
    return out;
}` },
      mcq: { q: 'Which container gives both "last write wins" and sorted output for free?', options: ['std::vector with push_back', 'std::map&lt;string, string&gt;', 'std::unordered_set&lt;string&gt;', 'std::stack&lt;string&gt;'], answer: 1, explain: '<code>m[name] = value</code> overwrites earlier definitions, <code>erase</code> handles -U, and iteration is already sorted by name.' },
      hints: [`<p>Hint 1: the order of flags matters only per macro name — a later -D or -U for the same name replaces whatever happened before.</p>`, `<p>Hint 2: an ordered map from name to value does everything: assign on -D, erase on -U, iterate at the end for sorted output.</p>`, `<p>Hint 3: handle the two-token form first (if the token is exactly "-D" or "-U", glue the next token on). Split the body at the <b>first</b> '=' only; no '=' means value "1"; "NAME=" means an empty value.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'effectiveMacros', cases: [[[["-O2","-DNDEBUG","-DVERSION=3","-Wall"]],["NDEBUG=1","VERSION=3"]],[[["-DDEBUG","-UDEBUG"]],[]],[[["-UDEBUG","-DDEBUG"]],["DEBUG=1"]],[[["-DLEVEL=1","-DLEVEL=2","-O0"]],["LEVEL=2"]],[[["-D","FAST","-U","SLOW","-DSLOW=0"]],["FAST=1","SLOW=0"]],[[[]],[]],[[["-std=c++20","-Iinclude","-g"]],[]],[[["-DURL=http://x=y","-DEMPTY=","-DA","-UA","-DA=7"]],["A=7","EMPTY=","URL=http://x=y"]]] },
      solution: {
        approach: `<p>Walk the tokens left to right. Normalise <code>-D X</code> into <code>-DX</code>. For <code>-D</code>, split at the first <code>=</code> and store into a <code>std::map</code> (overwriting); for <code>-U</code>, erase. Finally print the map, which is already sorted.</p>`,
        code: R`#include <map>
#include <string>
#include <vector>
using namespace std;

vector<string> effectiveMacros(vector<string>& flags) {
    map<string, string> defs;                       // sorted by name, last write wins
    for (size_t i = 0; i < flags.size(); i++) {
        string f = flags[i];
        if (f == "-D" || f == "-U") {               // two-token form: -D NAME
            if (i + 1 >= flags.size()) break;
            f += flags[++i];
        }
        if (f.size() <= 2 || f[0] != '-') continue;
        string body = f.substr(2);
        if (f[1] == 'D') {
            size_t eq = body.find('=');
            if (eq == string::npos) defs[body] = "1";              // -DNAME means NAME=1
            else defs[body.substr(0, eq)] = body.substr(eq + 1);   // split at the FIRST '='
        } else if (f[1] == 'U') {
            defs.erase(body);                                      // no error if absent
        }
    }
    vector<string> out;
    for (auto& [name, value] : defs) out.push_back(name + "=" + value);
    return out;
}`,
        dry: { head: ['token', 'action', 'map after'], rows: [['-DURL=http://x=y', 'define URL', 'URL=http://x=y'], ['-DEMPTY=', 'define EMPTY (empty)', 'EMPTY=, URL=…'], ['-DA', 'define A=1', 'A=1, EMPTY=, URL=…'], ['-UA', 'erase A', 'EMPTY=, URL=…'], ['-DA=7', 'define A=7', H.c('g', 'A=7, EMPTY=, URL=http://x=y')]] },
        complexity: `<p>O(F log M) time for F tokens and M distinct macros; O(M) space.</p>`,
        followUps: ['Also return the final optimisation level (last <code>-O</code> wins, default <code>-O0</code>).', 'Support response files: a token <code>@flags.rsp</code> expands to the tokens inside that file.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Static vs shared libraries, symbols, ODR and linker errors
     ====================================================================== */
  topics.push({
    title: 'Static vs Shared Libraries, Symbol Resolution, the ODR and Linker Errors',
    analogy: `<p>A <b>static library</b> is a box of photocopies: when you build your app, the linker copies just the pages you need into your binder, and the box can be thrown away. A <b>shared library</b> is a book in the public library: your binder only says "see page 42 of <i>libfmt.so.10</i>", and every reader borrows the same book at run time. Photocopies make your binder heavier but self-contained; the shared book saves paper and can be fixed once for everyone, but if the library moves or swaps editions, your reference breaks.</p>`,
    explain: `<p>A <b>symbol</b> is a named thing the linker can connect: a function or a global variable. Each object file has a symbol table with <b>definitions</b> (I provide <code>add(int,int)</code>) and <b>references</b> (I need <code>log(char const*)</code>). Linking = matching every reference to exactly one definition.</p>
${H.table(['', 'Static library', 'Shared library'], [
  ['Linux / macOS / Windows file', '<code>libfoo.a</code> / <code>libfoo.a</code> / <code>foo.lib</code>', '<code>libfoo.so</code> / <code>libfoo.dylib</code> / <code>foo.dll</code> (+ import <code>foo.lib</code>)'],
  ['What it is', 'an archive of <code>.o</code> files', 'a linked image loaded at run time'],
  ['When resolved', 'link time: needed members are copied in', 'load time (or lazily on first call) by the dynamic loader'],
  ['Pros', 'one self-contained binary, no version hell, whole-program optimisation', 'smaller binaries, shared memory pages, patch once'],
  ['Cons', 'bigger binaries, every app must relink to get a fix', 'must be found at run time (rpath, PATH), ABI must stay compatible'],
  ['Compile flag', 'none needed', '<code>-fPIC</code> (position-independent code)']])}
<h4>The two classic linker errors</h4>
<ul><li><b>undefined reference to X</b>: someone uses X, nobody defines it. Causes: forgot to link the library, wrong link order with static archives, declared but never defined, template body hidden in a <code>.cpp</code>, C function called from C++ without <code>extern "C"</code>, ABI mismatch.</li>
<li><b>multiple definition of X</b>: two object files both define X. Causes: a non-inline function or variable defined in a header included by two <code>.cpp</code> files, or the same source compiled into two libraries that are both linked.</li></ul>
<h4>The One Definition Rule (ODR)</h4>
<p>Every non-inline function and variable must be defined <b>exactly once</b> in the whole program; inline functions, templates and classes may be defined in many TUs but <b>every definition must be token-for-token identical</b>. The first half is checked by the linker. The second half is <b>not</b>: if two TUs define <code>inline int limit() { return 10; }</code> and <code>{ return 20; }</code>, the linker silently keeps one. That is an ODR violation: undefined behaviour, no diagnostic.</p>
<h4>Weak symbols</h4>
<p>Inline functions and template instantiations are emitted as <b>weak</b> (COMDAT) symbols: duplicates are allowed and one is picked. A strong definition beats weak ones. <code>__attribute__((weak))</code> lets you provide overridable defaults.</p>`,
    clues: [
      '"<code>undefined reference to</code>" → find who should define it: <code>nm -C lib*.a | grep name</code>; check link order and extern "C"',
      '"<code>multiple definition of</code>" → a definition in a header without <code>inline</code>, or the same object linked twice',
      '"Works in debug, crashes in release / depends on link order" → ODR violation between inline definitions',
      '"<code>error while loading shared libraries: libfoo.so.3: cannot open shared object file</code>" → run-time search path (rpath / LD_LIBRARY_PATH), not a build problem',
      '"<code>relocation R_X86_64_32 against ... recompile with -fPIC</code>" → a static library without PIC linked into a shared library',
      '"Hide internal symbols / faster loading" → <code>-fvisibility=hidden</code> plus explicit export macros'
    ],
    code: [{ lang: 'bash', title: 'Build and inspect both kinds of library', code: `# Static: compile objects, put them in an archive
g++ -std=c++20 -O2 -c add.cpp mul.cpp
ar rcs libmath.a add.o mul.o
nm -C libmath.a               # T add(int, int)  T mul(int, int)

# Shared: position-independent code, a soname that carries the ABI major version
g++ -std=c++20 -O2 -fPIC -fvisibility=hidden -c add.cpp mul.cpp
g++ -shared -Wl,-soname,libmath.so.1 -o libmath.so.1.4.0 add.o mul.o
ln -sf libmath.so.1.4.0 libmath.so.1   # what the loader looks for (soname)
ln -sf libmath.so.1 libmath.so         # what -lmath finds at link time

# Link an app; record where to find the library at run time
g++ main.o -L. -lmath -Wl,-rpath,'$ORIGIN' -o app
readelf -d app | grep -E 'NEEDED|RUNPATH'
ldd ./app` },
    { lang: 'cpp', title: 'Export only the public API from a shared library', code: R`// mathlib_export.h — CMake's GenerateExportHeader writes this file for you
#if defined(_WIN32)
  #ifdef MATHLIB_BUILDING
    #define MATHLIB_API __declspec(dllexport)
  #else
    #define MATHLIB_API __declspec(dllimport)
  #endif
#else
  #define MATHLIB_API __attribute__((visibility("default")))
#endif

// mathlib.h — public API
MATHLIB_API int add(int a, int b);

// mathlib.cpp — compiled with -fvisibility=hidden -DMATHLIB_BUILDING
namespace {                       // internal linkage: never exported, never clashes
int clampSum(long long s) { return s > 2147483647LL ? 2147483647 : (int)s; }
}
MATHLIB_API int add(int a, int b) { return clampSum((long long)a + b); }` }],
    codeTitle: ['Build and inspect both kinds of library', 'Export only the public API from a shared library'],
    viz: {
      title: 'The linker matches references to definitions',
      input: 'main.o D:main U:add U:log; math.o D:add; util.o D:add D:log',
      inputLabel: 'Objects: "name D:sym U:sym W:sym; ..." (D = strong def, W = weak def, U = reference)',
      gen: function (input) {
        var objs = lines(input, '', 6, 'Format: main.o D:main U:add; math.o D:add').map(function (l) {
          var p = l.split(/\s+/), o = { name: p[0], syms: [] };
          p.slice(1).forEach(function (t) { var m = /^([DUW]):([A-Za-z_][\w:]*)$/.exec(t); if (!m) throw new Error('Symbols look like D:add, U:log or W:hook (got "' + t + '")'); o.syms.push([m[1], m[2]]); });
          return o;
        });
        var frames = [], table = {}, rows = [];
        function tbl(hl) { return { type: 'table', label: 'Global symbol table', columns: ['symbol', 'defined by', 'kind', 'wanted by'], rows: rows.map(function (r) { return [r.s, r.def.join(', ') || '—', r.kind || '—', r.ref.join(', ') || '—']; }), hl: hl || {} }; }
        function row(s) { if (!table[s]) { table[s] = { s: s, def: [], ref: [], kind: '' }; rows.push(table[s]); } return table[s]; }
        frames.push({ narr: 'The linker reads every object file in order and builds one <b>global symbol table</b>. D = strong definition, W = weak definition (inline/template), U = a reference that must be resolved.', parts: [{ type: 'array', label: 'Inputs in link order', values: objs.map(function (o) { return o.name; }) }, tbl()] });
        objs.forEach(function (o, i) {
          var hl = {}, notes = [];
          o.syms.forEach(function (x) {
            var r = row(x[1]), idx = rows.indexOf(r);
            if (x[0] === 'U') { r.ref.push(o.name); hl[idx] = r.def.length ? 'ok' : 'cur'; notes.push(x[1] + (r.def.length ? ' already defined' : ' still unresolved')); }
            else if (x[0] === 'D') {
              if (r.kind === 'strong') { r.def.push(o.name); hl[idx] = 'bad'; notes.push('<b>' + x[1] + ': second strong definition!</b>'); }
              else { r.def = [o.name]; r.kind = 'strong'; hl[idx] = 'ok'; notes.push(x[1] + ' defined (strong)'); }
            } else { if (!r.kind) { r.def = [o.name]; r.kind = 'weak'; } hl[idx] = 'win'; notes.push(x[1] + ' weak: kept only if nothing stronger exists'); }
          });
          frames.push({ narr: 'Read <b>' + H.esc(o.name) + '</b>: ' + notes.join('; ') + '.', parts: [{ type: 'array', label: 'Inputs in link order', values: objs.map(function (q) { return q.name; }), hl: one(i, 'cur') }, tbl(hl)] });
        });
        var hl2 = {}, errs = [];
        rows.forEach(function (r, i) {
          if (r.kind === 'strong' && r.def.length > 1) { hl2[i] = 'bad'; errs.push('multiple definition of ' + r.s); }
          else if (!r.kind && r.ref.length) { hl2[i] = 'bad'; errs.push('undefined reference to ' + r.s); }
          else hl2[i] = 'ok';
        });
        frames.push({ narr: errs.length ? 'Link <b>fails</b>: ' + errs.map(H.esc).join('; ') + '. The linker reports every problem it can, then stops.' : 'Every reference has exactly one winning definition, so the link <b>succeeds</b>.', parts: [tbl(hl2), note(errs.length ? errs.map(H.esc).join('<br>') : 'a.out written', 'Linker output')] });
        return frames;
      }
    },
    examples: [
      { title: 'What does the linker do? A function defined in a header', html: `<p><code>util.h</code> contains <code>int twice(int x) { return 2 * x; }</code> and is included by <code>a.cpp</code> and <code>b.cpp</code>. Both objects contain a <b>strong</b> definition, so the link fails with <code>multiple definition of 'twice(int)'</code>. Mark it <code>inline</code> (weak, merged), make it <code>static</code> / put it in an unnamed namespace (each TU gets its own private copy), or move the body to one <code>.cpp</code>.</p>`, code: R`// util.h
#pragma once
inline int twice(int x) { return 2 * x; }   // inline: may appear in many TUs, linker keeps one` },
      { title: 'Calling a C library from C++', html: `<p>A C library exports <code>compress</code>, but C++ mangles the call as <code>_Z8compressPKc</code>, so you get <code>undefined reference to 'compress(char const*)'</code> even though the library is linked. Wrap the C declarations in <code>extern "C"</code>; real C headers do this for you with <code>#ifdef __cplusplus</code>.</p>`, code: R`#ifdef __cplusplus
extern "C" {
#endif
int compress(const char* text);   // C linkage: plain symbol name "compress"
#ifdef __cplusplus
}
#endif` },
      { title: 'A silent ODR violation', html: `<p>Two libraries each have their own <code>struct Config { int timeout; }</code> and <code>struct Config { int timeout; bool verbose; }</code> in the global namespace, with inline member functions. The linker merges <code>Config::Config()</code> and keeps <b>one</b> — code built against the other layout now writes past the object. Symptoms change with link order. Detect with <code>-flto -Wodr</code> (GCC) or AddressSanitizer's <code>detect_odr_violation</code>; prevent with namespaces.</p>`, code: R`namespace net { struct Config { int timeout = 30; }; }
namespace ui  { struct Config { int timeout = 5; bool verbose = false; }; }   // distinct names, no clash` },
      { title: 'Shared library not found at run time', html: `<p>The build succeeds, the program fails: <code>./app: error while loading shared libraries: libmath.so.1</code>. The linker found it via <code>-L</code>, but the <b>dynamic loader</b> searches RUNPATH, <code>LD_LIBRARY_PATH</code>, <code>/etc/ld.so.cache</code> and the default dirs. Embed a relative RUNPATH (<code>$ORIGIN/../lib</code>) — CMake sets <code>BUILD_RPATH</code> automatically and <code>INSTALL_RPATH</code> when you ask. On Windows the DLL must sit next to the <code>.exe</code> or on <code>PATH</code>.</p>`, code: { lang: 'bash', code: `readelf -d app | grep RUNPATH        # (RUNPATH) Library runpath: [$ORIGIN/../lib]
LD_DEBUG=libs ./app 2>&1 | head       # watch the loader search` } }
    ],
    deepDive: `<p><b>How static archives are searched.</b> GNU ld processes inputs <b>left to right, once</b>. When it reaches an archive, it pulls only the members that define a symbol that is <i>currently</i> undefined, and rescans that same archive until nothing new is pulled; then it moves on and never looks back. So <code>g++ -lmath main.o</code> fails (nothing was undefined yet when libmath was scanned) while <code>g++ main.o -lmath</code> works. Libraries must come <b>after</b> their users; mutual dependencies need <code>-Wl,--start-group … --end-group</code> or repetition. lld and mold, and Apple's and Microsoft's linkers, remember all archive symbols and are order-insensitive, which is why "works on Mac, fails on Linux" link bugs exist.</p>
<p><b>PIC, the GOT and the PLT.</b> A shared library can be loaded at any address, so code reaches global data through the Global Offset Table and calls other libraries' functions through Procedure Linkage Table stubs that the loader patches (lazily by default, eagerly with <code>-z now</code>; RELRO makes the GOT read-only afterwards). Calls between two exported functions in the same <code>.so</code> also go through the PLT because of <b>symbol interposition</b> (LD_PRELOAD can replace them). <code>-fvisibility=hidden</code> or <code>-fno-semantic-interposition</code> lets the compiler call directly and inline — often a measurable speedup.</p>
<p><b>Sonames and versioning.</b> <code>libfoo.so.1.4.0</code> is the real file; its embedded <b>soname</b> <code>libfoo.so.1</code> is what dependants record in <code>DT_NEEDED</code>; <code>libfoo.so</code> is the dev symlink used by <code>-lfoo</code>. Bump the major (soname) on ABI breaks. CMake: <code>set_target_properties(foo PROPERTIES VERSION 1.4.0 SOVERSION 1)</code>.</p>
<p><b>Windows specifics.</b> Nothing is exported from a DLL by default; you need <code>__declspec(dllexport)</code> (or CMake's <code>WINDOWS_EXPORT_ALL_SYMBOLS</code>). Linking against a DLL uses its small <b>import library</b> (<code>.lib</code>), confusingly with the same extension as a static library. Each DLL may have its own heap if runtimes differ: free memory in the module that allocated it.</p>
<p><b>Static initialisation order</b> across TUs is unspecified ("static initialization order fiasco"); a global in <code>a.cpp</code> that uses a global from <code>b.cpp</code> during construction may see it uninitialised. Use function-local statics (<code>Meyers singleton</code>) or <code>constinit</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> paste a linker error together with <code>nm -C</code> output and your link line and an assistant will usually pinpoint the cause — wrong order, missing <code>extern "C"</code>, ABI tag, missing <code>-fPIC</code> — faster than searching forums. It is also good at writing export-macro headers and explaining <code>readelf -d</code> output.</p>
<p><b>Where AI goes wrong:</b> the classic bad fix for "multiple definition" is adding <code>-Wl,--allow-multiple-definition</code> or <code>-z muldefs</code>, which hides a real ODR bug. For "cannot open shared object file" it suggests exporting <code>LD_LIBRARY_PATH</code> in a shell profile instead of fixing RUNPATH or install rules. It may also mark everything <code>static</code> in headers, silently duplicating state per TU.</p>
<p><b>What you still own:</b> deciding static vs shared per dependency (licensing, deployment, plugin loading), the exported API surface and its ABI stability promise, and verifying the final binary's <code>NEEDED</code>/<code>RUNPATH</code> entries before shipping.</p>`,
    problems: [{
      title: 'Linker Symbol Resolver: Undefined and Duplicate Symbols', level: 'Medium', tags: ['linker', 'hash map', 'simulation'], companies: ['Microsoft', 'Apple', 'Nvidia'],
      statement: `<p>Each input line describes one object file: its name followed by symbol tokens. <code>D:name</code> is a <b>strong</b> definition, <code>W:name</code> a <b>weak</b> definition, <code>U:name</code> a reference. Report the linker errors, sorted lexicographically:</p>
<ul><li><code>duplicate symbol 'S' in A, B, ...</code> when two or more objects define S strongly (list them in input order).</li>
<li><code>undefined reference to 'S' in A, B, ...</code> when S is referenced but has no definition at all (strong or weak); list the referencing objects in input order.</li></ul>
<p>Weak definitions never conflict: any number of weak definitions plus at most one strong one is fine. Return an empty list when the link succeeds.</p>`,
      constraints: `0 ≤ objects ≤ 10<sup>4</sup>; total symbol tokens ≤ 2·10<sup>5</sup>. An object never lists the same token twice.`,
      example: `<p><code>["a.o D:main U:x", "b.o U:x", "c.o D:y D:main", "d.o D:y"]</code> → <b>${H.c('r', '["duplicate symbol \'main\' in a.o, c.o", "duplicate symbol \'y\' in c.o, d.o", "undefined reference to \'x\' in a.o, b.o"]')}</b>.</p>`,
      brute: { why: `<p>For every symbol token, rescan all objects to see who else defines or references it: O(T²) for T tokens, 4·10<sup>10</sup> in the worst case. The waste: the same lookups are repeated; one pass that builds a table keyed by symbol answers everything.</p>`, code: R`vector<string> resolveSymbolsBrute(vector<string> objs) {
    vector<pair<string, vector<string>>> parsed;      // object name, tokens
    for (auto& line : objs) {
        istringstream in(line); string name, t; in >> name;
        vector<string> toks; while (in >> t) toks.push_back(t);
        parsed.push_back({name, toks});
    }
    set<string> out;
    for (auto& [name, toks] : parsed)
        for (auto& t : toks) {
            string s = t.substr(2);
            vector<string> strong, refs; bool anyDef = false;
            for (auto& [n2, t2] : parsed)
                for (auto& u : t2) if (u.substr(2) == s) {
                    if (u[0] == 'D') strong.push_back(n2);
                    if (u[0] != 'U') anyDef = true; else refs.push_back(n2);
                }
            auto join = [](const vector<string>& v) { string r; for (auto& x : v) r += (r.empty() ? "" : ", ") + x; return r; };
            if (strong.size() > 1) out.insert("duplicate symbol '" + s + "' in " + join(strong));
            if (!anyDef && !refs.empty()) out.insert("undefined reference to '" + s + "' in " + join(refs));
        }
    return vector<string>(out.begin(), out.end());
}` },
      mcq: { q: 'Object a.o has W:hook and U:hook; b.o has D:hook. What does the linker do?', options: ['Error: duplicate symbol hook', 'Error: undefined reference to hook', 'Link succeeds; b.o\'s strong hook wins', 'Link succeeds; a.o\'s weak hook wins because it came first'], answer: 2, explain: 'A strong definition overrides weak ones. That is how inline functions and overridable default hooks work.' },
      hints: [`<p>Hint 1: everything is decided per symbol name, so group the information by symbol: who defines it strongly, who defines it weakly, who references it.</p>`, `<p>Hint 2: one hash map from symbol to a small record {strong owners, has weak, referencing objects}, filled in a single pass in input order (so owner lists stay in input order).</p>`, `<p>Hint 3: after the pass: strong.size() ≥ 2 → duplicate; no strong and no weak but some reference → undefined. Collect messages, sort, return. Empty input → empty output.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'resolveSymbols', cases: [[[["main.o D:main U:add U:log","math.o D:add","log.o D:log"]],[]],[[["main.o D:main U:add","math.o D:add","math2.o D:add"]],["duplicate symbol 'add' in math.o, math2.o"]],[[["main.o D:main U:area U:perimeter","shape.o D:area"]],["undefined reference to 'perimeter' in main.o"]],[[["a.o D:main W:hook U:hook","b.o D:hook"]],[]],[[["a.o D:main W:alloc U:alloc","b.o W:alloc"]],[]],[[["a.o D:main U:x","b.o U:x","c.o D:y D:main","d.o D:y"]],["duplicate symbol 'main' in a.o, c.o","duplicate symbol 'y' in c.o, d.o","undefined reference to 'x' in a.o, b.o"]],[[["solo.o D:main"]],[]],[[[]],[]]] },
      solution: {
        approach: `<p>Single pass: split each line into the object name and its tokens and update an <code>unordered_map&lt;string, Info&gt;</code> keyed by symbol. Then emit one message per bad symbol and sort the messages.</p>`,
        code: R`#include <algorithm>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

vector<string> resolveSymbols(vector<string>& objects) {
    struct Info { vector<string> strong, refs; bool weak = false; };
    unordered_map<string, Info> table;
    for (const string& line : objects) {
        istringstream in(line);
        string obj, tok;
        in >> obj;
        while (in >> tok) {
            Info& info = table[tok.substr(2)];          // "D:add" -> "add"
            if (tok[0] == 'D') info.strong.push_back(obj);
            else if (tok[0] == 'W') info.weak = true;
            else info.refs.push_back(obj);
        }
    }
    auto join = [](const vector<string>& v) {
        string r;
        for (const string& x : v) r += (r.empty() ? "" : ", ") + x;
        return r;
    };
    vector<string> errors;
    for (auto& [sym, info] : table) {
        if (info.strong.size() > 1)
            errors.push_back("duplicate symbol '" + sym + "' in " + join(info.strong));
        if (info.strong.empty() && !info.weak && !info.refs.empty())
            errors.push_back("undefined reference to '" + sym + "' in " + join(info.refs));
    }
    sort(errors.begin(), errors.end());
    return errors;
}`,
        dry: { head: ['line', 'updates', 'table state (strong / weak / refs)'], rows: [['a.o D:main U:x', 'main.strong+=a.o, x.refs+=a.o', 'main{a.o}, x{refs a.o}'], ['b.o U:x', 'x.refs+=b.o', 'x{refs a.o, b.o}'], ['c.o D:y D:main', 'y.strong+=c.o, main.strong+=c.o', H.c('r', 'main{a.o, c.o}') + ', y{c.o}'], ['d.o D:y', 'y.strong+=d.o', H.c('r', 'y{c.o, d.o}')], ['report', '2 duplicates, x undefined', 'sorted: dup main, dup y, undef x']] },
        complexity: `<p>O(T + E log E) for T tokens and E error lines (average-case hashing); O(T) space.</p>`,
        followUps: ['Add static archives: members are pulled only when they define a currently undefined symbol (see practice: single-pass archive linking).', 'Also report which strong definition "won" over each weak one, like <code>-Wl,--trace-symbol</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Header dependencies, include guards, incremental builds
     ====================================================================== */
  topics.push({
    title: 'Header Dependencies, Include Guards and Incremental Rebuilds',
    analogy: `<p>A recipe book where many recipes say "make the house sauce (see page 3)". If you change the sauce on page 3, every recipe that uses it — directly or through another sub-recipe — has to be cooked again, but a recipe that never mentions the sauce does not. A build system is the kitchen manager who keeps the "uses" list for every dish and checks the date on each page, so only the dishes touched by a change are remade.</p>`,
    explain: `<p>The unit of compilation is a <code>.cpp</code> plus <b>every header it includes, transitively</b>. If any of those files is newer than the object file, the object is stale and must be recompiled. Get this list wrong in one direction and builds are slow (rebuild too much); get it wrong in the other and builds are <b>incorrect</b> (stale objects linked in — the worst kind of bug).</p>
<h4>Where the dependency list comes from</h4>
<p>Nobody writes header dependencies by hand. The compiler emits them while compiling: <code>-MMD -MF main.d</code> (GCC/Clang) writes a <b>depfile</b> in Makefile syntax listing every user header that was opened; MSVC prints <code>/showIncludes</code> lines. CMake's Ninja and Makefile generators pass these flags automatically; Ninja stores them in its <code>.ninja_deps</code> log.</p>
<pre><code>main.o: main.cpp app.h util.h config.h</code></pre>
<h4>The rebuild rule (make, Ninja)</h4>
<ol><li>Object missing → build it.</li><li>Any input (source or header in the depfile) has a newer modification time than the object → rebuild it.</li><li>Otherwise it is up to date (equal timestamps count as up to date).</li><li>If any object was rebuilt, relink the targets that use it.</li></ol>
<h4>Include guards and #pragma once</h4>
<p>Guards stop a header from being pasted twice into <b>one</b> TU. They do nothing for build speed across TUs: each <code>.cpp</code> still opens and parses the header. <code>#pragma once</code> is supported by GCC, Clang and MSVC; classic <code>#ifndef</code> guards are fully portable. Either is fine; never both styles inconsistently with copy-pasted guard names (two headers with the same guard macro make one of them silently vanish).</p>
<h4>Cutting dependencies</h4>
<ul><li><b>Forward-declare</b> instead of including when you only use pointers/references.</li><li><b>Pimpl</b>: keep private members in the <code>.cpp</code>, so changing them does not recompile users.</li><li><b>Include what you use</b> (IWYU tool): every file includes exactly the headers it needs.</li><li>Avoid "god headers" like <code>common.h</code> that everything includes — touching it rebuilds the world.</li></ul>`,
    clues: [
      '"I changed a header and the build did not pick it up" → missing depfile / dependency tracking (custom build rule, generated header)',
      '"Touching one header rebuilds 2,000 files" → header fan-in: forward declarations, pimpl, split the header',
      '"Clock skew detected" / builds on network drives → timestamp-based rebuild assumptions broken',
      '"Two different headers, one of them is ignored" → duplicate include-guard macro name',
      '"Incremental build is correct but slow to start" → the build tool stats thousands of files; Ninja is much faster than Make here',
      '"<code>-MMD</code>, <code>.d</code> files, <code>/showIncludes</code>" → compiler-generated dependency lists'
    ],
    code: [{ lang: 'bash', title: 'See the dependencies the compiler discovers', code: `# Write main.d next to main.o: every user header main.cpp opened
g++ -std=c++20 -MMD -MP -c main.cpp -o main.o
cat main.d
# main.o: main.cpp app.h util.h config.h
# app.h:          <- -MP adds phony targets so deleting a header does not break make

# How many times is each header parsed across the project? (Clang)
clang++ -std=c++20 -ftime-trace -c main.cpp -o main.o   # writes main.json for chrome://tracing

# Ninja: why is this file being rebuilt?
ninja -C build -d explain 2>&1 | head
ninja -C build -t deps CMakeFiles/app.dir/main.cpp.o` },
    { lang: 'cpp', title: 'Pimpl: private changes stop rebuilding users', code: R`#include <memory>
#include <string>

// widget.h — users include only this; it never changes when internals change
class Widget {
public:
    Widget();
    ~Widget();                       // defined in the .cpp where Impl is complete
    Widget(Widget&&) noexcept;
    Widget& operator=(Widget&&) noexcept;
    std::string title() const;
private:
    struct Impl;                     // forward declaration only
    std::unique_ptr<Impl> impl_;
};

// widget.cpp — add fields here freely: only widget.cpp recompiles
struct Widget::Impl { std::string title = "hello"; int clicks = 0; };
Widget::Widget() : impl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;
std::string Widget::title() const { return impl_->title; }` }],
    codeTitle: ['See the dependencies the compiler discovers', 'Pimpl: private changes stop rebuilding users'],
    viz: {
      title: 'Touch a header and watch the rebuild spread',
      input: 'main.cpp: app.h util.h; util.cpp: util.h; util.h: config.h; app.h:; config.h:',
      inputLabel: 'Includes "file: included files; ..." (the last header named in the first line\'s chain gets touched)',
      gen: function (input) {
        var g = parseDeps(input, '', 'Format: main.cpp: app.h util.h; util.h: config.h');
        var srcs = g.order.filter(function (n) { return /\.(cpp|cc|cxx)$/.test(n); });
        if (!srcs.length) throw new Error('Name at least one .cpp file');
        var heads = g.order.filter(function (n) { return srcs.indexOf(n) < 0; });
        var touched = heads.length ? heads.filter(function (h) { return !g.deps[h].length; }).pop() || heads[heads.length - 1] : srcs[0];
        var L = layout(g), frames = [];
        frames.push({ narr: 'Each arrow means "includes". Edges come from the compiler\'s depfiles. We will touch <b>' + H.esc(touched) + '</b> (save it with a new timestamp).', parts: [gpart('Include graph', L, one(touched, 'cur'))] });
        var hl = one(touched, 'bad'), changed = {}, frontier = [touched]; changed[touched] = 1;
        var step = 0;
        while (frontier.length && step < 12) {
          step++;
          var next = [];
          g.order.forEach(function (n) { if (!changed[n] && g.deps[n].some(function (d) { return frontier.indexOf(d) >= 0; })) { changed[n] = 1; next.push(n); hl[n] = srcs.indexOf(n) >= 0 ? 'bad' : 'cur'; } });
          if (!next.length) break;
          frames.push({ narr: 'Files that include ' + frontier.map(H.esc).join(', ') + ' are now affected: <b>' + next.map(H.esc).join(', ') + '</b>. A header is affected if anything it includes changed — it is pasted into its users.', parts: [gpart('Include graph', L, Object.assign({}, hl))] });
          frontier = next;
        }
        var re = srcs.filter(function (s) { return changed[s]; }), keep = srcs.filter(function (s) { return !changed[s]; });
        var fin = {}; srcs.forEach(function (s) { fin[s] = changed[s] ? 'bad' : 'ok'; });
        frames.push({ narr: 'Recompile <b>' + (re.map(H.esc).join(', ') || 'nothing') + '</b>' + (keep.length ? '; ' + keep.map(H.esc).join(', ') + ' stay up to date' : '') + '. Then relink. With N files including a hot header, one save costs N compiles — that is why header hygiene matters.', parts: [gpart('Include graph', L, fin), { type: 'table', label: 'Rebuild plan', columns: ['source', 'action'], rows: srcs.map(function (s) { return [s, changed[s] ? 'recompile' : 'up to date']; }), hl: (function () { var h = {}; srcs.forEach(function (s, i) { h[i] = changed[s] ? 'bad' : 'ok'; }); return h; })() }] });
        frames.push({ narr: 'Timestamps are a proxy for "content changed". Tools like ccache hash the preprocessed content instead, so a <code>touch</code> without a real change still hits the cache.', parts: [note('make/Ninja: rebuild if an input mtime &gt; output mtime.<br>ccache: rebuild if hash(preprocessed source + flags + compiler) is new.', 'Two notions of "changed"')] });
        return frames;
      }
    },
    examples: [
      { title: 'Generated headers need an explicit dependency', html: `<p>A script writes <code>version.h</code> at build time. If <code>main.cpp</code> includes it, the very first parallel build can compile <code>main.cpp</code> before the header exists. Depfiles only exist after a successful compile, so the build tool must be told up front: in CMake, list the generated file as a source of the target (or depend on the custom target that generates it).</p>`, code: { lang: 'text', code: `add_custom_command(OUTPUT \${CMAKE_CURRENT_BINARY_DIR}/version.h
  COMMAND \${CMAKE_COMMAND} -DOUT=\${CMAKE_CURRENT_BINARY_DIR}/version.h -P \${CMAKE_CURRENT_SOURCE_DIR}/cmake/gen_version.cmake
  DEPENDS cmake/gen_version.cmake)
target_sources(app PRIVATE \${CMAKE_CURRENT_BINARY_DIR}/version.h)   # build order + dependency
target_include_directories(app PRIVATE \${CMAKE_CURRENT_BINARY_DIR})` } },
      { title: 'Predict the rebuild', html: `<p><code>main.cpp</code> includes <code>app.h</code> and <code>util.h</code>; <code>util.cpp</code> includes <code>util.h</code>; <code>util.h</code> includes <code>config.h</code>. You edit <code>config.h</code>. Both objects rebuild (both reach <code>config.h</code> through <code>util.h</code>). You edit <code>app.h</code>: only <code>main.cpp</code> rebuilds. Then both cases relink <code>app</code>.</p>` },
      { title: 'Duplicate guard name makes a header vanish', html: `<p><code>vec.h</code> and <code>vector2.h</code> were copy-pasted and both use <code>#ifndef VEC_H</code>. Whichever is included second is skipped entirely, so you get <code>'Vector2' was not declared in this scope</code> in a file that clearly includes <code>vector2.h</code>. Use a path-based guard name or <code>#pragma once</code>.</p>`, code: R`// vector2.h
#ifndef GEOMETRY_VECTOR2_H_   // unique: derived from the path
#define GEOMETRY_VECTOR2_H_
struct Vector2 { double x, y; };
#endif` },
      { title: 'Forward declaration saves a rebuild', html: `<p><code>order.h</code> only stores a <code>Customer*</code>. Including <code>customer.h</code> makes every user of <code>order.h</code> rebuild whenever <code>Customer</code> changes. A forward declaration <code>class Customer;</code> is enough for pointers, references, and function declarations taking or returning it by value.</p>`, code: R`class Customer;                       // no #include "customer.h"
struct Order {
    Customer* buyer = nullptr;
    double total = 0;
};` }
    ],
    deepDive: `<p><b>Why timestamps are fragile.</b> mtime-based tools assume clocks are monotonic and that "newer" means "changed". <code>git checkout</code> sets the mtime to now (so switching branches back and forth rebuilds files that are byte-identical), copying with <code>cp -p</code> keeps old times (so a real change can be missed), and network file systems can skew clocks. Content-hash systems (Bazel, Buck2, ccache, sccache) avoid both problems. Ninja additionally records the command line per output in <code>.ninja_log</code>: if flags change, it rebuilds even when no file changed ("restat" and command hashing).</p>
<p><b>Depfile subtleties.</b> <code>-MMD</code> omits system headers (<code>-MD</code> includes them). <code>-MP</code> adds a phony rule per header so make does not fail when a header is deleted. The depfile of a TU is only correct after it compiled successfully; the first build relies on ordering, which is why generated headers must be declared. Ninja reads depfiles once and stores them compactly (<code>deps = gcc</code>), which is why its no-op builds take milliseconds even for 50k files.</p>
<p><b>Measuring header cost.</b> Clang's <code>-ftime-trace</code> plus <i>ClangBuildAnalyzer</i> shows which headers are parsed most and cost the most total time. Typical findings: <code>&lt;regex&gt;</code>, <code>&lt;format&gt;</code>, Boost headers, or a project-wide <code>common.h</code>. Remedies in order of cost: remove unused includes, forward-declare, move code out of headers, precompiled headers, C++20 modules.</p>
<p><b>Templates and inline code.</b> Header-only libraries move compile work into every TU. Extern templates (<code>extern template class std::vector&lt;MyType&gt;;</code> in the header plus one explicit instantiation in a <code>.cpp</code>) let you instantiate once and reuse, cutting both compile time and object size.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can propose forward declarations, generate pimpl boilerplate, and read a <code>-ftime-trace</code> summary to suggest which includes to cut. Agents can even run IWYU and apply the safe parts. This is tedious work that AI does well.</p>
<p><b>Where AI goes wrong:</b> removing an include that "looks unused" but supplies a macro or an overload used through ADL (code still compiles, behaviour changes); forward-declaring standard library types (<code>namespace std { class string; }</code> is undefined behaviour); and adding custom build rules without declaring generated outputs, which works on the author's machine and fails on a clean parallel CI build.</p>
<p><b>What you still own:</b> the include structure as an architecture decision (what is public, what is private), and the habit of verifying incremental correctness: touch a header, rebuild, and check that exactly the expected files recompile (<code>ninja -d explain</code>).</p>`,
    problems: [{
      title: 'Incremental Rebuild Calculator from Header Dependencies', level: 'Medium', tags: ['graph', 'DFS', 'build systems'], companies: ['Google', 'Meta', 'Bloomberg'],
      statement: `<p>You get include edges and modification times. Each line of <code>deps</code> is <code>"file: inc1 inc2 ..."</code> (a <code>.cpp</code> or a header and the files it includes directly; lines may repeat a file to add more edges). Each line of <code>mtimes</code> is <code>"file time"</code>. The object of <code>x.cpp</code> is <code>x.o</code>.</p>
<p>A source must be recompiled when its object is <b>missing</b>, or when any file in its <b>transitive</b> include closure (including the <code>.cpp</code> itself) has a time <b>strictly greater</b> than the object's time. Headers may include each other in a cycle (guards make that legal). A file with no time listed counts as time 0. Return the sources to recompile, sorted. Sources are every <code>.cpp</code> named on the left of a <code>deps</code> line or in <code>mtimes</code>.</p>`,
      constraints: `Up to 10<sup>4</sup> files and 10<sup>5</sup> include edges; times fit in int.`,
      example: `<p>deps <code>["main.cpp: app.h util.h", "util.cpp: util.h", "util.h: config.h"]</code>, config.h has time 9 and both objects have time 5, everything else 1 → <b>${H.c('r', '["main.cpp", "util.cpp"]')}</b>: both reach config.h through util.h.</p>`,
      brute: { why: `<p>For each source, DFS its include closure and take the maximum time: O(S·(V + E)) when many sources share the same big headers — a 10k-file project re-walks the same header trees thousands of times. That is acceptable here (and what the reference does) but a memoised "newest time reachable from this header" would be faster; beware that memoisation on a <b>cyclic</b> include graph needs SCCs to be correct.</p>`, code: R`vector<string> toRebuildBrute(vector<string> deps, vector<string> mtimes) {
    map<string, vector<string>> g; map<string, int> t; set<string> srcs;
    for (auto& l : deps) {
        string a = l.substr(0, l.find(':')); istringstream in(l.substr(l.find(':') + 1)); string x;
        while (in >> x) g[a].push_back(x);
        if (a.size() > 4 && a.substr(a.size() - 4) == ".cpp") srcs.insert(a);
    }
    for (auto& l : mtimes) { istringstream in(l); string f; int v; in >> f >> v; t[f] = v;
        if (f.size() > 4 && f.substr(f.size() - 4) == ".cpp") srcs.insert(f); }
    vector<string> out;
    for (auto& s : srcs) {
        string o = s.substr(0, s.size() - 4) + ".o";
        if (!t.count(o)) { out.push_back(s); continue; }
        set<string> seen; vector<string> st{s}; int newest = 0;
        while (!st.empty()) { string x = st.back(); st.pop_back();
            if (!seen.insert(x).second) continue;
            newest = max(newest, t.count(x) ? t[x] : 0);
            for (auto& y : g[x]) st.push_back(y); }
        if (newest > t[o]) out.push_back(s);
    }
    return out;
}` },
      mcq: { q: 'Include edges can form a cycle (a.h includes b.h, b.h includes a.h). What must the traversal do?', options: ['Nothing special; recursion terminates on its own', 'Keep a visited set so each file is expanded once', 'Reject the input as invalid', 'Sort the files by time first'], answer: 1, explain: 'Guards make cyclic includes legal, so the graph may have cycles. A visited set keeps the DFS finite and linear.' },
      hints: [`<p>Hint 1: "stale" only depends on one number per source: the newest time anywhere in its include closure, compared with the object's time.</p>`, `<p>Hint 2: build an adjacency list from the deps lines and a time map; for each source run an iterative DFS with a visited set, tracking the maximum time.</p>`, `<p>Hint 3: edge cases — object missing → rebuild without looking further; equal times are up to date (strictly greater only); unknown files count as time 0; a source may appear only in mtimes (no includes).</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'toRebuild', cases: [[[["main.cpp: app.h util.h","util.cpp: util.h","util.h: config.h"],["main.cpp 1","util.cpp 1","app.h 1","util.h 1","config.h 9","main.o 5","util.o 5"]],["main.cpp","util.cpp"]],[[["main.cpp: app.h","util.cpp: util.h"],["main.cpp 1","util.cpp 1","app.h 6","util.h 1","main.o 5","util.o 5"]],["main.cpp"]],[[["a.cpp: a.h"],["a.cpp 3","a.h 3","a.o 3"]],[]],[[["a.cpp: a.h","b.cpp: b.h"],["a.cpp 1","a.h 1","b.cpp 1","b.h 1","a.o 2"]],["b.cpp"]],[[["a.cpp: x.h","x.h: y.h","y.h: x.h"],["a.cpp 1","x.h 1","y.h 8","a.o 4"]],["a.cpp"]],[[["a.cpp:","b.cpp:"],["a.cpp 9","b.cpp 2","a.o 4","b.o 4"]],["a.cpp"]],[[["p.cpp: common.h","q.cpp: common.h","r.cpp: other.h"],["p.cpp 1","q.cpp 1","r.cpp 1","common.h 10","other.h 1","p.o 5","q.o 11","r.o 5"]],["p.cpp"]]] },
      solution: {
        approach: `<p>Parse the graph and the times. Collect every <code>.cpp</code> into a sorted <code>std::set</code>. For each one: missing object → rebuild; otherwise iterative DFS over the include closure with a visited set, keep the max time, and rebuild if it is strictly newer than the object.</p>`,
        code: R`#include <map>
#include <set>
#include <sstream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
using namespace std;

static bool isSource(const string& f) { return f.size() > 4 && f.compare(f.size() - 4, 4, ".cpp") == 0; }

vector<string> toRebuild(vector<string>& deps, vector<string>& mtimes) {
    unordered_map<string, vector<string>> includes;
    unordered_map<string, int> time;
    set<string> sources;                                  // sorted output for free
    for (const string& line : deps) {
        size_t colon = line.find(':');
        string file = line.substr(0, colon);
        istringstream in(line.substr(colon + 1));
        for (string inc; in >> inc;) includes[file].push_back(inc);
        if (isSource(file)) sources.insert(file);
    }
    for (const string& line : mtimes) {
        istringstream in(line);
        string file; int t;
        in >> file >> t;
        time[file] = t;
        if (isSource(file)) sources.insert(file);
    }
    auto timeOf = [&](const string& f) { auto it = time.find(f); return it == time.end() ? 0 : it->second; };

    vector<string> stale;
    for (const string& src : sources) {
        string obj = src.substr(0, src.size() - 4) + ".o";
        if (!time.count(obj)) { stale.push_back(src); continue; }   // never built
        int newest = 0;
        unordered_set<string> seen;
        vector<string> stack{src};
        while (!stack.empty()) {                       // iterative DFS: no deep recursion
            string f = stack.back(); stack.pop_back();
            if (!seen.insert(f).second) continue;      // cycles and diamonds expand once
            newest = max(newest, timeOf(f));
            auto it = includes.find(f);
            if (it != includes.end()) for (const string& g : it->second) stack.push_back(g);
        }
        if (newest > time[obj]) stale.push_back(src);  // strictly newer means stale
    }
    return stale;
}`,
        dry: { head: ['source', 'closure', 'newest', 'object time', 'rebuild?'], rows: [['main.cpp', 'main.cpp app.h util.h config.h', '9 (config.h)', '5', H.c('r', 'yes')], ['util.cpp', 'util.cpp util.h config.h', '9 (config.h)', '5', H.c('r', 'yes')], ['(if config.h were 4)', '—', '1', '5', H.c('g', 'no')]] },
        complexity: `<p>O(S·(V + E)) time in the worst case for S sources, V files and E edges; O(V + E) space.</p>`,
        followUps: ['Memoise the newest time per header using strongly connected components so shared headers are walked once.', 'Return the order in which to rebuild and relink, given targets that own the objects.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Modern CMake: targets and usage requirements
     ====================================================================== */
  topics.push({
    title: 'Modern CMake: Targets, target_link_libraries and PUBLIC / PRIVATE / INTERFACE',
    analogy: `<p>Think of targets as <b>companies</b> and <code>target_link_libraries</code> as <b>contracts</b>. When company <i>net</i> hires supplier <i>zlib</i> <b>privately</b>, net's customers never hear about zlib. When net builds its public product on top of <i>core</i> (a <b>PUBLIC</b> dependency), anyone buying from net must also accept core's terms. An <b>INTERFACE</b> clause is a term net imposes only on its customers, not on itself — like a header-only library that has no factory of its own.</p>`,
    explain: `<p>Old CMake set global variables (<code>include_directories</code>, <code>add_definitions</code>, <code>CMAKE_CXX_FLAGS</code>) that leaked into everything. <b>Modern CMake</b> (3.x/4.x) is target-based: each library or executable is a <b>target</b> that carries its own properties, and links between targets propagate the right ones automatically.</p>
<h4>The keywords</h4>
${H.table(['Scope', 'Used to build the target itself?', 'Passed to targets that link to it?', 'Typical use'], [
  ['<code>PRIVATE</code>', 'yes', 'no', 'implementation details: a .cpp uses zlib, headers do not mention it'],
  ['<code>INTERFACE</code>', 'no', 'yes', 'header-only libraries; requirements only consumers need'],
  ['<code>PUBLIC</code>', 'yes', 'yes', 'your public headers include the dependency\'s headers']])}
<p>A target has two sets of each property: the <b>build</b> set (<code>INCLUDE_DIRECTORIES</code>, <code>COMPILE_DEFINITIONS</code>, …) and the <b>usage requirements</b> (<code>INTERFACE_INCLUDE_DIRECTORIES</code>, <code>INTERFACE_COMPILE_DEFINITIONS</code>, …). PRIVATE fills the first, INTERFACE the second, PUBLIC both.</p>
<h4>Propagation rule</h4>
<p>When A links B, A's build uses <b>B's usage requirements</b>. B's usage requirements include those of everything B links PUBLIC or INTERFACE — transitively. A PRIVATE link stops the chain.</p>
<pre><code>add_library(core src/core.cpp)
target_include_directories(core PUBLIC include)
target_compile_features(core PUBLIC cxx_std_20)
target_link_libraries(core PUBLIC fmt::fmt PRIVATE ZLIB::ZLIB)

add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE core)   # app gets: include/, C++20, fmt — not zlib's headers</code></pre>
<p>The linker still receives zlib for the final executable when core is a static library: <b>link</b> dependencies of a static library always propagate (CMake wraps PRIVATE ones as <code>$&lt;LINK_ONLY:…&gt;</code>), only the compile-time requirements are hidden.</p>`,
    clues: [
      '"Consumers can\'t find my library\'s headers" → <code>target_include_directories(lib PUBLIC include)</code>, not PRIVATE',
      '"Header-only library in CMake" → <code>add_library(x INTERFACE)</code> + INTERFACE properties',
      '"Don\'t use <code>include_directories</code> / <code>CMAKE_CXX_FLAGS</code>" → target_* commands with explicit scope',
      '"Why does my app compile with zlib\'s macros?" → something linked zlib PUBLIC that should be PRIVATE',
      '"<code>fmt::fmt</code>, <code>ZLIB::ZLIB</code>" → imported/alias targets: names with <code>::</code> must be targets, so typos fail at configure time',
      '"Transitive dependencies / usage requirements" → INTERFACE_* properties propagated through PUBLIC/INTERFACE links'
    ],
    code: [{ lang: 'text', title: 'A modern, installable library (CMakeLists.txt)', code: `cmake_minimum_required(VERSION 3.28)
project(geo VERSION 1.4.0 LANGUAGES CXX)

add_library(geo src/point.cpp src/polygon.cpp)
add_library(geo::geo ALIAS geo)                    # same name in-tree and after install

target_compile_features(geo PUBLIC cxx_std_20)     # consumers need C++20 too
target_include_directories(geo PUBLIC
  $<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>)
target_compile_definitions(geo PRIVATE GEO_BUILDING)   # only while compiling geo
find_package(fmt CONFIG REQUIRED)
target_link_libraries(geo PUBLIC fmt::fmt)          # geo's headers include <fmt/format.h>

add_library(geo_header_only INTERFACE)              # nothing to compile
target_include_directories(geo_header_only INTERFACE include)

add_executable(demo app/main.cpp)
target_link_libraries(demo PRIVATE geo::geo)        # gets include/, C++20 and fmt

include(GNUInstallDirs)
install(TARGETS geo EXPORT geoTargets)
install(DIRECTORY include/ DESTINATION \${CMAKE_INSTALL_INCLUDEDIR})
install(EXPORT geoTargets NAMESPACE geo:: DESTINATION \${CMAKE_INSTALL_LIBDIR}/cmake/geo)` },
    { lang: 'bash', title: 'Configure, build, inspect', code: `cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
cmake --install build --prefix "$PWD/stage"
# See exactly which flags each file got
cmake -S . -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
grep -m1 '"command"' build/compile_commands.json
# Graph the target dependencies
cmake --graphviz=deps.dot build && dot -Tsvg deps.dot -o deps.svg` }],
    codeTitle: ['A modern, installable library (CMakeLists.txt)', 'Configure, build, inspect'],
    viz: {
      title: 'Propagate usage requirements through PUBLIC / PRIVATE / INTERFACE links',
      input: 'app PRIVATE net; net PUBLIC core; net PRIVATE zlib; core PUBLIC fmt',
      inputLabel: 'Links "consumer SCOPE dependency; ..." (each target defines a macro named after itself, PUBLIC)',
      gen: function (input) {
        var ls = lines(input, '', 8, 'Format: app PRIVATE net; net PUBLIC core');
        var links = [], names = [];
        ls.forEach(function (l) {
          var p = l.split(/\s+/);
          if (p.length !== 3 || !/^(PUBLIC|PRIVATE|INTERFACE)$/.test(p[1])) throw new Error('Each link is "consumer PUBLIC|PRIVATE|INTERFACE dependency"');
          okName(p[0], 'Target names'); okName(p[2], 'Target names');
          links.push(p); [p[0], p[2]].forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
        });
        if (names.length > 8) throw new Error('At most 8 targets');
        var g = { order: names, deps: {} }; names.forEach(function (n) { g.deps[n] = []; });
        links.forEach(function (p) { g.deps[p[0]].push(p[2]); });
        var L = layout(g), ehlLabel = {};
        L.edges = links.map(function (p) { return [p[0], p[2], p[1]]; });
        var root = links[0][0], frames = [];
        function iface(t, seen) {
          if (seen[t]) return []; seen[t] = 1;
          var r = [t.toUpperCase() + '_API'];
          links.forEach(function (p) { if (p[0] === t && p[1] !== 'PRIVATE') iface(p[2], seen).forEach(function (x) { if (r.indexOf(x) < 0) r.push(x); }); });
          return r;
        }
        frames.push({ narr: 'Each target <code>X</code> has <code>target_compile_definitions(X PUBLIC X_API)</code>. Edge labels show the link scope. We ask: which definitions does <b>' + H.esc(root) + '</b> compile with?', parts: [gpart('Targets and links', L, one(root, 'cur'))] });
        var got = [root.toUpperCase() + '_API'], hl = one(root, 'sel');
        frames.push({ narr: 'Its own PUBLIC/PRIVATE settings apply to itself: <b>' + H.esc(got[0]) + '</b>.', parts: [gpart('Targets and links', L, hl), { type: 'set', label: 'Definitions for ' + root, items: got.slice() }] });
        links.filter(function (p) { return p[0] === root; }).forEach(function (p) {
          var add = iface(p[2], {}), eh = {}; eh[root + '-' + p[2]] = 'cur';
          add.forEach(function (x) { if (got.indexOf(x) < 0) got.push(x); });
          var h2 = Object.assign({}, hl); h2[p[2]] = 'ok';
          links.forEach(function (q) { if (add.indexOf(q[2].toUpperCase() + '_API') >= 0 && q[1] !== 'PRIVATE') { h2[q[2]] = 'ok'; eh[q[0] + '-' + q[2]] = 'ok'; } });
          frames.push({ narr: H.esc(root) + ' links <b>' + H.esc(p[2]) + '</b> (' + p[1] + '). Whatever the scope of <i>this</i> edge, ' + H.esc(root) + ' receives ' + H.esc(p[2]) + '\'s <b>usage requirements</b>: its PUBLIC/INTERFACE definitions plus those of everything it links PUBLIC or INTERFACE → ' + add.map(H.esc).join(', ') + '.', parts: [gpart('Targets and links', L, h2, eh), { type: 'set', label: 'Definitions for ' + root, items: got.slice(), hl: (function () { var h = {}; add.forEach(function (x) { h[x] = 'ok'; }); return h; })() }] });
          links.forEach(function (q) { if (q[1] === 'PRIVATE' && q[0] !== root && add.indexOf(q[0].toUpperCase() + '_API') >= 0) {
            var h3 = Object.assign({}, h2); h3[q[2]] = 'bad'; var e3 = Object.assign({}, eh); e3[q[0] + '-' + q[2]] = 'bad';
            frames.push({ narr: H.esc(q[0]) + ' links <b>' + H.esc(q[2]) + '</b> PRIVATE, so ' + H.esc(q[2]) + '\'s requirements stop at ' + H.esc(q[0]) + '. ' + H.esc(root) + ' never sees them (the linker may still get the library file).', parts: [gpart('Targets and links', L, h3, e3), { type: 'set', label: 'Definitions for ' + root, items: got.slice() }] }); } });
        });
        frames.push({ narr: 'Final compile definitions for <b>' + H.esc(root) + '</b>: ' + got.map(H.esc).join(', ') + '. Rule of thumb: PUBLIC when your <b>headers</b> need it, PRIVATE when only your <b>.cpp</b> files do.', parts: [gpart('Targets and links', L, hl), { type: 'set', label: 'Definitions for ' + root, items: got.slice().sort(), hl: {} }] });
        return frames;
      }
    },
    examples: [
      { title: 'PUBLIC or PRIVATE? Decide by looking at the headers', html: `<p><code>net/include/net/client.h</code> has <code>#include &lt;openssl/ssl.h&gt;</code> because a member is an <code>SSL*</code>. Users of <code>client.h</code> therefore need OpenSSL's include path: link <b>PUBLIC</b>. If you hide it behind pimpl and include OpenSSL only in <code>client.cpp</code>, switch to <b>PRIVATE</b> — consumers compile faster and cannot accidentally depend on OpenSSL.</p>`, code: { lang: 'text', code: `target_link_libraries(net
  PUBLIC  OpenSSL::SSL          # appears in net's public headers
  PRIVATE ZLIB::ZLIB)           # used only inside net's .cpp files` } },
      { title: 'Header-only library as an INTERFACE target', html: `<p>An INTERFACE library has no sources and builds nothing; it only carries usage requirements. Linking to it adds its include path, definitions and features to the consumer. Since CMake 3.19 you may list headers as sources so IDEs show them.</p>`, code: { lang: 'text', code: `add_library(ranges_ext INTERFACE)
target_include_directories(ranges_ext INTERFACE include)
target_compile_features(ranges_ext INTERFACE cxx_std_20)
target_compile_definitions(ranges_ext INTERFACE RANGES_EXT_NO_EXCEPTIONS=1)` } },
      { title: 'Why plain library names are dangerous', html: `<p><code>target_link_libraries(app PRIVATE fmt)</code> — if no target <code>fmt</code> exists, CMake silently passes <code>-lfmt</code> to the linker and you get a link error much later (or link a random system copy). Namespaced names like <code>fmt::fmt</code> must be targets, so a typo fails immediately at configure time. Always create an <code>ALIAS</code> with a namespace for your own libraries.</p>`, code: { lang: 'text', code: `CMake Error at CMakeLists.txt:12 (target_link_libraries):
  Target "app" links to:
    fmt::fmtt
  but the target was not found.` } },
      { title: 'Global flags vs target flags', html: `<p>Old style <code>set(CMAKE_CXX_FLAGS "&#36;{CMAKE_CXX_FLAGS} -Wall -Werror")</code> applies to <b>every</b> target, including third-party code pulled in with FetchContent, which then fails to build on new warnings. Put warnings on your own targets, ideally through a small INTERFACE target you link everywhere.</p>`, code: { lang: 'text', code: `add_library(project_warnings INTERFACE)
target_compile_options(project_warnings INTERFACE
  $<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:-Wall -Wextra -Wpedantic>
  $<$<CXX_COMPILER_ID:MSVC>:/W4 /permissive->)
target_link_libraries(geo PRIVATE project_warnings)` } }
    ],
    deepDive: `<p><b>Usage requirements are properties.</b> <code>target_include_directories(t PUBLIC d)</code> appends <code>d</code> to both <code>INCLUDE_DIRECTORIES</code> and <code>INTERFACE_INCLUDE_DIRECTORIES</code> of <code>t</code>. During generation, CMake computes each target's final flags by walking its <code>LINK_LIBRARIES</code> and collecting the dependencies' <code>INTERFACE_*</code> properties, recursively through <code>INTERFACE_LINK_LIBRARIES</code>. Because this happens at <b>generate</b> time, order of commands in the file does not matter and generator expressions can be evaluated per configuration.</p>
<p><b>Static library link propagation.</b> For a static library, PRIVATE link dependencies are still recorded in <code>INTERFACE_LINK_LIBRARIES</code> wrapped as <code>$&lt;LINK_ONLY:dep&gt;</code>: the consumer's link line gets the archive, but not its compile requirements. CMake also orders the link line so archives appear after their users, and repeats strongly connected groups of static libraries (governed by <code>LINK_INTERFACE_MULTIPLICITY</code>) so GNU ld resolves cycles.</p>
<p><b>Imported targets.</b> <code>find_package(fmt CONFIG)</code> loads <code>fmtConfig.cmake</code>, which defines an <code>IMPORTED</code> target <code>fmt::fmt</code> with <code>IMPORTED_LOCATION</code> (the file) and INTERFACE properties. Your exported targets (<code>install(EXPORT …)</code> + <code>CMakePackageConfigHelpers</code>) give downstream users the same experience. Imported targets with <code>SYSTEM</code> (default for imported, and settable with the 3.25 <code>SYSTEM</code> property) get <code>-isystem</code> so their warnings do not fail your <code>-Werror</code> build.</p>
<p><b>Object libraries and cycles.</b> <code>add_library(x OBJECT …)</code> compiles once and lets several targets reuse the objects. Since 3.12 object libraries can be linked like other targets and propagate usage requirements. Mutual dependencies between static libraries are allowed by CMake but are a design smell; shared libraries cannot form cycles.</p>
<p><b>Policies and versions.</b> <code>cmake_minimum_required(VERSION 3.28)</code> sets all policies up to 3.28 to NEW. CMake 4.0 removed compatibility with versions older than 3.5, so ancient projects with <code>cmake_minimum_required(VERSION 2.8)</code> now fail to configure unless you pass <code>-DCMAKE_POLICY_VERSION_MINIMUM=3.5</code> as a stopgap.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write decent CMake quickly, convert old <code>include_directories</code>/<code>CMAKE_CXX_FLAGS</code> projects into target-based ones, and can explain why a consumer did not get a definition if you paste the relevant <code>target_*</code> calls.</p>
<p><b>Where AI goes wrong:</b> it mixes eras — <code>link_directories</code> + bare names, <code>set(CMAKE_CXX_FLAGS …)</code>, <code>FindXXX</code> variables like <code>&#36;{ZLIB_LIBRARIES}</code> instead of <code>ZLIB::ZLIB</code> — and it marks everything PUBLIC "to be safe", which leaks implementation details and slows builds. It also invents properties and commands that do not exist; CMake will tell you, but only for commands, not for misspelled property names in <code>set_target_properties</code>.</p>
<p><b>What you still own:</b> the dependency graph itself — which libraries are public API, which are implementation details — and reviewing scopes in code review the same way you review <code>public</code>/<code>private</code> in a class.</p>`,
    problems: [{
      title: 'Transitive PUBLIC / PRIVATE / INTERFACE Usage-Requirement Propagation', level: 'Medium', tags: ['graph', 'DFS', 'memoisation', 'CMake'], companies: ['Microsoft', 'Kitware', 'Qualcomm'],
      statement: `<p>Simulate CMake's propagation of compile definitions. Each line is one of:</p>
<ul><li><code>def T SCOPE NAME</code> — <code>target_compile_definitions(T SCOPE NAME)</code></li><li><code>link T SCOPE D</code> — <code>target_link_libraries(T SCOPE D)</code></li></ul>
<p>SCOPE is PUBLIC, PRIVATE or INTERFACE. Return the sorted, de-duplicated definitions used to <b>compile</b> target <code>query</code>:</p>
<ul><li>its own PRIVATE and PUBLIC definitions, plus</li><li>the <b>interface definitions</b> of every target it links directly (any scope), where interface(T) = T's PUBLIC and INTERFACE definitions ∪ interface(D) for every D that T links PUBLIC or INTERFACE.</li></ul>
<p>Targets that appear only in links (imported, nothing defined) contribute nothing. Link cycles may exist; each target contributes once.</p>`,
      constraints: `≤ 10<sup>4</sup> lines; ≤ 2000 targets.`,
      example: `<p>core: PUBLIC CORE_API, PRIVATE CORE_BUILD, links fmt PUBLIC (fmt: INTERFACE FMT_HEADER_ONLY). net: PRIVATE NET_IMPL, links core PUBLIC and zlib PRIVATE (zlib: PUBLIC ZLIB_CONST). app links net PRIVATE.<br>Query <code>app</code> → <b>${H.c('g', '["CORE_API", "FMT_HEADER_ONLY"]')}</b>: NET_IMPL is private to net, ZLIB_CONST stops at net's PRIVATE link, CORE_BUILD is private to core.</p>`,
      brute: { why: `<p>Recompute interface(T) from scratch every time it is needed, walking all lines to find T's definitions and links: in a diamond-heavy graph the same targets are recomputed exponentially many times, and a link cycle loops forever without a visited set.</p>`, code: R`set<string> ifaceBrute(const vector<string>& lines, const string& t, set<string> path) {
    set<string> r;
    if (path.count(t)) return r;
    path.insert(t);
    for (auto& l : lines) {
        istringstream in(l); string kind, tgt, scope, x; in >> kind >> tgt >> scope >> x;
        if (tgt != t || scope == "PRIVATE") continue;
        if (kind == "def") r.insert(x);
        else for (auto& y : ifaceBrute(lines, x, path)) r.insert(y);   // recomputed every time
    }
    return r;
}
vector<string> compileDefinitionsBrute(vector<string> lines, string q) {
    set<string> r;
    for (auto& l : lines) {
        istringstream in(l); string kind, tgt, scope, x; in >> kind >> tgt >> scope >> x;
        if (tgt != q) continue;
        if (kind == "def" && scope != "INTERFACE") r.insert(x);
        if (kind == "link") for (auto& y : ifaceBrute(lines, x, {q})) r.insert(y);
    }
    return vector<string>(r.begin(), r.end());
}` },
      mcq: { q: 'core links fmt PRIVATE. app links core PUBLIC. Does app compile with fmt\'s INTERFACE definitions?', options: ['Yes, because app\'s link is PUBLIC', 'No, because core\'s link to fmt is PRIVATE', 'Only in Debug builds', 'Only if fmt is a shared library'], answer: 1, explain: 'The scope that matters for fmt is the one on the core → fmt edge. PRIVATE stops fmt\'s usage requirements at core, regardless of how app links core.' },
      hints: [`<p>Hint 1: separate two questions — what does a target need to compile itself, and what does it hand to its consumers (its interface)?</p>`, `<p>Hint 2: interface(T) is a recursive function over PUBLIC/INTERFACE edges only; memoise it in a map, and guard recursion with an "in progress" set for cycles.</p>`, `<p>Hint 3: the query uses PRIVATE + PUBLIC own definitions, then unions interface(D) for every direct link regardless of that edge's scope. Collect into a std::set for sorted, unique output.</p>`],
      tests: { sig: 'string[] string -> string[]', fn: 'compileDefinitions', cases: [[[["def core PUBLIC CORE_API","def core PRIVATE CORE_BUILD","def fmt INTERFACE FMT_HEADER_ONLY","link core PUBLIC fmt","def zlib PUBLIC ZLIB_CONST","link net PRIVATE zlib","link net PUBLIC core","def net PRIVATE NET_IMPL","link app PRIVATE net"],"app"],["CORE_API","FMT_HEADER_ONLY"]],[[["def core PUBLIC CORE_API","def core PRIVATE CORE_BUILD","def fmt INTERFACE FMT_HEADER_ONLY","link core PUBLIC fmt","def zlib PUBLIC ZLIB_CONST","link net PRIVATE zlib","link net PUBLIC core","def net PRIVATE NET_IMPL","link app PRIVATE net"],"net"],["CORE_API","FMT_HEADER_ONLY","NET_IMPL","ZLIB_CONST"]],[[["def core PUBLIC CORE_API","def core PRIVATE CORE_BUILD","def fmt INTERFACE FMT_HEADER_ONLY","link core PUBLIC fmt","def zlib PUBLIC ZLIB_CONST","link net PRIVATE zlib","link net PUBLIC core","def net PRIVATE NET_IMPL","link app PRIVATE net"],"core"],["CORE_API","CORE_BUILD","FMT_HEADER_ONLY"]],[[["def core PUBLIC CORE_API","def core PRIVATE CORE_BUILD","def fmt INTERFACE FMT_HEADER_ONLY","link core PUBLIC fmt","def zlib PUBLIC ZLIB_CONST","link net PRIVATE zlib","link net PUBLIC core","def net PRIVATE NET_IMPL","link app PRIVATE net"],"fmt"],[]],[[["def a INTERFACE ONLY_USERS","def a PRIVATE ONLY_ME"],"a"],["ONLY_ME"]],[[["def a INTERFACE X","link b INTERFACE a","link c PRIVATE b"],"c"],["X"]],[[["def a INTERFACE X","link b INTERFACE a"],"b"],["X"]],[[["def a PUBLIC A","def b PUBLIC B","link a PUBLIC b","link b PUBLIC a","link app PRIVATE a"],"app"],["A","B"]],[[["link app PRIVATE ghost"],"app"],[]]] },
      solution: {
        approach: `<p>Index definitions and links per target. Compute interface sets with a memoised DFS that follows only PUBLIC/INTERFACE links, skipping targets already on the current path (cycles). The answer is the union of the query's own PRIVATE/PUBLIC definitions and the interface sets of its direct dependencies.</p>`,
        code: R`#include <map>
#include <set>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

class Propagator {
    map<string, vector<pair<string, string>>> defs, links;   // target -> (scope, value)
    map<string, set<string>> memo;
    set<string> onPath;

public:
    explicit Propagator(const vector<string>& lines) {
        for (const string& line : lines) {
            istringstream in(line);
            string kind, target, scope, value;
            in >> kind >> target >> scope >> value;
            (kind == "def" ? defs : links)[target].push_back({scope, value});
        }
    }
    // What consumers of t receive: PUBLIC/INTERFACE defs, plus interface of PUBLIC/INTERFACE links.
    const set<string>& interfaceOf(const string& t) {
        static const set<string> none;
        if (auto it = memo.find(t); it != memo.end()) return it->second;
        if (onPath.count(t)) return none;                // link cycle: already being expanded
        onPath.insert(t);
        set<string> result;
        for (auto& [scope, d] : defs[t]) if (scope != "PRIVATE") result.insert(d);
        for (auto& [scope, dep] : links[t])
            if (scope != "PRIVATE") { const set<string>& sub = interfaceOf(dep); result.insert(sub.begin(), sub.end()); }
        onPath.erase(t);
        return memo[t] = result;
    }
    vector<string> compileDefs(const string& q) {
        set<string> result;
        for (auto& [scope, d] : defs[q]) if (scope != "INTERFACE") result.insert(d);   // own build
        onPath.insert(q);
        for (auto& [scope, dep] : links[q]) { const set<string>& sub = interfaceOf(dep); result.insert(sub.begin(), sub.end()); }
        onPath.erase(q);
        return vector<string>(result.begin(), result.end());
    }
};

vector<string> compileDefinitions(vector<string>& lines, string query) {
    return Propagator(lines).compileDefs(query);
}`,
        dry: { head: ['call', 'own interface defs', 'follows', 'result'], rows: [['interfaceOf(fmt)', 'FMT_HEADER_ONLY', '—', '{FMT_HEADER_ONLY}'], ['interfaceOf(core)', 'CORE_API (CORE_BUILD is PRIVATE)', 'fmt (PUBLIC)', '{CORE_API, FMT_HEADER_ONLY}'], ['interfaceOf(net)', 'none (NET_IMPL is PRIVATE)', 'core (PUBLIC); zlib skipped (PRIVATE)', '{CORE_API, FMT_HEADER_ONLY}'], ['compileDefs(app)', 'none', 'net', H.c('g', 'CORE_API, FMT_HEADER_ONLY')]] },
        complexity: `<p>Each target's interface is computed once: O((L + D) log D) for L lines and D distinct definitions per set merge in the worst case.</p>`,
        followUps: ['Model <code>$&lt;LINK_ONLY:…&gt;</code>: return the full static link line as well as the compile definitions.', 'Report which targets leak a PRIVATE-looking dependency through a PUBLIC link (a lint rule).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Build types, flags, presets and generator expressions
     ====================================================================== */
  topics.push({
    title: 'Build Types, Compiler Flags, Presets and Generator Expressions',
    analogy: `<p>A car factory builds the same model in different <b>trims</b>: a test-track version full of sensors (Debug), a showroom version tuned for speed (Release), and a showroom version that still carries a black box recorder (RelWithDebInfo). <b>Generator expressions</b> are the sticky notes on the assembly instructions: "<i>only for the test-track trim: add sensors</i>". The notes are written once, read later, when the factory knows which trim it is building.</p>`,
    explain: `<h4>Build types (configurations)</h4>
${H.table(['Config', 'GCC/Clang flags CMake adds', 'MSVC', 'Use for'], [
  ['Debug', '<code>-g</code> (-O0)', '<code>/Zi /Ob0 /Od /RTC1</code>', 'stepping in a debugger'],
  ['Release', '<code>-O3 -DNDEBUG</code>', '<code>/O2 /Ob2 /DNDEBUG</code>', 'shipping'],
  ['RelWithDebInfo', '<code>-O2 -g -DNDEBUG</code>', '<code>/Zi /O2 /Ob1 /DNDEBUG</code>', 'profiling, crash dumps from production'],
  ['MinSizeRel', '<code>-Os -DNDEBUG</code>', '<code>/O1 /Ob1 /DNDEBUG</code>', 'embedded, download size']])}
<p><b>Single-config generators</b> (Ninja, Unix Makefiles) pick one at configure time: <code>-DCMAKE_BUILD_TYPE=Release</code>. If you leave it empty, you get <b>no</b> optimisation flags at all. <b>Multi-config generators</b> (Visual Studio, Xcode, Ninja Multi-Config) pick at build time: <code>cmake --build build --config Release</code>. Code that does <code>if(CMAKE_BUILD_TYPE STREQUAL "Debug")</code> is therefore wrong for multi-config builds: the variable is empty at configure time.</p>
<h4>Generator expressions: decide at generate time</h4>
<p><code>$&lt;...&gt;</code> expressions are evaluated when CMake writes the build files, separately for each configuration and target. They are the correct way to vary settings by config, compiler, platform or language.</p>
<ul><li><code>$&lt;CONFIG:Debug&gt;</code> → 1 or 0. <code>$&lt;$&lt;CONFIG:Debug&gt;:-fsanitize=address&gt;</code> → the text only in Debug.</li>
<li><code>$&lt;IF:cond,a,b&gt;</code>, <code>$&lt;NOT:…&gt;</code>, <code>$&lt;AND:…&gt;</code>, <code>$&lt;OR:…&gt;</code>.</li>
<li><code>$&lt;CXX_COMPILER_ID:GNU,Clang&gt;</code>, <code>$&lt;PLATFORM_ID:Windows&gt;</code>, <code>$&lt;COMPILE_LANGUAGE:CXX&gt;</code>.</li>
<li><code>$&lt;TARGET_FILE:app&gt;</code> (path of the built file), <code>$&lt;BUILD_INTERFACE:…&gt;</code> / <code>$&lt;INSTALL_INTERFACE:…&gt;</code>.</li>
<li>Escapes: <code>$&lt;COMMA&gt;</code>, <code>$&lt;ANGLE-R&gt;</code>, <code>$&lt;SEMICOLON&gt;</code>.</li></ul>
<h4>Presets</h4>
<p><code>CMakePresets.json</code> (committed) and <code>CMakeUserPresets.json</code> (personal, git-ignored) store generator, cache variables, toolchain and build/test options under a name: <code>cmake --preset release</code>, <code>cmake --build --preset release</code>, <code>ctest --preset release</code>, and since 3.25 <code>cmake --workflow --preset ci</code> runs them all in order.</p>`,
    clues: [
      '"Release build is as slow as debug" → <code>CMAKE_BUILD_TYPE</code> was empty with a single-config generator',
      '"Flag only in Debug / only with MSVC" → generator expression, not <code>if(CMAKE_BUILD_TYPE …)</code>',
      '"Works on Ninja, wrong on Visual Studio" → configure-time check of a build-time choice (multi-config)',
      '"Reproduce CI exactly on my machine" → CMakePresets.json',
      '"Need <code>assert</code> in production" → Release adds <code>-DNDEBUG</code>; use your own always-on check macro',
      '"IDE / clangd cannot find headers" → <code>CMAKE_EXPORT_COMPILE_COMMANDS=ON</code>'
    ],
    code: [{ lang: 'text', title: 'Flags per configuration, the modern way', code: `# Sanitizers in Debug only, for GCC/Clang only
target_compile_options(app PRIVATE
  $<$<AND:$<CONFIG:Debug>,$<CXX_COMPILER_ID:GNU,Clang>>:-fsanitize=address,undefined -fno-omit-frame-pointer>)
target_link_options(app PRIVATE
  $<$<AND:$<CONFIG:Debug>,$<CXX_COMPILER_ID:GNU,Clang>>:-fsanitize=address,undefined>)

# A definition that differs by config
target_compile_definitions(app PRIVATE APP_LOG_LEVEL=$<IF:$<CONFIG:Debug>,4,2>)

# LTO only where supported
include(CheckIPOSupported)
check_ipo_supported(RESULT ipo_ok OUTPUT ipo_msg)
if(ipo_ok)
  set_property(TARGET app PROPERTY INTERPROCEDURAL_OPTIMIZATION_RELEASE ON)
endif()

# Static MSVC runtime in Release, DLL runtime in Debug (CMake 3.15+, policy CMP0091)
set_property(TARGET app PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")

# Debug a genex: write the evaluated value to a file at generate time
file(GENERATE OUTPUT \${CMAKE_BINARY_DIR}/genex-$<CONFIG>.txt CONTENT "level=$<IF:$<CONFIG:Debug>,4,2>\\n")` },
    { lang: 'json', title: 'CMakePresets.json (schema version 6, CMake 3.25+)', code: `{
  "version": 6,
  "configurePresets": [
    { "name": "base", "hidden": true, "generator": "Ninja", "binaryDir": "build/\${presetName}",
      "cacheVariables": { "CMAKE_EXPORT_COMPILE_COMMANDS": "ON" } },
    { "name": "debug", "inherits": "base", "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug" } },
    { "name": "release", "inherits": "base", "cacheVariables": { "CMAKE_BUILD_TYPE": "Release" } }
  ],
  "buildPresets": [ { "name": "release", "configurePreset": "release" } ],
  "testPresets": [ { "name": "release", "configurePreset": "release", "output": { "outputOnFailure": true } } ],
  "workflowPresets": [ { "name": "ci", "steps": [
    { "type": "configure", "name": "release" }, { "type": "build", "name": "release" }, { "type": "test", "name": "release" } ] } ]
}` }],
    codeTitle: ['Flags per configuration, the modern way', 'CMakePresets.json (schema version 6, CMake 3.25+)'],
    viz: {
      title: 'Evaluate generator expressions for one configuration',
      input: 'Release',
      inputLabel: 'Configuration (Debug, Release, RelWithDebInfo, MinSizeRel)',
      gen: function (input) {
        var cfg = String(input || '').trim();
        if (!/^[A-Za-z]{1,20}$/.test(cfg)) throw new Error('Type a configuration name such as Debug or Release');
        var low = cfg.toLowerCase();
        var base = { debug: '-g', release: '-O3 -DNDEBUG', relwithdebinfo: '-O2 -g -DNDEBUG', minsizerel: '-Os -DNDEBUG' }[low];
        var isDbg = low === 'debug' ? '1' : '0';
        var exprs = [
          ['$<CONFIG:Debug>', isDbg, 'CONFIG compares case-insensitively with the current configuration.'],
          ['$<$<CONFIG:Debug>:-fsanitize=address>', isDbg === '1' ? '-fsanitize=address' : '(empty)', 'Condition 1 → keep the text, 0 → empty string. The inner expression is evaluated first.'],
          ['APP_LOG_LEVEL=$<IF:$<CONFIG:Debug>,4,2>', 'APP_LOG_LEVEL=' + (isDbg === '1' ? '4' : '2'), 'IF picks the 2nd or 3rd argument.'],
          ['$<$<NOT:$<CONFIG:Debug>>:-flto=auto>', isDbg === '1' ? '(empty)' : '-flto=auto', 'NOT flips 0/1. Every non-Debug config gets LTO here.'],
          ['$<$<CONFIG:Debug,RelWithDebInfo>:ENABLE_TRACE>', (low === 'debug' || low === 'relwithdebinfo') ? 'ENABLE_TRACE' : '(empty)', 'CONFIG accepts a comma-separated list (CMake 3.19+).']
        ];
        var rows = [], frames = [];
        frames.push({ narr: 'CMake first adds the built-in flags for <b>' + H.esc(cfg) + '</b>: ' + (base ? '<code>' + base + '</code>' : '<b>none</b> — an unknown or empty build type adds no optimisation flags at all') + '.', parts: [{ type: 'vars', label: 'Configuration', vals: (function () { var v = { CONFIG: cfg }; v['CMAKE_CXX_FLAGS_' + cfg.toUpperCase()] = base || '(empty)'; return v; })() }] });
        exprs.forEach(function (e, i) {
          rows.push([e[0], e[1]]);
          frames.push({ narr: e[2], parts: [{ type: 'vars', label: 'Configuration', vals: { CONFIG: cfg } }, { type: 'table', label: 'Generator expressions → value for ' + cfg, columns: ['expression', 'value'], rows: rows.slice(), hl: one(i, e[1] === '(empty)' || e[1] === '0' ? 'bad' : 'ok') }] });
        });
        var final = [base || ''].concat(rows.slice(1).map(function (r) { return r[1]; }).filter(function (v) { return v !== '(empty)'; })).filter(Boolean);
        frames.push({ narr: 'The generated build file for <b>' + H.esc(cfg) + '</b> contains these flags. With a multi-config generator this happens once per configuration, which is why genexes work where <code>if(CMAKE_BUILD_TYPE)</code> fails.', parts: [note('<code>' + H.esc(final.join(' ')) + '</code>', 'Compile command fragment')] });
        return frames;
      }
    },
    examples: [
      { title: 'The empty build type trap', html: `<p><code>cmake -S . -B build -G Ninja</code> with no <code>CMAKE_BUILD_TYPE</code> builds with <b>no</b> -O flag and no -g: slow and hard to debug. Many projects set a default only when the user did not choose one and the generator is single-config.</p>`, code: { lang: 'text', code: `get_property(is_multi GLOBAL PROPERTY GENERATOR_IS_MULTI_CONFIG)
if(NOT is_multi AND NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING "Build type" FORCE)
endif()` } },
      { title: 'Predict the value', html: `<p>For config <code>Release</code>: <code>-O$&lt;IF:$&lt;CONFIG:Release&gt;,3,0&gt;</code> → <b>-O3</b>. <code>$&lt;$&lt;CONFIG:Debug&gt;:-g&gt;</code> → empty. <code>$&lt;1:a,b&gt;</code> → <b>a,b</b> (after the colon, commas are just text). <code>$&lt;2:x&gt;</code> → error: a condition must be exactly 0 or 1.</p>` },
      { title: 'Assertions that survive Release', html: `<p>Release builds define <code>NDEBUG</code>, so <code>assert(p != nullptr)</code> disappears. For invariants that must hold in production (input validation, security checks), use an always-on check.</p>`, code: R`#include <cstdio>
#include <cstdlib>
#define CHECK(cond) do { if (!(cond)) { std::fprintf(stderr, "check failed: %s at %s:%d\n", #cond, __FILE__, __LINE__); std::abort(); } } while (0)
int parsePort(int p) { CHECK(p > 0 && p < 65536); return p; }` },
      { title: 'Hardening flags for release binaries', html: `<p>Production Linux builds commonly add <code>-D_FORTIFY_SOURCE=3</code> (needs optimisation), <code>-fstack-protector-strong</code>, <code>-fstack-clash-protection</code>, <code>-fcf-protection</code> (x86 CET), <code>-D_GLIBCXX_ASSERTIONS</code> (cheap bounds checks in libstdc++), and link with <code>-Wl,-z,relro,-z,now</code> and PIE (<code>CMAKE_POSITION_INDEPENDENT_CODE ON</code> plus policy CMP0083). GCC 14 also offers <code>-fhardened</code> as a bundle.</p>`, code: { lang: 'text', code: `target_compile_options(app PRIVATE
  $<$<CXX_COMPILER_ID:GNU,Clang>:-fstack-protector-strong -D_GLIBCXX_ASSERTIONS>)
target_link_options(app PRIVATE $<$<PLATFORM_ID:Linux>:-Wl,-z,relro,-z,now>)` } }
    ],
    deepDive: `<p><b>Where flags come from, in order.</b> For each source file CMake concatenates: <code>CMAKE_CXX_FLAGS</code>, <code>CMAKE_CXX_FLAGS_&lt;CONFIG&gt;</code>, then the target's <code>COMPILE_OPTIONS</code> (including propagated INTERFACE options), then source-file properties. Definitions and include directories are added separately. Because later flags win for <code>-O</code>, a target option can override the config default. <code>CMAKE_CXX_FLAGS</code> is meant for the <b>user</b> (command line, presets, toolchain files), not for project code.</p>
<p><b>Language standard.</b> Prefer <code>target_compile_features(t PUBLIC cxx_std_20)</code>; it propagates to consumers and CMake picks the right flag per compiler. <code>CMAKE_CXX_STANDARD</code> + <code>CMAKE_CXX_STANDARD_REQUIRED ON</code> + <code>CMAKE_CXX_EXTENSIONS OFF</code> set a project default. Without <code>EXTENSIONS OFF</code> you get <code>-std=gnu++20</code>.</p>
<p><b>Generator expression evaluation.</b> Expressions are evaluated per target and per configuration during generation, after the whole project has been configured. That is why <code>message("$&lt;CONFIG&gt;")</code> prints the literal text: <code>message</code> runs at configure time. Use <code>file(GENERATE)</code> or <code>cmake --build . --target help</code> to inspect, or read <code>compile_commands.json</code>. Conditions must be exactly <code>0</code> or <code>1</code>; use <code>$&lt;BOOL:…&gt;</code> to convert strings like <code>ON</code>, <code>TRUE</code>, <code>NO</code>.</p>
<p><b>LTO.</b> <code>INTERPROCEDURAL_OPTIMIZATION</code> adds <code>-flto=auto</code> (GCC) or <code>-flto=thin</code>/<code>-flto</code> (Clang) and uses the matching <code>gcc-ar</code>/<code>llvm-ar</code> so archives keep LTO bitcode. ThinLTO scales to large codebases with incremental caching. LTO also catches some ODR violations (<code>-Wodr</code>).</p>
<p><b>Debug info at scale.</b> <code>-gsplit-dwarf</code> moves most debug info out of objects into <code>.dwo</code> files so links are faster; <code>-gz</code> compresses sections. On Windows, <code>/Z7</code> embeds debug info in objects (cache-friendly for ccache/sccache) while <code>/Zi</code> uses a shared PDB server (needs <code>/FS</code> for parallel builds). CMake 3.25 added <code>CMAKE_MSVC_DEBUG_INFORMATION_FORMAT</code> to choose.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating presets, warning sets and sanitizer configurations is fast and mostly right. Assistants are also good at reading a long <code>compile_commands.json</code> entry and explaining which flag came from where.</p>
<p><b>Where AI goes wrong:</b> the most common mistakes are configure-time logic for build-time choices (<code>if(CMAKE_BUILD_TYPE STREQUAL Debug)</code> in a project that must work with Visual Studio), stuffing everything into <code>CMAKE_CXX_FLAGS</code>, using <code>-O3 -march=native</code> in packages that will run on other machines, and malformed generator expressions with spaces or unescaped commas (a space inside a genex in a quoted argument is fine, unquoted it splits the argument).</p>
<p><b>What you still own:</b> the release flag policy — optimisation level, hardening, LTO, debug info and symbol stripping — and proof that the shipped binary was built with it (check <code>compile_commands.json</code> or the binary's notes, e.g. <code>readelf -p .GCC.command.line</code> with <code>-frecord-gcc-switches</code>).</p>`,
    problems: [{
      title: 'Mini Generator-Expression Evaluator', level: 'Hard', tags: ['parsing', 'recursion', 'strings', 'CMake'], companies: ['Kitware', 'Microsoft', 'JetBrains'],
      statement: `<p>Evaluate a string containing CMake-style generator expressions for configuration <code>config</code>. Text outside <code>$&lt;…&gt;</code> is copied. Supported forms (the head before the first top-level <code>:</code> may itself contain expressions):</p>
<ul><li><code>$&lt;CONFIG:c1,c2,…&gt;</code> → <code>1</code> if config equals any entry case-insensitively, else <code>0</code>.</li>
<li><code>$&lt;0:text&gt;</code> → empty; <code>$&lt;1:text&gt;</code> → text (commas inside text are kept).</li>
<li><code>$&lt;NOT:b&gt;</code>, <code>$&lt;AND:b,…&gt;</code>, <code>$&lt;OR:b,…&gt;</code> — every argument must be 0 or 1.</li>
<li><code>$&lt;IF:b,x,y&gt;</code> — exactly three arguments, b must be 0 or 1.</li>
<li><code>$&lt;COMMA&gt;</code> → <code>,</code> and <code>$&lt;ANGLE-R&gt;</code> → <code>&gt;</code>.</li></ul>
<p>Arguments are split on commas at the top level only (not inside nested expressions). Return <code>"ERROR"</code> for anything invalid: unknown head, a condition that is not 0/1, wrong argument count, an unclosed <code>$&lt;</code>, or a stray <code>&gt;</code> outside an expression.</p>`,
      constraints: `|expr| ≤ 10<sup>4</sup>; nesting depth ≤ 50.`,
      example: `<p><code>"-O$&lt;IF:$&lt;CONFIG:Release&gt;,3,0&gt;"</code>, config <code>Release</code> → <b>${H.c('g', '"-O3"')}</b>. <code>"$&lt;$&lt;CONFIG:debug,RelWithDebInfo&gt;:LOG_ON&gt;"</code>, config <code>DEBUG</code> → <b>"LOG_ON"</b>. <code>"$&lt;2:x&gt;"</code> → <b>"ERROR"</b>.</p>`,
      brute: { why: `<p>Repeatedly find an <b>innermost</b> <code>$&lt;…&gt;</code> (one with no <code>$&lt;</code> inside), evaluate it and splice the result back in, until none remain. Each round rescans the whole string, so it is O(n²) for deeply nested input. Worse, it is <b>wrong</b>: after splicing, a result containing <code>,</code> or <code>&gt;</code> (from <code>$&lt;COMMA&gt;</code> / <code>$&lt;ANGLE-R&gt;</code>) is re-parsed as syntax. Escapes only work if you parse structure first, then evaluate.</p>`, code: R`string evalInnermostBrute(string s, string cfg) {
    for (int round = 0; round < 1000; round++) {
        size_t open = string::npos;
        for (size_t i = 0; i + 1 < s.size(); i++) if (s[i] == '$' && s[i + 1] == '<') open = i;   // last "$<"
        if (open == string::npos) return s;
        size_t close = s.find('>', open);
        if (close == string::npos) return "ERROR";
        string inner = s.substr(open + 2, close - open - 2), val;
        size_t colon = inner.find(':');
        string head = inner.substr(0, colon), arg = colon == string::npos ? "" : inner.substr(colon + 1);
        if (head == "1") val = arg; else if (head == "0") val = "";
        else if (head == "COMMA") val = ",";          // BUG: this comma is later re-read as a separator
        else if (head == "CONFIG") { string a = arg, c = cfg;
            for (auto& ch : a) ch = tolower(ch); for (auto& ch : c) ch = tolower(ch);
            val = a == c ? "1" : "0"; }               // also ignores lists
        else return "ERROR";
        s = s.substr(0, open) + val + s.substr(close + 1);
    }
    return "ERROR";
}` },
      mcq: { q: 'Why can\'t you split <code>$&lt;IF:$&lt;CONFIG:A,B&gt;,x,y&gt;</code> on every comma?', options: ['Commas are illegal in CMake', 'The commas inside the nested CONFIG list belong to the inner expression; only top-level commas separate IF\'s arguments', 'IF only takes one argument', 'Splitting must happen after evaluation'], answer: 1, explain: 'Track nesting depth: increase on <code>$&lt;</code>, decrease on <code>&gt;</code>, and split only when the depth is 0.' },
      hints: [`<p>Hint 1: parse structure before evaluating. For each <code>$&lt;</code>, find its matching <code>&gt;</code> by counting depth (every <code>$&lt;</code> opens, every <code>&gt;</code> closes).</p>`, `<p>Hint 2: inside, split once at the first top-level ':' into head and rest. Evaluate the head recursively. If it is 0/1, the rest is plain text (evaluate it as a whole). Otherwise split the rest at top-level commas and evaluate each argument.</p>`, `<p>Hint 3: throw an exception for every error case and catch it once at the top to return "ERROR". Compare CONFIG names after lower-casing both. Escapes produce characters only after parsing, so they never act as syntax.</p>`],
      tests: { sig: 'string string -> string', fn: 'evalGenex', cases: [[["$<$<CONFIG:Debug>:-g>","Debug"],"-g"],[["$<$<CONFIG:Debug>:-g>","Release"],""],[["-O$<IF:$<CONFIG:Release>,3,0>","Release"],"-O3"],[["$<$<CONFIG:debug,RelWithDebInfo>:LOG_ON>","DEBUG"],"LOG_ON"],[["$<$<NOT:$<CONFIG:Release>>:CHECKS=1>","Debug"],"CHECKS=1"],[["$<$<AND:1,$<OR:0,$<CONFIG:Debug>>>:a$<COMMA>b$<ANGLE-R>c>","Debug"],"a,b>c"],[["$<1:x,y>","Release"],"x,y"],[["$<2:x>","Debug"],"ERROR"],[["plain text","Debug"],"plain text"],[["$<$<CONFIG:Debug>:-g","Debug"],"ERROR"],[["$<IF:1,yes>","Debug"],"ERROR"],[["","Release"],""],[["$<UNKNOWN:x>","Debug"],"ERROR"]] },
      solution: {
        approach: `<p>Recursive descent over the string. <code>evalText</code> copies characters and, at each <code>$&lt;</code>, finds the matching <code>&gt;</code> and calls <code>evalNode</code> on the inside. <code>evalNode</code> splits off the head at the first top-level <code>:</code>, evaluates it, and dispatches: 0/1 condition, escape, or operator with top-level-comma-separated arguments. Any problem throws; the entry point turns it into <code>"ERROR"</code>.</p>`,
        code: R`#include <algorithm>
#include <cctype>
#include <stdexcept>
#include <string>
#include <vector>
using namespace std;

class Genex {
    string cfg;
    static string lower(string s) { for (char& c : s) c = (char)tolower((unsigned char)c); return s; }
    static bool startsGenex(const string& s, size_t i) { return i + 1 < s.size() && s[i] == '$' && s[i + 1] == '<'; }

    static size_t matchEnd(const string& s, size_t i) {          // s[i..] starts with "$<"
        int depth = 0;
        for (size_t j = i; j < s.size(); j++) {
            if (startsGenex(s, j)) { depth++; j++; continue; }
            if (s[j] == '>' && --depth == 0) return j;
        }
        throw runtime_error("unclosed $<");
    }
    // Split at top-level occurrences of ch; firstOnly stops after the first split.
    static vector<string> splitTop(const string& s, char ch, bool firstOnly) {
        vector<string> parts(1);
        int depth = 0;
        for (size_t j = 0; j < s.size(); j++) {
            if (startsGenex(s, j)) { depth++; parts.back() += "$<"; j++; continue; }
            if (s[j] == '>' && depth > 0) depth--;
            if (s[j] == ch && depth == 0 && !(firstOnly && parts.size() == 2)) parts.emplace_back();
            else parts.back() += s[j];
        }
        return parts;
    }
    static bool isBool(const string& v) { return v == "0" || v == "1"; }

    string evalNode(const string& inner) {
        vector<string> hr = splitTop(inner, ':', true);
        string head = evalText(hr[0]);
        if (hr.size() == 1) {
            if (head == "COMMA") return ",";
            if (head == "ANGLE-R") return ">";
            throw runtime_error("unknown expression");
        }
        if (isBool(head)) return head == "1" ? evalText(hr[1]) : "";
        vector<string> args;
        for (const string& a : splitTop(hr[1], ',', false)) args.push_back(evalText(a));
        if (head == "CONFIG") {
            for (const string& a : args) if (lower(a) == lower(cfg)) return "1";
            return "0";
        }
        if (head == "IF") {
            if (args.size() != 3 || !isBool(args[0])) throw runtime_error("bad IF");
            return args[0] == "1" ? args[1] : args[2];
        }
        if (head != "NOT" && head != "AND" && head != "OR") throw runtime_error("unknown expression");
        if (!all_of(args.begin(), args.end(), isBool)) throw runtime_error("not a boolean");
        if (head == "NOT") {
            if (args.size() != 1) throw runtime_error("NOT takes one argument");
            return args[0] == "1" ? "0" : "1";
        }
        bool anyOne = any_of(args.begin(), args.end(), [](const string& a) { return a == "1"; });
        bool allOne = all_of(args.begin(), args.end(), [](const string& a) { return a == "1"; });
        return (head == "AND" ? allOne : anyOne) ? "1" : "0";
    }

public:
    explicit Genex(string config) : cfg(std::move(config)) {}
    string evalText(const string& s) {
        string out;
        for (size_t j = 0; j < s.size();) {
            if (startsGenex(s, j)) {
                size_t end = matchEnd(s, j);
                out += evalNode(s.substr(j + 2, end - j - 2));
                j = end + 1;
            } else {
                if (s[j] == '>') throw runtime_error("stray >");
                out += s[j++];
            }
        }
        return out;
    }
};

string evalGenex(string expr, string config) {
    try { return Genex(config).evalText(expr); }
    catch (const exception&) { return "ERROR"; }
}`,
        dry: { head: ['call', 'head', 'arguments', 'value'], rows: [['evalText("-O$&lt;IF:…&gt;")', '—', '—', 'copies "-O", then evaluates the node'], ['evalNode("IF:$&lt;CONFIG:Release&gt;,3,0")', 'IF', '[$&lt;CONFIG:Release&gt;, 3, 0]', 'evaluate arguments'], ['evalNode("CONFIG:Release")', 'CONFIG', '[Release]', '1 (config is Release)'], ['back in IF', 'IF', '[1, 3, 0]', '3'], ['result', '', '', H.c('g', '"-O3"')]] },
        complexity: `<p>O(n · d) time for length n and nesting depth d (each level rescans its substring to find matches); O(n) extra space.</p>`,
        followUps: ['Add <code>$&lt;BOOL:…&gt;</code> (CMake truthiness: ON/YES/TRUE/Y/non-zero number are true).', 'Make it single-pass O(n) by building a parse tree once with a stack.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Package managers: find_package, vcpkg, Conan 2, FetchContent
     ====================================================================== */
  topics.push({
    title: 'Dependencies: find_package, vcpkg, Conan 2 and FetchContent',
    analogy: `<p>Getting ingredients for a restaurant. <b>find_package</b> is checking your own pantry: "is there flour, and where?". <b>vcpkg</b> and <b>Conan</b> are wholesale suppliers: you hand them a shopping list with version rules, they deliver everything (built for your kitchen's exact oven) and stock your pantry. <b>FetchContent</b> is growing it yourself in the backyard: you download the seed (source) and it grows as part of your own build. Each works; mixing them carelessly gives you two different flours in the same cake.</p>`,
    explain: `<h4>find_package: the consumer side</h4>
<p>Your <code>CMakeLists.txt</code> should only say <i>what</i> it needs: <code>find_package(fmt 10 CONFIG REQUIRED)</code> then <code>target_link_libraries(app PRIVATE fmt::fmt)</code>. <b>Config mode</b> loads <code>fmtConfig.cmake</code> shipped by the package (imported targets, version file). <b>Module mode</b> runs a <code>FindXXX.cmake</code> script (CMake ships many, e.g. <code>FindThreads</code>, <code>FindZLIB</code>). <i>Where</i> the package comes from is configured from outside: <code>CMAKE_PREFIX_PATH</code>, a toolchain file, or a dependency provider.</p>
${H.table(['', 'vcpkg', 'Conan 2', 'FetchContent'], [
  ['What it is', 'Microsoft\'s source-based package manager, ports curated in one registry', 'Python-based package manager; recipes on ConanCenter; binary packages per settings', 'CMake module that downloads sources at configure time and adds them as subprojects'],
  ['Manifest', '<code>vcpkg.json</code> + <code>builtin-baseline</code>', '<code>conanfile.txt</code> / <code>conanfile.py</code>', 'in CMakeLists.txt'],
  ['How CMake sees it', 'toolchain file <code>vcpkg.cmake</code>', 'generated <code>conan_toolchain.cmake</code> + <code>CMakeDeps</code> config files', 'targets of the subproject'],
  ['Versions', 'baseline (registry commit) + <code>version&gt;=</code> minimums + <code>overrides</code>', 'exact or ranges <code>fmt/[&gt;=10 &lt;11]</code>; lockfiles', 'a git tag or URL + hash'],
  ['Binary caching', 'yes (binary sources: files, NuGet, cloud)', 'yes (remotes, package id from settings/options)', 'no, but ccache helps']])}
<h4>Versions and diamonds</h4>
<p>Real dependency graphs are diamonds: <code>app → spdlog → fmt</code> and <code>app → fmt</code>. A C++ program can contain <b>one</b> version of fmt (two would violate the ODR). Package managers therefore pick a single version per package. vcpkg uses <b>minimum version selection</b>: the baseline version, raised to the largest <code>version&gt;=</code> constraint anyone states. Conan 2 resolves version ranges to the newest matching version and reports a <b>conflict</b> if two requirements disagree (resolve with <code>override=True</code> / <code>force=True</code> in <code>conanfile.py</code>).</p>
<h4>Semantic versioning</h4>
<p><code>MAJOR.MINOR.PATCH</code>: MAJOR may break API, MINOR adds features, PATCH fixes bugs. Ranges: <code>^1.2.3</code> = <code>&gt;=1.2.3 &lt;2.0.0</code>; <code>~1.2.3</code> = <code>&gt;=1.2.3 &lt;1.3.0</code>; for 0.x versions the caret is stricter (<code>^0.2.3</code> = <code>&lt;0.3.0</code>). Conan 2 accepts these plus <code>||</code>. Many C++ libraries do not follow semver strictly, which is one reason lockfiles exist.</p>`,
    clues: [
      '"<code>Could not find a package configuration file provided by \'fmt\'</code>" → package not installed or not on <code>CMAKE_PREFIX_PATH</code> / toolchain not passed',
      '"Reproducible dependency versions" → vcpkg baseline / Conan lockfile, pinned FetchContent hashes',
      '"Two libraries need different versions of the same dependency" → diamond conflict, one version per program',
      '"Builds take 40 minutes because of Boost" → binary caching (vcpkg binary sources, Conan remotes)',
      '"Vendor a small library without a package manager" → FetchContent with <code>FIND_PACKAGE_ARGS</code>',
      '"<code>^1.2</code>, <code>~1.2</code>, <code>[&gt;=1.0 &lt;2.0]</code>" → semantic version ranges'
    ],
    code: [{ lang: 'json', title: 'vcpkg.json (manifest mode; set builtin-baseline with vcpkg x-update-baseline --add-initial-baseline)', code: `{
  "name": "geo-app",
  "version": "1.4.0",
  "dependencies": [
    { "name": "fmt", "version>=": "10.1.1" },
    "spdlog",
    { "name": "boost-asio", "platform": "!emscripten" }
  ],
  "overrides": [ { "name": "zlib", "version": "1.3.1" } ],
  "builtin-baseline": "c82f74667287d3dc386bce81e44964370c91a289"
}` },
    { lang: 'bash', title: 'Using vcpkg and Conan 2 from the command line', code: `# vcpkg: the toolchain file installs everything in vcpkg.json during configure
cmake -S . -B build -G Ninja \\
  -DCMAKE_TOOLCHAIN_FILE="$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake" \\
  -DVCPKG_TARGET_TRIPLET=x64-linux
cmake --build build

# Conan 2: detect a profile once, install deps (build any missing binaries), then use the generated preset
conan profile detect --force
conan install . --output-folder=build --build=missing -s build_type=Release
cmake --preset conan-release
cmake --build --preset conan-release
conan lock create .            # writes conan.lock: exact versions and revisions` },
    { lang: 'text', title: 'conanfile.txt and FetchContent', code: `# conanfile.txt (Conan 2)
[requires]
fmt/[>=10.1 <11]
spdlog/1.14.1

[generators]
CMakeDeps
CMakeToolchain

[layout]
cmake_layout

# ---- CMakeLists.txt: FetchContent that prefers an installed package (CMake 3.24+) ----
include(FetchContent)
FetchContent_Declare(googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG        v1.15.2                    # pin a tag or, better, a full commit SHA
  GIT_SHALLOW    TRUE
  FIND_PACKAGE_ARGS NAMES GTest)            # use find_package(GTest) first if available
FetchContent_MakeAvailable(googletest)
target_link_libraries(tests PRIVATE GTest::gtest_main)` }],
    codeTitle: ['vcpkg.json (manifest mode; set builtin-baseline with vcpkg x-update-baseline --add-initial-baseline)', 'Using vcpkg and Conan 2 from the command line', 'conanfile.txt and FetchContent'],
    viz: {
      title: 'Resolve a diamond: one version per package',
      input: 'app -> fmt ^10.1.0; app -> spdlog 1.14.1; spdlog -> fmt >=10.0.0 <11.0.0; available fmt 9.1.0 10.0.0 10.2.1 11.0.2',
      inputLabel: 'Requirements "who -> pkg RANGE; ..." and one "available pkg v1 v2 ..." entry',
      gen: function (input) {
        var ls = lines(input, '', 8, 'Format: app -> fmt ^10.1.0; available fmt 9.1.0 10.2.1');
        var reqs = [], avail = {};
        ls.forEach(function (l) {
          var m = /^available\s+(\S+)\s+(.+)$/.exec(l);
          if (m) { avail[m[1]] = m[2].trim().split(/\s+/); return; }
          var r = /^(\S+)\s*->\s*(\S+)\s+(.+)$/.exec(l);
          if (!r) throw new Error('Each requirement is "who -> pkg range", e.g. app -> fmt ^10.1.0');
          reqs.push({ who: r[1], pkg: r[2], range: r[3].trim() });
        });
        function pv(v) { var p = String(v).split('.').map(Number); if (p.length !== 3 || p.some(isNaN)) throw new Error('Versions must look like 10.2.1 (got ' + v + ')'); return p; }
        function cmp(a, b) { for (var i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; }
        function ok(v, c) {
          var m = /^(>=|<=|>|<|=|\^|~)?(\d+\.\d+\.\d+)$/.exec(c); if (!m) throw new Error('Unsupported range part "' + c + '"');
          var op = m[1] || '=', t = pv(m[2]), x = cmp(v, t);
          if (op === '^') { var hi = t[0] > 0 ? [t[0] + 1, 0, 0] : t[1] > 0 ? [0, t[1] + 1, 0] : [0, 0, t[2] + 1]; return x >= 0 && cmp(v, hi) < 0; }
          if (op === '~') return x >= 0 && cmp(v, [t[0], t[1] + 1, 0]) < 0;
          return { '>=': x >= 0, '<=': x <= 0, '>': x > 0, '<': x < 0, '=': x === 0 }[op];
        }
        function sat(v, r) { return r.split('||').some(function (alt) { return alt.trim().split(/\s+/).every(function (c) { return ok(pv(v), c); }); }); }
        var frames = [], pkgs = Object.keys(avail);
        if (!pkgs.length) throw new Error('Add one entry like: available fmt 9.1.0 10.2.1');
        pkgs.forEach(function (p) {
          var vs = avail[p].slice(), alive = vs.map(function () { return true; });
          frames.push({ narr: 'Package <b>' + H.esc(p) + '</b>: the registry offers ' + vs.map(H.esc).join(', ') + '. Every requirement on ' + H.esc(p) + ' must accept the one version we pick.', parts: [{ type: 'array', label: H.esc(p) + ' versions', values: vs }] });
          reqs.filter(function (r) { return r.pkg === p; }).forEach(function (r) {
            var hl = {};
            vs.forEach(function (v, i) { if (alive[i] && !sat(v, r.range)) alive[i] = false; hl[i] = alive[i] ? 'ok' : 'bad'; });
            frames.push({ narr: '<b>' + H.esc(r.who) + '</b> requires ' + H.esc(p) + ' <code>' + H.esc(r.range) + '</code>. Versions outside the range are crossed out.', parts: [{ type: 'array', label: H.esc(p) + ' versions', values: vs, hl: hl }] });
          });
          var best = -1; vs.forEach(function (v, i) { if (alive[i] && (best < 0 || cmp(pv(v), pv(vs[best])) > 0)) best = i; });
          frames.push({ narr: best < 0 ? '<b>Conflict</b>: no version of ' + H.esc(p) + ' satisfies everyone. Conan reports a version conflict; you must change a requirement or force an override.' : 'Pick the <b>newest</b> surviving version: <b>' + H.esc(vs[best]) + '</b>. Every library in the program is compiled and linked against this one copy (one definition rule).', parts: [{ type: 'array', label: H.esc(p) + ' versions', values: vs, hl: best < 0 ? {} : one(best, 'sel') }] });
        });
        return frames;
      }
    },
    examples: [
      { title: 'Why the toolchain file must come first', html: `<p><code>CMAKE_TOOLCHAIN_FILE</code> is read during the <b>first</b> configure of a build directory, before <code>project()</code>. Adding it to an existing build directory has no effect: CMake already chose the compiler and cached it. Delete the build directory (or use a fresh preset) when switching to vcpkg or Conan. You can also set it in <code>CMakePresets.json</code> so nobody forgets.</p>`, code: { lang: 'text', code: `CMake Error at CMakeLists.txt:8 (find_package):
  Could not find a package configuration file provided by "fmt" with any of
  the following names:
    fmtConfig.cmake
    fmt-config.cmake` } },
      { title: 'Predict the vcpkg version', html: `<p>Baseline has fmt 10.0.0. Your manifest says <code>"version&gt;=": "10.1.1"</code>, and a dependency of yours says <code>version&gt;= 9.1.0</code>. vcpkg picks the <b>largest minimum</b>: 10.1.1 (exactly, not "the newest"). An <code>overrides</code> entry pins a version regardless of constraints, and is only honoured in the top-level manifest.</p>` },
      { title: 'Semver range check', html: `<p>Does 1.9.9 satisfy <code>^1.2.3</code>? Yes (≥ 1.2.3 and &lt; 2.0.0). Does 0.3.0 satisfy <code>^0.2.3</code>? <b>No</b>: for 0.x the caret only allows patch-level and minor-compatible changes within 0.2. Does 1.3.0 satisfy <code>~1.2.3</code>? No (&lt; 1.3.0).</p>`, code: R`#include <tuple>
using V = std::tuple<int, int, int>;
bool caret(V v, V t) {               // ^t
    auto [a, b, c] = t;
    V hi = a > 0 ? V{a + 1, 0, 0} : b > 0 ? V{0, b + 1, 0} : V{0, 0, c + 1};
    return t <= v && v < hi;         // std::tuple compares lexicographically
}` },
      { title: 'FetchContent pitfalls', html: `<p>FetchContent adds the dependency\'s <b>whole CMake project</b> to yours: its options, its warnings, its install rules, its tests (often turned off with <code>set(BUILD_TESTING OFF)</code> or the project\'s own option before <code>MakeAvailable</code>). Pin a tag <b>and</b> preferably a URL hash; a moving branch makes builds unreproducible. Calling <code>FetchContent_Populate()</code> directly is deprecated since CMake 3.30 (policy CMP0169); use <code>FetchContent_MakeAvailable</code>.</p>` }
    ],
    deepDive: `<p><b>Binary compatibility is the hard part.</b> A package binary is only reusable if it was built with compatible settings: OS, architecture, compiler and version, standard library (libstdc++ vs libc++, <code>_GLIBCXX_USE_CXX11_ABI</code>), build type (MSVC debug vs release runtime), <code>cppstd</code> when it affects ABI, and options like <code>shared=True</code>. Conan computes a <b>package_id</b> hash from exactly these settings and options; vcpkg uses <b>triplets</b> (<code>x64-linux</code>, <code>x64-windows-static</code>, <code>arm64-osx</code>, custom ones) plus an ABI hash of every input to key its binary cache.</p>
<p><b>Dependency providers (CMake 3.24+).</b> A project can call plain <code>find_package()</code> and <code>FetchContent_MakeAvailable()</code>; a provider injected through <code>CMAKE_PROJECT_TOP_LEVEL_INCLUDES</code> intercepts those calls and satisfies them from a package manager. With <code>FIND_PACKAGE_ARGS</code>, FetchContent tries <code>find_package</code> first and downloads only as a fallback; with <code>FETCHCONTENT_TRY_FIND_PACKAGE_MODE=ALWAYS</code> you can flip all of them at once. The direction of travel is: the project declares needs, the environment decides sources.</p>
<p><b>Lockfiles and reproducibility.</b> vcpkg's baseline is a git commit of the registry: everything resolves the same until you bump it. Conan 2 lockfiles record exact versions and recipe revisions (<code>conan lock create</code>, then <code>--lockfile</code>). FetchContent should use a URL with <code>URL_HASH</code> or a git commit SHA. Do not mix sources: if vcpkg provides fmt and FetchContent also brings fmt, two copies end up in the link and you get ODR violations or duplicate symbols.</p>
<p><b>System packages and CPS.</b> Linux distributions provide <code>-dev</code> packages with CMake config files or pkg-config <code>.pc</code> files (<code>pkg_check_modules(… IMPORTED_TARGET)</code>). The Common Package Specification (CPS), with experimental support from CMake 4.0, aims to replace build-system-specific config files with a neutral JSON description.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants quickly produce working <code>vcpkg.json</code>, <code>conanfile.py</code> and FetchContent blocks, translate between them, and explain resolver errors. For security, AI-powered scanners now read manifests and lockfiles to flag vulnerable versions.</p>
<p><b>Where AI goes wrong:</b> hallucinated package names and versions (a port called <code>fmtlib</code>, a version that was never released), stale Conan 1 syntax (<code>cmake_find_package</code> generator, <code>conan install .. </code> with old <code>settings.yml</code> assumptions), FetchContent from a branch with no hash, and "fix the conflict" by adding a second copy of the library. Package hallucination is also an attack vector: attackers register names that models commonly invent.</p>
<p><b>What you still own:</b> choosing one dependency strategy per project, pinning and reviewing version bumps, checking licences, and confirming the resolved graph (<code>conan graph info</code>, <code>vcpkg depend-info</code>, <code>cmake --graphviz</code>) contains exactly one copy of each library.</p>`,
    problems: [{
      title: 'Semantic Version Range Matcher', level: 'Medium', tags: ['parsing', 'strings', 'semver'], companies: ['JFrog', 'Microsoft', 'GitHub'],
      statement: `<p>Implement <code>satisfies(version, range)</code> for versions <code>MAJOR.MINOR.PATCH</code> (non-negative integers, no pre-release tags). A range is one or more <b>alternatives</b> separated by <code>||</code>; an alternative is one or more <b>comparators</b> separated by spaces, all of which must hold. A comparator is an optional operator followed by a full version:</p>
<ul><li><code>&gt;=</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>=</code> (no operator means <code>=</code>).</li>
<li><code>^X.Y.Z</code>: ≥ X.Y.Z and below the next version that changes the first non-zero part: <code>&lt;(X+1).0.0</code> if X &gt; 0, else <code>&lt;0.(Y+1).0</code> if Y &gt; 0, else <code>&lt;0.0.(Z+1)</code>.</li>
<li><code>~X.Y.Z</code>: ≥ X.Y.Z and &lt; X.(Y+1).0.</li></ul>`,
      constraints: `Version parts ≤ 10<sup>6</sup>; range length ≤ 1000. Inputs are well-formed.`,
      example: `<p><code>("1.9.9", "^1.2.3")</code> → <b>${H.c('g', 'true')}</b>; <code>("0.3.0", "^0.2.3")</code> → <b>${H.c('r', 'false')}</b>; <code>("3.0.1", "&lt;2.0.0 || ^3.0.0")</code> → <b>true</b>; <code>("2.5.0", "&gt;=1.0.0 &lt;2.0.0 || &gt;=3.0.0")</code> → <b>false</b>.</p>`,
      brute: { why: `<p>Comparing versions as <b>strings</b> is the classic bug: <code>"10.2.1" &lt; "9.1.0"</code> lexicographically. Another naive approach expands ranges into lists of allowed versions, which is impossible for open ranges. Parse to integer triples and compare tuples.</p>`, code: R`bool satisfiesBrute(string v, string range) {
    // WRONG on purpose: string comparison, only handles a single ">=X" comparator
    if (range.rfind(">=", 0) == 0) return v >= range.substr(2);   // "10.0.0" >= "9.0.0" is false!
    return v == range;
}` },
      mcq: { q: 'Which versions does <code>^0.0.3</code> allow?', options: ['0.0.3 up to (not including) 1.0.0', '0.0.3 up to (not including) 0.1.0', 'only 0.0.3', 'anything ≥ 0.0.3'], answer: 2, explain: 'With MAJOR and MINOR both 0, the caret bound is &lt;0.0.4, so only 0.0.3 itself matches.' },
      hints: [`<p>Hint 1: parse each version into a triple of ints. <code>std::tuple</code> or <code>std::array</code> already compares lexicographically, which is exactly version order.</p>`, `<p>Hint 2: split the range on "||", each alternative on whitespace; the answer is OR over alternatives of AND over comparators. Strip the operator prefix (check two-character operators before one-character ones).</p>`, `<p>Hint 3: rewrite ^ and ~ as a pair of bounds [low, high). For caret, the high bound bumps the first non-zero component, with the lower ones reset to 0.</p>`],
      tests: { sig: 'string string -> bool', fn: 'satisfies', cases: [[["1.4.2",">=1.2.0 <2.0.0"],true],[["2.0.0",">=1.2.0 <2.0.0"],false],[["1.9.9","^1.2.3"],true],[["1.2.2","^1.2.3"],false],[["0.3.0","^0.2.3"],false],[["0.2.9","^0.2.3"],true],[["0.0.4","^0.0.3"],false],[["0.0.3","^0.0.3"],true],[["1.3.0","~1.2.3"],false],[["1.2.9","~1.2.3"],true],[["3.0.1","<2.0.0 || ^3.0.0"],true],[["10.2.1","10.2.1"],true],[["10.2.1",">10.2.1"],false],[["2.5.0",">=1.0.0 <2.0.0 || >=3.0.0"],false]] },
      solution: {
        approach: `<p>Parse versions into <code>array&lt;long long, 3&gt;</code>. Split the range on <code>||</code> and spaces. For each comparator, read the operator (longest match first), parse its version, and test it; caret and tilde become half-open intervals.</p>`,
        code: R`#include <array>
#include <sstream>
#include <string>
using namespace std;

using Ver = array<long long, 3>;

static Ver parseVer(const string& s) {
    Ver v{};
    char dot;
    istringstream in(s);
    in >> v[0] >> dot >> v[1] >> dot >> v[2];
    return v;
}

static bool comparatorHolds(const Ver& v, const string& c) {
    string op;
    for (const char* cand : {">=", "<=", ">", "<", "=", "^", "~"})
        if (c.rfind(cand, 0) == 0) { op = cand; break; }       // longest operators are tried first
    Ver t = parseVer(c.substr(op.size()));
    if (op.empty() || op == "=") return v == t;
    if (op == ">=") return v >= t;
    if (op == "<=") return v <= t;
    if (op == ">") return v > t;
    if (op == "<") return v < t;
    Ver hi;
    if (op == "~") hi = {t[0], t[1] + 1, 0};
    else if (t[0] > 0) hi = {t[0] + 1, 0, 0};                 // ^1.2.3 -> <2.0.0
    else if (t[1] > 0) hi = {0, t[1] + 1, 0};                 // ^0.2.3 -> <0.3.0
    else hi = {0, 0, t[2] + 1};                               // ^0.0.3 -> <0.0.4
    return t <= v && v < hi;
}

bool satisfies(string version, string range) {
    Ver v = parseVer(version);
    size_t start = 0;
    while (true) {
        size_t bar = range.find("||", start);
        string alt = range.substr(start, bar == string::npos ? string::npos : bar - start);
        istringstream in(alt);
        bool all = true, any = false;
        for (string c; in >> c;) { any = true; if (!comparatorHolds(v, c)) { all = false; break; } }
        if (any && all) return true;                          // one alternative is enough
        if (bar == string::npos) return false;
        start = bar + 2;
    }
}`,
        dry: { head: ['version', 'alternative', 'comparator checks', 'result'], rows: [['2.5.0', '&gt;=1.0.0 &lt;2.0.0', '≥1.0.0 ✓, &lt;2.0.0 ✗', 'alternative fails'], ['2.5.0', '&gt;=3.0.0', '≥3.0.0 ✗', 'alternative fails'], ['2.5.0', '—', '—', H.c('r', 'false')], ['0.2.9', '^0.2.3', '[0.2.3, 0.3.0) ✓', H.c('g', 'true')]] },
        complexity: `<p>O(|range|) time and space.</p>`,
        followUps: ['Support partial versions (<code>^1.2</code>, <code>1.x</code>) and pre-release tags (<code>1.0.0-rc.1</code> sorts before 1.0.0).', 'Given all available versions, return the newest one that satisfies every range (see practice).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Cross-compiling, build speed and C++20 modules
     ====================================================================== */
  topics.push({
    title: 'Cross-Compiling, Build Speed (ccache, PCH, Unity Builds) and C++20 Modules',
    analogy: `<p><b>Cross-compiling</b> is writing a cookbook in English for a kitchen in Japan: you work at your desk (the <i>host</i>) but every measurement must suit their stoves and ingredients (the <i>target</i>). <b>Build speed</b> tricks are kitchen shortcuts: ccache is a freezer of already-cooked dishes, precompiled headers are a pot of stock made once for all soups, unity builds cook several small dishes in one pan. <b>C++20 modules</b> replace "photocopy the recipe into every dish" (<code>#include</code>) with "read the sealed, pre-digested recipe card" — but now cards must be printed before the dishes that use them, so the kitchen needs an order.</p>`,
    explain: `<h4>Cross-compiling with CMake</h4>
<p>A <b>toolchain file</b> tells CMake about the target before <code>project()</code> runs: system name, processor, compilers, sysroot, and where <code>find_*</code> may look. Pass it once: <code>cmake -B build-arm --toolchain arm64.cmake</code> (CMake 3.21+, same as <code>-DCMAKE_TOOLCHAIN_FILE</code>).</p>
<pre><code>set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)
set(CMAKE_C_COMPILER   aarch64-linux-gnu-gcc)
set(CMAKE_CXX_COMPILER aarch64-linux-gnu-g++)
set(CMAKE_SYSROOT /opt/sysroots/aarch64)
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)   # build tools run on the host
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)    # libraries come from the target sysroot
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)</code></pre>
<p>Traps: <code>try_run</code> and tests cannot execute target binaries (set <code>CMAKE_CROSSCOMPILING_EMULATOR</code>, e.g. <code>qemu-aarch64</code>); code generators built in the same project must be built for the <b>host</b> (separate build or imported host tools). vcpkg uses target triplets (<code>arm64-linux</code>) and Conan uses a host profile plus a build profile (<code>-pr:h arm64 -pr:b default</code>).</p>
<h4>Build speed toolbox</h4>
${H.table(['Technique', 'What it saves', 'CMake'], [
  ['Ninja + all cores', 'scheduling overhead, idle cores', '<code>-G Ninja</code>, <code>cmake --build b -j</code>'],
  ['ccache / sccache', 'recompiling identical inputs (clean builds, branch switches, CI)', '<code>CMAKE_CXX_COMPILER_LAUNCHER=ccache</code>'],
  ['Precompiled headers', 'parsing the same big headers in every TU', '<code>target_precompile_headers(t PRIVATE &lt;vector&gt; &lt;string&gt;)</code>'],
  ['Unity (jumbo) builds', 'per-TU overhead; merges N .cpp into one', '<code>CMAKE_UNITY_BUILD ON</code>, <code>UNITY_BUILD_BATCH_SIZE</code> (default 8)'],
  ['Faster linker, split DWARF', 'link time', '<code>CMAKE_LINKER_TYPE=MOLD</code> (3.29+), <code>-gsplit-dwarf</code>'],
  ['Fewer includes / modules', 'the root cause', 'IWYU, forward declarations, <code>FILE_SET CXX_MODULES</code>']])}
<h4>C++20 modules</h4>
<p>A module interface unit (<code>export module geo;</code>) is compiled once into a <b>BMI</b> (built module interface: <code>.pcm</code> for Clang, <code>.gcm</code> for GCC, <code>.ifc</code> for MSVC). Importers read the BMI instead of re-parsing text. Macros do not leak in or out, and import order does not matter. The catch: <b>a module must be compiled before anything that imports it</b>, so the build system must scan sources first (P1689 dependency format) and order the compiles — a topological sort. CMake 3.28+ supports this with Ninja 1.11+ and Visual Studio 17.4+ (not with Makefiles): list module sources in <code>target_sources(t PUBLIC FILE_SET CXX_MODULES FILES geo.cppm)</code>. <code>import std;</code> is available with CMake 3.30+ (experimental gate) on recent Clang/libc++, MSVC and GCC 15.</p>`,
    clues: [
      '"Build for ARM / Raspberry Pi / Android on my x86 laptop" → toolchain file, sysroot, CMAKE_FIND_ROOT_PATH_MODE_*',
      '"<code>Exec format error</code>" while building → the build ran a target binary on the host; use an emulator or a host tool',
      '"CI rebuilds everything every time" → ccache/sccache with a persistent cache, or a remote cache',
      '"Most build time is spent in the same headers" → PCH or modules; check with <code>-ftime-trace</code>',
      '"Module not found / BMI missing" → scanning not enabled, wrong generator (Makefiles), or a cycle between modules',
      '"Order of compilation" for modules → topological order of module dependencies; cycles are ill-formed'
    ],
    code: [{ lang: 'text', title: 'Modules + speed settings in CMake 3.28+', code: `cmake_minimum_required(VERSION 3.28)
project(geo LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(geo)
target_sources(geo PUBLIC FILE_SET CXX_MODULES FILES src/geo.cppm src/geo-shapes.cppm)
add_executable(app src/main.cpp)          # main.cpp does: import geo;
target_link_libraries(app PRIVATE geo)

# Speed: cache compiler results, precompile heavy headers, batch small files
find_program(CCACHE ccache)
if(CCACHE)
  set(CMAKE_CXX_COMPILER_LAUNCHER \${CCACHE})
endif()
add_library(legacy src/a.cpp src/b.cpp src/c.cpp)
target_precompile_headers(legacy PRIVATE <vector> <string> <unordered_map>)
set_target_properties(legacy PROPERTIES UNITY_BUILD ON UNITY_BUILD_BATCH_SIZE 16)
set_source_files_properties(src/c.cpp PROPERTIES SKIP_UNITY_BUILD_INCLUSION ON)` },
    { lang: 'cpp', title: 'A module interface and its user (illustrative: needs a modules-aware build)', check: false, code: R`// geo.cppm — module interface unit
module;                       // global module fragment: classic #includes go here
#include <cmath>
export module geo;            // this file produces the BMI for "geo"
export namespace geo {
    struct Point { double x, y; };
    double distance(Point a, Point b) { return std::hypot(a.x - b.x, a.y - b.y); }
}
namespace detail { int helper() { return 42; } }   // not exported: invisible to importers

// main.cpp
import geo;                   // reads the compiled BMI, no text re-parsing
import <iostream>;            // header unit (support varies); 'import std;' with C++23 + CMake 3.30+
int main() { std::cout << geo::distance({0, 0}, {3, 4}) << '\n'; }` },
    { lang: 'bash', title: 'Cross-compile and measure build speed', code: `# Cross-compile for 64-bit ARM Linux and run tests under QEMU user-mode emulation
cmake -S . -B build-arm64 -G Ninja --toolchain cmake/aarch64-linux.cmake \\
  -DCMAKE_CROSSCOMPILING_EMULATOR=qemu-aarch64
cmake --build build-arm64 && ctest --test-dir build-arm64
file build-arm64/app            # ELF 64-bit LSB executable, ARM aarch64

# Cache hit rate after a clean rebuild
ccache -z && cmake --build build --clean-first && ccache -s
# Where does Ninja spend time? Convert .ninja_log into a trace
ninja -C build -t compdb > /dev/null && tail -n 5 build/.ninja_log` }],
    codeTitle: ['Modules + speed settings in CMake 3.28+', 'A module interface and its user (illustrative: needs a modules-aware build)', 'Cross-compile and measure build speed'],
    viz: {
      title: 'Order module compiles: topological sort with cycle detection',
      input: 'main: geo util; geo: geo.shapes util; geo.shapes: util; util:',
      inputLabel: 'Modules/targets "name: imports...; ..." (add a cycle like "util: main" to see it fail)',
      gen: function (input) {
        var g = parseDeps(input, '', 'Format: main: geo; geo: util; util:');
        var L = layout(g), indeg = {}, users = {}, frames = [];
        g.order.forEach(function (n) { indeg[n] = g.deps[n].length; users[n] = []; });
        g.order.forEach(function (n) { g.deps[n].forEach(function (d) { users[d].push(n); }); });
        var ready = g.order.filter(function (n) { return !indeg[n]; }).sort(), done = [], hl = {};
        frames.push({ narr: 'Arrows point from an importer to what it imports. The scanner (P1689) found these edges. A unit can compile only after all its imports have BMIs, so count unmet imports per unit. Ready now: <b>' + (ready.map(H.esc).join(', ') || 'nothing!') + '</b>.', parts: [gpart('Import graph', L, (function () { var h = {}; ready.forEach(function (r) { h[r] = 'cur'; }); return h; })()), { type: 'map', label: 'unmet imports', entries: g.order.map(function (n) { return [n, indeg[n]]; }) }] });
        while (ready.length) {
          var x = ready.shift(); done.push(x); hl[x] = 'ok';
          var freed = [];
          users[x].forEach(function (u) { if (--indeg[u] === 0) { ready.push(u); freed.push(u); } });
          ready.sort();
          var h2 = Object.assign({}, hl); ready.forEach(function (r) { h2[r] = 'cur'; });
          frames.push({ narr: 'Compile <b>' + H.esc(x) + '</b> (smallest name among ready units, for a deterministic order). Its BMI now exists' + (freed.length ? ', so ' + freed.map(H.esc).join(', ') + ' became ready' : '') + '.', parts: [gpart('Import graph', L, h2), { type: 'array', label: 'build order so far', values: done.slice() }, { type: 'map', label: 'unmet imports', entries: g.order.map(function (n) { return [n, indeg[n]]; }), hl: one(x, 'ok') }] });
        }
        if (done.length < g.order.length) {
          var stuck = g.order.filter(function (n) { return done.indexOf(n) < 0; }).sort(), h3 = Object.assign({}, hl);
          stuck.forEach(function (s) { h3[s] = 'bad'; });
          frames.push({ narr: '<b>Cycle!</b> ' + stuck.map(H.esc).join(', ') + ' still wait for each other (or for something in a cycle). Module import cycles are ill-formed C++; for targets, CMake reports "dependency cycle". Break it by moving shared declarations into a third unit.', parts: [gpart('Import graph', L, h3), { type: 'array', label: 'build order so far', values: done.slice() }] });
        } else frames.push({ narr: 'All ' + done.length + ' units ordered: <b>' + done.map(H.esc).join(' → ') + '</b>. Independent units (same "wave") can compile in parallel.', parts: [gpart('Import graph', L, hl), { type: 'array', label: 'final build order', values: done.slice() }] });
        return frames;
      }
    },
    examples: [
      { title: 'Why the unity build broke the code', html: `<p>Unity builds paste several <code>.cpp</code> files into one TU. Two files that each define <code>static int counter;</code> or a helper in an unnamed namespace with the same name now collide: <code>redefinition of 'counter'</code>. Fix by giving internal helpers unique names (or a per-file namespace), or exclude the file with <code>SKIP_UNITY_BUILD_INCLUSION</code>. Unity builds also hide missing includes, because an earlier file in the batch already included the header.</p>`, code: { lang: 'text', code: `// CMakeFiles/legacy.dir/Unity/unity_0_cxx.cxx  (generated)
#include "/src/a.cpp"
#include "/src/b.cpp"      // error: redefinition of 'int {anonymous}::counter'` } },
      { title: 'ccache hit or miss?', html: `<p>ccache hashes the compiler, the flags and the source (in direct mode: the source plus the header paths and contents it saw; in preprocessor mode: the preprocessed text). Changing a comment in a header is a miss (content changed). Building the same commit in a different directory is a miss unless you set <code>base_dir</code>, because absolute paths appear in the flags and debug info. <code>__DATE__</code>/<code>__TIME__</code> in a file make it uncacheable by default.</p>`, code: { lang: 'bash', code: `ccache --set-config=base_dir="$HOME/src"
ccache -s | grep -E 'Hits|Misses'` } },
      { title: 'A host tool inside a cross build', html: `<p>A project builds <code>gen_tables</code> and runs it to generate <code>tables.cpp</code>. In a cross build, <code>gen_tables</code> is an ARM binary that cannot run on the x86 host. Options: build the generator in a separate host build and import it (<code>find_program</code> / an exported executable target), run it under <code>CMAKE_CROSSCOMPILING_EMULATOR</code>, or rewrite the generation as a CMake script or <code>constexpr</code> code that needs no executable at all.</p>`, code: R`#include <array>
// constexpr table: computed by the compiler, no generator program needed
constexpr std::array<unsigned, 256> makeCrcTable() {
    std::array<unsigned, 256> t{};
    for (unsigned i = 0; i < 256; i++) {
        unsigned c = i;
        for (int k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320u ^ (c >> 1) : c >> 1;
        t[i] = c;
    }
    return t;
}
constexpr auto kCrcTable = makeCrcTable();
static_assert(kCrcTable[1] == 0x77073096u);` },
      { title: 'Precompiled headers: what to put in them', html: `<p>Good PCH content: large, stable headers used by many TUs — standard library, Boost, Qt, your stable third-party APIs. Bad content: your own frequently edited headers (every edit invalidates the PCH and rebuilds everything). With CMake, <code>target_precompile_headers(other REUSE_FROM base)</code> shares one PCH between targets that use identical flags.</p>` }
    ],
    deepDive: `<p><b>How modules change the build graph.</b> With headers, every TU can compile independently and in any order. With modules, a TU that imports <code>geo</code> depends on the <b>BMI</b> of <code>geo</code>, which is an output of another compile. The build therefore has a dynamic dependency: CMake asks the compiler to <b>scan</b> each source (<code>clang-scan-deps</code>, GCC <code>-fdeps-format=p1689r5</code>, MSVC <code>/scanDependencies</code>), writes P1689 JSON, collates it per target, and uses Ninja's <code>dyndep</code> feature to add the edges before compiling. That is why Makefiles are not supported and why <code>CMAKE_CXX_SCAN_FOR_MODULES</code> exists (turn it off for targets without modules to save scan time).</p>
<p><b>BMIs are not portable.</b> A BMI depends on the exact compiler version and flags; you cannot ship a <code>.pcm</code> in a package the way you ship a header. Libraries ship module <b>interface sources</b> (installed with <code>FILE_SET CXX_MODULES</code> and <code>install(EXPORT … CXX_MODULES_DIRECTORY …)</code>) and each consumer builds its own BMI. Header units (<code>import &lt;vector&gt;;</code>) remain poorly supported across build systems in 2026; <code>import std;</code> is the practical path.</p>
<p><b>Remote caching and execution.</b> ccache and sccache can share a cache over HTTP/Redis/S3/GCS; Bazel and Buck2 use content-addressed remote caches and remote execution, so a clean CI build may compile nothing locally. For these to hit, builds must be <b>hermetic and reproducible</b>: same compiler, relative paths (<code>-ffile-prefix-map</code>), no timestamps embedded.</p>
<p><b>Parallelism limits.</b> Compiles parallelise well; links are often memory bound (LTO links can need many GB each). Ninja pools (<code>JOB_POOL_LINK</code> in CMake) cap concurrent links while compiles use every core. The theoretical minimum build time is the <b>critical path</b> through the dependency graph — no number of cores beats it — which is why deep chains of libraries hurt and wide, shallow graphs build fast.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write toolchain files, cross-compile presets, ccache/sccache CI caching steps and module migration boilerplate quickly. Agents can run builds, read <code>-ftime-trace</code> and <code>.ninja_log</code>, and propose concrete speedups with measurements.</p>
<p><b>Where AI goes wrong:</b> modules advice is often stale or speculative (Makefile generator "support", <code>CMAKE_EXPERIMENTAL_CXX_MODULE_DYNDEP</code> flags from 3.25 previews, claiming header units work everywhere); cross toolchain files that forget <code>CMAKE_FIND_ROOT_PATH_MODE_*</code> so host libraries get linked into the target build; and enabling unity builds or PCH without checking that the code still compiles without them.</p>
<p><b>What you still own:</b> measuring before and after (clean, incremental and no-op build times; cache hit rate), keeping a non-unity CI job so include hygiene does not rot, and deciding when your toolchain support is good enough to adopt modules.</p>`,
    problems: [{
      title: 'Build-Order Planner with Cycle Detection', level: 'Medium', tags: ['graph', 'topological sort', 'heap'], companies: ['Google', 'Meta', 'Bloomberg', 'Microsoft'],
      statement: `<p>Each line is <code>"target: dep1 dep2 ..."</code>. A target can be built only after all its dependencies that are themselves declared targets; names that are never declared on the left (imported targets like <code>Threads::Threads</code>) are already available and are ignored.</p>
<p>Return the build order. When several targets are ready at once, build the <b>lexicographically smallest</b> first (deterministic order). If the graph has a cycle, return <code>["CYCLE"]</code> followed by the sorted names of every declared target that could not be scheduled.</p>`,
      constraints: `≤ 10<sup>5</sup> targets and 2·10<sup>5</sup> edges. Declared target names contain no ':' (imported names such as <code>Threads::Threads</code> appear only as dependencies), so each line splits at its first ':'.`,
      example: `<p><code>["app: net core", "net: core", "core:"]</code> → <b>${H.c('g', '["core", "net", "app"]')}</b>. <code>["app: lib", "lib: util", "util: lib", "test: app"]</code> → <b>${H.c('r', '["CYCLE", "app", "lib", "test", "util"]')}</b> (lib ↔ util form a cycle; app and test wait on it).</p>`,
      brute: { why: `<p>Repeat: scan all targets, pick the smallest one whose deps are all built, append it; stop when nothing is pickable. Each round is O(V + E), so the total is O(V·(V + E)) — 10<sup>10</sup> for 10<sup>5</sup> targets. The waste: re-checking targets whose dependencies did not change.</p>`, code: R`vector<string> buildOrderBrute(vector<string> lines) {
    map<string, vector<string>> deps;
    for (auto& l : lines) {
        size_t c = l.find(':'); istringstream in(l.substr(c + 1)); string d;
        auto& v = deps[l.substr(0, c)];
        while (in >> d) v.push_back(d);
    }
    set<string> built; vector<string> order;
    while (true) {
        string pick;
        for (auto& [t, ds] : deps) {                        // map iterates in sorted order
            if (built.count(t)) continue;
            bool ok = all_of(ds.begin(), ds.end(), [&](auto& d) { return !deps.count(d) || built.count(d); });
            if (ok) { pick = t; break; }
        }
        if (pick.empty()) break;
        built.insert(pick); order.push_back(pick);
    }
    if (order.size() == deps.size()) return order;
    vector<string> out{"CYCLE"};
    for (auto& [t, ds] : deps) if (!built.count(t)) out.push_back(t);
    return out;
}` },
      mcq: { q: 'Kahn\'s algorithm finished but scheduled fewer targets than were declared. What does that prove?', options: ['Some dependency is an imported target', 'The graph contains at least one cycle', 'The input had duplicate lines', 'The heap was used incorrectly'], answer: 1, explain: 'Every target in or downstream of a cycle keeps a non-zero in-degree forever, so it is never scheduled. Fewer outputs than nodes ⇔ a cycle exists.' },
      hints: [`<p>Hint 1: count, for every target, how many declared dependencies it still waits for (in-degree). Targets with zero can be built now.</p>`, `<p>Hint 2: Kahn's algorithm with a min-heap (<code>priority_queue</code> with <code>greater&lt;&gt;</code>) gives the smallest ready name first. When you pop a target, decrement its users' counters and push those that reach zero.</p>`, `<p>Hint 3: ignore dependencies that are not declared targets. If the output is shorter than the number of targets, the rest are stuck in or behind a cycle: return "CYCLE" plus those names sorted.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'buildOrder', cases: [[[["app: net core","net: core","core:"]],["core","net","app"]],[[["b:","a:","c: a b"]],["a","b","c"]],[[["a: b","b: a","c:"]],["CYCLE","a","b"]],[[["app: lib","lib: util","util: lib","test: app"]],["CYCLE","app","lib","test","util"]],[[["solo:"]],["solo"]],[[["app: Threads::Threads core","core:"]],["core","app"]],[[["x: x"]],["CYCLE","x"]],[[["m.ixx:","n.ixx: m.ixx","main: n.ixx m.ixx","aux: m.ixx"]],["m.ixx","aux","n.ixx","main"]]] },
      solution: {
        approach: `<p>Parse each line at the first <code>:</code>. Build reverse edges (dependency → users) only for declared dependencies and count in-degrees. Run Kahn's algorithm with a min-heap of ready names. If not everything was emitted, collect the unscheduled targets, sort them, and prefix <code>"CYCLE"</code>.</p>`,
        code: R`#include <algorithm>
#include <functional>
#include <queue>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

vector<string> buildOrder(vector<string>& lines) {
    unordered_map<string, vector<string>> deps;
    vector<string> names;
    for (const string& line : lines) {
        size_t colon = line.find(':');
        string name = line.substr(0, colon);
        if (!deps.count(name)) names.push_back(name);
        auto& d = deps[name];
        istringstream in(line.substr(colon + 1));
        for (string x; in >> x;) d.push_back(x);
    }
    unordered_map<string, int> waiting;
    unordered_map<string, vector<string>> users;
    for (const string& t : names) {
        waiting[t] = 0;
        for (const string& d : deps[t])
            if (deps.count(d)) { waiting[t]++; users[d].push_back(t); }   // imported deps are ignored
    }
    priority_queue<string, vector<string>, greater<string>> ready;       // smallest name first
    for (const string& t : names) if (waiting[t] == 0) ready.push(t);
    vector<string> order;
    while (!ready.empty()) {
        string t = ready.top(); ready.pop();
        order.push_back(t);
        for (const string& u : users[t])
            if (--waiting[u] == 0) ready.push(u);
    }
    if (order.size() == names.size()) return order;
    vector<string> stuck;
    for (const string& t : names) if (waiting[t] > 0) stuck.push_back(t);
    sort(stuck.begin(), stuck.end());
    stuck.insert(stuck.begin(), "CYCLE");
    return stuck;
}`,
        dry: { head: ['step', 'ready heap', 'pop', 'counters after'], rows: [['init', '{core}', '—', 'app 2, net 1, core 0'], ['1', '{core}', 'core', 'app 1, net 0 → push net'], ['2', '{net}', 'net', 'app 0 → push app'], ['3', '{app}', 'app', H.c('g', 'order core, net, app')]] },
        complexity: `<p>O((V + E) log V) time with the heap; O(V + E) space.</p>`,
        followUps: ['Return the build in parallel "waves" (all targets whose longest dependency chain has the same length).', 'Report one concrete cycle path (e.g. lib → util → lib) using DFS colouring.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE ARENA
     ====================================================================== */
  practice.push({
    title: 'Where Does CMake Put the Object File?', level: 'Easy', tags: ['strings', 'CMake'], companies: ['Kitware', 'Amazon'],
    statement: `<p>CMake's Ninja and Makefile generators place the object for source <code>src</code> of target <code>t</code> at <code>CMakeFiles/&lt;t&gt;.dir/&lt;src&gt;.o</code> (the full source name is kept, so <code>main.cpp</code> becomes <code>main.cpp.o</code>). Before that, leading <code>./</code> prefixes are removed and every <code>../</code> is replaced by <code>__/</code> so objects never escape the target directory. Implement <code>objectPath(target, src)</code>.</p>`,
    constraints: `Paths are relative, use '/', and have length ≤ 1000.`,
    example: `<p><code>("lib", "../shared/util.cpp")</code> → <b>${H.c('g', '"CMakeFiles/lib.dir/__/shared/util.cpp.o"')}</b>.</p>`,
    brute: { why: `<p>Building the string by repeated <code>find</code> + <code>replace</code> from the start after every replacement is O(n²) for many <code>../</code> segments. One left-to-right pass with an output buffer is O(n).</p>`, code: R`string objectPathBrute(string target, string src) {
    while (src.rfind("./", 0) == 0) src = src.substr(2);
    size_t p;
    while ((p = src.find("../")) != string::npos) src.replace(p, 3, "__/");   // rescans from the start each time
    return "CMakeFiles/" + target + ".dir/" + src + ".o";
}` },
    mcq: { q: 'Why does CMake keep ".cpp" in "main.cpp.o"?', options: ['It is a bug', 'So a.cpp and a.c in the same target do not collide on a.o', 'Linkers require it', 'To make paths longer'], answer: 1, explain: 'Keeping the full source name makes object names unique even when two sources differ only by extension.' },
    hints: [`<p>Hint 1: there are only two rewrites: drop leading "./", then turn every "../" into "__/".</p>`, `<p>Hint 2: strip the prefix in a loop (there may be several), then walk the string once, copying characters and emitting "__/" whenever the next three characters are "../".</p>`, `<p>Hint 3: finally concatenate "CMakeFiles/" + target + ".dir/" + path + ".o". Dots inside names (a.b.cpp) are kept as-is.</p>`],
    tests: { sig: 'string string -> string', fn: 'objectPath', cases: [[["app","main.cpp"],"CMakeFiles/app.dir/main.cpp.o"],[["core","src/net/socket.cpp"],"CMakeFiles/core.dir/src/net/socket.cpp.o"],[["app","./main.cpp"],"CMakeFiles/app.dir/main.cpp.o"],[["lib","../shared/util.cpp"],"CMakeFiles/lib.dir/__/shared/util.cpp.o"],[["t","../../x.cc"],"CMakeFiles/t.dir/__/__/x.cc.o"],[["my_lib","a.b.cpp"],"CMakeFiles/my_lib.dir/a.b.cpp.o"]] },
    solution: {
      approach: `<p>Strip leading <code>./</code>, then one pass replacing <code>../</code> with <code>__/</code>, then assemble the path.</p>`,
      code: R`#include <string>
using namespace std;

string objectPath(string target, string src) {
    size_t start = 0;
    while (src.compare(start, 2, "./") == 0) start += 2;          // drop leading "./"
    string rel;
    for (size_t i = start; i < src.size();) {
        if (src.compare(i, 3, "../") == 0) { rel += "__/"; i += 3; }   // never escape the .dir folder
        else rel += src[i++];
    }
    return "CMakeFiles/" + target + ".dir/" + rel + ".o";
}`,
      complexity: `<p>O(n) time and space.</p>`
    }
  });

  practice.push({
    title: 'Library File Names Across Platforms', level: 'Easy', tags: ['strings', 'platforms'], companies: ['Microsoft', 'Apple'],
    statement: `<p>Return the file a toolchain produces for a target <code>name</code> of kind <code>static</code>, <code>shared</code> or <code>exe</code> on <code>os</code> ∈ {<code>linux</code>, <code>macos</code>, <code>windows</code>}:</p>
<ul><li>Linux: <code>libX.a</code>, <code>libX.so</code>, <code>X</code>.</li><li>macOS: <code>libX.a</code>, <code>libX.dylib</code>, <code>X</code>.</li><li>Windows (MSVC): <code>X.lib</code>, <code>X.dll</code>, <code>X.exe</code>.</li></ul>`,
    constraints: `Inputs are always one of the listed values.`,
    example: `<p><code>("fmt", "shared", "macos")</code> → <b>${H.c('g', '"libfmt.dylib"')}</b>; <code>("fmt", "static", "windows")</code> → <b>"fmt.lib"</b>.</p>`,
    brute: { why: `<p>Nine nested if/else branches work but are easy to get wrong and hard to extend (MinGW, WebAssembly). A small table of prefix/suffix per (os, kind) is clearer.</p>`, code: R`string libFileNameBrute(string name, string kind, string os) {
    if (os == "linux") { if (kind == "static") return "lib" + name + ".a"; if (kind == "shared") return "lib" + name + ".so"; return name; }
    if (os == "macos") { if (kind == "static") return "lib" + name + ".a"; if (kind == "shared") return "lib" + name + ".dylib"; return name; }
    if (kind == "static") return name + ".lib"; if (kind == "shared") return name + ".dll"; return name + ".exe";
}` },
    mcq: { q: 'On Windows, linking against a DLL uses which file at link time?', options: ['The .dll itself', 'Its import library (.lib)', 'A .def file only', 'Nothing; DLLs are found at run time only'], answer: 1, explain: 'The import library (.lib) tells the linker which symbols live in the DLL; the .dll is loaded at run time.' },
    hints: [`<p>Hint 1: every answer is prefix + name + suffix.</p>`, `<p>Hint 2: store the (prefix, suffix) pairs in a map keyed by os + "/" + kind.</p>`, `<p>Hint 3: executables have no prefix; only Windows adds ".exe". Static libraries on macOS use the same ".a" as Linux.</p>`],
    tests: { sig: 'string string string -> string', fn: 'libFileName', cases: [[["fmt","static","linux"],"libfmt.a"],[["fmt","shared","linux"],"libfmt.so"],[["fmt","shared","macos"],"libfmt.dylib"],[["fmt","static","macos"],"libfmt.a"],[["fmt","static","windows"],"fmt.lib"],[["fmt","shared","windows"],"fmt.dll"],[["app","exe","windows"],"app.exe"],[["app","exe","linux"],"app"]] },
    solution: {
      approach: `<p>A lookup table from <code>os/kind</code> to (prefix, suffix) — the same idea as CMake's <code>CMAKE_SHARED_LIBRARY_PREFIX</code> / <code>_SUFFIX</code> variables.</p>`,
      code: R`#include <map>
#include <string>
#include <utility>
using namespace std;

string libFileName(string name, string kind, string os) {
    static const map<string, pair<string, string>> fix = {
        {"linux/static", {"lib", ".a"}},   {"linux/shared", {"lib", ".so"}},      {"linux/exe", {"", ""}},
        {"macos/static", {"lib", ".a"}},   {"macos/shared", {"lib", ".dylib"}},   {"macos/exe", {"", ""}},
        {"windows/static", {"", ".lib"}}, {"windows/shared", {"", ".dll"}},      {"windows/exe", {"", ".exe"}}};
    const auto& [prefix, suffix] = fix.at(os + "/" + kind);
    return prefix + name + suffix;
}`,
      complexity: `<p>O(|name|) time to build the string; the table lookup is O(1).</p>`
    }
  });

  practice.push({
    title: 'Compare Two Version Strings', level: 'Easy', tags: ['strings', 'parsing', 'semver'], companies: ['Amazon', 'Microsoft', 'Apple'],
    statement: `<p>Compare dotted version strings numerically, part by part. Missing parts count as 0 (<code>1.2</code> equals <code>1.2.0</code>), and leading zeros do not matter (<code>2.01</code> equals <code>2.1</code>). Return −1, 0 or 1. This is how CMake's <code>VERSION_LESS</code> / <code>VERSION_GREATER</code> compare versions.</p>`,
    constraints: `Each part fits in a 32-bit int; up to 100 parts.`,
    example: `<p><code>("1.2.3", "1.2.10")</code> → <b>${H.c('g', '-1')}</b> (10 &gt; 3 as numbers, although "10" &lt; "3" as text). <code>("1.2", "1.2.0")</code> → <b>0</b>.</p>`,
    brute: { why: `<p>Plain string comparison fails on multi-digit parts ("1.2.10" &lt; "1.2.3" as text) and on padding ("1.2" ≠ "1.2.0").</p>`, code: R`int compareVersionsBrute(string a, string b) { return a < b ? -1 : a > b ? 1 : 0; }   // wrong for 1.2.10` },
    mcq: { q: 'What does CMake\'s <code>if(3.28.1 VERSION_LESS 3.4)</code> evaluate to?', options: ['TRUE, because "3.28" &lt; "3.4" as strings', 'FALSE, because 28 &gt; 4 as numbers', 'Error', 'TRUE, because 3.4 has fewer parts'], answer: 1, explain: 'VERSION_* comparisons are component-wise numeric: 28 &gt; 4.' },
    hints: [`<p>Hint 1: split both strings on '.' and convert every part to an integer.</p>`, `<p>Hint 2: compare position by position up to the longer length, treating a missing part as 0.</p>`, `<p>Hint 3: return at the first difference; equal throughout means 0. stoi handles leading zeros.</p>`],
    tests: { sig: 'string string -> int', fn: 'compareVersions', cases: [[["1.2.3","1.2.10"],-1],[["10.0","9.9.9"],1],[["1.2","1.2.0"],0],[["3.28.1","3.28.1"],0],[["4.0.0","3.31.6"],1],[["0.0.1","0.0"],1],[["2.01","2.1"],0]] },
    solution: {
      approach: `<p>Parse both into vectors of ints with a stringstream and <code>getline(…, '.')</code>, pad with zeros, compare.</p>`,
      code: R`#include <sstream>
#include <string>
#include <vector>
using namespace std;

static vector<long long> parts(const string& v) {
    vector<long long> out;
    istringstream in(v);
    for (string p; getline(in, p, '.');) out.push_back(stoll(p));   // "01" -> 1
    return out;
}

int compareVersions(string a, string b) {
    vector<long long> x = parts(a), y = parts(b);
    size_t n = max(x.size(), y.size());
    for (size_t i = 0; i < n; i++) {
        long long p = i < x.size() ? x[i] : 0, q = i < y.size() ? y[i] : 0;   // missing part = 0
        if (p != q) return p < q ? -1 : 1;
    }
    return 0;
}`,
      complexity: `<p>O(|a| + |b|) time and space.</p>`
    }
  });

  practice.push({
    title: 'Generate an Include Guard Macro', level: 'Easy', tags: ['strings', 'preprocessor'], companies: ['Google'],
    statement: `<p>Generate a guard macro from a header path (Google style): drop a leading <code>include/</code> or <code>src/</code> directory (only the first component, and only if more components follow), upper-case the rest, replace every character that is not a letter or digit with <code>_</code>, and append a trailing <code>_</code>. If the result starts with a digit, prefix <code>H_</code>. (Leading underscores followed by a capital letter are reserved for the implementation, so never start a guard with <code>_</code>.)</p>`,
    constraints: `1 ≤ |path| ≤ 300, ASCII.`,
    example: `<p><code>"include/geo/point.h"</code> → <b>${H.c('g', '"GEO_POINT_H_"')}</b>; <code>"3d/mesh.h"</code> → <b>"H_3D_MESH_H_"</b>.</p>`,
    brute: { why: `<p>Calling <code>replace</code> once per kind of special character ('/', '.', '-', …) misses characters you did not think of (spaces, '+'). Classify each character once with <code>isalnum</code>.</p>`, code: R`string includeGuardBrute(string p) {
    for (char& c : p) { if (c == '/' || c == '.') c = '_'; else c = toupper(c); }   // forgets '-'
    return p + "_";
}` },
    mcq: { q: 'Why is <code>_GEO_POINT_H</code> a bad guard name?', options: ['It is too short', 'Names starting with underscore + capital letter are reserved for the implementation', 'Macros cannot start with _', 'It conflicts with #pragma once'], answer: 1, explain: 'Identifiers beginning with an underscore followed by an uppercase letter (or containing a double underscore) are reserved; using them is undefined behaviour.' },
    hints: [`<p>Hint 1: first decide where the name starts: skip "include/" or "src/" only when it is the first component and something follows it.</p>`, `<p>Hint 2: then map every character: isalnum → toupper, otherwise '_'.</p>`, `<p>Hint 3: append '_' and, if the first character is a digit, prepend "H_". Cast chars to unsigned char before calling isalnum/toupper.</p>`],
    tests: { sig: 'string -> string', fn: 'includeGuard', cases: [[["include/geo/point.h"],"GEO_POINT_H_"],[["src/util.hpp"],"UTIL_HPP_"],[["net/http-client.h"],"NET_HTTP_CLIENT_H_"],[["config.h"],"CONFIG_H_"],[["3d/mesh.h"],"H_3D_MESH_H_"],[["third_party/include/x.h"],"THIRD_PARTY_INCLUDE_X_H_"],[["include/a.b/c.hh"],"A_B_C_HH_"]] },
    solution: {
      approach: `<p>Strip the optional first directory, map characters, add the suffix and the digit guard.</p>`,
      code: R`#include <cctype>
#include <string>
using namespace std;

string includeGuard(string path) {
    for (const string root : {"include/", "src/"})
        if (path.rfind(root, 0) == 0 && path.size() > root.size()) { path = path.substr(root.size()); break; }
    string g;
    for (char ch : path) {
        unsigned char c = (unsigned char)ch;
        g += isalnum(c) ? (char)toupper(c) : '_';
    }
    g += '_';
    if (isdigit((unsigned char)g[0])) g = "H_" + g;   // macro names cannot start with a digit
    return g;
}`,
      complexity: `<p>O(n) time and space.</p>`
    }
  });

  practice.push({
    title: 'Single-Pass Static Archive Linking (GNU ld order)', level: 'Medium', tags: ['linker', 'simulation', 'hash set'], companies: ['Nvidia', 'Qualcomm', 'Apple'],
    statement: `<p>Simulate GNU ld's handling of inputs in command-line order. Each line is <code>"file D:sym U:sym ..."</code>. A file named <code>lib&lt;x&gt;.a:member.o</code> is a member of archive <code>lib&lt;x&gt;.a</code>; consecutive lines of the same archive form one archive. Other files are plain objects.</p>
<ul><li>A plain object is always linked: its definitions become defined (and stop being undefined), then its references to not-yet-defined symbols become undefined.</li>
<li>For an archive, repeatedly scan its members in order and link any not-yet-linked member that defines a currently undefined symbol; stop when a full scan links nothing. Then move on — earlier archives are never revisited.</li></ul>
<p>Return the sorted symbols still undefined at the end.</p>`,
    constraints: `≤ 10<sup>4</sup> lines, ≤ 10<sup>5</sup> symbol tokens.`,
    example: `<p><code>["main.o D:main U:parse", "libmem.a:alloc.o D:alloc", "libjson.a:parse.o D:parse U:alloc"]</code> → <b>${H.c('r', '["alloc"]')}</b>: when libmem.a was scanned, nobody needed alloc yet; libjson's parse.o introduced the need later. Swap the two archives and the result is [].</p>`,
    brute: { why: `<p>Treating all archives as one big pool (link everything that is ever needed, in any order) gives the lld/macOS answer, not the GNU ld one — it hides exactly the bug this problem is about. The faithful simulation is cheap; the brute force mistake is semantic, not performance.</p>`, code: R`vector<string> unresolvedAfterLinkBrute(vector<string> lines) {
    // order-insensitive (lld-like): link any member that helps, until nothing changes
    set<string> def, undef; vector<bool> used(lines.size());
    bool changed = true;
    while (changed) {
        changed = false;
        for (size_t i = 0; i < lines.size(); i++) {
            if (used[i]) continue;
            istringstream in(lines[i]); string f, t; in >> f; vector<string> toks; bool need = f.find(".a:") == string::npos;
            while (in >> t) { toks.push_back(t); if (t[0] == 'D' && undef.count(t.substr(2))) need = true; }
            if (!need) continue;
            used[i] = true; changed = true;
            for (auto& x : toks) if (x[0] == 'D') { def.insert(x.substr(2)); undef.erase(x.substr(2)); }
            for (auto& x : toks) if (x[0] == 'U' && !def.count(x.substr(2))) undef.insert(x.substr(2));
        }
    }
    return vector<string>(undef.begin(), undef.end());
}` },
    mcq: { q: 'The link line is <code>g++ -lmath main.o</code> and main.o calls add() from libmath.a. With GNU ld, what happens?', options: ['It links fine', 'undefined reference to add', 'multiple definition of add', 'The linker rescans libmath.a at the end'], answer: 1, explain: 'When libmath.a was scanned, nothing was undefined, so no member was pulled. ld never goes back. Put libraries after the objects that use them.' },
    hints: [`<p>Hint 1: keep two sets — defined and undefined — and update them exactly when a file or member is linked.</p>`, `<p>Hint 2: group consecutive archive-member lines into one archive; for that group loop "scan all members, link those defining something undefined" until a scan changes nothing.</p>`, `<p>Hint 3: process the definitions of a member before its references (a member can satisfy its own needs). A plain object is linked unconditionally. Return the undefined set sorted.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'unresolvedAfterLink', cases: [[[["main.o D:main U:add","libmath.a:add.o D:add"]],[]],[[["libmath.a:add.o D:add","main.o D:main U:add"]],["add"]],[[["main.o D:main U:parse","libjson.a:parse.o D:parse U:alloc","libmem.a:alloc.o D:alloc"]],[]],[[["main.o D:main U:parse","libmem.a:alloc.o D:alloc","libjson.a:parse.o D:parse U:alloc"]],["alloc"]],[[["main.o D:main U:a","libx.a:a.o D:a U:b","libx.a:b.o D:b U:c","libx.a:c.o D:c"]],[]],[[["main.o D:main U:a","libx.a:c.o D:c","libx.a:b.o D:b U:c","libx.a:a.o D:a U:b"]],[]],[[["main.o D:main","libunused.a:z.o D:z U:missing"]],[]],[[["main.o D:main U:f U:g","libp.a:f.o D:f U:g2","libq.a:g.o D:g","libp.a:g2.o D:g2"]],[]]] },
    solution: {
      approach: `<p>Parse lines into units (archive name or empty, tokens). Walk groups in order: plain objects link immediately; archive groups iterate to a fixed point. A <code>std::set</code> for undefined symbols gives sorted output.</p>`,
      code: R`#include <set>
#include <sstream>
#include <string>
#include <unordered_set>
#include <vector>
using namespace std;

class ArchiveLinker {
    unordered_set<string> defined;
    set<string> undefined;
public:
    void link(const vector<string>& toks) {
        for (const string& t : toks) if (t[0] == 'D') { defined.insert(t.substr(2)); undefined.erase(t.substr(2)); }
        for (const string& t : toks) if (t[0] == 'U' && !defined.count(t.substr(2))) undefined.insert(t.substr(2));
    }
    bool wanted(const vector<string>& toks) const {
        for (const string& t : toks) if (t[0] == 'D' && undefined.count(t.substr(2))) return true;
        return false;
    }
    vector<string> result() const { return vector<string>(undefined.begin(), undefined.end()); }
};

vector<string> unresolvedAfterLink(vector<string>& lines) {
    ArchiveLinker ld;
    size_t i = 0;
    while (i < lines.size()) {
        auto parse = [&](size_t k, string& archive) {
            istringstream in(lines[k]); string file; in >> file;
            size_t c = file.find(".a:");
            archive = c == string::npos ? "" : file.substr(0, c + 2);
            vector<string> toks; for (string t; in >> t;) toks.push_back(t);
            return toks;
        };
        string archive;
        vector<string> toks = parse(i, archive);
        if (archive.empty()) { ld.link(toks); i++; continue; }       // plain object: always linked
        vector<vector<string>> members{toks};
        size_t j = i + 1;
        for (string a2; j < lines.size(); j++) {                      // gather consecutive members
            vector<string> t2 = parse(j, a2);
            if (a2 != archive) break;
            members.push_back(t2);
        }
        vector<bool> used(members.size(), false);
        for (bool changed = true; changed;) {                         // rescan this archive to a fixed point
            changed = false;
            for (size_t m = 0; m < members.size(); m++)
                if (!used[m] && ld.wanted(members[m])) { used[m] = true; ld.link(members[m]); changed = true; }
        }
        i = j;                                                        // never revisit this archive
    }
    return ld.result();
}`,
      complexity: `<p>O(M · T) worst case for an archive with M members and T tokens (each fixed-point round links at least one member); typically near-linear.</p>`,
      followUps: ['Add <code>--start-group … --end-group</code>: rescan a group of archives together until nothing changes.', 'Report which member was pulled in because of which symbol (like <code>-Wl,--trace</code>).']
    }
  });

  practice.push({
    title: 'Critical Path: Fastest Possible Build Time', level: 'Medium', tags: ['graph', 'DAG', 'DP', 'DFS'], companies: ['Google', 'Meta', 'Uber'],
    statement: `<p>Each line is <code>"name cost: deps..."</code>: building <code>name</code> takes <code>cost</code> seconds and starts only after all its declared dependencies finish (undeclared names are prebuilt and ignored). With unlimited parallel workers, return the minimum total build time — the length of the longest (critical) path. Return −1 if there is a cycle. An empty list takes 0 seconds.</p>`,
    constraints: `≤ 10<sup>5</sup> targets, 2·10<sup>5</sup> edges, 1 ≤ cost ≤ 10<sup>4</sup>.`,
    example: `<p><code>["core 4:", "net 3: core", "ui 5: core", "app 2: net ui"]</code> → <b>${H.c('g', '11')}</b> = core 4 + ui 5 + app 2. Adding cores cannot beat 11.</p>`,
    brute: { why: `<p>Enumerating every path from every target is exponential in a diamond-heavy graph. Each target's finish time depends only on its dependencies' finish times, so compute it once (memoised DFS or topological DP).</p>`, code: R`int finishBrute(map<string, pair<int, vector<string>>>& g, const string& t, int depth) {
    if (depth > (int)g.size()) return INT_MIN / 2;             // a path longer than V nodes means a cycle
    int best = 0;
    for (auto& d : g[t].second) if (g.count(d)) best = max(best, finishBrute(g, d, depth + 1));   // recomputed
    return g[t].first + best;
}` },
    mcq: { q: 'Which statement about the critical path is true?', options: ['More cores always reduce build time', 'It is a lower bound on build time no matter how many cores you have', 'It equals the sum of all costs', 'It only matters for single-core builds'], answer: 1, explain: 'Targets on the critical path must run one after another. The sum of all costs is the single-core time; the critical path is the infinite-core time.' },
    hints: [`<p>Hint 1: finish(t) = cost(t) + max(finish(d)) over declared dependencies d (0 if none).</p>`, `<p>Hint 2: Kahn's algorithm processes targets in dependency order, so finish(d) is known before finish(t). Keep a running max.</p>`, `<p>Hint 3: if Kahn's algorithm processes fewer targets than exist, there is a cycle → −1. The answer is the max finish over all targets.</p>`],
    tests: { sig: 'string[] -> int', fn: 'criticalPath', cases: [[[["core 4:","net 3: core","ui 5: core","app 2: net ui"]],11],[[["a 1:","b 2:","c 3:"]],3],[[["a 2: b","b 3: a"]],-1],[[["x 7:"]],7],[[["gen 1:","lib 10: gen","tool 2: gen","test 4: lib tool","docs 20:"]],20],[[["a 5: ext"]],5],[[["a 1: b","b 1: c","c 1: d","d 1:","e 2: c"]],4]] },
    solution: {
      approach: `<p>Topological order with Kahn's algorithm; relax <code>finish[user] = max(finish[user], finish[t] + cost[user])</code>-style values as targets complete. Iterative, so no recursion limit.</p>`,
      code: R`#include <algorithm>
#include <queue>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

int criticalPath(vector<string>& lines) {
    unordered_map<string, int> cost, waiting;
    unordered_map<string, vector<string>> deps, users;
    for (const string& line : lines) {
        size_t colon = line.find(':');
        istringstream head(line.substr(0, colon)), tail(line.substr(colon + 1));
        string name; int c; head >> name >> c;
        cost[name] = c;
        for (string d; tail >> d;) deps[name].push_back(d);
    }
    for (auto& [t, c] : cost) {
        waiting[t] += 0;
        for (const string& d : deps[t]) if (cost.count(d)) { waiting[t]++; users[d].push_back(t); }
    }
    queue<string> ready;
    unordered_map<string, int> startAt;                  // earliest start = max finish of deps
    for (auto& [t, w] : waiting) if (w == 0) ready.push(t);
    int done = 0, best = 0;
    while (!ready.empty()) {
        string t = ready.front(); ready.pop(); done++;
        int finish = startAt[t] + cost[t];
        best = max(best, finish);
        for (const string& u : users[t]) {
            startAt[u] = max(startAt[u], finish);
            if (--waiting[u] == 0) ready.push(u);
        }
    }
    return done == (int)cost.size() ? best : -1;
}`,
      complexity: `<p>O(V + E) time and space.</p>`,
      followUps: ['Print the critical path itself, not only its length.', 'With exactly <code>j</code> workers the answer can be larger — see the parallel build simulation problem.']
    }
  });

  practice.push({
    title: 'Plan Unity Build Batches', level: 'Medium', tags: ['arrays', 'grouping', 'CMake'], companies: ['Epic Games', 'Ubisoft', 'Microsoft'],
    statement: `<p>Simulate CMake's unity build grouping for one target. Sources are given in order. Headers (<code>.h</code>, <code>.hpp</code>) are never batched or listed. A source prefixed with <code>!</code> has <code>SKIP_UNITY_BUILD_INCLUSION</code> and is compiled alone. The remaining sources are cut, in order, into batches of <code>batchSize</code> (0 means one batch with everything). Return one line per batch, <code>"unity_&lt;i&gt;_cxx.cxx: a.cpp b.cpp"</code> (i from 0), followed by the skipped sources (without the <code>!</code>) in input order.</p>`,
    constraints: `≤ 10<sup>5</sup> sources; 0 ≤ batchSize ≤ 10<sup>5</sup>.`,
    example: `<p><code>(["a.cpp", "!legacy.cpp", "b.cpp", "a.h"], 8)</code> → <b>${H.c('g', '["unity_0_cxx.cxx: a.cpp b.cpp", "legacy.cpp"]')}</b>.</p>`,
    brute: { why: `<p>Repeatedly erasing the first <code>batchSize</code> elements from a vector is O(n²/k) because each erase shifts the rest. Walk the list once with an index.</p>`, code: R`vector<string> unityBatchesBrute(vector<string> srcs, int k) {
    vector<string> pool, alone, out;
    for (auto& s : srcs) {
        if (s[0] == '!') alone.push_back(s.substr(1));
        else if (!(s.size() > 2 && s.substr(s.size() - 2) == ".h") && !(s.size() > 4 && s.substr(s.size() - 4) == ".hpp")) pool.push_back(s);
    }
    int size = k > 0 ? k : max<int>(1, pool.size());
    for (int b = 0; !pool.empty(); b++) {
        string line = "unity_" + to_string(b) + "_cxx.cxx:";
        int take = min<int>(size, pool.size());
        for (int i = 0; i < take; i++) line += " " + pool[i];
        pool.erase(pool.begin(), pool.begin() + take);       // O(n) shift each time
        out.push_back(line);
    }
    out.insert(out.end(), alone.begin(), alone.end());
    return out;
}` },
    mcq: { q: 'Which code is most likely to break when unity builds are turned on?', options: ['Functions declared in headers', 'Two .cpp files each defining a static helper with the same name', 'Templates', 'Code using std::vector'], answer: 1, explain: 'Batched files share one TU, so file-local (static / unnamed-namespace) names now clash.' },
    hints: [`<p>Hint 1: first partition the input into three groups: headers (drop), skipped (! prefix), batchable.</p>`, `<p>Hint 2: the effective batch size is batchSize, or the number of batchable sources when batchSize is 0.</p>`, `<p>Hint 3: step through batchable sources with index i += size, building one line per slice. Empty input → empty output; don't create an empty batch.</p>`],
    tests: { sig: 'string[] int -> string[]', fn: 'unityBatches', cases: [[[["a.cpp","b.cpp","c.cpp","d.cpp","e.cpp"],2],["unity_0_cxx.cxx: a.cpp b.cpp","unity_1_cxx.cxx: c.cpp d.cpp","unity_2_cxx.cxx: e.cpp"]],[[["a.cpp","b.cpp","c.cpp"],0],["unity_0_cxx.cxx: a.cpp b.cpp c.cpp"]],[[["a.cpp","!legacy.cpp","b.cpp","a.h"],8],["unity_0_cxx.cxx: a.cpp b.cpp","legacy.cpp"]],[[["!x.cpp","!y.cpp"],4],["x.cpp","y.cpp"]],[[[],3],[]],[[["m.cpp","n.cpp"],1],["unity_0_cxx.cxx: m.cpp","unity_1_cxx.cxx: n.cpp"]],[[["a.cpp","b.hpp","c.cpp","d.cpp"],3],["unity_0_cxx.cxx: a.cpp c.cpp d.cpp"]]] },
    solution: {
      approach: `<p>One pass to classify, one pass to slice. Lines are built with string concatenation.</p>`,
      code: R`#include <algorithm>
#include <string>
#include <vector>
using namespace std;

static bool endsWith(const string& s, const string& suf) { return s.size() >= suf.size() && s.compare(s.size() - suf.size(), suf.size(), suf) == 0; }

vector<string> unityBatches(vector<string>& sources, int batchSize) {
    vector<string> batchable, alone, out;
    for (const string& s : sources) {
        if (!s.empty() && s[0] == '!') alone.push_back(s.substr(1));       // SKIP_UNITY_BUILD_INCLUSION
        else if (!endsWith(s, ".h") && !endsWith(s, ".hpp")) batchable.push_back(s);
    }
    size_t size = batchSize > 0 ? (size_t)batchSize : max<size_t>(1, batchable.size());
    for (size_t i = 0, b = 0; i < batchable.size(); i += size, b++) {
        string line = "unity_" + to_string(b) + "_cxx.cxx:";
        for (size_t k = i; k < min(i + size, batchable.size()); k++) line += " " + batchable[k];
        out.push_back(line);
    }
    out.insert(out.end(), alone.begin(), alone.end());
    return out;
}`,
      complexity: `<p>O(total characters) time and space.</p>`
    }
  });

  practice.push({
    title: 'Find Diamond Version Conflicts', level: 'Medium', tags: ['hash map', 'sorting', 'package managers'], companies: ['JFrog', 'Microsoft', 'Google'],
    statement: `<p>Each line is <code>"consumer -&gt; pkg/version"</code>. Report every package requested at <b>more than one</b> distinct version, one line per package sorted by package name: <code>"pkg: v1 (by c1 c2), v2 (by c3)"</code>, versions in ascending <b>numeric</b> order (MAJOR.MINOR.PATCH), consumers sorted and space-separated.</p>`,
    constraints: `≤ 10<sup>5</sup> lines.`,
    example: `<p><code>["a -&gt; z/1.10.0", "b -&gt; z/1.9.0", "c -&gt; z/1.10.0", "d -&gt; y/2.0.0", "e -&gt; y/1.0.0"]</code> → <b>${H.c('r', '["y: 1.0.0 (by e), 2.0.0 (by d)", "z: 1.9.0 (by b), 1.10.0 (by a c)"]')}</b>. Note 1.9.0 &lt; 1.10.0.</p>`,
    brute: { why: `<p>For each package, scanning all lines again to collect its versions is O(n²). Sorting versions as strings puts 1.10.0 before 1.9.0. Use nested maps keyed by package, then by a numeric version key.</p>`, code: R`vector<string> versionConflictsBrute(vector<string> lines) {
    set<string> pkgs, out;
    for (auto& l : lines) pkgs.insert(l.substr(l.find("-> ") + 3, l.find('/') - l.find("-> ") - 3));
    for (auto& p : pkgs) {
        set<string> vs;                                         // string order: 1.10.0 < 1.9.0 (wrong)
        for (auto& l : lines) if (l.find("-> " + p + "/") != string::npos) vs.insert(l.substr(l.find('/') + 1));
        if (vs.size() > 1) out.insert(p);
    }
    return vector<string>(out.begin(), out.end());               // also missing the details
}` },
    mcq: { q: 'Why can\'t a C++ program simply link both fmt 9 and fmt 10?', options: ['Linkers reject two files with the same name', 'Both define the same symbols; the result is duplicate symbols or a silent ODR violation', 'CMake forbids it', 'It works fine'], answer: 1, explain: 'Same names, different definitions: with static linking you get duplicates or one silently wins; with shared libraries, symbol interposition picks one at run time.' },
    hints: [`<p>Hint 1: group twice: package → version → set of consumers.</p>`, `<p>Hint 2: use a map whose key is the parsed version (array of 3 ints) so iteration is in numeric order; keep the original string for printing.</p>`, `<p>Hint 3: std::map on the package name gives sorted output; std::set on consumers gives sorted names. Only print packages with ≥ 2 versions.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'versionConflicts', cases: [[[["app -> fmt/10.2.1","app -> spdlog/1.12.0","spdlog -> fmt/9.1.0"]],["fmt: 9.1.0 (by spdlog), 10.2.1 (by app)"]],[[["app -> fmt/10.2.1","spdlog -> fmt/10.2.1"]],[]],[[["a -> z/1.10.0","b -> z/1.9.0","c -> z/1.10.0","d -> y/2.0.0","e -> y/1.0.0"]],["y: 1.0.0 (by e), 2.0.0 (by d)","z: 1.9.0 (by b), 1.10.0 (by a c)"]],[[[]],[]],[[["app -> boost/1.84.0"]],[]],[[["x -> p/2.0.0","y -> p/10.0.0","z -> p/2.0.0","w -> q/1.0.0"]],["p: 2.0.0 (by x z), 10.0.0 (by y)"]]] },
    solution: {
      approach: `<p><code>map&lt;string, map&lt;array&lt;int,3&gt;, pair&lt;string, set&lt;string&gt;&gt;&gt;&gt;</code>: package → numeric version → (text, consumers). Emit packages with more than one version.</p>`,
      code: R`#include <array>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

vector<string> versionConflicts(vector<string>& lines) {
    map<string, map<array<long long, 3>, pair<string, set<string>>>> req;
    for (const string& line : lines) {
        size_t arrow = line.find(" -> "), slash = line.find('/', arrow);
        string consumer = line.substr(0, arrow);
        string pkg = line.substr(arrow + 4, slash - arrow - 4), ver = line.substr(slash + 1);
        array<long long, 3> key{};
        char dot;
        istringstream(ver) >> key[0] >> dot >> key[1] >> dot >> key[2];
        auto& entry = req[pkg][key];
        entry.first = ver;
        entry.second.insert(consumer);
    }
    vector<string> out;
    for (auto& [pkg, versions] : req) {
        if (versions.size() < 2) continue;
        string line = pkg + ":";
        bool first = true;
        for (auto& [key, entry] : versions) {
            line += (first ? " " : ", ") + entry.first + " (by";
            for (const string& c : entry.second) line += " " + c;
            line += ")";
            first = false;
        }
        out.push_back(line);
    }
    return out;
}`,
      complexity: `<p>O(n log n) time, O(n) space.</p>`
    }
  });

  practice.push({
    title: 'Header Impact Report: Which Headers Rebuild the Most?', level: 'Medium', tags: ['graph', 'DFS', 'sorting'], companies: ['Google', 'Bloomberg', 'Adobe'],
    statement: `<p>Each line is <code>"file: includes..."</code> (lines may repeat a file). For every header reachable from at least one <code>.cpp</code>, count how many <code>.cpp</code> files include it <b>transitively</b>. Return <code>"header count"</code> lines sorted by count descending, then name ascending. This is the list of headers that cause the biggest rebuilds when touched. Include cycles may exist.</p>`,
    constraints: `≤ 2000 sources, ≤ 10<sup>4</sup> files, ≤ 10<sup>5</sup> edges.`,
    example: `<p><code>["a.cpp: a.h base.h", "b.cpp: b.h", "b.h: base.h", "c.cpp: c.h"]</code> → <b>${H.c('g', '["base.h 2", "a.h 1", "b.h 1", "c.h 1"]')}</b>.</p>`,
    brute: { why: `<p>For each header, check every source by running a reachability search from that source: O(H·S·(V + E)). Reverse it: one search per source, adding 1 to every header it reaches, is O(S·(V + E)).</p>`, code: R`vector<string> headerImpactBrute(vector<string> lines) {
    map<string, vector<string>> g; set<string> files;
    for (auto& l : lines) { string a = l.substr(0, l.find(':')); istringstream in(l.substr(l.find(':') + 1)); string x;
        files.insert(a); while (in >> x) { g[a].push_back(x); files.insert(x); } }
    vector<pair<int, string>> rows;
    for (auto& h : files) {
        if (h.size() > 4 && h.substr(h.size() - 4) == ".cpp") continue;
        int cnt = 0;
        for (auto& [s, _] : g) {
            if (!(s.size() > 4 && s.substr(s.size() - 4) == ".cpp")) continue;
            set<string> seen; vector<string> st(g[s].begin(), g[s].end());
            while (!st.empty()) { string x = st.back(); st.pop_back(); if (!seen.insert(x).second) continue; for (auto& y : g[x]) st.push_back(y); }
            cnt += seen.count(h);
        }
        if (cnt) rows.push_back({-cnt, h});
    }
    sort(rows.begin(), rows.end());
    vector<string> out; for (auto& [c, h] : rows) out.push_back(h + " " + to_string(-c));
    return out;
}` },
    mcq: { q: 'A header is included by 3,000 of 4,000 sources. What is usually the best first fix?', options: ['Add it to a precompiled header and keep editing it often', 'Split it and reduce who includes it (forward declarations, pimpl), so edits touch fewer TUs', 'Make every function in it inline', 'Rename it'], answer: 1, explain: 'A PCH only speeds parsing; every edit still rebuilds all 3,000 TUs. Reducing fan-in is what shrinks incremental rebuilds.' },
    hints: [`<p>Hint 1: flip the question — from each source, which headers can it reach? Add one to each.</p>`, `<p>Hint 2: an iterative DFS with a visited set per source handles diamonds and cycles; start from the source's direct includes so the source itself is not counted.</p>`, `<p>Hint 3: sort with a comparator (count desc, name asc) and format "name count". Sources with no includes contribute nothing.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'headerImpact', cases: [[[["a.cpp: a.h base.h","b.cpp: b.h","b.h: base.h","c.cpp: c.h"]],["base.h 2","a.h 1","b.h 1","c.h 1"]],[[["x.cpp:"]],[]],[[["a.cpp: p.h","p.h: q.h","q.h: p.h"]],["p.h 1","q.h 1"]],[[["m.cpp: big.h","n.cpp: big.h","o.cpp: big.h small.h","big.h: vector string"]],["big.h 3","string 3","vector 3","small.h 1"]],[[[]],[]],[[["z.cpp: a.h","y.cpp: b.h","a.h: c.h","b.h: c.h"]],["c.h 2","a.h 1","b.h 1"]]] },
    solution: {
      approach: `<p>Build the adjacency list. For each source, DFS its closure and increment a counter per reached header. Sort and format.</p>`,
      code: R`#include <algorithm>
#include <sstream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
using namespace std;

vector<string> headerImpact(vector<string>& lines) {
    unordered_map<string, vector<string>> inc;
    vector<string> sources;
    for (const string& line : lines) {
        size_t colon = line.find(':');
        string f = line.substr(0, colon);
        if (f.size() > 4 && f.compare(f.size() - 4, 4, ".cpp") == 0 && !inc.count(f)) sources.push_back(f);
        auto& v = inc[f];
        istringstream in(line.substr(colon + 1));
        for (string x; in >> x;) v.push_back(x);
    }
    unordered_map<string, int> count;
    for (const string& s : sources) {
        unordered_set<string> seen;
        vector<string> stack(inc[s].begin(), inc[s].end());
        while (!stack.empty()) {
            string h = stack.back(); stack.pop_back();
            if (!seen.insert(h).second) continue;
            count[h]++;
            if (auto it = inc.find(h); it != inc.end()) stack.insert(stack.end(), it->second.begin(), it->second.end());
        }
    }
    vector<pair<string, int>> rows(count.begin(), count.end());
    sort(rows.begin(), rows.end(), [](auto& a, auto& b) { return a.second != b.second ? a.second > b.second : a.first < b.first; });
    vector<string> out;
    for (auto& [h, c] : rows) out.push_back(h + " " + to_string(c));
    return out;
}`,
      complexity: `<p>O(S·(V + E) + H log H) time, O(V + E) space.</p>`
    }
  });

  practice.push({
    title: 'Simulate a Parallel Build with j Workers', level: 'Hard', tags: ['simulation', 'heap', 'topological sort', 'scheduling'], companies: ['Google', 'Meta', 'Nvidia'],
    statement: `<p>Targets are given as <code>"name cost: deps..."</code> (undeclared deps are prebuilt). Simulate <code>ninja -j jobs</code> with this deterministic policy: time starts at 0; whenever a worker is free and targets are ready, start the <b>lexicographically smallest</b> ready target; a target is ready when all declared deps have <b>finished</b>. Targets finishing at the same moment all complete before new ones start. Return the time the last target finishes, 0 for no targets, or −1 if a cycle prevents finishing.</p>`,
    constraints: `≤ 10<sup>5</sup> targets, 1 ≤ jobs ≤ 256, costs ≤ 10<sup>4</sup>.`,
    example: `<p><code>(["a 2:", "b 9:", "c 1: a", "d 1: a", "e 1: c d"], 2)</code> → <b>${H.c('g', '9')}</b>: a and b start at 0; a ends at 2, c runs 2–3, d 3–4, e 4–5 on one worker while b occupies the other until 9.</p>`,
    brute: { why: `<p>Ticking a clock one second at a time costs O(total time × V) — 10<sup>9</sup> steps for long builds. Jump directly to the next finish event with a min-heap of running jobs.</p>`, code: R`int parallelBuildTimeBrute(vector<string> lines, int jobs) {
    map<string, int> cost, left; map<string, vector<string>> deps;
    for (auto& l : lines) { istringstream h(l.substr(0, l.find(':'))), t(l.substr(l.find(':') + 1)); string n, d; int c;
        h >> n >> c; cost[n] = c; left[n] = c; while (t >> d) deps[n].push_back(d); }
    set<string> done, running; int time = 0;
    while (done.size() < cost.size()) {
        for (auto& [n, c] : cost) {                                       // start smallest ready names
            if ((int)running.size() >= jobs) break;
            if (done.count(n) || running.count(n)) continue;
            bool ok = true; for (auto& d : deps[n]) if (cost.count(d) && !done.count(d)) ok = false;
            if (ok) running.insert(n);
        }
        if (running.empty()) return -1;
        time++;                                                           // one tick at a time
        vector<string> fin; for (auto& n : running) if (--left[n] == 0) fin.push_back(n);
        for (auto& n : fin) { running.erase(n); done.insert(n); }
    }
    return time;
}` },
    mcq: { q: 'With unlimited workers a build takes 11 s and the sum of all costs is 30 s. With 2 workers the time T satisfies…', options: ['T = 11', '11 ≤ T and 15 ≤ T (T ≥ max(critical path, total/2))', 'T = 30', 'T &lt; 11'], answer: 1, explain: 'Two lower bounds: the critical path, and total work divided by workers. The real schedule is at least the larger of the two.' },
    hints: [`<p>Hint 1: an event simulation: a ready set (ordered, smallest first), a running min-heap of (finish time, name), and in-degree counters.</p>`, `<p>Hint 2: loop: fill free workers from the ready set at the current time; then advance time to the earliest finish, pop <b>every</b> job finishing at that time, and release their users.</p>`, `<p>Hint 3: when nothing is running and nothing is ready but targets remain, there is a cycle → −1. Use long long if costs × targets could overflow int (here int is enough: 10<sup>9</sup>).</p>`],
    tests: { sig: 'string[] int -> int', fn: 'parallelBuildTime', cases: [[[["core 4:","net 3: core","ui 5: core","app 2: net ui"],1],14],[[["core 4:","net 3: core","ui 5: core","app 2: net ui"],2],11],[[["a 3:","b 3:","c 3:","d 3:"],2],6],[[["a 3:","b 3:","c 3:","d 3:"],8],3],[[["a 1: b","b 1: a"],4],-1],[[["x 5:"],3],5],[[["a 2:","b 9:","c 1: a","d 1: a","e 1: c d"],2],9],[[["big 10:","z1 1:","z2 1:","z3 1:"],2],10]] },
    solution: {
      approach: `<p>Discrete-event simulation. <code>std::set&lt;string&gt;</code> holds ready targets (smallest first), a <code>priority_queue</code> with <code>greater&lt;&gt;</code> holds running jobs by finish time. Each loop starts as many jobs as there are free workers, then jumps to the next finish time and completes all jobs ending then.</p>`,
      code: R`#include <functional>
#include <queue>
#include <set>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

int parallelBuildTime(vector<string>& lines, int jobs) {
    unordered_map<string, int> cost, waiting;
    unordered_map<string, vector<string>> deps, users;
    for (const string& line : lines) {
        size_t colon = line.find(':');
        istringstream head(line.substr(0, colon)), tail(line.substr(colon + 1));
        string name; int c; head >> name >> c;
        cost[name] = c;
        for (string d; tail >> d;) deps[name].push_back(d);
    }
    set<string> ready;
    for (auto& [t, c] : cost) {
        int w = 0;
        for (const string& d : deps[t]) if (cost.count(d)) { w++; users[d].push_back(t); }
        waiting[t] = w;
        if (w == 0) ready.insert(t);
    }
    using Job = pair<long long, string>;                              // (finish time, name)
    priority_queue<Job, vector<Job>, greater<Job>> running;
    long long now = 0;
    size_t finished = 0;
    while (true) {
        while ((int)running.size() < jobs && !ready.empty()) {         // fill free workers
            string t = *ready.begin(); ready.erase(ready.begin());
            running.push({now + cost[t], t});
        }
        if (running.empty()) break;
        now = running.top().first;                                    // jump to next event
        while (!running.empty() && running.top().first == now) {      // finish all jobs ending now
            string t = running.top().second; running.pop(); finished++;
            for (const string& u : users[t]) if (--waiting[u] == 0) ready.insert(u);
        }
    }
    return finished == cost.size() ? (int)now : -1;
}`,
      complexity: `<p>O((V + E) log V) time, O(V + E) space.</p>`,
      followUps: ['Prefer the target with the longest remaining critical path instead of the smallest name (a better heuristic, used by some schedulers).', 'Add a separate pool of size 1 for link steps (Ninja <code>JOB_POOL_LINK</code>).']
    }
  });

  practice.push({
    title: 'Resolve One Version per Package from Ranges', level: 'Hard', tags: ['parsing', 'semver', 'hash map'], companies: ['JFrog', 'Microsoft', 'Amazon'],
    statement: `<p><code>available</code> lines are <code>"pkg v1 v2 ..."</code> (versions MAJOR.MINOR.PATCH in any order). <code>constraints</code> lines are <code>"consumer pkg RANGE"</code> where RANGE uses the syntax of the guided semver problem (comparators <code>&gt;= &lt;= &gt; &lt; =</code>, <code>^</code>, <code>~</code>, spaces = AND, <code>||</code> = OR). For every package that is available or constrained, choose the <b>newest</b> available version satisfying <b>all</b> its constraints. Return <code>"pkg version"</code> or <code>"pkg CONFLICT"</code>, sorted by package.</p>`,
    constraints: `≤ 1000 packages, ≤ 100 versions each, ≤ 10<sup>4</sup> constraints.`,
    example: `<p>available <code>["fmt 9.1.0 10.0.0 10.2.1 11.0.2"]</code>, constraints <code>["app fmt &gt;=10.0.0 &lt;11.0.0", "spdlog fmt ^10.1.0"]</code> → <b>${H.c('g', '["fmt 10.2.1"]')}</b>. With <code>["app fmt &gt;=10.0.0", "old fmt &lt;10.0.0"]</code> → <b>${H.c('r', '["fmt CONFLICT"]')}</b>.</p>`,
    brute: { why: `<p>Trying every combination of versions across packages is exponential. Because constraints here are per package (no transitive requirements), packages are independent: filter each package's versions on its own and take the max.</p>`, code: R`// Exponential "try every combination" search, shown for contrast; packages here are independent.
long long combinationsBrute(const vector<int>& versionsPerPackage) {
    long long total = 1;
    for (int v : versionsPerPackage) total *= v;      // 100 versions ^ 1000 packages: hopeless
    return total;
}` },
    mcq: { q: 'Constraints <code>^10.1.0</code> and <code>&gt;=10.0.0 &lt;11.0.0</code> on fmt, available 10.0.0, 10.2.1, 11.0.2. Which is chosen?', options: ['10.0.0', '10.2.1', '11.0.2', 'CONFLICT'], answer: 1, explain: '10.0.0 fails ^10.1.0, 11.0.2 fails both upper bounds; 10.2.1 is the newest version that satisfies both.' },
    hints: [`<p>Hint 1: reuse a satisfies(version, range) function; the problem is then filtering and max per package.</p>`, `<p>Hint 2: group constraints by package (ignore the consumer except for messages). Collect the union of package names from both inputs into a std::set for sorted output.</p>`, `<p>Hint 3: compare versions numerically (array of ints), never as strings. A constrained package with no available versions is a CONFLICT; an unconstrained one takes its newest version.</p>`],
    tests: { sig: 'string[] string[] -> string[]', fn: 'resolveVersions', cases: [[[["fmt 9.1.0 10.0.0 10.2.1 11.0.2"],["app fmt >=10.0.0 <11.0.0","spdlog fmt ^10.1.0"]],["fmt 10.2.1"]],[[["fmt 9.1.0 10.2.1"],["app fmt >=10.0.0","old fmt <10.0.0"]],["fmt CONFLICT"]],[[["zlib 1.2.13 1.3.1","boost 1.83.0 1.84.0 1.86.0"],["app boost ~1.84.0"]],["boost 1.84.0","zlib 1.3.1"]],[[["a 0.2.3 0.2.9 0.3.0"],["x a ^0.2.3"]],["a 0.2.9"]],[[["g 2.0.0 10.0.0 9.0.0"],[]],["g 10.0.0"]],[[["h 1.0.0"],["x h 1.0.0 || 2.0.0","y h >=1.0.0"]],["h 1.0.0"]],[[[],["app ghost >=1.0.0"]],["ghost CONFLICT"]]] },
    solution: {
      approach: `<p>Parse versions to integer arrays, implement range matching (alternatives of comparators), then for each package keep the maximum satisfying version.</p>`,
      code: R`#include <array>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

namespace semver {
using Ver = array<long long, 3>;
Ver parse(const string& s) { Ver v{}; char d; istringstream(s) >> v[0] >> d >> v[1] >> d >> v[2]; return v; }
bool holds(const Ver& v, const string& c) {
    string op;
    for (const char* o : {">=", "<=", ">", "<", "=", "^", "~"}) if (c.rfind(o, 0) == 0) { op = o; break; }
    Ver t = parse(c.substr(op.size()));
    if (op.empty() || op == "=") return v == t;
    if (op == ">=") return v >= t;
    if (op == "<=") return v <= t;
    if (op == ">") return v > t;
    if (op == "<") return v < t;
    Ver hi = op == "~" ? Ver{t[0], t[1] + 1, 0} : t[0] ? Ver{t[0] + 1, 0, 0} : t[1] ? Ver{0, t[1] + 1, 0} : Ver{0, 0, t[2] + 1};
    return t <= v && v < hi;
}
bool satisfies(const Ver& v, const string& range) {
    size_t start = 0;
    while (true) {
        size_t bar = range.find("||", start);
        istringstream in(range.substr(start, bar == string::npos ? string::npos : bar - start));
        bool all = true, any = false;
        for (string c; in >> c;) { any = true; if (!holds(v, c)) { all = false; break; } }
        if (any && all) return true;
        if (bar == string::npos) return false;
        start = bar + 2;
    }
}
}  // namespace semver

vector<string> resolveVersions(vector<string>& available, vector<string>& constraints) {
    map<string, vector<string>> versions, ranges;
    set<string> pkgs;
    for (const string& line : available) {
        istringstream in(line); string p; in >> p; pkgs.insert(p);
        for (string v; in >> v;) versions[p].push_back(v);
    }
    for (const string& line : constraints) {
        istringstream in(line); string consumer, p; in >> consumer >> p; pkgs.insert(p);
        string range; getline(in, range);
        ranges[p].push_back(range);
    }
    vector<string> out;
    for (const string& p : pkgs) {
        string best;
        semver::Ver bestV{-1, -1, -1};
        for (const string& v : versions[p]) {
            semver::Ver pv = semver::parse(v);
            bool ok = true;
            for (const string& r : ranges[p]) if (!semver::satisfies(pv, r)) { ok = false; break; }
            if (ok && pv > bestV) { bestV = pv; best = v; }
        }
        out.push_back(p + " " + (best.empty() ? "CONFLICT" : best));
    }
    return out;
}`,
      complexity: `<p>O(P·V·C·L) for P packages, V versions, C constraints per package and range length L.</p>`,
      followUps: ['Add transitive requirements (a chosen version brings its own constraints) — now backtracking or a SAT solver is needed, as in real resolvers.', 'Prefer the lowest satisfying version (Go-style minimal version selection).']
    }
  });

  practice.push({
    title: 'Static Link Line Order with Cyclic Libraries', level: 'Hard', tags: ['graph', 'SCC', 'topological sort'], companies: ['Kitware', 'Google', 'Qualcomm'],
    statement: `<p>Lines are <code>"lib: deps..."</code> between static libraries. Produce the GNU-ld-friendly link line for <code>root</code>: every library reachable from root (excluding root itself), with each library placed <b>before</b> the libraries it depends on. Libraries in a dependency cycle (a strongly connected component of size &gt; 1) cannot be ordered, so — as CMake does — write the component's members in sorted order <b>twice</b> in a row.</p>
<p>Deterministic order: process components with Kahn's algorithm on the component graph (edges from dependent to dependency); among ready components pick the one whose sorted member list is lexicographically smallest. Names used only as dependencies are libraries with no deps.</p>`,
    constraints: `≤ 2000 libraries, ≤ 10<sup>4</sup> edges.`,
    example: `<p><code>["app: a", "a: b", "b: a c"]</code>, root <code>app</code> → <b>${H.c('g', '["a", "b", "a", "b", "c"]')}</b>: a and b need each other, so they appear twice, then c.</p>`,
    brute: { why: `<p>Repeating the whole library list N times (<code>-la -lb -lc -la -lb -lc …</code>) always links but bloats the command line quadratically and slows the linker. Only the cyclic groups need repetition; everything else just needs a topological order.</p>`, code: R`vector<string> linkLineBrute(vector<string> lines, string root) {
    map<string, vector<string>> g; set<string> all;
    for (auto& l : lines) { string a = l.substr(0, l.find(':')); istringstream in(l.substr(l.find(':') + 1)); string x;
        g[a]; while (in >> x) { g[a].push_back(x); all.insert(x); } }
    all.erase(root);
    vector<string> out;
    for (size_t k = 0; k < all.size(); k++) out.insert(out.end(), all.begin(), all.end());   // n copies of everything
    return out;
}` },
    mcq: { q: 'Why does a cycle between two static libraries need them listed twice for GNU ld?', options: ['To double the speed', 'Because ld scans each archive once, left to right; members pulled from the second can need symbols from the first', 'Because CMake requires it', 'Shared libraries need it too'], answer: 1, explain: 'After scanning libB, new undefined symbols may point back into libA, which ld will not rescan unless it appears again (or a --start-group is used).' },
    hints: [`<p>Hint 1: first restrict to libraries reachable from root, then find strongly connected components (Tarjan, Kosaraju, or mutual reachability for small inputs).</p>`, `<p>Hint 2: contract each component to one node with the sorted member list as its key; build component edges dependent → dependency and run Kahn's algorithm with a min-heap on the keys.</p>`, `<p>Hint 3: when emitting a component, append its sorted members once, or twice if it has more than one member. Edges into root (cycles through root) are ignored because root is not on the line.</p>`],
    tests: { sig: 'string[] string -> string[]', fn: 'linkLine', cases: [[[["app: net core","net: core ssl","ssl: crypto","core:"],"app"],["net","core","ssl","crypto"]],[[["app: a","a: b","b: a c"],"app"],["a","b","a","b","c"]],[[["app: z y x"],"app"],["x","y","z"]],[[["app:"],"app"],[]],[[["app: p","p: q","q: r","r: p","s: app"],"app"],["p","q","r","p","q","r"]],[[["app: m n","m: k","n: k","k: l","l: k"],"app"],["m","n","k","l","k","l"]],[[["t: u v","u: w","v: w","w:","other: t"],"other"],["t","u","v","w"]]] },
    solution: {
      approach: `<p>Iterative reachability from root, Tarjan's SCC (iterative) on the reachable subgraph excluding root, then Kahn's algorithm on the condensation with a min-heap keyed by each component's sorted member list.</p>`,
      code: R`#include <algorithm>
#include <functional>
#include <map>
#include <queue>
#include <set>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

vector<string> linkLine(vector<string>& lines, string root) {
    map<string, vector<string>> g;
    for (const string& line : lines) {
        size_t colon = line.find(':');
        auto& v = g[line.substr(0, colon)];
        istringstream in(line.substr(colon + 1));
        for (string x; in >> x;) { v.push_back(x); g[x]; }
    }
    // 1. libraries reachable from root (excluding root)
    set<string> reach;
    vector<string> st{root};
    while (!st.empty()) {
        string x = st.back(); st.pop_back();
        for (const string& y : g[x]) if (y != root && reach.insert(y).second) st.push_back(y);
    }
    vector<string> nodes(reach.begin(), reach.end());
    map<string, int> id;
    for (int i = 0; i < (int)nodes.size(); i++) id[nodes[i]] = i;
    int n = nodes.size();
    vector<vector<int>> adj(n);
    for (int i = 0; i < n; i++) for (const string& y : g[nodes[i]]) if (id.count(y)) adj[i].push_back(id[y]);

    // 2. Tarjan's SCC, iterative
    vector<int> idx(n, -1), low(n, 0), comp(n, -1), stk;
    vector<bool> onStk(n, false);
    int counter = 0, comps = 0;
    for (int s = 0; s < n; s++) {
        if (idx[s] != -1) continue;
        vector<pair<int, size_t>> call{{s, 0}};
        idx[s] = low[s] = counter++; stk.push_back(s); onStk[s] = true;
        while (!call.empty()) {
            auto& [v, ei] = call.back();
            if (ei < adj[v].size()) {
                int w = adj[v][ei++];
                if (idx[w] == -1) { idx[w] = low[w] = counter++; stk.push_back(w); onStk[w] = true; call.push_back({w, 0}); }
                else if (onStk[w]) low[v] = min(low[v], idx[w]);
            } else {
                if (low[v] == idx[v]) {
                    while (true) { int w = stk.back(); stk.pop_back(); onStk[w] = false; comp[w] = comps; if (w == v) break; }
                    comps++;
                }
                int done = v; call.pop_back();
                if (!call.empty()) low[call.back().first] = min(low[call.back().first], low[done]);
            }
        }
    }
    // 3. condensation + Kahn with a min-heap on sorted member lists
    vector<vector<string>> members(comps);
    for (int i = 0; i < n; i++) members[comp[i]].push_back(nodes[i]);   // nodes are sorted already
    vector<set<int>> cadj(comps);
    vector<int> indeg(comps, 0);
    for (int i = 0; i < n; i++) for (int j : adj[i])
        if (comp[i] != comp[j] && cadj[comp[i]].insert(comp[j]).second) indeg[comp[j]]++;
    auto cmp = [&](int a, int b) { return members[a] > members[b]; };
    priority_queue<int, vector<int>, decltype(cmp)> ready(cmp);
    for (int c = 0; c < comps; c++) if (indeg[c] == 0) ready.push(c);
    vector<string> out;
    while (!ready.empty()) {
        int c = ready.top(); ready.pop();
        int times = members[c].size() > 1 ? 2 : 1;                       // repeat cyclic groups
        for (int k = 0; k < times; k++) out.insert(out.end(), members[c].begin(), members[c].end());
        for (int d : cadj[c]) if (--indeg[d] == 0) ready.push(d);
    }
    return out;
}`,
      complexity: `<p>O((V + E) log V) time, O(V + E) space.</p>`,
      followUps: ['Emit <code>-Wl,--start-group … -Wl,--end-group</code> around each cyclic component instead of repeating it.', 'Detect the minimal set of edges to remove to make the graph acyclic (a design smell report).']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: `<code>g++ -O0 -g -DLEVEL=1 -O2 -ULEVEL -c a.cpp</code>. Which optimisation level and LEVEL macro does a.cpp see?`, options: ['-O0, LEVEL=1', '-O2, LEVEL undefined', '-O2, LEVEL=1', '-O0, LEVEL undefined'], answer: 1, explain: 'The last <code>-O</code> wins, and <code>-D</code>/<code>-U</code> are processed left to right, so the later <code>-ULEVEL</code> removes it. <code>-g</code> does not change optimisation.' },
    { q: `With GNU ld, which link line fails when main.o calls a function from libutil.a?`, options: ['<code>g++ main.o -lutil</code>', '<code>g++ main.o -L. -lutil</code>', '<code>g++ -lutil main.o</code>', '<code>g++ main.o libutil.a</code>'], answer: 2, explain: 'Archives are scanned once, when encountered. Before main.o nothing is undefined, so no member is pulled from libutil.a.' },
    { q: `A header contains <code>int limit = 10;</code> and is included by two .cpp files of the same program. What happens?`, options: ['Compiles and links fine', 'Compile error in the second file', 'Link error: multiple definition of limit', 'Each file silently gets its own copy'], answer: 2, explain: 'Each TU emits a strong definition; the linker sees two. Use <code>inline int limit = 10;</code> (C++17), <code>constexpr</code>, or <code>extern</code> + one definition.' },
    { q: `Two TUs define <code>inline int version() { return 1; }</code> and <code>inline int version() { return 2; }</code>. What does the toolchain do?`, options: ['Linker error: duplicate symbol', 'Compiler error', 'Usually nothing: the linker keeps one definition silently — an ODR violation (undefined behaviour)', 'Calls return 1 or 2 depending on the caller\'s TU, as specified by the standard'], answer: 2, explain: 'Inline functions are weak/COMDAT symbols; the linker picks one without comparing bodies. Different bodies violate the ODR and no diagnostic is required.' },
    { q: `Library <code>net</code> has <code>target_link_libraries(net PRIVATE zlib)</code>, and <code>app</code> links <code>net</code> PUBLIC. Does app compile with zlib's INTERFACE include directories?`, options: ['Yes, because app links net PUBLIC', 'No, because net links zlib PRIVATE', 'Only if net is a shared library', 'Only in Debug'], answer: 1, explain: 'The scope on the net → zlib edge decides whether zlib\'s usage requirements reach net\'s consumers. PRIVATE stops them.' },
    { q: `What is the right CMake command for a header-only library?`, options: ['<code>add_library(x STATIC)</code> with no sources', '<code>add_library(x INTERFACE)</code> plus INTERFACE properties', '<code>include_directories(include)</code>', '<code>add_library(x OBJECT)</code>'], answer: 1, explain: 'An INTERFACE library builds nothing and only carries usage requirements for its consumers.' },
    { q: `A project uses Ninja and configures without setting <code>CMAKE_BUILD_TYPE</code>. Which flags does a GCC build get from CMake by default?`, options: ['-O3 -DNDEBUG', '-O2 -g', '-g', 'No optimisation or debug flags at all'], answer: 3, explain: 'An empty build type adds nothing from <code>CMAKE_CXX_FLAGS_&lt;CONFIG&gt;</code>, so you get an unoptimised build without debug info.' },
    { q: `Why is <code>if(CMAKE_BUILD_TYPE STREQUAL "Debug")</code> wrong in a project that must work with Visual Studio?`, options: ['STREQUAL is deprecated', 'Visual Studio is a multi-config generator: the configuration is chosen at build time and the variable is empty at configure time', 'Visual Studio has no Debug configuration', 'It is case-sensitive'], answer: 1, explain: 'Use generator expressions like <code>$&lt;$&lt;CONFIG:Debug&gt;:…&gt;</code>, which are evaluated per configuration.' },
    { q: `What does <code>$&lt;IF:$&lt;CONFIG:Release&gt;,3,0&gt;</code> evaluate to in the RelWithDebInfo configuration?`, options: ['3', '0', 'Empty string', 'An error'], answer: 1, explain: 'CONFIG:Release is 0 for RelWithDebInfo, so IF picks its third argument, 0.' },
    { q: `Which version does <code>^0.2.3</code> NOT allow?`, options: ['0.2.3', '0.2.9', '0.2.10', '0.3.0'], answer: 3, explain: 'For a 0.x version the caret allows only the same MINOR: the range is ≥ 0.2.3 and &lt; 0.3.0.' },
    { q: `You add <code>-DCMAKE_TOOLCHAIN_FILE=…/vcpkg.cmake</code> to an existing build directory and <code>find_package(fmt)</code> still fails. Most likely reason?`, options: ['vcpkg only works on Windows', 'The toolchain file is read only on the first configure of a build directory; the compiler and cache were already set', 'fmt is not in vcpkg', 'Toolchain files must be in the source tree'], answer: 1, explain: 'Start from a fresh build directory (or a preset that sets the toolchain from the start).' },
    { q: `Why can't C++20 modules be built in arbitrary order like plain .cpp files?`, options: ['Modules are always compiled serially', 'An importer needs the BMI produced by compiling the imported module first, so the build needs a dependency scan and a topological order', 'Modules require static linking', 'The linker orders them'], answer: 1, explain: 'This is why CMake scans sources (P1689) and uses Ninja dyndep; Makefile generators do not support modules.' },
    { q: `Which build-speed technique can introduce new compile errors in code that was previously fine?`, options: ['ccache', 'Using lld instead of ld', 'Unity (jumbo) builds', 'More parallel jobs (-j)'], answer: 2, explain: 'Unity builds merge several .cpp files into one TU, so file-local names can collide and missing includes can be masked or exposed.' },
    { q: `<code>./app</code> fails with "error while loading shared libraries: libgeo.so.1: cannot open shared object file". The build succeeded. What is the problem?`, options: ['A missing <code>-lgeo</code> on the link line', 'The dynamic loader cannot find the library at run time (RUNPATH / install location / LD_LIBRARY_PATH)', 'An ODR violation', 'libgeo.so.1 has the wrong soname inside the source code'], answer: 1, explain: 'Link time used -L; run time uses RUNPATH, the loader cache and default paths. Fix with RUNPATH ($ORIGIN) or proper installation.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: `Walk me through what happens when you run <code>g++ main.cpp util.cpp -o app</code>.`, level: 'B', a: `<p>The <b>driver</b> <code>g++</code> runs, for each <code>.cpp</code> separately: the preprocessor and compiler proper (<code>cc1plus</code>), producing assembly, then the assembler (<code>as</code>) producing an object file. Then it runs <code>collect2</code>/<code>ld</code> to link both objects together with the C runtime start files and the default libraries (<code>libstdc++</code>, <code>libm</code>, <code>libgcc</code>, <code>libc</code>). The linker matches every undefined symbol to exactly one definition, lays out sections and writes the executable. <code>-v</code> shows every command; <code>-###</code> prints them without running.</p>`, followUps: ['Why does linking C++ objects with <code>gcc</code> instead of <code>g++</code> fail?', 'Which of these steps does a build system parallelise?'] },
    { q: `Static vs shared libraries: how do you choose?`, level: 'B', a: `<p>A <b>static</b> library (<code>.a</code>/<code>.lib</code>) is copied into the binary at link time: one self-contained file, no run-time lookup, room for LTO, but bigger binaries and every consumer must relink to get a fix. A <b>shared</b> library (<code>.so</code>/<code>.dylib</code>/<code>.dll</code>) is loaded at run time: smaller binaries, shared memory pages, one place to patch security fixes, plugins via <code>dlopen</code>; but you must manage ABI compatibility (sonames), deployment and search paths, and calls go through the PLT. Typical choice: static for internal libraries and CLI tools or containers, shared for system-wide libraries, plugin systems and very large frameworks. Licensing (LGPL) can also force shared linking.</p>`, followUps: ['What is <code>-fPIC</code> and when is it required?', 'What is a soname and how does it relate to ABI breaks?'] },
    { q: `You get <code>undefined reference to 'Parser::parse(std::string const&amp;)'</code>. How do you debug it?`, level: 'I', a: `<p>Work from "who should define it?": (1) is the defining <code>.cpp</code> compiled and linked into this target (check the link command, <code>compile_commands.json</code>)? (2) Run <code>nm -C</code> on the library: is the symbol there with <code>T</code>, or absent? (3) If present but slightly different — <code>std::__cxx11::basic_string</code> vs <code>std::basic_string</code> — it is an ABI mismatch (<code>_GLIBCXX_USE_CXX11_ABI</code>) or a different standard library. (4) With static archives, check link order (library after users) or cycles. (5) If it is a template, the body may be hidden in a <code>.cpp</code>. (6) For C functions, missing <code>extern "C"</code>. (7) With shared libraries, check visibility: <code>-fvisibility=hidden</code> without an export macro hides it.</p>`, followUps: ['How does lld differ from GNU ld regarding archive order?', 'How would you find which archive member defines a symbol?'] },
    { q: `Explain the One Definition Rule and how it can be violated without any error.`, level: 'I', a: `<p>The ODR says each non-inline function and variable has exactly one definition in the program, and entities that may be defined in several TUs (classes, inline functions, templates, inline variables) must have <b>identical</b> definitions everywhere. The linker enforces only the first part ("multiple definition" errors). Silent violations: two different <code>struct Config</code> in the global namespace in two libraries; a header compiled with different macros in different TUs (e.g. <code>#ifdef DEBUG</code> adding a member); two versions of the same library linked into one program. The linker keeps one of each weak symbol, so code built against a different layout corrupts memory. Mitigations: namespaces, consistent flags across all targets, one version per dependency, <code>-flto -Wodr</code>, ASan's ODR checks.</p>`, followUps: ['Why do inline functions not cause multiple-definition errors?', 'How can a package manager cause an ODR violation?'] },
    { q: `What do PUBLIC, PRIVATE and INTERFACE mean in <code>target_link_libraries</code>, and how do you choose?`, level: 'I', a: `<p>They say who needs a dependency's <b>usage requirements</b> (include dirs, definitions, compile options, features). PRIVATE: only the target itself (used in its <code>.cpp</code> files). INTERFACE: only consumers (header-only libraries, or requirements the target does not use itself). PUBLIC: both. The rule: if your <b>public headers</b> include or expose the dependency, PUBLIC; if only your sources use it, PRIVATE. Requirements propagate transitively through PUBLIC/INTERFACE edges. For static libraries the library file still reaches the final link even through PRIVATE (as <code>$&lt;LINK_ONLY:…&gt;</code>); only compile requirements are hidden. Over-using PUBLIC leaks implementation details and slows builds; under-using it breaks consumers.</p>`, followUps: ['What is an INTERFACE library?', 'How do imported targets like <code>fmt::fmt</code> get their properties?'] },
    { q: `Why is "modern CMake" target-based, and what anti-patterns do you look for in review?`, level: 'I', a: `<p>Targets carry their own requirements, so dependencies are explicit, scoped and transitive, and the same library works in-tree, installed, or from a package manager. Anti-patterns: global <code>include_directories</code>, <code>add_definitions</code>, <code>link_directories</code>; editing <code>CMAKE_CXX_FLAGS</code> in project code; linking by plain name (<code>fmt</code> instead of <code>fmt::fmt</code>); <code>file(GLOB …)</code> for sources without <code>CONFIGURE_DEPENDS</code>; <code>if(CMAKE_BUILD_TYPE …)</code> instead of generator expressions; everything PUBLIC; hard-coded paths instead of <code>find_package</code>; <code>-Werror</code> applied to third-party code; and very old <code>cmake_minimum_required</code> values (CMake 4 rejects &lt; 3.5).</p>`, followUps: ['How do you make your library usable via <code>find_package</code>?', 'What are CMake presets for?'] },
    { q: `How do incremental builds decide what to recompile, and how can they go wrong?`, level: 'I', a: `<p>The compiler writes a dependency file per TU (<code>-MMD</code> or <code>/showIncludes</code>) listing every header it opened. The build tool rebuilds an object if it is missing, if any listed input has a newer mtime, or (Ninja) if the command line changed; then it relinks dependents. Failure modes: generated headers not declared as outputs (first parallel build compiles too early); timestamps lying (git checkout, network drives, copying with preserved times); custom commands with incomplete <code>DEPENDS</code>; macros passed via files the build does not know about. Remedies: declare generated files, use Ninja's command tracking, use content hashing (ccache, Bazel), and verify with <code>ninja -d explain</code>.</p>`, followUps: ['Why is Ninja\'s no-op build so much faster than Make\'s?', 'How do you reduce the number of files a header change rebuilds?'] },
    { q: `Compare vcpkg, Conan 2 and FetchContent. What would you pick for a new project?`, level: 'I', a: `<p><b>vcpkg</b>: curated registry, manifest <code>vcpkg.json</code>, versions pinned by a <b>baseline</b> commit plus minimum constraints, integrates through a CMake toolchain file, binary caching keyed by triplet and ABI hash. <b>Conan 2</b>: Python recipes, version ranges and lockfiles, profiles for host/build settings (great for cross-compiling), binaries identified by package_id, generators <code>CMakeDeps</code>/<code>CMakeToolchain</code>. <b>FetchContent</b>: builds dependencies from source inside your build — zero extra tools, but slower clean builds, option and target-name clashes, and no binary reuse. A sound default: keep <code>CMakeLists.txt</code> neutral (<code>find_package</code> only) and supply packages with vcpkg (simple, Windows-heavy teams) or Conan (many platforms, cross-compiling, private binary remotes); use FetchContent with <code>FIND_PACKAGE_ARGS</code> for small or test-only dependencies.</p>`, followUps: ['How do you make dependency versions reproducible in each?', 'What happens when two dependencies require different versions of the same library?'] },
    { q: `How do you speed up a C++ build that takes 40 minutes?`, level: 'A', a: `<p>Measure first: clean vs incremental vs no-op time, <code>-ftime-trace</code>/ClangBuildAnalyzer for hot headers and templates, <code>.ninja_log</code> for the critical path, link time separately. Then, roughly in order of payoff: use Ninja and all cores; cache with ccache/sccache (shared cache in CI); switch to lld or mold and <code>-gsplit-dwarf</code> for link time; cut header fan-in (forward declarations, pimpl, IWYU, extern templates); precompiled headers for stable heavy headers; unity builds for many tiny files; split giant targets so the graph is wider (shorter critical path); limit parallel LTO links with job pools; consider modules where the toolchain is ready; and remote caching/execution (Bazel, Buck2, sccache-dist) for large teams. Re-measure after each change.</p>`, followUps: ['Why can more cores not fix a long critical path?', 'What makes a build cache-friendly?'] },
    { q: `How do you cross-compile a CMake project for ARM64 Linux from an x86 machine?`, level: 'A', a: `<p>Get a cross toolchain (e.g. <code>aarch64-linux-gnu-g++</code>, or Clang with <code>--target=aarch64-linux-gnu</code>) and a <b>sysroot</b> with the target's headers and libraries. Write a toolchain file: <code>CMAKE_SYSTEM_NAME Linux</code>, <code>CMAKE_SYSTEM_PROCESSOR aarch64</code>, compilers, <code>CMAKE_SYSROOT</code>, and <code>CMAKE_FIND_ROOT_PATH_MODE_*</code> (programs NEVER from the sysroot, libraries/includes/packages ONLY from it). Configure a fresh build dir with <code>--toolchain</code>. Dependencies must be built for the target too: vcpkg triplet <code>arm64-linux</code>, or Conan with host and build profiles. For tests and <code>try_run</code>, set <code>CMAKE_CROSSCOMPILING_EMULATOR</code> to <code>qemu-aarch64</code>. Code generators must run on the host: build them separately or replace them with CMake scripts/constexpr. Verify with <code>file</code> and <code>readelf -h</code>.</p>`, followUps: ['What breaks if FIND_ROOT_PATH_MODE_LIBRARY is not ONLY?', 'How does Conan model the build vs host machine?'] },
    { q: `What problem do C++20 modules solve, and why has adoption been slow?`, level: 'A', a: `<p><code>#include</code> pastes text, so every TU re-parses the same headers, macros leak in both directions, and include order can change meaning. A module is compiled once into a BMI; importers load the compiled interface, macros do not leak, and only exported names are visible — faster builds and real encapsulation. Adoption was slow because modules changed the <b>build model</b>: compiles now depend on other compiles' outputs, so build systems need dependency scanning (P1689) and dynamic ordering. Support matured only recently: CMake 3.28 (Ninja 1.11+, Visual Studio), Clang 16+/17+, GCC 14+, MSVC 17.x; <code>import std</code> arrived later (CMake 3.30 experimental). BMIs are compiler- and flag-specific, so libraries ship interface sources, not BMIs; header units remain patchy; and tooling (IDEs, clangd, static analysers) lagged.</p>`, followUps: ['What happens if two modules import each other?', 'How do you distribute a library that exports a module?'] },
    { q: `What is ABI compatibility, and how do you keep a shared library ABI-stable across releases?`, level: 'E', a: `<p>ABI is the binary contract: symbol names (mangling), calling conventions, class layouts and vtable order, exception handling, and the standard-library types crossing the boundary. Breaking changes include: adding/removing/reordering data members or virtual functions of exported classes, changing function signatures or inline function bodies that callers compiled in, changing enum values, and changing the standard library or its ABI flag. To stay stable: export a narrow API (<code>-fvisibility=hidden</code> + export macros), use pimpl or opaque handles so layouts are private, add new functions instead of changing old ones, version symbols (GNU symbol versioning), bump the soname major on breaks, avoid STL types at the boundary if consumers may use a different library, and check releases with <code>abi-compliance-checker</code>/<code>libabigail</code> in CI.</p>`, followUps: ['Why is adding a virtual function at the end of a class still risky?', 'How does Windows DLL versioning differ from sonames?'] },
    { q: `Design the build and dependency setup for a 300-engineer C++ monorepo shipping on Linux, Windows and macOS.`, level: 'E', a: `<p>Principles: <b>hermetic, reproducible, cached</b>. Pin toolchains per platform (containers or toolchain packages; one compiler version per platform; the same standard library everywhere). Use CMake with presets per platform/config (or Bazel/Buck2 if remote execution is a priority). Dependencies: one manager (Conan or vcpkg) with a private binary cache/remote, lockfiles/baselines in git, an internal mirror for supply-chain safety, licence checks, and a rule of one version per package. Targets: small libraries with explicit PUBLIC/PRIVATE edges, layering enforced (lint against forbidden edges), warnings as errors only on first-party code. Speed: shared compile cache, fast linker, split debug info, PCH where measured, modules piloted on leaf libraries. CI: affected-target builds from the dependency graph, sanitizer and non-unity jobs, ABI checks for shipped shared libraries, SBOM generation, and dashboards for build time and cache hit rate.</p>`, followUps: ['How do you compute which tests to run for a change?', 'How do you roll out a compiler upgrade safely?'] }
  );

  registerModule({
    id: 'cpp14',
    title: 'CMake, Build Systems & Toolchains',
    intro: `<p>Writing correct C++ is half the job; the other half is turning thousands of files into a binary <b>quickly, reproducibly and on every platform</b>. C++ 1 showed the four compilation stages for one program. This module scales that up to real projects: which compilers, standard libraries and linkers make up a toolchain, how static and shared libraries are linked and loaded, why "undefined reference" and "multiple definition" happen and how the One Definition Rule can fail silently, how header dependencies drive incremental rebuilds, and how modern CMake models all of it with targets and PUBLIC/PRIVATE/INTERFACE usage requirements.</p>
<p>You will also learn build types and generator expressions, presets, dependencies with <code>find_package</code>, vcpkg, Conan 2 and FetchContent, cross-compiling, build-speed tools (ccache, precompiled headers, unity builds, faster linkers) and how C++20 modules change the build graph. Every guided and practice problem is a small, tested C++ program that simulates a real piece of build tooling: macro resolution, a linker, a rebuild planner, usage-requirement propagation, a generator-expression evaluator, a semver matcher and a build scheduler.</p>`,
    goals: [
      'Read and control a toolchain: GCC, Clang and MSVC drivers, flags, standard libraries, ABI and linkers (ld, lld, mold, link.exe)',
      'Build and consume static and shared libraries; diagnose undefined/duplicate symbols, link-order, PIC, RUNPATH and silent ODR violations',
      'Explain how depfiles and timestamps decide incremental rebuilds, and reduce header fan-in with forward declarations and pimpl',
      'Write target-based CMake with correct PUBLIC / PRIVATE / INTERFACE scopes, imported targets and install/export rules',
      'Use build types, multi-config generators, generator expressions and CMakePresets.json correctly',
      'Manage dependencies with find_package, vcpkg, Conan 2 and FetchContent, including semantic version ranges and diamond conflicts',
      'Cross-compile with toolchain files, speed up builds with caching, PCH, unity builds and faster linkers, and order C++20 module builds'
    ],
    prereqs: `C++ 1 (Compilation Model: preprocessor, compiler, linker, headers and the ODR basics) and C++ 6 (memory and RAII, used in the pimpl and library examples). Comfortable with a terminal. Graph basics (DFS, topological sort) help for the problems and are re-explained where used.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
