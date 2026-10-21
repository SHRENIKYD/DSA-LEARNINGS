(function () {
var topics = [], practice = [], quiz = [], interview = [];

// ---------- shared helpers for visualizers (plain functions, no external deps) ----------
function vstr(a) { return '(' + a.join(', ') + ')'; }
function leq(a, b) { for (var i = 0; i < a.length; i++) { if (a[i] > b[i]) return false; } return true; }
function addv(a, b) { return a.map(function (x, i) { return x + b[i]; }); }
function subv(a, b) { return a.map(function (x, i) { return x - b[i]; }); }
function nums(s) { return String(s).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number); }
// Banker input:  "3 3 2 / 0 1 0 | 7 5 3 / 2 0 0 | 3 2 2 / ..."   (first part = Available, then 'alloc | max' per process)
function bankerParse(input) {
  var parts = String(input).split('/').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
  if (parts.length < 2) throw new Error('Format: "avail / alloc | max / alloc | max ..." e.g. 3 3 2 / 0 1 0 | 7 5 3 / 2 0 0 | 3 2 2');
  var avail = nums(parts[0]); var m = avail.length;
  if (m < 1 || m > 4 || avail.some(isNaN)) throw new Error('Available must be 1 to 4 integers');
  var alloc = [], max = [], need = [];
  for (var i = 1; i < parts.length; i++) {
    var ab = parts[i].split('|');
    if (ab.length !== 2) throw new Error('Each process needs "alloc | max"');
    var a = nums(ab[0]), b = nums(ab[1]);
    if (a.length !== m || b.length !== m || a.some(isNaN) || b.some(isNaN)) throw new Error('Every vector needs exactly ' + m + ' numbers');
    if (!leq(a, b)) throw new Error('Allocation cannot exceed Max for P' + (i - 1));
    alloc.push(a); max.push(b); need.push(subv(b, a));
  }
  if (alloc.length > 6) throw new Error('Use at most 6 processes');
  return { avail: avail, alloc: alloc, max: max, need: need, n: alloc.length, m: m };
}
// Wait-for / allocation edges parser: "P1>P2 P2>P3 P3>P1"
function edgeParse(input) {
  var toks = String(input).trim().split(/[\s,;]+/).filter(function (x) { return x !== ''; });
  if (!toks.length) throw new Error('Enter edges like P1>P2 P2>P3 P3>P1');
  if (toks.length > 14) throw new Error('Use at most 14 edges');
  var edges = [], ids = [];
  toks.forEach(function (t) {
    var p = t.split('>');
    if (p.length !== 2 || !p[0] || !p[1]) throw new Error('Bad edge "' + t + '" - use U>V');
    edges.push([p[0], p[1]]);
    if (ids.indexOf(p[0]) < 0) ids.push(p[0]);
    if (ids.indexOf(p[1]) < 0) ids.push(p[1]);
  });
  if (ids.length > 10) throw new Error('Use at most 10 nodes');
  return { edges: edges, ids: ids };
}
// find ONE cycle (array of ids, first==last implied) in a directed graph, or null
function findCycle(ids, edges) {
  var adj = {}; ids.forEach(function (i) { adj[i] = []; }); edges.forEach(function (e) { adj[e[0]].push(e[1]); });
  var color = {}, path = [], found = null;
  function dfs(u) {
    color[u] = 1; path.push(u);
    for (var k = 0; k < adj[u].length && !found; k++) {
      var v = adj[u][k];
      if (color[v] === 1) { found = path.slice(path.indexOf(v)); }
      else if (!color[v]) dfs(v);
    }
    path.pop(); color[u] = 2;
  }
  for (var i = 0; i < ids.length && !found; i++) { if (!color[ids[i]]) dfs(ids[i]); }
  return found;
}

// =====================================================================
// TOPIC 1 - What is a deadlock + Coffman conditions
// =====================================================================
topics.push({
  title: 'What Is a Deadlock? The Four Coffman Conditions',
  analogy: `<p>Two cars meet on a one-lane bridge, nose to nose. Each driver says "I will move when <b>you</b> back up." Nobody backs up, nobody moves, and the traffic behind them grows forever. Nothing is broken - the cars work, the road works - but <b>everyone is waiting for something only another waiting person can give</b>. That is a deadlock.</p>`,
  explain: `<p>🟢 <b>Plain idea.</b> A <b>deadlock</b> is a state where a group of processes (or threads) are all blocked forever, because each one holds a resource the next one needs, and nobody can let go. The OS cannot "just wait longer" - waiting longer never helps.</p>
  <p>Think of a tiny program with two locks, <code>A</code> and <code>B</code>:</p>
  ${H.table(['Time', 'Thread 1', 'Thread 2'], [['1', 'lock(A) ✅', ''], ['2', '', 'lock(B) ✅'], ['3', 'lock(B) ⏳ waits for T2', ''], ['4', '', 'lock(A) ⏳ waits for T1'], ['5', '<span class="c-r">stuck forever</span>', '<span class="c-r">stuck forever</span>']])}
  <p>A deadlock needs <b>all four</b> of these conditions at the same time (Coffman, 1971). Remove even one and a deadlock is impossible:</p>
  <ol>
  <li><b>Mutual exclusion</b> - a resource can be used by only one process at a time (a lock, a printer). If everyone could share it, nobody would wait.</li>
  <li><b>Hold and wait</b> - a process keeps what it already has <i>while</i> asking for more.</li>
  <li><b>No preemption</b> - you cannot forcibly take a resource away; the owner must give it back willingly.</li>
  <li><b>Circular wait</b> - there is a ring: P1 waits for P2, P2 waits for P3, ..., Pn waits for P1.</li>
  </ol>
  <p>🔵 <b>Memory trick:</b> <b>M-H-N-C</b> - "My Hands Never Cooperate". The first three are <i>rules of the system</i> (cheap to have, hard to remove). The fourth, circular wait, is the <i>actual situation</i> that happens at run time - which is why many fixes attack it.</p>
  <p><b>Important:</b> the four conditions are <b>necessary</b> (no deadlock without all four). They are only <b>sufficient</b> in a single-instance-per-resource world - with several identical copies of a resource, a ring can exist without a deadlock (you will see this in the resource-allocation graph topic).</p>`,
  clues: ['"Two threads, two locks, program hangs but CPU is 0%" → classic deadlock', '"Each process holds one resource and waits for another" → hold and wait + circular wait', '"Name the necessary conditions for deadlock" → Coffman: mutual exclusion, hold and wait, no preemption, circular wait', '"Which condition is easiest to break in practice?" → circular wait (impose a global lock order)', '"All threads are in WAITING/BLOCKED state, thread dump shows a lock cycle" → deadlock, not a slow system', '"Is it a deadlock if one process is still running?" → no: deadlock means every process in the set is blocked'],
  code: [`// The classic two-mutex deadlock (compiles, but DO NOT run it: it hangs on purpose)
#include <mutex>
#include <thread>
std::mutex A, B;

void worker1() {
    std::lock_guard<std::mutex> la(A);   // 1. takes A
    // ... a context switch here makes the bug likely ...
    std::lock_guard<std::mutex> lb(B);   // 3. wants B (held by worker2)
}
void worker2() {
    std::lock_guard<std::mutex> lb(B);   // 2. takes B
    std::lock_guard<std::mutex> la(A);   // 4. wants A (held by worker1)  -> circular wait
}
int main() {
    std::thread t1(worker1), t2(worker2);
    t1.join(); t2.join();                // may never return
}`],
  codeTitle: ['Two threads, two mutexes, opposite order = deadlock'],
  viz: {
    title: 'Coffman checklist: break one condition, the deadlock disappears',
    input: 'A B | B A',
    inputLabel: 'Lock order of Thread 1 | Thread 2 (letters, e.g. "A B | B A" or "A B | A B")',
    gen: function (input) {
      var sides = String(input).split('|').map(function (s) { return s.trim().split(/[\s,]+/).filter(Boolean); });
      if (sides.length !== 2 || !sides[0].length || !sides[1].length) throw new Error('Format: "A B | B A"');
      var o1 = sides[0], o2 = sides[1];
      var cyc = false;
      // circular wait is possible when both threads lock two common locks in opposite order
      for (var i = 0; i < o1.length; i++) for (var j = i + 1; j < o1.length; j++) {
        var a = o2.indexOf(o1[i]), b = o2.indexOf(o1[j]);
        if (a >= 0 && b >= 0 && a > b) cyc = true;
      }
      var cols = ['Condition', 'Plain meaning', 'In this program?'];
      var base = [
        ['1. Mutual exclusion', 'One owner at a time', 'Yes - mutexes are exclusive'],
        ['2. Hold and wait', 'Keep A while asking for B', 'Yes - lock A is kept while locking B'],
        ['3. No preemption', 'Nobody can steal a lock', 'Yes - only the owner can unlock'],
        ['4. Circular wait', 'T1 → T2 → T1 ring', cyc ? 'POSSIBLE - orders are opposite' : 'NO - same order, no ring']
      ];
      var fr = [];
      fr.push({ narr: 'Thread 1 locks <b>' + o1.join(' then ') + '</b>, Thread 2 locks <b>' + o2.join(' then ') + '</b>. Deadlock needs <b>all four</b> Coffman conditions. Let us check them one by one.', parts: [{ type: 'table', label: 'Coffman checklist', columns: cols, rows: base.map(function (r, k) { return k === 3 ? [r[0], r[1], '?'] : r; }) }] });
      for (var k = 0; k < 4; k++) {
        var rows = base.map(function (r, q) { return q <= k ? r : [r[0], r[1], '?']; });
        var hl = {}; hl[k] = (k === 3 && !cyc) ? 'ok' : 'cur';
        fr.push({ narr: 'Check <b>' + base[k][0] + '</b>: ' + base[k][1] + '. → ' + base[k][2] + '.' + (k === 3 && !cyc ? ' <span class="c-g">The ring cannot form, so no deadlock.</span>' : ''), parts: [{ type: 'table', label: 'Coffman checklist', columns: cols, rows: rows, hl: hl }] });
      }
      fr.push({ narr: cyc ? '<span class="c-r">All four can hold together → this program CAN deadlock</span> (if the unlucky interleaving happens). Try the input <code>A B | A B</code>.' : '<span class="c-g">Circular wait is impossible → this program can NEVER deadlock.</span> Same order for everyone is the classic fix.', parts: [{ type: 'table', label: 'Verdict', columns: cols, rows: base, hl: { 3: cyc ? 'bad' : 'ok' } }, { type: 'text', html: cyc ? '<b>Deadlock possible</b>' : '<b>Deadlock-free</b>' }] });
      fr.push({ narr: 'Way to remember: break <b>any</b> one of M-H-N-C and deadlock is gone. Breaking circular wait (a global order) costs almost nothing, so it is the most popular fix.', parts: [{ type: 'table', label: 'Which one to break?', columns: ['Break…', 'How', 'Cost'], rows: [['Mutual exclusion', 'Make resource shareable (read-only, spooling)', 'Often impossible'], ['Hold and wait', 'Request everything at once', 'Low utilization, starvation'], ['No preemption', 'Take resource back / tryLock', 'Rollback work'], ['Circular wait', 'Global lock order', 'Cheap - needs discipline']], hl: { 3: 'ok' } }] });
      return fr;
    }
  },
  examples: [
    { title: 'Traffic gridlock - the four conditions in a city', html: `<p>Four cars at a crossroads, each wants to go straight through the lane the next car is sitting in.</p><ul><li><b>Mutual exclusion</b>: one car per patch of road.</li><li><b>Hold and wait</b>: each car occupies its patch while waiting for the next.</li><li><b>No preemption</b>: you cannot lift a car off the road.</li><li><b>Circular wait</b>: car 1 waits for 2, 2 for 3, 3 for 4, 4 for 1.</li></ul><p>A police officer who forces one car to reverse (preemption) breaks the deadlock.</p>` },
    { title: 'Database: two transactions update two rows', html: `<p>T1: <code>UPDATE row1; UPDATE row2;</code> and T2: <code>UPDATE row2; UPDATE row1;</code>. Each holds a row lock and wants the other's. The database detects the cycle and aborts one transaction ("deadlock detected, transaction rolled back") - a <b>detection and recovery</b> design.</p>` },
    { title: 'Which of these is NOT a deadlock?', html: `<p>(a) Thread waits on a lock held by a thread that is running a long loop → <b>not deadlock</b> (the holder will finish). (b) Two threads each waiting for a lock the other holds → <b>deadlock</b>. (c) A thread waits for input that never arrives from the network → <b>not</b> a deadlock in the OS sense (no cycle), just a hang/timeout.</p>` }
  ],
  deepDive: `<p>🟣 <b>Why exactly these four?</b> Coffman, Elphick and Shoshani (1971) showed that for reusable resources a deadlock needs all four, and any four together can occur. This gives you a <b>checklist for design</b>: each prevention strategy kills one condition.</p>
  <p><b>Deadlock vs. a long wait.</b> A deadlock is a <i>stable</i> property: once reached, nothing outside the cycle can ever change it (except a recovery action). A lock convoy or a slow disk is just slow - throughput recovers.</p>
  <p><b>Resource types.</b> <i>Reusable</i> (CPU, memory, locks, files) are released back; <i>consumable</i> (messages, signals, interrupts) are destroyed on use. Deadlocks happen with both: two processes each doing <code>receive()</code> before <code>send()</code> deadlock on messages.</p>
  <p><b>Where they hide in production.</b> Nested locks across modules (callback invoked while holding a lock), database row/gap locks, distributed locks, thread pools that wait on their own queue (a pool of 4 threads where all 4 tasks wait for a 5th subtask queued behind them - <i>thread-pool starvation deadlock</i>), and <code>synchronized</code> + <code>join()</code>. Also the <b>OS-level</b>: ABBA between a spinlock and a mutex in a kernel, solved by lockdep in Linux.</p>
  <p><b>Detect in the wild.</b> Java: <code>jstack</code>/<code>jcmd Thread.print</code> prints "Found one Java-level deadlock". C++: attach gdb, <code>thread apply all bt</code>, look for threads blocked in <code>pthread_mutex_lock</code> and map the owner. Linux kernel: <code>CONFIG_PROVE_LOCKING</code> (lockdep) reports possible circular dependencies even if they have not happened yet.</p>
  <p><b>Ostrich algorithm.</b> General-purpose OSes (Linux, Windows) mostly ignore deadlock between user processes - deadlocks are rare, prevention is expensive, and the user can kill the process. Kernels and databases, where a hang is unacceptable, do take it seriously.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI code assistants happily generate multi-threaded code with nested locks, and they rarely mention lock order. Concurrency bugs also hide from unit tests - the test passes 999 times, then the 1000th hangs in CI.</p>
  <p><b>Work alongside it:</b> paste a thread dump into an assistant and ask <code>Which threads form a cycle? Name the lock each holds and the lock each waits for.</code> It is excellent at reading 2,000-line dumps. Ask it to propose a global lock order for the locks in your module, then review it yourself.</p>
  <p><b>Where AI goes wrong:</b> it "fixes" a deadlock by adding <code>sleep()</code> or a timeout, which hides the bug; it adds a lock around the lot (coarse lock) and kills performance; or it claims code is safe because "mutexes are used" without checking the order.</p>
  <p><b>What you must still own:</b> naming the four conditions, drawing the wait cycle, and deciding which condition to break and what it costs. Agent frameworks have the same bug: two agents each waiting for a tool or file lock the other holds. The theory transfers directly.</p>`,
  problems: []
});

// =====================================================================
// TOPIC 2 - Resource allocation graphs
// =====================================================================
topics.push({
  title: 'Resource Allocation Graphs (Single vs Multiple Instances)',
  analogy: `<p>Draw a seating chart of a restaurant. Circles are <b>customers</b> (processes), boxes are <b>tables</b> (resources). An arrow <b>table → customer</b> means "this customer is sitting here". An arrow <b>customer → table</b> means "this customer is waiting for that table". If you can follow arrows round in a loop, people are waiting on each other - but if a table has <i>several seats</i>, someone may get up and the loop dissolves.</p>`,
  explain: `<p>🟢 A <b>Resource Allocation Graph (RAG)</b> is a picture of "who holds what" and "who wants what".</p>
  <ul>
  <li><b>Circle</b> = process (P1, P2, ...)</li>
  <li><b>Box</b> = resource type (R1, R2). Dots inside the box = number of identical <b>instances</b>.</li>
  <li><b>Request edge</b> P → R: process is waiting for an instance of R.</li>
  <li><b>Assignment edge</b> R → P: one instance of R is given to P.</li>
  </ul>
  ${H.table(['Edge', 'Meaning', 'Example'], [['P1 → R2', 'P1 requests R2 (blocked)', 'P1 wants the printer'], ['R1 → P1', 'R1 is assigned to P1', 'P1 holds the disk']])}
  <p>🔵 <b>The golden rules</b> (interview favourite):</p>
  ${H.table(['Graph looks like', 'Single instance per resource', 'Multiple instances'], [['No cycle', 'No deadlock', 'No deadlock'], ['Has a cycle', '<span class="c-r">DEADLOCK (always)</span>', '<span class="c-y">MAYBE - need more checking</span>']])}
  <p>Why? With one copy of each resource, every box in the cycle has exactly one holder, and that holder is also waiting - nobody can break the ring. With several copies, a process <i>outside</i> the cycle might hold a spare copy and later release it, letting someone in the cycle continue.</p>
  <p><b>Worked picture:</b> P1 holds R1 and wants R2; P2 holds R2 and wants R1. Edges: R1→P1, P1→R2, R2→P2, P2→R1 - a cycle of length 4 - with single instances = deadlock. Use the visualizer below and type your own edges (<code>R1&gt;P1</code> means the arrow R1 → P1).</p>
  <p>There is a third kind of edge in <i>avoidance</i> graphs: the <b>claim edge</b> P ⇢ R (dashed) means "P may request R in the future". It turns into a request edge when P asks, and into an assignment edge when granted. The system grants only if turning a request into an assignment does <b>not</b> create a cycle (works only for single-instance resources).</p>`,
  clues: ['"Draw the resource allocation graph" - circles for processes, boxes for resources', '"There is a cycle - is there a deadlock?" → ask: single or multiple instances?', '"Every resource has exactly one instance and the graph has a cycle" → deadlock for sure', '"R1 has 2 instances, P3 is not in the cycle" → check if P3 can finish and release', '"claim edge / dashed edge" → deadlock avoidance with RAG (single-instance only)', '"Convert RAG to wait-for graph" → remove resource nodes, connect P → Q if P waits for a resource Q holds'],
  code: [`// Build a tiny wait-for relation from a single-instance RAG and check for a cycle.
// owner[r] = process that holds resource r (or -1); wants[p] = resource p waits for (or -1)
#include <vector>
#include <iostream>
using namespace std;

bool hasCycle(const vector<int>& owner, const vector<int>& wants) {
    int n = wants.size();
    // waitsFor[p] = the process that currently holds the resource p wants (or -1)
    vector<int> waitsFor(n, -1);
    for (int p = 0; p < n; ++p)
        if (wants[p] >= 0) waitsFor[p] = owner[wants[p]];
    // each process has at most ONE outgoing edge, so follow the chain from each start
    for (int s = 0; s < n; ++s) {
        int slow = s, steps = 0;
        while (slow != -1 && steps <= n) { slow = waitsFor[slow]; ++steps; }
        if (slow != -1) return true;      // walked more than n steps -> must be looping
    }
    return false;
}
int main() {
    // R0 held by P0, R1 held by P1; P0 wants R1, P1 wants R0  -> cycle
    vector<int> owner = {0, 1};
    vector<int> wants = {1, 0};
    cout << (hasCycle(owner, wants) ? "DEADLOCK" : "ok") << "\\n";
}`],
  codeTitle: ['Single-instance RAG → cycle check in C++'],
  viz: [{
    title: 'Build a resource allocation graph edge by edge',
    input: 'R1>P1 P1>R2 R2>P2 P2>R1',
    inputLabel: 'Edges: P>R = request, R>P = assignment (names starting with P or R)',
    gen: function (input) {
      var g = edgeParse(input), ids = g.ids;
      ids.forEach(function (id) { if (!/^[PR]/.test(id)) throw new Error('Names must start with P (process) or R (resource): ' + id); });
      g.edges.forEach(function (e) { if (e[0].charAt(0) === e[1].charAt(0)) throw new Error('Edges must connect a P with an R: ' + e[0] + '>' + e[1]); });
      var ps = ids.filter(function (i) { return i.charAt(0) === 'P'; }), rs = ids.filter(function (i) { return i.charAt(0) === 'R'; });
      var nodes = [];
      ps.forEach(function (p, k) { nodes.push({ id: p, label: p, x: 12 + (76 * (k + 0.5)) / ps.length, y: 8 }); });
      rs.forEach(function (r, k) { nodes.push({ id: r, label: r, x: 12 + (76 * (k + 0.5)) / rs.length, y: 42, shape: 'box' }); });
      var fr = [];
      var cyc = findCycle(ids, g.edges);
      function gedges(upTo) { return g.edges.slice(0, upTo).map(function (e) { return [e[0], e[1], e[0].charAt(0) === 'P' ? 'req' : 'held']; }); }
      fr.push({ narr: 'Circles are <b>processes</b>, boxes are <b>resources</b>. Edge <b>R → P</b> means "P holds R"; edge <b>P → R</b> means "P waits for R". We will add the edges one at a time.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: [] }] });
      for (var k = 1; k <= g.edges.length; k++) {
        var e = g.edges[k - 1], isReq = e[0].charAt(0) === 'P', eh = {}; eh[e[0] + '-' + e[1]] = 'cur';
        fr.push({ narr: 'Add <b>' + e[0] + ' → ' + e[1] + '</b>: ' + (isReq ? e[0] + ' <b>requests</b> ' + e[1] + ' (is waiting).' : e[1] + ' <b>holds</b> ' + e[0] + ' (assigned).'), parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: gedges(k), ehl: eh }] });
      }
      if (cyc) {
        var hl = {}, eh2 = {}; cyc.forEach(function (c, q) { hl[c] = 'bad'; eh2[c + '-' + cyc[(q + 1) % cyc.length]] = 'bad'; });
        fr.push({ narr: 'Found a <span class="c-r">cycle: ' + cyc.join(' → ') + ' → ' + cyc[0] + '</span>. If every resource here has a <b>single instance</b>, this is a <b>deadlock</b>.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: gedges(g.edges.length), hl: hl, ehl: eh2 }, { type: 'text', html: '<b>Verdict (single instance):</b> <span class="c-r">DEADLOCK</span>' }] });
      } else {
        fr.push({ narr: '<span class="c-g">No cycle</span> → no deadlock, in any case (single or multiple instances).', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: gedges(g.edges.length) }, { type: 'text', html: '<b>Verdict:</b> <span class="c-g">no deadlock</span>' }] });
      }
      return fr;
    }
  }, {
    title: 'Cycle but NO deadlock (resource with 2 instances)',
    gen: function () {
      var nodes = [{ id: 'P1', label: 'P1', x: 12, y: 8 }, { id: 'P2', label: 'P2', x: 45, y: 8 }, { id: 'P3', label: 'P3', x: 82, y: 8 }, { id: 'R1', label: 'R1 (x2)', x: 25, y: 42, shape: 'box', w: 16 }, { id: 'R2', label: 'R2 (x1)', x: 62, y: 42, shape: 'box', w: 16 }];
      function E(list) { return list; }
      var base = E([['R1', 'P2', 'held'], ['R1', 'P3', 'held'], ['R2', 'P1', 'held'], ['P1', 'R1', 'req'], ['P2', 'R2', 'req']]);
      var cycHl = { P1: 'bad', P2: 'bad' }, cycE = { 'P1-R1': 'bad', 'R1-P2': 'bad', 'P2-R2': 'bad', 'R2-P1': 'bad' };
      return [
        { narr: 'R1 has <b>two</b> instances: one held by P2, one held by P3. R2 (one instance) is held by P1. P1 waits for R1, P2 waits for R2.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: base }] },
        { narr: 'Look: <span class="c-r">P1 → R1 → P2 → R2 → P1</span> is a cycle!', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: base, hl: cycHl, ehl: cycE }] },
        { narr: 'But P3 is <b>outside</b> the cycle and is not waiting for anything. P3 will finish and release its instance of R1.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: base, hl: { P3: 'ok' } }] },
        { narr: 'P3 releases R1 → the freed instance goes to P1 (it was waiting). Edge P1 → R1 becomes R1 → P1.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: [['R1', 'P2', 'held'], ['R1', 'P1', 'held'], ['R2', 'P1', 'held'], ['P2', 'R2', 'req']], hl: { P1: 'ok' } }] },
        { narr: 'P1 now has everything, finishes, releases R2 and R1 → P2 gets R2 and finishes. <span class="c-g">No deadlock.</span> A cycle is only a <b>warning</b> when resources have several instances.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: [['R1', 'P2', 'held'], ['R2', 'P2', 'held']], hl: { P2: 'ok' } }, { type: 'text', html: 'Cycle + multi-instance ⇒ <b>maybe</b>. Use the Banker-style detection algorithm to be sure.' }] }
      ];
    }
  }],
  examples: [
    { title: 'Read this RAG: R1→P1, P1→R2, R2→P2, P2→R1', html: `<p>P1 holds R1, wants R2. P2 holds R2, wants R1. Single instances + cycle ⇒ <b>deadlock</b>. Fix: make P2 request R1 first, then R2 (same order).</p>` },
    { title: 'RAG with a cycle but spare instances', html: `<p>R1 has 2 instances: held by P2 and P3. P1 → R1, P2 → R2, R2 → P1. The cycle P1→R1→P2→R2→P1 exists, yet P3 is free to finish, release R1, and unwind everything. <b>Not a deadlock.</b> Rule: with multiple instances, a cycle is <i>necessary, not sufficient</i>.</p>` },
    { title: 'RAG → wait-for graph', html: `<p>From the first example, drop resource nodes: P1 waits for the holder of R2 which is P2, so <code>P1 → P2</code>; P2 waits for the holder of R1 = P1, so <code>P2 → P1</code>. The wait-for graph is just the processes with those edges; a cycle there = deadlock (single instance).</p>` }
  ],
  deepDive: `<p>🟣 <b>Why the single-instance rule is "iff".</b> In a single-instance RAG every resource node has at most one outgoing assignment edge, so every resource on the cycle has exactly one holder, and that holder is itself a waiting member of the cycle. Everyone waits on a ring member - no ring member can ever run. For multi-instance, the right statement is: <i>cycle ⇒ possible deadlock</i>; <i>deadlock ⇒ cycle</i>. In the OR-request model (a process can continue when any one of its requests is granted), the precise deadlock condition is a <b>knot</b>: a set of nodes from which every reachable node can reach back.</p>
  <p><b>Wait-for graph collapse.</b> It is derived by removing the resource nodes and merging edges. It is smaller (n processes rather than n + m nodes) and is what databases keep in memory and check periodically. It only exists when every resource has one instance.</p>
  <p><b>Claim edges (avoidance on RAG).</b> A process must declare future needs in advance. A request is granted only if converting the claim/request edge into an assignment edge keeps the graph acyclic. Cycle detection costs O(n²) in the worst case per request.</p>
  <p><b>Complexity.</b> DFS cycle detection on a RAG with V nodes and E edges: O(V + E). For the multi-instance matrix representation the detection algorithm costs O(m × n²) (m resource types, n processes).</p>
  <p><b>Real-world mapping.</b> Process = thread; resource = mutex, DB row lock, file lock, GPU, connection-pool slot. A database with 10 connections in a pool is "a resource with 10 instances": a thread holding one connection while waiting for a second one can deadlock the whole pool when all 10 threads do the same.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> tools can now draw the RAG for you - paste a Java thread dump or a Postgres <code>pg_locks</code> / "deadlock detected" log and an assistant can produce the wait-for graph and name the cycle.</p>
  <p><b>Use AI as a partner:</b> <code>Here is a thread dump. Convert it to a list of "thread X holds lock L, waits for lock M" edges, then find the cycle.</code> Also ask it to generate tricky exam-style RAGs with multi-instance resources, <i>without</i> telling you the answer, then check your reasoning.</p>
  <p><b>Where AI goes wrong:</b> it often says "there is a cycle, so deadlock" without asking whether resources have several instances; it mixes the direction of edges (request vs assignment); it forgets that threads outside the cycle may release a spare.</p>
  <p><b>What you must still own:</b> the two direction conventions, the single-vs-multi-instance rule, and explaining in one sentence why a cycle is not enough with several instances. Agentic systems (agents waiting on shared tools or GPUs) can be modelled with the same graph.</p>`,
  problems: []
});

// =====================================================================
// TOPIC 3 - Prevention
// =====================================================================
topics.push({
  title: 'Deadlock Prevention: Break One Coffman Condition',
  analogy: `<p>A restaurant wants no two groups ever stuck waiting on each other. Options: <b>(1)</b> make tables shareable (long communal tables), <b>(2)</b> ask groups to grab <i>all</i> their tables at once or none, <b>(3)</b> let the manager take a table back, or <b>(4)</b> number the tables and say "always book in number order". Each rule kills one Coffman condition <b>before</b> the problem can start.</p>`,
  explain: `<p>🟢 <b>Prevention</b> = design the system so that at least one of the four conditions can <i>never</i> hold. It is strict and safe, but each choice has a price.</p>
  ${H.table(['Break…', 'Technique', 'Price you pay'], [
    ['Mutual exclusion', 'Use shareable resources: read-only files, lock-free structures, spooling (print queue)', 'Many resources (a mutex, a printer head) are non-shareable by nature'],
    ['Hold and wait', 'Request <b>all</b> resources at once, or release everything before asking again', 'Low utilization (hold things you don\'t use yet) and <span class="c-r">starvation</span> for jobs needing popular resources'],
    ['No preemption', 'If a request fails, release what you hold (<code>try_lock</code> + back off); or OS takes resources away (CPU, memory pages)', 'Only works if state can be saved/restored; risk of <span class="c-y">livelock</span>'],
    ['Circular wait', '<b>Total order</b> on resources; always request in increasing order', 'Needs discipline; the order may not match natural usage']
  ])}
  <p>🔵 <b>Lock ordering - the workhorse.</b> Give every lock a rank (A=1, B=2). A thread holding rank k may only ask for rank &gt; k. Then a cycle P1→P2→...→P1 would need ranks strictly increasing around a ring - impossible. Proof by contradiction in one line.</p>
  <p>In C++17+ you do not even need to remember the order: <code>std::scoped_lock lk(A, B);</code> (or <code>std::lock(A, B)</code>) locks all mutexes using a deadlock-avoidance algorithm (try-and-back-off internally). Simulate below: <code>A B | B A</code> hangs; <code>A B | A B</code> is fine.</p>
  <p><b>Rule of thumb for interviews:</b> "I would prevent circular wait with a global lock order, because it is cheap and needs no run-time bookkeeping."</p>`,
  clues: ['"How do you prevent deadlock in code?" → consistent lock ordering / <code>std::scoped_lock</code>', '"Transfer money from account A to B and B to A at the same time" → order locks by account id', '"Request all resources up front" → breaks hold and wait; cost = low utilization + starvation', '"If trylock fails, release and retry" → breaks no-preemption (watch for livelock)', '"Which Coffman condition can usually NOT be broken for locks?" → mutual exclusion', '"Why doesn\'t Linux just prevent deadlock for all user processes?" → too costly; ostrich + kernel uses lock ordering'],
  code: [`// BAD: transfer() locks (from, to). Two opposite transfers deadlock.
#include <mutex>
struct Account { std::mutex m; long balance = 0; int id = 0; };

void transferBad(Account& from, Account& to, long amt) {
    std::lock_guard<std::mutex> l1(from.m);   // transfer(A,B) holds A ...
    std::lock_guard<std::mutex> l2(to.m);     // ... wants B; transfer(B,A) holds B wants A
    from.balance -= amt; to.balance += amt;
}`,
    `// FIX 1 (C++17): std::scoped_lock locks BOTH mutexes with a deadlock-avoidance algorithm.
#include <mutex>
struct Account { std::mutex m; long balance = 0; int id = 0; };

void transferScoped(Account& from, Account& to, long amt) {
    if (&from == &to) return;                       // locking the same mutex twice = UB / deadlock
    std::scoped_lock lk(from.m, to.m);              // acquires both or waits, never half-holds in a cycle
    from.balance -= amt; to.balance += amt;
}   // both released here (RAII)`,
    `// FIX 2: explicit global order - always lock the lower id first (breaks circular wait).
#include <mutex>
struct Account { std::mutex m; long balance = 0; int id = 0; };

void transferOrdered(Account& from, Account& to, long amt) {
    if (&from == &to) return;
    Account& first  = (from.id < to.id) ? from : to;     // smaller id = lower rank
    Account& second = (from.id < to.id) ? to : from;
    std::lock_guard<std::mutex> l1(first.m);
    std::lock_guard<std::mutex> l2(second.m);
    from.balance -= amt; to.balance += amt;
}`,
    `// FIX 3: break NO-PREEMPTION with try_lock + back off (release everything on failure).
#include <mutex>
#include <thread>
#include <chrono>
#include <random>

void lockBothTry(std::mutex& a, std::mutex& b) {
    static thread_local std::mt19937 rng{std::random_device{}()};
    for (;;) {
        a.lock();
        if (b.try_lock()) return;                 // got both: done
        a.unlock();                               // could not get b: give a back (preempt ourselves)
        // random pause avoids two threads retrying in lock-step (livelock)
        std::this_thread::sleep_for(std::chrono::microseconds(rng() % 200));
    }
}`],
  codeTitle: ['Bad: transfer with opposite order', 'Fix 1: std::scoped_lock', 'Fix 2: ordered locking by id', 'Fix 3: try_lock and back off'],
  viz: {
    title: 'Two/three threads, round-robin: does it deadlock?',
    input: 'A B | B A',
    inputLabel: 'Each thread\'s lock order, threads separated by | (e.g. "A B | B A" or "A B | B C | C A")',
    gen: function (input) {
      var seqs = String(input).split('|').map(function (s) { return s.trim().split(/[\s,]+/).filter(Boolean); });
      if (seqs.length < 2 || seqs.length > 3 || seqs.some(function (s) { return !s.length || s.length > 4; })) throw new Error('Use 2-3 threads, each with 1-4 lock names, e.g. "A B | B A"');
      var T = seqs.length, idx = [], held = [], done = [], owner = {}, fr = [];
      for (var t = 0; t < T; t++) { idx.push(0); held.push([]); done.push(false); }
      function snap(msg, cur, blockedSet, dead) {
        var rows = [], hl = {};
        for (var t = 0; t < T; t++) {
          var want = done[t] ? '-' : (idx[t] < seqs[t].length ? seqs[t][idx[t]] : 'release');
          var st = done[t] ? 'finished' : (blockedSet[t] ? 'BLOCKED' : (t === cur ? 'running' : 'ready'));
          rows.push(['T' + (t + 1), seqs[t].join(' → '), held[t].join(', ') || '-', want, st]);
          if (blockedSet[t]) hl[t] = 'bad'; else if (t === cur) hl[t] = 'cur'; else if (done[t]) hl[t] = 'done';
        }
        var ent = Object.keys(owner).map(function (k) { return [k, owner[k] === null ? 'free' : 'T' + (owner[k] + 1)]; });
        var parts = [{ type: 'table', label: 'Threads', columns: ['Thread', 'Plan (order)', 'Holds', 'Wants', 'Status'], rows: rows, hl: hl }];
        if (ent.length) parts.push({ type: 'map', label: 'Lock owners', entries: ent });
        fr.push({ narr: msg, parts: parts });
      }
      seqs.forEach(function (s) { s.forEach(function (l) { if (!(l in owner)) owner[l] = null; }); });
      snap('Each thread will lock its list in order, then release everything. We schedule them round-robin (one step each).', -1, {}, false);
      for (var round = 0; round < 12; round++) {
        var progress = false, blocked = {};
        for (var t = 0; t < T; t++) {
          if (done[t]) continue;
          if (idx[t] >= seqs[t].length) {
            held[t].forEach(function (l) { owner[l] = null; }); held[t] = []; done[t] = true; progress = true;
            snap('<b>T' + (t + 1) + '</b> has all it needs, finishes and <span class="c-g">releases</span> its locks.', t, blocked, false);
            continue;
          }
          var l = seqs[t][idx[t]];
          if (owner[l] === null) { owner[l] = t; held[t].push(l); idx[t]++; progress = true; snap('<b>T' + (t + 1) + '</b> locks <b>' + l + '</b> - it was free.', t, blocked, false); }
          else { blocked[t] = true; snap('<b>T' + (t + 1) + '</b> wants <b>' + l + '</b> but <b>T' + (owner[l] + 1) + '</b> holds it → <span class="c-r">blocked</span>.', t, blocked, false); }
        }
        if (done.every(Boolean)) {
          snap('<span class="c-g">Everyone finished - no deadlock</span> for this order. Because the orders are consistent, a circular wait cannot form.', -1, {}, false);
          return fr;
        }
        if (!progress) {
          var all = {}; for (var q = 0; q < T; q++) if (!done[q]) all[q] = true;
          snap('<span class="c-r">DEADLOCK</span>: a whole round passed and nobody could move. Each blocked thread holds a lock another one wants → circular wait.', -1, all, true);
          return fr;
        }
      }
      return fr;
    }
  },
  examples: [
    { title: 'Bank transfer: two opposite transfers', html: `<p>Thread 1: <code>transfer(A→B)</code>, Thread 2: <code>transfer(B→A)</code>. With <code>lock(from); lock(to)</code> they take opposite orders. Fix: <code>std::scoped_lock</code> or lock by ascending account id. Try <code>A B | B A</code> (hang) vs <code>A B | A B</code> (ok) in the visualizer.</p>` },
    { title: 'Dining philosophers prevention', html: `<p>5 philosophers, 5 forks, each takes left then right → everyone holds left, deadlock. Prevention: number the forks, always pick the <b>lower-numbered fork first</b> (the last philosopher then picks right first - breaks the ring). Or allow at most 4 philosophers to sit (breaks the cycle by counting).</p>` },
    { title: 'All-at-once allocation cost', html: `<p>A job needs a tape drive for 1 minute at the start and a printer for 1 minute at the end. "Request all at once" forces it to hold the printer for the whole run - idle but unavailable. Utilisation drops; a job needing 5 popular devices may wait forever (starvation).</p>` }
  ],
  deepDive: `<p>🟣 <b>Proof that lock ordering works.</b> Assign each resource a unique number f(R). Rule: if a process holds R_i it may only request R_j with f(R_j) &gt; f(R_i). Suppose a cycle P0 waits for P1 ... Pk waits for P0, where Pi holds R_i and waits for R_{i+1}. Then f(R_0) &lt; f(R_1) &lt; ... &lt; f(R_k) &lt; f(R_0) - a contradiction. So no circular wait.</p>
  <p><b>Order on what?</b> Memory address of the mutex (<code>std::less&lt;&gt;</code> for pointer comparison is well-defined), an account id, a table-then-row hierarchy, or documented layers ("never call into a lower layer while holding a higher-layer lock"). The Linux kernel documents lock ordering in comments and enforces it with <b>lockdep</b>, which learns the order dynamically and warns about any inversion - even if no deadlock occurred yet.</p>
  <p><b>How does <code>std::scoped_lock</code>/<code>std::lock</code> avoid deadlock?</b> The standard says "deadlock avoidance algorithm such as try-and-back-off": lock one mutex, <code>try_lock</code> the rest; if one fails, unlock everything and start again (implementations rotate which is locked first). That is <i>breaking no-preemption by self-release</i>, not ordering. It guarantees no deadlock <i>among the mutexes passed together</i>; it does not protect you if a thread holds a lock C <i>outside</i> that call while another thread does the opposite.</p>
  <p><b>Gotchas.</b> (1) Callbacks: calling user code while holding a lock can lock something else - an invisible ordering edge. (2) Recursive locking of the same non-recursive mutex = self-deadlock (not a Coffman cycle between processes but same effect). (3) Condition variables: wait in a loop with the mutex held correctly; never wait while holding an unrelated lock. (4) Locks in <i>signal handlers</i> or interrupt handlers - use lock-free or disable interrupts. (5) <code>try_lock</code> loops can livelock - add random backoff.</p>
  <p><b>Wait-die / wound-wait</b> (databases): prevention using timestamps - older transactions either wait for younger ones (wait-die) or force them to abort (wound-wait). Both break circular wait and no-preemption using age as the global order.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI code reviewers and static tools (Clang Thread Safety Analysis, TSan, lockdep-like checkers, Rust's ownership) catch lock-order inversions earlier. Assistants also refactor "lock A then B" code into <code>std::scoped_lock</code> in seconds.</p>
  <p><b>Use AI as a partner:</b> <code>List every mutex in this file, and every place where two are held at once. Propose a total order and flag violations.</code> Ask for a stress test (many threads, random yields) to reproduce the hang, then run it under ThreadSanitizer yourself.</p>
  <p><b>Where AI goes wrong:</b> it applies <code>scoped_lock</code> to two mutexes and declares victory while a third lock elsewhere still forms a cycle; it forgets the self-transfer case (same mutex twice); it suggests timeouts as the fix; for try_lock loops it forgets the random backoff and creates livelock.</p>
  <p><b>What you must still own:</b> knowing which Coffman condition each fix attacks and what it costs; choosing the global order; reasoning about lock hierarchy across modules. Generated tests rarely trigger the unlucky interleaving - your reasoning has to.</p>`,
  problems: [{
    title: 'Fix the Bank-Transfer Deadlock',
    level: 'Medium', tags: ['deadlock', 'prevention', 'lock ordering'], companies: ['Amazon', 'Google'],
    statement: `<p>Your service has <code>transfer(from, to, amount)</code> that does <code>lock(from.m); lock(to.m);</code>. In production, simultaneous transfers A→B and B→A sometimes freeze the whole service. (a) Explain which Coffman condition you will break and why. (b) Write the fix with <code>std::scoped_lock</code>. (c) Write a second fix that works without it. (d) What extra check do you need?</p>`,
    constraints: `Accounts have unique integer ids. Up to 10<sup>5</sup> transfers per second, any pair of accounts.`,
    example: `<p>T1: transfer(A,B) locks A then waits for B. T2: transfer(B,A) locks B then waits for A. ${H.c('r', 'T1 holds A, wants B; T2 holds B, wants A → circular wait')}.</p>`,
    brute: { why: `<p>Use one <b>global lock</b> for all transfers. It cannot deadlock but serialises every transfer: 10<sup>5</sup> per second on one core, no parallelism. It "works" but destroys throughput.</p>`, code: { lang: 'cpp', code: `#include <mutex>\nstd::mutex bigLock;\nstruct Acc { long bal = 0; };\nvoid transferCoarse(Acc& f, Acc& t, long a) {\n    std::lock_guard<std::mutex> g(bigLock);   // correct but fully serial\n    f.bal -= a; t.bal += a;\n}` } },
    mcq: { q: 'Which single condition does a global lock order eliminate?', options: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'], answer: 3, explain: 'Increasing rank around a ring is impossible, so a circular wait can never form.' },
    hints: [`<p>Hint 1: Look at the ring: T1 waits for T2 and T2 waits for T1 - the problem is the <b>order</b> in which the two locks are taken.</p>`, `<p>Hint 2: Either let the library lock both together (<code>std::scoped_lock</code>) or compare the two accounts and always lock the smaller id first.</p>`, `<p>Hint 3: Edge cases: <code>from == to</code> would lock the same mutex twice (undefined behaviour/self-deadlock) - return early. Recipe: guard self-transfer → pick order by id (or scoped_lock) → update balances while both are held → RAII releases.</p>`],
    solution: {
      approach: `<p>Break <b>circular wait</b> (cheapest condition to break). The two threads fail because they acquire the same two locks in opposite orders. With <code>std::scoped_lock lk(from.m, to.m)</code> the standard library acquires both without risk of a lock cycle among them. The manual fix imposes a total order: compare <code>from.id</code> and <code>to.id</code> and always lock the smaller first; then no ring is possible (ranks strictly increase). Also return early if <code>from == to</code>. Both fixes keep per-account locking, so unrelated transfers still run in parallel.</p>`,
      code: { lang: 'cpp', code: `#include <mutex>\nstruct Account { std::mutex m; long balance = 0; int id = 0; };\n\n// Fix with scoped_lock\nvoid transfer(Account& from, Account& to, long amt) {\n    if (&from == &to) return;            // same account: nothing to move, and avoids locking twice\n    std::scoped_lock lk(from.m, to.m);   // deadlock-free simultaneous lock\n    from.balance -= amt;\n    to.balance += amt;\n}\n\n// Fix with explicit ordering\nvoid transfer2(Account& from, Account& to, long amt) {\n    if (&from == &to) return;\n    Account& lo = from.id < to.id ? from : to;\n    Account& hi = from.id < to.id ? to : from;\n    std::lock_guard<std::mutex> a(lo.m);\n    std::lock_guard<std::mutex> b(hi.m);\n    from.balance -= amt;\n    to.balance += amt;\n}` },
      dry: { head: ['Step', 'T1 transfer(A,B)', 'T2 transfer(B,A)', 'Result'], rows: [['1', 'lo=A,hi=B: lock A', 'lo=A,hi=B: tries lock A', 'T2 blocks on A'], ['2', 'lock B (free)', 'still waiting', 'T1 holds A,B'], ['3', 'update, unlock B, A', 'gets A', 'T1 done'], ['4', '-', 'lock B, update, unlock', '<span class="c-g">both complete</span>']] },
      complexity: `<p>O(1) time per transfer. Lock contention only between transfers that share an account. No deadlock possible.</p>`,
      followUps: ['How would you handle a transfer touching 3 accounts (split payment)?', 'What if account ids are strings or lock objects live in a hash table?', 'How does the database do this for row locks?']
    }
  }]
});

// ---------- Banker visual helpers ----------
var RN = ['A', 'B', 'C', 'D'];
function bkGrid(b, done, cur, work, badRow) {
  var colHead = [], rows = [], hl = {}, r, j;
  for (j = 0; j < b.m; j++) colHead.push('Alloc ' + RN[j]);
  for (j = 0; j < b.m; j++) colHead.push('Max ' + RN[j]);
  for (j = 0; j < b.m; j++) colHead.push('Need ' + RN[j]);
  colHead.push('Finished');
  for (r = 0; r < b.n; r++) {
    rows.push(b.alloc[r].concat(b.max[r], b.need[r], [done[r] ? 'yes' : 'no']));
    var cls = done[r] ? 'done' : (r === cur ? 'cur' : (r === badRow ? 'bad' : ''));
    if (cls) for (var c = 0; c < 3 * b.m + 1; c++) hl[r + ',' + c] = cls;
  }
  return { type: 'grid', label: 'Banker tables (Allocation | Max | Need = Max - Allocation)', rowHead: b.alloc.map(function (x, i) { return 'P' + i; }), colHead: colHead, rows: rows, hl: hl };
}
function bkVars(b, work, extra) {
  var v = { Available: vstr(b.avail), Work: vstr(work) };
  if (extra) for (var k in extra) v[k] = extra[k];
  return { type: 'vars', label: 'Vectors', vals: v, hl: { Work: 'ok' } };
}
// runs the safety algorithm, returns {frames, seq|null}
function bkSafety(b, lead) {
  var work = b.avail.slice(), done = b.alloc.map(function () { return false; }), seq = [], fr = [];
  var tableOnly = lead || '';
  fr.push({ narr: tableOnly + 'Safety algorithm: <b>Work = Available = ' + vstr(work) + '</b>, nobody is finished. Repeat: find an unfinished P with <b>Need ≤ Work</b>; pretend it runs to completion and returns its Allocation (Work += Allocation).', parts: [bkGrid(b, done, -1, work), bkVars(b, work), { type: 'array', label: 'Safe sequence so far', values: [] }] });
  var safe = true;
  while (seq.length < b.n) {
    var picked = -1;
    for (var i = 0; i < b.n; i++) {
      if (done[i]) continue;
      if (leq(b.need[i], work)) { picked = i; break; }
      fr.push({ narr: 'P' + i + ': Need ' + vstr(b.need[i]) + ' <span class="c-r">is NOT ≤</span> Work ' + vstr(work) + ' → skip for now.', parts: [bkGrid(b, done, -1, work, i), bkVars(b, work), { type: 'array', label: 'Safe sequence so far', values: seq.map(function (x) { return 'P' + x; }) }] });
    }
    if (picked < 0) { safe = false; break; }
    var old = work.slice();
    fr.push({ narr: 'P' + picked + ': Need ' + vstr(b.need[picked]) + ' <span class="c-g">≤</span> Work ' + vstr(work) + ' → P' + picked + ' can finish.', parts: [bkGrid(b, done, picked, work), bkVars(b, work), { type: 'array', label: 'Safe sequence so far', values: seq.map(function (x) { return 'P' + x; }) }] });
    work = addv(work, b.alloc[picked]); done[picked] = true; seq.push(picked);
    fr.push({ narr: 'P' + picked + ' finishes and returns ' + vstr(b.alloc[picked]) + ' → Work = ' + vstr(old) + ' + ' + vstr(b.alloc[picked]) + ' = <b>' + vstr(work) + '</b>.', parts: [bkGrid(b, done, -1, work), bkVars(b, work), { type: 'array', label: 'Safe sequence so far', values: seq.map(function (x) { return 'P' + x; }), hl: (function () { var h = {}; h[seq.length - 1] = 'ok'; return h; })() }] });
  }
  if (safe) fr.push({ narr: '<span class="c-g">Everyone can finish → SAFE state.</span> One safe sequence: <b>' + seq.map(function (x) { return 'P' + x; }).join(' → ') + '</b>.', parts: [bkGrid(b, done, -1, work), bkVars(b, work), { type: 'array', label: 'Safe sequence', values: seq.map(function (x) { return 'P' + x; }), hl: seq.reduce(function (h, x, i) { h[i] = 'sel'; return h; }, {}) }] });
  else {
    var left = []; done.forEach(function (d, i) { if (!d) left.push(i); });
    fr.push({ narr: '<span class="c-r">No unfinished process has Need ≤ Work</span> (' + left.map(function (x) { return 'P' + x; }).join(', ') + ' stuck) → <b>UNSAFE</b> state. It does not mean deadlock yet, only that deadlock <i>may</i> happen.', parts: [bkGrid(b, done, -1, work, left[0]), bkVars(b, work), { type: 'array', label: 'Partial sequence', values: seq.map(function (x) { return 'P' + x; }), hl: seq.reduce(function (h, x, i) { h[i] = 'bad'; return h; }, {}) }] });
  }
  return { frames: fr, seq: safe ? seq : null };
}

// =====================================================================
// TOPIC 4 - Avoidance and Banker's algorithm
// =====================================================================
topics.push({
  title: 'Deadlock Avoidance: Safe States and the Banker\'s Algorithm',
  analogy: `<p>A small-town <b>banker</b> has a limited pile of cash and several business customers, each with an approved credit limit (their "Max"). Customers borrow in pieces. Before handing out any new loan the banker asks: "<i>If I give this, can I still find an order in which every customer can borrow up to their limit, finish their project, and pay me back?</i>" If yes, the loan is OK. If not, the customer waits - even though the cash is physically there. The bank never reaches a state where it cannot pay everyone.</p>`,
  explain: `<p>🟢 <b>Avoidance</b> is smarter than prevention: it allows all four Coffman conditions but <b>refuses any request that could lead to a deadlock</b>. For this it needs advance information: each process declares its <b>Max</b> need of each resource type.</p>
  <p><b>Safe state:</b> there exists an order of processes (a <b>safe sequence</b> &lt;P<sub>i</sub>, P<sub>j</sub>, ...&gt;) such that each process can finish using the free resources plus whatever the earlier ones give back. <b>Unsafe state:</b> no such order exists. Unsafe does <u>not</u> mean deadlocked - it means deadlock is possible if processes ask for their maximum.</p>
  ${H.table(['State', 'Meaning', 'Deadlock?'], [['Safe', 'A safe sequence exists', 'Impossible if we stay safe'], ['Unsafe', 'No safe sequence', 'Possible (not certain)'], ['Deadlocked', 'Processes stuck in a cycle', 'Already happened (subset of unsafe)']])}
  <p>🔵 <b>The data</b> (n processes, m resource types):</p>
  ${H.table(['Name', 'Size', 'Meaning'], [['Available', 'm', 'free instances of each resource now'], ['Max', 'n × m', 'most each process may ever need'], ['Allocation', 'n × m', 'what each process holds now'], ['Need', 'n × m', '<b>Need = Max − Allocation</b> (what it may still ask for)']])}
  <p><b>Safety algorithm</b> (is this state safe?):</p>
  <ol><li><code>Work = Available</code>; <code>Finish[i] = false</code> for all i.</li><li>Find i with <code>Finish[i] == false</code> and <code>Need[i] ≤ Work</code> (every resource at most).</li><li>If found: <code>Work += Allocation[i]</code>, <code>Finish[i] = true</code>, add i to the sequence, go to step 2.</li><li>If not found: safe iff all Finish are true.</li></ol>
  <p><b>Resource-request algorithm</b> (process P<sub>i</sub> asks for Request<sub>i</sub>):</p>
  <ol><li>If <code>Request ≤ Need[i]</code> is false → error: it exceeded its declared maximum.</li><li>If <code>Request ≤ Available</code> is false → P<sub>i</sub> must <b>wait</b> (not enough free now).</li><li><b>Pretend</b> to grant: <code>Available −= Request; Allocation[i] += Request; Need[i] −= Request</code>.</li><li>Run the safety algorithm. Safe → <span class="c-g">grant</span>. Unsafe → <span class="c-r">roll back and make P<sub>i</sub> wait</span>.</li></ol>
  <p><b>Classic example</b> (Silberschatz). 3 resource types A, B, C with totals (10, 5, 7); Available = (3, 3, 2):</p>
  ${H.table(['', 'Alloc A B C', 'Max A B C', 'Need A B C'], [['P0', '0 1 0', '7 5 3', '7 4 3'], ['P1', '2 0 0', '3 2 2', '1 2 2'], ['P2', '3 0 2', '9 0 2', '6 0 0'], ['P3', '2 1 1', '2 2 2', '0 1 1'], ['P4', '0 0 2', '4 3 3', '4 3 1']])}
  <p>Scanning in index order: P0? Need (7,4,3) &gt; Work (3,3,2) no. <b>P1</b> (1,2,2) ≤ (3,3,2) yes → Work = (5,3,2). P0? no. P2? (6,0,0) no. <b>P3</b> (0,1,1) yes → Work = (7,4,3). <b>P0</b> (7,4,3) ≤ (7,4,3) yes → (7,5,3). <b>P2</b> yes → (10,5,5). <b>P4</b> yes → (10,5,7). Safe sequence: <b>⟨P1, P3, P0, P2, P4⟩</b>. Other orders (like P1, P3, P4, P0, P2) are also valid - there can be many.</p>
  <p>Edit the numbers in the visualizer. Format: <code>avail / alloc | max / alloc | max / ...</code></p>`,
  clues: ['"Need = Max − Allocation" and a table of Allocation / Max / Available → Banker\'s algorithm', '"Is the system in a safe state? Find a safe sequence." → run the safety algorithm', '"Can the request (1,0,2) by P1 be granted immediately?" → resource-request algorithm (three checks + safety)', '"avoid deadlock but allow all four Coffman conditions" → avoidance, not prevention', '"processes must declare maximum demand in advance" → Banker\'s precondition', '"Unsafe state - will deadlock occur?" → not necessarily; only possibly'],
  code: [`// Banker's algorithm in C++ (n processes, m resource types)
#include <vector>
#include <iostream>
using namespace std;
using Vec = vector<int>;

struct Banker {
    int n, m;
    vector<Vec> alloc, maxd, need;
    Vec avail;

    Banker(Vec av, vector<Vec> al, vector<Vec> mx)
        : n(al.size()), m(av.size()), alloc(al), maxd(mx), avail(av) {
        need.assign(n, Vec(m));
        for (int i = 0; i < n; ++i)
            for (int j = 0; j < m; ++j) need[i][j] = maxd[i][j] - alloc[i][j];   // Need = Max - Allocation
    }
    static bool leq(const Vec& a, const Vec& b) {          // a <= b in every component
        for (size_t j = 0; j < a.size(); ++j) if (a[j] > b[j]) return false;
        return true;
    }
    // Safety algorithm: returns true and fills seq with a safe sequence
    bool isSafe(vector<int>& seq) const {
        Vec work = avail;
        vector<bool> fin(n, false);
        seq.clear();
        while ((int)seq.size() < n) {
            bool found = false;
            for (int i = 0; i < n; ++i) {
                if (!fin[i] && leq(need[i], work)) {        // P_i could run to completion
                    for (int j = 0; j < m; ++j) work[j] += alloc[i][j];   // ... and give everything back
                    fin[i] = true; seq.push_back(i); found = true;
                    break;
                }
            }
            if (!found) return false;                      // nobody can finish -> unsafe
        }
        return true;
    }
    // Resource-request algorithm: grant only if the new state is safe
    bool request(int i, const Vec& req) {
        if (!leq(req, need[i])) return false;               // asked for more than its declared maximum
        if (!leq(req, avail)) return false;                 // not enough free right now: must wait
        for (int j = 0; j < m; ++j) { avail[j] -= req[j]; alloc[i][j] += req[j]; need[i][j] -= req[j]; }  // pretend
        vector<int> seq;
        if (isSafe(seq)) return true;                       // keep the allocation
        for (int j = 0; j < m; ++j) { avail[j] += req[j]; alloc[i][j] -= req[j]; need[i][j] += req[j]; }  // roll back
        return false;
    }
};

int main() {
    Banker b({3, 3, 2},
            {{0,1,0},{2,0,0},{3,0,2},{2,1,1},{0,0,2}},
            {{7,5,3},{3,2,2},{9,0,2},{2,2,2},{4,3,3}});
    vector<int> seq;
    if (b.isSafe(seq)) { for (int p : seq) cout << "P" << p << ' '; cout << "\\n"; }
    cout << (b.request(1, {1,0,2}) ? "P1 request granted" : "P1 request denied") << "\\n";
    cout << (b.request(4, {3,3,0}) ? "P4 request granted" : "P4 request denied") << "\\n";
    cout << (b.request(0, {0,2,0}) ? "P0 request granted" : "P0 request denied") << "\\n";
}`,
    { lang: 'python', run: true, title: 'Banker\'s safety + request algorithm (runnable, edit the data)', code: `# Banker's algorithm - stdlib only. Edit the tables and press Run.
available = [3, 3, 2]
allocation = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]]
maximum    = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]]

def need_matrix(alloc, mx):
    return [[mx[i][j] - alloc[i][j] for j in range(len(mx[i]))] for i in range(len(mx))]

def is_safe(avail, alloc, mx, verbose=True):
    n, m = len(alloc), len(avail)
    need = need_matrix(alloc, mx)
    work = avail[:]
    finish = [False] * n
    seq = []
    while len(seq) < n:
        for i in range(n):
            if not finish[i] and all(need[i][j] <= work[j] for j in range(m)):
                if verbose:
                    print(f"  P{i}: need {need[i]} <= work {work} -> runs, work becomes {[work[j] + alloc[i][j] for j in range(m)]}")
                work = [work[j] + alloc[i][j] for j in range(m)]
                finish[i] = True
                seq.append(i)
                break
        else:
            return False, seq          # no process could be picked -> unsafe
    return True, seq

def request(avail, alloc, mx, i, req):
    need = need_matrix(alloc, mx)
    m = len(avail)
    if any(req[j] > need[i][j] for j in range(m)):
        return False, "error: exceeds declared maximum"
    if any(req[j] > avail[j] for j in range(m)):
        return False, "must wait: not enough available"
    new_av = [avail[j] - req[j] for j in range(m)]                    # pretend to grant
    new_al = [row[:] for row in alloc]
    new_al[i] = [new_al[i][j] + req[j] for j in range(m)]
    ok, seq = is_safe(new_av, new_al, mx, verbose=False)
    if ok:
        return True, "granted, safe sequence " + " ".join(f"P{x}" for x in seq)
    return False, "denied: would lead to an UNSAFE state"

print("Need matrix:", need_matrix(allocation, maximum))
ok, seq = is_safe(available, allocation, maximum)
print("SAFE" if ok else "UNSAFE", "sequence:", " -> ".join(f"P{x}" for x in seq))
print()
for who, req in [(1, [1, 0, 2]), (4, [3, 3, 0]), (0, [0, 2, 0])]:
    print(f"P{who} requests {req}:", request(available, allocation, maximum, who, req)[1])
# NOTE: each request above is tested against the ORIGINAL state. The textbook applies them one after another
# (P1's grant first); see the guided problems.` }],
  codeTitle: ['Banker\'s algorithm (C++)', 'Banker\'s safety + request (Python, runnable)'],
  viz: [{
    title: 'Banker\'s safety algorithm, step by step',
    input: '3 3 2 / 0 1 0 | 7 5 3 / 2 0 0 | 3 2 2 / 3 0 2 | 9 0 2 / 2 1 1 | 2 2 2 / 0 0 2 | 4 3 3',
    inputLabel: 'avail / alloc | max / alloc | max / ... (up to 6 processes, 1-4 resources)',
    gen: function (input) {
      var b = bankerParse(input);
      return bkSafety(b, '').frames;
    }
  }, {
    title: 'Resource-request algorithm: can P_i\'s request be granted?',
    input: '3 3 2 / 0 1 0 | 7 5 3 / 2 0 0 | 3 2 2 / 3 0 2 | 9 0 2 / 2 1 1 | 2 2 2 / 0 0 2 | 4 3 3 / P1: 1 0 2',
    inputLabel: 'same as before, then a last part "Pk: r r r" for the request',
    gen: function (input) {
      var parts = String(input).split('/'), last = parts.pop().trim();
      var mm = last.match(/^P?(\d+)\s*:\s*(.+)$/i);
      if (!mm) throw new Error('Last part must look like "P1: 1 0 2"');
      var b = bankerParse(parts.join('/')), pi = parseInt(mm[1], 10), req = nums(mm[2]);
      if (pi >= b.n || req.length !== b.m || req.some(isNaN)) throw new Error('Process index or request length does not match the tables');
      var fr = [], done0 = b.alloc.map(function () { return false; });
      fr.push({ narr: 'Current state. <b>P' + pi + '</b> requests <b>' + vstr(req) + '</b>.', parts: [bkGrid(b, done0, pi, b.avail), bkVars(b, b.avail, { Request: vstr(req) })] });
      if (!leq(req, b.need[pi])) { fr.push({ narr: 'Check 1: Request ' + vstr(req) + ' <span class="c-r">is not ≤ Need</span> ' + vstr(b.need[pi]) + ' → <b>error</b>: P' + pi + ' exceeded its declared maximum.', parts: [bkGrid(b, done0, -1, b.avail, pi), bkVars(b, b.avail, { Request: vstr(req) })] }); return fr; }
      fr.push({ narr: 'Check 1: Request ≤ Need ' + vstr(b.need[pi]) + ' → <span class="c-g">OK</span>.', parts: [bkGrid(b, done0, pi, b.avail), bkVars(b, b.avail, { Request: vstr(req) })] });
      if (!leq(req, b.avail)) { fr.push({ narr: 'Check 2: Request is <span class="c-r">not ≤ Available</span> ' + vstr(b.avail) + ' → P' + pi + ' must <b>wait</b>.', parts: [bkGrid(b, done0, -1, b.avail, pi), bkVars(b, b.avail, { Request: vstr(req) })] }); return fr; }
      fr.push({ narr: 'Check 2: Request ≤ Available ' + vstr(b.avail) + ' → <span class="c-g">OK</span>. Now <b>pretend</b> to grant it.', parts: [bkGrid(b, done0, pi, b.avail), bkVars(b, b.avail, { Request: vstr(req) })] });
      var nb = { avail: subv(b.avail, req), alloc: b.alloc.map(function (r) { return r.slice(); }), max: b.max, need: b.need.map(function (r) { return r.slice(); }), n: b.n, m: b.m };
      nb.alloc[pi] = addv(nb.alloc[pi], req); nb.need[pi] = subv(nb.need[pi], req);
      var res = bkSafety(nb, '<b>Pretend state:</b> Available = ' + vstr(nb.avail) + ', P' + pi + ' now holds ' + vstr(nb.alloc[pi]) + '. ');
      fr = fr.concat(res.frames);
      fr.push({ narr: res.seq ? '<span class="c-g">Pretend state is SAFE → GRANT the request.</span>' : '<span class="c-r">Pretend state is UNSAFE → DENY: roll back and make P' + pi + ' wait</span>, even though resources are available.', parts: [bkGrid(res.seq ? nb : b, done0, -1, res.seq ? nb.avail : b.avail), { type: 'text', html: res.seq ? '<b>Granted</b>. Safe sequence: ' + res.seq.map(function (x) { return 'P' + x; }).join(' → ') : '<b>Denied</b> (state rolled back).' }] });
      return fr;
    }
  }],
  examples: [
    { title: 'Safe state: find the sequence by hand', html: `<p>Available (3,3,2). P1 Need (1,2,2) fits → Work (5,3,2). P3 Need (0,1,1) fits → (7,4,3). P0 Need (7,4,3) fits → (7,5,3). P2 → (10,5,5). P4 → (10,5,7). Safe sequence <b>P1, P3, P0, P2, P4</b>. Note Work ends at the total (10,5,7) - a good arithmetic check.</p>` },
    { title: 'Grant P1 asking (1,0,2)?', html: `<p>Need P1 = (1,2,2) → (1,0,2) ≤ Need ✔. Available (3,3,2) → ✔. Pretend: Available (2,3,0), P1 Alloc (3,0,2), Need (0,2,0). Safety: P1 fits (0,2,0) ≤ (2,3,0) → Work (5,3,2) → P3 → (7,4,3) → P0 → ... all finish. <span class="c-g">Safe → grant.</span></p>` },
    { title: 'Deny P0 asking (0,2,0) (after P1 was granted)', html: `<p>State after P1's grant: Available (2,3,0). P0's request (0,2,0) ≤ Need (7,4,3) ✔ ≤ Available ✔. Pretend: Available (2,1,0), P0 Need (7,2,3). Now every Need has a component too big: P1 (0,2,0) needs 2 B but only 1; P3 (0,1,1) needs 1 C but 0; the rest are huge. No process can start → <span class="c-r">unsafe → deny</span>.</p>` }
  ],
  deepDive: `<p>🟣 <b>Why it is correct.</b> If a safe sequence exists, granting the head of the sequence its remaining needs is always possible (Need ≤ Work), it finishes, and Work only grows - so the argument repeats down the list. Conversely, if the algorithm gets stuck, any real execution that follows the declared maximums can reach a deadlock. The algorithm is <b>conservative</b>: unsafe states might never deadlock in practice, but the OS cannot know.</p>
  <p><b>Greedy is enough.</b> Picking any eligible process each round finds <i>a</i> safe sequence if one exists: finishing a process only increases Work, so it never makes a later pick impossible (monotonic). That is why the "first fit in index order" scan is valid.</p>
  <p><b>Complexity.</b> Safety algorithm: O(m × n²) (up to n rounds, each scanning n processes comparing m numbers). Request algorithm: O(m) checks + one safety run. For 5 × 3 it is instant; for thousands of processes it is run on every request - too heavy, and nobody knows true Max ahead of time. <b>That is why real OSes rarely use the Banker's algorithm</b>: processes cannot predict maximum needs, the number of processes changes constantly, and resources can vanish (a device crashes).</p>
  <p><b>Where the idea lives on.</b> (1) <i>Admission control</i> and reservations: a database or cluster scheduler (Kubernetes, YARN) reserves resource limits before starting a job; "don't start a job unless its full request can be satisfied" is Banker-flavoured. (2) Memory <i>overcommit</i> policies. (3) Connection-pool sizing rules ("max pool size ≥ threads × (calls per thread − 1) + 1" guarantees at least one thread can always complete - exactly a safe-state argument). (4) Lock-manager designs with preclaimed locks.</p>
  <p><b>Single-instance variant.</b> With one instance per resource, the RAG with claim edges is enough (grant only if no cycle is created). Banker's handles multiple instances.</p>
  <p><b>Common mistakes in exams:</b> (a) computing Need as Alloc − Max; (b) forgetting to check <code>Request ≤ Need</code> first; (c) comparing only one resource instead of all components; (d) after a grant, forgetting to update Available <i>and</i> Allocation <i>and</i> Need; (e) treating "unsafe" as "deadlocked"; (f) answering a different safe sequence than the key - many are valid, so verify yours by re-running the Work column.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> modern schedulers (Kubernetes, Slurm, Ray, GPU cluster managers) make Banker-style decisions all the time: "can I start this training job with 8 GPUs without starving everything else?" AI-training clusters suffer real <b>gang-scheduling deadlocks</b>: two jobs each hold 4 of the 8 GPUs they both need, and both wait forever. Admission control and all-or-nothing allocation (gang scheduling) are the cure.</p>
  <p><b>Use AI as a partner:</b> ask it to generate random Banker problems with solutions hidden, then check your Work column step by step. Ask it for a Python checker that prints every Work vector so you can compare with your hand-work. Never trust its mental arithmetic on matrices - ask for code and run it.</p>
  <p><b>Where AI goes wrong:</b> arithmetic slips on Need and Work; reporting a safe sequence that is invalid; confusing "unsafe" with "deadlocked"; skipping the "Request ≤ Need" check.</p>
  <p><b>What you must still own:</b> the three request checks, the pretend-grant-then-roll-back pattern, and explaining honestly why the algorithm is rarely used in general-purpose OSes (unknown Max, dynamic process count, O(m n²) per request).</p>`,
  problems: [{
    title: 'Find the Safe Sequence (5 × 3)',
    level: 'Medium', tags: ['banker', 'safe state', 'safety algorithm'], companies: ['TCS', 'Infosys', 'Oracle'],
    statement: `<p>Five processes and three resource types A, B, C (totals 10, 5, 7). Available = (3,3,2).</p>${H.table(['', 'Alloc', 'Max'], [['P0', '0 1 0', '7 5 3'], ['P1', '2 0 0', '3 2 2'], ['P2', '3 0 2', '9 0 2'], ['P3', '2 1 1', '2 2 2'], ['P4', '0 0 2', '4 3 3']])}<p>(a) Compute the Need matrix. (b) Is the system in a safe state? (c) Give a safe sequence, scanning processes in index order each round.</p>`,
    constraints: `Use the safety algorithm: Work = Available, pick the lowest-index unfinished process with Need ≤ Work.`,
    example: `<p>Need = Max − Alloc: P0 (7,4,3), P1 (1,2,2), P2 (6,0,0), P3 (0,1,1), P4 (4,3,1). ${H.c('g', 'Expected: safe, sequence P1, P3, P0, P2, P4')}.</p>`,
    brute: { why: `<p>Try all 5! = 120 orders of processes and simulate each. It works for 5 but explodes (n! orders). The wasted work: the greedy rule (any eligible process, since Work only grows) finds a sequence in at most n² checks.</p>`, code: { lang: 'python', code: `from itertools import permutations\ndef safe_bruteforce(av, al, mx):\n    n = len(al)\n    for order in permutations(range(n)):      # n! orders\n        w = av[:]\n        ok = True\n        for i in order:\n            if any(mx[i][j] - al[i][j] > w[j] for j in range(len(w))):\n                ok = False\n                break\n            w = [w[j] + al[i][j] for j in range(len(w))]\n        if ok:\n            return list(order)\n    return None` } },
    mcq: { q: 'Need for P2 (Max (9,0,2), Alloc (3,0,2)) is…', options: ['(6,0,0)', '(12,0,4)', '(3,0,2)', '(6,0,4)'], answer: 0, explain: 'Need = Max − Allocation = (9−3, 0−0, 2−2) = (6,0,0).' },
    hints: [`<p>Hint 1: First build Need = Max − Allocation for every process. Then everything else compares Need with Work.</p>`, `<p>Hint 2: Keep a running Work vector (start with Available). A process can run only if all three Need numbers are ≤ the matching Work numbers.</p>`, `<p>Hint 3: After a process runs, add its <b>Allocation</b> (not its Need or Max) to Work. Repeat scanning from P0 each round. Stop when all are done (safe) or a full scan finds nobody (unsafe).</p>`],
    solution: {
      approach: `<p>Compute Need, then run the safety algorithm with Work = (3,3,2). Round 1: P0 needs (7,4,3) - too much; P1 needs (1,2,2) ≤ (3,3,2) → run, Work becomes (5,3,2). Next scan: P0 no; P2 (6,0,0) no (6 &gt; 5); P3 (0,1,1) fits → Work (7,4,3). Next: P0 (7,4,3) fits exactly → Work (7,5,3). P2 (6,0,0) fits → (10,5,5). P4 (4,3,1) fits → (10,5,7). All five finished, so the state is <b>safe</b>, with sequence P1, P3, P0, P2, P4. The final Work equals the totals (10,5,7), a nice sanity check.</p>`,
      code: { lang: 'python', run: true, code: `av = [3, 3, 2]\nal = [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]]\nmx = [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]\nneed = [[mx[i][j]-al[i][j] for j in range(3)] for i in range(5)]\nprint("Need:", need)\nwork, done, seq = av[:], [False]*5, []\nwhile len(seq) < 5:\n    for i in range(5):\n        if not done[i] and all(need[i][j] <= work[j] for j in range(3)):\n            work = [work[j]+al[i][j] for j in range(3)]\n            done[i] = True; seq.append(i)\n            print(f"P{i} runs -> work {work}")\n            break\n    else:\n        print("UNSAFE"); break\nprint("sequence:", seq)` },
      dry: { head: ['Round', 'Work', 'Checked', 'Picked', 'Work after'], rows: [['1', '(3,3,2)', 'P0 no (7,4,3); P1 (1,2,2) yes', 'P1', '(5,3,2)'], ['2', '(5,3,2)', 'P0 no; P2 (6,0,0) no; P3 (0,1,1) yes', 'P3', '(7,4,3)'], ['3', '(7,4,3)', 'P0 (7,4,3) yes', 'P0', '(7,5,3)'], ['4', '(7,5,3)', 'P2 (6,0,0) yes', 'P2', '(10,5,5)'], ['5', '(10,5,5)', 'P4 (4,3,1) yes', 'P4', '(10,5,7)']] },
      complexity: `<p>O(m × n²) = 3 × 25 comparisons. Space O(n × m) for the tables.</p>`,
      followUps: ['Give a different safe sequence (e.g. P1, P3, P4, P0, P2) and verify it', 'What if Available were (0,0,0)?', 'How does the answer change if P0 Max is (7,5,4)?']
    }
  }, {
    title: 'Grant or Deny the Request? (P1 asks (1,0,2))',
    level: 'Medium', tags: ['banker', 'resource request'], companies: ['Oracle', 'Cisco'],
    statement: `<p>Same system as the previous problem (Available (3,3,2)). P1 now requests (1,0,2). Decide whether the OS should grant it immediately using the resource-request algorithm. Show every check.</p>`,
    constraints: `Follow the three checks (Request ≤ Need, Request ≤ Available, pretend + safety).`,
    example: `<p>Request (1,0,2): Need P1 = (1,2,2). ${H.c('g', 'Grant - the pretend state is safe')}.</p>`,
    brute: { why: `<p>"Available is enough, so grant it." This skips the safety check and can hand out resources that later cause a deadlock. Availability alone is a necessary, not sufficient, test.</p>`, code: { lang: 'python', code: `def naive_grant(avail, req):\n    return all(req[j] <= avail[j] for j in range(len(req)))   # ignores future needs!` } },
    mcq: { q: 'After granting (1,0,2) to P1, what is the new Available?', options: ['(2,3,0)', '(4,3,4)', '(2,3,2)', '(3,3,2)'], answer: 0, explain: '(3,3,2) − (1,0,2) = (2,3,0).' },
    hints: [`<p>Hint 1: Three checks in order: Request ≤ Need? Request ≤ Available? Then pretend.</p>`, `<p>Hint 2: Pretend means Available −= Request, Allocation[P1] += Request, Need[P1] −= Request. Then run the safety algorithm on the new numbers.</p>`, `<p>Hint 3: New Need[P1] = (0,2,0); Available = (2,3,0). Scan P0..P4 for the first Need ≤ Work.</p>`],
    solution: {
      approach: `<p>Check 1: Request (1,0,2) ≤ Need[P1] (1,2,2) ✔. Check 2: (1,0,2) ≤ Available (3,3,2) ✔. Pretend: Available becomes (2,3,0); Allocation[P1] = (3,0,2); Need[P1] = (0,2,0). Safety: P0 (7,4,3) no; P1 (0,2,0) ≤ (2,3,0) yes → Work (5,3,2); P2 (6,0,0) no; P3 (0,1,1) yes → (7,4,3); P0 (7,4,3) yes → (7,5,3); P2 → (10,5,5); P4 → (10,5,7). A safe sequence P1, P3, P0, P2, P4 exists, so the new state is safe and the request is <b>granted</b>.</p>`,
      code: { lang: 'python', run: true, code: `av = [3, 3, 2]\nal = [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]]\nmx = [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]\ndef safe(av, al):\n    n = len(al); need = [[mx[i][j]-al[i][j] for j in range(3)] for i in range(n)]\n    w, d, s = av[:], [False]*n, []\n    while len(s) < n:\n        for i in range(n):\n            if not d[i] and all(need[i][j] <= w[j] for j in range(3)):\n                w = [w[j]+al[i][j] for j in range(3)]; d[i] = True; s.append(i); break\n        else:\n            return None\n    return s\nreq = [1, 0, 2]\nnew_av = [av[j]-req[j] for j in range(3)]\nnew_al = [r[:] for r in al]\nnew_al[1] = [new_al[1][j]+req[j] for j in range(3)]\nprint("new available:", new_av)\nprint("safe sequence:", safe(new_av, new_al))` },
      dry: { head: ['Check', 'Compare', 'Result'], rows: [['1. Request ≤ Need', '(1,0,2) ≤ (1,2,2)', '<span class="c-g">yes</span>'], ['2. Request ≤ Available', '(1,0,2) ≤ (3,3,2)', '<span class="c-g">yes</span>'], ['3. Pretend', 'Avail (2,3,0), Alloc P1 (3,0,2), Need P1 (0,2,0)', 'state changed'], ['Safety', 'P1 → P3 → P0 → P2 → P4', '<span class="c-g">safe → GRANT</span>']] },
      complexity: `<p>O(m) for the checks + one safety run O(m n²).</p>`,
      followUps: ['Now P4 requests (3,3,0): what happens?', 'Now P0 requests (0,2,0): what happens?']
    }
  }, {
    title: 'Safe Resources Available but Request Denied',
    level: 'Hard', tags: ['banker', 'unsafe state', 'denial'], companies: ['Oracle', 'Microsoft'],
    statement: `<p>Continue from the state after P1's request (1,0,2) was granted: Available (2,3,0); Allocation P0 (0,1,0), P1 (3,0,2), P2 (3,0,2), P3 (2,1,1), P4 (0,0,2). Max is unchanged. (a) Can P4's request (3,3,0) be granted? (b) Can P0's request (0,2,0) be granted?</p>`,
    constraints: `Show which check fails or the safety result for each.`,
    example: `<p>(a) ${H.c('r', 'wait: (3,3,0) is not ≤ Available (2,3,0)')} (b) ${H.c('r', 'denied: pretend state is unsafe')}.</p>`,
    brute: { why: `<p>Granting both because "Available has B = 3, C = 0 and the request only wants A, B". Looking at availability without checking Need/safety is the classic wrong answer.</p>`, code: { lang: 'python', code: `def naive(avail, req):\n    return all(r <= a for r, a in zip(req, avail))   # wrong: ignores safety` } },
    mcq: { q: 'P4 requests (3,3,0) while Available = (2,3,0). The request algorithm answers…', options: ['P4 must wait (Request > Available)', 'Grant immediately', 'Deny: unsafe state', 'Error: exceeds Need'], answer: 0, explain: 'A: 3 > 2, so check 2 fails and P4 simply waits.' },
    hints: [`<p>Hint 1: For (a), do check 2 first: compare each component with Available (2,3,0).</p>`, `<p>Hint 2: For (b), Request (0,2,0) passes checks 1 and 2. Build the pretend state: Available (2,1,0), P0 Alloc (0,3,0), Need (7,2,3).</p>`, `<p>Hint 3: Scan all processes against Work (2,1,0). Needs: P0 (7,2,3), P1 (0,2,0), P2 (6,0,0), P3 (0,1,1), P4 (4,3,1). Does any fit?</p>`],
    solution: {
      approach: `<p>(a) P4 requests (3,3,0). Check 1: Need[P4] = (4,3,1) ≥ (3,3,0) ✔. Check 2: Available (2,3,0): 3 &gt; 2 on resource A, so the request is not ≤ Available and P4 <b>waits</b>. (b) P0 requests (0,2,0): Need[P0] (7,4,3) ✔, Available (2,3,0) ✔. Pretend: Available (2,1,0), Alloc[P0] (0,3,0), Need[P0] (7,2,3). Safety with Work (2,1,0): P0 (7,2,3) no; P1 (0,2,0) needs 2 of B but Work has 1 - no; P2 (6,0,0) no; P3 (0,1,1) needs 1 of C but Work has 0 - no; P4 (4,3,1) no. Nobody can run → <b>unsafe</b>, so the request is denied and the state is rolled back, although (0,2,0) is physically available.</p>`,
      code: { lang: 'python', run: true, code: `mx = [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]\nal = [[0,1,0],[3,0,2],[3,0,2],[2,1,1],[0,0,2]]\nav = [2, 3, 0]\ndef safe(av, al):\n    n = len(al); need = [[mx[i][j]-al[i][j] for j in range(3)] for i in range(n)]\n    w, d, s = av[:], [False]*n, []\n    while len(s) < n:\n        for i in range(n):\n            if not d[i] and all(need[i][j] <= w[j] for j in range(3)):\n                w = [w[j]+al[i][j] for j in range(3)]; d[i] = True; s.append(i); break\n        else:\n            return None\n    return s\n# (a)\nprint("P4 (3,3,0) <= avail?", all(r <= a for r, a in zip([3,3,0], av)))\n# (b)\nreq = [0, 2, 0]\nnav = [av[j]-req[j] for j in range(3)]\nnal = [r[:] for r in al]; nal[0] = [nal[0][j]+req[j] for j in range(3)]\nprint("P0 (0,2,0) safe sequence:", safe(nav, nal))` },
      dry: { head: ['Process', 'Need (pretend)', 'Work (2,1,0)', 'Fits?'], rows: [['P0', '(7,2,3)', '(2,1,0)', '<span class="c-r">no</span>'], ['P1', '(0,2,0)', '(2,1,0)', '<span class="c-r">no (B: 2 > 1)</span>'], ['P2', '(6,0,0)', '(2,1,0)', '<span class="c-r">no</span>'], ['P3', '(0,1,1)', '(2,1,0)', '<span class="c-r">no (C: 1 > 0)</span>'], ['P4', '(4,3,1)', '(2,1,0)', '<span class="c-r">no</span>']] },
      complexity: `<p>O(m n²) per request.</p>`,
      followUps: ['Does an unsafe state mean the system is deadlocked right now?', 'How long should a denied process wait before retrying?']
    }
  }]
});

// =====================================================================
// TOPIC 5 - Detection
// =====================================================================
topics.push({
  title: 'Deadlock Detection: Wait-For Graphs and the Multi-Instance Algorithm',
  analogy: `<p>Instead of preventing traffic jams, the city lets cars drive freely and sends a <b>helicopter</b> every few minutes. From above it sees the picture: "car 1 waits for car 2, car 2 for car 3, car 3 for car 1 - a loop!" Only then does the city act. Detection = <b>let it happen, look for it, fix it</b>. Cheap during normal operation, costly only when you look.</p>`,
  explain: `<p>🟢 <b>Detection</b> means: allow deadlocks, periodically check, then recover. It needs no advance knowledge of maximum needs (unlike the Banker's algorithm) and puts no restrictions on how processes request resources.</p>
  <p><b>Case 1 - single instance per resource: the wait-for graph (WFG).</b> Nodes are only processes. An edge <code>P → Q</code> means "P is waiting for a resource that Q holds". A <b>cycle</b> in the WFG ⇔ deadlock. Algorithm: run DFS; if you meet a node that is <i>currently on the recursion stack</i> you found a cycle.</p>
  ${H.table(['DFS colour', 'Meaning'], [['white (0)', 'not visited'], ['grey (1)', 'on the current recursion path (in progress)'], ['black (2)', 'fully explored, no cycle through it']])}
  <p>Edge to a <b>grey</b> node = back edge = cycle. Edge to black = harmless (cross/forward edge). Cost: O(V + E).</p>
  <p>🔵 <b>Case 2 - multiple instances: the detection algorithm</b> (the Banker's cousin). Data: <code>Available</code>, <code>Allocation</code>, and a <b>Request</b> matrix (what each process is <i>currently waiting for</i> - no "Max" here).</p>
  <ol><li><code>Work = Available</code>. <code>Finish[i] = true</code> if Allocation[i] is all zeros (it holds nothing, cannot be part of a deadlock), else false.</li><li>Find i with <code>Finish[i] == false</code> and <code>Request[i] ≤ Work</code>.</li><li>If found: <code>Work += Allocation[i]</code>, <code>Finish[i] = true</code>, go to 2. (Optimistic: assume it will finish and release.)</li><li>Any process with <code>Finish == false</code> at the end is <b>deadlocked</b>.</li></ol>
  <p><b>Difference from the safety algorithm:</b> uses <i>Request</i> (current waiting) instead of <i>Need</i> (future possible), and it is optimistic ("if its current request can be met, it will finish").</p>
  <p><b>Example</b> (5 processes; A=7, B=2, C=6 total; Available (0,0,0)):</p>
  ${H.table(['', 'Alloc', 'Request'], [['P0', '0 1 0', '0 0 0'], ['P1', '2 0 0', '2 0 2'], ['P2', '3 0 3', '0 0 0'], ['P3', '2 1 1', '1 0 0'], ['P4', '0 0 2', '0 0 2']])}
  <p>P0 (0,0,0) ≤ Work → Work (0,1,0). P2 (0,0,0) → (3,1,3). P3 (1,0,0) → (5,2,4). P1 (2,0,2) → (7,2,4). P4 (0,0,2) → (7,2,6). All finish → no deadlock: sequence ⟨P0,P2,P3,P1,P4⟩. Now suppose P2 asks for one more C: Request P2 = (0,0,1). Work after P0 is (0,1,0); nobody else fits → <span class="c-r">P1, P2, P3, P4 are deadlocked</span> (P0 is fine).</p>
  <p><b>When to run detection?</b> Every request (expensive, finds the culprit immediately), every N minutes, or when CPU utilisation falls (a hint that many processes are blocked). Databases usually run it when a lock wait exceeds a short threshold.</p>`,
  clues: ['"Wait-for graph" / "find if the graph has a cycle" → single-instance detection via DFS', '"Request matrix instead of Max" → multi-instance detection algorithm', '"which processes are deadlocked?" → those with Finish[i] = false at the end', '"We cannot know maximum needs in advance" → detection + recovery, not Banker\'s', '"How often should the OS run the detection algorithm?" → on each blocked request or periodically / when CPU idles', '"Database aborted a transaction: deadlock detected" → wait-for graph + victim selection'],
  code: [`// Wait-for-graph cycle detection with DFS colouring (C++)
#include <vector>
#include <iostream>
using namespace std;

// color: 0 = white, 1 = grey (on stack), 2 = black (done)
bool dfs(int u, const vector<vector<int>>& g, vector<int>& color, vector<int>& path, vector<int>& cycle) {
    color[u] = 1;
    path.push_back(u);
    for (int v : g[u]) {
        if (color[v] == 1) {                       // back edge: v is still on the recursion stack
            auto it = find(path.begin(), path.end(), v);
            cycle.assign(it, path.end());          // the cycle is the path from v to u
            return true;
        }
        if (color[v] == 0 && dfs(v, g, color, path, cycle)) return true;
    }
    path.pop_back();
    color[u] = 2;
    return false;
}
int main() {
    // P0 -> P1 -> P2 -> P0 and P3 -> P0 (P3 waits but is not in the cycle)
    vector<vector<int>> g = {{1}, {2}, {0}, {0}};
    vector<int> color(4, 0), path, cycle;
    for (int s = 0; s < 4 && cycle.empty(); ++s)
        if (color[s] == 0) dfs(s, g, color, path, cycle);
    if (cycle.empty()) cout << "no deadlock\\n";
    else { cout << "deadlock among:"; for (int p : cycle) cout << " P" << p; cout << "\\n"; }
}`,
    `// Multi-instance detection algorithm (C++): returns the list of deadlocked processes
#include <vector>
using namespace std;

vector<int> detectDeadlocked(vector<int> work,
                             const vector<vector<int>>& alloc,
                             const vector<vector<int>>& request) {
    int n = alloc.size(), m = work.size();
    vector<bool> finish(n, false);
    for (int i = 0; i < n; ++i) {                    // holding nothing => cannot be in a deadlock
        bool zero = true;
        for (int j = 0; j < m; ++j) if (alloc[i][j] != 0) zero = false;
        finish[i] = zero;
    }
    bool progress = true;
    while (progress) {
        progress = false;
        for (int i = 0; i < n; ++i) {
            if (finish[i]) continue;
            bool ok = true;
            for (int j = 0; j < m; ++j) if (request[i][j] > work[j]) ok = false;
            if (ok) {                                // optimistic: i gets what it asks, finishes, releases
                for (int j = 0; j < m; ++j) work[j] += alloc[i][j];
                finish[i] = true; progress = true;
            }
        }
    }
    vector<int> dead;
    for (int i = 0; i < n; ++i) if (!finish[i]) dead.push_back(i);
    return dead;                                     // empty => no deadlock
}`,
    { lang: 'python', run: true, title: 'Wait-for graph cycle detection + multi-instance detection (runnable, edit the inputs)', code: `# stdlib only. Edit 'edges' and the matrices, then Run.
# ---- 1) Wait-for graph: "P1 waits for P2" is the edge (1, 2) ----
edges = [("P1", "P2"), ("P2", "P3"), ("P3", "P1"), ("P4", "P1")]

def find_cycle(edges):
    g = {}
    for u, v in edges:
        g.setdefault(u, []).append(v)
        g.setdefault(v, [])
    color = {u: 0 for u in g}          # 0 white, 1 grey (on stack), 2 black (finished)
    path = []
    def dfs(u):
        color[u] = 1
        path.append(u)
        for v in g[u]:
            if color[v] == 1:                       # back edge -> cycle
                return path[path.index(v):]
            if color[v] == 0:
                c = dfs(v)
                if c:
                    return c
        path.pop()
        color[u] = 2
        return None
    for s in list(g):
        if color[s] == 0:
            c = dfs(s)
            if c:
                return c
    return None

cyc = find_cycle(edges)
print("Wait-for graph:", edges)
print("Deadlock cycle:", " -> ".join(cyc + [cyc[0]]) if cyc else "none")

# ---- 2) Multi-instance detection (Request matrix, no Max) ----
available = [0, 0, 0]
alloc   = [[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]]
request = [[0,0,0],[2,0,2],[0,0,1],[1,0,0],[0,0,2]]   # P2 asks for one more C -> deadlock

def detect(avail, alloc, request):
    n, m = len(alloc), len(avail)
    work = avail[:]
    finish = [all(x == 0 for x in alloc[i]) for i in range(n)]   # holds nothing => finished
    order = []
    changed = True
    while changed:
        changed = False
        for i in range(n):
            if not finish[i] and all(request[i][j] <= work[j] for j in range(m)):
                work = [work[j] + alloc[i][j] for j in range(m)]
                finish[i] = True
                order.append(i)
                changed = True
    return [i for i in range(n) if not finish[i]], order

dead, order = detect(available, alloc, request)
print("Optimistic finish order:", ["P%d" % i for i in order])
print("Deadlocked processes:", ["P%d" % i for i in dead] if dead else "none")` }],
  codeTitle: ['DFS cycle detection on a wait-for graph (C++)', 'Multi-instance detection algorithm (C++)', 'Wait-for graph + multi-instance detection (Python, runnable)'],
  viz: [{
    title: 'Wait-for graph: DFS with recursion stack',
    input: 'P1>P2 P2>P3 P3>P1 P4>P1',
    inputLabel: 'Wait-for edges "P1>P2" = P1 waits for P2 (space separated, up to 14 edges)',
    gen: function (input) {
      var g = edgeParse(input), ids = g.ids, N = ids.length, fr = [];
      var nodes = ids.map(function (id, k) { var ang = 2 * Math.PI * k / N - Math.PI / 2; return { id: id, label: id, x: 50 + 34 * Math.cos(ang), y: 30 + 24 * Math.sin(ang) }; });
      var adj = {}; ids.forEach(function (i) { adj[i] = []; }); g.edges.forEach(function (e) { adj[e[0]].push(e[1]); });
      var color = {}, path = [], found = null, edgeList = g.edges.map(function (e) { return [e[0], e[1]]; });
      function G(hlExtra, ehl) { var hl = {}; ids.forEach(function (i) { if (color[i] === 2) hl[i] = 'done'; else if (color[i] === 1) hl[i] = 'win'; }); if (path.length) hl[path[path.length - 1]] = 'cur'; for (var k in hlExtra) hl[k] = hlExtra[k]; return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edgeList, hl: hl, ehl: ehl || {} }; }
      function S() { return { type: 'stack', label: 'DFS recursion stack (top = right)', items: path.map(function (p) { return 'dfs(' + p + ')'; }), hl: path.length ? (function () { var h = {}; h[path.length - 1] = 'cur'; return h; })() : {} }; }
      fr.push({ narr: 'Wait-for graph: <b>P → Q</b> = "P waits for a resource held by Q". Run DFS from each unvisited process. A neighbour that is already <b>on the recursion stack</b> means a cycle = deadlock.', parts: [G({}), S()] });
      function dfs(u) {
        color[u] = 1; path.push(u);
        fr.push({ narr: 'Enter <b>dfs(' + u + ')</b>: push on the stack, mark grey (in progress).', parts: [G({}), S()] });
        for (var k = 0; k < adj[u].length && !found && fr.length < 60; k++) {
          var v = adj[u][k], eh = {}; eh[u + '-' + v] = 'cur';
          if (color[v] === 1) {
            found = path.slice(path.indexOf(v));
            var hl = {}, eb = {}; found.forEach(function (c, q) { hl[c] = 'bad'; eb[c + '-' + found[(q + 1) % found.length]] = 'bad'; });
            fr.push({ narr: 'Edge ' + u + ' → ' + v + ': <b>' + v + ' is grey (already on the stack)</b> → <span class="c-r">back edge! Cycle: ' + found.join(' → ') + ' → ' + found[0] + '</span>.', parts: [G(hl, eb), S()] });
          } else if (color[v] === 2) {
            fr.push({ narr: 'Edge ' + u + ' → ' + v + ': ' + v + ' is black (fully explored, no cycle through it) → skip.', parts: [G({}, eh), S()] });
          } else {
            fr.push({ narr: 'Edge ' + u + ' → ' + v + ': ' + v + ' is white (new) → recurse.', parts: [G({}, eh), S()] });
            dfs(v);
          }
        }
        if (!found) { path.pop(); color[u] = 2; fr.push({ narr: 'All neighbours of <b>' + u + '</b> explored, no cycle → pop, mark black.', parts: [G({}), S()] }); }
      }
      for (var i = 0; i < ids.length && !found; i++) { if (!color[ids[i]]) dfs(ids[i]); }
      if (found) fr.push({ narr: '<span class="c-r">DEADLOCK</span> among <b>' + found.join(', ') + '</b>. (Processes outside the cycle that merely wait for them are blocked but not part of the cycle.)', parts: [G(found.reduce(function (h, c) { h[c] = 'bad'; return h; }, {}))] });
      else fr.push({ narr: '<span class="c-g">No cycle found → no deadlock.</span>', parts: [G({})] });
      return fr;
    }
  }, {
    title: 'Multi-instance detection algorithm (Request matrix)',
    input: '0 0 0 / 0 1 0 | 0 0 0 / 2 0 0 | 2 0 2 / 3 0 3 | 0 0 1 / 2 1 1 | 1 0 0 / 0 0 2 | 0 0 2',
    inputLabel: 'avail / alloc | REQUEST / alloc | request / ... (Request = what the process is waiting for NOW)',
    gen: function (input) {
      // the second vector of each process is a REQUEST (not Max), so we parse it ourselves
      var parts = String(input).split('/').map(function (s) { return s.trim(); }).filter(Boolean);
      var avail = nums(parts[0]), alloc = [], req = [];
      for (var i = 1; i < parts.length; i++) { var ab = parts[i].split('|'); alloc.push(nums(ab[0])); req.push(nums(ab[1])); }
      var n = alloc.length, m = avail.length;
      if (!n || n > 6 || m < 1 || m > 4 || avail.some(isNaN) || alloc.some(function (r, i) { return r.length !== m || req[i].length !== m || r.some(isNaN) || req[i].some(isNaN); })) throw new Error('Format: avail / alloc | request / alloc | request ... (same length vectors, up to 6 processes)');
      var work = avail.slice(), fin = alloc.map(function (a) { return a.every(function (x) { return x === 0; }); }), order = [], fr = [];
      function grid(cur, bad) {
        var colHead = [], j; for (j = 0; j < m; j++) colHead.push('Alloc ' + RN[j]); for (j = 0; j < m; j++) colHead.push('Request ' + RN[j]); colHead.push('Finish');
        var rows = alloc.map(function (a, r) { return a.concat(req[r], [fin[r] ? 'true' : 'false']); }), hl = {};
        for (var r = 0; r < n; r++) { var cls = fin[r] ? 'done' : (r === cur ? 'cur' : (bad && bad.indexOf(r) >= 0 ? 'bad' : '')); if (cls) for (var c = 0; c <= 2 * m; c++) hl[r + ',' + c] = cls; }
        return { type: 'grid', label: 'Allocation | Request | Finish', rowHead: alloc.map(function (x, i) { return 'P' + i; }), colHead: colHead, rows: rows, hl: hl };
      }
      function V() { return { type: 'vars', label: 'Vectors', vals: { Work: vstr(work) }, hl: { Work: 'ok' } }; }
      function OA() { return { type: 'array', label: 'Optimistic finish order', values: order.map(function (x) { return 'P' + x; }) }; }
      fr.push({ narr: 'Work = Available = <b>' + vstr(work) + '</b>. A process that holds nothing is marked Finish = true at once. Now look for unfinished P with <b>Request ≤ Work</b>.', parts: [grid(-1), V(), OA()] });
      var progress = true;
      while (progress && fr.length < 40) {
        progress = false;
        for (var p = 0; p < n; p++) {
          if (fin[p]) continue;
          if (leq(req[p], work)) {
            fr.push({ narr: 'P' + p + ': Request ' + vstr(req[p]) + ' ≤ Work ' + vstr(work) + ' → optimistically it will get it, finish, and return ' + vstr(alloc[p]) + '.', parts: [grid(p), V(), OA()] });
            work = addv(work, alloc[p]); fin[p] = true; order.push(p); progress = true;
            fr.push({ narr: 'Work = <b>' + vstr(work) + '</b>. P' + p + ' marked finished.', parts: [grid(-1), V(), OA()] });
          }
        }
      }
      var dead = []; for (var q = 0; q < n; q++) if (!fin[q]) dead.push(q);
      if (dead.length) fr.push({ narr: '<span class="c-r">Deadlock!</span> Still unfinished: <b>' + dead.map(function (x) { return 'P' + x; }).join(', ') + '</b>. Their requests cannot be met even if everyone else finishes.', parts: [grid(-1, dead), V(), OA()] });
      else fr.push({ narr: '<span class="c-g">Everyone can finish → no deadlock right now.</span>', parts: [grid(-1), V(), OA()] });
      return fr;
    }
  }],
  examples: [
    { title: 'Find the cycle: P1→P2, P2→P3, P3→P1, P4→P1', html: `<p>DFS from P1: P1 → P2 → P3 → (P1 is grey) → <b>cycle P1, P2, P3</b>. P4 is waiting for P1 but is not on the cycle: it is <i>blocked by</i> the deadlock, not <i>part of</i> it. Killing P4 does not help; killing any of P1, P2, P3 does.</p>` },
    { title: 'No cycle: P1→P2, P2→P3, P4→P3', html: `<p>DFS: P1→P2→P3 (no outgoing) → black. P4→P3 (black) skip. No back edge → no deadlock. P3 will finish, then P2, then P1 and P4.</p>` },
    { title: 'Detection with Request: who is deadlocked?', html: `<p>Alloc P0..P4 = (0,1,0),(2,0,0),(3,0,3),(2,1,1),(0,0,2); Requests = (0,0,0),(2,0,2),(0,0,1),(1,0,0),(0,0,2); Available (0,0,0). Only P0 can proceed (Work becomes (0,1,0)); then no one's request fits. Deadlocked: <b>P1, P2, P3, P4</b>. Check: P1 wants A and C, P2 wants C, P3 wants A, P4 wants C; free = only 1 B.</p>` }
  ],
  deepDive: `<p>🟣 <b>Why optimistic is right.</b> If P's current request can be satisfied, then either P finishes and returns its resources, or it requests more later - in which case, if that causes a deadlock, a <i>later</i> run of the algorithm will report it. Detection only reports deadlocks that already exist, so there are no false positives.</p>
  <p><b>Detection vs safety, side by side.</b></p>
  ${H.table(['', 'Safety algorithm (avoidance)', 'Detection algorithm'], [['Uses', 'Need = Max − Alloc (possible future)', 'Request (actual current wait)'], ['Assumes', 'Worst case: each asks its full Need', 'Optimistic: only the current request'], ['Answers', 'Could a deadlock ever happen?', 'Is there a deadlock now? who?'], ['Process holding nothing', 'Still checked', 'Marked finished immediately']])}
  <p><b>Complexity.</b> Multi-instance: O(m × n²). WFG DFS: O(V + E). Iterative DFS avoids stack overflow on huge graphs (thousands of waiting transactions).</p>
  <p><b>Distributed deadlock detection.</b> Each site keeps a local WFG; global cycles span sites. Approaches: a central coordinator merging graphs (phantom deadlocks risk: stale edges, so a false cycle appears), <i>edge-chasing</i> (Chandy-Misra-Haas: send probe messages along wait edges; if a probe returns to its initiator, it is a deadlock), or just <b>timeouts</b> (what most distributed databases and lock services really do).</p>
  <p><b>Databases in practice.</b> MySQL/InnoDB maintains a wait-for graph and aborts the transaction with the least undo work ("deadlock found when trying to get lock; try restarting transaction"). PostgreSQL waits <code>deadlock_timeout</code> (1 s default) before running the check, because most waits resolve by themselves. Applications must retry on the deadlock error.</p>
  <p><b>False alarms and phantom edges.</b> A snapshot-based detector must read a consistent state; if edges change while the graph is built, you can see a cycle that never existed. Take a latch or version the graph.</p>
  <p><b>Cost model.</b> Running detection after every blocked request costs O(n²) each; if deadlocks are rare that is wasteful. Periodic or timeout-triggered runs trade detection delay for lower overhead. Many deadlocked processes then accumulate, holding resources hostage.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> LLM agent systems recreate the classic problem: Agent A holds the "database write" tool and waits for the "browser" tool; Agent B holds the browser and waits for the DB. Orchestrators (LangGraph, workflow engines) need timeouts, step budgets and cycle detection on the task graph - the same wait-for graph idea.</p>
  <p><b>Use AI as a partner:</b> paste <code>SHOW ENGINE INNODB STATUS</code> or a Postgres deadlock log and ask: <code>Draw the wait-for graph and tell me which statement order to change.</code> AI observability tools can also cluster recurring deadlock traces across millions of logs.</p>
  <p><b>Where AI goes wrong:</b> it sometimes treats any chain of waiting as a deadlock (a chain without a cycle is just queueing); it confuses the direction of edges; it suggests increasing lock timeout, which makes the stall longer.</p>
  <p><b>What you must still own:</b> choose between "graph cycle" (single instance) and "Request matrix" (multi-instance); explain why a process waiting on the cycle is blocked but not deadlocked; decide when and how often to run detection.</p>`,
  problems: [{
    title: 'Is There a Deadlock in This Wait-For Graph?',
    level: 'Easy', tags: ['wait-for graph', 'cycle detection', 'dfs'], companies: ['TCS', 'Wipro', 'Amazon'],
    statement: `<p>Six processes with wait-for edges: P1→P2, P2→P4, P3→P2, P4→P5, P5→P2, P6→P3. (a) Is there a deadlock? (b) Which processes are in the cycle? (c) Which processes are blocked but not deadlocked in the cycle?</p>`,
    constraints: `Single instance per resource, so the wait-for graph cycle test is exact.`,
    example: `<p>Cycle ${H.c('r', 'P2 → P4 → P5 → P2')}. P1, P3, P6 only lead into it.</p>`,
    brute: { why: `<p>Try every subset of processes and check whether each member waits for another member: 2<sup>n</sup> subsets. Or just stare at the picture. DFS with grey/black colours does it in O(V + E).</p>`, code: { lang: 'python', code: `from itertools import combinations\ndef has_deadlock_bruteforce(nodes, edges):\n    for r in range(2, len(nodes) + 1):\n        for sub in combinations(nodes, r):          # 2^n subsets\n            s = set(sub)\n            if all(any(u == x and v in s for u, v in edges) for x in s):\n                return True                          # everyone waits for someone in the set\n    return False` } },
    mcq: { q: 'During DFS you reach a node that is currently grey (on the recursion stack). This means…', options: ['A cycle exists', 'The node is a leaf', 'The graph is a tree', 'A forward edge'], answer: 0, explain: 'An edge to a node on the current path is a back edge, which closes a cycle.' },
    hints: [`<p>Hint 1: A deadlock in a wait-for graph is exactly a directed cycle.</p>`, `<p>Hint 2: Follow arrows from P1: P1 → P2 → P4 → P5 → P2. You returned to P2.</p>`, `<p>Hint 3: Processes in the cycle: from the repeated node P2 around back to P2. P1, P3 and P6 wait (directly or indirectly) on that cycle, so they are stuck too, but they are not part of it.</p>`],
    solution: {
      approach: `<p>Run DFS from P1: dfs(P1) → dfs(P2) → dfs(P4) → dfs(P5) → neighbour P2 is grey (on the stack) → back edge, cycle <b>P2 → P4 → P5 → P2</b>. So yes, there is a deadlock. P2, P4, P5 are deadlocked. P1 waits for P2, P3 waits for P2 and P6 waits for P3 - they are blocked <i>by</i> the deadlock and will never run until it is resolved, but killing them would not break the cycle. Recovery must remove one of P2, P4 or P5 (or preempt a resource from one of them).</p>`,
      code: { lang: 'python', run: true, code: `edges = [(1,2),(2,4),(3,2),(4,5),(5,2),(6,3)]\ng = {i: [] for i in range(1, 7)}\nfor u, v in edges:\n    g[u].append(v)\ncolor = {i: 0 for i in g}\npath = []\ndef dfs(u):\n    color[u] = 1; path.append(u)\n    for v in g[u]:\n        if color[v] == 1:\n            return path[path.index(v):]\n        if color[v] == 0:\n            c = dfs(v)\n            if c: return c\n    path.pop(); color[u] = 2\n    return None\nfor s in g:\n    if color[s] == 0:\n        c = dfs(s)\n        if c:\n            print("cycle:", c)\n            break` },
      dry: { head: ['Step', 'Stack (path)', 'Looking at', 'Result'], rows: [['1', 'P1', 'P1→P2', 'P2 white → recurse'], ['2', 'P1,P2', 'P2→P4', 'P4 white → recurse'], ['3', 'P1,P2,P4', 'P4→P5', 'P5 white → recurse'], ['4', 'P1,P2,P4,P5', 'P5→P2', '<span class="c-r">P2 is grey → cycle P2,P4,P5</span>']] },
      complexity: `<p>Time O(V + E) = 6 + 6 steps; space O(V) for colours and the stack.</p>`,
      followUps: ['Which single process could you kill to clear the deadlock?', 'What if P5→P2 were removed?']
    }
  }, {
    title: 'Multi-Instance Detection: Who Is Deadlocked?',
    level: 'Hard', tags: ['detection', 'multi-instance', 'request matrix'], companies: ['Oracle', 'Microsoft'],
    statement: `<p>Available (0,0,0). Allocation: P0 (0,1,0), P1 (2,0,0), P2 (3,0,3), P3 (2,1,1), P4 (0,0,2). Requests: P0 (0,0,0), P1 (2,0,2), P2 (0,0,1), P3 (1,0,0), P4 (0,0,2). Run the deadlock-detection algorithm. Which processes are deadlocked?</p>`,
    constraints: `Use Work = Available, Finish[i] = true if Allocation[i] is all zeros, and compare Request[i] ≤ Work.`,
    example: `<p>${H.c('r', 'Deadlocked: P1, P2, P3, P4')}. Only P0 finishes.</p>`,
    brute: { why: `<p>Use the Banker's safety algorithm with Max unknown - impossible: detection has no Max. Or kill random processes until things move. The detection algorithm needs only current Request.</p>`, code: { lang: 'python', code: `# Wrong tool: treating Request as if it were the whole future Need\n# (that would be the safety algorithm - pessimistic, may report phantom problems)\ndef wrong(av, al, rq):\n    return all(rq[i][j] <= av[j] for i in range(len(al)) for j in range(len(av)))` } },
    mcq: { q: 'In the detection algorithm, a process with Allocation = (0,0,0) is…', options: ['Marked Finish = true immediately', 'Always deadlocked', 'Killed first', 'Ignored when computing Work'], answer: 0, explain: 'A process holding nothing cannot be part of a hold-and-wait cycle; it cannot hold anyone up.' },
    hints: [`<p>Hint 1: Work starts at Available (0,0,0). Which process has Request (0,0,0)?</p>`, `<p>Hint 2: After P0 runs, Work = (0,1,0). Compare every other Request with that.</p>`, `<p>Hint 3: If nobody fits, everyone who is still unfinished is deadlocked.</p>`],
    solution: {
      approach: `<p>Work = (0,0,0). None of the processes holds nothing. P0: Request (0,0,0) ≤ Work → it finishes, Work = (0,1,0). Next scan: P1 needs (2,0,2) - A 2 &gt; 0, no. P2 needs (0,0,1): C 1 &gt; 0, no. P3 needs (1,0,0): A 1 &gt; 0, no. P4 needs (0,0,2): C 2 &gt; 0, no. No unfinished process can be satisfied, so <b>P1, P2, P3, P4 are deadlocked</b>. Reasoning in plain words: the only free resource after P0 is one unit of B, which nobody wants; everyone else is waiting for A or C that only the other deadlocked processes hold.</p>`,
      code: { lang: 'python', run: true, code: `alloc = [[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]]\nreq   = [[0,0,0],[2,0,2],[0,0,1],[1,0,0],[0,0,2]]\nwork = [0, 0, 0]\nfin = [all(x == 0 for x in a) for a in alloc]\nchanged = True\nwhile changed:\n    changed = False\n    for i in range(5):\n        if not fin[i] and all(req[i][j] <= work[j] for j in range(3)):\n            work = [work[j] + alloc[i][j] for j in range(3)]\n            fin[i] = True; changed = True\n            print(f"P{i} can finish -> work {work}")\nprint("deadlocked:", [f"P{i}" for i in range(5) if not fin[i]])` },
      dry: { head: ['Step', 'Work', 'Process tried', 'Request ≤ Work?'], rows: [['1', '(0,0,0)', 'P0 (0,0,0)', '<span class="c-g">yes → finish</span>'], ['2', '(0,1,0)', 'P1 (2,0,2)', '<span class="c-r">no</span>'], ['3', '(0,1,0)', 'P2 (0,0,1)', '<span class="c-r">no</span>'], ['4', '(0,1,0)', 'P3 (1,0,0)', '<span class="c-r">no</span>'], ['5', '(0,1,0)', 'P4 (0,0,2)', '<span class="c-r">no → stop, P1-P4 deadlocked</span>']] },
      complexity: `<p>Time O(m × n²) for m resource types and n processes; space O(n × m).</p>`,
      followUps: ['If P2 requested (0,0,0) instead, what changes? (answer: no deadlock)', 'Which victim would you pick?']
    }
  }]
});

// =====================================================================
// TOPIC 6 - Recovery
// =====================================================================
topics.push({
  title: 'Deadlock Recovery: Kill, Roll Back or Preempt',
  analogy: `<p>The helicopter has spotted gridlock at a crossing. The city has three tools: <b>tow</b> one car away (kill a process), <b>make one car reverse</b> to an earlier point and try again later (rollback), or <b>borrow</b> a lane for a while (preempt a resource). Which car do you tow? The one that is cheapest to lose - the empty taxi, not the ambulance.</p>`,
  explain: `<p>🟢 <b>Recovery</b> breaks a detected deadlock by changing the situation: either terminate processes or take resources away.</p>
  ${H.table(['Method', 'What you do', 'Pros', 'Cons'], [
    ['Abort <b>all</b> deadlocked processes', 'Kill everyone in the cycle', 'Simple and sure', 'Throws away a lot of work'],
    ['Abort <b>one at a time</b>', 'Kill a victim, re-run detection, repeat', 'Loses less work', 'Detection runs many times'],
    ['<b>Preempt</b> resources', 'Take a resource from a process, give it to another', 'Process may survive', 'Must save/restore state; can pick the same victim again'],
    ['<b>Rollback</b>', 'Return a process to a checkpoint / undo transaction, release locks', 'Keeps most of the work', 'Needs checkpoints or undo logs']
  ])}
  <p>🔵 <b>Choosing the victim.</b> Pick the process with the lowest "cost of loss":</p>
  <ul><li>priority (kill low priority first), and how long it has run / how much is left;</li><li>how many resources it holds and how many more it needs;</li><li>how much work would be redone (database: size of the undo log);</li><li>is it interactive or batch; will rolling back be safe (side effects like sent email cannot be undone)?</li></ul>
  <p><b>Danger: starvation.</b> If you always pick the same cheap victim, it never finishes. Fix: include the <b>number of times already rolled back</b> in the cost (so each rollback makes it more expensive to pick again), or use a fairness rule such as "older transactions win" (wait-die / wound-wait).</p>
  <p><b>Walk-through.</b> Cycle P1 → P2 → P3 → P1 with costs P1 = 5, P2 = 2, P3 = 9. Cheapest = P2. Roll back P2: it releases the resource P3 was waiting for → P3 runs and finishes → P1 finishes → P2 restarts later. Run the visualizer and edit the costs.</p>
  <p><b>Real systems:</b> a database picks one transaction, rolls it back and returns an error that the application retries (always write retry logic around deadlock errors). Operating systems seldom kill a stuck process automatically; an operator uses <code>kill</code>, or the OS's out-of-memory killer picks a victim with a "badness" score.</p>`,
  clues: ['"Deadlock detected - how do you recover?" → abort all / abort one at a time / preempt / rollback', '"Which process do you choose as the victim?" → minimum cost: priority, work done, resources held, rollbacks so far', '"Same transaction keeps getting aborted" → starvation of the victim; add rollback count or age to cost', '"Rollback to a safe state / checkpoint" → total rollback vs partial rollback', '"Database returned error 1213 / SQLSTATE 40001" → deadlock victim; the app must retry', '"OOM killer" → recovery by victim selection (badness score) on memory exhaustion'],
  code: [`// Victim selection + retry loop (C++ sketch). Cost grows each time a transaction is chosen.
#include <vector>
#include <iostream>
#include <algorithm>
using namespace std;

struct Proc { int id; int priority; int workDone; int rollbacks; };

// lower cost = better victim; the rollbacks term prevents repeatedly picking the same process
long cost(const Proc& p) {
    return 10L * p.priority + p.workDone + 50L * p.rollbacks;
}
int pickVictim(const vector<Proc>& cycle) {
    return min_element(cycle.begin(), cycle.end(),
                       [](const Proc& a, const Proc& b) { return cost(a) < cost(b); })->id;
}
int main() {
    vector<Proc> cycle = {{1, 5, 40, 0}, {2, 2, 10, 0}, {3, 9, 80, 0}};
    int victim = pickVictim(cycle);
    cout << "victim: P" << victim << "\\n";          // P2: low priority, little work to redo
    for (auto& p : cycle) if (p.id == victim) p.rollbacks++;
    cout << "next time cost of P" << victim << " = " << cost(*find_if(cycle.begin(), cycle.end(), [&](const Proc& p) { return p.id == victim; })) << "\\n";
}`,
  { lang: 'text', code: `-- Typical application-side handling of a deadlock victim (pseudo-code, not executed)
for attempt in 1..5:
    try:
        BEGIN
        UPDATE accounts SET bal = bal - 10 WHERE id = 1;
        UPDATE accounts SET bal = bal + 10 WHERE id = 2;
        COMMIT
        break
    except DeadlockDetected:          -- DB rolled this transaction back for us
        ROLLBACK
        sleep(random backoff)        -- avoid retrying in lock-step` }],
  codeTitle: ['Victim selection with rollback count (C++)', 'Retry on deadlock (pseudo-code)'],
  viz: {
    title: 'Pick a victim and unwind the deadlock',
    input: 'P1:5 P2:2 P3:9',
    inputLabel: 'Cycle members and the cost of killing each (name:cost, 2 to 6 processes)',
    gen: function (input) {
      var toks = String(input).trim().split(/[\s,]+/).filter(Boolean);
      if (toks.length < 2 || toks.length > 6) throw new Error('Give 2-6 entries like P1:5 P2:2');
      var ps = toks.map(function (t) { var a = t.split(':'); if (a.length !== 2 || isNaN(Number(a[1]))) throw new Error('Use name:cost, e.g. P1:5'); return { id: a[0], cost: Number(a[1]) }; });
      var N = ps.length, nodes = ps.map(function (p, k) { var ang = 2 * Math.PI * k / N - Math.PI / 2; return { id: p.id, label: p.id, x: 50 + 30 * Math.cos(ang), y: 30 + 22 * Math.sin(ang) }; });
      var edges = ps.map(function (p, k) { return [p.id, ps[(k + 1) % N].id]; });
      var allBad = {}, ehl = {}; ps.forEach(function (p, k) { allBad[p.id] = 'bad'; ehl[edges[k][0] + '-' + edges[k][1]] = 'bad'; });
      var vi = 0; ps.forEach(function (p, k) { if (p.cost < ps[vi].cost) vi = k; });
      var v = ps[vi], rest = ps.filter(function (p) { return p !== v; });
      var restNodes = nodes.filter(function (n) { return n.id !== v.id; });
      var tbl = function (hl) { return { type: 'table', label: 'Cost of losing each process', columns: ['Process', 'Cost to abort', 'Waits for'], rows: ps.map(function (p, k) { return [p.id, p.cost, ps[(k + 1) % N].id]; }), hl: hl || {} }; };
      var fr = [];
      fr.push({ narr: 'Detection found a cycle: <span class="c-r">' + ps.map(function (p) { return p.id; }).join(' → ') + ' → ' + ps[0].id + '</span>. We must break it by removing one process (or taking one resource).', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: allBad, ehl: ehl }, tbl()] });
      fr.push({ narr: 'Choose the <b>cheapest victim</b>: lowest cost = <b>' + v.id + '</b> (cost ' + v.cost + '). Cost mixes priority, work done, resources held and times already rolled back.', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: (function () { var h = {}; h[v.id] = 'sel'; return h; })() }, tbl((function () { var h = {}; h[vi] = 'sel'; return h; })())] });
      fr.push({ narr: 'Abort/roll back <b>' + v.id + '</b>: its locks and resources are released.', parts: [{ type: 'graph', directed: true, height: 60, nodes: restNodes, edges: [], hl: {} }, { type: 'text', html: v.id + ' is gone (it will restart later). The resource it held is now free.' }] });
      var prev = ps[(vi + N - 1) % N];
      fr.push({ narr: '<b>' + prev.id + '</b> was waiting for what ' + v.id + ' held, so it can now run. Detection is re-run: the cycle is broken.', parts: [{ type: 'graph', directed: true, height: 60, nodes: restNodes, edges: [], hl: (function () { var h = {}; h[prev.id] = 'ok'; return h; })() }] });
      var ord = []; for (var k = 1; k < N; k++) ord.push(ps[(vi + N - k) % N].id);
      fr.push({ narr: 'The rest unwind one after another: <b>' + ord.join(' → ') + '</b> finish and release their resources. <span class="c-g">Deadlock resolved.</span> Finally ' + v.id + ' restarts. To avoid starving it, add 1 rollback to its cost so it is not picked again next time.', parts: [{ type: 'array', label: 'Completion order', values: ord.concat([v.id + ' (retry)']), hl: (function () { var h = {}; h[ord.length] = 'cur'; return h; })() }, { type: 'vars', vals: { victim: v.id, 'cost after rollback (+50)': v.cost + 50 }, hl: { victim: 'sel' } }] });
      return fr;
    }
  },
  examples: [
    { title: 'Database transaction deadlock', html: `<p>T1 holds row 1 and wants row 2; T2 holds row 2 and wants row 1. The DB detects the cycle, picks the transaction with the smaller undo log (cheaper to roll back), aborts it with an error, and the app retries. Typical retry: 3 attempts with random sleeps.</p>` },
    { title: 'Total vs partial rollback', html: `<p><b>Total</b>: abort the transaction completely - easy. <b>Partial</b>: roll back only until the contested resource is released (to a savepoint). It saves work, but needs savepoints and a record of what was acquired when.</p>` },
    { title: 'Why can recovery be unsafe?', html: `<p>If the victim already wrote to a file, sent a network message or charged a card, killing it half-way leaves the outside world inconsistent. Recovery by rollback is only clean when all effects are inside a transaction you can undo.</p>` }
  ],
  deepDive: `<p>🟣 <b>Cost function engineering.</b> Real systems use a weighted score: InnoDB picks the transaction that changed the fewest rows. The Linux OOM killer computes <code>oom_score</code> (memory used + adjustments from <code>oom_score_adj</code>) and kills the highest score. Hadoop/YARN preempt containers from over-quota queues. In each, the idea is identical: <i>minimise the work lost</i>.</p>
  <p><b>Starvation of the victim.</b> If cost never changes, the same process is the cheapest forever. Standard cures: increment a counter on every rollback and add it to the cost; use timestamps (wait-die / wound-wait) so older work wins; or randomise among near-equal costs.</p>
  <p><b>Preemption problems.</b> Choose the resource and the victim (cost again), <b>rollback</b> the process to a safe state before it held the resource, and watch for a process being preempted repeatedly. Some resources cannot be preempted without damage: a printer mid-page, a half-written file, a hardware device in the middle of a DMA.</p>
  <p><b>Kill vs graceful.</b> In-process recovery (Java <code>ReentrantLock.tryLock(timeout)</code>, DB lock timeouts) lets the program react, releasing locks and retrying. Killing a thread is dangerous (<code>Thread.stop</code> was deprecated for this reason): it may leave shared data half-updated while still holding monitors.</p>
  <p><b>Watchdogs.</b> Embedded systems and kernels use hardware watchdog timers: if software does not "pet" the watchdog regularly (because it is deadlocked), the system resets. A crude but effective recovery for unattended machines. Container platforms do the same with liveness probes: a pod that stops answering gets restarted.</p>
  <p><b>Idempotency.</b> Retrying after rollback only works if operations are idempotent or transactional; design the retry path (unique request IDs, upsert) before relying on it.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> autonomous agent platforms run thousands of long-lived tasks that hold locks, GPU leases and API quotas. When two stall each other, the platform needs the same toolbox: timeouts, lease expiry (preemption), checkpoint-restart (rollback) and victim choice by cost. Training jobs checkpoint every N minutes precisely so a killed job loses at most N minutes.</p>
  <p><b>Use AI as a partner:</b> ask it to design a victim-scoring function from your own incident history, or to write the retry wrapper with jittered exponential backoff. Ask <code>What side effects of this operation cannot be rolled back?</code> as a review step.</p>
  <p><b>Where AI goes wrong:</b> it recommends "just restart the service" without explaining why the cycle will not re-form; retries without backoff (creating livelock or a thundering herd); retries non-idempotent operations (double charge).</p>
  <p><b>What you must still own:</b> choosing which work is cheapest to lose, making recovery safe (idempotent, transactional), and preventing the victim from starving.</p>`,
  problems: []
});

