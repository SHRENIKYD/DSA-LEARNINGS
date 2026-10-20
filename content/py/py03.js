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
      tests: {
        sig: 'string -> bool',
        fn: 'isPalindrome',
        cases: [
          [['A man, a plan, a canal: Panama'], true],
          [['race a car'], false],
          [[' '], true],
          [['0P'], false],
          [['a'], true],
          [['.,'], true],
          [['ab_a'], true],
          [['Aa'], true],
          [['ab'], false],
          [['No \'x\' in Nixon'], true],
          [['12321'], true],
          [['1231'], false],
          [['!!a!!b!!a!!'], true],
          [['a,b'], false],
          [[{ $rep: 'a', n: 200000 }], true],
          [[{ $concat: [{ $rep: 'a', n: 99999 }, 'b', { $rep: 'a', n: 99999 }] }], true],
          [[{ $rep: 'ab', n: 100000 }], false],
          [[{ $rep: 'a,', n: 100000 }], true],
          [[{ $concat: [{ $rep: 'a', n: 100000 }, 'b', { $rep: 'a', n: 99999 }] }], false]
        ]
      },
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
          ['…', '…', '…', '…', 'all pairs match, skipping spaces and punctuation'],
          ['17', '17', 'c', 'c', 'pointers meet on the middle letter → move'],
          ['18', '16', '—', '—', '<span class="c-g">left ≥ right → True</span>']
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
    if (zero && fill === undefined && group) return fail('(This demo does not draw zero-padding combined with grouping; Python inserts separators into the zeros too.)', 'Try <code>&gt;12,</code> instead of <code>012,</code> here, or run it in the Python runner.');

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
    // The 0 flag means "fill with 0" unless you gave a fill; with no align it pads after the sign.
    var f2 = fill === undefined ? (zero ? '0' : ' ') : fill, al = align;
    if (!al) al = kind === 'str' ? '<' : (zero ? '=' : '>');
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
      constraints: R`0 ≤ number of items ≤ 1000; 1 ≤ qty ≤ 10<sup>4</sup>; 0 ≤ price ≤ 10<sup>6</sup>; every line total and the grand total stay below 10<sup>7</sup>, so they fit the 12-character column.`,
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
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [
            ['receipt([(\'Pen\', 2, 15.5), (\'Wireless Keyboard Pro\', 1, 2499)])'],
            'Pen              2       31.00\n' +
              'Wireless Keyb…   1    2,499.00\n' +
              '------------------------------\n' +
              'TOTAL                 2,530.00'
          ],
          [
            ['receipt([])'],
            '------------------------------\n' +
              'TOTAL                     0.00'
          ],
          [
            ['receipt([(\'A\', 1, 0)])'],
            'A                1        0.00\n' +
              '------------------------------\n' +
              'TOTAL                     0.00'
          ],
          [
            ['receipt([(\'Fourteen-chars\', 1, 1.5)])'],
            'Fourteen-chars   1        1.50\n' +
              '------------------------------\n' +
              'TOTAL                     1.50'
          ],
          [
            ['receipt([(\'Fourteen-char\', 1, 1.5), (\'Fifteen-chars-xx\', 3, 0.25)])'],
            'Fourteen-char    1        1.50\n' +
              'Fifteen-chars…   3        0.75\n' +
              '------------------------------\n' +
              'TOTAL                     2.25'
          ],
          [
            ['receipt([(\'Item\', 1, 9.99)] * 1000)'],
            'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              'Item             1        9.99\n' +
              '------------------------------\n' +
              'TOTAL                 9,990.00'
          ],
          [
            ['receipt([(\'Bulk\', 10000, 99.99)])'],
            'Bulk          10000  999,900.00\n' +
              '------------------------------\n' +
              'TOTAL               999,900.00'
          ],
          [
            ['receipt([(\'Mid\', 1234, 0.5), (\'x\', 7, 3.14)])'],
            'Mid           1234      617.00\n' +
              'x                7       21.98\n' +
              '------------------------------\n' +
              'TOTAL                   638.98'
          ]
        ],
        harness: {
          python: 'def t_val(src):\n' +
            '    try:\n' +
            '        return eval(src)\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
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
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [['truncate_utf8(\'café!\', 4)'], 'caf'],
          [['truncate_utf8(\'café!\', 5)'], 'café'],
          [['truncate_utf8(\'😀😀\', 5)'], '😀'],
          [['truncate_utf8(\'abc\', 10)'], 'abc'],
          [['truncate_utf8(\'€\', 2)'], ''],
          [['truncate_utf8(\'€\', 3)'], '€'],
          [['truncate_utf8(\'\', 0)'], ''],
          [['truncate_utf8(\'abc\', 0)'], ''],
          [['truncate_utf8(\'aé\', 1)'], 'a'],
          [['truncate_utf8(\'aé\', 2)'], 'a'],
          [['truncate_utf8(\'aé\', 3)'], 'aé'],
          [['truncate_utf8(\'😀😀\', 4)'], '😀'],
          [['truncate_utf8(\'😀😀\', 8)'], '😀😀'],
          [['truncate_utf8(\'😀a\', 5)'], '😀a'],
          [['truncate_utf8(\'abc\', 3)'], 'abc'],
          [['len(truncate_utf8(\'é\' * 10**6, 999999))'], 499999],
          [['len(truncate_utf8(\'a\' * 10**6, 10**6))'], 1000000],
          [['len(truncate_utf8(\'€\' * 10**6, 10**6))'], 333333]
        ],
        harness: {
          python: 'def t_val(src):\n' +
            '    try:\n' +
            '        return eval(src)\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
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
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'to be\\nor not to be\\n\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [2, 6, 19, 'or not to be']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [0, 0, 0, '']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'no newline\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [1, 2, 10, 'no newline']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'\\n\\n\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [2, 0, 2, '']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'a\\nbb\\ncc\\n\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [3, 3, 8, 'bb']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'héllo wörld\\n\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [1, 2, 12, 'héllo wörld']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'x\\n\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [1, 1, 2, 'x']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'  spaced   out  \\n\\ttabs\\there\\n\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [2, 4, 28, '  spaced   out  ']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, \'one\\n\\nthree words here\\n\'.encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'result = wc(p)\n' +
                'os.remove(p)'
            ],
            [3, 4, 22, 'three words here']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, (\'x\\n\' * 100000).encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'r = wc(p)\n' +
                'result = list(r)\n' +
                'os.remove(p)'
            ],
            [100000, 100000, 200000, 'x']
          ],
          [
            [
              'import os, tempfile\n' +
                'fd, p = tempfile.mkstemp()\n' +
                'os.write(fd, (\'a\' * 100000).encode(\'utf-8\'))\n' +
                'os.close(fd)\n' +
                'r = wc(p)\n' +
                'result = [r[0], r[1], r[2], len(r[3])]\n' +
                'os.remove(p)'
            ],
            [1, 1, 100000, 100000]
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
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
      statement: R`<p>Write <code>merge(paths, out_path)</code> that writes every input file into one output file. Before each file's content write a header line <code>==&gt; name &lt;==</code> (just the file name). Make sure every file is closed even if one of the inputs is missing; in that case write <code>[missing]</code> under its header and continue. If a file does not end with a newline, add one so the next header starts on its own line. Return the number of files merged successfully.</p>`,
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
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                '(d / \'sub\').mkdir()\n' +
                '(d / \'a.txt\').write_text(\'x\\n\', encoding=\'utf-8\')\n' +
                '(d / \'b.txt\').write_text(\'y\\n\', encoding=\'utf-8\')\n' +
                'paths = [d / n for n in [\'a.txt\', \'nope.txt\', \'b.txt\']]\n' +
                'n = merge(paths, d / \'out.txt\')\n' +
                'result = [n, (d / \'out.txt\').read_text(encoding=\'utf-8\')]'
            ],
            [2, '==> a.txt <==\nx\n==> nope.txt <==\n[missing]\n==> b.txt <==\ny\n']
          ],
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                '(d / \'sub\').mkdir()\n' +
                '(d / \'a.txt\').write_text(\'x\\n\', encoding=\'utf-8\')\n' +
                '(d / \'b.txt\').write_text(\'y\', encoding=\'utf-8\')\n' +
                'paths = [d / n for n in [\'a.txt\', \'b.txt\']]\n' +
                'n = merge(paths, d / \'out.txt\')\n' +
                'result = [n, (d / \'out.txt\').read_text(encoding=\'utf-8\')]'
            ],
            [2, '==> a.txt <==\nx\n==> b.txt <==\ny\n']
          ],
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                '(d / \'sub\').mkdir()\n' +
                'paths = [d / n for n in [\'nope.txt\']]\n' +
                'n = merge(paths, d / \'out.txt\')\n' +
                'result = [n, (d / \'out.txt\').read_text(encoding=\'utf-8\')]'
            ],
            [0, '==> nope.txt <==\n[missing]\n']
          ],
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                '(d / \'sub\').mkdir()\n' +
                '(d / \'e.txt\').write_text(\'\', encoding=\'utf-8\')\n' +
                'paths = [d / n for n in [\'e.txt\']]\n' +
                'n = merge(paths, d / \'out.txt\')\n' +
                'result = [n, (d / \'out.txt\').read_text(encoding=\'utf-8\')]'
            ],
            [1, '==> e.txt <==\n']
          ],
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                '(d / \'sub\').mkdir()\n' +
                '(d / \'sub/s.txt\').write_text(\'deep\\n\', encoding=\'utf-8\')\n' +
                'paths = [d / n for n in [\'sub/s.txt\']]\n' +
                'n = merge(paths, d / \'out.txt\')\n' +
                'result = [n, (d / \'out.txt\').read_text(encoding=\'utf-8\')]'
            ],
            [1, '==> s.txt <==\ndeep\n']
          ],
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                '(d / \'sub\').mkdir()\n' +
                '(d / \'u.txt\').write_text(\'é€\\n\', encoding=\'utf-8\')\n' +
                '(d / \'v.txt\').write_text(\'line1\\nline2\\n\', encoding=\'utf-8\')\n' +
                'paths = [d / n for n in [\'u.txt\', \'v.txt\']]\n' +
                'n = merge(paths, d / \'out.txt\')\n' +
                'result = [n, (d / \'out.txt\').read_text(encoding=\'utf-8\')]'
            ],
            [2, '==> u.txt <==\né€\n==> v.txt <==\nline1\nline2\n']
          ],
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                '(d / \'sub\').mkdir()\n' +
                '(d / \'a.txt\').write_text(\'x\\n\', encoding=\'utf-8\')\n' +
                'paths = [d / n for n in [\'a.txt\', \'a.txt\']]\n' +
                'n = merge(paths, d / \'out.txt\')\n' +
                'result = [n, (d / \'out.txt\').read_text(encoding=\'utf-8\')]'
            ],
            [2, '==> a.txt <==\nx\n==> a.txt <==\nx\n']
          ],
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                'ps = []\n' +
                'for i in range(1000):\n' +
                '    (d / (\'f%d.txt\' % i)).write_text(\'z%d\\n\' % i)\n' +
                '    ps.append(d / (\'f%d.txt\' % i))\n' +
                'n = merge(ps, d / \'out.txt\')\n' +
                'lines = (d / \'out.txt\').read_text().split(\'\\n\')\n' +
                'result = [n, len(lines), lines[0], lines[1], lines[-3], lines[-2]]'
            ],
            [1000, 2001, '==> f0.txt <==', 'z0', '==> f999.txt <==', 'z999']
          ],
          [
            [
              'import tempfile, pathlib\n' +
                'd = pathlib.Path(tempfile.mkdtemp())\n' +
                '(d / \'big.txt\').write_text(\'abcdefghi\\n\' * 500000)\n' +
                'n = merge([d / \'big.txt\'], d / \'out.txt\')\n' +
                'text = (d / \'out.txt\').read_text()\n' +
                'result = [n, len(text), text.startswith(\'==> big.txt <==\\nabcdefghi\\n\')]'
            ],
            [1, 5000016, true]
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
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
        <li><b>Shadowing:</b> naming your file <code>random.py</code>, <code>json.py</code>, <code>email.py</code> or <code>string.py</code> hides the standard module of that name, because your folder comes first in sys.path. Symptom: <code>AttributeError: module 'random' has no attribute 'randint'</code>. Python 3.13 now adds a hint to this error when it detects the shadowing.</li>
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
      example: R`<p><code>["main.py", "random.py", "utils.py", "email", "json.txt", "string.py"]</code> → ${H.c('r', "['email', 'random.py', 'string.py']")}. <code>random</code>, <code>email</code> and <code>string</code> are stdlib names; <code>json.txt</code> is not a Python module file so it is harmless.</p>`,
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
      tests: {
        sig: 'string[] -> string[]',
        fn: 'findShadowing',
        cases: [
          [
            [['main.py', 'random.py', 'utils.py', 'email', 'json.txt', 'string.py']],
            ['email', 'random.py', 'string.py']
          ],
          [[[]], []],
          [[['os', 'sys.py', 'math']], ['math', 'os', 'sys.py']],
          [[['Random.py']], []],
          [[['random.pyc']], []],
          [[['collections', 'collections.py']], ['collections', 'collections.py']],
          [[['numpy', 'pandas.py', 'requests']], []],
          [[['typing.py', 'README.md', 'data.csv', 'json']], ['json', 'typing.py']],
          [[['math.py', 'math.py']], ['math.py', 'math.py']],
          [[{ $rep: 'random.py', n: 100000 }], { $rep: 'random.py', n: 100000 }],
          [[{ $concat: [{ $rep: 'app.py', n: 50000 }, ['json'], { $rep: 'app.py', n: 50000 }] }], ['json']]
        ]
      },
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

print(find_shadowing(["main.py", "random.py", "utils.py", "email", "json.txt", "string.py"]))
` },
        dry: { head: ['name', 'candidate module', 'in stdlib?', 'result'], rows: [
          ['main.py', 'main', 'no', '—'],
          ['random.py', 'random', '<span class="c-r">yes</span>', 'add'],
          ['email', 'email', '<span class="c-r">yes</span>', 'add'],
          ['json.txt', '(skipped)', '—', '—'],
          ['string.py', 'string', '<span class="c-r">yes</span>', 'add → sorted: email, random.py, string.py']
        ] },
        complexity: R`<p>O(n · L) time for n names of length L; O(k) extra space for the hits.</p>`,
        followUps: ['Also flag names that shadow installed third-party packages (importlib.metadata.packages_distributions())', 'Turn it into a pre-commit hook', 'Why does python -P or -I avoid the problem?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7: Packages, relative imports, __name__ == "__main__", python -m
     ====================================================================== */
  function pkgGen(input) {
    var raw = String(input === undefined ? 'shop.payments.card' : input).trim();
    if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*){0,3}$/.test(raw)) throw new Error('Type a dotted module path with 1 to 4 lowercase parts, like shop.payments.card');
    var parts = raw.split('.'), n = parts.length, frames = [];
    var nodes = [], edges = [], cache = [];
    var y0 = 8, dy = 15;
    for (var i = 0; i < n; i++) {
      var isLast = i === n - 1;
      var file = parts.slice(0, i + 1).join('/') + (isLast && n > 1 ? '.py' : '/__init__.py');
      if (n === 1) file = parts[0] + '.py';
      nodes.push({ id: 'n' + i, label: file, x: 18 + i * 14, y: y0 + i * dy, shape: 'box', w: 30 });
      if (i > 0) edges.push(['n' + (i - 1), 'n' + i, 'then']);
    }
    nodes.push({ id: 'main', label: 'main.py', x: 82, y: 8, shape: 'box', w: 16 });
    edges.push(['main', 'n0', 'import']);
    var H2 = y0 + (n - 1) * dy + 14;
    function f(hl, narr, mh, extra) {
      var ps = [{ type: 'graph', label: 'Files executed for: import ' + raw, directed: true, height: Math.max(40, H2), nodes: nodes, edges: edges, hl: hl }];
      ps.push({ type: 'map', label: 'sys.modules (new entries)', entries: cache.slice(), hl: mh || {} });
      if (extra) ps.push(extra);
      frames.push({ narr: narr, parts: ps });
    }
    f({ main: 'cur' }, 'main.py runs <code>import ' + esc(raw) + '</code>. A dotted name means "a module inside a package inside a package". Python must import <b>every parent first</b>, from the outside in.', {},
      { type: 'text', label: 'Folder layout on disk', html: '<pre>' + esc(parts.map(function (p, i) { return '    '.repeat(i) + (i === n - 1 ? p + '.py' : p + '/') + (i === n - 1 ? '' : '\n' + '    '.repeat(i + 1) + '__init__.py'); }).join('\n')) + '</pre>' });
    for (var j = 0; j < n; j++) {
      var name = parts.slice(0, j + 1).join('.'), hl = { main: 'done' };
      for (var k = 0; k < j; k++) hl['n' + k] = 'done';
      hl['n' + j] = 'cur';
      cache.push([name, j === n - 1 && n > 1 ? 'module' : 'package']);
      var mh = {}; mh[name] = 'ok';
      var isPkg = !(j === n - 1 && n > 1) && n > 1;
      f(hl, 'Import <b>' + esc(name) + '</b>: ' + (isPkg ? 'it is a <b>package</b> (a folder), so Python runs its <code>__init__.py</code>. Whatever that file defines becomes the package\'s attributes. ' + (j > 0 ? 'Python searches for it only inside the parent package\'s folder (<code>' + esc(parts.slice(0, j).join('.')) + '.__path__</code>), not the whole sys.path.' : 'The top-level package is found by searching sys.path, like any module.') : n === 1 ? 'a plain module file, executed top to bottom.' : 'the final piece is a plain <b>module</b> file, executed top to bottom. Its <code>__name__</code> is the full dotted name <code>' + esc(name) + '</code>.'), mh);
    }
    var hlAll = { main: 'ok' }; for (var q = 0; q < n; q++) hlAll['n' + q] = 'ok';
    f(hlAll, 'Binding: <code>import ' + esc(raw) + '</code> binds only the <b>top-level name</b> <code>' + esc(parts[0]) + '</code> in main.py; you then write the full path <code>' + esc(raw) + '.func()</code>.' + (n > 1 ? ' With <code>from ' + esc(parts.slice(0, -1).join('.')) + ' import ' + esc(parts[n - 1]) + '</code> you would get the short name directly.' : ''), {},
      { type: 'vars', label: 'Names in main.py', vals: (function () { var v = {}; v[parts[0]] = '<package ' + parts[0] + '>'; return v; })() });
    f(hlAll, 'Importing it again from any other file is free: every name is already in <code>sys.modules</code>, so no <code>__init__.py</code> runs twice.', (function () { var h = {}; cache.forEach(function (e) { h[e[0]] = 'sel'; }); return h; })());
    f({ main: 'sel', ['n' + (n - 1)]: 'sel' }, 'Now run the same module as a <b>program</b>: <code>python -m ' + esc(raw) + '</code>. Parent packages are still imported normally, but the target module is executed with <code>__name__ == "__main__"</code> instead of <code>"' + esc(raw) + '"</code>, so its <code>if __name__ == "__main__":</code> block runs. Relative imports keep working because Python knows the package (<code>__package__</code>).', {},
      { type: 'table', label: '__name__ inside ' + esc(parts[n - 1]) + (n > 1 ? '.py' : ''), columns: ['how it was started', '__name__', 'main block runs?'], rows: [['import ' + raw, raw, 'no'], ['python -m ' + raw, '__main__', 'yes'], ['python ' + parts.join('/') + '.py', '__main__', 'yes, but relative imports FAIL']] });
    return frames;
  }

  topics.push({
    title: 'Packages, Relative Imports, __name__ == "__main__" & python -m',
    analogy: R`<p>If a module is a toolbox, a <b>package is a labelled cupboard of toolboxes</b> (a folder of modules). <code>__init__.py</code> is the <b>label and the welcome note</b> taped on the cupboard door: it is read the first time anyone opens that cupboard. And <code>__name__</code> is a <b>name badge</b>: when a file is the star of the show (run directly) its badge says <code>"__main__"</code>; when it is just a guest (imported by someone else) the badge shows its real name. <code>if __name__ == "__main__":</code> means "only do this when I am the star".</p>`,
    explain: R`<p>🟢 <b>A package is a folder of modules.</b></p>
      <pre>project/
    main.py
    shop/                 # package
        __init__.py       # runs when "shop" is first imported
        cart.py           # module shop.cart
        payments/         # sub-package
            __init__.py
            card.py       # module shop.payments.card</pre>
      <p>Use dotted names: <code>import shop.cart</code>, <code>from shop.payments import card</code>, <code>from shop.payments.card import charge</code>.</p>
      <p><b>__init__.py</b> can be empty (it just marks the folder as a regular package) or it can expose a neat public API: <code>from .cart import Cart</code> lets users write <code>from shop import Cart</code>. Since Python 3.3, a folder <i>without</i> <code>__init__.py</code> still imports as a <b>namespace package</b> (PEP 420), used for splitting one package across several folders — but for normal projects, include <code>__init__.py</code>.</p>
      <p><b>Relative imports</b> (only inside packages): <code>from . import cart</code> (same package), <code>from .cart import Cart</code>, <code>from ..utils import money</code> (parent package). They make a package movable and self-contained. <b>Absolute imports</b> (<code>from shop.cart import Cart</code>) are clearer and recommended by PEP 8 for most code.</p>
      <p>🔵 <b>__name__ and the main guard.</b> Every module has a global <code>__name__</code>. It is the module's dotted name when imported, and <code>"__main__"</code> when the file is the program being run. So:</p>
      <pre>def main():
    print("running as a script")

if __name__ == "__main__":     # True only when run directly
    main()</pre>
      <p>lets one file be both a <b>reusable library</b> (importing it does not start the program) and a <b>runnable script</b>. It is also essential for <code>multiprocessing</code> on Windows/macOS, which re-imports your main file in child processes.</p>
      <p><b>python -m</b>: <code>python -m shop.payments.card</code> runs a module <b>by its import name</b>. Python puts the <b>current directory</b> on sys.path, imports parent packages properly, and relative imports work. Running <code>python shop/payments/card.py</code> instead puts <code>shop/payments/</code> on sys.path, so <code>from ..utils import x</code> fails with <code>ImportError: attempted relative import with no known parent package</code>. Tools use the same trick: <code>python -m pip</code>, <code>python -m venv</code>, <code>python -m http.server</code>, <code>python -m json.tool</code>. A package can be made runnable by adding a <code>__main__.py</code> file.</p>`,
    clues: [
      '"code runs when I import the file" → move it under <code>if __name__ == "__main__":</code>',
      '"attempted relative import with no known parent package" → run with <code>python -m pkg.module</code> from the project root',
      '"make my package runnable" → add <code>pkg/__main__.py</code>, run <code>python -m pkg</code>',
      '"expose a clean public API" → re-export in <code>__init__.py</code>, define <code>__all__</code>',
      '"multiprocessing spawns infinite processes / RuntimeError on Windows" → missing main guard',
      '"tests can\'t import my package" → use a src/ layout and install it in editable mode (<code>pip install -e .</code>)'
    ],
    code: [{ lang: 'python', run: true, title: 'Build a package in a temp folder, import it, and run it with -m semantics (runnable)', code: R`
      import importlib, runpy, sys, tempfile, textwrap
      from pathlib import Path

      root = Path(tempfile.mkdtemp())
      pkg = root / "shop"
      (pkg / "payments").mkdir(parents=True)
      files = {
          "shop/__init__.py": 'print("init shop")\nfrom .cart import Cart\n__all__ = ["Cart"]\n',
          "shop/cart.py": textwrap.dedent('''
              class Cart:
                  def __init__(self):
                      self.items = []
                  def add(self, name, price):
                      self.items.append((name, price))
                      return self
                  def total(self):
                      return sum(p for _, p in self.items)
          '''),
          "shop/payments/__init__.py": 'print("init shop.payments")\n',
          "shop/payments/card.py": textwrap.dedent('''
              from ..cart import Cart            # relative import: parent package
              print("card module, __name__ =", __name__)
              def charge(cart):
                  return f"charged {cart.total():.2f}"
              if __name__ == "__main__":
                  print(charge(Cart().add("demo", 9.5)))
          '''),
      }
      for rel, text in files.items():
          (root / rel).write_text(text, encoding="utf-8")

      sys.path.insert(0, str(root))
      importlib.invalidate_caches()

      from shop.payments import card      # runs shop/__init__, payments/__init__, card
      from shop import Cart               # re-exported by shop/__init__.py
      print(card.charge(Cart().add("pen", 20).add("book", 350)))
      print(sorted(k for k in sys.modules if k.startswith("shop")))

      print("--- now run it like: python -m shop.payments.card ---")
      sys.modules.pop("shop.payments.card")   # forget the imported copy, like a fresh "python -m"
      runpy.run_module("shop.payments.card", run_name="__main__")
    ` }],
    codeTitle: ['A real package, end to end'],
    viz: {
      title: 'Importing a dotted path: parents first, then the module',
      input: 'shop.payments.card',
      inputLabel: 'Dotted module path (1-4 parts), e.g. shop.payments.card or app.models',
      gen: pkgGen
    },
    examples: [
      { title: 'Predict the output: __name__ in both roles', html: R`<p>The same file prints a different <code>__name__</code> depending on how it is started. <code>runpy.run_path</code> runs a file as if it were the main script — exactly what <code>python file.py</code> does.</p>${H.table(['started as', '__name__', 'guarded block'], [['import greet', '"greet"', 'skipped'], ['python greet.py', '"__main__"', 'runs']])}`, code: { lang: 'python', run: true, code: R`
        import importlib, runpy, sys, tempfile
        from pathlib import Path
        d = Path(tempfile.mkdtemp())
        (d / "greet.py").write_text(
            'print("my __name__ is", __name__)\n'
            'if __name__ == "__main__":\n'
            '    print("running as a script!")\n', encoding="utf-8")
        sys.path.insert(0, str(d)); importlib.invalidate_caches()
        import greet                                          # my __name__ is greet
        runpy.run_path(str(d / "greet.py"), run_name="__main__")   # ... __main__ + script line
      ` } },
      { title: 'Relative import fails when you run the file directly', html: R`<p>Running a module inside a package as a plain file loses the package context: <code>__package__</code> is empty, so <code>..</code> means nothing. Running it as <code>-m</code> (simulated here with <code>runpy.run_module</code>) works. Rule: <b>run package code with python -m from the project root</b>.</p>`, code: { lang: 'python', run: true, code: R`
        import importlib, runpy, sys, tempfile
        from pathlib import Path
        root = Path(tempfile.mkdtemp())
        (root / "app").mkdir()
        (root / "app" / "__init__.py").write_text("", encoding="utf-8")
        (root / "app" / "util.py").write_text("X = 42\n", encoding="utf-8")
        (root / "app" / "tool.py").write_text("from .util import X\nprint('X is', X)\n", encoding="utf-8")
        try:
            runpy.run_path(str(root / "app" / "tool.py"), run_name="__main__")   # like: python app/tool.py
        except ImportError as e:
            print("ImportError:", e)
        sys.path.insert(0, str(root)); importlib.invalidate_caches()
        runpy.run_module("app.tool", run_name="__main__")                         # like: python -m app.tool
      ` } },
      { title: '__init__.py as a public API, and __all__', html: R`<p>Users should not need to know your internal file layout. Re-export the important names in <code>__init__.py</code>. <code>__all__</code> lists what <code>from pkg import *</code> exports (and documents your public API for tools).</p>`, code: { lang: 'python', run: true, code: R`
        import importlib, sys, tempfile
        from pathlib import Path
        root = Path(tempfile.mkdtemp())
        (root / "geom").mkdir()
        (root / "geom" / "shapes.py").write_text(
            "def area(r):\n    return 3.14159 * r * r\n\ndef _helper():\n    return 'private'\n", encoding="utf-8")
        (root / "geom" / "__init__.py").write_text(
            "from .shapes import area\n__all__ = ['area']\n", encoding="utf-8")
        sys.path.insert(0, str(root)); importlib.invalidate_caches()
        ns = {}
        exec("from geom import *", ns)
        print([k for k in ns if not k.startswith("__")])   # ['area']
        import geom
        print(round(geom.area(2), 2))
      ` } },
      { title: 'Making a package runnable with __main__.py', html: R`<p><code>python -m mytool</code> on a <b>package</b> runs <code>mytool/__main__.py</code>. That is how <code>python -m pip</code> and <code>python -m venv</code> work. For installed command-line tools, declare an entry point in <code>pyproject.toml</code> instead (<code>[project.scripts] mytool = "mytool.cli:main"</code>).</p>`, code: { lang: 'python', run: true, code: R`
        import importlib, runpy, sys, tempfile
        from pathlib import Path
        root = Path(tempfile.mkdtemp())
        (root / "mytool").mkdir()
        (root / "mytool" / "__init__.py").write_text("VERSION = '1.0'\n", encoding="utf-8")
        (root / "mytool" / "__main__.py").write_text(
            "from mytool import VERSION\nprint(f'mytool {VERSION} says hi')\n", encoding="utf-8")
        sys.path.insert(0, str(root)); importlib.invalidate_caches()
        runpy.run_module("mytool", run_name="__main__", alter_sys=True)   # like: python -m mytool
      ` } }
    ],
    deepDive: R`<p>🟣 <b>Package internals.</b></p>
      <ul>
        <li><b>__path__:</b> a package is just a module object that has a <code>__path__</code> attribute (list of folders). Submodules are searched only in <code>__path__</code>, not in sys.path. Namespace packages have a dynamic <code>__path__</code> that can combine folders from several sys.path entries (how <code>google.cloud.storage</code> and <code>google.cloud.pubsub</code> can be installed separately).</li>
        <li><b>Submodule binding:</b> after <code>import shop.cart</code>, Python sets the attribute <code>cart</code> on the <code>shop</code> package object. That is why <code>import shop.cart</code> makes <code>shop.cart</code> usable, and why a submodule imported anywhere becomes visible as an attribute of its package everywhere.</li>
        <li><b>Relative import resolution</b> uses <code>__package__</code> (and <code>__spec__.parent</code>): <code>from ..utils import x</code> inside <code>shop.payments.card</code> resolves to <code>shop.utils</code>. When a file is run as a script, <code>__package__</code> is empty (or None), hence the "no known parent package" error. Going above the top-level package raises "attempted relative import beyond top-level package".</li>
        <li><b>The double-import trap:</b> running <code>python shop/cart.py</code> while other code does <code>import shop.cart</code> creates TWO module objects (<code>__main__</code> and <code>shop.cart</code>) with two copies of every class and global — singletons duplicate and <code>isinstance</code> checks mysteriously fail.</li>
        <li><b>Heavy __init__.py:</b> everything in <code>__init__.py</code> runs on any import of any submodule. Importing large dependencies there slows every CLI start; libraries use lazy attributes via module-level <code>__getattr__</code> (PEP 562).</li>
        <li><b>src layout:</b> putting the package under <code>src/</code> prevents tests from accidentally importing the local folder instead of the installed package, catching packaging bugs (missing files) early. It is the layout recommended by the Python Packaging User Guide.</li>
      </ul>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> coding agents scaffold whole projects in seconds — <code>pyproject.toml</code>, <code>src/</code> layout, <code>__init__.py</code> files, a CLI entry point. Your job shifts from typing that structure to judging it.</p>
      <p><b>Use AI as a partner:</b> ask it to draw the import graph of your package and point out cycles or heavy imports in <code>__init__.py</code>; ask "what is the public API of this package?" and compare with <code>__all__</code>.</p>
      <p><b>Where AI goes wrong:</b> it mixes <code>sys.path.append(os.path.dirname(__file__) + "/..")</code> hacks into files instead of using <code>-m</code> or an editable install; it writes relative imports in top-level scripts; it forgets the main guard in multiprocessing examples; and it sometimes creates both <code>utils.py</code> and a <code>utils/</code> package in the same folder (the package wins, confusingly).</p>
      <p><b>What you must still own:</b> explaining <code>__name__</code>, choosing absolute vs relative imports, knowing why <code>python -m</code> exists, and keeping package boundaries clean so humans and agents can both navigate the code.</p>`,
    problems: [{
      title: 'Resolve a Relative Import to an Absolute Name',
      level: 'Medium', tags: ['packages', 'relative imports', 'strings'], companies: ['Meta', 'Dropbox', 'Instagram'],
      statement: R`<p>Write <code>resolve(package, target)</code> that mimics <code>importlib.util.resolve_name</code>: given the current package (e.g. <code>"shop.payments"</code>) and a relative target (e.g. <code>"..utils"</code>), return the absolute module name (<code>"shop.utils"</code>). One leading dot = the current package, each extra dot = go up one level. A target without leading dots is already absolute. Going above the top raise <code>ImportError</code>.</p>`,
      constraints: R`Package depth ≤ 20; target has at most 21 leading dots; names are valid identifiers.`,
      example: R`<p><code>resolve("shop.payments", ".card")</code> → ${H.c('g', '"shop.payments.card"')}; <code>resolve("shop.payments", "..utils")</code> → ${H.c('g', '"shop.utils"')}; <code>resolve("shop.payments", "..")</code> → ${H.c('g', '"shop"')}; <code>resolve("shop", "...x")</code> → ${H.c('r', 'ImportError')} (beyond top-level package).</p>`,
      brute: {
        why: R`<p>Repeatedly use string replace/rfind in a loop with special cases for "." and ".." and an empty remainder. It quickly grows a pile of if-statements and gets the edge cases (bare dots, too many dots) wrong.</p>`,
        code: { lang: 'python', run: true, code: R`
          def resolve_brute(package, target):
              if target.startswith(".."):
                  return package[:package.rfind(".")] + "." + target[2:]   # only handles 2 dots, breaks on ".."
              if target.startswith("."):
                  return package + target
              return target

          print(resolve_brute("shop.payments", "..utils"), resolve_brute("shop.payments", ".card"))
        ` }
      },
      mcq: { q: 'Code in module <code>a.b.c</code> (so its package is <code>a.b</code>) says <code>from .. import x</code>. Where does Python look for x?', options: ['In package a (one level above a.b)', 'In package a.b', 'In module a.b.c', 'In the script folder on sys.path'], answer: 0, explain: 'The current package of module a.b.c is a.b. One dot means a.b itself; each extra dot climbs one level, so two dots mean a. Three dots would go beyond the top-level package and raise ImportError.' },
      hints: [
        R`<p>Hint 1: Count the leading dots: <code>level = len(target) - len(target.lstrip("."))</code>; the rest is the name.</p>`,
        R`<p>Hint 2: Going up <code>level - 1</code> times from the package: <code>bits = package.rsplit(".", level - 1)</code>. If there are fewer parts than needed, it is beyond the top.</p>`,
        R`<p>Hint 3: Base = <code>bits[0]</code>; answer is <code>base + "." + name</code> if name else base. Level 0 → return target unchanged. Verify with <code>importlib.util.resolve_name</code>.</p>`
      ],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [['resolve(\'shop.payments\', \'.card\')'], 'shop.payments.card'],
          [['resolve(\'shop.payments\', \'..utils\')'], 'shop.utils'],
          [['resolve(\'shop.payments\', \'..\')'], 'shop'],
          [['resolve(\'shop.payments\', \'json\')'], 'json'],
          [['resolve(\'shop\', \'...x\')'], '!ImportError'],
          [['resolve(\'shop\', \'.x\')'], 'shop.x'],
          [['resolve(\'shop\', \'.\')'], 'shop'],
          [['resolve(\'a.b.c\', \'...z\')'], 'a.z'],
          [['resolve(\'a.b.c\', \'....z\')'], '!ImportError'],
          [['resolve(\'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t\', \'...................x\')'], 'a.b.x'],
          [['resolve(\'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t\', \'....................x\')'], 'a.x'],
          [['resolve(\'shop\', \'os.path\')'], 'os.path'],
          [['resolve(\'a.b\', \'..\')'], 'a']
        ],
        harness: {
          python: 'def t_val(src):\n' +
            '    try:\n' +
            '        return eval(src)\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: R`<p>Split off the dots, climb the package path with one <code>rsplit</code>, and join the remaining name. This is exactly the algorithm CPython uses (<code>_resolve_name</code> in importlib).</p>`,
        code: { lang: 'python', run: true, code: R`
import importlib.util

def resolve(package: str, target: str) -> str:
    level = len(target) - len(target.lstrip("."))
    name = target[level:]
    if level == 0:
        return target                         # already absolute
    bits = package.rsplit(".", level - 1)     # climb level-1 times
    if len(bits) < level:
        raise ImportError("attempted relative import beyond top-level package")
    base = bits[0]
    return f"{base}.{name}" if name else base

cases = [("shop.payments", ".card"), ("shop.payments", "..utils"),
         ("shop.payments", ".."), ("shop.payments", "json")]
for pkg, tgt in cases:
    mine = resolve(pkg, tgt)
    ref = importlib.util.resolve_name(tgt, pkg)
    print(f"{tgt:>8} in {pkg} -> {mine}  (stdlib agrees: {mine == ref})")
try:
    resolve("shop", "...x")
except ImportError as e:
    print("ImportError:", e)
` },
        dry: { head: ['package', 'target', 'level', 'rsplit result', 'answer'], rows: [
          ['shop.payments', '.card', '1', "['shop.payments']", 'shop.payments.card'],
          ['shop.payments', '..utils', '2', "['shop', 'payments']", 'shop.utils'],
          ['shop.payments', '..', '2', "['shop', 'payments']", 'shop'],
          ['shop', '...x', '3', "['shop'] (needs 3 parts)", '<span class="c-r">ImportError</span>']
        ] },
        complexity: R`<p>O(L) time and space for name length L.</p>`,
        followUps: ['Given a file path and project root, compute the module name (inverse problem)', 'Why does PEP 8 prefer absolute imports?', 'How does __spec__.parent differ from __package__?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8: pip, virtual environments and dependencies
     ====================================================================== */
  function venvGen(input) {
    var pkg = String(input === undefined ? 'requests' : input).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{0,30}$/.test(pkg)) throw new Error('Type a package name such as requests, flask or pandas');
    var deps = { requests: ['charset-normalizer', 'idna', 'urllib3', 'certifi'], flask: ['werkzeug', 'jinja2', 'itsdangerous', 'click', 'blinker', 'markupsafe'], pandas: ['numpy', 'python-dateutil', 'pytz', 'tzdata', 'six'], httpx: ['anyio', 'certifi', 'httpcore', 'h11', 'idna'] }[pkg] || [];
    var nodes = [
      { id: 'T', label: 'Terminal', x: 10, y: 10, shape: 'box', w: 16 },
      { id: 'SYS', label: 'System Python /usr/bin/python3', x: 42, y: 10, shape: 'box', w: 34 },
      { id: 'V', label: 'project/.venv/bin/python', x: 42, y: 36, shape: 'box', w: 30 },
      { id: 'SP', label: '.venv site-packages', x: 42, y: 60, shape: 'box', w: 24 },
      { id: 'PIP', label: 'pip (resolver)', x: 80, y: 36, shape: 'box', w: 18 },
      { id: 'PYPI', label: 'PyPI (pypi.org)', x: 80, y: 60, shape: 'box', w: 20 }
    ];
    var frames = [], site = [], term = [];
    function fr(hl, edges, ehl, narr, cmd, extra) {
      if (cmd) term.push(cmd);
      var ps = [{ type: 'graph', label: 'Where things live', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: ehl }];
      ps.push({ type: 'set', label: '.venv site-packages contents', items: site.slice(), hl: (extra && extra.sh) || {} });
      ps.push({ type: 'text', label: 'Terminal', html: '<pre>' + esc(term.join('\n') || '$') + '</pre>' });
      frames.push({ narr: narr, parts: ps });
    }
    fr({ T: 'cur', SYS: 'cur' }, [['T', 'SYS', 'python']], {}, 'Before any venv, typing <code>python</code> runs the <b>system Python</b>. Installing packages into it is risky: every project on the machine shares one set of versions, and on many Linux distros pip refuses (<code>error: externally-managed-environment</code>, PEP 668).', '$ which python3\n/usr/bin/python3');
    site = ['pip'];
    fr({ SYS: 'done', V: 'ok', SP: 'ok' }, [['T', 'SYS', 'python -m venv'], ['SYS', 'V', 'creates'], ['V', 'SP', '']], { 'SYS-V': 'ok' }, '<code>python -m venv .venv</code> creates a folder with: <code>pyvenv.cfg</code> (points to the base Python), <code>bin/python</code> (a link to the base interpreter; <code>Scripts\\python.exe</code> on Windows) and an <b>empty</b> <code>site-packages</code> (just pip). No copy of the standard library is made: it is reused from the base install.', '$ python3 -m venv .venv', { sh: { pip: 'ok' } });
    fr({ T: 'ok', V: 'cur' }, [['T', 'V', 'python'], ['V', 'SP', 'imports from']], { 'T-V': 'ok' }, '<code>source .venv/bin/activate</code> (Windows: <code>.venv\\Scripts\\activate</code>) only <b>prepends .venv/bin to PATH</b> and changes your prompt. Now <code>python</code> and <code>pip</code> mean the venv\'s ones. (You can skip activation and call <code>.venv/bin/python</code> directly — same effect.)', '$ source .venv/bin/activate\n(.venv) $ which python\n/home/me/project/.venv/bin/python');
    fr({ V: 'done', PIP: 'cur', PYPI: 'cur' }, [['T', 'V', ''], ['V', 'PIP', 'python -m pip'], ['PIP', 'PYPI', 'query index']], { 'V-PIP': 'ok', 'PIP-PYPI': 'cur' }, '<code>python -m pip install ' + esc(pkg) + '</code>: pip asks the package index (PyPI) for the list of available releases of <b>' + esc(pkg) + '</b> and picks the newest one that satisfies your constraints and has a <b>wheel</b> compatible with this Python version and OS (or falls back to a source distribution).', '(.venv) $ python -m pip install ' + pkg);
    fr({ PIP: 'cur', PYPI: 'ok' }, [['V', 'PIP', ''], ['PIP', 'PYPI', 'metadata']], { 'PIP-PYPI': 'ok' }, deps.length ? 'pip reads the package metadata (<code>Requires-Dist</code>) and finds its own dependencies: <b>' + esc(deps.join(', ')) + '</b>. The resolver must find one version of each that satisfies <b>every</b> requirement at once, backtracking if two packages disagree.' : 'pip reads the package metadata (<code>Requires-Dist</code>). This demo has no dependency list for "' + esc(pkg) + '"; real packages usually pull in several. (If the name does not exist on PyPI, pip stops with <code>ERROR: No matching distribution found</code> — double-check spelling, typo-squatted names are a real attack.)', null,
      { sh: {} });
    var all = [pkg].concat(deps), sh = {};
    all.forEach(function (d) { site.push(d); sh[d] = 'ok'; });
    fr({ PYPI: 'done', SP: 'ok', PIP: 'ok' }, [['PIP', 'PYPI', 'download wheels'], ['PIP', 'SP', 'unpack']], { 'PIP-SP': 'ok' }, 'pip downloads the wheels and unpacks them into <b>.venv/lib/python3.x/site-packages</b> — nowhere else. The system Python never sees them. Any console scripts (like <code>flask</code>) go into <code>.venv/bin</code>.', 'Successfully installed ' + all.join(' '), { sh: sh });
    var frozen = all.slice().sort().map(function (d, i) { return d + '==' + ['2.32.3', '3.4.1', '2.3.0', '1.26.4', '2024.8.30', '3.10', '2.9.0', '1.9.0'][i % 8]; });
    fr({ V: 'cur', SP: 'sel' }, [['V', 'SP', 'pip freeze']], { 'V-SP': 'sel' }, '<code>pip freeze &gt; requirements.txt</code> writes the <b>exact</b> version of everything installed (versions shown here are illustrative). Commit that file; a teammate runs <code>pip install -r requirements.txt</code> in their own venv and gets the same set. Modern projects declare loose dependencies in <code>pyproject.toml</code> and keep a separate lock file.', '(.venv) $ pip freeze > requirements.txt\n(.venv) $ cat requirements.txt\n' + frozen.join('\n'), { sh: (function () { var h = {}; site.forEach(function (s) { h[s] = 'sel'; }); return h; })() });
    fr({ SYS: 'bad', T: 'cur' }, [['T', 'SYS', 'python']], { 'T-SYS': 'bad' }, '<code>deactivate</code> restores PATH. Now <code>python -c "import ' + esc(pkg.replace(/-/g, '_')) + '"</code> uses the system Python, which does not have it: <code>ModuleNotFoundError</code>. That is isolation working as designed — and the #1 cause of "but I installed it!" confusion: you installed into a different interpreter.', '(.venv) $ deactivate\n$ python3 -c "import ' + pkg.replace(/-/g, '_') + '"\nModuleNotFoundError: No module named \'' + pkg.replace(/-/g, '_') + '\'');
    fr({ V: 'sel' }, [['T', 'V', '']], {}, 'Rules of thumb: <b>one venv per project</b>, never commit the <code>.venv</code> folder (add it to .gitignore; it is disposable and machine-specific), always use <code>python -m pip</code> so pip matches the interpreter, and delete + recreate a broken venv instead of repairing it.', '$ rm -rf .venv && python3 -m venv .venv  # cheap to rebuild');
    return frames;
  }

  topics.push({
    title: 'pip, Virtual Environments & Dependency Management (venv, requirements, pyproject, uv)',
    analogy: R`<p>Each project gets its <b>own kitchen pantry</b>. Recipe A needs flour version 1, recipe B needs flour version 2; if both cooked from one shared pantry, someone would ruin the other's cake. A <b>virtual environment</b> is a private pantry per project. <b>pip</b> is the grocery delivery service that fetches ingredients from the big supermarket (<b>PyPI</b>, the Python Package Index) and puts them into whichever pantry you are standing in. <code>requirements.txt</code> is the <b>shopping list</b> you hand a friend so they can stock an identical pantry.</p>`,
    explain: R`<p>🟢 <b>Why venvs exist.</b> Packages you install go into a folder called <code>site-packages</code>. Without a venv there is one per Python installation, shared by every project. Project A needs <code>django 4</code>, project B needs <code>django 5</code> → conflict. A virtual environment is a lightweight folder with its own <code>site-packages</code>, so each project's packages are isolated.</p>
      <pre># create (once per project)
python -m venv .venv
# activate (per terminal session)
source .venv/bin/activate          # macOS / Linux
.venv\Scripts\activate             # Windows (PowerShell / cmd)
# install, inspect, save, restore
python -m pip install requests "pandas&gt;=2.2,&lt;3"
python -m pip list
python -m pip show requests
python -m pip freeze &gt; requirements.txt
python -m pip install -r requirements.txt
deactivate</pre>
      <p>🔵 <b>Version specifiers</b> (PEP 440):</p>
      ${H.table(['Spec', 'Meaning', 'Example matches'], [
        ['<code>==2.32.3</code>', 'exactly this (a "pin")', '2.32.3 only'],
        ['<code>&gt;=2.0,&lt;3</code>', 'range (comma = AND)', '2.0 … 2.99'],
        ['<code>~=2.2</code>', 'compatible release: &gt;=2.2, ==2.*', '2.2, 2.9 (not 3.0)'],
        ['<code>~=2.2.1</code>', '&gt;=2.2.1, ==2.2.*', '2.2.1, 2.2.9 (not 2.3)'],
        ['<code>!=1.5</code>', 'anything but', 'skip a broken release'],
        ['<code>requests[socks]</code>', 'with optional "extra" deps', 'requests + PySocks']
      ])}
      <p><b>Two kinds of dependency lists:</b> <b>abstract</b> ("my library needs <code>requests&gt;=2.28</code>") goes in <code>pyproject.toml</code> under <code>[project] dependencies</code>; <b>concrete/locked</b> ("this deployment uses exactly these 37 versions") goes in <code>requirements.txt</code> from <code>pip freeze</code> or a lock file (<code>uv.lock</code>, <code>poetry.lock</code>, or the standard <code>pylock.toml</code> from PEP 751). Libraries keep ranges loose; applications pin everything for reproducible deploys.</p>
      <p><b>The 2026 toolbox:</b> <code>venv</code> + <code>pip</code> are built in and always available. <b>uv</b> (written in Rust) has become the popular all-in-one replacement: <code>uv venv</code>, <code>uv pip install</code>, <code>uv add requests</code>, <code>uv lock</code>, <code>uv run script.py</code> — and it is 10–100× faster. <b>pipx</b> / <code>uv tool install</code> install command-line apps (black, ruff, httpie) in their own isolated envs. <b>conda</b> is common in data science for non-Python dependencies (CUDA, MKL). Poetry and Hatch are other project managers you may meet.</p>
      <p><b>Golden rule:</b> use <code>python -m pip</code> (not bare <code>pip</code>) so packages go into the same interpreter that will import them. Never <code>sudo pip install</code>.</p>`,
    clues: [
      '"works on my machine but not on the server" → missing pinned requirements / lock file',
      '"ModuleNotFoundError right after pip install" → pip and python belong to different interpreters; use <code>python -m pip</code>',
      '"error: externally-managed-environment" → PEP 668: create a venv (or pipx for tools)',
      '"two projects need different versions of the same library" → one venv per project',
      '"reproducible builds / CI" → lock file + <code>pip install -r</code> (or <code>uv sync</code>) with hashes',
      '"install my own package for development" → <code>pip install -e .</code> (editable install)',
      '"which Python am I running?" → <code>sys.executable</code>, <code>sys.prefix</code> vs <code>sys.base_prefix</code>'
    ],
    code: [
      { lang: 'python', run: true, title: 'Am I in a venv? Where do packages go? (runnable)', code: R`
        import sys, sysconfig
        from importlib import metadata

        in_venv = sys.prefix != sys.base_prefix        # True inside a virtual environment
        print("interpreter :", sys.executable)
        print("in a venv?  :", in_venv)
        print("version     :", sys.version.split()[0])
        print("site-packages:", sysconfig.get_paths()["purelib"])

        # Installed distributions and their versions, read from package metadata
        names = sorted({d.metadata["Name"] for d in metadata.distributions() if d.metadata["Name"]})
        print("installed (first 5):", names[:5])
        try:
            print("pip version:", metadata.version("pip"))
        except metadata.PackageNotFoundError:
            print("pip is not installed in this environment")
      ` },
      { lang: 'bash', title: 'Everyday commands: venv + pip, and the uv equivalents', code: R`
        # --- classic, built into Python ---
        python3 -m venv .venv
        source .venv/bin/activate              # Windows: .venv\Scripts\activate
        python -m pip install --upgrade pip
        python -m pip install "requests>=2.31,<3" rich
        python -m pip freeze > requirements.txt
        python -m pip install -r requirements.txt
        python -m pip install -e .             # editable install of your own project
        deactivate

        # --- uv (fast, all-in-one; 2024+) ---
        uv venv                                # creates .venv
        uv pip install -r requirements.txt     # drop-in pip replacement
        uv init myapp && cd myapp              # new project with pyproject.toml
        uv add requests                        # adds to pyproject + updates uv.lock
        uv run python main.py                  # runs inside the synced env
        uv tool install ruff                   # isolated CLI tool (like pipx)
      ` },
      { lang: 'text', title: 'pyproject.toml for a small application', code: R`
        [project]
        name = "shop"
        version = "0.1.0"
        requires-python = ">=3.11"
        dependencies = [
            "requests>=2.31,<3",
            "rich~=13.7",
        ]

        [project.optional-dependencies]
        dev = ["pytest>=8", "ruff"]

        [project.scripts]
        shop = "shop.cli:main"        # installs a 'shop' command

        [build-system]
        requires = ["hatchling"]
        build-backend = "hatchling.build"
      ` }
    ],
    codeTitle: ['Detect your environment', 'Command cheat sheet', 'Declaring dependencies'],
    viz: {
      title: 'Create a venv, install a package, freeze, deactivate',
      input: 'requests',
      inputLabel: 'Package to install (requests, flask, pandas, httpx — or any name)',
      gen: venvGen
    },
    examples: [
      { title: '"I installed it but Python cannot find it"', html: R`<p>The most common beginner problem. <code>pip</code> on your PATH belongs to one Python, <code>python</code> to another (system vs venv vs Homebrew vs Microsoft Store). Diagnose by printing the interpreter from inside Python, and always install with that exact interpreter.</p>${H.table(['command', 'shows'], [['<code>python -c "import sys; print(sys.executable)"</code>', 'which interpreter runs'], ['<code>python -m pip --version</code>', 'pip AND the Python it belongs to'], ['<code>which -a python pip</code> (Win: <code>where</code>)', 'all candidates on PATH']])}`, code: { lang: 'python', run: true, code: R`
        import sys
        print(sys.executable)          # install with: <this path> -m pip install <pkg>
        print(sys.prefix == sys.base_prefix and "system/base interpreter" or "virtual environment")
      ` } },
      { title: 'Reading a requirements.txt', html: R`<p>Each line is a requirement: a name, optional extras, optional version specifiers, optional environment marker after <code>;</code>. Comments start with <code>#</code>; <code>-r other.txt</code> includes another file. Hashes (<code>--hash=sha256:…</code>) make pip refuse tampered downloads.</p>`, code: { lang: 'text', code: R`
        # web app runtime deps (pinned by pip freeze)
        requests==2.32.3
        urllib3==2.2.3
        rich[jupyter]==13.9.2
        uvloop==0.21.0 ; sys_platform != "win32"
        -r requirements-base.txt
      ` } },
      { title: 'Compatible release ~= explained with numbers', html: R`<p><code>~=X.Y</code> means "at least X.Y, but stay on major X". <code>~=X.Y.Z</code> means "at least X.Y.Z, but stay on X.Y". It is how you accept bug-fix releases automatically without accepting breaking ones (assuming the project follows semantic versioning).</p>${H.table(['spec', '2.1', '2.2', '2.2.5', '2.9', '3.0'], [['~=2.2', '✗', '✓', '✓', '✓', '✗'], ['~=2.2.0', '✗', '✓', '✓', '✗', '✗'], ['&gt;=2.2,&lt;3', '✗', '✓', '✓', '✓', '✗']])}`, code: { lang: 'python', run: true, code: R`
        def as_tuple(v):
            return tuple(int(p) for p in v.split("."))

        def compatible(version, spec):
            """~= check for plain numeric versions, e.g. compatible('2.9', '2.2') -> True."""
            v, s = as_tuple(version), as_tuple(spec)
            prefix = s[:-1]                       # all but the last part must match
            return v >= s and v[:len(prefix)] == prefix

        for v in ["2.1", "2.2", "2.2.5", "2.9", "3.0"]:
            print(v, compatible(v, "2.2"), compatible(v, "2.2.0"))
      ` } },
      { title: 'PEP 723: a single script that declares its own dependencies', html: R`<p>Since 2024, a standalone script can carry an inline metadata block. Tools like <code>uv run script.py</code> or <code>pipx run</code> read it, build a throwaway environment with those packages, and run the script — perfect for sharing one-file utilities and AI-generated scripts without polluting any environment.</p>`, code: { lang: 'python', code: R`
        # /// script
        # requires-python = ">=3.11"
        # dependencies = [
        #   "requests<3",
        #   "rich",
        # ]
        # ///
        import requests
        from rich import print

        print(requests.get("https://peps.python.org/api/peps.json", timeout=10).status_code)
      ` } }
    ],
    deepDive: R`<p>🟣 <b>How it really works.</b></p>
      <ul>
        <li><b>A venv is tiny:</b> at startup, Python looks for <code>pyvenv.cfg</code> next to (or one level above) the executable. If found, it sets <code>sys.prefix</code> to the venv folder and uses the venv's <code>site-packages</code>, while <code>sys.base_prefix</code> still points to the real installation whose standard library it reuses. Activation scripts only edit <code>PATH</code> and the prompt — that is why calling <code>.venv/bin/python</code> directly works without activating.</li>
        <li><b>Wheels vs sdists:</b> a wheel (<code>.whl</code>) is a pre-built zip that is simply unpacked; its file name carries compatibility tags like <code>cp313-cp313-manylinux_2_17_x86_64</code>. An sdist (source distribution) must be built locally using the backend declared in <code>[build-system]</code> (setuptools, hatchling, flit, maturin…) — slow and may need compilers.</li>
        <li><b>The resolver:</b> since pip 20.3, pip uses a backtracking resolver that finds a set of versions satisfying all constraints together (or reports a conflict). uv uses a PubGrub-based resolver with clearer conflict explanations. Resolution is an NP-hard problem in general, which is why huge dependency trees can be slow.</li>
        <li><b>Supply-chain security:</b> anyone can publish to PyPI. Defences: pin versions and use <code>--require-hashes</code>, review new dependencies, prefer trusted publishing (PyPI supports OIDC from CI and digital attestations), scan with <code>pip-audit</code>, and beware of typosquatting (<code>reqeusts</code>) and "slopsquatting" (names hallucinated by AI and then registered by attackers).</li>
        <li><b>PEP 668 (externally managed):</b> Debian/Ubuntu/Fedora and Homebrew mark their system Python as externally managed, so <code>pip install</code> outside a venv errors out instead of breaking OS tools. The override flag <code>--break-system-packages</code> exists — its name is the warning.</li>
        <li><b>Editable installs:</b> <code>pip install -e .</code> installs a pointer (a <code>.pth</code> file or import hook, PEP 660) to your source folder, so edits are picked up without reinstalling. <code>.pth</code> files in site-packages are processed at startup and can add paths or even run code — another place to look when debugging odd imports.</li>
        <li><b>Docker and CI:</b> in containers you still often use a venv (or <code>uv sync</code>) to separate app packages from OS packages; cache the wheel/uv cache between builds for speed.</li>
      </ul>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> agents now create projects, add dependencies and run <code>uv add</code> / <code>pip install</code> for you. Environment setup errors ("No module named X", resolver conflicts) are classic paste-the-error-into-chat problems that AI solves well.</p>
      <p><b>Use AI as a partner:</b> ask it to explain a resolver conflict message, to convert a <code>requirements.txt</code> into a <code>pyproject.toml</code>, or to write a PEP 723 header for a script so others can run it with one command.</p>
      <p><b>Where AI goes wrong:</b> it suggests <code>sudo pip install</code> or <code>--break-system-packages</code>, recommends deprecated tools (<code>setup.py install</code>, <code>easy_install</code>), invents package names that do not exist (and attackers may have registered them!), and pins ancient versions it saw in training data. Agents may also install packages globally instead of inside the project's venv.</p>
      <p><b>What you must still own:</b> knowing which interpreter and environment are active, reviewing every new dependency (is it real, maintained, licensed suitably, safe?), and keeping builds reproducible with lock files. In a world of AI-generated code, dependency hygiene is a security skill.</p>`,
    problems: [{
      title: 'Parse a requirements.txt into Structured Data',
      level: 'Medium', tags: ['strings', 'parsing', 'files', 'packaging'], companies: ['Snyk', 'GitHub', 'Red Hat'],
      statement: R`<p>Write <code>parse_requirements(text)</code> that turns requirements-file text into a list of dicts <code>{"name", "extras", "spec", "marker"}</code>. Rules: ignore blank lines, full-line comments and inline comments (<code> #</code> preceded by whitespace); skip option lines starting with <code>-</code> (like <code>-r</code>, <code>--hash</code>); names are normalised to lowercase with runs of <code>-_.</code> turned into <code>-</code> (PEP 503); extras are inside <code>[ ]</code>; the marker is the part after <code>;</code>.</p>`,
      constraints: R`Up to 10<sup>4</sup> lines; each line ≤ 500 characters; you do not need to support line continuations or URLs.`,
      example: R`<p>Line <code>Rich[jupyter]&gt;=13 ; python_version &gt;= "3.10"   # pretty output</code> → ${H.c('g', "{'name': 'rich', 'extras': ['jupyter'], 'spec': '>=13', 'marker': 'python_version >= \"3.10\"'}")}. <code>Typing_Extensions==4.12.2</code> → name ${H.c('g', "'typing-extensions'")}. <code>-r base.txt</code> → skipped.</p>`,
      brute: {
        why: R`<p>Split every line on <code>==</code> only. It breaks on <code>&gt;=</code>, <code>~=</code>, extras, markers and comments, and keeps names in their original case so <code>Django</code> and <code>django</code> look like different packages.</p>`,
        code: { lang: 'python', run: true, code: R`
          def parse_brute(text):
              out = {}
              for line in text.splitlines():
                  if "==" in line:
                      name, ver = line.split("==")
                      out[name] = ver            # comments and markers end up in ver
              return out

          print(parse_brute("Requests==2.32.3  # http\nrich>=13\n"))
        ` }
      },
      mcq: { q: 'Which string method splits <code>"rich[jupyter]&gt;=13 ; os_name == \'nt\'"</code> into requirement and marker most simply?', options: ['<code>line.partition(";")</code>', '<code>line.split()</code>', '<code>line.strip(";")</code>', '<code>line.find("[")</code>'], answer: 0, explain: 'partition returns (before, sep, after) and never raises; if there is no ";" the marker part is just an empty string.' },
      hints: [
        R`<p>Hint 1: Process line by line: strip; drop inline comments with <code>re.split(r"\s+#", line, maxsplit=1)[0]</code> (a # attached to text, as in a URL fragment, is kept); skip empty lines and lines starting with <code>-</code>.</p>`,
        R`<p>Hint 2: <code>req, _, marker = line.partition(";")</code>. In <code>req</code>, the name is the leading run of letters/digits/<code>-_.</code>; then optional <code>[extras]</code>; the rest is the version spec.</p>`,
        R`<p>Hint 3: A regex like <code>^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(\[[^\]]*\])?\s*(.*)$</code> captures all three. Normalise with <code>re.sub(r"[-_.]+", "-", name).lower()</code>. Remove spaces inside the spec.</p>`
      ],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [
            [
              'parse_requirements(\'\\n# runtime\\nRequests==2.32.3            # http client\\nRich[jupyter] >= 13 ; python_version >= "3.10"\\nTyping_Extensions==4.12.2\\n-r base.txt\\nuvloop ; sys_platform != "win32"\\n\')'
            ],
            [
              { name: 'requests', extras: [], spec: '==2.32.3', marker: '' },
              { name: 'rich', extras: ['jupyter'], spec: '>=13', marker: 'python_version >= "3.10"' },
              { name: 'typing-extensions', extras: [], spec: '==4.12.2', marker: '' },
              { name: 'uvloop', extras: [], spec: '', marker: 'sys_platform != "win32"' }
            ]
          ],
          [
            ['parse_requirements(\'Rich[jupyter]>=13 ; python_version >= "3.10"   # pretty output\')'],
            [{ name: 'rich', extras: ['jupyter'], spec: '>=13', marker: 'python_version >= "3.10"' }]
          ],
          [['parse_requirements(\'\')'], []],
          [['parse_requirements(\'# only a comment\\n\\n   \\n\')'], []],
          [['parse_requirements(\'-r base.txt\\n--hash=sha256:abc\\n-e .\')'], []],
          [
            ['parse_requirements(\'Foo__Bar.baz==1\')'],
            [{ name: 'foo-bar-baz', extras: [], spec: '==1', marker: '' }]
          ],
          [
            ['parse_requirements(\'pkg[a, b]==1.0\')'],
            [{ name: 'pkg', extras: ['a', 'b'], spec: '==1.0', marker: '' }]
          ],
          [
            ['parse_requirements(\'pkg >= 1.0 , < 2\')'],
            [{ name: 'pkg', extras: [], spec: '>=1.0,<2', marker: '' }]
          ],
          [['parse_requirements(\'pkg\')'], [{ name: 'pkg', extras: [], spec: '', marker: '' }]],
          [['parse_requirements(\'pkg==1 #c\')'], [{ name: 'pkg', extras: [], spec: '==1', marker: '' }]],
          [
            ['parse_requirements(\'pkg # only comment\')'],
            [{ name: 'pkg', extras: [], spec: '', marker: '' }]
          ],
          [
            ['parse_requirements(\'pkg ; python_version < "3.9" and os_name == "nt"\')'],
            [{ name: 'pkg', extras: [], spec: '', marker: 'python_version < "3.9" and os_name == "nt"' }]
          ],
          [['parse_requirements(\'a-b_c.d\')'], [{ name: 'a-b-c-d', extras: [], spec: '', marker: '' }]],
          [
            ['parse_requirements(\'  Django>=4.2,<5.0  \\r\\n\')'],
            [{ name: 'django', extras: [], spec: '>=4.2,<5.0', marker: '' }]
          ],
          [['parse_requirements(\'pkg[]==1\')'], [{ name: 'pkg', extras: [], spec: '==1', marker: '' }]],
          [['parse_requirements(\'@@@\')'], '!ValueError'],
          [['len(parse_requirements(\'pkg==1\\n\' * 10000))'], 10000],
          [['parse_requirements(\'pkg==1\\n\' * 10000)[-1][\'name\']'], 'pkg']
        ],
        harness: {
          python: 'def t_val(src):\n' +
            '    try:\n' +
            '        return eval(src)\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: R`<p>Line-oriented parsing with <code>partition</code> for the marker and one anchored regular expression for name/extras/spec, followed by PEP 503 name normalisation. Real tools should use the <code>packaging</code> library (<code>packaging.requirements.Requirement</code>), but writing it once teaches you the format.</p>`,
        code: { lang: 'python', run: true, code: R`
import re

REQ = re.compile(r"^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(\[[^\]]*\])?\s*(.*)$")

def normalise(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()      # PEP 503

def parse_requirements(text: str):
    result = []
    for raw in text.splitlines():
        line = re.split(r"\s+#", raw, maxsplit=1)[0].strip()  # inline comment
        if not line or line.startswith(("#", "-")):
            continue                                  # blank, comment, option
        req, _, marker = line.partition(";")
        m = REQ.match(req.strip())
        if not m:
            raise ValueError(f"cannot parse: {raw!r}")
        name, extras, spec = m.groups()
        result.append({
            "name": normalise(name),
            "extras": [e.strip() for e in extras[1:-1].split(",") if e.strip()] if extras else [],
            "spec": spec.replace(" ", ""),
            "marker": marker.strip(),
        })
    return result

sample = """
# runtime
Requests==2.32.3            # http client
Rich[jupyter] >= 13 ; python_version >= "3.10"
Typing_Extensions==4.12.2
-r base.txt
uvloop ; sys_platform != "win32"
"""
for r in parse_requirements(sample):
    print(r)
` },
        dry: { head: ['line', 'after comment strip', 'name / extras / spec', 'marker'], rows: [
          ['# runtime', '(empty → skip)', '—', '—'],
          ['Requests==2.32.3  # http client', 'Requests==2.32.3', 'requests / [] / ==2.32.3', "''"],
          ['Rich[jupyter] &gt;= 13 ; python_version …', 'same', 'rich / [jupyter] / &gt;=13', 'python_version &gt;= "3.10"'],
          ['-r base.txt', 'starts with - → skip', '—', '—'],
          ['uvloop ; sys_platform != "win32"', 'same', "uvloop / [] / ''", 'sys_platform != "win32"']
        ] },
        complexity: R`<p>O(total characters) time and output size.</p>`,
        followUps: ['Detect the same package listed twice with conflicting pins', 'Evaluate markers for the current machine (packaging.markers)', 'Support backslash line continuations and --hash options']
      }
    }]
  });

  /* ======================================================================
     PRACTICE (Easy → Medium → Hard)
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: Slicing & String Methods',
    level: 'Easy', tags: ['predict the output', 'slicing', 'string methods'], companies: ['TCS', 'Accenture', 'Amazon'],
    statement: R`<p>Without running it, write down exactly what each line prints. Then check with the solution.</p>
      <pre>s = "interview"
print(s[2:5])                     # 1
print(s[-4:])                     # 2
print(s[::3])                     # 3
print(s[5:1:-1])                  # 4
print(repr(s[100:]))              # 5
print("a-b-c".split("-", 1))      # 6
print("Hello".replace("l", "L", 1))  # 7
print("-".join("abc"))            # 8
print("they're".title())          # 9
print(len("café".encode()))       # 10</pre>`,
    constraints: R`Python 3.10+; all lines run without error.`,
    example: R`${H.arr(['i', 'n', 't', 'e', 'r', 'v', 'i', 'e', 'w'], { label: 's', hl: { 2: 'g', 3: 'g', 4: 'g' } })}<p>Line 1: start 2 included, stop 5 excluded → boxes 2, 3, 4 → ${H.c('g', 'ter')}.</p>`,
    brute: {
      why: R`<p>Guessing from "feel" causes off-by-one errors, especially with negative steps. A safe slow method is to expand a slice by hand into the list of indices it visits, exactly like this helper does — then read the characters.</p>`,
      code: { lang: 'python', run: true, code: R`
        def slice_by_hand(s, start, stop, step):
            # range() follows the same rules as slicing once start/stop are resolved
            idx = list(range(*slice(start, stop, step).indices(len(s))))
            return idx, "".join(s[i] for i in idx)

        print(slice_by_hand("interview", 5, 1, -1))   # ([5, 4, 3, 2], 'vret')
        print(slice_by_hand("interview", None, None, 3))
      ` }
    },
    mcq: { q: 'What does <code>"interview"[5:1:-1]</code> give?', options: ['<code>vret</code>', '<code>vreti</code>', '<code>tere</code>', '<code>\'\'</code> (empty)'], answer: 0, explain: 'Negative step walks left: indices 5, 4, 3, 2 (stop 1 is excluded) → v, r, e, t.' },
    hints: [
      R`<p>Hint 1: Write the indices under the letters: i0 n1 t2 e3 r4 v5 i6 e7 w8. Negative index -k means len − k.</p>`,
      R`<p>Hint 2: <code>split(sep, 1)</code> splits at most once; <code>replace(old, new, 1)</code> replaces only the first; <code>join</code> on a string iterates its characters.</p>`,
      R`<p>Hint 3: <code>title()</code> capitalises after ANY non-letter, including an apostrophe. <code>len</code> of encoded bytes counts UTF-8 bytes (é is 2).</p>`
    ],
    tests: {
      io: true,
      cases: [
        {
          stdin: '',
          stdout: 'ter\n' +
            'view\n' +
            'iei\n' +
            'vret\n' +
            '\'\'\n' +
            '[\'a\', \'b-c\']\n' +
            'HeLlo\n' +
            'a-b-c\n' +
            'They\'Re\n' +
            '5\n' +
            'They\'re Here'
        }
      ]
    },
    solution: {
      approach: R`<p>Apply the rules mechanically: (1) ter (2) view (3) iei — indices 0, 3, 6 (4) vret (5) '' — slices never raise (6) ['a', 'b-c'] (7) HeLlo (8) a-b-c (9) They'Re — the famous title() gotcha; use <code>string.capwords</code> instead (10) 5.</p>`,
      code: { lang: 'python', run: true, code: R`
s = "interview"
print(s[2:5])                        # ter
print(s[-4:])                        # view
print(s[::3])                        # iei
print(s[5:1:-1])                     # vret
print(repr(s[100:]))                 # ''
print("a-b-c".split("-", 1))         # ['a', 'b-c']
print("Hello".replace("l", "L", 1))  # HeLlo
print("-".join("abc"))               # a-b-c
print("they're".title())             # They'Re
print(len("café".encode()))          # 5

import string
print(string.capwords("they're here"))   # They're Here  (the fix for 9)
` },
      dry: { head: ['line', 'indices / rule', 'output'], rows: [['3', '0, 3, 6', 'iei'], ['4', '5, 4, 3, 2', 'vret'], ['5', 'start clamped to 9 → nothing', "''"], ['9', 'capitalise after the apostrophe', "They'Re"]] },
      complexity: R`<p>Each slice is O(k) for k characters copied; split/replace/join are O(n).</p>`,
      followUps: ['What is <code>s[-1:-4]</code>? (empty: positive step cannot go left)', 'What does <code>"abc"[::-2]</code> give?']
    }
  });

  practice.push({
    title: 'Reverse the Words in a Sentence',
    level: 'Easy', tags: ['strings', 'split', 'join'], companies: ['Microsoft', 'Amazon', 'Adobe'],
    statement: R`<p>Given a sentence <code>s</code> that may have leading, trailing or multiple spaces between words, return the words in reverse order separated by <b>single</b> spaces.</p>`,
    constraints: R`1 ≤ len(s) ≤ 10<sup>4</sup>; s contains letters, digits and spaces; at least one word.`,
    example: R`<p><code>"  the sky   is blue "</code> → ${H.c('g', '"blue is sky the"')}. The extra spaces vanish because <code>split()</code> without arguments ignores runs of whitespace.</p>`,
    brute: {
      why: R`<p>Scan character by character, building each word with <code>+=</code> and inserting it at the front of a result string. Correct, but every front-insert copies the whole result (O(n²)) and the space handling is fiddly.</p>`,
      code: { lang: 'python', run: true, code: R`
        def reverse_words_brute(s):
            result, word = "", ""
            for ch in s + " ":                 # sentinel space flushes the last word
                if ch != " ":
                    word += ch
                elif word:
                    result = word + (" " + result if result else "")
                    word = ""
            return result

        print(repr(reverse_words_brute("  the sky   is blue ")))
      ` }
    },
    mcq: { q: 'Why is <code>s.split(" ")</code> wrong here?', options: ['It keeps empty strings for repeated spaces', 'It raises on multiple spaces', 'It splits on tabs too', 'It reverses the list'], answer: 0, explain: 'split(" ") splits on each single space, so "a  b" gives [\'a\', \'\', \'b\']. split() with no argument treats any run of whitespace as one separator and drops empties.' },
    hints: [
      R`<p>Hint 1: The no-argument <code>split()</code> already solves the messy-space problem for you.</p>`,
      R`<p>Hint 2: Reverse the list with <code>[::-1]</code> or <code>reversed()</code>, then glue with <code>" ".join(...)</code>.</p>`,
      R`<p>Hint 3: Interview follow-up: do it "in place" on a list of characters — reverse the whole thing, then reverse each word.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 'reverseWords',
      cases: [
        [['  the sky   is blue '], 'blue is sky the'],
        [['hello'], 'hello'],
        [['a good   example'], 'example good a'],
        [['a'], 'a'],
        [['  a  '], 'a'],
        [['x y z'], 'z y x'],
        [['one two'], 'two one'],
        [[{ $rep: 'ab ', n: 3333 }], { $concat: [{ $rep: 'ab ', n: 3332 }, 'ab'] }]
      ]
    },
    solution: {
      approach: R`<p>One line: <code>" ".join(reversed(s.split()))</code>. split() handles all spacing, reversed() gives the order, join builds the answer in one O(n) pass.</p>`,
      code: { lang: 'python', run: true, code: R`
def reverse_words(s: str) -> str:
    return " ".join(reversed(s.split()))

for t in ["  the sky   is blue ", "hello", "a good   example"]:
    print(repr(reverse_words(t)))
` },
      dry: { head: ['step', 'value'], rows: [['s.split()', "['the', 'sky', 'is', 'blue']"], ['reversed', "['blue', 'is', 'sky', 'the']"], ['" ".join', "'blue is sky the'"]] },
      complexity: R`<p>O(n) time, O(n) space for the word list.</p>`,
      followUps: ['Reverse the letters of each word but keep word order', 'Do it with O(1) extra space on a mutable character list']
    }
  });

  practice.push({
    title: 'Mask a Card Number',
    level: 'Easy', tags: ['strings', 'formatting', 'isdigit'], companies: ['Razorpay', 'Stripe', 'PayPal'],
    statement: R`<p>Write <code>mask_card(raw)</code>. The input may contain spaces or dashes. Keep only digits; if there are fewer than 12 or more than 19 digits raise <code>ValueError</code>. Replace every digit except the last 4 with <code>*</code> and group the result in blocks of 4 separated by spaces.</p>`,
    constraints: R`len(raw) ≤ 40.`,
    example: R`<p><code>"4111-1111-1111-1234"</code> → ${H.c('g', '"**** **** **** 1234"')}; <code>"378282246310005"</code> (15 digits) → ${H.c('g', '"**** **** ***0 005"')}: we mask by position, then group by 4 from the left.</p>`,
    brute: {
      why: R`<p>Replacing digits in the original string with <code>raw.replace(d, "*")</code> masks the last four digits too whenever the same digit appears earlier (replace hits every occurrence). Index-based masking is the correct mental model.</p>`,
      code: { lang: 'python', run: true, code: R`
        def mask_brute(raw):
            masked = raw
            for d in raw[:-4]:
                if d.isdigit():
                    masked = masked.replace(d, "*")    # also hits the last 4!
            return masked

        print(mask_brute("4111-1111-1111-1234"))   # ****-****-****-*23*  last four damaged
      ` }
    },
    mcq: { q: 'Which expression groups <code>"************1234"</code> into blocks of 4?', options: ['<code>" ".join(m[i:i+4] for i in range(0, len(m), 4))</code>', '<code>m.split(4)</code>', '<code>" ".join(m)</code>', '<code>m.center(4)</code>'], answer: 0, explain: 'Slices of width 4 at positions 0, 4, 8, … then join with spaces. Slicing past the end is safe for the last short block.' },
    hints: [
      R`<p>Hint 1: Extract digits: <code>"".join(c for c in raw if c.isdigit())</code> (or <code>isdecimal()</code> to reject things like "²").</p>`,
      R`<p>Hint 2: <code>"*" * (len(d) - 4) + d[-4:]</code> masks by position, not by value.</p>`,
      R`<p>Hint 3: Group with slices in steps of 4; validate the digit count first and raise <code>ValueError</code> with a helpful message.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['mask_card(\'4111-1111-1111-1234\')'], '**** **** **** 1234'],
        [['mask_card(\'378282246310005\')'], '**** **** ***0 005'],
        [['mask_card(\'3782 822463 10005\')'], '**** **** ***0 005'],
        [['mask_card(\'1234\')'], '!ValueError'],
        [['mask_card(\'12345678901\')'], '!ValueError'],
        [['mask_card(\'123456789012\')'], '**** **** 9012'],
        [['mask_card(\'1111111111111111111\')'], '**** **** **** ***1 111'],
        [['mask_card(\'11111111111111111111\')'], '!ValueError'],
        [['mask_card(\'\')'], '!ValueError'],
        [['mask_card(\'abcd 4111 1111 1111 1234 xyz\')'], '**** **** **** 1234'],
        [['mask_card(\'----- 4111 1111 1111 1111 -----\')'], '**** **** **** 1111'],
        [['mask_card(\'0000000000000000\')'], '**** **** **** 0000'],
        [['mask_card(\' 5 5 5 5 5 5 5 5 5 5 5 5 5 \')'], '**** **** *555 5']
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Normalise (keep digits), validate, mask by position, then chunk with a stepped range and join. Each step is a standard string idiom.</p>`,
      code: { lang: 'python', run: true, code: R`
def mask_card(raw: str) -> str:
    digits = "".join(c for c in raw if c.isdecimal())
    if not 12 <= len(digits) <= 19:
        raise ValueError(f"expected 12-19 digits, got {len(digits)}")
    masked = "*" * (len(digits) - 4) + digits[-4:]
    return " ".join(masked[i:i + 4] for i in range(0, len(masked), 4))

print(mask_card("4111-1111-1111-1234"))
print(mask_card("3782 822463 10005"))
try:
    mask_card("1234")
except ValueError as e:
    print("ValueError:", e)
` },
      dry: { head: ['step', 'value'], rows: [['digits', '4111111111111234'], ['masked', '************1234'], ['chunks', "'****' '****' '****' '1234'"], ['result', '**** **** **** 1234']] },
      complexity: R`<p>O(n) time and space.</p>`,
      followUps: ['Also validate the Luhn checksum', 'Keep the original separators (dashes vs spaces) in the output']
    }
  });

  practice.push({
    title: 'Normalise Usernames (strip, casefold, ASCII-fold)',
    level: 'Easy', tags: ['strings', 'unicode', 'encode/decode'], companies: ['Instagram', 'Discord', 'Zomato'],
    statement: R`<p>Write <code>to_username(display_name)</code>: remove accents (<code>é</code> → <code>e</code>), lowercase with <code>casefold()</code>, keep only ASCII letters, digits and spaces, collapse whitespace runs into a single <code>_</code>, cut to at most 20 characters (no trailing <code>_</code>), and return <code>"user"</code> if nothing is left.</p>`,
    constraints: R`len(display_name) ≤ 200; any Unicode.`,
    example: R`<p><code>"  José   O'Néil!! "</code> → ${H.c('g', '"jose_oneil"')}: accents removed via Unicode decomposition, apostrophe and ! dropped, the space run becomes one underscore. <code>"😀😀"</code> → ${H.c('y', '"user"')}.</p>`,
    brute: {
      why: R`<p>A hand-made replacement table (<code>{"é": "e", "ñ": "n", …}</code>) never covers every accented letter in every language, and forgetting <code>casefold</code> leaves "STRASSE" and "straße" different.</p>`,
      code: { lang: 'python', run: true, code: R`
        TABLE = {"é": "e", "á": "a", "ñ": "n"}            # always incomplete
        def to_username_brute(name):
            out = "".join(TABLE.get(c, c) for c in name.lower())
            out = "".join(c for c in out if c.isalnum() or c == " ")
            return "_".join(out.split())[:20] or "user"

        print(to_username_brute("  José   O'Néil!! "), to_username_brute("Ōsaka"))   # ō survives
      ` }
    },
    mcq: { q: 'What does <code>unicodedata.normalize("NFKD", "é")</code> produce?', options: ['"e" followed by a combining accent (2 code points)', 'Just "e"', 'The bytes C3 A9', 'An error'], answer: 0, explain: 'NFKD decomposes é into e + U+0301. Encoding to ASCII with errors="ignore" then drops the combining mark, leaving plain e.' },
    hints: [
      R`<p>Hint 1: <code>unicodedata.normalize("NFKD", s)</code> splits accented letters into base letter + combining mark.</p>`,
      R`<p>Hint 2: <code>.encode("ascii", "ignore").decode("ascii")</code> drops everything non-ASCII, including those marks.</p>`,
      R`<p>Hint 3: Then <code>casefold()</code>, keep <code>c.isalnum() or c.isspace()</code>, <code>"_".join(t.split())</code>, slice <code>[:20]</code>, <code>rstrip("_")</code>, fallback <code>or "user"</code>.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['to_username("  José   O\'Néil!! ")'], 'jose_oneil'],
        [['to_username(\'😀😀\')'], 'user'],
        [['to_username(\'Ōsaka Café\')'], 'osaka_cafe'],
        [['to_username(\'A Very Long Display Name Indeed\')'], 'a_very_long_display'],
        [['to_username(\'\')'], 'user'],
        [['to_username(\'   \')'], 'user'],
        [['to_username(\'ÀÉÎ\')'], 'aei'],
        [['to_username(\'Hello World\')'], 'hello_world'],
        [['to_username(\'UPPER123\')'], 'upper123'],
        [['to_username(\'a-b_c\')'], 'abc'],
        [['to_username(\'ＡＢＣ\')'], 'abc'],
        [
          [
            'to_username(\'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\')'
          ],
          'xxxxxxxxxxxxxxxxxxxx'
        ],
        [
          [
            'to_username(\'ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab \')'
          ],
          'ab_ab_ab_ab_ab_ab_ab'
        ],
        [['to_username(\'aaaaaaaaaaaaaaaaaaa b\')'], 'aaaaaaaaaaaaaaaaaaa'],
        [['to_username(\'aaaaaaaaaaaaaaaaaaaa b\')'], 'aaaaaaaaaaaaaaaaaaaa'],
        [['to_username(\'  ---  \')'], 'user']
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Decompose → ASCII-fold via encode/decode with an error policy → casefold → filter → collapse whitespace with split/join → truncate → fallback. A pipeline of standard string tools.</p>`,
      code: { lang: 'python', run: true, code: R`
import unicodedata

def to_username(display_name: str, limit: int = 20) -> str:
    t = unicodedata.normalize("NFKD", display_name)
    t = t.encode("ascii", "ignore").decode("ascii")      # drop accents/emoji
    t = t.casefold()
    t = "".join(c for c in t if c.isalnum() or c.isspace())
    t = "_".join(t.split())                               # collapse spaces
    return t[:limit].rstrip("_") or "user"

for n in ["  José   O'Néil!! ", "Ōsaka Café", "😀😀", "A Very Long Display Name Indeed"]:
    print(repr(n), "->", to_username(n))
` },
      dry: { head: ['step', 'value'], rows: [['NFKD + ascii ignore', "'  Jose   O'Neil!! '"], ['casefold + filter', "'  jose   oneil '"], ['split/join', "'jose_oneil'"], ['truncate/fallback', "'jose_oneil'"]] },
      complexity: R`<p>O(n) time and space.</p>`,
      followUps: ['Ensure uniqueness by appending a number if the name is taken', 'Why can NFKD change "ﬁ" (one ligature char) into "fi"?']
    }
  });

  practice.push({
    title: 'Predict the Output: File Modes and the Cursor',
    level: 'Medium', tags: ['predict the output', 'files', 'modes', 'seek'], companies: ['Amazon', 'Cisco', 'Intuit'],
    statement: R`<p>Predict each printed value. <code>p</code> is a path in a temporary folder.</p>
      <pre>with open(p, "w") as f: f.write("abc")
with open(p, "a") as f: f.write("def")
with open(p) as f:
    print(f.read(2))            # 1
    print(f.read())             # 2
    print(repr(f.read()))       # 3
    f.seek(0)
    print(f.readline())         # 4
with open(p, "r+") as f:
    f.write("XY")
with open(p) as f:
    print(f.read())             # 5
with open(p, "w") as f:
    pass
with open(p) as f:
    print(repr(f.read()))       # 6</pre>`,
    constraints: R`Assume UTF-8 and that p starts out not existing.`,
    example: R`<p>After line 1 of the program the file is ${H.c('b', '"abc"')}; <code>"a"</code> appends so it becomes ${H.c('b', '"abcdef"')}. Output 1 is ${H.c('g', 'ab')} (two characters from the start).</p>`,
    brute: {
      why: R`<p>The slow way is to track the file content and the cursor on paper after every call, like a debugger. That is exactly what the solution's commented trace does; with practice you skip it.</p>`,
      code: { lang: 'python', run: true, code: R`
        content, cursor = "", 0
        content = "abc"                         # "w" erases, then writes
        content += "def"                        # "a" always writes at the end
        out1 = content[cursor:cursor + 2]; cursor += 2
        out2 = content[cursor:]; cursor = len(content)
        print(out1, out2, repr(content[cursor:]))
      ` }
    },
    mcq: { q: 'Opening with <code>"r+"</code> and writing "XY" immediately does what?', options: ['Overwrites the first two characters (cursor starts at 0)', 'Appends at the end', 'Erases the file first', 'Raises because the file exists'], answer: 0, explain: '"r+" opens for read and write WITHOUT truncating, cursor at position 0, so writes overwrite in place: abcdef → XYcdef.' },
    hints: [
      R`<p>Hint 1: Track two things: the content and the cursor. "w" empties then writes; "a" writes at the end; "r" starts at 0.</p>`,
      R`<p>Hint 2: read() with no argument takes everything from the cursor; a second read() at EOF returns ''.</p>`,
      R`<p>Hint 3: "r+" overwrites from position 0 without truncating; opening with "w" erases the file even if you write nothing.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: 'ab\ncdef\n\'\'\nabcdef\nXYcdef\n\'\'' }] },
    solution: {
      approach: R`<p>Answers: (1) ab (2) cdef (3) '' (4) abcdef (5) XYcdef (6) ''. The traps: append mode, empty string at EOF, r+ overwriting in place, and "w" truncating immediately on open.</p>`,
      code: { lang: 'python', run: true, code: R`
import os, tempfile
p = os.path.join(tempfile.mkdtemp(), "t.txt")
with open(p, "w", encoding="utf-8") as f: f.write("abc")
with open(p, "a", encoding="utf-8") as f: f.write("def")
with open(p, encoding="utf-8") as f:
    print(f.read(2))            # ab
    print(f.read())             # cdef
    print(repr(f.read()))       # ''
    f.seek(0)
    print(f.readline())         # abcdef  (no newline in the file)
with open(p, "r+", encoding="utf-8") as f:
    f.write("XY")               # overwrite in place
with open(p, encoding="utf-8") as f:
    print(f.read())             # XYcdef
with open(p, "w", encoding="utf-8") as f:
    pass                        # truncated on open
with open(p, encoding="utf-8") as f:
    print(repr(f.read()))       # ''
os.remove(p)
` },
      dry: { head: ['call', 'content', 'cursor after', 'printed'], rows: [['read(2)', 'abcdef', '2', 'ab'], ['read()', 'abcdef', '6', 'cdef'], ['read()', 'abcdef', '6', "''"], ['r+ write XY', 'XYcdef', '2', '—'], ['open "w"', "''", '0', "''"]] },
      complexity: R`<p>Each read/write is O(characters moved).</p>`,
      followUps: ['What happens with mode "a+" and seek(0) followed by write?', 'Why is seek(3) in text mode with non-ASCII content risky?']
    }
  });

  practice.push({
    title: 'Run-Length Encoding (compress and decompress)',
    level: 'Medium', tags: ['strings', 'itertools.groupby', 'join'], companies: ['Google', 'Goldman Sachs', 'Uber'],
    statement: R`<p>Implement <code>encode(s)</code> turning runs of repeated characters into <code>char + count</code> (<code>"aaabccdddd"</code> → <code>"a3b1c2d4"</code>) and <code>decode(t)</code> that reverses it. Counts can have several digits. Input characters are letters only.</p>`,
    constraints: R`0 ≤ len(s) ≤ 10<sup>6</sup>.`,
    example: R`<p><code>encode("aaabccdddd")</code> → ${H.c('g', '"a3b1c2d4"')}; <code>decode("x12y1")</code> → ${H.c('g', '"xxxxxxxxxxxxy"')} (12 x's: multi-digit count).</p>`,
    brute: {
      why: R`<p>Building the output with <code>result += ...</code> and, for decode, assuming each count is a single digit. The first can be quadratic; the second silently breaks on counts ≥ 10.</p>`,
      code: { lang: 'python', run: true, code: R`
        def decode_brute(t):
            out = ""
            for i in range(0, len(t), 2):      # assumes ONE digit per count
                out += t[i] * int(t[i + 1])
            return out

        print(decode_brute("a3b1"))           # fine
        try:
            print(decode_brute("x12y1"))
        except (ValueError, IndexError) as e:
            print("breaks:", type(e).__name__)
      ` }
    },
    mcq: { q: 'Which tool groups consecutive equal characters in one pass?', options: ['<code>itertools.groupby</code>', '<code>collections.Counter</code>', '<code>sorted</code>', '<code>str.count</code>'], answer: 0, explain: 'groupby yields (key, run) for each block of consecutive equal items. Counter counts across the whole string and would merge separate runs.' },
    hints: [
      R`<p>Hint 1: For encode, walk the string tracking the current character and its run length; flush to a list of parts when it changes.</p>`,
      R`<p>Hint 2: <code>itertools.groupby(s)</code> gives each run directly: <code>f"{ch}{len(list(run))}"</code>.</p>`,
      R`<p>Hint 3: For decode, use <code>re.findall(r"([A-Za-z])(\d+)", t)</code> to get (char, count) pairs with multi-digit counts; build parts and join once.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['encode(\'aaabccdddd\')'], 'a3b1c2d4'],
        [['encode(\'\')'], ''],
        [['encode(\'a\')'], 'a1'],
        [['encode(\'xxxxxxxxxxxxy\')'], 'x12y1'],
        [['encode(\'aA\')'], 'a1A1'],
        [['encode(\'ab\')'], 'a1b1'],
        [['encode(\'zzzzzzzzzz\')'], 'z10'],
        [['decode(\'x12y1\')'], 'xxxxxxxxxxxxy'],
        [['decode(\'\')'], ''],
        [['decode(\'a1\')'], 'a'],
        [['decode(\'a3b1c2d4\')'], 'aaabccdddd'],
        [['decode(\'z10\')'], 'zzzzzzzzzz'],
        [['decode(\'a0b2\')'], 'bb'],
        [['decode(encode(\'a\' * 500000 + \'b\' * 500000)) == \'a\' * 500000 + \'b\' * 500000'], true],
        [['encode(\'ab\' * 500000) == \'a1b1\' * 500000'], true],
        [['encode(\'a\' * 1000000)'], 'a1000000'],
        [['decode(\'a1000000\') == \'a\' * 1000000'], true]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Encode with <code>groupby</code> + join; decode with a regex that captures a letter followed by one or more digits. Both are linear and avoid repeated string concatenation.</p>`,
      code: { lang: 'python', run: true, code: R`
import re
from itertools import groupby

def encode(s: str) -> str:
    return "".join(f"{ch}{sum(1 for _ in run)}" for ch, run in groupby(s))

def decode(t: str) -> str:
    return "".join(ch * int(n) for ch, n in re.findall(r"([A-Za-z])(\d+)", t))

for s in ["aaabccdddd", "", "x" * 12 + "y"]:
    e = encode(s)
    print(repr(s[:15]), "->", e, "->", decode(e) == s)
` },
      dry: { head: ['run', 'char', 'length', 'part'], rows: [['aaa', 'a', '3', 'a3'], ['b', 'b', '1', 'b1'], ['cc', 'c', '2', 'c2'], ['dddd', 'd', '4', 'd4 → "a3b1c2d4"']] },
      complexity: R`<p>O(n) time for both; output O(n) worst case (no repeats doubles the length).</p>`,
      followUps: ['Only encode runs longer than 1 to guarantee no growth', 'Make it work on bytes for binary data']
    }
  });

  practice.push({
    title: 'Tail: Last N Lines of a Huge File',
    level: 'Medium', tags: ['files', 'deque', 'seek', 'binary'], companies: ['Amazon', 'Datadog', 'Splunk'],
    statement: R`<p>Write <code>tail(path, n)</code> returning the last <code>n</code> lines (without newline characters) of a UTF-8 text file that may be many gigabytes. Return fewer lines if the file is shorter; <code>n = 0</code> returns an empty list.</p>`,
    constraints: R`0 ≤ n ≤ 10<sup>4</sup>; file size up to 10<sup>11</sup> bytes; lines up to 10<sup>4</sup> characters.`,
    example: R`<p>File lines <code>line1 … line10</code>, n = 3 → ${H.c('g', "['line8', 'line9', 'line10']")}.</p>`,
    brute: {
      why: R`<p><code>f.readlines()[-n:]</code> loads every line of a 100 GB file into memory just to keep 3 of them.</p>`,
      code: { lang: 'python', run: true, code: R`
        import os, tempfile
        def tail_brute(path, n):
            with open(path, encoding="utf-8") as f:
                return [l.rstrip("\n") for l in f.readlines()[-n:]] if n else []

        fd, p = tempfile.mkstemp()
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.writelines(f"line{i}\n" for i in range(1, 11))
        print(tail_brute(p, 3))
        os.remove(p)
      ` }
    },
    mcq: { q: 'What does <code>collections.deque(f, maxlen=3)</code> do with a file object f?', options: ['Iterates all lines but keeps only the last 3 in memory', 'Reads only the last 3 lines from disk', 'Raises because files are not lists', 'Keeps the first 3 lines'], answer: 0, explain: 'A bounded deque discards from the left as new items arrive, so memory is O(n) lines, but it still reads the whole file (O(file size) time). Seeking from the end avoids reading everything.' },
    hints: [
      R`<p>Hint 1: Streaming version: <code>deque(f, maxlen=n)</code> — constant memory, but still reads the whole file.</p>`,
      R`<p>Hint 2: Faster version: open in <b>binary</b>, <code>seek(0, 2)</code> to the end, and read blocks backwards until you have collected more than n newline bytes.</p>`,
      R`<p>Hint 3: Decode only the final lines with <code>splitlines()</code>; handle n = 0 separately (because <code>lst[-0:]</code> is the WHOLE list).</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'line1\\nline2\\nline3\\nline4\\nline5\\nline6\\nline7\\nline8\\nline9\\nline10\\n\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 3\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [['line8', 'line9', 'line10'], ['line8', 'line9', 'line10']]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'line1\\nline2\\nline3\\nline4\\nline5\\nline6\\nline7\\nline8\\nline9\\nline10\\n\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 0\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [[], []]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'a\\nb\\n\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 5\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [['a', 'b'], ['a', 'b']]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 5\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [[], []]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'a\\nb\\nc\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 2\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [['b', 'c'], ['b', 'c']]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'only\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 1\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [['only'], ['only']]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'a\\n\\n\\nb\\n\\n\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 3\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [['', 'b', ''], ['', 'b', '']]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'a\\n\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 1\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [['a'], ['a']]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'é\\n€\\n\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 1\n' +
              'result = [tail(p, N), tail_stream(p, N)]\n' +
              'os.remove(p)'
          ],
          [['€'], ['€']]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\nbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\\ncccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\\n\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 2\n' +
              'r = [tail(p, N), tail_stream(p, N)]\n' +
              'result = [[[l[0], len(l)] for l in x] for x in r]\n' +
              'os.remove(p)'
          ],
          [[['b', 5000], ['c', 5000]], [['b', 5000], ['c', 5000]]]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, \'éééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééé\\néééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééé\\néééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééé\\néééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééé\\néééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééééé\\n\'.encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 3\n' +
              'r = [tail(p, N), tail_stream(p, N)]\n' +
              'result = [[len(l) for l in x] + [l == \'é\' * 3000 for l in x] for x in r]\n' +
              'os.remove(p)'
          ],
          [[3000, 3000, 3000, true, true, true], [3000, 3000, 3000, true, true, true]]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, (\'\'.join(\'line%d\\n\' % i for i in range(1, 100001))).encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 10000\n' +
              'r = [tail(p, N), tail_stream(p, N)]\n' +
              'result = [[len(x), x[0], x[-1]] for x in r]\n' +
              'os.remove(p)'
          ],
          [[10000, 'line90001', 'line100000'], [10000, 'line90001', 'line100000']]
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp()\n' +
              'os.write(fd, (\'\'.join(\'line%d\\n\' % i for i in range(1, 100001))).encode(\'utf-8\'))\n' +
              'os.close(fd)\n' +
              'N = 5\n' +
              'result = [tail(p, 200000) == tail_stream(p, 200000), len(tail(p, 200000))]\n' +
              'os.remove(p)'
          ],
          [true, 100000]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Read backwards in fixed-size binary blocks from the end until the buffer contains more than n newlines, then split and decode the last n lines. Work is proportional to the size of the answer, not the file. (The deque version is the simple streaming alternative.)</p>`,
      code: { lang: 'python', run: true, code: R`
import os, tempfile
from collections import deque

def tail(path, n, block=4096):
    if n <= 0:
        return []                       # careful: lines[-0:] would return everything
    with open(path, "rb") as f:
        f.seek(0, os.SEEK_END)
        pos = f.tell()
        data = b""
        while pos > 0 and data.count(b"\n") <= n:
            step = min(block, pos)
            pos -= step
            f.seek(pos)
            data = f.read(step) + data  # prepend the earlier block
    return [line.decode("utf-8") for line in data.splitlines()[-n:]]

def tail_stream(path, n):
    with open(path, encoding="utf-8") as f:
        return [l.rstrip("\n") for l in deque(f, maxlen=n)] if n > 0 else []

fd, p = tempfile.mkstemp()
with os.fdopen(fd, "w", encoding="utf-8") as f:
    f.writelines(f"line{i}\n" for i in range(1, 100_001))
print(tail(p, 3), tail_stream(p, 3))
print(tail(p, 0), len(tail(p, 200_000)))
os.remove(p)
` },
      dry: { head: ['iteration', 'pos', 'bytes buffered', 'newlines seen'], rows: [['start', 'end of file', '0', '0'], ['1', 'end − 4096', '4096', '≈ 370 &gt; 3 → stop'], ['split', '—', '—', "last 3 → ['line99998', 'line99999', 'line100000']"]] },
      complexity: R`<p>Seek version: O(answer size + block) time and memory. deque version: O(file size) time, O(n) memory.</p>`,
      followUps: ['Implement tail -f (follow new lines as they are appended)', 'Why is it safe to split UTF-8 bytes on b"\\n"? (0x0A never appears inside a multi-byte character)']
    }
  });

  practice.push({
    title: 'CSV Sales Report with Aligned Columns',
    level: 'Medium', tags: ['csv', 'files', 'formatting', 'dict'], companies: ['Walmart', 'Flipkart', 'Deloitte'],
    statement: R`<p>Given a CSV file with header <code>region,product,amount</code> (amounts may be quoted and contain commas like <code>"1,250.50"</code>), print a report: one row per region with total amount (2 decimals, thousands separators) and its share of the grand total (1 decimal %), sorted by total descending, then a TOTAL row. Return the report string.</p>`,
    constraints: R`Up to 10<sup>6</sup> rows; up to 100 regions; region names up to 12 characters.`,
    example: R`<p>Rows <code>North,pen,100</code>, <code>South,bag,"1,250.50"</code>, <code>North,ink,49.5</code> → ${H.c('g', 'South 1,250.50 89.3%')} then ${H.c('g', 'North 149.50 10.7%')} then TOTAL 1,400.00 100.0%.</p>`,
    brute: {
      why: R`<p><code>line.split(",")</code> turns <code>"1,250.50"</code> into two fields (<code>'"1'</code> and <code>'250.50"'</code>), so the amount column is wrong or float() crashes. Quoted CSV needs a real parser.</p>`,
      code: { lang: 'python', run: true, code: R`
        line = 'South,bag,"1,250.50"'
        print(line.split(","))        # ['South', 'bag', '"1', '250.50"']  broken
      ` }
    },
    mcq: { q: 'Why open CSV files with <code>newline=""</code>?', options: ['So the csv module sees raw line endings and handles quoted newlines and \\r\\n itself', 'To make reading faster', 'To strip trailing spaces', 'It is required for UTF-8'], answer: 0, explain: 'The csv docs require newline="" so that newlines inside quoted fields are preserved and Windows \\r\\n line endings are not translated twice.' },
    hints: [
      R`<p>Hint 1: <code>csv.DictReader(f)</code> gives a dict per row and handles quotes; convert with <code>float(row["amount"].replace(",", ""))</code>.</p>`,
      R`<p>Hint 2: Accumulate in a dict <code>totals[region] = totals.get(region, 0) + amount</code>, then <code>sorted(totals.items(), key=lambda kv: kv[1], reverse=True)</code>.</p>`,
      R`<p>Hint 3: Format rows with <code>f"{region:&lt;12}{total:&gt;14,.2f}{share:&gt;8.1%}"</code>; share = total / grand (guard grand == 0).</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.csv\')\n' +
              'with os.fdopen(fd, \'w\', newline=\'\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'region,product,amount\\nNorth,x,100\\nSouth,x,"1,250.50"\\nNorth,x,49.5\\n\')\n' +
              'result = sales_report(p)\n' +
              'os.remove(p)'
          ],
          'Region               Total   Share\n' +
            'South             1,250.50   89.3%\n' +
            'North               149.50   10.7%\n' +
            'TOTAL             1,400.00  100.0%'
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.csv\')\n' +
              'with os.fdopen(fd, \'w\', newline=\'\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'region,product,amount\\nSolo,x,10\\n\')\n' +
              'result = sales_report(p)\n' +
              'os.remove(p)'
          ],
          'Region               Total   Share\n' +
            'Solo                 10.00  100.0%\n' +
            'TOTAL                10.00  100.0%'
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.csv\')\n' +
              'with os.fdopen(fd, \'w\', newline=\'\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'region,product,amount\\n\')\n' +
              'result = sales_report(p)\n' +
              'os.remove(p)'
          ],
          'Region               Total   Share\n' +
            'TOTAL                 0.00    0.0%'
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.csv\')\n' +
              'with os.fdopen(fd, \'w\', newline=\'\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'region,product,amount\\nA,x,"1,000,000.00"\\nB,x,2.50\\n\')\n' +
              'result = sales_report(p)\n' +
              'os.remove(p)'
          ],
          'Region               Total   Share\n' +
            'A             1,000,000.00  100.0%\n' +
            'B                     2.50    0.0%\n' +
            'TOTAL         1,000,002.50  100.0%'
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.csv\')\n' +
              'with os.fdopen(fd, \'w\', newline=\'\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'region,product,amount\\nWest,x,333.33\\nEast,x,666.67\\n\')\n' +
              'result = sales_report(p)\n' +
              'os.remove(p)'
          ],
          'Region               Total   Share\n' +
            'East                666.67   66.7%\n' +
            'West                333.33   33.3%\n' +
            'TOTAL             1,000.00  100.0%'
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.csv\')\n' +
              'with os.fdopen(fd, \'w\', newline=\'\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'region,product,amount\\nN,x,0.01\\nS,x,0.02\\nN,x,0.01\\n\')\n' +
              'result = sales_report(p)\n' +
              'os.remove(p)'
          ],
          'Region               Total   Share\n' +
            'N                     0.02   50.0%\n' +
            'S                     0.02   50.0%\n' +
            'TOTAL                 0.04  100.0%'
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.csv\')\n' +
              'with os.fdopen(fd, \'w\', newline=\'\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'region,product,amount\\nAlpha,x,0\\nBeta,x,5\\n\')\n' +
              'result = sales_report(p)\n' +
              'os.remove(p)'
          ],
          'Region               Total   Share\n' +
            'Beta                  5.00  100.0%\n' +
            'Alpha                 0.00    0.0%\n' +
            'TOTAL                 5.00  100.0%'
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.csv\')\n' +
              'with os.fdopen(fd, \'w\', newline=\'\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'region,product,amount\\n\')\n' +
              '    for i in range(1000000):\n' +
              '        f.write(\'R%d,x,%d\\n\' % (i % 3, i % 3 + 1))\n' +
              'result = sales_report(p)\n' +
              'os.remove(p)'
          ],
          'Region               Total   Share\n' +
            'R2              999,999.00   50.0%\n' +
            'R1              666,666.00   33.3%\n' +
            'R0              333,334.00   16.7%\n' +
            'TOTAL         1,999,999.00  100.0%'
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Stream rows with DictReader (constant memory per row), aggregate per region in a dict, sort once, and format with fixed-width specs so columns align.</p>`,
      code: { lang: 'python', run: true, code: R`
import csv, os, tempfile

def sales_report(path: str) -> str:
    totals = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            amount = float(row["amount"].replace(",", ""))
            totals[row["region"]] = totals.get(row["region"], 0.0) + amount
    grand = sum(totals.values())
    lines = [f"{'Region':<12}{'Total':>14}{'Share':>8}"]
    for region, total in sorted(totals.items(), key=lambda kv: kv[1], reverse=True):
        share = total / grand if grand else 0.0
        lines.append(f"{region:<12}{total:>14,.2f}{share:>8.1%}")
    lines.append(f"{'TOTAL':<12}{grand:>14,.2f}{1 if grand else 0:>8.1%}")
    return "\n".join(lines)

fd, p = tempfile.mkstemp(suffix=".csv")
with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
    f.write('region,product,amount\nNorth,pen,100\nSouth,bag,"1,250.50"\nNorth,ink,49.5\n')
print(sales_report(p))
os.remove(p)
` },
      dry: { head: ['row', 'region', 'amount', 'totals'], rows: [['1', 'North', '100.0', "{'North': 100.0}"], ['2', 'South', '1250.5', "{'North': 100.0, 'South': 1250.5}"], ['3', 'North', '49.5', "{'North': 149.5, 'South': 1250.5}"]] },
      complexity: R`<p>O(rows + R log R) time for R regions; O(R) memory regardless of file size.</p>`,
      followUps: ['Use Decimal so totals of money never drift', 'Write the report to a new CSV with csv.writer instead of text']
    }
  });

  practice.push({
    title: 'Repair Mojibake Automatically',
    level: 'Medium', tags: ['unicode', 'encode/decode', 'error handling'], companies: ['Booking.com', 'Expedia', 'Airbnb'],
    statement: R`<p>Text scraped from old systems contains mojibake like <code>"cafÃ©"</code> or <code>"donâ€™t"</code>: UTF-8 bytes that were decoded as Windows-1252 (cp1252) or Latin-1. Write <code>fix_mojibake(s)</code> that repairs such text (possibly mis-decoded twice) and leaves already-correct text unchanged.</p>`,
    constraints: R`len(s) ≤ 10<sup>5</sup>; at most 3 layers of mis-decoding.`,
    example: R`<p><code>"cafÃ©"</code> → ${H.c('g', '"café"')}; <code>"donâ€™t"</code> → ${H.c('g', '"don’t"')}; <code>"café"</code> (already fine) → ${H.c('b', '"café"')} because encoding it as cp1252 gives <code>b"caf\xe9"</code>, which is not valid UTF-8, so we keep the original.</p>`,
    brute: {
      why: R`<p>A replacement table (<code>"Ã©" → "é"</code>, <code>"â€™" → "’"</code>, …) must list thousands of pairs, misses double-encoding, and can corrupt correct text that legitimately contains those character pairs.</p>`,
      code: { lang: 'python', run: true, code: R`
        FIXES = {"Ã©": "é", "â€™": "’"}          # endless list in practice
        def fix_brute(s):
            for bad, good in FIXES.items():
                s = s.replace(bad, good)
            return s

        print(fix_brute("cafÃ©"), fix_brute("Ã¼ber"))   # second one not in the table
      ` }
    },
    mcq: { q: 'Mojibake "Ã©" came from UTF-8 bytes C3 A9 decoded as cp1252. What reverses it?', options: ['<code>s.encode("cp1252").decode("utf-8")</code>', '<code>s.decode("utf-8")</code>', '<code>s.encode("utf-8").decode("cp1252")</code>', '<code>s.lower()</code>'], answer: 0, explain: 'Undo the wrong step first (turn the characters back into the original bytes using the wrong codec), then apply the right decode. Option 3 repeats the mistake.' },
    hints: [
      R`<p>Hint 1: The bug was <code>bytes.decode("cp1252")</code> on UTF-8 bytes. Reverse: <code>s.encode("cp1252")</code> recovers those bytes, then <code>.decode("utf-8")</code>.</p>`,
      R`<p>Hint 2: If either step raises <code>UnicodeError</code>, this codec was not the culprit; try <code>latin-1</code> next (it can represent bytes cp1252 cannot).</p>`,
      R`<p>Hint 3: Repeat up to 3 times while the text keeps changing (double-encoded data). Stop when no codec produces a different valid result.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['fix_mojibake(\'cafÃ©\')'], 'café'],
        [['fix_mojibake(\'cafÃƒÂ©\')'], 'café'],
        [['fix_mojibake(\'cafÃƒÆ’Ã‚Â©\')'], 'café'],
        [['fix_mojibake(\'donâ€™t\')'], 'don’t'],
        [['fix_mojibake(\'donÃ¢â‚¬â„¢t\')'], 'don’t'],
        [['fix_mojibake(\'donÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢t\')'], 'don’t'],
        [['fix_mojibake(\'ðŸ˜€ ok\')'], '😀 ok'],
        [['fix_mojibake(\'Ã°Å¸Ëœâ‚¬ ok\')'], '😀 ok'],
        [['fix_mojibake(\'ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â€šÂ¬ ok\')'], '😀 ok'],
        [['fix_mojibake(\'naÃ¯ve rÃ©sumÃ©\')'], 'naïve résumé'],
        [['fix_mojibake(\'naÃƒÂ¯ve rÃƒÂ©sumÃƒÂ©\')'], 'naïve résumé'],
        [['fix_mojibake(\'naÃƒÆ’Ã‚Â¯ve rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â©\')'], 'naïve résumé'],
        [['fix_mojibake(\'Ã¼Ã±Ã®\')'], 'üñî'],
        [['fix_mojibake(\'ÃƒÂ¼ÃƒÂ±ÃƒÂ®\')'], 'üñî'],
        [['fix_mojibake(\'ÃƒÆ’Ã‚Â¼ÃƒÆ’Ã‚Â±ÃƒÆ’Ã‚Â®\')'], 'üñî'],
        [['fix_mojibake(\'â‚¬5\')'], '€5'],
        [['fix_mojibake(\'Ã¢â€šÂ¬5\')'], '€5'],
        [['fix_mojibake(\'ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬5\')'], '€5'],
        [['fix_mojibake(\'café\')'], 'café'],
        [['fix_mojibake(\'plain ascii\')'], 'plain ascii'],
        [['fix_mojibake(\'\')'], ''],
        [['fix_mojibake(\'don’t\')'], 'don’t'],
        [['fix_mojibake(\'日本語\')'], '日本語'],
        [['fix_mojibake(\'caf\\xc3\\xa9 \' * 10000) == \'café \' * 10000'], true],
        [['fix_mojibake(\'a\' * 100000) == \'a\' * 100000'], true]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Try to undo one layer with each candidate codec; accept the first that round-trips without errors and changes the text; loop for multiple layers. Correct text is safe because re-encoding it rarely yields valid UTF-8. (For production, the <code>ftfy</code> library implements a far more careful version of this idea.)</p>`,
      code: { lang: 'python', run: true, code: R`
def fix_mojibake(s: str, max_layers: int = 3) -> str:
    for _ in range(max_layers):
        for codec in ("cp1252", "latin-1"):
            try:
                candidate = s.encode(codec).decode("utf-8")
            except UnicodeError:
                continue                  # this codec cannot explain the text
            if candidate != s:
                s = candidate
                break                     # undo one layer, then try again
        else:
            return s                      # no codec changed anything: done
    return s

tests = ["cafÃ©", "donâ€™t", "café", "plain ascii", "cafÃƒÂ©"]
for t in tests:
    print(f"{t!r:16} -> {fix_mojibake(t)!r}")
` },
      dry: { head: ['input', 'cp1252 encode', 'utf-8 decode', 'result'], rows: [['cafÃ©', "b'caf\\xc3\\xa9'", 'café', 'changed → loop again → stable'], ['café', "b'caf\\xe9'", '<span class="c-r">UnicodeDecodeError</span>', 'try latin-1 → same error → keep'], ['cafÃƒÂ©', 'layer 1 → cafÃ©', 'layer 2 → café', 'café']] },
      complexity: R`<p>O(L · n) for L ≤ 3 layers and text length n.</p>`,
      followUps: ['How would you detect mojibake in a whole database column?', 'Why is guessing encodings (chardet / charset-normalizer) only probabilistic?']
    }
  });

  practice.push({
    title: 'Load a .env Config File',
    level: 'Medium', tags: ['files', 'parsing', 'partition', 'errors'], companies: ['Heroku', 'Vercel', 'Postman'],
    statement: R`<p>Write <code>load_env(path)</code> returning a dict from a <code>.env</code>-style file. Rules: skip blank lines and lines starting with <code>#</code>; an optional leading <code>export </code> is ignored; split on the <b>first</b> <code>=</code> only; strip spaces around key and value; if the value is wrapped in matching single or double quotes, remove them (keep inner content verbatim, including <code>#</code>); otherwise drop an inline comment starting with <code> #</code>. Keys must be valid identifiers, else raise <code>ValueError</code> naming the line number. Later duplicates win.</p>`,
    constraints: R`File ≤ 10<sup>4</sup> lines, UTF-8.`,
    example: R`<p>Lines <code>export DB_URL = "postgres://u:p@h/db?x=1"</code>, <code>DEBUG=true # dev only</code>, <code>MSG='hi # there'</code> → ${H.c('g', "{'DB_URL': 'postgres://u:p@h/db?x=1', 'DEBUG': 'true', 'MSG': 'hi # there'}")}. Note the <code>=</code> inside the URL is kept because we split on the first one only.</p>`,
    brute: {
      why: R`<p><code>key, value = line.split("=")</code> crashes ("too many values to unpack") on any value containing <code>=</code>, never strips quotes, and gives no line number when the file is wrong.</p>`,
      code: { lang: 'python', run: true, code: R`
        def load_env_brute(text):
            d = {}
            for line in text.splitlines():
                if line.strip():
                    k, v = line.split("=")            # breaks on "a=b=c"
                    d[k] = v
            return d

        try:
            print(load_env_brute("URL=http://x?a=1\n"))
        except ValueError as e:
            print("ValueError:", e)
      ` }
    },
    mcq: { q: '<code>"URL=http://x?a=1".partition("=")</code> returns…', options: ["('URL', '=', 'http://x?a=1')", "('URL', 'http://x?a', '1')", "['URL', 'http://x?a', '1']", 'ValueError'], answer: 0, explain: 'partition splits at the FIRST separator only and always returns a 3-tuple (before, sep, after). That is exactly what key=value parsing needs.' },
    hints: [
      R`<p>Hint 1: Loop with <code>enumerate(f, start=1)</code> so you have line numbers for error messages. <code>line.strip()</code>; skip empty or <code>#</code> lines; <code>removeprefix("export ")</code>.</p>`,
      R`<p>Hint 2: <code>key, sep, value = line.partition("=")</code>; if <code>not sep</code> or <code>not key.strip().isidentifier()</code> → ValueError with the line number.</p>`,
      R`<p>Hint 3: Quoted: <code>len(v) &gt;= 2 and v[0] == v[-1] and v[0] in "'\""</code> → <code>v[1:-1]</code>. Unquoted: <code>v.split(" #", 1)[0].strip()</code>.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'# settings\\nexport DB_URL = "postgres://u:p@h/db?x=1"\\nDEBUG=true # dev only\\nMSG=\\\'hi # there\\\'\\nDEBUG=false\\n\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { DB_URL: 'postgres://u:p@h/db?x=1', DEBUG: 'false', MSG: 'hi # there' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          {  }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'A=1\\n\\n  \\n# c\\nB = 2\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { A: '1', B: '2' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'K=a=b=c\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { K: 'a=b=c' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write("Q=\'\'")\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { Q: '' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'E=\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { E: '' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'export  X=1\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { X: '1' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'X=1 #c\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { X: '1' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'X=1#c\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { X: '1#c' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'M="it\\\'s"\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { M: 'it\'s' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'  SPACED  =  value with spaces  \')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { SPACED: 'value with spaces' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'Q="  keep  "\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { Q: '  keep  ' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'H="a # b"\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { H: 'a # b' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'A=1\\nA=2\\nA=3\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { A: '3' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'Q=\\\'x"\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { Q: '\'x"' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'X="\')\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { X: '"' }
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'1BAD=x\\n\')\n' +
              'try:\n' +
              '    load_env(p)\n' +
              '    result = None\n' +
              'except ValueError as e:\n' +
              '    result = \'line 1\' in str(e)\n' +
              'os.remove(p)'
          ],
          true
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'ok=1\\nBAD LINE\\n\')\n' +
              'try:\n' +
              '    load_env(p)\n' +
              '    result = None\n' +
              'except ValueError as e:\n' +
              '    result = \'line 2\' in str(e)\n' +
              'os.remove(p)'
          ],
          true
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'# c\\n\\n=novalue\\n\')\n' +
              'try:\n' +
              '    load_env(p)\n' +
              '    result = None\n' +
              'except ValueError as e:\n' +
              '    result = \'line 3\' in str(e)\n' +
              'os.remove(p)'
          ],
          true
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'A=1\\nB=2\\nC.D=3\\n\')\n' +
              'try:\n' +
              '    load_env(p)\n' +
              '    result = None\n' +
              'except ValueError as e:\n' +
              '    result = \'line 3\' in str(e)\n' +
              'os.remove(p)'
          ],
          true
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'noequals\')\n' +
              'try:\n' +
              '    load_env(p)\n' +
              '    result = None\n' +
              'except ValueError as e:\n' +
              '    result = \'line 1\' in str(e)\n' +
              'os.remove(p)'
          ],
          true
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\', encoding=\'utf-8\') as f:\n' +
              '    f.write(\'\')\n' +
              'result = len(load_env(p))\n' +
              'os.remove(p)'
          ],
          0
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\') as f:\n' +
              '    for i in range(10000):\n' +
              '        f.write(\'K%d=v%d\\n\' % (i, i))\n' +
              'r = load_env(p)\n' +
              'result = [len(r), r[\'K0\'], r[\'K9999\']]\n' +
              'os.remove(p)'
          ],
          [10000, 'v0', 'v9999']
        ],
        [
          [
            'import os, tempfile\n' +
              'fd, p = tempfile.mkstemp(suffix=\'.env\')\n' +
              'with os.fdopen(fd, \'w\') as f:\n' +
              '    for i in range(10000):\n' +
              '        f.write(\'K=%d\\n\' % i)\n' +
              'result = load_env(p)\n' +
              'os.remove(p)'
          ],
          { K: '9999' }
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>A small line-oriented parser: strip → skip → <code>removeprefix</code> → <code>partition</code> on the first "=" → validate key → unquote or drop the inline comment. Each rule is one string method.</p>`,
      code: { lang: 'python', run: true, code: R`
import os, tempfile

def load_env(path: str) -> dict:
    env = {}
    with open(path, encoding="utf-8") as f:
        for lineno, raw in enumerate(f, start=1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            line = line.removeprefix("export ").lstrip()
            key, sep, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if not sep or not key.isidentifier():
                raise ValueError(f"line {lineno}: expected KEY=VALUE, got {raw.strip()!r}")
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
                value = value[1:-1]                    # quoted: keep inner text verbatim
            else:
                value = value.split(" #", 1)[0].strip()  # unquoted: drop inline comment
            env[key] = value
    return env

fd, p = tempfile.mkstemp(suffix=".env")
with os.fdopen(fd, "w", encoding="utf-8") as f:
    f.write('# settings\nexport DB_URL = "postgres://u:p@h/db?x=1"\nDEBUG=true # dev only\n'
            "MSG='hi # there'\nDEBUG=false\n")
print(load_env(p))
with open(p, "a", encoding="utf-8") as f:
    f.write("not a valid line\n")
try:
    load_env(p)
except ValueError as e:
    print("ValueError:", e)
os.remove(p)
` },
      dry: { head: ['line', 'key', 'raw value', 'stored'], rows: [['2', 'DB_URL', '"postgres://u:p@h/db?x=1"', 'quotes removed'], ['3', 'DEBUG', 'true # dev only', "'true'"], ['4', 'MSG', "'hi # there'", "'hi # there'"], ['5', 'DEBUG', 'false', "overwrites → 'false'"]] },
      complexity: R`<p>O(file size) time; O(number of keys) memory.</p>`,
      followUps: ['Support &#36;{OTHER} variable interpolation (careful with cycles)', 'Never log secret values: how would you redact them in error messages?']
    }
  });

  practice.push({
    title: 'Predict the Output: Imports, Caching, __name__ and reload',
    level: 'Hard', tags: ['predict the output', 'modules', 'sys.modules', '__name__'], companies: ['Google', 'Meta', 'Bloomberg'],
    statement: R`<p>Two modules live in the same folder:</p>
      <pre># b.py
print("b runs as", __name__)
VALUE = 7

# a.py
print("a start")
import b
print("a end", b.VALUE)</pre>
      <p>Predict the full output of this main program:</p>
      <pre>import a
import b
import a
from b import VALUE
b.VALUE = 99
print(VALUE, b.VALUE, a.b.VALUE)
import importlib
importlib.reload(b)
print(VALUE, b.VALUE)</pre>`,
    constraints: R`Fresh interpreter; the folder is on sys.path; no other module named a or b exists.`,
    example: R`<p>First line printed is ${H.c('g', 'a start')}: importing <code>a</code> runs its top-level code, which imports <code>b</code> in the middle.</p>`,
    brute: {
      why: R`<p>Assuming each <code>import</code> statement re-runs the module leads to printing "a start" twice and "b runs" twice. Tracing <code>sys.modules</code> by hand fixes that.</p>`,
      code: { lang: 'python', run: true, code: R`
        cache = {}
        def fake_import(name, run):
            if name not in cache:          # first time: execute module code
                cache[name] = run()
            return cache[name]

        log = []
        fake_import("b", lambda: log.append("b runs") or {"VALUE": 7})
        fake_import("b", lambda: log.append("b runs AGAIN?") or {"VALUE": 7})
        print(log)                         # only one run
      ` }
    },
    mcq: { q: 'After <code>from b import VALUE</code> and then <code>b.VALUE = 99</code>, what is <code>VALUE</code> in main?', options: ['7 — the name was bound to the old object', '99 — names are linked', 'NameError', 'None'], answer: 0, explain: 'from-import creates a new name in main bound to whatever b.VALUE referred to at that moment (7). Rebinding b.VALUE later changes the module attribute, not main\'s name.' },
    hints: [
      R`<p>Hint 1: <code>import a</code> runs a.py, which prints "a start", then imports b (first time → b runs, with <code>__name__ == "b"</code>), then prints "a end 7".</p>`,
      R`<p>Hint 2: Later <code>import b</code> and <code>import a</code> are cache hits in <code>sys.modules</code>: no output. <code>a.b</code> is the same module object as <code>b</code>.</p>`,
      R`<p>Hint 3: <code>reload(b)</code> re-executes b.py in the SAME module object: prints again and resets <code>b.VALUE</code> to 7; main's <code>VALUE</code> name is untouched (still 7).</p>`
    ],
    tests: {
      io: true,
      cases: [{ stdin: '', stdout: 'a start\nb runs as b\na end 7\n7 99 99\nb runs as b\n7 7' }]
    },
    solution: {
      approach: R`<p>Output: <code>a start</code> / <code>b runs as b</code> / <code>a end 7</code> / <code>7 99 99</code> / <code>b runs as b</code> / <code>7 7</code>. Key facts: modules run once per process; every importer shares one module object; from-import copies the current binding; reload re-runs code in place.</p>`,
      code: { lang: 'python', run: true, code: R`
import importlib, sys, tempfile
from pathlib import Path

d = Path(tempfile.mkdtemp())
(d / "b.py").write_text('print("b runs as", __name__)\nVALUE = 7\n', encoding="utf-8")
(d / "a.py").write_text('print("a start")\nimport b\nprint("a end", b.VALUE)\n', encoding="utf-8")
sys.path.insert(0, str(d))
importlib.invalidate_caches()

import a
import b
import a
from b import VALUE
b.VALUE = 99
print(VALUE, b.VALUE, a.b.VALUE)     # 7 99 99
importlib.reload(b)                  # prints "b runs as b" again
print(VALUE, b.VALUE)                # 7 7
` },
      dry: { head: ['statement', 'sys.modules before', 'prints'], rows: [['import a', '{}', 'a start / b runs as b / a end 7'], ['import b', '{a, b}', '(nothing)'], ['import a', '{a, b}', '(nothing)'], ['print(...)', '{a, b}', '7 99 99'], ['reload(b)', '{a, b}', 'b runs as b'], ['print(...)', '{a, b}', '7 7']] },
      complexity: R`<p>Each cached import is an O(1) dictionary lookup; a first import costs the module's execution time.</p>`,
      followUps: ['What would change if a.py did "from b import VALUE" instead of "import b"?', 'Run python b.py directly: what does the first line print now?']
    }
  });

  practice.push({
    title: 'Find Duplicate Files by Content',
    level: 'Hard', tags: ['files', 'hashing', 'binary', 'os.walk'], companies: ['Dropbox', 'Google', 'Apple'],
    statement: R`<p>Given a root folder, return groups of file paths whose <b>contents are identical</b> (each group sorted, groups sorted by first path). Files can be huge, so never read a whole file into memory, and avoid hashing files that cannot possibly match.</p>`,
    constraints: R`Up to 10<sup>6</sup> files; sizes up to 10<sup>10</sup> bytes.`,
    example: R`<p><code>a.txt</code> = "hello", <code>sub/b.txt</code> = "hello", <code>c.txt</code> = "world" → ${H.c('g', "[['a.txt', 'sub/b.txt']]")}. <code>c.txt</code> has the same size (5 bytes) but a different hash, so it is not a duplicate.</p>`,
    brute: {
      why: R`<p>Compare every pair of files byte by byte: O(F²) comparisons, each reading two whole files. With 10<sup>5</sup> files that is 5·10<sup>9</sup> comparisons.</p>`,
      code: { lang: 'python', run: true, code: R`
        import itertools, os, tempfile
        def dupes_brute(paths):
            pairs = []
            for p, q in itertools.combinations(paths, 2):
                with open(p, "rb") as f, open(q, "rb") as g:
                    if f.read() == g.read():       # whole files in memory, every pair
                        pairs.append((p, q))
            return pairs

        d = tempfile.mkdtemp()
        names = []
        for n, text in [("a", b"hello"), ("b", b"hello"), ("c", b"world")]:
            path = os.path.join(d, n)
            with open(path, "wb") as f:
                f.write(text)
            names.append(path)
        print([(os.path.basename(p), os.path.basename(q)) for p, q in dupes_brute(names)])
      ` }
    },
    mcq: { q: 'Why group by file size before hashing?', options: ['Files of different sizes cannot be identical, and size is free from metadata', 'Hashing small files is unsafe', 'Size is a cryptographic hash', 'It sorts the output'], answer: 0, explain: 'os.path.getsize reads metadata only (no file content). Only files that share a size need hashing, which usually eliminates most files cheaply.' },
    hints: [
      R`<p>Hint 1: Walk the tree with <code>os.walk</code> (or <code>Path.rglob("*")</code>) and bucket paths by <code>os.path.getsize</code>.</p>`,
      R`<p>Hint 2: For buckets with ≥ 2 files, hash each in binary chunks: <code>h = hashlib.sha256(); while chunk := f.read(1 &lt;&lt; 20): h.update(chunk)</code>. Python 3.11+ has <code>hashlib.file_digest(f, "sha256")</code>.</p>`,
      R`<p>Hint 3: Bucket again by digest; keep groups of size ≥ 2. Optional speed-up: first hash only the first 4 KB to split big buckets before full hashing.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'a.txt\': b\'hello\', \'sub/b.txt\': b\'hello\', \'c.txt\': b\'world\', \'d.bin\': b\'x\' * 10}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          [['a.txt', 'sub/b.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          []
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'a\': b\'1\', \'b\': b\'22\', \'c\': b\'333\'}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          []
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'a\': b\'ab\', \'b\': b\'ba\'}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          []
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'z1\': b\'q\', \'z2\': b\'q\', \'a1\': b\'w\', \'a2\': b\'w\'}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          [['a1', 'a2'], ['z1', 'z2']]
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'e1\': b\'\', \'e2\': b\'\', \'e3\': b\'\'}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          [['e1', 'e2', 'e3']]
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'x/y/z/deep.txt\': b\'dup\', \'top.txt\': b\'dup\', \'mid/m.txt\': b\'dup\', \'other.txt\': b\'dup!\'}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          [['mid/m.txt', 'top.txt', 'x/y/z/deep.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'p1\': b\'x\' * (3 << 20), \'p2\': b\'x\' * ((3 << 20) - 1) + b\'y\'}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          []
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'q1\': b\'x\' * (3 << 20), \'q2\': b\'x\' * (3 << 20)}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          [['q1', 'q2']]
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'files = {\'a\': b\'k\', \'b\': b\'k\', \'c\': b\'k\', \'d\': b\'j\', \'e\': b\'j\'}\n' +
              'for rel, data in files.items():\n' +
              '    full = os.path.join(root, rel)\n' +
              '    os.makedirs(os.path.dirname(full), exist_ok=True)\n' +
              '    with open(full, \'wb\') as f:\n' +
              '        f.write(data)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          [['a', 'b', 'c'], ['d', 'e']]
        ],
        [
          [
            'import os, tempfile\n' +
              'root = tempfile.mkdtemp()\n' +
              'for i in range(1000):\n' +
              '    with open(os.path.join(root, \'f%d\' % i), \'wb\') as f:\n' +
              '        f.write(b\'u\' * (i + 1))\n' +
              'for i in range(2):\n' +
              '    with open(os.path.join(root, \'dup%d\' % i), \'wb\') as f:\n' +
              '        f.write(b\'u\' * 500)\n' +
              'result = [[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)]'
          ],
          [['dup0', 'dup1', 'f499']]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Three-stage funnel: size (free) → hash in streamed binary chunks (only for size collisions) → group by digest. Memory is O(number of files), never O(file size).</p>`,
      code: { lang: 'python', run: true, code: R`
import hashlib, os, tempfile
from collections import defaultdict

def file_hash(path, chunk=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(chunk):      # stream: constant memory
            h.update(block)
    return h.hexdigest()

def find_duplicates(root):
    by_size = defaultdict(list)
    for folder, _dirs, files in os.walk(root):
        for name in files:
            p = os.path.join(folder, name)
            by_size[os.path.getsize(p)].append(p)
    groups = []
    for paths in by_size.values():
        if len(paths) < 2:
            continue                       # unique size -> cannot be a duplicate
        by_hash = defaultdict(list)
        for p in paths:
            by_hash[file_hash(p)].append(p)
        groups.extend(sorted(g) for g in by_hash.values() if len(g) > 1)
    return sorted(groups)

root = tempfile.mkdtemp()
os.makedirs(os.path.join(root, "sub"))
for rel, data in [("a.txt", b"hello"), ("sub/b.txt", b"hello"), ("c.txt", b"world"), ("d.bin", b"x" * 10)]:
    with open(os.path.join(root, rel), "wb") as f:
        f.write(data)
print([[os.path.relpath(p, root) for p in g] for g in find_duplicates(root)])
` },
      dry: { head: ['stage', 'buckets', 'kept'], rows: [['by size', '5 bytes: a, sub/b, c · 10 bytes: d', '5-byte bucket only'], ['by sha256', 'hash(hello): a, sub/b · hash(world): c', 'group [a.txt, sub/b.txt]'], ['result', '—', "[['a.txt', 'sub/b.txt']]"]] },
      complexity: R`<p>O(total bytes of files that share a size) for hashing + O(F) metadata; memory O(F).</p>`,
      followUps: ['Skip symlinks and hard links to the same inode (os.stat st_ino)', 'Parallelise hashing with concurrent.futures', 'Replace duplicates with hard links safely']
    }
  });

  practice.push({
    title: 'Atomic File Writer Context Manager',
    level: 'Hard', tags: ['with', 'context managers', 'files', 'durability'], companies: ['Stripe', 'Databricks', 'Cloudflare'],
    statement: R`<p>Write a context manager <code>atomic_write(path, mode="w")</code> so that code inside the block writes to a file object, and <b>only if the block finishes without an exception</b> does <code>path</code> get replaced with the new content. Readers must never see a half-written file; on error the original file stays untouched and no temp files are left behind.</p>`,
    constraints: R`The target folder is writable; text modes use UTF-8; must work for "w" and "wb".`,
    example: R`<p>Existing config <code>"v1"</code>. A block writes <code>"v2-partial"</code> then raises → file still ${H.c('g', '"v1"')}, no <code>.tmp</code> files remain. A block that writes <code>"v2"</code> and ends normally → file becomes ${H.c('g', '"v2"')}.</p>`,
    brute: {
      why: R`<p>Opening the real file with <code>"w"</code> truncates it immediately. If the program crashes or raises halfway, the config is left empty or half-written, and any reader in the meantime sees garbage.</p>`,
      code: { lang: 'python', run: true, code: R`
        import os, tempfile
        p = os.path.join(tempfile.mkdtemp(), "config.txt")
        with open(p, "w", encoding="utf-8") as f:
            f.write("v1")
        try:
            with open(p, "w", encoding="utf-8") as f:   # truncates immediately
                f.write("v2-partial")
                raise RuntimeError("crash midway")
        except RuntimeError:
            pass
        print(open(p, encoding="utf-8").read())          # v2-partial: corrupted
      ` }
    },
    mcq: { q: 'Which call makes the final swap atomic on the same filesystem?', options: ['<code>os.replace(tmp, path)</code>', '<code>shutil.copy(tmp, path)</code>', '<code>open(path, "w").write(data)</code>', '<code>os.remove(path)</code> then <code>os.rename(tmp, path)</code>'], answer: 0, explain: 'os.replace is an atomic rename that overwrites the target in one step (POSIX rename semantics, also on Windows). Copying writes progressively; remove-then-rename has a window where the file does not exist.' },
    hints: [
      R`<p>Hint 1: Create the temp file in the <b>same directory</b> as the target (<code>tempfile.mkstemp(dir=...)</code>) — rename is only atomic within one filesystem.</p>`,
      R`<p>Hint 2: Use <code>@contextlib.contextmanager</code>: open the temp file, <code>yield</code> it, then flush + <code>os.fsync</code>, close, and <code>os.replace(tmp, path)</code>.</p>`,
      R`<p>Hint 3: Wrap the yield in try/except <code>BaseException</code>: on any error delete the temp file (ignore FileNotFoundError) and re-raise. Pass <code>encoding</code> only for text modes.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'cfg.write_text(\'v1\')\n' +
              'try:\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        f.write(\'v2-partial\')\n' +
              '        raise RuntimeError(\'crash\')\n' +
              'except RuntimeError:\n' +
              '    pass\n' +
              'result = [cfg.read_text(), sorted(p.name for p in folder.iterdir())]'
          ],
          ['v1', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'cfg.write_text(\'v1\')\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'v2\')\n' +
              'result = [cfg.read_text(), sorted(p.name for p in folder.iterdir())]'
          ],
          ['v2', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'with atomic_write(folder / \'blob.bin\', \'wb\') as f:\n' +
              '    f.write(bytes([1, 2, 3]))\n' +
              'result = [list((folder / \'blob.bin\').read_bytes()), sorted(p.name for p in folder.iterdir())]'
          ],
          [[1, 2, 3], ['blob.bin']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'try:\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        f.write(\'x\')\n' +
              '        raise ValueError(\'no\')\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = [cfg.exists(), sorted(p.name for p in folder.iterdir())]'
          ],
          [false, []]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'fresh\')\n' +
              'result = [cfg.read_text(), sorted(p.name for p in folder.iterdir())]'
          ],
          ['fresh', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'cfg.write_text(\'v1\')\n' +
              'try:\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        f.write(\'zz\')\n' +
              '        raise KeyboardInterrupt()\n' +
              'except KeyboardInterrupt:\n' +
              '    pass\n' +
              'result = [cfg.read_text(), sorted(p.name for p in folder.iterdir())]'
          ],
          ['v1', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'for i in range(100):\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        f.write(\'v\' + str(i))\n' +
              'result = [cfg.read_text(), sorted(p.name for p in folder.iterdir())]'
          ],
          ['v99', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'x\' * 5000000)\n' +
              'result = [len(cfg.read_text()), sorted(p.name for p in folder.iterdir())]'
          ],
          [5000000, ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'héllo €\')\n' +
              'result = cfg.read_text(encoding=\'utf-8\')'
          ],
          'héllo €'
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'cfg.write_text(\'old\')\n' +
              'with atomic_write(cfg) as f:\n' +
              '    pass\n' +
              'result = [cfg.read_text(), sorted(p.name for p in folder.iterdir())]'
          ],
          ['', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'cfg.write_text(\'v1\')\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'new\')\n' +
              '    f.flush()\n' +
              '    seen = cfg.read_text()\n' +
              'result = [seen, cfg.read_text()]'
          ],
          ['v1', 'new']
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'cfg.write_bytes(b\'old\')\n' +
              'try:\n' +
              '    with atomic_write(cfg, \'wb\') as f:\n' +
              '        f.write(b\'partial\')\n' +
              '        raise OSError(\'disk\')\n' +
              'except OSError:\n' +
              '    pass\n' +
              'result = [cfg.read_bytes().decode(), sorted(p.name for p in folder.iterdir())]'
          ],
          ['old', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'from pathlib import Path\n' +
              'folder = Path(tempfile.mkdtemp())\n' +
              'cfg = folder / \'config.txt\'\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'a\\nb\\n\')\n' +
              'result = cfg.read_text().splitlines()'
          ],
          ['a', 'b']
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Write to a sibling temp file, make it durable (flush + fsync), then atomically rename over the target. On failure, clean up the temp file and let the exception propagate. This is how editors, package managers and databases update files safely.</p>`,
      code: { lang: 'python', run: true, code: R`
import contextlib, os, tempfile
from pathlib import Path

@contextlib.contextmanager
def atomic_write(path, mode="w", encoding="utf-8"):
    path = Path(path)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, mode, encoding=None if "b" in mode else encoding) as f:
            yield f
            f.flush()
            os.fsync(f.fileno())           # data really on disk before the swap
        os.replace(tmp, path)               # atomic: readers see old OR new
    except BaseException:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(tmp)                  # leave no garbage behind
        raise

folder = Path(tempfile.mkdtemp())
cfg = folder / "config.txt"
cfg.write_text("v1", encoding="utf-8")
try:
    with atomic_write(cfg) as f:
        f.write("v2-partial")
        raise RuntimeError("crash midway")
except RuntimeError:
    pass
print(cfg.read_text(encoding="utf-8"), sorted(p.name for p in folder.iterdir()))
with atomic_write(cfg) as f:
    f.write("v2")
print(cfg.read_text(encoding="utf-8"))
with atomic_write(folder / "blob.bin", "wb") as f:
    f.write(bytes([1, 2, 3]))
print((folder / "blob.bin").read_bytes())
` },
      dry: { head: ['moment', 'config.txt', 'temp file', 'visible to readers'], rows: [['mkstemp', 'v1', 'empty', 'v1'], ['write v2-partial', 'v1', 'v2-partial', 'v1'], ['exception', 'v1', 'deleted', 'v1'], ['2nd block ends', 'v2 (os.replace)', 'renamed away', 'v2']] },
      complexity: R`<p>O(size of data) I/O plus one fsync; O(1) extra memory.</p>`,
      followUps: ['Also fsync the directory so the rename itself survives power loss (POSIX)', 'Preserve the original file permissions (os.stat / os.chmod)', 'How do databases achieve the same with a write-ahead log?']
    }
  });

  practice.push({
    title: 'Detect Circular Imports from Source Code',
    level: 'Hard', tags: ['modules', 'ast', 'graphs', 'DFS'], companies: ['Meta', 'Instagram', 'JetBrains'],
    statement: R`<p>You get a dict <code>{module_name: source_code}</code> for one project. Build the import graph using only <b>top-level</b> <code>import x</code> / <code>from x import y</code> statements (absolute imports of modules in the dict; ignore stdlib and imports inside functions). Return one import cycle as a list like <code>["a", "b", "c", "a"]</code>, or <code>None</code> if there is none.</p>`,
    constraints: R`Up to 10<sup>4</sup> modules; sources are valid Python.`,
    example: R`<p><code>a</code>: <code>import b</code>; <code>b</code>: <code>from c import f</code>; <code>c</code>: <code>import a</code> → ${H.c('r', "['a', 'b', 'c', 'a']")}. If <code>c</code> only imported <code>a</code> <b>inside a function</b>, there would be no import-time cycle → ${H.c('g', 'None')}.</p>`,
    brute: {
      why: R`<p>Grepping lines with a regex like <code>^import (\w+)</code> also matches text inside strings and docstrings, misses <code>from x import y</code> forms or multi-name imports, and cannot tell module-level imports from function-level ones.</p>`,
      code: { lang: 'python', run: true, code: R`
        import re
        src = 'DOC = """\nimport b\n"""\ndef f():\n    import c\n'
        print(re.findall(r"^\s*import (\w+)", src, flags=re.M))   # ['b', 'c'] - both wrong
      ` }
    },
    mcq: { q: 'Why can an import placed inside a function break a circular-import error?', options: ['It runs only when the function is called, after both modules finished loading', 'Functions have their own sys.modules', 'Python ignores imports in functions', 'It makes the import relative'], answer: 0, explain: 'Module-level imports run during module loading. A function-level import executes later, at call time, when both modules are fully initialised in sys.modules.' },
    hints: [
      R`<p>Hint 1: Use <code>ast.parse(source)</code> and look only at <code>tree.body</code> (top-level statements) for <code>ast.Import</code> and <code>ast.ImportFrom</code> nodes (with <code>level == 0</code>).</p>`,
      R`<p>Hint 2: For <code>import a.b</code> use the first part <code>a</code>; keep only names present in the dict. That gives adjacency lists.</p>`,
      R`<p>Hint 3: Cycle detection = DFS with three colours (white/grey/black). Meeting a grey node means a back edge: slice the current path from that node and append it again to close the loop.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'srcs = {\'a\': \'import b\\nimport os\\n\', \'b\': \'from c import f\\n\', \'c\': \'import a\\ndef f(): pass\\n\'}\n' +
              'deps = {\'a\': [\'b\'], \'b\': [\'c\'], \'c\': [\'a\']}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          true
        ],
        [
          [
            'srcs = {\'a\': \'import b\\nimport os\\n\', \'b\': \'from c import f\\n\', \'c\': \'def f():\\n    import a\\n\'}\n' +
              'deps = {\'a\': [\'b\'], \'b\': [\'c\'], \'c\': []}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          null
        ],
        [
          [
            'srcs = {\'a\': \'import a\\n\'}\n' +
              'deps = {\'a\': [\'a\']}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          true
        ],
        [
          [
            'srcs = {\'a\': \'import b\\n\', \'b\': \'import a\\n\'}\n' +
              'deps = {\'a\': [\'b\'], \'b\': [\'a\']}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          true
        ],
        [
          [
            'srcs = {\'a\': \'import b\\nimport c\\n\', \'b\': \'import d\\n\', \'c\': \'import d\\n\', \'d\': \'x = 1\\n\'}\n' +
              'deps = {\'a\': [\'b\', \'c\'], \'b\': [\'d\'], \'c\': [\'d\'], \'d\': []}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          null
        ],
        [
          [
            'srcs = {\'a\': \'import b\\n\', \'b\': \'import c\\n\', \'c\': \'import b\\n\'}\n' +
              'deps = {\'a\': [\'b\'], \'b\': [\'c\'], \'c\': [\'b\']}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          true
        ],
        [
          [
            'srcs = {\'a\': \'import os, sys\\nimport json\\n\', \'b\': \'from collections import deque\\n\'}\n' +
              'deps = {\'a\': [], \'b\': []}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          null
        ],
        [
          [
            'srcs = {\'a\': \'from . import b\\n\', \'b\': \'from .a import x\\n\'}\n' +
              'deps = {\'a\': [], \'b\': []}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          null
        ],
        [
          [
            'srcs = {}\n' +
              'deps = {}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          null
        ],
        [
          [
            'srcs = {\'a\': \'from b import x, y\\n\', \'b\': \'import a.sub\\n\'}\n' +
              'deps = {\'a\': [\'b\'], \'b\': [\'a\']}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          true
        ],
        [
          [
            'srcs = {\'x\': \'import y\\n\', \'y\': \'import z\\n\', \'z\': \'pass\\n\', \'p\': \'import q\\n\', \'q\': \'import p\\n\'}\n' +
              'deps = {\'x\': [\'y\'], \'y\': [\'z\'], \'z\': [], \'p\': [\'q\'], \'q\': [\'p\']}\n' +
              'r = find_cycle(srcs)\n' +
              'if r is None:\n' +
              '    result = None\n' +
              'else:\n' +
              '    result = r[0] == r[-1] and len(r) >= 2 and all(b in deps[a] for a, b in zip(r, r[1:]))'
          ],
          true
        ],
        [
          [
            'N = 5000\n' +
              'srcs = {\'m%d\' % i: \'import m%d\\n\' % (i + 1) for i in range(N - 1)}\n' +
              'srcs[\'m%d\' % (N - 1)] = \'x = 1\\n\'\n' +
              'result = find_cycle(srcs)'
          ],
          null
        ],
        [
          [
            'N = 5000\n' +
              'srcs = {\'m%d\' % i: \'import m%d\\n\' % ((i + 1) % N) for i in range(N)}\n' +
              'r = find_cycle(srcs)\n' +
              'result = [len(r), r[0] == r[-1], sorted(set(r)) == sorted(srcs)]'
          ],
          [5001, true, true]
        ],
        [
          [
            'N = 10000\n' +
              'srcs = {\'m%d\' % i: \'import m%d\\n\' % (i + 1) for i in range(N - 1)}\n' +
              'srcs[\'m%d\' % (N - 1)] = \'import m5000\\n\'\n' +
              'r = find_cycle(srcs)\n' +
              'result = [r[0] == r[-1], len(r) == 5001]'
          ],
          [true, true]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Parse with <code>ast</code> (robust to strings/comments), build a directed graph of module-level imports, then run a DFS with colour marking and an explicit stack (Python recursion stops at about 1000 frames, and a chain of 10<sup>4</sup> modules is allowed) to extract the first cycle found.</p>`,
      code: { lang: 'python', run: true, code: R`
import ast

def import_graph(sources: dict) -> dict:
    graph = {}
    for mod, src in sources.items():
        deps = []
        for node in ast.parse(src).body:           # top-level statements only
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                names = [node.module]
            else:
                continue
            for n in names:
                top = n.split(".")[0]
                if top in sources and top not in deps:
                    deps.append(top)
        graph[mod] = deps
    return graph

def find_cycle(sources: dict):
    graph = import_graph(sources)
    WHITE, GREY, BLACK = 0, 1, 2
    color = {m: WHITE for m in graph}
    for start in sorted(graph):
        if color[start] != WHITE:
            continue
        color[start] = GREY
        path = [start]                         # modules on the current DFS path
        stack = [iter(graph[start])]            # explicit stack: no recursion limit
        while path:
            for v in stack[-1]:
                if color[v] == GREY:           # back edge: cycle!
                    return path[path.index(v):] + [v]
                if color[v] == WHITE:
                    color[v] = GREY
                    path.append(v)
                    stack.append(iter(graph[v]))
                    break
            else:                              # all neighbours done
                color[path.pop()] = BLACK
                stack.pop()
    return None

project = {"a": "import b\nimport os\n", "b": "from c import f\n", "c": "import a\ndef f(): pass\n"}
print(find_cycle(project))                          # ['a', 'b', 'c', 'a']
project["c"] = "def f():\n    import a\n"            # deferred import
print(find_cycle(project))                          # None
` },
      dry: { head: ['dfs call', 'path', 'colour change', 'edge seen'], rows: [['dfs(a)', '[a]', 'a grey', 'a → b (white)'], ['dfs(b)', '[a, b]', 'b grey', 'b → c (white)'], ['dfs(c)', '[a, b, c]', 'c grey', 'c → a (<span class="c-r">grey!</span>)'], ['return', '—', '—', "['a', 'b', 'c', 'a']"]] },
      complexity: R`<p>O(total source size) to parse + O(V + E) for the DFS. Recursion depth up to V; use an explicit stack for very deep graphs.</p>`,
      followUps: ['Resolve relative imports using the resolve() function from the packages topic', 'Return ALL cycles (strongly connected components, Tarjan)', 'Also treat imports inside if/try at module level as top-level']
    }
  });

  practice.push({
    title: 'Version Specifier Checker (==, !=, >=, <, ~=, .*)',
    level: 'Hard', tags: ['packaging', 'parsing', 'tuples', 'PEP 440'], companies: ['GitHub', 'Anaconda', 'Astral'],
    statement: R`<p>Write <code>satisfies(version, spec)</code> for purely numeric dotted versions (like <code>"2.10.1"</code>). <code>spec</code> is a comma-separated list (all must hold) of clauses with operators <code>==, !=, &gt;=, &lt;=, &gt;, &lt;, ~=</code>; <code>==</code>/<code>!=</code> may use a trailing <code>.*</code> prefix wildcard. Missing parts count as zero (<code>1.0 == 1.0.0</code>). <code>~=X.Y[.Z]</code> needs at least two parts. Raise <code>ValueError</code> on bad syntax.</p>`,
    constraints: R`Versions have 1–6 numeric parts; spec has ≤ 10 clauses.`,
    example: R`<p><code>satisfies("2.10.1", "&gt;=2.2,&lt;3")</code> → ${H.c('g', 'True')} (10 &gt; 2 numerically, while the strings "2.10" &lt; "2.2"!). <code>satisfies("2.3", "~=2.2.0")</code> → ${H.c('r', 'False')} (~=2.2.0 means ≥2.2.0 and ==2.2.*). <code>satisfies("1.4.7", "==1.4.*")</code> → ${H.c('g', 'True')}.</p>`,
    brute: {
      why: R`<p>Comparing version <b>strings</b> directly is wrong: <code>"2.10" &lt; "2.9"</code> is True in string order because "1" &lt; "9". Versions must be compared as tuples of integers.</p>`,
      code: { lang: 'python', run: true, code: R`
        print("2.10" < "2.9")                          # True  (wrong for versions)
        print((2, 10) < (2, 9))                        # False (correct)
        print(tuple(map(int, "2.10".split("."))))      # (2, 10)
      ` }
    },
    mcq: { q: 'Which version does <code>~=1.4.2</code> accept?', options: ['1.4.9', '1.5.0', '1.4.1', '2.0'], answer: 0, explain: '~=1.4.2 means >=1.4.2 AND ==1.4.*: patch updates only. 1.5.0 changes the minor version; 1.4.1 is too low.' },
    hints: [
      R`<p>Hint 1: Parse each clause with a regex: <code>^(~=|==|!=|&gt;=|&lt;=|&gt;|&lt;)\s*(\d+(?:\.\d+)*)(\.\*)?$</code>; wildcards only with == and !=.</p>`,
      R`<p>Hint 2: Convert to int tuples and pad the shorter with zeros before comparing, so (1, 0) equals (1, 0, 0). Python compares tuples lexicographically — exactly version order.</p>`,
      R`<p>Hint 3: <code>~=V</code> = (version ≥ V) and (version's first len(V)−1 parts equal V's). <code>==P.*</code> = version's first len(P) parts (padded) equal P. Combine clauses with <code>all()</code>.</p>`
    ],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['satisfies(\'2.10.1\', \'>=2.2,<3\')'], true],
        [['satisfies(\'2.3\', \'~=2.2.0\')'], false],
        [['satisfies(\'2.9\', \'~=2.2\')'], true],
        [['satisfies(\'1.4.7\', \'==1.4.*\')'], true],
        [['satisfies(\'1.0\', \'==1.0.0\')'], true],
        [['satisfies(\'3.0\', \'>=2.2,<3\')'], false],
        [['satisfies(\'2.5.1\', \'>=2,!=2.5.1\')'], false],
        [['satisfies(\'1.5\', \'==1.4.*\')'], false],
        [['satisfies(\'1.4\', \'!=1.4.*\')'], false],
        [['satisfies(\'3.0\', \'~=2.2\')'], false],
        [['satisfies(\'2.2.5\', \'~=2.2.0\')'], true],
        [['satisfies(\'2.2.0\', \'~=2.2.0\')'], true],
        [['satisfies(\'2.1.9\', \'~=2.2.0\')'], false],
        [['satisfies(\'1.0.0.0.0.0\', \'==1\')'], true],
        [['satisfies(\'2.10\', \'>2.9\')'], true],
        [['satisfies(\'2\', \'>=2.0.0\')'], true],
        [['satisfies(\'1.0\', \'<=1.0.0\')'], true],
        [['satisfies(\'1.0\', \'<1.0.0\')'], false],
        [['satisfies(\'1.0.1\', \'~=1.0.1\')'], true],
        [['satisfies(\'1.1\', \'~=1.0.1\')'], false],
        [['satisfies(\'1.2.3\', \'!=1.2.4\')'], true],
        [['satisfies(\'1.2.4\', \'!=1.2.4\')'], false],
        [['satisfies(\'9\', \'==9.*\')'], true],
        [['satisfies(\'10.0.0\', \'>9,<11\')'], true],
        [['satisfies(\'0.0.1\', \'>0\')'], true],
        [['satisfies(\'1.0\', \'>= 1.0 , < 2\')'], true],
        [['satisfies(\'1.0\', \'~=1\')'], '!ValueError'],
        [['satisfies(\'1.0\', \'abc\')'], '!ValueError'],
        [['satisfies(\'1.0\', \'>=\')'], '!ValueError'],
        [['satisfies(\'1.0\', \'\')'], '!ValueError'],
        [['satisfies(\'1.0\', \'>=1.a\')'], '!ValueError'],
        [['satisfies(\'1.0\', \'>=1.*\')'], '!ValueError'],
        [['satisfies(\'1.0\', \'=>1\')'], '!ValueError'],
        [['satisfies(\'1.0\', \'>=0,>=0,>=0,>=0,>=0,>=0,>=0,>=0,>=0,>=0\')'], true],
        [['satisfies(\'1.0\', \'>=0,xx\')'], '!ValueError']
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: R`<p>Tokenise with a regex, normalise to zero-padded integer tuples, and map each operator to a tuple comparison. Prefix matching handles <code>.*</code> and the compatible-release operator. (Real tools: <code>packaging.specifiers.SpecifierSet</code>, which also handles pre-releases, post-releases and local versions.)</p>`,
      code: { lang: 'python', run: true, code: R`
import operator, re

CLAUSE = re.compile(r"^(~=|==|!=|>=|<=|>|<)\s*(\d+(?:\.\d+)*)(\.\*)?$")
OPS = {"==": operator.eq, "!=": operator.ne, ">=": operator.ge,
       "<=": operator.le, ">": operator.gt, "<": operator.lt}

def parse(v: str) -> tuple:
    return tuple(int(p) for p in v.split("."))

def pad(a: tuple, b: tuple):
    n = max(len(a), len(b))
    return a + (0,) * (n - len(a)), b + (0,) * (n - len(b))

def prefix_match(v: tuple, prefix: tuple) -> bool:
    return (v + (0,) * len(prefix))[:len(prefix)] == prefix

def check(v: tuple, op: str, target: str, star: bool) -> bool:
    t = parse(target)
    if star:
        if op not in ("==", "!="):
            raise ValueError(f"wildcard not allowed with {op}")
        return prefix_match(v, t) == (op == "==")
    if op == "~=":
        if len(t) < 2:
            raise ValueError("~= needs at least two version parts")
        a, b = pad(v, t)
        return a >= b and prefix_match(v, t[:-1])
    a, b = pad(v, t)
    return OPS[op](a, b)

def satisfies(version: str, spec: str) -> bool:
    v = parse(version)
    results = []
    for clause in spec.split(","):
        m = CLAUSE.match(clause.strip())
        if not m:
            raise ValueError(f"bad clause: {clause!r}")
        op, target, star = m.groups()
        results.append(check(v, op, target, bool(star)))
    return all(results)

cases = [("2.10.1", ">=2.2,<3"), ("2.3", "~=2.2.0"), ("2.9", "~=2.2"), ("1.4.7", "==1.4.*"),
         ("1.0", "==1.0.0"), ("3.0", ">=2.2,<3"), ("2.5.1", ">=2,!=2.5.1")]
for v, s in cases:
    print(f"{v:>7} {s:<12} {satisfies(v, s)}")
try:
    satisfies("1.0", "~=1")
except ValueError as e:
    print("ValueError:", e)
` },
      dry: { head: ['version', 'clause', 'padded compare', 'result'], rows: [['2.10.1', '&gt;=2.2', '(2,10,1) ≥ (2,2,0)', 'True'], ['2.10.1', '&lt;3', '(2,10,1) &lt; (3,0,0)', 'True → all True'], ['2.3', '~=2.2.0', '≥ ok, prefix (2,3) ≠ (2,2)', 'False'], ['1.4.7', '==1.4.*', 'prefix (1,4) = (1,4)', 'True']] },
      complexity: R`<p>O(C · P) for C clauses and P version parts.</p>`,
      followUps: ['Support pre-releases like 2.0rc1 (excluded by default unless asked for)', 'Given many candidate versions, pick the newest that satisfies the spec (what pip does)', 'Why does PEP 440 treat 1.0 and 1.0.0 as equal?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'What does <code>"python"[1:4]</code> evaluate to?', options: ['<code>\'yth\'</code>', '<code>\'ytho\'</code>', '<code>\'pyt\'</code>', '<code>\'th\'</code>'], answer: 0, explain: 'Start index 1 is included, stop index 4 is excluded: characters at 1, 2, 3 → y, t, h.' },
    { q: 'You run <code>name = "  Asha "</code> then <code>name.strip()</code> on its own line. What is <code>name</code> now?', options: ['Still <code>"  Asha "</code>', '<code>"Asha"</code>', '<code>None</code>', 'It raises TypeError'], answer: 0, explain: 'Strings are immutable; strip() returns a NEW string that was thrown away. Write name = name.strip().' },
    { q: 'Which f-string prints <code>0042</code>?', options: ['<code>f"{42:04d}"</code>', '<code>f"{42:4d}"</code>', '<code>f"{42:.4}"</code>', '<code>f"{42:*&gt;4}"</code>'], answer: 0, explain: 'The 0 flag with width 4 zero-pads integers. Plain width 4 pads with spaces ("  42"), *&gt;4 pads with stars ("**42"), and precision is not allowed for integers.' },
    { q: '<code>len("naïve".encode("utf-8"))</code> is…', options: ['6', '5', '10', '4'], answer: 0, explain: '5 characters, but ï (U+00EF) needs 2 bytes in UTF-8, so the encoded length is 6.' },
    { q: 'What is <code>b"AB"[0]</code>?', options: ['<code>65</code> (an int)', '<code>b"A"</code>', '<code>"A"</code>', 'TypeError'], answer: 0, explain: 'Indexing bytes returns the integer value of that byte. Slicing (b"AB"[0:1]) returns bytes.' },
    { q: 'Which mode opens a file for writing but fails if it already exists?', options: ['<code>"x"</code>', '<code>"w"</code>', '<code>"a"</code>', '<code>"r+"</code>'], answer: 0, explain: '"x" is exclusive creation and raises FileExistsError if the file exists. "w" would silently erase it.' },
    { q: 'What does <code>f.readline()</code> return at the end of a file?', options: ['An empty string <code>\'\'</code>', '<code>None</code>', 'It raises EOFError', '<code>"\\n"</code>'], answer: 0, explain: 'Reads at EOF return the empty string (b"" in binary mode). A blank line in the middle of a file is "\\n", so the two are distinguishable.' },
    { q: 'An exception is raised inside <code>with open(p, "w") as f:</code>. What happens?', options: ['The file is flushed and closed, then the exception keeps propagating', 'The exception is swallowed', 'The file stays open', 'The data written so far is discarded'], answer: 0, explain: 'with guarantees __exit__ runs; the file object\'s __exit__ closes (and flushes) the file and returns a falsy value, so the exception propagates.' },
    { q: 'A module contains <code>print("hi")</code> at top level. You import it three times in one program. How many times is "hi" printed?', options: ['Once', 'Three times', 'Zero', 'Twice'], answer: 0, explain: 'The first import executes the module and stores it in sys.modules; later imports are cache hits that do not re-run the code.' },
    { q: 'You run <code>python tools/report.py</code> and get <code>ImportError: attempted relative import with no known parent package</code>. Best fix?', options: ['Run <code>python -m tools.report</code> from the project root', 'Add <code>sys.path.append("..")</code>', 'Rename the file', 'Delete <code>__init__.py</code>'], answer: 0, explain: 'Run as a module so Python knows the package (__package__ = "tools") and relative imports can be resolved. sys.path hacks hide the real problem.' },
    { q: 'Inside a virtual environment, which is true?', options: ['<code>sys.prefix != sys.base_prefix</code>', '<code>sys.prefix == sys.base_prefix</code>', 'The standard library is copied into the venv', 'pip installs into the system site-packages'], answer: 0, explain: 'A venv sets sys.prefix to the venv folder while sys.base_prefix still points to the base installation (whose stdlib it reuses).' },
    { q: 'Why prefer <code>python -m pip install x</code> over <code>pip install x</code>?', options: ['It guarantees pip installs into the same interpreter that python runs', 'It is faster', 'It installs globally', 'It skips dependency resolution'], answer: 0, explain: 'The pip on PATH may belong to a different Python. python -m pip runs pip as a module of exactly that interpreter.' },
    { q: 'What does <code>if __name__ == "__main__":</code> protect?', options: ['Code that should run only when the file is executed directly, not when imported', 'Private functions from being imported', 'The module from being imported twice', 'Global variables from changing'], answer: 0, explain: '__name__ is "__main__" only for the entry script (or python -m target). When imported, __name__ is the module\'s dotted name and the guarded block is skipped.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'Why are Python strings immutable, and what does that mean for performance?', level: 'B', a: R`<p><b>Immutable</b> means a str object can never change after creation; every "modification" (<code>upper()</code>, <code>replace()</code>, slicing, <code>+</code>) creates a new object. Benefits: strings are <b>hashable</b> (safe dict keys and set members, hash cached once), <b>thread-safe</b> to share, and can be <b>interned</b>/reused. Cost: building a long string with <code>+=</code> in a loop may copy repeatedly (O(n²) worst case), so collect pieces in a list and use <code>"".join(parts)</code> (O(n)). CPython sometimes resizes in place for <code>+=</code>, but that is an implementation detail; join is the portable idiom.</p>`, followUps: ['How would you efficiently build a 1 MB string from many small pieces?', 'What is io.StringIO useful for?'] },
    { q: 'Explain slicing <code>s[start:stop:step]</code>, including negative values and out-of-range behaviour.', level: 'B', a: R`<p><code>start</code> is included, <code>stop</code> excluded, <code>step</code> is the jump (default 1). Omitted values mean "from the edge" in the direction of the step. Negative indexes count from the end (<code>-1</code> is the last). A negative step walks backwards, so <code>s[::-1]</code> reverses. Slices <b>clamp</b> out-of-range indexes (<code>s[2:1000]</code> is fine, <code>s[10:]</code> on a short string is <code>''</code>), while indexing (<code>s[1000]</code>) raises IndexError. A zero step raises ValueError. Slicing creates a new object in O(k) for k elements.</p>`, followUps: ['What is "abcdef"[-2:-5:-1]?', 'How does slice(1, 5, 2).indices(len(s)) help?'] },
    { q: 'What is the difference between <code>str</code> and <code>bytes</code>? When do you encode and decode?', level: 'B', a: R`<p><code>str</code> is a sequence of Unicode code points (text); <code>bytes</code> is a sequence of integers 0–255 (raw data). Programs should follow the <b>Unicode sandwich</b>: decode bytes to str as soon as data enters (file, socket, HTTP body), work in str internally, encode back to bytes at the exit. Encoding needs a codec — almost always UTF-8. Mixing them raises TypeError; decoding invalid data raises UnicodeDecodeError unless an <code>errors=</code> policy (replace/ignore/backslashreplace) is chosen deliberately. Hashing, encryption, sockets and binary files need bytes.</p>`, followUps: ['Why is len("😀") 1 in Python but "😀".length 2 in JavaScript?', 'What is mojibake and how do you repair it?'] },
    { q: 'How does UTF-8 encode characters, and why is it the default almost everywhere?', level: 'I', a: R`<p>UTF-8 is a variable-length encoding using 1–4 bytes per code point: ASCII (0–127) is one byte identical to ASCII, U+0080–U+07FF use two bytes (<code>110xxxxx 10xxxxxx</code>), up to U+FFFF three bytes, and the rest four. Advantages: backward compatible with ASCII, no byte-order issues (no BOM needed), compact for Latin text, and <b>self-synchronising</b> — continuation bytes always start with <code>10</code>, so you can find character boundaries from any position. That property lets you truncate byte strings safely by backing up over continuation bytes.</p>`, followUps: ['How would you truncate a string to 255 UTF-8 bytes without breaking characters?', 'What is the utf-8-sig codec for?'] },
    { q: 'Compare f-strings, <code>str.format</code>, %-formatting and <code>string.Template</code>. When would you pick each?', level: 'I', a: R`<p><b>f-strings</b>: default choice — readable, fastest (compiled to bytecode), full format-spec support, <code>{x=}</code> for debugging. <b>str.format</b>: when the template is defined separately from the data (config, i18n catalogues) — but never format user-supplied templates with rich objects, since <code>{0.__class__...}</code> attribute access can leak data. <b>% formatting</b>: legacy, but still idiomatic for the <code>logging</code> module because the message is only formatted if emitted. <b>string.Template</b> (<code>$name</code>): safest for user-editable templates (no attribute access, no expressions). Python 3.14's <b>t-strings</b> return a Template object so libraries can escape values (SQL/HTML) safely.</p>`, followUps: ['Why does ruff flag f-strings in logging calls?', 'How does an object customise f"{obj:spec}"?'] },
    { q: 'What happens step by step when Python executes <code>with open("f.txt") as f:</code>?', level: 'B', a: R`<p>1) <code>open()</code> returns a file object (a context manager). 2) Python calls <code>type(obj).__enter__(obj)</code>; for files it returns the file itself, bound to <code>f</code>. 3) The block runs. 4) When the block exits — normally, via return/break, or by an exception — Python calls <code>__exit__(exc_type, exc, tb)</code> (Nones if no exception). The file's __exit__ flushes and closes it. 5) If __exit__ returns a falsy value, any exception continues propagating. It is equivalent to a try/finally but cannot be forgotten, and it ties cleanup to setup visually.</p>`, followUps: ['When is __exit__ NOT called?', 'How would you open a variable number of files safely? (ExitStack)'] },
    { q: 'How do you process a file that is much larger than RAM?', level: 'I', a: R`<p>Never call <code>read()</code> or <code>readlines()</code> on it. For text, iterate the file object (<code>for line in f</code>) — it reads buffered chunks and yields one line at a time, so memory is O(longest line). For binary, read fixed-size blocks (<code>while chunk := f.read(1 &lt;&lt; 20)</code>). Keep only aggregates (counters, bounded <code>deque(maxlen=n)</code>, heaps of top-k). For random access use <code>seek</code> (e.g. reading backwards for tail) or <code>mmap</code>. For heavy analytics, stream into a columnar format or a database rather than parsing text repeatedly.</p>`, followUps: ['How would you get the last 10 lines of a 100 GB log quickly?', 'How would you count unique IPs if they do not fit in memory?'] },
    { q: 'Explain the file open modes and the most dangerous mistake people make with them.', level: 'B', a: R`<p><code>"r"</code> read (error if missing), <code>"w"</code> write (creates; <b>truncates an existing file immediately on open</b>), <code>"a"</code> append (all writes go to the end), <code>"x"</code> exclusive create (error if it exists); add <code>"b"</code> for bytes and <code>"+"</code> for read+write (<code>"r+"</code> overwrites in place without truncating). The dangerous mistake is using <code>"w"</code> on an important file when you meant "a", or crashing mid-rewrite and leaving a truncated file. Safe rewrite: write to a temp file in the same directory and <code>os.replace</code> it atomically. Also always pass <code>encoding="utf-8"</code> in text modes.</p>`, followUps: ['Why does csv need newline=""?', 'What is the difference between flush() and os.fsync()?'] },
    { q: 'Walk through what <code>import mymod</code> does internally.', level: 'I', a: R`<p>1) Check <code>sys.modules</code>; if present, bind and stop. 2) Ask each finder on <code>sys.meta_path</code> for a spec: built-in modules, frozen modules, then <code>PathFinder</code>, which searches the folders in <code>sys.path</code> in order (script folder, PYTHONPATH, stdlib, site-packages) — first match wins. 3) The loader creates a module object, <b>inserts it into sys.modules before executing</b>, then runs the module's code (using a cached <code>.pyc</code> in <code>__pycache__</code> when the source is unchanged). 4) The name <code>mymod</code> is bound in the importer's namespace. If nothing is found: ModuleNotFoundError. If execution fails, the entry is removed from sys.modules.</p>`, followUps: ['Why does inserting into sys.modules before execution matter for circular imports?', 'How can a local file shadow a standard-library module?'] },
    { q: 'What causes circular imports and how do you fix them?', level: 'I', a: R`<p>Module A imports B at top level and B imports A (directly or via others). When B runs, A is already in sys.modules but only partially executed, so <code>from A import X</code> fails with "cannot import name X from partially initialized module A". Fixes, best first: <b>restructure</b> — move the shared code into a third module both depend on; depend on interfaces rather than concrete modules; use <code>import A</code> and access <code>A.X</code> at call time instead of from-imports at load time; move the import into the function that needs it; for type hints only, use <code>if TYPE_CHECKING:</code> imports with <code>from __future__ import annotations</code>.</p>`, followUps: ['How would you detect cycles automatically in CI?', 'Why does "import A" sometimes work where "from A import X" fails?'] },
    { q: 'What is the purpose of <code>if __name__ == "__main__":</code>, and what is the difference between <code>python file.py</code> and <code>python -m package.module</code>?', level: 'B', a: R`<p>Every module has <code>__name__</code>: its dotted import name, or <code>"__main__"</code> for the program's entry point. The guard lets one file be both an importable library (no side effects on import) and a runnable script; it is also required for multiprocessing with the spawn start method. <code>python file.py</code> runs a path: sys.path[0] becomes the file's folder and the module has no package, so relative imports fail. <code>python -m pkg.mod</code> runs by import name: the current directory goes on sys.path, parent packages are imported properly, <code>__package__</code> is set, and relative imports work. Running a package with -m executes its <code>__main__.py</code>.</p>`, followUps: ['What is the "double import trap"?', 'How do console_scripts entry points relate to this?'] },
    { q: 'What is a package, what is <code>__init__.py</code> for, and what are namespace packages?', level: 'I', a: R`<p>A package is a module that can contain submodules — on disk, a folder. <code>__init__.py</code> runs when the package is first imported; it can be empty or define the package's public API (re-exporting names, setting <code>__all__</code>). Packages have a <code>__path__</code> used to find their submodules. Since PEP 420, a folder without <code>__init__.py</code> is a <b>namespace package</b>: its <code>__path__</code> can merge folders from several sys.path entries, letting separately installed distributions share one top-level name (e.g. <code>google.cloud.*</code>). For normal applications use regular packages with <code>__init__.py</code>; keep it light because it runs on every submodule import.</p>`, followUps: ['What does __all__ control?', 'Why do some libraries lazily import submodules in __init__ via __getattr__?'] },
    { q: 'Why use virtual environments? How do they work internally?', level: 'B', a: R`<p>Different projects need different (often conflicting) package versions, and installing into the system Python can break OS tools (hence PEP 668's externally-managed error). A venv gives each project an isolated <code>site-packages</code>. Internally it is just a folder with <code>pyvenv.cfg</code>, a <code>bin/</code> (or <code>Scripts\</code>) containing a python link/launcher, and an empty site-packages. When Python starts and finds pyvenv.cfg, it sets <code>sys.prefix</code> to the venv and uses its site-packages, while the standard library comes from <code>sys.base_prefix</code>. Activation only edits PATH and the prompt; running <code>.venv/bin/python</code> directly is equivalent. Venvs are disposable — recreate them from a lock/requirements file rather than copying them between machines.</p>`, followUps: ['Why should .venv not be committed to git?', 'How does uv make environment creation so fast?'] },
    { q: 'How do you make a Python project\'s dependencies reproducible and secure?', level: 'A', a: R`<p>Separate <b>abstract</b> requirements (ranges in <code>pyproject.toml</code>, e.g. <code>requests&gt;=2.31,&lt;3</code>) from a <b>lock</b> of exact versions for deployments (<code>uv.lock</code>, <code>poetry.lock</code>, <code>pylock.toml</code> per PEP 751, or a fully pinned <code>requirements.txt</code> from <code>pip-compile</code>/<code>pip freeze</code>). Install in CI from the lock, ideally with hashes (<code>--require-hashes</code>) so tampered artifacts are rejected. Pin the Python version (<code>requires-python</code>, <code>.python-version</code>). Audit with <code>pip-audit</code> or Dependabot, review every new dependency (is it real, maintained, popular, correctly spelled — typosquatting and AI-hallucinated "slopsquatting" names are real attacks), and prefer wheels from trusted publishers. Rebuild environments from scratch in CI to catch "works on my machine" drift.</p>`, followUps: ['What does ~= mean and when would you use it?', 'Libraries vs applications: why shouldn\'t a library pin exact versions?'] }
  );

  registerModule({
    id: 'py03',
    title: 'Strings, Files, Modules & Packages',
    intro: R`<p>Almost every real Python program does four things: it <b>handles text</b>, <b>talks to files</b>, is <b>split into modules</b>, and <b>depends on packages</b> someone else wrote. This module teaches all four from zero, the way a friend would explain them, and then takes each one down to what really happens inside CPython.</p>
      <p>You will learn to slice and clean strings without off-by-one errors, format reports with f-strings, understand why <code>"café"</code> is 4 characters but 5 bytes, read gigabyte files with constant memory, make cleanup automatic with <code>with</code>, know exactly how <code>import</code> finds a module (and why your <code>random.py</code> broke everything), organise code into packages, use <code>if __name__ == "__main__":</code> and <code>python -m</code> correctly, and manage dependencies with venv, pip and modern tools like uv.</p>
      <p>Every topic has an everyday analogy, a step-by-step visualizer (string index boxes, a UTF-8 encoder, a moving file cursor, import-resolution diagrams), runnable examples, "predict the output" puzzles, interview clues, and a section on working alongside AI tools in 2026.</p>`,
    goals: [
      'Read and write any slice (<code>s[a:b:c]</code>, negative indexes and steps) instantly and use the core string methods without immutability bugs',
      'Format numbers, tables and debug output with f-strings and the format-spec mini-language, and choose between str() and repr()',
      'Explain str vs bytes, encode/decode correctly with UTF-8, and diagnose UnicodeDecodeError and mojibake',
      'Read and write text, CSV, JSON and binary files safely: correct modes, encodings, streaming large files, cursor control and atomic writes',
      'Use <code>with</code> to guarantee cleanup and explain the __enter__/__exit__ protocol',
      'Explain how import searches sys.modules and sys.path, avoid shadowing and circular imports, and structure code into packages with relative imports',
      'Use <code>if __name__ == "__main__":</code> and <code>python -m</code> correctly, and manage isolated, reproducible dependencies with venv, pip, requirements/pyproject and uv'
    ],
    prereqs: R`<p>Python 1 (Setup, Syntax, Types &amp; I/O) and Python 2 (Control Flow, Functions &amp; Core Collections): you should be comfortable with variables, loops, functions, lists, dicts and basic slicing of lists. No prior file or packaging experience needed.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
