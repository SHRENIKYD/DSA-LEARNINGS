(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared helpers for the visualizers ---------- */
function parseRefs(input, defN) {
  var parts = String(input).split(/[;\/|]/);
  var refs = parts[0].trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
  var hint = 'Type page numbers separated by spaces, then ";" and the frame count. Example: 7 0 1 2 0 3 0 4 2 3 ; 3';
  if (!refs.length || refs.some(function (x) { return isNaN(x) || x < 0 || x !== Math.floor(x); })) throw new Error(hint);
  if (refs.length > 20) throw new Error('Use at most 20 references');
  var n = (parts[1] !== undefined && parts[1].trim() !== '') ? Number(parts[1]) : defN;
  if (isNaN(n) || n < 1 || n > 6 || n !== Math.floor(n)) throw new Error('Frame count must be a whole number from 1 to 6. ' + hint);
  return { refs: refs, n: n };
}

// Simulate a page replacement algorithm; returns per-reference snapshots.
function simulate(refs, n, algo) {
  var fr = [], ld = [], la = [], rb = [], i, hand = 0, faults = 0, cols = [];
  for (i = 0; i < n; i++) { fr.push(null); ld.push(0); la.push(0); rb.push(0); }
  for (var t = 0; t < refs.length; t++) {
    var p = refs[t], k = fr.indexOf(p), fault = false, ev = null, why = '', swept = [];
    if (k >= 0) {
      la[k] = t; rb[k] = 1;
    } else {
      fault = true;
      k = fr.indexOf(null);
      if (k < 0) {
        if (algo === 'FIFO') {
          k = 0; for (i = 1; i < n; i++) if (ld[i] < ld[k]) k = i;
          why = 'it has been in memory the longest (first in, first out)';
        } else if (algo === 'LRU') {
          k = 0; for (i = 1; i < n; i++) if (la[i] < la[k]) k = i;
          why = 'it was used the longest time ago (least recently used)';
        } else if (algo === 'OPT') {
          var best = -1;
          for (i = 0; i < n; i++) {
            var d = Infinity;
            for (var j = t + 1; j < refs.length; j++) if (refs[j] === fr[i]) { d = j - t; break; }
            if (d > best) { best = d; k = i; }
          }
          why = best === Infinity ? 'it is never used again (perfect victim)' : 'its next use is the farthest in the future';
        } else {
          while (rb[hand] === 1) { rb[hand] = 0; swept.push(fr[hand]); hand = (hand + 1) % n; }
          k = hand; hand = (hand + 1) % n;
          why = 'the hand found it with reference bit 0' + (swept.length ? ' (it gave a second chance to page ' + swept.join(', ') + ' by clearing its bit)' : '');
        }
        ev = fr[k];
      }
      fr[k] = p; ld[k] = t; la[k] = t; rb[k] = 1;
      faults++;
    }
    cols.push({ p: p, fault: fault, slot: k, ev: ev, why: why, fr: fr.slice(), rb: rb.slice(), hand: hand, faults: faults });
  }
  return { cols: cols, faults: faults };
}

function gridPart(res, refs, n, t, label) {
  var rows = [], hl = {}, r, c, frow = [];
  for (r = 0; r < n; r++) {
    var row = [];
    for (c = 0; c < refs.length; c++) row.push(c <= t && res.cols[c].fr[r] !== null ? res.cols[c].fr[r] : '');
    rows.push(row);
  }
  for (c = 0; c < refs.length; c++) frow.push(c <= t ? (res.cols[c].fault ? 'F' : 'ok') : '');
  rows.push(frow);
  for (c = 0; c <= t; c++) { hl[res.cols[c].slot + ',' + c] = res.cols[c].fault ? 'bad' : 'ok'; hl[n + ',' + c] = res.cols[c].fault ? 'bad' : 'ok'; }
  var rh = []; for (r = 0; r < n; r++) rh.push('Frame ' + (r + 1)); rh.push('result');
  return { type: 'grid', label: label || 'Frames after each reference (red = page fault, green = hit)', rows: rows, rowHead: rh, colHead: refs.map(String), hl: hl };
}

// Full step-by-step visualizer for one algorithm.
function replFrames(input, algo, defN) {
  var q = parseRefs(input, defN), refs = q.refs, n = q.n, res = simulate(refs, n, algo), frames = [];
  frames.push({ narr: 'We have <b>' + n + '</b> empty frames and the reference string <b>' + refs.join(' ') + '</b>. Policy: <b>' + algo + '</b>. For each reference we ask: is the page already in a frame?', parts: [gridPart(res, refs, n, -1), { type: 'vars', vals: { frames: n, refs: refs.length, faults: 0 } }] });
  for (var t = 0; t < refs.length; t++) {
    var c = res.cols[t], msg;
    if (!c.fault) msg = 'Reference <b>' + c.p + '</b>: already in frame ' + (c.slot + 1) + ' → <span class="c-g">HIT</span>, no disk access.' + (algo === 'LRU' ? ' It becomes the most recently used page.' : '') + (algo === 'CLOCK' ? ' Its reference bit is set to 1.' : '') + (algo === 'FIFO' ? ' FIFO ignores hits: the arrival order does not change.' : '');
    else if (c.ev === null) msg = 'Reference <b>' + c.p + '</b>: not in memory → <span class="c-r">PAGE FAULT</span>. A free frame exists, so just load it into frame ' + (c.slot + 1) + '.';
    else msg = 'Reference <b>' + c.p + '</b>: not in memory → <span class="c-r">PAGE FAULT</span>. All frames are full, so evict page <b>' + c.ev + '</b> because ' + c.why + '. Load <b>' + c.p + '</b> into frame ' + (c.slot + 1) + '.';
    var parts = [gridPart(res, refs, n, t), { type: 'vars', vals: { ref: c.p, faults: c.faults, hits: t + 1 - c.faults }, hl: { faults: c.fault ? 'bad' : 'ok' } }];
    if (algo === 'CLOCK') {
      var hp = {}; hp[c.hand] = 'hand';
      parts.push({ type: 'array', label: 'Clock: page · reference bit (hand points at next victim candidate)', values: c.fr.map(function (x, i) { return x === null ? '-' : x + '·' + c.rb[i]; }), ptr: hp, hl: (function () { var h = {}; h[c.slot] = c.fault ? 'bad' : 'ok'; return h; })() });
    }
    frames.push({ narr: msg, parts: parts });
  }
  var last = res.cols[res.cols.length - 1];
  frames.push({ narr: 'Done. <b>' + last.faults + ' page faults</b> out of ' + refs.length + ' references (' + (refs.length - last.faults) + ' hits, hit ratio ' + Math.round(100 * (refs.length - last.faults) / refs.length) + '%).', parts: [gridPart(res, refs, n, refs.length - 1), { type: 'bars', label: 'faults so far per reference', values: res.cols.map(function (x) { return x.faults; }), idxLabels: refs.map(String) }] });
  return frames;
}

/* ================= TOPIC 1: addresses, MMU, contiguous allocation ================= */
topics.push({
  title: 'Logical vs Physical Addresses, the MMU & Contiguous Allocation',
  analogy: `<p>Think of an <b>apartment block</b>. Every tenant describes their home as "bedroom 1, kitchen 2, balcony 3" - numbers that start at 0 inside <i>their own</i> flat. The <b>building manager</b> (the MMU) has a sheet that says "Tenant A's flat starts at real door number 14000". When A says "kitchen", the manager adds 14000 and walks to the real door. A never needs to know where in the building they live, and the manager makes sure A can never walk into somebody else's flat.</p>`,
  explain: `<p>🟢 <b>The big idea.</b> A running program thinks memory is one clean block that starts at address 0. That fake view is the <b>logical (virtual) address space</b>. The real RAM chips use <b>physical addresses</b>. A small piece of hardware, the <b>MMU (Memory Management Unit)</b>, sits between the CPU and RAM and converts every logical address into a physical one - on every single memory access.</p>
<p>The simplest MMU has two registers: a <b>base (relocation) register</b> and a <b>limit register</b>. Physical = logical + base, but only if logical &lt; limit. If not, the hardware raises a trap (a "segmentation fault" for the process).</p>
${H.table(['Logical addr', 'limit = 3000?', 'base = 14000', 'Result'], [['0', 'ok', '14000', 'physical 14000'], ['2999', 'ok', '16999', 'physical 16999'], ['3000', '<span class="c-r">3000 ≥ 3000</span>', '-', '<span class="c-r">TRAP</span>']])}
<p>🔵 <b>Contiguous allocation</b> means each process gets <i>one unbroken block</i> of RAM. The OS keeps a list of free blocks called <b>holes</b>. For a new process it picks a hole with one of three policies:</p>
<ul><li><b>First fit</b> - first hole big enough (fast, simple).</li><li><b>Best fit</b> - smallest hole that is big enough (leaves tiny, useless leftovers).</li><li><b>Worst fit</b> - largest hole (leaves a big leftover, but wastes your biggest block).</li></ul>
<p><b>Fragmentation</b> = wasted memory. <b>Internal</b>: you hand out a block bigger than needed and the extra inside it is wasted (fixed partitions, or rounding up to pages). <b>External</b>: enough total free memory exists, but scattered in pieces so no single hole fits. The fix for external fragmentation is <b>compaction</b> (slide processes together - slow, needs relocation) or <b>paging</b> (the real fix, next topic).</p>
${H.arr([100, 500, 200, 300, 600], { label: 'free holes (KB)', hl: { 4: 'g' } })}
<p>Rule of thumb ("50-percent rule"): with first fit, for every N allocated blocks about 0.5N blocks are lost to fragmentation - roughly one third of memory can be unusable.</p>`,
  clues: ['"CPU generates 0..N, memory sees something else" → logical vs physical address, MMU', '"base and limit register", "relocation register" → simplest hardware protection', '"enough total free memory but process cannot be loaded" → external fragmentation', '"wasted space inside the allocated block / partition" → internal fragmentation', '"first fit / best fit / worst fit with these hole sizes" → trace a table, pick holes by hand', '"compaction" → the cost of fixing external fragmentation, needs dynamic relocation'],
  code: [
    { lang: 'cpp', title: 'Base + limit register check (what the MMU does in hardware)', code: `#include <iostream>
#include <optional>
#include <cstdint>
using namespace std;

// A tiny model of the simplest MMU: relocation (base) + limit register.
struct Mmu {
    uint32_t base;   // where the process starts in physical RAM
    uint32_t limit;  // size of the process's logical address space
    // Returns the physical address, or nullopt if the access must trap.
    optional<uint32_t> translate(uint32_t logical) const {
        if (logical >= limit) return nullopt;   // out of bounds -> trap
        return base + logical;                  // relocate
    }
};

int main() {
    Mmu m{14000, 3000};
    for (uint32_t la : {0u, 2999u, 3000u, 120u}) {
        auto pa = m.translate(la);
        if (pa) cout << "logical " << la << " -> physical " << *pa << "\\n";
        else    cout << "logical " << la << " -> TRAP (segmentation fault)\\n";
    }
}` },
    { lang: 'python', run: true, title: 'First / best / worst fit simulator (runnable)', code: `def allocate(holes, requests, policy):
    holes = holes[:]                      # work on a copy
    print(f"--- {policy} fit, holes={holes}")
    for r in requests:
        fits = [(h, i) for i, h in enumerate(holes) if h >= r]
        if not fits:
            print(f"  request {r}: FAILED (free total {sum(holes)}, biggest hole {max(holes)})")
            continue
        if policy == "first":
            h, i = min(fits, key=lambda x: x[1])   # lowest address
        elif policy == "best":
            h, i = min(fits)                       # smallest hole that fits
        else:
            h, i = max(fits)                       # largest hole
        holes[i] -= r                              # leftover stays as a smaller hole
        print(f"  request {r}: placed in hole {h}, leftover {holes[i]} -> {holes}")
    print(f"  external fragmentation now: free total = {sum(holes)}")

holes = [100, 500, 200, 300, 600]
reqs = [212, 417, 112, 426]
for p in ("first", "best", "worst"):
    allocate(holes, reqs, p)` }
  ],
  codeTitle: ['Base + limit check', 'Allocation policies'],
  viz: [
    {
      title: 'MMU relocation + limit check',
      input: '14000 3000 2500',
      inputLabel: 'base limit logicalAddress (try 14000 3000 3000)',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length < 3 || a.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter three non-negative numbers: base limit logicalAddress');
        var base = a[0], limit = a[1], la = a[2], ok = la < limit;
        var nodes = [{ id: 'CPU', label: 'CPU', x: 8, y: 25, shape: 'box' }, { id: 'LIM', label: 'limit check', x: 38, y: 25, shape: 'box' }, { id: 'ADD', label: 'add base', x: 66, y: 12, shape: 'box' }, { id: 'RAM', label: 'RAM', x: 92, y: 12, shape: 'box' }, { id: 'TRAP', label: 'TRAP to OS', x: 66, y: 42, shape: 'box' }];
        var edges = [['CPU', 'LIM', 'logical'], ['LIM', 'ADD', 'ok'], ['ADD', 'RAM', 'physical'], ['LIM', 'TRAP', 'bad']];
        var reg = { type: 'vars', label: 'MMU registers', vals: { base: base, limit: limit, logical: la } };
        var f = [];
        f.push({ narr: 'The CPU wants to read <b>logical address ' + la + '</b>. The MMU holds two registers: base = ' + base + ' and limit = ' + limit + '.', parts: [{ type: 'graph', height: 55, nodes: nodes, edges: edges, hl: { CPU: 'cur' } }, reg] });
        f.push({ narr: 'Step 1 - protection: is <b>' + la + ' &lt; ' + limit + '</b>? ' + (ok ? '<span class="c-g">Yes.</span>' : '<span class="c-r">No - it points past the end of this process.</span>'), parts: [{ type: 'graph', height: 55, nodes: nodes, edges: edges, hl: { LIM: ok ? 'ok' : 'bad' }, ehl: { 'CPU-LIM': 'cur' } }, reg] });
        if (ok) {
          f.push({ narr: 'Step 2 - relocation: physical = base + logical = ' + base + ' + ' + la + ' = <b>' + (base + la) + '</b>.', parts: [{ type: 'graph', height: 55, nodes: nodes, edges: edges, hl: { ADD: 'ok' }, ehl: { 'LIM-ADD': 'ok' } }, { type: 'vars', vals: { physical: base + la }, hl: { physical: 'ok' } }] });
          f.push({ narr: 'The memory bus is driven with address <b>' + (base + la) + '</b>. The program never learned where it really lives, so the OS can move it later by just changing <code>base</code>.', parts: [{ type: 'graph', height: 55, nodes: nodes, edges: edges, hl: { RAM: 'ok' }, ehl: { 'ADD-RAM': 'ok' } }, { type: 'bars', label: 'process region in RAM [base, base+limit)', values: [base, limit], idxLabels: ['base', 'limit'], hl: { 0: 'win', 1: 'sel' } }] });
        } else {
          f.push({ narr: 'The hardware raises a <b>trap</b>: control jumps into the OS, which usually kills the process with "segmentation fault". Other processes stay safe.', parts: [{ type: 'graph', height: 55, nodes: nodes, edges: edges, hl: { TRAP: 'bad' }, ehl: { 'LIM-TRAP': 'bad' } }, reg] });
          f.push({ narr: 'Why check <i>before</i> adding? So a buggy or malicious program can never form an address inside someone else\'s block. Valid range is 0 to ' + (limit - 1) + ' only.', parts: [{ type: 'array', label: 'valid logical range', values: ['0', '...', String(limit - 1)], hl: { 0: 'ok', 1: 'done', 2: 'ok' } }, reg] });
        }
        return f;
      }
    },
    {
      title: 'First / Best / Worst fit and fragmentation',
      input: 'best ; 100 500 200 300 600 ; 212 417 112 426',
      inputLabel: 'policy ; holes (KB) ; requests (KB)',
      gen: function (input) {
        var p = String(input).split(';');
        if (p.length < 3) throw new Error('Format: first|best|worst ; hole sizes ; request sizes');
        var pol = p[0].trim().toLowerCase();
        if (['first', 'best', 'worst'].indexOf(pol) < 0) throw new Error('Policy must be first, best or worst');
        var holes = p[1].trim().split(/[\s,]+/).map(Number), reqs = p[2].trim().split(/[\s,]+/).map(Number);
        if (holes.concat(reqs).some(function (x) { return isNaN(x) || x <= 0; }) || holes.length > 8 || reqs.length > 8) throw new Error('Use up to 8 positive numbers in each list');
        var f = [], i;
        f.push({ narr: 'Policy: <b>' + pol + ' fit</b>. Free holes (in address order) are shown as bars. Requests will arrive one by one: ' + reqs.join(', ') + '.', parts: [{ type: 'bars', label: 'free holes (KB)', values: holes.slice(), texts: holes.map(String) }, { type: 'vars', vals: { free_total: holes.reduce(function (a, b) { return a + b; }, 0) } }] });
        reqs.forEach(function (r) {
          var cand = -1;
          for (i = 0; i < holes.length; i++) {
            if (holes[i] < r) continue;
            if (cand < 0) cand = i;
            else if (pol === 'best' && holes[i] < holes[cand]) cand = i;
            else if (pol === 'worst' && holes[i] > holes[cand]) cand = i;
            if (pol === 'first') break;
          }
          var total = holes.reduce(function (a, b) { return a + b; }, 0);
          if (cand < 0) {
            f.push({ narr: 'Request <b>' + r + '</b>: no single hole is big enough. ' + (total >= r ? '<span class="c-r">External fragmentation!</span> Total free = ' + total + ' ≥ ' + r + ' but it is scattered in pieces.' : 'Not enough memory at all.'), parts: [{ type: 'bars', label: 'free holes (KB)', values: holes.slice(), texts: holes.map(String), hl: holes.reduce(function (o, h, j) { o[j] = 'bad'; return o; }, {}) }, { type: 'vars', vals: { request: r, free_total: total }, hl: { request: 'bad' } }] });
            return;
          }
          var before = holes.slice(), h = {}; h[cand] = 'cur';
          f.push({ narr: 'Request <b>' + r + '</b>: ' + pol + ' fit picks hole #' + (cand + 1) + ' (size ' + holes[cand] + ').', parts: [{ type: 'bars', label: 'free holes (KB)', values: before, texts: before.map(String), hl: h }, { type: 'vars', vals: { request: r } }] });
          holes[cand] -= r;
          var hh = {}; hh[cand] = 'ok';
          f.push({ narr: 'Allocated. The leftover <b>' + holes[cand] + '</b> stays as a smaller hole' + (holes[cand] === 0 ? ' (perfect fit).' : (holes[cand] < 100 ? ' - this sliver is easy to waste.' : '.')), parts: [{ type: 'bars', label: 'free holes (KB)', values: holes.slice(), texts: holes.map(String), hl: hh }, { type: 'vars', vals: { free_total: holes.reduce(function (a, b) { return a + b; }, 0) } }] });
        });
        f.push({ narr: 'End of the requests. Whatever small holes remain are external fragmentation waiting to bite the next big request. Try <b>first</b> and <b>worst</b> on the same input and compare which one fails.', parts: [{ type: 'bars', label: 'final holes (KB)', values: holes.slice(), texts: holes.map(String) }] });
        return f;
      }
    }
  ],
  examples: [
    { title: 'Relocation by hand', html: `<p>Process has base = 40000, limit = 8000. Logical 500 → physical 40500. Logical 8000 → ${H.c('r', 'trap')} (valid range is 0..7999). Moving the process to base 90000 changes <i>nothing</i> in the program.</p>` },
    { title: 'Internal fragmentation with fixed partitions', html: `<p>Memory is cut into fixed 100 KB partitions. A 60 KB process takes a whole partition: ${H.c('r', '40 KB wasted inside')}. Ten such processes waste 400 KB even though they could have been packed in 600 KB.</p>` },
    { title: 'Classic fit-policy exercise', html: `<p>Holes 100, 500, 200, 300, 600; requests 212, 417, 112, 426.</p>${H.table(['Policy', '212', '417', '112', '426'], [['First', '500→288', '600→183', '288→176', '<span class="c-r">FAIL</span>'], ['Best', '300→88', '500→83', '200→88', '600→174'], ['Worst', '600→388', '500→83', '388→276', '<span class="c-r">FAIL</span>']])}<p>Only best fit places all four here - but that is data-dependent, not a law.</p>` },
    { title: 'Compaction cost', html: `<p>Free holes 50 + 70 + 80 = 200 KB but a 150 KB process cannot fit. Compaction copies running processes (maybe 300 KB of memory moves) and updates their base registers. It works only because of <b>dynamic relocation</b>; with absolute addresses baked in at load time it is impossible.</p>` }
  ],
  deepDive: `<p>🟣 <b>Binding time.</b> Addresses can be bound to physical memory at <i>compile time</i> (absolute code, MS-DOS .COM), <i>load time</i> (relocatable code, loader patches addresses once) or <i>execution time</i> (MMU translates on every access - needed if a process can move or be swapped out). Modern OSes use execution-time binding for everything.</p>
<p><b>Why contiguous allocation died.</b> It forces the whole process to be resident and in one piece, wastes memory on stack/heap gaps, and needs compaction. It survives in tiny microcontrollers (MPU with base/limit-like regions) and as <i>physically contiguous</i> allocations the kernel still needs for DMA buffers (Linux CMA, huge pages).</p>
<p><b>Buddy allocator.</b> Linux hands out physical page blocks in powers of two (order 0 = 4 KB, order 1 = 8 KB ...). Splitting and merging "buddies" keeps external fragmentation low and coalescing O(log N). You can see fragmentation in <code>/proc/buddyinfo</code>.</p>
<p><b>Complexity of fits.</b> First fit with a linked free list is O(holes); best/worst need a scan or a sorted/tree structure (O(log n)). Simulations show first fit and best fit are better than worst fit in utilization, and first fit is usually faster.</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> GPU memory is the modern "contiguous allocation" problem: a 70B-parameter model needs huge tensors, and a CUDA allocator that hands out big blocks fragments quickly. Inference servers such as vLLM borrow the paging idea (PagedAttention) to avoid external fragmentation of the KV cache - a direct reuse of this module's concepts.</p>
<p><b>Use AI as a partner.</b> Ask: <code>Give me 5 hole/request sets where first fit fails but best fit succeeds, and 5 where it is the other way round - do not show the placements</code>, then trace them by hand and check against the assistant's answer.</p>
<p><b>Where AI goes wrong.</b> It often mixes up <i>internal</i> and <i>external</i> fragmentation, forgets that the leftover of a hole stays in the list, or applies "best fit" to the wrong (largest) hole. <b>You must still own</b> the definitions and the hand-trace; interviewers will ask you to do exactly that on a whiteboard.</p>`,
  problems: [{
    title: 'Fit Policies on a Hole List', level: 'Easy', tags: ['contiguous allocation', 'fragmentation'], companies: ['Oracle', 'Cisco'],
    statement: `<p>Free holes in address order: <b>100K, 500K, 200K, 300K, 600K</b>. Processes of size <b>212K, 417K, 112K, 426K</b> arrive in this order. Which processes are placed by first fit, best fit and worst fit? Which policy leaves the biggest free total scattered in unusable pieces?</p>`,
    constraints: `Leftover of a hole stays in the same position as a smaller hole. A process is rejected (not queued) if no hole fits.`,
    example: `${H.table(['Policy', 'Placed', 'Rejected'], [['First', '212, 417, 112', '426'], ['Best', 'all four', '-'], ['Worst', '212, 417, 112', '426']])}<p>The sample answer is shown fully in the dry-run table below.</p>`,
    brute: { why: `<p>A "brute force" idea: try every possible assignment of processes to holes (5<sup>4</sup> combinations) and pick one that fits everything. That finds the best <i>possible</i> packing but real OSes cannot know future requests, so they use a simple online policy (first/best/worst).</p>` },
    mcq: { q: 'Which policy scans the whole hole list every time?', options: ['First fit', 'Best fit and worst fit', 'None of them'], answer: 1, explain: 'First fit stops at the first big-enough hole. Best and worst must compare all holes to find the smallest or largest fit.' },
    hints: [`<p>Hint 1: keep a running list of holes; every allocation shrinks exactly one hole.</p>`, `<p>Hint 2: first = lowest address that fits; best = smallest hole ≥ request; worst = largest hole.</p>`, `<p>Hint 3: write the hole list after every request. Reject (do not skip ahead) when nothing fits, then continue with the next request.</p>`],
    solution: {
      approach: `<p>Process requests in order and update the hole list after each. <b>First fit:</b> 212 goes into 500 (leaves 288); 417 into 600 (leaves 183); 112 into 288 (leaves 176); 426 finds holes 100,176,200,300,183 - none ≥ 426, rejected even though total free is 959. <b>Best fit:</b> 212 into 300 (88); 417 into 500 (83); 112 into 200 (88); 426 into 600 (174) - all placed. <b>Worst fit:</b> 212 into 600 (388); 417 into 500 (83); 112 into 388 (276); 426 rejected.</p>`,
      dry: { head: ['Request', 'First fit hole → left', 'Best fit hole → left', 'Worst fit hole → left'], rows: [['212', '500 → 288', '300 → 88', '600 → 388'], ['417', '600 → 183', '500 → 83', '500 → 83'], ['112', '288 → 176', '200 → 88', '388 → 276'], ['426', '<span class="c-r">none ≥ 426</span>', '600 → 174', '<span class="c-r">none ≥ 426</span>']] },
      complexity: `<p>O(holes) per request for all three when implemented with a plain list.</p>`,
      followUps: ['What data structure makes best fit O(log n)?', 'How would compaction change the outcome for 426?']
    }
  }]
});

/* ================= TOPIC 2: paging & address translation ================= */
function parseNum(s) {
  s = String(s).trim().toLowerCase();
  var v = s.indexOf('0x') === 0 ? parseInt(s.slice(2), 16) : parseInt(s, 10);
  return v;
}
function widthFor(v) { return v < 65536 ? 16 : (v < 16777216 ? 24 : 32); }
function hex(v) { return '0x' + v.toString(16).toUpperCase(); }

