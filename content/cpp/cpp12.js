(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C++ code is written with String.raw so "\n" stays a C++ escape

  /* ======================================================================
     Shared helpers for the visualizers of this module
     ====================================================================== */
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function words(input, def) {
    return String(input === undefined || input === null ? def : input).trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
  }

  /* ======================================================================
     TOPIC 1 — Cache lines and locality
     ====================================================================== */
  function simulateCache(Rn, Cn, order, cap, LINE) {
    var cache = [], hits = 0, misses = 0, seq = [];
    var outer = order === 'row' ? Rn : Cn, inner = order === 'row' ? Cn : Rn;
    for (var a = 0; a < outer; a++) for (var b = 0; b < inner; b++) {
      var r = order === 'row' ? a : b, c = order === 'row' ? b : a;
      var line = Math.floor((r * Cn + c) / LINE), pos = cache.indexOf(line), hit = pos >= 0, evicted = null;
      if (hit) { cache.splice(pos, 1); hits++; }
      else { misses++; if (cache.length >= cap) evicted = cache.shift(); }
      cache.push(line);
      seq.push({ r: r, c: c, line: line, hit: hit, evicted: evicted, cache: cache.slice(), hits: hits, misses: misses });
    }
    return seq;
  }

  topics.push({
    title: 'Cache Lines & Locality: Why Memory Order Beats Big-O',
    analogy: `<p>Imagine your desk (L1 cache), a bookshelf in your room (L2), the library downstairs (L3) and a warehouse across town (RAM). When you need one page from the warehouse, the courier never brings a single page — he brings the <b>whole folder</b> it lives in (a <b>cache line</b>, 64 bytes). If your next page is in the same folder, it is already on your desk: instant. If you keep asking for pages from <b>different</b> folders, the courier drives across town every time. Fast code is code that reads pages <b>in folder order</b>.</p>`,
    explain: `<p><b>The plain idea:</b> the CPU is hundreds of times faster than main memory. To hide that gap it keeps small, fast copies of recently used memory in <b>caches</b>. Memory moves between RAM and the caches in fixed chunks called <b>cache lines</b> — 64 bytes on almost every x86-64 and ARM server core (Apple M-series uses 128-byte lines in some levels). So reading one <code>int</code> really pulls in its 15 neighbours too.</p>
      ${H.table(['Where the data is', 'Typical latency', 'Rough size', 'Analogy'], [
        ['Register', '0 cycles', '~1 KB', 'In your hand'],
        ['L1 cache', '~4 cycles (~1 ns)', '32–64 KB per core', 'On your desk'],
        ['L2 cache', '~12–15 cycles (~4 ns)', '0.5–2 MB per core', 'Shelf in your room'],
        ['L3 cache', '~40–60 cycles (~12 ns)', '8–100+ MB shared', 'Library downstairs'],
        ['DRAM', '~200–300 cycles (~80–100 ns)', 'GBs', 'Warehouse across town']
      ])}
      <p>Two kinds of <b>locality</b> make caches work:</p>
      <ul>
        <li><b>Spatial locality</b> — after touching address X you soon touch X+4, X+8… (walking an array). One miss pays for 16 <code>int</code>s.</li>
        <li><b>Temporal locality</b> — you touch the <i>same</i> data again soon (a loop counter, a small lookup table). It stays hot in L1.</li>
      </ul>
      <p><b>Row-major layout:</b> C++ stores <code>int a[R][C]</code> (and a <code>vector</code> you index as <code>a[r*C + c]</code>) row after row. So <code>a[0][0], a[0][1], a[0][2]…</code> are neighbours in memory, but <code>a[0][0]</code> and <code>a[1][0]</code> are <code>C*4</code> bytes apart.</p>
      ${H.arr(['a00', 'a01', 'a02', 'a03', 'a10', 'a11', 'a12', 'a13'], { label: 'memory of int a[2][4] (row-major)', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'b', 5: 'b', 6: 'b', 7: 'b' } })}
      <p>Walking <b>row by row</b> (inner loop over columns) reads memory sequentially: 1 miss, then 15 hits per line, and the hardware <b>prefetcher</b> sees the stride and fetches the next lines before you ask. Walking <b>column by column</b> (inner loop over rows) jumps <code>C*4</code> bytes every step; once the matrix is bigger than the cache, <b>every single access can be a miss</b>. Same Big-O, same instruction count — often <b>5–20× slower</b>.</p>
      <p><b>Key rule:</b> the <b>last</b> index should change <b>fastest</b> in your innermost loop. For <code>a[i][j]</code>, loop <code>i</code> outside, <code>j</code> inside.</p>`,
    clues: [
      '"Which loop is faster?" with two loops that differ only in <b>loop order</b> → think row-major + cache lines',
      '"Same complexity but 10× slower" → memory access pattern, not algorithm',
      '"Large 2D matrix", "image processing", "transpose", "matrix multiply" → loop interchange / tiling',
      '"Linked list vs vector" performance question → pointer chasing vs contiguous memory',
      '"Many threads update their own counter but it does not scale" → false sharing on one cache line',
      '"Array of structs, but the hot loop reads only one field" → AoS vs SoA layout'
    ],
    code: [R`
      #include <chrono>
      #include <cstdio>
      #include <vector>
      // Same work, two loop orders. Compile: g++ -O2 cache.cpp && ./a.out
      int main() {
          const int N = 4096;                               // 4096*4096 ints = 64 MB, far bigger than L3
          std::vector<int> a(static_cast<size_t>(N) * N, 1); // row-major: element (r,c) lives at a[r*N + c]

          auto time = [&](auto&& body) {
              auto t0 = std::chrono::steady_clock::now();
              long long s = body();
              auto t1 = std::chrono::steady_clock::now();
              std::printf("sum=%lld  %.1f ms\n", s,
                          std::chrono::duration<double, std::milli>(t1 - t0).count());
          };

          time([&] {                       // ROW order: inner loop walks consecutive addresses
              long long s = 0;
              for (int r = 0; r < N; ++r)
                  for (int c = 0; c < N; ++c) s += a[static_cast<size_t>(r) * N + c];
              return s;
          });
          time([&] {                       // COLUMN order: inner loop jumps N*4 = 16 KB each step
              long long s = 0;
              for (int c = 0; c < N; ++c)
                  for (int r = 0; r < N; ++r) s += a[static_cast<size_t>(r) * N + c];
              return s;
          });
          // Typical laptop: row ~15 ms, column ~150+ ms. Same O(N^2), very different cache behaviour.
      }`, R`
      #include <atomic>
      #include <cstdio>
      #include <new>
      #include <thread>
      #include <vector>
      // False sharing: two threads write DIFFERENT variables that sit on the SAME 64-byte line.
      struct Packed { std::atomic<long> a{0}; std::atomic<long> b{0}; };       // a and b share one line
      struct Padded {                                                          // each on its own line
          alignas(64) std::atomic<long> a{0};
          alignas(64) std::atomic<long> b{0};
      };
      template <class T> void hammer(T& x) {
          std::thread t1([&] { for (int i = 0; i < 50'000'000; ++i) x.a.fetch_add(1, std::memory_order_relaxed); });
          std::thread t2([&] { for (int i = 0; i < 50'000'000; ++i) x.b.fetch_add(1, std::memory_order_relaxed); });
          t1.join(); t2.join();
      }
      int main() {
          static_assert(sizeof(Padded) == 128, "each counter owns a full cache line");
          Packed p; Padded q;
          hammer(p);   // the line ping-pongs between the two cores' L1 caches: slow
          hammer(q);   // no sharing: often 3-10x faster
          std::printf("%ld %ld\n", p.a.load() + p.b.load(), q.a.load() + q.b.load());
      }`],
    codeTitle: ['Row vs column traversal benchmark', 'False sharing and the alignas(64) fix'],
    viz: {
      title: 'Tiny cache simulator: row order vs column order',
      input: '4 8 col 3',
      inputLabel: 'rows cols order(row|col) cacheLines  — e.g. "4 8 row 3" or "4 8 col 3"',
      gen: function (input) {
        var w = words(input, '4 8 col 3');
        var Rn = parseInt(w[0], 10), Cn = parseInt(w[1], 10), order = w[2] || 'row', cap = parseInt(w[3] || '3', 10), LINE = 4;
        if (!(Rn >= 1 && Rn <= 8 && Cn >= 1 && Cn <= 16)) throw new Error('Use 1-8 rows and 1-16 columns, e.g. "4 8 col 3"');
        if (Rn * Cn < 2 || Rn * Cn > 64) throw new Error('Use between 2 and 64 cells in total (rows × cols), e.g. "4 8 col 3"');
        if (order !== 'row' && order !== 'col') throw new Error('Order must be "row" or "col", e.g. "4 8 row 3"');
        if (!(cap >= 1 && cap <= 8)) throw new Error('Cache size must be 1-8 lines');
        var colHead = [], rowHead = [], r, c;
        for (c = 0; c < Cn; c++) colHead.push('c' + c);
        for (r = 0; r < Rn; r++) rowHead.push('r' + r);
        var marks = [];
        for (r = 0; r < Rn; r++) { marks.push([]); for (c = 0; c < Cn; c++) marks[r].push('L' + Math.floor((r * Cn + c) / LINE)); }
        var loopCode = order === 'row'
          ? 'for (int r = 0; r < R; ++r)      // outer: rows\n    for (int c = 0; c < C; ++c)  // inner: columns\n        s += a[r * C + c];'
          : 'for (int c = 0; c < C; ++c)      // outer: columns\n    for (int r = 0; r < R; ++r)  // inner: rows\n        s += a[r * C + c];';
        var frames = [];
        var hl0 = {};
        for (r = 0; r < Rn; r++) for (c = 0; c < Cn; c++) if (Math.floor((r * Cn + c) / LINE) % 2 === 0) hl0[r + ',' + c] = 'win';
        frames.push({ narr: 'A ' + Rn + '×' + Cn + ' matrix of 4-byte ints stored <b>row-major</b>. In this toy a cache line holds <b>' + LINE + ' ints</b> (real CPUs: 64 B = 16 ints), and the cache can hold only <b>' + cap + ' lines</b>. Each cell shows which line it belongs to (shaded = even lines). Loop order: <b>' + (order === 'row' ? 'row by row' : 'column by column') + '</b>.',
          parts: [{ type: 'grid', label: 'matrix a (cell = its cache line)', rows: marks.map(function (x) { return x.slice(); }), rowHead: rowHead, colHead: colHead, hl: hl0 },
            { type: 'code', label: 'The loop', lang: 'cpp', code: loopCode, hl: { 3: 'cur' } },
            { type: 'queue', label: 'Cache (LRU order)', items: [], frontLabel: 'evict next', backLabel: 'most recent' }] });
        var seq = simulateCache(Rn, Cn, order, cap, LINE);
        seq.forEach(function (s, k) {
          marks[s.r][s.c] = s.hit ? 'H' : 'M';
          var hl = {};
          for (var rr = 0; rr < Rn; rr++) for (var cc = 0; cc < Cn; cc++) {
            var ln = Math.floor((rr * Cn + cc) / LINE);
            if (s.cache.indexOf(ln) >= 0) hl[rr + ',' + cc] = 'win';
            else if (marks[rr][cc] === 'H' || marks[rr][cc] === 'M') hl[rr + ',' + cc] = 'done';
          }
          hl[s.r + ',' + s.c] = s.hit ? 'ok' : 'bad';
          var why = s.hit ? '<span class="c-g"><b>HIT</b></span> — line L' + s.line + ' is already in the cache (a neighbour pulled it in), so this read costs ~4 cycles.'
            : '<span class="c-r"><b>MISS</b></span> — line L' + s.line + ' is not cached, so the whole ' + (LINE * 4) + '-byte line comes from RAM (~200 cycles)' + (s.evicted !== null ? ' and the least-recently-used line <b>L' + s.evicted + '</b> is thrown out to make room.' : '.');
          var hint = '';
          if (order === 'col' && !s.hit && s.r > 0) hint = ' Notice the jump: the previous access was in another row, ' + (Cn * 4) + ' bytes away — a different line.';
          if (order === 'row' && s.hit) hint = ' Sequential walk: the line we just loaded keeps paying off.';
          frames.push({ narr: 'Access #' + (k + 1) + ': a[' + s.r + '][' + s.c + '] (byte offset ' + ((s.r * Cn + s.c) * 4) + '). ' + why + hint,
            parts: [{ type: 'grid', label: 'matrix a (H = hit, M = miss)', rows: marks.map(function (x) { return x.slice(); }), rowHead: rowHead, colHead: colHead, hl: hl },
              { type: 'queue', label: 'Cache (LRU order)', items: s.cache.map(function (l) { return 'L' + l; }), hl: s.hit ? {} : (function () { var h = {}; h[s.cache.length - 1] = 'ok'; return h; })(), frontLabel: 'evict next', backLabel: 'most recent' },
              { type: 'vars', vals: { access: k + 1, line: 'L' + s.line, hits: s.hits, misses: s.misses, hitRate: Math.round(100 * s.hits / (k + 1)) + '%' }, hl: s.hit ? { hits: 'ok' } : { misses: 'bad' } }] });
        });
        var other = simulateCache(Rn, Cn, order === 'row' ? 'col' : 'row', cap, LINE);
        var me = seq[seq.length - 1], ot = other[other.length - 1];
        frames.push({ narr: '<b>Done.</b> ' + (order === 'row' ? 'Row' : 'Column') + ' order: <b>' + me.misses + '</b> misses out of ' + seq.length + '. The other order would cause <b>' + ot.misses + '</b> misses. ' + (me.misses <= ot.misses ? 'This is the cache-friendly order: inner loop moves along the last index.' : 'This is the cache-hostile order — swap the loops so the inner loop walks along a row.') + ' With real 64-byte lines and a 64 MB matrix the gap is roughly 16× more misses, i.e. 5–20× slower.',
          parts: [{ type: 'table', label: 'Same work, different order', columns: ['order', 'hits', 'misses', 'miss rate'], rows: [
            [order, me.hits, me.misses, Math.round(100 * me.misses / seq.length) + '%'],
            [order === 'row' ? 'col' : 'row', ot.hits, ot.misses, Math.round(100 * ot.misses / other.length) + '%']], hl: { 0: me.misses <= ot.misses ? 'ok' : 'bad' } },
            note('Rule: in <code>a[i][j]</code>, loop <code>i</code> outside and <code>j</code> inside. Try changing the input to <code>' + Rn + ' ' + Cn + ' ' + (order === 'row' ? 'col' : 'row') + ' ' + cap + '</code>, or raise the cache to ' + Rn + '+ lines and watch column order recover (the working set suddenly fits).')] });
        return frames;
      }
    },
    examples: [
      { title: 'Which loop is faster? (the classic)', html: `<p><code>for i, for j: sum += a[i][j]</code> vs <code>for j, for i: sum += a[i][j]</code> on a 4096×4096 <code>int</code> matrix (64 MB). The first walks memory sequentially: one miss per 16 elements, and the prefetcher hides most of those. The second jumps 16 KB each step: <b>every</b> access is a new line, and with only ~512 lines of L1 the lines are evicted before you come back for the next column. Typical result: <span class="c-g">~15 ms</span> vs <span class="c-r">~150 ms</span>. The answer is always "the one whose inner loop moves along the <b>last</b> index".</p>`, code: R`
        long long sumRows(const std::vector<std::vector<int>>& a) {
            long long s = 0;
            for (size_t i = 0; i < a.size(); ++i)          // outer: row
                for (size_t j = 0; j < a[i].size(); ++j)   // inner: column -> contiguous
                    s += a[i][j];
            return s;
        }` },
      { title: 'vector vs list: pointer chasing', html: `<p>Summing 10 million numbers: <code>std::vector&lt;int&gt;</code> takes ~5 ms, <code>std::list&lt;int&gt;</code> often 50–100 ms. Both are O(N). The list stores each node separately on the heap (value + two pointers ≈ 24–32 bytes, scattered), and the CPU cannot know the next address until it has loaded the current node — so it cannot prefetch. This is called <b>pointer chasing</b>: every step is a dependent load, potentially a full RAM round trip. That is why "prefer vector by default" is standard C++ advice, even for middle insertions up to surprisingly large sizes.</p>` },
      { title: 'AoS vs SoA: only load what you use', html: `<p>Particles stored as an <b>Array of Structs</b>: <code>struct P { float x, y, z, vx, vy, vz, mass, charge; }</code> = 32 bytes each. A loop that only updates <code>x += vx</code> drags all 32 bytes per particle through the cache but uses 8 — 75% of every line is wasted. A <b>Struct of Arrays</b> (<code>vector&lt;float&gt; x, vx, …</code>) makes the hot loop read two dense arrays: 4× less memory traffic and easy SIMD vectorisation. Game engines (ECS), databases (columnar storage) and ML tensors all use this idea.</p>`, code: R`
        struct ParticlesSoA {                    // Struct of Arrays: each field is its own dense array
            std::vector<float> x, y, z, vx, vy, vz;
            void step(float dt) {
                for (size_t i = 0; i < x.size(); ++i) {   // reads only x and vx: 8 bytes/particle
                    x[i] += vx[i] * dt;
                }
            }
        };` },
      { title: 'False sharing: two threads, one line', html: `<p>Thread 1 increments <code>counters[0]</code>, thread 2 increments <code>counters[1]</code>. They never touch the same variable — but both <code>long</code>s live in the <b>same 64-byte line</b>. Cache coherence (MESI) works per line, so each write forces the other core to invalidate its copy: the line ping-pongs between cores and the "parallel" code can be slower than one thread. Fix: give each counter its own line with <code>alignas(64)</code> or <code>alignas(std::hardware_destructive_interference_size)</code>, or let each thread count in a local variable and combine at the end.</p>` }
    ],
    deepDive: `<p><b>How a cache finds a line.</b> An address is split into <i>tag | set index | offset</i>. With 64-byte lines the low 6 bits are the offset. A typical 48 KB, 12-way L1D has 64 sets; the next 6 bits pick the set and the line can sit in any of the 12 "ways" of that set. Consequence: addresses exactly 4 KB apart map to the <b>same set</b>. Walking a column of a matrix whose row is a power of two (1024 ints = 4 KB) hits the same set again and again and evicts itself after 12 rows — <b>conflict misses</b>. A classic trick is to pad the row length (e.g. 1024 → 1040) to spread the columns across sets.</p>
      <p><b>The three Cs of misses:</b> <i>compulsory</i> (first touch — unavoidable, but the prefetcher can hide them), <i>capacity</i> (working set larger than the cache — fix by blocking/tiling), <i>conflict</i> (too many hot lines map to one set — fix by padding). Multithreaded code adds a fourth: <i>coherence</i> misses (true and false sharing).</p>
      <p><b>Prefetchers</b> detect sequential and constant-stride streams and run ahead. They do not cross 4 KB page boundaries easily, and they cannot follow pointers. <code>__builtin_prefetch(p)</code> exists but is rarely a win unless you know the address many iterations ahead (e.g. hash-table probing in batches).</p>
      <p><b>TLB:</b> every virtual address also needs a page-table translation, cached in the TLB (~64 L1 entries, ~1.5–2 K L2 entries). Random access over gigabytes misses the TLB too; <b>huge pages</b> (2 MB, <code>madvise(MADV_HUGEPAGE)</code> / transparent huge pages) cut TLB misses dramatically for big arrays and hash tables.</p>
      <p><b>Blocking (tiling).</b> For matrix multiply or transpose, process the matrix in B×B tiles small enough that the tiles you are working on fit in L1/L2 (e.g. B = 32–64 for doubles). Every loaded line is then reused B times before it is evicted. Loop interchange (<code>i-k-j</code> instead of <code>i-j-k</code> for <code>C += A*B</code>) alone often gives 5×; tiling plus SIMD gets close to peak FLOPs.</p>
      <p><b>Memory bandwidth vs latency.</b> Sequential reads are limited by bandwidth (~20–50 GB/s per core on modern chips); random reads by latency (~100 ns each, mitigated by memory-level parallelism: the core can have ~10–20 outstanding misses). Turning dependent loads (linked list) into independent ones (index array) lets the hardware overlap them.</p>
      <p><b>Measuring:</b> <code>perf stat -e cache-references,cache-misses,L1-dcache-load-misses,LLC-load-misses ./prog</code>, or <code>valgrind --tool=cachegrind</code> for a simulated, line-by-line miss count. Always benchmark with realistic sizes — a 1000-element test fits in L1 and hides everything.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily generate correct-but-cache-hostile code: <code>vector&lt;vector&lt;double&gt;&gt;</code> matrices (one heap allocation per row), column-order loops copied from math notation, <code>std::map</code> where a sorted <code>vector</code> would be 5× faster, <code>shared_ptr</code> graphs that scatter objects across the heap. The code passes tests, so nobody notices until production load.</p>
      <p><b>Use AI as a partner:</b> ask <code>For this loop nest, which index changes fastest in memory? Is the inner loop contiguous? Estimate cache lines touched per iteration.</code> Ask it to rewrite AoS→SoA or to tile a transpose, then <b>measure</b> both versions with <code>perf stat</code> — models often predict speed-ups that do not materialise (the compiler already interchanged the loops, or the data fits in L2 anyway).</p>
      <p><b>Where AI goes wrong:</b> claims "cache line is 64 bytes everywhere" (Apple silicon differs), recommends <code>__builtin_prefetch</code> everywhere (usually useless or harmful), or "fixes" false sharing with <code>volatile</code>. <b>What you must own:</b> the mental model — row-major layout, lines, sets, the three Cs, false sharing — so you can read a loop and predict its memory traffic before any tool runs. Interviewers at HFT, game and database companies test exactly this.</p>`,
    problems: [{
      title: 'Make Column Sums Cache-Friendly', level: 'Medium', tags: ['cache', 'loop interchange', 'row-major'], companies: ['Jane Street', 'Optiver', 'NVIDIA'],
      statement: `<p>You are given an <code>R × C</code> matrix stored row-major in a flat <code>std::vector&lt;int&gt;</code> (<code>a[r*C + c]</code>). Return a vector of the <b>C column sums</b>. The obvious code loops over columns outside and rows inside — it is correct but slow for large matrices. Write a version that reads memory strictly sequentially, and explain why it is faster.</p>`,
      constraints: `1 ≤ R, C ≤ 10<sup>4</sup>; R·C ≤ 10<sup>8</sup>; values fit in <code>int</code>, sums need <code>long long</code>.`,
      example: `<p>a = [[1, 2, 3], [4, 5, 6]] (R = 2, C = 3) → ${H.arr([5, 7, 9], { label: 'column sums', hl: { 0: 'g', 1: 'g', 2: 'g' } })}</p><p>Memory order is ${H.c('b', '1 2 3 4 5 6')}. The fast version visits exactly that order and adds each value into <code>sum[c]</code>; the slow version visits ${H.c('r', '1 4 2 5 3 6')}, jumping C·4 bytes each step.</p>`,
      brute: { why: `<p>Column-outer loops jump <code>C*4</code> bytes on every inner step. For C = 10<sup>4</sup> that is 40 KB per jump: every access touches a new cache line and the line is evicted long before the next column comes back for its other 15 ints. Up to 16× more memory traffic than needed.</p>`, code: R`
        std::vector<long long> colSumsSlow(const std::vector<int>& a, int R, int C) {
            std::vector<long long> sum(C, 0);
            for (int c = 0; c < C; ++c)          // outer: column
                for (int r = 0; r < R; ++r)      // inner: row -> stride of C ints
                    sum[c] += a[static_cast<size_t>(r) * C + c];
            return sum;
        }` },
      mcq: { q: 'You must produce one result per column, but memory is row-major. What is the best plan?', options: ['Walk rows outside, columns inside, and accumulate into a sums array of size C', 'Transpose the matrix first, always', 'Use a std::map from column to sum', 'Parallelise the column loop; the cache does not matter'], answer: 0, explain: 'Keep the inner loop contiguous and move the "per column" bookkeeping into a small array (C × 8 bytes) that itself stays hot in cache. A transpose costs a full extra pass.' },
      hints: [`<p>Hint 1: The order you <b>produce</b> results does not have to match the order you <b>read</b> input. You can update all C partial sums while scanning one row.</p>`, `<p>Hint 2: Keep a <code>vector&lt;long long&gt; sum(C)</code>. For each row r, for each column c, <code>sum[c] += a[r*C + c]</code>. Both <code>a</code> and <code>sum</code> are now read sequentially.</p>`, `<p>Hint 3: Use <code>size_t</code> for <code>r*C</code> (10<sup>8</sup> fits in int, but bigger inputs overflow — signed overflow is UB). Use <code>long long</code> sums: 10<sup>4</sup> rows × 2·10<sup>9</sup> overflows <code>int</code>. Take a row pointer to help the compiler vectorise.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"5 7 9\n10\n7 8\n-4 6\n20000000000000\n3000 0"}]},
      solution: {
        approach: `<p><b>Loop interchange.</b> Scan the matrix in memory order (row outer, column inner) and add each element into <code>sum[c]</code>. Every cache line of <code>a</code> is loaded once and fully used; the <code>sum</code> array (C × 8 bytes = 80 KB at most) stays in L1/L2. The inner loop is "add vector to vector", which the compiler auto-vectorises with SIMD at <code>-O2</code>/<code>-O3</code>.</p>`,
        code: R`
          #include <cstdio>
          #include <vector>
          std::vector<long long> colSums(const std::vector<int>& a, int R, int C) {
              std::vector<long long> sum(C, 0);
              for (int r = 0; r < R; ++r) {
                  const int* row = a.data() + static_cast<size_t>(r) * C;  // start of row r
                  for (int c = 0; c < C; ++c)       // contiguous: row[0], row[1], ...
                      sum[c] += row[c];             // sum[] is also contiguous and stays hot
              }
              return sum;
          }
          int main() {
              std::vector<int> a = {1, 2, 3,
                                    4, 5, 6};
              for (long long s : colSums(a, 2, 3)) std::printf("%lld ", s);   // 5 7 9
              std::printf("\n");
              for (long long s : colSums({1, 2, 3, 4}, 4, 1)) std::printf("%lld ", s);   // 10  (one column)
              std::printf("\n");
              for (long long s : colSums({7, 8}, 1, 2)) std::printf("%lld ", s);         // 7 8  (one row)
              std::printf("\n");
              for (long long s : colSums({-1, 2, -3, 4}, 2, 2)) std::printf("%lld ", s); // -4 6
              std::printf("\n");
              std::printf("%lld\n", colSums(std::vector<int>(10000, 2000000000), 10000, 1)[0]);   // 20000000000000 (needs 64 bits)
              const int R = 3000, C = 3000;
              std::vector<int> big(static_cast<size_t>(R) * C);
              for (int r = 0; r < R; ++r)
                  for (int c = 0; c < C; ++c) big[static_cast<size_t>(r) * C + c] = c;   // every column is constant
              auto sums = colSums(big, R, C);
              int bad = 0;
              for (int c = 0; c < C; ++c) if (sums[c] != 1LL * R * c) ++bad;
              std::printf("%zu %d\n", sums.size(), bad);                                 // 3000 0
          }`,
        dry: { head: ['step', 'r', 'c', 'byte offset read', 'sum after'], rows: [
          ['1', '0', '0', '0', '[1, 0, 0]'], ['2', '0', '1', '4 (same line)', '[1, 2, 0]'], ['3', '0', '2', '8 (same line)', '[1, 2, 3]'],
          ['4', '1', '0', '12 (same line)', '[5, 2, 3]'], ['5', '1', '1', '16 (same line)', '[5, 7, 3]'], ['6', '1', '2', '20 (same line)', '<span class="c-g">[5, 7, 9]</span>']] },
        complexity: `<p>Time O(R·C) — identical to the slow version — but memory traffic drops from up to R·C cache lines to about R·C/16. Extra space O(C). In practice 5–15× faster on large matrices.</p>`,
        followUps: ['How would you compute row sums AND column sums in a single pass?', 'What changes if the matrix is stored column-major (Fortran / Eigen default)?', 'How would you split this across threads without false sharing on <code>sum</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Struct alignment and padding
     ====================================================================== */
  var TYPE_INFO = {
    'char': [1, 1], 'bool': [1, 1], 'int8_t': [1, 1], 'uint8_t': [1, 1], 'unsigned char': [1, 1], 'std::byte': [1, 1],
    'short': [2, 2], 'int16_t': [2, 2], 'uint16_t': [2, 2], 'char16_t': [2, 2],
    'int': [4, 4], 'unsigned': [4, 4], 'float': [4, 4], 'int32_t': [4, 4], 'uint32_t': [4, 4], 'char32_t': [4, 4],
    'long': [8, 8], 'long long': [8, 8], 'double': [8, 8], 'size_t': [8, 8], 'int64_t': [8, 8], 'uint64_t': [8, 8],
    'long double': [16, 16]
  };
  function parseMembers(input) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!s) throw new Error('Type members like: char a; int b; char c; double d');
    var parts = s.split(/\s*;\s*/).filter(Boolean);
    if (parts.length > 10) throw new Error('Use at most 10 members');
    return parts.map(function (p) {
      var m = p.match(/^(.+?)\s*([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?$/);
      if (!m) throw new Error('Could not read "' + p + '". Format: type name  (e.g. "int b" or "char tag[3]")');
      var t = m[1].trim().replace(/\s+/g, ' '), name = m[2], n = m[3] ? parseInt(m[3], 10) : 1, sz, al;
      if (/\*$/.test(t)) { sz = 8; al = 8; }
      else if (TYPE_INFO[t]) { sz = TYPE_INFO[t][0]; al = TYPE_INFO[t][1]; }
      else throw new Error('Unknown type "' + t + '". Use char, bool, short, int, float, long, long long, double, long double, int32_t, any pointer (T*) …');
      if (n < 1 || n > 32) throw new Error('Array length must be 1-32');
      return { type: t, name: name, size: sz * n, align: al, decl: t + ' ' + name + (m[3] ? '[' + n + ']' : '') };
    });
  }
  function layout(members) {
    var bytes = [], off = 0, maxA = 1, rows = [], steps = [];
    members.forEach(function (m, idx) {
      var pad = (m.align - off % m.align) % m.align, padStart = off;
      for (var p = 0; p < pad; p++) bytes.push({ v: '·', pad: true });
      off += pad;
      for (var b = 0; b < m.size; b++) bytes.push({ v: m.name, member: idx });
      rows.push([m.decl, m.size, m.align, off, pad]);
      steps.push({ m: m, idx: idx, pad: pad, padStart: padStart, offset: off });
      off += m.size; maxA = Math.max(maxA, m.align);
    });
    var tail = (maxA - off % maxA) % maxA;
    for (var t = 0; t < tail; t++) bytes.push({ v: '·', pad: true, tail: true });
    return { bytes: bytes, size: off + tail, align: maxA, rows: rows, steps: steps, tail: tail, used: members.reduce(function (s, m) { return s + m.size; }, 0) };
  }

  topics.push({
    title: 'Struct Alignment & Padding: Where the Hidden Bytes Go',
    analogy: `<p>Think of a parking lot with spaces painted every 1, 2, 4 or 8 metres depending on vehicle size. A motorbike (<code>char</code>) can park anywhere; a bus (<code>double</code>) must start on an 8-metre mark. If a motorbike parks at metre 0 and a bus arrives next, the bus cannot start at metre 1 — it drives to metre 8 and metres 1–7 sit <b>empty</b>. Those empty metres are <b>padding</b>. Park the buses first and the motorbikes at the end, and the same vehicles fit in a much shorter lot.</p>`,
    explain: `<p><b>The plain idea:</b> every type has an <b>alignment</b> — its address must be a multiple of that number. On x86-64 Linux: <code>char</code> 1, <code>short</code> 2, <code>int</code>/<code>float</code> 4, <code>long</code>/<code>double</code>/pointers 8. You can ask with <code>alignof(T)</code>. The CPU loads aligned data in one go; misaligned data may straddle two cache lines (or two pages) and atomic operations on it are not even possible.</p>
      <p>The compiler lays out struct members <b>in the order you declare them</b> (it never reorders), and inserts padding using three rules:</p>
      <ol>
        <li>Each member starts at an offset that is a multiple of its own alignment (pad before it if needed).</li>
        <li>The struct's alignment = the <b>largest</b> member alignment.</li>
        <li><code>sizeof</code> is rounded up to a multiple of the struct's alignment (<b>tail padding</b>) — so that in an array, element [1] is also correctly aligned.</li>
      </ol>
      <p><b>Worked example</b> — <code>struct S { char a; int b; char c; };</code></p>
      ${H.table(['member', 'size', 'align', 'next free offset', 'padding before', 'placed at'], [
        ['char a', '1', '1', '0', '0', '0'],
        ['int b', '4', '4', '1', '<span class="c-r">3</span>', '4'],
        ['char c', '1', '1', '8', '0', '8'],
        ['(tail)', '', 'struct align = 4', '9', '<span class="c-r">3</span>', 'size = 12']
      ])}
      ${H.arr(['a', '·', '·', '·', 'b', 'b', 'b', 'b', 'c', '·', '·', '·'], { label: 'sizeof(S) = 12 (6 bytes are padding)', hl: { 1: 'r', 2: 'r', 3: 'r', 9: 'r', 10: 'r', 11: 'r' } })}
      <p>Reorder to <code>{ int b; char a; char c; }</code>: b at 0, a at 4, c at 5, tail pad 2 → <b>8 bytes</b>. Same data, 33% smaller. The simple recipe: <b>declare members from largest alignment to smallest</b>. That is enough to remove almost all padding.</p>
      <p><b>Why care?</b> A million <code>S</code> objects: 12 MB vs 8 MB. Smaller structs = more objects per cache line = fewer misses. In hot data structures (order books, game entities, graph nodes, hash-table slots) this is a real speed-up, not just memory saving.</p>`,
    clues: [
      '"What is sizeof(this struct)?" → walk the members with offset % align, then round up to the max alignment',
      '"Reduce memory of millions of objects" → reorder fields by descending alignment, shrink types, bit-fields',
      '"Struct sent over the network / written to a file" → padding bytes, endianness, <code>#pragma pack</code> and its costs',
      '"Two threads, counters next to each other" → alignas(64) to separate cache lines',
      '"Empty class takes 1 byte" / "member that is a stateless allocator/comparator" → EBO and <code>[[no_unique_address]]</code>',
      '"Casting a byte buffer to struct*" → alignment + strict aliasing UB; use memcpy / std::bit_cast'
    ],
    code: R`
      #include <cstddef>
      #include <cstdint>
      #include <cstdio>
      struct Bad  { char a; double b; char c; int d; short e; };  // declaration order wastes bytes
      struct Good { double b; int d; short e; char a; char c; };  // largest alignment first

      // These hold on x86-64 Linux/macOS (LP64). The compiler checks them for us at compile time.
      static_assert(alignof(double) == 8 && alignof(int) == 4 && alignof(short) == 2);
      static_assert(offsetof(Bad, b) == 8);    // 7 bytes of padding after 'a'
      static_assert(offsetof(Bad, d) == 20);   // c at 16, 3 bytes padding, d at 20
      static_assert(sizeof(Bad)  == 32);       // e at 24..25, tail padding 26 -> 32
      static_assert(sizeof(Good) == 16);       // 8 + 4 + 2 + 1 + 1 = 16, zero padding

      struct alignas(64) PerThreadCounter {    // over-aligned: one cache line per counter
          std::uint64_t value;
      };
      static_assert(sizeof(PerThreadCounter) == 64);

      struct Empty {};                          // sizeof(Empty) == 1: every object needs a distinct address
      struct WithEmpty { Empty e; int x; };     // 1 + 3 padding + 4 = 8
      struct NoUnique { [[no_unique_address]] Empty e; int x; };   // C++20: e takes no space
      static_assert(sizeof(Empty) == 1 && sizeof(WithEmpty) == 8 && sizeof(NoUnique) == 4);

      int main() {
          std::printf("Bad=%zu Good=%zu\n", sizeof(Bad), sizeof(Good));   // Bad=32 Good=16
      }`,
    codeTitle: 'Proving the layout with static_assert and offsetof',
    viz: {
      title: 'Byte-by-byte struct layout (x86-64)',
      input: 'char a; double b; char c; int d; short e',
      inputLabel: 'Members separated by ";" — types: char bool short int float long double T* int32_t … arrays like char tag[3]',
      gen: function (input) {
        var mem = parseMembers(input === undefined || input === null ? 'char a; double b; char c; int d; short e' : input);
        var L = layout(mem);
        if (L.size > 96) throw new Error('Struct too big to draw (max 96 bytes) — use fewer/smaller members');
        var declCode = 'struct S {\n' + mem.map(function (m) { return '    ' + m.decl + ';'; }).join('\n') + '\n};';
        var frames = [];
        frames.push({ narr: 'We place members <b>in declaration order</b>. Each one needs an offset that is a multiple of its alignment. Start at offset 0 with an empty struct.',
          parts: [{ type: 'code', label: 'Declaration', lang: 'cpp', code: declCode, hl: { 1: 'cur' } },
            { type: 'table', label: 'Member facts', columns: ['member', 'size', 'align'], rows: mem.map(function (m) { return [m.decl, m.size, m.align]; }) }] });
        var shown = [];
        L.steps.forEach(function (s) {
          var hl = {}, i;
          var upto = s.offset + s.m.size;
          var vals = L.bytes.slice(0, upto).map(function (b) { return b.v; });
          for (i = 0; i < upto; i++) {
            if (L.bytes[i].pad) hl[i] = i >= s.padStart && i < s.offset ? 'bad' : 'done';
            else if (L.bytes[i].member === s.idx) hl[i] = 'ok';
          }
          var narr = '<b>' + s.m.decl + '</b> (size ' + s.m.size + ', align ' + s.m.align + '). Next free offset is ' + s.padStart + '. ';
          narr += s.pad ? s.padStart + ' % ' + s.m.align + ' = ' + (s.padStart % s.m.align) + ' ≠ 0, so the compiler inserts <span class="c-r"><b>' + s.pad + ' padding byte' + (s.pad > 1 ? 's' : '') + '</b></span> and places it at offset <b>' + s.offset + '</b>.'
            : s.padStart + ' is already a multiple of ' + s.m.align + ' → placed at offset <b>' + s.offset + '</b> with no padding.';
          shown.push([s.m.decl, s.offset, s.m.size, s.pad]);
          var ch = {}; ch[s.idx + 2] = 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'bytes so far (· = padding)', values: vals, hl: hl, showIdx: true },
            { type: 'code', label: 'Declaration', lang: 'cpp', code: declCode, hl: ch },
            { type: 'table', label: 'Layout table', columns: ['member', 'offset', 'size', 'pad before'], rows: shown.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[shown.length - 1] = 'cur'; return h; })() }] });
        });
        var allHl = {};
        L.bytes.forEach(function (b, i) { if (b.pad) allHl[i] = b.tail ? 'bad' : 'done'; });
        frames.push({ narr: 'Tail padding: the largest alignment is <b>' + L.align + '</b>, so sizeof must be a multiple of ' + L.align + '. Data ends at ' + (L.size - L.tail) + (L.tail ? ' → add <span class="c-r"><b>' + L.tail + '</b></span> tail byte(s)' : ' → no tail padding needed') + '. <b>sizeof(S) = ' + L.size + '</b>, of which ' + (L.size - L.used) + ' bytes are padding. Why tail padding? In <code>S arr[2]</code>, arr[1] starts at offset ' + L.size + ' and must also be aligned.',
          parts: [{ type: 'array', label: 'final layout: sizeof = ' + L.size, values: L.bytes.map(function (b) { return b.v; }), hl: allHl, showIdx: true },
            { type: 'vars', vals: { sizeof: L.size, alignof: L.align, usefulBytes: L.used, padding: L.size - L.used, waste: Math.round(100 * (L.size - L.used) / L.size) + '%' }, hl: { padding: (L.size - L.used) ? 'bad' : 'ok' } }] });
        var sorted = mem.map(function (m, i) { return { m: m, i: i }; }).sort(function (x, y) { return y.m.align - x.m.align || x.i - y.i; }).map(function (x) { return x.m; });
        var L2 = layout(sorted), hl2 = {};
        L2.bytes.forEach(function (b, i) { if (b.pad) hl2[i] = 'bad'; else hl2[i] = 'ok'; });
        frames.push({ narr: 'Now <b>reorder by descending alignment</b>: ' + sorted.map(function (m) { return m.name; }).join(', ') + '. Big members first means every later member already lands on a suitable boundary.',
          parts: [{ type: 'code', label: 'Reordered', lang: 'cpp', code: 'struct S2 {\n' + sorted.map(function (m) { return '    ' + m.decl + ';'; }).join('\n') + '\n};', hl: {} },
            { type: 'array', label: 'reordered layout: sizeof = ' + L2.size, values: L2.bytes.map(function (b) { return b.v; }), hl: hl2, showIdx: true }] });
        frames.push({ narr: 'Result: ' + L.size + ' → <b>' + L2.size + ' bytes</b>' + (L2.size < L.size ? ' (' + Math.round(100 * (L.size - L2.size) / L.size) + '% smaller). For 10 million objects that saves ' + Math.round((L.size - L2.size) * 10) + ' MB and lets more objects fit in every 64-byte cache line.' : ' — the original order was already optimal.') + ' Any remaining padding is the minimum tail needed for arrays.',
          parts: [{ type: 'table', label: 'Before vs after', columns: ['layout', 'sizeof', 'padding bytes', 'objects per 64-B line'], rows: [
            ['declaration order', L.size, L.size - L.used, (64 / L.size).toFixed(2)],
            ['sorted by alignment', L2.size, L2.size - L2.used, (64 / L2.size).toFixed(2)]], hl: { 1: 'ok' } },
            note('Check your own layouts with <code>static_assert(sizeof(S) == N)</code>, <code>offsetof</code>, the <code>-Wpadded</code> warning, or the <code>pahole</code> tool on a debug binary.')] });
        return frames;
      }
    },
    examples: [
      { title: 'Padding calculation: three tiny structs', html: `<p><b>A</b> <code>{ char c; int i; }</code>: c@0, pad 3, i@4 → <b>8</b>. <b>B</b> <code>{ char c; double d; char e; }</code>: c@0, pad 7, d@8, e@16, tail pad 7 → <b>24</b> (only 10 bytes of data!). <b>C</b> <code>{ double d; char c; char e; }</code>: d@0, c@8, e@9, tail 6 → <b>16</b>. Interview trick: always finish with "round up to the largest alignment" — most wrong answers forget the tail.</p>`, code: R`
        struct A { char c; int i; };             static_assert(sizeof(A) == 8);
        struct B { char c; double d; char e; };  static_assert(sizeof(B) == 24);
        struct C { double d; char c; char e; };  static_assert(sizeof(C) == 16);` },
      { title: 'Nested structs and arrays', html: `<p>A nested struct is placed using <b>its own</b> alignment (its largest member), and an array member <code>T x[n]</code> has the alignment of <code>T</code>. <code>struct In { char a; int b; }</code> has size 8, align 4. <code>struct Out { char tag; In in; char k[3]; }</code>: tag@0, pad 3, in@4..11, k@12..14, tail pad 1 → <b>16</b>.</p>`, code: R`
        struct In  { char a; int b; };              static_assert(sizeof(In) == 8 && alignof(In) == 4);
        struct Out { char tag; In in; char k[3]; }; static_assert(sizeof(Out) == 16);` },
      { title: '#pragma pack: smaller but slower and dangerous', html: `<p><code>#pragma pack(push, 1)</code> removes all padding: <code>{ char c; int i; }</code> becomes 5 bytes. Useful for exact wire/file formats, but: members are now misaligned, so loads may be split across cache lines, atomics on them are impossible, and taking <code>int&amp; r = s.i;</code> then using it can crash on strict-alignment CPUs (GCC warns: "taking address of packed member"). Prefer: keep the in-memory struct naturally aligned and <b>serialise field by field</b> (with explicit endianness) at the boundary.</p>`, code: R`
        #pragma pack(push, 1)
        struct WireHeader { std::uint8_t type; std::uint32_t length; };   // exactly 5 bytes, no padding
        #pragma pack(pop)
        static_assert(sizeof(WireHeader) == 5);` },
      { title: 'Bit-fields and smaller types', html: `<p>Often the biggest win is not reordering but <b>right-sizing</b>: an <code>int</code> for a value 0–7, a <code>bool</code> per flag, a 64-bit pointer where a 32-bit index into a vector would do. <code>struct Flags { unsigned kind : 3; unsigned visible : 1; unsigned dirty : 1; }</code> packs into 4 bytes. Bit-fields cost a shift+mask per access and cannot have their address taken, so use them for cold, memory-heavy data, not for hot counters.</p>`, code: R`
        struct Flags { unsigned kind : 3; unsigned visible : 1; unsigned dirty : 1; };
        static_assert(sizeof(Flags) == 4);` }
    ],
    deepDive: `<p><b>Why hardware cares.</b> A naturally aligned scalar never straddles a cache line or page, so it is loaded in one access and can be read/written <b>atomically</b> — <code>std::atomic&lt;T&gt;</code> relies on this. Modern x86 handles misaligned loads with little penalty when they stay inside one line, but a load crossing a 64-byte line costs two accesses, and crossing a 4 KB page can cost two TLB lookups. Some ARM/RISC-V configurations still trap or are slow on misaligned access.</p>
      <p><b>The standard's view.</b> Accessing an object through a misaligned pointer is <b>undefined behavior</b> — e.g. <code>*reinterpret_cast&lt;int*&gt;(buf + 1)</code>. UBSan's <code>-fsanitize=alignment</code> catches it. The portable way to read an int from bytes is <code>std::memcpy(&amp;x, buf + 1, 4)</code>; compilers turn that into a single load.</p>
      <p><b>Order is fixed by the language.</b> Compilers must allocate non-static data members in declaration order (C++23 made this true even across different access specifiers), because code may depend on layout (<code>offsetof</code>, C interop, serialisation). That is why reordering is your job. Rust, by contrast, reorders fields by default unless you write <code>#[repr(C)]</code>.</p>
      <p><b>ABI dependence.</b> Sizes are not universal: <code>long</code> is 8 bytes on Linux/macOS (LP64) but 4 on Windows (LLP64); <code>long double</code> is 16 on x86-64 Linux, 8 on MSVC. 32-bit targets have 4-byte pointers and sometimes 4-byte alignment for <code>double</code> inside structs (i386 System V). Never hard-code sizes across platforms — <code>static_assert</code> them.</p>
      <p><b>Over-alignment.</b> <code>alignas(64)</code> can only <i>increase</i> alignment. Since C++17, <code>new</code> respects over-aligned types (calls <code>operator new(size_t, std::align_val_t)</code>); before that heap objects were only guaranteed 16-byte alignment. <code>std::hardware_destructive_interference_size</code> (C++17, <code>&lt;new&gt;</code>) names the false-sharing distance portably, though GCC warns that its value may differ between compiler flags, so some teams just use 64 (or 128 on Apple).</p>
      <p><b>Empty bases and members.</b> Every complete object has a distinct address, so <code>sizeof(Empty) == 1</code>. The <b>Empty Base Optimisation</b> lets an empty base class occupy zero bytes (that is how <code>std::unique_ptr</code> with a stateless deleter stays 8 bytes), and C++20's <code>[[no_unique_address]]</code> extends this to members (MSVC needs <code>[[msvc::no_unique_address]]</code>).</p>
      <p><b>Padding contents are indeterminate.</b> <code>memcmp</code> of two structs can say "different" even when all members are equal, and writing a struct straight to disk/network leaks whatever bytes were in the padding (an information-leak bug class in kernels). Compare member-wise (or default <code>operator==</code> in C++20) and zero-initialise or serialise field by field.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask a model "what is sizeof" for a small struct and it is usually right; for nested structs, arrays, bit-fields or Windows vs Linux it is often confidently wrong. It also generates structs in "logical" order (id, flag, timestamp, flag, pointer…) that waste 30–50% of each object.</p>
      <p><b>Use AI as a partner:</b> paste a hot struct and ask <code>Reorder fields to minimise padding, keep semantics, and add static_asserts for sizeof and key offsets for x86-64 Linux</code>. Then let the <b>compiler</b> be the judge: the <code>static_assert</code>s either compile or they don't. Ask it to explain <code>pahole</code> output for a big class.</p>
      <p><b>Where AI goes wrong:</b> suggests <code>#pragma pack(1)</code> to "save memory" in hot paths (slower, unsafe atomics), casts byte buffers to struct pointers (alignment + aliasing UB), uses <code>memcmp</code> on padded structs, or forgets that reordering changes a binary file/network format. <b>What you must own:</b> doing the offset arithmetic in your head in an interview, knowing when layout is part of an ABI contract, and choosing between reordering, right-sizing, SoA and bit-fields.</p>`,
    problems: [{
      title: 'Shrink the Order Struct', level: 'Easy', tags: ['padding', 'alignment', 'sizeof'], companies: ['Bloomberg', 'Citadel', 'Qualcomm'],
      statement: `<p>A trading system keeps 50 million of these in memory:</p><pre>struct Order { char side; double price; char type; int qty; short venue; };</pre><p>(1) Compute <code>sizeof(Order)</code> on x86-64 by hand, showing every padding byte. (2) Reorder the members to minimise the size without changing any type. (3) Prove both answers with <code>static_assert</code>.</p>`,
      constraints: `x86-64 Linux ABI: alignof(char)=1, short=2, int=4, double=8. Do not change member types or remove members.`,
      example: `<p>Original: side@0, ${H.c('r', '7 pad')}, price@8, type@16, ${H.c('r', '3 pad')}, qty@20, venue@24, ${H.c('r', '6 tail pad')} → <b>32 bytes</b>. Reordered (double, int, short, char, char): 8+4+2+1+1 = ${H.c('g', '16 bytes')}, zero padding. 50 M orders: 1.6 GB → 0.8 GB.</p>`,
      brute: { why: `<p>Trying every permutation of 5 members (120 layouts) and computing each size works, but is pointless: sorting by descending alignment is provably optimal when every size is a multiple of its alignment (true for all scalar types), because each member then starts on a boundary that already satisfies everything after it.</p>`, code: R`
        // Brute force: compute the size of one particular order by simulating the rules.
        int layoutSize(const std::vector<std::pair<int,int>>& sizeAlign) {   // {size, align}
            int off = 0, maxA = 1;
            for (auto [sz, al] : sizeAlign) {
                off = (off + al - 1) / al * al;      // round up to this member's alignment
                off += sz;
                maxA = std::max(maxA, al);
            }
            return (off + maxA - 1) / maxA * maxA;   // tail padding
        }` },
      mcq: { q: 'Which single rule removes almost all padding from a struct of scalar members?', options: ['Declare members from largest alignment to smallest', 'Declare members alphabetically', 'Put all chars first', 'Add #pragma pack(1)'], answer: 0, explain: 'Descending alignment means every member starts on a boundary that is already a multiple of the alignments of all later (smaller) members, so only tail padding can remain. pack(1) removes padding too, but makes access misaligned and slower.' },
      hints: [`<p>Hint 1: Walk the members keeping a running offset. Before each member, round the offset up to a multiple of its alignment; after it, add its size.</p>`, `<p>Hint 2: Do not forget the end: the struct's alignment is the largest member alignment (8 here), and sizeof is rounded up to it.</p>`, `<p>Hint 3: For the reorder, list members by alignment 8, 4, 2, 1, 1. Then write <code>static_assert(sizeof(Order) == 32)</code>, <code>static_assert(offsetof(Order, qty) == 20)</code> and <code>static_assert(sizeof(Order2) == 16)</code> — if your arithmetic is wrong, the build fails.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"old 1600 MB, new 800 MB\n32 16 8 8 12 14 15"}]},
      solution: {
        approach: `<p>Compute the layout with the three rules, then sort members by descending alignment. Both results are locked in with compile-time checks so a future edit that re-introduces padding breaks the build instead of silently doubling memory.</p>`,
        code: R`
          #include <cstddef>
          #include <cstdio>
          struct Order  { char side; double price; char type; int qty; short venue; };
          struct Order2 { double price; int qty; short venue; char side; char type; };

          static_assert(offsetof(Order, price) == 8);    // 7 padding bytes after side
          static_assert(offsetof(Order, type)  == 16);
          static_assert(offsetof(Order, qty)   == 20);   // 3 padding bytes after type
          static_assert(offsetof(Order, venue) == 24);
          static_assert(sizeof(Order)  == 32);           // 26 rounded up to a multiple of 8
          static_assert(sizeof(Order2) == 16);           // 8+4+2+1+1, no padding at all

          static_assert(offsetof(Order2, qty) == 8 && offsetof(Order2, venue) == 12);
          static_assert(offsetof(Order2, side) == 14 && offsetof(Order2, type) == 15);
          static_assert(alignof(Order) == 8 && alignof(Order2) == 8);

          int main() {
              const double millions = 50;
              std::printf("old %.0f MB, new %.0f MB\n", millions * sizeof(Order), millions * sizeof(Order2));
              std::printf("%zu %zu %zu %zu %zu %zu %zu\n", sizeof(Order), sizeof(Order2), alignof(Order),
                          offsetof(Order2, qty), offsetof(Order2, venue), offsetof(Order2, side), offsetof(Order2, type));   // 32 16 8 8 12 14 15
          }`,
        dry: { head: ['member', 'offset before', 'align', 'padding', 'placed at', 'offset after'], rows: [
          ['char side', '0', '1', '0', '0', '1'], ['double price', '1', '8', '<span class="c-r">7</span>', '8', '16'], ['char type', '16', '1', '0', '16', '17'],
          ['int qty', '17', '4', '<span class="c-r">3</span>', '20', '24'], ['short venue', '24', '2', '0', '24', '26'], ['(tail, align 8)', '26', '8', '<span class="c-r">6</span>', '—', '<b>32</b>']] },
        complexity: `<p>Hand computation O(members). Memory: 32 → 16 bytes per order, 1.6 GB → 0.8 GB for 50 M orders, and 4 orders per cache line instead of 2.</p>`,
        followUps: ['What is sizeof on 32-bit x86 Linux, where double inside structs is 4-byte aligned?', 'Could you shrink it further by changing types (e.g. price as int64 ticks, venue as uint8_t)?', 'If Order is written to a binary file, what breaks when you reorder?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Branch prediction
     ====================================================================== */
  var PRED_NAMES = ['Strong N', 'Weak N', 'Weak T', 'Strong T'];

  topics.push({
    title: 'Branch Prediction: Why Sorted Data Runs Faster',
    analogy: `<p>A barista sees you walk in every morning and starts making your usual latte <b>before you order</b>. If you order the latte, you get it instantly. If today you want tea, the latte goes in the bin and she starts again — you waited longer than if she had never guessed. A CPU does the same with every <code>if</code>: it <b>guesses</b> which way the branch will go and races ahead. Right guess: free. Wrong guess: throw away ~15–20 cycles of work. If your customers are predictable, guessing is a huge win; if they are random, the guesser is wrong half the time.</p>`,
    explain: `<p><b>The plain idea:</b> a modern CPU is a long assembly line (a <b>pipeline</b> of ~15–20 stages) that works on many instructions at once. When it reaches a conditional jump, the condition is not known yet — so instead of stopping, it <b>predicts</b> the outcome and keeps executing <b>speculatively</b>. When the real answer arrives, a correct guess costs nothing; a <b>misprediction</b> flushes the pipeline and costs roughly <b>15–20 cycles</b> (several nanoseconds).</p>
      <p><b>How it guesses:</b> the simplest predictor is a <b>2-bit saturating counter</b> per branch: states Strong-Not-taken, Weak-Not-taken, Weak-Taken, Strong-Taken. Each real outcome nudges it one step. Two wrong answers in a row are needed to flip a strong opinion, so a loop branch (taken, taken, …, not taken once at the end) is predicted almost perfectly. Real CPUs use far smarter predictors (TAGE-like, using the history of recent branches) and can learn patterns like T N T N, but <b>nobody can predict random data</b>.</p>
      ${H.table(['branch pattern', 'example', 'prediction accuracy'], [
        ['Always the same', '<code>if (ptr == nullptr)</code> error checks', '~100%'],
        ['Loop back-edge', '<code>for (i = 0; i &lt; n; ++i)</code>', '~100% (one miss at exit)'],
        ['Simple repeating pattern', 'T N T N …', 'high on modern CPUs'],
        ['Sorted data vs threshold', 'N N N N T T T T', '~100% (one switch)'],
        ['Random data vs threshold', 'T N N T N T T N', '<span class="c-r">~50%</span>']
      ])}
      <p><b>The famous question:</b> "Why does processing a <b>sorted</b> array run several times faster than an unsorted one?" Code: <code>for (x : data) if (x &gt;= 128) sum += x;</code> with random bytes. Unsorted: the branch is a coin flip, ~50% mispredicted. Sorted: all the small values come first (always not-taken), then all the big ones (always taken) — the predictor is wrong about twice in total.</p>
      <p><b>Ways to win:</b> (1) make data predictable (sort, partition, group by type); (2) remove the branch — <b>branchless</b> code like <code>sum += (x &gt;= 128) * x;</code> or a <code>cmov</code> instruction; (3) move rare cases out of the hot path and tell the compiler with <code>[[likely]]</code>/<code>[[unlikely]]</code> (C++20) so the common path is the straight-line fall-through.</p>`,
    clues: [
      '"Why is processing a sorted array faster than an unsorted one?" → branch prediction (the most famous performance question)',
      '"Data-dependent if inside a hot loop" + "random input" → mispredictions, consider branchless code',
      '"Same instruction count but much slower on real data than on test data" → branch-misses in <code>perf stat</code>',
      '"Error handling path is rare" → <code>[[unlikely]]</code>, cold functions, keep hot path straight',
      '"Virtual call in a tight loop over mixed types" → indirect branch prediction, sort by type or devirtualise',
      '"Branchless min/max/abs/clamp" → conditional moves, masks, arithmetic on booleans'
    ],
    code: [R`
      #include <algorithm>
      #include <chrono>
      #include <cstdio>
      #include <random>
      #include <vector>
      // The classic experiment. Compile with g++ -O1 to keep the branch (higher -O levels may
      // turn it into cmov/SIMD and erase the difference - which is itself an interview point).
      long long sumBig(const std::vector<int>& v) {
          long long sum = 0;
          for (int x : v)
              if (x >= 128) sum += x;           // data-dependent branch
          return sum;
      }
      int main() {
          std::mt19937 rng(42);
          std::vector<int> data(1 << 24);
          for (int& x : data) x = static_cast<int>(rng() % 256);   // random bytes 0..255

          auto run = [&](const char* name) {
              auto t0 = std::chrono::steady_clock::now();
              long long s = 0;
              for (int rep = 0; rep < 10; ++rep) s += sumBig(data);
              auto t1 = std::chrono::steady_clock::now();
              std::printf("%-9s %lld  %.0f ms\n", name, s,
                          std::chrono::duration<double, std::milli>(t1 - t0).count());
          };
          run("unsorted");                      // ~50% branch misses
          std::sort(data.begin(), data.end());
          run("sorted");                        // ~0% branch misses: typically 3-6x faster
      }`, R`
      #include <cstdint>
      // Branchless building blocks. The compiler usually emits cmov / setcc / SIMD for these.
      long long sumBigBranchless(const int* a, int n) {
          long long sum = 0;
          for (int i = 0; i < n; ++i)
              sum += (a[i] >= 128) * a[i];      // bool -> 0 or 1, multiply instead of jump
          return sum;
      }
      int countBelow(const int* a, int n, int t) {
          int c = 0;
          for (int i = 0; i < n; ++i) c += (a[i] < t);   // no branch: add the comparison result
          return c;
      }
      std::int32_t branchlessMin(std::int32_t a, std::int32_t b) {
          return b ^ ((a ^ b) & -static_cast<std::int32_t>(a < b));   // mask is all-ones when a < b
      }
      int parse(int x) {
          if (x < 0) [[unlikely]] {             // C++20 hint: keep the error path out of the hot code
              return -1;
          }
          return x * 2;
      }`],
    codeTitle: ['Sorted vs unsorted: the famous benchmark', 'Branchless tricks and [[likely]]/[[unlikely]]'],
    viz: {
      title: '2-bit predictor: unsorted vs sorted data',
      input: '200 15 130 90 250 40 128 7 180 60 99 140',
      inputLabel: 'Values 0-255 separated by spaces (branch: if (x >= 128)) — max 16',
      gen: function (input) {
        var a = String(input === undefined || input === null ? '200 15 130 90 250 40 128 7 180 60 99 140' : input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!a.length || a.some(function (x) { return isNaN(x) || x < 0 || x > 255 || x !== Math.floor(x); })) throw new Error('Enter integers 0-255 separated by spaces');
        if (a.length < 2 || a.length > 16) throw new Error('Use 2-16 values');
        var frames = [], code = 'for (int x : data)\n    if (x >= 128)      // the branch we predict\n        sum += x;';
        frames.push({ narr: 'The CPU keeps a <b>2-bit counter</b> for the branch <code>if (x &gt;= 128)</code>. States: Strong N → Weak N → Weak T → Strong T. It predicts <b>taken</b> in the two T states. Each real outcome moves it one step toward that outcome. We start in <b>Weak N</b>. First we feed the data <b>as given</b>, then <b>sorted</b>.',
          parts: [{ type: 'code', label: 'Hot loop', lang: 'cpp', code: code, hl: { 2: 'cur' } },
            { type: 'array', label: 'data (as given)', values: a.slice(), hl: (function () { var h = {}; a.forEach(function (x, i) { h[i] = x >= 128 ? 'ok' : 'done'; }); return h; })() },
            note('Green = branch will be <b>T</b>aken (x ≥ 128). Grey = <b>N</b>ot taken.')] });
        function run(arr, label) {
          var s = 1, miss = 0, rows = [], out = [];
          arr.forEach(function (x, i) {
            var taken = x >= 128, predT = s >= 2, ok = taken === predT, before = PRED_NAMES[s];
            if (!ok) miss++;
            s = taken ? Math.min(3, s + 1) : Math.max(0, s - 1);
            rows.push([i, x, taken ? 'T' : 'N', before, predT ? 'T' : 'N', ok ? 'hit' : 'MISS', PRED_NAMES[s]]);
            var hl = {}; rows.forEach(function (r, k) { hl[k] = r[5] === 'hit' ? 'done' : 'bad'; }); hl[i] = ok ? 'ok' : 'bad';
            var ahl = {}; ahl[i] = ok ? 'ok' : 'bad';
            out.push({ narr: label + ' — x = <b>' + x + '</b>: actual <b>' + (taken ? 'Taken' : 'Not taken') + '</b>, predictor said <b>' + (predT ? 'Taken' : 'Not taken') + '</b> (' + before + '). ' +
                (ok ? '<span class="c-g">Correct guess</span> — the speculative work is kept, no penalty.' : '<span class="c-r">Mispredicted!</span> The pipeline is flushed: ~15–20 cycles lost.') + ' Counter moves to <b>' + PRED_NAMES[s] + '</b>.',
              parts: [{ type: 'array', label: label + ' data', values: arr.slice(), hl: ahl, ptr: (function () { var p = {}; p[i] = 'x'; return p; })() },
                { type: 'table', label: 'Predictor log', columns: ['i', 'x', 'actual', 'state before', 'guess', 'result', 'state after'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
                { type: 'vars', vals: { mispredicts: miss, branches: i + 1, missRate: Math.round(100 * miss / (i + 1)) + '%', cyclesLost: '~' + miss * 17 }, hl: ok ? {} : { mispredicts: 'bad' } }] });
          });
          return { frames: out, miss: miss };
        }
        var r1 = run(a, 'Unsorted');
        frames = frames.concat(r1.frames);
        var sorted = a.slice().sort(function (x, y) { return x - y; });
        frames.push({ narr: 'Unsorted run finished with <b>' + r1.miss + ' mispredictions out of ' + a.length + '</b>. The outcomes jump between T and N, so the counter is always one step behind. Now <b>sort</b> the same values: all the N outcomes come first, then all the T outcomes.',
          parts: [{ type: 'array', label: 'data (sorted)', values: sorted, hl: (function () { var h = {}; sorted.forEach(function (x, i) { h[i] = x >= 128 ? 'ok' : 'done'; }); return h; })() },
            { type: 'code', label: 'Hot loop (unchanged)', lang: 'cpp', code: code, hl: { 2: 'cur' } }] });
        var r2 = run(sorted, 'Sorted');
        frames = frames.concat(r2.frames);
        frames.push({ narr: '<b>Same values, same code, same sum.</b> Unsorted: ' + r1.miss + ' misses; sorted: <b>' + r2.miss + '</b>. On 16 million random bytes the unsorted loop mispredicts ~8 million times (~0.1 s wasted). Fixes: sort/partition the data, or remove the branch: <code>sum += (x &gt;= 128) * x;</code> has <b>zero</b> mispredictions regardless of order.',
          parts: [{ type: 'table', label: 'Summary', columns: ['order', 'branches', 'mispredicts', 'miss rate'], rows: [['as given', a.length, r1.miss, Math.round(100 * r1.miss / a.length) + '%'], ['sorted', a.length, r2.miss, Math.round(100 * r2.miss / a.length) + '%'], ['branchless', a.length, 0, '0%']], hl: { 1: 'ok', 2: 'sel' } },
            { type: 'bars', label: 'mispredictions', values: [r1.miss, r2.miss, 0], idxLabels: ['as given', 'sorted', 'branchless'], hl: { 0: 'bad', 1: 'ok', 2: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Which loop is faster? Sorted vs unsorted', html: `<p>Same 16 M random bytes, same loop <code>if (x &gt;= 128) sum += x;</code>. Unsorted at <code>-O1</code>: ~50% branch-miss rate → maybe 80 ms. After <code>std::sort</code>: &lt;1% misses → ~20 ms. <b>But</b> compile with <code>-O3</code> and GCC/Clang typically emit a branchless <code>cmov</code> or vectorise the loop with SIMD compares — now <b>both</b> run fast and in the same time. A complete interview answer mentions both halves: the predictor explanation, and "check the assembly, the compiler may already have removed the branch".</p>` },
      { title: 'Branchless counting for binary search', html: `<p>Binary search on random keys mispredicts about half its comparisons (each step is a coin flip). A branchless lower_bound replaces <code>if (a[mid] &lt; key) lo = mid + 1; else hi = mid;</code> with a conditional move on the base pointer. With fewer than ~1 M elements (cache-resident) this is often 2–3× faster. For huge arrays memory latency dominates instead, and layouts like Eytzinger (BFS order) plus prefetching win.</p>`, code: R`
        // First position with a[i] >= key in sorted a[0..n). Requires n >= 1.
        const int* branchlessLowerBound(const int* base, int n, int key) {
            while (n > 1) {
                int half = n / 2;
                base = (base[half] < key) ? base + half : base;   // usually compiled to cmov
                n -= half;                                         // same trip count for every key
            }
            return base + (*base < key);
        }` },
      { title: 'When branchless is SLOWER', html: `<p>If the branch is ~99% predictable (e.g. "value is almost never negative"), the predicted branch is essentially free, while branchless code <b>always</b> computes both sides and adds a data dependency (the <code>cmov</code> must wait for both inputs). So <code>sum += (x &lt; 0) ? 0 : x</code> can be slower than a well-predicted <code>if</code>. Rule: go branchless only when the condition is data-dependent and unpredictable — and measure <code>branch-misses</code> before and after.</p>` },
      { title: 'Indirect branches: virtual calls in a loop', html: `<p><code>for (Shape* s : shapes) total += s-&gt;area();</code> is an <b>indirect</b> branch: the target address comes from the vtable. The branch target buffer (BTB) predicts the target from history. If shapes are randomly mixed Circle/Square/Triangle, targets mispredict often; sorting the vector by type (or storing one vector per type) makes the target predictable — and lets the compiler devirtualise and inline when it knows the exact type.</p>` }
    ],
    deepDive: `<p><b>Inside the predictor.</b> The front-end must fetch the next instruction every cycle, before the current branch is even decoded. So it uses: a <b>Branch Target Buffer</b> (where does this branch jump?), a <b>direction predictor</b> (taken or not), a <b>Return Stack Buffer</b> (predicts <code>ret</code> targets by mirroring calls), and an indirect predictor for <code>jmp [rax]</code> / virtual calls. Modern direction predictors (TAGE / perceptron hybrids) index tables by the branch address <i>and</i> hashes of the last tens to thousands of branch outcomes, so they learn correlated patterns like "if the previous branch went left, this one goes right".</p>
      <p><b>Cost model.</b> Misprediction penalty ≈ pipeline depth from fetch to branch resolution: ~15–20 cycles on recent Intel/AMD/Apple cores, more if the condition depends on a cache miss (the branch cannot resolve until the load returns). At 4 instructions/cycle, one mispredict throws away ~60–80 instruction slots. <code>perf stat -e branches,branch-misses</code> shows the rate; above ~5% in a hot loop is worth investigating.</p>
      <p><b>Compiler transformations.</b> <i>If-conversion</i> turns simple <code>if</code>s into <code>cmov</code>/<code>csel</code>; the vectoriser turns whole loops into SIMD compares + masked adds/blends (AVX2/AVX-512, NEON/SVE), which have no branches at all. GCC's <code>-O2</code> already enables cheap vectorisation since GCC 12. Profile-guided optimisation (<code>-fprofile-generate</code> → run → <code>-fprofile-use</code>) tells the compiler real branch probabilities, so it lays out hot paths as fall-through and decides cmov vs branch with data instead of guesses (typically 10–20% on branchy code like compilers and interpreters).</p>
      <p><b>[[likely]] and __builtin_expect.</b> They do <b>not</b> program the hardware predictor. They change <b>code layout</b> (hot path falls through, cold path moved to the end or <code>.text.unlikely</code>) and influence if-conversion and inlining decisions. Wrong hints can hurt; prefer PGO for anything non-obvious.</p>
      <p><b>Security footnote — Spectre.</b> Speculative execution down a mispredicted path can load secret data into the cache before being squashed; timing the cache leaks it. Mitigations (retpolines, <code>lfence</code>, index masking like <code>array_index_nospec</code> in the Linux kernel) trade performance for safety. It is a good example of how a performance feature leaks through abstractions.</p>
      <p><b>Data-oriented fixes.</b> Partition data so each loop has a uniform branch (process all "active" entities, then all "inactive"), replace chains of <code>if</code>s with lookup tables, and use sentinel values to remove bounds checks from inner loops.</p>`,
    aiEra: `<p><b>What AI changes:</b> models know the "sorted array" story by heart and will happily rewrite your loops branchless. They rarely check whether the compiler <i>already</i> did it, and rarely measure, so you get bit-twiddled code that is harder to read and no faster — or slower when the branch was predictable.</p>
      <p><b>Use AI as a partner:</b> paste <code>perf stat</code> output and the hot loop and ask <code>Is this loop bound by branch mispredictions, cache misses or neither? What experiment would confirm it?</code> Ask it to explain the assembly from Compiler Explorer (<code>godbolt.org</code>): "is there a <code>cmov</code>, a <code>jcc</code>, or a vectorised compare here?"</p>
      <p><b>Where AI goes wrong:</b> claims <code>[[likely]]</code> "trains the branch predictor", recommends branchless code for highly predictable branches, or invents misprediction penalties. <b>What you must own:</b> knowing when a branch is data-dependent and unpredictable, reading <code>branch-misses</code>, recognising cmov/SIMD in assembly, and explaining the sorted-array effect clearly — it is still one of the most-asked C++ performance questions.</p>`,
    problems: [{
      title: 'Count Big Values Without Caring About Order', level: 'Medium', tags: ['branch prediction', 'branchless', 'performance'], companies: ['Google', 'Optiver', 'Apple'],
      statement: `<p>A hot loop counts how many values in a large array are <code>≥ T</code>. On sorted test data it is fast; on real (random) data it is 4× slower. Explain why, and write a version whose speed does <b>not</b> depend on the order of the data. Do not sort (sorting costs O(N log N), far more than the count).</p>`,
      constraints: `1 ≤ N ≤ 10<sup>8</sup>, values and T are 32-bit ints. Single pass, O(1) extra memory.`,
      example: `<p>data = [200, 15, 130, 90], T = 128 → answer <b>2</b>. Branch outcomes in this order are ${H.c('g', 'T')} ${H.c('r', 'N')} ${H.c('g', 'T')} ${H.c('r', 'N')} — alternating, so a 2-bit predictor starting at Weak-N mispredicts all 4. The branchless version computes <code>count += (x &gt;= T)</code> = 1 + 0 + 1 + 0 = 2 with no jumps at all.</p>`,
      brute: { why: `<p>The <code>if (x &gt;= T) ++count;</code> version has a conditional jump whose direction is random for random data: ~50% of iterations mispredict and each costs ~15–20 cycles, while the useful work (a compare and an add) costs about 1 cycle. Sorting first fixes prediction but costs O(N log N).</p>`, code: R`
        long long countBigBranchy(const std::vector<int>& v, int T) {
            long long count = 0;
            for (int x : v)
                if (x >= T) ++count;     // unpredictable on random data
            return count;
        }` },
      mcq: { q: 'The comparison <code>x &gt;= T</code> is random on real data. What is the most robust fix?', options: ['Add the comparison result (0 or 1) to the count — no branch at all', 'Mark the branch [[likely]]', 'Sort the data first, every time', 'Use a std::map to count'], answer: 0, explain: 'A bool converts to 0/1, so count += (x >= T) does the same work with setcc/SIMD instructions and has no branch to mispredict. [[likely]] only changes code layout; sorting costs O(N log N).' },
      hints: [`<p>Hint 1: The comparison already produces a 0 or 1. You do not need to <b>jump</b> on it — you can <b>add</b> it.</p>`, `<p>Hint 2: <code>count += (x &gt;= T);</code> becomes <code>setge</code>/<code>adc</code> in scalar code and a packed compare + subtract (the compare gives −1 for true) in SIMD code: 8 ints per instruction with AVX2.</p>`, `<p>Hint 3: Use <code>long long</code> for the count (N up to 10<sup>8</sup> fits in int, but be safe), iterate with a raw pointer or range-for, compile with <code>-O2 -march=native</code>, and verify with <code>perf stat -e branch-misses</code> that misses are ~0 and timing is identical for sorted and shuffled input.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"2\n0\n3 0\n3\n3 1\n5000000\n500000"}]},
      solution: {
        approach: `<p>Replace the control dependency (a jump) with a data dependency (an add of a boolean). The loop body becomes straight-line code that the predictor never has to guess and the vectoriser can process many elements per instruction. Performance is now independent of the data order.</p>`,
        code: R`
          #include <climits>
          #include <cstdio>
          #include <vector>
          long long countBig(const std::vector<int>& v, int T) {
              long long count = 0;
              for (int x : v)
                  count += (x >= T);        // bool -> 0/1: no branch, vectorises to SIMD compares
              return count;
          }
          int main() {
              std::vector<int> v = {200, 15, 130, 90};
              std::printf("%lld\n", countBig(v, 128));   // 2
              std::printf("%lld\n", countBig({}, 0));                              // 0
              std::printf("%lld %lld\n", countBig({5, 5, 5}, 5), countBig({5, 5, 5}, 6));   // 3 0
              std::printf("%lld\n", countBig({-5, -1, 0, 3}, -1));                 // 3
              std::printf("%lld %lld\n", countBig({INT_MIN, INT_MAX, 0}, INT_MIN), countBig({INT_MIN, INT_MAX, 0}, INT_MAX));   // 3 1
              std::vector<int> alt(10000000);
              for (size_t i = 0; i < alt.size(); ++i) alt[i] = i % 2 ? 200 : 15;
              std::printf("%lld\n", countBig(alt, 128));                           // 5000000
              std::vector<int> up(1000000);
              for (int i = 0; i < 1000000; ++i) up[i] = i + 1;
              std::printf("%lld\n", countBig(up, 500001));                         // 500000
          }`,
        dry: { head: ['x', 'x >= 128', 'count before', 'count after', 'branch?'], rows: [
          ['200', '1', '0', '1', 'none'], ['15', '0', '1', '1', 'none'], ['130', '1', '1', '2', 'none'], ['90', '0', '2', '<b>2</b>', 'none — 0 mispredictions']] },
        complexity: `<p>O(N) time, O(1) space. Branch mispredictions drop from ~N/2 to ~0 (just the loop exit); with SIMD the loop processes 8–16 elements per instruction, typically 4–10× faster on random data.</p>`,
        followUps: ['Write a branchless version of "sum of values ≥ T".', 'When would the branchy version be faster?', 'How would you count values in a range [L, R] branchlessly? (hint: unsigned trick <code>(unsigned)(x - L) &lt;= (unsigned)(R - L)</code>)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Inlining and compiler optimizations
     ====================================================================== */
  function optStages(c, n) {
    var sq = c * c, total = sq * n;
    return [
      { pass: 'Source at -O0', hl: { 1: 'cur', 6: 'cur' }, instr: '~' + (12 + n * 14),
        narr: 'At <code>-O0</code> the compiler translates literally: <code>square</code> is a real function, every iteration does a <b>call</b> (push args, jump, set up a frame, return), and every variable lives in stack memory. Roughly ' + (12 + n * 14) + ' instructions per call to <code>compute()</code>.',
        code: 'static int square(int x) { return x * x; }\nint compute() {\n    int c = ' + c + ';\n    int sum = 0;\n    for (int i = 0; i < ' + n + '; ++i)\n        sum += square(c);\n    int unused = sum * 2;\n    return sum;\n}' },
      { pass: 'Inlining', hl: { 6: 'ok' }, instr: '~' + (10 + n * 6),
        narr: '<b>Inlining:</b> <code>square</code> is tiny and its body is visible, so the call is replaced by the body itself. The call overhead disappears — but the real prize is that the optimiser can now see <code>c * c</code> <i>inside</i> <code>compute</code> and keep simplifying.',
        code: 'static int square(int x) { return x * x; }\nint compute() {\n    int c = ' + c + ';\n    int sum = 0;\n    for (int i = 0; i < ' + n + '; ++i)\n        sum += c * c;        // body pasted in\n    int unused = sum * 2;\n    return sum;\n}' },
      { pass: 'Constant propagation', hl: { 6: 'ok' }, instr: '~' + (8 + n * 5),
        narr: '<b>Constant propagation:</b> <code>c</code> is assigned once with the constant ' + c + ' and never changes, so every use of <code>c</code> is replaced by <code>' + c + '</code>.',
        code: 'static int square(int x) { return x * x; }\nint compute() {\n    int c = ' + c + ';\n    int sum = 0;\n    for (int i = 0; i < ' + n + '; ++i)\n        sum += ' + c + ' * ' + c + ';\n    int unused = sum * 2;\n    return sum;\n}' },
      { pass: 'Constant folding', hl: { 6: 'ok' }, instr: '~' + (6 + n * 3),
        narr: '<b>Constant folding:</b> <code>' + c + ' * ' + c + '</code> is computed at compile time → <code>' + sq + '</code>. (If this multiplication overflowed <code>int</code> it would be UB, and the compiler could assume it does not happen.)',
        code: 'static int square(int x) { return x * x; }\nint compute() {\n    int c = ' + c + ';\n    int sum = 0;\n    for (int i = 0; i < ' + n + '; ++i)\n        sum += ' + sq + ';\n    int unused = sum * 2;\n    return sum;\n}' },
      { pass: 'Loop elimination (scalar evolution)', hl: { 4: 'ok' }, instr: '~4',
        narr: '<b>Induction-variable analysis</b> ("scalar evolution") sees that the loop adds the same constant ' + n + ' times, so the final value is <code>' + n + ' × ' + sq + ' = ' + total + '</code>. The whole loop is replaced by its result.',
        code: 'static int square(int x) { return x * x; }\nint compute() {\n    int c = ' + c + ';\n    int sum = ' + total + ';     // loop computed at compile time\n    int unused = sum * 2;\n    return sum;\n}' },
      { pass: 'Dead code elimination', hl: { 1: 'bad', 3: 'bad', 5: 'bad' }, instr: '~2',
        narr: '<b>Dead code elimination:</b> <code>unused</code> is never read, <code>c</code> has no remaining uses, and <code>square</code> is <code>static</code> with no callers left — all deleted (red lines).',
        code: 'static int square(int x) { return x * x; }   // no callers\nint compute() {\n    int c = ' + c + ';                // no uses\n    int sum = ' + total + ';\n    int unused = sum * 2;      // never read\n    return sum;\n}' },
      { pass: 'Final machine code', hl: { 1: 'sel', 2: 'sel' }, instr: '2',
        narr: '<b>Result at -O2:</b> two instructions. This is legal because of the <b>as-if rule</b>: the compiler may do anything as long as the observable behaviour (I/O, volatile accesses, atomics/synchronisation) is the same as the abstract program. It is also why a naive benchmark of <code>compute()</code> measures nothing.',
        code: 'compute():\n    mov  eax, ' + total + '\n    ret' }
    ];
  }

  topics.push({
    title: 'Inlining & Compiler Optimizations: What -O2 Really Does',
    analogy: `<p>You give a chef a recipe that says "for each of 4 plates: go to the pantry, fetch salt, measure 5 g, come back, sprinkle". A smart chef reads the whole recipe first, notices it is always the same 5 g, measures 20 g once, and skips walking to the pantry four times. An optimising compiler is that chef: it reads your code, proves what is constant, pastes small helper recipes inline, deletes steps whose results nobody uses — and serves exactly the same dish. Your job is to write recipes the chef <b>can</b> see through.</p>`,
    explain: `<p><b>The plain idea:</b> the code you write describes <i>what</i> must happen; the optimiser decides <i>how</i>. The <b>as-if rule</b> lets it rewrite anything as long as the observable behaviour (output, <code>volatile</code> accesses, synchronisation) is unchanged. Common passes:</p>
      ${H.table(['optimization', 'before', 'after'], [
        ['Inlining', '<code>y = sq(x);</code>', '<code>y = x * x;</code>'],
        ['Constant folding/propagation', '<code>int k = 60*60; t = k*2;</code>', '<code>t = 7200;</code>'],
        ['Dead code elimination', '<code>int unused = f_pure();</code>', '(removed)'],
        ['Common subexpression elimination', '<code>a*b + a*b</code>', '<code>t = a*b; t + t</code>'],
        ['Loop-invariant code motion', '<code>for(..) x[i] = n*m + i;</code>', 'compute <code>n*m</code> once before the loop'],
        ['Strength reduction', '<code>x / 8</code> (unsigned), <code>i*stride</code> in a loop', '<code>x &gt;&gt; 3</code>, running pointer add'],
        ['Loop unrolling', '1 element per iteration', '4–8 per iteration, fewer branches'],
        ['Auto-vectorization (SIMD)', 'one add per element', 'one instruction adds 8–16 ints'],
        ['Copy elision / RVO', 'return a big object by value', 'built directly in the caller (guaranteed for prvalues since C++17)']
      ])}
      <p><b>Inlining is the gateway optimization.</b> A call itself costs only a few cycles, but it is a wall: the optimiser cannot see through it. Once inlined, constants flow in, branches fold, loops vectorise. That is why <code>std::sort</code> with a lambda is 2–3× faster than C's <code>qsort</code> with a function pointer — the comparator is inlined into the sort loop.</p>
      <p><b>The <code>inline</code> keyword does NOT force inlining.</b> In modern C++ it means "this definition may appear in several translation units" (the One Definition Rule exception for headers). The compiler inlines based on its own cost model. To force or forbid: <code>[[gnu::always_inline]]</code>, <code>[[gnu::noinline]]</code> / <code>__declspec(noinline)</code>.</p>
      <p><b>Optimization levels (GCC/Clang):</b> <code>-O0</code> debug-friendly, no optimization; <code>-O1</code> basic; <code>-O2</code> the production default (inlining, vectorisation with a cheap cost model since GCC 12); <code>-O3</code> more aggressive unrolling/vectorisation (bigger code, not always faster); <code>-Os</code>/<code>-Oz</code> optimise for size; <code>-Ofast</code> = <code>-O3 -ffast-math</code>, which <b>breaks IEEE floating-point rules</b> (NaN/Inf assumptions, reassociation). <code>-march=native</code> lets it use your CPU's newest SIMD (but the binary may not run on older machines). <code>-flto</code> enables inlining <b>across</b> .cpp files.</p>`,
    clues: [
      '"Why is std::sort faster than qsort?" → comparator inlined (template) vs called through a function pointer',
      '"Does the inline keyword make a function inline?" → no: ODR/linkage meaning; inlining is a compiler decision',
      '"My benchmark says 0 ns" / "faster at -O2 than physically possible" → dead code elimination, constant folding',
      '"Code works at -O0 but breaks at -O2" → almost always undefined behavior the optimiser exploited',
      '"Two pointer parameters, loop does not vectorise" → possible aliasing, consider <code>__restrict</code>',
      '"Ship a fast binary" → -O2/-O3, -march, LTO, PGO; "-Ofast" only if you accept non-IEEE math'
    ],
    code: [R`
      #include <algorithm>
      #include <cstdlib>
      #include <vector>
      // Why std::sort beats qsort: the comparator is a template parameter, so it is inlined.
      int cmpInt(const void* a, const void* b) {               // called through a pointer: no inlining
          int x = *static_cast<const int*>(a), y = *static_cast<const int*>(b);
          return (x > y) - (x < y);
      }
      void sortBoth(std::vector<int>& v1, std::vector<int>& v2) {
          std::qsort(v1.data(), v1.size(), sizeof(int), cmpInt);          // ~N log N indirect calls
          std::sort(v2.begin(), v2.end(), [](int a, int b) { return a < b; }); // compare inlined: 2-3x faster
      }

      // 'inline' = "may be defined in many .cpp files" (put it in a header). Not a command.
      inline int clamp01(int x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

      [[gnu::always_inline]] inline int hotAdd(int a, int b) { return a + b; }   // force (GCC/Clang)
      [[gnu::noinline]] void coldErrorPath(const char* msg) { std::abort(); }    // keep out of hot code

      // Aliasing blocks optimization: the compiler must assume dst and src may overlap.
      void scale(float* dst, const float* src, int n, float k) {
          for (int i = 0; i < n; ++i) dst[i] = src[i] * k;
      }
      // __restrict promises "no overlap" -> simpler vectorised loop with no runtime overlap check.
      void scaleNoAlias(float* __restrict dst, const float* __restrict src, int n, float k) {
          for (int i = 0; i < n; ++i) dst[i] = src[i] * k;
      }`, R`
      #include <cstdio>
      // Loop-invariant code motion and strength reduction, written out by hand.
      void fillBefore(int* out, int n, int rows, int cols) {
          for (int i = 0; i < n; ++i)
              out[i] = rows * cols + i * 8;          // rows*cols recomputed? i*8 multiplied each time?
      }
      void fillAfterWhatTheCompilerDoes(int* out, int n, int rows, int cols) {
          const int base = rows * cols;              // hoisted out of the loop (LICM)
          int step = 0;
          for (int i = 0; i < n; ++i, step += 8)     // multiply replaced by add (strength reduction)
              out[i] = base + step;
      }
      int main() {
          int a[4], b[4];
          fillBefore(a, 4, 2, 3);
          fillAfterWhatTheCompilerDoes(b, 4, 2, 3);
          std::printf("%d %d\n", a[3], b[3]);        // 30 30 - same observable behaviour
      }`],
    codeTitle: ['Inlining, the inline keyword, attributes and aliasing', 'What LICM and strength reduction do'],
    viz: [{
      title: 'Watch the optimizer pipeline fold a function',
      input: '5 4',
      inputLabel: 'c n  (the constant and the loop count, e.g. "5 4" or "7 10")',
      gen: function (input) {
        var w = words(input, '5 4'), c = parseInt(w[0], 10), n = parseInt(w[1], 10);
        if (isNaN(c) || isNaN(n) || c < -1000 || c > 1000 || n < 1 || n > 1000) throw new Error('Enter two integers: c in -1000..1000 and n in 1..1000, e.g. "5 4"');
        var st = optStages(c, n), frames = [], done = [];
        st.forEach(function (s, k) {
          done.push([k + 1, s.pass, s.instr]);
          var hl = {}; done.forEach(function (_, j) { hl[j] = j === k ? 'cur' : 'done'; });
          frames.push({ narr: s.narr, parts: [
            { type: 'code', label: k === st.length - 1 ? 'x86-64 assembly' : 'Code after this pass', lang: k === st.length - 1 ? 'text' : 'cpp', code: s.code, hl: s.hl },
            { type: 'table', label: 'Passes applied', columns: ['#', 'pass', 'instructions per call (approx)'], rows: done.map(function (r) { return r.slice(); }), hl: hl }] });
        });
        frames.push({ narr: '<b>Take-away:</b> inlining unlocked every later step. If <code>square</code> had been in another .cpp file (and no LTO), or called through a function pointer / <code>std::function</code> / virtual call the compiler could not resolve, the chain would stop at step 1 and ' + n + ' real calls would remain.',
          parts: [{ type: 'bars', label: 'approx. instructions per call', values: [12 + n * 14, 10 + n * 6, 8 + n * 5, 6 + n * 3, 4, 2, 2], idxLabels: ['O0', 'inline', 'cprop', 'fold', 'loop', 'DCE', 'final'], hl: { 0: 'bad', 6: 'ok' } },
            note('Try it yourself on Compiler Explorer (godbolt.org): paste the function and compare <code>-O0</code> with <code>-O2</code>.')] });
        return frames;
      }
    }, {
      title: 'Auto-vectorization: scalar vs 4-lane SIMD',
      input: '3 1 4 1 5 9 2 6 5 3 5 8',
      inputLabel: 'Up to 16 integers — the loop computes a[i] = a[i] * 2 + 1',
      gen: function (input) {
        var a = String(input === undefined || input === null ? '3 1 4 1 5 9 2 6 5 3 5 8' : input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!a.length || a.some(function (x) { return isNaN(x) || Math.abs(x) > 100000; })) throw new Error('Enter integers separated by spaces');
        if (a.length < 4 || a.length > 16) throw new Error('Use 4-16 numbers');
        var frames = [], s = a.slice(), v = a.slice(), i, k;
        frames.push({ narr: 'Loop: <code>for (i = 0; i &lt; n; ++i) a[i] = a[i] * 2 + 1;</code>. Scalar code handles <b>one</b> element per iteration. A 128-bit SIMD register holds <b>4 ints</b>, so vectorised code handles 4 per instruction (AVX2: 8, AVX-512: 16).',
          parts: [{ type: 'array', label: 'a', values: a.slice() }, { type: 'code', label: 'Loop', lang: 'cpp', code: 'for (int i = 0; i < n; ++i)\n    a[i] = a[i] * 2 + 1;', hl: { 2: 'cur' } }] });
        for (i = 0; i < s.length; i++) {
          s[i] = s[i] * 2 + 1;
          var hl = {}; for (k = 0; k < i; k++) hl[k] = 'done'; hl[i] = 'ok';
          frames.push({ narr: 'Scalar iteration ' + (i + 1) + ': load a[' + i + '], multiply, add, store, increment i, compare, branch. Result ' + s[i] + '.',
            parts: [{ type: 'array', label: 'a (scalar)', values: s.slice(), hl: hl, ptr: (function () { var p = {}; p[i] = 'i'; return p; })() }, { type: 'vars', vals: { iterations: i + 1, elementsPerIter: 1 } }] });
        }
        var it = 0;
        for (i = 0; i + 4 <= v.length; i += 4) {
          it++;
          for (k = i; k < i + 4; k++) v[k] = v[k] * 2 + 1;
          var hl2 = {}; for (k = 0; k < i; k++) hl2[k] = 'done';
          frames.push({ narr: 'SIMD iteration ' + it + ': <b>one</b> load brings a[' + i + '..' + (i + 3) + '] into a vector register, one shift (×2) and one add work on all 4 lanes, one store writes them back.',
            parts: [{ type: 'array', label: 'a (vectorised)', values: v.slice(), hl: hl2, range: [i, i + 3] }, { type: 'vars', vals: { iterations: it, elementsPerIter: 4 }, hl: { elementsPerIter: 'ok' } }] });
        }
        var rem = v.length - i;
        if (rem > 0) {
          for (k = i; k < v.length; k++) v[k] = v[k] * 2 + 1;
          it += rem;
          frames.push({ narr: '<b>Remainder (epilogue) loop:</b> ' + rem + ' element(s) left over that do not fill a whole vector are finished one at a time — the compiler generates this tail automatically.',
            parts: [{ type: 'array', label: 'a (vectorised)', values: v.slice(), range: [i, v.length - 1] }, { type: 'vars', vals: { iterations: it } }] });
        }
        frames.push({ narr: 'Same result, ' + s.length + ' scalar iterations vs <b>' + it + '</b> vectorised ones. Vectorisation needs: a simple counted loop, no dependence between iterations, no possible aliasing between arrays (or a runtime check), no calls that cannot be inlined. See what happened with <code>-fopt-info-vec</code> (GCC) or <code>-Rpass=loop-vectorize</code> (Clang).',
          parts: [{ type: 'bars', label: 'loop iterations', values: [s.length, it], idxLabels: ['scalar', 'SIMD x4'], hl: { 1: 'ok' } }, { type: 'array', label: 'final a', values: v.slice() }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Which is faster: qsort or std::sort?', html: `<p>Sorting 10 M ints: <code>qsort</code> ~1.0 s, <code>std::sort</code> with a lambda ~0.4 s at <code>-O2</code>. Both are O(N log N) introsort-like algorithms. The difference: qsort calls the comparator through a <code>void*</code>-taking function pointer ~230 M times (no inlining, no knowledge of the type), while <code>std::sort</code> is instantiated for <code>int</code> with the lambda as a template parameter, so each comparison becomes one <code>cmp</code> instruction. Lesson: <b>templates + lambdas give the optimizer visibility</b>; function pointers, <code>std::function</code> and virtual calls hide it.</p>` },
      { title: 'The benchmark that measured nothing', html: `<p><code>for (int i = 0; i &lt; 1e9; ++i) x = sqrt(i);</code> "runs in 0 ns" at <code>-O2</code>. <code>x</code> is never used afterwards, <code>sqrt</code> is a known pure builtin, so the whole loop is dead code. Fixes: use the result (print it, accumulate into a checksum), or pass it through an optimisation barrier like Google Benchmark's <code>benchmark::DoNotOptimize(x)</code>. Also watch for <b>constant folding</b>: if the inputs are compile-time constants the compiler may compute the answer at build time.</p>`, code: R`
        // A minimal escape hatch: tells GCC/Clang "this value is used, memory may be read".
        template <class T> inline void doNotOptimize(const T& value) {
            asm volatile("" : : "r,m"(value) : "memory");
        }` },
      { title: 'Inlining can make code SLOWER', html: `<p>Inlining a 200-line function into 50 call sites copies it 50 times. The binary grows, the hot loop no longer fits in the ~32 KB L1 instruction cache or the micro-op cache, and front-end stalls appear. Compilers weigh this with heuristics (function size, call frequency, <code>-finline-limit</code>), which is why "force-inline everything" is a bad idea. Mark rarely executed paths <code>[[gnu::cold]]</code>/<code>noinline</code> so the hot path stays compact.</p>` },
      { title: 'Devirtualization with final', html: `<p><code>struct Circle final : Shape { double area() const override; };</code>. In <code>double f(const Circle&amp; c) { return c.area(); }</code> the compiler knows no class can derive from <code>Circle</code>, so the virtual call becomes a direct call — which can then be inlined. Speculative devirtualisation (with PGO/LTO) goes further: "if the vptr is Circle's, call Circle::area inline, else do the virtual call".</p>`, code: R`
        struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
        struct Circle final : Shape {
            double r = 1;
            double area() const override { return 3.14159265358979 * r * r; }
        };
        double f(const Circle& c) { return c.area(); }   // direct (and inlinable) call: Circle is final` }
    ],
    deepDive: `<p><b>How the pipeline is organised.</b> GCC lowers C++ to GIMPLE (SSA form), Clang to LLVM IR (SSA). Most optimisations are passes over SSA: SCCP (constant propagation), GVN/CSE, LICM, loop unrolling/vectorisation, SROA (splitting structs into scalars so they live in registers), inlining (bottom-up over the call graph), then instruction selection, register allocation and scheduling for the target CPU. <code>-fdump-tree-all</code> (GCC) or <code>-mllvm -print-after-all</code> (Clang) shows each step; Compiler Explorer has an "Opt pipeline" view.</p>
      <p><b>Aliasing.</b> If two pointers might refer to overlapping memory, a store through one invalidates values loaded through the other, blocking vectorisation and forcing reloads. The <b>strict aliasing rule</b> lets compilers assume pointers to different types (e.g. <code>int*</code> and <code>float*</code>) do not alias — which is why type-punning through casts is UB. <code>__restrict</code> (non-standard but universal) promises no overlap for same-typed pointers. Passing scalars by value and copying loop bounds into locals also helps.</p>
      <p><b>LTO and PGO.</b> Without LTO each .cpp file is optimised alone; a call into another file cannot be inlined. <code>-flto</code> keeps the IR in object files and optimises the whole program at link time (ThinLTO in Clang scales this to huge codebases). PGO compiles once with instrumentation, runs a representative workload, and recompiles with real call counts and branch probabilities — Chrome, Firefox, CPython and most databases ship PGO builds for 10–20% gains. Post-link optimisers like BOLT reorder functions and basic blocks using sampled profiles for a further 5–15% on large server binaries.</p>
      <p><b>Floating point.</b> Without <code>-ffast-math</code> the compiler cannot reassociate <code>(a+b)+c</code> into <code>a+(b+c)</code>, so it cannot vectorise a float reduction (a sum in a different order gives different rounding). <code>-ffast-math</code> allows it but also assumes no NaN/Inf — <code>std::isnan</code> checks may be deleted. Safer targeted options: <code>-fno-math-errno</code>, <code>-fassociative-math</code> in one file, or write the reduction with multiple accumulators by hand.</p>
      <p><b>What blocks optimization</b> (checklist): calls to unknown functions (opaque to the optimiser), <code>volatile</code>, atomics with strong orderings, exceptions in tight loops (rarely), virtual calls, function pointers and <code>std::function</code>, possible aliasing, signed vs unsigned index types in some loops (signed overflow being UB actually <i>helps</i> — the compiler may assume <code>i+1 &gt; i</code>), and debug builds. <code>volatile</code> is for memory-mapped I/O and signal handlers, <b>not</b> for threads and not for "making benchmarks work".</p>
      <p><b>Guaranteed vs permitted.</b> C++17 <b>guarantees</b> copy elision when returning a prvalue (<code>return T{...};</code>). Named RVO (<code>T t; ...; return t;</code>) is permitted and nearly always done, falling back to a move. <code>constexpr</code>/<code>consteval</code> let you <i>require</i> compile-time evaluation instead of hoping for constant folding.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI makes micro-optimisation ideas cheap — and many of them are things the compiler already does (manual shifts for divisions, manual unrolling, "inline" everywhere, <code>register</code> keyword). The modern skill is knowing which transformations the compiler <b>cannot</b> do: change data layout, remove aliasing, expose a function body to inlining, change an algorithm, pick a better container.</p>
      <p><b>Use AI as a partner:</b> paste the Compiler Explorer output and ask <code>Explain this assembly line by line. Was the loop vectorised? Was f inlined? Why not?</code> Ask it to read <code>-fopt-info-vec-missed</code> or <code>-Rpass-missed=loop-vectorize</code> output — those messages are cryptic and AI is good at translating them ("possible aliasing between a and b").</p>
      <p><b>Where AI goes wrong:</b> it says <code>inline</code> forces inlining, recommends <code>-Ofast</code> without warning about NaN/IEEE breakage, suggests <code>volatile</code> to "prevent optimisation" in threaded code, and writes benchmarks that the optimiser deletes. <b>What you must own:</b> the as-if rule, reading basic x86/ARM assembly, designing honest benchmarks, and the habit of verifying every performance claim with a measurement at the real optimisation level.</p>`,
    problems: [{
      title: 'Fix the Benchmark That Says 0 ns', level: 'Medium', tags: ['dead code elimination', 'benchmarking', 'as-if rule'], companies: ['Meta', 'Microsoft', 'Two Sigma'],
      statement: `<p>A colleague measures a hash function: they call it 10<sup>8</sup> times in a loop, time it with <code>std::chrono</code>, and at <code>-O2</code> get "0.3 ns per call" (impossibly fast); at <code>-O0</code> they get 9 ns. Explain what the optimiser did, then write a benchmark that measures the real cost at <code>-O2</code>.</p>`,
      constraints: `Must compile at -O2 without disabling optimisations globally. Inputs must not be compile-time constants. Report ns per call.`,
      example: `<p>Buggy loop: <code>for (i…) h = hash(i);</code> with <code>h</code> unused → the optimiser proves <code>hash</code> has no side effects, ${H.c('r', 'deletes the loop')}, and the timer measures an empty interval. Fixed loop: accumulate ${H.c('g', 'checksum ^= hash(i)')} and print the checksum, so every call's result is observable.</p>`,
      brute: { why: `<p>The naive benchmark's result is never observed, so under the as-if rule the compiler may remove the calls entirely (dead code elimination), or hoist/fold them if inputs are constant. Benchmarking at <code>-O0</code> instead is just as wrong: you measure unoptimised code that never runs in production.</p>`, code: R`
        #include <chrono>
        #include <cstdint>
        #include <cstdio>
        static std::uint64_t mix(std::uint64_t x) {           // a small pure hash (splitmix64 finaliser)
            x ^= x >> 33; x *= 0xff51afd7ed558ccdULL;
            x ^= x >> 33; x *= 0xc4ceb9fe1a85ec53ULL;
            return x ^ (x >> 33);
        }
        int main() {
            auto t0 = std::chrono::steady_clock::now();
            std::uint64_t h = 0;
            for (std::uint64_t i = 0; i < 100'000'000; ++i) h = mix(i);   // result overwritten, never used
            auto t1 = std::chrono::steady_clock::now();
            std::printf("%.2f ns/call\n", std::chrono::duration<double, std::nano>(t1 - t0).count() / 1e8);
        }` },
      mcq: { q: 'Why is the -O2 timing near zero?', options: ['The calls have no observable effect, so the as-if rule lets the compiler delete them', 'The CPU caches the function result', 'steady_clock is broken at -O2', 'The hash function is too simple to measure'], answer: 0, explain: 'Nothing observable depends on h, and mix() is pure and visible, so removing the loop does not change the program\'s observable behaviour. The fix is to make the results observable.' },
      hints: [`<p>Hint 1: The compiler is allowed to remove anything whose result nobody can observe. Make each call's result matter.</p>`, `<p>Hint 2: Combine results into a checksum (<code>acc ^= mix(i)</code> or <code>acc += …</code>) and print it at the end. Feed inputs that depend on something the compiler cannot know (e.g. <code>argc</code>, or a value passed through an optimisation barrier) so the loop cannot be folded at compile time.</p>`, `<p>Hint 3: An inline-asm barrier <code>asm volatile("" : : "r,m"(v) : "memory")</code> (what <code>benchmark::DoNotOptimize</code> does) marks a value as used without adding real work. Also: warm up, repeat several runs, report the median, and pin the CPU frequency if you can.</p>`],
      tests: {"io":true,"cases":[{"stdin":"0\n","stdout":"checksum=0"},{"stdin":"1\n","stdout":"checksum=12994781566227106604"},{"stdin":"2\n","stdout":"checksum=10297927895968139467"},{"stdin":"10\n","stdout":"checksum=4259132847451516404"},{"stdin":"1000\n","stdout":"checksum=9163595225118762675"},{"stdin":"100000\n","stdout":"checksum=10925438547154730353"}]},
      solution: {
        approach: `<p>Make every result observable with a cheap combining operation (XOR into an accumulator, printed at the end), start from an input the compiler cannot constant-fold, and keep a barrier for values you cannot print. The measured time now includes the real hash work; the XOR adds well under 1 cycle per call and runs in parallel with the next hash.</p>`,
        code: R`
          #include <iostream>
          #include <chrono>
          #include <cstdint>
          #include <cstdio>
          template <class T> inline void doNotOptimize(const T& value) {
              asm volatile("" : : "r,m"(value) : "memory");     // "value is used; memory may be read"
          }
          static std::uint64_t mix(std::uint64_t x) {
              x ^= x >> 33; x *= 0xff51afd7ed558ccdULL;
              x ^= x >> 33; x *= 0xc4ceb9fe1a85ec53ULL;
              return x ^ (x >> 33);
          }
          int main(int argc, char**) {
              std::uint64_t N = 100'000'000;
              if (!(std::cin >> N)) N = 100'000'000;               // optional: how many calls to time
              std::uint64_t seed = static_cast<std::uint64_t>(argc);   // unknown at compile time
              std::uint64_t acc = 0;
              auto t0 = std::chrono::steady_clock::now();
              for (std::uint64_t i = 0; i < N; ++i) acc ^= mix(i + seed);   // every result is used
              auto t1 = std::chrono::steady_clock::now();
              doNotOptimize(acc);
              std::printf("checksum=%llu\n", static_cast<unsigned long long>(acc));
              std::fprintf(stderr, "%.2f ns/call\n", std::chrono::duration<double, std::nano>(t1 - t0).count() / N);
          }`,
        dry: { head: ['version', 'what the optimizer sees', 'what it does', 'measured'], rows: [
          ['h = mix(i), h unused', 'pure calls, result dead', 'deletes loop', '<span class="c-r">~0 ns (fake)</span>'],
          ['-O0 build', 'no optimisation', 'real calls, stack spills', '~9 ns (unrealistic)'],
          ['acc ^= mix(i + seed), print acc', 'every result feeds output', 'inlines mix, keeps all work', '<span class="c-g">~1–2 ns (real)</span>']] },
        complexity: `<p>O(N) work as intended. The measurement overhead (one XOR, loop counter) is under 1 cycle per iteration and overlaps with the hash's multiply latency.</p>`,
        followUps: ['Why is measuring latency (dependent calls) different from throughput (independent calls)? Which does this loop measure?', 'How does Google Benchmark choose the number of iterations?', 'What else can distort microbenchmarks? (turbo boost, cache warmth, branch predictor training on repeated inputs)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — The undefined behavior catalogue
     ====================================================================== */
  var UB_CASES = {
    overflow: {
      name: 'Signed integer overflow',
      code: '#include <climits>\nbool canIncrement(int x) {\n    return x + 1 > x;        // intended overflow check\n}\nint main() {\n    return canIncrement(INT_MAX);\n}',
      steps: [
        { l: 3, narr: 'The author wants to detect overflow: "if <code>x + 1</code> wraps around it becomes smaller than <code>x</code>". On real hardware, INT_MAX + 1 does wrap to INT_MIN.', vars: { x: 'INT_MAX = 2147483647', 'x + 1 on hardware': '-2147483648' } },
        { l: 3, cls: 'bad', narr: 'But in C++, <b>signed overflow is undefined behavior</b>. The optimiser reasons: "in every valid execution x + 1 does not overflow, and then x + 1 &gt; x is always true." So at <code>-O2</code> the function compiles to <code>return true;</code> (<code>mov eax, 1</code>).', vars: { 'compiler assumes': 'x + 1 never overflows', 'canIncrement compiles to': 'return true' } },
        { l: 6, cls: 'bad', narr: 'Result: at <code>-O0</code> the program returns 0 (false — the check "worked" by accident); at <code>-O2</code> it returns 1. <b>Different answers at different optimisation levels</b> is the classic fingerprint of UB.', vars: { '-O0 result': 'false', '-O2 result': 'true' } }
      ],
      fix: '#include <climits>\nbool canIncrement(int x) {\n    return x != INT_MAX;                  // test BEFORE doing the arithmetic\n}\nbool addOk(int a, int b, int& out) {\n    return !__builtin_add_overflow(a, b, &out);  // GCC/Clang builtin, no UB\n}',
      fixNote: 'Check before you compute, use <code>__builtin_add_overflow</code> (or C++26 <code>std::add_sat</code> for saturation), or do the maths in a wider / unsigned type. Unsigned arithmetic wraps by definition. Catch it with <code>-fsanitize=signed-integer-overflow</code> (part of UBSan).'
    },
    oob: {
      name: 'Out-of-bounds access',
      code: 'int table[4] = {1, 2, 3, 4};\nbool existsInTable(int v) {\n    for (int i = 0; i <= 4; ++i)     // <= reads table[4]\n        if (table[i] == v)\n            return true;\n    return false;\n}',
      steps: [
        { l: 3, narr: 'The loop runs i = 0, 1, 2, 3, <b>4</b>. <code>table</code> has only 4 elements (indices 0–3). Off-by-one: <code>&lt;=</code> instead of <code>&lt;</code>.', vars: { 'valid indices': '0..3', 'loop indices': '0..4' } },
        { l: 4, cls: 'bad', narr: 'When i == 4 the read <code>table[4]</code> is past the end: <b>undefined behavior</b>. It might read a neighbouring global, garbage, or crash.', vars: { i: 4, 'table[4]': 'UB' } },
        { l: 6, cls: 'bad', narr: '"Time travel": the optimiser reasons "reaching i == 4 is UB, so a valid program must return <b>true</b> during iterations 0–3." GCC has been shown to compile this whole function to <code>return true;</code> — the bug changes results even for values that are <i>not</i> in the table, before the bad read ever happens.', vars: { 'existsInTable(42) at -O2': 'true (!)' } }
      ],
      fix: '#include <algorithm>\n#include <array>\nstd::array<int, 4> table = {1, 2, 3, 4};\nbool existsInTable(int v) {\n    return std::find(table.begin(), table.end(), v) != table.end();   // no index math\n}',
      fixNote: 'Use iterators / range-for / algorithms so there is no index to get wrong, or <code>.at()</code> when an index is unavoidable. Detect with AddressSanitizer (<code>-fsanitize=address</code>), <code>-D_GLIBCXX_ASSERTIONS</code> (bounds-checked <code>operator[]</code> in libstdc++) or <code>-fsanitize=bounds</code>.'
    },
    null: {
      name: 'Null dereference (and the deleted check)',
      code: 'int readValue(int* p) {\n    int value = *p;          // dereference first\n    if (p == nullptr)        // check comes too late\n        return -1;\n    return value;\n}',
      steps: [
        { l: 2, narr: '<code>*p</code> is evaluated first. Dereferencing a null pointer is <b>undefined behavior</b>.', vars: { p: 'maybe nullptr' } },
        { l: 3, cls: 'bad', narr: 'The optimiser reasons: "p was already dereferenced, so in any valid execution p != nullptr — this check is always false." The <code>if</code> is <b>deleted</b>.', vars: { 'compiler knows': 'p != nullptr', 'check at -O2': 'removed' } },
        { l: 5, cls: 'bad', narr: 'Real-world case: a 2009 Linux kernel bug (TUN driver, CVE-2009-1897) had exactly this shape; GCC removed the null check and the bug became exploitable. The kernel now builds with <code>-fno-delete-null-pointer-checks</code>.', vars: { lesson: 'check before use' } }
      ],
      fix: 'int readValue(const int* p) {\n    if (p == nullptr)        // check FIRST\n        return -1;\n    return *p;\n}\nint readValueRef(const int& r) { return r; }   // or: take a reference, null is impossible',
      fixNote: 'Validate before dereferencing; prefer references (cannot be null) or <code>std::optional</code> for "maybe a value". UBSan <code>-fsanitize=null</code> and ASan report null and wild dereferences with a stack trace.'
    },
    dangling: {
      name: 'Dangling reference after vector growth',
      code: 'std::vector<int> v = {1, 2, 3};\nint& first = v[0];        // reference into the buffer\nv.push_back(4);           // size == capacity: reallocates\nstd::cout << first;       // reads freed memory',
      steps: [
        { l: 1, narr: '<code>v</code> owns a heap buffer with size 3 and (here) capacity 3.', vars: { size: 3, capacity: 3, buffer: 'block A' } },
        { l: 2, narr: '<code>first</code> refers to v[0] — an address inside block A.', vars: { size: 3, capacity: 3, buffer: 'block A', first: '→ A[0]' } },
        { l: 3, cls: 'bad', narr: '<code>push_back</code> needs room for a 4th element: it allocates block B (capacity 6 with GCC), moves 1, 2, 3 over, and <b>frees block A</b>. Every pointer, reference and iterator into A is now invalid.', vars: { size: 4, capacity: 6, buffer: 'block B', first: '→ A[0] (freed!)' } },
        { l: 4, cls: 'bad', narr: 'Reading <code>first</code> is a <b>use-after-free</b>: it may print 1 (memory not reused yet), garbage, or crash later. ASan reports <code>heap-use-after-free</code> on this exact line.', vars: { first: 'dangling', behaviour: 'undefined' } }
      ],
      fix: 'std::vector<int> v = {1, 2, 3};\nv.reserve(4);               // or: no long-lived references into a growing vector\nv.push_back(4);\nint first = v[0];           // take the reference/value AFTER the last growth\nstd::cout << first;',
      fixNote: 'Re-acquire references/iterators after any operation that may reallocate (<code>push_back</code>, <code>insert</code>, <code>resize</code>, <code>reserve</code>), store indices instead of pointers, or use a container with stable addresses (<code>std::deque</code> for push_back at ends, <code>std::list</code>, or <code>vector&lt;unique_ptr&lt;T&gt;&gt;</code>).'
    },
    uninit: {
      name: 'Reading an uninitialized variable',
      code: 'int pick(bool fast) {\n    int speed;               // no initial value\n    if (fast)\n        speed = 100;\n    return speed;            // garbage when fast == false\n}',
      steps: [
        { l: 2, narr: 'A local <code>int</code> without an initialiser has an <b>indeterminate value</b> — whatever bytes were on the stack.', vars: { speed: '?' } },
        { l: 3, narr: 'If <code>fast</code> is false, nothing ever assigns <code>speed</code>.', vars: { fast: 'false', speed: '?' } },
        { l: 5, cls: 'bad', narr: 'Returning it reads an indeterminate value: <b>UB</b> before C++26. The optimiser may reason "the only defined path assigns 100" and compile the function to <code>return 100;</code> — or return stack garbage. In <b>C++26</b> this becomes <i>erroneous behaviour</i>: still a bug, but with a defined (implementation-chosen) value instead of anything-goes.', vars: { 'possible result': '100, 0, or garbage' } }
      ],
      fix: 'int pick(bool fast) {\n    int speed = 0;           // always initialise\n    if (fast)\n        speed = 100;\n    return speed;\n}\nint pick2(bool fast) { return fast ? 100 : 0; }   // even better: no mutable variable',
      fixNote: 'Initialise at declaration (<code>int x{};</code>), prefer expressions over "declare then assign". Tools: <code>-Wall -Wuninitialized -Wmaybe-uninitialized</code>, MemorySanitizer (Clang), Valgrind, and hardening with <code>-ftrivial-auto-var-init=zero</code> (GCC 12+/Clang).'
    },
    shift: {
      name: 'Shift by too many bits',
      code: '#include <cstdint>\nstd::uint32_t lowMask(int n) {\n    return (1u << n) - 1;    // n == 32 ?\n}',
      steps: [
        { l: 3, narr: 'Goal: a mask of the lowest n bits. Fine for n = 0..31: <code>lowMask(4)</code> = 0b1111 = 15.', vars: { n: 4, result: 15 } },
        { l: 3, cls: 'bad', narr: 'For n = 32 the shift count equals the width of <code>uint32_t</code>: <b>undefined behavior</b> (also for negative n).', vars: { n: 32, '1u << 32': 'UB' } },
        { l: 3, cls: 'bad', narr: 'Hardware differs: x86 masks the count to 5 bits, so 1u &lt;&lt; 32 becomes 1u &lt;&lt; 0 = 1 and the mask is <b>0</b>; ARM64 gives 0 and the mask is <b>0xFFFFFFFF</b>. With constants the compiler may produce a third answer. (Note: since C++20, left-shifting a <i>negative</i> signed value is well-defined; the count rule is still UB.)', vars: { 'x86 result': '0', 'ARM64 result': '4294967295' } }
      ],
      fix: '#include <cstdint>\nstd::uint32_t lowMask(int n) {\n    if (n <= 0) return 0;\n    if (n >= 32) return 0xFFFFFFFFu;     // handle the edge explicitly\n    return (1u << n) - 1;\n}',
      fixNote: 'Guard the count, or shift a 64-bit value when you need up to 32. UBSan <code>-fsanitize=shift</code> reports "shift exponent 32 is too large for 32-bit type".'
    },
    alias: {
      name: 'Strict aliasing violation (type punning)',
      code: 'int foo(float* f, int* i) {\n    *i = 1;\n    *f = 0.0f;               // compiler assumes f != i\n    return *i;               // folded to: return 1\n}\n// int x; foo(reinterpret_cast<float*>(&x), &x);',
      steps: [
        { l: 2, narr: 'Write 1 through an <code>int*</code>.', vars: { '*i': 1 } },
        { l: 3, cls: 'bad', narr: '<b>Strict aliasing rule:</b> an object may only be accessed through its own type (or <code>char</code>/<code>unsigned char</code>/<code>std::byte</code>, or a similar type). So the compiler assumes a <code>float*</code> and an <code>int*</code> never point to the same object.', vars: { 'compiler assumes': 'f and i do not overlap' } },
        { l: 4, cls: 'bad', narr: 'Therefore <code>*i</code> must still be 1, and the load is removed: <code>return 1;</code>. If the caller passes the same address for both (line 6), the real memory now holds 0.0f bits (0), yet the function returns 1 at <code>-O2</code> and 0 at <code>-O0</code>.', vars: { '-O0 returns': 0, '-O2 returns': 1 } }
      ],
      fix: '#include <bit>\n#include <cstdint>\n#include <cstring>\nstd::uint32_t floatBits(float f) {\n    return std::bit_cast<std::uint32_t>(f);   // C++20: defined, constexpr, no copy at -O1+\n}\nstd::uint32_t floatBitsOld(float f) {\n    std::uint32_t u;\n    std::memcpy(&u, &f, sizeof u);            // pre-C++20 portable way\n    return u;\n}',
      fixNote: 'Use <code>std::bit_cast</code> (C++20) or <code>std::memcpy</code> for type punning — both compile to a single register move. Unions for punning are allowed in C but UB in C++ (GCC documents it as working). <code>-fno-strict-aliasing</code> (used by the Linux kernel) disables the assumption at some performance cost.'
    },
    race: {
      name: 'Data race on a plain variable',
      code: 'int counter = 0;              // shared, not atomic\nvoid work() {\n    for (int i = 0; i < 1000000; ++i)\n        ++counter;            // load, add, store\n}\n// std::thread a(work), b(work); a.join(); b.join();',
      steps: [
        { l: 4, narr: '<code>++counter</code> is three steps: load, add 1, store. Two threads run <code>work()</code> at the same time.', vars: { 'thread A': 'load 41', 'thread B': 'load 41' } },
        { l: 4, cls: 'bad', narr: 'Both loaded 41, both store 42: one increment is <b>lost</b>. But it is worse than "lost updates": a <b>data race</b> (two threads, same memory, at least one write, no synchronisation) is <b>undefined behavior</b>.', vars: { 'thread A': 'store 42', 'thread B': 'store 42', counter: 42 } },
        { l: 3, cls: 'bad', narr: 'Because races are UB, the optimiser may assume no other thread touches <code>counter</code>: it can keep it in a register for the whole loop and store once, or even replace the loop with <code>counter += 1000000</code>. Final values like 1000000, 1374211 or 2000000 are all possible.', vars: { 'expected': 2000000, 'observed': 'anything' } }
      ],
      fix: '#include <atomic>\nstd::atomic<int> counter{0};\nvoid work() {\n    for (int i = 0; i < 1000000; ++i)\n        counter.fetch_add(1, std::memory_order_relaxed);   // atomic RMW, no race\n}',
      fixNote: 'Use <code>std::atomic</code>, a <code>std::mutex</code>, or (best for counters) per-thread local sums combined at the end. ThreadSanitizer (<code>-fsanitize=thread</code>) reports "WARNING: ThreadSanitizer: data race" with both stacks. <code>volatile</code> does <b>not</b> fix races.'
    },
    sequence: {
      name: 'Unsequenced modifications',
      code: 'int i = 1;\nint x = i++ + i++;        // two unsequenced writes to i\nint a[4] = {0, 0, 0, 0};\nint j = 1;\na[j] = j++;               // OK since C++17',
      steps: [
        { l: 2, cls: 'bad', narr: 'The two operands of <code>+</code> are <b>unsequenced</b>: the compiler may evaluate them in any order or interleaved. Modifying <code>i</code> twice without sequencing is <b>UB</b> (not just "unspecified order"). GCC and Clang give different results.', vars: { i: 1, x: 'UB' } },
        { l: 5, narr: 'C++17 changed the rules: in <code>E1 = E2</code> the right side is sequenced before the left. So <code>j++</code> runs first (j becomes 2, value 1), then <code>a[j]</code> means <code>a[2]</code>. Well-defined: a = {0, 0, 1, 0}. In C++14 this was UB.', vars: { j: 2, a: '{0, 0, 1, 0}' } },
        { l: 5, narr: 'Similar C++17 fixes: <code>std::cout &lt;&lt; i &lt;&lt; i++</code> (left to right now) and <code>v[i] = i++</code>. But function arguments <code>f(i++, i++)</code> are only <i>indeterminately</i> sequenced: no UB, but you cannot know the order. Simply never modify a variable twice in one expression.', vars: { rule: 'one write per variable per expression' } }
      ],
      fix: 'int i = 1;\nint first = i++;          // separate statements = clear sequencing\nint second = i++;\nint x = first + second;   // 1 + 2 = 3, always',
      fixNote: 'Split side effects into separate statements. <code>-Wall</code> (<code>-Wsequence-point</code>) and <code>clang -Wunsequenced</code> warn about most cases.'
    }
  };
  var UB_KEYS = Object.keys(UB_CASES);

  topics.push({
    title: 'The Undefined Behavior Catalogue: Spot the UB',
    analogy: `<p>A contract with a builder says "the client will never ask for a fifth floor on a four-floor foundation". Because of that promise, the builder skips some checks and builds faster. If you <b>do</b> ask for a fifth floor, the contract says nothing about what happens — the builder is not obliged to warn you, refuse, or do anything sensible. <b>Undefined behavior</b> is C++'s version: you promise never to overflow a signed int, read past an array, use freed memory, etc. In exchange the compiler generates faster code. Break the promise and <i>anything</i> may happen — including the bug appearing in code <b>before</b> the bad line.</p>`,
    explain: `<p><b>The plain idea:</b> the C++ standard sorts "weird" behaviour into categories:</p>
      ${H.table(['category', 'meaning', 'example'], [
        ['<b>Implementation-defined</b>', 'compiler picks, and <b>documents</b> it', '<code>sizeof(long)</code>, whether plain <code>char</code> is signed'],
        ['<b>Unspecified</b>', 'one of several valid results, not documented, no disaster', 'order of evaluating function arguments <code>f(a(), b())</code>'],
        ['<b>Erroneous</b> (C++26)', 'a bug, but with a defined outcome; tools may diagnose', 'reading an uninitialised local <code>int</code>'],
        ['<b>Undefined (UB)</b>', 'no requirements at all on the <b>whole</b> program', 'signed overflow, out-of-bounds, use-after-free, data race']
      ])}
      <p><b>Why UB exists:</b> speed and portability. If signed overflow had to wrap, the compiler could not assume <code>i + 1 &gt; i</code>, could not widen a 32-bit loop counter to a 64-bit register, and some loops would not vectorise. If every array access had to be checked, every loop would pay for it.</p>
      <p><b>The scary part:</b> the optimiser <b>assumes UB never happens</b> and uses that as a fact. So UB does not just "give a wrong value at that line" — it can delete null checks, remove loops, make functions return constants, and affect code that ran <i>earlier</i> ("time travel"), because the compiler reasons about the whole path.</p>
      <p><b>The catalogue you must know by heart:</b></p>
      ${H.table(['#', 'UB', 'classic shape', 'tool that catches it'], [
        ['1', 'Signed integer overflow', '<code>INT_MAX + 1</code>, <code>a * b</code> in int, <code>INT_MIN / -1</code>, <code>abs(INT_MIN)</code>', 'UBSan'],
        ['2', 'Out-of-bounds read/write', '<code>i &lt;= n</code>, <code>v[v.size()]</code>, <code>s[-1]</code>', 'ASan, _GLIBCXX_ASSERTIONS'],
        ['3', 'Null / invalid pointer dereference', 'use before check, uninitialised pointer', 'UBSan, ASan'],
        ['4', 'Use-after-free / dangling', 'iterator after push_back, reference to a local, string_view to a temporary', 'ASan'],
        ['5', 'Double free / mismatched delete', '<code>delete</code> twice, <code>delete</code> on <code>new[]</code>', 'ASan'],
        ['6', 'Uninitialised read', '<code>int x; return x;</code>', 'MSan, Valgrind, -Wall'],
        ['7', 'Bad shifts', 'shift ≥ width or negative count', 'UBSan'],
        ['8', 'Strict-aliasing violation', '<code>*(int*)&amp;someFloat</code>', 'compiler warnings, review'],
        ['9', 'Data race', 'two threads, plain variable, one writes', 'TSan'],
        ['10', 'Unsequenced modification', '<code>i++ + i++</code>', '-Wsequence-point'],
        ['11', 'Division by zero', '<code>x / 0</code>, <code>x % 0</code>', 'UBSan'],
        ['12', 'Missing return in non-void function', 'falls off the end', '-Wreturn-type (an error in many builds)'],
        ['13', 'Modifying a string literal / const object', '<code>char* s = (char*)"hi"; s[0] = \'H\';</code>', 'crash (read-only page)'],
        ['14', 'Misaligned access', '<code>*(int*)(buf + 1)</code>', 'UBSan alignment'],
        ['15', 'Infinite loop with no side effects', '<code>while (x) {}</code> where x never changes', 'compiler may delete it (C++26 makes trivial <code>while(true);</code> OK)']
      ])}`,
    clues: [
      '"Works in debug, crashes or gives wrong answers in release" → UB exploited by the optimiser',
      '"Spot the bug" with <code>int</code> arithmetic near limits, <code>&lt;=</code> in loops, or references into a vector → overflow / OOB / invalidation',
      '"The null check is there but it still crashes" → dereference happened before the check',
      '"Different results on GCC vs Clang / x86 vs ARM" → UB or implementation-defined behaviour',
      '"Reinterpret bytes as a float / struct" → strict aliasing and alignment; use memcpy or std::bit_cast',
      '"Counter is wrong with 2 threads" → data race (UB), not just a "lost update"'
    ],
    code: R`
      #include <bit>
      #include <climits>
      #include <cstdint>
      #include <cstring>
      #include <optional>
      #include <string>
      #include <string_view>
      #include <vector>
      // A small "UB-free toolbox": safe versions of the catalogue's most common bugs.
      std::optional<int> safeAdd(int a, int b) {
          int r;
          if (__builtin_add_overflow(a, b, &r)) return std::nullopt;  // no UB, detects overflow
          return r;
      }
      std::optional<int> safeDiv(int a, int b) {
          if (b == 0 || (a == INT_MIN && b == -1)) return std::nullopt;   // both are UB otherwise
          return a / b;
      }
      int midpoint(int lo, int hi) { return lo + (hi - lo) / 2; }       // (lo + hi) / 2 can overflow
      std::uint32_t loadU32(const unsigned char* p) {                    // any alignment, no aliasing UB
          std::uint32_t v;
          std::memcpy(&v, p, sizeof v);
          return v;
      }
      std::uint32_t bitsOf(float f) { return std::bit_cast<std::uint32_t>(f); }
      std::string_view firstWord(const std::string& s) {                 // OK: views the caller's string
          return std::string_view(s).substr(0, s.find(' '));
      }
      // std::string_view bad() { std::string t = "temp"; return t; }    // dangling view: UB on use
      int sumAll(const std::vector<int>& v) {
          long long s = 0;
          for (int x : v) s += x;                                        // range-for: no index to get wrong
          return s > INT_MAX ? INT_MAX : (s < INT_MIN ? INT_MIN : static_cast<int>(s));
      }`,
    codeTitle: 'UB-free alternatives for the most common traps',
    viz: {
      title: 'Step through a UB case: what the optimiser assumes',
      input: 'overflow',
      inputLabel: 'Case: overflow | oob | null | dangling | uninit | shift | alias | race | sequence',
      gen: function (input) {
        var key = String(input === undefined || input === null ? 'overflow' : input).trim().toLowerCase();
        if (!UB_CASES[key]) throw new Error('Pick one of: ' + UB_KEYS.join(', '));
        var cs = UB_CASES[key], frames = [];
        var catHl = {}; catHl[UB_KEYS.indexOf(key)] = 'sel';
        frames.push({ narr: '<b>Case: ' + cs.name + '.</b> Read the code and try to spot the UB before stepping on. Remember: the compiler is allowed to assume UB <b>never happens</b>, and it optimises using that "fact".',
          parts: [{ type: 'code', label: 'Spot the UB', lang: 'cpp', code: cs.code, hl: {} },
            { type: 'table', label: 'UB catalogue (pick another case in the input box)', columns: ['key', 'case'], rows: UB_KEYS.map(function (k) { return [k, UB_CASES[k].name]; }), hl: catHl }] });
        cs.steps.forEach(function (s, i) {
          var hl = {}; hl[s.l] = s.cls || 'cur';
          var parts = [{ type: 'code', label: 'Step ' + (i + 1) + ' of ' + cs.steps.length, lang: 'cpp', code: cs.code, hl: hl }];
          if (s.vars) {
            var vh = {}; if (s.cls === 'bad') Object.keys(s.vars).forEach(function (k) { vh[k] = 'bad'; });
            parts.push({ type: 'vars', label: 'State / compiler knowledge', vals: s.vars, hl: vh });
          }
          frames.push({ narr: s.narr, parts: parts });
        });
        var fl = {}; cs.fix.split('\n').forEach(function (_, i) { fl[i + 1] = 'ok'; });
        frames.push({ narr: '<b>The fix.</b> ' + cs.fixNote, parts: [{ type: 'code', label: 'UB-free version', lang: 'cpp', code: cs.fix, hl: fl }] });
        frames.push({ narr: 'Summary for <b>' + cs.name + '</b>: the bug is not "a wrong value on one line" — it is a broken promise that lets the optimiser rewrite the surrounding code. Always build tests with sanitizers so these show up as clear reports instead of mysteries.',
          parts: [{ type: 'table', label: 'Before vs after', columns: ['', 'buggy', 'fixed'], rows: [['behaviour', 'undefined (varies by compiler/flags)', 'defined'], ['-O0 vs -O2', 'may differ', 'identical'], ['sanitizer report', 'yes', 'clean']], hl: { 1: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Spot the UB #1: the overflowing average', html: `<p><code>int mid = (lo + hi) / 2;</code> in a binary search over an array with 2 billion elements: <code>lo + hi</code> can exceed INT_MAX → signed overflow (UB; in practice a negative index and a crash). This bug lived in the JDK's and many C libraries' binary search for years. Fix: <code>lo + (hi - lo) / 2</code>, or C++20 <code>std::midpoint(lo, hi)</code>.</p>`, code: R`
        int mid1 = std::midpoint(2'000'000'000, 2'100'000'000);   // C++20 <numeric>, no overflow
        int lo = 2'000'000'000, hi = 2'100'000'000;
        int mid2 = lo + (hi - lo) / 2;                               // classic safe form` },
      { title: 'Spot the UB #2: returning a view of a temporary', html: `<p><code>std::string_view name() { std::string s = load(); return s; }</code> compiles cleanly — but the view points into <code>s</code>'s buffer, which is destroyed at the closing brace. Same with <code>const std::string&amp; get() { return "x"; }</code> (reference to a temporary) and <code>for (char c : makeObj().name())</code> (name() returns a reference into the temporary) before C++23's lifetime extension for range-for initialisers. Rule: <b>views and references never own</b>; return <code>std::string</code> by value when in doubt.</p>` },
      { title: 'Spot the UB #3: abs(INT_MIN) and INT_MIN / -1', html: `<p><code>std::abs(INT_MIN)</code>: the result (2147483648) does not fit in <code>int</code> → UB. <code>INT_MIN / -1</code> and <code>INT_MIN % -1</code>: same problem — and on x86 the <code>idiv</code> instruction actually <b>traps</b> (SIGFPE), crashing the program. Robust code converts to a wider type first: <code>std::llabs(static_cast&lt;long long&gt;(x))</code>.</p>`, code: R`
        long long safeAbs(int x) { return x < 0 ? -static_cast<long long>(x) : x; }   // works for INT_MIN` },
      { title: 'Spot the UB #4: the loop that never ends', html: `<p><code>for (int i = 0; i &gt;= 0; ++i) count++;</code> — the author expects the loop to stop when <code>i</code> overflows to negative. But overflow is UB, so the compiler may conclude <code>i &gt;= 0</code> is <b>always true</b> and generate an infinite loop. With <code>unsigned</code> or an explicit bound (<code>i &lt; INT_MAX</code>), the behaviour is defined.</p>` },
      { title: 'Not UB (common false alarms)', html: `<p>Unsigned overflow (<code>0u - 1</code> = UINT_MAX) is <b>defined</b> wrap-around. <code>a[i] = i++;</code> is defined since C++17. Right-shifting a negative <code>int</code> is arithmetic (sign-extending) and left-shifting a negative value is defined since C++20 (two's complement is mandatory). <code>f(i++, j++)</code> is fine. Knowing what is <i>not</i> UB is as important in interviews as knowing what is.</p>` }
    ],
    deepDive: `<p><b>How optimisers exploit UB (concretely).</b> (1) <b>Value range</b>: after <code>int y = x + 1;</code> the compiler may assume <code>x != INT_MAX</code>. (2) <b>Loop widening</b>: <code>for (int i = 0; i &lt; n; ++i) a[i]</code> on 64-bit — because <code>i</code> cannot overflow, the compiler can use a 64-bit register and a pointer increment instead of sign-extending each time. (3) <b>Null-check elimination</b> after a dereference. (4) <b>Dead path pruning</b>: any path that must execute UB is unreachable, so branches leading to it can be deleted — the root of "time travel". (5) <b>Aliasing</b>: type-based alias analysis lets loads be cached in registers across stores of other types.</p>
      <p><b>Real incidents:</b> the Linux TUN null-check deletion (2009); integer-overflow checks like <code>if (ptr + len &lt; ptr)</code> removed by GCC (pointer overflow is UB) causing CERT advisories; signed overflow in hash functions behaving differently across compilers; Chromium and Android finding thousands of bugs once ASan/UBSan fuzzing became standard. Memory-safety UB (OOB, UAF) is behind ~70% of serious security bugs in large C/C++ codebases (Microsoft and Chromium both reported this figure), which is why governments and companies now push memory-safe languages and C++ "profiles"/hardening.</p>
      <p><b>The 2026 picture.</b> C++26 adds <b>erroneous behaviour</b> for uninitialised reads (reading gives a defined value; implementations are encouraged to diagnose; opt out with <code>[[indeterminate]]</code>), a hardened standard library mode (bounds-checked <code>operator[]</code>, <code>front()</code>, <code>optional::operator*</code> etc. that trap instead of UB), <code>std::add_sat</code>-family saturating arithmetic, and makes trivial infinite loops like <code>while (true);</code> well-defined. Compilers already offer <code>-ftrivial-auto-var-init=zero|pattern</code>, <code>-fhardened</code> (GCC 14), libc++ hardening modes, and <code>-D_GLIBCXX_ASSERTIONS</code>. None of these make C++ memory-safe, but they turn many silent UBs into deterministic crashes.</p>
      <p><b>Lifetime UB beyond memory:</b> using an object after its destructor ran, calling a virtual function from a constructor's base-class phase (well-defined but surprising: it calls the base version), reading an inactive union member, <code>reinterpret_cast</code>ing raw bytes into an object type without starting its lifetime (C++23 <code>std::start_lifetime_as</code> fixes this), and violating a function's preconditions in the standard library (<code>std::sort</code> with a comparator that is not a strict weak ordering is UB and can crash by reading out of bounds).</p>
      <p><b>Practical defence in depth:</b> warnings as errors (<code>-Wall -Wextra -Werror</code> plus <code>-Wconversion</code> in new code), sanitizer builds in CI, fuzzing with sanitizers, <code>clang-tidy</code> (bugprone-*, cppcoreguidelines-*), <code>constexpr</code> unit tests (UB in a constant expression is a <b>compile error</b> — a free UB detector), and code review that knows this catalogue.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes a lot of C++ now, and it reproduces the UB patterns from its training data: <code>(lo + hi) / 2</code>, <code>reinterpret_cast</code> punning, <code>string_view</code> returned from locals, iterators used after <code>push_back</code>. Its code compiles and usually passes simple tests — UB is precisely the class of bug that tests miss.</p>
      <p><b>Use AI as a partner:</b> it is genuinely good at UB review when asked directly: <code>List every potential undefined behaviour in this function, citing the rule (overflow, lifetime, aliasing, bounds, race). For each, give an input that triggers it.</code> Ask it to turn a UBSan/ASan report into a minimal reproducer, or to write <code>constexpr</code> tests that would fail to compile on UB.</p>
      <p><b>Where AI goes wrong:</b> it mislabels defined behaviour as UB (unsigned wrap, C++17 sequencing, C++20 shifts) and vice versa ("unions are fine for type punning in C++"), and "fixes" races with <code>volatile</code>. It cannot <i>prove</i> absence of UB. <b>What you must own:</b> the catalogue, the categories (UB vs unspecified vs implementation-defined vs erroneous), and the discipline of running sanitizers — you sign off on the code, not the model.</p>`,
    problems: [{
      title: 'Overflow-Safe Checked Arithmetic', level: 'Medium', tags: ['undefined behavior', 'integer overflow', 'spot the UB'], companies: ['Microsoft', 'Google', 'Palantir'],
      statement: `<p>Write <code>bool checkedMul(int a, int b, int&amp; out)</code> that stores <code>a*b</code> in <code>out</code> and returns true, or returns false if the product does not fit in <code>int</code>. You may <b>not</b> perform any operation that overflows (that would be UB and the compiler could delete your check). First, explain why <code>int r = a * b; if (b != 0 &amp;&amp; r / b != a) return false;</code> is broken.</p>`,
      constraints: `a, b are any 32-bit ints including INT_MIN, -1, 0. No UB on any input. O(1).`,
      example: `<p>checkedMul(46341, 46341) → ${H.c('r', 'false')} (2147488281 &gt; INT_MAX = 2147483647). checkedMul(-46340, 46340) → ${H.c('g', 'true, out = -2147395600')}. checkedMul(INT_MIN, -1) → ${H.c('r', 'false')}: the true result 2147483648 does not fit, and computing it directly is UB (and the matching division traps on x86).</p>`,
      brute: { why: `<p>"Multiply, then check" performs the overflow first. Overflow is UB, so the compiler may assume <code>r / b == a</code> always holds and delete the check — the classic self-defeating overflow test. Even without optimisation, <code>r / b</code> with <code>r = INT_MIN, b = -1</code> traps.</p>`, code: R`
        bool checkedMulBroken(int a, int b, int& out) {
            int r = a * b;                     // UB if it overflows: everything after is meaningless
            if (b != 0 && r / b != a) return false;
            out = r;
            return true;
        }` },
      mcq: { q: 'Which approach is guaranteed free of UB for all 32-bit inputs?', options: ['Compute in long long (64-bit) and range-check before narrowing', 'Compute in int and compare with INT_MAX afterwards', 'Compute in unsigned and cast back to int without checking', 'Use volatile int for the result'], answer: 0, explain: 'A 32×32 product always fits in 64 bits, so the multiplication itself cannot overflow; then a range check decides whether it fits in int. The other options either overflow first or silently produce wrong values.' },
      hints: [`<p>Hint 1: The danger is performing the overflowing operation at all. Find a type in which the operation <b>cannot</b> overflow, or check the operands <b>before</b> multiplying.</p>`, `<p>Hint 2: |a|, |b| ≤ 2<sup>31</sup>, so |a·b| ≤ 2<sup>62</sup>, which fits in <code>long long</code>. Multiply as <code>static_cast&lt;long long&gt;(a) * b</code>, then compare with <code>INT_MIN</code>/<code>INT_MAX</code>.</p>`, `<p>Hint 3: For 64-bit inputs there is no wider standard type: use <code>__builtin_mul_overflow</code> (GCC/Clang), <code>__int128</code>, or divide-before-multiply checks (<code>a &gt; INT64_MAX / b</code> with careful sign cases). Test INT_MIN×−1, INT_MAX×1, 0×anything, −1×INT_MIN.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"0\n1 -2147395600\n0\n1 0\n1 2147483647\n1 -2147483647\n1 -2147483648\n0 0\n1 0\n0 0\n1 -2147483648\n1 2147395600\n0 0\n0 0\n0 0\n1 2147483646\n0 0\n1 -2147483648\n1 -63\n1 9223372030926249001\n0"}]},
      solution: {
        approach: `<p>Widen, compute, range-check, narrow. The 64-bit product of two 32-bit values is exact, so no step can overflow; the narrowing cast happens only when the value is known to fit. The builtin version is the idiomatic production choice and also works for 64-bit types.</p>`,
        code: R`
          #include <climits>
          #include <cstdio>
          bool checkedMul(int a, int b, int& out) {
              long long p = static_cast<long long>(a) * b;   // exact: |p| <= 2^62
              if (p < INT_MIN || p > INT_MAX) return false;   // would not fit in int
              out = static_cast<int>(p);                      // safe narrowing
              return true;
          }
          bool checkedMulBuiltin(long long a, long long b, long long& out) {
              return !__builtin_mul_overflow(a, b, &out);     // GCC/Clang: also works for 64-bit
          }
          int main() {
              int r = 0;
              std::printf("%d\n", checkedMul(46341, 46341, r));            // 0 (overflow)
              bool ok = checkedMul(-46340, 46340, r);                      // separate statement: argument order is unspecified
              std::printf("%d %d\n", ok, r);                               // 1 -2147395600
              std::printf("%d\n", checkedMul(INT_MIN, -1, r));             // 0
              const int cases[][2] = {{0, 0}, {INT_MAX, 1}, {INT_MAX, -1}, {INT_MIN, 1}, {-1, INT_MIN}, {INT_MIN, 0},
                                      {65536, 32768}, {65536, -32768}, {46340, 46340}, {-46341, 46341}, {INT_MAX, INT_MAX},
                                      {INT_MIN, INT_MIN}, {2, 1073741823}, {2, 1073741824}, {-2, 1073741824}, {7, -9}};
              for (auto& c : cases) {
                  r = 12345;
                  bool good = checkedMul(c[0], c[1], r);
                  std::printf("%d %d\n", good, good ? r : 0);
              }
              long long w = 0;
              bool b1 = checkedMulBuiltin(3037000499LL, 3037000499LL, w);
              std::printf("%d %lld\n", b1, b1 ? w : 0LL);                  // 1 9223372030926249001
              std::printf("%d\n", checkedMulBuiltin(3037000500LL, 3037000500LL, w));   // 0
          }`,
        dry: { head: ['a', 'b', 'p (64-bit)', 'fits in int?', 'returns'], rows: [
          ['46341', '46341', '2147488281', 'no (&gt; 2147483647)', '<span class="c-r">false</span>'],
          ['-46340', '46340', '-2147395600', 'yes', '<span class="c-g">true</span>'],
          ['INT_MIN', '-1', '2147483648', 'no', '<span class="c-r">false</span>'],
          ['0', 'INT_MIN', '0', 'yes', '<span class="c-g">true, out = 0</span>']] },
        complexity: `<p>O(1) time and space. A 64-bit multiply plus two compares (the builtin compiles to <code>imul</code> + a jump on the overflow flag).</p>`,
        followUps: ['Implement checkedAdd for <code>long long</code> without builtins.', 'Why is the check <code>if (ptr + len &lt; ptr)</code> also broken?', 'How would UBSan report the broken version? Which flag enables it?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Sanitizers
     ====================================================================== */
  topics.push({
    title: 'Sanitizers: ASan, UBSan, TSan, MSan & Friends',
    analogy: `<p>A museum puts invisible laser beams around every painting. Visitors walk around normally, but the moment a hand crosses a beam an alarm rings and a camera snapshot shows <b>exactly who, where and when</b>. Sanitizers are those lasers for your program: the compiler surrounds every heap block, stack array and global with "no-touch zones" and adds a tiny check before every memory access. The program runs 2–3× slower, but instead of silent corruption that crashes three hours later, you get an instant report pointing at the guilty line.</p>`,
    explain: `<p><b>The plain idea:</b> sanitizers are compiler instrumentation + a runtime library. You recompile with a flag, run your tests normally, and they <b>report bugs at the moment they happen</b> with stack traces for where the memory was allocated, freed and misused.</p>
      ${H.table(['sanitizer', 'flag', 'catches', 'typical cost'], [
        ['<b>AddressSanitizer</b> (ASan)', '<code>-fsanitize=address</code>', 'heap/stack/global buffer overflow, use-after-free, use-after-return/scope, double free, leaks (via LSan)', '~2× CPU, ~2–3× memory'],
        ['<b>UndefinedBehaviorSanitizer</b> (UBSan)', '<code>-fsanitize=undefined</code>', 'signed overflow, bad shifts, null deref, misalignment, invalid enum/bool, out-of-bounds on known-size arrays, division by zero, bad casts with <code>-fsanitize=vptr</code>', 'small (~1.2×)'],
        ['<b>ThreadSanitizer</b> (TSan)', '<code>-fsanitize=thread</code>', 'data races, some deadlocks (lock-order inversion)', '5–15× CPU, 5–10× memory'],
        ['<b>MemorySanitizer</b> (MSan, Clang only)', '<code>-fsanitize=memory</code>', 'use of uninitialised memory in branches/syscalls', '~3×; needs all libraries instrumented'],
        ['<b>LeakSanitizer</b> (LSan)', 'on by default with ASan on Linux', 'memory leaks at exit', 'near zero until exit']
      ])}
      <p><b>The standard recipe:</b> <code>g++ -std=c++20 -g -O1 -fno-omit-frame-pointer -fsanitize=address,undefined prog.cpp</code>. <code>-g</code> gives file:line in reports, <code>-O1</code> keeps it fast while still catching bugs, frame pointers make stack traces reliable. ASan and UBSan combine well; <b>TSan and MSan cannot be combined with ASan</b> (they use the address space differently) — CI usually runs separate jobs: ASan+UBSan, TSan, and (Clang) MSan.</p>
      <p><b>How ASan works in one picture:</b> every 8 bytes of your memory get 1 <b>shadow byte</b> saying how many of them are addressable (<code>00</code> = all 8, <code>01</code>–<code>07</code> = only the first k, negative values like <code>fa</code> = redzone, <code>fd</code> = freed). <code>malloc</code> surrounds each block with redzones; <code>free</code> poisons the block and keeps it in a <b>quarantine</b> so it is not reused immediately. Before each load/store the compiler inserts: "look up the shadow byte; if it says no, report".</p>
      <p><b>Reading a report:</b> the first line names the bug (<code>heap-buffer-overflow</code>, <code>heap-use-after-free</code>, <code>stack-buffer-overflow</code>…), then the READ/WRITE size and the stack of the bad access, then "0 bytes to the right of 40-byte region" (how far outside the block), then where the block was <b>allocated</b> (and <b>freed</b>, for UAF), then a shadow-memory dump. Read the top frames of each stack that are in <i>your</i> code.</p>`,
    clues: [
      '"Crash happens far away from the bug" / "heap corruption" / "works on my machine" → run ASan',
      '"Intermittent wrong results with threads" → TSan; a race is UB even if it "seems harmless"',
      '"Different output in release build" → UBSan for overflow/shift/alignment, MSan/Valgrind for uninitialised reads',
      '"Memory keeps growing" → LSan (ASan) at exit, heap profilers (heaptrack, jemalloc prof) for growth',
      '"How do you make a C++ codebase safer?" → sanitizer CI jobs + fuzzing + hardened stdlib + warnings as errors',
      '"Can we run this in production?" → too slow for ASan everywhere; GWP-ASan sampling, HWASan/MTE on ARM, hardened libc++'
    ],
    code: [{ lang: 'bash', code: `# Sanitizer builds (GCC or Clang). Keep -g for file:line, -O1 for speed, frame pointers for stacks.
g++ -std=c++20 -g -O1 -fno-omit-frame-pointer -fsanitize=address,undefined app.cpp -o app_asan
./app_asan                                   # prints a report and exits non-zero on the first error

# Make UBSan fatal and verbose (by default it prints and continues)
g++ -std=c++20 -g -O1 -fsanitize=undefined -fno-sanitize-recover=all app.cpp -o app_ubsan
UBSAN_OPTIONS=print_stacktrace=1 ./app_ubsan

# Data races: separate build, cannot be mixed with ASan
g++ -std=c++20 -g -O1 -fsanitize=thread app.cpp -o app_tsan && ./app_tsan

# Useful runtime options
ASAN_OPTIONS=detect_leaks=1:detect_stack_use_after_return=1:halt_on_error=1 ./app_asan

# Cheap always-on checks for debug/CI builds (libstdc++): bounds-checked operator[], front(), etc.
g++ -std=c++20 -O2 -D_GLIBCXX_ASSERTIONS app.cpp
# No recompilation possible? Valgrind (much slower, ~20-50x, but works on any binary)
valgrind --leak-check=full --track-origins=yes ./app`, title: 'Build and run commands' }, R`
      #include <cstdio>
      #include <cstdlib>
      #include <cstring>
      #include <thread>
      #include <vector>
      // A deliberately buggy program: run it with an argument to trigger one bug class.
      // g++ -g -O1 -fsanitize=address,undefined bugs.cpp && ./a.out 1
      int globalCounter = 0;
      int main(int argc, char** argv) {
          int which = argc > 1 ? std::atoi(argv[1]) : 0;
          if (which == 1) {                        // heap-buffer-overflow
              int* a = new int[10];
              a[10] = 42;                          // one past the end
              delete[] a;
          } else if (which == 2) {                 // heap-use-after-free
              std::vector<int> v = {1, 2, 3};
              int* p = &v[0];
              v.push_back(4);                      // reallocation frees the old buffer
              std::printf("%d\n", *p);
          } else if (which == 3) {                 // stack-buffer-overflow
              char name[8];
              std::strcpy(name, "too long a name");
              std::printf("%s\n", name);
          } else if (which == 4) {                 // UBSan: signed-integer-overflow
              int big = 2147483647;
              big += argc;                         // argc >= 2 here
              std::printf("%d\n", big);
          } else if (which == 5) {                 // LeakSanitizer: direct leak
              int* leak = static_cast<int*>(std::malloc(64));
              leak[0] = 1;
          } else if (which == 6) {                 // TSan (build with -fsanitize=thread)
              std::thread t([] { for (int i = 0; i < 100000; ++i) ++globalCounter; });
              for (int i = 0; i < 100000; ++i) ++globalCounter;
              t.join();
          }
          return 0;
      }`],
    codeTitle: ['Build and run commands', 'One program, six bug classes'],
    viz: {
      title: 'ASan shadow memory: redzones, partial granules and quarantine',
      input: 'alloc 10; write 0; write 9; write 10; read 16; free; read 3',
      inputLabel: 'Commands separated by ";" — alloc N (1-16), write i, read i, free  (i may be negative or past the end)',
      gen: function (input) {
        var cmds = String(input === undefined || input === null ? 'alloc 10; write 0; write 9; write 10; read 16; free; read 3' : input).split(/\s*;\s*/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
        if (!cmds.length || cmds.length > 12) throw new Error('Give 1-12 commands, e.g. "alloc 10; write 9; write 10; free; read 3"');
        var n = 0, mem = [], shadow = [], freed = false, allocated = false, frames = [], reports = 0;
        var instr = '// inserted before every 1-byte access to addr:\nint8_t k = *(int8_t*)((addr >> 3) + kShadowOffset);\nif (k != 0 && (int8_t)(addr & 7) >= k)\n    __asan_report_error(addr);\n// ...then the real load/store';
        function shadowVals() { return shadow.map(function (s) { return typeof s === 'number' ? (s === 0 ? '00' : '0' + s) : s; }); }
        function memHl(extra) { var h = {}; mem.forEach(function (m, i) { if (m === 'rz') h[i] = 'done'; else if (m === 'fd') h[i] = 'bad'; }); if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; }); return h; }
        frames.push({ narr: 'ASan keeps <b>1 shadow byte per 8 bytes</b> of application memory. <code>00</code> = all 8 bytes usable, <code>01</code>–<code>07</code> = only the first k are usable, <code>fa</code> = heap redzone (never touch), <code>fd</code> = freed memory. The compiler inserts the check on the right before every load and store.',
          parts: [{ type: 'code', label: 'What -fsanitize=address inserts', lang: 'cpp', code: instr, hl: { 2: 'cur', 3: 'cur' } }, note('Legend in the memory row: <b>rz</b> = redzone byte, <b>u</b> = allocated but not yet written, <b>w</b> = written, <b>fd</b> = freed (in quarantine).')] });
        cmds.forEach(function (c) {
          var m = c.match(/^(alloc|write|read|free)\s*(-?\d+)?$/);
          if (!m) throw new Error('Unknown command "' + c + '". Use alloc N, write i, read i, free');
          var op = m[1], arg = m[2] !== undefined ? parseInt(m[2], 10) : null;
          if (op === 'alloc') {
            if (arg === null || arg < 1 || arg > 16) throw new Error('alloc needs a size 1-16');
            n = arg; allocated = true; freed = false;
            var ug = Math.ceil(n / 8);
            mem = []; shadow = ['fa'];
            for (var i = 0; i < 8; i++) mem.push('rz');
            for (i = 0; i < ug * 8; i++) mem.push(i < n ? 'u' : 'rz');
            for (i = 0; i < 8; i++) mem.push('rz');
            for (i = 0; i < ug; i++) shadow.push(Math.min(8, n - i * 8) === 8 ? 0 : n - i * 8);
            shadow.push('fa');
            var sh = {}; for (i = 1; i <= ug; i++) sh[i] = 'ok';
            frames.push({ narr: '<code>char* p = new char[' + n + '];</code> The allocator reserves ' + n + ' bytes plus <b>redzones</b> on both sides. Shadow: left redzone <code>fa</code>, then ' + shadowVals().slice(1, ug + 1).join(', ') + (n % 8 ? ' (the last granule is <b>partial</b>: only its first ' + (n % 8) + ' bytes are inside the block)' : '') + ', then right redzone <code>fa</code>.',
              parts: [{ type: 'array', label: 'heap bytes (index = offset from p)', values: mem.slice(), hl: memHl(), start: -8 },
                { type: 'array', label: 'shadow bytes (one per 8-byte granule)', values: shadowVals(), hl: sh, idxLabels: shadow.map(function (_, g) { return 'p' + (g * 8 - 8 >= 0 ? '+' : '') + (g * 8 - 8); }) }] });
            return;
          }
          if (!allocated) throw new Error('Start with "alloc N" before ' + op);
          if (op === 'free') {
            if (freed) {
              reports++;
              frames.push({ narr: '<span class="c-r"><b>ERROR: AddressSanitizer: attempting double-free</b></span> — the block is already in quarantine (shadow <code>fd</code>). Without ASan, a double free corrupts the allocator\'s free lists and is a classic exploit primitive.',
                parts: [{ type: 'array', label: 'shadow bytes', values: shadowVals(), hl: { 1: 'bad' } }] });
              return;
            }
            freed = true;
            for (var g = 1; g < shadow.length - 1; g++) shadow[g] = 'fd';
            for (var b = 8; b < mem.length - 8; b++) if (mem[b] !== 'rz') mem[b] = 'fd';
            frames.push({ narr: '<code>delete[] p;</code> ASan does not hand the memory back right away: it <b>poisons</b> it (shadow <code>fd</code>) and puts it in a <b>quarantine</b> queue (256 MB by default), so a later use of a dangling pointer still lands on poisoned memory and is caught.',
              parts: [{ type: 'array', label: 'heap bytes', values: mem.slice(), hl: memHl(), start: -8 },
                { type: 'array', label: 'shadow bytes', values: shadowVals(), hl: (function () { var h = {}; for (var k = 1; k < shadow.length - 1; k++) h[k] = 'bad'; return h; })() }] });
            return;
          }
          if (arg === null) throw new Error(op + ' needs an index, e.g. "' + op + ' 3"');
          var addr = arg + 8;
          if (addr < 0 || addr >= mem.length) throw new Error('Index ' + arg + ' is outside the drawn region (' + (-8) + '..' + (mem.length - 9) + ')');
          var gi = addr >> 3, k = shadow[gi], bad = false, kind = '';
          if (k === 'fd') { bad = true; kind = 'heap-use-after-free'; }
          else if (k === 'fa') { bad = true; kind = 'heap-buffer-overflow'; }
          else if (k !== 0 && (addr & 7) >= k) { bad = true; kind = 'heap-buffer-overflow'; }
          var hlm = {}; hlm[addr] = bad ? 'bad' : 'ok';
          var hls = {}; hls[gi] = bad ? 'bad' : 'ok';
          var kv = typeof k === 'number' ? k : (k === 'fa' ? '0xfa (= -6 as int8)' : '0xfd (= -3 as int8)');
          var narr = '<code>p[' + arg + ']</code> ' + (op === 'write' ? '(write)' : '(read)') + ': address p' + (arg >= 0 ? '+' : '') + arg + ' → granule ' + gi + ', shadow k = ' + kv + ', addr &amp; 7 = ' + (addr & 7) + '. ';
          if (!bad) {
            narr += (k === 0 ? 'k == 0 → whole granule addressable. ' : (addr & 7) + ' &lt; ' + k + ' → inside the partial granule. ') + '<span class="c-g">OK</span>, the access proceeds.';
            if (op === 'write') mem[addr] = 'w';
          } else {
            reports++;
            var dist = arg >= n ? (arg - n) + ' bytes to the right of ' + n + '-byte region' : arg < 0 ? (-arg) + ' bytes to the left of ' + n + '-byte region' : arg + ' bytes inside of ' + n + '-byte region';
            narr += '<span class="c-r"><b>ERROR: AddressSanitizer: ' + kind + '</b></span> — ' + (op === 'write' ? 'WRITE' : 'READ') + ' of size 1, located ' + dist + (kind === 'heap-use-after-free' ? ', freed by the earlier <code>delete[]</code>' : '') + '. (Real ASan aborts here; this demo continues as if built with <code>-fsanitize-recover=address</code>.)';
          }
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'heap bytes', values: mem.slice(), hl: memHl(hlm), start: -8, ptr: (function () { var p = {}; p[addr] = 'p[' + arg + ']'; return p; })() },
            { type: 'array', label: 'shadow bytes', values: shadowVals(), hl: hls },
            { type: 'code', label: 'Check', lang: 'cpp', code: instr, hl: bad ? { 3: 'bad', 4: 'bad' } : { 3: 'ok' } }] });
        });
        frames.push({ narr: '<b>Summary:</b> ' + reports + ' error(s) detected. Note the <b>partial granule</b> trick: even a 1-byte overflow into the padding of the last 8-byte granule is caught, because the shadow byte records exactly how many bytes are valid. What ASan can <i>not</i> see: an overflow that jumps over the redzone into another valid block, or reads of uninitialised (but allocated) memory — that is MSan\'s job.',
          parts: [{ type: 'vars', vals: { errorsReported: reports, blockSize: n, redzoneBytesShown: 16 }, hl: reports ? { errorsReported: 'bad' } : { errorsReported: 'ok' } },
            note('Real ASan shadow address: <code>(addr &gt;&gt; 3) + 0x7fff8000</code> on x86-64 Linux. Redzones grow with the block size (16 B up to 2 KB).')] });
        return frames;
      }
    },
    examples: [
      { title: 'Reading a real ASan report', html: `<p>Running bug 1 from the program above prints (shortened):</p><pre>==4242==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x604000000038
WRITE of size 4 at 0x604000000038 thread T0
    #0 0x401234 in main bugs.cpp:14
0x604000000038 is located 0 bytes to the right of 40-byte region [0x604000000010,0x604000000038)
allocated by thread T0 here:
    #0 0x7f... in operator new[](unsigned long)
    #1 0x4011f0 in main bugs.cpp:13</pre><p>Read it as: <b>what</b> (heap overflow, a 4-byte WRITE), <b>where</b> (line 14), <b>how far</b> (0 bytes right of a 40-byte = 10-int block → index 10, off by one), <b>whose block</b> (allocated on line 13). Ten seconds to the root cause.</p>` },
      { title: 'UBSan in CI: make it fatal', html: `<p>By default UBSan prints <code>runtime error: signed integer overflow: 2147483647 + 2 cannot be represented in type 'int'</code> and <b>keeps running</b>, so a test suite can pass with errors buried in the log. In CI add <code>-fno-sanitize-recover=all</code> (or <code>UBSAN_OPTIONS=halt_on_error=1</code>) so the test fails. Some UBSan checks (<code>-fsanitize=bounds</code>, <code>-fsanitize-trap=all</code> with minimal runtime) are cheap enough for production builds of security-sensitive code — Android and Chrome ship some of them.</p>` },
      { title: 'TSan report for a data race', html: `<p>Bug 6 under <code>-fsanitize=thread</code> prints <code>WARNING: ThreadSanitizer: data race</code>, then "Write of size 4 at 0x... by thread T1" with its stack, then "Previous write of size 4 at 0x... by main thread" with the other stack, and the location ("global 'globalCounter'"). TSan uses <b>happens-before</b> tracking with vector clocks, so it reports races that did not visibly misbehave in this run — it does not need to get lucky with timing. Fix with <code>std::atomic&lt;int&gt;</code> or a mutex; then TSan goes quiet.</p>` },
      { title: 'Fuzzing + sanitizers = bug-finding machine', html: `<p>A fuzzer (libFuzzer, AFL++, honggfuzz) generates millions of mutated inputs and keeps those that reach new code. On its own it only finds crashes; with ASan/UBSan each silent memory or UB bug <b>becomes</b> a crash. Google's OSS-Fuzz has found tens of thousands of bugs in open-source projects this way. A fuzz target is tiny:</p>`, code: R`
        #include <cstddef>
        #include <cstdint>
        #include <string>
        // clang++ -g -O1 -fsanitize=fuzzer,address,undefined fuzz.cpp && ./a.out
        static bool parseHeader(const std::string& s) { return s.size() > 4 && s[0] == 'H'; }
        extern "C" int LLVMFuzzerTestOneInput(const std::uint8_t* data, std::size_t size) {
            std::string input(reinterpret_cast<const char*>(data), size);
            parseHeader(input);                  // any OOB/UB inside is reported by the sanitizers
            return 0;
        }` }
    ],
    deepDive: `<p><b>ASan internals.</b> Shadow address = <code>(addr &gt;&gt; 3) + offset</code> (0x7fff8000 on x86-64 Linux), so the check is a shift, an add, a load and a compare — about 2× overall slowdown. Stack arrays get redzones by reorganising the frame; globals get redzones at link time. <code>detect_stack_use_after_return=1</code> moves locals to a heap-allocated "fake stack" so returning a pointer to a local is caught. Container overflow annotations (<code>-D_GLIBCXX_SANITIZE_VECTOR</code>, on by default in libc++ builds with ASan) poison the area between <code>size()</code> and <code>capacity()</code> of a vector so <code>v[v.size()]</code> is caught even though the memory is allocated. Limitations: an access that jumps past the redzone into another live block is missed; uninitialised reads are not detected; it reserves 20 TB of virtual address space (fine on 64-bit).</p>
      <p><b>HWASan and MTE.</b> On ARM64, Hardware-assisted ASan uses the pointer's top-byte-ignore feature to store a random tag in the pointer and in memory granules (16 B); a mismatch on access = bug. Much lower memory overhead, probabilistic detection. ARMv8.5 <b>Memory Tagging Extension</b> does this in hardware with ~a few % overhead; Android and some Pixel/Apple configurations use it to catch memory bugs in production.</p>
      <p><b>Production-grade sampling.</b> GWP-ASan (in Chrome, Android, TCMalloc, Scudo) puts a tiny random sample of allocations on guard pages: near-zero overhead, catches UAF/overflow on real user workloads over millions of devices. Hardened allocators (Scudo, hardened_malloc) add checksums and delayed reuse.</p>
      <p><b>TSan internals.</b> Each 8-byte word gets shadow cells recording recent accesses (thread id, epoch, read/write). Synchronisation operations (mutex, atomics with acquire/release, thread create/join) update per-thread vector clocks. A conflicting access whose epoch is not ordered by happens-before is a race. It understands C++ atomics' memory orders but not hand-written assembly or exotic primitives (annotate them). False positives are rare; false negatives happen when the racy accesses are too far apart in time (shadow history is limited).</p>
      <p><b>MSan</b> tracks a shadow bit per bit of memory ("is this initialised?") and reports when an uninitialised value affects a branch, a pointer dereference or a syscall — not merely when it is copied. Every library (including libc++) must be built with MSan, or false positives appear; that is why it is mostly used in dedicated CI (Chromium, OSS-Fuzz).</p>
      <p><b>Valgrind vs sanitizers.</b> Valgrind's memcheck runs unmodified binaries on a synthetic CPU (20–50× slower), catches uninitialised reads and leaks, but misses stack and global overflows. Sanitizers need recompilation but are faster and more precise. <b>Static analysis</b> (clang-tidy, Clang Static Analyzer, Coverity, cppcheck, GCC <code>-fanalyzer</code>) finds bugs without running code but with more false positives — use all three layers.</p>`,
    aiEra: `<p><b>What AI changes:</b> a raw sanitizer report is long and intimidating; AI is excellent at turning it into "line 14 writes index 10 into a 10-element array allocated on line 13 — loop bound should be &lt; n". Pasting reports into an assistant is now a normal debugging step, and AI can write fuzz targets and sanitizer CI configs in minutes.</p>
      <p><b>Use AI as a partner:</b> <code>Here is an ASan report and the two functions it mentions. Explain the root cause, the minimal fix, and a regression test that would fail without the fix.</code> Ask it to generate a GitHub Actions matrix with asan+ubsan, tsan and msan jobs, or a libFuzzer harness for your parser.</p>
      <p><b>Where AI goes wrong:</b> it "fixes" the symptom (adds <code>+1</code> to an allocation, silences a TSan warning with a suppression file, marks variables <code>volatile</code>) instead of the root cause; it may suggest combining ASan and TSan in one build (impossible); and generated code that passes tests can still fail under sanitizers. <b>What you must own:</b> running the sanitizer builds, reading the report's three stacks yourself, and deciding whether a fix addresses ownership/lifetime or merely hides the evidence.</p>`,
    problems: [{
      title: 'Fix the Bug ASan Found', level: 'Easy', tags: ['ASan', 'off-by-one', 'heap-buffer-overflow'], companies: ['Google', 'Amazon', 'Adobe'],
      statement: `<p>This function builds prefix sums. It "works" in tests, but under <code>-fsanitize=address</code> CI fails with:</p><pre>ERROR: AddressSanitizer: heap-buffer-overflow
WRITE of size 8 ... in prefixSums(std::vector&lt;int&gt; const&amp;) prefix.cpp:5
... located 0 bytes to the right of 32-byte region
allocated by thread T0 here: ... prefix.cpp:3</pre><p>Explain each line of the report, find the bug, and fix it so <code>out[i]</code> = sum of the first <code>i</code> elements (out has size n+1).</p>`,
      constraints: `0 ≤ n ≤ 10<sup>6</sup>; values fit in int; sums need long long. No out-of-bounds access for any n, including n = 0.`,
      example: `<p>a = [3, 1, 4] → ${H.arr([0, 3, 4, 8], { label: 'out (size n+1 = 4)', hl: { 3: 'g' } })}</p><p>The 32-byte region is ${H.c('r', '4 × 8-byte long longs')}: the buggy code allocated only n + 1 = 4 slots but wrote index 4 — "0 bytes to the right" means the write landed exactly one element past the end.</p>`,
      brute: { why: `<p>The loop runs <code>i</code> from 0 to <code>n</code> inclusive and writes <code>out[i + 1]</code>, so the last iteration writes <code>out[n + 1]</code> — one slot past the end — and also reads <code>a[n]</code>, past the end of the input. Without ASan this silently corrupts the heap (another object's memory or allocator metadata) and may crash much later.</p>`, code: R`
        std::vector<long long> prefixSumsBuggy(const std::vector<int>& a) {
            int n = static_cast<int>(a.size());
            std::vector<long long> out(n + 1, 0);    // 4 slots for n = 3 -> 32 bytes
            for (int i = 0; i <= n; ++i)             // BUG: <= runs one iteration too many
                out[i + 1] = out[i] + a[i];          // i = n writes out[n+1] and reads a[n]
            return out;
        }` },
      mcq: { q: '"0 bytes to the right of 32-byte region" for a vector&lt;long long&gt; of size 4 means…', options: ['The bad access started exactly at index 4, one past the last element', 'The vector was 0 bytes long', 'The access was 32 elements too far', 'The memory was freed'], answer: 0, explain: '32 bytes = 4 × 8. An access starting 0 bytes after the end of the region is the element at index 4 — the classic off-by-one.' },
      hints: [`<p>Hint 1: Decode the report: region size ÷ element size = number of elements; "N bytes to the right" ÷ element size = how many elements past the end.</p>`, `<p>Hint 2: <code>out</code> has n+1 slots (indices 0..n). The loop writes <code>out[i+1]</code>, so <code>i</code> may go only up to n−1. The loop condition must be <code>i &lt; n</code>.</p>`, `<p>Hint 3: Better still, remove index arithmetic: use <code>std::partial_sum</code> or <code>std::inclusive_scan</code> into <code>out.begin() + 1</code>. Test n = 0 (out = {0}), n = 1, and run the tests under ASan with <code>-D_GLIBCXX_ASSERTIONS</code> too.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"0 3 4 8\n0\n0 5\n0 -1 -3 0\n0 2000000000 4000000000 6000000000\n1000001 1000000\n1"}]},
      solution: {
        approach: `<p>Fix the loop bound to <code>i &lt; n</code> so the highest write is <code>out[n]</code> and the highest read is <code>a[n-1]</code>. Alternatively let a standard algorithm do the iteration. Keep the ASan job in CI so the regression is caught automatically.</p>`,
        code: R`
          #include <cstdio>
          #include <numeric>
          #include <vector>
          std::vector<long long> prefixSums(const std::vector<int>& a) {
              const std::size_t n = a.size();
              std::vector<long long> out(n + 1, 0);
              for (std::size_t i = 0; i < n; ++i)       // highest write: out[n], highest read: a[n-1]
                  out[i + 1] = out[i] + a[i];
              return out;
          }
          std::vector<long long> prefixSumsStd(const std::vector<int>& a) {
              std::vector<long long> out(a.size() + 1, 0);
              std::inclusive_scan(a.begin(), a.end(), out.begin() + 1, std::plus<long long>{}, 0LL);
              return out;
          }
          int main() {
              for (long long x : prefixSums({3, 1, 4})) std::printf("%lld ", x);   // 0 3 4 8
              std::printf("\n");
              for (long long x : prefixSums({})) std::printf("%lld ", x);          // 0   (n = 0: one element, no overflow)
              std::printf("\n");
              for (long long x : prefixSums({5})) std::printf("%lld ", x);         // 0 5
              std::printf("\n");
              for (long long x : prefixSums({-1, -2, 3})) std::printf("%lld ", x); // 0 -1 -3 0
              std::printf("\n");
              for (long long x : prefixSums({2000000000, 2000000000, 2000000000})) std::printf("%lld ", x);   // 0 2000000000 4000000000 6000000000
              std::printf("\n");
              auto big = prefixSums(std::vector<int>(1000000, 1));
              std::printf("%zu %lld\n", big.size(), big.back());                   // 1000001 1000000
              std::vector<int> ten = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
              std::printf("%d\n", prefixSums(ten) == prefixSumsStd(ten));          // 1
          }`,
        dry: { head: ['i', 'reads a[i]', 'writes out[i+1]', 'in bounds?'], rows: [
          ['0', 'a[0] = 3', 'out[1] = 3', 'yes'], ['1', 'a[1] = 1', 'out[2] = 4', 'yes'], ['2', 'a[2] = 4', 'out[3] = 8', 'yes'],
          ['3 (buggy loop only)', 'a[3] — past end', 'out[4] — past end', '<span class="c-r">no: ASan report</span>']] },
        complexity: `<p>O(n) time, O(n) extra space. Under ASan the same code runs ~2× slower — fine for tests, not used in production builds.</p>`,
        followUps: ['Would <code>-D_GLIBCXX_ASSERTIONS</code> alone have caught this? Which access?', 'What would the report say if the bug were reading <code>a[-1]</code>?', 'Why might this bug never crash without ASan?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Profiling and benchmarking
     ====================================================================== */
  function parseProfile(input) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!s) throw new Error('Format: "parse 2; compute>matmul 6; compute>sort 1; log 1"');
    var items = s.split(/\s*;\s*/).filter(Boolean);
    if (items.length > 6) throw new Error('Use at most 6 call paths');
    return items.map(function (it) {
      var m = it.match(/^([A-Za-z_][\w>]*)\s+(\d+)$/);
      if (!m) throw new Error('Could not read "' + it + '". Use path weight, e.g. "compute>matmul 6"');
      var w = parseInt(m[2], 10);
      if (w < 1 || w > 9) throw new Error('Weights must be 1-9');
      var path = m[1].split('>').filter(Boolean);
      if (path.length > 3) throw new Error('Keep call paths to at most 3 levels below main');
      return { stack: ['main'].concat(path), w: w };
    });
  }

  topics.push({
    title: 'Profiling & Benchmarking: Measure, Don\'t Guess',
    analogy: `<p>A delivery company wants faster deliveries. One manager buys faster trucks. Another puts a GPS tracker on every van and discovers that drivers spend <b>60% of their time</b> waiting at one loading dock. Fixing the dock beats any truck. Profiling is the GPS tracker for your program: a <b>sampling profiler</b> peeks at "what is the CPU doing right now?" thousands of times per second and tells you where time actually goes — which is almost never where you guessed.</p>`,
    explain: `<p><b>The plain idea:</b> first measure <i>whether</i> it is slow (benchmark), then <i>where</i> (profile), then <i>why</i> (hardware counters), and only then optimise — and measure again.</p>
      <p><b>Two kinds of profilers:</b></p>
      <ul>
        <li><b>Sampling</b> (<code>perf</code>, VTune, AMD uProf, Instruments, Visual Studio, pprof): interrupt the program ~1000–4000 times per second and record the call stack. Low overhead (~1–5%), works on optimised binaries, statistically accurate for hot spots.</li>
        <li><b>Instrumentation</b> (gprof <code>-pg</code>, Callgrind, Tracy/Optick zones, manual timers): add code at function entry/exit. Exact call counts, but adds overhead and can distort tiny functions. Callgrind simulates the CPU (~50× slower) and counts every instruction and cache miss deterministically.</li>
      </ul>
      <p><b>Self vs total time.</b> A function's <b>self</b> time is samples where it is the function currently executing; <b>total</b> (inclusive) time includes everything it calls. <code>main</code> has ~100% total but ~0% self. Optimise functions with high <b>self</b> time, or callers whose total time comes from calling something too often.</p>
      <p><b>Amdahl's law</b> tells you the payoff before you start: if a part takes fraction <b>p</b> of the time and you speed it up by <b>s</b>, the overall speed-up is <b>1 / ((1 − p) + p / s)</b>.</p>
      ${H.table(['hot part p', 'speed-up s of that part', 'overall speed-up', 'lesson'], [
        ['60%', '2×', '1 / (0.4 + 0.3) = <b>1.43×</b>', 'good return'],
        ['60%', '∞ (deleted it)', '1 / 0.4 = <b>2.5×</b>', 'the ceiling'],
        ['5%', '10×', '1 / (0.95 + 0.005) = <b>1.05×</b>', 'not worth a week of work'],
        ['90%', '8× (8 threads)', '1 / (0.1 + 0.1125) = <b>4.7×</b>', 'the serial 10% caps you at 10×']
      ])}
      <p><b>The Linux toolbox in four commands:</b> <code>perf stat ./app</code> (cycles, instructions, IPC, branch-misses, cache-misses), <code>perf record -g ./app</code> then <code>perf report</code> (hot functions with call stacks), flame graph from <code>perf script</code>, and <code>perf annotate</code> (hot instructions inside a function). Build with <code>-O2 -g -fno-omit-frame-pointer</code> so the profile matches production and the stacks are complete.</p>`,
    clues: [
      '"The app is slow, what do you do first?" → reproduce + measure + profile; never optimise by guessing',
      '"Which function should we optimise?" → highest self time × achievable speed-up (Amdahl)',
      '"Low IPC" / "CPU at 100% but slow" → stalls: cache misses, branch misses, dependency chains (perf stat, top-down)',
      '"CPU is idle but requests are slow" → off-CPU time: locks, I/O, page faults — a CPU profiler will not show it',
      '"Microbenchmark shows 10× but production shows nothing" → benchmark pitfalls: warm caches, DCE, unrealistic data',
      '"p99 latency spikes" → tail latency, allocation, lock contention, GC-like pauses, histograms not averages'
    ],
    code: [R`
      #include <chrono>
      #include <cstdio>
      #include <string>
      // RAII scoped timer: the cheapest "instrumentation profiler" - prints on scope exit.
      class ScopedTimer {
      public:
          explicit ScopedTimer(std::string name)
              : name_(std::move(name)), start_(std::chrono::steady_clock::now()) {}
          ~ScopedTimer() {
              auto us = std::chrono::duration_cast<std::chrono::microseconds>(
                            std::chrono::steady_clock::now() - start_).count();
              std::printf("[timer] %-12s %lld us\n", name_.c_str(), static_cast<long long>(us));
          }
          ScopedTimer(const ScopedTimer&) = delete;
          ScopedTimer& operator=(const ScopedTimer&) = delete;
      private:
          std::string name_;
          std::chrono::steady_clock::time_point start_;     // steady_clock: never jumps backwards
      };
      // Amdahl's law: overall speed-up when fraction p of the run gets s times faster.
      double amdahl(double p, double s) { return 1.0 / ((1.0 - p) + p / s); }

      int main() {
          {
              ScopedTimer t("work");
              volatile double x = 0;                          // volatile only to keep this demo loop alive
              for (int i = 0; i < 10'000'000; ++i) x = x + i * 0.5;
          }
          std::printf("p=0.6, s=2   -> %.2fx\n", amdahl(0.6, 2));     // 1.43x
          std::printf("p=0.05, s=10 -> %.2fx\n", amdahl(0.05, 10));   // 1.05x
      }`, { lang: 'bash', code: `# 1. Is it slow, and what kind of slow?  (IPC < 1 usually means stalls)
perf stat -e cycles,instructions,branches,branch-misses,cache-references,cache-misses ./app
perf stat -M TopdownL1 ./app            # frontend / bad speculation / backend / retiring (Intel; AMD has similar groups)

# 2. Where?  Sample call stacks (need -g and frame pointers, or --call-graph dwarf)
g++ -std=c++20 -O2 -g -fno-omit-frame-pointer app.cpp -o app
perf record -F 999 -g ./app
perf report --no-children               # sort by SELF time
perf annotate hotFunction               # hot instructions inside one function

# 3. Flame graph (Brendan Gregg's scripts)
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg

# 4. Deterministic instruction / cache simulation (slow but exact, no root needed)
valgrind --tool=callgrind ./app && callgrind_annotate callgrind.out.*
valgrind --tool=cachegrind ./app

# Whole-program timing with statistics
hyperfine --warmup 3 './app input.txt'`, title: 'perf and friends: the command-line workflow' }],
    codeTitle: ['ScopedTimer + Amdahl\'s law', 'perf and friends: the command-line workflow'],
    viz: {
      title: 'How a sampling profiler builds a profile',
      input: 'parse 2; compute>matmul 6; compute>sort 1; log 1',
      inputLabel: 'Call paths with weights 1-9, e.g. "parse 2; compute>matmul 6; compute>sort 1; log 1"',
      gen: function (input) {
        var paths = parseProfile(input === undefined || input === null ? 'parse 2; compute>matmul 6; compute>sort 1; log 1' : input);
        var totalW = paths.reduce(function (s, p) { return s + p.w; }, 0);
        var nSamples = Math.min(24, totalW * 2);
        var cur = paths.map(function () { return 0; }), seq = [], i, k;
        for (i = 0; i < nSamples; i++) {                     // smooth weighted round-robin: deterministic, proportional
          var best = 0;
          for (k = 0; k < paths.length; k++) { cur[k] += paths[k].w; if (cur[k] > cur[best]) best = k; }
          cur[best] -= totalW;
          seq.push(best);
        }
        var funcs = [];
        paths.forEach(function (p) { p.stack.forEach(function (f) { if (funcs.indexOf(f) < 0) funcs.push(f); }); });
        var self = {}, total = {}, folded = {};
        funcs.forEach(function (f) { self[f] = 0; total[f] = 0; });
        var frames = [];
        frames.push({ narr: 'The profiler sets a timer (e.g. <code>perf record -F 999</code> ≈ 1000 interrupts/second). On each tick it records the <b>call stack</b> of the running thread, then lets the program continue. We will take ' + nSamples + ' samples. The program\'s real time split (unknown to the profiler) is given by your weights.',
          parts: [{ type: 'table', label: 'Call paths (hidden truth)', columns: ['call path', 'share of run time'], rows: paths.map(function (p) { return [p.stack.join(' → '), Math.round(100 * p.w / totalW) + '%']; }) },
            { type: 'bars', label: 'self samples per function', values: funcs.map(function () { return 0; }), idxLabels: funcs }] });
        seq.forEach(function (pi, t) {
          var p = paths[pi], leaf = p.stack[p.stack.length - 1];
          self[leaf]++;
          p.stack.forEach(function (f) { total[f]++; });
          var key = p.stack.join(';'); folded[key] = (folded[key] || 0) + 1;
          var bh = {}; funcs.forEach(function (f, j) { if (f === leaf) bh[j] = 'ok'; else if (p.stack.indexOf(f) >= 0) bh[j] = 'win'; });
          var sh = {}; sh[p.stack.length - 1] = 'cur';
          frames.push({ narr: 'Sample #' + (t + 1) + ': the CPU was inside <b>' + leaf + '</b>, called via ' + p.stack.join(' → ') + '. <b>' + leaf + '</b> gets +1 <i>self</i>; every function on the stack gets +1 <i>total</i>.',
            parts: [{ type: 'stack', label: 'Captured call stack', items: p.stack.slice(), hl: sh },
              { type: 'bars', label: 'self samples per function', values: funcs.map(function (f) { return self[f]; }), idxLabels: funcs, hl: bh },
              { type: 'vars', vals: { samples: t + 1, ms: (t + 1) + ' (at 1 kHz)' } }] });
        });
        var rows = funcs.map(function (f) { return [f, self[f], Math.round(100 * self[f] / nSamples) + '%', total[f], Math.round(100 * total[f] / nSamples) + '%']; });
        rows.sort(function (a, b) { return b[1] - a[1] || b[3] - a[3]; });
        var top = rows[0], p = top[1] / nSamples;
        frames.push({ narr: '<b>Flat profile</b> (what <code>perf report --no-children</code> shows), sorted by <b>self</b> samples. <code>main</code> is on every stack (100% total) but does almost no work itself. The hottest function is <b>' + top[0] + '</b> with ' + Math.round(100 * p) + '% self time. With only ' + nSamples + ' samples the percentages are noisy (±' + Math.round(100 / Math.sqrt(nSamples)) + '%) — real profiles take thousands.',
          parts: [{ type: 'table', label: 'Flat profile', columns: ['function', 'self', 'self %', 'total', 'total %'], rows: rows, hl: { 0: 'sel' } }] });
        frames.push({ narr: '<b>Folded stacks</b> — the input format for a flame graph. Each unique stack with its count; the flame graph draws each stack as a tower, width = sample count, so wide plateaus at the top are where the CPU actually burns time.',
          parts: [{ type: 'table', label: 'Folded stacks (stackcollapse output)', columns: ['stack', 'samples'], rows: Object.keys(folded).map(function (k) { return [k, folded[k]]; }).sort(function (a, b) { return b[1] - a[1]; }), hl: { 0: 'sel' } },
            { type: 'bars', label: 'total (inclusive) samples', values: funcs.map(function (f) { return total[f]; }), idxLabels: funcs }] });
        var s2 = 1 / ((1 - p) + p / 2), s4 = 1 / ((1 - p) + p / 4), sInf = 1 / (1 - p);
        frames.push({ narr: '<b>Amdahl check before optimising ' + top[0] + '</b> (p = ' + p.toFixed(2) + '): making it 2× faster gives ' + s2.toFixed(2) + '× overall, 4× gives ' + s4.toFixed(2) + '×, deleting it entirely caps out at ' + (isFinite(sInf) ? sInf.toFixed(2) + '×' : 'infinity') + '. Optimising a function with 5% self time can never give more than 1.05×.',
          parts: [{ type: 'table', label: 'Amdahl for the hottest function', columns: ['speed-up of ' + top[0], 'overall speed-up'], rows: [['2×', s2.toFixed(2) + '×'], ['4×', s4.toFixed(2) + '×'], ['∞', isFinite(sInf) ? sInf.toFixed(2) + '×' : '∞']], hl: { 1: 'ok' } },
            note('Next steps: <code>perf annotate ' + top[0] + '</code> to find the hot instructions, <code>perf stat</code> on it to see if it is cache-miss or branch-miss bound, then change the algorithm/data layout and re-measure.')] });
        return frames;
      }
    },
    examples: [
      { title: 'Reading perf stat', html: `<p>Two versions of a matrix routine:</p>${H.table(['counter', 'naive (i-j-k)', 'interchanged (i-k-j)'], [['instructions', '8.6 G', '8.1 G'], ['cycles', '24.0 G', '4.2 G'], ['IPC', '<span class="c-r">0.36</span>', '<span class="c-g">1.93</span>'], ['L1-dcache-load-misses', '2.1 G', '0.14 G'], ['branch-misses', '0.1%', '0.1%']])}<p>Same instruction count, but IPC (instructions per cycle) of 0.36 means the core sits idle most of the time waiting for memory. Cache misses drop 15× after the loop interchange. Branch misses are irrelevant here. <b>IPC below ~1 on a modern core = look at memory; high branch-miss % = look at branches.</b></p>` },
      { title: 'Microbenchmark pitfalls checklist', html: `<ul><li><b>Dead code / constant folding</b> — use results, <code>DoNotOptimize</code>.</li><li><b>Warm-up</b> — first iterations pay page faults, cold caches, CPU frequency ramp-up.</li><li><b>Unrealistic data</b> — 1 KB fits in L1; sorted test data trains the branch predictor; the same key every time is always cached.</li><li><b>Noise</b> — turbo boost, thermal throttling, other processes, ASLR: repeat runs, report median and spread, pin to a core (<code>taskset</code>), disable turbo for A/B comparisons.</li><li><b>Timer resolution</b> — use <code>steady_clock</code>, time many iterations, not one.</li><li><b>Measuring the wrong build</b> — always <code>-O2</code>/<code>-O3</code>, same flags as production.</li></ul><p>Google Benchmark handles iteration counts, statistics and barriers for you; <code>hyperfine</code> does the same for whole programs.</p>`, code: { lang: 'cpp', check: false, title: 'Google Benchmark (needs -lbenchmark)', code: R`
        #include <benchmark/benchmark.h>
        #include <algorithm>
        #include <numeric>
        #include <vector>
        static void BM_Sort(benchmark::State& state) {
            std::vector<int> v(state.range(0));
            for (auto _ : state) {
                state.PauseTiming();
                std::iota(v.rbegin(), v.rend(), 0);          // fresh reversed input each iteration
                state.ResumeTiming();
                std::sort(v.begin(), v.end());
                benchmark::DoNotOptimize(v.data());          // keep the work observable
                benchmark::ClobberMemory();
            }
            state.SetComplexityN(state.range(0));
        }
        BENCHMARK(BM_Sort)->Range(1 << 10, 1 << 20)->Complexity();
        BENCHMARK_MAIN();` } },
      { title: 'Off-CPU time: when the profiler shows nothing hot', html: `<p>A request takes 200 ms but the CPU profile shows only 15 ms of work. The other 185 ms the thread was <b>not running</b>: waiting on a mutex, a disk read, a network call, a page fault, or the scheduler. CPU sampling profilers only see on-CPU time. Tools: off-CPU flame graphs (<code>offcputime</code> from BCC/bpftrace), <code>perf sched</code>, <code>perf trace</code>, mutex contention profilers, distributed tracing (OpenTelemetry) for cross-service latency. Always ask: is this CPU-bound or wait-bound?</p>` },
      { title: 'Instrumentation zones for frame-based apps', html: `<p>Games and real-time systems care about <b>per-frame</b> timing (16.6 ms at 60 FPS), where averages hide spikes. Profilers like <b>Tracy</b> let you mark zones (<code>ZoneScoped;</code>) and show a live timeline of every frame, thread, lock and allocation with nanosecond resolution. Combine: sampling to find hot functions, zones to understand latency and ordering across threads.</p>` }
    ],
    deepDive: `<p><b>How perf samples.</b> The PMU (performance monitoring unit) counts hardware events — cycles, instructions retired, cache misses, branch misses. <code>perf record</code> programs a counter to overflow every N events (or a frequency with <code>-F</code>); the overflow interrupt captures the instruction pointer and walks the stack. Stack walking needs frame pointers (<code>-fno-omit-frame-pointer</code>; Fedora and Ubuntu 24.04 now build distro packages with them), DWARF unwinding (<code>--call-graph dwarf</code>: copies stack chunks, heavier), or hardware LBR (<code>--call-graph lbr</code> on Intel). <b>Skid</b>: the reported instruction may be a few instructions after the culprit; precise events (<code>:pp</code>, PEBS/IBS) reduce it.</p>
      <p><b>Top-down microarchitecture analysis</b> (Intel TMA, also on AMD/ARM in similar form) splits pipeline slots into <i>Retiring</i> (useful work), <i>Bad Speculation</i> (mispredicts), <i>Frontend Bound</i> (instruction fetch/decode — big code, i-cache misses), <i>Backend Bound</i> (memory or execution-unit stalls). It tells you which of the previous topics applies: cache layout, branch prediction, or code size/inlining.</p>
      <p><b>Statistics.</b> A sample count k has relative error ≈ 1/√k; 10 000 samples in a function → ±1%. When comparing two builds, run each several times and compare distributions (Mann-Whitney / bootstrap), not single numbers. Performance changes under 2–3% are usually noise on a laptop. Layout effects (code alignment, link order, environment size) can shift results by ±5% by themselves — tools like <code>perf stat -r 10</code> and randomised layouts help.</p>
      <p><b>Memory profiling.</b> heaptrack, Massif (Valgrind), jemalloc/tcmalloc heap profiles, and <code>perf mem</code> / <code>perf c2c</code> (finds false sharing: "cache-to-cache" transfers on the same line from different cores). Allocation counts matter as much as bytes: a hot path that allocates is usually a hot path that can be 2× faster.</p>
      <p><b>Continuous profiling in production.</b> Google-Wide Profiling started it; today eBPF-based agents (Parca, Pyroscope/Grafana, Datadog, Elastic) sample every server at ~1% overhead and aggregate flame graphs by service and version, so regressions show up the day they ship. Combined with PGO/BOLT, the same profiles can drive the compiler.</p>
      <p><b>The optimisation loop:</b> define the metric (throughput, p99 latency, memory) → build a reproducible benchmark → profile → form a hypothesis tied to a mechanism (cache, branches, allocation, algorithm, contention) → change one thing → measure → keep or revert. The biggest wins are still algorithmic and data-structure changes; micro-tuning comes last.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can read a <code>perf report</code>, a flame graph's folded stacks or a TMA breakdown and suggest likely causes in seconds — and generate the benchmark harness, the <code>hyperfine</code> command and the before/after table. That shrinks the "how do I even use perf" barrier dramatically.</p>
      <p><b>Use AI as a partner:</b> <code>Here is perf stat and the top 20 lines of perf report for my service. Which hypothesis is most consistent with these numbers (memory-bound, branch-bound, frontend-bound, contention), and what single experiment would confirm it?</code> Ask it to review your benchmark for pitfalls (DCE, warm-up, data realism) before you trust the numbers.</p>
      <p><b>Where AI goes wrong:</b> it proposes optimisations without data, reports invented speed-ups ("this will be 3× faster"), confuses self and total time, and suggests micro-optimisations for functions with 2% of the profile. <b>What you must own:</b> the discipline of measuring first, Amdahl reasoning, reading counters (IPC, misses), and refusing to merge a "performance fix" without before/after numbers on realistic data.</p>`,
    problems: [{
      title: 'Pick the Optimisation With the Best Payoff', level: 'Easy', tags: ['profiling', 'Amdahl\'s law', 'prioritisation'], companies: ['Amazon', 'Netflix', 'Uber'],
      statement: `<p>A profile of a batch job (100 s total) shows self times: <code>parseInput</code> 50 s, <code>computeScores</code> 30 s, <code>writeOutput</code> 15 s, other 5 s. The team can do <b>one</b> of: (A) make <code>computeScores</code> 10× faster (SIMD rewrite, 2 weeks), (B) make <code>parseInput</code> 2× faster (a faster parser library, 2 days), (C) make <code>writeOutput</code> 20× faster (buffering, 1 day). Compute the new total time and overall speed-up for each, and write a function that ranks options by speed-up.</p>`,
      constraints: `Fractions from the profile; speed-up factors s ≥ 1. Assume the parts are independent (no overlap).`,
      example: `<p>(A) 50 + 30/10 + 15 + 5 = ${H.c('b', '73 s → 1.37×')}. (B) 25 + 30 + 15 + 5 = ${H.c('g', '75 s → 1.33×')}. (C) 50 + 30 + 0.75 + 5 = ${H.c('y', '85.75 s → 1.17×')}. A gives the most, but B gives nearly as much in 2 days — and A + B together give 25 + 3 + 15 + 5 = 48 s (2.08×).</p>`,
      brute: { why: `<p>Guessing ("SIMD sounds fastest, let's do that") or picking the biggest <b>local</b> speed-up (C's 20×) ignores how much of the total each part represents. C's 20× applies to only 15% of the run. Without Amdahl's law you optimise the wrong thing.</p>`, code: R`
        // Naive: choose the option with the largest local speed-up factor.
        int pickBiggestFactor(const std::vector<double>& factor) {
            return static_cast<int>(std::max_element(factor.begin(), factor.end()) - factor.begin());
        }` },
      mcq: { q: 'Part X is 15% of the run. You make it 20× faster. Overall speed-up is about…', options: ['1.17×', '20×', '3×', '1.5×'], answer: 0, explain: '1 / (0.85 + 0.15/20) = 1 / 0.8575 ≈ 1.17×. The untouched 85% dominates.' },
      hints: [`<p>Hint 1: New time = untouched parts + improved part / s. Overall speed-up = old time / new time.</p>`, `<p>Hint 2: In fractions: speed-up = 1 / ((1 − p) + p / s). Compute it for each option and sort descending.</p>`, `<p>Hint 3: Also compute "speed-up per day of effort" — engineering prioritisation is payoff ÷ cost. Remember the ceiling: even infinite speed-up of a part with fraction p gives at most 1/(1 − p).</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"A: computeScores 10x overall 1.37x new time 73.00 s gain/day 0.037\nB: parseInput 2x overall 1.33x new time 75.00 s gain/day 0.167\nC: writeOutput 20x overall 1.17x new time 85.75 s gain/day 0.166\n0 options: 100.00 s, 1.00x\n2 options: 48.00 s, 2.08x\n3 options: 33.75 s, 2.96x\n1.00"}]},
      solution: {
        approach: `<p>Apply Amdahl's law per option, rank by overall speed-up, and (as a tie-breaker) by speed-up gained per day of effort. The math says A wins on absolute gain, B on gain per effort; C is a poor use of time despite its impressive local factor.</p>`,
        code: R`
          #include <algorithm>
          #include <cstdio>
          #include <string>
          #include <vector>
          struct Option { std::string name; double fraction; double factor; double days; };
          double amdahl(double p, double s) { return 1.0 / ((1.0 - p) + p / s); }
          double combined(const std::vector<Option>& chosen) {      // new total time (of 100 s) when several are applied
              double t = 100.0;
              for (const auto& o : chosen) t -= 100.0 * o.fraction * (1.0 - 1.0 / o.factor);
              return t;
          }

          int main() {
              std::vector<Option> opts = {
                  {"A: computeScores 10x", 0.30, 10.0, 10},
                  {"B: parseInput 2x",     0.50,  2.0,  2},
                  {"C: writeOutput 20x",   0.15, 20.0,  1}};
              auto all = opts;
              std::sort(opts.begin(), opts.end(), [](const Option& a, const Option& b) {
                  return amdahl(a.fraction, a.factor) > amdahl(b.fraction, b.factor);
              });
              for (const auto& o : opts) {
                  double s = amdahl(o.fraction, o.factor);
                  std::printf("%-22s overall %.2fx  new time %.2f s  gain/day %.3f\n",
                              o.name.c_str(), s, 100.0 / s, (s - 1.0) / o.days);
              }
              for (auto chosen : {std::vector<Option>{}, std::vector<Option>{all[0], all[1]}, all}) {
                  double t = combined(chosen);
                  std::printf("%zu options: %.2f s, %.2fx\n", chosen.size(), t, 100.0 / t);
              }
              std::printf("%.2f\n", amdahl(0.5, 1.0));                            // 1.00: a factor of 1 changes nothing
          }`,
        dry: { head: ['option', 'p', 's', '(1−p) + p/s', 'overall', 'gain per day'], rows: [
          ['A', '0.30', '10', '0.70 + 0.03 = 0.73', '<b>1.37×</b>', '0.037'],
          ['B', '0.50', '2', '0.50 + 0.25 = 0.75', '1.33×', '<b>0.167</b>'],
          ['C', '0.15', '20', '0.85 + 0.0075 = 0.8575', '1.17×', '0.166']] },
        complexity: `<p>O(k log k) for k options. The real "complexity" is in the profile: make sure the fractions come from realistic runs and that parts really are independent (I/O can overlap compute).</p>`,
        followUps: ['If parse and compute run in parallel pipelines, how does the analysis change?', 'Gustafson\'s law: why do bigger inputs make parallel speed-ups look better?', 'The profile was taken with -O0. Why are the fractions untrustworthy?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Which Loop Is Faster? Summing a Grid', level: 'Easy', tags: ['cache', 'row-major', 'which loop is faster'], companies: ['Microsoft', 'Nvidia', 'Arista'],
    statement: `<p>Given <code>static int g[2048][2048]</code>, two functions sum all elements. <code>sumA</code> loops <code>i</code> (rows) outside and <code>j</code> (columns) inside; <code>sumB</code> loops <code>j</code> outside and <code>i</code> inside. Which is faster at <code>-O2</code>, roughly by how much, and why? Then write the fast one.</p>`,
    constraints: `2048 × 2048 ints = 16 MB (bigger than a typical L2, comparable to L3). 64-byte cache lines.`,
    example: `<p><code>sumA</code> reads ${H.c('g', 'g[0][0], g[0][1], g[0][2] …')} — consecutive addresses, 1 miss per 16 ints. <code>sumB</code> reads ${H.c('r', 'g[0][0], g[1][0], g[2][0] …')} — 8 KB apart, a new cache line every access, and 2048 rows × 8 KB also map onto the same few cache sets (power-of-two stride). Typical: A ≈ 3 ms, B ≈ 20–40 ms.</p>`,
    brute: { why: `<p><code>sumB</code> has the same O(N²) work but uses only 4 bytes of every 64-byte line it loads before the line is evicted, so it moves ~16× more data from memory, defeats the prefetcher's sequential stream and suffers conflict misses from the 8 KB power-of-two stride.</p>`, code: R`
      static int g[2048][2048];
      long long sumB() {
          long long s = 0;
          for (int j = 0; j < 2048; ++j)        // column outside
              for (int i = 0; i < 2048; ++i)    // row inside: stride 8 KB
                  s += g[i][j];
          return s;
      }` },
    mcq: { q: 'In <code>g[i][j]</code> (row-major), which index should the innermost loop vary?', options: ['j — the last index', 'i — the first index', 'It does not matter at -O2', 'Whichever has the larger bound'], answer: 0, explain: 'Consecutive j values are adjacent in memory. The compiler rarely interchanges loops for you (it must prove it is legal and profitable), so write the right order yourself.' },
    hints: [`<p>Hint 1: Draw the memory: row 0 then row 1 then row 2. Which loop walks along that line?</p>`, `<p>Hint 2: Each cache miss brings 16 ints. Row order uses all 16; column order uses 1 before moving on.</p>`, `<p>Hint 3: Write <code>for i: for j: s += g[i][j]</code>, accumulate in <code>long long</code>. Bonus: the compiler can vectorise the contiguous inner loop with SIMD.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"2048\n2098 1\n4194304\n0"}]},
    solution: {
      approach: `<p>Row-outer, column-inner traversal reads memory sequentially, so every cache line is used fully and the hardware prefetcher streams lines ahead of the loop. The inner loop is also contiguous, enabling SIMD.</p>`,
      code: R`
        #include <cstdio>
        static int g[2048][2048];
        long long sumA() {
            long long s = 0;
            for (int i = 0; i < 2048; ++i)        // row outside
                for (int j = 0; j < 2048; ++j)    // column inside: consecutive addresses
                    s += g[i][j];
            return s;
        }
        long long sumB() {
            long long s = 0;
            for (int j = 0; j < 2048; ++j)        // column outside: 8 KB jumps
                for (int i = 0; i < 2048; ++i)
                    s += g[i][j];
            return s;
        }
        int main() {
            for (int i = 0; i < 2048; ++i) g[i][i] = 1;
            std::printf("%lld\n", sumA());        // 2048
            g[0][2047] = 100; g[2047][0] = -50;
            std::printf("%lld %d\n", sumA(), sumA() == sumB());   // 2098 1
            for (auto& row : g) for (int& x : row) x = 1;
            std::printf("%lld\n", sumA());        // 4194304
            for (auto& row : g) for (int& x : row) x = 0;
            std::printf("%lld\n", sumA());        // 0
        }`,
      dry: { head: ['access', 'address (bytes)', 'line', 'sumA result'], rows: [['g[0][0]', '0', 'L0', 'miss'], ['g[0][1]', '4', 'L0', 'hit'], ['g[0][15]', '60', 'L0', 'hit'], ['g[0][16]', '64', 'L1', 'miss (often prefetched)']] },
      complexity: `<p>O(N²) time for both; memory traffic N²/16 lines for sumA vs up to N² for sumB — typically 5–10× faster.</p>`,
      followUps: ['What if the array were <code>vector&lt;vector&lt;int&gt;&gt;</code>? (each row a separate allocation)', 'Why can padding the row to 2048 + 16 ints speed up sumB?']
    }
  });

  practice.push({
    title: 'Padding Calculation: Three Structs', level: 'Easy', tags: ['padding', 'sizeof', 'alignment'], companies: ['Qualcomm', 'Intel', 'Bloomberg'],
    statement: `<p>On x86-64 Linux, compute <code>sizeof</code> of each struct by hand, marking every padding byte:</p><pre>struct P1 { bool a; long long b; bool c; };
struct P2 { short s; char c; int i; };
struct P3 { char tag[3]; short s; double d; };</pre><p>Then prove your answers with <code>static_assert</code>.</p>`,
    constraints: `alignof: bool/char 1, short 2, int 4, long long/double 8.`,
    example: `<p>P1: a@0, ${H.c('r', '7 pad')}, b@8, c@16, ${H.c('r', '7 tail')} → <b>24</b>. P2: s@0, c@2, ${H.c('r', '1 pad')}, i@4 → <b>8</b>. P3: tag@0..2, ${H.c('r', '1 pad')}, s@4, ${H.c('r', '2 pad')}, d@8 → <b>16</b>.</p>`,
    brute: { why: `<p>Adding up member sizes (P1 = 10, P2 = 7, P3 = 13) ignores alignment entirely — every one of those answers is wrong. The forgotten tail padding is the most common mistake (P1's last 7 bytes).</p>`, code: R`
      // Wrong mental model: sizeof = sum of member sizes.
      constexpr int naiveP1 = 1 + 8 + 1;   // 10, but the real answer is 24
      constexpr int naiveP2 = 2 + 1 + 4;   // 7,  real answer 8
      constexpr int naiveP3 = 3 + 2 + 8;   // 13, real answer 16` },
    mcq: { q: 'Why does P1 end with 7 bytes of tail padding?', options: ['So that in an array P1 x[2], x[1].b is 8-byte aligned', 'Because bool must be 8 bytes', 'Because the compiler rounds every struct to 8', 'For the vtable pointer'], answer: 0, explain: 'sizeof must be a multiple of the struct alignment (8, from long long) so every array element is properly aligned.' },
    hints: [`<p>Hint 1: Track an offset. Before each member round it up to the member's alignment.</p>`, `<p>Hint 2: For arrays like <code>char tag[3]</code>, size is 3 and alignment is that of char (1).</p>`, `<p>Hint 3: Finish by rounding the total up to the largest member alignment. Then write <code>static_assert(sizeof(P1) == 24)</code> etc. — the compiler will confirm.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"24 8 16 16\n8 4 8"}]},
    solution: {
      approach: `<p>Apply the three layout rules member by member, then lock the answers in with compile-time checks (they are evaluated by the compiler, so a wrong answer fails the build).</p>`,
      code: R`
        #include <cstdio>
        #include <cstddef>
        struct P1 { bool a; long long b; bool c; };
        struct P2 { short s; char c; int i; };
        struct P3 { char tag[3]; short s; double d; };
        static_assert(offsetof(P1, b) == 8 && offsetof(P1, c) == 16 && sizeof(P1) == 24);
        static_assert(offsetof(P2, c) == 2 && offsetof(P2, i) == 4 && sizeof(P2) == 8);
        static_assert(offsetof(P3, s) == 4 && offsetof(P3, d) == 8 && sizeof(P3) == 16);
        struct P1Better { long long b; bool a; bool c; };      // reordered: 8 + 1 + 1 + 6 tail = 16
        static_assert(sizeof(P1Better) == 16);
        static_assert(offsetof(P1Better, a) == 8 && offsetof(P1Better, c) == 9);
        static_assert(alignof(P1) == 8 && alignof(P2) == 4 && alignof(P3) == 8);
        int main() {
            std::printf("%zu %zu %zu %zu\n", sizeof(P1), sizeof(P2), sizeof(P3), sizeof(P1Better));   // 24 8 16 16
            std::printf("%zu %zu %zu\n", alignof(P1), alignof(P2), alignof(P3));                       // 8 4 8
            return 0;
        }`,
      dry: { head: ['struct', 'layout', 'data bytes', 'sizeof'], rows: [['P1', 'a | 7 pad | b×8 | c | 7 tail', '10', '24'], ['P2', 's s | c | 1 pad | i×4', '7', '8'], ['P3', 'tag×3 | 1 pad | s s | 2 pad | d×8', '13', '16']] },
      complexity: `<p>O(members) by hand. P1 wastes 58% of its bytes; reordering it saves 8 bytes per object.</p>`,
      followUps: ['What is sizeof(P1) on 32-bit x86 Linux (long long aligned to 4 inside structs)?', 'How does <code>alignas(16)</code> on P2 change its size?']
    }
  });

  practice.push({
    title: 'Spot the UB: Uninitialised Total and Missing Return', level: 'Easy', tags: ['undefined behavior', 'spot the UB', 'warnings'], companies: ['Adobe', 'Cisco', 'VMware'],
    statement: `<p>Find <b>every</b> undefined behaviour in this function and fix it:</p><pre>int sumPositive(const std::vector&lt;int&gt;&amp; v) {
    int total;
    for (int x : v)
        if (x &gt; 0) total += x;
    if (total &gt; 0) return total;
}</pre>`,
    constraints: `v may be empty, contain only negatives, or contain values summing beyond INT_MAX.`,
    example: `<p>v = [3, -1, 4] should return 7 — but <code>total</code> starts as ${H.c('r', 'garbage')}. v = [-5] reaches the closing brace with ${H.c('r', 'no return')}. v = [2·10<sup>9</sup>, 2·10<sup>9</sup>] ${H.c('r', 'overflows int')}.</p>`,
    brute: { why: `<p>Three separate UBs: (1) <code>total</code> is read before being initialised; (2) flowing off the end of a non-void function (when total ≤ 0) is UB in C++ (the caller reads garbage, and with GCC at -O2 execution may fall into whatever code follows); (3) the sum can overflow <code>int</code>. All three compile — only <code>-Wall</code> (<code>-Wuninitialized</code>, <code>-Wreturn-type</code>) hints at them.</p>`, code: R`
      int sumPositiveBuggy(const std::vector<int>& v) {
          int total;                       // UB 1: indeterminate
          for (int x : v)
              if (x > 0) total += x;       // UB 3: may overflow
          if (total > 0) return total;
      }                                    // UB 2: no return on this path` },
    mcq: { q: 'Which compiler flag set would have warned about two of these bugs?', options: ['-Wall (includes -Wreturn-type and -Wuninitialized/-Wmaybe-uninitialized)', '-O0', '-std=c++20', '-fno-exceptions'], answer: 0, explain: '-Wall enables both warnings (uninitialised detection is better with optimisation on). Many teams add -Werror=return-type so the missing return is a hard error.' },
    hints: [`<p>Hint 1: Look for: values read before written, paths that end without <code>return</code>, arithmetic that can exceed the type.</p>`, `<p>Hint 2: Initialise at declaration; make every path return; widen the accumulator to <code>long long</code>.</p>`, `<p>Hint 3: Decide what "sum" means when it does not fit in the return type — return <code>long long</code>, or clamp. Test: empty, all negative, huge values.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"7 0 4000000000\n0 15\n2000000000000000\n2147483647 0"}]},
    solution: {
      approach: `<p>Initialise the accumulator, use a wide type so 10<sup>5</sup> values up to 2·10<sup>9</sup> cannot overflow, and return on every path (here a single return at the end makes that obvious).</p>`,
      code: R`
        #include <climits>
        #include <cstdio>
        #include <vector>
        long long sumPositive(const std::vector<int>& v) {
            long long total = 0;                 // initialised, wide enough
            for (int x : v)
                if (x > 0) total += x;
            return total;                        // single exit: every path returns
        }
        int main() {
            std::printf("%lld %lld %lld\n", sumPositive({3, -1, 4}), sumPositive({-5}),
                        sumPositive({2000000000, 2000000000}));   // 7 0 4000000000
            std::printf("%lld %lld\n", sumPositive({}), sumPositive({1, 2, 3, 4, 5}));   // 0 15
            std::printf("%lld\n", sumPositive(std::vector<int>(1000000, 2000000000)));   // 2000000000000000
            std::printf("%lld %lld\n", sumPositive({INT_MIN, INT_MAX, 0}), sumPositive({0, 0}));   // 2147483647 0
        }`,
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['What would C++26 "erroneous behaviour" change about bug 1?', 'Why is falling off the end of <code>main</code> fine but not of other functions?']
    }
  });

  practice.push({
    title: 'Spot the UB: Returning a Reference to a Local', level: 'Easy', tags: ['undefined behavior', 'dangling reference', 'lifetime'], companies: ['Amazon', 'Salesforce', 'Bloomberg'],
    statement: `<p>This helper "works" in a quick test but prints garbage in production:</p><pre>const std::string&amp; greet(const std::string&amp; name) {
    std::string msg = "Hello, " + name;
    return msg;
}</pre><p>Explain the UB in terms of object lifetime and fix it with zero performance loss.</p>`,
    constraints: `Names up to 10<sup>4</sup> chars. Must not leak or use static storage (must be thread-safe).`,
    example: `<p><code>std::cout &lt;&lt; greet("Ana");</code> may print ${H.c('g', 'Hello, Ana')} (old bytes not yet overwritten), ${H.c('r', 'garbage')}, or crash — <code>msg</code> was destroyed at <code>}</code> and its heap buffer freed (or its SSO buffer on the dead stack frame reused).</p>`,
    brute: { why: `<p>Returning a reference to a local creates a dangling reference: the local's lifetime ends when the function returns. GCC warns (<code>-Wreturn-local-addr</code>) and ASan with <code>detect_stack_use_after_return=1</code> reports it, but it compiles. The "fix" of making <code>msg</code> <code>static</code> introduces shared state and data races.</p>`, code: R`
      const std::string& greetBuggy(const std::string& name) {
          std::string msg = "Hello, " + name;
          return msg;                                  // dangling: msg dies here
      }` },
    mcq: { q: 'What is the cost of returning <code>std::string</code> by value here?', options: ['Essentially none: NRVO constructs it directly in the caller (or it is moved)', 'A full copy of the characters every time', 'A heap allocation per caller per byte', 'It is UB too'], answer: 0, explain: 'Named return value optimisation is applied by all major compilers; if not, the string is moved (3 pointer copies). No characters are copied.' },
    hints: [`<p>Hint 1: Who owns the string after the function returns? A reference never owns anything.</p>`, `<p>Hint 2: Return by value. C++ guarantees elision for prvalues and compilers apply NRVO to named locals; otherwise a move happens.</p>`, `<p>Hint 3: Watch the same bug in disguise: returning <code>std::string_view</code> or <code>const char*</code> (<code>msg.c_str()</code>) into a local string.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"Hello, Ana\n[Hello, ]\n10007\n1"}]},
    solution: {
      approach: `<p>Return the string by value. Ownership transfers to the caller, NRVO makes it free, and there is no shared state.</p>`,
      code: R`
        #include <thread>
        #include <vector>
        #include <iostream>
        #include <string>
        std::string greet(const std::string& name) {
            std::string msg = "Hello, " + name;
            return msg;                       // NRVO or move: no character copy
        }
        int main() {
            std::cout << greet("Ana") << "\n";
            std::cout << '[' << greet("") << "]\n";                       // [Hello, ]
            std::cout << greet(std::string(10000, 'x')).size() << "\n";   // 10007
            std::vector<std::string> res(8);
            {
                std::vector<std::thread> ts;
                for (int t = 0; t < 8; ++t) ts.emplace_back([&res, t] { res[t] = greet("n" + std::to_string(t)); });
                for (auto& th : ts) th.join();
            }
            bool ok = true;
            for (int t = 0; t < 8; ++t) ok = ok && res[t] == "Hello, n" + std::to_string(t);
            std::cout << ok << "\n";                                      // 1
        }`,
      complexity: `<p>O(length) to build the string, O(1) to return it.</p>`,
      followUps: ['Is <code>const std::string&amp; r = greet("x");</code> safe with the fixed version? (lifetime extension)', 'Why is <code>auto&amp; s = std::max(std::string("a"), std::string("b"));</code> dangling?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Struct Layout Calculator: Declared vs Optimal Size', level: 'Medium', tags: ['padding', 'simulation', 'greedy'], companies: ['Bloomberg', 'Jane Street', 'Arm'],
    statement: `<p>You are given a struct's members as <code>(size, align)</code> pairs in declaration order (alignment is a power of two and every size is a multiple of its alignment, as for all scalar types and arrays of them). Return two numbers: <code>sizeof</code> in the declared order, and the <b>minimum</b> possible <code>sizeof</code> over all member orders.</p>`,
    constraints: `1 ≤ members ≤ 10<sup>5</sup>; align ∈ {1, 2, 4, 8, 16}; size = k·align, 1 ≤ size ≤ 1024.`,
    example: `<p>[(1,1), (8,8), (1,1), (4,4), (2,2)] (char, double, char, int, short) → declared ${H.c('r', '32')}, optimal ${H.c('g', '16')}. Declared: 0 → pad to 8 → 16 → 17 → pad to 20 → 24 → 26 → tail to 32.</p>`,
    brute: { why: `<p>Trying all n! orders is hopeless beyond ~10 members. The insight: sorting by descending alignment never needs internal padding (each member ends on a multiple of its alignment, which is a multiple of every smaller alignment), so only the unavoidable tail padding remains: optimal = roundUp(sum of sizes, max align).</p>`, code: R`
      // Brute force over permutations (only feasible for tiny inputs).
      int layoutSize(const std::vector<std::pair<int,int>>& m) {
          int off = 0, maxA = 1;
          for (auto [sz, al] : m) { off = (off + al - 1) / al * al + sz; maxA = std::max(maxA, al); }
          return (off + maxA - 1) / maxA * maxA;
      }
      int bestByPermutation(std::vector<std::pair<int,int>> m) {
          std::sort(m.begin(), m.end());
          int best = INT_MAX;
          do best = std::min(best, layoutSize(m)); while (std::next_permutation(m.begin(), m.end()));
          return best;
      }` },
    mcq: { q: 'Under the given constraints, the minimum size equals…', options: ['sum of sizes rounded up to the maximum alignment', 'sum of sizes', 'number of members × max alignment', 'declared size minus the largest padding gap'], answer: 0, explain: 'Descending-alignment order has zero internal padding, and sizeof must be a multiple of the max alignment, so roundUp(sum, maxAlign) is both achievable and a lower bound.' },
    hints: [`<p>Hint 1: Simulate the declared order: <code>off = roundUp(off, align); off += size;</code> then round the end up to the max alignment.</p>`, `<p>Hint 2: For the optimum, think about what padding is <i>unavoidable</i>. Is there an order with no internal padding at all?</p>`, `<p>Hint 3: roundUp(x, a) = (x + a − 1) / a · a (a is a power of two, so also <code>(x + a - 1) &amp; ~(a - 1)</code>). Use <code>long long</code> for sums of 10<sup>5</sup> × 1024.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"32 16"},{"stdin":"1\n1 1\n","stdout":"1 1"},{"stdin":"2\n1 1\n8 8\n","stdout":"16 16"},{"stdin":"2\n4 4\n1 1\n","stdout":"8 8"},{"stdin":"3\n16 16\n1 1\n16 16\n","stdout":"48 48"},{"stdin":"2\n1024 1\n8 8\n","stdout":"1032 1032"},{"stdin":"4\n2 2\n1 1\n2 2\n1 1\n","stdout":"8 6"},{"stdin":"3\n3 1\n4 4\n3 1\n","stdout":"12 12"},{"stdin":"5\n1 1\n8 8\n1 1\n4 4\n2 2\n","stdout":"32 16"},{"stdin":{"$concat":["100000\n",{"$rep":"1 1\n8 8\n","n":50000}]},"stdout":"800000 450000"}]},
    solution: {
      approach: `<p>Declared size: one pass simulation. Optimal size: the lower bound roundUp(Σsize, maxAlign) is achieved by sorting by descending alignment, so no sort is even needed — just sum and round.</p>`,
      code: R`
        #include <algorithm>
        #include <cstdio>
        #include <utility>
        #include <vector>
        long long roundUp(long long x, long long a) { return (x + a - 1) / a * a; }
        std::pair<long long, long long> structSizes(const std::vector<std::pair<int,int>>& m) {
            long long off = 0, sum = 0, maxA = 1;
            for (auto [sz, al] : m) {
                off = roundUp(off, al) + sz;          // pad before, then place
                sum += sz;
                maxA = std::max<long long>(maxA, al);
            }
            return {roundUp(off, maxA), roundUp(sum, maxA)};   // {declared, optimal}
        }
        int main() {
            int n = 0;
            std::vector<std::pair<int,int>> m;
            if (std::scanf("%d", &n) == 1) {                    // members as "size align" lines (demo data when no input)
                m.resize(n);
                for (auto& [sz, al] : m) std::scanf("%d %d", &sz, &al);
            } else {
                m = {{1,1},{8,8},{1,1},{4,4},{2,2}};
            }
            auto [declared, optimal] = structSizes(m);
            std::printf("%lld %lld\n", declared, optimal);   // 32 16 for the demo data
        }`,
      dry: { head: ['member (size,align)', 'off before', 'padded to', 'off after'], rows: [['(1,1)', '0', '0', '1'], ['(8,8)', '1', '8', '16'], ['(1,1)', '16', '16', '17'], ['(4,4)', '17', '20', '24'], ['(2,2)', '24', '24', '26 → tail → <b>32</b>']] },
      complexity: `<p>O(n) time, O(1) extra space.</p>`,
      followUps: ['What if a member\'s size is not a multiple of its alignment (e.g. a 12-byte struct with alignment 8 is impossible — why?)', 'How would you minimise padding when members cannot move across access-specifier groups (pre-C++23 rule)?']
    }
  });

  practice.push({
    title: 'Per-Thread Counters Without False Sharing', level: 'Medium', tags: ['false sharing', 'cache line', 'alignas', 'concurrency'], companies: ['Optiver', 'Meta', 'Hudson River Trading'],
    statement: `<p>A server keeps <code>std::atomic&lt;long&gt; hits[8]</code>, one slot per worker thread; each thread only increments its own slot. Throughput gets <b>worse</b> as threads are added. Explain why and fix the data layout so each thread's counter scales linearly, then provide a <code>total()</code> function.</p>`,
    constraints: `Up to 64 threads. 64-byte cache lines (128 on some ARM cores). Readers call total() rarely.`,
    example: `<p>8 atomics × 8 bytes = 64 bytes = ${H.c('r', 'one cache line shared by all 8 threads')}. Every increment invalidates that line in the other 7 cores. With <code>alignas(64)</code> each slot occupies its own line: ${H.c('g', '8 lines, no sharing')}; typical speed-up 5–20× at 8 threads.</p>`,
    brute: { why: `<p>The threads never touch the same <i>variable</i>, but they touch the same <i>cache line</i>. MESI coherence works per line, so each write forces the line to bounce between cores (~50–100 ns per transfer instead of ~1 ns for an L1 hit). This is <b>false sharing</b>.</p>`, code: R`
      std::atomic<long> hitsPacked[8];                         // all 8 share one 64-byte line
      void onRequestPacked(int tid) { hitsPacked[tid].fetch_add(1, std::memory_order_relaxed); }` },
    mcq: { q: 'Which change removes false sharing here?', options: ['Pad/align each counter to its own cache line', 'Use memory_order_seq_cst', 'Mark the array volatile', 'Use int instead of long'], answer: 0, explain: 'The problem is spatial (same line), not ordering. Separate lines with alignas(64) or std::hardware_destructive_interference_size.' },
    hints: [`<p>Hint 1: Draw the 64-byte line and mark which thread writes which 8 bytes.</p>`, `<p>Hint 2: Wrap the atomic in a struct with <code>alignas(64)</code>; an array of those has stride 64.</p>`, `<p>Hint 3: <code>total()</code> just loads each slot with relaxed ordering and sums (an approximate snapshot is fine). Even better for pure counting: a thread-local plain <code>long</code> flushed periodically.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"4000000\n64 64\n640000 10000 0 1\n64"}]},
    solution: {
      approach: `<p>Give every slot its own cache line. The struct's alignment of 64 forces sizeof to 64, so array elements never share a line. Increments become uncontended L1 operations; the rare reader pays 8 cache misses.</p>`,
      code: R`
        #include <atomic>
        #include <cstdio>
        #include <thread>
        #include <vector>
        struct alignas(64) PaddedCounter {
            std::atomic<long> value{0};
        };
        static_assert(sizeof(PaddedCounter) == 64);
        PaddedCounter hits[64];
        void onRequest(int tid) { hits[tid].value.fetch_add(1, std::memory_order_relaxed); }
        long total(int threads) {
            long sum = 0;
            for (int t = 0; t < threads; ++t) sum += hits[t].value.load(std::memory_order_relaxed);
            return sum;
        }
        int main() {
            std::vector<std::thread> pool;
            for (int t = 0; t < 4; ++t)
                pool.emplace_back([t] { for (int i = 0; i < 1'000'000; ++i) onRequest(t); });
            for (auto& th : pool) th.join();
            std::printf("%ld\n", total(4));        // 4000000
            std::printf("%zu %zu\n", sizeof(PaddedCounter), alignof(PaddedCounter));   // 64 64
            for (int t = 0; t < 64; ++t) hits[t].value.store(0);
            pool.clear();
            for (int t = 0; t < 64; ++t)
                pool.emplace_back([t] { for (int i = 0; i < 10000; ++i) onRequest(t); });
            for (auto& th : pool) th.join();
            bool each = true;
            for (int t = 0; t < 64; ++t) each = each && hits[t].value.load() == 10000;
            std::printf("%ld %ld %ld %d\n", total(64), total(1), total(0), each);      // 640000 10000 0 1
            std::printf("%d\n", static_cast<int>(reinterpret_cast<char*>(&hits[1]) - reinterpret_cast<char*>(&hits[0])));   // 64
        }`,
      complexity: `<p>Increment O(1) uncontended; total O(threads). Memory 64 B per slot instead of 8 B — a fine trade for hot counters.</p>`,
      followUps: ['How would you detect false sharing in an existing binary? (<code>perf c2c</code>)', 'Why might 128-byte alignment be better on some Intel CPUs (adjacent-line prefetcher)?']
    }
  });

  practice.push({
    title: 'Branchless Clamp and Absolute Value (No UB)', level: 'Medium', tags: ['branchless', 'branch prediction', 'undefined behavior'], companies: ['Apple', 'Nvidia', 'Epic Games'],
    statement: `<p>Implement <code>int clampI(int x, int lo, int hi)</code> (lo ≤ hi) and <code>unsigned absU(int x)</code> (|x| as unsigned, correct for INT_MIN) with <b>no conditional branches</b> in the generated code and <b>no undefined behaviour</b> for any input. Explain why <code>(x ^ (x &gt;&gt; 31)) - (x &gt;&gt; 31)</code> is not acceptable for abs.</p>`,
    constraints: `All 32-bit ints. O(1). Should compile to cmov/min/max or pure arithmetic at -O2.`,
    example: `<p>clampI(15, 0, 10) = ${H.c('g', '10')}, clampI(-3, 0, 10) = ${H.c('g', '0')}. absU(-7) = ${H.c('g', '7')}, absU(INT_MIN) = ${H.c('g', '2147483648u')}. The signed mask trick computes INT_MAX − (−1) for INT_MIN → ${H.c('r', 'signed overflow (UB)')}.</p>`,
    brute: { why: `<p>The <code>if</code>-based versions are correct but produce data-dependent branches; with random inputs half of them mispredict. The classic signed bit trick avoids branches but overflows on INT_MIN, which is UB — the compiler may then assume x != INT_MIN elsewhere.</p>`, code: R`
      int clampBranchy(int x, int lo, int hi) {
          if (x < lo) return lo;
          if (x > hi) return hi;
          return x;
      }
      int absSignedTrick(int x) {
          int m = x >> 31;                 // -1 if negative, 0 otherwise (arithmetic shift)
          return (x ^ m) - m;              // UB for INT_MIN: INT_MAX - (-1) overflows
      }` },
    mcq: { q: 'Why does doing the abs trick in <code>unsigned</code> fix the UB?', options: ['Unsigned arithmetic wraps modulo 2^32 by definition', 'Unsigned values cannot be negative so the trick is not needed', 'The compiler ignores overflow in unsigned', 'It does not fix it'], answer: 0, explain: 'Unsigned overflow is defined wrap-around, so (u ^ m) - m with m = 0xFFFFFFFF yields 2^31 for INT_MIN exactly.' },
    hints: [`<p>Hint 1: <code>std::min</code>/<code>std::max</code> on ints compile to <code>cmov</code> (x86) or <code>csel</code>/<code>smin</code> (ARM) — no jumps.</p>`, `<p>Hint 2: For abs, convert to unsigned first, build the mask from the sign (<code>0u - (x &lt; 0)</code>), then apply <code>(u ^ m) - m</code> in unsigned.</p>`, `<p>Hint 3: Verify on Compiler Explorer that there is no <code>jl</code>/<code>jg</code> in the output, and test INT_MIN, INT_MAX, 0, −1, lo == hi.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"10 0 7 2147483648\n5 0 10 -2147483648 2147483647 -5 5 3\n0 1 1 2147483647 2147483647 123456"}]},
    solution: {
      approach: `<p>Clamp = min(max(x, lo), hi) — both are conditional-select instructions. Abs = conditional negate done in unsigned arithmetic, where wrap-around is defined, so INT_MIN maps to 2<sup>31</sup> correctly.</p>`,
      code: R`
        #include <algorithm>
        #include <climits>
        #include <cstdio>
        int clampI(int x, int lo, int hi) {
            return std::min(std::max(x, lo), hi);      // cmov / csel, no branch
        }
        unsigned absU(int x) {
            unsigned u = static_cast<unsigned>(x);      // well-defined conversion (mod 2^32)
            unsigned m = 0u - static_cast<unsigned>(x < 0);   // 0xFFFFFFFF if negative, else 0
            return (u ^ m) - m;                         // unsigned wrap is defined
        }
        int main() {
            std::printf("%d %d %u %u\n", clampI(15, 0, 10), clampI(-3, 0, 10), absU(-7), absU(INT_MIN));
            // 10 0 7 2147483648
            std::printf("%d %d %d %d %d %d %d %d\n", clampI(5, 0, 10), clampI(0, 0, 10), clampI(10, 0, 10), clampI(INT_MIN, INT_MIN, INT_MAX),
                        clampI(INT_MAX, INT_MIN, INT_MAX), clampI(INT_MIN, -5, 5), clampI(INT_MAX, -5, 5), clampI(3, 3, 3));
            // 5 0 10 -2147483648 2147483647 -5 5 3
            std::printf("%u %u %u %u %u %u\n", absU(0), absU(1), absU(-1), absU(INT_MAX), absU(INT_MIN + 1), absU(-123456));
            // 0 1 1 2147483647 2147483647 123456
        }`,
      dry: { head: ['x', 'u', 'm', '(u ^ m) - m'], rows: [['-7', '0xFFFFFFF9', '0xFFFFFFFF', '0x00000006 + 1 = 7'], ['5', '5', '0', '5'], ['INT_MIN', '0x80000000', '0xFFFFFFFF', '0x7FFFFFFF + 1 = 2147483648']] },
      complexity: `<p>O(1), 2–4 instructions, zero branches.</p>`,
      followUps: ['Is <code>std::clamp</code> branchless? What precondition does it have (UB if lo &gt; hi)?', 'When would the branchy clamp be faster?']
    }
  });

  practice.push({
    title: 'AoS to SoA: Speed Up a Particle Update', level: 'Medium', tags: ['data-oriented design', 'cache', 'SIMD'], companies: ['Unity', 'EA', 'Nvidia'],
    statement: `<p>A simulation stores 10<sup>7</sup> particles as <code>std::vector&lt;Particle&gt;</code> where <code>struct Particle { float x, y, z, vx, vy, vz; int id; float mass; };</code> (32 bytes). The hot loop only does <code>x += vx * dt</code> (and the same for y, z). Redesign the storage so the hot loop reads only what it needs, and write the update.</p>`,
    constraints: `10<sup>7</sup> particles, update called every frame (16 ms budget). Other code rarely reads id and mass.`,
    example: `<p>AoS: each particle's 32 bytes come through the cache; the update uses 24 of them, but ${H.c('r', 'id and mass (25%) are wasted bandwidth')} and x/vx are 12 bytes apart, awkward for SIMD. SoA: six dense float arrays — the x-update reads ${H.c('g', 'x[i..i+7] and vx[i..i+7]')} as two 32-byte vector loads.</p>`,
    brute: { why: `<p>With Array-of-Structs every cache line holds 2 particles with all 8 fields interleaved. The update cannot use plain vector loads (fields are strided), and 25% of memory traffic carries fields it never touches. At 10<sup>7</sup> particles (320 MB) the loop is memory-bandwidth bound, so wasted bytes are wasted time.</p>`, code: R`
      struct Particle { float x, y, z, vx, vy, vz; int id; float mass; };
      void updateAoS(std::vector<Particle>& ps, float dt) {
          for (auto& p : ps) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
      }` },
    mcq: { q: 'What is the main reason SoA is faster for this loop?', options: ['It streams only the fields used, densely, enabling full-width SIMD loads', 'It uses fewer instructions per particle in theory', 'Struct member access is slow in C++', 'std::vector of structs is not contiguous'], answer: 0, explain: 'A vector of structs is contiguous, but each line mixes used and unused fields. SoA makes each needed field a dense stream — less traffic and natural SIMD.' },
    hints: [`<p>Hint 1: Group data by how it is <b>accessed</b>, not by what object it "belongs" to.</p>`, `<p>Hint 2: <code>struct Particles { std::vector&lt;float&gt; x, y, z, vx, vy, vz; std::vector&lt;int&gt; id; std::vector&lt;float&gt; mass; };</code> — keep all vectors the same length.</p>`, `<p>Hint 3: Write three simple loops (or one loop over i updating x, y, z) — both vectorise. Provide an accessor that returns a lightweight proxy if other code wants "particle i" semantics.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"0.5 3.5\n2.5 1.5\n1.0 4.0\n1.0 3\n9.0 9 1.0\n1000000 0"}]},
    solution: {
      approach: `<p>Struct-of-Arrays: one dense vector per field. The update streams exactly the six arrays it needs; each inner loop is a textbook vectorisable loop (8 floats per AVX2 instruction). Cold fields live in their own arrays and never pollute the cache during the update.</p>`,
      code: R`
        #include <cstddef>
        #include <cstdio>
        #include <vector>
        struct Particles {
            std::vector<float> x, y, z, vx, vy, vz, mass;
            std::vector<int> id;
            void add(float px, float pv, int pid) {
                x.push_back(px); y.push_back(px); z.push_back(px);
                vx.push_back(pv); vy.push_back(pv); vz.push_back(pv);
                mass.push_back(1.0f); id.push_back(pid);
            }
            void update(float dt) {
                const std::size_t n = x.size();
                for (std::size_t i = 0; i < n; ++i) x[i] += vx[i] * dt;   // dense, SIMD-friendly
                for (std::size_t i = 0; i < n; ++i) y[i] += vy[i] * dt;
                for (std::size_t i = 0; i < n; ++i) z[i] += vz[i] * dt;
            }
        };
        int main() {
            Particles ps;
            for (int i = 0; i < 4; ++i) ps.add(static_cast<float>(i), 1.0f, i);
            ps.update(0.5f);
            std::printf("%.1f %.1f\n", ps.x[0], ps.x[3]);   // 0.5 3.5
            std::printf("%.1f %.1f\n", ps.y[2], ps.z[1]);   // 2.5 1.5
            ps.update(0.5f);
            std::printf("%.1f %.1f\n", ps.x[0], ps.x[3]);   // 1.0 4.0
            ps.update(0.0f);                                 // dt = 0 changes nothing
            std::printf("%.1f %d\n", ps.x[0], ps.id[3]);     // 1.0 3
            Particles q;
            q.add(10.0f, -2.0f, 9);
            q.update(0.5f);
            std::printf("%.1f %d %.1f\n", q.x[0], q.id[0], q.mass[0]);   // 9.0 9 1.0
            Particles big;
            for (int i = 0; i < 1000000; ++i) big.add(static_cast<float>(i % 1000), 2.0f, i);
            big.update(0.25f);
            int bad = 0;
            for (int i = 0; i < 1000000; ++i)
                if (big.x[i] != static_cast<float>(i % 1000) + 0.5f || big.y[i] != big.x[i] || big.z[i] != big.x[i] || big.id[i] != i) ++bad;
            std::printf("%zu %d\n", big.x.size(), bad);     // 1000000 0
        }`,
      complexity: `<p>O(n) per frame either way; memory traffic drops from 32 to 24 bytes per particle and SIMD width is fully used — typically 1.5–3× faster when memory-bound, more when the AoS loop failed to vectorise.</p>`,
      followUps: ['What is AoSoA (array of small SoA blocks) and why do some engines prefer it?', 'When is AoS the better choice? (random access to whole objects)']
    }
  });

  practice.push({
    title: 'Spot the UB: Fast Inverse Square Root', level: 'Medium', tags: ['strict aliasing', 'type punning', 'std::bit_cast'], companies: ['id Software', 'Google', 'Microsoft'],
    statement: `<p>The famous Quake III function reinterprets a <code>float</code> as an integer with <code>i = *(long*)&amp;y;</code> and back with <code>y = *(float*)&amp;i;</code>. Identify the two kinds of UB (or non-portability) in that code on a modern 64-bit Linux compiler, and rewrite it in correct C++20 with identical results.</p>`,
    constraints: `Input: positive normal float. Result within ~0.2% of 1/√x after one Newton step. No UB, no compiler-specific extensions.`,
    example: `<p>x = 4.0f → ≈ ${H.c('g', '0.4992')} (exact 0.5). Bit pattern of 4.0f is 0x40800000; magic − (bits &gt;&gt; 1) = 0x5f3759df − 0x20400000 = ${H.c('b', '0x3EF759DF')} ≈ 0.4831 as a float, then one Newton step refines it.</p>`,
    brute: { why: `<p>(1) <b>Strict aliasing</b>: reading a <code>float</code> object through a <code>long*</code> (and vice versa) is UB; optimisers may reorder or drop the accesses. (2) <b>Size mismatch</b>: <code>long</code> is 8 bytes on 64-bit Linux but <code>float</code> is 4, so <code>*(long*)&amp;y</code> also reads 4 bytes past the object. The original was written for 32-bit compilers in 1999.</p>`, code: R`
      float Q_rsqrt(float number) {                 // original shape (UB on modern compilers)
          long i; float x2, y;
          const float threehalfs = 1.5F;
          x2 = number * 0.5F; y = number;
          i = *(long*)&y;                           // aliasing UB + reads 8 bytes from a 4-byte float
          i = 0x5f3759df - (i >> 1);
          y = *(float*)&i;                          // aliasing UB
          y = y * (threehalfs - (x2 * y * y));
          return y;
      }` },
    mcq: { q: 'What is the C++20 way to reinterpret the bits of a float as a 32-bit integer?', options: ['std::bit_cast&lt;std::uint32_t&gt;(f)', 'reinterpret_cast&lt;std::uint32_t&amp;&gt;(f)', 'A union with float and uint32_t members', '*(int*)&amp;f with -O0'], answer: 0, explain: 'bit_cast copies the object representation into a new object of the target type — defined, constexpr, and compiled to a single register move. The union trick is UB in C++ (fine in C).' },
    hints: [`<p>Hint 1: List the types involved and their sizes on LP64: float 4, long 8.</p>`, `<p>Hint 2: Use fixed-width <code>std::uint32_t</code> and <code>std::bit_cast</code> (or <code>std::memcpy</code> pre-C++20) in both directions.</p>`, `<p>Hint 3: Keep the magic constant and Newton step. Bonus: note that modern CPUs have <code>rsqrtss</code> and compilers emit fast reciprocal sqrt with appropriate flags — this trick is historical.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"0.4992\n0.998307\n1.996614\n0.249577\n0.099845\n31.585064\n0.008993\n1"}]},
    solution: {
      approach: `<p>Replace both pointer casts with <code>std::bit_cast</code> on <code>std::uint32_t</code>. Same bits, same arithmetic, no aliasing violation, no over-read, and it even works in <code>constexpr</code>.</p>`,
      code: R`
        #include <cmath>
        #include <bit>
        #include <cstdint>
        #include <cstdio>
        constexpr float rsqrt(float number) {
            const float x2 = number * 0.5f;
            std::uint32_t i = std::bit_cast<std::uint32_t>(number);   // defined bit reinterpretation
            i = 0x5f3759dfu - (i >> 1);
            float y = std::bit_cast<float>(i);
            y = y * (1.5f - x2 * y * y);                               // one Newton-Raphson step
            return y;
        }
        static_assert(rsqrt(4.0f) > 0.49f && rsqrt(4.0f) < 0.51f);   // even evaluates at compile time
        int main() {
            std::printf("%.4f\n", rsqrt(4.0f));              // 0.4992
            for (float x : {1.0f, 0.25f, 16.0f, 100.0f, 0.001f, 12345.678f}) std::printf("%.6f\n", rsqrt(x));
            double worst = 0;                                // relative error over 6 decades
            for (float x = 0.001f; x < 1000000.0f; x *= 1.01f)
                worst = std::max(worst, std::fabs(rsqrt(x) * std::sqrt(static_cast<double>(x)) - 1.0));
            std::printf("%d\n", worst < 0.002);               // 1
        }               // 0.4992`,
      complexity: `<p>O(1): a few integer and float ops. The bit_casts compile to <code>movd</code> or nothing.</p>`,
      followUps: ['Why is <code>memcpy</code>-based punning free at -O2?', 'Which types may legally alias anything? (char, unsigned char, std::byte)']
    }
  });

  practice.push({
    title: 'Spot the UB: The Loop That Never Ends at -O2', level: 'Medium', tags: ['signed overflow', 'undefined behavior', 'loops'], companies: ['Google', 'Nvidia', 'Synopsys'],
    statement: `<p>This function counts powers of two not exceeding <code>n</code>. It works for small n but <b>hangs</b> for <code>n = INT_MAX</code> when built with <code>-O2</code>:</p><pre>int countPowers(int n) {
    int count = 0;
    for (int p = 1; p &lt;= n; p *= 2) ++count;
    return count;
}</pre><p>Explain exactly why, and fix it for all n ≥ 1.</p>`,
    constraints: `1 ≤ n ≤ INT_MAX. Answer for INT_MAX is 31 (2<sup>0</sup> … 2<sup>30</sup>).`,
    example: `<p>n = 10 → p = 1, 2, 4, 8 → ${H.c('g', '4')}. n = INT_MAX: after p = 2<sup>30</sup>, <code>p *= 2</code> would be 2<sup>31</sup> — ${H.c('r', 'signed overflow')}. The compiler, assuming no overflow, concludes p stays positive and ≤ INT_MAX forever → ${H.c('r', 'infinite loop')}.</p>`,
    brute: { why: `<p>At -O0 the multiplication wraps to INT_MIN (negative, ≤ n) and then to 0, and 0 * 2 stays 0 ≤ n forever — still an infinite loop, just by a different route. At -O2 the compiler is entitled to assume <code>p *= 2</code> never overflows, so it may fold <code>p &lt;= INT_MAX</code> to true. Either way the code depends on UB.</p>`, code: R`
      int countPowersBuggy(int n) {
          int count = 0;
          for (int p = 1; p <= n; p *= 2) ++count;   // p *= 2 overflows when p = 2^30 and n >= 2^30
          return count;
      }` },
    mcq: { q: 'What is the cleanest fix?', options: ['Check p &lt;= n / 2 before doubling (or use a 64-bit p)', 'Compile with -O0', 'Declare p as volatile', 'Use p += p instead of p *= 2'], answer: 0, explain: 'Either guarantee the next doubling cannot overflow, or do the arithmetic in a type with room (long long p). volatile and -O0 do not remove the overflow; p += p overflows just the same.' },
    hints: [`<p>Hint 1: Find the exact iteration where the arithmetic leaves the range of <code>int</code>.</p>`, `<p>Hint 2: Option A: <code>long long p</code>. Option B: count first, then stop before doubling if <code>p &gt; n / 2</code>.</p>`, `<p>Hint 3: Or skip the loop: the answer is ⌊log₂ n⌋ + 1 = <code>std::bit_width(static_cast&lt;unsigned&gt;(n))</code> (C++20 &lt;bit&gt;).</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"4 31 31\n1 2 2 3 3 4 30 30 31\n0"}]},
    solution: {
      approach: `<p>Avoid ever computing an out-of-range value: test whether doubling is safe before doing it. Or compute the answer directly with <code>std::bit_width</code>, which counts the bits needed to represent n.</p>`,
      code: R`
        #include <bit>
        #include <climits>
        #include <cstdio>
        int countPowers(int n) {
            int count = 1;                    // p = 1 always counts (n >= 1)
            for (int p = 1; p <= n / 2; p *= 2) ++count;   // p * 2 <= n <= INT_MAX: never overflows
            return count;
        }
        int countPowersBits(int n) { return std::bit_width(static_cast<unsigned>(n)); }
        int main() {
            std::printf("%d %d %d\n", countPowers(10), countPowers(INT_MAX), countPowersBits(INT_MAX));
            // 4 31 31
            for (int n : {1, 2, 3, 4, 7, 8, 1000000000, 1073741823, 1073741824})
                std::printf("%d ", countPowers(n));          // 1 2 2 3 3 4 30 30 31
            std::printf("\n");
            int mismatches = 0;
            for (int n = 1; n <= 100000; ++n) mismatches += countPowers(n) != countPowersBits(n);
            for (int n = INT_MAX - 1000; n < INT_MAX; ++n) mismatches += countPowers(n) != countPowersBits(n);
            std::printf("%d\n", mismatches);                 // 0
        }`,
      dry: { head: ['p', 'p <= n/2 (n=10 → 5)?', 'count'], rows: [['1', 'yes → p=2', '2'], ['2', 'yes → p=4', '3'], ['4', 'yes → p=8', '4'], ['8', 'no, stop', '<b>4</b>']] },
      complexity: `<p>O(log n) loop or O(1) with bit_width (a single <code>lzcnt</code>).</p>`,
      followUps: ['Would <code>unsigned p</code> fix it for <code>int n</code>? What if n were itself <code>unsigned</code> and could be UINT_MAX?', 'Which UBSan check reports this, and what message does it print?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Cache-Friendly Matrix Multiplication', level: 'Hard', tags: ['cache', 'loop interchange', 'tiling', 'which loop is faster'], companies: ['Nvidia', 'Intel', 'Citadel'],
    statement: `<p>Multiply two N×N row-major <code>double</code> matrices: C = A·B. The textbook i-j-k loop is correct but slow for N = 2048. Produce a version that is several times faster on one core <b>without changing the O(N³) algorithm</b>: first by loop interchange, then by cache blocking (tiling). Explain each step in terms of cache lines.</p>`,
    constraints: `N ≤ 4096, flat <code>std::vector&lt;double&gt;</code> storage, single thread, results must match the naive version up to floating-point rounding.`,
    example: `<p>Naive i-j-k: the inner loop walks ${H.c('r', 'B[k][j] down a column')} (stride N·8 bytes) — one cache miss per multiply-add. i-k-j: the inner loop walks ${H.c('g', 'B[k][j] and C[i][j] along rows')} with A[i][k] fixed in a register. Typical N = 2048: ~60 s → ~6 s → ~2.5 s with 64×64 tiles (and further with SIMD/threads).</p>`,
    brute: { why: `<p>In i-j-k, the innermost loop over k reads <code>B[k*N + j]</code>: consecutive iterations are N·8 = 16 KB apart, so each touches a new cache line and only 8 of its 64 bytes are used. The whole of B (32 MB) streams through the cache N times. It is entirely memory-bound.</p>`, code: R`
      void matmulIJK(const std::vector<double>& A, const std::vector<double>& B, std::vector<double>& C, int N) {
          for (int i = 0; i < N; ++i)
              for (int j = 0; j < N; ++j) {
                  double sum = 0;
                  for (int k = 0; k < N; ++k)
                      sum += A[(size_t)i * N + k] * B[(size_t)k * N + j];   // B walked down a column
                  C[(size_t)i * N + j] = sum;
              }
      }` },
    mcq: { q: 'After switching to i-k-j order, which access is the innermost loop\'s stride-1 stream?', options: ['B[k][j] and C[i][j] along row j', 'A[i][k] down column k', 'B[k][j] down column j', 'None — all accesses are random'], answer: 0, explain: 'With i and k fixed, the inner j loop does C[i][j] += a * B[k][j]: both rows are contiguous, and a = A[i][k] lives in a register.' },
    hints: [`<p>Hint 1: For each loop order ask: in the innermost loop, which index changes? Is that the last index of every array accessed?</p>`, `<p>Hint 2: i-k-j makes the inner loop <code>C[i][*] += A[i][k] * B[k][*]</code> — a contiguous "axpy" that vectorises. But for large N, row k of B is evicted before it is reused by the next i.</p>`, `<p>Hint 3: Tile all three loops with block size Bs (e.g. 64): for each (ii, kk, jj) block, run i-k-j inside the block. Three 64×64 double tiles = 96 KB fit in L2, so every loaded line is reused ~64 times. Handle edges with <code>std::min(ii + Bs, N)</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"1 5 9\n19 22 43 50\n19 22 43 50\n1 1 1\n2 1 1\n5 1 1\n17 1 1\n64 1 1\n65 1 1\n130 1 1"}]},
    solution: {
      approach: `<p>Step 1 — loop interchange to i-k-j: all inner accesses become stride-1 and the compiler vectorises the inner loop. Step 2 — blocking: iterate over tiles so the working set (one tile each of A, B and C) stays in L1/L2 while it is reused. Arithmetic is unchanged; only the order of the same multiply-adds changes (so rounding may differ in the last bits).</p>`,
      code: R`
        #include <algorithm>
        #include <cstdio>
        #include <vector>
        void matmulIKJ(const std::vector<double>& A, const std::vector<double>& B, std::vector<double>& C, int N) {
            std::fill(C.begin(), C.end(), 0.0);
            for (int i = 0; i < N; ++i)
                for (int k = 0; k < N; ++k) {
                    const double a = A[(size_t)i * N + k];           // stays in a register
                    const double* brow = &B[(size_t)k * N];
                    double* crow = &C[(size_t)i * N];
                    for (int j = 0; j < N; ++j) crow[j] += a * brow[j];   // contiguous, vectorised
                }
        }
        void matmulTiled(const std::vector<double>& A, const std::vector<double>& B, std::vector<double>& C, int N, int Bs = 64) {
            std::fill(C.begin(), C.end(), 0.0);
            for (int ii = 0; ii < N; ii += Bs)
                for (int kk = 0; kk < N; kk += Bs)
                    for (int jj = 0; jj < N; jj += Bs) {
                        const int iEnd = std::min(ii + Bs, N), kEnd = std::min(kk + Bs, N), jEnd = std::min(jj + Bs, N);
                        for (int i = ii; i < iEnd; ++i)
                            for (int k = kk; k < kEnd; ++k) {
                                const double a = A[(size_t)i * N + k];
                                const double* brow = &B[(size_t)k * N];
                                double* crow = &C[(size_t)i * N];
                                for (int j = jj; j < jEnd; ++j) crow[j] += a * brow[j];
                            }
                    }
        }
        void naive(const std::vector<double>& A, const std::vector<double>& B, std::vector<double>& C, int N) {
            for (int i = 0; i < N; ++i)
                for (int j = 0; j < N; ++j) {
                    double s = 0;
                    for (int k = 0; k < N; ++k) s += A[(size_t)i * N + k] * B[(size_t)k * N + j];
                    C[(size_t)i * N + j] = s;
                }
        }

        int main() {
            const int N = 3;
            std::vector<double> A = {1,2,3, 4,5,6, 7,8,9}, B = {1,0,0, 0,1,0, 0,0,1}, C(N * N);
            matmulTiled(A, B, C, N, 2);                           // tiny tiles to exercise the edges
            std::printf("%.0f %.0f %.0f\n", C[0], C[4], C[8]);    // 1 5 9
            std::vector<double> P = {1,2,3,4}, Q = {5,6,7,8}, S(4);
            matmulIKJ(P, Q, S, 2);
            std::printf("%.0f %.0f %.0f %.0f\n", S[0], S[1], S[2], S[3]);   // 19 22 43 50
            matmulTiled(P, Q, S, 2, 64);                          // tile bigger than the matrix
            std::printf("%.0f %.0f %.0f %.0f\n", S[0], S[1], S[2], S[3]);   // 19 22 43 50
            for (int n : {1, 2, 5, 17, 64, 65, 130}) {            // small integers: every product is exact
                std::vector<double> X((size_t)n * n), Y((size_t)n * n), r0((size_t)n * n), r1((size_t)n * n), r2((size_t)n * n);
                unsigned s = 12345u + n;
                for (auto& x : X) { s = s * 1103515245u + 12345u; x = (s >> 16) % 7 - 3; }
                for (auto& y : Y) { s = s * 1103515245u + 12345u; y = (s >> 16) % 7 - 3; }
                naive(X, Y, r0, n);
                matmulIKJ(X, Y, r1, n);
                matmulTiled(X, Y, r2, n, 8);
                std::printf("%d %d %d\n", n, r0 == r1, r0 == r2);   // n 1 1
            }
        }`,
      dry: { head: ['order', 'inner-loop accesses', 'misses per inner iteration (approx)', 'N=2048 time (typical)'], rows: [['i-j-k', 'A row (stride 1), B column (stride N)', '~1.1', '~60 s'], ['i-k-j', 'B row, C row (both stride 1)', '~0.25 (2 streams / 8 doubles per line)', '~6 s'], ['tiled i-k-j, Bs = 64', 'same, but tiles reused from L2', '~0.02', '~2.5 s']] },
      complexity: `<p>Still O(N³) flops and O(N²) memory. Memory traffic drops from O(N³) cache lines to about O(N³ / (Bs · 8)). Production BLAS (OpenBLAS, MKL, BLIS) adds register blocking, packing and SIMD micro-kernels to reach 80–90% of peak.</p>`,
      followUps: ['How do you pick Bs? (cache size, associativity, measure a sweep)', 'What is a cache-oblivious recursive multiply and why does it not need Bs?', 'Why might the tiled result differ from the naive one in the last bits?']
    }
  });

  practice.push({
    title: 'Simulate a 2-Bit Branch Predictor (and gshare)', level: 'Hard', tags: ['branch prediction', 'simulation', 'bit manipulation'], companies: ['Arm', 'AMD', 'Apple'],
    statement: `<p>Given a trace of branch events <code>(pc, taken)</code> and a table of <code>T</code> 2-bit saturating counters (T a power of two, all starting at 1 = weakly not-taken), count mispredictions for (a) a <b>bimodal</b> predictor indexed by <code>pc &amp; (T−1)</code> and (b) a <b>gshare</b> predictor indexed by <code>(pc ^ ghr) &amp; (T−1)</code>, where <code>ghr</code> is a global history register of the last <code>h</code> outcomes (1 = taken), shifted left with each branch. Predict taken iff counter ≥ 2.</p>`,
    constraints: `1 ≤ events ≤ 10<sup>6</sup>; T ≤ 2<sup>16</sup>; 0 ≤ h ≤ 16; pc fits in 32 bits.`,
    example: `<p>Trace pc 0: T T N T, T = 4, bimodal: counter 1 → predict N, actual T ${H.c('r', 'miss')} → 2; predict T ${H.c('g', 'hit')} → 3; predict T, actual N ${H.c('r', 'miss')} → 2; predict T ${H.c('g', 'hit')} → 3. Answer <b>2</b>. An alternating T N T N branch defeats bimodal (~50–100% misses) but gshare with h ≥ 1 learns it: the history picks a different counter for "after T" and "after N".</p>`,
    brute: { why: `<p>A "predict same as last time" (1-bit) predictor mispredicts twice per loop exit (at the exit and again at the next loop entry). Without history, any pattern that is not mostly-one-way (alternating, period-3 loops) is mispredicted constantly; the 2-bit hysteresis and global history fix those cases.</p>`, code: R`
      // 1-bit "last outcome" predictor for comparison.
      int oneBitMisses(const std::vector<std::pair<unsigned, bool>>& trace, int T) {
          std::vector<char> last(T, 0);
          int miss = 0;
          for (auto [pc, taken] : trace) {
              unsigned idx = pc & (T - 1);
              if (last[idx] != taken) ++miss;
              last[idx] = taken;
          }
          return miss;
      }` },
    mcq: { q: 'Why does gshare predict an alternating branch well while bimodal does not?', options: ['The global history makes "after T" and "after N" use different counters', 'gshare has more bits per counter', 'gshare resets counters every branch', 'Bimodal cannot index by pc'], answer: 0, explain: 'XOR-ing the history into the index separates contexts, so each counter sees a constant outcome and saturates to the right prediction.' },
    hints: [`<p>Hint 1: Store counters in a <code>std::vector&lt;std::uint8_t&gt;</code>; update with <code>c = taken ? min(3, c+1) : max(0, c−1)</code>.</p>`, `<p>Hint 2: Keep <code>ghr</code> as an unsigned masked to h bits: <code>ghr = ((ghr &lt;&lt; 1) | taken) &amp; ((1u &lt;&lt; h) − 1)</code>. Careful: h can be 0, and shifting by 32 would be UB — h ≤ 16 here so the mask is safe.</p>`, `<p>Hint 3: Write one function parameterised by h; bimodal is simply h = 0. Test: loop pattern (TTTN)*, alternating (TN)*, and random — print miss rates.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"2\nbimodal 100, gshare 3"},{"stdin":"4 0 4\n0 1\n0 1\n0 0\n0 1\n","stdout":"bimodal 2, gshare 2"},{"stdin":"16 4 100\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n7 1\n7 0\n","stdout":"bimodal 100, gshare 3"},{"stdin":"1 0 1\n0 1\n","stdout":"bimodal 1, gshare 1"},{"stdin":"2 3 2\n5 0\n5 0\n","stdout":"bimodal 0, gshare 0"},{"stdin":"64 6 2000\n4 1\n4 0\n5 1\n6 0\n0 0\n1 1\n7 1\n3 1\n0 1\n7 0\n5 1\n4 1\n1 0\n0 0\n1 1\n5 0\n6 0\n6 0\n0 1\n1 1\n3 1\n6 1\n6 1\n1 1\n4 1\n2 0\n4 1\n5 1\n3 1\n1 1\n4 1\n3 1\n3 1\n6 1\n0 0\n4 1\n7 1\n3 1\n5 1\n1 1\n4 1\n2 0\n6 1\n2 1\n2 1\n6 1\n4 1\n7 1\n3 1\n6 1\n1 1\n6 1\n0 1\n0 0\n2 1\n4 0\n5 0\n2 1\n3 1\n6 1\n7 0\n4 0\n3 1\n7 1\n2 0\n7 0\n1 1\n2 1\n1 1\n6 1\n4 1\n1 1\n5 0\n7 1\n5 1\n6 1\n2 1\n0 0\n2 1\n4 1\n4 0\n3 0\n0 1\n5 1\n4 0\n4 1\n7 1\n3 0\n6 1\n7 1\n0 1\n0 0\n6 1\n0 1\n6 1\n1 1\n1 1\n4 1\n5 1\n6 1\n7 1\n2 1\n5 1\n5 1\n0 1\n0 1\n0 0\n2 1\n1 1\n3 1\n7 0\n4 1\n2 0\n6 1\n0 0\n5 1\n0 1\n1 1\n5 1\n6 1\n6 1\n1 1\n4 1\n6 0\n4 1\n7 1\n7 1\n7 0\n7 0\n4 1\n5 1\n4 1\n7 1\n6 0\n0 1\n0 1\n0 1\n1 1\n6 0\n7 1\n6 1\n4 1\n4 1\n0 1\n0 1\n2 1\n4 0\n4 1\n7 0\n7 1\n5 1\n1 1\n7 1\n0 1\n6 0\n5 0\n3 1\n1 1\n5 1\n4 1\n2 1\n7 0\n0 1\n2 0\n7 1\n1 1\n5 1\n4 0\n1 1\n7 0\n5 1\n4 0\n5 1\n6 1\n0 1\n7 0\n7 1\n1 1\n2 0\n5 1\n7 1\n1 0\n0 1\n2 1\n6 1\n4 1\n4 1\n3 1\n1 1\n2 1\n0 0\n4 0\n7 0\n1 0\n1 1\n2 1\n0 1\n3 1\n7 1\n5 1\n4 1\n1 1\n5 1\n4 0\n5 1\n1 1\n0 1\n0 1\n4 1\n3 1\n7 1\n2 1\n7 0\n0 1\n6 1\n1 0\n7 1\n6 1\n6 1\n5 1\n6 1\n2 0\n7 1\n1 1\n4 1\n3 1\n7 1\n7 1\n3 1\n7 1\n2 1\n2 0\n7 1\n5 0\n2 0\n4 1\n0 1\n4 1\n5 0\n2 1\n3 1\n2 1\n1 0\n1 1\n4 1\n5 0\n7 0\n2 1\n5 1\n5 0\n0 1\n0 1\n2 0\n2 0\n7 1\n5 1\n2 0\n5 1\n4 1\n3 1\n2 0\n0 1\n6 1\n7 0\n5 1\n0 1\n3 1\n3 1\n2 0\n7 1\n1 1\n0 0\n4 1\n2 1\n0 1\n4 1\n0 0\n3 1\n3 1\n2 1\n2 1\n5 0\n5 1\n2 0\n0 1\n6 1\n5 1\n1 1\n2 0\n4 0\n1 1\n2 0\n6 1\n7 1\n4 1\n0 1\n0 1\n5 1\n2 0\n6 0\n2 1\n4 1\n0 0\n3 1\n4 1\n1 1\n2 1\n3 1\n0 1\n1 1\n3 1\n3 1\n3 1\n5 0\n6 1\n4 1\n6 1\n6 1\n1 1\n0 1\n5 0\n6 1\n4 1\n4 1\n1 1\n1 0\n3 0\n5 1\n1 1\n6 1\n2 1\n3 1\n5 1\n3 1\n0 1\n1 1\n4 1\n5 1\n3 0\n4 1\n4 1\n4 0\n4 1\n5 1\n3 1\n4 1\n6 1\n6 0\n3 0\n7 1\n2 1\n0 1\n6 1\n7 0\n7 1\n7 1\n7 1\n6 0\n4 0\n5 1\n3 0\n5 1\n7 1\n1 1\n5 1\n1 0\n2 1\n6 0\n0 1\n2 0\n2 1\n0 1\n1 1\n5 1\n4 0\n3 0\n1 1\n0 1\n0 0\n7 1\n2 1\n6 0\n5 1\n3 0\n4 1\n1 0\n6 0\n6 0\n1 1\n5 1\n0 0\n6 1\n4 0\n5 0\n5 1\n0 1\n5 0\n3 1\n7 1\n1 1\n4 1\n2 1\n3 1\n0 0\n5 1\n2 1\n2 1\n0 0\n1 0\n1 0\n2 1\n6 1\n2 1\n6 0\n0 0\n0 0\n4 0\n5 1\n4 0\n1 1\n1 0\n4 0\n3 1\n0 1\n5 1\n0 0\n5 1\n7 0\n6 1\n3 1\n4 1\n6 1\n1 0\n4 1\n3 1\n5 0\n2 0\n1 1\n5 0\n3 1\n1 1\n7 1\n2 0\n5 1\n2 1\n4 0\n0 0\n3 1\n3 1\n2 0\n3 1\n0 1\n6 0\n5 1\n1 1\n6 0\n0 1\n1 1\n2 0\n3 1\n5 1\n0 1\n7 1\n2 1\n5 1\n5 1\n1 1\n1 1\n2 1\n0 1\n0 1\n7 1\n6 1\n2 1\n1 1\n5 0\n4 1\n5 1\n6 0\n2 1\n5 0\n6 1\n5 0\n6 0\n6 1\n7 1\n5 0\n4 0\n0 1\n0 1\n7 0\n7 1\n2 1\n2 0\n4 1\n5 1\n6 1\n5 1\n5 1\n0 0\n2 0\n3 1\n7 1\n0 1\n7 1\n6 1\n1 1\n6 1\n1 1\n5 0\n4 1\n3 1\n1 1\n4 1\n0 1\n7 0\n0 1\n0 1\n7 1\n2 1\n3 0\n7 0\n0 1\n4 1\n2 1\n5 1\n4 1\n3 0\n5 1\n7 0\n4 1\n4 1\n7 1\n7 1\n1 1\n0 1\n6 1\n0 1\n3 1\n2 1\n1 0\n3 1\n0 0\n2 1\n2 0\n7 1\n2 1\n6 1\n1 1\n4 1\n6 1\n6 1\n0 1\n4 0\n2 1\n4 1\n3 1\n2 0\n3 1\n4 1\n5 0\n1 1\n0 1\n4 1\n1 1\n0 1\n6 0\n2 1\n0 1\n4 1\n3 1\n5 1\n2 0\n2 1\n5 1\n5 0\n0 0\n6 1\n3 0\n0 0\n6 0\n1 0\n3 1\n1 0\n6 1\n6 0\n0 1\n0 1\n5 0\n1 1\n3 1\n7 1\n4 0\n7 1\n6 1\n5 1\n6 1\n5 1\n5 1\n1 0\n7 0\n6 0\n1 1\n6 0\n3 1\n5 1\n5 1\n0 1\n5 1\n0 0\n6 1\n4 1\n7 0\n2 0\n4 1\n2 1\n2 0\n7 0\n3 1\n0 1\n7 1\n4 0\n5 1\n3 1\n5 1\n3 1\n1 0\n0 0\n0 1\n2 1\n5 0\n6 1\n1 1\n7 0\n4 1\n7 1\n6 0\n5 0\n4 0\n5 1\n2 0\n2 1\n3 1\n7 1\n5 1\n2 1\n4 1\n2 1\n4 1\n0 1\n4 1\n2 0\n5 1\n2 1\n5 1\n2 0\n0 0\n7 1\n3 1\n5 0\n6 0\n1 1\n7 0\n5 0\n5 0\n7 1\n6 0\n6 0\n5 0\n2 0\n2 0\n4 1\n2 1\n7 1\n2 0\n1 1\n0 1\n3 0\n6 0\n5 1\n2 1\n1 0\n6 0\n4 0\n1 0\n5 1\n5 1\n0 0\n7 1\n5 1\n3 0\n1 1\n0 1\n6 0\n1 0\n3 0\n4 1\n4 0\n4 0\n0 1\n2 1\n3 1\n3 0\n4 1\n1 1\n4 0\n1 0\n3 1\n2 1\n3 1\n0 1\n5 1\n7 1\n5 1\n2 1\n6 1\n0 1\n4 1\n2 1\n5 1\n1 1\n5 1\n4 1\n2 1\n4 1\n1 0\n1 0\n5 0\n1 1\n4 0\n6 0\n0 0\n5 1\n5 0\n5 1\n4 1\n3 1\n1 0\n6 1\n1 1\n5 1\n1 1\n7 0\n2 1\n7 1\n2 0\n0 1\n4 1\n3 1\n7 1\n5 0\n6 0\n5 1\n0 1\n4 1\n6 1\n6 0\n2 1\n2 1\n5 0\n5 1\n4 1\n7 0\n3 1\n3 1\n0 1\n0 1\n1 0\n7 1\n3 0\n3 0\n4 1\n5 0\n1 1\n6 1\n6 1\n4 1\n5 1\n6 0\n6 0\n7 1\n1 1\n4 1\n3 1\n1 1\n1 0\n5 1\n0 0\n6 1\n5 1\n5 1\n6 0\n7 1\n3 1\n5 1\n3 1\n6 1\n0 1\n1 1\n0 1\n7 1\n3 0\n0 0\n7 1\n5 1\n7 1\n2 1\n5 0\n3 1\n0 1\n1 1\n1 1\n0 1\n2 1\n4 0\n3 1\n5 1\n3 1\n5 1\n1 1\n4 1\n3 0\n6 1\n1 1\n2 0\n5 0\n1 0\n6 1\n4 1\n0 1\n6 1\n5 1\n4 1\n3 1\n3 1\n4 1\n3 0\n6 1\n6 1\n7 1\n7 0\n2 1\n6 0\n2 1\n4 1\n4 1\n7 0\n5 1\n1 1\n1 1\n5 1\n1 0\n4 1\n6 0\n7 1\n2 1\n6 1\n1 1\n2 1\n3 0\n7 1\n7 1\n4 1\n6 1\n2 1\n5 1\n6 0\n5 1\n0 1\n1 1\n6 0\n4 1\n1 0\n4 1\n3 1\n6 1\n0 1\n2 0\n5 1\n3 1\n1 1\n3 1\n2 1\n7 1\n2 0\n3 1\n1 1\n0 1\n5 1\n6 0\n6 0\n5 0\n1 1\n5 0\n3 1\n6 1\n6 1\n3 1\n4 1\n2 0\n5 0\n4 1\n2 1\n7 1\n4 1\n2 0\n5 0\n7 1\n5 1\n5 0\n4 1\n7 0\n3 1\n4 1\n5 0\n5 1\n4 1\n6 1\n0 1\n3 1\n6 1\n5 1\n1 1\n6 0\n6 1\n1 1\n4 1\n0 1\n3 1\n6 1\n5 1\n4 0\n0 0\n6 1\n6 1\n4 1\n4 1\n4 1\n5 0\n0 0\n5 1\n5 0\n6 1\n6 1\n0 1\n0 0\n5 0\n6 1\n4 0\n5 1\n4 1\n5 1\n3 1\n2 0\n6 0\n7 1\n3 1\n5 1\n5 1\n5 0\n7 1\n4 1\n4 1\n1 1\n5 1\n7 1\n0 1\n6 1\n0 1\n4 1\n7 1\n0 0\n7 0\n2 0\n4 1\n0 0\n0 1\n0 1\n2 1\n0 1\n5 1\n6 1\n1 1\n5 1\n5 1\n2 1\n6 1\n5 0\n5 1\n3 1\n2 0\n3 1\n1 1\n7 1\n6 1\n5 0\n7 1\n2 1\n5 1\n4 1\n1 1\n0 1\n7 1\n1 0\n0 1\n2 1\n0 1\n2 0\n3 1\n3 1\n1 1\n2 1\n7 1\n4 1\n6 1\n1 1\n0 1\n4 1\n6 1\n3 0\n5 1\n6 1\n6 1\n7 0\n5 1\n4 1\n3 0\n2 1\n2 0\n1 1\n2 1\n6 1\n1 1\n5 1\n2 1\n4 1\n0 1\n4 1\n1 1\n7 1\n1 1\n7 0\n6 0\n3 1\n3 1\n7 1\n7 1\n4 1\n6 1\n0 0\n1 1\n6 1\n7 1\n2 1\n0 1\n5 1\n0 1\n0 1\n6 1\n7 0\n2 1\n0 1\n7 0\n1 1\n1 0\n4 1\n6 1\n0 1\n1 0\n3 1\n6 1\n4 1\n6 0\n5 1\n2 1\n7 0\n6 1\n7 1\n2 1\n0 1\n7 1\n3 1\n3 0\n5 1\n6 0\n7 1\n3 1\n2 1\n7 1\n3 0\n1 0\n2 1\n1 0\n6 1\n3 1\n0 1\n4 1\n4 0\n2 0\n1 0\n0 1\n7 0\n7 1\n7 1\n6 0\n4 1\n3 0\n7 1\n4 1\n5 1\n0 1\n4 0\n3 1\n0 0\n0 1\n5 1\n7 1\n3 0\n3 0\n5 1\n1 0\n6 1\n5 1\n1 1\n7 1\n1 1\n5 1\n2 1\n2 0\n4 0\n0 1\n0 0\n7 0\n5 1\n0 0\n2 1\n4 1\n1 1\n2 1\n3 1\n2 1\n2 1\n0 1\n3 1\n4 1\n2 1\n3 0\n1 1\n7 1\n5 1\n2 0\n2 1\n4 0\n2 1\n7 1\n2 0\n3 1\n3 1\n7 0\n3 1\n1 0\n5 1\n1 1\n5 1\n1 1\n0 1\n1 1\n1 1\n0 1\n7 0\n1 1\n0 0\n7 1\n2 1\n6 1\n5 1\n2 0\n4 0\n5 1\n5 1\n0 1\n6 1\n4 1\n5 1\n5 0\n5 0\n3 1\n2 0\n7 1\n2 1\n6 0\n2 1\n3 1\n0 1\n6 1\n7 1\n2 0\n2 1\n3 1\n1 1\n1 0\n2 1\n3 1\n3 0\n4 1\n3 1\n7 1\n0 1\n6 1\n1 0\n3 1\n0 1\n3 1\n1 0\n4 1\n6 1\n7 1\n2 1\n2 0\n3 1\n5 1\n6 1\n4 1\n7 1\n3 0\n0 0\n4 1\n2 1\n0 1\n6 0\n4 0\n2 1\n6 1\n0 1\n1 0\n2 1\n7 0\n3 1\n7 1\n6 1\n2 1\n5 0\n6 0\n5 1\n1 1\n2 1\n0 1\n0 1\n3 1\n2 0\n3 1\n5 1\n7 1\n7 1\n6 1\n6 0\n6 1\n5 1\n5 1\n0 0\n6 1\n7 1\n5 1\n0 0\n4 1\n0 0\n2 1\n0 1\n2 0\n0 1\n4 1\n2 0\n7 0\n1 1\n5 0\n4 1\n7 0\n5 0\n6 0\n2 0\n6 0\n0 0\n0 1\n0 1\n4 1\n1 1\n2 1\n5 1\n4 1\n6 0\n3 1\n6 1\n3 1\n6 1\n0 0\n4 1\n5 1\n1 1\n3 1\n0 0\n6 1\n0 1\n0 1\n6 1\n5 1\n6 1\n3 1\n5 1\n2 1\n5 0\n1 1\n7 1\n0 0\n3 1\n1 1\n5 1\n6 1\n3 0\n0 0\n6 1\n7 0\n2 0\n5 0\n4 1\n5 1\n1 1\n1 1\n2 1\n5 0\n7 1\n4 1\n3 1\n1 1\n2 1\n5 1\n3 1\n7 0\n4 1\n3 1\n7 1\n0 1\n3 0\n2 1\n6 0\n3 0\n1 1\n7 0\n5 1\n5 0\n1 0\n7 0\n4 1\n2 1\n4 0\n4 1\n0 1\n0 0\n5 1\n0 1\n6 0\n2 1\n2 1\n6 1\n2 0\n6 0\n7 0\n1 0\n7 1\n6 0\n6 1\n3 1\n2 0\n1 1\n6 1\n6 0\n0 0\n2 1\n5 1\n4 1\n0 1\n1 1\n2 1\n3 1\n4 1\n6 0\n4 1\n7 1\n3 1\n3 1\n0 0\n5 0\n3 0\n3 1\n4 0\n7 1\n6 1\n4 1\n2 1\n4 0\n5 1\n3 1\n7 1\n5 1\n1 1\n2 1\n3 1\n2 1\n5 1\n0 1\n6 1\n2 1\n6 1\n6 1\n1 0\n0 1\n5 0\n7 1\n5 1\n7 1\n7 1\n1 0\n3 1\n5 1\n0 1\n3 1\n4 0\n3 1\n1 1\n6 1\n3 1\n7 1\n7 1\n1 1\n4 1\n7 1\n7 1\n1 0\n2 1\n1 1\n2 1\n0 1\n2 0\n1 1\n3 1\n2 1\n2 1\n6 1\n1 1\n5 1\n5 1\n5 1\n6 0\n3 1\n4 1\n4 0\n6 1\n0 1\n2 0\n5 1\n5 1\n5 1\n7 1\n5 0\n0 0\n0 1\n4 0\n1 1\n1 1\n5 0\n3 1\n0 0\n0 0\n0 1\n5 1\n7 0\n4 0\n6 1\n0 1\n1 1\n6 1\n5 0\n3 0\n3 0\n3 1\n7 0\n7 0\n2 0\n7 1\n6 0\n1 1\n7 1\n5 1\n0 1\n2 0\n1 1\n7 1\n3 1\n7 1\n2 1\n0 1\n7 0\n2 0\n7 0\n1 1\n2 0\n6 1\n6 0\n2 1\n7 1\n1 1\n6 1\n7 0\n1 1\n3 1\n5 1\n5 1\n2 1\n0 1\n5 1\n5 1\n0 1\n3 0\n1 1\n5 1\n3 1\n5 1\n4 1\n0 1\n7 0\n7 1\n4 1\n0 1\n1 1\n2 1\n4 1\n6 1\n0 1\n1 1\n5 0\n2 0\n4 1\n4 1\n1 0\n4 1\n7 0\n0 1\n7 1\n6 1\n4 0\n3 0\n0 1\n7 1\n7 1\n3 1\n4 1\n6 1\n7 0\n0 0\n0 1\n4 0\n4 1\n6 1\n2 0\n3 0\n2 1\n2 0\n0 1\n2 1\n2 1\n7 1\n5 0\n7 1\n7 1\n2 1\n3 1\n6 1\n2 1\n7 1\n7 0\n5 1\n3 1\n2 1\n3 1\n0 0\n3 0\n2 0\n6 1\n0 0\n2 1\n1 1\n0 1\n4 0\n0 1\n7 1\n0 0\n0 1\n1 1\n5 1\n4 0\n0 1\n0 1\n1 1\n1 0\n1 1\n4 0\n1 1\n7 1\n0 1\n5 1\n5 1\n0 1\n7 1\n3 1\n3 0\n5 1\n4 1\n6 1\n2 1\n3 1\n6 1\n6 1\n7 1\n3 1\n6 1\n6 1\n2 1\n0 1\n3 0\n0 1\n2 1\n7 1\n2 1\n0 1\n7 0\n1 1\n6 1\n6 1\n4 1\n4 0\n3 1\n1 1\n3 1\n2 1\n3 1\n3 1\n5 0\n7 1\n3 1\n0 0\n6 1\n0 1\n5 1\n7 0\n7 1\n4 1\n2 1\n7 1\n3 1\n7 1\n6 0\n7 0\n1 1\n2 0\n3 0\n7 1\n1 0\n5 0\n1 1\n2 1\n7 1\n5 1\n4 1\n0 1\n5 1\n5 1\n6 0\n3 1\n2 1\n1 0\n5 1\n5 1\n5 1\n5 1\n4 1\n6 1\n0 0\n5 0\n2 1\n6 0\n2 1\n5 0\n7 1\n3 1\n0 1\n7 0\n4 0\n2 1\n4 0\n0 0\n6 1\n7 1\n0 1\n2 1\n5 0\n0 1\n4 1\n3 1\n1 1\n2 0\n7 1\n4 1\n5 0\n5 1\n5 1\n2 1\n1 1\n1 1\n0 1\n3 1\n2 0\n4 1\n5 1\n6 1\n4 1\n0 1\n5 1\n1 1\n0 1\n6 1\n2 1\n0 0\n7 1\n7 1\n4 1\n3 1\n1 0\n7 1\n2 1\n6 1\n2 1\n4 0\n7 1\n4 1\n1 0\n6 0\n3 0\n1 1\n4 0\n3 0\n3 1\n7 1\n3 1\n0 0\n0 0\n2 1\n0 1\n1 1\n2 1\n0 1\n7 0\n3 1\n7 1\n6 1\n4 1\n2 1\n2 1\n3 1\n2 1\n3 1\n2 1\n7 1\n3 1\n4 1\n0 1\n3 0\n0 0\n7 1\n7 1\n2 1\n0 1\n7 1\n1 1\n0 0\n2 0\n2 1\n3 1\n0 1\n7 1\n1 1\n0 0\n2 1\n0 1\n7 1\n5 0\n0 1\n1 0\n2 1\n2 1\n7 1\n7 1\n5 1\n2 0\n7 0\n5 1\n0 1\n2 1\n3 1\n0 1\n7 0\n6 1\n1 0\n1 0\n6 0\n4 0\n5 1\n0 1\n1 0\n1 0\n7 1\n3 1\n2 1\n6 1\n4 1\n4 1\n6 1\n6 0\n6 1\n3 0\n5 0\n1 0\n3 1\n2 1\n2 0\n4 1\n1 0\n3 1\n6 1\n2 1\n4 1\n6 1\n1 1\n1 0\n2 1\n5 1\n2 1\n0 0\n1 1\n1 1\n7 1\n7 0\n4 0\n3 0\n2 0\n3 0\n3 1\n4 1\n2 1\n0 1\n0 0\n6 0\n2 1\n6 1\n7 1\n5 1\n5 1\n3 1\n0 1\n1 1\n4 1\n1 1\n5 0\n1 1\n6 0\n1 0\n7 1\n4 1\n4 1\n5 0\n3 1\n5 1\n6 1\n0 1\n7 1\n0 0\n3 1\n0 1\n4 1\n6 1\n3 1\n4 1\n0 1\n6 1\n5 1\n6 0\n3 1\n1 1\n4 0\n6 1\n0 1\n7 0\n5 0\n3 1\n3 0\n3 0\n3 0\n0 0\n6 0\n0 0\n5 1\n0 1\n1 1\n1 1\n7 1\n1 1\n3 0\n6 0\n0 0\n7 1\n0 1\n6 0\n1 1\n1 1\n1 1\n6 1\n7 0\n0 0\n2 0\n1 1\n5 1\n6 1\n6 1\n2 1\n5 1\n1 1\n2 1\n5 1\n3 1\n4 1\n4 1\n4 0\n3 1\n2 1\n2 1\n1 0\n7 1\n2 1\n7 1\n5 1\n0 0\n4 1\n4 0\n7 0\n7 0\n7 0\n7 0\n1 1\n0 1\n6 1\n5 1\n5 1\n3 1\n5 1\n5 0\n0 1\n4 1\n4 1\n5 1\n5 0\n2 1\n5 0\n0 1\n7 1\n5 0\n2 0\n5 1\n2 1\n1 0\n6 1\n6 1\n2 0\n2 1\n3 1\n5 1\n2 1\n5 1\n4 1\n5 1\n4 0\n2 0\n3 1\n1 1\n2 0\n0 1\n1 0\n1 0\n3 1\n6 1\n4 1\n5 1\n0 1\n","stdout":"bimodal 681, gshare 761"},{"stdin":"1024 16 2000\n4 1\n4 0\n5 1\n6 0\n0 0\n1 1\n7 1\n3 1\n0 1\n7 0\n5 1\n4 1\n1 0\n0 0\n1 1\n5 0\n6 0\n6 0\n0 1\n1 1\n3 1\n6 1\n6 1\n1 1\n4 1\n2 0\n4 1\n5 1\n3 1\n1 1\n4 1\n3 1\n3 1\n6 1\n0 0\n4 1\n7 1\n3 1\n5 1\n1 1\n4 1\n2 0\n6 1\n2 1\n2 1\n6 1\n4 1\n7 1\n3 1\n6 1\n1 1\n6 1\n0 1\n0 0\n2 1\n4 0\n5 0\n2 1\n3 1\n6 1\n7 0\n4 0\n3 1\n7 1\n2 0\n7 0\n1 1\n2 1\n1 1\n6 1\n4 1\n1 1\n5 0\n7 1\n5 1\n6 1\n2 1\n0 0\n2 1\n4 1\n4 0\n3 0\n0 1\n5 1\n4 0\n4 1\n7 1\n3 0\n6 1\n7 1\n0 1\n0 0\n6 1\n0 1\n6 1\n1 1\n1 1\n4 1\n5 1\n6 1\n7 1\n2 1\n5 1\n5 1\n0 1\n0 1\n0 0\n2 1\n1 1\n3 1\n7 0\n4 1\n2 0\n6 1\n0 0\n5 1\n0 1\n1 1\n5 1\n6 1\n6 1\n1 1\n4 1\n6 0\n4 1\n7 1\n7 1\n7 0\n7 0\n4 1\n5 1\n4 1\n7 1\n6 0\n0 1\n0 1\n0 1\n1 1\n6 0\n7 1\n6 1\n4 1\n4 1\n0 1\n0 1\n2 1\n4 0\n4 1\n7 0\n7 1\n5 1\n1 1\n7 1\n0 1\n6 0\n5 0\n3 1\n1 1\n5 1\n4 1\n2 1\n7 0\n0 1\n2 0\n7 1\n1 1\n5 1\n4 0\n1 1\n7 0\n5 1\n4 0\n5 1\n6 1\n0 1\n7 0\n7 1\n1 1\n2 0\n5 1\n7 1\n1 0\n0 1\n2 1\n6 1\n4 1\n4 1\n3 1\n1 1\n2 1\n0 0\n4 0\n7 0\n1 0\n1 1\n2 1\n0 1\n3 1\n7 1\n5 1\n4 1\n1 1\n5 1\n4 0\n5 1\n1 1\n0 1\n0 1\n4 1\n3 1\n7 1\n2 1\n7 0\n0 1\n6 1\n1 0\n7 1\n6 1\n6 1\n5 1\n6 1\n2 0\n7 1\n1 1\n4 1\n3 1\n7 1\n7 1\n3 1\n7 1\n2 1\n2 0\n7 1\n5 0\n2 0\n4 1\n0 1\n4 1\n5 0\n2 1\n3 1\n2 1\n1 0\n1 1\n4 1\n5 0\n7 0\n2 1\n5 1\n5 0\n0 1\n0 1\n2 0\n2 0\n7 1\n5 1\n2 0\n5 1\n4 1\n3 1\n2 0\n0 1\n6 1\n7 0\n5 1\n0 1\n3 1\n3 1\n2 0\n7 1\n1 1\n0 0\n4 1\n2 1\n0 1\n4 1\n0 0\n3 1\n3 1\n2 1\n2 1\n5 0\n5 1\n2 0\n0 1\n6 1\n5 1\n1 1\n2 0\n4 0\n1 1\n2 0\n6 1\n7 1\n4 1\n0 1\n0 1\n5 1\n2 0\n6 0\n2 1\n4 1\n0 0\n3 1\n4 1\n1 1\n2 1\n3 1\n0 1\n1 1\n3 1\n3 1\n3 1\n5 0\n6 1\n4 1\n6 1\n6 1\n1 1\n0 1\n5 0\n6 1\n4 1\n4 1\n1 1\n1 0\n3 0\n5 1\n1 1\n6 1\n2 1\n3 1\n5 1\n3 1\n0 1\n1 1\n4 1\n5 1\n3 0\n4 1\n4 1\n4 0\n4 1\n5 1\n3 1\n4 1\n6 1\n6 0\n3 0\n7 1\n2 1\n0 1\n6 1\n7 0\n7 1\n7 1\n7 1\n6 0\n4 0\n5 1\n3 0\n5 1\n7 1\n1 1\n5 1\n1 0\n2 1\n6 0\n0 1\n2 0\n2 1\n0 1\n1 1\n5 1\n4 0\n3 0\n1 1\n0 1\n0 0\n7 1\n2 1\n6 0\n5 1\n3 0\n4 1\n1 0\n6 0\n6 0\n1 1\n5 1\n0 0\n6 1\n4 0\n5 0\n5 1\n0 1\n5 0\n3 1\n7 1\n1 1\n4 1\n2 1\n3 1\n0 0\n5 1\n2 1\n2 1\n0 0\n1 0\n1 0\n2 1\n6 1\n2 1\n6 0\n0 0\n0 0\n4 0\n5 1\n4 0\n1 1\n1 0\n4 0\n3 1\n0 1\n5 1\n0 0\n5 1\n7 0\n6 1\n3 1\n4 1\n6 1\n1 0\n4 1\n3 1\n5 0\n2 0\n1 1\n5 0\n3 1\n1 1\n7 1\n2 0\n5 1\n2 1\n4 0\n0 0\n3 1\n3 1\n2 0\n3 1\n0 1\n6 0\n5 1\n1 1\n6 0\n0 1\n1 1\n2 0\n3 1\n5 1\n0 1\n7 1\n2 1\n5 1\n5 1\n1 1\n1 1\n2 1\n0 1\n0 1\n7 1\n6 1\n2 1\n1 1\n5 0\n4 1\n5 1\n6 0\n2 1\n5 0\n6 1\n5 0\n6 0\n6 1\n7 1\n5 0\n4 0\n0 1\n0 1\n7 0\n7 1\n2 1\n2 0\n4 1\n5 1\n6 1\n5 1\n5 1\n0 0\n2 0\n3 1\n7 1\n0 1\n7 1\n6 1\n1 1\n6 1\n1 1\n5 0\n4 1\n3 1\n1 1\n4 1\n0 1\n7 0\n0 1\n0 1\n7 1\n2 1\n3 0\n7 0\n0 1\n4 1\n2 1\n5 1\n4 1\n3 0\n5 1\n7 0\n4 1\n4 1\n7 1\n7 1\n1 1\n0 1\n6 1\n0 1\n3 1\n2 1\n1 0\n3 1\n0 0\n2 1\n2 0\n7 1\n2 1\n6 1\n1 1\n4 1\n6 1\n6 1\n0 1\n4 0\n2 1\n4 1\n3 1\n2 0\n3 1\n4 1\n5 0\n1 1\n0 1\n4 1\n1 1\n0 1\n6 0\n2 1\n0 1\n4 1\n3 1\n5 1\n2 0\n2 1\n5 1\n5 0\n0 0\n6 1\n3 0\n0 0\n6 0\n1 0\n3 1\n1 0\n6 1\n6 0\n0 1\n0 1\n5 0\n1 1\n3 1\n7 1\n4 0\n7 1\n6 1\n5 1\n6 1\n5 1\n5 1\n1 0\n7 0\n6 0\n1 1\n6 0\n3 1\n5 1\n5 1\n0 1\n5 1\n0 0\n6 1\n4 1\n7 0\n2 0\n4 1\n2 1\n2 0\n7 0\n3 1\n0 1\n7 1\n4 0\n5 1\n3 1\n5 1\n3 1\n1 0\n0 0\n0 1\n2 1\n5 0\n6 1\n1 1\n7 0\n4 1\n7 1\n6 0\n5 0\n4 0\n5 1\n2 0\n2 1\n3 1\n7 1\n5 1\n2 1\n4 1\n2 1\n4 1\n0 1\n4 1\n2 0\n5 1\n2 1\n5 1\n2 0\n0 0\n7 1\n3 1\n5 0\n6 0\n1 1\n7 0\n5 0\n5 0\n7 1\n6 0\n6 0\n5 0\n2 0\n2 0\n4 1\n2 1\n7 1\n2 0\n1 1\n0 1\n3 0\n6 0\n5 1\n2 1\n1 0\n6 0\n4 0\n1 0\n5 1\n5 1\n0 0\n7 1\n5 1\n3 0\n1 1\n0 1\n6 0\n1 0\n3 0\n4 1\n4 0\n4 0\n0 1\n2 1\n3 1\n3 0\n4 1\n1 1\n4 0\n1 0\n3 1\n2 1\n3 1\n0 1\n5 1\n7 1\n5 1\n2 1\n6 1\n0 1\n4 1\n2 1\n5 1\n1 1\n5 1\n4 1\n2 1\n4 1\n1 0\n1 0\n5 0\n1 1\n4 0\n6 0\n0 0\n5 1\n5 0\n5 1\n4 1\n3 1\n1 0\n6 1\n1 1\n5 1\n1 1\n7 0\n2 1\n7 1\n2 0\n0 1\n4 1\n3 1\n7 1\n5 0\n6 0\n5 1\n0 1\n4 1\n6 1\n6 0\n2 1\n2 1\n5 0\n5 1\n4 1\n7 0\n3 1\n3 1\n0 1\n0 1\n1 0\n7 1\n3 0\n3 0\n4 1\n5 0\n1 1\n6 1\n6 1\n4 1\n5 1\n6 0\n6 0\n7 1\n1 1\n4 1\n3 1\n1 1\n1 0\n5 1\n0 0\n6 1\n5 1\n5 1\n6 0\n7 1\n3 1\n5 1\n3 1\n6 1\n0 1\n1 1\n0 1\n7 1\n3 0\n0 0\n7 1\n5 1\n7 1\n2 1\n5 0\n3 1\n0 1\n1 1\n1 1\n0 1\n2 1\n4 0\n3 1\n5 1\n3 1\n5 1\n1 1\n4 1\n3 0\n6 1\n1 1\n2 0\n5 0\n1 0\n6 1\n4 1\n0 1\n6 1\n5 1\n4 1\n3 1\n3 1\n4 1\n3 0\n6 1\n6 1\n7 1\n7 0\n2 1\n6 0\n2 1\n4 1\n4 1\n7 0\n5 1\n1 1\n1 1\n5 1\n1 0\n4 1\n6 0\n7 1\n2 1\n6 1\n1 1\n2 1\n3 0\n7 1\n7 1\n4 1\n6 1\n2 1\n5 1\n6 0\n5 1\n0 1\n1 1\n6 0\n4 1\n1 0\n4 1\n3 1\n6 1\n0 1\n2 0\n5 1\n3 1\n1 1\n3 1\n2 1\n7 1\n2 0\n3 1\n1 1\n0 1\n5 1\n6 0\n6 0\n5 0\n1 1\n5 0\n3 1\n6 1\n6 1\n3 1\n4 1\n2 0\n5 0\n4 1\n2 1\n7 1\n4 1\n2 0\n5 0\n7 1\n5 1\n5 0\n4 1\n7 0\n3 1\n4 1\n5 0\n5 1\n4 1\n6 1\n0 1\n3 1\n6 1\n5 1\n1 1\n6 0\n6 1\n1 1\n4 1\n0 1\n3 1\n6 1\n5 1\n4 0\n0 0\n6 1\n6 1\n4 1\n4 1\n4 1\n5 0\n0 0\n5 1\n5 0\n6 1\n6 1\n0 1\n0 0\n5 0\n6 1\n4 0\n5 1\n4 1\n5 1\n3 1\n2 0\n6 0\n7 1\n3 1\n5 1\n5 1\n5 0\n7 1\n4 1\n4 1\n1 1\n5 1\n7 1\n0 1\n6 1\n0 1\n4 1\n7 1\n0 0\n7 0\n2 0\n4 1\n0 0\n0 1\n0 1\n2 1\n0 1\n5 1\n6 1\n1 1\n5 1\n5 1\n2 1\n6 1\n5 0\n5 1\n3 1\n2 0\n3 1\n1 1\n7 1\n6 1\n5 0\n7 1\n2 1\n5 1\n4 1\n1 1\n0 1\n7 1\n1 0\n0 1\n2 1\n0 1\n2 0\n3 1\n3 1\n1 1\n2 1\n7 1\n4 1\n6 1\n1 1\n0 1\n4 1\n6 1\n3 0\n5 1\n6 1\n6 1\n7 0\n5 1\n4 1\n3 0\n2 1\n2 0\n1 1\n2 1\n6 1\n1 1\n5 1\n2 1\n4 1\n0 1\n4 1\n1 1\n7 1\n1 1\n7 0\n6 0\n3 1\n3 1\n7 1\n7 1\n4 1\n6 1\n0 0\n1 1\n6 1\n7 1\n2 1\n0 1\n5 1\n0 1\n0 1\n6 1\n7 0\n2 1\n0 1\n7 0\n1 1\n1 0\n4 1\n6 1\n0 1\n1 0\n3 1\n6 1\n4 1\n6 0\n5 1\n2 1\n7 0\n6 1\n7 1\n2 1\n0 1\n7 1\n3 1\n3 0\n5 1\n6 0\n7 1\n3 1\n2 1\n7 1\n3 0\n1 0\n2 1\n1 0\n6 1\n3 1\n0 1\n4 1\n4 0\n2 0\n1 0\n0 1\n7 0\n7 1\n7 1\n6 0\n4 1\n3 0\n7 1\n4 1\n5 1\n0 1\n4 0\n3 1\n0 0\n0 1\n5 1\n7 1\n3 0\n3 0\n5 1\n1 0\n6 1\n5 1\n1 1\n7 1\n1 1\n5 1\n2 1\n2 0\n4 0\n0 1\n0 0\n7 0\n5 1\n0 0\n2 1\n4 1\n1 1\n2 1\n3 1\n2 1\n2 1\n0 1\n3 1\n4 1\n2 1\n3 0\n1 1\n7 1\n5 1\n2 0\n2 1\n4 0\n2 1\n7 1\n2 0\n3 1\n3 1\n7 0\n3 1\n1 0\n5 1\n1 1\n5 1\n1 1\n0 1\n1 1\n1 1\n0 1\n7 0\n1 1\n0 0\n7 1\n2 1\n6 1\n5 1\n2 0\n4 0\n5 1\n5 1\n0 1\n6 1\n4 1\n5 1\n5 0\n5 0\n3 1\n2 0\n7 1\n2 1\n6 0\n2 1\n3 1\n0 1\n6 1\n7 1\n2 0\n2 1\n3 1\n1 1\n1 0\n2 1\n3 1\n3 0\n4 1\n3 1\n7 1\n0 1\n6 1\n1 0\n3 1\n0 1\n3 1\n1 0\n4 1\n6 1\n7 1\n2 1\n2 0\n3 1\n5 1\n6 1\n4 1\n7 1\n3 0\n0 0\n4 1\n2 1\n0 1\n6 0\n4 0\n2 1\n6 1\n0 1\n1 0\n2 1\n7 0\n3 1\n7 1\n6 1\n2 1\n5 0\n6 0\n5 1\n1 1\n2 1\n0 1\n0 1\n3 1\n2 0\n3 1\n5 1\n7 1\n7 1\n6 1\n6 0\n6 1\n5 1\n5 1\n0 0\n6 1\n7 1\n5 1\n0 0\n4 1\n0 0\n2 1\n0 1\n2 0\n0 1\n4 1\n2 0\n7 0\n1 1\n5 0\n4 1\n7 0\n5 0\n6 0\n2 0\n6 0\n0 0\n0 1\n0 1\n4 1\n1 1\n2 1\n5 1\n4 1\n6 0\n3 1\n6 1\n3 1\n6 1\n0 0\n4 1\n5 1\n1 1\n3 1\n0 0\n6 1\n0 1\n0 1\n6 1\n5 1\n6 1\n3 1\n5 1\n2 1\n5 0\n1 1\n7 1\n0 0\n3 1\n1 1\n5 1\n6 1\n3 0\n0 0\n6 1\n7 0\n2 0\n5 0\n4 1\n5 1\n1 1\n1 1\n2 1\n5 0\n7 1\n4 1\n3 1\n1 1\n2 1\n5 1\n3 1\n7 0\n4 1\n3 1\n7 1\n0 1\n3 0\n2 1\n6 0\n3 0\n1 1\n7 0\n5 1\n5 0\n1 0\n7 0\n4 1\n2 1\n4 0\n4 1\n0 1\n0 0\n5 1\n0 1\n6 0\n2 1\n2 1\n6 1\n2 0\n6 0\n7 0\n1 0\n7 1\n6 0\n6 1\n3 1\n2 0\n1 1\n6 1\n6 0\n0 0\n2 1\n5 1\n4 1\n0 1\n1 1\n2 1\n3 1\n4 1\n6 0\n4 1\n7 1\n3 1\n3 1\n0 0\n5 0\n3 0\n3 1\n4 0\n7 1\n6 1\n4 1\n2 1\n4 0\n5 1\n3 1\n7 1\n5 1\n1 1\n2 1\n3 1\n2 1\n5 1\n0 1\n6 1\n2 1\n6 1\n6 1\n1 0\n0 1\n5 0\n7 1\n5 1\n7 1\n7 1\n1 0\n3 1\n5 1\n0 1\n3 1\n4 0\n3 1\n1 1\n6 1\n3 1\n7 1\n7 1\n1 1\n4 1\n7 1\n7 1\n1 0\n2 1\n1 1\n2 1\n0 1\n2 0\n1 1\n3 1\n2 1\n2 1\n6 1\n1 1\n5 1\n5 1\n5 1\n6 0\n3 1\n4 1\n4 0\n6 1\n0 1\n2 0\n5 1\n5 1\n5 1\n7 1\n5 0\n0 0\n0 1\n4 0\n1 1\n1 1\n5 0\n3 1\n0 0\n0 0\n0 1\n5 1\n7 0\n4 0\n6 1\n0 1\n1 1\n6 1\n5 0\n3 0\n3 0\n3 1\n7 0\n7 0\n2 0\n7 1\n6 0\n1 1\n7 1\n5 1\n0 1\n2 0\n1 1\n7 1\n3 1\n7 1\n2 1\n0 1\n7 0\n2 0\n7 0\n1 1\n2 0\n6 1\n6 0\n2 1\n7 1\n1 1\n6 1\n7 0\n1 1\n3 1\n5 1\n5 1\n2 1\n0 1\n5 1\n5 1\n0 1\n3 0\n1 1\n5 1\n3 1\n5 1\n4 1\n0 1\n7 0\n7 1\n4 1\n0 1\n1 1\n2 1\n4 1\n6 1\n0 1\n1 1\n5 0\n2 0\n4 1\n4 1\n1 0\n4 1\n7 0\n0 1\n7 1\n6 1\n4 0\n3 0\n0 1\n7 1\n7 1\n3 1\n4 1\n6 1\n7 0\n0 0\n0 1\n4 0\n4 1\n6 1\n2 0\n3 0\n2 1\n2 0\n0 1\n2 1\n2 1\n7 1\n5 0\n7 1\n7 1\n2 1\n3 1\n6 1\n2 1\n7 1\n7 0\n5 1\n3 1\n2 1\n3 1\n0 0\n3 0\n2 0\n6 1\n0 0\n2 1\n1 1\n0 1\n4 0\n0 1\n7 1\n0 0\n0 1\n1 1\n5 1\n4 0\n0 1\n0 1\n1 1\n1 0\n1 1\n4 0\n1 1\n7 1\n0 1\n5 1\n5 1\n0 1\n7 1\n3 1\n3 0\n5 1\n4 1\n6 1\n2 1\n3 1\n6 1\n6 1\n7 1\n3 1\n6 1\n6 1\n2 1\n0 1\n3 0\n0 1\n2 1\n7 1\n2 1\n0 1\n7 0\n1 1\n6 1\n6 1\n4 1\n4 0\n3 1\n1 1\n3 1\n2 1\n3 1\n3 1\n5 0\n7 1\n3 1\n0 0\n6 1\n0 1\n5 1\n7 0\n7 1\n4 1\n2 1\n7 1\n3 1\n7 1\n6 0\n7 0\n1 1\n2 0\n3 0\n7 1\n1 0\n5 0\n1 1\n2 1\n7 1\n5 1\n4 1\n0 1\n5 1\n5 1\n6 0\n3 1\n2 1\n1 0\n5 1\n5 1\n5 1\n5 1\n4 1\n6 1\n0 0\n5 0\n2 1\n6 0\n2 1\n5 0\n7 1\n3 1\n0 1\n7 0\n4 0\n2 1\n4 0\n0 0\n6 1\n7 1\n0 1\n2 1\n5 0\n0 1\n4 1\n3 1\n1 1\n2 0\n7 1\n4 1\n5 0\n5 1\n5 1\n2 1\n1 1\n1 1\n0 1\n3 1\n2 0\n4 1\n5 1\n6 1\n4 1\n0 1\n5 1\n1 1\n0 1\n6 1\n2 1\n0 0\n7 1\n7 1\n4 1\n3 1\n1 0\n7 1\n2 1\n6 1\n2 1\n4 0\n7 1\n4 1\n1 0\n6 0\n3 0\n1 1\n4 0\n3 0\n3 1\n7 1\n3 1\n0 0\n0 0\n2 1\n0 1\n1 1\n2 1\n0 1\n7 0\n3 1\n7 1\n6 1\n4 1\n2 1\n2 1\n3 1\n2 1\n3 1\n2 1\n7 1\n3 1\n4 1\n0 1\n3 0\n0 0\n7 1\n7 1\n2 1\n0 1\n7 1\n1 1\n0 0\n2 0\n2 1\n3 1\n0 1\n7 1\n1 1\n0 0\n2 1\n0 1\n7 1\n5 0\n0 1\n1 0\n2 1\n2 1\n7 1\n7 1\n5 1\n2 0\n7 0\n5 1\n0 1\n2 1\n3 1\n0 1\n7 0\n6 1\n1 0\n1 0\n6 0\n4 0\n5 1\n0 1\n1 0\n1 0\n7 1\n3 1\n2 1\n6 1\n4 1\n4 1\n6 1\n6 0\n6 1\n3 0\n5 0\n1 0\n3 1\n2 1\n2 0\n4 1\n1 0\n3 1\n6 1\n2 1\n4 1\n6 1\n1 1\n1 0\n2 1\n5 1\n2 1\n0 0\n1 1\n1 1\n7 1\n7 0\n4 0\n3 0\n2 0\n3 0\n3 1\n4 1\n2 1\n0 1\n0 0\n6 0\n2 1\n6 1\n7 1\n5 1\n5 1\n3 1\n0 1\n1 1\n4 1\n1 1\n5 0\n1 1\n6 0\n1 0\n7 1\n4 1\n4 1\n5 0\n3 1\n5 1\n6 1\n0 1\n7 1\n0 0\n3 1\n0 1\n4 1\n6 1\n3 1\n4 1\n0 1\n6 1\n5 1\n6 0\n3 1\n1 1\n4 0\n6 1\n0 1\n7 0\n5 0\n3 1\n3 0\n3 0\n3 0\n0 0\n6 0\n0 0\n5 1\n0 1\n1 1\n1 1\n7 1\n1 1\n3 0\n6 0\n0 0\n7 1\n0 1\n6 0\n1 1\n1 1\n1 1\n6 1\n7 0\n0 0\n2 0\n1 1\n5 1\n6 1\n6 1\n2 1\n5 1\n1 1\n2 1\n5 1\n3 1\n4 1\n4 1\n4 0\n3 1\n2 1\n2 1\n1 0\n7 1\n2 1\n7 1\n5 1\n0 0\n4 1\n4 0\n7 0\n7 0\n7 0\n7 0\n1 1\n0 1\n6 1\n5 1\n5 1\n3 1\n5 1\n5 0\n0 1\n4 1\n4 1\n5 1\n5 0\n2 1\n5 0\n0 1\n7 1\n5 0\n2 0\n5 1\n2 1\n1 0\n6 1\n6 1\n2 0\n2 1\n3 1\n5 1\n2 1\n5 1\n4 1\n5 1\n4 0\n2 0\n3 1\n1 1\n2 0\n0 1\n1 0\n1 0\n3 1\n6 1\n4 1\n5 1\n0 1\n","stdout":"bimodal 681, gshare 973"},{"stdin":{"$concat":["65536 16 1000000\n",{"$rep":"7 1\n7 0\n","n":500000}]},"stdout":"bimodal 1000000, gshare 9"}]},
    solution: {
      approach: `<p>Direct simulation with a small counter table. Index with pc (bimodal) or pc XOR history (gshare), compare the prediction with the outcome, update the saturating counter, then shift the outcome into the history. Bimodal is the special case h = 0, so one function covers both.</p>`,
      code: R`
        #include <cstdint>
        #include <cstdio>
        #include <utility>
        #include <vector>
        long long simulate(const std::vector<std::pair<std::uint32_t, bool>>& trace, unsigned T, unsigned h) {
            std::vector<std::uint8_t> ctr(T, 1);                 // weakly not-taken
            const std::uint32_t hmask = (h == 0) ? 0u : ((1u << h) - 1u);   // h <= 16: no shift UB
            std::uint32_t ghr = 0;
            long long miss = 0;
            for (auto [pc, taken] : trace) {
                std::uint32_t idx = (pc ^ ghr) & (T - 1);
                bool predictTaken = ctr[idx] >= 2;
                if (predictTaken != taken) ++miss;
                if (taken) { if (ctr[idx] < 3) ++ctr[idx]; }
                else       { if (ctr[idx] > 0) --ctr[idx]; }
                ghr = ((ghr << 1) | (taken ? 1u : 0u)) & hmask;
            }
            return miss;
        }
        int main() {
            int T = 0, h = 0, n = 0;
            if (std::scanf("%d %d %d", &T, &h, &n) == 3) {          // "T h n" then n lines "pc taken" (demo traces when no input)
                std::vector<std::pair<std::uint32_t, bool>> trace(n);
                for (auto& [pc, taken] : trace) { unsigned p; int t; std::scanf("%u %d", &p, &t); pc = p; taken = t; }
                std::printf("bimodal %lld, gshare %lld\n", simulate(trace, T, 0), simulate(trace, T, h));
                return 0;
            }
            std::vector<std::pair<std::uint32_t, bool>> loop = {{0,true},{0,true},{0,false},{0,true}};
            std::vector<std::pair<std::uint32_t, bool>> alt;
            for (int i = 0; i < 100; ++i) alt.push_back({7, i % 2 == 0});
            std::printf("%lld\n", simulate(loop, 4, 0));          // 2 (bimodal)
            std::printf("bimodal %lld, gshare %lld\n", simulate(alt, 16, 0), simulate(alt, 16, 4));
        }`,
      dry: { head: ['event', 'counter before', 'predict', 'actual', 'result', 'counter after'], rows: [['1', '1 (WN)', 'N', 'T', '<span class="c-r">miss</span>', '2'], ['2', '2 (WT)', 'T', 'T', 'hit', '3'], ['3', '3 (ST)', 'T', 'N', '<span class="c-r">miss</span>', '2'], ['4', '2 (WT)', 'T', 'T', 'hit', '3']] },
      complexity: `<p>O(events) time, O(T) space.</p>`,
      followUps: ['Add a tournament predictor that chooses between bimodal and gshare per branch.', 'What is aliasing in predictor tables and how does T affect it?', 'How would you model the BTB for indirect branches?']
    }
  });

  practice.push({
    title: 'Cache-Blocked Matrix Transpose', level: 'Hard', tags: ['cache', 'tiling', 'conflict misses'], companies: ['Nvidia', 'Jane Street', 'Meta'],
    statement: `<p>Transpose an N×N row-major <code>float</code> matrix into a separate output (<code>out[j][i] = in[i][j]</code>). Any loop order reads one matrix by rows and writes the other by columns, so the naive version is memory-bound. Implement a <b>blocked</b> transpose and explain why it helps and why power-of-two N is especially bad.</p>`,
    constraints: `N ≤ 8192 (up to 256 MB per matrix). Single thread. Must handle N not divisible by the block size.`,
    example: `<p>in = [[1, 2], [3, 4]] → out = [[1, 3], [2, 4]]. For N = 4096 the naive version writes ${H.c('r', 'out down a column: 16 KB stride')} — each write touches a new line and the 4 KB-aligned addresses collide in the same cache sets. With 32×32 tiles, ${H.c('g', 'both tiles (4 KB each) fit in L1')}, so each loaded line is fully used before eviction.</p>`,
    brute: { why: `<p>Naive transpose reads <code>in</code> row-wise (good) but writes <code>out</code> column-wise: every write hits a different cache line, and only 4 of its 64 bytes are written before it is evicted (the other 15 floats of that line are written much later, after the line has been evicted and must be re-fetched). With N a power of two, the column addresses are exact multiples of 4 KB apart and map to the same L1 set, so even 12–16 rows evict each other (conflict misses).</p>`, code: R`
      void transposeNaive(const std::vector<float>& in, std::vector<float>& out, int N) {
          for (int i = 0; i < N; ++i)
              for (int j = 0; j < N; ++j)
                  out[(size_t)j * N + i] = in[(size_t)i * N + j];   // column-wise writes
      }` },
    mcq: { q: 'Why does a block size of 16–64 work well for floats?', options: ['A tile row is 1+ full cache lines and two tiles fit in L1', 'It matches the number of CPU registers', 'It makes N divisible by the tile size', 'The compiler requires it for vectorisation'], answer: 0, explain: '16 floats = 64 bytes = one line. With a B×B tile of input and output both resident in L1, every line brought in is used completely before it is evicted.' },
    hints: [`<p>Hint 1: Within a small B×B tile, the column-wise writes only span B distinct lines, which can all stay in L1 while the tile is processed.</p>`, `<p>Hint 2: Loop over tile origins (ii, jj) with step B, then over i in [ii, min(ii+B, N)) and j in [jj, min(jj+B, N)).</p>`, `<p>Hint 3: For power-of-two N, conflict misses persist even with tiles; padding the row length (leading dimension N + 16) or a recursive cache-oblivious split are classic fixes. Measure B ∈ {16, 32, 64}.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"1 4 7 2 5 8 3 6 9\n1 3 2 4\n5\n2 1 1\n31 1 1\n32 1 1\n33 1 1\n64 1 1\n100 1 1\n1000 1 1\n4096 1 1"}]},
    solution: {
      approach: `<p>Process the matrix tile by tile. Inside a tile, reads touch B lines of <code>in</code> and writes touch B lines of <code>out</code>; with B = 32 each tile is 32 rows x 2 lines = 64 lines (4 KB), so the input and output tiles together take 8 KB — comfortably in L1 — and each line is fetched once and fully used. Edge tiles are clipped with <code>std::min</code>.</p>`,
      code: R`
        #include <algorithm>
        #include <cstdio>
        #include <vector>
        void transposeBlocked(const std::vector<float>& in, std::vector<float>& out, int N, int B = 32) {
            for (int ii = 0; ii < N; ii += B)
                for (int jj = 0; jj < N; jj += B) {
                    const int iEnd = std::min(ii + B, N), jEnd = std::min(jj + B, N);
                    for (int i = ii; i < iEnd; ++i)
                        for (int j = jj; j < jEnd; ++j)
                            out[(size_t)j * N + i] = in[(size_t)i * N + j];   // all within one tile
                }
        }
        int main() {
            const int N = 3;
            std::vector<float> in = {1,2,3, 4,5,6, 7,8,9}, out(N * N);
            transposeBlocked(in, out, N, 2);                   // tile 2 on N = 3 exercises the edges
            for (float x : out) std::printf("%.0f ", x);       // 1 4 7 2 5 8 3 6 9
            std::printf("\n");
            std::vector<float> a = {1, 2, 3, 4}, b(4);
            transposeBlocked(a, b, 2);
            for (float x : b) std::printf("%.0f ", x);         // 1 3 2 4
            std::printf("\n");
            std::vector<float> one = {5}, o1(1);
            transposeBlocked(one, o1, 1);
            std::printf("%.0f\n", o1[0]);                      // 5
            for (int n : {2, 31, 32, 33, 64, 100, 1000, 4096}) {   // in[i][j] = i*n + j: exact in float up to 2^24
                std::vector<float> m((size_t)n * n), t((size_t)n * n), back((size_t)n * n);
                for (size_t k = 0; k < m.size(); ++k) m[k] = static_cast<float>(k);
                transposeBlocked(m, t, n);
                transposeBlocked(t, back, n, 16);
                bool good = true;
                for (int i = 0; i < n && good; ++i)
                    for (int j = 0; j < n; ++j)
                        if (t[(size_t)j * n + i] != static_cast<float>((size_t)i * n + j)) { good = false; break; }
                std::printf("%d %d %d\n", n, good, back == m);   // n 1 1
            }
        }`,
      dry: { head: ['tile (ii, jj)', 'i range', 'j range', 'writes'], rows: [['(0,0)', '0..1', '0..1', 'out[0][0], out[1][0], out[0][1], out[1][1]'], ['(0,2)', '0..1', '2', 'out[2][0], out[2][1]'], ['(2,0)', '2', '0..1', 'out[0][2], out[1][2]'], ['(2,2)', '2', '2', 'out[2][2]']] },
      complexity: `<p>O(N²) time and O(1) extra space beyond the output. Memory traffic falls from ~N² lines for writes to ~N²/16; typical 3–6× faster for N ≥ 2048.</p>`,
      followUps: ['How would you do an in-place transpose of a square matrix with blocking?', 'How do SIMD 4×4 or 8×8 register transposes speed up the inner tile further?']
    }
  });

  practice.push({
    title: 'Overflow-Safe atoi Without Any UB', level: 'Hard', tags: ['undefined behavior', 'integer overflow', 'parsing'], companies: ['Microsoft', 'Amazon', 'Apple'],
    statement: `<p>Implement <code>std::optional&lt;int&gt; parseInt(std::string_view s)</code>: optional leading spaces, optional sign, then at least one digit, then nothing else. Return <code>nullopt</code> on bad format or if the value does not fit in <code>int</code>. The implementation must not execute signed overflow for <b>any</b> input — including "-2147483648" (valid!) and "2147483648" (out of range).</p>`,
    constraints: `|s| ≤ 10<sup>5</sup>. No <code>std::stoi</code>/<code>strtol</code> (they throw or use errno). Long digit strings like "000…0007" must work.`,
    example: `<p>"  -42" → ${H.c('g', '-42')}; "2147483647" → ${H.c('g', '2147483647')}; "-2147483648" → ${H.c('g', 'INT_MIN')}; "2147483648" → ${H.c('r', 'nullopt')}; "12a" → ${H.c('r', 'nullopt')}; "" or "-" → ${H.c('r', 'nullopt')}.</p>`,
    brute: { why: `<p>The common <code>result = result * 10 + digit;</code> in <code>int</code> overflows on the input that does not fit — UB, so any check afterwards (<code>if (result &lt; 0)</code>) can be deleted by the optimiser. Accumulating as positive then negating also fails for INT_MIN, whose magnitude does not fit in int.</p>`, code: R`
      int parseIntBuggy(const std::string& s) {
          int result = 0, sign = 1; size_t i = 0;
          if (s[i] == '-') { sign = -1; ++i; }            // accepts "-" and "" as 0: no digit check
          for (; i < s.size(); ++i)
              result = result * 10 + (s[i] - '0');         // overflows for big inputs: UB
          return sign * result;                            // "-2147483648" fails even without UB
      }` },
    mcq: { q: 'Which technique handles INT_MIN without UB and without a wider type?', options: ['Accumulate as a negative number and check bounds against INT_MIN before each step', 'Accumulate as positive, then negate', 'Use unsigned and cast back without checks', 'Catch the overflow exception'], answer: 0, explain: 'The negative range is one larger than the positive range, so accumulating negatively can represent INT_MIN. Check "acc < (INT_MIN + d) / 10" before computing acc*10 - d. C++ has no overflow exceptions.' },
    hints: [`<p>Hint 1: Never compute a value and then ask if it overflowed. Check whether the <b>next</b> step would overflow before doing it.</p>`, `<p>Hint 2: Simplest correct approach: accumulate in <code>long long</code> and stop as soon as the magnitude exceeds 2147483648 (so even 10<sup>5</sup> digits cannot overflow the 64-bit accumulator).</p>`, `<p>Hint 3: Without a wider type: accumulate negatively; before <code>acc = acc * 10 - d</code> check <code>acc &lt; (INT_MIN + d) / 10</code>. At the end, if positive, check <code>acc != INT_MIN</code> and negate. Test "", "+", "-0", "  7", "7 ", "-2147483648", "2147483648", "99999999999999999999".</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"'  -42' -> -42\n'2147483647' -> 2147483647\n'-2147483648' -> -2147483648\n'2147483648' -> nullopt\n'12a' -> nullopt\n'' -> nullopt\n'-' -> nullopt\n'+5' -> 5\n'+' -> nullopt\n'-0' -> 0\n'0007' -> 7\n'2147483647 ' -> nullopt\n' ' -> nullopt\n'- 5' -> nullopt\n'--5' -> nullopt\n'+2147483648' -> nullopt\n'-2147483649' -> nullopt\n'99999999999999999999' -> nullopt\n'1e3' -> nullopt\n'00000000002147483648' -> nullopt\n'-00000000002147483648' -> -2147483648\n'   7' -> 7\nzeros -> 0\nzeros7 -> 7\nnines -> nullopt\nspaces -> 5"}]},
    solution: {
      approach: `<p>Parse format first (spaces, sign, digits only). Accumulate the magnitude in a <code>long long</code>, bailing out as soon as it exceeds the largest magnitude any int can have (2<sup>31</sup>) — so the accumulator itself never overflows regardless of length. Then apply the sign and range-check against INT_MIN/INT_MAX before narrowing. Every operation is on values known to be in range.</p>`,
      code: R`
        #include <climits>
        #include <cstdio>
        #include <optional>
        #include <string_view>
        std::optional<int> parseInt(std::string_view s) {
            std::size_t i = 0;
            while (i < s.size() && s[i] == ' ') ++i;              // leading spaces
            bool neg = false;
            if (i < s.size() && (s[i] == '+' || s[i] == '-')) neg = (s[i++] == '-');
            if (i == s.size()) return std::nullopt;               // no digits
            const long long LIMIT = 2147483648LL;                 // |INT_MIN|
            long long mag = 0;
            for (; i < s.size(); ++i) {
                char c = s[i];
                if (c < '0' || c > '9') return std::nullopt;      // junk
                mag = mag * 10 + (c - '0');                       // mag <= 2^31 before this: <= ~2.1e10, safe
                if (mag > LIMIT) return std::nullopt;             // too big for any int
            }
            long long v = neg ? -mag : mag;
            if (v < INT_MIN || v > INT_MAX) return std::nullopt;  // e.g. +2147483648
            return static_cast<int>(v);
        }
        int main() {
            const char* tests[] = {"  -42", "2147483647", "-2147483648", "2147483648", "12a", "", "-",
                                   "+5", "+", "-0", "0007", "2147483647 ", " ", "- 5", "--5", "+2147483648", "-2147483649",
                                   "99999999999999999999", "1e3", "00000000002147483648", "-00000000002147483648", "   7"};
            for (const char* t : tests) {
                auto r = parseInt(t);
                if (r) std::printf("'%s' -> %d\n", t, *r); else std::printf("'%s' -> nullopt\n", t);
            }
            std::string zeros(100000, '0');
            auto z = parseInt(zeros);
            std::printf("zeros -> %d\n", z ? *z : -1);                               // 0
            zeros.back() = '7';
            auto z7 = parseInt(zeros);
            std::printf("zeros7 -> %d\n", z7 ? *z7 : -1);                            // 7
            auto nines = parseInt(std::string(100000, '9'));
            std::printf("nines -> %s\n", nines ? "value" : "nullopt");               // nullopt
            auto spaces = parseInt(std::string(100000, ' ') + "5");
            std::printf("spaces -> %d\n", spaces ? *spaces : -1);                    // 5
        }`,
      dry: { head: ['input', 'mag progression', 'final check', 'result'], rows: [['"-2147483648"', '2 → 21 → … → 2147483648 (= LIMIT, ok)', '-2147483648 ≥ INT_MIN', '<span class="c-g">INT_MIN</span>'], ['"2147483648"', '… → 2147483648', '+2147483648 &gt; INT_MAX', '<span class="c-r">nullopt</span>'], ['"99999999999"', '… → 9999999999 &gt; LIMIT', 'stopped early', '<span class="c-r">nullopt</span>'], ['"12a"', '1 → 12 → junk', '—', '<span class="c-r">nullopt</span>']] },
      complexity: `<p>O(|s|) time, O(1) space; stops after at most ~11 significant digits once out of range.</p>`,
      followUps: ['Rewrite with no type wider than int (negative accumulation).', 'Compare with <code>std::from_chars</code> (C++17): how does it report overflow?', 'How would a fuzzer + UBSan have found the bug in the naive version?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'For <code>int a[1000][1000]</code>, which loop order is faster for summing all elements?', options: ['<code>for i { for j { s += a[i][j]; } }</code>', '<code>for j { for i { s += a[i][j]; } }</code>', 'Both are identical at -O2', 'Whichever loop has the larger trip count outside'], answer: 0, explain: 'C++ arrays are row-major: a[i][j] and a[i][j+1] are adjacent. Varying j innermost walks memory sequentially, using every byte of each 64-byte cache line.' },
    { q: 'What is <code>sizeof(struct { char a; int b; char c; })</code> on x86-64?', options: ['12', '6', '8', '9'], answer: 0, explain: 'a@0, 3 bytes padding, b@4, c@8, then tail padding to a multiple of 4 → 12. Reordering to {int, char, char} gives 8.' },
    { q: 'Why is <code>sizeof</code> of a struct always a multiple of its alignment?', options: ['So that every element of an array of the struct is correctly aligned', 'Because the CPU reads memory in 8-byte blocks', 'To leave room for a vtable pointer', 'It is not; that is only true with #pragma pack'], answer: 0, explain: 'arr[1] starts at sizeof(T) bytes after arr[0]; for it to be aligned, sizeof must be a multiple of alignof.' },
    { q: 'Two threads each increment their own <code>long</code> in a shared array <code>long c[2]</code>. Scaling is terrible. Most likely cause?', options: ['False sharing: both counters live on one cache line', 'The counters are not volatile', 'Branch mispredictions in the loop', 'The compiler inlined the increment'], answer: 0, explain: 'Coherence works per cache line; writes from two cores make the line bounce between them. Align each counter to its own line.' },
    { q: 'A loop <code>if (x &gt;= 128) sum += x;</code> runs 4× faster on sorted data than random data at -O1. Why?', options: ['Branch prediction: sorted data makes the branch outcome predictable', 'Sorted data is cached better', 'The compiler vectorises only sorted data', 'Sorted arrays use fewer instructions'], answer: 0, explain: 'Same data size and access pattern; the difference is mispredictions (~50% vs ~0%). At -O3 the compiler may emit branchless code and erase the gap.' },
    { q: 'What does the <code>inline</code> keyword guarantee in modern C++?', options: ['The function may be defined in multiple translation units (ODR exception)', 'The call will be replaced by the body', 'The function runs faster', 'The function cannot be recursive'], answer: 0, explain: 'Inlining is a compiler optimisation decision. The keyword is about linkage: identical definitions in many .cpp files (via a header) are allowed.' },
    { q: 'Which of these is <b>undefined</b> behaviour?', options: ['<code>int x = INT_MAX; x + 1;</code>', '<code>unsigned u = 0; u - 1;</code>', '<code>int a[2]; int* p = a + 2;</code> (not dereferenced)', '<code>-8 &gt;&gt; 1</code> in C++20'], answer: 0, explain: 'Signed overflow is UB. Unsigned wraps (defined), a one-past-the-end pointer is valid if not dereferenced, and C++20 defines right shift of negative values as arithmetic.' },
    { q: 'The compiler deleted your <code>if (p == nullptr) return;</code> check. What most likely happened?', options: ['p was dereferenced earlier on the same path, so the compiler assumed it is non-null', 'Optimisation bug in GCC', 'nullptr is not comparable to raw pointers', 'The check was inside a constexpr function'], answer: 0, explain: 'Dereferencing null is UB, so after *p the optimiser may treat p as non-null and remove later checks. Check before use.' },
    { q: 'Which sanitizer pair can NOT be enabled in the same build?', options: ['AddressSanitizer and ThreadSanitizer', 'AddressSanitizer and UndefinedBehaviorSanitizer', 'UndefinedBehaviorSanitizer and LeakSanitizer', 'AddressSanitizer and LeakSanitizer'], answer: 0, explain: 'ASan and TSan (and MSan) use incompatible shadow memory layouts. CI typically runs separate ASan+UBSan and TSan jobs.' },
    { q: 'In an ASan shadow byte, the value <code>05</code> means…', options: ['Only the first 5 bytes of this 8-byte granule are addressable', 'Five granules are poisoned', 'The memory was freed 5 times', 'The granule belongs to thread 5'], answer: 0, explain: 'Each shadow byte covers 8 bytes: 00 = all addressable, 01–07 = first k addressable (partial granule at the end of an allocation), negative values = redzones/freed.' },
    { q: 'A function has 20% self time. Even if you make it infinitely fast, the maximum overall speed-up is…', options: ['1.25×', '5×', '1.2×', '2×'], answer: 0, explain: 'Amdahl: 1 / (1 − 0.2) = 1.25×. The remaining 80% bounds the gain.' },
    { q: '<code>perf stat</code> shows IPC = 0.3 on a modern core and low branch-miss rate. Best next hypothesis?', options: ['The code is stalled on memory (cache/TLB misses)', 'The code is branch-bound', 'The code is running at maximum efficiency', 'The profiler overhead is too high'], answer: 0, explain: 'Modern cores can retire 4+ instructions per cycle. IPC far below 1 with few mispredictions points to backend/memory stalls: check cache-misses, use top-down analysis, consider layout and access-pattern fixes.' },
    { q: 'Your microbenchmark of a pure function reports 0.2 ns per call at -O2. The most likely explanation?', options: ['The result is unused, so the compiler removed (or hoisted) the calls', 'The CPU is extremely fast', 'steady_clock has insufficient resolution for -O2', 'The function was cached by the OS'], answer: 0, explain: 'Under the as-if rule unused pure computations can be deleted or folded. Consume results (checksum, DoNotOptimize) and avoid compile-time-constant inputs.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'Why can two loops with identical Big-O and instruction counts differ 10× in speed?', level: 'I', a: `<p>Because Big-O counts operations, not <b>memory traffic</b>. A cache miss to DRAM costs ~200–300 cycles while an L1 hit costs ~4. Data moves in 64-byte cache lines, so a sequential walk pays one miss per 16 ints (and the prefetcher hides most of those), while a strided or random walk may pay a miss per element. Classic examples: row vs column traversal of a row-major matrix, <code>vector</code> vs <code>list</code> traversal (pointer chasing), AoS vs SoA. A second source is branch mispredictions (~15–20 cycles each). I would confirm with <code>perf stat</code>: compare cache-misses, branch-misses and IPC between the two versions.</p>`, followUps: ['What are the three Cs of cache misses?', 'How does the hardware prefetcher decide what to fetch?', 'Why do power-of-two strides cause conflict misses?'] },
    { q: 'Explain struct padding. How do you compute sizeof by hand and minimise it?', level: 'B', a: `<p>Each type has an alignment (address must be a multiple of it). The compiler keeps members in declaration order, inserting padding so each member starts at a multiple of its alignment; the struct's alignment is the largest member alignment; and sizeof is rounded up to that so arrays stay aligned. By hand: walk with an offset, round up before each member, add its size, round the end up. Example <code>{char; double; char}</code> = 1 + 7 pad + 8 + 1 + 7 tail = 24. To minimise: order members by descending alignment (<code>{double; char; char}</code> = 16), right-size types (uint8_t for small enums, 32-bit indices instead of pointers), bit-fields for flags, and lock sizes in with <code>static_assert</code>. <code>#pragma pack</code> removes padding but makes access misaligned — only for wire formats.</p>`, followUps: ['What is sizeof an empty class and why?', 'What does [[no_unique_address]] do?', 'Why is memcmp on structs dangerous?'] },
    { q: 'What is false sharing and how do you detect and fix it?', level: 'A', a: `<p>False sharing is when threads write <b>different</b> variables that happen to share one cache line. Coherence protocols (MESI/MOESI) track ownership per line, so each write invalidates the line in other cores' caches, and it ping-pongs across the interconnect — each access costs ~50–100 ns instead of ~1 ns. Symptoms: multithreaded code that scales badly or gets slower with more threads, though there is no logical sharing. Detect with <code>perf c2c</code> (reports contended lines and the offsets each thread touches), or VTune's memory access analysis. Fix: pad/align hot per-thread data to the destructive interference size (<code>alignas(64)</code>, or <code>std::hardware_destructive_interference_size</code>; 128 on some Apple/Intel setups because of adjacent-line prefetch), or restructure so threads accumulate locally and combine at the end.</p>`, followUps: ['What is true sharing and how is it different?', 'Why might alignas(64) not be enough on some CPUs?'] },
    { q: 'Why is processing a sorted array faster than an unsorted one?', level: 'I', a: `<p>The classic loop <code>if (x &gt;= 128) sum += x;</code> contains a data-dependent branch. CPUs pipeline ~15–20 stages deep and must guess branch directions to keep fetching; a wrong guess flushes the pipeline (~15–20 cycles). On random data the branch is a coin flip, so about half the iterations mispredict. On sorted data the outcome is "not taken" for the first half and "taken" for the second, so the predictor is wrong only around the switch. Caveat for a complete answer: at <code>-O2/-O3</code> modern GCC/Clang often if-convert this to <code>cmov</code> or vectorise it with SIMD compares, which removes the branch and the difference — so I would check the assembly and <code>perf stat -e branch-misses</code>. Branchless rewrite: <code>sum += (x &gt;= 128) * x;</code>.</p>`, followUps: ['When is branchless code slower than a branch?', 'What do [[likely]] and [[unlikely]] actually change?', 'How do indirect branches (virtual calls) get predicted?'] },
    { q: 'What does the inline keyword mean, and how does the compiler decide what to inline?', level: 'I', a: `<p>The keyword's real meaning today is linkage: an <code>inline</code> function (or variable, since C++17) may be defined in multiple translation units as long as all definitions are identical — which is what lets you put definitions in headers. Member functions defined in a class body and templates are implicitly inline-able this way. Actual inlining is an optimisation the compiler decides with a cost model: callee size, call-site frequency (or PGO data), whether the body is visible (same TU, or LTO), recursion, and optimisation level. Benefits: removes call overhead and, more importantly, exposes the body to constant propagation, vectorisation and dead-code elimination. Costs: code growth and instruction-cache pressure. Override with <code>[[gnu::always_inline]]</code>/<code>[[gnu::noinline]]</code> or <code>__forceinline</code> sparingly, and mark cold paths <code>[[gnu::cold]]</code>.</p>`, followUps: ['Why is std::sort faster than qsort?', 'How does LTO change inlining?', 'Can a virtual function be inlined?'] },
    { q: 'Name the main optimisations -O2 performs and explain the as-if rule.', level: 'I', a: `<p>The as-if rule says the compiler may transform the program in any way as long as observable behaviour — I/O, <code>volatile</code> accesses, and synchronisation/atomic ordering — matches some valid execution of the abstract machine. Under it, -O2 does: inlining; constant propagation and folding; dead code and dead store elimination; common subexpression elimination; loop-invariant code motion; strength reduction; induction-variable simplification (whole loops replaced by a formula); scalar replacement of aggregates (structs into registers); jump threading and if-conversion; loop unrolling and (since GCC 12, cheaply) vectorisation; tail-call optimisation; devirtualisation when the dynamic type is known. Copy elision for prvalues is guaranteed by the language since C++17, independent of -O. Undefined behaviour feeds these passes as assumptions, which is why UB "changes meaning" with the optimisation level.</p>`, followUps: ['What extra does -O3 enable and why is it not always faster?', 'What does -ffast-math break?', 'What do PGO and BOLT add?'] },
    { q: 'What is undefined behaviour, and how is it different from unspecified and implementation-defined behaviour?', level: 'B', a: `<p><b>Implementation-defined</b>: the implementation must choose and document a behaviour (sizeof(long), whether char is signed). <b>Unspecified</b>: one of several allowed outcomes, not necessarily documented, but the program stays valid (order of evaluating function arguments). <b>Undefined</b>: the standard imposes no requirements on the whole program once it happens — signed overflow, out-of-bounds access, use-after-free, data races, null dereference, strict-aliasing violations, shifts ≥ width. Compilers assume UB never occurs and optimise on that basis, which can delete checks or affect code before the UB point. C++26 adds <b>erroneous behaviour</b> (e.g. reading an uninitialised local): a defined but wrong result that tools are encouraged to diagnose. UB exists for performance and portability across hardware.</p>`, followUps: ['Give an example where UB changes code that runs before the faulty line.', 'Why is unsigned overflow defined but signed is not?'] },
    { q: 'Spot the UB: <code>int mid = (lo + hi) / 2;</code>, <code>for (auto it = v.begin(); it != v.end(); ++it) if (*it == 0) v.push_back(1);</code>, <code>char* p = (char*)"abc"; p[0] = \'X\';</code>', level: 'I', a: `<p>(1) <code>lo + hi</code> can exceed INT_MAX for large indices → signed overflow. Use <code>lo + (hi - lo) / 2</code> or <code>std::midpoint</code>. (2) <code>push_back</code> may reallocate, invalidating <code>it</code> and <code>v.end()</code>; continuing the loop reads freed memory (use-after-free). Even without reallocation, <code>end()</code> changes and you may iterate forever. Fix: iterate by index over the original size, or collect additions and append after the loop. (3) String literals are <code>const char[N]</code> stored in read-only memory; casting away const and writing is UB (typically a segfault). Use <code>char p[] = "abc";</code> to get a modifiable copy. Tools: UBSan for (1), ASan for (2), the crash or <code>-Wwrite-strings</code>/<code>-Wcast-qual</code> for (3).</p>`, followUps: ['Which of these would ASan catch, which UBSan?', 'Is <code>a[i] = i++;</code> UB in C++17?'] },
    { q: 'What is the strict aliasing rule and how do you type-pun correctly?', level: 'A', a: `<p>An object may only be accessed through a glvalue of its own (possibly cv-qualified) type, a signed/unsigned variant, or <code>char</code>/<code>unsigned char</code>/<code>std::byte</code>. Because of this, the compiler may assume an <code>int*</code> and a <code>float*</code> never refer to the same memory, keep values in registers across stores, and reorder accesses. Code like <code>*(uint32_t*)&amp;f</code> violates it (and may be misaligned too). Correct ways: <code>std::bit_cast&lt;std::uint32_t&gt;(f)</code> (C++20, constexpr), <code>std::memcpy</code> into a local (optimised to a register move), or for buffers of bytes, <code>memcpy</code> into a properly typed object; C++23 adds <code>std::start_lifetime_as</code> for implicit-lifetime types. Unions for punning are fine in C but UB in C++ (GCC documents support as an extension). Some projects (Linux kernel) compile with <code>-fno-strict-aliasing</code>.</p>`, followUps: ['Why is char allowed to alias everything?', 'What does __restrict promise and why does it help vectorisation?'] },
    { q: 'How does AddressSanitizer work, and what can it not detect?', level: 'A', a: `<p>ASan instruments every load and store and replaces the allocator. Application memory is mapped to <b>shadow memory</b>: 1 shadow byte per 8-byte granule (<code>shadow = (addr &gt;&gt; 3) + offset</code>), encoding fully addressable (0), partially addressable (1–7 bytes), or poisoned (negative codes for heap/stack/global redzones, freed memory, use-after-scope). Allocations get redzones; frees are poisoned and quarantined so stale pointers still hit poison. The inserted check is a shift, a load and a compare, about 2× slowdown and 2–3× memory. It misses: accesses that jump over a redzone into another valid object, uninitialised reads (MSan), data races (TSan), leaks only at exit (LSan), bugs in uninstrumented code (prebuilt libraries), and intra-object overflows by default. Use it in tests and fuzzing, not production; for production consider GWP-ASan sampling or ARM MTE.</p>`, followUps: ['Why is ASan incompatible with TSan?', 'What is container-overflow detection?', 'How does HWASan differ?'] },
    { q: 'How would you set up sanitizers and related checks for a large C++ project?', level: 'E', a: `<p>Layers: (1) compiler warnings as errors (<code>-Wall -Wextra -Werror</code>, <code>-Wconversion</code> in new code), clang-tidy in CI. (2) A Debug/CI configuration with <code>-D_GLIBCXX_ASSERTIONS</code> or libc++ hardening for cheap bounds checks. (3) Separate CI jobs: ASan+UBSan (with <code>-fno-sanitize-recover=all</code>, <code>detect_leaks=1</code>), TSan for code with threads, MSan (Clang, with an instrumented libc++) if feasible. Build with <code>-O1 -g -fno-omit-frame-pointer</code>. (4) Fuzz targets for every parser/decoder with libFuzzer/AFL++ + sanitizers, running continuously (OSS-Fuzz/ClusterFuzzLite). (5) Production hardening: <code>-D_FORTIFY_SOURCE=3</code>, <code>-fstack-protector-strong</code>, <code>-ftrivial-auto-var-init=zero</code>, CFI/shadow stacks where available, hardened allocator, GWP-ASan sampling. (6) Suppression files reviewed like code, so warnings are not silently ignored.</p>`, followUps: ['What is the cost of each sanitizer?', 'How do you handle third-party libraries that are not instrumented?'] },
    { q: 'Walk me through profiling a slow C++ service.', level: 'E', a: `<p>1) Define the metric (throughput, p99 latency, CPU per request) and build a reproducible load test with production-like data. 2) Check if it is CPU-bound or waiting: CPU utilisation, off-CPU analysis, lock contention. 3) For CPU: <code>perf stat</code> for IPC, cache-misses, branch-misses (top-down: frontend/backend/bad speculation). 4) <code>perf record -g</code> with frame pointers or DWARF unwinding on an -O2 -g build, then a flame graph; look for wide plateaus (high self time) and surprising callers (allocations, locks, logging, string formatting). 5) Hypothesise a mechanism (cache-hostile layout, mispredicted branches, excessive allocation, algorithmic blow-up), make one change, re-measure with repeated runs and compare distributions. 6) Use Amdahl to prioritise. 7) Guard the win with a benchmark in CI and, ideally, continuous profiling in production to catch regressions.</p>`, followUps: ['What is skid in sampling profilers?', 'How do you profile lock contention?', 'How do flame graphs differ from icicle graphs?'] },
    { q: 'What are the common pitfalls of microbenchmarks, and how does Google Benchmark address them?', level: 'A', a: `<p>Pitfalls: the optimiser deletes or hoists work whose result is unused (DCE, constant folding, LICM); cold-start effects (page faults, cache and branch-predictor warm-up, CPU frequency ramp); unrealistic data (fits in L1, sorted, repeated keys); timer resolution and overhead; noise from turbo boost, thermal throttling, other processes, interrupts; measuring a debug build; and confusing latency with throughput. Google Benchmark runs each benchmark until timing is statistically stable, chooses iteration counts automatically, offers <code>DoNotOptimize</code> and <code>ClobberMemory</code> barriers, supports repetitions with mean/median/stddev, <code>PauseTiming</code> for setup, argument ranges and complexity fitting. Still on me: realistic inputs, pinning CPUs/disabling turbo for A/B comparisons, checking the assembly, and confirming wins at the application level.</p>`, followUps: ['How do you benchmark latency vs throughput of a function?', 'Why can code alignment change benchmark results by 5%?'] },
    { q: 'What is Amdahl\'s law and how do you use it to prioritise performance work?', level: 'B', a: `<p>If a fraction <b>p</b> of the runtime is sped up by a factor <b>s</b>, the overall speed-up is 1 / ((1 − p) + p / s). The untouched part bounds the gain: optimising 20% of the runtime can never give more than 1.25×. I use it with a profile: list hot spots by self (or inclusive, for a subsystem) time, estimate the achievable speed-up and effort for each, and compute overall gain per unit effort. For parallelism, p is the parallelisable fraction and s the number of cores — a 5% serial part caps the speed-up at 20× no matter how many cores. Gustafson's law is the complementary view: with bigger problems the parallel fraction often grows, so scaling looks better.</p>`, followUps: ['A function is 60% of runtime; you make it 3× faster. Overall speed-up?', 'Why can the profile fractions change after an optimisation?'] },
    { q: 'What changes in C++26 and modern toolchains around UB and safety?', level: 'E', a: `<p>C++26 introduces <b>erroneous behaviour</b>: reading an uninitialised automatic variable yields an implementation-defined value instead of UB, and implementations may diagnose it (opt out per variable with <code>[[indeterminate]]</code>). It adds a <b>hardened standard library</b> mode where precondition violations like out-of-range <code>operator[]</code> on vector/span/string_view or <code>optional::operator*</code> on empty trap instead of being UB, contracts (<code>pre</code>/<code>post</code>/<code>contract_assert</code>), saturating arithmetic (<code>std::add_sat</code> etc.), and makes trivial infinite loops well-defined. Toolchains already offer <code>-ftrivial-auto-var-init</code>, <code>-fhardened</code> (GCC 14), libc++ hardening modes, <code>_GLIBCXX_ASSERTIONS</code>, bounds-safety work in Clang, and MTE on ARM. None makes C++ memory-safe — lifetime and aliasing bugs remain — so sanitizers, fuzzing and review still matter.</p>`, followUps: ['How much does a hardened standard library cost in practice?', 'Why do safety guidelines from governments push memory-safe languages?'] }
  );

  registerModule({
    id: 'cpp12',
    title: 'Low-Level Performance & Undefined Behavior',
    intro: `<p>This is where C++ stops being "just a language" and becomes a conversation with the <b>hardware</b> and the <b>optimiser</b>. Two programs with the same Big-O can differ 10× because of <b>cache lines</b>, <b>struct padding</b> and <b>branch prediction</b>; a program that "works" can break at <code>-O2</code> because it relies on <b>undefined behaviour</b> the compiler was allowed to assume away.</p>
      <p>You will learn to predict memory traffic from a loop nest, compute <code>sizeof</code> and padding by hand, explain the famous sorted-array speed-up, read what <code>-O2</code> does to your code (inlining, folding, vectorisation), recite and spot the UB catalogue, use ASan/UBSan/TSan like a professional, and profile with <code>perf</code> and flame graphs instead of guessing. Every topic has a step-by-step visualiser: a cache simulator, a byte-level struct layout, a branch predictor, an optimiser pipeline, a UB stepper, ASan shadow memory and a sampling profiler.</p>
      <p>These questions dominate C++ interviews at trading firms, game studios, database, browser and GPU companies — and they are exactly the bugs and slowdowns AI-generated C++ tends to introduce.</p>`,
    goals: [
      'Predict which of two loop orders is faster and explain it with cache lines, prefetching and row-major layout',
      'Compute struct sizeof/offsets with padding by hand and reorder members to minimise memory',
      'Explain branch prediction, the sorted-array effect, and when branchless code helps or hurts',
      'Describe what inlining and -O2 optimisations do, write benchmarks the optimiser cannot delete, and read basic assembly output',
      'Recognise the 15 most common kinds of undefined behaviour in code review and fix them with UB-free idioms',
      'Use ASan, UBSan, TSan and MSan correctly, read their reports, and design a sanitizer + fuzzing CI setup',
      'Profile with perf, flame graphs and hardware counters, and prioritise work with Amdahl\'s law'
    ],
    prereqs: `C++ 3 (Pointers &amp; References), C++ 6 (Memory Management, RAII &amp; Smart Pointers), C++ 7 (STL Containers) and C++ 11 (Concurrency, for false sharing and data races). Basic comfort with binary/hex helps.`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
