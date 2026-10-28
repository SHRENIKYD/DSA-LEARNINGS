(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // compact problem builder (cs track: code optional, solution.approach is a full written answer)
  function mk(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co || undefined,
      statement: o.s, constraints: o.c || 'Pure numbers and reasoning. Show your working step by step.',
      example: o.ex,
      brute: { why: o.b },
      mcq: { q: o.q, options: o.o, answer: o.a, explain: o.e },
      hints: o.h,
      solution: { approach: o.ap, complexity: o.cx, followUps: o.f }
    };
    if (o.d) p.solution.dry = o.d;
    if (o.code) p.solution.code = o.code;
    return p;
  }
  topics.push({
    title: 'Instructions and the Fetch-Decode-Execute Cycle',
    analogy: `<p><b>A CPU is a very fast, very literal cook following a recipe card.</b> The recipe is a numbered list of tiny steps ("take 2 eggs", "add to bowl", "if bowl is full go to step 9"). A bookmark (the <b>program counter</b>) shows which step is next. The cook's hands are the <b>registers</b>: only a few things can be held at once, everything else sits in the pantry (memory), which is a walk away.</p>`,
    explain: `<p>Your C++, Java or Python code is eventually turned into <b>machine instructions</b>: tiny commands the CPU understands, like "add two registers", "load 8 bytes from this address", "jump if zero". The set of instructions a CPU family understands is its <b>ISA</b> (Instruction Set Architecture): x86-64 on most laptops and servers, ARM64 (AArch64) on phones, Apple Silicon and AWS Graviton, RISC-V in many embedded chips.</p>
      <p>The CPU runs a loop forever:</p>
      ${H.table(['Step', 'What happens', 'Cook analogy'], [['Fetch', 'Read the instruction at address PC from memory (really from the instruction cache)', 'Read the next line of the recipe'], ['Decode', 'Work out which operation and which registers it uses', 'Understand "whisk eggs"'], ['Execute', 'The ALU (arithmetic logic unit) does the add/compare/shift', 'Whisk'], ['Memory', 'Loads and stores talk to the data cache', 'Walk to the pantry'], ['Write back', 'Put the result into the destination register; PC moves on (or jumps)', 'Put the bowl down, move bookmark']])}
      <p><b>Registers</b> are the fastest storage there is (about 16 general-purpose 64-bit ones on x86-64, 31 on ARM64), read in well under a nanosecond. Everything else lives in memory and goes through caches.</p>
      <p><b>RISC vs CISC.</b> RISC ISAs (ARM, RISC-V) use simple fixed-length instructions and only loads/stores touch memory. CISC (x86) has variable-length instructions (1 to 15 bytes) and can add straight from memory. Modern x86 chips decode CISC instructions into RISC-like <b>micro-ops</b> internally, so the difference today is mostly about decoding cost and power, not speed.</p>
      <p>Performance in one line: <b>time = instructions × cycles per instruction (CPI) × seconds per cycle</b>. A 3 GHz clock gives a cycle of about 0.33 ns. Making code faster means fewer instructions, fewer cycles each (fewer stalls), or both.</p>`,
    clues: ['"what happens when the CPU runs a line of code" → fetch, decode, execute, memory, write back', '"CPI", "IPC", "clock rate" → the performance equation: instructions × CPI × cycle time', '"x86 vs ARM", "RISC vs CISC" → ISA design, micro-ops, power', '"why is a register faster than RAM" → distance and the memory hierarchy', '"compiled code", "assembly", "Godbolt" → reading machine instructions'],
    code: [`// Compile with: g++ -O2 -S sum.cpp   (or paste into godbolt.org)
// The loop below becomes roughly 4 instructions per element at -O1:
//   add  rax, [rdi]    ; load and add (x86 can add from memory)
//   add  rdi, 8        ; move pointer to the next long
//   cmp  rdi, rsi      ; reached the end?
//   jne  .loop         ; if not, jump back
// At -O2/-O3 the compiler often vectorises it with SIMD (see the last topic).
#include <cstdio>
#include <vector>

long sum(const std::vector<long>& v) {
    long s = 0;                       // lives in a register, never in memory
    for (long x : v) s += x;          // one load + one add per element
    return s;
}

int main() {
    std::vector<long> v(1000, 3);
    std::printf("%ld\\n", sum(v));     // 3000
}`, { lang: 'js', run: true, title: 'A tiny register machine (runnable)', code: `// A toy CPU: 4 registers, a program counter, and a fetch-decode-execute loop.
const prog = [
  ['li', 'r1', 5],          // load immediate: r1 = 5
  ['li', 'r2', 0],          // r2 = 0 (accumulator)
  ['add', 'r2', 'r2', 'r1'],// r2 += r1
  ['addi', 'r1', 'r1', -1], // r1 -= 1
  ['bnez', 'r1', 2],        // if r1 != 0 jump to instruction 2
  ['halt']
];
const R = { r0: 0, r1: 0, r2: 0, r3: 0 };
let pc = 0, cycles = 0;
while (true) {
  const ins = prog[pc];           // FETCH
  const op = ins[0];              // DECODE
  cycles++;
  if (op === 'halt') break;       // EXECUTE + WRITE BACK
  if (op === 'li') { R[ins[1]] = ins[2]; pc++; }
  else if (op === 'add') { R[ins[1]] = R[ins[2]] + R[ins[3]]; pc++; }
  else if (op === 'addi') { R[ins[1]] = R[ins[2]] + ins[3]; pc++; }
  else if (op === 'bnez') { pc = R[ins[1]] !== 0 ? ins[2] : pc + 1; }
}
console.log('sum 5..1 =', R.r2, 'after', cycles, 'instructions');` }],
    codeTitle: ['C++: a loop and the machine code it becomes', 'JS model: fetch-decode-execute'],
    viz: {
      title: 'Step a tiny CPU: PC, registers and the ALU',
      input: '4',
      inputLabel: 'n (1..6): program computes n + (n-1) + ... + 1',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 6) throw new Error('Enter a whole number from 1 to 6');
        var code = 'li   r1, ' + n + '\nli   r2, 0\nadd  r2, r2, r1\naddi r1, r1, -1\nbnez r1, 3\nhalt';
        var R = { PC: 1, r1: 0, r2: 0 }, frames = [], steps = 0;
        frames.push({ narr: 'The program is loaded in memory. The <b>program counter</b> (PC) points at line 1. Registers start at 0.', parts: [{ type: 'code', label: 'program', lang: 'text', code: code, hl: { 1: 'cur' } }, { type: 'vars', label: 'registers', vals: { PC: 1, r1: 0, r2: 0 } }] });
        while (R.PC !== 6 && steps < 40) {
          var line = R.PC, hl = {}, msg = '', vh = {};
          if (line === 1) { R.r1 = n; R.PC = 2; msg = 'Fetch line 1, decode "load immediate", write ' + n + ' into r1.'; vh.r1 = 'ok'; }
          else if (line === 2) { R.r2 = 0; R.PC = 3; msg = 'r2 = 0. It will hold the running total.'; vh.r2 = 'ok'; }
          else if (line === 3) { R.r2 += R.r1; R.PC = 4; msg = 'The ALU adds r2 + r1 and writes back r2 = ' + R.r2 + '.'; vh.r2 = 'ok'; }
          else if (line === 4) { R.r1 -= 1; R.PC = 5; msg = 'ALU subtracts 1: r1 = ' + R.r1 + '.'; vh.r1 = 'ok'; }
          else if (line === 5) { if (R.r1 !== 0) { R.PC = 3; msg = 'Branch: r1 = ' + R.r1 + ' is not zero, so the PC jumps back to line 3 instead of moving to line 6.'; vh.PC = 'sel'; } else { R.PC = 6; msg = 'Branch not taken: r1 is 0, the PC falls through to line 6.'; vh.PC = 'cur'; } }
          hl[line] = 'cur';
          frames.push({ narr: msg, parts: [{ type: 'code', label: 'program', lang: 'text', code: code, hl: hl }, { type: 'vars', label: 'registers', vals: { PC: R.PC, r1: R.r1, r2: R.r2 }, hl: vh }] });
          steps++;
        }
        frames.push({ narr: 'halt. Result r2 = <b>' + R.r2 + '</b> after ' + (steps + 1) + ' instructions. Every high-level loop is this: a few instructions and a backwards branch.', parts: [{ type: 'code', label: 'program', lang: 'text', code: code, hl: { 6: 'ok' } }, { type: 'vars', label: 'registers', vals: { PC: 6, r1: R.r1, r2: R.r2 }, hl: { r2: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'The performance equation with numbers', html: `<p>A program runs 3 × 10<sup>9</sup> instructions with average CPI = 1.5 on a 3 GHz CPU. Time = 3×10<sup>9</sup> × 1.5 / 3×10<sup>9</sup> = <b>1.5 s</b>. Cut cache misses so CPI = 1.0: <b>1.0 s</b>. Same code, same clock, 33% faster.</p>` },
      { title: 'IPC: the inverse of CPI', html: `<p>Modern cores issue 4 to 8 instructions per cycle at best. <code>perf stat</code> printing "IPC 0.4" means the core waits most of the time (usually memory). IPC 3+ means you are compute-bound and doing well.</p>`, code: { lang: 'bash', code: `perf stat -e cycles,instructions,cache-misses,branch-misses ./app` } },
      { title: 'One C++ line, several instructions', html: `<p><code>a[i] = b[i] + c;</code> needs: compute the address of b[i], load it, add c, compute the address of a[i], store. That is why "one line" does not mean "one step".</p>`, code: `void f(long* a, const long* b, long c, int i) { a[i] = b[i] + c; }` }
    ],
    deepDive: `<p><b>Modern cores are superscalar and out-of-order.</b> They fetch and decode several instructions per cycle, rename registers to remove false dependencies, put micro-ops in a <b>reorder buffer</b> (hundreds of entries), execute whichever are ready, then <b>retire</b> them in program order so the program still looks sequential. This hides some latency, e.g. other independent work can run while one load waits for a cache miss.</p>
      <p><b>The limits</b>: true data dependencies (a chain like <code>x = x*3+1</code> cannot run in parallel), branch mispredictions (the speculative work is thrown away), and memory latency longer than the reorder window can hide (a DRAM miss is about 300 cycles).</p>
      <p><b>Clock speed stopped growing</b> around 2005 at 3 to 5 GHz because power rises steeply with frequency and voltage (the end of Dennard scaling). Since then speed comes from more cores, wider cores, bigger caches and SIMD, which is why the topics in this module matter for real performance.</p>`,
    aiEra: `<p>AI coding assistants will happily explain assembly from Compiler Explorer (godbolt.org) and suggest micro-optimisations, but they often guess wrong about what the compiler already does. Old school: read the generated assembly and measure with <code>perf stat</code>. New school: ask the assistant to annotate the hot loop and propose hypotheses, then verify each one with a benchmark. AI accelerators (GPUs, TPUs, NPUs) are the extreme of this module: thousands of simple cores and huge SIMD units, where the same ideas (instructions, pipelines, memory bandwidth) decide how fast a model trains or runs.</p>`,
    problems: [mk({
      t: 'Which Upgrade Wins?', l: 'Easy', tags: ['CPI', 'performance equation'],
      s: `<p>A job executes 6 × 10<sup>9</sup> instructions, CPI = 2.0, clock 2 GHz. Option A: a 3 GHz CPU with the same CPI. Option B: fix cache misses so CPI = 1.2 at 2 GHz. Which is faster and by how much?</p>`,
      ex: `<p>Time = instructions × CPI / frequency.</p>`,
      b: `<p>Comparing only clock speeds (3 GHz beats 2 GHz) ignores CPI and gives the wrong answer.</p>`,
      q: 'Baseline time is…', o: ['3 s', '6 s', '12 s', '2 s'], a: 1, e: '6e9 × 2 / 2e9 = 6 s.',
      h: ['Write the formula: time = instruction count × CPI ÷ clock rate.', 'Compute the baseline first, then each option changing only one factor.', 'Compare the two times; the speedup is old time divided by new time.'],
      ap: `<p>Baseline: 6×10<sup>9</sup> × 2.0 / 2×10<sup>9</sup> = 6 s. Option A: 6×10<sup>9</sup> × 2.0 / 3×10<sup>9</sup> = 4 s (1.5× faster). Option B: 6×10<sup>9</sup> × 1.2 / 2×10<sup>9</sup> = 3.6 s (1.67× faster). Option B wins. In real life a faster clock often also raises CPI because memory does not get faster, so B's advantage is even bigger. Lesson: measure CPI/IPC before buying hardware.</p>`,
      cx: '<p>O(1): three multiplications and divisions per option.</p>'
    })]
  });
  topics.push({
    title: 'Pipelining and Hazards',
    analogy: `<p><b>A laundry with a washer, a dryer and a folding table.</b> Doing one load fully before starting the next takes forever. Instead, while load 1 dries, load 2 washes. Each load still takes the same time, but a finished load comes out every step. Trouble starts when load 2 needs something from load 1 (a sock that is still in the dryer) or when you are not sure which basket comes next.</p>`,
    explain: `<p><b>Pipelining</b> splits each instruction into stages and works on several instructions at once, one per stage. The classic textbook RISC pipeline has 5 stages:</p>
      ${H.table(['Stage', 'Name', 'Job'], [['IF', 'Instruction Fetch', 'read the instruction at PC'], ['ID', 'Instruction Decode', 'decode, read source registers'], ['EX', 'Execute', 'ALU operation or address calculation'], ['MEM', 'Memory', 'load or store to the data cache'], ['WB', 'Write Back', 'write the result register']])}
      <p>Without pipelining, 5 instructions × 5 stages = 25 cycles. With it: 5 + (5 − 1) = <b>9 cycles</b>, and in the steady state one instruction finishes <b>every cycle</b> (CPI → 1). Latency of one instruction is unchanged; <b>throughput</b> improves.</p>
      <p><b>Hazards</b> stop the pipeline from accepting a new instruction each cycle:</p>
      <ul><li><b>Data hazard</b>: an instruction needs a result that is not ready yet. Read-after-write (RAW) is the true dependency: <code>add r1,r2,r3</code> then <code>sub r4,r1,r5</code>. Fix: <b>forwarding</b> (bypassing): send the ALU result straight from the end of EX into the next instruction's EX, no waiting for WB.</li>
      <li><b>Load-use hazard</b>: a load's data appears only at the end of MEM, so the very next instruction that uses it must <b>stall 1 cycle</b> (a "bubble") even with forwarding. Compilers reorder instructions to fill that slot.</li>
      <li><b>Control hazard</b>: after a branch, which instruction comes next? Wait (stall), guess (branch prediction, next topic), or use delay slots (old MIPS).</li>
      <li><b>Structural hazard</b>: two instructions need the same hardware in the same cycle (e.g. one memory port for fetch and load). Fixed by separate instruction and data caches.</li></ul>
      <p>WAR (write-after-read) and WAW (write-after-write) are "false" dependencies caused by reusing a register name; out-of-order cores remove them with <b>register renaming</b>.</p>`,
    clues: ['"why does pipelining improve throughput but not latency" → overlap of stages', '"data hazard", "RAW", "dependency chain" → forwarding and stalls', '"load-use" → one bubble even with forwarding; schedule an independent instruction in between', '"control hazard", "branch" → prediction and flush penalty', '"how many cycles for N instructions in a k-stage pipeline" → k + N − 1 plus stalls', '"WAR / WAW" → register renaming'],
    code: [{ lang: 'js', run: true, title: '5-stage pipeline hazard tracer (runnable)', code: `// Classic 5-stage pipeline. Each instruction: [op, dest, src1, src2].
// With forwarding: only a load followed immediately by a user stalls (1 bubble).
// Without forwarding: a reader must wait until the writer's WB (register file is
// written in the first half of the cycle and read in the second half).
function trace(prog, forwarding) {
  const rows = [];
  let fetch = 1;                              // cycle in which this instruction is fetched
  for (let i = 0; i < prog.length; i++) {
    const [op, , s1, s2] = prog[i];
    let id = fetch + 1, ex = id + 1;          // earliest EX if no hazard
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const w = prog[j], wr = rows[j];
      if (w[1] !== s1 && w[1] !== s2) continue;          // no RAW on this producer
      const need = forwarding
        ? (w[0] === 'lw' ? wr.mem + 1 : wr.ex + 1)        // value ready after EX (ALU) or MEM (load)
        : wr.wb + 1;                                      // ID must happen in WB cycle -> EX after it
      ex = Math.max(ex, need);
    }
    const stalls = ex - (fetch + 2);
    rows.push({ op: prog[i].join(' '), fetch, ex, mem: ex + 1, wb: ex + 2, stalls });
    fetch = fetch + 1 + stalls;               // a stalled instruction blocks fetch behind it
  }
  return rows;
}
const prog = [['lw', 'r1', 'r9', '-'], ['add', 'r2', 'r1', 'r3'], ['sub', 'r4', 'r2', 'r5'], ['or', 'r6', 'r7', 'r8']];
for (const fw of [true, false]) {
  const r = trace(prog, fw), last = r[r.length - 1].wb;
  console.log(fw ? 'WITH forwarding' : 'WITHOUT forwarding');
  r.forEach(x => console.log('  ' + x.op.padEnd(16) + ' IF@' + x.fetch + ' EX@' + x.ex + ' WB@' + x.wb + ' stalls=' + x.stalls));
  console.log('  total cycles = ' + last + ', CPI ~ ' + (last / prog.length).toFixed(2));
}` }],
    codeTitle: ['JS model: count stalls with and without forwarding'],
    viz: {
      title: 'Pipeline diagram: watch bubbles appear',
      input: 'lw r1 r9; add r2 r1 r3; sub r4 r2 r5; lw r6 r4; or r7 r6 r8',
      inputLabel: 'Instructions "op dest src1 [src2]" separated by ; (max 7, forwarding ON)',
      gen: function (input) {
        var prog = String(input).split(';').map(function (s) { return s.trim().split(/[\s,]+/).filter(Boolean); }).filter(function (a) { return a.length; });
        if (!prog.length || prog.some(function (a) { return a.length < 3; })) throw new Error('Format: op dest src1 [src2]; e.g. lw r1 r9; add r2 r1 r3');
        if (prog.length > 7) throw new Error('Use at most 7 instructions');
        var rows = [], fetch = 1;
        for (var i = 0; i < prog.length; i++) {
          var s1 = prog[i][2], s2 = prog[i][3], ex = fetch + 2, why = '';
          for (var j = Math.max(0, i - 2); j < i; j++) {
            var w = prog[j];
            if (w[1] !== s1 && w[1] !== s2) continue;
            var need = w[0].toLowerCase() === 'lw' ? rows[j].ex + 2 : rows[j].ex + 1;
            if (need > ex) { ex = need; why = 'load-use on ' + w[1]; }
            else if (!why) why = 'RAW on ' + w[1] + ' solved by forwarding';
          }
          rows.push({ txt: prog[i].join(' '), fetch: fetch, ex: ex, stalls: ex - fetch - 2, why: why });
          fetch = fetch + 1 + (ex - fetch - 2);
        }
        var total = rows[rows.length - 1].ex + 2, cols = [];
        for (var c = 1; c <= total; c++) cols.push('c' + c);
        function grid(upto) {
          var g = [], hl = {};
          for (var r = 0; r <= upto; r++) {
            var row = [], x = rows[r];
            for (var c = 1; c <= total; c++) {
              var cell = '';
              if (c === x.fetch) cell = 'IF';
              else if (c > x.fetch && c < x.ex - 1) { cell = 'stall'; hl[r + ',' + (c - 1)] = 'bad'; }
              else if (c === x.ex - 1) cell = 'ID';
              else if (c === x.ex) cell = 'EX';
              else if (c === x.ex + 1) cell = 'MEM';
              else if (c === x.ex + 2) cell = 'WB';
              if (r === upto && cell && cell !== 'stall') hl[r + ',' + (c - 1)] = 'cur';
              row.push(cell);
            }
            g.push(row);
          }
          return { type: 'grid', label: 'pipeline (rows = instructions, columns = cycles)', rows: g, rowHead: rows.slice(0, upto + 1).map(function (x) { return x.txt; }), colHead: cols, hl: hl };
        }
        var frames = [{ narr: 'Five stages: IF, ID, EX, MEM, WB. Ideally a new instruction starts every cycle. Forwarding is ON: ALU results go straight to the next EX.', parts: [{ type: 'text', html: '<p>' + prog.length + ' instructions, ideal time = 5 + ' + (prog.length - 1) + ' = ' + (prog.length + 4) + ' cycles.</p>' }] }];
        for (var k = 0; k < rows.length; k++) {
          var x = rows[k];
          var msg = '<b>' + x.txt + '</b>: fetched in cycle ' + x.fetch + ', executes in cycle ' + x.ex + '. ';
          msg += x.stalls ? '<span class="c-r">' + x.stalls + ' bubble(s): ' + x.why + '</span>. A load only has the data after MEM, so the user must wait one cycle.' : (x.why ? '<span class="c-g">' + x.why + '</span>, no bubble.' : 'Independent, flows straight through.');
          frames.push({ narr: msg, parts: [grid(k)] });
        }
        var st = rows.reduce(function (a, x) { return a + x.stalls; }, 0);
        frames.push({ narr: 'Done in <b>' + total + '</b> cycles (' + st + ' stall cycle(s)). Effective CPI ≈ ' + (total / prog.length).toFixed(2) + '; for long programs it approaches 1 + stalls per instruction. Fix: move an independent instruction into the slot after each load.', parts: [grid(rows.length - 1), { type: 'vars', label: 'summary', vals: { instructions: prog.length, cycles: total, stalls: st }, hl: { stalls: st ? 'bad' : 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Cycles for N instructions', html: `<p>k-stage pipeline, N instructions, no stalls: <b>k + N − 1</b> cycles. 5 stages, 100 instructions: 104 cycles, versus 500 unpipelined. Speedup ≈ 4.8, approaching k for large N.</p>` },
      { title: 'Load-use, and the compiler fix', html: `${H.table(['Order', 'Code', 'Bubbles'], [['Naive', 'lw r1; add r2,r1,r3; lw r4; add r5,r4,r6', '2'], ['Scheduled', 'lw r1; lw r4; add r2,r1,r3; add r5,r4,r6', '0']])}<p>Both loads issue back to back, and each add is now 2 instructions after its load, so forwarding from MEM is in time.</p>` },
      { title: 'Dependency chains in real code', html: `<p>Summing with one accumulator forms a chain: every add waits for the previous one (4-cycle latency for floating point add). Using 4 independent accumulators lets the core overlap them, often 3 to 4× faster.</p>`, code: `double sum4(const double* a, int n) {
    double s0 = 0, s1 = 0, s2 = 0, s3 = 0;   // 4 independent chains
    int i = 0;
    for (; i + 3 < n; i += 4) { s0 += a[i]; s1 += a[i+1]; s2 += a[i+2]; s3 += a[i+3]; }
    for (; i < n; i++) s0 += a[i];           // leftover elements
    return (s0 + s1) + (s2 + s3);
}` }
    ],
    deepDive: `<p><b>Why not 50 stages?</b> Deeper pipelines allow a higher clock, but each stage adds latch overhead and a branch misprediction must flush more stages. Intel's Pentium 4 (about 31 stages) hit power and misprediction walls; modern cores use roughly 14 to 20 stages.</p>
      <p><b>Out-of-order execution</b> generalises stalls: instead of freezing the whole pipeline, a waiting instruction sits in a scheduler while independent ones run. Register renaming maps the 16 architectural registers onto hundreds of physical ones, removing WAR/WAW hazards. The reorder buffer retires in order, giving precise exceptions.</p>
      <p><b>Latency vs throughput of instructions</b>: a modern core may do a floating multiply in 4 cycles latency but start 2 per cycle (throughput 0.5 cycles). Code limited by a dependency chain runs at latency speed; independent work runs at throughput speed. This explains the multiple-accumulator trick and why <code>-ffast-math</code> lets compilers reassociate float sums.</p>`,
    aiEra: `<p>You rarely schedule instructions by hand any more: compilers and out-of-order hardware do it. What still matters is giving them independent work (no needless dependency chains, no pointer aliasing that blocks reordering). AI assistants can propose the multiple-accumulator rewrite or <code>__restrict</code> annotations quickly; your job is to check correctness (float reassociation changes rounding) and to measure. Tools like LLVM-MCA, uiCA and perf annotate show where a loop stalls and are great to paste into a chat for an explanation.</p>`,
    problems: [mk({
      t: 'Count the Bubbles', l: 'Medium', tags: ['pipeline', 'hazards', 'forwarding'],
      s: `<p>5-stage pipeline with full forwarding. Count total cycles for:<br><code>lw r1,0(r2)</code><br><code>add r3,r1,r4</code><br><code>lw r5,4(r2)</code><br><code>sub r6,r5,r3</code><br><code>sw r6,8(r2)</code><br>Then reorder to remove stalls.</p>`,
      ex: `<p>Ideal: 5 + 4 = 9 cycles. Each load-use pair costs 1 bubble.</p>`,
      b: `<p>Stalling every dependent instruction until the producer's WB (as if there were no forwarding) gives far too many cycles.</p>`,
      q: 'With forwarding, an ALU result used by the very next instruction costs…', o: ['0 bubbles', '1 bubble', '2 bubbles', '3 bubbles'], a: 0, e: 'EX-to-EX forwarding delivers it just in time.',
      h: ['Find each place where a load is immediately followed by a user of its destination.', 'Each such load-use costs exactly one bubble with forwarding; ALU-to-ALU and ALU-to-store cost none.', 'To remove them, move the second load up so there is an independent instruction after each load.'],
      ap: `<p>Pairs: lw r1 → add (uses r1): 1 bubble. lw r5 → sub (uses r5): 1 bubble. sub r6 → sw (r6): forwarded, 0. Total = 9 + 2 = <b>11 cycles</b>. Reordered: <code>lw r1; lw r5; add r3,r1,r4; sub r6,r5,r3; sw r6</code>. Now add is two after lw r1 and sub is two after lw r5: no bubbles, <b>9 cycles</b>. The meaning is unchanged because the loads do not depend on add. This is exactly what compiler instruction scheduling does.</p>`,
      cx: '<p>O(N) scan over adjacent instruction pairs.</p>',
      d: { head: ['Pair', 'Type', 'Bubbles'], rows: [['lw r1 → add', 'load-use', '1'], ['lw r5 → sub', 'load-use', '1'], ['sub → sw', 'ALU → store', '0'], ['Total', '9 + 2', '11']] }
    })]
  });
  topics.push({
    title: 'Branch Prediction and Speculation',
    analogy: `<p><b>A GPS that keeps driving while it recalculates.</b> At a fork, instead of stopping the car to think, the driver guesses "same as yesterday" and keeps going. If the guess was right, no time lost. If wrong, they must turn around and drive back to the fork: a big delay. Most days the route is the same, so guessing wins.</p>`,
    explain: `<p>A pipeline fetches a new instruction every cycle, but after a branch (<code>if</code>, loop end, virtual call) the next address is unknown until the branch executes, many stages later. Waiting would waste about 15 to 20 cycles per branch, and roughly 1 in 5 instructions is a branch.</p>
      <p>So the CPU <b>predicts</b> the direction and target, fetches and executes down that path <b>speculatively</b>, and if wrong it <b>flushes</b> the wrong-path work. A misprediction costs roughly <b>15 to 20 cycles</b> on modern cores.</p>
      ${H.table(['Predictor', 'Idea', 'Good at'], [['Static', 'backward branches taken, forward not taken', 'simple loops'], ['1-bit', 'repeat last outcome', 'long runs, but mispredicts twice per loop exit'], ['2-bit saturating counter', 'needs two wrong guesses to flip', 'loops: one miss per exit'], ['Global history (gshare, TAGE)', 'use the pattern of recent branches', 'correlated if-chains, repeating patterns'], ['BTB', 'cache of branch targets', 'knowing WHERE a taken branch goes'], ['Return stack buffer', 'stack of return addresses', 'function returns']])}
      <p>The <b>2-bit counter</b> has states 0 (strong not-taken), 1 (weak not-taken), 2 (weak taken), 3 (strong taken). Predict taken if ≥ 2. Taken → +1 (max 3), not taken → −1 (min 0).</p>
      <p>Modern predictors (TAGE-like) are right more than 95 to 99% of the time on typical code. What hurts is <b>data-dependent random branches</b>, like <code>if (a[i] &gt;= 128)</code> on random data: about 50% wrong. The famous fix is sorting the data first, or making the code <b>branchless</b> (conditional move, arithmetic masks, SIMD).</p>`,
    clues: ['"why is processing a sorted array faster" → branch prediction', '"misprediction penalty", "pipeline flush" → about 15 to 20 cycles', '"branchless", "cmov", "likely/unlikely" → avoid unpredictable branches', '"Spectre" → speculative execution leaks through caches', '"virtual call cost" → indirect branch prediction (BTB)', '"2-bit saturating counter" → classic textbook predictor'],
    code: [`// The classic "sorted array is faster" demo, plus a branchless version.
#include <algorithm>
#include <chrono>
#include <cstdio>
#include <random>
#include <vector>

long long sum_big(const std::vector<int>& v) {
    long long s = 0;
    for (int x : v)
        if (x >= 128) s += x;                // unpredictable on random data
    return s;
}

long long sum_big_branchless(const std::vector<int>& v) {
    long long s = 0;
    for (int x : v) {
        int mask = -(x >= 128);              // all ones if true, 0 if false
        s += x & mask;                       // no branch to mispredict
    }
    return s;
}

int main() {
    std::vector<int> v(1 << 24);
    std::mt19937 rng(42);
    for (int& x : v) x = rng() % 256;
    for (int round = 0; round < 2; round++) {
        auto t0 = std::chrono::steady_clock::now();
        long long s = sum_big(v);
        auto t1 = std::chrono::steady_clock::now();
        std::printf("%s: sum=%lld %.1f ms\\n", round ? "sorted  " : "random  ", s,
                    std::chrono::duration<double, std::milli>(t1 - t0).count());
        std::sort(v.begin(), v.end());       // second round runs on sorted data
    }
    std::printf("branchless: %lld\\n", sum_big_branchless(v));
}`, { lang: 'js', run: true, title: '1-bit vs 2-bit predictor on a loop (runnable)', code: `// A loop of 4 iterations run 5 times: pattern T T T N repeated.
const pattern = [];
for (let r = 0; r < 5; r++) pattern.push(1, 1, 1, 0);
function run(bits) {
  const max = (1 << bits) - 1, half = (max + 1) / 2;
  let state = max, miss = 0;                 // start "strongly taken"
  for (const t of pattern) {
    const guess = state >= half ? 1 : 0;
    if (guess !== t) miss++;
    state = t ? Math.min(max, state + 1) : Math.max(0, state - 1);
  }
  return miss;
}
console.log('branches:', pattern.length);
console.log('1-bit predictor misses:', run(1));   // 2 per loop exit except the first
console.log('2-bit predictor misses:', run(2));   // 1 per loop exit
const penalty = 17;
console.log('cycles lost at 17 cycles each (2-bit):', run(2) * penalty);` }],
    codeTitle: ['C++: random vs sorted data, and a branchless version', 'JS model: predictor accuracy'],
    viz: {
      title: '2-bit saturating counter',
      input: 'T T T N T T T N T N T N',
      inputLabel: 'Actual outcomes (T/N, up to 16)',
      gen: function (input) {
        var seq = String(input).toUpperCase().split(/[\s,]+/).filter(Boolean);
        if (!seq.length || seq.some(function (s) { return s !== 'T' && s !== 'N'; })) throw new Error('Use T and N separated by spaces');
        if (seq.length > 16) throw new Error('Use at most 16 outcomes');
        var names = ['0 strong N', '1 weak N', '2 weak T', '3 strong T'];
        var st = 3, miss = 0, hist = [], frames = [];
        frames.push({ narr: 'The counter starts at 3 (strongly taken). Predict <b>taken</b> when the counter is 2 or 3.', parts: [{ type: 'array', label: 'counter states', values: names, hl: { 3: 'cur' } }] });
        for (var i = 0; i < seq.length; i++) {
          var guess = st >= 2 ? 'T' : 'N', ok = guess === seq[i];
          if (!ok) miss++;
          var old = st;
          st = seq[i] === 'T' ? Math.min(3, st + 1) : Math.max(0, st - 1);
          hist.push(ok ? 1 : 0);
          var hl = {}; hl[st] = ok ? 'ok' : 'bad';
          frames.push({ narr: 'Branch #' + (i + 1) + ': predict <b>' + guess + '</b>, actual <b>' + seq[i] + '</b> → ' + (ok ? '<span class="c-g">correct</span>' : '<span class="c-r">mispredict, flush ~17 cycles</span>') + '. Counter ' + old + ' → ' + st + '.', parts: [
            { type: 'array', label: 'counter states', values: names, hl: hl },
            { type: 'array', label: 'outcomes so far', values: seq.slice(0, i + 1), hl: (function () { var h = {}; hist.forEach(function (v, k) { h[k] = v ? 'ok' : 'bad'; }); return h; })() },
            { type: 'vars', label: 'score', vals: { mispredicts: miss, accuracy: Math.round(100 * (i + 1 - miss) / (i + 1)) + '%' } }
          ] });
        }
        frames.push({ narr: 'Total: ' + miss + ' mispredictions out of ' + seq.length + '. A loop exit costs one miss; alternating T N fools a plain 2-bit counter, which is why real CPUs also use branch <b>history</b> (gshare/TAGE) to learn patterns.', parts: [{ type: 'vars', label: 'result', vals: { branches: seq.length, mispredicts: miss, cycles_lost: miss * 17 }, hl: { mispredicts: miss ? 'bad' : 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Cost of mispredictions', html: `<p>10<sup>9</sup> branches, 20% instructions are branches, miss rate 5%, penalty 17 cycles. Extra CPI = 0.2 × 0.05 × 17 = <b>0.17</b>. If base CPI is 0.5, that is a 34% slowdown from branches alone. Random data at 50% miss would add 1.7 CPI.</p>` },
      { title: 'Sorted vs random', html: `<p>Summing elements ≥ 128 over 16M random bytes typically runs 3 to 6× faster after sorting, because the branch becomes "all N then all T". At -O3 compilers may emit a cmov or SIMD and the difference disappears: always check the assembly.</p>` },
      { title: 'Hints to the compiler', html: `<p>C++20 <code>[[likely]]</code>/<code>[[unlikely]]</code> change code layout (hot path falls through), not the hardware predictor. Good for error paths.</p>`, code: `int parse(int c) {
    if (c < 0) [[unlikely]] return -1;   // error path moved out of the hot code
    return c * 2;
}` }
    ],
    deepDive: `<p><b>Speculative execution and Spectre (2018).</b> The CPU runs wrong-path instructions before knowing they are wrong. Their register results are discarded, but their <b>cache footprint is not</b>. Spectre v1 trains a bounds-check branch to predict "in bounds", then gives an out-of-bounds index: speculatively it reads a secret byte and uses it to index a probe array, and the attacker times which line got cached. Meltdown abused speculative loads across the user/kernel boundary. Mitigations: KPTI (separate kernel page tables), retpolines and IBRS for indirect branches, index masking (<code>array_index_nospec</code>), <code>lfence</code> barriers, site isolation in browsers; all cost some performance.</p>
      <p><b>Indirect branches</b> (virtual calls, switch jump tables, interpreters) are predicted by the BTB using history. Interpreters improved a lot from "threaded code" giving each opcode its own dispatch branch. <b>Branchless</b> code is not always faster: a cmov creates a data dependency, which is worse than a well-predicted branch. Measure <code>branch-misses</code> with perf first.</p>`,
    aiEra: `<p>Profilers now point straight at mispredicting branches (perf, Intel VTune, AMD uProf), and AI assistants are good at suggesting branchless rewrites or "sort/partition first" tricks. Beware: they may suggest a branchless version for a branch that was already 99% predictable, which is slower. The modern habit: measure branch-miss rate, ask the AI for candidate rewrites, benchmark each. Security reviews of code handling secrets (crypto, sandboxes) still need human judgement about speculative side channels; constant-time code is a specialist skill.</p>`,
    problems: [mk({
      t: 'Predict the Predictor', l: 'Medium', tags: ['branch prediction', '2-bit counter'],
      s: `<p>An inner loop runs 3 iterations each time an outer loop iterates (pattern T T N repeating) for 10 outer iterations. Count mispredictions for (a) a 1-bit predictor starting "taken", (b) a 2-bit counter starting at 3. With a 15-cycle penalty, how many cycles are lost in each case?</p>`,
      ex: `<p>Pattern: T T N | T T N | ... 30 branches.</p>`,
      b: `<p>Assuming "the predictor learns the loop, so 0 misses" ignores the exit branch, which always surprises a simple counter.</p>`,
      q: 'Why does a 1-bit predictor miss twice per loop exit?', o: ['It misses the exit and then the first iteration of the next run', 'It never learns', 'It mispredicts every branch', 'It only misses on cold start'], a: 0, e: 'After the N it remembers N, so the next T is also wrong.',
      h: ['Walk the first two repetitions by hand, writing state, guess and outcome.', 'For 1-bit: after the N the state is N, so the next T is wrong too. For 2-bit: from 3, an N only drops it to 2, still predicting T.', 'Count per repetition, watch the first and last repetition for special cases, then multiply by 15.'],
      ap: `<p>(a) 1-bit, start T: rep 1: T ok, T ok, N miss (state N). Every later rep: first T miss (state T), T ok, N miss. Total = 1 + 9 × 2 = <b>19 misses</b> → 285 cycles. (b) 2-bit, start 3: T (3) ok, T ok, N miss → 2. Next T: predict T (2) ok → 3, T ok, N miss → 2. So exactly 1 miss per rep: <b>10 misses</b> → 150 cycles. The hysteresis of the 2-bit counter halves the misses on loops. A history-based predictor (or a loop predictor) could reach near 0 because the pattern is periodic.</p>`,
      cx: '<p>O(number of branches) simulation.</p>',
      d: { head: ['Branch', '1-bit guess', '2-bit state/guess', 'Actual'], rows: [['1', 'T ✓', '3/T ✓', 'T'], ['2', 'T ✓', '3/T ✓', 'T'], ['3', 'T ✗', '3/T ✗', 'N'], ['4', 'N ✗', '2/T ✓', 'T'], ['5', 'T ✓', '3/T ✓', 'T'], ['6', 'T ✗', '3/T ✗', 'N']] }
    })]
  });
  topics.push({
    title: 'Memory Hierarchy and Caches: Lines, Sets, Associativity',
    analogy: `<p><b>Your desk, your bookshelf, the library, and a warehouse across town.</b> You keep what you are using right now on the desk (registers, L1), recent books on the shelf (L2/L3), most books in the library (RAM), and everything else in a warehouse (SSD). When you fetch a book you grab the whole <b>shelf section</b> next to it too (a cache line), because you will probably want the neighbours.</p>`,
    explain: `<p>The CPU can do an add in a fraction of a nanosecond, but main memory (DRAM) takes about 80 to 100 ns. Caches are small, fast memories close to the core that keep recently used data.</p>
      ${H.table(['Level', 'Typical size', 'Latency', 'In cycles at 4 GHz'], [['Registers', '~200 B architected', '0 to 0.3 ns', '0-1'], ['L1 data cache', '32 to 64 KB per core', '~1 ns', '~4-5'], ['L2', '512 KB to 2 MB per core', '~3-4 ns', '~12-16'], ['L3 (shared)', '8 to 100+ MB', '~10-15 ns', '~40-60'], ['DRAM', 'GBs', '~80-100 ns', '~300-400'], ['NVMe SSD', 'TBs', '~20-100 µs', '~100k+']])}
      <p><b>Cache line</b>: caches move data in fixed blocks, almost always <b>64 bytes</b> on x86 and most ARM (Apple M-series use 128 bytes). Read one byte, you get its whole line.</p>
      <p><b>Where can a line go?</b> An address is split into <b>tag | set index | offset</b>. With line size B and S sets: offset = address mod B, set = (address / B) mod S, tag = the rest.</p>
      <ul><li><b>Direct-mapped</b> (1 way): each line has exactly one possible slot. Fast, but two hot addresses that map to the same set keep evicting each other (<b>conflict misses</b>).</li>
      <li><b>N-way set associative</b>: a line can go into any of N slots of its set; replacement is usually (pseudo-)LRU. L1 is typically 8 to 12 ways.</li>
      <li><b>Fully associative</b>: any slot; used for small structures like the TLB.</li></ul>
      <p>The <b>3 Cs</b> of misses: <b>Compulsory</b> (first touch), <b>Capacity</b> (working set bigger than the cache), <b>Conflict</b> (too many lines fight for one set). <b>AMAT</b> (average memory access time) = hit time + miss rate × miss penalty, applied level by level.</p>
      <p>Writes: <b>write-back</b> (mark the line dirty, write to memory on eviction) is standard; <b>write-allocate</b> brings the line in on a write miss.</p>`,
    clues: ['"cache line", "64 bytes" → spatial locality, padding, false sharing', '"tag, index, offset" → address breakdown questions', '"direct-mapped vs set associative" → conflict misses', '"AMAT" → hit time + miss rate × penalty, level by level', '"latency numbers every programmer should know" → L1 ~1 ns, DRAM ~100 ns, SSD ~100 µs', '"working set fits in L2/L3" → capacity misses and blocking'],
    code: [{ lang: 'js', run: true, title: 'Set-associative LRU cache simulator (runnable)', code: `// Cache simulator with hit/miss counting. Addresses are byte addresses.
function makeCache(sizeBytes, lineBytes, ways) {
  const sets = sizeBytes / lineBytes / ways;
  const data = Array.from({ length: sets }, () => []);   // each set: tags, most recent last
  let hits = 0, misses = 0;
  return {
    access(addr) {
      const line = Math.floor(addr / lineBytes);
      const set = line % sets, tag = Math.floor(line / sets);
      const s = data[set], i = s.indexOf(tag);
      if (i >= 0) { hits++; s.splice(i, 1); s.push(tag); return true; }
      misses++;
      if (s.length === ways) s.shift();                  // evict least recently used
      s.push(tag);
      return false;
    },
    stats() { return { hits, misses, hitRate: (100 * hits / (hits + misses)).toFixed(1) + '%' }; }
  };
}
// Traverse a 256 x 256 matrix of 4-byte ints, row-major layout, in two orders.
const N = 256, ELEM = 4;
for (const order of ['row-major', 'column-major']) {
  const c = makeCache(32 * 1024, 64, 8);                 // 32 KB, 64 B lines, 8-way
  for (let a = 0; a < N; a++)
    for (let b = 0; b < N; b++) {
      const i = order === 'row-major' ? a : b, j = order === 'row-major' ? b : a;
      c.access((i * N + j) * ELEM);
    }
  console.log(order.padEnd(13), JSON.stringify(c.stats()));
}
// Row-major: 1 miss per 16 ints (64/4). Column-major: every access a new line,
// and 256 lines per column pass do not stay resident -> almost all misses.` }],
    codeTitle: ['JS model: cache simulator with hit/miss counting'],
    viz: {
      title: 'Direct-mapped vs set-associative cache',
      input: '4 1 16 | 0 64 0 64 16 128 0 4',
      inputLabel: '"sets ways lineBytes | addresses" (sets ≤ 8, ways ≤ 4, ≤ 16 addresses)',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length !== 2) throw new Error('Format: sets ways lineBytes | addr addr ...');
        var cfg = parts[0].trim().split(/\s+/).map(Number), addrs = parts[1].trim().split(/[\s,]+/).filter(Boolean).map(Number);
        var S = cfg[0], W = cfg[1], B = cfg[2];
        if (cfg.length !== 3 || [S, W, B].some(function (x) { return !(x > 0) || Math.floor(x) !== x; })) throw new Error('Config must be 3 positive integers: sets ways lineBytes');
        if (S > 8 || W > 4 || B > 256) throw new Error('Keep sets ≤ 8, ways ≤ 4, lineBytes ≤ 256');
        if (!addrs.length || addrs.length > 16 || addrs.some(function (a) { return isNaN(a) || a < 0; })) throw new Error('Give 1 to 16 non-negative addresses');
        var sets = [], hits = 0, miss = 0, frames = [];
        for (var s = 0; s < S; s++) sets.push([]);
        function grid(hl) {
          var rows = [];
          for (var s = 0; s < S; s++) { var r = []; for (var w = 0; w < W; w++) r.push(sets[s][w] !== undefined ? 'tag ' + sets[s][w] : '-'); rows.push(r); }
          var ch = []; for (var w2 = 0; w2 < W; w2++) ch.push('way ' + w2 + (w2 === 0 && W > 1 ? ' (LRU)' : ''));
          return { type: 'grid', label: 'cache: ' + S + ' sets × ' + W + ' way(s), ' + B + '-byte lines', rows: rows, rowHead: sets.map(function (_, i) { return 'set ' + i; }), colHead: ch, hl: hl };
        }
        frames.push({ narr: 'Empty cache. Each address splits into <b>tag | set | offset</b>: offset = addr mod ' + B + ', line = ⌊addr / ' + B + '⌋, set = line mod ' + S + ', tag = ⌊line / ' + S + '⌋.', parts: [grid({})] });
        addrs.forEach(function (a) {
          var line = Math.floor(a / B), set = line % S, tag = Math.floor(line / S), arr = sets[set], i = arr.indexOf(tag), msg, hl = {};
          if (i >= 0) { hits++; arr.splice(i, 1); arr.push(tag); hl[set + ',' + (arr.length - 1)] = 'ok'; msg = '<span class="c-g">HIT</span>: tag ' + tag + ' is already in set ' + set + '. Moved to most-recently-used.'; }
          else {
            miss++;
            var ev = '';
            if (arr.length === W) ev = ' Set full, evict tag ' + arr.shift() + ' (least recently used): a <b>conflict</b> or capacity miss.';
            arr.push(tag); hl[set + ',' + (arr.length - 1)] = 'bad';
            msg = '<span class="c-r">MISS</span>: load the ' + B + '-byte line into set ' + set + ' with tag ' + tag + '.' + ev;
          }
          frames.push({ narr: 'Access <b>' + a + '</b> → line ' + line + ', set ' + set + ', tag ' + tag + ', offset ' + (a % B) + '. ' + msg, parts: [grid(hl), { type: 'vars', label: 'stats', vals: { hits: hits, misses: miss } }] });
        });
        frames.push({ narr: 'Hit rate ' + Math.round(100 * hits / addrs.length) + '%. Try the same addresses with "2 2 16" (same size, 2-way): 0 and 64 can then live together and stop evicting each other.', parts: [grid({}), { type: 'vars', label: 'final', vals: { hits: hits, misses: miss, hitRate: Math.round(100 * hits / addrs.length) + '%' }, hl: { hitRate: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Address breakdown', html: `<p>32 KB, 8-way, 64-byte lines → 32768 / 64 = 512 lines, / 8 = <b>64 sets</b>. Offset = 6 bits, index = 6 bits, tag = remaining bits. Address 0x12345: offset = 0x05, line = 0x48D, set = 0x48D mod 64 = 13, tag = 0x48D / 64 = 18.</p>${H.bits(0x12345, 20, { label: '0x12345: tag | set (bits 6-11) | offset (bits 0-5)' })}` },
      { title: 'AMAT, two levels', html: `<p>L1 hit 1 ns, L1 miss rate 5%; L2 hit 4 ns, L2 local miss rate 20%; DRAM 100 ns. AMAT = 1 + 0.05 × (4 + 0.2 × 100) = 1 + 0.05 × 24 = <b>2.2 ns</b>. Halving the L1 miss rate gives 1.6 ns.</p>` },
      { title: 'The famous loop interchange', html: `<p>Summing a 4096×4096 int matrix row by row reads 16 ints per line fetched. Column by column uses 4 bytes out of each 64-byte line and evicts it before coming back: often <b>5 to 10× slower</b>.</p>`, code: `long sum_rows(const int (*m)[4096]) {        // good: walks memory in order
    long s = 0;
    for (int i = 0; i < 4096; i++)
        for (int j = 0; j < 4096; j++) s += m[i][j];
    return s;
}` }
    ],
    deepDive: `<p><b>Why power-of-two strides hurt.</b> With 64 sets × 64 B lines, addresses 4096 bytes apart map to the same set. Walking a column of a 1024-wide float matrix (stride 4096 B) uses only one set: an 8-way L1 keeps just 8 of those lines. Padding the row (1024 → 1040) spreads them out.</p>
      <p><b>Inclusive vs exclusive</b> L3: inclusive means L3 holds a copy of every L1/L2 line (simplifies coherence lookups); many recent designs are non-inclusive. <b>Hardware prefetchers</b> detect sequential and strided streams and fetch lines early, which is why linear scans are so fast and pointer chasing (linked lists, trees) is so slow: the next address is not known until the current load finishes.</p>
      <p><b>Memory-level parallelism.</b> A core can track roughly 10 to 20+ outstanding L1 misses. Independent misses overlap; dependent ones (pointer chasing) are serialised at full DRAM latency. That is the real reason arrays beat linked lists by 10× or more even with the same Big-O. The <b>TLB</b> caches page-table translations; huge pages (2 MB) cut TLB misses for big working sets.</p>`,
    aiEra: `<p>Big-O ignores caches; interviews at performance-minded companies do not. AI tools can generate a cache-friendly blocked matrix multiply or a struct-of-arrays layout in seconds, but they can't know your data sizes; you must reason "does the working set fit in L2?". Also notice that LLM inference is often <b>memory-bandwidth bound</b>: generating each token streams all model weights from HBM, which is why quantisation (smaller weights) and KV-cache layout matter as much as FLOPs. The same AMAT thinking applies, just with GPU HBM and SRAM.</p>`,
    problems: [mk({
      t: 'Split the Address', l: 'Easy', tags: ['cache', 'tag index offset'],
      s: `<p>A 64 KB, 4-way set-associative cache with 64-byte lines and 32-bit addresses. (a) How many sets? (b) How many bits for offset, index and tag? (c) Which set does address 0x0000_A0C4 map to?</p>`,
      ex: `<p>Lines = size / line size; sets = lines / ways.</p>`,
      b: `<p>Forgetting to divide by the number of ways gives 1024 "sets" and a wrong index width.</p>`,
      q: 'The offset width for 64-byte lines is…', o: ['4 bits', '6 bits', '8 bits', '64 bits'], a: 1, e: 'The offset must address 64 bytes, and 2^6 = 64.',
      h: ['Count lines first, then divide by ways to get sets.', 'Offset bits = log2(line size); index bits = log2(sets); tag = address bits − both.', 'For the set: drop the low offset bits (divide by 64), then take the result modulo the number of sets.'],
      ap: `<p>(a) 65536 / 64 = 1024 lines; / 4 ways = <b>256 sets</b>. (b) Offset = log₂64 = 6 bits, index = log₂256 = 8 bits, tag = 32 − 14 = <b>18 bits</b>. (c) 0xA0C4 = 41156. Line = 41156 / 64 = 643 (0x283). Set = 643 mod 256 = <b>131</b> (0x83), tag = 643 / 256 = 2, offset = 41156 mod 64 = 4. In bits: offset = low 6 bits (0x04), index = next 8 bits (0x83), tag = the rest (0x2).</p>`,
      cx: '<p>O(1): a few logs and divisions.</p>',
      d: { head: ['Field', 'Bits', 'Value for 0xA0C4'], rows: [['offset', '6', '4'], ['index', '8', '131'], ['tag', '18', '2']] }
    })]
  });
  topics.push({
    title: 'Locality, Cache Coherence and False Sharing',
    analogy: `<p><b>Two people editing different paragraphs of the same printed page.</b> There is only one copy of the page allowed in anyone's hands at a time when writing. Each time Alice changes her paragraph, Bob must hand the page over, and vice versa. They never touch each other's words, yet they spend all day passing the page back and forth. Give each of them their own page and the problem vanishes.</p>`,
    explain: `<p><b>Locality</b> is why caches work:</p>
      <ul><li><b>Temporal locality</b>: data used now will probably be used again soon (a loop counter, a hot hash table bucket).</li>
      <li><b>Spatial locality</b>: data near recently used data will probably be used soon (the next array element, other fields of the same struct).</li></ul>
      <p>Cache-friendly code: arrays over linked structures, sequential scans, struct-of-arrays when you touch one field of many objects, loop orders matching memory layout, <b>blocking/tiling</b> so a working set fits in cache.</p>
      <p><b>Cache coherence.</b> Each core has a private L1/L2. If two cores cache the same line and one writes, the others must not keep reading stale data. Hardware runs a coherence protocol, typically <b>MESI</b> (or MOESI/MESIF):</p>
      ${H.table(['State', 'Meaning'], [['M Modified', 'only my cache has it, and it is dirty'], ['E Exclusive', 'only my cache has it, clean'], ['S Shared', 'several caches may hold clean copies'], ['I Invalid', 'my copy is not usable']])}
      <p>To write, a core needs the line in M (or E): every other copy is <b>invalidated</b>. If the other core then reads or writes, the line travels across the chip again (tens of ns, more across sockets).</p>
      <p><b>False sharing</b>: two threads write <i>different</i> variables that happen to sit in the <i>same 64-byte line</i>. Logically independent, physically they share one line, so it ping-pongs between cores on every write. Classic victims: an array of per-thread counters <code>long counts[8]</code>, adjacent fields of a struct updated by different threads, lock structs packed together. Fix: <b>pad or align</b> each hot per-thread item to its own line (<code>alignas(64)</code>, <code>std::hardware_destructive_interference_size</code>, Java <code>@Contended</code>), or accumulate in a local variable and write once at the end.</p>`,
    clues: ['"multithreaded counter got slower with more threads" → false sharing or true contention', '"per-thread counters in an array" → pad to 64 bytes', '"MESI", "cache coherence", "invalidate" → how writes propagate between cores', '"array vs linked list performance" → spatial locality and prefetching', '"matrix multiply is slow" → loop order and tiling', '"@Contended", "alignas(64)", "hardware_destructive_interference_size" → false sharing fixes'],
    code: [`// False sharing demo: 4 threads each increment their own counter.
// Version A packs counters into one cache line; version B pads each to 64 bytes.
#include <atomic>
#include <chrono>
#include <cstdio>
#include <thread>
#include <vector>

struct Packed { std::atomic<long> v{0}; };                 // 8 bytes: 8 of these share a line
struct alignas(64) Padded { std::atomic<long> v{0}; };     // one per 64-byte line

template <class Slot>
double run(int threads, long iters) {
    std::vector<Slot> slots(threads);
    auto t0 = std::chrono::steady_clock::now();
    std::vector<std::thread> ts;
    for (int t = 0; t < threads; t++)
        ts.emplace_back([&, t] {
            for (long i = 0; i < iters; i++)
                slots[t].v.fetch_add(1, std::memory_order_relaxed);   // no logical sharing at all
        });
    for (auto& th : ts) th.join();
    return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
}

int main() {
    std::printf("packed: %.0f ms\\n", run<Packed>(4, 50000000));  // typically several times slower
    std::printf("padded: %.0f ms\\n", run<Padded>(4, 50000000));
}`, { lang: 'js', run: true, title: 'False sharing as coherence traffic (runnable model)', code: `// Model: 2 cores alternately write their own 8-byte counter.
// Count how often the cache line must move between cores (MESI invalidations).
function simulate(offsetA, offsetB, writes) {
  const line = (addr) => Math.floor(addr / 64);
  const owner = {};           // line -> core that holds it in Modified state
  let transfers = 0;
  for (let i = 0; i < writes; i++) {
    const core = i % 2, addr = core === 0 ? offsetA : offsetB, l = line(addr);
    if (owner[l] !== undefined && owner[l] !== core) transfers++;   // other core must give it up
    owner[l] = core;
  }
  return transfers;
}
const W = 1000000;
console.log('counters 8 bytes apart  (same line):', simulate(0, 8, W), 'line transfers');
console.log('counters 64 bytes apart (padded)   :', simulate(0, 64, W), 'line transfers');
const nsPerTransfer = 40;
console.log('extra time if same line: ~' + (simulate(0, 8, W) * nsPerTransfer / 1e6).toFixed(0) + ' ms');` }],
    codeTitle: ['C++: packed vs padded per-thread counters', 'JS model: count cache-line transfers'],
    viz: {
      title: 'False sharing: a cache line ping-pongs between cores',
      input: '0 8',
      inputLabel: 'Byte offsets of counter A (core 0) and counter B (core 1), e.g. "0 8" or "0 64"',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).map(Number);
        if (v.length !== 2 || v.some(function (x) { return isNaN(x) || x < 0 || x > 4096; })) throw new Error('Enter two byte offsets 0..4096, e.g. 0 8');
        var la = Math.floor(v[0] / 64), lb = Math.floor(v[1] / 64), same = la === lb;
        var st = [{}, {}], frames = [], moves = 0;
        function view(hl) {
          var lines = same ? [la] : [la, lb];
          var rows = lines.map(function (l) { return [st[0][l] || 'I', st[1][l] || 'I']; });
          return { type: 'grid', label: 'MESI state of each cache line in each core', rows: rows, rowHead: lines.map(function (l) { return 'line ' + l + ' (bytes ' + l * 64 + '-' + (l * 64 + 63) + ')'; }), colHead: ['core 0 L1', 'core 1 L1'], hl: hl };
        }
        frames.push({ narr: 'Counter A is at byte ' + v[0] + ' (line ' + la + '), counter B at byte ' + v[1] + ' (line ' + lb + '). ' + (same ? '<span class="c-r">Same 64-byte line!</span>' : '<span class="c-g">Different lines.</span>') + ' Core 0 only writes A, core 1 only writes B.', parts: [view({})] });
        for (var i = 0; i < 6; i++) {
          var core = i % 2, other = 1 - core, l = core === 0 ? la : lb, hl = {}, row = same ? 0 : (core === 0 ? 0 : 1), msg;
          if (st[core][l] === 'M') msg = 'Core ' + core + ' already owns line ' + l + ' in M. Write hits in L1, ~1 ns.';
          else if (st[other][l] === 'M') { moves++; st[other][l] = 'I'; hl[row + ',' + other] = 'bad'; msg = '<span class="c-r">Core ' + core + ' must steal line ' + l + ' from core ' + other + '</span>: invalidate the other copy, transfer the dirty line (~40-100 ns).'; }
          else msg = 'First touch: core ' + core + ' loads line ' + l + ' and takes it in M.';
          st[core][l] = 'M'; hl[row + ',' + core] = 'cur';
          frames.push({ narr: 'Write #' + (i + 1) + ' by core ' + core + ' to counter ' + (core ? 'B' : 'A') + '. ' + msg, parts: [view(hl), { type: 'vars', label: 'coherence transfers', vals: { transfers: moves }, hl: { transfers: moves ? 'bad' : 'ok' } }] });
        }
        frames.push({ narr: same ? 'Every write after the first two forced a line transfer. The threads share <b>no data</b> logically, but they share a <b>line</b>. Fix: <code>alignas(64)</code> padding. Try "0 64".' : 'Each core keeps its own line in M forever: every write is an L1 hit. This is what padding buys you.', parts: [view({}), { type: 'vars', label: 'result', vals: { transfers: moves, sameLine: same ? 'yes' : 'no' }, hl: { transfers: moves ? 'bad' : 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Per-thread stats array', html: `<p><code>long hits[8]</code> indexed by thread id: all 8 counters fit in one 64-byte line. Scaling from 1 to 8 threads can make it <b>slower</b> than 1 thread. Padding each to 64 B gives near-linear scaling.</p>` },
      { title: 'Struct of arrays for locality', html: `<p>Updating only <code>x</code> of a million particles with 64-byte structs loads 64 bytes per 4 useful bytes. Storing <code>float x[N], y[N]...</code> separately loads only what you need and also vectorises well.</p>`, code: `struct ParticlesSoA {            // each field contiguous: great for scans and SIMD
    std::vector<float> x, y, z, vx, vy, vz;
};` },
      { title: 'Blocking (tiling) matrix multiply', html: `<p>For C = A × B with N = 2048 doubles (32 MB per matrix), the naive i-j-k order streams through B column-wise. Processing 64×64 tiles (3 tiles × 32 KB ≈ 96 KB, fits in L2) reuses each loaded line many times, often 3 to 10× faster before any SIMD.</p>` }
    ],
    deepDive: `<p><b>True sharing vs false sharing.</b> If threads really update the same variable (a global atomic counter) the line must bounce: that is true sharing, fixed by design (sharded counters like Java <code>LongAdder</code>, per-core data combined at read time). False sharing is accidental and fixed by layout.</p>
      <p><b>Detection</b>: <code>perf c2c</code> on Linux reports cache lines with heavy cross-core HITM (hit-modified) traffic and the offsets touched in them. Intel VTune has a memory access view. Symptoms: poor multi-thread scaling with low IPC and no obvious lock.</p>
      <p><b>Line size subtleties</b>: adjacent-line prefetchers on Intel fetch pairs of 64-byte lines, so some libraries pad to 128 bytes. C++17 offers <code>std::hardware_destructive_interference_size</code> (minimum offset to avoid false sharing) and <code>hardware_constructive_interference_size</code> (max size to promote true sharing). Java 8+ has <code>@jdk.internal.vm.annotation.Contended</code> used in <code>LongAdder</code>, ConcurrentHashMap counters and the ForkJoinPool. Across sockets (NUMA), coherence traffic costs even more, which is why per-NUMA-node data structures exist.</p>`,
    aiEra: `<p>False sharing is a classic bug that AI code review often misses, because the code looks perfectly correct: no shared variables, no races. Prompt explicitly: "check this struct layout for false sharing given these threads write these fields". Tools such as <code>perf c2c</code> give hard evidence you can paste into a chat. In ML systems the same idea shows up as GPU shared-memory bank conflicts and as keeping per-worker gradient buffers separate before an all-reduce.</p>`,
    problems: [mk({
      t: 'Why Does Adding Threads Slow It Down?', l: 'Medium', tags: ['false sharing', 'MESI', 'multithreading'],
      s: `<p>A service counts requests per worker: <code>struct Stats { long count[16]; } stats;</code> and worker t does <code>stats.count[t]++</code> on every request. With 1 worker it handles 40M increments/s; with 8 workers total throughput is 15M/s. Explain and fix.</p>`,
      ex: `<p>16 longs = 128 bytes = two cache lines; workers 0 to 7 all share the first line.</p>`,
      b: `<p>Adding a mutex around the increment "to be safe" makes it even slower and does not address the cause: there is no data race to begin with.</p>`,
      q: 'What is the root cause?', o: ['A data race', 'Different counters share one cache line', 'Not enough memory', 'The branch predictor'], a: 1, e: 'Each write invalidates the line in the other cores: false sharing.',
      h: ['Compute which counters fall into the same 64-byte line.', 'Think about what MESI must do when two cores both write the same line, even different bytes.', 'Give each worker its own line (pad/align to 64 or 128) or keep a local counter and publish rarely; mention how to prove it with perf c2c.'],
      ap: `<p>Each long is 8 bytes, so counts[0..7] sit in one 64-byte line. Every increment needs that line in Modified state in the writer's cache, invalidating the other 7 copies; the line ping-pongs between cores and each increment costs a cross-core transfer (~40 to 100 ns) instead of an L1 hit (~1 ns). Fix: <code>struct alignas(64) Slot { long count; char pad[56]; }; Slot stats[16];</code> (or 128 B for adjacent-line prefetchers), or count in a thread-local variable and add to the shared total every N requests or at read time (sharded counter, like LongAdder). Verify with <code>perf c2c</code> showing high HITM on that line before and none after. Expect near-linear scaling afterwards.</p>`,
      cx: '<p>Memory grows from 128 B to 1 KB for 16 padded slots; throughput scales with cores.</p>'
    })]
  });
  topics.push({
    title: 'Integers: Binary, Two\'s Complement and Overflow',
    analogy: `<p><b>A car odometer with 3 digits.</b> After 999 it rolls over to 000. Drive backwards 1 km from 000 and it shows 999. Two's complement simply agrees that "999" <i>means</i> −1 on such a dial. Then adding works the same for positive and negative numbers, and the hardware needs only one adder.</p>`,
    explain: `<p>Computers store integers in fixed widths: 8, 16, 32 or 64 bits. An unsigned n-bit number ranges 0 to 2<sup>n</sup> − 1. For signed numbers almost every CPU uses <b>two's complement</b>: the top bit has weight <b>−2<sup>n−1</sup></b> instead of +2<sup>n−1</sup>.</p>
      ${H.bits(0b11111011, 8, { label: '8-bit pattern 1111 1011 = −128 + 64 + 32 + 16 + 8 + 2 + 1 = −5' })}
      <p><b>Negate</b>: invert every bit, then add 1. 5 = 0000 0101 → invert 1111 1010 → +1 = 1111 1011 = −5.</p>
      ${H.table(['Width', 'Signed range', 'Unsigned range'], [['8-bit', '−128 .. 127', '0 .. 255'], ['16-bit', '−32,768 .. 32,767', '0 .. 65,535'], ['32-bit', '−2,147,483,648 .. 2,147,483,647', '0 .. 4,294,967,295'], ['64-bit', 'about ±9.22 × 10<sup>18</sup>', '0 .. 1.8 × 10<sup>19</sup>']])}
      <p>Why it won: one zero (not +0 and −0), addition/subtraction circuits identical for signed and unsigned, and comparisons are easy. The range is asymmetric: there is one more negative number, so <b>−INT_MIN overflows</b> and <code>abs(INT_MIN)</code> is still negative.</p>
      <p><b>Overflow</b>: in 8 bits, 127 + 1 wraps to −128. In C/C++, <b>signed overflow is undefined behaviour</b> (the compiler may assume it never happens), unsigned arithmetic wraps mod 2<sup>n</sup>. Java and Go wrap silently; Rust panics in debug builds; Python integers never overflow.</p>
      <p><b>Sign extension</b>: widening a signed value copies the top bit (−5 in 8 bits → 1111 1111 1111 1011 in 16 bits). <b>Shifts</b>: <code>x &lt;&lt; k</code> multiplies by 2<sup>k</sup>; arithmetic right shift (signed) keeps the sign and rounds toward −∞, so <code>-7 &gt;&gt; 1</code> is −4 while <code>-7 / 2</code> is −3.</p>`,
    clues: ['"binary search mid overflow" → lo + (hi − lo) / 2', '"reverse integer", "atoi" with 32-bit limits → check before multiplying', '"abs(INT_MIN)", "negate the minimum" → asymmetric range', '"bit manipulation: x & -x, ~x" → two\'s complement identities', '"signed vs unsigned comparison bug" → implicit conversion in C/C++', '"undefined behaviour" → signed overflow in C/C++'],
    code: [`#include <climits>
#include <cstdint>
#include <cstdio>

int main() {
    int8_t a = 127;
    a = static_cast<int8_t>(a + 1);          // wraps to -128 (conversion, implementation-defined before C++20, modular since)
    std::printf("127 + 1 in int8 = %d\\n", a);

    uint32_t u = 0;
    u -= 1;                                  // unsigned wrap is well defined
    std::printf("0u - 1 = %u\\n", u);         // 4294967295

    int x = -5;
    std::printf("-5 as uint8 bits = 0x%02X\\n", static_cast<uint8_t>(x));   // 0xFB
    std::printf("x & -x for 12 = %d\\n", 12 & -12);                         // lowest set bit: 4

    // Safe midpoint: (lo + hi) / 2 can overflow when both are large.
    int lo = 2000000000, hi = 2100000000;
    int mid = lo + (hi - lo) / 2;
    std::printf("mid = %d\\n", mid);

    // Classic trap: signed/unsigned comparison
    unsigned int n = 10;
    int i = -1;
    std::printf("-1 < 10u is %s\\n", (static_cast<long long>(i) < n) ? "true" : "false");
    std::printf("INT_MIN = %d\\n", INT_MIN);
}`, { lang: 'js', run: true, title: 'Two\'s complement encoder/decoder (runnable)', code: `// Decode an n-bit pattern as unsigned and as two's complement, and encode negatives.
function decode(bits) {
  const n = bits.length;
  let unsigned = 0;
  for (const b of bits) unsigned = unsigned * 2 + (b === '1' ? 1 : 0);
  const signed = bits[0] === '1' ? unsigned - 2 ** n : unsigned;   // top bit weighs -2^(n-1)
  return { unsigned, signed };
}
function encode(value, n) {
  const mod = 2 ** n;
  const u = ((value % mod) + mod) % mod;                            // wrap into 0..2^n-1
  return u.toString(2).padStart(n, '0');
}
for (const b of ['00000101', '11111011', '10000000', '01111111', '11111111'])
  console.log(b, JSON.stringify(decode(b)));
console.log('-5 in 8 bits :', encode(-5, 8));
console.log('-128 in 8 bits:', encode(-128, 8));
console.log('128 wraps to :', decode(encode(128, 8)).signed);
// Negation by "invert and add 1"
const five = encode(5, 8);
const inverted = [...five].map(c => (c === '1' ? '0' : '1')).join('');
console.log('5 =', five, 'invert =', inverted, '+1 =', encode(parseInt(inverted, 2) + 1, 8));` }],
    codeTitle: ['C++: wrap-around, sign tricks and classic traps', 'JS model: two\'s complement encode/decode'],
    viz: {
      title: 'Negate a number: invert and add one (8-bit)',
      input: '5',
      inputLabel: 'An integer from -127 to 127',
      gen: function (input) {
        var v = parseInt(String(input).trim(), 10);
        if (isNaN(v) || v < -127 || v > 127) throw new Error('Enter an integer from -127 to 127');
        var u = (v + 256) % 256, inv = (~u) & 255, neg = (inv + 1) & 255;
        function s(x) { return x >= 128 ? x - 256 : x; }
        var weights = [-128, 64, 32, 16, 8, 4, 2, 1], terms = [];
        for (var i = 0; i < 8; i++) if ((neg >> (7 - i)) & 1) terms.push(weights[i]);
        var frames = [];
        frames.push({ narr: 'Start with <b>' + v + '</b> stored in 8 bits. Bit 7 (left) is worth <b>−128</b>; the others are +64 … +1.', parts: [{ type: 'bits', label: 'x = ' + v, value: u, width: 8, showDec: true, dec: v }, { type: 'array', label: 'bit weights', values: weights, hl: { 0: 'sel' } }] });
        frames.push({ narr: 'Step 1: <b>invert</b> every bit (one\'s complement). This gives −x − 1 = ' + s(inv) + '.', parts: [{ type: 'bits', label: '~x', value: inv, width: 8, dec: s(inv), showDec: true, hl: { 0: 'cur', 1: 'cur', 2: 'cur', 3: 'cur', 4: 'cur', 5: 'cur', 6: 'cur', 7: 'cur' } }] });
        frames.push({ narr: 'Step 2: <b>add 1</b>. Carries ripple from the right until they meet a 0.', parts: [{ type: 'bits', label: '~x + 1', value: neg, width: 8, dec: s(neg), showDec: true }] });
        frames.push({ narr: 'Check by weights: ' + (terms.length ? terms.join(' + ') : '0') + ' = <b>' + s(neg) + '</b>. That is −(' + v + ').', parts: [{ type: 'bits', label: '−x', value: neg, width: 8, dec: s(neg), showDec: true }, { type: 'vars', label: 'check', vals: { x: v, minusX: s(neg), sum: s(u) + s(neg) + ' (mod 256)' }, hl: { minusX: 'ok' } }] });
        frames.push({ narr: 'Why it works: x + ~x = 1111 1111 = −1, so ~x + 1 = −x. And the adder ignores the carry out of bit 7: x + (−x) = 256 → 0 in 8 bits. Edge: −128 has no positive partner; negating it gives −128 again.', parts: [{ type: 'bits', label: '−128 (no +128 exists)', value: 128, width: 8, dec: -128, showDec: true, hl: { 7: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Read a byte both ways', html: `<p>0xC8 = 1100 1000. Unsigned: 128 + 64 + 8 = 200. Signed: −128 + 64 + 8 = <b>−56</b>. Same bits, the type decides the meaning: 200 − 256 = −56.</p>` },
      { title: 'Overflow detection rule', html: `<p>Adding two signed numbers overflows exactly when both have the same sign and the result has a different sign. 100 + 50 in int8: 0110 0100 + 0011 0010 = 1001 0110 = −106. Positive + positive gave negative → overflow. Use <code>__builtin_add_overflow</code> in GCC/Clang.</p>`, code: `bool safe_add(int a, int b, int* out) { return !__builtin_add_overflow(a, b, out); }` },
      { title: 'Bit tricks that rely on two\'s complement', html: `${H.table(['Expression', 'Meaning', 'x = 12 (1100)'], [['x & -x', 'lowest set bit', '4'], ['x & (x - 1)', 'clear lowest set bit', '8'], ['(x & (x - 1)) == 0', 'power of two (x &gt; 0)', 'false'], ['~x', '−x − 1', '−13']])}` }
    ],
    deepDive: `<p><b>Undefined behaviour in practice.</b> Because signed overflow is UB in C/C++, <code>for (int i = 0; i &lt;= n; i++)</code> can be compiled assuming it terminates, and <code>if (x + 1 &lt; x)</code> can be deleted as "always false". Use <code>-fsanitize=undefined</code> in tests, <code>-fwrapv</code> to force wrapping, or the overflow builtins. C++20 finally <i>mandates</i> two's complement representation, but overflow is still UB.</p>
      <p><b>Integer promotion traps.</b> <code>uint8_t a = 200, b = 100; a + b</code> is 300 because both promote to int. <code>if (v.size() - 1 &gt;= 0)</code> is always true with an empty vector (size_t wraps to 2<sup>64</sup> − 1). Mixing signed and unsigned in a comparison converts the signed side to unsigned, so <code>-1 &lt; 10u</code> is false.</p>
      <p><b>Real incidents</b>: Ariane 5 (1996) crashed after a 64-bit float was converted to a 16-bit signed integer that overflowed; the Boeing 787 needed a reboot every 248 days because a 32-bit centisecond counter overflowed (2<sup>31</sup> / 100 / 86400 ≈ 248.5 days); Gangnam Style overflowed YouTube's 32-bit view counter in 2014.</p>`,
    aiEra: `<p>Generated code frequently contains <code>(lo + hi) / 2</code>, int accumulators for sums of large arrays, and unchecked <code>stoi</code>. A quick review habit: for every integer ask "what is the largest value it can hold here?". Ask your assistant to add overflow checks or switch to 64-bit, and run sanitizers in CI. In ML, the same thinking appears as <b>quantisation</b>: weights stored in int8 or int4 with a scale factor, where saturating arithmetic (clamp instead of wrap) avoids catastrophic sign flips.</p>`,
    problems: [mk({
      t: 'Decode the Bytes', l: 'Easy', tags: ['two\'s complement', 'binary'],
      s: `<p>(a) What signed value is the 8-bit pattern 1001 0110? (b) Write −20 in 8-bit two's complement. (c) In int8, what is 100 + 60, and did overflow happen?</p>`,
      ex: `<p>Top bit weighs −128.</p>`,
      b: `<p>Reading 1001 0110 as "negative 22" (sign-magnitude) instead of two's complement gives the wrong value.</p>`,
      q: 'In 8-bit two\'s complement, the bit pattern 1111 1111 is…', o: ['255', '−1', '−127', '−128'], a: 1, e: 'All bits set: −128 + 127 = −1.',
      h: ['Sum the weights of the set bits, using −128 for the top bit.', 'For a negative number: write the positive value, invert, add one.', 'For overflow: same-sign inputs and different-sign result means overflow; compute 160 − 256.'],
      ap: `<p>(a) 1001 0110 = −128 + 16 + 4 + 2 = <b>−106</b>. (b) 20 = 0001 0100 → invert 1110 1011 → +1 = <b>1110 1100</b> (check: −128 + 64 + 32 + 8 + 4 = −20). (c) 100 + 60 = 160, which exceeds 127, so the bits 1010 0000 read as 160 − 256 = <b>−96</b>. Overflow: two positives produced a negative. In C++ this is undefined for int arithmetic (though int8 math promotes to int, so the wrap happens only when converting back).</p>`,
      cx: '<p>O(bits): one pass over the 8 bits.</p>'
    })]
  });
  topics.push({
    title: 'Floating Point: IEEE 754',
    analogy: `<p><b>Scientific notation with a fixed number of digits.</b> Write every number as 1.2345 × 10<sup>k</sup> with only 5 digits allowed. You can describe both the width of an atom and the distance to the Sun, but you can't write 1/3 exactly, and adding 0.00001 to 10,000 changes nothing because there is no digit left for it. Floats are exactly this, in base 2.</p>`,
    explain: `<p>A floating-point number is <b>(−1)<sup>sign</sup> × 1.fraction × 2<sup>exponent − bias</sup></b>.</p>
      ${H.table(['Format', 'Sign', 'Exponent', 'Fraction', 'Bias', 'Decimal digits'], [['float (binary32)', '1', '8', '23', '127', '~7'], ['double (binary64)', '1', '11', '52', '1023', '~15-16'], ['half (fp16)', '1', '5', '10', '15', '~3'], ['bfloat16', '1', '8', '7', '127', '~2-3']])}
      <p><b>Worked decode</b>: −6.25 = −110.01₂ = −1.1001₂ × 2<sup>2</sup>. Sign 1, stored exponent 2 + 127 = 129 = 1000 0001, fraction 1001 000…0. Bits: 1 10000001 10010000000000000000000 = 0xC0C80000.</p>
      ${H.bits(0xC0C80000 >>> 0, 32, { label: '−6.25 as float32: sign | exponent (8) | fraction (23)' })}
      <p><b>Special values</b> (exponent all 0s or all 1s):</p>
      ${H.table(['Exponent', 'Fraction', 'Meaning'], [['all 0', '0', '±0 (two zeros, and they compare equal)'], ['all 0', '≠ 0', 'subnormal: 0.fraction × 2<sup>−126</sup>, gradual underflow'], ['all 1', '0', '±∞ (1/0.0, overflow)'], ['all 1', '≠ 0', 'NaN (0/0, sqrt(−1)); NaN ≠ NaN']])}
      <p><b>Why 0.1 + 0.2 ≠ 0.3</b>: 0.1 in binary is 0.000110011001100… repeating forever, so it is rounded. The rounding errors of 0.1 and 0.2 add up to 0.30000000000000004, while 0.3 itself rounds to a slightly different double. Rules of thumb: compare with a tolerance, never use floats for money (use integer cents or decimal types), and remember that float addition is <b>not associative</b>: (a + b) + c can differ from a + (b + c).</p>
      <p>The default rounding is <b>round to nearest, ties to even</b>. Between consecutive floats there is a gap (<b>ulp</b>) that grows with magnitude: above 2<sup>24</sup> = 16,777,216 a float cannot represent every integer, and above 2<sup>53</sup> a double cannot.</p>`,
    clues: ['"0.1 + 0.2", "compare floats" → rounding, epsilon/relative tolerance', '"money", "currency" → never binary floats; integers or decimal', '"NaN", "infinity", "-0.0" → special exponent patterns', '"precision loss with large numbers" → ulp grows, 2^24 / 2^53 limits', '"sum is different in a different order" → non-associativity, Kahan summation', '"fp16, bf16, fp8 in ML" → exponent vs mantissa trade-off'],
    code: [`#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <limits>

// Read the raw bits of a float safely (memcpy, not pointer casting).
uint32_t bits_of(float f) { uint32_t u; std::memcpy(&u, &f, sizeof u); return u; }

int main() {
    float f = -6.25f;
    uint32_t u = bits_of(f);
    std::printf("bits = 0x%08X sign=%u exp=%u frac=0x%06X\\n",
                u, u >> 31, (u >> 23) & 0xFF, u & 0x7FFFFF);

    double a = 0.1 + 0.2;
    std::printf("0.1 + 0.2 = %.17g, equal to 0.3? %s\\n", a, a == 0.3 ? "yes" : "no");
    std::printf("close enough? %s\\n", std::fabs(a - 0.3) <= 1e-12 * std::fabs(0.3) ? "yes" : "no");

    float big = 16777216.0f;                         // 2^24
    std::printf("2^24 + 1 as float = %.1f\\n", big + 1.0f);   // still 16777216

    double nan = std::numeric_limits<double>::quiet_NaN();
    std::printf("NaN == NaN? %s, isnan: %d\\n", nan == nan ? "yes" : "no", std::isnan(nan));
    std::printf("-0.0 == 0.0? %s\\n", -0.0 == 0.0 ? "yes" : "no");
}`, { lang: 'js', run: true, title: 'IEEE 754 bit decoder (runnable)', code: `// Decode float32 and float64 bit patterns by hand using DataView.
function float32Fields(x) {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, x);
  const u = dv.getUint32(0);
  const sign = u >>> 31, exp = (u >>> 23) & 0xff, frac = u & 0x7fffff;
  let kind = 'normal', value;
  if (exp === 0) { kind = frac ? 'subnormal' : 'zero'; value = (sign ? -1 : 1) * (frac / 2 ** 23) * 2 ** -126; }
  else if (exp === 255) { kind = frac ? 'NaN' : 'infinity'; value = frac ? NaN : (sign ? -Infinity : Infinity); }
  else value = (sign ? -1 : 1) * (1 + frac / 2 ** 23) * 2 ** (exp - 127);
  const b = u.toString(2).padStart(32, '0');
  return b[0] + ' ' + b.slice(1, 9) + ' ' + b.slice(9) + '  exp=' + (exp - 127) + ' ' + kind + ' -> ' + value;
}
for (const x of [1, -6.25, 0.1, 1e-45, Infinity, NaN, -0]) console.log(String(x).padEnd(8), float32Fields(x));
console.log('0.1 + 0.2 =', 0.1 + 0.2, '| === 0.3?', 0.1 + 0.2 === 0.3);
console.log('Math.abs(0.1+0.2-0.3) < Number.EPSILON:', Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON);
console.log('2^53 + 1 =', 2 ** 53 + 1, '(cannot be represented as a double)');
console.log('(1e16 + 1) - 1e16 =', (1e16 + 1) - 1e16, ' but 1e16 + (1 - 1e16)... order matters');` }],
    codeTitle: ['C++: inspect float bits, NaN and precision limits', 'JS model: decode float32 fields'],
    viz: {
      title: 'Encode a number as a 32-bit float',
      input: '-6.25',
      inputLabel: 'A decimal number (e.g. 0.1, -6.25, 1e-40, 3.5e38)',
      gen: function (input) {
        var x = Number(String(input).trim());
        if (String(input).trim() === '' || isNaN(x)) throw new Error('Enter a number such as -6.25 or 0.1');
        var dv = new DataView(new ArrayBuffer(4));
        dv.setFloat32(0, x);
        var u = dv.getUint32(0), back = dv.getFloat32(0);
        var sign = u >>> 31, e = (u >>> 23) & 255, f = u & 0x7fffff;
        var signHl = { 31: 'sel' }, expHl = {}, fracHl = {};
        for (var i = 23; i <= 30; i++) expHl[i] = 'cur';
        for (var j = 0; j <= 22; j++) fracHl[j] = 'ok';
        var frames = [];
        frames.push({ narr: 'Input <b>' + x + '</b>. Plan: write it as ±1.fraction × 2<sup>E</sup>, then store sign, E + 127 and the fraction bits.', parts: [{ type: 'bits', label: 'float32 bits', value: u, width: 32 }] });
        frames.push({ narr: 'Bit 31 = <b>sign</b> = ' + sign + (sign ? ' (negative)' : ' (positive)') + '.', parts: [{ type: 'bits', label: 'sign', value: u, width: 32, hl: signHl }] });
        var kind = e === 0 ? (f ? 'subnormal (exponent fixed at −126, no hidden 1)' : 'zero') : e === 255 ? (f ? 'NaN' : 'infinity') : 'normal: real exponent = ' + e + ' − 127 = ' + (e - 127);
        frames.push({ narr: 'Bits 30..23 = <b>stored exponent</b> = ' + e + '. ' + kind + '.', parts: [{ type: 'bits', label: 'exponent', value: u, width: 32, hl: expHl }, { type: 'vars', label: 'exponent', vals: { stored: e, bias: 127, real: e > 0 && e < 255 ? e - 127 : '-' } }] });
        var mant = e === 0 ? f / 8388608 : 1 + f / 8388608;
        frames.push({ narr: 'Bits 22..0 = <b>fraction</b> = ' + f + ' / 2<sup>23</sup>. ' + (e > 0 && e < 255 ? 'Add the hidden leading 1: significand = ' + mant.toPrecision(9) + '.' : 'No hidden 1 here.'), parts: [{ type: 'bits', label: 'fraction', value: u, width: 32, hl: fracHl }, { type: 'vars', label: 'significand', vals: { fraction: f, significand: mant.toPrecision(9) } }] });
        var exact = back === x;
        frames.push({ narr: 'Value stored = ' + (sign ? '−' : '+') + mant.toPrecision(9) + ' × 2<sup>' + (e === 0 ? -126 : e - 127) + '</sup> = <b>' + back + '</b>. ' + (exact ? '<span class="c-g">Exact.</span>' : '<span class="c-r">Rounded!</span> Error = ' + (back - x).toExponential(3) + '. This number has no finite binary expansion within 24 bits.'), parts: [{ type: 'bits', label: 'hex 0x' + ('00000000' + u.toString(16).toUpperCase()).slice(-8), value: u, width: 32, hl: Object.assign({}, signHl, expHl) }, { type: 'vars', label: 'result', vals: { input: x, stored: back, exact: exact ? 'yes' : 'no' }, hl: { exact: exact ? 'ok' : 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Encode 0.75 by hand', html: `<p>0.75 = 0.11₂ = 1.1₂ × 2<sup>−1</sup>. Sign 0, exponent −1 + 127 = 126 = 0111 1110, fraction 1000…0. Hex: 0x3F400000.</p>${H.bits(0x3F400000, 32, { label: '0.75f' })}` },
      { title: 'Summation order', html: `<p>Adding 10<sup>8</sup> copies of 1.0f to a float stops at 16,777,216 (2<sup>24</sup>): adding 1 no longer changes it. Use double, pairwise summation or <b>Kahan</b> compensated summation.</p>`, code: `float kahan_sum(const float* a, int n) {
    float sum = 0.0f, c = 0.0f;            // c collects the lost low-order bits
    for (int i = 0; i < n; i++) {
        float y = a[i] - c;
        float t = sum + y;
        c = (t - sum) - y;                  // what got rounded away
        sum = t;
    }
    return sum;
}` },
      { title: 'Comparing safely', html: `<p>Use a relative tolerance: |a − b| ≤ ε × max(|a|, |b|), plus an absolute floor near zero. A fixed 1e-9 is wrong for values around 10<sup>12</sup> (gap between doubles there is about 1.2 × 10<sup>−4</sup>).</p>` }
    ],
    deepDive: `<p><b>Subnormals</b> fill the gap between 0 and the smallest normal (2<sup>−126</sup> for float), so x − y = 0 only if x = y. On many CPUs they are much slower (microcode assists, 100+ cycles), which is why audio/ML code sets flush-to-zero (FTZ/DAZ) mode.</p>
      <p><b>Fused multiply-add</b> (FMA) computes a × b + c with one rounding: more accurate and faster, but results can differ from separate multiply and add, so the same code may give slightly different answers on different CPUs or compiler flags. <code>-ffast-math</code> allows reassociation, ignores NaN/∞ rules and can break <code>isnan</code> checks.</p>
      <p><b>Low precision in AI</b>: bf16 keeps float32's 8-bit exponent (same range, fewer digits), so training rarely overflows; fp16 needs loss scaling; fp8 (E4M3 / E5M2) and 4-bit formats with per-block scales are used for inference and increasingly training on modern GPUs. Choosing exponent vs mantissa bits is exactly the IEEE trade-off of range vs precision.</p>`,
    aiEra: `<p>Most "my numbers are slightly off" questions are floating-point questions, and AI assistants answer them well if you show the actual values with <code>%.17g</code>. Watch generated code for float equality checks, money in doubles and float loop counters. On the hardware side, the AI boom has made number formats a hot interview topic: know why bf16 exists, what quantisation does to accuracy, and why accumulators are kept in fp32 even when inputs are fp8.</p>`,
    problems: [mk({
      t: 'Encode and Explain', l: 'Medium', tags: ['IEEE 754', 'float'],
      s: `<p>(a) Encode −13.5 as an IEEE 754 single-precision value (binary and hex). (b) What decimal value is 0x3E200000? (c) Why does a loop <code>for (float x = 0; x != 1.0f; x += 0.1f)</code> run forever?</p>`,
      ex: `<p>Normalise to 1.xxx × 2<sup>E</sup>, store E + 127.</p>`,
      b: `<p>Forgetting the hidden 1 (storing 1101.1 directly) or the bias gives a wrong pattern.</p>`,
      q: 'The stored exponent for 2^3 in float32 is…', o: ['3', '127', '130', '1026'], a: 2, e: 'Add the bias of 127: 3 + 127 = 130.',
      h: ['Convert 13.5 to binary: integer part and .5 separately.', 'Shift the point so one 1 is left of it; the number of shifts is the exponent. Drop that leading 1 when storing the fraction.', 'For (c), think about whether 0.1 is exactly representable and what happens to equality after 10 roundings.'],
      ap: `<p>(a) 13.5 = 1101.1₂ = 1.1011₂ × 2<sup>3</sup>. Sign 1, exponent 3 + 127 = 130 = 1000 0010, fraction 1011 0000…0 (23 bits). Bits: 1 10000010 10110000000000000000000 = <b>0xC1580000</b>. (b) 0x3E200000 = 0 01111100 0100…0: exponent 124 − 127 = −3, significand 1.01₂ = 1.25, value = 1.25 × 2<sup>−3</sup> = <b>0.15625</b>. (c) 0.1f is rounded (≈ 0.100000001490116), and each addition rounds again; after 10 steps x is about 1.0000001 not exactly 1.0, so <code>!=</code> is always true and the loop never stops. Use an integer counter (i from 0 to 10, x = i × 0.1f) or compare with <code>&lt;</code>.</p>`,
      cx: '<p>O(bits) by hand: one pass over 32 bits.</p>',
      d: { head: ['Part', '−13.5'], rows: [['binary', '1101.1'], ['normalised', '1.1011 × 2^3'], ['sign', '1'], ['exponent', '130 = 10000010'], ['fraction', '1011000…'], ['hex', 'C1580000']] }
    })]
  });
  topics.push({
    title: 'Endianness, Alignment and SIMD',
    analogy: `<p><b>Writing a date.</b> Americans write 07/04, Europeans 04/07: same date, different order of parts. Endianness is the same idea for the bytes of a number. <b>SIMD</b> is a teacher grading a whole row of tests with one stamp instead of one test at a time: one instruction, many pieces of data.</p>`,
    explain: `<p><b>Endianness</b> is the order in which the bytes of a multi-byte value are stored in memory. The 32-bit value 0x12345678 at address 100:</p>
      ${H.table(['Address', '100', '101', '102', '103'], [['Little-endian (x86, ARM default, RISC-V)', '78', '56', '34', '12'], ['Big-endian (network byte order, some old CPUs)', '12', '34', '56', '78']])}
      <p>Little-endian puts the <b>least significant byte first</b>. It only matters when bytes cross a boundary: network protocols (big-endian "network order": use <code>htonl</code>/<code>ntohl</code>), binary file formats, hashing raw memory, and reinterpreting a byte buffer as integers. Inside a register there is no endianness.</p>
      <p><b>Alignment</b>: a value of size k is <i>naturally aligned</i> if its address is a multiple of k. Compilers pad structs so fields are aligned, which changes <code>sizeof</code>: <code>struct { char c; int i; char d; }</code> is 12 bytes, but reordering to <code>{ int i; char c; char d; }</code> gives 8. Misaligned access is slower or (on some architectures) a fault, and an access that straddles two cache lines costs two.</p>
      <p><b>SIMD</b> (Single Instruction, Multiple Data): wide registers that hold several values and process them together.</p>
      ${H.table(['ISA', 'Register width', 'float32 lanes'], [['SSE (x86)', '128-bit', '4'], ['AVX2 (x86)', '256-bit', '8'], ['AVX-512 (x86)', '512-bit', '16'], ['NEON (ARM)', '128-bit', '4'], ['SVE/SVE2 (ARM), RVV (RISC-V)', 'scalable 128-2048', 'varies']])}
      <p>Compilers <b>auto-vectorise</b> simple loops at -O2/-O3 (GCC enables it at -O2 since version 12). It works best with contiguous arrays, no dependencies between iterations, no aliasing, and no unpredictable branches. When it does not happen, use intrinsics or libraries (Eigen, xsimd, Highway, <code>std::experimental::simd</code>).</p>
      <p><b>Why all this matters</b>: a modern core's peak speed needs (1) data in cache, (2) independent work for the pipeline, (3) predictable branches and (4) SIMD lanes busy. Each missing piece can cost 2 to 10×.</p>`,
    clues: ['"network byte order", "htonl", "parse a binary protocol" → endianness', '"sizeof struct is bigger than expected" → alignment padding; reorder fields', '"vectorise", "SSE/AVX/NEON", "process 8 floats at once" → SIMD', '"why is my loop not auto-vectorised" → aliasing, dependencies, branches', '"memory bound vs compute bound", "roofline" → arithmetic intensity', '"reinterpret bytes as int" → memcpy, alignment and endianness'],
    code: [`#include <cstdint>
#include <cstdio>
#include <cstring>
#if defined(__SSE2__)
#include <immintrin.h>
#endif

struct Bad  { char c; int i; char d; };   // 1 + 3 pad + 4 + 1 + 3 pad = 12 bytes
struct Good { int i; char c; char d; };   // 4 + 1 + 1 + 2 pad = 8 bytes

// Add two float arrays. The plain loop is usually auto-vectorised at -O3.
void add_scalar(float* __restrict out, const float* a, const float* b, int n) {
    for (int i = 0; i < n; i++) out[i] = a[i] + b[i];
}

#if defined(__SSE2__)
// The same with SSE intrinsics: 4 floats per instruction.
void add_sse(float* out, const float* a, const float* b, int n) {
    int i = 0;
    for (; i + 4 <= n; i += 4) {
        __m128 va = _mm_loadu_ps(a + i);      // load 4 floats (unaligned OK)
        __m128 vb = _mm_loadu_ps(b + i);
        _mm_storeu_ps(out + i, _mm_add_ps(va, vb));
    }
    for (; i < n; i++) out[i] = a[i] + b[i];  // tail
}
#endif

int main() {
    uint32_t v = 0x12345678;
    unsigned char bytes[4];
    std::memcpy(bytes, &v, 4);
    std::printf("in memory: %02X %02X %02X %02X (%s-endian)\\n", bytes[0], bytes[1], bytes[2], bytes[3],
                bytes[0] == 0x78 ? "little" : "big");
    std::printf("sizeof(Bad)=%zu sizeof(Good)=%zu\\n", sizeof(Bad), sizeof(Good));
    float a[6] = {1, 2, 3, 4, 5, 6}, b[6] = {10, 20, 30, 40, 50, 60}, o[6];
    add_scalar(o, a, b, 6);
    std::printf("o[5]=%.0f\\n", o[5]);
}`, { lang: 'js', run: true, title: 'Endianness and a SIMD lane model (runnable)', code: `// 1) Endianness with DataView: same value, two byte orders.
const buf = new ArrayBuffer(4), dv = new DataView(buf);
dv.setUint32(0, 0x12345678, true);                       // little-endian
const hex = (u8) => [...u8].map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log('little-endian bytes:', hex(new Uint8Array(buf)));
dv.setUint32(0, 0x12345678, false);                      // big-endian
console.log('big-endian bytes   :', hex(new Uint8Array(buf)));
console.log('read big as little :', '0x' + dv.getUint32(0, true).toString(16));

// 2) SIMD model: count instructions for adding two arrays with lane width W.
function addArrays(a, b, W) {
  const out = new Float32Array(a.length);
  let instr = 0, i = 0;
  for (; i + W <= a.length; i += W) {                    // one vector add per W elements
    for (let l = 0; l < W; l++) out[i + l] = a[i + l] + b[i + l];
    instr++;
  }
  for (; i < a.length; i++) { out[i] = a[i] + b[i]; instr++; }   // scalar tail
  return { out, instr };
}
const n = 1003, a = Float32Array.from({ length: n }, (_, i) => i), b = a.map(x => 2 * x);
for (const W of [1, 4, 8, 16]) {
  const r = addArrays(a, b, W);
  console.log('lanes=' + String(W).padEnd(3) + ' add instructions=' + String(r.instr).padEnd(5) + ' out[1002]=' + r.out[1002]);
}` }],
    codeTitle: ['C++: byte order, struct padding, auto-vectorised and SSE loops', 'JS model: byte order and SIMD lanes'],
    viz: {
      title: 'Bytes in memory, then a 4-lane SIMD add',
      input: '0x12345678',
      inputLabel: 'A 32-bit hex value',
      gen: function (input) {
        var t = String(input).trim();
        var v = /^0x[0-9a-f]{1,8}$/i.test(t) ? parseInt(t, 16) : NaN;
        if (isNaN(v)) throw new Error('Enter a hex value like 0x12345678');
        var b = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].map(function (x) { return ('0' + x.toString(16).toUpperCase()).slice(-2); });
        var frames = [];
        frames.push({ narr: 'Value ' + t + ' has 4 bytes. Most significant byte = ' + b[0] + ', least significant = ' + b[3] + '.', parts: [{ type: 'bits', label: t, value: v >>> 0, width: 32 }] });
        frames.push({ narr: '<b>Little-endian</b> (x86, ARM): the least significant byte goes at the lowest address.', parts: [{ type: 'array', label: 'memory, little-endian', values: [b[3], b[2], b[1], b[0]], idxLabels: ['100', '101', '102', '103'], hl: { 0: 'cur' } }] });
        frames.push({ narr: '<b>Big-endian</b> (network byte order): the most significant byte first. Reads like the hex you write. Sending the little-endian bytes on the wire without <code>htonl</code> would be decoded as 0x' + b[3] + b[2] + b[1] + b[0] + '.', parts: [{ type: 'array', label: 'memory, little-endian', values: [b[3], b[2], b[1], b[0]], idxLabels: ['100', '101', '102', '103'] }, { type: 'array', label: 'memory, big-endian', values: [b[0], b[1], b[2], b[3]], idxLabels: ['100', '101', '102', '103'], hl: { 0: 'sel' } }] });
        var A = [1, 2, 3, 4, 5, 6, 7, 8], B = [10, 20, 30, 40, 50, 60, 70, 80], O = [];
        frames.push({ narr: 'Now SIMD. A 128-bit register holds 4 floats. Scalar code needs 8 adds for 8 elements; SIMD needs 2.', parts: [{ type: 'array', label: 'a', values: A }, { type: 'array', label: 'b', values: B }] });
        for (var k = 0; k < 2; k++) {
          var hl = {};
          for (var l = 0; l < 4; l++) { O[k * 4 + l] = A[k * 4 + l] + B[k * 4 + l]; hl[k * 4 + l] = 'win'; }
          frames.push({ narr: 'Instruction ' + (k + 1) + ': <code>addps</code> adds lanes ' + (k * 4) + '..' + (k * 4 + 3) + ' at once.', parts: [{ type: 'array', label: 'a', values: A, hl: hl }, { type: 'array', label: 'b', values: B, hl: hl }, { type: 'array', label: 'out', values: O.slice(), hl: hl }] });
        }
        frames.push({ narr: '8 results in 2 vector instructions (4× fewer). AVX2 would need 1. The loads must come from cache fast enough, otherwise SIMD just waits on memory.', parts: [{ type: 'array', label: 'out', values: O, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok', 6: 'ok', 7: 'ok' } }, { type: 'vars', label: 'instruction count', vals: { scalar: 8, sse: 2, avx2: 1 } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Parse a big-endian length prefix', html: `<p>A protocol sends a 4-byte length in network order: bytes 00 00 01 2C. Big-endian value = 0x12C = 300. Reading it with a raw little-endian load gives 0x2C010000 = 738,263,040. Always convert.</p>`, code: `#include <cstdint>
uint32_t read_be32(const unsigned char* p) {          // portable, no endianness assumption
    return (uint32_t(p[0]) << 24) | (uint32_t(p[1]) << 16) | (uint32_t(p[2]) << 8) | uint32_t(p[3]);
}` },
      { title: 'Struct padding', html: `${H.table(['Layout', 'Offsets', 'sizeof'], [['char c; int i; char d;', 'c@0, i@4, d@8', '12'], ['int i; char c; char d;', 'i@0, c@4, d@5', '8'], ['double x; char c;', 'x@0, c@8', '16']])}<p>Sort fields from largest to smallest alignment to minimise padding: a million structs save 4 MB and more fit per cache line.</p>` },
      { title: 'Roofline in one line', html: `<p>A core doing 32 float FLOPs per cycle at 3 GHz = 96 GFLOP/s, fed by about 20 GB/s of DRAM bandwidth per core. Adding two arrays does 1 FLOP per 12 bytes moved (two loads, one store): max 20/12 ≈ 1.7 GFLOP/s. That loop is <b>memory-bound</b>; SIMD will not help unless the data is in cache.</p>` }
    ],
    deepDive: `<p><b>What blocks auto-vectorisation</b>: possible aliasing between output and input pointers (fix with <code>__restrict</code> or by copying), loop-carried dependencies (<code>a[i] = a[i-1] + x</code>), function calls the compiler can't inline, complex control flow, and floating-point reductions (the compiler won't reorder float sums without <code>-ffast-math</code> or <code>-fassociative-math</code>). Check with <code>-fopt-info-vec-missed</code> (GCC) or <code>-Rpass-missed=loop-vectorize</code> (Clang).</p>
      <p><b>AVX-512 frequency effects</b>: on some older Intel chips heavy 512-bit instructions lowered the clock, so wider was not always faster. Newer chips have largely fixed this. ARM SVE uses vector-length-agnostic code so one binary runs on different widths.</p>
      <p><b>Endianness in practice</b>: use <code>std::endian</code> (C++20) and <code>std::byteswap</code> (C++23), or explicit shifts as above, never <code>*(uint32_t*)p</code> (that is also an aliasing and alignment violation). Bi-endian ARM exists but is effectively always little-endian in practice. Unicode BOM (FE FF vs FF FE) is endianness for text files.</p>`,
    aiEra: `<p>GPUs are SIMD taken to the extreme (warps of 32 threads executing in lockstep), and AI workloads live or die by the ideas here: memory bandwidth vs FLOPs (roofline), data layout, alignment and vector units such as tensor cores. AI assistants are decent at writing intrinsics, but often produce code that is slower than what the compiler already generated, or wrong on the tail. Always keep a scalar reference implementation, test against it on random sizes (including n not divisible by the lane count), and benchmark.</p>`,
    problems: [mk({
      t: 'Bytes on the Wire', l: 'Easy', tags: ['endianness', 'alignment'],
      s: `<p>(a) An x86 program writes the uint32 0xCAFEBABE to memory at address 0x200. Which byte is at 0x200 and which at 0x203? (b) It sends those 4 bytes raw over a socket; a big-endian parser reads them. What value does it see? (c) What is sizeof(struct { char a; double b; short c; }) on x86-64, and the best reordering?</p>`,
      ex: `<p>Little-endian = least significant byte at the lowest address.</p>`,
      b: `<p>Assuming memory order equals the written hex order (big-endian) on x86 is the classic mistake.</p>`,
      q: 'The byte order of x86 is…', o: ['big-endian', 'little-endian', 'bi-endian at runtime', 'middle-endian'], a: 1, e: 'x86 stores the least significant byte first.',
      h: ['Split the value into bytes CA FE BA BE and decide which one is least significant.', 'A big-endian reader treats the first byte it receives as most significant.', 'For the struct: each field starts at a multiple of its size, and the total is a multiple of the largest alignment (8).'],
      ap: `<p>(a) Little-endian: 0x200 = BE, 0x201 = BA, 0x202 = FE, 0x203 = CA. (b) The parser receives BE BA FE CA and reads <b>0xBEBAFECA</b>. The sender should call <code>htonl</code> first. (c) char a @0, pad 7, double b @8, short c @16, pad to 24: <b>24 bytes</b>. Reordered <code>{ double b; short c; char a; }</code>: 8 + 2 + 1 = 11, padded to <b>16 bytes</b>.</p>`,
      cx: '<p>O(1): a fixed number of bytes and fields.</p>'
    })]
  });
  // ---------------- PRACTICE ----------------
  practice.push(mk({
    t: 'Pipeline Speedup', l: 'Easy', tags: ['pipeline', 'throughput'], co: ['Intel', 'AMD'],
    s: `<p>An unpipelined CPU takes 5 ns per instruction. It is split into 5 equal stages with 0.2 ns latch overhead per stage. (a) New clock period? (b) Time for 1,000 instructions with no stalls, before and after? (c) Speedup?</p>`,
    ex: `<p>Stage time = 5 / 5 + 0.2 = 1.2 ns.</p>`,
    b: `<p>Claiming a perfect 5× speedup ignores latch overhead and the pipeline fill time.</p>`,
    q: 'Pipelining mainly improves…', o: ['latency of one instruction', 'throughput', 'cache hit rate', 'branch accuracy'], a: 1, e: 'One instruction still takes all stages; more finish per unit time.',
    h: ['The clock period is the slowest stage plus latch overhead.', 'With k stages, N instructions take k + N − 1 cycles.', 'Speedup = unpipelined time ÷ pipelined time; compare with the ideal 5×.'],
    ap: `<p>(a) 1.0 + 0.2 = <b>1.2 ns</b>. (b) Unpipelined: 1000 × 5 = 5000 ns. Pipelined: (5 + 999) × 1.2 = 1004 × 1.2 = <b>1204.8 ns</b>. (c) 5000 / 1204.8 ≈ <b>4.15×</b>, below the ideal 5× because of latch overhead (1.2 vs 1.0 ns) and fill time. Note one instruction's latency rose from 5 ns to 6 ns: pipelining trades latency for throughput.</p>`,
    cx: '<p>O(1): a handful of arithmetic steps.</p>'
  }));
  practice.push(mk({
    t: 'Range and Overflow Check', l: 'Easy', tags: ['two\'s complement', 'overflow'], co: ['Google'],
    s: `<p>(a) Give the range of a 12-bit signed two's complement number. (b) Is −2048 + (−1) representable? (c) Write a C++ condition that detects overflow of <code>a + b</code> for 32-bit ints <i>before</i> computing it.</p>`,
    ex: `<p>n-bit range: −2<sup>n−1</sup> to 2<sup>n−1</sup> − 1.</p>`,
    b: `<p>Computing a + b and then checking <code>if (a + b &lt; a)</code> relies on undefined behaviour in C++; the compiler may delete the check.</p>`,
    q: 'The smallest 12-bit signed value is…', o: ['−2047', '−2048', '−4096', '−4095'], a: 1, e: 'For 12 bits the minimum is −2^11 = −2048.',
    h: ['Plug n = 12 into the range formula −2^(n−1) .. 2^(n−1) − 1.', 'The minimum minus one wraps to the maximum.', 'Check against INT_MAX − b when b is positive and INT_MIN − b when b is negative, so the check itself never overflows.'],
    ap: `<p>(a) −2<sup>11</sup> .. 2<sup>11</sup> − 1 = <b>−2048 .. 2047</b>. (b) No: −2049 is out of range; the 12-bit result wraps to +2047. (c) <code>bool overflows = (b &gt; 0 &amp;&amp; a &gt; INT_MAX - b) || (b &lt; 0 &amp;&amp; a &lt; INT_MIN - b);</code> Neither subtraction can overflow because of the sign test. Alternatives: <code>__builtin_add_overflow(a, b, &amp;r)</code>, or compute in <code>int64_t</code> and compare.</p>`,
    cx: '<p>O(1): a handful of arithmetic steps.</p>',
    code: `#include <climits>
bool add_overflows(int a, int b) {
    return (b > 0 && a > INT_MAX - b) || (b < 0 && a < INT_MIN - b);
}`
  }));
  practice.push(mk({
    t: 'Latency Ladder', l: 'Easy', tags: ['memory hierarchy', 'latency'], co: ['Meta', 'Amazon'],
    s: `<p>A request handler does 200 L1 hits, 40 L2 hits, 10 L3 hits and 5 DRAM accesses (dependent, not overlapped), using 1, 4, 12 and 100 ns respectively. (a) Total memory time? (b) Which level dominates? (c) Name two ways to cut it.</p>`,
    ex: `<p>Multiply counts by latency and add.</p>`,
    b: `<p>Optimising the 200 L1 hits first (the biggest count) attacks the smallest share of time.</p>`,
    q: 'DRAM latency is roughly how many times L1 latency?', o: ['2×', '10×', '100×', '100,000×'], a: 2, e: 'Roughly 1 ns for L1 versus about 100 ns for DRAM.',
    h: ['Compute count × latency for each level separately.', 'Compare the four products; the biggest is the target.', 'Think about avoiding the misses (layout, prefetching, smaller data) or overlapping them (independent loads).'],
    ap: `<p>(a) 200×1 + 40×4 + 10×12 + 5×100 = 200 + 160 + 120 + 500 = <b>980 ns</b>. (b) The 5 DRAM accesses are 51% of the time. (c) Avoid them: pack hot data contiguously so it stays in cache, use arrays instead of pointer chasing, shrink structures; or overlap them: issue independent loads together (memory-level parallelism, software prefetch), batch requests so lookups are not dependent. Cutting 5 DRAM accesses to 1 saves 400 ns; removing all L1 hits would save at most 200.</p>`,
    cx: '<p>O(levels): one product per memory level.</p>'
  }));
  practice.push(mk({
    t: 'Float Gotchas', l: 'Easy', tags: ['IEEE 754'], co: ['Bloomberg', 'Stripe'],
    s: `<p>For each, say true or false and why (double precision): (a) 0.1 + 0.2 == 0.3 (b) 0.5 + 0.25 == 0.75 (c) NaN == NaN (d) 9007199254740993.0 == 9007199254740992.0 (e) −0.0 == 0.0.</p>`,
    ex: `<p>Numbers with short binary expansions (sums of powers of two) are exact.</p>`,
    b: `<p>Answering "floats are always inexact" gets (b), (d) and (e) wrong.</p>`,
    q: 'Which is exactly representable in binary floating point?', o: ['0.1', '0.2', '0.375', '0.3'], a: 2, e: '0.375 = 0.011 in binary.',
    h: ['Write each decimal as a sum of powers of two; finite sums are exact.', 'NaN compares unequal to everything, including itself.', 'Doubles have 53 significant bits; 2^53 + 1 needs 54.'],
    ap: `<p>(a) <b>false</b>: 0.1 and 0.2 are rounded and the sum is 0.30000000000000004. (b) <b>true</b>: 0.5, 0.25 and 0.75 are exact powers-of-two sums. (c) <b>false</b>: NaN is unordered; use isnan. (d) <b>true</b>: 9007199254740993 = 2<sup>53</sup> + 1 is not representable and rounds (ties to even) to 2<sup>53</sup>. (e) <b>true</b>: signed zeros compare equal, though 1/−0.0 = −∞ distinguishes them.</p>`,
    cx: '<p>O(1): a handful of arithmetic steps.</p>'
  }));
  practice.push(mk({
    t: 'Trace a Direct-Mapped Cache', l: 'Medium', tags: ['cache', 'simulation'], co: ['Apple', 'NVIDIA'],
    s: `<p>A direct-mapped cache has 4 lines of 16 bytes (64 bytes total). Byte addresses accessed: 0, 4, 16, 64, 0, 80, 16, 68. For each, give set, tag and hit/miss, and classify the misses (compulsory/conflict). Then repeat with a 2-way, 2-set LRU cache of the same size.</p>`,
    ex: `<p>line = addr / 16, set = line mod 4, tag = line / 4.</p>`,
    b: `<p>Treating each different address as a miss ignores that 0 and 4 share a line.</p>`,
    q: 'Addresses 0 and 64 in this direct-mapped cache…', o: ['map to different sets', 'map to the same set with different tags', 'are in the same line', 'never conflict'], a: 1, e: 'Lines 0 and 4 both map to set 0.',
    h: ['Convert every address to a line number by dividing by 16.', 'Track one tag per set and mark a hit only when the tag matches.', 'For the 2-way version, sets = line mod 2 and keep two tags per set with LRU order; count again.'],
    ap: `<p>Direct-mapped: 0 → line 0, set 0, tag 0: miss (compulsory). 4 → line 0: <b>hit</b>. 16 → line 1, set 1: miss (compulsory). 64 → line 4, set 0, tag 1: miss (compulsory), evicts tag 0. 0 → set 0, tag 0: miss (<b>conflict</b>), evicts tag 1. 80 → line 5, set 1, tag 1: miss (compulsory), evicts line 1. 16 → set 1, tag 0: miss (conflict). 68 → line 4, set 0, tag 1: miss (conflict-type: line 4 was evicted by 0). Total: <b>1 hit, 7 misses</b>. 2-way, 2 sets: lines 0, 4 → set 0 (tags 0, 2); lines 1, 5 → set 1 (tags 0, 2). Sequence: 0 miss, 4 hit, 16 miss, 64 miss (set 0 now holds both), 0 <b>hit</b>, 80 miss (set 1 holds 1 and 5), 16 <b>hit</b>, 68 <b>hit</b>. Total: <b>4 hits, 4 misses</b>; the 4 misses are all compulsory. Associativity removed every conflict miss.</p>`,
    cx: '<p>O(accesses × ways) to simulate by hand.</p>',
    d: { head: ['Addr', 'Line', 'DM set/tag', 'DM', '2-way'], rows: [['0', '0', '0/0', 'miss', 'miss'], ['4', '0', '0/0', 'hit', 'hit'], ['16', '1', '1/0', 'miss', 'miss'], ['64', '4', '0/1', 'miss', 'miss'], ['0', '0', '0/0', 'miss', 'hit'], ['80', '5', '1/1', 'miss', 'miss'], ['16', '1', '1/0', 'miss', 'hit'], ['68', '4', '0/1', 'miss', 'hit']] }
  }));
  practice.push(mk({
    t: 'AMAT for Two Designs', l: 'Medium', tags: ['AMAT', 'cache design'], co: ['Qualcomm', 'Arm'],
    s: `<p>Design A: L1 32 KB, hit 1 cycle, miss rate 6%. Design B: L1 64 KB, hit 2 cycles, miss rate 4%. Both have L2 hit 12 cycles, L2 local miss rate 25%, DRAM 200 cycles. Which has the lower AMAT? At what L1 miss rate would B tie A?</p>`,
    ex: `<p>AMAT = L1 hit + L1 miss × (L2 hit + L2 miss × DRAM).</p>`,
    b: `<p>Picking B because "bigger cache, fewer misses" without computing ignores its slower hit time, which every access pays.</p>`,
    q: 'Which term does every memory access pay?', o: ['DRAM latency', 'L2 hit time', 'L1 hit time', 'miss penalty'], a: 2, e: 'All accesses check L1 first.',
    h: ['Compute the L1 miss penalty once: 12 + 0.25 × 200.', 'Plug each design into AMAT = hit + miss rate × penalty.', 'For the tie, set 2 + m × penalty equal to A\'s AMAT and solve for m.'],
    ap: `<p>L1 miss penalty = 12 + 0.25 × 200 = 62 cycles. A: 1 + 0.06 × 62 = <b>4.72</b>. B: 2 + 0.04 × 62 = <b>4.48</b>. B wins slightly. Tie: 2 + m × 62 = 4.72 → m = 2.72 / 62 ≈ <b>4.39%</b>. If B's miss rate were above 4.39%, the extra hit cycle would make it worse. Real designs also weigh clock frequency (a bigger L1 may lengthen the cycle) and out-of-order overlap, which hides some L1 latency but rarely DRAM latency.</p>`,
    cx: '<p>O(levels): one product per memory level.</p>'
  }));
  practice.push(mk({
    t: 'Loop Order for Matrix Multiply', l: 'Medium', tags: ['locality', 'cache', 'matrix'], co: ['Google', 'Jane Street'],
    s: `<p>C = A × B for N × N double matrices in row-major order, N = 1024. Compare the loop orders i-j-k and i-k-j: describe the access pattern of each matrix in the innermost loop and estimate which is faster and why. Then describe blocking.</p>`,
    ex: `<p>i-j-k inner loop: C[i][j] += A[i][k] * B[k][j] with k varying.</p>`,
    b: `<p>Saying "both are O(N³) so they are equally fast" ignores that one strides through B column-wise with a cache miss per element.</p>`,
    q: 'In i-j-k, the inner loop accesses B with stride…', o: ['8 bytes', '64 bytes', 'N × 8 bytes', '0'], a: 2, e: 'k moves down a column of B: one full row (8 KB) per step.',
    h: ['For the innermost index, ask which of A, B, C changes address and by how much.', 'Row-major: moving along j is contiguous; moving along k in B[k][j] jumps a whole row.', 'Blocking: work on tiles small enough that three tiles fit in L1/L2 so each loaded line is reused many times.'],
    ap: `<p><b>i-j-k</b>: inner loop over k reads A[i][k] (contiguous, good), B[k][j] (stride 8 KB: new line every iteration, and N = 1024 → power-of-two stride hits the same few sets, conflict misses), C[i][j] constant (register). Roughly 1 miss per inner iteration on B. <b>i-k-j</b>: inner loop over j: A[i][k] constant (register), B[k][j] contiguous, C[i][j] contiguous: 1 miss per 8 doubles for both, and the loop auto-vectorises. Typically 3 to 10× faster. <b>Blocking</b>: split into T × T tiles (e.g. T = 64 → 32 KB per tile) and multiply tile by tile so the working set (3 tiles) stays in L2; each element loaded is reused T times. Libraries (OpenBLAS, MKL) add register blocking and SIMD and reach 80 to 90% of peak FLOPs; naive code gets 1 to 5%.</p>`,
    cx: '<p>All variants O(N³) operations; cache misses drop from ~N³ to ~N³/8 (i-k-j) and ~N³/(8T) with blocking.</p>',
    code: `void matmul_ikj(int n, const double* A, const double* B, double* C) {
    for (int i = 0; i < n; i++)
        for (int k = 0; k < n; k++) {
            double a = A[i * n + k];                    // reused across the whole inner loop
            for (int j = 0; j < n; j++)
                C[i * n + j] += a * B[k * n + j];       // both contiguous: vectorises
        }
}`
  }));
  practice.push(mk({
    t: 'Branchy Filter on Random Data', l: 'Medium', tags: ['branch prediction', 'branchless'], co: ['Microsoft', 'HRT'],
    s: `<p>A loop over 10<sup>8</sup> random bytes does <code>if (x &lt; 128) count++;</code>. Baseline CPI without mispredictions is 0.5 with 4 instructions per iteration; branch penalty 16 cycles; clock 4 GHz. Estimate runtime on random data versus sorted data, and propose two fixes that do not sort.</p>`,
    ex: `<p>Random data: the branch is wrong about half the time.</p>`,
    b: `<p>Sorting the array first costs O(N log N), far more than the loop itself, unless the data is reused many times.</p>`,
    q: 'A random 50/50 branch is mispredicted about…', o: ['1%', '10%', '50%', '100%'], a: 2, e: 'No pattern to learn.',
    h: ['Base cycles = iterations × instructions × CPI.', 'Mispredict cycles = iterations × miss rate × penalty; compare 50% with near 0%.', 'Make the condition data, not control: count += (x < 128), or let SIMD compare 32 bytes at once.'],
    ap: `<p>Base: 10<sup>8</sup> × 4 × 0.5 = 2×10<sup>8</sup> cycles = 50 ms. Random: + 10<sup>8</sup> × 0.5 × 16 = 8×10<sup>8</sup> cycles = 200 ms, total ≈ <b>250 ms</b>. Sorted: almost no misses ≈ <b>50 ms</b>, 5× faster. Fixes: (1) branchless <code>count += (x &lt; 128);</code> (compiles to setcc/adc, no prediction needed) ≈ 50 ms; (2) SIMD: compare 32 bytes per AVX2 instruction, mask, popcount or subtract the mask: ~10× faster still, then memory bandwidth (100 MB at ~20 GB/s ≈ 5 ms) becomes the limit. Compilers at -O2/-O3 often do (1) or (2) automatically: inspect the assembly before hand-tuning.</p>`,
    cx: '<p>O(N) in all versions; constants differ by 5 to 50×.</p>',
    code: `#include <cstddef>
#include <cstdint>
long count_small(const uint8_t* a, size_t n) {
    long c = 0;
    for (size_t i = 0; i < n; i++) c += (a[i] < 128);   // no branch: compare result is 0 or 1
    return c;
}`
  }));
  practice.push(mk({
    t: 'Read a Binary Record', l: 'Medium', tags: ['endianness', 'alignment', 'two\'s complement'], co: ['Cloudflare', 'Stripe'],
    s: `<p>A file record is 7 bytes, big-endian: int16 temperature (tenths of °C), uint32 timestamp, uint8 flags. Bytes: <code>FF 38 65 4F 1A 80 05</code>. (a) Decode all fields. (b) Why is <code>*(int16_t*)p</code> on x86 wrong here? (c) Why should you not declare <code>struct { int16_t t; uint32_t ts; uint8_t f; }</code> and fread into it?</p>`,
    ex: `<p>FF 38 as big-endian int16 = 0xFF38.</p>`,
    b: `<p>Reading the raw bytes into a native struct gets the wrong byte order and the wrong offsets due to padding.</p>`,
    q: 'sizeof(struct{int16_t; uint32_t; uint8_t;}) on x86-64 is…', o: ['7', '8', '12', '16'], a: 2, e: '2 + 2 pad + 4 + 1 + 3 pad = 12.',
    h: ['Combine bytes most-significant first, then interpret the 16-bit value as two\'s complement.', 'x86 is little-endian; also casting an unaligned byte pointer is undefined behaviour in C++.', 'Compiler padding puts ts at offset 4 and makes the struct 12 bytes, not 7.'],
    ap: `<p>(a) Temperature: 0xFF38 = 65336 unsigned → 65336 − 65536 = −200 → <b>−20.0 °C</b>. Timestamp: 0x654F1A80 = <b>1699682944</b> (a Unix time in November 2023). Flags: <b>0x05</b> (bits 0 and 2). (b) x86 would read FF 38 as 0x38FF (little-endian), and the pointer cast violates alignment and strict-aliasing rules. Use shifts: <code>int16_t(uint16_t(p[0]) &lt;&lt; 8 | p[1])</code>. (c) Padding: the struct is 12 bytes with ts at offset 4, so fields land in the wrong places, and its byte order is native. Parse byte by byte (or use a serialization format) and treat structs as in-memory types only.</p>`,
    cx: '<p>O(record size): one pass over 7 bytes.</p>',
    code: `#include <cstdint>
struct Rec { int16_t temp; uint32_t ts; uint8_t flags; };
Rec parse(const unsigned char* p) {
    Rec r;
    r.temp  = static_cast<int16_t>((uint16_t(p[0]) << 8) | p[1]);
    r.ts    = (uint32_t(p[2]) << 24) | (uint32_t(p[3]) << 16) | (uint32_t(p[4]) << 8) | p[5];
    r.flags = p[6];
    return r;
}`
  }));
  practice.push(mk({
    t: 'The Counter That Will Not Scale', l: 'Hard', tags: ['false sharing', 'coherence', 'scalability'], co: ['Meta', 'Netflix', 'Google'],
    s: `<p>A metrics library keeps <code>struct Metric { std::atomic&lt;long&gt; count; std::atomic&lt;long&gt; sum; };</code> in a dense array of 64 metrics. 32 threads update random metrics on every request. Throughput falls as threads increase. Diagnose both true and false sharing, give measurements to confirm, and design a scalable replacement with its read-side trade-off.</p>`,
    ex: `<p>Each Metric is 16 bytes, so 4 metrics share a line.</p>`,
    b: `<p>Padding each Metric to 64 bytes fixes false sharing between neighbours, but threads hitting the <i>same</i> popular metric still serialise on its line (true sharing).</p>`,
    q: 'Which structure removes true sharing on a hot counter?', o: ['A mutex', 'Per-thread or per-core shards summed on read', 'A bigger cache', 'volatile'], a: 1, e: 'Writers touch private lines; the rare reader sums.',
    h: ['Count how many Metric objects share one 64-byte line and consider both "different metric, same line" and "same metric" cases.', 'perf c2c reports HITM lines and offsets; compare scaling with 1, 2, 4… threads.', 'Shard per thread/core with each shard on its own line, combine on read; discuss memory cost and read latency.'],
    ap: `<p><b>Diagnosis</b>. Each Metric is 16 bytes, so 4 metrics share a 64-byte line: updating metric 0 and metric 1 from different cores ping-pongs the line (<b>false sharing</b>). Popular metrics (e.g. "requests_total") are written by every thread: the line bounces even when padded (<b>true sharing</b>), and each atomic RMW must own the line exclusively, so updates serialise at roughly one per cross-core transfer (~50 to 100 ns): a hard cap of ~10 to 20M updates/s total, regardless of cores. <b>Confirm</b>: <code>perf c2c record/report</code> shows HITM-heavy lines at Metric array addresses with several offsets (false) or one offset (true); scaling curve flattens or drops; IPC low with no lock contention. <b>Design</b>: per-thread (or per-CPU) shards: <code>struct alignas(64) Shard { long count[64]; long sum[64]; }</code> one per thread, each thread writes only its shard with plain or relaxed operations; readers (scrapes every few seconds) sum across shards. Writes become L1 hits; throughput scales linearly. Trade-offs: memory = threads × metrics × 16 B (32 × 64 × 16 = 32 KB, fine); reads are O(threads) and slightly stale or non-atomic snapshot across shards (acceptable for metrics); handle thread exit by folding shard into a global. This is what Java LongAdder, Linux per-CPU counters and Prometheus client libraries do.</p>`,
    cx: '<p>Writes O(1) L1-local; reads O(threads × metrics).</p>',
    f: ['How does Java LongAdder decide when to add cells?', 'How do per-CPU counters in the Linux kernel handle preemption?']
  }));
  practice.push(mk({
    t: 'Explain Spectre v1 to an Engineer', l: 'Hard', tags: ['speculative execution', 'security', 'caches'], co: ['Google', 'Microsoft', 'Apple'],
    s: `<p>Given <code>if (x &lt; len) { y = probe[secret_array[x] * 4096]; }</code>, explain step by step how an attacker can learn bytes outside <code>secret_array</code> without the program ever architecturally reading them. Then list mitigations at the code, compiler, OS and hardware levels and their costs.</p>`,
    ex: `<p>Three ingredients: branch predictor training, speculative execution, and a cache timing side channel.</p>`,
    b: `<p>"The bounds check prevents it" misses that the check is predicted, not waited for.</p>`,
    q: 'What survives a mispredicted speculative path?', o: ['Register values', 'Cache state changes', 'Memory writes', 'Exceptions'], a: 1, e: 'Architectural results are discarded, microarchitectural cache state is not.',
    h: ['First the attacker calls the code many times with valid x so the branch is predicted taken.', 'Then with a malicious x the CPU speculatively loads the secret byte and uses it as an index, bringing one line of probe into cache.', 'Flush+Reload: time access to each of the 256 probe lines; the fast one reveals the byte. Mitigations: index masking, lfence, site isolation, hardware changes.'],
    ap: `<p><b>Attack</b>: (1) Train: call with in-bounds x repeatedly so the predictor learns "taken". (2) Prepare: flush all 256 lines probe[k × 4096] from the cache (clflush or eviction) and make <code>len</code> uncached so the check resolves slowly. (3) Attack: call with x = (target address − secret_array). The CPU predicts taken and speculatively loads secret_array[x] (the secret byte s), then loads probe[s × 4096], bringing that line into cache. (4) The check resolves, the speculation is squashed: no register or memory change, but the cache line stays. (5) Measure: time loads of probe[k × 4096] for k = 0..255; the fast one gives s. The 4096 stride puts each value on its own page to defeat prefetchers. <b>Mitigations</b>: code: index masking (<code>x &amp;= mask</code> computed branch-free, Linux <code>array_index_nospec</code>), <code>lfence</code> after bounds checks (serialises, costly in hot paths); compiler: speculative load hardening (LLVM SLH, 10 to 40% overhead), retpolines for indirect branches (v2); OS: KPTI for Meltdown, IBRS/IBPB/STIBP microcode, flushing predictors on context switch; browsers: site isolation, coarse timers, disabled SharedArrayBuffer without cross-origin isolation; hardware: newer CPUs with in-silicon fixes for Meltdown/some variants, but Spectre v1 remains a software problem by design.</p>`,
    cx: '<p>Leaks roughly bytes per second to KB/s depending on noise.</p>',
    f: ['Why does Meltdown need KPTI but Spectre v1 does not?', 'Why did browsers reduce timer precision?']
  }));
  practice.push(mk({
    t: 'Speed Up a Hot Loop End to End', l: 'Hard', tags: ['performance', 'SIMD', 'cache', 'branches'], co: ['Jane Street', 'Citadel', 'NVIDIA'],
    s: `<p>A pricing service runs this over 50M orders per batch:<br><code>struct Order { std::string sym; double px; int qty; bool buy; char pad[100]; }; std::vector&lt;Order*&gt; v;</code><br><code>for (auto* o : v) if (o-&gt;buy) total += o-&gt;px * o-&gt;qty;</code><br>It takes 900 ms. Using this module's ideas, list the bottlenecks in priority order, the fix for each and an estimated effect, and how you would verify.</p>`,
    ex: `<p>Each order is ~150 bytes allocated separately, accessed through a pointer, with a random 50/50 branch.</p>`,
    b: `<p>Reaching for multithreading first multiplies a memory-latency-bound loop and leaves 10× on the table per core.</p>`,
    q: 'The biggest single cost here is most likely…', o: ['the floating-point multiply', 'pointer chasing to scattered heap objects', 'the loop counter', 'std::string constructor'], a: 1, e: 'Each order is a likely cache miss with little prefetching help.',
    h: ['Look at memory first: pointer indirection, object size versus the bytes actually used per iteration.', 'Then the branch on random data, then the floating-point dependency chain on total.', 'Plan: struct-of-arrays with only px, qty, buy; branchless or masked SIMD sum; multiple accumulators; then threads. Verify with perf stat (cache-misses, branch-misses, IPC) at each step.'],
    ap: `<p><b>1. Memory layout (biggest)</b>: vector of pointers to ~150-byte heap objects means each iteration chases a pointer to a likely uncached line; only 13 of 150+ bytes are used. Fix: struct-of-arrays <code>std::vector&lt;double&gt; px; std::vector&lt;int32_t&gt; qty; std::vector&lt;uint8_t&gt; buy;</code> (13 bytes/order, sequential, prefetcher-friendly). Data drops from ~7.5 GB touched in scattered lines to 650 MB streamed: ~5 to 10× faster. <b>2. Branch</b>: random buy flag mispredicts ~50% at ~16 cycles: replace with <code>total += buy[i] ? px[i]*qty[i] : 0.0</code> written as a multiply by buy[i] or masked SIMD. <b>3. Dependency chain / SIMD</b>: one accumulator serialises FP adds (4-cycle latency); use 4 to 8 accumulators or let the compiler vectorise with AVX2 (4 doubles per op) via <code>-O3 -march=native</code> (needs reassociation permission, e.g. explicit partial sums). <b>4. Then parallelise</b> across cores with per-thread partial sums (no false sharing: separate cache lines) until memory bandwidth (~650 MB at 20 to 100 GB/s ≈ 7 to 30 ms) is the limit. Expected: 900 ms → roughly 30 to 60 ms single-threaded, ~10 ms multi-threaded. <b>Verify</b>: perf stat before/after each step (cache-misses, branch-misses, IPC), check vectorisation with -fopt-info-vec, compare result with a reference (float order changes the last bits: use a tolerance).</p>`,
    cx: '<p>O(N) throughout; constant factor improves ~20 to 90×.</p>',
    code: `#include <cstdint>
#include <vector>
double total_buys(const std::vector<double>& px, const std::vector<int32_t>& qty, const std::vector<uint8_t>& buy) {
    double s0 = 0, s1 = 0, s2 = 0, s3 = 0;      // 4 independent accumulators
    size_t n = px.size(), i = 0;
    for (; i + 4 <= n; i += 4) {
        s0 += buy[i]     * px[i]     * qty[i];      // branchless: buy is 0 or 1
        s1 += buy[i + 1] * px[i + 1] * qty[i + 1];
        s2 += buy[i + 2] * px[i + 2] * qty[i + 2];
        s3 += buy[i + 3] * px[i + 3] * qty[i + 3];
    }
    for (; i < n; i++) s0 += buy[i] * px[i] * qty[i];
    return (s0 + s1) + (s2 + s3);
}`,
    f: ['When would you use float instead of double here, and what is the risk?', 'How would you handle this on a GPU?']
  }));
  // ---------------- QUIZ ----------------
  quiz.push({ q: 'A 5-stage pipeline with no stalls runs 20 instructions. How many cycles?', options: ['20', '24', '25', '100'], answer: 1, explain: 'k + N − 1 = 5 + 20 − 1 = 24.' });
  quiz.push({ q: 'With full forwarding, which sequence still needs a 1-cycle stall in the classic 5-stage pipeline?', options: ['add r1 then sub using r1', 'lw r1 then add using r1', 'add r1 then sw of r1', 'two independent adds'], answer: 1, explain: 'Load data is available only after MEM, too late for the next instruction\'s EX: load-use hazard.' });
  quiz.push({ q: 'A 2-bit saturating counter in state 3 (strongly taken) sees one not-taken branch. What does it predict next?', options: ['Not taken', 'Taken', 'It resets to 0', 'Random'], answer: 1, explain: 'It drops to 2 (weakly taken), still predicting taken.' });
  quiz.push({ q: 'Typical branch misprediction penalty on a modern out-of-order core is about…', options: ['1 cycle', '3 cycles', '15-20 cycles', '1000 cycles'], answer: 2, explain: 'The front of the pipeline must be refilled from the correct path.' });
  quiz.push({ q: 'A 32 KB, 8-way cache with 64-byte lines has how many sets?', options: ['32', '64', '512', '4096'], answer: 1, explain: '32768 / 64 = 512 lines; 512 / 8 = 64 sets.' });
  quiz.push({ q: 'Two hot addresses keep evicting each other although the cache is mostly empty. This is a…', options: ['compulsory miss', 'capacity miss', 'conflict miss', 'coherence hit'], answer: 2, explain: 'They map to the same set; more associativity or padding fixes it.' });
  quiz.push({ q: 'L1 hit 1 ns, miss rate 10%, miss penalty 20 ns. AMAT?', options: ['2 ns', '3 ns', '21 ns', '1.1 ns'], answer: 1, explain: '1 + 0.1 × 20 = 3 ns.' });
  quiz.push({ q: 'Threads write different variables that sit in the same cache line. The slowdown is called…', options: ['true sharing', 'false sharing', 'aliasing', 'thrashing the TLB'], answer: 1, explain: 'The line, not the data, is shared, so it ping-pongs between cores.' });
  quiz.push({ q: 'In MESI, a core wants to write a line that is Shared in other caches. What must happen?', options: ['Nothing', 'Other copies are invalidated', 'Memory is updated first', 'The write is dropped'], answer: 1, explain: 'Writing requires exclusive ownership (M), so other copies go to I.' });
  quiz.push({ q: 'The 8-bit two\'s complement pattern 1000 0001 equals…', options: ['−1', '−127', '129', '−126'], answer: 1, explain: 'The top bit weighs −128, so −128 + 1 = −127.' });
  quiz.push({ q: 'In C++, what does the standard say about signed int overflow?', options: ['It wraps', 'It saturates', 'It is undefined behaviour', 'It throws'], answer: 2, explain: 'Signed overflow is UB; unsigned arithmetic wraps modulo 2^n.' });
  quiz.push({ q: 'The float32 exponent field stores 130. The unbiased exponent is…', options: ['130', '3', '−3', '2'], answer: 1, explain: 'Subtract the bias: 130 − 127 = 3.' });
  quiz.push({ q: 'Which value is exactly representable as a double?', options: ['0.1', '0.3', '0.625', '1/3'], answer: 2, explain: '0.625 = 0.101 in binary, a finite sum of powers of two.' });
  quiz.push({ q: 'On a little-endian machine, 0x0A0B0C0D is stored at address 0..3 as…', options: ['0A 0B 0C 0D', '0D 0C 0B 0A', '0B 0A 0D 0C', '0C 0D 0A 0B'], answer: 1, explain: 'Least significant byte first.' });
  quiz.push({ q: 'An AVX2 register can add how many 32-bit floats in one instruction?', options: ['2', '4', '8', '16'], answer: 2, explain: '256 bits / 32 bits = 8 lanes.' });

  // ---------------- INTERVIEW ----------------
  interview.push({ q: 'What happens, at the CPU level, when your program executes <code>x = a + b</code>?', level: 'B', a: `<p>The compiler turned the line into a few machine instructions: load a and b into registers (unless they are already there), add them in the ALU, store the result to x (or keep it in a register). The CPU fetches each instruction at the program counter from the instruction cache, decodes it into micro-ops, reads source registers, executes, accesses memory through the data cache for loads/stores, and writes the result back. On a modern core many such instructions are in flight at once (pipelining, superscalar, out-of-order), so the cost of the line depends mostly on whether a and b are in L1 (≈1 ns) or must come from DRAM (≈100 ns).</p>`, followUps: ['What is the program counter?', 'What is the difference between CPI and IPC?'] });
  interview.push({ q: 'Explain pipelining and the three kinds of hazards.', level: 'B', a: `<p>Pipelining splits instruction execution into stages (classically IF, ID, EX, MEM, WB) and overlaps different instructions in different stages, so ideally one instruction completes per cycle; latency per instruction is unchanged, throughput rises. Hazards break this: <b>structural</b> (two instructions need the same unit, solved by duplicating resources, e.g. split I/D caches), <b>data</b> (an instruction needs a result not yet written; solved by forwarding, plus a one-cycle stall for load-use, and compiler scheduling), <b>control</b> (the next PC is unknown after a branch; solved by branch prediction and speculative execution with a flush on misprediction).</p>`, followUps: ['Why does a load-use hazard still stall with forwarding?', 'What are WAR and WAW hazards and how does renaming remove them?'] });
  interview.push({ q: 'Why is processing a sorted array faster than an unsorted one in the classic branch example?', level: 'I', a: `<p>The loop has a data-dependent branch like <code>if (a[i] &gt;= 128)</code>. On random data the outcome is unpredictable, so the branch predictor is wrong about half the time, and each misprediction flushes the pipeline (about 15 to 20 cycles). After sorting, the outcomes are a long run of not-taken followed by a long run of taken, which the predictor gets right almost always. The arithmetic is identical; only mispredictions differ. Fixes without sorting: branchless code (<code>sum += x &amp; -(x &gt;= 128)</code>, cmov), or SIMD compares with masks. Modern compilers at -O3 may already do this, so the effect can vanish; check the assembly and perf branch-misses.</p>`, followUps: ['When is branchless code slower than a branch?', 'How do modern predictors like TAGE work at a high level?'] });
  interview.push({ q: 'Describe the memory hierarchy and give approximate latencies.', level: 'B', a: `<p>Registers (sub-ns), L1 data cache 32 to 64 KB per core (~1 ns, 4 to 5 cycles), L2 0.5 to 2 MB per core (~3 to 4 ns), shared L3 several MB to 100+ MB (~10 to 15 ns), DRAM GBs (~80 to 100 ns, ~300 cycles), NVMe SSD (~20 to 100 µs), network round trip in a data centre (~0.5 ms), disk seek (~5 to 10 ms). Each level is bigger, slower and cheaper per byte. Data moves between levels in cache lines of 64 bytes. Programs are fast when their working set fits in the near levels and accesses have temporal and spatial locality.</p>`, followUps: ['Why are caches organised in lines rather than bytes?', 'What is the TLB and why do huge pages help?'] });
  interview.push({ q: 'Explain direct-mapped, set-associative and fully associative caches. How is an address split?', level: 'I', a: `<p>An address splits into tag | index | offset. Offset bits (log₂ line size) pick the byte in the line; index bits (log₂ number of sets) pick the set; the tag identifies which memory line is cached. Direct-mapped: each set has one way, so a line has exactly one place: simple and fast but prone to conflict misses when two hot lines share an index. N-way set-associative: N candidate slots per set, compared in parallel, replacement by (pseudo-)LRU; fewer conflict misses at the cost of more comparators and power. Fully associative: one set, any slot, used for small structures like TLBs. Example: 32 KB, 8-way, 64 B lines → 64 sets, 6 offset bits, 6 index bits.</p>`, followUps: ['Why are L1 caches often VIPT (virtually indexed, physically tagged)?', 'What are the 3 Cs of cache misses?'] });
  interview.push({ q: 'What is false sharing? How do you detect and fix it?', level: 'I', a: `<p>False sharing happens when threads on different cores write different variables that live in the same cache line. Coherence works per line, so each write invalidates the other cores' copies and the line ping-pongs across the chip, turning ~1 ns L1 writes into ~50 to 100 ns transfers. Symptoms: poor or negative scaling with more threads, low IPC, no lock contention. Detect with <code>perf c2c</code> (HITM lines and offsets) or VTune. Fix: pad/align hot per-thread data to separate lines (<code>alignas(64)</code>, <code>std::hardware_destructive_interference_size</code>, Java <code>@Contended</code>), keep accumulators in local variables and publish once, or restructure into per-thread shards.</p>`, followUps: ['How is this different from true sharing?', 'Why do some libraries pad to 128 bytes?'] });
  interview.push({ q: 'How does cache coherence (MESI) work at a high level?', level: 'A', a: `<p>Each cache line in each private cache has a state: Modified (only copy, dirty), Exclusive (only copy, clean), Shared (clean, maybe in other caches), Invalid. Reads of a line not present fetch it as E if nobody else has it, S otherwise. Writes require M: the core sends an invalidation (read-for-ownership) so all other copies become I; a later read by another core forces the owner to supply the dirty data and downgrade to S. Implementations use snooping on a bus/ring or directories (in the L3 or a snoop filter) for many cores. Variants MOESI (Owned: share dirty data without writing back) and MESIF (Forward) reduce traffic. Coherence guarantees a single value per location; memory ordering across locations is a separate topic (memory models, fences).</p>`, followUps: ['How does coherence differ from consistency?', 'Why do atomics on a contended line scale poorly?'] });
  interview.push({ q: 'Why is <code>abs(INT_MIN)</code> a bug, and what other two\'s complement pitfalls do you watch for?', level: 'I', a: `<p>Two's complement n-bit range is −2<sup>n−1</sup> to 2<sup>n−1</sup> − 1, asymmetric, so −INT_MIN (2,147,483,648) is not representable: it overflows, which is undefined behaviour in C/C++ and in Java wraps back to INT_MIN (still negative). Other pitfalls: <code>(lo + hi) / 2</code> overflowing in binary search (use lo + (hi − lo) / 2); summing many ints into an int; signed/unsigned comparisons (−1 &lt; 10u is false); <code>size() - 1</code> on an empty container; shifts by ≥ width (UB); right shift of negative numbers rounding toward −∞ while division truncates toward zero; narrowing conversions silently truncating.</p>`, followUps: ['How would you detect overflow before it happens?', 'Why can the compiler delete <code>if (x + 1 &lt; x)</code>?'] });
  interview.push({ q: 'Explain the IEEE 754 format and why 0.1 + 0.2 != 0.3.', level: 'B', a: `<p>A double stores sign (1 bit), exponent (11 bits, bias 1023) and fraction (52 bits); value = (−1)<sup>s</sup> × 1.f × 2<sup>e−1023</sup> for normal numbers, with special patterns for zero, subnormals, infinity and NaN. Only numbers that are finite sums of powers of two within 53 significant bits are exact. 0.1 and 0.2 have infinite binary expansions, so they are rounded to the nearest double; the rounded sum is 0.30000000000000004, while 0.3 rounds to 0.299999999999999989. Compare with a relative tolerance, use integers or decimal types for money, and remember float addition is not associative.</p>`, followUps: ['What is an ulp?', 'Why does bf16 keep 8 exponent bits?'] });
  interview.push({ q: 'What is endianness and where has it bitten you or could it bite you?', level: 'I', a: `<p>Endianness is the byte order of multi-byte values in memory: little-endian (x86, ARM in practice, RISC-V) stores the least significant byte at the lowest address; big-endian stores the most significant first, which is "network byte order" used by IP/TCP headers and many file formats. It matters only at byte boundaries: sending raw structs over a network, reading binary files, hashing or checksumming memory, memcpy-ing bytes into integers, and cross-platform serialization. Fix: explicit conversions (htonl/ntohl, std::byteswap) or parse with shifts byte by byte, and prefer well-defined serialization formats (protobuf varints are little-endian by spec).</p>`, followUps: ['Why is <code>*(uint32_t*)buf</code> dangerous beyond endianness?', 'How do you detect endianness at compile time in C++20?'] });
  interview.push({ q: 'What is SIMD and what prevents a compiler from auto-vectorising a loop?', level: 'A', a: `<p>SIMD executes one instruction on several data elements packed in a wide register: SSE/NEON 128-bit (4 floats), AVX2 256-bit (8), AVX-512 512-bit (16), ARM SVE scalable. Compilers auto-vectorise loops at -O2/-O3 when iterations are independent and memory is contiguous. Blockers: possible pointer aliasing between inputs and outputs (fix with <code>__restrict</code>), loop-carried dependencies, non-inlined calls, complex branches (sometimes turned into masks), non-unit or indirect strides (gathers are slow), unknown trip counts with early exits, and floating-point reductions that need reassociation (allowed only with fast-math or explicit partial sums). Check with -fopt-info-vec-missed or -Rpass-missed and inspect the assembly.</p>`, followUps: ['When is a loop memory-bound so SIMD does not help?', 'How do GPUs relate to SIMD?'] });
  interview.push({ q: 'Two implementations have the same Big-O but one is 10× faster. Name the hardware reasons.', level: 'A', a: `<p>Big-O counts operations, not their cost. Typical hardware reasons: (1) <b>cache behaviour</b>: contiguous arrays versus pointer-chasing nodes; an L1 hit is ~1 ns, DRAM ~100 ns, and dependent misses cannot overlap; (2) <b>prefetching</b>: sequential and strided scans are prefetched, random access is not; (3) <b>branch mispredictions</b> on data-dependent branches (~15 to 20 cycles each); (4) <b>SIMD</b>: one version vectorises (4 to 16× more work per instruction); (5) <b>instruction-level parallelism</b>: dependency chains versus independent work; (6) <b>TLB misses</b> with huge sparse working sets; (7) <b>false sharing</b> or contended atomics in multithreaded code; (8) allocation and indirection costs. Diagnose with perf stat (IPC, cache-misses, branch-misses) and a profiler before optimising.</p>`, followUps: ['Why is a linked list traversal slow even if each node is small?', 'What is the roofline model?'] });
  interview.push({ q: 'How do speculative execution vulnerabilities like Spectre and Meltdown work, and what did they cost?', level: 'E', a: `<p>CPUs execute past unresolved branches and permission checks, discarding architectural results on misprediction, but microarchitectural effects such as cache fills remain. Spectre v1: train a bounds-check branch, then speculatively read out of bounds and encode the secret byte as which cache line of a probe array gets loaded; recover it with a Flush+Reload timing measurement. Spectre v2 poisons indirect branch predictors. Meltdown let user code speculatively read kernel memory because the permission fault was raised late. Mitigations: KPTI (separate kernel page tables, costing syscall-heavy workloads 5 to 30% on older chips), retpolines/IBRS/IBPB for indirect branches, index masking and lfence for v1, browser site isolation and coarser timers, and hardware fixes in newer CPUs. The lasting lesson: performance tricks that are invisible to the ISA can still leak information.</p>`, followUps: ['Why is Spectre v1 hard to fix in hardware?', 'What is a constant-time implementation?'] });
  registerModule({
    langExplain: `<p><b>About the code here.</b> Real hardware is best shown in C++ (close to the machine: raw bits, struct layout, intrinsics, threads), so the reference programs are C++. The small simulators (cache with hit/miss counting, two's complement and IEEE 754 decoders, the 5-stage pipeline tracer, branch predictors, the false-sharing model) are JavaScript so you can run them in the page. You do not need to write C++ or JS to follow the lessons: the same ideas apply in every language (Java <code>@Contended</code> and <code>Float.floatToIntBits</code>, Python <code>struct</code> for byte order, Go <code>encoding/binary</code>, Rust <code>to_be_bytes</code>).</p>`,
    id: 'cs15',
    title: 'Computer Architecture Essentials',
    intro: `<p>Interviewers love asking "why is this code faster than that one when the Big-O is the same?". The answer is always the hardware. This module explains how a CPU really runs your code: instructions and the fetch-decode-execute cycle, pipelining and its hazards, branch prediction and speculation (and how Spectre abused it), the memory hierarchy and caches (lines, sets, associativity, AMAT), locality, coherence and false sharing, how integers (two's complement) and floats (IEEE 754) are stored, endianness and alignment, and SIMD. Every topic has small numbers you can work by hand and a simulator you can run.</p>`,
    goals: ['Use the performance equation (instructions × CPI × cycle time) and read IPC from perf', 'Draw a 5-stage pipeline diagram and count stalls with and without forwarding', 'Simulate 1-bit and 2-bit branch predictors and explain the sorted-array effect and Spectre', 'Split an address into tag/index/offset, trace a cache by hand and compute AMAT', 'Spot and fix false sharing and cache-unfriendly loops', 'Encode and decode two\'s complement integers and IEEE 754 floats, and explain overflow and rounding bugs', 'Handle endianness and struct padding in binary data, and explain when SIMD helps'],
    prereqs: `CS Core module "What an Operating System Does" (kernel/user mode, processes). Comfort with binary and hex helps; the integer topic reviews it. Reading C++ or JavaScript is enough for the code samples.`,
    hours: 12,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