topics.push({
  title: 'Paging: Page Number, Offset & the Page Table',
  analogy: `<p>Imagine a long book whose pages are torn out and stored in <b>random drawers</b> of a big cabinet. You want "page 3, line 40". You do not need the pages in order - you only need an <b>index card</b> that says "page 3 is in drawer 1". Go to drawer 1, look at line 40. The <b>page number</b> picks the drawer through the index card (the page table); the <b>offset</b> (line 40) is copied unchanged.</p>`,
  explain: `<p>🟢 <b>Paging in one sentence:</b> cut the logical address space into equal pieces called <b>pages</b>, cut physical RAM into equal pieces called <b>frames</b> (same size), and let any page live in any frame. No more "find one big hole" - external fragmentation disappears.</p>
<p>The page size is always a power of two, 2<sup>k</sup> (4 KB = 2<sup>12</sup> is the standard). So an address is just two fields glued together:</p>
${H.bits(0x3A7C, 16, { label: 'logical address 0x3A7C with 4 KB pages (k = 12)', hl: { 15: 'b', 14: 'b', 13: 'b', 12: 'b', 11: 'y', 10: 'y', 9: 'y', 8: 'y', 7: 'y', 6: 'y', 5: 'y', 4: 'y', 3: 'y', 2: 'y', 1: 'y', 0: 'y' } })}
<p>Top bits (blue) = <b>page number p</b>. Low <b>k</b> bits (yellow) = <b>offset d</b>. With bit tricks: <code>p = addr &gt;&gt; k</code> and <code>d = addr &amp; (2<sup>k</sup> - 1)</code>. Here p = 3, d = 0xA7C = 2684.</p>
<p>🔵 <b>Translation.</b> The page table is an array indexed by p. Entry <code>PT[p]</code> holds the <b>frame number f</b> (plus a valid bit, permission bits, dirty and accessed bits). The physical address is <code>(f &lt;&lt; k) | d</code> - the offset is copied, only the page number is replaced.</p>
${H.table(['page p', 'frame f', 'valid'], [['0', '5', '1'], ['1', '2', '1'], ['2', '7', '1'], ['<b>3</b>', '<b>1</b>', '1'], ['4', '-', '<span class="c-r">0</span>']])}
<p>VA 0x3A7C → p = 3 → f = 1 → PA = (1 &lt;&lt; 12) | 0xA7C = <b>0x1A7C</b> (6780 decimal). Every instruction fetch and every load/store does this lookup, which is why the TLB (later topic) is essential.</p>
<p><b>Internal fragmentation:</b> a process of 72,766 bytes with 4 KB pages needs 18 pages (17.77 rounded up) - the last page wastes 962 bytes. On average half a page per process. Bigger pages → more waste but smaller tables and fewer faults; smaller pages → the opposite.</p>`,
  clues: ['"page size 4 KB, 32-bit address - how many bits for page number/offset?" → 20 and 12', '"translate virtual address X" → divide by page size (or shift), look up frame, recombine', '"number of frames = physical memory / page size"', '"no external fragmentation, but some internal" → paging', '"same offset in virtual and physical address" → paging copies the offset', '"valid/invalid bit, protection bits in page table entry"'],
  code: [
    { lang: 'cpp', title: 'Address split with bit operations', code: `#include <iostream>
#include <vector>
#include <cstdint>
using namespace std;

int main() {
    const unsigned K = 12;                       // 4 KB pages -> 12 offset bits
    const uint32_t PAGE_SIZE = 1u << K;          // 4096
    const uint32_t OFFSET_MASK = PAGE_SIZE - 1;  // 0xFFF = low 12 bits set

    // Toy page table: index = page number, value = frame number (-1 = not mapped)
    vector<int> pt = {5, 2, 7, 1, -1, 3, 9, 4};

    uint32_t va = 0x3A7C;
    uint32_t page   = va >> K;                   // drop the offset bits
    uint32_t offset = va & OFFSET_MASK;          // keep only the offset bits

    cout << hex << showbase;
    cout << "VA " << va << " -> page " << page << ", offset " << offset << "\\n";
    if (page >= pt.size() || pt[page] < 0) {
        cout << "page fault / invalid access\\n";
        return 0;
    }
    uint32_t frame = pt[page];
    uint32_t pa = (frame << K) | offset;         // glue frame number + offset
    cout << "frame " << frame << " -> PA " << pa << "\\n";
    cout << dec << "check: " << frame * PAGE_SIZE + offset << " (same number)\\n";
}` },
    { lang: 'python', run: true, title: 'Address translation (runnable)', code: `def translate(va, page_table, k=12):
    """Split va into (page, offset), look up the frame, return the physical address."""
    page_size = 1 << k
    page = va >> k                      # same as va // page_size
    offset = va & (page_size - 1)       # same as va % page_size
    if page >= len(page_table) or page_table[page] is None:
        return None, page, offset       # invalid -> page fault / segfault
    frame = page_table[page]
    return (frame << k) | offset, page, offset

pt = [5, 2, 7, 1, None, 3, 9, 4]
for va in (0x3A7C, 0x0000, 0x1FFF, 0x4000, 10000, 0x9000):
    pa, p, d = translate(va, pt)
    if pa is None:
        print(f"VA {va:#07x} (page {p}, offset {d}) -> INVALID, page fault")
    else:
        print(f"VA {va:#07x} (page {p}, offset {d:#05x}) -> frame {pt[p]} -> PA {pa:#07x} ({pa})")

# page size trade-off
for k in (10, 12, 16):
    print(f"page size {1 << k:6d} B -> {2**32 >> k:8d} pages for a 32-bit space")` }
  ],
  codeTitle: ['Bit-op address split', 'Python translator'],
  viz: {
    title: 'Virtual address → page | offset → page table → physical address',
    input: '0x3A7C 12 | 5 2 7 1 - 3 9 4',
    inputLabel: 'address  offsetBits | frame for page 0,1,2... (use - for invalid)',
    gen: function (input) {
      var halves = String(input).split('|');
      if (halves.length < 2) throw new Error('Format: 0x3A7C 12 | 5 2 7 1 - 3 9 4');
      var h1 = halves[0].trim().split(/\s+/);
      var va = parseNum(h1[0]), k = parseInt(h1[1] || '12', 10);
      var pt = halves[1].trim().split(/\s+/).map(function (x) { return x === '-' ? null : parseInt(x, 10); });
      if (isNaN(va) || va < 0 || va > 4294967295 || isNaN(k) || k < 4 || k > 16 || pt.length > 16 || pt.some(function (x) { return x !== null && (isNaN(x) || x < 0 || x > 255); })) throw new Error('Use an address (decimal or 0x hex), offset bits 4..16, and up to 16 frame numbers 0..255 or -');
      var w = widthFor(va), size = Math.pow(2, k);
      if (k >= w) w = 24;
      var page = Math.floor(va / size), off = va % size, hl = {}, b;
      for (b = 0; b < w; b++) hl[b] = b < k ? 'cur' : 'win';
      var rows = pt.map(function (x, i) { return [i, x === null ? '-' : x, x === null ? 0 : 1]; });
      var f = [];
      f.push({ narr: 'The CPU issues the virtual address <b>' + hex(va) + '</b> (' + va + '). Page size is 2<sup>' + k + '</sup> = ' + size + ' bytes.', parts: [{ type: 'bits', label: 'virtual address', value: va, width: w, dec: va + ' = ' + hex(va) }] });
      f.push({ narr: 'The hardware splits it for free - no division needed. The low <b>' + k + '</b> bits (yellow) are the <b>offset</b>; everything above (blue) is the <b>page number</b>.', parts: [{ type: 'bits', label: 'page number (blue) | offset (yellow)', value: va, width: w, hl: hl, dec: 'page ' + page + ' | offset ' + off }] });
      f.push({ narr: 'In numbers: page = ' + va + ' &gt;&gt; ' + k + ' = <b>' + page + '</b>; offset = ' + va + ' &amp; ' + (size - 1) + ' = <b>' + off + '</b>.', parts: [{ type: 'vars', vals: { page_size: size, page: page, offset: off }, hl: { page: 'cur', offset: 'cur' } }] });
      var sel = {}; sel[page] = page < pt.length && pt[page] !== null ? 'sel' : 'bad';
      f.push({ narr: 'Use the page number as an <b>index</b> into the page table (one entry per page).' + (page >= pt.length ? ' <span class="c-r">Page ' + page + ' is beyond the end of the table → invalid access.</span>' : ''), parts: [{ type: 'table', label: 'page table of this process', columns: ['page', 'frame', 'valid'], rows: rows, hl: page < pt.length ? sel : {} }] });
      if (page >= pt.length) {
        f.push({ narr: '<span class="c-r">Trap:</span> the page number is outside the page table (the page-table length register catches this). The OS delivers a segmentation fault.', parts: [{ type: 'vars', vals: { page: page, table_entries: pt.length }, hl: { page: 'bad' } }] });
        f.push({ narr: 'Lesson: an address is only valid if its page number is inside the table AND the entry is marked valid.', parts: [{ type: 'text', html: 'Try address <code>0x3A7C 12</code> again, or lower the page number.' }] });
        return f;
      }
      if (pt[page] === null) {
        f.push({ narr: 'The entry has valid bit 0: the page is not in RAM (or not allocated at all). The MMU raises a <span class="c-r">page fault</span>; the OS decides whether to load it from disk (demand paging) or kill the process.', parts: [{ type: 'table', label: 'page table', columns: ['page', 'frame', 'valid'], rows: rows, hl: sel }, { type: 'vars', vals: { page: page, valid: 0 }, hl: { valid: 'bad' } }] });
        f.push({ narr: 'No physical address exists yet. After the OS fixes the fault (loads the page into some free frame and sets the entry), the same instruction is re-executed and now translates.', parts: [{ type: 'text', html: 'Instruction restart is why page faults must be <b>precise</b> in hardware.' }] });
        return f;
      }
      var fr = pt[page], pa = fr * size + off, pw = widthFor(pa), ph = {};
      for (b = 0; b < pw; b++) ph[b] = b < k ? 'cur' : 'win';
      f.push({ narr: 'Entry says <b>frame ' + fr + '</b>. Replace the page number with the frame number and keep the offset: PA = (' + fr + ' &lt;&lt; ' + k + ') | ' + off + '.', parts: [{ type: 'table', label: 'page table', columns: ['page', 'frame', 'valid'], rows: rows, hl: sel }, { type: 'vars', vals: { frame: fr, offset: off }, hl: { frame: 'ok' } }] });
      f.push({ narr: 'Physical address = <b>' + hex(pa) + '</b> (' + pa + '). The offset bits are identical to the virtual address; only the upper part changed from page ' + page + ' to frame ' + fr + '.', parts: [{ type: 'bits', label: 'physical address: frame number (blue) | offset (yellow)', value: pa, width: pw, hl: ph, dec: pa + ' = ' + hex(pa) }] });
      return f;
    }
  },
  examples: [
    { title: '32-bit address, 4 KB pages', html: `<p>Offset = 12 bits, page number = 32 - 12 = <b>20 bits</b> → 2<sup>20</sup> = 1,048,576 pages per process. With 1 GB RAM there are 2<sup>30</sup>/2<sup>12</sup> = <b>262,144 frames</b> (18 bits).</p>` },
    { title: 'Translate decimal 10000 (page table 5, 9, 3, 7, 2)', html: `<p>10000 ÷ 4096 = 2 remainder 1808. Page 2 → frame 3. PA = 3 × 4096 + 1808 = <b>14096</b>. Same answer in hex: 0x2710 → page 2, offset 0x710 → frame 3 → 0x3710.</p>` },
    { title: 'Internal fragmentation of a process', html: `<p>Process of 72,766 bytes, 4096-byte pages: 72766 / 4096 = 17.77 → <b>18 pages</b>. Wasted = 18 × 4096 - 72766 = 73728 - 72766 = <b>962 bytes</b>. (Worst case 4095 wasted, average ≈ 2048.)</p>` },
    { title: 'Why the offset is copied', html: `<p>Frames are the same size as pages, so byte #d of a page is byte #d of its frame. Only "which block" changes. That is why page size must be a power of two: the split is a free wire split instead of a slow division.</p>` }
  ],
  deepDive: `<p>🟣 <b>Page table entry (x86-64).</b> 64 bits: bit 0 Present, bit 1 Read/Write, bit 2 User/Supervisor, bit 5 Accessed (set by hardware on any use), bit 6 Dirty (set on write), bit 63 No-Execute, bits 12-51 the physical frame number. Present=0 entries are free for the OS to store a swap location or other metadata - the hardware ignores them.</p>
<p><b>Page-table base register.</b> Each process has its own page table; the CPU register CR3 (x86) / TTBR (ARM) points at its root. A context switch loads a new CR3 - which would flush the TLB unless entries are tagged with an address-space id (<b>PCID/ASID</b>).</p>
<p><b>Page size choice.</b> Small pages: less internal fragmentation, finer protection, but larger tables and more TLB misses. Large pages (2 MB, 1 GB "huge pages"): one TLB entry covers far more memory (databases, JVM, ML), but waste memory and make fragmentation of physical memory a real problem (Linux THP "compaction stalls"). A rough optimal size for tables+waste is √(2·s·e) for process size s and entry size e - which gives about 4 KB-ish for typical numbers.</p>
<p><b>Sharing and protection.</b> Two processes can map the same frame (shared libraries, fork copy-on-write); permission bits live in the PTE so read-only code pages are enforced per page. This also enables W^X (a page is writable or executable, not both).</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> Model weights (tens of GB) are loaded with <code>mmap</code> so the OS pages them in lazily and shares them between processes. Huge pages matter for GPU-feeding CPU memory: pinned (page-locked) host memory means the pages cannot be swapped, so DMA can read them directly - the same page/frame concepts, used for speed.</p>
<p><b>Use AI as a partner.</b> Paste a virtual address and a page table into the assistant and ask for <i>only</i> the page number and offset first (no physical address). Then compute the frame lookup yourself. Doing the split by hand 10 times builds the reflex interviewers test.</p>
<p><b>Where AI goes wrong.</b> It frequently divides by the wrong power (confusing KB and bytes), forgets that the page table is indexed from 0, or reports the frame number as the physical address. <b>You must still own</b> the habit of sanity-checking: offset &lt; page size, frame × page size + offset.</p>`,
  problems: [{
    title: 'Translate a Virtual Address (4 KB Pages)', level: 'Easy', tags: ['paging', 'address translation'], companies: ['Amazon', 'Qualcomm'],
    statement: `<p>A system uses <b>4 KB pages</b>. The page table of a process is (page → frame): 0→5, 1→9, 2→3, 3→7, 4→2. Translate virtual address <b>10000</b> (decimal) and virtual address <b>0x4ABC</b>. State which bits are page number and offset for a 16-bit address.</p>`,
    constraints: `All values are given; entries beyond page 4 do not exist.`,
    example: `<p>VA 10000 → page ${H.c('b', '2')}, offset ${H.c('y', '1808')} → frame 3 → PA ${H.c('g', '14096')}.</p>`,
    brute: { why: `<p>Walking a list of "segments of 4096 bytes" and subtracting 4096 until the address fits works, but it is O(page) arithmetic and not how hardware does it. A shift and mask do it in one gate delay.</p>` },
    mcq: { q: 'With 4 KB pages, which part of the address passes through unchanged?', options: ['The page number', 'The offset (low 12 bits)', 'The frame number'], answer: 1, explain: 'Frame and page are the same size, so byte d of the page is byte d of the frame.' },
    hints: [`<p>Hint 1: 4 KB = 2<sup>12</sup>, so 12 offset bits. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: page = address ÷ 4096 (integer), offset = remainder.</p>`, `<p>Hint 3: PA = frame × 4096 + offset. For 0x4ABC the page is 4 and the offset 0xABC.</p>`],
    solution: {
      approach: `<p>For 10000: page = ⌊10000 / 4096⌋ = 2, offset = 10000 - 8192 = 1808; PT[2] = 3 so PA = 3 × 4096 + 1808 = 14096. For 0x4ABC: page = 0x4ABC &gt;&gt; 12 = 4, offset = 0xABC = 2748; PT[4] = 2 so PA = 2 × 4096 + 2748 = 10940 = 0x2ABC. In a 16-bit address, bits 15-12 are the page number and bits 11-0 the offset.</p>`,
      dry: { head: ['Step', 'VA = 10000', 'VA = 0x4ABC'], rows: [['page number', '10000 &gt;&gt; 12 = 2', '0x4ABC &gt;&gt; 12 = 4'], ['offset', '10000 &amp; 0xFFF = 1808', '0xABC = 2748'], ['PT lookup', 'PT[2] = 3', 'PT[4] = 2'], ['PA = f×4096 + d', '12288 + 1808 = <b>14096</b>', '8192 + 2748 = <b>10940 (0x2ABC)</b>']] },
      complexity: `<p>O(1): one shift, one mask, one table read.</p>`,
      followUps: ['What happens for address 0x5000?', 'If the page size doubled to 8 KB, which bits move?']
    }
  }]
});

/* ================= TOPIC 3: page-table size & multi-level ================= */
topics.push({
  title: 'Page Table Size & Multi-Level Page Tables',
  analogy: `<p>A country's phone book listing <i>every possible</i> phone number, even unassigned ones, would be gigantic. Instead, publish an <b>area-code index</b> and print a town book <i>only for towns that actually exist</i>. Most of the country is empty, so most books are never printed. A multi-level page table is that index of town books.</p>`,
  explain: `<p>🟢 <b>Problem.</b> A single flat page table has one entry per possible page. 32-bit address, 4 KB pages, 4-byte entries: pages = 2<sup>32</sup>/2<sup>12</sup> = 2<sup>20</sup> (one million), table = 2<sup>20</sup> × 4 B = <b>4 MB per process</b>. With 100 processes, 400 MB just for tables. For 48-bit addresses, 8-byte entries: 2<sup>36</sup> × 8 B = <b>512 GB</b> per process - absurd.</p>
${H.table(['Address bits', 'Page size', 'Entries', 'Entry size', 'Flat table'], [['32', '4 KB', '2<sup>20</sup>', '4 B', '<b>4 MB</b>'], ['48', '4 KB', '2<sup>36</sup>', '8 B', '<b>512 GB</b>'], ['32', '64 KB', '2<sup>16</sup>', '4 B', '256 KB'], ['64', '4 KB', '2<sup>52</sup>', '8 B', '32 PB']])}
<p>🔵 <b>Fix: page the page table.</b> Split the page number into several indexes. Two-level on 32-bit with 4 KB pages and 4 B entries: one page holds 4096/4 = 1024 entries, so each index is 10 bits: <b>10 | 10 | 12</b>.</p>
${H.bits(0x00403ABC, 32, { label: '32-bit VA: outer index (10) | inner index (10) | offset (12)', hl: { 31: 'p', 30: 'p', 29: 'p', 28: 'p', 27: 'p', 26: 'p', 25: 'p', 24: 'p', 23: 'p', 22: 'p', 21: 'b', 20: 'b', 19: 'b', 18: 'b', 17: 'b', 16: 'b', 15: 'b', 14: 'b', 13: 'b', 12: 'b', 11: 'y', 10: 'y', 9: 'y', 8: 'y', 7: 'y', 6: 'y', 5: 'y', 4: 'y', 3: 'y', 2: 'y', 1: 'y', 0: 'y' } })}
<p>Walk: CR3 → outer table[idx1] → inner table → inner[idx2] → frame → add offset. Unused regions (the huge gap between heap and stack) have a <b>null outer entry</b>, so their inner tables never exist. A small process needs 1 outer + a few inner tables = a few 4 KB pages (like 16 KB) instead of 4 MB.</p>
<p><b>Cost:</b> a miss now needs one extra memory access per level (2-level = 3 accesses for one data access). The TLB hides this.</p>
<p><b>x86-64</b> uses 4 levels, 9 bits each (512 entries × 8 B = 4 KB per table): <code>9|9|9|9|12</code> = 48 bits; newer CPUs have a 5th level (57 bits). Alternatives: <b>hashed page tables</b> (for sparse 64-bit spaces) and <b>inverted page tables</b> (one entry per physical frame - size ∝ RAM, not address space, but lookup needs hashing).</p>`,
  clues: ['"size of the page table for a 32-bit/48-bit address space" → entries × entry size', '"page table must fit in one page" → bits per level = log₂(page size / entry size)', '"how many levels are needed" → ceil(page-number bits / bits per level)', '"sparse address space, most of it unused" → multi-level saves memory', '"extra memory accesses on a TLB miss" → levels + 1', '"inverted page table / hashed page table" → table size proportional to RAM'],
  code: [
    { lang: 'cpp', title: 'Four-level index extraction (x86-64 style, 48-bit)', code: `#include <iostream>
#include <cstdint>
#include <cmath>
using namespace std;

int main() {
    // 48-bit virtual address: 9|9|9|9|12  (PML4 | PDPT | PD | PT | offset)
    uint64_t va = 0x00007F12'3456'7ABCULL;
    unsigned offset = va & 0xFFF;
    unsigned pt   = (va >> 12) & 0x1FF;   // 0x1FF = 9 bits set
    unsigned pd   = (va >> 21) & 0x1FF;
    unsigned pdpt = (va >> 30) & 0x1FF;
    unsigned pml4 = (va >> 39) & 0x1FF;
    cout << "PML4=" << pml4 << " PDPT=" << pdpt << " PD=" << pd
         << " PT=" << pt << " offset=" << offset << "\\n";

    // Page table size arithmetic
    auto size = [](int vaBits, int pageBits, int pteBytes) {
        double entries = pow(2.0, vaBits - pageBits);   // one per page
        return entries * pteBytes;                      // bytes
    };
    cout << "32-bit, 4KB, 4B PTE : " << size(32, 12, 4) / (1 << 20) << " MB\\n";
    cout << "48-bit, 4KB, 8B PTE : " << size(48, 12, 8) / pow(2, 30) << " GB\\n";
    // Entries per table = pageSize / pteSize = 4096 / 8 = 512 -> 9 bits per level
    cout << "bits per level      : " << log2(4096.0 / 8) << "\\n";
}` },
    { lang: 'python', run: true, title: 'Page table size and levels calculator (runnable)', code: `import math

def analyse(va_bits, page_size, pte_bytes):
    offset_bits = int(math.log2(page_size))
    vpn_bits = va_bits - offset_bits
    entries = 2 ** vpn_bits
    flat = entries * pte_bytes
    per_table = page_size // pte_bytes              # entries that fit in ONE page
    bits_per_level = int(math.log2(per_table))
    levels = math.ceil(vpn_bits / bits_per_level)
    print(f"VA {va_bits}-bit, page {page_size} B, PTE {pte_bytes} B")
    print(f"  offset bits={offset_bits}, page-number bits={vpn_bits}, entries=2^{vpn_bits}")
    print(f"  flat table = {flat:,} bytes = {flat / 2**20:,.1f} MB")
    print(f"  one table holds {per_table} entries -> {bits_per_level} bits/level -> {levels} levels")
    print(f"  memory accesses on TLB miss = {levels + 1}")

analyse(32, 4096, 4)
analyse(48, 4096, 8)
analyse(64, 4096, 8)

# sparse process: uses 12 MB contiguous from address 0 (32-bit, 2-level 10|10|12)
pages = 12 * 2**20 // 4096                           # 3072 pages
inner = math.ceil(pages / 1024)                      # each inner table maps 1024 pages = 4 MB
print(f"2-level: 1 outer + {inner} inner = {(1 + inner) * 4} KB  vs flat 4096 KB")` }
  ],
  codeTitle: ['4-level index extraction', 'Size calculator'],
  viz: [
    {
      title: 'How big is the page table? (and how many levels?)',
      input: '48 4096 8',
      inputLabel: 'virtual-address bits, page size (bytes), PTE size (bytes)',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length < 3 || a.some(isNaN)) throw new Error('Enter: vaBits pageSize pteBytes  e.g. 32 4096 4');
        var va = a[0], ps = a[1], pte = a[2];
        var lg = function (x) { return Math.log(x) / Math.LN2; };
        if (va < 16 || va > 57 || ps < 256 || ps > 1048576 || lg(ps) !== Math.floor(lg(ps)) || pte < 1 || pte > 16 || ps % pte !== 0 || lg(ps / pte) !== Math.floor(lg(ps / pte))) throw new Error('Need 16 ≤ vaBits ≤ 57, page size a power of two (256..1048576), PTE size dividing the page size into a power of two (e.g. 4 or 8)');
        var ob = Math.round(lg(ps)), vpn = va - ob, entries = Math.pow(2, vpn), flat = entries * pte;
        var per = ps / pte, bpl = Math.round(lg(per)), levels = Math.ceil(vpn / bpl);
        var fmt = function (b) { var u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'], i = 0; while (b >= 1024 && i < 5) { b /= 1024; i++; } return (Math.round(b * 10) / 10) + ' ' + u[i]; };
        var f = [];
        f.push({ narr: 'We have a <b>' + va + '-bit</b> virtual address, <b>' + ps + '-byte</b> pages and <b>' + pte + '-byte</b> page-table entries (PTEs).', parts: [{ type: 'vars', vals: { va_bits: va, page_size: ps, pte_bytes: pte } }] });
        f.push({ narr: 'Offset needs log₂(' + ps + ') = <b>' + ob + '</b> bits. The rest is the page number: ' + va + ' - ' + ob + ' = <b>' + vpn + '</b> bits.', parts: [{ type: 'bits', label: 'address layout (blue = page number, yellow = offset)', value: Math.pow(2, Math.min(va, 31)) - 1, width: Math.min(va, 32), showDec: false, hl: (function () { var h = {}; for (var b = 0; b < Math.min(va, 32); b++) h[b] = b < ob ? 'cur' : 'win'; return h; })() }, { type: 'vars', vals: { offset_bits: ob, page_number_bits: vpn } }] });
        f.push({ narr: 'One entry per page: 2<sup>' + vpn + '</sup> = <b>' + entries.toLocaleString('en-US') + '</b> entries.', parts: [{ type: 'vars', vals: { entries: entries.toLocaleString('en-US') } }] });
        f.push({ narr: 'Flat (single-level) table = entries × ' + pte + ' B = <b>' + fmt(flat) + '</b> per process. ' + (flat > 1048576 * 64 ? '<span class="c-r">Impossible to keep per process.</span>' : (flat > 1048576 ? '<span class="c-y">Heavy, and it must be contiguous.</span>' : 'Acceptable.')), parts: [{ type: 'bars', label: 'log₂(bytes) of the flat table vs one page', values: [Math.round(lg(flat)), ob], idxLabels: ['flat table', 'one page'], texts: [fmt(flat), fmt(ps)], hl: { 0: 'bad', 1: 'ok' } }] });
        f.push({ narr: 'Idea: make every table exactly <b>one page</b> big. A page holds ' + ps + ' / ' + pte + ' = <b>' + per + '</b> entries, so each level can eat log₂(' + per + ') = <b>' + bpl + '</b> bits of the page number.', parts: [{ type: 'vars', vals: { entries_per_table: per, bits_per_level: bpl }, hl: { bits_per_level: 'ok' } }] });
        var split = [], left = vpn; while (left > 0) { var t = Math.min(bpl, left); split.push(t); left -= t; }
        f.push({ narr: 'Levels needed = ⌈' + vpn + ' / ' + bpl + '⌉ = <b>' + levels + '</b>. Split of the page number: <b>' + split.join(' | ') + '</b> then offset ' + ob + '.', parts: [{ type: 'array', label: 'index bits per level (outermost first) then offset', values: split.concat([ob]), hl: (function () { var h = {}; h[split.length] = 'cur'; return h; })() }] });
        f.push({ narr: 'Price: a TLB miss needs <b>' + levels + '</b> table reads + <b>1</b> data read = ' + (levels + 1) + ' memory accesses. Benefit: tables for unused regions are never created, so a small process may need only ' + levels + ' to a few dozen table pages.', parts: [{ type: 'text', html: 'x86-64 real life: <code>48 4096 8</code> → 4 levels; ARM64 with 64 KB pages: <code>48 65536 8</code> → 3 levels.' }] });
        return f;
      }
    },
    {
      title: 'Two-level page table walk (10 | 10 | 12)',
      input: '0x00403ABC',
      inputLabel: '32-bit virtual address',
      gen: function (input) {
        var va = parseNum(input);
        if (isNaN(va) || va < 0 || va > 4294967295) throw new Error('Enter a 32-bit address like 0x00403ABC');
        var i1 = Math.floor(va / 4194304), i2 = Math.floor(va / 4096) % 1024, off = va % 4096;
        var l2frame = 0x100 + i1, dframe = (i1 * 1024 + i2) % 0x3000 + 0x200, pa = dframe * 4096 + off;
        var hl = {}, b;
        for (b = 0; b < 32; b++) hl[b] = b >= 22 ? 'sel' : (b >= 12 ? 'win' : 'cur');
        var nodes = [{ id: 'CR3', label: 'CR3 (root)', x: 10, y: 25, shape: 'box' }, { id: 'L1', label: 'outer table [' + i1 + ']', x: 36, y: 25, shape: 'box' }, { id: 'L2', label: 'inner table [' + i2 + ']', x: 64, y: 25, shape: 'box' }, { id: 'FR', label: 'frame ' + dframe, x: 90, y: 25, shape: 'box' }];
        var edges = [['CR3', 'L1'], ['L1', 'L2', 'frame ' + l2frame], ['L2', 'FR', 'frame ' + dframe]];
        var f = [];
        f.push({ narr: 'Virtual address <b>' + hex(va) + '</b> split as outer (purple, 10 bits) | inner (blue, 10 bits) | offset (yellow, 12 bits).', parts: [{ type: 'bits', value: va, width: 32, hl: hl, dec: 'outer ' + i1 + ' | inner ' + i2 + ' | offset ' + off }, { type: 'graph', height: 45, nodes: nodes, edges: edges }] });
        f.push({ narr: 'Memory access #1: the CPU reads <b>outer table entry ' + i1 + '</b> (address = CR3 + ' + i1 + ' × 4). The entry points to the inner table, stored in frame ' + l2frame + ' (demo contents).', parts: [{ type: 'graph', height: 45, nodes: nodes, edges: edges, hl: { L1: 'cur' }, ehl: { 'CR3-L1': 'ok' } }, { type: 'vars', vals: { outer_index: i1, inner_table_frame: l2frame } }] });
        f.push({ narr: 'Memory access #2: read <b>inner table entry ' + i2 + '</b> inside that frame. It holds the frame of the data page: <b>' + dframe + '</b>.', parts: [{ type: 'graph', height: 45, nodes: nodes, edges: edges, hl: { L2: 'cur' }, ehl: { 'L1-L2': 'ok' } }, { type: 'vars', vals: { inner_index: i2, data_frame: dframe } }] });
        f.push({ narr: 'Memory access #3 is the real data: physical address = ' + dframe + ' × 4096 + ' + off + ' = <b>' + pa + '</b> (' + hex(pa) + '). Three accesses for one load - that is why a TLB is essential.', parts: [{ type: 'graph', height: 45, nodes: nodes, edges: edges, hl: { FR: 'ok' }, ehl: { 'L2-FR': 'ok' } }, { type: 'bits', label: 'physical address', value: pa, width: widthFor(pa), dec: pa }] });
        f.push({ narr: 'Space saving: if outer entry ' + i1 + ' had been <b>null</b>, the walk would stop at access #1 with a fault and <b>no inner table would exist</b> for that 4 MB region of the address space.', parts: [{ type: 'table', label: 'who pays for what', columns: ['structure', 'size'], rows: [['flat table', '4 MB always'], ['outer table', '4 KB always'], ['each inner table', '4 KB only if its 4 MB region is used']], hl: { 1: 'sel' } }] });
        return f;
      }
    }
  ],
  examples: [
    { title: '32-bit flat table', html: `<p>2<sup>20</sup> entries × 4 B = <b>4 MB</b>. It needs 4 MB / 4 KB = 1024 contiguous frames - hard to find, so we page the table itself.</p>` },
    { title: '48-bit address, 8-byte entries', html: `<p>Page number = 48 - 12 = 36 bits; entries per table = 4096/8 = 512 (9 bits) → 36 / 9 = <b>4 levels</b>. A TLB miss costs 4 table reads + 1 data read = 5 accesses.</p>` },
    { title: 'Memory used by a small process (2-level 10|10|12)', html: `<p>Uses 12 MB starting at address 0 → 3072 pages. Each inner table maps 1024 pages (4 MB), so 3 inner tables + 1 outer = 4 tables × 4 KB = <b>16 KB</b> of page tables instead of 4 MB.</p>` },
    { title: 'Inverted page table', html: `<p>Physical memory 4 GB, 4 KB frames → 2<sup>20</sup> frames. One entry (pid, page) per frame, ~8 B each = 8 MB for the <i>whole system</i>, independent of the number of processes. Lookup uses a hash of (pid, page) - slower, and shared pages are awkward.</p>` }
  ],
  deepDive: `<p>🟣 <b>Hardware page walkers.</b> The MMU contains a page-table walker that does these reads without OS help. Caches inside the CPU (paging-structure caches / "PDE cache") remember the upper-level entries so a miss usually costs 1-2 memory reads, not 4. With virtualization the walk becomes <b>two-dimensional</b> (guest virtual → guest physical → host physical): up to 24 memory references without caching; nested paging with EPT/NPT and big pages reduce that.</p>
<p><b>Why the outer table is also one page.</b> If every table equals the page size the OS allocates tables with the normal frame allocator - no big contiguous chunk and tables themselves can be swapped. This is the design rule behind the 10|10|12 and 9|9|9|9|12 splits.</p>
<p><b>Huge pages shortcut the walk.</b> A PTE at the PD level with the "PS" bit set maps 2 MB directly (skips the last level); at the PDPT level it maps 1 GB. Fewer levels, fewer TLB entries - the reason databases and JVMs enable them.</p>
<p><b>Security.</b> Meltdown (2018) showed that kernel mappings living in the same page tables as user ones could be read speculatively; the fix, KPTI, uses separate page tables for user and kernel mode - costing extra TLB flushes, which is why PCIDs became important. Page tables are also a classic rowhammer target (flip a bit in a PTE).</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> Large-model workloads touch hundreds of GB with random access (embedding tables, KV caches). TLB reach (entries × page size) becomes the bottleneck, so frameworks ask for huge pages and GPUs have their own multi-level page tables (UVM, unified memory) with on-demand migration between CPU and GPU memory - the same radix-tree idea.</p>
<p><b>Use AI as a partner.</b> Ask: <code>Give me 6 page-table-size questions with different address widths, page sizes and entry sizes - only the questions and final numbers in a hidden list I can check later</code>. Compute them first, then compare.</p>
<p><b>Where AI goes wrong.</b> It mixes up bits and bytes, forgets that entries per table = page size ÷ entry size, and rounds levels the wrong way. <b>You must still own</b> the formula chain: offset bits → page-number bits → entries → bytes → levels.</p>`,
  problems: [{
    title: 'Page Table Size and Levels', level: 'Medium', tags: ['page table', 'multi-level'], companies: ['Google', 'Intel'],
    statement: `<p>A machine has a <b>32-bit</b> virtual address, <b>4 KB</b> pages and <b>4-byte</b> PTEs. (a) Size of a single-level page table? (b) Using a 2-level table where every table fits in one page, how are the 32 bits split? (c) A process uses exactly <b>12 MB</b> starting at virtual address 0. How much memory do its page tables need? (d) How many memory accesses does one load take on a TLB miss?</p>`,
    constraints: `Assume the outer table always exists and an inner table exists only if at least one of its pages is used.`,
    example: `<p>(a) ${H.c('g', '4 MB')} (b) ${H.c('b', '10 | 10 | 12')} (c) ${H.c('g', '16 KB')} (d) ${H.c('y', '3')}.</p>`,
    brute: { why: `<p>Use the flat 4 MB table for every process. 200 processes → 800 MB of tables, mostly pointing at empty regions - most of that memory is wasted.</p>` },
    mcq: { q: 'Why is each table sized to exactly one page?', options: ['So the OS can allocate tables with ordinary single-frame allocation', 'Because the CPU cannot read larger tables', 'To avoid using the TLB'], answer: 0, explain: 'No contiguous multi-frame chunk is needed, and tables themselves become pageable.' },
    hints: [`<p>Hint 1: page-number bits = 32 - 12 = 20. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: entries per table = 4096 / 4 = 1024 = 2<sup>10</sup>, so each level eats 10 bits.</p>`, `<p>Hint 3: 12 MB / 4 KB = 3072 pages; one inner table maps 1024 pages; count tables, multiply by 4 KB.</p>`],
    solution: {
      approach: `<p>(a) 2<sup>20</sup> pages × 4 B = 4 MB. (b) A page holds 1024 PTEs so each level indexes 10 bits: outer 10, inner 10, offset 12. (c) 12 MB = 3072 pages = 3 inner tables of 1024 entries, plus 1 outer table: 4 tables × 4 KB = 16 KB. (d) On a TLB miss: read outer entry, read inner entry, read the data - 3 accesses. With a TLB hit it is 1 access.</p>`,
      dry: { head: ['Quantity', 'Computation', 'Result'], rows: [['pages', '2^32 / 2^12', '2^20 = 1,048,576'], ['flat table', '2^20 × 4 B', '4 MB'], ['entries per table', '4096 / 4', '1024 (10 bits)'], ['pages used', '12 MB / 4 KB', '3072'], ['inner tables', '3072 / 1024', '3'], ['total', '(1 + 3) × 4 KB', '16 KB'], ['accesses on miss', '2 tables + 1 data', '3']] },
      complexity: `<p>Constant arithmetic; memory for tables grows with the used address ranges, not with the full address space.</p>`,
      followUps: ['How does the answer change for a 48-bit space with 8-byte PTEs?', 'What if the process is spread over 3 regions 1 GB apart?']
    }
  }]
});

