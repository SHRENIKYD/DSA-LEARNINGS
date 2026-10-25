(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function nums(input, maxLen, minLen, what) {
    var t = String(input === undefined || input === null ? '' : input).trim();
    if (!t) throw new Error('Please type ' + (what || 'some whole numbers separated by spaces') + '.');
    var a = t.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !isFinite(x) || Math.floor(x) !== x; })) {
      throw new Error('Use whole numbers separated by spaces, e.g. 3 1 4 1 5.');
    }
    if (a.length > maxLen) throw new Error('Please keep it to at most ' + maxLen + ' numbers so the picture fits.');
    if (a.length < (minLen || 1)) throw new Error('Please give at least ' + (minLen || 1) + ' numbers.');
    return a;
  }
  function one(i, cls) { var h = {}; h[i] = cls; return h; }
  function rangeHl(lo, hi, cls, base) {
    var h = base || {};
    for (var k = lo; k <= hi; k++) h[k] = cls;
    return h;
  }
  function copyGrid(g) { return g.map(function (r) { return r.slice(); }); }
  function parseMatrix(text, maxR, maxC) {
    var rows = String(text === undefined || text === null ? '' : text).trim().split(';').map(function (r) { return r.trim(); }).filter(function (r) { return r.length; });
    if (!rows.length) throw new Error('Type the matrix row by row, rows separated by ";" e.g. 1 2 3; 4 5 6');
    var m = rows.map(function (r) {
      var a = r.split(/[\s,]+/).map(Number);
      if (a.some(function (x) { return !isFinite(x) || Math.floor(x) !== x; })) throw new Error('Matrix cells must be whole numbers, rows separated by ";" e.g. 1 2 3; 4 5 6');
      return a;
    });
    var C = m[0].length;
    if (m.some(function (r) { return r.length !== C; })) throw new Error('Every row must have the same number of values.');
    if (m.length > maxR || C > maxC) throw new Error('Please keep the matrix at most ' + maxR + ' × ' + maxC + '.');
    return m;
  }
  function heads(n, start) { var h = []; for (var i = 0; i < n; i++) h.push(String(i + (start || 0))); return h; }

  // =====================================================================
  // TOPIC 1 — 1D and 2D arrays
  // =====================================================================
  topics.push({
    title: '1D and 2D Arrays (How They Sit in Memory)',
    analogy: `<p>Think of a <b>school corridor with numbered lockers</b> standing shoulder to shoulder: locker 0, locker 1, locker 2... If you know the locker number you walk <b>straight</b> to it. You never open lockers 0 to 6 to reach locker 7. That is a <b>1D array</b>.</p>
      <p>Now think of an <b>apartment building</b>: floor number + flat number ("floor 2, flat 3"). That is a <b>2D array</b>: a row number and a column number.</p>`,
    explain: `<p><b>What is an array?</b> It is a row of boxes of the <b>same type</b> placed <b>right next to each other</b> in memory. Because the boxes touch each other, the computer finds box <code>i</code> with one small calculation:</p>
      <p><code>address of a[i] = start address + i × (size of one box)</code></p>
      <p>An <code>int</code> takes 4 bytes. If the array starts at address 1000:</p>
      ${H.table(['index i', 'value', 'address = 1000 + 4·i'], [['0', '7', '1000'], ['1', '3', '1004'], ['2', '9', '1008'], ['3', '4', '1012']])}
      <p>That one multiplication is why reading <code>a[i]</code> is <b>O(1)</b> — the same speed for index 2 or index 2,000,000.</p>
      ${H.arr([7, 3, 9, 4], { label: 'int[] a', hl: { 2: 'y' }, ptr: { 2: 'a[2]' } })}
      <h4>Facts you must know (in your language)</h4>
      <ul>
        <li><b>Creating N zeros:</b> Java <code>new int[5]</code> (all <b>0</b>; booleans start <code>false</code>, objects <code>null</code>), Python <code>[0] * 5</code>, JS <code>new Array(5).fill(0)</code>, C++ <code>vector&lt;int&gt; a(5)</code>.</li>
        <li><b>Size:</b> Java <code>a.length</code> (a field, no brackets), Python <code>len(a)</code>, JS <code>a.length</code>, C++ <code>a.size()</code>. A Java array has a <b>fixed</b> size; Python lists, JS arrays and C++ vectors can grow at the end.</li>
        <li>Valid indices are <code>0</code> to <code>length - 1</code>. Touching <code>a[length]</code> throws in Java (<code>ArrayIndexOutOfBoundsException</code>) and Python (<code>IndexError</code>), quietly gives <code>undefined</code> in JS, and is undefined behaviour in C++.</li>
      </ul>
      <h4>2D arrays: rows and columns</h4>
      <p>A grid with <b>3 rows</b> and <b>4 columns</b>: Java <code>new int[3][4]</code>, Python <code>[[0] * 4 for _ in range(3)]</code>, JS <code>Array.from({length: 3}, () =&gt; new Array(4).fill(0))</code>, C++ <code>vector&lt;vector&lt;int&gt;&gt; g(3, vector&lt;int&gt;(4))</code>. The number of rows is <code>g.length</code> / <code>len(g)</code> / <code>g.size()</code> (3); the number of columns is the length of row 0 (4).</p>
      <p>In maths (and in C) a matrix is stored <b>row-major</b>: row 0 first, then row 1, then row 2, all in one long line. Cell <code>(r, c)</code> lives at flat position <code>r × COLS + c</code>:</p>
      ${H.table(['cell (r,c)', 'r × 4 + c', 'flat index'], [['(0,0)', '0·4+0', '0'], ['(0,3)', '0·4+3', '3'], ['(1,0)', '1·4+0', '<span class="c-y">4</span>'], ['(2,1)', '2·4+1', '9']])}
      <p>In <b>Java, Python and JS</b> (and a C++ <code>vector</code> of vectors), a 2D array is really an <b>array of arrays</b>: <code>g</code> holds 3 references, and each reference points to its own row of 4 ints. (A built-in C++ array <code>int g[3][4]</code> is one true row-major block.) Each row's ints are next to each other, so walking <b>row by row</b> (outer loop on <code>r</code>, inner loop on <code>c</code>) is the fast, cache-friendly order. Because rows are separate objects, rows may also have different lengths (<b>jagged</b> arrays).</p>`,
    clues: [
      '"Given an array of N integers" / "access the i-th element" → arrays give O(1) access by index.',
      '"Given an N × M matrix / grid" → a 2D array (list of lists); rows = number of rows of <code>g</code>, cols = length of <code>g[0]</code>.',
      '"Flatten the matrix" / "treat the grid as one list" / "binary search on a sorted matrix" → use <code>index = r × M + c</code>, and back: <code>r = index / M</code>, <code>c = index % M</code>.',
      '<code>N ≤ 10<sup>6</sup></code> numbers → a 32-bit int array (4 MB) fits easily; sums of many values may need a 64-bit integer (<code>long</code> / <code>long long</code>).',
      '"Rows of different lengths" (e.g. Pascal\'s triangle) → a jagged array: build each row with its own length.'
    ],
    code: { lang: 'java', code: `
      class ArrayBasics {
          public static void main(String[] args) {
              // ---- 1D array: 5 boxes side by side, all start at 0 ----
              int[] a = new int[5];
              a[0] = 7;                          // O(1): jump straight to box 0
              int[] b = {3, 1, 4, 1, 5};         // declare and fill in one go
              System.out.println(b.length);      // 5  (length is a field, not a method)

              // ---- 2D array: 3 rows, 4 columns ----
              int[][] g = new int[3][4];
              int rows = g.length;               // 3
              int cols = g[0].length;            // 4
              for (int r = 0; r < rows; r++) {   // row by row = cache friendly
                  for (int c = 0; c < cols; c++) {
                      g[r][c] = r * cols + c;    // the row-major "flat index" of (r, c)
                  }
              }

              // ---- Going back from a flat index to (row, col) ----
              int flat = 9;
              int r = flat / cols, c = flat % cols;   // 9 / 4 = 2, 9 % 4 = 1  -> (2, 1)
              System.out.println(r + "," + c + " holds " + g[r][c]);

              // ---- Jagged array: each row can have a different length ----
              int[][] tri = new int[3][];
              for (int i = 0; i < 3; i++) tri[i] = new int[i + 1];  // lengths 1, 2, 3
              System.out.println(Arrays.toString(b) + " " + Arrays.deepToString(g) + " " + tri[2].length);
          }
      }`, alt: [
        { lang: 'python', run: true, code: `# ---- 1D: a Python list is a dynamic array of references ----
a = [0] * 5                          # 5 slots, all 0
a[0] = 7                             # O(1): jump straight to slot 0
b = [3, 1, 4, 1, 5]
print(len(b))                        # 5

# ---- 2D: 3 rows, 4 columns, one new list per row ----
rows, cols = 3, 4
g = [[0] * cols for _ in range(rows)]   # NOT [[0] * cols] * rows: that repeats ONE row object
for r in range(rows):                # row by row = cache friendly
    for c in range(cols):
        g[r][c] = r * cols + c       # the row-major "flat index" of (r, c)

# ---- Going back from a flat index to (row, col) ----
flat = 9
r, c = divmod(flat, cols)            # 9 // 4 = 2, 9 % 4 = 1 -> (2, 1)
print(f"{r},{c} holds {g[r][c]}")

# ---- Jagged: each row can have a different length ----
tri = [[0] * (i + 1) for i in range(3)]   # lengths 1, 2, 3
print(b, g, len(tri[2]))` },
        { lang: 'js', run: true, code: `// ---- 1D: a JS array (typed arrays like Int32Array are fixed-size and packed) ----
const a = new Array(5).fill(0);      // 5 slots, all 0
a[0] = 7;                            // O(1): jump straight to slot 0
const b = [3, 1, 4, 1, 5];
console.log(b.length);               // 5

// ---- 2D: 3 rows, 4 columns, one new array per row ----
const rows = 3, cols = 4;
const g = Array.from({ length: rows }, () => new Array(cols).fill(0));  // not new Array(rows).fill(row): that shares one row
for (let r = 0; r < rows; r++) {     // row by row = cache friendly
  for (let c = 0; c < cols; c++) {
    g[r][c] = r * cols + c;          // the row-major "flat index" of (r, c)
  }
}

// ---- Going back from a flat index to (row, col) ----
const flat = 9;
const r = Math.floor(flat / cols), c = flat % cols;   // 9 / 4 -> 2, 9 % 4 = 1 -> (2, 1)
console.log(\`\${r},\${c} holds \${g[r][c]}\`);

// ---- Jagged: each row can have a different length ----
const tri = Array.from({ length: 3 }, (_, i) => new Array(i + 1).fill(0));  // lengths 1, 2, 3
console.log(JSON.stringify(b), JSON.stringify(g), tri[2].length);` },
        { lang: 'cpp', code: `int main() {
    // ---- 1D: vector<int> is a growable array; int a[5] would be a fixed one ----
    vector<int> a(5, 0);                 // 5 boxes, all 0
    a[0] = 7;                            // O(1): jump straight to box 0 (no bounds check; a.at(i) checks)
    vector<int> b = {3, 1, 4, 1, 5};
    cout << b.size() << "\\n";            // 5

    // ---- 2D: 3 rows, 4 columns ----
    int rows = 3, cols = 4;
    vector<vector<int>> g(rows, vector<int>(cols, 0));   // each row is its own vector
    for (int r = 0; r < rows; r++)       // row by row = cache friendly
        for (int c = 0; c < cols; c++)
            g[r][c] = r * cols + c;      // the row-major "flat index" of (r, c)
    int fixed[3][4] = {};                // a built-in 2D array is ONE block, truly row-major
    fixed[2][1] = 9;

    // ---- Going back from a flat index to (row, col) ----
    int flat = 9;
    int r = flat / cols, c = flat % cols;   // 9 / 4 = 2, 9 % 4 = 1 -> (2, 1)
    cout << r << "," << c << " holds " << g[r][c] << " " << fixed[2][1] << "\\n";

    // ---- Jagged: each row can have a different length ----
    vector<vector<int>> tri(3);
    for (int i = 0; i < 3; i++) tri[i].assign(i + 1, 0);   // lengths 1, 2, 3
    cout << tri[2].size() << "\\n";
    return 0;
}` }, { lang: 'csharp', code: String.raw`
using System;

class ArrayBasics {
    static void Main() {
        // ---- 1D array: 5 boxes side by side, all start at 0 ----
        int[] a = new int[5];
        a[0] = 7;                          // O(1): jump straight to box 0 (bounds-checked: a[5] throws)
        int[] b = { 3, 1, 4, 1, 5 };       // declare and fill in one go
        Console.WriteLine(b.Length);       // 5  (Length is a property, not a method)

        // ---- 2D jagged array: 3 rows, 4 columns (int[,] would be one rectangular block) ----
        int[][] g = new int[3][];
        for (int i = 0; i < 3; i++) g[i] = new int[4];
        int rows = g.Length;               // 3
        int cols = g[0].Length;            // 4
        for (int r = 0; r < rows; r++) {   // row by row = cache friendly
            for (int c = 0; c < cols; c++) {
                g[r][c] = r * cols + c;    // the row-major "flat index" of (r, c)
            }
        }

        // ---- Going back from a flat index to (row, col) ----
        int flat = 9;
        int fr = flat / cols, fc = flat % cols;   // 9 / 4 = 2, 9 % 4 = 1  -> (2, 1)
        Console.WriteLine(fr + "," + fc + " holds " + g[fr][fc]);

        // ---- Jagged array: each row can have a different length ----
        int[][] tri = new int[3][];
        for (int i = 0; i < 3; i++) tri[i] = new int[i + 1];  // lengths 1, 2, 3
        Console.WriteLine("[" + string.Join(", ", b) + "] " + tri[2].Length);
    }
}`, run: true }
      ] },
    codeTitle: 'Declaring, filling and walking 1D / 2D arrays',
    viz: {
      title: 'Row-major layout: where each matrix cell lands in one long line',
      input: '3 4',
      inputLabel: 'rows cols (each 1..4)',
      gen: function (input) {
        var rc = nums(input, 2, 2, 'two numbers: rows and columns, e.g. 3 4');
        var R = rc[0], C = rc[1];
        if (R < 1 || C < 1 || R > 4 || C > 4) throw new Error('Rows and columns must each be between 1 and 4.');
        var grid = [], flat = [];
        for (var r = 0; r < R; r++) { grid.push([]); for (var c = 0; c < C; c++) { grid[r].push(10 * (r + 1) + c); flat.push(10 * (r + 1) + c); } }
        var frames = [];
        frames.push({ narr: 'Here is a ' + R + ' × ' + C + ' matrix. Each value is written as "row digit + column digit" so you can spot it later (row 0 → 1x, row 1 → 2x...). Memory, however, is <b>one long line</b>. Let us see where each cell goes.', parts: [
          { type: 'grid', label: 'int[][] g (' + R + ' rows × ' + C + ' cols)', rows: copyGrid(grid), rowHead: heads(R), colHead: heads(C) },
          { type: 'array', label: 'one long line of memory (empty so far)', values: flat.map(function () { return ''; }), showIdx: true }
        ] });
        var placed = flat.map(function () { return ''; });
        for (r = 0; r < R; r++) {
          for (c = 0; c < C; c++) {
            var idx = r * C + c;
            placed[idx] = grid[r][c];
            var ghl = {};
            for (var rr = 0; rr < R; rr++) for (var cc = 0; cc < C; cc++) if (rr * C + cc < idx) ghl[rr + ',' + cc] = 'done';
            ghl[r + ',' + c] = 'cur';
            var ahl = {};
            for (var k = 0; k < idx; k++) ahl[k] = 'done';
            ahl[idx] = 'cur';
            frames.push({
              narr: 'Cell (' + r + ', ' + c + ') goes to flat index <b>' + r + ' × ' + C + ' + ' + c + ' = ' + idx + '</b>. ' + (c === 0 && r > 0 ? 'A new row starts right after the previous row ends — that is what "row-major" means.' : 'Same row, so it sits right next to the previous cell.'),
              parts: [
                { type: 'grid', label: 'matrix', rows: copyGrid(grid), rowHead: heads(R), colHead: heads(C), hl: ghl },
                { type: 'array', label: 'flat memory', values: placed.slice(), hl: ahl, ptr: one(idx, 'r·' + C + '+c') },
                { type: 'vars', vals: { r: r, c: c, COLS: C, 'flat = r*COLS+c': idx } }
              ]
            });
          }
        }
        var last = R * C - 1;
        frames.push({ narr: 'Going back is easy too: flat index ' + last + ' → row = ' + last + ' / ' + C + ' = <b>' + Math.floor(last / C) + '</b>, col = ' + last + ' % ' + C + ' = <b>' + (last % C) + '</b>. This trick lets you binary-search a matrix as if it were one sorted list.', parts: [
          { type: 'array', label: 'flat memory', values: placed.slice(), hl: one(last, 'sel') },
          { type: 'vars', vals: { index: last, 'row = index / COLS': Math.floor(last / C), 'col = index % COLS': last % C } }
        ] });
        var javaParts = [{ type: 'text', html: '<b>Java / Python / JS reality:</b> <code>g</code> is an array of ' + R + ' references. Each reference points to its own row array below. Values inside a row are side by side; different rows may live in different places.' }];
        for (r = 0; r < R; r++) javaParts.push({ type: 'array', label: 'g[' + r + ']', values: grid[r].slice() });
        frames.push({ narr: 'In Java, Python and JS a 2D array is an <b>array of arrays</b> (a C++ <code>int g[R][C]</code> is one flat block instead). That is why rows can even have different lengths (jagged arrays), and why looping row by row is the fast direction.', parts: javaParts });
        return frames;
      }
    },
    examples: [
      { title: 'Default values and the off-by-one trap', html: `<p><code>int[] a = new int[4];</code> gives ${H.arr([0, 0, 0, 0], { label: 'a' })} The valid indices are 0, 1, 2, 3. A loop written as <code>for (i = 0; i &lt;= a.length; i++)</code> runs <b>five</b> times and the fifth time touches <code>a[4]</code> → ${H.c('r', 'ArrayIndexOutOfBoundsException')}. Always loop with <code>i &lt; a.length</code> (Python: <code>range(len(a))</code>). Python raises <code>IndexError</code>, JS silently returns <code>undefined</code>, C++ has undefined behaviour. Java defaults: <code>double</code> → 0.0, <code>boolean</code> → false, <code>char</code> → '\\u0000', <code>String</code>/objects → null (so <code>new String[3]</code> holds three nulls, and calling <code>.length()</code> on one crashes).</p>`, code: { lang: 'java', code: `int[] a = new int[4];
for (int i = 0; i < a.length; i++) a[i] = i * i;   // 0 1 4 9 — never i <= a.length
String[] names = new String[3];                      // [null, null, null]
System.out.println(Arrays.toString(a) + " " + Arrays.toString(names));`, alt: [
        { lang: 'python', run: true, code: `a = [0] * 4
for i in range(len(a)):          # range(len(a)) stops at len(a) - 1
    a[i] = i * i                 # 0 1 4 9
names = [None] * 3               # [None, None, None]
print(a, names)
try:
    a[4] = 1                     # one past the end
except IndexError as e:
    print("IndexError:", e)
print(a[-1])                     # 9: negative indices count from the end in Python` },
        { lang: 'js', run: true, code: `const a = new Array(4).fill(0);
for (let i = 0; i < a.length; i++) a[i] = i * i;   // 0 1 4 9, never i <= a.length
const names = new Array(3).fill(null);             // [null, null, null]
console.log(JSON.stringify(a), JSON.stringify(names));
console.log(a[4]);   // undefined: JS does not throw, the bug just hides` },
        { lang: 'cpp', code: `vector<int> a(4);                         // value-initialised: all 0
for (size_t i = 0; i < a.size(); i++) a[i] = i * i;   // 0 1 4 9, never i <= a.size()
vector<string> names(3);                  // three empty strings
int raw[4];                               // a plain local array is NOT zeroed: garbage values
cout << a[3] << " " << names[0].size() << "\\n";
// a[4] is undefined behaviour (no exception); a.at(4) throws std::out_of_range` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[] a = new int[4];
        for (int i = 0; i < a.Length; i++) a[i] = i * i;   // 0 1 4 9 - never i <= a.Length
        string[] names = new string[3];                      // [null, null, null]
        Console.WriteLine("[" + string.Join(", ", a) + "] " + (names[0] == null));
        try { a[4] = 1; } catch (IndexOutOfRangeException e) { Console.WriteLine(e.Message); }   // one past the end
    }
}`, run: true }
      ] } },
      { title: 'Arrays are references: copying is not cloning', html: `<p><code>int[] b = a;</code> does <b>not</b> copy the boxes — both names now point to the <b>same</b> array, like two people holding keys to one locker row. Change <code>b[0]</code> and <code>a[0]</code> changes too. To get a real copy use <code>a.clone()</code> or <code>Arrays.copyOf(a, a.length)</code> in Java, <code>a.copy()</code> or <code>a[:]</code> in Python, <code>[...a]</code> in JS. (C++ is the opposite: <code>vector&lt;int&gt; b = a;</code> <b>does</b> copy, and you write <code>auto&amp; b = a;</code> to share.)</p>
        ${H.table(['code', 'a after', 'b after', 'why'], [['int[] b = a; b[0] = 99;', H.c('r', '[99, 2, 3]'), '[99, 2, 3]', 'same object'], ['int[] b = a.clone(); b[0] = 99;', H.c('g', '[1, 2, 3]'), '[99, 2, 3]', 'separate object']])}
        <p>For a 2D array, <code>g.clone()</code> (Python <code>g[:]</code>, JS <code>[...g]</code>) copies only the outer array of row references — the rows are still shared (a <b>shallow</b> copy). Copy each row to get a deep copy.</p>`, code: { lang: 'java', code: `int[] a = {1, 2, 3};
int[] alias = a;          // same array, two names
int[] copy = a.clone();   // brand-new array with the same values
alias[0] = 99;
System.out.println(a[0] + " " + copy[0]);   // 99 1`, alt: [
        { lang: 'python', run: true, code: `a = [1, 2, 3]
alias = a              # same list, two names
copy = a.copy()        # new list with the same values (also a[:] or list(a))
alias[0] = 99
print(a[0], copy[0])   # 99 1
g = [[1, 2], [3, 4]]
deep = [row[:] for row in g]   # copy each row; copy.deepcopy(g) also works` },
        { lang: 'js', run: true, code: `const a = [1, 2, 3];
const alias = a;            // same array, two names
const copy = [...a];        // new array with the same values (also a.slice())
alias[0] = 99;
console.log(a[0], copy[0]); // 99 1
const g = [[1, 2], [3, 4]];
const deep = g.map((row) => [...row]);   // copy each row (or structuredClone(g))` },
        { lang: 'cpp', code: `vector<int> a = {1, 2, 3};
vector<int>& alias = a;     // a reference: same vector, two names
vector<int> copy = a;       // plain assignment COPIES a vector in C++
alias[0] = 99;
cout << a[0] << " " << copy[0] << "\\n";   // 99 1
// passing vector<int> by value copies it too; pass const vector<int>& to avoid that` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[] a = { 1, 2, 3 };
        int[] alias = a;                // same array, two names
        int[] copy = (int[])a.Clone();  // brand-new array with the same values
        alias[0] = 99;
        Console.WriteLine(a[0] + " " + copy[0]);   // 99 1
        // Clone on int[][] copies only the outer array: the rows stay shared
    }
}`, run: true }
      ] } },
      { title: 'Flat index ↔ (row, col) in a 3 × 4 grid', html: `<p>Flat index 7 in a grid with 4 columns: row = 7 / 4 = <b>1</b>, col = 7 % 4 = <b>3</b>. Back again: 1 × 4 + 3 = 7 ✔. This is how "Search a 2D Matrix" binary-searches a whole matrix as if it were one sorted list of 12 numbers, and how BFS on a grid can store a cell as one <code>int</code> instead of a pair.</p>
        ${H.table(['flat', 'row = flat / 4', 'col = flat % 4'], [['0', '0', '0'], ['5', '1', '1'], ['7', '1', H.c('y', '3')], ['11', '2', '3']])}` },
      { title: 'Walking order matters for speed', html: `<p>Summing a 2000 × 2000 matrix row by row (<code>g[r][c]</code> with c in the inner loop) reads memory in a straight line, so the CPU cache pre-loads the next numbers for free. Swapping the loops (r in the inner loop) jumps to a different row array on every step; on typical hardware this is several times slower even though both are O(R × C). Big-O is the same — real time is not.</p>` }
    ],
    deepDive: `<h4>Why O(1) access really works</h4><p>The address formula <code>base + i × size</code> is one multiply and one add, done by the CPU in a single instruction. That is why arrays are the backbone of almost every other structure: heaps, hash tables, dynamic arrays (<code>ArrayList</code> / Python <code>list</code> / JS <code>Array</code> / C++ <code>vector</code>), and even graphs stored as adjacency arrays.</p>
      <h4>Memory picture (Java)</h4><ul><li>The array <b>object</b> lives on the heap with a small header (about 16 bytes: class pointer, length). The variable <code>a</code> on the stack holds only a reference.</li><li><code>int[]</code> of 10<sup>6</sup> elements ≈ 4 MB. <code>Integer[]</code> of 10<sup>6</sup> elements ≈ 4 MB of references <b>plus</b> 16 MB of boxed objects scattered around the heap — slower and bigger. Prefer primitive arrays in DSA code.</li><li><code>int[][] g = new int[1000][1000]</code> creates 1001 objects (outer + 1000 rows). A single flat <code>int[1000 * 1000]</code> indexed by <code>r * C + c</code> is one object and can be faster for huge grids.</li></ul>
      <h4>Other languages</h4><ul><li><b>Python:</b> a <code>list</code> stores references to int objects (about 28 bytes each plus an 8-byte slot), so 10<sup>6</sup> ints cost ~36 MB. <code>array('i')</code> or NumPy store raw 4-byte values.</li><li><b>JS:</b> engines keep small-integer arrays packed, but mixing types or leaving holes makes them slower; <code>Int32Array</code> / <code>Float64Array</code> are fixed-size raw buffers.</li><li><b>C++:</b> <code>vector&lt;int&gt;</code> is one contiguous block with no per-element header; <code>vector&lt;vector&lt;int&gt;&gt;</code> is one block per row, like Java.</li></ul>
      <h4>Insert / delete cost</h4><p>Arrays have a fixed size, so "inserting" at index i means shifting everything after i one step right: O(N). That is why inserting at the front (<code>list.add(0, x)</code>, <code>list.insert(0, x)</code>, <code>arr.unshift(x)</code>, <code>v.insert(v.begin(), x)</code>) is O(N) while appending at the end is O(1) amortized (it doubles capacity when full; the total copying over N appends is at most about 2N).</p>
      <h4>Reversal tricks</h4><p>Many in-place array problems reduce to reversing parts: rotate right by k = reverse all, reverse first k, reverse the rest. Each reverse is a two-pointer swap loop, O(N) time and O(1) space.</p>
      <h4>Limits</h4><p>In Java an array length is an <code>int</code>, so at most about 2<sup>31</sup> − 1 elements (in practice a bit less). <code>new int[n]</code> with negative n throws <code>NegativeArraySizeException</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant writes array boilerplate (reading input, nested loops, printing an array) instantly, so you no longer get credit for typing loops. Interviewers now probe <b>understanding</b>: why is access O(1), what does <code>b = a</code> share, why is a column-wise walk slower?</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 6 tricky inputs for an array rotation function (k = 0, k &gt; n, n = 1, negatives), don't solve it</code>, or <code>Explain what this line allocates on the heap</code>. Generating edge cases is where AI saves you real time.</p>
      <p><b>Where AI goes wrong:</b> it mixes up <code>a.length</code> / <code>s.length()</code> / <code>list.size()</code> / <code>len(a)</code>, writes <code>&lt;=</code> loop bounds, forgets <code>k %= n</code>, or "copies" arrays with plain assignment. It also confuses rows and columns on non-square grids.</p>
      <p><b>What you must still own:</b> drawing the indices by hand for a 2 × 3 grid, spotting aliasing bugs, and choosing a 64-bit integer when values add up past 2.1 × 10<sup>9</sup>.</p>`,
    problems: [{
      title: 'Rotate Array to the Right by K Steps',
      level: 'Medium',
      tags: ['array', 'in-place', 'reversal', 'two pointers'],
      companies: ['Microsoft', 'Amazon', 'Bloomberg'],
      statement: `<p>Given an integer array <code>A</code>, rotate it to the <b>right</b> by <code>k</code> steps, in place (modify A, return nothing). Rotating right by one step moves the last element to the front.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −2<sup>31</sup> ≤ A[i] ≤ 2<sup>31</sup> − 1, 0 ≤ k ≤ 10<sup>9</sup>. Try for O(1) extra space.`,
      example: `${H.arr([1, 2, 3, 4, 5, 6, 7], { label: 'A', hl: { 4: 'y', 5: 'y', 6: 'y' } })}<p>k = 3 → ${H.arr([5, 6, 7, 1, 2, 3, 4], { label: 'result', hl: { 0: 'y', 1: 'y', 2: 'y' } })} The last 3 elements (amber) wrap around to the front, the rest slide right by 3. With k = 10 the answer is the same as k = 3 because rotating by 7 (= N) does nothing.</p>`,
      brute: {
        why: `<p>Rotate by one step, k times: each step shifts all N elements, so the cost is O(N × k) — up to 10<sup>5</sup> × 10<sup>9</sup>. Even with k reduced to k % N it is O(N<sup>2</sup>) in the worst case. The waste: every element moves one slot at a time instead of jumping straight to its final spot.</p>`,
        code: { lang: 'java', code: `
          void bruteRotate(int[] A, int k) {
              int n = A.length;
              k %= n;
              for (int step = 0; step < k; step++) {
                  int last = A[n - 1];                       // remember the last element
                  for (int i = n - 1; i > 0; i--) A[i] = A[i - 1];  // shift everyone right by one
                  A[0] = last;                               // last goes to the front
              }
          }`, alt: [{ lang: 'python', code: String.raw`
def rotate(a, k):
    n = len(a)
    k %= n
    for _ in range(k):
        last = a[n - 1]                          # remember the last element
        for i in range(n - 1, 0, -1):
            a[i] = a[i - 1]                      # shift everyone right by one
        a[0] = last                              # last goes to the front` }, { lang: 'js', code: String.raw`
function rotate(A, k) {
  const n = A.length;
  k %= n;
  for (let step = 0; step < k; step++) {
    const last = A[n - 1];                       // remember the last element
    for (let i = n - 1; i > 0; i--) A[i] = A[i - 1];   // shift everyone right by one
    A[0] = last;                                 // last goes to the front
  }
}` }, { lang: 'cpp', code: String.raw`
void rotate(vector<int>& A, int k) {
    int n = A.size();
    k %= n;
    for (int step = 0; step < k; step++) {
        int last = A[n - 1];                     // remember the last element
        for (int i = n - 1; i > 0; i--) A[i] = A[i - 1];   // shift everyone right by one
        A[0] = last;                             // last goes to the front
    }
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void Rotate(int[] A, int k) {
        int n = A.Length;
        k %= n;
        for (int step = 0; step < k; step++) {
            int last = A[n - 1];                       // remember the last element
            for (int i = n - 1; i > 0; i--) A[i] = A[i - 1];  // shift everyone right by one
            A[0] = last;                               // last goes to the front
        }
    }
}` }] }
      },
      mcq: {
        q: `<p>A = [1, 2, 3, 4, 5], k = 2. After <b>reversing the whole array</b> you have [5, 4, 3, 2, 1]. What two reversals finish the job?</p>`,
        options: ['Reverse indices 0..1 and 2..4', 'Reverse indices 0..2 and 3..4', 'Reverse indices 0..3 and 4..4', 'No more reversals needed'],
        answer: 0,
        explain: `<p>Reverse the first k = 2 ([5, 4] → [4, 5]) and the remaining N − k = 3 ([3, 2, 1] → [1, 2, 3]) to get [4, 5, 1, 2, 3], which is the original rotated right by 2.</p>`
      },
      hints: [
        `<p><b>Aha:</b> after rotation the last k elements come first, but each block keeps its inner order. Reversing the whole array puts the blocks in the right place but with their insides backwards.</p>`,
        `<p>Write a helper <code>reverse(A, lo, hi)</code> using two pointers that swap and walk inward. Call it three times. No extra array needed.</p>`,
        `<p><b>Traps:</b> k can be larger than N → do <code>k %= n</code> first (k = 0 after that means nothing to do). Rotating left is the mirror: reverse first k, reverse rest, reverse all.<br><b>Recipe:</b> k %= n; reverse(0, n−1); reverse(0, k−1); reverse(k, n−1).</p>`
      ],
      tests: { sig: 'int[] int -> void', fn: 'rotate', mutate: 0, cases: [
        [[[1, 2, 3, 4, 5, 6, 7], 3], [5, 6, 7, 1, 2, 3, 4]],
        [[[1, 2, 3, 4, 5, 6, 7], 10], [5, 6, 7, 1, 2, 3, 4]],
        [[[1], 0], [1]],
        [[[1], 5], [1]],
        [[[1, 2], 1], [2, 1]],
        [[[-1, -100, 3, 99], 2], [3, 99, -1, -100]],
        [[[1, 2, 3], 3], [1, 2, 3]],
        [[[2147483647, -2147483648, 0], 1000000000], [0, 2147483647, -2147483648]],
        [[[1, 2, 3, 4, 5, 6], 4], [3, 4, 5, 6, 1, 2]]
      ] },
      solution: {
        approach: `<p>Three reversals: whole array, then the first k, then the last N − k. Each element is swapped at most twice, so it is O(N) time and O(1) space.</p>`,
        code: `
          class Solution {
              public void rotate(int[] A, int k) {
                  int n = A.length;
                  k %= n;                       // rotating by n is a full circle: no change
                  reverse(A, 0, n - 1);         // 1 2 3 4 5 6 7 -> 7 6 5 4 3 2 1
                  reverse(A, 0, k - 1);         // first k back in order: 5 6 7 | 4 3 2 1
                  reverse(A, k, n - 1);         // rest back in order:    5 6 7 | 1 2 3 4
              }

              private void reverse(int[] A, int lo, int hi) {
                  while (lo < hi) {             // two pointers walk toward each other
                      int t = A[lo];
                      A[lo] = A[hi];
                      A[hi] = t;
                      lo++;
                      hi--;
                  }
              }

              public static void main(String[] args) {
                  int[] A = {1, 2, 3, 4, 5, 6, 7};
                  new Solution().rotate(A, 3);
                  System.out.println(Arrays.toString(A));   // [5, 6, 7, 1, 2, 3, 4]
              }
          }`,
        alt: [
          { lang: 'python', code: `def rotate(a, k):
    n = len(a)
    k %= n
    def rev(lo, hi):
        while lo < hi:
            a[lo], a[hi] = a[hi], a[lo]
            lo += 1
            hi -= 1
    rev(0, n - 1)
    rev(0, k - 1)
    rev(k, n - 1)

arr = [1, 2, 3, 4, 5, 6, 7]
rotate(arr, 3)
print(arr)` },
          { lang: 'js', code: `function rotate(A, k) {
  const n = A.length;
  k %= n;                                   // a full circle changes nothing
  const reverse = (lo, hi) => {
    for (; lo < hi; lo++, hi--) [A[lo], A[hi]] = [A[hi], A[lo]];
  };
  reverse(0, n - 1);                        // whole array
  reverse(0, k - 1);                        // first k back in order
  reverse(k, n - 1);                        // the rest back in order
}` },
          { lang: 'cpp', code: `class Solution {
public:
    void rotate(vector<int>& A, int k) {
        int n = A.size();
        k %= n;                                  // a full circle changes nothing
        reverse(A.begin(), A.end());             // whole array
        reverse(A.begin(), A.begin() + k);       // first k back in order
        reverse(A.begin() + k, A.end());         // the rest back in order
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void Rotate(int[] A, int k) {
        int n = A.Length;
        k %= n;                       // rotating by n is a full circle: no change
        Reverse(A, 0, n - 1);         // 1 2 3 4 5 6 7 -> 7 6 5 4 3 2 1
        Reverse(A, 0, k - 1);         // first k back in order: 5 6 7 | 4 3 2 1
        Reverse(A, k, n - 1);         // rest back in order:    5 6 7 | 1 2 3 4
    }

    private void Reverse(int[] A, int lo, int hi) {
        while (lo < hi) {             // two pointers walk toward each other
            int t = A[lo];
            A[lo] = A[hi];
            A[hi] = t;
            lo++;
            hi--;
        }
        // built-in: Array.Reverse(A, index, LENGTH) takes a start and a count
    }
}` }
        ],
        dry: {
          head: ['step', 'operation', 'array after'],
          rows: [
            ['0', 'k = 3 % 7 = 3', '[1, 2, 3, 4, 5, 6, 7]'],
            ['1', 'reverse 0..6', '[7, 6, 5, 4, 3, 2, 1]'],
            ['2', 'reverse 0..2', '[<span class="c-y">5, 6, 7</span>, 4, 3, 2, 1]'],
            ['3', 'reverse 3..6', '[5, 6, 7, <span class="c-g">1, 2, 3, 4</span>]']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: three reversals, each touching at most N elements. <b>Space O(1)</b>: just a temp variable for swapping.</p>`,
        followUps: ['Rotate left by k instead.', 'Do it with the cyclic-replacement (juggling / GCD) method.', 'Rotate a linked list by k (see Linked Lists module).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Prefix sums: range sum in O(1)
  // =====================================================================
  topics.push({
    title: 'Prefix Sum: Answer Any Range Sum in O(1)',
    analogy: `<p>A cricket scoreboard shows the <b>total score after each over</b>: after over 3 it says 40, after over 7 it says 95. How many runs were scored in overs 4 to 7? You do not re-add every ball — you just do <b>95 − 40 = 55</b>. The scoreboard already "remembers" all the adding for you.</p>`,
    explain: `<p>A <b>prefix sum</b> array <code>pf</code> stores running totals: <code>pf[i]</code> = <code>A[0] + A[1] + ... + A[i]</code>. You build it in one pass because each total is just the previous total plus one new number:</p>
      <p><code>pf[0] = A[0]</code> and <code>pf[i] = pf[i-1] + A[i]</code></p>
      ${H.arr([3, 1, 4, 1, 5, 9], { label: 'A' })}
      ${H.arr([3, 4, 8, 9, 14, 23], { label: 'pf', hl: { 0: 'm', 4: 'y' } })}
      <p><b>The magic subtraction.</b> The sum from <code>L</code> to <code>R</code> is "everything up to R" minus "everything before L":</p>
      <p><code>sum(L..R) = pf[R] − pf[L−1]</code> &nbsp; (and if <code>L = 0</code>, it is just <code>pf[R]</code>)</p>
      ${H.table(['query', 'pf[R]', 'pf[L−1]', 'answer', 'check by hand'], [
        ['L=1, R=4', '<span class="c-y">pf[4] = 14</span>', '<span class="c-m">pf[0] = 3</span>', '<b>11</b>', '1 + 4 + 1 + 5 = 11 ✔'],
        ['L=0, R=2', 'pf[2] = 8', '(L = 0, nothing to cut)', '<b>8</b>', '3 + 1 + 4 = 8 ✔'],
        ['L=3, R=5', 'pf[5] = 23', 'pf[2] = 8', '<b>15</b>', '1 + 5 + 9 = 15 ✔']
      ])}
      <p><b>Why it is a big deal:</b> building <code>pf</code> costs N steps <b>once</b>. After that, every query is <b>one subtraction</b>. With N = Q = 10<sup>5</sup>, plain loops need up to 10<sup>10</sup> steps; prefix sums need about 2 × 10<sup>5</sup>.</p>
      <p><b>Neat trick — the padded version:</b> make <code>pf</code> of size <code>N + 1</code> with <code>pf[0] = 0</code> and <code>pf[i+1] = pf[i] + A[i]</code>. Then <code>sum(L..R) = pf[R+1] − pf[L]</code> with no special case for <code>L = 0</code>.</p>
      <p><b>Overflow warning:</b> 10<sup>5</sup> numbers of size 10<sup>9</sup> add up to 10<sup>14</sup>, far above the 32-bit <code>int</code> limit (about 2.1 × 10<sup>9</sup>). Store <code>pf</code> as 64-bit integers: <code>long[]</code> in Java, <code>vector&lt;long long&gt;</code> in C++. Python ints never overflow, and a JS <code>Number</code> is exact up to 2<sup>53</sup> ≈ 9 × 10<sup>15</sup> (beyond that use <code>BigInt</code>). In the rest of this module, "use <code>long</code>" means "use a 64-bit integer".</p>`,
    clues: [
      '"Answer <b>Q queries</b>, each asking the sum from L to R" → build prefix sums once, answer each query in O(1).',
      '<code>N, Q ≤ 10<sup>5</sup></code> → O(N·Q) = 10<sup>10</sup> is too slow; you need O(N + Q).',
      '"The array does <b>not change</b> between queries" (static array) → prefix sums work. (If it changes, you need a Fenwick / segment tree later.)',
      '"Sum of a <b>contiguous</b> subarray / range / window" appears again and again → precompute running totals.',
      '"Total in a range of days / overs / indices" in a story problem → it is a range-sum query in disguise.'
    ],
    code: { lang: 'java', code: `
      long[] buildPrefix(int[] A) {
          long[] pf = new long[A.length + 1];   // pf[0] = 0 means "sum of nothing"
          for (int i = 0; i < A.length; i++) {
              pf[i + 1] = pf[i] + A[i];         // new total = old total + one new number
          }
          return pf;
      }

      long rangeSum(long[] pf, int L, int R) { // inclusive L..R, 0-indexed
          return pf[R + 1] - pf[L];             // "up to R" minus "before L"
      }`, alt: [
        { lang: 'python', code: `def build_prefix(a):
    pf = [0] * (len(a) + 1)        # pf[0] = 0 means "sum of nothing"
    for i, x in enumerate(a):
        pf[i + 1] = pf[i] + x      # new total = old total + one new number
    return pf                      # same as [0, *itertools.accumulate(a)]

def range_sum(pf, l, r):           # inclusive l..r, 0-indexed
    return pf[r + 1] - pf[l]       # "up to r" minus "before l"` },
        { lang: 'js', code: `function buildPrefix(A) {
  const pf = new Array(A.length + 1).fill(0);   // pf[0] = 0 means "sum of nothing"
  for (let i = 0; i < A.length; i++) {
    pf[i + 1] = pf[i] + A[i];                   // exact while totals stay below 2^53
  }
  return pf;
}

function rangeSum(pf, L, R) {   // inclusive L..R, 0-indexed
  return pf[R + 1] - pf[L];     // "up to R" minus "before L"
}` },
        { lang: 'cpp', code: `vector<long long> buildPrefix(const vector<int>& A) {
    vector<long long> pf(A.size() + 1, 0);   // pf[0] = 0 means "sum of nothing"
    for (size_t i = 0; i < A.size(); i++) {
        pf[i + 1] = pf[i] + A[i];            // long long: totals can pass 2^31
    }
    return pf;                               // or partial_sum into pf.begin() + 1
}

long long rangeSum(const vector<long long>& pf, int L, int R) {   // inclusive L..R
    return pf[R + 1] - pf[L];                // "up to R" minus "before L"
}` }, { lang: 'csharp', code: String.raw`
long[] BuildPrefix(int[] A) {
    long[] pf = new long[A.Length + 1];   // pf[0] = 0 means "sum of nothing"
    for (int i = 0; i < A.Length; i++) {
        pf[i + 1] = pf[i] + A[i];         // new total = old total + one new number (long: totals can pass 2^31)
    }
    return pf;
}

long RangeSum(long[] pf, int L, int R) { // inclusive L..R, 0-indexed
    return pf[R + 1] - pf[L];             // "up to R" minus "before L"
}` }
      ] },
    codeTitle: 'Padded prefix sum (no special case for L = 0)',
    viz: {
      title: 'Build the prefix sum bars, then answer a range query',
      input: '3 1 4 1 5 9 | 1 4',
      inputLabel: 'array | L R (0-indexed)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).split('|');
        if (s.length !== 2) throw new Error('Format: numbers | L R   e.g. 3 1 4 1 5 9 | 1 4');
        var a = nums(s[0], 12, 1);
        var q = nums(s[1], 2, 2, 'L and R after the "|"');
        var L = q[0], R = q[1];
        if (L < 0 || R >= a.length || L > R) throw new Error('Need 0 ≤ L ≤ R < ' + a.length + '.');
        var frames = [], pf = [];
        frames.push({ narr: 'We have the array. Goal: precompute running totals so any "sum from L to R" question becomes one subtraction.', parts: [
          { type: 'array', label: 'A', values: a.slice() },
          { type: 'vars', vals: { 'running total': 0 } }
        ] });
        for (var i = 0; i < a.length; i++) {
          var prev = i === 0 ? 0 : pf[i - 1];
          pf.push(prev + a[i]);
          frames.push({
            narr: i === 0 ? 'pf[0] is just A[0] = <b>' + a[0] + '</b>. Nothing came before it.' : 'pf[' + i + '] = pf[' + (i - 1) + '] + A[' + i + '] = ' + prev + ' + ' + a[i] + ' = <b>' + pf[i] + '</b>. We reuse the old total instead of re-adding everything.',
            parts: [
              { type: 'array', label: 'A', values: a.slice(), hl: rangeHl(0, i, 'done', one(i, 'cur')), ptr: one(i, 'i') },
              { type: 'bars', label: 'pf (running totals)', values: pf.slice(), hl: one(i, 'ok') },
              { type: 'vars', vals: { i: i, 'A[i]': a[i], 'pf[i]': pf[i] } }
            ]
          });
        }
        var hlA = rangeHl(L, R, 'win');
        frames.push({ narr: 'Query: sum of A[' + L + '..' + R + '] (the blue cells). Instead of looping over them, look at the bars.', parts: [
          { type: 'array', label: 'A', values: a.slice(), hl: hlA, ptr: (function () { var p = {}; p[L] = 'L'; p[R] = (L === R ? ['L', 'R'] : 'R'); return p; })() },
          { type: 'bars', label: 'pf', values: pf.slice() }
        ] });
        var bh = {}; bh[R] = 'sel'; if (L > 0) bh[L - 1] = 'bad';
        var ans = pf[R] - (L > 0 ? pf[L - 1] : 0);
        frames.push({
          narr: L > 0 ? 'pf[' + R + '] = ' + pf[R] + ' is everything from 0 to ' + R + '. pf[' + (L - 1) + '] = ' + pf[L - 1] + ' is the part <b>before</b> L that we do not want (red). Cut it off.' : 'L is 0, so there is nothing to cut off: the answer is simply pf[' + R + '].',
          parts: [
            { type: 'array', label: 'A', values: a.slice(), hl: L > 0 ? rangeHl(0, L - 1, 'bad', rangeHl(L, R, 'win')) : hlA },
            { type: 'bars', label: 'pf', values: pf.slice(), hl: bh },
            { type: 'vars', vals: { 'pf[R]': pf[R], 'pf[L-1]': L > 0 ? pf[L - 1] : '(none → 0)' } }
          ]
        });
        frames.push({
          narr: 'Answer = ' + pf[R] + ' − ' + (L > 0 ? pf[L - 1] : 0) + ' = <b>' + ans + '</b>. Check by hand: ' + a.slice(L, R + 1).join(' + ') + ' = ' + ans + '. One subtraction, no loop — that is O(1) per query.',
          parts: [
            { type: 'array', label: 'A', values: a.slice(), hl: rangeHl(L, R, 'sel') },
            { type: 'vars', label: 'result', vals: { L: L, R: R, sum: ans }, hl: { sum: 'sel' } }
          ]
        });
        return frames;
      }
    },
    examples: [
      { title: 'Negative numbers are fine', html: `<p>A = [5, −2, 3, −4]. pf = [5, 3, 6, 2]. Sum of indices 1..3 = pf[3] − pf[0] = 2 − 5 = <b>−3</b>. Check: −2 + 3 − 4 = −3 ✔. Prefix sums never assume positive values — the subtraction works for any integers. (Contrast: sliding window <i>does</i> need positives, which you will see in the next module.)</p>${H.arr([5, -2, 3, -4], { label: 'A', hl: { 1: 'b', 2: 'b', 3: 'b' } })}${H.arr([5, 3, 6, 2], { label: 'pf', hl: { 0: 'r', 3: 'g' } })}` },
      { title: 'Average rainfall over any range of days', html: `<p>Rain per day: [4, 0, 7, 3, 1, 5]. "Average rain from day 2 to day 5" = sum(2..5) / 4. With padded prefix P = [0, 4, 4, 11, 14, 15, 20]: sum = P[6] − P[2] = 20 − 4 = 16, average = <b>4.0</b>. Any "average / mean of a range" question is a range sum divided by the length <code>R − L + 1</code>.</p>`, code: { lang: 'java', code: `int[] rain = {4, 0, 7, 3, 1, 5};
long[] P = new long[rain.length + 1];
for (int i = 0; i < rain.length; i++) P[i + 1] = P[i] + rain[i];
int L = 2, R = 5;
double avg = (double) (P[R + 1] - P[L]) / (R - L + 1);
System.out.println(avg);   // 4.0`, alt: [
        { lang: 'python', run: true, code: `from itertools import accumulate
rain = [4, 0, 7, 3, 1, 5]
P = [0, *accumulate(rain)]
L, R = 2, 5
print((P[R + 1] - P[L]) / (R - L + 1))   # 4.0 (/ is true division in Python)` },
        { lang: 'js', run: true, code: `const rain = [4, 0, 7, 3, 1, 5];
const P = [0];
for (const x of rain) P.push(P[P.length - 1] + x);
const L = 2, R = 5;
console.log((P[R + 1] - P[L]) / (R - L + 1));   // 4 (every JS number is a double)` },
        { lang: 'cpp', code: `vector<int> rain = {4, 0, 7, 3, 1, 5};
vector<long long> P(rain.size() + 1, 0);
for (size_t i = 0; i < rain.size(); i++) P[i + 1] = P[i] + rain[i];
int L = 2, R = 5;
double avg = (double)(P[R + 1] - P[L]) / (R - L + 1);   // cast first, or integer division truncates
cout << avg << "\\n";   // 4` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[] rain = { 4, 0, 7, 3, 1, 5 };
        long[] P = new long[rain.Length + 1];
        for (int i = 0; i < rain.Length; i++) P[i + 1] = P[i] + rain[i];
        int L = 2, R = 5;
        double avg = (double)(P[R + 1] - P[L]) / (R - L + 1);   // cast first, or integer division truncates
        Console.WriteLine(avg);   // 4
    }
}`, run: true }
      ] } },
      { title: 'Range update in O(1) with a difference array (the reverse trick)', html: `<p>Prefix sums turn "many range <b>queries</b>" into O(1). The mirror trick, a <b>difference array</b>, turns "many range <b>updates</b>" into O(1): to add v to every cell in L..R, do <code>D[L] += v; D[R+1] −= v;</code>. After all updates, one prefix-sum pass over D rebuilds the final array.</p>
        ${H.table(['update', 'D after'], [['start', '[0, 0, 0, 0, 0, 0]'], ['+3 on 1..3', '[0, <span class="c-g">3</span>, 0, 0, <span class="c-r">−3</span>, 0]'], ['+2 on 2..4', '[0, 3, <span class="c-g">2</span>, 0, −3, <span class="c-r">−2</span>]'], ['prefix sum of D', '<b>[0, 3, 5, 5, 2, 0]</b>']])}
        <p>Classic uses: "car pooling", "corporate flight bookings", "how many meetings are running at each minute".</p>`, code: { lang: 'java', code: `int n = 5;
long[] D = new long[n + 1];                  // one extra slot so R + 1 never overflows
int[][] updates = {{1, 3, 3}, {2, 4, 2}};    // {L, R, value}
for (int[] u : updates) { D[u[0]] += u[2]; D[u[1] + 1] -= u[2]; }
long run = 0;
long[] result = new long[n];
for (int i = 0; i < n; i++) { run += D[i]; result[i] = run; }
System.out.println(Arrays.toString(result));  // [0, 3, 5, 5, 2]`, alt: [
        { lang: 'python', run: true, code: `from itertools import accumulate
n = 5
D = [0] * (n + 1)                    # one extra slot so R + 1 is always valid
for L, R, v in [(1, 3, 3), (2, 4, 2)]:
    D[L] += v
    D[R + 1] -= v
print(list(accumulate(D[:n])))       # [0, 3, 5, 5, 2]` },
        { lang: 'js', run: true, code: `const n = 5;
const D = new Array(n + 1).fill(0);  // one extra slot so R + 1 is always valid
for (const [L, R, v] of [[1, 3, 3], [2, 4, 2]]) { D[L] += v; D[R + 1] -= v; }
const result = [];
let run = 0;
for (let i = 0; i < n; i++) { run += D[i]; result.push(run); }
console.log(JSON.stringify(result));  // [0,3,5,5,2]` },
        { lang: 'cpp', code: `int n = 5;
vector<long long> D(n + 1, 0);              // one extra slot so R + 1 is always valid
vector<array<int, 3>> updates = {{1, 3, 3}, {2, 4, 2}};   // {L, R, value}
for (auto& [L, R, v] : updates) { D[L] += v; D[R + 1] -= v; }
vector<long long> result(n);
partial_sum(D.begin(), D.begin() + n, result.begin());   // [0, 3, 5, 5, 2]
for (long long x : result) cout << x << " ";
cout << "\\n";` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int n = 5;
        long[] D = new long[n + 1];                  // one extra slot so R + 1 never overflows
        int[][] updates = { new[] { 1, 3, 3 }, new[] { 2, 4, 2 } };    // {L, R, value}
        foreach (int[] u in updates) { D[u[0]] += u[2]; D[u[1] + 1] -= u[2]; }
        long run = 0;
        long[] result = new long[n];
        for (int i = 0; i < n; i++) { run += D[i]; result[i] = run; }
        Console.WriteLine("[" + string.Join(", ", result) + "]");  // [0, 3, 5, 5, 2]
    }
}`, run: true }
      ] } },
      { title: 'Counting with prefix sums (not just adding)', html: `<p>"How many vowels are in s[L..R]?" Build <code>cnt[i+1] = cnt[i] + (s[i] is a vowel ? 1 : 0)</code>. For s = "interview" (i n t e r v i e w): cnt = [0, 1, 1, 1, 2, 2, 2, 3, 4, 4]. Vowels in 2..6 ("tervi") = cnt[7] − cnt[2] = 3 − 1 = <b>2</b> (e and i) ✔. A prefix <b>count</b> is just a prefix sum over a 0/1 array — the same trick answers "how many even numbers / how many 'X' cells / how many days above 30°C in a range". Always verify the table on a tiny case by hand; off-by-one errors hide here.</p>` }
    ],
    deepDive: `<h4>Padded vs unpadded</h4><p>Unpadded <code>pf[i] = A[0..i]</code> needs the special case <code>L == 0</code>. Padded <code>P[i] = A[0..i−1]</code> (size N+1, P[0] = 0) gives the clean formula <code>sum(L..R) = P[R+1] − P[L]</code>. Pick one convention per program and never mix them; most bugs here are mixing.</p>
      <h4>It works for any "undo-able" operation</h4><p>Prefix sums need an operation that can be <b>reversed</b>: addition (subtract), XOR (XOR again: <code>xor(L..R) = X[R+1] ^ X[L]</code>), multiplication by non-zero values (divide, or use modular inverse). It does <b>not</b> work for max/min — you cannot "subtract" a max. Range max needs a sparse table or segment tree (Range Query module).</p>
      <h4>When the array changes</h4><p>A single point update forces rebuilding every later prefix value: O(N). With Q mixed updates and queries that becomes O(N·Q). Production answer: a <b>Fenwick tree</b> (O(log N) for both) or <b>segment tree</b>. If all updates come before all queries, use the difference array then one prefix pass.</p>
      <h4>Overflow and precision</h4><p>Sum of 10<sup>5</sup> values up to 10<sup>9</sup> is 10<sup>14</sup> → <code>long</code>. With mod arithmetic, compute <code>(P[R+1] − P[L] + MOD) % MOD</code> because the difference can go negative. With doubles, subtracting two huge nearly-equal prefix totals loses precision (catastrophic cancellation) — real analytics systems use Kahan summation or integers (cents, not dollars).</p>
      <h4>Production reality</h4><p>Databases expose prefix sums as window functions: <code>SUM(x) OVER (ORDER BY day)</code> is a running total. Time-series stores keep cumulative counters (Prometheus counters are prefix sums; <code>rate()</code> subtracts two of them). Image processing calls the 2D version an <i>integral image</i>.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI will happily write "loop from L to R" per query. It compiles and passes tiny tests, but times out on N = Q = 10<sup>5</sup>. Your job is to read the constraints and say "precompute".</p>
      <p><b>Use AI as a partner:</b> <code>Generate a random test harness that compares my prefix-sum answers with brute force on 1000 random arrays</code> — a stress test catches off-by-one bugs in seconds. Or ask it to convert your prefix sum into a SQL window function to see the same idea elsewhere.</p>
      <p><b>Where AI goes wrong:</b> mixing padded and unpadded indices (<code>pf[R] − pf[L]</code> silently drops A[L]), using 32-bit ints for totals, forgetting the <code>+ MOD</code> before <code>% MOD</code>, or suggesting prefix sums for range <b>max</b>.</p>
      <p><b>What you must still own:</b> spotting "static array + many range queries" in the wording, choosing the index convention, and proving the formula on a 3-element example out loud.</p>`,
    problems: [{
      title: 'Range Sum Query (Static Array)',
      level: 'Easy',
      tags: ['prefix sum', 'queries'],
      statement: `<p>You are given an integer array <code>A</code> of size <code>N</code> and <code>Q</code> queries. Each query is a pair <code>[L, R]</code> (0-indexed, inclusive). For every query return the sum <code>A[L] + A[L+1] + ... + A[R]</code>. Return all answers as an array of 64-bit integers (<code>long[]</code> in Java, a list in Python/JS, <code>vector&lt;long long&gt;</code> in C++).</p>`,
      constraints: `1 ≤ N, Q ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ A[i] ≤ 10<sup>9</sup>, 0 ≤ L ≤ R &lt; N`,
      example: `${H.arr([3, 1, 4, 1, 5, 9], { label: 'A', hl: { 1: 'b', 2: 'b', 3: 'b', 4: 'b' } })}
        <p>Queries: <code>[1,4]</code>, <code>[0,2]</code>, <code>[3,5]</code> → Output: <b>[11, 8, 15]</b></p>
        ${H.table(['query', 'cells', 'sum'], [['[1,4]', H.c('b', '1 + 4 + 1 + 5'), H.c('p', '11')], ['[0,2]', '3 + 1 + 4', H.c('p', '8')], ['[3,5]', '1 + 5 + 9', H.c('p', '15')]])}`,
      brute: {
        why: `<p>For each query, loop from L to R and add. One query can touch all N cells, so Q queries cost up to <b>N × Q = 10<sup>10</sup></b> steps → Time Limit Exceeded. The wasted work: the same cells (say index 2) get re-added in query after query.</p>`,
        code: { lang: 'java', code: `
          long[] bruteRangeSum(int[] A, int[][] queries) {
              long[] ans = new long[queries.length];
              for (int q = 0; q < queries.length; q++) {
                  long s = 0;
                  for (int i = queries[q][0]; i <= queries[q][1]; i++) s += A[i];  // re-adding every time
                  ans[q] = s;
              }
              return ans;
          }`, alt: [{ lang: 'python', code: String.raw`
def range_sum(a, queries):
    ans = []
    for lo, hi in queries:
        s = 0
        for i in range(lo, hi + 1):
            s += a[i]                    # re-adding every time
        ans.append(s)
    return ans` }, { lang: 'js', code: String.raw`
function rangeSum(A, queries) {
  const ans = [];
  for (const [L, R] of queries) {
    let s = 0;
    for (let i = L; i <= R; i++) s += A[i];   // re-adding every time
    ans.push(s);
  }
  return ans;
}` }, { lang: 'cpp', code: String.raw`
vector<long long> rangeSum(vector<int>& A, vector<vector<int>>& queries) {
    vector<long long> ans;
    for (auto& q : queries) {
        long long s = 0;
        for (int i = q[0]; i <= q[1]; i++) s += A[i];   // re-adding every time
        ans.push_back(s);
    }
    return ans;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public long[] RangeSum(int[] A, int[][] queries) {
        long[] ans = new long[queries.Length];
        for (int q = 0; q < queries.Length; q++) {
            long s = 0;
            for (int i = queries[q][0]; i <= queries[q][1]; i++) s += A[i];  // re-adding every time
            ans[q] = s;
        }
        return ans;
    }
}` }] }
      },
      mcq: {
        q: `<p>For A = [3, 1, 4, 1, 5, 9] the prefix sums are pf = [3, 4, 8, 9, 14, 23]. What is the sum of indices 2..4?</p>`,
        options: ['10 (pf[4] − pf[1] = 14 − 4)', '11 (pf[4] − pf[0])', '14 (just pf[4])', '6 (pf[4] − pf[2])'],
        answer: 0,
        explain: `<p>We want everything up to index 4 (pf[4] = 14) minus everything <b>before</b> index 2, which is pf[1] = 4. 14 − 4 = 10, and indeed 4 + 1 + 5 = 10. Subtracting pf[2] would wrongly remove A[2] too.</p>`
      },
      hints: [
        `<p><b>Aha:</b> sum(L..R) = (sum of 0..R) − (sum of 0..L−1). If you already know every "sum from the start", each query is <b>one subtraction</b>: <code>pf[R] − pf[L−1]</code>.</p>`,
        `<p>Build a 64-bit prefix array <code>pf</code> in one left-to-right pass: <code>pf[i] = pf[i−1] + A[i]</code>. Then loop over the queries and compute each answer from two array lookups. No extra data structure needed.</p>`,
        `<p><b>Traps:</b> (1) <code>L = 0</code> → there is no <code>pf[−1]</code>, answer is <code>pf[R]</code> (or use the padded size-N+1 array). (2) Use <code>long</code>: 10<sup>5</sup> × 10<sup>9</sup> overflows <code>int</code>. (3) Negative numbers are fine — subtraction still works.<br><b>Recipe:</b> pf[0] = A[0]; for i = 1..N−1: pf[i] = pf[i−1] + A[i]. For each query: ans = (L == 0) ? pf[R] : pf[R] − pf[L−1].</p>`
      ],
      tests: { sig: 'int[] int[][] -> long[]', fn: 'rangeSum', cases: [
        [[[3, 1, 4, 1, 5, 9], [[1, 4], [0, 2], [3, 5]]], [11, 8, 15]],
        [[[7], [[0, 0]]], [7]],
        [[[5, -2, 3, -4], [[1, 3], [0, 0], [3, 3], [0, 3]]], [-3, 5, -4, 2]],
        [[[1000000000, 1000000000, 1000000000, 1000000000, 1000000000, 1000000000], [[0, 5], [2, 4]]], [6000000000, 3000000000]],
        [[[-1000000000, -1000000000, -1000000000, -1000000000, -1000000000], [[0, 4], [1, 1]]], [-5000000000, -1000000000]],
        [[[0, 0, 0], [[0, 2], [1, 2]]], [0, 0]],
        [[[1, 2, 3, 4], [[0, 3], [1, 2], [2, 2], [0, 0]]], [10, 5, 3, 1]]
      ] },
      solution: {
        approach: `<p>Precompute running totals once (O(N)); answer every query with one subtraction (O(1)).</p>`,
        code: `
          class Solution {
              public long[] rangeSum(int[] A, int[][] queries) {
                  int n = A.length;
                  long[] pf = new long[n];              // long: the totals can exceed int range
                  pf[0] = A[0];                         // first total is just the first number
                  for (int i = 1; i < n; i++) {
                      pf[i] = pf[i - 1] + A[i];         // reuse the previous total
                  }
                  long[] ans = new long[queries.length];
                  for (int q = 0; q < queries.length; q++) {
                      int L = queries[q][0], R = queries[q][1];
                      // everything up to R, minus everything before L
                      ans[q] = (L == 0) ? pf[R] : pf[R] - pf[L - 1];
                  }
                  return ans;
              }

              public static void main(String[] args) {
                  int[] A = {3, 1, 4, 1, 5, 9};
                  int[][] qs = {{1, 4}, {0, 2}, {3, 5}};
                  System.out.println(Arrays.toString(new Solution().rangeSum(A, qs))); // [11, 8, 15]
              }
          }`,
        alt: [
          { lang: 'python', code: `from itertools import accumulate

def range_sum(a, queries):
    pf = [0, *accumulate(a)]          # padded: pf[i] = sum of a[0..i-1]
    return [pf[r + 1] - pf[l] for l, r in queries]` },
          { lang: 'js', code: `function rangeSum(A, queries) {
  const pf = new Array(A.length + 1).fill(0);   // padded: pf[i] = sum of A[0..i-1]
  for (let i = 0; i < A.length; i++) pf[i + 1] = pf[i] + A[i];   // totals stay below 2^53
  return queries.map(([L, R]) => pf[R + 1] - pf[L]);
}` },
          { lang: 'cpp', code: `class Solution {
public:
    vector<long long> rangeSum(vector<int>& A, vector<vector<int>>& queries) {
        vector<long long> pf(A.size() + 1, 0);   // padded: pf[i] = sum of A[0..i-1]
        for (size_t i = 0; i < A.size(); i++) pf[i + 1] = pf[i] + A[i];
        vector<long long> ans;
        ans.reserve(queries.size());
        for (auto& q : queries) ans.push_back(pf[q[1] + 1] - pf[q[0]]);
        return ans;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public long[] RangeSum(int[] A, int[][] queries) {
        int n = A.Length;
        long[] pf = new long[n];              // long: the totals can exceed int range
        pf[0] = A[0];                         // first total is just the first number
        for (int i = 1; i < n; i++) {
            pf[i] = pf[i - 1] + A[i];         // reuse the previous total
        }
        long[] ans = new long[queries.Length];
        for (int q = 0; q < queries.Length; q++) {
            int L = queries[q][0], R = queries[q][1];
            // everything up to R, minus everything before L
            ans[q] = (L == 0) ? pf[R] : pf[R] - pf[L - 1];
        }
        return ans;
    }
}` }
        ],
        dry: {
          head: ['step', 'what', 'computation', 'result'],
          rows: [
            ['build', 'pf[0]', 'A[0]', '3'],
            ['build', 'pf[1]', '3 + 1', '4'],
            ['build', 'pf[2]', '4 + 4', '8'],
            ['build', 'pf[3]', '8 + 1', '9'],
            ['build', 'pf[4]', '9 + 5', '14'],
            ['build', 'pf[5]', '14 + 9', '23'],
            ['query', '[1,4]', 'pf[4] − pf[0] = 14 − 3', '<span class="c-p">11</span>'],
            ['query', '[0,2]', 'L = 0 → pf[2]', '<span class="c-p">8</span>'],
            ['query', '[3,5]', 'pf[5] − pf[2] = 23 − 8', '<span class="c-p">15</span>']
          ]
        },
        complexity: `<p><b>Time O(N + Q)</b>: one pass of N steps to build <code>pf</code>, then each of the Q queries is a single subtraction. <b>Space O(N)</b> for the <code>pf</code> array (plus the output).</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Even / Odd index prefix sums (special index, equilibrium)
  // =====================================================================
  topics.push({
    title: 'Even/Odd Index Prefix Sums: Special Index & Equilibrium Index',
    analogy: `<p>Picture kids standing in a line, counting off "<b>team Even, team Odd, team Even, team Odd</b>...". If one kid leaves the line, everyone <b>behind</b> them steps forward one spot — and so every kid behind <b>switches team</b>! Kids in front keep their team. To know the new team totals you need: "what each team had <b>before</b> the gap" and "what each team had <b>after</b> the gap" (then swap the after part).</p>`,
    explain: `<p>Keep <b>two</b> running totals instead of one:</p>
      <ul>
        <li><code>pfE[i]</code> = sum of values at <b>even</b> indices among 0..i</li>
        <li><code>pfO[i]</code> = sum of values at <b>odd</b> indices among 0..i</li>
      </ul>
      ${H.arr([2, 1, 6, 4], { label: 'A', hl: { 0: 'g', 2: 'g', 1: 'b', 3: 'b' } })}
      ${H.table(['i', 'A[i]', 'even or odd?', 'pfE[i]', 'pfO[i]'], [['0', '2', H.c('g', 'even'), '2', '0'], ['1', '1', H.c('b', 'odd'), '2', '1'], ['2', '6', H.c('g', 'even'), '8', '1'], ['3', '4', H.c('b', 'odd'), '8', '5']])}
      <h4>What happens when we delete index i?</h4>
      <ul>
        <li>Everything <b>left</b> of i keeps its index → keeps its parity. Left even sum = <code>pfE[i−1]</code>, left odd sum = <code>pfO[i−1]</code>.</li>
        <li>Everything <b>right</b> of i moves one step left → <b>even becomes odd, odd becomes even</b>. Right even sum = <code>pfE[N−1] − pfE[i]</code>, right odd sum = <code>pfO[N−1] − pfO[i]</code>.</li>
      </ul>
      <p><code>newEven = pfE[i−1] + (pfO[N−1] − pfO[i])</code> &nbsp; ← right odds become evens<br>
         <code>newOdd &nbsp;= pfO[i−1] + (pfE[N−1] − pfE[i])</code> &nbsp; ← right evens become odds</p>
      <p>Delete index 1 from [2, 1, 6, 4] → [2, 6, 4]: even positions 2 + 4 = 6, odd position 6 → equal, so index 1 is <b>special</b>. Formula: newEven = 2 + (5 − 1) = 6, newOdd = 0 + (8 − 2) = 6 ✔.</p>
      <h4>Cousin: the Equilibrium (pivot) index</h4>
      <p>An index i is an <b>equilibrium index</b> if the sum of everything left of it equals the sum of everything right of it. With one prefix array: <code>left = pf[i−1]</code>, <code>right = total − pf[i]</code>.</p>
      ${H.arr([1, 7, 3, 6, 5, 6], { label: 'A', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'p', 4: 'g', 5: 'g' } })}
      <p>At index 3: left = 1 + 7 + 3 = ${H.c('b', '11')}, right = 5 + 6 = ${H.c('g', '11')} → equilibrium index is ${H.c('p', '3')}.</p>`,
    clues: [
      '"Remove / delete one element and then compare <b>even-indexed sum</b> with <b>odd-indexed sum</b>" → two prefix arrays (even and odd) and the "right side flips parity" trick.',
      '"Count indices such that after removal..." for all i → you must evaluate each i in O(1), so precompute prefix sums.',
      '"Sum of elements at even positions in range [L, R]" → a prefix array that only adds even-index values.',
      '"Left sum equals right sum" / "pivot index" / "equilibrium index" → <code>pf[i−1] == total − pf[i]</code>.',
      '<code>N ≤ 10<sup>5</sup></code> and "for each index" → O(N<sup>2</sup>) rebuild is too slow; O(N) prefix approach needed.'
    ],
    code: [{ lang: 'java', code: `
      long[][] evenOddPrefix(int[] A) {
          int n = A.length;
          long[] pfE = new long[n], pfO = new long[n];
          for (int i = 0; i < n; i++) {
              long prevE = (i == 0) ? 0 : pfE[i - 1];
              long prevO = (i == 0) ? 0 : pfO[i - 1];
              pfE[i] = prevE + (i % 2 == 0 ? A[i] : 0);   // add only if i is even
              pfO[i] = prevO + (i % 2 == 1 ? A[i] : 0);   // add only if i is odd
          }
          return new long[][]{pfE, pfO};
      }`, alt: [
        { lang: 'python', code: `def even_odd_prefix(a):
    pf_e, pf_o = [], []
    e = o = 0
    for i, x in enumerate(a):
        if i % 2 == 0:
            e += x                 # add only if i is even
        else:
            o += x                 # add only if i is odd
        pf_e.append(e)
        pf_o.append(o)
    return pf_e, pf_o` },
        { lang: 'js', code: `function evenOddPrefix(A) {
  const pfE = [], pfO = [];
  let e = 0, o = 0;
  A.forEach((x, i) => {
    if (i % 2 === 0) e += x;   // add only if i is even
    else o += x;               // add only if i is odd
    pfE.push(e);
    pfO.push(o);
  });
  return [pfE, pfO];
}` },
        { lang: 'cpp', code: `pair<vector<long long>, vector<long long>> evenOddPrefix(const vector<int>& A) {
    int n = A.size();
    vector<long long> pfE(n), pfO(n);
    for (int i = 0; i < n; i++) {
        long long prevE = i ? pfE[i - 1] : 0, prevO = i ? pfO[i - 1] : 0;
        pfE[i] = prevE + (i % 2 == 0 ? A[i] : 0);   // add only if i is even
        pfO[i] = prevO + (i % 2 == 1 ? A[i] : 0);   // add only if i is odd
    }
    return {pfE, pfO};
}` }, { lang: 'csharp', code: String.raw`
long[][] EvenOddPrefix(int[] A) {
    int n = A.Length;
    long[] pfE = new long[n], pfO = new long[n];
    for (int i = 0; i < n; i++) {
        long prevE = (i == 0) ? 0 : pfE[i - 1];
        long prevO = (i == 0) ? 0 : pfO[i - 1];
        pfE[i] = prevE + (i % 2 == 0 ? A[i] : 0);   // add only if i is even
        pfO[i] = prevO + (i % 2 == 1 ? A[i] : 0);   // add only if i is odd
    }
    return new[] { pfE, pfO };
}` }
      ] }, { lang: 'java', code: `
      int equilibriumIndex(int[] A) {
          long total = 0;
          for (int x : A) total += x;
          long left = 0;                       // sum of A[0..i-1]
          for (int i = 0; i < A.length; i++) {
              long right = total - left - A[i]; // sum of A[i+1..n-1]
              if (left == right) return i;      // first balancing index
              left += A[i];                     // carry the left sum forward
          }
          return -1;                            // no such index
      }`, alt: [
        { lang: 'python', code: `def equilibrium_index(a):
    total, left = sum(a), 0          # left = sum of a[0..i-1]
    for i, x in enumerate(a):
        if left == total - left - x: # right = sum of a[i+1..]
            return i                 # first balancing index
        left += x                    # carry the left sum forward
    return -1                        # no such index` },
        { lang: 'js', code: `function equilibriumIndex(A) {
  const total = A.reduce((s, x) => s + x, 0);
  let left = 0;                          // sum of A[0..i-1]
  for (let i = 0; i < A.length; i++) {
    const right = total - left - A[i];   // sum of A[i+1..n-1]
    if (left === right) return i;        // first balancing index
    left += A[i];                        // carry the left sum forward
  }
  return -1;                             // no such index
}` },
        { lang: 'cpp', code: `int equilibriumIndex(const vector<int>& A) {
    long long total = accumulate(A.begin(), A.end(), 0LL);   // 0LL, or the sum is done in int
    long long left = 0;                       // sum of A[0..i-1]
    for (int i = 0; i < (int)A.size(); i++) {
        long long right = total - left - A[i];   // sum of A[i+1..n-1]
        if (left == right) return i;          // first balancing index
        left += A[i];                         // carry the left sum forward
    }
    return -1;                                // no such index
}` }, { lang: 'csharp', code: String.raw`
int EquilibriumIndex(int[] A) {
    long total = 0;
    foreach (int x in A) total += x;
    long left = 0;                        // sum of A[0..i-1]
    for (int i = 0; i < A.Length; i++) {
        long right = total - left - A[i]; // sum of A[i+1..n-1]
        if (left == right) return i;      // first balancing index
        left += A[i];                     // carry the left sum forward
    }
    return -1;                            // no such index
}` }
      ] }],
    codeTitle: ['Building even and odd prefix sums', 'Equilibrium (pivot) index with one running sum'],
    viz: {
      title: 'Special index: remove i, the right side flips teams',
      input: '2 1 6 4',
      inputLabel: 'array (up to 10 numbers)',
      gen: function (input) {
        var a = nums(input, 10, 2);
        var n = a.length, pfE = [], pfO = [], frames = [];
        for (var i = 0; i < n; i++) {
          pfE.push((i ? pfE[i - 1] : 0) + (i % 2 === 0 ? a[i] : 0));
          pfO.push((i ? pfO[i - 1] : 0) + (i % 2 === 1 ? a[i] : 0));
        }
        var parity = a.map(function (_, k) { return k % 2 === 0 ? 'E' : 'O'; });
        frames.push({ narr: 'Every index belongs to team <b>E</b> (even) or team <b>O</b> (odd). We build two running totals: one that only adds team E values, one that only adds team O values.', parts: [
          { type: 'array', label: 'A', values: a.slice(), idxLabels: a.map(function (_, k) { return k + parity[k]; }) },
          { type: 'array', label: 'pfE (even-index running sum)', values: pfE.slice() },
          { type: 'array', label: 'pfO (odd-index running sum)', values: pfO.slice() }
        ] });
        var count = 0;
        for (i = 0; i < n; i++) {
          var lE = i ? pfE[i - 1] : 0, lO = i ? pfO[i - 1] : 0;
          var rE = pfE[n - 1] - pfE[i], rO = pfO[n - 1] - pfO[i];
          var nE = lE + rO, nO = lO + rE;
          var hl = {};
          for (var k = 0; k < n; k++) hl[k] = k < i ? 'win' : (k === i ? 'bad' : 'cur');
          var after = a.slice(0, i).concat(a.slice(i + 1));
          frames.push({
            narr: 'Try removing index <b>' + i + '</b> (red). Blue cells on the left keep their team: left E = ' + lE + ', left O = ' + lO + '. Amber cells on the right shift one step left, so they <b>swap teams</b>: right E = ' + rE + ' joins team O, right O = ' + rO + ' joins team E.',
            parts: [
              { type: 'array', label: 'A (removing index ' + i + ')', values: a.slice(), hl: hl, ptr: one(i, 'remove') },
              { type: 'array', label: 'array after removal', values: after, idxLabels: after.map(function (_, k) { return k + (k % 2 === 0 ? 'E' : 'O'); }) },
              { type: 'vars', vals: { 'left E': lE, 'left O': lO, 'right E (→odd)': rE, 'right O (→even)': rO } }
            ]
          });
          var ok = nE === nO;
          if (ok) count++;
          frames.push({
            narr: 'newEven = left E + right O = ' + lE + ' + ' + rO + ' = <b>' + nE + '</b>; newOdd = left O + right E = ' + lO + ' + ' + rE + ' = <b>' + nO + '</b>. ' + (ok ? '<span class="c-g">Equal → index ' + i + ' is special!</span>' : '<span class="c-r">Not equal → not special.</span>') + ' Each check was O(1) thanks to the prefix arrays.',
            parts: [
              { type: 'array', label: 'A', values: a.slice(), hl: one(i, ok ? 'ok' : 'bad') },
              { type: 'vars', vals: { newEven: nE, newOdd: nO, 'special count': count }, hl: ok ? { 'special count': 'ok' } : { newEven: 'bad', newOdd: 'bad' } }
            ]
          });
        }
        frames.push({ narr: 'Done. <b>' + count + '</b> special index(es). Total work: one pass to build pfE/pfO + one pass to test every index = O(N).', parts: [
          { type: 'vars', label: 'answer', vals: { 'special indices': count }, hl: { 'special indices': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Sum of even-index values inside a range', html: `<p>A = [3, 8, 1, 6, 4, 2]. Question: sum of values at <b>even indices</b> between L = 1 and R = 4 → indices 2 and 4 → 1 + 4 = <b>5</b>. With pfE = [3, 3, 4, 4, 8, 8]: answer = pfE[4] − pfE[0] = 8 − 3 = 5 ✔. The same "upto R minus before L" formula works on the filtered array.</p>${H.arr([3, 8, 1, 6, 4, 2], { label: 'A', hl: { 2: 'g', 4: 'g', 1: 'm', 3: 'm' } })}${H.arr([3, 3, 4, 4, 8, 8], { label: 'pfE', hl: { 0: 'r', 4: 'g' } })}` },
      { title: 'Equilibrium index at the very edge', html: `<p>A = [2, −2, 5]. At index 2: left = 2 + (−2) = 0, right = nothing = 0 → <b>2</b> is an equilibrium index. At index 0 of [5, 3, −3]: left = 0, right = 3 − 3 = 0 → index <b>0</b> works. Edges are valid answers; code that starts its loop at 1 or stops at N − 2 misses them.</p>` },
      { title: 'Special index when N = 1', html: `<p>A = [7]. Removing index 0 leaves an empty array: even sum 0, odd sum 0 → equal, so the count is <b>1</b>. The formula: leftE = leftO = 0, rightE = pfE[0] − pfE[0] = 0, rightO = 0 → newEven = newOdd = 0 ✔. Good formulas handle tiny inputs without special cases — test N = 1 and N = 2 every time.</p>` },
      { title: 'Alternating sum of a range', html: `<p>"Compute A[L] − A[L+1] + A[L+2] − …" for many queries. Build one array <code>S[i+1] = S[i] + (i even ? A[i] : −A[i])</code>. For a range starting at an even L the answer is S[R+1] − S[L]; for an odd L, negate it. A = [5, 1, 4, 2]: S = [0, 5, 4, 8, 6]. Query 1..3 = −(S[4] − S[1]) = −(6 − 5) = <b>−1</b>; check 1 − 4 + 2 = −1 ✔.</p>`, code: { lang: 'java', code: `int[] A = {5, 1, 4, 2};
long[] S = new long[A.length + 1];
for (int i = 0; i < A.length; i++) S[i + 1] = S[i] + (i % 2 == 0 ? A[i] : -A[i]);
int L = 1, R = 3;
long raw = S[R + 1] - S[L];
long alt = (L % 2 == 0) ? raw : -raw;   // flip sign if the range starts on an odd index
System.out.println(alt);                // -1`, alt: [
        { lang: 'python', run: true, code: `A = [5, 1, 4, 2]
S = [0]
for i, x in enumerate(A):
    S.append(S[-1] + (x if i % 2 == 0 else -x))
L, R = 1, 3
raw = S[R + 1] - S[L]
print(raw if L % 2 == 0 else -raw)   # -1 (flip sign if the range starts on an odd index)` },
        { lang: 'js', run: true, code: `const A = [5, 1, 4, 2];
const S = [0];
A.forEach((x, i) => S.push(S[i] + (i % 2 === 0 ? x : -x)));
const L = 1, R = 3;
const raw = S[R + 1] - S[L];
console.log(L % 2 === 0 ? raw : -raw);   // -1 (flip sign if the range starts on an odd index)` },
        { lang: 'cpp', code: `vector<int> A = {5, 1, 4, 2};
vector<long long> S(A.size() + 1, 0);
for (size_t i = 0; i < A.size(); i++) S[i + 1] = S[i] + (i % 2 == 0 ? A[i] : -A[i]);
int L = 1, R = 3;
long long raw = S[R + 1] - S[L];
cout << (L % 2 == 0 ? raw : -raw) << "\\n";   // -1` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[] A = { 5, 1, 4, 2 };
        long[] S = new long[A.Length + 1];
        for (int i = 0; i < A.Length; i++) S[i + 1] = S[i] + (i % 2 == 0 ? A[i] : -A[i]);
        int L = 1, R = 3;
        long raw = S[R + 1] - S[L];
        long alt = (L % 2 == 0) ? raw : -raw;   // flip sign if the range starts on an odd index
        Console.WriteLine(alt);                 // -1
    }
}`, run: true }
      ] } }
    ],
    deepDive: `<h4>Why the parity flip is correct</h4><p>After deleting index i, every j &gt; i moves to j − 1. Since j and j − 1 always have different parity, the whole right block swaps teams together, and the left block (j &lt; i) is untouched. That gives exactly four independent quantities — leftE, leftO, rightE, rightO — each readable in O(1) from two prefix arrays.</p>
      <h4>One array instead of two</h4><p>You can store a single signed prefix <code>S[i+1] = S[i] + (i even ? A[i] : −A[i])</code>. Then "evenSum − oddSum" of any range is ±(S[R+1] − S[L]). For the special-index question, newEven − newOdd = (leftE − leftO) + (rightO − rightE) = S[i] − (S[N] − S[i+1]), so index i is special exactly when <code>S[i] + S[i+1] == S[N]</code>. Check on [2, 1, 6, 4]: S = [0, 2, 1, 7, 3]; at i = 1, S[1] + S[2] = 2 + 1 = 3 = S[4] ✔. Elegant, but two arrays are easier to explain under pressure, so lead with those.</p>
      <h4>Space O(1) version</h4><p>Both the equilibrium and special-index checks only ever need "left so far" and "total". Compute totals once, then carry leftE / leftO forward as you scan: O(1) extra space. Say this as the follow-up after showing the array version.</p>
      <h4>Generalisation: k-classes</h4><p>Even/odd is "index mod 2". The same idea works for "index mod k" (k prefix arrays, or one array with stride k: <code>P[i] = P[i−k] + A[i]</code>). Range sums of every k-th element answer questions like "sum of every 3rd day's sales".</p>
      <h4>Edge cases checklist</h4><ul><li>i = 0 → left sums 0. i = N − 1 → right sums 0.</li><li>Use <code>long</code> for sums.</li><li>"First" vs "all" equilibrium indices — read the question.</li><li>Zeros make many indices equilibrium at once (e.g. [0, 0, 0] → all three).</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> parity puzzles are exactly where code assistants produce confident but subtly wrong formulas (they forget that the right side swaps parity). A quick brute-force comparison exposes it.</p>
      <p><b>Use AI as a partner:</b> <code>Write a brute force for "count special indices" and a random tester that compares it with my O(N) version for N from 1 to 8</code>. Small N exhaustive testing is cheap and catches parity bugs instantly.</p>
      <p><b>Where AI goes wrong:</b> using <code>pfE[i]</code> (which includes i) as "left of i", treating the right side as keeping its parity, or crashing on i = 0 with <code>pfE[-1]</code>.</p>
      <p><b>What you must still own:</b> the "everyone behind me changes team" insight, explaining it with a 4-element drawing, and noticing the O(1)-space follow-up.</p>`,
    problems: [{
      title: 'Count Special Indices (Even Sum = Odd Sum after Removal)',
      level: 'Medium',
      tags: ['prefix sum', 'even-odd', 'parity'],
      statement: `<p>Given an array <code>A</code> of size <code>N</code>, an index <code>i</code> is <b>special</b> if, after deleting <code>A[i]</code> (the remaining elements shift left to close the gap), the sum of elements at even indices equals the sum of elements at odd indices. Count the special indices.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>5</sup> ≤ A[i] ≤ 10<sup>5</sup>`,
      example: `${H.arr([2, 1, 6, 4], { label: 'A', hl: { 1: 'p' } })}
        ${H.table(['remove i', 'array left', 'even sum', 'odd sum', 'special?'], [
          ['0', '[1, 6, 4]', '1 + 4 = 5', '6', H.c('r', 'no')],
          ['1', '[2, 6, 4]', '2 + 4 = 6', '6', H.c('g', 'YES')],
          ['2', '[2, 1, 4]', '2 + 4 = 6', '1', H.c('r', 'no')],
          ['3', '[2, 1, 6]', '2 + 6 = 8', '1', H.c('r', 'no')]
        ])}
        <p>Output: ${H.c('p', '<b>1</b>')} — only removing index 1 balances the two teams.</p>`,
      brute: {
        why: `<p>For every i, build the array without A[i] and sum evens and odds: N choices × N work = <b>O(N<sup>2</sup>) = 10<sup>10</sup></b> for N = 10<sup>5</sup>. The waste: the left part and the right part barely change from one i to the next, yet we re-add them every time.</p>`,
        code: { lang: 'java', code: `
          int bruteSpecial(int[] A) {
              int n = A.length, count = 0;
              for (int i = 0; i < n; i++) {
                  long even = 0, odd = 0;
                  int pos = 0;                          // index in the NEW array
                  for (int j = 0; j < n; j++) {
                      if (j == i) continue;             // skip the removed element
                      if (pos % 2 == 0) even += A[j]; else odd += A[j];
                      pos++;
                  }
                  if (even == odd) count++;
              }
              return count;
          }`, alt: [{ lang: 'python', code: String.raw`
def count_special(a):
    n, count = len(a), 0
    for i in range(n):
        even = odd = 0
        pos = 0                              # index in the NEW array
        for j in range(n):
            if j == i:
                continue                     # skip the removed element
            if pos % 2 == 0:
                even += a[j]
            else:
                odd += a[j]
            pos += 1
        if even == odd:
            count += 1
    return count` }, { lang: 'js', code: String.raw`
function countSpecial(A) {
  const n = A.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    let even = 0, odd = 0;
    let pos = 0;                             // index in the NEW array
    for (let j = 0; j < n; j++) {
      if (j === i) continue;                 // skip the removed element
      if (pos % 2 === 0) even += A[j]; else odd += A[j];
      pos++;
    }
    if (even === odd) count++;
  }
  return count;
}` }, { lang: 'cpp', code: String.raw`
int countSpecial(vector<int>& A) {
    int n = A.size(), count = 0;
    for (int i = 0; i < n; i++) {
        long long even = 0, odd = 0;
        int pos = 0;                         // index in the NEW array
        for (int j = 0; j < n; j++) {
            if (j == i) continue;            // skip the removed element
            if (pos % 2 == 0) even += A[j]; else odd += A[j];
            pos++;
        }
        if (even == odd) count++;
    }
    return count;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int CountSpecial(int[] A) {
        int n = A.Length, count = 0;
        for (int i = 0; i < n; i++) {
            long even = 0, odd = 0;
            int pos = 0;                          // index in the NEW array
            for (int j = 0; j < n; j++) {
                if (j == i) continue;             // skip the removed element
                if (pos % 2 == 0) even += A[j]; else odd += A[j];
                pos++;
            }
            if (even == odd) count++;
        }
        return count;
    }
}` }] }
      },
      mcq: {
        q: `<p>You delete index i. What happens to elements that were to the <b>right</b> of i?</p>`,
        options: ['Each index drops by 1, so even ↔ odd swap', 'They keep the same parity', 'Only the very last one changes parity', 'They are also deleted'],
        answer: 0,
        explain: `<p>Closing the gap moves every right-side element one step left (index j becomes j − 1). Subtracting 1 flips parity, so the right side's even sum becomes part of the new odd sum and vice versa. The left side does not move.</p>`
      },
      hints: [
        `<p><b>Aha:</b> after deleting i, <code>newEven = (evens left of i) + (odds right of i)</code> and <code>newOdd = (odds left of i) + (evens right of i)</code>, because the right side flips parity.</p>`,
        `<p>Precompute two 64-bit prefix arrays: <code>pfE</code> (adds A[j] only when j is even) and <code>pfO</code> (only when j is odd). Then "left" = <code>pf[i−1]</code> and "right" = <code>pf[N−1] − pf[i]</code> for each team — all O(1).</p>`,
        `<p><b>Traps:</b> i = 0 has no <code>pf[−1]</code> → treat left sums as 0. Use <code>long</code>. N = 1: removing the only element leaves 0 = 0 → special (formula gives that automatically).<br><b>Recipe:</b> build pfE, pfO. For each i: lE, lO = (i == 0 ? 0 : pfE[i−1], pfO[i−1]); rE = pfE[N−1] − pfE[i]; rO = pfO[N−1] − pfO[i]; if lE + rO == lO + rE → count++.</p>`
      ],
      tests: { sig: 'int[] -> int', fn: 'countSpecial', cases: [
        [[[2, 1, 6, 4]], 1],
        [[[7]], 1],
        [[[1, 1]], 0],
        [[[1, 1, 1]], 3],
        [[[0, 0, 0, 0]], 4],
        [[[2, -1, -1, 2]], 0],
        [[[-5, 5, -5, 5, -5]], 1],
        [[[1, -1, 2, -1, 3, 2, 3, 2, 2, 1, -3, 3, 0, 3, -2, 2, -3, -2, -3, -1, 0, 3, -2, 0, 1, -3, 1, -2, -3, 2, -2, 0, -1, -2, 3, 3, 0, -2, 3, 3]], 0],
        [[[100000, -100000, 100000]], 1]
      ] },
      solution: {
        approach: `<p>Two prefix arrays (even-index and odd-index). For each candidate i, combine "left unchanged" with "right swapped" in O(1).</p>`,
        code: `
          class Solution {
              public int countSpecial(int[] A) {
                  int n = A.length;
                  long[] pe = new long[n], po = new long[n];   // even / odd prefix sums
                  for (int i = 0; i < n; i++) {
                      long prevE = (i == 0) ? 0 : pe[i - 1];
                      long prevO = (i == 0) ? 0 : po[i - 1];
                      pe[i] = prevE + (i % 2 == 0 ? A[i] : 0);
                      po[i] = prevO + (i % 2 == 1 ? A[i] : 0);
                  }
                  int count = 0;
                  for (int i = 0; i < n; i++) {
                      long leftE = (i == 0) ? 0 : pe[i - 1];   // left part keeps its parity
                      long leftO = (i == 0) ? 0 : po[i - 1];
                      long rightE = pe[n - 1] - pe[i];          // strictly right of i
                      long rightO = po[n - 1] - po[i];
                      long newEven = leftE + rightO;            // right odds become even
                      long newOdd = leftO + rightE;             // right evens become odd
                      if (newEven == newOdd) count++;
                  }
                  return count;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().countSpecial(new int[]{2, 1, 6, 4})); // 1
              }
          }`,
        alt: [
          { lang: 'python', code: `def count_special(a):
    n = len(a)
    pe, po = [0] * (n + 1), [0] * (n + 1)      # padded even / odd prefix sums
    for i, x in enumerate(a):
        pe[i + 1] = pe[i] + (x if i % 2 == 0 else 0)
        po[i + 1] = po[i] + (x if i % 2 == 1 else 0)
    count = 0
    for i in range(n):
        right_e, right_o = pe[n] - pe[i + 1], po[n] - po[i + 1]
        # left keeps its parity, the right side swaps
        if pe[i] + right_o == po[i] + right_e:
            count += 1
    return count` },
          { lang: 'js', code: `function countSpecial(A) {
  const n = A.length;
  const pe = new Array(n + 1).fill(0), po = new Array(n + 1).fill(0);   // padded even / odd sums
  for (let i = 0; i < n; i++) {
    pe[i + 1] = pe[i] + (i % 2 === 0 ? A[i] : 0);
    po[i + 1] = po[i] + (i % 2 === 1 ? A[i] : 0);
  }
  let count = 0;
  for (let i = 0; i < n; i++) {
    const rightE = pe[n] - pe[i + 1], rightO = po[n] - po[i + 1];
    if (pe[i] + rightO === po[i] + rightE) count++;   // right side swaps parity
  }
  return count;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    int countSpecial(vector<int>& A) {
        int n = A.size();
        vector<long long> pe(n + 1, 0), po(n + 1, 0);   // padded even / odd sums
        for (int i = 0; i < n; i++) {
            pe[i + 1] = pe[i] + (i % 2 == 0 ? A[i] : 0);
            po[i + 1] = po[i] + (i % 2 == 1 ? A[i] : 0);
        }
        int count = 0;
        for (int i = 0; i < n; i++) {
            long long rightE = pe[n] - pe[i + 1], rightO = po[n] - po[i + 1];
            if (pe[i] + rightO == po[i] + rightE) count++;   // right side swaps parity
        }
        return count;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int CountSpecial(int[] A) {
        int n = A.Length;
        long[] pe = new long[n], po = new long[n];   // even / odd prefix sums
        for (int i = 0; i < n; i++) {
            long prevE = (i == 0) ? 0 : pe[i - 1];
            long prevO = (i == 0) ? 0 : po[i - 1];
            pe[i] = prevE + (i % 2 == 0 ? A[i] : 0);
            po[i] = prevO + (i % 2 == 1 ? A[i] : 0);
        }
        int count = 0;
        for (int i = 0; i < n; i++) {
            long leftE = (i == 0) ? 0 : pe[i - 1];   // left part keeps its parity
            long leftO = (i == 0) ? 0 : po[i - 1];
            long rightE = pe[n - 1] - pe[i];          // strictly right of i
            long rightO = po[n - 1] - po[i];
            long newEven = leftE + rightO;            // right odds become even
            long newOdd = leftO + rightE;             // right evens become odd
            if (newEven == newOdd) count++;
        }
        return count;
    }
}` }
        ],
        dry: {
          head: ['i', 'leftE', 'leftO', 'rightE', 'rightO', 'newEven', 'newOdd', 'special?'],
          rows: [
            ['0', '0', '0', '8 − 2 = 6', '5 − 0 = 5', '0 + 5 = 5', '0 + 6 = 6', H.c('r', 'no')],
            ['1', '2', '0', '8 − 2 = 6', '5 − 1 = 4', '2 + 4 = 6', '0 + 6 = 6', H.c('g', 'YES → count = 1')],
            ['2', '2', '1', '8 − 8 = 0', '5 − 1 = 4', '2 + 4 = 6', '1 + 0 = 1', H.c('r', 'no')],
            ['3', '8', '1', '8 − 8 = 0', '5 − 5 = 0', '8 + 0 = 8', '1 + 0 = 1', H.c('r', 'no')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: one pass to build the two prefix arrays, one pass to test each index with a few subtractions. <b>Space O(N)</b> for the two prefix arrays.</p>`
      }
    }, {
      title: 'Equilibrium (Pivot) Index',
      level: 'Easy',
      tags: ['prefix sum', 'running sum'],
      statement: `<p>Given an integer array <code>A</code>, return the <b>first</b> index <code>i</code> such that the sum of all elements strictly to the left of <code>i</code> equals the sum of all elements strictly to the right of <code>i</code>. If there is none, return <code>-1</code>. (An empty side counts as sum 0.)</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ A[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([1, 7, 3, 6, 5, 6], { label: 'A', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'p', 4: 'g', 5: 'g' } })}
        <p>Output: ${H.c('p', '<b>3</b>')} because left = ${H.c('b', '1 + 7 + 3 = 11')} and right = ${H.c('g', '5 + 6 = 11')}. The element at the pivot itself (6) belongs to neither side.</p>`,
      brute: {
        why: `<p>For every i, loop left to add the left side and loop right to add the right side: N indices × N work = <b>O(N<sup>2</sup>)</b>. The waste: moving i one step only moves <b>one</b> number from the right side to the left side, but brute force re-adds everything.</p>`,
        code: { lang: 'java', code: `
          int brutePivot(int[] A) {
              for (int i = 0; i < A.length; i++) {
                  long left = 0, right = 0;
                  for (int j = 0; j < i; j++) left += A[j];
                  for (int j = i + 1; j < A.length; j++) right += A[j];
                  if (left == right) return i;
              }
              return -1;
          }`, alt: [{ lang: 'python', code: String.raw`
def pivot_index(a):
    for i in range(len(a)):
        left = right = 0
        for j in range(i):
            left += a[j]
        for j in range(i + 1, len(a)):
            right += a[j]
        if left == right:
            return i
    return -1` }, { lang: 'js', code: String.raw`
function pivotIndex(A) {
  for (let i = 0; i < A.length; i++) {
    let left = 0, right = 0;
    for (let j = 0; j < i; j++) left += A[j];
    for (let j = i + 1; j < A.length; j++) right += A[j];
    if (left === right) return i;
  }
  return -1;
}` }, { lang: 'cpp', code: String.raw`
int pivotIndex(vector<int>& A) {
    for (int i = 0; i < (int) A.size(); i++) {
        long long left = 0, right = 0;
        for (int j = 0; j < i; j++) left += A[j];
        for (int j = i + 1; j < (int) A.size(); j++) right += A[j];
        if (left == right) return i;
    }
    return -1;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int PivotIndex(int[] A) {
        for (int i = 0; i < A.Length; i++) {
            long left = 0, right = 0;
            for (int j = 0; j < i; j++) left += A[j];
            for (int j = i + 1; j < A.Length; j++) right += A[j];
            if (left == right) return i;
        }
        return -1;
    }
}` }] }
      },
      mcq: {
        q: `<p>Total = 28 and the sum of everything left of i is 11, with A[i] = 6. What is the right-side sum?</p>`,
        options: ['11 (28 − 11 − 6)', '17 (28 − 11)', '22 (28 − 6)', '6 (just A[i])'],
        answer: 0,
        explain: `<p>Total = left + A[i] + right, so right = total − left − A[i] = 28 − 11 − 6 = 11. That equals the left side, so i is the pivot.</p>`
      },
      hints: [
        `<p><b>Aha:</b> total = left + A[i] + right. Once you know the total, the right sum is <code>total − left − A[i]</code>, no second loop needed.</p>`,
        `<p>No array needed at all: compute <code>total</code> once, then walk left to right carrying a single <code>long left</code> (the carry-forward idea). After checking i, add A[i] to left.</p>`,
        `<p><b>Traps:</b> index 0 has left = 0 and the last index has right = 0 — both are valid pivots. Use <code>long</code> for sums. Return the <b>first</b> match.<br><b>Recipe:</b> total = sum(A); left = 0; for i in 0..N−1: right = total − left − A[i]; if left == right return i; left += A[i]. Return −1.</p>`
      ],
      tests: { sig: 'int[] -> int', fn: 'pivotIndex', cases: [
        [[[1, 7, 3, 6, 5, 6]], 3],
        [[[1, 2, 3]], -1],
        [[[2, 1, -1]], 0],
        [[[2, -2, 5]], 2],
        [[[0, 0, 0]], 0],
        [[[5]], 0],
        [[[-1, -1, -1, -1, -1, 0]], 2],
        [[[1000000000, 1000000000, -1000000000, 1000000000, 1000000000]], 1]
      ] },
      solution: {
        approach: `<p>Total sum once; then one sweep with a running left sum. Right sum is derived by subtraction.</p>`,
        code: `
          class Solution {
              public int pivotIndex(int[] A) {
                  long total = 0;
                  for (int x : A) total += x;            // sum of the whole array
                  long left = 0;                          // sum of A[0..i-1]
                  for (int i = 0; i < A.length; i++) {
                      long right = total - left - A[i];   // sum of A[i+1..n-1]
                      if (left == right) return i;        // balanced!
                      left += A[i];                       // A[i] moves to the left side
                  }
                  return -1;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().pivotIndex(new int[]{1, 7, 3, 6, 5, 6})); // 3
              }
          }`,
        alt: [
          { lang: 'python', code: `def pivot_index(a):
    total, left = sum(a), 0
    for i, x in enumerate(a):
        if left == total - left - x:     # right sum = total - left - a[i]
            return i
        left += x
    return -1` },
          { lang: 'js', code: `function pivotIndex(A) {
  const total = A.reduce((s, x) => s + x, 0);   // at most 1e14: exact in a Number
  let left = 0;
  for (let i = 0; i < A.length; i++) {
    if (left === total - left - A[i]) return i;
    left += A[i];
  }
  return -1;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    int pivotIndex(vector<int>& A) {
        long long total = accumulate(A.begin(), A.end(), 0LL);   // 0LL: sum in 64 bits
        long long left = 0;
        for (int i = 0; i < (int)A.size(); i++) {
            if (left == total - left - A[i]) return i;
            left += A[i];
        }
        return -1;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int PivotIndex(int[] A) {
        long total = 0;
        foreach (int x in A) total += x;            // sum of the whole array
        long left = 0;                              // sum of A[0..i-1]
        for (int i = 0; i < A.Length; i++) {
            long right = total - left - A[i];       // sum of A[i+1..n-1]
            if (left == right) return i;            // balanced!
            left += A[i];                           // A[i] moves to the left side
        }
        return -1;
    }
}` }
        ],
        dry: {
          head: ['i', 'A[i]', 'left', 'right = 28 − left − A[i]', 'equal?'],
          rows: [
            ['0', '1', '0', '27', 'no → left = 1'],
            ['1', '7', '1', '20', 'no → left = 8'],
            ['2', '3', '8', '17', 'no → left = 11'],
            ['3', '6', '11', '11', H.c('g', 'YES → return 3')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: one pass for the total, one pass for the check. <b>Space O(1)</b>: only two numbers are carried along.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Carry Forward
  // =====================================================================
  topics.push({
    title: 'Carry Forward: Count "ag" Pairs & Leaders in an Array',
    analogy: `<p>A bus conductor walks down the bus counting passengers. He does <b>not</b> restart from the front every time someone new boards — he just keeps a number in his head and adds one. That number he "carries forward" is the whole trick.</p>
      <p>Same with a shop: the shopkeeper keeps a <b>running tally</b> on one sheet ("girls' shirts sold so far: 4") so when a question comes, he answers instantly instead of re-checking every receipt.</p>`,
    explain: `<p><b>Carry forward</b> = while looping, keep <b>one small piece of memory</b> (a count, a max, a min, a last position) that summarises everything you have already passed. Each new element only needs that summary, not a second loop.</p>
      <h4>Example 1: count pairs (i &lt; j) with S[i] = 'a' and S[j] = 'g'</h4>
      <p>Brute force: for every 'a', scan everything to its right for 'g's → O(N<sup>2</sup>). Carry forward: walk from the <b>right</b>, keep <code>gCount</code> = number of 'g's seen so far (all of them are to the right of the current spot). When you meet an 'a', it pairs with <b>every</b> one of those g's → <code>ans += gCount</code>.</p>
      ${H.arr(['a', 'b', 'e', 'g', 'a', 'g'], { label: 'S', hl: { 0: 'y', 4: 'y', 3: 'g', 5: 'g' } })}
      ${H.table(['i (right → left)', 'S[i]', 'gCount', 'ans'], [['5', 'g', '1', '0'], ['4', H.c('y', 'a'), '1', '0 + 1 = 1'], ['3', 'g', '2', '1'], ['2', 'e', '2', '1'], ['1', 'b', '2', '1'], ['0', H.c('y', 'a'), '2', '1 + 2 = <b>3</b>']])}
      <p>Pairs: (0,3), (0,5), (4,5) → 3 ✔. (You can also go left to right carrying <code>aCount</code> and add it at every 'g' — same answer.)</p>
      <h4>Example 2: leaders — elements bigger than everything on their right</h4>
      <p>Walk from the right carrying <code>maxRight</code>, the biggest value seen so far. A[i] is a leader exactly when <code>A[i] &gt; maxRight</code>; then it becomes the new max.</p>
      ${H.arr([16, 17, 4, 3, 5, 2], { label: 'A', hl: { 1: 'p', 4: 'p', 5: 'p' } })}
      <p>Leaders: ${H.c('p', '17, 5, 2')}. The last element is always a leader (nothing to its right).</p>
      <p><b>Which direction to walk?</b> Look at what the question compares against: "to the <b>right</b>" → walk right-to-left; "to the <b>left</b>" / "so far" → walk left-to-right.</p>`,
    clues: [
      '"Count pairs (i, j) with i &lt; j where A[i] is X and A[j] is Y" → carry the count of X (or Y) along the loop; no nested loop.',
      '"Greater than <b>all elements to its right</b>" / "leaders" / "visible buildings from the right" → carry a running max from the right.',
      '"Best so far", "minimum price before today", "maximum till now" → carry a single running value.',
      '<code>N ≤ 10<sup>5</sup></code> with a pair-counting story → O(N<sup>2</sup>) brute force times out; carry forward makes it O(N).',
      'Answer may be huge ("return modulo 10<sup>9</sup>+7") → the pair count can reach N<sup>2</sup>/4; use <code>long</code>.'
    ],
    code: { lang: 'java', code: `
      // Left-to-right flavour: carry how many 'a' we have passed
      long countAGLeftToRight(String s) {
          long aCount = 0, pairs = 0;
          for (int i = 0; i < s.length(); i++) {
              char ch = s.charAt(i);
              if (ch == 'a') aCount++;              // remember this 'a' for future g's
              else if (ch == 'g') pairs += aCount;  // every earlier 'a' pairs with this 'g'
          }
          return pairs;
      }`, alt: [
        { lang: 'python', code: `# Left-to-right flavour: carry how many 'a' we have passed
def count_ag_left_to_right(s):
    a_count = pairs = 0
    for ch in s:
        if ch == 'a':
            a_count += 1           # remember this 'a' for future g's
        elif ch == 'g':
            pairs += a_count       # every earlier 'a' pairs with this 'g'
    return pairs` },
        { lang: 'js', code: `// Left-to-right flavour: carry how many 'a' we have passed
function countAGLeftToRight(s) {
  let aCount = 0, pairs = 0;
  for (const ch of s) {
    if (ch === 'a') aCount++;              // remember this 'a' for future g's
    else if (ch === 'g') pairs += aCount;  // every earlier 'a' pairs with this 'g'
  }
  return pairs;
}` },
        { lang: 'cpp', code: `// Left-to-right flavour: carry how many 'a' we have passed
long long countAGLeftToRight(const string& s) {
    long long aCount = 0, pairs = 0;
    for (char ch : s) {
        if (ch == 'a') aCount++;               // remember this 'a' for future g's
        else if (ch == 'g') pairs += aCount;   // every earlier 'a' pairs with this 'g'
    }
    return pairs;
}` }, { lang: 'csharp', code: String.raw`
// Left-to-right flavour: carry how many 'a' we have passed
long CountAGLeftToRight(string s) {
    long aCount = 0, pairs = 0;
    foreach (char ch in s) {
        if (ch == 'a') aCount++;              // remember this 'a' for future g's
        else if (ch == 'g') pairs += aCount;  // every earlier 'a' pairs with this 'g'
    }
    return pairs;
}` }
      ] },
    codeTitle: 'Same idea in the other direction',
    viz: [{
      title: 'Count "ag" pairs: carry the number of g\'s from the right',
      input: 'abegag',
      inputLabel: 'lowercase string (up to 16 letters)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).trim();
        if (!/^[a-z]+$/.test(s)) throw new Error('Type a single word of lowercase letters, e.g. abegag');
        if (s.length > 16) throw new Error('Please keep the string at most 16 letters.');
        var ch = s.split(''), frames = [], g = 0, ans = 0;
        frames.push({ narr: 'We want pairs where an <b>a</b> comes before a <b>g</b>. Walk from the <b>right</b> end, carrying <code>gCount</code> = how many g\'s we have already passed (they are all to the right of where we stand).', parts: [
          { type: 'array', label: 'S', values: ch.slice() },
          { type: 'vars', vals: { gCount: 0, ans: 0 } }
        ] });
        for (var i = ch.length - 1; i >= 0; i--) {
          var hl = {};
          for (var k = ch.length - 1; k > i; k--) hl[k] = ch[k] === 'g' ? 'win' : 'done';
          var narr, vh = {};
          if (ch[i] === 'g') { g++; hl[i] = 'ok'; vh.gCount = 'ok'; narr = 'S[' + i + '] is <b>g</b>. Any <b>a</b> further left can pair with it, so gCount goes up to <b>' + g + '</b>.'; }
          else if (ch[i] === 'a') { ans += g; hl[i] = 'sel'; vh.ans = 'sel'; narr = 'S[' + i + '] is <b>a</b>. It pairs with <b>every</b> g on its right — that is gCount = ' + g + ' pairs at once. ans += ' + g + ' → <b>' + ans + '</b>.'; }
          else { hl[i] = 'cur'; narr = 'S[' + i + '] is "' + ch[i] + '" — not a or g, so nothing changes. We just move on.'; }
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'S', values: ch.slice(), hl: hl, ptr: one(i, 'i') },
            { type: 'vars', vals: { i: i, gCount: g, ans: ans }, hl: vh }
          ] });
        }
        frames.push({ narr: 'Reached the left end. Total "ag" pairs = <b>' + ans + '</b>, found in a single pass (O(N)) with just two counters (O(1) space).', parts: [
          { type: 'array', label: 'S', values: ch.slice(), hl: (function () { var h = {}; ch.forEach(function (c, k) { if (c === 'a') h[k] = 'sel'; else if (c === 'g') h[k] = 'win'; }); return h; })() },
          { type: 'vars', label: 'answer', vals: { pairs: ans }, hl: { pairs: 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'Leaders: carry the maximum from the right',
      input: '16 17 4 3 5 2',
      inputLabel: 'array (up to 14 numbers)',
      gen: function (input) {
        var a = nums(input, 14, 2);
        var frames = [], maxR = null, leaders = [], isLeader = {};
        frames.push({ narr: 'A leader is bigger than <b>everything to its right</b>. Walk from the right while carrying <code>maxRight</code> — the tallest bar seen so far.', parts: [
          { type: 'bars', label: 'A', values: a.slice() },
          { type: 'vars', vals: { maxRight: '−∞' } }
        ] });
        for (var i = a.length - 1; i >= 0; i--) {
          var lead = maxR === null || a[i] > maxR;
          var old = maxR === null ? '−∞' : maxR;
          if (lead) { maxR = a[i]; leaders.unshift(a[i]); isLeader[i] = true; }
          var hl = {};
          for (var k = a.length - 1; k > i; k--) hl[k] = isLeader[k] ? 'sel' : 'done';
          hl[i] = lead ? 'ok' : 'bad';
          frames.push({
            narr: 'A[' + i + '] = ' + a[i] + ' vs maxRight = ' + old + '. ' + (lead ? '<span class="c-g">Bigger → leader!</span> It also becomes the new maxRight = ' + maxR + '.' : '<span class="c-r">Not bigger</span> → something on its right is at least as tall, so it is not a leader.'),
            parts: [
              { type: 'bars', label: 'A', values: a.slice(), hl: hl, ptr: one(i, 'i') },
              { type: 'vars', vals: { i: i, 'A[i]': a[i], maxRight: maxR }, hl: lead ? { maxRight: 'ok' } : {} },
              { type: 'array', label: 'leaders so far (left → right order)', values: leaders.slice() }
            ]
          });
        }
        frames.push({ narr: 'Done: leaders are <b>' + leaders.join(', ') + '</b>. One pass, one carried number.', parts: [
          { type: 'bars', label: 'A', values: a.slice(), hl: (function () { var h = {}; for (var k in isLeader) h[k] = 'sel'; return h; })() },
          { type: 'array', label: 'leaders', values: leaders.slice() }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Best time to buy and sell a stock once', html: `<p>Prices: [7, 1, 5, 3, 6, 4]. Carry <code>minSoFar</code> (cheapest day before today). Each day, profit if sold today = price − minSoFar.</p>
        ${H.table(['day', 'price', 'minSoFar (before)', 'sell today', 'best'], [['0', '7', '—', '—', '0'], ['1', '1', '7', '−6', '0'], ['2', '5', '1', '4', '4'], ['3', '3', '1', '2', '4'], ['4', '6', '1', H.c('g', '5'), H.c('p', '5')], ['5', '4', '1', '3', '5']])}
        <p>Answer <b>5</b> (buy at 1, sell at 6). Carry forward turned "check every buy/sell pair" (O(N<sup>2</sup>)) into one pass.</p>`, code: { lang: 'java', code: `int[] p = {7, 1, 5, 3, 6, 4};
int minSoFar = Integer.MAX_VALUE, best = 0;
for (int x : p) {
    if (minSoFar != Integer.MAX_VALUE) best = Math.max(best, x - minSoFar);  // sell today?
    minSoFar = Math.min(minSoFar, x);                             // then remember today as a buy option
}
System.out.println(best);   // 5`, alt: [
        { lang: 'python', run: true, code: `p = [7, 1, 5, 3, 6, 4]
min_so_far, best = float('inf'), 0
for x in p:
    best = max(best, x - min_so_far)   # sell today? (inf on day 0 gives a negative, ignored)
    min_so_far = min(min_so_far, x)    # then remember today as a buy option
print(best)   # 5` },
        { lang: 'js', run: true, code: `const p = [7, 1, 5, 3, 6, 4];
let minSoFar = Infinity, best = 0;
for (const x of p) {
  best = Math.max(best, x - minSoFar);   // sell today? (Infinity on day 0 gives -Infinity, ignored)
  minSoFar = Math.min(minSoFar, x);      // then remember today as a buy option
}
console.log(best);   // 5` },
        { lang: 'cpp', code: `vector<int> p = {7, 1, 5, 3, 6, 4};
int minSoFar = INT_MAX, best = 0;
for (int x : p) {
    if (minSoFar != INT_MAX) best = max(best, x - minSoFar);   // sell today? (skip day 0: nothing bought yet)
    minSoFar = min(minSoFar, x);                             // then remember today as a buy option
}
cout << best << "\\n";   // 5` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[] p = { 7, 1, 5, 3, 6, 4 };
        int minSoFar = int.MaxValue, best = 0;
        foreach (int x in p) {
            if (minSoFar != int.MaxValue) best = Math.Max(best, x - minSoFar);  // sell today?
            minSoFar = Math.Min(minSoFar, x);                             // then remember today as a buy option
        }
        Console.WriteLine(best);   // 5
    }
}`, run: true }
      ] } },
      { title: 'Count pairs i &lt; j with A[i] &gt; A[j] where values are only 0 or 1', html: `<p>A = [1, 0, 1, 1, 0, 0]. A "bad pair" is a 1 before a 0. Walk left to right carrying <code>ones</code>; at every 0 add <code>ones</code>. Ones before index 1 → 1; before index 4 → 3; before index 5 → 3. Total <b>7</b>. That is also the number of adjacent swaps needed to sort a 0/1 array (a sneak peek of inversion counting, done for general values in the Sorting module).</p>` },
      { title: 'Closest "a" to every position (carry the last seen index)', html: `<p>For each index of s = "baxab", how far is the nearest earlier 'a'? Carry <code>lastA</code> (−1 means none yet): b → none, a → 0, x → 1, a → 0, b → 1. Carrying an <b>index</b> instead of a count is the same idea; doing a second pass from the right and taking the min gives "nearest 'a' on either side" (LeetCode 821, Shortest Distance to a Character).</p>` },
      { title: 'Minimum distance between an "a" and a "b"', html: `<p>"Smallest distance between any 'a' and any 'b'": walk once, carry <code>lastA</code> and <code>lastB</code>. Whenever you see one letter and the other has been seen, update <code>ans = min(ans, i − lastOther)</code>. For [a, x, x, b, x, a, b]: pairs (0,3) = 3, (3,5) = 2, (5,6) = 1 → answer <b>1</b>. One pass, two carried indices.</p>`, code: { lang: 'java', code: `char[] s = {'a', 'x', 'x', 'b', 'x', 'a', 'b'};
int lastA = -1, lastB = -1, ans = Integer.MAX_VALUE;
for (int i = 0; i < s.length; i++) {
    if (s[i] == 'a') { lastA = i; if (lastB != -1) ans = Math.min(ans, i - lastB); }
    else if (s[i] == 'b') { lastB = i; if (lastA != -1) ans = Math.min(ans, i - lastA); }
}
System.out.println(ans);   // 1`, alt: [
        { lang: 'python', run: true, code: `s = "axxbxab"
last_a = last_b = -1
ans = float('inf')
for i, ch in enumerate(s):
    if ch == 'a':
        last_a = i
        if last_b != -1:
            ans = min(ans, i - last_b)
    elif ch == 'b':
        last_b = i
        if last_a != -1:
            ans = min(ans, i - last_a)
print(ans)   # 1` },
        { lang: 'js', run: true, code: `const s = 'axxbxab';
let lastA = -1, lastB = -1, ans = Infinity;
for (let i = 0; i < s.length; i++) {
  if (s[i] === 'a') { lastA = i; if (lastB !== -1) ans = Math.min(ans, i - lastB); }
  else if (s[i] === 'b') { lastB = i; if (lastA !== -1) ans = Math.min(ans, i - lastA); }
}
console.log(ans);   // 1` },
        { lang: 'cpp', code: `string s = "axxbxab";
int lastA = -1, lastB = -1, ans = INT_MAX;
for (int i = 0; i < (int)s.size(); i++) {
    if (s[i] == 'a') { lastA = i; if (lastB != -1) ans = min(ans, i - lastB); }
    else if (s[i] == 'b') { lastB = i; if (lastA != -1) ans = min(ans, i - lastA); }
}
cout << ans << "\\n";   // 1` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        char[] s = { 'a', 'x', 'x', 'b', 'x', 'a', 'b' };
        int lastA = -1, lastB = -1, ans = int.MaxValue;
        for (int i = 0; i < s.Length; i++) {
            if (s[i] == 'a') { lastA = i; if (lastB != -1) ans = Math.Min(ans, i - lastB); }
            else if (s[i] == 'b') { lastB = i; if (lastA != -1) ans = Math.Min(ans, i - lastA); }
        }
        Console.WriteLine(ans);   // 1
    }
}`, run: true }
      ] } }
    ],
    deepDive: `<h4>The general shape</h4><p>Carry forward is a tiny state machine: <code>state = f(state, A[i])</code>, and the answer is read from the state (or accumulated) at every step. Kadane, prefix sums, running max/min, "last seen index", and even many DP problems are this exact shape. If you can name the state in one sentence ("the cheapest price so far", "number of g's to my right"), you have an O(N) one-pass algorithm with O(1) memory.</p>
      <h4>Why the pair-count formula is correct</h4><p>Every valid pair (i, j) is counted exactly once — at the moment the scan reaches its 'a' (right-to-left version), because that 'g' was already counted in gCount and the 'a' is visited only once. No pair is counted twice, none is missed: that is the whole proof.</p>
      <h4>Direction rule of thumb</h4><ul><li>"... to the right / after / later" → scan right-to-left (or count the other letter left-to-right).</li><li>"... so far / before / earlier" → scan left-to-right.</li><li>"... on both sides" → two passes and store the carried value per index (that is prefix/suffix max, next topic).</li></ul>
      <h4>Strictness and ties</h4><p>"Strictly greater" (leaders) vs "greater or equal" (some variants) changes the comparison and the answer on equal values. Always ask, and test [5, 5].</p>
      <h4>Production reality</h4><p>Streaming systems are carry-forward machines: a dashboard counter, a running max latency, an exponentially weighted moving average — they see each event once and keep O(1) state. That constraint ("cannot look back") is exactly why interviewers love these questions.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant usually recognises "leaders" or "buy and sell stock" immediately. The interview signal moved from "do you know the trick" to "can you <b>name the carried state</b> and prove each pair is counted once".</p>
      <p><b>Use AI as a partner:</b> describe your carried variable and ask <code>Find an input where this state is not enough to answer correctly</code> — a great way to discover when you actually need two carried values (e.g. both min and max for products).</p>
      <p><b>Where AI goes wrong:</b> initialising a running max with 0 instead of −∞ (wrong on all-negative input), overflowing an <code>int</code> pair counter, or scanning the wrong direction for "to the right" questions.</p>
      <p><b>What you must still own:</b> choosing the direction, the strict vs non-strict comparison, and the overflow-safe type — three decisions that make or break the solution.</p>`,
    problems: [{
      title: 'Count "ag" Pairs',
      level: 'Easy',
      tags: ['carry forward', 'string', 'counting'],
      statement: `<p>Given a string <code>S</code> of lowercase letters, count the pairs of indices <code>(i, j)</code> with <code>i &lt; j</code>, <code>S[i] = 'a'</code> and <code>S[j] = 'g'</code>. Return the count as a <code>long</code>.</p>`,
      constraints: `1 ≤ |S| ≤ 10<sup>5</sup>, S has only lowercase letters`,
      example: `${H.arr(['a', 'b', 'e', 'g', 'a', 'g'], { label: 'S', hl: { 0: 'y', 4: 'y', 3: 'g', 5: 'g' } })}
        <p>Output: <b>3</b>. The pairs are ${H.c('y', '(0, 3)')}, ${H.c('y', '(0, 5)')} and ${H.c('y', '(4, 5)')}: every 'a' is matched with every 'g' that appears <b>after</b> it. The 'a' at index 4 cannot use the 'g' at index 3 because it is before it.</p>`,
      brute: {
        why: `<p>For each 'a', scan every later character and count the g's. A string like "aaaa...gggg" makes this about N<sup>2</sup>/4 = 2.5 × 10<sup>9</sup> steps → too slow. The waste: every 'a' re-counts the same g's that the previous 'a' already counted.</p>`,
        code: { lang: 'java', code: `
          long bruteAG(String s) {
              long pairs = 0;
              for (int i = 0; i < s.length(); i++) {
                  if (s.charAt(i) != 'a') continue;
                  for (int j = i + 1; j < s.length(); j++) {
                      if (s.charAt(j) == 'g') pairs++;
                  }
              }
              return pairs;
          }`, alt: [{ lang: 'python', code: String.raw`
def count_ag(s):
    pairs = 0
    for i in range(len(s)):
        if s[i] != 'a':
            continue
        for j in range(i + 1, len(s)):
            if s[j] == 'g':
                pairs += 1
    return pairs` }, { lang: 'js', code: String.raw`
function countAG(s) {
  let pairs = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== 'a') continue;
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === 'g') pairs++;
    }
  }
  return pairs;
}` }, { lang: 'cpp', code: String.raw`
long long countAG(const string& s) {
    long long pairs = 0;
    for (int i = 0; i < (int) s.size(); i++) {
        if (s[i] != 'a') continue;
        for (int j = i + 1; j < (int) s.size(); j++) {
            if (s[j] == 'g') pairs++;
        }
    }
    return pairs;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public long CountAG(string s) {
        long pairs = 0;
        for (int i = 0; i < s.Length; i++) {
            if (s[i] != 'a') continue;
            for (int j = i + 1; j < s.Length; j++) {
                if (s[j] == 'g') pairs++;
            }
        }
        return pairs;
    }
}` }] }
      },
      mcq: {
        q: `<p>You scan from the <b>right</b> keeping <code>gCount</code>. You now stand on an 'a'. What do you add to the answer?</p>`,
        options: ['gCount — the number of g\'s already passed (all on its right)', 'Exactly 1', 'The number of a\'s seen so far', 'The index i'],
        answer: 0,
        explain: `<p>Every 'g' we passed while walking leftwards is to the right of this 'a', so each one forms a valid pair with it. That is gCount new pairs in one addition.</p>`
      },
      hints: [
        `<p><b>Aha:</b> an 'a' at position i forms exactly (number of g's to the right of i) pairs. So the answer = sum over every 'a' of "g's to its right".</p>`,
        `<p>No data structure needed — just one <code>long gCount</code> carried while walking right-to-left (or one <code>aCount</code> while walking left-to-right and adding at each 'g').</p>`,
        `<p><b>Traps:</b> the count can reach (N/2)<sup>2</sup> = 2.5 × 10<sup>9</sup> &gt; int max → use <code>long</code> (or take mod 10<sup>9</sup>+7 if asked). Characters other than 'a'/'g' are ignored.<br><b>Recipe:</b> gCount = 0, ans = 0; for i from N−1 down to 0: if S[i] == 'g' gCount++; else if S[i] == 'a' ans += gCount. Return ans.</p>`
      ],
      tests: { sig: 'string -> long', fn: 'countAG', cases: [
        [['abegag'], 3],
        [['a'], 0],
        [['g'], 0],
        [['ga'], 0],
        [['aaggg'], 6],
        [['agagag'], 6],
        [['xyz'], 0],
        [['a'.repeat(300) + 'g'.repeat(300)], 90000]
      ] },
      solution: {
        approach: `<p>Walk right-to-left carrying the number of g's seen; each 'a' adds that number.</p>`,
        code: `
          class Solution {
              public long countAG(String s) {
                  long gCount = 0;   // how many 'g' are to the RIGHT of the current index
                  long pairs = 0;
                  for (int i = s.length() - 1; i >= 0; i--) {
                      char ch = s.charAt(i);
                      if (ch == 'g') {
                          gCount++;                // one more 'g' available for a's on the left
                      } else if (ch == 'a') {
                          pairs += gCount;         // this 'a' pairs with every 'g' on its right
                      }
                  }
                  return pairs;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().countAG("abegag")); // 3
              }
          }`,
        alt: [
          { lang: 'python', code: `def count_ag(s):
    g_count = pairs = 0
    for ch in reversed(s):          # walk right to left
        if ch == 'g':
            g_count += 1
        elif ch == 'a':
            pairs += g_count        # pairs with every 'g' on its right
    return pairs` },
          { lang: 'js', code: `function countAG(s) {
  let gCount = 0, pairs = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === 'g') gCount++;
    else if (s[i] === 'a') pairs += gCount;   // pairs with every 'g' on its right
  }
  return pairs;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    long long countAG(const string& s) {
        long long gCount = 0, pairs = 0;
        for (auto it = s.rbegin(); it != s.rend(); ++it) {
            if (*it == 'g') gCount++;
            else if (*it == 'a') pairs += gCount;   // pairs with every 'g' on its right
        }
        return pairs;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public long CountAG(string s) {
        long gCount = 0;   // how many 'g' are to the RIGHT of the current index
        long pairs = 0;
        for (int i = s.Length - 1; i >= 0; i--) {
            char ch = s[i];
            if (ch == 'g') {
                gCount++;                // one more 'g' available for a's on the left
            } else if (ch == 'a') {
                pairs += gCount;         // this 'a' pairs with every 'g' on its right
            }
        }
        return pairs;
    }
}` }
        ],
        dry: {
          head: ['i', 'S[i]', 'action', 'gCount', 'pairs'],
          rows: [
            ['5', 'g', 'gCount++', '1', '0'],
            ['4', 'a', 'pairs += 1', '1', '1'],
            ['3', 'g', 'gCount++', '2', '1'],
            ['2', 'e', 'ignore', '2', '1'],
            ['1', 'b', 'ignore', '2', '1'],
            ['0', 'a', 'pairs += 2', '2', H.c('p', '3')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: each character is looked at exactly once. <b>Space O(1)</b>: just two counters, however long the string.</p>`
      }
    }, {
      title: 'Leaders in an Array',
      level: 'Easy',
      tags: ['carry forward', 'suffix max'],
      statement: `<p>An element is a <b>leader</b> if it is <b>strictly greater</b> than every element to its right. The rightmost element is always a leader. Return all leaders in the order they appear in the array (left to right).</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ A[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([16, 17, 4, 3, 5, 2], { label: 'A', hl: { 1: 'p', 4: 'p', 5: 'p' } })}
        <p>Output: ${H.c('p', '[17, 5, 2]')}. 17 beats 4, 3, 5, 2; 5 beats 2; 2 has nothing on its right. 16 is not a leader because 17 is to its right; 4 is not because 5 is to its right.</p>`,
      brute: {
        why: `<p>For every i, scan all elements to the right and check none is ≥ A[i]: O(N<sup>2</sup>) = 10<sup>10</sup> for N = 10<sup>5</sup>. The waste: "the max of everything to my right" is recomputed from scratch for every i, though it only changes by one element each step.</p>`,
        code: { lang: 'java', code: `
          List<Integer> bruteLeaders(int[] A) {
              List<Integer> res = new ArrayList<>();
              for (int i = 0; i < A.length; i++) {
                  boolean leader = true;
                  for (int j = i + 1; j < A.length; j++) {
                      if (A[j] >= A[i]) { leader = false; break; }
                  }
                  if (leader) res.add(A[i]);
              }
              return res;
          }`, alt: [{ lang: 'python', code: String.raw`
def leaders(a):
    res = []
    for i in range(len(a)):
        leader = True
        for j in range(i + 1, len(a)):
            if a[j] >= a[i]:
                leader = False
                break
        if leader:
            res.append(a[i])
    return res` }, { lang: 'js', code: String.raw`
function leaders(A) {
  const res = [];
  for (let i = 0; i < A.length; i++) {
    let leader = true;
    for (let j = i + 1; j < A.length; j++) {
      if (A[j] >= A[i]) { leader = false; break; }
    }
    if (leader) res.push(A[i]);
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
vector<int> leaders(vector<int>& A) {
    vector<int> res;
    for (int i = 0; i < (int) A.size(); i++) {
        bool leader = true;
        for (int j = i + 1; j < (int) A.size(); j++) {
            if (A[j] >= A[i]) { leader = false; break; }
        }
        if (leader) res.push_back(A[i]);
    }
    return res;
}` }, { lang: 'csharp', code: String.raw`
using System.Collections.Generic;

public class Solution {
    public IList<int> Leaders(int[] A) {
        var res = new List<int>();
        for (int i = 0; i < A.Length; i++) {
            bool leader = true;
            for (int j = i + 1; j < A.Length; j++) {
                if (A[j] >= A[i]) { leader = false; break; }
            }
            if (leader) res.Add(A[i]);
        }
        return res;
    }
}` }] }
      },
      mcq: {
        q: `<p>Which element of a non-empty array is <b>always</b> a leader?</p>`,
        options: ['The last element', 'The first element', 'The smallest element', 'The middle element'],
        answer: 0,
        explain: `<p>The last element has nothing to its right, so "greater than everything on its right" is automatically true. That is why the right-to-left scan starts with maxRight = −∞.</p>`
      },
      hints: [
        `<p><b>Aha:</b> A[i] is a leader ⇔ A[i] &gt; max(A[i+1..N−1]). So you only need "the max of everything to the right" — one number.</p>`,
        `<p>Walk from the right, carrying <code>maxRight</code>. If A[i] &gt; maxRight, add A[i] to a list and set maxRight = A[i]. The list is built right-to-left, so reverse it at the end.</p>`,
        `<p><b>Traps:</b> starting maxRight at <code>Integer.MIN_VALUE</code> breaks if the last element IS <code>Integer.MIN_VALUE</code> (strict &gt; fails) → use <code>long</code> with <code>Long.MIN_VALUE</code> (Python <code>float('-inf')</code>, JS <code>-Infinity</code>, C++ <code>LLONG_MIN</code>). "Strictly greater" means equal values are not leaders (in [5, 5] only the last 5 is).<br><b>Recipe:</b> maxRight = −∞; for i = N−1..0: if A[i] &gt; maxRight → add, maxRight = A[i]. Reverse and return.</p>`
      ],
      tests: { sig: 'int[] -> list<int>', fn: 'leaders', cases: [
        [[[16, 17, 4, 3, 5, 2]], [17, 5, 2]],
        [[[5]], [5]],
        [[[1, 2, 3]], [3]],
        [[[3, 2, 1]], [3, 2, 1]],
        [[[2, 2, 2]], [2]],
        [[[-2147483648]], [-2147483648]],
        [[[-2147483648, -2147483648]], [-2147483648]],
        [[[-1, -5, -3, -4]], [-1, -3, -4]],
        [[[2147483647, 0, 2147483647]], [2147483647]]
      ] },
      solution: {
        approach: `<p>Right-to-left scan, carrying the running maximum of the suffix.</p>`,
        code: `
          class Solution {
              public List<Integer> leaders(int[] A) {
                  List<Integer> res = new ArrayList<>();
                  long maxRight = Long.MIN_VALUE;   // biggest value seen to the right (long: safe even for Integer.MIN_VALUE)
                  for (int i = A.length - 1; i >= 0; i--) {
                      if (A[i] > maxRight) {         // beats everyone on its right
                          res.add(A[i]);
                          maxRight = A[i];           // carry the new max leftwards
                      }
                  }
                  Collections.reverse(res);          // we collected them right-to-left
                  return res;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().leaders(new int[]{16, 17, 4, 3, 5, 2})); // [17, 5, 2]
              }
          }`,
        alt: [
          { lang: 'python', code: `def leaders(a):
    res, max_right = [], float('-inf')
    for x in reversed(a):
        if x > max_right:           # beats everyone on its right
            res.append(x)
            max_right = x
    return res[::-1]                # collected right to left` },
          { lang: 'js', code: `function leaders(A) {
  const res = [];
  let maxRight = -Infinity;
  for (let i = A.length - 1; i >= 0; i--) {
    if (A[i] > maxRight) {          // beats everyone on its right
      res.push(A[i]);
      maxRight = A[i];
    }
  }
  return res.reverse();             // collected right to left
}` },
          { lang: 'cpp', code: `class Solution {
public:
    vector<int> leaders(vector<int>& A) {
        vector<int> res;
        long long maxRight = LLONG_MIN;   // below every int, so the last element always wins
        for (int i = (int)A.size() - 1; i >= 0; i--) {
            if (A[i] > maxRight) {
                res.push_back(A[i]);
                maxRight = A[i];
            }
        }
        reverse(res.begin(), res.end());
        return res;
    }
};` }, { lang: 'csharp', code: String.raw`
using System.Collections.Generic;

public class Solution {
    public IList<int> Leaders(int[] A) {
        var res = new List<int>();
        long maxRight = long.MinValue;     // biggest value seen to the right (long: safe even for int.MinValue)
        for (int i = A.Length - 1; i >= 0; i--) {
            if (A[i] > maxRight) {         // beats everyone on its right
                res.Add(A[i]);
                maxRight = A[i];           // carry the new max leftwards
            }
        }
        res.Reverse();                     // we collected them right-to-left
        return res;
    }
}` }
        ],
        dry: {
          head: ['i', 'A[i]', 'maxRight before', 'A[i] &gt; maxRight?', 'res (right→left)'],
          rows: [
            ['5', '2', '−∞', H.c('g', 'yes'), '[2]'],
            ['4', '5', '2', H.c('g', 'yes'), '[2, 5]'],
            ['3', '3', '5', H.c('r', 'no'), '[2, 5]'],
            ['2', '4', '5', H.c('r', 'no'), '[2, 5]'],
            ['1', '17', '5', H.c('g', 'yes'), '[2, 5, 17]'],
            ['0', '16', '17', H.c('r', 'no'), '[2, 5, 17] → reverse → ' + H.c('p', '[17, 5, 2]')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: one pass plus one reverse. <b>Space O(1)</b> extra besides the output list (only <code>maxRight</code> is carried).</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Kadane's algorithm
  // =====================================================================
  topics.push({
    title: 'Kadane\'s Algorithm: Maximum Subarray Sum',
    analogy: `<p>You are walking through a market street with a bag. Each shop either <b>gives</b> you coins (+) or <b>charges</b> you (−). You may start your walk at any shop and stop at any shop, and you want to leave with the most coins.</p>
      <p>The smart rule: if at some point the coins in your bag go <b>negative</b> (you are in debt), that past is pure <b>baggage</b> — anyone starting fresh at the next shop would do better than you. So you <b>drop the baggage and start again</b>. Meanwhile you write down the best amount you ever had.</p>`,
    explain: `<p>Let <code>cur</code> = the best sum of a subarray that <b>ends exactly at index i</b>. For the next element there are only two choices:</p>
      <ul>
        <li><b>Extend</b> the previous run: <code>cur + A[i]</code></li>
        <li><b>Start fresh</b> at A[i]: <code>A[i]</code></li>
      </ul>
      <p>So <code>cur = max(A[i], cur + A[i])</code>. Starting fresh wins exactly when the old <code>cur</code> was negative. And <code>best = max(best, cur)</code> remembers the best run seen anywhere.</p>
      ${H.arr([-2, 1, -3, 4, -1, 2, 1, -5, 4], { label: 'A', hl: { 3: 'p', 4: 'p', 5: 'p', 6: 'p' } })}
      ${H.table(['i', 'A[i]', 'extend: cur + A[i]', 'fresh: A[i]', 'cur', 'best'], [
        ['0', '−2', '—', '−2', '−2', '−2'],
        ['1', '1', '−1', H.c('g', '1'), '1', '1'],
        ['2', '−3', H.c('g', '−2'), '−3', '−2', '1'],
        ['3', '4', '2', H.c('g', '4'), '4', '4'],
        ['4', '−1', H.c('g', '3'), '−1', '3', '4'],
        ['5', '2', H.c('g', '5'), '2', '5', '5'],
        ['6', '1', H.c('g', '6'), '1', '6', H.c('p', '6')],
        ['7', '−5', H.c('g', '1'), '−5', '1', '6'],
        ['8', '4', H.c('g', '5'), '4', '5', '6']
      ])}
      <p>The answer is ${H.c('p', '6')} from the subarray [4, −1, 2, 1]. Notice we never listed all ~N<sup>2</sup>/2 subarrays — one pass was enough.</p>
      <p><b>All negative numbers?</b> Kadane still works: the answer is the largest single element (e.g. [−3, −1, −2] → −1), because we start <code>best</code> at <code>A[0]</code>, not at 0. (If the problem allows an empty subarray, start best at 0 instead.)</p>
      <p><b>Want the actual subarray?</b> Remember <code>start</code> whenever you start fresh, and save <code>(start, i)</code> whenever <code>best</code> improves.</p>`,
    clues: [
      '"<b>Maximum sum</b> of a <b>contiguous</b> subarray" / "largest sum subarray" → Kadane.',
      'Array has <b>negative</b> numbers (otherwise the whole array would be the answer).',
      '<code>N ≤ 10<sup>5</sup></code> or 10<sup>6</sup> → need O(N); checking all subarrays is O(N<sup>2</sup>).',
      '"Max profit window", "best streak", "max gain over consecutive days" in a story → max subarray sum in disguise.',
      '"Maximum sum <b>rectangle</b> in a matrix" or "circular array" → Kadane plus a twist (see Practice).'
    ],
    code: { lang: 'java', code: `
      int[] kadaneWithIndices(int[] A) {
          long cur = A[0], best = A[0];
          int start = 0, bestL = 0, bestR = 0;
          for (int i = 1; i < A.length; i++) {
              if (cur < 0) {           // old run is baggage: start fresh at i
                  cur = A[i];
                  start = i;
              } else {
                  cur += A[i];         // extend the run
              }
              if (cur > best) {        // new record: remember where it is
                  best = cur;
                  bestL = start;
                  bestR = i;
              }
          }
          return new int[]{bestL, bestR};   // the best subarray is A[bestL..bestR]
      }`, alt: [
        { lang: 'python', code: `def kadane_with_indices(a):
    cur = best = a[0]
    start = best_l = best_r = 0
    for i in range(1, len(a)):
        if cur < 0:              # old run is baggage: start fresh at i
            cur, start = a[i], i
        else:
            cur += a[i]          # extend the run
        if cur > best:           # new record: remember where it is
            best, best_l, best_r = cur, start, i
    return best_l, best_r        # the best subarray is a[best_l..best_r]` },
        { lang: 'js', code: `function kadaneWithIndices(A) {
  let cur = A[0], best = A[0], start = 0, bestL = 0, bestR = 0;
  for (let i = 1; i < A.length; i++) {
    if (cur < 0) { cur = A[i]; start = i; }   // old run is baggage: start fresh at i
    else cur += A[i];                         // extend the run
    if (cur > best) { best = cur; bestL = start; bestR = i; }   // new record
  }
  return [bestL, bestR];   // the best subarray is A[bestL..bestR]
}` },
        { lang: 'cpp', code: `pair<int, int> kadaneWithIndices(const vector<int>& A) {
    long long cur = A[0], best = A[0];
    int start = 0, bestL = 0, bestR = 0;
    for (int i = 1; i < (int)A.size(); i++) {
        if (cur < 0) { cur = A[i]; start = i; }   // old run is baggage: start fresh at i
        else cur += A[i];                         // extend the run
        if (cur > best) { best = cur; bestL = start; bestR = i; }   // new record
    }
    return {bestL, bestR};   // the best subarray is A[bestL..bestR]
}` }, { lang: 'csharp', code: String.raw`
int[] KadaneWithIndices(int[] A) {
    long cur = A[0], best = A[0];
    int start = 0, bestL = 0, bestR = 0;
    for (int i = 1; i < A.Length; i++) {
        if (cur < 0) {           // old run is baggage: start fresh at i
            cur = A[i];
            start = i;
        } else {
            cur += A[i];         // extend the run
        }
        if (cur > best) {        // new record: remember where it is
            best = cur;
            bestL = start;
            bestR = i;
        }
    }
    return new[] { bestL, bestR };   // the best subarray is A[bestL..bestR]
}` }
      ] },
    codeTitle: 'Kadane that also returns where the best subarray is',
    viz: {
      title: 'Kadane: running sum vs best so far',
      input: '-2 1 -3 4 -1 2 1 -5 4',
      inputLabel: 'array (up to 14 numbers)',
      gen: function (input) {
        var a = nums(input, 14, 1);
        var frames = [], cur = a[0], best = a[0], start = 0, bL = 0, bR = 0, curHist = [a[0]];
        frames.push({ narr: 'Start at index 0: the only subarray ending here is [' + a[0] + '], so cur = best = <b>' + a[0] + '</b>.', parts: [
          { type: 'array', label: 'A', values: a.slice(), range: [0, 0], hl: one(0, 'cur'), ptr: one(0, 'i') },
          { type: 'bars', label: 'cur after each index', values: curHist.slice(), hl: one(0, 'cur') },
          { type: 'vars', vals: { cur: cur, best: best } }
        ] });
        for (var i = 1; i < a.length; i++) {
          var ext = cur + a[i], fresh = a[i], narr;
          if (fresh > ext) { narr = 'A[' + i + '] = ' + a[i] + '. Extend gives ' + cur + ' + ' + a[i] + ' = ' + ext + ', start fresh gives ' + fresh + '. The old run (cur = ' + cur + ') was <span class="c-r">negative baggage</span>, so <b>drop it and start fresh</b>.'; cur = fresh; start = i; }
          else { narr = 'A[' + i + '] = ' + a[i] + '. Extend gives ' + cur + ' + ' + a[i] + ' = <b>' + ext + '</b> which is ≥ starting fresh (' + fresh + '), so <b>keep the run going</b>.'; cur = ext; }
          curHist.push(cur);
          var rec = cur > best;
          if (rec) { best = cur; bL = start; bR = i; narr += ' <span class="c-g">New record! best = ' + best + '.</span>'; }
          else narr += ' best stays ' + best + '.';
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'A (blue = current run, purple = best run)', values: a.slice(), range: [start, i], hl: rangeHl(bL, bR, 'sel', one(i, 'cur')), ptr: one(i, 'i') },
            { type: 'bars', label: 'cur after each index', values: curHist.slice(), hl: one(i, rec ? 'ok' : (cur < 0 ? 'bad' : 'cur')) },
            { type: 'vars', vals: { i: i, cur: cur, best: best, 'run start': start }, hl: rec ? { best: 'ok' } : {} }
          ] });
        }
        frames.push({ narr: 'Finished. Maximum subarray sum = <b>' + best + '</b>, from index ' + bL + ' to ' + bR + ' (' + a.slice(bL, bR + 1).join(', ') + '). One pass, two variables.', parts: [
          { type: 'array', label: 'A', values: a.slice(), hl: rangeHl(bL, bR, 'sel') },
          { type: 'vars', label: 'answer', vals: { best: best }, hl: { best: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'All negative numbers', html: `<p>A = [−3, −1, −2]. cur/best start at −3. i = 1: max(−1, −4) = −1 → best −1. i = 2: max(−2, −3) = −2 → best stays <b>−1</b>. If you had started best at 0 you would wrongly answer 0 (the empty subarray). Ask the interviewer: "Is an empty subarray allowed?"</p>${H.arr([-3, -1, -2], { label: 'A', hl: { 1: 'p' } })}` },
      { title: 'Returning the subarray itself', html: `<p>A = [2, −5, 3, 1, −1, 4]. Track <code>start</code> when you restart, and save <code>(start, i)</code> on every new record. Restart happens at index 2 (cur was −3). Records: 2 (0..0), 3 (2..2), 4 (2..3), 7 (2..5). Answer <b>7</b> from A[2..5] = [3, 1, −1, 4].</p>
        ${H.table(['i', 'A[i]', 'cur', 'start', 'best (L..R)'], [['0', '2', '2', '0', '2 (0..0)'], ['1', '−5', '−3', '0', '2'], ['2', '3', H.c('g', '3 (fresh)'), '2', '3 (2..2)'], ['3', '1', '4', '2', '4 (2..3)'], ['4', '−1', '3', '2', '4'], ['5', '4', '7', '2', H.c('p', '7 (2..5)')]])}` },
      { title: 'Maximum sum with one circular wrap', html: `<p>A = [5, −3, 5] in a circle. Normal Kadane gives 7 (5 + −3 + 5). But wrapping around, [5, 5] (last then first) gives <b>10</b>. Trick: best wrap = total − (minimum subarray sum) = 7 − (−3) = 10. Answer = max(normal, wrap), except when all numbers are negative (then the min subarray is the whole array and the wrap would be empty) — see the Practice problem "Maximum Sum Circular Subarray".</p>` },
      { title: 'Minimum subarray sum = Kadane on the flipped array', html: `<p>To find the <b>smallest</b> sum, either flip every sign and run Kadane (then flip the answer), or replace max with min. A = [3, −4, 2, −3, −1, 7]: min run is [−4, 2, −3, −1] = <b>−6</b>.</p>`, code: { lang: 'java', code: `int[] A = {3, -4, 2, -3, -1, 7};
long cur = A[0], worst = A[0];
for (int i = 1; i < A.length; i++) {
    cur = Math.min(A[i], cur + A[i]);   // same recurrence, min instead of max
    worst = Math.min(worst, cur);
}
System.out.println(worst);   // -6`, alt: [
        { lang: 'python', run: true, code: `A = [3, -4, 2, -3, -1, 7]
cur = worst = A[0]
for x in A[1:]:
    cur = min(x, cur + x)      # same recurrence, min instead of max
    worst = min(worst, cur)
print(worst)   # -6` },
        { lang: 'js', run: true, code: `const A = [3, -4, 2, -3, -1, 7];
let cur = A[0], worst = A[0];
for (let i = 1; i < A.length; i++) {
  cur = Math.min(A[i], cur + A[i]);   // same recurrence, min instead of max
  worst = Math.min(worst, cur);
}
console.log(worst);   // -6` },
        { lang: 'cpp', code: `vector<int> A = {3, -4, 2, -3, -1, 7};
long long cur = A[0], worst = A[0];
for (size_t i = 1; i < A.size(); i++) {
    cur = min<long long>(A[i], cur + A[i]);   // same recurrence, min instead of max
    worst = min(worst, cur);
}
cout << worst << "\\n";   // -6` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[] A = { 3, -4, 2, -3, -1, 7 };
        long cur = A[0], worst = A[0];
        for (int i = 1; i < A.Length; i++) {
            cur = Math.Min(A[i], cur + A[i]);   // same recurrence, min instead of max
            worst = Math.Min(worst, cur);
        }
        Console.WriteLine(worst);   // -6
    }
}`, run: true }
      ] } }
    ],
    deepDive: `<h4>Kadane is the simplest dynamic programming</h4><p>Define <code>dp[i]</code> = best sum of a subarray <b>ending at i</b>. Then <code>dp[i] = A[i] + max(dp[i−1], 0)</code> and the answer is <code>max(dp)</code>. Because dp[i] only needs dp[i−1], the array collapses to one variable — the classic DP "space optimisation" you will see again in the DP modules.</p>
      <h4>Proof sketch</h4><p>Any optimal subarray ends at some index j. The best subarray ending at j is either [A[j]] alone or extends the best subarray ending at j − 1 (if a worse one ending at j − 1 were used, swapping in the better one would increase the total — contradiction). So taking max over all j finds the global optimum.</p>
      <h4>Prefix-sum view (same algorithm, different words)</h4><p>sum(L..R) = P[R+1] − P[L]. To maximise it for a fixed R, subtract the <b>smallest</b> prefix seen before: <code>best = max(best, P[R+1] − minPrefix)</code>. That is "buy low, sell high" on the prefix-sum chart — Kadane and stock profit are the same problem.</p>
      <h4>Variants</h4><ul><li><b>Max product</b> subarray: carry both max and min (a negative times the min can become the max).</li><li><b>At least length k</b>: combine prefix sums with a sliding minimum.</li><li><b>2D max-sum rectangle</b>: fix top and bottom rows, compress columns into a 1D array, run Kadane → O(R<sup>2</sup>·C).</li><li><b>At most one deletion</b>: two DP states (no delete yet / already deleted).</li></ul>
      <h4>Ties and indices</h4><p>Using <code>cur &lt; 0</code> to restart (strict) keeps runs that are exactly 0 — giving the <b>longest</b> best subarray; restarting on <code>cur &lt;= 0</code> gives a shorter one. Clarify which subarray to return when several have the same sum.</p>`,
    aiEra: `<p><b>What AI changes:</b> every assistant knows Kadane by name. Interviewers now ask the twists — circular, product, return indices, at most one deletion, 2D — where a memorised snippet is not enough.</p>
      <p><b>Use AI as a partner:</b> <code>Explain Kadane as a DP: define the state, transition, base case — then quiz me with 3 variants</code>. Ask it to draw the prefix-sum chart for your example so you see the "buy low, sell high" connection.</p>
      <p><b>Where AI goes wrong:</b> initialising best = 0 (fails all-negative), forgetting the all-negative edge case in the circular version, or using only a running max in the product version.</p>
      <p><b>What you must still own:</b> stating the DP state in words ("best sum ending exactly here"), proving the restart rule, and adapting the recurrence to the twist the interviewer adds.</p>`,
    problems: [{
      title: 'Maximum Subarray Sum',
      level: 'Medium',
      tags: ['kadane', 'carry forward', 'dp'],
      statement: `<p>Given an integer array <code>A</code> of size <code>N</code>, find the largest possible sum of a <b>non-empty contiguous</b> subarray.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ A[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([-2, 1, -3, 4, -1, 2, 1, -5, 4], { label: 'A', hl: { 3: 'p', 4: 'p', 5: 'p', 6: 'p' } })}
        <p>Output: ${H.c('p', '<b>6</b>')} from ${H.c('p', '[4, −1, 2, 1]')}. Adding the −5 after it would drop us to 1, and including the earlier part (−2, 1, −3 sums to −4) would only lower the total.</p>`,
      brute: {
        why: `<p>Try every start i and extend the end j one step at a time keeping a running sum: N(N+1)/2 ≈ 5 × 10<sup>9</sup> subarrays for N = 10<sup>5</sup> → TLE. The waste: we keep extending runs that are already negative, even though a negative prefix can never help.</p>`,
        code: { lang: 'java', code: `
          long bruteMaxSub(int[] A) {
              long best = Long.MIN_VALUE;
              for (int i = 0; i < A.length; i++) {
                  long s = 0;
                  for (int j = i; j < A.length; j++) {
                      s += A[j];                    // sum of A[i..j]
                      best = Math.max(best, s);
                  }
              }
              return best;
          }`, alt: [{ lang: 'python', code: String.raw`
def max_sub_array(a):
    best = float('-inf')
    for i in range(len(a)):
        s = 0
        for j in range(i, len(a)):
            s += a[j]                    # sum of a[i..j]
            best = max(best, s)
    return best` }, { lang: 'js', code: String.raw`
function maxSubArray(A) {
  let best = -Infinity;
  for (let i = 0; i < A.length; i++) {
    let s = 0;
    for (let j = i; j < A.length; j++) {
      s += A[j];                    // sum of A[i..j]
      best = Math.max(best, s);
    }
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
long long maxSubArray(vector<int>& A) {
    long long best = LLONG_MIN;
    for (int i = 0; i < (int) A.size(); i++) {
        long long s = 0;
        for (int j = i; j < (int) A.size(); j++) {
            s += A[j];                    // sum of A[i..j]
            best = max(best, s);
        }
    }
    return best;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public long MaxSubArray(int[] A) {
        long best = long.MinValue;
        for (int i = 0; i < A.Length; i++) {
            long s = 0;
            for (int j = i; j < A.Length; j++) {
                s += A[j];                    // sum of A[i..j]
                best = Math.Max(best, s);
            }
        }
        return best;
    }
}` }] }
      },
      mcq: {
        q: `<p>Your running sum <code>cur</code> (best subarray ending at the previous index) is −5. The next element is 3. What should <code>cur</code> become?</p>`,
        options: ['3 — drop the −5 baggage and start fresh', '−2 — always extend', '−5 — skip the 3', '0 — reset to zero'],
        answer: 0,
        explain: `<p>cur = max(A[i], cur + A[i]) = max(3, −2) = 3. Carrying a negative sum forward only makes every future total smaller, so starting fresh is better.</p>`
      },
      hints: [
        `<p><b>Aha:</b> the best subarray ending at i either is just A[i], or is (best subarray ending at i−1) + A[i]. So <code>cur(i) = max(A[i], cur(i−1) + A[i])</code>. A negative <code>cur</code> is never worth keeping.</p>`,
        `<p>No array needed: carry two <code>long</code> variables — <code>cur</code> (best ending here) and <code>best</code> (best anywhere so far). Update both in one left-to-right pass.</p>`,
        `<p><b>Traps:</b> all-negative input → initialise <code>best = A[0]</code>, not 0 (answer for [−3, −1] is −1). Use <code>long</code>: 10<sup>5</sup> × 10<sup>9</sup> overflows int.<br><b>Recipe:</b> cur = best = A[0]; for i = 1..N−1: cur = max(A[i], cur + A[i]); best = max(best, cur). Return best.</p>`
      ],
      tests: { sig: 'int[] -> long', fn: 'maxSubArray', cases: [
        [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], 6],
        [[[-3]], -3],
        [[[-5, -2, -8]], -2],
        [[[1000000000, 1000000000, 1000000000, 1000000000, 1000000000]], 5000000000],
        [[[1, -1, 1, -1, 1]], 1],
        [[[5, 4, -1, 7, 8]], 23],
        [[[0]], 0],
        [[[-1000000000, -1000000000]], -1000000000]
      ] },
      solution: {
        approach: `<p>Kadane's algorithm: carry "best sum ending here" and "best sum seen", one pass.</p>`,
        code: `
          class Solution {
              public long maxSubArray(int[] A) {
                  long cur = A[0];    // best sum of a subarray that ENDS exactly at the current index
                  long best = A[0];   // best sum seen anywhere so far (A[0], not 0: handles all-negative input)
                  for (int i = 1; i < A.length; i++) {
                      // extend the previous run, or start a new run at A[i] — whichever is bigger
                      cur = Math.max(A[i], cur + A[i]);
                      best = Math.max(best, cur);
                  }
                  return best;
              }

              public static void main(String[] args) {
                  int[] A = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
                  System.out.println(new Solution().maxSubArray(A)); // 6
              }
          }`,
        alt: [
          { lang: 'python', code: `def max_sub_array(a):
    cur = best = a[0]                  # a[0], not 0: handles all-negative input
    for x in a[1:]:
        cur = max(x, cur + x)          # extend the run or start fresh
        best = max(best, cur)
    return best` },
          { lang: 'js', code: `function maxSubArray(A) {
  let cur = A[0], best = A[0];        // A[0], not 0: handles all-negative input
  for (let i = 1; i < A.length; i++) {
    cur = Math.max(A[i], cur + A[i]); // extend the run or start fresh
    best = Math.max(best, cur);
  }
  return best;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    long long maxSubArray(vector<int>& A) {
        long long cur = A[0], best = A[0];        // A[0], not 0: handles all-negative input
        for (size_t i = 1; i < A.size(); i++) {
            cur = max<long long>(A[i], cur + A[i]);   // extend the run or start fresh
            best = max(best, cur);
        }
        return best;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public long MaxSubArray(int[] A) {
        long cur = A[0];    // best sum of a subarray that ENDS exactly at the current index
        long best = A[0];   // best sum seen anywhere so far (A[0], not 0: handles all-negative input)
        for (int i = 1; i < A.Length; i++) {
            // extend the previous run, or start a new run at A[i] - whichever is bigger
            cur = Math.Max(A[i], cur + A[i]);
            best = Math.Max(best, cur);
        }
        return best;
    }
}` }
        ],
        dry: {
          head: ['i', 'A[i]', 'cur = max(A[i], cur + A[i])', 'best'],
          rows: [
            ['0', '−2', '−2 (start)', '−2'],
            ['1', '1', 'max(1, −1) = 1 (fresh)', '1'],
            ['2', '−3', 'max(−3, −2) = −2', '1'],
            ['3', '4', 'max(4, 2) = 4 (fresh)', '4'],
            ['4', '−1', 'max(−1, 3) = 3', '4'],
            ['5', '2', 'max(2, 5) = 5', '5'],
            ['6', '1', 'max(1, 6) = 6', H.c('p', '6')],
            ['7', '−5', 'max(−5, 1) = 1', '6'],
            ['8', '4', 'max(4, 5) = 5', '6']
          ]
        },
        complexity: `<p><b>Time O(N)</b>: each element is visited once with two max() calls. <b>Space O(1)</b>: only <code>cur</code> and <code>best</code> are stored.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Contribution technique
  // =====================================================================
  topics.push({
    title: 'Contribution Technique: Sum of All Subarray Sums in O(N)',
    analogy: `<p>A class of students takes many group photos — every possible "group of neighbours standing in a row". The photographer wants the total number of times all students appear across all photos. Instead of flipping through every photo, she asks each student: "<b>How many photos are you in?</b>" and adds up those answers. That flip — <b>from "each photo" to "each person"</b> — is the contribution technique.</p>`,
    explain: `<p>Question: add up the sums of <b>all</b> subarrays. There are N(N+1)/2 subarrays, so listing them is slow. Flip it: element <code>A[i]</code> adds <code>A[i]</code> to <b>every subarray that contains it</b>. So:</p>
      <p><code>answer = ∑ A[i] × (number of subarrays containing index i)</code></p>
      <p><b>Counting the subarrays that contain i:</b> a subarray is fixed by a start and an end. To include i, the start must be one of <code>0, 1, ..., i</code> → <b>(i + 1)</b> choices, and the end must be one of <code>i, ..., N−1</code> → <b>(N − i)</b> choices. Every start can pair with every end:</p>
      <p><code>count(i) = (i + 1) × (N − i)</code></p>
      ${H.arr([1, 2, 3], { label: 'A (N = 3)' })}
      ${H.table(['i', 'A[i]', 'starts (i+1)', 'ends (N−i)', 'count', 'contribution'], [['0', '1', '1', '3', '3', '1 × 3 = 3'], ['1', '2', '2', '2', '4', '2 × 4 = 8'], ['2', '3', '3', '1', '3', '3 × 3 = 9'], ['', '', '', '', 'total', H.c('p', '<b>20</b>')]])}
      <p>Check by listing: [1]=1, [2]=2, [3]=3, [1,2]=3, [2,3]=5, [1,2,3]=6 → 1+2+3+3+5+6 = <b>20</b> ✔.</p>
      <p>Middle elements are inside more subarrays than edge elements — the count looks like a hill: for N = 5 the counts are 5, 8, 9, 8, 5.</p>`,
    clues: [
      '"Sum over <b>all subarrays</b> of ..." / "total of all subarray sums" → ask how many subarrays contain each element.',
      '"Sum of all submatrices" → 2D version: count = (i+1)(j+1)(N−i)(M−j).',
      '"In how many subarrays does A[i] appear?" → (i + 1) × (N − i).',
      '<code>N ≤ 10<sup>5</sup></code> and the number of subarrays is ~5 × 10<sup>9</sup> → you cannot list them; count contributions in O(N).',
      'Answer can be huge → use <code>long</code> and multiply as long (<code>(long) A[i] * ...</code>) or take mod.'
    ],
    viz: {
      title: 'How many subarrays contain each index?',
      input: '1 2 3 4',
      inputLabel: 'array (up to 10 numbers)',
      gen: function (input) {
        var a = nums(input, 10, 1);
        var n = a.length, frames = [], contrib = [], total = 0;
        frames.push({ narr: 'There are N(N+1)/2 = <b>' + (n * (n + 1) / 2) + '</b> subarrays. Instead of listing them, we ask each element: "how many of those subarrays contain you?"', parts: [
          { type: 'array', label: 'A', values: a.slice() },
          { type: 'vars', vals: { N: n, subarrays: n * (n + 1) / 2 } }
        ] });
        for (var i = 0; i < n; i++) {
          var st = i + 1, en = n - i, cnt = st * en;
          frames.push({ narr: 'Index ' + i + ': a subarray that contains it must <b>start</b> somewhere in 0..' + i + ' (blue) → <b>' + st + '</b> choices.', parts: [
            { type: 'array', label: 'possible starts', values: a.slice(), range: [0, i], hl: one(i, 'cur'), ptr: one(i, 'i') },
            { type: 'vars', vals: { i: i, starts: st } }
          ] });
          frames.push({ narr: '...and <b>end</b> somewhere in ' + i + '..' + (n - 1) + ' (blue) → <b>' + en + '</b> choices. Any start pairs with any end, so index ' + i + ' is inside ' + st + ' × ' + en + ' = <b>' + cnt + '</b> subarrays.', parts: [
            { type: 'array', label: 'possible ends', values: a.slice(), range: [i, n - 1], hl: one(i, 'cur'), ptr: one(i, 'i') },
            { type: 'vars', vals: { i: i, starts: st, ends: en, count: cnt } }
          ] });
          contrib.push(a[i] * cnt); total += a[i] * cnt;
          frames.push({ narr: 'So A[' + i + '] = ' + a[i] + ' is added ' + cnt + ' times: contribution = ' + a[i] + ' × ' + cnt + ' = <b>' + (a[i] * cnt) + '</b>. Running total = ' + total + '.', parts: [
            { type: 'bars', label: 'contribution of each index', values: contrib.slice(), hl: one(i, 'ok'), texts: contrib.map(function (v, k) { return a[k] + '×' + ((k + 1) * (n - k)) + '=' + v; }) },
            { type: 'vars', vals: { total: total }, hl: { total: 'ok' } }
          ] });
        }
        frames.push({ narr: 'Sum of all subarray sums = <b>' + total + '</b>, computed in O(N) without listing a single subarray.', parts: [
          { type: 'bars', label: 'contributions', values: contrib.slice(), hl: rangeHl(0, n - 1, 'sel') },
          { type: 'vars', label: 'answer', vals: { 'sum of all subarray sums': total }, hl: { 'sum of all subarray sums': 'sel' } }
        ] });
        return frames;
      }
    },
    after: `<p><b>Same trick in 2D — sum of all submatrix sums:</b> cell (i, j) of an N × M matrix is inside <code>(i+1)(j+1)</code> choices of top-left corner and <code>(N−i)(M−j)</code> choices of bottom-right corner, so it contributes <code>A[i][j] × (i+1)(j+1)(N−i)(M−j)</code>. For [[1, 1], [1, 1]] each cell appears in 1·1·2·2 = 4 submatrices → total 16.</p>`,
    examples: [
      { title: 'Hill-shaped counts for N = 5', html: `<p>count(i) = (i+1)(N−i): ${H.table(['i', '0', '1', '2', '3', '4'], [['starts', '1', '2', '3', '4', '5'], ['ends', '5', '4', '3', '2', '1'], ['count', '5', '8', H.c('p', '9'), '8', '5']])} The counts add up to 35 = 1·5 + 2·4 + 3·3 + 4·2 + 5·1, and the sum of all subarray <b>lengths</b> for N = 5 is also 35 — two ways to count the same thing. Sanity checks like this catch formula slips.</p>` },
      { title: 'Sum of all odd-length subarrays', html: `<p>Only odd-length subarrays count. For index i with L = i + 1 starts and R = N − i ends, a subarray has odd length when the number of elements on the left of i and on the right of i are both even or both odd. That gives <code>oddCount(i) = ⌈L/2⌉·⌈R/2⌉ + ⌊L/2⌋·⌊R/2⌋</code>. A = [1, 4, 2, 5, 3]: odd counts = 3, 4, 5, 4, 3 → 1·3 + 4·4 + 2·5 + 5·4 + 3·3 = <b>58</b> (LeetCode 1588).</p>`, code: { lang: 'java', code: `int[] A = {1, 4, 2, 5, 3};
int n = A.length;
long total = 0;
for (int i = 0; i < n; i++) {
    long L = i + 1, R = n - i;                       // choices of start / end
    long odd = ((L + 1) / 2) * ((R + 1) / 2) + (L / 2) * (R / 2);
    total += A[i] * odd;
}
System.out.println(total);   // 58`, alt: [
        { lang: 'python', run: true, code: `A = [1, 4, 2, 5, 3]
n = len(A)
total = 0
for i, x in enumerate(A):
    L, R = i + 1, n - i                          # choices of start / end
    odd = ((L + 1) // 2) * ((R + 1) // 2) + (L // 2) * (R // 2)
    total += x * odd
print(total)   # 58` },
        { lang: 'js', run: true, code: `const A = [1, 4, 2, 5, 3];
const n = A.length;
let total = 0;
for (let i = 0; i < n; i++) {
  const L = i + 1, R = n - i;                   // choices of start / end
  const odd = Math.floor((L + 1) / 2) * Math.floor((R + 1) / 2) + Math.floor(L / 2) * Math.floor(R / 2);
  total += A[i] * odd;
}
console.log(total);   // 58` },
        { lang: 'cpp', code: `vector<int> A = {1, 4, 2, 5, 3};
long long n = A.size(), total = 0;
for (long long i = 0; i < n; i++) {
    long long L = i + 1, R = n - i;              // choices of start / end
    long long odd = ((L + 1) / 2) * ((R + 1) / 2) + (L / 2) * (R / 2);
    total += A[i] * odd;
}
cout << total << "\\n";   // 58` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[] A = { 1, 4, 2, 5, 3 };
        int n = A.Length;
        long total = 0;
        for (int i = 0; i < n; i++) {
            long L = i + 1, R = n - i;                       // choices of start / end
            long odd = ((L + 1) / 2) * ((R + 1) / 2) + (L / 2) * (R / 2);
            total += A[i] * odd;
        }
        Console.WriteLine(total);   // 58
    }
}`, run: true }
      ] } },
      { title: 'Sum of all submatrix sums (2D contribution)', html: `<p>Matrix [[1, 2], [3, 4]] (N = M = 2). Cell (i, j) is inside (i+1)(j+1)(N−i)(M−j) submatrices — every corner cell of a 2 × 2 grid is inside 1·1·2·2 = 4 of the 9 submatrices. Total = 4 × (1 + 2 + 3 + 4) = <b>40</b>. Listing all 9 submatrices by hand confirms it.</p>` },
      { title: 'Number of subarrays where A[i] is the maximum (preview)', html: `<p>The contribution idea scales: "sum of max of every subarray" = ∑ A[i] × (number of subarrays where A[i] is the max). That count is (distance to previous greater) × (distance to next greater), found with a monotonic stack (Stacks module). A = [3, 1, 2]: 3 is max in 3 subarrays, 1 in 1, 2 in 2 → 3·3 + 1·1 + 2·2 = <b>14</b>. Check: [3]=3, [1]=1, [2]=2, [3,1]=3, [1,2]=2, [3,1,2]=3 → 14 ✔.</p>` }
    ],
    deepDive: `<h4>The underlying principle: swap the order of summation</h4><p>∑<sub>subarrays</sub> ∑<sub>i in subarray</sub> A[i] = ∑<sub>i</sub> A[i] × #(subarrays containing i). Whenever a double sum is over "groups" and "members", flipping it to "members × how many groups" is usually cheaper. Mathematicians call it exchanging summations; competitive programmers call it the contribution technique.</p>
      <h4>Counting tools you need</h4><ul><li>Number of subarrays of an N-array: N(N+1)/2.</li><li>Number containing index i: (i+1)(N−i).</li><li>Number of subsequences containing i: 2<sup>N−1</sup> (every other element is in or out) → "sum over all subsets" = (∑A) × 2<sup>N−1</sup>.</li><li>Pairs (i &lt; j): N(N−1)/2 — "sum of |A[i] − A[j]| over all pairs" becomes, after sorting, ∑ A[i]·(2i − N + 1).</li></ul>
      <h4>Overflow math</h4><p>N = 10<sup>5</sup>: max count ≈ (N/2)<sup>2</sup> = 2.5·10<sup>9</sup>; times A[i] = 10<sup>9</sup> gives 2.5·10<sup>18</sup>, near the <code>long</code> limit (9.2·10<sup>18</sup>). Summing many such terms can overflow even <code>long</code> → problems then ask "mod 10<sup>9</sup>+7": reduce each factor mod M before multiplying.</p>
      <h4>Where it shows up later</h4><p>Sum of subarray minimums/maximums (monotonic stack), sum of distances in a tree (each edge's contribution = size × (N − size)), expected value problems (linearity of expectation is contribution in disguise), and XOR of all subarray XORs (each element appears (i+1)(N−i) times, only parity matters).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can derive (i+1)(N−i) quickly, but it often fumbles the follow-ups (odd-length only, subsequences, mod arithmetic). Interviews use these twists to see if you understand the counting, not the formula.</p>
      <p><b>Use AI as a partner:</b> <code>For N = 4, list every subarray and mark which contain index 1 — I want to verify my count by hand</code>. Generating the enumeration is boring; checking it is learning.</p>
      <p><b>Where AI goes wrong:</b> mixing 1-indexed and 0-indexed formulas (i × (N − i + 1) vs (i + 1)(N − i)), multiplying in <code>int</code>, or applying mod after the multiplication has already overflowed.</p>
      <p><b>What you must still own:</b> recognising "sum over all subarrays / pairs / subsets" as a contribution question, and deriving the count from first principles ("how many starts × how many ends") in front of the interviewer.</p>`,
    problems: [{
      title: 'Sum of All Subarray Sums',
      level: 'Medium',
      tags: ['contribution technique', 'math'],
      statement: `<p>Given an array <code>A</code> of size <code>N</code>, return the sum of the sums of <b>all</b> its non-empty contiguous subarrays.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ A[i] ≤ 10<sup>4</sup> (answer fits in a <code>long</code>)`,
      example: `${H.arr([1, 2, 3], { label: 'A' })}
        ${H.table(['subarray', 'sum'], [['[1]', '1'], ['[2]', '2'], ['[3]', '3'], ['[1, 2]', '3'], ['[2, 3]', '5'], ['[1, 2, 3]', '6'], ['<b>total</b>', H.c('p', '<b>20</b>')]])}
        <p>Seen per element: 1 appears in 3 subarrays, 2 in 4, 3 in 3 → 1·3 + 2·4 + 3·3 = ${H.c('p', '20')}.</p>`,
      brute: {
        why: `<p>Loop over every start, extend the end and add the running sum each time: ~N<sup>2</sup>/2 = 5 × 10<sup>9</sup> steps for N = 10<sup>5</sup> → TLE. The waste: we add the same A[i] again and again (once per subarray) when a single multiplication by its count would do.</p>`,
        code: { lang: 'java', code: `
          long bruteAllSubarraySums(int[] A) {
              long total = 0;
              for (int i = 0; i < A.length; i++) {
                  long s = 0;
                  for (int j = i; j < A.length; j++) {
                      s += A[j];       // sum of A[i..j]
                      total += s;      // add this subarray's sum
                  }
              }
              return total;
          }`, alt: [{ lang: 'python', code: String.raw`
def subarray_sum_total(a):
    total = 0
    for i in range(len(a)):
        s = 0
        for j in range(i, len(a)):
            s += a[j]       # sum of a[i..j]
            total += s      # add this subarray's sum
    return total` }, { lang: 'js', code: String.raw`
function subarraySumTotal(A) {
  let total = 0;
  for (let i = 0; i < A.length; i++) {
    let s = 0;
    for (let j = i; j < A.length; j++) {
      s += A[j];       // sum of A[i..j]
      total += s;      // add this subarray's sum
    }
  }
  return total;
}` }, { lang: 'cpp', code: String.raw`
long long subarraySumTotal(vector<int>& A) {
    long long total = 0;
    for (int i = 0; i < (int) A.size(); i++) {
        long long s = 0;
        for (int j = i; j < (int) A.size(); j++) {
            s += A[j];       // sum of A[i..j]
            total += s;      // add this subarray's sum
        }
    }
    return total;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public long SubarraySumTotal(int[] A) {
        long total = 0;
        for (int i = 0; i < A.Length; i++) {
            long s = 0;
            for (int j = i; j < A.Length; j++) {
                s += A[j];       // sum of A[i..j]
                total += s;      // add this subarray's sum
            }
        }
        return total;
    }
}` }] }
      },
      mcq: {
        q: `<p>For an array of size N = 5, in how many subarrays does index 2 (0-indexed) appear?</p>`,
        options: ['9 = (2+1) × (5−2)', '6 = 2 × 3', '5 = N', '15 = all subarrays'],
        answer: 0,
        explain: `<p>Starts can be 0, 1 or 2 (3 choices); ends can be 2, 3 or 4 (3 choices). 3 × 3 = 9 subarrays contain index 2.</p>`
      },
      hints: [
        `<p><b>Aha:</b> flip the sum. Instead of "for each subarray, add its elements", do "for each element, add it once per subarray that contains it": <code>∑ A[i] × (i+1) × (N−i)</code>.</p>`,
        `<p>No data structure needed. One loop over i, one <code>long total</code>. (i+1) = number of possible left ends, (N−i) = number of possible right ends.</p>`,
        `<p><b>Traps:</b> <code>A[i] * (i+1) * (N−i)</code> in <code>int</code> overflows (10<sup>4</sup> × 5·10<sup>4</sup> × 5·10<sup>4</sup> = 2.5·10<sup>13</sup>) → cast to <code>long</code> <b>before</b> multiplying. Watch 0-indexing: with 1-indexed positions the formula is i × (N − i + 1).<br><b>Recipe:</b> total = 0; for i in 0..N−1: total += (long) A[i] × (i + 1) × (N − i). Return total.</p>`
      ],
      tests: { sig: 'int[] -> long', fn: 'subarraySumTotal', cases: [
        [[[1, 2, 3]], 20],
        [[[5]], 5],
        [[[1, 1]], 4],
        [[[10000, 10000, 10000]], 100000],
        [[[3, 1, 4, 1, 5]], 92],
        [[[2, 7, 1, 8, 2, 8]], 258],
        [[Array(1000).fill(10000)], 1671670000000]
      ] },
      solution: {
        approach: `<p>Each A[i] is counted in (i+1)(N−i) subarrays; add A[i] times that count.</p>`,
        code: `
          class Solution {
              public long subarraySumTotal(int[] A) {
                  int n = A.length;
                  long total = 0;
                  for (int i = 0; i < n; i++) {
                      long starts = i + 1;   // a subarray containing i can start at 0..i
                      long ends = n - i;     // ...and end at i..n-1
                      // A[i] is added once inside each of those starts*ends subarrays
                      total += (long) A[i] * starts * ends;
                  }
                  return total;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().subarraySumTotal(new int[]{1, 2, 3})); // 20
              }
          }`,
        alt: [
          { lang: 'python', code: `def subarray_sum_total(a):
    n = len(a)
    # a[i] sits in (i + 1) * (n - i) subarrays
    return sum(x * (i + 1) * (n - i) for i, x in enumerate(a))` },
          { lang: 'js', code: `function subarraySumTotal(A) {
  const n = BigInt(A.length);
  let total = 0n;                     // BigInt: the answer can pass 2^53
  A.forEach((x, i) => {
    const k = BigInt(i);
    total += BigInt(x) * (k + 1n) * (n - k);   // starts * ends subarrays hold A[i]
  });
  return total;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    long long subarraySumTotal(vector<int>& A) {
        long long n = A.size(), total = 0;
        for (long long i = 0; i < n; i++)
            total += A[i] * (i + 1) * (n - i);   // starts * ends subarrays hold A[i]
        return total;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public long SubarraySumTotal(int[] A) {
        int n = A.Length;
        long total = 0;
        for (int i = 0; i < n; i++) {
            long starts = i + 1;   // a subarray containing i can start at 0..i
            long ends = n - i;     // ...and end at i..n-1
            // A[i] is added once inside each of those starts*ends subarrays
            total += (long)A[i] * starts * ends;
        }
        return total;
    }
}` }
        ],
        dry: {
          head: ['i', 'A[i]', 'starts = i+1', 'ends = N−i', 'count', 'A[i] × count', 'total'],
          rows: [
            ['0', '1', '1', '3', '3', '3', '3'],
            ['1', '2', '2', '2', '4', '8', '11'],
            ['2', '3', '3', '1', '3', '9', H.c('p', '20')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: one multiplication per element. <b>Space O(1)</b>: only the running total.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Prefix / suffix max: Trapping Rain Water
  // =====================================================================
  topics.push({
    title: 'Prefix Max & Suffix Max: Trapping Rain Water',
    analogy: `<p>Imagine a row of buildings of different heights after heavy rain. Stand on the roof of one building and look <b>left</b>: find the tallest wall. Look <b>right</b>: find the tallest wall. Water above your roof can rise only up to the <b>shorter</b> of those two walls — any higher and it spills over the short side, like water in a bucket with one short side.</p>`,
    explain: `<p>For each bar i:</p>
      <p><code>water[i] = min(tallest on the left incl. i, tallest on the right incl. i) − height[i]</code></p>
      <p>Computing "tallest on the left" from scratch for every i is O(N) each → O(N<sup>2</sup>). Instead, build two helper arrays once:</p>
      <ul>
        <li><b>Prefix max</b> <code>LMax[i] = max(LMax[i−1], h[i])</code> — filled left to right.</li>
        <li><b>Suffix max</b> <code>RMax[i] = max(RMax[i+1], h[i])</code> — filled right to left.</li>
      </ul>
      <p>This is just carry-forward of a maximum, saved at every index.</p>
      ${H.table(['i', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], [
        ['h', '0', '1', '0', '2', '1', '0', '1', '3', '2', '1', '2', '1'],
        ['LMax', '0', '1', '1', '2', '2', '2', '2', '3', '3', '3', '3', '3'],
        ['RMax', '3', '3', '3', '3', '3', '3', '3', '3', '2', '2', '2', '1'],
        ['min', '0', '1', '1', '2', '2', '2', '2', '3', '2', '2', '2', '1'],
        ['water', '0', '0', H.c('b', '1'), '0', H.c('b', '1'), H.c('b', '2'), H.c('b', '1'), '0', '0', H.c('b', '1'), '0', '0']
      ])}
      <p>Total water = 1 + 1 + 2 + 1 + 1 = ${H.c('p', '<b>6</b>')}.</p>
      <p>Including h[i] itself in LMax/RMax is a neat trick: then <code>min − h[i]</code> is never negative, so you never need an extra <code>max(0, ...)</code>.</p>
      <p><b>O(1) space bonus (two pointers):</b> put L at the left end and R at the right end. Whichever side has the <b>smaller</b> running max is the limiting wall for its pointer, so you can settle that bar's water right away and move that pointer inward.</p>`,
    clues: [
      '"How much water can be trapped" / "elevation map" → water[i] = min(prefixMax, suffixMax) − h[i].',
      '"Tallest to the left" and "tallest to the right" of every index → build prefix-max and suffix-max arrays.',
      '"For every element, compare with the best on <b>both</b> sides" → two passes (left→right, right→left).',
      '<code>N ≤ 10<sup>5</sup></code> → O(N<sup>2</sup>) "scan both sides for each bar" is too slow; O(N) with helper arrays.',
      '"Without extra space" → two-pointer version that moves the side with the smaller max.'
    ],
    code: { lang: 'java', code: `
      long trapTwoPointers(int[] h) {
          int L = 0, R = h.length - 1;
          int leftMax = 0, rightMax = 0;
          long water = 0;
          while (L < R) {
              leftMax = Math.max(leftMax, h[L]);
              rightMax = Math.max(rightMax, h[R]);
              if (leftMax <= rightMax) {        // left wall is the limiting one for bar L
                  water += leftMax - h[L];
                  L++;
              } else {                          // right wall is the limiting one for bar R
                  water += rightMax - h[R];
                  R--;
              }
          }
          return water;
      }`, alt: [
        { lang: 'python', code: `def trap_two_pointers(h):
    L, R = 0, len(h) - 1
    left_max = right_max = water = 0
    while L < R:
        left_max = max(left_max, h[L])
        right_max = max(right_max, h[R])
        if left_max <= right_max:      # left wall is the limiting one for bar L
            water += left_max - h[L]
            L += 1
        else:                          # right wall is the limiting one for bar R
            water += right_max - h[R]
            R -= 1
    return water` },
        { lang: 'js', code: `function trapTwoPointers(h) {
  let L = 0, R = h.length - 1, leftMax = 0, rightMax = 0, water = 0;
  while (L < R) {
    leftMax = Math.max(leftMax, h[L]);
    rightMax = Math.max(rightMax, h[R]);
    if (leftMax <= rightMax) { water += leftMax - h[L]; L++; }   // left wall limits bar L
    else { water += rightMax - h[R]; R--; }                      // right wall limits bar R
  }
  return water;
}` },
        { lang: 'cpp', code: `long long trapTwoPointers(const vector<int>& h) {
    int L = 0, R = (int)h.size() - 1, leftMax = 0, rightMax = 0;
    long long water = 0;
    while (L < R) {
        leftMax = max(leftMax, h[L]);
        rightMax = max(rightMax, h[R]);
        if (leftMax <= rightMax) { water += leftMax - h[L]; L++; }   // left wall limits bar L
        else { water += rightMax - h[R]; R--; }                      // right wall limits bar R
    }
    return water;
}` }, { lang: 'csharp', code: String.raw`
long TrapTwoPointers(int[] h) {
    int L = 0, R = h.Length - 1;
    int leftMax = 0, rightMax = 0;
    long water = 0;
    while (L < R) {
        leftMax = Math.Max(leftMax, h[L]);
        rightMax = Math.Max(rightMax, h[R]);
        if (leftMax <= rightMax) {        // left wall is the limiting one for bar L
            water += leftMax - h[L];
            L++;
        } else {                          // right wall is the limiting one for bar R
            water += rightMax - h[R];
            R--;
        }
    }
    return water;
}` }
      ] },
    codeTitle: 'Bonus: two-pointer version with O(1) extra space',
    viz: {
      title: 'Rain water: prefix max, suffix max, then fill',
      input: '0 1 0 2 1 0 1 3 2 1 2 1',
      inputLabel: 'bar heights (0..20, up to 14 bars)',
      gen: function (input) {
        var h = nums(input, 14, 1);
        if (h.some(function (x) { return x < 0 || x > 20; })) throw new Error('Heights must be between 0 and 20.');
        var n = h.length, L = [], R = new Array(n), frames = [];
        frames.push({ narr: 'These are the building heights. Water on top of a bar is limited by the tallest wall on its left AND the tallest wall on its right — the shorter of the two wins.', parts: [
          { type: 'bars', label: 'heights h', values: h.slice() }
        ] });
        for (var i = 0; i < n; i++) {
          L.push(i === 0 ? h[0] : Math.max(L[i - 1], h[i]));
          if (i === 0 || i === n - 1 || i % 3 === 2) {
            frames.push({ narr: 'Prefix max (left → right): LMax[' + i + '] = max(' + (i === 0 ? '' : 'LMax[' + (i - 1) + '], ') + 'h[' + i + ']) = <b>' + L[i] + '</b>. It is "the tallest wall from the start up to here".', parts: [
              { type: 'bars', label: 'heights h', values: h.slice(), hl: one(i, 'cur'), ptr: one(i, 'i') },
              { type: 'array', label: 'LMax (filling →)', values: L.concat(new Array(n - L.length).fill('')), hl: one(i, 'ok') }
            ] });
          }
        }
        var Rshow = new Array(n).fill('');
        for (i = n - 1; i >= 0; i--) {
          R[i] = i === n - 1 ? h[i] : Math.max(R[i + 1], h[i]);
          Rshow[i] = R[i];
          if (i === n - 1 || i === 0 || i % 3 === 0) {
            frames.push({ narr: 'Suffix max (right → left): RMax[' + i + '] = max(' + (i === n - 1 ? '' : 'RMax[' + (i + 1) + '], ') + 'h[' + i + ']) = <b>' + R[i] + '</b>. It is "the tallest wall from here to the end".', parts: [
              { type: 'bars', label: 'heights h', values: h.slice(), hl: one(i, 'cur'), ptr: one(i, 'i') },
              { type: 'array', label: 'LMax', values: L.slice() },
              { type: 'array', label: 'RMax (filling ←)', values: Rshow.slice(), hl: one(i, 'ok') }
            ] });
          }
        }
        var water = new Array(n).fill(0), total = 0;
        for (i = 0; i < n; i++) {
          var m = Math.min(L[i], R[i]), w = m - h[i];
          water[i] = w; total += w;
          var shown = water.map(function (x, k) { return k <= i ? x : ''; });
          frames.push({
            narr: 'Bar ' + i + ': min(LMax ' + L[i] + ', RMax ' + R[i] + ') = ' + m + ', height ' + h[i] + ' → water = ' + m + ' − ' + h[i] + ' = <b>' + w + '</b>. ' + (w > 0 ? 'Water sits here, held by walls on both sides.' : 'No water: this bar is as tall as the shorter wall, so water would spill.') + ' Total so far: ' + total + '.',
            parts: [
              { type: 'bars', label: 'heights h', values: h.slice(), hl: one(i, 'cur'), ptr: one(i, 'i') },
              { type: 'bars', label: 'water above each bar', values: water.map(function (x, k) { return k <= i ? x : 0; }), hl: one(i, w > 0 ? 'win' : 'done') },
              { type: 'array', label: 'water', values: shown, hl: one(i, w > 0 ? 'win' : 'done') },
              { type: 'vars', vals: { 'LMax[i]': L[i], 'RMax[i]': R[i], 'h[i]': h[i], water: w, total: total } }
            ]
          });
        }
        var tops = h.map(function (x, k) { return x + water[k]; });
        frames.push({ narr: 'Total trapped water = <b>' + total + '</b>. The second chart shows the water level (bar + water) — a flat "lake" wherever water collects.', parts: [
          { type: 'bars', label: 'heights h', values: h.slice() },
          { type: 'bars', label: 'height + water (water level)', values: tops, hl: (function () { var o = {}; water.forEach(function (x, k) { if (x > 0) o[k] = 'win'; }); return o; })() },
          { type: 'vars', label: 'answer', vals: { 'trapped water': total }, hl: { 'trapped water': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'A simple valley', html: `<p>h = [3, 0, 2, 0, 4]. LMax = [3, 3, 3, 3, 4], RMax = [4, 4, 4, 4, 4]. Water = [0, 3, 1, 3, 0] → <b>7</b>. The middle bar of height 2 is under water too: the level is 3 (the shorter outer wall), so it holds 1 unit on top.</p>${H.arr([3, 0, 2, 0, 4], { label: 'h', hl: { 1: 'b', 2: 'b', 3: 'b' } })}` },
      { title: 'No water when the bars only go up (or only down)', html: `<p>h = [1, 2, 3, 4]: for every bar, LMax[i] = h[i], so min(LMax, RMax) − h = 0 → <b>0</b>. Same for a strictly decreasing array (RMax[i] = h[i]). Water needs a wall on <b>both</b> sides. A "V" or "U" shape somewhere is required.</p>` },
      { title: 'Product of array except self (prefix × suffix, the same two-pass idea)', html: `<p>A = [1, 2, 3, 4]. Prefix products (before i): [1, 1, 2, 6]. Suffix products (after i): [24, 12, 4, 1]. Multiply: <b>[24, 12, 8, 6]</b>. No division needed, so zeros are handled. This "left pass + right pass, combine per index" pattern is the backbone of rain water, candy distribution and many more.</p>`, code: { lang: 'java', code: `int[] A = {1, 2, 3, 4};
int n = A.length;
int[] out = new int[n];
out[0] = 1;
for (int i = 1; i < n; i++) out[i] = out[i - 1] * A[i - 1];   // product of everything before i
int right = 1;
for (int i = n - 1; i >= 0; i--) {                            // multiply by product of everything after i
    out[i] *= right;
    right *= A[i];
}
System.out.println(Arrays.toString(out));   // [24, 12, 8, 6]`, alt: [
        { lang: 'python', run: true, code: `A = [1, 2, 3, 4]
n = len(A)
out = [1] * n
for i in range(1, n):
    out[i] = out[i - 1] * A[i - 1]   # product of everything before i
right = 1
for i in range(n - 1, -1, -1):       # multiply by product of everything after i
    out[i] *= right
    right *= A[i]
print(out)   # [24, 12, 8, 6]` },
        { lang: 'js', run: true, code: `const A = [1, 2, 3, 4];
const n = A.length, out = new Array(n).fill(1);
for (let i = 1; i < n; i++) out[i] = out[i - 1] * A[i - 1];   // product of everything before i
let right = 1;
for (let i = n - 1; i >= 0; i--) { out[i] *= right; right *= A[i]; }   // times everything after i
console.log(JSON.stringify(out));   // [24,12,8,6]` },
        { lang: 'cpp', code: `vector<int> A = {1, 2, 3, 4};
int n = A.size();
vector<int> out(n, 1);
for (int i = 1; i < n; i++) out[i] = out[i - 1] * A[i - 1];   // product of everything before i
int right = 1;
for (int i = n - 1; i >= 0; i--) { out[i] *= right; right *= A[i]; }   // times everything after i
for (int x : out) cout << x << " ";   // 24 12 8 6
cout << "\\n";` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[] A = { 1, 2, 3, 4 };
        int n = A.Length;
        int[] result = new int[n];
        result[0] = 1;
        for (int i = 1; i < n; i++) result[i] = result[i - 1] * A[i - 1];   // product of everything before i
        int right = 1;
        for (int i = n - 1; i >= 0; i--) {                                  // multiply by product of everything after i
            result[i] *= right;
            right *= A[i];
        }
        Console.WriteLine("[" + string.Join(", ", result) + "]");   // [24, 12, 8, 6]
    }
}`, run: true }
      ] } },
      { title: 'Two-pointer run on [4, 2, 0, 3, 2, 5]', html: `${H.table(['L', 'R', 'leftMax', 'rightMax', 'move', 'water added', 'total'], [['0', '5', '4', '5', 'L (4 ≤ 5)', '0', '0'], ['1', '5', '4', '5', 'L', '4 − 2 = 2', '2'], ['2', '5', '4', '5', 'L', '4 − 0 = 4', '6'], ['3', '5', '4', '5', 'L', '4 − 3 = 1', '7'], ['4', '5', '4', '5', 'L', '4 − 2 = 2', H.c('p', '9')]])}<p>Answer <b>9</b>. Every time, the left max (4) is the smaller wall, so bar L's water is decided by it — whatever lies between, the right side has at least a 5.</p>` }
    ],
    deepDive: `<h4>Why the two-pointer version is correct</h4><p>Suppose leftMax ≤ rightMax. For bar L, the true right wall is max(h[L..N−1]) ≥ rightMax ≥ leftMax, so min(leftMax, trueRight) = leftMax — we know bar L's exact water <b>without</b> knowing the full right side. Moving L is safe. The symmetric argument holds for R. Each step settles one bar → O(N) time, O(1) space.</p>
      <h4>Three classic solutions, compared</h4>${H.table(['approach', 'time', 'space', 'idea'], [['prefix + suffix max arrays', 'O(N)', 'O(N)', 'store the carried max per index'], ['two pointers', 'O(N)', 'O(1)', 'settle the side with the smaller wall'], ['monotonic stack', 'O(N)', 'O(N)', 'fill water layer by layer when a taller bar closes a basin']])}
      <h4>The 2D version is a different beast</h4><p>"Trapping Rain Water II" on a height map grid cannot use prefix/suffix max, because water can escape in any direction. The correct approach is a priority-queue flood fill from the borders inward (Dijkstra-like). Interviewers sometimes ask this as the follow-up to see whether you blindly extend the 1D trick.</p>
      <h4>Prefix/suffix arrays in general</h4><p>Any "for each i, combine something about the left part with something about the right part" problem fits: max profit with two transactions (best on left + best on right), product except self, minimum candies (left rule pass + right rule pass), and splitting an array into two parts with best combined score. Build the left array, build the right array, then one combining pass.</p>`,
    aiEra: `<p><b>What AI changes:</b> Trapping Rain Water is one of the most famous interview questions — an assistant will produce the two-pointer code instantly. That means interviewers now ask <b>why</b> the two-pointer step is safe, or jump to the 2D version.</p>
      <p><b>Use AI as a partner:</b> <code>Draw ASCII art of the water for heights 0 1 0 2 1 0 1 3 2 1 2 1</code> to build intuition, or ask it to generate random tests comparing the O(N) and O(N²) versions.</p>
      <p><b>Where AI goes wrong:</b> excluding h[i] from LMax/RMax and then producing negative water, using <code>int</code> totals, or claiming the 1D method works for the 2D grid.</p>
      <p><b>What you must still own:</b> the one-sentence proof for moving the smaller side, and recognising the "left info + right info per index" pattern in unfamiliar stories.</p>`,
    problems: [{
      title: 'Trapping Rain Water',
      level: 'Hard',
      tags: ['prefix max', 'suffix max', 'carry forward'],
      statement: `<p>Given <code>N</code> non-negative integers representing an elevation map where each bar has width 1, compute how many units of water it can trap after raining.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ h[i] ≤ 10<sup>5</sup>`,
      example: `${H.arr([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], { label: 'h', hl: { 2: 'b', 4: 'b', 5: 'b', 6: 'b', 9: 'b' } })}
        <p>Output: ${H.c('p', '<b>6</b>')}. Blue bars hold water: index 2 holds 1 (walls 1 and 3 → min 1), index 4 holds 1, index 5 holds 2 (walls 2 and 3 → min 2, height 0), index 6 holds 1, index 9 holds 1 (walls 3 and 2 → min 2, height 1).</p>`,
      brute: {
        why: `<p>For every bar, scan the whole left side for the max and the whole right side for the max: N × N = <b>10<sup>10</sup></b> steps. The waste: the "max to my left" for bar i+1 is just max(max to the left of i, h[i]), but brute force recomputes it from zero.</p>`,
        code: { lang: 'java', code: `
          long bruteTrap(int[] h) {
              long water = 0;
              for (int i = 0; i < h.length; i++) {
                  int lm = 0, rm = 0;
                  for (int j = 0; j <= i; j++) lm = Math.max(lm, h[j]);          // tallest on the left
                  for (int j = i; j < h.length; j++) rm = Math.max(rm, h[j]);    // tallest on the right
                  water += Math.min(lm, rm) - h[i];
              }
              return water;
          }`, alt: [{ lang: 'python', code: String.raw`
def trap(h):
    water = 0
    for i in range(len(h)):
        lm = max(h[:i + 1])        # tallest on the left
        rm = max(h[i:])            # tallest on the right
        water += min(lm, rm) - h[i]
    return water` }, { lang: 'js', code: String.raw`
function trap(h) {
  let water = 0;
  for (let i = 0; i < h.length; i++) {
    let lm = 0, rm = 0;
    for (let j = 0; j <= i; j++) lm = Math.max(lm, h[j]);          // tallest on the left
    for (let j = i; j < h.length; j++) rm = Math.max(rm, h[j]);    // tallest on the right
    water += Math.min(lm, rm) - h[i];
  }
  return water;
}` }, { lang: 'cpp', code: String.raw`
long long trap(vector<int>& h) {
    long long water = 0;
    for (int i = 0; i < (int) h.size(); i++) {
        int lm = 0, rm = 0;
        for (int j = 0; j <= i; j++) lm = max(lm, h[j]);                  // tallest on the left
        for (int j = i; j < (int) h.size(); j++) rm = max(rm, h[j]);      // tallest on the right
        water += min(lm, rm) - h[i];
    }
    return water;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public long Trap(int[] h) {
        long water = 0;
        for (int i = 0; i < h.Length; i++) {
            int lm = 0, rm = 0;
            for (int j = 0; j <= i; j++) lm = Math.Max(lm, h[j]);          // tallest on the left
            for (int j = i; j < h.Length; j++) rm = Math.Max(rm, h[j]);    // tallest on the right
            water += Math.Min(lm, rm) - h[i];
        }
        return water;
    }
}` }] }
      },
      mcq: {
        q: `<p>A bar of height 1 has its tallest left wall = 3 and tallest right wall = 2. How much water sits on top of it?</p>`,
        options: ['1 = min(3, 2) − 1', '2 = 3 − 1', '3 = the taller wall', '0 because walls are different'],
        answer: 0,
        explain: `<p>Water rises until it reaches the shorter wall (2); any higher and it spills over the right side. 2 − 1 = 1 unit.</p>`
      },
      hints: [
        `<p><b>Aha:</b> water on bar i = <code>min(max of h[0..i], max of h[i..N−1]) − h[i]</code>. Total = sum of that over all i.</p>`,
        `<p>Precompute an array <code>LMax</code> (prefix max, left → right) and an array <code>RMax</code> (suffix max, right → left). Then one more pass adds up water. (Or two pointers with two running maxes for O(1) space.)</p>`,
        `<p><b>Traps:</b> bars at the ends never hold water (formula gives 0 automatically if LMax/RMax include h[i]). Total can reach 10<sup>5</sup> × 10<sup>5</sup> = 10<sup>10</sup> → use <code>long</code>. N &lt; 3 → answer 0.<br><b>Recipe:</b> LMax[0] = h[0]; LMax[i] = max(LMax[i−1], h[i]). RMax[N−1] = h[N−1]; RMax[i] = max(RMax[i+1], h[i]). ans = ∑ (min(LMax[i], RMax[i]) − h[i]).</p>`
      ],
      tests: { sig: 'int[] -> long', fn: 'trap', cases: [
        [[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], 6],
        [[[5]], 0],
        [[[4, 2, 0, 3, 2, 5]], 9],
        [[[1, 2, 3, 4]], 0],
        [[[4, 3, 2, 1]], 0],
        [[[5, 0, 5]], 5],
        [[[2, 0, 2, 0, 2]], 4],
        [[[100000, 0, 0, 0, 0, 0, 100000]], 500000],
        [[[3, 3, 3]], 0]
      ] },
      solution: {
        approach: `<p>Prefix max + suffix max arrays, then water[i] = min(LMax[i], RMax[i]) − h[i].</p>`,
        code: `
          class Solution {
              public long trap(int[] h) {
                  int n = h.length;
                  int[] lMax = new int[n], rMax = new int[n];
                  lMax[0] = h[0];
                  for (int i = 1; i < n; i++) {
                      lMax[i] = Math.max(lMax[i - 1], h[i]);   // tallest wall from 0..i
                  }
                  rMax[n - 1] = h[n - 1];
                  for (int i = n - 2; i >= 0; i--) {
                      rMax[i] = Math.max(rMax[i + 1], h[i]);   // tallest wall from i..n-1
                  }
                  long water = 0;                              // long: up to 1e10
                  for (int i = 0; i < n; i++) {
                      // water level = shorter of the two walls; subtract the bar itself
                      water += Math.min(lMax[i], rMax[i]) - h[i];
                  }
                  return water;
              }

              public static void main(String[] args) {
                  int[] h = {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1};
                  System.out.println(new Solution().trap(h)); // 6
              }
          }`,
        alt: [
          { lang: 'python', code: `from itertools import accumulate

def trap(h):
    l_max = list(accumulate(h, max))                 # tallest wall in 0..i
    r_max = list(accumulate(reversed(h), max))[::-1] # tallest wall in i..n-1
    return sum(min(l, r) - x for l, r, x in zip(l_max, r_max, h))` },
          { lang: 'js', code: `function trap(h) {
  const n = h.length, lMax = new Array(n), rMax = new Array(n);
  lMax[0] = h[0];
  for (let i = 1; i < n; i++) lMax[i] = Math.max(lMax[i - 1], h[i]);
  rMax[n - 1] = h[n - 1];
  for (let i = n - 2; i >= 0; i--) rMax[i] = Math.max(rMax[i + 1], h[i]);
  let water = 0;
  for (let i = 0; i < n; i++) water += Math.min(lMax[i], rMax[i]) - h[i];
  return water;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    long long trap(vector<int>& h) {
        int n = h.size();
        vector<int> lMax(n), rMax(n);
        lMax[0] = h[0];
        for (int i = 1; i < n; i++) lMax[i] = max(lMax[i - 1], h[i]);
        rMax[n - 1] = h[n - 1];
        for (int i = n - 2; i >= 0; i--) rMax[i] = max(rMax[i + 1], h[i]);
        long long water = 0;                         // up to 1e10
        for (int i = 0; i < n; i++) water += min(lMax[i], rMax[i]) - h[i];
        return water;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public long Trap(int[] h) {
        int n = h.Length;
        int[] lMax = new int[n], rMax = new int[n];
        lMax[0] = h[0];
        for (int i = 1; i < n; i++) {
            lMax[i] = Math.Max(lMax[i - 1], h[i]);   // tallest wall from 0..i
        }
        rMax[n - 1] = h[n - 1];
        for (int i = n - 2; i >= 0; i--) {
            rMax[i] = Math.Max(rMax[i + 1], h[i]);   // tallest wall from i..n-1
        }
        long water = 0;                              // long: up to 1e10
        for (int i = 0; i < n; i++) {
            // water level = shorter of the two walls; subtract the bar itself
            water += Math.Min(lMax[i], rMax[i]) - h[i];
        }
        return water;
    }
}` }
        ],
        dry: {
          head: ['i', 'h[i]', 'LMax', 'RMax', 'min', 'water', 'total'],
          rows: [
            ['0', '0', '0', '3', '0', '0', '0'],
            ['1', '1', '1', '3', '1', '0', '0'],
            ['2', '0', '1', '3', '1', H.c('b', '1'), '1'],
            ['3', '2', '2', '3', '2', '0', '1'],
            ['4', '1', '2', '3', '2', H.c('b', '1'), '2'],
            ['5', '0', '2', '3', '2', H.c('b', '2'), '4'],
            ['6', '1', '2', '3', '2', H.c('b', '1'), '5'],
            ['7', '3', '3', '3', '3', '0', '5'],
            ['8', '2', '3', '2', '2', '0', '5'],
            ['9', '1', '3', '2', '2', H.c('b', '1'), '6'],
            ['10', '2', '3', '2', '2', '0', '6'],
            ['11', '1', '3', '1', '1', '0', H.c('p', '6')]
          ]
        },
        complexity: `<p><b>Time O(N)</b>: three simple passes (prefix max, suffix max, sum). <b>Space O(N)</b> for the two helper arrays — the two-pointer version above brings it down to O(1).</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — Spiral traversal
  // =====================================================================
  topics.push({
    title: 'Spiral Traversal: Four Shrinking Walls',
    analogy: `<p>Think of mowing a rectangular lawn the lazy way: you walk along the <b>outer edge</b> first (right, down, left, up), and every time you finish a lap the un-mowed rectangle in the middle gets <b>one step smaller on every side</b>. You keep walking smaller and smaller laps until nothing is left. A snail shell and a running track with lanes work the same way.</p>`,
    explain: `<p>Spiral order reads a matrix clockwise from the outside in. The cleanest way is to keep <b>four walls</b> that describe the part not yet visited:</p>
      <ul>
        <li><code>top</code> — first unvisited row, <code>bottom</code> — last unvisited row</li>
        <li><code>left</code> — first unvisited column, <code>right</code> — last unvisited column</li>
      </ul>
      <p>One lap = four straight walks, and after each walk you move <b>that</b> wall inward:</p>
      ${H.table(['walk', 'cells', 'then'], [['→ along the top row', '(top, left..right)', 'top++'], ['↓ down the right column', '(top..bottom, right)', 'right−−'], ['← along the bottom row', '(bottom, right..left)', 'bottom−− (only if top ≤ bottom)'], ['↑ up the left column', '(bottom..top, left)', 'left++ (only if left ≤ right)']])}
      <p>For the 3 × 4 matrix below the order is ${H.c('y', '1 2 3 4')} ${H.c('g', '8 12')} ${H.c('b', '11 10 9')} ${H.c('p', '5')} then the inner lap ${H.c('y', '6 7')}.</p>
      ${H.table(['', 'c0', 'c1', 'c2', 'c3'], [['r0', H.c('y', '1'), H.c('y', '2'), H.c('y', '3'), H.c('y', '4')], ['r1', H.c('p', '5'), '6', '7', H.c('g', '8')], ['r2', H.c('b', '9'), H.c('b', '10'), H.c('b', '11'), H.c('g', '12')]])}
      <p><b>The two "if" checks are the whole difficulty.</b> When the remaining part is a single row, the → walk already took it; walking ← along "the bottom row" would read the same row again backwards. The check <code>top ≤ bottom</code> stops that. Likewise <code>left ≤ right</code> stops a single remaining column from being read twice. Square matrices hide this bug — always test a 1 × N, an N × 1 and a 3 × 4.</p>
      <p>Every cell is visited exactly once, so time is <b>O(R × C)</b> and the extra space (besides the output) is <b>O(1)</b>: just four integers.</p>`,
    clues: [
      '"Return all elements of the matrix in <b>spiral order</b>" / "clockwise from the outside in" → four walls (top, bottom, left, right).',
      '"Generate an N × N matrix filled 1..N<sup>2</sup> in spiral order" → same walls, write instead of read.',
      '"Print the boundary / outer ring of a matrix" or "process layer by layer" → one lap of the spiral loop.',
      '"Rotate the rings / shift each layer by k" → treat each ring as a 1D list extracted with one spiral lap.',
      'Non-square input (R ≠ C) in the examples → watch the single-row / single-column middle; the two guard checks are mandatory.'
    ],
    code: [{ lang: 'java', code: `
      List<Integer> spiralOrder(int[][] g) {
          List<Integer> out = new ArrayList<>();
          int top = 0, bottom = g.length - 1;
          int left = 0, right = g[0].length - 1;
          while (top <= bottom && left <= right) {
              for (int c = left; c <= right; c++) out.add(g[top][c]);      // → top row
              top++;                                                     // top row is done
              for (int r = top; r <= bottom; r++) out.add(g[r][right]);   // ↓ right column
              right--;                                                   // right column is done
              if (top <= bottom) {                                       // a bottom row still exists
                  for (int c = right; c >= left; c--) out.add(g[bottom][c]); // ← bottom row
                  bottom--;
              }
              if (left <= right) {                                       // a left column still exists
                  for (int r = bottom; r >= top; r--) out.add(g[r][left]);   // ↑ left column
                  left++;
              }
          }
          return out;
      }`, alt: [
        { lang: 'python', code: `def spiral_order(g):
    out = []
    top, bottom, left, right = 0, len(g) - 1, 0, len(g[0]) - 1
    while top <= bottom and left <= right:
        out.extend(g[top][left:right + 1])                    # → top row
        top += 1                                              # top row is done
        out.extend(g[r][right] for r in range(top, bottom + 1))   # ↓ right column
        right -= 1                                            # right column is done
        if top <= bottom:                                     # a bottom row still exists
            out.extend(reversed(g[bottom][left:right + 1]))   # ← bottom row
            bottom -= 1
        if left <= right:                                     # a left column still exists
            out.extend(g[r][left] for r in range(bottom, top - 1, -1))   # ↑ left column
            left += 1
    return out` },
        { lang: 'js', code: `function spiralOrder(g) {
  const out = [];
  let top = 0, bottom = g.length - 1, left = 0, right = g[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(g[top][c]);       // → top row
    top++;                                                         // top row is done
    for (let r = top; r <= bottom; r++) out.push(g[r][right]);     // ↓ right column
    right--;                                                       // right column is done
    if (top <= bottom) {                                           // a bottom row still exists
      for (let c = right; c >= left; c--) out.push(g[bottom][c]);  // ← bottom row
      bottom--;
    }
    if (left <= right) {                                           // a left column still exists
      for (let r = bottom; r >= top; r--) out.push(g[r][left]);    // ↑ left column
      left++;
    }
  }
  return out;
}` },
        { lang: 'cpp', code: `vector<int> spiralOrder(const vector<vector<int>>& g) {
    vector<int> out;
    int top = 0, bottom = (int)g.size() - 1, left = 0, right = (int)g[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.push_back(g[top][c]);       // → top row
        top++;                                                              // top row is done
        for (int r = top; r <= bottom; r++) out.push_back(g[r][right]);     // ↓ right column
        right--;                                                            // right column is done
        if (top <= bottom) {                                                // a bottom row still exists
            for (int c = right; c >= left; c--) out.push_back(g[bottom][c]); // ← bottom row
            bottom--;
        }
        if (left <= right) {                                                // a left column still exists
            for (int r = bottom; r >= top; r--) out.push_back(g[r][left]);   // ↑ left column
            left++;
        }
    }
    return out;
}` }, { lang: 'csharp', code: String.raw`
List<int> SpiralOrder(int[][] g) {
    var result = new List<int>();
    int top = 0, bottom = g.Length - 1;
    int left = 0, right = g[0].Length - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) result.Add(g[top][c]);      // -> top row
        top++;                                                         // top row is done
        for (int r = top; r <= bottom; r++) result.Add(g[r][right]);   // v right column
        right--;                                                       // right column is done
        if (top <= bottom) {                                           // a bottom row still exists
            for (int c = right; c >= left; c--) result.Add(g[bottom][c]); // <- bottom row
            bottom--;
        }
        if (left <= right) {                                           // a left column still exists
            for (int r = bottom; r >= top; r--) result.Add(g[r][left]);   // ^ left column
            left++;
        }
    }
    return result;
}` }
      ] }, {
      lang: 'python', run: true, title: 'Same four-wall walk in Python (runnable)', code: `def spiral(g):
    out = []
    top, bottom, left, right = 0, len(g) - 1, 0, len(g[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(g[top][c])
        top += 1
        for r in range(top, bottom + 1):
            out.append(g[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                out.append(g[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                out.append(g[r][left])
            left += 1
    return out

print(spiral([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]))
print(spiral([[1], [2], [3]]))
print(spiral([[1, 2, 3]]))` }],
    codeTitle: ['Spiral order with four walls', 'Python version with edge-case tests'],
    viz: {
      title: 'Spiral walk: watch the four walls close in',
      input: '1 2 3 4; 5 6 7 8; 9 10 11 12',
      inputLabel: 'matrix rows separated by ";" (up to 6 × 6)',
      gen: function (input) {
        var m = parseMatrix(input, 6, 6);
        var R = m.length, C = m[0].length;
        var top = 0, bottom = R - 1, left = 0, right = C - 1, out = [], seen = {}, frames = [];
        function snap(r, c, narr, dir) {
          var hl = {};
          for (var k in seen) hl[k] = 'done';
          for (var rr = top; rr <= bottom; rr++) for (var cc = left; cc <= right; cc++) if (!seen[rr + ',' + cc]) hl[rr + ',' + cc] = 'win';
          if (r !== null) hl[r + ',' + c] = 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'grid', label: 'matrix (blue = still inside the walls, faded = taken)', rows: copyGrid(m), rowHead: heads(R), colHead: heads(C), hl: hl },
            { type: 'vars', label: 'walls', vals: { top: top, bottom: bottom, left: left, right: right, walking: dir } },
            { type: 'array', label: 'output so far', values: out.slice(), hl: out.length ? one(out.length - 1, 'ok') : {} }
          ] });
        }
        snap(null, null, 'Start with four walls around the whole ' + R + ' × ' + C + ' matrix: top = 0, bottom = ' + (R - 1) + ', left = 0, right = ' + (C - 1) + '. Everything blue is still to be read.', '—');
        var lap = 0, c, r;
        while (top <= bottom && left <= right) {
          lap++;
          for (c = left; c <= right; c++) { out.push(m[top][c]); seen[top + ',' + c] = 1; snap(top, c, 'Lap ' + lap + ', walking <b>→</b> along row ' + top + ': take <b>' + m[top][c] + '</b>.', '→'); }
          top++;
          snap(null, null, 'Top row finished, so the top wall moves down: <b>top = ' + top + '</b>.', '→ done');
          for (r = top; r <= bottom; r++) { out.push(m[r][right]); seen[r + ',' + right] = 1; snap(r, right, 'Walking <b>↓</b> down column ' + right + ': take <b>' + m[r][right] + '</b>.', '↓'); }
          right--;
          if (top <= bottom) {
            for (c = right; c >= left; c--) { out.push(m[bottom][c]); seen[bottom + ',' + c] = 1; snap(bottom, c, 'Walking <b>←</b> along row ' + bottom + ': take <b>' + m[bottom][c] + '</b>.', '←'); }
            bottom--;
          } else {
            snap(null, null, '<span class="c-r">Guard check:</span> top (' + top + ') &gt; bottom (' + bottom + ') — no bottom row is left. Walking ← now would read a row twice, so we skip it.', 'skip ←');
          }
          if (left <= right) {
            for (r = bottom; r >= top; r--) { out.push(m[r][left]); seen[r + ',' + left] = 1; snap(r, left, 'Walking <b>↑</b> up column ' + left + ': take <b>' + m[r][left] + '</b>.', '↑'); }
            left++;
          } else {
            snap(null, null, '<span class="c-r">Guard check:</span> left (' + left + ') &gt; right (' + right + ') — no left column is left, so we skip the ↑ walk.', 'skip ↑');
          }
          if (top <= bottom && left <= right) snap(null, null, 'Lap ' + lap + ' complete. The walls are now top = ' + top + ', bottom = ' + bottom + ', left = ' + left + ', right = ' + right + ' — a smaller rectangle. Go around again.', 'next lap');
        }
        frames.push({ narr: 'The walls crossed, so every cell has been read exactly once. Spiral order: <b>' + out.join(', ') + '</b>. Time O(R × C), extra space O(1).', parts: [
          { type: 'array', label: 'spiral order', values: out.slice(), hl: rangeHl(0, out.length - 1, 'sel') },
          { type: 'vars', vals: { cells: R * C, laps: lap } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'A single row and a single column', html: `<p>[[1, 2, 3]] → <b>[1, 2, 3]</b>. After → the top wall moves to 1 &gt; bottom 0, so the ← and ↑ walks must be skipped. [[1], [2], [3]] → <b>[1, 2, 3]</b>: → takes 1, ↓ takes 2, 3, then right becomes −1 &lt; left, so ↑ is skipped. Without the guards you would output [1, 2, 3, 2] or similar duplicates.</p>` },
      { title: 'Odd square: the centre cell', html: `<p>3 × 3 [[1,2,3],[4,5,6],[7,8,9]] → 1 2 3 6 9 8 7 4 then the second lap has top = bottom = left = right = 1, so → takes <b>5</b>, and every other walk is empty. Output: <b>1 2 3 6 9 8 7 4 5</b>.</p>${H.table(['', 'c0', 'c1', 'c2'], [['r0', '1', '2', '3'], ['r1', '4', H.c('p', '5'), '6'], ['r2', '7', '8', '9']])}` },
      { title: 'Spiral Matrix II: fill instead of read', html: `<p>To build an N × N matrix with 1..N<sup>2</sup> in spiral order, run the exact same walls but <b>write</b> a counter. N = 3 gives [[1, 2, 3], [8, 9, 4], [7, 6, 5]].</p>`, code: { lang: 'java', code: `int n = 3, val = 1;
int[][] g = new int[n][n];
int top = 0, bottom = n - 1, left = 0, right = n - 1;
while (top <= bottom && left <= right) {
    for (int c = left; c <= right; c++) g[top][c] = val++;
    top++;
    for (int r = top; r <= bottom; r++) g[r][right] = val++;
    right--;
    if (top <= bottom) { for (int c = right; c >= left; c--) g[bottom][c] = val++; bottom--; }
    if (left <= right) { for (int r = bottom; r >= top; r--) g[r][left] = val++; left++; }
}
System.out.println(Arrays.deepToString(g));   // [[1, 2, 3], [8, 9, 4], [7, 6, 5]]`, alt: [
        { lang: 'python', run: true, code: `n, val = 3, 1
g = [[0] * n for _ in range(n)]
top, bottom, left, right = 0, n - 1, 0, n - 1
while top <= bottom and left <= right:
    for c in range(left, right + 1):
        g[top][c] = val; val += 1
    top += 1
    for r in range(top, bottom + 1):
        g[r][right] = val; val += 1
    right -= 1
    if top <= bottom:
        for c in range(right, left - 1, -1):
            g[bottom][c] = val; val += 1
        bottom -= 1
    if left <= right:
        for r in range(bottom, top - 1, -1):
            g[r][left] = val; val += 1
        left += 1
print(g)   # [[1, 2, 3], [8, 9, 4], [7, 6, 5]]` },
        { lang: 'js', run: true, code: `const n = 3;
let val = 1;
const g = Array.from({ length: n }, () => new Array(n).fill(0));
let top = 0, bottom = n - 1, left = 0, right = n - 1;
while (top <= bottom && left <= right) {
  for (let c = left; c <= right; c++) g[top][c] = val++;
  top++;
  for (let r = top; r <= bottom; r++) g[r][right] = val++;
  right--;
  if (top <= bottom) { for (let c = right; c >= left; c--) g[bottom][c] = val++; bottom--; }
  if (left <= right) { for (let r = bottom; r >= top; r--) g[r][left] = val++; left++; }
}
console.log(JSON.stringify(g));   // [[1,2,3],[8,9,4],[7,6,5]]` },
        { lang: 'cpp', code: `int n = 3, val = 1;
vector<vector<int>> g(n, vector<int>(n, 0));
int top = 0, bottom = n - 1, left = 0, right = n - 1;
while (top <= bottom && left <= right) {
    for (int c = left; c <= right; c++) g[top][c] = val++;
    top++;
    for (int r = top; r <= bottom; r++) g[r][right] = val++;
    right--;
    if (top <= bottom) { for (int c = right; c >= left; c--) g[bottom][c] = val++; bottom--; }
    if (left <= right) { for (int r = bottom; r >= top; r--) g[r][left] = val++; left++; }
}
for (auto& row : g) { for (int x : row) cout << x << " "; cout << "\\n"; }` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        int n = 3, val = 1;
        int[][] g = new int[n][];
        for (int i = 0; i < n; i++) g[i] = new int[n];
        int top = 0, bottom = n - 1, left = 0, right = n - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) g[top][c] = val++;
            top++;
            for (int r = top; r <= bottom; r++) g[r][right] = val++;
            right--;
            if (top <= bottom) { for (int c = right; c >= left; c--) g[bottom][c] = val++; bottom--; }
            if (left <= right) { for (int r = bottom; r >= top; r--) g[r][left] = val++; left++; }
        }
        var rows = new List<string>();
        foreach (int[] row in g) rows.Add("[" + string.Join(", ", row) + "]");
        Console.WriteLine("[" + string.Join(", ", rows) + "]");   // [[1, 2, 3], [8, 9, 4], [7, 6, 5]]
    }
}`, run: true }
      ] } },
      { title: 'Direction-vector version (simulation)', html: `<p>Another style: keep <code>dr = {0, 1, 0, −1}</code>, <code>dc = {1, 0, −1, 0}</code> and a <code>visited</code> grid; step forward and turn right whenever the next cell is outside or already visited. It is easy to write and generalises to "walk until blocked" puzzles, but it costs O(R × C) extra memory for <code>visited</code>. The wall version is O(1) extra and is the one interviewers expect as the optimal answer.</p>` }
    ],
    deepDive: `<h4>Counting the laps</h4><p>Each lap removes 2 rows and 2 columns, so there are ⌈min(R, C) / 2⌉ laps. Each cell is touched once: Θ(R·C). You cannot do better because the output itself has R·C numbers.</p>
      <h4>Loop invariant (how to argue correctness)</h4><p>At the start of every lap, the unvisited cells are exactly the rectangle rows top..bottom × columns left..right, and the output holds every other cell in spiral order. Each of the four walks takes one side of that rectangle and shrinks it, keeping the invariant true. The guards make sure a degenerate rectangle (one row or one column) is not walked twice.</p>
      <h4>Layer-index formulation</h4><p>Alternatively loop <code>layer = 0 .. ⌈min(R,C)/2⌉ − 1</code> with top = left = layer, bottom = R − 1 − layer, right = C − 1 − layer. Same logic, but handy when a problem asks to do something per ring (e.g. "rotate each layer by k", LeetCode 1914 Cyclically Rotating a Grid).</p>
      <h4>Variations interviewers use</h4><ul><li>Anti-clockwise spiral: walk ↓ left column first, then →, ↑, ←.</li><li>Spiral starting from a given cell outward (LeetCode 885 Spiral Matrix III): step lengths go 1, 1, 2, 2, 3, 3, …</li><li>Spiral on a linked list's values into an R × C grid (LeetCode 2326).</li><li>Diagonal traversal (zig-zag): different walk, same "keep track of the boundary" thinking.</li></ul>
      <h4>Cache note</h4><p>The → walk reads memory in order (fast); the ↓ and ↑ walks jump between row arrays (slower). For interview sizes this never matters, but it is a nice remark when asked about real performance.</p>`,
    aiEra: `<p><b>What AI changes:</b> spiral code is pure boilerplate for an assistant — it will write it in seconds. Interviewers therefore watch whether <b>you</b> catch the single-row/single-column bug and test non-square inputs.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 5 matrices that break a spiral traversal (1×1, 1×4, 4×1, 2×3, 3×2)</code>, then run your code against them. Or ask it to convert your read-spiral into a write-spiral to check you understand they are the same walk.</p>
      <p><b>Where AI goes wrong:</b> missing the <code>top ≤ bottom</code> / <code>left ≤ right</code> guards, swapping rows and columns (length of <code>g</code> vs length of <code>g[0]</code>), or forgetting the empty-matrix check.</p>
      <p><b>What you must still own:</b> the four-wall invariant, a quick hand trace on a 3 × 4, and the discipline to test the degenerate shapes before saying "done".</p>`,
    problems: [{
      title: 'Spiral Matrix',
      level: 'Medium',
      tags: ['matrix', 'simulation', 'spiral'],
      companies: ['Amazon', 'Microsoft', 'Google', 'Apple'],
      statement: `<p>Given an <code>R × C</code> matrix, return all of its elements in <b>spiral order</b>: start at the top-left, go right along the first row, then down the last column, left along the last row, up the first column, and keep spiralling inward.</p>`,
      constraints: `1 ≤ R, C ≤ 100, −100 ≤ matrix[i][j] ≤ 100`,
      example: `${H.table(['', 'c0', 'c1', 'c2', 'c3'], [['r0', H.c('y', '1'), H.c('y', '2'), H.c('y', '3'), H.c('y', '4')], ['r1', H.c('p', '5'), H.c('r', '6'), H.c('r', '7'), H.c('g', '8')], ['r2', H.c('b', '9'), H.c('b', '10'), H.c('b', '11'), H.c('g', '12')]])}
        <p>Output: <b>[1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]</b>. Outer ring: ${H.c('y', '→ 1 2 3 4')}, ${H.c('g', '↓ 8 12')}, ${H.c('b', '← 11 10 9')}, ${H.c('p', '↑ 5')}. Inner part is the single row ${H.c('r', '6 7')}, read → only once.</p>`,
      brute: {
        why: `<p>Simulate a walker with a direction and a visited grid (<code>boolean[][]</code> / list of lists / <code>vector&lt;vector&lt;bool&gt;&gt;</code>): step forward; if the next cell is outside or visited, turn right. It is O(R·C) time but needs an extra R·C boolean grid, and the turning logic is easy to get wrong. The waste is memory: the visited set is just a description of four walls, which four integers can store.</p>`,
        code: { lang: 'java', code: `
          List<Integer> spiralSimulation(int[][] g) {
              int R = g.length, C = g[0].length;
              boolean[][] seen = new boolean[R][C];          // O(R*C) extra memory
              int[] dr = {0, 1, 0, -1}, dc = {1, 0, -1, 0};  // right, down, left, up
              List<Integer> out = new ArrayList<>();
              int r = 0, c = 0, d = 0;
              for (int k = 0; k < R * C; k++) {
                  out.add(g[r][c]);
                  seen[r][c] = true;
                  int nr = r + dr[d], nc = c + dc[d];
                  if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen[nr][nc]) {
                      d = (d + 1) % 4;                       // blocked: turn right
                      nr = r + dr[d];
                      nc = c + dc[d];
                  }
                  r = nr;
                  c = nc;
              }
              return out;
          }`, alt: [{ lang: 'python', code: String.raw`
def spiral_order(g):
    R, C = len(g), len(g[0])
    seen = [[False] * C for _ in range(R)]          # O(R*C) extra memory
    dr, dc = [0, 1, 0, -1], [1, 0, -1, 0]           # right, down, left, up
    out = []
    r = c = d = 0
    for _ in range(R * C):
        out.append(g[r][c])
        seen[r][c] = True
        nr, nc = r + dr[d], c + dc[d]
        if nr < 0 or nr >= R or nc < 0 or nc >= C or seen[nr][nc]:
            d = (d + 1) % 4                         # blocked: turn right
            nr, nc = r + dr[d], c + dc[d]
        r, c = nr, nc
    return out` }, { lang: 'js', code: String.raw`
function spiralOrder(g) {
  const R = g.length, C = g[0].length;
  const seen = Array.from({ length: R }, () => new Array(C).fill(false));   // O(R*C) extra memory
  const dr = [0, 1, 0, -1], dc = [1, 0, -1, 0];     // right, down, left, up
  const out = [];
  let r = 0, c = 0, d = 0;
  for (let k = 0; k < R * C; k++) {
    out.push(g[r][c]);
    seen[r][c] = true;
    let nr = r + dr[d], nc = c + dc[d];
    if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen[nr][nc]) {
      d = (d + 1) % 4;                              // blocked: turn right
      nr = r + dr[d];
      nc = c + dc[d];
    }
    r = nr;
    c = nc;
  }
  return out;
}` }, { lang: 'cpp', code: String.raw`
vector<int> spiralOrder(vector<vector<int>>& g) {
    int R = g.size(), C = g[0].size();
    vector<vector<bool>> seen(R, vector<bool>(C, false));   // O(R*C) extra memory
    int dr[4] = {0, 1, 0, -1}, dc[4] = {1, 0, -1, 0};       // right, down, left, up
    vector<int> out;
    int r = 0, c = 0, d = 0;
    for (int k = 0; k < R * C; k++) {
        out.push_back(g[r][c]);
        seen[r][c] = true;
        int nr = r + dr[d], nc = c + dc[d];
        if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen[nr][nc]) {
            d = (d + 1) % 4;                                // blocked: turn right
            nr = r + dr[d];
            nc = c + dc[d];
        }
        r = nr;
        c = nc;
    }
    return out;
}` }, { lang: 'csharp', code: String.raw`
using System.Collections.Generic;

public class Solution {
    public IList<int> SpiralOrder(int[][] g) {
        int R = g.Length, C = g[0].Length;
        bool[][] seen = new bool[R][];                 // O(R*C) extra memory
        for (int i = 0; i < R; i++) seen[i] = new bool[C];
        int[] dr = { 0, 1, 0, -1 }, dc = { 1, 0, -1, 0 };  // right, down, left, up
        var result = new List<int>();
        int r = 0, c = 0, d = 0;
        for (int k = 0; k < R * C; k++) {
            result.Add(g[r][c]);
            seen[r][c] = true;
            int nr = r + dr[d], nc = c + dc[d];
            if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen[nr][nc]) {
                d = (d + 1) % 4;                       // blocked: turn right
                nr = r + dr[d];
                nc = c + dc[d];
            }
            r = nr;
            c = nc;
        }
        return result;
    }
}` }] }
      },
      mcq: {
        q: `<p>After reading the top row of a <b>1 × 4</b> matrix, top becomes 1 and bottom is 0. What must happen next?</p>`,
        options: ['Skip the ← and ↑ walks because no rows remain', 'Walk ← along row 0 again', 'Walk ↓ the last column', 'Reset top to 0'],
        answer: 0,
        explain: `<p>The ↓ loop runs from top = 1 to bottom = 0, so it adds nothing. The ← walk would re-read row 0 backwards — the guard <code>top ≤ bottom</code> is false, so it is skipped. The ↑ walk also adds nothing. Output stays exactly the four cells once.</p>`
      },
      hints: [
        `<p><b>Aha:</b> the cells you still have to read always form a rectangle. Describe it with four numbers — top, bottom, left, right — and peel one side at a time.</p>`,
        `<p>Loop while <code>top ≤ bottom && left ≤ right</code>: walk → on row top (then top++), ↓ on column right (then right−−), ← on row bottom (then bottom−−), ↑ on column left (then left++).</p>`,
        `<p><b>Traps:</b> guard the ← walk with <code>if (top ≤ bottom)</code> and the ↑ walk with <code>if (left ≤ right)</code>; test 1 × N, N × 1, 1 × 1 and 3 × 4. Rows = number of rows of <code>g</code>, cols = length of <code>g[0]</code>.<br><b>Recipe:</b> init walls; while walls valid: four walks with the two guards; return the list.</p>`
      ],
      tests: { sig: 'int[][] -> list<int>', fn: 'spiralOrder', cases: [
        [[[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]],
        [[[[7]]], [7]],
        [[[[1, 2, 3]]], [1, 2, 3]],
        [[[[1], [2], [3]]], [1, 2, 3]],
        [[[[1, 2], [3, 4]]], [1, 2, 4, 3]],
        [[[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]], [1, 2, 3, 4, 8, 12, 16, 15, 14, 13, 9, 5, 6, 7, 11, 10]],
        [[[[1, 2], [3, 4], [5, 6]]], [1, 2, 4, 6, 5, 3]],
        [[[[-1, -2], [-3, -4]]], [-1, -2, -4, -3]]
      ] },
      solution: {
        approach: `<p>Four shrinking walls, four walks per lap, two guard checks for degenerate middles. O(1) extra space.</p>`,
        code: `
          class Solution {
              public List<Integer> spiralOrder(int[][] g) {
                  List<Integer> out = new ArrayList<>();
                  int top = 0, bottom = g.length - 1, left = 0, right = g[0].length - 1;
                  while (top <= bottom && left <= right) {
                      for (int c = left; c <= right; c++) out.add(g[top][c]);       // →
                      top++;
                      for (int r = top; r <= bottom; r++) out.add(g[r][right]);    // ↓
                      right--;
                      if (top <= bottom) {                                        // still a row below?
                          for (int c = right; c >= left; c--) out.add(g[bottom][c]); // ←
                          bottom--;
                      }
                      if (left <= right) {                                        // still a column left?
                          for (int r = bottom; r >= top; r--) out.add(g[r][left]);   // ↑
                          left++;
                      }
                  }
                  return out;
              }

              public static void main(String[] args) {
                  int[][] g = {{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}};
                  System.out.println(new Solution().spiralOrder(g)); // [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
              }
          }`,
        alt: [
          { lang: 'python', code: `def spiral_order(g):
    out = []
    top, bottom, left, right = 0, len(g) - 1, 0, len(g[0]) - 1
    while top <= bottom and left <= right:
        out += g[top][left:right + 1]                              # →
        top += 1
        out += [g[r][right] for r in range(top, bottom + 1)]       # ↓
        right -= 1
        if top <= bottom:                                          # still a row below?
            out += g[bottom][left:right + 1][::-1]                 # ←
            bottom -= 1
        if left <= right:                                          # still a column left?
            out += [g[r][left] for r in range(bottom, top - 1, -1)]  # ↑
            left += 1
    return out` },
          { lang: 'js', code: `function spiralOrder(g) {
  const out = [];
  let top = 0, bottom = g.length - 1, left = 0, right = g[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(g[top][c]);       // →
    top++;
    for (let r = top; r <= bottom; r++) out.push(g[r][right]);     // ↓
    right--;
    if (top <= bottom) {                                           // still a row below?
      for (let c = right; c >= left; c--) out.push(g[bottom][c]);  // ←
      bottom--;
    }
    if (left <= right) {                                           // still a column left?
      for (let r = bottom; r >= top; r--) out.push(g[r][left]);    // ↑
      left++;
    }
  }
  return out;
}` },
          { lang: 'cpp', code: `vector<int> spiralOrder(vector<vector<int>>& g) {
    vector<int> out;
    int top = 0, bottom = (int)g.size() - 1, left = 0, right = (int)g[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.push_back(g[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) out.push_back(g[r][right]);
        right--;
        if (top <= bottom) { for (int c = right; c >= left; c--) out.push_back(g[bottom][c]); bottom--; }
        if (left <= right) { for (int r = bottom; r >= top; r--) out.push_back(g[r][left]); left++; }
    }
    return out;
}` }, { lang: 'csharp', code: String.raw`
using System.Collections.Generic;

public class Solution {
    public IList<int> SpiralOrder(int[][] g) {
        var result = new List<int>();
        int top = 0, bottom = g.Length - 1, left = 0, right = g[0].Length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) result.Add(g[top][c]);       // ->
            top++;
            for (int r = top; r <= bottom; r++) result.Add(g[r][right]);    // v
            right--;
            if (top <= bottom) {                                            // still a row below?
                for (int c = right; c >= left; c--) result.Add(g[bottom][c]); // <-
                bottom--;
            }
            if (left <= right) {                                            // still a column left?
                for (int r = bottom; r >= top; r--) result.Add(g[r][left]);   // ^
                left++;
            }
        }
        return result;
    }
}` }
        ],
        dry: {
          head: ['walk', 'walls before (t, b, l, r)', 'cells read', 'output length'],
          rows: [
            ['→ row 0', '0, 2, 0, 3', '1 2 3 4', '4'],
            ['↓ col 3', '1, 2, 0, 3', '8 12', '6'],
            ['← row 2', '1, 2, 0, 2', '11 10 9', '9'],
            ['↑ col 0', '1, 1, 0, 2', '5', '10'],
            ['→ row 1', '1, 1, 1, 2', '6 7', '12'],
            ['↓ col 2', '2, 1, 1, 2', '(none: top &gt; bottom)', '12'],
            ['← guard', '2, 1, 1, 1', H.c('r', 'skipped (top &gt; bottom)'), '12'],
            ['↑ col 1', '2, 1, 1, 1', '(none) → left = 2, loop ends', H.c('p', '12 ✔')]
          ]
        },
        complexity: `<p><b>Time O(R·C)</b>: every cell is added exactly once. <b>Space O(1)</b> extra (four integers) besides the output list of size R·C.</p>`,
        followUps: ['Return the anti-clockwise spiral.', 'Fill an N × N matrix with 1..N² in spiral order (Spiral Matrix II).', 'Start at a given cell and spiral outward (Spiral Matrix III).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 9 — Rotate matrix 90 degrees
  // =====================================================================
  topics.push({
    title: 'Rotate a Matrix by 90°: Transpose + Reverse',
    analogy: `<p>Hold a square photo printed on clear plastic. <b>Flip it over along the diagonal</b> (top-left to bottom-right corner) — that is a <b>transpose</b>. Now <b>flip it left-to-right</b> like a mirror. Two simple flips, and the photo has turned 90° clockwise. Your phone's "rotate" button does the same thing to the pixel grid.</p>`,
    explain: `<p>Rotating an N × N matrix 90° <b>clockwise</b> sends the cell at (r, c) to (c, N − 1 − r): the first row becomes the last column, the second row becomes the second-last column, and so on.</p>
      ${H.table(['before', '', 'after (clockwise)'], [['1 2 3<br>4 5 6<br>7 8 9', '→', '7 4 1<br>8 5 2<br>9 6 3']])}
      <p>Doing that directly needs a second matrix. To rotate <b>in place</b> (O(1) extra space), split it into two easy flips:</p>
      <ol>
        <li><b>Transpose</b>: swap <code>g[r][c]</code> with <code>g[c][r]</code> for every c &gt; r (above the diagonal). Rows become columns: (r, c) → (c, r).</li>
        <li><b>Reverse every row</b>: (c, r) → (c, N − 1 − r). Combined: (r, c) → (c, N − 1 − r) ✔ — exactly the clockwise rule.</li>
      </ol>
      ${H.table(['step', 'matrix'], [['start', '1 2 3 / 4 5 6 / 7 8 9'], ['transpose', '1 <b>4 7</b> / <b>2</b> 5 <b>8</b> / <b>3 6</b> 9'], ['reverse each row', H.c('g', '7 4 1 / 8 5 2 / 9 6 3')]])}
      <h4>The rotation family</h4>
      ${H.table(['rotation', 'in-place recipe', 'cell move'], [['90° clockwise', 'transpose, then reverse each row', '(r, c) → (c, N−1−r)'], ['90° anti-clockwise', 'transpose, then reverse each column (or reverse each row first, then transpose)', '(r, c) → (N−1−c, r)'], ['180°', 'reverse each row, then reverse the row order', '(r, c) → (N−1−r, N−1−c)']])}
      <p><b>Careful with transpose:</b> only swap above the diagonal (<code>c</code> starts at <code>r + 1</code>). Looping over all cells swaps each pair <b>twice</b> and puts everything back where it started.</p>
      <p><b>Non-square matrices</b> (R × C, R ≠ C) cannot rotate in place — the result is C × R, a different shape. Allocate <code>res = new int[C][R]</code> and set <code>res[c][R − 1 − r] = g[r][c]</code>.</p>`,
    clues: [
      '"Rotate the image / matrix by 90 degrees" + "<b>in place</b>" / "do not allocate another matrix" → transpose + reverse rows.',
      '"Anti-clockwise" / "counter-clockwise" → transpose + reverse columns (or reverse rows, then transpose).',
      '"Rotate 180°" / "upside down" → reverse rows and reverse the row order.',
      '"Can matrix A become B by rotating?" (LeetCode 1886) → try the 4 rotations (0°, 90°, 180°, 270°) and compare.',
      'Rectangular R × C input that must be rotated → in-place is impossible; build a C × R result with res[c][R−1−r] = g[r][c].'
    ],
    code: [{ lang: 'java', code: `
      void rotateClockwise(int[][] g) {
          int n = g.length;
          // 1) transpose: swap across the main diagonal (only c > r, so each pair is swapped once)
          for (int r = 0; r < n; r++) {
              for (int c = r + 1; c < n; c++) {
                  int t = g[r][c];
                  g[r][c] = g[c][r];
                  g[c][r] = t;
              }
          }
          // 2) mirror every row left <-> right
          for (int[] row : g) {
              for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) {
                  int t = row[lo];
                  row[lo] = row[hi];
                  row[hi] = t;
              }
          }
      }`, alt: [
        { lang: 'python', code: `def rotate_clockwise(g):
    n = len(g)
    # 1) transpose: swap across the main diagonal (only c > r, so each pair is swapped once)
    for r in range(n):
        for c in range(r + 1, n):
            g[r][c], g[c][r] = g[c][r], g[r][c]
    # 2) mirror every row left <-> right
    for row in g:
        row.reverse()` },
        { lang: 'js', code: `function rotateClockwise(g) {
  const n = g.length;
  // 1) transpose: swap across the main diagonal (only c > r, so each pair is swapped once)
  for (let r = 0; r < n; r++)
    for (let c = r + 1; c < n; c++) [g[r][c], g[c][r]] = [g[c][r], g[r][c]];
  // 2) mirror every row left <-> right
  for (const row of g) row.reverse();
}` },
        { lang: 'cpp', code: `void rotateClockwise(vector<vector<int>>& g) {
    int n = g.size();
    // 1) transpose: swap across the main diagonal (only c > r, so each pair is swapped once)
    for (int r = 0; r < n; r++)
        for (int c = r + 1; c < n; c++) swap(g[r][c], g[c][r]);
    // 2) mirror every row left <-> right
    for (auto& row : g) reverse(row.begin(), row.end());
}` }, { lang: 'csharp', code: String.raw`
void RotateClockwise(int[][] g) {
    int n = g.Length;
    // 1) transpose: swap across the main diagonal (only c > r, so each pair is swapped once)
    for (int r = 0; r < n; r++) {
        for (int c = r + 1; c < n; c++) {
            int t = g[r][c];
            g[r][c] = g[c][r];
            g[c][r] = t;
        }
    }
    // 2) mirror every row left <-> right
    foreach (int[] row in g) Array.Reverse(row);
}` }
      ] }, { lang: 'java', code: `
      int[][] rotateRectangle(int[][] g) {
          int R = g.length, C = g[0].length;
          int[][] res = new int[C][R];          // shape changes: R x C becomes C x R
          for (int r = 0; r < R; r++)
              for (int c = 0; c < C; c++)
                  res[c][R - 1 - r] = g[r][c];   // the clockwise cell rule
          return res;
      }`, alt: [
        { lang: 'python', code: `def rotate_rectangle(g):
    # zip(*g) gives the columns; reversing the rows first makes it clockwise
    return [list(col) for col in zip(*g[::-1])]   # R x C becomes C x R` },
        { lang: 'js', code: `function rotateRectangle(g) {
  const R = g.length, C = g[0].length;
  const res = Array.from({ length: C }, () => new Array(R));   // shape changes: R x C becomes C x R
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) res[c][R - 1 - r] = g[r][c];   // the clockwise cell rule
  return res;
}` },
        { lang: 'cpp', code: `vector<vector<int>> rotateRectangle(const vector<vector<int>>& g) {
    int R = g.size(), C = g[0].size();
    vector<vector<int>> res(C, vector<int>(R));   // shape changes: R x C becomes C x R
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) res[c][R - 1 - r] = g[r][c];   // the clockwise cell rule
    return res;
}` }, { lang: 'csharp', code: String.raw`
int[][] RotateRectangle(int[][] g) {
    int R = g.Length, C = g[0].Length;
    int[][] res = new int[C][];           // shape changes: R x C becomes C x R
    for (int i = 0; i < C; i++) res[i] = new int[R];
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            res[c][R - 1 - r] = g[r][c];   // the clockwise cell rule
    return res;
}` }
      ] }],
    codeTitle: ['In-place 90° clockwise (square matrix)', 'Rectangular matrix: new C × R result'],
    viz: {
      title: 'Rotate clockwise = transpose swaps, then row reversals',
      input: '1 2 3; 4 5 6; 7 8 9',
      inputLabel: 'square matrix rows separated by ";" (2×2 up to 5×5)',
      gen: function (input) {
        var g = parseMatrix(input, 5, 5);
        var n = g.length;
        if (g[0].length !== n) throw new Error('Please enter a square matrix (same number of rows and columns), e.g. 1 2; 3 4');
        if (n < 2) throw new Error('Use at least a 2 × 2 matrix.');
        var orig = copyGrid(g), frames = [];
        frames.push({ narr: 'Goal: turn this ' + n + ' × ' + n + ' matrix 90° clockwise <b>in place</b>. Plan: (1) transpose = mirror across the diagonal, (2) reverse each row. The diagonal (purple) never moves during the transpose.', parts: [
          { type: 'grid', label: 'g', rows: copyGrid(g), rowHead: heads(n), colHead: heads(n), hl: (function () { var h = {}; for (var k = 0; k < n; k++) h[k + ',' + k] = 'sel'; return h; })() }
        ] });
        for (var r = 0; r < n; r++) {
          for (var c = r + 1; c < n; c++) {
            var a = g[r][c], b = g[c][r];
            g[r][c] = b; g[c][r] = a;
            var hl = {}; hl[r + ',' + c] = 'cur'; hl[c + ',' + r] = 'cur';
            for (var k = 0; k < n; k++) hl[k + ',' + k] = 'sel';
            frames.push({ narr: 'Transpose: swap g[' + r + '][' + c + '] = ' + a + ' with its mirror g[' + c + '][' + r + '] = ' + b + '. We only visit cells <b>above</b> the diagonal (c &gt; r), so each pair is swapped exactly once.', parts: [
              { type: 'grid', label: 'g (transposing)', rows: copyGrid(g), rowHead: heads(n), colHead: heads(n), hl: hl },
              { type: 'vars', vals: { r: r, c: c, swapped: a + ' ↔ ' + b } }
            ] });
          }
        }
        frames.push({ narr: 'Transpose done: every row is now a former column (row 0 = old column 0: ' + g[0].join(', ') + '). It is a mirror image, not yet a rotation.', parts: [
          { type: 'grid', label: 'g after transpose', rows: copyGrid(g), rowHead: heads(n), colHead: heads(n) }
        ] });
        for (r = 0; r < n; r++) {
          var before = g[r].slice();
          g[r].reverse();
          var hl2 = {};
          for (var cc = 0; cc < n; cc++) { hl2[r + ',' + cc] = 'ok'; for (var rr = 0; rr < r; rr++) hl2[rr + ',' + cc] = 'done'; }
          frames.push({ narr: 'Reverse row ' + r + ': [' + before.join(', ') + '] → [' + g[r].join(', ') + ']. A row reversal is a two-pointer swap from both ends.', parts: [
            { type: 'grid', label: 'g (reversing rows)', rows: copyGrid(g), rowHead: heads(n), colHead: heads(n), hl: hl2 },
            { type: 'array', label: 'row ' + r + ' now', values: g[r].slice(), hl: rangeHl(0, n - 1, 'ok') }
          ] });
        }
        frames.push({ narr: 'Done! Compare: the old first row [' + orig[0].join(', ') + '] is now the <b>last column</b> (read top to bottom), and the old first column [' + orig.map(function (row) { return row[0]; }).join(', ') + '] is now the <b>first row</b> read right to left. Cell (r, c) moved to (c, N−1−r).', parts: [
          { type: 'grid', label: 'before', rows: orig, rowHead: heads(n), colHead: heads(n), hl: (function () { var h = {}; for (var k = 0; k < n; k++) h['0,' + k] = 'win'; return h; })() },
          { type: 'grid', label: 'after (90° clockwise)', rows: copyGrid(g), rowHead: heads(n), colHead: heads(n), hl: (function () { var h = {}; for (var k = 0; k < n; k++) h[k + ',' + (n - 1)] = 'win'; return h; })() }
        ] });
        return frames;
      }
    },
    examples: [
      { title: '2 × 2 by hand', html: `<p>[[1, 2], [3, 4]] → transpose [[1, 3], [2, 4]] → reverse rows <b>[[3, 1], [4, 2]]</b>. Check the rule (r, c) → (c, N−1−r): the 1 at (0, 0) goes to (0, 1) ✔; the 3 at (1, 0) goes to (0, 0) ✔.</p>` },
      { title: 'Anti-clockwise', html: `<p>[[1, 2, 3], [4, 5, 6], [7, 8, 9]] anti-clockwise is [[3, 6, 9], [2, 5, 8], [1, 4, 7]]. Recipe: reverse each row first ([[3,2,1],[6,5,4],[9,8,7]]) then transpose → [[3,6,9],[2,5,8],[1,4,7]] ✔. Or transpose then reverse the order of the rows. Draw a 2 × 2 to remember which order goes with which direction.</p>`, code: { lang: 'java', code: `int[][] g = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
int n = g.length;
for (int[] row : g)                                   // 1) reverse each row
    for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) { int t = row[lo]; row[lo] = row[hi]; row[hi] = t; }
for (int r = 0; r < n; r++)                           // 2) transpose
    for (int c = r + 1; c < n; c++) { int t = g[r][c]; g[r][c] = g[c][r]; g[c][r] = t; }
System.out.println(Arrays.deepToString(g));           // [[3, 6, 9], [2, 5, 8], [1, 4, 7]]`, alt: [
        { lang: 'python', run: true, code: `g = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
n = len(g)
for row in g:                       # 1) reverse each row
    row.reverse()
for r in range(n):                  # 2) transpose
    for c in range(r + 1, n):
        g[r][c], g[c][r] = g[c][r], g[r][c]
print(g)   # [[3, 6, 9], [2, 5, 8], [1, 4, 7]]` },
        { lang: 'js', run: true, code: `const g = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const n = g.length;
for (const row of g) row.reverse();                 // 1) reverse each row
for (let r = 0; r < n; r++)                         // 2) transpose
  for (let c = r + 1; c < n; c++) [g[r][c], g[c][r]] = [g[c][r], g[r][c]];
console.log(JSON.stringify(g));   // [[3,6,9],[2,5,8],[1,4,7]]` },
        { lang: 'cpp', code: `vector<vector<int>> g = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
int n = g.size();
for (auto& row : g) reverse(row.begin(), row.end());   // 1) reverse each row
for (int r = 0; r < n; r++)                            // 2) transpose
    for (int c = r + 1; c < n; c++) swap(g[r][c], g[c][r]);
for (auto& row : g) { for (int x : row) cout << x << " "; cout << "\\n"; }   // 3 6 9 / 2 5 8 / 1 4 7` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        int[][] g = { new[] { 1, 2, 3 }, new[] { 4, 5, 6 }, new[] { 7, 8, 9 } };
        int n = g.Length;
        foreach (int[] row in g) Array.Reverse(row);          // 1) reverse each row
        for (int r = 0; r < n; r++)                           // 2) transpose
            for (int c = r + 1; c < n; c++) { int t = g[r][c]; g[r][c] = g[c][r]; g[c][r] = t; }
        var rows = new List<string>();
        foreach (int[] row in g) rows.Add("[" + string.Join(", ", row) + "]");
        Console.WriteLine("[" + string.Join(", ", rows) + "]");   // [[3, 6, 9], [2, 5, 8], [1, 4, 7]]
    }
}`, run: true }
      ] } },
      { title: 'Layer-by-layer four-way swap (one pass)', html: `<p>Instead of two passes, rotate each ring by moving four cells at once: top → right → bottom → left → top. For a 4 × 4, layer 0 handles positions i = 0..2: each step saves <code>top = g[first][first+i]</code>, then left → top, bottom → left, right → bottom, saved top → right. It touches each cell once (vs twice for transpose + reverse) but is much easier to get wrong under pressure. Mention it as an alternative; code the two-flip version.</p>`, code: { lang: 'java', code: `int[][] g = {{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}, {13, 14, 15, 16}};
int n = g.length;
for (int layer = 0; layer < n / 2; layer++) {
    int first = layer, last = n - 1 - layer;
    for (int i = 0; i < last - first; i++) {
        int top = g[first][first + i];                   // save top
        g[first][first + i] = g[last - i][first];        // left   -> top
        g[last - i][first] = g[last][last - i];          // bottom -> left
        g[last][last - i] = g[first + i][last];          // right  -> bottom
        g[first + i][last] = top;                        // top    -> right
    }
}
System.out.println(Arrays.deepToString(g));  // [[13, 9, 5, 1], [14, 10, 6, 2], [15, 11, 7, 3], [16, 12, 8, 4]]`, alt: [
        { lang: 'python', run: true, code: `g = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]
n = len(g)
for layer in range(n // 2):
    first, last = layer, n - 1 - layer
    for i in range(last - first):
        top = g[first][first + i]                   # save top
        g[first][first + i] = g[last - i][first]    # left   -> top
        g[last - i][first] = g[last][last - i]      # bottom -> left
        g[last][last - i] = g[first + i][last]      # right  -> bottom
        g[first + i][last] = top                    # top    -> right
print(g)   # [[13, 9, 5, 1], [14, 10, 6, 2], [15, 11, 7, 3], [16, 12, 8, 4]]` },
        { lang: 'js', run: true, code: `const g = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]];
const n = g.length;
for (let layer = 0; layer < n >> 1; layer++) {
  const first = layer, last = n - 1 - layer;
  for (let i = 0; i < last - first; i++) {
    const top = g[first][first + i];                // save top
    g[first][first + i] = g[last - i][first];       // left   -> top
    g[last - i][first] = g[last][last - i];         // bottom -> left
    g[last][last - i] = g[first + i][last];         // right  -> bottom
    g[first + i][last] = top;                       // top    -> right
  }
}
console.log(JSON.stringify(g));   // [[13,9,5,1],[14,10,6,2],[15,11,7,3],[16,12,8,4]]` },
        { lang: 'cpp', code: `vector<vector<int>> g = {{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}, {13, 14, 15, 16}};
int n = g.size();
for (int layer = 0; layer < n / 2; layer++) {
    int first = layer, last = n - 1 - layer;
    for (int i = 0; i < last - first; i++) {
        int top = g[first][first + i];                   // save top
        g[first][first + i] = g[last - i][first];        // left   -> top
        g[last - i][first] = g[last][last - i];          // bottom -> left
        g[last][last - i] = g[first + i][last];          // right  -> bottom
        g[first + i][last] = top;                        // top    -> right
    }
}
for (auto& row : g) { for (int x : row) cout << x << " "; cout << "\\n"; }` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        int[][] g = { new[] { 1, 2, 3, 4 }, new[] { 5, 6, 7, 8 }, new[] { 9, 10, 11, 12 }, new[] { 13, 14, 15, 16 } };
        int n = g.Length;
        for (int layer = 0; layer < n / 2; layer++) {
            int first = layer, last = n - 1 - layer;
            for (int i = 0; i < last - first; i++) {
                int top = g[first][first + i];                   // save top
                g[first][first + i] = g[last - i][first];        // left   -> top
                g[last - i][first] = g[last][last - i];          // bottom -> left
                g[last][last - i] = g[first + i][last];          // right  -> bottom
                g[first + i][last] = top;                        // top    -> right
            }
        }
        var rows = new List<string>();
        foreach (int[] row in g) rows.Add("[" + string.Join(", ", row) + "]");
        Console.WriteLine("[" + string.Join(", ", rows) + "]");  // [[13, 9, 5, 1], [14, 10, 6, 2], [15, 11, 7, 3], [16, 12, 8, 4]]
    }
}`, run: true }
      ] } },
      { title: 'Rectangular 2 × 3', html: `<p>g = [[1, 2, 3], [4, 5, 6]] (R = 2, C = 3) rotated clockwise is 3 × 2: <b>[[4, 1], [5, 2], [6, 3]]</b>. With res[c][R−1−r] = g[r][c]: the 1 at (0, 0) lands at res[0][1] ✔, the 6 at (1, 2) lands at res[2][0] ✔. The shape changes, so a new matrix is unavoidable.</p>` }
    ],
    deepDive: `<h4>Why transpose + reverse equals rotation</h4><p>Transpose maps (r, c) → (c, r). Reversing each row maps (x, y) → (x, N−1−y). Composing: (r, c) → (c, r) → (c, N−1−r), the clockwise rule. Any rotation is a composition of two reflections — a fact from geometry that turns a scary in-place operation into two trivial loops.</p>
      <h4>Cost</h4><p>Transpose does N(N−1)/2 swaps, row reversal does N·⌊N/2⌋ swaps — about N<sup>2</sup> swaps total, O(N<sup>2</sup>) time, O(1) extra space. The four-way layer swap does about N<sup>2</sup>/4 cycles of 4 moves: same Big-O, fewer memory writes.</p>
      <h4>k rotations</h4><p>Rotating 4 times returns the original, so "rotate k times" = rotate k % 4 times. 270° clockwise = 90° anti-clockwise.</p>
      <h4>Rotating without moving anything</h4><p>Production image libraries and GPUs often do not move pixels at all: they store an orientation flag (like the EXIF orientation tag in photos) and change the index formula when reading: reading a clockwise-rotated view at (r, c) means reading the original at (N−1−c, r). This "virtual rotation" is O(1) — a useful idea in system design answers.</p>
      <h4>Common bugs</h4><ul><li>Transposing over all (r, c) pairs → double swap → no change.</li><li>Reversing columns instead of rows → anti-clockwise result.</li><li>Using the in-place method on a non-square matrix → index out of bounds.</li><li>In the layer method, mixing <code>first + i</code> and <code>last − i</code>.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> "Rotate Image" is memorised by every model, so the interview signal is the <b>reasoning</b>: why two reflections make a rotation, and which order gives which direction.</p>
      <p><b>Use AI as a partner:</b> <code>Show me the cell mapping for 90°, 180°, 270° rotations and the matching flip recipes as a table</code> — then verify one row of the table on a 2 × 2 by hand. Use it to produce visual ASCII before/after grids for quick checks.</p>
      <p><b>Where AI goes wrong:</b> clockwise vs anti-clockwise mix-ups (it often reverses columns when it meant rows), transposing all pairs, and "in-place" solutions for rectangular input that silently allocate.</p>
      <p><b>What you must still own:</b> deriving (r, c) → (c, N−1−r) from a tiny example, and testing the 2 × 2 and 3 × 3 cases yourself before trusting any generated code.</p>`,
    problems: [{
      title: 'Rotate Image (In Place)',
      level: 'Medium',
      tags: ['matrix', 'in-place', 'transpose'],
      companies: ['Amazon', 'Microsoft', 'Apple', 'Meta'],
      statement: `<p>You are given an <code>N × N</code> matrix representing an image. Rotate it by <b>90 degrees clockwise</b>, <b>in place</b> — you must modify the input matrix directly and must not allocate another 2D matrix.</p>`,
      constraints: `1 ≤ N ≤ 20, −1000 ≤ matrix[i][j] ≤ 1000`,
      example: `${H.table(['input', 'output'], [['1 2 3<br>4 5 6<br>7 8 9', H.c('g', '7 4 1<br>8 5 2<br>9 6 3')]])}<p>The first row ${H.c('y', '1 2 3')} became the last column (top to bottom), and the first column 1 4 7 became the first row read right to left: ${H.c('y', '7 4 1')}.</p>`,
      brute: {
        why: `<p>Build a new N × N matrix with <code>res[c][N−1−r] = g[r][c]</code> and copy it back. Time O(N<sup>2</sup>) is fine, but it uses O(N<sup>2</sup>) extra memory, which the problem forbids. The waste: we store a full second copy when each cell could be moved by swaps.</p>`,
        code: { lang: 'java', code: `
          void rotateWithCopy(int[][] g) {
              int n = g.length;
              int[][] res = new int[n][n];                 // extra N*N memory: not allowed
              for (int r = 0; r < n; r++)
                  for (int c = 0; c < n; c++)
                      res[c][n - 1 - r] = g[r][c];         // clockwise rule
              for (int r = 0; r < n; r++) g[r] = res[r].clone();
          }`, alt: [{ lang: 'python', code: String.raw`
def rotate(g):
    n = len(g)
    res = [[0] * n for _ in range(n)]       # extra N*N memory: not allowed
    for r in range(n):
        for c in range(n):
            res[c][n - 1 - r] = g[r][c]     # clockwise rule
    for r in range(n):
        g[r] = res[r][:]` }, { lang: 'js', code: String.raw`
function rotate(g) {
  const n = g.length;
  const res = Array.from({ length: n }, () => new Array(n).fill(0));   // extra N*N memory: not allowed
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      res[c][n - 1 - r] = g[r][c];          // clockwise rule
  for (let r = 0; r < n; r++) g[r] = res[r].slice();
}` }, { lang: 'cpp', code: String.raw`
void rotate(vector<vector<int>>& g) {
    int n = g.size();
    vector<vector<int>> res(n, vector<int>(n));    // extra N*N memory: not allowed
    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++)
            res[c][n - 1 - r] = g[r][c];           // clockwise rule
    for (int r = 0; r < n; r++) g[r] = res[r];
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void Rotate(int[][] g) {
        int n = g.Length;
        int[][] res = new int[n][];                  // extra N*N memory: not allowed
        for (int r = 0; r < n; r++) res[r] = new int[n];
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++)
                res[c][n - 1 - r] = g[r][c];         // clockwise rule
        for (int r = 0; r < n; r++) res[r].CopyTo(g[r], 0);   // write back through the shared rows
    }
}` }] }
      },
      mcq: {
        q: `<p>You transposed [[1, 2], [3, 4]] and got [[1, 3], [2, 4]]. Which step finishes a <b>clockwise</b> rotation?</p>`,
        options: ['Reverse each row → [[3, 1], [4, 2]]', 'Reverse the order of rows → [[2, 4], [1, 3]]', 'Transpose again', 'Nothing — it is already rotated'],
        answer: 0,
        explain: `<p>Clockwise = transpose + reverse each row. Reversing the order of the rows instead gives [[2, 4], [1, 3]], which is the anti-clockwise rotation. Transposing again undoes the first step.</p>`
      },
      hints: [
        `<p><b>Aha:</b> a rotation is two reflections. Mirror across the main diagonal (transpose), then mirror left-right (reverse each row).</p>`,
        `<p>Transpose with a double loop where the inner index starts at <code>r + 1</code>, swapping <code>g[r][c]</code> and <code>g[c][r]</code>. Then reverse every row with two pointers.</p>`,
        `<p><b>Traps:</b> starting the inner loop at 0 swaps every pair twice (no change). N = 1 must work (nothing to do). Check direction on a 2 × 2.<br><b>Recipe:</b> for r: for c in r+1..N−1: swap(g[r][c], g[c][r]); for each row: reverse.</p>`
      ],
      tests: { sig: 'int[][] -> void', fn: 'rotate', mutate: 0, cases: [
        [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[7, 4, 1], [8, 5, 2], [9, 6, 3]]],
        [[[[1]]], [[1]]],
        [[[[1, 2], [3, 4]]], [[3, 1], [4, 2]]],
        [[[[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]], [[15, 13, 2, 5], [14, 3, 4, 1], [12, 6, 8, 9], [16, 7, 10, 11]]],
        [[[[-1000, 1000], [0, -1]]], [[0, -1000], [-1, 1000]]],
        [[[[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25]]], [[21, 16, 11, 6, 1], [22, 17, 12, 7, 2], [23, 18, 13, 8, 3], [24, 19, 14, 9, 4], [25, 20, 15, 10, 5]]]
      ] },
      solution: {
        approach: `<p>Transpose (swap across the diagonal), then reverse each row. Two reflections = one 90° clockwise rotation, all in place.</p>`,
        code: `
          class Solution {
              public void rotate(int[][] g) {
                  int n = g.length;
                  for (int r = 0; r < n; r++) {               // transpose
                      for (int c = r + 1; c < n; c++) {       // only above the diagonal
                          int t = g[r][c];
                          g[r][c] = g[c][r];
                          g[c][r] = t;
                      }
                  }
                  for (int r = 0; r < n; r++) {               // reverse each row
                      for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) {
                          int t = g[r][lo];
                          g[r][lo] = g[r][hi];
                          g[r][hi] = t;
                      }
                  }
              }

              public static void main(String[] args) {
                  int[][] g = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
                  new Solution().rotate(g);
                  System.out.println(Arrays.deepToString(g)); // [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
              }
          }`,
        alt: [
          { lang: 'python', code: `def rotate(g):
    n = len(g)
    for r in range(n):
        for c in range(r + 1, n):
            g[r][c], g[c][r] = g[c][r], g[r][c]
    for row in g:
        row.reverse()

m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
rotate(m)
print(m)` },
          { lang: 'js', code: `function rotate(g) {
  const n = g.length;
  for (let r = 0; r < n; r++)                // transpose: swap above the diagonal
    for (let c = r + 1; c < n; c++) [g[r][c], g[c][r]] = [g[c][r], g[r][c]];
  for (const row of g) row.reverse();        // then reverse each row
}` },
          { lang: 'cpp', code: `class Solution {
public:
    void rotate(vector<vector<int>>& g) {
        int n = g.size();
        for (int r = 0; r < n; r++)              // transpose: swap above the diagonal
            for (int c = r + 1; c < n; c++) swap(g[r][c], g[c][r]);
        for (auto& row : g) reverse(row.begin(), row.end());   // then reverse each row
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void Rotate(int[][] g) {
        int n = g.Length;
        for (int r = 0; r < n; r++) {               // transpose
            for (int c = r + 1; c < n; c++) {       // only above the diagonal
                int t = g[r][c];
                g[r][c] = g[c][r];
                g[c][r] = t;
            }
        }
        for (int r = 0; r < n; r++) {               // reverse each row
            for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) {
                int t = g[r][lo];
                g[r][lo] = g[r][hi];
                g[r][hi] = t;
            }
        }
    }
}` }
        ],
        dry: {
          head: ['step', 'action', 'matrix'],
          rows: [
            ['0', 'start', '1 2 3 / 4 5 6 / 7 8 9'],
            ['1', 'swap (0,1) ↔ (1,0)', '1 <b>4</b> 3 / <b>2</b> 5 6 / 7 8 9'],
            ['2', 'swap (0,2) ↔ (2,0)', '1 4 <b>7</b> / 2 5 6 / <b>3</b> 8 9'],
            ['3', 'swap (1,2) ↔ (2,1)', '1 4 7 / 2 5 <b>8</b> / 3 <b>6</b> 9'],
            ['4', 'reverse row 0', '<span class="c-g">7 4 1</span> / 2 5 8 / 3 6 9'],
            ['5', 'reverse row 1', '7 4 1 / <span class="c-g">8 5 2</span> / 3 6 9'],
            ['6', 'reverse row 2', '7 4 1 / 8 5 2 / <span class="c-g">9 6 3</span>']
          ]
        },
        complexity: `<p><b>Time O(N<sup>2</sup>)</b>: about N<sup>2</sup>/2 swaps for the transpose plus N<sup>2</sup>/2 for the reversals. <b>Space O(1)</b>: one temp variable.</p>`,
        followUps: ['Rotate anti-clockwise in place.', 'Rotate by k × 90° efficiently (k % 4).', 'Check if one matrix can be obtained from another by rotation.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 10 — Search in a row- and column-sorted matrix
  // =====================================================================
  topics.push({
    title: 'Row-Column Sorted Matrix: The Staircase Search',
    analogy: `<p>Picture a supermarket shelf where prices go <b>up</b> as you move <b>right</b> along a shelf and also go <b>up</b> as you move <b>down</b> to lower shelves. You want an item costing exactly ₹90. Stand at the <b>top-right</b> item: moving left makes things cheaper, moving down makes things pricier — there is always exactly one sensible direction. If this item is too expensive, nothing below it can help (they are even pricier), so you step left and forget that whole column. If it is too cheap, nothing to its left can help, so you step down and forget that whole row. You walk down a staircase, throwing away a row or column with every step.</p>`,
    explain: `<p>The matrix has every <b>row sorted left → right</b> and every <b>column sorted top → bottom</b>. Rows do not continue from each other (row 1 may start lower than row 0 ends), so it is <b>not</b> one long sorted list.</p>
      ${H.table(['', 'c0', 'c1', 'c2', 'c3'], [['r0', '1', '4', '7', H.c('y', '11')], ['r1', '2', '5', '8', '12'], ['r2', '3', '6', '9', '16'], ['r3', '10', '13', '14', '17']])}
      <p>Start at the top-right corner (r = 0, c = last). Compare with the target:</p>
      <ul>
        <li><code>g[r][c] == target</code> → found.</li>
        <li><code>g[r][c] &gt; target</code> → every cell <b>below</b> in this column is even bigger → the whole column is useless → <code>c−−</code>.</li>
        <li><code>g[r][c] &lt; target</code> → every cell to the <b>left</b> in this row is even smaller → the whole row is useless → <code>r++</code>.</li>
      </ul>
      <p>Search for 9 in the matrix above:</p>
      ${H.table(['step', '(r, c)', 'value', 'compare with 9', 'move'], [['1', '(0, 3)', '11', 'too big', H.c('r', 'drop column 3 → c = 2')], ['2', '(0, 2)', '7', 'too small', H.c('r', 'drop row 0 → r = 1')], ['3', '(1, 2)', '8', 'too small', 'r = 2'], ['4', '(2, 2)', '9', H.c('g', 'equal'), H.c('g', 'found!')]])}
      <p>Each step removes one row or one column, and there are only R + C of them, so the search takes at most <b>R + C − 1 steps: O(R + C)</b>. For a 1000 × 1000 matrix that is at most 1999 comparisons instead of 10<sup>6</sup>.</p>
      <p><b>Why not start top-left?</b> From the top-left both moves (right and down) make values bigger — when the value is too small you do not know which way to go. The top-right and bottom-left corners are the only "one bigger way, one smaller way" corners.</p>
      <p><b>Different problem — fully sorted matrix</b> (each row starts after the previous row ends, LeetCode 74): then it <i>is</i> one sorted list of R·C numbers, and binary search on the flat index (<code>row = mid / C</code>, <code>col = mid % C</code>) gives O(log(R·C)).</p>`,
    clues: [
      '"Each row is sorted ascending and each column is sorted ascending" + "search for target" → staircase from the top-right (or bottom-left), O(R + C).',
      '"First integer of each row is greater than the last of the previous row" → it is one sorted list: binary search on index mid → (mid / C, mid % C).',
      '"Count negatives / count elements ≤ x in a sorted matrix" → staircase counting in O(R + C).',
      '"k-th smallest element in a sorted matrix" → binary search on the value + staircase count of elements ≤ mid.',
      '"Do better than O(R·C)" or R, C ≤ 1000 with many queries → do not scan every cell; use the sorted order to discard rows/columns.'
    ],
    code: [{ lang: 'java', code: `
      boolean searchMatrix(int[][] g, int target) {
          int r = 0, c = g[0].length - 1;          // start at the top-right corner
          while (r < g.length && c >= 0) {
              int v = g[r][c];
              if (v == target) return true;
              if (v > target) c--;                 // everything below is bigger: drop this column
              else r++;                            // everything to the left is smaller: drop this row
          }
          return false;                            // walked off the matrix: not present
      }`, alt: [
        { lang: 'python', code: `def search_matrix(g, target):
    r, c = 0, len(g[0]) - 1           # start at the top-right corner
    while r < len(g) and c >= 0:
        v = g[r][c]
        if v == target:
            return True
        if v > target:
            c -= 1                    # everything below is bigger: drop this column
        else:
            r += 1                    # everything to the left is smaller: drop this row
    return False                      # walked off the matrix: not present` },
        { lang: 'js', code: `function searchMatrix(g, target) {
  let r = 0, c = g[0].length - 1;     // start at the top-right corner
  while (r < g.length && c >= 0) {
    const v = g[r][c];
    if (v === target) return true;
    if (v > target) c--;              // everything below is bigger: drop this column
    else r++;                         // everything to the left is smaller: drop this row
  }
  return false;                       // walked off the matrix: not present
}` },
        { lang: 'cpp', code: `bool searchMatrix(const vector<vector<int>>& g, int target) {
    int r = 0, c = (int)g[0].size() - 1;   // start at the top-right corner
    while (r < (int)g.size() && c >= 0) {
        int v = g[r][c];
        if (v == target) return true;
        if (v > target) c--;               // everything below is bigger: drop this column
        else r++;                          // everything to the left is smaller: drop this row
    }
    return false;                          // walked off the matrix: not present
}` }, { lang: 'csharp', code: String.raw`
bool SearchMatrix(int[][] g, int target) {
    int r = 0, c = g[0].Length - 1;          // start at the top-right corner
    while (r < g.Length && c >= 0) {
        int v = g[r][c];
        if (v == target) return true;
        if (v > target) c--;                 // everything below is bigger: drop this column
        else r++;                            // everything to the left is smaller: drop this row
    }
    return false;                            // walked off the matrix: not present
}` }
      ] }, { lang: 'java', code: `
      // Fully sorted matrix (rows continue each other): binary search on a virtual flat array
      boolean searchFlat(int[][] g, int target) {
          int R = g.length, C = g[0].length;
          int lo = 0, hi = R * C - 1;
          while (lo <= hi) {
              int mid = lo + (hi - lo) / 2;
              int v = g[mid / C][mid % C];          // flat index -> (row, col)
              if (v == target) return true;
              if (v < target) lo = mid + 1; else hi = mid - 1;
          }
          return false;
      }`, alt: [
        { lang: 'python', code: `# Fully sorted matrix (rows continue each other): binary search on a virtual flat array
def search_flat(g, target):
    R, C = len(g), len(g[0])
    lo, hi = 0, R * C - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        v = g[mid // C][mid % C]      # flat index -> (row, col)
        if v == target:
            return True
        if v < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False` },
        { lang: 'js', code: `// Fully sorted matrix (rows continue each other): binary search on a virtual flat array
function searchFlat(g, target) {
  const R = g.length, C = g[0].length;
  let lo = 0, hi = R * C - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = g[Math.floor(mid / C)][mid % C];   // flat index -> (row, col)
    if (v === target) return true;
    if (v < target) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}` },
        { lang: 'cpp', code: `// Fully sorted matrix (rows continue each other): binary search on a virtual flat array
bool searchFlat(const vector<vector<int>>& g, int target) {
    int R = g.size(), C = g[0].size();
    int lo = 0, hi = R * C - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        int v = g[mid / C][mid % C];          // flat index -> (row, col)
        if (v == target) return true;
        if (v < target) lo = mid + 1; else hi = mid - 1;
    }
    return false;
}` }, { lang: 'csharp', code: String.raw`
// Fully sorted matrix (rows continue each other): binary search on a virtual flat array
bool SearchFlat(int[][] g, int target) {
    int R = g.Length, C = g[0].Length;
    int lo = 0, hi = R * C - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        int v = g[mid / C][mid % C];          // flat index -> (row, col)
        if (v == target) return true;
        if (v < target) lo = mid + 1; else hi = mid - 1;
    }
    return false;
}` }
      ] }],
    codeTitle: ['Staircase search — O(R + C)', 'Bonus: fully sorted matrix — O(log(R·C))'],
    viz: {
      title: 'Staircase search: every step throws away a row or a column',
      input: '1 4 7 11; 2 5 8 12; 3 6 9 16; 10 13 14 17 | 9',
      inputLabel: 'sorted matrix rows separated by ";" | target',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).split('|');
        if (s.length !== 2) throw new Error('Format: matrix rows separated by ";" then | target, e.g. 1 4; 2 5 | 5');
        var g = parseMatrix(s[0], 6, 6);
        var t = nums(s[1], 1, 1, 'one target number after the "|"')[0];
        var R = g.length, C = g[0].length, i, j;
        for (i = 0; i < R; i++) for (j = 0; j < C; j++) {
          if (j > 0 && g[i][j] < g[i][j - 1]) throw new Error('Row ' + i + ' is not sorted left to right.');
          if (i > 0 && g[i][j] < g[i - 1][j]) throw new Error('Column ' + j + ' is not sorted top to bottom.');
        }
        var frames = [], dead = {}, r = 0, c = C - 1, steps = 0, path = [];
        function hlNow(cur, cls) {
          var h = {};
          for (var k in dead) h[k] = 'done';
          path.forEach(function (p) { if (!dead[p]) h[p] = 'win'; });
          if (cur) h[cur] = cls;
          return h;
        }
        frames.push({ narr: 'Rows go up left → right, columns go up top → bottom. Start at the <b>top-right</b> corner: left is smaller, down is bigger — so every comparison tells us exactly which way to go. Target = <b>' + t + '</b>.', parts: [
          { type: 'grid', label: 'sorted matrix', rows: copyGrid(g), rowHead: heads(R), colHead: heads(C), hl: hlNow(r + ',' + c, 'cur') },
          { type: 'vars', vals: { target: t, r: r, c: c, steps: 0 } }
        ] });
        var found = false;
        while (r < R && c >= 0) {
          steps++;
          var v = g[r][c];
          path.push(r + ',' + c);
          if (v === t) {
            found = true;
            frames.push({ narr: 'g[' + r + '][' + c + '] = ' + v + ' equals the target. <span class="c-g">Found after ' + steps + ' step(s)</span> — out of ' + (R * C) + ' cells.', parts: [
              { type: 'grid', label: 'sorted matrix', rows: copyGrid(g), rowHead: heads(R), colHead: heads(C), hl: hlNow(r + ',' + c, 'ok') },
              { type: 'vars', vals: { target: t, r: r, c: c, steps: steps }, hl: { steps: 'ok' } }
            ] });
            break;
          }
          if (v > t) {
            for (i = r; i < R; i++) dead[i + ',' + c] = 1;
            frames.push({ narr: 'g[' + r + '][' + c + '] = ' + v + ' &gt; ' + t + '. Everything <b>below</b> it in column ' + c + ' is even bigger, so the whole rest of column ' + c + ' is crossed out. Move <b>left</b>: c = ' + (c - 1) + '.', parts: [
              { type: 'grid', label: 'sorted matrix (faded = ruled out)', rows: copyGrid(g), rowHead: heads(R), colHead: heads(C), hl: hlNow(r + ',' + c, 'bad') },
              { type: 'vars', vals: { target: t, value: v, decision: 'too big → c--', steps: steps }, hl: { decision: 'bad' } }
            ] });
            c--;
          } else {
            for (j = 0; j <= c; j++) dead[r + ',' + j] = 1;
            frames.push({ narr: 'g[' + r + '][' + c + '] = ' + v + ' &lt; ' + t + '. Everything to the <b>left</b> in row ' + r + ' is even smaller, so the rest of row ' + r + ' is crossed out. Move <b>down</b>: r = ' + (r + 1) + '.', parts: [
              { type: 'grid', label: 'sorted matrix (faded = ruled out)', rows: copyGrid(g), rowHead: heads(R), colHead: heads(C), hl: hlNow(r + ',' + c, 'bad') },
              { type: 'vars', vals: { target: t, value: v, decision: 'too small → r++', steps: steps }, hl: { decision: 'bad' } }
            ] });
            r++;
          }
        }
        if (!found) frames.push({ narr: 'We walked off the matrix (r = ' + r + ', c = ' + c + '). Every row or column was ruled out, so <span class="c-r">' + t + ' is not in the matrix</span>. Steps: ' + steps + ' ≤ R + C − 1 = ' + (R + C - 1) + '.', parts: [
          { type: 'grid', label: 'sorted matrix', rows: copyGrid(g), rowHead: heads(R), colHead: heads(C), hl: hlNow(null) },
          { type: 'vars', vals: { target: t, found: 'no', steps: steps }, hl: { found: 'bad' } }
        ] });
        frames.push({ narr: 'The blue cells show the staircase path we walked. At most R + C − 1 = ' + (R + C - 1) + ' steps, i.e. O(R + C), because each step deletes a whole row or column.', parts: [
          { type: 'grid', label: 'path taken', rows: copyGrid(g), rowHead: heads(R), colHead: heads(C), hl: (function () { var h = {}; path.forEach(function (p) { h[p] = 'win'; }); if (found) h[path[path.length - 1]] = 'sel'; return h; })() },
          { type: 'text', html: 'Path: ' + path.map(function (p) { var q = p.split(','); return g[+q[0]][+q[1]]; }).join(' → ') }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Target not present', html: `<p>Same matrix, target = 15: 11 &lt; 15 → r = 1; 12 &lt; 15 → r = 2; 16 &gt; 15 → c = 2; 9 &lt; 15 → r = 3; 14 &lt; 15 → r = 4 → off the bottom → <b>false</b>. Five steps, never more than R + C − 1 = 7.</p>` },
      { title: 'Count negative numbers in a sorted matrix', html: `<p>LeetCode 1351: rows and columns sorted in <b>decreasing</b> order. Start at the bottom-left; if the value is negative, everything to its right in that row is negative too → add (C − c) and move up; otherwise move right. [[4, 3, 2, −1], [3, 2, 1, −1], [1, 1, −1, −2], [−1, −1, −2, −3]] → <b>8</b> negatives in O(R + C).</p>`, code: { lang: 'java', code: `int[][] g = {{4, 3, 2, -1}, {3, 2, 1, -1}, {1, 1, -1, -2}, {-1, -1, -2, -3}};
int R = g.length, C = g[0].length, r = R - 1, c = 0, count = 0;
while (r >= 0 && c < C) {
    if (g[r][c] < 0) { count += C - c; r--; }   // this cell and all to its right are negative
    else c++;                                    // non-negative: look further right
}
System.out.println(count);   // 8`, alt: [
        { lang: 'python', run: true, code: `g = [[4, 3, 2, -1], [3, 2, 1, -1], [1, 1, -1, -2], [-1, -1, -2, -3]]
R, C = len(g), len(g[0])
r, c, count = R - 1, 0, 0
while r >= 0 and c < C:
    if g[r][c] < 0:
        count += C - c          # this cell and all to its right are negative
        r -= 1
    else:
        c += 1                  # non-negative: look further right
print(count)   # 8` },
        { lang: 'js', run: true, code: `const g = [[4, 3, 2, -1], [3, 2, 1, -1], [1, 1, -1, -2], [-1, -1, -2, -3]];
const R = g.length, C = g[0].length;
let r = R - 1, c = 0, count = 0;
while (r >= 0 && c < C) {
  if (g[r][c] < 0) { count += C - c; r--; }   // this cell and all to its right are negative
  else c++;                                    // non-negative: look further right
}
console.log(count);   // 8` },
        { lang: 'cpp', code: `vector<vector<int>> g = {{4, 3, 2, -1}, {3, 2, 1, -1}, {1, 1, -1, -2}, {-1, -1, -2, -3}};
int R = g.size(), C = g[0].size(), r = R - 1, c = 0, count = 0;
while (r >= 0 && c < C) {
    if (g[r][c] < 0) { count += C - c; r--; }   // this cell and all to its right are negative
    else c++;                                    // non-negative: look further right
}
cout << count << "\\n";   // 8` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[][] g = { new[] { 4, 3, 2, -1 }, new[] { 3, 2, 1, -1 }, new[] { 1, 1, -1, -2 }, new[] { -1, -1, -2, -3 } };
        int R = g.Length, C = g[0].Length, r = R - 1, c = 0, count = 0;
        while (r >= 0 && c < C) {
            if (g[r][c] < 0) { count += C - c; r--; }   // this cell and all to its right are negative
            else c++;                                    // non-negative: look further right
        }
        Console.WriteLine(count);   // 8
    }
}`, run: true }
      ] } },
      { title: 'Count how many values are ≤ x (building block for k-th smallest)', html: `<p>Walk from the bottom-left: if g[r][c] ≤ x, the whole column segment from row 0 to r is ≤ x → add r + 1 and move right; else move up. For the 4 × 4 matrix above and x = 8: column 0 gives 3 (1, 2, 3), column 1 gives 3 (4, 5, 6), column 2 gives 2 (7, 8), column 3 gives 0 → <b>8</b> values ≤ 8. Binary-searching x over the value range with this O(R + C) count finds the k-th smallest in O((R + C) · log(range)).</p>` },
      { title: 'Fully sorted matrix (LeetCode 74)', html: `<p>[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target 3. Treat it as the flat list [1, 3, 5, 7, 10, …]: lo = 0, hi = 11, mid = 5 → (1, 1) = 11 &gt; 3 → hi = 4; mid = 2 → (0, 2) = 5 &gt; 3 → hi = 1; mid = 0 → 1 &lt; 3 → lo = 1; mid = 1 → (0, 1) = 3 → <b>found</b>. O(log 12) ≈ 4 steps.</p>` }
    ],
    deepDive: `<h4>Correctness: the eliminated region never contains the target</h4><p>Invariant: if the target exists, it is inside rows r..R−1 and columns 0..c. Initially true. If g[r][c] &gt; target, column c below row r is ≥ g[r][c] &gt; target (column sorted), and rows above r were already eliminated, so column c can go. If g[r][c] &lt; target, row r left of c is ≤ g[r][c] &lt; target (row sorted), so row r can go. When the region is empty, the target does not exist.</p>
      <h4>Is O(R + C) optimal?</h4><p>For a square N × N matrix, yes: the anti-diagonal cells (r + c = N − 1) can be arbitrary relative to each other while keeping rows and columns sorted, so any algorithm must look at Ω(N) of them in the worst case. Fancier divide-and-conquer approaches (quad-partitioning) do not beat O(N). For very skinny matrices (R ≪ C), binary-searching each of the R rows costs O(R log C), which can beat R + C — there is an O(R log(C/R)) algorithm for that case.</p>
      <h4>Other approaches you may be asked to compare</h4>${H.table(['approach', 'time', 'notes'], [['scan every cell', 'O(R·C)', 'ignores the sorting'], ['binary search each row', 'O(R log C)', 'uses only row order'], ['staircase', 'O(R + C)', 'uses both orders; simplest optimal'], ['flat binary search', 'O(log RC)', 'only if rows continue each other']])}
      <h4>Duplicates and "find all positions"</h4><p>Existence search works unchanged with duplicates. Counting or listing <b>every</b> occurrence needs more care: after a match, equal values can sit both to the left in the same row and below in the same column, so one staircase walk can miss some. Safe options: count with two staircase counts, <code>count(≤ target) − count(≤ target − 1)</code> (two O(R + C) walks), or binary-search the equal block in each row (O(R log C)). Always clarify whether the interviewer wants existence, a count, or positions.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know "Search a 2D Matrix II" well — but they frequently confuse it with the fully sorted LeetCode 74 version and apply flat binary search where it is <b>wrong</b>. Spotting which kind of sorted matrix you have is now the core skill.</p>
      <p><b>Use AI as a partner:</b> <code>Give me a matrix that is row- and column-sorted but NOT fully sorted, where flat binary search fails for some target</code>. Then check: [[1, 4], [2, 5]] flat is [1, 4, 2, 5] — not sorted, so searching 2 can fail.</p>
      <p><b>Where AI goes wrong:</b> starting at the top-left, using the row count for columns, or claiming O(log N·M) for the row-column sorted version.</p>
      <p><b>What you must still own:</b> the elimination invariant ("each step removes a row or a column"), the corner choice argument, and reading the problem statement carefully to pick staircase vs flat binary search.</p>`,
    problems: [{
      title: 'Search a Row- and Column-Sorted Matrix',
      level: 'Medium',
      tags: ['matrix', 'staircase', 'two pointers'],
      companies: ['Amazon', 'Microsoft', 'Google', 'Adobe'],
      statement: `<p>Given an <code>R × C</code> integer matrix where each row is sorted in ascending order from left to right and each column is sorted in ascending order from top to bottom, return <code>true</code> if <code>target</code> is present and <code>false</code> otherwise.</p>`,
      constraints: `1 ≤ R, C ≤ 300, −10<sup>9</sup> ≤ values, target ≤ 10<sup>9</sup>`,
      example: `${H.table(['', 'c0', 'c1', 'c2', 'c3', 'c4'], [['r0', '1', '4', '7', '11', H.c('y', '15')], ['r1', '2', '5', '8', '12', '19'], ['r2', '3', '6', H.c('g', '9'), '16', '22'], ['r3', '10', '13', '14', '17', '24'], ['r4', '18', '21', '23', '26', '30']])}
        <p>target = 5 → <b>true</b>; target = 20 → <b>false</b>. Path for 5: 15 (too big, ←), 11 (←), 7 (←), 4 (too small, ↓), ${H.c('g', '5 found')}.</p>`,
      brute: {
        why: `<p>Check all R × C cells: up to 9 × 10<sup>4</sup> comparisons per query — fine once, but it completely ignores the sorting, and with many queries or larger matrices (10<sup>4</sup> × 10<sup>4</sup> = 10<sup>8</sup>) it becomes too slow. The waste: one comparison against a sorted neighbourhood could rule out a whole row or column, yet we look at every cell.</p>`,
        code: { lang: 'java', code: `
          boolean bruteSearch(int[][] g, int target) {
              for (int[] row : g)
                  for (int v : row)
                      if (v == target) return true;   // looks at every single cell
              return false;
          }`, alt: [{ lang: 'python', code: String.raw`
def search_matrix(g, target):
    for row in g:
        for v in row:
            if v == target:
                return True      # looks at every single cell
    return False` }, { lang: 'js', code: String.raw`
function searchMatrix(g, target) {
  for (const row of g)
    for (const v of row)
      if (v === target) return true;   // looks at every single cell
  return false;
}` }, { lang: 'cpp', code: String.raw`
bool searchMatrix(vector<vector<int>>& g, int target) {
    for (auto& row : g)
        for (int v : row)
            if (v == target) return true;   // looks at every single cell
    return false;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public bool SearchMatrix(int[][] g, int target) {
        foreach (int[] row in g)
            foreach (int v in row)
                if (v == target) return true;   // looks at every single cell
        return false;
    }
}` }] }
      },
      mcq: {
        q: `<p>You stand at the top-right cell, value 15, target 5. What does "15 &gt; 5" let you conclude?</p>`,
        options: ['Every cell below 15 in its column is also &gt; 5, so drop the column', 'Every cell to the left is &gt; 5, so drop the row', 'The target is not in the matrix', 'Move down one row'],
        answer: 0,
        explain: `<p>Columns are sorted top → bottom, so everything below 15 is ≥ 15 &gt; 5. The column cannot contain 5 — move left. Cells to the left are smaller, so they may still contain 5.</p>`
      },
      hints: [
        `<p><b>Aha:</b> find a corner where one direction increases and the other decreases. The top-right (and bottom-left) corners have that property.</p>`,
        `<p>Two indices r = 0, c = C − 1. Loop while inside the matrix: equal → true; bigger → c−−; smaller → r++. No extra memory.</p>`,
        `<p><b>Traps:</b> loop condition is <code>r &lt; R && c ≥ 0</code>; columns count is the length of <code>g[0]</code>; do not use flat binary search (rows are not continuous).<br><b>Recipe:</b> r = 0, c = C−1; while r &lt; R and c ≥ 0: compare and move; return false after the loop.</p>`
      ],
      tests: { sig: 'int[][] int -> bool', fn: 'searchMatrix', cases: [
        [[[[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]], 5], true],
        [[[[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]], 20], false],
        [[[[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]], 1], true],
        [[[[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]], 30], true],
        [[[[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]], 0], false],
        [[[[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]], 31], false],
        [[[[5]], 5], true],
        [[[[5]], -5], false],
        [[[[1, 3, 5, 7, 9]], 7], true],
        [[[[-1000000000], [0], [1000000000]], 1000000000], true]
      ] },
      solution: {
        approach: `<p>Staircase search from the top-right corner: each comparison eliminates one full row or one full column, so at most R + C − 1 comparisons.</p>`,
        code: `
          class Solution {
              public boolean searchMatrix(int[][] g, int target) {
                  int r = 0, c = g[0].length - 1;        // top-right corner
                  while (r < g.length && c >= 0) {
                      if (g[r][c] == target) return true;
                      if (g[r][c] > target) c--;         // column c (from row r down) is too big
                      else r++;                          // row r (up to column c) is too small
                  }
                  return false;
              }

              public static void main(String[] args) {
                  int[][] g = {{1, 4, 7, 11, 15}, {2, 5, 8, 12, 19}, {3, 6, 9, 16, 22}, {10, 13, 14, 17, 24}, {18, 21, 23, 26, 30}};
                  Solution s = new Solution();
                  System.out.println(s.searchMatrix(g, 5) + " " + s.searchMatrix(g, 20)); // true false
              }
          }`,
        alt: [
          { lang: 'python', code: `def search_matrix(g, target):
    r, c = 0, len(g[0]) - 1          # start at the top-right corner
    while r < len(g) and c >= 0:
        v = g[r][c]
        if v == target:
            return True
        if v > target:
            c -= 1                   # this column is too big from here down
        else:
            r += 1                   # this row is too small up to here
    return False` },
          { lang: 'js', code: `function searchMatrix(g, target) {
  let r = 0, c = g[0].length - 1;    // start at the top-right corner
  while (r < g.length && c >= 0) {
    const v = g[r][c];
    if (v === target) return true;
    if (v > target) c--;             // this column is too big from here down
    else r++;                        // this row is too small up to here
  }
  return false;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    bool searchMatrix(vector<vector<int>>& g, int target) {
        int r = 0, c = (int)g[0].size() - 1;    // start at the top-right corner
        while (r < (int)g.size() && c >= 0) {
            if (g[r][c] == target) return true;
            if (g[r][c] > target) c--;          // this column is too big from here down
            else r++;                           // this row is too small up to here
        }
        return false;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public bool SearchMatrix(int[][] g, int target) {
        int r = 0, c = g[0].Length - 1;        // top-right corner
        while (r < g.Length && c >= 0) {
            if (g[r][c] == target) return true;
            if (g[r][c] > target) c--;         // column c (from row r down) is too big
            else r++;                          // row r (up to column c) is too small
        }
        return false;
    }
}` }
        ],
        dry: {
          head: ['step', '(r, c)', 'g[r][c]', 'vs 20', 'move'],
          rows: [
            ['1', '(0, 4)', '15', 'smaller', 'r = 1'],
            ['2', '(1, 4)', '19', 'smaller', 'r = 2'],
            ['3', '(2, 4)', '22', 'bigger', 'c = 3'],
            ['4', '(2, 3)', '16', 'smaller', 'r = 3'],
            ['5', '(3, 3)', '17', 'smaller', 'r = 4'],
            ['6', '(4, 3)', '26', 'bigger', 'c = 2'],
            ['7', '(4, 2)', '23', 'bigger', 'c = 1'],
            ['8', '(4, 1)', '21', 'bigger', 'c = 0'],
            ['9', '(4, 0)', '18', 'smaller', 'r = 5 → off → ' + H.c('r', 'false')]
          ]
        },
        complexity: `<p><b>Time O(R + C)</b>: every step removes a row or a column (at most R + C − 1 steps). <b>Space O(1)</b>.</p>`,
        followUps: ['Count how many elements are ≤ x.', 'Find the k-th smallest element.', 'Return the position of every occurrence when duplicates exist.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 11 — 2D prefix sums
  // =====================================================================
  topics.push({
    title: '2D Prefix Sums: Any Rectangle Sum in O(1)',
    analogy: `<p>A farmer's field is split into square plots, each with a known harvest. He keeps a notebook where, for every plot, he wrote the <b>total harvest of the big rectangle from the top-left corner of the field down to that plot</b>. Now someone asks for the harvest of any smaller rectangle in the middle. He takes the big rectangle that ends at its bottom-right corner, <b>cuts off the strip above</b>, <b>cuts off the strip on the left</b>, and since the top-left corner piece was cut off <b>twice</b>, he <b>adds it back once</b>. Four numbers from the notebook — done.</p>`,
    explain: `<p>Use a padded table <code>P</code> of size (R+1) × (C+1), where <code>P[i][j]</code> = sum of the rectangle from (0, 0) to (i−1, j−1). Row 0 and column 0 of P are all zeros ("sum of nothing"), which removes every edge case.</p>
      <h4>Building P (each cell from three neighbours)</h4>
      <p><code>P[i+1][j+1] = A[i][j] + P[i][j+1] + P[i+1][j] − P[i][j]</code></p>
      <p>"The block above" + "the block to the left" counts the top-left block <b>twice</b>, so subtract it once. This is inclusion–exclusion.</p>
      ${H.table(['A', 'c0', 'c1', 'c2'], [['r0', '3', '0', '1'], ['r1', '5', '6', '3'], ['r2', '1', '2', '0']])}
      ${H.table(['P', '0', '1', '2', '3'], [['0', '0', '0', '0', '0'], ['1', '0', '3', '3', '4'], ['2', '0', '8', H.c('y', '14'), '18'], ['3', '0', '9', '17', H.c('g', '21')]])}
      <p>Check P[2][2] = A[1][1] + P[1][2] + P[2][1] − P[1][1] = 6 + 3 + 8 − 3 = <b>14</b> = 3 + 0 + 5 + 6 ✔.</p>
      <h4>Querying any rectangle (r1, c1) .. (r2, c2)</h4>
      <p><code>sum = P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]</code></p>
      <p>Big rectangle, minus the strip above, minus the strip on the left, plus the corner that was removed twice. Query rows 1..2, cols 1..2 (cells 6, 3, 2, 0):</p>
      ${H.table(['term', 'meaning', 'value'], [['P[3][3]', 'whole block (0,0)..(2,2)', '21'], ['− P[1][3]', 'strip above (row 0)', '− 4'], ['− P[3][1]', 'strip on the left (col 0)', '− 9'], ['+ P[1][1]', 'corner (0,0) removed twice', '+ 3'], ['= ', '', H.c('p', '<b>11</b>')]])}
      <p>Check: 6 + 3 + 2 + 0 = 11 ✔. Building costs O(R·C) once; each query is <b>O(1)</b> — instead of O(R·C) per query by looping.</p>`,
    clues: [
      '"Sum of elements inside the rectangle (row1, col1) to (row2, col2)" + "many queries" → 2D prefix sums.',
      '"Matrix does not change between queries" (immutable) → precompute P once; if it changes, use a 2D Fenwick tree.',
      '"For each cell, the sum of the K × K block around it" (Matrix Block Sum) → one 2D prefix table, clamp the borders.',
      '"Largest square / rectangle with sum ≤ threshold" or "count submatrices with property X" → prefix table + search over sizes.',
      '"Add v to every cell of a sub-rectangle, many times, then read the matrix" → 2D difference array (the reverse trick).'
    ],
    code: [{ lang: 'java', code: `
      class NumMatrix {
          private final long[][] P;                   // padded: P[i][j] = sum of A[0..i-1][0..j-1]

          NumMatrix(int[][] A) {
              int R = A.length, C = A[0].length;
              P = new long[R + 1][C + 1];             // row 0 and column 0 stay 0
              for (int i = 0; i < R; i++)
                  for (int j = 0; j < C; j++)
                      P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
          }

          long sumRegion(int r1, int c1, int r2, int c2) {   // inclusive corners
              return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
          }
      }`, alt: [
        { lang: 'python', code: `class NumMatrix:
    def __init__(self, A):
        R, C = len(A), len(A[0])
        # padded: P[i][j] = sum of A[0..i-1][0..j-1]; row 0 and column 0 stay 0
        self.P = P = [[0] * (C + 1) for _ in range(R + 1)]
        for i in range(R):
            for j in range(C):
                P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]

    def sum_region(self, r1, c1, r2, c2):   # inclusive corners
        P = self.P
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]` },
        { lang: 'js', code: `class NumMatrix {
  constructor(A) {
    const R = A.length, C = A[0].length;
    // padded: P[i][j] = sum of A[0..i-1][0..j-1]; row 0 and column 0 stay 0
    this.P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
    const P = this.P;
    for (let i = 0; i < R; i++)
      for (let j = 0; j < C; j++) P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
  }

  sumRegion(r1, c1, r2, c2) {   // inclusive corners
    const P = this.P;
    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
  }
}` },
        { lang: 'cpp', code: `class NumMatrix {
    vector<vector<long long>> P;   // padded: P[i][j] = sum of A[0..i-1][0..j-1]
public:
    NumMatrix(const vector<vector<int>>& A) : P(A.size() + 1, vector<long long>(A[0].size() + 1, 0)) {
        for (size_t i = 0; i < A.size(); i++)
            for (size_t j = 0; j < A[0].size(); j++)
                P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
    }

    long long sumRegion(int r1, int c1, int r2, int c2) const {   // inclusive corners
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
};` }, { lang: 'csharp', code: String.raw`
public class NumMatrix {
    private readonly long[][] P;                // padded: P[i][j] = sum of A[0..i-1][0..j-1]

    public NumMatrix(int[][] A) {
        int R = A.Length, C = A[0].Length;
        P = new long[R + 1][];                  // row 0 and column 0 stay 0
        for (int i = 0; i <= R; i++) P[i] = new long[C + 1];
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++)
                P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
    }

    public long SumRegion(int r1, int c1, int r2, int c2) {   // inclusive corners
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
}` }
      ] }, {
      lang: 'python', run: true, title: 'Python: build and query (runnable)', code: `def build(A):
    R, C = len(A), len(A[0])
    P = [[0] * (C + 1) for _ in range(R + 1)]
    for i in range(R):
        for j in range(C):
            P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
    return P

def query(P, r1, c1, r2, c2):
    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]

A = [[3, 0, 1], [5, 6, 3], [1, 2, 0]]
P = build(A)
print(P)
print(query(P, 1, 1, 2, 2))   # 11
print(query(P, 0, 0, 2, 2))   # 21` }],
    codeTitle: ['Padded 2D prefix sum class', 'Same in Python'],
    viz: {
      title: 'Build the 2D prefix table, then answer a rectangle query',
      input: '3 0 1; 5 6 3; 1 2 0 | 1 1 2 2',
      inputLabel: 'matrix rows separated by ";" | r1 c1 r2 c2',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).split('|');
        if (s.length !== 2) throw new Error('Format: matrix | r1 c1 r2 c2, e.g. 1 2; 3 4 | 0 0 1 1');
        var A = parseMatrix(s[0], 5, 5);
        var q = nums(s[1], 4, 4, 'four numbers r1 c1 r2 c2 after the "|"');
        var R = A.length, C = A[0].length, r1 = q[0], c1 = q[1], r2 = q[2], c2 = q[3];
        if (r1 < 0 || c1 < 0 || r2 >= R || c2 >= C || r1 > r2 || c1 > c2) throw new Error('Need 0 ≤ r1 ≤ r2 < ' + R + ' and 0 ≤ c1 ≤ c2 < ' + C + '.');
        var P = [], i, j, frames = [];
        for (i = 0; i <= R; i++) { P.push([]); for (j = 0; j <= C; j++) P[i].push(i === 0 || j === 0 ? 0 : ''); }
        var ph = heads(R + 1), pc = heads(C + 1);
        frames.push({ narr: 'P has one extra row and column of zeros (sum of nothing). P[i][j] will hold the sum of the block from (0, 0) to (i−1, j−1) of A.', parts: [
          { type: 'grid', label: 'A', rows: copyGrid(A), rowHead: heads(R), colHead: heads(C) },
          { type: 'grid', label: 'P (padded)', rows: copyGrid(P), rowHead: ph, colHead: pc }
        ] });
        for (i = 0; i < R; i++) {
          for (j = 0; j < C; j++) {
            P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
            var hl = {}; hl[(i + 1) + ',' + (j + 1)] = 'ok'; hl[i + ',' + (j + 1)] = 'win'; hl[(i + 1) + ',' + j] = 'win'; hl[i + ',' + j] = 'bad';
            var ah = {}; for (var a = 0; a <= i; a++) for (var b = 0; b <= j; b++) ah[a + ',' + b] = 'win'; ah[i + ',' + j] = 'cur';
            frames.push({ narr: 'P[' + (i + 1) + '][' + (j + 1) + '] = A[' + i + '][' + j + '] (' + A[i][j] + ') + above (' + P[i][j + 1] + ') + left (' + P[i + 1][j] + ') − overlap counted twice (' + P[i][j] + ') = <b>' + P[i + 1][j + 1] + '</b>. It equals the sum of the blue block in A.', parts: [
              { type: 'grid', label: 'A (blue = block covered by this P cell)', rows: copyGrid(A), rowHead: heads(R), colHead: heads(C), hl: ah },
              { type: 'grid', label: 'P (blue = added, red = subtracted)', rows: copyGrid(P), rowHead: ph, colHead: pc, hl: hl }
            ] });
          }
        }
        var big = P[r2 + 1][c2 + 1], up = P[r1][c2 + 1], lf = P[r2 + 1][c1], cor = P[r1][c1], ans = big - up - lf + cor;
        var qa = {}; for (i = r1; i <= r2; i++) for (j = c1; j <= c2; j++) qa[i + ',' + j] = 'sel';
        frames.push({ narr: 'Query: sum of the purple rectangle rows ' + r1 + '..' + r2 + ', cols ' + c1 + '..' + c2 + '. We will use only 4 cells of P.', parts: [
          { type: 'grid', label: 'A', rows: copyGrid(A), rowHead: heads(R), colHead: heads(C), hl: qa },
          { type: 'grid', label: 'P (complete)', rows: copyGrid(P), rowHead: ph, colHead: pc }
        ] });
        var h1 = {}; h1[(r2 + 1) + ',' + (c2 + 1)] = 'ok';
        frames.push({ narr: 'Step 1: take the big block from (0, 0) to (' + r2 + ', ' + c2 + '): P[' + (r2 + 1) + '][' + (c2 + 1) + '] = <b>' + big + '</b>.', parts: [
          { type: 'grid', label: 'P', rows: copyGrid(P), rowHead: ph, colHead: pc, hl: h1 },
          { type: 'vars', vals: { big: big } }
        ] });
        var h2 = {}; h2[(r2 + 1) + ',' + (c2 + 1)] = 'ok'; h2[r1 + ',' + (c2 + 1)] = 'bad'; h2[(r2 + 1) + ',' + c1] = 'bad';
        frames.push({ narr: 'Step 2: cut off the strip <b>above</b> row ' + r1 + ' (P[' + r1 + '][' + (c2 + 1) + '] = ' + up + ') and the strip <b>left</b> of column ' + c1 + ' (P[' + (r2 + 1) + '][' + c1 + '] = ' + lf + ').', parts: [
          { type: 'grid', label: 'P', rows: copyGrid(P), rowHead: ph, colHead: pc, hl: h2 },
          { type: 'vars', vals: { big: big, 'above strip': up, 'left strip': lf } }
        ] });
        var h3 = {}; h3[(r2 + 1) + ',' + (c2 + 1)] = 'ok'; h3[r1 + ',' + (c2 + 1)] = 'bad'; h3[(r2 + 1) + ',' + c1] = 'bad'; h3[r1 + ',' + c1] = 'ok';
        frames.push({ narr: 'Step 3: the top-left corner block (P[' + r1 + '][' + c1 + '] = ' + cor + ') was inside <b>both</b> strips, so it was subtracted twice. Add it back once. Answer = ' + big + ' − ' + up + ' − ' + lf + ' + ' + cor + ' = <b>' + ans + '</b>.', parts: [
          { type: 'grid', label: 'P', rows: copyGrid(P), rowHead: ph, colHead: pc, hl: h3 },
          { type: 'grid', label: 'A (query rectangle)', rows: copyGrid(A), rowHead: heads(R), colHead: heads(C), hl: qa },
          { type: 'vars', label: 'result', vals: { sum: ans }, hl: { sum: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Rectangle touching the top-left corner', html: `<p>Query (0, 0)..(1, 1) on the A above: P[2][2] − P[0][2] − P[2][0] + P[0][0] = 14 − 0 − 0 + 0 = <b>14</b> (3 + 0 + 5 + 6). The zero padding makes the strips vanish automatically — no if-statements for edges.</p>` },
      { title: 'Count 1s in a sub-rectangle of a binary grid', html: `<p>Seats grid (1 = booked): [[1, 0, 1], [1, 1, 0], [0, 1, 1]]. P built the same way; booked seats in rows 1..2, cols 1..2 = P[3][3] − P[1][3] − P[3][1] + P[1][1] = 6 − 2 − 2 + 1 = <b>3</b> (1, 0, 1, 1). Counting is summing a 0/1 grid.</p>`, code: { lang: 'java', code: `int[][] A = {{1, 0, 1}, {1, 1, 0}, {0, 1, 1}};
int R = A.length, C = A[0].length;
int[][] P = new int[R + 1][C + 1];
for (int i = 0; i < R; i++)
    for (int j = 0; j < C; j++)
        P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
int r1 = 1, c1 = 1, r2 = 2, c2 = 2;
System.out.println(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);   // 3`, alt: [
        { lang: 'python', run: true, code: `A = [[1, 0, 1], [1, 1, 0], [0, 1, 1]]
R, C = len(A), len(A[0])
P = [[0] * (C + 1) for _ in range(R + 1)]
for i in range(R):
    for j in range(C):
        P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
r1, c1, r2, c2 = 1, 1, 2, 2
print(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1])   # 3` },
        { lang: 'js', run: true, code: `const A = [[1, 0, 1], [1, 1, 0], [0, 1, 1]];
const R = A.length, C = A[0].length;
const P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
for (let i = 0; i < R; i++)
  for (let j = 0; j < C; j++) P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
const r1 = 1, c1 = 1, r2 = 2, c2 = 2;
console.log(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);   // 3` },
        { lang: 'cpp', code: `vector<vector<int>> A = {{1, 0, 1}, {1, 1, 0}, {0, 1, 1}};
int R = A.size(), C = A[0].size();
vector<vector<int>> P(R + 1, vector<int>(C + 1, 0));
for (int i = 0; i < R; i++)
    for (int j = 0; j < C; j++) P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
int r1 = 1, c1 = 1, r2 = 2, c2 = 2;
cout << P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1] << "\\n";   // 3` }, { lang: 'csharp', code: String.raw`
using System;

class Program {
    static void Main() {
        int[][] A = { new[] { 1, 0, 1 }, new[] { 1, 1, 0 }, new[] { 0, 1, 1 } };
        int R = A.Length, C = A[0].Length;
        int[,] P = new int[R + 1, C + 1];                 // rectangular array: all zeros
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++)
                P[i + 1, j + 1] = A[i][j] + P[i, j + 1] + P[i + 1, j] - P[i, j];
        int r1 = 1, c1 = 1, r2 = 2, c2 = 2;
        Console.WriteLine(P[r2 + 1, c2 + 1] - P[r1, c2 + 1] - P[r2 + 1, c1] + P[r1, c1]);   // 3
    }
}`, run: true }
      ] } },
      { title: 'Best K × K square', html: `<p>Find the K × K block with the largest sum. With P, every square's sum is O(1), so trying all (R − K + 1)(C − K + 1) top-left corners costs O(R·C) total instead of O(R·C·K<sup>2</sup>). For A = [[1, 2, 3], [4, 5, 6], [7, 8, 9]] and K = 2 the best block is bottom-right: 5 + 6 + 8 + 9 = <b>28</b>.</p>` },
      { title: '2D difference array: many rectangle updates', html: `<p>To add v to every cell of (r1, c1)..(r2, c2): <code>D[r1][c1] += v; D[r1][c2+1] −= v; D[r2+1][c1] −= v; D[r2+1][c2+1] += v</code>. After all updates, a 2D prefix sum over D gives the final grid. Adding 1 to (0, 0)..(1, 1) on a 3 × 3 zero grid gives D corners +1, −1, −1, +1 → prefix → [[1, 1, 0], [1, 1, 0], [0, 0, 0]]. Used for "stamping" problems and range painting (LeetCode 2536).</p>` }
    ],
    deepDive: `<h4>Inclusion–exclusion is the key idea</h4><p>Both the build and the query use the same picture: two overlapping rectangles share a corner block, so adding both counts it twice. The pattern generalises to 3D (a cube query uses 8 corners with alternating signs) and to any dimension d with 2<sup>d</sup> terms.</p>
      <h4>Memory and types</h4><p>R = C = 1000 → P has about 10<sup>6</sup> cells; as <code>long</code> that is 8 MB — fine. Values up to 10<sup>9</sup> summed over 10<sup>6</sup> cells reach 10<sup>15</sup>, so <code>long</code> is required. You can also overwrite A in place if allowed, but the padded copy keeps queries clean.</p>
      <h4>Max-sum submatrix (no size limit)</h4><p>Prefix sums alone give O(R<sup>2</sup>C<sup>2</sup>) by trying every rectangle. Better: fix a pair of rows (top, bottom), compress each column between them into one number using column prefix sums, then run 1D Kadane over those C numbers → <b>O(R<sup>2</sup>·C)</b>. This combination (prefix sums + Kadane) is a favourite hard interview question.</p>
      <h4>Count submatrices with sum = target</h4><p>Same row-pair compression, then "count subarrays with sum k" on the compressed row using a hash map of prefix sums (Hashing module) → O(R<sup>2</sup>·C).</p>
      <h4>When values change</h4><p>One cell update can change O(R·C) prefix cells. For mixed updates and queries use a 2D Fenwick tree (O(log R · log C) per operation). In image processing, the static table is called an <b>integral image</b>; the Viola–Jones face detector used it to compute rectangle features in O(1), which made real-time face detection practical in the early 2000s.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes the build loop easily, but index conventions (padded vs not, inclusive vs exclusive corners) are where generated code silently breaks. You are the reviewer: check one query by hand.</p>
      <p><b>Use AI as a partner:</b> <code>Generate a random 5×6 matrix and 20 random rectangle queries with brute-force answers so I can test my sumRegion</code>. Also ask it to draw the "big − top − left + corner" picture in ASCII to explain it to a teammate.</p>
      <p><b>Where AI goes wrong:</b> forgetting the <code>+ P[r1][c1]</code> term, mixing P[r2][c2] (unpadded) with padded indices, using <code>int</code> for sums, or proposing 2D prefix sums for a matrix that is updated between queries.</p>
      <p><b>What you must still own:</b> drawing the four regions, choosing one index convention, and knowing the follow-ups (Kadane over row pairs, difference arrays, Fenwick for updates).</p>`,
    problems: [{
      title: 'Range Sum Query 2D (Immutable)',
      level: 'Medium',
      tags: ['prefix sum', 'matrix', '2D', 'design'],
      companies: ['Google', 'Meta', 'Amazon', 'Uber'],
      statement: `<p>Design a class that takes an <code>R × C</code> integer matrix once, then answers many queries <code>sumRegion(r1, c1, r2, c2)</code>: the sum of all elements inside the rectangle with top-left corner (r1, c1) and bottom-right corner (r2, c2), inclusive. Each query must run in <b>O(1)</b>.</p>`,
      constraints: `1 ≤ R, C ≤ 200, −10<sup>4</sup> ≤ A[i][j] ≤ 10<sup>4</sup>, up to 10<sup>4</sup> queries, 0 ≤ r1 ≤ r2 &lt; R, 0 ≤ c1 ≤ c2 &lt; C`,
      example: `${H.table(['A', 'c0', 'c1', 'c2'], [['r0', '3', '0', '1'], ['r1', '5', H.c('p', '6'), H.c('p', '3')], ['r2', '1', H.c('p', '2'), H.c('p', '0')]])}
        <p><code>sumRegion(1, 1, 2, 2)</code> → ${H.c('p', '<b>11</b>')} (6 + 3 + 2 + 0). <code>sumRegion(0, 0, 0, 2)</code> → <b>4</b> (3 + 0 + 1). <code>sumRegion(0, 0, 2, 2)</code> → <b>21</b>.</p>`,
      brute: {
        why: `<p>Loop over the rectangle for every query: up to 200 × 200 = 4 × 10<sup>4</sup> cells × 10<sup>4</sup> queries = 4 × 10<sup>8</sup> operations — too slow. The waste: overlapping queries re-add the same cells again and again.</p>`,
        code: { lang: 'java', code: `
          class BruteMatrix {
              private final int[][] A;
              BruteMatrix(int[][] A) { this.A = A; }
              long sumRegion(int r1, int c1, int r2, int c2) {
                  long s = 0;
                  for (int i = r1; i <= r2; i++)
                      for (int j = c1; j <= c2; j++)
                          s += A[i][j];                 // O(area) per query
                  return s;
              }
          }`, alt: [{ lang: 'python', code: String.raw`
class NumMatrix:
    def __init__(self, A):
        self.A = A

    def sumRegion(self, r1, c1, r2, c2):
        s = 0
        for i in range(r1, r2 + 1):
            for j in range(c1, c2 + 1):
                s += self.A[i][j]        # O(area) per query
        return s` }, { lang: 'js', code: String.raw`
class NumMatrix {
  constructor(A) { this.A = A; }
  sumRegion(r1, c1, r2, c2) {
    let s = 0;
    for (let i = r1; i <= r2; i++)
      for (let j = c1; j <= c2; j++)
        s += this.A[i][j];               // O(area) per query
    return s;
  }
}` }, { lang: 'cpp', code: String.raw`
class NumMatrix {
    vector<vector<int>> A;
public:
    NumMatrix(vector<vector<int>>& A) : A(A) {}
    long long sumRegion(int r1, int c1, int r2, int c2) {
        long long s = 0;
        for (int i = r1; i <= r2; i++)
            for (int j = c1; j <= c2; j++)
                s += A[i][j];            // O(area) per query
        return s;
    }
};` }, { lang: 'csharp', code: String.raw`
public class BruteMatrix {
    private readonly int[][] A;
    public BruteMatrix(int[][] A) { this.A = A; }
    public long SumRegion(int r1, int c1, int r2, int c2) {
        long s = 0;
        for (int i = r1; i <= r2; i++)
            for (int j = c1; j <= c2; j++)
                s += A[i][j];                 // O(area) per query
        return s;
    }
}` }] }
      },
      mcq: {
        q: `<p>In <code>P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]</code>, why is the last term <b>added</b>?</p>`,
        options: ['The top-left corner block was subtracted twice (once in each strip)', 'To include the cell (r1, c1) itself', 'To handle negative numbers', 'It is a padding correction only when r1 = 0'],
        answer: 0,
        explain: `<p>The strip above and the strip on the left overlap in the block (0, 0)..(r1−1, c1−1). Subtracting both strips removes it twice, so we add it back once — inclusion–exclusion.</p>`
      },
      hints: [
        `<p><b>Aha:</b> any rectangle = big rectangle from (0,0) − top strip − left strip + corner. If you know every "from (0,0)" sum, a query is 4 lookups.</p>`,
        `<p>Precompute a padded <code>long[R+1][C+1]</code> table with <code>P[i+1][j+1] = A[i][j] + P[i][j+1] + P[i+1][j] − P[i][j]</code> in the constructor.</p>`,
        `<p><b>Traps:</b> padded indices are shifted by +1 — write the query formula once and test it on a 1 × 1 rectangle. Use <code>long</code>. Rectangles on row 0 / col 0 need no special case thanks to padding.<br><b>Recipe:</b> build P in O(R·C); query = P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1].</p>`
      ],
      tests: { cls: 'NumMatrix', sigs: { NumMatrix: 'int[][]', sumRegion: 'int int int int -> long' }, cases: [
        { ops: ['NumMatrix', 'sumRegion', 'sumRegion', 'sumRegion'], args: [[[[3, 0, 1], [5, 6, 3], [1, 2, 0]]], [1, 1, 2, 2], [0, 0, 0, 2], [0, 0, 2, 2]], out: [null, 11, 4, 21] },
        { ops: ['NumMatrix', 'sumRegion'], args: [[[[-7]]], [0, 0, 0, 0]], out: [null, -7] },
        { ops: ['NumMatrix', 'sumRegion', 'sumRegion', 'sumRegion', 'sumRegion', 'sumRegion'], args: [[[[3, 0, 1, 4, 2], [5, 6, 3, 2, 1], [1, 2, 0, 1, 5], [4, 1, 0, 1, 7], [1, 0, 3, 0, 5]]], [2, 1, 4, 3], [1, 1, 2, 2], [1, 2, 2, 4], [0, 0, 4, 4], [4, 4, 4, 4]], out: [null, 8, 11, 12, 58, 5] },
        { ops: ['NumMatrix', 'sumRegion', 'sumRegion'], args: [[[[10000, 10000, 10000, 10000], [10000, 10000, 10000, 10000], [10000, 10000, 10000, 10000], [10000, 10000, 10000, 10000]]], [0, 0, 3, 3], [1, 1, 2, 2]], out: [null, 160000, 40000] },
        { ops: ['NumMatrix', 'sumRegion', 'sumRegion', 'sumRegion'], args: [[[[-10000, 10000], [10000, -10000]]], [0, 0, 1, 1], [0, 0, 0, 1], [0, 1, 1, 1]], out: [null, 0, 0, 0] },
        { ops: ['NumMatrix', 'sumRegion', 'sumRegion'], args: [[[[1, 2, 3, 4]]], [0, 1, 0, 2], [0, 0, 0, 3]], out: [null, 5, 10] },
        { ops: ['NumMatrix', 'sumRegion', 'sumRegion'], args: [[[[1], [2], [3]]], [1, 0, 2, 0], [0, 0, 0, 0]], out: [null, 5, 1] }
      ] },
      solution: {
        approach: `<p>Padded 2D prefix sums built once with inclusion–exclusion; each query is four lookups and three additions/subtractions.</p>`,
        code: `
          class NumMatrix {
              private final long[][] P;

              public NumMatrix(int[][] A) {
                  int R = A.length, C = A[0].length;
                  P = new long[R + 1][C + 1];
                  for (int i = 0; i < R; i++) {
                      for (int j = 0; j < C; j++) {
                          // this cell + block above + block left - overlap counted twice
                          P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
                      }
                  }
              }

              public long sumRegion(int r1, int c1, int r2, int c2) {
                  return P[r2 + 1][c2 + 1]     // whole block from (0,0)
                       - P[r1][c2 + 1]         // minus rows above r1
                       - P[r2 + 1][c1]         // minus columns left of c1
                       + P[r1][c1];            // plus the corner removed twice
              }

              public static void main(String[] args) {
                  NumMatrix m = new NumMatrix(new int[][]{{3, 0, 1}, {5, 6, 3}, {1, 2, 0}});
                  System.out.println(m.sumRegion(1, 1, 2, 2) + " " + m.sumRegion(0, 0, 0, 2) + " " + m.sumRegion(0, 0, 2, 2)); // 11 4 21
              }
          }`,
        alt: [
          { lang: 'python', code: `class NumMatrix:
    def __init__(self, A):
        R, C = len(A), len(A[0])
        P = [[0] * (C + 1) for _ in range(R + 1)]
        for i in range(R):
            for j in range(C):
                # this cell + block above + block left - overlap counted twice
                P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
        self.P = P

    def sumRegion(self, r1, c1, r2, c2):
        P = self.P
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]` },
          { lang: 'js', code: `class NumMatrix {
  constructor(A) {
    const R = A.length, C = A[0].length;
    this.P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
    for (let i = 0; i < R; i++)
      for (let j = 0; j < C; j++)
        // this cell + block above + block left - overlap counted twice
        this.P[i + 1][j + 1] = A[i][j] + this.P[i][j + 1] + this.P[i + 1][j] - this.P[i][j];
  }

  sumRegion(r1, c1, r2, c2) {
    const P = this.P;
    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
  }
}` },
          { lang: 'cpp', code: `class NumMatrix {
    vector<vector<long long>> P;
public:
    NumMatrix(vector<vector<int>>& A) : P(A.size() + 1, vector<long long>(A[0].size() + 1, 0)) {
        for (size_t i = 0; i < A.size(); i++)
            for (size_t j = 0; j < A[0].size(); j++)
                // this cell + block above + block left - overlap counted twice
                P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
    }

    long long sumRegion(int r1, int c1, int r2, int c2) {
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
};` }, { lang: 'csharp', code: String.raw`
public class NumMatrix {
    private readonly long[][] P;

    public NumMatrix(int[][] A) {
        int R = A.Length, C = A[0].Length;
        P = new long[R + 1][];
        for (int i = 0; i <= R; i++) P[i] = new long[C + 1];
        for (int i = 0; i < R; i++) {
            for (int j = 0; j < C; j++) {
                // this cell + block above + block left - overlap counted twice
                P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
            }
        }
    }

    public long SumRegion(int r1, int c1, int r2, int c2) {
        return P[r2 + 1][c2 + 1]     // whole block from (0,0)
             - P[r1][c2 + 1]         // minus rows above r1
             - P[r2 + 1][c1]         // minus columns left of c1
             + P[r1][c1];            // plus the corner removed twice
    }
}` }
        ],
        dry: {
          head: ['query', 'P[r2+1][c2+1]', '− P[r1][c2+1]', '− P[r2+1][c1]', '+ P[r1][c1]', 'answer'],
          rows: [
            ['(1,1,2,2)', '21', '4', '9', '3', H.c('p', '11')],
            ['(0,0,0,2)', '4', '0', '0', '0', H.c('p', '4')],
            ['(0,0,2,2)', '21', '0', '0', '0', H.c('p', '21')],
            ['(2,0,2,1)', '17', '14', '0', '0', H.c('p', '3')]
          ]
        },
        complexity: `<p><b>Build O(R·C)</b> time and space; <b>each query O(1)</b>. Total for Q queries: O(R·C + Q) instead of O(R·C·Q).</p>`,
        followUps: ['Support point updates too (2D Fenwick tree).', 'Return the maximum-sum K × K square.', 'Count submatrices whose sum equals a target.']
      }
    }]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Running Sum of 1D Array',
    level: 'Easy',
    tags: ['prefix sum', 'array'],
    companies: ['Amazon', 'Adobe', 'Apple'],
    statement: `<p>Given an array <code>nums</code>, return an array <code>runningSum</code> where <code>runningSum[i] = nums[0] + nums[1] + … + nums[i]</code>.</p>`,
    constraints: `1 ≤ N ≤ 1000, −10<sup>6</sup> ≤ nums[i] ≤ 10<sup>6</sup>`,
    example: `${H.arr([1, 2, 3, 4], { label: 'nums' })}${H.arr([1, 3, 6, 10], { label: 'output', hl: { 3: 'g' } })}<p>Each output value is the previous output plus one new number: 1, 1+2 = 3, 3+3 = 6, 6+4 = ${H.c('g', '10')}.</p>`,
    brute: {
      why: `<p>For each i, add nums[0..i] from scratch: 1 + 2 + … + N = O(N<sup>2</sup>) additions. The waste: runningSum[i] already contains everything except nums[i], yet we re-add it.</p>`,
      code: { lang: 'java', code: `
        int[] bruteRunningSum(int[] nums) {
            int[] out = new int[nums.length];
            for (int i = 0; i < nums.length; i++) {
                int s = 0;
                for (int j = 0; j <= i; j++) s += nums[j];   // re-adds the whole prefix
                out[i] = s;
            }
            return out;
        }`, alt: [{ lang: 'python', code: String.raw`
def running_sum(nums):
    out = []
    for i in range(len(nums)):
        s = 0
        for j in range(i + 1):
            s += nums[j]            # re-adds the whole prefix
        out.append(s)
    return out` }, { lang: 'js', code: String.raw`
function runningSum(nums) {
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    let s = 0;
    for (let j = 0; j <= i; j++) s += nums[j];   // re-adds the whole prefix
    out.push(s);
  }
  return out;
}` }, { lang: 'cpp', code: String.raw`
vector<int> runningSum(vector<int>& nums) {
    vector<int> out(nums.size());
    for (int i = 0; i < (int) nums.size(); i++) {
        int s = 0;
        for (int j = 0; j <= i; j++) s += nums[j];   // re-adds the whole prefix
        out[i] = s;
    }
    return out;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] RunningSum(int[] nums) {
        int[] result = new int[nums.Length];
        for (int i = 0; i < nums.Length; i++) {
            int s = 0;
            for (int j = 0; j <= i; j++) s += nums[j];   // re-adds the whole prefix
            result[i] = s;
        }
        return result;
    }
}` }] }
    },
    mcq: { q: `<p>runningSum[5] = 40 and nums[6] = −3. What is runningSum[6]?</p>`, options: ['37', '43', '−3', '40'], answer: 0, explain: `<p>runningSum[6] = runningSum[5] + nums[6] = 40 + (−3) = 37. One addition per index.</p>` },
    hints: [
      `<p><b>Aha:</b> runningSum[i] = runningSum[i−1] + nums[i]. The previous answer is already the sum of everything before.</p>`,
      `<p>One loop, one carried total. You can even write the answer back into <code>nums</code> itself for O(1) extra space.</p>`,
      `<p><b>Traps:</b> start the loop at i = 1 (or carry a total starting at 0). Sum stays within int here (10<sup>3</sup> × 10<sup>6</sup> = 10<sup>9</sup>), but use long in general.<br><b>Recipe:</b> for i in 1..N−1: nums[i] += nums[i−1]; return nums.</p>`
    ],
    tests: { sig: 'int[] -> int[]', fn: 'runningSum', cases: [
        [[[1, 2, 3, 4]], [1, 3, 6, 10]],
        [[[1, 1, 1, 1, 1]], [1, 2, 3, 4, 5]],
        [[[3, 1, 2, 10, 1]], [3, 4, 6, 16, 17]],
        [[[5]], [5]],
        [[[-1, -2, -3]], [-1, -3, -6]],
        [[[1000000, 1000000, 1000000, 1000000, 1000000]], [1000000, 2000000, 3000000, 4000000, 5000000]],
        [[[0, -1000000, 1000000]], [0, -1000000, 0]]
      ] },
    solution: {
      approach: `<p>Carry forward the running total; each index adds one number to the previous answer.</p>`,
      code: `
        class Solution {
            public int[] runningSum(int[] nums) {
                for (int i = 1; i < nums.length; i++) {
                    nums[i] += nums[i - 1];       // previous running sum + this number
                }
                return nums;                      // in place: O(1) extra space
            }

            public static void main(String[] args) {
                System.out.println(Arrays.toString(new Solution().runningSum(new int[]{1, 2, 3, 4}))); // [1, 3, 6, 10]
            }
        }`,
      alt: [
        { lang: 'python', code: `from itertools import accumulate

def running_sum(nums):
    return list(accumulate(nums))` },
        { lang: 'js', code: `function runningSum(nums) {
  for (let i = 1; i < nums.length; i++) nums[i] += nums[i - 1];   // in place
  return nums;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> runningSum(vector<int>& nums) {
        partial_sum(nums.begin(), nums.end(), nums.begin());   // in place running total
        return nums;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] RunningSum(int[] nums) {
        for (int i = 1; i < nums.Length; i++) {
            nums[i] += nums[i - 1];       // previous running sum + this number
        }
        return nums;                      // in place: O(1) extra space
    }
}` }
      ],
      dry: { head: ['i', 'nums[i] before', 'add nums[i−1]', 'nums[i] after'], rows: [['1', '2', '1', '3'], ['2', '3', '3', '6'], ['3', '4', '6', '10']] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(1)</b> extra (in place).</p>`,
      followUps: ['Answer range-sum queries using this array.', 'Running XOR instead of running sum.']
    }
  });

  practice.push({
    title: 'Best Time to Buy and Sell Stock',
    level: 'Easy',
    tags: ['carry forward', 'array', 'running min'],
    companies: ['Amazon', 'Meta', 'Microsoft', 'Bloomberg', 'Goldman Sachs'],
    statement: `<p><code>prices[i]</code> is a stock's price on day i. Choose one day to buy and a <b>later</b> day to sell to maximise profit. Return the maximum profit, or 0 if no profit is possible.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ prices[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([7, 1, 5, 3, 6, 4], { label: 'prices', hl: { 1: 'g', 4: 'p' } })}<p>Output ${H.c('p', '<b>5</b>')}: buy at ${H.c('g', '1')} (day 1), sell at ${H.c('p', '6')} (day 4). Selling at 7 is not allowed because day 0 comes before the buy. For [7, 6, 4, 3, 1] prices only fall → <b>0</b>.</p>`,
    brute: {
      why: `<p>Try every (buy, sell) pair: N(N−1)/2 ≈ 5 × 10<sup>9</sup> pairs → TLE. The waste: for each sell day only the <b>cheapest earlier price</b> matters, yet we compare against all of them.</p>`,
      code: { lang: 'java', code: `
        int bruteProfit(int[] prices) {
            int best = 0;
            for (int i = 0; i < prices.length; i++)
                for (int j = i + 1; j < prices.length; j++)
                    best = Math.max(best, prices[j] - prices[i]);   // buy i, sell j
            return best;
        }`, alt: [{ lang: 'python', code: String.raw`
def max_profit(prices):
    best = 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            best = max(best, prices[j] - prices[i])    # buy i, sell j
    return best` }, { lang: 'js', code: String.raw`
function maxProfit(prices) {
  let best = 0;
  for (let i = 0; i < prices.length; i++)
    for (let j = i + 1; j < prices.length; j++)
      best = Math.max(best, prices[j] - prices[i]);    // buy i, sell j
  return best;
}` }, { lang: 'cpp', code: String.raw`
int maxProfit(vector<int>& prices) {
    int best = 0;
    for (int i = 0; i < (int) prices.size(); i++)
        for (int j = i + 1; j < (int) prices.size(); j++)
            best = max(best, prices[j] - prices[i]);   // buy i, sell j
    return best;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MaxProfit(int[] prices) {
        int best = 0;
        for (int i = 0; i < prices.Length; i++)
            for (int j = i + 1; j < prices.Length; j++)
                best = Math.Max(best, prices[j] - prices[i]);   // buy i, sell j
        return best;
    }
}` }] }
    },
    mcq: { q: `<p>Walking left to right, what single number should you carry?</p>`, options: ['The minimum price seen so far', 'The maximum price seen so far', 'The sum of prices so far', 'The index of today'], answer: 0, explain: `<p>Selling today, the best buy is the cheapest earlier day. Carry minSoFar; profit today = price − minSoFar.</p>` },
    hints: [
      `<p><b>Aha:</b> fix the sell day. The best buy day is the minimum price before it.</p>`,
      `<p>Carry <code>minSoFar</code> and <code>best</code>. For each price: best = max(best, price − minSoFar); then minSoFar = min(minSoFar, price).</p>`,
      `<p><b>Traps:</b> update best <b>before</b> updating min (or the same-day buy/sell gives 0 harmlessly). Answer is never negative.<br><b>Recipe:</b> min = prices[0], best = 0; for each later price: best = max(best, p − min); min = min(min, p).</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'maxProfit', cases: [
        [[[7, 1, 5, 3, 6, 4]], 5],
        [[[7, 6, 4, 3, 1]], 0],
        [[[5]], 0],
        [[[1, 2]], 1],
        [[[2, 1]], 0],
        [[[3, 3, 3]], 0],
        [[[2, 4, 1, 10000]], 9999],
        [[[0, 10000, 0]], 10000]
      ] },
    solution: {
      approach: `<p>Carry forward the cheapest price so far; every day evaluate "sell today". This is also Kadane on the daily differences.</p>`,
      code: `
        class Solution {
            public int maxProfit(int[] prices) {
                int minSoFar = prices[0], best = 0;
                for (int i = 1; i < prices.length; i++) {
                    best = Math.max(best, prices[i] - minSoFar);   // sell today?
                    minSoFar = Math.min(minSoFar, prices[i]);      // cheaper buy for future days?
                }
                return best;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().maxProfit(new int[]{7, 1, 5, 3, 6, 4})); // 5
            }
        }`,
      alt: [
        { lang: 'python', code: `def max_profit(prices):
    best, min_so_far = 0, prices[0]
    for p in prices[1:]:
        best = max(best, p - min_so_far)   # sell today?
        min_so_far = min(min_so_far, p)    # cheaper buy for later days?
    return best` },
        { lang: 'js', code: `function maxProfit(prices) {
  let minSoFar = prices[0], best = 0;
  for (let i = 1; i < prices.length; i++) {
    best = Math.max(best, prices[i] - minSoFar);   // sell today?
    minSoFar = Math.min(minSoFar, prices[i]);      // cheaper buy for later days?
  }
  return best;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minSoFar = prices[0], best = 0;
        for (int p : prices) {
            best = max(best, p - minSoFar);   // sell today?
            minSoFar = min(minSoFar, p);      // cheaper buy for later days?
        }
        return best;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MaxProfit(int[] prices) {
        int minSoFar = prices[0], best = 0;
        for (int i = 1; i < prices.Length; i++) {
            best = Math.Max(best, prices[i] - minSoFar);   // sell today?
            minSoFar = Math.Min(minSoFar, prices[i]);      // cheaper buy for future days?
        }
        return best;
    }
}` }
      ],
      dry: { head: ['day', 'price', 'price − min', 'best', 'min after'], rows: [['0', '7', '—', '0', '7'], ['1', '1', '−6', '0', '1'], ['2', '5', '4', '4', '1'], ['3', '3', '2', '4', '1'], ['4', '6', '5', H.c('p', '5'), '1'], ['5', '4', '3', '5', '1']] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(1)</b>.</p>`,
      followUps: ['Unlimited transactions (sum of all positive differences).', 'At most two transactions (prefix best + suffix best).', 'With a cooldown or fee (DP module).']
    }
  });

  practice.push({
    title: 'Matrix Diagonal Sum',
    level: 'Easy',
    tags: ['matrix', '2D array'],
    companies: ['Adobe', 'Amazon'],
    statement: `<p>Given a square matrix <code>mat</code>, return the sum of its primary diagonal (top-left to bottom-right) and secondary diagonal (top-right to bottom-left). The centre cell of an odd-sized matrix belongs to both diagonals but must be counted <b>once</b>.</p>`,
    constraints: `1 ≤ N ≤ 100, 1 ≤ mat[i][j] ≤ 100`,
    example: `${H.table(['', 'c0', 'c1', 'c2'], [['r0', H.c('y', '1'), '2', H.c('b', '3')], ['r1', '4', H.c('p', '5'), '6'], ['r2', H.c('b', '7'), '8', H.c('y', '9')]])}<p>Output <b>25</b> = ${H.c('y', '1 + 9')} + ${H.c('b', '3 + 7')} + ${H.c('p', '5')} (the centre counted once).</p>`,
    brute: {
      why: `<p>Visit all N<sup>2</sup> cells and add those with r == c or r + c == N − 1: O(N<sup>2</sup>). Correct, but it scans N<sup>2</sup> − 2N cells that can never be on a diagonal.</p>`,
      code: { lang: 'java', code: `
        int bruteDiagonal(int[][] mat) {
            int n = mat.length, s = 0;
            for (int r = 0; r < n; r++)
                for (int c = 0; c < n; c++)
                    if (r == c || r + c == n - 1) s += mat[r][c];   // the || counts the centre once
            return s;
        }`, alt: [{ lang: 'python', code: String.raw`
def diagonal_sum(mat):
    n, s = len(mat), 0
    for r in range(n):
        for c in range(n):
            if r == c or r + c == n - 1:    # the "or" counts the centre once
                s += mat[r][c]
    return s` }, { lang: 'js', code: String.raw`
function diagonalSum(mat) {
  const n = mat.length;
  let s = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (r === c || r + c === n - 1) s += mat[r][c];   // the || counts the centre once
  return s;
}` }, { lang: 'cpp', code: String.raw`
int diagonalSum(vector<vector<int>>& mat) {
    int n = mat.size(), s = 0;
    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++)
            if (r == c || r + c == n - 1) s += mat[r][c];   // the || counts the centre once
    return s;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int DiagonalSum(int[][] mat) {
        int n = mat.Length, s = 0;
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++)
                if (r == c || r + c == n - 1) s += mat[r][c];   // the || counts the centre once
        return s;
    }
}` }] }
    },
    mcq: { q: `<p>Which cells are on the secondary diagonal of an N × N matrix?</p>`, options: ['Cells with r + c = N − 1', 'Cells with r = c', 'Cells with r − c = 1', 'Cells with r + c = N'], answer: 0, explain: `<p>The secondary diagonal goes from (0, N−1) to (N−1, 0); along it the row goes up by 1 while the column goes down by 1, so r + c stays N − 1.</p>` },
    hints: [
      `<p><b>Aha:</b> row r touches exactly two diagonal cells: (r, r) and (r, N−1−r).</p>`,
      `<p>One loop over r, add both cells, then fix the double-counted centre if N is odd.</p>`,
      `<p><b>Traps:</b> when N is odd, r = N/2 gives the same cell twice → subtract mat[N/2][N/2] once.<br><b>Recipe:</b> s = Σ (mat[r][r] + mat[r][N−1−r]); if N odd: s −= mat[N/2][N/2].</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'diagonalSum', cases: [
        [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], 25],
        [[[[5]]], 5],
        [[[[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]]], 8],
        [[[[1, 2], [3, 4]]], 10],
        [[[[100, 100, 100, 100, 100], [100, 100, 100, 100, 100], [100, 100, 100, 100, 100], [100, 100, 100, 100, 100], [100, 100, 100, 100, 100]]], 900],
        [[[[7, 3, 1, 9], [3, 4, 6, 9], [6, 9, 6, 6], [9, 5, 8, 5]]], 55]
      ] },
    solution: {
      approach: `<p>Use the index formulas of the two diagonals; one pass over the rows.</p>`,
      code: `
        class Solution {
            public int diagonalSum(int[][] mat) {
                int n = mat.length, s = 0;
                for (int r = 0; r < n; r++) {
                    s += mat[r][r];               // primary diagonal
                    s += mat[r][n - 1 - r];       // secondary diagonal
                }
                if (n % 2 == 1) s -= mat[n / 2][n / 2];   // centre was added twice
                return s;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().diagonalSum(new int[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}})); // 25
            }
        }`,
      alt: [
        { lang: 'python', code: `def diagonal_sum(mat):
    n = len(mat)
    s = sum(mat[r][r] + mat[r][n - 1 - r] for r in range(n))
    return s - mat[n // 2][n // 2] if n % 2 else s   # centre was added twice` },
        { lang: 'js', code: `function diagonalSum(mat) {
  const n = mat.length;
  let s = 0;
  for (let r = 0; r < n; r++) s += mat[r][r] + mat[r][n - 1 - r];
  if (n % 2 === 1) s -= mat[n >> 1][n >> 1];   // centre was added twice
  return s;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int diagonalSum(vector<vector<int>>& mat) {
        int n = mat.size(), s = 0;
        for (int r = 0; r < n; r++) s += mat[r][r] + mat[r][n - 1 - r];
        if (n % 2 == 1) s -= mat[n / 2][n / 2];   // centre was added twice
        return s;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int DiagonalSum(int[][] mat) {
        int n = mat.Length, s = 0;
        for (int r = 0; r < n; r++) {
            s += mat[r][r];               // primary diagonal
            s += mat[r][n - 1 - r];       // secondary diagonal
        }
        if (n % 2 == 1) s -= mat[n / 2][n / 2];   // centre was added twice
        return s;
    }
}` }
      ],
      complexity: `<p><b>Time O(N)</b> (only 2N cells read), <b>space O(1)</b>.</p>`,
      followUps: ['Sum of every anti-diagonal (cells grouped by r + c).', 'Check if a matrix is a Toeplitz matrix (constant diagonals).']
    }
  });

  practice.push({
    title: 'Sum of All Odd-Length Subarrays',
    level: 'Easy',
    tags: ['contribution technique', 'math', 'prefix sum'],
    companies: ['LinkedIn', 'Amazon'],
    statement: `<p>Given an array of positive integers <code>arr</code>, return the sum of all possible <b>odd-length</b> contiguous subarrays.</p>`,
    constraints: `1 ≤ N ≤ 100 (try for O(N) anyway), 1 ≤ arr[i] ≤ 1000`,
    example: `${H.arr([1, 4, 2, 5, 3], { label: 'arr' })}<p>Length 1: 1+4+2+5+3 = 15. Length 3: [1,4,2]=7, [4,2,5]=11, [2,5,3]=10 → 28. Length 5: 15. Total ${H.c('p', '<b>58</b>')}.</p>`,
    brute: {
      why: `<p>Enumerate all odd-length subarrays and add their sums with a running sum: O(N<sup>2</sup>). Fine for N = 100, but for N = 10<sup>5</sup> it is 5 × 10<sup>9</sup>. The waste: each arr[i] is added once per subarray instead of being multiplied by its count.</p>`,
      code: { lang: 'java', code: `
        int bruteOddSum(int[] arr) {
            int total = 0;
            for (int i = 0; i < arr.length; i++) {
                int s = 0;
                for (int j = i; j < arr.length; j++) {
                    s += arr[j];                          // sum of arr[i..j]
                    if ((j - i + 1) % 2 == 1) total += s; // only odd lengths count
                }
            }
            return total;
        }`, alt: [{ lang: 'python', code: String.raw`
def sum_odd_length_subarrays(arr):
    total = 0
    for i in range(len(arr)):
        s = 0
        for j in range(i, len(arr)):
            s += arr[j]                          # sum of arr[i..j]
            if (j - i + 1) % 2 == 1:
                total += s                       # only odd lengths count
    return total` }, { lang: 'js', code: String.raw`
function sumOddLengthSubarrays(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    let s = 0;
    for (let j = i; j < arr.length; j++) {
      s += arr[j];                               // sum of arr[i..j]
      if ((j - i + 1) % 2 === 1) total += s;     // only odd lengths count
    }
  }
  return total;
}` }, { lang: 'cpp', code: String.raw`
int sumOddLengthSubarrays(vector<int>& arr) {
    int total = 0;
    for (int i = 0; i < (int) arr.size(); i++) {
        int s = 0;
        for (int j = i; j < (int) arr.size(); j++) {
            s += arr[j];                              // sum of arr[i..j]
            if ((j - i + 1) % 2 == 1) total += s;     // only odd lengths count
        }
    }
    return total;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int SumOddLengthSubarrays(int[] arr) {
        int total = 0;
        for (int i = 0; i < arr.Length; i++) {
            int s = 0;
            for (int j = i; j < arr.Length; j++) {
                s += arr[j];                          // sum of arr[i..j]
                if ((j - i + 1) % 2 == 1) total += s; // only odd lengths count
            }
        }
        return total;
    }
}` }] }
    },
    mcq: { q: `<p>Index i has L = i + 1 possible starts and R = N − i possible ends. Roughly what fraction of the L·R subarrays containing i have odd length?</p>`, options: ['About half: ⌈L/2⌉⌈R/2⌉ + ⌊L/2⌋⌊R/2⌋', 'All of them', 'Exactly L', 'None when i is even'], answer: 0, explain: `<p>Length = (left extension) + (right extension) + 1 is odd when both extensions are even or both are odd. Counting those combinations gives ⌈L/2⌉⌈R/2⌉ + ⌊L/2⌋⌊R/2⌋.</p>` },
    hints: [
      `<p><b>Aha:</b> contribution technique — total = Σ arr[i] × (number of odd-length subarrays containing i).</p>`,
      `<p>Left extension a ∈ [0, i], right extension b ∈ [0, N−1−i]; odd length ⇔ a and b have the same parity. Count evens and odds on each side.</p>`,
      `<p><b>Traps:</b> integer division for ceil: ⌈L/2⌉ = (L + 1) / 2. A simpler known shortcut: oddCount = (L·R + 1) / 2 (integer division).<br><b>Recipe:</b> for each i: L = i+1, R = N−i, total += arr[i] × ((L·R + 1) / 2).</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'sumOddLengthSubarrays', cases: [
        [[[1, 4, 2, 5, 3]], 58],
        [[[1, 2]], 3],
        [[[10, 11, 12]], 66],
        [[[7]], 7],
        [[Array(100).fill(1000)], 85850000],
        [[[1, 1, 1, 1]], 10]
      ] },
    solution: {
      approach: `<p>Each index lies in L·R subarrays, and ⌈L·R / 2⌉ of them have odd length. Multiply and add.</p>`,
      code: `
        class Solution {
            public int sumOddLengthSubarrays(int[] arr) {
                int n = arr.length, total = 0;
                for (int i = 0; i < n; i++) {
                    int all = (i + 1) * (n - i);     // subarrays containing i
                    int odd = (all + 1) / 2;         // ceil(all / 2) of them have odd length
                    total += arr[i] * odd;
                }
                return total;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().sumOddLengthSubarrays(new int[]{1, 4, 2, 5, 3})); // 58
            }
        }`,
      alt: [
        { lang: 'python', code: `def sum_odd_length_subarrays(arr):
    n = len(arr)
    # (i + 1) * (n - i) subarrays contain i; the odd-length ones are the larger half
    return sum(x * (((i + 1) * (n - i) + 1) // 2) for i, x in enumerate(arr))` },
        { lang: 'js', code: `function sumOddLengthSubarrays(arr) {
  const n = arr.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const all = (i + 1) * (n - i);          // subarrays containing i
    total += arr[i] * Math.ceil(all / 2);   // the odd-length ones
  }
  return total;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int sumOddLengthSubarrays(vector<int>& arr) {
        int n = arr.size(), total = 0;
        for (int i = 0; i < n; i++) {
            int all = (i + 1) * (n - i);    // subarrays containing i
            total += arr[i] * ((all + 1) / 2);   // the odd-length ones
        }
        return total;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int SumOddLengthSubarrays(int[] arr) {
        int n = arr.Length, total = 0;
        for (int i = 0; i < n; i++) {
            int all = (i + 1) * (n - i);     // subarrays containing i
            int odd = (all + 1) / 2;         // ceil(all / 2) of them have odd length
            total += arr[i] * odd;
        }
        return total;
    }
}` }
      ],
      dry: { head: ['i', 'arr[i]', 'all = L·R', 'odd = ⌈all/2⌉', 'contribution'], rows: [['0', '1', '5', '3', '3'], ['1', '4', '8', '4', '16'], ['2', '2', '9', '5', '10'], ['3', '5', '8', '4', '20'], ['4', '3', '5', '3', '9 → total ' + H.c('p', '58')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(1)</b>.</p>`,
      followUps: ['Even-length subarrays only (all − odd).', 'Sum of all subarray XORs (only parity of the count matters).']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Product of Array Except Self',
    level: 'Medium',
    tags: ['prefix product', 'suffix product', 'carry forward'],
    companies: ['Amazon', 'Meta', 'Microsoft', 'Apple', 'Asana'],
    statement: `<p>Given an integer array <code>nums</code>, return an array <code>answer</code> where <code>answer[i]</code> is the product of all elements except <code>nums[i]</code>. You must <b>not use division</b> and should run in O(N).</p>`,
    constraints: `2 ≤ N ≤ 10<sup>5</sup>, −30 ≤ nums[i] ≤ 30, every prefix/suffix product fits in a 32-bit int`,
    example: `${H.arr([1, 2, 3, 4], { label: 'nums' })}${H.arr([24, 12, 8, 6], { label: 'answer', hl: { 2: 'p' } })}<p>answer[2] = ${H.c('b', '1 × 2')} (left of 2) × ${H.c('g', '4')} (right of 2) = ${H.c('p', '8')}. With a zero, e.g. [−1, 1, 0, −3, 3], only index 2 gets a non-zero answer: [0, 0, 9, 0, 0].</p>`,
    brute: {
      why: `<p>For each i multiply all other elements: O(N<sup>2</sup>) = 10<sup>10</sup>. Division (total / nums[i]) is forbidden and breaks on zeros. The waste: the product of everything left of i+1 is just (left of i) × nums[i] — recomputed from scratch.</p>`,
      code: { lang: 'java', code: `
        int[] bruteExceptSelf(int[] nums) {
            int n = nums.length;
            int[] out = new int[n];
            for (int i = 0; i < n; i++) {
                int p = 1;
                for (int j = 0; j < n; j++) if (j != i) p *= nums[j];
                out[i] = p;
            }
            return out;
        }`, alt: [{ lang: 'python', code: String.raw`
def product_except_self(nums):
    n = len(nums)
    out = [0] * n
    for i in range(n):
        p = 1
        for j in range(n):
            if j != i:
                p *= nums[j]
        out[i] = p
    return out` }, { lang: 'js', code: String.raw`
function productExceptSelf(nums) {
  const n = nums.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let p = 1;
    for (let j = 0; j < n; j++) if (j !== i) p *= nums[j];
    out[i] = p;
  }
  return out;
}` }, { lang: 'cpp', code: String.raw`
vector<int> productExceptSelf(vector<int>& nums) {
    int n = nums.size();
    vector<int> out(n);
    for (int i = 0; i < n; i++) {
        int p = 1;
        for (int j = 0; j < n; j++) if (j != i) p *= nums[j];
        out[i] = p;
    }
    return out;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] ProductExceptSelf(int[] nums) {
        int n = nums.Length;
        int[] result = new int[n];
        for (int i = 0; i < n; i++) {
            int p = 1;
            for (int j = 0; j < n; j++) if (j != i) p *= nums[j];
            result[i] = p;
        }
        return result;
    }
}` }] }
    },
    mcq: { q: `<p>answer[i] equals…</p>`, options: ['(product of nums[0..i−1]) × (product of nums[i+1..N−1])', 'total product / nums[i]', 'prefix product up to i', 'nums[i−1] × nums[i+1]'], answer: 0, explain: `<p>Everything except i = everything on the left times everything on the right. Prefix and suffix products give both without division, so zeros cause no trouble.</p>` },
    hints: [
      `<p><b>Aha:</b> same shape as rain water: "something about the left" combined with "something about the right" for every index.</p>`,
      `<p>First pass left→right: out[i] = product of everything before i. Second pass right→left with a carried <code>right</code> product: out[i] *= right; right *= nums[i].</p>`,
      `<p><b>Traps:</b> out[0] starts as 1 (nothing on the left); the right product starts at 1. No division, so zeros work.<br><b>Recipe:</b> out[0] = 1; out[i] = out[i−1]·nums[i−1]; right = 1; for i = N−1..0: out[i] *= right; right *= nums[i].</p>`
    ],
    tests: { sig: 'int[] -> int[]', fn: 'productExceptSelf', cases: [
        [[[1, 2, 3, 4]], [24, 12, 8, 6]],
        [[[-1, 1, 0, -3, 3]], [0, 0, 9, 0, 0]],
        [[[2, 3]], [3, 2]],
        [[[0, 0]], [0, 0]],
        [[[0, 5, 2]], [10, 0, 0]],
        [[[-2, -3, -4]], [12, 8, 6]],
        [[[30, 30, 30, 30, 30, 30]], [24300000, 24300000, 24300000, 24300000, 24300000, 24300000]]
      ] },
    solution: {
      approach: `<p>Prefix products stored in the output, suffix product carried in one variable. O(1) extra space besides the output.</p>`,
      code: `
        class Solution {
            public int[] productExceptSelf(int[] nums) {
                int n = nums.length;
                int[] out = new int[n];
                out[0] = 1;
                for (int i = 1; i < n; i++) out[i] = out[i - 1] * nums[i - 1];  // product of everything LEFT of i
                int right = 1;                                                   // product of everything RIGHT of i
                for (int i = n - 1; i >= 0; i--) {
                    out[i] *= right;
                    right *= nums[i];
                }
                return out;
            }

            public static void main(String[] args) {
                System.out.println(Arrays.toString(new Solution().productExceptSelf(new int[]{1, 2, 3, 4}))); // [24, 12, 8, 6]
            }
        }`,
      alt: [
        { lang: 'python', code: `def product_except_self(nums):
    n = len(nums)
    out = [1] * n
    for i in range(1, n):
        out[i] = out[i - 1] * nums[i - 1]   # product of everything left of i
    right = 1
    for i in range(n - 1, -1, -1):
        out[i] *= right                     # times everything right of i
        right *= nums[i]
    return out` },
        { lang: 'js', code: `function productExceptSelf(nums) {
  const n = nums.length, out = new Array(n).fill(1);
  for (let i = 1; i < n; i++) out[i] = out[i - 1] * nums[i - 1];   // product left of i
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    out[i] *= right;                                               // times product right of i
    right *= nums[i];
  }
  return out;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> out(n, 1);
        for (int i = 1; i < n; i++) out[i] = out[i - 1] * nums[i - 1];   // product left of i
        int right = 1;
        for (int i = n - 1; i >= 0; i--) {
            out[i] *= right;                                             // times product right of i
            right *= nums[i];
        }
        return out;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] ProductExceptSelf(int[] nums) {
        int n = nums.Length;
        int[] result = new int[n];
        result[0] = 1;
        for (int i = 1; i < n; i++) result[i] = result[i - 1] * nums[i - 1];  // product of everything LEFT of i
        int right = 1;                                                        // product of everything RIGHT of i
        for (int i = n - 1; i >= 0; i--) {
            result[i] *= right;
            right *= nums[i];
        }
        return result;
    }
}` }
      ],
      dry: { head: ['i', 'left product (pass 1)', 'right before', 'out[i]', 'right after'], rows: [['3', '6', '1', '6', '4'], ['2', '2', '4', '8', '12'], ['1', '1', '12', '12', '24'], ['0', '1', '24', '24', '24']] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(1)</b> extra (output array not counted).</p>`,
      followUps: ['What if products can overflow? (use long or mod)', 'Count zeros approach with division allowed.']
    }
  });

  practice.push({
    title: 'Maximum Sum Circular Subarray',
    level: 'Medium',
    tags: ['kadane', 'circular array', 'carry forward'],
    companies: ['Amazon', 'Goldman Sachs', 'Uber'],
    statement: `<p>Given a <b>circular</b> integer array <code>nums</code> (the end connects back to the start), return the maximum possible sum of a non-empty subarray. Each element may be used at most once in the subarray.</p>`,
    constraints: `1 ≤ N ≤ 3 × 10<sup>4</sup>, −3 × 10<sup>4</sup> ≤ nums[i] ≤ 3 × 10<sup>4</sup>`,
    example: `${H.arr([5, -3, 5], { label: 'nums', hl: { 0: 'p', 2: 'p' } })}<p>Output ${H.c('p', '<b>10</b>')}: the wrap-around subarray [5 (last), 5 (first)]. For [1, −2, 3, −2] the answer is 3 (no wrap needed). For [−3, −2, −3] it is −2.</p>`,
    brute: {
      why: `<p>Try every start and every length up to N, walking around the circle: O(N<sup>2</sup>) ≈ 9 × 10<sup>8</sup> → too slow. The waste: a wrapping subarray is just "the whole array minus a normal middle subarray", which one extra Kadane pass finds.</p>`,
      code: { lang: 'java', code: `
        int bruteCircular(int[] nums) {
            int n = nums.length, best = Integer.MIN_VALUE;
            for (int i = 0; i < n; i++) {
                int s = 0;
                for (int len = 1; len <= n; len++) {
                    s += nums[(i + len - 1) % n];   // walk around the circle
                    best = Math.max(best, s);
                }
            }
            return best;
        }`, alt: [{ lang: 'python', code: String.raw`
def max_subarray_sum_circular(nums):
    n, best = len(nums), float('-inf')
    for i in range(n):
        s = 0
        for length in range(1, n + 1):
            s += nums[(i + length - 1) % n]     # walk around the circle
            best = max(best, s)
    return best` }, { lang: 'js', code: String.raw`
function maxSubarraySumCircular(nums) {
  const n = nums.length;
  let best = -Infinity;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let len = 1; len <= n; len++) {
      s += nums[(i + len - 1) % n];             // walk around the circle
      best = Math.max(best, s);
    }
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
int maxSubarraySumCircular(vector<int>& nums) {
    int n = nums.size(), best = INT_MIN;
    for (int i = 0; i < n; i++) {
        int s = 0;
        for (int len = 1; len <= n; len++) {
            s += nums[(i + len - 1) % n];       // walk around the circle
            best = max(best, s);
        }
    }
    return best;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MaxSubarraySumCircular(int[] nums) {
        int n = nums.Length, best = int.MinValue;
        for (int i = 0; i < n; i++) {
            int s = 0;
            for (int len = 1; len <= n; len++) {
                s += nums[(i + len - 1) % n];   // walk around the circle
                best = Math.Max(best, s);
            }
        }
        return best;
    }
}` }] }
    },
    mcq: { q: `<p>A wrapping subarray (uses both ends) leaves out a contiguous middle part. To maximise the wrap, the left-out middle should be…</p>`, options: ['The minimum-sum subarray', 'The maximum-sum subarray', 'Empty', 'The first element'], answer: 0, explain: `<p>wrap sum = total − (middle sum). Maximising the wrap means minimising the middle — Kadane with min instead of max.</p>` },
    hints: [
      `<p><b>Aha:</b> the best subarray either does not wrap (plain Kadane) or wraps (total − minimum subarray sum).</p>`,
      `<p>One pass carrying four values: curMax, bestMax, curMin, bestMin, plus the total.</p>`,
      `<p><b>Traps:</b> if every number is negative, bestMin = total, so total − bestMin = 0 means "empty subarray" — not allowed. Return bestMax in that case (detect with bestMax &lt; 0).<br><b>Recipe:</b> run both Kadanes; return bestMax &lt; 0 ? bestMax : max(bestMax, total − bestMin).</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'maxSubarraySumCircular', cases: [
        [[[5, -3, 5]], 10],
        [[[1, -2, 3, -2]], 3],
        [[[-3, -2, -3]], -2],
        [[[7]], 7],
        [[[-7]], -7],
        [[[3, -1, 2, -1]], 4],
        [[[3, -2, 2, -3]], 3],
        [[[30000, 30000, 30000, 30000]], 120000],
        [[[-30000, 30000, -30000]], 30000]
      ] },
    solution: {
      approach: `<p>Max Kadane for the normal case, min Kadane for the wrap case (total − min), with the all-negative guard.</p>`,
      code: `
        class Solution {
            public int maxSubarraySumCircular(int[] nums) {
                int total = 0;
                int curMax = 0, bestMax = Integer.MIN_VALUE;
                int curMin = 0, bestMin = Integer.MAX_VALUE;
                for (int x : nums) {
                    curMax = Math.max(x, curMax + x);   // best ending here
                    bestMax = Math.max(bestMax, curMax);
                    curMin = Math.min(x, curMin + x);   // worst ending here
                    bestMin = Math.min(bestMin, curMin);
                    total += x;
                }
                if (bestMax < 0) return bestMax;        // all negative: wrap would be empty
                return Math.max(bestMax, total - bestMin);
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.maxSubarraySumCircular(new int[]{5, -3, 5}) + " " + s.maxSubarraySumCircular(new int[]{-3, -2, -3})); // 10 -2
            }
        }`,
      alt: [
        { lang: 'python', code: `def max_subarray_sum_circular(nums):
    cur_max = cur_min = 0
    best_max, best_min = float('-inf'), float('inf')
    for x in nums:
        cur_max = max(x, cur_max + x)       # best run ending here
        best_max = max(best_max, cur_max)
        cur_min = min(x, cur_min + x)       # worst run ending here
        best_min = min(best_min, cur_min)
    if best_max < 0:                        # all negative: the wrap would be empty
        return best_max
    return max(best_max, sum(nums) - best_min)` },
        { lang: 'js', code: `function maxSubarraySumCircular(nums) {
  let total = 0, curMax = 0, curMin = 0, bestMax = -Infinity, bestMin = Infinity;
  for (const x of nums) {
    curMax = Math.max(x, curMax + x);       // best run ending here
    bestMax = Math.max(bestMax, curMax);
    curMin = Math.min(x, curMin + x);       // worst run ending here
    bestMin = Math.min(bestMin, curMin);
    total += x;
  }
  if (bestMax < 0) return bestMax;          // all negative: the wrap would be empty
  return Math.max(bestMax, total - bestMin);
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int maxSubarraySumCircular(vector<int>& nums) {
        int total = 0, curMax = 0, curMin = 0, bestMax = INT_MIN, bestMin = INT_MAX;
        for (int x : nums) {
            curMax = max(x, curMax + x);        // best run ending here
            bestMax = max(bestMax, curMax);
            curMin = min(x, curMin + x);        // worst run ending here
            bestMin = min(bestMin, curMin);
            total += x;
        }
        if (bestMax < 0) return bestMax;        // all negative: the wrap would be empty
        return max(bestMax, total - bestMin);
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MaxSubarraySumCircular(int[] nums) {
        int total = 0;
        int curMax = 0, bestMax = int.MinValue;
        int curMin = 0, bestMin = int.MaxValue;
        foreach (int x in nums) {
            curMax = Math.Max(x, curMax + x);   // best ending here
            bestMax = Math.Max(bestMax, curMax);
            curMin = Math.Min(x, curMin + x);   // worst ending here
            bestMin = Math.Min(bestMin, curMin);
            total += x;
        }
        if (bestMax < 0) return bestMax;        // all negative: wrap would be empty
        return Math.Max(bestMax, total - bestMin);
    }
}` }
      ],
      dry: { head: ['x', 'curMax', 'bestMax', 'curMin', 'bestMin', 'total'], rows: [['5', '5', '5', '5', '5', '5'], ['−3', '2', '5', '−3', '−3', '2'], ['5', '7', '7', '2', '−3', '7 → max(7, 7 − (−3)) = ' + H.c('p', '10')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(1)</b>.</p>`,
      followUps: ['Return the indices of the best circular subarray.', 'Circular subarray with length at most K (needs a monotonic deque).']
    }
  });

  practice.push({
    title: 'Maximum Product Subarray',
    level: 'Medium',
    tags: ['kadane', 'carry forward', 'dp'],
    companies: ['Amazon', 'LinkedIn', 'Microsoft', 'Google'],
    statement: `<p>Given an integer array <code>nums</code>, find a non-empty contiguous subarray with the largest <b>product</b> and return that product.</p>`,
    constraints: `1 ≤ N ≤ 2 × 10<sup>4</sup>, −10 ≤ nums[i] ≤ 10, the product of any subarray fits in a 32-bit int`,
    example: `${H.arr([2, 3, -2, 4], { label: 'nums', hl: { 0: 'p', 1: 'p' } })}<p>Output ${H.c('p', '<b>6</b>')} from [2, 3]. For [−2, 3, −4] the answer is <b>24</b> — two negatives multiply into a big positive, so the smallest (most negative) product so far can suddenly become the largest.</p>`,
    brute: {
      why: `<p>All subarrays with a running product: O(N<sup>2</sup>) = 4 × 10<sup>8</sup> — borderline/slow. The waste: the best product ending at i depends only on the best and worst products ending at i − 1.</p>`,
      code: { lang: 'java', code: `
        int bruteMaxProduct(int[] nums) {
            int best = Integer.MIN_VALUE;
            for (int i = 0; i < nums.length; i++) {
                int p = 1;
                for (int j = i; j < nums.length; j++) {
                    p *= nums[j];
                    best = Math.max(best, p);
                }
            }
            return best;
        }`, alt: [{ lang: 'python', code: String.raw`
def max_product(nums):
    best = float('-inf')
    for i in range(len(nums)):
        p = 1
        for j in range(i, len(nums)):
            p *= nums[j]
            best = max(best, p)
    return best` }, { lang: 'js', code: String.raw`
function maxProduct(nums) {
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    let p = 1;
    for (let j = i; j < nums.length; j++) {
      p *= nums[j];
      best = Math.max(best, p);
    }
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
int maxProduct(vector<int>& nums) {
    int best = INT_MIN;
    for (int i = 0; i < (int) nums.size(); i++) {
        int p = 1;
        for (int j = i; j < (int) nums.size(); j++) {
            p *= nums[j];
            best = max(best, p);
        }
    }
    return best;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MaxProduct(int[] nums) {
        int best = int.MinValue;
        for (int i = 0; i < nums.Length; i++) {
            int p = 1;
            for (int j = i; j < nums.Length; j++) {
                p *= nums[j];
                best = Math.Max(best, p);
            }
        }
        return best;
    }
}` }] }
    },
    mcq: { q: `<p>Why must you carry the <b>minimum</b> product ending here, not just the maximum?</p>`, options: ['A negative number turns the minimum into the maximum', 'To handle zeros only', 'To save memory', 'It is not needed'], answer: 0, explain: `<p>min × (negative) can be the new max. E.g. ending at −4 in [−2, 3, −4]: previous min −6 × −4 = 24.</p>` },
    hints: [
      `<p><b>Aha:</b> Kadane, but a negative number swaps the roles of the biggest and smallest products.</p>`,
      `<p>Carry <code>hi</code> and <code>lo</code> (max and min product ending here). For x: candidates are x, hi·x, lo·x; new hi = max, new lo = min.</p>`,
      `<p><b>Traps:</b> compute both from the <b>old</b> hi/lo (use temps). Zero resets both to 0 — the "start fresh" option x handles it. Start best = nums[0].<br><b>Recipe:</b> hi = lo = best = nums[0]; for each next x: a = hi·x, b = lo·x; hi = max(x, a, b); lo = min(x, a, b); best = max(best, hi).</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'maxProduct', cases: [
        [[[2, 3, -2, 4]], 6],
        [[[-2, 0, -1]], 0],
        [[[-2, 3, -4]], 24],
        [[[-5]], -5],
        [[[0, 2]], 2],
        [[[-2, -3]], 6],
        [[[2, -5, -2, -4, 3]], 24],
        [[[10, 10, 10, 10, 10, 10, 10, 10, 10]], 1000000000],
        [[[-1, -1, -1]], 1]
      ] },
    solution: {
      approach: `<p>Kadane with two carried states (max and min product ending here).</p>`,
      code: `
        class Solution {
            public int maxProduct(int[] nums) {
                int hi = nums[0], lo = nums[0], best = nums[0];
                for (int i = 1; i < nums.length; i++) {
                    int x = nums[i];
                    int a = hi * x, b = lo * x;                 // extend the best and the worst run
                    hi = Math.max(x, Math.max(a, b));            // or start fresh at x
                    lo = Math.min(x, Math.min(a, b));
                    best = Math.max(best, hi);
                }
                return best;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.maxProduct(new int[]{2, 3, -2, 4}) + " " + s.maxProduct(new int[]{-2, 3, -4})); // 6 24
            }
        }`,
      alt: [
        { lang: 'python', code: `def max_product(nums):
    hi = lo = best = nums[0]
    for x in nums[1:]:
        cands = (x, hi * x, lo * x)    # start fresh, extend the best, extend the worst
        hi, lo = max(cands), min(cands)
        best = max(best, hi)
    return best` },
        { lang: 'js', code: `function maxProduct(nums) {
  let hi = nums[0], lo = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i], a = hi * x, b = lo * x;   // extend the best and the worst run
    hi = Math.max(x, a, b);
    lo = Math.min(x, a, b);
    best = Math.max(best, hi);
  }
  return best;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int hi = nums[0], lo = nums[0], best = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            int x = nums[i], a = hi * x, b = lo * x;   // extend the best and the worst run
            hi = max({x, a, b});
            lo = min({x, a, b});
            best = max(best, hi);
        }
        return best;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MaxProduct(int[] nums) {
        int hi = nums[0], lo = nums[0], best = nums[0];
        for (int i = 1; i < nums.Length; i++) {
            int x = nums[i];
            int a = hi * x, b = lo * x;                 // extend the best and the worst run
            hi = Math.Max(x, Math.Max(a, b));            // or start fresh at x
            lo = Math.Min(x, Math.Min(a, b));
            best = Math.Max(best, hi);
        }
        return best;
    }
}` }
      ],
      dry: { head: ['x', 'hi·x', 'lo·x', 'hi', 'lo', 'best'], rows: [['−2', '—', '—', '−2', '−2', '−2'], ['3', '−6', '−6', '3', '−6', '3'], ['−4', '−12', '24', '24', '−12', H.c('p', '24')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(1)</b>.</p>`,
      followUps: ['Return the subarray indices.', 'Prefix/suffix product alternative (split at zeros).']
    }
  });

  practice.push({
    title: 'Spiral Matrix II (Generate)',
    level: 'Medium',
    tags: ['matrix', 'spiral', 'simulation'],
    companies: ['Microsoft', 'Amazon', 'Apple'],
    statement: `<p>Given a positive integer <code>n</code>, generate an <code>n × n</code> matrix filled with the numbers 1 to n<sup>2</sup> in clockwise spiral order.</p>`,
    constraints: `1 ≤ n ≤ 20`,
    example: `${H.table(['', 'c0', 'c1', 'c2'], [['r0', H.c('y', '1'), H.c('y', '2'), H.c('y', '3')], ['r1', H.c('p', '8'), H.c('r', '9'), H.c('g', '4')], ['r2', H.c('b', '7'), H.c('b', '6'), H.c('g', '5')]])}<p>n = 3: the counter walks ${H.c('y', '→ 1 2 3')}, ${H.c('g', '↓ 4 5')}, ${H.c('b', '← 6 7')}, ${H.c('p', '↑ 8')}, then the centre ${H.c('r', '9')}.</p>`,
    brute: {
      why: `<p>Simulate with direction vectors and check "is the next cell outside or already filled (non-zero)?" before each step. Correct and O(n<sup>2</sup>), but the turning logic is error-prone. The four-wall version states the boundaries explicitly and needs no checks per step.</p>`,
      code: { lang: 'java', code: `
        int[][] simulate(int n) {
            int[][] g = new int[n][n];
            int[] dr = {0, 1, 0, -1}, dc = {1, 0, -1, 0};
            int r = 0, c = 0, d = 0;
            for (int v = 1; v <= n * n; v++) {
                g[r][c] = v;
                int nr = r + dr[d], nc = c + dc[d];
                if (nr < 0 || nr >= n || nc < 0 || nc >= n || g[nr][nc] != 0) {
                    d = (d + 1) % 4;                    // blocked: turn clockwise
                    nr = r + dr[d];
                    nc = c + dc[d];
                }
                r = nr;
                c = nc;
            }
            return g;
        }`, alt: [{ lang: 'python', code: String.raw`
def generate_matrix(n):
    g = [[0] * n for _ in range(n)]
    dr, dc = [0, 1, 0, -1], [1, 0, -1, 0]
    r = c = d = 0
    for v in range(1, n * n + 1):
        g[r][c] = v
        nr, nc = r + dr[d], c + dc[d]
        if nr < 0 or nr >= n or nc < 0 or nc >= n or g[nr][nc] != 0:
            d = (d + 1) % 4                    # blocked: turn clockwise
            nr, nc = r + dr[d], c + dc[d]
        r, c = nr, nc
    return g` }, { lang: 'js', code: String.raw`
function generateMatrix(n) {
  const g = Array.from({ length: n }, () => new Array(n).fill(0));
  const dr = [0, 1, 0, -1], dc = [1, 0, -1, 0];
  let r = 0, c = 0, d = 0;
  for (let v = 1; v <= n * n; v++) {
    g[r][c] = v;
    let nr = r + dr[d], nc = c + dc[d];
    if (nr < 0 || nr >= n || nc < 0 || nc >= n || g[nr][nc] !== 0) {
      d = (d + 1) % 4;                         // blocked: turn clockwise
      nr = r + dr[d];
      nc = c + dc[d];
    }
    r = nr;
    c = nc;
  }
  return g;
}` }, { lang: 'cpp', code: String.raw`
vector<vector<int>> generateMatrix(int n) {
    vector<vector<int>> g(n, vector<int>(n, 0));
    int dr[4] = {0, 1, 0, -1}, dc[4] = {1, 0, -1, 0};
    int r = 0, c = 0, d = 0;
    for (int v = 1; v <= n * n; v++) {
        g[r][c] = v;
        int nr = r + dr[d], nc = c + dc[d];
        if (nr < 0 || nr >= n || nc < 0 || nc >= n || g[nr][nc] != 0) {
            d = (d + 1) % 4;                   // blocked: turn clockwise
            nr = r + dr[d];
            nc = c + dc[d];
        }
        r = nr;
        c = nc;
    }
    return g;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[][] GenerateMatrix(int n) {
        int[][] g = new int[n][];
        for (int i = 0; i < n; i++) g[i] = new int[n];
        int[] dr = { 0, 1, 0, -1 }, dc = { 1, 0, -1, 0 };
        int r = 0, c = 0, d = 0;
        for (int v = 1; v <= n * n; v++) {
            g[r][c] = v;
            int nr = r + dr[d], nc = c + dc[d];
            if (nr < 0 || nr >= n || nc < 0 || nc >= n || g[nr][nc] != 0) {
                d = (d + 1) % 4;                    // blocked: turn clockwise
                nr = r + dr[d];
                nc = c + dc[d];
            }
            r = nr;
            c = nc;
        }
        return g;
    }
}` }] }
    },
    mcq: { q: `<p>For n = 4, which number lands at position (1, 1)?</p>`, options: ['13', '12', '16', '6'], answer: 0, explain: `<p>Outer ring uses 1..12 (12 cells). The inner 2 × 2 ring starts at (1, 1) with 13, then 14 at (1, 2), 15 at (2, 2), 16 at (2, 1).</p>` },
    hints: [
      `<p><b>Aha:</b> it is the spiral traversal, but you write a counter instead of reading values.</p>`,
      `<p>Four walls top/bottom/left/right and a counter <code>v</code> starting at 1.</p>`,
      `<p><b>Traps:</b> for a square matrix the guards rarely trigger, but keep them; odd n ends with a single centre cell.<br><b>Recipe:</b> while top ≤ bottom and left ≤ right: → fill row top, top++; ↓ fill col right, right−−; ← fill row bottom (if top ≤ bottom), bottom−−; ↑ fill col left (if left ≤ right), left++.</p>`
    ],
    tests: { sig: 'int -> int[][]', fn: 'generateMatrix', cases: [
        [[1], [[1]]],
        [[2], [[1, 2], [4, 3]]],
        [[3], [[1, 2, 3], [8, 9, 4], [7, 6, 5]]],
        [[4], [[1, 2, 3, 4], [12, 13, 14, 5], [11, 16, 15, 6], [10, 9, 8, 7]]],
        [[5], [[1, 2, 3, 4, 5], [16, 17, 18, 19, 6], [15, 24, 25, 20, 7], [14, 23, 22, 21, 8], [13, 12, 11, 10, 9]]],
        [[6], [[1, 2, 3, 4, 5, 6], [20, 21, 22, 23, 24, 7], [19, 32, 33, 34, 25, 8], [18, 31, 36, 35, 26, 9], [17, 30, 29, 28, 27, 10], [16, 15, 14, 13, 12, 11]]]
      ] },
    solution: {
      approach: `<p>Four shrinking walls; each walk writes the next counter values.</p>`,
      code: `
        class Solution {
            public int[][] generateMatrix(int n) {
                int[][] g = new int[n][n];
                int top = 0, bottom = n - 1, left = 0, right = n - 1, v = 1;
                while (top <= bottom && left <= right) {
                    for (int c = left; c <= right; c++) g[top][c] = v++;
                    top++;
                    for (int r = top; r <= bottom; r++) g[r][right] = v++;
                    right--;
                    if (top <= bottom) { for (int c = right; c >= left; c--) g[bottom][c] = v++; bottom--; }
                    if (left <= right) { for (int r = bottom; r >= top; r--) g[r][left] = v++; left++; }
                }
                return g;
            }

            public static void main(String[] args) {
                System.out.println(Arrays.deepToString(new Solution().generateMatrix(3))); // [[1, 2, 3], [8, 9, 4], [7, 6, 5]]
            }
        }`,
      alt: [
        { lang: 'python', code: `def generate_matrix(n):
    g = [[0] * n for _ in range(n)]
    top, bottom, left, right, v = 0, n - 1, 0, n - 1, 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            g[top][c] = v; v += 1
        top += 1
        for r in range(top, bottom + 1):
            g[r][right] = v; v += 1
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                g[bottom][c] = v; v += 1
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                g[r][left] = v; v += 1
            left += 1
    return g` },
        { lang: 'js', code: `function generateMatrix(n) {
  const g = Array.from({ length: n }, () => new Array(n).fill(0));
  let top = 0, bottom = n - 1, left = 0, right = n - 1, v = 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) g[top][c] = v++;
    top++;
    for (let r = top; r <= bottom; r++) g[r][right] = v++;
    right--;
    if (top <= bottom) { for (let c = right; c >= left; c--) g[bottom][c] = v++; bottom--; }
    if (left <= right) { for (let r = bottom; r >= top; r--) g[r][left] = v++; left++; }
  }
  return g;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> generateMatrix(int n) {
        vector<vector<int>> g(n, vector<int>(n, 0));
        int top = 0, bottom = n - 1, left = 0, right = n - 1, v = 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) g[top][c] = v++;
            top++;
            for (int r = top; r <= bottom; r++) g[r][right] = v++;
            right--;
            if (top <= bottom) { for (int c = right; c >= left; c--) g[bottom][c] = v++; bottom--; }
            if (left <= right) { for (int r = bottom; r >= top; r--) g[r][left] = v++; left++; }
        }
        return g;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[][] GenerateMatrix(int n) {
        int[][] g = new int[n][];
        for (int i = 0; i < n; i++) g[i] = new int[n];
        int top = 0, bottom = n - 1, left = 0, right = n - 1, v = 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) g[top][c] = v++;
            top++;
            for (int r = top; r <= bottom; r++) g[r][right] = v++;
            right--;
            if (top <= bottom) { for (int c = right; c >= left; c--) g[bottom][c] = v++; bottom--; }
            if (left <= right) { for (int r = bottom; r >= top; r--) g[r][left] = v++; left++; }
        }
        return g;
    }
}` }
      ],
      complexity: `<p><b>Time O(n<sup>2</sup>)</b>, <b>space O(1)</b> extra besides the output.</p>`,
      followUps: ['Generate an R × C (non-square) spiral.', 'Fill anti-clockwise starting from the centre.']
    }
  });

  practice.push({
    title: 'Set Matrix Zeroes',
    level: 'Medium',
    tags: ['matrix', 'in-place', 'markers'],
    companies: ['Microsoft', 'Amazon', 'Meta', 'Oracle'],
    statement: `<p>Given an <code>R × C</code> matrix, if a cell is 0, set its <b>entire row and column</b> to 0. Do it in place. Aim for O(1) extra space.</p>`,
    constraints: `1 ≤ R, C ≤ 200, −2<sup>31</sup> ≤ matrix[i][j] ≤ 2<sup>31</sup> − 1`,
    example: `${H.table(['input', 'output'], [['1 1 1<br>1 ' + H.c('r', '0') + ' 1<br>1 1 1', '1 ' + H.c('r', '0') + ' 1<br>' + H.c('r', '0 0 0') + '<br>1 ' + H.c('r', '0') + ' 1']])}<p>The single 0 at (1, 1) wipes row 1 and column 1. Careful: zeros you <b>write</b> must not trigger more wiping — only the original zeros count.</p>`,
    brute: {
      why: `<p>Copy the matrix and, for each original zero, wipe its row and column in the copy: O(R·C·(R + C)) time and O(R·C) space. The better version remembers only "which rows" and "which columns" — O(R + C) — and the best stores those flags inside the first row and column.</p>`,
      code: { lang: 'java', code: `
        void bruteZeroes(int[][] m) {
            int R = m.length, C = m[0].length;
            int[][] copy = new int[R][];
            for (int r = 0; r < R; r++) copy[r] = m[r].clone();
            for (int r = 0; r < R; r++)
                for (int c = 0; c < C; c++)
                    if (copy[r][c] == 0) {                       // look at ORIGINAL values only
                        for (int k = 0; k < C; k++) m[r][k] = 0;
                        for (int k = 0; k < R; k++) m[k][c] = 0;
                    }
        }`, alt: [{ lang: 'python', code: String.raw`
def set_zeroes(m):
    R, C = len(m), len(m[0])
    copy = [row[:] for row in m]
    for r in range(R):
        for c in range(C):
            if copy[r][c] == 0:                  # look at ORIGINAL values only
                for k in range(C):
                    m[r][k] = 0
                for k in range(R):
                    m[k][c] = 0` }, { lang: 'js', code: String.raw`
function setZeroes(m) {
  const R = m.length, C = m[0].length;
  const copy = m.map((row) => row.slice());
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      if (copy[r][c] === 0) {                    // look at ORIGINAL values only
        for (let k = 0; k < C; k++) m[r][k] = 0;
        for (let k = 0; k < R; k++) m[k][c] = 0;
      }
}` }, { lang: 'cpp', code: String.raw`
void setZeroes(vector<vector<int>>& m) {
    int R = m.size(), C = m[0].size();
    vector<vector<int>> copy = m;
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            if (copy[r][c] == 0) {                       // look at ORIGINAL values only
                for (int k = 0; k < C; k++) m[r][k] = 0;
                for (int k = 0; k < R; k++) m[k][c] = 0;
            }
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void SetZeroes(int[][] m) {
        int R = m.Length, C = m[0].Length;
        int[][] copy = new int[R][];
        for (int r = 0; r < R; r++) copy[r] = (int[])m[r].Clone();
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                if (copy[r][c] == 0) {                       // look at ORIGINAL values only
                    for (int k = 0; k < C; k++) m[r][k] = 0;
                    for (int k = 0; k < R; k++) m[k][c] = 0;
                }
    }
}` }] }
    },
    mcq: { q: `<p>Why do we need a separate flag for the first column (or first row) in the O(1)-space solution?</p>`, options: ['Cell (0, 0) cannot mark both row 0 and column 0 at once', 'Arrays start at index 1', 'To handle negative numbers', 'It is only for speed'], answer: 0, explain: `<p>We use row 0 as column markers and column 0 as row markers. The cell (0, 0) is shared by both, so one extra boolean (e.g. col0Zero) keeps the two meanings apart.</p>` },
    hints: [
      `<p><b>Aha:</b> you only need to know which rows and which columns contain a zero — not where exactly.</p>`,
      `<p>Store those flags in the matrix itself: m[r][0] = 0 marks row r, m[0][c] = 0 marks column c. Keep one boolean for column 0.</p>`,
      `<p><b>Traps:</b> process the first row/column <b>last</b>, otherwise the markers get wiped before you read them.<br><b>Recipe:</b> pass 1: mark; pass 2: for r ≥ 1, c ≥ 1 zero the cell if its row or column marker is 0; then zero row 0 if m[0][0] == 0; zero column 0 if col0Zero.</p>`
    ],
    tests: { sig: 'int[][] -> void', fn: 'setZeroes', mutate: 0, cases: [
        [[[[1, 1, 1], [1, 0, 1], [1, 1, 1]]], [[1, 0, 1], [0, 0, 0], [1, 0, 1]]],
        [[[[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]], [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]]],
        [[[[5]]], [[5]]],
        [[[[0]]], [[0]]],
        [[[[1, 2, 3]]], [[1, 2, 3]]],
        [[[[1], [0], [3]]], [[0], [0], [0]]],
        [[[[1, 2], [3, 4]]], [[1, 2], [3, 4]]],
        [[[[2147483647, -2147483648], [0, 7]]], [[0, -2147483648], [0, 0]]],
        [[[[1, 0, 3], [4, 5, 6], [0, 8, 9]]], [[0, 0, 0], [0, 0, 6], [0, 0, 0]]]
      ] },
    solution: {
      approach: `<p>Use the first row and first column as marker arrays, with one extra flag for column 0. Fill the inner cells from the markers, then fix the marker row/column last.</p>`,
      code: `
        class Solution {
            public void setZeroes(int[][] m) {
                int R = m.length, C = m[0].length;
                boolean col0Zero = false;
                for (int r = 0; r < R; r++) {
                    if (m[r][0] == 0) col0Zero = true;           // column 0 has its own flag
                    for (int c = 1; c < C; c++) {
                        if (m[r][c] == 0) {
                            m[r][0] = 0;                         // mark row r
                            m[0][c] = 0;                         // mark column c
                        }
                    }
                }
                for (int r = 1; r < R; r++)                      // inner cells first
                    for (int c = 1; c < C; c++)
                        if (m[r][0] == 0 || m[0][c] == 0) m[r][c] = 0;
                if (m[0][0] == 0)                                // row 0 marker
                    for (int c = 0; c < C; c++) m[0][c] = 0;
                if (col0Zero)                                    // column 0 marker
                    for (int r = 0; r < R; r++) m[r][0] = 0;
            }

            public static void main(String[] args) {
                int[][] m = {{0, 1, 2, 0}, {3, 4, 5, 2}, {1, 3, 1, 5}};
                new Solution().setZeroes(m);
                System.out.println(Arrays.deepToString(m)); // [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]]
            }
        }`,
      alt: [
        { lang: 'python', code: `def set_zeroes(m):
    R, C = len(m), len(m[0])
    col0_zero = False
    for r in range(R):
        if m[r][0] == 0:
            col0_zero = True                  # column 0 has its own flag
        for c in range(1, C):
            if m[r][c] == 0:
                m[r][0] = m[0][c] = 0         # mark row r and column c
    for r in range(1, R):                     # inner cells first
        for c in range(1, C):
            if m[r][0] == 0 or m[0][c] == 0:
                m[r][c] = 0
    if m[0][0] == 0:                          # row 0 marker
        m[0][:] = [0] * C
    if col0_zero:                             # column 0 marker
        for r in range(R):
            m[r][0] = 0` },
        { lang: 'js', code: `function setZeroes(m) {
  const R = m.length, C = m[0].length;
  let col0Zero = false;
  for (let r = 0; r < R; r++) {
    if (m[r][0] === 0) col0Zero = true;        // column 0 has its own flag
    for (let c = 1; c < C; c++)
      if (m[r][c] === 0) { m[r][0] = 0; m[0][c] = 0; }   // mark row r and column c
  }
  for (let r = 1; r < R; r++)                  // inner cells first
    for (let c = 1; c < C; c++)
      if (m[r][0] === 0 || m[0][c] === 0) m[r][c] = 0;
  if (m[0][0] === 0) m[0].fill(0);             // row 0 marker
  if (col0Zero) for (let r = 0; r < R; r++) m[r][0] = 0;   // column 0 marker
}` },
        { lang: 'cpp', code: `class Solution {
public:
    void setZeroes(vector<vector<int>>& m) {
        int R = m.size(), C = m[0].size();
        bool col0Zero = false;
        for (int r = 0; r < R; r++) {
            if (m[r][0] == 0) col0Zero = true;      // column 0 has its own flag
            for (int c = 1; c < C; c++)
                if (m[r][c] == 0) m[r][0] = m[0][c] = 0;   // mark row r and column c
        }
        for (int r = 1; r < R; r++)                 // inner cells first
            for (int c = 1; c < C; c++)
                if (m[r][0] == 0 || m[0][c] == 0) m[r][c] = 0;
        if (m[0][0] == 0) fill(m[0].begin(), m[0].end(), 0);   // row 0 marker
        if (col0Zero) for (int r = 0; r < R; r++) m[r][0] = 0; // column 0 marker
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void SetZeroes(int[][] m) {
        int R = m.Length, C = m[0].Length;
        bool col0Zero = false;
        for (int r = 0; r < R; r++) {
            if (m[r][0] == 0) col0Zero = true;           // column 0 has its own flag
            for (int c = 1; c < C; c++) {
                if (m[r][c] == 0) {
                    m[r][0] = 0;                         // mark row r
                    m[0][c] = 0;                         // mark column c
                }
            }
        }
        for (int r = 1; r < R; r++)                      // inner cells first
            for (int c = 1; c < C; c++)
                if (m[r][0] == 0 || m[0][c] == 0) m[r][c] = 0;
        if (m[0][0] == 0)                                // row 0 marker
            for (int c = 0; c < C; c++) m[0][c] = 0;
        if (col0Zero)                                    // column 0 marker
            for (int r = 0; r < R; r++) m[r][0] = 0;
    }
}` }
      ],
      complexity: `<p><b>Time O(R·C)</b>, <b>space O(1)</b> extra.</p>`,
      followUps: ['Do it with O(R + C) boolean arrays first — explain the trade-off.', 'Game of Life: update in place using extra state values.']
    }
  });

  practice.push({
    title: 'Search a Fully Sorted 2D Matrix',
    level: 'Medium',
    tags: ['matrix', 'binary search', 'flat index'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    statement: `<p>An <code>R × C</code> matrix has each row sorted ascending, and the first value of each row is greater than the last value of the previous row. Return <code>true</code> if <code>target</code> exists. Required: O(log(R·C)).</p>`,
    constraints: `1 ≤ R, C ≤ 100, −10<sup>4</sup> ≤ values, target ≤ 10<sup>4</sup>`,
    example: `${H.table(['', 'c0', 'c1', 'c2', 'c3'], [['r0', '1', H.c('g', '3'), '5', '7'], ['r1', '10', '11', '16', '20'], ['r2', '23', '30', '34', '60']])}<p>target 3 → <b>true</b>; target 13 → <b>false</b>. Read row by row it is one sorted list: 1, 3, 5, 7, 10, 11, …</p>`,
    brute: {
      why: `<p>Staircase search works here too (O(R + C) = 200 steps), and scanning is O(R·C). Both ignore the stronger guarantee: the whole matrix is one sorted list, so binary search over R·C positions needs only ~14 steps.</p>`,
      code: { lang: 'java', code: `
        boolean staircase(int[][] g, int target) {
            int r = 0, c = g[0].length - 1;
            while (r < g.length && c >= 0) {
                if (g[r][c] == target) return true;
                if (g[r][c] > target) c--; else r++;
            }
            return false;
        }`, alt: [{ lang: 'python', code: String.raw`
def search_matrix(g, target):
    r, c = 0, len(g[0]) - 1
    while r < len(g) and c >= 0:
        if g[r][c] == target:
            return True
        if g[r][c] > target:
            c -= 1
        else:
            r += 1
    return False` }, { lang: 'js', code: String.raw`
function searchMatrix(g, target) {
  let r = 0, c = g[0].length - 1;
  while (r < g.length && c >= 0) {
    if (g[r][c] === target) return true;
    if (g[r][c] > target) c--; else r++;
  }
  return false;
}` }, { lang: 'cpp', code: String.raw`
bool searchMatrix(vector<vector<int>>& g, int target) {
    int r = 0, c = g[0].size() - 1;
    while (r < (int) g.size() && c >= 0) {
        if (g[r][c] == target) return true;
        if (g[r][c] > target) c--; else r++;
    }
    return false;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public bool SearchMatrix(int[][] g, int target) {
        int r = 0, c = g[0].Length - 1;
        while (r < g.Length && c >= 0) {
            if (g[r][c] == target) return true;
            if (g[r][c] > target) c--; else r++;
        }
        return false;
    }
}` }] }
    },
    mcq: { q: `<p>With C = 4 columns, which cell is flat index 9?</p>`, options: ['(2, 1)', '(1, 2)', '(2, 2)', '(9, 0)'], answer: 0, explain: `<p>row = 9 / 4 = 2, col = 9 % 4 = 1 → (2, 1).</p>` },
    hints: [
      `<p><b>Aha:</b> row-major order turns the matrix into a sorted array of length R·C without copying.</p>`,
      `<p>Binary search lo = 0, hi = R·C − 1; read <code>g[mid / C][mid % C]</code>.</p>`,
      `<p><b>Traps:</b> divide by the number of <b>columns</b>, not rows; use lo + (hi − lo) / 2.<br><b>Recipe:</b> standard binary search on the virtual flat array.</p>`
    ],
    tests: { sig: 'int[][] int -> bool', fn: 'searchMatrix', cases: [
        [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3], true],
        [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13], false],
        [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 1], true],
        [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 60], true],
        [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 0], false],
        [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 61], false],
        [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 23], true],
        [[[[5]], 5], true],
        [[[[5]], 6], false],
        [[[[1], [3]], 3], true],
        [[[[-10000, 0, 10000]], -10000], true]
      ] },
    solution: {
      approach: `<p>Binary search on a virtual flat array using flat → (row, col) conversion.</p>`,
      code: `
        class Solution {
            public boolean searchMatrix(int[][] g, int target) {
                int R = g.length, C = g[0].length;
                int lo = 0, hi = R * C - 1;
                while (lo <= hi) {
                    int mid = lo + (hi - lo) / 2;
                    int v = g[mid / C][mid % C];      // flat index -> (row, col)
                    if (v == target) return true;
                    if (v < target) lo = mid + 1;
                    else hi = mid - 1;
                }
                return false;
            }

            public static void main(String[] args) {
                int[][] g = {{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}};
                System.out.println(new Solution().searchMatrix(g, 3) + " " + new Solution().searchMatrix(g, 13)); // true false
            }
        }`,
      alt: [
        { lang: 'python', code: `def search_matrix(g, target):
    R, C = len(g), len(g[0])
    lo, hi = 0, R * C - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        r, c = divmod(mid, C)           # flat index -> (row, col)
        if g[r][c] == target:
            return True
        if g[r][c] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False` },
        { lang: 'js', code: `function searchMatrix(g, target) {
  const R = g.length, C = g[0].length;
  let lo = 0, hi = R * C - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = g[Math.floor(mid / C)][mid % C];   // flat index -> (row, col)
    if (v === target) return true;
    if (v < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    bool searchMatrix(vector<vector<int>>& g, int target) {
        int R = g.size(), C = g[0].size();
        int lo = 0, hi = R * C - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            int v = g[mid / C][mid % C];        // flat index -> (row, col)
            if (v == target) return true;
            if (v < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return false;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public bool SearchMatrix(int[][] g, int target) {
        int R = g.Length, C = g[0].Length;
        int lo = 0, hi = R * C - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            int v = g[mid / C][mid % C];      // flat index -> (row, col)
            if (v == target) return true;
            if (v < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return false;
    }
}` }
      ],
      dry: { head: ['lo', 'hi', 'mid', '(r, c)', 'value vs 13'], rows: [['0', '11', '5', '(1, 1)', '11 &lt; 13 → lo = 6'], ['6', '11', '8', '(2, 0)', '23 &gt; 13 → hi = 7'], ['6', '7', '6', '(1, 2)', '16 &gt; 13 → hi = 5'], ['6', '5', '—', '—', H.c('r', 'lo &gt; hi → false')]] },
      complexity: `<p><b>Time O(log(R·C))</b>, <b>space O(1)</b>.</p>`,
      followUps: ['What if only rows and columns are sorted? (staircase)', 'Find the first value ≥ target (lower bound).']
    }
  });

  practice.push({
    title: 'Matrix Block Sum',
    level: 'Medium',
    tags: ['2D prefix sum', 'matrix'],
    companies: ['Google', 'Amazon'],
    statement: `<p>Given an <code>R × C</code> matrix and an integer <code>k</code>, return a matrix <code>answer</code> where <code>answer[i][j]</code> is the sum of all <code>mat[r][c]</code> with <code>i − k ≤ r ≤ i + k</code>, <code>j − k ≤ c ≤ j + k</code>, and (r, c) inside the matrix.</p>`,
    constraints: `1 ≤ R, C, k ≤ 100, 1 ≤ mat[i][j] ≤ 100`,
    example: `${H.table(['mat', 'c0', 'c1', 'c2'], [['r0', '1', '2', '3'], ['r1', '4', '5', '6'], ['r2', '7', '8', '9']])}<p>k = 1 → answer = [[12, 21, 16], [27, 45, 33], [24, 39, 28]]. answer[0][0] = 1 + 2 + 4 + 5 = 12 (the block is clipped at the border); the centre sees all 9 cells = 45.</p>`,
    brute: {
      why: `<p>For each cell, add up its (2k+1)<sup>2</sup> block: O(R·C·k<sup>2</sup>) = 10<sup>4</sup> × 4 × 10<sup>4</sup> = 4 × 10<sup>8</sup>. The waste: neighbouring blocks overlap almost completely.</p>`,
      code: { lang: 'java', code: `
        int[][] bruteBlock(int[][] mat, int k) {
            int R = mat.length, C = mat[0].length;
            int[][] ans = new int[R][C];
            for (int i = 0; i < R; i++)
                for (int j = 0; j < C; j++)
                    for (int r = Math.max(0, i - k); r <= Math.min(R - 1, i + k); r++)
                        for (int c = Math.max(0, j - k); c <= Math.min(C - 1, j + k); c++)
                            ans[i][j] += mat[r][c];
            return ans;
        }`, alt: [{ lang: 'python', code: String.raw`
def matrix_block_sum(mat, k):
    R, C = len(mat), len(mat[0])
    ans = [[0] * C for _ in range(R)]
    for i in range(R):
        for j in range(C):
            for r in range(max(0, i - k), min(R - 1, i + k) + 1):
                for c in range(max(0, j - k), min(C - 1, j + k) + 1):
                    ans[i][j] += mat[r][c]
    return ans` }, { lang: 'js', code: String.raw`
function matrixBlockSum(mat, k) {
  const R = mat.length, C = mat[0].length;
  const ans = Array.from({ length: R }, () => new Array(C).fill(0));
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++)
      for (let r = Math.max(0, i - k); r <= Math.min(R - 1, i + k); r++)
        for (let c = Math.max(0, j - k); c <= Math.min(C - 1, j + k); c++)
          ans[i][j] += mat[r][c];
  return ans;
}` }, { lang: 'cpp', code: String.raw`
vector<vector<int>> matrixBlockSum(vector<vector<int>>& mat, int k) {
    int R = mat.size(), C = mat[0].size();
    vector<vector<int>> ans(R, vector<int>(C, 0));
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++)
            for (int r = max(0, i - k); r <= min(R - 1, i + k); r++)
                for (int c = max(0, j - k); c <= min(C - 1, j + k); c++)
                    ans[i][j] += mat[r][c];
    return ans;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int[][] MatrixBlockSum(int[][] mat, int k) {
        int R = mat.Length, C = mat[0].Length;
        int[][] ans = new int[R][];
        for (int i = 0; i < R; i++) ans[i] = new int[C];
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++)
                for (int r = Math.Max(0, i - k); r <= Math.Min(R - 1, i + k); r++)
                    for (int c = Math.Max(0, j - k); c <= Math.Min(C - 1, j + k); c++)
                        ans[i][j] += mat[r][c];
        return ans;
    }
}` }] }
    },
    mcq: { q: `<p>For cell (0, 0) with k = 1 in a 3 × 3 matrix, which rectangle do you query?</p>`, options: ['(0, 0)..(1, 1) after clamping', '(−1, −1)..(1, 1)', '(0, 0)..(2, 2)', '(1, 1)..(1, 1)'], answer: 0, explain: `<p>Clamp: r1 = max(0, i − k) = 0, c1 = 0, r2 = min(R − 1, i + k) = 1, c2 = 1. Then one 2D prefix query.</p>` },
    hints: [
      `<p><b>Aha:</b> every answer cell is a rectangle sum — build a 2D prefix table once.</p>`,
      `<p>For each (i, j): clamp the corners to the matrix, then use big − top − left + corner.</p>`,
      `<p><b>Traps:</b> clamp with max(0, …) and min(R − 1, …) before indexing the padded table.<br><b>Recipe:</b> build P; for each cell: r1, c1, r2, c2 = clamped; ans = P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1].</p>`
    ],
    tests: { sig: 'int[][] int -> int[][]', fn: 'matrixBlockSum', cases: [
        [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]], 1], [[12, 21, 16], [27, 45, 33], [24, 39, 28]]],
        [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]], 2], [[45, 45, 45], [45, 45, 45], [45, 45, 45]]],
        [[[[5]], 1], [[5]]],
        [[[[1, 2, 3, 4]], 1], [[3, 6, 9, 7]]],
        [[[[1], [2], [3], [4]], 2], [[6], [10], [10], [9]]],
        [[[[100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100]], 100], [[1200, 1200, 1200, 1200], [1200, 1200, 1200, 1200], [1200, 1200, 1200, 1200]]],
        [[[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]], 1], [[14, 24, 30, 22], [33, 54, 63, 45], [57, 90, 99, 69], [46, 72, 78, 54]]]
      ] },
    solution: {
      approach: `<p>One padded 2D prefix table; each output cell is an O(1) clamped rectangle query.</p>`,
      code: `
        class Solution {
            public int[][] matrixBlockSum(int[][] mat, int k) {
                int R = mat.length, C = mat[0].length;
                int[][] P = new int[R + 1][C + 1];
                for (int i = 0; i < R; i++)
                    for (int j = 0; j < C; j++)
                        P[i + 1][j + 1] = mat[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
                int[][] ans = new int[R][C];
                for (int i = 0; i < R; i++) {
                    for (int j = 0; j < C; j++) {
                        int r1 = Math.max(0, i - k), c1 = Math.max(0, j - k);          // clamp to the grid
                        int r2 = Math.min(R - 1, i + k), c2 = Math.min(C - 1, j + k);
                        ans[i][j] = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
                    }
                }
                return ans;
            }

            public static void main(String[] args) {
                int[][] m = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
                System.out.println(Arrays.deepToString(new Solution().matrixBlockSum(m, 1))); // [[12, 21, 16], [27, 45, 33], [24, 39, 28]]
            }
        }`,
      alt: [
        { lang: 'python', code: `def matrix_block_sum(mat, k):
    R, C = len(mat), len(mat[0])
    P = [[0] * (C + 1) for _ in range(R + 1)]
    for i in range(R):
        for j in range(C):
            P[i + 1][j + 1] = mat[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
    ans = [[0] * C for _ in range(R)]
    for i in range(R):
        r1, r2 = max(0, i - k), min(R - 1, i + k)        # clamp to the grid
        for j in range(C):
            c1, c2 = max(0, j - k), min(C - 1, j + k)
            ans[i][j] = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]
    return ans` },
        { lang: 'js', code: `function matrixBlockSum(mat, k) {
  const R = mat.length, C = mat[0].length;
  const P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++)
      P[i + 1][j + 1] = mat[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
  return mat.map((row, i) => row.map((_, j) => {
    const r1 = Math.max(0, i - k), c1 = Math.max(0, j - k);          // clamp to the grid
    const r2 = Math.min(R - 1, i + k), c2 = Math.min(C - 1, j + k);
    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
  }));
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> matrixBlockSum(vector<vector<int>>& mat, int k) {
        int R = mat.size(), C = mat[0].size();
        vector<vector<int>> P(R + 1, vector<int>(C + 1, 0));
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++)
                P[i + 1][j + 1] = mat[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
        vector<vector<int>> ans(R, vector<int>(C));
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++) {
                int r1 = max(0, i - k), c1 = max(0, j - k);           // clamp to the grid
                int r2 = min(R - 1, i + k), c2 = min(C - 1, j + k);
                ans[i][j] = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
            }
        return ans;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int[][] MatrixBlockSum(int[][] mat, int k) {
        int R = mat.Length, C = mat[0].Length;
        int[,] P = new int[R + 1, C + 1];
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++)
                P[i + 1, j + 1] = mat[i][j] + P[i, j + 1] + P[i + 1, j] - P[i, j];
        int[][] ans = new int[R][];
        for (int i = 0; i < R; i++) {
            ans[i] = new int[C];
            for (int j = 0; j < C; j++) {
                int r1 = Math.Max(0, i - k), c1 = Math.Max(0, j - k);          // clamp to the grid
                int r2 = Math.Min(R - 1, i + k), c2 = Math.Min(C - 1, j + k);
                ans[i][j] = P[r2 + 1, c2 + 1] - P[r1, c2 + 1] - P[r2 + 1, c1] + P[r1, c1];
            }
        }
        return ans;
    }
}` }
      ],
      complexity: `<p><b>Time O(R·C)</b>, <b>space O(R·C)</b> for the prefix table.</p>`,
      followUps: ['Largest square with sum ≤ threshold (LeetCode 1292).', 'Image blur / box filter in real image processing.']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Candy Distribution',
    level: 'Hard',
    tags: ['prefix/suffix pass', 'greedy', 'carry forward'],
    companies: ['Amazon', 'Google', 'Uber'],
    statement: `<p><code>N</code> children stand in a line with ratings <code>ratings[i]</code>. Each child gets at least one candy, and a child with a <b>higher rating than a neighbour</b> must get <b>more</b> candies than that neighbour. Return the minimum total number of candies.</p>`,
    constraints: `1 ≤ N ≤ 2 × 10<sup>4</sup>, 0 ≤ ratings[i] ≤ 2 × 10<sup>4</sup>`,
    example: `${H.arr([1, 0, 2], { label: 'ratings' })}${H.arr([2, 1, 2], { label: 'candies', hl: { 0: 'g', 2: 'g' } })}<p>Total <b>5</b>. For [1, 2, 2] the answer is <b>4</b> (candies [1, 2, 1]) — equal ratings have no rule between them, so the last child can get just 1.</p>`,
    brute: {
      why: `<p>Start everyone at 1 and keep sweeping, fixing any violated neighbour pair, until a full sweep changes nothing. A strictly decreasing line needs about N sweeps of N steps: O(N<sup>2</sup>) = 4 × 10<sup>8</sup>. The waste: information flows one step per sweep instead of along the whole line in one pass.</p>`,
      code: { lang: 'java', code: `
        int bruteCandy(int[] ratings) {
            int n = ratings.length;
            int[] c = new int[n];
            Arrays.fill(c, 1);
            boolean changed = true;
            while (changed) {                                   // repeat until stable
                changed = false;
                for (int i = 0; i < n; i++) {
                    if (i > 0 && ratings[i] > ratings[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
                    if (i < n - 1 && ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
                }
            }
            int sum = 0;
            for (int x : c) sum += x;
            return sum;
        }`, alt: [{ lang: 'python', code: String.raw`
def candy(ratings):
    n = len(ratings)
    c = [1] * n
    changed = True
    while changed:                                   # repeat until stable
        changed = False
        for i in range(n):
            if i > 0 and ratings[i] > ratings[i - 1] and c[i] <= c[i - 1]:
                c[i] = c[i - 1] + 1
                changed = True
            if i < n - 1 and ratings[i] > ratings[i + 1] and c[i] <= c[i + 1]:
                c[i] = c[i + 1] + 1
                changed = True
    return sum(c)` }, { lang: 'js', code: String.raw`
function candy(ratings) {
  const n = ratings.length;
  const c = new Array(n).fill(1);
  let changed = true;
  while (changed) {                                  // repeat until stable
    changed = false;
    for (let i = 0; i < n; i++) {
      if (i > 0 && ratings[i] > ratings[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
      if (i < n - 1 && ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
    }
  }
  return c.reduce((s, x) => s + x, 0);
}` }, { lang: 'cpp', code: String.raw`
int candy(vector<int>& ratings) {
    int n = ratings.size();
    vector<int> c(n, 1);
    bool changed = true;
    while (changed) {                                // repeat until stable
        changed = false;
        for (int i = 0; i < n; i++) {
            if (i > 0 && ratings[i] > ratings[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
            if (i < n - 1 && ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
        }
    }
    int sum = 0;
    for (int x : c) sum += x;
    return sum;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int Candy(int[] ratings) {
        int n = ratings.Length;
        int[] c = new int[n];
        Array.Fill(c, 1);
        bool changed = true;
        while (changed) {                                   // repeat until stable
            changed = false;
            for (int i = 0; i < n; i++) {
                if (i > 0 && ratings[i] > ratings[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
                if (i < n - 1 && ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
            }
        }
        int sum = 0;
        foreach (int x in c) sum += x;
        return sum;
    }
}` }] }
    },
    mcq: { q: `<p>After the left→right pass (only the "left neighbour" rule), how do you enforce the "right neighbour" rule without breaking the first?</p>`, options: ['Right→left pass: c[i] = max(c[i], c[i+1] + 1) when ratings[i] &gt; ratings[i+1]', 'Overwrite c[i] = c[i+1] + 1', 'Sort the ratings', 'Add 1 to every child'], answer: 0, explain: `<p>Taking the max keeps the left rule satisfied (values only grow) while fixing the right rule — exactly like combining prefix max and suffix max.</p>` },
    hints: [
      `<p><b>Aha:</b> the two neighbour rules are independent: one only looks left, one only looks right. Solve each with a one-direction carry-forward pass.</p>`,
      `<p>Pass 1 (→): if ratings[i] &gt; ratings[i−1], c[i] = c[i−1] + 1. Pass 2 (←): if ratings[i] &gt; ratings[i+1], c[i] = max(c[i], c[i+1] + 1).</p>`,
      `<p><b>Traps:</b> use max in pass 2, not assignment; equal ratings impose nothing.<br><b>Recipe:</b> fill 1s; left pass; right pass with max; sum.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'candy', cases: [
        [[[1, 0, 2]], 5],
        [[[1, 2, 2]], 4],
        [[[1, 3, 4, 5, 2]], 11],
        [[[5]], 1],
        [[[1, 2, 3, 4, 5]], 15],
        [[[5, 4, 3, 2, 1]], 15],
        [[[2, 2, 2, 2]], 4],
        [[[1, 3, 2, 2, 1]], 7],
        [[[0, 20000, 0, 20000]], 6]
      ] },
    solution: {
      approach: `<p>Two directional passes (like prefix and suffix arrays), combined with max per index. This is the minimum because each child gets exactly the length of the longest increasing run reaching it from either side.</p>`,
      code: `
        class Solution {
            public int candy(int[] ratings) {
                int n = ratings.length;
                int[] c = new int[n];
                Arrays.fill(c, 1);                                   // everyone gets at least one
                for (int i = 1; i < n; i++)                          // left neighbour rule
                    if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
                for (int i = n - 2; i >= 0; i--)                     // right neighbour rule
                    if (ratings[i] > ratings[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1);
                int sum = 0;
                for (int x : c) sum += x;
                return sum;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.candy(new int[]{1, 0, 2}) + " " + s.candy(new int[]{1, 2, 2}) + " " + s.candy(new int[]{1, 3, 4, 5, 2})); // 5 4 11
            }
        }`,
      alt: [
        { lang: 'python', code: `def candy(ratings):
    n = len(ratings)
    c = [1] * n                                   # everyone gets at least one
    for i in range(1, n):                         # left neighbour rule
        if ratings[i] > ratings[i - 1]:
            c[i] = c[i - 1] + 1
    for i in range(n - 2, -1, -1):                # right neighbour rule
        if ratings[i] > ratings[i + 1]:
            c[i] = max(c[i], c[i + 1] + 1)
    return sum(c)` },
        { lang: 'js', code: `function candy(ratings) {
  const n = ratings.length, c = new Array(n).fill(1);   // everyone gets at least one
  for (let i = 1; i < n; i++)                           // left neighbour rule
    if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
  for (let i = n - 2; i >= 0; i--)                      // right neighbour rule
    if (ratings[i] > ratings[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1);
  return c.reduce((s, x) => s + x, 0);
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int candy(vector<int>& ratings) {
        int n = ratings.size();
        vector<int> c(n, 1);                              // everyone gets at least one
        for (int i = 1; i < n; i++)                       // left neighbour rule
            if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
        for (int i = n - 2; i >= 0; i--)                  // right neighbour rule
            if (ratings[i] > ratings[i + 1]) c[i] = max(c[i], c[i + 1] + 1);
        return accumulate(c.begin(), c.end(), 0);
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int Candy(int[] ratings) {
        int n = ratings.Length;
        int[] c = new int[n];
        Array.Fill(c, 1);                                    // everyone gets at least one
        for (int i = 1; i < n; i++)                          // left neighbour rule
            if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
        for (int i = n - 2; i >= 0; i--)                     // right neighbour rule
            if (ratings[i] > ratings[i + 1]) c[i] = Math.Max(c[i], c[i + 1] + 1);
        int sum = 0;
        foreach (int x in c) sum += x;
        return sum;
    }
}` }
      ],
      dry: { head: ['i', 'rating', 'after → pass', 'after ← pass'], rows: [['0', '1', '1', '1'], ['1', '3', '2', '2'], ['2', '4', '3', '3'], ['3', '5', '4', '4'], ['4', '2', '1', '1 → total ' + H.c('p', '11')]] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b> (an O(1)-space version counts up/down slopes).</p>`,
      followUps: ['Children in a circle.', 'O(1) extra space with slope counting.']
    }
  });

  practice.push({
    title: 'First Missing Positive',
    level: 'Hard',
    tags: ['array', 'in-place', 'index as hash', 'cyclic placement'],
    companies: ['Amazon', 'Microsoft', 'Google', 'Meta'],
    statement: `<p>Given an unsorted integer array <code>nums</code>, return the smallest positive integer that is <b>not</b> present. You must run in O(N) time and use O(1) extra space (modifying the array is allowed).</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> − 1`,
    example: `${H.arr([3, 4, -1, 1], { label: 'nums' })}<p>Output <b>2</b>: 1 is present, 2 is not. [1, 2, 0] → <b>3</b>. [7, 8, 9, 11, 12] → <b>1</b>. Key fact: the answer is always in 1..N+1, because N numbers can cover at most 1..N.</p>`,
    brute: {
      why: `<p>Try 1, 2, 3, … and scan the array for each: O(N<sup>2</sup>). A hash set makes it O(N) time but O(N) space; sorting is O(N log N). The waste: we ignore that the array itself has exactly N slots — one for each candidate answer 1..N.</p>`,
      code: { lang: 'java', code: `
        int bruteMissing(int[] nums) {
            for (int want = 1; ; want++) {
                boolean found = false;
                for (int x : nums) if (x == want) { found = true; break; }
                if (!found) return want;            // at most N + 1 tries, each O(N)
            }
        }`, alt: [{ lang: 'python', code: String.raw`
def first_missing_positive(nums):
    want = 1
    while True:
        found = False
        for x in nums:
            if x == want:
                found = True
                break
        if not found:
            return want            # at most N + 1 tries, each O(N)
        want += 1` }, { lang: 'js', code: String.raw`
function firstMissingPositive(nums) {
  for (let want = 1; ; want++) {
    let found = false;
    for (const x of nums) if (x === want) { found = true; break; }
    if (!found) return want;            // at most N + 1 tries, each O(N)
  }
}` }, { lang: 'cpp', code: String.raw`
int firstMissingPositive(vector<int>& nums) {
    for (int want = 1; ; want++) {
        bool found = false;
        for (int x : nums) if (x == want) { found = true; break; }
        if (!found) return want;        // at most N + 1 tries, each O(N)
    }
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int FirstMissingPositive(int[] nums) {
        for (int want = 1; ; want++) {
            bool found = false;
            foreach (int x in nums) if (x == want) { found = true; break; }
            if (!found) return want;            // at most N + 1 tries, each O(N)
        }
    }
}` }] }
    },
    mcq: { q: `<p>Where should the value 3 live after "cyclic placement" in an array of size 5?</p>`, options: ['Index 2', 'Index 3', 'Index 0', 'Nowhere — ignore it'], answer: 0, explain: `<p>Value v belongs at index v − 1. Values outside 1..N (and duplicates) are ignored. Afterwards, the first index i with nums[i] ≠ i + 1 gives the answer i + 1.</p>` },
    hints: [
      `<p><b>Aha:</b> the answer is in 1..N+1, and the array has N slots — use index v − 1 as the "seen" marker for value v.</p>`,
      `<p>For each i, while nums[i] is in 1..N and not already at its home (nums[nums[i] − 1] ≠ nums[i]), swap it home.</p>`,
      `<p><b>Traps:</b> the duplicate check <code>nums[v−1] ≠ v</code> prevents infinite loops; negative and huge values are skipped. Each swap places one value permanently → O(N) total.<br><b>Recipe:</b> place; then scan for the first i with nums[i] ≠ i + 1; if none, return N + 1.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'firstMissingPositive', cases: [
        [[[3, 4, -1, 1]], 2],
        [[[1, 2, 0]], 3],
        [[[7, 8, 9, 11, 12]], 1],
        [[[1]], 2],
        [[[2]], 1],
        [[[1, 1]], 2],
        [[[2, 1]], 3],
        [[[-2147483648, 2147483647]], 1],
        [[[5, 4, 3, 2, 1]], 6],
        [[[0, -1, -2]], 1],
        [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], 11]
      ] },
    solution: {
      approach: `<p>Cyclic placement: put every value v in 1..N at index v − 1 by swapping, then the first mismatch is the answer.</p>`,
      code: `
        class Solution {
            public int firstMissingPositive(int[] nums) {
                int n = nums.length;
                for (int i = 0; i < n; i++) {
                    // keep swapping nums[i] to its home until it is out of range, a duplicate, or already home
                    while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
                        int v = nums[i];
                        nums[i] = nums[v - 1];
                        nums[v - 1] = v;
                    }
                }
                for (int i = 0; i < n; i++)
                    if (nums[i] != i + 1) return i + 1;    // first empty home
                return n + 1;                              // 1..n all present
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.firstMissingPositive(new int[]{3, 4, -1, 1}) + " " + s.firstMissingPositive(new int[]{1, 2, 0}) + " " + s.firstMissingPositive(new int[]{7, 8, 9, 11, 12})); // 2 3 1
            }
        }`,
      alt: [
        { lang: 'python', code: `def first_missing_positive(nums):
    n = len(nums)
    for i in range(n):
        # swap nums[i] home until it is out of range, a duplicate, or already home
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            v = nums[i]
            nums[i], nums[v - 1] = nums[v - 1], v
    for i, x in enumerate(nums):
        if x != i + 1:
            return i + 1                  # first empty home
    return n + 1` },
        { lang: 'js', code: `function firstMissingPositive(nums) {
  const n = nums.length;
  for (let i = 0; i < n; i++) {
    // swap nums[i] home until it is out of range, a duplicate, or already home
    while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      const v = nums[i];
      nums[i] = nums[v - 1];
      nums[v - 1] = v;
    }
  }
  for (let i = 0; i < n; i++) if (nums[i] !== i + 1) return i + 1;   // first empty home
  return n + 1;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int firstMissingPositive(vector<int>& nums) {
        int n = nums.size();
        for (int i = 0; i < n; i++)
            // swap nums[i] home until it is out of range, a duplicate, or already home
            while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i])
                swap(nums[i], nums[nums[i] - 1]);
        for (int i = 0; i < n; i++)
            if (nums[i] != i + 1) return i + 1;    // first empty home
        return n + 1;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int FirstMissingPositive(int[] nums) {
        int n = nums.Length;
        for (int i = 0; i < n; i++) {
            // keep swapping nums[i] to its home until it is out of range, a duplicate, or already home
            while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
                int v = nums[i];
                nums[i] = nums[v - 1];
                nums[v - 1] = v;
            }
        }
        for (int i = 0; i < n; i++)
            if (nums[i] != i + 1) return i + 1;    // first empty home
        return n + 1;                              // 1..n all present
    }
}` }
      ],
      dry: { head: ['step', 'action', 'array'], rows: [['i=0', 'swap 3 → index 2', '[−1, 4, 3, 1]'], ['i=0', '−1 out of range, stop', '[−1, 4, 3, 1]'], ['i=1', 'swap 4 → index 3', '[−1, 1, 3, 4]'], ['i=1', 'swap 1 → index 0', '[1, −1, 3, 4]'], ['scan', 'index 1 holds −1 ≠ 2', H.c('p', 'answer 2')]] },
      complexity: `<p><b>Time O(N)</b> — every swap puts a value home for good, so at most N swaps overall. <b>Space O(1)</b>.</p>`,
      followUps: ['Find all missing numbers in 1..N.', 'Find the duplicate and the missing number.', 'Sign-marking variant (negate nums[v − 1]).']
    }
  });

  practice.push({
    title: 'Maximum Sum Rectangle in a 2D Matrix',
    level: 'Hard',
    tags: ['kadane', '2D', 'prefix sum', 'compression'],
    companies: ['Google', 'Amazon', 'Flipkart', 'Samsung'],
    statement: `<p>Given an <code>R × C</code> integer matrix, find the sub-rectangle (any contiguous block of rows and columns, non-empty) with the largest sum, and return that sum.</p>`,
    constraints: `1 ≤ R, C ≤ 100, −10<sup>4</sup> ≤ A[i][j] ≤ 10<sup>4</sup>`,
    example: `${H.table(['', 'c0', 'c1', 'c2', 'c3', 'c4'], [['r0', '1', '2', '−1', '−4', '−20'], ['r1', '−8', H.c('p', '−3'), H.c('p', '4'), H.c('p', '2'), '1'], ['r2', '3', H.c('p', '8'), H.c('p', '10'), H.c('p', '1'), '3'], ['r3', '−4', H.c('p', '−1'), H.c('p', '1'), H.c('p', '7'), '−6']])}<p>Output ${H.c('p', '<b>29</b>')} from rows 1..3, columns 1..3: (−3 + 4 + 2) + (8 + 10 + 1) + (−1 + 1 + 7) = 3 + 19 + 7 = 29.</p>`,
    brute: {
      why: `<p>Try every rectangle (O(R<sup>2</sup>C<sup>2</sup>) ≈ 2.5 × 10<sup>7</sup> for 100 × 100 using a 2D prefix table for O(1) sums) — acceptable here but O(N<sup>4</sup>) in general. Without the prefix table it is O(N<sup>6</sup>). The waste: for a fixed pair of rows, choosing the best column range is just 1D max subarray, which Kadane does in O(C) instead of O(C<sup>2</sup>).</p>`,
      code: { lang: 'java', code: `
        long bruteRect(int[][] A) {
            int R = A.length, C = A[0].length;
            long[][] P = new long[R + 1][C + 1];
            for (int i = 0; i < R; i++)
                for (int j = 0; j < C; j++)
                    P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
            long best = Long.MIN_VALUE;
            for (int r1 = 0; r1 < R; r1++)
                for (int r2 = r1; r2 < R; r2++)
                    for (int c1 = 0; c1 < C; c1++)
                        for (int c2 = c1; c2 < C; c2++)
                            best = Math.max(best, P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);
            return best;
        }`, alt: [{ lang: 'python', code: String.raw`
def max_sum_rectangle(A):
    R, C = len(A), len(A[0])
    P = [[0] * (C + 1) for _ in range(R + 1)]
    for i in range(R):
        for j in range(C):
            P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
    best = float('-inf')
    for r1 in range(R):
        for r2 in range(r1, R):
            for c1 in range(C):
                for c2 in range(c1, C):
                    best = max(best, P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1])
    return best` }, { lang: 'js', code: String.raw`
function maxSumRectangle(A) {
  const R = A.length, C = A[0].length;
  const P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++)
      P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
  let best = -Infinity;
  for (let r1 = 0; r1 < R; r1++)
    for (let r2 = r1; r2 < R; r2++)
      for (let c1 = 0; c1 < C; c1++)
        for (let c2 = c1; c2 < C; c2++)
          best = Math.max(best, P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);
  return best;
}` }, { lang: 'cpp', code: String.raw`
long long maxSumRectangle(vector<vector<int>>& A) {
    int R = A.size(), C = A[0].size();
    vector<vector<long long>> P(R + 1, vector<long long>(C + 1, 0));
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++)
            P[i + 1][j + 1] = A[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
    long long best = LLONG_MIN;
    for (int r1 = 0; r1 < R; r1++)
        for (int r2 = r1; r2 < R; r2++)
            for (int c1 = 0; c1 < C; c1++)
                for (int c2 = c1; c2 < C; c2++)
                    best = max(best, P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);
    return best;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public long MaxSumRectangle(int[][] A) {
        int R = A.Length, C = A[0].Length;
        long[,] P = new long[R + 1, C + 1];
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++)
                P[i + 1, j + 1] = A[i][j] + P[i, j + 1] + P[i + 1, j] - P[i, j];
        long best = long.MinValue;
        for (int r1 = 0; r1 < R; r1++)
            for (int r2 = r1; r2 < R; r2++)
                for (int c1 = 0; c1 < C; c1++)
                    for (int c2 = c1; c2 < C; c2++)
                        best = Math.Max(best, P[r2 + 1, c2 + 1] - P[r1, c2 + 1] - P[r2 + 1, c1] + P[r1, c1]);
        return best;
    }
}` }] }
    },
    mcq: { q: `<p>You fix top row = 1 and bottom row = 3 and add each column's values between them, getting [−9, 4, 15, 10, −2]. What is the best rectangle sum for this row pair?</p>`, options: ['29 (Kadane on the compressed row: 4 + 15 + 10)', '18', '15', '27'], answer: 0, explain: `<p>Each compressed value is a whole column strip. Kadane over [−9, 4, 15, 10, −2] gives 4 + 15 + 10 = 29, i.e. columns 1..3 — the answer above.</p>` },
    hints: [
      `<p><b>Aha:</b> fix the top and bottom rows. Then each column contributes one number (its strip sum), and the problem becomes 1D max subarray.</p>`,
      `<p>For each top, keep a 64-bit array <code>col</code>; extend bottom one row at a time adding that row into col (carry forward), and run Kadane on col.</p>`,
      `<p><b>Traps:</b> reset col for every new top; Kadane must allow all-negative (start with col[0]); use long.<br><b>Recipe:</b> for top: col = 0s; for bottom ≥ top: col[c] += A[bottom][c]; best = max(best, kadane(col)).</p>`
    ],
    tests: { sig: 'int[][] -> long', fn: 'maxSumRectangle', cases: [
        [[[[1, 2, -1, -4, -20], [-8, -3, 4, 2, 1], [3, 8, 10, 1, 3], [-4, -1, 1, 7, -6]]], 29],
        [[[[-5]]], -5],
        [[[[-3, -1], [-2, -4]]], -1],
        [[[[10000, 10000, 10000, 10000, 10000], [10000, 10000, 10000, 10000, 10000], [10000, 10000, 10000, 10000, 10000], [10000, 10000, 10000, 10000, 10000]]], 200000],
        [[[[2, -1, 3]]], 4],
        [[[[1], [-2], [3]]], 3],
        [[[[0, 0], [0, 0]]], 0],
        [[[[1, -10, 1], [-10, 9, -10], [1, -10, 1]]], 9]
      ] },
    solution: {
      approach: `<p>Row-pair compression + Kadane: O(R<sup>2</sup>·C). Transpose first if R &gt; C so the squared dimension is the smaller one.</p>`,
      code: `
        class Solution {
            public long maxSumRectangle(int[][] A) {
                int R = A.length, C = A[0].length;
                long best = Long.MIN_VALUE;
                for (int top = 0; top < R; top++) {
                    long[] col = new long[C];                  // column strip sums for rows top..bottom
                    for (int bottom = top; bottom < R; bottom++) {
                        for (int c = 0; c < C; c++) col[c] += A[bottom][c];   // grow the strip by one row
                        long cur = col[0], here = col[0];      // Kadane on the compressed row
                        for (int c = 1; c < C; c++) {
                            cur = Math.max(col[c], cur + col[c]);
                            here = Math.max(here, cur);
                        }
                        best = Math.max(best, here);
                    }
                }
                return best;
            }

            public static void main(String[] args) {
                int[][] A = {{1, 2, -1, -4, -20}, {-8, -3, 4, 2, 1}, {3, 8, 10, 1, 3}, {-4, -1, 1, 7, -6}};
                System.out.println(new Solution().maxSumRectangle(A)); // 29
            }
        }`,
      alt: [
        { lang: 'python', code: `def max_sum_rectangle(A):
    R, C = len(A), len(A[0])
    best = float('-inf')
    for top in range(R):
        col = [0] * C                       # column sums for rows top..bottom
        for bottom in range(top, R):
            for c in range(C):
                col[c] += A[bottom][c]      # grow the strip by one row
            cur = here = col[0]             # Kadane on the squashed row
            for x in col[1:]:
                cur = max(x, cur + x)
                here = max(here, cur)
            best = max(best, here)
    return best` },
        { lang: 'js', code: `function maxSumRectangle(A) {
  const R = A.length, C = A[0].length;
  let best = -Infinity;
  for (let top = 0; top < R; top++) {
    const col = new Array(C).fill(0);       // column sums for rows top..bottom
    for (let bottom = top; bottom < R; bottom++) {
      for (let c = 0; c < C; c++) col[c] += A[bottom][c];   // grow the strip by one row
      let cur = col[0], here = col[0];      // Kadane on the squashed row
      for (let c = 1; c < C; c++) {
        cur = Math.max(col[c], cur + col[c]);
        here = Math.max(here, cur);
      }
      best = Math.max(best, here);
    }
  }
  return best;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    long long maxSumRectangle(vector<vector<int>>& A) {
        int R = A.size(), C = A[0].size();
        long long best = LLONG_MIN;
        for (int top = 0; top < R; top++) {
            vector<long long> col(C, 0);            // column sums for rows top..bottom
            for (int bottom = top; bottom < R; bottom++) {
                for (int c = 0; c < C; c++) col[c] += A[bottom][c];   // grow the strip
                long long cur = col[0], here = col[0];               // Kadane on the squashed row
                for (int c = 1; c < C; c++) {
                    cur = max(col[c], cur + col[c]);
                    here = max(here, cur);
                }
                best = max(best, here);
            }
        }
        return best;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public long MaxSumRectangle(int[][] A) {
        int R = A.Length, C = A[0].Length;
        long best = long.MinValue;
        for (int top = 0; top < R; top++) {
            long[] col = new long[C];                  // column strip sums for rows top..bottom
            for (int bottom = top; bottom < R; bottom++) {
                for (int c = 0; c < C; c++) col[c] += A[bottom][c];   // grow the strip by one row
                long cur = col[0], here = col[0];      // Kadane on the compressed row
                for (int c = 1; c < C; c++) {
                    cur = Math.Max(col[c], cur + col[c]);
                    here = Math.Max(here, cur);
                }
                best = Math.Max(best, here);
            }
        }
        return best;
    }
}` }
      ],
      dry: { head: ['top..bottom', 'compressed col', 'Kadane best'], rows: [['2..2', '[3, 8, 10, 1, 3]', '25'], ['1..2', '[−5, 5, 14, 3, 4]', '26'], ['1..3', '[−9, 4, 15, 10, −2]', H.c('p', '29')], ['0..3', '[−8, 6, 14, 6, −22]', '26']] },
      complexity: `<p><b>Time O(R<sup>2</sup>·C)</b> (10<sup>6</sup> for 100 × 100), <b>space O(C)</b>.</p>`,
      followUps: ['Return the rectangle corners.', 'Max rectangle sum no larger than K (needs a sorted set of prefix sums: <code>TreeSet</code> / <code>SortedList</code> / <code>std::set</code>).', 'Count submatrices that sum to a target (needs a hash map: <code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>).']
    }
  });

  practice.push({
    title: 'Maximum Sum of 3 Non-Overlapping Subarrays',
    level: 'Hard',
    tags: ['prefix sum', 'prefix max', 'suffix max', 'sliding window'],
    companies: ['Meta', 'Google', 'Amazon'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, find three <b>non-overlapping</b> subarrays of length <code>k</code> with the maximum total sum. Return their starting indices as an array; if several answers exist, return the lexicographically smallest one.</p>`,
    constraints: `1 ≤ N ≤ 2 × 10<sup>4</sup>, 1 ≤ nums[i] &lt; 2<sup>16</sup>, 1 ≤ k ≤ ⌊N / 3⌋`,
    example: `${H.arr([1, 2, 1, 2, 6, 7, 5, 1], { label: 'nums', hl: { 0: 'b', 1: 'b', 3: 'g', 4: 'g', 5: 'p', 6: 'p' } })}<p>k = 2 → <b>[0, 3, 5]</b>: windows [1, 2] = 3, [2, 6] = 8, [7, 5] = 12, total 23. [2, 1] at index 1 also sums to 3, but [0, 3, 5] is lexicographically smaller.</p>`,
    brute: {
      why: `<p>Try every triple of start positions a &lt; b &lt; c with gaps ≥ k: O(N<sup>3</sup>) ≈ 8 × 10<sup>12</sup>. The waste: once the middle window b is fixed, the best left window is just "the best window ending before b" — a prefix max — and the best right window is a suffix max.</p>`,
      code: { lang: 'java', code: `
        int[] bruteThree(int[] nums, int k) {
            int n = nums.length, m = n - k + 1;
            long[] W = new long[m];
            for (int i = 0; i < m; i++) for (int j = i; j < i + k; j++) W[i] += nums[j];
            long best = -1;
            int[] ans = new int[3];
            for (int a = 0; a < m; a++)
                for (int b = a + k; b < m; b++)
                    for (int c = b + k; c < m; c++)
                        if (W[a] + W[b] + W[c] > best) { best = W[a] + W[b] + W[c]; ans = new int[]{a, b, c}; }
            return ans;
        }`, alt: [{ lang: 'python', code: String.raw`
def max_sum_of_three_subarrays(nums, k):
    n = len(nums)
    m = n - k + 1
    W = [sum(nums[i:i + k]) for i in range(m)]       # window sums, recomputed from scratch
    best = -1
    ans = [0, 0, 0]
    for a in range(m):
        for b in range(a + k, m):
            for c in range(b + k, m):
                if W[a] + W[b] + W[c] > best:
                    best = W[a] + W[b] + W[c]
                    ans = [a, b, c]
    return ans` }, { lang: 'js', code: String.raw`
function maxSumOfThreeSubarrays(nums, k) {
  const n = nums.length, m = n - k + 1;
  const W = new Array(m).fill(0);
  for (let i = 0; i < m; i++) for (let j = i; j < i + k; j++) W[i] += nums[j];   // window sums, recomputed from scratch
  let best = -1;
  let ans = [0, 0, 0];
  for (let a = 0; a < m; a++)
    for (let b = a + k; b < m; b++)
      for (let c = b + k; c < m; c++)
        if (W[a] + W[b] + W[c] > best) { best = W[a] + W[b] + W[c]; ans = [a, b, c]; }
  return ans;
}` }, { lang: 'cpp', code: String.raw`
vector<int> maxSumOfThreeSubarrays(vector<int>& nums, int k) {
    int n = nums.size(), m = n - k + 1;
    vector<long long> W(m, 0);
    for (int i = 0; i < m; i++) for (int j = i; j < i + k; j++) W[i] += nums[j];   // window sums, recomputed from scratch
    long long best = -1;
    vector<int> ans(3, 0);
    for (int a = 0; a < m; a++)
        for (int b = a + k; b < m; b++)
            for (int c = b + k; c < m; c++)
                if (W[a] + W[b] + W[c] > best) { best = W[a] + W[b] + W[c]; ans = {a, b, c}; }
    return ans;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] MaxSumOfThreeSubarrays(int[] nums, int k) {
        int n = nums.Length, m = n - k + 1;
        long[] W = new long[m];
        for (int i = 0; i < m; i++) for (int j = i; j < i + k; j++) W[i] += nums[j];   // window sums, recomputed from scratch
        long best = -1;
        int[] ans = new int[3];
        for (int a = 0; a < m; a++)
            for (int b = a + k; b < m; b++)
                for (int c = b + k; c < m; c++)
                    if (W[a] + W[b] + W[c] > best) { best = W[a] + W[b] + W[c]; ans = new[] { a, b, c }; }
        return ans;
    }
}` }] }
    },
    mcq: { q: `<p>With the middle window starting at j, which windows are allowed on the left?</p>`, options: ['Starts 0..j − k', 'Starts 0..j − 1', 'Starts 0..j', 'Any start'], answer: 0, explain: `<p>The left window must end before j: its start a satisfies a + k − 1 &lt; j, i.e. a ≤ j − k. Similarly the right window starts at ≥ j + k.</p>` },
    hints: [
      `<p><b>Aha:</b> fix the middle window. Then you need "best window entirely on the left" and "best window entirely on the right" — prefix max and suffix max over window sums.</p>`,
      `<p>Build window sums W with prefix sums. left[i] = index of best W in 0..i (strict &gt; keeps the earliest). right[i] = index of best W in i..m−1 (≥ while scanning right-to-left keeps the earliest).</p>`,
      `<p><b>Traps:</b> tie-breaking for the lexicographically smallest answer (strict vs non-strict comparisons); middle j ranges from k to m − 1 − k.<br><b>Recipe:</b> W, left, right; for j in k..m−1−k: total = W[left[j−k]] + W[j] + W[right[j+k]]; keep the strict best.</p>`
    ],
    tests: { sig: 'int[] int -> int[]', fn: 'maxSumOfThreeSubarrays', cases: [
        [[[1, 2, 1, 2, 6, 7, 5, 1], 2], [0, 3, 5]],
        [[[1, 2, 1, 2, 1, 2, 1, 2, 1], 2], [0, 2, 4]],
        [[[1, 1, 1], 1], [0, 1, 2]],
        [[[4, 5, 6], 1], [0, 1, 2]],
        [[[7, 7, 7, 7, 7, 7], 2], [0, 2, 4]],
        [[[9, 1, 1, 9, 1, 1, 9, 1, 1], 3], [0, 3, 6]],
        [[[65535, 65535, 65535, 65535, 65535, 65535, 65535, 65535, 65535], 3], [0, 3, 6]],
        [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1], [7, 8, 9]],
        [[[3, 1, 1, 3, 1, 1, 1, 3, 1], 1], [0, 3, 7]]
      ] },
    solution: {
      approach: `<p>Prefix sums → window sums; prefix-argmax and suffix-argmax arrays; one pass over the middle window. Everything is O(N).</p>`,
      code: `
        class Solution {
            public int[] maxSumOfThreeSubarrays(int[] nums, int k) {
                int n = nums.length, m = n - k + 1;
                long[] P = new long[n + 1];
                for (int i = 0; i < n; i++) P[i + 1] = P[i] + nums[i];
                long[] W = new long[m];                           // W[i] = sum of nums[i..i+k-1]
                for (int i = 0; i < m; i++) W[i] = P[i + k] - P[i];

                int[] left = new int[m];                          // best window start in 0..i
                int best = 0;
                for (int i = 0; i < m; i++) {
                    if (W[i] > W[best]) best = i;                 // strict: earliest index wins ties
                    left[i] = best;
                }
                int[] right = new int[m];                         // best window start in i..m-1
                best = m - 1;
                for (int i = m - 1; i >= 0; i--) {
                    if (W[i] >= W[best]) best = i;                // >=: earliest index wins ties
                    right[i] = best;
                }

                int[] ans = {-1, -1, -1};
                long bestSum = -1;
                for (int j = k; j + k < m; j++) {                 // middle window start
                    int a = left[j - k], c = right[j + k];
                    long total = W[a] + W[j] + W[c];
                    if (total > bestSum) {                        // strict: keep lexicographically smallest
                        bestSum = total;
                        ans = new int[]{a, j, c};
                    }
                }
                return ans;
            }

            public static void main(String[] args) {
                int[] r = new Solution().maxSumOfThreeSubarrays(new int[]{1, 2, 1, 2, 6, 7, 5, 1}, 2);
                System.out.println(Arrays.toString(r)); // [0, 3, 5]
            }
        }`,
      alt: [
        { lang: 'python', code: `from itertools import accumulate

def max_sum_of_three_subarrays(nums, k):
    P = [0, *accumulate(nums)]
    W = [P[i + k] - P[i] for i in range(len(nums) - k + 1)]   # window sums
    m = len(W)
    left, best = [0] * m, 0
    for i in range(m):                     # best start in 0..i, earliest on ties
        if W[i] > W[best]:
            best = i
        left[i] = best
    right, best = [0] * m, m - 1
    for i in range(m - 1, -1, -1):         # best start in i..m-1, earliest on ties
        if W[i] >= W[best]:
            best = i
        right[i] = best
    ans, best_sum = None, -1
    for j in range(k, m - k):              # middle window start
        a, c = left[j - k], right[j + k]
        total = W[a] + W[j] + W[c]
        if total > best_sum:               # strict: keep the lexicographically smallest
            best_sum, ans = total, [a, j, c]
    return ans` },
        { lang: 'js', code: `function maxSumOfThreeSubarrays(nums, k) {
  const n = nums.length, m = n - k + 1;
  const P = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + nums[i];
  const W = Array.from({ length: m }, (_, i) => P[i + k] - P[i]);   // window sums
  const left = new Array(m), right = new Array(m);
  for (let i = 0, best = 0; i < m; i++) {          // best start in 0..i, earliest on ties
    if (W[i] > W[best]) best = i;
    left[i] = best;
  }
  for (let i = m - 1, best = m - 1; i >= 0; i--) { // best start in i..m-1, earliest on ties
    if (W[i] >= W[best]) best = i;
    right[i] = best;
  }
  let ans = [-1, -1, -1], bestSum = -1;
  for (let j = k; j + k < m; j++) {                // middle window start
    const a = left[j - k], c = right[j + k], total = W[a] + W[j] + W[c];
    if (total > bestSum) { bestSum = total; ans = [a, j, c]; }   // strict: lexicographically smallest
  }
  return ans;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> maxSumOfThreeSubarrays(vector<int>& nums, int k) {
        int n = nums.size(), m = n - k + 1;
        vector<long long> P(n + 1, 0), W(m);
        for (int i = 0; i < n; i++) P[i + 1] = P[i] + nums[i];
        for (int i = 0; i < m; i++) W[i] = P[i + k] - P[i];   // window sums
        vector<int> left(m), right(m);
        for (int i = 0, best = 0; i < m; i++) {              // best start in 0..i, earliest on ties
            if (W[i] > W[best]) best = i;
            left[i] = best;
        }
        for (int i = m - 1, best = m - 1; i >= 0; i--) {     // best start in i..m-1, earliest on ties
            if (W[i] >= W[best]) best = i;
            right[i] = best;
        }
        vector<int> ans{-1, -1, -1};
        long long bestSum = -1;
        for (int j = k; j + k < m; j++) {                    // middle window start
            int a = left[j - k], c = right[j + k];
            long long total = W[a] + W[j] + W[c];
            if (total > bestSum) { bestSum = total; ans = {a, j, c}; }   // strict: lexicographically smallest
        }
        return ans;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] MaxSumOfThreeSubarrays(int[] nums, int k) {
        int n = nums.Length, m = n - k + 1;
        long[] P = new long[n + 1];
        for (int i = 0; i < n; i++) P[i + 1] = P[i] + nums[i];
        long[] W = new long[m];                           // W[i] = sum of nums[i..i+k-1]
        for (int i = 0; i < m; i++) W[i] = P[i + k] - P[i];

        int[] left = new int[m];                          // best window start in 0..i
        int best = 0;
        for (int i = 0; i < m; i++) {
            if (W[i] > W[best]) best = i;                 // strict: earliest index wins ties
            left[i] = best;
        }
        int[] right = new int[m];                         // best window start in i..m-1
        best = m - 1;
        for (int i = m - 1; i >= 0; i--) {
            if (W[i] >= W[best]) best = i;                // >=: earliest index wins ties
            right[i] = best;
        }

        int[] ans = { -1, -1, -1 };
        long bestSum = -1;
        for (int j = k; j + k < m; j++) {                 // middle window start
            int a = left[j - k], c = right[j + k];
            long total = W[a] + W[j] + W[c];
            if (total > bestSum) {                        // strict: keep lexicographically smallest
                bestSum = total;
                ans = new[] { a, j, c };
            }
        }
        return ans;
    }
}` }
      ],
      dry: { head: ['j (middle)', 'left[j−k]', 'right[j+k]', 'W sums', 'total'], rows: [['2', '0', '4', '3 + 3 + 13', '19'], ['3', '0', '5', '3 + 8 + 12', H.c('p', '23')], ['4', '0', '6', '3 + 13 + 6', '22']] },
      complexity: `<p><b>Time O(N)</b>, <b>space O(N)</b> for W, left and right.</p>`,
      followUps: ['Two non-overlapping subarrays with different lengths L and M (LeetCode 1031).', 'Generalise to m subarrays (DP over windows).']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: `<p>A grid <code>g</code> has 3 rows and 5 columns (Java <code>new int[3][5]</code>, Python <code>[[0] * 5 for _ in range(3)]</code>). What is the length of <code>g[0]</code> (<code>g[0].length</code> / <code>len(g[0])</code>)?</p>`, options: ['5 (number of columns)', '3 (number of rows)', '15', 'It depends on the values'], answer: 0, explain: `<p><code>g.length</code> is the number of rows (3). <code>g[0]</code> is the first row array, whose length is the number of columns (5).</p>` },
    { q: `<p>Using the padded prefix array P (P[0] = 0, P[i+1] = P[i] + A[i]), the sum of A[L..R] inclusive is…</p>`, options: ['P[R+1] − P[L]', 'P[R] − P[L]', 'P[R] − P[L−1]', 'P[R+1] − P[L−1]'], answer: 0, explain: `<p>P[R+1] covers A[0..R] and P[L] covers A[0..L−1]; their difference is exactly A[L..R]. The unpadded formula pf[R] − pf[L−1] is the same thing shifted by one.</p>` },
    { q: `<p>Which range question can prefix sums NOT answer in O(1)?</p>`, options: ['Maximum value in A[L..R]', 'Sum of A[L..R]', 'XOR of A[L..R]', 'Number of even values in A[L..R]'], answer: 0, explain: `<p>Prefix tricks need an operation you can undo (subtract, XOR again). You cannot "un-max" a prefix. Range max needs a sparse table or segment tree.</p>` },
    { q: `<p>You delete index i from an array. Elements to the right of i…</p>`, options: ['Change parity (even ↔ odd index)', 'Keep their parity', 'Are deleted too', 'Only the next one changes parity'], answer: 0, explain: `<p>Each right-side element moves from index j to j − 1, which flips parity. That is why the right-side even and odd sums swap in the special-index formula.</p>` },
    { q: `<p>To count pairs (i &lt; j) with S[i] = 'a' and S[j] = 'g' while scanning left to right, at each 'g' you add…</p>`, options: ['The number of a\'s seen so far', '1', 'The number of g\'s seen so far', 'The index j'], answer: 0, explain: `<p>Every earlier 'a' forms a pair with this 'g'. Carrying the count of a's turns an O(N<sup>2</sup>) double loop into one pass.</p>` },
    { q: `<p>Kadane's algorithm on [−5, −2, −8] should return…</p>`, options: ['−2', '0', '−15', '−5'], answer: 0, explain: `<p>Subarrays must be non-empty, so the best is the single largest element −2. Initialising best = 0 would wrongly return 0.</p>` },
    { q: `<p>In Kadane's recurrence <code>cur = max(A[i], cur + A[i])</code>, choosing A[i] ("start fresh") happens exactly when…</p>`, options: ['The previous cur was negative', 'A[i] is negative', 'A[i] is the maximum so far', 'i is even'], answer: 0, explain: `<p>A[i] &gt; cur + A[i] ⇔ cur &lt; 0. A negative running sum is baggage that can only lower every future total.</p>` },
    { q: `<p>In an array of length N = 6, how many subarrays contain index 1 (0-indexed)?</p>`, options: ['10 = 2 × 5', '6', '12', '5'], answer: 0, explain: `<p>Starts: 0 or 1 (2 choices). Ends: 1..5 (5 choices). 2 × 5 = 10.</p>` },
    { q: `<p>Trapping Rain Water: a bar of height 2 has max-left 5 and max-right 3. Water above it is…</p>`, options: ['1', '3', '0', '2'], answer: 0, explain: `<p>min(5, 3) − 2 = 1. Water rises only to the shorter wall.</p>` },
    { q: `<p>In the two-pointer rain-water method, if leftMax ≤ rightMax, you…</p>`, options: ['Add leftMax − h[L] and move L right', 'Add rightMax − h[R] and move R left', 'Move both pointers', 'Swap leftMax and rightMax'], answer: 0, explain: `<p>Bar L's true right wall is at least rightMax ≥ leftMax, so leftMax is its limiting wall — its water is known now.</p>` },
    { q: `<p>Spiral traversal of a 1 × 4 matrix. Which guard prevents reading the row twice?</p>`, options: ['if (top ≤ bottom) before the ← walk', 'if (left ≤ right) before the → walk', 'while (top &lt; bottom)', 'No guard is needed'], answer: 0, explain: `<p>After → the top wall moves below the bottom wall. Without the check, the ← walk would read row 0 backwards a second time.</p>` },
    { q: `<p>Which sequence rotates a square matrix 90° <b>clockwise</b> in place?</p>`, options: ['Transpose, then reverse each row', 'Transpose, then reverse the order of rows', 'Reverse each row, then reverse each column', 'Transpose twice'], answer: 0, explain: `<p>Transpose: (r, c) → (c, r). Reverse each row: (c, r) → (c, N−1−r). Combined: the clockwise mapping. Transpose + reversing row order gives anti-clockwise.</p>` },
    { q: `<p>Staircase search in a row- and column-sorted matrix starts at the top-right. The value is smaller than the target. You…</p>`, options: ['Move down (drop this row)', 'Move left (drop this column)', 'Move up', 'Stop: not found'], answer: 0, explain: `<p>Everything to the left in this row is even smaller, so the whole row is useless — move down.</p>` },
    { q: `<p>2D prefix query with padded P for rectangle (r1, c1)..(r2, c2):</p>`, options: ['P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]', 'P[r2][c2] − P[r1][c1]', 'P[r2+1][c2+1] − P[r1][c1]', 'P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1]'], answer: 0, explain: `<p>Big block minus the top strip minus the left strip plus the corner that was subtracted twice (inclusion–exclusion).</p>` },
    { q: `<p>N = Q = 10<sup>5</sup> range-sum queries on a static array. Which complexity should you aim for?</p>`, options: ['O(N + Q) with prefix sums', 'O(N · Q) with loops', 'O(N<sup>2</sup>)', 'O(Q log Q) by sorting queries'], answer: 0, explain: `<p>N·Q = 10<sup>10</sup> is far above the ~10<sup>8</sup> operations/second budget. One O(N) build plus O(1) per query is about 2 × 10<sup>5</sup> steps.</p>` },
    { q: `<p>Why store prefix sums of 10<sup>5</sup> values up to 10<sup>9</sup> as 64-bit integers (<code>long[]</code> / <code>long long</code>)?</p>`, options: ['Totals reach 10<sup>14</sup>, beyond int\'s ~2.1 × 10<sup>9</sup>', 'long is faster than int', 'The language requires it for arrays', 'To allow negative numbers'], answer: 0, explain: `<p>int overflows silently (wraps around) at 2<sup>31</sup> − 1 ≈ 2.1 × 10<sup>9</sup>. long holds up to about 9.2 × 10<sup>18</sup>.</p>` }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    { q: `<p>Why is accessing <code>a[i]</code> O(1), and why is inserting at the front of an array O(N)?</p>`, level: 'B', a: `<p>An array is one contiguous block of equal-sized slots, so the address of slot i is <code>base + i × size</code> — one multiply and one add, regardless of i. That is O(1) random access. Inserting at the front means every existing element must shift one slot right to make room, which touches all N elements: O(N). Appending at the end of a dynamic array (ArrayList / list / Array / vector) is O(1) amortized because capacity doubles when full, so the total copying over N appends is at most about 2N.</p>`, followUps: ['What is amortized analysis?', 'How does a 2D array of row arrays (Java, Python, JS) differ from a C/C++ built-in 2D array in memory?', 'When would you choose a linked list over a dynamic array (LinkedList vs ArrayList, list vs deque)?'] },
    { q: `<p>Explain prefix sums to a non-programmer and state the formula for a range sum.</p>`, level: 'B', a: `<p>It is a running scoreboard: after each item, write down the total so far. To get the total of items L through R, take the scoreboard reading at R and subtract the reading just before L — no re-adding. With a padded array P (P[0] = 0, P[i+1] = P[i] + A[i]), <code>sum(L..R) = P[R+1] − P[L]</code>. Building takes O(N) once; every query is O(1). I always mention <code>long</code> for overflow, and that it only works when the array does not change — otherwise I would use a Fenwick tree.</p>`, followUps: ['How would you support point updates?', 'What is a difference array?', 'Does it work with negative numbers?'] },
    { q: `<p>Walk me through Kadane's algorithm and prove it is correct.</p>`, level: 'I', a: `<p>Let cur be the best sum of a subarray ending exactly at i. Any such subarray is either just A[i] or extends a subarray ending at i − 1, and among those the best one to extend is the one with sum cur(i−1). So <code>cur(i) = max(A[i], cur(i−1) + A[i])</code>, and the answer is the max of cur over all i, because the optimal subarray ends somewhere. It is DP with a one-variable state: O(N) time, O(1) space. Initialise best with A[0], not 0, to handle all-negative arrays. To return indices, remember where the current run started whenever I restart, and record (start, i) whenever best improves.</p>`, followUps: ['How do you handle a circular array?', 'What changes for maximum product?', 'How would you find the max-sum rectangle in a matrix?'] },
    { q: `<p>How does the contribution technique compute the sum of all subarray sums in O(N)?</p>`, level: 'I', a: `<p>Instead of iterating over the ~N<sup>2</sup>/2 subarrays, I swap the order of summation: each A[i] is added once for every subarray that contains it. A subarray containing i starts at any of the i + 1 positions 0..i and ends at any of the N − i positions i..N−1, so it appears in (i+1)(N−i) subarrays. The answer is Σ A[i]·(i+1)(N−i), one pass. I cast to long before multiplying, since (N/2)<sup>2</sup>·10<sup>9</sup> can approach 10<sup>18</sup>, and apply mod per factor if the problem asks for it.</p>`, followUps: ['Sum over only odd-length subarrays?', 'Sum of subarray minimums?', 'What is the 2D version for submatrices?'] },
    { q: `<p>Solve Trapping Rain Water and explain the O(1)-space version.</p>`, level: 'I', a: `<p>Water on bar i is <code>min(maxLeft(i), maxRight(i)) − h[i]</code> where both maxes include h[i]. Building a prefix-max array left to right and a suffix-max array right to left gives O(N) time and O(N) space. For O(1) space I use two pointers at the ends with running leftMax and rightMax. If leftMax ≤ rightMax, bar L's real right wall is at least rightMax, so its water is exactly leftMax − h[L]; I add it and move L inward. Otherwise I settle bar R symmetrically. Every step settles one bar, so it is O(N).</p>`, followUps: ['What about the 2D version (Trapping Rain Water II)?', 'Can you solve it with a monotonic stack?', 'Why must LMax include h[i]?'] },
    { q: `<p>What is "carry forward" and how do you decide which direction to scan?</p>`, level: 'B', a: `<p>Carry forward means keeping a small summary of everything already scanned — a count, a running max/min, a last-seen index — so each new element is processed in O(1) without looking back. The direction follows the question: if each element is compared with things on its right ("greater than everything to its right", "pairs with a later g"), scan right to left so the right side is already summarised; if it is "so far" or "before", scan left to right. When both sides matter, do both passes and store the per-index results (prefix and suffix arrays).</p>`, followUps: ['Give an example where you need to carry two values.', 'How does this relate to streaming systems?', 'Count leaders in O(N) and O(1) space.'] },
    { q: `<p>How do you rotate an N × N matrix by 90° clockwise in place, and what about a rectangular matrix?</p>`, level: 'I', a: `<p>A clockwise rotation maps (r, c) to (c, N−1−r). I split it into two reflections: transpose (swap g[r][c] with g[c][r] for c &gt; r only, otherwise each pair swaps twice) and then reverse each row. Both are O(N<sup>2</sup>) with O(1) extra space. Anti-clockwise is transpose plus reversing the row order. An alternative is rotating each ring with four-way swaps. A rectangular R × C matrix becomes C × R, so it cannot be done in place; I allocate a new matrix and write res[c][R−1−r] = g[r][c].</p>`, followUps: ['How would you rotate by 270°?', 'How do image libraries avoid moving pixels (EXIF orientation)?', 'Write the four-way swap version.'] },
    { q: `<p>Explain the spiral traversal and the most common bug.</p>`, level: 'B', a: `<p>I keep four walls — top, bottom, left, right — describing the unvisited rectangle. Each lap walks right along top (then top++), down along right (right−−), left along bottom (bottom−−), and up along left (left++), looping while top ≤ bottom and left ≤ right. The classic bug is when the middle shrinks to a single row or column: the ← walk would re-read the row and the ↑ walk would re-read the column. The fix is to guard the ← walk with <code>if (top ≤ bottom)</code> and the ↑ walk with <code>if (left ≤ right)</code>. I always test 1 × N, N × 1 and 3 × 4.</p>`, followUps: ['Generate the spiral matrix for n.', 'Spiral outward from a given cell.', 'What is the extra space?'] },
    { q: `<p>A matrix has sorted rows and sorted columns. How do you search it, and how does it differ from LeetCode 74?</p>`, level: 'I', a: `<p>Start at the top-right corner where left is smaller and down is bigger. If the value equals the target, done; if it is bigger, the whole column below is bigger too, so move left; if smaller, the whole row to the left is smaller, so move down. Each step eliminates a row or column, so at most R + C − 1 steps: O(R + C). In LeetCode 74 each row starts after the previous row ends, so the matrix is one sorted list in row-major order; then I binary-search the flat index range 0..R·C−1 mapping mid to (mid / C, mid % C), O(log RC). Flat binary search is wrong for the row-column-sorted version because the flattened order is not sorted.</p>`, followUps: ['Find the k-th smallest element in such a matrix.', 'Count negatives in a sorted matrix.', 'Why not start at the top-left?'] },
    { q: `<p>Derive the 2D prefix sum build and query formulas.</p>`, level: 'I', a: `<p>Let P be (R+1) × (C+1) with a zero first row and column, P[i][j] = sum of A[0..i−1][0..j−1]. To build P[i+1][j+1], add A[i][j] to the block above (P[i][j+1]) and the block to the left (P[i+1][j]); the top-left block P[i][j] is in both, so subtract it once. For a query (r1, c1)..(r2, c2): take the big block P[r2+1][c2+1], subtract the strip above (P[r1][c2+1]) and the strip to the left (P[r2+1][c1]), and add back the corner P[r1][c1], which was subtracted twice. Build O(R·C), query O(1). It is inclusion–exclusion; in 3D it uses 8 terms.</p>`, followUps: ['How would you support updates? (2D Fenwick tree)', 'Find the max-sum K × K square.', 'What is an integral image?'] },
    { q: `<p>Find the maximum-sum submatrix of an R × C matrix efficiently.</p>`, level: 'A', a: `<p>Brute force over all rectangles with a 2D prefix table is O(R<sup>2</sup>C<sup>2</sup>). Better: fix a top row, then extend a bottom row one at a time while maintaining an array col[c] = sum of column c between top and bottom (just add the new row). For each (top, bottom) pair, the best rectangle is the max subarray of col, which Kadane finds in O(C). Total O(R<sup>2</sup>·C), space O(C). If R &gt; C, I transpose first so the squared factor is the smaller dimension. With a "sum ≤ K" constraint I would replace Kadane with prefix sums plus an ordered-set ceiling lookup (Java TreeSet, C++ std::set lower_bound, Python sortedcontainers), O(R<sup>2</sup>·C log C).</p>`, followUps: ['Count submatrices with sum equal to target.', 'Return the rectangle coordinates.', 'What if the matrix is 10 × 10<sup>5</sup>?'] },
    { q: `<p>How would you handle many range updates followed by queries, without a segment tree?</p>`, level: 'A', a: `<p>If all updates come before the reads, I use a difference array. To add v to A[L..R], do D[L] += v and D[R+1] −= v; each update is O(1). After all updates, one prefix-sum pass over D rebuilds the final array in O(N), and then a second prefix pass gives O(1) range-sum queries. In 2D, each rectangle update touches four corners of D and a 2D prefix sum rebuilds the grid. If updates and queries are interleaved, the difference array no longer works and I would move to a Fenwick tree with range-update/range-query (two BITs) or a lazy segment tree.</p>`, followUps: ['Car pooling / corporate flight bookings.', 'Range update + point query with a BIT.', 'What if values must be taken modulo M?'] },
    { q: `<p>Find the first missing positive integer in O(N) time and O(1) space.</p>`, level: 'A', a: `<p>The answer must lie in 1..N+1 because N numbers can cover at most 1..N. So the array's own N slots can act as a presence table: value v belongs at index v − 1. For each i, while nums[i] is in 1..N and nums[nums[i] − 1] ≠ nums[i], swap it to its home. The duplicate check avoids infinite loops, and since each swap places a value permanently, total swaps ≤ N, giving O(N). Then the first index i with nums[i] ≠ i + 1 gives the answer i + 1; if all match, the answer is N + 1. An alternative marks presence by negating nums[v − 1] after replacing non-positives with N + 1.</p>`, followUps: ['Find all disappeared numbers.', 'Find the duplicate and missing number.', 'Why is the loop O(N) despite the inner while?'] },
    { q: `<p>An AI assistant gave you a prefix-sum solution that passes the samples. How do you review it before trusting it?</p>`, level: 'E', a: `<p>First I check the constraints-to-complexity fit: build once in O(N), O(1) per query. Then the index convention: padded P[R+1] − P[L] versus unpadded pf[R] − pf[L−1] — generated code often mixes them and silently drops A[L] or crashes at L = 0. I check types (long for totals, + MOD before % MOD), that the array is truly static, and edge cases N = 1, L = R, L = 0, all negatives. Finally I write a tiny brute-force oracle and a randomized stress test comparing both on thousands of small inputs — the fastest way to catch off-by-one bugs that samples miss. I treat AI output as a draft from a fast junior engineer: useful, but I own correctness.</p>`, followUps: ['How would you write the stress test?', 'What would make you switch to a Fenwick tree?', 'Which bugs do LLMs most often introduce in matrix code?'] }
  );

  // Spread correct answers across option positions (deterministic rotation; explanations never refer to option letters).
  (function () {
    var k = 0;
    function rot(q) {
      if (!q || !q.options) return;
      k++;
      var n = q.options.length, shift = (k * 7 + 3) % n;
      if (!shift) return;
      var correct = q.options[q.answer];
      q.options = q.options.slice(shift).concat(q.options.slice(0, shift));
      q.answer = q.options.indexOf(correct);
    }
    quiz.forEach(rot);
    topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rot(p.mcq); }); });
    practice.forEach(function (p) { rot(p.mcq); });
  })();

  registerModule({
    id: 'dsa05',
    title: 'Arrays, Prefix Sums & Carry Forward',
    intro: `<p>Arrays are the bread and butter of coding interviews — a large share of first-round questions are array or matrix questions in disguise. In this module you learn how arrays and matrices really sit in memory, and then a toolbox of <b>"remember-as-you-go"</b> tricks that turn slow O(N<sup>2</sup>) loops into fast O(N) ones:</p>
      <ul>
        <li><b>Prefix sums</b> — running totals that answer any range-sum question with one subtraction (plus even/odd-index versions and a 2D version for matrices).</li>
        <li><b>Carry forward</b> — carry one helpful number (a count, a max, a min, a last index) along the loop instead of looking back every time.</li>
        <li><b>Kadane's algorithm</b> — the best subarray sum in one pass (your first taste of dynamic programming).</li>
        <li><b>Contribution technique</b> — ask "how many times is each element counted?" instead of listing every subarray.</li>
        <li><b>Prefix / suffix max</b> — the left-pass + right-pass trick behind Trapping Rain Water.</li>
        <li><b>Matrix moves</b> — spiral walk with four shrinking walls, 90° rotation by transpose + reverse, the staircase search in a row-and-column sorted matrix, and 2D prefix sums for any rectangle sum in O(1).</li>
      </ul>
      <p>Every idea starts with an everyday picture, then small numbers you can check by hand, then clean commented code in Java, Python, JavaScript and C++ (pick your language on any code block). Watch each visualizer step by step (change the input!), try the guided problems before peeking at hints, and finish with the mixed practice set, quiz and interview questions.</p>`,
    goals: [
      'Explain why <code>a[i]</code> is O(1), how a 2D array is laid out (an array of row arrays in Java, Python and JS; one row-major block for a C++ built-in array), and convert between flat index and (row, col)',
      'Build 1D, even/odd-index and 2D prefix sums and answer any range or rectangle sum in O(1) without off-by-one errors',
      'Recognise carry-forward problems (pair counts, leaders, best-so-far) and solve them in one O(N) pass with O(1) memory',
      'Code Kadane\'s algorithm from memory, return the subarray indices, and adapt it to circular, product and 2D variants',
      'Use the contribution technique to sum over all subarrays/submatrices in O(N) or O(N·M)',
      'Solve Trapping Rain Water three ways and explain why the two-pointer step is safe',
      'Implement spiral traversal, in-place 90° rotation and staircase search in a sorted matrix, handling non-square and single-row edge cases'
    ],
    prereqs: `DSA 1 (Programming Foundations for DSA — Java loops, arrays, methods) and DSA 2 (Math Foundations &amp; Time/Space Complexity — counting loop iterations, the 10<sup>8</sup> operations/second rule). DSA 4 (Bit Manipulation) is helpful for the XOR prefix examples but not required.`,
    hours: 14,
    langNotes: {
      java: `<p><b>Java:</b> <code>int</code> overflow wraps silently, so keep prefix sums, pair counts and Kadane totals in <code>long</code> and cast before multiplying (<code>(long) a * b</code>). <code>new int[n]</code> is zero-filled; <code>a.length</code> is a field, <code>list.size()</code> a method. <code>int[][]</code> is an array of row arrays, so <code>g.clone()</code> is shallow. Return <code>List&lt;Integer&gt;</code> only when asked; boxed <code>Integer</code> lists are slower and compare with <code>equals</code>, not <code>==</code>, above 127. Nothing here recurses, so the ~10k-frame stack limit does not matter.</p>`,
      python: `<p><b>Python:</b> ints never overflow, so no <code>long</code> worries — but big sums are slower. <code>itertools.accumulate</code> builds a prefix sum in one line (<code>[0, *accumulate(a)]</code> gives the padded version). Make a grid with <code>[[0] * C for _ in range(R)]</code>; <code>[[0] * C] * R</code> repeats <b>one</b> row object R times. <code>b = a</code> aliases; copy with <code>a[:]</code> or <code>a.copy()</code>. Negative indices wrap around (<code>a[-1]</code> is the last item), so an off-by-one bug can read the wrong cell instead of crashing. <code>list.insert(0, x)</code> and <code>list.pop(0)</code> are O(n). Plain loops over 10<sup>6</sup> cells take about a second; prefer built-ins like <code>sum</code>, <code>zip</code> and slicing.</p>`,
      js: `<p><b>JavaScript:</b> every number is a double, exact only up to 2<sup>53</sup> ≈ 9 × 10<sup>15</sup>. Prefix sums of 10<sup>5</sup> values of 10<sup>9</sup> (10<sup>14</sup>) are safe; the contribution total in "Sum of All Subarray Sums" can reach 10<sup>18</sup>, so that solution uses <code>BigInt</code>. <code>%</code> keeps the sign of the dividend (<code>-7 % 3 === -1</code>) and <code>x | 0</code> truncates to 32 bits. Build grids with <code>Array.from({ length: R }, () =&gt; new Array(C).fill(0))</code>; <code>new Array(R).fill(row)</code> shares one row. Reading past the end gives <code>undefined</code> (no error), and <code>undefined + 1</code> is <code>NaN</code>. <code>arr.sort()</code> compares as strings unless you pass <code>(a, b) =&gt; a - b</code>; <code>shift</code>/<code>unshift</code> are O(n).</p>`,
      cpp: `<p><b>C++:</b> signed overflow is undefined behaviour, so use <code>long long</code> for sums and write <code>accumulate(v.begin(), v.end(), 0LL)</code> (a plain <code>0</code> sums in <code>int</code>). <code>vector&lt;int&gt; b = a;</code> <b>copies</b> (unlike Java/Python/JS); pass <code>vector&lt;int&gt;&amp;</code> or <code>const&amp;</code> to avoid copies. <code>a[i]</code> has no bounds check (use <code>a.at(i)</code> while debugging). <code>partial_sum</code>, <code>reverse</code> and <code>swap</code> cover the prefix, rotation and transpose steps. <code>int g[R][C]</code> is one row-major block; <code>vector&lt;vector&lt;int&gt;&gt;</code> is one block per row. Mixing <code>size_t</code> (unsigned) with <code>int</code> breaks loops like <code>i &gt;= 0</code>; cast sizes to <code>int</code>.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
