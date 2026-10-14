(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // String.raw keeps backslashes exactly as typed, so Python code like "a\nb" stays "a\nb".
  var R = String.raw;

  /* ----------------------------------------------------------------------
     Shared visualizer helpers for py13 (Performance & Expert Python + Gotchas)
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function words(s) { return String(s === undefined ? '' : s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }
  function nums(s, max, hint) {
    var a = words(s).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x); })) throw new Error(hint || 'Enter numbers separated by spaces, e.g. 3 1 4 1 5');
    if (a.length > (max || 12)) throw new Error('Use at most ' + (max || 12) + ' numbers');
    return a;
  }
  function round1(x) { return Math.round(x * 10) / 10; }
  function pct(part, whole) { return whole ? Math.round(part * 1000 / whole) / 10 : 0; }
  // Python-style repr of a list of numbers/strings.
  function pyList(a) {
    return '[' + a.map(function (v) { return typeof v === 'string' ? "'" + v + "'" : String(v); }).join(', ') + ']';
  }
  // Left-to-right chain of boxes as a graph part.
  function chain(boxes, opt) {
    opt = opt || {};
    var n = boxes.length, nodes = [], edges = [];
    boxes.forEach(function (b, i) {
      nodes.push({ id: b.id, label: b.label, shape: 'box', x: b.x !== undefined ? b.x : (n === 1 ? 50 : 8 + i * (84 / (n - 1))), y: b.y !== undefined ? b.y : 22 });
      if (i > 0 && !b.noEdge) edges.push([boxes[i - 1].id, b.id, b.edge || '']);
    });
    (opt.extraEdges || []).forEach(function (e) { edges.push(e); });
    return { type: 'graph', label: opt.label || 'Flow', directed: true, height: opt.height || 44, nodes: nodes, edges: edges, hl: opt.hl || {}, ehl: opt.ehl || {}, tags: opt.tags || {} };
  }

  /* ======================================================================
     TOPIC 1: Measure first — cProfile, pstats, timeit
     ====================================================================== */
  topics.push({
    title: 'Measure First: Profiling with cProfile, pstats & timeit',
    analogy: R`<p>Your car is using too much fuel. You could replace the tyres, the seats and the radio "just in case" — or you could plug in the <b>diagnostic computer</b> that tells you <i>"cylinder 3 is misfiring"</i>. A <b>profiler</b> is that diagnostic computer for code. It watches the program run and tells you exactly which function eats the time, so you fix the one broken cylinder instead of guessing. <b>timeit</b> is the stopwatch you use afterwards to prove the fix really helped.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Programmers are famously bad at guessing where time goes. The golden rule of performance work is: <b>measure → find the hot spot → fix only that → measure again</b>. Python ships two tools in the standard library for this:</p>
<ul>
<li><b><code>cProfile</code></b> — a <i>profiler</i>: it records every function call (how many times, how long) for a whole program run. Use it to answer <i>"WHERE is the time going?"</i></li>
<li><b><code>timeit</code></b> — a <i>micro-benchmark</i> stopwatch: it runs one small statement thousands of times and reports a stable number. Use it to answer <i>"Is version B faster than version A?"</i></li>
</ul>
<p>Reading a cProfile report needs just four columns:</p>
${H.table(['column', 'plain meaning', 'use it to…'], [
  ['<code>ncalls</code>', 'how many times the function was called', 'spot a function called a million times by accident'],
  ['<code>tottime</code>', 'time spent <b>inside</b> this function only (children excluded)', 'find the function doing the actual heavy work'],
  ['<code>cumtime</code>', 'time inside this function <b>plus everything it called</b>', 'find which high-level step is slow'],
  ['<code>percall</code>', 'tottime ÷ ncalls (or cumtime ÷ ncalls)', 'tell "slow once" from "fast but called too often"']
])}
<p>A typical session: ${H.c('b', 'sort by cumtime')} to see which big step is slow, then ${H.c('y', 'sort by tottime')} to see which small function inside it burns the CPU. Then fix, then confirm with <code>timeit</code>.</p>
<p><b>Amdahl's law in one line:</b> if a function takes ${H.c('r', '80%')} of the run and you make it 10× faster, the whole program gets about <b>3.6×</b> faster (0.2 + 0.8/10 = 0.28 of the original time). If it takes only ${H.c('m', '2%')}, even an infinite speed-up saves at most 2%. That is why you profile first.</p>
<p>🔵 <b>How the tools really work:</b> cProfile is a <i>deterministic</i> (tracing) profiler: CPython calls a hook on every function call and return, so you get exact call counts but pay overhead on call-heavy code. <code>timeit</code> turns your statement into a tiny function with a loop, switches off the garbage collector while timing, and uses <code>time.perf_counter()</code> — the highest-resolution clock available.</p>`,
    clues: [
      '"The service got slow after the last release — how would you find out why?" → profile before touching code',
      '"Which of these two snippets is faster?" → <code>timeit</code> with <code>repeat</code>, report the minimum',
      '"Speed this up" with no profile data → first say "I would measure"; interviewers grade the process',
      '"Production only, cannot restart the process" → sampling profiler (py-spy / austin), not cProfile',
      '"Function called millions of times" in a profile → reduce calls (caching, batching) before micro-tuning',
      '"80% of time in one function" → Amdahl: that function is the only one worth optimising'
    ],
    code: [{ lang: 'python', run: true, title: 'Profile a real program and print the top lines', code: R`
import cProfile
import io
import pstats

def parse(lines):
    # split each CSV line into fields
    return [line.split(",") for line in lines]

def slow_unique(rows):
    seen = []                      # BUG: a list -> "in" scans every element, O(n)
    out = []
    for r in rows:
        if r[0] not in seen:
            seen.append(r[0])
            out.append(r)
    return out

def report(n):
    lines = [f"user{i % 2000},{i}" for i in range(n)]
    rows = parse(lines)
    return len(slow_unique(rows))

profiler = cProfile.Profile()
profiler.enable()                  # start recording every call
result = report(20_000)
profiler.disable()                 # stop recording

buf = io.StringIO()
stats = pstats.Stats(profiler, stream=buf)
stats.strip_dirs().sort_stats("cumulative").print_stats(5)   # top 5 by cumtime
print("unique users:", result)
print(buf.getvalue()[:1400])
` }, { lang: 'python', run: true, title: 'timeit: compare two versions the right way', code: R`
import timeit

setup = "data = list(range(10_000)); s = set(data)"
for stmt in ["9_999 in data", "9_999 in s"]:
    # repeat() returns several totals; the MINIMUM is the least noisy estimate
    totals = timeit.repeat(stmt, setup=setup, number=2_000, repeat=5)
    best = min(totals) / 2_000
    print(f"{stmt:<15} best {best * 1e6:8.3f} µs per call")

# Quick manual timing for a bigger block of code
import time
start = time.perf_counter()
total = sum(i * i for i in range(200_000))
elapsed = time.perf_counter() - start
print(f"sum of squares took {elapsed * 1000:.1f} ms (result {total})")
` }],
    viz: [{
      title: 'Profiler hot-spot finder + Amdahl\'s law',
      input: 'read_csv:120 parse_rows:860 validate:90 dedupe:2400 write_json:40',
      inputLabel: 'function:milliseconds pairs (space separated)',
      gen: function (input) {
        var toks = words(input);
        if (toks.length < 2 || toks.length > 8) throw new Error('Give 2–8 pairs like parse:120 dedupe:900');
        var fns = toks.map(function (t) {
          var p = t.split(':');
          var ms = Number(p[1]);
          if (p.length !== 2 || !p[0] || isNaN(ms) || ms < 0) throw new Error('Each item must look like name:ms, e.g. parse:120');
          return { name: p[0].slice(0, 14), ms: ms };
        });
        var frames = [], names = [], vals = [];
        var total = fns.reduce(function (s, f) { return s + f.ms; }, 0);
        frames.push(fr('The program runs with <b>cProfile switched on</b>. Every time a function returns, the profiler adds its time to a tally. Nothing is guessed — it is all measured.', [
          { type: 'bars', label: 'time per function (ms)', values: [0], idxLabels: ['(none yet)'] },
          { type: 'vars', label: 'profile so far', vals: { functions_seen: 0, total_ms: 0 } }
        ]));
        fns.forEach(function (f, i) {
          names.push(f.name); vals.push(f.ms);
          var hl = {}; hl[i] = 'cur';
          frames.push(fr('Recorded <code>' + esc(f.name) + '()</code> → <b>' + f.ms + ' ms</b>. ' + (f.ms > total * 0.4 ? 'That is a big chunk already — suspicious!' : 'Noted; keep watching.'), [
            { type: 'bars', label: 'time per function (ms)', values: vals.slice(), idxLabels: names.slice(), hl: hl },
            { type: 'vars', label: 'profile so far', vals: { functions_seen: i + 1, total_ms: vals.reduce(function (a, b) { return a + b; }, 0) } }
          ]));
        });
        var sorted = fns.slice().sort(function (a, b) { return b.ms - a.ms; });
        var sv = sorted.map(function (f) { return f.ms; }), sn = sorted.map(function (f) { return f.name; });
        frames.push(fr('<code>sort_stats("tottime")</code>: sort descending. The tallest bar is the <b>hot spot</b>. Everything else is noise until it is fixed.', [
          { type: 'bars', label: 'sorted by tottime (ms)', values: sv, idxLabels: sn, hl: { 0: 'bad' } },
          { type: 'table', label: 'pstats view', columns: ['function', 'tottime ms', 'share'], rows: sorted.map(function (f) { return [f.name, f.ms, pct(f.ms, total) + '%']; }), hl: { 0: 'sel' } }
        ]));
        var hot = sorted[0], share = total ? hot.ms / total : 0;
        var after10 = total - hot.ms + hot.ms / 10;
        var sv2 = sv.slice(); sv2[0] = round1(hot.ms / 10);
        frames.push(fr('Fix the hot spot so <code>' + esc(hot.name) + '</code> runs <b>10× faster</b>. Total goes from <b>' + total + ' ms</b> to <b>' + round1(after10) + ' ms</b> — a <span class="c-g">' + round1(total / (after10 || 1)) + '× speed-up</span> for the whole program. Amdahl: 1 ÷ ((1 − ' + round1(share * 100) / 100 + ') + ' + round1(share * 100) / 100 + '/10).', [
          { type: 'bars', label: 'after 10× fix of the hot spot (ms)', values: sv2, idxLabels: sn, hl: { 0: 'ok' } },
          { type: 'vars', label: 'Amdahl', vals: { before_ms: total, after_ms: round1(after10), speedup: round1(total / (after10 || 1)) + 'x' }, hl: { speedup: 'ok' } }
        ]));
        var low = sorted[sorted.length - 1];
        var afterLow = total - low.ms + low.ms / 10;
        var sv3 = sv.slice(); sv3[sv3.length - 1] = round1(low.ms / 10);
        frames.push(fr('Now imagine you had instead spent a day making the <b>smallest</b> function (<code>' + esc(low.name) + '</code>) 10× faster: total only drops to <b>' + round1(afterLow) + ' ms</b> (' + round1(total / (afterLow || 1)) + '×). Same effort, almost no win. <b>That is why we profile first.</b>', [
          { type: 'bars', label: 'after 10× fix of the SMALLEST function (ms)', values: sv3, idxLabels: sn, hl: (function () { var h = {}; h[sv3.length - 1] = 'bad'; return h; })() },
          { type: 'vars', label: 'wasted effort', vals: { before_ms: total, after_ms: round1(afterLow), speedup: round1(total / (afterLow || 1)) + 'x' }, hl: { speedup: 'bad' } }
        ]));
        frames.push(fr('Upper bound: even if <code>' + esc(hot.name) + '</code> took <b>zero</b> time, the program could only get ' + (total - hot.ms > 0 ? round1(total / (total - hot.ms)) + '×' : 'infinitely') + ' faster. After fixing it, <b>profile again</b> — a new hot spot will now be on top.', [
          { type: 'bars', label: 'best possible (hot spot = 0 ms)', values: [0].concat(sv.slice(1)), idxLabels: sn, hl: { 0: 'sel' } },
          tx('Loop: <b>measure → fix the top bar → measure again</b>. Stop when the remaining time is good enough for the users.', 'Rule')
        ]));
        return frames;
      }
    }, {
      title: 'timeit: why we report the MINIMUM of repeated runs',
      input: '12.1 11.8 15.3 11.9 30.2 12.0',
      inputLabel: 'Timings of repeated runs in ms (space separated)',
      gen: function (input) {
        var a = nums(input, 12, 'Enter run timings in ms, e.g. 12.1 11.8 15.3');
        if (a.length < 3) throw new Error('Give at least 3 runs');
        var frames = [], shown = [];
        a.forEach(function (v, i) {
          shown.push(v);
          var hl = {}; hl[i] = 'cur';
          frames.push(fr('Run ' + (i + 1) + ' took <b>' + v + ' ms</b>. Each run executes the statement <code>number</code> times so the clock tick size does not matter.', [
            { type: 'bars', label: 'repeat() results (ms)', values: shown.slice(), hl: hl, idxLabels: shown.map(function (_, k) { return 'run ' + (k + 1); }) }
          ]));
        });
        var mn = Math.min.apply(null, a), mx = Math.max.apply(null, a);
        var mean = a.reduce(function (s, x) { return s + x; }, 0) / a.length;
        var srt = a.slice().sort(function (x, y) { return x - y; });
        var med = srt.length % 2 ? srt[(srt.length - 1) / 2] : (srt[srt.length / 2 - 1] + srt[srt.length / 2]) / 2;
        var hl2 = {};
        a.forEach(function (v, i) { if (v === mn) hl2[i] = 'sel'; else if (v > med * 1.2) hl2[i] = 'bad'; });
        frames.push(fr('Slow outliers (red) are <b>noise</b>: another process, a GC pause, CPU frequency change, a cache miss. They make the mean jump around. The <b>minimum</b> (purple) is the run with the least interference — the closest thing to "how fast this code can go".', [
          { type: 'bars', label: 'repeat() results (ms)', values: a, hl: hl2, idxLabels: a.map(function (_, k) { return 'run ' + (k + 1); }) },
          { type: 'vars', label: 'statistics', vals: { min: mn, median: round1(med), mean: round1(mean), max: mx }, hl: { min: 'sel', mean: 'bad' } }
        ]));
        frames.push(fr('Report: <b>best of ' + a.length + ' = ' + mn + ' ms</b>. For comparing two versions, compare their minimums (or medians with a tool like <code>pyperf</code>). Never compare a single run of A against a single run of B.', [
          { type: 'code', label: 'what we ran', lang: 'python', code: 'import timeit\ntotals = timeit.repeat(stmt, setup=setup, number=1000, repeat=' + a.length + ')\nbest = min(totals) / 1000   # seconds per call\nprint(f"{best*1e6:.2f} µs")', hl: { 3: 'ok' } },
          { type: 'vars', label: 'answer', vals: { best_ms: mn, spread_ms: round1(mx - mn) }, hl: { best_ms: 'ok' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Reading a pstats line', html: R`<p>A report line looks like <code>1  1.912  1.912  1.915  1.915  prof.py:9(slow_unique)</code>. Read it left to right: <b>ncalls</b> = 1 (called once), <b>tottime</b> = 1.912 s spent in its own code, <b>percall</b>, <b>cumtime</b> = 1.915 s including the functions it called, <b>percall</b> again, then file:line(name). Plain recipe: find the row whose <b>tottime</b> is biggest — that function's own code is the hot spot. Here it is <code>slow_unique</code>, because <code>r[0] not in seen</code> scans a list. A row like <code>20000 0.002 … list.append</code> is fast-but-frequent and harmless. Change <code>seen</code> to a <code>set</code> and the job drops from seconds to milliseconds.</p>
${H.table(['ncalls', 'tottime', 'cumtime', 'function'], [['1', '<span class="c-r">1.912</span>', '1.915', 'slow_unique'], ['1', '0.010', '0.010', 'parse'], ['20000', '0.002', '0.002', "list.append"]])}` },
      { title: 'Profiling a whole script from the command line', html: R`<p>No code changes needed. Sort by cumulative time and save a file you can explore later (for example in SnakeViz, a browser-based icicle chart):</p>`, code: { lang: 'bash', code: R`
python -m cProfile -s cumtime my_script.py | head -n 25
python -m cProfile -o out.prof my_script.py
python -m pstats out.prof          # interactive: sort tottime, stats 10, callers slow_fn
pip install snakeviz && snakeviz out.prof` } },
      { title: 'timeit from the shell', html: R`<p>Great for settling arguments in code review. <code>-s</code> is setup (run once, not timed). timeit picks a loop count automatically and prints the best result:</p>`, code: { lang: 'bash', code: R`
python -m timeit -s "data = list(range(10_000))" "sum(data)"
python -m timeit -s "data = list(range(10_000))" "total = 0" "for x in data: total += x"
# typical: 20000 loops, best of 5: 15 usec per loop  vs  2000 loops, best of 5: 190 usec per loop` } },
      { title: 'Profiling a live production process with py-spy', html: R`<p>A <b>sampling profiler</b> peeks at the call stack ~100 times per second from <i>outside</i> the process. No restart, tiny overhead, safe for production. It answers "what is my stuck server doing right now?"</p>`, code: { lang: 'bash', code: R`
pip install py-spy
py-spy top --pid 12345                    # live "top"-like view of hottest functions
py-spy record -o flame.svg --pid 12345    # flame graph: wide boxes = hot code
py-spy dump --pid 12345                   # print every thread's current stack (great for deadlocks)` } },
      { title: 'Line-by-line timing with line_profiler', html: R`<p>cProfile tells you the slow <i>function</i>; <code>line_profiler</code> tells you the slow <i>line</i> inside it. Decorate the function with <code>@profile</code> and run with <code>kernprof</code>:</p>`, code: { lang: 'python', check: false, code: R`
# pip install line_profiler ; run with:  kernprof -l -v slow.py
@profile
def slow_unique(rows):
    seen = []
    out = []
    for r in rows:
        if r[0] not in seen:      # <- line_profiler shows ~99% of time here
            seen.append(r[0])
            out.append(r)
    return out` } }
    ],
    deepDive: R`<p>🟣 <b>Deterministic vs sampling.</b> cProfile hooks every call/return (via <code>sys.setprofile</code>-style C hooks), so it gives exact counts but adds overhead per call — code with millions of tiny calls can look up to ~2× slower, and the overhead is not evenly spread, which can exaggerate call-heavy functions. Sampling profilers (py-spy, austin, Scalene, and the new <code>profiling.sampling</code> module added in Python 3.15 by PEP 799) interrupt periodically and record the stack; counts are statistical but overhead is near zero and they see C extensions and native code too (py-spy <code>--native</code>).</p>
<p><b>tottime vs cumtime with recursion:</b> recursive functions show <code>ncalls</code> like <code>1785/1</code> (total calls / primitive non-recursive calls), and cumtime is not double-counted. <b>Python 3.12+</b> added <code>sys.monitoring</code> (PEP 669), a low-overhead event API that newer profilers and coverage tools use, and <code>-X perf</code> so Linux <code>perf</code> can show Python function names in native flame graphs.</p>
<p><b>Benchmark hygiene:</b> <code>timeit</code> disables GC during timing (pass <code>setup="gc.enable()"</code> to include it); warm caches before measuring; beware CPU turbo/thermal throttling and laptop power-saving; benchmark realistic input sizes (O(n²) code looks fine at n = 100); and compare <i>distributions</i>, not single numbers — <code>pyperf</code> spawns worker processes, calibrates loops and reports mean ± std dev. For memory, use <code>tracemalloc</code> or <code>memray</code>; for "is it CPU or waiting?", compare wall time (<code>perf_counter</code>) with CPU time (<code>process_time</code>) — a big gap means you are I/O bound and need concurrency, not faster code.</p>
<p><b>Production reality:</b> continuous profiling (Pyroscope, Datadog, Google Cloud Profiler) samples fleets all day so you can diff flame graphs between releases. Pair it with tracing (OpenTelemetry) to see which slow request hit which slow function.</p>`,
    aiEra: R`<p><b>What AI changes:</b> an assistant can read a pstats dump or a flame-graph text export and point at the hot path in seconds, and can write the benchmark harness for you. <b>Use AI as a partner:</b> paste the top 30 lines of <code>sort_stats("tottime")</code> and ask <i>"which three functions dominate, and what data-structure change would remove the work?"</i> — then <b>verify with timeit</b>. <b>Where AI goes wrong:</b> it happily "optimises" code without any profile (micro-tweaks to 1% functions), quotes benchmark numbers from old Python versions (3.11+ changed many costs), and writes benchmarks that time the setup or let the optimiser cache results. <b>What you must still own:</b> the habit of measuring before and after, choosing realistic input sizes, and explaining Amdahl's law to your team when someone wants to rewrite the 2% function in Rust.</p>`,
    problems: [{
      title: 'Find and Fix the Hot Spot: Order-Preserving Deduplicate',
      level: 'Easy', tags: ['profiling', 'set', 'performance'], companies: ['Amazon', 'Stripe', 'Atlassian'],
      statement: R`<p>A reporting job deduplicates user IDs while keeping their first-seen order. A profile shows <b>97% of tottime</b> inside <code>dedupe()</code>. Rewrite it so it handles <b>1,000,000</b> IDs in well under a second, keeping the exact same output order.</p>`,
      constraints: R`1 ≤ len(ids) ≤ 10<sup>6</sup>; IDs are hashable (str or int). Output must keep the first occurrence of each ID in original order.`,
      example: R`<p>Input <code>["u3", "u1", "u3", "u2", "u1"]</code> → Output <code>${H.c('g', '["u3", "u1", "u2"]')}</code>. Why: the second <code>u3</code> and second <code>u1</code> were already seen, so they are dropped; the survivors stay in first-seen order.</p>`,
      brute: { why: R`<p>The original uses a <b>list</b> to remember what it has seen. <code>x not in seen</code> walks the list element by element — O(k) per check — so the whole job is <b>O(n·u)</b> (u = unique count). With 10<sup>6</sup> IDs and 10<sup>5</sup> unique ones that is ~10<sup>11</sup> comparisons. The profile's tottime pins it on this one line.</p>`, code: { lang: 'python', run: true, code: R`
def dedupe_slow(ids):
    seen = []                 # list: membership test is a linear scan
    out = []
    for x in ids:
        if x not in seen:     # O(len(seen)) every time -> hot spot
            seen.append(x)
            out.append(x)
    return out

print(dedupe_slow(["u3", "u1", "u3", "u2", "u1"]))` } },
      mcq: { q: 'The profile says 97% of tottime is on <code>if x not in seen</code>. What single change helps most?', options: ['Make <code>seen</code> a <code>set</code> (O(1) average membership)', 'Use a <code>while</code> loop instead of <code>for</code>', 'Cache <code>seen.append</code> in a local variable', 'Run it in a thread'], answer: 0, explain: 'The cost is the linear scan per lookup. A hash set turns each check into ~one hash + one compare. Loop style and local caching are tiny constant-factor tweaks; threads do not help CPU-bound code under the GIL.' },
      hints: [R`<p>Hint 1: the output order comes from the <b>input</b> order, not from the "seen" container — so the seen container does not need to be ordered at all.</p>`, R`<p>Hint 2: a <code>set</code> gives O(1) average membership. Or: since Python 3.7 a <code>dict</code> remembers insertion order, so <code>dict.fromkeys(ids)</code> dedupes and keeps order in one C-level call.</p>`, R`<p>Hint 3: recipe — <code>seen = set()</code>; for each x: if x not in seen → add to seen and to out. Edge cases: empty input → empty list; unhashable items (lists) need converting to tuples first.</p>`],
      solution: {
        approach: R`<p>Keep the loop but swap the container: a <b>set</b> for "have I seen it?" and a list for the ordered result. Even simpler and faster: <code>list(dict.fromkeys(ids))</code> — the loop runs in C and dict keys preserve insertion order (guaranteed since 3.7). Then re-profile: the hot spot should be gone and the job dominated by I/O.</p>`,
        code: { lang: 'python', run: true, code: R`
import timeit

def dedupe_set(ids):
    seen = set()              # O(1) average membership
    out = []
    for x in ids:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out

def dedupe_dict(ids):
    # dict keeps insertion order (3.7+); fromkeys loops in C
    return list(dict.fromkeys(ids))

print(dedupe_set(["u3", "u1", "u3", "u2", "u1"]))
print(dedupe_dict(["u3", "u1", "u3", "u2", "u1"]))

ids = [f"u{i % 50_000}" for i in range(300_000)]
for fn in (dedupe_set, dedupe_dict):
    t = min(timeit.repeat(lambda: fn(ids), number=3, repeat=3)) / 3
    print(f"{fn.__name__:<12} {t * 1000:6.1f} ms for {len(ids):,} ids")
` },
        dry: { head: ['x', 'x in seen?', 'seen (set)', 'out'], rows: [
          ['u3', 'no', '{u3}', '[u3]'],
          ['u1', 'no', '{u3, u1}', '[u3, u1]'],
          ['u3', '<span class="c-r">yes → skip</span>', '{u3, u1}', '[u3, u1]'],
          ['u2', 'no', '{u3, u1, u2}', '[u3, u1, u2]'],
          ['u1', '<span class="c-r">yes → skip</span>', '{u3, u1, u2}', '<span class="c-g">[u3, u1, u2]</span>']
        ] },
        complexity: R`<p>Time O(n) average (one hash per item), space O(u) for the set. The list version was O(n·u). <code>dict.fromkeys</code> has the same Big-O but a smaller constant because the loop is in C.</p>`,
        followUps: ['Dedupe dictionaries by their "email" field, keeping the first record', 'What if the input is a 50 GB file that does not fit in memory?', 'How would you dedupe case-insensitively while keeping the original spelling?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2: Pure-Python speed — algorithms, data structures, built-ins
     ====================================================================== */
  var SQ_VARIANTS = [
    { name: 'while + index', ms: 117, code: 's = 0; i = 0\nwhile i < n:\n    s += a[i] * a[i]\n    i += 1', why: 'Every iteration runs ~6 bytecodes in the interpreter: compare, index twice, multiply, add, increment. All of it is Python-level work.' },
    { name: 'for i in range(len)', ms: 90, code: 's = 0\nfor i in range(len(a)):\n    s += a[i] * a[i]', why: 'range() does the counting in C, but we still index the list twice per step.' },
    { name: 'for x in a', ms: 58, code: 's = 0\nfor x in a:\n    s += x * x', why: 'Iterating the list directly removes the indexing. Fewer bytecodes per element → faster.' },
    { name: 'sum(genexpr)', ms: 61, code: 's = sum(x * x for x in a)', why: 'Shorter code, but a generator still runs one Python frame resume per element — on 3.13 it is about the same as the plain for loop. Folklore says "always faster"; measurement says "about equal".' },
    { name: 'NumPy (a*a).sum()', ms: 1.5, code: 'b = np.array(a)\ns = int((b * b).sum())', why: 'One call; the loop runs in compiled C over raw machine integers with SIMD. ~40× faster — but only once the data already lives in a NumPy array.' }
  ];
  topics.push({
    title: 'Cheap Wins in Pure Python: Right Data Structure, Built-ins & Fewer Bytecodes',
    analogy: R`<p>Moving house: you can carry boxes one at a time up the stairs (a Python <code>for</code> loop), or hire a <b>lift</b> that carries the whole load in one trip (a built-in like <code>sum()</code>, <code>sorted()</code>, <code>str.join()</code> — the loop happens inside fast C code). But the biggest win of all is noticing you are moving boxes you <b>never needed</b> — that is choosing the right algorithm and data structure.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> In CPython every line of your Python is turned into small instructions called <b>bytecodes</b>, and an interpreter loop executes them one by one. Each bytecode costs roughly <b>tens of nanoseconds</b>. Built-in functions written in C do the same job without paying that per-step tax. So speed in pure Python comes from three levers, in this order:</p>
<ol>
<li><b>Better algorithm / data structure</b> (huge wins: 100×–10,000×): <code>set</code>/<code>dict</code> lookups instead of scanning lists, <code>collections.deque</code> instead of <code>list.pop(0)</code>, <code>heapq</code> for top-K, <code>bisect</code> for sorted search, caching repeated work with <code>functools.lru_cache</code>.</li>
<li><b>Push loops into C</b> (2×–20×): <code>sum</code>, <code>min</code>/<code>max</code>, <code>sorted(key=...)</code>, <code>str.join</code>, <code>any</code>/<code>all</code>, <code>collections.Counter</code>, <code>itertools</code>, slicing, <code>dict.fromkeys</code>.</li>
<li><b>Fewer bytecodes per iteration</b> (1.1×–2×): iterate items not indexes, hoist work out of loops, avoid repeated attribute lookups in very hot loops, use comprehensions for building lists.</li>
</ol>
<p>Example — sum of squares of 1,000,000 ints, measured on CPython 3.13 (your numbers will differ, the <b>ratios</b> are what matter):</p>
${H.table(['version', 'time', 'why'], [
  ['<code>while i &lt; n</code> + indexing', '~117 ms', 'most bytecodes per element'],
  ['<code>for i in range(len(a))</code>', '~90 ms', 'still indexes twice'],
  ['<code>for x in a</code>', '~58 ms', 'iterate directly'],
  ['<code>sum(x*x for x in a)</code>', '~61 ms', 'about the same as the loop!'],
  ['NumPy <code>(b*b).sum()</code>', '<span class="c-g">~1.5 ms</span>', 'loop runs in C on raw ints']
])}
<p>🔵 <b>Classic cost table to memorise:</b> ${H.c('r', 'x in list')} O(n) vs ${H.c('g', 'x in set')} O(1); ${H.c('r', 'list.pop(0)')} / <code>insert(0, x)</code> O(n) vs ${H.c('g', 'deque.popleft()')} O(1); ${H.c('r', 's += piece')} in a loop is O(n²) in the worst case vs ${H.c('g', '"".join(pieces)')} O(n); sorting once O(n log n) beats calling <code>min()</code> in a loop O(n²).</p>`,
    clues: [
      '"N ≤ 10<sup>6</sup> and Python TLE" → look for <code>in list</code>, <code>pop(0)</code>, string <code>+=</code>, nested loops first',
      '"Check membership many times" → convert to <code>set</code>/<code>dict</code> once, outside the loop',
      '"Queue / BFS in Python" → <code>collections.deque</code>, never <code>list.pop(0)</code>',
      '"Count frequencies" / "top K most common" → <code>Counter</code> + <code>most_common(k)</code> / <code>heapq.nlargest</code>',
      '"Same subproblem computed again and again" → memoize with <code>@lru_cache</code> / <code>@cache</code>',
      '"Build a long string in a loop" → collect pieces in a list, <code>"".join</code> once'
    ],
    code: [{ lang: 'python', run: true, title: 'The big three data-structure wins, measured', code: R`
import timeit
from collections import deque

n = 20_000
data = list(range(n))
as_set = set(data)
targets = list(range(0, n, 7))

# 1) membership: list scan vs hash lookup
t_list = timeit.timeit(lambda: sum(t in data for t in targets[:300]), number=3)
t_set = timeit.timeit(lambda: sum(t in as_set for t in targets[:300]), number=3)
print(f"300 lookups   list {t_list*1000:7.2f} ms   set {t_set*1000:6.3f} ms")

# 2) queue: list.pop(0) shifts every element; deque.popleft() is O(1)
def drain_list():
    q = list(range(n))
    while q:
        q.pop(0)
def drain_deque():
    q = deque(range(n))
    while q:
        q.popleft()
print(f"drain queue   list {timeit.timeit(drain_list, number=1)*1000:7.2f} ms"
      f"   deque {timeit.timeit(drain_deque, number=1)*1000:6.2f} ms")

# 3) string building: join is guaranteed linear
def build_join():
    return ",".join(str(i) for i in range(n))
print("join length:", len(build_join()))
` }, { lang: 'python', run: true, title: 'Hoisting work and local names in a hot loop', code: R`
import math
import timeit

points = [(i % 97, i % 89) for i in range(50_000)]

def slow():
    out = []
    for x, y in points:
        # math.sqrt looked up as global + attribute every iteration,
        # and len(points) recomputed for nothing
        if len(points) > 0:
            out.append(math.sqrt(x * x + y * y))
    return out

def fast():
    sqrt = math.sqrt                 # one lookup, then a fast local
    return [sqrt(x * x + y * y) for x, y in points]   # comprehension: fewer bytecodes

def fastest():
    return list(map(math.hypot, *zip(*points)))   # loop entirely in C

for f in (slow, fast, fastest):
    t = min(timeit.repeat(f, number=5, repeat=3)) / 5
    print(f"{f.__name__:<8} {t * 1000:6.2f} ms")
print(fast()[:3] == fastest()[:3])
` }],
    viz: [{
      title: 'Loop vs built-in vs vectorized: sum of squares (timing bars)',
      input: '1000000',
      inputLabel: 'N (number of ints, 1,000 – 10,000,000)',
      gen: function (input) {
        var n = Number(String(input).trim());
        if (!isFinite(n) || n < 1000 || n > 10000000) throw new Error('Enter N between 1000 and 10000000');
        var scale = n / 1000000, frames = [], vals = [], names = [];
        frames.push(fr('Task: <code>s = Σ x²</code> for <b>' + n.toLocaleString() + '</b> ints. Same answer, five ways. Bars are based on real CPython 3.13 measurements scaled linearly to your N.', [
          { type: 'bars', label: 'time (ms)', values: [0], idxLabels: ['start'] },
          tx('Every bytecode in the interpreter loop costs ~10–30 ns. Fewer bytecodes per element = faster. C loops pay almost nothing per element.', 'Key fact')
        ]));
        SQ_VARIANTS.forEach(function (v, i) {
          var ms = round1(v.ms * scale + (i === 4 ? 0.01 : 0));
          vals.push(ms); names.push(v.name);
          var hl = {}; hl[i] = i === 4 ? 'ok' : 'cur';
          frames.push(fr('<b>' + esc(v.name) + '</b> ≈ ' + ms + ' ms. ' + v.why, [
            { type: 'bars', label: 'time (ms) — lower is better', values: vals.slice(), idxLabels: names.slice(), hl: hl },
            { type: 'code', label: v.name, lang: 'python', code: v.code, hl: { 1: 'cur' } }
          ]));
        });
        var hl2 = { 0: 'bad', 4: 'sel' };
        frames.push(fr('Big picture: the slowest pure-Python version is <b>~' + Math.round(117 / 1.5) + '×</b> slower than NumPy, but the difference between Python loop styles is only ~2×. <b>Lesson:</b> loop style is a small lever; moving the loop into C (built-ins, NumPy) or doing less work (better algorithm) is the big lever.', [
          { type: 'bars', label: 'all five (ms)', values: vals.slice(), idxLabels: names.slice(), hl: hl2 },
          { type: 'vars', label: 'ratios', vals: { 'while vs for': round1(117 / 58) + 'x', 'for vs NumPy': Math.round(58 / 1.5) + 'x' }, hl: { 'for vs NumPy': 'ok' } }
        ]));
        return frames;
      }
    }, {
      title: 'Membership: list scan vs set hash probe (work per lookup)',
      input: '8 3 15 4 42 23 16',
      inputLabel: 'Items stored (space separated), last number = the value we search for',
      gen: function (input) {
        var a = nums(input, 12, 'Enter numbers, the last one is the search target');
        if (a.length < 3) throw new Error('Need at least 2 items plus a target');
        var target = a[a.length - 1], items = a.slice(0, -1), frames = [];
        frames.push(fr('Question: is <b>' + target + '</b> in the collection? We will count how much work a <code>list</code> and a <code>set</code> do.', [
          { type: 'array', label: 'list (search target ' + target + ')', values: items },
          { type: 'vars', vals: { target: target, list_comparisons: 0 } }
        ]));
        var found = -1;
        for (var i = 0; i < items.length; i++) {
          var hl = {}; for (var k = 0; k < i; k++) hl[k] = 'done';
          hl[i] = items[i] === target ? 'ok' : 'cur';
          var ptr = {}; ptr[i] = 'scan';
          frames.push(fr('<code>x in list</code>: compare with element ' + i + ' (' + items[i] + ')' + (items[i] === target ? ' → <span class="c-g">match!</span>' : ' → no, keep walking. Each step is a full == comparison.'), [
            { type: 'array', label: 'list scan', values: items, hl: hl, ptr: ptr },
            { type: 'vars', vals: { target: target, list_comparisons: i + 1 } }
          ]));
          if (items[i] === target) { found = i; break; }
        }
        var listCost = found >= 0 ? found + 1 : items.length;
        var buckets = 8, table = []; for (var b = 0; b < buckets; b++) table.push('·');
        items.forEach(function (v) { var h = ((v % buckets) + buckets) % buckets; while (table[h] !== '·') h = (h + 1) % buckets; table[h] = v; });
        var hb = ((target % buckets) + buckets) % buckets, probes = 1, pos = hb;
        while (table[pos] !== '·' && table[pos] !== target && probes < buckets) { pos = (pos + 1) % buckets; probes++; }
        var hl3 = {}; hl3[pos] = table[pos] === target ? 'ok' : 'bad';
        frames.push(fr('<code>x in set</code>: compute <code>hash(' + target + ') % ' + buckets + ' = ' + hb + '</code> and jump straight to that slot' + (probes > 1 ? ' (then ' + (probes - 1) + ' extra probe' + (probes > 2 ? 's' : '') + ' because of a collision)' : '') + '. ' + (table[pos] === target ? '<span class="c-g">Found.</span>' : '<span class="c-r">Empty slot → definitely not present.</span>'), [
          { type: 'array', label: 'set hash table (8 slots)', values: table, hl: hl3, ptr: (function () { var p = {}; p[hb] = 'hash'; return p; })(), showIdx: true },
          { type: 'vars', vals: { list_comparisons: listCost, set_probes: probes }, hl: { set_probes: 'ok', list_comparisons: 'bad' } }
        ]));
        frames.push(fr('With n items the list does up to <b>n</b> comparisons per lookup; the set does about <b>1–2</b> no matter how big it gets. Inside a loop of m lookups: list = O(m·n), set = O(m). Building the set once costs O(n) — worth it as soon as you search more than a handful of times.', [
          { type: 'bars', label: 'work per lookup for growing n (list vs set)', values: [10, 1, 1000, 1, 100000, 1], idxLabels: ['list n=10', 'set', 'list n=1k', 'set', 'list n=100k', 'set'], hl: { 0: 'bad', 2: 'bad', 4: 'bad', 1: 'ok', 3: 'ok', 5: 'ok' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'BFS with list.pop(0) is secretly O(V²)', html: R`<p><code>list.pop(0)</code> must shift every remaining element left by one slot. A BFS over 10<sup>5</sup> nodes then does ~5·10<sup>9</sup> moves. ${H.c('g', 'collections.deque')} is a doubly-linked list of blocks, so <code>popleft()</code> is O(1):</p>`, code: { lang: 'python', run: true, code: R`
from collections import deque

graph = {0: [1, 2], 1: [3], 2: [3], 3: []}
q, seen, order = deque([0]), {0}, []
while q:
    node = q.popleft()          # O(1), unlike list.pop(0)
    order.append(node)
    for nxt in graph[node]:
        if nxt not in seen:      # set membership, O(1)
            seen.add(nxt)
            q.append(nxt)
print(order)                     # [0, 1, 2, 3]` } },
      { title: 'Top-K without sorting everything', html: R`<p>Need the 3 largest of a million numbers? <code>sorted(a)[-3:]</code> is O(n log n). ${H.c('g', 'heapq.nlargest(3, a)')} keeps a tiny heap of size k: O(n log k), and it runs in C. For counts, <code>Counter.most_common(k)</code> uses the same trick.</p>`, code: { lang: 'python', run: true, code: R`
import heapq
from collections import Counter

a = [(i * 7919) % 100_003 for i in range(200_000)]
print(heapq.nlargest(3, a))
words = "the cat and the hat and the bat".split()
print(Counter(words).most_common(2))     # [('the', 3), ('and', 2)]` } },
      { title: 'Memoization turns exponential into linear', html: R`<p>Naive recursive Fibonacci recomputes the same values exponentially many times. One decorator caches results by argument: <b>O(2<sup>n</sup>) → O(n)</b>. This is often the single biggest "performance tuning" win in interview code.</p>`, code: { lang: 'python', run: true, code: R`
from functools import cache
import time

def fib_slow(n):
    return n if n < 2 else fib_slow(n - 1) + fib_slow(n - 2)

@cache                      # same as lru_cache(maxsize=None)
def fib_fast(n):
    return n if n < 2 else fib_fast(n - 1) + fib_fast(n - 2)

t = time.perf_counter(); fib_slow(25); a = time.perf_counter() - t
t = time.perf_counter(); fib_fast(25); b = time.perf_counter() - t
print(f"slow {a*1000:.1f} ms   cached {b*1000:.3f} ms   fib(90)={fib_fast(90)}")` } },
      { title: 'sorted with key= vs. a custom compare', html: R`<p><code>sorted(rows, key=lambda r: r[1])</code> calls the key function <b>once per element</b> (n calls), then compares the cached keys in C. <code>functools.cmp_to_key</code> calls your Python comparison <b>O(n log n)</b> times. Prefer <code>key=</code>, and prefer <code>operator.itemgetter(1)</code> over a lambda for a little extra speed.</p>` }
    ],
    deepDive: R`<p>🟣 <b>Why 3.11+ changed the folklore.</b> CPython 3.11 introduced the <b>specializing adaptive interpreter</b> (PEP 659): after a few runs, a generic bytecode like <code>LOAD_ATTR</code> or <code>BINARY_OP</code> is rewritten in place into a specialised version (e.g. "add two ints", "load attribute from instance with known layout") guarded by a cheap type check. Global and builtin lookups are cached too, so the old trick of copying <code>math.sqrt</code> into a local saves much less than it did in 3.8. 3.11 also made function calls cheaper ("zero-cost" exceptions, inlined Python-to-Python calls). 3.13 shipped an <b>experimental JIT</b> (copy-and-patch, off by default, build flag <code>--enable-experimental-jit</code>) and an experimental <b>free-threaded</b> (no-GIL) build; 3.14 made free-threading officially supported (PEP 779) though not default.</p>
<p><b>String <code>+=</code> trap:</b> CPython has a hack — if the left string has refcount 1 it can resize in place, so <code>s += t</code> in a loop is often linear on CPython. It is <i>not</i> guaranteed (it breaks if another reference exists, and PyPy does not do it), so <code>"".join</code> is the portable linear way. <b>Comprehension vs loop:</b> comprehensions avoid the <code>out.append</code> attribute lookup + call per element; since 3.12 (PEP 709) comprehensions are inlined and no longer create a hidden function frame.</p>
<p><b>Exceptions:</b> setting up <code>try</code> is free in 3.11+, but <i>raising</i> costs microseconds — EAFP is fine when failures are rare, LBYL when they are common. <b>Generators</b> save memory, not time: each element resumes a frame. <b>Attribute access</b> through <code>__slots__</code> or local variables is cheapest; <code>@property</code> adds a function call. When none of this is enough, move the hot loop to NumPy, Numba, Cython or Rust — next topics.</p>`,
    aiEra: R`<p><b>What AI changes:</b> assistants are excellent at spotting the classic smells — <code>in list</code> inside a loop, <code>pop(0)</code>, quadratic string building, missing memoisation — and rewriting them idiomatically. <b>Use AI as a partner:</b> ask <i>"list every operation in this function that is worse than O(1) per iteration and suggest the data structure that fixes it"</i>. <b>Where AI goes wrong:</b> it repeats 2015-era micro-optimisation folklore (local-variable aliasing, <code>map</code> always beats comprehensions) that 3.11+ made mostly irrelevant, and sometimes "optimises" readability away for a 3% gain. It also forgets that converting a list to a set loses order and duplicates. <b>What you must still own:</b> the Big-O reasoning, the decision of which lever is worth pulling, and proving it with a before/after benchmark in your own environment.</p>`,
    problems: [{
      title: 'Word Frequency Report: From O(n·u) to O(n)',
      level: 'Easy', tags: ['Counter', 'performance', 'hash map'], companies: ['Google', 'Meta', 'Shopify'],
      statement: R`<p>Given a list of words (a big log, ~10<sup>6</sup> words), return the <b>k most frequent</b> words as <code>(word, count)</code> pairs, highest first; ties broken alphabetically. The current code calls <code>words.count(w)</code> for every unique word and times out.</p>`,
      constraints: R`1 ≤ n ≤ 10<sup>6</sup> words, up to 10<sup>5</sup> unique, 1 ≤ k ≤ unique count.`,
      example: R`<p>words = <code>["b", "a", "c", "a", "b", "a"]</code>, k = 2 → <code>${H.c('g', '[("a", 3), ("b", 2)]')}</code>. "a" appears 3 times, "b" 2 times, "c" once, so the top 2 are a then b.</p>`,
      brute: { why: R`<p><code>words.count(w)</code> scans the whole list each time: O(n) per unique word → <b>O(n·u)</b> = 10<sup>6</sup> × 10<sup>5</sup> = 10<sup>11</sup> steps. Then a full sort on top.</p>`, code: { lang: 'python', run: true, code: R`
def top_k_slow(words, k):
    pairs = []
    for w in set(words):
        pairs.append((w, words.count(w)))   # full scan per unique word
    pairs.sort(key=lambda p: (-p[1], p[0]))
    return pairs[:k]

print(top_k_slow(["b", "a", "c", "a", "b", "a"], 2))` } },
      mcq: { q: 'What is the best first change?', options: ['Count everything in ONE pass with a dict / Counter', 'Use multiprocessing to call count() in parallel', 'Sort the words first so count() is faster', 'Use a generator instead of a list'], answer: 0, explain: 'One pass with a hash map makes counting O(n). Parallelising an O(n·u) algorithm still does O(n·u) work; sorting does not make list.count faster.' },
      hints: [R`<p>Hint 1: you are re-reading the same data u times. Can one pass remember every count at once?</p>`, R`<p>Hint 2: <code>collections.Counter(words)</code> counts in C. For top-k with a custom tie-break, use <code>heapq.nsmallest(k, counts.items(), key=lambda p: (-p[1], p[0]))</code>.</p>`, R`<p>Hint 3: recipe — counts = Counter(words); pick k smallest by key (−count, word). Edge cases: k larger than unique count (return all), empty list, case sensitivity ("The" vs "the").</p>`],
      solution: {
        approach: R`<p>Count once with <code>Counter</code> (hash map, O(n)), then select the top k with a heap keyed by <code>(-count, word)</code> so ties sort alphabetically: O(u log k). <code>Counter.most_common(k)</code> is fine when ties do not matter (it breaks ties by first-seen order).</p>`,
        code: { lang: 'python', run: true, code: R`
import heapq
from collections import Counter

def top_k(words, k):
    counts = Counter(words)                          # one O(n) pass, in C
    return heapq.nsmallest(k, counts.items(), key=lambda p: (-p[1], p[0]))

print(top_k(["b", "a", "c", "a", "b", "a"], 2))     # [('a', 3), ('b', 2)]

import random, timeit
random.seed(1)
big = [f"w{random.randrange(5_000)}" for _ in range(200_000)]
print(f"{timeit.timeit(lambda: top_k(big, 10), number=1) * 1000:.1f} ms for 200k words")
` },
        dry: { head: ['step', 'counts', 'heap key used', 'result'], rows: [
          ['count pass', "{'b': 2, 'a': 3, 'c': 1}", '—', '—'],
          ['key for a', '', '(-3, "a")', ''],
          ['key for b', '', '(-2, "b")', ''],
          ['key for c', '', '(-1, "c")', ''],
          ['nsmallest(2)', '', 'smallest keys: (-3,a), (-2,b)', '<span class="c-g">[("a",3), ("b",2)]</span>']
        ] },
        complexity: R`<p>Time O(n + u log k), space O(u). The brute force was O(n·u + u log u).</p>`,
        followUps: ['Words arrive as an infinite stream — keep an approximate top-k (Count-Min Sketch / Space-Saving)', 'Do it across 100 log files in parallel and merge the Counters', 'Make it case- and punctuation-insensitive']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3: Vectorization with NumPy
     ====================================================================== */
  topics.push({
    title: 'Vectorization with NumPy: Loops in C, Broadcasting, Views & dtypes',
    analogy: R`<p>A teacher has to add 5 bonus marks to 1,000 exam papers. The <b>loop way</b>: pick up paper, read mark, add 5, write, put down — 1,000 times, with all the picking-up overhead each time. The <b>vectorized way</b>: the marks are already typed in one spreadsheet column; type <code>=A1+5</code> once and fill down — the machine does the whole column in one go. NumPy is that spreadsheet: data packed tightly in one block, one instruction for the whole column.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> A Python list holds <b>pointers</b> to separate int objects scattered in memory; each <code>x * x</code> in a loop means: fetch object, check its type, unbox, multiply, allocate a new int object, ~50 ns of overhead. A NumPy <code>ndarray</code> holds <b>raw numbers side by side</b> in one block with one shared type (the <b>dtype</b>, e.g. <code>int64</code>, <code>float64</code>). An expression like <code>a * a</code> calls one compiled C loop (a <b>ufunc</b> = "universal function") that runs over the whole block, often using SIMD CPU instructions. That is <b>vectorization</b>: replace a Python-level loop with whole-array operations.</p>
${H.table(['Python loop', 'NumPy vectorized'], [
  ['<code>[x * 2 for x in a]</code>', '<code>a * 2</code>'],
  ['<code>sum(x for x in a if x &gt; 0)</code>', '<code>a[a &gt; 0].sum()</code> (boolean mask)'],
  ['<code>[x if x &gt; 0 else 0 for x in a]</code>', '<code>np.where(a &gt; 0, a, 0)</code> or <code>np.maximum(a, 0)</code>'],
  ['nested loop over rows and columns', '<code>m.sum(axis=0)</code> / <code>m.mean(axis=1)</code>'],
  ['loop computing distances to each centre', 'broadcasting: <code>pts[:, None, :] - centres[None, :, :]</code>']
])}
<p>🔵 <b>Broadcasting</b> is how NumPy combines arrays of different shapes without copying: line the shapes up from the <b>right</b>; two dimensions are compatible if they are <b>equal or one of them is 1</b>; a size-1 dimension is "stretched" (virtually repeated). Example: <code>(3, 1) + (1, 4) → (3, 4)</code>; <code>(3,) + (4,)</code> → ${H.c('r', 'ValueError')}.</p>
<p><b>When NOT to vectorize:</b> tiny arrays (each NumPy call has ~1 µs fixed overhead, so for 10 elements a plain loop wins), logic with complex per-element branching or early exit (use Numba or Cython), and when converting a list to an array costs more than the work itself.</p>`,
    clues: [
      '"Process millions of numbers / pixels / prices in Python" → vectorize with NumPy (or pandas/Polars on top of it)',
      '"Replace this for loop over an array" → ufuncs, boolean masks, <code>np.where</code>, <code>axis=</code> reductions',
      '"Pairwise distances" / "every point to every centre" → broadcasting with <code>None</code>/<code>np.newaxis</code>',
      '"Why did modifying my slice change the original?" → slices are <b>views</b>; use <code>.copy()</code>',
      '"Sum overflowed / negative total" with NumPy ints → fixed-width dtype wraps silently (unlike Python int)',
      '"np.vectorize made it no faster" → it is a convenience loop, not real vectorization'
    ],
    code: [{ lang: 'python', check: false, title: 'Loop vs vectorized, side by side (NumPy required)', code: R`
import time
import numpy as np

n = 1_000_000
prices = np.random.default_rng(0).uniform(10, 500, n)   # float64 array
qty = np.random.default_rng(1).integers(1, 10, n)       # int64 array

# Python loop: one bytecode round-trip per element
t = time.perf_counter()
total_loop = 0.0
for p, q in zip(prices.tolist(), qty.tolist()):
    if p > 100:
        total_loop += p * q
t_loop = time.perf_counter() - t

# Vectorized: mask + multiply + sum, all loops in C
t = time.perf_counter()
mask = prices > 100                     # boolean array, same shape
total_vec = (prices[mask] * qty[mask]).sum()
t_vec = time.perf_counter() - t

print(f"loop {t_loop*1000:.1f} ms  vectorized {t_vec*1000:.2f} ms  "
      f"same={np.isclose(total_loop, total_vec)}")
` }, { lang: 'python', check: false, title: 'Broadcasting, views vs copies, dtype overflow', code: R`
import numpy as np

# Broadcasting: (3,1) + (1,4) -> (3,4)
col = np.array([[1], [2], [3]])
row = np.array([[10, 20, 30, 40]])
print(col + row)

# Pairwise distances: 5 points vs 3 centres, no Python loop
pts = np.arange(10, dtype=float).reshape(5, 2)
centres = np.array([[0.0, 0.0], [5.0, 5.0], [9.0, 9.0]])
d = np.sqrt(((pts[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2))   # shape (5, 3)
print(d.argmin(axis=1))                 # nearest centre per point

# Views: basic slicing shares memory
a = np.arange(6)
v = a[1:4]           # view, no copy
v[0] = 99
print(a)             # [ 0 99  2  3  4  5]  <- original changed!
c = a[[1, 2, 3]]     # fancy indexing ALWAYS copies
c[0] = -1
print(a[1])          # still 99

# dtype overflow wraps silently (Python ints never overflow)
small = np.array([200, 100], dtype=np.uint8)
print(small.sum(dtype=np.uint8), small.sum())   # 44 (wrapped)  vs 300
` }, { lang: 'python', run: true, title: 'Runnable without NumPy: the broadcasting rule as code', code: R`
def broadcast_shape(a, b):
    """Return the broadcast result shape, or raise ValueError like NumPy."""
    result = []
    # compare dimensions from the RIGHT
    for i in range(1, max(len(a), len(b)) + 1):
        x = a[-i] if i <= len(a) else 1
        y = b[-i] if i <= len(b) else 1
        if x != y and 1 not in (x, y):
            raise ValueError(f"shapes {a} and {b} not compatible at dim -{i}: {x} vs {y}")
        result.append(max(x, y))
    return tuple(reversed(result))

for a, b in [((3, 1), (1, 4)), ((5, 1, 2), (3, 2)), ((8, 3), (3,)), ((3,), (4,))]:
    try:
        print(a, "+", b, "->", broadcast_shape(a, b))
    except ValueError as e:
        print("ValueError:", e)
` }],
    viz: [{
      title: 'Loop vs vectorized timing as N grows (the crossover)',
      input: '10 100 1000 100000 1000000',
      inputLabel: 'Array sizes N (space separated, up to 8)',
      gen: function (input) {
        var ns = nums(input, 8, 'Enter sizes like 10 100 1000 1000000');
        if (ns.some(function (x) { return x < 1 || x > 100000000; })) throw new Error('Sizes must be between 1 and 100,000,000');
        // simple cost model (µs) calibrated on CPython 3.13 + NumPy 2.x on a laptop
        function loopUs(n) { return 0.3 + 0.058 * n; }
        function vecUs(n) { return 1.5 + 0.0015 * n; }
        function convUs(n) { return 0.5 + 0.02 * n; }
        var frames = [];
        frames.push(fr('Cost model (from real timings): Python loop ≈ <b>58 ns per element</b>; a NumPy expression ≈ <b>1.5 µs fixed overhead</b> + 1.5 ns per element; converting a list to an array ≈ 20 ns per element. Let us see who wins at each size.', [
          { type: 'vars', label: 'model (µs)', vals: { loop: '0.3 + 0.058·N', numpy: '1.5 + 0.0015·N', list_to_array: '0.5 + 0.02·N' } },
          { type: 'code', label: 'the two contenders', lang: 'python', code: 's = sum(x * x for x in lst)      # loop\ns = int((arr * arr).sum())       # vectorized', hl: {} }
        ]));
        var ratios = [], labels = [];
        ns.forEach(function (n) {
          var L = loopUs(n), V = vecUs(n), C = convUs(n) + V;
          var winner = L < V ? 'loop' : 'numpy';
          ratios.push(round1(L / V)); labels.push('N=' + n);
          frames.push(fr('<b>N = ' + n.toLocaleString() + '</b>: loop ≈ ' + round1(L) + ' µs, NumPy ≈ ' + round1(V) + ' µs' + (winner === 'loop' ? ' → <span class="c-y">the plain loop wins</span>: NumPy\'s fixed call overhead dominates tiny arrays.' : ' → <span class="c-g">NumPy wins ' + round1(L / V) + '×</span>.') + ' If the data starts as a Python list, add conversion: ' + round1(C) + ' µs total' + (C > L ? ' — <span class="c-r">then the loop is still better</span>!' : '.'), [
            { type: 'bars', label: 'time in µs at N = ' + n, values: [round1(L), round1(V), round1(C)], idxLabels: ['Python loop', 'NumPy (array ready)', 'NumPy incl. list→array'], hl: winner === 'loop' ? { 0: 'ok', 1: 'bad' } : { 0: 'bad', 1: 'ok', 2: C > L ? 'bad' : 'win' } }
          ]));
        });
        frames.push(fr('Speed-up of NumPy over the loop at each size. Below 1.0 the loop is faster. Rule of thumb: vectorize when arrays have <b>thousands+</b> of elements and the data <b>already lives</b> in NumPy (or is read straight into it).', [
          { type: 'bars', label: 'speed-up (loop time ÷ NumPy time)', values: ratios, idxLabels: labels, hl: (function () { var h = {}; ratios.forEach(function (r, i) { h[i] = r < 1 ? 'bad' : 'ok'; }); return h; })() }
        ]));
        return frames;
      }
    }, {
      title: 'Broadcasting: (3,1) + (1,4) → (3,4) without copying',
      input: '1 2 3 | 10 20 30 40',
      inputLabel: 'column values | row values',
      gen: function (input) {
        var halves = String(input).split('|');
        if (halves.length !== 2) throw new Error('Format: 1 2 3 | 10 20 30 40');
        var col = nums(halves[0], 6, 'Column: up to 6 numbers'), row = nums(halves[1], 6, 'Row: up to 6 numbers');
        var r = col.length, c = row.length, frames = [];
        var colHead = row.map(function (_, j) { return 'j' + j; }), rowHead = col.map(function (_, i) { return 'i' + i; });
        frames.push(fr('Shapes: column <b>(' + r + ', 1)</b> and row <b>(1, ' + c + ')</b>. Align from the right: ' + c + ' vs 1 → OK (one is 1); 1 vs ' + r + ' → OK. Result shape <b>(' + r + ', ' + c + ')</b>.', [
          { type: 'grid', label: 'col  shape (' + r + ',1)', rows: col.map(function (v) { return [v]; }), rowHead: rowHead, colHead: ['j0'] },
          { type: 'grid', label: 'row  shape (1,' + c + ')', rows: [row.slice()], rowHead: ['i0'], colHead: colHead }
        ]));
        var stretchedCol = col.map(function (v) { return row.map(function () { return v; }); });
        var hl1 = {}; for (var i = 0; i < r; i++) for (var j = 1; j < c; j++) hl1[i + ',' + j] = 'win';
        frames.push(fr('The size-1 column dimension is <b>virtually stretched</b> to ' + c + ' columns. Blue cells are not real copies: NumPy uses a <b>stride of 0</b>, so it re-reads the same number.', [
          { type: 'grid', label: 'col stretched → (' + r + ',' + c + ')', rows: stretchedCol, rowHead: rowHead, colHead: colHead, hl: hl1 }
        ]));
        var stretchedRow = col.map(function () { return row.slice(); });
        var hl2 = {}; for (i = 1; i < r; i++) for (j = 0; j < c; j++) hl2[i + ',' + j] = 'win';
        frames.push(fr('Same for the row: its size-1 row dimension is stretched to ' + r + ' rows (stride 0 again — zero extra memory).', [
          { type: 'grid', label: 'row stretched → (' + r + ',' + c + ')', rows: stretchedRow, rowHead: rowHead, colHead: colHead, hl: hl2 }
        ]));
        var res = [], hl3 = {};
        for (i = 0; i < r; i++) {
          res.push([]);
          for (j = 0; j < c; j++) res[i].push('');
        }
        for (i = 0; i < r; i++) {
          for (j = 0; j < c; j++) { res[i][j] = col[i] + row[j]; }
          hl3 = {}; for (j = 0; j < c; j++) hl3[i + ',' + j] = 'ok';
          frames.push(fr('Row i' + i + ': ' + col[i] + ' + each row value → ' + res[i].join(', ') + '. One C loop fills the whole result; no Python iteration.', [
            { type: 'grid', label: 'result = col + row', rows: res.map(function (x) { return x.slice(); }), rowHead: rowHead, colHead: colHead, hl: hl3 }
          ]));
        }
        frames.push(fr('Counter-example: shapes <b>(' + r + ',)</b> and <b>(' + c + ',)</b> (two flat 1-D arrays). Aligned from the right: ' + r + ' vs ' + c + (r === c ? ' are equal, so they would add element-wise — but a 1-D + 1-D never makes a table. You need the extra axis: <code>col[:, None] + row[None, :]</code>.' : ' — neither is 1 → <span class="c-r">ValueError: operands could not be broadcast together</span>. Fix: <code>col[:, None] + row</code>.'), [
          { type: 'code', label: 'fix with np.newaxis', lang: 'python', code: 'a = np.array(' + pyList(col) + ')   # shape (' + r + ',)\nb = np.array(' + pyList(row) + ')   # shape (' + c + ',)\nouter = a[:, None] + b   # (' + r + ',1) + (' + c + ',) -> (' + r + ',' + c + ')', hl: { 3: 'ok' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Boolean masks replace if-inside-loop', html: R`<p>"Give every score below 40 a +5 bonus, cap at 100." Loop: per-element if. Vectorized: build a <b>mask</b> (an array of True/False), use it to select, then clip:</p>`, code: { lang: 'python', check: false, code: R`
import numpy as np
scores = np.array([35, 90, 38, 99, 60])
scores[scores < 40] += 5            # mask selects 35 and 38 only
scores = np.minimum(scores, 100)    # element-wise cap
print(scores)                        # [ 40  90  43  99  60]` } },
      { title: 'axis= : summing rows vs columns', html: R`<p>For a matrix of sales (rows = stores, columns = days): <code>m.sum(axis=0)</code> collapses the rows → one total <b>per day</b>; <code>m.sum(axis=1)</code> collapses the columns → one total <b>per store</b>. Memory trick: <i>axis=k is the dimension that disappears</i>.</p>${H.table(['', 'Mon', 'Tue', 'axis=1 (per store)'], [['store A', '3', '5', '<b>8</b>'], ['store B', '2', '7', '<b>9</b>'], ['axis=0 (per day)', '<b>5</b>', '<b>12</b>', '']])}` },
      { title: 'np.vectorize is NOT vectorization', html: R`<p><code>np.vectorize(f)</code> just wraps a Python loop so it accepts arrays — the docs say it is "provided primarily for convenience, not for performance". Real speed comes from expressing <code>f</code> with ufuncs (<code>np.where</code>, <code>np.select</code>, arithmetic) or compiling it with <b>Numba</b> (<code>@njit</code>), which turns the loop into machine code.</p>`, code: { lang: 'python', check: false, code: R`
import numpy as np
from numba import njit       # pip install numba

def grade(x):
    return 2 if x >= 90 else (1 if x >= 50 else 0)

a = np.random.default_rng(0).integers(0, 100, 1_000_000)
slow = np.vectorize(grade)(a)                       # Python loop in disguise
fast = np.select([a >= 90, a >= 50], [2, 1], 0)     # true vectorization

@njit
def grade_all(arr):
    out = np.empty_like(arr)
    for i in range(arr.size):          # compiled to machine code by Numba
        out[i] = 2 if arr[i] >= 90 else (1 if arr[i] >= 50 else 0)
    return out
print((slow == fast).all(), (grade_all(a) == fast).all())` } },
      { title: 'pandas: avoid iterrows / apply(axis=1)', html: R`<p>pandas columns are NumPy (or Arrow) arrays. <code>df.iterrows()</code> builds a Series object per row — often 100× slower than a column expression. Write <code>df["total"] = df["price"] * df["qty"]</code>, use <code>np.where</code> for conditions, <code>groupby().agg()</code> for group stats. For very large data, <b>Polars</b> (Rust, multi-threaded, lazy query optimiser) is the 2026 go-to.</p>` }
    ],
    deepDive: R`<p>🟣 <b>Why it is fast.</b> An <code>ndarray</code> is a header (dtype, shape, <b>strides</b> — bytes to step per dimension) plus a pointer to one contiguous buffer. Ufuncs are C loops specialised per dtype; NumPy 2.x dispatches to SIMD kernels (SSE/AVX2/AVX-512/NEON) chosen at runtime, and BLAS (OpenBLAS/MKL/Accelerate) handles <code>@</code>/<code>dot</code> with multithreading and cache blocking. Transposes and basic slices just change strides — O(1), no copy — which is why they are <b>views</b>. Reductions over a non-contiguous axis are slower because of cache misses; <code>np.ascontiguousarray</code> can help.</p>
<p><b>Hidden costs:</b> each operation in <code>a*b + c*d - e</code> allocates a temporary array the size of the input; for huge arrays memory bandwidth becomes the limit. Fix with in-place ops (<code>np.multiply(a, b, out=a)</code>), <code>numexpr</code>, or Numba fusing the loop. <b>dtypes:</b> fixed-width ints wrap on overflow (NumPy may warn for scalars but arrays wrap silently); <code>float32</code> halves memory and doubles SIMD width but loses precision; NumPy 2.0 adopted <b>NEP 50</b> promotion rules, so <code>np.float32(3) + 3.0</code> now stays <code>float32</code> (Python scalars are "weak"). Object dtype arrays (<code>dtype=object</code>) lose every benefit — they are a list of pointers again.</p>
<p><b>Beyond NumPy:</b> the Array API standard lets the same code run on NumPy, CuPy (GPU), PyTorch and JAX. JAX adds <code>jit</code> + <code>vmap</code> (automatic vectorization), Numba compiles loops, and Polars/DuckDB vectorize dataframe and SQL work across cores.</p>`,
    aiEra: R`<p><b>What AI changes:</b> translating a nested Python loop into a broadcasting expression is exactly the kind of mechanical rewrite assistants do well, and they are good at explaining shape errors. <b>Use AI as a partner:</b> <i>"Vectorize this loop with NumPy; annotate the shape of every intermediate array in a comment"</i> — then check those shapes yourself with <code>.shape</code> on small data. <b>Where AI goes wrong:</b> silently creating an (n, n) intermediate that needs 80 GB for n = 100,000, using <code>np.vectorize</code> and calling it vectorized, mixing views and copies so writes vanish, and ignoring integer overflow in <code>int32</code>/<code>uint8</code>. <b>What you must still own:</b> the memory math of intermediates, deciding when a loop is actually fine (small N), and testing the vectorized version against the loop version on random inputs (<code>np.allclose</code>).</p>`,
    problems: [{
      title: 'Moving Average of Prices: O(n·k) → O(n)',
      level: 'Medium', tags: ['prefix sum', 'vectorization', 'numpy'], companies: ['Two Sigma', 'Bloomberg', 'Citadel'],
      statement: R`<p>Given daily prices and a window size <code>k</code>, return the list of <b>k-day moving averages</b> (one value for each full window, in order). The current nested-loop code is too slow for 10<sup>6</sup> prices with k = 1,000. Write an O(n) version, and show how NumPy would vectorize it.</p>`,
      constraints: R`1 ≤ k ≤ n ≤ 10<sup>6</sup>; prices are floats. Output length n − k + 1.`,
      example: R`<p>prices = <code>[2, 4, 6, 8, 10]</code>, k = 3 → <code>${H.c('g', '[4.0, 6.0, 8.0]')}</code>. Windows: (2+4+6)/3 = 4, (4+6+8)/3 = 6, (6+8+10)/3 = 8.</p>`,
      brute: { why: R`<p>Each window is re-summed from scratch: k additions × (n − k + 1) windows = <b>O(n·k)</b>, about 10<sup>9</sup> Python additions for n = 10<sup>6</sup>, k = 10<sup>3</sup> — minutes in CPython. Neighbouring windows share k − 1 numbers, so almost all that work is repeated.</p>`, code: { lang: 'python', run: true, code: R`
def moving_avg_slow(prices, k):
    out = []
    for i in range(len(prices) - k + 1):
        out.append(sum(prices[i:i + k]) / k)   # re-sums k items every window
    return out

print(moving_avg_slow([2, 4, 6, 8, 10], 3))` } },
      mcq: { q: 'Which identity removes the repeated summing?', options: ['window(i) = prefix[i+k] − prefix[i] where prefix holds running totals', 'Sort the prices first', 'Use a set to skip duplicate prices', 'Divide each price by k first'], answer: 0, explain: 'With prefix sums, any window sum is one subtraction. NumPy does exactly this with cumsum, all in C.' },
      hints: [R`<p>Hint 1: the window sliding right by one loses one number on the left and gains one on the right.</p>`, R`<p>Hint 2: running totals <code>prefix[0] = 0, prefix[i+1] = prefix[i] + p[i]</code> (that is <code>itertools.accumulate</code> or <code>np.cumsum</code>). Then window sum = <code>prefix[i+k] − prefix[i]</code>.</p>`, R`<p>Hint 3: recipe — build prefix (length n+1), output <code>[(prefix[i+k] − prefix[i]) / k for i in range(n − k + 1)]</code>. Edge cases: k = n (one value), k = 1 (the prices themselves). Float drift over 10<sup>6</sup> additions is tiny but real; use <code>math.fsum</code> or periodic re-summing if exactness matters.</p>`],
      solution: {
        approach: R`<p>Prefix sums turn each window into one subtraction: O(n) total. In pure Python, <code>itertools.accumulate</code> builds the prefix in C. In NumPy, the whole thing is three vectorized operations: <code>c = np.cumsum(np.insert(p, 0, 0)); (c[k:] - c[:-k]) / k</code>. (<code>np.convolve(p, np.ones(k)/k, "valid")</code> is the same idea, O(n·k) but in C.)</p>`,
        code: { lang: 'python', run: true, code: R`
from itertools import accumulate

def moving_avg(prices, k):
    prefix = [0.0, *accumulate(prices)]          # prefix[i] = sum of first i prices
    return [(prefix[i + k] - prefix[i]) / k for i in range(len(prices) - k + 1)]

print(moving_avg([2, 4, 6, 8, 10], 3))           # [4.0, 6.0, 8.0]

import random, time
random.seed(7)
p = [random.uniform(90, 110) for _ in range(300_000)]
t = time.perf_counter(); r = moving_avg(p, 1000); dt = time.perf_counter() - t
print(f"{len(r):,} averages in {dt*1000:.1f} ms")
` },
        alt: [{ lang: 'python', check: false, title: 'NumPy vectorized', code: R`
import numpy as np

def moving_avg_np(prices, k):
    p = np.asarray(prices, dtype=float)
    c = np.cumsum(np.concatenate(([0.0], p)))     # prefix sums in C
    return (c[k:] - c[:-k]) / k                   # every window at once

print(moving_avg_np([2, 4, 6, 8, 10], 3))         # [4. 6. 8.]
# Also possible: np.lib.stride_tricks.sliding_window_view(p, k).mean(axis=1)  (O(n*k))` }],
        dry: { head: ['i', 'prefix[i+k]', 'prefix[i]', 'window sum', 'average'], rows: [
          ['prefix', '[0, 2, 6, 12, 20, 30]', '', '', ''],
          ['0', 'prefix[3] = 12', 'prefix[0] = 0', '12', '<span class="c-g">4.0</span>'],
          ['1', 'prefix[4] = 20', 'prefix[1] = 2', '18', '<span class="c-g">6.0</span>'],
          ['2', 'prefix[5] = 30', 'prefix[2] = 6', '24', '<span class="c-g">8.0</span>']
        ] },
        complexity: R`<p>Time O(n), space O(n) for the prefix array (O(1) extra with a running-sum sliding window). NumPy version: same Big-O, but ~50× smaller constant because all loops run in C.</p>`,
        followUps: ['Exponential moving average (each value depends on the previous) — why is it hard to vectorize, and how does Numba or scipy.signal.lfilter help?', 'Moving median instead of mean', 'Stream prices one at a time with O(1) memory per update']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4: Memory optimization
     ====================================================================== */
  var MEM_LAYOUTS = [
    { name: 'list of dicts', b: 268, why: 'Each record is a full hash table (~192 bytes for 3 keys incl. list slot) plus 3 boxed values (~76 bytes). Flexible, but the most expensive.' },
    { name: 'class instances', b: 180, why: 'Since 3.11 instances store attribute values inline and only build a real __dict__ if you ask for it, so plain objects are much cheaper than dicts.' },
    { name: 'namedtuple', b: 156, why: 'A tuple with field names stored once on the class. Immutable, compact, readable.' },
    { name: '__slots__ class', b: 140, why: 'Fixed attribute slots, no per-instance __dict__ at all. Smallest object form, and attribute access is fast.' },
    { name: 'array columns', b: 24, why: 'Column-oriented: array("d") / array("q") (or NumPy) store raw 8-byte numbers back to back — no per-value object header at all.' }
  ];
  topics.push({
    title: 'Memory Optimization: getsizeof, tracemalloc, __slots__, Generators & Compact Storage',
    analogy: R`<p>Packing for a trip: putting every T-shirt in its <b>own suitcase</b> (each with handle, wheels and lock) wastes most of the space on suitcases, not shirts. That is a list of tiny Python objects — each number wears a 24–28 byte "suitcase" (object header). Rolling all the shirts tightly into <b>one</b> bag is an <code>array</code> or NumPy column. And if you only need one outfit per day, you do not pack the whole wardrobe — you <b>stream</b> it, one day at a time, with a generator.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> In CPython <b>everything is an object</b> with a header (reference count + type pointer = 16 bytes, more for containers). So a small int costs <b>28 bytes</b>, a float <b>24</b>, an empty string <b>41</b>, and a list stores <b>8-byte pointers</b> to those objects. A million ints in a list ≈ 8 MB of pointers + 28 MB of int objects. The same million numbers in <code>array("i")</code> take <b>4 MB</b>.</p>
<p>The memory toolbox, from easiest to most powerful:</p>
<ol>
<li><b>Measure:</b> <code>sys.getsizeof(obj)</code> — size of the object itself (${H.c('r', 'shallow')}: does not include what it points to). <code>tracemalloc</code> — tracks every allocation, shows peak memory and which line allocated it. Third-party <code>memray</code> gives flame graphs of allocations.</li>
<li><b>Do not hold it all:</b> generators and iterators process one item at a time: <code>sum(len(line) for line in f)</code> never stores the file. Read files in chunks; stream query results.</li>
<li><b>Smaller per-object shape:</b> <code>__slots__</code> classes, <code>namedtuple</code>/tuples instead of dicts per record, <code>@dataclass(slots=True)</code>.</li>
<li><b>Compact storage:</b> <code>array</code> module, <code>bytes</code>/<code>bytearray</code>, NumPy arrays with the smallest safe dtype, pandas <code>category</code> dtype for repeated strings, <code>sys.intern</code> for many duplicate strings.</li>
<li><b>Release references:</b> unbounded caches (<code>@lru_cache(maxsize=None)</code>), global lists that only grow, and reference cycles holding big objects are the classic "leaks". Use <code>maxsize</code>, <code>weakref</code>, and <code>del</code>.</li>
</ol>
${H.table(['object (CPython 3.13, 64-bit)', 'sys.getsizeof'], [['<code>0</code> … small int', '28 bytes'], ['<code>1.0</code>', '24'], ['<code>""</code> / <code>"a"</code>', '41 / 42'], ['<code>(1, 2, 3)</code>', '64'], ['<code>{"x":1,"y":2,"z":3}</code>', '184'], ['<code>list(range(10**6))</code>', '8,000,056 (pointers only!)'], ['<code>array("i", range(10**6))</code>', '~4,000,000']])}`,
    clues: [
      '"Process a 50 GB file on a 4 GB machine" → stream with generators / chunks, never <code>readlines()</code>',
      '"Millions of small objects" / "OOM in a Python service" → <code>__slots__</code>, tuples, arrays, NumPy columns',
      '"Memory keeps growing over days" → leak hunt with <code>tracemalloc</code> snapshots, unbounded caches, cycles',
      '"How big is this object really?" → <code>getsizeof</code> is shallow; walk references or use tracemalloc',
      '"Same string repeated millions of times" (country codes, status) → <code>sys.intern</code> / category dtype',
      '"Slicing a huge bytes buffer is slow" → <code>memoryview</code> slices without copying'
    ],
    code: [{ lang: 'python', run: true, title: 'getsizeof is shallow; tracemalloc sees everything', code: R`
import sys
import tracemalloc

nums = list(range(100_000))
print("getsizeof(list):", sys.getsizeof(nums), "bytes  <- pointers only")
print("plus the int objects:", sys.getsizeof(nums) + sum(map(sys.getsizeof, nums)), "bytes")

def deep_size(obj, seen=None):
    """Rough recursive size: follows containers, counts each object once."""
    seen = set() if seen is None else seen
    if id(obj) in seen:
        return 0
    seen.add(id(obj))
    size = sys.getsizeof(obj)
    if isinstance(obj, dict):
        size += sum(deep_size(k, seen) + deep_size(v, seen) for k, v in obj.items())
    elif isinstance(obj, (list, tuple, set, frozenset)):
        size += sum(deep_size(x, seen) for x in obj)
    return size

record = {"name": "Asha", "tags": ["admin", "ops"], "score": 97.5}
print("shallow:", sys.getsizeof(record), " deep:", deep_size(record))

tracemalloc.start()
squares = [i * i for i in range(200_000)]            # materialised list
current, peak = tracemalloc.get_traced_memory()
print(f"list version   current {current/1e6:.1f} MB  peak {peak/1e6:.1f} MB")
tracemalloc.reset_peak()
del squares
total = sum(i * i for i in range(200_000))           # generator: one item at a time
current, peak = tracemalloc.get_traced_memory()
print(f"generator      current {current/1e6:.2f} MB  peak {peak/1e6:.2f} MB  total={total}")
tracemalloc.stop()
` }, { lang: 'python', run: true, title: '__slots__, dataclass(slots=True) and compact arrays', code: R`
import sys
import tracemalloc
from array import array
from dataclasses import dataclass

class Point:                     # normal class: can add any attribute later
    def __init__(self, x, y):
        self.x, self.y = x, y

class SlotPoint:                 # fixed set of attributes, no per-instance __dict__
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x, self.y = x, y

@dataclass(slots=True)           # Python 3.10+: dataclass generates __slots__
class DPoint:
    x: float
    y: float

def measure(make, n=50_000):
    tracemalloc.start()
    objs = [make(float(i), float(i)) for i in range(n)]
    cur, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return cur / n, objs

factories = [("Point", Point), ("SlotPoint", SlotPoint), ("DPoint", DPoint),
             ("tuple", lambda x, y: (x, y))]
for name, make in factories:
    per, _ = measure(make)
    print(f"{name:<10} ~{per:6.1f} bytes per point (incl. 2 floats)")

xs = array("d", (float(i) for i in range(50_000)))   # raw doubles, 8 bytes each
print("array('d') bytes per value:", sys.getsizeof(xs) / len(xs))

try:
    SlotPoint(1, 2).z = 3
except AttributeError as e:
    print("slots forbid new attributes:", e)
` }],
    viz: [{
      title: 'Bytes per record: dicts vs objects vs __slots__ vs arrays',
      input: '1000000',
      inputLabel: 'Number of records (each: 2 floats + 1 int)',
      gen: function (input) {
        var n = Number(String(input).trim());
        if (!isFinite(n) || n < 1 || n > 1e9) throw new Error('Enter a record count between 1 and 1,000,000,000');
        var frames = [], vals = [], names = [];
        frames.push(fr('We store <b>' + n.toLocaleString() + '</b> records like <code>{x: 1.5, y: 3.0, id: 1042}</code> five different ways. Numbers are measured with <code>tracemalloc</code> on CPython 3.13 (64-bit) and include the boxed float/int values.', [
          { type: 'bars', label: 'bytes per record', values: [0], idxLabels: ['start'] },
          tx('Every Python value is a full object: float = 24 bytes, small int = 28 bytes. Containers add their own header and pointer slots on top.', 'Why Python objects are big')
        ]));
        MEM_LAYOUTS.forEach(function (m, i) {
          vals.push(m.b); names.push(m.name);
          var hl = {}; hl[i] = i === MEM_LAYOUTS.length - 1 ? 'ok' : 'cur';
          var totalMB = Math.round(m.b * n / 1e6);
          frames.push(fr('<b>' + esc(m.name) + '</b> ≈ ' + m.b + ' bytes/record → <b>' + totalMB.toLocaleString() + ' MB</b> for ' + n.toLocaleString() + ' records. ' + m.why, [
            { type: 'bars', label: 'bytes per record (lower is better)', values: vals.slice(), idxLabels: names.slice(), hl: hl },
            { type: 'vars', label: 'total for your N', vals: { layout: m.name, total_MB: totalMB } }
          ]));
        });
        frames.push(fr('From dicts to columns is an <b>' + round1(268 / 24) + '×</b> saving. Typical path in production: dicts → <code>@dataclass(slots=True)</code> (easy, keeps OOP) → NumPy/pandas/Polars columns when you need millions of rows and vectorized maths.', [
          { type: 'bars', label: 'total MB for ' + n.toLocaleString() + ' records', values: MEM_LAYOUTS.map(function (m) { return Math.round(m.b * n / 1e6); }), idxLabels: names.slice(), hl: { 0: 'bad', 4: 'sel' } }
        ]));
        return frames;
      }
    }, {
      title: 'Streaming pipeline: list holds everything, generator holds one item',
      input: '5 12 7 3 9 14',
      inputLabel: 'Line lengths in a "file" (space separated)',
      gen: function (input) {
        var a = nums(input, 10, 'Enter line lengths, e.g. 5 12 7 3');
        var frames = [], held = [], total = 0;
        frames.push(fr('Goal: total characters of all lines. Version A: <code>lines = f.readlines()</code> then sum. Version B: <code>sum(len(l) for l in f)</code>. Watch what each keeps in memory.', [
          { type: 'code', label: 'two versions', lang: 'python', code: 'lines = f.readlines()              # A: whole file in RAM\ntotal = sum(len(l) for l in lines)\n\ntotal = sum(len(l) for l in f)     # B: one line at a time', hl: {} }
        ]));
        a.forEach(function (v, i) {
          held.push('line' + i);
          frames.push(fr('A: <code>readlines()</code> loads line ' + i + ' and <b>keeps it</b>. Memory grows with the file: ' + held.length + ' line object(s) alive.', [
            { type: 'stack', label: 'A: list in memory', items: held.slice(), hl: (function () { var h = {}; h[held.length - 1] = 'bad'; return h; })() },
            { type: 'vars', vals: { objects_alive: held.length } }
          ]));
        });
        a.forEach(function (v, i) {
          total += v;
          frames.push(fr('B: the generator pulls <b>line ' + i + '</b> (' + v + ' chars), adds it to the running total, and the line is freed immediately (refcount → 0). Only <b>one</b> line is ever alive.', [
            { type: 'queue', label: 'B: file → genexpr → sum()', items: ['line' + i], hl: { 0: 'ok' }, frontLabel: 'in flight', backLabel: '' },
            { type: 'vars', vals: { running_total: total, objects_alive: 1 }, hl: { running_total: 'ok' } }
          ]));
        });
        frames.push(fr('Same answer (<b>' + total + '</b>), but A needed memory ∝ file size while B needs O(1). For a 50 GB log, A crashes; B runs fine. Trade-off: a generator can be consumed <b>only once</b>.', [
          { type: 'bars', label: 'peak objects alive', values: [a.length, 1], idxLabels: ['A: readlines()', 'B: generator'], hl: { 0: 'bad', 1: 'ok' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Find a leak with tracemalloc snapshots', html: R`<p>Take a snapshot, run the suspicious code, take another, and <b>diff</b>. The top line points at the file and line number that allocated the most new memory — here an "audit log" list that only ever grows.</p>`, code: { lang: 'python', run: true, code: R`
import tracemalloc

AUDIT = []                         # module-level list that is never trimmed -> leak

def handle_request(i):
    AUDIT.append({"req": i, "payload": "x" * 200})

tracemalloc.start()
before = tracemalloc.take_snapshot()
for i in range(5_000):
    handle_request(i)
after = tracemalloc.take_snapshot()
for stat in after.compare_to(before, "lineno")[:2]:
    print(stat)                    # points at the AUDIT.append line
tracemalloc.stop()` } },
      { title: 'memoryview: slice big buffers without copying', html: R`<p><code>data[1000:]</code> on <code>bytes</code> <b>copies</b> everything after index 1000. A <code>memoryview</code> slice is a window onto the same memory: O(1) and zero extra bytes. Essential for network protocol parsers.</p>`, code: { lang: 'python', run: true, code: R`
data = bytearray(b"HEADER" + b"x" * 1_000_000)
view = memoryview(data)
body = view[6:]                 # no copy: just a new window
print(len(body), body[:3].tobytes())
view[0:6] = b"header"           # writes go to the original buffer
print(data[:6])` } },
      { title: 'sys.intern for millions of repeated strings', html: R`<p>Parsing a CSV creates a <b>new</b> string object for every "IN" or "US" cell even if the text is identical. <code>sys.intern(s)</code> returns one canonical shared copy, so a million rows hold a million pointers to a handful of strings. pandas does the same with <code>astype("category")</code>.</p>`, code: { lang: 'python', run: true, code: R`
import sys
rows = ["IN,1", "US,2", "IN,3"] * 3
countries = [sys.intern(r.split(",")[0]) for r in rows]
print(countries[0] is countries[3], len({id(c) for c in countries}), "distinct objects")` } },
      { title: 'Unbounded cache = memory leak', html: R`<p><code>@lru_cache(maxsize=None)</code> on a function called with ever-new arguments (user IDs, timestamps) grows forever. Use a bounded <code>maxsize</code>, check <code>.cache_info()</code>, and never cache on <b>methods</b> naively: <code>self</code> becomes part of the key and keeps every instance alive. Use <code>functools.cached_property</code> or a per-instance dict instead.</p>` }
    ],
    deepDive: R`<p>🟣 <b>How CPython manages memory.</b> Objects ≤ 512 bytes come from <b>pymalloc</b>: 16 KB pools inside 1 MB arenas (sizes vary by version). Memory returns to the OS only when an entire arena is empty, so after freeing millions of small objects the process RSS may stay high even though Python can reuse the space — that is <b>fragmentation</b>, not a leak. Most objects die as soon as their <b>reference count</b> hits zero; the cyclic garbage collector (generational; 3.14 introduced an incremental collector) only cleans up reference <b>cycles</b>. Objects with <code>__del__</code> in cycles are collectable since 3.4 (PEP 442).</p>
<p><b>Object layouts:</b> since 3.11, instances keep attribute values in an inline array with a shared key table on the class, and only materialise a <code>__dict__</code> on demand — which is why plain objects beat dicts in the viz. <code>__slots__</code> still wins (no dict pointer, no weakref slot unless you add <code>"__weakref__"</code>), but costs flexibility: no new attributes, and multiple inheritance with non-empty slots in two bases fails with a layout conflict. Lists over-allocate by ~12.5% for amortised O(1) append; <code>tuple</code> is exact-size. Ints up to 2<sup>30</sup>−1 use one 30-bit "digit" (28 bytes); bigger ints grow 4 bytes per digit.</p>
<p><b>Tools in production:</b> <code>memray</code> (native + Python allocations, flame graphs, live mode), <code>tracemalloc</code> (stdlib, ~2× slowdown while tracing), <code>objgraph</code> for "who is keeping this alive?" (<code>gc.get_referrers</code>), and container limits + OOM-killer metrics. For data, columnar formats (Arrow, Parquet) and <code>mmap</code> let you work with files bigger than RAM; Polars streams lazily.</p>`,
    aiEra: R`<p><b>What AI changes:</b> assistants can convert a dict-per-record pipeline into dataclasses with slots or Arrow columns in minutes, and they read <code>memray</code>/<code>tracemalloc</code> output well. <b>Use AI as a partner:</b> <i>"Here is the tracemalloc top-10 diff after 1 hour of traffic — which allocation sites grow, and what holds references to them?"</i> <b>Where AI goes wrong:</b> it trusts <code>sys.getsizeof</code> as a deep size, quotes pre-3.11 numbers for instance size, suggests <code>gc.collect()</code> calls as a "fix" for leaks that are really live references, and adds <code>__slots__</code> to classes that need dynamic attributes or pickling quirks. <b>What you must still own:</b> measuring peak memory with realistic data, understanding refcounts vs cycles, and the product decision of streaming vs materialising (a generator can only be read once).</p>`,
    problems: [{
      title: 'Aggregate a Huge Access Log in Constant Memory',
      level: 'Medium', tags: ['generators', 'memory', 'streaming'], companies: ['Cloudflare', 'Datadog', 'Netflix'],
      statement: R`<p>An access log has one request per line: <code>&lt;status&gt; &lt;bytes&gt; &lt;path&gt;</code>. Return a dict mapping each status code to the <b>total bytes</b> served. The file is <b>80 GB</b>; the machine has 2 GB of RAM. The current code reads the whole file into lists and crashes with <code>MemoryError</code>.</p>`,
      constraints: R`Up to 10<sup>9</sup> lines; at most ~50 distinct status codes; malformed lines must be skipped, not crash the job.`,
      example: R`<p>Lines <code>200 512 /a</code>, <code>404 0 /x</code>, <code>200 1024 /b</code>, <code>oops</code>, <code>500 10 /c</code> → <code>${H.c('g', "{'200': 1536, '404': 0, '500': 10}")}</code>. The "oops" line has the wrong shape and is skipped.</p>`,
      brute: { why: R`<p><code>f.read().splitlines()</code> holds the whole 80 GB file as string objects (more like 150 GB with object overhead), then a second list of parsed tuples doubles it. Memory is O(file size) even though the answer needs only ~50 numbers.</p>`, code: { lang: 'python', run: true, code: R`
import io

def totals_slow(f):
    lines = f.read().splitlines()                  # entire file in RAM
    parsed = [ln.split() for ln in lines]          # and again, as lists
    out = {}
    for p in parsed:
        if len(p) == 3 and p[1].isdigit():
            out[p[0]] = out.get(p[0], 0) + int(p[1])
    return out

log = io.StringIO("200 512 /a\n404 0 /x\n200 1024 /b\noops\n500 10 /c\n")
print(totals_slow(log))` } },
      mcq: { q: 'What memory does a streaming solution need?', options: ['O(number of distinct status codes) — one counter per status', 'O(number of lines)', 'O(file size / 2)', 'O(longest line × number of lines)'], answer: 0, explain: 'Iterating a file object yields one line at a time; only the per-status totals (≈50 entries) and one line are alive at any moment.' },
      hints: [R`<p>Hint 1: a file object is already an iterator of lines — <code>for line in f</code> reads lazily with a small buffer.</p>`, R`<p>Hint 2: build a generator pipeline: lines → split → filter valid → accumulate into a <code>defaultdict(int)</code>. Each stage passes one item along.</p>`, R`<p>Hint 3: recipe — for each line: parts = line.split(); skip unless len == 3 and parts[1].isdigit(); totals[parts[0]] += int(parts[1]). Open the real file with <code>open(path, buffering=1 &lt;&lt; 20)</code>; for gzip logs use <code>gzip.open(path, "rt")</code> — still streaming.</p>`],
      solution: {
        approach: R`<p>Treat the file as a stream. A generator parses and validates each line and yields <code>(status, bytes)</code>; the consumer adds into a small dict. Peak memory = one line + the totals dict, independent of file size. The same code works for <code>sys.stdin</code>, gzip files, or a network socket wrapped as a text stream.</p>`,
        code: { lang: 'python', run: true, code: R`
import io
from collections import defaultdict

def parse(lines):
    """Generator: yields (status, nbytes) for valid lines, skips bad ones."""
    for line in lines:
        parts = line.split()
        if len(parts) == 3 and parts[1].isdigit():
            yield parts[0], int(parts[1])

def totals(f):
    out = defaultdict(int)
    for status, nbytes in parse(f):      # one line alive at a time
        out[status] += nbytes
    return dict(out)

log = io.StringIO("200 512 /a\n404 0 /x\n200 1024 /b\noops\n500 10 /c\n")
print(totals(log))                       # {'200': 1536, '404': 0, '500': 10}

# Simulate a big stream without ever building it in memory
big = (f"{200 if i % 10 else 503} {i % 1000} /p{i}\n" for i in range(300_000))
print(totals(big))
` },
        dry: { head: ['line', 'parts', 'valid?', 'totals after'], rows: [
          ['200 512 /a', "['200','512','/a']", 'yes', "{'200': 512}"],
          ['404 0 /x', "['404','0','/x']", 'yes', "{'200': 512, '404': 0}"],
          ['200 1024 /b', "['200','1024','/b']", 'yes', "{'200': 1536, '404': 0}"],
          ['oops', "['oops']", '<span class="c-r">no → skip</span>', 'unchanged'],
          ['500 10 /c', "['500','10','/c']", 'yes', "<span class=\"c-g\">{'200': 1536, '404': 0, '500': 10}</span>"]
        ] },
        complexity: R`<p>Time O(total bytes of the file) — one pass. Memory O(s) for s distinct statuses plus one line buffer, i.e. O(1) with respect to file size.</p>`,
        followUps: ['Split the 80 GB file into byte ranges and process them in parallel with multiprocessing — how do you handle lines that cross a boundary?', 'Also report the p99 response size per status with bounded memory (t-digest / reservoir sampling)', 'What changes if the log is gzip-compressed?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5: Beyond the interpreter — C extensions, Cython, PyPy, Numba
     ====================================================================== */
  var ACCEL = {
    numeric: { path: ['slow', 'prof', 'arr', 'np'], tool: 'NumPy / pandas / Polars', why: 'The hot spot is maths over whole arrays — express it as array operations and let compiled kernels run the loop.' },
    loops: { path: ['slow', 'prof', 'arr', 'loop', 'numba'], tool: 'Numba (@njit) or Cython', why: 'Custom per-element logic (branches, early exits, state) that does not fit ufuncs. Numba JIT-compiles the Python loop to machine code; Cython compiles typed Python-like code to a C extension.' },
    app: { path: ['slow', 'prof', 'arr', 'loop', 'app', 'pypy'], tool: 'PyPy (or mypyc for typed modules)', why: 'Long-running pure-Python program with logic spread everywhere (simulations, parsers, game servers). PyPy\'s tracing JIT speeds up whole programs without code changes, if your C-extension dependencies work on it.' },
    clib: { path: ['slow', 'prof', 'arr', 'loop', 'app', 'lib', 'ext'], tool: 'ctypes / cffi / pybind11 / Rust + PyO3', why: 'A fast C/C++/Rust library already exists, or you need a custom native core. Bind to it: ctypes/cffi for C ABIs, pybind11/nanobind for C++, PyO3 + maturin for Rust.' },
    io: { path: ['slow', 'prof', 'io', 'async'], tool: 'asyncio / threads / batching', why: 'The profile shows time waiting on network/disk, not CPU. Compiling code changes nothing — overlap the waits (asyncio, thread pool) or batch the requests.' }
  };
  topics.push({
    title: 'Beyond the Interpreter: C Extensions, Cython, Numba, PyPy, mypyc & Rust',
    analogy: R`<p>A Python interpreter is a <b>skilled translator</b> reading your recipe aloud to a cook, sentence by sentence, every single time. Faster options: hand the cook a recipe <b>already translated</b> into their language once (compile: C extensions, Cython, mypyc, Rust), hire a translator who <b>memorises the sentences repeated in a loop</b> and stops re-translating them (a JIT: PyPy, Numba), or have a <b>machine</b> do the whole batch while the cook does something else (NumPy kernels). Each option costs some setup and flexibility.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> CPython interprets bytecode and every value is a boxed object, so a tight numeric loop runs maybe <b>50–100× slower</b> than the same loop in C. When the profile shows a CPU-bound hot spot that better algorithms and NumPy cannot fix, you move <b>just that hot spot</b> out of the interpreter:</p>
${H.table(['tool', 'what it is', 'effort', 'best for'], [
  ['<b>NumPy / Polars</b>', 'pre-compiled array kernels', 'low', 'whole-array maths and dataframes'],
  ['<b>Numba</b> <code>@njit</code>', 'LLVM JIT compiler for a subset of Python + NumPy', 'low', 'numeric loops with custom logic'],
  ['<b>Cython</b>', 'Python-like language with C types → C extension', 'medium', 'typed hot loops, wrapping C libraries'],
  ['<b>mypyc</b>', 'compiles type-annotated Python modules to C extensions', 'low–medium', 'typed app/library code (mypy, black use it)'],
  ['<b>PyPy</b>', 'alternative Python implementation with a tracing JIT', 'low (switch interpreter)', 'long-running pure-Python programs'],
  ['<b>C API / pybind11 / nanobind</b>', 'hand-written C/C++ extension modules', 'high', 'max control, existing C++ code'],
  ['<b>Rust + PyO3 / maturin</b>', 'Rust extension modules', 'medium–high', 'safe, fast, parallel cores (Polars, pydantic-core, orjson, ruff)'],
  ['<b>ctypes / cffi</b>', 'call functions in an existing shared library', 'low', 'quick bindings to a C ABI']
])}
<p>🔵 <b>Three rules.</b> (1) Profile first — only the hot loop moves. (2) The win comes from <b>static types + no boxing + no interpreter dispatch</b>; Cython code without type declarations is barely faster than Python. (3) Crossing the Python↔native boundary has a cost per call (~50–100 ns), so move the <b>whole loop</b> into native code, not one tiny function called a million times.</p>
<p><b>Bonus lever — the GIL:</b> native code can <b>release the GIL</b> (<code>with nogil:</code> in Cython, <code>py.allow_threads</code> in PyO3, <code>@njit(nogil=True)</code>/<code>parallel=True</code> in Numba) so threads truly run in parallel. Python 3.13/3.14 also offer a <b>free-threaded</b> build (<code>python3.14t</code>) with no GIL at all.</p>`,
    clues: [
      '"Profiled; the hot spot is a numeric loop that NumPy cannot express" → Numba or Cython',
      '"We have a C/C++ library and want to call it from Python" → ctypes/cffi (C) or pybind11/nanobind (C++)',
      '"Whole app is pure Python, CPU-bound, long-running" → try PyPy (check C-extension compatibility)',
      '"Need both speed and memory safety for a core library" → Rust + PyO3 + maturin',
      '"CPU-bound threads do not scale" → release the GIL in native code, use processes, or the free-threaded build',
      '"Time is spent waiting on network" → none of these; use asyncio / concurrency instead'
    ],
    code: [{ lang: 'python', run: true, title: 'Push the inner loop into C using only the standard library', code: R`
import time

def count_primes_python(n):
    """Sieve with a pure-Python inner loop."""
    is_p = [True] * (n + 1)
    is_p[0] = is_p[1] = False
    for i in range(2, int(n ** 0.5) + 1):
        if is_p[i]:
            for j in range(i * i, n + 1, i):     # interpreted inner loop
                is_p[j] = False
    return sum(is_p)

def count_primes_c_loops(n):
    """Same algorithm, but the inner loop is a C-level slice assignment."""
    is_p = bytearray([1]) * (n + 1)
    is_p[0] = is_p[1] = 0
    for i in range(2, int(n ** 0.5) + 1):
        if is_p[i]:
            # one C call clears every multiple of i (memset-like stride write)
            is_p[i * i::i] = bytes(len(range(i * i, n + 1, i)))
    return sum(is_p)

n = 2_000_000
for f in (count_primes_python, count_primes_c_loops):
    t = time.perf_counter()
    r = f(n)
    print(f"{f.__name__:<22} {r} primes  {(time.perf_counter() - t) * 1000:7.1f} ms")
` }, { lang: 'python', check: false, title: 'Numba: compile the same loop to machine code', code: R`
# pip install numba
import numpy as np
from numba import njit, prange

@njit(cache=True)                        # first call compiles (~0.3 s), later calls are native
def count_primes(n):
    is_p = np.ones(n + 1, dtype=np.bool_)
    is_p[:2] = False
    for i in range(2, int(n ** 0.5) + 1):
        if is_p[i]:
            for j in range(i * i, n + 1, i):
                is_p[j] = False
    return is_p.sum()

@njit(parallel=True)                     # prange splits iterations across cores, GIL-free
def row_norms(m):
    out = np.empty(m.shape[0])
    for r in prange(m.shape[0]):
        s = 0.0
        for c in range(m.shape[1]):
            s += m[r, c] * m[r, c]
        out[r] = s ** 0.5
    return out

print(count_primes(10_000_000))` }, { lang: 'python', check: false, title: 'Cython: typed code compiled to a C extension (.pyx)', code: R`
# primes.pyx  —  build with:  cythonize -i primes.pyx   (or via setuptools/meson-python)
# cython: boundscheck=False, wraparound=False
def count_primes(int n):
    cdef int i, j, count = 0
    cdef bytearray buf = bytearray(b"\x01") * (n + 1)
    cdef unsigned char[:] is_p = buf          # typed memoryview: raw C access
    is_p[0] = 0
    is_p[1] = 0
    with nogil:                              # no Python objects inside -> release the GIL
        for i in range(2, n + 1):
            if is_p[i]:
                count += 1
                j = i * i
                while j <= n:
                    is_p[j] = 0
                    j += i
    return count` }],
    viz: [{
      title: 'Which accelerator? Follow the decision path',
      input: 'loops',
      inputLabel: 'Workload: numeric | loops | app | clib | io',
      gen: function (input) {
        var key = String(input || '').trim().toLowerCase();
        var w = ACCEL[key];
        if (!w) throw new Error('Type one of: numeric, loops, app, clib, io');
        var nodes = [
          { id: 'slow', label: 'Too slow', x: 8, y: 10, shape: 'box' },
          { id: 'prof', label: 'Profile it', x: 30, y: 10, shape: 'box' },
          { id: 'io', label: 'Mostly waiting?', x: 30, y: 52, shape: 'box' },
          { id: 'async', label: 'asyncio / threads', x: 8, y: 52, shape: 'box' },
          { id: 'arr', label: 'Array maths?', x: 54, y: 10, shape: 'box' },
          { id: 'np', label: 'NumPy / Polars', x: 54, y: 32, shape: 'box' },
          { id: 'loop', label: 'Custom loop?', x: 78, y: 10, shape: 'box' },
          { id: 'numba', label: 'Numba / Cython', x: 92, y: 32, shape: 'box' },
          { id: 'app', label: 'Whole app?', x: 78, y: 52, shape: 'box' },
          { id: 'pypy', label: 'PyPy / mypyc', x: 96, y: 52, shape: 'box' },
          { id: 'lib', label: 'Lib exists?', x: 58, y: 72, shape: 'box' },
          { id: 'ext', label: 'ctypes / pybind11 / PyO3', x: 84, y: 76, shape: 'box' }
        ];
        var edges = [['slow', 'prof'], ['prof', 'io', 'I/O'], ['io', 'async'], ['prof', 'arr', 'CPU'], ['arr', 'np', 'yes'], ['arr', 'loop', 'no'], ['loop', 'numba', 'yes'], ['loop', 'app', 'no'], ['app', 'pypy', 'yes'], ['app', 'lib', 'no'], ['lib', 'ext']];
        var frames = [], hl = {}, ehl = {};
        var labels = { slow: 'It is too slow — but nothing changes until we know <b>why</b>.', prof: 'Profile (cProfile / py-spy). Is the hot time <b>CPU work</b> or <b>waiting</b> on I/O?', io: 'Wall time ≫ CPU time → the program mostly <b>waits</b> (network, disk, DB).', async: 'Overlap the waiting: asyncio, a thread pool, or batching requests. A compiler cannot speed up waiting.', arr: 'CPU-bound. Can the hot spot be written as <b>whole-array operations</b>?', np: 'Yes → vectorize with NumPy / pandas / Polars. Often 10–100× with little code.', loop: 'No → is it a <b>numeric loop</b> with custom per-element logic?', numba: 'Yes → Numba <code>@njit</code> (zero build step) or Cython (typed, compiled extension).', app: 'No → is the slowness spread across a <b>whole pure-Python program</b>?', pypy: 'Yes → try PyPy (tracing JIT, 2–10× typical), or mypyc for type-annotated modules.', lib: 'No → is there an existing C/C++/Rust library, or do you need a hand-written native core?', ext: 'Bind it: ctypes/cffi (C ABI), pybind11/nanobind (C++), PyO3 + maturin (Rust).' };
        w.path.forEach(function (id, i) {
          hl = {}; ehl = {};
          w.path.forEach(function (pid, k) { if (k < i) hl[pid] = 'done'; });
          hl[id] = i === w.path.length - 1 ? 'ok' : 'cur';
          for (var k = 1; k <= i; k++) ehl[w.path[k - 1] + '-' + w.path[k]] = 'ok';
          frames.push(fr(labels[id], [{ type: 'graph', label: 'Speed-up decision path for "' + esc(key) + '"', directed: true, height: 86, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: i === w.path.length - 1 ? (function () { var t = {}; t[id] = 'pick'; return t; })() : {} }]));
        });
        frames.push(fr('<b>Answer: ' + esc(w.tool) + '.</b> ' + w.why, [
          { type: 'graph', label: 'Chosen path', directed: true, height: 86, nodes: nodes, edges: edges, hl: (function () { var h = {}; w.path.forEach(function (p) { h[p] = 'sel'; }); return h; })(), ehl: ehl },
          tx('After the change: <b>profile again</b>. A new hot spot usually appears, and the cheapest fix might be different.', 'Then')
        ]));
        return frames;
      }
    }, {
      title: 'Typical speed-ups for one tight numeric loop',
      gen: function () {
        var rows = [
          ['CPython 3.13', 1, 'baseline: bytecode dispatch + boxed ints every step'],
          ['CPython + C-level slices', 6, 'same algorithm, inner loop pushed into a built-in (slice assignment)'],
          ['PyPy', 8, 'tracing JIT notices the hot loop and emits machine code with unboxed ints'],
          ['Cython (untyped)', 1.5, 'compiled, but every variable is still a PyObject — little gain'],
          ['Cython (typed)', 60, 'cdef int / typed memoryviews → plain C loop'],
          ['Numba @njit', 60, 'LLVM compiles the loop with native types, SIMD where possible'],
          ['hand-written C', 70, 'the ceiling for single-threaded code']
        ];
        var frames = [], vals = [], names = [];
        frames.push(fr('Order-of-magnitude speed-ups for a sieve-style integer loop (illustrative, from common benchmarks; your mileage will vary). The <b>lesson is the shape</b>, not the exact numbers.', [
          { type: 'bars', label: '× faster than CPython', values: [1], idxLabels: ['CPython'], hl: { 0: 'cur' } }
        ]));
        rows.forEach(function (r, i) {
          vals.push(r[1]); names.push(r[0]);
          var h = {}; h[i] = r[1] >= 50 ? 'ok' : (r[1] < 2 && i > 0 ? 'bad' : 'cur');
          frames.push(fr('<b>' + r[0] + '</b>: ~' + r[1] + '×. ' + r[2] + '.', [
            { type: 'bars', label: '× faster than CPython (higher is better)', values: vals.slice(), idxLabels: names.slice(), hl: h }
          ]));
        });
        frames.push(fr('Key insight: <b>types</b> are what make compiled code fast. Untyped Cython ≈ CPython; typed Cython ≈ Numba ≈ C. And remember Amdahl — a 60× faster loop that was 50% of runtime makes the program only ~2× faster.', [
          { type: 'bars', label: 'summary', values: vals.slice(), idxLabels: names.slice(), hl: { 3: 'bad', 4: 'ok', 5: 'ok', 6: 'sel' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'ctypes: call a C library with zero build step', html: R`<p><code>ctypes</code> (stdlib) loads a shared library and calls its functions. You must declare argument and return types yourself — get them wrong and you crash the interpreter (no safety net). Great for quick bindings; for anything big prefer cffi or a compiled binding.</p>`, code: { lang: 'python', code: R`
import ctypes
import ctypes.util

libc = ctypes.CDLL(ctypes.util.find_library("c"))
libc.strlen.argtypes = [ctypes.c_char_p]      # declare the C signature
libc.strlen.restype = ctypes.c_size_t
print(libc.strlen(b"interview"))              # 9` } },
      { title: 'A Rust extension with PyO3 + maturin', html: R`<p>Rust gives C speed with memory safety, and <code>maturin</code> builds wheels for every platform. Many 2026 Python tools are Rust inside: Polars, pydantic-core, orjson, ruff, uv, tokenizers. The function below releases the GIL while it works, so Python threads can run it in parallel.</p>`, code: { lang: 'text', code: R`
// src/lib.rs   —  build: pip install maturin && maturin develop --release
use pyo3::prelude::*;

#[pyfunction]
fn count_primes(py: Python<'_>, n: usize) -> usize {
    py.allow_threads(|| {                    // release the GIL during pure-Rust work
        let mut is_p = vec![true; n + 1];
        is_p[0] = false;
        if n >= 1 { is_p[1] = false; }
        let mut i = 2;
        while i * i <= n {
            if is_p[i] { let mut j = i * i; while j <= n { is_p[j] = false; j += i; } }
            i += 1;
        }
        is_p.iter().filter(|&&b| b).count()
    })
}

#[pymodule]
fn fastprimes(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(count_primes, m)?)
}` } },
      { title: 'The raw C API (what all the tools generate for you)', html: R`<p>Every extension module is ultimately C code that receives <code>PyObject*</code> pointers, converts them to C types, does the work, and builds a new Python object — while keeping reference counts exactly right. Cython, pybind11 and PyO3 exist so you rarely write this by hand.</p>`, code: { lang: 'cpp', check: false, code: R`
#define PY_SSIZE_T_CLEAN
#include <Python.h>

static PyObject* add(PyObject* self, PyObject* args) {
    long a, b;
    if (!PyArg_ParseTuple(args, "ll", &a, &b))   // unbox two Python ints
        return NULL;                             // NULL = exception already set
    return PyLong_FromLong(a + b);               // box the result (new reference)
}

static PyMethodDef Methods[] = {{"add", add, METH_VARARGS, "Add two ints"}, {NULL, NULL, 0, NULL}};
static struct PyModuleDef mod = {PyModuleDef_HEAD_INIT, "fastmath", NULL, -1, Methods};
PyMODINIT_FUNC PyInit_fastmath(void) { return PyModule_Create(&mod); }` } },
      { title: 'mypyc: your type hints become speed', html: R`<p>If your code is already fully type-annotated, <code>mypyc</code> compiles modules to C extensions with no new language: <code>mypyc mymodule.py</code>. Typical gains 1.5–4× for general code (more for tight typed loops). mypy itself is compiled with mypyc and runs ~4× faster than interpreted. The cost: some dynamic features (monkey-patching compiled classes) stop working.</p>` }
    ],
    deepDive: R`<p>🟣 <b>Why native is faster, precisely:</b> CPython executes each bytecode through a dispatch loop, reads operands from a value stack, checks types at runtime, and allocates/frees boxed objects with reference counting. A compiled loop keeps an <code>int</code> in a CPU register, needs no type checks, and can be auto-vectorised. The specializing interpreter (3.11+) and the experimental copy-and-patch <b>JIT</b> (3.13+, still modest gains in 3.14) narrow the gap for general code but do not unbox numbers the way Numba or PyPy do.</p>
<p><b>PyPy trade-offs:</b> a meta-tracing JIT with a generational moving GC; it is often 4–10× faster on pure Python, but warm-up takes time, memory is higher, and C extensions run through the <code>cpyext</code> compatibility layer which can be <i>slower</i> than CPython. PyPy currently tracks an older Python language version (3.10/3.11-level), so check feature and library support. <b>Numba</b> supports a subset (NumPy arrays, numbers, tuples, typed lists/dicts) — unsupported code falls back to an error in <code>njit</code> mode. <b>Stable ABI (abi3)</b> lets one wheel work across many CPython versions; free-threaded builds need extensions rebuilt and audited for thread safety (<code>Py_mod_gil</code> slot), a big 2025–2026 ecosystem effort.</p>
<p><b>Boundary costs:</b> converting a Python list to a C array or NumPy array is O(n); calling a native function costs tens of nanoseconds. So batch: pass whole arrays, return whole results. <b>Parallelism:</b> CPU-bound threads only scale if native code releases the GIL or you run free-threaded Python; otherwise use <code>multiprocessing</code>/<code>ProcessPoolExecutor</code> (pickling costs) or <code>concurrent.interpreters</code> (3.14, PEP 734 subinterpreters, each with its own GIL).</p>`,
    aiEra: R`<p><b>What AI changes:</b> writing a first Cython, Numba or PyO3 version of a hot loop used to take a day of reading docs; an assistant drafts it in a minute, including the <code>pyproject.toml</code> for maturin or meson-python. <b>Use AI as a partner:</b> <i>"Port this profiled hot loop to Numba; keep a pure-Python reference implementation and write a property test comparing both on random inputs"</i>. <b>Where AI goes wrong:</b> untyped Cython that is no faster, C-API code with reference-count leaks or missing error checks, PyO3 snippets for an old API version (the <code>Bound</code> API replaced GIL-refs in 0.21+), Numba code using unsupported Python features, and claiming threads will speed up CPU work under the GIL. <b>What you must still own:</b> the decision of whether native code is worth the build/packaging cost, memory-safety review of any C, and the benchmark proving the win end-to-end.</p>`,
    problems: [{
      title: 'Count Primes up to N: Push the Inner Loop into C',
      level: 'Medium', tags: ['sieve', 'bytearray', 'performance'], companies: ['Microsoft', 'Apple', 'Jane Street'],
      statement: R`<p>Return the number of primes ≤ <code>n</code> for <code>n</code> up to <b>10<sup>7</sup></b>, in pure CPython (no third-party packages), in about a second. The current trial-division code takes minutes.</p>`,
      constraints: R`0 ≤ n ≤ 10<sup>7</sup>. Standard library only.`,
      example: R`<p>n = 20 → <code>${H.c('g', '8')}</code> (primes 2, 3, 5, 7, 11, 13, 17, 19). n = 1 → 0. n = 2 → 1.</p>`,
      brute: { why: R`<p>Trial division tests every k up to √m for each m: about n·√n / log n operations, all in interpreted Python — roughly 10<sup>9</sup> bytecode steps for n = 10<sup>7</sup>. Both the algorithm and the execution engine are wrong for this size.</p>`, code: { lang: 'python', run: true, code: R`
def count_primes_slow(n):
    count = 0
    for m in range(2, n + 1):
        k = 2
        while k * k <= m:          # trial division, interpreted
            if m % k == 0:
                break
            k += 1
        else:
            count += 1
    return count

print(count_primes_slow(20), count_primes_slow(10_000))` } },
      mcq: { q: 'You switched to the Sieve of Eratosthenes but it is still slow in pure Python. Biggest next win (stdlib only)?', options: ['Replace the inner "cross out multiples" loop with one bytearray slice assignment', 'Use a while loop instead of for', 'Store the sieve in a dict', 'Start 8 threads, one per core'], answer: 0, explain: 'Slice assignment with a step runs the whole inner loop in C. Loop style is minor, dicts are slower, and CPU-bound threads do not run in parallel under the GIL.' },
      hints: [R`<p>Hint 1: algorithm first — the sieve crosses out multiples of each prime once: O(n log log n) total, far less than trial division.</p>`, R`<p>Hint 2: <code>bytearray</code> uses 1 byte per flag (vs 8-byte pointers in a list) and supports extended slice assignment: <code>is_p[i*i::i] = bytes(count)</code> zeroes every i-th byte in C.</p>`, R`<p>Hint 3: recipe — flags = bytearray(b"\x01") * (n+1); zero 0 and 1; for i in 2..√n: if flags[i]: flags[i*i::i] = bytes(len(range(i*i, n+1, i))); answer = sum(flags) (sum over bytes is C-level too). Edge cases: n &lt; 2 → 0.</p>`],
      solution: {
        approach: R`<p>Two levers in order: (1) better algorithm — sieve instead of trial division; (2) execution — keep the outer loop in Python (only √n iterations) but run each inner loop as a single C-level slice write on a compact <code>bytearray</code>. Counting with <code>sum()</code> over the bytearray is also a C loop. If third-party packages are allowed, Numba gives another ~5–10×, and NumPy boolean slicing does the same trick.</p>`,
        code: { lang: 'python', run: true, code: R`
import time

def count_primes(n):
    if n < 2:
        return 0
    flags = bytearray(b"\x01") * (n + 1)      # 1 byte per number
    flags[0] = flags[1] = 0
    i = 2
    while i * i <= n:                          # only sqrt(n) outer iterations
        if flags[i]:
            start = i * i
            flags[start::i] = bytes(len(range(start, n + 1, i)))   # inner loop in C
        i += 1
    return sum(flags)                          # C-level count

print(count_primes(20), count_primes(1), count_primes(2))   # 8 0 1
t = time.perf_counter()
print(count_primes(5_000_000), f"in {(time.perf_counter() - t) * 1000:.0f} ms")
` },
        dry: { head: ['i', 'flags[i]?', 'slice cleared', 'numbers still marked (2..20)'], rows: [
          ['start', '', '', '2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20'],
          ['2', 'yes', '4, 6, 8, …, 20', '2 3 5 7 9 11 13 15 17 19'],
          ['3', 'yes', '9, 12, 15, 18', '2 3 5 7 11 13 17 19'],
          ['4', 'no (already crossed out)', '—', 'unchanged'],
          ['5', 'stop: 5·5 = 25 &gt; 20', '—', '<span class="c-g">sum(flags) = 8</span>']
        ] },
        complexity: R`<p>Time O(n log log n) with the inner loops in C; memory n bytes (10 MB for 10<sup>7</sup>). Trial division was ~O(n√n / log n) in interpreted Python.</p>`,
        followUps: ['Halve memory by sieving only odd numbers', 'Segmented sieve for n = 10<sup>12</sup> ranges', 'Parallelise segments with multiprocessing — what is the pickling cost?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6: Packaging with pyproject.toml
     ====================================================================== */
  var PYPROJECT = [
    '[build-system]',
    'requires = ["hatchling>=1.25"]',
    'build-backend = "hatchling.build"',
    '',
    '[project]',
    'name = "fastprimes"',
    'version = "1.2.0"',
    'requires-python = ">=3.10"',
    'dependencies = ["numpy>=1.26"]',
    '',
    '[project.optional-dependencies]',
    'plot = ["matplotlib>=3.8"]',
    '',
    '[project.scripts]',
    'fastprimes = "fastprimes.cli:main"',
    '',
    '[dependency-groups]',
    'dev = ["pytest>=8", "ruff"]'
  ].join('\n');
  topics.push({
    title: 'Packaging Modern Python: pyproject.toml, Wheels, Build Backends & uv',
    analogy: R`<p>Shipping furniture: <b>pyproject.toml</b> is the label on the box (what is inside, what it needs, who made it, which tool assembles it). The <b>build backend</b> is the factory that packs it. A <b>wheel</b> is flat-pack furniture already cut to size — the customer just slots it together (fast install, no tools). An <b>sdist</b> is raw timber plus instructions — the customer's own workshop must build it (needs compilers for native code). <b>PyPI</b> is the warehouse; <b>pip/uv</b> is the delivery van that also checks every other piece of furniture still fits in the room (dependency resolution).</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Since PEP 517/518/621, one file — <code>pyproject.toml</code> — describes a Python project. It has three main tables:</p>
<ul>
<li><code>[build-system]</code> — which <b>build backend</b> turns your source into installable files (hatchling, setuptools, flit-core, pdm-backend, uv_build; for native code: scikit-build-core (CMake), meson-python, maturin (Rust)).</li>
<li><code>[project]</code> — standard metadata: name, version, <code>requires-python</code>, <code>dependencies</code>, optional extras, entry-point scripts.</li>
<li><code>[tool.*]</code> — settings for tools (ruff, pytest, mypy, uv) so you need no extra config files.</li>
</ul>
<p>A <b>build frontend</b> (<code>python -m build</code>, <code>uv build</code>, pip) reads <code>[build-system]</code>, creates an isolated environment with those requirements, and asks the backend for two artifacts:</p>
${H.table(['artifact', 'what it is', 'install needs'], [
  ['<b>sdist</b> <code>.tar.gz</code>', 'source + pyproject; a recipe', 'a build step on the user\'s machine (compilers for C/Rust code)'],
  ['<b>wheel</b> <code>.whl</code>', 'a zip already laid out for <code>site-packages</code>, with a platform tag', 'just unzip — fast, no compiler']
])}
<p>🔵 <b>Dependencies — library vs application:</b> a <b>library</b> declares <i>loose ranges</i> in <code>dependencies</code> (<code>numpy&gt;=1.26</code>) so it can coexist with others. An <b>application</b> also commits a <b>lock file</b> (<code>uv.lock</code>, or the standard <code>pylock.toml</code> from PEP 751) with exact pinned versions and hashes so every deploy is identical. Dev-only tools go in <code>[dependency-groups]</code> (PEP 735), not in your users' install. Always work inside a <b>virtual environment</b> (<code>uv venv</code> / <code>python -m venv .venv</code>).</p>
<p>The 2026 everyday workflow with <b>uv</b> (a very fast Rust-based tool from Astral): <code>uv init</code> → <code>uv add requests</code> → <code>uv run pytest</code> → <code>uv build</code> → <code>uv publish</code>.</p>`,
    clues: [
      '"How do you structure and ship a Python library?" → pyproject.toml + src layout + wheels on PyPI',
      '"Works on my machine, fails in prod" → missing lock file / unpinned transitive dependencies',
      '"pip install compiles for 20 minutes / needs gcc" → no matching wheel; publish wheels (cibuildwheel)',
      '"setup.py vs pyproject.toml" → declarative metadata (PEP 621), isolated builds (PEP 517/518)',
      '"Add a command-line tool to the package" → <code>[project.scripts]</code> entry point',
      '"Dependency conflict between two libraries" → resolver, loose ranges in libraries, pins only in apps'
    ],
    code: [{ lang: 'text', title: 'A complete modern pyproject.toml (hatchling backend)', code: PYPROJECT + R`

[tool.ruff]
line-length = 100

[tool.pytest.ini_options]
testpaths = ["tests"]` }, { lang: 'bash', title: 'Day-to-day commands (uv and the classic equivalents)', code: R`
# project layout (src layout avoids importing the un-installed copy by accident)
#   fastprimes/
#     pyproject.toml
#     src/fastprimes/__init__.py
#     src/fastprimes/cli.py
#     tests/test_primes.py

uv init --lib fastprimes          # scaffold a library with pyproject.toml
uv add numpy                      # add a runtime dependency + update uv.lock
uv add --dev pytest ruff          # dev-only dependency group
uv run pytest                     # run inside the project venv, synced to the lock
uv build                          # -> dist/fastprimes-1.2.0.tar.gz + fastprimes-1.2.0-py3-none-any.whl
uv publish                        # upload (prefer PyPI Trusted Publishing from CI)

# classic toolchain, same result
python -m venv .venv && source .venv/bin/activate
pip install -e ".[plot]"          # editable install + the "plot" extra
python -m build                   # sdist + wheel
twine upload dist/*` }, { lang: 'python', run: true, title: 'Read pyproject.toml with the stdlib tomllib (3.11+)', code: R`
import tomllib

text = """
[build-system]
requires = ["hatchling>=1.25"]
build-backend = "hatchling.build"

[project]
name = "fastprimes"
version = "1.2.0"
requires-python = ">=3.10"
dependencies = ["numpy>=1.26"]

[project.scripts]
fastprimes = "fastprimes.cli:main"
"""
cfg = tomllib.loads(text)
proj = cfg["project"]
print("backend:", cfg["build-system"]["build-backend"])
print(f"{proj['name']} {proj['version']} needs Python {proj['requires-python']}")
print("deps:", proj["dependencies"])
module, func = proj["scripts"]["fastprimes"].split(":")
print(f"console command 'fastprimes' -> import {module}; {func}()")
` }],
    viz: [{
      title: 'From pyproject.toml to an installed command',
      gen: function () {
        var nodes = [
          { id: 'src', label: 'src/ + pyproject', x: 8, y: 14, shape: 'box' },
          { id: 'fe', label: 'Frontend (uv build)', x: 30, y: 14, shape: 'box' },
          { id: 'iso', label: 'Isolated build env', x: 30, y: 46, shape: 'box' },
          { id: 'be', label: 'Backend (hatchling)', x: 54, y: 46, shape: 'box' },
          { id: 'sd', label: 'sdist .tar.gz', x: 54, y: 6, shape: 'box' },
          { id: 'wh', label: 'wheel .whl', x: 54, y: 24, shape: 'box' },
          { id: 'pypi', label: 'PyPI', x: 76, y: 14, shape: 'box' },
          { id: 'pip', label: 'pip / uv install', x: 94, y: 30, shape: 'box' },
          { id: 'site', label: 'site-packages + bin/fastprimes', x: 80, y: 54, shape: 'box' }
        ];
        var edges = [['src', 'fe', 'reads'], ['fe', 'iso', 'requires'], ['iso', 'be', 'calls'], ['be', 'sd'], ['be', 'wh'], ['sd', 'pypi', 'upload'], ['wh', 'pypi', 'upload'], ['pypi', 'pip', 'download'], ['pip', 'site', 'unzip']];
        var steps = [
          { hl: { src: 'cur' }, e: [], line: 1, n: 'Everything starts with <code>pyproject.toml</code>. The frontend first reads <code>[build-system]</code> to learn <b>which backend</b> to use.' },
          { hl: { src: 'done', fe: 'cur' }, e: ['src-fe'], line: 3, n: '<code>uv build</code> (or <code>python -m build</code>) is the <b>frontend</b>. It never builds anything itself — it orchestrates.' },
          { hl: { fe: 'done', iso: 'cur' }, e: ['src-fe', 'fe-iso'], line: 2, n: 'PEP 517/518: it creates a fresh, <b>isolated environment</b> and installs only <code>requires = ["hatchling&gt;=1.25"]</code>. Your random global packages cannot leak into the build.' },
          { hl: { iso: 'done', be: 'cur' }, e: ['src-fe', 'fe-iso', 'iso-be'], line: 5, n: 'The <b>backend</b> (hatchling) reads <code>[project]</code> metadata (PEP 621) and collects your source files.' },
          { hl: { be: 'done', sd: 'ok', wh: 'ok' }, e: ['src-fe', 'fe-iso', 'iso-be', 'be-sd', 'be-wh'], line: 7, n: 'Out come two artifacts: an <b>sdist</b> (source recipe) and a <b>wheel</b> named like <code>fastprimes-1.2.0-py3-none-any.whl</code> (pure Python → works everywhere).' },
          { hl: { sd: 'done', wh: 'done', pypi: 'cur' }, e: ['src-fe', 'fe-iso', 'iso-be', 'be-sd', 'be-wh', 'sd-pypi', 'wh-pypi'], line: 6, n: 'Upload both to <b>PyPI</b>. Best practice in 2026: CI publishes via <b>Trusted Publishing</b> (OIDC, no long-lived API token) with attestations.' },
          { hl: { pypi: 'done', pip: 'cur' }, e: ['src-fe', 'fe-iso', 'iso-be', 'be-sd', 'be-wh', 'sd-pypi', 'wh-pypi', 'pypi-pip'], line: 9, n: 'A user runs <code>uv pip install fastprimes</code>. The <b>resolver</b> picks versions satisfying every <code>dependencies</code> range (numpy&gt;=1.26) together, preferring a <b>wheel</b> matching their Python and platform.' },
          { hl: { pip: 'done', site: 'ok' }, e: ['src-fe', 'fe-iso', 'iso-be', 'be-sd', 'be-wh', 'sd-pypi', 'wh-pypi', 'pypi-pip', 'pip-site'], line: 15, n: 'Installing a wheel = unzip into <code>site-packages</code> + write metadata + generate a small launcher <code>bin/fastprimes</code> from <code>[project.scripts]</code>. Typing <code>fastprimes</code> now runs <code>fastprimes.cli:main()</code>.' }
        ];
        return steps.map(function (s) {
          var ehl = {}; s.e.forEach(function (k) { ehl[k] = 'ok'; });
          var hl = {}; hl[s.line] = 'cur';
          return fr(s.n, [
            { type: 'graph', label: 'build → publish → install', directed: true, height: 64, nodes: nodes, edges: edges, hl: s.hl, ehl: ehl },
            { type: 'code', label: 'pyproject.toml (line used now)', lang: 'text', code: PYPROJECT, hl: hl }
          ]);
        });
      }
    }, {
      title: 'Decode a wheel filename (compatibility tags)',
      input: 'numpy-2.1.3-cp312-cp312-manylinux_2_17_x86_64.whl',
      inputLabel: 'Wheel file name',
      gen: function (input) {
        var f = String(input || '').trim();
        if (!/\.whl$/.test(f)) throw new Error('Enter a wheel filename ending in .whl, e.g. pkg-1.0-py3-none-any.whl');
        var parts = f.slice(0, -4).split('-');
        if (parts.length !== 5 && parts.length !== 6) throw new Error('Expected name-version-[build-]python-abi-platform.whl');
        var name = parts[0], ver = parts[1], build = parts.length === 6 ? parts[2] : '', py = parts[parts.length - 3], abi = parts[parts.length - 2], plat = parts[parts.length - 1];
        var rows = [['distribution', name], ['version', ver], ['build tag', build || '(none)'], ['python tag', py], ['ABI tag', abi], ['platform tag', plat]];
        function pyMeaning(t) { return /^py3/.test(t) ? 'any Python 3 implementation (pure Python)' : /^cp3(\d+)/.test(t) ? 'CPython 3.' + t.replace(/^cp3/, '') + ' specifically' : /^pp/.test(t) ? 'PyPy' : 'implementation-specific tag'; }
        function abiMeaning(t) { return t === 'none' ? 'no compiled ABI dependency' : t === 'abi3' ? 'stable ABI: works on this and all later CPython versions' : /t$/.test(t) ? 'free-threaded (no-GIL) CPython build' : 'compiled against that exact CPython ABI'; }
        function platMeaning(t) { return t === 'any' ? 'any OS / CPU' : /^manylinux/.test(t) ? 'Linux with glibc ≥ ' + (t.match(/manylinux_(\d+)_(\d+)/) ? t.match(/manylinux_(\d+)_(\d+)/).slice(1).join('.') : 'baseline') + ' on ' + t.replace(/^manylinux(_\d+_\d+|\d+)_/, '') : /^musllinux/.test(t) ? 'Alpine-style musl Linux' : /^macosx/.test(t) ? 'macOS (' + t.replace(/^macosx_\d+_\d+_/, '') + ')' : /^win/.test(t) ? 'Windows (' + t + ')' : 'specific platform'; }
        var frames = [];
        frames.push(fr('A wheel name is a <b>compatibility contract</b>: <code>name-version(-build)-python-abi-platform.whl</code> (PEP 427 / PEP 425). Installers compare these tags with the running interpreter to pick a wheel.', [
          { type: 'table', label: 'parsed', columns: ['field', 'value'], rows: rows }
        ]));
        frames.push(fr('<b>Python tag</b> <code>' + esc(py) + '</code> → ' + pyMeaning(py) + '.', [
          { type: 'table', label: 'parsed', columns: ['field', 'value'], rows: rows, hl: { 3: 'cur' } }
        ]));
        frames.push(fr('<b>ABI tag</b> <code>' + esc(abi) + '</code> → ' + abiMeaning(abi) + '.', [
          { type: 'table', label: 'parsed', columns: ['field', 'value'], rows: rows, hl: { 4: 'cur' } }
        ]));
        frames.push(fr('<b>Platform tag</b> <code>' + esc(plat) + '</code> → ' + platMeaning(plat) + '.', [
          { type: 'table', label: 'parsed', columns: ['field', 'value'], rows: rows, hl: { 5: 'cur' } }
        ]));
        var pure = py.indexOf('py') === 0 && abi === 'none' && plat === 'any';
        frames.push(fr(pure ? '<span class="c-g">Pure-Python wheel</span>: one file serves every user. That is the simple case.' : '<span class="c-y">Binary wheel</span>: you must build one per (Python version × OS × CPU) combination — usually with <b>cibuildwheel</b> in CI — or users without a match fall back to the sdist and need a compiler. <code>abi3</code> wheels cut the Python-version axis.', [
          { type: 'table', label: 'parsed', columns: ['field', 'value'], rows: rows, hl: { 3: pure ? 'ok' : 'win', 4: pure ? 'ok' : 'win', 5: pure ? 'ok' : 'win' } },
          { type: 'vars', vals: { pure_python: pure ? 'yes' : 'no', needs_compiler_if_no_wheel: pure ? 'no' : 'yes' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Why the src/ layout?', html: R`<p>With a flat layout (<code>mypkg/</code> next to <code>tests/</code>), running tests from the repo root imports the <b>local folder</b>, not the installed package — so a missing file in the wheel goes unnoticed until users install it. With <code>src/mypkg/</code>, tests can only import the <b>installed</b> (or editable-installed) package, catching packaging bugs early.</p>` },
      { title: 'Entry points: turning a function into a command', html: R`<p><code>[project.scripts] fastprimes = "fastprimes.cli:main"</code> tells the installer to create an executable <code>fastprimes</code> that does <code>from fastprimes.cli import main; sys.exit(main())</code>. Plugins use the same mechanism with <code>[project.entry-points."myapp.plugins"]</code>, discovered at runtime via <code>importlib.metadata.entry_points</code>.</p>`, code: { lang: 'python', run: true, code: R`
import sys
from importlib import metadata

def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    n = int(argv[0]) if argv else 10
    print(f"primes up to {n}:", [p for p in range(2, n + 1) if all(p % d for d in range(2, int(p ** 0.5) + 1))])
    return 0

main(["30"])
try:
    print("pip version installed here:", metadata.version("pip"))
except metadata.PackageNotFoundError:
    print("pip is not installed in this environment")` } },
      { title: 'Single-file scripts with inline metadata (PEP 723)', html: R`<p>For one-off scripts, dependencies can live in a special comment block. <code>uv run script.py</code> (or pipx/hatch) reads it, creates a cached environment and runs the script — no project needed.</p>`, code: { lang: 'python', check: false, code: R`
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx>=0.27", "rich"]
# ///
import httpx
from rich import print
print(httpx.get("https://pypi.org/pypi/numpy/json").json()["info"]["version"])` } },
      { title: 'Version specifiers you must read fluently', html: R`${H.table(['specifier', 'means', 'example matches'], [['<code>&gt;=1.26</code>', 'at least 1.26', '1.26.0, 2.1.3'], ['<code>~=1.4.2</code>', 'compatible release: &gt;=1.4.2, ==1.4.*', '1.4.9, not 1.5.0'], ['<code>==2.*</code>', 'any 2.x', '2.0, 2.9.1'], ['<code>&gt;=1,&lt;2</code>', 'range', '1.0 … 1.99'], ['<code>!=1.5.1</code>', 'exclude a broken release', 'all except 1.5.1']])}<p>Pre-releases (<code>2.0.0rc1</code>) sort <b>before</b> the final <code>2.0.0</code> and are skipped by default unless requested.</p>` }
    ],
    deepDive: R`<p>🟣 <b>The standards stack:</b> PEP 517 (backend API: <code>build_wheel</code>, <code>build_sdist</code>), PEP 518 (<code>[build-system]</code>, isolated builds), PEP 621 (<code>[project]</code> metadata), PEP 660 (editable installs via the backend — <code>pip install -e .</code> no longer needs setup.py), PEP 440 (versions), PEP 508 (dependency specifiers with markers like <code>; sys_platform == "win32"</code>), PEP 427/425 (wheel format and tags), PEP 600/656 (manylinux/musllinux), PEP 639 (SPDX <code>license = "MIT"</code> + <code>license-files</code>), PEP 723 (inline script metadata), PEP 735 (dependency groups), PEP 751 (<code>pylock.toml</code> standard lock file, accepted 2025). <code>setup.py</code> still works as a setuptools config, but running <code>python setup.py install</code> directly is deprecated.</p>
<p><b>Native packages:</b> wheels for C/C++/Rust must be built on each target: <b>cibuildwheel</b> runs builds in manylinux containers, macOS (x86_64 + arm64 / universal2) and Windows runners, then <code>auditwheel</code>/<code>delocate</code> vendor shared libraries. Using the stable ABI (<code>abi3</code>, <code>Py_LIMITED_API</code>) means one wheel per platform instead of one per Python version; free-threaded CPython needs separate <code>cp313t</code>/<code>cp314t</code> wheels.</p>
<p><b>Supply-chain reality:</b> typosquatting and malicious packages are common on PyPI; pin with hashes in apps (<code>uv lock</code>, <code>pip install --require-hashes</code>), use Trusted Publishing and PEP 740 attestations, scan with <code>pip-audit</code>, and never run <code>sudo pip install</code> into the system Python (PEP 668 "externally managed" environments now block it on most Linux distros).</p>`,
    aiEra: R`<p><b>What AI changes:</b> generating a correct <code>pyproject.toml</code>, a GitHub Actions workflow with cibuildwheel and Trusted Publishing, or migrating from <code>setup.py</code> is now a five-minute job with an assistant. <b>Use AI as a partner:</b> <i>"Convert this setup.py to PEP 621 pyproject.toml with hatchling, keep the same entry points and package data, and list anything that cannot be expressed declaratively"</i>. <b>Where AI goes wrong:</b> it invents package names (attackers register these "slopsquatted" names on PyPI!), mixes Poetry's old <code>[tool.poetry]</code> syntax with PEP 621, pins exact versions inside a <i>library's</i> dependencies, and forgets <code>requires-python</code> or package data. <b>What you must still own:</b> verifying every dependency exists and is the real project, the library-vs-application pinning policy, and testing the built wheel in a clean environment before publishing.</p>`,
    problems: [{
      title: 'Compare Package Versions Correctly (PEP 440 subset)',
      level: 'Medium', tags: ['parsing', 'tuples', 'packaging'], companies: ['GitHub', 'JetBrains', 'Anaconda'],
      statement: R`<p>A deployment script picks the newest release from a list of version strings and the build broke because it chose <code>1.9.2</code> over <code>1.10.0</code>. Write <code>version_key(v)</code> so that <code>max(versions, key=version_key)</code> is correct for versions of the form <code>N(.N)*</code> optionally followed by a pre-release <code>aN</code>, <code>bN</code> or <code>rcN</code>.</p>`,
      constraints: R`Up to 10<sup>5</sup> versions; release parts are non-negative ints; <code>1.0 == 1.0.0</code>; pre-releases sort before the final release (<code>2.0a1 &lt; 2.0b2 &lt; 2.0rc1 &lt; 2.0</code>). Invalid strings must raise <code>ValueError</code>.`,
      example: R`<p><code>["1.9.2", "1.10.0", "1.10.0rc1", "1.2"]</code> → newest is <code>${H.c('g', '1.10.0')}</code>. String comparison says "1.9.2" &gt; "1.10.0" because the character '9' &gt; '1'.</p>`,
      brute: { why: R`<p>Comparing version strings with <code>&lt;</code>/<code>max</code> compares <b>characters</b>, not numbers: "1.10" &lt; "1.9" and "2.0rc1" &gt; "2.0". Splitting on "." and converting to ints fixes the first bug but crashes on "rc1" and treats "1.0" ≠ "1.0.0".</p>`, code: { lang: 'python', run: true, code: R`
versions = ["1.9.2", "1.10.0", "1.10.0rc1", "1.2"]
print(max(versions))                     # '1.9.2'  <- wrong: character comparison
print(sorted(["2.0", "2.0rc1"]))         # ['2.0', '2.0rc1'] <- rc wrongly after final` } },
      mcq: { q: 'Which Python feature makes the comparison easy once versions are parsed?', options: ['Tuples compare element by element, left to right (lexicographically)', 'Strings compare by length first', 'Dicts are ordered', 'Sets remove duplicates'], answer: 0, explain: '(1, 10) > (1, 9) because 10 > 9 in the first differing position. Encode the pre-release as a trailing tuple element that sorts below the final release.' },
      hints: [R`<p>Hint 1: turn each version into a <b>tuple of ints</b>; Python compares tuples position by position — exactly the version rule.</p>`, R`<p>Hint 2: strip trailing zeros so <code>1.0</code> and <code>1.0.0</code> give the same release tuple. Encode the phase as a number: a = 0, b = 1, rc = 2, final = 3, so finals sort after pre-releases.</p>`, R`<p>Hint 3: recipe — regex <code>^(\d+(?:\.\d+)*)(?:(a|b|rc)(\d+))?$</code>; release = ints with trailing zeros removed; key = (release, (phase, n)). Raise ValueError when the regex fails. In real projects just use <code>packaging.version.Version</code>.</p>`],
      solution: {
        approach: R`<p>Parse once into a sortable key: <code>(release_tuple, (phase, number))</code>. Tuple comparison then does all the work: release numbers compare numerically, and the phase number puts a/b/rc before the final release. Production code should use <code>packaging.version.Version</code>, which implements all of PEP 440 (epochs, post, dev, local versions).</p>`,
        code: { lang: 'python', run: true, code: R`
import re

_PHASE = {"a": 0, "b": 1, "rc": 2}
_RX = re.compile(r"^(\d+(?:\.\d+)*)(?:(a|b|rc)(\d+))?$")

def version_key(v):
    m = _RX.match(v.strip())
    if not m:
        raise ValueError(f"unsupported version: {v!r}")
    release = [int(x) for x in m.group(1).split(".")]
    while len(release) > 1 and release[-1] == 0:   # 1.0.0 == 1.0 == 1
        release.pop()
    phase = (_PHASE[m.group(2)], int(m.group(3))) if m.group(2) else (3, 0)
    return (tuple(release), phase)

versions = ["1.9.2", "1.10.0", "1.10.0rc1", "1.2"]
print(max(versions, key=version_key))                       # 1.10.0
print(sorted(["2.0", "2.0rc1", "2.0a1", "2.0b2"], key=version_key))
print(version_key("1.0") == version_key("1.0.0"))           # True
try:
    version_key("latest")
except ValueError as e:
    print(e)
` },
        dry: { head: ['version', 'release tuple', 'phase', 'key'], rows: [
          ['1.9.2', '(1, 9, 2)', 'final', '((1,9,2), (3,0))'],
          ['1.10.0', '(1, 10)', 'final', '<span class="c-g">((1,10), (3,0))</span>'],
          ['1.10.0rc1', '(1, 10)', 'rc1', '((1,10), (2,1))'],
          ['1.2', '(1, 2)', 'final', '((1,2), (3,0))'],
          ['max', '(1,10) beats (1,9,2); (3,0) beats (2,1)', '', '<span class="c-g">1.10.0</span>']
        ] },
        complexity: R`<p>O(L) per version to parse (L = string length); sorting n versions O(n log n) comparisons on short tuples. Keys are computed once each thanks to <code>key=</code>.</p>`,
        followUps: ['Implement <code>satisfies(version, "&gt;=1.4,&lt;2,!=1.5.1")</code>', 'Add post-releases (1.0.post1) and dev releases (1.0.dev3)', 'Why does pip skip pre-releases by default?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7: Mutable default arguments & shared-object gotchas
     ====================================================================== */
  topics.push({
    title: 'Mutable Default Arguments, Aliasing & Late Binding: "When Is This Evaluated?"',
    analogy: R`<p>A café puts <b>one shared notebook</b> on the counter labelled "your order notes". The first customer writes "no sugar". The second customer, expecting a blank page, gets a notebook that already says "no sugar". That is a <b>mutable default argument</b>: Python creates the default <b>once</b>, when the function is defined, and every call that does not pass its own notebook writes into the <i>same</i> one. The fix is the café handing out a <b>fresh sheet</b> for each order (<code>None</code> → new list inside the function).</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> In Python, variables are <b>name tags</b> stuck on objects; assignment never copies. Most "gotchas" come from one question: <b>when is this expression evaluated, and how many objects exist?</b></p>
<ol>
<li><b>Default arguments are evaluated ONCE</b>, when <code>def</code> runs, and stored on the function object in <code>f.__defaults__</code>. A mutable default (<code>[]</code>, <code>{}</code>, <code>set()</code>, a <code>datetime.now()</code> timestamp) is therefore shared by every call.</li>
<li><b>Closures look names up LATE</b>, when the inner function runs — so lambdas created in a loop all see the loop variable's <i>final</i> value.</li>
<li><b>Multiplying a list copies references, not objects</b>: <code>[[0] * 3] * 3</code> is three tags on <b>one</b> inner list.</li>
</ol>
${H.table(['buggy', 'what happens', 'fix'], [
  ['<code>def add(x, items=[])</code>', 'all calls share one list', '<code>items=None</code> then <code>if items is None: items = []</code>'],
  ['<code>def log(msg, at=datetime.now())</code>', 'timestamp frozen at import time', '<code>at=None</code> → <code>at = at or datetime.now()</code>'],
  ['<code>class Team: members = []</code>', 'class attribute shared by all instances', 'create it in <code>__init__</code>'],
  ['<code>grid = [[0] * 3] * 3</code>', 'rows are the same object', '<code>[[0] * 3 for _ in range(3)]</code>'],
  ['<code>[lambda: i for i in range(3)]</code>', 'all return 2', '<code>lambda i=i: i</code> (default captures now)'],
  ['<code>a = b = []</code>', 'one list, two names', 'two separate <code>[]</code> literals']
])}
<p>🔵 <b>Why does Python do this?</b> <code>def</code> is an ordinary statement executed at runtime; evaluating defaults once is fast and predictable, and it is occasionally useful (a deliberate cache: <code>def f(n, _memo={})</code>). Linters flag the accident: ruff rule <b>B006</b> (mutable default) and <b>B008</b> (function call in default), and <code>@dataclass</code> refuses a list default outright (<code>ValueError: mutable default</code>), pushing you to <code>field(default_factory=list)</code>.</p>`,
    clues: [
      '"Function remembers values from previous calls" → mutable default argument',
      '"Every object of my class shares the same list" → class attribute instead of instance attribute',
      '"Changing one row of my 2-D grid changed all rows" → <code>[[x] * n] * m</code> aliasing',
      '"All my callbacks / lambdas use the last value" → late-binding closure in a loop',
      '"Timestamp is the same for every log line" → <code>datetime.now()</code> evaluated at def time',
      '"Predict the output" with <code>def f(a=[])</code> called twice → answer shows accumulation'
    ],
    code: [{ lang: 'python', run: true, title: 'See the shared default object with your own eyes', code: R`
def add_item(x, items=[]):           # [] is created ONCE, at def time
    items.append(x)
    return items

print(add_item.__defaults__)         # ([],)  <- the default lives on the function
a = add_item(1)
b = add_item(2)
print(a, b, a is b)                  # [1, 2] [1, 2] True   <- same list!
print(add_item.__defaults__)         # ([1, 2],)
print(add_item(3, []))               # [3]  (caller passed its own list)
print(add_item(4))                   # [1, 2, 4]

def add_item_fixed(x, items=None):   # sentinel: immutable, unique
    if items is None:
        items = []                   # a NEW list on every call
    items.append(x)
    return items

print(add_item_fixed(1), add_item_fixed(2))   # [1] [2]
` }, { lang: 'python', run: true, title: 'Frozen timestamps, class attributes and dataclasses', code: R`
import time
from dataclasses import dataclass, field
from datetime import datetime

def stamp(msg, at=datetime.now()):            # evaluated once, at import
    return f"{at:%H:%M:%S.%f} {msg}"

first = stamp("a"); time.sleep(0.01); second = stamp("b")
print(first[:15] == second[:15], "<- same timestamp both times")

class Team:
    members = []                              # ONE list on the class
    def join(self, name):
        self.members.append(name)             # mutates the shared class list

t1, t2 = Team(), Team()
t1.join("asha")
print(t2.members)                             # ['asha']  <- surprise

@dataclass
class Cart:
    items: list = field(default_factory=list) # a new list per instance

c1, c2 = Cart(), Cart()
c1.items.append("apple")
print(c1.items, c2.items)                     # ['apple'] []

try:
    @dataclass
    class Bad:
        items: list = []                      # dataclass refuses this
except ValueError as e:
    print("ValueError:", e)
` }],
    viz: [{
      title: 'Mutable default argument: one list object shared by every call',
      input: '1 2 3',
      inputLabel: 'Values passed to add_item(x) on successive calls',
      gen: function (input) {
        var xs = words(input);
        if (!xs.length || xs.length > 6) throw new Error('Enter 1–6 values, e.g. 1 2 3');
        var frames = [], shared = [];
        var code = 'def add_item(x, items=[]):\n    items.append(x)\n    return items\n\nadd_item(...)';
        function g(listLabel, calls, hl, ehl, tags) {
          var nodes = [{ id: 'f', label: 'function add_item', x: 14, y: 12, shape: 'box' }, { id: 'D', label: '__defaults__ tuple', x: 14, y: 40, shape: 'box' }, { id: 'L', label: listLabel, x: 62, y: 40, shape: 'box' }];
          var edges = [['f', 'D'], ['D', 'L', 'slot 0']];
          calls.forEach(function (c, i) { nodes.push({ id: 'c' + i, label: 'call ' + (i + 1) + ': items', x: 50 + i * 0 + (i % 3) * 18, y: 6 + Math.floor(i / 3) * 12, shape: 'box' }); edges.push(['c' + i, 'L']); });
          return { type: 'graph', label: 'objects and name tags', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        frames.push(fr('<code>def</code> runs <b>once</b> at import time. Python evaluates <code>[]</code> right now and stores that single list object in <code>add_item.__defaults__</code>.', [
          g('list []', [], { L: 'cur' }, { 'D-L': 'ok' }, { L: 'created at def' }),
          { type: 'code', label: 'source', lang: 'python', code: code, hl: { 1: 'cur' } }
        ]));
        var calls = [];
        xs.forEach(function (x, i) {
          calls.push(i);
          frames.push(fr('Call ' + (i + 1) + ': <code>add_item(' + esc(x) + ')</code> passes no list, so the local name <code>items</code> is bound to the <b>default object</b> — the same one as before' + (i ? ' (already holding ' + pyList(shared) + ')' : '') + '.', [
            g('list ' + pyList(shared), calls.slice(), { L: 'cur' }, (function () { var e = {}; e['c' + i + '-L'] = 'ok'; return e; })(), {}),
            { type: 'code', label: 'source', lang: 'python', code: code, hl: { 1: 'cur' } }
          ]));
          shared.push(isNaN(Number(x)) ? x : Number(x));
          frames.push(fr('<code>items.append(' + esc(x) + ')</code> mutates that shared object. Returned value: <b>' + esc(pyList(shared)) + '</b>' + (i ? ' — <span class="c-r">it still contains the values from earlier calls!</span>' : '. Looks fine… so far.'), [
            g('list ' + pyList(shared), calls.slice(), { L: i ? 'bad' : 'ok' }, (function () { var e = {}; e['c' + i + '-L'] = 'ok'; return e; })(), {}),
            { type: 'code', label: 'source', lang: 'python', code: code, hl: { 2: 'cur', 3: 'ok' } },
            { type: 'vars', label: 'state', vals: { 'add_item.__defaults__': '(' + pyList(shared) + ',)', calls_made: i + 1 }, hl: { 'add_item.__defaults__': 'bad' } }
          ]));
        });
        var fixed = 'def add_item(x, items=None):\n    if items is None:\n        items = []\n    items.append(x)\n    return items';
        var nodes = [{ id: 'f', label: 'function add_item', x: 14, y: 12, shape: 'box' }, { id: 'D', label: '__defaults__ (None,)', x: 14, y: 40, shape: 'box' }], edges = [['f', 'D']];
        xs.forEach(function (x, i) { nodes.push({ id: 'n' + i, label: 'new list [' + esc(x) + ']', x: 46 + (i % 3) * 20, y: 10 + Math.floor(i / 3) * 26 + 14, shape: 'box' }); });
        frames.push(fr('<b>The fix:</b> default to <code>None</code> (immutable) and build a <b>new</b> list inside the body. Each call now gets its own list: ' + xs.map(function (x) { return '[' + esc(x) + ']'; }).join(', ') + '. Nothing leaks between calls.', [
          { type: 'graph', label: 'fixed version: one fresh list per call', directed: true, height: 60, nodes: nodes, edges: edges, hl: (function () { var h = { D: 'ok' }; xs.forEach(function (_, i) { h['n' + i] = 'ok'; }); return h; })() },
          { type: 'code', label: 'fixed source', lang: 'python', code: fixed, hl: { 2: 'ok', 3: 'ok' } }
        ]));
        return frames;
      }
    }, {
      title: 'grid = [[0]*3]*3 — three tags on ONE row',
      input: '1 2 5',
      inputLabel: 'row col value for grid[row][col] = value (0–2)',
      gen: function (input) {
        var a = nums(input, 3, 'Enter row col value, e.g. 1 2 5');
        if (a.length !== 3 || a[0] < 0 || a[0] > 2 || a[1] < 0 || a[1] > 2) throw new Error('Use row and col between 0 and 2, e.g. 1 2 5');
        var r = a[0], c = a[1], v = a[2], frames = [];
        var row = [0, 0, 0];
        function outer(label, rowsDistinct, hl) {
          var nodes = [{ id: 'g', label: 'grid (outer list)', x: 14, y: 30, shape: 'box' }], edges = [];
          if (rowsDistinct) {
            for (var i = 0; i < 3; i++) { nodes.push({ id: 'r' + i, label: 'row object #' + i, x: 70, y: 8 + i * 22, shape: 'box' }); edges.push(['g', 'r' + i, '[' + i + ']']); }
          } else {
            nodes.push({ id: 'R', label: 'ONE row object', x: 70, y: 30, shape: 'box' });
            for (var j = 0; j < 3; j++) edges.push(['g', 'R', '[' + j + ']']);
          }
          return { type: 'graph', label: label, directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {} };
        }
        frames.push(fr('<code>[0] * 3</code> builds one row <code>[0, 0, 0]</code>. Then <code>* 3</code> on the outer list copies the <b>reference</b> three times — not the row. The grid has three slots pointing at the same object.', [
          outer('[[0]*3]*3 in memory', false, { R: 'bad' }),
          { type: 'code', label: 'code', lang: 'python', code: 'grid = [[0] * 3] * 3\nprint(grid[0] is grid[1])   # True', hl: { 1: 'cur', 2: 'bad' } }
        ]));
        frames.push(fr('It <i>prints</i> like a normal 3×3 grid, so the bug hides until the first write.', [
          { type: 'grid', label: 'print(grid)', rows: [row.slice(), row.slice(), row.slice()], rowHead: ['0', '1', '2'], colHead: ['0', '1', '2'] }
        ]));
        row[c] = v;
        var hl = {}; for (var i = 0; i < 3; i++) hl[i + ',' + c] = i === r ? 'cur' : 'bad';
        frames.push(fr('<code>grid[' + r + '][' + c + '] = ' + v + '</code> writes into the shared row object, so <b>every</b> "row" shows ' + v + ' in column ' + c + '. <span class="c-r">Classic interview trap.</span>', [
          { type: 'grid', label: 'print(grid) after one assignment', rows: [row.slice(), row.slice(), row.slice()], rowHead: ['0', '1', '2'], colHead: ['0', '1', '2'], hl: hl }
        ]));
        var good = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; good[r][c] = v;
        var hl2 = {}; hl2[r + ',' + c] = 'ok';
        frames.push(fr('Fix: a comprehension runs <code>[0] * 3</code> <b>once per row</b>, creating three distinct row objects. Now only cell (' + r + ', ' + c + ') changes.', [
          outer('[[0]*3 for _ in range(3)] in memory', true, { r0: 'ok', r1: 'ok', r2: 'ok' }),
          { type: 'grid', label: 'print(grid) — fixed', rows: good, rowHead: ['0', '1', '2'], colHead: ['0', '1', '2'], hl: hl2 }
        ]));
        frames.push(fr('Why is <code>[0] * 3</code> itself safe? Because ints are <b>immutable</b>: <code>row[1] = 5</code> rebinds slot 1 to a different int object; it cannot change the shared 0. Sharing only bites when the shared object is <b>mutable</b> (lists, dicts, sets, custom objects).', [
          { type: 'code', label: 'rule of thumb', lang: 'python', code: 'safe   = [0] * 3                      # immutable items: fine\nsafe2  = [None] * n                   # fine\nbad    = [[]] * 3                     # mutable items: shared!\ngood   = [[] for _ in range(3)]       # one new list each', hl: { 3: 'bad', 4: 'ok' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Late-binding closures in a loop', html: R`<p>A closure stores a reference to the <b>variable</b>, not its value. All three lambdas look up <code>i</code> when they are <b>called</b>, after the loop finished at 2. Capture the current value with a default argument (evaluated at definition time — the same rule that causes the mutable-default bug, used for good!) or <code>functools.partial</code>.</p>`, code: { lang: 'python', run: true, code: R`
from functools import partial

fns = [lambda: i for i in range(3)]
print([f() for f in fns])                # [2, 2, 2]

fns = [lambda i=i: i for i in range(3)]  # default captures the value NOW
print([f() for f in fns])                # [0, 1, 2]

def show(i):
    return i
fns = [partial(show, i) for i in range(3)]
print([f() for f in fns])                # [0, 1, 2]` } },
      { title: '+= on a list parameter vs = rebinding', html: R`<p><code>lst += [x]</code> calls <code>list.__iadd__</code>, which <b>mutates in place</b>, so the caller sees the change. <code>lst = lst + [x]</code> builds a <b>new</b> list and rebinds only the local name — the caller sees nothing.</p>`, code: { lang: 'python', run: true, code: R`
def extend_in_place(lst):
    lst += [99]          # mutates the caller's list

def rebind(lst):
    lst = lst + [99]     # new list, local name only

a = [1]; extend_in_place(a); print(a)   # [1, 99]
b = [1]; rebind(b); print(b)            # [1]` } },
      { title: 'A deliberate use: memo dict as a default', html: R`<p>Sometimes old code uses the shared default on purpose as a cache. It works, but it is invisible and untestable — <code>functools.cache</code> says the same thing explicitly and offers <code>cache_clear()</code>.</p>`, code: { lang: 'python', run: true, code: R`
def fib(n, _memo={0: 0, 1: 1}):      # shared on purpose (still: prefer @cache)
    if n not in _memo:
        _memo[n] = fib(n - 1) + fib(n - 2)
    return _memo[n]
print(fib(80), len(fib.__defaults__[0]), "cached entries")` } },
      { title: 'Copying: shallow copy shares the inner objects', html: R`<p><code>list(x)</code>, <code>x[:]</code>, <code>x.copy()</code> and <code>copy.copy</code> copy only the outer container. Nested lists are still shared. <code>copy.deepcopy</code> recursively copies (and handles cycles via a memo).</p>`, code: { lang: 'python', run: true, code: R`
import copy
orig = [[1, 2], [3]]
shallow = orig.copy()
deep = copy.deepcopy(orig)
orig[0].append(99)
print(shallow[0], deep[0])        # [1, 2, 99] [1, 2]` } }
    ],
    deepDive: R`<p>🟣 <b>Where defaults live.</b> Positional defaults are stored in <code>func.__defaults__</code> (a tuple) and keyword-only defaults in <code>func.__kwdefaults__</code> (a dict). When a call omits an argument, the interpreter copies the <b>reference</b> from that tuple into the new frame's local slot — no copy of the object. You can even reassign <code>f.__defaults__ = ([],)</code> at runtime. <b>Sentinel choice:</b> <code>None</code> is the convention; when <code>None</code> is a legitimate value, use a private sentinel <code>_MISSING = object()</code> and test <code>is _MISSING</code>.</p>
<p><b>Closures:</b> captured variables live in <b>cell objects</b> (<code>f.__closure__[0].cell_contents</code>); the loop updates the one cell, so every lambda sees the last value. Comprehensions get their own scope for the loop variable (no leaking into the enclosing function since Python 3), and since 3.12 they are inlined (PEP 709) but keep the same visible semantics. <b>Class bodies</b> are executed once at class creation, which is why class-level lists are shared; dataclasses detect the common unhashable mutable types (<code>list</code>, <code>dict</code>, <code>set</code>) — since 3.11 they reject any default whose type is unhashable.</p>
<p><b>Production stories:</b> request handlers with <code>def handler(req, headers={})</code> leaking one user's headers into another user's response; <code>def connect(timeout=config.get("timeout"))</code> reading config at import time before it is loaded; and Flask/Django settings frozen at import. Code review checklist: no mutable or call-expression defaults, no class-level mutable state unless it is truly shared (and then guarded for thread safety).</p>`,
    aiEra: R`<p><b>What AI changes:</b> linters (ruff B006/B008/B023 for loop-variable closures) and AI reviewers catch these patterns instantly, so the bug is rarer in new code — but interviewers still ask it because it reveals whether you understand names vs objects. <b>Use AI as a partner:</b> <i>"Find every place in this module where an object might be shared between calls, instances or threads unintentionally"</i>. <b>Where AI goes wrong:</b> assistants sometimes <i>generate</i> <code>def f(x, cache={})</code> or <code>datetime.now()</code> defaults in quick scripts, "fix" the closure bug with the wrong variable, or replace <code>is None</code> checks with <code>or []</code> — which silently replaces a caller's intentionally empty list with a new one. <b>What you must still own:</b> the mental model of evaluation time (def time vs call time vs closure call time) and the ability to draw the object graph on a whiteboard.</p>`,
    problems: [{
      title: 'Fix the Leaking Shopping Cart',
      level: 'Easy', tags: ['mutable default', 'gotcha', 'debugging'], companies: ['Amazon', 'Flipkart', 'Instacart'],
      statement: R`<p>Users report seeing other people's items in their cart. Predict what the code prints, explain why, then fix <code>Cart</code> so each cart is independent while keeping the optional <code>items</code> argument.</p>`,
      constraints: R`Keep the constructor signature <code>Cart(owner, items=?)</code>; a caller-supplied list must still be used (not copied silently) unless you justify copying.`,
      example: R`<p>Buggy: <code>a = Cart("asha"); a.add("milk"); b = Cart("ben"); print(b.items)</code> prints <code>${H.c('r', "['milk']")}</code>. Fixed: <code>${H.c('g', '[]')}</code>, because Ben's cart now gets its own new list.</p>`,
      brute: { why: R`<p><code>items=[]</code> is evaluated once when <code>__init__</code> is defined. Every cart created without an explicit list stores a reference to <b>that one list</b>, so all default carts share contents. Restarting the server "fixes" it until the next order — a nasty intermittent bug.</p>`, code: { lang: 'python', run: true, code: R`
class Cart:
    def __init__(self, owner, items=[]):     # one list for every default cart
        self.owner = owner
        self.items = items
    def add(self, item):
        self.items.append(item)

a = Cart("asha"); a.add("milk")
b = Cart("ben")
print(b.items, a.items is b.items)          # ['milk'] True` } },
      mcq: { q: 'When is the <code>[]</code> in <code>def __init__(self, owner, items=[])</code> evaluated?', options: ['Once, when the def statement runs (class creation)', 'Every time Cart(...) is called', 'Every time items is accessed', 'Only when items is empty'], answer: 0, explain: 'Default values are evaluated once at function definition time and stored in __init__.__defaults__.' },
      hints: [R`<p>Hint 1: print <code>Cart.__init__.__defaults__</code> after adding milk — the "default" now contains milk.</p>`, R`<p>Hint 2: use <code>None</code> as the default and create a new list inside the body when the argument is missing.</p>`, R`<p>Hint 3: recipe — <code>def __init__(self, owner, items=None): self.items = [] if items is None else items</code>. Do <b>not</b> write <code>items or []</code>: it would replace a caller's deliberately empty list with a different object. Consider <code>list(items)</code> if the cart should own a private copy.</p>`],
      solution: {
        approach: R`<p>Default to the immutable sentinel <code>None</code> and allocate a fresh list per call. If the class should not share the caller's list either (defensive copy), store <code>list(items)</code>. A dataclass version uses <code>field(default_factory=list)</code>.</p>`,
        code: { lang: 'python', run: true, code: R`
from dataclasses import dataclass, field

class Cart:
    def __init__(self, owner, items=None):
        self.owner = owner
        self.items = [] if items is None else items   # new list per default cart
    def add(self, item):
        self.items.append(item)

a = Cart("asha"); a.add("milk")
b = Cart("ben")
print(b.items, a.items is b.items)          # [] False

@dataclass
class DCart:
    owner: str
    items: list = field(default_factory=list)

x, y = DCart("x"), DCart("y")
x.items.append("tea")
print(x.items, y.items)                     # ['tea'] []
` },
        dry: { head: ['step', 'buggy: a.items', 'buggy: b.items', 'fixed: a.items', 'fixed: b.items'], rows: [
          ['Cart("asha")', 'L (shared default)', '—', 'new list A', '—'],
          ['a.add("milk")', "L = ['milk']", '—', "A = ['milk']", '—'],
          ['Cart("ben")', "L = ['milk']", '<span class="c-r">L = [\'milk\']</span>', "A = ['milk']", '<span class="c-g">new list B = []</span>']
        ] },
        complexity: R`<p>O(1) per construction either way; the fix costs one small allocation per cart. The bug itself is about correctness, not speed.</p>`,
        followUps: ['Why does ruff flag <code>items=[]</code> (B006) but not <code>items=()</code>?', 'How would you write the same fix when <code>None</code> is a valid value for the parameter?', 'Find the same bug in a class attribute: <code>class Cart: items = []</code>']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8: Output-prediction gotchas bank
     ====================================================================== */
  var PUZZLES = {
    '1': { title: 'return inside finally', code: 'def f():\n    try:\n        return "try"\n    finally:\n        return "finally"\n\nprint(f())', steps: [
      [7, 'Call <code>f()</code>.', {}],
      [3, '<code>return "try"</code> evaluates the value and <b>schedules</b> a return… but a <code>finally</code> block must run before the function can leave.', { pending_return: '"try"' }],
      [5, 'The <code>finally</code> block runs and executes its own <code>return "finally"</code>. A return in finally <b>replaces</b> the pending one (it would even swallow an exception!).', { pending_return: '"finally"' }],
      [7, 'Output: <b>finally</b>. Python 3.14 now emits a <code>SyntaxWarning</code> for return/break/continue in finally (PEP 765) because it hides bugs.', { output: 'finally' }]
    ] },
    '2': { title: 'UnboundLocalError', code: 'x = 10\ndef g():\n    print(x)\n    x = 5\n\ng()', steps: [
      [1, 'Global <code>x = 10</code>.', { 'global x': 10 }],
      [2, 'Compiling <code>g</code>: the compiler sees an <b>assignment</b> <code>x = 5</code> anywhere in the body, so <code>x</code> is a <b>local</b> name for the <i>whole</i> function (decided at compile time, not line by line).', { 'global x': 10, 'g locals': 'x (unassigned)' }],
      [6, 'Call <code>g()</code>.', { 'global x': 10, 'g locals': 'x (unassigned)' }],
      [3, '<code>print(x)</code> reads local <code>x</code>, which has no value yet → <span class="c-r">UnboundLocalError: cannot access local variable \'x\' where it is not associated with a value</span>. Fix: <code>global x</code> (or better, pass it as a parameter).', { error: 'UnboundLocalError' }]
    ] },
    '3': { title: 'tuple item += list', code: 't = (1, [2])\ntry:\n    t[1] += [3]\nexcept TypeError:\n    print("TypeError")\nprint(t)', steps: [
      [1, 'A tuple holding an int and a list. The tuple is immutable; the list inside is not.', { t: '(1, [2])' }],
      [3, '<code>t[1] += [3]</code> is really two steps: (1) <code>tmp = t[1].__iadd__([3])</code> — list extends <b>in place</b> → the list is now [2, 3]…', { t: '(1, [2, 3])', tmp: '[2, 3]' }],
      [3, '…(2) <code>t[1] = tmp</code> — item assignment on a tuple → <span class="c-r">TypeError</span>. But step 1 already happened!', { t: '(1, [2, 3])', error: 'TypeError' }],
      [5, 'The except branch prints <b>TypeError</b>.', { output: 'TypeError' }],
      [6, 'Then <code>print(t)</code> → <b>(1, [2, 3])</b>. It raised an error <i>and</i> changed the data. (A famous Python FAQ entry.)', { output: 'TypeError\n(1, [2, 3])' }]
    ] },
    '4': { title: 'True, 1 and 1.0 as dict keys', code: 'd = {True: "a", 1: "b", 1.0: "c"}\nprint(d)', steps: [
      [1, 'Insert <code>True: "a"</code>. New key.', { d: '{True: "a"}' }],
      [1, 'Insert <code>1: "b"</code>. But <code>1 == True</code> and <code>hash(1) == hash(True)</code>, so it is the <b>same key</b>: the value is overwritten, the <b>original key object True is kept</b>.', { d: '{True: "b"}' }],
      [1, 'Insert <code>1.0: "c"</code>. <code>1.0 == 1</code> and equal hashes again → same key, value overwritten.', { d: '{True: "c"}' }],
      [2, 'Output: <b>{True: \'c\'}</b>. One key, the first key object, the last value.', { output: "{True: 'c'}" }]
    ] },
    '5': { title: 'generator expression late binding', code: 'arr = [1, 8, 15]\ng = (x for x in arr if arr.count(x) > 0)\narr = [2, 8, 22]\nprint(list(g))', steps: [
      [1, '<code>arr</code> names the list [1, 8, 15].', { arr: '[1, 8, 15]' }],
      [2, 'Creating a generator evaluates <b>only the first iterable immediately</b> (<code>for x in arr</code> grabs the [1, 8, 15] object now). The <code>if</code> condition is evaluated <b>lazily</b>, later.', { arr: '[1, 8, 15]', 'g iterates': '[1, 8, 15]' }],
      [3, '<code>arr</code> is rebound to a new list [2, 8, 22]. The generator still iterates the <i>old</i> list, but its condition will look up the name <code>arr</code> → the <i>new</i> list.', { arr: '[2, 8, 22]', 'g iterates': '[1, 8, 15]' }],
      [4, 'x=1: [2,8,22].count(1)=0 → skip. x=8: count=1 → keep. x=15: count=0 → skip. Output: <b>[8]</b>.', { output: '[8]' }]
    ] }
  };
  topics.push({
    title: 'The Gotchas Bank: Predict-the-Output Questions and How to Crack Them',
    analogy: R`<p>A magician's trick looks impossible until someone shows you <b>where the coin really went</b>. Python "predict the output" questions are magic tricks built from a handful of rules: names are tags, defaults are evaluated once, closures look up late, <code>+=</code> may mutate, scope is decided at compile time, <code>finally</code> always runs. Learn the dozen rules and every trick becomes "oh, the coin went up the sleeve".</p>`,
    explain: R`<p>🟢 <b>A 5-step method for any output question</b> (say it out loud in the interview):</p>
<ol>
<li><b>Draw names → objects.</b> Which names share an object? Is it mutable?</li>
<li><b>Ask "when is it evaluated?"</b> def time (defaults, decorators, class bodies), call time (body), or later (closures, generator conditions).</li>
<li><b>Decide scope at compile time.</b> Any assignment to a name in a function makes it local everywhere in that function (unless <code>global</code>/<code>nonlocal</code>).</li>
<li><b>Expand sugar.</b> <code>a += b</code> → <code>a = a.__iadd__(b)</code>; <code>a &lt; b &lt; c</code> → <code>a &lt; b and b &lt; c</code>; <code>x[i] = v</code> → <code>x.__setitem__(i, v)</code>; for-loops → iterator + <code>next()</code>.</li>
<li><b>Remember the special cases:</b> <code>bool</code> is a subclass of <code>int</code>; floats are binary (<code>0.1 + 0.2 != 0.3</code>); <code>round</code> uses banker's rounding; <code>//</code> and <code>%</code> floor toward −∞; <code>is</code> checks identity not value; <code>finally</code> runs even after <code>return</code>.</li>
</ol>
${H.table(['family', 'tell-tale sign', 'typical answer'], [
  ['shared mutable', '<code>=[]</code> default, <code>[[ ]]*n</code>, <code>a = b</code>', 'changes show up in "other" variables'],
  ['late binding', 'lambda/closure/genexpr created in a loop', 'last value everywhere'],
  ['scope', 'assignment after use inside a function', '<code>UnboundLocalError</code>'],
  ['numbers', 'floats, <code>round</code>, <code>//</code> with negatives, <code>True + 1</code>', 'surprising but defined'],
  ['identity', '<code>is</code> on ints/strings', 'implementation-dependent → never rely on it'],
  ['iteration', 'modify a list/dict while looping; reuse a generator', 'skipped items / RuntimeError / empty second pass']
])}`,
    clues: [
      '"What does this print?" with <code>def f(x=[])</code> → shared default accumulates',
      'A lambda / closure built inside a <code>for</code> → late binding: last value',
      'A variable read <b>before</b> an assignment in the same function → <code>UnboundLocalError</code>',
      '<code>is</code> used to compare numbers or strings → identity, not equality; answer may vary',
      'A list modified inside <code>for x in that_list</code> → items get skipped',
      '<code>return</code> inside <code>finally</code> / <code>try</code> + <code>else</code> + <code>finally</code> → finally always wins'
    ],
    code: [{ lang: 'python', run: true, title: 'Ten rapid-fire gotchas in one run', code: R`
print(1 < 2 < 3, (3 > 2) > 1)            # True False   (chained vs (True) > 1)
print(0.1 + 0.2 == 0.3, round(2.5), round(3.5))   # False 2 4  (binary floats, banker's rounding)
print(-7 // 2, -7 % 2, int(-7 / 2))      # -4 1 -3     (floor toward -inf vs truncation)
print(True + True, isinstance(True, int))  # 2 True     (bool subclasses int)
print(all([]), any([]))                  # True False  (vacuous truth)
x = float("nan")
print(x == x, x in [x])                  # False True  (containers check identity first)
a = [3, 1, 2]
print(a.sort())                          # None        (in-place methods return None)
g = (i for i in range(3))
print(sum(g), sum(g))                    # 3 0         (generators are single-use)
print(int("257") is int("257"), int("5") is int("5"))   # False True (small-int cache -5..256)
for i in range(3):
    pass
print(i, "<- loop variable survives the loop")
` }],
    viz: [{
      title: 'Removing items while iterating: why some get skipped',
      input: '2 4 5 6 8 7',
      inputLabel: 'List of integers (we remove the even ones inside the loop)',
      gen: function (input) {
        var a = nums(input, 10, 'Enter integers, e.g. 2 4 5 6 8 7');
        var orig = a.slice(), frames = [], idx = 0, removed = [];
        var code = 'nums = ' + pyList(orig) + '\nfor x in nums:\n    if x % 2 == 0:\n        nums.remove(x)\nprint(nums)';
        frames.push(fr('Task: remove every even number. The <code>for</code> loop uses a hidden <b>index counter</b> inside the list iterator: it returns <code>nums[0]</code>, then <code>nums[1]</code>, … until the index reaches the current length.', [
          { type: 'array', label: 'nums', values: a.slice(), showIdx: true },
          { type: 'code', label: 'code', lang: 'python', code: code, hl: { 2: 'cur' } }
        ]));
        var guard = 0;
        while (idx < a.length && guard++ < 40) {
          var x = a[idx], ptr = {}; ptr[idx] = 'it';
          var hl = {}; hl[idx] = 'cur';
          if (((x % 2) + 2) % 2 === 0) {
            var pos = a.indexOf(x);
            var hl2 = {}; hl2[pos] = 'bad';
            frames.push(fr('Iterator index ' + idx + ' → x = <b>' + x + '</b> (even). <code>nums.remove(' + x + ')</code> deletes the first ' + x + ' (index ' + pos + ') and <b>shifts everything after it left by one</b>.', [
              { type: 'array', label: 'nums before remove', values: a.slice(), hl: hl2, ptr: ptr, showIdx: true },
              { type: 'code', label: 'code', lang: 'python', code: code, hl: { 3: 'cur', 4: 'bad' } }
            ]));
            a.splice(pos, 1); removed.push(x);
            idx++;
            var ptr2 = {}; if (idx < a.length) ptr2[idx] = 'it next';
            var hl3 = {}; if (idx - 1 < a.length && idx - 1 >= 0) hl3[idx - 1] = 'win';
            frames.push(fr('The iterator moves on to index ' + idx + '. ' + (idx - 1 >= 0 && idx - 1 < a.length ? 'The element that slid into index ' + (idx - 1) + ' (<b>' + a[idx - 1] + '</b>) is <span class="c-r">never examined</span> — it was skipped!' : 'Nothing slid into the old slot.'), [
              { type: 'array', label: 'nums after remove', values: a.slice(), hl: hl3, ptr: ptr2, showIdx: true },
              { type: 'vars', vals: { iterator_index: idx, len_nums: a.length, removed: pyList(removed) } }
            ]));
          } else {
            frames.push(fr('Iterator index ' + idx + ' → x = <b>' + x + '</b> (odd) → keep. Move on.', [
              { type: 'array', label: 'nums', values: a.slice(), hl: hl, ptr: ptr, showIdx: true },
              { type: 'vars', vals: { iterator_index: idx, len_nums: a.length, removed: pyList(removed) } }
            ]));
            idx++;
          }
        }
        var correct = orig.filter(function (v) { return ((v % 2) + 2) % 2 !== 0; });
        var wrong = a.some(function (v) { return ((v % 2) + 2) % 2 === 0; });
        frames.push(fr('Index ' + idx + ' ≥ len ' + a.length + ' → loop ends. Output: <b>' + pyList(a) + '</b>' + (wrong ? ' — <span class="c-r">evens survived because they were skipped</span>.' : ' — correct this time only by luck of the input order.') + ' Fix: build a new list: <code>nums = [x for x in nums if x % 2]</code> → ' + pyList(correct) + ', or iterate over a copy <code>for x in nums[:]</code>.', [
          { type: 'array', label: 'buggy result', values: a.slice(), hl: (function () { var h = {}; a.forEach(function (v, i) { if (((v % 2) + 2) % 2 === 0) h[i] = 'bad'; }); return h; })() },
          { type: 'array', label: 'correct: [x for x in nums if x % 2]', values: correct.length ? correct : ['(empty)'], hl: (function () { var h = {}; correct.forEach(function (_, i) { h[i] = 'ok'; }); return h; })() }
        ]));
        return frames;
      }
    }, {
      title: 'Step through classic output puzzles',
      input: '3',
      inputLabel: 'Puzzle: 1 finally-return · 2 UnboundLocalError · 3 tuple += · 4 dict keys · 5 genexpr',
      gen: function (input) {
        var key = String(input || '').trim();
        var p = PUZZLES[key];
        if (!p) throw new Error('Enter a puzzle number from 1 to 5');
        var frames = [fr('<b>Puzzle ' + key + ': ' + p.title + '.</b> Predict the output before stepping on!', [
          { type: 'code', label: 'predict the output', lang: 'python', code: p.code, hl: {} }
        ])];
        p.steps.forEach(function (s) {
          var hl = {}; hl[s[0]] = /Error|error/.test(s[1]) && /c-r/.test(s[1]) ? 'bad' : 'cur';
          var parts = [{ type: 'code', label: 'executing', lang: 'python', code: p.code, hl: hl }];
          if (Object.keys(s[2]).length) parts.push({ type: 'vars', label: 'state', vals: s[2], hl: s[2].output !== undefined ? { output: 'ok' } : (s[2].error ? { error: 'bad' } : {}) });
          frames.push(fr(s[1], parts));
        });
        return frames;
      }
    }],
    examples: [
      { title: 'Q1. Default argument accumulates', html: R`<p>Predict before running.</p><details><summary>Answer</summary><p><code>[1, 2, 3] [1, 2, 3] [1, 2, 3]</code> — then <code>[4]</code>. The default list is created once at def time and shared by every call, and <code>print</code> receives the <b>same object three times</b>; by the time it prints, all three appends have happened. Many people answer <code>[1] [1, 2] [1, 2, 3]</code> — that would only be right with three separate <code>print</code> calls. Fix with <code>acc=None</code>.</p></details>`, code: { lang: 'python', run: true, code: R`
def f(x, acc=[]):
    acc.append(x)
    return acc
print(f(1), f(2), f(3))       # one print call receives the SAME list object 3 times
print(f(4, []))` } },
      { title: 'Q2. Tuple swap with an index on the left', html: R`<p>Assignment targets are filled <b>left to right</b> after the whole right side is evaluated.</p><details><summary>Answer</summary><p><code>[0, 9]</code>. Right side evaluates to <code>(1, 9)</code>. Then <code>i = 1</code> first, so <code>x[i]</code> means <code>x[1]</code> = 9.</p></details>`, code: { lang: 'python', run: true, code: R`
x = [0, 1]
i = 0
i, x[i] = 1, 9
print(x)` } },
      { title: 'Q3. The exception name disappears', html: R`<p>What does the last line print?</p><details><summary>Answer</summary><p>It raises <code>NameError</code>: at the end of an <code>except ... as e</code> block Python <b>deletes</b> <code>e</code> (to break a reference cycle through the traceback), even if <code>e</code> existed before.</p></details>`, code: { lang: 'python', run: true, code: R`
e = "before"
try:
    1 / 0
except ZeroDivisionError as e:
    pass
try:
    print(e)
except NameError as err:
    print("NameError:", err)` } },
      { title: 'Q4. for … else', html: R`<p>The <code>else</code> of a loop runs when the loop finishes <b>without</b> <code>break</code> — think "no-break".</p><details><summary>Answer</summary><p><code>found 3</code> for the first loop (break → no else); <code>no even number</code> for the second.</p></details>`, code: { lang: 'python', run: true, code: R`
for n in [1, 3, 5]:
    if n == 3:
        print("found", n); break
else:
    print("never printed")
for n in [1, 3, 5]:
    if n % 2 == 0:
        break
else:
    print("no even number")` } },
      { title: 'Q5. Class attribute vs instance attribute', html: R`<p>Assigning through an instance creates an <b>instance</b> attribute that shadows the class one; changing the class affects only instances that have not shadowed it.</p><details><summary>Answer</summary><p><code>1 5</code> then <code>10 5</code>.</p></details>`, code: { lang: 'python', run: true, code: R`
class A:
    x = 1
a = A()
a.x = 5                 # instance attribute shadows A.x
print(A.x, a.x)
A.x = 10
b = A()
print(b.x, a.x)` } },
      { title: 'Q6. Dict changed during iteration', html: R`<p>Adding or removing keys while iterating a dict is detected.</p><details><summary>Answer</summary><p><code>RuntimeError: dictionary changed size during iteration</code>. Iterate over <code>list(d)</code> or build a new dict with a comprehension. (Changing <i>values</i> of existing keys is fine.)</p></details>`, code: { lang: 'python', run: true, code: R`
d = {"a": 1, "b": 2}
try:
    for k in d:
        d[k + "!"] = 0
except RuntimeError as err:
    print("RuntimeError:", err)
d = {k: v for k, v in d.items() if v > 1}
print(d)` } },
      { title: 'Q7. Mutating through an alias with +=', html: R`<p><code>y += [4]</code> extends the list in place, and <code>x</code> names the same list. For a <b>tuple</b> (immutable), <code>+=</code> builds a new object and rebinds only <code>q</code>.</p><details><summary>Answer</summary><p><code>[1, 2, 3, 4]</code> then <code>(1, 2)</code>.</p></details>`, code: { lang: 'python', run: true, code: R`
x = [1, 2, 3]
y = x
y += [4]
print(x)
p = (1, 2)
q = p
q += (3,)
print(p)` } },
      { title: 'Q8. Closures and nonlocal', html: R`<p>Reading an outer variable is fine; <b>assigning</b> it needs <code>nonlocal</code>, otherwise it is a new local (and here an <code>UnboundLocalError</code>).</p><details><summary>Answer</summary><p><code>UnboundLocalError</code> for <code>bad()</code>, then <code>1 2</code> for the nonlocal counter.</p></details>`, code: { lang: 'python', run: true, code: R`
def make_bad():
    count = 0
    def bad():
        count += 1          # assignment -> count is local to bad()
        return count
    return bad
try:
    make_bad()()
except UnboundLocalError:
    print("UnboundLocalError")

def make_counter():
    count = 0
    def inc():
        nonlocal count
        count += 1
        return count
    return inc
c = make_counter()
print(c(), c())` } },
      { title: 'Q9. __eq__ without __hash__', html: R`<p>Defining <code>__eq__</code> sets <code>__hash__ = None</code> automatically, so instances can no longer go in sets or be dict keys.</p><details><summary>Answer</summary><p><code>TypeError: unhashable type: 'P'</code>. Add <code>__hash__</code> based on the same fields (and keep them immutable), or use <code>@dataclass(frozen=True)</code>.</p></details>`, code: { lang: 'python', run: true, code: R`
class P:
    def __init__(self, x):
        self.x = x
    def __eq__(self, other):
        return isinstance(other, P) and self.x == other.x
try:
    print({P(1)})
except TypeError as err:
    print("TypeError:", err)` } },
      { title: 'Q10. zip, strings and slices never complain', html: R`<p>Slicing past the end is silent; indexing past the end raises. <code>zip</code> stops at the shortest input (use <code>strict=True</code> in 3.10+ to get an error instead).</p><details><summary>Answer</summary><p><code>'' [(1, 'a'), (2, 'b')] ''</code> then <code>IndexError</code> and finally <code>ValueError</code> from <code>strict=True</code>.</p></details>`, code: { lang: 'python', run: true, code: R`
s = "abc"
print(repr(s[10:]), list(zip([1, 2, 3], "ab")), repr("ab" * -1))
try:
    s[10]
except IndexError:
    print("IndexError")
try:
    list(zip([1, 2, 3], "ab", strict=True))
except ValueError:
    print("ValueError")` } },
      { title: 'Q11. Decorators run at definition time', html: R`<p>A decorator is called once when the <code>def</code> executes — before any call. Order of output tells you who runs when.</p><details><summary>Answer</summary><p><code>decorating greet</code>, then <code>defined</code>, then <code>before</code>, <code>hi</code>.</p></details>`, code: { lang: 'python', run: true, code: R`
def deco(fn):
    print("decorating", fn.__name__)
    def wrapper():
        print("before")
        return fn()
    return wrapper

@deco
def greet():
    return "hi"

print("defined")
print(greet())` } },
      { title: 'Q12. Integer caching and string interning (identity)', html: R`<p>CPython caches ints from −5 to 256 and interns identifier-like string constants; other values may or may not be the same object depending on how they were created. The <b>lesson</b>: use <code>==</code> for values, <code>is</code> only for singletons like <code>None</code>.</p><details><summary>Answer</summary><p><code>True False True</code> on CPython (runtime-created 1000s are distinct objects), and <code>True</code> for <code>==</code>.</p></details>`, code: { lang: 'python', run: true, code: R`
a, b = int("100"), int("100")
c, d = int("1000"), int("1000")
s1 = "".join(["py", "thon"])
s2 = "python"
print(a is b, c is d, s1 == s2)
print(c == d)` } },
      { title: 'Q13. Sort stability and key tricks', html: R`<p><code>sorted</code> is <b>stable</b>: items with equal keys keep their original order. So sorting by a secondary key first and then by the primary key gives a correct multi-key sort.</p><details><summary>Answer</summary><p><code>[('b', 1), ('d', 1), ('a', 2), ('c', 2)]</code> — within score 1, b stays before d.</p></details>`, code: { lang: 'python', run: true, code: R`
rows = [("b", 1), ("a", 2), ("d", 1), ("c", 2)]
print(sorted(rows, key=lambda r: r[1]))
print(sorted(rows, key=lambda r: (-r[1], r[0])))` } },
      { title: 'Q14. Mutating a list you are iterating with enumerate', html: R`<p>Appending inside the loop extends the iteration (the iterator checks the length every step) — guard it or you loop forever.</p><details><summary>Answer</summary><p><code>[1, 2, 3, 10, 20, 30]</code> and the loop ran 6 times (it processed the appended items too, but they were ≥ 10 so nothing more was added).</p></details>`, code: { lang: 'python', run: true, code: R`
a = [1, 2, 3]
steps = 0
for i, x in enumerate(a):
    steps += 1
    if x < 10:
        a.append(x * 10)
print(a, steps)` } }
    ],
    deepDive: R`<p>🟣 <b>Why each rule exists.</b> <i>Scope at compile time:</i> the compiler assigns each name one of LOAD_FAST (local), LOAD_DEREF (closure cell), LOAD_GLOBAL — you can see it with <code>dis.dis</code>. That is why one assignment anywhere makes a name local everywhere. <i>Exception name deletion:</i> the traceback references the frame, which references <code>e</code> → a cycle; Python inserts an implicit <code>del e</code>. <i><code>x in [x]</code> is True for NaN:</i> containers use <code>PyObject_RichCompare</code> with an identity shortcut (<code>is</code> before <code>==</code>). <i>Banker's rounding</i> (round half to even) avoids statistical bias; plus <code>round(2.675, 2)</code> gives 2.67 because 2.675 is really 2.67499999… in binary. <i>Floor division</i> keeps the identity <code>(a // b) * b + a % b == a</code> with a non-negative remainder for positive b.</p>
<p><b>Version-sensitive gotchas</b> (good follow-ups): 3.12 comprehensions are inlined, yet a comprehension in a class body still cannot see class variables except in its first (outermost) iterable; 3.13 made <code>locals()</code> in functions return independent snapshots (PEP 667); 3.14 adds deferred evaluation of annotations (PEP 649/749) so forward references stop raising at def time, and a <code>SyntaxWarning</code> for <code>return</code>/<code>break</code>/<code>continue</code> in <code>finally</code> (PEP 765). Identity results (<code>is</code> on ints and strings) differ between CPython versions, PyPy, and even between the REPL and a script (constants in one code object may be merged).</p>
<p><b>Interview technique:</b> narrate the model ("the default list is created once, here is the object graph"), predict, then mention the fix and the linter rule. Getting the right answer with the wrong reasoning scores worse than a near-miss with clear reasoning.</p>`,
    aiEra: R`<p><b>What AI changes:</b> any assistant can run the snippet and tell you the output, so interviewers increasingly ask <i>why</i> and <i>how would you prevent it</i> — the reasoning, not the recall. <b>Use AI as a partner:</b> ask it to <i>"generate 10 new predict-the-output puzzles around late binding and scope, without answers"</i>, solve them on paper, then check by running. <b>Where AI goes wrong:</b> LLMs confidently mispredict exactly these puzzles (identity of ints, dict key collapse, genexpr binding) because they pattern-match common answers; they also mix up behaviours across Python versions (e.g. <code>locals()</code> changes in 3.13). Always execute to confirm. <b>What you must still own:</b> the mental model that lets you spot these bugs in code review in seconds — no tool runs every edge case of your production data.</p>`,
    problems: [{
      title: 'Predict and Fix: Removing Evens While Iterating',
      level: 'Easy', tags: ['iteration', 'gotcha', 'list'], companies: ['Google', 'Adobe', 'Infosys'],
      statement: R`<p>Predict the output of the code below for <code>nums = [2, 4, 5, 6, 8, 7]</code>, explain exactly why, and rewrite it to remove all even numbers correctly (in place or not, your choice — state which).</p><pre>for x in nums:
    if x % 2 == 0:
        nums.remove(x)
print(nums)</pre>`,
      constraints: R`n ≤ 10<sup>6</sup>; the fix must be O(n) (note that <code>list.remove</code> is O(n) per call, so even a "working" remove-loop is O(n²)).`,
      example: R`<p>Buggy output: <code>${H.c('r', '[4, 5, 8, 7]')}</code>. Correct output: <code>${H.c('g', '[5, 7]')}</code>. Removing 2 shifted 4 into index 0, which the iterator had already passed — so 4 was never checked. The same happened to 8 after 6 was removed.</p>`,
      brute: { why: R`<p>The list iterator walks by index. Removing an element shifts the rest left, so the next element is skipped. Even when it "works", every <code>remove</code> is O(n) (search + shift), so the whole loop is O(n²).</p>`, code: { lang: 'python', run: true, code: R`
nums = [2, 4, 5, 6, 8, 7]
for x in nums:
    if x % 2 == 0:
        nums.remove(x)      # shifts later elements left -> next one skipped
print(nums)                 # [4, 5, 8, 7]` } },
      mcq: { q: 'Why is 4 never removed?', options: ['After 2 is removed, 4 slides into index 0, but the iterator moves on to index 1', 'remove() only deletes odd numbers', 'The loop makes a copy of the list first', 'x % 2 is 1 for 4'], answer: 0, explain: 'The iterator keeps an index; deleting shifts elements left under it, so the element that slides into the visited slot is skipped.' },
      hints: [R`<p>Hint 1: never change the size of a list while a <code>for</code> loop is iterating over it.</p>`, R`<p>Hint 2: build a <b>new</b> list with a comprehension (O(n)), or assign it back with slice assignment <code>nums[:] = …</code> if other references must see the change.</p>`, R`<p>Hint 3: recipe — <code>nums[:] = [x for x in nums if x % 2 != 0]</code>. For huge data, a two-pointer write index (compact in place, then <code>del nums[w:]</code>) also works in O(n) with no second list.</p>`],
      solution: {
        approach: R`<p>Filter into a new list with a comprehension — O(n), no index tricks. Use slice assignment <code>nums[:] = …</code> when the same list object must be updated (other names reference it). The in-place two-pointer version shows the underlying idea: copy keepers forward, then truncate once.</p>`,
        code: { lang: 'python', run: true, code: R`
nums = [2, 4, 5, 6, 8, 7]
alias = nums
nums[:] = [x for x in nums if x % 2 != 0]   # same object updated, O(n)
print(nums, alias is nums)                  # [5, 7] True

def remove_evens_in_place(a):
    w = 0                                   # write index
    for x in a:                             # reading is safe: no size change yet
        if x % 2 != 0:
            a[w] = x
            w += 1
    del a[w:]                               # one truncation at the end
    return a

print(remove_evens_in_place([2, 4, 5, 6, 8, 7]))   # [5, 7]
` },
        dry: { head: ['iterator index', 'list before', 'x', 'action', 'list after'], rows: [
          ['0', '[2, 4, 5, 6, 8, 7]', '2', 'remove 2', '[4, 5, 6, 8, 7]'],
          ['1', '[4, 5, 6, 8, 7]', '5', 'keep (4 was skipped!)', '[4, 5, 6, 8, 7]'],
          ['2', '[4, 5, 6, 8, 7]', '6', 'remove 6', '[4, 5, 8, 7]'],
          ['3', '[4, 5, 8, 7]', '7', 'keep (8 was skipped!)', '[4, 5, 8, 7]'],
          ['4', '—', '—', 'index 4 ≥ len 4 → stop', '<span class="c-r">[4, 5, 8, 7]</span>']
        ] },
        complexity: R`<p>Fix: O(n) time; the comprehension uses O(n) extra space, the two-pointer version O(1). The buggy loop is O(n²) and wrong.</p>`,
        followUps: ['Same bug with a dict: delete keys whose value is 0', 'What happens if you <code>append</code> inside the loop instead?', 'Why does iterating backwards with indexes (<code>for i in range(len(a)-1, -1, -1)</code>) work?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Predict: The Multipliers Interview Classic (late binding)',
    level: 'Easy', tags: ['closures', 'late binding', 'predict output'], companies: ['Google', 'Toptal', 'Booking.com'],
    statement: R`<p>Predict the output, explain it, then fix <code>multipliers()</code> so it prints <code>[0, 2, 4, 6]</code>.</p><pre>def multipliers():
    return [lambda x: i * x for i in range(4)]

print([m(2) for m in multipliers()])</pre>`,
    constraints: R`Do not change the call site. Give at least two different fixes.`,
    example: R`<p>Output: <code>${H.c('r', '[6, 6, 6, 6]')}</code>. Every lambda looks up <code>i</code> when it is <b>called</b>; by then the comprehension has finished and <code>i</code> is 3, so each returns 3 × 2 = 6.</p>`,
    brute: { why: R`<p>The four lambdas share one closure cell for <code>i</code>. They capture the <b>variable</b>, not its value at creation time, so all of them see the final value 3.</p>`, code: { lang: 'python', run: true, code: R`
def multipliers():
    return [lambda x: i * x for i in range(4)]

print([m(2) for m in multipliers()])        # [6, 6, 6, 6]
print([c.cell_contents for c in multipliers()[0].__closure__])   # [3]` } },
    mcq: { q: 'Which change binds the current value of i into each lambda?', options: ['<code>lambda x, i=i: i * x</code>', '<code>lambda x: (i) * x</code>', 'Use a list instead of a comprehension', 'Rename i to j'], answer: 0, explain: 'Default values are evaluated at definition time, so i=i snapshots the current i into each lambda. Parentheses or renaming change nothing.' },
    hints: [R`<p>Hint 1: ask "when is <code>i</code> looked up?" — at call time, after the loop has finished.</p>`, R`<p>Hint 2: something evaluated at <b>definition</b> time can freeze the value: a default argument, <code>functools.partial</code>, or a factory function with its own scope.</p>`, R`<p>Hint 3: fixes — <code>lambda x, i=i: i * x</code>; or <code>partial(operator.mul, i)</code>; or a generator <code>(lambda x: i * x for i in range(4))</code> consumed lazily (fragile!). Prefer the first two.</p>`],
    solution: {
      approach: R`<p>Snapshot <code>i</code> at creation time. A default argument is the shortest fix; <code>functools.partial</code> is the most explicit. Mention ruff rule B023 ("function definition does not bind loop variable") that flags this automatically.</p>`,
      code: { lang: 'python', run: true, code: R`
import operator
from functools import partial

def multipliers_default():
    return [lambda x, i=i: i * x for i in range(4)]   # value captured now

def multipliers_partial():
    return [partial(operator.mul, i) for i in range(4)]

print([m(2) for m in multipliers_default()])    # [0, 2, 4, 6]
print([m(2) for m in multipliers_partial()])    # [0, 2, 4, 6]
` },
      dry: { head: ['lambda #', 'i at creation', 'i at call (buggy)', 'result buggy', 'result fixed'], rows: [
        ['0', '0', '3', '6', '0'], ['1', '1', '3', '6', '2'], ['2', '2', '3', '6', '4'], ['3', '3', '3', '6', '6']
      ] },
      complexity: R`<p>O(k) to build k functions, O(1) per call. The fix changes correctness, not cost.</p>`,
      followUps: ['Does the same bug happen with <code>def</code> inside a for loop?', 'Why does the <code>i=i</code> trick let a caller accidentally override i?']
    }
  });

  practice.push({
    title: 'Predict: Tic-Tac-Toe Board Marks a Whole Column',
    level: 'Easy', tags: ['aliasing', 'list multiplication', 'predict output'], companies: ['Microsoft', 'Zoho', 'Wipro'],
    statement: R`<p>A game creates its board with <code>board = [["."] * 3] * 3</code>, then plays <code>board[0][1] = "X"</code>. Predict what <code>for row in board: print("".join(row))</code> prints, explain, and fix the board creation.</p>`,
    constraints: R`Board size n × n with 1 ≤ n ≤ 100; the fix must create n independent rows.`,
    example: R`<p>Output: <code>${H.c('r', '.X.')}</code> three times. Expected: <code>${H.c('g', '.X.')}</code> then <code>...</code> twice.</p>`,
    brute: { why: R`<p><code>* 3</code> on the outer list copies the <b>reference</b> to the single inner row three times. All three rows are one object, so writing to "row 0" writes to all of them.</p>`, code: { lang: 'python', run: true, code: R`
board = [["."] * 3] * 3
board[0][1] = "X"
for row in board:
    print("".join(row))
print(board[0] is board[2])     # True` } },
    mcq: { q: 'How many distinct row list objects does <code>[["."] * 3] * 3</code> create?', options: ['1', '3', '9', '0 — it is a tuple'], answer: 0, explain: 'The inner ["."]*3 runs once, producing one list; the outer * 3 makes three references to it.' },
    hints: [R`<p>Hint 1: check <code>board[0] is board[1]</code> — identity reveals the sharing.</p>`, R`<p>Hint 2: the expression that builds a row must run <b>once per row</b>, i.e. inside a loop or comprehension.</p>`, R`<p>Hint 3: fix — <code>board = [["."] * n for _ in range(n)]</code>. The inner <code>["."] * n</code> is fine because strings are immutable.</p>`],
    solution: {
      approach: R`<p>Build each row separately with a comprehension. Inner multiplication of immutable items is safe; outer multiplication of mutable rows is not.</p>`,
      code: { lang: 'python', run: true, code: R`
n = 3
board = [["."] * n for _ in range(n)]   # n independent rows
board[0][1] = "X"
for row in board:
    print("".join(row))
print(board[0] is board[2])             # False
` },
      complexity: R`<p>O(n²) to build the board, O(1) per move.</p>`,
      followUps: ['Would <code>[[None] * 3 for _ in range(3)]</code> also be safe?', 'Does <code>copy.copy(board)</code> fix aliasing between boards?']
    }
  });

  practice.push({
    title: 'Predict: sort() Returns None and Other In-Place Traps',
    level: 'Easy', tags: ['in-place methods', 'predict output', 'strings'], companies: ['TCS', 'Accenture', 'Meta'],
    statement: R`<p>Predict the output of this snippet line by line and fix the two bugs so it prints the sorted scores and <code>HELLO</code>.</p><pre>scores = [30, 10, 20]
best = scores.sort(reverse=True)
print(best)
name = "hello"
name.upper()
print(name)
print(sorted(scores) == scores, scores)</pre>`,
    constraints: R`Use built-ins only; explain which methods mutate and which return new objects.`,
    example: R`<p>Output: <code>${H.c('r', 'None')}</code>, <code>${H.c('r', 'hello')}</code>, <code>False [30, 20, 10]</code>. <code>list.sort()</code> sorts in place and returns <code>None</code>; <code>str.upper()</code> returns a new string that was thrown away; <code>scores</code> itself is now descending.</p>`,
    brute: { why: R`<p>Mixing up "mutate and return None" methods (<code>sort</code>, <code>append</code>, <code>reverse</code>, <code>update</code>) with "return a new object" methods (<code>sorted</code>, all <code>str</code> methods, <code>+</code>). Strings are immutable, so string methods can never change the original.</p>`, code: { lang: 'python', run: true, code: R`
scores = [30, 10, 20]
best = scores.sort(reverse=True)
print(best)                     # None
name = "hello"
name.upper()                    # result discarded
print(name)                     # hello
print(sorted(scores) == scores, scores)   # False [30, 20, 10]` } },
    mcq: { q: 'Which of these returns a NEW object instead of mutating?', options: ['<code>sorted(lst)</code>', '<code>lst.sort()</code>', '<code>lst.reverse()</code>', '<code>d.update(other)</code>'], answer: 0, explain: 'sorted() always builds and returns a new list. The others mutate in place and return None — a convention (Command–Query Separation) so you notice the mutation.' },
    hints: [R`<p>Hint 1: a method that mutates in place returns <code>None</code> in Python by convention.</p>`, R`<p>Hint 2: <code>str</code> is immutable — <code>name.upper()</code> must be assigned: <code>name = name.upper()</code>.</p>`, R`<p>Hint 3: fix — <code>best = sorted(scores, reverse=True)</code> keeps the original order intact; or call <code>scores.sort(...)</code> on its own line and print <code>scores</code>.</p>`],
    solution: {
      approach: R`<p>Use the function form that returns a new value (<code>sorted</code>) when you need the result in an expression, and re-assign results of string methods.</p>`,
      code: { lang: 'python', run: true, code: R`
scores = [30, 10, 20]
best = sorted(scores, reverse=True)   # new list; scores unchanged
print(best, scores)                   # [30, 20, 10] [30, 10, 20]
name = "hello"
name = name.upper()                   # rebind to the new string
print(name)                           # HELLO
` },
      complexity: R`<p>Sorting O(n log n) either way; <code>sorted</code> also uses O(n) extra memory for the new list.</p>`,
      followUps: ['Why does <code>lst = lst.append(4)</code> lose your data?', 'Is <code>reversed(lst)</code> a list?']
    }
  });

  practice.push({
    title: 'Speed Up a CSV Line Builder (join vs +=)',
    level: 'Easy', tags: ['strings', 'performance', 'timeit'], companies: ['Stripe', 'Shopify', 'Zomato'],
    statement: R`<p>Export 200,000 order rows to CSV text. The current code concatenates strings with <code>+=</code> inside two nested loops. Rewrite it with <code>str.join</code> and an f-string per row, and measure both with <code>timeit</code>.</p>`,
    constraints: R`Rows are tuples <code>(id, name, amount)</code>; output is one string, lines separated by <code>\n</code>, fields by commas, no trailing newline.`,
    example: R`<p>rows = <code>[(1, "pen", 2.5), (2, "ink", 4.0)]</code> → <code>${H.c('g', '"1,pen,2.5\\n2,ink,4.0"')}</code>.</p>`,
    brute: { why: R`<p>Each <code>+=</code> may create a brand-new string and copy everything built so far, so the worst case is O(total²). CPython sometimes resizes in place as an optimisation when the string has only one reference, but that is fragile (any other reference, or PyPy, disables it) and the per-field Python work is still heavy.</p>`, code: { lang: 'python', run: true, code: R`
def to_csv_slow(rows):
    out = ""
    for i, row in enumerate(rows):
        for j, field in enumerate(row):
            out += str(field)              # repeated concatenation
            if j < len(row) - 1:
                out += ","
        if i < len(rows) - 1:
            out += "\n"
    return out

print(repr(to_csv_slow([(1, "pen", 2.5), (2, "ink", 4.0)])))` } },
    mcq: { q: 'Why is <code>"\\n".join(lines)</code> guaranteed linear?', options: ['It measures all pieces first, allocates the final string once, then copies each piece once', 'It uses multiple threads', 'It compresses the strings', 'It caches previous results'], answer: 0, explain: 'join does two passes: sum lengths, one allocation, one copy per piece → O(total length).' },
    hints: [R`<p>Hint 1: collect pieces in a list (or generator) and glue them once at the end.</p>`, R`<p>Hint 2: an f-string per row (<code>f"{i},{name},{amt}"</code>) replaces the inner loop and the comma bookkeeping.</p>`, R`<p>Hint 3: recipe — <code>"\n".join(f"{a},{b},{c}" for a, b, c in rows)</code>. For real CSV with quotes and commas inside fields, use the <code>csv</code> module writing to <code>io.StringIO</code>.</p>`],
    solution: {
      approach: R`<p>One generator of formatted lines + one <code>join</code>. Fewer bytecodes per row, one final allocation, and no quadratic risk. Measure with <code>timeit</code> on realistic data size.</p>`,
      code: { lang: 'python', run: true, code: R`
import timeit

def to_csv_slow(rows):
    out = ""
    for i, row in enumerate(rows):
        for j, field in enumerate(row):
            out += str(field)
            if j < len(row) - 1:
                out += ","
        if i < len(rows) - 1:
            out += "\n"
    return out

def to_csv_fast(rows):
    return "\n".join(f"{a},{b},{c}" for a, b, c in rows)

rows = [(i, f"item{i}", i * 0.5) for i in range(200_000)]
assert to_csv_fast(rows) == to_csv_slow(rows)
for fn in (to_csv_slow, to_csv_fast):
    t = min(timeit.repeat(lambda: fn(rows), number=1, repeat=3))
    print(f"{fn.__name__:<12} {t * 1000:7.1f} ms")
` },
      complexity: R`<p>O(total output length) time and memory for the fast version; the slow version is O(total²) in the worst case and has a much larger constant.</p>`,
      followUps: ['Stream the CSV to a file without building the whole string', 'Why is <code>csv.writer</code> safer than f-strings?']
    }
  });

  practice.push({
    title: 'Common Customer IDs: From O(n·m) to O(n + m)',
    level: 'Easy', tags: ['set', 'performance', 'hashing'], companies: ['Amazon', 'Walmart', 'Swiggy'],
    statement: R`<p>Given two lists of customer IDs (yesterday's buyers and today's buyers, up to 10<sup>6</sup> each), return the IDs that appear in both, sorted ascending, without duplicates.</p>`,
    constraints: R`1 ≤ n, m ≤ 10<sup>6</sup>; IDs are ints; output sorted ascending, unique.`,
    example: R`<p>a = <code>[5, 1, 9, 5, 3]</code>, b = <code>[3, 5, 7, 5]</code> → <code>${H.c('g', '[3, 5]')}</code>.</p>`,
    brute: { why: R`<p><code>x in b</code> on a list scans all of <code>b</code>: n × m = 10<sup>12</sup> comparisons. The extra <code>not in out</code> check is another linear scan.</p>`, code: { lang: 'python', run: true, code: R`
def common_slow(a, b):
    out = []
    for x in a:
        if x in b and x not in out:     # two linear scans per element
            out.append(x)
    return sorted(out)

print(common_slow([5, 1, 9, 5, 3], [3, 5, 7, 5]))` } },
    mcq: { q: 'What is the time complexity of <code>set(a) &amp; set(b)</code>?', options: ['O(n + m) on average', 'O(n · m)', 'O(n log m)', 'O(1)'], answer: 0, explain: 'Building each set is linear; intersection iterates the smaller set and probes the other in O(1) average.' },
    hints: [R`<p>Hint 1: the question "is x in b?" is asked n times — make each answer O(1).</p>`, R`<p>Hint 2: sets give O(1) membership and deduplicate for free; <code>&amp;</code> computes the intersection in C.</p>`, R`<p>Hint 3: recipe — <code>sorted(set(a) &amp; set(b))</code>. Memory-sensitive variant: build a set of the smaller list only and stream the bigger one.</p>`],
    solution: {
      approach: R`<p>Convert to sets and intersect; sort only the (usually small) result. Building the set of the smaller input and iterating the larger one keeps memory down.</p>`,
      code: { lang: 'python', run: true, code: R`
import random
import time

def common_fast(a, b):
    small, big = (a, b) if len(a) <= len(b) else (b, a)
    s = set(small)
    return sorted({x for x in big if x in s})

print(common_fast([5, 1, 9, 5, 3], [3, 5, 7, 5]))      # [3, 5]
random.seed(3)
a = [random.randrange(2_000_000) for _ in range(300_000)]
b = [random.randrange(2_000_000) for _ in range(300_000)]
t = time.perf_counter()
r = common_fast(a, b)
print(len(r), f"common ids in {(time.perf_counter() - t) * 1000:.0f} ms")
assert r == sorted(set(a) & set(b))
` },
      complexity: R`<p>O(n + m + k log k) time where k is the number of common IDs; O(min(n, m) + k) memory.</p>`,
      followUps: ['Both lists are already sorted — do it with O(1) extra memory (two pointers)', 'The lists live on two different machines — how do you intersect with minimal network transfer (Bloom filter)?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Predict: try / except / else / finally Execution Order',
    level: 'Medium', tags: ['exceptions', 'finally', 'predict output'], companies: ['Bloomberg', 'Goldman Sachs', 'Oracle'],
    statement: R`<p>Predict everything this prints, in order, for <code>run(1)</code>, <code>run(0)</code> and <code>run("x")</code>. Then explain the rule that decides the return value.</p><pre>def run(d):
    try:
        r = 10 / d
    except ZeroDivisionError:
        print("except")
        return "E"
    else:
        print("else")
        return "OK"
    finally:
        print("finally")
</pre>`,
    constraints: R`State the full output including the printed return values of <code>print(run(1))</code>, <code>print(run(0))</code>, and what happens for <code>run("x")</code>.`,
    example: R`<p><code>print(run(1))</code> → <code>else</code>, <code>finally</code>, <code>${H.c('g', 'OK')}</code>. The else branch's <code>return "OK"</code> is <i>pending</i> while finally runs; finally has no return, so "OK" goes through.</p>`,
    brute: { why: R`<p>The common wrong answer is "return exits immediately, so finally does not print" — but <code>finally</code> <b>always</b> runs on the way out, whether via return, exception, break or continue. A <code>TypeError</code> is not caught by <code>except ZeroDivisionError</code>, so it propagates <i>after</i> finally runs.</p>`, code: { lang: 'python', run: true, code: R`
def run(d):
    try:
        r = 10 / d
    except ZeroDivisionError:
        print("except")
        return "E"
    else:
        print("else")
        return "OK"
    finally:
        print("finally")

print(run(1))
print(run(0))
try:
    print(run("x"))
except TypeError as e:
    print("TypeError escaped:", e)` } },
    mcq: { q: 'For <code>run("x")</code>, what is printed before the TypeError reaches the caller?', options: ['"finally" only', '"except" then "finally"', 'Nothing', '"else" then "finally"'], answer: 0, explain: 'The except clause does not match TypeError and else only runs when no exception occurred, but finally runs before the exception propagates.' },
    hints: [R`<p>Hint 1: <code>else</code> runs only if the <code>try</code> block raised nothing.</p>`, R`<p>Hint 2: <code>finally</code> runs last in every path; if <b>it</b> contained a <code>return</code>, that would override any pending return or swallow the exception.</p>`, R`<p>Hint 3: trace three paths — success: else → finally → "OK"; ZeroDivisionError: except → finally → "E"; TypeError: (no matching except) → finally → exception propagates.</p>`],
    solution: {
      approach: R`<p>Keep only the code that can raise in <code>try</code>, put the success path in <code>else</code> (so its own errors are not accidentally caught), and use <code>finally</code> for cleanup with <b>no return statements</b> (Python 3.14 warns about them — PEP 765).</p>`,
      code: { lang: 'python', run: true, code: R`
def run(d):
    try:
        r = 10 / d
    except ZeroDivisionError:
        print("except")
        return "E"
    else:
        print("else")
        return "OK"
    finally:
        print("finally")            # cleanup only; no return here

for arg in (1, 0, "x"):
    try:
        print("->", run(arg))
    except TypeError as e:
        print("-> TypeError:", e)
` },
      dry: { head: ['call', 'printed', 'result'], rows: [
        ['run(1)', 'else, finally', '"OK"'],
        ['run(0)', 'except, finally', '"E"'],
        ['run("x")', 'finally', '<span class="c-r">TypeError propagates</span>']
      ] },
      complexity: R`<p>O(1). The point is control flow: finally runs on every exit path.</p>`,
      followUps: ['What prints if finally does <code>return "F"</code> and the try raises KeyError?', 'How do <code>with</code> statements relate to try/finally?']
    }
  });

  practice.push({
    title: 'Predict: The Global Counter UnboundLocalError',
    level: 'Medium', tags: ['scope', 'LEGB', 'predict output'], companies: ['Uber', 'Paytm', 'Intuit'],
    statement: R`<p>A metrics module counts requests. Predict what happens, explain using LEGB and compile-time scoping, and give a clean fix that avoids <code>global</code>.</p><pre>count = 0
def handle():
    count += 1
    return count
handle()</pre>`,
    constraints: R`The fix must be safe to test (no hidden module state) and simple to reason about.`,
    example: R`<p>Result: <code>${H.c('r', "UnboundLocalError: cannot access local variable 'count' where it is not associated with a value")}</code>. Because <code>count += 1</code> assigns, <code>count</code> is local to <code>handle</code> — and is read before it has a value.</p>`,
    brute: { why: R`<p>The quick fix <code>global count</code> works, but global mutable state makes tests order-dependent and is not thread-safe (<code>count += 1</code> is a read-modify-write that can race across threads).</p>`, code: { lang: 'python', run: true, code: R`
count = 0
def handle():
    global count            # works, but hidden shared state
    count += 1
    return count

print(handle(), handle())   # 1 2

def broken():
    total += 1              # local because of the assignment
try:
    total = 0
    broken()
except UnboundLocalError as e:
    print("UnboundLocalError:", e)` } },
    mcq: { q: 'When does Python decide that <code>count</code> is local inside <code>handle</code>?', options: ['At compile time, because the function body contains an assignment to count', 'At runtime, on the line where count is first assigned', 'Only if count does not exist globally', 'Never — augmented assignment always uses globals'], answer: 0, explain: 'The compiler scans the whole function body; any binding makes the name local for the entire function (LOAD_FAST), unless declared global/nonlocal.' },
    hints: [R`<p>Hint 1: run <code>dis.dis(handle)</code> — you will see <code>LOAD_FAST count</code>, not <code>LOAD_GLOBAL</code>.</p>`, R`<p>Hint 2: move the state into an object (a class with a counter attribute, or a closure using <code>nonlocal</code>) so each test can create a fresh one.</p>`, R`<p>Hint 3: for thread safety use a <code>threading.Lock</code> around the increment, or <code>itertools.count()</code> whose <code>next()</code> is atomic in CPython.</p>`],
    solution: {
      approach: R`<p>Encapsulate the state: a small class (or closure with <code>nonlocal</code>) owns the counter; inject it where needed. Add a lock if multiple threads handle requests.</p>`,
      code: { lang: 'python', run: true, code: R`
import threading

class RequestCounter:
    def __init__(self):
        self._n = 0
        self._lock = threading.Lock()
    def handle(self):
        with self._lock:              # read-modify-write made atomic
            self._n += 1
            return self._n

c = RequestCounter()
threads = [threading.Thread(target=lambda: [c.handle() for _ in range(10_000)]) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(c.handle() - 1)                 # 40000

def make_counter():
    n = 0
    def handle():
        nonlocal n                    # rebinds the enclosing variable
        n += 1
        return n
    return handle
h = make_counter()
print(h(), h())                       # 1 2
` },
      complexity: R`<p>O(1) per request; the lock adds a small constant cost.</p>`,
      followUps: ['Is <code>count += 1</code> atomic under the GIL? Under free-threaded Python?', 'Why does reading a global without assigning it work fine?']
    }
  });

  practice.push({
    title: 'Predict: Chained Comparisons, Precedence and Negative Powers',
    level: 'Medium', tags: ['operators', 'precedence', 'predict output'], companies: ['Adobe', 'Cisco', 'Atlassian'],
    statement: R`<p>Predict each value without running it, then verify:</p><pre>print(1 &lt; 3 &gt; 2)
print(1 == 1 in [1])
print(False == False in [False])
print(-2 ** 2, (-2) ** 2)
print(not 1 == 2, 2 ** 3 ** 2)
print(10 - 4 - 3, 2 * 3 % 4)</pre>`,
    constraints: R`Explain each line with the precise rule (chaining, precedence, associativity).`,
    example: R`<p>Line 1 → <code>${H.c('g', 'True')}</code> because it means <code>1 &lt; 3 and 3 &gt; 2</code>. Line 2 → <code>${H.c('g', 'True')}</code>: <code>in</code> is a comparison operator too, so it chains: <code>(1 == 1) and (1 in [1])</code>.</p>`,
    brute: { why: R`<p>Reading left to right like arithmetic gives wrong answers: <code>(1 == 1) in [1]</code> would be <code>True in [1]</code> → True by luck, but <code>(False == False) in [False]</code> → <code>True in [False]</code> → False, while the real chained answer is True. Unary minus binds <b>looser</b> than <code>**</code>, and <code>**</code> is right-associative.</p>`, code: { lang: 'python', run: true, code: R`
# the "naive left-to-right" reading, made explicit, gives different answers:
print((1 == 1) in [1])            # True (by luck)
print((False == False) in [False])  # False  <- naive reading
print((-2) ** 2)                  # 4      <- naive reading of -2 ** 2` } },
    mcq: { q: 'What is <code>2 ** 3 ** 2</code>?', options: ['512 (right-associative: 2 ** 9)', '64 ((2 ** 3) ** 2)', '36', 'SyntaxError'], answer: 0, explain: 'Exponentiation groups from the right, like in maths: 2^(3^2) = 2^9 = 512.' },
    hints: [R`<p>Hint 1: all comparison operators — <code>&lt; &gt; == != &lt;= &gt;= in, not in, is, is not</code> — chain: <code>a op1 b op2 c</code> ≡ <code>a op1 b and b op2 c</code> (b evaluated once).</p>`, R`<p>Hint 2: <code>**</code> binds tighter than unary minus on its left: <code>-2 ** 2</code> = <code>-(2 ** 2)</code> = −4; and it is right-associative.</p>`, R`<p>Hint 3: <code>not</code> has lower precedence than <code>==</code>, so <code>not 1 == 2</code> = <code>not (1 == 2)</code> = True. <code>*</code> and <code>%</code> share precedence, left to right: <code>(2 * 3) % 4</code> = 2. Subtraction is left-associative: (10 − 4) − 3 = 3.</p>`],
    solution: {
      approach: R`<p>Apply three rules: comparisons chain; precedence table (<code>**</code> &gt; unary <code>-</code> &gt; <code>* / // %</code> &gt; <code>+ -</code> &gt; comparisons &gt; <code>not</code> &gt; <code>and</code> &gt; <code>or</code>); <code>**</code> is right-associative, everything else left-associative. In real code, add parentheses — readability beats cleverness.</p>`,
      code: { lang: 'python', run: true, code: R`
print(1 < 3 > 2)                  # True   (1<3 and 3>2)
print(1 == 1 in [1])              # True   (1==1 and 1 in [1])
print(False == False in [False])  # True   (False==False and False in [False])
print(-2 ** 2, (-2) ** 2)         # -4 4
print(not 1 == 2, 2 ** 3 ** 2)    # True 512
print(10 - 4 - 3, 2 * 3 % 4)      # 3 2
` },
      dry: { head: ['expression', 'rewritten', 'value'], rows: [
        ['1 &lt; 3 &gt; 2', '1&lt;3 and 3&gt;2', 'True'],
        ['False == False in [False]', '(False==False) and (False in [False])', 'True'],
        ['-2 ** 2', '-(2 ** 2)', '-4'],
        ['2 ** 3 ** 2', '2 ** (3 ** 2)', '512']
      ] },
      complexity: R`<p>O(1); this is about language rules, not cost. Note chaining evaluates the middle operand once.</p>`,
      followUps: ['What does <code>x = 5; print(1 &lt; x &lt; 10 == True)</code> print?', 'Is <code>a is b is c</code> chained too?']
    }
  });

  practice.push({
    title: 'Memoize an Exponential Recursion (Grid Paths with Obstacles)',
    level: 'Medium', tags: ['lru_cache', 'dynamic programming', 'performance'], companies: ['Amazon', 'Goldman Sachs', 'Salesforce'],
    statement: R`<p>Count the paths from the top-left to the bottom-right of an R × C grid moving only right or down, avoiding cells marked <code>1</code>. The recursive solution is correct but takes forever on a 16 × 16 grid. Make it fast <b>without rewriting the logic</b>, then measure the speed-up and the cache size.</p>`,
    constraints: R`1 ≤ R, C ≤ 200; answer can be huge (Python ints are arbitrary precision).`,
    example: R`<p>Grid <code>[[0,0,0],[0,1,0],[0,0,0]]</code> → <code>${H.c('g', '2')}</code>: right-right-down-down and down-down-right-right; the centre obstacle blocks the other 4 of the 6 paths.</p>`,
    brute: { why: R`<p>Plain recursion recomputes the same cell over and over: the call tree has up to C(R+C, R) leaves — about 6·10<sup>8</sup> for 16 × 16. Profiling shows millions of calls to the same function with the same arguments: the textbook signal for memoization.</p>`, code: { lang: 'python', run: true, code: R`
def paths_slow(grid, r=0, c=0):
    R, C = len(grid), len(grid[0])
    if r >= R or c >= C or grid[r][c] == 1:
        return 0
    if (r, c) == (R - 1, C - 1):
        return 1
    return paths_slow(grid, r + 1, c) + paths_slow(grid, r, c + 1)

print(paths_slow([[0, 0, 0], [0, 1, 0], [0, 0, 0]]))     # 2
print(paths_slow([[0] * 9 for _ in range(9)]))            # 12870 (already slow-ish)` } },
    mcq: { q: 'Why can\'t you put <code>@lru_cache</code> directly on <code>paths_slow(grid, r, c)</code>?', options: ['grid is a list, which is unhashable, so it cannot be part of the cache key', 'lru_cache only works on methods', 'Recursion is not allowed with caches', 'It would cache the wrong answer'], answer: 0, explain: 'Cache keys are built from the arguments; lists cannot be hashed. Make the grid a closure variable (or a tuple of tuples) and cache only on (r, c).' },
    hints: [R`<p>Hint 1: the answer for cell (r, c) depends only on (r, c) — the same subproblem is reached by many routes.</p>`, R`<p>Hint 2: define an inner function <code>go(r, c)</code> that closes over the grid, decorate it with <code>@cache</code>, and call it once.</p>`, R`<p>Hint 3: for 200 × 200 the recursion depth reaches ~400 frames — fine under the default limit of 1000, but a bottom-up DP table (or a single row of size C) avoids recursion entirely.</p>`],
    solution: {
      approach: R`<p>Memoize on the cell coordinates with <code>functools.cache</code> on an inner function (grid captured by closure). Each of the R·C cells is computed once: exponential → O(R·C). Show <code>cache_info()</code> to prove it. Bottom-up 1-D DP is the iterative alternative.</p>`,
      code: { lang: 'python', run: true, code: R`
import time
from functools import cache

def paths_fast(grid):
    R, C = len(grid), len(grid[0])
    @cache
    def go(r, c):
        if r >= R or c >= C or grid[r][c] == 1:
            return 0
        if (r, c) == (R - 1, C - 1):
            return 1
        return go(r + 1, c) + go(r, c + 1)
    result = go(0, 0)
    print("   cache:", go.cache_info())
    return result

def paths_dp(grid):
    C = len(grid[0])
    row = [0] * C
    row[0] = 1 if grid[0][0] == 0 else 0
    for r in range(len(grid)):
        for c in range(C):
            if grid[r][c] == 1:
                row[c] = 0
            elif c > 0:
                row[c] += row[c - 1]        # from above (old row[c]) + from left
    return row[-1]

print(paths_fast([[0, 0, 0], [0, 1, 0], [0, 0, 0]]))      # 2
big = [[0] * 16 for _ in range(16)]
t = time.perf_counter(); a = paths_fast(big); dt = time.perf_counter() - t
print(a, f"in {dt * 1000:.2f} ms;  dp agrees: {paths_dp(big) == a}")
` },
      complexity: R`<p>Memoized: O(R·C) time and O(R·C) cache + O(R + C) recursion depth. 1-D DP: O(R·C) time, O(C) space. The brute force was exponential.</p>`,
      followUps: ['Return the count modulo 10<sup>9</sup>+7 — does Python need it?', 'Why must cached functions be pure (no side effects, no mutable inputs)?']
    }
  });

  practice.push({
    title: 'Shrink 1M Sensor Readings in Memory',
    level: 'Medium', tags: ['memory', '__slots__', 'array', 'tracemalloc'], companies: ['Tesla', 'Siemens', 'Bosch'],
    statement: R`<p>An IoT service keeps the last 1,000,000 readings <code>(sensor_id: int, timestamp: float, value: float)</code> in RAM as a list of dicts and is hitting its 512 MB container limit. Measure the current memory per reading with <code>tracemalloc</code>, then design two smaller representations and measure them too.</p>`,
    constraints: R`Must still support: append a reading, read reading i, and compute the average value. Pure standard library.`,
    example: R`<p>List of dicts ≈ ${H.c('r', '~270 bytes/reading')} → 1M readings ≈ 270 MB. <code>__slots__</code> objects ≈ 140 bytes; three <code>array</code> columns ≈ ${H.c('g', '~24 bytes/reading')} (8 + 8 + 8).</p>`,
    brute: { why: R`<p>A dict per record pays for a hash table (keys, hashes, values, spare slots) plus a separate boxed object for every number (24–28 bytes each). The data itself is only 24 bytes per reading; the rest is overhead.</p>`, code: { lang: 'python', run: true, code: R`
import tracemalloc

def build_dicts(n):
    return [{"sensor_id": i % 500, "ts": 1_700_000_000.0 + i, "value": i * 0.1} for i in range(n)]

tracemalloc.start()
data = build_dicts(100_000)
cur, _ = tracemalloc.get_traced_memory()
tracemalloc.stop()
print(f"dicts: {cur / len(data):.0f} bytes per reading")` } },
    mcq: { q: 'Which layout gives the smallest memory per reading in pure Python?', options: ['Column arrays: array("q") / array("d") per field', 'A list of namedtuples', 'A list of dicts with short key names', 'A dict of dicts keyed by index'], answer: 0, explain: 'array stores raw 8-byte machine values without per-value object headers; the other options still create one Python object per number plus a container per record.' },
    hints: [R`<p>Hint 1: two kinds of overhead — the per-record container and the per-value boxed number. Fix the first with <code>__slots__</code>/tuples, the second only with raw arrays.</p>`, R`<p>Hint 2: <code>array("q")</code> stores 64-bit ints, <code>array("d")</code> 64-bit floats; <code>append</code> is amortised O(1) and <code>sum()</code> works on them directly.</p>`, R`<p>Hint 3: wrap the three arrays in a small class with <code>append(sid, ts, v)</code>, <code>__getitem__(i)</code> returning a tuple, and <code>mean()</code>. A bounded "last N" buffer can use a ring index instead of deleting from the front.</p>`],
    solution: {
      approach: R`<p>Measure three layouts with tracemalloc under identical data. The <code>__slots__</code> class keeps the object API with ~2× savings; the column store (struct-of-arrays) gives ~10× by eliminating per-value objects, and is also what NumPy/Arrow would do. Choose by access pattern: row-wise objects for business logic, columns for analytics.</p>`,
      code: { lang: 'python', run: true, code: R`
import tracemalloc
from array import array

class Reading:
    __slots__ = ("sensor_id", "ts", "value")
    def __init__(self, sensor_id, ts, value):
        self.sensor_id, self.ts, self.value = sensor_id, ts, value

class ColumnStore:
    def __init__(self):
        self.sid, self.ts, self.val = array("q"), array("d"), array("d")
    def append(self, sid, ts, v):
        self.sid.append(sid); self.ts.append(ts); self.val.append(v)
    def __getitem__(self, i):
        return self.sid[i], self.ts[i], self.val[i]
    def __len__(self):
        return len(self.val)
    def mean(self):
        return sum(self.val) / len(self.val)

def measure(build, n=100_000):
    tracemalloc.start()
    obj = build(n)
    cur, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return cur / n, obj

def dicts(n): return [{"sensor_id": i % 500, "ts": 1.7e9 + i, "value": i * 0.1} for i in range(n)]
def slots(n): return [Reading(i % 500, 1.7e9 + i, i * 0.1) for i in range(n)]
def columns(n):
    cs = ColumnStore()
    for i in range(n):
        cs.append(i % 500, 1.7e9 + i, i * 0.1)
    return cs

for name, fn in (("dicts", dicts), ("slots", slots), ("columns", columns)):
    per, obj = measure(fn)
    print(f"{name:<8} {per:6.1f} bytes/reading")
cs = columns(5)
print(cs[2], round(cs.mean(), 3), len(cs))
` },
      complexity: R`<p>All layouts: O(1) append (amortised) and O(1) index, O(n) mean. Memory: ~270 → ~140 → ~24–26 bytes per reading (arrays over-allocate a little while growing).</p>`,
      followUps: ['Make it a fixed-size ring buffer of the last N readings', 'Move to NumPy structured arrays or Arrow — what do you gain?', 'Why might the container RSS not drop after deleting the dict version?']
    }
  });

  practice.push({
    title: 'Live Leaderboard: Stop Re-Sorting After Every Score',
    level: 'Medium', tags: ['heapq', 'profiling', 'top-k'], companies: ['Riot Games', 'Dream11', 'Zynga'],
    statement: R`<p>A game server receives a stream of scores and, after <b>each</b> score, must report the current top 3. The existing code appends then calls <code>sorted()</code> every time; the profile shows 95% of time in <code>sorted</code>. Make each update O(log k).</p>`,
    constraints: R`Up to 10<sup>6</sup> scores; k = 3 (general k ≤ 100). Report the top k in descending order after each score.`,
    example: R`<p>Scores <code>5, 1, 9, 7, 3</code> → after each: <code>[5]</code>, <code>[5, 1]</code>, <code>[9, 5, 1]</code>, <code>[9, 7, 5]</code>, <code>${H.c('g', '[9, 7, 5]')}</code> (3 is too small to enter).</p>`,
    brute: { why: R`<p>Sorting all scores so far after each insert costs O(i log i) at step i → O(n² log n) total, and keeps every score in memory even though only the top 3 matter.</p>`, code: { lang: 'python', run: true, code: R`
def leaderboard_slow(scores, k=3):
    seen, out = [], []
    for s in scores:
        seen.append(s)
        out.append(sorted(seen, reverse=True)[:k])   # full sort every time
    return out

print(leaderboard_slow([5, 1, 9, 7, 3]))` } },
    mcq: { q: 'Which structure keeps the top k with O(log k) per update?', options: ['A min-heap of size k (root = weakest of the top k)', 'A max-heap of all scores', 'A sorted list with insert()', 'A set'], answer: 0, explain: 'Compare the new score with the heap root (the smallest of the current top k); replace it if bigger with heapreplace — O(log k). A max-heap of everything needs O(n) memory and O(k log n) to read the top k.' },
    hints: [R`<p>Hint 1: you only ever need to know the <b>smallest</b> member of the current top k to decide if a new score gets in.</p>`, R`<p>Hint 2: <code>heapq</code> is a min-heap: while the heap has fewer than k items <code>heappush</code>; otherwise if score &gt; heap[0], <code>heapreplace</code>.</p>`, R`<p>Hint 3: reporting needs <code>sorted(heap, reverse=True)</code> — that is O(k log k) with k = 3, effectively constant. Profile again afterwards to confirm the hot spot moved.</p>`],
    solution: {
      approach: R`<p>Maintain a size-k min-heap. Each update is O(log k), memory O(k). Verify with cProfile: <code>sorted</code> disappears from the top of the report.</p>`,
      code: { lang: 'python', run: true, code: R`
import cProfile
import heapq
import io
import pstats
import random

def leaderboard_fast(scores, k=3):
    heap, out = [], []
    for s in scores:
        if len(heap) < k:
            heapq.heappush(heap, s)
        elif s > heap[0]:
            heapq.heapreplace(heap, s)        # pop weakest + push new, O(log k)
        out.append(sorted(heap, reverse=True))
    return out

print(leaderboard_fast([5, 1, 9, 7, 3]))     # [[5], [5, 1], [9, 5, 1], [9, 7, 5], [9, 7, 5]]

random.seed(5)
stream = [random.randrange(10**6) for _ in range(100_000)]
pr = cProfile.Profile()
pr.enable(); leaderboard_fast(stream); pr.disable()
buf = io.StringIO()
pstats.Stats(pr, stream=buf).sort_stats("tottime").print_stats(3)
print("\n".join(buf.getvalue().splitlines()[:12]))
` },
      complexity: R`<p>O(n log k) time total, O(k) memory, versus O(n² log n) time and O(n) memory before.</p>`,
      followUps: ['Support score updates for existing players (lazy deletion or a sorted container)', 'Top-k across 50 game servers — merge per-server heaps with <code>heapq.merge</code> / nlargest']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Predict: Comprehension Inside a Class Body',
    level: 'Hard', tags: ['scope', 'class body', 'comprehension', 'predict output'], companies: ['Google', 'Two Sigma', 'Dropbox'],
    statement: R`<p>Predict what each class definition does, explain the scoping rule, and give a clean fix for <code>A</code>.</p><pre>class A:
    base = 10
    values = [base + i for i in range(3)]

class B:
    n = 3
    values = [i for i in range(n)]</pre>`,
    constraints: R`Your explanation must say which parts of a comprehension are evaluated in which scope. The fix must not use globals.`,
    example: R`<p><code>A</code> → <code>${H.c('r', "NameError: name 'base' is not defined")}</code>. <code>B</code> → works, <code>B.values == ${H.c('g', '[0, 1, 2]')}</code>. Same class, same kind of comprehension — different result!</p>`,
    brute: { why: R`<p>Intuition says "the comprehension is inside the class, so it sees class variables". But a class body is <b>not</b> an enclosing scope for nested functions/comprehensions: names defined in a class are invisible inside them (that is why methods must write <code>self.x</code>). The one exception: the <b>outermost iterable</b> (<code>range(n)</code> in B) is evaluated directly in the class scope before the comprehension's own scope starts.</p>`, code: { lang: 'python', run: true, code: R`
try:
    class A:
        base = 10
        values = [base + i for i in range(3)]   # base used in the inner expression
except NameError as e:
    print("A ->", type(e).__name__, e)

class B:
    n = 3
    values = [i for i in range(n)]              # n used in the OUTERMOST iterable: OK
print("B ->", B.values)` } },
    mcq: { q: 'Which part of <code>[expr for x in ITER if cond]</code> is evaluated in the enclosing (class) scope?', options: ['Only ITER, the outermost iterable', 'expr and cond', 'Everything', 'Nothing'], answer: 0, explain: 'The first iterable is evaluated eagerly in the enclosing scope (and passed in); expr, cond and any inner iterables run in the comprehension scope, which skips class scopes during name lookup. PEP 709 inlining (3.12) kept this behaviour.' },
    hints: [R`<p>Hint 1: LEGB lookup goes Local → Enclosing <b>function</b> → Global → Builtin. Class bodies are not "E".</p>`, R`<p>Hint 2: you can smuggle the value in through the outermost iterable or a default argument, but clearer fixes compute the list with a helper function or after the class body.</p>`, R`<p>Hint 3: clean fixes — (a) a module-level helper <code>def _values(base): return [base + i for i in range(3)]</code> called in the class body; (b) set it after the class: <code>A.values = [A.base + i for i in range(3)]</code>; (c) a <code>@classmethod</code>/<code>functools.cached_property</code> if it should be computed lazily.</p>`],
    solution: {
      approach: R`<p>Pass class-level values into a function explicitly. A helper function called from the class body receives <code>base</code> as an argument, so no scope magic is needed and the intent is obvious. Mention the hack <code>[b + i for b in [base] for i in range(3)]</code> only to show you understand the outermost-iterable rule.</p>`,
      code: { lang: 'python', run: true, code: R`
def _offsets(base, n):
    return [base + i for i in range(n)]

class A:
    base = 10
    values = _offsets(base, 3)                     # explicit argument: clear and correct

class A2:
    base = 10
    values = [b + i for b in [base] for i in range(3)]   # works: [base] is the outermost iterable

print(A.values, A2.values)                          # [10, 11, 12] [10, 11, 12]
` },
      dry: { head: ['piece', 'evaluated in', 'sees class names?'], rows: [
        ['range(3) / range(n) (outermost iterable)', 'class body scope', '<span class="c-g">yes</span>'],
        ['base + i (element expression)', 'comprehension scope', '<span class="c-r">no → NameError</span>'],
        ['if-conditions, inner for-iterables', 'comprehension scope', '<span class="c-r">no</span>']
      ] },
      complexity: R`<p>O(n) to build the list; the issue is purely about name resolution at class-creation time.</p>`,
      followUps: ['Does the same NameError happen with a lambda in a class body?', 'Why do methods need <code>self.</code> or <code>ClassName.</code> to read class attributes?']
    }
  });

  practice.push({
    title: 'Predict: The Set That Lost Its Element (mutable hash key)',
    level: 'Hard', tags: ['__hash__', '__eq__', 'hash table', 'predict output'], companies: ['Meta', 'LinkedIn', 'Databricks'],
    statement: R`<p>Predict the three printed values, explain them with how hash tables work, and redesign <code>Point</code> so this bug is impossible.</p><pre>class Point:
    def __init__(self, x, y): self.x, self.y = x, y
    def __eq__(self, o): return (self.x, self.y) == (o.x, o.y)
    def __hash__(self): return hash((self.x, self.y))

p = Point(1, 2)
seen = {p}
p.x = 99
print(p in seen, Point(1, 2) in seen, len(seen))</pre>`,
    constraints: R`The redesigned class must still be usable as a dict key and in sets, and compare by value.`,
    example: R`<p>Output: <code>${H.c('r', 'False False 1')}</code>. The point is <i>inside</i> the set (length 1), yet neither the mutated object nor an equal fresh <code>Point(1, 2)</code> can find it.</p>`,
    brute: { why: R`<p>A set stores each element in the bucket chosen by its hash <b>at insertion time</b>. After <code>p.x = 99</code>, <code>hash(p)</code> changes, so <code>p in seen</code> probes a different bucket → not found. <code>Point(1, 2)</code> has the old hash and probes the right bucket, but <code>__eq__</code> compares (1, 2) with the mutated (99, 2) → not equal → not found. The element is stranded.</p>`, code: { lang: 'python', run: true, code: R`
class Point:
    def __init__(self, x, y): self.x, self.y = x, y
    def __eq__(self, o): return (self.x, self.y) == (o.x, o.y)
    def __hash__(self): return hash((self.x, self.y))

p = Point(1, 2)
seen = {p}
p.x = 99
print(p in seen, Point(1, 2) in seen, len(seen))   # False False 1
print(any(q is p for q in seen))                    # True: it IS in there` } },
    mcq: { q: 'What is the rule this code breaks?', options: ['An object\'s hash must never change while it is in a hash-based container (hash must depend only on immutable state)', 'Classes must not define __eq__', '__hash__ must return a positive number', 'Sets can only hold built-in types'], answer: 0, explain: 'Equal objects must have equal hashes, and the hash must stay constant for the object\'s lifetime in a dict/set. Hashing mutable fields violates the second rule.' },
    hints: [R`<p>Hint 1: draw the hash table: the element sits in the bucket for hash((1, 2)). Where does each lookup go?</p>`, R`<p>Hint 2: make the fields immutable: <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code> and blocks assignment with <code>FrozenInstanceError</code>.</p>`, R`<p>Hint 3: alternatives — <code>typing.NamedTuple</code>; or keep the class mutable but hash by identity (do not define <code>__hash__</code>/<code>__eq__</code>), or set <code>__hash__ = None</code> to make it explicitly unhashable.</p>`],
    solution: {
      approach: R`<p>Hash only immutable state. A frozen dataclass makes the contract enforced by the language: equal values → equal hashes, and the value cannot change after creation. To "move" a point, create a new one with <code>dataclasses.replace</code>.</p>`,
      code: { lang: 'python', run: true, code: R`
from dataclasses import FrozenInstanceError, dataclass, replace

@dataclass(frozen=True)
class Point:
    x: int
    y: int

p = Point(1, 2)
seen = {p}
try:
    p.x = 99
except FrozenInstanceError as e:
    print("blocked:", type(e).__name__)
q = replace(p, x=99)                     # a NEW point instead of mutating
print(p in seen, Point(1, 2) in seen, q in seen, len(seen))   # True True False 1
` },
      dry: { head: ['step', 'hash used', 'bucket probed', 'eq check', 'found?'], rows: [
        ['add p=(1,2)', 'h(1,2)', 'B1', '—', 'stored in B1'],
        ['p.x = 99', '—', '—', '—', 'p still sits in B1'],
        ['p in seen', 'h(99,2)', 'B2 (empty)', '—', '<span class="c-r">False</span>'],
        ['Point(1,2) in seen', 'h(1,2)', 'B1', '(1,2) == (99,2)? no', '<span class="c-r">False</span>']
      ] },
      complexity: R`<p>O(1) average set operations once the contract holds. Breaking it does not slow things down — it silently loses data, which is worse.</p>`,
      followUps: ['Why do lists define <code>__hash__ = None</code>?', 'Is a tuple containing a list hashable?', 'What happens to dict lookups if two unequal objects share a hash?']
    }
  });

  practice.push({
    title: 'Vectorize Nearest-Centre Assignment (k-means step)',
    level: 'Hard', tags: ['numpy', 'broadcasting', 'vectorization', 'memory'], companies: ['NVIDIA', 'Spotify', 'Uber'],
    statement: R`<p>Assign each of n 2-D points to its nearest of k centres (the k-means "assignment step"). The triple-nested Python loop takes minutes for n = 10<sup>6</sup>, k = 64. Write (a) a faster pure-Python version and (b) a NumPy version that never needs more than ~100 MB of temporary memory.</p>`,
    constraints: R`n ≤ 10<sup>6</sup>, k ≤ 1024, d = 2 (but the NumPy version should work for any d). Return a list/array of centre indexes; ties → the lower index.`,
    example: R`<p>points <code>[(0,0), (9,9), (5,4)]</code>, centres <code>[(0,0), (10,10)]</code> → <code>${H.c('g', '[0, 1, 0]')}</code>. (5,4) is √41 ≈ 6.4 from (0,0) and √61 ≈ 7.8 from (10,10).</p>`,
    brute: { why: R`<p>n·k·d Python-level operations (6.4·10<sup>7</sup> distance computations with per-element bytecode, a <code>sqrt</code> call each, and manual min tracking). The square root is also unnecessary — comparing <b>squared</b> distances gives the same winner.</p>`, code: { lang: 'python', run: true, code: R`
import math

def assign_slow(points, centres):
    labels = []
    for p in points:
        best, best_d = -1, float("inf")
        for j, c in enumerate(centres):
            s = 0.0
            for a, b in zip(p, c):
                s += (a - b) ** 2
            dist = math.sqrt(s)            # unnecessary sqrt
            if dist < best_d:
                best, best_d = j, dist
        labels.append(best)
    return labels

print(assign_slow([(0, 0), (9, 9), (5, 4)], [(0, 0), (10, 10)]))` } },
    mcq: { q: 'A naive broadcast <code>pts[:, None, :] - centres[None, :, :]</code> for n = 10<sup>6</sup>, k = 1024, d = 2 in float64 allocates about…', options: ['16 GB for the difference array alone', '16 MB', '160 KB', 'nothing — broadcasting never allocates'], answer: 0, explain: 'The result has n·k·d = 2·10⁹ elements × 8 bytes = 16 GB. Broadcasting avoids copying the INPUTS, but the OUTPUT is fully materialised. Chunk over points or use the dot-product expansion.' },
    hints: [R`<p>Hint 1: drop the sqrt; and in pure Python, <code>min(range(k), key=...)</code> with <code>math.dist</code> or an inlined squared distance moves work into C.</p>`, R`<p>Hint 2: NumPy — squared distance expands to <code>‖p‖² − 2·p·c + ‖c‖²</code>; the middle term for all pairs is one matrix multiply <code>P @ C.T</code> (BLAS, multithreaded), producing an (n, k) matrix — no (n, k, d) tensor.</p>`, R`<p>Hint 3: process points in chunks of, say, 16,384 rows so each (chunk, k) matrix is ~130 MB at k = 1024 (or ~8 MB at k = 64), then <code>argmin(axis=1)</code> per chunk. Tie-break: argmin returns the first minimum → lower index.</p>`],
    solution: {
      approach: R`<p>Vectorized: precompute <code>‖c‖²</code> once; for each chunk of points compute <code>D = ‖c‖² − 2·P·Cᵀ</code> (‖p‖² is the same for every centre of a given point, so it cannot change the argmin and can be dropped), then <code>argmin(axis=1)</code>. Work is the same O(n·k·d) but runs in BLAS at GFLOP speed; chunking bounds temporary memory. Pure-Python fallback: squared distances + <code>min</code> with a key.</p>`,
      code: { lang: 'python', check: false, code: R`
import numpy as np

def assign_numpy(points, centres, chunk=16_384):
    P = np.asarray(points, dtype=np.float64)        # (n, d)
    C = np.asarray(centres, dtype=np.float64)       # (k, d)
    c_sq = (C * C).sum(axis=1)                      # (k,)  ||c||^2, computed once
    labels = np.empty(len(P), dtype=np.int64)
    for start in range(0, len(P), chunk):
        block = P[start:start + chunk]              # view, no copy
        # ||p||^2 is constant per row -> irrelevant for argmin, so skip it
        d = c_sq[None, :] - 2.0 * (block @ C.T)     # (chunk, k) via BLAS
        labels[start:start + chunk] = d.argmin(axis=1)
    return labels

print(assign_numpy([(0, 0), (9, 9), (5, 4)], [(0, 0), (10, 10)]))   # [0 1 0]
rng = np.random.default_rng(0)
pts, cen = rng.random((1_000_000, 2)), rng.random((64, 2))
print(np.bincount(assign_numpy(pts, cen), minlength=64)[:8])` },
      alt: [{ lang: 'python', run: true, title: 'Pure Python, faster', code: R`
import random
import time

def assign_fast(points, centres):
    idx = range(len(centres))
    out = []
    for px, py in points:
        # squared distance, no sqrt; min() loop runs in C, key in Python
        out.append(min(idx, key=lambda j: (px - centres[j][0]) ** 2 + (py - centres[j][1]) ** 2))
    return out

print(assign_fast([(0, 0), (9, 9), (5, 4)], [(0, 0), (10, 10)]))   # [0, 1, 0]
random.seed(0)
pts = [(random.random(), random.random()) for _ in range(20_000)]
cen = [(random.random(), random.random()) for _ in range(16)]
t = time.perf_counter(); lab = assign_fast(pts, cen)
print(f"{len(lab)} points in {(time.perf_counter() - t) * 1000:.0f} ms")` }],
      complexity: R`<p>All versions O(n·k·d) arithmetic. NumPy: one GEMM per chunk, memory O(chunk·k + n). Pure-Python fast: O(n·k) with smaller constant than the brute force; NumPy is typically 50–200× faster again.</p>`,
      followUps: ['Implement the update step (new centres = mean of assigned points) with <code>np.bincount</code> weights or <code>np.add.at</code>', 'When is a KD-tree (<code>scipy.spatial.cKDTree</code>) better than brute force?', 'Run it on GPU with CuPy or PyTorch — what changes?']
    }
  });

  practice.push({
    title: 'Profile-Driven Fix: p95 Latency per Endpoint',
    level: 'Hard', tags: ['profiling', 'grouping', 'sorting', 'performance'], companies: ['Datadog', 'New Relic', 'Grafana Labs'],
    statement: R`<p>Given request records <code>(endpoint, latency_ms)</code>, return a dict <code>endpoint → p95 latency</code> using the nearest-rank method (sort the endpoint's latencies ascending and take index <code>ceil(0.95·m) − 1</code>). The current code loops over every endpoint and re-filters the whole list each time. With 2·10<sup>6</sup> records and 5,000 endpoints it takes over an hour. Profile, explain the hot spot, and fix it.</p>`,
    constraints: R`n ≤ 2·10<sup>6</sup> records, E ≤ 10<sup>4</sup> endpoints, latencies are non-negative floats. Output keys sorted by endpoint name.`,
    example: R`<p>Records for "/a": latencies 10, 20, …, 200 (20 values) → ceil(0.95·20) − 1 = 18 → <code>${H.c('g', '190')}</code>. "/b": [5] → ceil(0.95) − 1 = 0 → <code>${H.c('g', '5')}</code>.</p>`,
    brute: { why: R`<p>For each of E endpoints it scans all n records: O(E·n) = 10<sup>10</sup> comparisons. cProfile shows one list comprehension line with enormous tottime and the function called E times. Algorithmic, not micro: group once, then work per group.</p>`, code: { lang: 'python', run: true, code: R`
import math

def p95_slow(records):
    out = {}
    for ep in sorted({e for e, _ in records}):
        lat = sorted(l for e, l in records if e == ep)   # full scan per endpoint
        out[ep] = lat[math.ceil(0.95 * len(lat)) - 1]
    return out

recs = [("/a", float(v)) for v in range(10, 201, 10)] + [("/b", 5.0)]
print(p95_slow(recs))         # {'/a': 190.0, '/b': 5.0}` } },
    mcq: { q: 'After grouping in one pass, what is the cheapest exact way to get each p95?', options: ['Sort each group (total O(n log n)) or use a selection algorithm per group', 'Sort the entire record list once by latency and scan', 'Use statistics.mean', 'Keep a running average per endpoint'], answer: 0, explain: 'Per-group sorting costs Σ m log m ≤ n log n. heapq.nlargest(k) with k = m − ceil(0.95m) + 1 (the top ~5%) is even cheaper for big groups. Means and running averages are not percentiles.' },
    hints: [R`<p>Hint 1: the profile says the same full list is scanned E times. Visit each record exactly once: <code>defaultdict(list)</code> keyed by endpoint.</p>`, R`<p>Hint 2: per group, the p95 element is the (m − r + 1)-th largest where r = ceil(0.95·m). <code>heapq.nlargest(m − r + 1, group)[-1]</code> touches the group once with a small heap — or just <code>sorted(group)[r − 1]</code>.</p>`, R`<p>Hint 3: for streaming / huge data, exact percentiles need all values; production systems use mergeable sketches (t-digest, DDSketch, HDR histograms) with bounded memory and known error.</p>`],
    solution: {
      approach: R`<p>One grouping pass (O(n)), then per-group selection. Total O(n log n) worst case instead of O(E·n). Verify by profiling again: time should now be dominated by the single grouping loop and the per-group sort, both proportional to n.</p>`,
      code: { lang: 'python', run: true, code: R`
import heapq
import math
import random
import time
from collections import defaultdict

def p95_fast(records):
    groups = defaultdict(list)
    for ep, lat in records:                     # ONE pass over the data
        groups[ep].append(lat)
    out = {}
    for ep in sorted(groups):
        g = groups[ep]
        r = math.ceil(0.95 * len(g))            # nearest-rank position (1-based)
        out[ep] = heapq.nlargest(len(g) - r + 1, g)[-1]   # r-th smallest
    return out

recs = [("/a", float(v)) for v in range(10, 201, 10)] + [("/b", 5.0)]
print(p95_fast(recs))                           # {'/a': 190.0, '/b': 5.0}

random.seed(2)
big = [(f"/ep{random.randrange(500)}", random.expovariate(1 / 40)) for _ in range(200_000)]
t = time.perf_counter(); res = p95_fast(big); dt = time.perf_counter() - t
print(len(res), "endpoints in", f"{dt * 1000:.0f} ms")
` },
      dry: { head: ['group', 'm', 'r = ceil(0.95·m)', 'nlargest(m − r + 1)', 'p95'], rows: [
        ['/a', '20', '19', 'top 2 → [200, 190]', '<span class="c-g">190</span>'],
        ['/b', '1', '1', 'top 1 → [5]', '<span class="c-g">5</span>']
      ] },
      complexity: R`<p>O(n) grouping + Σ O(m log(m − r + 1)) selection ≈ O(n log(n/20)) worst case, O(n) memory. Brute force was O(E·n + n log n).</p>`,
      followUps: ['Compute p50/p95/p99 in one pass per group', 'Records arrive as an endless stream — which sketch would you use and why?', 'Parallelise across files: which partial results are mergeable (counts, sums) and which are not (exact percentiles)?']
    }
  });

  practice.push({
    title: 'Predict: Numbers That Collapse into One Key',
    level: 'Hard', tags: ['hashing', 'numeric tower', 'NaN', 'predict output'], companies: ['Jane Street', 'Citadel', 'Hudson River Trading'],
    statement: R`<p>Predict all five lines on CPython (64-bit), and explain each with the hash/equality rules for Python numbers.</p><pre>print({True: "a", 1: "b", 1.0: "c"})
print(len({0, 0.0, False, -0.0}))
print(hash(-1) == hash(-2))
print({1, True, 1.0} == {1})
print(float("nan") in {float("nan")})</pre>`,
    constraints: R`Explain the invariant "a == b ⇒ hash(a) == hash(b)", how Python makes it hold across int/float/bool/Decimal/Fraction, and the identity shortcut.`,
    example: R`<p>Line 1 → <code>${H.c('g', "{True: 'c'}")}</code>: all three keys are equal with equal hashes, so they are one key; the first key object (True) stays, the last value ("c") wins.</p>`,
    brute: { why: R`<p>Guessing "3 keys" or "4 elements" treats <code>True</code>, <code>1</code> and <code>1.0</code> as different because their types differ. Python's rule is about <b>equality</b>, not type: equal numbers must hash equally, so containers treat them as the same element.</p>`, code: { lang: 'python', run: true, code: R`
# naive mental model: "different types -> different keys"
keys = [True, 1, 1.0]
print([type(k).__name__ for k in keys], "<- 3 types, but...")
print(True == 1 == 1.0, hash(True) == hash(1) == hash(1.0))` } },
    mcq: { q: 'Why is <code>hash(-1) == hash(-2)</code> True in CPython?', options: ['−1 is reserved as an error signal in the C hash API, so hash(−1) is changed to −2', 'Negative numbers all hash to −2', 'It is random per process', 'Because −1 == −2 modulo 2'], answer: 0, explain: 'C-level tp_hash functions return −1 to mean "an error occurred", so an int whose hash would be −1 gets −2 instead. Collisions are legal; only equal ⇒ equal-hash is required.' },
    hints: [R`<p>Hint 1: <code>bool</code> is a subclass of <code>int</code>; <code>True == 1</code> and <code>False == 0 == 0.0 == -0.0</code>.</p>`, R`<p>Hint 2: numeric hashes are defined mathematically (reduction modulo the prime 2<sup>61</sup> − 1 on 64-bit) so that equal int, float, Fraction and Decimal values hash the same.</p>`, R`<p>Hint 3: containers check <code>is</code> before <code>==</code>. Two separately created NaN objects are not identical and NaN ≠ NaN, so the lookup fails; the same NaN object would be found.</p>`],
    solution: {
      approach: R`<p>Apply the invariant: equal ⇒ same hash ⇒ same slot ⇒ same key. Line 2: 0, 0.0, False, −0.0 are all equal → 1 element. Line 3: −1's hash is remapped to −2 (C API error sentinel). Line 4: the set collapses to <code>{1}</code>. Line 5: distinct NaN objects, NaN != NaN → False.</p>`,
      code: { lang: 'python', run: true, code: R`
print({True: "a", 1: "b", 1.0: "c"})       # {True: 'c'}
print(len({0, 0.0, False, -0.0}))          # 1
print(hash(-1) == hash(-2))                # True (CPython detail)
print({1, True, 1.0} == {1})               # True
print(float("nan") in {float("nan")})      # False: two different NaN objects
x = float("nan")
print(x in {x})                            # True: identity shortcut

from decimal import Decimal
from fractions import Fraction
print(hash(0.5) == hash(Fraction(1, 2)) == hash(Decimal("0.5")))   # True
` },
      dry: { head: ['line', 'key rule', 'output'], rows: [
        ['1', 'True == 1 == 1.0, equal hashes → one key', "{True: 'c'}"],
        ['2', '0 == 0.0 == False == -0.0', '1'],
        ['3', 'hash(-1) remapped to -2', 'True'],
        ['4', '{1, True, 1.0} collapses to {1}', 'True'],
        ['5', 'different NaN objects; NaN != NaN', 'False']
      ] },
      complexity: R`<p>O(1) per hash operation. The lesson: mixing bools and ints (or ints and floats) as keys in one dict silently merges entries — a real bug source in JSON/CSV processing.</p>`,
      followUps: ['Why is <code>hash(float("inf"))</code> a fixed number but NaN hashing changed in 3.10 to use object identity?', 'How would you count True and 1 separately in a Counter?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: R`In a cProfile report, which column tells you how much time was spent in a function's <b>own</b> code, excluding the functions it called?`, options: ['tottime', 'cumtime', 'ncalls', 'percall (cumulative)'], answer: 0, explain: R`<code>tottime</code> excludes sub-calls, so the biggest tottime is the function whose own lines burn CPU. <code>cumtime</code> includes everything called beneath it.` },
    { q: R`A function takes 30% of runtime. You make it 10× faster. Roughly how much faster is the whole program?`, options: ['≈1.37×', '≈10×', '≈3×', '≈1.03×'], answer: 0, explain: R`Amdahl: new time = 0.7 + 0.3/10 = 0.73 → 1/0.73 ≈ 1.37×. The untouched 70% dominates.` },
    { q: R`Why does <code>timeit.repeat</code> advice say to look at the <b>minimum</b> of the runs?`, options: ['Noise (other processes, GC, frequency scaling) only ever makes runs slower, so the minimum is the least-disturbed measurement', 'The minimum is always the first run', 'The mean is mathematically undefined for timings', 'timeit only returns one value'], answer: 0, explain: R`Interference adds time, never removes it. For distributions and statistical comparisons use <code>pyperf</code>, which reports mean ± std dev across worker processes.` },
    { q: R`What does this print? <code>def f(a=[]): a.append(1); return len(a)</code> then <code>print(f(), f(), f([]))</code>`, options: ['1 2 1', '1 1 1', '1 2 3', '3 3 1'], answer: 0, explain: R`The default list is shared: the first call makes it length 1, the second length 2. The third call passes its own new list → 1. (These are ints, so print shows the values at call time.)` },
    { q: R`<code>fns = [lambda: i for i in range(3)]; print([f() for f in fns])</code>`, options: ['[2, 2, 2]', '[0, 1, 2]', '[0, 0, 0]', 'NameError'], answer: 0, explain: R`Closures look up <code>i</code> when called; by then it is 2. Fix with <code>lambda i=i: i</code>.` },
    { q: R`<code>t = (1, [2]); t[1] += [3]</code> raises TypeError. What is <code>t</code> afterwards?`, options: ['(1, [2, 3])', '(1, [2])', '(1, [2], [3])', 't is deleted'], answer: 0, explain: R`<code>+=</code> first calls <code>list.__iadd__</code> (mutates in place), then tries <code>t[1] = result</code>, which fails because tuples do not support item assignment. The mutation already happened.` },
    { q: R`For an array of <b>10 numbers</b>, which is usually faster in CPython: a plain loop/<code>sum</code>, or converting to NumPy and calling <code>.sum()</code>?`, options: ['The plain Python version — NumPy has ~µs fixed overhead per call plus conversion cost', 'NumPy, always', 'They are identical', 'NumPy cannot sum 10 numbers'], answer: 0, explain: R`Vectorization wins for large arrays; for tiny ones the per-call overhead and list→array conversion dominate.` },
    { q: R`<code>a = np.arange(6); v = a[1:4]; v[0] = 99</code>. What happened to <code>a</code>?`, options: ['a[1] is now 99 — basic slices are views sharing memory', 'Nothing — slices copy', 'a raises an error because v is read-only', 'a becomes [99, 99, 99, 3, 4, 5]'], answer: 0, explain: R`Basic slicing returns a view (new strides, same buffer). Fancy indexing (<code>a[[1, 2, 3]]</code>) and boolean masks return copies. Use <code>.copy()</code> when you need independence.` },
    { q: R`Which statement about <code>sys.getsizeof(my_list)</code> is true?`, options: ['It counts the list object and its pointer array, not the objects the list refers to', 'It returns the deep size of the list and its contents', 'It returns the number of elements', 'It works only for NumPy arrays'], answer: 0, explain: R`getsizeof is shallow. Use tracemalloc (allocations) or a recursive walker for deep size.` },
    { q: R`What is the main memory benefit of <code>__slots__</code>?`, options: ['Instances do not get a per-instance __dict__, so each object is smaller and attribute layout is fixed', 'Attributes are stored on disk', 'It makes the class immutable', 'It disables garbage collection for the class'], answer: 0, explain: R`Slots store attributes in fixed C-level slots. Side effects: no new attributes, no <code>__weakref__</code> unless listed, care with multiple inheritance.` },
    { q: R`Your profile shows 90% of wall time waiting on HTTP calls and only 5% CPU. Which change helps most?`, options: ['Overlap the requests (asyncio / thread pool) or batch them', 'Rewrite the parsing code in Cython', 'Switch to PyPy', 'Add __slots__ to the response objects'], answer: 0, explain: R`I/O-bound time cannot be compiled away. Concurrency or fewer round-trips attacks the actual bottleneck.` },
    { q: R`Why is <b>untyped</b> Cython code often barely faster than CPython?`, options: ['Variables are still generic PyObjects, so every operation goes through the Python C API with boxing and type checks', 'Cython compiles to bytecode', 'Cython does not support loops', 'It runs inside the same interpreter loop'], answer: 0, explain: R`The speed comes from <code>cdef</code> C types and typed memoryviews, which turn operations into plain C arithmetic.` },
    { q: R`In a <code>pyproject.toml</code>, what does the <code>[build-system]</code> table tell a frontend like pip or uv?`, options: ['Which packages to install in an isolated env and which backend object to call to build sdists/wheels', 'The runtime dependencies of the project', 'Which tests to run', 'Where to upload the package'], answer: 0, explain: R`PEP 518 <code>requires</code> + PEP 517 <code>build-backend</code>. Runtime deps live in <code>[project].dependencies</code>.` },
    { q: R`A wheel is named <code>pkg-1.0-cp312-abi3-manylinux_2_28_x86_64.whl</code>. On which interpreters can it be installed?`, options: ['CPython 3.12 and newer on x86-64 Linux with glibc ≥ 2.28', 'Only CPython 3.12 on any OS', 'Any Python on any OS', 'PyPy only'], answer: 0, explain: R`<code>abi3</code> = stable ABI, valid for the tagged minimum version and later; the platform tag pins OS, libc version and CPU.` },
    { q: R`What does <code>print({True: 1, 1: 2, 1.0: 3})</code> output?`, options: ['{True: 3}', '{True: 1, 1: 2, 1.0: 3}', '{1.0: 3}', '{1: 3}'], answer: 0, explain: R`All three keys are equal with equal hashes: one key. Dicts keep the first key object and overwrite the value.` },
    { q: R`What does this print? <code>x = 10</code>, <code>def g(): print(x); x = 5</code>, then <code>g()</code>`, options: ['UnboundLocalError', '10', '5', 'None'], answer: 0, explain: R`Because <code>x</code> is assigned somewhere in <code>g</code>, the compiler makes it local for the whole function; reading it before assignment fails.` }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: R`Your Python service got 3× slower after a release. Walk me through how you find the cause.`, level: 'I', a: R`<p>1) <b>Reproduce and quantify</b>: which endpoint/job, p50 vs p99, CPU vs wall time (if CPU is flat and latency rose, it is I/O or lock waiting). 2) <b>Diff the release</b> for obvious suspects (new dependency, query, logging). 3) <b>Profile</b> — locally with <code>cProfile</code> + <code>pstats</code> sorted by cumtime then tottime, or in production with a sampling profiler (<code>py-spy record</code>, continuous profiling) and compare flame graphs before/after. 4) Look for the classic shapes: a function called far more often (N+1 queries, missing cache), an O(n²) pattern (<code>in list</code>, <code>pop(0)</code>), or heavy serialization. 5) Fix the top item only, <b>benchmark</b> with realistic data, deploy, and re-profile. Amdahl's law guides what is worth fixing.</p>`, followUps: ['How do you profile without restarting the process?', 'What if the profile is flat — no single hot spot?', 'How would you prevent this regression in CI?'] },
    { q: R`Explain the mutable default argument problem and how to fix it. Is it ever intentional?`, level: 'B', a: R`<p>Default values are evaluated <b>once</b>, when the <code>def</code> statement runs, and stored in <code>func.__defaults__</code>. If the default is mutable (<code>[]</code>, <code>{}</code>, a set, an object) every call that omits the argument shares and mutates the same object, so state leaks between calls. Fix: use <code>None</code> (or a private sentinel <code>object()</code> when None is meaningful) and create the object inside the body. Related forms: <code>datetime.now()</code> defaults freeze at import, class-level lists are shared by instances, and dataclasses require <code>field(default_factory=list)</code>. It is occasionally used deliberately as a cache (<code>def f(n, _memo={})</code>), but <code>functools.cache</code> expresses that more clearly. Linters flag it (ruff B006/B008).</p>`, followUps: ['Why does Python evaluate defaults at definition time?', 'How does the same rule help fix late-binding closures?'] },
    { q: R`cProfile vs py-spy vs line_profiler vs tracemalloc — when do you use each?`, level: 'I', a: R`<p><b>cProfile</b> (stdlib, deterministic): exact call counts and per-function times for a whole run; overhead on call-heavy code; best for local investigation and tests. <b>py-spy</b> (sampling, external): attaches to a running PID, near-zero overhead, flame graphs, sees native frames; best in production or for hangs (<code>py-spy dump</code>). <b>line_profiler</b>: per-line timings for functions you decorate; use after cProfile has found the slow function. <b>tracemalloc</b> (stdlib): memory allocations by line, snapshots and diffs; for leaks and peak memory (memray is the richer third-party option). Plus <code>timeit</code>/<code>pyperf</code> for micro-benchmarks to confirm a fix, and Scalene for combined CPU/GPU/memory views.</p>`, followUps: ['Why can cProfile exaggerate the cost of tiny functions?', 'What is PEP 669 and why do profiler authors care?'] },
    { q: R`What does "vectorization" mean in NumPy and why is it fast? When is it the wrong tool?`, level: 'I', a: R`<p>Vectorization replaces Python-level loops with whole-array operations (ufuncs, reductions, broadcasting, boolean masks). It is fast because an ndarray stores unboxed values contiguously with one dtype, so a single C loop (often SIMD, or BLAS for linear algebra) processes all elements without per-element interpreter dispatch, type checks or object allocation — typically 10–100× faster. It is the wrong tool for tiny arrays (fixed ~µs call overhead), logic with complex branching or sequential dependencies (exponential smoothing, early exit) — use Numba/Cython — when temporaries explode memory (an (n, n) intermediate), and when data must first be converted from Python objects at high cost.</p>`, followUps: ['Explain broadcasting rules with an example', 'How do you avoid huge temporaries?', 'Why is np.vectorize slow?'] },
    { q: R`Your process holds 6 GB for 20 million small records. How do you reduce memory?`, level: 'A', a: R`<p>First <b>measure</b> with tracemalloc/memray to confirm what dominates. Then, in order: (1) <b>don't hold everything</b> — stream with generators/chunks if the algorithm allows; (2) <b>shrink per-record overhead</b>: dicts → <code>@dataclass(slots=True)</code>/<code>__slots__</code> or tuples (~2× smaller); (3) <b>remove per-value boxing</b>: columnar storage with <code>array</code>, NumPy (smallest safe dtypes, float32/int32), or Arrow/Polars — often 5–10× smaller; (4) <b>deduplicate</b> repeated strings with <code>sys.intern</code> or categorical dtypes; (5) look for <b>leaks</b>: unbounded caches, growing global lists, reference cycles. Also remember pymalloc may not return freed memory to the OS (fragmentation), so measure RSS over time, not just after one GC.</p>`, followUps: ['Why might RSS stay high after you delete the objects?', 'Trade-offs of __slots__?', 'When would you use mmap?'] },
    { q: R`Compare Cython, Numba, PyPy, mypyc and Rust/PyO3 for speeding up Python.`, level: 'A', a: R`<p><b>Numba</b>: JIT for numeric Python/NumPy loops with a decorator; easiest win for array maths with custom logic; limited language subset. <b>Cython</b>: superset language compiled to C extensions; needs type declarations for speed; great for wrapping C libraries and releasing the GIL. <b>PyPy</b>: alternative interpreter with tracing JIT; speeds up whole pure-Python programs without code changes, but C-extension compatibility/speed and Python-version lag are trade-offs. <b>mypyc</b>: compiles type-annotated modules; moderate gains with no new language. <b>Rust + PyO3/maturin</b>: memory-safe native code with excellent tooling and parallelism (Polars, pydantic-core, orjson); higher skill cost. Decision: profile → NumPy first if array-shaped → Numba/Cython for custom loops → PyPy for whole-app → Rust/C++ for reusable cores or existing libraries.</p>`, followUps: ['What is the cost of crossing the Python/native boundary?', 'How does the free-threaded build affect native extensions?'] },
    { q: R`What is the GIL's relevance to performance tuning, and what changed in Python 3.13/3.14?`, level: 'A', a: R`<p>The GIL lets only one thread execute Python bytecode at a time, so CPU-bound pure-Python code does not speed up with threads; I/O-bound code does (the GIL is released while waiting). Workarounds: multiprocessing/ProcessPoolExecutor (pickling cost), native code that releases the GIL (NumPy, Cython <code>nogil</code>, Numba, PyO3 <code>allow_threads</code>), or subinterpreters with per-interpreter GILs (<code>concurrent.interpreters</code> in 3.14). 3.13 shipped an experimental <b>free-threaded</b> build (PEP 703, <code>python3.13t</code>); 3.14 made it officially supported (PEP 779) though still not the default, with single-thread overhead reduced substantially. Extensions must be rebuilt and declare thread-safety. For tuning: measure whether you are CPU- or I/O-bound before choosing threads, processes or async.</p>`, followUps: ['Is <code>x += 1</code> on a shared int thread-safe?', 'When does multiprocessing lose to threads?'] },
    { q: R`Walk through what happens when you run <code>pip install somepackage</code> for a package that has only an sdist.`, level: 'I', a: R`<p>pip queries the index, the resolver chooses a version compatible with all constraints, and finds no matching wheel, so it downloads the sdist. It reads <code>pyproject.toml [build-system]</code>, creates an <b>isolated build environment</b>, installs the build <code>requires</code> (e.g. setuptools, scikit-build-core, maturin), and calls the backend's PEP 517 hooks (<code>get_requires_for_build_wheel</code>, <code>build_wheel</code>). The backend may compile C/C++/Rust code — requiring compilers and system headers on the user's machine, which is slow and error-prone. The resulting wheel is cached and installed: files unpacked into site-packages, metadata in <code>*.dist-info</code>, console scripts generated from entry points. That is why maintainers publish binary wheels for each platform via cibuildwheel.</p>`, followUps: ['What is a wheel tag and how does pip choose between wheels?', 'Why is the src layout recommended?'] },
    { q: R`Library vs application: how should each declare and pin dependencies?`, level: 'I', a: R`<p>A <b>library</b> declares <i>abstract</i>, loose requirements in <code>[project].dependencies</code> (lower bounds, upper bounds only for known breakage) so it can coexist with other libraries in users' environments; exact pins in a library cause unresolvable conflicts. An <b>application/service</b> additionally commits a <b>lock file</b> (<code>uv.lock</code>, Poetry/PDM locks, or standard <code>pylock.toml</code> from PEP 751) with exact versions and hashes of the full transitive tree, so CI and production are reproducible; upgrades are deliberate (<code>uv lock --upgrade</code>, Dependabot/Renovate). Dev tools go into dependency groups (PEP 735). Security: hash checking, pip-audit, Trusted Publishing for releases.</p>`, followUps: ['What problem does a lock file solve that requirements ranges cannot?', 'How do you handle a transitive dependency with a CVE?'] },
    { q: R`Explain late binding in closures with an example and two fixes.`, level: 'B', a: R`<p>Closures capture <b>variables</b> (cells), not values. In <code>[lambda: i for i in range(3)]</code> all lambdas share the cell for <code>i</code>, which holds 2 after the loop, so each returns 2. The lookup happens when the lambda is <b>called</b>. Fixes: bind the current value at definition time via a default argument <code>lambda i=i: i</code>; use <code>functools.partial(f, i)</code>; or create each function in a factory <code>def make(i): return lambda: i</code> so each has its own scope. The same issue appears with callbacks registered in loops (GUI buttons, asyncio tasks referencing a loop variable). ruff B023 detects it.</p>`, followUps: ['Does the same happen with generator expressions?', 'Where are closure cells stored?'] },
    { q: R`Why is <code>is</code> wrong for comparing numbers and strings, even though it "works" for small values?`, level: 'B', a: R`<p><code>is</code> tests <b>identity</b> (same object), <code>==</code> tests <b>value</b>. CPython caches small ints (−5…256) and interns some strings (identifier-like literals, names), so <code>a is b</code> may be True for those by accident, but values created at runtime (<code>int("1000")</code>, joined strings) are separate objects. Behaviour differs across CPython versions, PyPy, and even REPL vs script (constant folding/merging). Python 3.8+ emits a <code>SyntaxWarning</code> for <code>is</code> with a literal. Use <code>is</code> only for singletons: <code>None</code>, <code>True</code>/<code>False</code> when you mean the exact object, sentinels, and <code>NotImplemented</code>/<code>Ellipsis</code>.</p>`, followUps: ['Why does <code>x = float("nan"); x in [x]</code> return True?', 'What does sys.intern do and when would you use it?'] },
    { q: R`Predict and explain: <code>a = [1, 2, 3]; for x in a: a.remove(x)</code>. What is <code>a</code>?`, level: 'I', a: R`<p>Result <code>[2]</code>. The list iterator keeps an index. Index 0 → x = 1, remove it → list [2, 3]. Index 1 → x = 3 (2 slid into index 0 and was skipped), remove it → [2]. Index 2 ≥ len 1 → stop. Mutating a list's size while iterating it skips elements (and dicts/sets raise <code>RuntimeError</code>). Fix by building a new list (<code>[x for x in a if keep(x)]</code>), assigning back with <code>a[:] = …</code> if aliases must see it, iterating over a copy (<code>for x in a[:]</code>), or iterating indexes backwards. Each <code>remove</code> is also O(n), so the loop is O(n²) even when it happens to work.</p>`, followUps: ['What happens if you append inside the loop?', 'How do you delete dict entries safely during iteration?'] },
    { q: R`What does <code>__hash__</code> have to do with <code>__eq__</code>, and what goes wrong with mutable keys?`, level: 'A', a: R`<p>Hash containers require: if <code>a == b</code> then <code>hash(a) == hash(b)</code>, and an object's hash must not change while it is stored. Defining <code>__eq__</code> without <code>__hash__</code> sets <code>__hash__ = None</code> (unhashable) to protect this. If you hash on mutable fields and then mutate, the element sits in the bucket of its old hash: lookups for the mutated object probe the wrong bucket, and lookups for an equal-to-the-old-value object find it but fail <code>__eq__</code> — the item is unreachable yet still counted in <code>len</code>. Fix: hash only immutable state (<code>@dataclass(frozen=True)</code>, NamedTuple), or keep identity hashing for mutable entities. Also: equal values across types (1, 1.0, True) hash equally by design, so they collapse into one key.</p>`, followUps: ['Why are lists unhashable but tuples hashable (sometimes)?', 'Why is hash(-1) == hash(-2) in CPython?'] },
    { q: R`How would you speed up a CPU-bound pure-Python function 50× without leaving the Python ecosystem? Give a concrete plan.`, level: 'E', a: R`<p>1) <b>Prove</b> it is the bottleneck (profile; Amdahl estimate of the end-to-end gain). 2) <b>Algorithm & data structures</b> first: complexity wins dwarf everything (sets/dicts, sorting once, caching, heaps, prefix sums). 3) <b>Push loops into C</b> with built-ins, itertools, slicing, <code>bytes</code>/<code>bytearray</code> tricks. 4) If array-shaped, <b>NumPy/Polars</b>; mind temporaries and dtypes. 5) If loop-shaped, <b>Numba</b> (<code>@njit</code>, possibly <code>parallel=True</code>) or <b>Cython</b> with full typing; release the GIL and parallelise with threads. 6) For whole-program pure Python, test <b>PyPy</b>. 7) For a reusable core, <b>Rust/PyO3</b>. At every step keep a pure-Python reference implementation and a property-based test (Hypothesis) comparing outputs, plus a pyperf benchmark in CI to catch regressions.</p>`, followUps: ['How do you package the compiled version for users on Windows/macOS/Linux?', 'How would you keep the pure-Python fallback?'] }
  );

  /* ----------------------------------------------------------------------
     Spread correct answers across positions (authored with the correct
     option first; rotate deterministically so it is not always "A").
     ---------------------------------------------------------------------- */
  function rotateMcq(m, k) {
    var n = m.options.length, shift = k % n;
    if (!shift) return;
    var opts = m.options.slice(), out = [];
    for (var i = 0; i < n; i++) out[(i + shift) % n] = opts[i];
    m.options = out;
    m.answer = (m.answer + shift) % n;
  }
  quiz.forEach(function (q, i) { rotateMcq(q, i + 1); });
  var mcqCounter = 0;
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { if (p.mcq) rotateMcq(p.mcq, 2 + mcqCounter++); }); });
  practice.forEach(function (p) { if (p.mcq) rotateMcq(p.mcq, 1 + mcqCounter++); });

  registerModule({
    id: 'py13',
    title: 'Performance & Expert Python + Gotchas Bank',
    intro: R`<p>This is the "senior Python" module. First you learn to <b>measure</b> instead of guess: <code>cProfile</code>, <code>pstats</code>, <code>timeit</code>, sampling profilers and Amdahl's law. Then you work through the speed levers in the order a professional pulls them — better data structures and built-ins, <b>NumPy vectorization</b> (broadcasting, views, dtypes), <b>memory optimization</b> (<code>tracemalloc</code>, <code>__slots__</code>, generators, compact arrays), and leaving the interpreter with <b>Numba, Cython, PyPy, mypyc and Rust/PyO3</b> when profiles prove it is worth it. You will also learn to <b>package</b> code properly with <code>pyproject.toml</code>, wheels and uv.</p>
<p>The second half is a <b>gotchas bank</b>: mutable default arguments, aliasing, late-binding closures, scope surprises, <code>finally</code> overrides, hash/equality traps and number quirks — with a repeatable 5-step method for any "predict the output" question. Every topic has a visualizer (profiler hot-spot bars, loop-vs-vectorized timing bars, the shared default-argument object graph, a list-mutation simulator) and runnable examples you can execute in the browser.</p>`,
    goals: [
      'Profile any Python program with cProfile/pstats or py-spy, read tottime vs cumtime, and use Amdahl\'s law to decide what is worth optimising',
      'Benchmark correctly with <code>timeit</code>/<code>perf_counter</code> (repeats, minimum, realistic sizes) and prove a speed-up before and after',
      'Replace Python loops with NumPy vectorized code using ufuncs, masks, axis reductions and broadcasting — and know when a loop is actually faster',
      'Cut memory with streaming generators, <code>__slots__</code>/slotted dataclasses, array/NumPy columns and tracemalloc-driven leak hunting',
      'Choose between Numba, Cython, PyPy, mypyc, ctypes/pybind11 and Rust/PyO3 for a profiled hot spot, and explain the GIL/free-threading trade-offs',
      'Package a project with <code>pyproject.toml</code>, build backends, wheels and lock files, and decode wheel compatibility tags',
      'Predict the output of tricky Python snippets (mutable defaults, late binding, scope, aliasing, hashing, finally) and explain the rule behind each'
    ],
    prereqs: R`Python 5 (Data Structure Internals & Comprehensions), Python 6 (Closures, Decorators & functools), Python 7 (Iterators & Generators), Python 8 (Advanced OOP: dunders, __slots__, dataclasses) and Python 12 (CPython Internals: bytecode, reference counting, GC). Helpful: Python 10 (Concurrency & the GIL) and basic Big-O.`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
