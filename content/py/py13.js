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
  registerModule({ id: 'py13', title: 'Performance & Expert Python + Gotchas Bank', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