/* ================= TOPIC 4: TLB & effective access time ================= */
topics.push({
  title: 'TLB and Effective Access Time (EAT)',
  analogy: `<p>You call the same ten people all day. Do you open the thick phone book every time? No - you keep a <b>sticky note on your monitor</b> with those ten numbers. Looking at the sticky note takes one second (a <b>TLB hit</b>). Only for a stranger do you dig through the phone book (a <b>TLB miss</b>, a full page-table walk), and then you write the number on the sticky note for next time.</p>`,
  explain: `<p>🟢 <b>The problem.</b> With paging, every memory access needs an extra access to read the page table first. With a one-level table, a load costs <b>2</b> memory accesses; with 4 levels, <b>5</b>. That would make every program several times slower.</p>
<p><b>The fix: the TLB (Translation Lookaside Buffer).</b> A tiny, very fast hardware cache (typically 32-1536 entries) that stores recent <code>page number → frame number</code> pairs. The MMU checks the TLB <i>in parallel</i> for all entries first:</p>
<ul><li><b>TLB hit</b>: frame found immediately → 1 memory access for the data.</li><li><b>TLB miss</b>: walk the page table in RAM (extra accesses), then load the translation into the TLB (evicting an old entry).</li></ul>
<p>🔵 <b>Effective Access Time</b> is the average cost of one memory reference. Let <i>h</i> = hit ratio, <i>t</i> = TLB lookup time, <i>m</i> = one memory access, and a single-level page table:</p>
${H.table(['Case', 'Time', 'Probability'], [['TLB hit', 't + m', 'h'], ['TLB miss', 't + m (read PTE) + m (read data) = t + 2m', '1 - h']])}
<p><b>EAT = h × (t + m) + (1 - h) × (t + 2m)</b>. Example t = 10 ns, m = 100 ns, h = 90%: 0.9 × 110 + 0.1 × 210 = 99 + 21 = <b>120 ns</b> (a 20% slowdown). At h = 99%: 0.99 × 110 + 0.01 × 210 = <b>111 ns</b>. For a two-level table the miss costs t + 3m; for n levels t + (n+1)m.</p>
${H.table(['Hit ratio h', 'EAT (t=10, m=100, 1-level)'], [['0%', '210 ns'], ['50%', '160 ns'], ['80%', '130 ns'], ['90%', '120 ns'], ['99%', '111 ns']])}
<p><b>Careful with assumptions!</b> Some textbooks ignore the TLB lookup time (t = 0) because it is tiny: EAT = h·m + (1-h)·2m = 110 ns for h = 0.9. Always state which one you use; an interviewer cares about the reasoning. Why does a tiny cache work? <b>Locality</b>: programs reuse the same few pages over and over, so hit ratios are 98-99.9% in practice.</p>
<p><b>TLB reach</b> = entries × page size. 64 entries × 4 KB = 256 KB. Bigger pages (2 MB) give 128 MB reach with the same 64 entries.</p>`,
  clues: ['"effective (average) memory access time" → EAT formula with hit ratio', '"TLB hit ratio 80%/90%/98%" → weighted average of two paths', '"two-level / three-level page table" → miss costs levels + 1 memory accesses', '"TLB access time 20 ns, memory 100 ns" → include t on both paths', '"what hit ratio gives at most 10% slowdown?" → solve inequality for h', '"context switch flushes the TLB" → ASID/PCID tags avoid flushes'],
  code: [
    { lang: 'python', run: true, title: 'EAT calculator (runnable)', code: `def eat(h, t_tlb, mem, levels=1, include_tlb=True):
    """Effective access time with a TLB.
    h        : TLB hit ratio (0..1)
    t_tlb    : TLB lookup time (ns)
    mem      : one main-memory access (ns)
    levels   : page-table levels walked on a miss
    """
    t = t_tlb if include_tlb else 0
    hit = t + mem                          # frame from TLB, then data
    miss = t + levels * mem + mem          # walk page table, then data
    return h * hit + (1 - h) * miss

print("h     EAT(1-level)  EAT(2-level)  EAT(4-level)")
for h in (0.0, 0.5, 0.8, 0.9, 0.95, 0.99, 1.0):
    print(f"{h:4.2f}  {eat(h, 10, 100, 1):10.1f}  {eat(h, 10, 100, 2):12.1f}  {eat(h, 10, 100, 4):12.1f}")

print()
print("Textbook version (TLB time ignored): h=0.9 ->", eat(0.9, 0, 100, 1, include_tlb=False))

# What hit ratio keeps the slowdown under 10%?  EAT <= 1.1 * mem
mem, t = 100, 10
for h in (0.90, 0.95, 0.99):
    print(f"h={h}: EAT={eat(h, t, mem):.1f}  slowdown={eat(h, t, mem) / mem - 1:.1%}")

# Including page faults: EAT = (1-p)*ma + p*fault_time
ma, fault_ns = 200, 8_000_000                # 8 ms to service a fault
for p in (0.0, 1e-6, 1e-4, 1e-3):
    print(f"fault rate p={p:g}: EAT = {(1 - p) * ma + p * fault_ns:,.1f} ns")
print("max p for <10% slowdown:", 20 / (fault_ns - ma))` },
    { lang: 'cpp', title: 'A tiny software TLB (direct-mapped) in front of a page-table walk', code: `#include <iostream>
#include <vector>
#include <cstdint>
using namespace std;

// Direct-mapped TLB: index = page % size, tag = page. Real TLBs are set-associative.
struct Tlb {
    struct Entry { bool valid = false; uint32_t page = 0, frame = 0; };
    vector<Entry> e;
    explicit Tlb(size_t n) : e(n) {}
    bool lookup(uint32_t page, uint32_t& frame) const {
        const Entry& x = e[page % e.size()];
        if (x.valid && x.page == page) { frame = x.frame; return true; }
        return false;
    }
    void insert(uint32_t page, uint32_t frame) { e[page % e.size()] = {true, page, frame}; }
};

int main() {
    vector<uint32_t> pageTable = {5, 2, 7, 1, 9, 3, 8, 4};   // page -> frame
    Tlb tlb(4);
    int hits = 0, misses = 0;
    for (uint32_t p : {1u, 2u, 1u, 1u, 5u, 1u, 2u, 6u, 2u, 1u}) {
        uint32_t f;
        if (tlb.lookup(p, f)) { ++hits; cout << "page " << p << " HIT  frame " << f << "\\n"; }
        else { f = pageTable[p]; tlb.insert(p, f); ++misses; cout << "page " << p << " miss -> walk -> frame " << f << "\\n"; }
    }
    cout << "hit ratio = " << double(hits) / (hits + misses) << "\\n";
}` }
  ],
  codeTitle: ['EAT calculator', 'Software TLB'],
  viz: [
    {
      title: 'TLB hit vs miss path and EAT',
      input: '0.9 10 100 1',
      inputLabel: 'hit ratio, TLB time (ns), memory time (ns), page-table levels',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length < 4 || a.some(isNaN) || a[0] < 0 || a[0] > 1 || a[1] < 0 || a[2] <= 0 || a[3] < 1 || a[3] > 5) throw new Error('Enter: hitRatio(0..1) tlbNs memNs levels(1..5), e.g. 0.9 10 100 1');
        var h = a[0], t = a[1], m = a[2], L = a[3];
        var hitT = t + m, missT = t + L * m + m, eat = h * hitT + (1 - h) * missT;
        var nodes = [{ id: 'CPU', label: 'CPU', x: 8, y: 22, shape: 'box' }, { id: 'TLB', label: 'TLB', x: 36, y: 22, shape: 'box' }, { id: 'PT', label: 'page table (RAM)', x: 66, y: 6, shape: 'box', w: 24 }, { id: 'RAM', label: 'data in RAM', x: 88, y: 38, shape: 'box' }];
        var edges = [['CPU', 'TLB', 'page #'], ['TLB', 'RAM', 'hit: frame'], ['TLB', 'PT', 'miss'], ['PT', 'RAM', 'frame']];
        var g = function (hl, ehl) { return { type: 'graph', height: 48, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; };
        var f = [];
        f.push({ narr: 'Every memory reference starts with the CPU sending the <b>page number</b> to the TLB. Inputs: hit ratio h = <b>' + h + '</b>, TLB = ' + t + ' ns, memory = ' + m + ' ns, ' + L + ' page-table level(s).', parts: [g({ CPU: 'cur' }), { type: 'vars', vals: { h: h, tlb_ns: t, mem_ns: m, levels: L } }] });
        f.push({ narr: '<span class="c-g">TLB HIT</span> (probability ' + h + '): the frame number comes straight out of the TLB. Cost = TLB lookup + one memory access = ' + t + ' + ' + m + ' = <b>' + hitT + ' ns</b>.', parts: [g({ TLB: 'ok', RAM: 'ok' }, { 'CPU-TLB': 'ok', 'TLB-RAM': 'ok' }), { type: 'vars', vals: { hit_cost: hitT }, hl: { hit_cost: 'ok' } }] });
        f.push({ narr: '<span class="c-r">TLB MISS</span> (probability ' + Math.round((1 - h) * 1000) / 1000 + '): walk the page table: ' + L + ' memory read(s) for the entries, then 1 for the data. Cost = ' + t + ' + ' + L + '×' + m + ' + ' + m + ' = <b>' + missT + ' ns</b>.', parts: [g({ TLB: 'bad', PT: 'cur', RAM: 'ok' }, { 'CPU-TLB': 'cur', 'TLB-PT': 'bad', 'PT-RAM': 'ok' }), { type: 'vars', vals: { miss_cost: missT }, hl: { miss_cost: 'bad' } }] });
        f.push({ narr: 'The walk result is also <b>inserted into the TLB</b> (evicting an old entry), so the next access to this page hits.', parts: [g({ TLB: 'sel' }, { 'PT-RAM': 'ok' })] });
        f.push({ narr: 'Weighted average: EAT = ' + h + ' × ' + hitT + ' + ' + Math.round((1 - h) * 1000) / 1000 + ' × ' + missT + ' = <b>' + (Math.round(eat * 100) / 100) + ' ns</b>. Slowdown vs a perfect single access (' + m + ' ns): <b>' + Math.round((eat / m - 1) * 1000) / 10 + '%</b>.', parts: [{ type: 'vars', vals: { EAT_ns: Math.round(eat * 100) / 100, slowdown: Math.round((eat / m - 1) * 1000) / 10 + ' %' }, hl: { EAT_ns: 'sel' } }] });
        var hs = [0, 0.5, 0.8, 0.9, 0.95, 0.99, 1], vals = hs.map(function (x) { return Math.round((x * hitT + (1 - x) * missT) * 10) / 10; }), hlb = {};
        hs.forEach(function (x, i) { if (Math.abs(x - h) < 1e-9) hlb[i] = 'sel'; });
        f.push({ narr: 'How much does the hit ratio matter? Here is EAT for several hit ratios. Going from 90% to 99% saves more than going from 0% to 50% would suggest - because misses are so expensive.', parts: [{ type: 'bars', label: 'EAT (ns) for hit ratio 0, .5, .8, .9, .95, .99, 1', values: vals, idxLabels: hs.map(String), texts: vals.map(String), hl: hlb }] });
        return f;
      }
    },
    {
      title: 'A small TLB at work (LRU replacement)',
      input: '1 2 3 1 2 4 1 2 5 1 ; 3',
      inputLabel: 'page numbers ; TLB entries',
      gen: function (input) {
        var q = parseRefs(input, 3), res = simulate(q.refs, q.n, 'LRU'), f = [], rows = [];
        f.push({ narr: 'A TLB with <b>' + q.n + '</b> entries and LRU replacement. Each reference is a TLB hit or miss.', parts: [{ type: 'table', label: 'TLB lookups', columns: ['#', 'page', 'result', 'TLB contents'], rows: [['-', '-', '-', '-']] }] });
        res.cols.forEach(function (c, i) {
          rows.push([i + 1, c.p, c.fault ? 'MISS' : 'hit', c.fr.filter(function (x) { return x !== null; }).join(' ')]);
          var hl = {}; hl[i] = c.fault ? 'bad' : 'ok';
          f.push({ narr: 'Page <b>' + c.p + '</b>: ' + (c.fault ? '<span class="c-r">miss</span> - walk the page table' + (c.ev !== null ? ', evict the least recently used translation (page ' + c.ev + ')' : '') + ', then fill the TLB.' : '<span class="c-g">hit</span> - translation already cached.'), parts: [{ type: 'table', label: 'TLB lookups', columns: ['#', 'page', 'result', 'TLB contents'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
        });
        f.push({ narr: 'Result: <b>' + (q.refs.length - res.faults) + ' hits</b> and <b>' + res.faults + ' misses</b>, hit ratio ' + Math.round(100 * (q.refs.length - res.faults) / q.refs.length) + '%. Real programs reuse pages much more, so real hit ratios exceed 99%.', parts: [{ type: 'vars', vals: { hits: q.refs.length - res.faults, misses: res.faults } }] });
        return f;
      }
    }
  ],
  examples: [
    { title: 'Classic EAT (TLB time included)', html: `<p>t = 20 ns, m = 100 ns, h = 80%, one-level table: hit = 120, miss = 20 + 100 + 100 = 220. EAT = 0.8 × 120 + 0.2 × 220 = 96 + 44 = <b>140 ns</b>.</p>` },
    { title: 'Two-level table', html: `<p>Same numbers but two-level: miss = 20 + 200 + 100 = 320. EAT = 96 + 0.2 × 320 = 96 + 64 = <b>160 ns</b>. The deeper the table, the more the TLB matters.</p>` },
    { title: 'Required hit ratio', html: `<p>t = 10, m = 100, single level. For EAT ≤ 1.1 × m = 110: 110 + (1-h) × 100 ≤ 110 is only reachable with h = 100%. With the stricter textbook model (t = 0): EAT = 100 + (1-h) × 100 ≤ 110 → <b>h ≥ 90%</b>. This is why the assumption must be stated.</p>` },
    { title: 'TLB reach', html: `<p>64 entries × 4 KB = 256 KB. A program looping over a 10 MB array thrashes the TLB (every 4 KB page is a new entry). With 2 MB huge pages the same 64 entries cover 128 MB.</p>` }
  ],
  deepDive: `<p>🟣 <b>Structure.</b> A TLB is a CAM (content-addressable memory) or set-associative array, tagged with (ASID/PCID, virtual page number) and storing frame, permission bits, global bit, dirty bit. Modern CPUs have a small L1 data TLB (~64 entries), an L1 instruction TLB, and a unified L2 TLB (1-2K entries). Hit time is under 1 cycle (overlapped with the L1 cache index).</p>
<p><b>Who handles misses?</b> x86 and ARM use a <b>hardware page walker</b> (fixed page-table format). MIPS and some SPARC cores use <b>software-managed</b> TLBs: a miss traps to the OS, which fills the TLB itself (page-table format is then the OS's choice, but the handler must itself avoid TLB misses).</p>
<p><b>Context switches.</b> Without address-space tags, switching process must flush the whole TLB (costly: the next process starts cold). With ASID/PCID the entries of several processes coexist. <b>TLB shootdown</b>: when one core changes a mapping (munmap, mprotect), it sends IPIs to the other cores to invalidate stale entries - one reason multi-threaded <code>munmap</code> storms scale badly.</p>
<p><b>Virtually indexed caches.</b> L1 caches are often VIPT: the index uses offset bits (identical in VA and PA) so cache lookup and TLB lookup run in parallel - this limits L1 size to ways × page size, which is why L1 is typically 32 KB 8-way with 4 KB pages.</p>
<p><b>Spectre-era costs.</b> Kernel page-table isolation adds a CR3 switch on each syscall; PCIDs make that bearable.</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> Tensor workloads stride through memory far beyond TLB reach, so GPU and CPU libraries tile loops to reuse pages ("TLB blocking"), use huge pages, and sometimes pin memory. Profilers (<code>perf stat -e dTLB-load-misses</code>) show TLB misses as the hidden cost in embedding lookups and sparse kernels.</p>
<p><b>Use AI as a partner.</b> Paste a loop and ask: <i>"Estimate the TLB misses per iteration for 4 KB vs 2 MB pages and explain your assumptions."</i> Then verify with <code>perf</code>. Also ask it to generate EAT variations (different levels, with/without TLB time) as practice.</p>
<p><b>Where AI goes wrong.</b> It silently picks the textbook model (TLB time = 0) or forgets the data access after the walk, giving off-by-one-memory-access answers. <b>You must still own</b> stating the model out loud before calculating: "I assume the TLB lookup takes t on both paths."</p>`,
  problems: [{
    title: 'Effective Access Time with a Two-Level Table', level: 'Medium', tags: ['TLB', 'EAT'], companies: ['Microsoft', 'VMware'],
    statement: `<p>TLB lookup time is <b>20 ns</b>, a memory access is <b>100 ns</b>, the TLB hit ratio is <b>80%</b> and the page table has <b>two levels</b>. (a) Compute the EAT. (b) What hit ratio is needed so that EAT ≤ 130 ns? (c) By what percentage is the EAT (a) slower than an ideal 100 ns access?</p>`,
    constraints: `Include the TLB lookup time on both the hit and the miss path.`,
    example: `<p>Hit path 20 + 100 = ${H.c('g', '120')}; miss path 20 + 2×100 + 100 = ${H.c('r', '320')}; EAT = 0.8×120 + 0.2×320 = ${H.c('b', '160 ns')}.</p>`,
    brute: { why: `<p>Assume every access misses (worst case 320 ns). Safe but 2× too pessimistic: it ignores locality and the TLB's whole purpose.</p>` },
    mcq: { q: 'Raising the TLB hit ratio from 90% to 99% mostly helps because…', options: ['TLB lookups get faster', 'fewer expensive page-table walks happen', 'pages get smaller'], answer: 1, explain: 'The miss path costs several memory accesses; each avoided miss saves that whole walk.' },
    hints: [`<p>Hint 1: two probabilities, two costs. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: miss cost = TLB time + (levels) memory reads for entries + 1 memory read for data.</p>`, `<p>Hint 3: for (b) write EAT = 120 + (1 - h) × 200 and solve ≤ 130.</p>`],
    solution: {
      approach: `<p>(a) Hit = 20 + 100 = 120 ns. Miss = 20 + 2 × 100 + 100 = 320 ns. EAT = 0.8 × 120 + 0.2 × 320 = 96 + 64 = 160 ns. (b) EAT = h × 120 + (1 - h) × 320 = 320 - 200h ≤ 130 → h ≥ 0.95, i.e. at least 95%. (c) 160 / 100 = 1.6, so 60% slower than the ideal.</p>`,
      dry: { head: ['Path', 'Cost', 'Probability', 'Contribution'], rows: [['TLB hit', '20 + 100 = 120', '0.8', '96'], ['TLB miss', '20 + 200 + 100 = 320', '0.2', '64'], ['<b>EAT</b>', '', '', '<b>160 ns</b>'], ['need EAT ≤ 130', '320 - 200h ≤ 130', 'h ≥ 0.95', '95%']] },
      complexity: `<p>Constant-time arithmetic.</p>`,
      followUps: ['What if the TLB lookup is overlapped with the first memory access (t = 0)?', 'How does adding a 5th page-table level change EAT at 99% hits?']
    }
  }]
});

/* ================= TOPIC 5: segmentation ================= */
topics.push({
  title: 'Segmentation (and Segmentation with Paging)',
  analogy: `<p>Paging cuts a book into equal pages without caring what is on them - a sentence may be sliced in half. <b>Segmentation cuts by meaning</b>: Preface, Chapter 1, Chapter 2, Index - different lengths, each a natural unit. You point to a spot as <b>"Chapter 3, line 20"</b>: (segment, offset). The librarian's sheet lists where each chapter starts and how long it is.</p>`,
  explain: `<p>🟢 <b>Idea.</b> A program is a set of logical units: <b>code, global data, heap, stack, libraries</b>. Segmentation gives each unit its own <i>variable-sized</i> block of memory. The programmer/compiler sees addresses as <b>(segment number s, offset d)</b>.</p>
<p>🔵 <b>Segment table.</b> One row per segment holding a <b>base</b> (where the segment starts in physical memory) and a <b>limit</b> (its length). Translation:</p>
<ol><li>Read row <code>s</code> of the segment table (trap if s is beyond the table).</li><li>If <code>d ≥ limit[s]</code> → trap (segmentation fault).</li><li>Otherwise <code>physical = base[s] + d</code>.</li></ol>
${H.table(['Seg', 'Base', 'Limit', 'Meaning'], [['0', '1400', '1000', 'code'], ['1', '6300', '400', 'data'], ['2', '4300', '400', 'stack'], ['3', '3200', '1100', 'heap'], ['4', '4700', '1000', 'library']])}
<p>Examples: (2, 53) → 4300 + 53 = <b>4353</b>. (3, 852) → 3200 + 852 = <b>4052</b>. (0, 1222) → 1222 ≥ 1000 → <span class="c-r">trap</span>.</p>
<p><b>Good:</b> natural protection and sharing (mark the code segment read-only/execute-only; share the library segment between processes), segments can grow independently (stack, heap). <b>Bad:</b> segments are different sizes so we are back to <b>external fragmentation</b> and compaction.</p>
${H.table(['', 'Paging', 'Segmentation'], [['Unit size', 'fixed (4 KB)', 'variable'], ['Visible to programmer?', 'no', 'yes (logical units)'], ['Fragmentation', 'internal only', 'external'], ['Address', 'one number split in two', '(segment, offset) pair'], ['Table entry', 'frame number', 'base + limit'], ['Sharing / protection', 'per page, coarse-grained meaning', 'per segment, natural']])}
<p><b>Segmentation with paging</b> (Multics, Intel IA-32): the address first goes through segmentation to a <i>linear address</i>, which is then split by paging. Each segment has its own page table, so segments are non-contiguous in RAM and external fragmentation vanishes. Modern 64-bit systems use a <b>flat model</b>: segment bases are 0, limits ignored, and only paging does the real work (FS/GS registers remain for thread-local storage).</p>`,
  clues: ['"logical address is (segment number, offset)"', '"base and limit for each segment" → segment table lookup', '"segment table: translate (s, d)" → d &lt; limit check, then base + d', '"variable-size units, external fragmentation" → segmentation', '"code segment is read-only and shared between processes"', '"segmentation with paging" → each segment has a page table'],
  code: [
    { lang: 'cpp', title: 'Segment table lookup', code: `#include <iostream>
#include <vector>
#include <optional>
using namespace std;

struct Segment { unsigned base, limit; };

// Translate (segment, offset). nullopt means the hardware would trap.
optional<unsigned> translate(const vector<Segment>& table, unsigned s, unsigned d) {
    if (s >= table.size()) return nullopt;     // no such segment
    if (d >= table[s].limit) return nullopt;   // offset beyond segment length
    return table[s].base + d;
}

int main() {
    vector<Segment> t = {{1400, 1000}, {6300, 400}, {4300, 400}, {3200, 1100}, {4700, 1000}};
    for (auto [s, d] : vector<pair<unsigned, unsigned>>{{2, 53}, {3, 852}, {0, 1222}, {5, 0}, {1, 399}}) {
        auto pa = translate(t, s, d);
        cout << "(" << s << ", " << d << ") -> ";
        if (pa) cout << *pa << "\\n"; else cout << "TRAP\\n";
    }
}` }
  ],
  codeTitle: ['Segment table lookup'],
  viz: {
    title: 'Segment table translation',
    input: '3 852',
    inputLabel: 'segment offset  (optional: ; base:limit base:limit ...)',
    gen: function (input) {
      var parts = String(input).split(';'), pr = parts[0].trim().split(/\s+/).map(Number);
      if (pr.length < 2 || pr.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter: segment offset  e.g. 3 852');
      var tab = [[1400, 1000], [6300, 400], [4300, 400], [3200, 1100], [4700, 1000]];
      if (parts[1] && parts[1].trim()) {
        tab = parts[1].trim().split(/\s+/).map(function (x) { var y = x.split(':').map(Number); return y; });
        if (tab.length > 8 || tab.some(function (y) { return y.length !== 2 || isNaN(y[0]) || isNaN(y[1]) || y[0] < 0 || y[1] <= 0; })) throw new Error('Table format: base:limit base:limit (max 8 segments)');
      }
      var s = pr[0], d = pr[1], rows = tab.map(function (r, i) { return [i, r[0], r[1]]; }), f = [];
      var cols = ['segment', 'base', 'limit'];
      f.push({ narr: 'Logical address is a pair <b>(s = ' + s + ', d = ' + d + ')</b>: segment number and offset inside that segment.', parts: [{ type: 'vars', vals: { segment: s, offset: d } }, { type: 'table', label: 'segment table', columns: cols, rows: rows }] });
      if (s >= tab.length) {
        f.push({ narr: '<span class="c-r">Segment ' + s + ' does not exist</span> (table has ' + tab.length + ' rows) → trap.', parts: [{ type: 'table', label: 'segment table', columns: cols, rows: rows }] });
        f.push({ narr: 'The segment-table length register protects the table itself.', parts: [{ type: 'vars', vals: { segment: s, table_length: tab.length }, hl: { segment: 'bad' } }] });
        f.push({ narr: 'The OS typically kills the process (segmentation fault).', parts: [{ type: 'text', html: 'Try segment 0..' + (tab.length - 1) + '.' }] });
        return f;
      }
      var base = tab[s][0], lim = tab[s][1], hl = {}; hl[s] = 'sel';
      f.push({ narr: 'Use <b>s</b> as the row index: base = <b>' + base + '</b>, limit = <b>' + lim + '</b>.', parts: [{ type: 'table', label: 'segment table', columns: cols, rows: rows, hl: hl }, { type: 'vars', vals: { base: base, limit: lim, offset: d } }] });
      var ok = d < lim;
      f.push({ narr: 'Bounds check: is offset <b>' + d + ' &lt; ' + lim + '</b>? ' + (ok ? '<span class="c-g">Yes</span>.' : '<span class="c-r">No</span> - the access is past the end of the segment.'), parts: [{ type: 'array', label: 'segment ' + s + ' covers offsets 0 .. ' + (lim - 1), values: ['0', '...', String(lim - 1)], hl: { 0: 'ok', 1: 'done', 2: 'ok' } }, { type: 'vars', vals: { offset: d, limit: lim }, hl: { offset: ok ? 'ok' : 'bad' } }] });
      if (ok) {
        f.push({ narr: 'Physical address = base + offset = ' + base + ' + ' + d + ' = <b>' + (base + d) + '</b>.', parts: [{ type: 'vars', vals: { physical: base + d }, hl: { physical: 'ok' } }, { type: 'table', label: 'segment table', columns: cols, rows: rows, hl: hl }] });
        f.push({ narr: 'Compare with paging: here the unit has a custom length (' + lim + ' bytes) so memory can be tightly packed, but different lengths leave odd-sized holes (external fragmentation).', parts: [{ type: 'bars', label: 'segment sizes', values: tab.map(function (r) { return r[1]; }), hl: hl }] });
      } else {
        f.push({ narr: '<span class="c-r">TRAP</span>: the hardware stops the access before it can touch another segment (' + (base + d) + ' might belong to someone else).', parts: [{ type: 'vars', vals: { would_be_physical: base + d }, hl: { would_be_physical: 'bad' } }] });
        f.push({ narr: 'This per-segment check is what makes sharing and protection natural: a read-only code segment can be shared by many processes without any of them being able to write it.', parts: [{ type: 'table', label: 'segment table', columns: cols, rows: rows, hl: hl }] });
      }
      return f;
    }
  },
  examples: [
    { title: 'Three translations', html: `<p>Using the table above: (2,53) → 4353 ${H.c('g', 'ok')}; (3,852) → 4052 ${H.c('g', 'ok')}; (0,1222) → ${H.c('r', 'trap, 1222 ≥ 1000')}.</p>` },
    { title: 'Growing the stack', html: `<p>Stack segment limit 400 is too small after deep recursion. The OS extends the limit if the memory after the segment is free - otherwise it must <b>move</b> the whole segment (copy + change base) or compact. Paging avoids this: just add pages.</p>` },
    { title: 'Protection per segment', html: `<p>Code: execute+read, shared by all copies of the program. Data: read+write, private. A pointer bug that writes into code is caught with a protection fault, not silent corruption.</p>` },
    { title: 'x86 history', html: `<p>8086 real mode: physical = segment × 16 + offset (20-bit address from two 16-bit values). 386 protected mode added descriptors with base/limit plus paging. Linux and Windows set all segment bases to 0 - "flat" - and rely on paging.</p>` }
  ],
  deepDive: `<p>🟣 <b>Why segmentation lost.</b> Variable-size allocation brings external fragmentation back; programmers/compilers had to manage segment numbers; swapping whole segments (tens of MB) is slow. Paging gives equal chunks, simple allocation (a free list of frames) and finer swapping. Segmentation's benefits (protection, sharing) were re-created as per-page permission bits plus VMAs in the OS.</p>
<p><b>Still alive:</b> the OS's own view of a process is segment-like - Linux keeps a list of <b>VMAs</b> (<code>vm_area_struct</code>): code, data, heap, each mmap'd file, stack - each with start, end and permissions; <code>/proc/PID/maps</code> prints them. A page fault outside any VMA = SIGSEGV. The stack VMA grows automatically on a fault just below it.</p>
<p><b>x86-64.</b> In 64-bit mode CS/DS/ES/SS bases are forced to 0 and limits are ignored; FS and GS still have a base (set via MSRs) - used for thread-local storage and per-CPU data in the kernel.</p>
<p><b>Segmentation + paging cost.</b> Two translations per access (segment add + page walk) - cheap in hardware because the segment step is just an adder.</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> Model-serving systems manage variable-sized tensors, activations and KV-cache blocks - the same trade-off as segments vs pages. Naive allocators give each request a contiguous KV-cache "segment" sized for the maximum length and waste 60-80% (internal + external fragmentation); paged KV caches (vLLM) switch to fixed-size blocks and a block table - literally a page table.</p>
<p><b>Use AI as a partner.</b> Ask for a table comparing paging vs segmentation in an interview-style one-liner each, then ask it to attack your explanation ("what would a skeptical interviewer ask?").</p>
<p><b>Where AI goes wrong.</b> It claims "Linux uses segmentation for process isolation" (it does not: it uses paging, with flat segments) or confuses a segment fault with a page fault. <b>You must still own</b> knowing what the real systems use today.</p>`,
  problems: [{
    title: 'Translate Logical Addresses with a Segment Table', level: 'Easy', tags: ['segmentation'], companies: ['Cisco', 'Dell'],
    statement: `<p>Segment table (base, limit): S0 = (1400, 1000), S1 = (6300, 400), S2 = (4300, 400), S3 = (3200, 1100), S4 = (4700, 1000). Translate (2, 500), (3, 852), (0, 1222) and (4, 999).</p>`,
    constraints: `If offset ≥ limit the access traps.`,
    example: `<p>(3, 852): 852 &lt; 1100 → ${H.c('g', '3200 + 852 = 4052')}.</p>`,
    brute: { why: `<p>Searching all segments for one that "contains" the address is O(segments) and ambiguous. The segment number in the address makes it a direct O(1) row lookup.</p>` },
    mcq: { q: 'The check "offset &lt; limit" is done…', options: ['after adding the base', 'before using the address on the bus', 'only for the stack'], answer: 1, explain: 'Check first (compare the offset with the limit), then add the base; the bad address never reaches memory.' },
    hints: [`<p>Hint 1: s picks the row. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: compare offset to that row's limit. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: physical = base + offset when valid. (2,500): limit is 400 - careful!</p>`],
    solution: {
      approach: `<p>(2, 500): S2 has limit 400 and 500 ≥ 400, so it traps. (3, 852): limit 1100, 852 &lt; 1100 → 3200 + 852 = 4052. (0, 1222): limit 1000, 1222 ≥ 1000 → trap. (4, 999): limit 1000, 999 &lt; 1000 → 4700 + 999 = 5699. Always compare against the limit of the segment named in the address, not against another segment.</p>`,
      dry: { head: ['(s, d)', 'limit[s]', 'd &lt; limit?', 'result'], rows: [['(2, 500)', '400', 'no', '<span class="c-r">TRAP</span>'], ['(3, 852)', '1100', 'yes', '4052'], ['(0, 1222)', '1000', 'no', '<span class="c-r">TRAP</span>'], ['(4, 999)', '1000', 'yes', '5699']] },
      complexity: `<p>O(1) per access: one table read, one comparison, one addition.</p>`,
      followUps: ['What changes if each segment is paged?', 'How does the OS grow a segment whose neighbour is occupied?']
    }
  }]
});

/* ================= TOPIC 6: virtual memory, demand paging, page faults ================= */
topics.push({
  title: 'Virtual Memory, Demand Paging & Page Faults',
  analogy: `<p>A chef has a small <b>kitchen counter</b> (RAM) and a huge <b>warehouse</b> (disk). The recipe book (the program) lists 500 ingredients, but at any moment only a few are needed. A lazy chef brings an ingredient to the counter <b>only when a step actually asks for it</b>. If the step asks for something that is still in the warehouse, the chef stops, fetches it (slow!) and carries on. That fetch is a <b>page fault</b>. The recipe can be far bigger than the counter, and the cook never notices - except when the walks get too frequent.</p>`,
  explain: `<p>🟢 <b>Virtual memory</b> = the illusion that each process has a huge, private, contiguous memory, even though RAM is small and shared. Only the pages being used are kept in RAM; the rest wait on disk (the <b>swap space</b> or the original executable/file). Benefits: programs bigger than RAM, more programs running at once, fast start-up (load nothing up front), isolation and sharing.</p>
<p>🔵 <b>Demand paging</b> = load a page only when it is first touched. Each page-table entry has a <b>valid/present bit</b>: 1 = page is in a frame, 0 = not in RAM (or not allowed). Touching a page with bit 0 causes a <b>page fault</b> - a trap into the OS.</p>
<p><b>Handling a page fault, step by step:</b></p>
<ol><li>The MMU sees valid = 0 and traps to the OS (saves the faulting instruction's address).</li><li>OS checks its records (VMA): is the address legal? If not → SIGSEGV, process dies.</li><li>Find a <b>free frame</b>. If none, run the <b>page replacement</b> algorithm to pick a victim; if the victim is <b>dirty</b>, write it to disk first.</li><li>Schedule a disk read of the needed page into that frame. The process <b>blocks</b>; the CPU runs another process.</li><li>Disk interrupt: update the page table (frame number, valid = 1).</li><li>Mark the process ready; when scheduled, <b>restart the same instruction</b> - it now succeeds.</li></ol>
<p><b>Speed.</b> A memory access ≈ 200 ns; a page-fault service ≈ 8 ms (disk) = 8,000,000 ns, 40,000× slower. If a fraction <i>p</i> of accesses fault:</p>
<p><b>EAT = (1 - p) × ma + p × T<sub>fault</sub></b>. With ma = 200 ns, T = 8 ms, p = 1/1000: 0.999 × 200 + 0.001 × 8,000,000 = 199.8 + 8000 = <b>8199.8 ns</b> - a 40× slowdown from just 1 fault per 1000 accesses! To stay under 10% slowdown you need 200 + p × 7,999,800 ≤ 220 → p ≤ 2.5 × 10<sup>-6</sup> (one fault per 400,000 accesses).</p>
<p><b>Types of fault:</b> <i>minor</i> (page is in memory but not mapped yet, e.g. first touch of zero-filled memory or a page already in the page cache - microseconds), <i>major</i> (needs disk I/O - milliseconds), <i>invalid</i> (illegal access → SIGSEGV).</p>`,
  clues: ['"process larger than physical memory" → virtual memory / demand paging', '"valid-invalid bit", "present bit" → demand paging', '"page fault service time 8 ms, memory access 200 ns" → EAT with fault rate p', '"what happens after a page fault" → the six-step handler, restart the instruction', '"copy-on-write", "lazy allocation", "mmap" → pages mapped but not yet present', '"slowdown must be under X%" → solve for the fault rate'],
  code: [
    { lang: 'cpp', title: 'mmap: lazy (demand-paged) memory and counting page faults', code: `#include <sys/mman.h>
#include <sys/resource.h>
#include <iostream>
#include <cstring>
using namespace std;

// Minor page faults so far for this process (kernel counts them for us).
static long minor_faults() {
    rusage ru;
    getrusage(RUSAGE_SELF, &ru);
    return ru.ru_minflt;
}

int main() {
    const size_t SIZE = 256UL * 1024 * 1024;   // ask for 256 MB of virtual memory
    const size_t PAGE = 4096;

    // MAP_ANONYMOUS: not backed by a file. Only address space is reserved here:
    // no physical frames yet (demand paging!).
    void* p = mmap(nullptr, SIZE, PROT_READ | PROT_WRITE,
                   MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }
    char* mem = static_cast<char*>(p);

    long before = minor_faults();
    // Touch one byte in each of the first 1000 pages: each first touch faults,
    // the kernel hands out a zero-filled frame and updates the page table.
    for (size_t i = 0; i < 1000; ++i) mem[i * PAGE] = 1;
    long after = minor_faults();
    cout << "touched 1000 pages -> about " << (after - before) << " minor faults\\n";

    // Touching the same pages again is free of faults: they are present now.
    before = minor_faults();
    for (size_t i = 0; i < 1000; ++i) mem[i * PAGE] = 2;
    cout << "second pass faults: " << (minor_faults() - before) << "\\n";

    munmap(p, SIZE);   // give the address range back
    return 0;
}` },
    { lang: 'cpp', title: 'mmap a file: pages come from the page cache on demand', code: `#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <cstdio>
#include <iostream>
using namespace std;

int main(int argc, char** argv) {
    const char* path = argc > 1 ? argv[1] : "/etc/hostname";
    int fd = open(path, O_RDONLY);
    if (fd < 0) { perror("open"); return 1; }
    struct stat st;
    if (fstat(fd, &st) < 0 || st.st_size == 0) { cerr << "empty or unreadable\\n"; return 1; }

    // MAP_PRIVATE + PROT_READ: the file's pages are mapped into our address space.
    // Nothing is read from disk yet; the first access to each page faults (a major fault
    // if the page is not already in the OS page cache, a minor one if it is).
    void* p = mmap(nullptr, st.st_size, PROT_READ, MAP_PRIVATE, fd, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }
    close(fd);                                   // the mapping stays valid after close

    const char* text = static_cast<const char*>(p);
    size_t n = st.st_size < 64 ? st.st_size : 64;
    fwrite(text, 1, n, stdout);                  // this read triggers the page fault
    munmap(p, st.st_size);
    return 0;
}` }
  ],
  codeTitle: ['Anonymous mmap and fault counting', 'Memory-mapped file'],
  viz: [
    {
      title: 'What happens on a page fault',
      input: 'full-dirty',
      inputLabel: 'scenario: free | full-clean | full-dirty | illegal',
      gen: function (input) {
        var sc = String(input).trim().toLowerCase();
        if (['free', 'full-clean', 'full-dirty', 'illegal'].indexOf(sc) < 0) throw new Error('Type one of: free, full-clean, full-dirty, illegal');
        var steps = [], txt = [];
        steps.push('1 CPU touches page'); txt.push('The process runs <code>mov eax, [addr]</code>. The MMU looks up the page table: the entry has <b>valid bit = 0</b>.');
        steps.push('2 MMU traps to OS'); txt.push('<b>Page-fault exception.</b> The CPU switches to kernel mode and saves the faulting instruction address (so it can be restarted).');
        steps.push('3 Is the access legal?'); txt.push('The kernel looks the address up in the process\'s memory map (VMAs): is it inside a mapped region with the right permission?');
        if (sc === 'illegal') {
          steps.push('4 NOT legal: SIGSEGV'); txt.push('<span class="c-r">Address is not in any mapping</span> (or write to read-only). The kernel sends SIGSEGV; the process is killed - "segmentation fault". No disk I/O at all.');
          var fi = [];
          for (var i = 0; i < steps.length; i++) {
            var h = {}; for (var j = 0; j < i; j++) h[j] = 'done'; h[i] = i === steps.length - 1 ? 'bad' : 'cur';
            fi.push({ narr: txt[i], parts: [{ type: 'queue', label: 'Page-fault handler', items: steps.slice(), hl: h, frontLabel: 'first', backLabel: 'last' }] });
          }
          return fi;
        }
        steps.push('4 Legal: need a frame'); txt.push('<span class="c-g">Legal access</span> - the page just is not in RAM yet. The kernel needs a physical frame to put it in.');
        if (sc === 'free') { steps.push('5 Take a free frame'); txt.push('The free-frame list is not empty: grab one (zero it if it is a fresh anonymous page).'); }
        else {
          steps.push('5 No free frame: pick victim'); txt.push('Memory is full. The <b>page replacement algorithm</b> (LRU approximation, clock...) chooses a victim page to throw out.');
          if (sc === 'full-dirty') { steps.push('5b Victim dirty: write to disk'); txt.push('The victim was modified (dirty bit = 1), so it must be <b>written to swap/file first</b> - one extra disk write (the fault now costs two I/Os).'); }
          else { steps.push('5b Victim clean: just drop it'); txt.push('The victim is unmodified (dirty bit = 0) and has a copy on disk, so it is simply discarded - no write needed.'); }
          steps.push('5c Mark victim invalid'); txt.push('The victim\'s page-table entry gets valid = 0 and its TLB entry is invalidated (shootdown on multicore).');
        }
        steps.push('6 Read page from disk'); txt.push('The kernel issues a disk read into the chosen frame. The process goes to <b>BLOCKED</b>; the scheduler runs another process while the disk works (~8 ms = millions of instructions).');
        steps.push('7 Update page table'); txt.push('Disk interrupt: the page is in the frame. Set the PTE: frame number, valid = 1, accessed = 0, dirty = 0.');
        steps.push('8 Process READY, restart'); txt.push('The process becomes ready. When it runs again, the <b>same instruction is restarted</b> from scratch, this time the translation succeeds. Typical cost: ~8,000,000 ns vs 200 ns for a normal access.');
        var frames = [];
        for (var k = 0; k < steps.length; k++) {
          var hl = {}; for (var m = 0; m < k; m++) hl[m] = 'done'; hl[k] = 'cur';
          frames.push({ narr: txt[k], parts: [{ type: 'queue', label: 'Page-fault handling steps (scenario: ' + sc + ')', items: steps.slice(), hl: hl, frontLabel: 'first', backLabel: 'last' }] });
        }
        frames.push({ narr: 'Cost comparison (log scale): a normal access ≈ 200 ns, a major page fault ≈ 8,000,000 ns. Each extra victim write-back adds another disk operation.', parts: [{ type: 'bars', label: 'log10(nanoseconds)', values: [Math.log(200) / Math.LN10, Math.log(8e6) / Math.LN10], texts: ['200 ns', '8 ms'], idxLabels: ['memory access', 'page fault'], hl: { 0: 'ok', 1: 'bad' } }] });
        return frames;
      }
    },
    {
      title: 'Page-fault rate vs effective access time',
      input: '0.001 200 8000000',
      inputLabel: 'fault rate p, memory ns, fault service ns',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length < 3 || a.some(isNaN) || a[0] < 0 || a[0] > 1 || a[1] <= 0 || a[2] <= a[1]) throw new Error('Enter: p memNs faultNs   e.g. 0.001 200 8000000');
        var p = a[0], ma = a[1], T = a[2], eat = (1 - p) * ma + p * T, f = [];
        f.push({ narr: 'Inputs: fault rate p = <b>' + p + '</b>, normal access ma = <b>' + ma + ' ns</b>, fault service time T = <b>' + T + ' ns</b>.', parts: [{ type: 'vars', vals: { p: p, ma_ns: ma, T_ns: T } }] });
        f.push({ narr: 'Fraction of accesses that are fine: 1 - p = <b>' + (1 - p) + '</b>, each costing ma = ' + ma + ' ns → contributes ' + ((1 - p) * ma).toFixed(2) + ' ns.', parts: [{ type: 'vars', vals: { no_fault_part: ((1 - p) * ma).toFixed(2) } }] });
        f.push({ narr: 'Fraction that fault: p = ' + p + ', each costing T → contributes p × T = <b>' + (p * T).toFixed(2) + ' ns</b>.', parts: [{ type: 'vars', vals: { fault_part: (p * T).toFixed(2) }, hl: { fault_part: 'bad' } }] });
        f.push({ narr: 'EAT = ' + ((1 - p) * ma).toFixed(2) + ' + ' + (p * T).toFixed(2) + ' = <b>' + eat.toFixed(2) + ' ns</b> - that is <b>' + (eat / ma).toFixed(1) + '×</b> slower than a fault-free access.', parts: [{ type: 'vars', vals: { EAT_ns: eat.toFixed(2), slowdown: (eat / ma).toFixed(2) + 'x' }, hl: { EAT_ns: 'sel' } }] });
        var pmax = (0.1 * ma) / (T - ma);
        f.push({ narr: 'To keep slowdown below 10% you need EAT ≤ ' + (1.1 * ma).toFixed(0) + ' ns, i.e. <b>p ≤ ' + pmax.toExponential(2) + '</b> (about one fault per ' + Math.round(1 / pmax).toLocaleString('en-US') + ' accesses).', parts: [{ type: 'vars', vals: { max_p: pmax.toExponential(2) }, hl: { max_p: 'ok' } }] });
        var ps = [0, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2], vals = ps.map(function (x) { return (1 - x) * ma + x * T; });
        f.push({ narr: 'Same machine, different fault rates. Notice how a tiny rate already dominates.', parts: [{ type: 'bars', label: 'EAT (ns) for p = 0, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2', values: vals.map(function (x) { return Math.round(x); }), idxLabels: ['0', '1e-6', '1e-5', '1e-4', '1e-3', '1e-2'], hl: { 0: 'ok', 4: 'bad', 5: 'bad' } }] });
        return f;
      }
    }
  ],
  examples: [
    { title: 'Why fork() is cheap: copy-on-write', html: `<p><code>fork</code> does not copy memory. Parent and child page tables point to the same frames, all marked <b>read-only</b>. The first write by either causes a (protection) fault; the kernel copies just that one page and makes it writable. A 1 GB process forks in microseconds.</p>` },
    { title: 'Fast program start', html: `<p><code>execve</code> only sets up mappings for the executable. Pages of code are loaded as the program runs - a program with 100 MB of code that uses 2 MB touches only ~2 MB. That is why a huge binary starts instantly.</p>` },
    { title: 'EAT with page faults', html: `<p>ma = 100 ns, T = 10 ms = 10,000,000 ns, p = 10<sup>-5</sup>: EAT = 0.99999 × 100 + 10<sup>-5</sup> × 10,000,000 = 99.999 + 100 = <b>≈ 200 ns</b> - a 2× slowdown from 1 fault per 100,000 accesses.</p>` },
    { title: 'Minor vs major', html: `<p>First touch of fresh malloc memory: minor fault (kernel hands a zero page, ~1 µs). Reading a file page not in cache: major fault (disk, ~100 µs SSD / ~8 ms HDD). <code>/usr/bin/time -v</code> prints both counts.</p>` }
  ],
  deepDive: `<p>🟣 <b>Restartable instructions.</b> The CPU must be able to undo partial effects of the faulting instruction (e.g. a block copy that touches several pages) so that it can be re-run. This was a famous hardware design constraint for demand paging (PDP-11 auto-increment modes).</p>
<p><b>Overcommit and the OOM killer.</b> Linux lets processes <code>mmap</code>/<code>malloc</code> more than RAM+swap (overcommit) because pages are only allocated on first touch. If memory really runs out, the <b>OOM killer</b> kills a process. Containers get their own limits via cgroups (memory.max).</p>
<p><b>Swap and zram.</b> Swap on SSD makes major faults cheap (~100 µs); <code>zram</code>/<code>zswap</code> compress pages in RAM instead (a "fast swap"). <code>swappiness</code> tunes how eagerly the kernel swaps anonymous pages vs dropping file-cache pages.</p>
<p><b>Readahead and prepaging.</b> Pure demand paging faults on every first touch. Kernels use <b>fault-around</b> (map 16 neighbouring cached pages on one fault) and readahead for files; <code>madvise(MADV_WILLNEED)</code> / <code>MAP_POPULATE</code> prefault. <code>userfaultfd</code> lets user space handle faults (live VM migration, lazy snapshot restore).</p>
<p><b>Page cache unification.</b> File I/O and mmap share the same cache of pages, so a file read once by <code>read()</code> is already present when mmap'd.</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> Loading a multi-GB model with <code>mmap</code> returns instantly and then stalls on first use as pages fault in (fix: warm up, <code>MAP_POPULATE</code>, or use <code>mlock</code>). Serverless / "scale to zero" GPU inference fights cold starts; snapshots restored with lazy page-in (userfaultfd, CRIU lazy restore) are the same demand paging in new clothes. Training jobs killed with "OOM" often show up as Linux OOM-killer events in <code>dmesg</code>.</p>
<p><b>Use AI as a partner.</b> Paste <code>perf stat -e page-faults,major-faults</code> or <code>/proc/PID/status</code> (VmRSS, VmSwap) into an assistant and ask for hypotheses, then test each. Ask it to quiz you with 5 EAT-with-page-faults numeric questions.</p>
<p><b>Where AI goes wrong.</b> It says "a page fault is always an error" or mixes minor and major faults, and may suggest disabling swap as a free speed-up. <b>You must still own</b> the distinction (fault ≠ crash) and the numbers (40,000× slower than RAM).</p>`,
  problems: [{
    title: 'How Rare Must Page Faults Be?', level: 'Medium', tags: ['demand paging', 'EAT'], companies: ['Amazon', 'Nvidia'],
    statement: `<p>Memory access time is <b>200 ns</b> and the average page-fault service time is <b>8 ms</b>. (a) If one access in 1000 causes a fault, what is the EAT and the slowdown? (b) What fault rate keeps the slowdown below <b>10%</b>? (c) Name the six steps the OS performs on a fault.</p>`,
    constraints: `Ignore TLB effects; 8 ms = 8,000,000 ns.`,
    example: `<p>(a) ${H.c('r', '8199.8 ns')}, about 41× slower. (b) ${H.c('g', 'p ≤ 2.5 × 10<sup>-6</sup>')}.</p>`,
    brute: { why: `<p>"Add more RAM until faults vanish" - often right in practice but not an answer to the question: the interviewer wants to see you quantify how fast faults hurt.</p>` },
    mcq: { q: 'Which statement about the faulting instruction is true?', options: ['It is skipped after the fault is handled', 'It is restarted from the beginning once the page is in memory', 'It runs in kernel mode'], answer: 1, explain: 'After the OS loads the page, the same instruction is re-executed and now succeeds.' },
    hints: [`<p>Hint 1: EAT = (1 - p) × ma + p × T. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: convert 8 ms to ns before substituting. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: for (b) require EAT ≤ 1.1 × 200 = 220 and solve for p: 200 + p × (T - 200) ≤ 220.</p>`],
    solution: {
      approach: `<p>(a) p = 0.001: EAT = 0.999 × 200 + 0.001 × 8,000,000 = 199.8 + 8000 = 8199.8 ns, about 41× the fault-free 200 ns. (b) Need EAT ≤ 220: 200 + p × (8,000,000 - 200) ≤ 220 → p ≤ 20 / 7,999,800 ≈ 2.5 × 10<sup>-6</sup>, i.e. fewer than one fault per 400,000 accesses. (c) Trap to OS; verify the address is legal; find a free frame (or evict, writing back if dirty); read the page from disk (process blocks); update the page table and mark ready; restart the instruction.</p>`,
      dry: { head: ['Step', 'Calculation', 'Value'], rows: [['(1-p) × ma', '0.999 × 200', '199.8 ns'], ['p × T', '0.001 × 8,000,000', '8000 ns'], ['EAT', '199.8 + 8000', '<b>8199.8 ns</b>'], ['limit for 10%', '220 = 200 + p × 7,999,800', 'p = 2.5e-6'], ['accesses per fault', '1 / 2.5e-6', '400,000']] },
      complexity: `<p>Closed-form arithmetic.</p>`,
      followUps: ['How does an SSD (100 µs) change the allowed fault rate?', 'What if 50% of victims are dirty (two I/Os)?']
    }
  }]
});

/* ================= TOPIC 7a: page replacement basics + FIFO + Belady ================= */
topics.push({
  title: 'Page Replacement: Goal, Reference Strings & FIFO (Belady\'s Anomaly)',
  analogy: `<p>Your desk fits only 3 books. A 4th book is needed, so one must go back to the shelf. <b>FIFO</b> says: "send back the book that has been on the desk the <i>longest</i>" - fair, but that book might be your dictionary, which you use every five minutes. The shelf is far away (disk), so choosing badly means many slow trips.</p>`,
  explain: `<p>🟢 <b>The problem.</b> RAM is full and a page fault needs a frame. The OS must choose a <b>victim page</b> to evict. Good choice → few future faults; bad choice → the victim is needed again immediately.</p>
<p>🔵 <b>How we compare algorithms.</b> Take a <b>reference string</b> (the sequence of page numbers a program touches, e.g. <code>7 0 1 2 0 3 0 4 2 3</code>), fix the number of frames, and count <b>page faults</b>. Fewer is better. Only the first reference of a page in a free frame (a "cold" fault) is unavoidable.</p>
<p><b>FIFO</b> keeps a queue of pages in order of arrival; evict the page at the front (oldest). Hits do <i>not</i> change the order. Trace with 3 frames:</p>
${H.table(['ref', '7', '0', '1', '2', '0', '3', '0', '4', '2', '3'], [['frames', '7 - -', '7 0 -', '7 0 1', '2 0 1', '2 0 1', '2 3 1', '2 3 0', '4 3 0', '4 2 0', '4 2 3'], ['result', '<span class="c-r">F</span>', '<span class="c-r">F</span>', '<span class="c-r">F</span>', '<span class="c-r">F</span>', '<span class="c-g">hit</span>', '<span class="c-r">F</span>', '<span class="c-r">F</span>', '<span class="c-r">F</span>', '<span class="c-r">F</span>', '<span class="c-r">F</span>']])}
<p>9 faults out of 10 references. FIFO evicted page 0 at the 3rd step even though 0 was just used - it only looks at <i>arrival</i> time, not <i>use</i>.</p>
<p><b>Belady's anomaly.</b> Intuition says more frames → fewer (or equal) faults. For FIFO that is <b>false</b>. Reference string <code>1 2 3 4 1 2 5 1 2 3 4 5</code>: <b>3 frames → 9 faults, 4 frames → 10 faults</b>. Adding memory made it worse! Algorithms like LRU and OPT are immune (next topic).</p>
${H.table(['Frames', 'Faults on 1 2 3 4 1 2 5 1 2 3 4 5'], [['3', '<b>9</b>'], ['4', '<span class="c-r"><b>10</b></span>']])}
<p><b>Other quantities interviewers ask:</b> fault rate = faults / references; hit ratio = 1 - fault rate; minimum faults = number of distinct pages (each needs a first load).</p>`,
  clues: ['"reference string" + "number of frames" → simulate and count faults', '"which page does FIFO evict?" → the oldest loaded, regardless of recent use', '"increasing the number of frames increases faults" → Belady\'s anomaly (FIFO)', '"cold / compulsory misses" → number of distinct pages', '"page-fault rate", "hit ratio" for a reference string', '"stack algorithm" → no anomaly (LRU, OPT)'],
  code: [
    { lang: 'python', run: true, title: 'Page replacement simulator: FIFO, LRU, OPT, Clock (runnable)', code: `def simulate(refs, nframes, algo, verbose=True):
    frames = [None] * nframes      # slot -> page
    loaded = [0] * nframes         # time page was loaded      (FIFO)
    last = [0] * nframes           # time page was last used   (LRU)
    refbit = [0] * nframes         # reference bits            (CLOCK)
    hand = 0                       # clock hand
    faults = 0
    if verbose:
        print(f"--- {algo}, {nframes} frames ---")
    for t, p in enumerate(refs):
        if p in frames:                                  # HIT
            i = frames.index(p)
            last[i] = t
            refbit[i] = 1
            status = "hit"
        else:                                            # PAGE FAULT
            faults += 1
            status = "FAULT"
            if None in frames:                           # free frame available
                i = frames.index(None)
            elif algo == "FIFO":
                i = min(range(nframes), key=lambda k: loaded[k])    # oldest arrival
            elif algo == "LRU":
                i = min(range(nframes), key=lambda k: last[k])      # oldest use
            elif algo == "OPT":
                def next_use(k):                         # how far until page k is needed again
                    rest = refs[t + 1:]
                    return rest.index(frames[k]) if frames[k] in rest else float("inf")
                i = max(range(nframes), key=next_use)               # farthest in the future
            else:                                        # CLOCK / second chance
                while refbit[hand] == 1:
                    refbit[hand] = 0                     # give a second chance
                    hand = (hand + 1) % nframes
                i = hand
                hand = (hand + 1) % nframes
            frames[i] = p
            loaded[i] = t
            last[i] = t
            refbit[i] = 1
        if verbose:
            shown = " ".join("-" if f is None else str(f) for f in frames)
            extra = f"  bits={refbit} hand={hand}" if algo == "CLOCK" else ""
            print(f"ref {p}: [{shown}] {status}{extra}")
    if verbose:
        print(f"total faults = {faults}")
    return faults

refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3]
for algo in ("FIFO", "LRU", "OPT", "CLOCK"):
    simulate(refs, 3, algo)

print()
belady = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
print("Belady anomaly (FIFO):", {n: simulate(belady, n, "FIFO", False) for n in (3, 4)})
print("LRU on same string   :", {n: simulate(belady, n, "LRU", False) for n in (3, 4)})` }
  ],
  codeTitle: ['Four-policy simulator'],
  viz: [
    {
      title: 'FIFO: frames after every reference',
      input: '7 0 1 2 0 3 0 4 2 3 ; 3',
      inputLabel: 'reference string ; number of frames (1-6)',
      gen: function (input) { return replFrames(input, 'FIFO', 3); }
    },
    {
      title: 'Belady\'s anomaly: same string, more frames, MORE faults',
      input: '1 2 3 4 1 2 5 1 2 3 4 5 ; 3',
      inputLabel: 'reference string ; frames (compares N and N+1)',
      gen: function (input) {
        var q = parseRefs(input, 3), r1 = simulate(q.refs, q.n, 'FIFO'), r2 = simulate(q.refs, q.n + 1, 'FIFO'), f = [];
        f.push({ narr: 'We run FIFO twice on the same string: with <b>' + q.n + '</b> frames and with <b>' + (q.n + 1) + '</b> frames. Common sense says the second run cannot be worse.', parts: [gridPart(r1, q.refs, q.n, -1, q.n + ' frames'), gridPart(r2, q.refs, q.n + 1, -1, (q.n + 1) + ' frames')] });
        for (var t = 0; t < q.refs.length; t++) {
          f.push({ narr: 'Reference <b>' + q.refs[t] + '</b>: with ' + q.n + ' frames → ' + (r1.cols[t].fault ? '<span class="c-r">fault</span>' : '<span class="c-g">hit</span>') + '; with ' + (q.n + 1) + ' frames → ' + (r2.cols[t].fault ? '<span class="c-r">fault</span>' : '<span class="c-g">hit</span>') + '. Faults so far: ' + r1.cols[t].faults + ' vs ' + r2.cols[t].faults + '.', parts: [gridPart(r1, q.refs, q.n, t, q.n + ' frames'), gridPart(r2, q.refs, q.n + 1, t, (q.n + 1) + ' frames')] });
        }
        var anomaly = r2.faults > r1.faults;
        f.push({ narr: 'Totals: <b>' + r1.faults + '</b> faults with ' + q.n + ' frames vs <b>' + r2.faults + '</b> with ' + (q.n + 1) + '. ' + (anomaly ? '<span class="c-r">Belady\'s anomaly!</span> With more frames FIFO kept different pages and evicted a soon-needed one.' : 'No anomaly for this string - the anomaly needs special patterns. Try <code>1 2 3 4 1 2 5 1 2 3 4 5 ; 3</code>.'), parts: [{ type: 'bars', label: 'page faults', values: [r1.faults, r2.faults], idxLabels: [q.n + ' frames', (q.n + 1) + ' frames'], hl: { 0: 'ok', 1: anomaly ? 'bad' : 'ok' } }] });
        return f;
      }
    }
  ],
  examples: [
    { title: 'Counting by hand (3 frames)', html: `<p>String 7 0 1 2 0 3 0 4 2 3. FIFO: faults at 7,0,1,2,3,0,4,2,3 → <b>9</b>; only the second 0 is a hit. Hit ratio = 1/10 = 10%.</p>` },
    { title: 'Belady in numbers', html: `<p>Frames contents just before 5 arrives: with 3 frames [4 1 2], with 4 frames [1 2 3 4]. FIFO's different eviction order makes the 4-frame run evict 1, 2, 3 one after another exactly when they are needed: faults on 5,1,2,3,4,5 = 6 + 4 cold = <b>10</b> vs <b>9</b>.</p>` },
    { title: 'Lower bound', html: `<p>A string using 5 distinct pages needs at least 5 faults whatever the algorithm or frame count (compulsory faults). With enough frames (≥ 5) every algorithm achieves exactly 5.</p>` },
    { title: 'Implementation cost', html: `<p>FIFO needs only a queue/index. Easy and cheap - but poor: it may evict a hot page. Early VAX/VMS used FIFO with a second-chance list to fix it.</p>` }
  ],
  deepDive: `<p>🟣 <b>Why Belady happens.</b> Stack algorithms have the <i>inclusion property</i>: the set of pages in memory with n frames is always a subset of the set with n+1 frames. LRU and OPT are stack algorithms, so more frames can never hurt. FIFO does not satisfy it - the contents with 4 frames are not a superset of the contents with 3 frames, because the load order shifts.</p>
<p><b>Global vs local replacement.</b> Local: a process evicts only its own pages (predictable, isolated). Global: victim chosen from all frames (better utilisation, but one hungry process can steal from others). Linux uses global reclaim with per-cgroup limits.</p>
<p><b>Frame allocation.</b> Equal share, proportional to process size, or priority-based; minimum frames per process is set by the instruction set (an instruction that touches 6 pages needs ≥ 6 frames to ever complete).</p>
<p><b>Paging daemon / watermarks.</b> Real kernels do not wait for zero free frames: a background thread (<code>kswapd</code>) evicts pages when free memory falls below a low watermark, writing dirty pages ahead of time so a fault finds a clean frame immediately.</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> Simulating page replacement is now a 20-line script - and AI can write it instantly. What it cannot know is <i>your</i> workload's reference string. Real kernels use access-bit sampling; research uses learned eviction policies (e.g. predicting reuse distance) for caches and CDNs - the framework is identical to this topic: reference string, frames, fault count.</p>
<p><b>Use AI as a partner.</b> Give it three reference strings and ask it to find one that triggers Belady's anomaly for FIFO with 3→4 frames; verify using the simulator. Ask it for 5 strings to practise on, trace each yourself and compare.</p>
<p><b>Where AI goes wrong.</b> It commonly "updates" FIFO order on a hit (which turns it into LRU) and miscounts the initial cold faults. <b>You must still own</b> hand-tracing: frames after every step, mark F/hit, count.</p>`,
  problems: [{
    title: 'Show Belady\'s Anomaly with FIFO', level: 'Medium', tags: ['FIFO', 'Belady', 'page replacement'], companies: ['Microsoft', 'Samsung'],
    statement: `<p>Reference string: <b>1 2 3 4 1 2 5 1 2 3 4 5</b>. Count page faults under FIFO with <b>3 frames</b> and with <b>4 frames</b>. What anomaly do you observe and why?</p>`,
    constraints: `Frames start empty; every first load counts as a fault.`,
    example: `<p>3 frames → ${H.c('g', '9 faults')}; 4 frames → ${H.c('r', '10 faults')}.</p>`,
    brute: { why: `<p>Try to reason without tracing ("4 frames must be better"). That intuition is exactly what Belady's anomaly breaks - for FIFO you must trace every step.</p>` },
    mcq: { q: 'Which policies are immune to Belady\'s anomaly?', options: ['FIFO and Clock', 'LRU and OPT (stack algorithms)', 'All replacement policies'], answer: 1, explain: 'Stack algorithms keep the n-frame set inside the (n+1)-frame set, so more frames can never add faults.' },
    hints: [`<p>Hint 1: FIFO evicts the page that arrived earliest; a hit does not reorder anything.</p>`, `<p>Hint 2: write the frame contents after each reference, oldest page first.</p>`, `<p>Hint 3: count F for faults. Do 3 frames fully, then 4 frames. Compare totals.</p>`],
    solution: {
      approach: `<p>Trace FIFO. With 3 frames the faults are on 1,2,3,4,1,2,5,3,4 = 9 (hits on the second 1, 2 after 5, and the last 5). With 4 frames the faults are on 1,2,3,4,5,1,2,3,4,5 = 10 (hits only on the repeated 1 and 2 before 5). More memory gave more faults because in the 4-frame run FIFO evicts pages 1,2,3,4 in exactly the order they are needed next. The memory contents with 4 frames are not a superset of those with 3 frames, so FIFO violates the stack/inclusion property; LRU and OPT do not.</p>`,
      dry: { head: ['ref', '3 frames (oldest left)', '', '4 frames', ''], rows: [['1', '1 - -', 'F', '1 - - -', 'F'], ['2', '1 2 -', 'F', '1 2 - -', 'F'], ['3', '1 2 3', 'F', '1 2 3 -', 'F'], ['4', '4 2 3', 'F', '1 2 3 4', 'F'], ['1', '4 1 3', 'F', '1 2 3 4', 'hit'], ['2', '4 1 2', 'F', '1 2 3 4', 'hit'], ['5', '5 1 2', 'F', '5 2 3 4', 'F'], ['1', '5 1 2', 'hit', '5 1 3 4', 'F'], ['2', '5 1 2', 'hit', '5 1 2 4', 'F'], ['3', '5 3 2', 'F', '5 1 2 3', 'F'], ['4', '5 3 4', 'F', '4 1 2 3', 'F'], ['5', '5 3 4', 'hit', '4 5 2 3', 'F'], ['<b>faults</b>', '', '<b>9</b>', '', '<b>10</b>']] },
      complexity: `<p>O(R × F) with a naive scan (R references, F frames); O(R) with a queue and a hash set.</p>`,
      followUps: ['Run LRU on the same string with 3 and 4 frames. What do you get?', 'Prove why a stack algorithm cannot show the anomaly.']
    }
  }]
});

/* ================= TOPIC 7b: LRU and Optimal ================= */
topics.push({
  title: 'LRU and Optimal (OPT/MIN) Page Replacement',
  analogy: `<p><b>LRU</b> is like clearing your desk: put back the book you have <i>not touched for the longest time</i> - guess "if I have not used it recently, I probably will not soon". <b>OPT</b> is a fortune-teller: she knows your whole day and says "put back the book you will not need until the latest moment (or never)". Nobody can really be the fortune-teller, but she shows the best any plan could do.</p>`,
  explain: `<p>🟢 <b>LRU (Least Recently Used):</b> evict the page whose <i>last use</i> is oldest. It uses the past as a predictor of the future (temporal locality). Unlike FIFO, <b>every hit matters</b>: it moves the page to "most recently used".</p>
<p>🟢 <b>OPT / MIN (Belady's optimal):</b> evict the page whose <i>next use is farthest in the future</i> (or never). It gives the <b>lowest possible faults</b> for any reference string, but needs the future - so it is only a yardstick.</p>
<p>🔵 Trace on <code>7 0 1 2 0 3 0 4 2 3</code>, 3 frames:</p>
${H.table(['ref', 'LRU frames', 'LRU', 'OPT frames', 'OPT'], [['7', '7 - -', 'F', '7 - -', 'F'], ['0', '7 0 -', 'F', '7 0 -', 'F'], ['1', '7 0 1', 'F', '7 0 1', 'F'], ['2', '2 0 1', 'F (out 7)', '2 0 1', 'F (out 7)'], ['0', '2 0 1', 'hit', '2 0 1', 'hit'], ['3', '2 0 3', 'F (out 1)', '2 0 3', 'F (out 1)'], ['0', '2 0 3', 'hit', '2 0 3', 'hit'], ['4', '4 0 3', 'F (out 2)', '2 4 3', 'F (out 0: never again)'], ['2', '4 0 2', 'F (out 3)', '2 4 3', 'hit'], ['3', '4 3 2', 'F (out 0)', '2 4 3', 'hit'], ['<b>total</b>', '', '<b>8</b>', '', '<b>6</b>']])}
<p>FIFO gave 9, LRU 8, OPT 6. On the classic 20-reference string <code>7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1</code> with 3 frames: <b>FIFO 15, LRU 12, OPT 9</b>.</p>
<p><b>Implementing LRU:</b> a <i>counter/timestamp</i> in each page-table entry (scan for the smallest on a fault) or a <i>stack</i> (doubly linked list: move the page to the top on every reference). Both need work on <b>every memory reference</b> - far too slow for hardware/OS, so real systems use approximations (Clock - next topic).</p>
<p>The same LRU idea is the famous interview problem <b>LRU Cache</b> (hash map + doubly linked list, O(1) get/put).</p>`,
  clues: ['"least recently used" + "reference string" → keep recency order', '"optimal page replacement" → farthest next use, needs future knowledge', '"which algorithm gives the fewest faults?" → OPT (lower bound), not implementable', '"stack algorithm", "no Belady anomaly" → LRU, OPT', '"implement LRU with O(1)" → hash map + doubly linked list', '"exact LRU is too expensive in hardware" → approximations such as clock/aging'],
  code: [
    { lang: 'python', run: true, title: 'LRU in O(1) with OrderedDict, and OPT as a yardstick', code: `from collections import OrderedDict

def lru_faults(refs, nframes):
    cache = OrderedDict()                 # order: oldest ... newest use
    faults = 0
    for p in refs:
        if p in cache:
            cache.move_to_end(p)          # hit: becomes most recently used
        else:
            faults += 1
            if len(cache) == nframes:
                cache.popitem(last=False) # evict the least recently used
            cache[p] = True
    return faults

def opt_faults(refs, nframes):
    mem = []
    faults = 0
    for t, p in enumerate(refs):
        if p in mem:
            continue
        faults += 1
        if len(mem) < nframes:
            mem.append(p)
        else:
            def next_use(q):              # distance to next use, infinity if never
                rest = refs[t + 1:]
                return rest.index(q) if q in rest else float("inf")
            mem.remove(max(mem, key=next_use))
            mem.append(p)
    return faults

refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
print("LRU faults:", lru_faults(refs, 3))   # 12
print("OPT faults:", opt_faults(refs, 3))   # 9
for n in (1, 2, 3, 4, 5, 6, 7):             # LRU never gets worse with more frames
    print(n, "frames -> LRU", lru_faults(refs, n), " OPT", opt_faults(refs, n))` }
  ],
  codeTitle: ['LRU and OPT'],
  viz: [
    {
      title: 'LRU: frames after every reference',
      input: '7 0 1 2 0 3 0 4 2 3 ; 3',
      inputLabel: 'reference string ; number of frames (1-6)',
      gen: function (input) { return replFrames(input, 'LRU', 3); }
    },
    {
      title: 'Optimal (OPT): look into the future',
      input: '7 0 1 2 0 3 0 4 2 3 ; 3',
      inputLabel: 'reference string ; number of frames (1-6)',
      gen: function (input) { return replFrames(input, 'OPT', 3); }
    }
  ],
  examples: [
    { title: 'LRU on 3 frames, dry run', html: `<p>String 2 3 2 1 5 2 4 5 3 2 5 2: faults at 2,3,1,5,4,3,2 = <b>7</b>; OPT = 6; FIFO = 9. LRU is close to OPT whenever the program has good locality.</p>` },
    { title: 'When LRU is terrible: a loop slightly bigger than memory', html: `<p>Cyclic string 1 2 3 4 1 2 3 4 ... with 3 frames: LRU evicts exactly the page needed next, so <b>every</b> reference faults! OPT keeps 2 pages fixed and faults only once per cycle. This "sequential flooding" is why databases use special policies (MRU, 2Q, scan-resistant) for scans.</p>` },
    { title: 'More frames never hurt LRU', html: `<p>Because LRU's n-frame set is the n most recently used distinct pages, the (n+1)-frame set is that set plus one more. Faults(n+1) ≤ Faults(n). Run the Python above to see the monotone column.</p>` },
    { title: 'How OPT is used in practice', html: `<p>Designers replay a recorded trace offline with OPT to learn "how far from perfect are we?" and compare real policies against that bound.</p>` }
  ],
  deepDive: `<p>🟣 <b>Hardware cost of exact LRU.</b> A 64 GB machine has 16 million frames: exact recency ordering would need an update to a shared structure on every load/store - impossible. Hardware only gives an <b>accessed bit</b> per PTE; the OS samples it periodically.</p>
<p><b>Approximations.</b> <i>Reference-bit sampling</i>, <i>Clock</i>, <i>aging</i> (shift the reference bit into an 8-bit counter each tick; smallest counter = victim), <i>NFU</i>. Linux keeps <b>active and inactive lists</b> per memory zone (a page must be referenced twice to become active: scan-resistance), and since kernel 6.1 offers <b>MGLRU</b> (multi-generational LRU) which uses several generations and page-table walks to find young pages cheaply.</p>
<p><b>Why OPT is optimal (sketch).</b> Exchange argument: any algorithm that evicts a page needed sooner than OPT's choice can be swapped to OPT's choice without adding faults. Competitive analysis: LRU is k-competitive - in the worst case it faults at most k× (k = frames) as often as OPT, and no deterministic online algorithm does better.</p>
<p><b>Beyond LRU.</b> LFU (frequency), LRU-K, 2Q, ARC and CLOCK-Pro adapt to both recency and frequency; modern caches (Caffeine/W-TinyLFU) use frequency sketches. Same abstract problem as CPU caches, CDN edge caches, Redis eviction (allkeys-lru is sampled approximate LRU).</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> LRU-like eviction is everywhere in AI systems: KV-cache block eviction for LLM serving (evict least recently used conversations' blocks), embedding caches, feature stores, and prompt caches. Research uses learned eviction (predict next reuse) to approach OPT; production still leans on LRU variants because they are cheap and robust.</p>
<p><b>Use AI as a partner.</b> Ask it to implement LRU Cache in your target language, then <b>review its code</b> for O(1) on both operations, correct handling of capacity 0 and update-existing-key. Ask: "give me a reference string where LRU is as bad as possible (every access faults)".</p>
<p><b>Where AI goes wrong.</b> It confuses LRU with LFU, forgets to refresh recency on a <i>hit</i>, or claims OPT can be implemented in a real OS. <b>You must still own</b> the definitions and being able to trace both policies line by line.</p>`,
  problems: [{
    title: 'LRU vs OPT on a Reference String', level: 'Medium', tags: ['LRU', 'OPT', 'page replacement'], companies: ['Amazon', 'Adobe'],
    statement: `<p>Reference string <b>7 0 1 2 0 3 0 4 2 3</b>, <b>3 frames</b>. Compute the number of page faults for LRU and OPT, and list the victim chosen at each replacement. Which one is implementable in a real OS and why?</p>`,
    constraints: `Initially empty frames. In OPT, if two pages are never used again, evict either.`,
    example: `<p>LRU ${H.c('r', '8')} faults, OPT ${H.c('g', '6')} faults.</p>`,
    brute: { why: `<p>For OPT, re-scan the entire remaining string for every page at every fault: O(R × F × R). Fine for a handful of references but pointless for real traces - and the future is unknown in a real system anyway.</p>` },
    mcq: { q: 'At the fault for page 4 (frames 2 0 3, remaining string 2 3), OPT evicts…', options: ['2', '0 (never used again)', '3'], answer: 1, explain: 'Page 2 is used next, then 3; page 0 never appears again, so it is the farthest.' },
    hints: [`<p>Hint 1: LRU: keep the order of last use; the victim is the page used longest ago.</p>`, `<p>Hint 2: OPT: for each resident page, find its next occurrence in the rest of the string.</p>`, `<p>Hint 3: write both frame states side by side after every reference.</p>`],
    solution: {
      approach: `<p>Both policies fault on 7, 0, 1 (cold) and on 2 (evict 7, the oldest use and also never used again), on 3 (evict 1). The difference starts at 4: frames are [2 0 3]. LRU's recency order is 2 (used at step 4), 0 (step 7), 3 (step 6) so it evicts 2 and later faults again on 2 and on 3. OPT looks ahead: next uses are 2 then 3, while 0 is never used again, so it evicts 0 and gets hits on the last two references. Totals: LRU 8 faults, OPT 6 faults. Only LRU (or an approximation such as Clock) can be implemented because OPT needs knowledge of the future reference string.</p>`,
      dry: { head: ['ref', 'LRU frames', 'LRU', 'OPT frames', 'OPT'], rows: [['7', '7 - -', 'F', '7 - -', 'F'], ['0', '7 0 -', 'F', '7 0 -', 'F'], ['1', '7 0 1', 'F', '7 0 1', 'F'], ['2', '2 0 1', 'F (out 7)', '2 0 1', 'F (out 7)'], ['0', '2 0 1', 'hit', '2 0 1', 'hit'], ['3', '2 0 3', 'F (out 1)', '2 0 3', 'F (out 1)'], ['0', '2 0 3', 'hit', '2 0 3', 'hit'], ['4', '4 0 3', 'F (out 2)', '2 4 3', 'F (out 0)'], ['2', '4 0 2', 'F (out 3)', '2 4 3', 'hit'], ['3', '4 3 2', 'F (out 0)', '2 4 3', 'hit'], ['<b>total</b>', '', '<b>8</b>', '', '<b>6</b>']] },
      complexity: `<p>LRU O(1) per reference with a hash map plus doubly linked list; OPT O(R) per fault when scanning the future (offline only).</p>`,
      followUps: ['Give a string where LRU faults on every reference with 3 frames.', 'Why can LRU never exhibit Belady\'s anomaly?']
    }
  }]
});

/* ================= TOPIC 7c: Clock / second chance ================= */
topics.push({
  title: 'Clock (Second-Chance) and LRU Approximations',
  analogy: `<p>Picture a clock face with a <b>sticker on every page</b>: a green "recently used" star. A hand sweeps around. If the page under the hand has a star, the hand <b>peels the star off</b> (a second chance) and moves on; if there is no star, that page is thrown out. Pages used often get their star back before the hand returns, so they survive. It is a cheap way to approximate "least recently used" without keeping an exact order.</p>`,
  explain: `<p>🟢 <b>Reference (accessed) bit.</b> The hardware sets a bit in the page-table entry whenever the page is read or written. The OS can clear it. A bit = 1 means "used since I last looked".</p>
<p>🔵 <b>Second chance / Clock algorithm.</b> Keep the frames in a circular list with a <b>hand</b>. To evict:</p>
<ol><li>Look at the page under the hand.</li><li>If its reference bit is <b>1</b>: set it to 0 (second chance) and advance the hand.</li><li>If it is <b>0</b>: this is the victim. Replace it; put the new page there (bit = 1), advance the hand.</li></ol>
<p>On a hit, just set the page's bit to 1 (no list changes - that's why it is cheap). If all bits are 1, the hand clears them all and comes back to the first page: it degenerates to FIFO.</p>
${H.table(['ref', 'frames', 'ref bits', 'hand after', 'result'], [['2', '2 - -', '1 0 0', '0', '<span class="c-r">F</span>'], ['3', '2 3 -', '1 1 0', '0', '<span class="c-r">F</span>'], ['2', '2 3 -', '1 1 0', '0', '<span class="c-g">hit</span>'], ['1', '2 3 1', '1 1 1', '0', '<span class="c-r">F</span>'], ['5', '5 3 1', '1 0 0', '1', '<span class="c-r">F</span> (hand cleared all, evicted 2)'], ['2', '5 2 1', '1 1 0', '2', '<span class="c-r">F</span> (evicted 3)']])}
<p><b>Enhanced clock (NRU):</b> use the pair (reference R, modified M) and prefer victims in this order: (0,0) not used, clean → (0,1) not used, dirty → (1,0) → (1,1). Clean pages are cheaper to evict (no write-back).</p>
<p>Other approximations: <b>aging</b> (a counter that shifts in the reference bit every tick) and <b>NFU</b>.</p>`,
  clues: ['"second-chance algorithm", "clock algorithm", "reference bit" → hand sweeps and clears bits', '"approximate LRU with one bit per page"', '"enhanced / NRU: (reference, modify) pairs" → prefer clean unreferenced pages', '"if all reference bits are 1, clock behaves like…" → FIFO', '"hardware sets the accessed bit; OS clears it" → sampling', '"cost of write-back" → dirty bit in victim choice'],
  code: [
    { lang: 'cpp', title: 'Clock page replacement', code: `#include <iostream>
#include <vector>
using namespace std;

// Second-chance (clock) replacement. Returns the number of page faults.
int clockFaults(const vector<int>& refs, int nframes, bool verbose) {
    vector<int> frame(nframes, -1);   // -1 = empty
    vector<int> bit(nframes, 0);      // reference bits
    int hand = 0, faults = 0;
    for (int p : refs) {
        int slot = -1;
        for (int i = 0; i < nframes; ++i) if (frame[i] == p) slot = i;
        if (slot >= 0) {
            bit[slot] = 1;            // hit: just mark as recently used
        } else {
            ++faults;
            int victim = -1;
            for (int i = 0; i < nframes; ++i) if (frame[i] == -1) { victim = i; break; }
            if (victim < 0) {
                while (bit[hand] == 1) {          // second chance: clear and move on
                    bit[hand] = 0;
                    hand = (hand + 1) % nframes;
                }
                victim = hand;                    // bit is 0: evict this one
                hand = (hand + 1) % nframes;
            }
            frame[victim] = p;
            bit[victim] = 1;
        }
        if (verbose) {
            cout << "ref " << p << ": [";
            for (int i = 0; i < nframes; ++i) cout << (frame[i] < 0 ? '-' : char('0' + frame[i])) << (i + 1 < nframes ? " " : "");
            cout << "] bits=";
            for (int b : bit) cout << b;
            cout << " hand=" << hand << (slot >= 0 ? " hit" : " FAULT") << "\\n";
        }
    }
    return faults;
}

int main() {
    vector<int> refs = {2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2};
    cout << "faults = " << clockFaults(refs, 3, true) << "\\n";   // 8
}` }
  ],
  codeTitle: ['Clock algorithm'],
  viz: [
    {
      title: 'Clock hand sweeping over frames with reference bits',
      input: '2 3 2 1 5 2 4 5 3 2 5 2 ; 3',
      inputLabel: 'reference string ; number of frames (1-6)',
      gen: function (input) { return replFrames(input, 'CLOCK', 3); }
    },
    {
      title: 'All four policies compared',
      input: '7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1 ; 3',
      inputLabel: 'reference string ; number of frames (1-6)',
      gen: function (input) {
        var q = parseRefs(input, 3), algos = ['FIFO', 'LRU', 'OPT', 'CLOCK'], res = {}, f = [];
        algos.forEach(function (a) { res[a] = simulate(q.refs, q.n, a); });
        f.push({ narr: 'Same reference string (' + q.refs.length + ' references) and ' + q.n + ' frames for each of the four policies.', parts: [{ type: 'text', html: q.refs.join(' ') }] });
        var vals = [], labs = [];
        algos.forEach(function (a) {
          vals.push(res[a].faults); labs.push(a);
          var h = {}; vals.forEach(function (v, i) { h[i] = 'ok'; });
          f.push({ narr: '<b>' + a + '</b> → ' + res[a].faults + ' faults (' + Math.round(100 * (q.refs.length - res[a].faults) / q.refs.length) + '% hits).', parts: [{ type: 'bars', label: 'page faults', values: vals.slice(), idxLabels: labs.slice(), hl: h }, gridPart(res[a], q.refs, q.n, q.refs.length - 1, a + ' frames')] });
        });
        f.push({ narr: 'OPT is the floor (' + res.OPT.faults + '). LRU (' + res.LRU.faults + ') and Clock (' + res.CLOCK.faults + ') sit between OPT and FIFO (' + res.FIFO.faults + ') on typical strings, but no online algorithm wins on every string.', parts: [{ type: 'bars', label: 'page faults (lower is better)', values: algos.map(function (a) { return res[a].faults; }), idxLabels: algos, hl: { 0: 'bad', 1: 'win', 2: 'ok', 3: 'sel' } }] });
        return f;
      }
    }
  ],
  examples: [
    { title: 'Clock trace (3 frames)', html: `<p>String 2 3 2 1 5 2 4 5 3 2 5 2 gives <b>8 faults</b> (LRU 7, OPT 6, FIFO 9). Notice at ref 5 the hand cleared all three bits (1 1 1 → 0 0 0), came back to frame 1 and evicted page 2, exactly like FIFO.</p>` },
    { title: 'Why hits are cheap', html: `<p>A hit under LRU must move the page in a linked list (pointer updates, locking). Under Clock a hit sets one bit - in hardware, with no OS involvement. That difference is why every real OS uses Clock-like schemes.</p>` },
    { title: 'Enhanced clock priorities', html: `<p>Four classes by (R, M): (0,0) best victim, (0,1) must write back, (1,0) recently used but clean, (1,1) worst. Evicting a dirty page costs an extra disk write, so the OS scans for (0,0) first, then (0,1)...</p>` },
    { title: 'Aging', html: `<p>Every timer tick: counter = (counter &gt;&gt; 1) | (R &lt;&lt; 7); R = 0. The page with the smallest counter is the victim. Counters 0b10000000 (used this tick) &gt; 0b01000000 (used last tick) - it keeps 8 ticks of history and approximates LRU well.</p>` }
  ],
  deepDive: `<p>🟣 <b>Two-handed clock.</b> BSD/Unix uses two hands separated by a distance: the front hand clears reference bits, the back hand (a little later) evicts pages whose bit is still 0. The gap sets how long a page has to prove itself, and the sweep speed adapts to memory pressure.</p>
<p><b>Linux.</b> Pages sit in <b>active</b> and <b>inactive</b> lists (anonymous and file-backed separately). <code>kswapd</code> scans the inactive list; a page found referenced is promoted (activated); reclaimed pages that are dirty are written back first. <b>MGLRU</b> (6.1+) generalises this to multiple generations, aging via page-table scans, giving better behaviour for large-memory servers and Android. Reverse mapping (rmap) is used to check/clear the accessed bit in every PTE that maps a shared page.</p>
<p><b>Working-set clock (WSClock).</b> Combines the clock with working-set timestamps: evict a page with R = 0 whose age exceeds τ; if the page is dirty, schedule a write-back and continue. Popular in practice (a refinement used in many kernels).</p>
<p><b>Page cache vs anonymous memory.</b> File-backed clean pages are cheap to drop; anonymous pages need swap. The <code>swappiness</code> knob biases the choice.</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> Memory-hungry AI jobs trigger heavy reclaim: when GPU nodes run dataloaders with large page caches plus pinned buffers, kernels fight between caching and application memory. Observability tools now summarise <code>vmstat</code>/PSI (pressure stall information) for you; learn what "active/inactive" and "PSI memory some/full" mean so you can read their summaries critically.</p>
<p><b>Use AI as a partner.</b> Have it generate 5 clock traces with tricky all-bits-set situations; trace by hand first. Ask: "explain two-handed clock like I am 12, then like a kernel engineer".</p>
<p><b>Where AI goes wrong.</b> It forgets to set the bit on a <i>hit</i> or on a <i>newly loaded</i> page, or leaves the hand where it was after a replacement. Different textbooks differ on these conventions, so the answer can change by one fault - <b>state your convention</b> (here: new page gets bit 1, hand moves to the next frame after a replacement).</p>`,
  problems: [{
    title: 'Trace the Clock Algorithm', level: 'Hard', tags: ['clock', 'second chance', 'reference bit'], companies: ['Google', 'Red Hat'],
    statement: `<p>3 frames, reference string <b>2 3 2 1 5 2 4 5 3 2 5 2</b>. Use the clock algorithm: a loaded page gets reference bit 1, a hit sets the bit to 1, the hand starts at frame 1 and moves to the next frame after every replacement. List frames, bits and hand after each reference and the fault count.</p>`,
    constraints: `Empty frames are filled in order first (hand does not move while filling).`,
    example: `<p>Final answer: ${H.c('b', '8 faults')}.</p>`,
    brute: { why: `<p>Treat Clock as FIFO (ignore bits): you get 9 faults - wrong. The reference bits change which page the hand evicts.</p>` },
    mcq: { q: 'Page under the hand has reference bit 1. The hand…', options: ['evicts it anyway', 'clears the bit and moves on', 'sets the bit to 2'], answer: 1, explain: 'That is the "second chance": clear the bit, advance, and look at the next frame.' },
    hints: [`<p>Hint 1: write frames and bits as two rows after every reference.</p>`, `<p>Hint 2: a fault with full frames: loop - if bit = 1 clear it and advance; else replace.</p>`, `<p>Hint 3: after replacing, set the new page's bit to 1 and move the hand forward.</p>`],
    solution: {
      approach: `<p>Fill frames 1-3 with 2, 3, 1 (hit on the second 2 sets its bit). When 5 arrives all bits are 1: the hand clears bits of frames 1, 2, 3 and returns to frame 1 (bit 0), which holds 2, so page 2 is evicted and the hand moves to frame 2. Continuing, faults occur at 2 (evicts 3), 4 (evicts 1), 3 (a full sweep again, evicts 5), and 5 (evicts 4); hits are the 2nd 2, 5, 2 and the last 2. Total faults: 8 (2, 3, 1, 5, 2, 4, 3, 5).</p>`,
      dry: { head: ['ref', 'frames', 'bits', 'hand after', 'result'], rows: [['2', '2 - -', '1 0 0', '0', 'F'], ['3', '2 3 -', '1 1 0', '0', 'F'], ['2', '2 3 -', '1 1 0', '0', 'hit'], ['1', '2 3 1', '1 1 1', '0', 'F'], ['5', '5 3 1', '1 0 0', '1', 'F (cleared all, out 2)'], ['2', '5 2 1', '1 1 0', '2', 'F (out 3)'], ['4', '5 2 4', '1 1 1', '0', 'F (out 1)'], ['5', '5 2 4', '1 1 1', '0', 'hit'], ['3', '3 2 4', '1 0 0', '1', 'F (cleared all, out 5)'], ['2', '3 2 4', '1 1 0', '1', 'hit'], ['5', '3 2 5', '1 0 1', '0', 'F (out 4)'], ['2', '3 2 5', '1 1 1', '0', 'hit'], ['<b>faults</b>', '', '', '', '<b>8</b>']] },
      complexity: `<p>Amortised O(1) per reference: each bit is cleared at most once per set.</p>`,
      followUps: ['What happens if every bit is 1 and the hand makes a full circle?', 'How would you add the dirty bit (enhanced clock)?']
    }
  }]
});

/* ================= TOPIC 8: working set & thrashing ================= */
topics.push({
  title: 'Working Set, Locality & Thrashing',
  analogy: `<p>A student has a small desk that fits 4 books. Writing one essay needs 3 books - fine. Now the teacher piles on <b>more essays at the same time</b>. Each essay needs its own 3 books, the desk holds only 4, so the student spends the whole evening <b>carrying books to and from the library</b> and writes almost nothing. The student is busy every minute but gets no work done: that is <b>thrashing</b>. The cure is not "faster walking" - it is working on fewer essays at once.</p>`,
  explain: `<p>🟢 <b>Locality.</b> Programs do not touch memory randomly. <i>Temporal locality</i>: pages used recently are used again soon. <i>Spatial locality</i>: nearby addresses are used together. Over a short time a program works in a small set of pages - a <b>locality</b> - then moves to another (a new function, a new loop).</p>
<p>🔵 <b>Working set.</b> <code>WS(t, Δ)</code> = the set of distinct pages referenced in the last <b>Δ</b> references (a sliding window). Its size is the WSS. Example Δ = 5 on <code>1 2 3 1 2 4 4 4 5 6 5 6 5 6 7 8 7 8 7 8</code>:</p>
${H.table(['After reference #', 'Last 5 references', 'Working set', 'WSS'], [['5', '1 2 3 1 2', '{1, 2, 3}', '3'], ['9', '2 4 4 4 5', '{2, 4, 5}', '3'], ['14', '6 5 6 5 6', '{5, 6}', '2'], ['20', '8 7 8 7 8', '{7, 8}', '2']])}
<p><b>Rule:</b> to run without constant faulting, a process needs about WSS frames. If <b>Σ WSS<sub>i</sub> &gt; total frames m</b>, there is not enough memory for everyone's working set.</p>
<p>🔴 <b>Thrashing</b> = a process (or the whole system) spends more time paging than executing. Chain reaction: too many processes → each gets fewer frames than its working set → faults rise → processes wait for the disk → <b>CPU utilisation drops</b> → the scheduler sees an idle CPU and <i>admits even more processes</i> → even worse.</p>
${H.table(['Symptom', 'Value during thrashing'], [['CPU utilisation', 'very low (e.g. 5-15%)'], ['Page-fault rate', 'very high'], ['Disk (swap) activity', 'near 100% busy'], ['System feels', 'frozen, but the disk light is on']])}
<p><b>Fixes:</b> (1) <b>Working-set model</b>: only keep a process running if its whole working set fits; otherwise <i>suspend/swap out</i> a whole process. (2) <b>Page-fault frequency (PFF)</b>: if a process's fault rate is above an upper bound give it frames (or suspend someone); below a lower bound take frames away. (3) <b>Local replacement</b> so one process cannot steal others' frames. (4) Add RAM, lower multiprogramming, fix the program's access pattern (loop tiling).</p>`,
  clues: ['"CPU utilisation low, disk utilisation high, many processes" → thrashing', '"OS increases multiprogramming because CPU is idle" → the thrashing feedback loop', '"working set window Δ" → distinct pages in the last Δ references', '"sum of working-set sizes exceeds the number of frames" → suspend a process', '"page-fault frequency (PFF) upper/lower bound"', '"locality of reference" → why caching/paging works at all'],
  code: [
    { lang: 'python', run: true, title: 'Working-set sizes and a thrashing check (runnable)', code: `def working_set(refs, t, delta):
    """Distinct pages among the last 'delta' references ending at index t."""
    return set(refs[max(0, t - delta + 1): t + 1])

refs = [1, 2, 3, 1, 2, 4, 4, 4, 5, 6, 5, 6, 5, 6, 7, 8, 7, 8, 7, 8]
delta = 5
print("t  ref  WS                WSS")
for t, p in enumerate(refs):
    ws = working_set(refs, t, delta)
    print(f"{t + 1:2d}  {p:3d}  {str(sorted(ws)):16s}  {len(ws)}")

# Thrashing test: do all working sets fit in physical memory?
frames_total = 100
demand = {"A": 40, "B": 35, "C": 30, "D": 25}           # WSS of each process
total = sum(demand.values())
print()
print(f"total demand = {total} frames, available = {frames_total}")
if total > frames_total:
    print("THRASHING risk -> suspend processes until the sum fits")
    run = dict(demand)
    for victim in sorted(demand, key=demand.get, reverse=True):
        if sum(run.values()) <= frames_total:
            break
        del run[victim]
        print("  suspend", victim, "-> remaining demand", sum(run.values()))

# Simple model of CPU utilisation vs multiprogramming degree n
print()
io_wait, frames, need = 0.6, 120, 15
for n in range(1, 15):
    util = 1 - io_wait ** n                                # more processes -> CPU busier ...
    if n * need > frames:                                  # ... until memory is too small
        util *= (frames / (n * need)) ** 3                 # fault storm
    print(f"n={n:2d} util={util:5.1%} " + "#" * int(util * 40))` }
  ],
  codeTitle: ['Working set and thrashing'],
  viz: [
    {
      title: 'Thrashing: CPU utilisation vs degree of multiprogramming',
      input: '120 15',
      inputLabel: 'total frames, frames each process needs (its working set)',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length < 2 || a.some(isNaN) || a[0] < 20 || a[0] > 4096 || a[1] < 1 || a[1] > a[0]) throw new Error('Enter: totalFrames workingSetPerProcess  e.g. 120 15');
        var m = a[0], need = a[1], cap = Math.floor(m / need), pw = 0.6, vals = [], labs = [], f = [], peak = 0, pi = 0;
        var maxN = Math.min(16, cap + 6);
        f.push({ narr: 'Machine has <b>' + m + '</b> frames; each process needs a working set of <b>' + need + '</b> frames, so up to <b>' + cap + '</b> processes fit. Each process waits for I/O 60% of the time, so more processes keep the CPU busier... until memory runs out.', parts: [{ type: 'vars', vals: { frames: m, working_set_each: need, fit: cap } }] });
        for (var n = 1; n <= maxN; n++) {
          var u = 1 - Math.pow(pw, n);
          if (n * need > m) u *= Math.pow(m / (n * need), 3);
          u = Math.round(u * 100); vals.push(u); labs.push(String(n));
          if (u > peak) { peak = u; pi = n - 1; }
          var hl = {}, i; for (i = 0; i < vals.length; i++) hl[i] = (i + 1 <= cap) ? 'ok' : 'bad';
          var over = n * need > m;
          f.push({ narr: 'Degree of multiprogramming <b>n = ' + n + '</b>: demand = ' + (n * need) + ' frames ' + (over ? '<span class="c-r">&gt; ' + m + ' → processes get fewer frames than their working set → page-fault storm → CPU utilisation ' + (u < vals[Math.max(0, vals.length - 2)] ? 'FALLS' : 'rises slowly') + ' to ' + u + '%.</span>' : '≤ ' + m + ' → everyone fits; utilisation rises to <b>' + u + '%</b>.'), parts: [{ type: 'bars', label: 'CPU utilisation (%) vs number of processes', values: vals.slice(), idxLabels: labs.slice(), texts: vals.map(function (x) { return x + '%'; }), hl: hl }] });
        }
        var fin = {}; fin[pi] = 'sel';
        f.push({ narr: 'The peak is at <b>n = ' + (pi + 1) + '</b> (' + peak + '%). Beyond it, adding processes <i>reduces</i> throughput. A scheduler that adds processes whenever the CPU looks idle will drive the machine off this cliff - the OS must limit multiprogramming (suspend processes) using working sets or page-fault frequency.', parts: [{ type: 'bars', label: 'CPU utilisation (%) - peak highlighted', values: vals.slice(), idxLabels: labs.slice(), texts: vals.map(function (x) { return x + '%'; }), hl: fin }] });
        return f;
      }
    },
    {
      title: 'Working set window sliding over a reference string',
      input: '1 2 3 1 2 4 4 4 5 6 5 6 5 6 7 8 7 8 7 8 ; 5',
      inputLabel: 'reference string ; window size Δ (1-10)',
      gen: function (input) {
        var parts = String(input).split(';'), refs = parts[0].trim().split(/[\s,]+/).map(Number), d = parts[1] ? Number(parts[1]) : 5;
        if (!refs.length || refs.some(function (x) { return isNaN(x) || x < 0; }) || refs.length > 24 || isNaN(d) || d < 1 || d > 10) throw new Error('Format: 1 2 3 1 2 4 4 4 5 6 ; 5   (up to 24 references, window 1..10)');
        var f = [], wss = [];
        f.push({ narr: 'Working set WS(t, Δ) = distinct pages in the last <b>Δ = ' + d + '</b> references. The window slides one step per reference.', parts: [{ type: 'array', label: 'reference string', values: refs }] });
        for (var t = 0; t < refs.length; t++) {
          var lo = Math.max(0, t - d + 1), ws = [];
          for (var i = lo; i <= t; i++) if (ws.indexOf(refs[i]) < 0) ws.push(refs[i]);
          ws.sort(function (x, y) { return x - y; });
          wss.push(ws.length);
          var hl = {}, ptr = {}; for (i = lo; i <= t; i++) hl[i] = 'win'; hl[t] = 'cur'; ptr[t] = 't';
          var hs = {}; ws.forEach(function (p) { hs[p] = 'sel'; });
          f.push({ narr: 'At t = ' + (t + 1) + ' (page ' + refs[t] + '): window holds ' + refs.slice(lo, t + 1).join(' ') + ' → working set {' + ws.join(', ') + '}, <b>WSS = ' + ws.length + '</b>.', parts: [{ type: 'array', label: 'window (blue), current (amber)', values: refs, hl: hl, ptr: ptr }, { type: 'set', label: 'working set', items: ws, hl: hs }] });
        }
        var mx = Math.max.apply(null, wss);
        f.push({ narr: 'WSS over time. It is <b>small and stable inside a locality</b> and spikes when the program moves to a new one. Peak WSS = <b>' + mx + '</b>: give the process at least that many frames and it will rarely fault.', parts: [{ type: 'bars', label: 'WSS at each reference', values: wss, idxLabels: refs.map(String), hl: wss.reduce(function (o, v, i) { if (v === mx) o[i] = 'sel'; return o; }, {}) }] });
        return f;
      }
    }
  ],
  examples: [
    { title: 'Diagnosing from numbers', html: `<p>CPU 8%, disk 97%, free memory ~0, swap-in/out 5000 pages/s, 40 processes. This is <b>thrashing</b>, not "slow disk". Do NOT add processes; suspend some or add RAM.</p>` },
    { title: 'Σ WSS check', html: `<p>m = 100 frames; processes need 40, 35, 30, 25 → total 130 &gt; 100 → thrash. Suspend the 30-frame process → 100 ≤ 100: the remaining three all fit (they stay in memory, the suspended one is swapped out whole).</p>` },
    { title: 'PFF controller', html: `<p>Upper bound 10 faults/s, lower bound 1 fault/s. A process at 25 faults/s gets more frames (if none are free: suspend a process). A process at 0.2 faults/s loses a frame. Fault rate becomes a feedback signal.</p>` },
    { title: 'Program-level thrashing', html: `<p>Summing a 2D array column-by-column when it is stored row-by-row touches a new page on every access: with fewer frames than rows it faults on <i>every</i> access. Swapping the loops (row-major order) or tiling fixes it without any OS change.</p>` }
  ],
  deepDive: `<p>🟣 <b>Denning's working-set model (1968).</b> Choose Δ so that WS(t, Δ) captures the current locality: too small → misses part of it (faults); too large → includes stale pages (waste). The OS tracks it approximately with the reference bit: at every timer tick, mark pages whose bit was set and clear it; a page unused for the last Δ time units drops out. WSClock integrates this into the clock hand.</p>
<p><b>Modern forms of thrashing.</b> (1) <b>Page-cache thrashing</b>: working set of file data bigger than RAM so the same files are re-read repeatedly (databases, build servers). (2) <b>TLB thrashing</b>: working set larger than TLB reach. (3) <b>Cache thrashing</b> in CPU caches (associativity conflicts). (4) <b>cgroup memory limits</b> in containers: a pod that hits its limit stalls in direct reclaim - high latency but not killed until OOM. Linux's <b>PSI</b> (<code>/proc/pressure/memory</code>, "some"/"full" stall percentages) is the modern thrashing detector; <code>systemd-oomd</code> and Facebook's <code>oomd</code> act on it before the kernel OOM killer.</p>
<p><b>Why swap is not the villain.</b> A little swap parks truly idle pages and leaves RAM for cache. Thrashing is about the <i>active</i> working set not fitting, regardless of whether swap exists.</p>
<p><b>Admission control.</b> Mature systems (Android low-memory killer, Kubernetes requests/limits) refuse or kill work instead of letting everyone thrash - the same principle as suspending processes in the working-set model.</p>`,
  aiEra: `<p>🤖 <b>What AI changes.</b> Large-model training and serving are the new thrashing risks: CPU-offloaded optimizer states, KV-cache offload to host memory, or two inference servers sharing one GPU can push the system into constant swapping (GPU "unified memory" oversubscription can be 10-100× slower). Schedulers for AI clusters therefore use <i>admission control</i> and memory requests exactly like the working-set rule: don't admit work whose working set doesn't fit.</p>
<p><b>Use AI as a partner.</b> Feed <code>vmstat 1</code>, <code>/proc/pressure/memory</code> and <code>free -m</code> output to an assistant and ask it to classify "thrashing / leak / healthy cache"; then ask what extra evidence would distinguish them. Treat its answer as a hypothesis.</p>
<p><b>Where AI goes wrong.</b> It recommends "increase swap" as a fix for thrashing (which only delays the OOM) or tells you to raise <code>swappiness</code> blindly. <b>You must still own</b> the reasoning: demand (ΣWSS) versus supply (frames), and the feedback loop that makes it self-reinforcing.</p>`,
  problems: [{
    title: 'Diagnose Thrashing and Choose an Action', level: 'Medium', tags: ['thrashing', 'working set'], companies: ['Google', 'Meta'],
    statement: `<p>A server with <b>100 frames</b> runs four processes whose working-set sizes are <b>40, 35, 30 and 25</b> frames. CPU utilisation is 9% and the swap disk is saturated. (a) Is the system thrashing? Why? (b) The scheduler sees low CPU use and starts a fifth process needing 20 frames - what happens? (c) What should the OS do (working-set policy)?</p>`,
    constraints: `Use the working-set model: a process runs only if its whole working set fits.`,
    example: `<p>Σ WSS = ${H.c('r', '130')} &gt; 100 frames → thrashing. Suspend the 30-frame process → ${H.c('g', '100 ≤ 100')}.</p>`,
    brute: { why: `<p>"CPU is idle, so start more processes" is the naive scheduler reaction. It raises demand to 150 frames and makes things dramatically worse.</p>` },
    mcq: { q: 'What is the best first response to thrashing?', options: ['Add more processes to use the idle CPU', 'Reduce the degree of multiprogramming (suspend/swap out a process)', 'Make the page size smaller'], answer: 1, explain: 'Fewer processes → each gets its working set → faults drop → CPU is useful again.' },
    hints: [`<p>Hint 1: demand = sum of working-set sizes; supply = frames.</p>`, `<p>Hint 2: low CPU + saturated disk + demand &gt; supply = thrashing.</p>`, `<p>Hint 3: suspend whole processes (not take a few frames from each) until demand ≤ supply.</p>`],
    solution: {
      approach: `<p>(a) Yes. Demand 40 + 35 + 30 + 25 = 130 frames but only 100 exist, so every process lacks part of its working set, faults constantly and waits on the disk, which explains 9% CPU and a saturated swap device. (b) A fifth process raises demand to 150, makes faults even more frequent, further lowers CPU utilisation - the feedback loop of thrashing. (c) Lower the degree of multiprogramming: swap out an entire process, for instance the 30-frame one, so demand falls to 100, which exactly fits. The suspended process resumes later when memory frees up. Longer term: add RAM, use PFF limits or cgroup limits, and tune the application's memory use.</p>`,
      dry: { head: ['Step', 'Demand (Σ WSS)', 'Frames', 'Verdict'], rows: [['4 processes', '40+35+30+25 = 130', '100', '<span class="c-r">130 &gt; 100 thrash</span>'], ['+ 5th process (20)', '150', '100', '<span class="c-r">worse</span>'], ['suspend 30', '100', '100', '<span class="c-g">fits</span>'], ['(alt) suspend 40', '90', '100', '<span class="c-g">fits, 10 spare</span>']] },
      complexity: `<p>Simple arithmetic; in the kernel, working sets are estimated using reference bits.</p>`,
      followUps: ['Which process should be suspended (priority, size, I/O-bound)?', 'How does PFF solve the same problem without measuring working sets?']
    }
  }]
});

/* ================= PRACTICE ================= */
// Build a dry-run table from the simulator: ref | frames+result for each chosen policy.
function dryRows(refs, n, algos) {
  var rs = algos.map(function (a) { return simulate(refs, n, a); });
  var rows = refs.map(function (p, t) {
    var row = [String(p)];
    rs.forEach(function (r) {
      var c = r.cols[t];
      row.push(c.fr.map(function (x) { return x === null ? '-' : x; }).join(' '));
      row.push(c.fault ? '<span class="c-r">F</span>' + (c.ev !== null ? ' (out ' + c.ev + ')' : '') : '<span class="c-g">hit</span>');
    });
    return row;
  });
  var tot = ['<b>faults</b>']; rs.forEach(function (r) { tot.push(''); tot.push('<b>' + r.faults + '</b>'); });
  rows.push(tot);
  return rows;
}
function dryHead(algos) { var h = ['ref']; algos.forEach(function (a) { h.push(a + ' frames'); h.push(a); }); return h; }

practice.push({
  title: 'Bits, Frames and Page Table Entries', level: 'Easy', tags: ['paging', 'address bits'], companies: ['Intel', 'Cisco'],
  statement: `<p>A system has a 32-bit virtual address, <b>4 KB</b> pages and <b>1 GB</b> of physical RAM. How many bits are the page number and the offset? How many entries does a flat page table have? How many physical frames exist and how many bits does a frame number need?</p>`,
  constraints: `1 GB = 2<sup>30</sup> bytes, 4 KB = 2<sup>12</sup> bytes.`,
  example: `<p>Offset ${H.c('y', '12 bits')}, page number ${H.c('b', '20 bits')}, entries 2<sup>20</sup>, frames 2<sup>18</sup>.</p>`,
  brute: { why: `<p>Memorising "4 KB means 12 bits" without understanding breaks the moment the page size changes to 8 KB or 64 KB. Derive from the power of two instead.</p>` },
  mcq: { q: 'Doubling the page size (4 KB → 8 KB) on a 32-bit system changes the page-number width to…', options: ['21 bits', '19 bits', '20 bits'], answer: 1, explain: 'Offset grows to 13 bits so the page number shrinks to 32 - 13 = 19 bits.' },
  hints: [`<p>Hint 1: page size 2<sup>k</sup> → k offset bits. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: page-number bits = total address bits - k.</p>`, `<p>Hint 3: frames = RAM / page size = 2<sup>30</sup> / 2<sup>12</sup>. Write the numbers down step by step before moving on.</p>`],
  solution: {
    approach: `<p>4 KB = 2<sup>12</sup> so the offset is 12 bits. The page number is 32 - 12 = 20 bits, which means 2<sup>20</sup> = 1,048,576 page-table entries in a flat table. Physical RAM of 2<sup>30</sup> bytes divided into 2<sup>12</sup>-byte frames gives 2<sup>18</sup> = 262,144 frames, so a frame number needs 18 bits (a PTE therefore needs at least 18 bits plus valid/protection bits - 4 bytes is plenty).</p>`,
    complexity: `<p>Constant-time arithmetic.</p>`
  }
});

practice.push({
  title: 'Translate with 1 KB Pages', level: 'Easy', tags: ['address translation'], companies: ['Qualcomm', 'Broadcom'],
  statement: `<p>Page size is <b>1 KB</b>. The page table is: page 0 → frame 3, page 1 → frame 8, page 2 → frame 5, page 3 → frame 6. Translate virtual addresses <b>2500</b> and <b>4100</b>.</p>`,
  constraints: `Pages beyond the table length are invalid.`,
  example: `<p>2500 → page 2, offset 452 → frame 5 → ${H.c('g', '5572')}. 4100 → page 4 → ${H.c('r', 'invalid')}.</p>`,
  brute: { why: `<p>Subtracting 1024 repeatedly until the address fits - correct but slow and error-prone. Use integer division and remainder.</p>` },
  mcq: { q: '2500 mod 1024 equals…', options: ['452', '476', '2500'], answer: 0, explain: '2500 - 2 × 1024 = 452.' },
  hints: [`<p>Hint 1: page = ⌊VA / 1024⌋. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: offset = VA mod 1024. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: PA = frame × 1024 + offset; check the page is within the table.</p>`],
  solution: {
    approach: `<p>For 2500: page = ⌊2500 / 1024⌋ = 2 and offset = 2500 - 2048 = 452. Page 2 maps to frame 5, so PA = 5 × 1024 + 452 = 5572. For 4100: page = ⌊4100 / 1024⌋ = 4, but the table only has pages 0-3, so the MMU raises an invalid-address fault (segmentation fault); no physical address exists.</p>`,
    dry: { head: ['VA', 'page', 'offset', 'frame', 'PA'], rows: [['2500', '2', '452', '5', '5×1024+452 = <b>5572</b>'], ['4100', '4', '4', '<span class="c-r">none</span>', '<span class="c-r">invalid</span>']] },
    complexity: `<p>O(1): a few shifts, masks, comparisons and table reads, constant time.</p>`
  }
});

practice.push({
  title: 'Internal Fragmentation and Frame Count', level: 'Easy', tags: ['internal fragmentation'], companies: ['Dell', 'HP'],
  statement: `<p>RAM is <b>256 MB</b>, page size <b>8 KB</b>. (a) How many frames? (b) A process needs <b>100,000 bytes</b>: how many pages and how many bytes are wasted in its last page?</p>`,
  constraints: `1 KB = 1024 bytes.`,
  example: `<p>(a) ${H.c('b', '32,768 frames')}; (b) 13 pages, ${H.c('r', '6,496 bytes')} wasted.</p>`,
  brute: { why: `<p>Guessing "about half a page wasted" - true on average, but a question asks for the exact number for this specific size.</p>` },
  mcq: { q: 'Which fragmentation does paging eliminate?', options: ['External fragmentation', 'Internal fragmentation', 'Both'], answer: 0, explain: 'Any free frame can hold any page, so no hole is too small. The last page of each process may still be partly empty.' },
  hints: [`<p>Hint 1: 256 MB = 2<sup>28</sup>, 8 KB = 2<sup>13</sup>. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: pages = ⌈size / page size⌉. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: waste = pages × page size - size. Write the numbers down step by step before moving on.</p>`],
  solution: {
    approach: `<p>(a) Frames = 2<sup>28</sup> / 2<sup>13</sup> = 2<sup>15</sup> = 32,768. (b) 100,000 / 8192 = 12.2, so the process needs ⌈12.2⌉ = 13 pages = 13 × 8192 = 106,496 bytes. Wasted = 106,496 - 100,000 = 6,496 bytes, all inside the last page - internal fragmentation. Smaller pages would waste less but need larger page tables.</p>`,
    complexity: `<p>O(1): a few shifts, masks, comparisons and table reads, constant time.</p>`
  }
});

practice.push({
  title: 'FIFO Fault Count (3 Frames)', level: 'Easy', tags: ['FIFO', 'page replacement'], companies: ['TCS', 'Infosys'],
  statement: `<p>Reference string <b>2 3 2 1 5 2 4 5 3 2 5 2</b>, <b>3 frames</b>, FIFO replacement. How many page faults? What is the hit ratio?</p>`,
  constraints: `All frames start empty.`,
  example: `<p>${H.c('r', '9 faults')}, 3 hits → hit ratio 25%.</p>`,
  brute: { why: `<p>Counting distinct pages (5) as the answer forgets that evicted pages fault again.</p>` },
  mcq: { q: 'Does a hit change FIFO\'s eviction order?', options: ['Yes, the page moves to the back', 'No, order depends on arrival only', 'Only for dirty pages'], answer: 1, explain: 'FIFO ignores usage; that is why it can evict hot pages.' },
  hints: [`<p>Hint 1: keep frames as a queue in arrival order.</p>`, `<p>Hint 2: on a fault with full frames remove the oldest.</p>`, `<p>Hint 3: write F or hit under every reference and count F.</p>`],
  solution: {
    approach: `<p>Trace FIFO with a queue of pages in arrival order: when a fault happens and all 3 frames are full, remove the page at the front (the oldest arrival) and add the new page at the back; a hit changes nothing. The dry-run table below shows the frames after every reference: there are 9 faults and 3 hits among the 12 references, so the hit ratio is 3 / 12 = 25%. Only 5 distinct pages appear, so 5 faults were unavoidable; the other 4 are caused by FIFO throwing out pages that were needed again soon.`,
    dry: { head: dryHead(['FIFO']), rows: dryRows([2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2], 3, ['FIFO']) },
    complexity: `<p>O(R) with a queue and a set.</p>`
  }
});

practice.push({
  title: 'LRU and OPT on the Same String', level: 'Medium', tags: ['LRU', 'OPT'], companies: ['Amazon', 'Nvidia'],
  statement: `<p>Same reference string <b>2 3 2 1 5 2 4 5 3 2 5 2</b> with <b>3 frames</b>. Compute the faults for LRU and OPT and compare with FIFO (9).</p>`,
  constraints: `Ties in OPT (pages never used again): choose any.`,
  example: `<p>LRU ${H.c('b', '7')}, OPT ${H.c('g', '6')}, FIFO ${H.c('r', '9')}.</p>`,
  brute: { why: `<p>Assuming LRU = OPT for locality-friendly strings; they differ whenever the past misleads about the future.</p>` },
  mcq: { q: 'Which is always ≤ the others on any string?', options: ['LRU', 'FIFO', 'OPT'], answer: 2, explain: 'OPT is optimal by definition: it never has more faults than any other algorithm.' },
  hints: [`<p>Hint 1: LRU victim = page whose last use is oldest.</p>`, `<p>Hint 2: OPT victim = page whose next use is farthest away.</p>`, `<p>Hint 3: trace side by side; the first difference appears when the first eviction decision differs.</p>`],
  solution: {
    approach: `<p>Both policies fault on the cold references 2, 3, 1 and 5 (5 evicts a page because the frames are full). LRU always evicts the page with the oldest last use, which works well here and gives 7 faults (the table shows the exact positions of faults and hits). OPT looks ahead and keeps the pages 2 and 5 that are reused at the end, giving 6 faults. The ordering OPT (6) &lt; LRU (7) &lt; FIFO (9) is typical for strings with locality; OPT is never beaten, but LRU is not guaranteed to beat FIFO on every string.</p>`,
    dry: { head: dryHead(['LRU', 'OPT']), rows: dryRows([2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2], 3, ['LRU', 'OPT']) },
    complexity: `<p>LRU O(R) with OrderedDict; OPT O(R × F × R) naive.</p>`
  }
});

practice.push({
  title: 'EAT with a Small TLB', level: 'Medium', tags: ['TLB', 'EAT'], companies: ['Microsoft', 'Arm'],
  statement: `<p>TLB lookup = <b>5 ns</b>, main memory = <b>80 ns</b>, TLB hit ratio = <b>95%</b>, single-level page table. Compute the EAT. Then recompute if the page table has two levels.</p>`,
  constraints: `Include the TLB lookup on both paths.`,
  example: `<p>Single level: ${H.c('g', '89 ns')}. Two levels: 0.95×85 + 0.05×245 = ${H.c('b', '93 ns')}.</p>`,
  brute: { why: `<p>Using the average of 85 and 165 (125 ns) ignores the 95:5 weighting.</p>` },
  mcq: { q: 'With a 2-level page table, a TLB miss costs (t = TLB, m = memory)…', options: ['t + 2m', 't + 3m', 't + 4m'], answer: 1, explain: 'Two table reads plus the data read: t + 2m + m = t + 3m.' },
  hints: [`<p>Hint 1: hit = 5 + 80 = 85. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: miss (1-level) = 5 + 80 + 80 = 165. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: weight by 0.95 / 0.05. Write the numbers down step by step before moving on.</p>`],
  solution: {
    approach: `<p>Single level: hit = 5 + 80 = 85 ns, miss = 5 + 80 + 80 = 165 ns, EAT = 0.95 × 85 + 0.05 × 165 = 80.75 + 8.25 = 89 ns (11.25% slower than 80 ns). Two levels: miss = 5 + 80 + 80 + 80 = 245 ns, so EAT = 80.75 + 0.05 × 245 = 80.75 + 12.25 = 93 ns. The TLB hides most of the page-table depth when the hit ratio is high.</p>`,
    dry: { head: ['Path', 'Cost', 'Prob', 'Part'], rows: [['hit', '5+80 = 85', '0.95', '80.75'], ['miss (1-level)', '5+80+80 = 165', '0.05', '8.25'], ['<b>EAT</b>', '', '', '<b>89 ns</b>'], ['miss (2-level)', '5+160+80 = 245', '0.05', '12.25'], ['<b>EAT</b>', '', '', '<b>93 ns</b>']] },
    complexity: `<p>O(1): a few shifts, masks, comparisons and table reads, constant time.</p>`
  }
});

practice.push({
  title: '48-bit Address Space and Huge Pages', level: 'Medium', tags: ['page table', 'huge pages'], companies: ['Google', 'Apple'],
  statement: `<p>A 48-bit virtual address space uses <b>8-byte</b> PTEs and every page-table page is the size of a page. (a) For 4 KB pages: flat table size and number of levels? (b) For 2 MB pages: flat table size and number of levels? (c) Which uses fewer TLB entries to cover 1 GB?</p>`,
  constraints: `Each level's table fits exactly one page.`,
  example: `<p>(a) 512 GB flat, ${H.c('b', '4 levels')} (9|9|9|9|12). (b) 1 GB flat, ${H.c('b', '3 levels')} (9|9|9|21).</p>`,
  brute: { why: `<p>Using one flat table in either case: 512 GB or 1 GB of contiguous kernel memory per process.</p>` },
  mcq: { q: 'Using 2 MB pages instead of 4 KB changes the number of TLB entries needed for 1 GB from…', options: ['262,144 to 512', '512 to 262,144', '1024 to 1'], answer: 0, explain: '1 GB / 4 KB = 262,144 entries; 1 GB / 2 MB = 512.' },
  hints: [`<p>Hint 1: entries per table = page size of the table pages / 8. For 4 KB table pages that is 512, i.e. 9 bits per level.</p>`, `<p>Hint 2: page-number bits = 48 - offset bits. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: levels = ⌈page-number bits / 9⌉. Write the numbers down step by step before moving on.</p>`],
  solution: {
    approach: `<p>(a) Offset 12 bits, page number 36 bits, 2<sup>36</sup> entries × 8 B = 512 GB. Each table has 4096/8 = 512 entries (9 bits), so 36/9 = 4 levels. (b) Offset 21 bits, page number 27 bits, 2<sup>27</sup> × 8 B = 1 GB flat; with 512-entry tables this is 27/9 = 3 levels. (c) 1 GB / 4 KB = 262,144 TLB entries versus 1 GB / 2 MB = 512, so 2 MB pages give a TLB reach 512× larger and one fewer level in every walk - at the cost of internal fragmentation and harder physical allocation.</p>`,
    dry: { head: ['', '4 KB pages', '2 MB pages'], rows: [['offset bits', '12', '21'], ['page-number bits', '36', '27'], ['flat table', '2^36 × 8 = 512 GB', '2^27 × 8 = 1 GB'], ['bits per level', '9', '9'], ['levels', '4', '3'], ['TLB entries for 1 GB', '262,144', '512']] },
    complexity: `<p>O(1): a few shifts, masks, comparisons and table reads, constant time.</p>`
  }
});

practice.push({
  title: 'Belady\'s Anomaly on Another String', level: 'Medium', tags: ['Belady', 'FIFO', 'LRU'], companies: ['Oracle', 'IBM'],
  statement: `<p>String <b>3 2 1 0 3 2 4 3 2 1 0 4</b>. Count page faults for FIFO and LRU with 3 and with 4 frames. Which algorithm shows the anomaly?</p>`,
  constraints: `Empty frames at the start.`,
  example: `<p>FIFO ${H.c('r', '9 → 10')} (anomaly!). LRU ${H.c('g', '10 → 8')}.</p>`,
  brute: { why: `<p>Reasoning "more frames, fewer faults" for both and not tracing FIFO.</p>` },
  mcq: { q: 'The anomaly occurs for FIFO because…', options: ['FIFO\'s contents with n frames are not always a subset of the contents with n+1 frames', 'FIFO is slower', 'FIFO uses reference bits'], answer: 0, explain: 'FIFO does not obey the inclusion (stack) property.' },
  hints: [`<p>Hint 1: trace FIFO with 3 frames fully, then 4 frames.</p>`, `<p>Hint 2: then LRU for both. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: compare totals per algorithm. Write the numbers down step by step before moving on.</p>`],
  solution: {
    approach: `<p>FIFO with 3 frames gives 9 faults and with 4 frames 10 faults, so adding a frame hurt: Belady's anomaly. LRU gives 10 faults with 3 frames and 8 with 4, a monotone improvement, because LRU is a stack algorithm (the set of the n most recently used pages is always contained in the set of the n+1 most recent pages). Key takeaway: the anomaly is a property of FIFO-like policies, not of all policies.</p>`,
    dry: { head: ['Algorithm', '3 frames', '4 frames', 'Verdict'], rows: [['FIFO', '9', '<span class="c-r">10</span>', 'anomaly'], ['LRU', '10', '8', 'monotone'], ['OPT', '7', '6', 'monotone']] },
    complexity: `<p>O(R × F) with a simple scan of the frames for each reference.</p>`
  }
});

practice.push({
  title: 'Segment Table Translation with Traps', level: 'Medium', tags: ['segmentation'], companies: ['Cisco', 'Juniper'],
  statement: `<p>Segment table (base, limit): S0 = (500, 200), S1 = (1000, 300), S2 = (0, 500). Translate (0, 199), (1, 300), (2, 0), (2, 499), (3, 10). For each trap say why.</p>`,
  constraints: `Offsets are 0-based; the table has exactly three segments.`,
  example: `<p>(0, 199) → ${H.c('g', '699')}; (1, 300) → ${H.c('r', 'trap (300 ≥ 300)')}.</p>`,
  brute: { why: `<p>Allowing offset = limit (off-by-one) lets a program read one byte past its segment. The check must be offset &lt; limit.</p>` },
  mcq: { q: '(3, 10) fails because…', options: ['offset too large', 'segment 3 is not in the table', 'base is 0'], answer: 1, explain: 'The segment number itself is out of range of the segment table.' },
  hints: [`<p>Hint 1: use s as an index. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: valid only if d &lt; limit. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: physical = base + d. Write the numbers down step by step before moving on.</p>`],
  solution: {
    approach: `<p>(0, 199): 199 &lt; 200 → 500 + 199 = 699. (1, 300): limit is 300 and 300 is not less than 300 → trap (offset equals the limit, one past the last valid byte). (2, 0): 0 &lt; 500 → 0 + 0 = 0. (2, 499): 499 &lt; 500 → 499. (3, 10): the table has only segments 0-2, so segment 3 is invalid and the segment-table-length check traps before any limit is read.</p>`,
    dry: { head: ['(s,d)', 'check', 'result'], rows: [['(0,199)', '199 &lt; 200', '699'], ['(1,300)', '300 &lt; 300 false', '<span class="c-r">TRAP</span>'], ['(2,0)', '0 &lt; 500', '0'], ['(2,499)', '499 &lt; 500', '499'], ['(3,10)', 's ≥ table size', '<span class="c-r">TRAP</span>']] },
    complexity: `<p>O(1): a few shifts, masks, comparisons and table reads, constant time.</p>`
  }
});

practice.push({
  title: 'Page-Fault Frequency Control', level: 'Medium', tags: ['thrashing', 'PFF'], companies: ['VMware', 'Red Hat'],
  statement: `<p>A PFF controller uses bounds <b>2</b> and <b>10</b> faults/second. Measured rates: A = 15, B = 1, C = 6, D = 0.5. No free frames exist. What does the OS do for each process, and what if no frames can be taken from anyone?</p>`,
  constraints: `A process above the upper bound needs more frames; below the lower bound can lose frames.`,
  example: `<p>A ${H.c('r', 'needs frames')}; B and D ${H.c('g', 'donate')}; C ${H.c('b', 'unchanged')}.</p>`,
  brute: { why: `<p>Giving every process the same fixed frame count ignores their very different working sets.</p>` },
  mcq: { q: 'If A needs frames and nobody can donate, the best action is to…', options: ['let A thrash', 'suspend a process to free its frames', 'increase the page size'], answer: 1, explain: 'The fault rate shows total demand exceeds supply; lowering multiprogramming is the cure.' },
  hints: [`<p>Hint 1: compare each rate with the two bounds. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: above upper → grow; below lower → shrink; between → keep.</p>`, `<p>Hint 3: if the donors cannot cover the demand, suspend a whole process.</p>`],
  solution: {
    approach: `<p>A (15 &gt; 10) is above the upper bound, so it needs more frames. B (1) and D (0.5) are below the lower bound (2), so they have more frames than their working set and can each give up one or more frames to A. C (6) lies between the bounds and keeps its allocation. If B and D cannot supply enough frames (for instance, they are at their minimum), then the combined working sets exceed memory and the OS should suspend (swap out) a process, releasing all its frames. PFF thus acts as a feedback signal that replaces explicit working-set measurement.</p>`,
    dry: { head: ['Process', 'Rate', 'Compared with 2..10', 'Action'], rows: [['A', '15', 'above', 'give frames'], ['B', '1', 'below', 'take a frame'], ['C', '6', 'inside', 'unchanged'], ['D', '0.5', 'below', 'take a frame']] },
    complexity: `<p>Per-process counters; O(1) per decision.</p>`
  }
});

practice.push({
  title: 'FIFO vs LRU vs OPT with 4 Frames', level: 'Hard', tags: ['FIFO', 'LRU', 'OPT'], companies: ['Google', 'Qualcomm'],
  statement: `<p>String <b>1 2 3 4 2 1 5 6 2 1 2 3 7 6 3 2 1 2 3 6</b> (20 references) with <b>4 frames</b>. Compute the faults for FIFO, LRU and OPT. (With 3 frames they are 16, 15 and 11.) What does the gap between LRU and OPT tell you?</p>`,
  constraints: `Start with empty frames.`,
  example: `<p>FIFO ${H.c('r', '14')}, LRU ${H.c('b', '10')}, OPT ${H.c('g', '8')}.</p>`,
  brute: { why: `<p>Re-simulating from scratch for each algorithm with no table is the right idea but error-prone; keep all three side by side.</p>` },
  mcq: { q: 'The 3 → 4 frame improvement from 15 to 10 for LRU is consistent with…', options: ['LRU being a stack algorithm', 'Belady\'s anomaly', 'a bug'], answer: 0, explain: 'More frames never hurt stack algorithms.' },
  hints: [`<p>Hint 1: FIFO queue vs LRU recency vs OPT next use.</p>`, `<p>Hint 2: first evictions all happen at reference 5 (page 5).</p>`, `<p>Hint 3: use the dry-run table to cross-check your counts.</p>`],
  solution: {
    approach: `<p>With 4 frames the first four distinct pages (1, 2, 3, 4) are cold faults. FIFO then evicts strictly by arrival order and keeps evicting pages that are about to be used again (2, 1, 3 and 6 all fault twice), ending with 14 faults. LRU keeps the recently used pages 1, 2 and 3 resident through the long reuse phase and faults only 10 times. OPT sees that pages 1, 2, 3 and 6 are the ones needed again and evicts 4/5/7 immediately, faulting only 8 times. The 2-fault gap between LRU and OPT is the price of not knowing the future: it is small, which shows this string has strong locality.</p>`,
    dry: { head: dryHead(['FIFO', 'LRU', 'OPT']), rows: dryRows([1, 2, 3, 4, 2, 1, 5, 6, 2, 1, 2, 3, 7, 6, 3, 2, 1, 2, 3, 6], 4, ['FIFO', 'LRU', 'OPT']) },
    complexity: `<p>O(R × F) per algorithm for FIFO and LRU, plus a forward scan for OPT.</p>`
  }
});

practice.push({
  title: 'RISC-V Sv39 Page Tables for a Tiny Process', level: 'Hard', tags: ['multi-level page table', 'sparse'], companies: ['SiFive', 'Intel'],
  statement: `<p>Sv39 uses a 39-bit virtual address, 4 KB pages, 8-byte PTEs and three levels (9|9|9|12). A process maps one code page, one heap page and one stack page, each in a <b>different 1 GB region</b>. (a) Bits per level and entries per table? (b) How many page-table pages does the process need, and how many bytes? (c) How many memory accesses does a TLB miss take? (d) What would a flat table cost?</p>`,
  constraints: `The root table always exists; lower tables exist only when needed.`,
  example: `<p>Tables: 1 root + 3 mid + 3 leaf = ${H.c('g', '7 tables = 28 KB')}.</p>`,
  brute: { why: `<p>A flat table for 2<sup>27</sup> pages × 8 B = 1 GB per process for three pages of data.</p>` },
  mcq: { q: 'Each Sv39 root entry covers…', options: ['4 KB', '2 MB', '1 GB'], answer: 2, explain: 'The remaining 30 bits (9+9+12) address 2<sup>30</sup> bytes = 1 GB under each root entry.' },
  hints: [`<p>Hint 1: 4096 / 8 = 512 entries → 9 bits per level.</p>`, `<p>Hint 2: regions in different 1 GB areas need their own mid and leaf tables.</p>`, `<p>Hint 3: count 1 root + 3 mid + 3 leaf. Write the numbers down step by step before moving on.</p>`],
  solution: {
    approach: `<p>(a) Each table is a 4 KB page holding 512 eight-byte entries, so every level indexes 9 bits: 9 + 9 + 9 + 12 = 39. (b) The root (level 2) always exists: 1 page. Each of the three regions lies under a different root entry, so each needs its own level-1 table (3 pages) and its own level-0 leaf table (3 pages): 7 table pages = 28 KB. (c) A TLB miss does 3 table reads and then 1 data read = 4 memory accesses. (d) A flat table would need 2<sup>27</sup> entries × 8 B = 1 GB, hence the multi-level design's saving of about 99.997%.</p>`,
    dry: { head: ['Level', 'Index bits', 'Tables needed', 'Bytes'], rows: [['root (L2)', '38-30', '1', '4 KB'], ['mid (L1)', '29-21', '3', '12 KB'], ['leaf (L0)', '20-12', '3', '12 KB'], ['<b>total</b>', '', '7', '<b>28 KB</b>']] },
    complexity: `<p>Space O(used regions × levels) instead of O(address space).</p>`
  }
});

practice.push({
  title: 'EAT with TLB and Page Faults Together', level: 'Hard', tags: ['EAT', 'TLB', 'page fault'], companies: ['Meta', 'Amazon'],
  statement: `<p>TLB lookup = 10 ns, memory = 100 ns, TLB hit ratio = 98%, <b>two-level</b> page table. In addition, <b>one in a million</b> memory references causes a page fault serviced in <b>8 ms</b>. Compute the overall EAT. Which part dominates the slowdown?</p>`,
  constraints: `Treat the fault service time as the extra cost of a faulting reference (ignore the small extra TLB cost).`,
  example: `<p>Without faults ${H.c('b', '114 ns')}; with faults ${H.c('g', '≈ 122 ns')}.</p>`,
  brute: { why: `<p>Ignoring page faults because "a million to one is tiny" - but 8 ms is 80,000 times the memory time, so the faults add as much as the entire TLB-miss penalty.</p>` },
  mcq: { q: 'The fault term p × T = 10<sup>-6</sup> × 8,000,000 ns equals…', options: ['0.8 ns', '8 ns', '80 ns'], answer: 1, explain: '10<sup>-6</sup> × 8 × 10<sup>6</sup> = 8 ns on average per reference.' },
  hints: [`<p>Hint 1: first compute the translation+access time with the TLB (the "ma").</p>`, `<p>Hint 2: then EAT = (1 - p) × ma + p × T. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: compare the extra 14 ns (TLB misses) with the extra 8 ns (faults).</p>`],
  solution: {
    approach: `<p>Memory-access time ma with TLB: hit = 10 + 100 = 110 ns, miss = 10 + 2 × 100 + 100 = 310 ns, so ma = 0.98 × 110 + 0.02 × 310 = 107.8 + 6.2 = 114 ns. Including faults with p = 10<sup>-6</sup> and T = 8,000,000 ns: EAT = (1 - 10<sup>-6</sup>) × 114 + 10<sup>-6</sup> × 8,000,000 ≈ 114 + 8 = 122 ns (about 22% over the ideal 100 ns). Of the 22 ns of overhead, 14 ns comes from the TLB (lookup + misses) and 8 ns from rare page faults; a fault rate ten times higher would double the second part, showing why even 'rare' faults matter.</p>`,
    dry: { head: ['Part', 'Calculation', 'Value'], rows: [['hit', '10 + 100', '110'], ['miss', '10 + 200 + 100', '310'], ['ma', '0.98×110 + 0.02×310', '114 ns'], ['fault part', '1e-6 × 8,000,000', '8 ns'], ['<b>EAT</b>', '≈ 114 + 8', '<b>≈ 122 ns</b>']] },
    complexity: `<p>O(1): a few shifts, masks, comparisons and table reads, constant time.</p>`
  }
});

practice.push({
  title: 'Working-Set Sizes over Time', level: 'Hard', tags: ['working set', 'locality'], companies: ['Google', 'IBM'],
  statement: `<p>Reference string <b>1 2 3 1 2 4 4 4 5 6 5 6 5 6 7 8 7 8 7 8</b>, window <b>Δ = 5</b>. Give the working set after references 5, 9, 14 and 20, the peak WSS, and the number of frames you would give this process. Explain what the phase changes mean.</p>`,
  constraints: `WS(t) = distinct pages among references t-4 .. t.`,
  example: `<p>WS(5) = ${H.c('b', '{1,2,3}')}, WS(9) = ${H.c('b', '{2,4,5}')}, WS(14) = ${H.c('b', '{5,6}')}, WS(20) = ${H.c('b', '{7,8}')}; peak ${H.c('r', '4')}.</p>`,
  brute: { why: `<p>Giving the process as many frames as distinct pages (8) is safe but wasteful - it only ever needs a handful at a time.</p>` },
  mcq: { q: 'A good number of frames for this process is about…', options: ['the peak WSS (4) or slightly above', '1', 'the total number of distinct pages (8)'], answer: 0, explain: 'The peak working-set size is enough to hold any locality; the rest of the pages are only touched in other phases.' },
  hints: [`<p>Hint 1: take the last 5 references ending at t. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: remove duplicates; count. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: phases: {1,2,3,4}, {4,5,6}, {7,8}. Write the numbers down step by step before moving on.</p>`],
  solution: {
    approach: `<p>Windows: references 1-5 are 1 2 3 1 2 → {1,2,3} (WSS 3); references 5-9 are 2 4 4 4 5 → {2,4,5} (3); references 10-14 are 6 5 6 5 6 → {5,6} (2); references 16-20 are 8 7 8 7 8 → {7,8} (2). The full WSS series is 1 2 3 3 3 4 4 3 3 3 3 3 2 2 3 4 4 3 2 2 with a peak of 4 (at references 6-7 and 16-17, where a window contains two localities). Give the process about 4 frames: it then holds the working set of every phase. The bumps show phase transitions where the old locality overlaps the new one in the window; a shrinking WSS means the program is looping over a small set of pages.</p>`,
    dry: { head: ['t', 'window', 'WS', 'WSS'], rows: [['5', '1 2 3 1 2', '{1,2,3}', '3'], ['9', '2 4 4 4 5', '{2,4,5}', '3'], ['14', '6 5 6 5 6', '{5,6}', '2'], ['20', '8 7 8 7 8', '{7,8}', '2']] },
    complexity: `<p>O(R × Δ) naive, O(R) with a sliding count map.</p>`
  }
});

practice.push({
  title: 'Design a Scan-Resistant Page Replacement Policy', level: 'Hard', tags: ['design', 'LRU', 'scan resistance'], companies: ['Oracle', 'Snowflake'],
  statement: `<p>A database buffer pool uses plain LRU. A nightly <b>full table scan</b> reads 50 GB once, evicting every hot index page, and daytime queries then crawl. Explain why LRU fails here and design a replacement policy that fixes it.</p>`,
  constraints: `Memory 8 GB; scan pages are read once and never reused; hot pages are reused many times.`,
  example: `<p>Plain LRU hit ratio drops from ~99% to ~0% right after the scan; a scan-resistant policy keeps it ~99%.</p>`,
  brute: { why: `<p>Plain LRU: every page read by the scan becomes "most recently used" and pushes out the hot pages although it will never be reused. This is "sequential flooding".</p>` },
  mcq: { q: 'Which idea makes LRU scan-resistant?', options: ['Promote a page to the hot list only on its second access', 'Make pages bigger', 'Use FIFO instead'], answer: 0, explain: 'Pages touched once stay in a probationary list and are evicted first (2Q, segmented LRU, Linux inactive/active lists).' },
  hints: [`<p>Hint 1: a page used once and a page used many times look identical to plain LRU right after access.</p>`, `<p>Hint 2: keep two lists: probation (first access) and protected (accessed again).</p>`, `<p>Hint 3: evict from probation first; give scans a tiny ring buffer.</p>`],
  solution: {
    approach: `<p>Plain LRU treats a page touched once exactly like a hot page, so a scan of 50 GB through an 8 GB cache evicts everything useful: every scan page enters at the most-recently-used end and pushes the hot pages out. Fix: use a two-list policy (2Q / segmented LRU / Linux active-inactive). New pages enter a small probation (inactive) list; only a second access within some time promotes them to the protected (active) list. Eviction takes from the probation list first, so the scan only churns the probation list while hot pages stay protected. Add (a) a small ring buffer for sequential scans (PostgreSQL uses 256 KB), (b) readahead hints (madvise/posix_fadvise DONTNEED) after use, and (c) optionally frequency tracking (ARC, TinyLFU). Verify with the hit ratio before/after and measure p99 latency of daytime queries.</p>`,
    complexity: `<p>All list operations are O(1) with doubly linked lists plus a hash map from page id to node.</p>`,
    followUps: ['How does ARC adapt the list sizes?', 'What would you monitor to detect scan pollution in production?']
  }
});

practice.push({
  title: 'Copy-on-Write fork() Numbers', level: 'Hard', tags: ['fork', 'copy-on-write', 'page tables'], companies: ['Amazon', 'Redis Labs'],
  statement: `<p>A parent process with <b>1 GB</b> of anonymous memory (4 KB pages, 8-byte PTEs) calls <code>fork()</code>. The child then writes to <b>1%</b> of the pages. (a) How many pages exist? (b) How much memory is copied by the fork itself? (c) How much extra memory does the child consume after its writes? (d) Why can a Redis background save still double memory use on a write-heavy server?</p>`,
  constraints: `Ignore sharing with other processes; assume page tables are copied at fork.`,
  example: `<p>262,144 pages; fork copies only ${H.c('b', '≈ 2 MB of page tables')}; 1% writes → ${H.c('r', '≈ 10 MB')} extra.</p>`,
  brute: { why: `<p>Copying all 1 GB at fork time would take hundreds of milliseconds and double memory immediately, even though most pages are never written.</p>` },
  mcq: { q: 'After fork, which pages are copied?', options: ['All of them immediately', 'Only those written by either process, on the first write', 'None, ever'], answer: 1, explain: 'Copy-on-write: share read-only until a write triggers a page copy.' },
  hints: [`<p>Hint 1: pages = 1 GB / 4 KB. Write the numbers down step by step before moving on.</p>`, `<p>Hint 2: page-table bytes = pages × 8. Write the numbers down step by step before moving on.</p>`, `<p>Hint 3: written pages × 4 KB is the extra memory.</p>`],
  solution: {
    approach: `<p>(a) 1 GB / 4 KB = 262,144 pages. (b) The fork itself copies the page tables, not the data: 262,144 × 8 B = 2 MB (Linux can share even more for some mappings), which takes only milliseconds. All data pages are marked read-only and shared. (c) 1% of pages is about 2,621 pages; each first write takes a protection fault, the kernel allocates a new frame and copies 4 KB, so extra memory ≈ 2,621 × 4 KB ≈ 10.2 MB. (d) Redis forks to snapshot (RDB): while the child writes the snapshot, every page the parent modifies is copied. On a write-heavy server a large fraction of pages gets touched during the save, so memory use can approach 2× the dataset - hence the advice to leave headroom and to watch transparent huge pages, which make each copy 2 MB instead of 4 KB.</p>`,
    dry: { head: ['Quantity', 'Computation', 'Result'], rows: [['pages', '2^30 / 2^12', '262,144'], ['page tables copied', '262,144 × 8 B', '2 MB'], ['pages written', '1% × 262,144', '≈ 2,621'], ['extra memory', '2,621 × 4 KB', '≈ 10.2 MB']] },
    complexity: `<p>Fork cost grows with the number of page-table entries, not the memory contents; each write costs one fault plus a 4 KB copy.</p>`,
    followUps: ['How do huge pages change the write amplification?', 'What does vfork/posix_spawn avoid?']
  }
});

/* ================= QUIZ ================= */
quiz.push({ q: 'A 32-bit virtual address with 4 KB pages: how many bits form the page number?', options: ['10', '12', '20', '22'], answer: 2, explain: '4 KB = 2<sup>12</sup> so the offset is 12 bits; 32 - 12 = 20 bits of page number.' });
quiz.push({ q: 'Which problem does paging eliminate?', options: ['Internal fragmentation', 'External fragmentation', 'Page faults', 'TLB misses'], answer: 1, explain: 'Any free frame can hold any page, so no unusable holes between allocations. Internal fragmentation (last partly used page) remains.' });
quiz.push({ q: 'Physical address under base/limit protection is computed as…', options: ['base + logical, trap if logical ≥ limit', 'limit + logical', 'base × logical', 'logical - base'], answer: 0, explain: 'The MMU checks the offset against the limit, then adds the base register.' });
quiz.push({ q: 'TLB 10 ns, memory 100 ns, hit ratio 90%, single-level table. EAT = ?', options: ['110 ns', '120 ns', '130 ns', '100 ns'], answer: 1, explain: '0.9 × (10 + 100) + 0.1 × (10 + 100 + 100) = 99 + 21 = 120 ns.' });
quiz.push({ q: 'How many levels does a 48-bit address space need with 4 KB pages and 8-byte PTEs (each table = one page)?', options: ['2', '3', '4', '6'], answer: 2, explain: 'Offset 12, page number 36 bits; a table has 512 entries = 9 bits; 36 / 9 = 4 levels.' });
quiz.push({ q: 'What happens first on a page fault?', options: ['The disk is read', 'The MMU traps into the OS', 'The page is evicted', 'The process is killed'], answer: 1, explain: 'The hardware raises an exception; the OS then checks legality, finds a frame, reads the page, updates tables and restarts the instruction.' });
quiz.push({ q: 'Belady\'s anomaly means…', options: ['LRU is optimal', 'More frames can cause more faults with FIFO', 'TLB hit ratio can exceed 100%', 'Pages can be larger than frames'], answer: 1, explain: 'For some strings (e.g. 1 2 3 4 1 2 5 1 2 3 4 5) FIFO has 9 faults with 3 frames and 10 with 4.' });
quiz.push({ q: 'Which algorithm gives the minimum possible number of page faults but cannot be implemented in a real OS?', options: ['LRU', 'Clock', 'Optimal (OPT)', 'FIFO'], answer: 2, explain: 'OPT needs the future reference string.' });
quiz.push({ q: 'In the clock algorithm, a page under the hand with reference bit 1 is…', options: ['evicted immediately', 'given a second chance: bit cleared, hand moves on', 'moved to the front', 'written to disk'], answer: 1, explain: 'Clearing the bit gives it a chance to be referenced again before the hand returns.' });
quiz.push({ q: 'CPU utilisation is 5%, the swap disk is 100% busy, and the OS keeps starting new processes. This is…', options: ['a TLB flush storm', 'thrashing', 'external fragmentation', 'a deadlock'], answer: 1, explain: 'Σ working sets exceed memory; adding processes makes it worse. Reduce multiprogramming.' });
quiz.push({ q: 'In segmentation, the logical address is…', options: ['a single number split into page|offset', 'a (segment, offset) pair', 'a frame number', 'a base register'], answer: 1, explain: 'The segment number selects a base/limit row; the offset is checked against the limit.' });
quiz.push({ q: 'Which statement about LRU is TRUE?', options: ['It can show Belady\'s anomaly', 'It is a stack algorithm', 'It needs no per-access bookkeeping', 'It is never better than FIFO'], answer: 1, explain: 'The n most recently used pages are always a subset of the n+1 most recently used, so more frames never hurt.' });
quiz.push({ q: 'A TLB miss on a 4-level page table costs how many memory accesses (including the data)?', options: ['1', '2', '4', '5'], answer: 3, explain: 'Four table reads plus the data read.' });
quiz.push({ q: 'What does the working set WS(t, Δ) contain?', options: ['All pages of the process', 'Distinct pages referenced in the last Δ references', 'Pages marked dirty', 'Pages in the TLB'], answer: 1, explain: 'It approximates the pages the process needs right now.' });

/* ================= INTERVIEW ================= */
interview.push({ q: 'Explain logical vs physical address and what the MMU does.', level: 'B', a: `<p>A <b>logical (virtual) address</b> is what the CPU generates; each process sees its own space starting at 0. A <b>physical address</b> identifies a byte in RAM. The <b>MMU</b> is hardware between CPU and memory that translates every logical address to a physical one on each access, checking permissions at the same time. With simple relocation: physical = base + logical, trap if logical ≥ limit. With paging the MMU splits the address into page number and offset and looks up the frame in the page table (cached by the TLB). This gives isolation, relocation without recompiling, and the freedom to place a process anywhere in RAM.</p>`, followUps: ['Why must the check happen in hardware?', 'What are compile-time, load-time and execution-time binding?'] });
interview.push({ q: 'What is the difference between internal and external fragmentation? Which memory schemes cause which?', level: 'B', a: `<p><b>Internal</b> fragmentation is waste <i>inside</i> an allocated block: fixed partitions, or the unused tail of the last page of a process (average half a page). <b>External</b> fragmentation is free memory that is split into small holes so that no hole fits a request although the total free space is large; it appears with variable partitions (contiguous allocation) and with segmentation. Paging removes external fragmentation (any frame fits any page) but has internal fragmentation. Fixes: compaction (needs dynamic relocation, slow), paging, or allocators such as the buddy system.</p>`, followUps: ['What is the 50-percent rule?', 'How does the Linux buddy allocator limit fragmentation?'] });
interview.push({ q: 'Walk me through translating a virtual address with paging.', level: 'B', a: `<p>Take page size 2<sup>k</sup>. The page number is <code>va &gt;&gt; k</code> and the offset <code>va &amp; (2<sup>k</sup> - 1)</code>. The MMU first asks the TLB for the page number; on a hit it gets the frame number immediately. On a miss the hardware walks the page table(s) from the root register (CR3 on x86): each level index selects an entry until the final PTE gives the frame and permission bits. If the present bit is 0 → page fault; if permissions are violated → protection fault. The physical address is <code>(frame &lt;&lt; k) | offset</code>. Example: 4 KB pages, VA 0x3A7C, page 3 → frame 1 → PA 0x1A7C.</p>`, followUps: ['What is stored in a PTE?', 'What happens to the offset?'] });
interview.push({ q: 'Why do we need multi-level page tables? How big is a single-level table for 32-bit and 48-bit addresses?', level: 'I', a: `<p>A flat table has one entry per virtual page: 32-bit with 4 KB pages and 4-byte entries is 2<sup>20</sup> × 4 B = 4 MB per process; 48-bit with 8-byte entries is 2<sup>36</sup> × 8 B = 512 GB - impossible. Most of the address space is unused, so we make the table a tree: each table is exactly one page (512 entries of 8 B), and sub-tables are created only for regions in use. x86-64 uses 4 levels (9|9|9|9|12). The price is more memory accesses on a TLB miss (levels + 1), which the TLB and paging-structure caches hide. Alternatives: hashed and inverted page tables.</p>`, followUps: ['How many bits does each level take and why?', 'What are huge pages and how do they shorten the walk?'] });
interview.push({ q: 'How does the TLB work, and how do you compute effective access time?', level: 'I', a: `<p>The TLB is a small, fast, associative cache of recent page→frame translations. A hit avoids the page-table walk. With hit ratio h, TLB time t and memory time m, single-level: EAT = h(t + m) + (1 - h)(t + 2m); with n levels the miss path is t + (n + 1)m. Example t = 10, m = 100, h = 0.9: 0.9 × 110 + 0.1 × 210 = 120 ns. It works because of locality, so hit ratios exceed 99% in practice. I always state whether the TLB time is included. On a context switch the TLB must be flushed unless entries carry an ASID/PCID tag.</p>`, followUps: ['What is TLB reach?', 'What is a TLB shootdown?'] });
interview.push({ q: 'Contrast paging and segmentation.', level: 'I', a: `<p>Paging splits memory into fixed-size pages/frames, invisible to the programmer; the address is one number split into page and offset; there is internal but no external fragmentation. Segmentation splits a program into logical, variable-sized units (code, data, stack) and addresses are (segment, offset) pairs checked against a limit; it matches the program's structure and makes protection and sharing natural, but suffers from external fragmentation. Many systems combined them (Multics, IA-32: segment then page); modern 64-bit OSes use a flat model with paging and keep segment-like regions in software (VMAs).</p>`, followUps: ['Why did x86-64 mostly drop segmentation?', 'How would you share a library between processes under each scheme?'] });
interview.push({ q: 'What exactly happens on a page fault? What is the difference between minor and major?', level: 'I', a: `<p>The MMU finds an invalid entry and traps. The kernel saves state, checks the faulting address against the process's memory regions: illegal → SIGSEGV. If legal, it finds a free frame (or runs page replacement; a dirty victim is written back first), starts a disk read, and blocks the process while other work runs. On the I/O completion interrupt it fills the PTE, marks the process ready and, when scheduled, the faulting instruction restarts. A <b>minor</b> fault needs no disk I/O (zero-fill a new page, map a page already in the page cache, copy-on-write) and costs microseconds; a <b>major</b> fault reads from disk and costs milliseconds on HDD.</p>`, followUps: ['Why must the instruction be restartable?', 'How does copy-on-write use faults?'] });
interview.push({ q: 'Compare FIFO, LRU, OPT and Clock page replacement. Which would you pick?', level: 'I', a: `<p>FIFO evicts the oldest-loaded page; simple but ignores use and suffers Belady's anomaly. LRU evicts the page unused for longest; good approximation of the future given locality and a stack algorithm (no anomaly) but expensive to do exactly. OPT evicts the page whose next use is farthest; minimal faults, unimplementable, used as a benchmark. Clock (second chance) approximates LRU using a reference bit and a circular hand: cheap, hits only set a bit. Real kernels use Clock-like designs (Linux active/inactive lists, MGLRU). For typical workloads LRU-like beats FIFO; for sequential scans, scan-resistant variants matter.</p>`, followUps: ['On the 20-reference classic string with 3 frames, what are the fault counts?', 'Why is hit handling cheap in Clock?'] });
interview.push({ q: 'What is Belady\'s anomaly and why do LRU and OPT not have it?', level: 'I', a: `<p>Belady's anomaly: for some reference strings, FIFO produces more page faults with more frames (1 2 3 4 1 2 5 1 2 3 4 5 gives 9 faults with 3 frames and 10 with 4). LRU and OPT are <b>stack algorithms</b>: the set of pages in memory with n frames is always a subset of the set with n+1 frames (the inclusion property), so adding a frame can only turn faults into hits. FIFO's contents depend on load order, which changes with n, so inclusion fails.</p>`, followUps: ['Can Clock show the anomaly?', 'How would you search for an anomaly string programmatically?'] });
interview.push({ q: 'What is thrashing? How do you detect and fix it?', level: 'A', a: `<p>Thrashing is when the system spends more time swapping pages than executing, because the sum of the processes' working sets exceeds RAM. Symptoms: high page-fault rate and swap I/O, low CPU utilisation, sluggish system. A scheduler that raises multiprogramming when the CPU looks idle makes it worse. Detection: <code>vmstat</code> (si/so, wa), PSI memory pressure, major-fault rate, per-process fault frequency. Fixes: reduce multiprogramming (suspend/kill/evict workloads), working-set or page-fault-frequency control, local replacement, more RAM, cgroup limits and admission control, or fixing the app's access pattern (tiling, smaller working set).</p>`, followUps: ['How does the working-set window Δ affect accuracy?', 'Why is adding swap not a cure?'] });
interview.push({ q: 'How does fork() stay cheap with a huge process, and what is the downside?', level: 'A', a: `<p>fork duplicates the page tables, not the data. Data pages are shared and marked read-only (copy-on-write). When either process writes, a protection fault occurs; the kernel allocates a frame, copies that 4 KB page and makes it writable. Cost is proportional to the number of PTEs (about 2 MB of tables per GB with 4 KB pages), not the data. Downsides: a burst of page faults after fork, latency spikes, and memory growth when many pages are written (Redis snapshots on write-heavy loads can nearly double memory). Huge pages worsen the copy cost (2 MB per fault). For spawn-and-exec use posix_spawn/vfork.</p>`, followUps: ['What does mmap with MAP_PRIVATE do on write?', 'How does Linux overcommit relate to COW?'] });
interview.push({ q: 'Design considerations for choosing a page size.', level: 'A', a: `<p>Larger pages reduce page-table size, increase TLB reach and give better disk transfer efficiency; they also increase internal fragmentation, cause more data to be loaded per fault, make copy-on-write copying expensive, and can make it hard to find contiguous physical memory. Smaller pages improve memory utilisation and protection granularity. Common compromise: 4 KB base pages (sometimes 16 or 64 KB on ARM) plus optional 2 MB / 1 GB huge pages for databases, JVMs and ML. A back-of-the-envelope optimum for tables plus waste is √(2 × process size × entry size). Linux offers THP (transparent) and hugetlbfs (explicit).</p>`, followUps: ['What are the problems with transparent huge pages for latency-sensitive services?', 'How do GPUs choose page sizes?'] });
interview.push({ q: 'How does mmap relate to virtual memory, and when would you prefer it over read()?', level: 'A', a: `<p><code>mmap</code> maps a file (or anonymous memory) into the address space; no data is read until the first access, which triggers a page fault that loads the page from the page cache (or disk). Reads and writes then become plain memory loads and stores, shared with other processes mapping the same file, and the kernel handles caching and writeback. Prefer it for large random-access read-mostly files (databases, model weights, shared libraries). Drawbacks: page-fault latency is hidden inside memory accesses, errors arrive as SIGBUS, TLB and page-table cost for huge mappings, and for streaming sequential reads <code>read()</code> with readahead can be as fast and simpler to reason about.</p>`, followUps: ['What is MAP_POPULATE and madvise(WILLNEED)?', 'What happens to a mapped file if it is truncated by another process?'] });
interview.push({ q: 'A service shows high latency and rising major page faults after a deploy. How do you investigate?', level: 'E', a: `<p>First separate symptoms: check <code>vmstat 1</code>, <code>sar -B</code>, <code>/proc/pressure/memory</code> and per-process <code>/proc/PID/status</code> (VmRSS, VmSwap) and fault counters via <code>perf stat -e major-faults,minor-faults</code>. Question whether the working set grew (new cache, larger model, bigger heap), whether a cgroup limit is too low, or whether file-cache thrashing displaced hot data (compare page-cache size and hit rates). Compare against the previous version. Fixes in order: right-size memory request/limit, reduce the working set (lazy loading, smaller caches), pin or <code>mlock</code> critical pages, enable or disable huge pages as measured, add RAM, and alert on PSI so thrashing is caught before the OOM killer acts.</p>`, followUps: ['How would you tell a memory leak from a growing working set?', 'What is the effect of swappiness in this case?'] });
interview.push({ q: 'How is virtual memory used for security and isolation, and what changed after Meltdown?', level: 'E', a: `<p>Each process has its own page tables, so one process cannot name another's memory; permission bits enforce read/write/execute (W^X) per page; ASLR randomises the layout; guard pages catch overflows; NX stops code execution from data pages; kernel pages are supervisor-only. Meltdown (2018) showed that speculative execution could read kernel memory mapped in the user page tables, so Linux added <b>KPTI</b>: separate page tables for user and kernel mode, switching CR3 on each kernel entry, mitigated by PCID tagging of TLB entries. Related issues: Rowhammer flipping PTE bits, and side channels on shared page-cache pages.</p>`, followUps: ['What is the performance cost of KPTI and how do PCIDs help?', 'What is the role of the IOMMU for DMA isolation?'] });

registerModule({
  langExplain: `<p><b>About the code here.</b> The examples show what the operating system or the network actually does, written in C++ (close to the real system calls) and short Python scripts you can run in the page. Read them to see the mechanism; you do not need to write C++ or Python to follow the lessons, the quiz or the interview questions. The same facilities exist in every language: threads and locks (<code>java.util.concurrent</code>, Python <code>threading</code>, Node worker threads, <code>std::thread</code>), sockets (<code>java.net</code>, Python <code>socket</code>, Node <code>net</code>, POSIX sockets) and files (<code>java.nio</code>, Python <code>open</code>, Node <code>fs</code>, <code>fstream</code>).</p>`,
  id: 'cs06',
  title: 'Memory Management & Virtual Memory',
  intro: `<p>This module explains how an operating system gives every program the illusion of a huge, private, contiguous memory using only a small, shared pool of RAM. You start with the simplest idea (a base and a limit register), watch contiguous allocation break down into fragmentation, and then learn the real solution: <b>paging</b>, with page tables, multi-level tables and the TLB. Then comes <b>virtual memory</b>: demand paging, page faults step by step, and the page replacement algorithms (FIFO, LRU, Optimal, Clock) with Belady's anomaly. Finally you see working sets and thrashing. Interviewers love the numeric questions here: translate an address, size a page table, compute the effective access time, count page faults. Every topic has an interactive visualizer with editable input so you can practise exactly those calculations.</p>`,
  goals: ['Translate a virtual address into a physical address by hand using the page number / offset split, with 4 KB pages and a page table', 'Compute page-table sizes for 32-bit and 48-bit address spaces and explain why multi-level tables are needed', 'Calculate effective access time with a TLB hit ratio and with page faults', 'Trace FIFO, LRU, Optimal and Clock on a reference string with 3 and 4 frames and count the faults', 'Demonstrate Belady\'s anomaly and explain why LRU/OPT avoid it', 'Diagnose thrashing using working-set sizes and explain how to fix it'],
  prereqs: `CS 1 (What an Operating System Does) and CS 2 (Processes &amp; Threads). Comfortable with binary/hex and powers of two; DSA basics (arrays, hash maps, linked lists) help for LRU.`,
  hours: 12,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
