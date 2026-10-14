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
  registerModule({ id: 'py13', title: 'Performance & Expert Python + Gotchas Bank', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
