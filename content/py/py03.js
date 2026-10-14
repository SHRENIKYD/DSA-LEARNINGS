(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // String.raw keeps backslashes exactly as typed, so Python code like "a\nb" stays "a\nb".
  var R = String.raw;

  /* ----------------------------------------------------------------------
     Shared visualizer helpers for py03 (Strings, Files, Modules & Packages)
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Python-style repr of a plain str (good enough for teaching: quotes + escapes).
  function pyRepr(s) {
    s = String(s);
    var q = s.indexOf("'") >= 0 && s.indexOf('"') < 0 ? '"' : "'";
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '\\') out += '\\\\';
      else if (ch === '\n') out += '\\n';
      else if (ch === '\t') out += '\\t';
      else if (ch === q) out += '\\' + q;
      else out += ch;
    }
    return q + out + q;
  }
  /* A "step" for code-stepping visualizers:
       l: line(s) to highlight (1-based), c: class, n: narration,
       v: variables {name: value}, vh: var highlights,
       cs: call stack bottom->top, o: console output so far, t: extra HTML */
  function steps(code, list, opt) {
    opt = opt || {};
    return list.map(function (s) {
      var parts = [], hl = {};
      if (s.l) (Array.isArray(s.l) ? s.l : [s.l]).forEach(function (x) { hl[x] = s.c || 'cur'; });
      parts.push({ type: 'code', label: opt.codeLabel || 'Program (highlighted = running now)', lang: 'python', code: code, hl: hl });
      if (s.cs) {
        var chl = {}; chl[s.cs.length - 1] = 'cur';
        parts.push({ type: 'stack', label: 'Call stack (top = running now)', items: s.cs.slice(), hl: chl });
      }
      if (s.v) parts.push({ type: 'vars', label: opt.varLabel || 'Names in scope', vals: s.v, hl: s.vh || {} });
      if (s.o !== undefined) parts.push({ type: 'text', label: 'Console output so far', html: '<pre>' + (s.o === '' ? '(nothing printed yet)' : esc(s.o)) + '</pre>' });
      if (s.t) parts.push({ type: 'text', html: s.t });
      return { narr: s.n, parts: parts };
    });
  }
  // Exactly CPython's slice-index adjustment (PySlice_AdjustIndices).
  function pySlice(len, start, stop, step) {
    if (step === null) step = 1;
    if (step === 0) throw new Error('ValueError: slice step cannot be zero');
    var lower = step < 0 ? -1 : 0, upper = step < 0 ? len - 1 : len;
    function fix(v, def) {
      if (v === null) return def;
      if (v < 0) { v += len; if (v < lower) v = lower; }
      else if (v > upper) v = upper;
      return v;
    }
    var s = fix(start, step < 0 ? upper : lower), e = fix(stop, step < 0 ? lower : upper);
    var idx = [];
    for (var i = s; step > 0 ? i < e : i > e; i += step) idx.push(i);
    return { start: s, stop: e, step: step, idx: idx };
  }
  // UTF-8 bytes of one code point.
  function utf8(cp) {
    if (cp < 0x80) return [cp];
    if (cp < 0x800) return [0xC0 | (cp >> 6), 0x80 | (cp & 63)];
    if (cp < 0x10000) return [0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
    return [0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
  }
  function hex2(b) { return (b < 16 ? '0' : '') + b.toString(16).toUpperCase(); }
  function show(ch) { return ch === '\n' ? '⏎' : ch === ' ' ? '␣' : ch; }

  /* ======================================================================
     TOPIC 1: Strings — indexing, slicing, immutability and everyday methods
     ====================================================================== */
  topics.push({
    title: 'Strings I: Indexing, Slicing, Immutability & Everyday Methods',
    analogy: R`<p>Think of a string as a <b>row of numbered post-office boxes</b>, one letter per box. You can look into any box by its number (indexing), or photocopy a run of boxes (slicing). But the boxes are <b>glued shut</b>: you can never change a letter inside. If you want "Jello" instead of "Hello", you make a <b>brand-new row</b> of boxes. Every string method (<code>.upper()</code>, <code>.replace()</code>, <code>.strip()</code>) is a photocopier that hands you a new row and leaves the original untouched.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> A Python <code>str</code> is an <b>immutable sequence of characters</b>. "Sequence" means it has an order and positions. "Immutable" means it can never change after it is created.</p>
      ${H.arr(['P', 'Y', 'T', 'H', 'O', 'N'], { label: 's = "PYTHON"' })}
      <p><b>Indexing</b> picks one character: <code>s[0]</code> is <code>'P'</code>, <code>s[5]</code> is <code>'N'</code>. Negative numbers count from the end: <code>s[-1]</code> is <code>'N'</code>, <code>s[-6]</code> is <code>'P'</code>. A bad index like <code>s[6]</code> raises <code>IndexError</code>.</p>
      <p><b>Slicing</b> <code>s[start:stop:step]</code> copies a run of characters. Three rules cover 95% of cases:</p>
      <ul>
        <li><b>start is included, stop is excluded</b>: <code>s[1:4]</code> is <code>'YTH'</code> (boxes 1, 2, 3). Length = stop − start.</li>
        <li><b>Leave a part out to mean "from the edge"</b>: <code>s[:2]</code> = <code>'PY'</code>, <code>s[2:]</code> = <code>'THON'</code>, <code>s[:]</code> = whole copy.</li>
        <li><b>step jumps</b>: <code>s[::2]</code> = <code>'PTO'</code>; a negative step walks backwards, so <code>s[::-1]</code> = <code>'NOHTYP'</code> (reverse).</li>
      </ul>
      <p>Slicing is <b>forgiving</b>: <code>s[2:100]</code> just gives <code>'THON'</code>, no error. Indexing is <b>strict</b>.</p>
      <p><b>Immutability:</b> <code>s[0] = 'J'</code> raises <code>TypeError: 'str' object does not support item assignment</code>. Build a new one instead: <code>'J' + s[1:]</code>.</p>
      <p>🔵 <b>The methods you will use every day</b> (each returns a <b>new</b> value):</p>
      ${H.table(['Job', 'Method', 'Example → result'], [
        ['Clean edges', '<code>strip() lstrip() rstrip()</code>', '<code>"  hi \\n".strip()</code> → <code>\'hi\'</code>'],
        ['Change case', '<code>lower() upper() title() capitalize() casefold()</code>', '<code>"PyThOn".lower()</code> → <code>\'python\'</code>'],
        ['Break apart', '<code>split() rsplit() splitlines() partition()</code>', '<code>"a,b,,c".split(",")</code> → <code>[\'a\', \'b\', \'\', \'c\']</code>'],
        ['Glue together', '<code>sep.join(iterable)</code>', '<code>"-".join(["2026", "10", "14"])</code> → <code>\'2026-10-14\'</code>'],
        ['Search', '<code>in, find() rfind() index() count()</code>', '<code>"banana".find("na")</code> → <code>2</code>; missing → <code>-1</code>'],
        ['Test start/end', '<code>startswith() endswith()</code>', '<code>"pic.png".endswith((".png", ".jpg"))</code> → <code>True</code>'],
        ['Swap text', '<code>replace(old, new, count)</code>', '<code>"aaa".replace("a", "b", 2)</code> → <code>\'bba\'</code>'],
        ['Trim a fixed bit', '<code>removeprefix() removesuffix()</code> (3.9+)', '<code>"v2.1".removeprefix("v")</code> → <code>\'2.1\'</code>'],
        ['Check content', '<code>isdigit() isalpha() isalnum() isspace()</code>', '<code>"123".isdigit()</code> → <code>True</code>'],
        ['Pad', '<code>ljust() rjust() center() zfill()</code>', '<code>"7".zfill(3)</code> → <code>\'007\'</code>']
      ])}
      <p>Remember the big one: <b>methods never modify the string</b>. <code>name.strip()</code> on its own line does nothing useful; you must write <code>name = name.strip()</code>.</p>`,
    clues: [
      '"reverse a string" / "is it a palindrome" → <code>s[::-1]</code> or two pointers',
      '"ignore case and punctuation" → <code>casefold()</code> + <code>isalnum()</code> filter',
      '"first / last k characters" → <code>s[:k]</code> / <code>s[-k:]</code> (slices never raise)',
      '"build a string in a loop" → collect parts in a list, then <code>"".join(parts)</code>',
      '"words separated by any whitespace" → <code>split()</code> with NO argument',
      '"why did my string not change?" → strings are immutable; reassign the result',
      '"rotate a string by k" → <code>s[k:] + s[:k]</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'Indexing, slicing and core methods (runnable)', code: R`
      s = "PYTHON"
      print(s[0], s[-1])        # P N   -> first and last character
      print(s[1:4])             # YTH   -> start included, stop excluded
      print(s[:2], s[2:])       # PY THON -> leave a side empty = "to the edge"
      print(s[::2], s[::-1])    # PTO NOHTYP -> step 2, then reversed
      print(s[2:100])           # THON  -> slices are forgiving, no error

      try:
          s[0] = "J"            # strings are immutable
      except TypeError as e:
          print("TypeError:", e)
      print("J" + s[1:])        # JYTHON -> build a NEW string instead

      raw = "   Hello, World!  \n"
      clean = raw.strip()       # methods return new strings; reassign!
      print(repr(raw), "->", repr(clean))
      print(clean.lower(), clean.upper(), clean.replace("World", "Python"))
      print("a,b,,c".split(","))          # empty piece kept between the commas
      print("  many   spaces here ".split())  # no argument: split on runs of whitespace
      print("-".join(["2026", "10", "14"]))
      print("banana".find("na"), "banana".find("xyz"), "banana".count("a"))
      print("report.pdf".endswith((".pdf", ".docx")))
      print("user=alice".partition("="))
      print("7".zfill(3), "v3.13".removeprefix("v"))
    ` }],
    codeTitle: ['Strings in action'],
    viz: {
      title: 'Index & slice boxes: watch Python pick characters',
      input: 'PYTHONIC|1:7:2',
      inputLabel: 'text|start:stop:step  (e.g. PYTHONIC|::-1, PYTHONIC|-3:, PYTHONIC|9 for indexing)',
      gen: function (input) {
        var raw = String(input === undefined ? 'PYTHONIC|1:7:2' : input);
        var bar = raw.lastIndexOf('|');
        if (bar < 0) throw new Error('Format: text|start:stop:step, for example HELLO|1:4 or HELLO|::-1');
        var text = raw.slice(0, bar), spec = raw.slice(bar + 1).trim();
        var chars = Array.from(text);
        if (!chars.length || chars.length > 16) throw new Error('Text must have 1 to 16 characters');
        var n = chars.length, frames = [];
        var shown = chars.map(show);
        var both = chars.map(function (_, i) { return i + ' / ' + (i - n); });
        frames.push({ narr: 'The string <b>' + esc(pyRepr(text)) + '</b> sits in ' + n + ' boxes. Each box has a <b>positive index</b> (from the left, starting at 0) and a <b>negative index</b> (from the right, starting at -1).', parts: [
          { type: 'array', label: 's (labels show index / negative index)', values: shown, idxLabels: both },
          { type: 'vars', label: 'Facts', vals: { 'len(s)': n, 'first index': 0, 'last index': n - 1 + '  (or -1)' } }
        ] });
        var parseNum = function (t) {
          t = t.trim();
          if (t === '') return null;
          if (!/^-?\d+$/.test(t)) throw new Error('Slice parts must be whole numbers or empty, like 1:5 or ::-1');
          return parseInt(t, 10);
        };
        if (spec.indexOf(':') < 0) {
          var k = parseNum(spec);
          if (k === null) throw new Error('Give an index like 3, or a slice like 1:4');
          var real = k < 0 ? k + n : k;
          var ok = real >= 0 && real < n, hl = {}, ptr = {};
          if (ok) { hl[real] = 'sel'; ptr[real] = 's[' + k + ']'; }
          frames.push({ narr: 'Indexing <code>s[' + k + ']</code>. ' + (k < 0 ? 'A negative index is converted: ' + k + ' + len(s) = ' + k + ' + ' + n + ' = <b>' + real + '</b>.' : 'A non-negative index is used as is.'), parts: [
            { type: 'array', label: 's', values: shown, idxLabels: both, hl: hl, ptr: ptr },
            { type: 'vars', label: 'Converting the index', vals: { 'you asked': k, 'real position': real, 'valid range': '0 .. ' + (n - 1) }, hl: { 'real position': ok ? 'ok' : 'bad' } }
          ] });
          frames.push({ narr: ok ? 'Box ' + real + ' holds <b>' + esc(pyRepr(chars[real])) + '</b>. Indexing returns a string of length 1 (Python has no separate char type).' : '<span class="c-r">Position ' + real + ' does not exist</span>. Unlike slicing, indexing is strict: Python raises <code>IndexError: string index out of range</code>.', parts: [
            { type: 'array', label: 's', values: shown, idxLabels: both, hl: hl, ptr: ptr },
            { type: 'text', label: 'Result', html: ok ? '<code>' + esc(pyRepr(chars[real])) + '</code>' : '<span class="c-r">IndexError: string index out of range</span>' }
          ] });
          frames.push({ narr: 'Compare: the slice <code>s[' + k + ':' + (k === -1 ? '' : k + 1) + ']</code> never raises. Out-of-range slices just give a shorter (maybe empty) string. That is why <code>s[:1]</code> is a safe way to get "the first char or empty".', parts: [
            { type: 'array', label: 's', values: shown, idxLabels: both },
            { type: 'text', label: 'Rule of thumb', html: 'Indexing: strict, returns 1 char. Slicing: forgiving, returns 0..n chars.' }
          ] });
          frames.push({ narr: 'And remember: you can READ <code>s[i]</code> but never WRITE it. <code>s[0] = "X"</code> is a <code>TypeError</code> because strings are immutable.', parts: [
            { type: 'array', label: 's (glued shut)', values: shown, idxLabels: both, hl: { 0: 'bad' } },
            { type: 'text', label: 'Fix', html: '<code>s = "X" + s[1:]</code> builds a new string and rebinds the name.' }
          ] });
          return frames;
        }
        var bits = spec.split(':');
        if (bits.length > 3) throw new Error('A slice has at most two colons: start:stop:step');
        var st = parseNum(bits[0]), sp = parseNum(bits[1] || ''), stp = bits.length === 3 ? parseNum(bits[2]) : null;
        if (stp === 0) throw new Error('step cannot be 0 (Python raises ValueError)');
        var r = pySlice(n, st, sp, stp);
        var fmt = function (v) { return v === null ? '(blank)' : v; };
        frames.push({ narr: 'Slice <code>s[' + esc(spec) + ']</code>. Python first fills blanks and clamps out-of-range numbers. ' + (r.step > 0 ? 'Step is positive, so blanks mean start=0, stop=len(s).' : 'Step is negative, so blanks mean start=last index, stop="before index 0".'), parts: [
          { type: 'array', label: 's', values: shown, idxLabels: both },
          { type: 'table', label: 'Resolving the slice', columns: ['part', 'you wrote', 'Python uses'], rows: [['start', fmt(st), r.start], ['stop (excluded)', fmt(sp), r.stop === -1 && r.step < 0 ? '-1 (means: past the left edge)' : r.stop], ['step', fmt(stp), r.step]] }
        ] });
        var picked = [];
        r.idx.forEach(function (i, j) {
          picked.push(chars[i]);
          var hl = {}, ptr = {};
          r.idx.slice(0, j).forEach(function (p) { hl[p] = 'ok'; });
          hl[i] = 'cur'; ptr[i] = 'i=' + i;
          frames.push({ narr: 'Position <b>' + i + '</b> ' + (r.step > 0 ? '&lt; ' : '&gt; ') + 'stop ' + r.stop + ', so take <b>' + esc(pyRepr(chars[i])) + '</b>. Next position = ' + i + ' + (' + r.step + ') = ' + (i + r.step) + '.', parts: [
            { type: 'array', label: 's', values: shown, idxLabels: both, hl: hl, ptr: ptr },
            { type: 'array', label: 'result so far', values: picked.map(show), hl: (function () { var h = {}; h[picked.length - 1] = 'ok'; return h; })() }
          ] });
        });
        if (!r.idx.length) {
          frames.push({ narr: 'The very first position ' + r.start + ' already fails the "' + (r.step > 0 ? 'less than' : 'greater than') + ' stop" test, so nothing is taken. Result: the <b>empty string</b>. No error, slices are forgiving.', parts: [
            { type: 'array', label: 's', values: shown, idxLabels: both },
            { type: 'text', label: 'Result', html: "<code>''</code>" }
          ] });
        } else {
          var endHl = {}; r.idx.forEach(function (p) { endHl[p] = 'sel'; });
          frames.push({ narr: 'Next position ' + (r.idx[r.idx.length - 1] + r.step) + ' would reach or pass stop ' + r.stop + ', so Python stops. A <b>new</b> string is built from the picked characters; the original is untouched.', parts: [
            { type: 'array', label: 's (unchanged)', values: shown, idxLabels: both, hl: endHl },
            { type: 'text', label: 'Result', html: '<code>s[' + esc(spec) + ']</code> → <code>' + esc(pyRepr(picked.join(''))) + '</code>  (length ' + picked.length + ')' }
          ] });
        }
        frames.push({ narr: 'Mental shortcut for positive steps: <b>stop − start = how many characters</b> (when step is 1). For a reverse, just use <code>[::-1]</code>. Try inputs like <code>PYTHONIC|::-1</code>, <code>PYTHONIC|-3:</code> or <code>PYTHONIC|5:2</code> (empty!).', parts: [
          { type: 'array', label: 's', values: shown, idxLabels: both },
          { type: 'table', label: 'Handy slices', columns: ['slice', 'meaning'], rows: [['s[:k]', 'first k chars'], ['s[-k:]', 'last k chars'], ['s[::-1]', 'reversed copy'], ['s[k:] + s[:k]', 'rotate left by k']] }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Palindrome check in one line (and why normalise first)', html: R`<p>"Racecar" is a palindrome only if we ignore case. Normalise first with <code>casefold()</code> (a stronger <code>lower()</code> made for comparisons), then compare with the reverse. ${H.arr(['r', 'a', 'c', 'e', 'c', 'a', 'r'], { hl: { 0: 'g', 6: 'g', 1: 'b', 5: 'b' } })} Pairs from both ends match.</p>`, code: { lang: 'python', run: true, code: R`
        def is_pal(s):
            t = s.casefold()
            return t == t[::-1]
        print(is_pal("Racecar"), is_pal("Python"))   # True False
      ` } },
      { title: 'split() vs split(" ") — a classic trap', html: R`<p><code>split()</code> with <b>no argument</b> splits on <b>runs</b> of any whitespace and drops empty pieces. <code>split(" ")</code> splits on <b>every single space</b>, so double spaces create empty strings. Use the no-argument form for "words".</p>`, code: { lang: 'python', run: true, code: R`
        line = "  red  green blue "
        print(line.split())      # ['red', 'green', 'blue']
        print(line.split(" "))   # ['', '', 'red', '', 'green', 'blue', '']
      ` } },
      { title: 'Building strings: += in a loop vs join', html: R`<p>Because strings are immutable, <code>result += piece</code> may create a new string each time (copying everything so far), which is O(n²) in the worst case. Collecting pieces in a list and calling <code>"".join(pieces)</code> once is O(n) and is the idiom interviewers expect.</p>`, code: { lang: 'python', run: true, code: R`
        words = ["fast", "safe", "clear"]
        parts = []
        for w in words:
            parts.append(w.upper())
        print(" | ".join(parts))   # FAST | SAFE | CLEAR
        # join only accepts strings:
        nums = [1, 2, 3]
        print(",".join(str(n) for n in nums))   # 1,2,3
      ` } },
      { title: 'find() vs index() — choose by how you want "missing" handled', html: R`<p><code>find</code> returns <code>-1</code> when not found; <code>index</code> raises <code>ValueError</code>. Danger: <code>-1</code> is also a valid slice index, so <code>s[s.find("x"):]</code> silently gives the last character when "x" is missing. If you only need yes/no, use <code>in</code>.</p>`, code: { lang: 'python', run: true, code: R`
        s = "hello"
        print(s.find("l"), s.find("z"))      # 2 -1
        print(s[s.find("z"):])               # 'o'  <- silent bug!
        print("ell" in s)                    # True
        try:
            s.index("z")
        except ValueError as e:
            print("ValueError:", e)
      ` } }
    ],
    deepDive: R`<p>🟣 <b>Under the hood (CPython).</b></p>
      <ul>
        <li><b>Compact storage (PEP 393):</b> a <code>str</code> stores every character with the same width, picked from the widest character present: 1 byte each for pure Latin-1 text, 2 bytes if any character needs it (e.g. Hindi, Chinese), 4 bytes if any emoji is present. So adding one emoji to a 1 MB ASCII string can make it ~4 MB in memory. Fixed width is what makes <code>s[i]</code> O(1).</li>
        <li><b>Slices copy:</b> <code>s[a:b]</code> builds a new string in O(b − a). Slicing inside a loop (<code>s[i:]</code> for each i) is O(n²). In hot code, pass indices around instead of slices. (Exception: <code>s[:]</code> on a str returns the same object, since it is immutable anyway.)</li>
        <li><b>The += optimisation:</b> CPython can sometimes resize a string in place when <code>s += t</code> and nobody else references <code>s</code>. It is an implementation detail (PyPy and others do not promise it), so <code>"".join</code> remains the portable O(n) answer.</li>
        <li><b>Unicode-aware tests:</b> <code>"²".isdigit()</code> is <code>True</code> but <code>int("²")</code> fails. <code>isdecimal()</code> is the strict one that matches what <code>int()</code> accepts. <code>"ß".lower()</code> stays <code>'ß'</code> but <code>casefold()</code> gives <code>'ss'</code>, which is why casefold is right for case-insensitive comparison.</li>
        <li><b>Hashing:</b> because strings are immutable they are hashable and cache their hash, which is why they are perfect dict keys. String hashes are randomised per process (PYTHONHASHSEED) to resist hash-flooding attacks, so set iteration order of strings can differ between runs.</li>
        <li><b>Searching:</b> <code>in</code>/<code>find</code> use a fast hybrid search (Boyer–Moore–Horspool style, and since 3.10 a "two-way" algorithm for long needles), so they are usually much faster than a hand-written loop.</li>
      </ul>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> assistants write string-munging code instantly: "strip, split on commas, title-case each name" is a one-shot prompt. Copilot-style tools also autocomplete slices well.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 10 tricky inputs for this string function: empty, whitespace-only, unicode, emoji, double spaces</code>. Paste them into a quick test. AI is great at producing edge cases; you are great at judging which matter.</p>
      <p><b>Where AI goes wrong:</b> it uses <code>split(" ")</code> where <code>split()</code> was meant, uses <code>lower()</code> instead of <code>casefold()</code> for comparisons, forgets that <code>find</code> returns -1 (and then slices with it), and writes <code>+=</code> in big loops. It also sometimes calls a method like <code>s.strip()</code> without reassigning.</p>
      <p><b>What you must still own:</b> reading a slice like <code>s[-3::-1]</code> instantly in an interview (no tool there!), knowing what is O(1) vs O(n), and recognising immutability bugs in a code review.</p>`,
    problems: [{
      title: 'Valid Palindrome (letters and digits only)',
      level: 'Easy', tags: ['strings', 'two pointers', 'isalnum'], companies: ['Meta', 'Amazon', 'Microsoft'],
      statement: R`<p>Given a string <code>s</code>, return <code>True</code> if it reads the same forwards and backwards after you <b>keep only letters and digits</b> and <b>ignore case</b>. Otherwise return <code>False</code>.</p>`,
      constraints: R`1 ≤ len(s) ≤ 2·10<sup>5</sup>; s contains printable ASCII characters.`,
      example: R`<p><code>"A man, a plan, a canal: Panama"</code> → ${H.c('g', 'True')} because the cleaned text is <code>amanaplanacanalpanama</code>, which equals its reverse. <code>"race a car"</code> → ${H.c('r', 'False')}: cleaned <code>raceacar</code> reversed is <code>racaecar</code>.</p>`,
      brute: {
        why: R`<p>Build a cleaned copy character by character with <code>+=</code>, then build the reversed copy the same way, then compare. It works, but it creates many temporary strings and uses two extra copies of memory. It is fine for small inputs but wasteful.</p>`,
        code: { lang: 'python', run: true, code: R`
          def is_palindrome_brute(s):
              cleaned = ""
              for ch in s:
                  if ch.isalnum():
                      cleaned += ch.lower()     # new string every time (in theory)
              backwards = ""
              for ch in cleaned:
                  backwards = ch + backwards    # prepending is always O(n) per step
              return cleaned == backwards

          print(is_palindrome_brute("A man, a plan, a canal: Panama"))  # True
          print(is_palindrome_brute("race a car"))                      # False
        ` }
      },
      mcq: { q: 'Which approach avoids building ANY new string?', options: ['Two pointers moving inward, skipping non-alphanumerics', 'cleaned == cleaned[::-1]', 'Sorting the characters', 'Using s.replace(" ", "")'], answer: 0, explain: 'Two pointers compare characters in place: O(n) time, O(1) extra space. The slice version is also O(n) but makes two new strings.' },
      hints: [
        R`<p>Hint 1: A palindrome check only ever compares the i-th character from the left with the i-th from the right.</p>`,
        R`<p>Hint 2: Put <code>left = 0</code>, <code>right = len(s) - 1</code>. Move <code>left</code> forward while it points at a non-alphanumeric; move <code>right</code> back the same way.</p>`,
        R`<p>Hint 3: Compare <code>s[left].lower()</code> with <code>s[right].lower()</code>; if different return False; else step both inward. Loop while <code>left &lt; right</code>. Empty or all-punctuation strings are palindromes.</p>`
      ],
      solution: {
        approach: R`<p><b>Pythonic one-liner:</b> <code>t = [c.lower() for c in s if c.isalnum()]; return t == t[::-1]</code> (clear, O(n) memory). <b>Interview-optimal:</b> two pointers, O(1) extra memory, stop early at the first mismatch.</p>`,
        code: { lang: 'python', run: true, code: R`
          def is_palindrome(s: str) -> bool:
              left, right = 0, len(s) - 1
              while left < right:
                  # skip anything that is not a letter or digit
                  while left < right and not s[left].isalnum():
                      left += 1
                  while left < right and not s[right].isalnum():
                      right -= 1
                  if s[left].lower() != s[right].lower():
                      return False          # first mismatch decides
                  left += 1
                  right -= 1
              return True

          for t in ["A man, a plan, a canal: Panama", "race a car", " ", "0P"]:
              print(repr(t), "->", is_palindrome(t))
        ` },
        alt: [{ lang: 'python', title: 'Readable version', code: R`
          def is_palindrome(s: str) -> bool:
              t = [c.casefold() for c in s if c.isalnum()]
              return t == t[::-1]
        ` }],
        dry: { head: ['left', 'right', 's[left]', 's[right]', 'action'], rows: [
          ['0', '29', 'A', 'a', 'equal (ignoring case) → move both'],
          ['1', '28', '␣ → skip to 2: m', 'm', 'equal → move'],
          ['3', '27', 'a', 'a', 'equal → move'],
          ['…', '…', '…', '…', 'all pairs match'],
          ['15', '14', '-', '-', '<span class="c-g">left ≥ right → True</span>']
        ] },
        complexity: R`<p>Time O(n): each pointer moves at most n steps. Extra space O(1) for two pointers (O(n) for the readable version).</p>`,
        followUps: ['Allow deleting at most one character (Valid Palindrome II)', 'Make it Unicode-correct with casefold() and unicodedata normalisation', 'Find the longest palindromic substring']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2: String formatting — f-strings, the format spec, str vs repr
     ====================================================================== */
  function fmtGen(input) {
    var raw = String(input === undefined ? '1234567.891|*>16,.2f' : input);
    var bar = raw.indexOf('|');
    if (bar < 0) throw new Error('Format: value|spec, for example 3.14159|.2f or 42|05d or hi|*^9');
    var valTxt = raw.slice(0, bar).trim(), spec = raw.slice(bar + 1);
    if (valTxt.length > 24 || spec.length > 16) throw new Error('Keep the value under 24 and the spec under 16 characters');
    var m = /^(?:([^{}])?([<>=^]))?([+\- ])?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bdeEfFosxX%])?$/.exec(spec);
    if (!m) throw new Error('Spec not understood. Shape: [[fill]align][sign][#][0][width][,|_][.precision][type], e.g. *>16,.2f');
    var fill = m[1], align = m[2], sign = m[3], alt = !!m[4], zero = !!m[5], width = m[6] ? parseInt(m[6], 10) : 0;
    var group = m[7], prec = m[8] !== undefined ? parseInt(m[8], 10) : null, type = m[9] || '';
    if (width > 40 || (prec !== null && prec > 12)) throw new Error('Use width ≤ 40 and precision ≤ 12 for this demo');
    var kind = /^[+-]?\d+$/.test(valTxt) ? 'int' : /^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(valTxt) ? 'float' : 'str';
    var shownVal = kind === 'str' ? pyRepr(valTxt) : valTxt;
    var frames = [];
    var specChars = Array.from(spec.length ? spec : ' ');
    frames.push({ narr: 'We will evaluate <code>f"{value:' + esc(spec) + '}"</code> where value is the ' + kind + ' <b>' + esc(shownVal) + '</b>. Everything after the colon is the <b>format spec</b>: a tiny language that says how to turn the value into text.', parts: [
      { type: 'vars', label: 'Input', vals: { value: shownVal, 'type(value)': kind, spec: "'" + spec + "'" } },
      { type: 'array', label: 'spec characters', values: specChars }
    ] });
    var rows = [
      ['fill', fill === undefined ? '(none → space)' : "'" + fill + "'"], ['align', align || '(none → default)'],
      ['sign', sign || '(none → "-" only)'], ['#', alt ? 'yes (0x / 0b / 0o prefix)' : 'no'], ['0', zero ? 'yes (zero-pad)' : 'no'],
      ['width', width || '(none)'], ['grouping', group ? "'" + group + "'" : '(none)'], ['.precision', prec === null ? '(none)' : prec], ['type', type || '(none)']
    ];
    var thl = {};
    rows.forEach(function (r, i) { if (!/^\(none|^no$/.test(String(r[1]))) thl[i] = 'ok'; });
    frames.push({ narr: 'Python splits the spec into fields, always in this fixed order: <code>[[fill]align][sign][#][0][width][grouping][.precision][type]</code>. Green rows are the ones you used.', parts: [
      { type: 'table', label: 'Parsed format spec', columns: ['field', 'value'], rows: rows, hl: thl }
    ] });
    function fail(msg, fix) {
      frames.push({ narr: '<span class="c-r">Python stops here.</span> ' + esc(msg), parts: [
        { type: 'text', label: 'Result', html: '<span class="c-r">' + esc(msg) + '</span>' }] });
      frames.push({ narr: 'How to fix it: ' + fix, parts: [{ type: 'text', label: 'Tip', html: fix }] });
      return frames;
    }
    if (kind === 'str') {
      if (type && type !== 's') return fail("ValueError: Unknown format code '" + type + "' for object of type 'str'", 'Convert first, e.g. <code>f"{float(text):.2f}"</code>, or drop the numeric type.');
      if (sign) return fail('ValueError: Sign not allowed in string format specifier', 'Signs only make sense for numbers.');
      if (group) return fail("ValueError: Cannot specify '" + group + "' with 's'.", 'Grouping is for numbers only.');
      if (align === '=') return fail("ValueError: '=' alignment not allowed in string format specifier", 'Use &lt;, &gt; or ^ for strings.');
    }
    if (kind === 'int' && prec !== null && /^[dxXbo]?$/.test(type)) return fail('ValueError: Precision not allowed in integer format specifier', 'Drop the .precision, or use type f: <code>f"{n:.2f}"</code>.');
    if (kind === 'int' && type === 's') return fail("ValueError: Unknown format code 's' for object of type 'int'", 'Use d (or no type) for integers.');
    if (kind === 'float' && /[dxXbo]/.test(type)) return fail("ValueError: Unknown format code '" + type + "' for object of type 'float'", 'Use f, e or %; or convert with int() first.');
    if (kind === 'float' && !type && prec !== null) return fail('(This demo skips the "general" g-style rules used when a float has a precision but no type.)', 'Add a type letter: <code>.2f</code> for fixed decimals or <code>.2e</code> for scientific.');
    if (group === ',' && /[xXbo]/.test(type)) return fail("ValueError: Cannot specify ',' with '" + type + "'.", "Use '_' to group hex/binary digits in fours.");
    if (zero && !align && group) return fail('(This demo does not draw zero-padding combined with grouping; Python inserts separators into the zeros too.)', 'Try <code>&gt;12,</code> instead of <code>012,</code> here, or run it in the Python runner.');

    // 1) core digits/text
    var neg = false, body = '', prefix = '', note = '';
    if (kind === 'str') {
      body = valTxt;
      if (prec !== null) { body = Array.from(body).slice(0, prec).join(''); note = 'For strings, .precision means "keep at most ' + prec + ' characters".'; }
      else note = 'Strings are used as they are.';
    } else if (kind === 'int' && (type === '' || /[dxXbo]/.test(type))) {
      var bi = BigInt(valTxt); neg = bi < 0n; if (neg) bi = -bi;
      var base = { x: 16, X: 16, b: 2, o: 8 }[type] || 10;
      body = bi.toString(base); if (type === 'X') body = body.toUpperCase();
      if (alt && base !== 10) prefix = '0' + (type === 'X' ? 'X' : type);
      note = base === 10 ? 'Integer written in base 10.' : 'Integer written in base ' + base + (prefix ? ' with the ' + prefix + ' prefix (from #).' : '.');
    } else {
      var x = Number(valTxt); neg = x < 0 || Object.is(x, -0); x = Math.abs(x);
      var p = prec === null ? 6 : prec;
      if (type === '%') x = x * 100;
      if (type === 'e' || type === 'E') {
        body = x.toExponential(p).replace(/e([+-])(\d)$/, 'e$10$2');
        if (type === 'E') body = body.toUpperCase();
        note = 'Scientific notation with ' + p + ' digits after the point (exponent padded to 2 digits, like Python).';
      } else if (type === '') {
        body = String(x); note = 'No type for a float: Python uses repr(), the shortest text that round-trips.';
      } else {
        body = x.toFixed(p);
        var sc = x * Math.pow(10, p), fl = Math.floor(sc);
        if (sc - fl === 0.5 && (fl + 0.5) / Math.pow(10, p) === x && fl % 2 === 0) body = (fl / Math.pow(10, p)).toFixed(p);
        note = (type === '%' ? 'Multiplied by 100, then ' : '') + 'rounded to ' + p + ' decimal places' + (prec === null ? ' (default precision is 6)' : '') + '. Python rounds the exact binary value, ties go to even.';
        if (type === '%') body += '%';
      }
    }
    frames.push({ narr: '<b>Step 1 — type &amp; precision.</b> ' + note, parts: [
      { type: 'vars', label: 'Building the text', vals: { 'core text': "'" + body + "'", negative: neg ? 'yes' : 'no' }, hl: { 'core text': 'ok' } }
    ] });
    // 2) grouping
    if (group) {
      var mm = /^(\d+)(.*)$/.exec(body);
      if (mm) {
        var every = /[xXbo]/.test(type) ? 4 : 3, intp = mm[1], out = '';
        for (var i = 0; i < intp.length; i++) { if (i > 0 && (intp.length - i) % every === 0) out += group; out += intp[i]; }
        body = out + mm[2];
      }
      frames.push({ narr: '<b>Step 2 — grouping.</b> Insert <code>' + group + '</code> every ' + (/[xXbo]/.test(type) ? 4 : 3) + ' digits of the integer part, counting from the right. Great for money and big counts.', parts: [
        { type: 'vars', label: 'Building the text', vals: { 'core text': "'" + body + "'" }, hl: { 'core text': 'ok' } }
      ] });
    } else {
      frames.push({ narr: '<b>Step 2 — grouping.</b> No <code>,</code> or <code>_</code> in the spec, so digits stay together.', parts: [
        { type: 'vars', label: 'Building the text', vals: { 'core text': "'" + body + "'" } }
      ] });
    }
    // 3) sign
    var signTxt = neg ? '-' : (sign === '+' ? '+' : sign === ' ' ? ' ' : '');
    frames.push({ narr: '<b>Step 3 — sign.</b> ' + (kind === 'str' ? 'Strings have no sign.' : neg ? 'The value is negative, so a minus sign is always shown.' : sign === '+' ? 'The + flag forces a plus sign on positives.' : sign === ' ' ? 'The space flag puts a space where a minus would go, so columns line up.' : 'Positive and no sign flag: nothing is added.'), parts: [
      { type: 'vars', label: 'Pieces', vals: { sign: "'" + signTxt + "'", prefix: "'" + prefix + "'", 'core text': "'" + body + "'" } }
    ] });
    // 4) padding
    var f2 = fill === undefined ? ' ' : fill, al = align;
    if (!al) {
      if (zero) { f2 = fill === undefined ? '0' : f2; al = kind === 'str' ? '<' : '='; }
      else al = kind === 'str' ? '<' : '>';
    }
    var core = signTxt + prefix + body, coreLen = Array.from(core).length, pad = Math.max(0, width - coreLen), result;
    if (al === '<') result = core + f2.repeat(pad);
    else if (al === '>') result = f2.repeat(pad) + core;
    else if (al === '^') result = f2.repeat(Math.floor(pad / 2)) + core + f2.repeat(pad - Math.floor(pad / 2));
    else result = signTxt + prefix + f2.repeat(pad) + body;
    var cells = Array.from(result), chl = {};
    var coreStart = al === '<' ? 0 : al === '>' ? pad : al === '^' ? Math.floor(pad / 2) : 0;
    cells.forEach(function (c, i) {
      if (al === '=') chl[i] = (i >= (signTxt + prefix).length && i < (signTxt + prefix).length + pad) ? 'win' : 'ok';
      else chl[i] = (i >= coreStart && i < coreStart + coreLen) ? 'ok' : 'win';
    });
    var alName = { '<': 'left', '>': 'right', '^': 'centre', '=': 'after the sign' }[al];
    frames.push({ narr: '<b>Step 4 — width &amp; alignment.</b> ' + (width ? 'Target width ' + width + ', text is ' + coreLen + ' long, so add <b>' + pad + '</b> fill character(s) <code>' + esc(pyRepr(f2)) + '</code>, aligning <b>' + alName + '</b>' + (align ? '.' : ' (the default for ' + (kind === 'str' ? 'strings is left' : 'numbers is right') + (zero ? ', and 0 means zero-pad after the sign' : '') + ').') : 'No width, so no padding. (Width is a minimum; text longer than the width is never cut.)') + ' Blue cells = padding, green = the value.', parts: [
      { type: 'array', label: 'final text', values: cells.map(show), hl: chl }
    ] });
    frames.push({ narr: 'Done. The same spec works in three places: f-strings, <code>format()</code> and <code>str.format()</code>.', parts: [
      { type: 'code', label: 'Equivalent forms', lang: 'python', code: 'f"{value:' + spec + '}"\nformat(value, "' + spec + '")\n"{:' + spec + '}".format(value)', hl: { 1: 'ok' } },
      { type: 'text', label: 'Result', html: '<code>' + esc(pyRepr(result)) + '</code>  (length ' + cells.length + ')' }
    ] });
    return frames;
  }

  topics.push({
    title: 'Strings II: f-strings, the Format Spec Mini-Language, str() vs repr()',
    analogy: R`<p>An f-string is a <b>fill-in-the-blanks form</b>: <code>f"Dear {name}, you owe {amount}"</code>. The bit after a colon, like <code>{amount:,.2f}</code>, is the <b>instruction note you give a sign-maker</b>: "use commas, show exactly 2 decimals". Add <code>&gt;10</code> and you are saying "right-align it on a 10-letter-wide board". Same value, different presentation.</p>`,
    explain: R`<p>🟢 <b>f-strings</b> (Python 3.6+) are the modern, fastest, most readable way to put values into text. Put an <code>f</code> before the quote and any expression inside <code>{ }</code>:</p>
      <pre>name, items, total = "Asha", 3, 1234.5
print(f"{name} bought {items} items for ₹{total:,.2f}")
# Asha bought 3 items for ₹1,234.50</pre>
      <p>🔵 <b>The format spec</b> after the colon follows a fixed order. Learn it once, use it everywhere:</p>
      ${H.table(['Part', 'Means', 'Example', 'Result'], [
        ['fill + align', '<code>&lt;</code> left, <code>&gt;</code> right, <code>^</code> centre, <code>=</code> pad after sign', '<code>f"{\'hi\':*^6}"</code>', '<code>**hi**</code>'],
        ['sign', '<code>+</code> always, <code>-</code> only negatives, space = leave room', '<code>f"{5:+}"</code>', '<code>+5</code>'],
        ['#', 'show base prefix', '<code>f"{255:#x}"</code>', '<code>0xff</code>'],
        ['0 + width', 'zero-pad to width', '<code>f"{42:05d}"</code>', '<code>00042</code>'],
        ['grouping', '<code>,</code> or <code>_</code> thousands separator', '<code>f"{1234567:,}"</code>', '<code>1,234,567</code>'],
        ['.precision', 'decimals (floats) / max chars (strings)', '<code>f"{3.14159:.2f}"</code>', '<code>3.14</code>'],
        ['type', '<code>d</code> int, <code>f</code> fixed, <code>e</code> scientific, <code>%</code> percent, <code>x b o</code> hex/bin/oct, <code>s</code> string', '<code>f"{0.256:.1%}"</code>', '<code>25.6%</code>']
      ])}
      <p><b>Conversions and debugging:</b> <code>{x!r}</code> uses <code>repr(x)</code>, <code>{x!s}</code> uses <code>str(x)</code>. <code>{x=}</code> (3.8+) prints the expression and its value: <code>f"{total=}"</code> → <code>total=1234.5</code>. Perfect for quick debugging.</p>
      <p><b>str() vs repr():</b> <code>str()</code> is the friendly text for users; <code>repr()</code> is the unambiguous text for developers (strings get quotes, invisible characters become visible). <code>print("a\tb")</code> shows a tab; <code>print(repr("a\tb"))</code> shows <code>'a\tb'</code>.</p>
      <p><b>Literal braces:</b> double them: <code>f"{{not a field}}"</code> prints <code>{not a field}</code>.</p>
      <p><b>The older styles you will still read:</b> <code>"{} is {}".format(a, b)</code> (same spec language, useful when the template is stored separately) and <code>"%s is %d" % (a, b)</code> (C-style, still used by the <code>logging</code> module for lazy formatting).</p>`,
    clues: [
      '"print a table / receipt / aligned columns" → width + alignment: <code>{name:&lt;12}{price:&gt;8.2f}</code>',
      '"format money / large numbers" → <code>{x:,.2f}</code> or <code>{x:_}</code>',
      '"leading zeros / fixed-width IDs" → <code>{n:05d}</code> or <code>str(n).zfill(5)</code>',
      '"show percentage with one decimal" → <code>{ratio:.1%}</code> (multiplies by 100 for you)',
      '"binary / hex representation" → <code>{n:b}</code>, <code>{n:08b}</code>, <code>{n:#x}</code>',
      '"debug print variable name and value" → <code>f"{var=}"</code>',
      '"template comes from config / user" → <code>str.format</code> or <code>string.Template</code>, never f-string eval'
    ],
    code: [{ lang: 'python', run: true, title: 'The format spec, one feature per line (runnable)', code: R`
      price, qty, name = 1234.5, 3, "Asha"
      print(f"{name} owes {price * qty:,.2f}")   # grouping + 2 decimals
      print(f"[{name:<8}]")      # left-align in 8
      print(f"[{name:>8}]")      # right-align in 8
      print(f"[{name:*^10}]")    # centre with * as fill
      print(f"{42:05d}")         # 00042 zero-pad
      print(f"{-42:=+8}")        # '-     42' pad after the sign
      print(f"{255:b} {255:#x} {255:o}")   # 11111111 0xff 377
      print(f"{0.4567:.1%}")     # 45.7%
      print(f"{6.02e23:.3e}")    # 6.020e+23
      print(f"{'truncate me':.5}")   # 'trunc' precision on a string
      width = 12
      print(f"[{name:>{width}}]")    # nested field: width from a variable
      total = price * qty
      print(f"{total=}")             # total=3703.5  (debug form)
      text = "tab\there"
      print(f"{text!r}")             # 'tab\there'  (repr shows the escape)
      print(f"{{braces}} and {qty}") # {braces} and 3
      print("{} has {:d} items".format(name, qty))   # str.format
      print("%s has %d items" % (name, qty))          # old % style
    ` }],
    codeTitle: ['Formatting cheat sheet'],
    viz: {
      title: 'Format spec decoder: watch value + spec become text',
      input: '1234567.891|*>16,.2f',
      inputLabel: 'value|spec  (try 42|08b, 0.256|.1%, -7|+05d, Python|^12, 3.14159|.3f)',
      gen: fmtGen
    },
    examples: [
      { title: 'A neat price table with three aligned columns', html: R`<p>Left-align text, right-align numbers: that is how humans scan tables. Fixed widths make every row line up:</p>${H.table(['spec', 'job'], [['<code>{name:&lt;10}</code>', 'name, left, 10 wide'], ['<code>{qty:&gt;4}</code>', 'quantity, right, 4 wide'], ['<code>{price:&gt;9,.2f}</code>', 'money, right, commas, 2 decimals']])}`, code: { lang: 'python', run: true, code: R`
        rows = [("Pen", 2, 15.5), ("Notebook", 10, 1250), ("Bag", 1, 2399.99)]
        print(f"{'Item':<10}{'Qty':>4}{'Price':>11}")
        for name, qty, price in rows:
            print(f"{name:<10}{qty:>4}{price:>11,.2f}")
      ` } },
      { title: 'Rounding surprises: 2.675 → 2.67, not 2.68', html: R`<p>Floats are stored in binary, so 2.675 is really 2.67499999999999982236431605997495353221893310546875. Formatting rounds the <b>real</b> stored value. For money, use <code>decimal.Decimal</code> or integers (paise/cents).</p>`, code: { lang: 'python', run: true, code: R`
        from decimal import Decimal, ROUND_HALF_UP
        print(f"{2.675:.2f}")            # 2.67 (binary value is slightly below .675)
        print(f"{0.125:.2f}")            # 0.12 (exact tie -> round half to even)
        d = Decimal("2.675").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        print(d)                          # 2.68
      ` } },
      { title: 'str() vs repr() — why debug output uses repr', html: R`<p>When a value has spaces, newlines or is a string that looks like a number, <code>str()</code> hides the difference; <code>repr()</code> reveals it. Containers (lists, dicts) always show their items with <code>repr</code>.</p>`, code: { lang: 'python', run: true, code: R`
        a, b = "42", 42
        print(str(a), str(b))       # 42 42   (look identical!)
        print(repr(a), repr(b))     # '42' 42 (now you can tell)
        s = "line1\nline2 "
        print(f"{s!r}")             # 'line1\nline2 '  trailing space visible
        print(["x", 1])             # ['x', 1]  lists use repr for items
      ` } },
      { title: 'Binary and hex with fixed width (bit puzzles)', html: R`<p>Combine zero-padding, width and type: <code>{n:08b}</code> shows a byte. ${H.bits(37, 8, { label: '37' })} Useful for bit-manipulation questions and for printing byte values in hex like <code>{b:02x}</code>.</p>`, code: { lang: 'python', run: true, code: R`
        for n in (5, 37, 255):
            print(f"{n:>3} = {n:08b} = 0x{n:02X}")
        print(f"{1_000_000:_}")   # 1_000_000  (underscore grouping)
      ` } }
    ],
    deepDive: R`<p>🟣 <b>How f-strings really work.</b></p>
      <ul>
        <li><b>Compiled, not parsed at runtime:</b> an f-string is turned into bytecode at compile time (<code>FORMAT_VALUE</code> / <code>FORMAT_SIMPLE</code> + <code>BUILD_STRING</code>). That is why it is faster than <code>.format()</code>, which must parse the template string every call.</li>
        <li><b>__format__:</b> <code>f"{x:spec}"</code> calls <code>format(x, spec)</code>, which calls <code>type(x).__format__(x, spec)</code>. Each type defines its own mini-language: <code>datetime</code> uses strftime codes, so <code>f"{now:%Y-%m-%d}"</code> works. Your own classes can define <code>__format__</code> too.</li>
        <li><b>PEP 701 (Python 3.12):</b> f-strings became part of the real grammar. You can now reuse the same quote type inside (<code>f"{d["key"]}"</code>), use backslashes and comments inside expressions, and nest arbitrarily. Code meant to run on 3.11 or older must avoid these.</li>
        <li><b>PEP 750 template strings (Python 3.14):</b> <code>t"Hello {name}"</code> does <b>not</b> produce a str; it produces a <code>string.templatelib.Template</code> object holding the static parts and the interpolated values separately. Libraries can then escape values safely (SQL, HTML, shell). This is the 2025+ answer to "f-strings make injection too easy".</li>
        <li><b>Security:</b> never build SQL, shell commands or HTML with f-strings from user input; use parameterised queries, <code>subprocess</code> argument lists and template auto-escaping. And never call <code>str.format</code> on a template supplied by a user with rich objects available: <code>"{0.__class__.__init__.__globals__}"</code> style attribute lookups can leak data. Use <code>string.Template</code> (only <code>$name</code> substitution) for user-provided templates.</li>
        <li><b>Logging:</b> <code>logger.debug("user %s", user)</code> formats lazily only if the message is emitted; <code>logger.debug(f"user {user}")</code> always pays the formatting cost. Linters (ruff rule G004) flag this.</li>
      </ul>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> nobody memorises every format code any more; ask an assistant "format 0.0473 as a percent with 2 decimals and a plus sign" and you get <code>{x:+.2%}</code>. That is fine for writing code.</p>
      <p><b>Use AI as a partner:</b> have it generate a table of edge cases (negative numbers, 0, huge numbers, NaN, long names) for your report formatter, then eyeball the aligned output.</p>
      <p><b>Where AI goes wrong:</b> it still sometimes builds SQL with f-strings (SQL injection), uses <code>round()</code> for money instead of <code>Decimal</code>, writes 3.12-only nested quotes for a 3.9 codebase, or confuses <code>%</code> type (multiplies by 100) with a literal percent sign. It also produces f-string logging calls that linters reject.</p>
      <p><b>What you must still own:</b> reading a spec like <code>{x:&gt;10,.2f}</code> at a glance, knowing str vs repr when debugging, and spotting injection risks in generated code. In 2026, t-strings (3.14) are the tool to know for safe templating.</p>`,
    problems: [{
      title: 'Aligned Receipt Printer',
      level: 'Medium', tags: ['f-strings', 'format spec', 'alignment'], companies: ['Flipkart', 'Shopify', 'Swiggy'],
      statement: R`<p>Given a list of <code>(item, quantity, unit_price)</code> tuples, return the receipt as a single string. Columns: item left-aligned in 14 characters (cut longer names to 13 characters plus <code>…</code>), quantity right-aligned in 4, line total right-aligned in 12 with thousands separators and 2 decimals. End with a dashed line of 30 <code>-</code> and a <code>TOTAL</code> row aligned the same way.</p>`,
      constraints: R`0 ≤ number of items ≤ 1000; 1 ≤ qty ≤ 10<sup>4</sup>; 0 ≤ price ≤ 10<sup>6</sup>.`,
      example: R`<p>Input <code>[("Pen", 2, 15.5), ("Wireless Keyboard Pro", 1, 2499)]</code> → rows ${H.c('g', '"Pen              2       31.00"')} and ${H.c('g', '"Wireless Keyb…   1    2,499.00"')}, then the dashed line and ${H.c('b', '"TOTAL                 2,530.00"')}. The long name is cut so every column stays put.</p>`,
      brute: {
        why: R`<p>Pad with string concatenation and manual space counting: <code>name + " " * (14 - len(name))</code>. It breaks when the name is longer than 14 (negative repeat gives ""), needs separate code for commas, and is hard to read and change.</p>`,
        code: { lang: 'python', run: true, code: R`
          def receipt_brute(items):
              lines = []
              total = 0
              for name, qty, price in items:
                  amount = qty * price
                  total += amount
                  money = str(round(amount, 2))          # no commas, may print 31.0
                  lines.append(name + " " * (14 - len(name)) + " " * (4 - len(str(qty))) + str(qty)
                               + " " * (12 - len(money)) + money)
              lines.append("-" * 30)
              lines.append("TOTAL" + " " * 25 + str(total))   # misaligned
              return "\n".join(lines)

          print(receipt_brute([("Pen", 2, 15.5), ("Wireless Keyboard Pro", 1, 2499)]))
        ` }
      },
      mcq: { q: 'Which single spec prints 2499 as <code>"    2,499.00"</code> (12 wide)?', options: ['<code>{x:&gt;12,.2f}</code>', '<code>{x:12.2}</code>', '<code>{x:,&gt;12.2f}</code>', '<code>{x:&lt;12,.2f}</code>'], answer: 0, explain: 'Order is fill/align, width, grouping, .precision, type: &gt; then 12 then , then .2f. Option 3 makes "," the FILL character.' },
      hints: [
        R`<p>Hint 1: Each row is one f-string with three fields; widths 14 + 4 + 12 = 30, the same as the dashed line.</p>`,
        R`<p>Hint 2: Shorten long names first: <code>name if len(name) &lt;= 14 else name[:13] + "…"</code>. Width never truncates, precision would cut without the ellipsis.</p>`,
        R`<p>Hint 3: Money spec <code>&gt;12,.2f</code>. Keep a running total; build all lines in a list and <code>"\n".join</code> them.</p>`
      ],
      solution: {
        approach: R`<p>Fix the column widths as constants, shorten long names with a slice plus an ellipsis, and let the format spec do all alignment, grouping and rounding. Use a list of lines and join once.</p>`,
        code: { lang: 'python', run: true, code: R`
          NAME_W, QTY_W, AMT_W = 14, 4, 12

          def fit(name: str, width: int = NAME_W) -> str:
              """Cut a long name so it fits, marking the cut with an ellipsis."""
              return name if len(name) <= width else name[: width - 1] + "…"

          def receipt(items) -> str:
              lines, total = [], 0.0
              for name, qty, price in items:
                  amount = qty * price
                  total += amount
                  lines.append(f"{fit(name):<{NAME_W}}{qty:>{QTY_W}}{amount:>{AMT_W},.2f}")
              lines.append("-" * (NAME_W + QTY_W + AMT_W))
              lines.append(f"{'TOTAL':<{NAME_W + QTY_W}}{total:>{AMT_W},.2f}")
              return "\n".join(lines)

          print(receipt([("Pen", 2, 15.5), ("Wireless Keyboard Pro", 1, 2499)]))
          print(receipt([]))   # just the dashes and a zero total
        ` },
        dry: { head: ['row', 'fit(name)', 'qty', 'amount', 'line'], rows: [
          ['1', "'Pen'", '2', '31.0', "'Pen' + 11 spaces + '   2' + '       31.00'"],
          ['2', "'Wireless Keyb…'", '1', '2499', "'Wireless Keyb…' + '   1' + '    2,499.00'"],
          ['end', '—', '—', 'total 2530.0', "'TOTAL' padded to 18 + '    2,530.00'"]
        ] },
        complexity: R`<p>O(n · w) time where w = 30 characters per line; O(n · w) output size.</p>`,
        followUps: ['Make the widths adapt to the longest item name', 'Use Decimal so 0.1 + 0.2 style errors never appear on receipts', 'Support right-to-left or wide (CJK) characters — what does len() get wrong for display width?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3: bytes vs str — Unicode, encodings and UTF-8
     ====================================================================== */
  topics.push({
    title: 'bytes vs str: Unicode, Encoding & Decoding (UTF-8)',
    analogy: R`<p>A <b>str</b> is a message in your head: letters with meaning. <b>bytes</b> are that message turned into <b>Morse code</b> so it can travel down a wire or sit on a disk. The <b>encoding</b> (UTF-8, Latin-1…) is the <b>codebook</b>. Encode with one codebook and decode with another and you get gibberish like <code>cafÃ©</code> — that is called <b>mojibake</b>. Text inside Python = str. Anything that crosses a boundary (file, network, hash, database driver) = bytes.</p>`,
    explain: R`<p>🟢 <b>Two different types:</b></p>
      ${H.table(['', 'str', 'bytes'], [
        ['Holds', 'Unicode <b>characters</b> (code points)', 'raw <b>numbers 0–255</b>'],
        ['Literal', '<code>"café"</code>', '<code>b"caf\\xc3\\xa9"</code> (only ASCII allowed literally)'],
        ['Index gives', 'a 1-char str: <code>"café"[3]</code> → <code>\'é\'</code>', 'an int: <code>b"AB"[0]</code> → <code>65</code>'],
        ['len()', 'number of characters', 'number of bytes'],
        ['Convert', '<code>s.encode("utf-8")</code> → bytes', '<code>b.decode("utf-8")</code> → str'],
        ['Mutable twin', '(none)', '<code>bytearray</code>']
      ])}
      <p><b>Unicode</b> gives every character in every language a number called a <b>code point</b>: <code>A</code> = U+0041 (65), <code>é</code> = U+00E9 (233), <code>€</code> = U+20AC (8364), <code>😀</code> = U+1F600 (128512). <code>ord()</code> and <code>chr()</code> convert between characters and code points.</p>
      <p><b>UTF-8</b> is the encoding that turns those numbers into bytes, and it is the default almost everywhere (web, Linux, JSON, Python source files). It uses <b>1 to 4 bytes</b> per character:</p>
      ${H.table(['Code points', 'Bytes', 'Example'], [['U+0000 – U+007F (ASCII)', '1', '<code>A</code> → <code>41</code>'], ['U+0080 – U+07FF', '2', '<code>é</code> → <code>C3 A9</code>'], ['U+0800 – U+FFFF', '3', '<code>€</code> → <code>E2 82 AC</code>'], ['U+10000 – U+10FFFF', '4', '<code>😀</code> → <code>F0 9F 98 80</code>']])}
      <p>So <code>len("café")</code> is <b>4</b> but <code>len("café".encode("utf-8"))</code> is <b>5</b>. Database columns, SMS limits and network buffers often count bytes, not characters.</p>
      <p>🔵 <b>Rules that prevent 90% of bugs:</b></p>
      <ul>
        <li><b>Decode at the edges, work in str, encode at the edges</b> (the "Unicode sandwich").</li>
        <li><b>Always name the encoding</b> when opening text files: <code>open(p, encoding="utf-8")</code>. Without it, Python uses the system default, which differs on Windows.</li>
        <li><b>You cannot mix them:</b> <code>"a" + b"b"</code> → <code>TypeError: can only concatenate str (not "bytes") to str</code>.</li>
        <li><b>Bad bytes</b> raise <code>UnicodeDecodeError</code>. Choose a policy with <code>errors=</code>: <code>"strict"</code> (default, raise), <code>"replace"</code> (insert �), <code>"ignore"</code> (drop), <code>"backslashreplace"</code> (show <code>\xff</code>).</li>
      </ul>`,
    clues: [
      '"UnicodeDecodeError: \'utf-8\' codec can\'t decode byte" → file is not UTF-8 or was read with the wrong encoding',
      '"cafÃ© / â€™ appears in output" → mojibake: UTF-8 bytes decoded as Latin-1/cp1252',
      '"limit is N bytes, not N characters" → measure <code>len(s.encode("utf-8"))</code>',
      '"hash / encrypt / send over socket" → APIs need bytes: <code>hashlib.sha256(s.encode())</code>',
      '"TypeError: a bytes-like object is required, not \'str\'" → encode before writing to a binary file / socket',
      '"same-looking strings compare unequal" → Unicode normalisation (NFC vs NFD)'
    ],
    code: [{ lang: 'python', run: true, title: 'Encoding, decoding and error policies (runnable)', code: R`
      s = "café €😀"
      b = s.encode("utf-8")
      print(len(s), len(b))          # 7 characters, 14 bytes
      print(b)                       # b'caf\xc3\xa9 \xe2\x82\xac\xf0\x9f\x98\x80'
      print(list("é".encode()))      # [195, 169]  bytes are just numbers 0..255
      print(b[0], b[:3])             # 99 b'caf'   index -> int, slice -> bytes
      print(b.decode("utf-8") == s)  # True: round trip is lossless

      print(ord("€"), hex(ord("€")), chr(0x1F600))   # 8364 0x20ac 😀

      wrong = "café".encode("utf-8").decode("latin-1")
      print(wrong)                   # cafÃ©  <- mojibake

      bad = b"ok \xff\xfe end"
      for policy in ("replace", "ignore", "backslashreplace"):
          print(policy, "->", bad.decode("utf-8", errors=policy))
      try:
          bad.decode("utf-8")
      except UnicodeDecodeError as e:
          print("strict ->", e.reason, "at byte", e.start)

      try:
          "a" + b"b"
      except TypeError as e:
          print("TypeError:", e)

      buf = bytearray(b"hello")      # mutable bytes
      buf[0] = ord("J")
      print(buf, bytes(buf).decode())
    ` }],
    codeTitle: ['Unicode sandwich in code'],
    viz: {
      title: 'UTF-8 encoder: characters → code points → bytes',
      input: 'Aé€😀',
      inputLabel: 'Any text (up to 10 characters, emoji welcome)',
      gen: function (input) {
        var text = String(input === undefined ? 'Aé€😀' : input);
        var chars = Array.from(text);
        if (!chars.length || chars.length > 10) throw new Error('Type 1 to 10 characters');
        var frames = [], bytesSoFar = [], owner = [];
        frames.push({ narr: 'Python sees <b>' + chars.length + ' characters</b> (that is <code>len(s)</code>). To store or send them we must <b>encode</b> each one into bytes. UTF-8 uses 1–4 bytes depending on how big the code point is.', parts: [
          { type: 'array', label: 's (str: characters)', values: chars.map(show) },
          { type: 'table', label: 'UTF-8 byte templates', columns: ['code point range', 'byte pattern'], rows: [['0 – 127', '0xxxxxxx'], ['128 – 2047', '110xxxxx 10xxxxxx'], ['2048 – 65535', '1110xxxx 10xxxxxx 10xxxxxx'], ['65536 – 1114111', '11110xxx 10xxxxxx 10xxxxxx 10xxxxxx']] }
        ] });
        chars.forEach(function (ch, i) {
          var cp = ch.codePointAt(0), bs = utf8(cp), hl = {};
          hl[i] = 'cur';
          for (var k = 0; k < i; k++) hl[k] = 'done';
          var width = bs.length === 1 ? 7 : bs.length === 2 ? 11 : bs.length === 3 ? 16 : 21;
          frames.push({ narr: '<b>' + esc(ch) + '</b> has code point <b>U+' + cp.toString(16).toUpperCase().padStart(4, '0') + '</b> (= ' + cp + ', <code>ord(' + esc(pyRepr(ch)) + ')</code>). It needs ' + width + ' bits of payload, so UTF-8 uses the <b>' + bs.length + '-byte</b> template.', parts: [
            { type: 'array', label: 's (str)', values: chars.map(show), hl: hl },
            { type: 'bits', label: 'code point bits', value: cp, width: width }
          ] });
          var start = bytesSoFar.length;
          bs.forEach(function (b) { bytesSoFar.push(hex2(b)); owner.push(i); });
          var bhl = {};
          for (var j = 0; j < bytesSoFar.length; j++) bhl[j] = j >= start ? 'ok' : 'done';
          frames.push({ narr: 'The payload bits are poured into the template. ' + (bs.length === 1 ? 'ASCII characters stay one byte, identical to old ASCII: that is why UTF-8 is backward compatible.' : 'The first byte starts with ' + bs.length + ' one-bits (telling a decoder "' + bs.length + ' bytes follow"), and every continuation byte starts with <code>10</code>.') + ' Bytes added: <b>' + bs.map(hex2).join(' ') + '</b>.', parts: [
            { type: 'array', label: 's (str)', values: chars.map(show), hl: hl },
            { type: 'bits', label: 'first byte of ' + esc(ch), value: bs[0], width: 8 },
            { type: 'array', label: 's.encode("utf-8") so far (hex)', values: bytesSoFar.slice(), hl: bhl, idxLabels: owner.map(function (o, j) { return j + ':' + chars[o]; }) }
          ] });
        });
        frames.push({ narr: 'Finished: <code>len(s)</code> = <b>' + chars.length + '</b> characters but <code>len(s.encode())</code> = <b>' + bytesSoFar.length + '</b> bytes. Limits measured in bytes (DB columns, SMS, packet sizes) must use the encoded length.', parts: [
          { type: 'array', label: 'str', values: chars.map(show) },
          { type: 'array', label: 'bytes (hex)', values: bytesSoFar.slice() },
          { type: 'vars', label: 'Lengths', vals: { 'len(s)': chars.length, 'len(s.encode("utf-8"))': bytesSoFar.length }, hl: { 'len(s.encode("utf-8"))': 'sel' } }
        ] });
        var lat = [];
        bytesSoFar.forEach(function (h) {
          var v = parseInt(h, 16);
          lat.push(v >= 0x80 && v < 0xA0 ? '\\x' + h.toLowerCase() : String.fromCharCode(v));
        });
        frames.push({ narr: 'Decoding with the <b>wrong codebook</b>: Latin-1 maps every single byte to one character, so multi-byte UTF-8 sequences turn into several odd characters. That is mojibake. Fix: <code>broken.encode("latin-1").decode("utf-8")</code>.', parts: [
          { type: 'array', label: 'bytes (hex)', values: bytesSoFar.slice() },
          { type: 'array', label: '.decode("latin-1") — wrong!', values: lat.map(show), hl: (function () { var h = {}; lat.forEach(function (c, j) { if (parseInt(bytesSoFar[j], 16) >= 0x80) h[j] = 'bad'; }); return h; })() }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Characters vs bytes: an SMS/DB length check', html: R`<p>A column declared as "VARCHAR(10) bytes" or an API limit of 10 bytes rejects <code>"नमस्ते"</code> even though it looks short: Devanagari letters take 3 bytes each in UTF-8.</p>${H.table(['text', 'len(s)', 'len(s.encode())'], [['"hello"', '5', '5'], ['"café"', '4', '5'], ['"नमस्ते"', '6', '18'], ['"😀"', '1', '4']])}`, code: { lang: 'python', run: true, code: R`
        for s in ["hello", "café", "नमस्ते", "😀"]:
            print(f"{s!r:10} chars={len(s):2}  utf8 bytes={len(s.encode('utf-8')):2}")
      ` } },
      { title: 'Hashing needs bytes', html: R`<p>Hash functions work on bytes, not text. Passing a str raises <code>TypeError: Strings must be encoded before hashing</code>. The encoding choice matters: different encodings → different bytes → different hash.</p>`, code: { lang: 'python', run: true, code: R`
        import hashlib
        pw = "pässword"
        print(hashlib.sha256(pw.encode("utf-8")).hexdigest()[:16])
        print(hashlib.sha256(pw.encode("latin-1")).hexdigest()[:16])   # different!
        try:
            hashlib.sha256(pw)
        except TypeError as e:
            print("TypeError:", e)
      ` } },
      { title: 'Repairing mojibake', html: R`<p>If text was encoded as UTF-8 but decoded as Latin-1 (or Windows cp1252), you can usually reverse the mistake: encode back with the wrong codec to get the original bytes, then decode correctly.</p>`, code: { lang: 'python', run: true, code: R`
        broken = "cafÃ© costs 5â‚¬"            # produced by a wrong decode
        try:
            fixed = broken.encode("cp1252").decode("utf-8")
        except UnicodeError:
            fixed = broken
        print(fixed)                           # café costs 5€
      ` } },
      { title: 'Same look, different strings: Unicode normalisation', html: R`<p><code>é</code> can be one code point (U+00E9) or <code>e</code> + combining accent (U+0065 U+0301). They print the same but compare unequal. Normalise with <code>unicodedata.normalize("NFC", s)</code> before comparing user input (usernames, search).</p>`, code: { lang: 'python', run: true, code: R`
        import unicodedata
        a = "café"          # composed
        b = "café"         # e + combining acute accent
        print(a, b, a == b, len(a), len(b))      # café café False 4 5
        nfc = unicodedata.normalize
        print(nfc("NFC", a) == nfc("NFC", b))    # True
      ` } }
    ],
    deepDive: R`<p>🟣 <b>Going deeper.</b></p>
      <ul>
        <li><b>Why UTF-8 won:</b> ASCII-compatible, no byte-order issues, and <b>self-synchronising</b>: continuation bytes always look like <code>10xxxxxx</code>, so if you jump into the middle of a stream you can find the next character boundary. It also never produces a zero byte except for U+0000, so C APIs survive.</li>
        <li><b>UTF-16 and surrogates:</b> Windows APIs, Java and JavaScript strings use UTF-16, where emoji take two 16-bit units (a surrogate pair). That is why <code>"😀".length</code> is 2 in JavaScript but <code>len("😀")</code> is 1 in Python: Python counts code points.</li>
        <li><b>Grapheme clusters:</b> what users call one character may be several code points: 👍🏽 (thumb + skin tone) or 🇮🇳 (two regional indicators) or a family emoji joined by ZWJ. <code>len()</code> counts code points, so "reverse a string" or "truncate to 10 characters" can split them. The third-party <code>regex</code> module (<code>\X</code>) or the <code>grapheme</code> package handle clusters.</li>
        <li><b>BOM:</b> some Windows tools write <code>EF BB BF</code> at the start of UTF-8 files. Decoding with <code>"utf-8-sig"</code> strips it; plain <code>"utf-8"</code> leaves a stray <code>﻿</code> at the start of your first CSV header.</li>
        <li><b>Default encoding:</b> <code>open()</code> without <code>encoding=</code> uses <code>locale.getpreferredencoding()</code> (cp1252 on many Windows machines). Run with <code>-X warn_default_encoding</code> (3.10+) to get <code>EncodingWarning</code>s. PEP 686 makes UTF-8 mode the default starting with Python 3.15; until every machine you deploy to has it, pass <code>encoding="utf-8"</code> explicitly.</li>
        <li><b>surrogateescape:</b> file names on Linux are bytes and might not be valid UTF-8. Python decodes them with the <code>surrogateescape</code> handler so they round-trip losslessly (<code>os.fsencode</code>/<code>os.fsdecode</code>).</li>
        <li><b>Performance:</b> <code>bytes.decode("utf-8")</code> and <code>str.encode</code> have fast paths for pure ASCII; <code>bytearray</code> or <code>io.BytesIO</code> are the efficient way to assemble binary data piece by piece; <code>memoryview</code> slices bytes without copying.</li>
      </ul>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> AI is very good at diagnosing encoding errors from a traceback: paste <code>UnicodeDecodeError: 'utf-8' codec can't decode byte 0x92 in position 17</code> and it will tell you 0x92 is a cp1252 curly apostrophe. That turns an hour of confusion into a minute.</p>
      <p><b>Use AI as a partner:</b> ask it to write a small script that detects likely encodings of a file (trying utf-8, utf-8-sig, cp1252) and reports the first bad byte; ask for test strings covering emoji, combining marks, RTL text and CJK.</p>
      <p><b>Where AI goes wrong:</b> it often "fixes" errors with <code>errors="ignore"</code>, silently deleting customer data; it forgets <code>encoding=</code> in <code>open()</code>; it assumes <code>len(s)</code> equals bytes; and LLM tokenisers themselves work on bytes/sub-words, so models genuinely struggle to count characters or reverse strings in their head — never trust an AI's mental character count, run the code.</p>
      <p><b>What you must still own:</b> the Unicode sandwich design, choosing an error policy deliberately, and knowing which boundary (file, socket, DB, hash) needs bytes.</p>`,
    problems: [{
      title: 'Truncate to N Bytes Without Breaking a Character',
      level: 'Medium', tags: ['unicode', 'utf-8', 'bytes'], companies: ['Google', 'Twilio', 'Atlassian'],
      statement: R`<p>A database column holds at most <code>max_bytes</code> bytes of UTF-8. Write <code>truncate_utf8(s, max_bytes)</code> that returns the <b>longest prefix of s</b> whose UTF-8 encoding fits in <code>max_bytes</code>, never cutting a character in half.</p>`,
      constraints: R`0 ≤ max_bytes ≤ 10<sup>6</sup>; s is any valid Unicode string up to 10<sup>6</sup> characters.`,
      example: R`<p><code>truncate_utf8("café!", 4)</code> → ${H.c('g', "'caf'")}. The bytes are <code>63 61 66 C3 A9 21</code>; keeping 4 bytes would cut <code>é</code> (<code>C3 A9</code>) in half, so we drop it entirely. <code>truncate_utf8("café!", 5)</code> → ${H.c('g', "'café'")}.</p>`,
      brute: {
        why: R`<p>Try every prefix from longest to shortest and encode each one until it fits. Each encode is O(n) and there are up to n prefixes, so this is O(n²) — far too slow for a megabyte of text.</p>`,
        code: { lang: 'python', run: true, code: R`
          def truncate_brute(s, max_bytes):
              for end in range(len(s), -1, -1):          # longest prefix first
                  if len(s[:end].encode("utf-8")) <= max_bytes:
                      return s[:end]
              return ""

          print(truncate_brute("café!", 4), truncate_brute("café!", 5))
        ` }
      },
      mcq: { q: 'In UTF-8, how can you tell a byte is a <b>continuation</b> byte (middle of a character)?', options: ['Its top two bits are 10 (b &amp; 0xC0 == 0x80)', 'It is greater than 127', 'It is zero', 'You cannot tell without decoding from the start'], answer: 0, explain: 'Lead bytes are 0xxxxxxx, 110xxxxx, 1110xxxx or 11110xxx; continuation bytes are always 10xxxxxx. That self-synchronising property lets us back up to a boundary.' },
      hints: [
        R`<p>Hint 1: Encode once. Now the problem is: where can I cut the byte string <code>b</code> at or before <code>max_bytes</code>?</p>`,
        R`<p>Hint 2: A cut at index i is safe if <code>b[i]</code> is NOT a continuation byte (<code>b[i] &amp; 0xC0 != 0x80</code>) — that means a character starts there.</p>`,
        R`<p>Hint 3: If <code>len(b) &lt;= max_bytes</code> return s. Else start at <code>i = max_bytes</code> and step back while <code>b[i]</code> is a continuation byte (at most 3 steps). Decode <code>b[:i]</code>. Shortcut: <code>b[:max_bytes].decode("utf-8", "ignore")</code> also works because only the tail can be broken.</p>`
      ],
      solution: {
        approach: R`<p>Encode once (O(n)), then use UTF-8's self-synchronising property: walk back from the cut point over at most 3 continuation bytes to the start of a character, and decode the safe prefix.</p>`,
        code: { lang: 'python', run: true, code: R`
          def truncate_utf8(s: str, max_bytes: int) -> str:
              b = s.encode("utf-8")
              if len(b) <= max_bytes:
                  return s
              i = max_bytes
              # 0b10xxxxxx bytes continue a character; never cut just before one
              while i > 0 and (b[i] & 0xC0) == 0x80:
                  i -= 1
              return b[:i].decode("utf-8")

          tests = [("café!", 4), ("café!", 5), ("😀😀", 5), ("abc", 10), ("€", 2)]
          for s, n in tests:
              out = truncate_utf8(s, n)
              print(repr(s), n, "->", repr(out), len(out.encode()))
        ` },
        alt: [{ lang: 'python', title: 'Shortcut with errors="ignore"', code: R`
          def truncate_utf8(s: str, max_bytes: int) -> str:
              # cutting can only damage the LAST character, and "ignore" drops that partial tail
              return s.encode("utf-8")[:max_bytes].decode("utf-8", errors="ignore")
        ` }],
        dry: { head: ['step', 'i', 'b[i] (hex)', 'b[i] &amp; 0xC0', 'decision'], rows: [
          ['start', '4', 'A9', '0x80', 'continuation → step back'],
          ['1', '3', 'C3', '0xC0', 'lead byte → cut here'],
          ['end', '3', '—', '—', '<span class="c-g">decode b[:3] → \'caf\'</span>']
        ] },
        complexity: R`<p>O(n) to encode, O(1) to find the boundary (at most 3 steps back), O(n) to decode. Extra space O(n) for the bytes.</p>`,
        followUps: ['Also avoid cutting a grapheme cluster like 👍🏽 in half', 'Add "…" when truncating while still fitting the limit', 'Do it for UTF-16 (surrogate pairs) instead']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4: Reading & writing files
     ====================================================================== */
  topics.push({
    title: 'Reading & Writing Files: open(), Modes, the Cursor & pathlib',
    analogy: R`<p>A file is a <b>notebook in a cupboard</b>. <code>open()</code> takes it out and puts a <b>bookmark</b> (the cursor) on a page. The <b>mode</b> is your intention: <code>"r"</code> read only, <code>"w"</code> <b>tear out every page</b> and start fresh, <code>"a"</code> always write on the last page, <code>"x"</code> "only if no notebook exists yet". Each read moves the bookmark forward; when it reaches the end, reading gives you an empty page (<code>""</code>). And you must put the notebook back (<code>close()</code>), or your last scribbles may never reach the cupboard.</p>`,
    explain: R`<p>🟢 <b>The one function you need:</b> <code>open(path, mode="r", encoding=None)</code> returns a <b>file object</b>.</p>
      ${H.table(['Mode', 'Meaning', 'If file exists', 'If missing'], [
        ['<code>"r"</code>', 'read text (default)', 'read from start', '<span class="c-r">FileNotFoundError</span>'],
        ['<code>"w"</code>', 'write text', '<span class="c-r">ERASED first</span>', 'created'],
        ['<code>"a"</code>', 'append text', 'writes go to the end', 'created'],
        ['<code>"x"</code>', 'exclusive create', '<span class="c-r">FileExistsError</span>', 'created'],
        ['add <code>"b"</code>', 'binary: bytes in/out, no encoding', '', ''],
        ['add <code>"+"</code>', 'read AND write (e.g. <code>"r+"</code>)', '', '']
      ])}
      <p><b>Reading text</b> (always pass <code>encoding="utf-8"</code>):</p>
      <ul>
        <li><code>f.read()</code> → the whole rest of the file as one str. Easy, but loads everything into memory.</li>
        <li><code>f.read(n)</code> → at most n characters (text mode) / n bytes (binary).</li>
        <li><code>f.readline()</code> → one line <b>including</b> its <code>"\n"</code>; returns <code>""</code> at end of file.</li>
        <li><code>f.readlines()</code> → list of all lines (again, all in memory).</li>
        <li><code>for line in f:</code> → <b>best for big files</b>: one line at a time, constant memory.</li>
      </ul>
      <p><b>Writing:</b> <code>f.write(s)</code> writes exactly <code>s</code> (no newline added!) and returns the number of characters written. <code>print(..., file=f)</code> adds the newline for you. <code>f.writelines(list_of_str)</code> also adds nothing between items.</p>
      <p><b>The cursor:</b> <code>f.tell()</code> tells where the bookmark is; <code>f.seek(0)</code> jumps back to the start (to read again).</p>
      <p>🔵 <b>pathlib</b> (modern, object-oriented paths): <code>from pathlib import Path</code>; <code>p = Path("data") / "report.txt"</code> builds paths with <code>/</code> on every OS; <code>p.read_text(encoding="utf-8")</code>, <code>p.write_text(...)</code>, <code>p.exists()</code>, <code>p.suffix</code>, <code>p.stem</code>, <code>p.parent</code>, <code>Path(".").glob("*.csv")</code>. For one-shot reads and writes, these are the cleanest code.</p>
      <p><b>Structured files:</b> use the standard library instead of splitting by hand: <code>csv</code> (quotes, commas inside fields) and <code>json</code> (<code>json.load(f)</code>, <code>json.dump(obj, f, indent=2)</code>).</p>`,
    clues: [
      '"process a 10 GB log file" → iterate <code>for line in f</code>, never <code>read()</code>',
      '"keep previous contents" → mode <code>"a"</code>, not <code>"w"</code>',
      '"don\'t overwrite if it exists" → mode <code>"x"</code>',
      '"images / zip / PDF / hashing" → binary mode <code>"rb"</code>/<code>"wb"</code>',
      '"lines have trailing newline characters" → <code>line.rstrip("\\n")</code> or <code>.strip()</code>',
      '"read it again" / "go back to start" → <code>f.seek(0)</code>',
      '"build paths that work on Windows and Linux" → <code>pathlib.Path</code> and the <code>/</code> operator'
    ],
    code: [{ lang: 'python', run: true, title: 'Write, append, read every way (runnable, uses a temp folder)', code: R`
      import tempfile
      from pathlib import Path

      with tempfile.TemporaryDirectory() as tmp:
          p = Path(tmp) / "fruits.txt"

          with open(p, "w", encoding="utf-8") as f:      # "w" creates or ERASES
              n = f.write("apple\nbanana\n")              # write adds NO newline itself
              print("wrote", n, "characters")
          with open(p, "a", encoding="utf-8") as f:      # "a" adds at the end
              print("cherry", file=f)                    # print adds "\n"

          with open(p, encoding="utf-8") as f:           # default mode is "r"
              print(repr(f.read(3)))     # 'app'      cursor now at 3
              print(repr(f.readline()))  # 'le\n'     rest of the current line
              print(f.tell())            # 6          (an opaque position marker)
              print(f.readlines())       # ['banana\n', 'cherry\n']
              print(repr(f.read()))      # ''         at EOF reads return ""
              f.seek(0)                  # back to the start
              for i, line in enumerate(f, start=1):   # memory-friendly loop
                  print(i, line.rstrip("\n"))

          print(p.read_text(encoding="utf-8").splitlines())   # pathlib one-liner
          print(p.name, p.stem, p.suffix, p.exists())
          try:
              open(Path(tmp) / "missing.txt", encoding="utf-8")
          except FileNotFoundError as e:
              print("FileNotFoundError:", e.strerror)
    ` }],
    codeTitle: ['Files end to end'],
    viz: {
      title: 'The file cursor: watch each read move the bookmark',
      input: 'apple\\nbanana\\ncherry\\n',
      inputLabel: 'File contents (ASCII, write \\n for a newline, up to 40 characters)',
      gen: function (input) {
        var raw = String(input === undefined ? 'apple\\nbanana\\ncherry\\n' : input);
        var text = raw.replace(/\\n/g, '\n');
        if (!text.length || text.length > 40) throw new Error('Type 1 to 40 characters (\\n counts as one)');
        if (/[^\x0a\x20-\x7e]/.test(text)) throw new Error('Use plain ASCII letters, digits, spaces and \\n');
        var cells = Array.from(text).map(show).concat(['EOF']);
        var n = text.length, pos = 0, frames = [];
        var code = 'f = open("data.txt", encoding="utf-8")\na = f.read(3)\nb = f.readline()\nt = f.tell()\nc = f.readline()\nd = f.read()\ne = f.read()\nf.seek(0)\nrest = f.readlines()\nf.close()';
        var vals = {};
        function frame(line, narr, from, to, valName, val) {
          var hl = {}, ptr = {};
          for (var i = 0; i < from; i++) hl[i] = 'done';
          for (var j = from; j < to; j++) hl[j] = 'ok';
          ptr[Math.min(pos, n)] = 'cursor';
          if (valName) vals[valName] = val;
          var vh = {}; if (valName) vh[valName] = 'ok';
          var cv = {}; Object.keys(vals).forEach(function (k) { cv[k] = vals[k]; });
          cv['f.tell()'] = pos;
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'Program', lang: 'python', code: code, hl: (function () { var h = {}; h[line] = 'cur'; return h; })() },
            { type: 'array', label: 'data.txt (⏎ = newline character; grey = already read, green = just read)', values: cells, hl: hl, ptr: ptr },
            { type: 'vars', label: 'Variables', vals: cv, hl: vh }
          ] });
        }
        frame(1, '<code>open()</code> puts the cursor at position <b>0</b>, the very first character. Nothing has been read yet. The file is ' + n + ' characters long.', 0, 0);
        var s = pos, e = Math.min(n, pos + 3); pos = e;
        frame(2, '<code>read(3)</code> takes up to 3 characters from the cursor and moves the cursor past them.', s, e, 'a', pyRepr(text.slice(s, e)));
        s = pos; var nl = text.indexOf('\n', pos); e = nl < 0 ? n : nl + 1; pos = e;
        frame(3, '<code>readline()</code> reads from the cursor up to and <b>including</b> the next <code>\\n</code>. Because we already ate 3 characters, we only get the <b>rest</b> of the first line — a classic surprise.', s, e, 'b', pyRepr(text.slice(s, e)));
        frame(4, '<code>tell()</code> reports where the cursor is: <b>' + pos + '</b>. (For text files the number is an opaque marker you should only pass back to <code>seek()</code>; for ASCII it equals the byte offset.)', pos, pos, 't', pos);
        s = pos; nl = text.indexOf('\n', pos); e = s >= n ? n : nl < 0 ? n : nl + 1; pos = e;
        frame(5, s >= n ? 'Cursor is at the end, so <code>readline()</code> returns <code>\'\'</code>: the empty string is how Python says "end of file".' : '<code>readline()</code> again: the next full line, newline included.', s, e, 'c', pyRepr(text.slice(s, e)));
        s = pos; e = n; pos = n;
        frame(6, '<code>read()</code> with no number reads <b>everything that is left</b>. ' + (s < n ? 'The cursor jumps to EOF.' : 'Nothing is left, so we get \'\'.'), s, e, 'd', pyRepr(text.slice(s, e)));
        frame(7, 'Reading at EOF never raises an error; it just returns <code>\'\'</code>. Loops use this: <code>while chunk := f.read(4096):</code> stops when the empty string (falsy) comes back.', n, n, 'e', "''");
        pos = 0;
        frame(8, '<code>seek(0)</code> moves the bookmark back to the start. The file content is unchanged; only the cursor moved.', 0, 0, null);
        var lines = text.match(/[^\n]*\n|[^\n]+$/g) || [];
        pos = n;
        frame(9, '<code>readlines()</code> returns a <b>list</b> of every remaining line, each keeping its <code>\\n</code>. Easy, but the whole file sits in memory; for big files prefer <code>for line in f</code>.', 0, n, 'rest', '[' + lines.map(pyRepr).join(', ') + ']');
        frame(10, '<code>close()</code> flushes buffers and releases the OS file handle. Any read after this raises <code>ValueError: I/O operation on closed file</code>. Next topic: <code>with</code> does this for you automatically.', n, n, null);
        return frames;
      }
    },
    examples: [
      { title: 'Counting lines, words and characters of a big file in constant memory', html: R`<p>Iterating the file object yields one line at a time from a buffer, so even a 50 GB log uses only a few KB of RAM. This is the <code>wc</code> command in five lines.</p>`, code: { lang: 'python', run: true, code: R`
        import tempfile, os
        fd, path = tempfile.mkstemp(suffix=".log")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            for i in range(1000):
                f.write(f"request {i} took {i % 7} ms\n")
        lines = words = chars = 0
        with open(path, encoding="utf-8") as f:
            for line in f:                  # one line at a time
                lines += 1
                words += len(line.split())
                chars += len(line)
        print(lines, words, chars)
        os.remove(path)
      ` } },
      { title: '"w" silently erases: a costly mistake', html: R`<p>Opening an existing file with <code>"w"</code> truncates it to zero length <b>immediately</b>, even if you never write anything. Use <code>"a"</code> to add, <code>"x"</code> to refuse overwriting, and back up important files before rewriting.</p>`, code: { lang: 'python', run: true, code: R`
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "important.txt"
            p.write_text("years of data\n", encoding="utf-8")
            with open(p, "w", encoding="utf-8"):
                pass                                   # wrote nothing...
            print(repr(p.read_text(encoding="utf-8")))  # ''  ...data is gone
            try:
                open(p, "x")
            except FileExistsError:
                print("x mode refuses to overwrite an existing file")
      ` } },
      { title: 'CSV and JSON: let the library handle quoting', html: R`<p>A naive <code>line.split(",")</code> breaks on <code>"Pune, India"</code>. The <code>csv</code> module understands quotes. Open CSV files with <code>newline=""</code> (the csv docs require it so embedded newlines and \r\n are handled correctly).</p>`, code: { lang: 'python', run: true, code: R`
        import csv, json, tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as tmp:
            c = Path(tmp) / "people.csv"
            with open(c, "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["name", "city"])
                w.writerow(["Asha", "Pune, India"])      # comma inside a field
            with open(c, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            print(rows)                                  # [{'name': 'Asha', 'city': 'Pune, India'}]
            j = Path(tmp) / "people.json"
            with open(j, "w", encoding="utf-8") as f:
                json.dump(rows, f, indent=2, ensure_ascii=False)
            with open(j, encoding="utf-8") as f:
                print(json.load(f)[0]["city"])
      ` } },
      { title: 'Binary mode: copying a file in chunks', html: R`<p>For non-text data use <code>"rb"</code>/<code>"wb"</code>: you get <code>bytes</code>, no decoding, no newline translation. Reading fixed-size chunks with the walrus operator keeps memory flat. (In real code, <code>shutil.copyfile</code> does this for you.)</p>`, code: { lang: 'python', run: true, code: R`
        import os, tempfile
        with tempfile.TemporaryDirectory() as tmp:
            src, dst = os.path.join(tmp, "a.bin"), os.path.join(tmp, "b.bin")
            with open(src, "wb") as f:
                f.write(bytes(range(256)) * 100)          # 25,600 bytes
            copied = 0
            with open(src, "rb") as fin, open(dst, "wb") as fout:
                while chunk := fin.read(4096):            # b"" at EOF is falsy
                    fout.write(chunk)
                    copied += len(chunk)
            print(copied, os.path.getsize(dst))
      ` } }
    ],
    deepDive: R`<p>🟣 <b>The layers inside a file object.</b> <code>open(p, "r", encoding="utf-8")</code> actually builds a stack: <code>FileIO</code> (raw OS file descriptor, real <code>read()</code>/<code>write()</code> system calls) → <code>BufferedReader</code>/<code>BufferedWriter</code> (an in-memory buffer, typically 8 KB or the disk's block size, so tiny reads do not each become a system call) → <code>TextIOWrapper</code> (decodes bytes to str and translates newlines). You can see it: <code>f.buffer</code> and <code>f.buffer.raw</code>.</p>
      <ul>
        <li><b>Buffering means delay:</b> <code>write()</code> usually only copies into memory. Data reaches the OS on <code>flush()</code>, <code>close()</code>, or when the buffer fills. Even then it is in the OS page cache; <code>os.fsync(f.fileno())</code> asks the disk to persist it (needed for databases and crash safety).</li>
        <li><b>Universal newlines:</b> in text mode, reading converts <code>\r\n</code> and <code>\r</code> to <code>\n</code>; writing converts <code>\n</code> to <code>os.linesep</code> (<code>\r\n</code> on Windows). <code>newline=""</code> turns translation off, which <code>csv</code> requires.</li>
        <li><b>tell() in text mode</b> returns an opaque "cookie" (it encodes decoder state), so do not do arithmetic on it; <code>seek()</code> in text mode only accepts 0 or a value from <code>tell()</code>. Binary files support arbitrary <code>seek(offset, whence)</code>.</li>
        <li><b>Atomic writes:</b> to replace a config file safely, write to a temp file in the same directory, flush + fsync, then <code>os.replace(tmp, final)</code>. Readers see either the old or the new file, never a half-written one.</li>
        <li><b>Resource limits:</b> each open file uses an OS file descriptor; processes have limits (often 1024 on Linux, <code>ulimit -n</code>). Leaking handles in a long-running server eventually causes <code>OSError: [Errno 24] Too many open files</code>.</li>
        <li><b>Huge files:</b> line iteration or chunked reads are O(1) memory; <code>mmap</code> lets you treat a file like a bytes object without loading it; for columnar data use specialised formats (Parquet) rather than text.</li>
      </ul>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> file-handling boilerplate (open, parse CSV, write JSON) is exactly what assistants generate perfectly most of the time. Agents also read and write files for you directly, so knowing modes and encodings helps you review what they did.</p>
      <p><b>Use AI as a partner:</b> ask "convert this 2 GB CSV to JSON lines with constant memory" and check that the answer streams line by line instead of calling <code>read()</code> or <code>pandas.read_csv</code> without chunks.</p>
      <p><b>Where AI goes wrong:</b> missing <code>encoding="utf-8"</code> (works on the author's Mac, breaks on a Windows server), <code>"w"</code> where <code>"a"</code> was needed, forgetting <code>newline=""</code> for csv (blank lines between rows on Windows), reading whole files into memory, and non-atomic writes of important files. It may also hallucinate paths: always check they exist with <code>Path.exists()</code>.</p>
      <p><b>What you must still own:</b> the memory and durability story (streaming, flush vs fsync, atomic replace) and the safety story — never let user input choose a path without validating it (path traversal like <code>../../etc/passwd</code>).</p>`,
    problems: [{
      title: 'Word Count Report from a File (wc clone)',
      level: 'Easy', tags: ['files', 'iteration', 'strings'], companies: ['Amazon', 'Infosys', 'Zoho'],
      statement: R`<p>Write <code>wc(path)</code> that returns a tuple <code>(lines, words, chars, longest_line)</code> for a UTF-8 text file: number of lines, number of whitespace-separated words, number of characters (including newlines), and the longest line's text without its trailing newline. It must work for files larger than memory.</p>`,
      constraints: R`File size up to 10<sup>10</sup> bytes; lines up to 10<sup>5</sup> characters; the file may be empty or may not end with a newline.`,
      example: R`<p>File content <code>"to be\nor not to be\n"</code> → ${H.c('g', "(2, 6, 19, 'or not to be')")}: 2 lines, words to/be/or/not/to/be = 6, characters 6 + 13 = 19.</p>`,
      brute: {
        why: R`<p>Read everything with <code>f.read()</code>, then <code>split</code> it several times. It is short, but holds the whole file (and several copies of it) in memory: a 10 GB file crashes the program.</p>`,
        code: { lang: 'python', run: true, code: R`
          import tempfile, os
          def wc_brute(path):
              with open(path, encoding="utf-8") as f:
                  text = f.read()                      # whole file in RAM
              lines = text.splitlines()
              longest = max(lines, key=len) if lines else ""
              return (len(lines), len(text.split()), len(text), longest)

          fd, p = tempfile.mkstemp()
          with os.fdopen(fd, "w", encoding="utf-8") as f:
              f.write("to be\nor not to be\n")
          print(wc_brute(p))
          os.remove(p)
        ` }
      },
      mcq: { q: 'Which loop reads a huge file with constant memory?', options: ['<code>for line in f:</code>', '<code>for line in f.readlines():</code>', '<code>for line in f.read().split("\\n"):</code>', '<code>lines = list(f)</code>'], answer: 0, explain: 'Iterating the file object pulls one line at a time from an internal buffer. readlines(), read() and list(f) all materialise the entire file first.' },
      hints: [
        R`<p>Hint 1: A file object is an iterator of lines; you only ever need the current line plus a few counters.</p>`,
        R`<p>Hint 2: <code>len(line)</code> counts the newline too (what wc counts); <code>len(line.split())</code> counts words.</p>`,
        R`<p>Hint 3: Track the longest line using <code>line.rstrip("\n")</code>. Empty file → (0, 0, 0, ""). A last line without a newline still counts as a line here.</p>`
      ],
      solution: {
        approach: R`<p>Stream the file line by line, updating four running values. Memory is O(longest line) regardless of file size.</p>`,
        code: { lang: 'python', run: true, code: R`
          import os, tempfile

          def wc(path):
              lines = words = chars = 0
              longest = ""
              with open(path, encoding="utf-8") as f:
                  for line in f:                       # streaming: one line in memory
                      lines += 1
                      words += len(line.split())
                      chars += len(line)
                      body = line.rstrip("\n")
                      if len(body) > len(longest):
                          longest = body
              return lines, words, chars, longest

          fd, p = tempfile.mkstemp()
          with os.fdopen(fd, "w", encoding="utf-8") as f:
              f.write("to be\nor not to be\n")
          print(wc(p))                                  # (2, 6, 19, 'or not to be')
          open(p, "w").close()                          # make it empty
          print(wc(p))                                  # (0, 0, 0, '')
          os.remove(p)
        ` },
        dry: { head: ['line (repr)', 'lines', 'words', 'chars', 'longest'], rows: [
          ["'to be\\n'", '1', '2', '6', "'to be'"],
          ["'or not to be\\n'", '2', '6', '19', "'or not to be'"],
          ['(EOF)', '2', '6', '19', '<span class="c-g">return</span>']
        ] },
        complexity: R`<p>Time O(total characters). Memory O(longest line) — independent of file size.</p>`,
        followUps: ['Also report the 10 most common words (collections.Counter)', 'Count bytes instead of characters (open in "rb")', 'Process several files and print a total line like the real wc']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5: The with statement and context managers
     ====================================================================== */
  topics.push({
    title: 'The with Statement: Guaranteed Cleanup (Context Managers)',
    analogy: R`<p>A hotel <b>keycard that checks you out automatically</b>. However you leave the room — calmly through the door, or running because the fire alarm went off — the system notices you left and does the checkout. <code>with open(...) as f:</code> is that keycard: the moment execution leaves the indented block, <b>for any reason</b> (normal end, <code>return</code>, <code>break</code>, or an exception), the file is closed for you.</p>`,
    explain: R`<p>🟢 <b>Why closing matters.</b> Until a file is closed, written data may still be sitting in a memory buffer (not on disk), the OS file handle stays in use (servers run out of them), and on Windows other programs may be locked out of the file.</p>
      <p><b>The manual way</b> needs <code>try/finally</code> to be safe, because an exception would skip a plain <code>f.close()</code>:</p>
      <pre>f = open("log.txt", "a", encoding="utf-8")
try:
    f.write("started\n")
    risky()                 # might raise
finally:
    f.close()               # runs no matter what</pre>
      <p><b>The with way</b> says the same thing in two lines and cannot be forgotten:</p>
      <pre>with open("log.txt", "a", encoding="utf-8") as f:
    f.write("started\n")
    risky()
# here f is closed, even if risky() raised</pre>
      <p>🔵 <b>What actually happens</b> (the context-manager protocol):</p>
      <ol>
        <li>Python evaluates <code>open(...)</code> → a file object (the <b>context manager</b>).</li>
        <li>It calls its <code>__enter__()</code>; the return value is bound to the name after <code>as</code> (for files, the file itself).</li>
        <li>The block runs.</li>
        <li>On the way out it calls <code>__exit__(exc_type, exc_value, traceback)</code> — with three <code>None</code>s if all went well, or the exception details if not. The file's <code>__exit__</code> closes it.</li>
        <li>If <code>__exit__</code> returns something falsy (files do), the exception keeps propagating. <b>with cleans up; it does not swallow errors.</b></li>
      </ol>
      <p><b>Several resources at once:</b> <code>with open(a) as src, open(b, "w") as dst:</code> — and since Python 3.10 you may wrap them in parentheses over several lines. They are closed in reverse order.</p>
      <p><b>Not just files:</b> locks (<code>with lock:</code>), database transactions, temporary directories (<code>tempfile.TemporaryDirectory()</code>), changing directory (<code>contextlib.chdir</code>, 3.11+), ignoring specific errors (<code>contextlib.suppress</code>), and your own via <code>@contextlib.contextmanager</code>. (Writing full context-manager classes is covered in depth in the Iterators &amp; Context Managers module.)</p>`,
    clues: [
      '"make sure the file is always closed" / "even if an error occurs" → <code>with</code>',
      '"ResourceWarning: unclosed file" in test output → a file opened without <code>with</code>',
      '"too many open files" in production → leaked handles; wrap opens in <code>with</code>',
      '"read one file and write another" → one <code>with</code> statement with two managers',
      '"temporarily change something and restore it" → write a small context manager',
      '"ignore FileNotFoundError when deleting" → <code>with contextlib.suppress(FileNotFoundError):</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'with closes files on success AND on error (runnable)', code: R`
      import contextlib, os, tempfile, time

      tmp = tempfile.mkdtemp()
      path = os.path.join(tmp, "notes.txt")

      with open(path, "w", encoding="utf-8") as f:
          f.write("line 1\n")
          print("inside block, closed?", f.closed)    # False
      print("after block, closed?", f.closed)         # True

      try:
          with open(path, "a", encoding="utf-8") as f:
              f.write("line 2\n")
              1 / 0                                    # boom
      except ZeroDivisionError:
          print("error propagated, but closed?", f.closed)   # True
      print(open(path, encoding="utf-8").read().splitlines())  # line 2 was flushed too

      # two resources in one statement (parenthesised form is 3.10+)
      copy = os.path.join(tmp, "copy.txt")
      with (
          open(path, encoding="utf-8") as src,
          open(copy, "w", encoding="utf-8") as dst,
      ):
          for line in src:
              dst.write(line.upper())
      with open(copy, encoding="utf-8") as f:
          print(f.read().split())

      # stdlib helpers
      with contextlib.suppress(FileNotFoundError):
          os.remove(os.path.join(tmp, "does-not-exist"))   # silently ignored
      print("suppress worked")

      @contextlib.contextmanager
      def timer(label):
          start = time.perf_counter()
          try:
              yield                       # the with-block runs here
          finally:
              print(f"{label}: {time.perf_counter() - start:.4f}s")

      with timer("summing"):
          total = sum(range(100_000))
      print(total)

      for name in os.listdir(tmp):
          os.remove(os.path.join(tmp, name))
      os.rmdir(tmp)
    ` }],
    codeTitle: ['with in practice'],
    viz: {
      title: 'Inside a with block: __enter__, body, __exit__',
      input: 'error',
      inputLabel: 'Type ok (block finishes normally) or error (block raises)',
      gen: function (input) {
        var mode = String(input === undefined ? 'error' : input).trim().toLowerCase();
        if (mode !== 'ok' && mode !== 'error') throw new Error('Type ok or error');
        var err = mode === 'error';
        var code = 'try:\n    with open("notes.txt", "w", encoding="utf-8") as f:\n        f.write("line 1\\n")\n        ' + (err ? 'x = 1 / 0' : 'f.write("line 2\\n")') + '\n        f.write("never?\\n")\n    print("after with")\nexcept ZeroDivisionError:\n    print("handled")\nprint("closed:", f.closed)';
        if (!err) code = code.replace('f.write("never?\\n")', 'f.write("done\\n")');
        var S = [];
        S.push({ l: 2, n: 'Python evaluates <code>open(...)</code>. Mode <code>"w"</code> creates (or empties) notes.txt and returns a file object. That object is a <b>context manager</b>: it has <code>__enter__</code> and <code>__exit__</code>.', cs: ['<module>'], v: { 'file object': 'open, cursor 0', 'buffer (RAM)': "''", 'disk notes.txt': "'' (empty)" }, vh: { 'file object': 'ok' }, o: '' });
        S.push({ l: 2, n: 'Python calls <code>__enter__()</code>. For files it simply returns the file itself, which gets the name <code>f</code> (the part after <code>as</code>).', cs: ['<module>', 'file.__enter__()'], v: { f: 'file object (open)', 'buffer (RAM)': "''", 'disk notes.txt': "''" }, vh: { f: 'ok' }, o: '' });
        S.push({ l: 3, n: '<code>f.write("line 1\\n")</code> copies text into the <b>buffer in memory</b>. It is NOT on disk yet — that is why closing matters.', cs: ['<module>'], v: { f: 'open', 'buffer (RAM)': "'line 1\\n'", 'disk notes.txt': "''" }, vh: { 'buffer (RAM)': 'ok' }, o: '' });
        if (err) {
          S.push({ l: 4, c: 'bad', n: '<code>1 / 0</code> raises <b>ZeroDivisionError</b>. Normal flow stops. Line 5 will never run. Without <code>with</code>, a later <code>f.close()</code> would be skipped too.', cs: ['<module>'], v: { f: 'open', 'buffer (RAM)': "'line 1\\n'", 'disk notes.txt': "''", exception: 'ZeroDivisionError' }, vh: { exception: 'bad' }, o: '' });
          S.push({ l: 2, n: 'Leaving the block (because of the exception), Python calls <code>__exit__(ZeroDivisionError, err, traceback)</code>. The file\'s __exit__ <b>flushes</b> the buffer to disk and <b>closes</b> the file.', cs: ['<module>', 'file.__exit__(exc_type, exc, tb)'], v: { f: 'CLOSED', 'buffer (RAM)': "'' (flushed)", 'disk notes.txt': "'line 1\\n'", exception: 'ZeroDivisionError' }, vh: { f: 'ok', 'disk notes.txt': 'ok' }, o: '' });
          S.push({ l: 2, n: '__exit__ returns a falsy value, which means "I did not handle the error". So the exception <b>keeps propagating</b> out of the with statement. <code>with</code> guarantees cleanup; it does not hide errors.', cs: ['<module>'], v: { f: 'CLOSED', exception: 'ZeroDivisionError (propagating)' }, vh: { exception: 'bad' }, o: '' });
          S.push({ l: [7, 8], n: 'The surrounding <code>except ZeroDivisionError</code> catches it and prints "handled". Line 6 ("after with") was skipped because the exception jumped past it.', cs: ['<module>'], v: { f: 'CLOSED', 'disk notes.txt': "'line 1\\n'" }, o: 'handled' });
          S.push({ l: 9, c: 'ok', n: 'The name <code>f</code> still exists after the block (with does not delete names), but the file is closed: <code>f.closed</code> is True. Any further <code>f.write</code> would raise <code>ValueError: I/O operation on closed file</code>.', cs: ['<module>'], v: { f: 'CLOSED', 'f.closed': 'True', 'disk notes.txt': "'line 1\\n'" }, vh: { 'f.closed': 'ok' }, o: 'handled\nclosed: True' });
        } else {
          S.push({ l: 4, n: 'Another write goes into the buffer.', cs: ['<module>'], v: { f: 'open', 'buffer (RAM)': "'line 1\\nline 2\\n'", 'disk notes.txt': "''" }, vh: { 'buffer (RAM)': 'ok' }, o: '' });
          S.push({ l: 5, n: 'The last line of the block runs. The block is about to end normally.', cs: ['<module>'], v: { f: 'open', 'buffer (RAM)': "'line 1\\nline 2\\ndone\\n'", 'disk notes.txt': "''" }, vh: { 'buffer (RAM)': 'ok' }, o: '' });
          S.push({ l: 2, n: 'Normal exit: Python calls <code>__exit__(None, None, None)</code> — three Nones mean "no exception". The file flushes its buffer to disk and closes.', cs: ['<module>', 'file.__exit__(None, None, None)'], v: { f: 'CLOSED', 'buffer (RAM)': "'' (flushed)", 'disk notes.txt': "'line 1\\nline 2\\ndone\\n'" }, vh: { 'disk notes.txt': 'ok', f: 'ok' }, o: '' });
          S.push({ l: 6, n: 'Execution continues after the with statement. The except clause is skipped because nothing was raised.', cs: ['<module>'], v: { f: 'CLOSED' }, o: 'after with' });
          S.push({ l: 9, c: 'ok', n: 'The name <code>f</code> survives the block, but <code>f.closed</code> is True. Same guarantee in both paths: that is the whole point of with.', cs: ['<module>'], v: { f: 'CLOSED', 'f.closed': 'True' }, vh: { 'f.closed': 'ok' }, o: 'after with\nclosed: True' });
        }
        return steps(code, S, { varLabel: 'Names, buffer and disk' });
      }
    },
    examples: [
      { title: 'with vs try/finally — exactly equivalent cleanup', html: R`<p>Both versions close the file whether or not <code>process</code> raises. The with version is shorter and impossible to get subtly wrong (for example, calling <code>close()</code> on a name that was never assigned because <code>open</code> itself failed).</p>${H.table(['', 'try/finally', 'with'], [['lines', '6', '2'], ['open() fails', 'must place open BEFORE try', 'handled naturally'], ['readability', 'cleanup far from setup', 'cleanup tied to setup']])}`, code: { lang: 'python', run: true, code: R`
        import io
        def process(f):
            return f.read().upper()

        f = io.StringIO("hello")          # file-like object in memory
        try:
            print(process(f))
        finally:
            f.close()

        with io.StringIO("hello") as g:
            print(process(g))
        print(f.closed, g.closed)         # True True
      ` } },
      { title: 'return from inside a with still closes', html: R`<p>Leaving the block with <code>return</code> (or <code>break</code>/<code>continue</code> in a loop) triggers <code>__exit__</code> too. So it is safe to return early from inside the block.</p>`, code: { lang: 'python', run: true, code: R`
        import io
        def first_error(f):
            with f:
                for line in f:
                    if "ERROR" in line:
                        return line.strip()     # __exit__ runs before returning
            return None

        log = io.StringIO("ok\nERROR disk full\nok\n")
        print(first_error(log), log.closed)     # ERROR disk full True
      ` } },
      { title: 'Your own tiny context manager with @contextmanager', html: R`<p>The code before <code>yield</code> is the "enter", the code after (put it in <code>finally</code>) is the "exit". Here we temporarily change a setting and always restore it.</p>`, code: { lang: 'python', run: true, code: R`
        from contextlib import contextmanager

        settings = {"debug": False}

        @contextmanager
        def debug_mode():
            old = settings["debug"]
            settings["debug"] = True          # enter
            try:
                yield settings
            finally:
                settings["debug"] = old       # exit: always restore

        with debug_mode() as s:
            print("inside:", s["debug"])      # True
        print("outside:", settings["debug"])  # False
      ` } },
      { title: 'Predict the output: what reaches the disk?', html: R`<p>The block writes "A", raises, and the exception is caught outside. Because <code>__exit__</code> flushes before closing, the file contains <code>A</code> — the write before the error is NOT lost, and "B" never happens.</p>`, code: { lang: 'python', run: true, code: R`
        import os, tempfile
        p = os.path.join(tempfile.mkdtemp(), "t.txt")
        try:
            with open(p, "w", encoding="utf-8") as f:
                f.write("A")
                raise RuntimeError("stop")
                f.write("B")
        except RuntimeError as e:
            print("caught:", e)
        with open(p, encoding="utf-8") as f:
            print(repr(f.read()))   # 'A'
        os.remove(p)
      ` } }
    ],
    deepDive: R`<p>🟣 <b>Precise semantics.</b> <code>with EXPR as VAR: BLOCK</code> is roughly:</p>
      <pre>mgr = EXPR
enter = type(mgr).__enter__      # looked up on the TYPE, not the instance
exit_ = type(mgr).__exit__
value = enter(mgr)
try:
    VAR = value
    BLOCK
except BaseException as e:
    if not exit_(mgr, type(e), e, e.__traceback__):
        raise                    # falsy return -> re-raise
else:
    exit_(mgr, None, None, None)</pre>
      <ul>
        <li><b>Swallowing:</b> if <code>__exit__</code> returns a truthy value the exception is suppressed. <code>contextlib.suppress</code> works exactly this way. Doing it accidentally (returning True by mistake) hides bugs.</li>
        <li><b>__enter__ failure:</b> if <code>__enter__</code> raises, <code>__exit__</code> is <b>not</b> called — the resource was never acquired.</li>
        <li><b>Why files work without with in CPython (usually):</b> reference counting closes a file as soon as the last reference disappears. But that is an implementation detail: PyPy uses a tracing GC and may keep files open for a long time, exceptions keep frames (and files) alive via tracebacks, and tests show <code>ResourceWarning</code>. Always use with.</li>
        <li><b>ExitStack:</b> <code>contextlib.ExitStack</code> manages a <b>dynamic</b> number of resources (e.g. open N files from a list) and unwinds them in reverse order, even if opening the 7th fails.</li>
        <li><b>async with:</b> asynchronous managers use <code>__aenter__</code>/<code>__aexit__</code> (database connections, HTTP sessions in asyncio code).</li>
        <li><b>Closed-but-referenced:</b> the <code>as</code> variable survives the block; using it afterwards raises <code>ValueError: I/O operation on closed file</code>. A common bug is returning the file object from inside a with and reading it outside.</li>
      </ul>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> modern assistants and linters (ruff SIM115, pylint R1732 "consider-using-with") nearly always emit <code>with</code> for files, so reviews increasingly focus on the less obvious resources: locks, DB sessions, HTTP clients, temporary directories.</p>
      <p><b>Use AI as a partner:</b> ask "list every resource in this file that is acquired without a context manager" — AI is good at scanning for <code>open(</code>, <code>connect(</code>, <code>Lock()</code>, <code>acquire()</code> patterns across a codebase.</p>
      <p><b>Where AI goes wrong:</b> returning a file object from inside a with block (closed on arrival), writing <code>@contextmanager</code> without <code>try/finally</code> around the <code>yield</code> (cleanup skipped when the body raises), and returning True from a custom <code>__exit__</code> which silently swallows exceptions.</p>
      <p><b>What you must still own:</b> explaining the enter/exit protocol, knowing that exceptions propagate, and designing APIs so that cleanup is automatic — the skill interviewers test with "how would you make sure X is always released?"</p>`,
    problems: [{
      title: 'Merge Files with Headers (two context managers)',
      level: 'Medium', tags: ['with', 'files', 'context managers'], companies: ['Microsoft', 'Oracle', 'Freshworks'],
      statement: R`<p>Write <code>merge(paths, out_path)</code> that writes every input file into one output file. Before each file's content write a header line <code>==&gt; name &lt;==</code> (just the file name). Make sure every file is closed even if one of the inputs is missing; in that case write <code>[missing]</code> under its header and continue. Return the number of files merged successfully.</p>`,
      constraints: R`1 ≤ len(paths) ≤ 1000; files are UTF-8; individual files may be larger than memory.`,
      example: R`<p>Inputs <code>a.txt</code> = <code>"x\n"</code>, <code>nope.txt</code> missing, <code>b.txt</code> = <code>"y\n"</code> → output:<br><code>==&gt; a.txt &lt;==</code> / <code>x</code> / <code>==&gt; nope.txt &lt;==</code> / ${H.c('r', '[missing]')} / <code>==&gt; b.txt &lt;==</code> / <code>y</code>. Return ${H.c('g', '2')}.</p>`,
      brute: {
        why: R`<p>Opening each file with plain <code>open()</code> and calling <code>close()</code> at the end leaks handles whenever an exception happens between them; and reading each file fully with <code>read()</code> breaks on huge inputs. It "works" on the happy path only.</p>`,
        code: { lang: 'python', run: true, code: R`
          import os, tempfile
          def merge_brute(paths, out_path):
              out = open(out_path, "w", encoding="utf-8")
              count = 0
              for p in paths:
                  out.write(f"==> {os.path.basename(p)} <==\n")
                  f = open(p, encoding="utf-8")       # raises on missing file -> out never closed
                  out.write(f.read())                 # whole file in memory
                  f.close()
                  count += 1
              out.close()
              return count

          d = tempfile.mkdtemp()
          a = os.path.join(d, "a.txt")
          with open(a, "w", encoding="utf-8") as f:
              f.write("x\n")
          print(merge_brute([a], os.path.join(d, "out.txt")))
        ` }
      },
      mcq: { q: 'An input file is missing. Where should you catch FileNotFoundError?', options: ['Around the open() of that one input, inside the loop', 'Around the whole function', 'Nowhere: let the program crash', 'Inside __exit__'], answer: 0, explain: 'Catch it per file so the loop can write [missing] and continue. The outer with on the output file still guarantees it is closed whatever happens.' },
      hints: [
        R`<p>Hint 1: One outer <code>with open(out_path, "w")</code> for the output, and one inner <code>with open(p)</code> per input.</p>`,
        R`<p>Hint 2: Wrap only the inner open in <code>try/except FileNotFoundError</code>. Use <code>os.path.basename</code> (or <code>Path(p).name</code>) for the header.</p>`,
        R`<p>Hint 3: Stream: <code>for line in src: dst.write(line)</code> (or <code>shutil.copyfileobj(src, dst)</code>). If a file does not end in "\n", add one so the next header starts on a new line.</p>`
      ],
      solution: {
        approach: R`<p>Nested context managers: the output stays open for the whole job; each input lives only inside its own with. Exceptions for a single missing input are handled locally; any other error still closes everything on the way out.</p>`,
        code: { lang: 'python', run: true, code: R`
          import os, tempfile
          from pathlib import Path

          def merge(paths, out_path) -> int:
              merged = 0
              with open(out_path, "w", encoding="utf-8") as dst:
                  for p in paths:
                      dst.write(f"==> {Path(p).name} <==\n")
                      try:
                          with open(p, encoding="utf-8") as src:
                              last = ""
                              for line in src:          # streaming copy
                                  dst.write(line)
                                  last = line
                              if last and not last.endswith("\n"):
                                  dst.write("\n")       # keep headers on their own line
                          merged += 1
                      except FileNotFoundError:
                          dst.write("[missing]\n")
              return merged

          d = Path(tempfile.mkdtemp())
          (d / "a.txt").write_text("x\n", encoding="utf-8")
          (d / "b.txt").write_text("y", encoding="utf-8")       # no trailing newline
          n = merge([d / "a.txt", d / "nope.txt", d / "b.txt"], d / "out.txt")
          print(n)
          print((d / "out.txt").read_text(encoding="utf-8"))
        ` },
        dry: { head: ['path', 'header written', 'inner with', 'merged'], rows: [
          ['a.txt', '==&gt; a.txt &lt;==', 'opened, copied "x\\n", closed', '1'],
          ['nope.txt', '==&gt; nope.txt &lt;==', '<span class="c-r">FileNotFoundError</span> → write [missing]', '1'],
          ['b.txt', '==&gt; b.txt &lt;==', 'copied "y", added "\\n", closed', '2'],
          ['end', '—', 'outer with closes out.txt', '<span class="c-g">return 2</span>']
        ] },
        complexity: R`<p>O(total bytes) time, O(longest line) memory; at most two files open at any moment.</p>`,
        followUps: ['Open all inputs at once with contextlib.ExitStack — when is that useful?', 'Make the output write atomic (temp file + os.replace)', 'Merge sorted log files by timestamp with heapq.merge']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6: Modules and how import finds them
     ====================================================================== */
  function importGen(input) {
    var name = String(input === undefined ? 'helpers' : input).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,20}$/.test(name)) throw new Error('Type a module name such as helpers, json, requests, sys or random');
    var where = { helpers: 'P0', json: 'STD', os: 'STD', random: 'STD', pathlib: 'STD', csv: 'STD', requests: 'SITE', numpy: 'SITE', rich: 'SITE', sys: 'BUILTIN', builtins: 'BUILTIN', math: 'STD' }[name] || 'NONE';
    var fileFor = { P0: '/home/me/app/' + name + '.py', STD: '/usr/lib/python3.13/' + name + (name === 'json' ? '/__init__.py' : name === 'math' ? '.cpython-313-x86_64-linux-gnu.so (lib-dynload)' : '.py'), SITE: '/home/me/app/.venv/lib/python3.13/site-packages/' + name + '/__init__.py', BUILTIN: '(compiled into the interpreter)' }[where];
    var nodes = [
      { id: 'M', label: 'main.py: import ' + name, x: 10, y: 8, shape: 'box', w: 26 },
      { id: 'C', label: 'sys.modules cache', x: 45, y: 8, shape: 'box', w: 22 },
      { id: 'B', label: 'built-in modules', x: 82, y: 8, shape: 'box', w: 22 },
      { id: 'P0', label: 'sys.path[0] script folder', x: 12, y: 36, shape: 'box', w: 22 },
      { id: 'PP', label: 'PYTHONPATH', x: 35, y: 36, shape: 'box', w: 16 },
      { id: 'STD', label: 'standard library', x: 58, y: 36, shape: 'box', w: 18 },
      { id: 'SITE', label: 'site-packages (pip)', x: 84, y: 36, shape: 'box', w: 22 },
      { id: 'OBJ', label: 'module object (run top-level code)', x: 45, y: 60, shape: 'box', w: 34 }
    ];
    var edges = [['M', 'C', '1 cached?'], ['C', 'B', '2 built-in?'], ['B', 'P0', '3'], ['P0', 'PP', ''], ['PP', 'STD', ''], ['STD', 'SITE', ''], ['P0', 'OBJ', 'found'], ['STD', 'OBJ', ''], ['SITE', 'OBJ', ''], ['B', 'OBJ', '']];
    var frames = [], cache = [['sys', '<module sys (built-in)>'], ['builtins', '<module builtins>'], ['__main__', '<module main.py>']];
    function g(hl, ehl, tags, narr, extra) {
      var parts = [{ type: 'graph', label: 'How import ' + name + ' is resolved', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} },
        { type: 'map', label: 'sys.modules (already-imported modules)', entries: cache.slice(), hl: (extra && extra.mh) || {} }];
      if (extra && extra.t) parts.push({ type: 'text', html: extra.t });
      frames.push({ narr: narr, parts: parts });
    }
    var already = name === 'sys' || name === 'builtins';
    g({ M: 'cur' }, {}, {}, 'Python reaches <code>import ' + esc(name) + '</code>. An import does three things: <b>find</b> the module, <b>load</b> it (run its code once), and <b>bind</b> the name <code>' + esc(name) + '</code> in the current namespace.');
    if (already) {
      g({ M: 'done', C: 'ok' }, { 'M-C': 'ok' }, { C: 'HIT' }, '<b>Step 1: the cache.</b> <code>sys.modules</code> already holds <code>' + esc(name) + '</code> (the interpreter loaded it at startup). Cache hit: nothing is searched and no code runs again. The existing module object is simply bound to the name.', { mh: (function () { var h = {}; h[name] = 'ok'; return h; })() });
      g({ M: 'ok' }, {}, {}, 'Done: <code>' + esc(name) + '</code> now refers to the same object stored in <code>sys.modules</code>. Every module that imports it shares that one object.', { t: 'Try <b>helpers</b>, <b>json</b>, <b>requests</b> or a name that does not exist.' });
      g({ M: 'ok', C: 'sel' }, {}, {}, 'Key idea: <b>a module is imported (executed) only once per process</b>. Later imports are just dictionary lookups in <code>sys.modules</code>.', { mh: (function () { var h = {}; h[name] = 'sel'; return h; })() });
      return frames;
    }
    g({ M: 'done', C: 'bad' }, { 'M-C': 'cur' }, { C: 'miss' }, '<b>Step 1: the cache.</b> Python checks <code>sys.modules["' + esc(name) + '"]</code>. Not there (first import), so it must search.');
    g({ C: 'done', B: where === 'BUILTIN' ? 'ok' : 'bad' }, { 'C-B': 'cur' }, { B: 'no' }, '<b>Step 2: built-in modules.</b> A few modules are compiled into the interpreter itself (<code>sys</code>, <code>builtins</code>, <code>_io</code>…, see <code>sys.builtin_module_names</code>). <code>' + esc(name) + '</code> is not one of them.');
    var order = ['P0', 'PP', 'STD', 'SITE'], why = {
      P0: 'the folder of the script you ran (or the current folder for <code>python -m</code> / the REPL)',
      PP: 'folders listed in the PYTHONPATH environment variable (often empty)',
      STD: 'the standard library that ships with Python',
      SITE: 'third-party packages installed by pip (inside the active virtual environment)'
    };
    var found = false;
    for (var i = 0; i < order.length; i++) {
      var id = order[i], hl = {}, ehl = {}, tags = {};
      for (var k = 0; k < i; k++) { hl[order[k]] = 'done'; tags[order[k]] = 'no'; }
      hl.B = 'done';
      var hit = where === id;
      hl[id] = hit ? 'ok' : 'cur';
      tags[id] = hit ? 'FOUND' : 'no';
      ehl[i === 0 ? 'B-P0' : order[i - 1] + '-' + id] = 'cur';
      g(hl, ehl, tags, '<b>Step ' + (3 + i) + ': sys.path[' + i + '] = ' + why[id] + '.</b> ' + (hit ? 'Python finds <code>' + esc(fileFor[id]) + '</code>. Search stops at the <b>first</b> match.' : 'No <code>' + esc(name) + '.py</code> or <code>' + esc(name) + '/</code> package here; try the next entry.'));
      if (hit) { found = true; break; }
    }
    if (!found) {
      var h2 = { M: 'bad' }; order.forEach(function (o) { h2[o] = 'done'; });
      g(h2, {}, { M: 'error' }, '<span class="c-r">Every sys.path entry was searched and nothing matched.</span> Python raises <code>ModuleNotFoundError: No module named \'' + esc(name) + '\'</code>. Usual causes: a typo, the package is not installed in <b>this</b> environment (venv not activated), or running from the wrong folder.', { t: 'Fix: <code>python -m pip install ' + esc(name) + '</code> with the same interpreter, or check <code>print(sys.path)</code>.' });
      g({ M: 'bad' }, {}, {}, 'Nothing was added to <code>sys.modules</code>, and the name is not bound. The program stops unless the import is inside <code>try/except ImportError</code> (a common pattern for optional dependencies).');
      return frames;
    }
    cache.push([name, '<module ' + name + '> (running…)']);
    var ho = {}; ho[where] = 'done'; ho.OBJ = 'cur';
    var eo = {}; eo[where + '-OBJ'] = 'ok';
    g(ho, eo, {}, '<b>Load.</b> Python creates an empty module object and <b>registers it in sys.modules first</b> (this is what makes circular imports not loop forever), then runs the file\'s top-level code from top to bottom: defs, classes, constants, and any prints.', { mh: (function () { var h = {}; h[name] = 'cur'; return h; })() });
    cache[cache.length - 1] = [name, '<module ' + name + ' from ' + fileFor[where] + '>'];
    g({ OBJ: 'ok', M: 'ok' }, { 'M-C': 'ok' }, { OBJ: 'ready' }, '<b>Bind.</b> The finished module object is bound to the name <code>' + esc(name) + '</code> in main.py. You use its contents with dot syntax: <code>' + esc(name) + '.something</code>.', { mh: (function () { var h = {}; h[name] = 'ok'; return h; })() });
    g({ C: 'sel', M: 'ok' }, { 'M-C': 'ok' }, { C: 'HIT' }, 'A second <code>import ' + esc(name) + '</code> anywhere in the program is now a <b>cache hit</b>: no search, no re-run of the module code. That is why a print at the top of a module appears only once.', { mh: (function () { var h = {}; h[name] = 'sel'; return h; })() });
    return frames;
  }

  topics.push({
    title: 'Modules & the import System: sys.path, sys.modules and Shadowing',
    analogy: R`<p>A <b>module</b> is a <b>toolbox</b> (one <code>.py</code> file). <code>import tools</code> sends a helper to fetch it. The helper first looks <b>on your desk</b> (<code>sys.modules</code>: toolboxes already fetched), then walks a fixed list of <b>shelves in order</b> (<code>sys.path</code>: your project folder, then the standard library, then installed packages) and grabs the <b>first box with the right label</b>. If you put your own box labelled "random" on the first shelf, the helper brings yours — even though you wanted Python's.</p>`,
    explain: R`<p>🟢 <b>Every .py file is a module.</b> If <code>helpers.py</code> sits next to <code>main.py</code>, then inside main.py you can write <code>import helpers</code> and use <code>helpers.greet()</code>. Modules let you split code into files, reuse it, and give each file its own namespace (no name clashes).</p>
      ${H.table(['Form', 'What gets a name', 'Use it as'], [
        ['<code>import math</code>', '<code>math</code>', '<code>math.sqrt(2)</code>'],
        ['<code>import numpy as np</code>', '<code>np</code> (alias)', '<code>np.array(...)</code>'],
        ['<code>from math import sqrt, pi</code>', '<code>sqrt</code>, <code>pi</code>', '<code>sqrt(2)</code>'],
        ['<code>from math import sqrt as root</code>', '<code>root</code>', '<code>root(2)</code>'],
        ['<code>from math import *</code>', 'every public name (avoid!)', 'unclear where names came from']
      ])}
      <p>🔵 <b>What import really does</b> (watch the visualizer):</p>
      <ol>
        <li><b>Check the cache</b> <code>sys.modules</code>. If the module is already there, reuse it.</li>
        <li><b>Find</b> it: built-in modules first, then each folder in <code>sys.path</code>, in order: the script's own folder, <code>PYTHONPATH</code>, the standard library, then <code>site-packages</code> (pip installs). First match wins.</li>
        <li><b>Load</b>: create a module object, put it in <code>sys.modules</code>, and <b>run the file's top-level code once</b>.</li>
        <li><b>Bind</b> the name in the importing file.</li>
      </ol>
      <p><b>Consequences you must know:</b></p>
      <ul>
        <li><b>Runs once:</b> a module's top-level code executes only on the first import in a process. Module-level variables therefore act like a shared singleton.</li>
        <li><b>Shadowing:</b> naming your file <code>random.py</code>, <code>json.py</code>, <code>email.py</code> or <code>test.py</code> hides the standard module of that name, because your folder comes first in sys.path. Symptom: <code>AttributeError: module 'random' has no attribute 'randint'</code>. Python 3.13 now adds a hint to this error when it detects the shadowing.</li>
        <li><b>Explore a module:</b> <code>dir(math)</code> lists names, <code>help(math.sqrt)</code> shows docs, <code>math.__file__</code> shows where it was loaded from, <code>sys.path</code> shows the search list.</li>
        <li><b>Batteries included:</b> the standard library already has <code>os</code>, <code>sys</code>, <code>pathlib</code>, <code>json</code>, <code>csv</code>, <code>re</code>, <code>datetime</code>, <code>collections</code>, <code>itertools</code>, <code>random</code>, <code>math</code>, <code>statistics</code>, <code>subprocess</code>, <code>logging</code>, <code>unittest</code>, <code>sqlite3</code>, <code>urllib</code> — check it before installing anything.</li>
      </ul>`,
    clues: [
      '"ModuleNotFoundError: No module named X" → not installed in THIS interpreter/venv, or wrong folder on sys.path',
      '"module \'random\' has no attribute \'randint\'" → your own random.py is shadowing the stdlib',
      '"print at top of module only shows once" → modules execute once; later imports hit sys.modules',
      '"ImportError: cannot import name X (most likely due to a circular import)" → two modules import each other at top level',
      '"I changed the module but the REPL still runs old code" → cached in sys.modules; restart or <code>importlib.reload</code>',
      '"from config import DEBUG; later config.DEBUG = True has no effect" → from-import copied the binding'
    ],
    code: [{ lang: 'python', run: true, title: 'Create modules on the fly and watch import behave (runnable)', code: R`
      import importlib, sys, tempfile, textwrap
      from pathlib import Path

      tmp = Path(tempfile.mkdtemp())
      (tmp / "helpers.py").write_text(textwrap.dedent("""
          print("helpers is being executed")      # top-level code: runs on FIRST import only
          GREETING = "Hello"
          def greet(name):
              return f"{GREETING}, {name}!"
      """), encoding="utf-8")

      sys.path.insert(0, str(tmp))         # put our folder first on the search path
      importlib.invalidate_caches()        # tell the finders the folder changed

      import helpers                       # prints once
      import helpers                       # cache hit: prints nothing
      print(helpers.greet("Asha"))
      print("helpers" in sys.modules, sys.modules["helpers"] is helpers)
      print(Path(helpers.__file__).name, helpers.__name__)

      from helpers import GREETING         # copies the CURRENT binding
      helpers.GREETING = "Hi"              # rebinding inside the module...
      print(GREETING, helpers.GREETING)    # Hello Hi  -> the copy did not change
      print(helpers.greet("Ben"))          # Hi, Ben!  -> functions read the module global

      import math as m
      print(m.sqrt(16), [n for n in dir(m) if n.startswith("s")][:3])
      print(sys.path[0] == str(tmp))
    ` }],
    codeTitle: ['import, observed'],
    viz: {
      title: 'Import resolution: cache → built-ins → sys.path (first match wins)',
      input: 'helpers',
      inputLabel: 'Module to import (helpers = your file, json = stdlib, requests = pip-installed, sys = built-in, anything else = not found)',
      gen: importGen
    },
    examples: [
      { title: 'The shadowing bug, reproduced and diagnosed', html: R`<p>A student names their file <code>random.py</code> and writes <code>import random</code>. Python finds <b>their own file first</b> (sys.path[0]) and imports it instead of the standard library. Here we simulate it in a temp folder; the diagnosis is <code>random.__file__</code>.</p>`, code: { lang: 'python', run: true, code: R`
        import importlib, sys, tempfile
        from pathlib import Path
        d = Path(tempfile.mkdtemp())
        (d / "random.py").write_text("print('oops, this is MY random.py')\n", encoding="utf-8")
        saved = sys.modules.pop("random", None)   # pretend nobody imported it yet
        sys.path.insert(0, str(d))
        importlib.invalidate_caches()
        import random
        print(hasattr(random, "randint"), Path(random.__file__).parent == d)
        # clean up so the real module is used again
        sys.path.remove(str(d))
        del sys.modules["random"]
        if saved is not None:
            sys.modules["random"] = saved
        import random
        print(hasattr(random, "randint"))   # True: the real one
      ` } },
      { title: 'Predict the output: module code runs once', html: R`<p>Three imports, one print. The second and third <code>import counter</code> are dictionary lookups. Module-level state (<code>count</code>) is shared by everyone who imports it.</p>${H.table(['statement', 'what happens'], [['import counter', 'search, load, run → prints "loading"'], ['import counter', 'sys.modules hit → nothing'], ['counter.count += 1', 'shared state changes'], ['from counter import count', 'copies the current value (1)']])}`, code: { lang: 'python', run: true, code: R`
        import importlib, sys, tempfile
        from pathlib import Path
        d = Path(tempfile.mkdtemp())
        (d / "counter.py").write_text("print('loading')\ncount = 0\n", encoding="utf-8")
        sys.path.insert(0, str(d)); importlib.invalidate_caches()
        import counter
        import counter
        counter.count += 1
        from counter import count
        print(count, counter.count)        # 1 1
        counter.count += 1
        print(count, counter.count)        # 1 2
      ` } },
      { title: 'Circular imports: why "partially initialised module" happens', html: R`<p><code>a.py</code> imports <code>b</code>; <code>b.py</code> does <code>from a import X</code>. When b runs, <code>a</code> is in sys.modules but has only run up to its import line, so <code>X</code> does not exist yet. Fixes: move shared code to a third module, import inside the function that needs it, or use <code>import a</code> + <code>a.X</code> at call time.</p>`, code: { lang: 'python', run: true, code: R`
        import importlib, sys, tempfile
        from pathlib import Path
        d = Path(tempfile.mkdtemp())
        (d / "mod_a.py").write_text("import mod_b\nX = 1\n", encoding="utf-8")
        (d / "mod_b.py").write_text("from mod_a import X\n", encoding="utf-8")
        sys.path.insert(0, str(d)); importlib.invalidate_caches()
        try:
            import mod_a
        except ImportError as e:
            print("ImportError:", str(e).split(" (")[0])
      ` } },
      { title: 'Standard library tour: solve it before you pip install', html: R`<p>Many "I need a library for…" tasks are already in the stdlib. Knowing these names is an interview signal of real Python experience.</p>${H.table(['need', 'module'], [['paths, files', 'pathlib, shutil, os'], ['dates', 'datetime, zoneinfo'], ['counting, queues', 'collections, heapq'], ['config/data', 'json, csv, tomllib (3.11+)'], ['run commands', 'subprocess'], ['HTTP (basic)', 'urllib.request'], ['tiny database', 'sqlite3']])}`, code: { lang: 'python', run: true, code: R`
        import collections, datetime, json, statistics, tomllib
        print(collections.Counter("mississippi").most_common(2))
        print(datetime.date(2026, 10, 14).strftime("%A"))
        print(statistics.median([3, 1, 4, 1, 5]))
        print(tomllib.loads('name = "demo"\nversion = "1.0"')["version"])
        print(json.dumps({"ok": True}))
      ` } }
    ],
    deepDive: R`<p>🟣 <b>The real machinery (importlib).</b></p>
      <ul>
        <li><b>Finders and loaders:</b> <code>sys.meta_path</code> holds finder objects tried in order: <code>BuiltinImporter</code>, <code>FrozenImporter</code> (modules frozen into the binary for faster startup, like <code>os</code> since 3.11), and <code>PathFinder</code>, which walks <code>sys.path</code> using per-folder finders cached in <code>sys.path_importer_cache</code>. A finder returns a <b>ModuleSpec</b> (name, loader, origin); the loader creates and executes the module. You can add your own finder to import from a zip, a database or the network.</li>
        <li><b>Bytecode cache:</b> source files are compiled to bytecode stored in <code>__pycache__/name.cpython-313.pyc</code>. The pyc header holds a magic number (Python version) and the source's mtime and size (or a hash), so recompilation happens only when the source changes. The script you run directly is never cached.</li>
        <li><b>Insertion before execution:</b> the module is put into <code>sys.modules</code> before its code runs. That breaks infinite recursion in circular imports, but exposes half-initialised modules — the root of "cannot import name … partially initialized module".</li>
        <li><b>Import cost:</b> importing big libraries (pandas, torch) can take hundreds of milliseconds. Measure with <code>python -X importtime script.py</code>. Techniques: import inside functions for rarely used paths, or lazy loading via module <code>__getattr__</code> (PEP 562). PEP 810 adds an explicit <code>lazy import</code> statement, accepted for Python 3.15.</li>
        <li><b>reload is shallow:</b> <code>importlib.reload(m)</code> re-executes m's code in the same module object, but objects created earlier (instances, names copied by <code>from m import x</code>) still point at old definitions. Production code should restart instead.</li>
        <li><b>Security:</b> because the script folder comes first, dropping a malicious <code>json.py</code> next to a script hijacks it. <code>python -I</code> (isolated mode) and <code>-P</code> (3.11+, do not prepend the script/cwd path) reduce that risk; <code>sys.flags.safe_path</code> reports it.</li>
      </ul>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> AI writes the import lines for you and auto-suggests modules, and tools like ruff sort and clean imports automatically. ImportError tracebacks are among the easiest things to paste into a chat and get fixed.</p>
      <p><b>Use AI as a partner:</b> paste <code>sys.path</code>, <code>sys.executable</code> and the error, and ask "why can't this interpreter see my package?" — the answer is almost always "different interpreter than pip installed into".</p>
      <p><b>Where AI goes wrong:</b> <b>hallucinated packages</b> are a real supply-chain risk: models sometimes invent plausible package names, and attackers register those names on PyPI ("slopsquatting"). Always verify a package exists, is maintained and is the one you meant before installing. AI also tends to fix circular imports by sprinkling imports inside functions instead of fixing the module structure, and may generate files with shadowing names like <code>queue.py</code> or <code>types.py</code>.</p>
      <p><b>What you must still own:</b> the mental model of find → load → bind, how sys.path is built, and module design (small, acyclic dependencies). That is what you need when an agent's generated project "works on its machine" but not in CI.</p>`,
    problems: [{
      title: 'Detect Files That Shadow the Standard Library',
      level: 'Medium', tags: ['modules', 'sys', 'import system'], companies: ['Google', 'JetBrains', 'Canonical'],
      statement: R`<p>Given a list of file and folder names in a project directory, return the sorted list of names that would <b>shadow</b> a standard-library module when a script in that folder runs. A file <code>X.py</code> or a folder <code>X</code> (package) shadows if <code>X</code> is a top-level stdlib module name. Use <code>sys.stdlib_module_names</code> (Python 3.10+).</p>`,
      constraints: R`0 ≤ number of names ≤ 10<sup>5</sup>; names are plain file/folder names (no paths).`,
      example: R`<p><code>["main.py", "random.py", "utils.py", "email", "json.txt", "test.py"]</code> → ${H.c('r', "['email', 'random.py', 'test.py']")}. <code>random</code>, <code>email</code> and <code>test</code> are stdlib names; <code>json.txt</code> is not a Python module file so it is harmless.</p>`,
      brute: {
        why: R`<p>Actually try to <code>import</code> each name and check where it came from. That executes arbitrary project code (side effects!), is slow, and is confused by modules already cached in <code>sys.modules</code>.</p>`,
        code: { lang: 'python', run: true, code: R`
          import importlib.util
          def shadows_brute(names):
              found = []
              for n in names:
                  mod = n[:-3] if n.endswith(".py") else n
                  if "." in mod:
                      continue
                  spec = importlib.util.find_spec(mod)   # still runs parent packages' code for dotted names
                  if spec is not None and spec.origin and ("python3" in spec.origin or spec.origin in ("built-in", "frozen")):
                      found.append(n)                    # fragile path heuristics
              return sorted(found)

          print(shadows_brute(["random.py", "utils.py"]))
        ` }
      },
      mcq: { q: 'Why does <code>random.py</code> in your project shadow the stdlib module?', options: ['sys.path[0] (the script folder) is searched before the standard library', 'Python prefers the newest file', 'pip installed it', 'Local files are compiled faster'], answer: 0, explain: 'sys.path is searched in order and the first match wins; the script directory is the first entry.' },
      hints: [
        R`<p>Hint 1: You do not need to import anything: the set of stdlib names is available as data in <code>sys.stdlib_module_names</code> (a frozenset).</p>`,
        R`<p>Hint 2: Turn each entry into a module name: <code>"x.py"</code> → <code>"x"</code>; a folder name stays as is; anything else (like <code>.txt</code>) is skipped.</p>`,
        R`<p>Hint 3: Set membership is O(1). Folder vs file: in this exercise, names without a dot are folders. Return <code>sorted(...)</code> of the original names.</p>`
      ],
      solution: {
        approach: R`<p>Pure data check: normalise each name to a candidate module name and test membership in the stdlib name set. No imports, no side effects, O(n).</p>`,
        code: { lang: 'python', run: true, code: R`
          import sys

          def find_shadowing(names):
              stdlib = sys.stdlib_module_names          # frozenset, Python 3.10+
              hits = []
              for n in names:
                  if n.endswith(".py"):
                      mod = n[:-3]                      # module file
                  elif "." not in n:
                      mod = n                           # treat as a package folder
                  else:
                      continue                          # json.txt, data.csv ... harmless
                  if mod in stdlib:
                      hits.append(n)
              return sorted(hits)

          print(find_shadowing(["main.py", "random.py", "utils.py", "email", "json.txt", "test.py"]))
        ` },
        dry: { head: ['name', 'candidate module', 'in stdlib?', 'result'], rows: [
          ['main.py', 'main', 'no', '—'],
          ['random.py', 'random', '<span class="c-r">yes</span>', 'add'],
          ['email', 'email', '<span class="c-r">yes</span>', 'add'],
          ['json.txt', '(skipped)', '—', '—'],
          ['test.py', 'test', '<span class="c-r">yes</span>', 'add → sorted: email, random.py, test.py']
        ] },
        complexity: R`<p>O(n · L) time for n names of length L; O(k) extra space for the hits.</p>`,
        followUps: ['Also flag names that shadow installed third-party packages (importlib.metadata.packages_distributions())', 'Turn it into a pre-commit hook', 'Why does python -P or -I avoid the problem?']
      }
    }]
  });
registerModule({ id: 'py03', title: 'Strings, Files, Modules & Packages', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
