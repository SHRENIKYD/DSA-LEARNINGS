(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* ---------- shared helpers (py15) ---------- */
  // Every test evaluates a Python expression against the solution; errors come back as '!ErrorName'.
  var HARNESS = { python: 'def t_val(src):\n    try:\n        return eval(src)\n    except Exception as e:\n        return \'!\' + type(e).__name__' };
  function T(cases, extra) {
    var t = { sig: 'string -> string', fn: 't_val', cases: cases, harness: HARNESS };
    if (extra) Object.keys(extra).forEach(function (k) { t[k] = extra[k]; });
    return t;
  }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function tb(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function vp(obj, hlKeys, label) {
    var vals = {}, hl = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    if (hlKeys) String(hlKeys).split(',').forEach(function (k) { hl[k] = 'ok'; });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl };
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function words(s) { return String(s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }
  function nums(s, max) {
    var a = words(s).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x); })) throw new Error('Enter numbers separated by spaces, e.g. 3 1 4 1 5');
    if (a.length > (max || 12)) throw new Error('Use at most ' + (max || 12) + ' numbers');
    return a;
  }
  function fmt(x) { return x === null ? 'NaN' : (Math.round(x * 1000) / 1000).toString(); }

  /* ================= TOPIC 1: ndarray, dtypes, vectorization ================= */
  topics.push({
    title: 'NumPy Arrays: One Block of Memory, One dtype, Vectorized Math',
    analogy: `<p>A Python list is a <b>shoe box of name tags</b>: every slot holds a pointer to a separate object somewhere else in memory, and each object can be anything. A NumPy array is an <b>egg carton</b>: every cell is the same size, holds the same kind of thing, and sits right next to its neighbours. Because the carton is uniform, a machine can process a whole row of eggs in one sweep instead of picking up each item, checking what it is and putting it back.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>np.array([1, 2, 3])</code> builds an <b>ndarray</b>: one contiguous buffer of raw numbers plus a little header that says the <b>dtype</b> (what each cell holds, e.g. <code>int64</code>), the <b>shape</b> (e.g. <code>(3,)</code> or <code>(2, 3)</code>) and the <b>strides</b> (how many bytes to jump to reach the next element along each axis).</p>
${H.table(['', 'Python list', 'NumPy ndarray'], [['Storage', 'array of pointers to boxed objects (28+ bytes per int)', 'raw values packed together (8 bytes per int64)'], ['Element types', 'anything, mixed', 'one dtype for all cells'], ['<code>a + b</code>', 'concatenation', 'element-wise addition'], ['Loop speed', 'interpreter per element', 'compiled C loop over the buffer']])}
<p>🔵 <b>Vectorization</b> means writing the math for the <i>whole array</i> — <code>prices * qty</code>, <code>np.sqrt(x)</code>, <code>x[x &gt; 0]</code> — and letting NumPy run one compiled loop (a <b>ufunc</b>) instead of a Python <code>for</code> loop. Typical speed-up: 10–100× for simple arithmetic on a million elements.</p>
<p><b>dtypes you must know:</b> <code>int8/16/32/64</code>, <code>uint8</code>, <code>float32/64</code>, <code>bool</code>, <code>complex128</code>, fixed-width strings like <code>&lt;U5</code>, <code>datetime64[ns]</code>, and <code>object</code> (an array of Python pointers — it loses all the speed). NumPy picks a dtype from the data: <code>[1, 2.5]</code> → <code>float64</code>; <code>[1, 'a']</code> → <code>&lt;U21</code> strings. Each element is converted on the way in.</p>
<p><b>Fixed width means overflow.</b> An <code>int8</code> holds −128…127. Array arithmetic <b>wraps around silently</b> (two's complement), like a car odometer: <code>np.array([100], dtype=np.int8) + 100</code> gives <code>[-56]</code>. In NumPy 2.x (NEP 50) a Python int that does not fit the array's dtype, like <code>np.int8 array + 300</code>, raises <code>OverflowError</code> instead of quietly upcasting. Python ints never overflow; NumPy ints do.</p>
<p><b>Aggregations take an <code>axis</code>:</b> <code>m.sum(axis=0)</code> collapses rows (one result per column), <code>axis=1</code> collapses columns (one result per row). Think "the axis you name is the one that disappears".</p>`,
    clues: [
      '"process a million numbers fast in Python" → a NumPy array with vectorized ufuncs, not a for loop',
      '"why is my sum negative / wrong for big counts?" → fixed-width integer overflow (int8/int32 wrap), cast to int64 or float64',
      '"memory of a list of 10<sup>7</sup> floats" → about 8 bytes each in float64 vs ~32 bytes per element for list pointer + float object',
      '"sum per column / per row" → <code>axis=0</code> / <code>axis=1</code>; the named axis disappears',
      '"array has dtype object" → you lost vectorization; find the mixed or ragged input',
      '"select values greater than X" → a boolean mask <code>a[a &gt; X]</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'ndarray basics (NumPy 2.x)', code: R`import numpy as np

a = np.array([3, 1, 4, 1, 5])          # dtype int64 on Linux/macOS
print(a.dtype, a.shape, a.nbytes)      # int64 (5,) 40
m = np.arange(6).reshape(2, 3)         # [[0 1 2] [3 4 5]]
print(m.sum(axis=0))                   # [3 5 7]  (rows collapse)
print(m.sum(axis=1))                   # [ 3 12]  (columns collapse)

x = np.array([100, 120], dtype=np.int8)
print(x + x)                           # [-56 -16]  silent wrap-around
print(x.astype(np.int16) + x)          # [200 240]  widen first

prices = np.array([9.5, 20.0, 3.25])
qty = np.array([2, 1, 4])
print((prices * qty).sum())            # 52.0  one compiled loop
print(prices[prices > 5])              # [ 9.5 20. ] boolean mask` }, { lang: 'python', run: true, title: 'Plain-Python model of a strided 2-D array', code: R`# NumPy stores a 2x3 int array as ONE flat buffer plus shape and strides.
buf = [0, 1, 2, 3, 4, 5]
shape = (2, 3)
itemsize = 8
strides = (3 * itemsize, itemsize)     # bytes to step along axis 0 and axis 1

def get(i, j):
    offset = i * strides[0] + j * strides[1]
    return buf[offset // itemsize]

print(get(1, 2))                       # 5
# A transpose is just swapped shape and strides: no data is copied.
t_strides = (strides[1], strides[0])
def get_t(i, j):
    return buf[(i * t_strides[0] + j * t_strides[1]) // itemsize]
print([[get_t(i, j) for j in range(2)] for i in range(3)])  # [[0, 3], [1, 4], [2, 5]]` }],
    codeTitle: ['ndarray, axis, overflow', 'Strides by hand'],
    viz: [{
      title: 'Python loop vs one vectorized ufunc call',
      input: '3 1 4 1 5',
      inputLabel: 'Numbers in the array (max 8)',
      gen: function (input) {
        var a = nums(input, 8), frames = [], out = [];
        frames.push(fr('We want <code>a * 2 + 1</code>. A Python loop handles one boxed object per step: fetch, check its type, call <code>__mul__</code>, allocate a new int, append.', [{ type: 'array', label: 'a (one contiguous int64 buffer)', values: a.slice(), showIdx: true }, vp({ dtype: 'int64', shape: '(' + a.length + ',)', nbytes: a.length * 8 })]));
        for (var i = 0; i < a.length; i++) {
          out.push(a[i] * 2 + 1);
          var hl = {}; hl[i] = 'cur';
          frames.push(fr('Python loop step ' + (i + 1) + ': <code>' + a[i] + ' * 2 + 1 = ' + (a[i] * 2 + 1) + '</code>. Each step pays interpreter overhead (type checks, object allocation).', [{ type: 'array', label: 'a', values: a.slice(), hl: hl, showIdx: true }, { type: 'array', label: 'result so far (list)', values: out.slice() }]));
        }
        var all = {}; a.forEach(function (_, k) { all[k] = 'win'; });
        frames.push(fr('Vectorized: <code>a * 2 + 1</code> calls the <b>multiply</b> ufunc once on the whole buffer (a tight C loop, often SIMD), producing a temporary array…', [{ type: 'array', label: 'a', values: a.slice(), hl: all }, { type: 'array', label: 'tmp = a * 2', values: a.map(function (v) { return v * 2; }) }]));
        frames.push(fr('…then the <b>add</b> ufunc once more. Two C loops total, no per-element Python work. Same answer, typically 10–100× faster at a million elements.', [{ type: 'array', label: 'a * 2 + 1', values: out.slice(), hl: all }, vp({ 'python ops': a.length * 2, 'ufunc calls': 2 }, 'ufunc calls')]));
        return frames;
      }
    }, {
      title: 'int8 overflow: the odometer wraps',
      input: '100 27 1 120',
      inputLabel: 'Values to keep adding into an int8 (max 8)',
      gen: function (input) {
        var a = nums(input, 8), frames = [], acc = 0, real = 0;
        frames.push(fr('An <code>int8</code> cell holds −128…127 (256 values). We add each number with <code>np.int8</code> arithmetic and compare with Python\'s unbounded int.', [vp({ int8: 0, python: 0 })]));
        a.forEach(function (v) {
          real += v;
          var raw = acc + v;
          acc = ((raw + 128) % 256 + 256) % 256 - 128;
          var wrapped = raw !== acc;
          frames.push(fr('Add ' + v + ': exact total ' + raw + '. ' + (wrapped ? '<span class="c-r">Out of range</span> → wraps by 256 to <b>' + acc + '</b>. No error, no warning for arrays.' : 'Still in range, int8 holds it exactly.'), [vp({ int8: acc, python: real }, wrapped ? 'int8' : '')]));
        });
        frames.push(fr('Fix: widen first (<code>.astype(np.int64)</code>) or pick the dtype for the <b>result</b>, e.g. <code>a.sum(dtype=np.int64)</code>.', [vp({ 'int8 result': acc, 'correct result': real }, 'correct result')]));
        return frames;
      }
    }],
    examples: [
      { title: 'dtype is chosen from all the data', html: `<p>One float makes the whole array float; one string makes it a string array. Predict the dtypes:</p>${H.table(['Input', 'dtype'], [['<code>np.array([1, 2, 3])</code>', 'int64'], ['<code>np.array([1, 2.5])</code>', 'float64'], ['<code>np.array([True, 2])</code>', 'int64'], ['<code>np.array([1, "a"])</code>', '&lt;U21 (strings!)'], ['<code>np.array([[1, 2], [3]], dtype=object)</code>', 'object (ragged; NumPy 2 refuses without dtype=object)']])}`, code: { lang: 'python', check: false, code: R`import numpy as np
print(np.array([1, "a"]))       # ['1' 'a']  -> 1 became the string '1'
print(np.array([1, 2.5]).dtype) # float64` } },
      { title: 'Boolean masks replace if-inside-loop', html: `<p>"Give every score under 40 a +5 bonus." Build a True/False array and use it to select and assign.</p>`, code: { lang: 'python', check: false, code: R`import numpy as np
s = np.array([35, 80, 39, 60])
s[s < 40] += 5            # [40 80 44 60]
print(np.where(s > 50, 'pass', 'fail'))  # ['fail' 'pass' 'fail' 'pass']` } },
      { title: 'Memory per element', html: `<p>For 10 million float values: a NumPy <code>float64</code> array is about <b>80 MB</b>; a list is 8-byte pointers (80 MB) <i>plus</i> a 24-byte float object each (240 MB) ≈ <b>320 MB</b>. <code>float32</code> halves the array to 40 MB if 7 significant digits are enough.</p>`, code: { lang: 'python', run: true, code: R`import sys
xs = [float(i) for i in range(1000)]
per_item = 8 + sys.getsizeof(xs[1])        # pointer + float object
print('list bytes per float ~', per_item)  # ~32
print('float64 bytes per value =', 8)` } }
    ],
    deepDive: `<p>🟣 <b>Why vectorized code is fast.</b> A ufunc gets a pointer to the buffer, a stride and a count, and runs a loop compiled for that exact dtype, frequently with SIMD instructions that process 4–16 values per CPU instruction. There is no reference counting, no type dispatch and no allocation per element. The cost that remains is <b>temporary arrays</b>: <code>a * 2 + 1</code> allocates one temporary; for huge arrays use in-place forms (<code>np.multiply(a, 2, out=a)</code>, <code>a += 1</code>) or <code>numexpr</code>.</p>
<p><b>NumPy 2.x changes worth knowing:</b> NEP 50 scalar promotion (a NumPy scalar's dtype wins: <code>np.float32(3) + 3.0</code> stays <code>float32</code>), Python ints that do not fit the array's dtype raise <code>OverflowError</code>, <code>np.int_</code> is now 64-bit on Windows too, ragged nested lists raise <code>ValueError</code> unless you pass <code>dtype=object</code>, and a new <code>StringDType</code> for variable-length strings. Integer division by zero gives 0 with a warning; float division gives <code>inf</code>/<code>nan</code>.</p>
<p><b>Floating point:</b> <code>0.1 + 0.2 != 0.3</code> in NumPy too; compare with <code>np.isclose</code>/<code>np.allclose</code>. <code>np.nan != np.nan</code>, so test with <code>np.isnan</code>. Summation of float32 over millions of values loses precision; NumPy uses pairwise summation to limit it, but accumulate in float64 when it matters.</p>`,
    aiEra: `<p>🤖 Copilots write NumPy fluently, but they often produce code that is <i>correct but slow</i> (a Python loop over <code>arr[i]</code>, or <code>np.append</code> inside a loop, which copies the whole array every time — O(n²)). Ask the assistant for "a fully vectorized version" and check that no Python loop touches individual elements. They also forget dtype limits: an LLM summing <code>uint8</code> image pixels will happily wrap at 255. Your value as the engineer is knowing the memory layout and dtype rules well enough to spot those bugs, and to judge when an array library (NumPy, PyTorch, JAX, CuPy) with the same API is the right tool. Tensors in ML frameworks follow exactly these shape, dtype and broadcasting rules.</p>`,
    problems: [{
      title: 'Simulate Fixed-Width Integer Wrap-Around',
      level: 'Easy', tags: ['dtype', 'overflow', 'two\'s complement'], companies: ['Two Sigma', 'Jane Street'],
      statement: `<p>NumPy signed integer arrays wrap around on overflow. Write <code>wrap_int(values, bits)</code> that returns what <code>np.array(values).astype(f'int{bits}')</code> would hold: each Python int reduced to a signed two's-complement integer of width <code>bits</code> (8, 16, 32 or 64).</p>`,
      constraints: `0 ≤ len(values) ≤ 10<sup>5</sup>; values are any Python ints; bits ∈ {8, 16, 32, 64}.`,
      example: `<p><code>wrap_int([100, 127, 128, 255, 256, -129], 8)</code> → ${H.c('g', '[100, 127, -128, -1, 0, 127]')}. 128 is one past the top, so it becomes the bottom (−128); 256 is exactly one full turn, so 0.</p>`,
      brute: { why: `<p>Simulate the odometer: while the value is above the max, subtract 2<sup>bits</sup>; while below the min, add it. Correct, but a value like 10<sup>18</sup> with bits = 8 needs ~4·10<sup>15</sup> loop steps.</p>`, code: R`def wrap_int(values, bits):
    lo, hi, span = -(1 << (bits - 1)), (1 << (bits - 1)) - 1, 1 << bits
    out = []
    for v in values:
        while v > hi:
            v -= span            # one full turn of the odometer at a time
        while v < lo:
            v += span
        out.append(v)
    return out

print(wrap_int([100, 128, 256], 8))` },
      mcq: { q: 'What does <code>np.array([200], dtype=np.int16).astype(np.int8)</code> hold?', options: ['200', '127 (clipped)', '-56', 'It raises OverflowError'], answer: 2, explain: 'astype between integer types keeps the low 8 bits: 200 − 256 = −56. Casting never clips and never raises.' },
      hints: ['Hint 1: An n-bit signed integer has 2<sup>n</sup> possible values, from −2<sup>n−1</sup> to 2<sup>n−1</sup> − 1. Overflow means "same value modulo 2<sup>n</sup>".', 'Hint 2: Shift the range so it starts at 0, take Python\'s <code>%</code> (always non-negative for a positive modulus), then shift back.', 'Hint 3: <code>half = 1 &lt;&lt; (bits - 1)</code>; answer is <code>(v + half) % (2 * half) - half</code>. Check −129 → 127 and 256 → 0.'],
      tests: T([
        [['wrap_int([100, 127, 128, 255, 256, -129], 8)'], [100, 127, -128, -1, 0, 127]],
        [['wrap_int([], 8)'], []],
        [['wrap_int([-128, -1, 0], 8)'], [-128, -1, 0]],
        [['wrap_int([1000], 8)'], [-24]],
        [['wrap_int([32767, 32768, 65535], 16)'], [32767, -32768, -1]],
        [['wrap_int([2 ** 31, 2 ** 31 - 1], 32)'], [-2147483648, 2147483647]],
        [['wrap_int([2 ** 63], 64)'], ['-9223372036854775808']],
        [['wrap_int([10 ** 18], 8)'], [0]],
        [['len(wrap_int(list(range(100000)), 16))'], 100000]
      ]),
      solution: {
        approach: `<p>Two's complement is arithmetic modulo 2<sup>bits</sup>, re-centred so the range is [−half, half). Shift by +half, reduce with <code>%</code>, shift back. O(1) per value regardless of size. In NumPy itself: <code>np.array(values, dtype=np.int64).astype(np.int8)</code> (values must fit int64 first).</p>`,
        code: R`def wrap_int(values, bits):
    half = 1 << (bits - 1)          # 128 for int8
    span = half << 1                # 256 for int8
    return [(v + half) % span - half for v in values]

print(wrap_int([100, 127, 128, 255, 256, -129], 8))   # [100, 127, -128, -1, 0, 127]
print(wrap_int([32768], 16))                          # [-32768]`,
        dry: { head: ['v', 'v + 128', '% 256', '− 128'], rows: [['128', '256', '0', '<span class="c-g">-128</span>'], ['255', '383', '127', '<span class="c-g">-1</span>'], ['-129', '-1', '255', '<span class="c-g">127</span>']] },
        complexity: `<p>O(n) time, O(n) output; each value is O(1) for fixed-size ints.</p>`,
        followUps: ['Simulate unsigned <code>uint8</code> (just <code>v % 256</code>).', 'Write <code>add_int8(a, b)</code> for two arrays and compare with <code>np.add</code>.']
      }
    }]
  });

  /* ================= TOPIC 2: broadcasting, views vs copies ================= */
  topics.push({
    title: 'Broadcasting, Reshaping, and Views vs Copies',
    analogy: `<p>Broadcasting is like a <b>teacher writing one instruction on the board</b> — "add 5 points" — instead of handing every student a personal copy. Each row of students "sees" the same instruction stretched across them, but only one copy exists. A <b>view</b> is like looking at the same class photo through a cut-out frame: you see part of it, and if someone draws on the photo, your frame shows the drawing too. A <b>copy</b> is a photocopy: draw on it all you want, the original stays clean.</p>`,
    explain: `<p>🟢 <b>Broadcasting</b> lets arrays of different shapes take part in one operation without copying data. NumPy lines the shapes up from the <b>right</b> and checks each pair of sizes:</p>
<ol><li>If one shape is shorter, pad it on the <b>left</b> with 1s.</li><li>Each pair must be <b>equal</b>, or one of them must be <b>1</b> (that side is stretched).</li><li>Otherwise: <code>ValueError: operands could not be broadcast together</code>.</li></ol>
${H.table(['A', 'B', 'Result'], [['(4, 3)', '(3,)', '(4, 3) — row added to every row'], ['(4, 1)', '(1, 3)', '(4, 3) — outer table'], ['(4, 3)', '(4,)', '<span class="c-r">error</span>: 3 vs 4'], ['(4, 3)', '(4, 1)', '(4, 3) — column added to every column'], ['(5, 1, 7)', '(6, 1)', '(5, 6, 7)']])}
<p>Classic use: centre each column of a data matrix with <code>X - X.mean(axis=0)</code> (shape (n, d) minus (d,)). To work per row, keep the axis: <code>X - X.mean(axis=1, keepdims=True)</code> gives (n, 1), which stretches across columns.</p>
<p>🔵 <b>Reshaping</b>: <code>reshape</code>, <code>.T</code>, <code>a[:, None]</code> (or <code>np.newaxis</code>) add or reorder axes. <code>reshape(-1)</code> lets NumPy work out one dimension.</p>
<p>🔵 <b>Views vs copies.</b> Basic slicing (<code>a[1:4]</code>, <code>a[::2]</code>, <code>a[:, 0]</code>), <code>reshape</code> (when possible), <code>.T</code> and <code>ravel</code> (when contiguous) return <b>views</b> that share memory. <b>Fancy indexing</b> (<code>a[[0, 2]]</code>) and <b>boolean masks</b> (<code>a[a &gt; 0]</code>) always return <b>copies</b>. Writing into a view changes the original; writing into a copy does not. Check with <code>np.shares_memory(a, b)</code> or <code>b.base is a</code>; force a copy with <code>.copy()</code>.</p>`,
    clues: [
      '"subtract the mean of each column" / "normalize features" → broadcasting with <code>axis=0</code> means',
      '"operands could not be broadcast together with shapes" → align trailing dimensions; add an axis with <code>[:, None]</code> or <code>keepdims=True</code>',
      '"pairwise distances between all points" → (n,1,d) − (1,m,d) broadcast to (n,m,d)',
      '"I changed a slice and the original array changed" → basic slicing returns a view',
      '"I assigned through a[mask][i] and nothing changed" → masks and fancy indexing make copies',
      '"outer product / multiplication table" → <code>a[:, None] * b[None, :]</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'Broadcasting and views (NumPy 2.x)', code: R`import numpy as np

X = np.array([[1., 2.], [3., 4.], [5., 9.]])   # shape (3, 2)
print(X - X.mean(axis=0))                        # column means [3, 5] stretched over rows
print(X / X.sum(axis=1, keepdims=True))          # (3,2) / (3,1): each row sums to 1

a = np.arange(3)
print(a[:, None] * a[None, :])                   # 3x3 multiplication table

pts = np.random.default_rng(0).random((4, 2))
d = np.sqrt(((pts[:, None, :] - pts[None, :, :]) ** 2).sum(axis=-1))  # (4,4) distances

b = np.arange(6)
v = b[1:4]          # view
v[0] = 99
print(b)            # [ 0 99  2  3  4  5]  original changed
c = b[[1, 2]]       # fancy index -> copy
c[0] = -1
print(b[1])         # 99, unchanged
print(np.shares_memory(b, v), np.shares_memory(b, c))  # True False` }],
    codeTitle: 'Broadcasting, keepdims, views',
    viz: [{
      title: 'Broadcast shape check, right to left',
      input: '5 1 7 | 6 1',
      inputLabel: 'Shape A | Shape B (e.g. 4 3 | 3)',
      gen: function (input) {
        var p = String(input).split('|');
        if (p.length !== 2) throw new Error('Use two shapes separated by |, e.g. 4 3 | 3');
        var A = p[0].trim() ? nums(p[0], 5) : [], B = p[1].trim() ? nums(p[1], 5) : [];
        var n = Math.max(A.length, B.length), frames = [];
        var pa = [], pb = [];
        for (var i = 0; i < n - A.length; i++) pa.push(1);
        for (i = 0; i < n - B.length; i++) pb.push(1);
        pa = pa.concat(A); pb = pb.concat(B);
        frames.push(fr('Shapes A = (' + A.join(', ') + ') and B = (' + B.join(', ') + '). Rule 1: pad the shorter shape on the <b>left</b> with 1s so both have ' + n + ' dims.', [{ type: 'array', label: 'A padded', values: pa.slice() }, { type: 'array', label: 'B padded', values: pb.slice() }]));
        var res = new Array(n).fill('?'), ok = true;
        for (var k = n - 1; k >= 0; k--) {
          var x = pa[k], y = pb[k], hl = {}; hl[k] = 'cur';
          var r;
          if (x === y) r = x; else if (x === 1) r = y; else if (y === 1) r = x; else r = null;
          if (r === null) {
            hl[k] = 'bad';
            frames.push(fr('Axis ' + k + ': ' + x + ' vs ' + y + ' — not equal and neither is 1. <span class="c-r">ValueError: operands could not be broadcast together.</span>', [{ type: 'array', label: 'A padded', values: pa.slice(), hl: hl }, { type: 'array', label: 'B padded', values: pb.slice(), hl: hl }]));
            ok = false; break;
          }
          res[k] = r;
          frames.push(fr('Axis ' + k + ': ' + x + ' vs ' + y + ' → ' + (x === y ? 'equal, keep ' + r : 'one side is 1, stretch it to ' + r) + '. Stretching costs no memory: that axis just gets stride 0.', [{ type: 'array', label: 'A padded', values: pa.slice(), hl: hl }, { type: 'array', label: 'B padded', values: pb.slice(), hl: hl }, { type: 'array', label: 'result shape', values: res.slice() }]));
        }
        if (ok) frames.push(fr('All axes compatible. Result shape is <b>(' + res.join(', ') + ')</b>.', [{ type: 'array', label: 'result shape', values: res.slice(), hl: Object.fromEntries(res.map(function (_, j) { return [j, 'ok']; })) }]));
        return frames;
      }
    }, {
      title: 'View vs copy: who sees the write?',
      input: '0 1 2 3 4 5',
      inputLabel: 'Values in b (max 8)',
      gen: function (input) {
        var b = nums(input, 8), frames = [];
        if (b.length < 4) throw new Error('Give at least 4 numbers');
        frames.push(fr('<code>b</code> owns its buffer.', [{ type: 'array', label: 'b (buffer)', values: b.slice(), showIdx: true }]));
        frames.push(fr('<code>v = b[1:4]</code> is a <b>view</b>: a new header (offset 1, length 3) pointing into the <i>same</i> buffer.', [{ type: 'array', label: 'b (buffer)', values: b.slice(), range: [1, 3], showIdx: true }, vp({ 'v.base is b': 'True' })]));
        var b2 = b.slice(); b2[1] = 99;
        frames.push(fr('<code>v[0] = 99</code> writes into the shared buffer, so <b>b[1] changes too</b>.', [{ type: 'array', label: 'b (buffer)', values: b2.slice(), hl: { 1: 'bad' }, showIdx: true }, { type: 'array', label: 'v', values: b2.slice(1, 4), hl: { 0: 'cur' } }]));
        var c = [b2[1], b2[2]];
        frames.push(fr('<code>c = b[[1, 2]]</code> uses <b>fancy indexing</b>: NumPy gathers the values into a <b>new</b> buffer (a copy).', [{ type: 'array', label: 'b', values: b2.slice() }, { type: 'array', label: 'c (own buffer)', values: c.slice(), hl: { 0: 'ok', 1: 'ok' } }]));
        c[0] = -1;
        frames.push(fr('<code>c[0] = -1</code> touches only the copy. <code>b</code> is unchanged. Masks like <code>b[b &gt; 2]</code> behave the same way.', [{ type: 'array', label: 'b', values: b2.slice() }, { type: 'array', label: 'c', values: c.slice(), hl: { 0: 'cur' } }, vp({ 'np.shares_memory(b, c)': 'False' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Row-normalise with keepdims', html: `<p><code>X.sum(axis=1)</code> has shape (n,) and would line up with the <b>columns</b> (error or a silent wrong answer when n equals the number of columns). <code>keepdims=True</code> gives (n, 1), which lines up with rows.</p>`, code: { lang: 'python', check: false, code: R`import numpy as np
X = np.array([[1., 3.], [2., 2.]])
print(X / X.sum(axis=1))                 # WRONG: divides column j by row-sum j
print(X / X.sum(axis=1, keepdims=True))  # [[0.25 0.75] [0.5 0.5]]` } },
      { title: 'Broadcasting in plain Python (what the C loop does)', html: `<p>Shape (3, 1) + (1, 2): an index on a size-1 axis is always 0.</p>`, code: { lang: 'python', run: true, code: R`a = [[10], [20], [30]]      # shape (3, 1)
b = [[1, 2]]                # shape (1, 2)
out = [[a[i][0] + b[0][j] for j in range(2)] for i in range(3)]
print(out)                  # [[11, 12], [21, 22], [31, 32]]` } },
      { title: 'The mask-assignment trap', html: `<p><code>a[a &gt; 0][0] = 5</code> does nothing to <code>a</code>: <code>a[a &gt; 0]</code> is a copy and you wrote into the copy. Write <code>a[np.flatnonzero(a &gt; 0)[0]] = 5</code>, or use a single indexing operation on the left-hand side like <code>a[a &gt; 0] = 5</code> (that one calls <code>__setitem__</code> on <code>a</code> directly).</p>`, code: { lang: 'python', check: false, code: R`import numpy as np
a = np.array([-1, 2, 3])
a[a > 0][0] = 5     # no effect
a[a > 0] = 5        # works: [-1 5 5]` } }
    ],
    deepDive: `<p>🟣 <b>How broadcasting is free:</b> NumPy builds a view of the small array whose stretched axes have <b>stride 0</b> — moving along that axis re-reads the same bytes. <code>np.broadcast_to(x, shape)</code> exposes exactly this (read-only). The output array, however, is full size: (10<sup>4</sup>, 1) − (1, 10<sup>4</sup>) allocates 10<sup>8</sup> float64 = 800 MB. Pairwise-distance tricks blow up memory fast; chunk the rows or use <code>scipy.spatial.distance.cdist</code>.</p>
<p><b>When reshape copies:</b> reshape returns a view if the new shape can be expressed with strides over the existing buffer, otherwise a copy (for example reshaping a transposed, non-contiguous array). <code>arr.shape = new</code> raises instead of copying. <code>ravel</code> may return a view, <code>flatten</code> always copies. <b>C order vs F order:</b> rows contiguous vs columns contiguous; iterating along the contiguous axis is cache-friendly and can be several times faster.</p>
<p><b>Keeping a tiny view alive keeps the whole buffer alive</b>: <code>small = huge[:10]</code> pins all of <code>huge</code> in memory. Use <code>huge[:10].copy()</code> when the big array should be freed.</p>`,
    aiEra: `<p>🤖 Shape bugs are the most common error in AI-generated array and tensor code, and they are dangerous when the shapes happen to broadcast anyway — <code>(n,) - (n, 1)</code> silently makes an (n, n) matrix. Build the habit of asserting shapes (<code>assert X.shape == (n, d)</code>) and asking the assistant to annotate every line with its shape. The same rules apply in PyTorch and JAX, where an unintended broadcast can cost gigabytes of GPU memory. Tools like jaxtyping let you put shapes in type hints so reviewers and linters catch these mistakes.</p>`,
    problems: [{
      title: 'Compute the Broadcast Shape',
      level: 'Medium', tags: ['broadcasting', 'shapes'], companies: ['Google', 'NVIDIA', 'Meta'],
      statement: `<p>Implement <code>broadcast_shape(a, b)</code>, where <code>a</code> and <code>b</code> are shapes given as lists of non-negative ints. Return the broadcast result shape as a list, or raise <code>ValueError</code> if they are incompatible. This is what <code>np.broadcast_shapes</code> does.</p>`,
      constraints: `0 ≤ len(a), len(b) ≤ 32; sizes ≥ 0. A size 0 is legal: (0,) with (1,) → (0,), but (0,) with (3,) is an error.`,
      example: `<p><code>broadcast_shape([5, 1, 7], [6, 1])</code> → ${H.c('g', '[5, 6, 7]')}. Right to left: 7 vs 1 → 7; 1 vs 6 → 6; 5 vs (missing = 1) → 5. <code>broadcast_shape([4, 3], [4])</code> → ${H.c('r', 'ValueError')} (3 vs 4).</p>`,
      brute: { why: `<p>Actually build nested lists of those shapes and try to add them element by element. Correct for tiny shapes, but memory is the product of all sizes — (1000, 1000, 1000) is 10<sup>9</sup> cells just to learn the answer is (1000, 1000, 1000).</p>`, code: R`def broadcast_shape(a, b):
    # left-pad, then compare every axis by trying every size pairing (wasteful but literal)
    n = max(len(a), len(b))
    a = [1] * (n - len(a)) + list(a)
    b = [1] * (n - len(b)) + list(b)
    out = []
    for x, y in zip(a, b):
        sizes = {x, y} - {1}
        if len(sizes) > 1:
            raise ValueError('shapes do not broadcast')
        out.append(sizes.pop() if sizes else 1)
    return out

print(broadcast_shape([5, 1, 7], [6, 1]))` },
      mcq: { q: 'Which pair does NOT broadcast?', options: ['(8, 1, 6) and (7, 1)', '(3, 4) and (4,)', '(2, 3) and (3, 2)', '(1,) and (0,)'], answer: 2, explain: 'Right-aligned: 3 vs 2 differ and neither is 1. The others work: (8,7,6), (3,4) and (0,).' },
      hints: ['Hint 1: Compare from the last axis backwards. A missing axis counts as size 1.', 'Hint 2: For each pair (x, y): equal → x; x == 1 → y; y == 1 → x; else error. Note 1 vs 0 gives 0.', 'Hint 3: Pad both shapes on the left with 1s to the same length, zip them, apply the rule, raise ValueError on the first conflict.'],
      tests: T([
        [['broadcast_shape([5, 1, 7], [6, 1])'], [5, 6, 7]],
        [['broadcast_shape([4, 3], [3])'], [4, 3]],
        [['broadcast_shape([4, 3], [4])'], '!ValueError'],
        [['broadcast_shape([], [2, 3])'], [2, 3]],
        [['broadcast_shape([], [])'], []],
        [['broadcast_shape([3, 1], [1, 4])'], [3, 4]],
        [['broadcast_shape([0], [1])'], [0]],
        [['broadcast_shape([0], [3])'], '!ValueError'],
        [['broadcast_shape([2, 1], [8, 4, 3])'], '!ValueError'],
        [['broadcast_shape([8, 1, 6, 1], [7, 1, 5])'], [8, 7, 6, 5]],
        [['broadcast_shape([1], [1])'], [1]]
      ]),
      solution: {
        approach: `<p>Right-align by padding the shorter shape with leading 1s, then apply the per-axis rule. O(max(len)) time, no arrays built. In NumPy: <code>np.broadcast_shapes((5, 1, 7), (6, 1))</code>.</p>`,
        code: R`def broadcast_shape(a, b):
    n = max(len(a), len(b))
    a = [1] * (n - len(a)) + list(a)     # missing leading axes act like size 1
    b = [1] * (n - len(b)) + list(b)
    out = []
    for x, y in zip(a, b):
        if x == y or y == 1:
            out.append(x)
        elif x == 1:
            out.append(y)
        else:
            raise ValueError(f'cannot broadcast {x} with {y}')
    return out

print(broadcast_shape([5, 1, 7], [6, 1]))   # [5, 6, 7]`,
        dry: { head: ['axis', 'a', 'b', 'result'], rows: [['0', '5', '1 (pad)', '5'], ['1', '1', '6', '6'], ['2', '7', '1', '7'], ['—', '', '', '<span class="c-g">[5, 6, 7]</span>']] },
        complexity: `<p>O(k) time and space for k = max(len(a), len(b)).</p>`,
        followUps: ['Generalise to any number of shapes (fold pairwise).', 'Return also, for each input, which axes get stride 0.']
      }
    }]
  });

  /* ================= TOPIC 3: Series, DataFrame, loc/iloc, filtering ================= */
  topics.push({
    title: 'pandas Series & DataFrame: Labels, loc vs iloc, and Filtering',
    analogy: `<p>A DataFrame is a <b>spreadsheet with name tags</b>. Each column is a NumPy-style array of one type (a <b>Series</b>), and every row carries a label in the <b>index</b> — like seat numbers in a theatre. <code>iloc</code> means "the 3rd seat from the left, whoever sits there" (position). <code>loc</code> means "seat <i>B12</i>, wherever it is in the row" (label). Mixing them up is how people end up in the wrong seat.</p>`,
    explain: `<p>🟢 <b>Series</b> = values + an <b>index</b> of labels + a name. <b>DataFrame</b> = a dict of Series that share one index; each column has its own dtype. Operations between Series <b>align on labels</b>, not positions: adding two Series whose labels differ gives <code>NaN</code> where a label is missing on one side.</p>
${H.table(['Want', 'Write', 'Notes'], [['one column', '<code>df["price"]</code>', 'returns a Series'], ['several columns', '<code>df[["price", "qty"]]</code>', 'list → DataFrame'], ['rows by label', '<code>df.loc["b":"d"]</code>', '<b>both ends included</b>'], ['rows by position', '<code>df.iloc[1:3]</code>', 'end excluded, like Python'], ['cell', '<code>df.loc["b", "price"]</code> / <code>df.at[...]</code>', '<code>at</code>/<code>iat</code> fastest for one value'], ['filter rows', '<code>df[(df.qty &gt; 2) &amp; (df.city == "NY")]</code>', 'use <code>&amp; | ~</code> with parentheses, not <code>and/or</code>'], ['membership', '<code>df[df.city.isin(["NY", "LA"])]</code>', ''], ['SQL-like', '<code>df.query("qty &gt; 2 and city == \'NY\'")</code>', 'string expression']])}
<p>🔵 <b>Why <code>&amp;</code> and parentheses?</b> <code>df.qty &gt; 2</code> is a boolean Series; Python's <code>and</code> would call <code>bool()</code> on it and raise "The truth value of a Series is ambiguous". <code>&amp;</code> binds tighter than <code>&gt;</code>, so each comparison needs its own parentheses.</p>
<p>🔵 <b>Assign with one <code>loc</code> call</b>: <code>df.loc[df.qty &gt; 2, "flag"] = True</code>. The chained form <code>df[df.qty &gt; 2]["flag"] = True</code> writes into a temporary and is silently lost. In pandas 2.x it raises <code>SettingWithCopyWarning</code> (or a <code>ChainedAssignmentError</code> warning with Copy-on-Write enabled); in pandas 3.0, Copy-on-Write is the default and the chained form simply never modifies <code>df</code>.</p>
<p><b>Reading data:</b> <code>pd.read_csv(path, usecols=[...], dtype={...}, parse_dates=[...])</code>; inspect with <code>df.head()</code>, <code>df.info()</code>, <code>df.describe()</code>, <code>df.dtypes</code>, <code>df.shape</code>.</p>`,
    clues: [
      '"rows where X and Y" → boolean mask with <code>&amp;</code> and parentheses, or <code>query</code>',
      '"SettingWithCopyWarning" / "my assignment didn\'t stick" → chained indexing; use one <code>df.loc[mask, col] = v</code>',
      '"label 5 vs the 5th row" → <code>loc</code> (label, inclusive) vs <code>iloc</code> (position, exclusive)',
      '"adding two Series gave NaN" → index alignment on labels; check <code>reset_index</code> or <code>.to_numpy()</code>',
      '"select columns by name pattern" → <code>df.filter(like="2024")</code> or <code>df.loc[:, df.columns.str.startswith("x")]</code>',
      '"set a column as the row key" → <code>set_index</code>; undo with <code>reset_index</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'loc, iloc, masks (pandas 2.x)', code: R`import pandas as pd

df = pd.DataFrame({'city': ['NY', 'LA', 'NY', 'SF'],
                   'qty':  [5, 1, 3, 7],
                   'price': [2.0, 9.5, 4.0, 1.5]},
                  index=['a', 'b', 'c', 'd'])

print(df.loc['b':'c'])          # rows b AND c (inclusive)
print(df.iloc[1:3])             # positions 1, 2 -> same rows here
print(df.loc['c', 'qty'])       # 3
big_ny = df[(df.qty > 2) & (df.city == 'NY')]   # rows a, c
df.loc[df.qty > 2, 'bulk'] = True               # one call: assignment sticks
df['total'] = df.qty * df.price                 # vectorized new column

s1 = pd.Series([1, 2], index=['x', 'y'])
s2 = pd.Series([10, 20], index=['y', 'z'])
print(s1 + s2)                  # x NaN, y 12.0, z NaN  (aligned by label)
print(s1.add(s2, fill_value=0)) # x 1.0, y 12.0, z 20.0` }],
    codeTitle: 'Selecting and filtering',
    viz: [{
      title: 'loc vs iloc on a shuffled index',
      input: 'x a m b q',
      inputLabel: 'Index labels (unique, max 8)',
      gen: function (input) {
        var idx = words(input);
        if (idx.length < 3 || idx.length > 8) throw new Error('Give 3 to 8 unique labels');
        if (new Set(idx).size !== idx.length) throw new Error('Labels must be unique');
        var frames = [], a = idx[1], b = idx[idx.length - 2];
        frames.push(fr('The DataFrame index is <b>not sorted</b>. Each row has a <b>position</b> (0, 1, 2, …) and a <b>label</b>.', [{ type: 'array', label: 'index labels', values: idx.slice(), showIdx: true }]));
        frames.push(fr('<code>df.iloc[1:3]</code>: positions 1 and 2. The stop (3) is <b>excluded</b>, exactly like Python slicing.', [{ type: 'array', label: 'index labels', values: idx.slice(), range: [1, 2], showIdx: true }]));
        var i = idx.indexOf(a), j = idx.indexOf(b);
        frames.push(fr('<code>df.loc["' + esc(a) + '":"' + esc(b) + '"]</code>: find the <b>position</b> of label "' + esc(a) + '" (' + i + ') and of "' + esc(b) + '" (' + j + ')…', [{ type: 'array', label: 'index labels', values: idx.slice(), ptr: (function () { var p = {}; p[i] = 'start'; p[j] = 'stop'; return p; })(), showIdx: true }]));
        var hl = {}; for (var k = i; k <= j; k++) hl[k] = 'ok';
        frames.push(fr('…and return everything from start to stop <b>including</b> the stop label: ' + (j - i + 1) + ' rows. Labels are not numbers, so "one before the stop" would make no sense; that is why loc includes both ends.', [{ type: 'array', label: 'index labels', values: idx.slice(), hl: hl, showIdx: true }]));
        frames.push(fr('A label that does not exist on an <b>unsorted</b> index raises <span class="c-r">KeyError</span>. On a sorted index, pandas can binary-search where the label <i>would</i> go and slice anyway.', [{ type: 'array', label: 'index labels', values: idx.slice() }, vp({ 'df.loc["zzz":]': 'KeyError (unsorted index)' })]));
        return frames;
      }
    }, {
      title: 'Boolean mask filter, step by step',
      input: '5 1 3 7 2',
      inputLabel: 'qty column (max 8 numbers)',
      gen: function (input) {
        var q = nums(input, 8), frames = [], cities = ['NY', 'LA', 'NY', 'SF', 'NY', 'LA', 'SF', 'NY'];
        var rows = q.map(function (v, i) { return [i, cities[i], v]; });
        frames.push(fr('Start with the frame. Goal: <code>df[(df.qty &gt; 2) &amp; (df.city == "NY")]</code>.', [tb('df', ['index', 'city', 'qty'], rows)]));
        var m1 = q.map(function (v) { return v > 2; });
        frames.push(fr('<code>df.qty &gt; 2</code> builds a boolean Series, one value per row, in one vectorized comparison.', [tb('df + mask1', ['index', 'city', 'qty', 'qty > 2'], rows.map(function (r, i) { return r.concat([m1[i] ? 'True' : 'False']); }))]));
        var m2 = rows.map(function (r) { return r[1] === 'NY'; });
        frames.push(fr('<code>df.city == "NY"</code> builds a second mask.', [tb('masks', ['index', 'city', 'qty', 'qty > 2', 'city == NY'], rows.map(function (r, i) { return r.concat([m1[i] ? 'True' : 'False', m2[i] ? 'True' : 'False']); }))]));
        var hl = {}, keep = [];
        rows.forEach(function (r, i) { if (m1[i] && m2[i]) { hl[i] = 'ok'; keep.push(r); } else hl[i] = 'done'; });
        frames.push(fr('<code>&amp;</code> combines them element-wise (never <code>and</code>). True rows are kept.', [tb('combined', ['index', 'city', 'qty'], rows, hl)]));
        frames.push(fr('Result keeps the <b>original index labels</b> (' + keep.map(function (r) { return r[0]; }).join(', ') + '). It is a new object; to modify <code>df</code> use <code>df.loc[mask, col] = …</code>.', [tb('result', ['index', 'city', 'qty'], keep.length ? keep : [['—', '—', '—']])]));
        return frames;
      }
    }],
    examples: [
      { title: 'Alignment surprise', html: `<p>Two Series built from the same list but with different indexes do not add position by position:</p>`, code: { lang: 'python', check: false, code: R`import pandas as pd
a = pd.Series([1, 2, 3])                  # index 0,1,2
b = pd.Series([1, 2, 3], index=[1, 2, 3])
print((a + b).tolist())                   # [nan, 3.0, 5.0, nan]
print(a.to_numpy() + b.to_numpy())        # [2 4 6]  positional` } },
      { title: 'Chained assignment, before and after', html: `<p>Pandas 3.0 makes Copy-on-Write the default; you can opt in on 2.x with <code>pd.set_option("mode.copy_on_write", True)</code>.</p>`, code: { lang: 'python', check: false, code: R`import pandas as pd
df = pd.DataFrame({'qty': [5, 1], 'flag': [False, False]})
df[df.qty > 2]['flag'] = True       # lost: writes to a temporary copy
df.loc[df.qty > 2, 'flag'] = True   # correct
sub = df[df.qty > 2].copy()         # explicit copy when you want an independent frame
sub['flag'] = False                 # no warning, df untouched` } },
      { title: 'Filtering in plain Python (what a mask does)', html: `<p>A mask is a list of booleans the same length as the column; filtering keeps rows where it is True.</p>`, code: { lang: 'python', run: true, code: R`rows = [{'city': 'NY', 'qty': 5}, {'city': 'LA', 'qty': 1}, {'city': 'NY', 'qty': 3}]
mask = [r['qty'] > 2 and r['city'] == 'NY' for r in rows]
print(mask)                                   # [True, False, True]
print([r for r, keep in zip(rows, mask) if keep])` } }
    ],
    deepDive: `<p>🟣 <b>Internals.</b> A DataFrame stores columns of the same dtype together in 2-D NumPy blocks (the BlockManager), so selecting a column is cheap and adding columns one by one in a loop fragments the blocks (pandas warns "DataFrame is highly fragmented"; build all columns at once with <code>pd.concat(axis=1)</code> or <code>assign</code>). Label lookup goes through a hash table on the Index (<code>get_loc</code>), O(1) on average for unique labels; a sorted (monotonic) index additionally allows binary search for slices.</p>
<p><b>Copy-on-Write</b> (opt-in in 2.x, default in 3.0) makes every indexing result behave like a copy while sharing memory until one side is written; this removes <code>SettingWithCopyWarning</code> and many defensive <code>.copy()</code> calls. <b>dtypes in pandas 2.x</b>: NumPy dtypes by default, plus nullable extension dtypes (<code>Int64</code>, <code>boolean</code>, <code>string</code>) and PyArrow-backed dtypes (<code>int64[pyarrow]</code>, <code>string[pyarrow]</code>) that store missing values with a mask instead of turning ints into floats. pandas 3.0 makes a PyArrow-backed <code>str</code> dtype the default for text.</p>`,
    aiEra: `<p>🤖 LLMs produce pandas constantly and the most frequent bugs are exactly the ones in this topic: chained assignment, <code>and</code> instead of <code>&amp;</code>, iloc/loc confusion after a filter (positions changed, labels did not), and silent index alignment. When you review generated code, check every place that assigns into a subset and every place that combines Series from different frames. Also note that many teams now pair pandas with Polars or DuckDB; an assistant can translate between them, but you must know which semantics (inclusive loc, label alignment) do not carry over.</p>`,
    problems: [{
      title: 'Emulate loc and iloc Row Slicing',
      level: 'Easy', tags: ['loc', 'iloc', 'index'], companies: ['Bloomberg', 'Citadel'],
      statement: `<p>Given an index as a list of <b>unique</b> labels (not necessarily sorted), implement <code>iloc_slice(index, i, j)</code> (positions, stop excluded, Python slice rules including negatives and <code>None</code>) and <code>loc_slice(index, start, stop)</code> (labels, <b>both ends included</b>; <code>None</code> means open end). If a non-None label is missing, raise <code>KeyError</code>. If the stop label comes before the start label, return <code>[]</code>.</p>`,
      constraints: `0 ≤ len(index) ≤ 10<sup>5</sup>. Labels are hashable and unique.`,
      example: `<p>index = ['x', 'a', 'm', 'b']. <code>loc_slice(index, 'a', 'b')</code> → ${H.c('g', "['a', 'm', 'b']")} (both ends). <code>iloc_slice(index, 1, 3)</code> → ${H.c('g', "['a', 'm']")} (stop excluded). <code>loc_slice(index, 'a', 'z')</code> → ${H.c('r', 'KeyError')}.</p>`,
      brute: { why: `<p>Walk the list for every call and collect labels between the first match of start and the first match of stop, using a flag. Fine once, but each call is O(n) scanning even for a 2-row slice; pandas uses a hash table from label to position.</p>`, code: R`def loc_slice(index, start, stop):
    out, inside = [], start is None
    if start is not None and start not in index:   # O(n) scan
        raise KeyError(start)
    if stop is not None and stop not in index:
        raise KeyError(stop)
    for lab in index:
        if lab == start:
            inside = True
        if inside:
            out.append(lab)
        if lab == stop:
            break
    return out if inside and (stop is None or stop in out) else []

def iloc_slice(index, i, j):
    return index[i:j]

print(loc_slice(['x', 'a', 'm', 'b'], 'a', 'b'))` },
      mcq: { q: 'Index is [10, 20, 30, 40] (integers). What does <code>s.loc[10:30]</code> return?', options: ['rows with labels 10 and 20', 'rows with labels 10, 20, 30', 'positions 10 to 29', 'an error'], answer: 1, explain: 'loc is label-based and inclusive, even when the labels are integers. iloc[10:30] would be positions and here return nothing.' },
      hints: ['Hint 1: Convert labels to positions; then both slices become ordinary Python list slices.', 'Hint 2: Build <code>pos = {label: i}</code> once. Missing label → <code>KeyError</code> naturally from the dict lookup.', 'Hint 3: loc: lo = pos[start] or 0; hi = pos[stop] + 1 or len; return <code>index[lo:hi]</code> (empty automatically if hi ≤ lo). iloc: <code>index[i:j]</code>.'],
      tests: T([
        [["loc_slice(['x', 'a', 'm', 'b'], 'a', 'b')"], ['a', 'm', 'b']],
        [["iloc_slice(['x', 'a', 'm', 'b'], 1, 3)"], ['a', 'm']],
        [["loc_slice(['x', 'a', 'm', 'b'], 'a', 'z')"], '!KeyError'],
        [["loc_slice(['x', 'a', 'm', 'b'], 'm', 'a')"], []],
        [["loc_slice(['x', 'a', 'm', 'b'], None, 'm')"], ['x', 'a', 'm']],
        [["loc_slice(['x', 'a', 'm', 'b'], 'm', None)"], ['m', 'b']],
        [["loc_slice([10, 20, 30, 40], 10, 30)"], [10, 20, 30]],
        [["iloc_slice([10, 20, 30, 40], -2, None)"], [30, 40]],
        [["loc_slice(['q'], 'q', 'q')"], ['q']],
        [["loc_slice([], None, None)"], []],
        [["len(loc_slice(list(range(100000)), 5, 99999))"], 99995]
      ]),
      solution: {
        approach: `<p>Map labels to positions with a dict (what pandas' Index hash table does), then use plain list slicing. loc adds 1 to the stop position because labels are inclusive.</p>`,
        code: R`def iloc_slice(index, i, j):
    return index[i:j]                       # position based, stop excluded

def loc_slice(index, start, stop):
    pos = {lab: k for k, lab in enumerate(index)}
    lo = 0 if start is None else pos[start]          # KeyError if missing
    hi = len(index) if stop is None else pos[stop] + 1   # inclusive stop
    return index[lo:hi]                     # empty when stop is before start

idx = ['x', 'a', 'm', 'b']
print(loc_slice(idx, 'a', 'b'), iloc_slice(idx, 1, 3))`,
        dry: { head: ['call', 'lo', 'hi', 'result'], rows: [["loc 'a':'b'", '1', '3 + 1 = 4', "['a','m','b']"], ["loc 'm':'a'", '2', '2', '[]'], ['iloc 1:3', '1', '3', "['a','m']"]] },
        complexity: `<p>O(n) to build the map (pandas caches it on the Index), O(k) per slice of k rows.</p>`,
        followUps: ['Support a sorted index where missing labels are allowed (use <code>bisect</code>).', 'What happens in pandas with duplicate labels in a loc slice?']
      }
    }]
  });

  /* ================= TOPIC 4: groupby ================= */
  topics.push({
    title: 'groupby: Split, Apply, Combine',
    analogy: `<p>Sorting laundry: you <b>split</b> the pile into whites, colours and darks, <b>apply</b> a wash cycle to each pile, then <b>combine</b> the clean piles back into the cupboard. <code>groupby</code> is the same three steps for rows: split by a key column, run an aggregation on each group, glue the results into one table with one row per group.</p>`,
    explain: `<p>🟢 <code>df.groupby("city")["sales"].sum()</code> → one row per city with the total. Under the hood pandas computes a group id per row (factorizing the key), then runs a compiled loop that adds each row's value into its group's slot.</p>
${H.table(['Method', 'Output shape', 'Use for'], [['<code>.agg("sum")</code> / <code>.sum()</code>, <code>.mean()</code>, <code>.size()</code>, <code>.count()</code>', 'one row per group', 'summaries'], ['<code>.agg(total=("sales", "sum"), n=("sales", "size"))</code>', 'one row per group, named columns', 'several stats at once (named aggregation)'], ['<code>.transform("sum")</code>', 'same length as the input', 'per-row group stats: share of total, z-score in group'], ['<code>.filter(lambda g: len(g) &gt; 2)</code>', 'subset of original rows', 'drop small groups'], ['<code>.apply(func)</code>', 'whatever func returns', 'last resort: slow, Python per group']])}
<p>🔵 <b>Defaults that bite:</b> <code>sort=True</code> (groups come out sorted by key); <code>dropna=True</code> (rows whose key is NaN are <b>dropped</b> silently); the key becomes the index (use <code>as_index=False</code> or <code>.reset_index()</code> for a flat table). <code>size()</code> counts rows, <code>count()</code> counts non-null values. <code>sum()</code> of an all-NaN group is 0, but <code>mean()</code> is NaN.</p>
<p><b>Common combos:</b> <code>value_counts()</code> = groupby + size + sort descending. <code>groupby(...).cumsum()</code>, <code>.rank()</code>, <code>.shift()</code> and <code>.head(n)</code> return per-row results within each group — the pandas version of SQL window functions.</p>`,
    clues: [
      '"total / average per category" → <code>groupby(key)[col].agg(...)</code>',
      '"add a column with the group\'s total / each row\'s share" → <code>transform</code>, not <code>agg</code>',
      '"top N per group" → <code>sort_values</code> then <code>groupby(...).head(N)</code>, or <code>nlargest</code>',
      '"rows with missing key vanished" → <code>dropna=True</code> default; pass <code>dropna=False</code>',
      '"several statistics with nice names" → named aggregation <code>agg(new=("col", "func"))</code>',
      '"SQL GROUP BY ... HAVING" → <code>groupby().filter()</code> or aggregate then mask'
    ],
    code: [{ lang: 'python', check: false, title: 'groupby patterns (pandas 2.x)', code: R`import pandas as pd

df = pd.DataFrame({'city': ['NY', 'LA', 'NY', None, 'LA'],
                   'sales': [10, 5, 7, 3, None]})

print(df.groupby('city')['sales'].sum())     # LA 5.0, NY 17.0  (None key row dropped)
print(df.groupby('city', dropna=False)['sales'].sum())   # adds a NaN group with 3.0
print(df.groupby('city').agg(total=('sales', 'sum'),
                             rows=('sales', 'size'),
                             non_null=('sales', 'count')))
df['share'] = df.sales / df.groupby('city')['sales'].transform('sum')
print(df.groupby('city', as_index=False)['sales'].mean())  # flat table` }, { lang: 'python', run: true, title: 'Split-apply-combine in plain Python', code: R`from collections import defaultdict

rows = [('NY', 10), ('LA', 5), ('NY', 7), (None, 3), ('LA', None)]
groups = defaultdict(list)                  # split
for city, sales in rows:
    if city is not None:                    # dropna=True on the key
        groups[city].append(sales)
result = {k: sum(v for v in vals if v is not None)   # apply (skip NaN)
          for k, vals in sorted(groups.items())}     # combine, sorted keys
print(result)                               # {'LA': 5, 'NY': 17}` }],
    codeTitle: ['groupby in pandas', 'groupby by hand'],
    viz: [{
      title: 'Split → apply(sum) → combine',
      input: 'NY:10 LA:5 NY:7 SF:2 LA:4',
      inputLabel: 'key:value pairs (max 8)',
      gen: function (input) {
        var pairs = words(input).map(function (w) { var p = w.split(':'); if (p.length !== 2 || isNaN(Number(p[1]))) throw new Error('Use key:value pairs, e.g. NY:10 LA:5'); return [p[0], Number(p[1])]; });
        if (!pairs.length || pairs.length > 8) throw new Error('Use 1 to 8 pairs');
        var frames = [], groups = {}, order = [];
        frames.push(fr('Input rows. Goal: <code>df.groupby("key")["value"].sum()</code>.', [tb('df', ['row', 'key', 'value'], pairs.map(function (p, i) { return [i, p[0], p[1]]; }))]));
        pairs.forEach(function (p, i) {
          if (!(p[0] in groups)) { groups[p[0]] = []; order.push(p[0]); }
          groups[p[0]].push(p[1]);
          var ent = order.map(function (k) { return [k, '[' + groups[k].join(', ') + ']']; });
          var hl = {}; hl[p[0]] = 'cur';
          frames.push(fr('<b>Split</b>: row ' + i + ' has key ' + esc(p[0]) + ' → goes into that bucket. (pandas stores a group id per row instead of real lists.)', [{ type: 'map', label: 'groups', entries: ent, hl: hl }]));
        });
        var sums = order.map(function (k) { return [k, groups[k].reduce(function (a, b) { return a + b; }, 0)]; });
        frames.push(fr('<b>Apply</b>: sum each bucket.', [{ type: 'map', label: 'sum per group', entries: sums }]));
        var sorted = sums.slice().sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
        frames.push(fr('<b>Combine</b>: one row per group, keys <b>sorted</b> (default <code>sort=True</code>) and used as the index.', [tb('result', ['key (index)', 'value'], sorted, Object.fromEntries(sorted.map(function (_, i) { return [i, 'ok']; })))]));
        return frames;
      }
    }],
    examples: [
      { title: 'agg vs transform', html: `<p>Same groups, different output shape:</p>${H.table(['city', 'sales', 'groupby.sum() (agg)', 'transform("sum")'], [['NY', '10', 'LA → 9, NY → 17', '17'], ['LA', '5', '', '9'], ['NY', '7', '', '17'], ['LA', '4', '', '9']])}<p>Use transform when the result goes back onto every row, e.g. <code>df.sales / df.groupby("city").sales.transform("sum")</code>.</p>` },
      { title: 'size vs count', html: `<p><code>size()</code> counts rows including NaN values; <code>count()</code> counts non-null values per column. For city LA with sales [5, NaN]: size = 2, count = 1, sum = 5.0, mean = 5.0.</p>`, code: { lang: 'python', check: false, code: R`import pandas as pd
df = pd.DataFrame({'city': ['LA', 'LA'], 'sales': [5, None]})
g = df.groupby('city')['sales']
print(g.size().item(), g.count().item(), g.sum().item(), g.mean().item())  # 2 1 5.0 5.0` } },
      { title: 'Group by several keys and unstack', html: `<p><code>df.groupby(["city", "month"]).sales.sum()</code> gives a Series with a 2-level MultiIndex. <code>.unstack("month")</code> spreads months into columns (a pivot). <code>.reset_index()</code> flattens it into ordinary columns.</p>`, code: { lang: 'python', check: false, code: R`import pandas as pd
df = pd.DataFrame({'city': ['NY', 'NY', 'LA'], 'month': [1, 2, 1], 'sales': [3, 4, 5]})
print(df.groupby(['city', 'month']).sales.sum().unstack('month', fill_value=0))` } }
    ],
    deepDive: `<p>🟣 <b>How it is fast:</b> pandas factorizes the key into integer codes (hash table, O(n)), then the Cython kernels for <code>sum/mean/min/max/count/std</code> make one pass, accumulating into arrays of length "number of groups". Passing a <b>string name</b> (<code>"sum"</code>) or using the method uses that kernel. Passing a Python <code>lambda</code> to <code>agg</code> or using <code>apply</code> calls Python once per group (and <code>apply</code> may call it more than once to infer the output shape) — often 10–100× slower for many small groups.</p>
<p><b>Categorical keys</b>: <code>observed</code> controls whether unused categories appear (pandas 2.1+ warns that the default will change to <code>observed=True</code>, which is the default in 3.0). <b>Sorting cost</b>: <code>sort=False</code> keeps first-appearance order and skips an O(g log g) sort. <b>Memory</b>: <code>groupby().apply</code> that returns DataFrames concatenates many small frames; prefer <code>transform</code> or vectorized expressions on the whole frame.</p>`,
    aiEra: `<p>🤖 Asking an assistant "average order value by customer segment" usually yields correct groupby code; the subtle issues it misses are NaN keys silently dropped, <code>count</code> vs <code>size</code>, and <code>apply</code> with a lambda where a built-in aggregation exists. In analytics interviews and take-homes you are expected to explain these choices and to sanity-check totals (the grouped sums should add up to the overall sum, unless rows were dropped). The same split-apply-combine idea is how Spark, Polars and SQL engines run GROUP BY, often with hash aggregation in parallel.</p>`,
    problems: [{
      title: 'Implement groupby-aggregate with pandas Defaults',
      level: 'Medium', tags: ['groupby', 'aggregation', 'missing data'], companies: ['Amazon', 'Uber', 'Stripe'],
      statement: `<p>Write <code>groupby_agg(rows, key, col, how)</code>. <code>rows</code> is a list of dicts; <code>how</code> is one of <code>'sum'</code>, <code>'mean'</code>, <code>'count'</code>, <code>'size'</code>, <code>'min'</code>, <code>'max'</code>. Follow pandas defaults: rows whose key is <code>None</code> are dropped; groups are sorted by key; <code>None</code> values are skipped by every aggregation except <code>size</code>. An all-missing group has sum 0, count 0, and mean/min/max <code>None</code>. Return a list of <code>[key, value]</code> pairs.</p>`,
      constraints: `0 ≤ len(rows) ≤ 10<sup>5</sup>; keys are mutually comparable; values are numbers or None.`,
      example: `<p>rows: NY 10, LA 5, NY 7, None 3, LA None. <code>how='sum'</code> → ${H.c('g', "[['LA', 5], ['NY', 17]]")}; <code>'mean'</code> → [['LA', 5.0], ['NY', 8.5]]; <code>'size'</code> → [['LA', 2], ['NY', 2]]; <code>'count'</code> → [['LA', 1], ['NY', 2]].</p>`,
      brute: { why: `<p>For each distinct key, scan all rows again to collect that key's values: O(n · g) for g groups — 10<sup>10</sup> steps when every row is its own group.</p>`, code: R`def groupby_agg(rows, key, col, how):
    keys = sorted({r[key] for r in rows if r[key] is not None})
    out = []
    for k in keys:                                   # one full scan per key
        vals = [r[col] for r in rows if r[key] == k]
        good = [v for v in vals if v is not None]
        if how == 'size':
            out.append([k, len(vals)])
        elif how == 'count':
            out.append([k, len(good)])
        elif how == 'sum':
            out.append([k, sum(good)])
        elif how == 'mean':
            out.append([k, sum(good) / len(good) if good else None])
        else:
            out.append([k, (min if how == 'min' else max)(good) if good else None])
    return out

print(groupby_agg([{'c': 'a', 'v': 1}, {'c': 'a', 'v': 2}], 'c', 'v', 'sum'))` },
      mcq: { q: 'A group\'s values are all NaN. Which pandas result is 0 rather than NaN?', options: ['mean()', 'sum()', 'max()', 'median()'], answer: 1, explain: 'sum uses min_count=0 by default, so the empty sum is 0. mean, max and median of nothing are NaN.' },
      hints: ['Hint 1: One pass is enough if you keep a bucket per key in a dict.', 'Hint 2: Store the raw values (or running sum/count) per key, skipping rows whose key is None. Sort the keys at the end.', 'Hint 3: For each key: good = non-None values. size → all rows, count → len(good), sum → sum(good), mean → sum/len or None, min/max → None when good is empty.'],
      tests: T([
        [["groupby_agg(R, 'city', 'sales', 'sum')"], [['LA', 5], ['NY', 17]]],
        [["groupby_agg(R, 'city', 'sales', 'mean')"], [['LA', 5.0], ['NY', 8.5]]],
        [["groupby_agg(R, 'city', 'sales', 'size')"], [['LA', 2], ['NY', 2]]],
        [["groupby_agg(R, 'city', 'sales', 'count')"], [['LA', 1], ['NY', 2]]],
        [["groupby_agg(R, 'city', 'sales', 'max')"], [['LA', 5], ['NY', 10]]],
        [["groupby_agg([], 'k', 'v', 'sum')"], []],
        [["groupby_agg([{'k': 'a', 'v': None}], 'k', 'v', 'sum')"], [['a', 0]]],
        [["groupby_agg([{'k': 'a', 'v': None}], 'k', 'v', 'mean')"], [['a', null]]],
        [["groupby_agg([{'k': 3, 'v': 1}, {'k': 1, 'v': -4}, {'k': 3, 'v': -2}], 'k', 'v', 'min')"], [[1, -4], [3, -2]]],
        [["groupby_agg([{'k': None, 'v': 1}], 'k', 'v', 'size')"], []],
        [["len(groupby_agg([{'k': i, 'v': i} for i in range(100000)], 'k', 'v', 'sum'))"], 100000]
      ]),
      solution: {
        approach: `<p>Split in one pass into a dict of lists (skipping None keys), then apply the aggregation per bucket and combine in sorted key order. pandas: <code>df.groupby(key)[col].agg(how)</code>.</p>`,
        code: R`from collections import defaultdict

R = [{'city': 'NY', 'sales': 10}, {'city': 'LA', 'sales': 5}, {'city': 'NY', 'sales': 7},
     {'city': None, 'sales': 3}, {'city': 'LA', 'sales': None}]

def groupby_agg(rows, key, col, how):
    buckets = defaultdict(list)
    for r in rows:                         # split: one pass
        if r[key] is not None:             # dropna=True for keys
            buckets[r[key]].append(r[col])
    out = []
    for k in sorted(buckets):              # sort=True
        vals = buckets[k]
        good = [v for v in vals if v is not None]
        if how == 'size':
            res = len(vals)
        elif how == 'count':
            res = len(good)
        elif how == 'sum':
            res = sum(good)                # empty sum is 0
        elif how == 'mean':
            res = sum(good) / len(good) if good else None
        elif how in ('min', 'max'):
            res = (min if how == 'min' else max)(good) if good else None
        else:
            raise ValueError(how)
        out.append([k, res])
    return out

print(groupby_agg(R, 'city', 'sales', 'sum'))    # [['LA', 5], ['NY', 17]]
print(groupby_agg(R, 'city', 'sales', 'mean'))   # [['LA', 5.0], ['NY', 8.5]]`,
        dry: { head: ['row', 'key', 'buckets after'], rows: [['0', 'NY', 'NY:[10]'], ['1', 'LA', 'NY:[10], LA:[5]'], ['2', 'NY', 'NY:[10,7], LA:[5]'], ['3', 'None', 'skipped'], ['4', 'LA', 'NY:[10,7], LA:[5,None]'], ['sum', '', '<span class="c-g">LA 5, NY 17</span>']] },
        complexity: `<p>O(n + g log g) time (sorting g keys), O(n) space for the buckets. A streaming version keeps only running sum/count per key: O(g) space.</p>`,
        followUps: ['Support several (col, how) pairs at once like named aggregation.', 'Add <code>dropna=False</code> so None becomes its own group (sorted last, as pandas does).']
      }
    }]
  });

  /* ================= TOPIC 5: merge / join / concat ================= */
  topics.push({
    title: 'merge, join and concat: Combining Tables',
    analogy: `<p>You have a <b>guest list</b> (names + table numbers) and a <b>meal-order sheet</b> (names + dish). <code>merge</code> staples matching names together. An <b>inner</b> merge keeps only guests who appear on both sheets. A <b>left</b> merge keeps every guest and writes "no order" when the meal sheet has nothing. <code>concat</code> is simpler: it stacks two sheets of the same form on top of each other (or side by side).</p>`,
    explain: `<p>🟢 <code>pd.merge(left, right, on="id", how="inner")</code> is SQL JOIN for DataFrames.</p>
${H.table(['how', 'Keeps', 'Row order (pandas 2.x)'], [['<code>inner</code> (default)', 'keys in both', 'order of the left keys'], ['<code>left</code>', 'every left row; NaN for missing right columns', 'left order'], ['<code>right</code>', 'every right row', 'right order'], ['<code>outer</code>', 'union of keys', 'keys sorted'], ['<code>cross</code>', 'every pair (Cartesian product)', 'left then right']])}
<p><b>Duplicate keys multiply.</b> If key 7 appears 2 times on the left and 3 times on the right, the result has 2 × 3 = 6 rows for key 7. That is the usual cause of "my row count exploded after a merge". Guard with <code>validate="one_to_one"</code>, <code>"one_to_many"</code> or <code>"many_to_one"</code>, which raises <code>MergeError</code> if the assumption is false.</p>
<p>🔵 <b>Options:</b> <code>left_on</code>/<code>right_on</code> when key names differ; <code>suffixes=("_x", "_y")</code> for clashing non-key columns; <code>indicator=True</code> adds a <code>_merge</code> column (<code>left_only</code>, <code>right_only</code>, <code>both</code>) — great for anti-joins: <code>m[m._merge == "left_only"]</code>. <code>df.join(other)</code> is a convenience that joins on the <b>index</b> (default <code>how="left"</code>).</p>
<p>🔵 <b>concat</b>: <code>pd.concat([a, b])</code> stacks rows, aligning columns by name (missing → NaN); <code>ignore_index=True</code> renumbers; <code>axis=1</code> places frames side by side, aligned on the index. Concatenate a <b>list</b> of frames once — calling concat inside a loop copies everything each time (O(n²)).</p>
<p>⚠️ Unlike SQL, pandas <b>matches NaN keys with each other</b> in a merge. Drop or fill null keys first if you want SQL semantics.</p>`,
    clues: [
      '"combine orders with customers" / "lookup table" → <code>merge(how="left", validate="many_to_one")</code>',
      '"row count grew after merge" → duplicate keys on the right; check <code>right.key.is_unique</code>',
      '"customers with no orders" (anti-join) → <code>merge(how="left", indicator=True)</code> then <code>_merge == "left_only"</code>',
      '"stack monthly files into one" → collect frames in a list, then one <code>pd.concat(frames, ignore_index=True)</code>',
      '"join on index" → <code>df.join(other)</code> or <code>merge(left_index=True, right_index=True)</code>',
      '"match each trade to the latest quote before it" → <code>pd.merge_asof</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'merge and concat (pandas 2.x)', code: R`import pandas as pd

users = pd.DataFrame({'uid': [1, 2, 3], 'name': ['Ann', 'Bo', 'Cy']})
orders = pd.DataFrame({'uid': [2, 1, 2, 9], 'amount': [30, 10, 5, 99]})

print(users.merge(orders, on='uid'))                 # inner: Ann(10), Bo(30), Bo(5)
print(users.merge(orders, on='uid', how='left'))     # Cy kept with NaN amount
m = users.merge(orders, on='uid', how='left', indicator=True)
print(m[m._merge == 'left_only'].name.tolist())      # ['Cy']  (no orders)
orders.merge(users, on='uid', how='left', validate='many_to_one')  # OK: users.uid unique

jan = pd.DataFrame({'uid': [1], 'amount': [4]})
feb = pd.DataFrame({'uid': [2], 'amount': [6], 'coupon': ['X']})
print(pd.concat([jan, feb], ignore_index=True))      # coupon NaN for jan` }],
    codeTitle: 'Joining tables',
    viz: [{
      title: 'Left merge, key by key',
      input: '1 2 3 | 2 1 2 9',
      inputLabel: 'left keys | right keys',
      gen: function (input) {
        var p = String(input).split('|');
        if (p.length !== 2) throw new Error('Use: left keys | right keys');
        var L = words(p[0]), Rk = words(p[1]);
        if (!L.length || L.length > 6 || Rk.length > 6) throw new Error('Use 1-6 left keys and up to 6 right keys');
        var frames = [], out = [], idx = {};
        Rk.forEach(function (k, i) { (idx[k] = idx[k] || []).push(i); });
        frames.push(fr('Build a hash table from the <b>right</b> keys to their row numbers (one pass). This is a hash join.', [{ type: 'map', label: 'right key → rows', entries: Object.keys(idx).map(function (k) { return [k, '[' + idx[k].join(', ') + ']']; }) }]));
        L.forEach(function (k, i) {
          var hits = idx[k] || [], hl = {}; hl[k] = hits.length ? 'ok' : 'bad';
          if (hits.length) hits.forEach(function (j) { out.push(['L' + i, k, 'R' + j]); });
          else out.push(['L' + i, k, 'NaN']);
          frames.push(fr('Left row ' + i + ' (key ' + esc(k) + '): ' + (hits.length ? hits.length + ' match(es) → ' + hits.length + ' output row(s)' + (hits.length > 1 ? ' — duplicates multiply!' : '') : 'no match → kept with <b>NaN</b> (inner would drop it)') + '.', [{ type: 'map', label: 'right key → rows', entries: Object.keys(idx).map(function (q) { return [q, '[' + idx[q].join(', ') + ']']; }), hl: hl }, tb('result so far', ['left row', 'key', 'right row'], out)]));
        });
        frames.push(fr('Done: ' + out.length + ' rows from ' + L.length + ' left rows. Right-only keys (never looked up) are not in a left merge.', [tb('left merge result', ['left row', 'key', 'right row'], out)]));
        return frames;
      }
    }],
    examples: [
      { title: 'Row explosion from duplicate keys', html: `<p>left: key 7 twice; right: key 7 three times → 6 rows. Add <code>validate</code> and check uniqueness before merging:</p>`, code: { lang: 'python', check: false, code: R`import pandas as pd
a = pd.DataFrame({'k': [7, 7]})
b = pd.DataFrame({'k': [7, 7, 7], 'v': [1, 2, 3]})
print(len(a.merge(b, on='k')))                       # 6
a.merge(b, on='k', validate='many_to_one')           # MergeError: right keys not unique` } },
      { title: 'Hash join in plain Python', html: `<p>What <code>merge(how="inner")</code> does: index the right table once, then look up each left row's key in O(1).</p>`, code: { lang: 'python', run: true, code: R`from collections import defaultdict
left = [(1, 'Ann'), (2, 'Bo'), (3, 'Cy')]
right = [(2, 30), (1, 10), (2, 5), (9, 99)]
index = defaultdict(list)
for uid, amount in right:
    index[uid].append(amount)
print([(uid, name, amt) for uid, name in left for amt in index.get(uid, [])])
# [(1, 'Ann', 10), (2, 'Bo', 30), (2, 'Bo', 5)]` } },
      { title: 'concat in a loop is quadratic', html: `<p>Each <code>pd.concat([acc, part])</code> copies <code>acc</code>. With 1,000 parts of 1,000 rows the loop copies ~500 million cells; collecting and calling concat once copies 1 million.</p>`, code: { lang: 'python', check: false, code: R`import pandas as pd
parts = [pd.DataFrame({'x': range(1000)}) for _ in range(1000)]
df = pd.concat(parts, ignore_index=True)   # one copy, O(total rows)` } }
    ],
    deepDive: `<p>🟣 <b>Algorithms:</b> pandas merges by factorizing both key columns into a shared integer code space (hash table), then computing for each code the left and right row lists and producing the Cartesian product per key. Cost is O(n + m + output). With <code>sort=True</code> (or <code>how="outer"</code>) the keys are additionally sorted. Joining on a sorted, unique index can use faster monotonic paths.</p>
<p><b>dtype pitfalls:</b> merging an <code>int64</code> key with an <code>object</code> column of strings "1", "2" finds nothing (or raises in newer versions) — normalize types first. A left merge that finds no match turns integer right columns into <code>float64</code> (NaN needs a float) unless you use nullable <code>Int64</code>. <b>merge_asof</b> needs both sides sorted by the key; it is a two-pointer sweep that picks, for each left row, the last right row with key ≤ left key (<code>direction="backward"</code>), with optional <code>by=</code> exact-match columns and a <code>tolerance</code>.</p>`,
    aiEra: `<p>🤖 A merge is where AI-written data pipelines go most quietly wrong: the code runs, the output just has duplicated revenue or missing customers. Make the assistant state the relationship (one-to-one, many-to-one) and add <code>validate=</code>; compare row counts and key totals before and after. In the modern stack the same join often runs in DuckDB/Polars/Spark — the SQL vocabulary transfers directly, but pandas' NaN-matches-NaN rule and sorted outer joins do not.</p>`,
    problems: [{
      title: 'Merge Two Tables (inner and left)',
      level: 'Medium', tags: ['merge', 'hash join', 'missing data'], companies: ['Airbnb', 'Stripe', 'Meta'],
      statement: `<p>Implement <code>merge(left, right, on, how='inner')</code> for lists of dicts, matching pandas 2.x: <code>how</code> is <code>'inner'</code> or <code>'left'</code>. For each left row in order, output one merged dict per matching right row (in right order). For <code>'left'</code>, a left row with no match is output once with every right column set to <code>None</code>. Right columns are all keys that appear in any right row, except <code>on</code>; assume no other column names clash. Output dict keys: left columns then right columns.</p>`,
      constraints: `0 ≤ len(left), len(right) ≤ 10<sup>4</sup>; output can be up to len(left) · len(right) rows when keys repeat.`,
      example: `<p>users = [{uid:1, name:'Ann'}, {uid:2, name:'Bo'}, {uid:3, name:'Cy'}], orders = [{uid:2, amt:30}, {uid:1, amt:10}, {uid:2, amt:5}].<br>inner → ${H.c('g', 'Ann 10, Bo 30, Bo 5')} (left order). left → Ann 10, Bo 30, Bo 5, ${H.c('y', 'Cy None')}.</p>`,
      brute: { why: `<p>Nested loop join: for every left row scan every right row. O(n · m) comparisons even when nothing matches — 10<sup>8</sup> for two 10<sup>4</sup>-row tables.</p>`, code: R`def merge(left, right, on, how='inner'):
    rcols = []
    for r in right:
        for c in r:
            if c != on and c not in rcols:
                rcols.append(c)
    out = []
    for l in left:
        hit = False
        for r in right:                         # full scan per left row
            if r[on] == l[on]:
                hit = True
                out.append({**l, **{c: r.get(c) for c in rcols}})
        if not hit and how == 'left':
            out.append({**l, **{c: None for c in rcols}})
    return out

print(merge([{'k': 1}], [{'k': 1, 'v': 2}], 'k'))` },
      mcq: { q: 'Left has 3 rows with key A; right has 2 rows with key A. How many rows does an inner merge produce for A?', options: ['2', '3', '5', '6'], answer: 3, explain: 'Every left A pairs with every right A: 3 × 2 = 6. This many-to-many blow-up is why validate= exists.' },
      hints: ['Hint 1: Index the right table by key once, so each left row finds its matches in O(1).', 'Hint 2: <code>defaultdict(list)</code> from key → right rows, keeping right order. Collect right column names in first-seen order.', 'Hint 3: For each left row: matches = index.get(key, []). If matches: emit {**left, cols from match} for each. Else if how == "left": emit left with None for every right column.'],
      tests: T([
        [["[(r['name'], r['amt']) for r in merge(U, O, 'uid')]"], [['Ann', 10], ['Bo', 30], ['Bo', 5]]],
        [["[(r['name'], r['amt']) for r in merge(U, O, 'uid', 'left')]"], [['Ann', 10], ['Bo', 30], ['Bo', 5], ['Cy', null]]],
        [["merge(U, O, 'uid', 'left')[0]"], { uid: 1, name: 'Ann', amt: 10 }],
        [["merge([], O, 'uid')"], []],
        [["merge(U, [], 'uid', 'left')"], [{ uid: 1, name: 'Ann' }, { uid: 2, name: 'Bo' }, { uid: 3, name: 'Cy' }]],
        [["merge(U, [], 'uid')"], []],
        [["len(merge([{'k': 7}] * 3, [{'k': 7, 'v': 1}, {'k': 7, 'v': 2}], 'k'))"], 6],
        [["merge([{'k': 1}], [{'k': 1, 'a': 5}, {'k': 2, 'b': 6}], 'k', 'left')"], [{ k: 1, a: 5, b: null }]],
        [["merge([{'k': 'x', 'n': 1}], [{'k': 'y', 'v': 2}], 'k', 'left')"], [{ k: 'x', n: 1, v: null }]],
        [["len(merge([{'k': i} for i in range(10000)], [{'k': i, 'v': i} for i in range(0, 10000, 2)], 'k'))"], 5000]
      ]),
      solution: {
        approach: `<p>Hash join: index the right rows by key (O(m)), then stream the left rows and look up matches (O(1) each). Left order is preserved automatically; right order within a key is preserved by appending. pandas: <code>left.merge(right, on=on, how=how)</code>.</p>`,
        code: R`from collections import defaultdict

U = [{'uid': 1, 'name': 'Ann'}, {'uid': 2, 'name': 'Bo'}, {'uid': 3, 'name': 'Cy'}]
O = [{'uid': 2, 'amt': 30}, {'uid': 1, 'amt': 10}, {'uid': 2, 'amt': 5}]

def merge(left, right, on, how='inner'):
    index = defaultdict(list)
    rcols = {}                              # dict as an ordered set
    for r in right:
        index[r[on]].append(r)
        for c in r:
            if c != on:
                rcols.setdefault(c, None)
    out = []
    for l in left:
        matches = index.get(l[on], [])
        for r in matches:
            out.append({**l, **{c: r.get(c) for c in rcols}})
        if not matches and how == 'left':
            out.append({**l, **dict.fromkeys(rcols)})   # NaN-filled right side
    return out

for row in merge(U, O, 'uid', 'left'):
    print(row)`,
        dry: { head: ['left row', 'matches', 'emitted'], rows: [['Ann (1)', '[10]', 'Ann 10'], ['Bo (2)', '[30, 5]', 'Bo 30, Bo 5'], ['Cy (3)', '[]', '<span class="c-y">Cy None</span> (left only)']] },
        complexity: `<p>O(n + m + output) time, O(m) extra space for the index.</p>`,
        followUps: ['Add <code>how="right"</code> and <code>how="outer"</code> (sorted keys).', 'Add <code>indicator=True</code> and suffixes for clashing columns.']
      }
    }]
  });

  /* ================= TOPIC 6: pivot and melt ================= */
  topics.push({
    title: 'Reshaping: pivot, pivot_table, melt, stack/unstack',
    analogy: `<p>A receipt roll lists every sale on its own line: <i>date, store, amount</i>. Your manager wants a <b>grid</b>: one row per date, one column per store. Turning the roll into the grid is a <b>pivot</b> ("wide" format). Turning the grid back into a roll is a <b>melt</b> ("long" format). Same information, different shape — like folding and unfolding a map.</p>`,
    explain: `<p>🟢 <b>Long</b> (tidy) data has one row per observation: easy to filter, group and plot. <b>Wide</b> data has one row per entity and one column per category: easy for humans to read and for matrix maths.</p>
${H.table(['Function', 'Direction', 'Duplicates?'], [['<code>df.pivot(index="date", columns="store", values="amt")</code>', 'long → wide', '<span class="c-r">ValueError</span> if an (index, column) pair repeats'], ['<code>df.pivot_table(index=..., columns=..., values=..., aggfunc="sum", fill_value=0)</code>', 'long → wide', 'aggregates them (default <code>aggfunc="mean"</code>)'], ['<code>pd.melt(df, id_vars=["date"], value_vars=["A", "B"])</code>', 'wide → long', 'n/a; output columns <code>variable</code>, <code>value</code>'], ['<code>s.unstack()</code> / <code>df.stack()</code>', 'move an index level to columns / back', 'unstack needs unique index'], ['<code>pd.crosstab(a, b)</code>', 'counts table', 'counts']])}
<p>🔵 <code>pivot_table</code> is <code>groupby([index, columns]).agg(aggfunc).unstack(columns)</code>. Missing combinations become NaN unless you pass <code>fill_value</code>. <code>margins=True</code> adds an "All" row/column of totals. Row and column labels come out <b>sorted</b>.</p>
<p>🔵 <code>melt</code> output order: all rows for the first value column, then all rows for the second, and so on. Use <code>var_name</code>/<code>value_name</code> to rename. <code>pd.wide_to_long</code> handles columns like <code>score2023, score2024</code>.</p>`,
    clues: [
      '"one column per month / store / category" → <code>pivot_table</code> (or pivot if pairs are unique)',
      '"Index contains duplicate entries, cannot reshape" → use <code>pivot_table</code> with an aggfunc, or dedupe',
      '"turn columns jan, feb, mar into rows" / "tidy data for plotting" → <code>melt</code>',
      '"count combinations of two columns" → <code>pd.crosstab</code> or <code>groupby([...]).size().unstack(fill_value=0)</code>',
      '"MultiIndex result is hard to read" → <code>unstack</code>, <code>reset_index</code>',
      '"totals row and column" → <code>margins=True</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'pivot_table and melt (pandas 2.x)', code: R`import pandas as pd

sales = pd.DataFrame({'day': ['Mon', 'Mon', 'Tue', 'Tue', 'Mon'],
                      'store': ['A', 'B', 'A', 'A', 'A'],
                      'amt': [10, 5, 7, 1, 2]})
wide = sales.pivot_table(index='day', columns='store', values='amt',
                         aggfunc='sum', fill_value=0)
print(wide)
# store   A  B
# day
# Mon    12  5
# Tue     8  0
long = wide.reset_index().melt(id_vars='day', var_name='store', value_name='amt')
print(long)          # back to one row per (day, store), including the 0 cell
# sales.pivot(index='day', columns='store', values='amt')  -> ValueError (Mon/A twice)` }],
    codeTitle: 'Long ↔ wide',
    viz: [{
      title: 'pivot_table(sum) builds the grid cell by cell',
      input: 'Mon,A,10 Mon,B,5 Tue,A,7 Tue,A,1 Mon,A,2',
      inputLabel: 'row,col,value triples (max 8)',
      gen: function (input) {
        var recs = String(input).replace(/,\s+/g, ',').trim().split(/\s+/).filter(function (x) { return x.length; }).map(function (w) { var p = w.split(','); if (p.length !== 3 || isNaN(Number(p[2]))) throw new Error('Use row,col,value triples separated by spaces'); return [p[0], p[1], Number(p[2])]; });
        if (!recs.length || recs.length > 8) throw new Error('Use 1 to 8 triples');
        var rowsL = Array.from(new Set(recs.map(function (r) { return r[0]; }))).sort();
        var colsL = Array.from(new Set(recs.map(function (r) { return r[1]; }))).sort();
        var grid = rowsL.map(function () { return colsL.map(function () { return 'NaN'; }); });
        var frames = [];
        frames.push(fr('Long data. Index values (sorted): ' + rowsL.join(', ') + '; column values (sorted): ' + colsL.join(', ') + '. Every cell starts empty (NaN).', [tb('long', ['row', 'col', 'value'], recs), { type: 'grid', label: 'wide (sum)', rows: grid.map(function (r) { return r.slice(); }), rowHead: rowsL, colHead: colsL }]));
        recs.forEach(function (r, i) {
          var a = rowsL.indexOf(r[0]), b = colsL.indexOf(r[1]);
          var dup = grid[a][b] !== 'NaN';
          grid[a][b] = (dup ? Number(grid[a][b]) : 0) + r[2];
          var hl = {}; hl[a + ',' + b] = dup ? 'bad' : 'ok';
          var th = {}; th[i] = 'cur';
          frames.push(fr('Record ' + i + ' goes to cell (' + esc(r[0]) + ', ' + esc(r[1]) + '). ' + (dup ? '<span class="c-r">Cell already filled</span>: pivot_table adds (aggfunc="sum"); plain <code>pivot</code> would raise ValueError here.' : 'First value for this cell.'), [tb('long', ['row', 'col', 'value'], recs, th), { type: 'grid', label: 'wide (sum)', rows: grid.map(function (x) { return x.slice(); }), rowHead: rowsL, colHead: colsL, hl: hl }]));
        });
        frames.push(fr('Cells never touched stay NaN; <code>fill_value=0</code> turns them into 0.', [{ type: 'grid', label: 'wide, fill_value=0', rows: grid.map(function (x) { return x.map(function (v) { return v === 'NaN' ? 0 : v; }); }), rowHead: rowsL, colHead: colsL }]));
        return frames;
      }
    }],
    examples: [
      { title: 'melt order', html: `<p>Wide: day Mon (A=1, B=2), Tue (A=3, B=4). <code>melt(id_vars="day")</code> gives ${H.table(['day', 'variable', 'value'], [['Mon', 'A', '1'], ['Tue', 'A', '3'], ['Mon', 'B', '2'], ['Tue', 'B', '4']])} — column A for every row first, then column B.</p>` },
      { title: 'crosstab = counting pivot', html: `<p>How many orders per (city, status)? <code>crosstab</code> counts every combination and fills missing ones with 0.</p>`, code: { lang: 'python', check: false, code: R`import pandas as pd
df = pd.DataFrame({'city': ['NY', 'NY', 'LA'], 'status': ['ok', 'late', 'ok']})
print(pd.crosstab(df.city, df.status))
# status  late  ok
# city
# LA         0   1
# NY         1   1` } },
      { title: 'Pivot by hand with a dict', html: `<p>The core of <code>pivot_table(aggfunc="sum")</code>: accumulate into a dict keyed by (row, col), then lay it out on sorted labels.</p>`, code: { lang: 'python', run: true, code: R`from collections import defaultdict
recs = [('Mon', 'A', 10), ('Mon', 'B', 5), ('Tue', 'A', 7), ('Tue', 'A', 1), ('Mon', 'A', 2)]
cell = defaultdict(int)
for r, c, v in recs:
    cell[(r, c)] += v
rows = sorted({r for r, _, _ in recs})
cols = sorted({c for _, c, _ in recs})
for r in rows:
    print(r, [cell.get((r, c), 0) for c in cols])
# Mon [12, 5]
# Tue [8, 0]` } }
    ],
    deepDive: `<p>🟣 <b>unstack is the engine.</b> <code>pivot</code> sets a two-level index (index, columns) and calls <code>unstack</code>, which computes each row's target (row position, column position) from the level codes and scatters values into a 2-D array; a duplicate pair would make two values land in one cell, hence the error. <code>pivot_table</code> first groups and aggregates so every pair is unique. Wide frames with thousands of sparse columns waste memory: a 10<sup>5</sup> × 10<sup>4</sup> float grid is 8 GB even if 99% is NaN — keep such data long, or use sparse dtypes / <code>scipy.sparse</code>.</p>
<p><b>Dtypes:</b> NaN cells force integer columns to float64; <code>fill_value</code> lets pandas keep integers. <b>Column MultiIndex:</b> <code>pivot_table</code> with several <code>values</code> or aggfuncs yields 2-level columns; flatten with <code>df.columns = ["_".join(map(str, c)) for c in df.columns]</code>.</p>`,
    aiEra: `<p>🤖 "Reshape this to one column per month" is a classic natural-language request that assistants translate well, but they often pick <code>pivot</code> where duplicates exist (crash) or <code>pivot_table</code> with the default <code>mean</code> where you wanted <code>sum</code> (silently wrong). State the aggregation explicitly. For dashboards and LLM-generated reports, keep a tidy long table as the source of truth and pivot only at the presentation edge.</p>`,
    problems: [{
      title: 'Build a pivot_table with sum and fill_value',
      level: 'Medium', tags: ['pivot', 'reshape', 'aggregation'], companies: ['Microsoft', 'Walmart', 'Instacart'],
      statement: `<p>Write <code>pivot_sum(records, fill=None)</code> where <code>records</code> is a list of <code>[row_label, col_label, value]</code>. Return <code>{'index': sorted row labels, 'columns': sorted col labels, 'data': grid}</code>, where <code>data[i][j]</code> is the sum of values for that pair, or <code>fill</code> if the pair never occurs. This equals <code>df.pivot_table(index=0, columns=1, values=2, aggfunc='sum', fill_value=fill)</code>.</p>`,
      constraints: `0 ≤ len(records) ≤ 10<sup>5</sup>; row labels mutually comparable, column labels mutually comparable.`,
      example: `<p>[Mon,A,10], [Mon,B,5], [Tue,A,7], [Tue,A,1], [Mon,A,2] with fill = 0 → index [Mon, Tue], columns [A, B], data ${H.c('g', '[[12, 5], [8, 0]]')}.</p>`,
      brute: { why: `<p>For every (row, column) cell, scan all records to sum the matching ones: O(R · C · n). With 1,000 rows, 100 columns and 10<sup>5</sup> records that is 10<sup>10</sup> steps.</p>`, code: R`def pivot_sum(records, fill=None):
    rows = sorted({r[0] for r in records})
    cols = sorted({r[1] for r in records})
    data = []
    for a in rows:
        line = []
        for b in cols:                         # scan everything for each cell
            vals = [v for x, y, v in records if x == a and y == b]
            line.append(sum(vals) if vals else fill)
        data.append(line)
    return {'index': rows, 'columns': cols, 'data': data}

print(pivot_sum([['Mon', 'A', 1]]))` },
      mcq: { q: 'Which call raises ValueError when (day, store) pairs repeat?', options: ['pivot_table(..., aggfunc="sum")', 'pivot(...)', 'groupby([...]).sum().unstack()', 'crosstab(...)'], answer: 1, explain: 'pivot does no aggregation, so two values for one cell is an error ("Index contains duplicate entries"). The others aggregate first.' },
      hints: ['Hint 1: Aggregate first, lay out second. A dict keyed by (row, col) accumulates sums in one pass.', 'Hint 2: The sorted distinct row labels and column labels give the grid axes.', 'Hint 3: data = [[sums.get((r, c), fill) for c in cols] for r in rows]. Empty input → empty index, columns and data.'],
      tests: T([
        [["pivot_sum([['Mon', 'A', 10], ['Mon', 'B', 5], ['Tue', 'A', 7], ['Tue', 'A', 1], ['Mon', 'A', 2]], 0)"], { index: ['Mon', 'Tue'], columns: ['A', 'B'], data: [[12, 5], [8, 0]] }],
        [["pivot_sum([['Mon', 'A', 10], ['Tue', 'B', 1]])"], { index: ['Mon', 'Tue'], columns: ['A', 'B'], data: [[10, null], [null, 1]] }],
        [["pivot_sum([])"], { index: [], columns: [], data: [] }],
        [["pivot_sum([['r', 'c', 4]])"], { index: ['r'], columns: ['c'], data: [[4]] }],
        [["pivot_sum([[2, 'x', -1], [1, 'x', 3], [2, 'x', 1]], 0)"], { index: [1, 2], columns: ['x'], data: [[3], [0]] }],
        [["pivot_sum([['a', 'z', 1], ['a', 'y', 2]], 0)['columns']"], ['y', 'z']],
        [["pivot_sum([['a', 'b', 1.5], ['a', 'b', 2.5]])['data']"], [[4.0]]],
        [["sum(map(sum, pivot_sum([[i % 100, i % 7, 1] for i in range(100000)], 0)['data']))"], 100000]
      ]),
      solution: {
        approach: `<p>One pass to accumulate sums per (row, col) in a dict, then build the grid over sorted labels with <code>fill</code> for absent pairs. This is exactly groupby-sum followed by unstack.</p>`,
        code: R`def pivot_sum(records, fill=None):
    sums = {}
    for r, c, v in records:                       # groupby([row, col]).sum()
        sums[(r, c)] = sums.get((r, c), 0) + v
    rows = sorted({r for r, _ in sums})
    cols = sorted({c for _, c in sums})
    data = [[sums.get((r, c), fill) for c in cols] for r in rows]   # unstack
    return {'index': rows, 'columns': cols, 'data': data}

print(pivot_sum([['Mon', 'A', 10], ['Mon', 'B', 5], ['Tue', 'A', 7],
                 ['Tue', 'A', 1], ['Mon', 'A', 2]], 0))`,
        dry: { head: ['record', 'sums'], rows: [['Mon,A,10', '(Mon,A)=10'], ['Mon,B,5', '+ (Mon,B)=5'], ['Tue,A,7', '+ (Tue,A)=7'], ['Tue,A,1', '(Tue,A)=8'], ['Mon,A,2', '(Mon,A)=12'], ['grid', '<span class="c-g">[[12,5],[8,0]]</span>']] },
        complexity: `<p>O(n + R log R + C log C + R·C) time; O(R·C) output.</p>`,
        followUps: ['Support <code>aggfunc="mean"</code> and <code>"count"</code>.', 'Add <code>margins=True</code> totals.']
      }
    }]
  });

  /* ================= TOPIC 7: missing data + time series ================= */
  topics.push({
    title: 'Missing Data and Time Series Basics',
    analogy: `<p>A weather station logs the temperature every hour, but sometimes the sensor drops out. You can leave the gap (NaN), <b>carry the last reading forward</b> (ffill) like assuming nothing changed, <b>draw a straight line</b> between neighbours (interpolate), or <b>throw away</b> the hour (dropna). A <b>rolling mean</b> is like a 3-hour "feels like" average that slides along the timeline, and <b>resample</b> is regrouping hourly readings into daily summaries.</p>`,
    explain: `<p>🟢 <b>Missing values.</b> pandas uses <code>NaN</code> for floats, <code>NaT</code> for datetimes and <code>pd.NA</code> for nullable dtypes (<code>Int64</code>, <code>boolean</code>, <code>string</code>). <code>None</code> in a numeric column becomes NaN, and an int column with a NaN becomes <code>float64</code>.</p>
${H.table(['Task', 'Code'], [['find', '<code>df.isna()</code>, <code>df.isna().sum()</code> per column'], ['drop rows', '<code>df.dropna()</code> (any NaN), <code>how="all"</code>, <code>subset=[...]</code>, <code>thresh=k</code>'], ['constant fill', '<code>df.fillna(0)</code>, <code>df.fillna({"a": 0, "b": "?"})</code>'], ['carry forward / back', '<code>df.ffill(limit=2)</code>, <code>df.bfill()</code> (the old <code>fillna(method=...)</code> is deprecated)'], ['interpolate', '<code>s.interpolate()</code> (linear by position; <code>method="time"</code> uses timestamps)'], ['group-aware fill', '<code>df.groupby("id").x.ffill()</code>']])}
<p>Aggregations skip NaN by default (<code>skipna=True</code>): <code>mean([1, NaN, 3])</code> = 2. <code>NaN == NaN</code> is False, so never test with <code>==</code>; use <code>isna</code>.</p>
<p>🔵 <b>Time series.</b> Parse with <code>pd.to_datetime</code> and set a <code>DatetimeIndex</code>. Then: <code>s.loc["2024-03"]</code> selects a month (partial string indexing); <code>s.resample("D").sum()</code> buckets by calendar period (empty buckets give 0 for sum, NaN for mean); <code>s.rolling(3).mean()</code> averages the last 3 rows (the first 2 are NaN because <code>min_periods</code> defaults to the window size); <code>s.rolling("3D").sum()</code> uses a time window (min_periods 1); <code>s.shift(1)</code>, <code>s.diff()</code>, <code>s.pct_change()</code> compare with the previous row; <code>s.dt.dayofweek</code>, <code>.dt.month</code> extract parts; <code>tz_localize</code>/<code>tz_convert</code> handle time zones.</p>`,
    clues: [
      '"moving average / smooth the last N points" → <code>rolling(N).mean()</code>',
      '"daily / weekly totals from event logs" → <code>resample("D"/"W").sum()</code> on a DatetimeIndex',
      '"fill gaps with the previous value" → <code>ffill</code> (per entity: <code>groupby().ffill()</code>)',
      '"my int column turned into float" → a NaN appeared; use nullable <code>Int64</code>',
      '"change since yesterday" / "day-over-day growth" → <code>diff()</code> / <code>pct_change()</code>',
      '"count missing per column" → <code>df.isna().sum()</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'Missing data and time series (pandas 2.x)', code: R`import pandas as pd
import numpy as np

s = pd.Series([1.0, np.nan, np.nan, 4.0, np.nan])
print(s.ffill(limit=1).tolist())      # [1.0, 1.0, nan, 4.0, 4.0]
print(s.interpolate().tolist())       # [1.0, 2.0, 3.0, 4.0, 4.0]
print(s.mean())                       # 2.5  (NaN skipped)

idx = pd.to_datetime(['2024-01-01', '2024-01-01', '2024-01-03'])
ev = pd.Series([5, 2, 4], index=idx)
print(ev.resample('D').sum())         # 01: 7, 02: 0, 03: 4
x = pd.Series([2, 4, 6, 8])
print(x.rolling(3).mean().tolist())   # [nan, nan, 4.0, 6.0]
print(x.rolling(3, min_periods=1).mean().tolist())  # [2.0, 3.0, 4.0, 6.0]
print(x.diff().tolist())              # [nan, 2.0, 2.0, 2.0]` }],
    codeTitle: 'fillna, resample, rolling',
    viz: [{
      title: 'rolling(window).mean() sliding over the data',
      input: '2 4 6 8 10',
      inputLabel: 'values (max 10), window 3',
      gen: function (input) {
        var a = nums(input, 10), w = 3, frames = [], out = [];
        frames.push(fr('Window = 3, <code>min_periods</code> defaults to 3: a result needs 3 values.', [{ type: 'bars', label: 'values', values: a.slice() }]));
        for (var i = 0; i < a.length; i++) {
          var lo = Math.max(0, i - w + 1), win = a.slice(lo, i + 1), hl = {};
          for (var k = lo; k <= i; k++) hl[k] = 'win';
          var res = win.length >= w ? win.reduce(function (p, q) { return p + q; }, 0) / w : null;
          out.push(fmt(res));
          frames.push(fr('Row ' + i + ': window = [' + win.join(', ') + ']' + (res === null ? ' has only ' + win.length + ' value(s) &lt; min_periods → <b>NaN</b>.' : ' → mean = ' + fmt(res) + '. Real pandas updates a running sum instead of re-adding (O(1) per step).'), [{ type: 'bars', label: 'values', values: a.slice(), hl: hl }, { type: 'array', label: 'rolling mean', values: out.slice() }]));
        }
        return frames;
      }
    }, {
      title: 'ffill with limit',
      input: '1 _ _ _ 5 _',
      inputLabel: 'values, _ = missing (max 10); limit 2',
      gen: function (input) {
        var a = words(input);
        if (!a.length || a.length > 10) throw new Error('Give 1-10 tokens, _ for missing');
        var frames = [], out = a.slice(), last = null, run = 0;
        frames.push(fr('<code>ffill(limit=2)</code>: copy the last seen value into at most 2 consecutive gaps.', [{ type: 'array', label: 'input', values: a.slice() }]));
        for (var i = 0; i < a.length; i++) {
          var hl = {};
          if (a[i] !== '_') { last = a[i]; run = 0; hl[i] = 'ok'; frames.push(fr('Index ' + i + ': real value ' + a[i] + ' → remember it, reset the gap counter.', [{ type: 'array', label: 'output', values: out.slice(), hl: hl }, vp({ last: last, gap: run })])); continue; }
          run++;
          if (last !== null && run <= 2) { out[i] = last; hl[i] = 'cur'; frames.push(fr('Index ' + i + ': gap #' + run + ' → fill with ' + last + '.', [{ type: 'array', label: 'output', values: out.slice(), hl: hl }, vp({ last: last, gap: run }, 'gap')])); }
          else { out[i] = 'NaN'; hl[i] = 'bad'; frames.push(fr('Index ' + i + ': ' + (last === null ? 'nothing seen yet (leading gap)' : 'gap #' + run + ' exceeds limit') + ' → stays NaN.', [{ type: 'array', label: 'output', values: out.slice(), hl: hl }, vp({ last: last === null ? 'None' : last, gap: run }, 'gap')])); }
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Rolling mean in plain Python with a running sum', html: `<p>O(1) per step: add the new value, subtract the one leaving the window.</p>`, code: { lang: 'python', run: true, code: R`vals = [2, 4, 6, 8, 10]
w, run, out = 3, 0, []
for i, v in enumerate(vals):
    run += v
    if i >= w:
        run -= vals[i - w]
    out.append(run / w if i >= w - 1 else None)
print(out)      # [None, None, 4.0, 6.0, 8.0]` } },
      { title: 'resample fills empty periods', html: `<p>Events on Jan 1 (5, 2) and Jan 3 (4). <code>resample("D").sum()</code> gives Jan 1 → 7, <b>Jan 2 → 0</b>, Jan 3 → 4. <code>groupby(df.index.date).sum()</code> would skip Jan 2 entirely — a classic dashboard bug (missing days look like no change instead of zero).</p>` },
      { title: 'Nullable integers keep their type', html: `<p>Use <code>Int64</code> (capital I) when an integer column may have gaps; it stores a separate missing mask.</p>`, code: { lang: 'python', check: false, code: R`import pandas as pd
print(pd.Series([1, None, 3]).dtype)                 # float64
print(pd.Series([1, None, 3], dtype='Int64').tolist())  # [1, <NA>, 3]` } }
    ],
    deepDive: `<p>🟣 <b>Why NaN is a float:</b> NumPy integer arrays have no spare bit pattern for "missing", but IEEE-754 floats do, so pandas historically upcast ints to float64 when a value is missing. Integers above 2<sup>53</sup> then lose precision (IDs!). Nullable extension dtypes keep a separate boolean mask; PyArrow dtypes use Arrow validity bitmaps. <code>pd.NA</code> propagates in comparisons (<code>pd.NA == 1</code> is NA) and uses three-valued logic for <code>&amp;</code>/<code>|</code>.</p>
<p><b>Rolling internals:</b> fixed windows use running-sum/Welford-style updates in Cython, O(n) total; <code>rolling().apply(func)</code> calls Python per window (slow; pass <code>raw=True</code> or use numba engine). Floating running sums can drift; pandas guards against it but very long series of huge and tiny numbers can still show 1e-12 noise. <b>Time windows</b> (<code>"3D"</code>) need a monotonic DatetimeIndex and include (t − 3 days, t] by default (<code>closed="right"</code>). <b>resample</b> anchors bins to calendar boundaries (<code>"W"</code> = weeks ending Sunday, <code>"ME"</code> = month end in pandas 2.2+, replacing <code>"M"</code>).</p>`,
    aiEra: `<p>🤖 Missing-data handling is a judgment call that an assistant cannot make for you: forward-filling a price is reasonable, forward-filling a sensor that broke for a week invents data, and filling with 0 changes means and model features. When an LLM writes <code>df.fillna(0)</code> or <code>dropna()</code>, ask what that does to the statistics downstream. In ML feature pipelines, rolling and shift features must use only past data — <code>rolling(...).mean()</code> includes the current row, so shift by one before using it to predict that row, or you leak the label.</p>`,
    problems: [{
      title: 'Rolling Mean with min_periods and Missing Values',
      level: 'Medium', tags: ['rolling window', 'time series', 'missing data'], companies: ['Two Sigma', 'Robinhood', 'Datadog'],
      statement: `<p>Implement <code>rolling_mean(values, window, min_periods=None)</code> like <code>pd.Series(values).rolling(window, min_periods=min_periods).mean()</code>. <code>values</code> may contain <code>None</code> (NaN). For each position i, the window is positions <code>i-window+1 … i</code> (clipped at 0). If the number of non-missing values in the window is at least <code>min_periods</code> (default: <code>window</code>), output their mean, else <code>None</code>.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>6</sup>; 1 ≤ window; 1 ≤ min_periods ≤ window. Must be O(n).`,
      example: `<p><code>rolling_mean([2, 4, 6, 8], 3)</code> → ${H.c('g', '[None, None, 4.0, 6.0]')}. <code>rolling_mean([1, None, 3, 5], 2, 1)</code> → [1.0, 1.0, 3.0, 4.0]: window [None, 3] has one valid value ≥ min_periods 1.</p>`,
      brute: { why: `<p>Recompute each window from scratch: O(n · w). For n = 10<sup>6</sup> and w = 1,000 that is 10<sup>9</sup> additions; consecutive windows share w − 1 values.</p>`, code: R`def rolling_mean(values, window, min_periods=None):
    mp = window if min_periods is None else min_periods
    out = []
    for i in range(len(values)):
        win = [v for v in values[max(0, i - window + 1): i + 1] if v is not None]
        out.append(sum(win) / len(win) if len(win) >= mp else None)
    return out

print(rolling_mean([2, 4, 6, 8], 3))` },
      mcq: { q: '<code>pd.Series([1, 2, 3]).rolling(2).mean()</code> gives?', options: ['[1.0, 1.5, 2.5]', '[NaN, 1.5, 2.5]', '[1.5, 2.5]', '[NaN, NaN, 2.5]'], answer: 1, explain: 'Output keeps the input length. min_periods defaults to the window (2), so the first position has only one value and is NaN.' },
      hints: ['Hint 1: Keep a running sum and a running count of non-missing values in the window.', 'Hint 2: When index i enters, add it (if not None); when index i - window leaves, subtract it (if not None).', 'Hint 3: After updating, output sum / count if count ≥ min_periods (and count > 0) else None. Empty input → [].'],
      tests: T([
        [['rolling_mean([2, 4, 6, 8], 3)'], [null, null, 4.0, 6.0]],
        [['rolling_mean([1, None, 3, 5], 2, 1)'], [1.0, 1.0, 3.0, 4.0]],
        [['rolling_mean([1, None, 3, 5], 2)'], [null, null, null, 4.0]],
        [['rolling_mean([], 3)'], []],
        [['rolling_mean([7], 1)'], [7.0]],
        [['rolling_mean([None, None], 2, 1)'], [null, null]],
        [['rolling_mean([1, 2, 3, 4], 5, 2)'], [null, 1.5, 2.0, 2.5]],
        [['rolling_mean([-2, 2, -2, 2], 2)'], [null, 0.0, 0.0, 0.0]],
        [['rolling_mean(list(range(1000000)), 1000)[-1]'], 999499.5]
      ]),
      solution: {
        approach: `<p>Sliding window with a running sum and count of valid values; each element enters once and leaves once, so O(n). pandas: <code>s.rolling(window, min_periods=mp).mean()</code>.</p>`,
        code: R`def rolling_mean(values, window, min_periods=None):
    mp = window if min_periods is None else min_periods
    total, count, out = 0, 0, []
    for i, v in enumerate(values):
        if v is not None:                  # value enters the window
            total += v
            count += 1
        if i >= window:                    # value leaves the window
            old = values[i - window]
            if old is not None:
                total -= old
                count -= 1
        out.append(total / count if count >= mp and count > 0 else None)
    return out

print(rolling_mean([2, 4, 6, 8], 3))          # [None, None, 4.0, 6.0]
print(rolling_mean([1, None, 3, 5], 2, 1))    # [1.0, 1.0, 3.0, 4.0]`,
        dry: { head: ['i', 'v', 'sum', 'count', 'out'], rows: [['0', '2', '2', '1', 'None'], ['1', '4', '6', '2', 'None'], ['2', '6', '12', '3', '4.0'], ['3', '8 (2 leaves)', '18', '3', '<span class="c-g">6.0</span>']] },
        complexity: `<p>O(n) time, O(n) output, O(1) extra state.</p>`,
        followUps: ['Rolling max in O(n) (monotonic deque).', 'Centered windows (<code>center=True</code>).']
      }
    }]
  });

  /* ================= TOPIC 8: apply vs vectorized, memory, performance ================= */
  topics.push({
    title: 'apply vs Vectorized, Categoricals, Memory and Performance Pitfalls',
    analogy: `<p><code>df.apply(f, axis=1)</code> is like a bank teller serving a queue <b>one customer at a time</b>, filling in a fresh form for each. A vectorized expression is the bank running <b>one batch job overnight</b> for every account. And a <b>categorical</b> column is the post office replacing every full address on a million letters with a short <b>postcode</b> plus one lookup table — same information, a fraction of the paper.</p>`,
    explain: `<p>🟢 <b>Speed ladder</b> (fastest first) for "make a new column from existing ones":</p>
<ol><li><b>Vectorized</b> column maths and built-ins: <code>df.a * df.b</code>, <code>np.where(cond, x, y)</code>, <code>np.select</code>, <code>.clip</code>, <code>.str.lower()</code>, <code>.dt.month</code>, <code>.map(dict)</code>.</li><li>A list comprehension over <code>zip(df.a, df.b)</code> — plain Python, but no per-row Series objects.</li><li><code>s.apply(f)</code> / <code>s.map(f)</code> — Python call per element.</li><li><code>df.apply(f, axis=1)</code> — builds a Series object for every row: often 100–1000× slower than (1).</li><li><code>iterrows()</code> — same cost plus it can change dtypes; <code>itertuples()</code> is much faster if you must loop.</li></ol>
<p>🔵 <b>Memory.</b> <code>df.memory_usage(deep=True)</code> shows real bytes; <code>object</code> string columns cost ~50+ bytes per value. Fixes:</p>
${H.table(['Trick', 'Typical saving'], [['<code>astype("category")</code> for repeated strings (city, status)', '10–50× on that column'], ['downcast: <code>pd.to_numeric(s, downcast="integer")</code>, <code>float32</code>', '2–8×'], ['<code>read_csv(usecols=..., dtype=...)</code>', 'never load what you do not need'], ['<code>chunksize=</code> or PyArrow / Parquet', 'stream or columnar reads'], ['<code>string[pyarrow]</code> dtype', 'compact strings, faster <code>.str</code> ops']])}
<p>A categorical stores small integer <b>codes</b> plus one array of <b>categories</b> — the same idea as <code>pd.factorize(values)</code>, which returns <code>(codes, uniques)</code> with <code>-1</code> for missing.</p>`,
    clues: [
      '"this pandas script takes hours" → look for <code>apply(axis=1)</code>, <code>iterrows</code>, concat/append in a loop',
      '"if-else column" → <code>np.where</code> (two branches) or <code>np.select</code> (many)',
      '"DataFrame doesn\'t fit in memory" → dtypes, categoricals, <code>usecols</code>, chunks, Parquet, or Polars/DuckDB',
      '"encode labels as integers" → <code>pd.factorize</code> / <code>astype("category").cat.codes</code>',
      '"map codes to names" → <code>s.map(lookup_dict)</code> (vectorized hash lookup)',
      '"low-cardinality string column" → category dtype'
    ],
    code: [{ lang: 'python', check: false, title: 'Vectorize instead of apply (pandas 2.x)', code: R`import numpy as np
import pandas as pd

df = pd.DataFrame({'price': np.random.default_rng(1).uniform(1, 100, 1_000_000),
                   'qty': np.random.default_rng(2).integers(1, 10, 1_000_000)})

slow = df.apply(lambda r: r.price * r.qty if r.qty > 5 else 0.0, axis=1)  # seconds
fast = np.where(df.qty > 5, df.price * df.qty, 0.0)                       # milliseconds

df['band'] = np.select([df.price < 10, df.price < 50], ['low', 'mid'], default='high')
df['band'] = df['band'].astype('category')     # 3 categories + int8 codes
print(df.memory_usage(deep=True))

codes, uniques = pd.factorize(pd.Series(['b', 'a', None, 'b']))
print(codes, list(uniques))                    # [ 0  1 -1  0] ['b', 'a']` }],
    codeTitle: 'apply vs vectorized, categoricals',
    viz: [{
      title: 'factorize: strings → small integer codes',
      input: 'NY LA NY _ SF LA NY',
      inputLabel: 'values, _ = missing (max 10)',
      gen: function (input) {
        var a = words(input);
        if (!a.length || a.length > 10) throw new Error('Give 1-10 values');
        var frames = [], uniq = [], pos = {}, codes = [];
        frames.push(fr('An object column stores a pointer to a Python string per row. Factorizing replaces each value with an integer code into a table of uniques (first-appearance order).', [{ type: 'array', label: 'values', values: a.slice() }]));
        a.forEach(function (v, i) {
          var hl = {}; hl[i] = 'cur';
          if (v === '_') { codes.push(-1); frames.push(fr('Index ' + i + ': missing → code <b>-1</b> (not added to uniques).', [{ type: 'array', label: 'values', values: a.slice(), hl: hl }, { type: 'array', label: 'codes', values: codes.slice() }, { type: 'map', label: 'uniques', entries: uniq.map(function (u, k) { return [k, u]; }) }])); return; }
          var isNew = !(v in pos);
          if (isNew) { pos[v] = uniq.length; uniq.push(v); }
          codes.push(pos[v]);
          var mh = {}; mh[pos[v]] = isNew ? 'ok' : 'cur';
          frames.push(fr('Index ' + i + ': "' + esc(v) + '" ' + (isNew ? 'is new → gets code ' + pos[v] : 'seen before → reuse code ' + pos[v]) + ' (hash lookup, O(1)).', [{ type: 'array', label: 'values', values: a.slice(), hl: hl }, { type: 'array', label: 'codes', values: codes.slice() }, { type: 'map', label: 'uniques', entries: uniq.map(function (u, k) { return [k, u]; }), hl: mh }]));
        });
        frames.push(fr('Done. A category column stores exactly this: ' + a.length + ' small ints (int8 here: 1 byte each) + ' + uniq.length + ' strings, instead of ' + a.length + ' string objects.', [{ type: 'array', label: 'codes (int8)', values: codes.slice() }, { type: 'map', label: 'categories', entries: uniq.map(function (u, k) { return [k, u]; }) }]));
        return frames;
      }
    }],
    examples: [
      { title: 'np.select for many branches', html: `<p>Conditions are checked in order; the first True wins, like if/elif/else.</p>`, code: { lang: 'python', check: false, code: R`import numpy as np, pandas as pd
s = pd.Series([5, 25, 75])
print(np.select([s < 10, s < 50], ['low', 'mid'], default='high'))  # ['low' 'mid' 'high']` } },
      { title: 'Measure, do not guess', html: `<p>In a notebook, <code>%timeit</code> both versions on realistic sizes. A 1M-row <code>apply(axis=1)</code> is commonly 5–20 s; the vectorized form is 5–20 ms. <code>df.info(memory_usage="deep")</code> shows which columns to shrink first.</p>` },
      { title: 'Categoricals in plain Python', html: `<p>Codes + uniques round-trip back to the original values, exactly like a category column.</p>`, code: { lang: 'python', run: true, code: R`vals = ['NY', 'LA', 'NY', None, 'SF']
uniques, pos, codes = [], {}, []
for v in vals:
    if v is None:
        codes.append(-1)
        continue
    if v not in pos:
        pos[v] = len(uniques)
        uniques.append(v)
    codes.append(pos[v])
print(codes, uniques)                                  # [0, 1, 0, -1, 2] ['NY', 'LA', 'SF']
print([uniques[c] if c >= 0 else None for c in codes]) # original back` } }
    ],
    deepDive: `<p>🟣 <b>Why apply(axis=1) is so slow:</b> pandas must build a Series (with an index object) for every row, box every value into a Python object, call your function, then infer the output dtype from the results. The column-wise data layout means a row is not even contiguous in memory. Vectorized expressions stay in NumPy buffers. When logic is truly row-wise and complex, options are: <code>np.vectorize</code> (convenience only, still a Python loop), numba <code>@njit</code> on the NumPy arrays, or moving to Polars expressions, which run multi-threaded in Rust.</p>
<p><b>Other pitfalls:</b> <code>object</code> dtype from mixed types (a stray string in a numeric CSV column) disables vectorization — fix with <code>pd.to_numeric(errors="coerce")</code>. Growing a DataFrame row by row (<code>df.loc[len(df)] = row</code>, or the removed <code>append</code>) is O(n²); collect dicts in a list and build once. Categoricals with high cardinality (unique IDs) save nothing and slow down groupby; merging two categoricals with different categories falls back to object. Use <code>inplace=True</code> sparingly: it rarely saves memory and is being phased out for most methods.</p>`,
    aiEra: `<p>🤖 The default code an assistant writes for "compute X per row" is often <code>df.apply(..., axis=1)</code> because it reads naturally. Ask for the vectorized rewrite and benchmark both. For datasets beyond memory, assistants increasingly suggest Polars, DuckDB or Spark; know the trade-offs (lazy evaluation, multi-threading, SQL vs dataframe API). In interviews for data-heavy roles, explaining <i>why</i> vectorized pandas is faster (contiguous typed buffers, compiled loops, no boxing) carries more weight than remembering every method name.</p>`,
    problems: [{
      title: 'Implement pd.factorize',
      level: 'Easy', tags: ['categorical', 'hashing', 'encoding'], companies: ['Spotify', 'Netflix'],
      statement: `<p>Write <code>factorize(values)</code> returning <code>[codes, uniques]</code> like <code>pd.factorize(values)</code> with default arguments: <code>uniques</code> lists distinct non-missing values in order of first appearance; <code>codes[i]</code> is the position of <code>values[i]</code> in <code>uniques</code>, or <code>-1</code> if it is <code>None</code>.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>6</sup>; values are hashable. O(n) expected.`,
      example: `<p><code>factorize(['b', 'a', None, 'b'])</code> → ${H.c('g', "[[0, 1, -1, 0], ['b', 'a']]")}.</p>`,
      brute: { why: `<p>Keep <code>uniques</code> as a list and call <code>uniques.index(v)</code> for each value: O(n · u). With a million mostly distinct IDs that is ~10<sup>12</sup> comparisons.</p>`, code: R`def factorize(values):
    uniques, codes = [], []
    for v in values:
        if v is None:
            codes.append(-1)
        else:
            if v not in uniques:              # O(u) scan
                uniques.append(v)
            codes.append(uniques.index(v))   # another O(u) scan
    return [codes, uniques]

print(factorize(['b', 'a', None, 'b']))` },
      mcq: { q: 'Why does <code>astype("category")</code> save memory for a "city" column with 1M rows and 50 cities?', options: ['It compresses each string', 'It stores 1M small int codes plus 50 strings', 'It drops duplicate rows', 'It stores the column on disk'], answer: 1, explain: 'Each row keeps only an int8 code (1 byte); the 50 strings are stored once.' },
      hints: ['Hint 1: A dict from value → code gives O(1) "have I seen this?" checks.', 'Hint 2: New value: its code is the current length of uniques; append it. Missing value: code -1, do not touch uniques.', 'Hint 3: Watch out that 1 and True (and 1.0) are equal and hash the same in Python, so they share a code; that matches pandas for object arrays only loosely, so tests avoid mixing them.'],
      tests: T([
        [["factorize(['b', 'a', None, 'b'])"], [[0, 1, -1, 0], ['b', 'a']]],
        [['factorize([])'], [[], []]],
        [['factorize([None, None])'], [[-1, -1], []]],
        [["factorize(['x'])"], [[0], ['x']]],
        [['factorize([3, 1, 3, 2, 1])'], [[0, 1, 0, 2, 1], [3, 1, 2]]],
        [["factorize(['NY', 'LA', 'NY', None, 'SF', 'LA'])"], [[0, 1, 0, -1, 2, 1], ['NY', 'LA', 'SF']]],
        [['factorize([0, None, 0])'], [[0, -1, 0], [0]]],
        [['len(factorize(list(range(1000000)))[1])'], 1000000],
        [['factorize([7] * 100000)[1]'], [7]]
      ]),
      solution: {
        approach: `<p>One pass with a dict from value to code. This is the hash-table step at the heart of groupby, merge, category dtype and value_counts.</p>`,
        code: R`def factorize(values):
    pos, uniques, codes = {}, [], []
    for v in values:
        if v is None:
            codes.append(-1)                # missing sentinel
            continue
        c = pos.get(v)
        if c is None:                       # first appearance
            c = pos[v] = len(uniques)
            uniques.append(v)
        codes.append(c)
    return [codes, uniques]

print(factorize(['b', 'a', None, 'b']))     # [[0, 1, -1, 0], ['b', 'a']]`,
        dry: { head: ['v', 'pos', 'codes'], rows: [["'b'", "{b:0}", '[0]'], ["'a'", "{b:0, a:1}", '[0, 1]'], ['None', 'unchanged', '[0, 1, -1]'], ["'b'", 'hit 0', '<span class="c-g">[0, 1, -1, 0]</span>']] },
        complexity: `<p>O(n) expected time, O(u) extra space.</p>`,
        followUps: ['Add <code>sort=True</code> (uniques sorted, codes remapped).', 'Factorize two key columns jointly for a multi-key groupby.']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'value_counts with Ties and normalize',
    level: 'Easy', tags: ['value_counts', 'Counter', 'sorting'], companies: ['Amazon', 'Meta'],
    statement: `<p>Write <code>value_counts(values, normalize=False)</code> like <code>pd.Series(values).value_counts(normalize=...)</code>: drop <code>None</code>, count each distinct value, and return <code>[[value, count], ...]</code> sorted by count descending. Break ties by <b>first appearance</b> (pandas' own tie order is an implementation detail, so the exercise fixes it). With <code>normalize=True</code>, return each count divided by the number of non-missing values.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>`,
    example: `<p><code>value_counts(['a', 'b', 'b', 'a', 'c', None])</code> → ${H.c('g', "[['a', 2], ['b', 2], ['c', 1]]")} ('a' appeared first). With normalize → [['a', 0.4], ['b', 0.4], ['c', 0.2]].</p>`,
    brute: { why: `<p>For each distinct value call <code>values.count(v)</code>: O(n · u).</p>`, code: R`def value_counts(values, normalize=False):
    order = []
    for v in values:
        if v is not None and v not in order:      # O(u) scan
            order.append(v)
    pairs = [[v, values.count(v)] for v in order]  # O(n) per value
    pairs.sort(key=lambda p: -p[1])                # stable sort keeps first-appearance ties
    if normalize:
        total = sum(c for _, c in pairs)
        pairs = [[v, c / total] for v, c in pairs]
    return pairs

print(value_counts(['a', 'b', 'b', 'a', 'c']))` },
    mcq: { q: 'Which Python tool already keeps first-insertion order for equal counts?', options: ['set', 'collections.Counter (dict order) + stable sort', 'heapq', 'sorted(set(values))'], answer: 1, explain: 'Counter is a dict, so keys keep insertion order; Python\'s sort is stable, so equal counts stay in that order.' },
    hints: ['Hint 1: One pass with a dict counts everything; dicts remember insertion order.', 'Hint 2: Sort the (value, count) pairs by count descending with a stable sort.', 'Hint 3: Skip None before counting; for normalize divide by the total of the counts (0 values → empty list, no division).'],
    tests: T([
      [["value_counts(['a', 'b', 'b', 'a', 'c', None])"], [['a', 2], ['b', 2], ['c', 1]]],
      [["value_counts(['a', 'b', 'b', 'a', 'c'], True)"], [['a', 0.4], ['b', 0.4], ['c', 0.2]]],
      [['value_counts([])'], []],
      [['value_counts([None, None], True)'], []],
      [['value_counts([3, 1, 1, 1, 3, 2])'], [[1, 3], [3, 2], [2, 1]]],
      [["value_counts(['z'])"], [['z', 1]]],
      [["value_counts(['x', 'y', 'y', 'y'], True)"], [['y', 0.75], ['x', 0.25]]],
      [['value_counts([i % 3 for i in range(100000)])[0]'], [0, 33334]]
    ]),
    solution: {
      approach: `<p>Count with <code>collections.Counter</code> (insertion-ordered), then a stable sort by descending count. pandas: <code>s.value_counts(normalize=True)</code>.</p>`,
      code: R`from collections import Counter

def value_counts(values, normalize=False):
    counts = Counter(v for v in values if v is not None)
    pairs = sorted(counts.items(), key=lambda kv: -kv[1])   # stable: ties keep first appearance
    if normalize:
        total = sum(counts.values())
        return [[v, c / total] for v, c in pairs]
    return [[v, c] for v, c in pairs]

print(value_counts(['a', 'b', 'b', 'a', 'c', None]))`,
      dry: { head: ['step', 'state'], rows: [['count', "{a:2, b:2, c:1}"], ['stable sort by -count', "a(2), b(2), c(1)"]] },
      complexity: `<p>O(n + u log u) time, O(u) space.</p>`,
      followUps: ['Return only the top k in O(n log k) (<code>Counter.most_common(k)</code>).', 'Add <code>dropna=False</code>.']
    }
  });

  practice.push({
    title: 'Center the Columns of a Matrix (X − X.mean(axis=0))',
    level: 'Easy', tags: ['broadcasting', 'axis', 'mean'], companies: ['Google', 'Apple'],
    statement: `<p>Given a non-ragged 2-D list <code>X</code> (rows of equal length), return a new matrix where each column has its own mean subtracted — the plain-Python version of <code>X - X.mean(axis=0)</code>. Do not modify the input.</p>`,
    constraints: `0 ≤ rows ≤ 10<sup>4</sup>, 1 ≤ cols ≤ 100 when rows &gt; 0.`,
    example: `<p>[[1, 2], [3, 4], [5, 9]] → column means [3, 5] → ${H.c('g', '[[-2, -3], [0, -1], [2, 4]]')}.</p>`,
    brute: { why: `<p>Recompute the column mean for every single cell: O(rows² · cols).</p>`, code: R`def center_columns(X):
    out = []
    for row in X:
        new = []
        for j, v in enumerate(row):
            col_mean = sum(r[j] for r in X) / len(X)   # recomputed per cell
            new.append(v - col_mean)
        out.append(new)
    return out

print(center_columns([[1, 2], [3, 4]]))` },
    mcq: { q: 'X has shape (100, 3). What shape is <code>X.mean(axis=0)</code>, and why does <code>X - X.mean(axis=0)</code> work?', options: ['(100,), it broadcasts over columns', '(3,), it is right-aligned with the last axis 3 and stretched over 100 rows', '(1,), a scalar', '(100, 3), no broadcasting needed'], answer: 1, explain: 'axis=0 disappears, leaving (3,). Right-aligned, (3,) matches (100, 3) on the last axis and is repeated for every row.' },
    hints: ['Hint 1: Compute all column means once, in one pass (or with <code>zip(*X)</code>).', 'Hint 2: <code>means = [sum(col) / len(X) for col in zip(*X)]</code>.', 'Hint 3: Then subtract with a nested comprehension; return [] for an empty matrix.'],
    tests: T([
      [['center_columns([[1, 2], [3, 4], [5, 9]])'], [[-2.0, -3.0], [0.0, -1.0], [2.0, 4.0]]],
      [['center_columns([])'], []],
      [['center_columns([[7, -1]])'], [[0.0, 0.0]]],
      [['center_columns([[1], [2]])'], [[-0.5], [0.5]]],
      [['center_columns([[0, 0, 0], [4, 4, 4]])'], [[-2.0, -2.0, -2.0], [2.0, 2.0, 2.0]]],
      [['(lambda X: (center_columns(X), X))([[1, 1], [3, 3]])[1]'], [[1, 1], [3, 3]]],
      [['sum(map(sum, center_columns([[i, 2 * i] for i in range(10001)])))'], 0.0]
    ]),
    solution: {
      approach: `<p>Column means in one pass via <code>zip(*X)</code> (the "axis=0" reduction), then subtract the same vector from every row (the broadcast).</p>`,
      code: R`def center_columns(X):
    if not X:
        return []
    n = len(X)
    means = [sum(col) / n for col in zip(*X)]          # X.mean(axis=0)
    return [[v - m for v, m in zip(row, means)] for row in X]   # broadcast over rows

print(center_columns([[1, 2], [3, 4], [5, 9]]))   # [[-2.0, -3.0], [0.0, -1.0], [2.0, 4.0]]`,
      dry: { head: ['step', 'value'], rows: [['columns', '(1,3,5), (2,4,9)'], ['means', '[3.0, 5.0]'], ['row [5, 9]', '<span class="c-g">[2.0, 4.0]</span>']] },
      complexity: `<p>O(rows · cols) time, O(rows · cols) output.</p>`,
      followUps: ['Standardize (divide by each column\'s std; guard std = 0).', 'Center rows instead (keepdims).']
    }
  });

  practice.push({
    title: 'dropna with how and subset',
    level: 'Easy', tags: ['missing data', 'dropna', 'filtering'], companies: ['Capital One', 'Intuit'],
    statement: `<p>Implement <code>dropna(rows, how='any', subset=None)</code> over a list of dicts (all rows have the same keys). Look only at the columns in <code>subset</code> (default: all columns). <code>how='any'</code> drops a row if any of those values is <code>None</code>; <code>how='all'</code> drops it only if all of them are <code>None</code>. Any other <code>how</code> raises <code>ValueError</code>. Keep the order of the remaining rows.</p>`,
    constraints: `0 ≤ len(rows) ≤ 10<sup>5</sup>`,
    example: `<p>rows = [{a:1, b:None}, {a:None, b:None}, {a:2, b:3}] → any: ${H.c('g', '[{a:2, b:3}]')}; all: [{a:1, b:None}, {a:2, b:3}]; any with subset ['a']: [{a:1, b:None}, {a:2, b:3}].</p>`,
    brute: { why: `<p>Build a new list by repeatedly removing bad rows with <code>list.remove</code>, which shifts elements: O(n²) in the worst case.</p>`, code: R`def dropna(rows, how='any', subset=None):
    if how not in ('any', 'all'):
        raise ValueError(how)
    out = list(rows)
    for r in list(out):
        cols = subset if subset is not None else list(r)
        miss = [r[c] is None for c in cols]
        if (how == 'any' and any(miss)) or (how == 'all' and all(miss)):
            out.remove(r)                     # O(n) shift each time
    return out

print(dropna([{'a': 1}, {'a': None}]))` },
    mcq: { q: 'What does <code>df.dropna(thresh=2)</code> keep?', options: ['rows with at most 2 NaN', 'rows with at least 2 non-NaN values', 'the first 2 rows', 'columns with 2 NaN'], answer: 1, explain: 'thresh is the minimum number of non-missing values a row needs to survive.' },
    hints: ['Hint 1: Decide per row with one boolean, then keep rows in a single comprehension.', 'Hint 2: <code>miss = [r[c] is None for c in cols]</code>; any → drop if any(miss); all → drop if all(miss).', 'Hint 3: Validate <code>how</code> first. Note that with an empty subset, any([]) is False and all([]) is True — pandas would keep everything; treat an empty subset as "keep all rows".'],
    tests: T([
      [["dropna(D)"], [{ a: 2, b: 3 }]],
      [["dropna(D, 'all')"], [{ a: 1, b: null }, { a: 2, b: 3 }]],
      [["dropna(D, subset=['a'])"], [{ a: 1, b: null }, { a: 2, b: 3 }]],
      [["dropna(D, 'all', ['b'])"], [{ a: 2, b: 3 }]],
      [["dropna([])"], []],
      [["dropna(D, 'some')"], '!ValueError'],
      [["dropna([{'a': 0, 'b': False}])"], [{ a: 0, b: false }]],
      [["dropna(D, subset=[])"], [{ a: 1, b: null }, { a: null, b: null }, { a: 2, b: 3 }]],
      [["len(dropna([{'x': i if i % 2 else None} for i in range(100000)]))"], 50000]
    ]),
    solution: {
      approach: `<p>One comprehension that keeps a row unless the chosen rule says drop. Zero and False are values, not missing. pandas: <code>df.dropna(how=how, subset=subset)</code>.</p>`,
      code: R`D = [{'a': 1, 'b': None}, {'a': None, 'b': None}, {'a': 2, 'b': 3}]

def dropna(rows, how='any', subset=None):
    if how not in ('any', 'all'):
        raise ValueError(f'invalid how: {how}')
    def drop(r):
        cols = list(r) if subset is None else subset
        if not cols:
            return False                      # nothing to check: keep
        miss = [r[c] is None for c in cols]
        return any(miss) if how == 'any' else all(miss)
    return [r for r in rows if not drop(r)]

print(dropna(D), dropna(D, 'all'))`,
      dry: { head: ['row', 'miss', 'any', 'all'], rows: [['{1, None}', '[F, T]', 'drop', 'keep'], ['{None, None}', '[T, T]', 'drop', 'drop'], ['{2, 3}', '[F, F]', 'keep', 'keep']] },
      complexity: `<p>O(n · k) for k checked columns.</p>`,
      followUps: ['Add <code>thresh</code>.', 'Drop columns instead of rows (<code>axis=1</code>).']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Forward Fill with a limit',
    level: 'Medium', tags: ['ffill', 'missing data', 'time series'], companies: ['Bloomberg', 'Jane Street'],
    statement: `<p>Implement <code>ffill(values, limit=None)</code> like <code>pd.Series(values).ffill(limit=limit)</code>: each <code>None</code> takes the last non-missing value before it, but at most <code>limit</code> consecutive missing values in a run are filled (the rest stay <code>None</code>). Leading <code>None</code>s stay <code>None</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; limit is None or ≥ 1.`,
    example: `<p><code>ffill([1, None, None, None, 5, None], 2)</code> → ${H.c('g', '[1, 1, 1, None, 5, 5]')}: the third gap in the run exceeds the limit.</p>`,
    brute: { why: `<p>For every missing position, walk backwards to find the last real value and count the gap length: O(n · gap), up to O(n²) for long gaps.</p>`, code: R`def ffill(values, limit=None):
    out = []
    for i, v in enumerate(values):
        if v is not None:
            out.append(v)
            continue
        j = i - 1
        while j >= 0 and values[j] is None:   # walk back over the gap
            j -= 1
        gap = i - j
        ok = j >= 0 and (limit is None or gap <= limit)
        out.append(values[j] if ok else None)
    return out

print(ffill([1, None, 3]))` },
    mcq: { q: 'For per-customer data sorted by date, how do you forward-fill without leaking values between customers?', options: ['df.ffill()', 'df.groupby("customer").ffill()', 'df.fillna(method="pad")', 'df.interpolate()'], answer: 1, explain: 'A plain ffill carries the last customer\'s value into the next customer\'s first rows. groupby().ffill() restarts in each group.' },
    hints: ['Hint 1: Walk once, remembering the last real value and how long the current gap is.', 'Hint 2: Reset the gap counter at each real value; increment it at each None.', 'Hint 3: Fill when a last value exists and (limit is None or gap ≤ limit); else append None.'],
    tests: T([
      [['ffill([1, None, None, None, 5, None], 2)'], [1, 1, 1, null, 5, 5]],
      [['ffill([1, None, None, None, 5, None])'], [1, 1, 1, 1, 5, 5]],
      [['ffill([None, None, 2, None])'], [null, null, 2, 2]],
      [['ffill([])'], []],
      [['ffill([None])'], [null]],
      [['ffill([0, None, None], 1)'], [0, 0, null]],
      [["ffill(['a', None, 'b'])"], ['a', 'a', 'b']],
      [['ffill([1] + [None] * 999999)[-1]'], 1],
      [['ffill([1] + [None] * 999999, 3).count(None)'], 999996]
    ]),
    solution: {
      approach: `<p>Single pass with two pieces of state: the last real value and the current gap length. pandas: <code>s.ffill(limit=k)</code>; per entity: <code>df.groupby(id).ffill()</code>.</p>`,
      code: R`_MISSING = object()

def ffill(values, limit=None):
    last, gap, out = _MISSING, 0, []
    for v in values:
        if v is not None:
            last, gap = v, 0
            out.append(v)
            continue
        gap += 1
        if last is not _MISSING and (limit is None or gap <= limit):
            out.append(last)
        else:
            out.append(None)
    return out

print(ffill([1, None, None, None, 5, None], 2))   # [1, 1, 1, None, 5, 5]`,
      dry: { head: ['v', 'last', 'gap', 'out'], rows: [['1', '1', '0', '1'], ['None', '1', '1', '1'], ['None', '1', '2', '1'], ['None', '1', '3', '<span class="c-r">None</span>'], ['5', '5', '0', '5'], ['None', '5', '1', '5']] },
      complexity: `<p>O(n) time, O(1) extra state.</p>`,
      followUps: ['Implement <code>bfill</code> (scan from the right).', 'Linear interpolation of interior gaps.']
    }
  });

  practice.push({
    title: 'Merge with how = inner / left / right / outer',
    level: 'Medium', tags: ['merge', 'join', 'hash join'], companies: ['Airbnb', 'LinkedIn', 'Snowflake'],
    statement: `<p>Implement <code>join(left, right, how)</code> where <code>left</code> and <code>right</code> are lists of <code>[key, value]</code>. Output rows <code>[key, left_value, right_value]</code> with <code>None</code> for a missing side, ordered like pandas 2.x <code>merge</code>: <b>inner</b> and <b>left</b> follow left row order (each left row followed by its matches in right order); <b>right</b> follows right row order (each right row with its left matches in left order); <b>outer</b> sorts by key, and within a key lists left rows in order, each paired with matching right rows in order. Unknown <code>how</code> → <code>ValueError</code>.</p>`,
    constraints: `0 ≤ len(left), len(right) ≤ 10<sup>4</sup>; keys mutually comparable.`,
    example: `<p>left = [b 1, a 2, c 3, b 4], right = [b 10, d 20, a 30, b 40].<br>inner → [b 1 10], [b 1 40], [a 2 30], [b 4 10], [b 4 40]<br>outer → ${H.c('g', '[a 2 30], [b 1 10], [b 1 40], [b 4 10], [b 4 40], [c 3 None], [d None 20]')}</p>`,
    brute: { why: `<p>Nested loops for every mode: O(n · m) comparisons, and an extra O(n · m) pass to find unmatched rows.</p>`, code: R`def join(left, right, how):
    out = []
    if how in ('inner', 'left'):
        for k, lv in left:
            hits = [rv for rk, rv in right if rk == k]       # full scan
            out += [[k, lv, rv] for rv in hits] or ([[k, lv, None]] if how == 'left' else [])
    elif how == 'right':
        for k, rv in right:
            hits = [lv for lk, lv in left if lk == k]
            out += [[k, lv, rv] for lv in hits] or [[k, None, rv]]
    else:
        raise ValueError(how)
    return out

print(join([['a', 1]], [['a', 2]], 'inner'))` },
    mcq: { q: 'Which merge mode returns keys in sorted order in pandas 2.x?', options: ['inner', 'left', 'right', 'outer'], answer: 3, explain: 'Per the pandas docs, outer "sorts keys lexicographically". inner keeps left key order; left and right keep their own side\'s order.' },
    hints: ['Hint 1: Index both sides with dict key → list of values (order preserved).', 'Hint 2: inner/left: iterate left rows, look up right. right: iterate right rows, look up left.', 'Hint 3: outer: for each key in sorted(union of keys): if both sides have it emit the product (left outer loop, right inner loop); else emit the one-sided rows with None.'],
    tests: T([
      [["join(L, Rt, 'inner')"], [['b', 1, 10], ['b', 1, 40], ['a', 2, 30], ['b', 4, 10], ['b', 4, 40]]],
      [["join(L, Rt, 'left')"], [['b', 1, 10], ['b', 1, 40], ['a', 2, 30], ['c', 3, null], ['b', 4, 10], ['b', 4, 40]]],
      [["join(L, Rt, 'right')"], [['b', 1, 10], ['b', 4, 10], ['d', null, 20], ['a', 2, 30], ['b', 1, 40], ['b', 4, 40]]],
      [["join(L, Rt, 'outer')"], [['a', 2, 30], ['b', 1, 10], ['b', 1, 40], ['b', 4, 10], ['b', 4, 40], ['c', 3, null], ['d', null, 20]]],
      [["join([], Rt, 'left')"], []],
      [["join([], [['x', 1]], 'outer')"], [['x', null, 1]]],
      [["join(L, [], 'inner')"], []],
      [["join(L, Rt, 'cross')"], '!ValueError'],
      [["len(join([[i % 10, i] for i in range(1000)], [[i % 10, i] for i in range(1000)], 'inner'))"], 100000]
    ]),
    solution: {
      approach: `<p>Build key → values indexes for both sides (O(n + m)), then drive the output from the side whose order pandas preserves; for outer, from the sorted key union.</p>`,
      code: R`from collections import defaultdict

L = [['b', 1], ['a', 2], ['c', 3], ['b', 4]]
Rt = [['b', 10], ['d', 20], ['a', 30], ['b', 40]]

def join(left, right, how):
    li, ri = defaultdict(list), defaultdict(list)
    for k, v in left:
        li[k].append(v)
    for k, v in right:
        ri[k].append(v)
    out = []
    if how in ('inner', 'left'):
        for k, lv in left:
            if k in ri:
                out.extend([k, lv, rv] for rv in ri[k])
            elif how == 'left':
                out.append([k, lv, None])
    elif how == 'right':
        for k, rv in right:
            if k in li:
                out.extend([k, lv, rv] for lv in li[k])
            else:
                out.append([k, None, rv])
    elif how == 'outer':
        for k in sorted(set(li) | set(ri)):
            lvs, rvs = li.get(k, [None]), ri.get(k, [None])
            out.extend([k, lv, rv] for lv in lvs for rv in rvs)
    else:
        raise ValueError(f'unknown how: {how}')
    return out

for h in ('inner', 'left', 'right', 'outer'):
    print(h, join(L, Rt, h))`,
      dry: { head: ['outer key', 'left vals', 'right vals', 'rows'], rows: [['a', '[2]', '[30]', 'a 2 30'], ['b', '[1, 4]', '[10, 40]', '4 rows (product)'], ['c', '[3]', '—', 'c 3 None'], ['d', '—', '[20]', 'd None 20']] },
      complexity: `<p>O(n + m + output) plus O(u log u) for sorting keys in outer.</p>`,
      followUps: ['Add <code>indicator</code> output.', 'Multi-column keys (use tuples).']
    }
  });

  practice.push({
    title: 'melt: Wide to Long',
    level: 'Medium', tags: ['melt', 'reshape', 'tidy data'], companies: ['Tableau', 'Salesforce'],
    statement: `<p>Implement <code>melt(rows, id_vars, value_vars=None)</code> over a list of dicts like <code>pd.melt(df, id_vars=..., value_vars=...)</code>. <code>value_vars</code> defaults to every column not in <code>id_vars</code> (in the column order of the first row). Output dicts contain the id columns, then <code>'variable'</code> and <code>'value'</code>. Order: all rows for the first value column, then all rows for the second, etc.</p>`,
    constraints: `0 ≤ len(rows) ≤ 10<sup>5</sup>; all rows share the same keys.`,
    example: `<p>[{day: Mon, A: 1, B: 2}, {day: Tue, A: 3, B: 4}] with id_vars ['day'] → ${H.c('g', 'Mon A 1, Tue A 3, Mon B 2, Tue B 4')}.</p>`,
    brute: { why: `<p>Rows-first order (Mon A, Mon B, Tue A…) is the natural loop but the wrong order for pandas; fixing it afterwards with a sort on the variable column costs O(N log N) and reorders ids if the sort is not stable.</p>`, code: R`def melt(rows, id_vars, value_vars=None):
    if value_vars is None:
        value_vars = [c for c in (rows[0] if rows else {}) if c not in id_vars]
    out = []
    for r in rows:                                   # rows first...
        for c in value_vars:
            out.append({**{k: r[k] for k in id_vars}, 'variable': c, 'value': r[c]})
    out.sort(key=lambda d: value_vars.index(d['variable']))  # ...then fix the order
    return out

print(melt([{'d': 1, 'A': 2}], ['d']))` },
    mcq: { q: 'A wide frame has 1,000 rows, 2 id columns and 12 month columns. How many rows does melt (id_vars = the 2 ids) produce?', options: ['1,000', '12,000', '14,000', '24,000'], answer: 1, explain: 'One output row per (input row, value column): 1,000 × 12.' },
    hints: ['Hint 1: Output size is len(rows) × len(value_vars); loop over value columns on the outside.', 'Hint 2: Default value_vars: columns of the first row that are not id columns, in order.', 'Hint 3: For each column c, for each row r: append {ids..., "variable": c, "value": r[c]}. Empty rows → [].'],
    tests: T([
      [["melt(W, ['day'])"], [{ day: 'Mon', variable: 'A', value: 1 }, { day: 'Tue', variable: 'A', value: 3 }, { day: 'Mon', variable: 'B', value: 2 }, { day: 'Tue', variable: 'B', value: 4 }]],
      [["melt(W, ['day'], ['B'])"], [{ day: 'Mon', variable: 'B', value: 2 }, { day: 'Tue', variable: 'B', value: 4 }]],
      [["melt([], ['day'])"], []],
      [["melt(W, [], ['A'])"], [{ variable: 'A', value: 1 }, { variable: 'A', value: 3 }]],
      [["melt([{'id': 1, 'x': None}], ['id'])"], [{ id: 1, variable: 'x', value: null }]],
      [["melt(W, ['day', 'A'])"], [{ day: 'Mon', A: 1, variable: 'B', value: 2 }, { day: 'Tue', A: 3, variable: 'B', value: 4 }]],
      [["len(melt([{'id': i, 'a': i, 'b': i, 'c': i} for i in range(10000)], ['id']))"], 30000]
    ]),
    solution: {
      approach: `<p>Outer loop over value columns, inner loop over rows: that is exactly pandas' order (it stacks column blocks). Then pivot can undo it.</p>`,
      code: R`W = [{'day': 'Mon', 'A': 1, 'B': 2}, {'day': 'Tue', 'A': 3, 'B': 4}]

def melt(rows, id_vars, value_vars=None):
    if value_vars is None:
        first = rows[0] if rows else {}
        value_vars = [c for c in first if c not in id_vars]
    return [{**{k: r[k] for k in id_vars}, 'variable': c, 'value': r[c]}
            for c in value_vars          # column blocks first
            for r in rows]

for row in melt(W, ['day']):
    print(row)`,
      dry: { head: ['column', 'row', 'output'], rows: [['A', 'Mon', 'Mon A 1'], ['A', 'Tue', 'Tue A 3'], ['B', 'Mon', 'Mon B 2'], ['B', 'Tue', 'Tue B 4']] },
      complexity: `<p>O(rows · value_vars) time and output.</p>`,
      followUps: ['Add <code>var_name</code>/<code>value_name</code>.', 'Write the inverse (pivot).']
    }
  });

  practice.push({
    title: 'pivot Without Aggregation (and Its Duplicate Error)',
    level: 'Medium', tags: ['pivot', 'reshape', 'validation'], companies: ['Microsoft', 'DoorDash'],
    statement: `<p>Implement <code>pivot(records)</code> for <code>[row, col, value]</code> triples like <code>df.pivot(index=..., columns=..., values=...)</code>: return <code>{'index', 'columns', 'data'}</code> with sorted labels and <code>None</code> for missing cells. If any (row, col) pair appears twice, raise <code>ValueError</code> (pandas: "Index contains duplicate entries, cannot reshape").</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>`,
    example: `<p>[[r1, x, 1], [r2, y, 2]] → index [r1, r2], columns [x, y], data ${H.c('g', '[[1, None], [None, 2]]')}. [[r1, x, 1], [r1, x, 5]] → ${H.c('r', 'ValueError')}.</p>`,
    brute: { why: `<p>Check duplicates by comparing every pair of records: O(n²) — 5·10<sup>9</sup> comparisons for 10<sup>5</sup> records.</p>`, code: R`def pivot(records):
    for i in range(len(records)):
        for j in range(i + 1, len(records)):            # O(n^2) duplicate check
            if records[i][:2] == records[j][:2]:
                raise ValueError('duplicate entries')
    rows = sorted({r for r, _, _ in records})
    cols = sorted({c for _, c, _ in records})
    cell = {(r, c): v for r, c, v in records}
    return {'index': rows, 'columns': cols,
            'data': [[cell.get((r, c)) for c in cols] for r in rows]}

print(pivot([['r', 'c', 1]]))` },
    mcq: { q: 'You must reshape but duplicates are legitimate (two sales same day/store). Best fix?', options: ['drop_duplicates() first', 'pivot_table with aggfunc="sum"', 'pivot with errors="ignore"', 'unstack twice'], answer: 1, explain: 'pivot_table aggregates duplicates explicitly. drop_duplicates would silently lose a sale; pivot has no errors option.' },
    hints: ['Hint 1: A dict keyed by (row, col) both stores cells and detects duplicates.', 'Hint 2: Before storing, if the key is already present, raise ValueError.', 'Hint 3: Then lay out sorted rows × sorted cols with dict.get (None for absent).'],
    tests: T([
      [["pivot([['r1', 'x', 1], ['r2', 'y', 2]])"], { index: ['r1', 'r2'], columns: ['x', 'y'], data: [[1, null], [null, 2]] }],
      [["pivot([['r1', 'x', 1], ['r1', 'x', 5]])"], '!ValueError'],
      [['pivot([])'], { index: [], columns: [], data: [] }],
      [["pivot([['b', 2, 'p'], ['a', 1, 'q'], ['b', 1, 'r']])"], { index: ['a', 'b'], columns: [1, 2], data: [['q', null], ['r', 'p']] }],
      [["pivot([['r', 'c', None]])"], { index: ['r'], columns: ['c'], data: [[null]] }],
      [["pivot([['r', 'c', 0], ['r', 'd', 0], ['s', 'c', 0], ['r', 'c', 0]])"], '!ValueError'],
      [["len(pivot([[i, i % 3, i] for i in range(30000)])['data'])"], 30000]
    ]),
    solution: {
      approach: `<p>One pass into a dict with a duplicate check, then lay out sorted labels. pandas does the same via a MultiIndex uniqueness check and unstack.</p>`,
      code: R`def pivot(records):
    cell = {}
    for r, c, v in records:
        if (r, c) in cell:
            raise ValueError('Index contains duplicate entries, cannot reshape')
        cell[(r, c)] = v
    rows = sorted({r for r, _ in cell})
    cols = sorted({c for _, c in cell})
    return {'index': rows, 'columns': cols,
            'data': [[cell.get((r, c)) for c in cols] for r in rows]}

print(pivot([['r1', 'x', 1], ['r2', 'y', 2]]))`,
      dry: { head: ['record', 'cell dict', 'action'], rows: [['r1,x,1', '{(r1,x):1}', 'store'], ['r1,x,5', 'key exists', '<span class="c-r">ValueError</span>']] },
      complexity: `<p>O(n + R log R + C log C + R·C).</p>`,
      followUps: ['Report all duplicate pairs instead of the first.', 'Support several value columns (column MultiIndex).']
    }
  });

  practice.push({
    title: 'Share of Group Total (groupby + transform)',
    level: 'Medium', tags: ['groupby', 'transform', 'window'], companies: ['Shopify', 'Uber'],
    statement: `<p>Write <code>group_share(rows, key, col)</code>: for each row (in input order) return <code>round(row[col] / total_of_its_group, 2)</code>, like <code>(df[col] / df.groupby(key)[col].transform('sum')).round(2)</code>. If a group's total is 0, return <code>None</code> for its rows.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; values are non-negative numbers; keys are never None.`,
    example: `<p>NY 10, LA 5, NY 30, LA 15 → group totals NY 40, LA 20 → ${H.c('g', '[0.25, 0.25, 0.75, 0.75]')}.</p>`,
    brute: { why: `<p>Re-sum the group for every row: O(n · group size), O(n²) if everything is one group.</p>`, code: R`def group_share(rows, key, col):
    out = []
    for r in rows:
        total = sum(x[col] for x in rows if x[key] == r[key])   # O(n) per row
        out.append(round(r[col] / total, 2) if total else None)
    return out

print(group_share([{'k': 'a', 'v': 1}, {'k': 'a', 'v': 3}], 'k', 'v'))` },
    mcq: { q: 'Why transform instead of agg here?', options: ['agg is slower', 'transform returns a result aligned to every original row', 'agg cannot sum', 'transform sorts the groups'], answer: 1, explain: 'agg gives one row per group; transform broadcasts the group statistic back to each row, so you can divide row by row.' },
    hints: ['Hint 1: Two passes: first totals per key, then one division per row.', 'Hint 2: <code>totals = defaultdict(float)</code>; add each value to its key.', 'Hint 3: Second pass: round(v / totals[k], 2) unless the total is 0 → None.'],
    tests: T([
      [["group_share([{'k': 'NY', 'v': 10}, {'k': 'LA', 'v': 5}, {'k': 'NY', 'v': 30}, {'k': 'LA', 'v': 15}], 'k', 'v')"], [0.25, 0.25, 0.75, 0.75]],
      [["group_share([], 'k', 'v')"], []],
      [["group_share([{'k': 1, 'v': 7}], 'k', 'v')"], [1.0]],
      [["group_share([{'k': 1, 'v': 0}, {'k': 1, 'v': 0}], 'k', 'v')"], [null, null]],
      [["group_share([{'k': 'a', 'v': 1}, {'k': 'a', 'v': 2}], 'k', 'v')"], [0.33, 0.67]],
      [["group_share([{'k': 'a', 'v': 0}, {'k': 'b', 'v': 3}], 'k', 'v')"], [null, 1.0]],
      [["group_share([{'k': i % 2, 'v': i} for i in range(6)], 'k', 'v')"], [0.0, 0.11, 0.33, 0.33, 0.67, 0.56]],
      [["len(group_share([{'k': i % 4, 'v': 1} for i in range(100000)], 'k', 'v'))"], 100000]
    ]),
    solution: {
      approach: `<p>Aggregate once (O(n)) into a dict of totals, then map each row to its share: the transform pattern.</p>`,
      code: R`from collections import defaultdict

def group_share(rows, key, col):
    totals = defaultdict(float)
    for r in rows:                                   # groupby(key)[col].sum()
        totals[r[key]] += r[col]
    return [round(r[col] / totals[r[key]], 2) if totals[r[key]] else None
            for r in rows]                           # transform back to rows

print(group_share([{'k': 'NY', 'v': 10}, {'k': 'LA', 'v': 5},
                   {'k': 'NY', 'v': 30}, {'k': 'LA', 'v': 15}], 'k', 'v'))`,
      dry: { head: ['row', 'total', 'share'], rows: [['NY 10', '40', '0.25'], ['LA 5', '20', '0.25'], ['NY 30', '40', '0.75'], ['LA 15', '20', '0.75']] },
      complexity: `<p>O(n) time, O(groups) extra space.</p>`,
      followUps: ['Rank within group (descending, method="dense").', 'Running share (cumsum within group / group total).']
    }
  });

  practice.push({
    title: 'resample("D").sum(): Daily Totals with Empty Days',
    level: 'Medium', tags: ['time series', 'resample', 'datetime'], companies: ['Stripe', 'Datadog', 'Square'],
    statement: `<p>Given events <code>[[date_str, amount], ...]</code> in any order (dates as <code>'YYYY-MM-DD'</code>), return <code>[[date_str, total], ...]</code> for <b>every</b> calendar day from the earliest to the latest event, in order, with total 0 for days with no events — what <code>s.resample('D').sum()</code> returns on a DatetimeIndex.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; span ≤ 10<sup>4</sup> days.`,
    example: `<p>[['2024-01-03', 4], ['2024-01-01', 5], ['2024-01-01', 2]] → ${H.c('g', "[['2024-01-01', 7], ['2024-01-02', 0], ['2024-01-03', 4]]")}. A plain groupby by date would skip Jan 2.</p>`,
    brute: { why: `<p>For every day in the span, scan all events for that date: O(days · n) = 10<sup>9</sup> at the limits.</p>`, code: R`from datetime import date, timedelta

def resample_daily(events):
    if not events:
        return []
    days = [date.fromisoformat(d) for d, _ in events]
    cur, end, out = min(days), max(days), []
    while cur <= end:
        s = cur.isoformat()
        out.append([s, sum(v for d, v in events if d == s)])   # full scan per day
        cur += timedelta(days=1)
    return out

print(resample_daily([['2024-01-02', 1], ['2024-01-01', 2]]))` },
    mcq: { q: 'Daily resample with <code>.mean()</code> on a day with no events gives?', options: ['0', 'NaN', 'the previous day\'s mean', 'the day is skipped'], answer: 1, explain: 'An empty bin has no values; sum of nothing is 0 but mean of nothing is NaN.' },
    hints: ['Hint 1: Totals per date in one pass with a dict.', 'Hint 2: Walk from the min date to the max date with <code>timedelta(days=1)</code>.', 'Hint 3: Emit [day.isoformat(), totals.get(day, 0)] for each day. Leap years and month ends are handled by the date type.'],
    tests: T([
      [["resample_daily([['2024-01-03', 4], ['2024-01-01', 5], ['2024-01-01', 2]])"], [['2024-01-01', 7], ['2024-01-02', 0], ['2024-01-03', 4]]],
      [['resample_daily([])'], []],
      [["resample_daily([['2024-05-05', 3]])"], [['2024-05-05', 3]]],
      [["resample_daily([['2024-02-28', 1], ['2024-03-01', 1]])"], [['2024-02-28', 1], ['2024-02-29', 0], ['2024-03-01', 1]]],
      [["resample_daily([['2023-12-31', -2], ['2024-01-01', 2]])"], [['2023-12-31', -2], ['2024-01-01', 2]]],
      [["resample_daily([['2024-01-01', 1.5], ['2024-01-01', 2.5]])"], [['2024-01-01', 4.0]]],
      [["len(resample_daily([['2000-01-01', 1], ['2000-12-31', 1]]))"], 366],
      [["sum(t for _, t in resample_daily([['2024-01-0' + str(i % 9 + 1), 1] for i in range(100000)]))"], 100000]
    ]),
    solution: {
      approach: `<p>Aggregate per day with a dict (groupby), then generate the complete calendar range (what resample adds) and look each day up. pandas: <code>s.resample('D').sum()</code>.</p>`,
      code: R`from collections import defaultdict
from datetime import date, timedelta

def resample_daily(events):
    totals = defaultdict(int)
    for d, v in events:
        totals[date.fromisoformat(d)] += v
    if not totals:
        return []
    cur, end, out = min(totals), max(totals), []
    while cur <= end:                        # every calendar day, gaps included
        out.append([cur.isoformat(), totals.get(cur, 0)])
        cur += timedelta(days=1)
    return out

print(resample_daily([['2024-01-03', 4], ['2024-01-01', 5], ['2024-01-01', 2]]))`,
      dry: { head: ['day', 'total'], rows: [['01-01', '5 + 2 = 7'], ['01-02', '<span class="c-y">0 (empty bin)</span>'], ['01-03', '4']] },
      complexity: `<p>O(n + D) for D days in the span.</p>`,
      followUps: ['Weekly bins ending Sunday.', 'Resample with forward-filled last value instead of sum.']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'merge_asof: Match Each Trade to the Latest Quote',
    level: 'Hard', tags: ['merge_asof', 'two pointers', 'time series'], companies: ['Citadel', 'Jane Street', 'Hudson River Trading'],
    statement: `<p>Implement <code>asof(left_times, right, direction='backward')</code>. <code>left_times</code> is a sorted list of numbers; <code>right</code> is a list of <code>[time, value]</code> sorted by time. For each left time return a matched right value or <code>None</code>, like <code>pd.merge_asof(..., direction=...)</code> with exact matches allowed: <b>backward</b> = the last right row with time ≤ t; <b>forward</b> = the first right row with time ≥ t; <b>nearest</b> = the closest in absolute distance, ties going to the backward candidate.</p>`,
    constraints: `0 ≤ n, m ≤ 10<sup>6</sup>. Must be O(n + m).`,
    example: `<p>right = [[1, 'a'], [3, 'b'], [3, 'c'], [7, 'd']], left = [0, 3, 5, 9].<br>backward → ${H.c('g', "[None, 'c', 'c', 'd']")} (for t = 3 the <b>last</b> row with time 3). forward → ['a', 'b', 'd', None]. nearest → ['a', 'c', 'c', 'd'] (5 is 2 from 3 and 2 from 7: tie → backward).</p>`,
    brute: { why: `<p>For each left time, scan all right rows and keep the best candidate: O(n · m) = 10<sup>12</sup> at the limits. Both inputs are sorted, so the right pointer never needs to move backwards.</p>`, code: R`def asof(left_times, right, direction='backward'):
    out = []
    for t in left_times:
        back = fwd = None
        for rt, rv in right:                       # full scan per left row
            if rt <= t:
                back = (rt, rv)
            if rt >= t and fwd is None:
                fwd = (rt, rv)
        if direction == 'backward':
            out.append(back[1] if back else None)
        elif direction == 'forward':
            out.append(fwd[1] if fwd else None)
        else:
            cands = [c for c in (back, fwd) if c]
            out.append(min(cands, key=lambda c: abs(c[0] - t))[1] if cands else None)
    return out

print(asof([5], [[3, 'b'], [7, 'd']], 'nearest'))` },
    mcq: { q: 'What must be true before calling <code>pd.merge_asof(trades, quotes, on="time")</code>?', options: ['time must be unique on both sides', 'both frames must be sorted by time', 'quotes must have fewer rows', 'time must be an integer'], answer: 1, explain: 'merge_asof is a sorted two-pointer sweep; pandas raises "left keys must be sorted" otherwise.' },
    hints: ['Hint 1: Both lists are sorted, so as t grows, the backward candidate only moves forward. One pointer over right is enough.', 'Hint 2: Advance j while right[j].time ≤ t; then right[j-1] is the backward match. For forward use the first index with time ≥ t (a second pointer, or check equality).', 'Hint 3: nearest: compare t − back_time and fwd_time − t; on a tie keep back. Handle j = 0 (no backward) and j = m (no forward).'],
    tests: T([
      [["asof([0, 3, 5, 9], Q)"], [null, 'c', 'c', 'd']],
      [["asof([0, 3, 5, 9], Q, 'forward')"], ['a', 'b', 'd', null]],
      [["asof([0, 3, 5, 9], Q, 'nearest')"], ['a', 'c', 'c', 'd']],
      [["asof([], Q)"], []],
      [["asof([1, 2], [])"], [null, null]],
      [["asof([6], [[3, 'x'], [8, 'y']], 'nearest')"], ['y']],
      [["asof([-5, 100], [[0, 1]], 'nearest')"], [1, 1]],
      [["asof([2, 2], [[2, 'p'], [2, 'q']], 'forward')"], ['p', 'p']],
      [["asof(list(range(0, 2000000, 2)), [[i, i] for i in range(1, 2000000, 2)])[-1]"], 1999997]
    ]),
    solution: {
      approach: `<p>Two pointers. <code>j</code> = number of right rows with time ≤ t (advance while true); backward = right[j−1]. <code>k</code> = number of right rows with time &lt; t; forward = right[k]. Both only move forward because left is sorted, so the total work is O(n + m).</p>`,
      code: R`Q = [[1, 'a'], [3, 'b'], [3, 'c'], [7, 'd']]

def asof(left_times, right, direction='backward'):
    m, j, k, out = len(right), 0, 0, []
    for t in left_times:
        while j < m and right[j][0] <= t:      # rows with time <= t
            j += 1
        while k < m and right[k][0] < t:       # rows with time < t
            k += 1
        back = right[j - 1] if j > 0 else None
        fwd = right[k] if k < m else None
        if direction == 'backward':
            hit = back
        elif direction == 'forward':
            hit = fwd
        elif direction == 'nearest':
            if back is None or fwd is None:
                hit = back or fwd
            else:
                hit = back if t - back[0] <= fwd[0] - t else fwd   # tie -> backward
        else:
            raise ValueError(direction)
        out.append(hit[1] if hit else None)
    return out

print(asof([0, 3, 5, 9], Q), asof([0, 3, 5, 9], Q, 'nearest'))`,
      dry: { head: ['t', 'j (≤ t)', 'k (&lt; t)', 'back', 'fwd', 'nearest'], rows: [['0', '0', '0', 'None', 'a@1', 'a'], ['3', '3', '1', 'c@3', 'b@3', 'c (tie 0, back)'], ['5', '3', '3', 'c@3', 'd@7', 'c (tie 2, back)'], ['9', '4', '4', 'd@7', 'None', 'd']] },
      complexity: `<p>O(n + m) time, O(1) extra space besides the output.</p>`,
      followUps: ['Add <code>tolerance</code> (no match if farther than X).', 'Add <code>by=</code> (match only within the same ticker): one pointer per group.']
    }
  });

  practice.push({
    title: 'Broadcasting Addition on Nested Lists',
    level: 'Hard', tags: ['broadcasting', 'recursion', 'ndarray'], companies: ['NVIDIA', 'Google', 'OpenAI'],
    statement: `<p>Implement <code>broadcast_add(a, b)</code> where each argument is a number (0-d) or a rectangular nested list (any depth). Return the element-wise sum following NumPy broadcasting rules, as nested lists, or raise <code>ValueError</code> if the shapes are incompatible.</p>`,
    constraints: `Up to 4 dimensions; output ≤ 10<sup>6</sup> elements.`,
    example: `<p><code>broadcast_add([[1], [2]], [10, 20])</code>: shapes (2, 1) and (2,) → (2, 2) → ${H.c('g', '[[11, 21], [12, 22]]')}. <code>broadcast_add([1, 2, 3], [1, 2])</code> → ${H.c('r', 'ValueError')}.</p>`,
    brute: { why: `<p>Physically tile both inputs to the full output shape (copying data, as <code>np.tile</code> would) and then add element-wise. Correct, but it materialises two full-size copies; broadcasting only needs to map each output index to an input index.</p>`, code: R`def shape(x):
    s = []
    while isinstance(x, list):
        s.append(len(x))
        x = x[0] if x else None
    return s

def tile(x, xs, out):
    # pad shape on the left, then repeat size-1 axes to match out
    xs = [1] * (len(out) - len(xs)) + xs
    for _ in range(len(out) - len(shape(x))):
        x = [x]
    def rec(v, d):
        if d == len(out):
            return v
        items = v if xs[d] == out[d] else v * out[d]   # copy to stretch
        return [rec(e, d + 1) for e in items]
    return rec(x, 0)

def broadcast_add(a, b):
    sa, sb = shape(a), shape(b)
    n = max(len(sa), len(sb))
    pa, pb = [1] * (n - len(sa)) + sa, [1] * (n - len(sb)) + sb
    out = []
    for x, y in zip(pa, pb):
        if x != y and 1 not in (x, y):
            raise ValueError('cannot broadcast')
        out.append(y if x == 1 else x)
    ta, tb = tile(a, sa, out), tile(b, sb, out)
    def add(u, v, d):
        return u + v if d == len(out) else [add(p, q, d + 1) for p, q in zip(u, v)]
    return add(ta, tb, 0)

print(broadcast_add([[1], [2]], [10, 20]))` },
    mcq: { q: 'In the broadcast result, which input index does output index (i, j) read from an operand of shape (3, 1)?', options: ['(i, j)', '(i, 0)', '(0, j)', '(j, i)'], answer: 1, explain: 'A size-1 axis is stretched: its index is always 0 (stride 0). The size-3 axis uses i.' },
    hints: ['Hint 1: First compute both shapes (follow the first element down) and the broadcast shape with the right-aligned rule.', 'Hint 2: Build the output recursively over output axes. Keep a cursor into each input; on an axis where that input has size 1 always step into element 0, where it is missing (left padding) do not step at all.', 'Hint 3: At depth == ndim, add the two scalars. A size-0 output axis gives []. Two scalars just add.'],
    tests: T([
      [['broadcast_add([[1], [2]], [10, 20])'], [[11, 21], [12, 22]]],
      [['broadcast_add([1, 2, 3], [1, 2])'], '!ValueError'],
      [['broadcast_add(2, 3)'], 5],
      [['broadcast_add([1, 2], 10)'], [11, 12]],
      [['broadcast_add([[1, 2]], [[10], [20]])'], [[11, 12], [21, 22]]],
      [['broadcast_add([[[1, 2]]], [[10], [20]])'], [[[11, 12], [21, 22]]]],
      [['broadcast_add([], [5])'], []],
      [['broadcast_add([[1, 2], [3, 4]], [[1, 2, 3]])'], '!ValueError'],
      [['broadcast_add([[0.5]], [[1, 2], [3, 4]])'], [[1.5, 2.5], [3.5, 4.5]]],
      [['sum(map(sum, broadcast_add([[i] for i in range(1000)], list(range(1000)))))'], 999000000]
    ]),
    solution: {
      approach: `<p>Compute shapes, the broadcast shape, and then recurse over output axes carrying one cursor per input. For each input, an axis is either missing (left-padded: do not descend), size 1 (always descend into element 0: stride 0) or full size (descend into element i). No input is copied.</p>`,
      code: R`def _shape(x):
    s = []
    while isinstance(x, list):
        s.append(len(x))
        x = x[0] if x else None
    return s

def broadcast_add(a, b):
    sa, sb = _shape(a), _shape(b)
    n = max(len(sa), len(sb))
    pa = [None] * (n - len(sa)) + sa           # None = missing leading axis
    pb = [None] * (n - len(sb)) + sb
    out = []
    for x, y in zip(pa, pb):
        x1, y1 = 1 if x is None else x, 1 if y is None else y
        if x1 != y1 and x1 != 1 and y1 != 1:
            raise ValueError(f'operands could not be broadcast: {sa} vs {sb}')
        out.append(y1 if x1 == 1 else x1)

    def step(cur, size, i):
        if size is None:
            return cur                          # padded axis: stay put
        return cur[0] if size == 1 else cur[i]  # size 1: stride 0

    def rec(u, v, d):
        if d == n:
            return u + v
        return [rec(step(u, pa[d], i), step(v, pb[d], i), d + 1) for i in range(out[d])]

    return rec(a, b, 0)

print(broadcast_add([[1], [2]], [10, 20]))      # [[11, 21], [12, 22]]
print(broadcast_add([[[1, 2]]], [[10], [20]]))  # [[[11, 12], [21, 22]]]`,
      dry: { head: ['out index', 'a (2,1) reads', 'b (2,) padded (None,2) reads', 'sum'], rows: [['(0,0)', 'a[0][0]=1', 'b[0]=10', '11'], ['(0,1)', 'a[0][0]=1', 'b[1]=20', '21'], ['(1,0)', 'a[1][0]=2', 'b[0]=10', '12'], ['(1,1)', 'a[1][0]=2', 'b[1]=20', '<span class="c-g">22</span>']] },
      complexity: `<p>O(output size) time; O(ndim) recursion depth; no copies of the inputs.</p>`,
      followUps: ['Generalise to any binary function (a mini ufunc).', 'Add a <code>sum(axis=k)</code> reduction on nested lists.']
    }
  });

  practice.push({
    title: 'Top-N Rows per Group',
    level: 'Hard', tags: ['groupby', 'sorting', 'heap'], companies: ['Amazon', 'Netflix', 'Pinterest'],
    statement: `<p>Write <code>top_n_per_group(rows, key, col, n)</code> returning, for every group, its <code>n</code> rows with the largest <code>col</code>. Output order: groups by ascending key; inside a group by descending <code>col</code>; ties keep input order. This equals <code>df.sort_values([key, col], ascending=[True, False], kind='stable').groupby(key).head(n)</code>.</p>`,
    constraints: `0 ≤ len(rows) ≤ 10<sup>5</sup>; 0 ≤ n; keys never None.`,
    example: `<p>rows: (a, 5), (b, 1), (a, 9), (a, 5), (b, 7), n = 2 → ${H.c('g', '(a, 9), (a, 5) [the first 5], (b, 7), (b, 1)')}.</p>`,
    brute: { why: `<p>For each distinct key, filter all rows for that key and sort them: O(g · n_rows + Σ k log k). With many groups the repeated filtering dominates (O(g · N)).</p>`, code: R`def top_n_per_group(rows, key, col, n):
    out = []
    for k in sorted({r[key] for r in rows}):
        grp = [r for r in rows if r[key] == k]          # full scan per group
        grp.sort(key=lambda r: -r[col])                 # stable
        out.extend(grp[:n])
    return out

print(top_n_per_group([{'k': 'a', 'v': 1}], 'k', 'v', 1))` },
    mcq: { q: 'With 10<sup>7</sup> rows and n = 3, which keeps memory per group bounded while streaming?', options: ['sort everything', 'a min-heap of size 3 per group', 'groupby().apply(sorted)', 'pivot_table'], answer: 1, explain: 'A size-n min-heap per group drops the smallest whenever it grows past n: O(N log n) time, O(groups · n) memory.' },
    hints: ['Hint 1: Bucket rows by key in one pass (keeping input order), then deal with each bucket.', 'Hint 2: Sort each bucket by -col with Python\'s stable sort so ties keep input order, then slice [:n].', 'Hint 3: Emit buckets in sorted key order. n = 0 → []. For streaming, use heapq.nlargest(n, bucket, key=...) which is also stable for ties.'],
    tests: T([
      [["[(r['k'], r['v'], r['id']) for r in top_n_per_group(TR, 'k', 'v', 2)]"], [['a', 9, 2], ['a', 5, 0], ['b', 7, 4], ['b', 1, 1]]],
      [["[r['id'] for r in top_n_per_group(TR, 'k', 'v', 1)]"], [2, 4]],
      [["[r['id'] for r in top_n_per_group(TR, 'k', 'v', 10)]"], [2, 0, 3, 4, 1]],
      [["top_n_per_group(TR, 'k', 'v', 0)"], []],
      [["top_n_per_group([], 'k', 'v', 3)"], []],
      [["[r['v'] for r in top_n_per_group([{'k': 2, 'v': -1}, {'k': 1, 'v': -5}, {'k': 1, 'v': -2}], 'k', 'v', 1)]"], [-2, -1]],
      [["len(top_n_per_group([{'k': i % 1000, 'v': i} for i in range(100000)], 'k', 'v', 3))"], 3000],
      [["top_n_per_group([{'k': i % 1000, 'v': i} for i in range(100000)], 'k', 'v', 3)[0]['v']"], 99000]
    ]),
    solution: {
      approach: `<p>Bucket by key (one pass, input order preserved), then for each key in sorted order take the n largest with a stable descending sort (or <code>heapq.nlargest</code>, which is stable too and O(k log n)). This mirrors sort + groupby + head.</p>`,
      code: R`import heapq
from collections import defaultdict

TR = [{'id': 0, 'k': 'a', 'v': 5}, {'id': 1, 'k': 'b', 'v': 1}, {'id': 2, 'k': 'a', 'v': 9},
      {'id': 3, 'k': 'a', 'v': 5}, {'id': 4, 'k': 'b', 'v': 7}]

def top_n_per_group(rows, key, col, n):
    if n <= 0:
        return []
    buckets = defaultdict(list)
    for r in rows:
        buckets[r[key]].append(r)
    out = []
    for k in sorted(buckets):
        out.extend(heapq.nlargest(n, buckets[k], key=lambda r: r[col]))  # stable for ties
    return out

print([(r['k'], r['v']) for r in top_n_per_group(TR, 'k', 'v', 2)])`,
      dry: { head: ['key', 'bucket (v)', 'top 2'], rows: [['a', '5, 9, 5', '9, 5 (id 0)'], ['b', '1, 7', '7, 1']] },
      complexity: `<p>O(N log n + g log g) time, O(N) space for buckets (O(g · n) with streaming heaps).</p>`,
      followUps: ['Return a dense rank instead of slicing.', 'Do it in pandas without sorting the whole frame (<code>groupby().nlargest</code>).']
    }
  });

  practice.push({
    title: 'Time-Based Rolling Sum (rolling("3D"))',
    level: 'Hard', tags: ['rolling window', 'two pointers', 'time series'], companies: ['Stripe', 'PayPal', 'Coinbase'],
    statement: `<p>Fraud rule: "total spent in the last <code>days</code> days". Given events <code>[[date_str, amount], ...]</code> sorted by date (duplicates allowed), return for each event the sum of amounts of events <b>up to and including it</b> whose date is in <code>(date − days, date]</code>. This matches <code>s.rolling(f'{days}D').sum()</code> on a DatetimeIndex.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; 1 ≤ days. Must be O(n).`,
    example: `<p>[['01-01', 1], ['01-02', 2], ['01-02', 4], ['01-05', 8]] (2024), days = 2 → ${H.c('g', '[1, 3, 7, 8]')}. The second 01-02 row includes the first one; 01-05 excludes 01-02 because 01-03 is the window start (exclusive bound 01-03 means dates &gt; 01-03).</p>`,
    brute: { why: `<p>For each event, look back over all earlier events and add the ones inside the window: O(n²) for long bursts.</p>`, code: R`from datetime import date

def rolling_time_sum(events, days):
    ords = [date.fromisoformat(d).toordinal() for d, _ in events]
    out = []
    for i in range(len(events)):
        out.append(sum(events[j][1] for j in range(i + 1) if ords[j] > ords[i] - days))
    return out

print(rolling_time_sum([['2024-01-01', 1], ['2024-01-02', 2]], 2))` },
    mcq: { q: 'Why is a fixed-count window (<code>rolling(3)</code>) wrong for "last 3 days" on transaction data?', options: ['It is slower', 'Rows are not evenly spaced in time: 3 rows can span minutes or months', 'It cannot sum', 'It ignores NaN'], answer: 1, explain: 'A count window looks at the last 3 rows regardless of their timestamps. A time window ("3D") uses the timestamps.' },
    hints: ['Hint 1: Convert dates to day numbers (<code>toordinal()</code>) so the window test is integer arithmetic.', 'Hint 2: Keep a left pointer and a running sum: add event i, then while ord[left] ≤ ord[i] − days, subtract and advance left.', 'Hint 3: Rows with the same date after i are not included yet (they have not been added), which is exactly the "up to and including" rule.'],
    tests: T([
      [["rolling_time_sum([['2024-01-01', 1], ['2024-01-02', 2], ['2024-01-02', 4], ['2024-01-05', 8]], 2)"], [1, 3, 7, 8]],
      [['rolling_time_sum([], 3)'], []],
      [["rolling_time_sum([['2024-03-01', 5]], 1)"], [5]],
      [["rolling_time_sum([['2024-01-01', 1], ['2024-01-01', 1], ['2024-01-01', 1]], 1)"], [1, 2, 3]],
      [["rolling_time_sum([['2024-01-01', 1], ['2024-01-02', 1]], 1)"], [1, 1]],
      [["rolling_time_sum([['2024-02-28', 1], ['2024-03-01', 10]], 2)"], [1, 10]],
      [["rolling_time_sum([['2024-02-28', 1], ['2024-03-01', 10]], 3)"], [1, 11]],
      [["rolling_time_sum([['2024-01-01', -3], ['2024-01-03', 3]], 30)"], [-3, 0]],
      [["rolling_time_sum([['2024-01-01', 1]] * 1000000, 1)[-1]"], 1000000]
    ]),
    solution: {
      approach: `<p>Variable-size sliding window over time with two pointers. Each event enters once and leaves once: O(n). pandas computes window bounds the same way (start = first row with time &gt; t − window, end = current row).</p>`,
      code: R`from datetime import date

def rolling_time_sum(events, days):
    ords = [date.fromisoformat(d).toordinal() for d, _ in events]
    left, run, out = 0, 0, []
    for i, (_, amt) in enumerate(events):
        run += amt                                  # event i enters
        while ords[left] <= ords[i] - days:         # outside (t - days, t]
            run -= events[left][1]
            left += 1
        out.append(run)
    return out

print(rolling_time_sum([['2024-01-01', 1], ['2024-01-02', 2],
                        ['2024-01-02', 4], ['2024-01-05', 8]], 2))   # [1, 3, 7, 8]`,
      dry: { head: ['i', 'date', 'enter', 'evicted', 'sum'], rows: [['0', '01-01', '+1', '—', '1'], ['1', '01-02', '+2', '—', '3'], ['2', '01-02', '+4', '—', '7'], ['3', '01-05', '+8', '01-01, 01-02, 01-02', '<span class="c-g">8</span>']] },
      complexity: `<p>O(n) time, O(n) for day numbers and output.</p>`,
      followUps: ['Per-card windows: one pointer per card id (groupby + rolling).', 'Return the window count too, and flag sums above a threshold.']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'What does <code>np.array([1, 2.5, True]).dtype</code> give?', options: ['object', 'float64', 'int64', 'bool'], answer: 1, explain: 'NumPy finds one dtype that can hold all values: bool and int promote to float64.' },
    { q: '<code>a = np.array([120], dtype=np.int8); a + a</code> gives?', options: ['[240]', '[127]', '[-16]', 'OverflowError'], answer: 2, explain: 'Array arithmetic wraps silently: 240 − 256 = −16.' },
    { q: 'Shapes (8, 1, 6) and (7, 1) broadcast to?', options: ['(8, 7, 6)', '(8, 1, 6)', 'error', '(7, 6)'], answer: 0, explain: 'Right-align: 6 vs 1 → 6; 1 vs 7 → 7; 8 vs (pad 1) → 8.' },
    { q: 'Which of these returns a view that shares memory with <code>a</code>?', options: ['a[[0, 1]]', 'a[a > 0]', 'a[1:3]', 'a.flatten()'], answer: 2, explain: 'Basic slicing is a view. Fancy indexing, boolean masks and flatten copy.' },
    { q: '<code>m.sum(axis=0)</code> for m of shape (4, 3) has shape?', options: ['(4,)', '(3,)', '(1, 3)', '()'], answer: 1, explain: 'The axis you reduce disappears: rows collapse, one value per column.' },
    { q: 'Index labels [\'a\', \'b\', \'c\', \'d\']: how many rows does <code>df.loc["b":"d"]</code> return?', options: ['1', '2', '3', '4'], answer: 2, explain: 'loc slices by label and includes the stop: b, c, d.' },
    { q: 'Which filter is written correctly?', options: ['df[df.a > 1 and df.b < 2]', 'df[df.a > 1 & df.b < 2]', 'df[(df.a > 1) & (df.b < 2)]', 'df[df.a > 1, df.b < 2]'], answer: 2, explain: '& is element-wise and binds tighter than comparison, so each condition needs parentheses. and raises "truth value is ambiguous".' },
    { q: 'By default, rows whose groupby key is NaN are…', options: ['put in a NaN group', 'dropped', 'raise an error', 'grouped with the first key'], answer: 1, explain: 'groupby(dropna=True) is the default; pass dropna=False to keep them.' },
    { q: 'You need each row\'s value divided by its group total. Which call?', options: ['groupby().agg("sum")', 'groupby().transform("sum")', 'groupby().filter(...)', 'groupby().size()'], answer: 1, explain: 'transform returns a result aligned to the original rows; agg returns one row per group.' },
    { q: 'Left has key 5 twice, right has key 5 four times. Inner merge rows for key 5?', options: ['2', '4', '6', '8'], answer: 3, explain: 'Every left match pairs with every right match: 2 × 4.' },
    { q: 'Which merge keyword raises if the right table has duplicate keys you did not expect?', options: ['indicator=True', 'validate="many_to_one"', 'sort=True', 'how="left"'], answer: 1, explain: 'validate checks the relationship and raises MergeError if it does not hold.' },
    { q: '<code>pd.Series([2, 4, 6]).rolling(2).mean().tolist()</code>?', options: ['[2.0, 3.0, 5.0]', '[nan, 3.0, 5.0]', '[3.0, 5.0]', '[nan, nan, 4.0]'], answer: 1, explain: 'Same length as the input; min_periods defaults to the window size, so the first value is NaN.' },
    { q: 'An int64 column gets one missing value after a left merge. Its dtype becomes?', options: ['int64', 'object', 'float64', 'Int64'], answer: 2, explain: 'NaN is a float, so NumPy-backed int columns are upcast to float64 (use the nullable Int64 dtype to avoid it).' },
    { q: 'Fastest way to compute <code>price * qty</code> only where qty > 5 (else 0) on 1M rows?', options: ['df.apply(f, axis=1)', 'for loop with iterrows', 'np.where(df.qty > 5, df.price * df.qty, 0)', 'df.itertuples()'], answer: 2, explain: 'np.where is vectorized: two compiled passes over the arrays, no Python call per row.' },
    { q: 'Which call raises because (day, store) pairs repeat?', options: ['pivot_table(aggfunc="sum")', 'pivot()', 'crosstab()', 'melt()'], answer: 1, explain: 'pivot does not aggregate; duplicates give "Index contains duplicate entries, cannot reshape".' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'Why is NumPy so much faster than Python lists for numeric work?', a: '<p>An ndarray stores raw values of one dtype contiguously, while a list stores pointers to separate boxed objects. Vectorized operations call compiled ufunc loops that walk the buffer with a fixed stride, often using SIMD, with no type dispatch, reference counting or allocation per element. Memory is smaller too (8 bytes per float64 vs ~32 for a list slot plus float object), which means better cache use. The speed-up disappears when you loop in Python over elements or use dtype=object.</p>', level: 'B', followUps: ['When is a list actually better?', 'What is a ufunc?'] },
    { q: 'Explain NumPy broadcasting rules with an example.', a: '<p>Shapes are compared from the right. A missing leading dimension counts as 1. Each pair must be equal or one of them 1; the size-1 side is virtually repeated (stride 0, no copy). Example: X of shape (100, 3) minus X.mean(axis=0) of shape (3,) → (100, 3), centring every column. (100, 3) with (100,) fails because 3 ≠ 100; fix with keepdims=True or [:, None] to get (100, 1).</p>', level: 'I', followUps: ['How much memory does (10000,1) − (1,10000) allocate?', 'What does keepdims do?'] },
    { q: 'What is the difference between a view and a copy in NumPy, and how can it cause bugs?', a: '<p>Basic slicing, reshape (when possible) and transpose return views that share the buffer, so writing through the view changes the original. Fancy indexing and boolean masks return copies, so writing into them leaves the original untouched — e.g. a[a > 0][0] = 5 does nothing. Bugs: unexpected mutation of the source array, or assignments silently lost. Check with np.shares_memory, force independence with .copy(), and remember a small view keeps a huge base array alive.</p>', level: 'I', followUps: ['Does reshape ever copy?', 'How does pandas Copy-on-Write relate?'] },
    { q: 'loc vs iloc vs at/iat — when do you use each?', a: '<p>loc selects by label, and label slices include both ends; iloc selects by integer position with Python slice semantics (stop excluded). at and iat are the fast scalar versions for a single cell. Mixing them up after filtering is a classic bug: after df = df[df.x > 0] the labels keep their old values but positions shift, so df.loc[0] may fail while df.iloc[0] gives the first remaining row. Use reset_index(drop=True) if you want labels to match positions again.</p>', level: 'B', followUps: ['What does loc do with a boolean Series?', 'Why is loc inclusive?'] },
    { q: 'What is SettingWithCopyWarning and how does Copy-on-Write change it?', a: '<p>It warns when you assign into something that may be a temporary copy, typically chained indexing like df[df.a > 0]["b"] = 1: the first [] returns a new object, so the write is lost. The fix is a single df.loc[mask, "b"] = 1, or an explicit .copy() when you want an independent subset. Copy-on-Write (opt-in in pandas 2.x, default in 3.0) makes every derived object behave as a copy while sharing memory lazily; chained assignment then never modifies the parent and the ambiguous warning disappears.</p>', level: 'I', followUps: ['How do you enable CoW in 2.x?', 'Does CoW make code slower?'] },
    { q: 'Walk through how groupby works and its performance characteristics.', a: '<p>Split: pandas factorizes the key columns into integer group codes with a hash table. Apply: built-in aggregations (sum, mean, count, min, max, std) run in Cython in one pass, accumulating into arrays indexed by group code. Combine: results are assembled with the sorted group keys as the index (sort=True by default). It is O(n) plus sorting the groups. Custom lambdas in agg or apply call Python once per group and can be orders of magnitude slower; prefer built-in names, transform, or vectorized expressions.</p>', level: 'I', followUps: ['What do dropna and observed control?', 'agg vs transform vs apply?'] },
    { q: 'How would you find the top 3 products by revenue in each category?', a: '<p>Compute revenue, then sort and take the head per group: df.assign(rev=df.price * df.qty).sort_values(["category", "rev"], ascending=[True, False]).groupby("category").head(3). Alternatives: groupby("category").rev.nlargest(3) or rank(method="first", ascending=False) &lt;= 3 within the group. For ties, decide whether to use a dense rank (include all ties) or first. If products repeat across rows, aggregate revenue per (category, product) first.</p>', level: 'I', followUps: ['How about streaming data that does not fit in memory?', 'How do you handle ties?'] },
    { q: 'Your merged DataFrame has more rows than the left table after a left join. Why, and how do you prevent it?', a: '<p>The right table has duplicate keys, so each left row matching k right rows produces k output rows (many-to-many or one-to-many). Check right.key.duplicated().any() or value_counts, decide whether duplicates are valid, and either deduplicate/aggregate the right side first or accept the expansion consciously. Use validate="many_to_one" so pandas raises MergeError if the assumption breaks, and compare len before/after and key-level totals as data-quality checks.</p>', level: 'I', followUps: ['How do you do an anti-join?', 'How are NaN keys treated?'] },
    { q: 'Explain pivot vs pivot_table vs melt and give a use case for each.', a: '<p>pivot reshapes long to wide without aggregation, so it requires unique (index, columns) pairs and raises otherwise — e.g. one reading per sensor per hour. pivot_table aggregates duplicates with aggfunc (default mean), supports fill_value and margins — e.g. total sales per day per store. melt goes wide to long, producing variable/value columns — e.g. turning jan…dec columns into rows for plotting or groupby. pivot_table is essentially groupby + unstack, melt is the inverse of pivot.</p>', level: 'I', followUps: ['What does stack/unstack do?', 'How do you flatten MultiIndex columns?'] },
    { q: 'How do you handle missing data in pandas, and what are the trade-offs?', a: '<p>First measure: df.isna().sum() and the pattern of gaps. Options: dropna (simple, loses rows, can bias results), fillna with a constant (keeps rows but changes statistics), ffill/bfill (good for slowly changing state such as prices, needs groupby per entity and sorted time), interpolate (smooth signals), or model-based imputation. Keep a missing-indicator column for ML. Watch dtypes: NaN upcasts ints to float64; nullable Int64/boolean/string or PyArrow dtypes keep types. Aggregations skip NaN by default.</p>', level: 'I', followUps: ['Why is NaN != NaN?', 'What is pd.NA?'] },
    { q: 'How does rolling differ from resample, and what is a time-based window?', a: '<p>rolling keeps the original rows and computes a statistic over a sliding window ending at each row — by count (rolling(7)) or by time (rolling("7D"), which needs a sorted DatetimeIndex and includes (t − 7 days, t]). resample changes the frequency: it buckets timestamps into calendar bins (D, W, ME) and returns one row per bin, including empty bins. Use rolling for moving averages and fraud velocity; resample for daily/weekly reports. Remember rolling includes the current row, so shift before using it as an ML feature.</p>', level: 'A', followUps: ['What is min_periods?', 'How do you avoid look-ahead leakage?'] },
    { q: 'A pandas job on 50M rows is slow and runs out of memory. What do you check?', a: '<p>Memory: df.memory_usage(deep=True); convert repeated strings to category, downcast numerics, load only needed columns with dtype= in read_csv, use Parquet/PyArrow, or process in chunks. Speed: replace apply(axis=1)/iterrows with vectorized expressions, np.where/np.select, map with a dict; avoid concat or row appends in loops; use built-in groupby aggregations. Profile with %timeit and a profiler. If it still does not fit, move to Polars (multi-threaded, lazy), DuckDB (SQL on files) or Spark.</p>', level: 'A', followUps: ['When does category dtype hurt?', 'What does Polars do differently?'] },
    { q: 'What changed in NumPy 2.x and pandas 2.x that affects everyday code?', a: '<p>NumPy 2: NEP 50 promotion (NumPy scalar dtypes are respected, Python ints that do not fit the array dtype raise OverflowError), cleaned-up namespace (removed aliases like np.float_), a new StringDType, and a changed C ABI so compiled packages had to be rebuilt. pandas 2: optional PyArrow-backed dtypes, nullable dtypes, non-nanosecond datetime resolutions, Copy-on-Write available (default in 3.0, which also defaults to a PyArrow-backed string dtype), and many deprecations such as fillna(method=...) in favour of ffill/bfill and "M" → "ME" frequency aliases.</p>', level: 'E', followUps: ['How would you upgrade a large codebase safely?', 'Why does an ABI break matter?'] }
  );

  registerModule({
    id: 'py15',
    title: 'Data Libraries: NumPy & pandas',
    intro: `<p>Almost every data, ML and analytics interview in Python ends up in NumPy and pandas. This module teaches both from the memory layout up, so you can write the idiomatic one-liner <i>and</i> explain what it does underneath:</p>
<ul>
<li>🟢 <b>NumPy arrays</b> — dtypes, overflow, vectorized ufuncs, <code>axis</code>, broadcasting, and views vs copies.</li>
<li>🔵 <b>pandas</b> — Series and DataFrame, <code>loc</code>/<code>iloc</code>, boolean filtering, <code>groupby</code>, <code>merge</code>/<code>concat</code>, <code>pivot</code>/<code>melt</code>, missing data and time series.</li>
<li>🟣 <b>Performance</b> — apply vs vectorized, categoricals, memory, and the traps behind slow or silently wrong pandas code (NumPy 2.x / pandas 2.x, with notes on pandas 3.0 Copy-on-Write).</li>
</ul>
<p>The tested problems are solved in <b>plain Python</b> (lists and dicts) — you implement broadcasting rules, groupby-aggregate, merges, pivots, rolling windows and merge_asof yourself — while each explanation shows the NumPy/pandas one-liner that does the same job. Rebuilding the library logic is exactly what "how does groupby work?" interview questions probe.</p>`,
    goals: [
      'Explain the ndarray memory model (dtype, shape, strides), predict dtypes and integer overflow, and write vectorized code with the right <code>axis</code>',
      'Apply the broadcasting rules by hand, fix shape errors with <code>keepdims</code>/<code>[:, None]</code>, and tell views from copies',
      'Select and filter DataFrames correctly with <code>loc</code>, <code>iloc</code>, masks and <code>query</code>, and avoid chained-assignment bugs',
      'Use groupby (agg, transform, filter), merge (inner/left/right/outer, validate, indicator), concat, pivot_table and melt, and implement each in plain Python',
      'Handle missing data and basic time series: dropna/fillna/ffill, rolling windows, resample, merge_asof',
      'Diagnose slow or memory-hungry pandas code and fix it with vectorization, categoricals and dtypes'
    ],
    prereqs: `Python 5 (Data Structure Internals &amp; Comprehensions — dict/list costs and hashing) and Python 7 (Iterators, Generators &amp; Context Managers). Comfort with lists of dicts and basic Big-O is assumed; no prior NumPy or pandas needed.`,
    langExplain: `<p>This is a Python-track module: all code is Python. NumPy and pandas snippets are shown for reference and are not executed by the site's checker (they need third-party packages); every tested solution uses only the standard library, so it runs anywhere.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
