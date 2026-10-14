(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ----------------------------------------------------------------------
     Shared visualizer helpers for this module (C++ Pointers & References).
     Memory is drawn as a row of boxes ("array" part):
       - the value inside each box  = what is stored there
       - the label under each box   = its (pretend, short) address, e.g. 0x104
       - the labels above each box  = variable names and pointers aimed at it
     A "step" describes one moment of a running C++ program:
       l  : line number(s) to highlight in the code panel (1-based), c: class
       n  : narration (HTML)
       m  : memory spec {cells:[[addr, value, name]], hl:{i:cls}, p:{i:[labels]}, label}
       m2 : optional second memory row (e.g. heap)
       v  : variables {name: value}, vh: highlight map, vl: label
       o  : console output so far (plain text)
       g  : extra graph part, tb: extra table part, t: extra free HTML
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function mem(spec) {
    var cells = spec.cells, ptr = {};
    cells.forEach(function (c, i) {
      var l = [];
      if (c[2]) l.push(c[2]);
      if (spec.p && spec.p[i]) l = l.concat(spec.p[i]);
      if (l.length) ptr[i] = l;
    });
    return {
      type: 'array', label: spec.label || 'Memory (address under each box, names/pointers above)',
      values: cells.map(function (c) { return String(c[1]); }),
      idxLabels: cells.map(function (c) { return c[0]; }),
      ptr: ptr, hl: spec.hl || {}
    };
  }
  function steps(code, list, opt) {
    opt = opt || {};
    return list.map(function (s) {
      var parts = [], hl = {};
      if (s.l) (Array.isArray(s.l) ? s.l : [s.l]).forEach(function (x) { hl[x] = s.c || 'cur'; });
      if (code) parts.push({ type: 'code', label: opt.codeLabel || 'Program (highlighted = running now)', lang: 'cpp', code: code, hl: hl });
      if (s.m) parts.push(mem(s.m));
      if (s.m2) parts.push(mem(s.m2));
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Expressions evaluated right now', vals: s.v, hl: s.vh || {} });
      if (s.g) parts.push(s.g);
      if (s.tb) parts.push(s.tb);
      if (s.o !== undefined) parts.push({ type: 'text', label: 'Console output so far', html: '<pre>' + (s.o === '' ? '(nothing printed yet)' : esc(s.o)) + '</pre>' });
      if (s.t) parts.push({ type: 'text', html: s.t });
      return { narr: s.n, parts: parts };
    });
  }
  function hex(n) { return '0x' + n.toString(16); }
  function parseInts(input, def, maxLen, hint) {
    var raw = String(input === undefined || input === null ? def : input).trim();
    if (raw === '') raw = def;
    var a = raw.split(/[\s,]+/).map(function (x) { return x; });
    if (!a.length || a.some(function (x) { return !/^-?\d{1,6}$/.test(x); })) throw new Error(hint);
    if (a.length > maxLen) throw new Error(hint);
    return a.map(Number);
  }
  function one(k, cls) { var o = {}; o[k] = cls; return o; }

  /* ======================================================================
     TOPIC 1: Memory, addresses and the & operator
     ====================================================================== */
  var T1_CODE = [
    'char   c = \'A\';     // 1 byte',
    'int    x = 258;     // 4 bytes (on mainstream platforms)',
    'double d = 1.5;     // 8 bytes',
    'cout << &x;         // prints the ADDRESS of x',
    'cout << sizeof(x);  // prints 4'
  ].join('\n');

  topics.push({
    title: 'Memory, Addresses & the &amp; Operator',
    analogy: `<p>Picture a <b>very long street</b> of tiny houses, each exactly one byte big, numbered 0, 1, 2, 3... all the way to billions. The <b>house number</b> is the <b>address</b>. What lives inside the house is the <b>value</b>. When you write <code>int x = 7;</code> the computer rents <b>four houses in a row</b> for <code>x</code> and puts the number 7 inside them. The name <code>x</code> is just a friendly <b>nickname</b> for "the 4 houses starting at number 0x104". The <code>&amp;</code> operator simply asks: <i>"what is the house number of x?"</i></p>`,
    explain: `<p>Every pointer question in an interview stands on one simple idea: <b>memory is a giant numbered row of bytes</b>. Once you can picture that row, pointers stop being scary.</p>
<h4>1. Bytes and addresses</h4>
<p>A <b>byte</b> is 8 bits, enough to store a number from 0 to 255. Your RAM is a huge list of bytes, and every byte has a number called its <b>address</b>. Addresses are usually written in <b>hexadecimal</b> (base 16) like <code>0x7ffd5c3a1a14</code> just because it is shorter than decimal. In this module we use tiny pretend addresses like <code>0x100</code> so the pictures stay readable.</p>
${H.arr(['41', 'pad', 'pad', 'pad', '02', '01', '00', '00'], { label: 'memory', hl: { 0: 'y', 4: 'g', 5: 'g', 6: 'g', 7: 'g' }, ptr: { 0: 'c', 4: 'x' } })}
<p>Above: <code>c</code> uses 1 byte, then 3 unused "padding" bytes, then <code>x</code> uses 4 bytes. (The real order the compiler picks can differ; the idea is what matters.)</p>
<h4>2. A variable = name + type + address + value</h4>
${H.table(['Piece', 'Plain meaning', 'For <code>int x = 258;</code>'], [
  ['<b>name</b>', 'the nickname you type in code', '<code>x</code>'],
  ['<b>type</b>', 'how many bytes, and how to read them', '<code>int</code> → 4 bytes, read as a whole number'],
  ['<b>address</b>', 'house number of the <b>first</b> byte', '<code>&amp;x</code> → e.g. <code>0x104</code>'],
  ['<b>value</b>', 'what is stored there right now', '<code>258</code>']
])}
<h4>3. The <code>&amp;</code> operator: "address of"</h4>
<p>Put <code>&amp;</code> in front of a variable and you get its address: <code>cout &lt;&lt; &amp;x;</code> prints something like <code>0x7ffd5c3a1a14</code>. The exact number changes every time you run the program (the operating system shuffles memory on purpose for security), so <b>never hard-code an address</b>.</p>
<p>Careful: the same symbol <code>&amp;</code> means different things in different places. In an <b>expression</b> (<code>&amp;x</code>) it means "address of". In a <b>declaration</b> (<code>int&amp; r = x;</code>) it means "reference" (topic 5). Between two values (<code>a &amp; b</code>) it is bitwise AND.</p>
<h4>4. <code>sizeof</code>: how many bytes</h4>
${H.table(['Type', 'Typical sizeof on 64-bit Linux/Windows/macOS', 'Guaranteed by the standard?'], [
  ['<code>char</code>', '1', '<span class="c-g">Yes, always exactly 1</span>'],
  ['<code>int</code>', '4', 'only "at least 16 bits"'],
  ['<code>long long</code>', '8', 'at least 64 bits'],
  ['<code>double</code>', '8', 'not fixed, but 8 everywhere you will meet'],
  ['<code>int*</code> (any data pointer)', '8 on 64-bit, 4 on 32-bit', 'no; depends on the platform']
])}
<h4>5. Neighbours in an array</h4>
<p>Array elements sit <b>right next to each other</b> with no gaps. In <code>int a[4]</code>, if <code>&amp;a[0]</code> is <code>0x200</code> then <code>&amp;a[1]</code> is <code>0x204</code>, <code>&amp;a[2]</code> is <code>0x208</code>: each step is <code>sizeof(int)</code> = 4 bytes. This one fact powers pointer arithmetic (topic 3) and arrays decaying (topic 7).</p>
${H.arr(['10', '20', '30', '40'], { label: 'int a[4]', ptr: { 0: '0x200', 1: '0x204', 2: '0x208', 3: '0x20c' } })}
<h4>6. One gotcha when printing</h4>
<p><code>cout &lt;&lt; &amp;c</code> where <code>c</code> is a <code>char</code> does <b>not</b> print an address. <code>cout</code> thinks a <code>char*</code> is a C-string and prints characters until it hits a zero byte (garbage!). Cast it: <code>cout &lt;&lt; static_cast&lt;void*&gt;(&amp;c);</code></p>`,
    clues: [
      '"What does <code>&amp;x</code> print?" / "where does this variable live?" → address-of operator, hex output, changes every run',
      '"How many bytes does an <code>int</code> / pointer take?" → <code>sizeof</code>; pointer size depends on 32-bit vs 64-bit, not on the pointed-to type',
      '"Are array elements contiguous?" → yes, <code>&amp;a[i] == base + i·sizeof(T)</code> bytes',
      '"Why does printing <code>&amp;ch</code> show garbage?" → <code>operator&lt;&lt;</code> overload for <code>char*</code> treats it as a C-string',
      '"Little-endian / byte order" or "inspect the bytes of an int" → view the object through <code>unsigned char*</code>',
      '"sizeof(struct) is bigger than the sum of its fields" → alignment padding'
    ],
    code: [{ lang: 'cpp', title: 'Print addresses and sizes', code: `#include <iostream>
using namespace std;

int main() {
    char   c = 'A';     // 1 byte
    int    x = 258;     // usually 4 bytes
    double d = 1.5;     // usually 8 bytes

    // & in front of a variable means "address of"
    cout << "x lives at " << &x << '\\n';               // e.g. 0x7ffd5c3a1a14 (changes every run)
    cout << "d lives at " << &d << '\\n';
    // cout treats char* as a C-string, so cast to void* to print the address itself
    cout << "c lives at " << static_cast<void*>(&c) << '\\n';

    cout << "sizeof(c)=" << sizeof(c)                   // always 1
         << " sizeof(x)=" << sizeof(x)                  // 4 on mainstream platforms
         << " sizeof(d)=" << sizeof(d)                  // 8
         << " sizeof(&x)=" << sizeof(&x) << '\\n';       // 8 on a 64-bit build: size of an address

    int a[4] = {10, 20, 30, 40};
    for (int i = 0; i < 4; ++i)                          // neighbours are exactly sizeof(int) apart
        cout << "&a[" << i << "] = " << &a[i] << '\\n';
}` }, { lang: 'cpp', title: 'Peek at the raw bytes of an int (little-endian check)', code: `#include <cstdio>

int main() {
    int x = 258;                                        // 258 = 0x00000102
    // unsigned char* is the one pointer type allowed to look at ANY object's bytes
    const unsigned char* bytes = reinterpret_cast<const unsigned char*>(&x);
    for (unsigned i = 0; i < sizeof x; ++i)
        std::printf("byte %u at %p = %02x\\n", i, (const void*)(bytes + i), bytes[i]);
    // On x86-64 and ARM64 (little-endian) this prints 02 01 00 00:
    // the LEAST significant byte sits at the LOWEST address.
}` }],
    codeTitle: ['Addresses, sizeof and array neighbours', 'Byte-level view'],
    viz: {
      title: 'Where do my variables live? (byte-by-byte)',
      input: '258',
      inputLabel: 'Value stored in int x (any 32-bit int)',
      gen: function (input) {
        var raw = String(input === undefined ? '258' : input).trim() || '258';
        if (!/^-?\d{1,10}$/.test(raw)) throw new Error('Type one whole number, e.g. 258 or -1');
        var v = Number(raw);
        if (v < -2147483648 || v > 2147483647) throw new Error('Use a value that fits in a 32-bit int (-2147483648 .. 2147483647)');
        var u = v >>> 0, xb = [], i;
        for (i = 0; i < 4; i++) xb.push(((u >>> (8 * i)) & 255).toString(16).padStart(2, '0'));
        var db = ['00', '00', '00', '00', '00', '00', 'f8', '3f'];
        var cells = [];
        for (i = 0; i < 16; i++) cells.push([hex(0x100 + i), '??', '']);
        function snap() { return cells.map(function (c) { return c.slice(); }); }
        var f = [];
        f.push({ l: 0, n: 'Memory before anything runs: 16 bytes, each with its own address (0x100 ... 0x10f). <b>??</b> means "whatever garbage was there before".', m: { cells: snap() } });
        cells[0][1] = '41'; cells[0][2] = 'c';
        f.push({ l: 1, n: '<code>char c = \'A\';</code> needs <b>1 byte</b>. The letter A is stored as its code 65 = hex <b>41</b> at address 0x100.', m: { cells: snap(), hl: { 0: 'ok' } }, v: { '&c': '0x100', 'sizeof(c)': 1 } });
        for (i = 1; i < 4; i++) cells[i][1] = 'pad';
        f.push({ l: 2, n: 'Before placing an <code>int</code>, the compiler likes an address divisible by 4 (<b>alignment</b>), so bytes 0x101-0x103 become unused <b>padding</b>.', m: { cells: snap(), hl: { 1: 'done', 2: 'done', 3: 'done' } } });
        for (i = 0; i < 4; i++) cells[4 + i][1] = xb[i];
        cells[4][2] = 'x';
        f.push({ l: 2, n: '<code>int x = ' + v + ';</code> takes <b>4 bytes</b>: 0x104-0x107. In hex the value is <b>0x' + u.toString(16).padStart(8, '0') + '</b>. On little-endian CPUs (x86, ARM) the <b>lowest</b> byte goes first: ' + xb.join(' ') + '.', m: { cells: snap(), hl: { 4: 'ok', 5: 'ok', 6: 'ok', 7: 'ok' } }, v: { 'x': v, 'hex': '0x' + u.toString(16).padStart(8, '0') } });
        for (i = 0; i < 8; i++) cells[8 + i][1] = db[i];
        cells[8][2] = 'd';
        f.push({ l: 3, n: '<code>double d = 1.5;</code> takes <b>8 bytes</b>: 0x108-0x10f. The bit pattern of 1.5 (IEEE-754) is 0x3ff8000000000000, again stored lowest byte first.', m: { cells: snap(), hl: { 8: 'ok', 9: 'ok', 10: 'ok', 11: 'ok', 12: 'ok', 13: 'ok', 14: 'ok', 15: 'ok' } } });
        f.push({ l: 4, n: '<code>&amp;x</code> asks for the address of the <b>first</b> byte of x: <b>0x104</b>. That one number plus the type <code>int</code> tells the CPU everything: "start at 0x104, read 4 bytes".', m: { cells: snap(), hl: { 4: 'sel', 5: 'win', 6: 'win', 7: 'win' }, p: { 4: ['&x → here'] } }, v: { '&x': '0x104', 'x': v }, vh: { '&x': 'sel' }, o: '0x104' });
        f.push({ l: 5, n: '<code>sizeof(x)</code> is decided at <b>compile time</b>: 4. It never looks at the value, only the type.', m: { cells: snap(), hl: { 4: 'win', 5: 'win', 6: 'win', 7: 'win' } }, v: { 'sizeof(c)': 1, 'sizeof(x)': 4, 'sizeof(d)': 8, 'sizeof(&x)': '8 (64-bit)' }, o: '0x104\n4' });
        f.push({ l: 0, n: 'Summary: each variable = a <b>start address</b> + a <b>size</b> from its type. The 3 padding bytes are why <code>sizeof</code> of a struct {char; int; double;} is 16, not 13.', m: { cells: snap(), hl: { 0: 'ok', 1: 'done', 2: 'done', 3: 'done', 4: 'ok', 8: 'ok' } }, tb: { type: 'table', label: 'Who lives where', columns: ['variable', 'type', 'address', 'bytes'], rows: [['c', 'char', '0x100', '1'], ['(padding)', '-', '0x101', '3'], ['x', 'int', '0x104', '4'], ['d', 'double', '0x108', '8']], hl: { 2: 'sel' } } });
        return steps(T1_CODE, f);
      }
    },
    examples: [
      { title: 'Array neighbours are exactly sizeof(T) apart', html: `<p>For <code>double b[3]</code> starting at 0x300, the addresses are 0x300, 0x308, 0x310 (8 bytes each). For <code>char s[3]</code> at 0x400 they are 0x400, 0x401, 0x402. The gap is always <code>sizeof</code> the element type.</p>${H.table(['element', 'int a[] (4B)', 'double b[] (8B)', 'char s[] (1B)'], [['[0]', '0x200', '0x300', '0x400'], ['[1]', '0x204', '0x308', '0x401'], ['[2]', '0x208', '0x310', '0x402']])}`, code: { lang: 'cpp', code: `#include <iostream>
int main() {
    double b[3] = {1.0, 2.0, 3.0};
    // Subtract addresses as raw bytes to see the gap (always 8 for double)
    auto gap = reinterpret_cast<const char*>(&b[1]) - reinterpret_cast<const char*>(&b[0]);
    std::cout << "gap = " << gap << " bytes\\n";   // gap = 8 bytes
}` } },
      { title: 'The char* printing trap', html: `<p>Predict the output: <code>char c = 'Z'; cout &lt;&lt; &amp;c;</code>. Many people expect an address. Instead you get <code>Z</code> followed by random symbols, because <code>cout</code> treats <code>char*</code> as "start of a text string" and keeps printing until it finds a 0 byte. Fix: <code>cout &lt;&lt; (void*)&amp;c</code> or <code>static_cast&lt;const void*&gt;(&amp;c)</code>.</p>`, code: { lang: 'cpp', code: `#include <iostream>
int main() {
    char c = 'Z';
    // std::cout << &c;                            // BUG: prints "Z" + garbage (reads past c!)
    std::cout << static_cast<void*>(&c) << '\\n';    // prints the real address, e.g. 0x7ffe...
}` } },
      { title: 'sizeof a pointer never depends on what it points at', html: `<p><code>sizeof(char*)</code>, <code>sizeof(int*)</code> and <code>sizeof(std::string*)</code> are <b>all 8</b> on a 64-bit build. A pointer is just an address, and every address on the machine is the same width. Interviewers love "sizeof(p) vs sizeof(*p)": ${H.table(['expression', 'meaning', 'value for <code>double* p</code>'], [['<code>sizeof(p)</code>', 'size of the address', '8'], ['<code>sizeof(*p)</code>', 'size of the thing pointed at', '8 (a double)'], ['<code>sizeof(p) for char* p</code>', 'still the address', '8 (not 1!)']])}</p>` },
      { title: 'Struct padding you can measure', html: `<p><code>struct A { char c; int x; char d; };</code> → 1 + 3 pad + 4 + 1 + 3 pad = <b>12</b>. Reorder as <code>struct B { int x; char c; char d; };</code> → 4 + 1 + 1 + 2 pad = <b>8</b>. Same fields, 33% less memory, just by ordering big-to-small.</p>`, code: { lang: 'cpp', code: `#include <iostream>
struct A { char c; int x; char d; };   // padded to 12 bytes
struct B { int x; char c; char d; };   // padded to 8 bytes
int main() {
    std::cout << sizeof(A) << ' ' << sizeof(B) << '\\n';   // 12 8 on mainstream ABIs
    std::cout << alignof(int) << '\\n';                     // 4: int wants addresses divisible by 4
}` } }
    ],
    deepDive: `<p><b>Virtual addresses.</b> The numbers you print are <b>virtual</b> addresses. Each process gets its own private map; the CPU's MMU translates virtual pages (usually 4 KiB) to physical RAM. Two programs can both have something at <code>0x7ffd...</code> and never collide. On x86-64 only 48 (or 57) bits of an address are actually used, which is why user-space addresses look like <code>0x7ff...</code> (stack) and <code>0x55...</code>/<code>0x5...</code> (program image/heap with PIE).</p>
<p><b>ASLR</b> (Address Space Layout Randomization) moves the stack, heap and libraries every run so attackers cannot guess where things live. That is why your printed addresses change. Any program logic that depends on a specific address value is broken by design.</p>
<p><b>Alignment.</b> <code>alignof(T)</code> says which addresses a type may start at. Misaligned access is merely slower on x86 but can trap on some ARM/RISC-V configurations, and it is undefined behaviour in C++ regardless. That is why the compiler inserts padding, and why <code>sizeof(struct)</code> is always a multiple of its alignment (so arrays of it stay aligned).</p>
<p><b>Endianness.</b> x86-64 and practically all ARM64 systems are little-endian. Network protocols traditionally use big-endian ("network byte order"), hence <code>htonl</code>/<code>ntohl</code>. C++20 gives <code>std::endian::native</code> to test at compile time and C++23 adds <code>std::byteswap</code>.</p>
<p><b>Expert corner cases.</b> (1) A class can overload unary <code>operator&amp;</code>; generic code uses <code>std::addressof(obj)</code> to get the true address. (2) A <code>register</code>-like local or a constant may never live in memory at all until you take its address; taking <code>&amp;x</code> forces the compiler to give it a real home. (3) Converting a pointer to an integer uses <code>std::uintptr_t</code> via <code>reinterpret_cast</code>; doing math on it and converting back is implementation-defined. (4) Only <code>char</code>, <code>unsigned char</code> and <code>std::byte</code> pointers may legally inspect another object's bytes (the strict aliasing exception).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can instantly explain a hex dump, tell you that <code>sizeof(long)</code> is 4 on Windows but 8 on Linux, or produce a struct-reordering suggestion to remove padding. Tools like Compiler Explorer plus an AI chat let you ask "why is this struct 24 bytes?" and get a byte-by-byte answer in seconds.</p>
<p><b>Use AI as a partner:</b> ask <code>Draw the memory layout of struct S {char a; double b; int c;} on x86-64 with offsets, then tell me the best field order</code>, and then <b>verify</b> with <code>offsetof</code> and <code>static_assert(sizeof(S) == 16)</code>. Let the compiler be the judge, not the chat.</p>
<p><b>Where AI goes wrong:</b> it often states sizes as if they were guaranteed ("int is always 4 bytes"), forgets the <code>char*</code> printing trap, or invents fixed addresses in "expected output" that can never match a real run because of ASLR.</p>
<p><b>What you must still own:</b> the mental picture of memory as a numbered byte row. Every later topic (pointer arithmetic, decay, dangling) is that picture plus one rule. In interviews you will be asked to draw it on a whiteboard with no assistant.</p>`,
    problems: [{
      title: 'Byte Offset Between Two Array Elements',
      level: 'Easy', tags: ['addresses', 'sizeof', 'reinterpret_cast'], companies: ['Qualcomm', 'NVIDIA', 'Intel'],
      statement: `<p>You are given two pointers <code>base</code> and <code>elem</code> into the <b>same</b> <code>int</code> array (<code>elem</code> at or after <code>base</code>). Return how many <b>bytes</b> apart they are. Then return the <b>element</b> distance too. Do not use the array itself, only the two addresses.</p>`,
      constraints: `<p>Both pointers point into the same array of size ≤ 10<sup>6</sup>. <code>elem ≥ base</code>.</p>`,
      example: `<p><code>int a[5]</code> starts at 0x100, <code>base = &amp;a[0]</code>, <code>elem = &amp;a[3]</code>.</p>${H.arr(['a[0]', 'a[1]', 'a[2]', 'a[3]', 'a[4]'], { ptr: { 0: 'base', 3: 'elem' }, hl: { 3: 'g' } })}<p>Output: bytes = ${H.c('g', '12')}, elements = ${H.c('b', '3')}, because each int is 4 bytes: 3 × 4 = 12.</p>`,
      brute: { why: `<p>Walk a pointer from <code>base</code> one element at a time until it reaches <code>elem</code>, counting steps, then multiply by <code>sizeof(int)</code>. Correct, but O(distance) when the answer is a single subtraction.</p>`, code: { lang: 'cpp', code: `#include <cstddef>
// O(k): step one element at a time
std::size_t byteOffsetBrute(const int* base, const int* elem) {
    std::size_t steps = 0;
    for (const int* p = base; p != elem; ++p) ++steps;   // count elements between them
    return steps * sizeof(int);                           // convert elements -> bytes
}` } },
      mcq: { q: 'If <code>elem - base</code> (as <code>int*</code>) is 3, what is the byte distance on a platform where <code>sizeof(int)</code> is 4?', options: ['3', '12', '4', 'depends on the values stored'], answer: 1, explain: 'Pointer subtraction counts elements; bytes = elements × sizeof(int) = 3 × 4 = 12. Values stored never matter.' },
      hints: [`<p>Subtracting two <code>int*</code> gives a count of <b>ints</b>, not bytes. Subtracting two <code>char*</code> gives bytes, because a char is 1 byte.</p>`, `<p>Convert both addresses to <code>const char*</code> with <code>reinterpret_cast</code> (allowed for inspecting bytes) and subtract.</p>`, `<p>Recipe: <code>elems = elem - base;</code> <code>bytes = (const char*)elem - (const char*)base;</code> Check: <code>bytes == elems * sizeof(int)</code>. The result type of pointer subtraction is <code>std::ptrdiff_t</code> (signed).</p>`],
      solution: {
        approach: `<p>Two subtractions, O(1). Pointer subtraction in C++ is scaled by the element size, so view the addresses as <code>char*</code> when you want raw bytes.</p>`,
        code: { lang: 'cpp', code: `#include <cstddef>
#include <iostream>

// Distance in ELEMENTS: pointer subtraction is automatically divided by sizeof(int)
std::ptrdiff_t elemOffset(const int* base, const int* elem) {
    return elem - base;
}

// Distance in BYTES: look at both addresses as char* (1-byte steps)
std::ptrdiff_t byteOffset(const int* base, const int* elem) {
    return reinterpret_cast<const char*>(elem) - reinterpret_cast<const char*>(base);
}

int main() {
    int a[5] = {7, 7, 7, 7, 7};
    std::cout << byteOffset(&a[0], &a[3]) << ' '      // 12
              << elemOffset(&a[0], &a[3]) << '\\n';    // 3
}` },
        dry: { head: ['expression', 'raw addresses', 'result', 'why'], rows: [['<code>elem - base</code> (int*)', '0x10c − 0x100', '3', '12 bytes ÷ 4 bytes per int'], ['<code>(char*)elem − (char*)base</code>', '0x10c − 0x100', '12', 'char is 1 byte, so no scaling'], ['check', '3 × sizeof(int)', '12', '<span class="c-g">matches</span>']] },
        complexity: `<p>Time O(1), space O(1).</p>`,
        followUps: ['What type should hold the result, and why is it signed?', 'Is subtracting pointers into two different arrays allowed?', 'How would you compute the offset of a struct field? (<code>offsetof</code>)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2: Pointers: declare, dereference, pointer-to-pointer, ->
     ====================================================================== */
  var T2_CODE = [
    'int x = 5;',
    'int* p = &x;      // p stores the ADDRESS of x',
    '*p = 9;           // go to that address, write 9',
    'int y = 3;',
    'p = &y;           // re-aim p at y',
    'int** pp = &p;    // pp stores the address of p',
    '**pp = 4;         // pp -> p -> y, write 4',
    'cout << x << " " << y;'
  ].join('\n');

  function t2graph(pTo, ppOn, hlE) {
    var nodes = [
      { id: 'x', label: 'x @0x100', x: 15, y: 15, shape: 'box' },
      { id: 'y', label: 'y @0x104', x: 15, y: 45, shape: 'box' },
      { id: 'p', label: 'p @0x108', x: 55, y: 30, shape: 'box' },
      { id: 'pp', label: 'pp @0x110', x: 88, y: 30, shape: 'box' }
    ];
    var edges = [], ehl = {};
    if (pTo) { edges.push(['p', pTo, 'points to']); if (hlE) ehl['p-' + pTo] = 'cur'; }
    if (ppOn) { edges.push(['pp', 'p', 'points to']); if (hlE) ehl['pp-p'] = 'cur'; }
    return { type: 'graph', label: 'Arrow view (who points at whom)', directed: true, height: 60, nodes: nodes, edges: edges, ehl: ehl };
  }

  topics.push({
    title: 'Pointers: Declare, Dereference, -&gt; and Pointer-to-Pointer',
    analogy: `<p>A <b>pointer</b> is a <b>sticky note with a house number written on it</b>. The note itself is a small thing you keep in your pocket (it has its own spot in memory), but what it is <i>about</i> is some other house. <b>Dereferencing</b> (<code>*p</code>) means "walk to the house written on the note and open the door". Rewriting the note (<code>p = &amp;y</code>) does not move any houses; it just makes the note talk about a different house. A <b>pointer to a pointer</b> is a sticky note telling you where you left <i>another</i> sticky note.</p>`,
    explain: `<p>A <b>pointer</b> is a variable whose value is an <b>address</b>. That is the whole idea. Everything else is syntax.</p>
<h4>1. Declaring and filling a pointer</h4>
<pre>int x = 5;
int* p = &amp;x;   // "p is a pointer to int, holding the address of x"</pre>
${H.table(['Piece', 'Read it as'], [['<code>int*</code>', '"pointer to int" (the type)'], ['<code>p</code>', 'the pointer variable (8 bytes on 64-bit)'], ['<code>&amp;x</code>', '"the address of x"']])}
<p>The pointer's type says <b>what kind of thing lives at that address</b>. An <code>int*</code> may only hold the address of an <code>int</code>; <code>int* q = &amp;someDouble;</code> is a compile error. That type is what lets the compiler know "read 4 bytes and treat them as an int" when you follow the pointer.</p>
<h4>2. Dereferencing with <code>*</code></h4>
<p><code>*p</code> means "the thing p points at". You can read it (<code>int v = *p;</code>) or write it (<code>*p = 9;</code> changes <code>x</code>!). So after <code>int* p = &amp;x;</code>, the expressions <code>*p</code> and <code>x</code> are two names for the <b>same box</b>.</p>
${H.arr(['9', '?', '0x100'], { label: 'memory', ptr: { 0: 'x  (= *p)', 2: 'p' }, hl: { 0: 'g', 2: 'b' } })}
<h4>3. Two meanings of <code>*</code></h4>
${H.table(['Where', 'Meaning', 'Example'], [['in a <b>declaration</b>', 'this variable is a pointer', '<code>int* p;</code>'], ['in an <b>expression</b>', 'follow the pointer (dereference)', '<code>*p = 9;</code>'], ['between two numbers', 'multiply', '<code>a * b</code>']])}
<h4>4. The classic declaration trap</h4>
<p><code>int* a, b;</code> makes <code>a</code> a pointer but <b><code>b</code> a plain int</b>. The <code>*</code> sticks to the name, not the type. Declare one pointer per line, or write <code>int *a, *b;</code>.</p>
<h4>5. Pointers to structs and the arrow <code>-&gt;</code></h4>
<p>For <code>Point* pt</code>, writing <code>(*pt).x</code> is clumsy (the parentheses are required because <code>.</code> binds tighter than <code>*</code>). C++ gives a shortcut: <code>pt-&gt;x</code> means exactly <code>(*pt).x</code>.</p>
<h4>6. Pointer to pointer</h4>
<p>A pointer is a variable, so it has its own address too. <code>int** pp = &amp;p;</code> stores the address of <code>p</code>. Then <code>*pp</code> is <code>p</code>, and <code>**pp</code> is whatever <code>p</code> points at. You need this when a function must <b>change the caller's pointer</b> (for example, "allocate a buffer and hand it back", or delete the head of a linked list).</p>
<h4>7. Always initialize</h4>
<p>A local <code>int* p;</code> with no initializer holds <b>garbage</b>: some random address. Using it is undefined behaviour (topic 4 calls this a <b>wild pointer</b>). Rule: give every pointer a real address or <code>nullptr</code> on the line where you declare it.</p>`,
    clues: [
      '"Write a function that modifies the caller\'s variable" (C-style API) → pass a pointer, write through <code>*p</code>',
      '"Function must return two results" (min and max, quotient and remainder) → out-parameters as pointers (or a struct/pair in modern C++)',
      '"Change which node the head points to" / "allocate inside a function" → pointer to pointer (<code>T**</code>) or reference to pointer (<code>T*&amp;</code>)',
      '"What is the type of <code>b</code> in <code>int* a, b;</code>?" → plain <code>int</code>',
      '"<code>p-&gt;x</code> vs <code>(*p).x</code> vs <code>*p.x</code>" → first two are identical; the third parses as <code>*(p.x)</code>',
      '"Predict the output" with <code>*p = ...</code> lines → track which box each pointer is aimed at, line by line'
    ],
    code: [{ lang: 'cpp', title: 'Pointer basics in one program', code: `#include <iostream>
using namespace std;

struct Point { int x, y; };

int main() {
    int x = 5;
    int* p = &x;            // p holds the address of x
    cout << *p << '\\n';     // 5   : read through the pointer
    *p = 9;                 // write through the pointer: x is now 9
    cout << x << '\\n';      // 9

    int y = 3;
    p = &y;                 // re-aim p; x is untouched
    int** pp = &p;          // pointer to the pointer p
    **pp = 4;               // pp -> p -> y : y becomes 4
    cout << x << ' ' << y << '\\n';   // 9 4

    Point pt{1, 2};
    Point* q = &pt;
    q->x = 10;              // same as (*q).x = 10
    cout << pt.x << ',' << (*q).y << '\\n';   // 10,2

    cout << sizeof(p) << ' ' << sizeof(*p) << '\\n';   // 8 4 on a 64-bit build
}` }],
    codeTitle: ['Declare, dereference, -> and **'],
    viz: {
      title: 'Follow the sticky notes: x, y, p and pp',
      gen: function () {
        function M(vx, vy, vp, vpp, hl, extra) {
          var p = {};
          if (vp === '0x100') p[0] = ['*p'];
          if (vp === '0x104') p[1] = ['*p'];
          if (vpp === '0x108') p[2] = (p[2] || []).concat(['*pp']);
          if (extra) Object.keys(extra).forEach(function (k) { p[k] = (p[k] || []).concat(extra[k]); });
          return { cells: [['0x100', vx, 'x'], ['0x104', vy, 'y'], ['0x108', vp, 'p'], ['0x110', vpp, 'pp']], hl: hl || {}, p: p };
        }
        var f = [
          { l: 0, n: 'Four boxes are reserved: <b>x</b> and <b>y</b> (ints) and <b>p</b> and <b>pp</b> (pointers, 8 bytes each). Nothing is filled yet.', m: M('??', '??', '??', '??'), g: t2graph(null, false) },
          { l: 1, n: '<code>int x = 5;</code> writes 5 into the box at 0x100.', m: M('5', '??', '??', '??', { 0: 'ok' }), g: t2graph(null, false) },
          { l: 2, n: '<code>int* p = &amp;x;</code>: the <b>value</b> stored in p is the number <b>0x100</b>, the address of x. Now <code>*p</code> is another name for x.', m: M('5', '??', '0x100', '??', { 2: 'ok', 0: 'win' }), g: t2graph('x', false, true), v: { 'p': '0x100', '*p': 5, '&p': '0x108' }, vh: { 'p': 'ok' } },
          { l: 3, n: '<code>*p = 9;</code>: read the address in p (0x100), go there, write 9. We changed <b>x</b> without ever typing its name.', m: M('9', '??', '0x100', '??', { 0: 'ok' }), g: t2graph('x', false), v: { 'x': 9, '*p': 9 }, vh: { 'x': 'ok' } },
          { l: 4, n: '<code>int y = 3;</code> fills the box at 0x104.', m: M('9', '3', '0x100', '??', { 1: 'ok' }), g: t2graph('x', false) },
          { l: 5, n: '<code>p = &amp;y;</code>: overwrite the <b>note</b>, not the house. p now holds 0x104. x keeps its 9.', m: M('9', '3', '0x104', '??', { 2: 'cur', 1: 'win' }), g: t2graph('y', false, true), v: { 'p': '0x104', '*p': 3, 'x': 9 }, vh: { 'p': 'cur' } },
          { l: 6, n: '<code>int** pp = &amp;p;</code>: pp stores the address of the <b>pointer</b> p (0x108). Its type is "pointer to pointer to int".', m: M('9', '3', '0x104', '0x108', { 3: 'ok', 2: 'win' }), g: t2graph('y', true, true), v: { 'pp': '0x108', '*pp': '0x104 (= p)', '**pp': 3 }, vh: { 'pp': 'ok' } },
          { l: 7, n: '<code>**pp = 4;</code>: first <code>*pp</code> → go to 0x108, find 0x104. Second <code>*</code> → go to 0x104 and write 4. <b>y</b> becomes 4.', m: M('9', '4', '0x104', '0x108', { 3: 'cur', 2: 'cur', 1: 'ok' }), g: t2graph('y', true, true), v: { 'step 1: *pp': '0x104', 'step 2: **pp': '4' }, vh: { 'step 2: **pp': 'ok' } },
          { l: 8, n: 'Output <b>9 4</b>. Lesson: <code>*p = ...</code> changes the target; <code>p = ...</code> changes the pointer itself.', m: M('9', '4', '0x104', '0x108', { 0: 'sel', 1: 'sel' }), g: t2graph('y', true), o: '9 4' }
        ];
        return steps(T2_CODE, f);
      }
    },
    examples: [
      { title: 'Swap two ints through pointers (C style)', html: `<p>Pass the <b>addresses</b> so the function can reach back into the caller's variables. Inside, <code>*a</code> and <code>*b</code> are the caller's boxes.</p>${H.table(['line', 'a (addr)', 'b (addr)', '*a', '*b', 't'], [['start', '0x100', '0x104', '1', '2', '-'], ['t = *a', '0x100', '0x104', '1', '2', '1'], ['*a = *b', '0x100', '0x104', '<span class="c-g">2</span>', '2', '1'], ['*b = t', '0x100', '0x104', '2', '<span class="c-g">1</span>', '1']])}`, code: { lang: 'cpp', code: `#include <iostream>
void swapPtr(int* a, int* b) {
    int t = *a;   // copy the value a points at
    *a = *b;      // write b's target into a's target
    *b = t;       // finish the swap
}
int main() {
    int i = 1, j = 2;
    swapPtr(&i, &j);                       // pass addresses
    std::cout << i << ' ' << j << '\\n';    // 2 1
}` } },
      { title: 'Predict: the int* a, b trap', html: `<p>What are the types? <code>int* a, b;</code> → <code>a</code> is <code>int*</code>, <code>b</code> is <code>int</code>. So <code>b = &amp;x;</code> fails to compile ("invalid conversion from int* to int"). That compile error is the good outcome; the bad outcome is people reading the code wrongly. Style fix: one declaration per line.</p>`, code: { lang: 'cpp', code: `#include <type_traits>
int main() {
    int* a, b;                                       // a: int*, b: int  (!)
    static_assert(std::is_same_v<decltype(a), int*>);
    static_assert(std::is_same_v<decltype(b), int>);  // the * did not apply to b
    int *c, *d;                                      // both pointers: * on each name
    static_assert(std::is_same_v<decltype(d), int*>);
}` } },
      { title: 'Pointer to pointer: let a function re-aim the caller\'s pointer', html: `<p>A function receives copies of its arguments. If you pass <code>int* p</code>, the function gets a copy of the address and cannot change the caller's <code>p</code>. Pass <code>int** pp</code> (or <code>int*&amp;</code>) instead.</p>${H.table(['signature', 'can change *p (the target)?', 'can change p itself?'], [['<code>f(int* p)</code>', '<span class="c-g">yes</span>', '<span class="c-r">no, copy</span>'], ['<code>f(int** pp)</code>', 'yes, via <code>**pp</code>', '<span class="c-g">yes, via <code>*pp = ...</code></span>'], ['<code>f(int*&amp; rp)</code>', 'yes', '<span class="c-g">yes</span>']])}`, code: { lang: 'cpp', code: `#include <iostream>
int g_value = 42;

void pointAtGlobal(int** out) {
    *out = &g_value;          // change the CALLER's pointer
}
int main() {
    int* p = nullptr;
    pointAtGlobal(&p);        // pass the address of p
    std::cout << *p << '\\n';  // 42
}` } },
      { title: 'Arrow operator on a struct pointer', html: `<p><code>q-&gt;x</code> ≡ <code>(*q).x</code>. The tempting <code>*q.x</code> is wrong: <code>.</code> binds tighter, so it means <code>*(q.x)</code>, which does not compile because a pointer has no member <code>x</code>.</p>`, code: { lang: 'cpp', code: `#include <iostream>
struct Account { int id; double balance; };
void deposit(Account* acc, double amount) {
    acc->balance += amount;              // same as (*acc).balance += amount
}
int main() {
    Account a{7, 100.0};
    deposit(&a, 50.0);
    std::cout << a.id << ' ' << a.balance << '\\n';   // 7 150
}` } }
    ],
    deepDive: `<p><b>What a pointer really is at runtime.</b> On x86-64 a pointer is a 64-bit integer held in a register or a stack slot. <code>*p</code> compiles to one load instruction like <code>mov eax, DWORD PTR [rdi]</code>: "read 4 bytes at the address in rdi". The type <code>int*</code> exists only at compile time; it decides the load width and the arithmetic scale.</p>
<p><b>Pointer types are a safety net.</b> You can bypass them with <code>reinterpret_cast</code>, but reading an object through a pointer of an unrelated type (say a <code>float</code> through an <code>int*</code>) breaks the <b>strict aliasing rule</b>: the optimizer is allowed to assume an <code>int*</code> and a <code>float*</code> never refer to the same memory, so your read may see a stale value. The legal ways to reinterpret bits are <code>std::memcpy</code> and C++20 <code>std::bit_cast</code>.</p>
<p><b><code>void*</code></b> is "address of something, type unknown". Any object pointer converts to <code>void*</code> implicitly; going back needs a <code>static_cast</code>. You cannot dereference a <code>void*</code> or do arithmetic on it in standard C++ (GCC allows arithmetic as an extension). It is the type of <code>malloc</code>'s result and of C-style callback context parameters.</p>
<p><b>Precedence table to memorize:</b> postfix (<code>p++</code>, <code>p[i]</code>, <code>p-&gt;m</code>, <code>s.m</code>, calls) bind tighter than prefix (<code>*p</code>, <code>&amp;x</code>, <code>++p</code>). So <code>*p.m</code> = <code>*(p.m)</code>, <code>*p++</code> = <code>*(p++)</code>, <code>&amp;a[3]</code> = <code>&amp;(a[3])</code>.</p>
<p><b>Out-parameters in modern C++.</b> Pointer out-params are still common in C APIs, POSIX and game engines, but modern C++ style prefers returning a <code>struct</code>, <code>std::pair</code>/<code>std::tuple</code> with structured bindings, or <code>std::optional</code>. Use a pointer parameter when "nothing" (<code>nullptr</code>) is a meaningful input; use a reference when the argument is mandatory. The C++ Core Guidelines (F.20, F.60) spell this out.</p>
<p><b>Raw pointers today.</b> In 2026 codebases, a raw <code>T*</code> conventionally means <b>non-owning</b>: "I can look at it, I am not responsible for deleting it". Owning pointers are <code>std::unique_ptr</code>/<code>std::shared_ptr</code> (module cpp06).</p>`,
    aiEra: `<p><b>What AI changes:</b> coding assistants autocomplete pointer plumbing well and can translate a C API with <code>T**</code> out-parameters into a clean C++ wrapper returning <code>std::optional</code> or <code>std::unique_ptr</code>. Ask for that translation; it is a high-value refactor.</p>
<p><b>Use AI as a partner:</b> paste a predict-the-output puzzle and ask the assistant to <i>draw the memory table line by line</i> instead of just giving the answer. Compare its table with yours; disagreements are where you learn. Then compile it with <code>-Wall -Wextra</code> to settle the argument.</p>
<p><b>Where AI goes wrong:</b> it frequently writes <code>int* a, b;</code> expecting two pointers, mixes up <code>*p++</code> and <code>(*p)++</code>, and in multi-level pointer code (<code>Node**</code>) silently changes a copy instead of the caller's pointer. It also tends to sprinkle raw owning pointers where <code>unique_ptr</code> belongs.</p>
<p><b>What you must still own:</b> the two-question habit for any line with a pointer: <i>"Am I changing the pointer, or the thing it points at?"</i> and <i>"Is this a copy of the pointer, or the caller's original?"</i> Interviewers test exactly that, and reviewers of AI-generated code need exactly that.</p>`,
    problems: [{
      title: 'Min and Max Through Out-Pointers',
      level: 'Easy', tags: ['pointers', 'out-parameters'], companies: ['Microsoft', 'Cisco', 'Bloomberg'],
      statement: `<p>Write <code>bool minMax(const int* a, int n, int* outMin, int* outMax)</code>. It scans the <code>n</code> ints starting at <code>a</code>, writes the smallest into <code>*outMin</code> and the largest into <code>*outMax</code>, and returns <code>true</code>. If <code>n == 0</code> or any pointer is null, return <code>false</code> and write nothing.</p>`,
      constraints: `<p>0 ≤ n ≤ 10<sup>6</sup>, values fit in <code>int</code>. One pass, O(1) extra space.</p>`,
      example: `<p>a = ${H.arr([4, -2, 9, 0], { hl: { 1: 'b', 2: 'g' } })} → returns true, <code>*outMin = ${H.c('b', '-2')}</code>, <code>*outMax = ${H.c('g', '9')}</code>. The caller's two variables change because the function writes <b>through</b> their addresses.</p>`,
      brute: { why: `<p>Copy into a vector and sort it, then read front and back. O(N log N) time and O(N) extra memory just to find two numbers, and it hides the real lesson (writing through pointers).</p>`, code: { lang: 'cpp', code: `#include <vector>
#include <algorithm>
bool minMaxBrute(const int* a, int n, int* outMin, int* outMax) {
    if (n == 0 || !a || !outMin || !outMax) return false;
    std::vector<int> v(a, a + n);            // copy: O(N) memory
    std::sort(v.begin(), v.end());           // O(N log N) time
    *outMin = v.front();
    *outMax = v.back();
    return true;
}` } },
      mcq: { q: 'Inside <code>minMax</code>, which line correctly stores the minimum for the caller?', options: ['<code>outMin = &amp;best;</code>', '<code>*outMin = best;</code>', '<code>&amp;outMin = best;</code>', '<code>outMin = best;</code>'], answer: 1, explain: '<code>*outMin = best</code> writes into the caller\'s variable. <code>outMin = &amp;best</code> only re-aims the local copy of the pointer (and at a local that dies on return!).' },
      hints: [`<p>The caller passes <code>&amp;lo</code> and <code>&amp;hi</code>. Writing to <code>*outMin</code> writes into <code>lo</code>.</p>`, `<p>Start <code>mn = mx = a[0]</code>, then walk the rest once. Only write through the out-pointers at the very end (so a failure never leaves half-written results).</p>`, `<p>Guard first: <code>if (n &lt;= 0 || !a || !outMin || !outMax) return false;</code>. Then loop <code>for (const int* p = a + 1; p != a + n; ++p)</code> updating mn/mx, then <code>*outMin = mn; *outMax = mx; return true;</code></p>`],
      solution: {
        approach: `<p>Validate pointers, single linear scan with two running values, publish results through the out-pointers at the end.</p>`,
        code: { lang: 'cpp', code: `#include <iostream>

bool minMax(const int* a, int n, int* outMin, int* outMax) {
    if (n <= 0 || a == nullptr || outMin == nullptr || outMax == nullptr)
        return false;                         // nothing written on failure
    int mn = a[0], mx = a[0];
    for (const int* p = a + 1; p != a + n; ++p) {   // walk with a pointer
        if (*p < mn) mn = *p;
        if (*p > mx) mx = *p;
    }
    *outMin = mn;                             // write into the caller's variables
    *outMax = mx;
    return true;
}

int main() {
    int data[] = {4, -2, 9, 0};
    int lo = 0, hi = 0;
    if (minMax(data, 4, &lo, &hi))
        std::cout << lo << ' ' << hi << '\\n';   // -2 9
}` },
        alt: [{ lang: 'cpp', title: 'Modern C++ alternative: return a pair', code: `#include <optional>
#include <utility>
#include <span>
#include <algorithm>
// No out-pointers at all: return the answer, empty optional means "no elements"
std::optional<std::pair<int, int>> minMaxModern(std::span<const int> a) {
    if (a.empty()) return std::nullopt;
    auto [mn, mx] = std::minmax_element(a.begin(), a.end());
    return std::pair{*mn, *mx};
}` }],
        dry: { head: ['p points at', '*p', 'mn', 'mx'], rows: [['a[0] (init)', '4', '4', '4'], ['a[1]', '-2', '<span class="c-b">-2</span>', '4'], ['a[2]', '9', '-2', '<span class="c-g">9</span>'], ['a[3]', '0', '-2', '9'], ['end', '-', '*outMin = -2', '*outMax = 9']] },
        complexity: `<p>Time O(N), extra space O(1).</p>`,
        followUps: ['Can you do it in about 1.5N comparisons instead of 2N (compare in pairs)?', 'Why is returning <code>std::optional&lt;pair&gt;</code> often nicer than out-pointers?', 'What happens if the caller passes the same address for outMin and outMax?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3: Pointer arithmetic
     ====================================================================== */
  topics.push({
    title: 'Pointer Arithmetic: Stepping Through Memory',
    analogy: `<p>Think of a row of <b>identical lockers</b> in a school corridor. Each locker is 4 tiles wide. If you are standing at locker 0 and someone says "move 3 lockers", you do not move 3 tiles, you move <b>3 lockers = 12 tiles</b>. Pointer arithmetic works the same way: <code>p + 3</code> means "3 <b>elements</b> further", and the compiler converts that into bytes for you using the element size. And just like the corridor, walking past the last locker into the wall is your problem, not the school's.</p>`,
    explain: `<p>Because array elements sit side by side (topic 1), a pointer to one element can reach its neighbours with simple <b>+ and −</b>.</p>
<h4>1. <code>p + k</code> moves k elements, not k bytes</h4>
<p>If <code>int* p</code> holds 0x200 and <code>sizeof(int)</code> is 4, then <code>p + 1</code> is 0x204 and <code>p + 3</code> is 0x20c. For a <code>double*</code> each step is 8 bytes; for a <code>char*</code> it is 1 byte. The formula is <b>address + k × sizeof(T)</b>.</p>
${H.arr(['10', '20', '30', '40', '50'], { label: 'int a[5] @0x200', ptr: { 0: 'p', 1: 'p+1', 3: 'p+3' }, hl: { 0: 'b', 3: 'g' } })}
${H.table(['expression', 'address', 'value of *(...)'], [['<code>p</code>', '0x200', '10'], ['<code>p + 1</code>', '0x204', '20'], ['<code>p + 3</code>', '0x20c', '40']])}
<h4>2. Indexing is arithmetic in disguise</h4>
<p><code>p[i]</code> is <b>defined</b> as <code>*(p + i)</code>. That is all square brackets do. (Fun consequence: since addition is commutative, <code>i[p]</code> also compiles and means the same thing. Never write it in real code.)</p>
<h4>3. Moving a pointer: <code>++p</code>, <code>p += 2</code>, <code>--p</code></h4>
<p>These change the pointer variable itself, again in whole elements. Classic loop:</p>
<pre>for (int* p = a; p != a + 5; ++p) sum += *p;</pre>
<h4>4. Subtracting two pointers = distance in elements</h4>
<p>If <code>p</code> and <code>q</code> point into the <b>same array</b>, <code>q - p</code> is the number of elements between them (type <code>std::ptrdiff_t</code>, a signed integer). 0x20c − 0x200 = 12 bytes → 12 / 4 = <b>3</b>. Adding two pointers is meaningless and does not compile.</p>
<h4>5. Comparing pointers</h4>
<p><code>p == q</code> and <code>p != q</code> always work. <code>&lt;</code>, <code>&gt;</code> are meaningful for pointers into the same array (use <code>std::less&lt;&gt;</code> if you need an order on unrelated pointers).</p>
<h4>6. The "one past the end" rule</h4>
<p>For an array of N elements you may <b>form</b> the pointer <code>a + N</code> (one past the last element) and compare against it, which is exactly what <code>end()</code> iterators are. You may <b>not</b> dereference it, and you may not even form <code>a + N + 1</code> or <code>a - 1</code>: that is undefined behaviour, even if you never read through it.</p>
${H.arr(['10', '20', '30', '40', '50', '—'], { label: 'valid positions', ptr: { 0: 'a', 5: 'a+5 (end)' }, hl: { 5: 'y' } })}
<h4>7. The precedence puzzle every interviewer loves</h4>
${H.table(['expression', 'parsed as', 'what changes', 'value'], [
  ['<code>*p++</code>', '<code>*(p++)</code>', 'pointer moves forward', 'old <code>*p</code>'],
  ['<code>(*p)++</code>', 'increment the target', 'the element grows by 1', 'old element value'],
  ['<code>++*p</code>', '<code>++(*p)</code>', 'the element grows by 1', 'new element value'],
  ['<code>*++p</code>', '<code>*(++p)</code>', 'pointer moves first', 'the next element']
])}
<p>Rule of thumb: postfix <code>++</code> binds tighter than <code>*</code>, but postfix returns the <b>old</b> value. So <code>*p++</code> reads the current element, then moves on. That one idiom powers <code>while (*dst++ = *src++);</code>, the classic string copy.</p>`,
    clues: [
      '"Without using the [] operator" / "using only pointers" → walk with <code>p + i</code>, <code>++p</code>, compare to an end pointer',
      '"Predict the output of <code>*p++</code> / <code>++*p</code> / <code>*++p</code>" → postfix binds tighter, returns old value',
      '"How many elements between two pointers?" → <code>q - p</code> gives <code>ptrdiff_t</code> elements, not bytes',
      '"Two pointers from both ends" (reverse, palindrome, partition) → <code>lo</code>/<code>hi</code> pointers moving toward each other',
      '"Is <code>a + N</code> valid? <code>a + N + 1</code>?" → one-past-end may be formed and compared, never dereferenced; beyond that is UB',
      '"Why does <code>arr[i]</code> equal <code>i[arr]</code>?" → subscript is defined as <code>*(arr + i)</code>'
    ],
    code: [{ lang: 'cpp', title: 'Pointer arithmetic tour', code: `#include <iostream>
#include <cstddef>
using namespace std;

int main() {
    int a[5] = {10, 20, 30, 40, 50};
    int* p = a;                  // array name decays to &a[0]
    int* end = a + 5;            // one past the last element: OK to form, NOT to dereference

    cout << *(p + 3) << ' ' << p[3] << '\\n';   // 40 40   (p[i] is *(p + i))

    int sum = 0;
    for (int* q = p; q != end; ++q)            // each ++q moves sizeof(int) bytes
        sum += *q;
    cout << "sum = " << sum << '\\n';            // sum = 150

    ptrdiff_t n = end - p;                      // distance in ELEMENTS
    cout << "elements = " << n << '\\n';         // elements = 5

    // The precedence quartet
    int b[3] = {1, 5, 9};
    int* r = b;
    cout << *r++ << ' ';     // 1  : read b[0], then r -> b[1]
    cout << (*r)++ << ' ';   // 5  : read b[1], then b[1] becomes 6
    cout << ++*r << ' ';     // 7  : b[1] becomes 7, read it
    cout << *++r << '\\n';    // 9  : r -> b[2], read it
}` }, { lang: 'cpp', title: 'Same address, different steps', code: `#include <iostream>
int main() {
    int a[2] = {0, 0};
    int*  ip = a;
    char* cp = reinterpret_cast<char*>(a);   // view the same bytes as chars
    // ip + 1 jumps 4 bytes, cp + 1 jumps 1 byte
    std::cout << (reinterpret_cast<char*>(ip + 1) - cp) << ' '   // 4
              << ((cp + 1) - cp) << '\\n';                         // 1
}` }],
    codeTitle: ['Arithmetic, indexing, subtraction, precedence', 'Step size depends on the pointer type'],
    viz: {
      title: 'Walk a pointer through an array (begin/end loop)',
      input: '10 20 30 40 50',
      inputLabel: 'int array (1 to 8 numbers)',
      gen: function (input) {
        var a = parseInts(input, '10 20 30 40 50', 8, 'Enter 1 to 8 integers separated by spaces, e.g. 3 1 4 1 5');
        var N = a.length, code = [
          'int a[] = {' + a.join(', ') + '};',
          'int* p = a;          // &a[0]',
          'int* end = a + ' + N + ';    // one past the last',
          'int sum = 0;',
          'while (p != end) {',
          '    sum += *p;       // read the element',
          '    ++p;             // move sizeof(int) = 4 bytes',
          '}',
          'cout << sum << " " << (p - a);'
        ].join('\n');
        function cells() {
          var c = a.map(function (v, i) { return [hex(0x200 + 4 * i), v, 'a[' + i + ']']; });
          c.push([hex(0x200 + 4 * N), '—', '(end)']);
          return c;
        }
        function P(pi, extra) {
          var p = {};
          if (pi !== null) p[pi] = ['p'];
          p[N] = (p[N] || []).concat(['end']);
          if (extra) Object.keys(extra).forEach(function (k) { p[k] = (p[k] || []).concat(extra[k]); });
          return p;
        }
        var f = [], sum = 0, i;
        f.push({ l: 1, n: 'The array occupies ' + N + ' boxes of 4 bytes each, starting at 0x200. The extra box after it is the <b>one-past-the-end</b> position: you may point there, never read there.', m: { cells: cells(), hl: one(N, 'done'), p: {} } });
        f.push({ l: 2, n: '<code>int* p = a;</code> The array name turns into the address of its first element, so p = <b>0x200</b>.', m: { cells: cells(), hl: { 0: 'cur' }, p: P(0) }, v: { 'p': '0x200', '*p': a[0] }, vh: { 'p': 'cur' } });
        f.push({ l: 3, n: '<code>int* end = a + ' + N + ';</code> → 0x200 + ' + N + ' × 4 = <b>' + hex(0x200 + 4 * N) + '</b>. It marks the stopping line. Dereferencing it would be undefined behaviour.', m: { cells: cells(), hl: one(N, 'bad'), p: P(0) }, v: { 'p': '0x200', 'end': hex(0x200 + 4 * N), 'end - p': N } });
        for (i = 0; i < N; i++) {
          sum += a[i];
          var hl = {}; hl[i] = 'ok';
          for (var k = 0; k < i; k++) hl[k] = 'done';
          f.push({ l: 6, n: 'p = ' + hex(0x200 + 4 * i) + ' ≠ end, so enter the loop. <code>sum += *p</code> reads ' + a[i] + ' → sum = <b>' + sum + '</b>.', m: { cells: cells(), hl: hl, p: P(i) }, v: { 'p': hex(0x200 + 4 * i), '*p': a[i], 'sum': sum }, vh: { 'sum': 'ok' } });
          var hl2 = {}; for (k = 0; k <= i; k++) hl2[k] = 'done';
          hl2[i + 1] = i + 1 === N ? 'bad' : 'cur';
          f.push({ l: 7, n: '<code>++p</code>: the pointer moves <b>one element = 4 bytes</b>: ' + hex(0x200 + 4 * i) + ' → ' + hex(0x200 + 4 * (i + 1)) + (i + 1 === N ? '. Now p == end, the loop condition fails next time.' : '.'), m: { cells: cells(), hl: hl2, p: P(i + 1) }, v: { 'p': hex(0x200 + 4 * (i + 1)), 'p - a': i + 1, 'sum': sum }, vh: { 'p': 'cur' } });
        }
        f.push({ l: 9, n: 'Loop ends because <code>p == end</code>. <code>p - a</code> is (' + hex(0x200 + 4 * N) + ' − 0x200) / 4 = <b>' + N + '</b> elements. Output: <b>' + sum + ' ' + N + '</b>.', m: { cells: cells(), hl: one(N, 'sel'), p: P(N) }, v: { 'sum': sum, 'p - a': N }, o: sum + ' ' + N });
        var mid = Math.min(2, N - 1);
        f.push({ l: 0, n: 'Bonus: <code>a[' + mid + ']</code>, <code>*(a + ' + mid + ')</code> and <code>' + mid + '[a]</code> are the <b>same</b> expression: address 0x200 + ' + mid + ' × 4 = ' + hex(0x200 + 4 * mid) + ', value ' + a[mid] + '.', m: { cells: cells(), hl: (function () { var h = {}; h[mid] = 'sel'; return h; })(), p: (function () { var h = {}; h[mid] = ['a+' + mid]; return h; })() }, v: { 'a[i]': a[mid], '*(a+i)': a[mid], 'i[a]': a[mid] } });
        return steps(code, f);
      }
    },
    examples: [
      { title: 'Predict the output: the precedence quartet', html: `<p>Start with <code>int b[] = {1, 5, 9}; int* r = b;</code> and run the four lines in the code above in order.</p>${H.table(['line', 'prints', 'r points at', 'b after'], [['<code>*r++</code>', '1', 'b[1]', '{1, 5, 9}'], ['<code>(*r)++</code>', '5', 'b[1]', '{1, <span class="c-g">6</span>, 9}'], ['<code>++*r</code>', '7', 'b[1]', '{1, <span class="c-g">7</span>, 9}'], ['<code>*++r</code>', '9', 'b[2]', '{1, 7, 9}']])}<p>Output: <b>1 5 7 9</b>.</p>` },
      { title: 'Count characters with pointer subtraction (strlen)', html: `<p>Walk a pointer until the terminating <code>'\\0'</code>, then subtract the start. For <code>"cat"</code> at 0x400: the pointer stops at 0x403, and 0x403 − 0x400 = 3.</p>${H.arr(['c', 'a', 't', '\\0'], { label: '"cat"', ptr: { 0: 's', 3: 'p (stop)' }, hl: { 3: 'y' } })}`, code: { lang: 'cpp', code: `#include <cstddef>
#include <iostream>
std::size_t myStrlen(const char* s) {
    const char* p = s;
    while (*p != '\\0') ++p;      // stop on the terminator
    return static_cast<std::size_t>(p - s);   // distance in chars = length
}
int main() { std::cout << myStrlen("cat") << '\\n'; }   // 3` } },
      { title: 'Two pointers meeting in the middle: palindrome check', html: `<p><code>lo</code> starts at the first char, <code>hi</code> at the last. Compare, then move both inward. Stop when they meet or cross. "level": l=l, e=e, v meets itself → palindrome.</p>${H.arr(['l', 'e', 'v', 'e', 'l'], { ptr: { 1: 'lo', 3: 'hi' }, hl: { 0: 'm', 4: 'm', 1: 'g', 3: 'g' } })}`, code: { lang: 'cpp', code: `#include <cstring>
bool isPalindrome(const char* s) {
    const char* lo = s;
    const char* hi = s + std::strlen(s);   // one past the end
    if (lo == hi) return true;             // empty string
    --hi;                                  // now the last real char
    while (lo < hi) {                      // same array, so < is meaningful
        if (*lo != *hi) return false;
        ++lo; --hi;
    }
    return true;
}` } },
      { title: 'Bug hunt: reading one past the end', html: `<p>This loop uses <code>&lt;=</code> and reads <code>a[5]</code>, which does not exist. It may print a garbage number, may crash, and AddressSanitizer reports <i>stack-buffer-overflow</i>. Fix: use <code>p != a + 5</code> (or <code>&lt;</code>).</p>`, code: { lang: 'cpp', code: `#include <iostream>
int main() {
    int a[5] = {1, 2, 3, 4, 5};
    int sum = 0;
    // BUG: for (int* p = a; p <= a + 5; ++p) sum += *p;   // reads a[5]: undefined behaviour
    for (int* p = a; p != a + 5; ++p) sum += *p;            // FIX: stop AT one-past-end
    std::cout << sum << '\\n';   // 15
}` } }
    ],
    deepDive: `<p><b>What the compiler emits.</b> <code>p + k</code> for <code>int*</code> becomes <code>p + 4*k</code>, usually folded into an x86 addressing mode like <code>[rdi + rsi*4]</code> for free. Optimizers turn index loops and pointer loops into the same machine code, so pick whichever reads better; "pointers are faster than indices" is a 1990s myth.</p>
<p><b>Why going out of range is UB, not just "wrong".</b> The standard only defines arithmetic within an array object plus the one-past-end position. Compilers rely on that: given <code>if (p + n &lt; p)</code> as an overflow check, GCC/Clang may delete the check entirely because valid pointer arithmetic cannot wrap. That is why "it works in debug, breaks in -O2" bugs exist.</p>
<p><b>Pointer provenance.</b> Modern compilers track which allocation a pointer came from. Two pointers can hold the same numeric address (one-past-end of array A equals the start of array B) yet compare in surprising ways or be treated as non-aliasing. Papers like P2434 and the C provenance TS are formalising this; the practical rule is simple: only do arithmetic within the object you started from.</p>
<p><b>Iterators are generalised pointers.</b> The STL was designed around pointer arithmetic: random-access iterators (vector, array, deque) support <code>it + k</code>, <code>it2 - it1</code>, <code>it[k]</code>; bidirectional ones (list, set) only <code>++</code>/<code>--</code>. A raw pointer <i>is</i> a contiguous random-access iterator, so <code>std::sort(a, a + n)</code> works on C arrays.</p>
<p><b>Signedness.</b> <code>ptrdiff_t</code> is signed (q − p can be negative) while sizes are <code>size_t</code> (unsigned). Mixing them in comparisons triggers <code>-Wsign-compare</code>. C++20 added <code>std::ssize()</code> to get a signed size and avoid that mismatch.</p>
<p><b>Strength reduction and SIMD.</b> Simple contiguous loops like the sum above get auto-vectorized (4 to 16 ints per instruction) because the compiler can prove the pointer steps linearly. Aliasing doubts (could <code>dst</code> overlap <code>src</code>?) block vectorization; <code>__restrict</code> or using distinct local copies helps.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are very good at mechanical pointer-loop rewrites (index loop to pointer loop, C string functions to <code>std::string_view</code>), and at explaining the precedence quartet. They also generate edge cases fast: empty array, one element, even/odd lengths.</p>
<p><b>Use AI as a partner:</b> ask <code>List every expression in this function that could form a pointer outside [begin, end]</code>. That focused question gets far better answers than "is this correct?". Then run the tests under <code>-fsanitize=address,undefined</code> to confirm.</p>
<p><b>Where AI goes wrong:</b> off-by-one in end pointers (<code>&lt;=</code> instead of <code>!=</code>), forming <code>begin - 1</code> in reverse loops (UB even if never dereferenced), subtracting pointers from different arrays, and confusing byte offsets with element offsets when <code>reinterpret_cast</code> is involved.</p>
<p><b>What you must still own:</b> the one-past-end rule, the element-not-byte scaling, and the ability to trace <code>*p++</code> on paper. Output-prediction rounds in interviews are explicitly designed to be answered without a computer.</p>`,
    problems: [{
      title: 'Reverse an Array Using Only Pointers',
      level: 'Easy', tags: ['pointer arithmetic', 'two pointers'], companies: ['Amazon', 'Adobe', 'Samsung'],
      statement: `<p>Write <code>void reverseRange(int* first, int* last)</code> that reverses the elements in the half-open range <code>[first, last)</code> <b>in place</b>, using pointer arithmetic only (no <code>[]</code>, no indices, no extra array).</p>`,
      constraints: `<p>0 ≤ last − first ≤ 10<sup>6</sup>. Must handle empty and single-element ranges. O(1) extra space.</p>`,
      example: `<p>Input ${H.arr([1, 2, 3, 4, 5], { ptr: { 0: 'first', 4: 'last-1' } })} → output ${H.arr([5, 4, 3, 2, 1], { hl: { 0: 'g', 1: 'g', 3: 'g', 4: 'g', 2: 'y' } })}<p>The middle element (3) stays because the two pointers meet on it.</p>`,
      brute: { why: `<p>Copy into a temporary vector backwards and copy back. Correct, but uses O(N) extra memory and two passes, while swapping from both ends needs none.</p>`, code: { lang: 'cpp', code: `#include <vector>
void reverseBrute(int* first, int* last) {
    std::vector<int> tmp(first, last);         // O(N) extra memory
    for (int* p = first; p != last; ++p) {
        *p = tmp.back();                        // take from the back
        tmp.pop_back();
    }
}` } },
      mcq: { q: 'Given the half-open range <code>[first, last)</code>, where should the right-hand pointer start?', options: ['<code>last</code>', '<code>last - 1</code>, after checking the range is not empty', '<code>last + 1</code>', '<code>first + 1</code>'], answer: 1, explain: '<code>last</code> is one past the end and must not be dereferenced; <code>last - 1</code> is the final real element. Check emptiness first, because <code>first - 1</code> (if first == last) would be UB.' },
      hints: [`<p>Swap the outermost pair, then move both pointers one step inward. Repeat.</p>`, `<p>Use <code>lo = first</code> and <code>hi = last</code>, and pre-decrement <code>hi</code> only inside the loop condition when it is safe: <code>while (lo != hi &amp;&amp; lo != --hi)</code>.</p>`, `<p>Recipe: loop while <code>lo &lt; hi</code> after setting <code>hi = last - 1</code> (only if not empty); <code>std::swap(*lo, *hi); ++lo; --hi;</code>. The loop stops when they meet (odd length) or cross (even length).</p>`],
      solution: {
        approach: `<p>Classic two-pointer swap from both ends. The <code>lo != hi &amp;&amp; lo != --hi</code> form is the same trick <code>std::reverse</code> implementations use: it never forms a pointer before <code>first</code>.</p>`,
        code: { lang: 'cpp', code: `#include <iostream>
#include <utility>

void reverseRange(int* first, int* last) {
    int* lo = first;
    int* hi = last;
    // Stop when the pointers meet (odd count) or are adjacent-then-crossed (even count)
    while (lo != hi && lo != --hi) {   // --hi happens only when lo != hi, so never before first
        std::swap(*lo, *hi);           // swap the outer pair
        ++lo;                          // move inward
    }
}

int main() {
    int a[] = {1, 2, 3, 4, 5};
    reverseRange(a, a + 5);
    for (int* p = a; p != a + 5; ++p) std::cout << *p << ' ';   // 5 4 3 2 1
    std::cout << '\\n';
}` },
        dry: { head: ['step', 'lo → value', 'hi → value', 'array after swap'], rows: [['1', 'a[0] = 1', 'a[4] = 5', '5 2 3 4 1'], ['2', 'a[1] = 2', 'a[3] = 4', '5 4 3 2 1'], ['3', 'a[2]', '--hi makes hi == lo (a[2])', 'stop: middle stays']] },
        complexity: `<p>Time O(N) (N/2 swaps), extra space O(1).</p>`,
        followUps: ['Rotate an array by k using three reversals', 'Why is <code>while (lo &lt; hi)</code> with <code>hi = last - 1</code> unsafe for an empty range?', 'Make it a template that works for any bidirectional iterator']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4: nullptr, null checks and wild pointers
     ====================================================================== */
  var T4_CODE = [
    'int x = 7;',
    'int* p = nullptr;     // points nowhere, on purpose',
    'if (p != nullptr)     // check before use',
    '    *p = 1;           // skipped',
    'int* w;               // NOT initialized: garbage address',
    '*w = 1;               // UB: writes wherever w happens to point',
    '*p = 1;               // UB: null dereference, usually a crash'
  ].join('\n');

  topics.push({
    title: 'nullptr, Null Checks &amp; Wild Pointers',
    analogy: `<p>A <b>null pointer</b> is a sticky note that clearly says <b>"NOWHERE"</b>. It is honest: anyone reading it knows not to go anywhere. A <b>wild pointer</b> (uninitialized) is a sticky note with a <b>random smudge</b> that looks like a house number. Follow it and you might walk into a stranger's house and rearrange their furniture (silent memory corruption), or into a wall (crash). <code>nullptr</code> exists so you can always write "NOWHERE" instead of leaving a smudge.</p>`,
    explain: `<p>Sometimes a pointer has nothing to point at yet: "the next node after the last one", "the search found nothing", "no parent". We need a special value meaning <b>"points nowhere"</b>. In modern C++ that value is <code>nullptr</code>.</p>
<h4>1. Three ways to say null (only one is good)</h4>
${H.table(['spelling', 'what it really is', 'verdict'], [
  ['<code>0</code>', 'the integer zero (converts to a null pointer)', 'legal but unclear'],
  ['<code>NULL</code>', 'a macro, usually <code>0</code> or <code>0L</code> or <code>__null</code>', 'old C style, overload surprises'],
  ['<code>nullptr</code> (C++11)', 'a keyword of its own type <code>std::nullptr_t</code>', '<span class="c-g">always use this</span>']
])}
<h4>2. Why <code>nullptr</code> beats <code>NULL</code>: overloads</h4>
<pre>void f(int);    // #1
void f(char*);  // #2
f(0);        // #1 : 0 is an int
f(NULL);     // #1, or "ambiguous" error, depending on the compiler!
f(nullptr);  // #2 : nullptr is never an int</pre>
<p><code>nullptr</code> converts to <b>any</b> pointer type but <b>never</b> to an integer, so it always picks the pointer overload. It also makes templates and <code>auto</code> behave: <code>auto q = nullptr;</code> gives a <code>std::nullptr_t</code>, while <code>auto q = NULL;</code> may silently give a <code>long</code>.</p>
<h4>3. Dereferencing null is undefined behaviour</h4>
<p><code>*p</code> when <code>p == nullptr</code> is <b>undefined behaviour</b> (UB): the C++ standard makes no promise at all. In practice on Linux/Windows/macOS the lowest memory page is deliberately unmapped, so the CPU traps and you get <b>Segmentation fault (SIGSEGV)</b> or an access violation. That crash is the <i>lucky</i> outcome. Compilers may also assume "this pointer was dereferenced, so it cannot be null" and delete your later null checks.</p>
<h4>4. Null checks</h4>
<p>Check before you dereference whenever null is a legal value: <code>if (p) use(*p);</code> or <code>if (p != nullptr)</code>. Both are the same; a pointer converts to <code>bool</code> as "not null". Use <code>&amp;&amp;</code> short-circuiting for chains: <code>if (node &amp;&amp; node-&gt;next) ...</code>.</p>
<h4>5. Wild pointers: worse than null</h4>
<p>A local <code>int* w;</code> holds whatever bits were on the stack: a <b>wild</b> pointer. It is not null, so <code>if (w)</code> passes, and writing through it can silently overwrite another variable. Global and <code>static</code> pointers are zero-initialized to null automatically, but locals are not. <b>Rule: initialize every pointer when you declare it</b>, to a real address or to <code>nullptr</code>.</p>
<h4>6. Common uses of null</h4>
${H.table(['situation', 'null means'], [['linked list <code>next</code>', 'end of the list'], ['tree <code>left</code>/<code>right</code>', 'no child'], ['search function result', 'not found'], ['optional parameter <code>const Options* opt</code>', '"use the defaults"'], ['after <code>delete p;</code> then <code>p = nullptr;</code>', 'this pointer no longer owns anything']])}
<p>Also handy: <code>delete nullptr;</code> and <code>free(NULL)</code> are guaranteed to do nothing, so you never need to null-check before deleting.</p>`,
    clues: [
      '"What is the difference between NULL, 0 and nullptr?" → type <code>std::nullptr_t</code>, overload resolution, templates',
      '"Return the node / element, or indicate not found" → return <code>nullptr</code> (or <code>std::optional</code> for values)',
      '"Segmentation fault" in a stack trace near a <code>-&gt;</code> → null or wild pointer dereference',
      '"Is it safe to delete a null pointer?" → yes, it is a no-op',
      '"Why does <code>if (p)</code> pass but the program still crashes?" → uninitialized (wild) or dangling pointer, not null',
      '"Linked list / tree traversal" → loop <code>while (cur != nullptr)</code>, null terminates the structure'
    ],
    code: [{ lang: 'cpp', title: 'nullptr in practice', code: `#include <iostream>
#include <cstddef>
using namespace std;

void f(int)   { cout << "f(int)\\n"; }
void f(char*) { cout << "f(char*)\\n"; }

struct Node { int val; Node* next; };

// Return the first node holding 'target', or nullptr when it is not there
Node* find(Node* head, int target) {
    for (Node* cur = head; cur != nullptr; cur = cur->next)   // null ends the list
        if (cur->val == target) return cur;
    return nullptr;                                            // "not found"
}

int main() {
    f(0);          // f(int)
    f(nullptr);    // f(char*)   : nullptr never converts to int
    // f(NULL);    // f(int) on some compilers, ambiguous on others: avoid NULL

    Node c{3, nullptr}, b{2, &c}, a{1, &b};   // list 1 -> 2 -> 3 -> null
    if (Node* n = find(&a, 2))                 // test the result before using it
        cout << "found " << n->val << '\\n';    // found 2
    if (find(&a, 9) == nullptr)
        cout << "9 not found\\n";

    int* q = nullptr;
    delete q;                                  // deleting nullptr is a guaranteed no-op
    static_assert(sizeof(nullptr) == sizeof(void*));
}` }],
    codeTitle: ['nullptr: overloads, sentinel, not-found'],
    viz: [{
      title: 'Null vs wild: one crashes loudly, one corrupts silently',
      gen: function () {
        function M(vx, vp, vw, hl, p) {
          return { cells: [['0x0', '✖ unmapped', 'page 0'], ['0x100', vx, 'x'], ['0x108', vp, 'p'], ['0x110', vw, 'w']], hl: hl || {}, p: p || {} };
        }
        var f = [
          { l: 1, n: '<code>int x = 7;</code> The box at address 0x0 is shown on purpose: the operating system leaves the lowest page of memory <b>unmapped</b>, so any access there traps.', m: M('7', '??', '??', { 0: 'done', 1: 'ok' }) },
          { l: 2, n: '<code>int* p = nullptr;</code> p holds the null value (all-zero bits on every mainstream platform). It honestly says "points nowhere".', m: M('7', 'nullptr', '??', { 2: 'ok', 0: 'done' }, { 0: ['p → ✖'] }), v: { 'p': 'nullptr', 'p == nullptr': 'true', 'bool(p)': 'false' } },
          { l: 3, n: '<code>if (p != nullptr)</code> is <b>false</b>, so the write on the next line is skipped. This check is exactly what null is for.', m: M('7', 'nullptr', '??', { 2: 'cur' }, { 0: ['p → ✖'] }), v: { 'p != nullptr': 'false' }, vh: { 'p != nullptr': 'bad' } },
          { l: 5, n: '<code>int* w;</code> is a local with <b>no initializer</b>. It contains leftover garbage, which here happens to be <b>0x100</b>, the address of x. It is not null, so <code>if (w)</code> would happily pass.', m: M('7', 'nullptr', '0x100 (garbage)', { 3: 'bad' }, { 0: ['p → ✖'], 1: ['*w ?!'] }), v: { 'w': '0x100 (random)', 'w == nullptr': 'false' }, vh: { 'w': 'bad' } },
          { l: 6, n: '<code>*w = 1;</code> writes 1 into address 0x100: <b>x silently changes from 7 to 1</b>. No crash, no error. The bug will surface far away, later. This is why wild pointers are worse than null ones.', m: M('1', 'nullptr', '0x100 (garbage)', { 1: 'bad', 3: 'bad' }, { 0: ['p → ✖'], 1: ['*w'] }), v: { 'x': '1 (was 7!)' }, vh: { 'x': 'bad' } },
          { l: 7, n: '<code>*p = 1;</code> with p == nullptr: the CPU tries to write to address 0x0, which is unmapped. The OS kills the program: <b>Segmentation fault</b>. Loud, immediate, easy to find in a debugger.', m: M('1', 'nullptr', '0x100 (garbage)', { 0: 'bad', 2: 'bad' }, { 0: ['*p 💥'] }), o: 'Segmentation fault (core dumped)' },
          { l: 0, n: 'Fix both bugs: <b>initialize every pointer</b> (<code>int* w = nullptr;</code> or a real address) and <b>check before dereferencing</b> when null is possible. Compile with <code>-Wall -Wuninitialized</code> and run with <code>-fsanitize=address,undefined</code> to catch the rest.', m: M('7', 'nullptr', 'nullptr', { 1: 'ok', 2: 'ok', 3: 'ok' }), tb: { type: 'table', label: 'Null vs wild', columns: ['', 'null pointer', 'wild pointer'], rows: [['value', 'nullptr (known)', 'random garbage'], ['if (p) test', 'false: you can detect it', 'true: you cannot'], ['dereference', 'UB, usually instant crash', 'UB, often silent corruption'], ['prevention', 'check before use', 'always initialize']] } }
        ];
        return steps(T4_CODE, f);
      }
    }, {
      title: 'Overload resolution: 0 vs NULL vs nullptr',
      gen: function () {
        var code = 'void f(int);     // #1\nvoid f(char*);   // #2\nf(0);\nf(NULL);\nf(nullptr);';
        var rows = [['f(0)', 'int', '#1 f(int)'], ['f(NULL)', 'int / long / __null', '#1 or ambiguous error'], ['f(nullptr)', 'std::nullptr_t', '#2 f(char*)']];
        function T(h) { return { type: 'table', label: 'Which overload is called?', columns: ['call', 'argument type', 'result'], rows: rows.slice(0, h + 1), hl: one(h, h === 1 ? 'bad' : 'ok') }; }
        return [
          { narr: 'Two overloads: one takes an <code>int</code>, one takes a <code>char*</code>. Which one does each call pick?', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 1: 'cur', 2: 'cur' } }] },
          { narr: '<code>f(0)</code>: the literal 0 is an <code>int</code>. Exact match with #1. Even though 0 <i>could</i> become a null pointer, an exact match wins.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 3: 'cur' } }, T(0)] },
          { narr: '<code>f(NULL)</code>: NULL is a macro. With GCC it is <code>__null</code> (an integer-ish constant) and you get #1 or an "ambiguous" error; elsewhere it may be <code>0L</code>, also ambiguous. You wanted a pointer and did not get one.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 4: 'bad' } }, T(1)] },
          { narr: '<code>f(nullptr)</code>: nullptr has its own type <code>std::nullptr_t</code>, which converts to every pointer type and <b>to no integer type</b>. Only #2 is viable.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 5: 'ok' } }, T(2)] },
          { narr: 'Takeaway: write <code>nullptr</code> everywhere. Tools like <code>clang-tidy modernize-use-nullptr</code> rewrite old <code>NULL</code>/<code>0</code> automatically.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 5: 'ok' } }, { type: 'table', label: 'Which overload is called?', columns: ['call', 'argument type', 'result'], rows: rows, hl: { 2: 'sel' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Short-circuit null checks in a chain', html: `<p><code>if (node &amp;&amp; node-&gt;next &amp;&amp; node-&gt;next-&gt;val == 5)</code> is safe: <code>&amp;&amp;</code> stops at the first false part, so <code>node-&gt;next</code> is only read when <code>node</code> is not null. Reversing the order (<code>node-&gt;next &amp;&amp; node</code>) dereferences first and checks too late.</p>`, code: { lang: 'cpp', code: `struct Node { int val; Node* next; };
bool secondIsFive(const Node* node) {
    // each test runs only if everything to its left was true
    return node && node->next && node->next->val == 5;
}` } },
      { title: 'Predict: what does auto deduce?', html: `${H.table(['declaration', 'deduced type'], [['<code>auto a = nullptr;</code>', '<code>std::nullptr_t</code>'], ['<code>auto b = NULL;</code>', '<code>long</code> (GCC/Clang on Linux), not a pointer!'], ['<code>auto c = 0;</code>', '<code>int</code>'], ['<code>int* d = nullptr; auto e = d;</code>', '<code>int*</code>']])}<p>This matters in templates: passing <code>NULL</code> to a forwarding function loses its "pointer-ness", while <code>nullptr</code> keeps it.</p>`, code: { lang: 'cpp', code: `#include <cstddef>
#include <type_traits>
int main() {
    auto a = nullptr;
    static_assert(std::is_same_v<decltype(a), std::nullptr_t>);
    int* d = nullptr;
    auto e = d;
    static_assert(std::is_same_v<decltype(e), int*>);
}` } },
      { title: 'Null-out after delete (and its limits)', html: `<p>After <code>delete p;</code> the pointer still holds the old address (now dangling). Setting <code>p = nullptr;</code> makes later checks meaningful and a second <code>delete p;</code> harmless. But it only fixes <b>that</b> copy: any other pointer to the same object is still dangling. Real fix: let one owner (<code>std::unique_ptr</code>) manage it.</p>`, code: { lang: 'cpp', code: `#include <iostream>
int main() {
    int* p = new int(42);
    int* alias = p;          // second pointer to the same int
    delete p;
    p = nullptr;             // p is now safely "nowhere"
    delete p;                // no-op: safe
    // std::cout << *alias;  // still UB: alias dangles, nulling p did not help it
    (void)alias;
    std::cout << (p == nullptr) << '\\n';   // 1
}` } }
    ],
    deepDive: `<p><b>Is null really address zero?</b> The standard says a null pointer constant converts to a null pointer value that compares unequal to every real object's address. On every platform you will meet, that value is all-zero bits, but the standard does not require it, which is why <code>memset</code>-ing a struct of pointers to zero is technically not portable (it is in practice).</p>
<p><b>The deleted null check.</b> In this code the compiler may remove the check:</p>
<pre>int len = s-&gt;size;      // dereference first
if (s == nullptr) return 0;   // optimizer: "s was dereferenced, so it cannot be null" → deletes this</pre>
<p>A Linux kernel bug (2009, the TUN driver) worked exactly like this and became an exploit, which is why the kernel builds with <code>-fno-delete-null-pointer-checks</code>. Lesson: UB does not just crash, it changes the meaning of nearby code.</p>
<p><b>Large offsets.</b> <code>p-&gt;field</code> on a null <code>p</code> reads address <code>0 + offsetof(field)</code>. With a big struct or array, that address can land past the unmapped guard page into real memory, turning a "harmless crash" into an exploitable read/write.</p>
<p><b>Expressing "maybe absent" better:</b> for values, <code>std::optional&lt;T&gt;</code>; for non-null pointers, <code>gsl::not_null&lt;T*&gt;</code> or simply a reference; for owning resources, <code>std::unique_ptr</code> (whose default state is null). Many style guides now say: a raw pointer parameter means "optional, non-owning"; a reference means "required".</p>
<p><b>Tooling in 2026:</b> GCC/Clang <code>-Wnull-dereference</code>, Clang's <code>_Nonnull</code>/<code>_Nullable</code> annotations and nullability analysis, the Clang Static Analyzer, and UBSan's <code>-fsanitize=null</code> catch most of these. Hardened standard library modes (<code>_GLIBCXX_ASSERTIONS</code>, libc++ hardening) also trap null dereferences inside containers and smart pointers.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants reliably modernize <code>NULL</code> to <code>nullptr</code>, add missing null checks, and can explain a SIGSEGV backtrace ("frame #0 in Node::size, this=0x0") in plain English. Pair them with <code>clang-tidy</code> for bulk modernization across a repository.</p>
<p><b>Use AI as a partner:</b> paste a crash report and ask <code>Which pointer in this function could be null or uninitialized on this path? Show the path.</code> Then reproduce under AddressSanitizer to confirm the diagnosis before you accept a fix.</p>
<p><b>Where AI goes wrong:</b> it "fixes" crashes by sprinkling <code>if (p)</code> checks everywhere, hiding the real bug (why was it null?) and making the contract unclear. It also sometimes checks for null <i>after</i> the dereference, which the optimizer is allowed to delete.</p>
<p><b>What you must still own:</b> the contract. For every pointer you should be able to say "may this be null, and who guarantees it?". Decide it once, encode it in the type (reference, <code>not_null</code>, <code>optional</code>), and check at the boundary, not on every line.</p>`,
    problems: [{
      title: 'K-th Node From the End (or nullptr)',
      level: 'Medium', tags: ['nullptr', 'linked list', 'two pointers'], companies: ['Amazon', 'Meta', 'Oracle'],
      statement: `<p>Given the head of a singly linked list (<code>struct Node { int val; Node* next; };</code>) and an integer <code>k ≥ 1</code>, return a pointer to the k-th node from the end. If the list has fewer than k nodes (including an empty list, <code>head == nullptr</code>), return <code>nullptr</code>. One pass, O(1) extra memory.</p>`,
      constraints: `<p>0 ≤ length ≤ 10<sup>5</sup>, 1 ≤ k ≤ 10<sup>5</sup>.</p>`,
      example: `<p>List ${H.arr([1, 2, 3, 4, 5], { label: 'list', ptr: { 0: 'head', 3: 'answer' }, hl: { 3: 'g' } })} k = 2 → returns the node holding ${H.c('g', '4')}. With k = 9 → returns ${H.c('r', 'nullptr')} because the list only has 5 nodes.</p>`,
      brute: { why: `<p>Count the length in a first pass, then walk <code>length − k</code> steps in a second pass. Correct and O(N), but two passes over the list; and if you forget that <code>length &lt; k</code> case, you step past the null end.</p>`, code: { lang: 'cpp', code: `struct Node { int val; Node* next; };
Node* kthFromEndBrute(Node* head, int k) {
    int len = 0;
    for (Node* p = head; p != nullptr; p = p->next) ++len;   // pass 1: length
    if (k > len) return nullptr;                              // not enough nodes
    Node* p = head;
    for (int i = 0; i < len - k; ++i) p = p->next;            // pass 2: walk len-k steps
    return p;
}` } },
      mcq: { q: 'You move a <code>fast</code> pointer k steps ahead first. During those k steps it becomes <code>nullptr</code> early. What does that mean?', options: ['The list has fewer than k nodes, so return nullptr', 'k is exactly the length', 'The list has a cycle', 'Continue moving slow anyway'], answer: 0, explain: 'If fast hits null before completing k moves, there are fewer than k nodes; the safe, defined answer is nullptr. (If it becomes null exactly after the k-th move, the answer is head.)' },
      hints: [`<p>Keep two pointers k nodes apart. When the front one falls off the end (becomes <code>nullptr</code>), the back one is k from the end.</p>`, `<p>Phase 1: advance <code>fast</code> k times, checking for <code>nullptr</code> <b>before</b> each move. Phase 2: move both until <code>fast == nullptr</code>.</p>`, `<p>Recipe: <code>for (i=0;i&lt;k;++i){ if(!fast) return nullptr; fast = fast-&gt;next; }</code> then <code>while(fast){ fast = fast-&gt;next; slow = slow-&gt;next; }</code> and return <code>slow</code>. Empty list: the first check returns nullptr immediately.</p>`],
      solution: {
        approach: `<p>Gap of k between two pointers; null marks the end of the list and doubles as the "not enough nodes" signal.</p>`,
        code: { lang: 'cpp', code: `#include <iostream>

struct Node { int val; Node* next; };

Node* kthFromEnd(Node* head, int k) {
    Node* fast = head;
    for (int i = 0; i < k; ++i) {         // open a gap of k nodes
        if (fast == nullptr) return nullptr;   // fewer than k nodes: never dereference null
        fast = fast->next;
    }
    Node* slow = head;
    while (fast != nullptr) {             // when fast falls off the end...
        fast = fast->next;
        slow = slow->next;
    }
    return slow;                          // ...slow is k from the end
}

int main() {
    Node n5{5, nullptr}, n4{4, &n5}, n3{3, &n4}, n2{2, &n3}, n1{1, &n2};
    if (Node* r = kthFromEnd(&n1, 2)) std::cout << r->val << '\\n';   // 4
    std::cout << (kthFromEnd(&n1, 9) == nullptr) << '\\n';             // 1
    std::cout << (kthFromEnd(nullptr, 1) == nullptr) << '\\n';         // 1
}` },
        dry: { head: ['phase', 'fast at', 'slow at', 'note'], rows: [['gap move 1', '2', '-', 'fast was 1'], ['gap move 2', '3', '1 (start)', 'gap = 2'], ['walk', '4', '2', ''], ['walk', '5', '3', ''], ['walk', 'nullptr', '<span class="c-g">4</span>', 'fast fell off: return slow']] },
        complexity: `<p>Time O(N), one pass. Extra space O(1).</p>`,
        followUps: ['Remove the k-th node from the end (you need the node <i>before</i> it; try a <code>Node**</code>)', 'What if k ≤ 0 is passed?', 'Return the value via <code>std::optional&lt;int&gt;</code> instead of a pointer: pros and cons?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5: References vs pointers
     ====================================================================== */
  var T5_CODE = [
    'int x = 1, y = 2;',
    'int& r = x;    // r is another NAME for x',
    'r = 5;         // x becomes 5',
    'r = y;         // NOT a re-bind: copies 2 into x',
    'int* p = &x;   // p holds x\'s address',
    'p = &y;        // p re-aimed at y',
    '*p = 9;        // y becomes 9',
    'cout << x << " " << y << " " << r;'
  ].join('\n');

  function t5graph(xv, yv, pTo, hlN, hlE) {
    var nodes = [
      { id: 'x', label: 'x = ' + xv, x: 30, y: 15, shape: 'box' },
      { id: 'y', label: 'y = ' + yv, x: 30, y: 48, shape: 'box' },
      { id: 'r', label: 'r (alias)', x: 80, y: 15 }
    ];
    var edges = [['r', 'x', 'same box, forever']], ehl = {};
    if (pTo) { nodes.push({ id: 'p', label: 'p @0x108', x: 80, y: 48, shape: 'box' }); edges.push(['p', pTo, 'holds address']); }
    if (hlE) ehl[hlE] = 'cur';
    var hl = {}; if (hlN) hlN.split(',').forEach(function (k) { hl[k] = 'ok'; });
    return { type: 'graph', label: 'Reference vs pointer (arrows)', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl };
  }

  topics.push({
    title: 'References vs Pointers',
    analogy: `<p>Your friend Robert is also called <b>"Bob"</b>. "Bob" is a <b>reference</b>: a second name for the very same person. You cannot later decide that "Bob" now means your cousin; and there is no such thing as a "Bob" who is nobody. A <b>pointer</b> is more like a <b>contact card</b> with Robert's address on it. You can cross out the address and write your cousin's address instead, you can leave the card blank (null), and you must remember to <i>go to the address</i> (dereference) to actually meet anyone.</p>`,
    explain: `<p>A <b>reference</b> is an <b>alias</b>: another name for an object that already exists. After <code>int&amp; r = x;</code>, using <code>r</code> is <i>exactly</i> using <code>x</code>: no <code>*</code>, no <code>&amp;</code>, no arrows.</p>
<h4>1. The rules of references</h4>
<ul>
<li><b>Must be initialized</b>: <code>int&amp; r;</code> does not compile. A reference is born attached.</li>
<li><b>Cannot be re-seated</b>: <code>r = y;</code> does not make <code>r</code> refer to <code>y</code>; it copies <code>y</code>'s <b>value</b> into <code>x</code>. This is the #1 interview trap.</li>
<li><b>No null references</b>: there is no legal way to make one (any trick involves UB first).</li>
<li><b>No arithmetic</b>: <code>r + 1</code> adds to the value, it does not move to a neighbour.</li>
<li><code>sizeof(r)</code> and <code>&amp;r</code> give the size and address of <b>x</b>.</li>
</ul>
<h4>2. Side-by-side comparison</h4>
${H.table(['', 'pointer <code>int* p</code>', 'reference <code>int&amp; r</code>'], [
  ['must be initialized?', 'no (but you should!)', '<span class="c-g">yes, always</span>'],
  ['can be null?', 'yes, <code>nullptr</code>', 'no'],
  ['can change target?', 'yes, <code>p = &amp;y;</code>', 'no, bound for life'],
  ['syntax to use target', '<code>*p</code>, <code>p-&gt;m</code>', 'just <code>r</code>, <code>r.m</code>'],
  ['arithmetic', '<code>p + 1</code> moves to next element', 'none'],
  ['has its own address?', 'yes, <code>&amp;p</code>', '<code>&amp;r</code> is <code>&amp;x</code>'],
  ['containers of them', '<code>vector&lt;int*&gt;</code> fine', 'not allowed (use <code>reference_wrapper</code>)']
])}
<h4>3. Passing to functions: value vs pointer vs reference</h4>
${H.table(['parameter', 'copies the argument?', 'can modify caller?', 'can be "nothing"?', 'use when'], [
  ['<code>void f(Big b)</code>', 'yes', 'no', 'no', 'small types (int, double, pointers, small structs)'],
  ['<code>void f(const Big&amp; b)</code>', '<span class="c-g">no</span>', 'no', 'no', 'read-only access to big objects (string, vector)'],
  ['<code>void f(Big&amp; b)</code>', 'no', '<span class="c-g">yes</span>', 'no', 'mandatory in/out parameter'],
  ['<code>void f(Big* b)</code>', 'no', 'yes', '<span class="c-g">yes (nullptr)</span>', 'optional parameter, C APIs']
])}
<h4>4. References in range-for loops</h4>
<p><code>for (auto x : v) x *= 2;</code> doubles <b>copies</b>: <code>v</code> is unchanged. <code>for (auto&amp; x : v) x *= 2;</code> doubles the real elements. For read-only loops over strings or big objects use <code>const auto&amp;</code> to avoid copies.</p>
<h4>5. Returning references</h4>
<p>A function may return a reference to something that <b>outlives the call</b>: an element of a container the caller owns, a member of <code>*this</code>, a global. That lets callers write <code>v.at(2) = 7;</code> or <code>maxRef(v) = 0;</code>. Returning a reference to a <b>local variable</b> is a dangling reference (topic 8).</p>
<h4>6. Quick rule of thumb</h4>
<p><b>Use a reference when there is always an object and it never changes; use a pointer when "no object" is possible or you need to re-aim or do arithmetic.</b></p>`,
    clues: [
      '"Difference between pointer and reference" → null, re-seat, initialization, arithmetic, syntax, own address',
      '"What does <code>r = y</code> do when r is a reference to x?" → copies the value into x; references never re-bind',
      '"Function must modify the caller\'s object" + "argument always exists" → non-const reference parameter',
      '"Pass a large object efficiently without modifying it" → <code>const T&amp;</code>',
      '"Why didn\'t my loop change the vector?" → range-for without <code>&amp;</code> works on copies',
      '"Return something the caller can assign to" (<code>operator[]</code>, <code>at()</code>) → return <code>T&amp;</code> to storage that outlives the call'
    ],
    code: [{ lang: 'cpp', title: 'References vs pointers side by side', code: `#include <iostream>
#include <vector>
using namespace std;

void incByRef(int& n) { ++n; }            // n IS the caller's variable
void incByPtr(int* n) { if (n) ++*n; }    // n holds the caller's address (may be null)
void incByVal(int n)  { ++n; }            // n is a copy: caller unaffected

int main() {
    int x = 1, y = 2;
    int& r = x;          // alias for x
    r = 5;               // x == 5
    r = y;               // copies 2 into x: r STILL refers to x
    cout << x << ' ' << &r << ' ' << &x << '\\n';   // 2, and the two addresses are equal

    int* p = &x;
    p = &y;              // pointers CAN be re-aimed
    *p = 9;              // y == 9
    cout << x << ' ' << y << '\\n';   // 2 9

    int a = 10;
    incByVal(a); incByRef(a); incByPtr(&a); incByPtr(nullptr);
    cout << a << '\\n';  // 12 (value version did nothing, null was ignored)

    vector<int> v{1, 2, 3};
    for (auto e : v)  e *= 10;     // modifies copies only
    for (auto& e : v) e *= 2;      // modifies the real elements
    for (const auto& e : v) cout << e << ' ';   // 2 4 6
    cout << '\\n';
}` }],
    codeTitle: ['Alias vs address, three parameter styles, range-for'],
    viz: {
      title: 'Reference = second name, pointer = re-aimable arrow',
      gen: function () {
        function M(xv, yv, pv, hl, p) { return { cells: [['0x100', xv, 'x'], ['0x104', yv, 'y'], ['0x108', pv, 'p']], hl: hl || {}, p: p || {} }; }
        var f = [
          { l: 1, n: '<code>int x = 1, y = 2;</code> Two ordinary boxes.', m: M('1', '2', '??', { 0: 'ok', 1: 'ok' }), g: t5graph(1, 2, null, 'x,y') },
          { l: 2, n: '<code>int&amp; r = x;</code> No new box is drawn: r is just a <b>second label</b> stuck on x\'s box. (Under the hood the compiler may use an address, but you can never see or change it.)', m: M('1', '2', '??', { 0: 'win' }, { 0: ['r'] }), g: t5graph(1, 2, null, '', 'r-x'), v: { '&r': '0x100', '&x': '0x100', 'sizeof(r)': 'sizeof(int) = 4' } },
          { l: 3, n: '<code>r = 5;</code> Writing to r is writing to x. x is now 5.', m: M('5', '2', '??', { 0: 'ok' }, { 0: ['r'] }), g: t5graph(5, 2, null, 'x'), v: { 'x': 5, 'r': 5 }, vh: { x: 'ok' } },
          { l: 4, n: '<code>r = y;</code> <b>TRAP:</b> this does NOT make r refer to y. It is an ordinary assignment: copy y\'s value (2) into the box r names, which is x. The r label stays on x forever.', m: M('2', '2', '??', { 0: 'bad' }, { 0: ['r (still!)'] }), g: t5graph(2, 2, null, 'x', 'r-x'), v: { 'x': '2 (overwritten)', 'r bound to': 'x, not y' }, vh: { x: 'bad' } },
          { l: 5, n: '<code>int* p = &amp;x;</code> A pointer <b>is</b> a separate box (0x108) whose value is x\'s address.', m: M('2', '2', '0x100', { 2: 'ok' }, { 0: ['r', '*p'] }), g: t5graph(2, 2, 'x', 'p', 'p-x'), v: { 'p': '0x100', '&p': '0x108' } },
          { l: 6, n: '<code>p = &amp;y;</code> Pointers <b>can</b> be re-aimed: p now holds 0x104. Nothing about x changes.', m: M('2', '2', '0x104', { 2: 'cur' }, { 0: ['r'], 1: ['*p'] }), g: t5graph(2, 2, 'y', 'p', 'p-y'), v: { 'p': '0x104' }, vh: { p: 'cur' } },
          { l: 7, n: '<code>*p = 9;</code> Follow the arrow to y and write 9.', m: M('2', '9', '0x104', { 1: 'ok' }, { 0: ['r'], 1: ['*p'] }), g: t5graph(2, 9, 'y', 'y', 'p-y'), v: { 'y': 9 }, vh: { y: 'ok' } },
          { l: 8, n: 'Output: <b>2 9 2</b>. r printed 2 because it is still x. Summary: the reference never moved; the pointer moved once.', m: M('2', '9', '0x104', { 0: 'sel', 1: 'sel' }, { 0: ['r'], 1: ['*p'] }), g: t5graph(2, 9, 'y'), o: '2 9 2', tb: { type: 'table', label: 'What each line did', columns: ['line', 'reference r', 'pointer p'], rows: [['r = 5', 'wrote x', '-'], ['r = y', 'copied value into x', '-'], ['p = &y', '-', 're-aimed'], ['*p = 9', '-', 'wrote y']] } }
        ];
        return steps(T5_CODE, f);
      }
    },
    examples: [
      { title: 'Swap: reference version vs pointer version', html: `<p>Both work. The reference version is cleaner at the call site (<code>swapRef(i, j)</code>) and cannot be called with null. The pointer version makes modification visible at the call site (<code>swapPtr(&amp;i, &amp;j)</code>), which some codebases (e.g. Google's older style guide) preferred for exactly that reason.</p>`, code: { lang: 'cpp', code: `#include <iostream>
void swapRef(int& a, int& b) { int t = a; a = b; b = t; }      // a, b ARE the caller's ints
void swapPtr(int* a, int* b) { int t = *a; *a = *b; *b = t; }  // must dereference
int main() {
    int i = 1, j = 2;
    swapRef(i, j);  std::cout << i << j << '\\n';   // 21
    swapPtr(&i, &j); std::cout << i << j << '\\n';  // 12
}` } },
      { title: 'Predict the output: reference bound inside a loop', html: `<p>Each loop iteration creates a <b>new</b> reference <code>e</code> bound to the next element, so this is not "re-seating"; it is a fresh reference each time. Output: <b>2 4 6</b>. Remove the <code>&amp;</code> and the output is <b>1 2 3</b>.</p>${H.table(['iteration', 'e refers to', 'v after'], [['1', 'v[0]', '{2, 2, 3}'], ['2', 'v[1]', '{2, 4, 3}'], ['3', 'v[2]', '{2, 4, 6}']])}`, code: { lang: 'cpp', code: `#include <iostream>
#include <vector>
int main() {
    std::vector<int> v{1, 2, 3};
    for (int& e : v) e *= 2;                 // fresh reference per element
    for (int e : v) std::cout << e << ' ';   // 2 4 6
}` } },
      { title: 'Reference to a pointer: int*&amp;', html: `<p>Read right-to-left: <code>int*&amp; rp</code> is "a reference to a pointer to int". The function can re-aim the caller's pointer, just like <code>int**</code> but without the extra star. Handy for "advance this pointer past whitespace" helpers.</p>`, code: { lang: 'cpp', code: `#include <iostream>
void skipSpaces(const char*& s) {   // reference to the caller's pointer
    while (*s == ' ') ++s;          // moves the CALLER's pointer
}
int main() {
    const char* text = "   hello";
    skipSpaces(text);
    std::cout << text << '\\n';      // hello
}` } },
      { title: 'const reference extends a temporary\'s life', html: `<p><code>const std::string&amp; s = std::string("hi") + "!";</code> is safe: binding a temporary directly to a <code>const&amp;</code> local extends the temporary's life to the reference's scope. This only works for a <b>direct</b> binding; it does not work through a function that returns a reference (a classic dangling bug, see topic 8).</p>`, code: { lang: 'cpp', code: `#include <iostream>
#include <string>
int main() {
    const std::string& s = std::string("hi") + "!";   // temporary lives as long as s
    std::cout << s << '\\n';                           // hi!
}` } }
    ],
    deepDive: `<p><b>How references are implemented.</b> The standard deliberately does not say. In practice a reference parameter or member is passed/stored as an address (same machine code as a pointer), while a local reference to a local variable is usually optimized away entirely: the compiler just uses <code>x</code>. That is why "references are free" is mostly true, and why <code>sizeof</code> a struct with a reference member is typically pointer-sized for that member.</p>
<p><b>Reference members are awkward.</b> A class with a <code>T&amp;</code> member cannot be copy-assigned (references cannot be re-seated), so the compiler deletes <code>operator=</code>. Containers and algorithms that assign elements then fail to compile. Prefer a pointer member or <code>std::reference_wrapper&lt;T&gt;</code> (<code>std::ref</code>), which is a re-seatable, copyable reference.</p>
<p><b>Things that do not exist:</b> references to references (collapsed by templates), arrays of references, pointers to references, and null references. <code>int&amp; r = *static_cast&lt;int*&gt;(nullptr);</code> compiles but is UB at the moment of binding, so "null references" are always a symptom of an earlier bug.</p>
<p><b>Lifetime extension, precisely.</b> A prvalue temporary bound directly to a <code>const T&amp;</code> or <code>T&amp;&amp;</code> local gets its life extended. It does <b>not</b> extend through: function return values that are references, a reference <i>member</i> bound to a temporary in a constructor's initializer list (now ill-formed after defect report CWG 1696), or <code>std::min(a, b)</code>-style functions returning a reference to a parameter. GCC 13+ warns with <code>-Wdangling-reference</code>; Clang has <code>[[clang::lifetimebound]]</code>.</p>
<p><b>Preview of what comes later:</b> <code>T&amp;&amp;</code> rvalue references and forwarding references are a separate kind of reference used for move semantics (module cpp10). Everything in this topic is about lvalue references, <code>T&amp;</code>.</p>
<p><b>Performance rule of thumb:</b> pass cheap-to-copy types (≤ 2 pointers in size, trivially copyable: <code>int</code>, <code>double</code>, <code>string_view</code>, <code>span</code>) by value; pass everything else you only read by <code>const&amp;</code>. Passing an <code>int</code> by <code>const int&amp;</code> can be slower because it forces the value into memory.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate idiomatic parameter passing quickly (<code>const std::string&amp;</code>, <code>std::string_view</code>, <code>std::span</code>) and can audit a codebase for accidental copies in range-for loops. Linters such as <code>clang-tidy performance-for-range-copy</code> and <code>performance-unnecessary-value-param</code> do the same deterministically.</p>
<p><b>Use AI as a partner:</b> ask <code>For each parameter in these 10 functions, should it be by value, const&amp;, &amp;, or pointer? Justify each in one line.</code> Then challenge any choice you disagree with; the justification is what interviewers want to hear from you.</p>
<p><b>Where AI goes wrong:</b> it claims references "can be reassigned" (confusing assignment through the reference with re-binding), returns <code>const T&amp;</code> to locals or temporaries, and passes small types like <code>int</code> by <code>const&amp;</code> "for performance". It also may store references in classes without noticing that it deletes copy assignment.</p>
<p><b>What you must still own:</b> the crisp list of differences (null, re-seat, init, arithmetic, own address) and the parameter-passing decision table. These are among the most asked C++ fundamentals questions, and you should answer them in 30 seconds without help.</p>`,
    problems: [{
      title: 'Return a Reference to the Largest Element',
      level: 'Medium', tags: ['references', 'return by reference'], companies: ['Google', 'Bloomberg', 'Jane Street'],
      statement: `<p>Write <code>int&amp; maxRef(std::vector&lt;int&gt;&amp; v)</code> that returns a <b>reference</b> to the largest element (the first one if there are ties), so callers can modify it in place: <code>maxRef(v) = 0;</code> zeroes the maximum. If <code>v</code> is empty, throw <code>std::invalid_argument</code>. Then explain why <code>maxRef(std::vector&lt;int&gt;{1, 2})</code> must not compile.</p>`,
      constraints: `<p>0 ≤ v.size() ≤ 10<sup>6</sup>. One pass. No copies of the vector.</p>`,
      example: `<p>v = ${H.arr([3, 8, 1, 8], { hl: { 1: 'g' } })} → <code>maxRef(v) = 0;</code> → v = ${H.arr([3, 0, 1, 8], { hl: { 1: 'y' } })} (the <b>first</b> 8 changed, because the function returned a reference to that exact element).</p>`,
      brute: { why: `<p>Returning the max <b>by value</b> (<code>int</code>) gives the caller a copy: <code>maxValue(v) = 0</code> does not even compile, and the caller then has to search again for the position to modify it. Two passes and clumsy API.</p>`, code: { lang: 'cpp', code: `#include <vector>
#include <algorithm>
// Returns a COPY: caller cannot modify the element through it
int maxValue(const std::vector<int>& v) {
    return *std::max_element(v.begin(), v.end());   // (UB if v is empty!)
}
void zeroMaxBrute(std::vector<int>& v) {
    int m = maxValue(v);                                // pass 1
    for (int& x : v) if (x == m) { x = 0; break; }     // pass 2: find it again
}` } },
      mcq: { q: 'Why is it safe for <code>maxRef</code> to return <code>int&amp;</code>?', options: ['References are always safe to return', 'The element lives inside the caller\'s vector, which outlives the call', 'The compiler copies the element automatically', 'Because int is a small type'], answer: 1, explain: 'The reference points into storage owned by the caller. Returning a reference to a local variable would dangle; returning one into a parameter passed by non-const reference is fine (until the vector reallocates!).' },
      hints: [`<p>Track the <b>index</b> (or a pointer/iterator) of the best element, not just its value, so you can return a reference to that exact slot.</p>`, `<p>Taking the parameter as <code>std::vector&lt;int&gt;&amp;</code> (non-const lvalue reference) makes temporaries like <code>std::vector&lt;int&gt;{1,2}</code> fail to bind: a compile-time guard against returning a reference into a dying temporary.</p>`, `<p>Recipe: <code>if (v.empty()) throw std::invalid_argument("empty");</code> <code>size_t best = 0;</code> loop i from 1, update when <code>v[i] &gt; v[best]</code> (strict, so first tie wins), <code>return v[best];</code>.</p>`],
      solution: {
        approach: `<p>One scan tracking the index of the maximum; return <code>v[best]</code>, which is an <code>int&amp;</code> into the caller's vector. The non-const lvalue reference parameter rejects temporaries at compile time.</p>`,
        code: { lang: 'cpp', code: `#include <iostream>
#include <vector>
#include <stdexcept>

int& maxRef(std::vector<int>& v) {
    if (v.empty()) throw std::invalid_argument("maxRef: empty vector");
    std::size_t best = 0;
    for (std::size_t i = 1; i < v.size(); ++i)
        if (v[i] > v[best]) best = i;   // strict > keeps the FIRST maximum
    return v[best];                      // reference into the caller's storage
}

int main() {
    std::vector<int> v{3, 8, 1, 8};
    maxRef(v) = 0;                       // modify through the returned reference
    for (int x : v) std::cout << x << ' ';   // 3 0 1 8
    std::cout << '\\n';
    // maxRef(std::vector<int>{1, 2});  // does not compile: a temporary cannot bind to int-vector&
}` },
        dry: { head: ['i', 'v[i]', 'v[best] before', 'best after'], rows: [['init', '-', '-', '0 (value 3)'], ['1', '8', '3', '<span class="c-g">1</span>'], ['2', '1', '8', '1'], ['3', '8', '8 (not greater)', '1'], ['return', '-', '-', 'reference to v[1]; caller writes 0']] },
        complexity: `<p>Time O(N), extra space O(1).</p>`,
        followUps: ['What happens to a saved <code>int&amp; m = maxRef(v);</code> after <code>v.push_back(5)</code>?', 'Write a const overload <code>const int&amp; maxRef(const std::vector&lt;int&gt;&amp;)</code>; why would it accept temporaries and what is the risk?', 'Rewrite using <code>std::max_element</code> and explain its tie-breaking']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6: const and pointers
     ====================================================================== */
  topics.push({
    title: 'const Pointers vs Pointers to const',
    analogy: `<p>Imagine two kinds of visitor passes. A <b>"look but don't touch" badge</b> lets you walk into <i>any</i> museum room, but you may not move the paintings: that is a <b>pointer to const</b> (<code>const int* p</code>): you can re-aim it, but not change what it points at. A <b>GPS tracker locked to one address</b> always shows the same house, though the owner may renovate inside: that is a <b>const pointer</b> (<code>int* const p</code>): it can never be re-aimed, but the thing it points at can change. Put both rules together and you get a locked tracker on a museum: <code>const int* const p</code>, nothing moves.</p>`,
    explain: `<p>A pointer declaration involves <b>two</b> things that could be read-only: the <b>pointer itself</b> (can it be re-aimed?) and the <b>thing it points at</b> (can I change it through this pointer?). Where you write <code>const</code> decides which one is locked.</p>
<h4>1. The four combinations</h4>
${H.table(['declaration', 'read it right-to-left', '<code>p = &amp;y;</code> (re-aim)', '<code>*p = 5;</code> (modify target)'], [
  ['<code>int* p</code>', 'p is a pointer to int', '<span class="c-g">✔</span>', '<span class="c-g">✔</span>'],
  ['<code>const int* p</code><br><small>same as <code>int const* p</code></small>', 'p is a pointer to const int', '<span class="c-g">✔</span>', '<span class="c-r">✖</span>'],
  ['<code>int* const p</code>', 'p is a const pointer to int', '<span class="c-r">✖</span>', '<span class="c-g">✔</span>'],
  ['<code>const int* const p</code>', 'p is a const pointer to const int', '<span class="c-r">✖</span>', '<span class="c-r">✖</span>']
])}
<h4>2. The one trick: read right-to-left, starting at the name</h4>
<p>Start at the variable name and read <b>leftwards</b>; say "pointer to" for <code>*</code>, "reference to" for <code>&amp;</code>, and "const" for <code>const</code>.</p>
<p><code>const int * const p</code> → "<b>p</b> is a <b>const</b> <b>pointer to</b> <b>int</b> <b>const</b>" → p cannot move and the int cannot change through p.</p>
<p>Shortcut: <b>const to the LEFT of the <code>*</code></b> protects the <b>target</b>; <b>const to the RIGHT of the <code>*</code></b> protects the <b>pointer</b>. Whether you write <code>const int</code> ("west const") or <code>int const</code> ("east const") makes no difference; teams just pick a style.</p>
<h4>3. "Pointer to const" means "read-only <i>through this pointer</i>"</h4>
<p><code>const int* p = &amp;x;</code> does not make <code>x</code> constant. <code>x = 5;</code> still works; you just cannot write <code>*p = 5;</code>. Think of it as a <b>read-only view</b>. That is why it is the right type for function parameters that only read data: <code>size_t count(const int* a, size_t n)</code> promises the caller "I will not modify your array".</p>
<h4>4. Allowed conversions: you can add const, not remove it</h4>
${H.table(['from → to', 'allowed?', 'why'], [
  ['<code>int*</code> → <code>const int*</code>', '<span class="c-g">yes, implicit</span>', 'giving away less power is always safe'],
  ['<code>const int*</code> → <code>int*</code>', '<span class="c-r">no</span>', 'would let you modify something promised read-only'],
  ['<code>const int*</code> → <code>int*</code> via <code>const_cast</code>', 'compiles', 'writing through it is UB if the object was originally const'],
  ['<code>int**</code> → <code>const int**</code>', '<span class="c-r">no</span> (surprising!)', 'would open a hole to modify a const int; see deep dive']
])}
<h4>5. const references</h4>
<p><code>const T&amp;</code> is the reference version of "pointer to const": a read-only alias. There is no "const reference" in the other sense (<code>int&amp; const r</code> is an error), because references can never be re-seated anyway.</p>
<h4>6. const and string literals</h4>
<p>A string literal like <code>"hello"</code> has type <code>const char[6]</code>. So <code>const char* s = "hello";</code> is right and <code>char* s = "hello";</code> is an error in C++11 and later (it was only deprecated in C++03). Writing into a literal is UB because literals often live in read-only memory.</p>`,
    clues: [
      '"Difference between <code>const int*</code>, <code>int const*</code> and <code>int* const</code>" → read right-to-left; const left of * protects the target',
      '"The function must not modify the array" → parameter <code>const T*</code> or <code>const T&amp;</code> / <code>std::span&lt;const T&gt;</code>',
      '"Why can\'t I pass <code>int**</code> where <code>const int**</code> is expected?" → const-correctness hole; use <code>const int* const*</code>',
      '"Error: assignment of read-only location" → you wrote through a pointer-to-const',
      '"Is <code>const_cast</code> safe?" → only if the original object was not declared const',
      '"<code>char* s = \"text\";</code> compiles in C but not C++" → literals are <code>const char[N]</code>'
    ],
    code: [{ lang: 'cpp', title: 'All four combinations (errors shown as comments)', code: `#include <iostream>
using namespace std;

int main() {
    int x = 1, y = 2;

    int* p1 = &x;              // pointer to int
    p1 = &y;  *p1 = 5;         // both allowed

    const int* p2 = &x;        // pointer to const int (read-only VIEW of x)
    p2 = &y;                   // OK: may re-aim
    // *p2 = 5;                // error: assignment of read-only location '*p2'
    x = 7;                     // x itself is NOT const: still allowed directly

    int* const p3 = &x;        // const pointer to int
    *p3 = 9;                   // OK: may modify the target
    // p3 = &y;                // error: assignment of read-only variable 'p3'

    const int* const p4 = &x;  // const pointer to const int
    // p4 = &y; *p4 = 1;       // both errors
    cout << *p2 << ' ' << *p3 << ' ' << *p4 << '\\n';   // 5 9 9

    const int* view = p1;      // int* -> const int* : adding const is implicit
    // int* back = view;       // error: removing const needs a cast
    (void)view;
}` }, { lang: 'cpp', title: 'const-correct function parameters', code: `#include <cstddef>
// Promise: reads the array, never writes it
std::size_t countValue(const int* a, std::size_t n, int target) {
    std::size_t c = 0;
    for (const int* p = a; p != a + n; ++p)
        if (*p == target) ++c;
    return c;
}
// Promise: writes the array, pointer 'a' itself never re-aimed inside
void fill(int* const a, std::size_t n, int value) {
    for (std::size_t i = 0; i < n; ++i) a[i] = value;
}` }],
    codeTitle: ['The four combinations', 'Using const in parameters'],
    viz: [{
      title: 'Read any declaration right-to-left',
      input: 'const int * const p',
      inputLabel: 'Declaration (e.g. int const * p, char * const * q, const int & r)',
      gen: function (input) {
        var raw = String(input === undefined ? 'const int * const p' : input).trim() || 'const int * const p';
        var toks = raw.replace(/;$/, '').match(/[A-Za-z_]\w*|\*|&|\S/g) || [];
        var TYPES = ['int', 'char', 'double', 'float', 'long', 'short', 'bool', 'unsigned', 'auto', 'string', 'T', 'void'];
        var hint = 'Use only const, a type (int, char, double, ...), *, & and a name, e.g. "const int * const p"';
        if (toks.length < 2 || toks.length > 10) throw new Error(hint);
        toks.forEach(function (t) { if (!(t === 'const' || t === '*' || t === '&' || /^[A-Za-z_]\w*$/.test(t))) throw new Error(hint); });
        var name = toks[toks.length - 1];
        if (name === 'const' || name === '*' || name === '&' || TYPES.indexOf(name) >= 0) throw new Error('The declaration must end with a variable name, e.g. "int * const p"');
        var firstDecl = -1, i;
        for (i = 0; i < toks.length - 1; i++) if (toks[i] === '*' || toks[i] === '&') { firstDecl = i; break; }
        var baseEnd = firstDecl < 0 ? toks.length - 1 : firstDecl;
        var base = toks.slice(0, baseEnd), baseConst = base.indexOf('const') >= 0;
        var baseType = base.filter(function (t) { return t !== 'const'; });
        if (!baseType.length || baseType.some(function (t) { return TYPES.indexOf(t) < 0; })) throw new Error('Start with a known type (int, char, double, long, bool, auto, string, T), optionally with const');
        if (base.filter(function (t) { return t === 'const'; }).length > 1) throw new Error('Only one const is allowed on the base type');
        var levels = [], isRef = false;
        for (i = baseEnd; i < toks.length - 1; i++) {
          var t = toks[i];
          if (t === '*') { if (isRef) throw new Error('A pointer to a reference does not exist in C++'); levels.push({ c: false }); }
          else if (t === '&') { if (isRef) throw new Error('A reference to a reference does not exist'); isRef = true; }
          else if (t === 'const') { if (isRef) throw new Error('"& const" is an error: references can never be re-seated anyway'); if (!levels.length) throw new Error(hint); if (levels[levels.length - 1].c) throw new Error('duplicate const'); levels[levels.length - 1].c = true; }
          else throw new Error(hint);
        }
        var cells = toks.slice(), frames = [], words = [];
        function arrPart(cur, done) {
          var hl = {}; done.forEach(function (k) { hl[k] = 'done'; }); if (cur !== null) hl[cur] = 'cur';
          var p = {}; if (cur !== null) p[cur] = ['reading'];
          return { type: 'array', label: 'Tokens (read from the name, leftwards)', values: cells, hl: hl, ptr: p };
        }
        frames.push({ narr: 'Split the declaration into tokens. Rule: <b>start at the variable name</b> and read <b>right-to-left</b>. Say "pointer to" for *, "reference to" for &amp;, "const" for const.', parts: [arrPart(null, []), { type: 'code', lang: 'cpp', code: raw + (raw.slice(-1) === ';' ? '' : ';') }] });
        var done = [];
        for (i = toks.length - 1; i >= 0; i--) {
          var tk = toks[i], w;
          if (i === toks.length - 1) w = name + ' is';
          else if (tk === '*') w = 'pointer to';
          else if (tk === '&') w = 'reference to';
          else if (tk === 'const') w = 'const';
          else w = tk;
          words.push(w);
          var expl = i === toks.length - 1 ? 'The name: <b>' + esc(name) + '</b>. Everything else describes it.'
            : tk === '*' ? 'A <b>*</b>: "pointer to". Any const just to the RIGHT of this * (already read) locks <i>this</i> pointer.'
            : tk === '&' ? 'An <b>&amp;</b>: "reference to". References are always bound for life.'
            : tk === 'const' ? (i < baseEnd ? 'A <b>const</b> on the base type: the final pointed-at value is read-only through this name.' : 'A <b>const</b> right after a *: that <b>pointer</b> cannot be re-aimed.')
            : 'The base type <b>' + esc(tk) + '</b>: what lives at the end of the chain.';
          frames.push({ narr: expl, parts: [arrPart(i, done.slice()), { type: 'vars', label: 'Reading so far', vals: { 'english': words.join(' ') } }] });
          done.push(i);
        }
        var desc = (baseConst ? 'const ' : '') + baseType.join(' ');
        levels.forEach(function (l) { desc = (l.c ? 'const ' : '') + 'pointer to ' + desc; });
        if (isRef) desc = 'reference to ' + desc;
        var sentence = name + ' is a ' + desc;
        var rows = [], hlr = {}, n = levels.length;
        if (isRef) rows.push(['re-bind ' + name + ' to another object', '✖ never (references cannot be re-seated)']);
        else if (n) rows.push([name + ' = other address', levels[n - 1].c ? '✖ (const pointer)' : '✔']);
        else rows.push([name + ' = other value', baseConst ? '✖ (const)' : '✔']);
        if (isRef) {
          var refTargetConst = n ? levels[n - 1].c : baseConst;
          rows.push([name + ' = new value (writes the referred object)', refTargetConst ? '✖ (refers to const)' : '✔']);
        }
        for (var k = 1; k <= n; k++) {
          var idx = n - 1 - k, lockd = idx >= 0 ? levels[idx].c : baseConst;
          rows.push([new Array(k + 1).join('*') + name + ' = ...', lockd ? '✖ (' + (idx >= 0 ? 'const pointer' : 'const ' + baseType.join(' ')) + ')' : '✔']);
        }
        rows.forEach(function (r, j) { hlr[j] = r[1].charAt(0) === '✔' ? 'ok' : 'bad'; });
        frames.push({ narr: 'Result: <b>' + esc(sentence) + '</b>. The table shows what this name lets you do.', parts: [arrPart(null, done.slice()), { type: 'vars', label: 'Plain English', vals: { 'meaning': sentence } }, { type: 'table', label: 'Permissions through ' + esc(name), columns: ['operation', 'allowed?'], rows: rows, hl: hlr }] });
        frames.push({ narr: 'Compare with the four classic forms. Rule of thumb: <b>const left of * → target locked; const right of * → pointer locked.</b> Try other inputs, e.g. <code>char * const * q</code> or <code>const int &amp; r</code>.', parts: [{ type: 'table', label: 'const placement cheat sheet', columns: ['declaration', 'p = &y', '*p = 5'], rows: [['int* p', '✔', '✔'], ['const int* p  /  int const* p', '✔', '✖'], ['int* const p', '✖', '✔'], ['const int* const p', '✖', '✖']], hl: { 0: 'ok', 3: 'bad' } }] });
        return frames;
      }
    }, {
      title: 'Try every operation on every combination',
      gen: function () {
        var code = 'int x = 1, y = 2;\nint*             p1 = &x;\nconst int*       p2 = &x;\nint* const       p3 = &x;\nconst int* const p4 = &x;';
        var rows = [['p1  int*', '?', '?'], ['p2  const int*', '?', '?'], ['p3  int* const', '?', '?'], ['p4  const int* const', '?', '?']];
        var res = [['✔ re-aimed', '✔ x = 5'], ['✔ re-aimed', '✖ read-only target'], ['✖ const pointer', '✔ x = 5'], ['✖ const pointer', '✖ read-only target']];
        var f = [{ narr: 'Four pointers, all aimed at x. We will try two operations on each: <b>re-aim</b> (<code>p = &amp;y</code>) and <b>write through</b> (<code>*p = 5</code>).', parts: [{ type: 'code', lang: 'cpp', code: code }, mem({ cells: [['0x100', '1', 'x'], ['0x104', '2', 'y']], p: { 0: ['p1 p2 p3 p4'] } }), { type: 'table', label: 'const placement table', columns: ['pointer', 'p = &y', '*p = 5'], rows: rows.map(function (r) { return r.slice(); }) }] }];
        for (var i = 0; i < 4; i++) {
          rows[i][1] = res[i][0]; rows[i][2] = res[i][1];
          var why = ['No const anywhere: full power.', 'const is LEFT of *: the int is read-only through p2, but p2 itself may move.', 'const is RIGHT of *: p3 is glued to x, but x may be changed through it.', 'const on both sides: a read-only view that never moves.'][i];
          f.push({ narr: '<b>' + ['p1', 'p2', 'p3', 'p4'][i] + '</b>: ' + why, parts: [{ type: 'code', lang: 'cpp', code: code, hl: one(i + 2, 'cur') }, { type: 'table', label: 'const placement table', columns: ['pointer', 'p = &y', '*p = 5'], rows: rows.map(function (r) { return r.slice(); }), hl: one(i, 'cur') }] });
        }
        f.push({ narr: 'Memorize the table shape: the diagonal of ✖ moves as const moves across the *. Compiler errors you will see: <i>"assignment of read-only location"</i> (target locked) vs <i>"assignment of read-only variable"</i> (pointer locked).', parts: [{ type: 'table', label: 'const placement table', columns: ['pointer', 'p = &y', '*p = 5'], rows: rows.map(function (r) { return r.slice(); }), hl: { 0: 'ok', 3: 'bad' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Predict: which lines compile?', html: `<p>Given <code>int a = 1, b = 2; const int* p = &amp;a; int* const q = &amp;a;</code></p>${H.table(['line', 'compiles?', 'reason'], [['<code>p = &amp;b;</code>', '<span class="c-g">yes</span>', 'p is not const itself'], ['<code>*p = 3;</code>', '<span class="c-r">no</span>', 'target is read-only through p'], ['<code>*q = 3;</code>', '<span class="c-g">yes</span>', 'q points to non-const int'], ['<code>q = &amp;b;</code>', '<span class="c-r">no</span>', 'q is a const pointer'], ['<code>a = 4;</code>', '<span class="c-g">yes</span>', 'a itself is not const'], ['<code>int* r = p;</code>', '<span class="c-r">no</span>', 'cannot drop const implicitly']])}` },
      { title: 'const_cast: legal to compile, UB to misuse', html: `<p><code>const_cast</code> removes const from a pointer. Writing through the result is fine if the object was <b>originally non-const</b>, and undefined behaviour if it was declared <code>const</code> (it may live in read-only memory, or the compiler may have folded its value into the code).</p>`, code: { lang: 'cpp', code: `#include <iostream>
int main() {
    int a = 1;
    const int* view = &a;
    *const_cast<int*>(view) = 2;     // OK: a was never const
    std::cout << a << '\\n';           // 2

    const int c = 1;
    int* bad = const_cast<int*>(&c);
    // *bad = 2;                       // UB: c is a real const object (often prints 1 anyway)
    (void)bad;
}` } },
      { title: 'Why int** does not convert to const int**', html: `<p>If it were allowed, this would modify a const int without any cast:</p>${H.table(['step', 'code', 'effect'], [['1', '<code>const int ci = 1; int* p;</code>', ''], ['2', '<code>const int** pp = &amp;p;</code>', '(pretend it compiled)'], ['3', '<code>*pp = &amp;ci;</code>', 'legal: stores a const int* in p (via pp)'], ['4', '<code>*p = 99;</code>', '<span class="c-r">modifies ci!</span>']])}<p>The safe conversion is <code>int**</code> → <code>const int* const*</code>, because then step 3 is forbidden.</p>`, code: { lang: 'cpp', code: `int main() {
    int x = 1;
    int* p = &x;
    int** pp = &p;
    // const int** bad = pp;          // error: invalid conversion
    const int* const* ok = pp;        // fine: the middle pointer is locked too
    return **ok - 1;                  // 0
}` } },
      { title: 'Bug hunt: modifying a string literal', html: `<p>This compiles in old C but is an error in C++11+: <code>char* s = "hello"; s[0] = 'J';</code>. Even when forced through with a cast, writing into a literal is UB and typically crashes because literals sit in a read-only section (<code>.rodata</code>). Fix: copy into a writable array or <code>std::string</code>.</p>`, code: { lang: 'cpp', code: `#include <iostream>
#include <string>
int main() {
    // char* s = "hello";         // error in C++11+: literal is const char[6]
    const char* lit = "hello";    // OK: read-only view of the literal
    char buf[] = "hello";         // writable COPY on the stack
    buf[0] = 'J';
    std::string str = lit;        // or a std::string copy
    str[0] = 'C';
    std::cout << buf << ' ' << str << '\\n';   // Jello Cello
}` } }
    ],
    deepDive: `<p><b>Top-level vs low-level const.</b> In <code>const int* const p</code>, the right-hand const (on p itself) is <b>top-level</b>; the left one (on the int) is <b>low-level</b>. Top-level const is dropped when copying: <code>auto q = p;</code> gives <code>const int*</code>, and top-level const on a by-value parameter is not part of the function signature (<code>void f(int)</code> and <code>void f(const int)</code> are the same function). Low-level const is always kept, because dropping it would be unsafe.</p>
<p><b>const is a promise about access, not about the object.</b> The optimizer generally cannot assume <code>*p</code> stays the same just because <code>p</code> is <code>const int*</code>: another non-const pointer may modify the same int (aliasing). So const pointers rarely make code faster; they make it <b>safer and self-documenting</b>. Objects that are actually declared <code>const</code> (or <code>constexpr</code>) are different: the compiler can fold their values and place them in read-only memory.</p>
<p><b>const member functions</b> (module cpp04 preview): in <code>int size() const;</code>, the hidden <code>this</code> has type <code>const T*</code>, so the function cannot modify members. Calling it on a <code>const T&amp;</code> parameter is only possible because of that const. <code>mutable</code> members (caches, mutexes) are the escape hatch.</p>
<p><b>Spans and views.</b> The modern equivalent of <code>const T* data, size_t n</code> is <code>std::span&lt;const T&gt;</code>; of <code>const char*</code> for reading text it is <code>std::string_view</code>. Note that <code>const std::span&lt;T&gt;</code> is a const <i>view object</i> (top-level) whose elements are still writable; you want <code>std::span&lt;const T&gt;</code>.</p>
<p><b>The clockwise/spiral rule</b> generalizes right-to-left reading for function pointers and arrays: <code>const char* (*fp)(int)</code> → "fp is a pointer to a function taking int returning pointer to const char". In real code, tame such declarations with <code>using</code> aliases.</p>
<p><b>East const vs west const.</b> <code>int const* p</code> (east) reads uniformly right-to-left; <code>const int* p</code> (west) is more common in codebases and in the standard library documentation. Both mean exactly the same thing. Be consistent within a file.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are good at adding const-correctness to an existing API: marking read-only parameters <code>const T&amp;</code>/<code>const T*</code>, adding <code>const</code> to member functions, converting to <code>std::span&lt;const T&gt;</code>. That used to be a tedious, compile-error-driven chore; now it is a review task.</p>
<p><b>Use AI as a partner:</b> ask <code>Translate these declarations into plain English and tell me what each allows: ...</code>, but also test yourself first using the right-to-left visualizer above. For a codebase, ask the assistant to propose const additions and let the compiler verify each one.</p>
<p><b>Where AI goes wrong:</b> it uses <code>const_cast</code> to silence errors instead of fixing the design, writes <code>const std::span&lt;int&gt;</code> believing elements are protected, and sometimes claims <code>const int*</code> means "constant pointer". It also may suggest that const enables big optimizations, which is mostly untrue for pointers.</p>
<p><b>What you must still own:</b> instant right-to-left reading and the conversion rules (add const freely, never remove it implicitly, <code>int**</code> → <code>const int**</code> is rejected). Interviewers frequently put four declarations on a whiteboard and ask which lines compile.</p>`,
    problems: [{
      title: 'Const-Correct Find (with a Non-const Overload)',
      level: 'Medium', tags: ['const', 'pointers', 'API design'], companies: ['Microsoft', 'Apple', 'Citadel'],
      statement: `<p>Write <code>const int* findFirst(const int* first, const int* last, int target)</code> returning a pointer to the first element equal to <code>target</code> in <code>[first, last)</code>, or <code>last</code> if none. Then provide <code>int* findFirst(int* first, int* last, int target)</code> so callers with a writable array get a writable result, <b>without duplicating the loop</b>.</p>`,
      constraints: `<p>0 ≤ last − first ≤ 10<sup>6</sup>. No <code>[]</code> needed; O(1) extra space.</p>`,
      example: `<p>a = ${H.arr([5, 7, 9, 7], { hl: { 1: 'g' } })}, target 7 → pointer to ${H.c('g', 'a[1]')}. With a writable array the caller can do <code>*findFirst(a, a + 4, 7) = 0;</code> → ${H.arr([5, 0, 9, 7], { hl: { 1: 'y' } })}. Target 4 → returns <code>a + 4</code> (the end pointer, meaning "not found").</p>`,
      brute: { why: `<p>Copy-paste the loop into two functions (one const, one non-const). It works, but now two copies must be kept in sync forever; a fix in one is easily forgotten in the other.</p>`, code: { lang: 'cpp', code: `const int* findFirstC(const int* first, const int* last, int target) {
    for (; first != last; ++first) if (*first == target) return first;
    return last;
}
int* findFirstM(int* first, int* last, int target) {      // duplicated logic
    for (; first != last; ++first) if (*first == target) return first;
    return last;
}` } },
      mcq: { q: 'Inside the non-const overload, which is the safe way to reuse the const version?', options: ['Call it and <code>const_cast</code> the result back to <code>int*</code>', 'Use <code>reinterpret_cast</code>', 'Change the const version to take <code>int*</code>', 'It is impossible without duplication'], answer: 0, explain: 'The non-const overload received non-const pointers, so the array is known to be writable; casting away const on the result is well-defined. This is the standard "implement non-const via const" idiom.' },
      hints: [`<p>Write the loop once in the <code>const</code> version: it can accept both const and non-const arrays (int* converts to const int* automatically).</p>`, `<p>In the non-const overload, call the const version, then <code>const_cast&lt;int*&gt;</code> the result. Safe, because the original objects are non-const (the caller gave you <code>int*</code>).</p>`, `<p>Recipe: <code>const int* r = findFirst(static_cast&lt;const int*&gt;(first), static_cast&lt;const int*&gt;(last), target); return const_cast&lt;int*&gt;(r);</code>. The <code>static_cast</code>s pick the const overload explicitly and avoid infinite recursion.</p>`],
      solution: {
        approach: `<p>Single implementation with read-only access, plus a thin non-const wrapper that restores mutability only where it is provably legal. Same pattern as <code>std::vector::operator[]</code> const/non-const pairs and <code>strchr</code> in C.</p>`,
        code: { lang: 'cpp', code: `#include <iostream>

// The one real implementation: read-only access is enough to search
const int* findFirst(const int* first, const int* last, int target) {
    for (; first != last; ++first)       // 'first' is a local copy: re-aiming it is fine
        if (*first == target) return first;
    return last;                          // "not found" = end pointer
}

// Writable arrays get a writable result, reusing the const version
int* findFirst(int* first, int* last, int target) {
    const int* r = findFirst(static_cast<const int*>(first),
                             static_cast<const int*>(last), target);   // calls the const overload
    return const_cast<int*>(r);           // safe: the elements were never const
}

int main() {
    int a[] = {5, 7, 9, 7};
    int* hit = findFirst(a, a + 4, 7);
    if (hit != a + 4) *hit = 0;           // modify through the result
    for (int x : a) std::cout << x << ' ';   // 5 0 9 7
    std::cout << '\\n';

    const int ro[] = {1, 2, 3};
    const int* h2 = findFirst(ro, ro + 3, 3);   // const array: const result, cannot modify
    std::cout << (h2 - ro) << '\\n';             // 2
}` },
        dry: { head: ['first points at', '*first', '== 7?', 'action'], rows: [['a[0]', '5', 'no', '++first'], ['a[1]', '7', '<span class="c-g">yes</span>', 'return pointer to a[1]'], ['wrapper', '-', '-', 'const_cast to int*, caller writes 0']] },
        complexity: `<p>Time O(N), space O(1).</p>`,
        followUps: ['How does <code>std::find</code> avoid this problem? (templates deduce constness from the iterator type)', 'Why is <code>const_cast</code> UB-free here but not in general?', 'Rewrite with <code>std::span&lt;const int&gt;</code> returning an index']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7: Arrays decaying to pointers
     ====================================================================== */
  var T7_CODE = [
    'void f(int arr[]) {        // really: int* arr',
    '    cout << sizeof(arr);   // 8: size of a POINTER',
    '}',
    'int main() {',
    '    int a[5] = {1, 2, 3, 4, 5};',
    '    cout << sizeof(a);     // 20: the whole array',
    '    f(a);                  // a decays to &a[0]',
    '    int* p = a;            // decays again',
    '    auto q = &a;           // NO decay: int(*)[5]',
    '    // p + 1 -> 0x204,  q + 1 -> 0x214',
    '}'
  ].join('\n');

  topics.push({
    title: 'Arrays Decaying to Pointers',
    analogy: `<p>You own a <b>train with 5 carriages</b>. When you hand it to a friend (pass it to a function), C++ does not ship the whole train. It hands over a <b>note with the address of the first carriage</b>. Your friend can walk from carriage to carriage, but the note does not say <b>how many carriages</b> there are. Ask them "how long is the train?" and they can only tell you how big the note is. That shrinking from "a train" to "a note about the first carriage" is called <b>array decay</b>.</p>`,
    explain: `<p>A C-style array like <code>int a[5]</code> is a real object: 5 ints side by side, 20 bytes, with the size baked into its type <code>int[5]</code>. But in almost every expression, the array <b>automatically converts</b> into a pointer to its first element: <code>int*</code> holding <code>&amp;a[0]</code>. This is <b>array-to-pointer decay</b>, inherited from C.</p>
<h4>1. Where decay happens</h4>
${H.table(['code', 'what you get'], [
  ['<code>int* p = a;</code>', 'p = <code>&amp;a[0]</code>'],
  ['<code>f(a)</code>', 'f receives an <code>int*</code>'],
  ['<code>a + 2</code>', '<code>&amp;a[2]</code> (pointer arithmetic)'],
  ['<code>a[2]</code>', '<code>*(a + 2)</code>: decay, then arithmetic'],
  ['<code>auto b = a;</code>', '<code>b</code> is <code>int*</code>, not a copy of the array']
])}
<h4>2. Where decay does NOT happen (the exceptions)</h4>
${H.table(['code', 'result', 'type'], [
  ['<code>sizeof(a)</code>', '20 (whole array)', '-'],
  ['<code>&amp;a</code>', 'address of the whole array', '<code>int (*)[5]</code>'],
  ['<code>int (&amp;r)[5] = a;</code>', 'reference to the whole array', '<code>int (&amp;)[5]</code>'],
  ['<code>decltype(a)</code>', 'the array type', '<code>int[5]</code>'],
  ['<code>auto&amp; r = a;</code>', 'reference to array, size kept', '<code>int (&amp;)[5]</code>']
])}
<h4>3. The function parameter lie</h4>
<p>These three signatures are <b>identical</b>; the compiler rewrites the first two into the third:</p>
<pre>void f(int arr[5]);   // the 5 is ignored!
void f(int arr[]);
void f(int* arr);</pre>
<p>So inside <code>f</code>, <code>sizeof(arr)</code> is 8 (a pointer), not 20. The classic bug: <code>int n = sizeof(arr) / sizeof(arr[0]);</code> inside a function gives <b>2</b> on a 64-bit machine, no matter how big the array is. GCC even warns: <i>"sizeof on array function parameter will return size of 'int*'"</i>.</p>
<h4>4. <code>a</code> vs <code>&amp;a</code>: same address, different types</h4>
${H.arr(['1', '2', '3', '4', '5', '...'], { label: 'int a[5] @0x200', ptr: { 0: 'a, &a', 1: 'a+1', 5: '&a+1' }, hl: { 1: 'b', 5: 'y' } })}
<p>Both print 0x200. But <code>a + 1</code> steps one <code>int</code> (0x204), while <code>&amp;a + 1</code> steps one <b>whole array</b> of 5 ints (0x214). The type decides the step.</p>
<h4>5. How to pass arrays properly</h4>
${H.table(['approach', 'size known?', 'notes'], [
  ['<code>f(int* a, size_t n)</code>', 'you pass it', 'classic C, easy to get n wrong'],
  ['<code>template&lt;size_t N&gt; f(int (&amp;a)[N])</code>', '<span class="c-g">yes, N deduced</span>', 'no decay; one instantiation per size'],
  ['<code>f(std::span&lt;const int&gt; s)</code> (C++20)', '<span class="c-g">yes, s.size()</span>', 'accepts C arrays, std::array, vector'],
  ['<code>std::array&lt;int, 5&gt;</code>', '<span class="c-g">yes</span>', 'never decays, copyable, has .size()'],
  ['<code>std::vector&lt;int&gt;</code>', '<span class="c-g">yes</span>', 'dynamic size']
])}
<p>For the size of an array <b>in the scope where it is declared</b>, use <code>std::size(a)</code> (C++17): it refuses to compile on a pointer, so the decay bug cannot happen silently.</p>
<h4>6. Multi-dimensional arrays</h4>
<p><code>int m[3][4]</code> is an array of 3 arrays of 4 ints. It decays to a pointer to its first row: <code>int (*)[4]</code>, "pointer to array of 4 ints". So a function taking it must spell the inner size: <code>void g(int (*m)[4], int rows)</code> or <code>void g(int m[][4], int rows)</code>. Only the outermost dimension decays.</p>`,
    clues: [
      '"Why does <code>sizeof(arr)/sizeof(arr[0])</code> give 2 inside my function?" → the parameter decayed to a pointer',
      '"What is the difference between <code>a</code> and <code>&amp;a</code>?" → same address, types <code>int*</code> vs <code>int(*)[N]</code>, different arithmetic step',
      '"Pass a 2D array to a function" → <code>int (*m)[COLS]</code> / <code>int m[][COLS]</code>, or a flat vector with row*cols+col',
      '"Function must know the array length" → pass size, template <code>T(&amp;)[N]</code>, <code>std::span</code>, or <code>std::array</code>',
      '"Can you assign or return a C array?" → no; arrays are not copyable by <code>=</code>, use <code>std::array</code>',
      '"<code>char s[] = \"hi\"</code> vs <code>const char* s = \"hi\"</code>" → writable array copy vs pointer to read-only literal'
    ],
    code: [{ lang: 'cpp', title: 'Decay, its exceptions and the safe alternatives', code: `#include <iostream>
#include <span>
#include <array>
#include <iterator>
using namespace std;

void byPointer(int arr[], size_t n) {           // 'int arr[]' is really 'int* arr'
    cout << "sizeof(arr) = " << sizeof(arr) << '\\n';   // 8 on 64-bit: a pointer
    for (size_t i = 0; i < n; ++i) cout << arr[i] << ' ';
    cout << '\\n';
}

template <size_t N>
void byArrayRef(const int (&arr)[N]) {           // reference to array: NO decay, N deduced
    cout << "N = " << N << ", sizeof = " << sizeof(arr) << '\\n';   // N = 5, sizeof = 20
}

void bySpan(span<const int> s) {                 // C++20: pointer + size in one object
    cout << "span size = " << s.size() << '\\n';
}

int main() {
    int a[5] = {1, 2, 3, 4, 5};
    cout << sizeof(a) << ' ' << size(a) << '\\n';   // 20 5   (no decay with sizeof / std::size)
    byPointer(a, size(a));                          // decays to &a[0]
    byArrayRef(a);
    bySpan(a);                                      // span built from the array, size kept

    int* p = a;                  // decay
    int (*q)[5] = &a;            // pointer to the WHOLE array
    cout << (p + 1) << ' ' << (q + 1) << '\\n';     // differ by 4 bytes vs 20 bytes from a

    array<int, 5> sa{1, 2, 3, 4, 5};                // std::array never decays
    auto copy = sa;                                 // and it can be copied
    cout << copy.size() << '\\n';                    // 5
}` }],
    codeTitle: ['Decay vs no decay'],
    viz: {
      title: 'What actually crosses into the function?',
      gen: function () {
        function A(hl, p) { var c = []; for (var i = 0; i < 5; i++) c.push([hex(0x200 + 4 * i), i + 1, 'a[' + i + ']']); c.push(['0x214', '…', '(after a)']); return { label: 'main() stack frame: int a[5] (20 bytes)', cells: c, hl: hl || {}, p: p || {} }; }
        function F(v, hl) { return { label: 'f() stack frame: parameter arr (8 bytes)', cells: [['0x1f0', v, 'arr']], hl: hl || {} }; }
        var f = [
          { l: 5, n: '<code>int a[5]</code> is one object: 5 ints, 20 bytes, starting at 0x200. Its type <code>int[5]</code> carries the length.', m: A({ 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' }) },
          { l: 6, n: '<code>sizeof(a)</code> is one of the <b>exceptions</b>: no decay happens, so it reports the whole array: <b>20</b>.', m: A({ 0: 'win', 1: 'win', 2: 'win', 3: 'win', 4: 'win' }), v: { 'sizeof(a)': 20, 'std::size(a)': 5 }, o: '20' },
          { l: 7, n: '<code>f(a)</code>: the array <b>decays</b> to <code>&amp;a[0]</code>. Only that <b>8-byte address</b> is copied into f\'s parameter. The 20 bytes of data stay in main.', m: A({ 0: 'cur' }, { 0: ['arr points here'] }), m2: F('0x200', { 0: 'ok' }), v: { 'arr': '0x200', 'length info': 'LOST' }, vh: { 'length info': 'bad' } },
          { l: 2, n: 'Inside f, <code>sizeof(arr)</code> is the size of <code>int*</code>: <b>8</b>. f has no idea there are 5 elements. <code>sizeof(arr)/sizeof(arr[0])</code> would give 8/4 = <b>2</b>. Wrong!', m: A({ 0: 'cur' }, { 0: ['arr'] }), m2: F('0x200', { 0: 'bad' }), v: { 'sizeof(arr)': 8, 'sizeof(arr)/sizeof(arr[0])': '2 (bug!)' }, vh: { 'sizeof(arr)/sizeof(arr[0])': 'bad' }, o: '20\n8' },
          { l: 8, n: 'Back in main: <code>int* p = a;</code> decays again. p holds 0x200 and steps <b>one int</b> at a time: <code>p + 1</code> = 0x204.', m: A({ 0: 'cur', 1: 'win' }, { 0: ['p'], 1: ['p+1'] }), v: { 'p': '0x200', 'p + 1': '0x204' } },
          { l: 9, n: '<code>auto q = &amp;a;</code> is an <b>exception</b>: no decay. q has type <code>int (*)[5]</code>, "pointer to an array of 5 ints". Same address 0x200, but <code>q + 1</code> jumps a <b>whole array</b>: 0x200 + 20 = <b>0x214</b>.', m: A({ 0: 'sel', 5: 'bad' }, { 0: ['q'], 5: ['q+1'] }), v: { 'q': '0x200', 'q + 1': '0x214', '*q': 'the array a (int[5])' }, vh: { 'q + 1': 'bad' } },
          { l: 1, n: 'Fixes for f: take <code>std::span&lt;const int&gt;</code> (pointer + size travel together), a template <code>int (&amp;arr)[N]</code>, or use <code>std::array</code>/<code>std::vector</code>, which never decay.', m: A({}), m2: { label: 'f(std::span&lt;const int&gt; s) frame: 16 bytes', cells: [['0x1f0', '0x200', 's.data()'], ['0x1f8', '5', 's.size()']], hl: { 0: 'ok', 1: 'ok' } }, tb: { type: 'table', label: 'How each parameter style sees a', columns: ['parameter', 'what is copied', 'size known?'], rows: [['int arr[] / int* arr', '8-byte address', 'no'], ['int (&arr)[N] (template)', 'nothing (alias)', 'yes, N'], ['std::span<const int>', 'address + length', 'yes'], ['std::array<int,5> (by value)', 'all 20 bytes', 'yes']], hl: { 0: 'bad', 1: 'ok', 2: 'ok' } } }
        ];
        return steps(T7_CODE, f);
      }
    },
    examples: [
      { title: 'Bug hunt: average of an array inside a function', html: `<p>The function below computes the length with <code>sizeof</code> on a decayed parameter, so it only averages the first 2 elements (on 64-bit). For {10, 20, 30, 40} it returns 15 instead of 25. Fix: pass the size, or take a <code>std::span</code>.</p>${H.table(['version', 'n computed', 'result'], [['buggy', '8 / 4 = 2', '<span class="c-r">15</span>'], ['span', 's.size() = 4', '<span class="c-g">25</span>']])}`, code: { lang: 'cpp', code: `#include <span>
#include <numeric>
double averageBuggy(int arr[]) {
    int n = sizeof(arr) / sizeof(arr[0]);   // BUG: sizeof(int*) / sizeof(int) == 2
    double s = 0;
    for (int i = 0; i < n; ++i) s += arr[i];
    return s / n;
}
double averageFixed(std::span<const int> s) {
    if (s.empty()) return 0.0;
    return std::accumulate(s.begin(), s.end(), 0.0) / s.size();   // size travels with the data
}` } },
      { title: 'Predict: a, &amp;a, *a, &amp;a[0]', html: `<p>For <code>int a[3]</code> at 0x500:</p>${H.table(['expression', 'type', 'value'], [['<code>a</code> (decayed)', '<code>int*</code>', '0x500'], ['<code>&amp;a[0]</code>', '<code>int*</code>', '0x500'], ['<code>&amp;a</code>', '<code>int (*)[3]</code>', '0x500'], ['<code>*a</code>', '<code>int</code>', 'a[0]'], ['<code>a + 1</code>', '<code>int*</code>', '0x504'], ['<code>&amp;a + 1</code>', '<code>int (*)[3]</code>', '0x50c']])}<p>Cute trick: <code>*(&amp;a + 1) - a</code> equals 3, the length, because <code>*(&amp;a+1)</code> is "the array right after a" decayed to an <code>int*</code> at 0x50c.</p>`, code: { lang: 'cpp', code: `#include <iostream>
int main() {
    int a[3] = {4, 5, 6};
    std::cout << (*(&a + 1) - a) << '\\n';                       // 3: element count via whole-array step
    std::cout << ((char*)(&a + 1) - (char*)(a + 1)) << '\\n';    // 8: 12-byte jump vs 4-byte jump
}` } },
      { title: 'Arrays cannot be assigned or returned, std::array can', html: `<p><code>int b[3] = a;</code> and <code>b = a;</code> do not compile, and a function cannot return <code>int[3]</code>. These rules exist because the array would decay first. <code>std::array</code> wraps the C array in a struct, so it copies, compares and returns like any value.</p>`, code: { lang: 'cpp', code: `#include <array>
#include <iostream>
std::array<int, 3> makeTriple(int x) { return {x, x * 2, x * 3}; }   // returning an array: fine
int main() {
    int a[3] = {1, 2, 3};
    // int b[3] = a;            // error: array must be initialized with a brace-enclosed initializer
    auto t = makeTriple(5);
    auto u = t;                 // full copy
    std::cout << (t == u) << ' ' << u[2] << '\\n';   // 1 15
    (void)a;
}` } },
      { title: 'String literals and char arrays', html: `<p><code>char s[] = "hi";</code> creates a <b>3-byte writable array</b> (h, i, \\0) and <code>sizeof(s)</code> is 3. <code>const char* t = "hi";</code> creates a <b>pointer</b> to a read-only literal and <code>sizeof(t)</code> is 8. Passing <code>s</code> to <code>strlen</code> decays it to <code>char*</code>, which is why C strings need the terminating <code>\\0</code>: the length is not carried along.</p>`, code: { lang: 'cpp', code: `#include <iostream>
#include <cstring>
int main() {
    char s[] = "hi";            // array copy: {'h','i','\\0'}
    const char* t = "hi";       // pointer to a read-only literal
    std::cout << sizeof(s) << ' ' << sizeof(t) << ' ' << std::strlen(s) << '\\n';   // 3 8 2
}` } }
    ],
    deepDive: `<p><b>Why decay exists.</b> C inherited it from B and BCPL, where an array variable literally was a pointer. Dennis Ritchie kept the syntax but made arrays real objects that convert to pointers on use, so old code kept working. C++ kept it for C compatibility. The cost is the most common family of C/C++ bugs: buffer overflows, because the length is separated from the data.</p>
<p><b>Arrays are not pointers.</b> The classic proof: declare <code>extern int* a;</code> in one file while another file defines <code>int a[10];</code>. It links (names match) but the first file reads the array's first 8 bytes <i>as an address</i> and crashes. Also <code>sizeof</code>, <code>&amp;</code>, and assignment behave differently, as shown above.</p>
<p><b>Spelling array types.</b> <code>int* a[5]</code> = array of 5 pointers. <code>int (*a)[5]</code> = pointer to an array of 5 ints. <code>int (&amp;r)[5]</code> = reference to an array of 5 ints. Use aliases to stay sane: <code>using Row = int[4]; Row* m;</code>.</p>
<p><b>Variable-length arrays</b> (<code>int a[n]</code> with runtime n) are C99, not standard C++. GCC/Clang accept them as an extension; MSVC does not. Use <code>std::vector</code>. They are also a stack-overflow risk for large n.</p>
<p><b>std::span internals.</b> A <code>std::span&lt;T&gt;</code> is just a pointer plus a size (16 bytes), or only a pointer for fixed extent <code>std::span&lt;T, 5&gt;</code>. It is a non-owning view: if the underlying array dies, the span dangles just like a pointer. <code>operator[]</code> is unchecked by default; C++26 adds <code>.at()</code>, and hardened standard library modes (libstdc++ <code>_GLIBCXX_ASSERTIONS</code>, libc++ hardening, the C++26 "hardened implementation" feature) turn out-of-bounds indexing into a trap instead of UB.</p>
<p><b>Industry context.</b> Decay-driven buffer overflows motivated Microsoft's SAL annotations, the <code>-Warray-bounds</code>/<code>-Wsizeof-array-argument</code> warnings, and the C++ Core Guidelines rule "never pass an array as a single pointer" (I.13). In 2026, memory-safety pressure from government guidance (CISA/NSA roadmaps) is pushing teams toward <code>std::span</code>, bounds-checked access and hardened builds by default.</p>`,
    aiEra: `<p><b>What AI changes:</b> migrating <code>(T* ptr, size_t n)</code> pairs to <code>std::span</code> across a codebase used to be weeks of grunt work; AI assistants plus <code>clang-tidy</code> now draft it quickly, and the compiler verifies most call sites automatically.</p>
<p><b>Use AI as a partner:</b> ask <code>Find every place in this file where an array's size is computed with sizeof on something that may be a pointer</code>, or <code>Convert this API to std::span and list call sites that need changes</code>. Review each change: spans are non-owning, so check lifetimes.</p>
<p><b>Where AI goes wrong:</b> it happily writes <code>sizeof(arr)/sizeof(arr[0])</code> inside functions, declares 2D parameters as <code>int**</code> (which is <b>not</b> compatible with <code>int[3][4]</code>), and sometimes returns a <code>std::span</code> into a local vector (dangling).</p>
<p><b>What you must still own:</b> the decay rule and its exceptions (sizeof, &amp;, reference binding, decltype), the <code>a</code> vs <code>&amp;a</code> distinction, and the habit of keeping size and data together. These come up in both C++ trivia rounds and real code reviews.</p>`,
    problems: [{
      title: 'Row Sums of a 2D Array',
      level: 'Medium', tags: ['arrays', 'decay', '2D arrays'], companies: ['Qualcomm', 'Arista', 'Nvidia'],
      statement: `<p>Write <code>void rowSums(const int (*m)[4], int rows, long long* out)</code> that writes the sum of each row of a <code>rows × 4</code> C array into <code>out[0..rows-1]</code>. Then explain why the parameter cannot simply be <code>const int** m</code>, and give a template version that deduces both dimensions.</p>`,
      constraints: `<p>1 ≤ rows ≤ 10<sup>4</sup>, column count fixed at 4 for the non-template version. Values fit in <code>int</code>; sums use <code>long long</code>.</p>`,
      example: `<p><code>int m[3][4] = {{1,2,3,4},{5,6,7,8},{9,10,11,12}};</code></p>${H.table(['row', 'values', 'sum'], [['0', '1 2 3 4', '<span class="c-g">10</span>'], ['1', '5 6 7 8', '<span class="c-g">26</span>'], ['2', '9 10 11 12', '<span class="c-g">42</span>']])}<p><code>m</code> decays to <code>int (*)[4]</code>: a pointer to the first row. <code>m + 1</code> jumps 16 bytes to the next row.</p>`,
      brute: { why: `<p>Flatten into a <code>std::vector&lt;int&gt;</code> first and index with <code>r*4 + c</code>. Works, but copies the whole matrix (O(R·C) extra memory) and dodges the real question of how 2D arrays are passed.</p>`, code: { lang: 'cpp', code: `#include <vector>
void rowSumsBrute(const int (*m)[4], int rows, long long* out) {
    std::vector<int> flat;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < 4; ++c) flat.push_back(m[r][c]);   // full copy
    for (int r = 0; r < rows; ++r) {
        long long s = 0;
        for (int c = 0; c < 4; ++c) s += flat[r * 4 + c];
        out[r] = s;
    }
}` } },
      mcq: { q: 'What does <code>int m[3][4]</code> decay to when passed to a function?', options: ['<code>int**</code>', '<code>int (*)[4]</code>: pointer to an array of 4 ints', '<code>int*</code>', '<code>int (*)[3][4]</code>'], answer: 1, explain: 'Only the outer dimension decays: m becomes a pointer to its first element, and its first element is a row of type int[4]. An int** would expect an array of pointers, which this is not.' },
      hints: [`<p><code>m[r]</code> is row r (an <code>int[4]</code>), and <code>m[r][c]</code> is <code>*(*(m + r) + c)</code>. Pointer arithmetic on <code>m</code> moves by whole rows.</p>`, `<p><code>int**</code> means "pointer to a pointer"; following it would read the first 8 bytes of the matrix as an address. The real layout is 12 contiguous ints, no pointers stored anywhere.</p>`, `<p>Recipe: for each <code>r</code>, accumulate <code>m[r][c]</code> for c in 0..3 into a <code>long long</code> and store <code>out[r]</code>. Template version: <code>template&lt;size_t R, size_t C&gt; array&lt;long long, R&gt; rowSums(const int (&amp;m)[R][C])</code>.</p>`],
      solution: {
        approach: `<p>Iterate rows through the decayed row pointer and sum each row. The template version takes the matrix by reference, so no decay happens and both dimensions are known at compile time.</p>`,
        code: { lang: 'cpp', code: `#include <array>
#include <cstddef>
#include <iostream>

void rowSums(const int (*m)[4], int rows, long long* out) {
    for (int r = 0; r < rows; ++r) {
        const int* row = m[r];               // row r: an int[4] that decays to const int*
        long long s = 0;
        for (const int* p = row; p != row + 4; ++p) s += *p;
        out[r] = s;
    }
}

// No decay at all: both dimensions deduced from the type
template <std::size_t R, std::size_t C>
std::array<long long, R> rowSumsT(const int (&m)[R][C]) {
    std::array<long long, R> out{};
    for (std::size_t r = 0; r < R; ++r)
        for (std::size_t c = 0; c < C; ++c) out[r] += m[r][c];
    return out;
}

int main() {
    int m[3][4] = {{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}};
    long long out[3];
    rowSums(m, 3, out);                       // m decays to int(*)[4]
    for (long long s : out) std::cout << s << ' ';   // 10 26 42
    std::cout << '\\n';
    for (long long s : rowSumsT(m)) std::cout << s << ' ';   // 10 26 42
    std::cout << '\\n';
}` },
        dry: { head: ['r', 'm + r (address)', 'row values', 'out[r]'], rows: [['0', '0x300', '1 2 3 4', '10'], ['1', '0x310 (+16 bytes)', '5 6 7 8', '26'], ['2', '0x320 (+16 bytes)', '9 10 11 12', '42']] },
        complexity: `<p>Time O(R·C), extra space O(1) beyond the output.</p>`,
        followUps: ['How would you accept any column count at runtime? (flat buffer + width, or <code>std::mdspan</code> in C++23)', 'Column sums: why is iterating column-first slower on big matrices? (cache lines, module cpp12)', 'Why does <code>int** </code> work for <code>new int*[R]</code> jagged arrays but not for <code>int[R][C]</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8: Dangling pointers and references
     ====================================================================== */
  var T8A_CODE = [
    'int* makeNumber() {',
    '    int local = 42;',
    '    return &local;        // address of a dying local!',
    '}',
    'int other() { int junk = 999; return junk; }',
    'int main() {',
    '    int* p = makeNumber(); // p -> dead stack slot',
    '    other();               // reuses the same slot',
    '    cout << *p;            // UB: often prints 999',
    '}'
  ].join('\n');
  var T8B_CODE = [
    'vector<int> v = {1, 2, 3};   // size 3, capacity 3',
    'int* p = &v[0];              // pointer into the buffer',
    'int& r = v[1];               // reference into the buffer',
    'v.push_back(4);              // full! new buffer, copy, free old',
    'cout << *p << r;             // UB: both dangle',
    'p = &v[0];                   // fix: re-take after growth',
    '// or v.reserve(...) first, or keep INDICES'
  ].join('\n');

  topics.push({
    title: 'Dangling Pointers &amp; References: Bug Hunts',
    analogy: `<p>You stay in <b>hotel room 204</b> and keep the room number written down after you check out. The number still looks perfectly valid. Go back later and the door may open... onto <b>someone else's luggage</b>. Maybe the room is empty and everything <i>seems</i> fine; maybe security throws you out (crash). A <b>dangling pointer</b> is that old room number: an address that was valid once, but the object that lived there is gone, and the space may already belong to someone else.</p>`,
    explain: `<p>A pointer or reference <b>dangles</b> when the object it refers to has <b>ended its lifetime</b>, but the pointer still holds the old address. Using it (reading, writing, calling a method, even deleting again) is <b>undefined behaviour</b>. The scary part: it often appears to work, because the old bytes are still there until something reuses the memory.</p>
<h4>1. The five classic ways to create one</h4>
${H.table(['#', 'cause', 'tiny example', 'why it dangles'], [
  ['1', 'return address/reference of a local', '<code>int* f(){ int x; return &amp;x; }</code>', 'locals die when the function returns'],
  ['2', 'use after <code>delete</code>/<code>free</code>', '<code>delete p; *p = 1;</code>', 'heap block handed back to the allocator'],
  ['3', 'container reallocation / erase', '<code>int* p = &amp;v[0]; v.push_back(x);</code>', 'vector moved its elements to a new buffer'],
  ['4', 'view of a temporary', '<code>string_view s = string("hi") + "!";</code>', 'the temporary string dies at the semicolon'],
  ['5', 'out-of-scope block / captured reference', '<code>int* p; { int y; p = &amp;y; } *p;</code>', 'y died at the closing brace']
])}
<h4>2. Why "it works on my machine"</h4>
<p>When a function returns, its stack frame is not wiped; the bytes just become "free to reuse". Reading them right away often still shows the old value. The next function call reuses the same stack slots and overwrites them. Similarly, freed heap memory keeps its old contents until the allocator hands it out again. So dangling bugs depend on timing, optimization level and unrelated code changes: the worst kind of bug.</p>
<h4>3. Vector reallocation, in detail</h4>
<p>A <code>std::vector</code> keeps its elements in one heap buffer with some spare <b>capacity</b>. When <code>push_back</code> needs more room than the capacity, it allocates a bigger buffer (typically 1.5× or 2×), moves elements over, and <b>frees the old buffer</b>. Every pointer, reference and iterator into the old buffer now dangles. <code>insert</code>, <code>emplace_back</code>, <code>resize</code>, <code>reserve</code> and <code>shrink_to_fit</code> can do the same; <code>erase</code> invalidates everything from the erased point onward.</p>
<h4>4. How to avoid dangling (habits)</h4>
<ul>
<li><b>Return by value</b>, not a pointer/reference to a local. Copy elision makes this free for most types.</li>
<li><b>Own heap objects with smart pointers</b> (<code>std::unique_ptr</code>, <code>std::shared_ptr</code>; module cpp06) instead of raw <code>new</code>/<code>delete</code>.</li>
<li><b>Store indices</b> instead of pointers into a growing vector, or <code>reserve()</code> the final size before taking pointers.</li>
<li><b>Views (<code>string_view</code>, <code>span</code>) must never outlive their owner.</b> Do not store them in members unless lifetime is guaranteed.</li>
<li><b>Lambdas</b> that run later (threads, callbacks) should capture by value, not <code>[&amp;]</code>.</li>
<li>After <code>delete p;</code>, set <code>p = nullptr;</code>, knowing it only protects that one copy.</li>
</ul>
<h4>5. How to catch them (tools)</h4>
${H.table(['tool', 'how', 'catches'], [
  ['compiler warnings', '<code>-Wall -Wextra</code> (<code>-Wreturn-local-addr</code>, <code>-Wdangling-pointer</code>, GCC 13+ <code>-Wdangling-reference</code>)', 'obvious returns of locals, some temporaries'],
  ['AddressSanitizer', '<code>g++ -g -fsanitize=address</code>', 'heap-use-after-free, stack-use-after-return*, use-after-scope'],
  ['Valgrind memcheck', '<code>valgrind ./a.out</code>', 'invalid reads/writes on the heap (slower, no recompile)'],
  ['static analysis / lifetime checks', 'clang-tidy, Clang <code>[[clang::lifetimebound]]</code>, MSVC lifetime profile', 'some dangling views and references at compile time'],
  ['hardened STL', '<code>-D_GLIBCXX_ASSERTIONS</code>, libc++ hardening modes', 'out-of-bounds and some invalid-iterator use']
])}
<p><small>* stack-use-after-return needs <code>ASAN_OPTIONS=detect_stack_use_after_return=1</code> on GCC; Clang enables it by default in recent versions.</small></p>`,
    clues: [
      '"Works in debug, crashes in release" / "prints garbage sometimes" → suspect dangling pointer or other UB',
      '"Return a pointer/reference from a function" → ask: does the object outlive the call?',
      '"Store pointers to elements, then keep adding elements" → vector reallocation invalidates them; use indices or <code>reserve</code>',
      '"heap-use-after-free" / "stack-use-after-return" in an ASan report → dangling pointer, read the allocation and free stacks it prints',
      '"Returning <code>std::string_view</code> or <code>std::span</code>" → check the owner\'s lifetime, especially temporaries',
      '"Callback / thread captures <code>[&amp;]</code>" → captured locals may be gone when it runs'
    ],
    code: [{ lang: 'cpp', title: 'Five dangling bugs and their fixes', code: `#include <iostream>
#include <string>
#include <string_view>
#include <vector>
#include <memory>
using namespace std;

// 1. Returning the address of a local
// int* bad1() { int x = 5; return &x; }            // warning: address of local variable returned
int good1() { int x = 5; return x; }                 // FIX: return by value

// 4. A view of a temporary
// string_view bad4() { return string("temp"); }    // the string dies at the end of the return
string good4() { return string("temp"); }            // FIX: return the owning string

int main() {
    // 2. Use after delete
    int* h = new int(7);
    delete h;
    // cout << *h;                                   // heap-use-after-free
    h = nullptr;                                     // at least make it detectable
    auto owned = make_unique<int>(7);                // FIX: let an owner manage lifetime
    cout << *owned << '\\n';                          // 7

    // 3. Vector reallocation
    vector<int> v{1, 2, 3};
    size_t idx = 0;                                  // FIX: remember the INDEX...
    // int* p = &v[0];                               // ...not a pointer that push_back may invalidate
    v.push_back(4);
    cout << v[idx] << '\\n';                          // 1, always valid

    // 5. Pointer to a variable from an ended scope
    int* q = nullptr;
    {
        int y = 9;
        q = &y;
        cout << *q << '\\n';                          // fine here: y is alive
    }
    // cout << *q;                                   // y is dead: UB
    q = nullptr;

    cout << good1() << ' ' << good4() << '\\n';       // 5 temp
}` }],
    codeTitle: ['Bug catalogue with fixes'],
    viz: [{
      title: 'Returning the address of a local: the stack slot gets reused',
      gen: function () {
        function S(slot, owner, pv, hl, p) {
          return { label: 'Stack memory (slot 0x1f0 is reused by every call)', cells: [['0x1f0', slot, owner], ['0x200', pv, 'main: p']], hl: hl || {}, p: p || {} };
        }
        var f = [
          { l: 7, n: 'main calls <code>makeNumber()</code>. A new <b>stack frame</b> is pushed; its local <code>local</code> gets the slot at 0x1f0.', m: S('??', 'makeNumber: local', '??', { 0: 'cur' }), g: { type: 'stack', label: 'Call stack', items: ['main()', 'makeNumber()'], hl: { 1: 'cur' } } },
          { l: 2, n: '<code>int local = 42;</code> writes 42 into slot 0x1f0. Perfectly fine so far.', m: S('42', 'makeNumber: local', '??', { 0: 'ok' }), g: { type: 'stack', label: 'Call stack', items: ['main()', 'makeNumber()'], hl: { 1: 'cur' } } },
          { l: 3, n: '<code>return &amp;local;</code> hands back 0x1f0. GCC warns: <i>"function returns address of local variable"</i>. The moment the function returns, <code>local</code> <b>stops existing</b>.', m: S('42', 'makeNumber: local', '??', { 0: 'cur' }), g: { type: 'stack', label: 'Call stack', items: ['main()', 'makeNumber()'], hl: { 1: 'bad' } }, v: { 'returned': '0x1f0' } },
          { l: 7, n: 'Back in main, <code>p = 0x1f0</code>. The frame is popped but the bytes are not erased: the slot still shows 42, now <b>owned by nobody</b>. p is dangling, and reading <code>*p</code> right now might "work". That is the trap.', m: S('42 (dead)', '(free)', '0x1f0', { 0: 'done', 1: 'bad' }, { 0: ['*p ?'] }), g: { type: 'stack', label: 'Call stack', items: ['main()'], hl: { 0: 'cur' } }, v: { 'p': '0x1f0', 'object at p': 'none (lifetime ended)' }, vh: { 'object at p': 'bad' } },
          { l: 8, n: 'main calls <code>other()</code>. Its frame lands in the <b>same place</b>, and <code>junk = 999</code> is written into slot 0x1f0.', m: S('999', 'other: junk', '0x1f0', { 0: 'cur', 1: 'bad' }, { 0: ['*p'] }), g: { type: 'stack', label: 'Call stack', items: ['main()', 'other()'], hl: { 1: 'cur' } } },
          { l: 9, n: '<code>cout &lt;&lt; *p;</code> reads 0x1f0 and typically prints <b>999</b> (or anything else: it is UB, and optimizers may even replace the read). ASan with use-after-return detection reports <i>stack-use-after-return</i>.', m: S('999', '(free)', '0x1f0', { 0: 'bad', 1: 'bad' }, { 0: ['*p 💥'] }), g: { type: 'stack', label: 'Call stack', items: ['main()'], hl: { 0: 'cur' } }, o: '999   <- not 42!' },
          { l: 1, n: '<b>Fix:</b> return by value: <code>int makeNumber() { int local = 42; return local; }</code>. The value is copied out before the frame disappears, and nothing points into dead memory.', m: S('-', '(free)', '42 (a copy)', { 1: 'ok' }), g: { type: 'stack', label: 'Call stack', items: ['main()'], hl: { 0: 'ok' } }, o: '42' }
        ];
        return steps(T8A_CODE, f, { codeLabel: 'Buggy program' });
      }
    }, {
      title: 'push_back reallocation: pointers into the old buffer dangle',
      gen: function () {
        function OLD(vals, hl, p, dead) { return { label: 'Heap: OLD buffer (capacity 3)' + (dead ? ': FREED' : ''), cells: [['0x500', vals[0], 'v[0]'], ['0x504', vals[1], 'v[1]'], ['0x508', vals[2], 'v[2]']], hl: hl || {}, p: p || {} }; }
        function NEW(vals, hl, p) { var c = []; for (var i = 0; i < 6; i++) c.push([hex(0x700 + 4 * i), vals[i] === undefined ? '-' : vals[i], i < 4 ? 'v[' + i + ']' : '']); return { label: 'Heap: NEW buffer (capacity 6)', cells: c, hl: hl || {}, p: p || {} }; }
        var f = [
          { l: 1, n: '<code>vector&lt;int&gt; v = {1, 2, 3};</code> The vector object holds a pointer to a heap buffer at 0x500 with size 3 and capacity 3: <b>no spare room</b>.', m: OLD([1, 2, 3], { 0: 'ok', 1: 'ok', 2: 'ok' }), v: { 'v.data()': '0x500', 'size': 3, 'capacity': 3 } },
          { l: 2, n: '<code>int* p = &amp;v[0];</code> p holds 0x500.', m: OLD([1, 2, 3], { 0: 'cur' }, { 0: ['p'] }), v: { 'p': '0x500', 'v.data()': '0x500' } },
          { l: 3, n: '<code>int&amp; r = v[1];</code> r is bound to the element at 0x504.', m: OLD([1, 2, 3], { 1: 'cur' }, { 0: ['p'], 1: ['r'] }), v: { 'p': '0x500', '&r': '0x504' } },
          { l: 4, n: '<code>v.push_back(4);</code> size would be 4 but capacity is 3, so the vector allocates a <b>new, bigger buffer</b> at 0x700 (libstdc++ doubles: capacity 6) and copies/moves 1, 2, 3 across...', m: OLD([1, 2, 3], { 0: 'win', 1: 'win', 2: 'win' }, { 0: ['p'], 1: ['r'] }), m2: NEW([1, 2, 3], { 0: 'ok', 1: 'ok', 2: 'ok' }), v: { 'v.data()': '0x700 (moved!)' }, vh: { 'v.data()': 'cur' } },
          { l: 4, n: '...writes 4 into the new buffer, then <b>frees the old buffer</b>. p and r still hold 0x500 and 0x504: memory that no longer belongs to the vector.', m: OLD(['?', '?', '?'], { 0: 'bad', 1: 'bad', 2: 'bad' }, { 0: ['p (dangling)'], 1: ['r (dangling)'] }, true), m2: NEW([1, 2, 3, 4], { 3: 'ok' }), v: { 'p': '0x500', 'v.data()': '0x700', 'size': 4, 'capacity': 6 }, vh: { 'p': 'bad' } },
          { l: 5, n: '<code>cout &lt;&lt; *p &lt;&lt; r;</code> reads freed memory: <b>heap-use-after-free</b>. It may print 1 and 2 (stale bytes), garbage, or crash. AddressSanitizer stops the program here with the exact line.', m: OLD(['?', '?', '?'], { 0: 'bad', 1: 'bad' }, { 0: ['*p 💥'], 1: ['r 💥'] }, true), m2: NEW([1, 2, 3, 4]), o: 'ERROR: AddressSanitizer: heap-use-after-free on address 0x500' },
          { l: 6, n: '<b>Fix 1:</b> re-take the pointer after the container changes: <code>p = &amp;v[0];</code> → 0x700.', m2: NEW([1, 2, 3, 4], { 0: 'ok' }, { 0: ['p'] }), v: { 'p': '0x700', '*p': 1 }, vh: { 'p': 'ok' } },
          { l: 7, n: '<b>Fix 2:</b> <code>v.reserve(n)</code> before taking pointers, if you know the final size (no reallocation until capacity is exceeded). <b>Fix 3 (most robust):</b> store <b>indices</b>; <code>v[i]</code> is valid wherever the buffer moves.', m2: NEW([1, 2, 3, 4], { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' }), tb: { type: 'table', label: 'Does it survive push_back with reallocation?', columns: ['what you saved', 'still valid?'], rows: [['int* p = &v[i]', 'no'], ['int& r = v[i]', 'no'], ['iterator it = v.begin() + i', 'no'], ['size_t i (index)', 'yes'], ['std::list / std::deque element pointer', 'yes (node-based / push at ends)']], hl: { 0: 'bad', 1: 'bad', 2: 'bad', 3: 'ok', 4: 'ok' } } }
        ];
        return steps(T8B_CODE, f, { codeLabel: 'Buggy program' });
      }
    }],
    examples: [
      { title: 'Bug hunt: string_view of a temporary', html: `<p><code>std::string_view sv = getName() + "!";</code> where <code>getName()</code> returns a <code>std::string</code>. The concatenation creates a temporary <code>std::string</code>, <code>sv</code> points into its buffer, and the temporary is destroyed at the <b>end of the statement</b>. Printing <code>sv</code> on the next line reads freed memory. Fix: <code>std::string s = getName() + "!";</code> (own the data).</p>`, code: { lang: 'cpp', code: `#include <iostream>
#include <string>
#include <string_view>
std::string getName() { return "Ada"; }
int main() {
    // std::string_view sv = getName() + "!";   // BUG: view of a temporary that dies at ';'
    std::string s = getName() + "!";            // FIX: own the characters
    std::string_view sv = s;                    // a view is fine while s is alive
    std::cout << sv << '\\n';                    // Ada!
}` } },
      { title: 'Bug hunt: lambda capturing a local by reference', html: `<p>A callback stored for later captures <code>count</code> by reference. When it runs, <code>setup()</code> has already returned and <code>count</code> is gone. Fix: capture by value <code>[count]</code> or move state into the lambda <code>[c = count]() mutable</code>.</p>`, code: { lang: 'cpp', code: `#include <functional>
#include <iostream>
std::function<int()> setup() {
    int count = 3;
    // return [&]() { return count; };   // BUG: count dies when setup() returns
    return [count]() { return count; };   // FIX: the lambda keeps its own copy
}
int main() {
    auto cb = setup();
    std::cout << cb() << '\\n';           // 3
}` } },
      { title: 'Predict: double delete and delete-then-use', html: `${H.table(['code', 'outcome'], [['<code>int* p = new int(1); delete p; delete p;</code>', '<span class="c-r">UB: double free</span>, glibc usually aborts: "free(): double free detected"'], ['<code>delete p; p = nullptr; delete p;</code>', '<span class="c-g">fine</span>: deleting nullptr is a no-op'], ['<code>int* q = p; delete p; p = nullptr; *q = 2;</code>', '<span class="c-r">UB: use-after-free</span> via the alias q']])}<p>The root problem is <b>unclear ownership</b>: two raw pointers, nobody sure who deletes. <code>std::unique_ptr</code> makes exactly one owner and deletes once, automatically.</p>` },
      { title: 'Bug hunt: erase inside a range-for', html: `<p>Erasing from a vector while range-for iterating invalidates the hidden iterator: UB, often skipped elements or a crash. Fix: the erase-remove idiom (or C++20 <code>std::erase_if</code>).</p>`, code: { lang: 'cpp', code: `#include <vector>
#include <iostream>
int main() {
    std::vector<int> v{1, 2, 3, 4, 6};
    // for (int x : v) if (x % 2 == 0) v.erase(std::find(v.begin(), v.end(), x));   // BUG: invalidates the loop iterator
    std::erase_if(v, [](int x) { return x % 2 == 0; });   // FIX (C++20): one safe pass
    for (int x : v) std::cout << x << ' ';                 // 1 3
}` } }
    ],
    deepDive: `<p><b>Lifetime is the real concept.</b> C++ objects have a lifetime that begins when construction finishes and ends when destruction starts (or storage is released). Pointers do not track lifetime; they just hold numbers. Automatic objects (locals) end at the closing brace, temporaries at the end of the full expression (unless extended by a direct <code>const&amp;</code>/<code>&amp;&amp;</code> binding), heap objects at <code>delete</code>, container elements whenever the container reallocates or erases.</p>
<p><b>How AddressSanitizer catches them.</b> ASan maps every 8 bytes of memory to 1 "shadow" byte describing whether they are addressable. Freed heap blocks are poisoned and placed in a <b>quarantine</b> so they are not reused immediately, which turns "maybe works" into a guaranteed report showing three stack traces: the bad access, the free, and the original allocation. Cost: roughly 2× slowdown and 2-3× memory, fine for tests and CI. For stack-use-after-return, ASan moves locals to a fake heap-allocated stack.</p>
<p><b>Security impact.</b> Use-after-free is one of the most exploited bug classes in browsers and kernels: an attacker arranges for their own data to be allocated into the freed slot, so the dangling pointer reads attacker-controlled memory (for example a fake vtable pointer). Google and Microsoft have reported for years that around 70% of their serious security bugs are memory-safety issues. Mitigations include MiraclePtr/BackupRefPtr in Chromium, hardened allocators (Scudo, PartitionAlloc), and ARM Memory Tagging Extension (MTE) shipping on recent Android phones, which tags pointers and memory so a stale pointer's tag no longer matches.</p>
<p><b>The language is responding.</b> Ongoing work includes compiler lifetime analysis (<code>-Wdangling-reference</code>, <code>[[clang::lifetimebound]]</code>), the C++26 hardened standard library and erroneous-behaviour rules for uninitialized reads, and "profiles" proposals for opt-in safety guarantees. None of these catches everything; ownership discipline (RAII, smart pointers, value semantics) remains the primary defence.</p>
<p><b>Iterator invalidation cheat sheet (preview of cpp07):</b> vector/string: insert/push_back invalidate all if reallocating, else from the insertion point; erase invalidates from the erased point. deque: inserting at either end invalidates iterators but not references. list/set/map: only the erased element's iterators/pointers are invalidated. unordered_map: rehash invalidates iterators but not references or pointers to elements.</p>`,
    aiEra: `<p><b>What AI changes:</b> paste an ASan report and an assistant will usually pinpoint the dangling access, the free site and a fix in seconds. AI review bots now flag "pointer into vector across push_back" and "string_view returned from temporary" patterns in pull requests.</p>
<p><b>Use AI as a partner:</b> ask <code>For every pointer, reference, iterator, string_view and span in this function, state which object it refers to and whether that object is guaranteed alive at each use</code>. That lifetime table is the exact reasoning a reviewer does. Then confirm with tests under <code>-fsanitize=address,undefined</code> in CI.</p>
<p><b>Where AI goes wrong:</b> generated code frequently returns <code>std::string_view</code>/<code>std::span</code> into locals, captures <code>[&amp;]</code> in callbacks that outlive the scope, keeps pointers across <code>push_back</code>, and "fixes" crashes by adding null checks that do nothing for dangling (non-null!) pointers. Its explanations of UB sometimes claim deterministic outcomes ("this prints 42"), which is false.</p>
<p><b>What you must still own:</b> lifetime reasoning. For each pointer, know its owner and when that owner dies. Interviewers love dangling-pointer bug hunts precisely because they test this reasoning, and production incidents caused by AI-generated lifetime bugs are reviewed by humans who must understand them.</p>`,
    problems: [{
      title: 'Remember the Longest Name (Without Dangling)',
      level: 'Medium', tags: ['dangling pointer', 'vector reallocation', 'bug hunt'], companies: ['Google', 'Meta', 'Bloomberg'],
      statement: `<p>Names arrive one by one. Append each to a <code>std::vector&lt;std::string&gt; names</code>, and at the end return the longest name (first one on ties). A colleague wrote it by keeping a <code>const std::string*</code> to the current longest element. It passes small tests but crashes in production. Explain the bug and fix it while still doing the work in one pass.</p>`,
      constraints: `<p>1 ≤ number of names ≤ 10<sup>5</sup>, each length ≤ 100. One pass, no re-scan of the vector.</p>`,
      example: `<p>Input: ${H.chips(['ann', 'bartholomew', 'cy', 'dorothea'])} → output ${H.c('g', '"bartholomew"')}. With the buggy version, the pointer to "bartholomew" is taken when the vector has capacity 2; the third <code>push_back</code> reallocates, and the pointer now refers to <span class="c-r">freed memory</span>.</p>`,
      brute: { why: `<p>The buggy approach: keep a pointer to the longest element while appending. Every <code>push_back</code> that exceeds capacity moves all strings to a new buffer and frees the old one, so the saved pointer dangles. Reading <code>longest-&gt;size()</code> is a heap-use-after-free that small inputs may not reveal.</p>`, code: { lang: 'cpp', code: `#include <string>
#include <vector>
// BUGGY: pointer into a vector that keeps growing
std::string longestBuggy(const std::vector<std::string>& input) {
    std::vector<std::string> names;
    const std::string* longest = nullptr;
    for (const auto& s : input) {
        names.push_back(s);                                   // may reallocate: 'longest' dangles
        if (!longest || s.size() > longest->size())           // use-after-free read here
            longest = &names.back();
    }
    return longest ? *longest : std::string{};
}` } },
      mcq: { q: 'Which change makes the one-pass version safe <b>regardless of how many names arrive</b>?', options: ['Check <code>longest != nullptr</code> before using it', 'Store the <b>index</b> of the longest name instead of a pointer', 'Use <code>names.shrink_to_fit()</code> after each push', 'Make <code>longest</code> a <code>const</code> pointer'], answer: 1, explain: 'An index stays meaningful after reallocation; <code>names[best]</code> always reaches the element in the current buffer. A dangling pointer is not null, so a null check does nothing. <code>reserve(input.size())</code> would also work here because the final size is known.' },
      hints: [`<p>Ask "what can invalidate a pointer into a vector?" Any growth past capacity moves every element.</p>`, `<p>Indices survive reallocation. Track <code>size_t best</code>, and compare against <code>names[best].size()</code>.</p>`, `<p>Recipe: <code>names.push_back(s); if (names.size() == 1 || s.size() &gt; names[best].size()) best = names.size() - 1;</code> Return <code>names[best]</code> (empty-input guard). Alternative: <code>names.reserve(input.size())</code> before the loop, but comment why, because a future edit can silently break it.</p>`],
      solution: {
        approach: `<p>Replace the pointer with an index. Strict <code>&gt;</code> keeps the first longest on ties. Optionally also <code>reserve</code> for performance, but correctness must not depend on it.</p>`,
        code: { lang: 'cpp', code: `#include <iostream>
#include <string>
#include <vector>

std::string longestName(const std::vector<std::string>& input) {
    std::vector<std::string> names;
    names.reserve(input.size());              // performance only; correctness does not rely on it
    std::size_t best = 0;                     // INDEX survives any reallocation
    for (const auto& s : input) {
        names.push_back(s);
        if (names.size() == 1 || s.size() > names[best].size())
            best = names.size() - 1;
    }
    return names.empty() ? std::string{} : names[best];
}

int main() {
    std::cout << longestName({"ann", "bartholomew", "cy", "dorothea"}) << '\\n';   // bartholomew
}` },
        dry: { head: ['push', 'size / capacity (no reserve, libstdc++)', 'buggy pointer', 'best index'], rows: [['"ann"', '1 / 1', 'points to names[0] @A', '0'], ['"bartholomew"', '2 / 2 (realloc to B)', 'old @A <span class="c-r">dangles</span> before compare; then set to names[1] @B', '1'], ['"cy"', '3 / 4 (realloc to C)', '<span class="c-r">@B freed: UB on longest-&gt;size()</span>', '1'], ['"dorothea"', '4 / 4', 'still dangling', '1 → answer names[1]']] },
        complexity: `<p>Time O(total characters), one pass. Extra space O(total characters) for the stored names.</p>`,
        followUps: ['Would <code>std::deque&lt;std::string&gt;</code> fix the pointer version? (push_back keeps references valid, iterators not)', 'How would AddressSanitizer report the buggy version?', 'If you only need the answer, do you need the vector at all?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE: Easy
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: Two Pointers, One Re-aim',
    level: 'Easy', tags: ['predict the output', 'pointers'], companies: ['TCS', 'Infosys', 'Qualcomm'],
    statement: `<p>Without running it, what does this print?</p><pre>int a = 3, b = 7;
int* p = &amp;a;
int* q = &amp;b;
*p += *q;
p = q;
*p = *p * 2;
cout &lt;&lt; a &lt;&lt; ' ' &lt;&lt; b &lt;&lt; ' ' &lt;&lt; (p == q);</pre><p>Then write the program with a comment on every line showing the memory state.</p>`,
    constraints: `<p>Assume <code>int</code> is 4 bytes; addresses are irrelevant to the answer.</p>`,
    example: `<p>Answer: ${H.c('g', '10 14 1')}. Line 4 adds b into a (a = 10). Line 5 re-aims p at b (no values change). Line 6 doubles b through p (b = 14). p and q now hold the same address, so <code>p == q</code> prints 1.</p>`,
    brute: { why: `<p>The common wrong model: reading <code>p = q;</code> as "copy b's value into a" (as if it were <code>*p = *q;</code>). That gives a = 7, then <code>*p = *p * 2</code> doubles a to 14, and the guess becomes "14 7 0". The program below is what that wrong reading would actually mean.</p>`, code: { lang: 'cpp', code: `#include <iostream>
int main() {
    int a = 3, b = 7;
    int* p = &a;
    int* q = &b;
    *p += *q;        // a = 10
    *p = *q;         // WRONG MODEL: treats "p = q" as copying values (a = 7)
    *p = *p * 2;     // a = 14
    std::cout << a << ' ' << b << ' ' << (p == q) << '\\n';   // 14 7 0 (not the real answer)
}` } },
    mcq: { q: 'After <code>p = q;</code>, which statement is true?', options: ['a now equals b', 'p and q hold the same address; no int changed', 'b now equals a', 'p is now null'], answer: 1, explain: 'Assigning one pointer to another copies the address only. The pointed-at ints are untouched.' },
    hints: [`<p>Make a 4-row table (a, b, p, q). For each line ask: does it change a <b>pointer</b> (no star on the left) or a <b>target</b> (star on the left)?</p>`, `<p><code>*p += *q</code> changes a. <code>p = q</code> changes p only. <code>*p = *p * 2</code> changes whatever p points at <b>now</b>.</p>`, `<p>Final state: a = 10, b = 14, p == q == &amp;b. Printing a bool with <code>cout</code> shows 1/0 unless you use <code>std::boolalpha</code>.</p>`],
    solution: {
      approach: `<p>Trace pointer vs target changes line by line.</p>`,
      code: { lang: 'cpp', code: `#include <iostream>
int main() {
    int a = 3, b = 7;
    int* p = &a;            // p -> a
    int* q = &b;            // q -> b
    *p += *q;               // a = 3 + 7 = 10
    p = q;                  // p -> b (a stays 10)
    *p = *p * 2;            // b = 7 * 2 = 14
    std::cout << a << ' ' << b << ' ' << (p == q) << '\\n';   // 10 14 1
}` },
      dry: { head: ['line', 'a', 'b', 'p →', 'q →'], rows: [['int* p = &amp;a', '3', '7', 'a', '-'], ['int* q = &amp;b', '3', '7', 'a', 'b'], ['*p += *q', '<span class="c-g">10</span>', '7', 'a', 'b'], ['p = q', '10', '7', '<span class="c-y">b</span>', 'b'], ['*p = *p * 2', '10', '<span class="c-g">14</span>', 'b', 'b']] },
      complexity: `<p>Constant: it is a tracing exercise.</p>`,
      followUps: ['What prints if line 5 is <code>*p = *q;</code> instead?', 'Add <code>int** pp = &amp;p; **pp = 0;</code> at the end: which variable changes?']
    }
  });

  practice.push({
    title: 'Sum an Array Without the [] Operator',
    level: 'Easy', tags: ['pointer arithmetic'], companies: ['Amazon', 'Cisco'],
    statement: `<p>Write <code>long long sumRange(const int* first, const int* last)</code> that returns the sum of the ints in <code>[first, last)</code> using only pointer arithmetic and dereference. No <code>[]</code>, no indices.</p>`,
    constraints: `<p>0 ≤ last − first ≤ 10<sup>7</sup>, |values| ≤ 10<sup>9</sup> (use <code>long long</code> for the sum).</p>`,
    example: `<p>${H.arr([4, -1, 6], { ptr: { 0: 'first' } })} with <code>last = first + 3</code> → ${H.c('g', '9')}. Empty range (first == last) → 0.</p>`,
    brute: { why: `<p>An index-based loop works and compiles to the same machine code, but it ignores the constraint and hides the concept the exercise is drilling: walking a pointer to a sentinel end.</p>`, code: { lang: 'cpp', code: `long long sumIndexed(const int* first, const int* last) {
    long long s = 0;
    long long n = last - first;              // element count
    for (long long i = 0; i < n; ++i) s += first[i];   // uses [] (not allowed by the task)
    return s;
}` } },
    mcq: { q: 'Which loop condition is correct for <code>[first, last)</code>?', options: ['<code>p &lt;= last</code>', '<code>p != last</code>', '<code>p != last + 1</code>', '<code>*p != 0</code>'], answer: 1, explain: '<code>last</code> is one past the end: stop when you reach it. <code>&lt;=</code> would dereference <code>last</code>, and a zero sentinel only works for C strings.' },
    hints: [`<p>Start a pointer <code>p</code> at <code>first</code> and move it with <code>++p</code> until it equals <code>last</code>.</p>`, `<p>Accumulate into <code>long long</code> to avoid <code>int</code> overflow with large inputs.</p>`, `<p>Recipe: <code>long long s = 0; for (const int* p = first; p != last; ++p) s += *p; return s;</code>. Empty range: loop body never runs, returns 0.</p>`],
    solution: {
      approach: `<p>Half-open range walk with a moving pointer, the same shape as every STL algorithm.</p>`,
      code: { lang: 'cpp', code: `#include <iostream>
long long sumRange(const int* first, const int* last) {
    long long s = 0;
    for (const int* p = first; p != last; ++p)   // stop AT one-past-end
        s += *p;                                  // read the current element
    return s;
}
int main() {
    int a[] = {4, -1, 6};
    std::cout << sumRange(a, a + 3) << ' ' << sumRange(a, a) << '\\n';   // 9 0
}` },
      dry: { head: ['p', '*p', 's'], rows: [['a+0', '4', '4'], ['a+1', '-1', '3'], ['a+2', '6', '9'], ['a+3 == last', '-', 'return 9']] },
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['Rewrite with <code>std::accumulate(first, last, 0LL)</code>: why must the initial value be <code>0LL</code>?', 'Make it a template working with any iterator type']
    }
  });

  practice.push({
    title: 'Count a Character in a C-String',
    level: 'Easy', tags: ['c-string', 'pointers', 'nullptr'], companies: ['Microsoft', 'Intel'],
    statement: `<p>Write <code>int countChar(const char* s, char c)</code> that returns how many times <code>c</code> appears in the null-terminated string <code>s</code>. If <code>s</code> is <code>nullptr</code>, return 0. Walk the string with a pointer.</p>`,
    constraints: `<p>String length ≤ 10<sup>6</sup>. <code>c</code> is never <code>'\\0'</code>.</p>`,
    example: `<p><code>countChar("banana", 'a')</code> → ${H.c('g', '3')}.</p>${H.arr(['b', 'a', 'n', 'a', 'n', 'a', '\\0'], { hl: { 1: 'g', 3: 'g', 5: 'g', 6: 'y' } })}<p>The walk stops at the terminating zero byte (amber).</p>`,
    brute: { why: `<p>Copy into a <code>std::string</code> first, then count. It allocates memory for no reason (O(N) extra space) and still crashes on <code>nullptr</code> if you forget the check, because <code>std::string(nullptr)</code> is UB.</p>`, code: { lang: 'cpp', code: `#include <string>
#include <algorithm>
int countCharBrute(const char* s, char c) {
    if (!s) return 0;
    std::string copy(s);                                   // O(N) allocation + copy
    return static_cast<int>(std::count(copy.begin(), copy.end(), c));
}` } },
    mcq: { q: 'What stops the loop in a C-string walk?', options: ['A stored length field', 'The terminating <code>\'\\0\'</code> byte', 'The pointer becoming nullptr', 'sizeof(s)'], answer: 1, explain: 'C-strings carry no length (they are decayed arrays); the zero byte is the end marker. The pointer itself never becomes null by incrementing.' },
    hints: [`<p>Null-check first: <code>if (!s) return 0;</code>. Dereferencing a null pointer to look for <code>'\\0'</code> would crash.</p>`, `<p>Loop <code>for (const char* p = s; *p != '\\0'; ++p)</code>, comparing <code>*p</code> to <code>c</code>.</p>`, `<p>Recipe: counter starts 0; each match increments; return counter. Compactly: <code>while (*s) cnt += (*s++ == c);</code> (uses the <code>*p++</code> idiom).</p>`],
    solution: {
      approach: `<p>Guard against null, then a sentinel-terminated pointer walk.</p>`,
      code: { lang: 'cpp', code: `#include <iostream>
int countChar(const char* s, char c) {
    if (s == nullptr) return 0;          // nothing to scan
    int cnt = 0;
    for (const char* p = s; *p != '\\0'; ++p)   // until the terminator
        if (*p == c) ++cnt;
    return cnt;
}
int main() {
    std::cout << countChar("banana", 'a') << ' ' << countChar(nullptr, 'a') << '\\n';   // 3 0
}` },
      dry: { head: ['p at', '*p', 'match?', 'cnt'], rows: [['0', 'b', 'no', '0'], ['1', 'a', 'yes', '1'], ['3', 'a', 'yes', '2'], ['5', 'a', 'yes', '3'], ['6', '\\0', 'stop', 'return 3']] },
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['Accept <code>std::string_view</code> instead: what changes about null handling?', 'Count case-insensitively with <code>std::tolower</code> (beware negative <code>char</code> values)']
    }
  });

  practice.push({
    title: 'Swap Two Pointers (Not the Values)',
    level: 'Easy', tags: ['pointer to pointer', 'reference to pointer'], companies: ['Adobe', 'Nvidia'],
    statement: `<p>Write <code>void swapPointers(int*&amp; a, int*&amp; b)</code> that makes <code>a</code> point where <code>b</code> pointed and vice versa, <b>without changing any int</b>. Also write the C-style version <code>void swapPointersC(int** a, int** b)</code>. Show that after the call the original ints still hold their original values.</p>`,
    constraints: `<p>Either pointer may be <code>nullptr</code>; that must still work (no dereference of the ints is needed).</p>`,
    example: `<p>x = 1, y = 2, p = &amp;x, q = &amp;y. After <code>swapPointers(p, q)</code>: ${H.c('g', '*p == 2, *q == 1')}, but ${H.c('b', 'x == 1, y == 2')} (unchanged). Only the arrows swapped.</p>`,
    brute: { why: `<p>Swapping the <b>values</b> (<code>std::swap(*a, *b)</code>) looks the same through the pointers but modifies x and y, which the caller did not ask for, and it crashes if either pointer is null.</p>`, code: { lang: 'cpp', code: `#include <utility>
// Wrong tool: swaps the ints, not the pointers (and dereferences possibly-null pointers)
void swapValues(int* a, int* b) {
    std::swap(*a, *b);
}` } },
    mcq: { q: 'Why does <code>void swapP(int* a, int* b) { int* t = a; a = b; b = t; }</code> have no visible effect?', options: ['Pointers cannot be swapped', 'a and b are copies of the caller\'s pointers', 'It needs const', 'It swaps the ints instead'], answer: 1, explain: 'Parameters are copies. To change the caller\'s pointers you need <code>int*&amp;</code> or <code>int**</code>.' },
    hints: [`<p>You need to modify the caller's pointer variables themselves, so pass them by reference (<code>int*&amp;</code>) or by address (<code>int**</code>).</p>`, `<p>Inside, only copy addresses around; never use <code>*</code> on the int level, so null pointers are fine.</p>`, `<p>Recipe (reference): <code>int* t = a; a = b; b = t;</code>. Recipe (C style): <code>int* t = *a; *a = *b; *b = t;</code> and call it as <code>swapPointersC(&amp;p, &amp;q)</code>.</p>`],
    solution: {
      approach: `<p>Operate one level up: swap the pointer variables, which requires access to the caller's pointers.</p>`,
      code: { lang: 'cpp', code: `#include <iostream>
void swapPointers(int*& a, int*& b) {   // references to the caller's pointers
    int* t = a;
    a = b;
    b = t;
}
void swapPointersC(int** a, int** b) {  // addresses of the caller's pointers
    int* t = *a;
    *a = *b;
    *b = t;
}
int main() {
    int x = 1, y = 2;
    int* p = &x;
    int* q = &y;
    swapPointers(p, q);
    std::cout << *p << *q << ' ' << x << y << '\\n';   // 21 12
    swapPointersC(&p, &q);
    std::cout << *p << *q << '\\n';                    // 12
    int* n = nullptr;
    swapPointers(p, n);                                // works with null: no int is touched
    std::cout << (p == nullptr) << ' ' << *n << '\\n';  // 1 1
}` },
      dry: { head: ['step', 'p', 'q', 'x', 'y'], rows: [['start', '&amp;x', '&amp;y', '1', '2'], ['t = a', '&amp;x', '&amp;y', '1', '2'], ['a = b', '<span class="c-g">&amp;y</span>', '&amp;y', '1', '2'], ['b = t', '&amp;y', '<span class="c-g">&amp;x</span>', '1', '2']] },
      complexity: `<p>O(1) time and space: three pointer copies.</p>`,
      followUps: ['Does <code>std::swap(p, q)</code> do the same thing?', 'When would you sort an array of pointers instead of the objects themselves?']
    }
  });

  /* ======================================================================
     PRACTICE: Medium
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: References Meet const Pointers',
    level: 'Medium', tags: ['predict the output', 'references', 'const'], companies: ['Bloomberg', 'Morgan Stanley', 'Optiver'],
    statement: `<p>What does this print? Which commented-out line would fail to compile, and with what kind of error?</p><pre>int x = 1, y = 2;
int&amp; r = x;
const int* p = &amp;y;
r = y;          // (1)
r++;            // (2)
p = &amp;x;         // (3)
y = 10;         // (4)
int* const q = &amp;y;
*q += *p;       // (5)
// *p = 0;      // (6)
// q = &amp;x;      // (7)
cout &lt;&lt; x &lt;&lt; ' ' &lt;&lt; y &lt;&lt; ' ' &lt;&lt; *p &lt;&lt; ' ' &lt;&lt; r;</pre>`,
    constraints: `<p>Standard C++20. Assume the commented lines stay commented for the output question.</p>`,
    example: `<p>Output: ${H.c('g', '3 13 3 3')}. (1) copies y's value into x (x = 2), it does not re-bind r. (2) makes x = 3. (3) re-aims the pointer-to-const p at x (allowed). (4) y = 10. (5) y += x → 13. Line (6) fails: <i>assignment of read-only location</i>. Line (7) fails: <i>assignment of read-only variable q</i>.</p>`,
    brute: { why: `<p>Reading <code>r = y</code> as re-binding (so r now names y) and <code>const int* p</code> as "p never moves" leads to the wrong answer "1 12 2 12" or to thinking (3) is an error. The program below encodes that wrong mental model explicitly with a pointer, to show the different result.</p>`, code: { lang: 'cpp', code: `#include <iostream>
int main() {
    int x = 1, y = 2;
    int* r = &x;          // WRONG MODEL: treating the reference as a re-seatable pointer
    r = &y;               // "r = y" misread as re-binding
    (*r)++;               // y = 3 instead of x = 3
    std::cout << x << ' ' << y << '\\n';   // 1 3: not what the real program does
}` } },
    mcq: { q: 'Is line (3), <code>p = &amp;x;</code>, legal when p is <code>const int*</code>?', options: ['No, p is const', 'Yes: the const applies to the int, not the pointer', 'Only if x is const', 'Only with const_cast'], answer: 1, explain: 'const to the left of * locks the target (read-only view), not the pointer. Re-aiming is allowed; writing through p is not.' },
    hints: [`<p>Track three things in a table: x, y, and what p points at. Remember r is permanently x.</p>`, `<p>Reference assignment copies values. Pointer-to-const can move. Const-pointer cannot move but can write.</p>`, `<p>After (1) x=2; (2) x=3; (3) p→x; (4) y=10; (5) y = 10 + *p = 10 + 3 = 13. Printing r prints x.</p>`],
    solution: {
      approach: `<p>Apply the two rules: references never re-bind; const placement decides what is locked.</p>`,
      code: { lang: 'cpp', code: `#include <iostream>
int main() {
    int x = 1, y = 2;
    int& r = x;              // r IS x forever
    const int* p = &y;       // read-only view, movable
    r = y;                   // (1) x = 2 (value copy)
    r++;                     // (2) x = 3
    p = &x;                  // (3) OK: re-aim the view
    y = 10;                  // (4)
    int* const q = &y;       // fixed pointer, writable target
    *q += *p;                // (5) y = 10 + 3 = 13
    // *p = 0;               // (6) error: assignment of read-only location '*p'
    // q = &x;               // (7) error: assignment of read-only variable 'q'
    std::cout << x << ' ' << y << ' ' << *p << ' ' << r << '\\n';   // 3 13 3 3
}` },
      dry: { head: ['line', 'x', 'y', 'p →', 'q →'], rows: [['(1) r = y', '2', '2', 'y', '-'], ['(2) r++', '3', '2', 'y', '-'], ['(3) p = &amp;x', '3', '2', '<span class="c-y">x</span>', '-'], ['(4) y = 10', '3', '10', 'x', '-'], ['(5) *q += *p', '3', '<span class="c-g">13</span>', 'x', 'y']] },
      complexity: `<p>Tracing exercise, O(1).</p>`,
      followUps: ['Change line (3) to <code>p = &amp;r;</code>: same result? (yes, &amp;r is &amp;x)', 'What if p were declared <code>const int* const p</code>?']
    }
  });

  practice.push({
    title: 'Implement strcpy and strcmp With Pointers',
    level: 'Medium', tags: ['c-string', 'pointer arithmetic', '*p++ idiom'], companies: ['Apple', 'Qualcomm', 'Samsung'],
    statement: `<p>Implement <code>char* myStrcpy(char* dst, const char* src)</code> (copies including the terminator, returns <code>dst</code>) and <code>int myStrcmp(const char* a, const char* b)</code> (negative / zero / positive like <code>std::strcmp</code>, comparing as <code>unsigned char</code>). Use pointers only.</p>`,
    constraints: `<p>Strings are null-terminated, length ≤ 10<sup>6</sup>. <code>dst</code> has room for <code>strlen(src) + 1</code> bytes and does not overlap <code>src</code>.</p>`,
    example: `<p><code>myStrcmp("apple", "apply")</code>: first difference at index 4, <code>'e'(101) − 'y'(121)</code> → ${H.c('g', 'negative')}. <code>myStrcmp("ab", "abc")</code>: at index 2, <code>'\\0'(0) − 'c'(99)</code> → negative ("ab" sorts first).</p>${H.table(['i', 'a[i]', 'b[i]', 'equal?'], [['0', 'a', 'a', 'yes'], ['3', 'l', 'l', 'yes'], ['4', 'e', 'y', '<span class="c-r">no → return e − y</span>']])}`,
    brute: { why: `<p>Copying via <code>std::string</code> temporaries (<code>std::string(a) &lt; std::string(b)</code>) allocates twice and still needs care for the 3-way result. For strcpy, computing <code>strlen</code> first and then copying makes two passes over src.</p>`, code: { lang: 'cpp', code: `#include <string>
#include <cstring>
char* myStrcpyBrute(char* dst, const char* src) {
    std::size_t n = std::strlen(src);                 // pass 1: length
    for (std::size_t i = 0; i <= n; ++i) dst[i] = src[i];   // pass 2: copy incl. '\\0'
    return dst;
}
int myStrcmpBrute(const char* a, const char* b) {
    std::string x(a), y(b);                           // two allocations
    return x.compare(y);
}` } },
    mcq: { q: 'In <code>while ((*d++ = *s++) != \'\\0\');</code>, when does the loop stop?', options: ['Before copying the terminator', 'Right after copying the terminator', 'When d becomes null', 'Never; it is UB'], answer: 1, explain: 'The assignment copies the char, its value is tested; the terminator is copied first and then the test fails, so the destination is properly terminated.' },
    hints: [`<p>strcpy: the classic idiom copies and advances both pointers in one expression: <code>*d++ = *s++</code>. Keep the original <code>dst</code> to return it.</p>`, `<p>strcmp: advance both while the chars are equal and not the terminator. Then return the difference of the current chars <b>as unsigned char</b> (so bytes ≥ 128 compare correctly).</p>`, `<p>Recipe: <code>while (*a &amp;&amp; *a == *b) { ++a; ++b; }</code> <code>return (unsigned char)*a - (unsigned char)*b;</code>. If one string is a prefix of the other, the comparison hits <code>'\\0'</code> vs a char, which correctly gives the shorter string a smaller result.</p>`],
    solution: {
      approach: `<p>Single-pass pointer walks using the postfix-increment idiom; unsigned comparison for strcmp.</p>`,
      code: { lang: 'cpp', code: `#include <iostream>

char* myStrcpy(char* dst, const char* src) {
    char* d = dst;                              // keep dst to return it
    while ((*d++ = *src++) != '\\0') { }         // copy, then test the copied char
    return dst;
}

int myStrcmp(const char* a, const char* b) {
    while (*a != '\\0' && *a == *b) { ++a; ++b; }   // skip the common prefix
    return static_cast<unsigned char>(*a) - static_cast<unsigned char>(*b);
}

int main() {
    char buf[16];
    std::cout << myStrcpy(buf, "pointer") << '\\n';           // pointer
    std::cout << (myStrcmp("apple", "apply") < 0) << ' '     // 1
              << (myStrcmp("ab", "abc") < 0) << ' '          // 1
              << myStrcmp("same", "same") << '\\n';           // 0
}` },
      dry: { head: ['a points at', 'b points at', 'equal &amp; not end?', 'action'], rows: [['a', 'a', 'yes', '++a, ++b'], ['p (x2), l', 'p (x2), l', 'yes', 'advance'], ['e', 'y', 'no', 'return 101 − 121 = -20']] },
      complexity: `<p>Both O(N) time, O(1) space.</p>`,
      followUps: ['Why is <code>strcpy</code> considered dangerous, and what do <code>strncpy</code>/<code>strlcpy</code>/<code>std::string</code> fix?', 'What happens if <code>dst</code> and <code>src</code> overlap?']
    }
  });

  practice.push({
    title: 'Remove Duplicates From a Sorted Array (Read/Write Pointers)',
    level: 'Medium', tags: ['two pointers', 'pointer arithmetic', 'in-place'], companies: ['Amazon', 'Microsoft', 'Uber'],
    statement: `<p>Write <code>int* dedupSorted(int* first, int* last)</code> that removes consecutive duplicates <b>in place</b> in the sorted range <code>[first, last)</code> and returns a pointer to the new logical end. Elements after the new end can be anything.</p>`,
    constraints: `<p>0 ≤ N ≤ 10<sup>6</sup>. O(1) extra space. Like <code>std::unique</code>.</p>`,
    example: `<p>${H.arr([1, 1, 2, 3, 3, 3, 4])} → ${H.arr([1, 2, 3, 4, '?', '?', '?'], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' }, ptr: { 4: 'returned end' } })} The returned pointer is <code>first + 4</code>, so the new length is <code>end − first</code> = 4.</p>`,
    brute: { why: `<p>Copy unique values into a <code>std::vector</code> and copy them back: O(N) extra memory. Alternatively, erase each duplicate by shifting the tail left: O(N²) moves in the worst case (all equal).</p>`, code: { lang: 'cpp', code: `#include <vector>
int* dedupBrute(int* first, int* last) {
    if (first == last) return last;
    std::vector<int> keep{*first};                        // O(N) extra memory
    for (int* p = first + 1; p != last; ++p)
        if (*p != keep.back()) keep.push_back(*p);
    int* w = first;
    for (int v : keep) *w++ = v;                          // copy back
    return w;
}` } },
    mcq: { q: 'What does the write pointer <code>w</code> always point at?', options: ['The last duplicate seen', 'The last kept unique element', 'One past the end of the input', 'The next element to read'], answer: 1, explain: 'Invariant: [first, w] holds the unique prefix and *w is the last kept value; a new value is written at ++w.' },
    hints: [`<p>Two pointers: <code>r</code> reads every element, <code>w</code> marks the last unique element written. Since the input is sorted, a duplicate always equals <code>*w</code>.</p>`, `<p>When <code>*r != *w</code>, advance <code>w</code> and copy: <code>*++w = *r;</code>.</p>`, `<p>Recipe: handle empty range; <code>w = first</code>; for <code>r = first + 1</code> to <code>last</code>: if <code>*r != *w</code> then <code>*++w = *r</code>. Return <code>w + 1</code> (one past the last unique).</p>`],
    solution: {
      approach: `<p>Read/write two-pointer compaction; the returned pointer is a one-past-end marker, matching STL conventions (pair with <code>v.erase(newEnd, v.end())</code> for vectors).</p>`,
      code: { lang: 'cpp', code: `#include <iostream>

int* dedupSorted(int* first, int* last) {
    if (first == last) return last;           // empty range
    int* w = first;                           // last kept unique element
    for (int* r = first + 1; r != last; ++r)
        if (*r != *w) *++w = *r;              // new value: advance w, then write
    return w + 1;                             // one past the last unique
}

int main() {
    int a[] = {1, 1, 2, 3, 3, 3, 4};
    int* e = dedupSorted(a, a + 7);
    for (int* p = a; p != e; ++p) std::cout << *p << ' ';   // 1 2 3 4
    std::cout << "| len " << (e - a) << '\\n';              // | len 4
}` },
      dry: { head: ['r at', '*r', '*w', 'action', 'array prefix'], rows: [['1', '1', '1', 'skip', '1'], ['2', '2', '1', '*++w = 2', '1 2'], ['3', '3', '2', '*++w = 3', '1 2 3'], ['4,5', '3', '3', 'skip', '1 2 3'], ['6', '4', '3', '*++w = 4', '1 2 3 4']] },
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['Allow each value at most twice', 'Same with <code>std::unique</code> + <code>erase</code> on a vector: what iterator rules apply after erase?']
    }
  });

  practice.push({
    title: 'Bug Hunt: Fix Three Dangling Returns',
    level: 'Medium', tags: ['dangling', 'lifetime', 'bug hunt'], companies: ['Google', 'Microsoft', 'Tesla'],
    statement: `<p>Each function below compiles (some with warnings) but returns something that dangles. Explain why and rewrite each so it is correct.</p><pre>int* makeArray() { int a[3] = {1, 2, 3}; return a; }
const std::string&amp; greet(const std::string&amp; name) { return "Hi " + name; }
std::string_view firstWord(std::string s) { return std::string_view(s).substr(0, s.find(' ')); }</pre>`,
    constraints: `<p>Fixed versions must not leak, must not use static locals as a hack, and must keep a similar signature where reasonable.</p>`,
    example: `<p>${H.table(['function', 'what dies', 'when'], [['makeArray', 'local array a', 'at return'], ['greet', 'temporary std::string from operator+', 'at end of the return statement'], ['firstWord', 'parameter s (a copy)', 'when the function returns']])}<p>All three return a pointer/reference/view into that dead object. Fix by returning <b>owning values</b>.</p>`,
    brute: { why: `<p>"Fixing" with <code>static</code> locals (<code>static int a[3]</code>) makes the address valid, but every call shares one buffer, so results overwrite each other and the function is no longer thread-safe. Using <code>new</code> moves the problem to a memory leak the caller must remember to free.</p>`, code: { lang: 'cpp', code: `#include <string>
// Hack 1: static buffer, shared by every caller (not reentrant, not thread-safe)
int* makeArrayStatic() { static int a[3] = {1, 2, 3}; return a; }
// Hack 2: heap allocation that the caller must remember to delete[]
int* makeArrayHeap() { return new int[3]{1, 2, 3}; }` } },
    mcq: { q: 'Why does <code>greet</code> dangle even though its parameter is a <code>const&amp;</code>?', options: ['It does not dangle', 'The returned reference binds to a temporary created inside the function, which dies at the end of the return statement', 'Because name is const', 'Because strings are on the heap'], answer: 1, explain: 'Lifetime extension does not apply to return statements: the temporary from "Hi " + name is destroyed before the caller receives the reference. GCC warns "returning reference to temporary".' },
    hints: [`<p>For each function, name the object the result refers to and the moment it dies.</p>`, `<p>The cure in modern C++ is to return by value: <code>std::array&lt;int, 3&gt;</code>, <code>std::string</code>. Return value optimization makes it cheap.</p>`, `<p>For firstWord: either take a <code>std::string_view</code> parameter (then the view refers to the caller's data, which outlives the call) or return a <code>std::string</code>. Document that the returned view is valid only while the caller's string is.</p>`],
    solution: {
      approach: `<p>Return owning values, or make views refer to data the caller owns.</p>`,
      code: { lang: 'cpp', code: `#include <array>
#include <iostream>
#include <string>
#include <string_view>

std::array<int, 3> makeArray() { return {1, 2, 3}; }            // value: copied/moved out

std::string greet(const std::string& name) { return "Hi " + name; }   // owning string

// View into the CALLER's data: valid as long as the caller's string lives
std::string_view firstWord(std::string_view s) {
    return s.substr(0, s.find(' '));          // npos -> whole string
}

int main() {
    auto a = makeArray();
    std::string text = "hello world";
    std::cout << a[2] << ' ' << greet("Ann") << ' ' << firstWord(text) << '\\n';   // 3 Hi Ann hello
}` },
      dry: { head: ['function', 'buggy result refers to', 'fixed result'], rows: [['makeArray', 'dead local array', 'std::array copy'], ['greet', 'dead temporary string', 'std::string value'], ['firstWord', 'dead parameter copy', 'view into caller-owned text']] },
      complexity: `<p>Same as the originals: O(1), O(len), O(len).</p>`,
      followUps: ['Show the compiler warnings each original triggers with <code>-Wall</code>', 'Would <code>firstWord(std::string("a b"))</code> be safe with the fixed version? (only within that full expression)']
    }
  });

  practice.push({
    title: 'Rotate an Array by k With Three Reversals',
    level: 'Medium', tags: ['pointer arithmetic', 'in-place', 'reversal'], companies: ['Microsoft', 'Amazon', 'Walmart'],
    statement: `<p>Write <code>void rotateRight(int* first, int* last, long long k)</code> that rotates the range right by <code>k</code> positions in place using O(1) extra memory and only pointer arithmetic.</p>`,
    constraints: `<p>0 ≤ N ≤ 10<sup>6</sup>, 0 ≤ k ≤ 10<sup>18</sup>.</p>`,
    example: `<p>${H.arr([1, 2, 3, 4, 5, 6, 7])} k = 3 → ${H.arr([5, 6, 7, 1, 2, 3, 4], { hl: { 0: 'g', 1: 'g', 2: 'g' } })}</p>${H.table(['step', 'array'], [['reverse all', '7 6 5 4 3 2 1'], ['reverse first k=3', '<span class="c-g">5 6 7</span> 4 3 2 1'], ['reverse the rest', '5 6 7 <span class="c-g">1 2 3 4</span>']])}`,
    brute: { why: `<p>Rotate by one, k times: each single rotation moves N elements, so O(N·k), which is hopeless for large k. Even with k reduced mod N it is O(N²).</p>`, code: { lang: 'cpp', code: `void rotateBrute(int* first, int* last, long long k) {
    long long n = last - first;
    if (n == 0) return;
    k %= n;
    while (k--) {                       // k single-step rotations
        int tail = *(last - 1);
        for (int* p = last - 1; p != first; --p) *p = *(p - 1);   // shift right by one
        *first = tail;
    }
}` } },
    mcq: { q: 'Why reduce k with <code>k %= n</code> first?', options: ['To make it faster only', 'Rotating by n is the identity, and without it <code>first + k</code> would point far outside the array (UB)', 'Because k is signed', 'It is not needed'], answer: 1, explain: 'Pointer arithmetic beyond one-past-end is undefined. k mod n gives the equivalent in-range rotation and is required for correctness, not just speed.' },
    hints: [`<p>Rotating right by k moves the last k elements to the front, keeping each block's internal order.</p>`, `<p>Reverse everything, then reverse the first k, then reverse the remaining n − k: the block orders and internal orders come out right.</p>`, `<p>Recipe: <code>n = last - first; if (n == 0) return; k %= n; reverse(first, last); reverse(first, first + k); reverse(first + k, last);</code> with your own pointer-based reverse.</p>`],
    solution: {
      approach: `<p>Three in-place reversals with pointers; k reduced modulo N so all pointers stay within [first, last].</p>`,
      code: { lang: 'cpp', code: `#include <iostream>
#include <utility>

static void rev(int* lo, int* hi) {            // reverse [lo, hi)
    while (lo != hi && lo != --hi) std::swap(*lo++, *hi);
}

void rotateRight(int* first, int* last, long long k) {
    long long n = last - first;
    if (n == 0) return;
    k %= n;                                     // keep pointer arithmetic in range
    rev(first, last);                           // 7 6 5 4 3 2 1
    rev(first, first + k);                      // 5 6 7 | 4 3 2 1
    rev(first + k, last);                       // 5 6 7 | 1 2 3 4
}

int main() {
    int a[] = {1, 2, 3, 4, 5, 6, 7};
    rotateRight(a, a + 7, 3);
    for (int x : a) std::cout << x << ' ';      // 5 6 7 1 2 3 4
    std::cout << '\\n';
}` },
      dry: { head: ['phase', 'range', 'array after'], rows: [['k %= 7', '-', 'k = 3'], ['rev all', '[0,7)', '7 6 5 4 3 2 1'], ['rev first k', '[0,3)', '5 6 7 4 3 2 1'], ['rev rest', '[3,7)', '5 6 7 1 2 3 4']] },
      complexity: `<p>Time O(N) (each element swapped about twice), space O(1).</p>`,
      followUps: ['Rotate left instead', 'Compare with <code>std::rotate</code> and its return value']
    }
  });

  practice.push({
    title: 'Merge Two Sorted Arrays In Place From the Back',
    level: 'Medium', tags: ['two pointers', 'pointer arithmetic', 'merge'], companies: ['Meta', 'LinkedIn', 'Amazon'],
    statement: `<p><code>a</code> has room for <code>m + n</code> ints: its first <code>m</code> are sorted data, the rest is free space. <code>b</code> holds <code>n</code> sorted ints. Write <code>void mergeInto(int* a, int m, const int* b, int n)</code> that merges b into a so that <code>a[0..m+n)</code> is sorted, using three pointers and no extra array.</p>`,
    constraints: `<p>0 ≤ m, n ≤ 10<sup>5</sup>. O(1) extra space.</p>`,
    example: `<p>a = ${H.arr([1, 4, 7, '_', '_'])} (m = 3), b = ${H.arr([2, 5])} → ${H.arr([1, 2, 4, 5, 7], { hl: { 1: 'b', 3: 'b' } })}. Filling from the back means we never overwrite an a-value we still need.</p>`,
    brute: { why: `<p>Copy the m values out to a temporary vector and merge forward into a: correct, O(m) extra memory. Or append b and call <code>std::sort</code>: O((m+n) log(m+n)) and ignores that both inputs are already sorted.</p>`, code: { lang: 'cpp', code: `#include <algorithm>
void mergeBrute(int* a, int m, const int* b, int n) {
    std::copy(b, b + n, a + m);          // append b into the free space
    std::sort(a, a + m + n);             // O((m+n) log(m+n))
}` } },
    mcq: { q: 'Why fill from the back instead of the front?', options: ['It is faster for the CPU cache', 'The back of a is free space, so writing there never overwrites unread a-values', 'Sorting requires it', 'To avoid using pointers'], answer: 1, explain: 'The write pointer starts at a + m + n − 1, always at or after the read pointer into a, so no unmerged value is clobbered.' },
    hints: [`<p>Three pointers: <code>pa</code> at the last real a-value, <code>pb</code> at the last b-value, <code>w</code> at the last slot of a.</p>`, `<p>Each step writes the larger of <code>*pa</code> and <code>*pb</code> to <code>*w</code> and moves that pointer and <code>w</code> left.</p>`, `<p>Use counts (<code>i</code>, <code>j</code>) to avoid forming pointers before <code>a</code>: <code>while (j &gt; 0)</code> { if <code>i &gt; 0 &amp;&amp; a[i-1] &gt; b[j-1]</code> take from a, else from b }. Leftover a-values are already in place.</p>`],
    solution: {
      approach: `<p>Backward merge with read indices expressed as pointers <code>a + i</code>, <code>b + j</code>; loop ends when b is exhausted.</p>`,
      code: { lang: 'cpp', code: `#include <iostream>

void mergeInto(int* a, int m, const int* b, int n) {
    int i = m, j = n;                 // counts of unmerged elements (avoid pointers before a/b)
    int* w = a + m + n;               // one past the last slot
    while (j > 0) {
        if (i > 0 && *(a + i - 1) > *(b + j - 1))
            *--w = *(a + --i);        // take the larger from a
        else
            *--w = *(b + --j);        // ties go to b, so equal a-values stay before b-values (stable)
    }
    // remaining a-values (i > 0) are already in their final positions
}

int main() {
    int a[5] = {1, 4, 7};
    int b[2] = {2, 5};
    mergeInto(a, 3, b, 2);
    for (int x : a) std::cout << x << ' ';   // 1 2 4 5 7
    std::cout << '\\n';
}` },
      dry: { head: ['i', 'j', 'compare', 'write slot ← value'], rows: [['3', '2', '7 vs 5', 'a[4] ← 7'], ['2', '2', '4 vs 5', 'a[3] ← 5'], ['2', '1', '4 vs 2', 'a[2] ← 4'], ['1', '1', '1 vs 2', 'a[1] ← 2'], ['1', '0', 'b done', 'a[0] = 1 already in place']] },
      complexity: `<p>Time O(m + n), space O(1).</p>`,
      followUps: ['Why does the loop condition only test <code>j &gt; 0</code>?', 'Prove the tie rule keeps equal a-elements before b-elements (stability)']
    }
  });

  /* ======================================================================
     PRACTICE: Hard
     ====================================================================== */
  practice.push({
    title: 'Implement memmove (Overlap-Safe Copy)',
    level: 'Hard', tags: ['pointer arithmetic', 'overlap', 'void*', 'bytes'], companies: ['Apple', 'Nvidia', 'Arm', 'Jane Street'],
    statement: `<p>Implement <code>void* myMemmove(void* dst, const void* src, std::size_t n)</code>: copy <code>n</code> bytes from <code>src</code> to <code>dst</code> and return <code>dst</code>. Unlike <code>memcpy</code>, the two ranges <b>may overlap</b>, and the result must be as if the bytes were first copied to a temporary buffer. No heap allocation.</p>`,
    constraints: `<p>0 ≤ n ≤ 10<sup>9</sup>. Both ranges are valid for n bytes. O(1) extra memory.</p>`,
    example: `<p>buf = <code>"abcdef"</code>, <code>myMemmove(buf + 2, buf, 4)</code> → <code>"ababcd"</code>.</p>${H.arr(['a', 'b', 'c', 'd', 'e', 'f'], { ptr: { 0: 'src', 2: 'dst' } })}<p>Copying <b>forwards</b> would overwrite c and d before reading them and produce <span class="c-r">"ababab"</span>. When dst is after src, copy <b>backwards</b>: ${H.c('g', '"ababcd"')}.</p>`,
    brute: { why: `<p>Copy into a temporary heap buffer, then from the buffer to dst. Always correct for overlap, but needs O(n) extra memory and an allocation that can fail, which a low-level primitive must avoid.</p>`, code: { lang: 'cpp', code: `#include <cstddef>
#include <vector>
void* memmoveBrute(void* dst, const void* src, std::size_t n) {
    const unsigned char* s = static_cast<const unsigned char*>(src);
    std::vector<unsigned char> tmp(s, s + n);                 // O(n) extra memory
    unsigned char* d = static_cast<unsigned char*>(dst);
    for (std::size_t i = 0; i < n; ++i) d[i] = tmp[i];
    return dst;
}` } },
    mcq: { q: 'dst = src + 2 and n = 4. Which direction must you copy?', options: ['Forwards (low to high addresses)', 'Backwards (high to low addresses)', 'Either works', 'It is impossible without a buffer'], answer: 1, explain: 'dst starts inside the source range after src; copying from the end first reads each source byte before it gets overwritten.' },
    hints: [`<p>You cannot do arithmetic on <code>void*</code>. Convert both to <code>unsigned char*</code> (byte pointers).</p>`, `<p>If dst &lt; src (or the ranges do not overlap), copy forward; if dst &gt; src, copy backward from the last byte. Comparing pointers into different objects with <code>&lt;</code> is unspecified, so use <code>std::less&lt;&gt;</code> (a total order) or compare <code>uintptr_t</code> values.</p>`, `<p>Recipe: <code>if (d == s || n == 0) return dst;</code> <code>if (std::less&lt;const unsigned char*&gt;{}(d, s))</code> forward loop <code>while (n--) *d++ = *s++;</code> else <code>d += n; s += n; while (n--) *--d = *--s;</code>.</p>`],
    solution: {
      approach: `<p>Choose the copy direction so that every source byte is read before it can be overwritten. Byte pointers for arithmetic; <code>std::less</code> for a well-defined pointer comparison.</p>`,
      code: { lang: 'cpp', code: `#include <cstddef>
#include <functional>
#include <iostream>

void* myMemmove(void* dst, const void* src, std::size_t n) {
    auto* d = static_cast<unsigned char*>(dst);           // byte pointers: arithmetic allowed
    auto* s = static_cast<const unsigned char*>(src);
    if (d == s || n == 0) return dst;
    if (std::less<const unsigned char*>{}(d, s)) {        // dst before src: forward is safe
        while (n--) *d++ = *s++;
    } else {                                               // dst after src: go backwards
        d += n;
        s += n;                                            // one past the ends (allowed)
        while (n--) *--d = *--s;
    }
    return dst;
}

int main() {
    char buf[] = "abcdef";
    myMemmove(buf + 2, buf, 4);
    std::cout << buf << '\\n';      // ababcd
    char buf2[] = "abcdef";
    myMemmove(buf2, buf2 + 2, 4);
    std::cout << buf2 << '\\n';     // cdefef
}` },
      dry: { head: ['step (backward)', 'read s', 'write d', 'buf'], rows: [['1', 'buf[3] = d', 'buf[5]', 'abcded'], ['2', 'buf[2] = c', 'buf[4]', 'abcdcd'], ['3', 'buf[1] = b', 'buf[3]', 'abcbcd'], ['4', 'buf[0] = a', 'buf[2]', '<span class="c-g">ababcd</span>']] },
      complexity: `<p>Time O(n), extra space O(1). Real libc versions copy word- or vector-sized chunks after aligning, which is why they are much faster.</p>`,
      followUps: ['Why is <code>memcpy</code> with overlapping ranges UB, and why is it still sometimes faster than memmove?', 'How would you copy 8 bytes at a time without violating alignment or strict aliasing? (memcpy into a uint64_t)']
    }
  });

  practice.push({
    title: 'Remove All Matching Nodes With a Pointer-to-Pointer',
    level: 'Hard', tags: ['pointer to pointer', 'linked list', 'delete', 'dangling'], companies: ['Meta', 'Google', 'Amazon'],
    statement: `<p>Given <code>struct Node { int val; Node* next; };</code> nodes allocated with <code>new</code>, write <code>void removeAll(Node** head, int target)</code> that unlinks and <code>delete</code>s every node whose value is <code>target</code>. Use a <code>Node**</code> "link" cursor so that removing the head needs <b>no special case</b>, and never touch a node after deleting it.</p>`,
    constraints: `<p>0 ≤ length ≤ 10<sup>5</sup>. No dummy node allocation. No leaks (verify mentally or with ASan/LeakSanitizer).</p>`,
    example: `<p>${H.arr([6, 1, 6, 6, 2], { label: 'list', hl: { 0: 'r', 2: 'r', 3: 'r' } })} target 6 → ${H.arr([1, 2], { hl: { 0: 'g', 1: 'g' } })}. The head (6) is removed by the same code path as the middle ones, because the cursor points at <i>the link</i> that leads to the current node (first <code>head</code> itself, later some <code>node-&gt;next</code>).</p>`,
    brute: { why: `<p>The typical version keeps <code>prev</code> and <code>cur</code> pointers and needs a separate loop or branch for "the head matches". Two code paths double the chance of bugs: forgetting to update <code>*head</code>, or reading <code>cur-&gt;next</code> after <code>delete cur</code> (use-after-free).</p>`, code: { lang: 'cpp', code: `struct Node { int val; Node* next; };
void removeAllBrute(Node** head, int target) {
    while (*head && (*head)->val == target) {      // special case: matching heads
        Node* dead = *head;
        *head = dead->next;
        delete dead;
    }
    Node* prev = *head;
    while (prev && prev->next) {                    // general case
        if (prev->next->val == target) {
            Node* dead = prev->next;
            prev->next = dead->next;                // read next BEFORE delete
            delete dead;
        } else {
            prev = prev->next;
        }
    }
}` } },
    mcq: { q: 'With <code>Node** link</code> pointing at the pointer that leads to the current node, how do you unlink the current node?', options: ['<code>link = link-&gt;next;</code>', '<code>*link = (*link)-&gt;next;</code> after saving the node to delete', '<code>delete *link; *link = (*link)-&gt;next;</code>', '<code>**link = nullptr;</code>'], answer: 1, explain: 'Save <code>Node* dead = *link;</code>, then overwrite the link with <code>dead-&gt;next</code>, then delete. Option 3 reads (*link)->next after deleting it: use-after-free.' },
    hints: [`<p>A <code>Node**</code> can point at <code>head</code> itself or at any node's <code>next</code> field. All those links are the same type, so one code path handles them all.</p>`, `<p>If <code>(*link)-&gt;val</code> matches: save the node, redirect <code>*link</code> to its next, delete it, and do <b>not</b> advance (the new <code>*link</code> must be checked too). Otherwise advance: <code>link = &amp;(*link)-&gt;next;</code>.</p>`, `<p>Recipe: <code>for (Node** link = head; *link; ) { Node* cur = *link; if (cur-&gt;val == target) { *link = cur-&gt;next; delete cur; } else link = &amp;cur-&gt;next; }</code>. Order matters: read <code>cur-&gt;next</code> before <code>delete cur</code>.</p>`],
    solution: {
      approach: `<p>Indirect pointer cursor over the links themselves (Linus Torvalds' "good taste" example). One uniform loop; each node is deleted only after its next pointer has been read.</p>`,
      code: { lang: 'cpp', code: `#include <iostream>

struct Node { int val; Node* next; };

void removeAll(Node** head, int target) {
    Node** link = head;                     // points at the link to the current node
    while (*link != nullptr) {
        Node* cur = *link;
        if (cur->val == target) {
            *link = cur->next;              // bypass cur (works for head and middle alike)
            delete cur;                     // cur is never used after this line
        } else {
            link = &cur->next;              // advance to the next link
        }
    }
}

Node* build(std::initializer_list<int> vals) {
    Node* head = nullptr;
    Node** tail = &head;                    // same trick for appending
    for (int v : vals) { *tail = new Node{v, nullptr}; tail = &(*tail)->next; }
    return head;
}

int main() {
    Node* head = build({6, 1, 6, 6, 2});
    removeAll(&head, 6);
    for (Node* p = head; p; p = p->next) std::cout << p->val << ' ';   // 1 2
    std::cout << '\\n';
    while (head) { Node* n = head->next; delete head; head = n; }      // free the rest
}` },
      dry: { head: ['link points at', '*link → val', 'action', 'list now'], rows: [['head', '6', 'unlink + delete', '1 6 6 2'], ['head', '1', 'advance to &amp;node1.next', '1 6 6 2'], ['node1.next', '6', 'unlink + delete', '1 6 2'], ['node1.next', '6', 'unlink + delete', '1 2'], ['node1.next', '2', 'advance', '1 2'], ['node2.next', 'null', 'stop', '1 2']] },
      complexity: `<p>Time O(N), extra space O(1).</p>`,
      followUps: ['Rewrite with <code>std::unique_ptr&lt;Node&gt;</code> links: what changes and what new pitfall appears (recursive destruction depth)?', 'Insert into a sorted list using the same Node** cursor']
    }
  });

  practice.push({
    title: 'Build a Minimal Bounds-Checked ArrayView',
    level: 'Hard', tags: ['span', 'decay', 'const', 'class design'], companies: ['Microsoft', 'Bloomberg', 'Citadel'],
    statement: `<p>Implement a tiny non-owning view <code>template&lt;class T&gt; class ArrayView</code> (pointer + size) that: (1) constructs from a pointer and size, from a C array <b>without losing its length</b> (no decay), and from a <code>std::vector</code>; (2) has <code>size()</code>, <code>empty()</code>, unchecked <code>operator[]</code>, checked <code>at()</code> throwing <code>std::out_of_range</code>; (3) supports range-for; (4) has <code>subview(offset, count)</code> with bounds checks; (5) converts <code>ArrayView&lt;T&gt;</code> to <code>ArrayView&lt;const T&gt;</code>.</p>`,
    constraints: `<p>No allocation. All operations O(1) except iteration. Must compile with <code>-std=c++20</code>.</p>`,
    example: `<p><code>int a[5] = {1,2,3,4,5}; ArrayView&lt;int&gt; v(a);</code> → <code>v.size() == ${H.c('g', '5')}</code> (not 2!). <code>v.subview(1, 3)</code> views ${H.arr([2, 3, 4], { hl: { 0: 'b', 1: 'b', 2: 'b' } })}. <code>v.at(7)</code> throws ${H.c('r', 'out_of_range')}.</p>`,
    brute: { why: `<p>Passing <code>(T* p, size_t n)</code> pairs everywhere: the two values travel separately, so any caller can pass the wrong n, sizes get recomputed with <code>sizeof</code> on decayed pointers, and there is no single place to add bounds checks.</p>`, code: { lang: 'cpp', code: `#include <cstddef>
// Pointer + size as separate parameters: nothing ties them together
long long sumRaw(const int* p, std::size_t n) {
    long long s = 0;
    for (std::size_t i = 0; i < n; ++i) s += p[i];   // trusts n blindly
    return s;
}` } },
    mcq: { q: 'How can the constructor learn the length of a C array argument?', options: ['<code>sizeof(arr) / sizeof(arr[0])</code> inside a constructor taking <code>T* arr</code>', 'A template constructor taking <code>T (&amp;arr)[N]</code>, which binds by reference so no decay happens', 'It cannot', 'Using <code>strlen</code>'], answer: 1, explain: 'Binding to a reference to array is one of the decay exceptions; N is deduced from the argument type.' },
    hints: [`<p>Store <code>T* data_</code> and <code>std::size_t size_</code>. Iterators can simply be <code>T*</code>: <code>begin()</code> returns <code>data_</code>, <code>end()</code> returns <code>data_ + size_</code>.</p>`, `<p>C array: <code>template&lt;std::size_t N&gt; ArrayView(T (&amp;arr)[N])</code>. Vector: take <code>std::vector&lt;std::remove_const_t&lt;T&gt;&gt;&amp;</code> (and a const overload for <code>ArrayView&lt;const X&gt;</code>). Conversion to const: a converting constructor from <code>ArrayView&lt;U&gt;</code> constrained with <code>requires std::is_convertible_v&lt;U(*)[], T(*)[]&gt;</code>.</p>`, `<p><code>subview(off, cnt)</code>: check <code>off &lt;= size_</code> and <code>cnt &lt;= size_ - off</code> (written this way to avoid overflow), then return <code>{data_ + off, cnt}</code>. Remember the view does not own data: it dangles if the array dies.</p>`],
    solution: {
      approach: `<p>Same design as <code>std::span</code>: a pointer and a length stored together, constructors that capture the length at the point where it is still known (no decay), raw pointers as iterators, and checked accessors. The class is trivially copyable and cheap to pass by value.</p>`,
      code: { lang: 'cpp', code: `#include <cstddef>
#include <iostream>
#include <stdexcept>
#include <type_traits>
#include <vector>

template <class T>
class ArrayView {
public:
    ArrayView() = default;
    ArrayView(T* p, std::size_t n) : data_(p), size_(n) {}

    template <std::size_t N>
    ArrayView(T (&arr)[N]) : data_(arr), size_(N) {}            // reference to array: no decay

    ArrayView(std::vector<std::remove_const_t<T>>& v) : data_(v.data()), size_(v.size()) {}

    template <class U = T> requires std::is_const_v<U>
    ArrayView(const std::vector<std::remove_const_t<T>>& v) : data_(v.data()), size_(v.size()) {}

    template <class U> requires std::is_convertible_v<U (*)[], T (*)[]>
    ArrayView(ArrayView<U> other) : data_(other.data()), size_(other.size()) {}   // T -> const T

    T* data() const { return data_; }
    std::size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }

    T& operator[](std::size_t i) const { return data_[i]; }      // unchecked, like span
    T& at(std::size_t i) const {
        if (i >= size_) throw std::out_of_range("ArrayView::at");
        return data_[i];
    }
    ArrayView subview(std::size_t off, std::size_t cnt) const {
        if (off > size_ || cnt > size_ - off) throw std::out_of_range("ArrayView::subview");
        return ArrayView(data_ + off, cnt);
    }
    T* begin() const { return data_; }                           // raw pointers are iterators
    T* end() const { return data_ + size_; }

private:
    T* data_ = nullptr;
    std::size_t size_ = 0;
};

long long sum(ArrayView<const int> v) {                          // read-only view parameter
    long long s = 0;
    for (int x : v) s += x;
    return s;
}

int main() {
    int a[5] = {1, 2, 3, 4, 5};
    ArrayView<int> v(a);                       // size 5, no decay
    v[0] = 10;                                 // writable view
    std::cout << v.size() << ' ' << sum(v) << ' ' << sum(v.subview(1, 3)) << '\\n';   // 5 24 9
    std::vector<int> vec{7, 8};
    std::cout << sum(vec) << '\\n';             // 15 (const view from a vector)
    try { v.at(7); } catch (const std::out_of_range& e) { std::cout << "caught " << e.what() << '\\n'; }
}` },
      dry: { head: ['call', 'data_', 'size_', 'result'], rows: [['ArrayView v(a)', '&amp;a[0]', '5', 'N deduced = 5'], ['v.subview(1, 3)', '&amp;a[1]', '3', 'views 2 3 4 → sum 9'], ['sum(v) after v[0]=10', '&amp;a[0]', '5', '10+2+3+4+5 = 24'], ['v.at(7)', '-', '-', 'throws out_of_range']] },
      complexity: `<p>Construction, indexing, subview: O(1). Iteration O(N). Size: 16 bytes on 64-bit.</p>`,
      followUps: ['Why is <code>const ArrayView&lt;int&gt;</code> still able to modify elements? (shallow const, like span)', 'What happens if you construct an ArrayView from a temporary vector and keep it?', 'Add a fixed-extent version like <code>std::span&lt;T, N&gt;</code>']
    }
  });

  practice.push({
    title: 'Bug Hunt Gauntlet: Five Lifetime Bugs in One Program',
    level: 'Hard', tags: ['dangling', 'use-after-free', 'iterator invalidation', 'bug hunt'], companies: ['Google', 'Microsoft', 'Meta', 'Mozilla'],
    statement: `<p>This "inventory" program has <b>five</b> lifetime bugs. Find each one, name the bug class, and rewrite the program correctly.</p><pre>struct Item { std::string name; int qty; };
std::vector&lt;Item&gt; inv;
Item* cheapest = nullptr;

const char* label(int id) { std::string s = "item-" + std::to_string(id); return s.c_str(); }   // A
void add(std::string n, int q) { inv.push_back({n, q}); if (!cheapest) cheapest = &amp;inv.back(); } // B
std::string_view upper(std::string s) { for (auto&amp; c : s) c = toupper(c); return s; }           // C
int* stock() { int* p = new int(5); int* alias = p; delete p; return alias; }                    // D
auto counter() { int n = 0; return [&amp;] { return ++n; }; }                                      // E</pre>`,
    constraints: `<p>Keep the same features. No raw <code>new</code>/<code>delete</code> in the fixed version.</p>`,
    example: `<p>${H.table(['line', 'bug class', 'object that died'], [['A', 'pointer into a dead local', 's (and its buffer)'], ['B', 'pointer into a growing vector', 'old vector buffer after reallocation'], ['C', 'view of a dead parameter', 'parameter s'], ['D', 'use-after-free via alias', 'heap int'], ['E', 'lambda captures a dead local by reference', 'n']])}`,
    brute: { why: `<p>Adding null checks everywhere (<code>if (cheapest)</code>, <code>if (p)</code>) fixes nothing: dangling pointers are <b>not null</b>. Turning locals into <code>static</code> to "keep them alive" introduces shared state and breaks reentrancy. These are the most common non-fixes seen in code review.</p>`, code: { lang: 'cpp', code: `#include <string>
// Non-fix: static buffer keeps the address valid but every call overwrites it
const char* labelStatic(int id) {
    static std::string s;
    s = "item-" + std::to_string(id);
    return s.c_str();          // label(1) and label(2) now return the SAME buffer
}` } },
    mcq: { q: 'Which single tool would report bugs B and D at runtime with stack traces of the allocation and the free?', options: ['-Wall', 'AddressSanitizer (-fsanitize=address)', 'UBSan only', 'gdb watchpoints'], answer: 1, explain: 'Both are heap-use-after-free; ASan poisons and quarantines freed heap memory and prints the access, free and allocation stacks.' },
    hints: [`<p>For every pointer/reference/view/lambda capture, ask: <i>who owns the thing it refers to, and when does that owner die?</i></p>`, `<p>A: return <code>std::string</code>. B: store an index. C: return <code>std::string</code>. D: use <code>std::unique_ptr</code> or return a value. E: capture by value with <code>mutable</code>.</p>`, `<p>After fixing, compile with <code>-Wall -Wextra -fsanitize=address,undefined</code> and add a test that inserts enough items to force several vector reallocations (that is what exposes B).</p>`],
    solution: {
      approach: `<p>Replace every non-owning handle whose target can die with either an owning value or a stable handle (index). Lambdas own their state via value capture.</p>`,
      code: { lang: 'cpp', code: `#include <cctype>
#include <cstddef>
#include <iostream>
#include <memory>
#include <optional>
#include <string>
#include <vector>

struct Item { std::string name; int qty; };
std::vector<Item> inv;
std::optional<std::size_t> cheapestIdx;            // B: index survives reallocation

std::string label(int id) { return "item-" + std::to_string(id); }      // A: owning return

void add(std::string n, int q) {
    inv.push_back({std::move(n), q});
    if (!cheapestIdx || q < inv[*cheapestIdx].qty) cheapestIdx = inv.size() - 1;
}

std::string upper(std::string s) {                 // C: return the owning string
    for (auto& c : s) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    return s;
}

std::unique_ptr<int> stock() { return std::make_unique<int>(5); }      // D: single owner

auto counter() { int n = 0; return [n]() mutable { return ++n; }; }    // E: lambda owns n

int main() {
    for (int i = 0; i < 100; ++i) add(label(i), 100 - i);   // many reallocations: still safe
    std::cout << upper(inv[*cheapestIdx].name) << '\\n';     // ITEM-99
    auto s = stock();
    auto c = counter();
    c();
    std::cout << *s << ' ' << c() << '\\n';                  // 5 2
}` },
      dry: { head: ['bug', 'before', 'after'], rows: [['A', 'const char* into dead local', 'std::string value'], ['B', 'Item* across push_back', 'optional index'], ['C', 'string_view of dead parameter', 'std::string value'], ['D', 'alias used after delete', 'unique_ptr owner'], ['E', '[&amp;] capture of dead n', '[n] mutable capture']] },
      complexity: `<p>Same asymptotics as the original; <code>add</code> is amortized O(1). The fixes add at most one string move per call.</p>`,
      followUps: ['Which of the five does <code>-Wall</code> catch at compile time with GCC 13+?', 'If <code>inv</code> were a <code>std::deque</code>, would bug B still exist?', 'How would you enforce "no raw new/delete" in CI? (clang-tidy cppcoreguidelines-owning-memory)']
    }
  });

  registerModule({
    id: 'cpp03',
    title: 'Pointers & References',
    lang: 'cpp',
    intro: `<p>Pointers are the topic that separates "I have written some C++" from "I understand C++". They are also the number one source of crashes and security bugs in the language, which is exactly why interviewers at systems, embedded, game, trading and browser companies keep asking about them.</p>
<p>This module turns pointers into a picture you can draw: <b>memory is a long row of numbered boxes</b>, an <b>address</b> is a box number, a <b>pointer</b> is a variable holding a box number, and a <b>reference</b> is a second name for an existing box. From that one picture you will work out pointer arithmetic, <code>nullptr</code>, the difference between references and pointers, where to put <code>const</code>, why arrays "forget" their size when passed to functions, and how dangling pointers happen and how to hunt them down with sanitizers.</p>
<p>Every topic has a step-by-step memory visualizer, worked examples, "predict the output" puzzles and bug hunts, plus an honest look at how AI assistants help (and mislead) with pointer code in 2026.</p>`,
    goals: [
      'Draw memory as numbered byte boxes and explain what <code>&amp;x</code>, <code>*p</code>, <code>p-&gt;m</code> and <code>**pp</code> do on that picture',
      'Predict the output of pointer-arithmetic code (<code>*p++</code>, <code>p[i]</code>, <code>p2 - p1</code>, one-past-the-end) without running it',
      'Choose between a pointer, a reference and a value for any function parameter, and explain the trade-offs in an interview',
      'Read any <code>const</code>/pointer declaration right-to-left and say exactly what may and may not be modified',
      'Explain array-to-pointer decay, its exceptions, and replace raw array parameters with <code>std::span</code>/<code>std::array</code>',
      'Find and fix dangling pointers (returned locals, use-after-free, iterator invalidation, dangling views) using reasoning plus AddressSanitizer'
    ],
    prereqs: `<p>C++ module 1 (Compilation Model, Types &amp; I/O) and C++ module 2 (Control Flow, Functions, Arrays &amp; Strings), especially pass-by-value vs pass-by-reference and C arrays vs <code>std::vector</code>.</p>`,
    hours: 12,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
