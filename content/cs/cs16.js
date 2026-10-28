(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // compact problem builder (cs track: code optional, solution.approach is a full written answer)
  function mk(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co || undefined,
      statement: o.s, constraints: o.c || 'Reason with small numbers and explicit event orderings. Show your working step by step.',
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
  function hlRow(i, cls) { var h = {}; h[i] = cls || 'cur'; return h; }

  // ---------------------------------------------------------------- Topic 1
  topics.push({
    title: 'Why Distributed Systems Are Hard: Partial Failure & Failure Models',
    analogy: `<p>Imagine texting a friend "meet at 7?" and getting no reply. Did the message never arrive? Did they read it and their reply got lost? Is their phone dead? Are they just slow? <b>From your side, all four look exactly the same: silence.</b> That is the daily life of every computer in a distributed system.</p>`,
    explain: `<p>A <b>distributed system</b> is several computers that talk only by sending messages over a network and try to act like one system. Three things make this hard, and every later topic is a response to them:</p>
      <ul>
        <li><b>Partial failure.</b> On one machine, things mostly work or crash entirely. Across machines, one node can be dead while others run, or a link can drop messages while both ends are fine. You must keep going with some parts broken.</li>
        <li><b>Unreliable network.</b> Messages can be lost, delayed for a long time, duplicated or reordered. If you get no reply, you <b>cannot tell</b> whether the request was lost, the server crashed before doing it, crashed after doing it, or the reply was lost.</li>
        <li><b>No shared clock.</b> Every machine has its own clock that drifts. You cannot reliably say "event A at 10:00:00.001 happened before event B at 10:00:00.002" if they were on different machines.</li>
      </ul>
      <p>To reason clearly we pick a <b>failure model</b> (what can go wrong to a node) and a <b>timing model</b> (how slow things can be):</p>
      ${H.table(['Failure model', 'What a faulty node may do', 'Example'], [['Crash-stop', 'Stops forever; never comes back', 'Textbook model; easy to reason about'], ['Crash-recovery', 'Stops, later restarts with only what it saved to disk', 'Real servers after reboot'], ['Omission', 'Drops some messages it should send or receive', 'Full queues, flaky NIC'], ['Byzantine', 'Anything: lies, sends conflicting messages', 'Bugs, hacked nodes, blockchains']])}
      <p>Timing models: <b>synchronous</b> (known upper bounds on message delay and processing), <b>asynchronous</b> (no bounds at all), and <b>partially synchronous</b> (bounds hold "eventually", most of the time). Real data centres are partially synchronous: usually fast, sometimes a 30-second GC pause.</p>
      <p>The consequence you must say in interviews: <b>a timeout does not tell you a node is dead</b>. It only tells you that you have not heard from it yet.</p>`,
    clues: ['"what happens if the request times out?"', '"the node might be slow or dead"', '"network partition" / "split brain"', '"how would you detect a failed node?"', '"Byzantine" / "untrusted participants"', '"we got no response from the payment service"'],
    viz: {
      title: 'Four failures that all look like silence',
      input: 'request lost, server crashed before, server crashed after, reply lost, slow',
      inputLabel: 'Scenarios (comma separated): request lost, server crashed before, server crashed after, reply lost, slow',
      gen: function (input) {
        var list = String(input).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
        if (!list.length) throw new Error('Type scenarios separated by commas, e.g. request lost, reply lost');
        if (list.length > 6) throw new Error('Use at most 6 scenarios');
        var nodes = [{ id: 'C', label: 'Client', x: 10, y: 30, shape: 'box' }, { id: 'N', label: 'Network', x: 50, y: 30, shape: 'box' }, { id: 'S', label: 'Server', x: 90, y: 30, shape: 'box' }];
        var frames = [{ narr: 'A client sends a request to a server through the network and waits for a reply. Watch what the <b>client</b> can observe in each scenario.', parts: [{ type: 'graph', label: 'Setup', nodes: nodes, edges: [['C', 'N'], ['N', 'S']], height: 60 }] }];
        var rows = [];
        list.forEach(function (sc) {
          var did = '?', hl = {}, ehl = {};
          if (sc.indexOf('request') >= 0) { did = 'No'; hl.N = 'bad'; ehl['C-N'] = 'ok'; ehl['N-S'] = 'bad'; }
          else if (sc.indexOf('before') >= 0) { did = 'No'; hl.S = 'bad'; ehl['C-N'] = 'ok'; ehl['N-S'] = 'ok'; }
          else if (sc.indexOf('after') >= 0) { did = 'Yes'; hl.S = 'bad'; ehl['C-N'] = 'ok'; ehl['N-S'] = 'ok'; }
          else if (sc.indexOf('reply') >= 0) { did = 'Yes'; hl.N = 'bad'; ehl['C-N'] = 'ok'; ehl['N-S'] = 'ok'; }
          else if (sc.indexOf('slow') >= 0) { did = 'Later'; hl.S = 'cur'; ehl['C-N'] = 'ok'; ehl['N-S'] = 'cur'; }
          else { did = 'Unknown'; hl.N = 'cur'; }
          rows.push([sc, did, 'Timeout (silence)']);
          frames.push({ narr: 'Scenario <b>' + H.esc(sc) + '</b>: did the server apply the request? <b>' + did + '</b>. But the client only sees a timeout, the same as every other row.', parts: [
            { type: 'graph', label: sc, nodes: nodes, edges: [['C', 'N'], ['N', 'S']], hl: hl, ehl: ehl, height: 60 },
            { type: 'table', label: 'Server reality vs client view', columns: ['Scenario', 'Applied?', 'Client sees'], rows: rows.map(function (r) { return r.slice(); }), hl: hlRow(rows.length - 1) }
          ] });
        });
        frames.push({ narr: '<b>Lesson:</b> the client column is identical. So a retry may run the operation twice (fix: idempotency), and a timeout cannot prove a crash (fix: leases, fencing, consensus).', parts: [{ type: 'table', label: 'Same observation, different truths', columns: ['Scenario', 'Applied?', 'Client sees'], rows: rows, hl: {} }] });
        return frames;
      }
    },
    examples: [
      { title: 'Two Generals: why "certain agreement" over a lossy link is impossible', html: `<p>General A sends "attack at dawn". To be sure B got it, B must ACK. But then B is unsure A got the ACK, so A must ACK the ACK... No finite number of messages makes both sides certain, because the <b>last</b> message could always be lost. Real systems accept this and design for "probably delivered + safe retries" instead of certainty.</p>` },
      { title: 'Crash-recovery: what survives a reboot', html: `<p>A Raft node votes for candidate X in term 5, then reboots. If it did not <b>fsync</b> its vote to disk, after restart it could vote for Y in term 5 too, and two leaders could be elected. In the crash-recovery model, <b>only state written durably counts</b>. This is why consensus systems persist <code>currentTerm</code> and <code>votedFor</code> before replying.</p>` },
      { title: 'A GC pause looks like a crash', html: `<p>A Java node pauses 20 s for garbage collection. Others time out after 10 s and declare it dead, elect a new leader, and move on. At 20 s the old node wakes up still believing it is leader and writes to storage. This "zombie leader" is the reason for <b>fencing tokens</b> (hld11). The node was never crashed, just slow, and the timeout could not tell the difference.</p>` },
      { title: 'Byzantine vs crash: counting replicas', html: `<p>To tolerate <b>f</b> crash faults with majority quorums you need <b>2f + 1</b> nodes (f = 1 → 3 nodes). To tolerate f Byzantine (lying) nodes you need <b>3f + 1</b> (f = 1 → 4 nodes). Most company-internal systems assume crash faults only; blockchains and some aerospace systems assume Byzantine.</p>` }
    ],
    deepDive: `<p><b>FLP impossibility (1985).</b> Fischer, Lynch and Paterson proved that in a fully <b>asynchronous</b> system, no deterministic algorithm can guarantee consensus terminates if even <b>one</b> process may crash. The reason: you can never distinguish a crashed node from a slow one, so an adversarial scheduler can always keep the protocol undecided. Practical consensus (Paxos, Raft) escapes by keeping <b>safety always</b> and needing <b>liveness only when the system behaves partially synchronously</b> (timeouts eventually work), or by using randomization.</p>
      <p><b>Fail-slow / gray failure.</b> In production the worst failures are partial: a disk that is 100x slower, a NIC that drops 5% of packets, a node that answers health checks but times out real requests. Health checks see "up"; users see "down". Defences: end-to-end probes from clients, latency-based outlier ejection, and comparing observations from many vantage points.</p>
      <p><b>Network partitions are real.</b> Studies of production networks (e.g., Bailis and Kingsbury's survey) show partitions from switch failures, misconfigured firewalls, and even one-way links where A can reach B but B cannot reach A. Design so a minority side stops accepting writes, or so both sides can merge later.</p>
      <p><b>Fallacies of distributed computing</b> (Deutsch): the network is reliable, latency is zero, bandwidth is infinite, the network is secure, topology does not change, there is one administrator, transport cost is zero, the network is homogeneous. Each one is a bug waiting to happen.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents are distributed systems too. An agent calls a tool over HTTP, the call times out, and the agent "helpfully" retries: two emails sent, two refunds issued. LLM API calls themselves fail partially (stream cut mid-answer, 429s, 529 overloads) and need the same retry-with-backoff + idempotency discipline.</p>
      <p><b>Use AI as a partner:</b> ask it to enumerate failure cases for a sequence diagram: <code>For each arrow in this flow, list what happens if the message is lost, duplicated or delayed 30 s</code>. It is good at producing the exhaustive list you then prune.</p>
      <p><b>Where AI goes wrong:</b> generated code often treats a timeout as "failed, safe to retry" or as "server is dead". Both are assumptions you must check.</p>
      <p><b>What you must still own:</b> choosing the failure model for your system and explaining what your design guarantees under it.</p>`,
    problems: [mk({
      t: 'Classify the Failure', l: 'Easy', tags: ['failure models', 'partial failure'], co: ['Amazon', 'Google'],
      s: `<p>Classify each as crash-stop, crash-recovery, omission or Byzantine: (1) a server loses power and is decommissioned; (2) a DB node reboots and replays its WAL; (3) a router queue overflows and drops 2% of packets; (4) a buggy replica acknowledges writes it never stored; (5) a container is OOM-killed and Kubernetes restarts it with its persistent volume.</p>`,
      ex: `<p>(2) DB reboots and replays WAL → ${H.c('g', 'crash-recovery')}: it stopped, came back, and only durable state survived.</p>`,
      b: `<p>Calling everything "the server crashed" hides what the design must handle: a recovered node may have stale state; a lying node breaks majority voting.</p>`,
      q: 'A replica that ACKs writes it never persisted is best modelled as…', o: ['Crash-stop', 'Omission', 'Byzantine', 'Synchronous'], a: 2,
      e: 'It deviates from the protocol by reporting something false: that is arbitrary (Byzantine) behaviour, even if caused by a bug rather than malice.',
      h: [`<p>Hint 1: Ask "does it come back?" and "does it lie?"</p>`, `<p>Hint 2: Losing messages while staying honest is omission.</p>`, `<p>Hint 3: Restart with disk state = crash-recovery; never returns = crash-stop.</p>`],
      ap: `<p>(1) Crash-stop: halts and never rejoins. (2) Crash-recovery: restarts with durable state (the WAL) only. (3) Omission: the router is honest but drops messages. (4) Byzantine: it sends a false acknowledgement, which breaks the assumption that ACKs mean durability; crash-tolerant protocols like Raft cannot defend against this. (5) Crash-recovery: same identity, persistent volume survives, memory does not. Interview point: the model decides the replica count (2f+1 for crash, 3f+1 for Byzantine) and what must be fsynced before replying.</p>`,
      cx: '<p>Five independent classifications; the deciding questions are "does it return?" and "is it honest?".</p>',
      d: { head: ['Case', 'Returns?', 'Honest?', 'Model'], rows: [['Power loss', 'No', 'Yes', 'Crash-stop'], ['WAL replay', 'Yes', 'Yes', 'Crash-recovery'], ['Drops 2%', 'n/a', 'Yes', 'Omission'], ['Fake ACK', 'n/a', 'No', 'Byzantine'], ['OOM + PV', 'Yes', 'Yes', 'Crash-recovery']] },
      f: ['How many nodes tolerate 2 Byzantine faults?', 'Which state must Raft persist before answering a vote?']
    })]
  });
  // ---------------------------------------------------------------- Topic 2
  topics.push({
    title: 'Physical Clocks: Drift, Skew, NTP and Why Timestamps Lie',
    analogy: `<p>Ten friends each wear a cheap wristwatch. Each watch runs a little fast or slow. Every evening they compare with the town hall clock and adjust, but by tomorrow afternoon they disagree again by a few seconds. If two friends write "I got here first" with their own watch times, you cannot trust who really did.</p>`,
    explain: `<p>Every computer has a quartz crystal clock. Two terms:</p>
      <ul>
        <li><b>Drift</b>: how fast one clock runs wrong. Typical quartz drift is about <b>10–100 ppm</b> (parts per million). 50 ppm = 50 µs per second = about <b>4.3 seconds per day</b>.</li>
        <li><b>Skew</b> (offset): the difference between two clocks right now.</li>
      </ul>
      <p><b>NTP</b> (Network Time Protocol) corrects clocks by asking a time server. The client records send time t0, server receive t1, server send t2, client receive t3. Then:</p>
      <ul><li>round-trip delay δ = (t3 − t0) − (t2 − t1)</li><li>offset θ = ((t1 − t0) + (t2 − t3)) / 2</li></ul>
      <p>This assumes the two directions take equal time. Over the internet NTP is typically good to a few <b>milliseconds</b>; in a data centre, sub-millisecond; with PTP and hardware timestamps, microseconds. But it is <b>never zero</b>, and asymmetric paths add error.</p>
      <p>Two kinds of clock APIs:</p>
      ${H.table(['Clock', 'Example API', 'Can jump backwards?', 'Use it for'], [['Wall-clock (time-of-day)', 'System.currentTimeMillis(), time.time()', 'Yes (NTP step, admin change, leap second)', 'Showing times to humans, rough timestamps'], ['Monotonic', 'System.nanoTime(), time.monotonic()', 'No', 'Measuring durations, timeouts, leases on one machine']])}
      <p>Rule: <b>never measure elapsed time with the wall clock</b>, and <b>never order events across machines with wall clocks</b> unless you know the error bound and wait it out.</p>`,
    clues: ['"last write wins" / "use the timestamp to resolve conflicts"', '"clocks are synchronized with NTP" (said as if that solves it)', '"measure a timeout or lease duration"', '"order events from different servers"', '"Spanner TrueTime" / "commit wait"', '"leap second" / "clock jumped backwards"'],
    code: { lang: 'python', run: true, title: 'NTP offset math + a last-write-wins accident caused by skew (runnable)', code: `# Part 1: NTP offset and delay from the four timestamps (all in ms)
t0, t1, t2, t3 = 1000.0, 1062.0, 1063.0, 1025.0   # client send, server recv, server send, client recv
delay = (t3 - t0) - (t2 - t1)
offset = ((t1 - t0) + (t2 - t3)) / 2
print("round-trip delay =", delay, "ms")
print("estimated offset =", offset, "ms  (server is ahead of client by this much)")

# Part 2: last-write-wins with skewed clocks silently drops the newer write.
# Node A's clock is 300 ms FAST, node B's is accurate.
skew = {"A": 300, "B": 0}
store = {}  # key -> (timestamp, value)

def write(node, real_time_ms, key, value):
    ts = real_time_ms + skew[node]         # the timestamp the node *thinks* it is
    old = store.get(key)
    if old is None or ts > old[0]:
        store[key] = (ts, value)
        print("t=%d %s writes %r with ts=%d -> accepted" % (real_time_ms, node, value, ts))
    else:
        print("t=%d %s writes %r with ts=%d -> DROPPED (stored ts=%d is 'newer')" % (real_time_ms, node, value, ts, old[0]))

write("A", 1000, "cart", "1 book")      # really first
write("B", 1200, "cart", "2 books")     # really later, but its timestamp 1200 < 1300
print("final value:", store["cart"][1], "  <- the user's latest change was lost")
` },
    viz: {
      title: 'Two drifting clocks and a periodic NTP sync',
      input: '50, -30, 4',
      inputLabel: 'driftA ppm, driftB ppm, hours between syncs',
      gen: function (input) {
        var t = String(input).split(/[\s,]+/).filter(Boolean).map(Number);
        if (t.length !== 3 || t.some(function (x) { return !isFinite(x); }) || t[2] <= 0 || t[2] > 24 || Math.abs(t[0]) > 500 || Math.abs(t[1]) > 500) throw new Error('Enter: driftA ppm, driftB ppm, hours (1-24), e.g. 50, -30, 4');
        var a = t[0], b = t[1], hrs = t[2], frames = [], rows = [];
        frames.push({ narr: 'Clock A drifts <b>' + a + ' ppm</b>, clock B <b>' + b + ' ppm</b>. 1 ppm = 1 µs gained or lost per second = 3.6 ms per hour.', parts: [{ type: 'vars', label: 'Setup', vals: { 'drift A (ppm)': a, 'drift B (ppm)': b, 'sync every (h)': hrs } }] });
        for (var h = 0; h <= hrs; h++) {
          var offA = +(a * 3.6 * h).toFixed(1), offB = +(b * 3.6 * h).toFixed(1), sk = +(offA - offB).toFixed(1);
          rows.push([h + ' h', offA + ' ms', offB + ' ms', Math.abs(sk) + ' ms']);
          frames.push({ narr: 'After <b>' + h + ' h</b> without sync, A is off by ' + offA + ' ms and B by ' + offB + ' ms, so their <b>skew is ' + Math.abs(sk) + ' ms</b>. Any event pair closer than that cannot be ordered by timestamps.', parts: [
            { type: 'table', label: 'Offsets from true time', columns: ['Elapsed', 'A offset', 'B offset', 'Skew A-B'], rows: rows.map(function (r) { return r.slice(); }), hl: hlRow(rows.length - 1) },
            { type: 'bars', label: 'Absolute skew (ms)', values: rows.map(function (r) { return parseFloat(r[3]); }), idxLabels: rows.map(function (r) { return r[0]; }), hl: hlRow(rows.length - 1, 'cur') }
          ] });
        }
        frames.push({ narr: '<b>NTP sync</b>: both clocks are pulled back near true time (error now a few ms, not zero). The clock is <b>slewed</b> (sped up/slowed) for small errors, or <b>stepped</b> (jumps, maybe backwards) for large ones. Wall-clock time can therefore go backwards; monotonic time cannot.', parts: [
          { type: 'table', label: 'After sync', columns: ['Clock', 'Offset', 'Note'], rows: [['A', '≈ ±1 ms', 'Corrected'], ['B', '≈ ±1 ms', 'Corrected'], ['Skew', '≈ 2 ms', 'Never exactly 0']], hl: { 2: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Drift arithmetic', html: `<p>Drift 20 ppm for one day: 20 µs/s × 86,400 s = <b>1.73 s</b>. Two nodes drifting +20 and −20 ppm diverge by about <b>3.5 s/day</b> without sync. With hourly NTP sync, worst case before correction is 2 × 20 × 3.6 ms = <b>144 ms</b>.</p>` },
      { title: 'NTP numbers by hand', html: `<p>t0 = 100, t1 = 160, t2 = 161, t3 = 121. Delay = (121 − 100) − (161 − 160) = <b>20 ms</b>. Offset = ((160 − 100) + (161 − 121)) / 2 = (60 + 40) / 2 = <b>50 ms</b>: the server is 50 ms ahead. The uncertainty is up to ± delay/2 = ±10 ms if paths are asymmetric.</p>` },
      { title: 'A negative duration bug', html: `<p><code>start = time.time(); do_work(); elapsed = time.time() - start</code>. NTP steps the clock back 2 s mid-way: <b>elapsed = −1.7 s</b>, and a timeout check never fires. Fix: <code>time.monotonic()</code> (Java: <code>System.nanoTime()</code>).</p>` },
      { title: 'TrueTime: making uncertainty explicit', html: `<p>Google Spanner's TrueTime returns an interval [earliest, latest] (typically a few ms wide, using GPS and atomic clocks). On commit, Spanner picks timestamp s = latest and then <b>waits until earliest &gt; s</b> ("commit wait") before making the write visible. After the wait, every later transaction anywhere gets a bigger timestamp, so timestamp order matches real-time order. Uncertainty is paid for with latency. See hld11 for the cross-shard transaction design.</p>` }
    ],
    deepDive: `<p><b>Why LWW is dangerous.</b> Last-write-wins with wall-clock timestamps (Cassandra cell timestamps, many CRDT LWW registers) silently drops writes when a "later" write carries a smaller timestamp from a slower clock. Nothing errors; data just vanishes. Mitigations: logical/hybrid clocks, conditional writes (compare-and-set), or merge-able data types.</p>
      <p><b>Hybrid Logical Clocks (HLC).</b> Used by CockroachDB, YugabyteDB, MongoDB. A timestamp is (physical part, logical counter). It stays close to wall time (useful for humans and TTLs) but never goes backwards and respects happened-before like a Lamport clock. CockroachDB also bounds max clock offset (default 500 ms) and a node that detects a larger offset shuts itself down rather than risk wrong ordering.</p>
      <p><b>Leap seconds and smearing.</b> A leap second can make 23:59:60 appear, or repeat a second. Large clouds "smear" the extra second over hours so clocks never jump. Mixed smeared and unsmeared servers disagree by up to 0.5 s during the smear.</p>
      <p><b>Leases rely on bounded drift.</b> A lease of 10 s on node A and expiry check on node B work only if their <b>rates</b> agree within a known bound (drift, not offset), plus a safety margin. A process pause (GC, VM migration) can still outlive the lease, hence fencing tokens.</p>`,
    aiEra: `<p><b>What AI changes:</b> distributed tracing and log analysis tools use AI to stitch events across services; they often order events by timestamp, so skew can make the AI's "root cause" story wrong (an effect appearing before its cause). Trace context propagation (parent span IDs) is the causal ground truth, not the timestamps.</p>
      <p><b>Use AI as a partner:</b> ask it to audit code: <code>Find every place we use wall-clock time to measure a duration or to order writes across nodes</code>. It catches <code>Date.now()</code> timeouts quickly.</p>
      <p><b>Where AI goes wrong:</b> it frequently suggests "just use timestamps with NTP" for conflict resolution, without mentioning skew bounds or lost updates.</p>
      <p><b>What you must still own:</b> knowing your clock error bound and deciding whether correctness depends on it.</p>`,
    problems: [mk({
      t: 'Will Last-Write-Wins Lose This Update?', l: 'Medium', tags: ['clocks', 'lww', 'skew'], co: ['Netflix', 'Apple'],
      s: `<p>Two app servers write to a Cassandra-like store with LWW using their wall clocks. Server P is 80 ms fast, server Q is 40 ms slow. Real time: P writes <code>status=shipped</code> at t = 1000 ms, Q writes <code>status=delivered</code> at t = 1100 ms. Which value survives? What is the smallest real gap between the writes that guarantees Q wins?</p>`,
      ex: `<p>P's timestamp = 1080, Q's = 1060. LWW keeps the larger: ${H.c('r', 'shipped')}, although delivered happened later.</p>`,
      b: `<p>"Q wrote later, so Q wins." That trusts wall clocks to be perfect.</p>`,
      q: 'What determines the minimum safe gap?', o: ['Network latency', 'The skew between P and Q (here 120 ms)', 'The replication factor', 'The size of the value'], a: 1,
      e: 'Q wins only if its timestamp exceeds P\'s: (tQ − 40) &gt; (tP + 80), so tQ − tP &gt; 120 ms.',
      h: [`<p>Hint 1: Convert each real time into the timestamp the server stamps.</p>`, `<p>Hint 2: LWW compares stamped timestamps, not real times.</p>`, `<p>Hint 3: Solve tQ − 40 &gt; tP + 80 for the gap.</p>`],
      ap: `<p>Stamped times: P = 1000 + 80 = 1080, Q = 1100 − 40 = 1060. LWW keeps the larger, so <b>shipped</b> survives and the real latest update (delivered) is silently lost. For Q to win we need tQ − 40 &gt; tP + 80, i.e. a real gap of more than <b>120 ms</b> (the total skew). In general, any two writes closer together than the max clock skew may be ordered wrongly. Fixes: route all writes for a key through one leader that assigns order, use compare-and-set with a version number, use a state machine where "delivered" can only follow "shipped" (merge by max state), or use hybrid logical clocks so causally later writes always get larger timestamps.</p>`,
      cx: '<p>Constant-time reasoning: two subtractions and one inequality.</p>',
      d: { head: ['Write', 'Real t', 'Skew', 'Stamp'], rows: [['P shipped', '1000', '+80', '1080'], ['Q delivered', '1100', '−40', '1060'], ['Winner', '', '', 'shipped (wrong)']] },
      f: ['Would a hybrid logical clock fix this if Q had first read P\'s write?', 'Why does commit wait in Spanner make this impossible?']
    })]
  });
  // ---------------------------------------------------------------- Topic 3
  topics.push({
    title: 'Logical Time: Happened-Before, Lamport Clocks & Vector Clocks',
    analogy: `<p>A group chat with no timestamps. You still know some order: if Priya <i>replies to</i> Sam's message, Sam's message came first. If two people post at once without seeing each other's, nobody can say who was first, and it does not matter. Logical clocks keep exactly this "who could have seen whom" order, and nothing more.</p>`,
    explain: `<p><b>Happened-before (→)</b>, defined by Lamport (1978), is the ordering that does not need clocks:</p>
      <ol><li>If a and b are on the same process and a comes first, then a → b.</li><li>If a is "send m" and b is "receive m", then a → b.</li><li>If a → b and b → c, then a → c (transitive).</li></ol>
      <p>If neither a → b nor b → a, the events are <b>concurrent</b> (a ∥ b): neither could have influenced the other.</p>
      <p><b>Lamport clock</b>: one counter per process.</p>
      <ul><li>Before each local event or send: <code>L = L + 1</code>; a message carries L.</li><li>On receive of message with timestamp T: <code>L = max(L, T) + 1</code>.</li></ul>
      <p>Guarantee: a → b ⇒ L(a) &lt; L(b). The <b>reverse is false</b>: L(a) &lt; L(b) does not mean a → b. Break ties with process id to get a <b>total order</b> consistent with causality (used for mutual exclusion and total-order broadcast).</p>
      <p><b>Vector clock</b>: each process keeps a vector V with one counter per process.</p>
      <ul><li>Local event or send at process i: <code>V[i] += 1</code>; send carries a copy of V.</li><li>Receive at i with vector W: <code>V[k] = max(V[k], W[k])</code> for all k, then <code>V[i] += 1</code>.</li></ul>
      <p>Compare: V(a) ≤ V(b) if every entry ≤. Then <b>a → b ⇔ V(a) ≤ V(b) and V(a) ≠ V(b)</b>. If neither is ≤ the other, they are concurrent. Vector clocks <b>detect concurrency</b>; Lamport clocks cannot.</p>
      ${H.table(['', 'Lamport', 'Vector'], [['Size', '1 integer', 'N integers (one per process)'], ['a → b ⇒ smaller?', 'Yes', 'Yes'], ['smaller ⇒ a → b?', 'No', 'Yes'], ['Detects concurrent writes?', 'No', 'Yes'], ['Typical use', 'Total order, Raft-like terms, ID ordering', 'Conflict detection (Dynamo, Riak), causal delivery']])}
      <p>For quorum/replication-side use of version vectors and siblings, see hld10 "Logical Time".</p>`,
    clues: ['"order events without synchronized clocks"', '"did A cause B, or are they concurrent?"', '"detect conflicting writes" / "siblings"', '"total order of messages across servers"', '"causal consistency" / "causal delivery"', '"version vectors" / "dotted version vectors"'],
    code: [{ lang: 'python', run: true, title: 'Lamport clock simulator with total-order tie-break (runnable)', code: `# Events per process: ("local",) | ("send", msg_id) | ("recv", msg_id)
# We replay a fixed global schedule so receives happen after their sends.
schedule = [
    ("P1", ("local",)),
    ("P1", ("send", "m1")),
    ("P2", ("local",)),
    ("P2", ("recv", "m1")),
    ("P2", ("send", "m2")),
    ("P3", ("local",)),
    ("P3", ("recv", "m2")),
    ("P1", ("local",)),
]
clock = {"P1": 0, "P2": 0, "P3": 0}
in_flight = {}          # msg_id -> timestamp carried
log = []                # (lamport, process, description)

for proc, ev in schedule:
    if ev[0] == "recv":
        carried = in_flight.pop(ev[1])
        clock[proc] = max(clock[proc], carried) + 1      # receive rule
        desc = "recv %s (carried %d)" % (ev[1], carried)
    else:
        clock[proc] += 1                                  # local / send rule
        desc = ev[0] if ev[0] == "local" else "send " + ev[1]
        if ev[0] == "send":
            in_flight[ev[1]] = clock[proc]
    log.append((clock[proc], proc, desc))
    print("%-3s %-22s L=%d" % (proc, desc, clock[proc]))

print()
print("Total order (sort by (L, process id)) -- consistent with happened-before:")
for L, p, d in sorted(log):
    print("  (%d, %s) %s" % (L, p, d))
` }, { lang: 'python', run: true, title: 'Vector clocks + happened-before checker (runnable)', code: `N = 3  # processes 0, 1, 2

def happened_before(a, b):
    # a -> b iff a <= b entry-wise and a != b
    return all(x <= y for x, y in zip(a, b)) and a != b

def relation(a, b):
    if happened_before(a, b):
        return "a -> b"
    if happened_before(b, a):
        return "b -> a"
    return "concurrent" if a != b else "same event"

V = [[0] * N for _ in range(N)]
events = {}

def local(i, name):
    V[i][i] += 1
    events[name] = list(V[i])

def send(i, name):
    local(i, name)
    return list(V[i])                 # message carries a copy

def recv(i, msg, name):
    V[i] = [max(x, y) for x, y in zip(V[i], msg)]
    V[i][i] += 1
    events[name] = list(V[i])

local(0, "a")            # P0
m = send(0, "b")         # P0 sends to P1
local(1, "c")            # P1, concurrent with a and b
recv(1, m, "d")          # P1 receives
local(2, "e")            # P2, independent
m2 = send(1, "f")
recv(2, m2, "g")

for k, v in events.items():
    print(k, v)
print()
for x, y in [("a", "d"), ("c", "b"), ("e", "f"), ("a", "g"), ("e", "g")]:
    print("%s vs %s: %s" % (x, y, relation(events[x], events[y])))
` }],
    codeTitle: ['Lamport simulator', 'Vector clock checker'],
    viz: {
      title: 'Lamport and vector clocks on a small message trace',
      input: 'P0 local, P0 send m1, P1 local, P1 recv m1, P1 send m2, P2 local, P2 recv m2, P0 local',
      inputLabel: 'Events: "P<i> local" | "P<i> send <msg>" | "P<i> recv <msg>" (3 processes P0-P2, comma separated)',
      gen: function (input) {
        var evs = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!evs.length || evs.length > 14) throw new Error('Give 1-14 events like "P0 send m1, P1 recv m1"');
        var L = [0, 0, 0], V = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], msgs = {}, rows = [], frames = [];
        frames.push({ narr: 'Three processes start with Lamport clock 0 and vector [0,0,0]. Rules: tick before local/send; on receive take the max, then tick.', parts: [{ type: 'vars', label: 'Clocks', vals: { 'P0': 'L=0 V=[0,0,0]', 'P1': 'L=0 V=[0,0,0]', 'P2': 'L=0 V=[0,0,0]' } }] });
        evs.forEach(function (e) {
          var m = /^P([0-2])\s+(local|send|recv)\s*(\S*)$/i.exec(e);
          if (!m) throw new Error('Bad event "' + e + '". Use P0..P2 then local, send m1, or recv m1');
          var p = +m[1], kind = m[2].toLowerCase(), id = m[3], narr;
          if (kind === 'recv') {
            if (!msgs[id]) throw new Error('Message ' + id + ' is received before it is sent');
            var w = msgs[id];
            L[p] = Math.max(L[p], w.L) + 1;
            V[p] = V[p].map(function (x, k) { return Math.max(x, w.V[k]); }); V[p][p]++;
            narr = '<b>P' + p + ' receives ' + H.esc(id) + '</b> carrying L=' + w.L + ', V=[' + w.V + ']. Lamport: max(old, ' + w.L + ') + 1 = ' + L[p] + '. Vector: entry-wise max, then own entry +1.';
          } else {
            L[p]++; V[p][p]++;
            if (kind === 'send') { if (!id) throw new Error('send needs a message name'); msgs[id] = { L: L[p], V: V[p].slice() }; }
            narr = '<b>P' + p + ' ' + kind + (id ? ' ' + H.esc(id) : '') + '</b>: tick own counter. L=' + L[p] + ', V=[' + V[p] + ']' + (kind === 'send' ? '. The message carries these values.' : '.');
          }
          rows.push([e, 'P' + p, L[p], '[' + V[p].join(',') + ']']);
          var hl = {}; hl['P' + p] = 'ok';
          frames.push({ narr: narr, parts: [
            { type: 'table', label: 'Event log', columns: ['Event', 'Proc', 'Lamport', 'Vector'], rows: rows.map(function (r) { return r.slice(); }), hl: hlRow(rows.length - 1) },
            { type: 'vars', label: 'Current clocks', vals: { 'P0': 'L=' + L[0] + ' V=[' + V[0] + ']', 'P1': 'L=' + L[1] + ' V=[' + V[1] + ']', 'P2': 'L=' + L[2] + ' V=[' + V[2] + ']' }, hl: hl }
          ] });
        });
        frames.push({ narr: 'Compare any two rows: if one vector is ≤ the other in every slot (and different), it happened-before. If each has a bigger slot somewhere, they are <b>concurrent</b>, even when their Lamport numbers differ.', parts: [{ type: 'table', label: 'Final log', columns: ['Event', 'Proc', 'Lamport', 'Vector'], rows: rows, hl: {} }] });
        return frames;
      }
    },
    examples: [
      { title: 'Lamport receive rule by hand', html: `<p>P2 has L = 3 and receives a message stamped 7. New L = max(3, 7) + 1 = <b>8</b>. If instead it was stamped 2: max(3, 2) + 1 = <b>4</b>.</p>` },
      { title: 'Lamport cannot detect concurrency', html: `<p>P0 does one local event (L = 1). P1, which never talks to P0, does three (L = 1, 2, 3). L(P0's event) = 1 &lt; 3, but the events are concurrent. Smaller Lamport number ≠ happened first.</p>` },
      { title: 'Vector comparison drill', html: `${H.table(['A', 'B', 'Relation'], [['[2,0,0]', '[2,1,0]', 'A → B (all ≤, one smaller)'], ['[2,1,0]', '[1,2,0]', 'Concurrent (2&gt;1 and 1&lt;2)'], ['[1,1,1]', '[1,1,1]', 'Same event / same state'], ['[0,0,3]', '[1,2,3]', 'A → B']])}` },
      { title: 'Concurrent writes in a key-value store', html: `<p>Client X writes cart = [book] at replica R1 → version [1,0]. Client Y, partitioned, writes cart = [pen] at R2 → [0,1]. Neither dominates, so the store keeps both <b>siblings</b> and asks the app to merge (union = [book, pen]). With LWW one write would be silently lost.</p>` }
    ],
    deepDive: `<p><b>Why the receive rule works.</b> After a receive, the receiver's counter exceeds the sender's counter at send time; local ticks keep increasing per process; by transitivity, any causal chain strictly increases L. That proves a → b ⇒ L(a) &lt; L(b). Vector clocks strengthen this: V(e)[j] counts how many events of process j are in e's causal past, so comparing vectors compares causal pasts exactly.</p>
      <p><b>Size cost.</b> Vector clocks need one entry per process that ever wrote; with thousands of clients this explodes. Dynamo-style stores use <b>version vectors per replica</b> (not per client) and prune old entries; <b>dotted version vectors</b> (Riak) fix false conflicts that plain per-server vectors produce. Charron-Bost proved you cannot capture causality exactly with fewer than N entries in general.</p>
      <p><b>Total-order broadcast via Lamport.</b> Deliver a message only when you have seen a higher (L, pid) stamp from every other process, so nothing smaller can still arrive. Fine for small fixed groups; in practice total-order broadcast is done with a leader-based consensus log (Raft), which is equivalent to consensus.</p>
      <p><b>Hybrid logical clocks</b> combine both worlds: close to physical time but with the Lamport guarantee. <b>Causal delivery</b> (deliver a message only when all its causal predecessors have been delivered) uses vector timestamps to buffer early messages.</p>`,
    aiEra: `<p><b>What AI changes:</b> collaborative editors with AI co-authors (a human and an agent editing the same doc) are concurrent writers. CRDTs and version vectors decide how edits merge; the AI is just another replica. Agent memory stores synced across devices face the same sibling problem.</p>
      <p><b>Use AI as a partner:</b> have it generate random traces and predict relations, then check with the runnable checker above. Ask <code>Give me 5 vector pairs, I will classify them</code> for drill.</p>
      <p><b>Where AI goes wrong:</b> it often claims "Lamport timestamps tell you which event happened first" or mixes up the receive rule (forgetting the +1, or taking max without ticking).</p>
      <p><b>What you must still own:</b> the one-line asymmetry: Lamport gives a → b ⇒ L(a) &lt; L(b) only; vectors give the iff.</p>`,
    problems: [mk({
      t: 'Fill In Lamport and Vector Timestamps', l: 'Medium', tags: ['lamport', 'vector clocks', 'happened-before'], co: ['Microsoft', 'Uber'],
      s: `<p>P0: a (local), b (send m to P1). P1: c (local), d (receive m), e (send n to P2). P2: f (local), g (receive n). Compute Lamport and vector timestamps for all events, then classify (a, c), (b, g), (c, f).</p>`,
      ex: `<p>a: L=1, V=[1,0,0]. b: L=2, V=[2,0,0]. d: L=max(1,2)+1=3, V=[2,2,0].</p>`,
      b: `<p>Guessing order from Lamport numbers: L(c)=1 &lt; L(b)=2 suggests c → b, but they are concurrent.</p>`,
      q: 'L(a) = 1 and L(c) = 1. What can you conclude?', o: ['a and c are the same event', 'a → c', 'Nothing about causality from Lamport alone; vectors show they are concurrent', 'c → a'], a: 2,
      e: 'Equal or smaller Lamport values never prove order; vectors [1,0,0] and [0,1,0] are incomparable.',
      h: [`<p>Hint 1: Each process starts at 0; tick before every event.</p>`, `<p>Hint 2: On receive: Lamport max(local, carried)+1; vector entry-wise max then tick own slot.</p>`, `<p>Hint 3: Concurrent = each vector has some slot bigger than the other's.</p>`],
      ap: `<p>Lamport: a=1, b=2, c=1, d=max(1,2)+1=3, e=4, f=1, g=max(1,4)+1=5. Vectors: a=[1,0,0], b=[2,0,0], c=[0,1,0], d=[2,2,0], e=[2,3,0], f=[0,0,1], g=[2,3,2]. (a, c): [1,0,0] vs [0,1,0], incomparable → <b>concurrent</b>. (b, g): [2,0,0] ≤ [2,3,2] → <b>b → g</b> (via m then n). (c, f): [0,1,0] vs [0,0,1] → <b>concurrent</b>. Note f has Lamport 1 &lt; e's 4 but f ∥ e; only vectors reveal that.</p>`,
      cx: '<p>O(E · N) to compute vectors for E events and N processes; O(N) per comparison.</p>',
      d: { head: ['Event', 'Lamport', 'Vector'], rows: [['a', '1', '[1,0,0]'], ['b', '2', '[2,0,0]'], ['c', '1', '[0,1,0]'], ['d', '3', '[2,2,0]'], ['e', '4', '[2,3,0]'], ['f', '1', '[0,0,1]'], ['g', '5', '[2,3,2]']] },
      f: ['Give a total order consistent with causality using (L, pid).', 'How would a Dynamo-style store use these vectors on a read?']
    })]
  });
  // ---------------------------------------------------------------- Topic 4
  topics.push({
    title: 'Replication Models: Leader-Based, Multi-Leader, Leaderless & Quorums',
    analogy: `<p>A family shares one shopping list. Option 1: only Mum may edit, everyone else copies her list (single leader). Option 2: Mum and Dad each keep a list and swap changes every evening, sometimes both added milk (multi-leader). Option 3: anyone writes on any of three sticky notes; to read, you check at least two of them and trust the newest (leaderless quorum).</p>`,
    explain: `<p><b>Replication</b> = keeping copies of the same data on several machines, for fault tolerance, read scaling and lower latency. The big design questions: <i>who accepts writes</i> and <i>when is a write acknowledged</i>.</p>
      ${H.table(['Model', 'Who accepts writes', 'Strength', 'Weakness', 'Examples'], [['Single-leader', 'One leader; followers copy its log', 'Simple, no write conflicts, easy strong reads from leader', 'Leader is a bottleneck; failover is tricky', 'PostgreSQL, MySQL, Raft/etcd, Kafka partitions'], ['Multi-leader', 'Several leaders (often one per region)', 'Local writes in each region, survives region loss', 'Write conflicts must be resolved', 'Active-active MySQL, CouchDB, collaborative apps'], ['Leaderless', 'Any replica; client writes to many', 'No failover, high availability', 'Needs quorums, read repair, conflict handling', 'Dynamo, Cassandra, Riak']])}
      <p><b>Synchronous vs asynchronous.</b> Synchronous: the leader waits for followers before confirming → no data loss on leader crash, but slower and blocked if a follower is down. Asynchronous: confirm immediately → fast, but a crash can lose the last writes and followers serve <b>stale reads</b> (replication lag). Common middle: <b>semi-synchronous</b> (wait for 1 follower).</p>
      <p><b>Quorums.</b> With N replicas, a write waits for W acks, a read asks R replicas. If <b>R + W &gt; N</b>, every read set overlaps every write set in at least <b>R + W − N</b> replicas, so a read sees at least one copy of the latest acknowledged write. Common choice: N = 3, W = 2, R = 2. Majority quorums (⌊N/2⌋ + 1) also guarantee any two writes overlap (W + W &gt; N), which consensus needs.</p>
      <p>See hld10 "Quorums" for sloppy quorums, hinted handoff and LOCAL_QUORUM design trade-offs.</p>`,
    clues: ['"R + W > N"', '"read your own writes after failover"', '"replication lag" / "stale reads from replicas"', '"active-active across regions"', '"how many nodes can fail and we still accept writes?"', '"synchronous vs asynchronous replication"'],
    code: { lang: 'python', run: true, title: 'Quorum overlap calculator: brute-force every read/write set (runnable)', code: `from itertools import combinations

def analyse(n, w, r):
    nodes = range(n)
    min_overlap = min(len(set(ws) & set(rs))
                      for ws in combinations(nodes, w)
                      for rs in combinations(nodes, r))
    print("N=%d W=%d R=%d" % (n, w, r))
    print("  formula R+W-N         =", r + w - n)
    print("  brute-force min overlap =", min_overlap)
    print("  every read sees latest write?", "YES" if min_overlap >= 1 else "NO (stale reads possible)")
    print("  two writes always overlap (W+W>N)?", "YES" if 2 * w > n else "NO (conflicting writes can both succeed)")
    print("  write survives failures:", n - w, "  read survives failures:", n - r)
    print()

for n, w, r in [(3, 2, 2), (3, 1, 1), (5, 3, 3), (5, 4, 2), (5, 1, 5)]:
    analyse(n, w, r)
` },
    viz: {
      title: 'Does the read quorum meet the write quorum?',
      input: '5, 3, 2',
      inputLabel: 'N, W, R (N ≤ 9)',
      gen: function (input) {
        var t = String(input).split(/[\s,]+/).filter(Boolean).map(Number);
        if (t.length !== 3 || t.some(function (x) { return !Number.isInteger(x) || x < 1; }) || t[0] > 9 || t[1] > t[0] || t[2] > t[0]) throw new Error('Enter N, W, R as integers with 1 ≤ W, R ≤ N ≤ 9, e.g. 5, 3, 2');
        var n = t[0], w = t[1], r = t[2], frames = [], ids = [];
        for (var i = 0; i < n; i++) ids.push('R' + (i + 1));
        frames.push({ narr: 'We have <b>' + n + '</b> replicas. A write must be acknowledged by <b>W = ' + w + '</b>; a read asks <b>R = ' + r + '</b> and keeps the newest version it sees.', parts: [{ type: 'array', label: 'Replicas', values: ids.map(function () { return 'v1'; }), idxLabels: ids }] });
        var vals = ids.map(function () { return 'v1'; }), hl = {};
        for (var k = 0; k < w; k++) { vals[k] = 'v2'; hl[k] = 'ok'; frames.push({ narr: 'Write v2 is stored on ' + ids[k] + ' (' + (k + 1) + ' of W = ' + w + ' acks).', parts: [{ type: 'array', label: 'Replicas after write', values: vals.slice(), hl: Object.assign({}, hl), idxLabels: ids }] }); }
        frames.push({ narr: 'Write acknowledged. The other ' + (n - w) + ' replica(s) still hold v1 (they will catch up later via anti-entropy or read repair).', parts: [{ type: 'array', label: 'Replicas', values: vals.slice(), hl: Object.assign({}, hl), idxLabels: ids }] });
        // worst case read: choose replicas that did NOT get the write first
        var order = []; for (var j = n - 1; j >= 0; j--) order.push(j);
        var rhl = {}, seen = [];
        for (var q = 0; q < r; q++) { var idx = order[q]; rhl[idx] = vals[idx] === 'v2' ? 'sel' : 'win'; seen.push(vals[idx]); frames.push({ narr: 'Worst-case read asks ' + ids[idx] + ' → sees <b>' + vals[idx] + '</b>.', parts: [{ type: 'array', label: 'Read set (blue = stale, purple = fresh)', values: vals.slice(), hl: Object.assign({}, rhl), idxLabels: ids }] }); }
        var ov = r + w - n, fresh = seen.indexOf('v2') >= 0;
        frames.push({ narr: (fresh ? '<b class="c-g">Fresh read.</b> ' : '<b class="c-r">Stale read!</b> ') + 'Overlap guaranteed = R + W − N = ' + ov + '. ' + (ov >= 1 ? 'Because R + W &gt; N, even the worst read set touches a v2 replica.' : 'Because R + W ≤ N, a read can miss every replica that has the write.'), parts: [
          { type: 'vars', label: 'Quorum math', vals: { 'R + W': r + w, 'N': n, 'min overlap': Math.max(0, ov), 'writes tolerate failures': n - w, 'reads tolerate failures': n - r }, hl: { 'min overlap': ov >= 1 ? 'ok' : 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'N = 3, W = 2, R = 2', html: `<p>Overlap = 2 + 2 − 3 = <b>1</b>. Reads are fresh. One node may be down for both reads and writes. This is Cassandra's QUORUM with RF = 3.</p>` },
      { title: 'N = 3, W = 1, R = 1', html: `<p>Overlap = −1 → no guarantee. Fastest, highest availability, but reads can return old data: <b>eventual consistency</b>. Fine for view counters, bad for balances.</p>` },
      { title: 'Replication lag anomaly', html: `<p>User posts a comment (to the leader) and refreshes; the read goes to an async follower 2 s behind: the comment "disappears". Fixes for <b>read-your-writes</b>: read own data from the leader for a short window, or send the write's log position and have the follower wait until it has caught up to it.</p>` },
      { title: 'Failover data loss', html: `<p>Async leader acked writes up to log index 105; follower had only 100 when the leader died. Promoting it <b>loses 101–105</b>. Worse, if the old leader comes back and still thinks it is leader: split brain. Consensus-based replication (Raft) only commits once a majority has the entry, so a newly elected leader always has it.</p>` }
    ],
    deepDive: `<p><b>Quorums are not linearizability by themselves.</b> Even with R + W &gt; N, a read concurrent with a write can see the new value on one read and the old value on the next read (the write reached 1 of 2 needed replicas). Fix: <b>read repair before returning</b> (the reader writes back the newest value to a quorum: the ABD algorithm), which makes single-register reads/writes linearizable. Sloppy quorums and LWW timestamp conflicts also break the guarantee.</p>
      <p><b>Replication log formats.</b> Statement-based (replay SQL, breaks on NOW()/RAND()), write-ahead log shipping (byte-level, ties replicas to the same version), logical/row-based (per-row changes, used for CDC, e.g. Debezium on the MySQL binlog / Postgres logical decoding).</p>
      <p><b>Multi-leader conflict resolution</b>: LWW (lossy), merge functions, CRDTs (counters, sets, sequences that merge deterministically), or conflict-free by design (route each key's writes to one home region).</p>
      <p><b>Chain replication</b>: writes go to the head and flow down a chain; reads served by the tail. Strongly consistent with high throughput; a cluster manager reconfigures the chain on failure.</p>`,
    aiEra: `<p><b>What AI changes:</b> vector databases for RAG replicate embeddings with the same models: usually async, leaderless or single-leader per shard, so freshly ingested documents may be invisible for seconds. If an agent writes a memory then immediately retrieves it, read-your-writes matters.</p>
      <p><b>Use AI as a partner:</b> paste your DB's replication settings and ask <code>Which anomalies can a user see: stale read, lost write on failover, read-your-writes violation?</code>. Verify against the runnable quorum calculator.</p>
      <p><b>Where AI goes wrong:</b> it often says "R + W &gt; N gives strong consistency" without the concurrent-read and sloppy-quorum caveats.</p>
      <p><b>What you must still own:</b> picking N, W, R per data type (balance vs. like count) and explaining the failure that each setting tolerates.</p>`,
    problems: [mk({
      t: 'Pick N, W, R for Three Data Types', l: 'Medium', tags: ['quorums', 'replication'], co: ['Amazon', 'Datadog'],
      s: `<p>N = 5 replicas. Choose W and R for: (1) user account balance (no stale reads, survive 2 failures for both reads and writes), (2) product view counter (max availability, staleness OK), (3) config read 1000x more than written (fast reads, fresh).</p>`,
      ex: `<p>Balance: W = 3, R = 3 → overlap 1, each tolerates 2 failures.</p>`,
      b: `<p>Use W = R = 1 everywhere "for speed". Balances can then be read stale and double-spent.</p>`,
      q: 'For read-heavy fresh config with N = 5, which is best?', o: ['W=1, R=1', 'W=5, R=1', 'W=2, R=2', 'W=1, R=5'], a: 1,
      e: 'W = 5, R = 1 → overlap 1, reads touch one node (fast); writes need all 5, acceptable because they are rare (but any one failure blocks writes).',
      h: [`<p>Hint 1: Freshness needs R + W ≥ N + 1 = 6.</p>`, `<p>Hint 2: Failures tolerated = N − W for writes and N − R for reads.</p>`, `<p>Hint 3: Shift weight towards the rare operation.</p>`],
      ap: `<p>(1) Balance: W = 3, R = 3. R + W = 6 &gt; 5, overlap 1; writes and reads each survive 2 failures; W + W &gt; N so two concurrent writes overlap. Add read repair (or use a consensus-based store) for true linearizability. (2) Counter: W = 1, R = 1 (or use a CRDT counter): survives 4 failures, staleness tolerated; overlap −3, reads may be old. (3) Config: W = 5, R = 1: reads hit one node and are fresh, writes need everyone, so one dead node blocks config changes; a gentler choice is W = 4, R = 2 (overlap 1, writes survive 1 failure, reads survive 3).</p>`,
      cx: '<p>Each choice is a one-line check of R + W − N and N − W, N − R.</p>',
      d: { head: ['Data', 'W', 'R', 'R+W−N', 'Fail W/R'], rows: [['Balance', '3', '3', '1', '2 / 2'], ['Counter', '1', '1', '−3', '4 / 4'], ['Config', '5', '1', '1', '0 / 4'], ['Config alt', '4', '2', '1', '1 / 3']] },
      f: ['Why is R + W &gt; N not enough for linearizability?', 'What does a sloppy quorum break?']
    })]
  });
  // ---------------------------------------------------------------- Topic 5
  topics.push({
    title: 'Consistency Models: Linearizable, Sequential, Causal, Eventual',
    analogy: `<p>A scoreboard in a stadium. <b>Linearizable</b>: there is one real scoreboard; the moment a goal is scored everyone who looks after that sees it. <b>Sequential</b>: everyone sees goals in the same order, but some fans' screens lag. <b>Causal</b>: you never see "2–1" before the "1–1" it builds on, but unrelated matches may appear in different orders for different fans. <b>Eventual</b>: if scoring stops, all screens end up showing the same thing... eventually.</p>`,
    explain: `<p>A <b>consistency model</b> is a contract: which results reads may return when many clients read and write replicated data. From strongest to weakest:</p>
      ${H.table(['Model', 'Promise in plain words', 'Cost'], [['Linearizable', 'Acts like one copy. Each operation takes effect at one instant between its start and end; once a write completes, every later read (in real time) sees it or something newer.', 'Coordination on every op (consensus or leader + quorum); unavailable in a partition'], ['Sequential', 'All clients see one total order of operations that respects each client\'s own program order, but not real time.', 'Still needs global agreement on order'], ['Causal', 'If write A could have influenced write B, everyone sees A before B. Concurrent writes may be seen in different orders.', 'Track dependencies (vector clocks); available during partitions'], ['Eventual', 'If writes stop, replicas converge. No promise about what you read in the meantime.', 'Cheapest, highest availability']])}
      <p>Useful <b>session guarantees</b> between causal and eventual: <b>read-your-writes</b>, <b>monotonic reads</b> (never go back in time), <b>monotonic writes</b>, <b>writes-follow-reads</b>. Together they equal causal consistency within one session.</p>
      <p><b>Linearizable vs serializable</b> (common trap): <i>serializable</i> is about <b>transactions</b> on many objects (result equals some serial order, may not be real-time). <i>Linearizable</i> is about <b>single operations on one object</b> respecting real time. Both together = <b>strict serializability</b> (Spanner).</p>
      <p><b>How to check linearizability for a tiny history:</b> list operations with start and end times. Find an order such that (1) if op X ended before op Y started, X comes first, and (2) each read returns the latest write before it in that order. If no such order exists, the history is not linearizable. hld10 covers which databases offer which model.</p>`,
    clues: ['"after the write returns, every read must see it"', '"a user should always see their own update"', '"comments must never appear before the post they reply to"', '"the feed can be a few seconds stale"', '"strictly serializable" / "external consistency"', '"is this history linearizable?"'],
    code: { lang: 'python', run: true, title: 'Brute-force linearizability checker for a single register (runnable)', code: `from itertools import permutations

# Each op: (name, kind, value, start, end). Register starts at 0.
def linearizable(history, initial=0):
    for order in permutations(history):
        pos = {op[0]: i for i, op in enumerate(order)}
        # 1) real-time: if a ended before b started, a must come first
        ok = all(pos[a[0]] < pos[b[0]]
                 for a in history for b in history
                 if a[4] < b[3])
        if not ok:
            continue
        # 2) register semantics: each read returns the latest preceding write
        val, legal = initial, True
        for name, kind, v, s, e in order:
            if kind == "w":
                val = v
            elif v != val:
                legal = False
                break
        if legal:
            return [op[0] for op in order]
    return None

h1 = [("A:w1", "w", 1, 0, 4), ("B:r1", "r", 1, 1, 2), ("C:r0", "r", 0, 3, 5)]
h2 = [("A:w1", "w", 1, 0, 4), ("B:r0", "r", 0, 1, 2), ("C:r1", "r", 1, 3, 5)]   # reads overlap the write: fine
h3 = [("A:w1", "w", 1, 0, 2), ("B:r0", "r", 0, 3, 4)]

for name, h in [("h1", h1), ("h2", h2), ("h3", h3)]:
    res = linearizable(h)
    print(name, "->", "linearizable, order: " + " < ".join(res) if res else "NOT linearizable")
` },
    viz: {
      title: 'Linearizability check for a tiny register history',
      input: 'A w1 0 4, B r0 1 2, C r1 3 5, D r1 6 7',
      inputLabel: 'Ops: "<client> w<v>|r<v> <start> <end>" comma separated, ≤ 6 ops, register starts at 0',
      gen: function (input) {
        var parts = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!parts.length || parts.length > 6) throw new Error('Give 1-6 operations, e.g. A w1 0 4, B r1 1 2');
        var ops = parts.map(function (p) {
          var m = /^(\w+)\s+([wr])(-?\d+)\s+(\d+)\s+(\d+)$/i.exec(p);
          if (!m || +m[4] >= +m[5]) throw new Error('Bad op "' + p + '". Format: A w1 0 4 (start < end)');
          return { name: m[1] + ':' + m[2].toLowerCase() + m[3], kind: m[2].toLowerCase(), v: +m[3], s: +m[4], e: +m[5] };
        });
        var frames = [];
        var rows = ops.map(function (o) { return [o.name, o.kind === 'w' ? 'write ' + o.v : 'read → ' + o.v, o.s, o.e]; });
        frames.push({ narr: 'The history: each operation runs from <b>start</b> to <b>end</b>. It must "take effect" at a single instant inside that interval.', parts: [{ type: 'table', label: 'History', columns: ['Op', 'What', 'Start', 'End'], rows: rows }] });
        var cons = [];
        ops.forEach(function (a) { ops.forEach(function (b) { if (a.e < b.s) cons.push(a.name + ' before ' + b.name); }); });
        frames.push({ narr: 'Real-time rule: if one op <b>ended before</b> another <b>started</b>, it must come first. Overlapping ops may go in either order.', parts: [{ type: 'set', label: 'Forced orderings', items: cons.length ? cons : ['(none: all ops overlap)'] }] });
        var best = null, tried = 0;
        function dfs(order, used, val) {
          if (best) return;
          if (order.length === ops.length) { best = order.slice(); return; }
          ops.forEach(function (o, i) {
            if (best || used[i]) return;
            for (var j = 0; j < ops.length; j++) if (!used[j] && j !== i && ops[j].e < o.s) return; // someone must go first
            if (o.kind === 'r' && o.v !== val) return;
            tried++; used[i] = true; order.push(o);
            dfs(order, used, o.kind === 'w' ? o.v : val);
            order.pop(); used[i] = false;
          });
        }
        dfs([], {}, 0);
        if (best) {
          var val = 0, log = [];
          best.forEach(function (o, k) {
            if (o.kind === 'w') val = o.v;
            log.push([k + 1, o.name, o.kind === 'w' ? 'register := ' + o.v : 'reads ' + o.v + ' ✓', val]);
            frames.push({ narr: 'Linearization point ' + (k + 1) + ': <b>' + o.name + '</b>. ' + (o.kind === 'w' ? 'The register becomes ' + o.v + '.' : 'The register holds ' + val + ', matching the value this read returned.'), parts: [{ type: 'table', label: 'Chosen order', columns: ['#', 'Op', 'Effect', 'Register'], rows: log.map(function (r) { return r.slice(); }), hl: hlRow(k, 'ok') }] });
          });
          frames.push({ narr: '<b class="c-g">Linearizable.</b> A legal order exists that respects real time and register semantics (' + tried + ' placements tried).', parts: [{ type: 'text', label: 'Verdict', html: best.map(function (o) { return o.name; }).join(' → ') }] });
        } else {
          frames.push({ narr: 'Search tried ' + tried + ' partial placements. Every order breaks either real-time order or a read value.', parts: [{ type: 'text', label: 'Why', html: 'Typical cause: a read returned an <b>older</b> value after another read (or the write itself) already finished with the newer one.' }] });
          frames.push({ narr: '<b class="c-r">Not linearizable.</b> This history could still be sequentially or causally consistent, which ignore real time.', parts: [{ type: 'table', label: 'History', columns: ['Op', 'What', 'Start', 'End'], rows: rows, hl: {} }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'A stale read after a fresh read', html: `<p>A writes 1 during [0, 4]. B reads during [1, 2] and gets 1. C reads during [3, 5] and gets 0. Order C:r0, A:w1, B:r1? B ended (2) before C started (3), so B must precede C. Order A:w1, B:r1, C:r0 makes C read 0 after a write of 1: illegal. Try C:r0 first: B must come before C (real time) → <b>no legal order: not linearizable</b>. Run the checker above to confirm (h1).</p>` },
      { title: 'Sequential but not linearizable', html: `<p>A writes 1 and the call returns at t = 2. At t = 3 B reads 0. Real time forbids it, so not linearizable. But the order "B:r0, A:w1" respects each client's own program order, so it is <b>sequentially consistent</b>. The difference is exactly real time.</p>` },
      { title: 'Causal violation in a comment thread', html: `<p>Alice posts "Is anyone free?" Bob replies "Yes!". Carol's replica receives Bob's reply first and shows "Yes!" with no question. Causal consistency forbids this: the reply depends on the post. Eventual consistency allows it temporarily.</p>` },
      { title: 'Monotonic reads violation', html: `<p>You refresh twice; the first read hits a fresh replica (5 likes), the second an older one (3 likes). Likes go backwards. Fix: stick a session to one replica, or carry a "seen up to version" token.</p>` }
    ],
    deepDive: `<p><b>Why linearizability costs latency.</b> Attiya and Welch showed that for a linearizable register, reads or writes must take time proportional to the network delay uncertainty. Every linearizable op needs a round trip to a quorum or leader (leader leases can make reads local but depend on bounded clock drift).</p>
      <p><b>Linearizability is composable</b> (local): if each object is linearizable, the whole system is. Sequential consistency is not composable. This is why per-key linearizable stores are easy to reason about.</p>
      <p><b>Checking real histories</b> is NP-complete in general; tools like <b>Jepsen</b>/<b>Knossos</b>/<b>Porcupine</b> use search with pruning (as in the viz) for histories of thousands of ops, and they find bugs in real databases regularly. Elle checks transactional isolation anomalies by building dependency graphs.</p>
      <p><b>Causal consistency is the strongest model that stays available during partitions</b> (Mahajan et al.), which is why COPS, Eiger and MongoDB causal sessions target it. <b>Where you need linearizability:</b> leader election, locks, uniqueness constraints (one username), account balances with invariants. Where you don't: feeds, counters, carts, analytics.</p>`,
    aiEra: `<p><b>What AI changes:</b> multi-agent systems sharing a "blackboard" or memory store need a consistency model: an agent planning on stale state can repeat work or contradict another agent. Session guarantees (read-your-writes per agent) are often enough.</p>
      <p><b>Use AI as a partner:</b> ask it to generate small concurrent histories and classify them; check with the runnable checker. Or ask it to map product requirements ("users must see their post immediately") to the weakest model that satisfies them.</p>
      <p><b>Where AI goes wrong:</b> it routinely confuses linearizable with serializable, and calls "strong consistency" whatever a vendor's marketing says.</p>
      <p><b>What you must still own:</b> the real-time rule and spotting the violating pair of operations in a history.</p>`,
    problems: [mk({
      t: 'Is This History Linearizable?', l: 'Hard', tags: ['linearizability', 'consistency models'], co: ['Google', 'MongoDB'],
      s: `<p>Register x starts at 0. Ops (start, end): A writes 1 [0, 10]; B reads 1 [2, 4]; C reads 0 [5, 7]; D writes 2 [6, 12]; E reads 2 [13, 14]. Is it linearizable? If not, name the violating pair. Which weaker model still allows it?</p>`,
      ex: `<p>B finished at 4 with value 1; C started at 5 and got 0. Since no write of 0 occurs after A:w1, C must be placed before A's write... but B (which saw 1) must precede C.</p>`,
      b: `<p>Checking only that every read value was written by someone: all reads return written values (0 initial, 1, 2) so "looks fine", but real-time order is ignored.</p>`,
      q: 'Which pair makes this history non-linearizable?', o: ['A:w1 and D:w2', 'B:r1 then C:r0', 'D:w2 and E:r2', 'A:w1 and E:r2'], a: 1,
      e: 'B returned 1 and finished before C started, so 1 was already visible; C then returning 0 means time went backwards.',
      h: [`<p>Hint 1: List which ops end before others start.</p>`, `<p>Hint 2: Once any read has returned 1, A's write took effect before that read.</p>`, `<p>Hint 3: Can 0 be read after w1 took effect with no write of 0?</p>`],
      ap: `<p>Real-time edges: B (ends 4) before C (starts 5); B, C before E; A, D before E. B read 1, so A's linearization point is before B's. C comes after B, so after A:w1 takes effect; nothing writes 0 again, so C reading 0 is impossible. <b>Not linearizable</b>; the violating pair is B:r1 → C:r0 (a "stale read after a fresh read"). It is still <b>sequentially consistent</b> if B, C are different clients: order C:r0, A:w1, B:r1, D:w2, E:r2 respects each client's own order. Typical cause: C read from a lagging follower. Fixes: read from leader with a lease, quorum reads with read repair, or ReadIndex in Raft.</p>`,
      cx: '<p>Brute force O(n! · n²); pruning with real-time constraints makes small histories instant.</p>',
      d: { head: ['Step', 'Placed', 'Register', 'Valid?'], rows: [['1', 'A:w1', '1', 'yes'], ['2', 'B:r1', '1', 'yes'], ['3', 'C:r0', '1', 'NO (reads 0)'], ['alt', 'C:r0 first', '0', 'NO (B must precede C)']] },
      f: ['Is it causally consistent if C had previously seen B\'s result?', 'How does Raft ReadIndex prevent C\'s stale read?']
    })]
  });
  // ---------------------------------------------------------------- Topic 6
  topics.push({
    title: 'CAP and PACELC: The Trade-off, Stated Precisely',
    analogy: `<p>Two bank branches share one account book by phone. The phone line goes dead. A customer asks branch B to withdraw. B can <b>refuse</b> until the line is back (stay correct, lose availability) or <b>pay out</b> and fix things later (stay available, risk overdraft). And even on a normal day, calling the other branch before every withdrawal makes the queue slower: that everyday choice is the "ELC" in PACELC.</p>`,
    explain: `<p><b>CAP</b> (Brewer 2000, proved by Gilbert and Lynch 2002) is about three properties of a replicated data store:</p>
      <ul><li><b>C — Consistency</b>, meaning <b>linearizability</b> (not the "C" in ACID).</li><li><b>A — Availability</b>: every request to a non-failed node gets a non-error response (no time limit in the proof).</li><li><b>P — Partition tolerance</b>: the system keeps working while the network drops messages between groups of nodes.</li></ul>
      <p>The correct statement: <b>when a network partition happens, a system must choose between C and A</b>. You cannot "choose CA" in a distributed system, because partitions are not optional: they happen to you.</p>
      ${H.table(['During a partition', 'Behaviour', 'Examples'], [['CP', 'Minority side refuses (errors / timeouts) to avoid inconsistent answers', 'etcd, ZooKeeper, Spanner, HBase, MongoDB with majority writes'], ['AP', 'Both sides keep answering; replicas diverge, reconcile later', 'Cassandra, DynamoDB (default reads), Riak, DNS, CRDT apps']])}
      <p><b>PACELC</b> (Abadi 2010) adds the normal case: <b>if Partition, choose A or C; Else, choose Latency or Consistency</b>. Most of the time there is no partition, and the real everyday trade-off is: wait for replicas (consistent, slower) or answer locally (fast, maybe stale).</p>
      ${H.table(['System', 'PACELC', 'Why'], [['Cassandra / Dynamo (default)', 'PA/EL', 'Available in partitions, low latency normally'], ['Spanner, etcd', 'PC/EC', 'Always pays for consistency'], ['MongoDB (typical config)', 'PC/EC or PA/EC depending on read/write concerns', 'Tunable'], ['PNUTS (Yahoo)', 'PC/EL', 'Per-record master, fast local reads']])}
      <p>hld10 applies CAP/PACELC to real product features; here, focus on stating it precisely.</p>`,
    clues: ['"CP or AP?"', '"what happens during a network partition?"', '"we need to stay up even if a region is cut off"', '"strong consistency across regions with low latency" (a contradiction to point out)', '"tunable consistency"', '"PACELC"'],
    viz: {
      title: 'A partition: watch a CP and an AP system answer the same requests',
      input: 'write x=2 @B, read x @A, read x @B',
      inputLabel: 'Requests during the partition: "write x=<v> @A|B" or "read x @A|B" (comma separated)',
      gen: function (input) {
        var reqs = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!reqs.length || reqs.length > 6) throw new Error('Give 1-6 requests like "write x=2 @B, read x @A"');
        var nodes = [{ id: 'A1', label: 'A1', x: 10, y: 15, shape: 'box' }, { id: 'A2', label: 'A2', x: 10, y: 45, shape: 'box' }, { id: 'A3', label: 'A3', x: 30, y: 30, shape: 'box' }, { id: 'B1', label: 'B1', x: 75, y: 15, shape: 'box' }, { id: 'B2', label: 'B2', x: 75, y: 45, shape: 'box' }];
        var edges = [['A1', 'A2'], ['A2', 'A3'], ['A1', 'A3'], ['B1', 'B2'], ['A3', 'B1', 'cut'], ['A3', 'B2', 'cut']];
        var frames = [{ narr: 'Five replicas hold x = 1. The link between side A (3 nodes, a majority) and side B (2 nodes) is <b>cut</b>.', parts: [{ type: 'graph', label: 'Partition', nodes: nodes, edges: edges, ehl: { 'A3-B1': 'bad', 'A3-B2': 'bad' }, hl: { A1: 'win', A2: 'win', A3: 'win', B1: 'cur', B2: 'cur' }, height: 60 }] }];
        var cp = { A: 1, B: 1 }, ap = { A: 1, B: 1 }, rows = [];
        reqs.forEach(function (r) {
          var m = /^(write|read)\s+x(?:\s*=\s*(-?\d+))?\s*@\s*([AB])$/i.exec(r);
          if (!m) throw new Error('Bad request "' + r + '". Use "write x=2 @B" or "read x @A"');
          var op = m[1].toLowerCase(), v = m[2], side = m[3].toUpperCase(), cpRes, apRes;
          if (op === 'write') {
            if (v === undefined) throw new Error('write needs a value: write x=2 @B');
            if (side === 'A') { cp.A = +v; cpRes = 'OK (majority 3/5)'; } else cpRes = 'ERROR: no majority';
            ap[side] = +v; apRes = 'OK (local)';
          } else {
            cpRes = side === 'A' ? 'x = ' + cp.A : 'ERROR: no majority';
            apRes = 'x = ' + ap[side] + (ap.A !== ap.B ? ' (sides differ!)' : '');
          }
          rows.push([r, cpRes, apRes]);
          frames.push({ narr: '<b>' + H.esc(r) + '</b>. CP: ' + cpRes + '. AP: ' + apRes + '. ' + (side === 'B' ? 'Side B is the minority, so a CP system must refuse to stay linearizable.' : 'Side A has a majority, so both designs can serve it.'), parts: [
            { type: 'table', label: 'Responses', columns: ['Request', 'CP system', 'AP system'], rows: rows.map(function (x) { return x.slice(); }), hl: hlRow(rows.length - 1) },
            { type: 'vars', label: 'Values held', vals: { 'CP side A': cp.A, 'CP side B': cp.B, 'AP side A': ap.A, 'AP side B': ap.B }, hl: ap.A !== ap.B ? { 'AP side A': 'bad', 'AP side B': 'bad' } : {} }
          ] });
        });
        frames.push({ narr: 'Partition heals. CP: B nodes catch up from the majority log, no conflicts. AP: replicas exchange versions; concurrent writes must be <b>merged</b> (LWW, siblings, CRDT).', parts: [{ type: 'graph', label: 'Healed', nodes: nodes, edges: edges.slice(0, 4).concat([['A3', 'B1'], ['A3', 'B2']]), ehl: { 'A3-B1': 'ok', 'A3-B2': 'ok' }, height: 60 }] });
        return frames;
      }
    },
    examples: [
      { title: 'Why "CA" is not a real option', html: `<p>A single-node Postgres is "CA" only because it is not distributed. The moment you add a replica across a network, a partition can happen, and you must decide what the replica does: answer (A) or refuse (C).</p>` },
      { title: 'CAP availability is very strict', html: `<p>CAP's "A" means <b>every</b> non-failed node answers. A CP system like etcd with 5 nodes still serves clients on the 3-node majority side; it is only "unavailable" in the CAP sense because the 2 minority nodes refuse. In SLA terms that system may be 99.99% available. Don't mix CAP-availability with uptime.</p>` },
      { title: 'PACELC in numbers', html: `<p>Two regions 80 ms apart. A synchronous cross-region write costs at least one round trip ≈ <b>80 ms</b> extra on every write, even with no partition (EC). Writing locally and replicating async costs ~2 ms (EL) but a region loss can drop the last few hundred ms of writes.</p>` },
      { title: 'Per-feature choice', html: `<p>In one shopping app: inventory decrement and payment → CP; cart and product reviews → AP. CAP is chosen <b>per operation / per data type</b>, not per company.</p>` }
    ],
    deepDive: `<p><b>The proof sketch.</b> Two nodes G1, G2, partitioned. A client writes v1 to G1 (availability requires success). Another client then reads from G2 (availability requires an answer). G2 never heard about v1, so it returns the old value → not linearizable. Hence no algorithm gives all three during a partition.</p>
      <p><b>Criticisms.</b> Kleppmann's "Please stop calling databases CP or AP": CAP considers only one consistency model (linearizability) and one fault (partitions), ignoring latency, node crashes and the many in-between models. Most real systems are neither fully CP nor fully AP; many (e.g., default MongoDB in some configs, async-replicated Postgres with failover) are <b>neither</b> under some failure modes.</p>
      <p><b>Brewer's 2012 retrospective</b>: partitions are rare, so design for the partition <b>mode</b>: detect the partition, limit operations during it (e.g., allow withdrawals up to a cap), record intent, and run <b>partition recovery</b> (merge, compensate). This is how ATMs work: offline withdrawals up to a limit, reconciled later.</p>
      <p><b>Harvest and yield</b> (Fox and Brewer): instead of all-or-nothing, return partial results (lower harvest) to keep answering (higher yield) — e.g., search results from 9 of 10 shards.</p>`,
    aiEra: `<p><b>What AI changes:</b> global inference platforms make PACELC choices: a model registry or feature store read at request time can be served stale-but-fast from a local replica (EL), while billing/quota counters need consistency (EC) or bounded inconsistency.</p>
      <p><b>Use AI as a partner:</b> list your features and ask the AI to propose CP/AP and EL/EC per feature with reasons; then challenge each with "what does the user see during a partition?".</p>
      <p><b>Where AI goes wrong:</b> it often says "pick 2 of 3" and offers CA as an option, or equates CAP consistency with ACID consistency.</p>
      <p><b>What you must still own:</b> the precise one-liner: during a partition, choose linearizability or availability; otherwise choose latency or consistency.</p>`,
    problems: [mk({
      t: 'CP or AP for Each Feature of a Ride-Hailing App', l: 'Easy', tags: ['cap', 'pacelc'], co: ['Uber', 'Lyft'],
      s: `<p>Classify each and give the user-visible behaviour during a partition: (1) driver location updates, (2) assigning a ride to exactly one driver, (3) charging the rider, (4) showing estimated fares, (5) rider's trip history page.</p>`,
      ex: `<p>Driver location → ${H.c('y', 'AP / EL')}: a 2 s old position is fine; refusing updates would freeze the map.</p>`,
      b: `<p>"Everything CP to be safe": the map freezes and fares fail to load whenever a link flaps.</p>`,
      q: 'Assigning a ride to exactly one driver needs…', o: ['AP, conflicts resolved by LWW', 'CP: a linearizable compare-and-set on the ride', 'Eventual consistency with gossip', 'No replication'], a: 1,
      e: 'Two drivers both accepting is a uniqueness invariant; only a linearizable operation (or single-owner shard) prevents double assignment.',
      h: [`<p>Hint 1: Look for invariants like "exactly one" or "never twice".</p>`, `<p>Hint 2: If showing stale data is harmless, it can be AP.</p>`, `<p>Hint 3: Money needs CP or an idempotent, reconcilable flow.</p>`],
      ap: `<p>(1) Location: AP/EL, newest position wins, staleness of seconds acceptable. (2) Ride assignment: CP, linearizable conditional write <code>assign if driver_id is null</code> on the ride's owning shard; minority side returns "try again". (3) Charging: CP for the ledger plus an idempotency key per charge; if the payment service is unreachable, queue the charge durably and retry later (availability via deferral, not by double-charging). (4) Fare estimates: AP/EL, slightly stale pricing data acceptable (but lock the quoted fare with a signed token). (5) Trip history: AP/EL, eventual consistency fine; maybe read-your-writes for the just-finished trip.</p>`,
      cx: '<p>Five decisions; for each ask "what invariant breaks if two sides answer differently?".</p>',
      d: { head: ['Feature', 'Invariant?', 'Choice'], rows: [['Location', 'No', 'AP/EL'], ['Assignment', 'Exactly one', 'CP'], ['Charge', 'Never twice', 'CP + idempotency'], ['Fares', 'No (quote locked)', 'AP/EL'], ['History', 'No', 'AP/EL']] },
      f: ['How would surge pricing behave during a regional partition?', 'Where does PACELC change your choice when there is no partition?']
    })]
  });
  // ---------------------------------------------------------------- Topic 7
  topics.push({
    title: 'Leader Election & Consensus Basics: Majorities, Terms, Split Brain',
    analogy: `<p>A class must pick one captain, but students sit in separate rooms and pass notes. Rule: you are captain only if <b>more than half</b> of the class votes for you, and each student votes once per election round. Two captains would need two different majorities, but any two majorities share at least one student, who could not have voted twice. That single overlapping student is the whole trick of consensus.</p>`,
    explain: `<p><b>Consensus</b>: several nodes agree on one value (or one ordered log of values) even if some crash. Requirements:</p>
      <ul><li><b>Agreement</b>: no two nodes decide differently. <b>Validity</b>: the decided value was proposed by someone. <b>Termination</b>: non-faulty nodes eventually decide.</li></ul>
      <p>It is the core of leader election, locks, configuration stores, and replicated logs (etcd, ZooKeeper, Consul, Kafka KRaft, CockroachDB ranges).</p>
      <p><b>Majority quorums.</b> With N = 2f + 1 nodes you tolerate f crashes. Majority = ⌊N/2⌋ + 1. Two majorities always intersect, so two leaders can never both win the same round.</p>
      ${H.table(['N', 'Majority', 'Crashes tolerated'], [['3', '2', '1'], ['4', '3', '1 (no better than 3!)'], ['5', '3', '2'], ['7', '4', '3']])}
      <p><b>Terms / epochs.</b> Time is split into numbered terms. A candidate increments the term and asks for votes; each node votes at most once per term (persisted to disk). Anyone who sees a higher term steps down. Old leaders' messages carry an old term and are rejected.</p>
      <p><b>Split brain</b>: two nodes both act as leader (e.g., old leader paused, new one elected). Majority voting prevents two leaders <b>in the same term</b>; <b>fencing tokens</b> (the term number checked by storage) stop the stale one from doing damage.</p>
      <p><b>Simple election algorithms</b> (classic CS exams): <b>Bully</b> (highest-ID alive node wins; it bullies lower ones) and <b>Ring</b> (pass an election message around a ring collecting IDs). They assume reliable failure detection, so they can produce split brain under partitions; real systems use Raft or Paxos. Full Raft log replication, Paxos and ZooKeeper/etcd usage are in hld11.</p>`,
    clues: ['"how do you elect a leader?"', '"why an odd number of nodes?"', '"what if the old leader comes back?" / "zombie leader"', '"split brain"', '"how many failures can a 5-node cluster survive?"', '"replicated log" / "state machine replication"'],
    code: { lang: 'python', run: true, title: 'Majority election with terms, and why 2 candidates cannot both win (runnable)', code: `import random

def run_election(n, candidates, term, alive, seed):
    rng = random.Random(seed)
    voted_for = {}                         # node -> candidate, one vote per term
    votes = {c: 0 for c in candidates}
    # each candidate votes for itself first
    for c in candidates:
        voted_for[c] = c
        votes[c] += 1
    # other alive nodes receive requests in random order, vote for the first one
    for node in range(n):
        if node in candidates or node not in alive:
            continue
        order = candidates[:]
        rng.shuffle(order)
        voted_for[node] = order[0]
        votes[order[0]] += 1
    need = n // 2 + 1
    winners = [c for c in candidates if votes[c] >= need]
    print("term %d: votes=%s need=%d winners=%s" % (term, votes, need, winners or "none (split vote, retry with random timeout)"))
    return winners

n = 5
alive = {0, 1, 2, 3, 4}
for t, seed in enumerate([1, 2, 3, 4], start=1):
    w = run_election(n, [1, 3], t, alive, seed)
    assert len(w) <= 1, "two leaders in one term is impossible with majorities"

print()
alive = {0, 1}                              # 3 nodes crashed: no majority possible
run_election(n, [1], 9, alive, 0)
` },
    viz: {
      title: 'A Raft-style election: timeouts, votes and terms',
      input: '5, 2',
      inputLabel: 'N nodes (3-7), id of the first node to time out (0-based)',
      gen: function (input) {
        var t = String(input).split(/[\s,]+/).filter(Boolean).map(Number);
        if (t.length !== 2 || !Number.isInteger(t[0]) || !Number.isInteger(t[1]) || t[0] < 3 || t[0] > 7 || t[1] < 0 || t[1] >= t[0]) throw new Error('Enter N (3-7) and a starting node id 0..N-1, e.g. 5, 2');
        var n = t[0], c = t[1], need = Math.floor(n / 2) + 1, frames = [];
        var state = [], term = [];
        for (var i = 0; i < n; i++) { state.push('follower'); term.push(1); }
        state[0] = 'leader(dead)';
        function rows() { return state.map(function (s, k) { return ['N' + k, s, term[k]]; }); }
        frames.push({ narr: 'Term 1: N0 was leader and has crashed. Followers stop receiving heartbeats. Each waits a <b>random</b> election timeout (e.g. 150–300 ms) so they rarely time out together.', parts: [{ type: 'table', label: 'Cluster', columns: ['Node', 'Role', 'Term'], rows: rows(), hl: hlRow(0, 'bad') }] });
        if (c === 0) { c = 1; }
        state[c] = 'candidate'; term[c] = 2;
        frames.push({ narr: 'N' + c + ' times out first: becomes <b>candidate</b>, increments to <b>term 2</b>, votes for itself, persists that vote, and sends RequestVote to everyone.', parts: [{ type: 'table', label: 'Cluster', columns: ['Node', 'Role', 'Term'], rows: rows(), hl: hlRow(c) }, { type: 'vars', label: 'Votes', vals: { votes: 1, needed: need } }] });
        var votes = 1;
        for (var k = 1; k < n; k++) {
          if (k === c) continue;
          term[k] = 2; votes++; state[k] = 'follower (voted N' + c + ')';
          var hl = {}; hl[k] = 'ok';
          frames.push({ narr: 'N' + k + ' sees term 2 &gt; its term 1, adopts term 2, has not voted in term 2 and the candidate\'s log is at least as up to date → <b>grants vote</b>. Votes: ' + votes + '/' + need + '.', parts: [{ type: 'table', label: 'Cluster', columns: ['Node', 'Role', 'Term'], rows: rows(), hl: hl }, { type: 'vars', label: 'Votes', vals: { votes: votes, needed: need }, hl: { votes: votes >= need ? 'ok' : 'cur' } }] });
          if (votes >= need) break;
        }
        state[c] = 'LEADER';
        frames.push({ narr: 'Majority reached: N' + c + ' is <b>leader of term 2</b> and sends heartbeats at once. No other node can also get ' + need + ' votes in term 2, because any two majorities of ' + n + ' share a node and each node votes once per term.', parts: [{ type: 'table', label: 'Cluster', columns: ['Node', 'Role', 'Term'], rows: rows(), hl: hlRow(c, 'sel') }] });
        state[0] = 'leader? (term 1)';
        frames.push({ narr: 'N0 restarts still thinking it leads <b>term 1</b>. Its first message to anyone is rejected (1 &lt; 2); it learns term 2 and steps down to follower. Storage that checks the term as a <b>fencing token</b> also rejects any late term-1 write.', parts: [{ type: 'table', label: 'Cluster', columns: ['Node', 'Role', 'Term'], rows: rows(), hl: hlRow(0, 'bad') }] });
        state[0] = 'follower'; term[0] = 2;
        frames.push({ narr: 'Stable again: one leader, one term, everyone agrees.', parts: [{ type: 'table', label: 'Cluster', columns: ['Node', 'Role', 'Term'], rows: rows(), hl: hlRow(c, 'sel') }] });
        return frames;
      }
    },
    examples: [
      { title: 'Why not 4 nodes?', html: `<p>N = 4 → majority 3 → tolerates 1 failure, same as N = 3, but with one more machine to pay for and one more voter to wait for. With a 2–2 partition <b>neither</b> side has a majority. Use odd sizes: 3 or 5 (7 rarely; more nodes = slower commits).</p>` },
      { title: 'Split vote', html: `<p>N = 4 alive of 5, two candidates time out together and each gets 2 votes. Nobody reaches 3. Both time out again with new random timeouts; usually one starts clearly first next time and wins. Randomized timeouts are how Raft side-steps FLP in practice.</p>` },
      { title: 'Bully algorithm walk-through', html: `<p>Nodes 1–5, leader 5 crashes. Node 2 notices and sends ELECTION to 3, 4, 5. Nodes 3 and 4 reply OK and start their own elections. 4 gets no reply from 5, so 4 announces COORDINATOR. Problem: if 5 is only partitioned, 5 still thinks it leads → split brain. That is why production systems use majority-based consensus.</p>` },
      { title: 'Consensus ≈ replicated log', html: `<p>Agreeing on one value is "single-decree" consensus. Repeating it for slot 1, 2, 3, ... gives a <b>replicated log</b>; every replica applies the same commands in the same order and ends in the same state (<b>state machine replication</b>). A log entry is committed once a majority stores it.</p>` }
    ],
    deepDive: `<p><b>Why the up-to-date log check matters.</b> Raft only grants a vote if the candidate's last log entry has a higher term, or the same term and an index at least as large. Combined with "commit = stored on a majority", this guarantees the new leader already holds every committed entry (the election majority intersects the commit majority). This is the <b>Leader Completeness</b> property.</p>
      <p><b>Consensus equivalences.</b> Atomic (total-order) broadcast, linearizable compare-and-set, and consensus are equivalent problems: solve one and you can build the others. That is why a "simple" distributed lock or unique ID allocator ends up depending on etcd/ZooKeeper.</p>
      <p><b>Leases.</b> A leader can serve reads locally while it holds a time-based lease that followers promise not to break (no new election until it expires). Safe only under bounded clock drift; otherwise use ReadIndex (confirm leadership with a heartbeat round).</p>
      <p><b>Cost.</b> Every committed write = leader → majority round trip + fsync. Throughput grows with batching and pipelining, not with more nodes. Cross-region consensus adds a WAN RTT per commit (Spanner, CockroachDB place leaders near writers). <b>Byzantine</b> consensus (PBFT, Tendermint, HotStuff) needs 3f + 1 nodes and more message rounds.</p>`,
    aiEra: `<p><b>What AI changes:</b> distributed training and inference clusters elect coordinators (e.g., rendezvous in PyTorch elastic uses etcd or a c10d store), and agent orchestration platforms need exactly one scheduler running a job. Same majority + term + fencing pattern.</p>
      <p><b>Use AI as a partner:</b> ask it to play adversary: <code>Here is my leader election; give me an interleaving that produces two leaders</code>. It is decent at finding interleavings; verify with a model checker (TLA+) for real protocols.</p>
      <p><b>Where AI goes wrong:</b> it may suggest "use Redis SETNX with a TTL" as a correctness lock without fencing, or claim 4 nodes tolerate 2 failures.</p>
      <p><b>What you must still own:</b> the majority-intersection argument and why terms plus fencing defeat zombie leaders.</p>`,
    problems: [mk({
      t: 'Size the Cluster and Survive the Partition', l: 'Medium', tags: ['consensus', 'majority', 'leader election'], co: ['Google', 'Confluent'],
      s: `<p>You run a 5-node Raft cluster spread across racks: 2 in rack X, 2 in rack Y, 1 in rack Z. (a) How many node failures can it survive? (b) Rack X is partitioned from Y and Z: which side can elect a leader? (c) Would 6 nodes (2/2/2) be better? (d) The old leader was in rack X: what stops it from corrupting data?</p>`,
      ex: `<p>(a) Majority = 3 → survives ${H.c('g', '2 failures')}.</p>`,
      b: `<p>"More nodes is always more available" → 6 nodes: majority 4, still survives only 2, and a 3–3 split leaves no majority.</p>`,
      q: 'Rack X (2 nodes) is cut off from Y + Z (3 nodes). Who can elect a leader?', o: ['Rack X only', 'Y + Z only', 'Both sides', 'Neither'], a: 1,
      e: 'Y + Z have 3 of 5 = a majority; X has 2, which can never reach 3 votes.',
      h: [`<p>Hint 1: Majority of N is ⌊N/2⌋ + 1; work that out for N = 5 first.</p>`, `<p>Hint 2: Count nodes on each side of the cut.</p>`, `<p>Hint 3: The old leader cannot commit without a majority of acks, and its term is now stale.</p>`],
      ap: `<p>(a) Majority 3, so f = 2 failures. (b) Y + Z hold 3 nodes → they elect a new leader in a higher term; X's 2 nodes cannot reach 3 votes and stay leaderless (reads/writes there fail: CP). (c) 6 nodes: majority 4, still f = 2, and a rack failure (2 nodes) is fine but any 3–3 split stalls everything; worse latency too. Stick with 5. (d) The old leader in X cannot commit any new entry: commits need 3 acks and it can reach only 2. Clients see timeouts, not wrong answers. When the partition heals, it sees the higher term and steps down; its uncommitted entries are overwritten. External side effects (e.g., writing to a storage service) must carry the term as a fencing token so a stale leader is rejected.</p>`,
      cx: '<p>Arithmetic on N: majority = ⌊N/2⌋+1, failures tolerated = N − majority.</p>',
      d: { head: ['Setup', 'Majority', 'f', 'X cut off?'], rows: [['5 (2/2/1)', '3', '2', 'Y+Z elect'], ['6 (2/2/2)', '4', '2', 'Y+Z (4) elect'], ['6, 3–3 split', '4', '-', 'Nobody']] },
      f: ['Why must votedFor be fsynced before replying?', 'How does a learner / non-voting member help with cross-region reads?']
    })]
  });
  // ---------------------------------------------------------------- Topic 8
  topics.push({
    title: 'Idempotency, Retries & the Exactly-Once Myth',
    analogy: `<p>Pressing a lift button five times does not call five lifts: the button is <b>idempotent</b>. Handing a cashier a ₹500 note "again" because you are not sure they saw it the first time is <b>not</b>. Distributed systems retry constantly, so every important operation must behave like the lift button.</p>`,
    explain: `<p>Because of partial failure (topic 1) a client that hits a timeout does not know if its request was applied. It has two options:</p>
      ${H.table(['Delivery semantics', 'How', 'Risk'], [['At-most-once', 'Send once, never retry', 'Lost operations'], ['At-least-once', 'Retry until acknowledged', 'Duplicates'], ['Exactly-once (effect)', 'At-least-once delivery + idempotent / deduplicated processing', 'Needs careful design; never free']])}
      <p><b>The myth:</b> exactly-once <i>delivery</i> over an unreliable network is impossible (Two Generals). What systems actually provide is <b>exactly-once effect</b> (also called effectively-once): messages may arrive many times, but the <b>state change happens once</b>.</p>
      <p><b>Idempotent</b> operation: doing it twice has the same effect as once. <code>SET balance = 100</code>, <code>DELETE order 7</code>, <code>PUT /users/42</code> are idempotent; <code>balance += 10</code>, <code>POST /charges</code>, "append to list" are not.</p>
      <p><b>Idempotency keys</b> make non-idempotent operations safe to retry:</p>
      <ol><li>Client generates a unique key (UUID) per <b>logical</b> operation and sends it with every retry.</li><li>Server, in the <b>same transaction</b> as the effect, records <code>key → result</code>.</li><li>A repeated key returns the stored result without re-executing. A repeated key with a <b>different</b> payload is rejected.</li></ol>
      <p>Retries need <b>exponential backoff with jitter</b> (e.g., wait random(0, min(cap, base·2<sup>attempt</sup>))) and a retry budget, or the retries themselves cause an outage. hld11 covers outbox, Kafka transactions and exactly-once pipelines in system-design depth.</p>`,
    clues: ['"the client might retry" / "network timeout on payment"', '"exactly-once delivery"', '"duplicate messages from the queue"', '"user double-clicked Pay"', '"idempotency key" / "Idempotency-Key header"', '"retry storm" / "thundering herd"'],
    code: { lang: 'python', run: true, title: 'Retries with and without idempotency keys, plus backoff with jitter (runnable)', code: `import random, uuid

class PaymentServer:
    def __init__(self, lose_reply_on):
        self.balance = 0
        self.seen = {}                      # idempotency key -> (payload, stored result)
        self.calls = 0
        self.lose_reply_on = lose_reply_on  # which call numbers lose their reply

    def charge(self, amount, key=None):
        self.calls += 1
        if key is not None and key in self.seen:
            payload, result = self.seen[key]
            if payload != amount:
                raise ValueError("key reused with a different payload")
            reply = result                  # replay the stored answer, no new effect
        else:
            self.balance += amount          # the side effect
            reply = "charged %d, balance %d" % (amount, self.balance)
            if key is not None:
                self.seen[key] = (amount, reply)   # same transaction as the effect in real life
        if self.calls in self.lose_reply_on:
            raise TimeoutError("reply lost")       # the effect HAPPENED, client can't tell
        return reply

def client(server, amount, use_key, max_attempts=5, seed=7):
    rng = random.Random(seed)
    key = str(uuid.UUID(int=rng.getrandbits(128))) if use_key else None  # one key per logical op
    base, cap = 0.1, 2.0
    for attempt in range(max_attempts):
        try:
            return server.charge(amount, key)
        except TimeoutError:
            wait = rng.uniform(0, min(cap, base * 2 ** attempt))   # full jitter
            print("  attempt %d timed out, backing off %.3fs then retrying" % (attempt + 1, wait))
    raise RuntimeError("gave up")

for use_key in (False, True):
    s = PaymentServer(lose_reply_on={1, 2})
    print("With idempotency key:" if use_key else "Without idempotency key:")
    print("  result:", client(s, 50, use_key))
    print("  server balance:", s.balance, "(expected 50)")
    print()
` },
    viz: {
      title: 'Retry a charge whose replies get lost',
      input: '1, 2',
      inputLabel: 'Which attempt numbers lose their reply (comma separated, 1-5)',
      gen: function (input) {
        var lost = String(input).split(/[\s,]+/).filter(Boolean).map(Number);
        if (lost.some(function (x) { return !Number.isInteger(x) || x < 1 || x > 5; })) throw new Error('Give attempt numbers between 1 and 5, e.g. 1, 2');
        var frames = [], rowsA = [], rowsB = [], balA = 0, balB = 0, seen = false, doneA = false, doneB = false;
        frames.push({ narr: 'A client charges ₹50. Two servers: <b>Naive</b> just adds the amount; <b>Keyed</b> stores <code>key → result</code> with the charge. Replies on attempts [' + (lost.join(', ') || 'none') + '] are lost after the server already acted.', parts: [{ type: 'vars', label: 'Start', vals: { 'naive balance': 0, 'keyed balance': 0, 'key': 'k-7f3a' } }] });
        for (var a = 1; a <= 5 && !(doneA && doneB); a++) {
          var isLost = lost.indexOf(a) >= 0;
          if (!doneA) { balA += 50; rowsA.push(['#' + a, 'apply +50', isLost ? 'reply lost' : 'OK', balA]); if (!isLost) doneA = true; }
          if (!doneB) { var eff = seen ? 'replay stored result' : 'apply +50, save key'; if (!seen) { balB += 50; seen = true; } rowsB.push(['#' + a, eff, isLost ? 'reply lost' : 'OK', balB]); if (!isLost) doneB = true; }
          var backoff = Math.min(2, 0.1 * Math.pow(2, a - 1)).toFixed(2);
          frames.push({ narr: 'Attempt <b>' + a + '</b>: ' + (isLost ? 'the server acted but the reply was lost. The client sees a timeout and backs off up to ' + backoff + ' s (with jitter) before retrying with the <b>same key</b>.' : 'reply arrives; client stops.'), parts: [
            { type: 'table', label: 'Naive server', columns: ['Attempt', 'Server does', 'Client sees', 'Balance'], rows: rowsA.map(function (r) { return r.slice(); }), hl: hlRow(rowsA.length - 1, balA > 50 ? 'bad' : 'cur') },
            { type: 'table', label: 'Keyed server', columns: ['Attempt', 'Server does', 'Client sees', 'Balance'], rows: rowsB.map(function (r) { return r.slice(); }), hl: hlRow(rowsB.length - 1, 'ok') }
          ] });
        }
        frames.push({ narr: 'Result: naive server charged <b class="' + (balA > 50 ? 'c-r' : 'c-g') + '">₹' + balA + '</b>; keyed server charged <b class="c-g">₹' + balB + '</b>. At-least-once delivery + idempotent processing = exactly-once <i>effect</i>.', parts: [{ type: 'vars', label: 'Final', vals: { 'naive balance': balA, 'keyed balance': balB }, hl: { 'naive balance': balA > 50 ? 'bad' : 'ok', 'keyed balance': 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Idempotent or not?', html: `${H.table(['Operation', 'Idempotent?', 'Make it safe'], [['UPDATE users SET email = x WHERE id = 7', 'Yes', '-'], ['UPDATE acct SET bal = bal + 10', 'No', 'Idempotency key or record txn id with UNIQUE constraint'], ['INSERT order (no key)', 'No', 'Client-generated order id as primary key'], ['DELETE FROM cart WHERE id = 3', 'Yes', '-'], ['Send email', 'No', 'Outbox row with unique message id; mailer dedups']])}` },
      { title: 'Stripe-style Idempotency-Key header', html: `<p><code>POST /v1/charges</code> with <code>Idempotency-Key: 3f1c...</code>. A retry with the same key returns the <b>original</b> response (even an error) instead of charging again; keys expire after a retention window (Stripe: 24 h). The key is per <i>user intent</i>, so the client creates it when the user clicks Pay, not per HTTP attempt.</p>` },
      { title: 'Consumer dedup for at-least-once queues', html: `<p>SQS / Kafka consumers may see a message twice (crash after processing, before committing the offset). Store <code>processed_message_ids</code> in the same DB transaction as the business write: <code>INSERT ... ON CONFLICT DO NOTHING</code>; if 0 rows inserted, skip. Kafka's "exactly-once" (idempotent producer + transactions) covers Kafka-to-Kafka only; writes to an external DB still need this.</p>` },
      { title: 'Backoff with jitter numbers', html: `<p>base = 100 ms, cap = 2 s. Attempt 1 waits up to 100 ms, 2 up to 200, 3 up to 400, 4 up to 800, 5 up to 1600 ms, picked uniformly at random. Without jitter, 10,000 clients that failed together retry together, re-creating the spike.</p>` }
    ],
    deepDive: `<p><b>Atomicity of key + effect.</b> If you store the key after the effect in a separate step, a crash between them causes a duplicate on retry; if before, a crash leaves a key with no effect (return "in progress" and let it be completed or expire). Store both in one transaction, or use a state machine: key row created as <code>STARTED</code>, then <code>COMPLETED</code> with the response.</p>
      <p><b>Concurrent duplicates.</b> Two retries can arrive at once (client timed out early). Use a unique constraint or row lock on the key so only one executes; the other waits or returns 409 "in progress".</p>
      <p><b>Downstream calls.</b> If your handler calls a payment provider, pass a key derived from yours (e.g., the same UUID) so the provider dedups too. Idempotency must be end-to-end; one non-idempotent hop breaks the chain.</p>
      <p><b>Exactly-once in stream processors</b> (Flink, Kafka Streams) = deterministic processing + checkpointed state + transactional or idempotent sinks; replay after a failure produces the same outputs, and the sink discards duplicates. <b>Retry hygiene</b>: retry only on retryable errors (timeouts, 503, 429 with Retry-After), never on 400s; set per-request deadlines; budget retries (e.g., at most 10% extra load); avoid retrying at every layer (3 layers × 3 retries = 27x amplification).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents call tools autonomously and retry when a tool call errors or the model "forgets" it already acted. Tool APIs for agents (send email, create ticket, transfer funds) should require an idempotency key derived from the agent's step id, so replays and re-plans do not repeat side effects. Durable-execution engines (Temporal, workflow runtimes) record each step's result for exactly this reason.</p>
      <p><b>Use AI as a partner:</b> ask <code>List every non-idempotent side effect in this handler and how a retry duplicates it</code>.</p>
      <p><b>Where AI goes wrong:</b> it often generates a new UUID inside the retry loop (defeating the key), or claims Kafka gives exactly-once to any external database.</p>
      <p><b>What you must still own:</b> the sentence "at-least-once delivery plus idempotent processing gives an exactly-once effect" and where the key is stored atomically.</p>`,
    problems: [mk({
      t: 'Make "Transfer Money" Safe to Retry', l: 'Hard', tags: ['idempotency', 'exactly-once', 'retries'], co: ['Stripe', 'PayPal'],
      s: `<p>Mobile app calls <code>POST /transfer {from, to, amount}</code>. The server debits, credits, and calls a notification service. Users on flaky networks see timeouts and tap again; the app also auto-retries 3 times. Design the API and server so each user intent moves money exactly once, including when two retries arrive concurrently and when the server crashes mid-way.</p>`,
      ex: `<p>Tap at t=0 with key K. Reply lost. Auto-retry with K at t=1 s → server finds K = COMPLETED → returns original 200, ${H.c('g', 'no second transfer')}.</p>`,
      b: `<p>Check "has an identical transfer happened in the last minute?" by amount and accounts: blocks legitimate repeat transfers and still races under concurrency.</p>`,
      q: 'When should the client generate the idempotency key?', o: ['On every HTTP attempt', 'Once when the user confirms the transfer, reused for all retries', 'On the server', 'Never; use the timestamp'], a: 1,
      e: 'The key identifies the user intent; a new key per attempt makes each retry a new operation.',
      h: [`<p>Hint 1: Separate "user intent" from "network attempt".</p>`, `<p>Hint 2: Key, debit, credit and stored response must commit atomically.</p>`, `<p>Hint 3: Use a unique constraint for concurrent duplicates and an outbox for the notification.</p>`],
      ap: `<p>API: client creates UUID K when the user confirms and sends <code>Idempotency-Key: K</code> on every retry (persist K locally so an app restart reuses it). Server, in one DB transaction: <code>INSERT INTO idem(key, user, request_hash, status) VALUES (K, u, h, 'STARTED')</code> (unique on key+user; on conflict: if same hash and COMPLETED → return stored response; if STARTED → 409 retry later; if different hash → 422). Then debit/credit with a balance check, write an <b>outbox</b> row for the notification, update idem row to COMPLETED with the response, commit. A crash before commit rolls everything back, so a retry re-executes cleanly. Notification relay reads the outbox and calls the notifier with K as its dedup key (at-least-once + dedup). Clients retry with exponential backoff + jitter, only on timeouts/5xx/429. Expire keys after e.g. 24 h. Result: at-least-once delivery, exactly-once effect.</p>`,
      cx: '<p>One extra indexed insert/lookup per request; storage proportional to keys within the retention window.</p>',
      d: { head: ['Event', 'idem row', 'Money moved'], rows: [['Attempt 1 commits, reply lost', 'K COMPLETED', '1x'], ['Retry 1 (K)', 'found COMPLETED → replay', '1x'], ['Concurrent retry (K)', 'unique conflict → 409/replay', '1x'], ['Crash before commit', 'rolled back', '0x → retry runs once']] },
      f: ['How long should keys be kept, and what happens to a retry after expiry?', 'How does the outbox avoid the dual-write problem?']
    })]
  });
  // ---------------------------------------------------------------- Practice arena
  practice.push(mk({
    t: 'Majority Math for Cluster Sizes', l: 'Easy', tags: ['quorums', 'consensus'], co: ['Google', 'HashiCorp'],
    s: `<p>For N = 1, 2, 3, 4, 5, 6, 7 compute the majority size and the number of crash failures tolerated. Which sizes would you recommend for an etcd cluster and why?</p>`,
    ex: `<p>N = 5 → majority 3 → tolerates ${H.c('g', '2')}.</p>`,
    b: `<p>Assume "tolerates N/2 failures": gives 2 for N = 4, which is wrong (4 needs 3 alive).</p>`,
    q: 'How many failures does a 6-node majority cluster tolerate?', o: ['1', '2', '3', '4'], a: 1, e: 'Majority of 6 is 4, so only 2 may fail.',
    h: [`<p>Hint 1: Majority = ⌊N/2⌋ + 1, computed for each N separately.</p>`, `<p>Hint 2: Failures tolerated = N − majority.</p>`, `<p>Hint 3: Compare odd and even neighbours.</p>`],
    ap: `<p>Majority / tolerated: N=1: 1/0; N=2: 2/0; N=3: 2/1; N=4: 3/1; N=5: 3/2; N=6: 4/2; N=7: 4/3. Even sizes add cost and latency without extra fault tolerance and allow even splits with no majority. Recommend 3 (small, tolerates 1) or 5 (tolerates 2, e.g. one planned maintenance + one surprise failure). 7 only if needed: every commit then waits for 4 acks, and write latency grows with the slowest node in the majority.</p>`,
    cx: '<p>O(1) arithmetic per cluster size N.</p>', d: { head: ['N', 'Majority', 'f'], rows: [['3', '2', '1'], ['4', '3', '1'], ['5', '3', '2'], ['6', '4', '2'], ['7', '4', '3']] },
    f: ['Why does etcd discourage clusters larger than 7?', 'How do learners (non-voters) help?']
  }));
  practice.push(mk({
    t: 'Wall Clock or Monotonic Clock?', l: 'Easy', tags: ['clocks'], co: ['Meta', 'Amazon'],
    s: `<p>For each, pick wall-clock or monotonic time: (1) request timeout of 2 s, (2) "created_at" shown to users, (3) lease expiry check on the lease holder, (4) ordering two writes from different servers, (5) rate limiter refill interval.</p>`,
    ex: `<p>(1) Timeout → ${H.c('g', 'monotonic')}: an NTP step must not make it fire early or never.</p>`,
    b: `<p>Use <code>time.time()</code> everywhere: durations go negative when NTP steps the clock back.</p>`,
    q: 'Which clock is right for ordering writes from different servers?', o: ['Wall clock', 'Monotonic clock', 'Neither alone: use logical/hybrid clocks or a single sequencer', 'CPU cycle counter'], a: 2,
    e: 'Monotonic clocks are per-machine and not comparable across machines; wall clocks are skewed.',
    h: [`<p>Hint 1: Monotonic clocks measure durations on one machine only.</p>`, `<p>Hint 2: Humans need wall-clock dates and time zones.</p>`, `<p>Hint 3: Cross-machine ordering is a trick question.</p>`],
    ap: `<p>(1) Monotonic: durations must not jump. (2) Wall clock (UTC), formatted in the user's zone: it is for humans. (3) Monotonic on the holder, started <b>before</b> sending the lease request and with a safety margin for drift, so the holder believes the lease expires earlier than the grantor does. (4) Neither: monotonic values are meaningless across machines and wall clocks are skewed; use a sequencer/leader, Lamport or hybrid logical clocks, or version numbers. (5) Monotonic: refill based on elapsed time.</p>`,
    cx: '<p>Five independent decisions.</p>', f: ['What does CLOCK_MONOTONIC do during suspend?', 'Why start the lease timer before sending the request?']
  }));
  practice.push(mk({
    t: 'Name the Consistency Guarantee', l: 'Easy', tags: ['consistency models', 'session guarantees'], co: ['LinkedIn', 'Twitter'],
    s: `<p>Name the guarantee each requirement needs: (1) "after I change my avatar I must see the new one", (2) "the like count must never go down between my refreshes", (3) "replies never appear before the post they reply to", (4) "once a username is taken nobody else can register it", (5) "the trending list may be a minute stale".</p>`,
    ex: `<p>(1) → ${H.c('b', 'read-your-writes')}.</p>`,
    b: `<p>"Strong consistency everywhere": correct but expensive and unavailable during partitions.</p>`,
    q: 'Unique usernames require…', o: ['Eventual consistency', 'Monotonic reads', 'Linearizable compare-and-set (or a single owner)', 'Causal consistency'], a: 2,
    e: 'Uniqueness is a check-then-act invariant across concurrent clients: it needs linearizability/consensus.',
    h: [`<p>Hint 1: Session guarantees are about one user's view.</p>`, `<p>Hint 2: "Never appears before" is about cause and effect.</p>`, `<p>Hint 3: Invariants across users need coordination.</p>`],
    ap: `<p>(1) Read-your-writes (session guarantee): route the user's reads to the leader or a replica caught up to their last write position. (2) Monotonic reads: sticky replica or "seen version" token. (3) Causal consistency: a reply's dependency (the post) must be visible first. (4) Linearizability: a conditional insert / unique constraint on one authoritative copy or via consensus. (5) Eventual consistency: cache with a TTL is fine. Pick the weakest model that meets each requirement; it is cheaper and more available.</p>`,
    cx: '<p>Five mappings from requirement to model.</p>', f: ['Which of these survive a network partition with both sides answering?']
  }));
  practice.push(mk({
    t: 'Is This Operation Idempotent?', l: 'Easy', tags: ['idempotency'], co: ['Stripe', 'Shopify'],
    s: `<p>Classify and fix: (1) <code>PUT /users/7 {name}</code>, (2) <code>POST /orders</code>, (3) <code>UPDATE stock SET qty = qty − 1</code>, (4) <code>DELETE /sessions/abc</code>, (5) Kafka consumer that appends a row to an audit table per message.</p>`,
    ex: `<p>(3) not idempotent: two retries sell two items. Fix: record the order id with the decrement under a unique constraint.</p>`,
    b: `<p>"HTTP method decides it": POST can be made idempotent with keys and PUT handlers can be written non-idempotently.</p>`,
    q: 'DELETE /sessions/abc returns 200 then 404 on retry. Is it idempotent?', o: ['No, responses differ', 'Yes, the server state after 1 or 2 calls is the same', 'Only with a key', 'Only over HTTPS'], a: 1,
    e: 'Idempotency is about the effect on state, not identical responses.',
    h: [`<p>Hint 1: Run it twice in your head and compare final state.</p>`, `<p>Hint 2: Increments and appends are the usual culprits.</p>`, `<p>Hint 3: Fix with a unique id from the caller or the message.</p>`],
    ap: `<p>(1) Idempotent: sets absolute state. (2) Not idempotent: each POST creates a new order; fix with a client-generated order id or Idempotency-Key header. (3) Not idempotent: relative change; fix by storing <code>(order_id)</code> in a processed table in the same transaction, or make it conditional (<code>WHERE version = v</code>). (4) Idempotent in effect: second call finds nothing to delete (response may be 404; that's fine). (5) Not idempotent under redelivery: add the message id (topic, partition, offset or producer id) as a unique key and use INSERT ... ON CONFLICT DO NOTHING.</p>`,
    cx: '<p>Constant-time reasoning per operation.</p>', f: ['Is "send push notification" idempotent? How do you dedup it?']
  }));
  practice.push(mk({
    t: 'Order the Chat Messages with Lamport Clocks', l: 'Medium', tags: ['lamport', 'total order'], co: ['Discord', 'Slack'],
    s: `<p>Three servers, Lamport clocks start at 0. S1 posts m1. S2 posts m2. S1's m1 reaches S3, then S3 posts m3 replying to m1. S2 receives m3 then posts m4. Compute the Lamport stamps (each post is a send event; each arrival a receive) and give a total order using (L, server id). Does it respect "reply after the message it replies to"?</p>`,
    ex: `<p>m1: S1 L=1. m2: S2 L=1. S3 receives m1: max(0,1)+1 = 2; posts m3: L = 3.</p>`,
    b: `<p>Order by arrival time at one server: different servers would show different orders.</p>`,
    q: 'm1 and m2 both have L = 1. How are they ordered?', o: ['Randomly', 'By server id tie-break: (1,S1) before (1,S2)', 'They cannot be ordered', 'By wall clock'], a: 1,
    e: 'Ties are broken deterministically by process id; since they are concurrent, any consistent choice is fine.',
    h: [`<p>Hint 1: Tick before each send; max+1 on each receive.</p>`, `<p>Hint 2: S2 receives m3 (L=3) before posting m4.</p>`, `<p>Hint 3: Sort all messages by the pair (L, server id).</p>`],
    ap: `<p>m1 = (1, S1). m2 = (1, S2). S3 receives m1 → 2, sends m3 = (3, S3). S2 receives m3: max(1, 3) + 1 = 4, sends m4 = (5, S2). Total order: m1 (1,S1), m2 (1,S2), m3 (3,S3), m4 (5,S2). Causality holds: m1 → m3 → m4 and their stamps increase. m2 is concurrent with m1 and m3, and its position is just the tie-break. Caveat: to <b>display</b> in this order safely, a server must know no smaller stamp can still arrive (wait for higher stamps from all servers), or use a sequencer/consensus log.</p>`,
    cx: '<p>O(E) to stamp, O(E log E) to sort.</p>', d: { head: ['Msg', 'Server', 'L'], rows: [['m1', 'S1', '1'], ['m2', 'S2', '1'], ['m3', 'S3', '3'], ['m4', 'S2', '5']] },
    f: ['Would vector clocks tell you m2 ∥ m3?', 'How does a single sequencer change this?']
  }));
  practice.push(mk({
    t: 'Detect Conflicts with Version Vectors', l: 'Medium', tags: ['vector clocks', 'conflicts'], co: ['Amazon', 'Riak'],
    s: `<p>A key is replicated on A, B, C. Versions seen by a reader: v1 = [A:2, B:1, C:0], v2 = [A:2, B:2, C:0], v3 = [A:1, B:1, C:3]. Which versions can be discarded and which are siblings that must be merged?</p>`,
    ex: `<p>v1 ≤ v2 entry-wise → v1 is an ancestor of v2, ${H.c('m', 'discard v1')}.</p>`,
    b: `<p>Keep the version with the largest sum of counters: v3 (5) beats v2 (4) and loses v2's update.</p>`,
    q: 'v2 = [2,2,0] vs v3 = [1,1,3]:', o: ['v2 → v3', 'v3 → v2', 'Concurrent: siblings', 'Equal'], a: 2, e: 'v2 has bigger A and B, v3 bigger C: incomparable.',
    h: [`<p>Hint 1: Compare the vectors entry by entry, slot by slot.</p>`, `<p>Hint 2: Dominated versions are obsolete.</p>`, `<p>Hint 3: Merged write gets the entry-wise max plus a tick at the writer.</p>`],
    ap: `<p>v1 [2,1,0] ≤ v2 [2,2,0] → v1 is obsolete. v2 vs v3: A 2&gt;1, C 0&lt;3 → concurrent; v1 vs v3: A 2&gt;1, C 0&lt;3 → concurrent but v1 is already dominated. Return siblings {v2, v3} to the client. The client merges (e.g., set union for a cart) and writes back with context max = [2,2,3]; if coordinated by A, the new version is [3,2,3], which dominates both, so replicas drop the siblings. LWW would pick one and silently lose the other.</p>`,
    cx: '<p>O(N) per pairwise comparison, O(k² N) for k versions.</p>', f: ['What is a dotted version vector and which false conflicts does it fix?']
  }));
  practice.push(mk({
    t: 'Read-Your-Writes on Async Replicas', l: 'Medium', tags: ['replication lag', 'session guarantees'], co: ['Meta', 'Instagram'],
    s: `<p>A Postgres primary with 3 async read replicas, lag usually 50 ms but up to 5 s. After editing their bio, users sometimes see the old one. Give three ways to guarantee read-your-writes without sending all reads to the primary.</p>`,
    ex: `<p>Write at LSN 1000; a replica at LSN 990 must not serve this user's profile read.</p>`,
    b: `<p>Sleep 5 s after every write. Slow and still not guaranteed.</p>`,
    q: 'Which technique uses the log position?', o: ['Sticky sessions', 'Return the write LSN to the client; replicas serve the read only once replayed ≥ that LSN', 'Increase replica count', 'Use LWW'], a: 1,
    e: 'Causal tokens: the client carries "at least this version", and the replica waits or redirects.',
    h: [`<p>Hint 1: Only the writer's own reads need the guarantee.</p>`, `<p>Hint 2: The primary's log position is a version number.</p>`, `<p>Hint 3: Time-window routing is a cheap fallback.</p>`],
    ap: `<p>(1) <b>LSN token</b>: after the write, return the commit LSN (pg_current_wal_lsn) in a cookie; reads go to a replica whose <code>pg_last_wal_replay_lsn()</code> ≥ token, else wait briefly or fall back to primary. (2) <b>Time-window routing</b>: for N seconds after a user writes, route that user's reads of their own data to the primary (N above p99 lag; monitor lag and widen). (3) <b>Read from primary for own profile only</b>, replicas for everyone else's. Optionally (4) semi-sync replication to one replica and pin the user to it. All three keep replica offload for the 99% of reads that are not "my just-written data".</p>`,
    cx: '<p>One extra comparison per read; LSN tokens add a few bytes per session.</p>', f: ['How do you give monotonic reads across a replica failover?']
  }));
  practice.push(mk({
    t: 'Retry Storm After a 30-Second Outage', l: 'Medium', tags: ['retries', 'backoff'], co: ['Netflix', 'AWS'],
    s: `<p>A service with 10,000 clients goes down for 30 s. Clients retry every 1 s without jitter, up to 10 times, and three layers (app, SDK, sidecar) each retry 3 times. Estimate the load spike at recovery and redesign the retry policy.</p>`,
    ex: `<p>3 layers × 3 attempts = up to ${H.c('r', '27 requests')} per user action.</p>`,
    b: `<p>"Retries make us more reliable, add more": they turn a brief outage into a sustained overload (metastable failure).</p>`,
    q: 'What does jitter fix?', o: ['Total retry count', 'Synchronized retries arriving at the same instant', 'Idempotency', 'Timeout length'], a: 1, e: 'Randomized waits spread retries over time.',
    h: [`<p>Hint 1: Multiply the retry counts across all the layers.</p>`, `<p>Hint 2: All clients failed at the same time, so fixed intervals align them.</p>`, `<p>Hint 3: Backoff, jitter, budget, single retry layer, circuit breaker.</p>`],
    ap: `<p>Spike: at recovery every client fires in the same second; with layered retries, each user action can become up to 27 requests, so the server may see 10,000 × several requests at once, exceed capacity, fail again, and stay down (metastable). Redesign: retry at <b>one</b> layer only; exponential backoff with full jitter (random(0, min(cap, base·2<sup>n</sup>))); a <b>retry budget</b> (e.g., retries ≤ 10% of requests per client, token bucket); honour Retry-After/429; circuit breaker that stops calling for a cool-down after consecutive failures; deadlines so retries don't outlive the user's request; server-side load shedding and admission control. Retry only idempotent or keyed operations.</p>`,
    cx: '<p>Retry amplification = product of attempts per layer.</p>', f: ['What is a metastable failure?', 'How does a circuit breaker\'s half-open state work?']
  }));
  practice.push(mk({
    t: 'Explain the Zombie Leader and Fix It', l: 'Medium', tags: ['leader election', 'fencing'], co: ['Confluent', 'Databricks'],
    s: `<p>Leader L1 (term 7) takes a 15 s GC pause. The cluster elects L2 (term 8), which writes block X to shared storage. L1 wakes and, unaware, writes its stale version of block X. Explain why majority voting alone did not prevent this and fix it.</p>`,
    ex: `<p>Storage accepts L1's write → block X ${H.c('r', 'corrupted')} although only one leader per term existed.</p>`,
    b: `<p>"Make the GC pause shorter": pauses also come from VM migration, swapping, and SIGSTOP; you cannot bound them.</p>`,
    q: 'What does a fencing token do?', o: ['Encrypts writes', 'Lets storage reject writes carrying a token older than one it has already seen', 'Shortens GC', 'Elects leaders faster'], a: 1, e: 'Storage tracks the highest token; stale ones are refused.',
    h: [`<p>Hint 1: Elections are safe; the external side effect is not checked.</p>`, `<p>Hint 2: The term number is monotonically increasing.</p>`, `<p>Hint 3: Storage must compare tokens itself.</p>`],
    ap: `<p>Majority voting ensures one leader <b>per term</b>, but L1 does not know term 8 exists; storage outside the consensus group accepts any write. Fix: every write carries the leader's term (fencing token). Storage remembers the max token seen per resource and rejects writes with a smaller token: L2 wrote with 8, so L1's write with 7 is rejected and L1 learns it is stale and steps down. Alternatively make storage itself part of consensus (writes go through the replicated log) or use conditional writes (compare-and-set on a version). Leases with timeouts help but cannot replace fencing because pauses are unbounded.</p>`,
    cx: '<p>One integer comparison per write at the storage.</p>', f: ['Which Kafka concept plays the role of fencing tokens? (leader epoch / producer epoch)']
  }));
  practice.push(mk({
    t: 'Find the Linearizability Violation', l: 'Hard', tags: ['linearizability'], co: ['Jepsen', 'CockroachDB'],
    s: `<p>Register starts at 0. A: write 5 [0, 3]. B: read → 5 [1, 2]. C: write 7 [4, 6]. D: read → 5 [7, 8]. E: read → 7 [9, 10]. Is the history linearizable? If not, which reads are the problem, and what kind of bug could produce it?</p>`,
    ex: `<p>C's write of 7 finished at 6, D started at 7 and saw 5.</p>`,
    b: `<p>Check only that each read value was written by some write: passes, but ignores real time.</p>`,
    q: 'Which read is impossible in a linearizable register?', o: ['B reading 5', 'D reading 5', 'E reading 7', 'None'], a: 1, e: 'After C:w7 completed, no write of 5 occurs, so later reads must see 7.',
    h: [`<p>Hint 1: Draw the intervals on a time line.</p>`, `<p>Hint 2: Which writes have completed before D starts?</p>`, `<p>Hint 3: Then E reading 7 after D read 5 is a monotonic-read issue too.</p>`],
    ap: `<p>Real-time order: A ends 3 &lt; C starts 4, so A:w5 precedes C:w7; C ends 6 &lt; D starts 7, so C precedes D. In any legal order, D comes after w7 and no later write sets 5, so D must read 7. <b>Not linearizable</b>; the culprit is D:r5. B (overlapping A) and E are fine. Likely bug: D read from a lagging replica (async follower, or quorum read without read repair, or a stale leader serving reads without a lease/ReadIndex). It is still sequentially consistent (order A, B, D, C, E if D is a different client from C). Fix: linearizable reads via the leader with ReadIndex or lease, or quorum reads with write-back.</p>`,
    cx: '<p>Brute force over 5! orders with pruning is trivial; Porcupine-style search for big histories.</p>',
    code: { lang: 'python', run: true, code: `from itertools import permutations
h = [("A:w5","w",5,0,3),("B:r5","r",5,1,2),("C:w7","w",7,4,6),("D:r5","r",5,7,8),("E:r7","r",7,9,10)]
def ok(order):
    pos = {o[0]: i for i, o in enumerate(order)}
    if any(pos[a[0]] > pos[b[0]] for a in h for b in h if a[4] < b[3]):
        return False
    v = 0
    for n, k, x, s, e in order:
        if k == "w":
            v = x
        elif x != v:
            return False
    return True
print("linearizable" if any(ok(p) for p in permutations(h)) else "NOT linearizable")
` },
    f: ['How would you collect such histories from a real database under faults (Jepsen)?']
  }));
  practice.push(mk({
    t: 'Exactly-Once Payment Pipeline From a Queue', l: 'Hard', tags: ['exactly-once', 'idempotency', 'queues'], co: ['Stripe', 'Uber'],
    s: `<p>Orders arrive on an at-least-once queue. A worker charges the card via an external PSP, writes the result to Postgres and acks the message. Crashes can happen between any two steps. Design so each order is charged exactly once and recorded exactly once.</p>`,
    ex: `<p>Worker charges, crashes before DB write → message redelivered → naive worker ${H.c('r', 'charges again')}.</p>`,
    b: `<p>Use the queue's "exactly-once" setting: it dedups delivery within the broker, not your PSP call or DB write.</p>`,
    q: 'Which key should be sent to the PSP?', o: ['A new UUID per attempt', 'A key derived from the order id', 'The queue offset of the latest delivery', 'None'], a: 1, e: 'Every redelivery of the same order must map to the same PSP idempotency key.',
    h: [`<p>Hint 1: List each crash point and what is redone.</p>`, `<p>Hint 2: Make the external call idempotent with a stable key.</p>`, `<p>Hint 3: Make the DB write conditional on order id; ack last.</p>`],
    ap: `<p>Crash points: (a) before charge → redelivery charges once: fine. (b) after charge, before DB → redelivery charges again unless the PSP dedups: send <code>Idempotency-Key = order_id</code> so the PSP returns the original result. (c) after DB, before ack → redelivery: worker first checks <code>payments</code> table (unique on order_id); if present, just ack. DB write: <code>INSERT ... ON CONFLICT (order_id) DO NOTHING</code> in one transaction with any state changes. Ack only after commit. Optionally record a <code>PENDING</code> row before calling the PSP and reconcile stuck PENDING rows with the PSP's API (query by idempotency key). Outcome: at-least-once delivery, exactly-once effect on both the card and the DB.</p>`,
    cx: '<p>One unique-index lookup and one idempotent PSP call per message.</p>', f: ['What if the PSP\'s idempotency window (24 h) is shorter than your max redelivery delay?']
  }));
  practice.push(mk({
    t: 'CAP Claims Review: Spot the Errors', l: 'Hard', tags: ['cap', 'pacelc', 'consistency models'], co: ['Google', 'Microsoft'],
    s: `<p>A design doc says: (1) "We chose CA since partitions are rare." (2) "Our Cassandra cluster with QUORUM reads/writes is linearizable." (3) "etcd is unavailable during partitions, so it's useless for HA." (4) "Kafka gives exactly-once, so the email sender needs no dedup." (5) "We use NTP so last-write-wins is safe." Correct each.</p>`,
    ex: `<p>(1) There is no CA for a distributed system: partitions will happen; you must decide what happens then.</p>`,
    b: `<p>Accept the doc because each sentence sounds familiar.</p>`,
    q: 'Why is (2) wrong?', o: ['QUORUM is eventual', 'Quorum overlap does not stop non-linearizable reads concurrent with writes, and LWW timestamps can drop writes', 'Cassandra has no quorums', 'Linearizability needs 7 nodes'], a: 1,
    e: 'Without read repair before returning, and with timestamp-based conflict resolution, quorums alone are not linearizable (Cassandra LWT/Paxos is needed).',
    h: [`<p>Hint 1: CAP's P is not optional in a real network.</p>`, `<p>Hint 2: Quorums ≠ linearizability; clocks ≠ ordering.</p>`, `<p>Hint 3: Exactly-once is scoped to a system boundary.</p>`],
    ap: `<p>(1) No CA in distributed systems: choose per operation what happens in a partition (refuse or diverge) and what latency you pay otherwise (PACELC). (2) QUORUM gives overlap, not linearizability: concurrent reads may flip between old and new values, sloppy quorums/hinted handoff and LWW timestamps break it; use lightweight transactions (Paxos) for linearizable compare-and-set. (3) etcd stays available on the majority side; only minority nodes refuse. HA comes from majority survival (tolerates f of 2f+1). (4) Kafka EOS covers read-process-write inside Kafka; the email side effect still needs idempotent sending (dedup by message id). (5) NTP bounds skew to ms, not zero; concurrent or close writes can still be lost; use versions/CAS, HLCs or CRDTs.</p>`,
    cx: '<p>Five corrections, each one precise definition.</p>', f: ['Rewrite claim (1) as a correct PACELC statement for the system.']
  }));
  practice.push(mk({
    t: 'Design a Distributed Unique ID Allocator With No Duplicates', l: 'Hard', tags: ['consensus', 'clocks', 'idempotency'], co: ['Twitter', 'Instagram'],
    s: `<p>Need 64-bit IDs, roughly time-ordered, 50k IDs/s per node, 200 nodes, no duplicates ever, including across node restarts and clock jumps backwards. Compare (a) Snowflake-style (timestamp | worker id | sequence), (b) a central counter in a consensus store, (c) range leasing from a consensus store.</p>`,
    ex: `<p>Snowflake: 41 bits ms timestamp, 10 bits worker, 12 bits sequence (4096/ms per node).</p>`,
    b: `<p>Random 64-bit IDs: birthday collisions become likely around 2<sup>32</sup> ≈ 4 billion IDs.</p>`,
    q: 'Snowflake node sees its clock go back 5 ms. Safest action?', o: ['Continue with the smaller timestamp', 'Wait until the clock passes the last used timestamp (or refuse)', 'Reset sequence to 0', 'Switch worker id'], a: 1,
    e: 'Reusing an old timestamp with the same worker id may regenerate an already-issued ID.',
    h: [`<p>Hint 1: Uniqueness needs a component no two nodes share.</p>`, `<p>Hint 2: Worker ids themselves must be assigned uniquely (consensus once).</p>`, `<p>Hint 3: Handle clock regression and restarts explicitly.</p>`],
    ap: `<p>(a) Snowflake: uniqueness comes from (worker id, timestamp, sequence). Worker ids must be unique: lease them from etcd/ZooKeeper (ephemeral node + fencing) so two processes never share one. On clock going backwards: wait until it passes the last issued ms or refuse; persist "last timestamp" periodically so a restart with a lagging clock also waits. Sequence overflow in a ms → wait for next ms. Roughly time-ordered across nodes only within clock skew. (b) Central consensus counter: perfectly ordered and unique but every ID is a consensus round (~ms), cannot do 10M/s. (c) Range leasing: each node atomically grabs a block (e.g., 100k IDs) via CAS in etcd, hands them out locally; a crash wastes the rest of its block (fine). Unique and fast, but not time-ordered. Choose (a) for time-sortable IDs, (c) when density/order don't matter.</p>`,
    cx: '<p>(a) O(1) local; (b) one consensus round per ID; (c) one consensus round per block.</p>', f: ['How do UUIDv7 IDs compare?']
  }));
  // ---------------------------------------------------------------- Quiz
  quiz.push({ q: 'A client sends a request and times out. What can it conclude?', options: ['The server crashed', 'The request was lost', 'Nothing certain: the request may or may not have been applied', 'The reply was lost'], answer: 2, explain: 'Lost request, crash before/after applying, lost reply and slowness all look identical to the client.' });
  quiz.push({ q: 'How many nodes are needed to tolerate f = 2 Byzantine faults?', options: ['3', '5', '7', '9'], answer: 2, explain: 'Byzantine fault tolerance needs 3f + 1 = 7 nodes.' });
  quiz.push({ q: 'A clock drifts at 50 ppm. Roughly how far off is it after one day without sync?', options: ['0.05 s', '4.3 s', '50 s', '43 ms'], answer: 1, explain: '50 µs/s × 86,400 s ≈ 4.32 s.' });
  quiz.push({ q: 'Which clock should measure a request timeout?', options: ['Wall clock', 'Monotonic clock', 'Lamport clock', 'Vector clock'], answer: 1, explain: 'Monotonic time never jumps backwards when NTP adjusts the wall clock.' });
  quiz.push({ q: 'P has Lamport clock 4 and receives a message stamped 9. Its new clock is…', options: ['9', '10', '5', '13'], answer: 1, explain: 'Receive rule: max(4, 9) + 1 = 10.' });
  quiz.push({ q: 'L(a) &lt; L(b) for Lamport timestamps. Which is true?', options: ['a happened before b', 'b cannot have happened before a', 'a and b are concurrent', 'a and b are on the same process'], answer: 1, explain: 'If b → a then L(b) &lt; L(a), contradiction; but a may be concurrent with b.' });
  quiz.push({ q: 'Vector clocks [3,1,0] and [2,2,0] are…', options: ['first → second', 'second → first', 'concurrent', 'equal'], answer: 2, explain: '3 &gt; 2 in slot 0 but 1 &lt; 2 in slot 1: incomparable.' });
  quiz.push({ q: 'N = 5, W = 2. What is the smallest R that guarantees reads overlap the latest write?', options: ['2', '3', '4', '5'], answer: 2, explain: 'Need R + W &gt; N: R &gt; 3, so R = 4.' });
  quiz.push({ q: 'Which model allows the order of concurrent writes to differ between observers but never shows an effect before its cause?', options: ['Linearizable', 'Sequential', 'Causal', 'Strict serializable'], answer: 2, explain: 'Causal consistency orders only causally related operations.' });
  quiz.push({ q: 'Linearizability differs from serializability mainly because it…', options: ['Applies to multi-object transactions', 'Respects real-time order of single operations on an object', 'Allows stale reads', 'Requires vector clocks'], answer: 1, explain: 'Linearizability is a real-time, single-object guarantee; serializability is about transactions and need not respect real time.' });
  quiz.push({ q: 'In CAP, the "C" means…', options: ['ACID consistency', 'Linearizability', 'Eventual consistency', 'Constraint checking'], answer: 1, explain: 'Gilbert and Lynch formalized C as linearizability (atomic consistency).' });
  quiz.push({ q: 'A system that waits for cross-region replication on every write even without partitions is, in PACELC terms…', options: ['PA/EL', 'PC/EC', 'PA/EC with no latency cost', 'CA'], answer: 1, explain: 'It chooses consistency in the else case (EC), paying latency.' });
  quiz.push({ q: 'A 4-node majority-based cluster tolerates how many crash failures?', options: ['0', '1', '2', '3'], answer: 1, explain: 'Majority of 4 is 3, so only 1 node may fail, the same as 3 nodes.' });
  quiz.push({ q: 'What prevents a paused old leader from overwriting data in external storage after a new leader is elected?', options: ['Shorter heartbeats', 'Fencing tokens checked by the storage', 'Larger clusters', 'Vector clocks on clients'], answer: 1, explain: 'Storage rejects writes whose token (term) is older than one already seen.' });
  quiz.push({ q: 'Exactly-once effect in practice is achieved by…', options: ['Exactly-once delivery over TCP', 'At-least-once delivery plus idempotent or deduplicated processing', 'At-most-once delivery', 'Longer timeouts'], answer: 1, explain: 'Messages may repeat; the state change is made idempotent so it applies once.' });
  quiz.push({ q: 'Where should a client create the idempotency key for a payment?', options: ['Inside the retry loop, per attempt', 'Once per user intent, reused on every retry', 'On the server after the charge', 'From the current timestamp'], answer: 1, explain: 'The key names the logical operation, so every retry must carry the same one.' });

  // ---------------------------------------------------------------- Interview
  interview.push({ q: 'Why are distributed systems hard? Give the core reasons in an interview-ready way.', level: 'B', a: `<p>Three root causes. (1) <b>Partial failure</b>: some nodes or links fail while others run, and you must keep working. (2) <b>Unreliable, asynchronous network</b>: messages can be lost, delayed, duplicated or reordered, so a timeout cannot distinguish a dead node from a slow one, nor tell whether a request was applied. (3) <b>No global clock</b>: clocks drift and skew, so timestamps from different machines cannot reliably order events. Consequences: we need idempotent retries, failure detectors that may be wrong, logical clocks for ordering, quorums/consensus for agreement, and explicit consistency models. FLP shows deterministic consensus cannot be guaranteed to terminate in a fully asynchronous system with one crash, so practical protocols keep safety always and achieve liveness under partial synchrony.</p>`, followUps: ['What is the Two Generals problem?', 'What is the difference between crash-stop and crash-recovery?'] });
  interview.push({ q: 'Explain the failure models and timing models used to reason about distributed algorithms.', level: 'I', a: `<p>Failure models: <b>crash-stop</b> (node halts forever), <b>crash-recovery</b> (restarts with only durable state, so algorithms must fsync critical state like votes), <b>omission</b> (drops some messages), <b>Byzantine</b> (arbitrary or malicious behaviour). Tolerating f crash faults with majorities needs 2f + 1 nodes; f Byzantine faults need 3f + 1. Timing models: <b>synchronous</b> (bounded delays, timeouts are exact), <b>asynchronous</b> (no bounds, FLP applies), <b>partially synchronous</b> (bounds hold eventually; the realistic model for data centres, assumed by Raft/Paxos for liveness). Real systems also face gray failure: nodes that pass health checks but are too slow to be useful.</p>`, followUps: ['Why does Raft persist votedFor?', 'Give an example of gray failure.'] });
  interview.push({ q: 'Why can\'t we just use NTP-synchronized timestamps to order events across servers?', level: 'I', a: `<p>NTP reduces skew to milliseconds (sub-ms in good data centres) but never to zero; asymmetric paths, overloaded servers and clock steps (including backwards jumps) add error. Any two events closer together than the skew can be ordered wrongly, and last-write-wins will silently drop the newer write. Wall clocks can also jump backwards, breaking duration measurements (use monotonic clocks). Correct options: a single sequencer/leader assigning order, Lamport or hybrid logical clocks (respect causality), version numbers with compare-and-set, or bounded-uncertainty clocks with commit wait like Spanner's TrueTime, which turns clock uncertainty into a latency cost.</p>`, followUps: ['How does Spanner commit wait work?', 'What is a hybrid logical clock?'] });
  interview.push({ q: 'Explain Lamport clocks: the rules, the guarantee, and what they cannot do.', level: 'B', a: `<p>Each process keeps a counter. Increment before every local event and send; attach the counter to messages; on receive set counter = max(local, received) + 1. Guarantee: if a happened-before b then L(a) &lt; L(b). Breaking ties by process id gives a total order consistent with causality, used for total-order broadcast and mutual exclusion (Lamport's algorithm). Limitation: the converse is false, L(a) &lt; L(b) does not imply a → b, so Lamport clocks cannot detect concurrent events or conflicts. For that you need vector clocks.</p>`, followUps: ['Prove a → b implies L(a) &lt; L(b).', 'How would you build a distributed mutex with Lamport clocks?'] });
  interview.push({ q: 'How do vector clocks work and how does a Dynamo-style store use them?', level: 'I', a: `<p>Each process keeps a vector of N counters. On a local event or send it increments its own slot; on receive it takes the entry-wise max with the incoming vector, then increments its own slot. Compare: a → b iff V(a) ≤ V(b) entry-wise and V(a) ≠ V(b); otherwise, if neither dominates, they are concurrent. Dynamo/Riak attach a version vector (per replica) to each value. On read, versions dominated by others are discarded; concurrent ones are returned as siblings for the client to merge (e.g., union of cart items); the merged write carries the max vector so it dominates both. Costs: size grows with number of writers, so stores prune or use dotted version vectors to avoid false conflicts.</p>`, followUps: ['What problem do dotted version vectors solve?', 'Why can\'t you shrink vector clocks below N entries in general?'] });
  interview.push({ q: 'Compare single-leader, multi-leader and leaderless replication.', level: 'I', a: `<p><b>Single-leader</b>: all writes go to one leader, which streams its log to followers. No write conflicts and easy strong reads from the leader; but the leader is a write bottleneck and failover risks data loss (async) or split brain unless done via consensus. <b>Multi-leader</b>: one leader per region/device, local fast writes and region-failure tolerance, but concurrent writes conflict and need resolution (LWW, merge, CRDTs). <b>Leaderless</b> (Dynamo, Cassandra): clients write to W and read from R of N replicas; no failover, high availability; consistency via R + W &gt; N, read repair and anti-entropy, but concurrent writes still need conflict handling. Choice depends on write locality, conflict tolerance and consistency needs. Sync vs async replication is a separate axis: durability versus latency.</p>`, followUps: ['How does replication lag create a read-your-writes anomaly?', 'What is chain replication?'] });
  interview.push({ q: 'Explain R + W > N. Does it give linearizability?', level: 'A', a: `<p>With N replicas, writes acked by W and reads querying R, any read set and write set share at least R + W − N replicas; if that is ≥ 1 the read sees at least one replica with the latest acknowledged write and picks it by version. It does <b>not</b> by itself give linearizability: (1) a read concurrent with an in-progress write may see the new value and a later read the old one if the write has reached too few replicas; (2) sloppy quorums with hinted handoff may write to nodes outside the preferred N; (3) LWW timestamp resolution can discard writes under clock skew; (4) failed writes may remain on some replicas. The ABD algorithm (read, then write back the latest value to a quorum before returning) makes a single register linearizable; for compare-and-set you need consensus (Cassandra LWT uses Paxos).</p>`, followUps: ['How many failures can N=5, W=3, R=3 tolerate?', 'What are hinted handoff and read repair?'] });
  interview.push({ q: 'Walk through the consistency models from linearizable to eventual and give a use case for each.', level: 'I', a: `<p><b>Linearizable</b>: behaves like one copy; each op takes effect atomically between its start and end; real-time order respected. Use: leader election, locks, unique usernames, balances with invariants. <b>Sequential</b>: one total order that respects each client's program order but not real time; rarely chosen explicitly (classic CPU memory model). <b>Causal</b>: causally related ops seen in the same order everywhere, concurrent ones may differ; strongest model available during partitions. Use: comments and replies, social feeds, collaborative apps. <b>Session guarantees</b> (read-your-writes, monotonic reads/writes, writes-follow-reads): user-visible sanity per session. <b>Eventual</b>: replicas converge when writes stop. Use: counters, caches, DNS, product catalogue. Pick the weakest model that meets the requirement because strength costs latency and availability.</p>`, followUps: ['Is linearizability composable? Why does it matter?', 'Define strict serializability.'] });
  interview.push({ q: 'Given a small history of reads and writes on a register, how do you decide whether it is linearizable?', level: 'A', a: `<p>Write each operation as an interval [invoke, response] with its value. Search for a total order (choose a linearization point inside each interval) such that (1) if op A responded before op B was invoked, A precedes B, and (2) replaying the order on a sequential register, every read returns the latest preceding write (or the initial value). If an order exists, it is linearizable; else not. Typical violations: a read returns an old value after another read (or the write itself) already completed with the new value. Brute force is O(n!); practical checkers (Knossos, Porcupine) use backtracking with pruning (the Wing and Gong algorithm), and the general problem is NP-complete. Jepsen uses these to test real databases under partitions.</p>`, followUps: ['Why does a read overlapping a write have freedom to return either value?', 'How would you test a database for linearizability?'] });
  interview.push({ q: 'State the CAP theorem precisely and explain PACELC.', level: 'B', a: `<p>CAP: in a replicated system, if a network partition occurs, you cannot provide both <b>consistency</b> (linearizability) and <b>availability</b> (every non-failed node returns a non-error response); you must choose. Partitions are not optional, so "CA" is not a real distributed choice. CP systems (etcd, ZooKeeper, Spanner) refuse on the minority side; AP systems (Cassandra, Dynamo, DNS) answer on both sides and reconcile later. PACELC: if Partition, choose A or C; Else, choose Latency or Consistency. Most of the time there is no partition, and the everyday trade-off is synchronous coordination (consistent, slower) versus local answers (fast, possibly stale). Examples: Cassandra PA/EL, Spanner PC/EC. Choose per operation, not per company.</p>`, followUps: ['Why is CAP availability different from an SLA?', 'Give a feature that should be AP and one that must be CP in the same app.'] });
  interview.push({ q: 'How does majority-based leader election avoid two leaders, and what problems remain?', level: 'A', a: `<p>Nodes number time in terms. A candidate increments the term, votes for itself and requests votes; each node grants at most one vote per term (persisted before replying) and only to candidates whose log is at least as up to date. Winning needs a majority, and any two majorities intersect, so two candidates cannot both win the same term. Randomized election timeouts reduce split votes. Remaining problems: a paused old leader does not know it was replaced (zombie); it cannot commit through the consensus group (no majority), but it can still damage external systems, hence fencing tokens (the term) checked by storage. Leader leases for local reads depend on bounded clock drift. Even-sized clusters waste a node; partitions leave the minority side unavailable. Bully/ring algorithms assume perfect failure detection and can produce split brain.</p>`, followUps: ['Why must the up-to-date log check exist?', 'How does ReadIndex give linearizable reads?'] });
  interview.push({ q: 'Is exactly-once delivery possible? How do real systems achieve "exactly once"?', level: 'I', a: `<p>Exactly-once <b>delivery</b> over an unreliable network is impossible: the sender cannot know whether a message or its ack was lost (Two Generals), so it must either risk loss (at-most-once) or retry and risk duplicates (at-least-once). Systems achieve an exactly-once <b>effect</b>: at-least-once delivery plus idempotent or deduplicated processing. Techniques: idempotent operations (absolute writes), idempotency keys stored atomically with the effect, unique constraints on message/business ids, transactional consumers that commit offsets with outputs (Kafka transactions, Flink checkpoints with two-phase-commit sinks). Scope matters: Kafka EOS covers Kafka-to-Kafka; any external side effect (email, payment API) needs its own dedup key.</p>`, followUps: ['What happens if the consumer crashes after processing but before committing the offset?', 'How does the transactional outbox help?'] });
  interview.push({ q: 'Design the server side of idempotency keys for a payments API. What are the edge cases?', level: 'E', a: `<p>Client creates a key per user intent and sends it on every retry. Server: in one transaction insert <code>(key, account, request_hash, status=STARTED)</code> with a unique index; perform the effect; store the response and set COMPLETED; commit. On a repeated key: same hash + COMPLETED → return the stored response (including stored errors); STARTED → 409/retry-later (a concurrent duplicate or an in-flight request); different hash → 422 (key misuse). Edge cases: crash between effect and key record (avoid by same transaction or recovery job for STARTED rows); external calls inside the handler need derived idempotency keys downstream; key retention window vs. client retry horizon; keys scoped per tenant to avoid collisions; returning cached results without leaking data across users; clients must persist keys across app restarts. Combine with exponential backoff + jitter and retry only on retryable errors.</p>`, followUps: ['How long would you keep keys and why?', 'How do you handle a retry that arrives after the key expired?'] });
  interview.push({ q: 'An agent-based workflow calls external tools and sometimes repeats side effects after a crash. How do you make it safe?', level: 'E', a: `<p>Treat the agent as a distributed client under at-least-once execution. (1) Give each planned step a stable id (workflow id + step number) and pass it as an idempotency key to every side-effecting tool, so replays or re-plans of the same step are deduplicated by the tool. (2) Record each step's result durably before moving on (durable execution / event sourcing like Temporal), so after a crash the workflow resumes by replaying recorded results instead of calling tools again. (3) Separate read-only tools (safe to retry) from side-effecting ones (need keys, maybe human approval). (4) Bound retries with backoff and jitter and a budget. (5) For irreversible actions, use a two-step pattern: create a pending intent, then confirm, so duplicates collapse onto one intent. This is idempotency plus durable logs, the same fundamentals as payments.</p>`, followUps: ['What breaks if the model generates a fresh key on each retry?', 'How would you test this under fault injection?'] });
  registerModule({
    langExplain: `<p><b>About the code here.</b> The runnable simulators are short Python scripts (Lamport and vector clocks, a happened-before checker, a quorum overlap calculator, a brute-force linearizability checker, and retries with idempotency keys). They are written to show the mechanism; the same logic is a few lines in Java, JavaScript or C++, and the quiz and interview questions do not need any particular language.</p>`,
    id: 'cs16',
    title: 'Distributed Systems Fundamentals',
    intro: `<p>Interviewers love distributed systems because nothing works the way it does on one machine: a timeout does not mean "dead", clocks disagree, replicas return different answers, and retries can charge a card twice. This module builds the CS foundations from scratch: failure and timing models, physical clocks and NTP, Lamport and vector clocks with happened-before, replication models and quorum math, consistency models from linearizable to eventual (and how to check a history by hand), CAP and PACELC stated precisely, majority-based leader election and why consensus works, and idempotency versus the exactly-once myth. Each topic has a visualizer and most have a Python simulator you can run. For system-design depth (Raft log replication, Paxos, ZooKeeper/etcd, 2PC, sagas, outbox) continue with HLD modules hld10 and hld11.</p>`,
    goals: ['Explain partial failure, failure models (crash-stop, crash-recovery, omission, Byzantine) and why a timeout proves nothing', 'Compute clock drift, NTP offset and skew, and spot last-write-wins data loss', 'Assign Lamport and vector timestamps by hand and classify any two events as ordered or concurrent', 'Choose N, W, R for a workload and explain what R + W &gt; N does and does not guarantee', 'Place a requirement on the consistency ladder and decide whether a small history is linearizable', 'State CAP and PACELC precisely, explain majority-based leader election with terms and fencing, and design idempotent retries for exactly-once effect'],
    prereqs: `<p>CS Core modules <b>TCP &amp; UDP Deep Dive</b> (cs12: lost packets, timeouts, retransmission) and <b>Concurrency</b> (cs04: race conditions, locks, atomicity). Helpful next: HLD <b>Distributed Systems Theory</b> (hld10) and <b>Consensus, Coordination &amp; Distributed Transactions</b> (hld11) for design-level depth.</p>`,
    hours: 12,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
