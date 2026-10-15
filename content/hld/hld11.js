(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (pure, deterministic) ---------- */
  function box(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function cp(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function ints(input, def) {
    var t = String(input === undefined ? def : input).trim();
    if (!t) return [];
    return t.split(/[\s,]+/).map(function (x) { return parseInt(x, 10); });
  }
  function ringNodes(n, cx, cy, rx, ry) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / n;
      out.push({ id: 'S' + (i + 1), label: 'S' + (i + 1), x: Math.round(cx + rx * Math.cos(a)), y: Math.round(cy + ry * Math.sin(a)) });
    }
    return out;
  }

  /* =====================================================================
     TOPIC 1 — Why consensus + Raft leader election
     ===================================================================== */
  topics.push({
    title: 'Why Consensus? Raft Leader Election',
    analogy: `<p>A group of five friends shares one notebook of plans. If everybody writes whenever they like, the copies drift apart. So they agree: <b>one captain</b> writes and the others copy. If the captain goes silent (phone died), anyone who has not heard from them for a little while says <i>"I will be captain for <b>round 2</b> — vote for me?"</i>. Whoever gets votes from <b>more than half</b> the group (3 of 5) becomes captain. Because each friend votes only <b>once per round</b>, two captains can never both win the same round. That is Raft leader election.</p>`,
    explain: `<p><b>Consensus</b> means: several machines agree on one value (or one ordered list of values) even when some machines crash or messages are slow. It sounds simple, but it is the backbone of every "strongly consistent" system: etcd (Kubernetes), ZooKeeper (Kafka's old brain), Consul, CockroachDB, TiDB, Spanner, Kafka KRaft, MongoDB replica sets — all run some form of Raft or Paxos underneath.</p>
<p><b>Why not just one database?</b> One machine is a single point of failure. Copy the data to 3 or 5 machines and you need them to agree on <i>the same order of writes</i>, otherwise replica A says "balance = 50" and replica B says "balance = 70". Consensus gives you a <b>replicated state machine</b>: the same commands, applied in the same order, on every machine → the same state everywhere.</p>
<p><b>Raft</b> (Ongaro &amp; Ousterhout, 2014) was designed to be <i>understandable</i>. It splits the problem into three parts: <b>leader election</b>, <b>log replication</b> and <b>safety</b>. This topic is the first part.</p>
${H.table(['Word', 'Plain meaning'], [['Term', 'An election round number: 1, 2, 3… Every message carries it. Higher term always wins.'], ['Follower', 'Default role. Passive: answers the leader and candidates.'], ['Candidate', 'A follower whose timer ran out. Asks everyone for votes.'], ['Leader', 'Won a majority for this term. Sends heartbeats and handles all writes.'], ['Election timeout', 'Random wait, e.g. 150 – 300 ms. No heartbeat in that time → start an election.'], ['Majority / quorum', '⌊N/2⌋ + 1 nodes. 3 of 5, 2 of 3, 4 of 7.']])}
<p><b>The election, step by step:</b></p>
<ol>
<li>Followers expect a <b>heartbeat</b> (an empty AppendEntries message) from the leader every ~50 ms.</li>
<li>If a follower hears nothing for its <b>randomised</b> election timeout, it becomes a <b>candidate</b>, does <code>currentTerm += 1</code>, <b>votes for itself</b>, and sends <code>RequestVote(term, lastLogIndex, lastLogTerm)</code> to everyone.</li>
<li>A node grants its vote only if: (a) it has <b>not voted yet in this term</b>, and (b) the candidate's log is <b>at least as up-to-date</b> as its own (compare last term first, then length).</li>
<li>Candidate gets a majority → it is the <b>leader</b> for that term and immediately sends heartbeats so nobody else starts an election.</li>
<li>Anyone who sees a message with a <b>higher term</b> immediately steps down to follower and adopts that term. That is how an old, recovered leader learns it was replaced.</li>
<li><b>Split vote</b> (two candidates, nobody reaches a majority) → both time out again with <i>new random</i> timeouts; the faster one usually wins the next term.</li>
</ol>
${H.kv([['5 nodes', 'majority 3 → survives 2 crashes'], ['3 nodes', 'majority 2 → survives 1 crash'], ['4 nodes', 'majority 3 → still survives only 1 (even sizes waste a machine)']], { label: 'Cluster size vs failures tolerated (2f + 1 rule)' })}`,
    clues: ['"strongly consistent metadata / config store" → a Raft or Paxos group (etcd, ZooKeeper, Consul)', '"exactly one leader / only one scheduler must run" → leader election via consensus or a lease', '"tolerate 2 node failures" → 5 replicas (2f + 1)', '"split brain" in the question → majority quorums + terms/epochs', '"what happens if the leader dies?" → election timeout, new term, majority vote', '"why odd number of nodes?" → majority math: 4 nodes tolerate the same 1 failure as 3'],
    code: { lang: 'python', run: true, title: 'Tiny deterministic Raft election simulator (runnable)', code: `# A teaching model of Raft leader election (no networking, fixed "random" timeouts).
class Node:
    def __init__(self, name, timeout_ms):
        self.name = name
        self.role = "follower"
        self.term = 1
        self.voted_for = {}          # term -> candidate name (one vote per term!)
        self.timeout_ms = timeout_ms
        self.alive = True
        self.last_log = (1, 3)       # (lastLogTerm, lastLogIndex)

    def request_vote(self, term, cand, cand_last_log):
        if not self.alive:
            return False, self.term
        if term < self.term:                       # stale candidate: reject
            return False, self.term
        if term > self.term:                       # newer term: step down, adopt it
            self.term, self.role = term, "follower"
        already = self.voted_for.get(term)
        up_to_date = cand_last_log >= self.last_log  # tuple compare: term first, then index
        if already in (None, cand) and up_to_date:
            self.voted_for[term] = cand
            return True, self.term
        return False, self.term

def run_election(nodes, cand):
    cand.role, cand.term = "candidate", cand.term + 1
    cand.voted_for[cand.term] = cand.name          # vote for yourself
    votes = 1
    for other in nodes:
        if other is cand:
            continue
        granted, _ = other.request_vote(cand.term, cand.name, cand.last_log)
        print(f"  {other.name} -> {'YES' if granted else 'no '} (alive={other.alive})")
        votes += granted
    majority = len(nodes) // 2 + 1
    if votes >= majority:
        cand.role = "leader"
    print(f"{cand.name} term {cand.term}: {votes}/{len(nodes)} votes, need {majority} -> {cand.role}")

nodes = [Node("S1", 210), Node("S2", 260), Node("S3", 155), Node("S4", 290), Node("S5", 230)]
nodes[0].role = "leader"
nodes[0].alive = False                              # the old leader crashes
first = min((n for n in nodes if n.alive), key=lambda n: n.timeout_ms)
print("Shortest timeout:", first.name)
run_election(nodes, first)
# Old leader comes back still believing term 1; any reply carries term 2 -> it steps down.
nodes[0].alive = True
_, seen_term = nodes[1].request_vote(1, "S1", (1, 3))
if seen_term > nodes[0].term:
    nodes[0].term, nodes[0].role = seen_term, "follower"
print("S1 after recovery:", nodes[0].role, "term", nodes[0].term)` },
    viz: [{
      title: 'Raft election: terms, roles and votes',
      input: '5 3 4',
      inputLabel: 'Cluster size (3-7), first candidate, optional 2nd simultaneous candidate (split vote). S1 is the old leader.',
      gen: function (input) {
        var a = ints(input, '5 3');
        var N = a[0], c1 = a[1], c2 = a.length > 2 ? a[2] : 0;
        if (!(N >= 3 && N <= 7)) throw new Error('Cluster size must be 3 to 7, e.g. "5 3" or "5 3 4"');
        if (!(c1 >= 2 && c1 <= N)) throw new Error('First candidate must be a node number from 2 to N (S1 is the crashed leader)');
        if (c2 && (!(c2 >= 2 && c2 <= N) || c2 === c1)) throw new Error('Second candidate must be 2..N and different from the first');
        if (c2 && N === 3) throw new Error('With 3 nodes and S1 down only 2 remain; use N ≥ 4 for a split vote');
        var nodes = ringNodes(N, 50, 33, 30, 24), maj = Math.floor(N / 2) + 1;
        var role = [], term = [], voted = [], alive = [], timer = [];
        for (var i = 0; i < N; i++) { role.push(i === 0 ? 'L' : 'F'); term.push(1); voted.push('S1'); alive.push(true); timer.push(180 + ((i * 47) % 120)); }
        timer[c1 - 1] = 151; if (c2) timer[c2 - 1] = 151;
        var frames = [];
        function tags() { var t = {}; for (var i = 0; i < N; i++) t['S' + (i + 1)] = alive[i] ? ({ L: 'Leader', F: 'Follower', C: 'Candidate' })[role[i]] + ' t' + term[i] : 'DOWN'; return t; }
        function grid(hl) {
          var rows = [];
          for (var i = 0; i < N; i++) rows.push([alive[i] ? ({ L: 'leader', F: 'follower', C: 'candidate' })[role[i]] : 'crashed', String(term[i]), voted[i] || '—', alive[i] ? timer[i] + ' ms' : '—']);
          return { type: 'grid', label: 'Per-node state (votedFor resets when the term changes)', rowHead: nodes.map(function (n) { return n.id; }), colHead: ['role', 'term', 'votedFor', 'election timer'], rows: rows, hl: hl || {} };
        }
        function frame(narr, edges, ehl, nhl, ghl, vv) {
          var hl = nhl || {};
          for (var i = 0; i < N; i++) if (!alive[i] && !hl['S' + (i + 1)]) hl['S' + (i + 1)] = 'done';
          var parts = [{ type: 'graph', directed: true, height: 66, label: 'Cluster (tags = role + term)', nodes: nodes, edges: edges || [], ehl: ehl || {}, hl: hl, tags: tags() }, grid(ghl)];
          if (vv) parts.push({ type: 'vars', label: 'Vote count', vals: vv, hl: { result: vv.result && vv.result.indexOf('LEADER') >= 0 ? 'ok' : (vv.result ? 'bad' : '') } });
          frames.push({ narr: narr, parts: parts });
        }
        var hb = []; for (var j = 1; j < N; j++) hb.push(['S1', 'S' + (j + 1), 'heartbeat']);
        frame('Steady state: <b>S1 is leader for term 1</b>. Every ~50 ms it sends an empty AppendEntries (a heartbeat). Each heartbeat resets every follower\'s election timer, so nobody starts an election.', hb, {}, { S1: 'ok' });
        alive[0] = false;
        frame('<span class="c-r">S1 crashes.</span> No more heartbeats. Each follower\'s timer keeps counting down. The timers are <b>randomised</b> (150 – 300 ms) on purpose, so usually one node wakes up clearly first.', [], {}, { S1: 'bad' });
        var cands = c2 ? [c1, c2] : [c1];
        cands.forEach(function (c) { role[c - 1] = 'C'; term[c - 1] = 2; voted[c - 1] = 'S' + c; });
        var vc = {}; cands.forEach(function (c) { vc['S' + c] = 1; });
        var nh = {}; cands.forEach(function (c) { nh['S' + c] = 'cur'; });
        var gh = {}; cands.forEach(function (c) { gh[(c - 1) + ',0'] = 'cur'; gh[(c - 1) + ',1'] = 'cur'; gh[(c - 1) + ',2'] = 'cur'; });
        frame(c2 ? '<b>S' + c1 + ' and S' + c2 + ' time out at the same moment</b> (unlucky!). Both become candidates for <b>term 2</b> and each votes for itself. This is the split-vote risk.' : '<b>S' + c1 + '\'s timer fires first</b> (151 ms). It becomes a <b>candidate</b>, bumps its term to <b>2</b> and votes for itself (1 vote). It needs ' + maj + ' of ' + N + '.', [], {}, nh, gh, (function () { var o = cp(vc); o.majority = maj; return o; })());
        var turn = 0, winner = 0;
        for (var k = 1; k < N; k++) {
          var v = k + 1;
          if (cands.indexOf(v) >= 0) continue;
          var c = c2 ? cands[turn++ % 2] : c1;
          term[k] = 2; voted[k] = 'S' + c; vc['S' + c]++;
          var e = [], eh = {}; cands.forEach(function (cc) { e.push(['S' + cc, 'S' + v, 'RequestVote t2']); });
          eh['S' + c + '-S' + v] = 'ok';
          var g2 = {}; g2[k + ',1'] = 'ok'; g2[k + ',2'] = 'ok';
          var o = cp(vc); o.majority = maj;
          if (!winner && vc['S' + c] >= maj) { winner = c; }
          frame('S' + v + ' receives RequestVote(term 2). It has not voted in term 2 yet and the candidate\'s log is at least as up-to-date → it votes for <b>S' + c + '</b>' + (c2 ? ' (that request arrived first)' : '') + '. Its term jumps to 2 and votedFor is now locked for this term.', e, eh, (function () { var h = {}; h['S' + v] = 'ok'; cands.forEach(function (cc) { h['S' + cc] = 'cur'; }); return h; })(), g2, o);
          if (winner) break;
        }
        var nextTerm = 2;
        if (!winner) {
          var o2 = cp(vc); o2.majority = maj; o2.result = 'SPLIT VOTE — nobody won term 2';
          frame('<span class="c-r">Split vote.</span> Every live node has already voted in term 2, and no candidate reached ' + maj + '. Term 2 ends with <b>no leader</b>. Both candidates wait a <b>new random timeout</b> — this randomness is what breaks the tie.', [], {}, (function () { var h = {}; cands.forEach(function (cc) { h['S' + cc] = 'bad'; }); return h; })(), {}, o2);
          nextTerm = 3;
          timer[c1 - 1] = 163; timer[c2 - 1] = 241;
          role[c1 - 1] = 'C'; term[c1 - 1] = 3; voted[c1 - 1] = 'S' + c1;
          frame('Re-randomised: S' + c1 + ' gets 163 ms, S' + c2 + ' gets 241 ms. S' + c1 + ' fires first, becomes candidate for <b>term 3</b>, votes for itself.', [], {}, (function () { var h = {}; h['S' + c1] = 'cur'; return h; })(), (function () { var h = {}; h[(c1 - 1) + ',1'] = 'cur'; return h; })(), { votes: 1, majority: maj });
          var votes = 1;
          for (var q = 1; q < N && votes < maj; q++) {
            if (q === c1 - 1) continue;
            var wasCand = role[q] === 'C';
            role[q] = 'F'; term[q] = 3; voted[q] = 'S' + c1; votes++;
            var eh3 = {}; eh3['S' + c1 + '-S' + (q + 1)] = 'ok';
            var gg = {}; gg[q + ',0'] = wasCand ? 'cur' : ''; gg[q + ',1'] = 'ok'; gg[q + ',2'] = 'ok';
            frame('S' + (q + 1) + ' sees <b>term 3 &gt; its term 2</b>' + (wasCand ? ', so it <b>steps down</b> from candidate to follower,' : ',') + ' adopts term 3 (fresh vote available) and votes for S' + c1 + '. Votes: ' + votes + '/' + maj + '.', [['S' + c1, 'S' + (q + 1), 'RequestVote t3']], eh3, (function () { var h = {}; h['S' + c1] = 'cur'; h['S' + (q + 1)] = 'ok'; return h; })(), gg, { votes: votes, majority: maj });
          }
          winner = c1;
        }
        for (var z = 0; z < N; z++) if (alive[z] && z !== winner - 1) { role[z] = 'F'; term[z] = nextTerm; }
        role[winner - 1] = 'L'; term[winner - 1] = nextTerm;
        var hb2 = []; for (var y = 0; y < N; y++) if (y !== winner - 1) hb2.push(['S' + winner, 'S' + (y + 1), 'heartbeat t' + nextTerm]);
        var wh = {}; wh['S' + winner] = 'sel';
        frame('<span class="c-g">S' + winner + ' has a majority → LEADER for term ' + nextTerm + '.</span> It immediately sends heartbeats so no other timer fires. Any losing candidate that hears this heartbeat (same or higher term) steps down to follower.', hb2, {}, wh, (function () { var h = {}; h[(winner - 1) + ',0'] = 'sel'; return h; })(), { leader: 'S' + winner, term: nextTerm, result: 'LEADER elected' });
        alive[0] = true; role[0] = 'L'; term[0] = 1; voted[0] = 'S1';
        frame('<span class="c-y">S1 reboots</span> and still believes it is leader of <b>term 1</b>. It tries to send a heartbeat to S2. Danger? No — terms protect us.', [['S1', 'S2', 'heartbeat t1']], { 'S1-S2': 'bad' }, { S1: 'cur' }, { '0,0': 'bad', '0,1': 'bad' });
        role[0] = 'F'; term[0] = nextTerm; voted[0] = '—';
        frame('S2 rejects it: "my term is ' + nextTerm + ', yours is 1". S1 sees the higher term in the reply, <b>steps down to follower</b> and adopts term ' + nextTerm + '. A stale leader can never commit anything because it can no longer collect a majority of acks.', [['S2', 'S1', 'reject, term ' + nextTerm]], { 'S2-S1': 'ok' }, { S1: 'ok' }, { '0,0': 'ok', '0,1': 'ok' });
        frame('<b>Summary:</b> one vote per node per term + majority quorum ⇒ <b>at most one leader per term</b> (Election Safety). Randomised timeouts make split votes rare; higher terms instantly demote stale leaders.', hb2, {}, wh, {}, { safety: 'one leader per term', failuresTolerated: Math.floor((N - 1) / 2) });
        return frames;
      }
    }],
    examples: [
      { title: 'Happy election in a 5-node cluster', html: `<p>S1 (leader, term 4) crashes. Timers on S2..S5 are 240, 170, 285, 205 ms. S3 fires first → term 5, votes for itself. S2, S4, S5 have not voted in term 5 and S3's log is up to date → 3 YES. S3 has 4 votes ≥ 3 → leader. Total downtime ≈ election timeout + one round trip ≈ 170 ms + 1 ms.</p>${H.table(['node', 'term before', 'term after', 'votedFor (t5)'], [['S2', '4', '5', 'S3'], ['S3', '4', '5', 'S3 (self)'], ['S4', '4', '5', 'S3'], ['S5', '4', '5', 'S3']])}` },
      { title: 'Why a stale log loses the election', html: `<p>S4 was partitioned and missed entries 8 – 10. Its last entry is (term 3, index 7). It times out and asks for votes in term 6. S2's last entry is (term 4, index 10). Rule: compare <b>last log term</b> first → 3 &lt; 4, so S2 says ${H.c('r', 'NO')}. S4 can only win if a majority has logs no newer than its own — impossible, because committed entries live on a majority. This is the <b>Leader Completeness</b> guarantee: a new leader always has every committed entry.</p>` },
      { title: 'Network partition: minority side cannot elect', html: `<p>5 nodes split {S1, S2} | {S3, S4, S5}. Leader S1 is on the small side. S1 keeps "leading" but its writes never reach 3 acks → nothing commits. On the big side S4 times out, wins 3 votes for term 7, and serves writes. When the partition heals, S1 sees term 7 and steps down; its uncommitted entries are overwritten. ${H.c('g', 'No split brain')} because only one side can ever hold a majority.</p>` },
      { title: 'Choosing timeouts', html: `<p>Raft needs <code>broadcastTime ≪ electionTimeout ≪ MTBF</code>. Inside a data centre a round trip is ~0.5 ms, so heartbeats at 50 ms and election timeout 150 – 300 ms are fine. Across regions (RTT 80 ms) use ~1 – 2 s timeouts, or you get constant false elections. etcd defaults: heartbeat 100 ms, election 1000 ms.</p>` }
    ],
    deepDive: `<p><b>The five Raft safety properties:</b> Election Safety (≤ 1 leader per term), Leader Append-Only, Log Matching (same index + term ⇒ identical prefix), Leader Completeness (committed entries appear in all future leaders), State Machine Safety (no two nodes apply different commands at the same index). Votes and terms must be written to <b>stable storage (fsync)</b> before replying, otherwise a reboot could let a node vote twice in the same term.</p>
<p><b>Disruptive servers and PreVote:</b> a node cut off from the cluster keeps timing out and incrementing its term. When it reconnects, its huge term forces the healthy leader to step down — a needless outage. <b>PreVote</b> (in etcd, TiKV, Consul) adds a dry-run round: "would you vote for me?" — peers say no if they heard from a leader recently, so the term is not bumped. <b>CheckQuorum</b> makes a leader step down if it has not heard from a majority within an election timeout (protects against one-way partitions).</p>
<p><b>Leader leases and reads:</b> a leader cannot assume it is still leader (it may be partitioned). For linearizable reads it uses <b>ReadIndex</b> (confirm leadership with one heartbeat round, then read once the state machine reaches that index) or a <b>lease read</b> (trust leadership for less than the election timeout, relying on bounded clock drift). <b>Membership changes</b> use joint consensus or single-server changes so two disjoint majorities can never exist. <b>Liveness</b> is not guaranteed in a fully asynchronous network (FLP impossibility, 1985): Raft is always safe, but only makes progress when timing is "good enough" — randomised timeouts make that the normal case.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody writes Raft from scratch at work — you run etcd, use a managed store (DynamoDB, Spanner, Cosmos DB), or embed a library (hashicorp/raft, etcd/raft, openraft). AI assistants can explain a Raft paper section, generate a toy simulator, or summarise an etcd incident log in seconds. <b>Use AI as a partner:</b> <code>Here are etcd logs from 3 nodes around 14:02; explain why leadership flapped and which timeout I should tune</code>, or ask it to produce Jepsen-style test scenarios (partitions, clock skew, crashes during election). <b>Where AI goes wrong:</b> it happily writes a "Raft" that forgets to persist votedFor, lets followers vote twice, counts the leader's own ack wrong, or confuses Raft terms with Paxos ballots. Plausible-looking consensus code is the most dangerous code there is. <b>What you must still own:</b> the quorum math (2f + 1), why one vote per term implies one leader per term, choosing timeouts for your network, and knowing when a managed service beats running your own cluster. Agent platforms also need leader election (one agent instance owning a scheduled job) — the same lease + term ideas apply.</p>`,
    problems: [{
      title: 'Walk Through a Raft Election After a Leader Crash',
      level: 'Medium', tags: ['raft', 'leader election', 'quorum'], companies: ['Google', 'Microsoft', 'Databricks'],
      statement: `<p>A 5-node Raft cluster (S1..S5) has S1 as leader in <b>term 7</b>. S1 crashes. Election timeouts: S2 = 260 ms, S3 = 180 ms, S4 = 180 ms, S5 = 300 ms. Last log entries: S2 (t7, idx 20), S3 (t7, idx 20), S4 (t6, idx 18), S5 (t7, idx 19). Walk through what happens, term by term, until a leader is elected. Then S1 comes back. What happens to it?</p>`,
      constraints: `<p>Messages take ~1 ms. Assume S3's RequestVote reaches S2 first and S4's reaches S5 first.</p>`,
      example: `<p>Expected outcome: term 8 may be a split vote; eventually ${H.c('g', 'S3 (or S2) wins')}; ${H.c('r', 'S4 can never win')} because its log is behind; S1 rejoins as follower in the new term.</p>`,
      brute: { why: `<p>A naive answer: "the node with the shortest timeout becomes leader." Wrong on two counts: S3 and S4 tie, and S4 has a stale log (last term 6), so most nodes will refuse to vote for it. Ignoring the up-to-date check is how you would elect a leader that is missing committed entries — data loss.</p>` },
      mcq: { q: 'S4 (last entry t6, idx 18) asks S2 (last entry t7, idx 20) for a vote in term 8. S2 has not voted yet in term 8. What does S2 reply?', options: ['YES — it has not voted yet', 'NO — S4\'s log is less up-to-date (last term 6 &lt; 7)', 'YES — S4 has a lower index so it must be newer', 'It ignores the message'], answer: 1, explain: 'Up-to-date check compares last log term first. 6 &lt; 7, so S4 is behind and S2 refuses. S2 still bumps its own term to 8.' },
      hints: [`<p>Hint 1: S3 and S4 time out together at 180 ms, both become candidates for term 8 and vote for themselves.</p>`, `<p>Hint 2: Check the up-to-date rule for every vote: compare (lastLogTerm, lastLogIndex). S4 (6,18) is behind everyone except nobody; S5 (7,19) is behind S3 (7,20).</p>`, `<p>Hint 3: Count: S3 gets itself + S2 (+ S5 if S5 sees S3's request or after S4's fails). Majority is 3. Then handle S1: higher term in replies → step down.</p>`],
      solution: {
        approach: `<p><b>t = 180 ms:</b> S3 and S4 both time out → candidates for <b>term 8</b>, each votes for itself.</p>
<p><b>Votes:</b> S2 gets S3's request first: S3's log (7,20) ≥ S2's (7,20) → <b>YES to S3</b>. S2 later gets S4's request: already voted in term 8 → NO (and S4's log is older anyway). S5 gets S4's request first: S4's log (6,18) is <b>older</b> than S5's (7,19) → <b>NO</b>, but S5 still adopts term 8 and has <i>not</i> spent its vote. S5 then receives S3's request: (7,20) ≥ (7,19) → <b>YES to S3</b>. S3 also gets "NO" from S4 (it voted for itself).</p>
<p><b>Result:</b> S3 has 3 votes (S3, S2, S5) = majority of 5 → <b>leader for term 8</b>, sends heartbeats; S4 sees term 8 heartbeat from a leader and becomes follower. Even if the timing made term 8 a split vote, S4 could never gather 3 votes because every other live node has a newer log, so the next term would go to S2 or S3.</p>
<p><b>S1 returns</b> thinking it is leader of term 7. Its first heartbeat gets a reply carrying term 8 → S1 steps down, adopts term 8, and S3 overwrites any uncommitted entries S1 had at the tail (AppendEntries consistency check). No committed data is lost because every committed entry was on a majority, and S3's log is at least as up-to-date as that majority.</p>`,
        complexity: `<p>One election round costs one RequestVote broadcast (N − 1 messages) plus replies; latency ≈ election timeout + 1 RTT. Fault tolerance: f = 2 crashes for N = 5.</p>`,
        followUps: ['What would PreVote change if S4 had been partitioned for an hour?', 'Why must votedFor be fsynced before replying?', 'How long is the cluster unable to accept writes?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Raft log replication & commit
     ===================================================================== */
  topics.push({
    title: 'Raft Log Replication, Commit Index & Repairing Followers',
    analogy: `<p>The captain dictates the plan line by line. Each friend writes the line into their notebook and says "got it". As soon as <b>more than half</b> the group has a line written down, the captain stamps it <b>DONE</b> — it can never be erased, because any future captain must come from a group that includes at least one person who wrote it. A friend who was in the bathroom simply copies the missing lines later; a friend who scribbled something the captain never confirmed has to rub it out and copy the captain's version.</p>`,
    explain: `<p>Once there is a leader, every write goes through it. The leader keeps a <b>log</b>: an ordered list of entries, each tagged with an <b>index</b> (position) and the <b>term</b> in which it was created.</p>
<ol>
<li>Client sends <code>SET x = 1</code> to the leader.</li>
<li>Leader appends <code>(index 4, term 2, "x=1")</code> to its own log (and fsyncs it).</li>
<li>Leader sends <code>AppendEntries(term, prevLogIndex = 3, prevLogTerm = 2, entries = [...], leaderCommit)</code> to every follower, in parallel.</li>
<li>A follower accepts only if its own log has an entry at <code>prevLogIndex</code> with <code>prevLogTerm</code> (the <b>consistency check</b>). If yes it appends, fsyncs, and replies success.</li>
<li>When the entry is stored on a <b>majority</b> (leader counts itself), the leader advances <code>commitIndex</code>, applies the command to its state machine, and answers the client.</li>
<li>Followers learn the new commitIndex in the next AppendEntries / heartbeat and apply it too.</li>
</ol>
${H.table(['Index', '1', '2', '3', '4'], [['Leader S1', 't1 a=1', 't1 b=2', 't2 c=3', 't2 x=1'], ['S2', 't1 a=1', 't1 b=2', 't2 c=3', H.c('g', 't2 x=1')], ['S3', 't1 a=1', 't1 b=2', 't2 c=3', H.c('g', 't2 x=1')], ['S4', 't1 a=1', 't1 b=2', '—', '—'], ['S5', 't1 a=1', 't1 b=2', H.c('r', 't1 q=7'), '—']])}
<p>Index 4 is on S1, S2, S3 = 3 of 5 → <b>committed</b>. S4 is just behind (it will catch up). S5 has a <b>conflicting</b> entry it got from an old leader that never committed; the leader will find the point where they agree and <b>overwrite</b> S5's tail.</p>
<p><b>How the leader repairs a follower:</b> it keeps <code>nextIndex[follower]</code>. If AppendEntries fails the consistency check, it decrements nextIndex and retries (real systems jump back by whole terms using a conflict hint). When they match, the follower deletes everything after that point and copies the leader's entries. The leader <b>never</b> deletes or overwrites its own log (Leader Append-Only).</p>
${H.kv([['commitIndex', 'highest index known to be on a majority'], ['lastApplied', 'highest index applied to the state machine'], ['nextIndex[i]', 'next entry to send follower i'], ['matchIndex[i]', 'highest entry known to be on follower i']], { label: 'Four counters the leader tracks' })}
<p><b>Cost:</b> a committed write = one round trip to the fastest majority + one fsync on each. With 5 nodes in 3 availability zones that is ~1 – 3 ms. Across regions it is one cross-region RTT (50 – 150 ms) — the price of strong consistency.</p>`,
    clues: ['"a write is acknowledged only after it is durable on a majority" → Raft/Paxos commit', '"replicated state machine" / "replicated log" → consensus log replication', '"follower fell behind / came back after maintenance" → nextIndex backtracking or snapshot install', '"linearizable writes across 3 AZs" → Raft group spanning zones, latency = majority RTT', '"never lose an acknowledged write even if 2 of 5 machines die" → majority commit', '"unbounded log growth" → snapshots + log compaction'],
    code: { lang: 'python', run: true, title: 'Commit-index rule and follower repair (runnable)', code: `# Leader-side bookkeeping for Raft log replication.
# A log entry is (term, command). Index 1 is the first entry.
leader_term = 3
leader_log = [(1, "a=1"), (1, "b=2"), (2, "c=3"), (3, "x=1"), (3, "y=2")]

# matchIndex: highest index each follower is known to store (leader counts itself as len(log)).
match_index = {"S1": 5, "S2": 5, "S3": 4, "S4": 2, "S5": 1}

def new_commit_index(match_index, log, current_term):
    """Largest N stored on a majority AND whose entry is from the CURRENT term.
    (Raft only commits old-term entries indirectly, by committing a newer current-term entry.)"""
    n_nodes = len(match_index)
    for n in range(len(log), 0, -1):
        replicas = sum(1 for m in match_index.values() if m >= n)
        if replicas > n_nodes // 2 and log[n - 1][0] == current_term:
            return n
    return 0

print("commitIndex =", new_commit_index(match_index, leader_log, leader_term))   # 4

# Repairing a follower whose tail conflicts with the leader.
follower = [(1, "a=1"), (1, "b=2"), (1, "q=7"), (1, "r=8")]   # entries 3-4 came from a dead old leader

def append_entries(follower, prev_index, prev_term, entries):
    if prev_index > len(follower):
        return False                              # gap: we do not have prev entry
    if prev_index > 0 and follower[prev_index - 1][0] != prev_term:
        return False                              # term mismatch at prev entry
    del follower[prev_index:]                     # drop any conflicting tail
    follower.extend(entries)
    return True

next_index = len(leader_log) + 1                  # optimistic start: 6
while True:
    prev = next_index - 1
    prev_term = leader_log[prev - 1][0] if prev > 0 else 0
    ok = append_entries(follower, prev, prev_term, leader_log[prev:])
    print(f"try nextIndex={next_index}: {'OK' if ok else 'reject'}")
    if ok:
        break
    next_index -= 1                               # back up one entry and retry

print("follower now:", follower)` },
    viz: [{
      title: 'Entries replicating, majority commit, and overwriting a conflicting follower',
      input: 'x=1 y=2 z=3',
      inputLabel: 'New client commands (1-5), e.g. "x=1 y=2 z=3"',
      gen: function (input) {
        var cmds = String(input === undefined ? 'x=1 y=2 z=3' : input).trim().split(/\s+/).filter(Boolean);
        if (!cmds.length) throw new Error('Enter 1 to 5 commands such as "x=1 y=2"');
        if (cmds.length > 5) throw new Error('Use at most 5 commands');
        var base = [['t1', 'a=1'], ['t2', 'b=2']];
        var leaderTerm = 3, W = base.length + cmds.length;
        var logs = { S1: base.slice(), S2: base.slice(), S3: base.slice(), S4: base.slice(), S5: [['t1', 'a=1'], ['t1', 'q=7']] };
        var names = ['S1', 'S2', 'S3', 'S4', 'S5'];
        var commit = 2, frames = [];
        var conflict = { S5: true };
        function grid(hl) {
          var rows = names.map(function (n) { var r = []; for (var i = 0; i < W; i++) r.push(logs[n][i] ? logs[n][i][0] + ' ' + logs[n][i][1] : '·'); return r; });
          var col = []; for (var i = 1; i <= W; i++) col.push('#' + i + (i <= commit ? ' ✔' : ''));
          var h = cp(hl || {});
          for (var r = 0; r < 5; r++) for (var c = 0; c < commit; c++) if (!h[r + ',' + c] && logs[names[r]][c] && !(names[r] === 'S5' && c === 1 && conflict.S5)) h[r + ',' + c] = 'done';
          return { type: 'grid', label: 'Logs (✔ = committed index). S1 is leader, term 3.', rowHead: ['S1 (L)', 'S2', 'S3', 'S4 (slow)', 'S5 (was down)'], colHead: col, rows: rows, hl: h };
        }
        function g(edges, ehl, hl) {
          return { type: 'graph', directed: true, height: 46, nodes: [{ id: 'C', label: 'Client', x: 8, y: 23, shape: 'box' }, { id: 'S1', label: 'S1', x: 34, y: 23 }, { id: 'S2', label: 'S2', x: 62, y: 5 }, { id: 'S3', label: 'S3', x: 82, y: 15 }, { id: 'S4', label: 'S4', x: 82, y: 33 }, { id: 'S5', label: 'S5', x: 62, y: 41 }], edges: edges, ehl: ehl || {}, hl: hl || {}, tags: { S1: 'Leader t3', S5: 'stale tail' } };
        }
        frames.push({ narr: 'Start: committed entries #1–#2 are everywhere (faded). But <b>S5</b> was offline and has an entry <span class="c-r">t1 q=7</span> at #2 that the term-1 leader wrote just before it crashed and never committed. The term-2 leader then wrote <b>t2 b=2</b> at #2 instead, which was committed. S1 is now leader in <b>term 3</b>.', parts: [g([]), grid({ '4,1': 'bad' }), { type: 'vars', vals: { commitIndex: commit, majority: 3 } }] });
        cmds.forEach(function (cmd, k) {
          var idx = base.length + k;
          logs.S1.push(['t3', cmd]);
          var h1 = {}; h1['0,' + idx] = 'cur';
          frames.push({ narr: 'Client sends <b>' + cmd + '</b>. Leader appends it locally as <b>#' + (idx + 1) + ' (term 3)</b> and fsyncs. Not committed yet — 1 of 5 copies.', parts: [g([['C', 'S1', cmd]], { 'C-S1': 'cur' }, { S1: 'cur' }), grid(h1), { type: 'vars', vals: { commitIndex: commit, copies: 1, majority: 3 } }] });
          logs.S2.push(['t3', cmd]); logs.S3.push(['t3', cmd]);
          var lag = k >= 1;
          if (!lag) logs.S4.push(['t3', cmd]);
          var h2 = {}; h2['0,' + idx] = 'ok'; h2['1,' + idx] = 'ok'; h2['2,' + idx] = 'ok'; if (!lag) h2['3,' + idx] = 'ok';
          var copies = lag ? 3 : 4;
          frames.push({ narr: 'AppendEntries(prevLogIndex=' + idx + ', prevLogTerm=' + (idx > base.length ? 't3' : 't2') + ') goes to all followers in parallel. S2, S3' + (lag ? '' : ', S4') + ' pass the consistency check, append and ack. ' + (lag ? 'S4 is slow (GC pause) — no ack yet. ' : '') + 'S5 rejects (its #2 does not match). ' + copies + ' copies.', parts: [g([['S1', 'S2', 'AE'], ['S1', 'S3', 'AE'], ['S1', 'S4', 'AE'], ['S1', 'S5', 'AE']], { 'S1-S2': 'ok', 'S1-S3': 'ok', 'S1-S4': lag ? 'cur' : 'ok', 'S1-S5': 'bad' }, { S5: 'bad' }), grid(h2), { type: 'vars', vals: { commitIndex: commit, copies: copies, majority: 3 } }] });
          commit = idx + 1;
          var h3 = {}; h3['0,' + idx] = 'sel';
          frames.push({ narr: '<span class="c-g">Majority reached (' + copies + ' ≥ 3) → #' + (idx + 1) + ' is COMMITTED.</span> Leader applies <b>' + cmd + '</b> to its state machine and replies OK to the client. Followers learn the new commitIndex on the next message. A committed entry can never be lost: any future leader needs 3 votes, and at least one voter holds this entry.', parts: [g([['S1', 'C', 'OK']], { 'S1-C': 'ok' }, { S1: 'sel' }), grid(h3), { type: 'vars', vals: { commitIndex: commit, copies: copies, majority: 3 }, hl: { commitIndex: 'ok' } }] });
        });
        if (cmds.length > 1) {
          for (var i = logs.S4.length; i < logs.S1.length; i++) logs.S4.push(logs.S1[i]);
          var h4 = {}; for (var c = base.length + 1; c < W; c++) h4['3,' + c] = 'ok';
          frames.push({ narr: 'S4 wakes up from its pause. The leader kept retrying, so S4 now receives all missing entries in one batch and catches up. Being slow never blocked commits — only a majority was needed.', parts: [g([['S1', 'S4', 'AE batch']], { 'S1-S4': 'ok' }, { S4: 'ok' }), grid(h4)] });
        }
        var nextIdx = logs.S1.length + 1;
        var tries = [];
        while (nextIdx > 2) { tries.push(nextIdx); nextIdx--; }
        tries.forEach(function (ni) {
          var prev = ni - 1;
          var h5 = {}; h5['4,' + (prev - 1)] = 'cur';
          frames.push({ narr: 'Repairing S5: leader tries nextIndex=' + ni + ' (prevLogIndex=' + prev + '). ' + (prev > logs.S5.length ? 'S5 has no entry #' + prev + ' → reject.' : 'S5\'s #' + prev + ' has term ' + logs.S5[prev - 1][0] + ' but leader\'s has ' + logs.S1[prev - 1][0] + ' (different command) → reject.') + ' Leader decrements nextIndex and retries.', parts: [g([['S1', 'S5', 'AE prev=' + prev]], { 'S1-S5': 'bad' }, { S5: 'cur' }), grid(h5), { type: 'vars', vals: { 'nextIndex[S5]': ni } }] });
        });
        var h6 = {}; h6['4,1'] = 'bad';
        frames.push({ narr: 'nextIndex=2 (prevLogIndex=1): S5\'s #1 is <b>t1 a=1</b>, same as the leader → match! S5 <span class="c-r">deletes its conflicting tail</span> (q=7 was never committed, so deleting it is safe)…', parts: [g([['S1', 'S5', 'AE prev=1']], { 'S1-S5': 'cur' }, { S5: 'cur' }), grid(h6), { type: 'vars', vals: { 'nextIndex[S5]': 2 } }] });
        logs.S5 = logs.S1.slice(); conflict.S5 = false;
        var h7 = {}; for (var c2 = 1; c2 < W; c2++) h7['4,' + c2] = 'ok';
        frames.push({ narr: '…and copies the leader\'s entries #2–#' + W + '. All five logs are now identical (<b>Log Matching</b>: same index + same term ⇒ same history). Every node will apply exactly the same commands in exactly the same order.', parts: [g([['S1', 'S5', 'AE ok']], { 'S1-S5': 'ok' }, { S5: 'ok' }), grid(h7), { type: 'vars', vals: { commitIndex: commit, 'nextIndex[S5]': W + 1 }, hl: { commitIndex: 'ok' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Latency of one write in a 5-node, 3-AZ cluster', html: `<p>Leader in AZ-a, followers 2× AZ-b, 2× AZ-c. RTT within AZ 0.2 ms, across AZs 1 ms, fsync 0.5 ms. Leader fsync (0.5) in parallel with sending; fastest two followers ack after 1 + 0.5 = 1.5 ms. Commit ≈ <b>1.5 ms</b>. The slowest follower does not matter — that is the beauty of quorums: tail latency is set by the <i>median</i> node, not the worst.</p>` },
      { title: 'The "old-term entry" trap (Figure 8 in the Raft paper)', html: `<p>Leader of term 4 finds an entry from term 2 at index 3 that is now on 3 of 5 nodes. Can it mark index 3 committed? ${H.c('r', 'No!')} A node with a term-3 entry at index 3 could still win an election and overwrite it. Raft's rule: a leader only counts replicas for entries of its <b>current term</b>; once a term-4 entry at index 4 is on a majority, index 3 becomes committed indirectly. That is why new leaders append a <b>no-op</b> entry right after winning.</p>` },
      { title: 'Snapshots for a follower that is weeks behind', html: `<p>The log would grow forever, so each node periodically writes a <b>snapshot</b> of its state machine (e.g. every 10 000 entries in etcd) and discards older log entries. A brand-new follower, or one that needs entries already discarded, gets an <code>InstallSnapshot</code> RPC with the whole state, then normal AppendEntries from there.</p>` },
      { title: 'Batching and pipelining for throughput', html: `<p>Sending one entry per round trip caps you at ~1 000 writes/s per ms of RTT. Real implementations <b>batch</b> many client commands into one AppendEntries and <b>pipeline</b> (send batch 2 before batch 1 is acked). etcd reaches tens of thousands of writes/s; TiKV and CockroachDB shard data into thousands of Raft groups ("multi-Raft") to scale further.</p>` }
    ],
    deepDive: `<p><b>Why committed entries survive:</b> an entry is committed when on a majority M1. A future leader needs votes from a majority M2. Any two majorities of the same cluster intersect (|M1| + |M2| &gt; N), so at least one voter has the entry, and the up-to-date voting rule means it only votes for a candidate whose log is at least as new — so the winner must contain the entry. That single intersection argument is the heart of Raft, Paxos, Zab and Viewstamped Replication alike.</p>
<p><b>Reads:</b> reading from a follower is fast but may be stale. Linearizable reads go through the leader with <b>ReadIndex</b> or a <b>lease</b>; etcd offers both "serializable" (local, maybe stale) and "linearizable" (default) reads. <b>Learners / non-voting members</b> receive the log but do not count in quorums — great for read replicas in far regions or for warming up a new node before promoting it.</p>
<p><b>Production reality:</b> disk fsync latency dominates (use NVMe, separate WAL disks). Leader CPU and bandwidth are the bottleneck, which is why systems shard into many Raft groups and spread leaders across nodes. Watch metrics like <i>proposal commit latency</i>, <i>leader changes per hour</i> and <i>apply lag</i>. Common outage causes: slow disks triggering elections, too-small timeouts across regions, and huge snapshots saturating the network.</p>`,
    aiEra: `<p><b>What AI changes:</b> you can ask an assistant to explain a confusing etcd metric, draft a multi-Raft sharding plan, or generate a property-based test that randomly crashes followers and checks Log Matching. Formal methods are also becoming approachable: AI tools can help translate a protocol tweak into a TLA+ or P spec and explain counterexamples the model checker finds. <b>Use AI as a partner:</b> <code>Generate 10 adversarial schedules (crash, partition, delay) for a 5-node Raft log and the invariant each one tests</code>. <b>Where AI goes wrong:</b> it often commits old-term entries directly (the Figure-8 bug), forgets that the leader's own copy counts toward the majority, or truncates a follower's log even when the incoming entries already match (which can delete committed data on reordered messages). <b>What you must still own:</b> the quorum-intersection argument, the latency math (majority RTT + fsync), and knowing which reads are linearizable in your chosen database.</p>`
  });

  /* =====================================================================
     TOPIC 3 — Paxos intuition
     ===================================================================== */
  topics.push({
    title: 'Paxos Intuition: Prepare, Promise, Accept',
    analogy: `<p>Three club secretaries must record <b>one</b> meeting date. A member who wants to propose a date first calls the secretaries: <i>"I am proposal #5 — promise to ignore anything numbered below 5?"</i>. Each secretary promises, and also says <i>"by the way, I already wrote down date X under proposal #3"</i>. The rule of the club: if anyone tells you about an earlier written date, <b>you must propose that date, not your own</b>. That politeness rule is why, once a majority has written a date, every later proposer ends up re-proposing the same date. That is Paxos.</p>`,
    explain: `<p><b>Paxos</b> (Leslie Lamport, 1989/1998) is the original, proven consensus algorithm. Raft is essentially "Multi-Paxos with a strong leader, made easy to teach". You rarely implement Paxos, but interviewers love to ask "Raft vs Paxos?" and you should know the core idea.</p>
<p><b>Roles:</b> <b>proposers</b> suggest values, <b>acceptors</b> vote (usually 3 or 5 of them; a majority is a quorum), <b>learners</b> find out what was chosen. One machine often plays all three.</p>
<p><b>Single-decree Paxos chooses ONE value in two phases:</b></p>
${H.table(['Phase', 'Message', 'What the acceptor does'], [['1a', 'Prepare(n)', 'proposer picks a unique, higher number n (e.g. counter + node id)'], ['1b', 'Promise(n, acceptedN, acceptedV)', 'if n &gt; every number it promised before: promise to ignore anything below n, and report the highest proposal it already accepted (if any)'], ['2a', 'Accept(n, v)', 'proposer sends value v = the value of the highest accepted proposal reported in the promises, or its own value if none were reported'], ['2b', 'Accepted(n, v)', 'acceptor accepts unless it has since promised a higher number']])}
<p><b>A value is chosen</b> the moment a majority of acceptors has accepted the same proposal number. Nobody may even know yet — learners find out by collecting Accepted messages.</p>
<p><b>Why it is safe (the one idea to remember):</b> if value v was chosen with proposal n, a majority accepted it. Any later proposer with number m &gt; n must get promises from a majority — and two majorities always overlap. So at least one promise reports v (or a value that itself had to be v), and the rule in phase 2a forces the new proposer to propose v. Once chosen, always chosen.</p>
<p><b>Multi-Paxos:</b> to agree on a whole log, you run one Paxos instance per log slot. Doing phase 1 every time is slow, so a stable <b>distinguished proposer (leader)</b> runs phase 1 once for all future slots and then only does phase 2 (one round trip per write) — which is basically what Raft does with terms instead of proposal numbers.</p>
${H.kv([['Raft term', '≈ Paxos ballot / proposal number'], ['RequestVote', '≈ Phase 1 (prepare/promise)'], ['AppendEntries', '≈ Phase 2 (accept/accepted)'], ['Up-to-date vote rule', '≈ "adopt the highest accepted value"']], { label: 'Raft ↔ Paxos dictionary' })}`,
    clues: ['"Raft vs Paxos" / "how does Spanner / Chubby replicate?" → Multi-Paxos per shard', '"agree on a single value despite failures" → single-decree Paxos', '"two proposers keep overriding each other" → dueling proposers / livelock → elect a leader', '"what is a ballot number / proposal number?" → Paxos phase 1', '"leaderless consensus, any replica can propose" → EPaxos / Generalized Paxos family', '"why is consensus impossible?" → FLP: no deterministic algorithm guarantees termination in a fully async system with one crash'],
    code: { lang: 'python', run: true, title: 'Single-decree Paxos acceptor + proposer (runnable)', code: `class Acceptor:
    def __init__(self, name):
        self.name = name
        self.promised = 0            # highest proposal number promised
        self.accepted = (0, None)    # (number, value) of highest accepted proposal

    def prepare(self, n):
        if n > self.promised:
            self.promised = n
            return ("promise", self.accepted)
        return ("nack", None)

    def accept(self, n, v):
        if n >= self.promised:
            self.promised = n
            self.accepted = (n, v)
            return True
        return False

def propose(n, my_value, quorum_for_prepare, quorum_for_accept):
    promises = []
    for a in quorum_for_prepare:
        kind, acc = a.prepare(n)
        if kind == "promise":
            promises.append(acc)
    if len(promises) < 2:                       # majority of 3
        return None
    # The key rule: adopt the value of the highest-numbered accepted proposal, if any.
    best_n, best_v = max(promises, key=lambda p: p[0])
    value = best_v if best_v is not None else my_value
    oks = sum(a.accept(n, value) for a in quorum_for_accept)
    return value if oks >= 2 else None

A1, A2, A3 = Acceptor("A1"), Acceptor("A2"), Acceptor("A3")
print("P1 proposes blue ->", propose(1, "blue", [A1, A2], [A1, A2]))   # blue chosen on A1, A2
# P1 crashes before telling anyone. P2 shows up with a higher number and its own value.
print("P2 proposes red  ->", propose(2, "red", [A2, A3], [A2, A3]))    # forced to re-propose blue
print([(a.name, a.accepted) for a in (A1, A2, A3)])` },
    viz: [{
      title: 'Two proposers, one value: why the chosen value survives',
      input: 'blue red chosen',
      inputLabel: 'P1 value, P2 value, scenario: "chosen" (P1\'s accept reached a majority) or "lost" (reached only A1)',
      gen: function (input) {
        var t = String(input === undefined ? 'blue red chosen' : input).trim().split(/\s+/);
        if (t.length < 2) throw new Error('Format: "blue red chosen" or "blue red lost"');
        var v1 = t[0].slice(0, 10), v2 = t[1].slice(0, 10), mode = (t[2] || 'chosen').toLowerCase();
        if (v1 === v2) throw new Error('Use two different values so you can see which one wins');
        if (mode !== 'chosen' && mode !== 'lost') throw new Error('Scenario must be "chosen" or "lost"');
        var acc = { A1: { p: 0, n: 0, v: '—' }, A2: { p: 0, n: 0, v: '—' }, A3: { p: 0, n: 0, v: '—' } };
        var frames = [];
        function tbl(hl) { var rows = ['A1', 'A2', 'A3'].map(function (k) { return [k, String(acc[k].p), acc[k].n ? '(' + acc[k].n + ', ' + acc[k].v + ')' : 'nothing']; }); return { type: 'table', label: 'Acceptor state', columns: ['acceptor', 'promised ≥', 'accepted (n, value)'], rows: rows, hl: hl || {} }; }
        function g(edges, ehl, hl, tags) {
          return { type: 'graph', directed: true, height: 50, nodes: [{ id: 'P1', label: 'P1', x: 12, y: 12 }, { id: 'P2', label: 'P2', x: 12, y: 40 }, { id: 'A1', label: 'A1', x: 70, y: 6 }, { id: 'A2', label: 'A2', x: 70, y: 25 }, { id: 'A3', label: 'A3', x: 70, y: 44 }], edges: edges, ehl: ehl || {}, hl: hl || {}, tags: tags || { P1: 'wants ' + v1, P2: 'wants ' + v2 } };
        }
        frames.push({ narr: 'Two proposers want different values: P1 → <b>' + v1 + '</b>, P2 → <b>' + v2 + '</b>. Three acceptors; a majority is 2. Goal: everyone ends up agreeing on <b>exactly one</b> value, forever.', parts: [g([]), tbl()] });
        acc.A1.p = 1; acc.A2.p = 1;
        frames.push({ narr: '<b>Phase 1a:</b> P1 sends <b>Prepare(1)</b> to A1 and A2 (a majority). Meaning: "promise to ignore any proposal numbered below 1, and tell me what you already accepted."', parts: [g([['P1', 'A1', 'Prepare(1)'], ['P1', 'A2', 'Prepare(1)']], { 'P1-A1': 'cur', 'P1-A2': 'cur' }, { P1: 'cur' }), tbl({ 0: 'win', 1: 'win' })] });
        frames.push({ narr: '<b>Phase 1b:</b> both promise. Neither has accepted anything yet, so P1 is free to propose its own value <b>' + v1 + '</b>.', parts: [g([['A1', 'P1', 'Promise(1, none)'], ['A2', 'P1', 'Promise(1, none)']], { 'A1-P1': 'ok', 'A2-P1': 'ok' }, { P1: 'ok' }), tbl({ 0: 'ok', 1: 'ok' })] });
        acc.A1.n = 1; acc.A1.v = v1;
        if (mode === 'chosen') { acc.A2.n = 1; acc.A2.v = v1; }
        frames.push({ narr: '<b>Phase 2a/2b:</b> P1 sends <b>Accept(1, ' + v1 + ')</b>. ' + (mode === 'chosen' ? 'A1 and A2 both accept. <span class="c-g">A majority accepted proposal 1 → "' + v1 + '" is now CHOSEN</span> — even though nobody knows it yet!' : 'Only A1 receives it (the message to A2 is lost). 1 of 3 is not a majority → <b>nothing is chosen yet</b>.') + ' Then <span class="c-r">P1 crashes</span>.', parts: [g([['P1', 'A1', 'Accept(1,' + v1 + ')'], ['P1', 'A2', 'Accept(1,' + v1 + ')']], { 'P1-A1': 'ok', 'P1-A2': mode === 'chosen' ? 'ok' : 'bad' }, { P1: 'bad' }, { P1: 'CRASHED', P2: 'wants ' + v2 }), tbl(mode === 'chosen' ? { 0: 'sel', 1: 'sel' } : { 0: 'cur' })] });
        acc.A2.p = 2; acc.A3.p = 2;
        frames.push({ narr: 'P2 knows nothing about P1. It picks a <b>higher</b> number, 2, and sends <b>Prepare(2)</b> to A2 and A3 (a different majority — but every majority overlaps with every other: here they share <b>A2</b>).', parts: [g([['P2', 'A2', 'Prepare(2)'], ['P2', 'A3', 'Prepare(2)']], { 'P2-A2': 'cur', 'P2-A3': 'cur' }, { P2: 'cur', P1: 'done' }, { P1: 'CRASHED', P2: 'wants ' + v2 }), tbl({ 1: 'win', 2: 'win' })] });
        var forced = mode === 'chosen';
        frames.push({ narr: forced ? 'A2 promises <b>and reports</b> "I already accepted (1, ' + v1 + ')". A3 reports nothing. <b>The rule:</b> P2 must propose the value of the highest-numbered accepted proposal it heard about → P2 must give up "' + v2 + '" and propose <b>' + v1 + '</b>.' : 'A2 and A3 both promise and report <b>nothing accepted</b> (A2 never got P1\'s accept). P2 is therefore free to use its own value <b>' + v2 + '</b>. That is safe: "' + v1 + '" was never chosen.', parts: [g([['A2', 'P2', forced ? 'Promise(2, (1,' + v1 + '))' : 'Promise(2, none)'], ['A3', 'P2', 'Promise(2, none)']], { 'A2-P2': forced ? 'sel' : 'ok', 'A3-P2': 'ok' }, { P2: 'cur', P1: 'done' }, { P1: 'CRASHED', P2: forced ? 'must propose ' + v1 : 'free: ' + v2 }), tbl(forced ? { 1: 'sel' } : { 1: 'ok', 2: 'ok' })] });
        var fin = forced ? v1 : v2;
        acc.A2.n = 2; acc.A2.v = fin; acc.A3.n = 2; acc.A3.v = fin;
        frames.push({ narr: 'P2 sends <b>Accept(2, ' + fin + ')</b>; A2 and A3 accept. <span class="c-g">Chosen value: "' + fin + '"</span>. ' + (forced ? 'Same value as before — Paxos never "un-chooses". The number changed (1 → 2) but the value did not.' : 'A1 still holds the orphan (1, ' + v1 + '), but it never reached a majority, so it never mattered.'), parts: [g([['P2', 'A2', 'Accept(2,' + fin + ')'], ['P2', 'A3', 'Accept(2,' + fin + ')']], { 'P2-A2': 'ok', 'P2-A3': 'ok' }, { P2: 'sel', A2: 'ok', A3: 'ok', P1: 'done' }, { P1: 'CRASHED', P2: 'chose ' + fin }), tbl({ 1: 'sel', 2: 'sel' })] });
        frames.push({ narr: 'Late message: P1 reboots and retries <b>Accept(1, ' + v1 + ')</b> at A3. A3 has promised ≥ 2, so it <span class="c-r">rejects proposal 1</span>. Old proposers cannot overwrite newer decisions — just like stale Raft leaders with old terms.', parts: [g([['P1', 'A3', 'Accept(1,' + v1 + ')']], { 'P1-A3': 'bad' }, { P1: 'bad', A3: 'cur' }, { P1: 'stale #1', P2: 'chose ' + fin }), tbl({ 2: 'bad' })] });
        frames.push({ narr: '<b>Takeaways:</b> (1) numbers order proposals, (2) promises fence off old proposals, (3) the "adopt the highest accepted value" rule + overlapping majorities make the choice permanent. <b>Liveness caveat:</b> P1 and P2 could keep preempting each other with higher numbers forever (dueling proposers) — Multi-Paxos fixes that by electing one stable leader.', parts: [g([], {}, { A2: 'sel', A3: 'sel' }, { P1: 'stale', P2: 'leader?' }), tbl({ 1: 'sel', 2: 'sel' })] });
        return frames;
      }
    }],
    examples: [
      { title: 'Making proposal numbers unique', html: `<p>Two proposers must never use the same number. Common trick: <code>n = round × 100 + nodeId</code>. Node 3 in round 7 uses 703, node 5 uses 705. To go higher, bump the round. Raft does the same with <code>(term, candidateId)</code> votes, except one term can have at most one winner, so the id is not needed in the number.</p>` },
      { title: 'Dueling proposers (livelock)', html: `<p>P1 prepares 1; P2 prepares 2 (kills P1's accept); P1 prepares 3 (kills P2's accept); P2 prepares 4… ${H.c('r', 'forever, no value chosen')}. Safety is never violated — progress just stops. Fix: random back-off and a single leader. This is the practical face of the <b>FLP impossibility</b> result.</p>` },
      { title: 'Where Paxos runs in real life', html: `${H.table(['System', 'Protocol'], [['Google Chubby, Spanner, Megastore', 'Multi-Paxos per replica group'], ['Apache ZooKeeper', 'Zab (Paxos-like atomic broadcast)'], ['Apache Cassandra lightweight transactions', 'Paxos per partition key (IF NOT EXISTS)'], ['etcd, Consul, CockroachDB, TiKV, Kafka KRaft, MongoDB', 'Raft or Raft-like'], ['Azure Cosmos DB, DynamoDB internals', 'Paxos-family replication within a partition']])}` },
      { title: 'Flexible quorums', html: `<p>Paxos only needs phase-1 quorums to intersect phase-2 quorums (<b>Flexible Paxos</b>, 2016). With 6 acceptors you could use phase-2 quorum of 2 (fast writes) and phase-1 quorum of 5 (rare leader changes): 2 + 5 &gt; 6. Writes get cheaper; leader election gets harder.</p>` }
    ],
    deepDive: `<p><b>Proof sketch (P2c in Lamport's "Paxos Made Simple"):</b> suppose value v is chosen at number n. Induction over every number m &gt; n: the proposer of m collected promises from a majority Q; Q intersects the majority that accepted (n, v); the promises report the highest accepted proposal ≥ n among Q, which by induction has value v; so the proposer of m proposes v. Hence every accepted proposal numbered ≥ n has value v.</p>
<p><b>Multi-Paxos engineering</b> ("Paxos Made Live", Google 2007) needs a lot the paper skips: leader leases, log holes (a slot may be decided while an earlier slot is not), snapshots, membership changes, disk corruption handling, and master leases for local reads. Raft packages these decisions — notably "a leader's log has no holes" — which is why it is easier to implement correctly.</p>
<p><b>Variants worth knowing by name:</b> Fast Paxos (clients send straight to acceptors, bigger quorums), EPaxos (leaderless, commits non-conflicting commands in one round trip from any replica — good for geo-distribution), Vertical Paxos (reconfiguration via a master), and Byzantine variants (PBFT, HotStuff in blockchains) that tolerate lying nodes using 3f + 1 replicas instead of 2f + 1.</p>`,
    aiEra: `<p><b>What AI changes:</b> Paxos papers are dense; an assistant can walk you through a proof line by line, build a step-by-step trace like the visualizer above for any interleaving you describe, or translate between Raft and Paxos vocabulary on demand. <b>Use AI as a partner:</b> <code>Give me an interleaving of 2 proposers and 3 acceptors where removing the "adopt highest accepted value" rule chooses two different values</code> — then check it by hand. <b>Where AI goes wrong:</b> it often says "Paxos needs a leader" (single-decree does not; Multi-Paxos uses one for liveness/performance), claims Paxos guarantees termination (it cannot — FLP), or mixes up 2f + 1 crash tolerance with 3f + 1 Byzantine tolerance. <b>What you must still own:</b> the overlapping-majorities argument in one sentence, the Raft-vs-Paxos trade-off, and recognising that most product teams should consume consensus (etcd, Spanner, DynamoDB) rather than build it.</p>`
  });

  /* =====================================================================
     TOPIC 4 — ZooKeeper / etcd coordination services
     ===================================================================== */
  topics.push({
    title: 'Coordination Services: ZooKeeper & etcd',
    analogy: `<p>An office has one <b>reception desk with a sign-in book</b> that never loses pages (because three receptionists keep identical copies). Teams use it to coordinate: "Who is today's on-call? Look at the first name in the book." "When Asha leaves, ring the next person." Each sign-in line is erased automatically when the person's badge stops beeping. You do not run your own consensus — you ask reception. ZooKeeper and etcd are that reception desk for computers.</p>`,
    explain: `<p>Building consensus into every service is hard, so we put it in one small, highly reliable <b>coordination service</b> and let many services use it for <i>small, critical</i> data: who is leader, which shard lives where, feature flags, service discovery, locks.</p>
${H.table(['', 'Apache ZooKeeper', 'etcd'], [['Consensus', 'Zab (leader-based atomic broadcast)', 'Raft'], ['Data model', 'tree of <b>znodes</b> (/app/config/db), each ≤ 1 MB', 'flat ordered key space (/app/config/db), range queries, MVCC revisions'], ['Liveness of clients', '<b>sessions</b> + <b>ephemeral</b> znodes (deleted when the session dies)', '<b>leases</b> with TTL; keys attached to a lease die with it'], ['Ordering helpers', '<b>sequential</b> znodes (n_0000000007)', 'global <b>revision</b> numbers (create_revision, mod_revision)'], ['Change notification', 'one-shot <b>watches</b> (re-register after firing; 3.6+ has persistent watches)', 'streaming <b>watch</b> from any revision (no gaps)'], ['Atomic multi-op', '<code>multi()</code>', '<b>Txn</b>: if (compare) then (ops) else (ops)'], ['Famous users', 'Hadoop, HBase, older Kafka, Solr', 'Kubernetes (all cluster state), CoreDNS, Vitess, M3']])}
<p><b>Guarantees:</b> all writes go through the leader and are linearizable. ZooKeeper reads are served by the server you are connected to and can be slightly stale (call <code>sync()</code> first for fresh data), but each client sees its own writes in order (FIFO client order). etcd reads are linearizable by default.</p>
<p><b>Classic recipes:</b></p>
<ul>
<li><b>Leader election:</b> every candidate creates an <b>ephemeral sequential</b> node under <code>/election</code>. Lowest number = leader. Everyone else watches only the node <i>just before</i> theirs (no herd effect). If the leader's process dies, its session expires, its node vanishes, and the next one takes over. etcd: <code>campaign</code> on a key prefix with a lease; lowest create_revision wins.</li>
<li><b>Service discovery:</b> each instance registers an ephemeral node <code>/services/payments/10.0.0.7:8080</code>; clients watch the directory.</li>
<li><b>Configuration:</b> store config, watch it, hot-reload on change.</li>
<li><b>Distributed locks / barriers / group membership</b> — same building blocks.</li>
</ul>
<p><b>Size rule:</b> these systems hold <b>megabytes to a few GB</b>, not your business data. etcd's default quota is 2 GB (8 GB suggested max). Every write is a consensus round, so think hundreds to tens of thousands of writes per second — not millions.</p>`,
    clues: ['"service discovery / which instances are alive" → ephemeral nodes or leases + watches', '"only one instance may run the scheduled job" → leader election recipe in ZooKeeper/etcd', '"store the shard map / cluster membership consistently" → coordination service', '"Kubernetes control plane" → etcd', '"notify all workers when config changes" → watches', '"thundering herd when the lock is released" → watch only your predecessor (sequential nodes)'],
    code: [{ lang: 'python', run: true, title: 'Leader election with ephemeral sequential nodes (simulated, runnable)', code: `class FakeZooKeeper:
    """Just enough ZooKeeper to show the election recipe: ephemeral + sequential + watch."""
    def __init__(self):
        self.seq = 0
        self.nodes = {}          # path -> owner session
        self.watches = {}        # watched path -> callback

    def create_ephemeral_sequential(self, prefix, session):
        self.seq += 1
        path = f"{prefix}{self.seq:010d}"
        self.nodes[path] = session
        return path

    def children(self, parent):
        return sorted(p for p in self.nodes if p.startswith(parent))

    def watch_delete(self, path, callback):
        self.watches[path] = callback          # one-shot watch

    def expire_session(self, session):
        for path in [p for p, s in self.nodes.items() if s == session]:
            del self.nodes[path]               # ephemeral nodes die with their session
            cb = self.watches.pop(path, None)
            if cb:
                cb(path)

zk = FakeZooKeeper()

def join(name):
    me = zk.create_ephemeral_sequential("/election/n_", name)
    check(name, me)

def check(name, me):
    kids = zk.children("/election/")
    if kids[0] == me:
        print(f"{name}: I am the LEADER ({me})")
        return
    predecessor = kids[kids.index(me) - 1]   # watch only the node right before mine
    print(f"{name}: follower, watching {predecessor}")
    zk.watch_delete(predecessor, lambda gone: check(name, me))

for worker in ["w1", "w2", "w3", "w4"]:
    join(worker)
print("-- w1's process freezes; its session times out --")
zk.expire_session("w1")
print("-- w3 crashes (not the leader) --")
zk.expire_session("w3")` }, { lang: 'bash', title: 'Same ideas with etcdctl (v3)', code: `# Register a service instance tied to a 10-second lease (dies if we stop renewing)
LEASE=$(etcdctl lease grant 10 | awk '{print $2}')
etcdctl put /services/payments/10.0.0.7 '{"port":8080}' --lease=$LEASE
etcdctl lease keep-alive $LEASE &

# Watch for membership changes
etcdctl watch --prefix /services/payments/

# Leader election helper: blocks until this process is leader, prints the key it holds
etcdctl elect scheduler-leader "node-7"

# Compare-and-swap with a transaction: only set config if nobody changed it since revision 42
etcdctl txn <<'EOF'
mod("/config/db") = "42"

put /config/db "postgres://new-primary"

EOF` }],
    viz: [{
      title: 'ZooKeeper leader election: ephemeral sequential znodes + predecessor watches',
      input: '4 1',
      inputLabel: 'Number of workers (2-6), worker whose process dies (1 = current leader)',
      gen: function (input) {
        var a = ints(input, '4 1');
        var n = a[0], dead = a[1];
        if (!(n >= 2 && n <= 6)) throw new Error('Workers must be 2 to 6, e.g. "4 1"');
        if (!(dead >= 1 && dead <= n)) throw new Error('Dying worker must be between 1 and the number of workers');
        var frames = [], alive = [], seqs = [];
        for (var i = 0; i < n; i++) { alive.push(false); seqs.push('n_' + ('000' + (i + 1)).slice(-4)); }
        function nodesFor() {
          var out = [box('ZK', 'ZooKeeper ensemble (3 servers, Zab)', 50, 6, 50), box('E', '/election', 50, 22)];
          for (var i = 0; i < n; i++) {
            var x = Math.round(8 + i * (84 / Math.max(1, n - 1)));
            if (alive[i]) out.push(box('Z' + i, seqs[i], x, 38));
            out.push({ id: 'W' + i, label: 'w' + (i + 1), x: x, y: 55 });
          }
          return out;
        }
        function live() { var r = []; for (var i = 0; i < n; i++) if (alive[i]) r.push(i); return r; }
        function edges(extra) {
          var e = [['ZK', 'E']], L = live();
          L.forEach(function (i, k) { e.push(['E', 'Z' + i]); e.push(['W' + i, 'Z' + i, k === 0 ? 'owns' : '']); if (k > 0) e.push(['W' + i, 'Z' + L[k - 1], 'watch']); });
          return e.concat(extra || []);
        }
        function tags() { var t = {}, L = live(); for (var i = 0; i < n; i++) t['W' + i] = alive[i] ? (L[0] === i ? 'LEADER' : 'follower') : (i === dead - 1 && frames.length > n ? 'dead' : 'starting'); return t; }
        function tbl(hl) { var L = live(); return { type: 'table', label: 'Children of /election (sorted)', columns: ['znode', 'owner session', 'type', 'role'], rows: L.map(function (i, k) { return [seqs[i], 'w' + (i + 1), 'EPHEMERAL_SEQUENTIAL', k === 0 ? 'leader' : 'watches ' + seqs[L[k - 1]]]; }), hl: hl || {} }; }
        function push(narr, nhl, ehl, thl) { frames.push({ narr: narr, parts: [{ type: 'graph', directed: true, height: 62, nodes: nodesFor(), edges: edges(), hl: nhl || {}, ehl: ehl || {}, tags: tags() }, tbl(thl)] }); }
        push('Empty <b>/election</b> parent znode in a 3-server ZooKeeper ensemble. ' + n + ' workers want exactly one of them to run the nightly job.', { E: 'cur' });
        for (var j = 0; j < n; j++) {
          alive[j] = true;
          var h = {}; h['Z' + j] = 'ok'; h['W' + j] = 'cur';
          var L = live(), k = L.indexOf(j);
          push('w' + (j + 1) + ' creates <b>/election/' + seqs[j] + '</b> with flags EPHEMERAL (dies with its session) + SEQUENTIAL (ZooKeeper appends an increasing number). ' + (k === 0 ? 'It lists the children: its number is the <b>lowest → leader</b>.' : 'It is not lowest, so it sets a watch on <b>' + seqs[L[k - 1]] + '</b> only — its direct predecessor.'), h, {}, (function () { var o = {}; o[k] = 'ok'; return o; })());
        }
        var L0 = live(), idx = dead - 1, pos = L0.indexOf(idx), succ = L0[pos + 1];
        var hd = {}; hd['W' + idx] = 'bad'; hd['Z' + idx] = 'bad';
        push('<span class="c-r">w' + dead + '\'s process freezes</span> (crash or long GC). It stops sending session heartbeats. After the <b>session timeout</b> (e.g. 10 s) ZooKeeper declares the session dead.', hd, {}, (function () { var o = {}; o[pos] = 'bad'; return o; })());
        alive[idx] = false;
        var wasLeader = pos === 0;
        if (succ !== undefined) {
          var hs = {}; hs['W' + succ] = 'cur';
          push('The ephemeral node <b>' + seqs[idx] + '</b> is deleted automatically. Only <b>w' + (succ + 1) + '</b> was watching it, so <b>only one</b> worker is woken — no thundering herd of ' + (n - 1) + ' workers all re-reading /election.', hs, {}, {});
          var L1 = live(), k1 = L1.indexOf(succ);
          var hz = {}; hz['W' + succ] = k1 === 0 ? 'sel' : 'ok';
          push(k1 === 0 ? '<span class="c-g">w' + (succ + 1) + ' lists the children, sees its node is now lowest → it becomes LEADER.</span> ' + (wasLeader ? 'Failover took ≈ session timeout + one notification.' : '') : 'w' + (succ + 1) + ' lists the children: it is still not lowest (a non-leader died), so it simply re-watches its new predecessor <b>' + seqs[L1[k1 - 1]] + '</b>. The leader is unaffected.', hz, {}, (function () { var o = {}; o[k1] = k1 === 0 ? 'sel' : 'ok'; return o; })());
        } else {
          var L2 = live();
          push('The ephemeral node <b>' + seqs[idx] + '</b> is deleted. It was the last in line, so nobody was watching it and nobody needs to react. ' + (L2.length ? 'w' + (L2[0] + 1) + ' remains leader.' : ''), {}, {}, {});
        }
        var hz2 = {}, Lf = live(); if (Lf.length) hz2['W' + Lf[0]] = 'sel';
        push('<b>The catch:</b> if w' + dead + ' was not really dead (just paused), it may wake up still <i>believing</i> it is leader until it notices its session expired. ZooKeeper cannot stop it from writing to <b>other</b> systems. Use the znode\'s creation zxid (or etcd revision) as a <b>fencing token</b> — next topic.', hz2, {}, {});
        return frames;
      }
    }],
    examples: [
      { title: 'Kubernetes stores everything in etcd', html: `<p>Every Pod, Deployment and Secret is a key such as <code>/registry/pods/default/web-7c9f</code>. The API server is the only etcd client; controllers <b>watch</b> the API server (which watches etcd) and react. Controllers like kube-scheduler and kube-controller-manager run as several replicas but use a <b>Lease</b> object (leader election) so only one is active. When etcd loses quorum, the cluster keeps running existing Pods but nothing can change.</p>` },
      { title: 'Kafka moved off ZooKeeper (KRaft)', html: `<p>Old Kafka kept broker membership, topic config and the controller election in ZooKeeper. Large clusters hit limits (slow controller failover with hundreds of thousands of partitions). <b>KRaft</b> moves metadata into an internal Raft-replicated log inside Kafka itself. Kafka 4.0 (2025) removed ZooKeeper mode entirely. Lesson: a separate coordination service is simpler to start with, but can become the bottleneck.</p>` },
      { title: 'Configuration with compare-and-set', html: `<p>Two admins edit <code>/config/rate_limit</code> at once. Each reads it at revision 42, edits, then writes with a txn <code>if mod_revision == 42 then put</code>. The first succeeds (revision becomes 43); the second fails the compare and must re-read. This is <b>optimistic concurrency</b> — no lost updates, no locks held.</p>` },
      { title: 'Sizing a coordination cluster', html: `${H.table(['Choice', 'Recommendation'], [['Members', '3 (tolerate 1 failure) or 5 (tolerate 2); never 2, 4 adds nothing'], ['Placement', 'one per availability zone'], ['Disk', 'fast SSD; fsync latency directly drives write latency'], ['Data', 'small metadata only; not a general database'], ['Clients', 'many readers fine; keep write rate modest']])}` }
    ],
    deepDive: `<p><b>Sessions vs leases and the pause problem:</b> a ZooKeeper session is kept alive by client heartbeats; the server decides when it expired. The client only learns of expiry after reconnecting, so for a window the client may still think it holds leadership. Similarly an etcd lease keep-alive can fail silently while the process is paused. Never treat "I hold the lease" as proof at the moment of a side effect — use fencing (revision/zxid) or have the side effect itself go through a transaction that checks ownership (etcd Txn: <code>if create_revision(lockKey) == myRev then put data</code>).</p>
<p><b>Watches are hints, not a log (ZooKeeper):</b> classic watches fire once; between firing and re-registering you may miss changes, so always re-read state after a watch fires. etcd watches resume from a revision and never skip events, unless that revision has been <b>compacted</b> — then you must re-list. Kubernetes informers implement exactly this "list then watch from revision" pattern.</p>
<p><b>Operational realities:</b> large values or huge numbers of watchers hurt; etcd needs periodic compaction and defragmentation; ZooKeeper observers scale reads without affecting quorum. Alternatives: Consul (Raft + service mesh + health checks), and in managed clouds you often use the database itself (DynamoDB conditional writes, Spanner, Cloud Spanner/Firestore transactions) for leader election.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write the Curator / etcd client boilerplate for leader election in seconds, and can explain etcd alarms (NOSPACE, slow fdatasync) from logs. Agent orchestration frameworks increasingly need the same primitives — "only one agent owns this ticket", "which workers are alive" — and often reinvent them badly with a database row and a timestamp. <b>Use AI as a partner:</b> <code>Review this leader-election code: what happens if the process pauses for 30 s after acquiring leadership?</code> <b>Where AI goes wrong:</b> it watches the parent node (herd effect), forgets to re-register one-shot watches, assumes a lease guarantees exclusive access without fencing, or suggests storing large blobs in etcd. <b>What you must still own:</b> deciding whether you need a coordination service at all, sizing it (3 vs 5), and designing for the pause problem.</p>`
  });

  /* =====================================================================
     TOPIC 5 — Distributed locks & fencing tokens
     ===================================================================== */
  topics.push({
    title: 'Distributed Locks, Leases & Fencing Tokens',
    analogy: `<p>A shared meeting room has a booking desk that hands out a <b>numbered ticket</b> and a <b>30-minute slot</b>. Asha gets ticket <b>#33</b>, then falls asleep in the corridor for an hour. Her slot expires, so Ben gets ticket <b>#34</b> and starts his meeting. Asha wakes up and walks in, convinced the room is hers. If the room has a guard who checks <i>"is your ticket at least as high as the highest I have seen?"</i>, Asha (#33 &lt; #34) is turned away. Without the guard, two meetings collide. The ticket number is a <b>fencing token</b>; the guard is the storage system checking it.</p>`,
    explain: `<p>A <b>distributed lock</b> lets many processes on many machines agree that only one of them does something at a time: process a file, run a cron job, update an account. Two reasons people want one:</p>
<ul><li><b>Efficiency</b> — avoid doing the same work twice (sending the same report twice is annoying but harmless). A simple best-effort lock (e.g. a single Redis <code>SET key value NX PX 30000</code>) is fine.</li>
<li><b>Correctness</b> — two holders at once would corrupt data or double-charge a customer. Now you need a lock built on consensus <i>and</i> fencing.</li></ul>
<p><b>Why "lock + expiry" alone is not safe:</b> a lock must have a timeout (a <b>lease</b>), otherwise a crashed holder blocks everyone forever. But the holder cannot reliably know its lease is still valid:</p>
${H.table(['Time', 'Client A', 'Lock service', 'Client B'], [['0 s', 'acquires lease (30 s)', 'holder = A', ''], ['1 s', H.c('y', 'stop-the-world GC pause / VM migration / page fault storm'), '', ''], ['31 s', '(still paused)', H.c('r', 'lease expired'), 'acquires lease → holder = B'], ['32 s', '', '', 'writes file'], ['40 s', H.c('r', 'wakes up, thinks it still holds the lock, writes file'), '', H.c('r', 'B\'s write is overwritten')]])}
<p>Checking "do I still hold the lock?" right before writing does not help — the pause can happen <i>between</i> the check and the write, or the network packet can sit in a queue for a minute. Clocks also drift.</p>
<p><b>The fix — fencing tokens:</b></p>
<ol>
<li>Every time the lock is granted, the lock service returns a number that <b>strictly increases</b>: 33, 34, 35… (etcd: the key's revision; ZooKeeper: the znode's zxid / version).</li>
<li>The client sends the token with every write to the protected resource.</li>
<li>The <b>resource itself</b> remembers the highest token it has accepted and <b>rejects anything lower</b>: <code>if token &lt; maxSeen: reject</code>.</li>
</ol>
<p>Now Asha's delayed write with #33 arrives after Ben's #34 and is refused. Safety no longer depends on clocks or pauses; it depends on a monotonic counter (from consensus) plus a check at the resource.</p>
${H.kv([['Need efficiency only', 'single Redis SET NX PX, accept rare double work'], ['Need correctness', 'etcd / ZooKeeper / DB-backed lock + fencing token checked by the resource'], ['Resource cannot check tokens', 'use the resource\'s own conditional write (version column, CAS, ETag) instead of a lock']], { label: 'Decision guide' })}`,
    clues: ['"only one worker may process this job / file / account at a time" → distributed lock (or a single-writer partition)', '"what if the lock holder pauses or the lease expires mid-operation?" → fencing tokens', '"Redis lock / Redlock" in the question → discuss its timing assumptions and lack of fencing', '"must never double-charge / corrupt data" → correctness lock: consensus-backed + fencing, or avoid the lock with idempotency/CAS', '"leader writes to shared storage (HDFS, S3, DB)" → fencing (epoch numbers) to stop a zombie leader', '"GC pause", "clock drift", "network delay" → leases alone are unsafe'],
    code: [{ lang: 'python', run: true, title: 'Fencing token check at the storage layer (runnable)', code: `import itertools

class LockService:
    """Consensus-backed lock (think etcd). Each grant gets a strictly increasing token."""
    def __init__(self):
        self._counter = itertools.count(33)
        self.holder, self.expires_at, self.token = None, 0, None

    def acquire(self, client, now, ttl):
        if self.holder is None or now >= self.expires_at:     # free or lease expired
            self.holder, self.expires_at = client, now + ttl
            self.token = next(self._counter)
            return self.token
        return None

class FencedStorage:
    """The protected resource. It, not the client, enforces safety."""
    def __init__(self):
        self.max_token = 0
        self.value = None

    def write(self, token, value):
        if token < self.max_token:
            print(f"  REJECTED write {value!r}: token {token} < max seen {self.max_token}")
            return False
        self.max_token = token
        self.value = value
        print(f"  accepted write {value!r} with token {token}")
        return True

locks, disk = LockService(), FencedStorage()
token_a = locks.acquire("A", now=0, ttl=30)
print("A got token", token_a)
# ... A pauses for 40 seconds (GC). Its lease expires at t=30.
token_b = locks.acquire("B", now=31, ttl=30)
print("B got token", token_b)
disk.write(token_b, "B's report")
# A wakes up at t=40, still believing it holds the lock:
disk.write(token_a, "A's stale report")
print("final value:", disk.value)` }, { lang: 'java', title: 'Fenced write with a version column (Java, compiles)', code: `public class FencedAccountStore {
    // In a real system this is a DB row: UPDATE accounts SET balance=?, fence=? WHERE id=? AND fence <= ?
    private long maxFence = 0;
    private long balance = 100;

    /** Applies the change only if the caller's fencing token is not older than the newest seen. */
    public synchronized boolean apply(long fencingToken, long delta) {
        if (fencingToken < maxFence) {
            return false;                    // stale lock holder (zombie) -> refuse
        }
        maxFence = fencingToken;
        balance += delta;
        return true;
    }

    public synchronized long balance() { return balance; }

    public static void main(String[] args) {
        FencedAccountStore store = new FencedAccountStore();
        System.out.println(store.apply(34, -30));   // new holder B: accepted
        System.out.println(store.apply(33, -30));   // paused old holder A: rejected
        System.out.println(store.balance());        // 70, not 40
    }
}` }],
    viz: [{
      title: 'A paused lock holder wakes up: fencing ON vs OFF',
      input: 'on 33',
      inputLabel: 'Fencing "on" or "off", first token number (e.g. "on 33" or "off 33")',
      gen: function (input) {
        var t = String(input === undefined ? 'on 33' : input).trim().split(/\s+/);
        var mode = (t[0] || 'on').toLowerCase(), tok = parseInt(t[1] || '33', 10);
        if (mode !== 'on' && mode !== 'off') throw new Error('First word must be "on" or "off"');
        if (isNaN(tok) || tok < 1 || tok > 1e6) throw new Error('Token must be a positive number, e.g. 33');
        var fence = mode === 'on', frames = [];
        var st = { maxToken: fence ? tok - 1 : 'n/a', value: '"v0"', lockHolder: '—', clock: '0 s' };
        var timeline = [];
        function g(edges, ehl, hl, tags) {
          return { type: 'graph', directed: true, height: 50, nodes: [box('A', 'Client A', 12, 10), box('B', 'Client B', 12, 40), box('L', 'Lock service (etcd)', 50, 25, 30), box('S', fence ? 'Storage (checks token)' : 'Storage (no check)', 88, 25, 26)], edges: edges, ehl: ehl || {}, hl: hl || {}, tags: tags || {} };
        }
        function push(narr, gr, vhl, row) {
          if (row) timeline.push(row);
          frames.push({ narr: narr, parts: [gr, { type: 'vars', label: 'Shared state', vals: cp(st), hl: vhl || {} }, { type: 'table', label: 'Timeline', columns: ['time', 'event'], rows: timeline.slice(), hl: (function () { var h = {}; if (timeline.length) h[timeline.length - 1] = (row && row[2]) || 'cur'; return h; })() }] });
        }
        push('Two clients want to update the same report file. Lease TTL = 30 s. Fencing is <b>' + (fence ? 'ON — storage remembers the highest token' : 'OFF — storage trusts whoever writes') + '</b>.', g([]), {}, ['0 s', 'start', '']);
        st.lockHolder = 'A (token ' + tok + ')';
        push('A acquires the lock. The lock service grants a 30 s lease and a monotonically increasing <b>fencing token ' + tok + '</b> (in etcd: the key\'s revision).', g([['A', 'L', 'acquire'], ['L', 'A', 'token ' + tok]], { 'A-L': 'ok', 'L-A': 'ok' }, { A: 'ok' }, { A: 'holds #' + tok }), { lockHolder: 'ok' }, ['0 s', 'A gets lease, token ' + tok, 'ok']);
        st.clock = '1 s';
        push('<span class="c-y">A enters a 40-second stop-the-world GC pause</span> right after deciding to write (it already checked that it holds the lock!). Nothing on A runs — not even its lease-renewal thread.', g([], {}, { A: 'cur' }, { A: 'PAUSED (thinks it holds #' + tok + ')' }), {}, ['1 s', 'A pauses (GC)', 'cur']);
        st.clock = '30 s'; st.lockHolder = '— (expired)';
        push('<span class="c-r">A\'s lease expires</span> at the lock service. From the service\'s point of view A is dead. It cannot tell "crashed" from "paused" — no system can.', g([], {}, { L: 'bad', A: 'cur' }, { A: 'PAUSED', L: 'lease expired' }), { lockHolder: 'bad' }, ['30 s', 'lease of A expires', 'bad']);
        st.clock = '31 s'; st.lockHolder = 'B (token ' + (tok + 1) + ')';
        push('B acquires the lock and gets <b>token ' + (tok + 1) + '</b> (higher than every earlier token).', g([['B', 'L', 'acquire'], ['L', 'B', 'token ' + (tok + 1)]], { 'B-L': 'ok', 'L-B': 'ok' }, { B: 'ok', A: 'cur' }, { B: 'holds #' + (tok + 1), A: 'PAUSED' }), { lockHolder: 'ok' }, ['31 s', 'B gets lease, token ' + (tok + 1), 'ok']);
        st.clock = '32 s'; st.value = '"B\'s report"'; if (fence) st.maxToken = tok + 1;
        push('B writes its report with token ' + (tok + 1) + '. ' + (fence ? 'Storage: ' + (tok + 1) + ' ≥ max seen ' + (tok - 1) + ' → accept, and remember <b>maxToken = ' + (tok + 1) + '</b>.' : 'Storage accepts (it does not look at tokens).'), g([['B', 'S', 'write #' + (tok + 1)]], { 'B-S': 'ok' }, { S: 'ok', A: 'cur' }, { B: 'holds #' + (tok + 1), A: 'PAUSED' }), { value: 'ok', maxToken: fence ? 'ok' : '' }, ['32 s', 'B writes with token ' + (tok + 1), 'ok']);
        st.clock = '41 s';
        push('A wakes up. Its code continues exactly where it stopped — it "knows" it holds the lock, so it sends its write tagged with <b>token ' + tok + '</b>. (Its delayed write could also have been stuck in a network queue: same effect.)', g([['A', 'S', 'write #' + tok]], { 'A-S': 'cur' }, { A: 'cur' }, { A: 'zombie #' + tok, B: 'holds #' + (tok + 1) }), {}, ['41 s', 'A (zombie) writes with token ' + tok, 'cur']);
        if (fence) {
          push('<span class="c-r">REJECTED.</span> Storage compares: ' + tok + ' &lt; maxToken ' + (tok + 1) + ' → the request comes from a stale lock holder. B\'s report is safe. A gets an error and can re-acquire the lock if it still needs to.', g([['A', 'S', 'write #' + tok], ['S', 'A', 'stale token']], { 'A-S': 'bad', 'S-A': 'bad' }, { A: 'bad', S: 'ok' }, { A: 'fenced off', B: 'holds #' + (tok + 1) }), { value: 'ok', maxToken: 'ok' }, ['41 s', 'storage rejects token ' + tok + ' (' + tok + ' < ' + (tok + 1) + ')', 'bad']);
          push('<b>Why this works:</b> safety moved from "the client must know whether it holds the lock" (impossible with pauses and clock drift) to "the resource compares two numbers" (always correct). The lock service only has to hand out increasing tokens — which consensus does well.', g([], {}, { S: 'sel', L: 'sel' }, { S: 'enforces safety' }), { maxToken: 'ok' }, null);
        } else {
          st.value = '"A\'s stale report"';
          push('<span class="c-r">ACCEPTED — data corrupted.</span> Storage cannot tell A is a zombie, so A overwrites B\'s newer report. Both clients "held the lock" and the lock protected nothing. Try input <b>on ' + tok + '</b> to see fencing stop this.', g([['A', 'S', 'write #' + tok]], { 'A-S': 'bad' }, { A: 'bad', S: 'bad' }, { A: 'overwrote B!', B: 'thinks it is safe' }), { value: 'bad' }, ['41 s', 'A overwrites B\'s data', 'bad']);
          push('<b>Lesson:</b> a lease-based lock without fencing is only an <i>efficiency</i> optimisation. For correctness, the protected resource must check a monotonic token (or use its own compare-and-set).', g([], {}, { S: 'bad' }, {}), { value: 'bad' }, null);
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Redis single-instance lock (efficiency only)', html: `<p><code>SET lock:report owner-uuid NX PX 30000</code> acquires; release with a Lua script that deletes only if the value is still <code>owner-uuid</code> (so you never release someone else's lock). Good for "avoid sending the digest twice". Not safe for correctness: Redis failover with async replication can lose the key, and there is no fencing token.</p>` },
      { title: 'Redlock and the Kleppmann–antirez debate', html: `<p><b>Redlock</b> acquires the same key on a majority of 5 independent Redis masters within a time budget. Martin Kleppmann (2016) argued it is unsafe for correctness because it relies on bounded clock drift and pause times and produces no fencing token; Salvatore Sanfilippo (antirez) replied that its timing assumptions are reasonable in practice. Interview-safe position: ${H.c('g', 'for correctness use a consensus store with fencing; for efficiency a single Redis lock is enough')}, so Redlock is rarely the right answer.</p>` },
      { title: 'Database row as a lock with built-in fencing', html: `<p>Table <code>locks(name PK, owner, fence BIGINT, expires_at)</code>. Acquire: <code>UPDATE locks SET owner=?, fence=fence+1, expires_at=now()+30s WHERE name=? AND expires_at &lt; now() RETURNING fence</code>. Protected writes: <code>UPDATE files SET body=?, fence=? WHERE id=? AND fence &lt;= ?</code>. One database gives both the lock and the check — often the simplest correct design.</p>` },
      { title: 'Avoiding the lock entirely', html: `<p>Instead of "lock account, read, compute, write", use <b>optimistic concurrency</b>: <code>UPDATE account SET balance = 70, version = 8 WHERE id = 1 AND version = 7</code>. If 0 rows change, someone else won: re-read and retry. Or route all work for one key to <b>one partition consumer</b> (Kafka keyed partitions) so there is never contention. The best distributed lock is often no lock.</p>` }
    ],
    deepDive: `<p><b>Where tokens come from:</b> etcd returns the lock key's <code>create_revision</code> (globally increasing); ZooKeeper offers the zxid of the lock znode or its parent's cversion; Chubby (Google) hands out "sequencers"; HDFS NameNode HA and Kafka controllers use <b>epoch numbers</b> written to shared storage so a deposed leader is fenced. A token is only useful if every resource it guards checks it — if the resource is an external API that ignores tokens, you need idempotency keys or conditional requests (HTTP <code>If-Match</code> with ETags, S3 conditional writes) instead.</p>
<p><b>Lease duration trade-off:</b> short leases (5 – 15 s) mean faster failover but more false expirations under GC or network hiccups; long leases (60 s+) mean long outages when a holder really dies. Renew at ~1/3 of TTL. Holders should stop work if they cannot renew before expiry (a "self-fencing" best effort), but never rely on that for safety.</p>
<p><b>STONITH and other fencing styles:</b> "Shoot The Other Node In The Head" — power off or cut the storage access of the old primary before promoting a new one (classic in database HA). Cloud equivalents: revoke the old instance's IAM credentials, detach the volume, or bump an epoch in the storage layer. The principle is the same: <i>make the zombie unable to do harm</i> rather than trusting it to notice it is a zombie.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an AI "write me a distributed lock in Redis" produces a working-looking SET NX + DEL snippet in seconds — usually without the owner check on release, without fencing, and with the lock released in a <code>finally</code> even after it expired. AI agents running long tool calls are exactly the "paused holder" scenario: an agent may hold a lease on a task while a 3-minute LLM call runs. <b>Use AI as a partner:</b> <code>List every way two holders could both act under this lock design, including GC pauses, failover and clock jumps</code>. <b>Where AI goes wrong:</b> treating Redlock as safe for correctness, checking "isLocked()" before writing as if that closed the race, using wall-clock timestamps as tokens. <b>What you must still own:</b> classifying the lock as efficiency vs correctness, insisting the resource enforces the token, and preferring lock-free designs (CAS, single-writer partitions, idempotency) when possible.</p>`,
    problems: [{
      title: 'Design a Distributed Lock That Is Actually Safe',
      level: 'Hard', tags: ['distributed lock', 'fencing', 'lease', 'etcd'], companies: ['Uber', 'Stripe', 'Netflix', 'Amazon'],
      statement: `<p>Your billing system runs 20 worker instances. Each night, invoices for each customer account must be generated <b>exactly once per account</b>, and an invoice file for an account must never be written by two workers at the same time (a half-overwritten file means a wrong bill). Design the locking scheme. Explain what happens with GC pauses, network partitions, and crashed workers.</p>`,
      constraints: `<p>2 million accounts per night; a single invoice takes 50 ms – 5 s; workers are JVMs (GC pauses up to 30 s observed); invoices are stored in an object store plus a row in Postgres.</p>`,
      example: `<p>Worker W3 takes the lock for account 42 (token 9001), pauses 40 s, lease expires, W7 takes the lock (token 9002) and writes. W3 wakes and tries to write: ${H.c('r', 'must be rejected')} because 9001 &lt; 9002.</p>`,
      brute: { why: `<p>Naive design: Redis <code>SET lock:42 W3 NX EX 30</code>, then write the file, then <code>DEL lock:42</code>. Breaks three ways: (1) GC pause past 30 s → two writers; (2) W3's <code>DEL</code> after its lease expired deletes <b>W7's</b> lock; (3) Redis primary fails over before replicating the key → another worker acquires the same lock. Nothing in the storage layer notices any of this.</p>` },
      mcq: { q: 'Which single change makes the protected write safe even with arbitrary GC pauses?', options: ['Make the lease 10 minutes long', 'Check that you still hold the lock right before writing', 'Have the storage reject writes whose fencing token is lower than the highest it has seen', 'Use Redlock across 5 Redis nodes'], answer: 2, explain: 'Only a check at the resource closes the race; longer leases, pre-write checks and Redlock all still allow a paused holder to write late.' },
      hints: [`<p>Hint 1: Decide if this is efficiency or correctness. A wrong bill = correctness, so a best-effort lock is not enough.</p>`, `<p>Hint 2: Get a monotonic token from a consensus-backed store (etcd revision or a Postgres sequence/row update) and make every write carry it.</p>`, `<p>Hint 3: The resource must enforce it: a Postgres conditional update (<code>WHERE fence &lt;= :token</code>) and write the file to a token-versioned path, then commit the pointer row conditionally. Also ask: can we avoid locks by partitioning accounts across workers?</p>`],
      solution: {
        approach: `<p><b>1. Prefer partitioning over locking.</b> Assign accounts to workers by <code>hash(accountId) mod 1024</code> buckets; each bucket is owned by one worker at a time. That reduces 2 M locks to 1 024 leases.</p>
<p><b>2. Ownership via a consensus-backed lease.</b> Store bucket ownership in etcd (or a Postgres table): acquiring a bucket returns a <b>fencing token</b> = etcd <code>create_revision</code> or <code>fence = fence + 1</code> in the row. Lease TTL 30 s, renewed every 10 s. A worker that fails to renew stops picking new accounts (best effort).</p>
<p><b>3. Fence every side effect.</b> The invoice body goes to object storage under a <b>unique</b> key <code>invoices/2026-10/acct42/token-9002.pdf</code> (never overwritten, so a zombie cannot corrupt it). Then a single Postgres statement publishes it: <code>UPDATE invoice_runs SET file_key=:key, fence=:token, status='DONE' WHERE account_id=42 AND period='2026-10' AND fence &lt;= :token AND status &lt;&gt; 'DONE'</code>. A zombie with token 9001 updates 0 rows and gives up; its orphan file is garbage-collected.</p>
<p><b>4. Exactly-once per account</b> comes from the <code>status &lt;&gt; 'DONE'</code> condition plus a unique key on (account_id, period): retries after crashes are idempotent. <b>Partitions:</b> a worker cut off from etcd loses its lease; another takes over with a higher token; the cut-off worker's late commits are rejected. <b>Crashed workers:</b> lease expires in ≤ 30 s, buckets are re-assigned.</p>
<p><b>Trade-offs:</b> etcd adds an operational dependency; using Postgres for both leases and fencing is simpler if it is already the system of record. Redis/Redlock is rejected because it gives no fencing token and depends on timing assumptions.</p>`,
        complexity: `<p>One lease operation per bucket per 10 s (≈ 100 writes/s for 1 024 buckets) — trivial for etcd. One conditional row update per invoice. Failover time ≤ lease TTL (30 s).</p>`,
        followUps: ['What if the protected resource is a third-party API that does not accept tokens?', 'How would you rebalance buckets when workers are added?', 'Why write the file to a unique key instead of overwriting one path?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Two-phase commit (2PC) and three-phase commit (3PC)
     ===================================================================== */
  topics.push({
    title: 'Distributed Transactions: Two-Phase & Three-Phase Commit',
    analogy: `<p>A wedding. The officiant (the <b>coordinator</b>) first asks each partner: <i>"Do you?"</i> — that is the <b>prepare</b> phase. Once someone says "I do", they are <b>bound</b>: they cannot walk away or marry someone else while waiting. Only when <b>both</b> have said yes does the officiant declare <i>"you are married"</i> — the <b>commit</b> phase. If either says no, it is off for both. And if the officiant faints right after hearing both "I do"s, the couple stands frozen at the altar, unable to leave or celebrate, until the officiant wakes up. That frozen state is 2PC's famous <b>blocking</b> problem.</p>`,
    explain: `<p>Sometimes one business action must change data in <b>several</b> databases or services <i>atomically</i>: all changes happen, or none do. Example: move ₹500 from an account in shard A to an account in shard B. A local transaction cannot span two machines, so we need a protocol: <b>two-phase commit (2PC)</b>.</p>
<p><b>Players:</b> one <b>coordinator</b> (transaction manager) and N <b>participants</b> (resource managers — databases, queues).</p>
<ol>
<li><b>Phase 1 — Prepare (voting):</b> coordinator sends <code>PREPARE(txId)</code>. Each participant does the work, writes it durably to its log, <b>keeps the row locks</b>, and votes <code>YES</code> ("I promise I can commit, no matter what — even after a crash") or <code>NO</code>.</li>
<li><b>Decision:</b> all YES → coordinator writes <code>COMMIT</code> to its own log (this is the <b>commit point</b>). Any NO or timeout → <code>ABORT</code>.</li>
<li><b>Phase 2 — Commit/abort:</b> coordinator tells everyone; participants apply, release locks, and ack. The coordinator retries forever until every participant acks.</li>
</ol>
${H.table(['Participant state', 'Meaning', 'Can it decide alone?'], [['INIT / working', 'has not voted yet', 'yes — may abort unilaterally'], ['PREPARED (voted YES)', 'work durable, locks held, waiting', H.c('r', 'NO — must wait for the coordinator (in doubt)')], ['COMMITTED / ABORTED', 'done, locks released', '—']])}
<p><b>The blocking problem:</b> if the coordinator crashes after participants voted YES but before they hear the decision, they are <b>in doubt</b>. They cannot commit (maybe someone voted NO) and cannot abort (maybe the coordinator already logged COMMIT and another participant committed). So they hold their locks until the coordinator recovers — minutes or hours of blocked rows.</p>
<p><b>Three-phase commit (3PC)</b> inserts a <b>PRE-COMMIT</b> phase between voting and committing: after everyone votes YES, the coordinator tells everyone "we are going to commit" and waits for acks before sending COMMIT. Now a participant that timed out can reason: "if I am only PREPARED, nobody can have committed yet → safe to abort; if I am PRE-COMMITTED, everyone voted YES → safe to commit". That removes blocking — but only if the network is <b>synchronous</b> (bounded delays, perfect failure detection). With partitions, 3PC can commit on one side and abort on the other, so it is almost never used in practice.</p>
${H.kv([['2PC', 'safe, but blocks if coordinator dies'], ['3PC', 'non-blocking only with no partitions; extra round trip; rarely used'], ['Modern fix', 'make the coordinator itself a Raft/Paxos group (Spanner, CockroachDB)']], { label: 'Summary' })}
<p><b>Where you meet 2PC:</b> XA transactions (Java JTA across two databases), Postgres <code>PREPARE TRANSACTION</code>, Kafka transactions (internally a 2PC-like protocol with a transaction coordinator), and distributed SQL databases that commit across shards. Across <b>microservices owned by different teams</b>, 2PC is usually avoided — that is what sagas are for.</p>`,
    clues: ['"atomic across two databases / two shards" → 2PC (or design the data so one shard is enough)', '"must never see money debited but not credited, even briefly" → atomic commit (2PC) rather than a saga', '"coordinator crashes after prepare" → blocking / in-doubt transactions, locks held', '"XA", "JTA", "PREPARE TRANSACTION" → classic 2PC', '"is 3PC non-blocking?" → only under synchronous network assumptions; partitions break it', '"Spanner / CockroachDB cross-shard transactions" → 2PC whose coordinator and participants are each replicated with Paxos/Raft'],
    code: { lang: 'python', run: true, title: '2PC with a coordinator crash (runnable)', code: `class Participant:
    def __init__(self, name, will_vote_yes=True):
        self.name, self.will_vote_yes = name, will_vote_yes
        self.state = "INIT"
        self.locks_held = False

    def prepare(self):
        if not self.will_vote_yes:
            self.state = "ABORTED"
            return "NO"
        self.state, self.locks_held = "PREPARED", True     # durable + locks held
        return "YES"

    def finish(self, decision):
        self.state = "COMMITTED" if decision == "COMMIT" else "ABORTED"
        self.locks_held = False

def two_phase_commit(participants, crash_after_votes=False):
    log = []                                   # coordinator's durable log
    votes = [p.prepare() for p in participants]
    print("votes:", votes)
    decision = "COMMIT" if all(v == "YES" for v in votes) else "ABORT"
    if crash_after_votes:
        print("!! coordinator crashed before logging/sending the decision")
        return log
    log.append(decision)                       # the commit point
    for p in participants:
        p.finish(decision)
    return log

ps = [Participant("orders-db"), Participant("payments-db"), Participant("inventory-db")]
two_phase_commit(ps, crash_after_votes=True)
for p in ps:
    print(f"{p.name:13} state={p.state:9} locks_held={p.locks_held}  <- in doubt, must wait")

# Recovery: coordinator restarts, finds no COMMIT record for the tx -> presumed abort.
for p in ps:
    p.finish("ABORT")
print("after recovery:", [(p.name, p.state, p.locks_held) for p in ps])` },
    viz: [{
      title: '2PC messages: happy path, a NO vote, a coordinator crash, and 3PC',
      input: 'crash',
      inputLabel: 'Scenario: commit | no | crash | 3pc',
      gen: function (input) {
        var mode = String(input === undefined ? 'crash' : input).trim().toLowerCase();
        if (['commit', 'no', 'crash', '3pc'].indexOf(mode) < 0) throw new Error('Scenario must be one of: commit, no, crash, 3pc');
        var P = ['Orders', 'Payments', 'Inventory'], ids = ['P1', 'P2', 'P3'];
        var state = ['INIT', 'INIT', 'INIT'], locks = ['no', 'no', 'no'], coord = 'INIT', frames = [];
        function g(edges, ehl, hl, ctag) {
          var tags = { C: ctag || coord }; ids.forEach(function (id, i) { tags[id] = state[i]; });
          return { type: 'graph', directed: true, height: 50, nodes: [box('C', 'Coordinator', 14, 25), box('P1', 'Orders DB', 78, 7), box('P2', 'Payments DB', 78, 25), box('P3', 'Inventory DB', 78, 43)], edges: edges, ehl: ehl || {}, hl: hl || {}, tags: tags };
        }
        function tbl(hl) { return { type: 'table', label: 'Participant state', columns: ['participant', 'state', 'row locks held', 'can decide alone?'], rows: P.map(function (p, i) { return [p, state[i], locks[i], state[i] === 'PREPARED' ? 'NO (in doubt)' : state[i] === 'PRE-COMMIT' ? 'yes → commit on timeout' : state[i] === 'INIT' ? 'yes (may abort)' : 'done']; }), hl: hl || {} }; }
        function all(lbl) { return ids.map(function (id) { return ['C', id, lbl]; }); }
        function back(lbls) { return ids.map(function (id, i) { return [id, 'C', lbls[i]]; }); }
        function eh(dir, cls) { var o = {}; ids.forEach(function (id, i) { o[dir ? 'C-' + id : id + '-C'] = Array.isArray(cls) ? cls[i] : cls; }); return o; }
        function push(narr, gr, thl) { frames.push({ narr: narr, parts: [gr, tbl(thl), { type: 'vars', label: 'Coordinator log', vals: { decision: coord } , hl: { decision: coord === 'COMMIT' ? 'ok' : coord === 'ABORT' ? 'bad' : '' } }] }); }
        push('Checkout must atomically: create the order, charge the wallet, and decrement stock — three databases. Coordinator starts transaction <b>tx-77</b>. ' + (mode === '3pc' ? 'This run uses <b>three-phase commit</b>.' : 'Scenario: <b>' + mode + '</b>.'), g([], {}, { C: 'cur' }));
        push('<b>Phase 1 — PREPARE.</b> Coordinator asks every participant: "can you commit tx-77?"', g(all('PREPARE'), eh(true, 'cur'), { C: 'cur' }), {});
        var votes = mode === 'no' ? ['YES', 'NO', 'YES'] : ['YES', 'YES', 'YES'];
        votes.forEach(function (v, i) { if (v === 'YES') { state[i] = 'PREPARED'; locks[i] = 'YES'; } else { state[i] = 'ABORTED'; } });
        push('Each participant does the work, <b>writes it durably</b>, keeps its <b>row locks</b>, and votes. ' + (mode === 'no' ? '<span class="c-r">Payments votes NO</span> (insufficient balance), so it aborts locally right away.' : 'All three vote <b>YES</b> — each has promised it can commit even after a crash. From now on they are <b>in doubt</b>: they may not decide alone.'), g(back(votes), eh(false, votes.map(function (v) { return v === 'YES' ? 'ok' : 'bad'; })), {}), { 0: votes[0] === 'YES' ? 'cur' : 'bad', 1: votes[1] === 'YES' ? 'cur' : 'bad', 2: 'cur' });
        if (mode === 'no') {
          coord = 'ABORT';
          push('One NO is enough: coordinator logs <b>ABORT</b> and broadcasts it.', g(all('ABORT'), eh(true, 'bad'), { C: 'bad' }), {});
          state = ['ABORTED', 'ABORTED', 'ABORTED']; locks = ['no', 'no', 'no'];
          push('Everyone rolls back and <b>releases locks</b>. Atomicity held: no order without payment. Nothing half-done.', g(back(['ack', 'ack', 'ack']), eh(false, 'ok'), {}), { 0: 'bad', 1: 'bad', 2: 'bad' });
          push('Cost of a NO: one extra round trip and locks held for its duration. Safe and simple — 2PC is fine when everyone is up.', g([], {}, { C: 'sel' }), {});
          return frames;
        }
        if (mode === 'crash') {
          push('All votes are YES. The coordinator is about to write COMMIT to its log… <span class="c-r">and crashes</span> (power loss) before writing or sending anything.', g([], {}, { C: 'bad' }, 'CRASHED'), {});
          push('Participants wait. Payments times out and asks: "should I commit or abort?" It <b>cannot</b> abort (maybe the coordinator logged COMMIT and Orders already committed) and <b>cannot</b> commit (maybe someone voted NO). It is <b>blocked</b>.', g([['P2', 'C', 'decision?']], { 'P2-C': 'bad' }, { C: 'bad', P2: 'cur' }, 'CRASHED'), { 0: 'bad', 1: 'bad', 2: 'bad' });
          push('Asking the other participants does not help: they are all PREPARED too and know nothing more. Meanwhile the locked rows (the customer\'s wallet, the product\'s stock row) block <b>every other checkout</b> touching them. This is 2PC\'s <span class="c-r">blocking problem</span>.', g([['P1', 'P2', 'you know?'], ['P3', 'P2', 'no idea']], { 'P1-P2': 'bad', 'P3-P2': 'bad' }, { C: 'bad', P1: 'bad', P2: 'bad', P3: 'bad' }, 'CRASHED'), { 0: 'bad', 1: 'bad', 2: 'bad' });
          coord = 'ABORT (presumed)';
          push('Minutes later the coordinator restarts and reads its log: <b>no COMMIT record for tx-77</b> → by the "presumed abort" rule it decides ABORT and tells everyone.', g(all('ABORT'), eh(true, 'cur'), { C: 'cur' }, 'RECOVERED'), {});
          state = ['ABORTED', 'ABORTED', 'ABORTED']; locks = ['no', 'no', 'no'];
          push('Locks are released at last. Atomicity was preserved, but availability suffered for the whole outage. Modern fix: make the coordinator a <b>replicated Raft/Paxos group</b> (Spanner, CockroachDB), so a crash triggers a quick failover instead of a long block.', g(back(['ack', 'ack', 'ack']), eh(false, 'ok'), { C: 'sel' }, 'ABORT'), { 0: 'ok', 1: 'ok', 2: 'ok' });
          return frames;
        }
        if (mode === '3pc') {
          coord = 'PRE-COMMIT';
          push('All YES. 3PC adds a phase: coordinator sends <b>PRE-COMMIT</b> ("everyone voted YES; we will commit").', g(all('PRE-COMMIT'), eh(true, 'cur'), { C: 'cur' }), {});
          state = ['PRE-COMMIT', 'PRE-COMMIT', 'PRE-COMMIT'];
          push('Participants move to <b>PRE-COMMIT</b> and ack. Key property: <b>nobody can be committed while anybody is still only PREPARED</b>.', g(back(['ack', 'ack', 'ack']), eh(false, 'ok'), {}), { 0: 'win', 1: 'win', 2: 'win' });
          push('<span class="c-r">Coordinator crashes</span> before sending COMMIT. Participants time out — but this time they can reason on their own.', g([], {}, { C: 'bad' }, 'CRASHED'), {});
          state = ['COMMITTED', 'COMMITTED', 'COMMITTED']; locks = ['no', 'no', 'no'];
          push('A recovery participant sees everyone in PRE-COMMIT → all voted YES → <b>safe to commit</b> without the coordinator. (If any were still PREPARED, nobody could have committed → safe to abort.) <span class="c-g">No blocking.</span>', g([['P1', 'P2', 'commit'], ['P1', 'P3', 'commit']], { 'P1-P2': 'ok', 'P1-P3': 'ok' }, { P1: 'ok', P2: 'ok', P3: 'ok', C: 'bad' }, 'CRASHED'), { 0: 'ok', 1: 'ok', 2: 'ok' });
          push('<b>The catch:</b> this reasoning assumes timeouts are accurate. With a <b>network partition</b> one side (seeing PRE-COMMIT) commits while the other side (still PREPARED) aborts → atomicity broken. Real networks are asynchronous, so 3PC is rarely used; replicated coordinators + 2PC win instead.', g([], {}, { C: 'cur' }, 'partition risk'), {});
          return frames;
        }
        coord = 'COMMIT';
        push('All YES → coordinator writes <b>COMMIT</b> to its durable log. <span class="c-g">This is the commit point</span>: from now on the transaction will commit, even if the coordinator crashes (it will re-send after restart).', g([], {}, { C: 'ok' }), {});
        push('<b>Phase 2 — COMMIT.</b> Coordinator broadcasts the decision (and retries until every participant acks).', g(all('COMMIT'), eh(true, 'ok'), { C: 'ok' }), {});
        state = ['COMMITTED', 'COMMITTED', 'COMMITTED']; locks = ['no', 'no', 'no'];
        push('Participants commit, release locks, and ack. Cost: 2 round trips + several fsyncs; locks held across both phases.', g(back(['ack', 'ack', 'ack']), eh(false, 'ok'), { P1: 'ok', P2: 'ok', P3: 'ok' }), { 0: 'ok', 1: 'ok', 2: 'ok' });
        return frames;
      }
    }],
    examples: [
      { title: 'Postgres native 2PC', html: `<p><code>BEGIN; UPDATE accounts SET balance = balance - 500 WHERE id = 1; PREPARE TRANSACTION 'tx-77';</code> — the transaction survives a restart and holds its locks. Later the coordinator runs <code>COMMIT PREPARED 'tx-77'</code> or <code>ROLLBACK PREPARED 'tx-77'</code>. Forgotten prepared transactions are a classic production incident: they block VACUUM and hold locks forever — monitor <code>pg_prepared_xacts</code>.</p>` },
      { title: 'Latency and throughput math', html: `<p>Shards in one region, RTT 1 ms, fsync 1 ms. 2PC ≈ prepare round (1 ms + 1 ms fsync) + coordinator log fsync (1 ms) + commit round (1 ms) ≈ <b>4 ms</b>, versus ~1 ms for a local commit. Locks are held for the whole time, so a hot row (a popular product's stock) can only do ~250 transactions/s. Across regions (RTT 80 ms) it becomes ~170 ms and ~6 tx/s on a hot row.</p>` },
      { title: 'Spanner: 2PC over Paxos groups', html: `<p>Each Spanner shard is a Paxos group. A cross-shard transaction picks one group's leader as coordinator; prepare/commit records are themselves Paxos-replicated, so "the coordinator crashed" just means a new Paxos leader continues from the replicated log. TrueTime timestamps add external consistency. CockroachDB does similar with Raft and parallel commits (one round trip in the common case).</p>` },
      { title: 'Heuristic decisions (when humans break atomicity)', html: `<p>XA systems let an operator force an in-doubt participant to commit or roll back ("heuristic commit") to release locks during a long outage. If the coordinator later decides the opposite, you get a <b>heuristic mixed</b> outcome — real data inconsistency that must be fixed by hand. Another reason teams avoid 2PC across services they do not control.</p>` }
    ],
    deepDive: `<p><b>Coordinator log and presumed abort:</b> the coordinator must fsync the COMMIT decision before sending it; participants must fsync their PREPARED record before voting YES. "Presumed abort" lets the coordinator skip logging aborts: no record means abort, which saves writes for the common failure case. Read-only participants can vote "READ-ONLY" and drop out of phase 2.</p>
<p><b>Atomic commit vs consensus:</b> 2PC needs <b>every</b> participant's YES (unanimity) because each owns different data; consensus needs only a <b>majority</b> because replicas hold the same data. That is why 2PC alone cannot tolerate failures but Paxos Commit (Gray &amp; Lamport, 2006) — running consensus on each participant's vote — can. Spanner and CockroachDB are practical versions of that idea.</p>
<p><b>Isolation still matters:</b> 2PC gives atomicity, not isolation by itself. Participants hold locks (or use MVCC with commit timestamps) so others cannot see half-committed state. Across heterogeneous systems (a DB plus a message broker plus an HTTP API) XA support is patchy, HTTP APIs cannot "prepare" at all, and the coordinator becomes a hidden single point of failure — the practical reasons sagas and the outbox pattern dominate microservice architectures.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can generate XA/JTA configuration, explain an in-doubt transaction in Postgres, or sketch a sequence diagram of 2PC failure cases instantly. It is also a decent sparring partner for "what if X crashes at step Y" enumeration — ask it for a full failure matrix (coordinator/participant × before/after each fsync) and verify each cell. <b>Where AI goes wrong:</b> it often claims 3PC is "non-blocking, so strictly better", forgets that participants keep locks while prepared, or suggests 2PC across third-party REST APIs that cannot prepare. <b>Agentic systems:</b> AI agents that call several tools (book flight, charge card, send email) face exactly this atomicity problem — and tools cannot prepare, so the answer is sagas with compensations plus idempotency, not 2PC. <b>What you must still own:</b> knowing that the blocking window exists, sizing its blast radius (which rows stay locked), and choosing between 2PC inside one database platform and sagas across services.</p>`,
    problems: [{
      title: 'Coordinator Dies Mid-2PC: What Happens to Each Participant?',
      level: 'Easy', tags: ['2PC', 'failure analysis'], companies: ['Oracle', 'Microsoft', 'Goldman Sachs'],
      statement: `<p>A 2PC transaction transfers money from shard A to shard B. For each failure point below, say what each participant does and whether data can become inconsistent: (1) coordinator crashes before sending PREPARE; (2) after A votes YES but before B votes; (3) after both vote YES but before the coordinator logs COMMIT; (4) after logging COMMIT but before sending it.</p>`,
      constraints: `<p>Coordinator uses presumed abort. Participants fsync PREPARED before voting.</p>`,
      example: `<p>Case 4: decision is ${H.c('g', 'COMMIT')}. After restart the coordinator re-reads its log and re-sends COMMIT; participants block until then, but no inconsistency.</p>`,
      brute: { why: `<p>A common wrong answer: "participants time out and abort." That is only safe <b>before</b> they voted YES. A prepared participant that aborts on its own could disagree with another participant that already received COMMIT — breaking atomicity.</p>` },
      mcq: { q: 'In which case may a participant safely abort on its own after a timeout?', options: ['It has not voted yet', 'It voted YES and is PREPARED', 'It voted YES and heard nothing for 10 minutes', 'Never'], answer: 0, explain: 'Before voting YES the participant has made no promise, so aborting (and later voting NO) is safe. After YES it must wait for the decision.' },
      hints: [`<p>Hint 1: Find the commit point: the moment the coordinator durably logs COMMIT.</p>`, `<p>Hint 2: For each participant ask: has it voted YES yet? Before YES it can abort freely; after YES it is in doubt.</p>`, `<p>Hint 3: Presumed abort: on restart, no COMMIT record ⇒ abort everything; COMMIT record ⇒ re-send COMMIT until acked.</p>`],
      solution: {
        approach: `<p><b>(1) Before PREPARE:</b> nobody has promised anything; participants that started local work time out and roll back. On restart the coordinator finds no COMMIT ⇒ abort. Consistent, no blocking.</p>
<p><b>(2) A voted YES, B has not:</b> B may abort unilaterally (it will vote NO or simply time out). A is PREPARED and <b>blocks</b> holding its locks until the coordinator restarts, finds no COMMIT, and sends ABORT. Consistent, but A blocks.</p>
<p><b>(3) Both YES, no COMMIT logged:</b> both are in doubt and blocked. On restart: no COMMIT record ⇒ presumed abort ⇒ both roll back. Consistent; blocking lasts for the whole coordinator outage.</p>
<p><b>(4) COMMIT logged, not sent:</b> the decision is final. Both block until restart, then the coordinator re-sends COMMIT (participants must treat a duplicate COMMIT idempotently). Consistent.</p>
<p><b>Conclusion:</b> 2PC never produces inconsistency as long as nobody forces a heuristic decision; its weakness is <b>availability</b> (blocked locks), which is fixed by replicating the coordinator.</p>`,
        complexity: `<p>Normal case: 2 round trips, 2N + 1 fsyncs, locks held ≈ 2 RTT + fsyncs. Failure case: blocking time = coordinator recovery time.</p>`,
        followUps: ['How would a Raft-replicated coordinator change case 3?', 'What does a participant do if it receives COMMIT twice?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Sagas
     ===================================================================== */
  topics.push({
    title: 'Sagas: Long-Running Transactions with Compensations',
    analogy: `<p>Planning a trip: you book a flight, then a hotel, then a rental car — three different companies, no way to "lock" all three. If the car company says "sold out", you don't pretend nothing happened; you <b>undo what you did, in reverse</b>: cancel the hotel, then cancel the flight (maybe paying a small fee). Each booking has a matching "undo" action. That is a <b>saga</b>: a chain of local steps, each with a <b>compensating</b> step that semantically reverses it.</p>`,
    explain: `<p>A <b>saga</b> (Garcia-Molina &amp; Salem, 1987) splits one big business transaction into a sequence of <b>local transactions</b> T1, T2, …, Tn, each committed in its own service/database right away. For every step Ti that may need undoing there is a <b>compensation</b> Ci. If step Tk fails, the saga runs C(k−1), …, C1 in reverse order.</p>
${H.table(['Step', 'Service', 'Forward action Ti', 'Compensation Ci'], [['1', 'Order', 'create order (PENDING)', 'mark order CANCELLED'], ['2', 'Inventory', 'reserve 2 units', 'release the reservation'], ['3', 'Payment', 'authorize ₹1 200 on card', 'void authorization / refund'], ['4', 'Shipping', 'book courier pickup', 'cancel pickup'], ['5', 'Order', 'mark order CONFIRMED', '— (after the pivot, only retry forward)']])}
<p><b>Two ways to coordinate:</b></p>
<ul>
<li><b>Orchestration:</b> a central <b>saga orchestrator</b> (a state machine, often on Temporal, AWS Step Functions, Camunda, or your own table) tells each service what to do next and records progress. Easy to see and debug; the orchestrator is extra infrastructure.</li>
<li><b>Choreography:</b> no central brain. Each service listens for events and emits its own (<code>OrderCreated → InventoryReserved → PaymentAuthorized…</code>). Loosely coupled, but the flow is spread across services and hard to follow once it has more than 3 – 4 steps.</li>
</ul>
<p><b>What sagas give up:</b> <b>isolation</b>. Between steps, other users can see intermediate state ("order PENDING", "stock reserved but not paid"). This is ACD without the I. You manage the anomalies with <b>semantic locks</b> (a PENDING status others respect), <b>commutative updates</b>, re-reading values, and by ordering steps well.</p>
<p><b>Step types (from Chris Richardson's patterns):</b> <b>compensatable</b> steps (can be undone) come first; the <b>pivot</b> step is the point of no return (e.g. capturing payment or shipping); <b>retryable</b> steps after the pivot must eventually succeed, so they are retried until they do.</p>
${H.kv([['Compensation', 'a new forward action that cancels the business effect — not a database rollback'], ['Idempotent', 'every step and compensation may be retried safely'], ['Pivot', 'first non-compensatable step; after it, only go forward']], { label: 'Saga vocabulary' })}`,
    clues: ['"checkout across Order, Payment, Inventory, Shipping microservices" → saga (orchestrated)', '"each service owns its own database" → no shared transaction; saga + outbox', '"long-running: may take minutes or days (human approval, shipping)" → saga, never 2PC (locks would be held for days)', '"if payment fails, release the reserved stock" → compensation', '"third-party API (Stripe, airline) in the flow" → cannot prepare → saga with idempotency keys', '"what does the user see in between?" → lack of isolation; semantic locks / PENDING states'],
    code: { lang: 'java', title: 'Saga orchestrator with compensations (Java, compiles and runs)', code: `import java.util.*;
import java.util.function.*;

public class SagaOrchestrator {
    /** One saga step: a forward action and the compensation that undoes it. */
    record Step(String name, Supplier<Boolean> action, Runnable compensation) {}

    private final List<Step> steps = new ArrayList<>();
    private final Deque<Step> completed = new ArrayDeque<>();   // stack: undo in reverse order

    SagaOrchestrator add(String name, Supplier<Boolean> action, Runnable compensation) {
        steps.add(new Step(name, action, compensation));
        return this;
    }

    /** Runs steps in order. On the first failure, compensates every completed step in reverse. */
    boolean run() {
        for (Step s : steps) {
            boolean ok;
            try {
                ok = s.action().get();          // real code: call the service with an idempotency key
            } catch (RuntimeException e) {
                ok = false;
            }
            if (!ok) {
                System.out.println("FAILED: " + s.name() + " -> compensating");
                while (!completed.isEmpty()) {
                    Step done = completed.pop();
                    done.compensation().run();   // real code: retry until success (must be idempotent)
                    System.out.println("  compensated: " + done.name());
                }
                return false;
            }
            System.out.println("ok: " + s.name());
            completed.push(s);                  // real code: persist saga state before moving on
        }
        return true;
    }

    public static void main(String[] args) {
        Map<String, Integer> stock = new HashMap<>(Map.of("sku-1", 5));
        int[] walletHold = {0};
        boolean courierAvailable = false;       // flip to true to see the happy path

        boolean confirmed = new SagaOrchestrator()
            .add("create order (PENDING)", () -> true, () -> System.out.println("    order -> CANCELLED"))
            .add("reserve 2 x sku-1", () -> { stock.merge("sku-1", -2, Integer::sum); return true; },
                 () -> stock.merge("sku-1", 2, Integer::sum))
            .add("authorize 1200", () -> { walletHold[0] = 1200; return true; },
                 () -> walletHold[0] = 0)
            .add("book courier", () -> courierAvailable, () -> System.out.println("    cancel pickup"))
            .run();

        System.out.println("confirmed=" + confirmed + " stock=" + stock + " hold=" + walletHold[0]);
    }
}` },
    viz: [{
      title: 'Checkout saga: forward steps, a failure, compensations rolling back',
      input: '4',
      inputLabel: 'Which step fails? 1-5 (0 = everything succeeds)',
      gen: function (input) {
        var f = parseInt(String(input === undefined ? '4' : input).trim(), 10);
        if (isNaN(f) || f < 0 || f > 5) throw new Error('Enter a step number 0-5 (0 means no failure)');
        var S = [['Order', 'create order (PENDING)', 'cancel order'], ['Inventory', 'reserve 2 units', 'release reservation'], ['Payment', 'authorize ₹1200', 'void authorization'], ['Shipping', 'book courier', 'cancel pickup'], ['Order', 'confirm order', '— (retry only)']];
        var stat = ['·', '·', '·', '·', '·'], cstat = ['·', '·', '·', '·', '·'], frames = [];
        var ids = ['ORD', 'INV', 'PAY', 'SHP', 'ORD'];
        var log = [];
        function grid(hl) { return { type: 'grid', label: 'Saga log (persisted by the orchestrator)', rowHead: ['T1', 'T2', 'T3', 'T4', 'T5'], colHead: ['service', 'forward action', 'status', 'compensation', 'comp. status'], rows: S.map(function (s, i) { return [s[0], s[1], stat[i], s[2], cstat[i]]; }), hl: hl || {} }; }
        function g(edges, ehl, hl) { return { type: 'graph', directed: true, height: 50, nodes: [box('O', 'Saga orchestrator', 16, 25, 22), box('ORD', 'Order svc', 66, 5), box('INV', 'Inventory svc', 88, 18), box('PAY', 'Payment svc', 88, 34), box('SHP', 'Shipping svc', 66, 46)], edges: edges, ehl: ehl || {}, hl: hl || {} }; }
        function push(narr, gr, gh) { frames.push({ narr: narr, parts: [gr, grid(gh), { type: 'stack', label: 'Completed steps (undo stack, top = undo first)', items: log.slice(), hl: (function () { var h = {}; if (log.length) h[log.length - 1] = 'cur'; return h; })() }] }); }
        push('A checkout touches 4 services, each with its <b>own database</b>. No shared transaction is possible, so the orchestrator runs a saga: each step commits locally right away, and has a compensation ready. ' + (f ? 'In this run step <b>T' + f + '</b> will fail.' : 'In this run everything succeeds.'), g([], {}, { O: 'cur' }));
        var failed = false;
        for (var i = 0; i < 5; i++) {
          var e = {}; e['O-' + ids[i]] = 'cur';
          var h0 = {}; h0[i + ',1'] = 'cur'; h0[i + ',2'] = 'cur';
          if (f === i + 1) {
            stat[i] = 'FAILED';
            var hb = {}; hb[i + ',1'] = 'bad'; hb[i + ',2'] = 'bad'; var eb = {}; eb['O-' + ids[i]] = 'bad'; var nb = {}; nb[ids[i]] = 'bad';
            push('<b>T' + (i + 1) + ': ' + S[i][1] + '</b> → <span class="c-r">FAILED</span> (' + ['database rejected the insert', 'out of stock', 'card declined', 'no courier available in this pincode', 'order service unavailable'][i] + '). ' + (i === 4 ? 'But T5 comes after the pivot — it is <b>retryable</b>: the orchestrator retries it until it succeeds instead of compensating.' : 'The orchestrator now walks the undo stack backwards.'), g([['O', ids[i], S[i][1]]], eb, nb), hb);
            if (i === 4) {
              stat[i] = 'DONE (retry #3)';
              var hr = {}; hr[i + ',2'] = 'ok';
              log.push('T5 confirm');
              push('Retry with the same idempotency key succeeds on attempt 3. <span class="c-g">Order CONFIRMED.</span> Steps after the pivot must be designed to eventually succeed.', g([['O', 'ORD', 'confirm (retry)']], { 'O-ORD': 'ok' }, { ORD: 'ok' }), hr);
            } else failed = true;
            break;
          }
          stat[i] = 'DONE';
          log.push('T' + (i + 1) + ' ' + S[i][1]);
          var ho = {}; ho[i + ',2'] = 'ok'; var eo = {}; eo['O-' + ids[i]] = 'ok'; var no = {}; no[ids[i]] = 'ok';
          push('<b>T' + (i + 1) + ': ' + S[i][1] + '</b> → committed locally in the ' + S[i][0] + ' database and <b>visible to others immediately</b> (no isolation). Orchestrator records "T' + (i + 1) + ' done" before moving on' + (i === 2 ? '. (Authorize, not capture: easier to compensate.)' : '.'), g([['O', ids[i], S[i][1]]], eo, no), ho);
        }
        if (failed) {
          for (var k = f - 2; k >= 0; k--) {
            cstat[k] = 'RUNNING';
            var hc = {}; hc[k + ',3'] = 'bad'; hc[k + ',4'] = 'cur'; hc[k + ',2'] = 'bad';
            var ec = {}; ec['O-' + ids[k]] = 'bad'; var nc = {}; nc[ids[k]] = 'bad';
            push('Compensate <b>C' + (k + 1) + ': ' + S[k][2] + '</b> (undo of T' + (k + 1) + '). It is a new forward action, not a DB rollback — e.g. ' + ['the order row stays, with status CANCELLED (audit trail)', 'stock goes back up by 2', 'the card hold is voided (the customer may briefly see it on their statement)', 'the pickup is cancelled'][k] + '.', g([['O', ids[k], S[k][2]]], ec, nc), hc);
            stat[k] = 'UNDONE'; cstat[k] = 'DONE';
            log.pop();
          }
          push('<span class="c-r">Saga ended in a compensated state:</span> every completed step was undone in reverse order. The overall business transaction did not happen, but each service stayed consistent with its own rules. The customer gets "Sorry, we could not ship to your address".', g([], {}, { O: 'sel' }), (function () { var h = {}; for (var z = 0; z < f; z++) { h[z + ',2'] = 'bad'; if (z < f - 1) h[z + ',4'] = 'ok'; } return h; })());
          push('<b>Rules that made this safe:</b> (1) the orchestrator persisted each step before continuing, so a crash resumes from the log; (2) every action and compensation is <b>idempotent</b> and retried until it succeeds; (3) compensations cannot fail permanently — if one does, alert a human.', g([], {}, {}), {});
        } else {
          push('<span class="c-g">All steps done — order CONFIRMED.</span> In between, other users could see the PENDING order and the reduced stock: sagas trade isolation for availability and loose coupling.', g([], {}, { O: 'sel' }), { 4: 'sel' });
          push('Try input <b>3</b> (card declined) or <b>4</b> (no courier) to watch the compensations run backwards.', g([], {}, {}), {});
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Orchestration vs choreography for the same checkout', html: `${H.table(['', 'Orchestration', 'Choreography'], [['Who decides next step', 'orchestrator state machine', 'each service reacts to events'], ['Visibility', 'one place to see every saga\'s state', 'need distributed tracing to reconstruct'], ['Coupling', 'orchestrator knows all services', 'services know event types only'], ['Cyclic dependencies risk', 'low', 'higher (A listens to B listens to A)'], ['Good for', '4+ steps, complex branching, timeouts', '2 – 3 steps, simple fan-out']])}` },
      { title: 'Dirty read anomaly and the semantic lock fix', html: `<p>During the saga, stock is reserved (count down by 2) before payment. A reporting job reads stock = 3 and reorders less. Then payment fails and stock goes back to 5. Fix: keep reservations in a separate <code>reserved</code> column (semantic lock) so "available = on_hand − reserved" is explicit, and reports use <code>on_hand</code>. Same idea: order status PENDING tells the UI not to show "shipped".</p>` },
      { title: 'Compensation that cannot fully undo', html: `<p>Step "send confirmation email" cannot be unsent. Two options: move it <b>after the pivot</b> (send only once the order is confirmed), or compensate semantically with a follow-up "sorry, your order was cancelled" email. Design order: compensatable steps first, pivot next, non-reversible side effects last.</p>` },
      { title: 'Temporal / Step Functions in practice', html: `<p>Workflow engines persist every step's result. Your saga code looks sequential (<code>reserve(); try { charge(); } catch { release(); }</code>), but each call is a durable <b>activity</b> with retries; if the worker dies, another worker replays the history and continues. This removes most hand-written state-machine and retry code — the 2026 default for orchestrated sagas.</p>` }
    ],
    deepDive: `<p><b>Saga correctness checklist:</b> (1) persist saga state transitions durably (and publish commands via an outbox); (2) every participant handler is idempotent (dedupe by sagaId + step); (3) compensations are commutative with late-arriving forward messages — e.g. "cancel reservation" may arrive before "reserve" due to reordering, so the participant records a tombstone and ignores the late reserve; (4) timeouts on every step, with a decision about whether timeout means fail (compensate) or unknown (query the participant's status first).</p>
<p><b>Isolation countermeasures</b> (from Garcia-Molina and later microservice literature): semantic lock (PENDING flags), commutative updates (increment/decrement instead of set), pessimistic view (order steps to minimise business risk — reserve before charging), re-read value (verify unchanged before overwriting), version file (record operations so they can be reordered), and by-value risk (use 2PC/strong consistency for high-value requests, sagas for the rest).</p>
<p><b>Failure economics:</b> sagas hold no cross-service locks, so throughput and availability scale with each service independently. The cost is complexity (compensations for every step, more test cases) and temporary inconsistency visible to users. Measure: saga completion latency, compensation rate, stuck sagas (needing human action), and duplicate-step counts.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is great at drafting the compensation table for a flow, generating a Temporal workflow or Step Functions state machine from a sequence diagram, and listing failure cases per step. Agentic AI systems themselves are sagas: an agent books, charges and emails through tools that cannot be rolled back, so modern agent frameworks add "undo" tools, human approval before the pivot, and idempotency keys on every tool call. <b>Use AI as a partner:</b> <code>For this 5-step checkout saga, list which steps are compensatable, which is the pivot, and what anomaly a concurrent user could observe after each step</code>. <b>Where AI goes wrong:</b> it writes compensations that are not idempotent, compensates the failed step itself (it never committed), runs compensations in forward order, or puts the email step first. <b>What you must still own:</b> step ordering, the pivot decision, and the business conversation about what "undo" means (refund vs void, fee or no fee).</p>`,
    problems: [{
      title: 'Checkout Flow: 2PC or Saga?',
      level: 'Medium', tags: ['saga', '2PC', 'microservices', 'checkout'], companies: ['Amazon', 'Flipkart', 'Shopify', 'Walmart'],
      statement: `<p>An e-commerce checkout must: create an order, reserve inventory, charge the customer through an external payment provider (Stripe/Razorpay), and create a shipment with a third-party courier. Order, Inventory and Shipping are separate microservices with their own databases owned by different teams. Should you use 2PC or a saga? Design the flow, including failures and what the user sees.</p>`,
      constraints: `<p>Peak 5 000 checkouts/s during sales; the courier API takes up to 3 s; payment provider supports idempotency keys and authorize/capture but not "prepare".</p>`,
      example: `<p>Card declined at the payment step → ${H.c('r', 'release the reservation, cancel the order')} → show "payment failed, try another card" within ~2 s; stock is never stuck.</p>`,
      brute: { why: `<p>Naive design: one XA/2PC transaction spanning the three service databases plus the payment and courier calls. It breaks because external HTTP APIs cannot participate in a prepare phase; inventory rows of hot products would stay locked for the 3 s courier call, capping a flash-sale SKU at a few checkouts per second; and a coordinator crash blocks every checkout touching those rows. It also couples three teams' databases into one failure domain.</p>` },
      mcq: { q: 'What is the strongest reason 2PC does not fit here?', options: ['2PC is too new', 'External payment/courier APIs cannot prepare and hot rows would stay locked across slow calls', '2PC cannot handle more than two participants', 'Sagas give stronger isolation'], answer: 1, explain: 'Participants must be able to prepare and hold locks; third-party HTTP APIs cannot, and holding inventory locks across seconds-long calls kills throughput. Sagas give weaker (not stronger) isolation.' },
      hints: [`<p>Hint 1: Look for participants that cannot "prepare" and for steps that are slow — both rule out 2PC.</p>`, `<p>Hint 2: Order the steps so the hard-to-undo ones come last: reserve → authorize (not capture) → ship → capture.</p>`, `<p>Hint 3: Orchestrated saga + transactional outbox + idempotency keys; define each compensation and the pivot; show PENDING state to the user.</p>`],
      solution: {
        approach: `<p><b>Choice: an orchestrated saga.</b> 2PC is ruled out because the payment provider and courier are external APIs that cannot prepare, locks would be held across multi-second calls on hot SKUs, and a shared coordinator would couple independent teams. Checkout tolerates a few seconds of visible intermediate state, so losing isolation is acceptable.</p>
<p><b>Flow (Checkout Orchestrator, e.g. Temporal):</b></p>
<ol><li><b>Create order</b> PENDING (Order DB, via outbox). Compensation: CANCELLED.</li>
<li><b>Reserve inventory</b> with a TTL'd reservation (semantic lock in a <code>reserved</code> column). Compensation: release.</li>
<li><b>Authorize payment</b> with idempotency key = orderId. Compensation: void authorization.</li>
<li><b>Create shipment</b> with courier (idempotency key = orderId). Compensation: cancel shipment.</li>
<li><b>Pivot — capture payment.</b> After this, only retry forward.</li>
<li><b>Confirm order</b>, commit inventory reservation to a decrement, send email (retryable steps).</li></ol>
<p><b>Failures:</b> declined card at step 3 → release stock, cancel order, tell the user immediately. Courier unavailable at step 4 → void auth, release, cancel. Orchestrator crash → workflow engine replays its history and continues; every service call is idempotent. Payment timeout (unknown result) → query the provider by idempotency key before deciding to compensate. A compensation that keeps failing → alert + manual queue.</p>
<p><b>User experience:</b> UI shows "Placing your order…" then CONFIRMED or a specific failure; the order page reflects PENDING during the saga. <b>When would 2PC be right?</b> If all data lived in one distributed SQL database (e.g. orders + inventory tables in CockroachDB/Spanner), its internal 2PC gives true atomicity cheaply — but the external payment still needs saga-style handling.</p>`,
        complexity: `<p>Latency ≈ sum of step latencies (~1 – 4 s, dominated by external APIs); no cross-service locks, so throughput scales per service. Extra storage: one saga-state row per checkout plus outbox rows.</p>`,
        followUps: ['How do you stop a reservation leaking if the orchestrator disappears forever?', 'Where would you place loyalty-points redemption in the step order?', 'Choreography version: which events would each service emit?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Transactional outbox (and CDC)
     ===================================================================== */
  topics.push({
    title: 'The Transactional Outbox Pattern (Killing the Dual Write)',
    analogy: `<p>A shopkeeper sells an item and must (a) write it in the sales ledger and (b) tell the warehouse. If she phones the warehouse first and then forgets to write the ledger (or the phone line drops after the ledger), the two disagree. So instead she writes <b>both</b> the sale and a note "tell warehouse about sale #812" on the <b>same ledger page</b> in one go. A delivery boy reads the notes page every few minutes and carries each note to the warehouse, ticking it off. If he trips and delivers a note twice, the warehouse notices the sale number is already handled. That ledger page of notes is the <b>outbox</b>.</p>`,
    explain: `<p><b>The dual-write problem:</b> a service often needs to update its database <i>and</i> publish an event (to Kafka, SQS, RabbitMQ) so other services react. These are two different systems — there is no transaction spanning both:</p>
${H.table(['Order of operations', 'Crash in between causes'], [['write DB, then publish', H.c('r', 'DB has the order, no event ever sent → inventory never reserved')], ['publish, then write DB', H.c('r', 'event sent for an order that does not exist (DB write failed / rolled back)')], ['publish inside the DB transaction', H.c('r', 'event sent, then the transaction rolls back → ghost event')]])}
<p><b>The outbox pattern:</b></p>
<ol>
<li>In the <b>same local database transaction</b> that changes business data, insert a row into an <code>outbox</code> table: <code>(id, aggregate_id, type, payload, created_at)</code>. Either both rows commit or neither does — that is plain ACID on one database.</li>
<li>A separate <b>message relay</b> reads unpublished outbox rows and publishes them to the broker, then marks them published (or deletes them).</li>
<li>Two relay styles: <b>polling publisher</b> (<code>SELECT … WHERE published = false ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED</code> every 100 ms) or <b>log tailing / CDC</b> (Debezium reads the database's write-ahead log — Postgres logical replication, MySQL binlog — and streams outbox inserts to Kafka with no polling load).</li>
<li>Because the relay can crash after publishing but before marking the row, events are delivered <b>at least once</b>. Consumers must be <b>idempotent</b> (deduplicate by event id).</li>
</ol>
${H.kv([['Guarantee', 'event published if and only if the DB transaction committed (eventually)'], ['Delivery', 'at-least-once → consumers dedupe'], ['Ordering', 'per aggregate if the relay publishes in id order with key = aggregate_id']], { label: 'What you get' })}
<p><b>The mirror image — the inbox:</b> a consumer that updates its own DB on each message stores <code>processed_message(id)</code> in the <b>same</b> transaction as its business update; a duplicate message hits the primary key and is skipped. Outbox on the producer + inbox (idempotent consumer) on the consumer = reliable, effectively-once processing between services.</p>`,
    clues: ['"update the database AND publish an event" → dual write → transactional outbox', '"events must never be lost if the service crashes" → outbox + relay (at-least-once)', '"saga steps send commands to other services" → outbox for every saga message', '"Debezium / CDC / binlog / logical replication" → log-tailing outbox relay', '"consumer may receive the same event twice" → idempotent consumer / inbox table', '"keep a search index or cache in sync with the DB" → CDC from the DB log rather than dual writes'],
    code: { lang: 'python', run: true, title: 'Outbox + relay + idempotent consumer with sqlite3 (runnable)', code: `import json, sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE orders (id INTEGER PRIMARY KEY, item TEXT, status TEXT);
CREATE TABLE outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, aggregate_id INTEGER,
                     type TEXT, payload TEXT, published INTEGER DEFAULT 0);
""")

def place_order(order_id, item):
    # ONE local transaction: business row + outbox row commit together or not at all.
    with db:
        db.execute("INSERT INTO orders VALUES (?, ?, 'PLACED')", (order_id, item))
        db.execute("INSERT INTO outbox (aggregate_id, type, payload) VALUES (?, 'OrderPlaced', ?)",
                   (order_id, json.dumps({"orderId": order_id, "item": item})))

broker = []                                  # stands in for a Kafka topic

def relay_once(crash_before_mark=False):
    rows = db.execute("SELECT id, type, payload FROM outbox WHERE published = 0 ORDER BY id").fetchall()
    for event_id, etype, payload in rows:
        broker.append({"eventId": event_id, "type": etype, "payload": json.loads(payload)})
        if crash_before_mark:
            print(f"relay crashed after publishing event {event_id} but before marking it")
            return
        with db:
            db.execute("UPDATE outbox SET published = 1 WHERE id = ?", (event_id,))

place_order(1, "kettle")
place_order(2, "toaster")
relay_once(crash_before_mark=True)           # publishes event 1, crashes
relay_once()                                 # restarts: publishes 1 AGAIN, then 2

# Idempotent consumer (inbox): remember processed event ids.
processed, reserved = set(), []
for msg in broker:
    if msg["eventId"] in processed:
        print("duplicate ignored:", msg["eventId"])
        continue
    processed.add(msg["eventId"])            # real code: same DB transaction as the side effect
    reserved.append(msg["payload"]["item"])

print("broker saw", len(broker), "messages; inventory reserved:", reserved)` },
    viz: [{
      title: 'Dual write vs outbox: crash points, relay retry, consumer dedup',
      input: 'outbox',
      inputLabel: 'Mode: "dualwrite" (publish after commit, crash in between) or "outbox"',
      gen: function (input) {
        var mode = String(input === undefined ? 'outbox' : input).trim().toLowerCase();
        if (mode !== 'outbox' && mode !== 'dualwrite') throw new Error('Mode must be "outbox" or "dualwrite"');
        var frames = [];
        var orders = [], outbox = [], topic = [], inbox = [], reserved = 0;
        function g(edges, ehl, hl, tags) {
          var nodes = [box('SVC', 'Order service', 12, 10), box('DB', 'Orders DB', 12, 42), box('K', 'Kafka topic', 62, 26), box('C', 'Inventory consumer', 90, 10, 24)];
          if (mode === 'outbox') nodes.push(box('R', 'Relay / Debezium', 38, 42, 22));
          return { type: 'graph', directed: true, height: 52, nodes: nodes, edges: edges, ehl: ehl || {}, hl: hl || {}, tags: tags || {} };
        }
        function parts(gr, hl) {
          var p = [gr, { type: 'table', label: 'orders table', columns: ['id', 'status'], rows: orders.map(function (o) { return [o, 'PLACED']; }), hl: hl && hl.orders || {} }];
          if (mode === 'outbox') p.push({ type: 'table', label: 'outbox table (same DB)', columns: ['eventId', 'type', 'published'], rows: outbox.map(function (o) { return [o.id, 'OrderPlaced(' + o.order + ')', o.pub ? 'yes' : 'no']; }), hl: hl && hl.outbox || {} });
          p.push({ type: 'queue', label: 'Kafka topic (offsets 0..n)', items: topic.slice(), frontLabel: 'oldest', backLabel: 'newest', hl: hl && hl.topic || {} });
          p.push({ type: 'vars', label: 'Consumer', vals: { processedIds: '{' + inbox.join(', ') + '}', unitsReserved: reserved }, hl: hl && hl.vars || {} });
          return p;
        }
        function push(narr, gr, hl) { frames.push({ narr: narr, parts: parts(gr, hl) }); }
        if (mode === 'dualwrite') {
          push('<b>Dual write:</b> the service commits the order to its DB, then separately publishes OrderPlaced to Kafka. Two systems, two separate operations, no shared transaction.', g([]));
          orders.push(101);
          push('Order 101: DB transaction commits. ✔', g([['SVC', 'DB', 'INSERT + COMMIT']], { 'SVC-DB': 'ok' }, { DB: 'ok' }), { orders: { 0: 'ok' } });
          push('<span class="c-r">The service pod is killed</span> (deploy, OOM) after the commit but before <code>producer.send()</code>.', g([['SVC', 'K', 'send (never happens)']], { 'SVC-K': 'bad' }, { SVC: 'bad' }), { orders: { 0: 'cur' } });
          push('Result: the order exists but <span class="c-r">no event was ever published</span>. Inventory never reserves stock, the customer waits forever. Nothing will ever retry it — the intent to publish lived only in the dead process\'s memory.', g([], {}, { C: 'bad', K: 'bad' }), { orders: { 0: 'bad' } });
          push('Flipping the order (publish first) just swaps the bug: the event goes out, then the DB commit fails → a ghost event for an order that does not exist. Run mode <b>outbox</b> to see the fix.', g([], {}, { SVC: 'cur' }), {});
          return frames;
        }
        push('<b>Outbox:</b> the service writes the business row <b>and</b> an event row into an <code>outbox</code> table in the <b>same local transaction</b>. A separate relay ships outbox rows to Kafka.', g([]));
        orders.push(101); outbox.push({ id: 'e1', order: 101, pub: false });
        push('Order 101: <code>BEGIN; INSERT orders; INSERT outbox; COMMIT;</code> — atomic. Either both rows exist or neither does. The service can now crash freely: the intent to publish is durable.', g([['SVC', 'DB', 'one txn: order + outbox']], { 'SVC-DB': 'ok' }, { DB: 'ok' }), { orders: { 0: 'ok' }, outbox: { 0: 'ok' } });
        orders.push(102); outbox.push({ id: 'e2', order: 102, pub: false });
        push('Order 102 likewise. Two unpublished outbox rows.', g([['SVC', 'DB', 'one txn']], { 'SVC-DB': 'ok' }, { DB: 'ok' }), { orders: { 1: 'ok' }, outbox: { 1: 'ok' } });
        topic.push('e1 (order 101)');
        push('Relay reads unpublished rows (or Debezium tails the WAL) and publishes <b>e1</b> to Kafka, keyed by order id…', g([['DB', 'R', 'read e1'], ['R', 'K', 'publish e1']], { 'DB-R': 'cur', 'R-K': 'ok' }, { R: 'cur' }), { outbox: { 0: 'cur' }, topic: { 0: 'ok' } });
        push('…and <span class="c-r">the relay crashes</span> before marking e1 as published. Kafka has e1, but the outbox still says "no".', g([], {}, { R: 'bad' }, { R: 'CRASHED' }), { outbox: { 0: 'bad' }, topic: { 0: 'ok' } });
        topic.push('e1 (order 101) DUP'); outbox[0].pub = true;
        push('The relay restarts and does what it must: re-publish everything not marked. <b>e1 is published a second time.</b> This is why outbox delivery is <b>at-least-once</b>. Then it marks e1 published.', g([['R', 'K', 'publish e1 again']], { 'R-K': 'cur' }, { R: 'ok' }), { outbox: { 0: 'ok' }, topic: { 1: 'bad' } });
        topic.push('e2 (order 102)'); outbox[1].pub = true;
        push('Relay publishes e2 and marks it. Every committed order now has its event in Kafka — nothing lost.', g([['R', 'K', 'publish e2']], { 'R-K': 'ok' }, { K: 'ok' }), { outbox: { 1: 'ok' }, topic: { 2: 'ok' } });
        inbox.push('e1'); reserved += 1;
        push('Consumer reads e1: not in processedIds → reserve stock <b>and</b> store "e1 processed" in the <b>same</b> inventory-DB transaction (inbox pattern).', g([['K', 'C', 'e1']], { 'K-C': 'ok' }, { C: 'ok' }), { topic: { 0: 'cur' }, vars: { unitsReserved: 'ok' } });
        push('Consumer reads the duplicate e1: already in processedIds → <span class="c-r">skip</span>. Stock is not reserved twice. Duplicates were <i>delivered</i> but the effect happened once.', g([['K', 'C', 'e1 (dup)']], { 'K-C': 'bad' }, { C: 'cur' }), { topic: { 1: 'bad' }, vars: { processedIds: 'cur' } });
        inbox.push('e2'); reserved += 1;
        push('<span class="c-g">e2 processed.</span> Outbox (producer side) guarantees no lost events; inbox / idempotent consumer guarantees no double effects. Together: effectively-once.', g([['K', 'C', 'e2']], { 'K-C': 'ok' }, { C: 'sel', K: 'sel' }), { topic: { 2: 'ok' }, vars: { unitsReserved: 'ok', processedIds: 'ok' } });
        return frames;
      }
    }],
    examples: [
      { title: 'Postgres polling relay that scales', html: `<p><code>SELECT id, payload FROM outbox WHERE published_at IS NULL ORDER BY id LIMIT 500 FOR UPDATE SKIP LOCKED;</code> lets several relay instances work in parallel without grabbing the same rows. After publishing (producer acks), <code>UPDATE outbox SET published_at = now() WHERE id = ANY(:ids)</code>. A nightly job deletes rows older than 7 days. Throughput: thousands of events/s with batching.</p>` },
      { title: 'Debezium outbox event router', html: `<p>Debezium's Postgres connector reads the logical replication stream; its <i>Outbox Event Router</i> transform turns each inserted outbox row into a Kafka record on topic <code>outbox.event.Order</code> with key = <code>aggregate_id</code>, so all events for one order land in one partition, in commit order. No polling queries, latency ~100 ms. You can even delete outbox rows right after inserting them — the WAL still has the insert.</p>` },
      { title: 'Why not Kafka transactions instead?', html: `<p>Kafka's transactional producer makes writes to <b>several Kafka partitions</b> atomic (plus consumer offsets). It cannot include your Postgres commit. So "DB + Kafka" still needs the outbox — or the reverse pattern: write to Kafka first and have the DB be a consumer of the log (event sourcing / "log as the source of truth").</p>` },
      { title: 'Ordering per aggregate', html: `<p>Order 101 emits Created (e1), then Paid (e5), then Cancelled (e9). If the relay publishes in id order with key = order id, Kafka keeps them in order within the partition. A polling relay with parallel workers must partition the work by aggregate id, or it can publish e9 before e5 — and consumers would see "cancelled" before "paid".</p>` }
    ],
    deepDive: `<p><b>Why the outbox is correct:</b> it reduces a distributed atomic-commit problem (DB + broker) to a <b>local</b> transaction plus an idempotent, retryable copy process. The copy is monotonic (rows are only added; the relay only moves forward), so retries are always safe — the only cost is duplicates, which consumers absorb. This is the same "log + idempotent apply" principle behind database replication and Raft itself.</p>
<p><b>Operational details:</b> outbox tables grow fast — partition by day and drop old partitions instead of mass DELETEs (which bloat Postgres). Monitor relay lag (oldest unpublished row age). CDC relays depend on replication slots: a stuck Debezium connector makes Postgres retain WAL until the disk fills — alert on slot lag. Schema the payload (Avro/Protobuf + schema registry) because consumers in other teams depend on it.</p>
<p><b>Variants:</b> <i>listen-to-yourself</i> (publish to Kafka first, consume your own event to update your DB — works when the Kafka log is acceptable as the source of truth); <i>CDC without an outbox</i> (stream raw table changes — simple, but leaks your internal schema to other teams; the outbox lets you publish stable domain events instead); <i>transactional messaging in the DB</i> (Postgres-based queues such as pgmq, or SQL Server Service Broker) where the queue lives inside the same database.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants generate the outbox table DDL, a Debezium connector config, and an idempotent consumer in minutes, and can scan a codebase for <code>repository.save(...)</code> followed by <code>kafkaTemplate.send(...)</code> — the dual-write smell. That makes it cheap to audit an entire microservice estate. <b>Use AI as a partner:</b> <code>Find every place in this repo where we write to the DB and publish to a broker in the same method; classify each as safe/unsafe and suggest an outbox migration</code>. <b>Where AI goes wrong:</b> it "fixes" dual writes by wrapping both calls in <code>@Transactional</code> (which does not cover Kafka), uses Kafka transactions as if they included the database, or forgets consumer deduplication. <b>What you must still own:</b> recognising dual writes in a design review, deciding polling vs CDC, and the at-least-once + idempotency contract between teams. AI agents that both update a record and notify someone hit the same problem — the outbox works for them too.</p>`,
    problems: [{
      title: 'Publish OrderPlaced Reliably From a Monolith',
      level: 'Medium', tags: ['outbox', 'CDC', 'kafka', 'idempotency'], companies: ['Zalando', 'Booking.com', 'PayPal'],
      statement: `<p>A Rails/Spring monolith with a MySQL database must start publishing <code>OrderPlaced</code> events to Kafka so a new Inventory service can react. Today the code does <code>save(order); kafka.send(event);</code> and the Inventory team reports roughly 0.1% of orders never arrive and occasional events for orders that do not exist. Fix it.</p>`,
      constraints: `<p>1 500 orders/s peak; inventory must see each order within 2 s; MySQL 8 with binlog enabled; Kafka available.</p>`,
      example: `<p>Pod killed between <code>save</code> and <code>send</code> → ${H.c('r', 'order with no event')}. Event sent then MySQL deadlock rolls back → ${H.c('r', 'event with no order')}.</p>`,
      brute: { why: `<p>Retrying <code>send</code> in a loop does not help if the process dies; sending inside the DB transaction creates ghost events on rollback; a nightly reconciliation job that finds missing events is too late for a 2 s requirement. The root cause is two independent writes with no atomicity.</p>` },
      mcq: { q: 'With an outbox + relay, which guarantee does the Inventory consumer still need to implement?', options: ['Nothing, outbox is exactly-once', 'Deduplicate events by event id (idempotent processing)', 'Two-phase commit with MySQL', 'Read events in random order'], answer: 1, explain: 'The relay can publish an event, crash, and publish it again, so delivery is at-least-once; consumers must be idempotent.' },
      hints: [`<p>Hint 1: Make "the order exists" and "an event must be published" a single atomic fact in MySQL.</p>`, `<p>Hint 2: Add an outbox table written in the same transaction; ship it with Debezium (binlog) or a polling relay.</p>`, `<p>Hint 3: Key by order id for ordering; consumer stores processed event ids in the same transaction as its stock update; plan cleanup and lag monitoring.</p>`],
      solution: {
        approach: `<p><b>1. Outbox table</b> in the monolith's MySQL: <code>outbox(id BIGINT AUTO_INCREMENT PK, event_id CHAR(36) UNIQUE, aggregate_type, aggregate_id, type, payload JSON, created_at)</code>. Replace <code>save(order); kafka.send(...)</code> with one transaction that inserts the order <b>and</b> the outbox row. The Kafka call disappears from the request path (lower latency, no broker dependency for checkout).</p>
<p><b>2. Relay via CDC:</b> Debezium MySQL connector reads the binlog and, using the outbox event router, publishes each outbox insert to topic <code>orders.events</code> with key = <code>aggregate_id</code> (per-order ordering) and header event_id. Latency ~100 – 500 ms, well inside 2 s; no polling load on MySQL. (Fallback if CDC is not allowed: polling relay with <code>FOR UPDATE SKIP LOCKED</code> every 200 ms.)</p>
<p><b>3. Idempotent consumer:</b> Inventory, in one local transaction, inserts <code>processed_events(event_id PK)</code> and updates stock; a duplicate violates the PK and is skipped. Commit Kafka offsets after the DB transaction.</p>
<p><b>4. Operations:</b> purge outbox rows older than 3 days by partition; alert on connector lag and binlog retention; version payload schemas in a registry; backfill historical orders once by inserting synthetic outbox rows. Result: no lost events, no ghost events, duplicates harmless.</p>`,
        complexity: `<p>One extra row insert per order (~1 KB) → ~1.5 MB/s of outbox writes at peak; Debezium adds one binlog reader; end-to-end latency typically &lt; 1 s.</p>`,
        followUps: ['How do you migrate without downtime while the old code path still sends directly?', 'What happens if Debezium is down for an hour?', 'How would you guarantee per-customer ordering instead of per-order?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 9 — Exactly-once myths
     ===================================================================== */
  topics.push({
    title: 'Exactly-Once Delivery Myths: At-Least-Once + Idempotency',
    analogy: `<p>You post a letter asking your bank to pay ₹5 000 to a friend. You never get a reply. Did the letter get lost, or did the reply get lost? You cannot know. If you send it again, you might pay twice; if you don't, you might pay zero times. The only real fix is to write a <b>unique cheque number</b> on the letter, so the bank pays cheque #812 at most once no matter how many copies arrive. "Exactly once" is not something the post office can promise — it is something the <b>bank</b> achieves by remembering cheque numbers.</p>`,
    explain: `<p>Every messaging system offers one of three delivery semantics:</p>
${H.table(['Semantics', 'How', 'Risk'], [['At-most-once', 'send, never retry (ack before processing)', H.c('r', 'lost messages')], ['At-least-once', 'retry until acknowledged (ack after processing)', H.c('y', 'duplicates')], ['Exactly-once delivery', '—', H.c('r', 'impossible over an unreliable network in general')]])}
<p><b>Why exactly-once delivery is a myth:</b> a sender that gets no acknowledgement cannot tell "message lost" from "ack lost" (the <b>Two Generals problem</b>). It must either retry (risking duplicates) or give up (risking loss). No protocol fixes this at the network level.</p>
<p><b>What IS achievable: exactly-once <i>processing</i> (effectively-once):</b> deliver at-least-once, and make the <b>effect</b> idempotent, so duplicates do nothing:</p>
<ul>
<li><b>Idempotency keys:</b> client sends <code>Idempotency-Key: 7c1e…</code> with the payment request; the server stores key → result; a retry returns the stored result instead of charging again (Stripe's API works this way).</li>
<li><b>Dedup / inbox table:</b> consumer records processed message ids in the same transaction as its side effect.</li>
<li><b>Naturally idempotent operations:</b> <code>SET status = 'PAID'</code> is idempotent; <code>balance = balance - 50</code> is not — rewrite as "apply transfer #812 if not applied".</li>
<li><b>Conditional writes / versions:</b> <code>UPDATE … WHERE version = 7</code>.</li>
</ul>
<p><b>What "exactly-once" means in Kafka:</b> Kafka's EOS (idempotent producer + transactions + <code>read_committed</code> consumers) makes a <b>read-process-write loop inside Kafka</b> atomic: consume from topic A, write to topic B, commit offsets — all or nothing. Kafka Streams and Flink use this (Flink with two-phase-commit sinks). But the moment your consumer calls an external system (sends an email, charges a card, writes to Postgres), that side effect is outside Kafka's transaction and you are back to at-least-once + idempotency.</p>
${H.kv([['Delivery', 'at-least-once (retries)'], ['Processing', 'idempotent (dedupe by key)'], ['Result', 'effectively-once']], { label: 'The formula interviewers want' })}`,
    clues: ['"each payment must be charged exactly once" → idempotency keys + dedup, not "exactly-once delivery"', '"the client retries on timeout" → idempotency key on the API', '"consumer may crash after processing but before committing the offset" → duplicates → idempotent consumer', '"Kafka exactly-once semantics" → transactions within Kafka only; external side effects need idempotency', '"Two Generals" / "lost ack" → why exactly-once delivery is impossible', '"webhooks delivered more than once" → store event ids, dedupe'],
    code: { lang: 'python', run: true, title: 'Idempotency keys for a payment API (runnable)', code: `import uuid

class PaymentService:
    """Server side: remembers idempotency keys and returns the saved result on retries."""
    def __init__(self):
        self.results = {}          # idempotency key -> response (in production: a DB table with TTL)
        self.balance = 10_000
        self.charges = 0

    def charge(self, key, amount, simulate_lost_response=False):
        if key in self.results:                       # duplicate: do NOT charge again
            return self.results[key]
        self.balance -= amount                        # the side effect
        self.charges += 1
        response = {"status": "ok", "charged": amount, "balance": self.balance}
        self.results[key] = response                  # real code: same DB transaction as the charge
        if simulate_lost_response:
            raise TimeoutError("response lost on the way back")
        return response

svc = PaymentService()
key = str(uuid.uuid4())                               # client generates ONE key per logical payment

for attempt in range(1, 4):
    try:
        resp = svc.charge(key, 5_000, simulate_lost_response=(attempt == 1))
        print(f"attempt {attempt}: {resp}")
        break
    except TimeoutError as e:
        print(f"attempt {attempt}: {e} -> retrying with the SAME key")

print("times actually charged:", svc.charges, "final balance:", svc.balance)` },
    viz: [{
      title: 'Redeliveries meet an idempotent consumer',
      input: 'm1 m2 m2 m3 m1 m4',
      inputLabel: 'Message ids as delivered (duplicates allowed), max 10',
      gen: function (input) {
        var ms = String(input === undefined ? 'm1 m2 m2 m3 m1 m4' : input).trim().split(/[\s,]+/).filter(Boolean);
        if (!ms.length) throw new Error('Enter message ids like "m1 m2 m2 m3"');
        if (ms.length > 10) throw new Error('Use at most 10 deliveries');
        var frames = [], seen = [], naive = 0, safe = 0;
        frames.push({ narr: 'A broker delivers messages <b>at least once</b>. Each message means "add ₹100 to the wallet". We run two consumers side by side: a <b>naive</b> one and an <b>idempotent</b> one that remembers processed ids.', parts: [{ type: 'queue', label: 'Deliveries', items: ms.slice(), frontLabel: 'next', backLabel: 'last' }, { type: 'set', label: 'Processed ids (idempotent consumer)', items: [] }, { type: 'bars', label: 'Wallet: naive vs idempotent (₹)', values: [0, 0], idxLabels: ['naive', 'idempotent'] }] });
        ms.forEach(function (m, i) {
          var dup = seen.indexOf(m) >= 0;
          naive += 100;
          if (!dup) { seen.push(m); safe += 100; }
          var qh = {}; qh[0] = dup ? 'bad' : 'cur';
          var sh = {}; sh[m] = dup ? 'bad' : 'ok';
          var why = dup ? (i % 2 ? 'the consumer crashed after applying it but before committing its offset, so the broker re-sent it' : 'the producer retried after a lost ack') : 'first time we see it';
          frames.push({ narr: 'Delivery #' + (i + 1) + ': <b>' + m + '</b> — ' + why + '. ' + (dup ? '<span class="c-r">Duplicate!</span> Naive consumer adds ₹100 again; idempotent consumer finds ' + m + ' in its set and <b>skips</b>.' : 'Both consumers add ₹100; idempotent consumer records ' + m + ' (in the same DB transaction as the update).'), parts: [{ type: 'queue', label: 'Deliveries', items: ms.slice(i), frontLabel: 'next', backLabel: 'last', hl: qh }, { type: 'set', label: 'Processed ids (idempotent consumer)', items: seen.slice(), hl: sh }, { type: 'bars', label: 'Wallet: naive vs idempotent (₹)', values: [naive, safe], idxLabels: ['naive', 'idempotent'], hl: { 0: dup ? 'bad' : 'ok', 1: 'ok' } }] });
        });
        frames.push({ narr: 'Done. Distinct messages: <b>' + seen.length + '</b> → correct wallet = ₹' + (seen.length * 100) + '. Naive consumer: ₹' + naive + (naive > safe ? ' <span class="c-r">(over-credited by ₹' + (naive - safe) + ')</span>' : '') + '. Idempotent consumer: ₹' + safe + ' <span class="c-g">(correct)</span>. Delivery was at-least-once; <b>processing</b> was effectively-once.', parts: [{ type: 'set', label: 'Processed ids', items: seen.slice() }, { type: 'bars', label: 'Wallet: naive vs idempotent (₹)', values: [naive, safe], idxLabels: ['naive', 'idempotent'], hl: { 0: naive > safe ? 'bad' : 'ok', 1: 'sel' } }, { type: 'text', html: '<b>Exactly-once delivery</b>: impossible in general. <b>Exactly-once effect</b>: at-least-once delivery + idempotent processing.' }] });
        frames.push({ narr: '<b>Production notes:</b> the processed-id record must be written in the <b>same transaction</b> as the wallet update (otherwise a crash between them re-opens the gap), and ids must be kept at least as long as the longest possible redelivery window (broker retention, producer retry horizon).', parts: [{ type: 'table', label: 'Dedup design choices', columns: ['choice', 'when'], rows: [['inbox table with PK on message id', 'consumer already writes to a SQL DB'], ['TTL key in Redis/DynamoDB', 'high volume, side effect elsewhere is idempotent too'], ['per-producer sequence high-water mark', 'ordered streams (Kafka partition offsets)']], hl: { 0: 'sel' } }, { type: 'set', label: 'Processed ids kept for the dedup window', items: seen.slice() }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Stripe-style idempotency keys', html: `<p>Client generates a UUID per checkout attempt and sends it on <code>POST /charges</code>. Server: <code>INSERT INTO idempotency(key, request_hash, status='IN_PROGRESS')</code> — if the key exists and is DONE, return the stored response; if IN_PROGRESS, return 409 "retry later"; if the request body differs, return 422. Keys expire after 24 h. The charge and the stored response are written in one transaction.</p>` },
      { title: 'Kafka consumer: commit after processing', html: `<p>Loop: poll → process → commit offset. Crash after process, before commit → on restart the batch is re-delivered → duplicates. Commit before process → crash loses the batch (at-most-once). So use "process, then commit" (at-least-once) and dedupe, or store the offset <b>in the same DB transaction</b> as your result and seek to it on startup — then a replay is impossible because offset and effect move together.</p>` },
      { title: 'Turning a non-idempotent update into an idempotent one', html: `${H.table(['Non-idempotent', 'Idempotent rewrite'], [['balance = balance + 100', 'INSERT INTO ledger(transfer_id PK, amount) …; balance = SUM(ledger)'], ['send email', 'INSERT INTO sent_emails(order_id, template) ON CONFLICT DO NOTHING; send only if inserted'], ['counter++ for a page view', 'add view_id to a set / HyperLogLog'], ['append to a list', 'upsert by element id']])}` },
      { title: 'Flink end-to-end exactly-once', html: `<p>Flink checkpoints operator state and source offsets with the Chandy–Lamport snapshot algorithm. Sinks like Kafka or files use a <b>two-phase-commit sink</b>: data is written in a pending transaction and committed only when the checkpoint completes. After a crash, Flink restores the last checkpoint and replays from its offsets; uncommitted output is discarded. That is exactly-once state + output — within systems that support transactions. An HTTP call from a Flink map function is still at-least-once.</p>` }
    ],
    deepDive: `<p><b>Two Generals vs FLP:</b> Two Generals says no protocol over a lossy channel lets two parties be <i>certain</i> they agree (so delivery acks can never be fully trusted). FLP says no deterministic consensus algorithm can guarantee termination in an asynchronous system with even one crash. Practical systems work around both with timeouts, retries and idempotency — they give up certainty about <i>when</i>, never about <i>what</i>.</p>
<p><b>Kafka EOS internals:</b> the idempotent producer gets a producer id and sequence numbers per partition, so the broker drops duplicate retries (enabled by default since Kafka 3.0). Transactions use a <b>transaction coordinator</b> and a <b>__transaction_state</b> log: the producer registers partitions, writes records, and commits by writing commit markers to every partition (a 2PC inside Kafka). Consumers with <code>isolation.level=read_committed</code> skip aborted records. Zombie producers are fenced by <b>epoch</b> bumps on <code>transactional.id</code> — a fencing token again.</p>
<p><b>Dedup storage design:</b> how long to remember ids? At least the maximum redelivery window (broker retention, client retry horizon, e.g. 24 h – 7 days). At 10 k msg/s × 7 days that is 6 billion ids — use a TTL'd key-value store, partition by key, or use monotonic sequence numbers per producer/partition so you only store the high-water mark ("seen up to 1 042 for producer P").</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents retry tool calls constantly (timeouts, rate limits, the model re-planning), so every tool that has side effects must accept an idempotency key — this has become a core requirement of agent-facing APIs and MCP servers in 2026. <b>Use AI as a partner:</b> <code>Audit these 12 message handlers: which are idempotent, which are not, and how would you make each one idempotent?</code> AI is good at spotting <code>+=</code> updates in handlers. <b>Where AI goes wrong:</b> it repeats marketing claims ("Kafka gives exactly-once, so no dedup needed"), stores dedup ids in memory (lost on restart), or generates a new idempotency key on each retry (which defeats the purpose). <b>What you must still own:</b> the Two Generals argument in one sentence, where your transaction boundary really ends, and the retention window for dedup records.</p>`
  });

  /* =====================================================================
     PRACTICE — Easy → Medium → Hard
     ===================================================================== */
  practice.push({
    title: 'Quorum Math: How Many Failures Can We Survive?',
    level: 'Easy', tags: ['quorum', 'raft', 'availability'], companies: ['Google', 'Amazon'],
    statement: `<p>For a Raft cluster, fill in the majority size and the number of node failures tolerated for N = 3, 4, 5, 6, 7. Then decide: your team wants to survive the loss of a <b>whole availability zone</b> in a region with 3 AZs. How many nodes do you deploy, and where?</p>`,
    constraints: `<p>Crash failures only (no lying nodes). Each AZ may fail entirely.</p>`,
    example: `<p>N = 5 → majority 3 → tolerates ${H.c('g', '2')} failures. N = 4 → majority 3 → tolerates only ${H.c('r', '1')}.</p>`,
    brute: { why: `<p>"More nodes = more fault tolerance" is the naive belief. Even sizes add a machine without adding tolerance (4 tolerates the same 1 failure as 3) and every extra node slows writes because the leader waits for a larger majority. Putting 3 nodes in only 2 AZs (2 + 1) means losing the AZ with 2 nodes kills the quorum.</p>` },
    mcq: { q: 'A 5-node cluster is spread 2 / 2 / 1 across three AZs. One AZ with 2 nodes fails. Can it still commit writes?', options: ['Yes — 3 nodes remain, a majority of 5', 'No — it needs all 5', 'Only reads work', 'Only if the leader was in the surviving AZ'], answer: 0, explain: '3 of 5 is a majority. A new leader is elected among the survivors if needed, and writes continue.' },
    hints: [`<p>Hint 1: majority = ⌊N/2⌋ + 1; tolerated failures f = N − majority = ⌊(N − 1)/2⌋.</p>`, `<p>Hint 2: To survive losing a whole AZ, no single AZ may hold a majority's worth of the "needed" nodes — the survivors must still form a majority.</p>`, `<p>Hint 3: 3 nodes as 1/1/1 or 5 nodes as 2/2/1 both survive one AZ loss; 5 also survives one more node failure elsewhere.</p>`],
    solution: {
      approach: `<p>${H.table(['N', 'majority', 'failures tolerated'], [['3', '2', '1'], ['4', '3', '1'], ['5', '3', '2'], ['6', '4', '2'], ['7', '4', '3']])}</p>
<p>Odd sizes are the sweet spot: an even N costs one more machine and one more ack per write for zero extra tolerance (and an even split in a partition leaves no majority anywhere).</p>
<p><b>AZ design:</b> deploy <b>3 nodes, one per AZ</b> (survives one AZ loss, cheapest, fastest commits) or <b>5 nodes as 2/2/1</b> (survives one AZ loss <i>plus</i> one more node failure, e.g. during a rolling upgrade). Never 2 AZs: with 2 + 1, losing the 2-node AZ loses the quorum. Write latency = RTT to the nearest majority, so put the leader in the AZ whose neighbours are closest. For region loss you need nodes in 3 regions and must accept cross-region commit latency.</p>`,
      complexity: `<p>Write cost grows with the majority size (more acks, more fsyncs); read cost is constant via the leader. Recommended: 3 or 5 voters, add non-voting learners for read scale.</p>`,
      followUps: ['Why does etcd recommend at most 7 members?', 'How do learners help read scaling without hurting writes?']
    }
  });

  practice.push({
    title: 'Pick the Delivery Semantics',
    level: 'Easy', tags: ['delivery semantics', 'idempotency'], companies: ['Uber', 'LinkedIn'],
    statement: `<p>For each pipeline choose at-most-once, at-least-once, or at-least-once + idempotent processing, and justify: (a) CPU metrics sent every 10 s to a dashboard; (b) "your order shipped" push notifications; (c) wallet top-ups from a payment webhook; (d) clickstream events feeding a daily approximate unique-visitor count.</p>`,
    constraints: `<p>Network and consumers may fail at any point; the broker retries until acked.</p>`,
    example: `<p>(c) wallet top-ups: a duplicate webhook would ${H.c('r', 'credit twice')} → needs at-least-once + idempotency by payment id.</p>`,
    brute: { why: `<p>"Use exactly-once everywhere" is the naive answer: it does not exist end to end, and buying effectively-once (dedup storage, transactions) for metrics that are overwritten every 10 s wastes money and latency. The other naive answer, fire-and-forget for everything, silently loses money events.</p>` },
    mcq: { q: 'Which pipeline can safely use at-most-once?', options: ['Wallet top-ups', 'CPU metrics every 10 s', 'Order shipped notifications', 'Bank transfers'], answer: 1, explain: 'A lost metric sample is replaced 10 s later; nothing accumulates, so losing one occasionally is fine and cheapest.' },
    hints: [`<p>Hint 1: Ask "what is the cost of a lost message?" and "what is the cost of a duplicate?" for each.</p>`, `<p>Hint 2: If duplicates are harmful and loss is harmful → at-least-once + idempotency.</p>`, `<p>Hint 3: Approximate counts with sets/HyperLogLog are naturally idempotent for duplicates.</p>`],
    solution: {
      approach: `<p><b>(a) CPU metrics → at-most-once.</b> Each sample is superseded 10 s later; a loss is invisible on a dashboard; duplicates barely matter. UDP/StatsD-style fire-and-forget is fine.</p>
<p><b>(b) Shipping notifications → at-least-once + light dedup.</b> Losing one annoys the customer; a duplicate push is mildly annoying, so dedupe by <code>(order_id, event_type)</code> with a short TTL cache.</p>
<p><b>(c) Wallet top-ups → at-least-once + strict idempotency.</b> Loss and duplicates both cost real money. Store <code>payment_id</code> with a unique constraint in the same transaction as the ledger entry; reply 200 to duplicates without crediting again.</p>
<p><b>(d) Clickstream unique visitors → at-least-once, naturally idempotent.</b> Adding the same visitor id twice to a set or HyperLogLog does not change the count; small losses are tolerable for an approximate metric.</p>
<p>General rule: choose by the cost of loss vs the cost of duplicates, and remember that "exactly-once" is always built from at-least-once + idempotent effects.</p>`,
      complexity: `<p>Idempotent processing costs one key lookup/insert per message plus storage for the dedup window (e.g. 24 h of ids).</p>`,
      followUps: ['How long must the wallet keep payment ids?', 'What if the webhook sender changes the payload on retry?']
    }
  });

  practice.push({
    title: 'Service Discovery With etcd Leases',
    level: 'Easy', tags: ['etcd', 'leases', 'service discovery'], companies: ['Cloudflare', 'DigitalOcean'],
    statement: `<p>Design how 200 instances of a "pricing" service register themselves so that API gateways always know the live set of instances, and dead instances disappear within ~10 s, using etcd.</p>`,
    constraints: `<p>Instances scale up/down every few minutes; 30 gateways need the list; etcd is a 3-node cluster.</p>`,
    example: `<p>Instance 10.0.3.7 crashes at 12:00:00 → its key ${H.c('r', 'expires by ~12:00:10')} → gateways' watch fires → they stop routing to it.</p>`,
    brute: { why: `<p>Naive: each instance writes its address at startup and deletes it on graceful shutdown. A crash or kill -9 never deletes the key, so gateways route to a dead IP forever. Polling a static config file is also slow and manual.</p>` },
    mcq: { q: 'What makes the registration disappear automatically when an instance crashes?', options: ['A cron job', 'Attaching the key to a lease with a TTL that the instance keeps alive', 'Kubernetes deleting the etcd key', 'The gateway timing out requests'], answer: 1, explain: 'A lease expires when keep-alives stop; every key attached to it is deleted, and watchers are notified.' },
    hints: [`<p>Hint 1: Use a lease (TTL ~10 s) per instance and attach its key to it.</p>`, `<p>Hint 2: Instances send keep-alives every ~3 s; gateways list the prefix once, then watch from that revision.</p>`, `<p>Hint 3: Add client-side health checks/outlier detection because "registered" ≠ "healthy".</p>`],
    solution: {
      approach: `<p><b>Register:</b> on startup an instance grants a lease (TTL 10 s), then <code>PUT /services/pricing/&lt;instance-id&gt; {ip, port, zone, version}</code> with that lease, and runs keep-alive every ~3 s. Graceful shutdown revokes the lease (instant removal). A crash stops keep-alives → lease expires within 10 s → key deleted automatically.</p>
<p><b>Discover:</b> each gateway does <code>GET /services/pricing/ --prefix</code> (records the response revision), builds its pool, then <code>WATCH --prefix</code> from revision + 1, so no change is missed. On watch error "compacted", re-list and re-watch. Gateways cache the list so an etcd outage does not stop routing (they just stop seeing changes).</p>
<p><b>Load:</b> 200 instances × one keep-alive per 3 s ≈ 70 lease ops/s and 30 watchers — tiny for etcd. <b>Health:</b> registration only proves the process can talk to etcd; gateways also do active health checks and eject instances returning errors (outlier detection). In Kubernetes this exact mechanism is provided by Endpoints/EndpointSlices backed by etcd.</p>`,
      complexity: `<p>O(instances) keys; O(1) work per change per watcher; detection latency ≤ lease TTL.</p>`,
      followUps: ['What happens if the etcd cluster loses quorum?', 'How would you do the same with ZooKeeper?']
    }
  });

  practice.push({
    title: 'Efficiency Lock or Correctness Lock?',
    level: 'Easy', tags: ['distributed lock', 'redis', 'fencing'], companies: ['Atlassian', 'Shopify'],
    statement: `<p>Classify each lock as efficiency or correctness and pick an implementation: (a) avoid two servers generating the same daily PDF report (generation is deterministic, last write wins); (b) only one process may decrement a gift card's balance at a time; (c) avoid two workers warming the same cache key after a miss.</p>`,
    constraints: `<p>Redis, Postgres and etcd are all available.</p>`,
    example: `<p>(c) cache warming: two workers loading the same key just ${H.c('y', 'waste one DB query')} → efficiency lock is enough.</p>`,
    brute: { why: `<p>Using the same Redis SET NX lock for everything treats a gift-card balance like a cache warm-up. Under a GC pause or Redis failover, two holders run at once — harmless for (a) and (c), but (b) could double-spend a gift card.</p>` },
    mcq: { q: 'For the gift-card balance, what is the simplest correct approach?', options: ['Redis SET NX with a 30 s TTL', 'Redlock on 5 Redis nodes', 'A conditional update in Postgres: UPDATE … SET balance = balance - 20 WHERE id = ? AND balance &gt;= 20 (or version check)', 'A local mutex in each server'], answer: 2, explain: 'The database row itself enforces correctness atomically; no distributed lock is needed at all.' },
    hints: [`<p>Hint 1: Ask "what breaks if two holders run concurrently?"</p>`, `<p>Hint 2: Harmless duplicate work → efficiency lock (single Redis key). Corruption or money → correctness.</p>`, `<p>Hint 3: For correctness prefer the resource's own atomic operation (conditional UPDATE, CAS) over a separate lock.</p>`],
    solution: {
      approach: `<p><b>(a) Daily PDF → efficiency.</b> Deterministic output, last write wins; a duplicate costs CPU only. Redis <code>SET report:2026-10-15 owner NX PX 600000</code>, released with an owner-checking Lua script. Even better: make the output path deterministic so a duplicate just overwrites identical bytes.</p>
<p><b>(b) Gift-card balance → correctness.</b> Do not use a lock at all: <code>UPDATE gift_cards SET balance = balance - 20 WHERE id = :id AND balance &gt;= 20</code> plus an idempotency key per redemption (unique row in a <code>redemptions</code> table in the same transaction). The database serialises the updates; no pause can cause a double spend. If a lock is truly required, use a consensus store with fencing tokens checked by the database.</p>
<p><b>(c) Cache warming → efficiency.</b> Single-flight per key: Redis SET NX with a short TTL (a few seconds), others wait briefly or serve stale. If the lock fails, the worst case is one extra DB query.</p>`,
      complexity: `<p>(a)/(c): one Redis op per acquisition. (b): one row update in the existing transaction — no extra infrastructure.</p>`,
      followUps: ['When would (a) become a correctness problem?', 'How does single-flight relate to cache stampede protection?']
    }
  });

  practice.push({
    title: 'Exactly One Active Cron Scheduler',
    level: 'Medium', tags: ['leader election', 'lease', 'fencing'], companies: ['Airbnb', 'Netflix', 'Stripe'],
    statement: `<p>A billing scheduler runs as 3 replicas for availability. At any time only one should trigger jobs (e.g. "charge subscriptions at 00:00"), and failover should happen within 15 s if the active one dies. Design it, and make sure a paused ex-leader cannot double-trigger a job.</p>`,
    constraints: `<p>~500 jobs/day; some jobs charge money; replicas run in Kubernetes across 3 zones.</p>`,
    example: `<p>Leader A pauses at 23:59:58 for 20 s; B takes over at 00:00:10 and triggers the 00:00 job. A wakes and also tries: ${H.c('r', 'must be prevented')}.</p>`,
    brute: { why: `<p>Running the cron in all 3 replicas triggers every job 3 times. Picking "replica-0" statically gives no failover. A lease without fencing still allows a paused ex-leader to trigger a job after losing leadership — and that job charges money.</p>` },
    mcq: { q: 'What stops a paused ex-leader from triggering the job a second time?', options: ['A shorter lease', 'Recording each job run with a unique (job_id, scheduled_time) key, written conditionally with the leader\'s fencing token', 'Checking isLeader() right before triggering', 'Running only one replica'], answer: 1, explain: 'A unique run key makes triggering idempotent, and the fencing token rejects a stale leader at the database even if it passed its own check.' },
    hints: [`<p>Hint 1: Leader election via Kubernetes Lease / etcd / ZooKeeper with a ~10 s lease.</p>`, `<p>Hint 2: Each job run gets a natural idempotency key: (job_id, scheduled_time).</p>`, `<p>Hint 3: Insert the run row with the fencing token/epoch; downstream jobs check the run row before doing work.</p>`],
    solution: {
      approach: `<p><b>Election:</b> replicas compete for a Kubernetes <code>Lease</code> object (backed by etcd) or an etcd election key: lease 10 s, renew every 3 s, retry period 2 s → failover ≈ 10 – 15 s. Each acquisition increments an <b>epoch</b> (fencing token; e.g. the etcd revision or a counter in the Lease annotation).</p>
<p><b>Triggering idempotently:</b> the leader, at each tick, inserts into <code>job_runs(job_id, scheduled_for, epoch, status)</code> with a <b>unique key on (job_id, scheduled_for)</b>. Only the insert that succeeds may enqueue the job. A paused ex-leader that wakes up either hits the unique key (B already inserted) or, if it got there first, holds an older epoch — workers check <code>epoch &gt;= current_epoch</code> before acting, and the charge step itself uses idempotency keys derived from the run id.</p>
<p><b>Missed runs:</b> on becoming leader, scan for scheduled_for times in the last N minutes with no run row and trigger them (catch-up policy per job). <b>Observability:</b> metrics for leader changes, run lag, duplicate-insert conflicts. This is how tools like Kubernetes CronJob controllers, Airflow schedulers (HA mode uses DB row locks) and Temporal schedules avoid duplicate firing.</p>`,
      complexity: `<p>Lease renewals ≈ 0.3 writes/s per replica; one unique insert per job run; failover ≤ 15 s.</p>`,
      followUps: ['How would you shard the scheduler if there were 10 million jobs/day?', 'What if the database is unreachable but etcd is fine?']
    }
  });

  practice.push({
    title: 'Money Transfer Between Two Shards of the Same Bank',
    level: 'Medium', tags: ['2PC', 'saga', 'ledger', 'sharding'], companies: ['JPMorgan', 'Revolut', 'Nubank'],
    statement: `<p>Accounts are hash-sharded across 64 Postgres shards owned by one team. A transfer debits account X on shard 3 and credits account Y on shard 41. Users must never see money disappear or appear from nowhere in total balances. Choose 2PC, a saga, or something else, and design it.</p>`,
    constraints: `<p>20 000 transfers/s; p99 under 200 ms; regulators audit every movement.</p>`,
    example: `<p>Saga with debit then credit: between the steps the bank's total balance is ${H.c('r', '₹500 short')} — visible to a concurrent audit query.</p>`,
    brute: { why: `<p>A naive saga (debit X, then credit Y, compensate by re-crediting X) exposes in-between states and can fail mid-way, leaving money "in flight" with no record. Naive 2PC across Postgres shards with XA works but holds locks across two round trips and blocks if the coordinator dies — painful at 20 k/s.</p>` },
    mcq: { q: 'Which design keeps every intermediate state auditable without cross-shard locks?', options: ['XA 2PC on every transfer', 'Double-entry ledger with a "transfer in flight" (suspense) account and idempotent steps', 'Debit and credit in parallel with no record', 'A global lock on both accounts'], answer: 1, explain: 'Moving money via a suspense/clearing entry makes every step a balanced double-entry posting, so totals always reconcile while the saga proceeds.' },
    hints: [`<p>Hint 1: Banks never "lose" money in between: they use double-entry bookkeeping with clearing (suspense) accounts.</p>`, `<p>Hint 2: Step 1 on shard 3: debit X, credit "in-flight" with transfer id. Step 2 on shard 41: debit in-flight, credit Y. Each step is a local transaction.</p>`, `<p>Hint 3: Use an outbox to drive step 2; idempotency by transfer id; if Y is closed, compensate by reversing step 1.</p>`],
    solution: {
      approach: `<p><b>Design: ledger-based saga with a clearing account</b> (what most real banks do), with 2PC as the alternative if the platform supports it natively.</p>
<p><b>Step 1 (shard 3, one local transaction):</b> insert ledger rows <code>(transfer_id, X, −500)</code> and <code>(transfer_id, IN_FLIGHT, +500)</code>, update X's balance with <code>WHERE balance &gt;= 500</code>, and insert an outbox row "CreditLeg(transfer_id, Y, 500)". Totals stay balanced: the money is visibly in the clearing account.</p>
<p><b>Step 2 (shard 41):</b> a consumer applies <code>(transfer_id, IN_FLIGHT, −500)</code>, <code>(transfer_id, Y, +500)</code> with a unique key on (transfer_id, leg) → idempotent. Then marks the transfer COMPLETED.</p>
<p><b>Failure:</b> if Y is frozen/closed, compensate with a reversing entry on shard 3 (IN_FLIGHT → X). Nothing is ever deleted; audits see every movement. Reconciliation job: IN_FLIGHT balance should equal the sum of transfers not yet completed; alert on transfers stuck &gt; 1 min.</p>
<p><b>Why not XA:</b> locks across shards at 20 k/s and coordinator blocking hurt p99. <b>When 2PC is right:</b> if the shards are a distributed SQL database (Spanner/CockroachDB/YugabyteDB) whose replicated 2PC gives atomic cross-shard transactions with acceptable latency, a single atomic transaction is simpler to reason about.</p>`,
      complexity: `<p>Two local transactions + one message per transfer; latency ≈ 2 × local commit + queue hop (~20 – 50 ms); no cross-shard locks.</p>`,
      followUps: ['How do you show the user a consistent balance during the in-flight window?', 'How would same-shard transfers be optimised?']
    }
  });

  practice.push({
    title: 'Trip Booking Saga: Flight + Hotel + Car',
    level: 'Medium', tags: ['saga', 'orchestration', 'compensation'], companies: ['Expedia', 'Booking.com', 'MakeMyTrip'],
    statement: `<p>A travel site sells packages: a flight (airline API), a hotel (hotel API), and a rental car (car API), plus charging the customer. Partners have different cancellation rules (the flight is non-refundable after ticketing, the hotel is free to cancel for 24 h, the car is free anytime). Design the saga: step order, compensations, pivot, and failure handling.</p>`,
    constraints: `<p>Partner APIs take 1 – 10 s and sometimes time out with unknown results; all support idempotent request ids and "hold/reserve" before "confirm".</p>`,
    example: `<p>Car unavailable after the flight was ticketed → ${H.c('r', 'cannot refund the flight')} → wrong step order cost the business money.</p>`,
    brute: { why: `<p>Naive order: charge card, ticket flight, book hotel, book car, then compensate everything on failure. The flight ticket is non-refundable, so a late car failure becomes a real loss; charging first means refunds on every failure; timeouts with unknown results lead to double bookings when retried without idempotency.</p>` },
    mcq: { q: 'Which step should be the pivot (point of no return)?', options: ['Reserve car', 'Hold hotel room', 'Ticket the flight (non-refundable) after all holds succeed and payment is authorized', 'Send confirmation email'], answer: 2, explain: 'Do every reversible hold first, authorize payment, then perform the irreversible ticketing; afterwards only retry forward.' },
    hints: [`<p>Hint 1: Put cheap-to-undo steps first and irreversible ones last.</p>`, `<p>Hint 2: Use holds: hold flight seat, hold hotel, hold car, authorize card — then confirm in order of reversibility.</p>`, `<p>Hint 3: Timeouts → query status by idempotent request id before retrying or compensating; orchestrate with a workflow engine.</p>`],
    solution: {
      approach: `<p><b>Orchestrated saga</b> (Temporal/Step Functions) — with 4 partners and branching rules, choreography would be unreadable.</p>
<ol><li><b>Hold flight seat</b> (airline hold, ~20 min). Comp: release hold.</li>
<li><b>Hold hotel room.</b> Comp: release.</li>
<li><b>Reserve car.</b> Comp: cancel (free anytime).</li>
<li><b>Authorize payment</b> for the package. Comp: void authorization.</li>
<li><b>Pivot — ticket the flight</b> (irreversible).</li>
<li><b>Confirm hotel, confirm car, capture payment, send itinerary</b> — retryable steps after the pivot; if the hotel confirm fails permanently, rebook an equivalent hotel or escalate to a human agent rather than "undoing" the flight.</li></ol>
<p><b>Unknown results:</b> every partner call carries an idempotency id = <code>sagaId + step</code>; on timeout the orchestrator queries the partner's status before retrying or compensating. <b>Hold expiry:</b> the orchestrator sets timers; if the saga stalls beyond hold windows, it compensates proactively. <b>User experience:</b> "Booking in progress" page polling saga state; final itinerary or a clear failure with no charge. <b>Choreography comparison:</b> events like FlightHeld → HotelHeld → … would spread the pivot rule across services and make partner-specific timeouts hard to manage.</p>`,
      complexity: `<p>Latency ≈ sum of partner calls (~5 – 30 s) — acceptable for an async booking flow; one saga state record + history per booking.</p>`,
      followUps: ['How do you test compensations for every failure point?', 'What if the payment capture fails after ticketing?']
    }
  });

  practice.push({
    title: 'Exactly-Once Fraud Scoring Pipeline on Kafka',
    level: 'Medium', tags: ['kafka', 'exactly-once', 'transactions', 'stream processing'], companies: ['Confluent', 'PayPal', 'Visa'],
    statement: `<p>A service reads <code>payments</code> from Kafka, computes a fraud score using a per-card rolling state, writes <code>scored-payments</code> back to Kafka, and also blocks very risky cards in a Postgres table. Design it so that every payment is scored exactly once in the output topic, and explain what guarantee the Postgres side gets.</p>`,
    constraints: `<p>50 000 payments/s; consumers may crash anytime; ordering per card matters.</p>`,
    example: `<p>Consumer crashes after writing a score but before committing its offset → without transactions the payment is ${H.c('r', 'scored twice')} in the output topic.</p>`,
    brute: { why: `<p>Naive loop: poll, score, produce, then commit offset. A crash between produce and commit duplicates outputs; committing first loses payments. Keeping the per-card state in local memory loses it on restart and double-counts after replay.</p>` },
    mcq: { q: 'Kafka transactions make which operations atomic together?', options: ['Produce to output topic + consumer offset commit (+ state changelog)', 'Kafka write + Postgres write', 'Postgres write + email', 'Nothing — they are only for ordering'], answer: 0, explain: 'A Kafka transaction covers writes to Kafka partitions, including the offsets topic and state changelogs; external databases are outside it.' },
    hints: [`<p>Hint 1: Partition by card id so one consumer instance owns each card's state and order.</p>`, `<p>Hint 2: Use Kafka Streams (processing.guarantee=exactly_once_v2) or a transactional producer with sendOffsetsToTransaction.</p>`, `<p>Hint 3: For Postgres, use an idempotent upsert keyed by card id + payment id, or move it to a separate consumer of the output topic.</p>`],
    solution: {
      approach: `<p><b>Kafka-internal part:</b> key <code>payments</code> by card id. Use Kafka Streams with <code>exactly_once_v2</code>: per-card rolling state lives in a local RocksDB store backed by a changelog topic. Each transaction includes: output records to <code>scored-payments</code>, changelog writes, and the consumed offsets. A crash aborts the open transaction; downstream consumers with <code>read_committed</code> never see the aborted outputs; the task restarts from the last committed offsets and state. Result: each payment's score appears exactly once in the output topic. Zombie instances are fenced by the producer epoch.</p>
<p><b>Postgres part:</b> outside the Kafka transaction, so it is at-least-once. Make it idempotent: a separate consumer reads <code>scored-payments</code> (read_committed) and does <code>INSERT INTO blocked_cards(card_id, reason, payment_id) ON CONFLICT (card_id) DO NOTHING</code>. Replays do no harm. Alternatively store the consumer offset in Postgres in the same transaction and seek to it on startup.</p>
<p><b>Throughput:</b> 50 k/s across e.g. 64 partitions; transaction commit interval ~100 ms balances latency and overhead.</p>`,
      complexity: `<p>EOS adds a commit marker per partition per transaction and ~10 – 30% throughput overhead; end-to-end latency grows by the commit interval.</p>`,
      followUps: ['What happens to read_committed consumers while a transaction is open for a long time?', 'How does Flink achieve the same with checkpoints?']
    }
  });

  practice.push({
    title: 'Shard Map Store for a Sharded Database',
    level: 'Medium', tags: ['etcd', 'zookeeper', 'metadata', 'sharding'], companies: ['YouTube (Vitess)', 'Pinterest', 'Slack'],
    statement: `<p>Your MySQL fleet has 256 shards. Routers must know which shard holds which key range and which replica is primary. Shards are split and primaries fail over a few times a day. Design where the shard map lives and how routers stay consistent, including during a primary failover.</p>`,
    constraints: `<p>2 000 router processes; map is ~200 KB; failover must not send writes to two primaries.</p>`,
    example: `<p>Primary of shard 17 fails; replica promoted. A router with a stale map ${H.c('r', 'still writes to the old primary')} if it recovers — must be prevented.</p>`,
    brute: { why: `<p>Naive: a config file pushed to all routers by a deploy, or a table in one of the MySQL shards. Deploys are too slow for failover; a single MySQL table is a single point of failure and lacks watches; and nothing stops an old primary from accepting writes during the transition.</p>` },
    mcq: { q: 'What prevents the old primary from accepting writes after failover?', options: ['Routers polling more often', 'Fencing: bump a shard epoch in the store and make the old primary read-only (or have MySQL reject writes with an old epoch)', 'A longer TTL', 'Nothing can'], answer: 1, explain: 'The new epoch is the fencing token; the failover tool also sets the old primary read-only (or shoots it) before promoting the replica.' },
    hints: [`<p>Hint 1: Store the shard map in etcd/ZooKeeper (small, consistent, watchable).</p>`, `<p>Hint 2: Routers cache the map and watch for changes; each shard record has an epoch.</p>`, `<p>Hint 3: Failover: fence old primary (read-only / STONITH), promote, write new primary + epoch++ atomically with a CAS.</p>`],
    solution: {
      approach: `<p><b>Store:</b> a 3- or 5-node etcd (or ZooKeeper) cluster holds <code>/shards/&lt;id&gt; = {range, primary, replicas, epoch}</code>. It is small (200 KB) and rarely written — a perfect fit. This is exactly what Vitess (topology service on etcd/ZooKeeper/Consul) does.</p>
<p><b>Routers:</b> list the map once, then watch from that revision; keep a local cache so an etcd outage only freezes changes, not traffic. Every routed write carries the shard epoch the router believes in.</p>
<p><b>Failover (orchestrator, itself leader-elected):</b> (1) detect primary failure; (2) <b>fence</b> the old primary — set <code>super_read_only</code> or cut it off at the proxy / STONITH; (3) promote the most up-to-date replica; (4) etcd transaction: <code>if epoch == 41 then put primary=new, epoch=42</code> (CAS prevents two orchestrators racing); (5) routers get the watch event within ~100 ms. A router with a stale view that sends epoch 41 to the new primary gets "stale epoch, refresh"; the old primary refuses writes because it is read-only.</p>
<p><b>Splits:</b> copy data, then a single CAS changes the range mapping and epoch; routers retry on "wrong shard" errors. Consistency of metadata comes from consensus; safety of data comes from fencing.</p>`,
      complexity: `<p>Writes to etcd: a handful per failover/split; reads: 2 000 watchers, negligible load; failover time dominated by detection (~10 s) + promotion.</p>`,
      followUps: ['How do routers behave if etcd is unavailable during a failover?', 'Why not gossip the shard map instead?']
    }
  });

  practice.push({
    title: 'Idempotent Webhook Receiver',
    level: 'Medium', tags: ['idempotency', 'webhooks', 'at-least-once'], companies: ['Stripe', 'Twilio', 'GitHub'],
    statement: `<p>Your SaaS receives webhooks from a payment provider: <code>invoice.paid</code>, <code>invoice.refunded</code>, etc. The provider retries for up to 3 days on any non-2xx or timeout, may deliver events out of order, and occasionally sends the same event twice even after a 200. Design the receiver so each event takes effect exactly once and in a sensible order.</p>`,
    constraints: `<p>Peaks of 2 000 events/s; handler work (provisioning accounts) can take 5 s.</p>`,
    example: `<p>Same <code>evt_123 invoice.paid</code> arrives twice → account must be ${H.c('g', 'upgraded once')}, invoice email sent once.</p>`,
    brute: { why: `<p>Naive: do the work synchronously in the HTTP handler and return 200 at the end. Slow handlers time out → provider retries → duplicate work; duplicates after 200 are processed again; out-of-order "refunded" before "paid" leaves the account in the wrong state.</p>` },
    mcq: { q: 'What should the HTTP handler do before returning 200?', options: ['Run the full provisioning', 'Verify the signature, durably store the event (unique by event id), and enqueue it', 'Nothing — return 200 immediately', 'Call the provider API to confirm and then process'], answer: 1, explain: 'Store-then-ack makes acceptance fast and durable; the unique event id dedupes provider retries; processing happens asynchronously.' },
    hints: [`<p>Hint 1: Separate receive (fast, durable) from process (async, retried).</p>`, `<p>Hint 2: Unique constraint on event_id in an inbox table; the worker marks processed in the same transaction as its effects.</p>`, `<p>Hint 3: For ordering, compare the object's version/updated timestamp or re-fetch current state from the provider API.</p>`],
    solution: {
      approach: `<p><b>Receive:</b> verify the HMAC signature and timestamp (reject replays older than 5 min), then <code>INSERT INTO webhook_inbox(event_id PK, type, object_id, payload, received_at) ON CONFLICT DO NOTHING</code>, return 200 within ~50 ms. Duplicates (even after 200) hit the PK and are ignored.</p>
<p><b>Process:</b> workers pick unprocessed rows (<code>FOR UPDATE SKIP LOCKED</code>) and, in one transaction, apply the effect and set <code>processed_at</code>. Side effects outside the DB (emails, provisioning calls) are emitted through an outbox with idempotency keys = event_id, so retries of the worker do not re-send.</p>
<p><b>Ordering:</b> do not trust delivery order. Either store per-object <code>last_applied_version</code> and ignore older events, or treat the webhook as a hint and <b>re-fetch</b> the invoice's current state from the provider API, then apply state transitions idempotently (PAID → REFUNDED allowed; REFUNDED → PAID ignored). Keep inbox rows for longer than the provider's retry window (3 days, say 7). Monitor backlog age and failure counts; dead-letter after N failures for human review.</p>`,
      complexity: `<p>One insert per delivery (2 000/s), async workers sized for 5 s jobs (~10 000 concurrent capacity or batching); storage ≈ events × 7 days.</p>`,
      followUps: ['How do you replay events after a bug fix?', 'What if the provider does not send an event id?']
    }
  });

  practice.push({
    title: 'Design an etcd-like Replicated Key-Value Store',
    level: 'Hard', tags: ['raft', 'linearizability', 'snapshots', 'membership'], companies: ['Google', 'Cockroach Labs', 'HashiCorp'],
    statement: `<p>Design a strongly consistent key-value store for cluster metadata: <code>put</code>, <code>get</code>, <code>delete</code>, compare-and-swap, watches, and leases. It must survive 2 node failures, offer linearizable reads and writes, and support adding/removing nodes without downtime.</p>`,
    constraints: `<p>Data ≤ 8 GB; 10 000 writes/s; 100 000 reads/s; 5 nodes across 3 AZs; p99 write &lt; 20 ms.</p>`,
    example: `<p>Client writes x=5 (acked), leader dies, client reads x from the new leader → must see ${H.c('g', '5')}, never the old value.</p>`,
    brute: { why: `<p>Primary + async replicas: fast, but a failover can lose acked writes and reads from replicas are stale. Synchronous replication to all replicas: one slow node stalls every write and any failure blocks writes. Neither gives linearizability with fault tolerance.</p>` },
    mcq: { q: 'How can the leader serve a linearizable read without writing to the log?', options: ['Just read local state — it is the leader', 'ReadIndex: record commitIndex, confirm leadership with a heartbeat round to a majority, wait until applied, then read', 'Read from any follower', 'Use the client\'s clock'], answer: 1, explain: 'A deposed leader might not know it was replaced; confirming with a majority after recording commitIndex guarantees the read reflects all committed writes.' },
    hints: [`<p>Hint 1: Raft group of 5; the state machine is an MVCC B-tree (bbolt in etcd) keyed by (key, revision).</p>`, `<p>Hint 2: Writes = Raft proposals, batched; reads via ReadIndex or leases; watches are a feed of applied revisions.</p>`, `<p>Hint 3: Snapshots + compaction for log size; learners + single-server membership changes; leases replicated as log entries with the leader tracking expiry.</p>`],
    solution: {
      approach: `<p><b>Replication:</b> 5-node Raft group (2/2/1 across AZs). Every mutation (put, delete, txn, lease grant/revoke) is a Raft log entry. Leader batches proposals and pipelines AppendEntries; WAL on a dedicated NVMe with group-commit fsync → p99 write ≈ cross-AZ RTT + fsync ≈ 3 – 10 ms.</p>
<p><b>State machine:</b> MVCC store — each applied entry increments a global <b>revision</b>; keys store versions (create_revision, mod_revision, version). Enables CAS transactions (<code>if mod_revision(k) == r then …</code>), consistent snapshots for range reads, and watches.</p>
<p><b>Reads:</b> linearizable via <b>ReadIndex</b> (leader records commitIndex, confirms leadership with a heartbeat quorum, waits for apply). Optional lease-based reads skip the round trip assuming bounded clock drift. Serializable (possibly stale) reads served by any member for scale. 100 k reads/s: batch ReadIndex confirmations — one heartbeat round serves thousands of reads.</p>
<p><b>Watches:</b> clients subscribe from revision r; the server streams applied events from an in-memory ring + the MVCC history; compacted revisions return an error forcing a re-list.</p>
<p><b>Leases:</b> grants/revokes are log entries; only the leader tracks expiry timers and proposes a revoke when a lease expires (on leader change, remaining TTLs are extended to avoid mass expiry). <b>Durability/size:</b> snapshot the state machine every N entries, truncate the log, InstallSnapshot for lagging members; periodic MVCC compaction + defragmentation; quota alarm at 8 GB.</p>
<p><b>Membership:</b> add a node as a <b>learner</b>, let it catch up via snapshot, then promote with a single-server configuration change (one at a time keeps majorities overlapping). PreVote + CheckQuorum prevent disruptive elections.</p>`,
      complexity: `<p>Write: 1 RTT to a majority + fsync; reads: O(1) RTT amortised via batched ReadIndex; storage: data + MVCC history until compaction; tolerates 2 failures.</p>`,
      followUps: ['How would you scale beyond one Raft group (multi-Raft, range splits)?', 'What breaks if two configuration changes overlap?', 'How do watches survive a leader change?']
    }
  });

  practice.push({
    title: 'Globally Consistent Cross-Shard Transactions (Spanner-style)',
    level: 'Hard', tags: ['2PC', 'paxos', 'multi-region', 'external consistency'], companies: ['Google', 'Cockroach Labs', 'Yugabyte'],
    statement: `<p>Design a multi-region database where data is sharded into thousands of ranges, each range replicated across 3 regions, and transactions can update rows in several ranges atomically with serializable isolation. Explain how replication, atomic commit and ordering fit together, and what latency to expect.</p>`,
    constraints: `<p>Regions: us-east, us-west, eu-west (RTT 60 – 140 ms); survive loss of a full region; global secondary indexes must stay consistent with base tables.</p>`,
    example: `<p>Transfer touching range A (leader in us-east) and range B (leader in eu-west): commit must be ${H.c('g', 'all or nothing')} even if eu-west dies mid-commit.</p>`,
    brute: { why: `<p>Plain 2PC over un-replicated shards blocks forever if a coordinator's region dies. Single-leader global replication sends every write to one region (huge latency for others). Eventual consistency (Dynamo-style) breaks global index consistency and serializability.</p>` },
    mcq: { q: 'Why is 2PC acceptable here despite its blocking problem?', options: ['Coordinators never crash', 'Coordinator and participants are each Paxos/Raft groups, so a crashed node is replaced by a new leader that continues from the replicated 2PC state', '3PC is used instead', 'Transactions are short'], answer: 1, explain: 'Replicating the prepare/commit records through consensus turns "coordinator crashed" into a fast leader failover rather than an indefinite block.' },
    hints: [`<p>Hint 1: Each range = one consensus group (Paxos/Raft) across 3 regions; leader placement matters for latency.</p>`, `<p>Hint 2: Cross-range transactions = 2PC where every participant and the coordinator are consensus groups.</p>`, `<p>Hint 3: Ordering: MVCC with commit timestamps; Spanner uses TrueTime commit-wait; CockroachDB uses hybrid logical clocks + uncertainty intervals.</p>`],
    solution: {
      approach: `<p><b>Replication:</b> each range (~64 – 512 MB) is a Paxos/Raft group with replicas in 3 regions; its leader (leaseholder) serves reads and orders writes. Leaders are placed near the users who write that data (e.g. by a region column in the primary key). A write commits after a majority (2 of 3 regions) acks → 1 cross-region RTT (~60 – 100 ms).</p>
<p><b>Atomic commit:</b> a transaction buffers writes as <b>intents</b> (provisional MVCC versions with a lock). At commit, one range acts as coordinator holding the transaction record; 2PC prepares intents on all participant ranges and writes COMMIT to the transaction record — each step replicated through consensus. If any node or a whole region dies, the group's new leader resumes from the replicated record: no indefinite blocking. CockroachDB's <i>parallel commits</i> make the common case one consensus round.</p>
<p><b>Isolation and ordering:</b> MVCC with commit timestamps gives serializable snapshot reads. For external consistency, Spanner assigns timestamps from <b>TrueTime</b> (GPS + atomic clocks with bounded uncertainty ε, ~1 – 7 ms) and waits out ε before acknowledging (commit-wait). CockroachDB uses hybrid logical clocks and restarts reads that fall inside an uncertainty window. Global indexes are just other ranges updated in the same transaction → always consistent.</p>
<p><b>Latency budget:</b> local-region leader + majority in a nearby region ≈ 20 – 80 ms writes; cross-region transactions ≈ 100 – 200 ms; stale reads (bounded staleness, follower reads) are local. <b>Region loss:</b> each range still has 2 of 3 replicas → quorum survives.</p>`,
      complexity: `<p>Per transaction: one consensus round per participant (parallel) + coordinator record; latency dominated by cross-region RTT; throughput scales with the number of ranges.</p>`,
      followUps: ['What happens to write latency if you need to survive two region failures?', 'How do follower reads stay correct with bounded staleness?', 'Why does commit-wait guarantee external consistency?']
    }
  });

  practice.push({
    title: 'Design a Chubby-like Lock Service',
    level: 'Hard', tags: ['lock service', 'paxos', 'sessions', 'fencing'], companies: ['Google', 'Meta', 'Microsoft'],
    statement: `<p>Design a coarse-grained lock service used by thousands of internal services for leader election and small-config storage (like Google's Chubby). Provide: acquire/release locks, sessions with keep-alives, change notifications, and a way for lock holders to prove to other servers that they still hold the lock.</p>`,
    constraints: `<p>Locks are held for hours/days (coarse-grained); 50 000 clients per cell; must survive 2 machine failures; clients may pause arbitrarily.</p>`,
    example: `<p>A GFS master holds lock <code>/ls/cell/gfs/master</code>; it pauses; the session expires; a new master takes over. Chunkservers must ${H.c('r', 'reject')} commands from the old master.</p>`,
    brute: { why: `<p>One lock server with an in-memory table is a single point of failure. A replicated store without sessions leaves locks held forever by crashed clients. Sessions without sequencers let a paused ex-holder keep issuing commands to other servers, causing split brain.</p>` },
    mcq: { q: 'How does a lock holder prove to a third-party server that its lock is current?', options: ['By sending its hostname', 'With a sequencer (lock name + generation number) that the server validates or compares against the highest it has seen', 'By sending a timestamp', 'It cannot'], answer: 1, explain: 'A sequencer is a fencing token: the receiving server checks it with the lock service or compares generation numbers, rejecting stale holders.' },
    hints: [`<p>Hint 1: A cell of 5 replicas running Paxos/Raft; a master serves all requests; state = file-system-like namespace.</p>`, `<p>Hint 2: Sessions + keep-alives (KeepAlive RPC held open until near lease expiry); master lease; grace period on failover.</p>`, `<p>Hint 3: Each lock acquisition increments a generation → sequencer = fencing token; clients cache with invalidation-based consistency.</p>`],
    solution: {
      approach: `<p><b>Cell:</b> 5 replicas, consensus (Multi-Paxos/Raft) elects a <b>master</b> with a master lease (several seconds) so it can serve reads locally. Data model: small files/directories (<code>/ls/cell/service/leader</code>) that double as locks, each with an ACL and metadata: instance number, content generation, <b>lock generation</b>.</p>
<p><b>Sessions:</b> a client opens a session and sends KeepAlive RPCs; the master replies near the end of the session lease (e.g. 12 s), extending it. If keep-alives stop, the session expires and all its locks and ephemeral files are released. On master failover the new master extends all session leases by a grace period so clients are not mass-expired; clients enter "jeopardy", stop acting on locks, and resume if the session survives.</p>
<p><b>Locks:</b> acquiring a lock is a replicated operation that increments the lock generation. The holder obtains a <b>sequencer</b> (name, mode, generation) and attaches it to every request it sends to other servers; those servers check it with the lock service (or cache the highest generation per lock and reject lower ones). For servers that do not understand sequencers, use a <b>lock-delay</b>: after a holder's session expires, nobody may acquire the lock for ~1 min, reducing (not eliminating) overlap.</p>
<p><b>Scale:</b> clients cache file data and lock state; the master sends <b>invalidations</b> before applying writes, so caches are consistent without polling. Proxies aggregate keep-alives for thousands of clients; namespaces can be partitioned across cells. Coarse-grained use (low lock churn) keeps write load small; fine-grained locking is pushed to application servers.</p>`,
      complexity: `<p>Writes: one consensus round each (rare); reads: served from master memory or client caches; keep-alive load ≈ clients / session interval (~4 000 RPC/s for 50 k clients), reduced by proxies.</p>`,
      followUps: ['Why did Chubby choose coarse-grained locks only?', 'How does the master lease allow local reads safely?', 'How is this similar to and different from etcd?']
    }
  });

  practice.push({
    title: 'Charge Exactly Once Through an External Payment Provider',
    level: 'Hard', tags: ['payments', 'idempotency', 'saga', 'reconciliation'], companies: ['Stripe', 'Adyen', 'Uber', 'Amazon'],
    statement: `<p>Design the payment path for a ride-hailing app: when a ride ends, charge the rider's card through an external PSP (payment service provider). Retries happen at every layer (mobile app, API gateway, internal queues, PSP timeouts). Guarantee no rider is charged twice and no completed ride goes unpaid, and keep an auditable ledger.</p>`,
    constraints: `<p>30 000 rides/min at peak; PSP p99 2 s, occasionally times out with unknown result; PSP supports idempotency keys for 24 h and a "get payment by reference" API.</p>`,
    example: `<p>PSP times out after actually charging ₹350; the worker retries → with a fresh request id the rider is ${H.c('r', 'charged ₹700')}; with the same idempotency key the PSP ${H.c('g', 'returns the original charge')}.</p>`,
    brute: { why: `<p>Naive: ride service calls the PSP synchronously at ride end and retries on error. Each layer's retry creates a new charge; a timeout with unknown result is treated as a failure and retried; a crash after charging but before recording leaves money taken with no record; there is no reconciliation to catch drift.</p>` },
    mcq: { q: 'The PSP call timed out. What should the payment worker do next?', options: ['Retry immediately with a new idempotency key', 'Mark the payment failed and ask the rider to pay again', 'Retry with the SAME idempotency key or query the PSP by reference to learn the real outcome', 'Charge a different card'], answer: 2, explain: 'A timeout is an unknown outcome. Re-using the same key (or querying by reference) converges on the true state without double charging.' },
    hints: [`<p>Hint 1: Create a payment intent row (state machine) with a deterministic id derived from ride id before talking to the PSP.</p>`, `<p>Hint 2: Use payment_id as the PSP idempotency key; states CREATED → PENDING → SUCCEEDED/FAILED/UNKNOWN; resolve UNKNOWN by querying.</p>`, `<p>Hint 3: Double-entry ledger + outbox for events + daily reconciliation against PSP settlement files.</p>`],
    solution: {
      approach: `<p><b>1. Intent first:</b> when a ride ends, the Ride service (via outbox) emits RideCompleted. The Payment service creates <code>payments(payment_id = hash(ride_id, 'fare'), ride_id UNIQUE, amount, state='CREATED')</code>. The unique ride_id makes every upstream retry collapse onto the same row.</p>
<p><b>2. Call the PSP idempotently:</b> worker moves the row to PENDING, calls the PSP with <code>Idempotency-Key = payment_id</code> and merchant reference = payment_id. Success → SUCCEEDED; definite decline → FAILED (trigger rider notification / fallback card flow). Timeout → <b>UNKNOWN</b>: retry with the same key (safe within 24 h) or query "get payment by reference" until resolved — never a new key.</p>
<p><b>3. Ledger:</b> on SUCCEEDED, in one local transaction, post double-entry rows (rider receivable −, cash-in-transit +) and an outbox event PaymentSucceeded (consumers: receipts, driver payouts — each idempotent by payment_id).</p>
<p><b>4. Recovery and reconciliation:</b> a sweeper re-drives rows stuck in PENDING/UNKNOWN; a daily job compares the ledger with the PSP settlement report — mismatches (charged but not recorded, recorded but not settled) raise alerts and automated fixes (record or refund). Refunds are compensations with their own idempotency keys.</p>
<p><b>Why not 2PC:</b> the PSP cannot prepare; the design instead combines a local state machine, idempotency keys, outbox and reconciliation — effectively-once charging, which is how Stripe, Uber and Airbnb describe their payment systems.</p>`,
      complexity: `<p>500 charges/s peak; per charge: 2 – 3 local DB writes + 1 PSP call; storage per payment ~1 KB plus ledger rows; reconciliation O(daily volume).</p>`,
      followUps: ['How do you handle the PSP idempotency window (24 h) for very delayed retries?', 'How would you split a payment across wallet balance and card?', 'What metrics catch a double-charge bug early?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'A Raft follower receives RequestVote for term 9 from a candidate whose last log entry is (term 8, index 40). Its own last entry is (term 8, index 42) and it has not voted in term 9. What does it do?', options: ['Grants the vote — it has not voted yet', 'Rejects — the candidate\'s log is shorter with the same last term, so it is less up-to-date', 'Grants the vote because term 9 &gt; 8', 'Ignores the message'], answer: 1, explain: 'Same last term → compare length. 40 &lt; 42, so the candidate may be missing committed entries; the follower refuses (but still adopts term 9).' });
  quiz.push({ q: 'Why are Raft election timeouts randomised?', options: ['To save CPU', 'To make split votes rare: usually one node times out clearly first and wins before others start', 'To hide the leader from attackers', 'Because clocks are unreliable'], answer: 1, explain: 'If all followers timed out together, they would all become candidates and split the vote repeatedly. Random timeouts break the symmetry.' });
  quiz.push({ q: 'When may a Raft leader mark a log entry as committed?', options: ['When it is written to the leader\'s disk', 'When all followers have it', 'When a majority stores it and it is from the leader\'s current term (older entries commit indirectly)', 'When the client acknowledges it'], answer: 2, explain: 'Majority replication plus the current-term rule avoids the "Figure 8" scenario in which an old-term entry on a majority could still be overwritten.' });
  quiz.push({ q: 'In Paxos, a proposer receives promises reporting accepted proposals (3, "A") and (5, "B"). Which value must it propose?', options: ['Its own value', '"A"', '"B" — the value of the highest-numbered accepted proposal', 'Any of them'], answer: 2, explain: 'Adopting the highest-numbered accepted value is the rule that preserves any value that may already have been chosen.' });
  quiz.push({ q: 'In ZooKeeper leader election, why does each candidate watch only its predecessor znode instead of the whole /election directory?', options: ['Watches on directories are not allowed', 'To avoid the herd effect: when a node disappears only one client is notified', 'To make the leader faster', 'Because sequential nodes cannot be listed'], answer: 1, explain: 'Watching the directory would wake every candidate on every change; predecessor watches wake exactly one.' });
  quiz.push({ q: 'A lock holder pauses for 40 s; its 30 s lease expires and another client takes the lock. What prevents the first client\'s late write from corrupting data?', options: ['Checking isLocked() before writing', 'A longer lease', 'A fencing token checked by the storage, which rejects tokens lower than the highest seen', 'Redlock'], answer: 2, explain: 'Only the resource can reliably reject the stale writer; client-side checks race with pauses and network delays.' });
  quiz.push({ q: 'In 2PC, a participant has voted YES and then loses contact with the coordinator. What can it do?', options: ['Abort after a timeout', 'Commit after a timeout', 'Nothing on its own — it must wait (in doubt), holding locks, until it learns the decision', 'Ask the client'], answer: 2, explain: 'After voting YES it promised to commit if told to; but the decision might be abort. It is blocked until it learns the outcome.' });
  quiz.push({ q: 'Why is 3PC rarely used in practice?', options: ['It needs more disks', 'Its non-blocking guarantee assumes bounded delays; under network partitions it can violate atomicity', 'It only supports two participants', 'It is patented'], answer: 1, explain: 'With partitions, one side may commit from PRE-COMMIT while the other aborts from PREPARED; replicated coordinators with 2PC are preferred.' });
  quiz.push({ q: 'In a saga, step 3 (charge payment) fails. Which compensations run, and in what order?', options: ['C3, C2, C1', 'C2 then C1', 'C1 then C2', 'None — sagas cannot roll back'], answer: 1, explain: 'The failed step never committed, so only completed steps are compensated, in reverse order: C2 then C1.' });
  quiz.push({ q: 'Which property do sagas give up compared with an ACID transaction?', options: ['Atomicity (eventually)', 'Isolation — other transactions can see intermediate states', 'Durability', 'Consistency of each local database'], answer: 1, explain: 'Each step commits locally and is visible immediately; countermeasures like semantic locks manage the resulting anomalies.' });
  quiz.push({ q: 'What problem does the transactional outbox solve?', options: ['Slow queries', 'The dual write: making a DB change and an event publication atomic by writing both into the same DB transaction', 'Consumer lag', 'Schema evolution'], answer: 1, explain: 'The event is stored as a row in the same transaction; a relay publishes it later, at least once.' });
  quiz.push({ q: 'Kafka exactly-once semantics (transactions) cover which of these?', options: ['Kafka writes + offset commits in a read-process-write loop', 'A Kafka write and a Postgres insert', 'Sending an email exactly once', 'Calling an external REST API exactly once'], answer: 0, explain: 'The transaction spans Kafka partitions (including offsets and state changelogs). External side effects still need idempotency.' });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({ level: 'I', q: 'What problem does consensus solve, and where do you meet it in real systems?', a: `<p>Consensus lets a group of machines agree on a single value or an ordered log of commands despite crashes and message delays, as long as a majority is alive. Applying the same log in the same order on each node gives a <b>replicated state machine</b> — identical state everywhere. You meet it in etcd (Kubernetes), ZooKeeper, Consul, Kafka KRaft, CockroachDB/TiDB/Spanner (one group per range), MongoDB replica-set elections and DynamoDB/Cosmos internals. Typical uses: leader election, metadata/config stores, locks, and strongly consistent replication.</p>`, followUps: ['Why do you need a majority rather than all nodes?', 'What does FLP say about consensus?'] });
  interview.push({ level: 'I', q: 'Walk me through a Raft leader election.', a: `<p>Followers expect heartbeats. When one hears nothing for its <b>randomised election timeout</b>, it becomes a candidate, increments its <b>term</b>, votes for itself (persisting votedFor), and sends RequestVote with its last log term and index. A node grants its vote if it has not voted in that term and the candidate's log is at least as up-to-date (last term, then length). With a majority the candidate becomes leader and sends heartbeats immediately. Split votes time out and retry with new random timeouts. Any node seeing a higher term steps down — that is how a recovered stale leader is demoted. One vote per node per term ⇒ at most one leader per term.</p>`, followUps: ['What are PreVote and CheckQuorum for?', 'Why must votedFor be persisted?', 'How do you choose timeouts across regions?'] });
  interview.push({ level: 'A', q: 'How does Raft guarantee that a committed entry is never lost?', a: `<p>An entry is committed once stored on a majority (and from the leader's current term). To become leader, a candidate needs votes from a majority, and any two majorities overlap in at least one node. That overlapping voter holds the committed entry and only votes for candidates whose log is at least as up-to-date as its own — so the winner must contain the entry (Leader Completeness). Leaders never overwrite their own logs, and the AppendEntries consistency check plus Log Matching ensure followers converge on the leader's log. The current-term commit rule closes the corner case where an old-term entry on a majority could still be overwritten.</p>`, followUps: ['Explain the Figure 8 scenario.', 'Why does a new leader append a no-op entry?'] });
  interview.push({ level: 'A', q: 'Raft vs Paxos — how are they related and why did Raft become popular?', a: `<p>Both rely on majority quorums intersecting. Single-decree Paxos chooses one value with prepare/promise and accept/accepted, numbered by proposal numbers; Multi-Paxos uses a stable leader to skip phase 1 for many log slots. Raft is essentially a specific, opinionated Multi-Paxos: terms ≈ ballots, RequestVote ≈ phase 1, AppendEntries ≈ phase 2. Raft adds strong-leader rules (logs flow only leader → follower, no holes), a defined membership-change protocol, and a clear decomposition (election, replication, safety). That made it easier to understand and implement correctly, so etcd, Consul, CockroachDB, TiKV and Kafka KRaft use it, while Google systems (Chubby, Spanner) use Paxos variants.</p>`, followUps: ['What is EPaxos good for?', 'What is the dueling-proposers problem?'] });
  interview.push({ level: 'I', q: 'When would you use ZooKeeper or etcd, and when not?', a: `<p>Use them for <b>small, critical, strongly consistent metadata</b>: leader election, service discovery with leases/ephemeral nodes, configuration with watches, shard maps, distributed locks and barriers. They give linearizable writes, watches and session/lease liveness. Do not use them as a general database: data must stay small (etcd ~2 – 8 GB), every write is a consensus round (thousands per second, not millions), and huge watcher counts or big values hurt. If your system already has a strongly consistent database (Postgres, Spanner, DynamoDB conditional writes) you may not need a separate coordination service at all.</p>`, followUps: ['Compare ZooKeeper watches with etcd watches.', 'Why did Kafka remove ZooKeeper?'] });
  interview.push({ level: 'A', q: 'Design a distributed lock. Is a Redis lock enough?', a: `<p>First ask whether the lock is for <b>efficiency</b> (duplicate work is merely wasteful) or <b>correctness</b> (two holders corrupt data). For efficiency, Redis <code>SET key owner NX PX ttl</code> with an owner-checked release is fine. For correctness, leases alone are unsafe: a holder can pause (GC, VM migration) past its lease, and another client acquires the lock. The fix is a consensus-backed lock (etcd/ZooKeeper/DB) that issues a monotonically increasing <b>fencing token</b> on each acquisition, and a resource that rejects writes carrying a token lower than the highest seen. Redlock lacks fencing and depends on timing assumptions, so I would not use it for correctness. Often the best answer is to avoid the lock: conditional updates, idempotency keys, or a single-writer partition.</p>`, followUps: ['What if the protected resource cannot check tokens?', 'Summarise the Kleppmann vs antirez debate.'] });
  interview.push({ level: 'I', q: 'Explain two-phase commit and its main weakness.', a: `<p>A coordinator asks each participant to PREPARE; participants make the work durable, keep locks and vote YES or NO. If all vote YES, the coordinator durably logs COMMIT (the commit point) and tells everyone; otherwise ABORT. It guarantees atomicity across resources. Weaknesses: it is <b>blocking</b> — if the coordinator crashes after participants voted YES, they are in doubt and must hold locks until it recovers; it adds two round trips and many fsyncs; all participants must support prepare (HTTP APIs do not); and locks span the whole protocol, limiting throughput on hot rows. Production systems (Spanner, CockroachDB) replicate the coordinator and participants with consensus to remove the blocking.</p>`, followUps: ['What is presumed abort?', 'How does 3PC try to fix blocking and why does it fail under partitions?'] });
  interview.push({ level: 'I', q: 'What is a saga, and orchestration vs choreography?', a: `<p>A saga breaks a business transaction spanning services into local transactions, each with a compensating action; on failure, completed steps are compensated in reverse order. <b>Orchestration</b>: a central state machine (Temporal, Step Functions, a saga table) issues commands and tracks progress — visible, easier to debug and extend, at the cost of a central component. <b>Choreography</b>: services react to each other's events — loosely coupled, fine for 2 – 3 steps, but the flow becomes implicit and hard to trace. Sagas sacrifice isolation, so you design semantic locks (PENDING states), order steps by reversibility (compensatable → pivot → retryable), and make every step and compensation idempotent.</p>`, followUps: ['What is a pivot transaction?', 'What happens if a compensation fails?'] });
  interview.push({ level: 'A', q: 'For an e-commerce checkout across services, would you choose 2PC or a saga? Why?', a: `<p>A saga. The flow involves services owned by different teams and external APIs (payment provider, courier) that cannot participate in a prepare phase; holding inventory locks during seconds-long external calls would kill throughput on popular items; and a 2PC coordinator would couple every team's availability. Checkout tolerates brief visible intermediate states (order PENDING), which a saga handles with semantic locks. I would orchestrate: create order PENDING → reserve stock → authorize payment → book shipment → capture payment (pivot) → confirm. Each step is idempotent and sent via an outbox; compensations release stock and void the authorization. I would use 2PC only inside one database platform that supports it natively (e.g. order and inventory tables in the same distributed SQL database).</p>`, followUps: ['How do you avoid reserved stock leaking forever?', 'How does the user see progress?'] });
  interview.push({ level: 'I', q: 'What is the dual-write problem, and how does the transactional outbox solve it?', a: `<p>A service that writes to its database and publishes an event to a broker performs two separate operations with no shared transaction; a crash between them leaves either a DB change without an event or an event without a DB change. The outbox pattern writes the event as a row in an <code>outbox</code> table in the <b>same local transaction</b> as the business change, so both commit or neither does. A relay (polling with SKIP LOCKED, or CDC such as Debezium tailing the WAL/binlog) publishes the rows to the broker and marks them sent. Because the relay can publish and crash before marking, delivery is at-least-once, so consumers must be idempotent (an inbox/processed-ids table).</p>`, followUps: ['Polling relay vs CDC: trade-offs?', 'How do you preserve ordering per aggregate?'] });
  interview.push({ level: 'A', q: 'Is exactly-once delivery possible? What does Kafka mean by exactly-once?', a: `<p>Exactly-once <b>delivery</b> over an unreliable network is impossible in general: a sender without an ack cannot distinguish a lost message from a lost ack (Two Generals), so it either retries (duplicates) or not (loss). What we build is <b>effectively-once processing</b>: at-least-once delivery plus idempotent effects (idempotency keys, dedup tables, conditional writes). Kafka's EOS = idempotent producer (sequence numbers per partition) + transactions that atomically write output records, state changelogs and consumer offsets, with read_committed consumers. That makes a Kafka-to-Kafka read-process-write pipeline exactly-once, but any side effect outside Kafka (DB write, email, HTTP call) is outside the transaction and needs its own idempotency.</p>`, followUps: ['How are zombie producers fenced in Kafka?', 'How does Flink achieve end-to-end exactly-once?'] });
  interview.push({ level: 'B', q: 'Why do consensus clusters usually have 3 or 5 nodes, not 4 or 10?', a: `<p>A cluster of N nodes needs a majority ⌊N/2⌋ + 1 to make progress and tolerates ⌊(N − 1)/2⌋ failures. 3 tolerates 1, 4 still tolerates only 1 (majority 3), 5 tolerates 2. Even sizes add cost and an extra ack per write without more tolerance, and in a 2/2 partition no side has a majority. Larger clusters (7+) tolerate more failures but every write waits for more acks and leader bandwidth grows, so 3 or 5 voters is the norm; extra read capacity comes from non-voting learners/observers.</p>`, followUps: ['How would you place 5 nodes across 3 zones?', 'What is a learner in etcd?'] });
  interview.push({ level: 'E', q: 'An AI agent platform runs many agent workers that pick tasks, call external tools (send email, create tickets, charge cards) and may be restarted at any time. How do you make task execution safe?', a: `<p>Treat it as a distributed-transactions problem. (1) <b>Task ownership</b> via leases in a consistent store with a fencing token per claim; tool calls and result writes carry the token so a paused/restarted worker cannot commit stale results. (2) Every side-effecting tool call gets an <b>idempotency key</b> = taskId + stepId, so retries (model re-planning, timeouts) do not duplicate emails or charges. (3) Multi-step tasks are <b>sagas</b>: record each step durably (workflow engine or step table), define compensations (cancel ticket, refund), order irreversible steps last, and require human approval before the pivot for high-risk actions. (4) Results and notifications leave through an <b>outbox</b>; consumers dedupe. (5) Observability: per-task timeline, stuck-task sweeper, compensation and duplicate-suppression metrics. "Exactly once" is achieved as at-least-once execution + idempotent, fenced effects.</p>`, followUps: ['How long should idempotency keys be retained?', 'Where would you put human-in-the-loop approval?'] });

  registerModule({
    id: 'hld11',
    title: 'Consensus, Coordination & Distributed Transactions',
    intro: `<p>How do five machines agree on <b>one truth</b> when any of them can crash and messages can be late? And how do you update data in <b>several services</b> without leaving a half-finished mess when something fails in the middle? This module answers both questions in plain English with animated visualizers.</p>
<p>You will watch <b>Raft</b> elect a leader (with terms, votes and split votes) and replicate a log until entries commit on a majority; get the one-sentence intuition behind <b>Paxos</b>; use <b>ZooKeeper/etcd</b> for leader election, service discovery and configuration; build <b>distributed locks</b> that stay safe through GC pauses using <b>fencing tokens</b>; see <b>two-phase commit</b> block when its coordinator crashes and why <b>3PC</b> is not the fix; run <b>sagas</b> whose compensations roll back in reverse; kill the dual write with the <b>transactional outbox</b>; and separate the <b>exactly-once</b> myth from what is really achievable.</p>
<p>These are the topics that separate senior system-design answers from junior ones: interviewers probe "what happens if the leader dies?", "is your lock safe?", "2PC or saga?" and "how do you guarantee exactly-once?" — you will be able to answer each with a mechanism, a failure walk-through and a trade-off.</p>`,
    goals: [
      'Walk through a Raft leader election and log replication step by step, including split votes, stale leaders and follower repair',
      'Explain Paxos prepare/promise/accept and why overlapping majorities make a chosen value permanent',
      'Use ZooKeeper/etcd recipes (ephemeral sequential nodes, leases, watches, CAS) for leader election, discovery and config',
      'Design distributed locks that are safe under pauses and partitions using fencing tokens — or avoid locks entirely',
      'Choose between 2PC and sagas for a given flow, define compensations and the pivot, and explain 2PC blocking and 3PC limits',
      'Implement reliable event publishing with the transactional outbox and achieve effectively-once processing with idempotency'
    ],
    prereqs: `<p>HLD 8 (Messaging &amp; Streaming — Kafka, delivery guarantees) and HLD 10 (Distributed Systems Theory — CAP, quorums, consistency models). Comfort with database transactions (ACID) from HLD 5.</p>`,
    hours: 14,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