// =====================================================================
// TOPIC 7 - Livelock & starvation
// =====================================================================
topics.push({
  title: 'Livelock and Starvation vs Deadlock',
  analogy: `<p><b>Livelock:</b> two polite people meet in a narrow corridor. Both step to the same side to let the other pass, then both step back, again and again - they are very active, but never get through. <b>Starvation:</b> a street food stall that always serves the VIP queue first; the ordinary customer keeps being told "next!" and never eats. <b>Deadlock:</b> both people stand still, each waiting for the other to move.</p>`,
  explain: `<p>🟢 Three different ways a system makes no progress:</p>
  ${H.table(['', 'Deadlock', 'Livelock', 'Starvation'], [
    ['Are the processes running?', '<span class="c-r">No - blocked/sleeping</span>', '<span class="c-y">Yes - busy, changing state</span>', 'Some run, <b>one or more never get their turn</b>'],
    ['CPU use', 'Near 0% for those threads', 'High (wasted work)', 'Normal'],
    ['Cause', 'Circular wait on resources', 'Everyone keeps reacting to everyone (retry, back off, undo)', 'Unfair policy: priorities, unlucky lock, unbounded bypass'],
    ['Progress for the group?', 'None', 'None', 'Others progress; victim does not'],
    ['Typical fix', 'Order locks, detect + recover', 'Random backoff, one side yields, jitter', 'Aging, fair queues (FIFO), ticket locks']
  ])}
  <p>🔵 <b>Livelock example in code.</b> Two threads use <code>try_lock</code>: lock A, try B; if B fails, release A and retry immediately. Both do it in perfect rhythm, so each time one holds A and the other holds B - both fail, both release, both retry... forever. Fix: <b>random delay</b> (jitter) before retrying, or a single rule like "lower id keeps its lock".</p>
  <p><b>Starvation example.</b> A priority scheduler always picks the highest priority ready job. A steady stream of high priority jobs means a low priority job waits forever. Fix: <b>aging</b> - every tick a job waits, increase its priority a little; eventually it wins. Also: readers-writers with reader preference starves writers; an unfair spin lock lets one core win again and again.</p>
  <p>Try the visualizer: <code>polite</code> shows the corridor livelock; a number (like <code>3</code>) is a random seed where each person picks a side randomly - they escape quickly.</p>
  <p><b>Memory trick:</b> Deadlock = <i>frozen</i>. Livelock = <i>dancing in place</i>. Starvation = <i>forgotten in the queue</i>.</p>`,
  clues: ['"Threads are running at 100% CPU but nothing completes" → livelock (not deadlock)', '"Both release the lock and retry immediately" → livelock; add randomised backoff', '"Low-priority process never runs" → starvation; add aging', '"Writers wait forever while readers keep arriving" → starvation (reader preference)', '"Two nodes keep electing a leader and giving up" → livelock; use randomised election timeouts (Raft)', '"No cycle, but a thread waits forever" → starvation, not deadlock'],
  code: [`// LIVELOCK: both threads keep releasing and retrying in lock-step (compiles; don't run for long)
#include <mutex>
#include <thread>
std::mutex A, B;

void t1() {
    for (;;) {
        A.lock();
        if (B.try_lock()) { /* critical section */ B.unlock(); A.unlock(); return; }
        A.unlock();                       // polite: give A back and try again at once ...
    }
}
void t2() {
    for (;;) {
        B.lock();
        if (A.try_lock()) { /* critical section */ A.unlock(); B.unlock(); return; }
        B.unlock();                       // ... the mirror image, same rhythm -> neither ever wins
    }
}`,
    `// FIX: randomised backoff, or simply std::scoped_lock (it handles the retry safely)
#include <mutex>
#include <thread>
#include <chrono>
#include <random>

void polite(std::mutex& first, std::mutex& second) {
    thread_local std::mt19937 rng{std::random_device{}()};
    std::uniform_int_distribution<int> jitter(1, 500);          // microseconds
    for (;;) {
        std::unique_lock<std::mutex> l1(first);
        if (second.try_lock()) {
            std::lock_guard<std::mutex> l2(second, std::adopt_lock);   // adopt the already-held lock
            /* critical section */
            return;
        }
        l1.unlock();                                                    // give way ...
        std::this_thread::sleep_for(std::chrono::microseconds(jitter(rng)));   // ... for a RANDOM time
    }
}
void simplest(std::mutex& a, std::mutex& b) {
    std::scoped_lock lk(a, b);   // library handles it
    /* critical section */
}`,
    { lang: 'python', run: true, title: 'Livelock vs random backoff (simulation, runnable)', code: `import random

def corridor(mode, seed=1, max_ticks=12):
    """Alice and Bob face each other. Each tick both step to a side (W or E).
    Same side = they still block each other. Different sides = they pass."""
    rnd = random.Random(seed)
    for t in range(1, max_ticks + 1):
        if mode == "polite":
            a = b = "W" if t % 2 else "E"       # both step to the same side every time
        else:
            a, b = rnd.choice("WE"), rnd.choice("WE")   # independent random choice
        passed = a != b
        print(f"tick {t:2d}: Alice->{a} Bob->{b}  {'PASS' if passed else 'blocked again'}")
        if passed:
            return t
    print("gave up: livelock (busy but no progress)")
    return None

print("Polite (deterministic, symmetric):")
corridor("polite")
print()
print("Random side each tick (seed 3):")
corridor("random", seed=3)

# --- Starvation + aging: a low-priority job competes with a stream of priority-5 jobs ---
def schedule(aging, ticks=8):
    low = 1
    for t in range(1, ticks + 1):
        high = 5
        if low >= high:
            return f"low-priority job finally ran at tick {t} (aging={aging})"
        low += aging                      # every tick it waits, its priority grows
    return f"low-priority job STARVED for {ticks} ticks (aging={aging})"

print()
print(schedule(0))
print(schedule(1))` }],
  codeTitle: ['Livelock with try_lock in lock-step (C++)', 'Fixes: random backoff or scoped_lock (C++)', 'Livelock and starvation simulation (Python, runnable)'],
  viz: [{
    title: 'The polite corridor: livelock vs random backoff',
    input: 'polite',
    inputLabel: '"polite" (livelock) or a whole-number random seed such as 3',
    gen: function (input) {
      var s = String(input).trim().toLowerCase(), polite = s === 'polite', seed = parseInt(s, 10);
      if (!polite && isNaN(seed)) throw new Error('Type "polite" or a whole number seed like 3');
      seed = Math.abs(seed) % 2147483647 || 1;
      function rnd() { seed = (seed * 48271) % 2147483647; return seed % 2 === 0 ? 'W' : 'E'; }
      var rows = [], fr = [];
      var cols = ['Tick', 'Alice steps to', 'Bob steps to', 'Result'];
      fr.push({ narr: 'Alice and Bob meet in a narrow corridor. Each tick, both step to a side (West or East). If they pick the <b>same</b> side they still block each other. Different sides → they pass.', parts: [{ type: 'table', label: 'Corridor log', columns: cols, rows: [['-', '-', '-', 'start']] }] });
      var passedAt = -1;
      for (var t = 1; t <= 8 && passedAt < 0; t++) {
        var a, b;
        if (polite) { a = b = (t % 2 ? 'W' : 'E'); } else { a = rnd(); b = rnd(); }
        var ok = a !== b;
        rows.push([t, a, b, ok ? 'PASS' : 'blocked again']);
        var hl = {}; hl[rows.length - 1] = ok ? 'ok' : 'bad';
        fr.push({ narr: polite ? 'Tick ' + t + ': both are "polite" and do the <b>same thing</b> → both go ' + a + ' → still face to face. <span class="c-y">Busy, but no progress.</span>' : 'Tick ' + t + ': Alice → ' + a + ', Bob → ' + b + '. ' + (ok ? '<span class="c-g">Different sides, they pass!</span>' : 'Same side → blocked, try again.'), parts: [{ type: 'table', label: 'Corridor log', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
        if (ok) passedAt = t;
      }
      if (passedAt < 0) fr.push({ narr: '<span class="c-r">LIVELOCK</span>: 8 ticks, 100% activity, 0% progress. Symmetric, deterministic reactions never break the tie. Fix: <b>randomness</b> or <b>asymmetry</b> (one person always waits, or lower id goes first).', parts: [{ type: 'table', label: 'Corridor log', columns: cols, rows: rows, hl: { 7: 'bad' } }, { type: 'text', html: 'Try the input <code>3</code> (random seed) to see them escape.' }] });
      else fr.push({ narr: '<span class="c-g">Random choices break the symmetry</span> - progress after ' + passedAt + ' tick(s). Same idea as Ethernet exponential backoff, Raft election timeouts and jittered retries.', parts: [{ type: 'table', label: 'Corridor log', columns: cols, rows: rows, hl: (function () { var h = {}; h[rows.length - 1] = 'ok'; return h; })() }] });
      return fr;
    }
  }, {
    title: 'Starvation and aging in a priority scheduler',
    input: '1',
    inputLabel: 'Aging step added to the waiting job every tick (0 = no aging, 1, 2 ...)',
    gen: function (input) {
      var ag = parseInt(String(input).trim(), 10);
      if (isNaN(ag) || ag < 0 || ag > 5) throw new Error('Enter a whole number 0-5');
      var fr = [], low = 1, rows = [], vals = [], ran = -1;
      fr.push({ narr: 'A low-priority job L (priority 1) waits. At every tick a new <b>high-priority job (5)</b> arrives and the scheduler always picks the highest priority. Aging step = <b>' + ag + '</b>.', parts: [{ type: 'bars', label: 'Priority of L over time', values: [1], texts: ['1'] }, { type: 'table', label: 'Schedule', columns: ['Tick', 'L priority', 'New job', 'Runs'], rows: [['0', 1, 5, '-']] }] });
      for (var t = 1; t <= 9 && ran < 0; t++) {
        vals.push(low);
        var runsL = low >= 5;
        rows.push([t, low, 5, runsL ? 'L (finally!)' : 'new job']);
        var hl = {}; hl[rows.length - 1] = runsL ? 'ok' : 'bad';
        var bh = {}; bh[vals.length - 1] = runsL ? 'ok' : 'cur';
        fr.push({ narr: 'Tick ' + t + ': L has priority <b>' + low + '</b> vs the new job\'s 5. ' + (runsL ? '<span class="c-g">L has aged enough and now runs.</span>' : 'The new job runs; L waits again.') + (!runsL && ag ? ' Aging adds ' + ag + ' to L.' : ''), parts: [{ type: 'bars', label: 'Priority of L over time', values: vals.slice(), hl: bh, texts: vals.map(String) }, { type: 'table', label: 'Schedule', columns: ['Tick', 'L priority', 'New job', 'Runs'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
        if (runsL) ran = t; else low += ag;
      }
      if (ran < 0) fr.push({ narr: '<span class="c-r">STARVATION</span>: after 9 ticks L has still not run. Add aging (type 1) so waiting time raises priority.', parts: [{ type: 'bars', label: 'Priority of L over time', values: vals, texts: vals.map(String) }] });
      else fr.push({ narr: 'Aging guarantees that every job eventually becomes the highest priority - <b>bounded waiting</b>.', parts: [{ type: 'bars', label: 'Priority of L over time', values: vals, texts: vals.map(String), hl: (function () { var h = {}; h[vals.length - 1] = 'ok'; return h; })() }] });
      return fr;
    }
  }],
  examples: [
    { title: 'Spot it: which one is it?', html: `<p>(a) Threads blocked in <code>pthread_mutex_lock</code>, 0% CPU → <b>deadlock</b>. (b) Two threads in a <code>try_lock</code>/<code>unlock</code> loop, 200% CPU, no output → <b>livelock</b>. (c) A writer waits forever while readers keep arriving, but readers get plenty done → <b>starvation</b>.</p>` },
    { title: 'Network: Ethernet and Wi-Fi', html: `<p>Two stations send at once and collide. If both retried immediately they would collide forever (livelock). Ethernet uses <b>binary exponential backoff</b>: wait a random number of slots from 0..2<sup>k</sup>−1, doubling k after each collision.</p>` },
    { title: 'Raft elections', html: `<p>If every follower timed out at the same instant, all would vote for themselves and the vote would split forever. Raft uses <b>randomised election timeouts</b> (e.g. 150-300 ms) so one node usually wins.</p>` }
  ],
  deepDive: `<p>🟣 <b>Formal contrast.</b> Safety vs liveness: deadlock-freedom, livelock-freedom and starvation-freedom are <i>liveness</i> properties ("something good eventually happens"). <b>Deadlock-free</b> ⇒ some process always makes progress, but it does not imply <b>starvation-free</b>. Hierarchy: starvation-free ⇒ deadlock-free (stronger), and "bounded waiting" is the textbook condition in critical-section solutions (a process waits at most N−1 turns).</p>
  <p><b>Fairness types.</b> Weak fairness: if a process is continuously enabled, it eventually runs. Strong fairness: if it is enabled infinitely often, it eventually runs. FIFO ticket locks and queue-based locks (MCS, CLH) give strict fairness; test-and-set spin locks can starve a core on NUMA machines.</p>
  <p><b>Priority inversion</b> (related): a low-priority task holds a lock needed by a high-priority task, while a medium-priority task keeps the CPU. Mars Pathfinder 1997 reset repeatedly because of it. Cure: <b>priority inheritance</b> (<code>PTHREAD_PRIO_INHERIT</code>) - the low task temporarily runs at the high task's priority.</p>
  <p><b>Convoy and thundering herd.</b> When a popular lock is released and all waiters wake simultaneously, most fail and re-sleep: wasteful but eventually progresses. Use queued locks or wake one waiter.</p>
  <p><b>Retry storms in distributed systems.</b> Clients that retry failed calls immediately overload a recovering service: a system-level livelock. Use exponential backoff <i>with jitter</i>, retry budgets and circuit breakers.</p>
  <p><b>Detecting them.</b> Deadlock: threads in blocked state with a cycle. Livelock: high CPU, threads RUNNABLE, stacks moving between the same few frames; sample twice with a profiler and see no progress counter change. Starvation: per-thread wait-time histograms and "max wait" metrics.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> multi-agent systems livelock easily: two agents keep "correcting" each other's output, or keep re-planning because of each other's changes. Token cost climbs while no task completes - a livelock you pay for. Rate-limited APIs create starvation: a long batch job consumes the whole quota and interactive requests starve; fair queuing and priority with aging are now part of LLM gateway design.</p>
  <p><b>Use AI as a partner:</b> ask it to spot retry loops without jitter, to list every unbounded retry in a service, or to simulate a scheduler with and without aging and plot waiting times.</p>
  <p><b>Where AI goes wrong:</b> it adds a fixed <code>sleep(100ms)</code> backoff (still symmetric, still livelocks); it calls any hang a "deadlock"; it forgets that lock-free code can livelock.</p>
  <p><b>What you must still own:</b> telling the three apart from symptoms (CPU, thread states, who progresses), choosing randomness or asymmetry to break symmetry, and adding bounded waiting guarantees (aging, FIFO).</p>`,
  problems: [{
    title: 'Spot the Livelock',
    level: 'Medium', tags: ['livelock', 'try_lock', 'backoff'], companies: ['Google', 'Meta'],
    statement: `<p>Two worker threads each need locks X and Y. T1 does <code>lock(X); if (!try_lock(Y)) { unlock(X); continue; }</code>. T2 does <code>lock(Y); if (!try_lock(X)) { unlock(Y); continue; }</code>. In production both threads show 100% CPU, the logs show endless "retrying", and no work completes. (a) Is this a deadlock? (b) Why do they never succeed? (c) Give two fixes.</p>`,
    constraints: `Explain in terms of Coffman conditions and the symmetry of the retry rhythm.`,
    example: `<p>T1 holds X, T2 holds Y; each try_lock fails; both unlock; both retry at the same instant → same situation. ${H.c('r', 'Active but no progress = livelock')}.</p>`,
    brute: { why: `<p>"Just add <code>sleep(10ms)</code> in both loops." A fixed identical sleep keeps the symmetry, so the two threads can still stay in lock-step, and it wastes 10 ms every time.</p>`, code: { lang: 'cpp', code: `#include <mutex>\n#include <thread>\n#include <chrono>\nstd::mutex X, Y;\nvoid t1() {\n    for (;;) {\n        X.lock();\n        if (Y.try_lock()) { Y.unlock(); X.unlock(); return; }\n        X.unlock();\n        std::this_thread::sleep_for(std::chrono::milliseconds(10));   // same delay in both threads: still symmetric\n    }\n}` } },
    mcq: { q: 'Which fix reliably breaks a try_lock livelock?', options: ['Randomised backoff or a fixed lock order', 'Adding more CPU cores', 'Using the same sleep time in both threads', 'Increasing thread priority'], answer: 0, explain: 'Randomness breaks symmetry; a fixed lock order (or scoped_lock) removes the need to retry at all.' },
    hints: [`<p>Hint 1: Is any thread blocked? No - both are running. Deadlock needs blocked threads.</p>`, `<p>Hint 2: They repeat the same steps in the same rhythm, each making the other fail. The problem is symmetric reaction.</p>`, `<p>Hint 3: Break the symmetry (random delay, or one thread always yields) or avoid retrying: lock X before Y in both, or use <code>std::scoped_lock</code>.</p>`],
    solution: {
      approach: `<p>(a) Not a deadlock: nobody is blocked; the threads keep running (100% CPU) and keep changing state. It is a <b>livelock</b>. (b) Each thread grabs its first lock, fails to get the second (the other thread holds it), releases the first, and retries immediately. Because both follow the same rhythm they keep recreating the same collision; they "release" in order to be polite, but the politeness is symmetric. (c) Fix 1: add a <b>random</b> sleep (jitter, ideally growing exponentially) after a failed attempt so the timing differs and one thread gets both locks. Fix 2: remove the need to retry: use a global lock order (always X then Y) or <code>std::scoped_lock lk(X, Y)</code>. Fix 3 (asymmetry): the thread with the lower id keeps its lock and the other backs off.</p>`,
      code: { lang: 'cpp', code: `#include <mutex>\n#include <thread>\n#include <chrono>\n#include <random>\nstd::mutex X, Y;\n\n// Fix 1: random backoff\nvoid worker(std::mutex& first, std::mutex& second) {\n    thread_local std::mt19937 rng{std::random_device{}()};\n    std::uniform_int_distribution<int> jitter(1, 1000);\n    for (;;) {\n        first.lock();\n        if (second.try_lock()) { /* work */ second.unlock(); first.unlock(); return; }\n        first.unlock();\n        std::this_thread::sleep_for(std::chrono::microseconds(jitter(rng)));   // random: breaks symmetry\n    }\n}\n// Fix 2: no retry at all\nvoid worker2() {\n    std::scoped_lock lk(X, Y);   // library acquires both safely\n    /* work */\n}` },
      dry: { head: ['Tick', 'T1', 'T2', 'Outcome'], rows: [['1', 'lock X', 'lock Y', 'each holds one'], ['2', 'try_lock Y fails → unlock X', 'try_lock X fails → unlock Y', 'both back to start'], ['3', 'lock X', 'lock Y', '<span class="c-r">same as tick 1: livelock</span>'], ['with jitter', 'lock X, Y free → gets both', 'sleeping 300 µs', '<span class="c-g">T1 finishes, then T2</span>']] },
      complexity: `<p>Expected O(1) retries with random backoff; exponential backoff scales to many contenders.</p>`,
      followUps: ['Why does exponential backoff help under heavy contention?', 'Can lock-free algorithms livelock?']
    }
  }]
});

// =====================================================================
// PRACTICE (Easy -> Medium -> Hard)
// =====================================================================
practice.push({
  title: 'Name the Coffman Conditions', level: 'Easy', tags: ['coffman', 'basics'], companies: ['TCS', 'Infosys'],
  statement: `<p>Two print jobs each need the <b>scanner</b> and the <b>printer</b>. Job A has the scanner and asks for the printer. Job B has the printer and asks for the scanner. Neither can be interrupted. For each of the four Coffman conditions say whether it holds here and point at the evidence.</p>`,
  constraints: `One scanner, one printer, two jobs.`,
  example: `<p>Mutual exclusion ${H.c('g', 'yes')}, hold and wait ${H.c('g', 'yes')}, no preemption ${H.c('g', 'yes')}, circular wait ${H.c('g', 'yes')} → ${H.c('r', 'deadlock')}.</p>`,
  brute: { why: `<p>Answering "it is a deadlock because both wait" skips the reasoning. Interviewers want each condition tied to a fact in the story.</p>` },
  mcq: { q: 'If the printer could be taken away from Job B at any time, which condition is broken?', options: ['No preemption', 'Mutual exclusion', 'Circular wait', 'Hold and wait'], answer: 0, explain: 'Taking a resource away by force is preemption; the "no preemption" condition no longer holds.' },
  hints: [`<p>Hint 1: Go through the list one by one: M, H, N, C.</p>`, `<p>Hint 2: Mutual exclusion: can two jobs use the scanner at once? Hold and wait: does A keep the scanner while asking for the printer?</p>`, `<p>Hint 3: Circular wait: draw A → B (A waits for the printer B holds) and B → A.</p>`],
  solution: {
    approach: `<p><b>Mutual exclusion:</b> holds - a scanner or printer serves one job at a time. <b>Hold and wait:</b> holds - Job A keeps the scanner while asking for the printer; Job B keeps the printer while asking for the scanner. <b>No preemption:</b> holds - the statement says neither can be interrupted, so a resource is released only voluntarily. <b>Circular wait:</b> holds - A waits for B (who holds the printer) and B waits for A (who holds the scanner), a cycle of length 2. All four hold at once, so the system is deadlocked. Breaking any single one fixes it: e.g. require both devices to be requested together (hold and wait), or number the devices and always ask for the scanner first (circular wait).</p>`,
    dry: { head: ['Condition', 'Evidence in story', 'Holds?'], rows: [['Mutual exclusion', 'one job per device', '<span class="c-g">yes</span>'], ['Hold and wait', 'A keeps scanner, asks printer', '<span class="c-g">yes</span>'], ['No preemption', 'cannot be interrupted', '<span class="c-g">yes</span>'], ['Circular wait', 'A → B → A', '<span class="c-g">yes</span>']] },
    complexity: `<p>Conceptual - no complexity.</p>`, followUps: ['Which condition is cheapest to break here?']
  }
});
practice.push({
  title: 'Cycle in a Single-Instance RAG', level: 'Easy', tags: ['rag', 'cycle'], companies: ['Wipro', 'Cognizant'],
  statement: `<p>Edges of a resource allocation graph (each resource has one instance): R1→P1, P1→R2, R2→P2, P2→R1, P3→R1. Is there a deadlock? Which processes are in it?</p>`,
  constraints: `Edge R→P means assigned; P→R means requested.`,
  example: `<p>Cycle ${H.c('r', 'P1 → R2 → P2 → R1 → P1')}. P3 only waits for R1.</p>`,
  brute: { why: `<p>Saying "no deadlock because only 2 of the 3 processes are in the loop". The cycle is real; P3 is simply stuck behind it.</p>` },
  mcq: { q: 'In a single-instance RAG, a cycle means…', options: ['Deadlock for sure', 'Maybe deadlock', 'Safe state', 'Starvation'], answer: 0, explain: 'With one instance per resource, every cycle is a deadlock.' },
  hints: [`<p>Hint 1: Start at P1 and follow the arrows one by one.</p>`, `<p>Hint 2: P1 → R2 → P2 → R1 → P1 comes back to the start.</p>`, `<p>Hint 3: P3 requests R1 held by P1: P3 is blocked, not in the cycle.</p>`],
  solution: {
    approach: `<p>Follow the arrows from P1: P1 requests R2, R2 is assigned to P2, P2 requests R1, R1 is assigned to P1 - back to P1. That is a cycle P1 → R2 → P2 → R1 → P1. Since every resource has exactly one instance, a cycle is both necessary and sufficient for deadlock, so P1 and P2 are deadlocked. P3 waits for R1 (held by P1) but nobody waits for anything P3 holds; it is not part of the cycle, just blocked until the deadlock is resolved. Killing P3 would not help; killing P1 or P2 would.</p>`,
    dry: { head: ['Hop', 'From', 'To', 'Meaning'], rows: [['1', 'P1', 'R2', 'P1 requests R2'], ['2', 'R2', 'P2', 'R2 assigned to P2'], ['3', 'P2', 'R1', 'P2 requests R1'], ['4', 'R1', 'P1', 'R1 assigned to P1 → <span class="c-r">back to start</span>']] },
    complexity: `<p>Time O(V + E) for the DFS; space O(V) for colours and the stack.</p>`, followUps: ['Convert this RAG to a wait-for graph.']
  }
});
practice.push({
  title: 'Compute the Need Matrix', level: 'Easy', tags: ['banker', 'need'], companies: ['TCS', 'Capgemini'],
  statement: `<p>Three processes, two resource types. Max: P0 (5,3), P1 (3,2), P2 (7,2). Allocation: P0 (1,1), P1 (2,0), P2 (3,1). Available (3,2). Compute Need for each process and say which processes could be started right now (Need ≤ Available).</p>`,
  constraints: `Need = Max − Allocation.`,
  example: `<p>Need P0 = (5−1, 3−1) = (4,2).</p>`,
  brute: { why: `<p>Computing Allocation − Max gives negative numbers: a sign that the formula is reversed.</p>` },
  mcq: { q: 'Need[P1] is…', options: ['(1,2)', '(5,2)', '(−1,−2)', '(2,0)'], answer: 0, explain: '(3,2) − (2,0) = (1,2).' },
  hints: [`<p>Hint 1: Subtract Allocation from Max, component by component.</p>`, `<p>Hint 2: Do it for P1 first: (3−2, 2−0), then P0 and P2.</p>`, `<p>Hint 3: Then compare each Need with Available (3,2): both components must be ≤.</p>`],
  solution: {
    approach: `<p>Need P0 = (5,3) − (1,1) = (4,2). Need P1 = (3,2) − (2,0) = (1,2). Need P2 = (7,2) − (3,1) = (4,1). Compare with Available (3,2): P0 (4,2): 4 &gt; 3, no. P1 (1,2): 1 ≤ 3 and 2 ≤ 2, yes - P1 can run to completion first. P2 (4,1): 4 &gt; 3, no. So only P1 can start now; after it finishes, Work = (3,2) + (2,0) = (5,2), and then P0 (4,2) and P2 (4,1) both fit.</p>`,
    dry: { head: ['Process', 'Max', 'Alloc', 'Need', 'Need ≤ (3,2)?'], rows: [['P0', '(5,3)', '(1,1)', '(4,2)', 'no'], ['P1', '(3,2)', '(2,0)', '(1,2)', '<span class="c-g">yes</span>'], ['P2', '(7,2)', '(3,1)', '(4,1)', 'no']] },
    complexity: `<p>Time O(n × m) to build the table; space O(n × m) for Need.</p>`, followUps: ['Finish the safety algorithm and give a safe sequence (P1, P0, P2).']
  }
});
practice.push({
  title: 'Deadlock, Livelock or Starvation?', level: 'Easy', tags: ['livelock', 'starvation', 'classification'], companies: ['Amazon', 'Adobe'],
  statement: `<p>Classify each: (1) Four threads in <code>BLOCKED</code> state, 0% CPU, each waits for a lock another holds. (2) Two threads loop on <code>try_lock</code>/<code>unlock</code>, 200% CPU, no progress. (3) A low-priority job has not run for 3 days while high-priority jobs keep arriving. (4) A web request waits for a slow database; it finishes after 20 s.</p>`,
  constraints: `Pick one of: deadlock, livelock, starvation, none.`,
  example: `<p>(1) ${H.c('r', 'deadlock')}, (2) ${H.c('y', 'livelock')}, (3) ${H.c('b', 'starvation')}, (4) none (just slow).</p>`,
  brute: { why: `<p>Calling all four "deadlock". Only (1) has a blocked cycle.</p>` },
  mcq: { q: 'Which symptom points to a livelock?', options: ['High CPU, no progress', '0% CPU, threads blocked', 'One job never scheduled', 'Memory leak'], answer: 0, explain: 'Livelocked threads are running (busy), not blocked, but get nowhere.' },
  hints: [`<p>Hint 1: Ask: are they blocked or running?</p>`, `<p>Hint 2: Is there a cycle of waiting (deadlock) or just an unfair policy (starvation)?</p>`, `<p>Hint 3: Case 4 eventually finishes - nothing is permanently stuck.</p>`],
  solution: {
    approach: `<p>(1) Deadlock: all threads blocked, waiting on locks held by each other - a circular wait with no CPU use. (2) Livelock: the threads are running and changing state (acquire, fail, release) but never make progress; fix with randomised backoff or lock ordering. (3) Starvation: the system as a whole progresses, but one job is permanently bypassed because of an unfair priority policy; fix with aging. (4) None: a slow dependency is not a deadlock - the wait has a bounded end and no cycle. The key discriminators are blocked-vs-running, whether everyone is stuck or only some, and whether a cycle exists.</p>`,
    dry: { head: ['Case', 'Blocked?', 'CPU', 'Who progresses?', 'Answer'], rows: [['1', 'yes', '~0%', 'nobody in the group', '<span class="c-r">deadlock</span>'], ['2', 'no', 'high', 'nobody in the group', '<span class="c-y">livelock</span>'], ['3', 'waiting', 'normal', 'everyone except one', '<span class="c-b">starvation</span>'], ['4', 'waiting', 'normal', 'will finish', 'none']] },
    complexity: `<p>Conceptual question: no algorithmic cost, only reasoning steps.</p>`, followUps: ['How would you tell (1) from (4) using a thread dump?']
  }
});
practice.push({
  title: 'Which Condition Does Each Technique Break?', level: 'Medium', tags: ['prevention', 'coffman'], companies: ['Oracle', 'Cisco'],
  statement: `<p>Match each technique to the Coffman condition it eliminates: (a) numbering locks and always taking them in ascending order; (b) a print spooler so jobs never touch the printer directly; (c) <code>std::scoped_lock(a, b)</code> / try_lock then release on failure; (d) a job must request every resource it will ever need before it starts; (e) the OS reclaiming memory pages from a process; (f) wait-die timestamps in a database.</p>`,
  constraints: `Answer with one condition each (for (f) and (c) justify).`,
  example: `<p>(a) → circular wait.</p>`,
  brute: { why: `<p>Memorising a table without reasons fails when the question is phrased differently. Ask: "which of M-H-N-C could now never be true?"</p>` },
  mcq: { q: 'A spooler (jobs write to a queue, one daemon prints) mainly attacks…', options: ['Mutual exclusion', 'Circular wait', 'No preemption', 'Hold and wait'], answer: 0, explain: 'The printer is used only by the spooler daemon, and job files are shareable; processes never hold-and-wait for the device.' },
  hints: [`<p>Hint 1: For each, picture what it makes impossible: sharing, holding while waiting, forcing release, or a ring.</p>`, `<p>Hint 2: (c) lets a thread give back what it holds when it cannot get the rest.</p>`, `<p>Hint 3: (f) wait-die: a younger transaction that would wait for an older one is aborted - age gives a total order.</p>`],
  solution: {
    approach: `<p>(a) Circular wait - a total order means a ring would need strictly increasing ranks. (b) Mutual exclusion - spooling turns a non-shareable device into something processes do not hold directly. (c) No preemption (self-release) - on failure the thread gives back what it holds, so nobody waits while keeping a resource; it also removes hold-and-wait in effect. (d) Hold and wait - nothing is held while waiting because everything is requested at once; costs low utilisation and starvation. (e) No preemption - the OS can forcibly take pages (saving them to disk). (f) Circular wait / no preemption - timestamps give a global order and abort younger transactions rather than letting a cycle form.</p>`,
    dry: { head: ['Technique', 'Condition broken'], rows: [['(a) ascending lock order', 'Circular wait'], ['(b) spooling', 'Mutual exclusion'], ['(c) try_lock + release', 'No preemption'], ['(d) request all at once', 'Hold and wait'], ['(e) reclaim pages', 'No preemption'], ['(f) wait-die', 'Circular wait (age order)']] },
    complexity: `<p>Conceptual question: no algorithmic cost, only reasoning steps.</p>`, followUps: ['Which one would you pick for a mutex-heavy server and why?']
  }
});
practice.push({
  title: 'RAG to Wait-For Graph and Cycle', level: 'Medium', tags: ['rag', 'wait-for graph'], companies: ['Microsoft', 'Oracle'],
  statement: `<p>Single-instance RAG: R1→P1, R2→P2, R3→P3, P1→R2, P2→R3, P3→R1, P4→R1. (a) Build the wait-for graph. (b) Find the deadlocked processes. (c) Is P4 deadlocked? Which single process would you abort?</p>`,
  constraints: `Wait-for edge P→Q if P requests a resource that Q holds.`,
  example: `<p>P1 wants R2 held by P2 → edge P1 → P2.</p>`,
  brute: { why: `<p>Checking every resource pair by eye. Collapse the graph first, then DFS.</p>` },
  mcq: { q: 'P4 requests R1, held by P1. P4 is…', options: ['Blocked but not in the cycle', 'In the cycle', 'Running', 'Finished'], answer: 0, explain: 'P4 waits for the cycle but nothing in the cycle waits for P4.' },
  hints: [`<p>Hint 1: For every P→R edge, replace R by its holder (follow R→Q).</p>`, `<p>Hint 2: P1→R2 and R2→P2 gives P1→P2; similarly P2→P3, P3→P1, P4→P1.</p>`, `<p>Hint 3: DFS: P1, P2, P3, back to P1 = cycle.</p>`],
  solution: {
    approach: `<p>(a) Collapse: P1→R2→P2 gives P1→P2; P2→R3→P3 gives P2→P3; P3→R1→P1 gives P3→P1; P4→R1→P1 gives P4→P1. (b) DFS from P1: P1, P2, P3, then P3→P1 where P1 is on the stack: cycle {P1, P2, P3} - deadlocked. (c) P4 is blocked behind the cycle (it waits for P1) but is not part of it; aborting P4 changes nothing. Abort one of P1, P2, P3 (choose the cheapest); say P2: R2 is released, P1 runs, finishes, releases R1, then P3 and P4 get their turn.</p>`,
    dry: { head: ['RAG path', 'Wait-for edge'], rows: [['P1 → R2 → P2', 'P1 → P2'], ['P2 → R3 → P3', 'P2 → P3'], ['P3 → R1 → P1', 'P3 → P1'], ['P4 → R1 → P1', 'P4 → P1']] },
    complexity: `<p>Time O(V + E) for the DFS; space O(V) for colours and the stack.</p>`, followUps: ['If R1 had 2 instances (second free), would there still be a deadlock?']
  }
});
practice.push({
  title: 'Is This 4 × 2 State Safe?', level: 'Medium', tags: ['banker', 'safe state'], companies: ['TCS', 'HCL'],
  statement: `<p>Resources A, B. Available (2,1). Allocation: P0 (1,0), P1 (0,1), P2 (1,1), P3 (1,0). Max: P0 (3,2), P1 (1,2), P2 (2,2), P3 (3,1). Decide whether the state is safe; give a safe sequence.</p>`,
  constraints: `Scan in index order, first fit.`,
  example: `<p>Need = P0 (2,2), P1 (1,1), P2 (1,1), P3 (2,1).</p>`,
  brute: { why: `<p>Trying all 4! = 24 orders. The greedy scan finds one in a few steps.</p>` },
  mcq: { q: 'Which process runs first with Work = (2,1)?', options: ['P1 (Need (1,1))', 'P0 (Need (2,2))', 'P3 (Need (2,1)) before P1 in scan order', 'None'], answer: 0, explain: 'P0 needs 2 of B but Work has 1; P1 needs (1,1) ≤ (2,1).' },
  hints: [`<p>Hint 1: Compute Need = Max − Alloc for all four processes.</p>`, `<p>Hint 2: Work = (2,1). P0's Need (2,2) does not fit (B).</p>`, `<p>Hint 3: After P1 returns (0,1), Work = (2,2) - now P0 fits.</p>`],
  solution: {
    approach: `<p>Need: P0 (2,2), P1 (1,1), P2 (1,1), P3 (2,1). Work = (2,1). P0: (2,2) ≤ (2,1)? B 2 &gt; 1, no. P1: (1,1) ≤ (2,1) yes → Work = (2,1)+(0,1) = (2,2). Rescan: P0 (2,2) ≤ (2,2) yes → Work = (3,2). P2 (1,1) yes → (4,3). P3 (2,1) yes → (5,3). All finished: the state is <b>safe</b> with sequence ⟨P1, P0, P2, P3⟩. The final Work (5,3) equals the totals: A = 2+1+0+1+1 = 5 (available + allocated), B = 1+0+1+1+0 = 3.</p>`,
    code: { lang: 'python', run: true, code: `av = [2, 1]\nal = [[1,0],[0,1],[1,1],[1,0]]\nmx = [[3,2],[1,2],[2,2],[3,1]]\nneed = [[mx[i][j]-al[i][j] for j in range(2)] for i in range(4)]\nwork, done, seq = av[:], [False]*4, []\nwhile len(seq) < 4:\n    for i in range(4):\n        if not done[i] and all(need[i][j] <= work[j] for j in range(2)):\n            work = [work[j]+al[i][j] for j in range(2)]; done[i] = True; seq.append(i)\n            print(f"P{i} -> work {work}")\n            break\n    else:\n        print("unsafe"); break\nprint("sequence", seq)` },
    dry: { head: ['Step', 'Work', 'Pick', 'Reason', 'New Work'], rows: [['1', '(2,1)', 'P1', 'Need (1,1) fits; P0 does not', '(2,2)'], ['2', '(2,2)', 'P0', 'Need (2,2) fits', '(3,2)'], ['3', '(3,2)', 'P2', 'Need (1,1)', '(4,3)'], ['4', '(4,3)', 'P3', 'Need (2,1)', '(5,3)']] },
    complexity: `<p>Time O(m × n²) for m resource types and n processes; space O(n × m).</p>`, followUps: ['Change Available to (1,1): is it still safe?']
  }
});
practice.push({
  title: 'Dining Philosophers Without Deadlock', level: 'Medium', tags: ['dining philosophers', 'lock ordering', 'c++'], companies: ['Google', 'Nvidia'],
  statement: `<p>Five philosophers sit around a table with five forks (mutexes). Each picks the left fork, then the right fork, eats, puts both down. With the naive code, the system can deadlock. Write the fix for <code>philosopher(i)</code> in C++ and explain which Coffman condition you break.</p>`,
  constraints: `5 forks numbered 0..4; philosopher i uses fork i (left) and fork (i+1)%5 (right).`,
  example: `<p>All five take the left fork at once → each waits for the right fork held by the next → ${H.c('r', 'circular wait')}.</p>`,
  brute: { why: `<p>Use one global mutex for the whole table: only one philosopher eats at a time. No deadlock, but zero concurrency (2 could eat together).</p>`, code: { lang: 'cpp', code: `#include <mutex>\nstd::mutex table;\nvoid eatCoarse(int i) {\n    std::lock_guard<std::mutex> g(table);   // only one eater at a time\n    /* eat */\n}` } },
  mcq: { q: 'Picking the lower-numbered fork first breaks…', options: ['Circular wait', 'Mutual exclusion', 'No preemption', 'Hold and wait'], answer: 0, explain: 'The last philosopher (4) takes fork 0 first, so the ring of "left first" requests is broken by a total order.' },
  hints: [`<p>Hint 1: Where is the cycle? Philosopher i holds fork i, wants fork i+1; philosopher 4 wants fork 0.</p>`, `<p>Hint 2: Give forks ranks 0..4 and always take the lower rank first.</p>`, `<p>Hint 3: Equivalent: <code>std::scoped_lock(fork[i], fork[(i+1)%5])</code>.</p>`],
  solution: {
    approach: `<p>The deadlock arises because every philosopher requests (left, right) and the requests form a ring 0→1→2→3→4→0. Break <b>circular wait</b> with a total order on forks: each philosopher locks the fork with the smaller index first. Philosophers 0-3 behave as before (left index is smaller), but philosopher 4 uses fork 4 (left) and fork 0 (right), so it now locks fork 0 first, then fork 4. A ring would need strictly increasing indices all the way round, which is impossible. Alternatives: <code>std::scoped_lock</code> with both forks, or allow at most four philosophers to sit down (a counting semaphore).</p>`,
    code: { lang: 'cpp', code: `#include <mutex>\n#include <algorithm>\nstd::mutex fork_[5];\n\nvoid philosopher(int i) {\n    int a = i, b = (i + 1) % 5;\n    int lo = std::min(a, b), hi = std::max(a, b);   // always the lower-numbered fork first\n    std::lock_guard<std::mutex> first(fork_[lo]);\n    std::lock_guard<std::mutex> second(fork_[hi]);\n    /* eat */\n}\n\nvoid philosopher2(int i) {\n    std::scoped_lock lk(fork_[i], fork_[(i + 1) % 5]);   // library avoids deadlock\n    /* eat */\n}` },
    dry: { head: ['Philosopher', 'Left', 'Right', 'Locks first', 'Locks second'], rows: [['0', '0', '1', '0', '1'], ['1', '1', '2', '1', '2'], ['3', '3', '4', '3', '4'], ['4', '4', '0', '<span class="c-g">0 (lower)</span>', '4']] },
    complexity: `<p>O(1) per meal; up to 2 philosophers eat concurrently.</p>`, followUps: ['Can a philosopher starve with this solution?', 'What does the Chandy-Misra solution do differently?']
  }
});
practice.push({
  title: 'Connection Pool Deadlock Sizing', level: 'Medium', tags: ['connection pool', 'design', 'safe state'], companies: ['Amazon', 'Uber'],
  statement: `<p>A service has a database connection pool of 10. Each request handler thread needs <b>2</b> connections at the same time (one for reading config, one for the main query) and takes them one after another. Under load the service freezes with all threads waiting. (a) Explain the deadlock. (b) What is the largest number of concurrent handler threads that guarantees no deadlock? (c) Suggest two other fixes.</p>`,
  constraints: `Pool = 10 connections; each thread holds one while waiting for the second.`,
  example: `<p>10 threads each hold 1 connection, 0 free → every thread waits for a second one → ${H.c('r', 'deadlock')}.</p>`,
  brute: { why: `<p>"Increase the pool to 100." It just moves the limit: with 100+ threads the same freeze returns, and the database may not accept 100 connections.</p>` },
  mcq: { q: 'With a pool of 10 and 2 connections per thread, the maximum safe number of threads is…', options: ['9', '5', '10', '11'], answer: 0, explain: 'N threads each holding one leave 10 − N free; need at least 1 free: N ≤ 9. Formula: pool ≥ N × (k − 1) + 1.' },
  hints: [`<p>Hint 1: The pool is a resource with 10 instances; each thread holds one and waits for another - hold and wait.</p>`, `<p>Hint 2: Worst case: every thread gets its first connection before anyone gets a second.</p>`, `<p>Hint 3: To be safe, at least one connection must remain free after everyone has taken their first one: N × 1 + 1 ≤ 10.</p>`],
  solution: {
    approach: `<p>(a) Resource = pool with 10 identical instances. Each handler takes one, then waits for another. If 10 or more handlers each get their first connection, the pool is empty and every one of them waits for a connection that can only be released by a thread that is itself waiting: hold and wait + circular wait on a multi-instance resource. (b) Worst case every thread holds k−1 = 1 connection; one more must be free so that at least one thread can finish and release both: N × (k−1) + 1 ≤ pool → N ≤ 9. This is a safe-state argument like the Banker's algorithm. Limit concurrent handlers to 9 (a semaphore or bounded executor). (c) Other fixes: acquire both connections at once (all-or-nothing) or reuse one connection for both queries - breaks hold and wait; use timeouts with retry/backoff so a stuck thread releases its first connection (preemption).</p>`,
    dry: { head: ['Threads', 'Hold 1 each', 'Free', 'Can someone finish?'], rows: [['8', '8', '2', '<span class="c-g">yes</span>'], ['9', '9', '1', '<span class="c-g">yes - one gets its 2nd</span>'], ['10', '10', '0', '<span class="c-r">no → deadlock</span>']] },
    complexity: `<p>O(1) rule: N ≤ pool − k + 1 when each thread needs k connections.</p>`, followUps: ['What if threads need up to 3 connections?']
  }
});
practice.push({
  title: 'Banker\'s: Grant P4 (3,3,0) and P0 (0,2,0)?', level: 'Hard', tags: ['banker', 'resource request', 'dry run'], companies: ['Oracle', 'Microsoft', 'Cisco'],
  statement: `<p>Original state: Available (3,3,2); Alloc P0 (0,1,0), P1 (2,0,0), P2 (3,0,2), P3 (2,1,1), P4 (0,0,2); Max P0 (7,5,3), P1 (3,2,2), P2 (9,0,2), P3 (2,2,2), P4 (4,3,3). Independently decide, from this original state: (a) can P4 get (3,3,0)? (b) can P0 get (0,2,0)? Show the pretend states and safety runs.</p>`,
  constraints: `Each request is evaluated alone against the original state.`,
  example: `<p>(a) ${H.c('r', 'deny (unsafe)')}; (b) ${H.c('g', 'grant (safe)')}.</p>`,
  brute: { why: `<p>Testing only "Request ≤ Available" would grant both; the first is a trap that leads to an unsafe state.</p>` },
  mcq: { q: 'P4 requests (3,3,0). After the pretend grant, Available is…', options: ['(0,0,2)', '(6,6,2)', '(0,0,0)', '(3,3,2)'], answer: 0, explain: '(3,3,2) − (3,3,0) = (0,0,2).' },
  hints: [`<p>Hint 1: Request (3,3,0) ≤ Need[P4] = (4,3,1) and ≤ Available (3,3,2) both pass. So it all depends on safety.</p>`, `<p>Hint 2: After pretending: Available (0,0,2), Need[P4] (1,0,1). Check each Need against Work (0,0,2).</p>`, `<p>Hint 3: For (b): Available (3,1,2), Need[P0] (7,2,3). P3 can run first (0,1,1 ≤ 3,1,2).</p>`],
  solution: {
    approach: `<p><b>(a)</b> Checks 1 and 2 pass: (3,3,0) ≤ Need[P4] (4,3,1) and ≤ Available (3,3,2). Pretend: Available (0,0,2), Alloc[P4] (3,3,2), Need[P4] (1,0,1). Needs: P0 (7,4,3), P1 (1,2,2), P2 (6,0,0), P3 (0,1,1), P4 (1,0,1). With Work (0,0,2), P3 needs 1 of B (have 0), P4 needs 1 of A (have 0), others even more - nobody can run → unsafe → <b>deny</b>, P4 waits. <b>(b)</b> (0,2,0) ≤ Need[P0] ✔ and ≤ Available ✔. Pretend: Available (3,1,2), Alloc[P0] (0,3,0), Need[P0] (7,2,3). Work (3,1,2): P1 (1,2,2) no (B 2 &gt; 1); P2 no; P3 (0,1,1) yes → Work (5,2,3); P1 (1,2,2) yes → (7,2,3); P0 (7,2,3) yes → (7,5,3); P2 yes → (10,5,5); P4 (4,3,1) yes → (10,5,7). Safe sequence P3, P1, P0, P2, P4 → <b>grant</b>.</p>`,
    code: { lang: 'python', run: true, code: `mx = [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]\nal = [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]]\nav = [3, 3, 2]\ndef safe(av, al):\n    n = len(al); need = [[mx[i][j]-al[i][j] for j in range(3)] for i in range(n)]\n    w, d, s = av[:], [False]*n, []\n    while len(s) < n:\n        for i in range(n):\n            if not d[i] and all(need[i][j] <= w[j] for j in range(3)):\n                w = [w[j]+al[i][j] for j in range(3)]; d[i] = True; s.append(i); break\n        else:\n            return None\n    return s\nfor who, req in [(4, [3,3,0]), (0, [0,2,0])]:\n    nav = [av[j]-req[j] for j in range(3)]\n    nal = [r[:] for r in al]; nal[who] = [nal[who][j]+req[j] for j in range(3)]\n    print(f"P{who} {req}:", safe(nav, nal) or "UNSAFE -> deny")` },
    dry: { head: ['Request', 'Pretend Available', 'Work scan', 'Result'], rows: [['P4 (3,3,0)', '(0,0,2)', 'P0..P4 all have Need > (0,0,2)', '<span class="c-r">unsafe → deny</span>'], ['P0 (0,2,0)', '(3,1,2)', 'P3 → (5,2,3); P1 → (7,2,3); P0 → (7,5,3); P2; P4', '<span class="c-g">safe → grant</span>']] },
    complexity: `<p>O(m n²) per request.</p>`, followUps: ['What happens to the denied process - blocked, or does it get an error?']
  }
});
practice.push({
  title: 'Multi-Instance Detection and the Cheapest Victim', level: 'Hard', tags: ['detection', 'recovery', 'victim selection'], companies: ['Microsoft', 'VMware'],
  statement: `<p>Resources A, B, C. Available (0,0,0). Allocation: P0 (1,0,0), P1 (0,1,0), P2 (0,0,1), P3 (0,0,0). Requests: P0 (0,1,0), P1 (1,0,0), P2 (0,0,0), P3 (0,1,0). (a) Run the detection algorithm: who is deadlocked? (b) If aborting costs are P0 = 8, P1 = 3, P2 = 1, P3 = 1, whom do you abort and why? (c) Verify that the system recovers.</p>`,
  constraints: `P3 holds nothing. Cost counts only for processes actually in the deadlock.`,
  example: `<p>${H.c('r', 'P0 and P1 deadlocked')}; abort P1 (cheaper than P0).</p>`,
  brute: { why: `<p>Aborting the cheapest process overall (P2 or P3 at cost 1) wastes work: they are not in the deadlock and killing them frees nothing useful for the cycle (P3 holds nothing; P2 finishes by itself).</p>` },
  mcq: { q: 'Which processes can be marked Finish = true at the start?', options: ['P3 (holds nothing)', 'P0', 'All of them', 'None'], answer: 0, explain: 'A process with zero Allocation cannot be part of a deadlock cycle, so it starts as Finish = true. P2 also finishes when its zero Request is satisfied.' },
  hints: [`<p>Hint 1: Work = (0,0,0). P3 holds nothing → Finish. P2's Request is (0,0,0) so it finishes and returns C.</p>`, `<p>Hint 2: Work becomes (0,0,1). P0 wants B, P1 wants A - neither fits.</p>`, `<p>Hint 3: P0 and P1 hold what the other wants (A and B): cycle. Abort the cheaper of the two.</p>`],
  solution: {
    approach: `<p>(a) Work = (0,0,0); Finish[P3] = true initially (Allocation all zero). P2: Request (0,0,0) ≤ Work → finishes, Work = (0,0,1). P0: Request (0,1,0) needs 1 of B - Work has 0 → no. P1: Request (1,0,0) needs A - no. Stop. Deadlocked: <b>P0 and P1</b> (P0 holds A and wants B; P1 holds B and wants A). P3 is blocked waiting for B but is not part of the cycle (and holds nothing). (b) Only P0 or P1 can fix the cycle: abort the cheaper one, <b>P1 (cost 3)</b>. Also add its rollback count to the cost afterwards to prevent starvation. (c) After aborting P1, B is released → Work (0,1,1) after P2; P0 wants B: fits → P0 finishes, returns A → Work (1,1,1); P3 requests B → fits and finishes. P1 can restart later. Everyone completes.</p>`,
    code: { lang: 'python', run: true, code: `alloc = [[1,0,0],[0,1,0],[0,0,1],[0,0,0]]\nreq   = [[0,1,0],[1,0,0],[0,0,0],[0,1,0]]\nwork = [0, 0, 0]\nfin = [all(x == 0 for x in a) for a in alloc]\nchanged = True\nwhile changed:\n    changed = False\n    for i in range(4):\n        if not fin[i] and all(req[i][j] <= work[j] for j in range(3)):\n            work = [work[j] + alloc[i][j] for j in range(3)]; fin[i] = True; changed = True\nprint("deadlocked:", [f"P{i}" for i in range(4) if not fin[i]])` },
    dry: { head: ['Step', 'Work', 'Process', 'Request ≤ Work?', 'Effect'], rows: [['init', '(0,0,0)', 'P3', 'holds nothing', 'Finish = true'], ['1', '(0,0,0)', 'P2 (0,0,0)', '<span class="c-g">yes</span>', 'Work (0,0,1)'], ['2', '(0,0,1)', 'P0 (0,1,0)', '<span class="c-r">no</span>', '-'], ['3', '(0,0,1)', 'P1 (1,0,0)', '<span class="c-r">no</span>', 'stuck → P0, P1 deadlocked']] },
    complexity: `<p>Time O(m × n²) for m resource types and n processes; space O(n × m).</p>`, followUps: ['Which would you abort if costs were equal?', 'How do you stop the victim from starving?']
  }
});
practice.push({
  title: 'Design the Deadlock Policy for a Database Engine', level: 'Hard', tags: ['design', 'databases', 'detection', 'recovery'], companies: ['Google', 'Snowflake', 'Meta'],
  statement: `<p>You are building a row-level lock manager for a new SQL database. Transactions take many row locks, in unpredictable order, and can run for seconds. Choose a deadlock strategy (prevention, avoidance, detection + recovery, or ignore) and justify it. Describe what you would run, when, how you pick the victim, and what the client sees.</p>`,
  constraints: `10<sup>5</sup> concurrent transactions, mostly short, rare long ones. Throughput matters more than guaranteeing no aborts.`,
  example: `<p>Real engines (InnoDB, PostgreSQL, SQL Server) choose ${H.c('g', 'detection + recovery')} and tell applications to retry.</p>`,
  brute: { why: `<p>"Lock the whole table / take locks in a global order." Ordering requires knowing all locks up front, which a SQL planner cannot promise (locks are discovered as rows are scanned). A table lock kills concurrency.</p>` },
  mcq: { q: 'Why is the Banker\'s algorithm a poor fit for a lock manager?', options: ['Transactions cannot declare their maximum lock needs in advance', 'It uses too little memory', 'Locks have infinite instances', 'It cannot be implemented'], answer: 0, explain: 'Avoidance needs Max declared up front; SQL transactions discover their lock set while running.' },
  hints: [`<p>Hint 1: Which Coffman conditions can a database break? Mutual exclusion (shared locks help), preemption (rollback) - it always has an undo log.</p>`, `<p>Hint 2: Prevention needs known lock sets; avoidance needs Max. Detection needs only the current waits.</p>`, `<p>Hint 3: Keep a wait-for graph; run the cycle check when a lock wait exceeds a threshold; pick the victim with the least undo work; return a retryable error.</p>`],
  solution: {
    approach: `<p><b>Strategy:</b> detection + recovery, with cheap prevention where possible. Reasoning: SQL transactions do not know their lock set up front, so global ordering and Banker's avoidance are impractical, and lock-everything-first hurts concurrency. Transactions already have an undo log, so rollback (preempting a transaction) is cheap and safe. <b>Mechanics:</b> maintain a wait-for graph (edges added when a lock request blocks, removed when it is granted). Do not check on every block (most waits resolve in microseconds); start a check when a wait exceeds a short threshold (PostgreSQL's <code>deadlock_timeout</code> = 1 s) or on a background thread every few ms, and run an incremental DFS from the newly blocked transaction (O(V + E) on the connected component only). <b>Victim:</b> the transaction with the least work to undo (fewest rows modified / smallest log), tie-break by youngest; count past rollbacks to avoid starving it. <b>Client contract:</b> abort with a retryable error (SQLSTATE 40P01 / 1213); the driver or app retries the whole transaction with jittered backoff, and operations must be idempotent. <b>Extras:</b> lock timeouts as a safety net, upgrade locks (SELECT … FOR UPDATE) to avoid the classic S→X upgrade deadlock, access tables in a consistent order in application code, metrics and logging of every deadlock graph for diagnosis.</p>`,
    dry: { head: ['Option', 'Works for DB?', 'Why'], rows: [['Prevention (global order)', 'Partly', 'lock set unknown up front'], ['Avoidance (Banker\'s)', 'No', 'no declared Max, O(m n²) per lock'], ['Detection + recovery', '<span class="c-g">Yes</span>', 'needs only current waits; undo log makes rollback cheap'], ['Ignore (ostrich)', 'No', 'a hung transaction holds locks and blocks others']] },
    complexity: `<p>Detection O(V + E) on the affected component, run rarely; overhead near zero in the normal path.</p>`, followUps: ['How would you detect deadlocks across shards?', 'What is wait-die vs wound-wait and when would you prefer them?']
  }
});
practice.push({
  title: 'Thread-Pool Starvation Deadlock', level: 'Hard', tags: ['thread pool', 'design', 'starvation', 'c++'], companies: ['Amazon', 'Stripe'],
  statement: `<p>A service uses a fixed pool of 4 worker threads. A task <code>parent()</code> submits 4 child tasks to the same pool and blocks until all children are done. Four parents run at the same time. The service freezes with 0% CPU. (a) Explain the deadlock using Coffman conditions. (b) Give three fixes. (c) Sketch a safe C++ design.</p>`,
  constraints: `One shared fixed-size pool, FIFO queue, blocking wait inside tasks.`,
  example: `<p>4 workers run 4 parents; the 16 children sit in the queue; no worker is free to run them → ${H.c('r', 'deadlock')}.</p>`,
  brute: { why: `<p>"Make the pool bigger". With enough concurrent parents the same freeze returns; you only moved the threshold.</p>` },
  mcq: { q: 'The fix that removes the hold-and-wait in this design is…', options: ['Parents do not block; they register a continuation (callback / future chain) instead', 'Increase thread priority', 'Use a bigger sleep', 'Run fewer CPU cores'], answer: 0, explain: 'If a parent releases its worker while waiting, children can run on it; no thread holds a worker while waiting for another worker.' },
  hints: [`<p>Hint 1: Resource = worker thread (4 instances). A parent holds one worker while waiting for another.</p>`, `<p>Hint 2: All 4 workers are parents; children need workers; nobody finishes.</p>`, `<p>Hint 3: Fixes: separate pools, no blocking waits (continuations), or run children inline on the calling thread ("caller runs").</p>`],
  solution: {
    approach: `<p>(a) The resource is a worker thread (4 identical instances). Mutual exclusion: a worker runs one task at a time. Hold and wait: each parent holds its worker while waiting for children. No preemption: a running task is not taken off its thread. Circular wait: parents wait for children, children wait in the queue for a worker that only a parent can release. With 4 parents, all workers are occupied by waiting parents, so no child ever runs. It is a deadlock on a multi-instance resource (the pool). (b) Fixes: (1) use a separate pool for children, so the parents' pool cannot starve them; (2) never block inside pool tasks - use continuations/futures that compose (<code>then</code>), so the worker is released while waiting; (3) "caller runs" / work-helping: while waiting, the parent executes queued tasks itself; or bound the number of concurrent parents to pool size − 1 (a Banker-style safe-state rule). (c) Design: parent submits children and returns; a counter-based join callback runs the final step on whichever worker completes the last child; add queue-length metrics and timeouts to detect it early.</p>`,
    code: { lang: 'cpp', code: `#include <future>\n#include <vector>\n#include <atomic>\n#include <functional>\n\n// Sketch: parent never blocks a pool worker. The LAST child to finish triggers the continuation.\nstruct Join {\n    std::atomic<int> remaining;\n    std::function<void()> next;\n    Join(int n, std::function<void()> f) : remaining(n), next(std::move(f)) {}\n    void childDone() { if (--remaining == 0) next(); }   // runs on whichever worker finishes last\n};\n\n// usage idea: submit(child_i, [j]{ /* work */ j->childDone(); }) for all children, then return immediately.` },
    dry: { head: ['Time', 'Workers (4)', 'Queue', 'Result'], rows: [['1', 'P1 P2 P3 P4 (parents)', '16 children', 'parents submit children and wait'], ['2', 'all 4 blocked waiting', '16 children never start', '<span class="c-r">deadlock (0% CPU)</span>'], ['fix', 'parents return; children run', 'continuation fires last', '<span class="c-g">completes</span>']] },
    complexity: `<p>Fix adds O(1) atomic work per child.</p>`, followUps: ['How would you detect this at run time?', 'Why does a work-stealing pool (ForkJoin) avoid the issue?']
  }
});

// =====================================================================
// QUIZ
// =====================================================================
quiz.push({ q: 'Which set lists the four Coffman conditions?', options: ['Mutual exclusion, hold and wait, no preemption, circular wait', 'Mutual exclusion, starvation, aging, circular wait', 'Hold and wait, priority inversion, no preemption, convoy', 'Mutual exclusion, paging, no preemption, thrashing'], answer: 0, explain: 'These four must all hold at once for a deadlock to occur.' });
quiz.push({ q: 'A resource allocation graph with a cycle where each resource has ONE instance means…', options: ['Deadlock', 'A safe state', 'Maybe deadlock', 'Starvation'], answer: 0, explain: 'With single instances a cycle is necessary and sufficient.' });
quiz.push({ q: 'With multiple instances per resource type, a cycle in the RAG means…', options: ['A deadlock is possible but not certain', 'No deadlock ever', 'Always deadlock', 'The graph is invalid'], answer: 0, explain: 'A process outside the cycle may release a spare instance.' });
quiz.push({ q: 'Lock ordering prevents deadlock by breaking…', options: ['Circular wait', 'Mutual exclusion', 'Hold and wait', 'No preemption'], answer: 0, explain: 'A total order makes a ring of waits impossible.' });
quiz.push({ q: 'In the Banker\'s algorithm, Need equals…', options: ['Max − Allocation', 'Allocation − Max', 'Available − Max', 'Max + Allocation'], answer: 0, explain: 'Need is what a process may still request.' });
quiz.push({ q: 'An UNSAFE state is…', options: ['One with no safe sequence; deadlock may occur', 'Always a deadlock', 'One where Available is zero', 'One with a cycle in the wait-for graph'], answer: 0, explain: 'Unsafe means deadlock is possible, not that it has already happened.' });
quiz.push({ q: 'A request that passes "Request ≤ Need" and "Request ≤ Available" is granted by Banker\'s only if…', options: ['The pretend state is safe', 'The process has high priority', 'Available is non-zero afterwards', 'The request is a single unit'], answer: 0, explain: 'The pretend-grant must leave the system in a safe state.' });
quiz.push({ q: 'The deadlock detection algorithm for multiple instances uses which matrix instead of Max?', options: ['Request (current waiting demand)', 'Need', 'Claim', 'Available only'], answer: 0, explain: 'Detection looks at what processes are waiting for right now.' });
quiz.push({ q: 'While running DFS on a wait-for graph you see an edge to a node that is currently on the recursion stack. This indicates…', options: ['A cycle (deadlock)', 'A tree edge', 'A disconnected graph', 'A forward edge'], answer: 0, explain: 'A back edge closes a cycle.' });
quiz.push({ q: 'Two threads repeat "lock A, try_lock B, unlock A on failure" in perfect rhythm at 100% CPU. This is…', options: ['Livelock', 'Deadlock', 'Starvation', 'Priority inversion'], answer: 0, explain: 'They are active but make no progress. Random backoff breaks the symmetry.' });
quiz.push({ q: 'The standard cure for starvation in a priority scheduler is…', options: ['Aging', 'Larger time quantum', 'More locks', 'Disabling interrupts'], answer: 0, explain: 'Raise the priority of jobs the longer they wait.' });
quiz.push({ q: 'Which C++17 facility locks several mutexes without risking lock-order deadlock among them?', options: ['std::scoped_lock', 'std::lock_guard on each, in any order', 'std::atomic_flag', 'std::call_once'], answer: 0, explain: 'scoped_lock uses a deadlock-avoidance algorithm (like std::lock).' });
quiz.push({ q: 'Why do general-purpose OSes mostly ignore deadlock for user programs ("ostrich algorithm")?', options: ['Prevention/avoidance cost is high and deadlocks are rare', 'Deadlocks cannot happen on modern CPUs', 'Threads never hold locks', 'Linux uses the Banker\'s algorithm for everything'], answer: 0, explain: 'Cost versus benefit: rare event, expensive guarantees; the user can kill the process.' });

// =====================================================================
// INTERVIEW
// =====================================================================
interview.push({ q: 'What is a deadlock and what are the necessary conditions?', level: 'B', a: `<p>A deadlock is a state where a set of processes are blocked forever because each holds a resource and waits for one held by another in the set. It needs four conditions together (Coffman): <b>mutual exclusion</b> (resource used by one at a time), <b>hold and wait</b> (keep what you have while asking for more), <b>no preemption</b> (resources cannot be forcibly taken), and <b>circular wait</b> (a ring of waits). Remove any one and deadlock cannot occur. Example: thread 1 locks A then B, thread 2 locks B then A.</p>`, followUps: ['Which condition is the easiest to break in code?', 'Are the conditions sufficient too?'] });
interview.push({ q: 'How do you prevent deadlocks in a multi-threaded program?', level: 'B', a: `<p>Attack one Coffman condition. In practice: <b>(1) global lock ordering</b> (breaks circular wait) - number the locks, always take ascending, or order by address/id; <b>(2) std::scoped_lock / std::lock</b> for several mutexes; <b>(3) try_lock with timeout/back-off</b> and release what you hold on failure (breaks no preemption/hold-and-wait); <b>(4) acquire everything at once</b>; <b>(5) reduce lock scope</b>, never call unknown code (callbacks) while holding a lock; <b>(6)</b> use lock-free or message-passing designs to avoid shared locks. Test with ThreadSanitizer/lockdep-style tools that report lock-order inversions.</p>`, followUps: ['What are the trade-offs of acquire-all-at-once?', 'How does Linux lockdep work?'] });
interview.push({ q: 'Explain the resource allocation graph and when a cycle means deadlock.', level: 'I', a: `<p>A RAG has process nodes (circles), resource nodes (boxes, with dots for instances), request edges P→R and assignment edges R→P. If every resource has exactly one instance, a cycle means deadlock. If resources have several instances, a cycle is only a necessary condition: a process outside the cycle may release an instance and break the wait. In that case you need the detection algorithm with the Allocation and Request matrices. For single instances, the RAG can be collapsed to a wait-for graph.</p>`, followUps: ['Give an example of a cycle with no deadlock.', 'What is a claim edge?'] });
interview.push({ q: 'What is a safe state? Is every unsafe state a deadlock?', level: 'I', a: `<p>A state is safe if there is a sequence of all processes such that each can obtain its remaining maximum demand from the free resources plus resources released by earlier processes in the sequence. In a safe state deadlock cannot occur if we follow the sequence. An unsafe state means no such sequence exists; deadlock is <i>possible</i> but not inevitable (processes may not request their full maximum at the same time). Deadlocked states are a subset of unsafe states. Avoidance algorithms (Banker's) keep the system always safe by refusing requests that lead to unsafe states.</p>`, followUps: ['Can there be several safe sequences?', 'Why is Banker\'s conservative?'] });
interview.push({ q: 'Walk me through Banker\'s algorithm with an example.', level: 'I', a: `<p>Data: Available, Max, Allocation, and Need = Max − Allocation. <b>Safety:</b> Work = Available, Finish all false; repeatedly find an unfinished process with Need ≤ Work, add its Allocation to Work, mark it finished; if all finish, safe. <b>Request(i):</b> check Request ≤ Need[i] (else error), Request ≤ Available (else wait), then pretend: Available −= Request, Allocation[i] += Request, Need[i] −= Request; run safety; if safe grant, else roll back and wait. Example: Available (3,3,2) with the classic 5 × 3 table gives the safe sequence P1, P3, P0, P2, P4; P1 asking (1,0,2) is granted; P4 asking (3,3,0) is denied because the resulting state is unsafe.</p>`, followUps: ['Time complexity?', 'Why is it rarely used in real OSes?'] });
interview.push({ q: 'Why isn\'t the Banker\'s algorithm used in real operating systems?', level: 'I', a: `<p>It needs each process to declare its maximum resource demand in advance, which real programs cannot do; the number of processes and resources changes constantly (processes start, devices fail); and it costs O(m × n²) per request, which is too heavy for hot paths like lock acquisition. General-purpose OSes mostly use prevention-by-convention (lock ordering), timeouts, or simply ignore deadlocks between user processes. The ideas survive in admission control, resource reservation in schedulers (Kubernetes, YARN), and pool-sizing rules.</p>`, followUps: ['Where do you still see Banker-style reasoning?', 'What is the pool size rule for N threads needing k connections?'] });
interview.push({ q: 'How does deadlock detection work for single-instance and multi-instance resources?', level: 'I', a: `<p><b>Single instance:</b> build the wait-for graph (P→Q if P waits for a resource Q holds) and run DFS; a back edge to a node on the recursion stack is a cycle, so a deadlock; O(V + E). <b>Multiple instances:</b> use Allocation and Request matrices: Work = Available; processes holding nothing are Finish = true; repeatedly pick an unfinished process whose Request ≤ Work, add its Allocation to Work (optimistic assumption it finishes), mark finished; processes left unfinished are deadlocked. Complexity O(m × n²). Run it periodically, after a wait exceeds a threshold, or when CPU utilisation drops.</p>`, followUps: ['Why is detection optimistic?', 'How often would you run it?'] });
interview.push({ q: 'You detected a deadlock. How do you recover?', level: 'I', a: `<p>Options: <b>abort all</b> deadlocked processes (simple, expensive); <b>abort one at a time</b> and re-run detection (less loss, more detection runs); <b>preempt resources</b> from a victim and give them to others (needs rollback to a safe state); or <b>roll back</b> a transaction using the undo log or a checkpoint. Choose the victim by cost: priority, work done, resources held, times already rolled back, and whether side effects are reversible. To prevent starvation of the victim, include the rollback count or age in the cost. Databases abort one transaction and return a retryable error; the app retries with backoff.</p>`, followUps: ['How do you prevent the same victim being picked forever?', 'What about processes with external side effects?'] });
interview.push({ q: 'Difference between deadlock, livelock and starvation?', level: 'B', a: `<p><b>Deadlock:</b> processes are blocked in a circular wait; nothing runs, 0% CPU. <b>Livelock:</b> processes are running and constantly changing state in response to each other (e.g. releasing and retrying locks in lock-step) but no one makes progress; high CPU. <b>Starvation:</b> the system makes progress but one process is never scheduled or never gets the resource because of an unfair policy (low priority, reader preference). Fixes: lock ordering/detection for deadlock; randomised or exponential backoff or asymmetry for livelock; aging and fair FIFO queues for starvation.</p>`, followUps: ['Give a real-world example of each.', 'Is starvation a deadlock?'] });
interview.push({ q: 'Two threads deadlock in transfer(A,B) and transfer(B,A). Fix it in C++.', level: 'I', a: `<p>The threads lock the two mutexes in opposite order. Fix with <code>std::scoped_lock lk(from.m, to.m);</code> which locks both safely (guard <code>&amp;from == &amp;to</code> first, because locking the same mutex twice is undefined). Or impose a global order: compare account ids (or addresses with <code>std::less</code>) and lock the lower first. This breaks circular wait. Mention that scoped_lock only protects locks passed together; a third lock held elsewhere in the opposite order can still deadlock, so also document a system-wide ordering.</p>`, followUps: ['What if there are three accounts in a split payment?', 'How does scoped_lock avoid deadlock internally?'] });
interview.push({ q: 'How do you debug a production deadlock?', level: 'A', a: `<p>Confirm symptoms: threads stuck, near-zero CPU, requests timing out. Take a thread dump (<code>jstack</code>/<code>jcmd</code> for Java, <code>gdb thread apply all bt</code> or <code>pstack</code> for C++, <code>py-spy dump</code> for Python). Identify each blocked thread, the lock it waits for, and the thread owning it; draw the wait-for graph; the cycle gives the offending lock order. For databases, read the deadlock log (<code>SHOW ENGINE INNODB STATUS</code>, Postgres <code>log_lock_waits</code> and deadlock messages). Reproduce with a stress test, fix by ordering/scoping locks or shortening transactions, add timeouts and alerts, and run TSan or lockdep in CI to catch inversions early.</p>`, followUps: ['How do you tell a deadlock from a slow dependency?', 'What would you add to prevent recurrence?'] });
interview.push({ q: 'What is the thread-pool starvation deadlock and how do you avoid it?', level: 'A', a: `<p>Tasks running in a fixed pool block while waiting for subtasks submitted to the same pool. When all workers are occupied by waiting parents, the children sit in the queue forever. It satisfies hold-and-wait on a multi-instance resource (workers). Avoid it by never blocking inside pool tasks (use futures with continuations / async composition), by using separate pools for different layers, by "caller-runs" or work-helping while waiting, or by limiting concurrent parents to pool size − 1 (a safe-state rule like Banker's). Work-stealing pools like Java's ForkJoin handle joins by running other tasks while waiting.</p>`, followUps: ['How would you detect it in metrics?', 'Why does a bigger pool only hide the problem?'] });
interview.push({ q: 'How do databases handle deadlocks, and what should the application do?', level: 'A', a: `<p>Engines keep a wait-for graph of transactions waiting for row/table locks. After a short wait threshold (PostgreSQL <code>deadlock_timeout</code>, default 1 s) or continuously (InnoDB), they search for cycles. On a cycle, they pick a victim (least work to undo, or youngest), roll it back, and return an error (MySQL 1213, Postgres 40P01). Applications must catch this error and retry the whole transaction, with jittered backoff and idempotent operations. To reduce deadlocks: access tables/rows in a consistent order, keep transactions short, use appropriate indexes (fewer locked rows), and use lock timeouts. Wait-die and wound-wait are timestamp-based prevention schemes used by some systems.</p>`, followUps: ['What is wait-die vs wound-wait?', 'How are distributed deadlocks detected?'] });
interview.push({ q: 'What is priority inversion, and how is it related to deadlock and starvation?', level: 'E', a: `<p>Priority inversion: a low-priority task holds a lock needed by a high-priority task, and a medium-priority task keeps preempting the low one, so the high-priority task is effectively blocked behind the medium one. It is not a deadlock (no cycle) but a form of starvation of the high-priority task. Mars Pathfinder (1997) kept resetting because of it. Solutions: priority inheritance (the lock holder temporarily runs at the highest waiter's priority, e.g. <code>PTHREAD_PRIO_INHERIT</code>) or priority ceiling protocols, which also prevent deadlock among real-time tasks when used in the immediate-ceiling form.</p>`, followUps: ['How does the priority ceiling protocol prevent deadlock?', 'Does Linux CFS have this problem?'] });

registerModule({
  id: 'cs05',
  title: 'Deadlocks',
  lang: 'cpp',
  intro: `<p>A deadlock is what happens when programs politely wait for each other forever. In this module you learn to <b>recognise</b> it (the four Coffman conditions), <b>draw</b> it (resource allocation and wait-for graphs), <b>stop</b> it before it starts (lock ordering, <code>std::scoped_lock</code>), <b>dodge</b> it (safe states and the Banker's algorithm with real 5 × 3 tables), <b>find</b> it after the fact (cycle detection and the multi-instance algorithm), <b>clean up</b> after it (victim selection), and tell it apart from its cousins livelock and starvation. Everything is worked with small numbers and visualizers you can edit.</p>`,
  goals: [
    'State the four Coffman conditions and show which one each prevention technique breaks',
    'Draw a resource allocation graph and explain why a cycle means deadlock only for single-instance resources',
    'Run the Banker\'s safety algorithm on a 5 × 3 table, find a safe sequence, and decide whether a request can be granted',
    'Detect deadlock with a wait-for graph (DFS) and with the multi-instance Request-matrix algorithm',
    'Fix a two-lock deadlock in C++ with lock ordering and std::scoped_lock',
    'Choose a recovery strategy and victim, and distinguish deadlock from livelock and starvation'
  ],
  prereqs: `Module cs04 (Synchronization: mutexes, semaphores, critical sections) and cs02 (Processes &amp; Threads). Basic C++ and simple graph/DFS ideas help.`,
  hours: 7,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
