(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for the visualizers ---------- */
  function nd(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function gp(label, nodes, edges, hl, ehl, tags, height) {
    return { type: 'graph', label: label, directed: true, height: height || 70, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }
  function ints(str, def, lo, hi, what) {
    var t = String(str === undefined ? '' : str).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    if (!t.length) t = def.slice();
    if (t.some(function (x) { return isNaN(x) || x !== Math.floor(x); })) throw new Error(what);
    t.forEach(function (x) { if (x < lo || x > hi) throw new Error(what + ' (each value between ' + lo + ' and ' + hi + ')'); });
    return t;
  }

  /* ================= TOPIC 1: WhatsApp ================= */
  topics.push({
    title: 'WhatsApp: Real-Time Messaging, Delivery & Read Receipts',
    analogy: `<p>Picture a <b>post office that also has a phone line to every customer</b>. When Alice wants to tell Bob something, she doesn't mail a letter and hope: she calls the post office (a permanent open line — the WebSocket). The clerk writes the message in a ledger first (so it can never be lost), then checks "is Bob's line open right now?" If yes, the clerk speaks it into Bob's ear immediately. If no, the clerk keeps the note in Bob's pigeonhole and rings his doorbell (a push notification). The moment Bob picks up, the clerk hands over everything waiting, in order.</p>
      <p>The little ticks on the screen are just the clerk telling Alice: "I wrote it down" (one tick), "I handed it to Bob's phone" (two ticks), "Bob looked at it" (blue ticks).</p>`,
    explain: `<p><b>The job:</b> let two people (or a group) exchange short messages with <b>very low delay</b>, never lose a message, keep them <b>in order</b>, and show who received and read what. Over 2 billion people use WhatsApp, so the design must handle <b>millions of messages every second</b>.</p>
      <h4>Step 1 — Requirements</h4>
      <ul>
        <li><b>Functional:</b> 1:1 chat, group chat (up to ~1,000 members), send text and media, delivery + read receipts, "last seen / online", messages delivered even if the receiver is offline, multiple devices per user.</li>
        <li><b>Non-functional:</b> latency under ~200 ms for online users, <b>no message lost</b> (durability), per-chat ordering, high availability, end-to-end encryption (the server must not be able to read content).</li>
        <li><b>Out of scope (say it out loud):</b> voice/video calls, status stories, payments.</li>
      </ul>
      <h4>Step 2 — Back-of-envelope</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Messages per day', '2B users, ~50 msgs each sent', '~100 billion / day'],
        ['Average QPS', '100B ÷ 86,400 s', '~1.2 million msgs/s (peak ≈ 2–3×)'],
        ['Concurrent connections', '~15% of users online at once', '~300 million WebSockets'],
        ['Gateway servers', '~500K–1M connections per tuned box', '~300–600 boxes (add headroom: 1,000)'],
        ['Text payload', '~100 bytes + overhead ≈ 200 B', '~20 TB/day through the system'],
        ['Stored at rest', 'Only <i>undelivered</i> messages kept on server', 'Small: a queue, not an archive']
      ])}
      <p>Key insight: because WhatsApp stores a message on the server only until it is delivered, <b>storage is tiny — connections are the real bottleneck</b>.</p>
      <h4>Step 3 — APIs</h4>
      <p>Chat runs over a long-lived <b>WebSocket</b> (a two-way pipe that stays open, so the server can push to the phone without being asked). Typical frames:</p>
      <ul>
        <li><code>SEND {client_msg_id, chat_id, to, ciphertext, type}</code> → server replies <code>ACK {client_msg_id, server_msg_id, seq}</code></li>
        <li><code>DELIVER {server_msg_id, from, chat_id, seq, ciphertext}</code> (server → receiver)</li>
        <li><code>RECEIPT {server_msg_id, status: delivered | read}</code> (receiver → server → sender)</li>
        <li>Plain REST for the rest: <code>POST /media/upload-url</code>, <code>POST /groups</code>, <code>GET /sync?since=seq</code>.</li>
      </ul>
      <h4>Step 4 — Data model</h4>
      ${H.table(['Store', 'Key → value', 'Why this store'], [
        ['Session store (Redis)', '<code>user_id → gateway_id</code> (+ device)', 'Super-fast "where is Bob connected?" lookup; TTL refreshed by heartbeats'],
        ['Offline inbox (Cassandra / HBase / ScyllaDB)', '<code>(user_id, seq) → message</code>', 'Append-heavy, partitioned by user, cheap to scan "everything after seq N"'],
        ['Chat/group metadata (SQL or Cassandra)', '<code>group_id → members, admins</code>', 'Small, relational-ish, read a lot'],
        ['Media (object storage + CDN)', '<code>media_id → blob</code>', 'Chat carries only a pointer + decryption key']
      ])}
      <h4>Step 5 — High-level architecture</h4>
      <p>Phone ⇄ <b>WebSocket gateway</b> (just holds connections, dumb and stateless apart from the socket) ⇄ <b>Chat service</b> (brain: persist, look up recipient, route) ⇄ <b>Session store</b>, <b>message store</b>, <b>push service</b> (APNs/FCM), plus an <b>object store</b> for media. Watch it run in the visualizer below.</p>`,
    clues: [
      '"Design WhatsApp / Messenger / Slack DM" → persistent connection + store-and-forward',
      '"Messages must not be lost" → write to durable store <i>before</i> acking the sender',
      '"Show sent / delivered / read" → receipts are just small messages flowing the opposite way',
      '"Works when the receiver is offline" → per-user inbox + push notification + resync on reconnect',
      '"Millions of concurrent users" → connection count (not storage) is the bottleneck; sticky gateway + session map',
      '"Messages must appear in order" → per-chat (or per-user-inbox) sequence numbers, never wall-clock time'
    ],
    code: [
      { lang: 'python', title: 'Message state machine + offline inbox (runnable)', run: true, code: `# A tiny in-memory model of WhatsApp's store-and-forward core.
# Status only ever moves FORWARD: SENT -> DELIVERED -> READ.
ORDER = {"PENDING": 0, "SENT": 1, "DELIVERED": 2, "READ": 3}
TICKS = {"PENDING": "clock", "SENT": "one tick", "DELIVERED": "two ticks", "READ": "two BLUE ticks"}

class Server:
    def __init__(self):
        self.online = {}      # user -> True when a WebSocket is open
        self.inbox = {}       # user -> list of undelivered (seq, msg_id, text)
        self.seq = {}         # user -> last sequence number handed out
        self.seen = set()     # client_msg_ids already accepted (idempotency)
        self.status = {}      # msg_id -> status

    def send(self, msg_id, to, text):
        if msg_id in self.seen:                      # sender retried after a lost ACK
            return "duplicate ignored (idempotent)"
        self.seen.add(msg_id)
        self.seq[to] = self.seq.get(to, 0) + 1
        self.inbox.setdefault(to, []).append((self.seq[to], msg_id, text))   # durable write FIRST
        self.advance(msg_id, "SENT")                 # now (and only now) tell the sender: one tick
        if self.online.get(to):
            return self.deliver(to)
        return "receiver offline -> stored + push notification"

    def deliver(self, user):
        out = []
        for seq, msg_id, text in sorted(self.inbox.get(user, [])):   # ordered by seq
            out.append(text)
            self.advance(msg_id, "DELIVERED")        # receiver's phone acked
        self.inbox[user] = []                        # safe to drop only AFTER acks
        return "delivered " + str(out)

    def advance(self, msg_id, new):
        if ORDER[new] > ORDER.get(self.status.get(msg_id, "PENDING"), 0):
            self.status[msg_id] = new                # ignore late/out-of-order receipts

s = Server()
print(s.send("m1", "bob", "hi"))                     # bob offline
print(s.send("m1", "bob", "hi"))                     # retry -> deduped
print(s.send("m2", "bob", "you there?"))
s.online["bob"] = True                               # Bob opens the app
print(s.deliver("bob"))
s.advance("m1", "READ")                              # Bob opens the chat
s.advance("m1", "DELIVERED")                         # a late receipt arrives: ignored
for m, st in sorted(s.status.items()):
    print(m, st, "->", TICKS[st])` },
      { lang: 'java', title: 'Gateway routing table (Java sketch)', code: `import java.util.*;
import java.util.concurrent.*;

// The gateway keeps a map of open sockets; the chat service keeps a
// (shared) map user -> gateway so ANY chat server can find the right gateway.
class SessionRegistry {
    private final Map<String, String> userToGateway = new ConcurrentHashMap<>();
    private final Map<String, Long> lastHeartbeat = new ConcurrentHashMap<>();
    private static final long TTL_MS = 30_000;       // no heartbeat for 30 s => treat as offline

    void connect(String user, String gatewayId, long now) {
        userToGateway.put(user, gatewayId);
        lastHeartbeat.put(user, now);
    }
    void heartbeat(String user, long now) { lastHeartbeat.put(user, now); }

    // null means "offline: store in inbox and send a push notification"
    String route(String user, long now) {
        Long hb = lastHeartbeat.get(user);
        if (hb == null || now - hb > TTL_MS) return null;
        return userToGateway.get(user);
    }

    public static void main(String[] args) {
        SessionRegistry r = new SessionRegistry();
        r.connect("bob", "gw-17", 0);
        System.out.println(r.route("bob", 10_000));    // gw-17
        System.out.println(r.route("bob", 60_000));    // null -> offline path
    }
}` }
    ],
    codeTitle: ['Store-and-forward core (Python, runnable)', 'Session registry (Java)'],
    viz: [
      {
        title: 'Message flow through the architecture (online vs offline receiver)',
        input: 'online',
        inputLabel: 'Is Bob online? type: online or offline',
        gen: function (input) {
          var mode = String(input || 'online').trim().toLowerCase();
          if (mode !== 'online' && mode !== 'offline') throw new Error('Type either "online" or "offline"');
          var off = mode === 'offline';
          var nodes = [nd('A', 'Alice phone', 10, 10), nd('GW1', 'WS Gateway 1', 36, 10), nd('CS', 'Chat Service', 63, 10), nd('DB', 'Message DB', 90, 10),
            nd('SS', 'Session Store', 63, 36), nd('GW2', 'WS Gateway 2', 36, 62), nd('B', 'Bob phone', 10, 62), nd('OQ', 'Offline Inbox', 63, 62), nd('PU', 'Push APNs/FCM', 90, 62)];
          var edges = [['A', 'GW1', 'SEND'], ['GW1', 'CS'], ['CS', 'DB', 'save'], ['CS', 'SS', 'lookup Bob'], ['CS', 'GW2', 'deliver'], ['GW2', 'B'], ['CS', 'OQ', 'enqueue'], ['OQ', 'PU', 'wake']];
          var F = [];
          function add(narr, hl, ehl, tags, extra) {
            F.push({ narr: narr, parts: [gp('Chat architecture (' + (off ? 'Bob offline' : 'Bob online') + ')', nodes, edges, hl, ehl, tags), { type: 'vars', label: 'Message m-1001 (Alice → Bob)', vals: extra }] });
          }
          add('Alice types "hello" and hits send. Her phone makes a <b>client message id</b> (a random id) so a retry can never create a duplicate. The bubble shows a clock: not sent yet.', { A: 'cur' }, {}, { A: 'clock' }, { status: 'PENDING', ticks: 'clock', bob: mode });
          add('The phone pushes <b>SEND</b> down its already-open WebSocket to Gateway 1. No new connection, no handshake: that is why chat feels instant.', { A: 'done', GW1: 'cur' }, { 'A-GW1': 'ok' }, { A: 'clock' }, { status: 'PENDING', ticks: 'clock', bob: mode });
          add('The gateway is deliberately dumb: it just forwards the frame to the <b>Chat Service</b>, which holds the logic.', { GW1: 'done', CS: 'cur' }, { 'GW1-CS': 'ok' }, {}, { status: 'PENDING', ticks: 'clock', bob: mode });
          add('Chat Service <b>saves the message durably first</b> (to Bob\'s inbox/message store). Only after the write succeeds do we tell Alice anything — otherwise "sent" could be a lie.', { CS: 'cur', DB: 'ok' }, { 'CS-DB': 'ok' }, { A: '✓ sent' }, { status: 'SENT', ticks: 'one tick ✓', bob: mode });
          add('Now ask the <b>Session Store</b>: "which gateway is Bob connected to?" It is a simple key-value lookup <code>bob → gw2</code> (or "not found").', { CS: 'cur', SS: 'sel' }, { 'CS-SS': 'ok' }, { A: '✓ sent', SS: off ? 'bob: none' : 'bob → GW2' }, { status: 'SENT', ticks: 'one tick ✓', bob: mode });
          if (!off) {
            add('Bob is connected to Gateway 2, so the Chat Service sends <b>DELIVER</b> straight to that gateway.', { CS: 'done', GW2: 'cur' }, { 'CS-GW2': 'ok' }, { A: '✓ sent' }, { status: 'SENT', ticks: 'one tick ✓', bob: mode });
            add('Gateway 2 pushes the frame down Bob\'s socket. His phone decrypts it and replies with a delivery receipt. The server forwards that back to Alice: <b>two ticks</b>.', { GW2: 'done', B: 'ok' }, { 'GW2-B': 'ok' }, { A: '✓✓ delivered', B: 'got it' }, { status: 'DELIVERED', ticks: 'two ticks ✓✓', bob: mode });
            add('Bob opens the chat. His app sends a <b>read receipt</b> (just another tiny message going the opposite way). Alice\'s ticks turn <span class="c-b">blue</span>. If Bob disabled read receipts, this step simply never happens.', { B: 'sel' }, {}, { A: '✓✓ blue (read)', B: 'chat open' }, { status: 'READ', ticks: 'two BLUE ticks', bob: mode });
          } else {
            add('Nothing found: <b>Bob is offline</b>. The message is already safe in his inbox. Alice keeps seeing one tick — that is correct and honest.', { CS: 'cur', OQ: 'ok' }, { 'CS-OQ': 'ok' }, { A: '✓ sent', OQ: '1 waiting' }, { status: 'SENT', ticks: 'one tick ✓', bob: mode });
            add('The Chat Service asks the <b>Push service</b> to send a notification through Apple (APNs) or Google (FCM). The push says only "new message" — the real content stays end-to-end encrypted.', { OQ: 'done', PU: 'cur' }, { 'OQ-PU': 'ok' }, { A: '✓ sent', OQ: '1 waiting' }, { status: 'SENT', ticks: 'one tick ✓', bob: mode });
            add('Bob\'s phone wakes up, opens a WebSocket to Gateway 2 and says "my last seq was 41". The server <b>drains the inbox in order</b> over that socket.', { GW2: 'cur', B: 'ok' }, { 'GW2-B': 'ok' }, { B: 'reconnected', OQ: 'draining' }, { status: 'SENT → DELIVERED', ticks: 'about to flip', bob: 'reconnected' });
            add('Bob\'s phone acks; the inbox row is deleted; Alice finally sees <b>two ticks</b>. Because delivery is at-least-once, the phone drops any message id it has already shown.', { B: 'sel' }, {}, { A: '✓✓ delivered', B: 'acked' }, { status: 'DELIVERED', ticks: 'two ticks ✓✓', bob: 'online' });
          }
          return F;
        }
      },
      {
        title: 'Reconnect and drain the offline inbox in order',
        input: '5 2',
        inputLabel: 'Messages stored while offline (1-8), and the last seq Bob already acked (0 up to that count)',
        gen: function (input) {
          var v = ints(input, [5, 2], 0, 8, 'Enter two whole numbers like: 5 2');
          var total = v[0], last = v[1];
          if (total < 1) throw new Error('Need at least 1 stored message');
          if (last > total) throw new Error('Last acked seq cannot exceed the number of messages');
          var log = [], i;
          for (i = 1; i <= total; i++) log.push('seq ' + i);
          var F = [], delivered = log.slice(0, last), pending = log.slice(last);
          F.push({ narr: 'Bob\'s inbox on the server holds <b>' + total + '</b> messages numbered 1..' + total + '. Bob\'s phone reconnects and says: "my last acked seq is <b>' + last + '</b>".', parts: [
            { type: 'queue', label: 'Server inbox for Bob (front = oldest)', items: log.slice(), frontLabel: 'oldest', backLabel: 'newest', hl: (function () { var h = {}; for (var k = 0; k < last; k++) h[k] = 'done'; return h; })() },
            { type: 'vars', vals: { lastAckedByBob: last, toSend: total - last } }] });
          F.push({ narr: last > 0 ? 'Messages 1..' + last + ' are already on Bob\'s phone, so the server <b>skips them</b>. Remember: resend is allowed (at-least-once), but re-showing is not.' : 'Bob has acked nothing, so everything must be sent.', parts: [
            { type: 'queue', label: 'Server inbox for Bob', items: log.slice(), hl: (function () { var h = {}; for (var k = 0; k < last; k++) h[k] = 'done'; for (var q = last; q < total; q++) h[q] = 'cur'; return h; })() },
            { type: 'array', label: 'Bob\'s phone shows', values: delivered.length ? delivered : ['(empty)'] }] });
          var shown = delivered.slice();
          for (i = last; i < total; i++) {
            shown.push(log[i]);
            (function (idx, snapshot) {
              var h = {}; for (var k = 0; k <= idx; k++) h[k] = k === idx ? 'ok' : 'done';
              F.push({ narr: 'Server sends <b>' + log[idx] + '</b> in order. Bob\'s phone shows it and acks; the server can now delete it from the inbox. Receipt "delivered" travels back to the sender.', parts: [
                { type: 'queue', label: 'Server inbox for Bob', items: log.slice(), hl: h },
                { type: 'array', label: 'Bob\'s phone shows', values: snapshot, hl: (function () { var o = {}; o[snapshot.length - 1] = 'ok'; return o; })() },
                { type: 'vars', vals: { lastAckedByBob: idx + 1, remaining: total - idx - 1 }, hl: { lastAckedByBob: 'ok' } }] });
            })(i, shown.slice());
          }
          F.push({ narr: 'Inbox is empty and Bob is "caught up". If a network blip loses an ack, the server just sends that message again and the phone ignores it because the seq/id is already known. This is <b>at-least-once delivery + dedupe = effectively exactly-once to the user</b>.', parts: [
            { type: 'queue', label: 'Server inbox for Bob', items: [], frontLabel: 'oldest', backLabel: 'newest' },
            { type: 'array', label: 'Bob\'s phone shows', values: log.slice(), hl: (function () { var o = {}; for (var k = last; k < total; k++) o[k] = 'ok'; return o; })() }] });
          return F;
        }
      }
    ],
    examples: [
      {
        title: 'Worked example — the numbers behind "1 million connections per box"',
        html: `<p>A WebSocket is mostly <b>idle</b>: it needs a few KB of memory (socket buffers + a small state object) and almost no CPU until a message arrives.</p>
          ${H.table(['Step', 'Math', 'Result'], [
            ['Memory per connection', '~10 KB (kernel buffers + app state)', '10 KB'],
            ['1M connections', '1,000,000 × 10 KB', '~10 GB RAM — fits on one 64 GB machine'],
            ['Messages per connection', 'Each user sends ~50 / day', '≈ 1 message every 30 minutes'],
            ['Box throughput', '1M conns × (1 msg / 1,800 s)', '≈ 550 msgs/s per box — trivial']
          ])}
          <p>So a gateway is limited by <b>file descriptors, memory, and kernel tuning</b>, not CPU. That is why WhatsApp famously chose Erlang (millions of cheap lightweight processes) and why modern designs use event-loop servers (Netty, Go, Rust).</p>`
      },
      {
        title: 'Worked example — what each tick really means',
        html: `${H.table(['What Alice sees', 'Who confirmed it', 'What it guarantees'], [
          ['Clock', 'Nobody yet', 'Only on Alice\'s phone; might still be retried'],
          ['✓ one tick', 'The <b>server</b>', 'Message is durably stored; will be delivered eventually'],
          ['✓✓ two ticks', 'Bob\'s <b>phone</b>', 'Bob\'s device has the ciphertext (he may not have seen it)'],
          ['<span class="c-b">✓✓ blue</span>', 'Bob\'s <b>app</b>', 'The chat was opened on screen (can be disabled in settings)']
        ])}
        <p>Each upgrade is a tiny message flowing <b>backwards</b> along the same path. Because statuses only move forward (SENT → DELIVERED → READ), a late or duplicated receipt can never turn two ticks back into one.</p>`
      },
      {
        title: 'Worked example — group chat of 500 people',
        html: `<p>Alice posts once in a group with 500 members. The server must create <b>500 deliveries</b> — this is <b>fan-out</b>.</p>
          <ol>
            <li>Alice sends <b>one</b> SEND frame (the group message). For end-to-end encryption the client encrypts per recipient device (Sender Keys make this cheap: encrypt once with a group key).</li>
            <li>Chat Service looks up the member list: 500 user ids.</li>
            <li>For each member: write one row to that member's inbox <code>(user_id, seq)</code> — 500 writes, parallelised in batches.</li>
            <li>Online members get a DELIVER frame at once; offline ones get a push.</li>
            <li>Alice sees two ticks only when <b>all</b> members have received it (read receipts shown per member in the info screen).</li>
          </ol>
          <p>Cost: 1 incoming message → ~500 writes. Reads are cheap, writes are not — which is why groups are capped at about 1,000 members.</p>`
      },
      {
        title: 'Worked example — ordering with sequence numbers, not clocks',
        html: `<p>Alice's phone clock says 10:00:05 and Carol's says 10:00:01 (clocks drift!). If we sort by timestamp, Carol's reply could appear <i>before</i> the message she replied to.</p>
          <p>Fix: the server stamps each message with a <b>monotonic sequence number per chat</b> (or per recipient inbox) when it writes it. Every client sorts by <code>seq</code>. Timestamps are shown to humans but never used for ordering.</p>
          ${H.table(['Arrives at server', 'Client time', 'Server seq', 'Shown order'], [['Alice: "Lunch?"', '10:00:05', '17', '1st'], ['Carol: "Sure!"', '10:00:01', '18', '2nd']])}`
      }
    ],
    deepDive: `<h4>🟣 Deep dive 1 — Why WebSockets (and what about HTTP polling?)</h4>
      <p><b>Short polling</b> ("anything new?" every few seconds) wastes millions of empty requests and adds up to a poll-interval of delay. <b>Long polling</b> holds a request open until data arrives — works, but every message costs a fresh request/response with headers (~500 B+). A <b>WebSocket</b> upgrades one HTTP connection into a persistent, full-duplex pipe with ~2–14 bytes of framing per message. WhatsApp itself uses a custom binary protocol (derived from XMPP, running over TCP with Noise-protocol encryption) for even smaller frames on poor networks.</p>
      <h4>🟣 Deep dive 2 — Connection management at scale</h4>
      <ul>
        <li><b>Stateful tier:</b> gateways are the one place where servers are NOT interchangeable (a user is pinned to the box that holds their socket). Everything else — chat service, stores — stays stateless.</li>
        <li><b>Load balancing:</b> an L4 balancer picks a gateway at connect time; after that the TCP connection sticks. Use <b>least-connections</b>, not round-robin, so long-lived sockets spread evenly.</li>
        <li><b>Heartbeats:</b> clients ping every ~25–30 s; the session-store TTL expires dead entries so a crashed gateway doesn't strand users. Mobile NATs silently drop idle TCP, so heartbeats double as keep-alives.</li>
        <li><b>Deploys &amp; the reconnect storm:</b> restarting 1,000 gateways drops 300M sockets at once and they all reconnect together. Use <b>drain + jittered reconnect backoff</b> (random delay) or you DDoS your own login path.</li>
        <li><b>Crossing gateways:</b> the Chat Service finds the recipient's gateway through the session store and calls it over an internal RPC or pub/sub channel (e.g. a topic per gateway on Kafka/NATS/Redis pub-sub).</li>
      </ul>
      <h4>🟣 Deep dive 3 — Delivery guarantees</h4>
      <p>Networks lose packets and acks, so exactly-once delivery is a myth; we build <b>at-least-once + idempotent receivers</b>. The sender keeps retrying with the same <code>client_msg_id</code> until it gets the server ACK; the server de-duplicates on that id (a short-TTL set per user). The server keeps a message in the recipient inbox until it gets the device ACK; the device de-duplicates on <code>server_msg_id</code>. Result: duplicates may travel the wire but are invisible to the human.</p>
      <h4>🟣 Deep dive 4 — Receipts, presence and "last seen"</h4>
      <p>Receipts add 2–3 extra tiny messages per chat message — often more <i>events</i> than the content itself — so they are batched (a "read up to seq 57" receipt covers everything before it). <b>Presence</b> ("online") would be 300M users × every contact: don't broadcast changes to everyone. Instead publish presence <b>lazily</b>: only to contacts who currently have that chat open, and have the opener <i>subscribe</i> briefly. "Last seen" is just a timestamp updated at most once per minute — nobody needs second-accuracy.</p>
      <h4>🟣 Deep dive 5 — Multi-device &amp; end-to-end encryption</h4>
      <p>With the Signal protocol, each device has its own keys. A message to Bob is encrypted separately for each of his devices (phone, laptop, tablet) and each gets its own inbox entry. The server sees only ciphertext + routing metadata (who → whom, size, time). New devices cannot read old history unless a user explicitly transfers it. This is why "fan-out" counts <b>devices</b>, not people.</p>
      <h4>🟣 Deep dive 6 — Failure modes to mention</h4>
      <ul>
        <li><b>Gateway crash:</b> sockets drop → clients reconnect elsewhere → resync from last seq. Nothing was acked-but-unsaved, so nothing is lost.</li>
        <li><b>Message DB partition lost:</b> inbox is replicated (RF=3, quorum writes) so we ack the sender only after a quorum write.</li>
        <li><b>Hot group:</b> a 1,000-member group chat with constant chatter → shard fan-out workers by group id; rate-limit spammers.</li>
        <li><b>Trade-off table:</b> store-and-forward (privacy, cheap storage, but no server-side history/search) vs. server-side history (Slack/Telegram cloud chats: searchable, multi-device sync trivial, but the server needs plaintext or key escrow).</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> Chat apps now embed assistants (message summaries, smart replies, "catch me up" on a 500-message group, translation, voice-note transcription). The architectural twist is <b>end-to-end encryption</b>: a cloud AI cannot read ciphertext, so products either run small models <b>on-device</b>, or use private/confidential-compute enclaves where the user explicitly opts in per request. Your design answer should name where the plaintext lives and who can see it.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>list 10 failure scenarios for a WebSocket chat system (gateway crash, duplicate ack, clock skew, reconnect storm...) and what the client observes in each</code>; or have it generate a load-test script that opens 50K sockets. Use it to play interviewer: "poke holes in my delivery guarantee".</p>
      <p><b>Where AI goes wrong:</b> it often claims "use Kafka as the inbox" without noting that Kafka topics-per-user don't scale to billions of users; it casually promises "exactly-once delivery"; it forgets that mobile OSes kill background sockets, so push notifications are mandatory. <b>What you must still own:</b> the ack-after-durable-write rule, per-chat ordering with sequence numbers, and the connection-bound (not storage-bound) capacity math.</p>`,
    problems: [
      {
        title: 'Offline Delivery With At-Least-Once and Dedupe',
        level: 'Medium', tags: ['messaging', 'delivery guarantees', 'idempotency'], companies: ['Meta', 'Uber', 'Microsoft'],
        statement: `<p>Alice sends Bob a message but Bob's phone is off. Design how the message is stored, how Bob receives it when he reconnects, and how you guarantee <b>no loss, no visible duplicates, and correct order</b> even if acks are lost and Alice's phone retries the send.</p>`,
        constraints: `Bob may be offline for up to 30 days. Network may drop any packet or ack. 1.2M messages/s system-wide. Server must not read content (E2EE).`,
        example: `<p>Alice sends <code>client_msg_id=c-77</code>. The ACK is lost, so her phone resends <code>c-77</code> twice. Bob reconnects after 3 days.</p>
          <p>Expected: Bob sees the message <b>once</b>, in the right position, and Alice sees <span class="c-g">two ticks</span> afterwards. Why: the server de-duplicated on <code>c-77</code> and Bob's phone de-duplicated on the server id.</p>`,
        brute: { why: `<p><b>Naive design:</b> Alice's phone calls <code>POST /send</code>; the server holds the message in memory and pushes it to Bob if he is online, otherwise drops it (or keeps it only in a server's RAM). Problems: a server restart loses all pending messages; there is no retry id so a retried POST makes duplicates; no order guarantee; and "sent" is shown before anything is durable.</p>` },
        mcq: { q: 'When should the server tell Alice "message sent" (one tick)?', options: ['As soon as the bytes arrive at the gateway', 'After the message is durably written (quorum) to the recipient inbox', 'After Bob\'s phone acknowledges', 'After the push notification is sent'], answer: 1, explain: 'One tick means "the server owns this message and will deliver it". That is only true once it is durably stored. Acking earlier risks silent loss; waiting for Bob confuses it with the two-tick state.' },
        hints: [
          `<p>Hint 1: Separate three acknowledgements: sender→server (stored), server→receiver (delivered), receiver→sender (read). Each has its own retry loop.</p>`,
          `<p>Hint 2: Give every message a client-generated id for idempotency on the way in, and a per-inbox sequence number assigned by the server for ordering on the way out.</p>`,
          `<p>Hint 3: Recipe: dedupe on client_msg_id → append to inbox (user_id, seq) with quorum write → ack sender → deliver if online else push → on reconnect client sends last_seq → server streams seq &gt; last_seq → client acks → server deletes. Client drops any seq it already has.</p>`
        ],
        solution: {
          approach: `<p><b>Design.</b></p>
            <ol>
              <li><b>Inbound idempotency:</b> the sender attaches <code>client_msg_id</code>. The Chat Service keeps a per-sender set (Redis, TTL ~24 h) of recent ids; a repeat returns the same ACK without writing again.</li>
              <li><b>Durable write first:</b> assign <code>seq = INCR inbox_seq:bob</code> (or a per-partition counter), append <code>(bob, seq, ciphertext)</code> to the inbox table (Cassandra, RF=3, QUORUM). Only then ACK Alice → one tick.</li>
              <li><b>Routing:</b> look up <code>bob → gateway</code> in the session store. If present, send DELIVER over the socket. If absent, send a content-free push notification via APNs/FCM; the message stays in the inbox.</li>
              <li><b>Reconnect sync:</b> Bob's app opens a socket and sends <code>SYNC last_seq=41</code>. The server streams rows with seq &gt; 41 in ascending order. Each DELIVER is acked by the device; the server then deletes (or marks) acked rows and forwards a "delivered" receipt to Alice → two ticks.</li>
              <li><b>Duplicate safety:</b> if an ack is lost, the server re-sends; the phone checks its local table for that <code>server_msg_id/seq</code> and silently drops repeats but still re-acks.</li>
              <li><b>Retention:</b> inbox rows have a TTL of ~30 days; after that Bob gets a "messages expired" notice and the sender's client shows the message as undelivered.</li>
            </ol>
            <p>This yields at-least-once on the wire, exactly-once to the human, per-recipient ordering by seq, and no loss as long as the quorum write succeeded.</p>`,
          complexity: `<p>Per message: 1 dedupe lookup + 1 quorum write + 1 session lookup = O(1). Reconnect sync is O(k) for k pending messages, a single partition range scan by (user_id, seq).</p>`,
          followUps: ['How do you handle the same user on 3 devices?', 'What if Bob is offline for 6 months — do you keep growing the inbox?', 'How would you make the seq counter not a single hot key?']
        }
      }
    ]
  });

  /* ================= TOPIC 2: News Feed ================= */
  topics.push({
    title: 'News Feed: Fan-out on Write vs Read and the Celebrity Problem',
    analogy: `<p>Imagine a <b>newspaper</b>. Two ways to get it to readers:</p>
      <ul>
        <li><b>Fan-out on write (push) = home delivery.</b> The moment an article is printed, a delivery boy drops a copy into <i>every subscriber's mailbox</i>. Reading is instant — just open the mailbox. But if you have 50 million subscribers, one article means 50 million deliveries.</li>
        <li><b>Fan-out on read (pull) = go to the shop.</b> Nothing is delivered. When you want news, <i>you</i> walk to each of your favourite writers' desks and collect their latest pieces. Publishing is free, but reading is slow if you follow 500 writers.</li>
      </ul>
      <p>Smart papers do <b>both</b>: home-deliver for ordinary writers, but for superstar columnists (the "celebrities") keep a copy at the shop and let readers grab it on the way. That is the <b>hybrid</b> design real feeds use.</p>`,
    explain: `<p><b>The job:</b> show each user a list of recent posts from the people they follow, newest/most relevant first, in well under 200 ms, for hundreds of millions of users.</p>
      <h4>Step 1 — Requirements</h4>
      <ul>
        <li><b>Functional:</b> publish a post, follow/unfollow, load my feed (infinite scroll), see my own post immediately.</li>
        <li><b>Non-functional:</b> feed load &lt; 200 ms p99, highly available, <b>eventual consistency is fine</b> (a friend's post may take a few seconds to show up), must survive celebrities with tens of millions of followers.</li>
      </ul>
      <h4>Step 2 — Back-of-envelope</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Feed reads', '500M daily users × 10 opens', '5B / day ≈ 58K QPS avg, ~150K peak'],
        ['New posts', '100M / day', '≈ 1,200 posts/s'],
        ['Fan-out writes', '100M posts × 200 avg followers', '20B timeline inserts/day ≈ 230K writes/s'],
        ['Celebrity post', '1 post × 50M followers', '50M inserts for ONE post (the problem!)'],
        ['Timeline cache size', '500M users × 800 post ids × 8 B', '≈ 3.2 TB in Redis (shardable)'],
        ['Read:write ratio', '58K reads vs 1.2K posts', '~50:1 → optimise reads, i.e. precompute']
      ])}
      <h4>Step 3 — APIs</h4>
      <ul>
        <li><code>POST /v1/posts {text, media_ids}</code> → <code>{post_id}</code></li>
        <li><code>GET /v1/feed?limit=20&amp;cursor=&lt;last_post_id&gt;</code> → list of hydrated posts + <code>next_cursor</code></li>
        <li><code>PUT /v1/follow/{user_id}</code> and <code>DELETE /v1/follow/{user_id}</code></li>
      </ul>
      <h4>Step 4 — Data model</h4>
      ${H.table(['Data', 'Shape', 'Store'], [
        ['Posts', '<code>post_id (time-sortable) → author, text, media, created_at</code>', 'Sharded KV / wide-column; hot ones in cache'],
        ['Follow graph', '<code>followers(user) → [ids]</code> and <code>following(user) → [ids]</code> (both directions)', 'Sharded SQL or a graph/adjacency store'],
        ['Timeline (feed) cache', '<code>user:{id}:timeline → sorted set of post_ids</code>, capped ~800', 'Redis cluster'],
        ['Celebrity posts', '<code>author:{id}:recent → last N post_ids</code>', 'Redis (read by everybody)']
      ])}
      <h4>Step 5 — Architecture</h4>
      <p><b>Write path:</b> Post Service saves the post → emits an event to Kafka → <b>fan-out workers</b> read the author's follower list and insert the post id into each follower's timeline. <b>Read path:</b> Feed Service reads the user's precomputed timeline, <i>merges in</i> recent posts from any celebrities they follow, <b>hydrates</b> ids into full posts (batched multi-get from the post cache), runs a ranker, and returns a page.</p>`,
    clues: [
      '"Design Facebook/Twitter/Instagram feed or timeline" → fan-out on write vs read',
      '"Some users have millions of followers" → celebrity / hot-key problem → hybrid',
      '"Feed should load fast" + read-heavy → precompute timelines in cache',
      '"Infinite scroll" → cursor pagination, never OFFSET',
      '"Ranked / personalised feed" → candidate generation → ranking → re-ranking pipeline',
      '"I should see my own post right away" → read-your-writes: insert into own timeline synchronously'
    ],
    code: [
      { lang: 'java', title: 'Merge precomputed timeline + celebrity posts (k-way merge)', code: `import java.util.*;

public class FeedMerge {
    // Each list is already sorted newest-first by post id (ids grow with time).
    // Merge k lists with a max-heap and return the top 'limit' ids.
    static List<Long> mergeFeeds(List<List<Long>> lists, int limit) {
        // heap entries: {postId, listIndex, positionInList}
        PriorityQueue<long[]> heap = new PriorityQueue<>((a, b) -> Long.compare(b[0], a[0]));
        for (int i = 0; i < lists.size(); i++) {
            if (!lists.get(i).isEmpty()) heap.add(new long[]{lists.get(i).get(0), i, 0});
        }
        List<Long> out = new ArrayList<>();
        Long last = null;                                  // skip duplicates (same post via two paths)
        while (!heap.isEmpty() && out.size() < limit) {
            long[] top = heap.poll();
            if (last == null || last != top[0]) { out.add(top[0]); last = top[0]; }
            int li = (int) top[1], next = (int) top[2] + 1;
            if (next < lists.get(li).size()) {
                heap.add(new long[]{lists.get(li).get(next), li, next});
            }
        }
        return out;
    }

    public static void main(String[] args) {
        List<Long> myTimeline = Arrays.asList(900L, 850L, 700L, 400L);   // pushed by fan-out workers
        List<Long> celebA     = Arrays.asList(880L, 300L);               // pulled at read time
        List<Long> celebB     = Arrays.asList(950L, 600L, 100L);
        System.out.println(mergeFeeds(Arrays.asList(myTimeline, celebA, celebB), 5));
        // [950, 900, 880, 850, 700]
    }
}` },
      { lang: 'python', title: 'Hybrid fan-out decision (runnable)', run: true, code: `import heapq

FOLLOWERS = {"zed": ["a", "b", "c", "d", "e", "f"], "amy": ["a", "b"]}
CELEB_THRESHOLD = 4          # followers above this => do NOT push, pull at read time
timelines = {}               # user -> list of post ids (newest first)
celeb_posts = {}             # author -> list of post ids (newest first)

def publish(author, post_id):
    followers = FOLLOWERS[author]
    if len(followers) > CELEB_THRESHOLD:
        celeb_posts.setdefault(author, []).insert(0, post_id)       # 1 write instead of N
        return "celebrity: stored once, will be pulled"
    for f in followers:                                             # fan-out on write
        timelines.setdefault(f, []).insert(0, post_id)
    return "pushed to %d timelines" % len(followers)

def read_feed(user, follows_celebs, limit=5):
    lists = [timelines.get(user, [])] + [celeb_posts.get(c, []) for c in follows_celebs]
    merged = heapq.merge(*lists, reverse=True)                      # k-way merge, newest first
    out = []
    for pid in merged:
        if not out or out[-1] != pid:
            out.append(pid)
        if len(out) == limit:
            break
    return out

print(publish("amy", 101))      # small account -> push
print(publish("zed", 102))      # celebrity -> pull
print(publish("amy", 103))
print(read_feed("a", ["zed"]))  # [103, 102, 101]` }
    ],
    codeTitle: ['Feed merge (Java)', 'Hybrid fan-out (Python, runnable)'],
    viz: [
      {
        title: 'Fan-out to follower timelines: push for normal users, pull for celebrities',
        input: '5 3',
        inputLabel: 'Followers of the poster (1-8) and celebrity threshold (1-8)',
        gen: function (input) {
          var v = ints(input, [5, 3], 1, 8, 'Enter two whole numbers like: 5 3');
          var n = v[0], thr = v[1], F = [], i;
          var followers = [];
          for (i = 1; i <= n; i++) followers.push('f' + i);
          var celeb = n > thr;
          var tl = {}; followers.forEach(function (f) { tl[f] = ['p90']; });
          function entries() { return followers.map(function (f) { return [f, tl[f].join(' ')]; }); }
          F.push({ narr: 'Zed publishes post <b>p100</b>. He has <b>' + n + '</b> followers. Every follower has a timeline (a list of post ids) waiting in the cache; for now each holds just <code>p90</code>.', parts: [
            { type: 'vars', vals: { poster: 'zed', followers: n, threshold: thr }, hl: {} },
            { type: 'map', label: 'Timeline cache (user → post ids, newest first)', entries: entries() }] });
          F.push({ narr: celeb ? 'Rule: followers (' + n + ') &gt; threshold (' + thr + ') → Zed is a <span class="c-r">celebrity</span>. Pushing to everyone would be too expensive, so we <b>skip fan-out</b> and store p100 once on Zed\'s own "recent posts" list.' : 'Rule: followers (' + n + ') ≤ threshold (' + thr + ') → ordinary account. We <span class="c-g">push</span> p100 into every follower\'s timeline (fan-out on write).', parts: [
            { type: 'vars', vals: { poster: 'zed', followers: n, threshold: thr, strategy: celeb ? 'PULL (hybrid)' : 'PUSH' }, hl: { strategy: celeb ? 'bad' : 'ok' } },
            { type: 'queue', label: 'Fan-out job queue (follower ids)', items: celeb ? [] : followers.slice(), frontLabel: 'next', backLabel: 'last' }] });
          if (!celeb) {
            for (i = 0; i < n; i++) {
              tl[followers[i]] = ['p100', 'p90'];
              (function (idx, snap) {
                var h = {}; h[followers[idx]] = 'ok';
                F.push({ narr: 'A fan-out worker takes <b>' + followers[idx] + '</b> from the queue and inserts <code>p100</code> at the front of that timeline. ' + (idx === n - 1 ? 'Last one!' : 'Many workers do this in parallel in real life.'), parts: [
                  { type: 'queue', label: 'Fan-out job queue (remaining)', items: followers.slice(idx + 1), frontLabel: 'next', backLabel: 'last' },
                  { type: 'map', label: 'Timeline cache', entries: snap, hl: h }] });
              })(i, entries());
            }
            F.push({ narr: 'Done. Cost: <b>' + n + ' writes</b> for one post. Now when anyone opens their feed it is a single cache read — fast. This is why push works great for normal accounts.', parts: [
              { type: 'map', label: 'Timeline cache', entries: entries(), hl: (function () { var h = {}; followers.forEach(function (f) { h[f] = 'ok'; }); return h; })() },
              { type: 'vars', vals: { writes: n, readCostPerFeedOpen: '1 cache read' }, hl: { writes: 'ok' } }] });
          } else {
            F.push({ narr: 'Timelines are untouched: <b>0 fan-out writes</b> instead of ' + n + '. (With 50 million followers that is the difference between one write and fifty million.)', parts: [
              { type: 'map', label: 'Timeline cache', entries: entries() },
              { type: 'array', label: 'celeb:zed:recent (stored once)', values: ['p100'], hl: { 0: 'sel' } }] });
            F.push({ narr: 'Later, follower <b>f1</b> opens the feed. Step 1: read f1\'s own timeline from cache → <code>p90</code>. Step 2: look up which celebrities f1 follows (Zed) and read their recent lists.', parts: [
              { type: 'array', label: 'f1 timeline (pushed)', values: tl.f1.slice(), hl: { 0: 'win' } },
              { type: 'array', label: 'celeb:zed:recent (pulled)', values: ['p100'], hl: { 0: 'sel' } }] });
            F.push({ narr: '<b>Merge</b> both lists by time (newest first) and cut to one page. The result looks exactly as if p100 had been pushed — the user cannot tell the difference. Cost moved from <i>every post</i> to <i>every read of a follower of a celebrity</i>, and celebrity lists are tiny and hot in cache.', parts: [
              { type: 'array', label: 'f1 feed page after merge', values: ['p100', 'p90'], hl: { 0: 'ok' } },
              { type: 'vars', vals: { writes: 0, extraReadsPerFeedOpen: 1 }, hl: { writes: 'ok' } }] });
          }
          return F;
        }
      },
      {
        title: 'K-way merge of timeline + celebrity lists (newest first)',
        input: '900 850 700 400 | 880 300 | 950 600 100',
        inputLabel: 'Sorted-descending post ids per source, separated by | (up to 4 lists)',
        gen: function (input) {
          var raw = String(input || '').split('|');
          if (raw.length < 2 || raw.length > 4) throw new Error('Give 2 to 4 lists separated by |');
          var lists = raw.map(function (s) {
            var t = s.trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
            if (!t.length || t.some(isNaN)) throw new Error('Each list must contain numbers like 900 850 700');
            for (var i = 1; i < t.length; i++) if (t[i] > t[i - 1]) throw new Error('Each list must be sorted from large to small (newest first)');
            if (t.length > 7) throw new Error('At most 7 ids per list');
            return t;
          });
          var names = ['my timeline (pushed)', 'celebrity A (pulled)', 'celebrity B (pulled)', 'celebrity C (pulled)'];
          var pos = lists.map(function () { return 0; }), out = [], F = [];
          function parts(pick) {
            var p = lists.map(function (l, i) {
              var ptr = {}, hl = {};
              if (pos[i] < l.length) { ptr[pos[i]] = 'head'; hl[pos[i]] = 'cur'; }
              for (var k = 0; k < pos[i]; k++) hl[k] = 'done';
              if (pick === i) hl[pos[i]] = 'ok';
              return { type: 'array', label: names[i], values: l.slice(), ptr: ptr, hl: hl };
            });
            p.push({ type: 'array', label: 'merged feed so far', values: out.length ? out.slice() : ['(empty)'], hl: out.length ? (function () { var h = {}; h[out.length - 1] = 'ok'; return h; })() : {} });
            return p;
          }
          F.push({ narr: 'We hold one <b>pointer</b> at the front (newest) of each list. At every step the biggest front id is the newest post overall. A heap finds that in O(log k).', parts: parts(-1) });
          var limit = 8;
          while (out.length < limit) {
            var best = -1;
            for (var i = 0; i < lists.length; i++) if (pos[i] < lists[i].length && (best < 0 || lists[i][pos[i]] > lists[best][pos[best]])) best = i;
            if (best < 0) break;
            var val = lists[best][pos[best]];
            var dup = out.length && out[out.length - 1] === val;
            if (!dup) out.push(val);
            F.push({ narr: 'Largest front id is <b>' + val + '</b> from <i>' + names[best] + '</i>. ' + (dup ? '<span class="c-r">Same id already taken — skip the duplicate.</span>' : 'Take it, advance that list\'s pointer.'), parts: parts(best) });
            pos[best]++;
          }
          F.push({ narr: 'Page is full (or all lists are used up): ' + out.length + ' posts. We stop early — we never merge more than one page, so the cost is O(page size × log k), no matter how long the lists are. Next page: remember the last id as the <b>cursor</b>.', parts: parts(-1) });
          return F;
        }
      }
    ],
    examples: [
      {
        title: 'Worked example — why pure push breaks for a celebrity',
        html: `<p>A celebrity with <b>50 million</b> followers posts. Each timeline insert takes ~0.1 ms of Redis time.</p>
          ${H.table(['Quantity', 'Math', 'Result'], [
            ['Inserts needed', '1 post × 50M followers', '50,000,000'],
            ['Total Redis time', '50M × 0.1 ms', '5,000 s ≈ 83 min of CPU'],
            ['With 1,000 parallel workers', '5,000 s ÷ 1,000', '≈ 5 s — OK, but...'],
            ['Same celeb posts 10×/day', '10 × 50M', '500M writes/day from one account']
          ])}
          <p>Followers at the tail of the queue see the post minutes late, and a handful of celebrities can eat a large share of the write capacity. <b>Fix:</b> don't push celebrities at all — pull them at read time.</p>`
      },
      {
        title: 'Worked example — why pure pull breaks for everyone else',
        html: `<p>Maya follows 500 accounts. With pure pull, opening her feed means: fetch 500 follow ids, then ask for the latest posts of each (500 reads, in parallel, then merge). At 58K feed opens/s that is <b>29 million reads/s</b>. With push, the same open is <b>1 read</b>. The trick is that reads happen ~50× more than writes, so we pay the cost once at write time.</p>
          <p>Rule of thumb: <b>push is cheap when followers are few; pull is cheap when readers are few</b>. Hybrid picks the cheaper one per author.</p>`
      },
      {
        title: 'Worked example — cursor pagination vs OFFSET',
        html: `<p>Bad: <code>GET /feed?page=3</code> → <code>OFFSET 40 LIMIT 20</code>. While you read, new posts arrive at the top, so page 3 now shows items you already saw (shifted down), and the database must skip 40 rows each time.</p>
          <p>Good: <code>GET /feed?limit=20&amp;cursor=post_8841</code> → "give me 20 posts older than id 8841". Stable even when new posts arrive, and a sorted-set range query (<code>ZREVRANGEBYSCORE ... (8841 -inf LIMIT 0 20</code>) is O(log N + 20).</p>`,
        code: { lang: 'text', title: 'Redis timeline commands', code: `ZADD  timeline:42  1730000012345  post_9001      # fan-out worker inserts (score = timestamp / snowflake id)
ZREMRANGEBYRANK timeline:42 0 -801              # keep only the newest 800
ZREVRANGEBYSCORE timeline:42 (1730000012345 -inf LIMIT 0 20   # next page older than the cursor` }
      },
      {
        title: 'Worked example — deletes, unfollows and "my own post"',
        html: `<ul>
          <li><b>I post:</b> insert into my own timeline synchronously (read-your-writes) even though followers get it asynchronously.</li>
          <li><b>I delete a post:</b> don't hunt it down in 200 timelines — mark it deleted in the post store; hydration filters it out at read time. A background job cleans ids later.</li>
          <li><b>I unfollow Sam:</b> remove Sam's ids lazily (filter by "is author still followed?" at read) and optionally purge in the background.</li>
          <li><b>I follow Sam:</b> backfill Sam's last ~20 posts into my timeline so the feed isn't empty.</li>
        </ul>`
      }
    ],
    deepDive: `<h4>🟣 Deep dive 1 — Choosing the hybrid threshold</h4>
      <p>The threshold is an economics decision, not a magic number. Push cost per post ≈ followers × write_cost. Pull cost per feed open ≈ (#celebs followed) × read_cost. Typical systems classify accounts above ~10K–1M followers as "celebrity" and tune with data. Better still, make it <b>dynamic</b>: also consider how often the author posts and how many of the followers are <i>active</i>. Never fan out to inactive users (no login in 30 days) — on many platforms that cuts fan-out work by 50% or more.</p>
      <h4>🟣 Deep dive 2 — The write path in detail</h4>
      <ol>
        <li>Post Service stores the post (source of truth) and publishes <code>PostCreated</code> to Kafka, partitioned by author.</li>
        <li>Fan-out workers fetch followers in <b>batches</b> of ~1,000 (paged from the follow-graph store) and write to the right Redis shards with pipelined <code>ZADD</code>s. Each batch is idempotent (adding the same id twice to a sorted set is harmless), so a retry after a crash is safe.</li>
        <li>Large authors are processed by many workers: split follower ranges into chunks and enqueue chunk jobs, so a 5M-follower author doesn't occupy a single worker.</li>
        <li>Backpressure: if the queue lag grows, prioritise <b>active users first</b> and degrade gracefully.</li>
      </ol>
      <h4>🟣 Deep dive 3 — The read path and ranking</h4>
      <p>Modern feeds are not chronological. A typical pipeline: <b>candidate generation</b> (timeline ids + celebrity pulls + recommendations, ~1,000 items) → <b>light ranker</b> (cheap model drops to ~200) → <b>heavy ranker</b> (neural net predicting like/comment/watch-time) → <b>re-ranking</b> (diversity, no five posts from one author, safety, ads insertion). Hydration is a batched multi-get to the post cache; user and author metadata are cached with a short TTL. Precompute what you can, but ranking features that change quickly (counts, "is online") are fetched at read time.</p>
      <h4>🟣 Deep dive 4 — Storing the timeline</h4>
      <p>Store only <b>post ids</b> (8 bytes) in the timeline, not post bodies — edits, deletes and like counts then live in one place. Cap each list (~800) because nobody scrolls further; deeper pages fall back to a slower "pull from the post store" path. Replicate Redis shards; a lost shard can be <b>rebuilt</b> from the follow graph + post store (slow but possible), which is why timelines are a cache, not a source of truth.</p>
      <h4>🟣 Deep dive 5 — Consistency and edge cases</h4>
      <ul>
        <li><b>Eventual consistency</b> is acceptable: fan-out lag of a few seconds. Name it explicitly in the interview.</li>
        <li><b>Read-your-writes:</b> write to the author's own timeline synchronously; or pin the client to the fresh result with a "just posted" overlay.</li>
        <li><b>Hot posts:</b> a viral post is read by millions — its hydrated JSON lives in a replicated cache / CDN edge cache; counters are sharded (see the Instagram topic).</li>
        <li><b>Follow graph size:</b> 500M users × 200 follows × 2 directions ≈ 200B edges ≈ 3 TB+; shard by user_id with consistent hashing.</li>
        <li><b>Spam &amp; abuse:</b> block-lists and muted words are applied at <i>read</i> time because they change constantly.</li>
      </ul>
      <h4>🟣 Deep dive 6 — Trade-off summary</h4>
      ${H.table(['', 'Push (write)', 'Pull (read)', 'Hybrid'], [
        ['Feed read latency', 'Excellent (1 read)', 'Poor (N reads + merge)', 'Excellent + small merge'],
        ['Write cost', 'High, spiky for celebs', 'Tiny', 'Bounded'],
        ['Freshness', 'Delayed by fan-out lag', 'Always fresh', 'Fresh for celebs'],
        ['Wasted work', 'Writes for inactive users', 'Repeated merging', 'Low if inactive users skipped'],
        ['Complexity', 'Medium', 'Low', 'Highest — but the standard answer']
      ])}`,
    aiEra: `<p><b>What AI changes:</b> The ranker is now a learned model, and many feeds blend <b>embedding-based retrieval</b> (find posts similar to what you engaged with) with the follow graph — so the "candidate generation" stage includes a vector search, not just your timeline. LLMs also power feed features such as "summarise what you missed", topic clustering and automatic content-safety labelling. A flood of AI-generated posts raises spam volume, so moderation classifiers sit on the write path before fan-out.</p>
      <p><b>Use AI as a partner:</b> ask <code>Given 500M DAU, 200 average followers and a 50:1 read/write ratio, sanity-check my fan-out cost numbers and show where the threshold should sit</code>; ask it to generate adversarial scenarios (a celebrity unfollows everyone, a user follows 10,000 accounts). Let it write a quick simulator to compare push vs pull costs.</p>
      <p><b>Where AI goes wrong:</b> it recommends "just use Kafka for the timeline" or "use a SQL JOIN of follows and posts" without doing the QPS math; it forgets inactive users, deletes and unfollows. <b>What you must still own:</b> the push/pull cost model, the celebrity threshold reasoning, cursor pagination, and stating clearly which parts are cache (rebuildable) versus source of truth.</p>`,
    problems: [
      {
        title: 'Design a Hybrid Fan-out Policy',
        level: 'Medium', tags: ['news feed', 'fan-out', 'caching'], companies: ['Meta', 'Twitter/X', 'LinkedIn'],
        statement: `<p>Your social network has 300M daily users. The median user has 150 followers, but about 2,000 accounts have over 5 million. A post must reach followers' feeds within ~10 seconds for active users. Propose a fan-out strategy, choose a threshold, describe the read and write paths, and explain what happens to a user who follows 3 celebrities and 400 normal accounts.</p>`,
        constraints: `Feed read p99 &lt; 200 ms. Posts per day: 80M. Average followers: 180. Timeline cache max 800 ids per user.`,
        example: `<p>Zed (8M followers) posts at the same time as Amy (120 followers). Maya follows both.</p>
          <p>Expected: Amy's post is <span class="c-g">pushed</span> into 120 timelines (Maya's included). Zed's post is stored once and <span class="c-b">pulled</span> into Maya's feed when she opens it, merged by id. Maya sees both in order.</p>`,
        brute: { why: `<p><b>Pure push:</b> Zed's post causes 8M timeline writes (several minutes of delay, wasted writes for users who never log in again) and 2,000 such accounts can saturate the cluster. <b>Pure pull:</b> each feed open reads 400+ authors' recent posts: at 100K feed opens/s that is 40M+ reads/s, and p99 would be seconds.</p>` },
        mcq: { q: 'Which metric best decides whether an author is "celebrity" (pull) rather than normal (push)?', options: ['Account age', 'Number of active followers (fan-out cost per post) versus read cost for followers', 'Number of posts per day only', 'The author\'s country'], answer: 1, explain: 'The decision is a cost comparison: push cost grows with active followers per post; pull cost grows with how many celebrities each reader follows. Active followers is the right driver.' },
        hints: [
          `<p>Hint 1: Compute the cost of pushing one post: followers × write cost. Compare with the extra cost of pulling: one small read per celebrity followed per feed open.</p>`,
          `<p>Hint 2: Keep a "celebrity" flag on authors. Store their recent post ids in one hot list. Push everything else into follower timelines through a queue.</p>`,
          `<p>Hint 3: Read path = own timeline (1 read) + recent lists of followed celebrities (≤ a few reads, cached) → merge by id → hydrate → rank → page with a cursor. Skip fan-out to inactive users; backfill on return.</p>`
        ],
        solution: {
          approach: `<p><b>Strategy: hybrid fan-out with an active-follower threshold.</b></p>
            <ol>
              <li><b>Classify authors</b> with a flag in the user service: celebrity if active followers &gt; ~100K (tune with data; hysteresis so accounts don't flap).</li>
              <li><b>Write path (normal author):</b> save post → Kafka <code>PostCreated</code> → fan-out workers page through the author's <i>active</i> followers (logged in within 30 days) in batches of 1,000 → pipelined <code>ZADD</code> + trim to 800 into each follower's Redis timeline. Idempotent, retryable. Target lag &lt; 5 s.</li>
              <li><b>Write path (celebrity):</b> save post and push the id onto <code>celeb:{author}:recent</code> (cap ~200). No fan-out. One write.</li>
              <li><b>Read path:</b> Feed Service reads the user's timeline (1 Redis read), reads <code>following_celebs(user)</code> (cached list, usually 3–50) and their recent lists (hot cache, local in-process cache with 5–10 s TTL), k-way merges by time-sortable id, hydrates the page via batched multi-get, ranks and returns a cursor.</li>
              <li><b>Maya's case:</b> 1 read for her timeline + 3 for celebrities + 1 batched hydrate = a handful of ms of cache time. Her 400 normal friends were already pushed.</li>
              <li><b>Edge cases:</b> inactive users rebuild their timeline lazily on return (pull recent posts of followees once); deletes filtered at hydration; follow = backfill ~20 posts.</li>
            </ol>
            <p>Trade-off: more moving parts (two paths, a merge) but bounded write amplification and low read latency.</p>`,
          complexity: `<p>Write: O(active followers) for normal authors, O(1) for celebrities. Read: O(1 + c) cache reads for c followed celebrities plus an O(page × log c) merge.</p>`,
          followUps: ['What if a celebrity\'s follower count crosses the threshold while posts are in flight?', 'How would you rebuild a lost Redis shard?', 'How would you add a "close friends only" post?']
        }
      }
    ]
  });

  /* ================= TOPIC 3: Instagram ================= */
  topics.push({
    title: 'Instagram: Photo Upload, Media Storage, CDN & Counters',
    analogy: `<p>Think of a <b>photo lab with a loading dock</b>. You don't walk your film through the shop's front door and past the cashier; the lab gives you a <b>delivery slip</b> and you drive straight to the loading dock (the object store) and drop the big box there. A back-room team then makes prints in several sizes (thumbnail, medium, large), checks nothing illegal is in the box, and ships copies to branch shops all over the city (the CDN). Customers browsing the catalogue only ever get the small, nearby print — never the giant original.</p>
      <p>The "likes" board outside is just a counter. If thousands of people press the same button at once, a single counter jams — so the lab keeps several counters and adds them up when you look.</p>`,
    explain: `<p><b>The job:</b> let users upload photos and short videos, show them quickly everywhere in the world, and keep likes, comments and follower counts roughly right — at a scale of hundreds of millions of daily users. (The feed itself is covered in the News Feed topic; here we focus on <b>media</b>.)</p>
      <h4>Step 1 — Requirements</h4>
      <ul>
        <li><b>Functional:</b> upload photo/video with caption, view a profile grid, view a photo (fast!), like/comment, stories that vanish after 24 h, follow, home feed (reuse the fan-out design).</li>
        <li><b>Non-functional:</b> <b>never lose an uploaded photo</b> (durability 11 nines), photo load &lt; 200 ms worldwide, highly available reads, uploads may be a little slower, eventual consistency for counts.</li>
      </ul>
      <h4>Step 2 — Back-of-envelope</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Uploads', '100M photos/day', '≈ 1,150 uploads/s (peak ~3,500)'],
        ['Original size', '~2 MB each', '200 TB/day of originals'],
        ['Renditions', '4 extra sizes ≈ +30% bytes', '≈ 260 TB/day ≈ 95 PB/year'],
        ['Views', '10B/day × ~200 KB (a medium rendition)', '115K views/s, ≈ 23 GB/s of egress'],
        ['CDN offload', '95% cache hit', 'Origin only sees ~5% ≈ 1.2 GB/s'],
        ['Metadata', '100M posts × ~1 KB', '100 GB/day — tiny next to media']
      ])}
      <p>Insight: <b>media bytes dwarf metadata</b>, so keep them in object storage + CDN and keep the databases small and fast.</p>
      <h4>Step 3 — APIs</h4>
      <ul>
        <li><code>POST /v1/media/upload-session {size, type}</code> → <code>{media_id, upload_url (pre-signed), expires}</code></li>
        <li>Client → <code>PUT upload_url</code> (straight to the object store, big bytes never touch our app servers)</li>
        <li><code>POST /v1/posts {media_id, caption}</code> → creates the post once the media is READY</li>
        <li><code>GET /v1/posts/{id}</code>, <code>POST /v1/posts/{id}/like</code>, <code>GET /v1/users/{id}/posts?cursor=</code></li>
      </ul>
      <h4>Step 4 — Data model</h4>
      ${H.table(['Data', 'Key / shape', 'Store'], [
        ['Media blobs', '<code>media/{id}/orig, 150.jpg, 320.jpg, 640.jpg, 1080.jpg</code>', 'Object store (S3-style) → CDN'],
        ['Media metadata', '<code>media_id, owner, status (UPLOADING/PROCESSING/READY/FAILED), blob keys, blurhash</code>', 'Sharded SQL / KV'],
        ['Posts', '<code>post_id, user_id, media_ids, caption, created_at</code>, sharded by <code>user_id</code>', 'Sharded Postgres/MySQL or Cassandra'],
        ['Likes', '<code>(post_id, user_id)</code> unique; counter kept separately', 'KV store + Redis counters'],
        ['Comments', '<code>(post_id, comment_id)</code> time-ordered', 'Wide-column store']
      ])}
      <h4>Step 5 — Architecture (the upload pipeline)</h4>
      <p>Client asks the API for an upload slot → uploads straight to the <b>object store</b> → an event goes onto a <b>queue</b> → <b>media workers</b> validate and resize → metadata flips to READY → the post is published and fanned out → readers fetch renditions through the <b>CDN</b>. Step through it below.</p>`,
    clues: [
      '"Design Instagram / Flickr / photo sharing" → object storage + CDN + async processing',
      '"Users upload large files" → pre-signed URLs, never stream bytes through app servers',
      '"Show thumbnails fast on slow phones" → multiple renditions + CDN + responsive sizes',
      '"Millions of likes on one post" → hot key; sharded or batched counters, eventual consistency',
      '"IDs sortable by time across many DB shards" → Snowflake-style IDs (time + shard + sequence)',
      '"Stories disappear after 24 hours" → TTL on data and blobs, lifecycle rules'
    ],
    code: [
      { lang: 'java', title: 'Snowflake-style time-sortable ID generator', code: `// 64-bit id = [41 bits: ms since custom epoch][13 bits: shard id][10 bits: per-ms sequence]
// Sortable by time, unique across 8192 shards, 1024 ids per ms per shard, no central coordinator.
public class IdGen {
    private static final long EPOCH = 1_700_000_000_000L;   // custom epoch (Nov 2023)
    private static final int SHARD_BITS = 13, SEQ_BITS = 10;
    private final long shardId;
    private long lastMs = -1, seq = 0;

    public IdGen(long shardId) {
        if (shardId < 0 || shardId >= (1L << SHARD_BITS)) throw new IllegalArgumentException("bad shard");
        this.shardId = shardId;
    }

    public synchronized long next(long nowMs) {
        if (nowMs < lastMs) nowMs = lastMs;                  // clock went backwards: stay monotonic
        if (nowMs == lastMs) {
            seq = (seq + 1) & ((1L << SEQ_BITS) - 1);
            if (seq == 0) nowMs = lastMs + 1;                // sequence exhausted this ms: borrow the next ms
        } else {
            seq = 0;
        }
        lastMs = nowMs;
        return ((nowMs - EPOCH) << (SHARD_BITS + SEQ_BITS)) | (shardId << SEQ_BITS) | seq;
    }

    public static long shardOf(long id) { return (id >> SEQ_BITS) & ((1L << SHARD_BITS) - 1); }

    public static void main(String[] args) {
        IdGen g = new IdGen(42);
        long a = g.next(1_700_000_001_000L), b = g.next(1_700_000_001_000L), c = g.next(1_700_000_002_000L);
        System.out.println(a < b && b < c);                  // true: sorted by time
        System.out.println(shardOf(a));                      // 42: the id tells you which shard holds the row
    }
}` },
      { lang: 'python', title: 'Sharded like counter (runnable)', run: true, code: `# One hot counter = one hot row = a queue of writers. Split it into N counters instead.
import random
random.seed(7)

class ShardedCounter:
    def __init__(self, shards):
        self.cells = [0] * shards

    def incr(self):
        self.cells[random.randrange(len(self.cells))] += 1   # writers spread over cells

    def value(self):
        return sum(self.cells)                               # reads add the cells (cheap, N is small)

likes = ShardedCounter(8)
for _ in range(100_000):
    likes.incr()
print("cells :", likes.cells)
print("total :", likes.value())
print("max cell share: %.1f%%" % (100 * max(likes.cells) / likes.value()))

# Idempotency: a user can like a post only once -> dedupe on (post_id, user_id) BEFORE incrementing.
liked = set()
def like(post, user):
    if (post, user) in liked:
        return False
    liked.add((post, user))
    return True
print(like("p1", "u1"), like("p1", "u1"))   # True False` }
    ],
    codeTitle: ['Time-sortable ID generator (Java)', 'Sharded counter (Python, runnable)'],
    viz: [
      {
        title: 'Upload pipeline: pre-signed URL → object store → workers → CDN',
        input: 'ok',
        inputLabel: 'Scenario: ok, or retry (a worker crashes halfway)',
        gen: function (input) {
          var mode = String(input || 'ok').trim().toLowerCase();
          if (mode !== 'ok' && mode !== 'retry') throw new Error('Type "ok" or "retry"');
          var nodes = [nd('C', 'Phone app', 8, 10), nd('API', 'API Service', 36, 10), nd('MDB', 'Metadata DB', 66, 10), nd('FAN', 'Post + Fan-out', 92, 10, 18),
            nd('OS', 'Object Store', 8, 56), nd('Q', 'Job Queue', 36, 56), nd('W', 'Media Workers', 66, 56), nd('CDN', 'CDN edge', 92, 56)];
          var edges = [['C', 'API', '1 ask slot'], ['API', 'MDB', '2 UPLOADING'], ['C', 'OS', '3 PUT bytes'], ['OS', 'Q', '4 event'], ['Q', 'W', '5 job'], ['W', 'OS', '6 renditions'], ['W', 'MDB', '7 READY'], ['API', 'FAN', '8 publish'], ['OS', 'CDN', '9 serve']];
          var F = [];
          function add(narr, hl, ehl, tags, vals) {
            F.push({ narr: narr, parts: [gp('Upload pipeline', nodes, edges, hl, ehl, tags), { type: 'vars', label: 'Media m-77', vals: vals }] });
          }
          add('Sana picks a photo (3 MB). Her app asks the API: "I want to upload a 3 MB jpeg — give me a slot".', { C: 'cur' }, { 'C-API': 'ok' }, {}, { status: '—', stage: 'ask slot' });
          add('The API creates a metadata row with status <b>UPLOADING</b> and returns a <b>pre-signed URL</b>: a temporary, signed address that lets the phone write exactly one object, only for the next 15 minutes.', { API: 'cur', MDB: 'ok' }, { 'API-MDB': 'ok' }, { MDB: 'UPLOADING' }, { status: 'UPLOADING', stage: 'slot issued' });
          add('The phone uploads the bytes <b>directly to the object store</b>. Our app servers never carry the heavy data — that keeps them small, cheap and fast. Large files use <i>multipart/resumable</i> uploads.', { C: 'done', OS: 'cur' }, { 'C-OS': 'ok' }, { OS: 'orig.jpg 3MB' }, { status: 'UPLOADING', stage: 'bytes arriving' });
          add('The store notifies us that the object exists (an event). We put a <b>job</b> on a queue instead of processing inline, so a spike of uploads just makes the queue longer rather than crashing anything.', { OS: 'done', Q: 'cur' }, { 'OS-Q': 'ok' }, { Q: '1 job' }, { status: 'PROCESSING', stage: 'queued' });
          add('A media worker pulls the job: virus/abuse scan, strip GPS from EXIF, check it really is an image, then start resizing.', { Q: 'done', W: 'cur' }, { 'Q-W': 'ok' }, { W: 'working' }, { status: 'PROCESSING', stage: 'worker picked up' });
          if (mode === 'retry') {
            add('<span class="c-r">The worker crashes</span> before finishing. The queue never got an acknowledgement, so after the visibility timeout it hands the <b>same job</b> to another worker. This is why the work must be <b>idempotent</b>.', { W: 'bad' }, { 'Q-W': 'bad' }, { W: 'CRASH', Q: 'redeliver' }, { status: 'PROCESSING', stage: 'retry' });
            add('A healthy worker takes the job. It writes renditions to deterministic keys (<code>media/77/320.jpg</code>), so redoing the work just overwrites the same files — no duplicates, no harm.', { W: 'cur' }, { 'Q-W': 'ok' }, { W: 'worker 2' }, { status: 'PROCESSING', stage: 'second attempt' });
          }
          add('The worker writes 4 renditions (150, 320, 640 and 1080 px wide) plus a tiny blurred placeholder back to the object store. Phones on slow networks will request the smallest sensible one.', { W: 'cur', OS: 'ok' }, { 'W-OS': 'ok' }, { OS: 'orig + 4 sizes' }, { status: 'PROCESSING', stage: 'renditions written' });
          add('Only now does the worker mark the media <b>READY</b> in the metadata DB. A photo is never visible half-processed.', { W: 'done', MDB: 'ok' }, { 'W-MDB': 'ok' }, { MDB: 'READY' }, { status: 'READY', stage: 'ready' });
          add('Sana\'s app (polling or a push event) calls <code>POST /posts</code>. The Post Service saves the post and triggers the feed fan-out from the previous topic.', { API: 'cur', FAN: 'ok' }, { 'API-FAN': 'ok' }, { FAN: 'fan-out' }, { status: 'READY', stage: 'post published' });
          add('Followers request the 320 px rendition. The first request at an edge location is a <b>cache miss</b> and pulls from the object store; every later request in that region is served from the edge in a few milliseconds.', { OS: 'done', CDN: 'ok' }, { 'OS-CDN': 'ok' }, { CDN: 'cached' }, { status: 'READY', stage: 'served via CDN' });
          return F;
        }
      },
      {
        title: 'Sharded like counter for a viral post',
        input: '4 12',
        inputLabel: 'Number of counter shards (2-6) and number of likes (1-30)',
        gen: function (input) {
          var v = ints(input, [4, 12], 1, 30, 'Enter two whole numbers like: 4 12');
          var shards = v[0], likes = v[1];
          if (shards < 2 || shards > 6) throw new Error('Shards must be between 2 and 6');
          var cells = [], i, F = [], labels = [];
          for (i = 0; i < shards; i++) { cells.push(0); labels.push('cell ' + i); }
          F.push({ narr: 'A single counter row <code>likes=0</code> would be updated by every liker, one at a time (row lock). We split it into <b>' + shards + ' cells</b>. Each like increments just one cell, chosen by a hash of the user id.', parts: [
            { type: 'bars', label: 'Counter cells', values: cells.slice(), idxLabels: labels }, { type: 'vars', vals: { likesSoFar: 0, total: 0 } }] });
          for (i = 1; i <= likes; i++) {
            var cell = (i * 7 + 3) % shards;
            cells[cell]++;
            var h = {}; h[cell] = 'ok';
            if (i <= 6 || i === likes || i % 4 === 0) {
              F.push({ narr: 'Like #' + i + ' (user hash → cell ' + cell + '). Only that cell is touched, so ' + shards + ' likers can proceed in parallel instead of queuing on one row.', parts: [
                { type: 'bars', label: 'Counter cells', values: cells.slice(), hl: h, idxLabels: labels }, { type: 'vars', vals: { likesSoFar: i, total: cells.reduce(function (a, b) { return a + b; }, 0) }, hl: { total: 'ok' } }] });
            }
          }
          F.push({ narr: 'A reader asks "how many likes?" → add the cells: <b>' + cells.join(' + ') + ' = ' + likes + '</b>. In production the displayed number is cached for a few seconds ("1.2M") and a background job periodically flushes the exact sum to the database.', parts: [
            { type: 'bars', label: 'Counter cells', values: cells.slice(), idxLabels: labels, hl: (function () { var o = {}; cells.forEach(function (c, k) { o[k] = 'sel'; }); return o; })() },
            { type: 'vars', vals: { displayed: likes, cells: shards }, hl: { displayed: 'sel' } }] });
          return F;
        }
      }
    ],
    examples: [
      {
        title: 'Worked example — storage per day and per year',
        html: `<p>Instagram-scale: 100M photos/day.</p>
          ${H.table(['Item', 'Math', 'Result'], [
            ['Originals', '100M × 2 MB', '200 TB / day'],
            ['Renditions', '150 px ≈ 8 KB, 320 px ≈ 30 KB, 640 px ≈ 90 KB, 1080 px ≈ 250 KB', '≈ 380 KB per photo → 38 TB / day'],
            ['Total per day', '200 + 38', '≈ 240 TB / day'],
            ['Per year', '240 TB × 365', '≈ 88 PB / year (×3 for replication, or ×1.5 with erasure coding)']
          ])}
          <p>Cost thinking: keep recent photos on fast storage; move photos older than ~1 year that are rarely viewed to a <b>colder, cheaper tier</b> via lifecycle rules. Keep the originals (for re-processing) but serve only renditions.</p>`
      },
      {
        title: 'Worked example — CDN hit ratio changes everything',
        html: `<p>Peak views: 115K/s at ~200 KB each ≈ 23 GB/s of bandwidth.</p>
          ${H.table(['CDN hit ratio', 'Origin traffic', 'Verdict'], [
            ['0% (no CDN)', '23 GB/s', 'Impossible to serve cheaply, and slow for distant users'],
            ['90%', '2.3 GB/s', 'Doable'],
            ['98% (popular photos are cached everywhere)', '0.46 GB/s', 'Comfortable']
          ])}
          <p>Photos follow a power law: a few are extremely hot, most are cold. So the hot ones sit at the edge, warm ones in a regional mid-tier cache, and cold ones fall back to the origin store. Use <b>content-addressed or versioned URLs</b> (<code>/media/77/320.jpg?v=3</code>) so you never need to purge: new content gets a new URL.</p>`
      },
      {
        title: 'Worked example — Stories that vanish in 24 hours',
        html: `<ul>
          <li>Each story row gets <code>expires_at = created + 24h</code>. A TTL-capable store (Cassandra/DynamoDB/Redis) drops it automatically.</li>
          <li>Blobs live under a <code>stories/</code> prefix with an object-store <b>lifecycle rule</b> "delete after 2 days" (a small grace margin).</li>
          <li>The story tray for a user = list of followees with an unexpired story, kept in a small per-user cache; the reader always <b>filters by expires_at</b> at read time, so a late cleanup job never shows expired content.</li>
          <li>Fan-out is mostly <b>pull</b>: the tray fetches "who I follow that has active stories" — the same celebrity-friendly trick as the feed.</li>
        </ul>`
      },
      {
        title: 'Worked example — sharding posts and finding the shard from the id',
        html: `<p>Posts are sharded by <code>user_id</code> so "show this user's profile grid" hits one shard. Each new id embeds time + shard id, so:</p>
          <ul>
            <li>Sorting ids sorts by creation time (no extra index to get "newest first").</li>
            <li>Given a post id alone, <code>shardOf(id)</code> tells you where the row lives — no lookup service needed.</li>
            <li>Starting with many <b>logical shards</b> (say 4,096) mapped onto a few physical servers lets you move logical shards between machines later without changing any ids.</li>
          </ul>`
      }
    ],
    deepDive: `<h4>🟣 Deep dive 1 — Pre-signed URLs and resumable uploads</h4>
      <p>A pre-signed URL embeds a signature over (bucket, key, expiry, content-length-range, content-type). The phone needs no credentials and the server needs no bandwidth. For big files (video) use <b>multipart upload</b>: split into 5–100 MB parts, upload in parallel, retry only the failed parts, then call "complete". The upload-session row stores which parts have arrived so a user who loses signal can resume. A scheduled job aborts sessions older than 24 h so half-uploaded parts don't pile up (and cost money).</p>
      <h4>🟣 Deep dive 2 — The media processing pipeline</h4>
      <ul>
        <li><b>Queue-based and idempotent:</b> at-least-once delivery means a job may run twice. Write outputs to deterministic keys and make the final "mark READY" a compare-and-set on the status.</li>
        <li><b>Poison messages:</b> after N failures route to a dead-letter queue and mark the media FAILED with a friendly retry prompt.</li>
        <li><b>Safety scanning:</b> hash-match against known-bad content, run nudity/violence classifiers, malware checks. Scan <i>before</i> publishing; scan again later as models improve.</li>
        <li><b>Modern formats:</b> serve WebP/AVIF to browsers that support them (content negotiation via the <code>Accept</code> header or the CDN) — 25–50% smaller than JPEG.</li>
        <li><b>On-the-fly resizing:</b> alternative to pre-generating every size: the CDN asks an image service for <code>?w=320</code> once and caches it. Great for flexibility; pre-generation is simpler and predictable. Many systems do both.</li>
      </ul>
      <h4>🟣 Deep dive 3 — Counters at scale</h4>
      <p>"Likes" has two jobs: the <b>set</b> of who liked (needed to show "liked by you" and to prevent double-liking) and the <b>number</b>. Store the set as a unique <code>(post_id, user_id)</code> row; keep the number in Redis with <code>INCR</code> (or sharded cells for extreme hot posts) and flush to the DB every few seconds. Accept that the shown number may lag by seconds. For comments, do <b>cursor paging</b> by comment id. Show "1.2M" rather than an exact number — cheap to approximate and nobody notices.</p>
      <h4>🟣 Deep dive 4 — Failures and consistency</h4>
      <ul>
        <li><b>Photo uploaded but post never created</b> (user closed the app): a janitor job removes orphaned media after a few days.</li>
        <li><b>Metadata/blob mismatch:</b> only flip READY after renditions are verified present; readers never see READY without blobs.</li>
        <li><b>Region outage:</b> object store replicates cross-region; DB has replicas; CDN keeps serving cached content even when the origin is unhealthy ("serve stale").</li>
        <li><b>Hot celebrity profile:</b> cache the profile and first grid page at the edge with short TTL; protect the database with request coalescing so 10,000 simultaneous misses cause one fetch.</li>
      </ul>
      <h4>🟣 Deep dive 5 — Trade-offs to voice</h4>
      ${H.table(['Decision', 'Option A', 'Option B', 'Typical pick'], [
        ['Resizing', 'Pre-generate sizes (predictable)', 'On-demand at CDN (flexible)', 'Pre-generate main sizes + on-demand for odd ones'],
        ['Upload path', 'Through app server (simple)', 'Direct pre-signed (scalable)', 'Direct'],
        ['IDs', 'DB auto-increment (single point)', 'Snowflake-style (distributed)', 'Snowflake-style'],
        ['Counts', 'Exact, synchronous', 'Approximate, async', 'Approximate'],
        ['Storage cost', 'Hot only', 'Tiered by age', 'Tiered']
      ])}`,
    aiEra: `<p><b>What AI changes:</b> Every upload now runs through more models than ever: automatic <b>alt-text</b> and captions, <b>content moderation</b>, duplicate/near-duplicate detection (perceptual hashes + embeddings), face and object tagging, "AI generated" provenance labels (reading C2PA content credentials in the file), and generative editing tools (background removal, expand-image). In the pipeline these are just more <b>asynchronous workers</b> on the queue — usually GPU-backed — each writing results to a metadata table. Search over photos became semantic: embed the image into a vector, store it in a vector index, and let users search "sunset over a lake".</p>
      <p><b>Use AI as a partner:</b> ask it to <code>list failure scenarios of a pre-signed upload flow and how a client can abuse each (huge files, wrong content-type, URL sharing)</code>; have it write the lifecycle-rule configuration or a load test that uploads 10K files in parallel; generate test images with odd EXIF orientation.</p>
      <p><b>Where AI goes wrong:</b> it suggests "store the images in the database" or "base64 in JSON"; it ignores egress cost; it forgets that reads outnumber writes 100:1 here and recommends over-engineering the upload path while the CDN strategy is thin. <b>What you must still own:</b> bytes vs metadata separation, idempotent async processing, the hot-counter fix, and the cost model (storage × replication + CDN egress).</p>`,
    problems: [
      {
        title: 'Likes on a Viral Photo',
        level: 'Medium', tags: ['counters', 'hot key', 'sharding'], companies: ['Meta', 'Pinterest', 'Snap'],
        statement: `<p>A celebrity's photo receives <b>200,000 likes per second</b> for a few minutes. Design the like path: prevent double-likes, keep counts approximately right, show "liked by you", and avoid melting the database.</p>`,
        constraints: `Display lag up to ~5 s is fine. Total likes must eventually be exact. One user can like a post once (unlike removes it). 1B likes/day overall.`,
        example: `<p>200K likes/s on <code>post_9</code>. Users see "1.2M likes" which updates every few seconds, their own heart is instantly red, and a retry from a flaky network never counts twice.</p>`,
        brute: { why: `<p><b>Naive design:</b> <code>UPDATE posts SET like_count = like_count + 1 WHERE id = 9</code> plus an insert into <code>likes</code>. All 200K writers contend on the <b>same row lock</b>, so throughput collapses to a few thousand/s, latency explodes, the primary DB slows for every other query, and replication lags.</p>` },
        mcq: { q: 'What is the best way to count likes on a single extremely hot post?', options: ['One row, increment it inside a transaction', 'Several counter cells (or Redis INCR) incremented independently, summed or flushed asynchronously', 'COUNT(*) over the likes table on each view', 'Store the count in the browser'], answer: 1, explain: 'Splitting the counter removes the single hot lock; reads add a handful of cells or read the cached total. COUNT(*) per view is far too slow, and the browser cannot be the source of truth.' },
        hints: [
          `<p>Hint 1: Two different things: the <i>set</i> of (post, user) likes and the <i>number</i>. They can use different stores and different consistency levels.</p>`,
          `<p>Hint 2: Make the like idempotent with a unique key (post_id, user_id), and make the count a derived, eventually consistent value.</p>`,
          `<p>Hint 3: Write path: dedupe via set/unique row → INCR a sharded Redis counter → publish an event to Kafka. A consumer batches events and writes exact totals to the DB every few seconds. Read path: cached total + "did I like it?" lookup.</p>`
        ],
        solution: {
          approach: `<p><b>Design.</b></p>
            <ol>
              <li><b>Like set:</b> table/KV <code>likes((post_id, user_id) unique)</code> sharded by post_id (plus a per-user reverse index for "posts I liked"). A like is an upsert, so retries are harmless. Unlike deletes the row.</li>
              <li><b>Fast count:</b> Redis keys <code>likes:{post_id}:{shard}</code> with <code>shard = hash(user_id) % 16</code> for hot posts (regular posts use a single key). The API does: upsert like row → if newly inserted, <code>INCR</code> that shard. Duplicates don't increment because the upsert tells us it was not new.</li>
              <li><b>Durability &amp; exactness:</b> every successful like also emits <code>LikeAdded</code> to Kafka (partitioned by post_id). A batching consumer aggregates deltas and updates the authoritative <code>posts.like_count</code> every few seconds (one write per post per batch instead of 200K). If Redis is lost, rebuild the counters from the like set or the DB total.</li>
              <li><b>Read path:</b> feed/post views show the cached sum (read 16 cells in one pipelined MGET, or a separate "total" key refreshed each second) formatted as "1.2M". "Liked by you" is a single lookup in the like set (or a per-user Bloom filter plus a confirm).</li>
              <li><b>Hot-post detection:</b> when a post's like rate crosses a threshold, switch it from 1 to 16 shards dynamically and replicate its cache entry across more cache nodes.</li>
              <li><b>Abuse:</b> rate-limit per user, drop likes from flagged bot accounts asynchronously.</li>
            </ol>
            <p>Trade-off: the displayed number is slightly stale and approximate, the stored number converges to exact — the right trade for a vanity metric.</p>`,
          complexity: `<p>Write: O(1) per like (one upsert + one INCR). Read of the count: O(shards) = O(16). DB write rate drops from 200K/s to ~1 batched update per post per flush interval.</p>`,
          followUps: ['How do you show "liked by people you follow"?', 'What changes if likes must be strongly consistent (e.g. a paid vote)?', 'How would you detect and discount bot likes?']
        }
      }
    ]
  });

  /* ================= TOPIC 4: YouTube / Netflix ================= */
  topics.push({
    title: 'YouTube / Netflix: Transcoding Pipeline & Adaptive Bitrate Streaming',
    analogy: `<p>Imagine a <b>water company</b> supplying a whole city. The factory (the studio) makes one giant tank of water (the original video). But homes have different pipes: some wide, some thin and leaky. So the company bottles the water in <b>several bottle sizes</b> (transcoding into 240p, 720p, 1080p...) and delivers pallets of bottles to <b>local warehouses</b> near every neighbourhood (the CDN).</p>
      <p>The smart part is the <b>delivery driver on your street (the player)</b>. Every few seconds he checks how fast the road is today. Fast road? Bring big, crisp bottles. Traffic jam? Bring smaller bottles so the tap never runs dry. You hardly notice — the picture just gets a bit softer for a moment instead of freezing. That is <b>adaptive bitrate streaming</b>.</p>`,
    explain: `<p><b>The job:</b> accept uploaded videos (YouTube) or ingest studio masters (Netflix), convert them into formats that play on every device, and stream them to hundreds of millions of viewers with <b>fast start, no buffering and the best quality the viewer's network allows</b>.</p>
      <h4>Step 1 — Requirements</h4>
      <ul>
        <li><b>Functional:</b> upload video, watch (play/pause/seek), multiple qualities and audio/subtitle tracks, search/browse, view counts and watch history, resume where you left off.</li>
        <li><b>Non-functional:</b> start-up under ~2 s, rebuffering under 1% of watch time, works on 3G through fibre, 99.99% availability for playback, globally distributed; uploads may take minutes to become watchable.</li>
        <li><b>Out of scope (state it):</b> recommendations, ads, live streaming — we will mention live as an extension.</li>
      </ul>
      <h4>Step 2 — Back-of-envelope</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Uploads', '500 hours of video per minute', '720K hours/day'],
        ['Raw storage', '~2 GB per hour of source', '≈ 1.4 PB/day of originals'],
        ['Transcoded copies', '~8 renditions, total ≈ 2× source bytes', '≈ 3 PB/day more → plan for exabytes over years'],
        ['Watching', '1B hours/day at avg 3 Mbps (~1.35 GB/h)', '≈ 1.35 EB/day ≈ 15 TB/s average egress'],
        ['Metadata', '1 KB per video + counters', 'Tiny compared with media'],
        ['Compute', '1 hour of video ≈ 10–30 CPU-hours to encode all renditions', 'Tens of thousands of cores → must parallelise']
      ])}
      <p>Insight: <b>egress bandwidth is the cost monster</b>, so everything bends around the CDN. Netflix goes further and puts its own cache boxes (Open Connect appliances) <i>inside internet providers' networks</i>.</p>
      <h4>Step 3 — APIs</h4>
      <ul>
        <li><code>POST /v1/videos/upload-session {title, size}</code> → resumable upload URL (see the Drive topic)</li>
        <li><code>GET /v1/videos/{id}</code> → metadata + <code>manifest_url</code> (the playlist file)</li>
        <li><code>GET &lt;cdn&gt;/v/{id}/master.m3u8</code> (HLS) or <code>manifest.mpd</code> (DASH) → the list of qualities</li>
        <li><code>GET &lt;cdn&gt;/v/{id}/720p/seg_00042.m4s</code> → a 4-second chunk of video</li>
        <li><code>POST /v1/watch-events {video_id, position, quality}</code> (heartbeats every ~30 s for views, history, QoE)</li>
      </ul>
      <h4>Step 4 — Data model</h4>
      ${H.table(['Data', 'Shape', 'Store'], [
        ['Video metadata', '<code>video_id, owner, title, status (UPLOADED/TRANSCODING/READY), duration, renditions[]</code>', 'Sharded SQL/KV + search index'],
        ['Source + segments', '<code>v/{id}/src.mp4</code>, <code>v/{id}/{rendition}/seg_N.m4s</code>, manifests', 'Object storage → CDN'],
        ['Watch history', '<code>(user_id, video_id) → last position, updated_at</code>', 'Wide-column / KV'],
        ['View counts', 'Events → stream aggregation → <code>video_id → count</code>', 'Kafka + Flink → KV'],
        ['Transcode jobs', '<code>job_id, video_id, chunk, rendition, state</code>', 'Workflow engine DB']
      ])}
      <h4>Step 5 — Architecture</h4>
      <p><b>Upload → raw store → workflow orchestrator</b> that <b>splits</b> the video into chunks → a fleet of <b>transcoders</b> encodes each chunk into each rendition in parallel → <b>packager</b> cuts HLS/DASH segments and writes manifests → <b>origin store</b> → <b>CDN</b> → <b>player</b> that adapts. Watch the pipeline run below, then watch the player adapt in the second visualizer.</p>`,
    clues: [
      '"Design YouTube / Netflix / Twitch VOD" → transcoding pipeline + CDN + ABR',
      '"Play smoothly on slow and fast networks" → adaptive bitrate ladders (HLS / MPEG-DASH)',
      '"Encoding a 2-hour movie takes hours" → split into chunks, encode in parallel, stitch',
      '"Billions of hours watched / bandwidth cost" → CDN, edge caches in ISPs, off-peak cache fill',
      '"Long tail of old videos" → tiered storage, cache only popular content at the edge',
      '"Count views without double-counting" → heartbeat events → stream aggregation + dedupe'
    ],
    code: [
      { lang: 'python', title: 'Adaptive bitrate selection (runnable)', run: true, code: `# Throughput-based ABR with a buffer safety rule, in ~25 lines.
LADDER = [("240p", 0.4), ("360p", 0.8), ("480p", 1.5), ("720p", 3.0), ("1080p", 6.0)]   # Mbps
SEG = 4.0                                                                          # seconds per segment

def simulate(samples):
    est, level, buf, stalls = None, 1, 4.0, 0
    for bw in samples:                                  # bw = measured download speed (Mbps)
        est = bw if est is None else 0.5 * est + 0.5 * bw   # smooth, so one blip doesn't flip quality
        safe = 0.8 * est                                # keep 20% headroom
        target = max([i for i, (_, br) in enumerate(LADDER) if br <= safe] or [0])
        level = level + 1 if target > level else target # climb ONE step at a time, drop immediately
        dl = LADDER[level][1] * SEG / bw                # seconds to download this segment
        buf = buf - dl + SEG                            # playback drains buffer, download refills it
        if buf < 0:
            stalls += 1; buf = 0.0
        buf = min(buf, 30.0)
        print("bw=%.1f est=%.1f -> %-5s dl=%.1fs buffer=%.1fs%s" % (bw, est, LADDER[level][0], dl, buf, "  STALL" if buf == 0 else ""))
    return stalls

print("stalls:", simulate([5, 4, 2.5, 0.9, 0.6, 1.8, 4, 6]))` },
      { lang: 'java', title: 'Chunk planner for parallel transcoding', code: `import java.util.*;

public class ChunkPlanner {
    record Task(int chunk, String rendition, double startSec, double endSec) {}

    // Cut at keyframe (GOP) boundaries only, otherwise chunks are not independently decodable.
    static List<Task> plan(double durationSec, double[] keyframes, double targetChunkSec, String[] renditions) {
        List<double[]> chunks = new ArrayList<>();
        double start = 0;
        for (double kf : keyframes) {
            if (kf - start >= targetChunkSec) { chunks.add(new double[]{start, kf}); start = kf; }
        }
        if (start < durationSec) chunks.add(new double[]{start, durationSec});   // tail chunk
        List<Task> tasks = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++)
            for (String r : renditions) tasks.add(new Task(i, r, chunks.get(i)[0], chunks.get(i)[1]));
        return tasks;
    }

    public static void main(String[] args) {
        double[] keyframes = {2, 4, 6, 8, 10, 12, 14, 16, 18};          // a keyframe every 2 s
        List<Task> t = plan(20, keyframes, 6, new String[]{"240p", "720p", "1080p"});
        System.out.println(t.size() + " independent tasks");            // 4 chunks x 3 renditions = 12
        t.stream().limit(3).forEach(System.out::println);
    }
}` }
    ],
    codeTitle: ['ABR selection (Python, runnable)', 'Parallel transcode planner (Java)'],
    viz: [
      {
        title: 'Transcoding pipeline: split, encode in parallel, package, publish',
        input: '3',
        inputLabel: 'Number of chunks the video is split into (1-6)',
        gen: function (input) {
          var v = ints(input, [3], 1, 6, 'Enter a whole number from 1 to 6');
          var k = v[0], R = 3, total = k * R;
          var nodes = [nd('U', 'Uploader', 8, 8), nd('RAW', 'Raw Store', 32, 8), nd('SP', 'Splitter', 57, 8), nd('T1', 'Encode 240p', 86, 4), nd('T2', 'Encode 720p', 86, 24), nd('T3', 'Encode 1080p', 86, 44),
            nd('PK', 'Packager', 57, 62), nd('OR', 'Origin Store', 32, 62), nd('CDN', 'CDN edge', 8, 62), nd('PL', 'Player', 8, 38)];
          var edges = [['U', 'RAW'], ['RAW', 'SP'], ['SP', 'T1'], ['SP', 'T2'], ['SP', 'T3'], ['T1', 'PK'], ['T2', 'PK'], ['T3', 'PK'], ['PK', 'OR'], ['OR', 'CDN'], ['CDN', 'PL']];
          var F = [];
          function add(narr, hl, ehl, tags, vals) { F.push({ narr: narr, parts: [gp('Transcoding pipeline', nodes, edges, hl, ehl, tags, 74), { type: 'vars', vals: vals }] }); }
          add('A creator uploads a long video. The file lands in the <b>raw store</b> first — it is the master copy we can always re-encode from.', { U: 'cur', RAW: 'ok' }, { 'U-RAW': 'ok' }, { RAW: 'src.mp4' }, { chunks: k, renditions: R, tasks: total, done: 0 });
          add('A workflow engine wakes up. The <b>splitter</b> cuts the video at keyframe boundaries into <b>' + k + '</b> chunks, so each piece can be decoded and encoded on its own.', { RAW: 'done', SP: 'cur' }, { 'RAW-SP': 'ok' }, { SP: k + ' chunks' }, { chunks: k, renditions: R, tasks: total, done: 0 });
          add('Now the fan-out: every chunk × every rendition becomes an independent task = <b>' + k + ' × ' + R + ' = ' + total + ' tasks</b>. They go to a pool of worker machines, hundreds at a time. Encoding one hour on one machine might take 10+ hours; spread over 500 machines it takes minutes.', { SP: 'done', T1: 'cur', T2: 'cur', T3: 'cur' }, { 'SP-T1': 'ok', 'SP-T2': 'ok', 'SP-T3': 'ok' }, { T1: k + ' tasks', T2: k + ' tasks', T3: k + ' tasks' }, { chunks: k, renditions: R, tasks: total, done: 0 });
          add('Workers run. A task can fail (machine dies, spot instance taken away). Because each task is small and its output goes to a deterministic file name, the engine simply <b>re-runs just that task</b> — never the whole movie.', { T1: 'ok', T2: 'ok', T3: 'ok' }, {}, { T1: 'encoding', T2: 'encoding', T3: 'encoding' }, { chunks: k, renditions: R, tasks: total, done: Math.floor(total / 2) });
          add('All ' + total + ' tasks finished. Each rendition now has ' + k + ' encoded chunks waiting to be joined.', { T1: 'done', T2: 'done', T3: 'done', PK: 'cur' }, { 'T1-PK': 'ok', 'T2-PK': 'ok', 'T3-PK': 'ok' }, { PK: 'joining' }, { chunks: k, renditions: R, tasks: total, done: total });
          add('The <b>packager</b> cuts each rendition into short 4-second <b>segments</b> (CMAF/fMP4), optionally encrypts them (DRM: Widevine, FairPlay, PlayReady) and writes a <b>master manifest</b> that lists every quality and where its segments live.', { PK: 'cur' }, {}, { PK: 'segments + manifest' }, { chunks: k, renditions: R, tasks: total, done: total });
          add('Segments and manifests are written to the <b>origin store</b>. Only now is the video marked <b>READY</b> — viewers never see a half-processed video.', { PK: 'done', OR: 'ok' }, { 'PK-OR': 'ok' }, { OR: 'READY' }, { chunks: k, renditions: R, tasks: total, done: total, status: 'READY' });
          add('First viewers request segments. The CDN edge pulls from origin on the first miss and caches; for a premiere, we also <b>pre-warm</b> edges. Netflix pushes popular titles to boxes inside ISPs overnight when the network is quiet.', { OR: 'done', CDN: 'ok' }, { 'OR-CDN': 'ok' }, { CDN: 'caching' }, { status: 'READY', cacheFill: 'off-peak' });
          add('The player downloads the manifest, picks a starting quality, and fetches segments from the nearest edge. From here the player is in charge — see the next visualizer.', { CDN: 'done', PL: 'sel' }, { 'CDN-PL': 'ok' }, { PL: 'playing' }, { status: 'READY', startupTarget: '< 2 s' });
          return F;
        }
      },
      {
        title: 'Adaptive bitrate: the player picks a quality for each 4-second segment',
        input: '5 4 2.5 0.9 0.6 1.8 4 6',
        inputLabel: 'Measured download speed per segment in Mbps (3-10 values)',
        gen: function (input) {
          var s = String(input || '').trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
          if (s.length < 3 || s.length > 10 || s.some(function (x) { return isNaN(x) || x < 0.2 || x > 50; })) throw new Error('Enter 3 to 10 speeds between 0.2 and 50, e.g. 5 4 2.5 0.9 0.6 1.8 4 6');
          var names = ['240p', '360p', '480p', '720p', '1080p'], lad = [0.4, 0.8, 1.5, 3, 6], SEG = 4;
          var est = null, level = 1, buf = 4, stalls = 0, F = [], hist = [], i;
          function r1(x) { return Math.round(x * 10) / 10; }
          F.push({ narr: 'The manifest lists five qualities. Bars show how many Mbps each one needs. The player starts conservatively at <b>360p</b> with only 4 s of video buffered.', parts: [
            { type: 'bars', label: 'Bitrate each quality needs (Mbps)', values: lad.slice(), idxLabels: names, hl: { 1: 'cur' }, ptr: { 1: 'play' } },
            { type: 'vars', vals: { buffer_s: buf, stalls: 0, segment: 0 } }] });
          for (i = 0; i < s.length; i++) {
            var bw = s[i];
            est = est === null ? bw : 0.5 * est + 0.5 * bw;
            var safe = 0.8 * est, target = 0, k;
            for (k = 0; k < lad.length; k++) if (lad[k] <= safe) target = k;
            var up = target > level;
            level = up ? level + 1 : target;
            var dl = lad[level] * SEG / bw;
            buf = buf - dl + SEG;
            var stalled = false;
            if (buf < 0) { stalls++; buf = 0; stalled = true; }
            if (buf > 30) buf = 30;
            hist.push(bw);
            var hl = {}, ptr = {}; hl[level] = stalled ? 'bad' : (up ? 'ok' : 'sel'); ptr[level] = 'play';
            F.push({ narr: 'Segment <b>' + (i + 1) + '</b>: last download ran at <b>' + bw + ' Mbps</b>; smoothed estimate ' + r1(est) + ', with 20% headroom = ' + r1(safe) + '. Best quality that fits: <b>' + names[target] + '</b>. ' + (up ? 'Climb only <b>one step</b> at a time (be careful when going up). ' : (target < level ? '' : 'Drop immediately to be safe. ')) + 'Chosen <b>' + names[level] + '</b> → download takes ' + r1(dl) + ' s for 4 s of video. ' + (stalled ? '<span class="c-r">The buffer ran dry: the video froze (rebuffer).</span>' : 'Buffer is now ' + r1(buf) + ' s.'), parts: [
              { type: 'bars', label: 'Bitrate each quality needs (Mbps)', values: lad.slice(), idxLabels: names, hl: hl, ptr: ptr },
              { type: 'bars', label: 'Measured network speed per segment (Mbps)', values: hist.slice(), hl: (function () { var o = {}; o[hist.length - 1] = 'win'; return o; })() },
              { type: 'vars', vals: { segment: i + 1, bandwidth: bw, estimate: r1(est), quality: names[level], downloadSec: r1(dl), bufferSec: r1(buf), stalls: stalls }, hl: { quality: 'sel', stalls: stalls ? 'bad' : '', bufferSec: buf < 6 ? 'bad' : 'ok' } }] });
          }
          F.push({ narr: 'Session over: <b>' + stalls + '</b> stall' + (stalls === 1 ? '' : 's') + '. Real players also use the <b>buffer level</b> directly (BOLA-style): a full buffer lets them risk a higher quality, a nearly empty one forces a cheap one. Goal: <b>maximise quality, minimise stalls, avoid constant flipping</b> — the three things users notice.', parts: [
            { type: 'bars', label: 'Measured network speed per segment (Mbps)', values: hist.slice() },
            { type: 'vars', vals: { segmentsPlayed: s.length, stalls: stalls, finalQuality: names[level] }, hl: { stalls: stalls ? 'bad' : 'ok' } }] });
          return F;
        }
      }
    ],
    examples: [
      {
        title: 'Worked example — a bitrate ladder and what it costs',
        html: `<p>A typical ladder for one video (H.264, 16:9):</p>
          ${H.table(['Rung', 'Resolution', 'Bitrate', 'Good for'], [
            ['1', '426×240', '0.4 Mbps', 'Weak 3G, data saver'],
            ['2', '640×360', '0.8 Mbps', 'Small phone screens'],
            ['3', '854×480', '1.5 Mbps', 'Average mobile'],
            ['4', '1280×720', '3 Mbps', 'Home wifi, laptop'],
            ['5', '1920×1080', '6 Mbps', 'TV, fast broadband']
          ])}
          <p>One hour of 1080p at 6 Mbps = 6 × 3600 / 8 ≈ <b>2.7 GB</b>. All five rungs together ≈ 12 Mbps total ≈ 5.4 GB per hour — about 2× the single top rendition. Netflix goes further with <b>per-title encoding</b>: a cartoon needs far fewer bits than an action movie for the same quality, so each title gets its own ladder and saves 20–30% bandwidth.</p>`
      },
      {
        title: 'Worked example — what an HLS manifest looks like',
        html: `<p>The player first fetches a small text file that lists the qualities, then a playlist per quality that lists 4-second segment files. Nothing exotic: just text + plain HTTP, which is why every CDN can cache it.</p>`,
        code: { lang: 'text', title: 'master.m3u8 and a media playlist', code: `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=6000000,RESOLUTION=1920x1080
1080p/index.m3u8

# 720p/index.m3u8
#EXTM3U
#EXT-X-TARGETDURATION:4
#EXTINF:4.0,
seg_00001.m4s
#EXTINF:4.0,
seg_00002.m4s
#EXT-X-ENDLIST` }
      },
      {
        title: 'Worked example — parallel encoding speed-up',
        html: `<p>A 2-hour movie, 8 renditions. Suppose encoding runs at 0.25× real-time per rendition on one core (so 1 hour of video costs 4 core-hours per rendition).</p>
          ${H.table(['Plan', 'Math', 'Wall-clock time'], [
            ['One machine, one rendition at a time', '2 h × 4 × 8 renditions = 64 core-hours', '64 hours'],
            ['Split into 60 chunks of 2 min × 8 renditions = 480 tasks, 480 cores', '64 core-hours ÷ 480', '≈ 8 minutes'],
            ['Failure of 5 tasks', 'Re-run only 5 × (2 min × 4) = 40 core-minutes', '+1 minute']
          ])}
          <p>Chunk boundaries must be at keyframes (I-frames), and a "stitch" step with consistent timestamps avoids audible/visible glitches at the seams.</p>`
      },
      {
        title: 'Worked example — view counts without double counting',
        html: `<ol>
          <li>The player sends a heartbeat (<code>video_id, session_id, position</code>) every ~30 s.</li>
          <li>Kafka collects events; a stream job (Flink) counts a <b>view</b> when a session has watched ≥ 30 s (or 50%), de-duplicating on <code>session_id</code>.</li>
          <li>Fraud/bot filters run in the same pipeline (headless browsers, repeated IPs).</li>
          <li>Aggregates are written to a KV store every few seconds; the page shows a cached, slightly stale number. A slower batch job reconciles exact counts nightly (lambda-style).</li>
        </ol>
        <p>Why not <code>UPDATE videos SET views = views + 1</code>? Same hot-row problem as the Instagram likes topic.</p>`
      }
    ],
    deepDive: `<h4>🟣 Deep dive 1 — Codecs, containers and chunk boundaries</h4>
      <p>A <b>codec</b> compresses (H.264/AVC, H.265/HEVC, VP9, AV1) — newer ones save 30–50% bandwidth but are costlier to encode and not supported on every device, so services keep several. A <b>container</b> (MP4/fMP4, WebM) packages the streams. Video is a series of <b>GOPs</b> (groups of pictures) starting with a keyframe that can be decoded alone; segments and encode-chunks must start at keyframes so players can switch quality at any segment boundary. <b>CMAF</b> lets the same fMP4 segments serve both HLS and DASH, halving storage.</p>
      <h4>🟣 Deep dive 2 — The workflow engine (DAG)</h4>
      <p>The pipeline is a <b>directed acyclic graph</b>: validate → probe → split → (chunk × rendition encode) → merge → package → thumbnails/captions/audio → publish. Use a durable workflow engine (Temporal, Airflow, internal schedulers): it persists each step's state so a crashed orchestrator resumes where it left off. Tasks are <b>idempotent</b> (deterministic output paths), retried with backoff, and sent to a dead-letter queue after N failures. Run workers on cheap <b>spot/preemptible</b> machines — preemption is just another retry. Prioritise: a premiere or a popular creator's upload jumps ahead of old-catalogue re-encodes. Often the first 360p/720p renditions are published quickly so people can watch while 4K is still encoding.</p>
      <h4>🟣 Deep dive 3 — ABR algorithms</h4>
      <ul>
        <li><b>Throughput-based:</b> estimate bandwidth from recent downloads (EWMA / harmonic mean), choose the highest rung under ~80% of it. Simple; reacts to noise.</li>
        <li><b>Buffer-based (BBA/BOLA):</b> map buffer level to bitrate: nearly empty → lowest, comfortably full → highest. Robust and avoids estimation errors.</li>
        <li><b>Hybrid / learned (MPC, Pensieve, production ML):</b> predict the next few seconds and optimise quality − stall penalty − switch penalty.</li>
        <li><b>Startup:</b> begin with a low rung and a short first segment so playback starts in under 2 s, then ramp up. Segment length trade-off: short (2 s) = adapts fast but more requests and overhead; long (10 s) = efficient but slow to react.</li>
        <li>The <b>server stays dumb</b>: it only serves static files. All intelligence is in the client, which is what makes CDNs usable.</li>
      </ul>
      <h4>🟣 Deep dive 4 — CDN strategy</h4>
      <p>Videos follow a heavy long tail: 10–20% of titles drive 80–90% of views. Cache popular segments at the edge, mid-tier caches for warm ones, origin for cold. <b>Netflix Open Connect</b> places appliances inside ISPs; each night, during quiet hours, it <b>fills</b> them with the titles predicted to be popular tomorrow in that region (cache fill), so peak-time viewing is served locally and never crosses the internet backbone. YouTube-style catalogues are far larger and less predictable, so they rely more on reactive pull-through caching with request coalescing. Use consistent hashing among edge servers so the same segment lives on a predictable box and a hot segment can be replicated.</p>
      <h4>🟣 Deep dive 5 — Resume, seek and metadata</h4>
      <p>Seeking = jump to the segment containing that timestamp (index from the playlist) and start decoding at its keyframe — that is why segments are short. Resume position is a tiny write per heartbeat to a KV store keyed by (user, video), last-write-wins. Thumbnails scrubbing uses a sprite sheet generated during processing.</p>
      <h4>🟣 Deep dive 6 — Live streaming extension</h4>
      <p>Live replaces the "split a finished file" step with a continuous <b>ingest → encode → package → CDN</b> loop at ~2–6 s of latency (LL-HLS / LL-DASH can reach 2–3 s, WebRTC under 1 s but harder to scale). Latency budget = capture + encode + segment length + CDN + player buffer. The CDN must handle a thundering herd all requesting the <i>newest</i> segment at once, so use request collapsing at every cache layer.</p>
      <h4>🟣 Deep dive 7 — Trade-offs</h4>
      ${H.table(['Decision', 'Option A', 'Option B'], [
        ['Storage vs compute', 'Pre-encode all renditions (costs storage, instant playback)', 'Encode on demand / just-in-time for rarely watched videos (saves storage, slower first play)'],
        ['Segment size', '2 s: snappy switching, more overhead', '6–10 s: efficient, sluggish switching'],
        ['Codec', 'H.264 everywhere (compatible)', 'AV1 for popular titles on supporting devices (cheaper bandwidth)'],
        ['CDN', 'Third-party only (fast to start)', 'Own edge boxes in ISPs (cheapest at Netflix scale, big engineering cost)']
      ])}`,
    aiEra: `<p><b>What AI changes:</b> AI is now inside the pipeline. <b>ML-driven encoding</b> picks per-scene bitrates by predicted perceptual quality (VMAF) instead of fixed ladders; <b>super-resolution</b> on the device can upscale a cheap 720p stream; <b>auto-captions and dubbing</b> use speech models, and translation creates new audio tracks; <b>content understanding</b> (scene detection, auto-chapters, thumbnail selection, moderation, copyright fingerprinting) runs on every upload; recommendation models decide what to pre-warm in each region's CDN. Generative video makes uploads of synthetic content common, so provenance labelling is an input to the publish step.</p>
      <p><b>Use AI as a partner:</b> ask <code>Simulate an ABR algorithm on this bandwidth trace and compare stalls vs average quality for segment sizes 2 s and 6 s</code>; have it draft the workflow DAG and the failure/retry matrix; get it to generate a synthetic watch-event stream for load-testing the view counter.</p>
      <p><b>Where AI goes wrong:</b> it recommends streaming the raw file over one HTTP connection, or "transcode on every request"; it forgets keyframe-aligned chunking and DRM; it hand-waves the CDN economics. <b>What you must still own:</b> the egress math, the chunk-parallel idempotent pipeline, the dumb-server/smart-client ABR split, and the cache-fill strategy.</p>`,
    problems: [
      {
        title: 'Resilient Transcoding Pipeline for a 2-Hour Movie',
        level: 'Medium', tags: ['transcoding', 'workflow', 'idempotency'], companies: ['Netflix', 'YouTube', 'Amazon Prime Video'],
        statement: `<p>Studios deliver a 2-hour 4K master. You must produce 8 renditions with audio and subtitle tracks and make it playable within <b>15 minutes</b>, using cheap preemptible machines that can vanish at any moment. Design the pipeline and explain how you handle failures, retries and partial results.</p>`,
        constraints: `Encoding speed ≈ 0.25× real-time per core per rendition. Up to 2,000 cores available. Workers may be preempted. Output must be bit-identical on retry for cache safety.`,
        example: `<p>Plan: 120 chunks × 8 renditions = 960 tasks on 960 cores. A 2 h source is 8 core-hours per rendition ⇒ 64 core-hours total ÷ 960 cores ≈ 4 minutes of pure encode, plus overhead for split, packaging and upload ≈ 10 minutes. Three workers die mid-task: only those 3 tasks (1 minute each) rerun.</p>`,
        brute: { why: `<p><b>Naive design:</b> one big server encodes the whole file rendition by rendition. 64 core-hours on one multi-core box takes many hours; if the machine dies at hour 5 everything restarts; one slow rendition blocks the rest; the CPU sits idle during uploads.</p>` },
        mcq: { q: 'Why are chunk boundaries aligned to keyframes?', options: ['It makes files smaller', 'Each chunk can be decoded and encoded independently, and players can switch quality at boundaries', 'Keyframes contain the audio', 'The CDN requires it'], answer: 1, explain: 'A keyframe (I-frame) is decodable without earlier frames. Cutting elsewhere would make chunks depend on neighbours, breaking parallelism and seamless quality switching.' },
        hints: [
          `<p>Hint 1: The work is "embarrassingly parallel" if you cut the video into independent pieces. What is the natural cut point?</p>`,
          `<p>Hint 2: Make every task a pure function (input chunk + settings → output file) with a deterministic output name, so retries are safe and checking "is it already done?" is just a file-exists test.</p>`,
          `<p>Hint 3: Use a workflow engine that persists task states, a queue with visibility timeouts, a dead-letter queue, and a final stitch/package step that waits for all tasks of a rendition. Publish a quick low-res version first if latency matters.</p>`
        ],
        solution: {
          approach: `<p><b>Pipeline.</b></p>
            <ol>
              <li><b>Ingest &amp; probe:</b> store the master in object storage, run ffprobe to read codec, frame rate, duration, audio/subtitle streams; validate (corrupt or unsupported = fail fast with a clear error to the studio).</li>
              <li><b>Split:</b> find keyframes, cut into ~60 s chunks aligned on GOP boundaries (≈120 chunks). Audio is processed separately (small, fast) into AAC/Dolby tracks; subtitles are converted to WebVTT/TTML.</li>
              <li><b>Task graph:</b> create a task per (chunk, rendition) = 960 video tasks, tracked in the workflow engine (Temporal) with states PENDING / RUNNING / DONE / FAILED. Each task reads <code>master/chunk_i</code> and writes <code>enc/{rendition}/chunk_i.mp4</code> — a deterministic key, so a re-run overwrites the identical object (idempotent).</li>
              <li><b>Execution &amp; failures:</b> workers on spot instances pull tasks via a queue with a visibility timeout (about 3× the typical task time) and heartbeat. If a worker disappears, the task reappears and another worker takes it. Retry with backoff up to 3 times, then dead-letter and alert; a single bad chunk never blocks other renditions.</li>
              <li><b>Stitch &amp; package:</b> when all chunks of a rendition are DONE, a packager concatenates them, cuts 4 s CMAF segments with continuous timestamps, applies DRM encryption keys from the key service, writes HLS/DASH manifests.</li>
              <li><b>Quality gate:</b> automated checks (VMAF vs. master on sampled frames, duration match, audio sync) before publish.</li>
              <li><b>Publish:</b> upload to origin, mark READY with an atomic metadata flip, pre-warm CDNs for expected-popular titles.</li>
              <li><b>Speed:</b> 64 core-hours / 960 cores ≈ 4 min of encode; with split, packaging, QC and uploads the 15-minute target is realistic. Prioritise queue slots by business importance.</li>
            </ol>
            <p>Trade-offs: more chunks = more parallelism but more seams and overhead; fewer = simpler. Spot instances cut cost ~70% in exchange for retries.</p>`,
          complexity: `<p>Work is ~O(duration × renditions) core-time but wall-clock is ≈ that ÷ cores plus fixed overhead. Retry cost on failure is bounded by one chunk, not the whole movie.</p>`,
          followUps: ['How would you re-encode the whole back catalogue to AV1 without hurting new uploads?', 'How do you guarantee audio/video sync across chunks?', 'How would this change for live streaming?']
        }
      }
    ]
  });

  /* ================= TOPIC 5: Google Drive ================= */
  topics.push({
    title: 'Google Drive: File Sync, Chunking, Dedup & Conflict Resolution',
    analogy: `<p>Imagine a <b>shared binder of recipes</b> that lives in three kitchens (your laptop, phone and the cloud). Instead of photocopying the whole binder whenever you fix a typo, you tear the binder into <b>numbered pages</b>, stamp each page with a <b>fingerprint</b> of its contents, and keep a master index "page 1 = fingerprint X, page 2 = fingerprint Y...". When one page changes, only that page gets re-copied. If two cooks change the <i>same page</i> at the same time while one of them is away from the internet, the librarian doesn't throw either version away — she keeps both and puts a sticky note "conflicted copy" on the second one.</p>
      <p>Also, if a hundred people store the identical page (say, the same movie file), the library keeps <b>one</b> physical page and just writes a reference in each person's index. That is <b>deduplication</b>.</p>`,
    explain: `<p><b>The job:</b> store people's files safely in the cloud, keep them <b>in sync across all their devices</b>, let them share files, and make syncing fast even for huge files and flaky networks.</p>
      <h4>Step 1 — Requirements</h4>
      <ul>
        <li><b>Functional:</b> upload/download files up to ~5 TB, automatic sync across devices (including offline edits), folders, sharing with permissions, version history, resume interrupted transfers.</li>
        <li><b>Non-functional:</b> <b>reliability above everything</b> (losing a user's file is the worst failure), strong consistency for metadata (a file must not appear half-updated), bandwidth efficiency (don't resend unchanged bytes), low sync latency (seconds), massive storage scale.</li>
      </ul>
      <h4>Step 2 — Back-of-envelope</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Stored data', '1B users × avg 2 GB', '≈ 2 EB logical (dedup + compression may cut 30–50%)'],
        ['Chunks', '2 EB ÷ 4 MB chunks', '≈ 5 × 10<sup>11</sup> chunk records'],
        ['Chunk metadata', '5×10<sup>11</sup> × ~100 B', '≈ 50 TB of metadata — shard it'],
        ['Sync events', '200M DAU × 10 changed files', '2B/day ≈ 23K commits/s (peak ~70K)'],
        ['Bandwidth saved', 'Edit 1 chunk of a 1 GB file', 'Send 4 MB instead of 1 GB (250× less)'],
        ['Durability', 'Erasure coding across zones', '11 nines (99.999999999%) per object per year']
      ])}
      <h4>Step 3 — APIs</h4>
      <ul>
        <li><code>POST /v1/blocks/check {hashes[]}</code> → which chunk hashes the server does <b>not</b> have yet</li>
        <li><code>PUT /v1/blocks/{hash}</code> (upload one chunk; server verifies the hash)</li>
        <li><code>POST /v1/files/commit {path, base_version, chunk_hashes[]}</code> → new version, or <code>409 Conflict</code></li>
        <li><code>GET /v1/changes?cursor=…</code> (long-poll) → list of changed files since cursor</li>
        <li><code>GET /v1/files/{id}</code> → chunk list; client downloads missing chunks; <code>POST /v1/files/{id}/share {user, role}</code></li>
      </ul>
      <h4>Step 4 — Data model</h4>
      ${H.table(['Data', 'Shape', 'Store'], [
        ['File metadata', '<code>file_id, parent_id, name, owner, version, size, chunk_hashes[], mtime</code>', 'Strongly consistent sharded SQL (Spanner / MySQL / Postgres)'],
        ['Chunk index', '<code>hash → storage location, refcount</code>', 'Sharded KV'],
        ['Chunks (blocks)', '<code>hash → bytes (≤ 4 MB, compressed + encrypted)</code>', 'Object storage with erasure coding'],
        ['Change log', '<code>(namespace, seq) → file_id, op, version</code>', 'Append-only log per namespace'],
        ['Sharing / ACL', '<code>(file_id, principal) → role</code>', 'SQL, cached']
      ])}
      <h4>Step 5 — Architecture</h4>
      <p>The <b>desktop/mobile client</b> watches folders, splits changed files into chunks, hashes them, and asks the <b>block server</b> which hashes are new. It uploads only those, then asks the <b>metadata server</b> to commit a new version (a list of chunk hashes). The commit appends to a <b>change log</b>; a <b>notification service</b> pings the user's other devices, which fetch the change list and download only the chunks they lack. Metadata and block storage are separate systems: tiny, hot, consistent metadata versus huge, cold, replicated blobs.</p>`,
    clues: [
      '"Design Dropbox / Google Drive / OneDrive / iCloud" → chunking + hashing + metadata/block split',
      '"Large files must upload reliably on bad networks" → chunked, resumable uploads',
      '"Don\'t re-upload the whole file after a small edit" → block-level delta sync',
      '"Same file stored by many users" → content-addressed storage + dedup',
      '"Two devices edited offline" → versioning + optimistic concurrency + conflict copies (or OT/CRDT for live docs)',
      '"Notify other devices of changes" → change log with cursor + long-poll / WebSocket'
    ],
    code: [
      { lang: 'python', title: 'Chunk, hash, dedup and delta-sync (runnable)', run: true, code: `import hashlib

CHUNK = 8   # tiny so we can see it; real systems use ~4 MB

def chunk_hashes(data: bytes, size=CHUNK):
    """Split into fixed-size chunks and return [(hash, chunk)]."""
    return [(hashlib.sha256(data[i:i + size]).hexdigest()[:8], data[i:i + size])
            for i in range(0, len(data), size)]

class BlockStore:
    def __init__(self):
        self.blocks = {}            # hash -> bytes   (content-addressed: same content = same key)
        self.refs = {}              # hash -> reference count (needed for safe garbage collection)
        self.bytes_uploaded = 0

    def missing(self, hashes):      # POST /blocks/check
        return [h for h in dict.fromkeys(hashes) if h not in self.blocks]

    def put(self, h, chunk):        # PUT /blocks/{hash}
        assert hashlib.sha256(chunk).hexdigest()[:8] == h, "client lied about the hash"
        self.blocks[h] = chunk
        self.bytes_uploaded += len(chunk)

    def commit(self, hashes):       # file version = just a list of hashes
        for h in hashes:
            self.refs[h] = self.refs.get(h, 0) + 1

def sync(store, data):
    pairs = chunk_hashes(data)
    hashes = [h for h, _ in pairs]
    need = set(store.missing(hashes))
    for h, c in pairs:
        if h in need:
            store.put(h, c); need.discard(h)    # upload each new chunk once
    store.commit(hashes)
    return hashes

store = BlockStore()
v1 = b"AAAAAAAABBBBBBBBAAAAAAAACCCCCCCC"        # chunks A B A C  -> only 3 unique
sync(store, v1)
print("v1 uploaded:", store.bytes_uploaded, "of", len(v1), "bytes")     # 24 of 32 (duplicate chunk A skipped)

before = store.bytes_uploaded
v2 = b"AAAAAAAABBBBBBBBAAAAAAAADDDDDDDD"        # edit only the last chunk
sync(store, v2)
print("v2 uploaded:", store.bytes_uploaded - before, "of", len(v2), "bytes")   # 8 of 32 (delta sync)

before = store.bytes_uploaded
sync(store, b"X" + v2)                          # insert ONE byte at the front...
print("insert-at-front uploaded:", store.bytes_uploaded - before, "of", len(v2) + 1, "bytes")   # every chunk shifted!` },
      { lang: 'java', title: 'Content-defined chunking with a gear hash', code: `import java.util.*;

public class Cdc {
    // Cut where the rolling hash matches a pattern, NOT at fixed offsets. Inserting a byte
    // near the start then only changes the nearby chunk, because later cut points depend on
    // content, not position.
    static final long[] GEAR = new long[256];
    static {
        Random r = new Random(12345);                  // fixed seed: every client must agree
        for (int i = 0; i < 256; i++) GEAR[i] = r.nextLong();
    }

    static List<int[]> chunk(byte[] data, int minSize, int maxSize, long mask) {
        List<int[]> out = new ArrayList<>();           // each entry = {start, end}
        int start = 0;
        long h = 0;
        for (int i = 0; i < data.length; i++) {
            h = (h << 1) + GEAR[data[i] & 0xff];       // rolling "gear" hash
            int len = i - start + 1;
            boolean cut = (len >= minSize && (h & mask) == 0) || len >= maxSize;
            if (cut) { out.add(new int[]{start, i + 1}); start = i + 1; h = 0; }
        }
        if (start < data.length) out.add(new int[]{start, data.length});
        return out;
    }

    public static void main(String[] args) {
        byte[] d = new byte[200_000];
        new Random(1).nextBytes(d);
        // average chunk ~ 2^13 = 8 KB; min 2 KB, max 64 KB
        List<int[]> a = chunk(d, 2048, 65536, (1L << 13) - 1);
        byte[] d2 = new byte[d.length + 1];            // insert one byte at the very front
        System.arraycopy(d, 0, d2, 1, d.length);
        List<int[]> b = chunk(d2, 2048, 65536, (1L << 13) - 1);
        // count boundaries (shifted by 1) that survived the insertion
        Set<Integer> ends = new HashSet<>();
        for (int[] c : a) ends.add(c[1] + 1);
        int same = 0;
        for (int[] c : b) if (ends.contains(c[1])) same++;
        System.out.println(a.size() + " chunks before, " + same + " of " + b.size() + " boundaries unchanged after the insert");
    }
}` }
    ],
    codeTitle: ['Fixed-size chunking, dedup, delta sync (Python, runnable)', 'Content-defined chunking (Java)'],
    viz: [
      {
        title: 'Chunk, hash and dedup: only unseen chunks are uploaded',
        input: 'ABCDABCDWXYZABCDWXYZ',
        inputLabel: 'File content (letters/digits, up to 32 characters); chunk size is 4',
        gen: function (input) {
          var s = String(input === undefined ? '' : input).trim();
          if (!/^[A-Za-z0-9]{4,32}$/.test(s)) throw new Error('Use 4 to 32 letters or digits, e.g. ABCDABCDWXYZABCDWXYZ');
          var SZ = 4, chunks = [], i;
          for (i = 0; i < s.length; i += SZ) chunks.push(s.substr(i, SZ));
          function hash(c) { var h = 7; for (var k = 0; k < c.length; k++) h = (h * 31 + c.charCodeAt(k)) % 4096; var x = h.toString(16); while (x.length < 3) x = '0' + x; return '#' + x; }
          var hashes = chunks.map(hash), stored = [], F = [], up = 0, dd = 0;
          F.push({ narr: 'The file has ' + s.length + ' characters. We cut it into fixed-size <b>chunks of 4</b> (real systems use ~4 MB): <b>' + chunks.join(' | ') + '</b>. A chunk is the unit we hash, upload and dedupe.', parts: [
            { type: 'array', label: 'Chunks of the file', values: chunks.slice(), showIdx: true },
            { type: 'set', label: 'Server block store (hashes it already has)', items: [] }] });
          for (i = 0; i < chunks.length; i++) {
            var dup = stored.indexOf(hashes[i]) >= 0, h1 = {}, p1 = {}, sh = {};
            h1[i] = dup ? 'bad' : 'ok'; p1[i] = 'now'; sh[hashes[i]] = dup ? 'bad' : 'ok';
            if (!dup) { stored.push(hashes[i]); up += SZ; } else dd += SZ;
            F.push({ narr: 'Chunk ' + i + ' = "<b>' + chunks[i] + '</b>" → fingerprint <b>' + hashes[i] + '</b> (a real system uses SHA-256). ' + (dup ? '<span class="c-r">The server already has this fingerprint → skip the upload</span>, just record a reference (<b>dedup</b>).' : '<span class="c-g">New fingerprint → upload this chunk</span> and add it to the store.'), parts: [
              { type: 'array', label: 'Chunks of the file', values: chunks.slice(), hl: h1, ptr: p1, showIdx: true },
              { type: 'array', label: 'Fingerprints so far (the file\'s "recipe")', values: hashes.slice(0, i + 1) },
              { type: 'set', label: 'Server block store', items: stored.slice(), hl: sh },
              { type: 'vars', vals: { uploadedChars: up, skippedChars: dd, totalChars: s.length }, hl: { uploadedChars: 'ok', skippedChars: dd ? 'bad' : '' } }] });
          }
          var saved = Math.round(100 * dd / s.length);
          F.push({ narr: 'Done. The file is stored as the <b>recipe</b> ' + hashes.join(' ') + '. We uploaded <b>' + up + '</b> of ' + s.length + ' characters — <b>' + saved + '% saved</b>. Another user uploading an identical chunk costs nothing, and the block store keeps a <b>reference count</b> per fingerprint so a chunk is only deleted when nobody uses it.', parts: [
            { type: 'array', label: 'File recipe (ordered chunk hashes)', values: hashes.slice(), hl: (function () { var o = {}; hashes.forEach(function (h, k) { o[k] = stored.indexOf(h) === hashes.indexOf(h) ? 'ok' : 'bad'; }); return o; })() },
            { type: 'set', label: 'Server block store', items: stored.slice() },
            { type: 'vars', vals: { uploadedChars: up, skippedChars: dd, savedPercent: saved }, hl: { savedPercent: 'sel' } }] });
          return F;
        }
      },
      {
        title: 'Delta sync: edit vs insert with fixed-size chunks',
        input: 'ABCDEFGHIJKLMNOP|ABCDEFXHIJKLMNOP',
        inputLabel: 'old|new file content (letters, up to 24 chars each; try inserting a letter at the front!)',
        gen: function (input) {
          var parts = String(input === undefined ? '' : input).split('|');
          if (parts.length !== 2 || !/^[A-Za-z0-9]{4,24}$/.test(parts[0].trim()) || !/^[A-Za-z0-9]{4,24}$/.test(parts[1].trim())) throw new Error('Format: old|new  e.g. ABCDEFGHIJKLMNOP|ABCDEFXHIJKLMNOP');
          var a = parts[0].trim(), b = parts[1].trim(), SZ = 4;
          function cut(s) { var o = []; for (var i = 0; i < s.length; i += SZ) o.push(s.substr(i, SZ)); return o; }
          var ca = cut(a), cb = cut(b), F = [], k;
          F.push({ narr: 'Version 1 is already synced as chunks <b>' + ca.join(' | ') + '</b>. The user edits the file, producing version 2 = <b>' + cb.join(' | ') + '</b>. The client re-chunks and re-hashes the new file.', parts: [
            { type: 'array', label: 'Synced chunks (v1, on the server)', values: ca.slice(), showIdx: true },
            { type: 'array', label: 'New chunks (v2, on the laptop)', values: cb.slice(), showIdx: true }] });
          var changed = 0, hl = {};
          for (k = 0; k < cb.length; k++) {
            var isSame = ca.indexOf(cb[k]) >= 0;
            hl[k] = isSame ? 'ok' : 'bad';
            if (!isSame) changed++;
            var snap = {}; for (var q = 0; q <= k; q++) snap[q] = hl[q];
            var ptr = {}; ptr[k] = 'check';
            F.push({ narr: 'New chunk ' + k + ' = "<b>' + cb[k] + '</b>": ' + (isSame ? '<span class="c-g">the server already has an identical chunk → nothing to send</span>.' : '<span class="c-r">no identical chunk exists on the server → must upload</span>.'), parts: [
              { type: 'array', label: 'Synced chunks (v1)', values: ca.slice() },
              { type: 'array', label: 'New chunks (v2)', values: cb.slice(), hl: snap, ptr: ptr }] });
          }
          var sent = changed * SZ;
          F.push({ narr: 'Result: <b>' + changed + '</b> of ' + cb.length + ' chunks must travel (' + sent + ' of ' + b.length + ' characters). ' + (changed >= cb.length && cb.length > 1 ? '<span class="c-r">Everything changed!</span> Inserting at the front shifted every later byte, so every fixed-size boundary moved. This is the weakness of fixed-size chunks; <b>content-defined chunking</b> (cut where a rolling hash matches a pattern) fixes it, because boundaries follow the content.' : 'An in-place edit only touches the chunk that contains it — that is why a 1 GB file with a one-line change syncs in milliseconds.'), parts: [
            { type: 'array', label: 'New chunks (v2): green = skipped, red = uploaded', values: cb.slice(), hl: hl },
            { type: 'vars', vals: { chunksTotal: cb.length, chunksUploaded: changed, charsSent: sent, charsTotal: b.length }, hl: { chunksUploaded: changed ? 'bad' : 'ok' } }] });
          return F;
        }
      },
      {
        title: 'Sync conflict: optimistic concurrency with base versions',
        input: 'conflict',
        inputLabel: 'Scenario: conflict (both edit report.doc offline) or clean (different files)',
        gen: function (input) {
          var mode = String(input || 'conflict').trim().toLowerCase();
          if (mode !== 'conflict' && mode !== 'clean') throw new Error('Type "conflict" or "clean"');
          var conflict = mode === 'conflict';
          var f2 = conflict ? 'report.doc' : 'notes.txt';
          var F = [];
          function tbl(rows, hl, narr) {
            F.push({ narr: narr, parts: [{ type: 'table', label: 'State of each copy', columns: ['Where', 'report.doc', 'notes.txt'], rows: rows, hl: hl || {} }] });
          }
          tbl([['Cloud (truth)', 'v3', 'v7'], ['Phone', 'v3', 'v7'], ['Laptop', 'v3', 'v7']], {}, 'Everything starts in sync: the cloud has <b>report.doc v3</b> and <b>notes.txt v7</b>, and both the phone and laptop have exactly those. Each device remembers the <b>base version</b> it last synced.');
          tbl([['Cloud (truth)', 'v3', 'v7'], ['Phone', 'v3', 'v7'], ['Laptop (offline!)', conflict ? 'v3 + local edit' : 'v3', conflict ? 'v7' : 'v7 + local edit']], { 2: 'cur' }, 'The laptop loses its network (plane mode) and the user edits <b>' + f2 + '</b>. The edit is saved locally and queued: "commit ' + f2 + ', base = ' + (conflict ? 'v3' : 'v7') + '".');
          tbl([['Cloud (truth)', 'v4', 'v7'], ['Phone (edited report.doc)', 'v4', 'v7'], ['Laptop (offline)', conflict ? 'v3 + local edit' : 'v3', conflict ? 'v7' : 'v7 + local edit']], { 0: 'ok', 1: 'ok' }, 'Meanwhile on the phone (online) the user edits <b>report.doc</b>. The phone commits with <code>base = v3</code>. The cloud\'s current version is v3 = base, so the commit succeeds and the cloud becomes ' + (conflict ? '<b>v4</b>' : '<b>v4</b> for report.doc') + '. This is <b>optimistic concurrency</b>: no locks, just "I based my change on v3 — is that still current?"');
          if (conflict) {
            tbl([['Cloud (truth)', 'v4', 'v7'], ['Phone', 'v4', 'v7'], ['Laptop (back online)', 'v3 + local edit', 'v7']], { 2: 'cur' }, 'The laptop reconnects and tries to commit <code>report.doc base = v3</code>. The cloud is at <b>v4 ≠ v3</b>, so someone else changed it in the meantime → server answers <span class="c-r">409 Conflict</span>. Silently overwriting would destroy the phone\'s edit.');
            tbl([['Cloud (truth)', 'v4  +  "report (conflicted copy, Laptop).doc" v1', 'v7'], ['Phone', 'v4 + conflicted copy', 'v7'], ['Laptop', 'v4 + conflicted copy', 'v7']], { 0: 'sel' }, '<b>Resolution — keep both.</b> The client uploads its edit as a brand-new file "report (conflicted copy – Laptop).doc". Nothing is lost. Every device downloads v4 and the conflict copy. The user (or a merge tool) decides what to keep. Collaborative docs (Google Docs) avoid this entirely using <b>OT/CRDT</b> merging of edits.');
          } else {
            tbl([['Cloud (truth)', 'v4', 'v7'], ['Phone', 'v4', 'v7'], ['Laptop (back online)', 'v3', 'v7 + local edit']], { 2: 'cur' }, 'The laptop reconnects and commits <code>notes.txt base = v7</code>. The cloud still has notes.txt at v7 = base, so there is <span class="c-g">no conflict</span>: different files never collide.');
            tbl([['Cloud (truth)', 'v4', 'v8'], ['Phone', 'v4', 'v8 (downloaded)'], ['Laptop', 'v4 (downloaded)', 'v8']], { 0: 'ok' }, 'Cloud now has report.doc v4 and notes.txt v8. The change log tells each device what to download, so all three converge. Conflicts only appear when two changes share the <b>same base version of the same file</b>.');
          }
          return F;
        }
      }
    ],
    examples: [
      {
        title: 'Worked example — choosing the chunk size',
        html: `<p>Chunk size is a balancing act:</p>
          ${H.table(['Chunk size', 'Pros', 'Cons'], [
            ['64 KB', 'Tiny deltas, fine-grained dedup', '1 TB file = 16M chunks of metadata, more requests, more overhead'],
            ['4 MB', 'Good balance (Dropbox-like): few records, efficient transfers', 'A 1-byte edit re-sends 4 MB'],
            ['64 MB', 'Very little metadata', 'Edits and resumed uploads re-send huge pieces; poor dedup']
          ])}
          <p>Metadata cost: 2 EB with 4 MB chunks needs ~50 TB of index (we computed this above). With 64 KB chunks it would be ~3 PB — expensive. Many systems use <b>variable chunk sizes</b>: content-defined chunking averaging ~4 MB.</p>`
      },
      {
        title: 'Worked example — resumable upload of a 1 GB video on bad wifi',
        html: `<ol>
          <li>Client: <code>POST /upload-session {size: 1 GB, hash}</code> → <code>session_id=U9</code>, chunk size 8 MB (128 chunks).</li>
          <li>Client sends chunk 0..40 (<code>PUT /upload/U9?part=N</code> with a checksum header); the server stores each part and records it as received.</li>
          <li>The wifi dies after part 40. Next day the app asks <code>GET /upload/U9</code> → server answers "have parts 0–40".</li>
          <li>Client continues from part 41. A part that was in flight is simply re-sent; re-uploading an existing part is idempotent (same part number, same checksum).</li>
          <li>After part 127, <code>POST /upload/U9/complete</code>: the server verifies all parts and the whole-file hash, then commits the file version.</li>
        </ol>
        <p>Sessions expire after ~7 days, and a janitor job deletes abandoned parts so they don't cost storage forever.</p>`
      },
      {
        title: 'Worked example — versions are cheap because chunks are shared',
        html: `<p>A 1 GB file (250 chunks) is edited 10 times, changing 1 chunk each time. Naïve versioning stores 11 × 1 GB = 11 GB. With chunk recipes, each version is a list of 250 hashes (~8 KB) and only changed chunks are new: total ≈ 1 GB + 10 × 4 MB = <b>1.04 GB</b>. "Restore version 4" just points the file at that older recipe — all its chunks are still there (reference counts keep them alive). Old versions are removed by a retention policy (e.g. 30 days or 100 versions); a chunk is garbage-collected only when its refcount hits zero, after a safety delay.</p>`
      },
      {
        title: 'Worked example — sharing and permissions check',
        html: `<p>Permissions live in the metadata service: <code>(file_id, principal, role)</code> with inheritance from folders. Opening a file means: authenticate → resolve the file's ACL (folder chain, groups, link-sharing settings) → authorise → return a <b>short-lived signed URL</b> for the chunk downloads. Never rely on the hash being "secret": possession of a chunk hash must <b>not</b> grant access to it (see the dedup privacy discussion).</p>
          ${H.table(['Role', 'Can'], [['Viewer', 'read, download'], ['Commenter', 'read + comment'], ['Editor', 'read, write, create versions'], ['Owner', 'all + share, delete, transfer']])}`
      }
    ],
    deepDive: `<h4>🟣 Deep dive 1 — Metadata vs block servers</h4>
      <p>Splitting the system is the key architectural move. <b>Block storage</b> is dumb and huge: content-addressed blobs, replicated or erasure-coded (e.g. 10 data + 4 parity pieces spread over zones — tolerates losing 4 pieces at ~1.4× storage overhead instead of 3× for triple replication). <b>Metadata</b> is small but must be <b>strongly consistent and transactional</b>: renaming a folder with a million files must be atomic and never expose half-moved states. Store each file by <code>file_id</code> with a <code>parent_id</code> pointer so a folder rename or move is a single row update, not a million path rewrites. Shard metadata by user/namespace so most transactions stay on one shard.</p>
      <h4>🟣 Deep dive 2 — Content-defined chunking and hashing</h4>
      <p>Fixed-size chunks break on inserts (everything shifts). <b>Content-defined chunking</b> slides a small window over the bytes with a rolling hash (Rabin fingerprint, gear hash, FastCDC) and declares a boundary where the hash matches a bit pattern, with min/max sizes to bound variance. Then inserting a byte only changes the chunk(s) around it. The chunk's identity is a cryptographic hash (SHA-256): collision probability is negligible (~2<sup>-128</sup> at astronomically large counts), so equal hashes mean equal content. Cost: chunking is CPU work on the client; use hardware SHA instructions and hash in the background.</p>
      <h4>🟣 Deep dive 3 — Deduplication, privacy and security</h4>
      <ul>
        <li><b>Per-user dedup</b> is safe and still saves a lot (versions, copies). <b>Global (cross-user) dedup</b> saves more (everyone has the same movie) but leaks a <b>side channel</b>: if "upload skipped" is visible, an attacker can test whether a specific file already exists in the system. Mitigations: don't expose the skip to clients (always run the full-looking upload flow), require proof-of-possession (server challenges the client to hash random byte ranges of the file), or limit cross-user dedup to popular content seen by many accounts.</li>
        <li><b>Encryption and dedup fight each other:</b> if every user encrypts with a private key, identical files produce different ciphertexts, defeating dedup. <b>Convergent encryption</b> (key = hash of the content) restores dedup but is vulnerable to guess-the-file attacks. Most consumer services encrypt at rest with server-managed keys (so dedup works) and offer optional client-side encryption (no dedup) for sensitive data.</li>
        <li>Verify the hash server-side on upload so a malicious client cannot poison a chunk.</li>
      </ul>
      <h4>🟣 Deep dive 4 — The sync protocol</h4>
      <ol>
        <li>Each user namespace has a monotonic <b>change log</b>. Every commit appends <code>(seq, file_id, op, version)</code>.</li>
        <li>A device remembers its <b>cursor</b> (last seq seen). It long-polls <code>/changes?cursor=…</code>; the notification service answers when the log moves. This is cheap because "nothing changed" holds one open connection.</li>
        <li>On a change, the device downloads the new chunk list, diffs it against local chunks, and fetches only the missing ones.</li>
        <li>Commits carry a <code>base_version</code>. The metadata service does a compare-and-swap in a transaction. Success → version+1; mismatch → 409 → client conflict logic.</li>
        <li>Local file-system watchers (inotify, FSEvents, ReadDirectoryChangesW) detect edits; a short debounce (~1–2 s) avoids uploading every keystroke of a save.</li>
        <li>Handling partial state: if the client crashes between "chunks uploaded" and "commit", the chunks are orphans (harmless; GC'd later). The file version only appears at commit, so readers never see half-written files.</li>
      </ol>
      <h4>🟣 Deep dive 5 — Conflict strategies</h4>
      ${H.table(['Strategy', 'How', 'Good for', 'Downside'], [
        ['Last-write-wins', 'Highest timestamp/version wins', 'Settings, caches', 'Silently loses data — avoid for user files'],
        ['Keep both (conflicted copy)', 'Save loser as a new file', 'Arbitrary binary files (Dropbox, Drive)', 'User must reconcile manually'],
        ['Three-way merge', 'Merge using the common base version', 'Text, code (like git)', 'Fails on binary / semantic conflicts'],
        ['OT / CRDT', 'Merge fine-grained operations live', 'Real-time docs (Google Docs, Figma)', 'Complex; needs structured documents']
      ])}
      <h4>🟣 Deep dive 6 — Garbage collection, durability and cost</h4>
      <p>Reference counts per chunk are updated on commit and on version expiry. Deleting is two-phase: mark → wait (days) → sweep, so a bug or a racing upload can't destroy live data. Verify integrity continuously with <b>scrubbing</b> (re-read blocks, check hash, repair from parity). Tier cold chunks (not read for 90+ days) to cheaper storage. Offline/selective sync lets users keep only part of the drive on a device. Rate-limit and virus-scan uploads; throttle clients that hammer the change feed.</p>`,
    aiEra: `<p><b>What AI changes:</b> Drive is turning from a file shelf into a <b>knowledge base</b>. Every changed file can be passed through an indexing pipeline (triggered by the same change log!) that extracts text, produces <b>embeddings</b> and summaries, and powers semantic search and "ask questions about my documents" (retrieval-augmented generation). The crucial design rule is <b>permission-aware retrieval</b>: the index must respect the ACL <i>at query time</i> — a search must never return a snippet from a file the asker cannot open, even if it was shared a minute ago and revoked a second ago. Content-addressed chunks help here: identical chunks need embedding only once, which saves a lot of GPU cost.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>generate 15 tricky sync scenarios (rename vs edit, delete vs edit, clock skew, two renames of the same folder) and expected outcomes</code>, or to write a property-based test comparing your chunker against a reference. Use it to draft a 3-way merge UI copy.</p>
      <p><b>Where AI goes wrong:</b> it happily proposes last-write-wins "to keep things simple", hashes whole files instead of chunks, forgets that cross-user dedup leaks existence, and glosses over ACL filtering in vector search. <b>What you must still own:</b> the metadata/block separation, base-version compare-and-swap, durability math, and the privacy trade-offs.</p>`,
    problems: [
      {
        title: 'Resumable Uploads for Large Files',
        level: 'Medium', tags: ['upload', 'chunking', 'idempotency'], companies: ['Google', 'Dropbox', 'Box'],
        statement: `<p>Design the upload path so that a user on a train can upload a 5 GB file over a connection that drops every few minutes, with the guarantee that the final file is exactly correct and no more than a few MB are ever re-sent after an interruption.</p>`,
        constraints: `Max file 5 TB. Clients can crash or switch networks anytime. Servers are stateless behind a load balancer. Abandoned uploads must not waste storage forever.`,
        example: `<p>A 5 GB file = 640 parts of 8 MB. The connection dies after 211 parts. After reconnect the client asks the server which parts it has, uploads parts 212–639, then completes. Total re-sent: at most the one in-flight part (8 MB), not 5 GB.</p>`,
        brute: { why: `<p><b>Naive design:</b> a single <code>POST /upload</code> carrying the entire 5 GB body. Any drop near the end throws away hours of transfer; reverse proxies time out; servers must buffer huge requests; no integrity check beyond TCP; and a retry can create a second copy of the file.</p>` },
        mcq: { q: 'After a dropped connection, how does the client know where to resume?', options: ['It guesses based on elapsed time', 'It queries the upload session for the list (or highest contiguous offset) of parts the server already has', 'It restarts from zero', 'The CDN remembers'], answer: 1, explain: 'Resumable protocols keep server-side session state (in a shared store, not in one server\'s memory) and expose a status call, so the client continues exactly where the server left off.' },
        hints: [
          `<p>Hint 1: Break the file into numbered parts and treat each part as its own small, retryable upload.</p>`,
          `<p>Hint 2: Keep an upload-session record (session id, expected size, whole-file hash, parts received) in a shared store so any server can answer "what do you have?".</p>`,
          `<p>Hint 3: Make part uploads idempotent (part number + checksum). Only a final "complete" call creates the file version, after verifying all parts and the overall hash. Add expiry and a cleanup job.</p>`
        ],
        solution: {
          approach: `<p><b>Design.</b></p>
            <ol>
              <li><b>Create session:</b> <code>POST /uploads {name, size, sha256?, parent}</code> returns <code>session_id</code>, <code>part_size</code> (8 MB, bigger for huge files so parts ≤ 10,000) and an expiry (7 days). The session row is stored in a replicated KV/SQL store, so any stateless server can serve it.</li>
              <li><b>Upload parts:</b> <code>PUT /uploads/{id}/parts/{n}</code> with headers <code>Content-MD5</code>/<code>x-sha256</code>. The server streams the part straight to object storage (a multipart-upload part, or a staging chunk keyed by hash), verifies the checksum and records <code>{n, etag, size}</code>. Re-sending the same part overwrites or is acknowledged as already present, so it is idempotent. Parts may be uploaded in parallel (3–6 streams) and out of order.</li>
              <li><b>Resume:</b> <code>GET /uploads/{id}</code> returns the received part numbers (or a compact bitmap). The client sends only the missing ones. Switching from wifi to cellular is just a new HTTP connection.</li>
              <li><b>Complete:</b> <code>POST /uploads/{id}/complete {part_list, sha256}</code>. The server checks every part exists, assembles the multipart object, verifies the whole-file hash, runs virus scan/dedup, and then performs the single atomic metadata commit that creates the file version. Completing twice returns the same file (idempotent via session id).</li>
              <li><b>Cleanup:</b> a janitor aborts sessions past expiry (<code>AbortMultipartUpload</code>) and storage lifecycle rules delete incomplete parts after N days, so abandoned uploads don't leak cost.</li>
              <li><b>Dedup shortcut:</b> before uploading, the client can send the chunk hashes; the server tells it which chunks it already has, so even the first upload can skip parts (instant upload of files that exist already, with the privacy caveats discussed above).</li>
            </ol>
            <p>Worst-case re-send after a failure: one in-flight part (8 MB). State lives in the shared session store; the data path never loads the entire file into memory.</p>`,
          complexity: `<p>Each part: O(part size) bytes; status check O(parts) — a 5 TB file with 8 MB parts is 640K parts, so use larger parts (e.g. 512 MB) or a bitmap/ranges response to stay compact.</p>`,
          followUps: ['How would you let two people upload the same file and store it once?', 'How do you throttle uploads fairly across users?', 'What changes if clients must also encrypt before upload?']
        }
      }
    ]
  });

  /* ================= PRACTICE ================= */
  practice.push({
    title: 'Estimate WhatsApp Capacity', level: 'Easy', tags: ['estimation', 'messaging'], companies: ['Meta', 'Amazon'],
    statement: `<p>A chat app has 1 billion registered users, 400 million of whom are online at peak. Each user sends 40 messages a day on average (about 150 bytes each). Estimate average messages per second, peak connections, how many gateway servers you need, and daily traffic. State your assumptions.</p>`,
    constraints: `Peak is 3× average. One gateway box safely holds 500K idle WebSockets. Use powers of ten; one decimal place is enough.`,
    example: `<p>Messages/day = 1B × 40 = 40B. Average = 40B ÷ 86,400 ≈ <b>460K msgs/s</b>, peak ≈ <b>1.4M msgs/s</b>. Connections: 400M ÷ 500K = <b>800 gateways</b> (≈ 1,000 with headroom). Traffic: 40B × 150 B = 6 TB/day.</p>`,
    brute: { why: `<p><b>Naive answer:</b> "10 servers should do it" with no math, or sizing by messages per second only. Messages are tiny; the real limit is the number of simultaneous open connections, so sizing by QPS under-provisions by ~50×.</p>` },
    mcq: { q: 'Which number mostly decides the size of the WebSocket gateway fleet?', options: ['Messages per second', 'Concurrent connections', 'Total registered users', 'Daily storage'], answer: 1, explain: 'Each gateway can handle many messages but only a limited number of open sockets (memory, file descriptors). Concurrent connections ÷ connections per box gives the fleet size.' },
    hints: [
      `<p>Hint 1: Convert everything to per-second numbers. A day has about 86,400 seconds (round to 10<sup>5</sup> for quick math).</p>`,
      `<p>Hint 2: Do two separate calculations: throughput (messages × size) and capacity (connections ÷ per-box limit). Decide which one binds.</p>`,
      `<p>Hint 3: Write the table: messages/day, average QPS, peak QPS, bandwidth, connections, gateways, storage. Say out loud that you store only undelivered messages, so storage is small.</p>`
    ],
    solution: {
      approach: `<p><b>Work it out in a table:</b></p>
        ${H.table(['Item', 'Calculation', 'Result'], [['Messages/day', '1B × 40', '40 billion'], ['Average QPS', '40B ÷ 86,400', '≈ 460K/s'], ['Peak QPS', '× 3', '≈ 1.4M/s'], ['Ingress bandwidth (peak)', '1.4M × 150 B', '≈ 210 MB/s ≈ 1.7 Gbps'], ['Concurrent sockets', '400M online', '400M'], ['Gateways', '400M ÷ 500K', '800 → provision ~1,000 (N+ headroom, 20% buffer)'], ['Daily payload', '40B × 150 B', '6 TB/day through the system'], ['Storage at rest', 'only undelivered messages (say 3% pending × 1 day)', '≈ 180 GB — small']])}
        <p>Conclusion: bandwidth and storage are modest; <b>connections and fan-out for groups</b> are the scaling dimensions. Mention that group chats multiply deliveries (one message to 100 members = 100 deliveries), so deliveries/s is higher than messages/s.</p>`,
      complexity: `<p>The estimate is O(1) arithmetic; the real systems lesson is that the bottleneck is connection count, not throughput or storage.</p>`
    }
  });

  practice.push({
    title: 'Pick the Right Transport', level: 'Easy', tags: ['websocket', 'polling', 'push'], companies: ['Google', 'Slack'],
    statement: `<p>For each feature choose the transport and justify it: (a) 1:1 chat messages, (b) a live cricket score ticker (server to client only), (c) the news feed refresh when the app is in the background, (d) "typing..." indicators.</p>`,
    constraints: `Mobile clients, flaky networks, battery matters, up to 100M concurrent users.`,
    example: `<p>(a) WebSocket (two-way, low latency). (b) Server-Sent Events or WebSocket (one-way push is enough; SSE auto-reconnects over plain HTTP). (c) OS push notification (APNs/FCM) because background sockets get killed. (d) WebSocket event, not persisted, throttled and dropped if lost.</p>`,
    brute: { why: `<p><b>Naive design:</b> short-poll every second for everything. 100M clients × 1 request/s = 100M requests/s, almost all empty, draining batteries and servers, and still adding up to a second of latency.</p>` },
    mcq: { q: 'Why are push notifications (APNs/FCM) needed even when you have WebSockets?', options: ['They are faster than WebSockets', 'The OS suspends background apps and closes their sockets, so only the OS push channel can wake the app', 'WebSockets cannot carry text', 'They provide encryption'], answer: 1, explain: 'Mobile operating systems aggressively stop background network activity. The OS-managed push channel is the only reliable way to wake a sleeping app.' },
    hints: [
      `<p>Hint 1: Ask who talks: does only the server speak, or both sides? One-way vs two-way matters.</p>`,
      `<p>Hint 2: Ask whether the app is in the foreground. Foreground can hold a socket; background cannot.</p>`,
      `<p>Hint 3: Ephemeral events (typing) need no durability; messages do. Match reliability to importance.</p>`
    ],
    solution: {
      approach: `<p><b>Answers with reasons:</b></p>
        <ul>
          <li><b>(a) Chat:</b> WebSocket while foreground. It is bidirectional and cheap per message. A durable inbox plus push notification covers offline/background. Fall back to long polling when a corporate proxy blocks WebSockets.</li>
          <li><b>(b) Score ticker:</b> Server-Sent Events: one-way, automatic reconnect and event ids for resume, works through standard HTTP infrastructure and CDNs. WebSocket also works but is more than needed. Fan out the same event to all viewers via a pub/sub channel per match.</li>
          <li><b>(c) Background refresh:</b> a silent push notification asks the app to wake and fetch; the client then calls the REST API with its last cursor. No always-on socket drains the battery.</li>
          <li><b>(d) Typing:</b> a lightweight WebSocket message, throttled (at most once per 3 s) and expiring automatically after ~5 s without refresh. Never stored, never retried.</li>
        </ul>
        <p>Principle: pick the simplest transport that satisfies direction, latency and reliability needs; do not use one hammer for everything.</p>`,
      complexity: `<p>Polling costs O(clients × poll rate) requests regardless of activity; push/socket approaches cost O(events).</p>`
    }
  });

  practice.push({
    title: 'Receipts That Arrive Out of Order', level: 'Easy', tags: ['state machine', 'receipts', 'idempotency'], companies: ['Meta', 'Telegram'],
    statement: `<p>A message can be SENT, DELIVERED or READ. Because of retries and multiple devices, receipts can arrive late, twice or out of order (for example READ before DELIVERED). Define the rule that updates the sender's tick state so the UI never goes backwards, and explain how group chats aggregate receipts.</p>`,
    constraints: `Receipts are small events (message_id, status, device_id, time). Delivery may be at-least-once. Sender may be offline when receipts arrive.`,
    example: `<p>Receipts arrive in the order: DELIVERED(Bob phone), READ(Bob laptop), DELIVERED(Bob laptop, late). Final state must be <b>READ</b> (blue ticks). The late DELIVERED is ignored because its rank (2) is lower than the current rank (3).</p>`,
    brute: { why: `<p><b>Naive design:</b> overwrite the status with whatever arrives last. A late duplicate DELIVERED turns blue ticks back into grey, and two devices racing produce flickering state.</p>` },
    mcq: { q: 'What is the safest update rule for message status?', options: ['Always take the latest arrival', 'Take the maximum rank (SENT &lt; DELIVERED &lt; READ), never decrease', 'Take the minimum', 'Ask the user'], answer: 1, explain: 'Statuses form a monotonic order; using max makes the update commutative, associative and idempotent, so order and duplicates do not matter (a tiny CRDT).' },
    hints: [
      `<p>Hint 1: Give statuses numeric ranks: SENT=1, DELIVERED=2, READ=3.</p>`,
      `<p>Hint 2: new_status = max(old, incoming). This is idempotent and order-independent.</p>`,
      `<p>Hint 3: For groups keep per-member status; the sender's tick is the minimum across members for "delivered to all" and a per-member list for the "read by" screen.</p>`
    ],
    solution: {
      approach: `<p><b>Rule:</b> keep for each (message, recipient) a rank and update with <code>rank = max(rank, incoming)</code>. Because max is commutative, associative and idempotent, duplicates and reordering are harmless — the same convergence idea as a grow-only CRDT.</p>
        <p><b>Storage:</b> one small row <code>(message_id, recipient_id) → rank, ts</code>. Receipts are applied on the server and the new aggregate is pushed to the sender (or fetched at reconnect via the change feed).</p>
        <p><b>Multi-device:</b> a recipient's status is the max across their devices — one device reading is enough for READ.</p>
        <p><b>Groups:</b> the bubble shows: one tick when stored, two ticks when <i>every</i> member has DELIVERED (min of per-member ranks), blue when every member has READ. The info screen lists each member's own rank/time. Batch receipts ("read up to seq N") so reading a 500-message backlog sends one event, not 500.</p>
        <p><b>Privacy:</b> if either side disables read receipts, the server simply never creates READ events for that pair.</p>`,
      complexity: `<p>O(1) per receipt; groups cost O(members) storage per message, which is why receipts for big groups are often limited or sampled.</p>`
    }
  });

  practice.push({
    title: 'Chunk Size and Dedup Savings', level: 'Easy', tags: ['storage', 'chunking', 'estimation'], companies: ['Dropbox', 'Google'],
    statement: `<p>A drive stores 100 million files averaging 50 MB. A trace shows that 30% of all bytes are exact duplicates of other chunks and that users edit a file by changing about 2% of it. Compare 4 MB and 64 KB chunks for (a) metadata size, (b) bytes sent per edit of a 50 MB file, and (c) bytes saved by dedup.</p>`,
    constraints: `Each chunk record costs ~100 bytes. Assume edits touch one contiguous region.`,
    example: `<p>Total data = 100M × 50 MB = 5 EB. With 4 MB chunks: 1.25×10<sup>12</sup> records ≈ 125 TB metadata. With 64 KB: 8×10<sup>13</sup> records ≈ 8 PB metadata. A 2% edit (1 MB) sends one 4 MB chunk (4 MB) or about 16 chunks of 64 KB (1 MB).</p>`,
    brute: { why: `<p><b>Naive design:</b> hash and store whole files. A one-line change re-uploads 50 MB, a duplicate of a single changed byte defeats dedup, and the same file stored by two users costs twice the space.</p>` },
    mcq: { q: 'What is the main drawback of very small chunks?', options: ['Worse dedup', 'Huge metadata and many requests', 'Slower edits', 'Weaker hashes'], answer: 1, explain: 'Smaller chunks dedupe and delta-sync more precisely but multiply the number of metadata rows, hash computations and network round trips.' },
    hints: [
      `<p>Hint 1: Number of chunks = total bytes ÷ chunk size. Metadata = chunks × 100 bytes.</p>`,
      `<p>Hint 2: A change of 1 MB touches ceil(1 MB ÷ chunk) chunks; bytes sent = chunks touched × chunk size.</p>`,
      `<p>Hint 3: Dedup saves 30% of bytes only if chunks are fine-grained enough to match; mention that metadata cost can eat the benefit. Conclude with variable-size chunks around 4 MB.</p>`
    ],
    solution: {
      approach: `<p><b>Numbers.</b> Data = 5 EB = 5×10<sup>9</sup> GB.</p>
        ${H.table(['', '4 MB chunks', '64 KB chunks'], [['Chunk count', '5 EB ÷ 4 MB = 1.25×10<sup>12</sup>', '5 EB ÷ 64 KB = 7.8×10<sup>13</sup>'], ['Metadata (×100 B)', '≈ 125 TB', '≈ 7.8 PB'], ['Bytes per 1 MB edit', '4 MB (1 chunk)', '1 MB (16 chunks)'], ['Dedup savings', '30% of 5 EB ≈ 1.5 EB', 'possibly a bit higher than 30%, but cost 62× more metadata']])}
        <p><b>Decision:</b> 4 MB (or content-defined chunks averaging ~4 MB) is the sweet spot: metadata fits in a sharded database, edits cost one small chunk, and dedup captures most duplicates. Use smaller chunks only for hot, frequently edited small files. Mention the 2-level scheme: split into big "blocks" for transfer and sub-chunks for dedup when needed.</p>`,
      complexity: `<p>Metadata scales as O(total bytes ÷ chunk size); transfer per edit scales as O(chunk size).</p>`
    }
  });

  practice.push({
    title: 'Group Chat With 1,000 Members', level: 'Medium', tags: ['group chat', 'fan-out', 'ordering'], companies: ['Meta', 'Slack', 'Discord'],
    statement: `<p>Extend the chat design to groups of up to 1,000 members. Describe how a group message is stored, fanned out, ordered and acknowledged, and how you keep the write amplification under control when 200 members send messages at the same time.</p>`,
    constraints: `p99 delivery to online members &lt; 500 ms. Members join and leave. Messages must appear in the same order for everyone. 1M active groups.`,
    example: `<p>Maya posts in a 1,000-member group. The server assigns <code>group_seq = 8841</code>. 600 members are online and receive it immediately; 400 offline members get an inbox row and a push. Everyone sees message 8841 after 8840, regardless of device clocks.</p>`,
    brute: { why: `<p><b>Naive design:</b> the sender's phone sends 1,000 separate copies, one per member. That costs 1,000× sender bandwidth, drains battery, breaks ordering (copies arrive at different times) and fails halfway with no recovery.</p>` },
    mcq: { q: 'How do you give every member the same message order in a group?', options: ['Sort by sender timestamp', 'A single sequencer per group assigns an increasing group_seq', 'Sort alphabetically by sender', 'Let each client decide'], answer: 1, explain: 'Timestamps from different devices disagree. A per-group sequencer (one partition owner) stamps a total order that all members share.' },
    hints: [
      `<p>Hint 1: The client sends the message once; the server does the fan-out.</p>`,
      `<p>Hint 2: Route all messages of one group to the same partition/owner so it can assign sequence numbers without coordination across the cluster.</p>`,
      `<p>Hint 3: Fan out by writing a reference per member inbox (group_id, seq) rather than a full copy of the payload; store the payload once. Use batches and parallel workers.</p>`
    ],
    solution: {
      approach: `<p><b>Design.</b></p>
        <ol>
          <li><b>Single send:</b> the client uploads one encrypted message (with a sender key, one ciphertext is readable by all members) to a gateway.</li>
          <li><b>Sequencer:</b> messages are partitioned by <code>group_id</code> (Kafka partition or an actor per group). The partition owner assigns <code>group_seq</code> and appends to the group log — the order everyone sees, independent of clocks. 200 simultaneous senders simply queue at that owner: 200 msgs at ~10K msgs/s per partition is trivial.</li>
          <li><b>Store payload once</b> in the group message store keyed by <code>(group_id, seq)</code>.</li>
          <li><b>Fan-out</b> (workers): look up the member list (cached; versioned on joins/leaves). For each member device write a small inbox pointer <code>(user, device) → (group_id, seq)</code>. Online members: push through their gateway; offline: leave the pointer and send a push. Batch per gateway: one internal RPC carries the message for all members on that gateway.</li>
          <li><b>Acks:</b> sender gets one tick after the log append; two ticks when all (or a configurable subset) have delivered; per-member receipts are aggregated by max-rank (see receipts problem). For big groups show aggregate counts, not 1,000 separate updates.</li>
          <li><b>Membership races:</b> include <code>membership_epoch</code> with every message; a member removed at epoch 12 is not sent messages from epoch 13 on, even if some fan-out jobs are still in flight.</li>
          <li><b>Write amplification:</b> 1 message → 1,000 small pointer writes; mitigate by pointer-only inbox rows, skipping members who have the group muted for push (still stored), and rate-limiting spammy senders.</li>
        </ol>`,
      complexity: `<p>Per message: O(members) pointer writes but O(1) payload storage. Ordering cost: one hop to the group's sequencer.</p>`,
      followUps: ['What happens if the sequencer for a group crashes?', 'How would you support channels with 1M subscribers (broadcast)?']
    }
  });

  practice.push({
    title: 'Multi-Device Sync and Presence', level: 'Medium', tags: ['multi-device', 'presence', 'sync'], companies: ['Meta', 'Apple', 'Telegram'],
    statement: `<p>Users have a phone, a laptop and a tablet. Design how a message reaches all devices, how a read on one device clears the unread badge on the others, how a newly linked device gets history, and how "online / last seen" is computed without broadcasting every change to everyone.</p>`,
    constraints: `End-to-end encrypted. Up to 4 linked devices per user. 300M concurrent users. Presence updates must not cause an event storm.`,
    example: `<p>Bob reads chat X on his laptop. His phone's unread badge drops to 0 within a second because the laptop's "read up to seq 57" receipt is synced to his other devices. Alice sees "online" only if she has Bob's chat open or he is in her visible contact list.</p>`,
    brute: { why: `<p><b>Naive design:</b> treat each user as having one connection. A second device overwrites the first, so notifications go to only one device. Presence is broadcast to every contact on every connect/disconnect, so 300M users with 200 contacts each cause billions of events when a region reconnects.</p>` },
    mcq: { q: 'Why must fan-out count devices, not people, in an E2EE chat app?', options: ['Servers are slow', 'The message is encrypted separately for each device key and delivered to each device inbox', 'Devices have different time zones', 'It is cheaper'], answer: 1, explain: 'Each device has its own keys, so a message is encrypted per device and queued per device; a person with 4 devices means 4 deliveries.' },
    hints: [
      `<p>Hint 1: Make the unit of delivery (user_id, device_id), not user_id.</p>`,
      `<p>Hint 2: Sync read state as another small event ("read up to seq N") sent to the user's own devices.</p>`,
      `<p>Hint 3: Presence is a lazy subscription: only watchers who are looking at that contact receive updates, and "last seen" is coarse (updated at most once a minute).</p>`
    ],
    solution: {
      approach: `<p><b>Design.</b></p>
        <ol>
          <li><b>Device registry:</b> <code>user_id → [device_id, identity key, push token]</code>. The session store maps <code>(user, device) → gateway</code>.</li>
          <li><b>Delivery:</b> sender encrypts for each recipient device (and also its own other devices, so they show the sent message). Server creates one inbox row per device with a per-device sequence number. Each device acks independently.</li>
          <li><b>Read state sync:</b> when a device marks chat X read up to seq 57, it sends an encrypted "state sync" message to the user's other devices; they update the badge. Last-writer-wins on the max seq is correct because read position only moves forward.</li>
          <li><b>Linking a new device:</b> a QR code from the phone establishes trust and the phone can transfer an encrypted history bundle directly (or via a temporary blob) — the server never sees plaintext. Older history on the server does not exist because it is deleted after delivery.</li>
          <li><b>Presence:</b> the gateway writes <code>presence:user → gateway, ts</code> with a TTL refreshed by heartbeats. Watchers subscribe when they open a chat or contact list (pub/sub channel per user, with a cap). Changes are debounced (e.g. "online" after 5 s of connection stability) and "last seen" is stored at minute granularity. Privacy settings are checked at publish time.</li>
          <li><b>Failure:</b> a lost device simply stops acking; its inbox is capped by TTL (30 days) and the account's primary device is told that the linked device went stale.</li>
        </ol>`,
      complexity: `<p>Delivery cost O(devices per user); presence cost O(active watchers) instead of O(all contacts).</p>`
    }
  });

  practice.push({
    title: 'Ranked Feed and Cursor Pagination', level: 'Medium', tags: ['ranking', 'pagination', 'news feed'], companies: ['Meta', 'LinkedIn', 'Pinterest'],
    statement: `<p>The feed must be ranked by relevance, not time, yet infinite scroll must not repeat or skip posts while new posts keep arriving and scores change. Design the ranking pipeline and the pagination scheme.</p>`,
    constraints: `p99 &lt; 300 ms per page. 1,000 candidates per request. Ranking model inference ~1 ms per 100 items on a small model, 20 ms per 100 on a heavy one.`,
    example: `<p>Page 1 shows posts [A, C, F...]. By the time the user scrolls to page 2, the model would score B higher than A. The user must still see a consistent continuation with no duplicates: pages are cut from a ranked list that was <b>materialised once per session</b>.</p>`,
    brute: { why: `<p><b>Naive design:</b> re-rank everything on every scroll request and paginate with OFFSET. Scores change between requests, so items repeat or vanish; re-ranking 1,000 candidates each page wastes compute; deep OFFSETs are slow.</p>` },
    mcq: { q: 'How do you keep paging stable when ranking scores change over time?', options: ['Page number + OFFSET', 'Snapshot a ranked list of post ids for the session and page through it with an opaque cursor', 'Re-sort in the browser', 'Disable ranking'], answer: 1, explain: 'A per-session snapshot (cached list of ids with a position cursor) guarantees no duplicates or gaps; fresh content appears on the next refresh.' },
    hints: [
      `<p>Hint 1: Split the work: candidate generation is broad and cheap; ranking is narrow and expensive.</p>`,
      `<p>Hint 2: Rank once at first load (or in the background), store the ordered ids briefly, serve pages from that list.</p>`,
      `<p>Hint 3: The cursor is opaque (a session id + offset, or the last post id + snapshot id), never a raw page number. New posts arrive via a "new posts" pill, not by changing the list under the user.</p>`
    ],
    solution: {
      approach: `<p><b>Pipeline.</b></p>
        <ol>
          <li><b>Candidate generation (≈1,000):</b> pushed timeline ids + celebrity pulls + recommendation sources (embedding retrieval, trending). Cheap, parallel, cached.</li>
          <li><b>Light ranking (1,000 → 200):</b> small model/GBDT on cheap features, ~10 ms total.</li>
          <li><b>Heavy ranking (200 → 50):</b> neural model predicting P(like), P(comment), P(watch time); features come from a feature store. ~40 ms for 200 items.</li>
          <li><b>Re-ranking:</b> diversity (cap per author), freshness boost, integrity demotions, ads slots. Output: ordered list of ~100 ids.</li>
          <li><b>Materialise:</b> store the ordered list under <code>feedsession:{id}</code> in Redis with a 10-minute TTL (100 ids ≈ 1 KB). Page 1 = ids[0..20], returned with <code>cursor = base64(session_id, 20)</code>.</li>
          <li><b>Paging:</b> next page reads ids[20..40] from the snapshot and hydrates them (batched multi-get). When the snapshot is nearly exhausted, run the pipeline again excluding already-seen ids (the client sends a bloom filter of seen ids, or the server keeps a seen-set).</li>
          <li><b>Freshness:</b> a background check tells the client "N new posts" → pull-to-refresh builds a new snapshot.</li>
        </ol>
        <p>Trade-off: snapshots cost a little memory but give a stable UX and cut compute by ~10× versus re-ranking per page.</p>`,
      complexity: `<p>One ranking run per session refresh (O(candidates)); each page is O(page size) hydration with no re-ranking.</p>`
    }
  });

  practice.push({
    title: 'Stories That Expire After 24 Hours', level: 'Medium', tags: ['TTL', 'storage', 'stories'], companies: ['Meta', 'Snap'],
    statement: `<p>Design the stories feature: users post photos/videos visible for 24 hours; followers see a tray of people with unseen stories, ordered by relevance; viewers' "seen by" list is shown to the author. Handle deletion, storage cleanup and the celebrity case.</p>`,
    constraints: `500M stories/day. Each story viewed by ~100 people on average. A story must disappear within a few minutes of 24 h. Seen-by lists must be accurate for the author.`,
    example: `<p>Sam posts at 09:00 Monday. At 09:00 Tuesday his story is gone from the tray (read-time filter by <code>expires_at</code>); by 11:00 the data and media are purged by TTL and lifecycle rules.</p>`,
    brute: { why: `<p><b>Naive design:</b> a nightly cron job scans the whole stories table and deletes rows older than 24 h. The scan gets slower every day, stories stay visible for hours, and deleting media with no lifecycle policy leaves orphaned blobs consuming petabytes.</p>` },
    mcq: { q: 'What guarantees an expired story is never shown even if cleanup is late?', options: ['A faster cron job', 'Filtering by expires_at at read time, with TTL cleanup as a backstop', 'Hiding it with CSS', 'Waiting for users to report it'], answer: 1, explain: 'Correctness comes from the read-time check; deletion is only for cost control and privacy hygiene.' },
    hints: [
      `<p>Hint 1: Put the expiry time in the row and in the object metadata; use stores that expire data natively.</p>`,
      `<p>Hint 2: Do not fan out stories to every follower; the tray is mostly a pull query.</p>`,
      `<p>Hint 3: Views are write-heavy: batch "seen" events and store them per story as a compact set.</p>`
    ],
    solution: {
      approach: `<p><b>Design.</b></p>
        <ol>
          <li><b>Write:</b> reuse the upload pipeline (pre-signed URL, rendition workers). A story row: <code>(author_id, story_id, media_id, created_at, expires_at = +24h)</code> in a TTL-capable store (Cassandra TTL / DynamoDB TTL / Redis EXPIRE for the tray index). Media lives under a <code>stories/</code> prefix with a lifecycle rule "expire after 2 days".</li>
          <li><b>Tray (read):</b> <code>following(user)</code> gives authors; a multi-get of <code>active_story_count:{author}</code> (a tiny cached key refreshed on post/expiry) tells who has stories. Rank authors by affinity (recent interaction, close friends) using a light model, cache the tray for ~30 s. Celebrities cost nothing extra: they are just keys in this pull query.</li>
          <li><b>Viewing:</b> client fetches the author's stories (CDN-cached URLs, short TTL). The service filters <code>expires_at &gt; now</code> before returning, so late cleanup is invisible.</li>
          <li><b>Seen-by:</b> the client posts "viewed story S" events in batches; stream processing dedupes per (story, viewer) and appends to <code>seen:{story}</code> (a set, expiring with the story). The author's list reads that set; unseen-ring state for the viewer is a per-viewer "last seen story id per author" map.</li>
          <li><b>Deletion by user:</b> mark deleted (instant, filtered at read), enqueue blob delete, purge CDN by versioned URL.</li>
          <li><b>Highlights</b> (saved stories) copy the media to the permanent store, because the original will expire.</li>
        </ol>`,
      complexity: `<p>No scans: expiry is handled by TTL in O(1) per record; tray read is O(following × 1) key lookups, batched.</p>`
    }
  });

  practice.push({
    title: 'View Counts and Watch History', level: 'Medium', tags: ['counters', 'streaming', 'analytics'], companies: ['YouTube', 'Netflix', 'Twitch'],
    statement: `<p>Count video views at the scale of 50 billion watch events per day, filter obvious fraud, show near-real-time counts on popular videos, and store per-user resume positions. Choose the pipeline and the data stores.</p>`,
    constraints: `Heartbeat every 30 s per active player. A view counts after 30 s of real playback. Displayed count may lag 1 minute. Exact totals are needed for payouts (nightly).`,
    example: `<p>A user watches 3 minutes: 6 heartbeats. The pipeline counts one view for session S on the first heartbeat where watched_seconds ≥ 30, ignores the other five, and updates the resume position to 180 s.</p>`,
    brute: { why: `<p><b>Naive design:</b> each play does <code>UPDATE videos SET views = views + 1</code>. Viral videos create a hot row; at 500K events/s the DB falls over; retries double count; bots inflate counts freely.</p>` },
    mcq: { q: 'Why separate "displayed count" from "billing count"?', options: ['They are always equal', 'The display can be approximate and fast; payouts need exact, fraud-filtered, auditable totals computed in batch', 'Billing is faster', 'Legal reasons only'], answer: 1, explain: 'Two consumers with different needs: low latency/approximation for UI, correctness/auditability for money. Lambda-style streaming + batch reconciliation serves both.' },
    hints: [
      `<p>Hint 1: Events go to a log (Kafka) first; never straight to the database.</p>`,
      `<p>Hint 2: Streaming job dedupes by session id and counts per video in small time windows, then writes increments.</p>`,
      `<p>Hint 3: A nightly batch job recomputes exact numbers from the raw log and corrects the stored values; resume positions are a separate key-value path with last-write-wins.</p>`
    ],
    solution: {
      approach: `<p><b>Pipeline.</b></p>
        <ol>
          <li><b>Collect:</b> players send heartbeats <code>{session_id, user, video, position, ts}</code> to an edge collector, which writes to Kafka partitioned by <code>video_id</code> (so one job instance owns each video's counts) with a salted key for mega-hot videos.</li>
          <li><b>Stream aggregation (Flink):</b> keep per-session state (watched seconds); emit a <i>view</i> when it crosses 30 s, once per session (state TTL ~1 day). Bot rules (IP/ASN reputation, impossible rates, headless fingerprints) tag suspicious events. Window the counts into 10-second deltas per video.</li>
          <li><b>Serve:</b> deltas are applied with atomic increments to a KV store (Redis for the hot set, Cassandra for the long tail); a video page reads the cached value. Lag ≈ 10–60 s.</li>
          <li><b>Exactness:</b> raw events also land in object storage (Parquet). A nightly Spark job recomputes deduplicated, fraud-filtered counts and overwrites the stored totals; payouts use the batch numbers.</li>
          <li><b>Watch history / resume:</b> the same heartbeat updates <code>(user, video) → position, ts</code> in a wide-column store using last-write-wins by timestamp. It is decoupled from counts, so losing counts never loses resume.</li>
          <li><b>Reliability:</b> Kafka retention lets the job replay after a crash; sinks are idempotent by (video, window_start).</li>
        </ol>`,
      complexity: `<p>Per event O(1) amortised; the hot-row problem disappears because updates are batched per video per window (about 6 DB writes/min/video instead of millions).</p>`
    }
  });

  practice.push({
    title: 'Share Links and Permission Checks', level: 'Medium', tags: ['ACL', 'sharing', 'security'], companies: ['Google', 'Dropbox', 'Box'],
    statement: `<p>Design sharing for a drive: share a file with specific people, share a folder (inheritance), and create "anyone with the link" access. Show how a read request is authorised quickly, how revocation takes effect, and how you prevent guessing of links.</p>`,
    constraints: `Permission check in under 10 ms. 5B files, deep folder trees (depth up to 20). Revocation must take effect within ~1 minute everywhere, including CDN-cached downloads.`,
    example: `<p>Sana shares folder "Trip" with Ravi as Editor. Ravi can open "Trip/tickets.pdf" because the check walks up the parents and finds the grant on "Trip". Sana removes Ravi; within a minute Ravi's download link no longer works.</p>`,
    brute: { why: `<p><b>Naive design:</b> store the list of allowed users inside every file and, for folder sharing, copy the grant to every descendant file. Sharing a folder with 100K files writes 100K rows; moving a file leaves stale grants; revoking must touch all of them.</p>` },
    mcq: { q: 'How should folder-level sharing be stored?', options: ['Copy the grant to every file inside', 'One grant on the folder; files inherit by walking up parent_id (with cached effective permissions)', 'A global list of all users', 'Only on the root'], answer: 1, explain: 'Storing a single grant on the folder makes share and revoke O(1) writes; a cache of effective permissions keeps reads fast.' },
    hints: [
      `<p>Hint 1: Permissions are edges (principal, resource, role); inheritance means a resource also gets its ancestors' grants.</p>`,
      `<p>Hint 2: Make the check fast with a cached "effective permissions" per (user, resource) that is invalidated by versioned ACL changes.</p>`,
      `<p>Hint 3: Link sharing = an unguessable random token (≥128 bits) stored with a role and optional expiry/password; downloads use short-lived signed URLs.</p>`
    ],
    solution: {
      approach: `<p><b>Design.</b></p>
        <ol>
          <li><b>Model:</b> table <code>acl(resource_id, principal, role, inherited_from?)</code> with principals = user, group or "link:token". Files point to <code>parent_id</code>. Effective role = max over the grants on the file and all its ancestors (and group memberships).</li>
          <li><b>Check path:</b> auth → fetch file's ancestor chain (cached path-to-root per folder, ≤ 20 hops) → look up grants for (user and user's groups) on those ids in a batched multi-get → compute effective role. Cache the result per (user, resource) with an <code>acl_version</code> stamp; any ACL write on a folder bumps the version of the subtree (or a per-namespace epoch) so stale cache entries are rejected. Typical check: 1–3 cache hits, a few ms.</li>
          <li><b>Share/Unshare:</b> one row write on the folder, regardless of how many descendants. Moves change <code>parent_id</code>, so grants follow the tree automatically.</li>
          <li><b>Link sharing:</b> random 128–256-bit token (not sequential, not derived from file id), role viewer/commenter/editor, optional expiry/domain restriction; tokens are revocable and rate-limited against brute force.</li>
          <li><b>Downloads &amp; revocation:</b> the API returns a signed URL with a 1–5 minute lifetime; CDN caches are keyed per signed URL or the CDN calls an auth hook, so revoked users lose access within minutes. Sensitive files use no-cache headers.</li>
          <li><b>Audit:</b> log each grant, revoke and access for the sharing activity view and compliance.</li>
        </ol>`,
      complexity: `<p>Share/revoke: O(1) writes. Check: O(depth) cache lookups, bounded by 20 and usually O(1) with caching.</p>`
    }
  });

  practice.push({
    title: 'Sync Conflicts: Rename vs Edit vs Delete', level: 'Hard', tags: ['sync', 'conflict resolution', 'consistency'], companies: ['Dropbox', 'Google', 'Microsoft'],
    statement: `<p>Two offline devices make conflicting changes to the same synced folder: device A edits <code>plan.doc</code> while device B renames it to <code>plan-v2.doc</code> and moves it into a subfolder; another case, A deletes the folder while B adds a file in it. Define the metadata model and rules that resolve these without data loss and without sync loops.</p>`,
    constraints: `Metadata server is strongly consistent per namespace. Clients can be offline for weeks. No data may be silently lost. Operations must converge to the same tree on all devices.`,
    example: `<p>A's edit and B's rename touch different attributes of the same file id, so both apply: the result is <code>sub/plan-v2.doc</code> with A's new content. A delete of folder F vs B's new file inside F: the delete would orphan a new file, so B's file is kept and F is restored (or the file moves to a "recovered" folder).</p>`,
    brute: { why: `<p><b>Naive design:</b> identify files by path and apply operations by timestamp (last write wins). A rename looks like delete + create, so A's edit of the old path is applied to a file that no longer exists and is lost or recreated as a duplicate; clock skew makes the "latest" op random; delete-vs-add silently destroys B's new data.</p>` },
    mcq: { q: 'Why identify files by an immutable file_id instead of path?', options: ['IDs are shorter', 'A rename or move changes the path but not the id, so edits and renames merge naturally', 'Paths are secret', 'IDs sort faster'], answer: 1, explain: 'With stable ids, a rename is one attribute change on the same entity, so concurrent content edits and renames touch different fields and merge cleanly.' },
    hints: [
      `<p>Hint 1: Model the tree as entities with id, parent_id, name, content_version. Operations change attributes, not paths.</p>`,
      `<p>Hint 2: Commits carry the base version of the attribute(s) they change. Only same-attribute races are real conflicts.</p>`,
      `<p>Hint 3: Never destroy data to resolve a conflict: prefer keep-both, restore-parent, or move to "recovered", and make resolution deterministic so every device computes the same tree.</p>`
    ],
    solution: {
      approach: `<p><b>Model.</b> Each entry is <code>(file_id, parent_id, name, content_version, deleted?, ver)</code>. The server keeps a totally ordered change log per namespace. A device sends ops with the <code>base ver</code> it saw; the server applies each op in a transaction.</p>
        <p><b>Rules (deterministic, server-decided, devices just replay the log):</b></p>
        <ol>
          <li><b>Edit vs rename/move:</b> different attributes (content vs name/parent) → both apply (attribute-level merge).</li>
          <li><b>Edit vs edit (same content_version base):</b> second committer gets 409 → its content is saved as a new file "name (conflicted copy – device)"; nothing lost.</li>
          <li><b>Rename vs rename:</b> same attribute; server order wins, the loser's op is rejected and the device adopts the winning name (renames are cheap to redo; the user is informed).</li>
          <li><b>Move creating a cycle</b> (A moves X into Y while B moves Y into X): the server detects the cycle when applying the second op and rejects it.</li>
          <li><b>Name collision</b> (two devices create <code>notes.txt</code> in one folder): second becomes "notes (1).txt" — uniqueness is enforced by a (parent_id, name) unique index.</li>
          <li><b>Delete vs edit:</b> prefer keeping data: the delete is a tombstone with a version; an edit based on a version earlier than the tombstone resurrects the file (or recreates it in "recovered") and tells the user.</li>
          <li><b>Delete folder vs add inside:</b> the folder delete is applied as "delete everything the deleting device had seen", not "everything that exists"; the new file stays and its parent is restored (the tombstone is lifted).</li>
        </ol>
        <p><b>Convergence &amp; no loops:</b> since the server totally orders ops and clients apply the log idempotently in order (cursor), every device reaches the same tree; a client never re-uploads changes it just downloaded because it tracks the version of every entry it applied (and ignores watcher events caused by its own writes).</p>
        <p>For fully collaborative documents, switch from file-level to operation-level merging (OT/CRDT).</p>`,
      complexity: `<p>Each op is O(1) transaction work on the owning metadata shard; cycle checks walk at most the folder depth (≤ 20).</p>`,
      followUps: ['How would you let a user choose a per-folder conflict policy?', 'What if the metadata shard is down while clients are editing?']
    }
  });

  practice.push({
    title: 'A 100-Million-Follower Post', level: 'Hard', tags: ['hot key', 'fan-out', 'caching', 'capacity'], companies: ['Twitter/X', 'Meta', 'YouTube'],
    statement: `<p>During a major final, an account with 100 million followers posts and 30 million people open their feeds within two minutes. Describe what each layer (fan-out, feed service, caches, database, CDN) does so the system stays up, and what you would degrade gracefully if load exceeds capacity.</p>`,
    constraints: `Feed read budget 300 ms. 250K feed requests/s during the spike. The post has media, 20K replies/min and a like counter. No pre-warning to infra.`,
    example: `<p>The post is stored once and cached everywhere; each feed request merges it from the celebrity list (one hot cache key). 250K requests/s all read the same ~50 KB object: served from replicated local caches, not from the database.</p>`,
    brute: { why: `<p><b>Naive design:</b> fan-out 100M timeline writes (minutes of lag and a write storm), plus every feed request reads the post from the database — a single hot row at 250K reads/s; the like counter row is also locked by writes. Everything shares one cluster, so the spike takes down unrelated users.</p>` },
    mcq: { q: 'What is the first defence against 250K reads/s on a single hot post?', options: ['A bigger database', 'Replicated in-process/local caches and CDN with request coalescing', 'Disable the post', 'Rate-limit everyone equally'], answer: 1, explain: 'A hot object should be served from many cache replicas close to the readers; coalescing makes a miss cost one origin fetch, not thousands.' },
    hints: [
      `<p>Hint 1: Which parts are written once and read millions of times? Make those cache entries replicated and immutable.</p>`,
      `<p>Hint 2: Separate the paths: content (immutable), counters (approximate, async) and replies (paged, cached).</p>`,
      `<p>Hint 3: Plan degradation: drop ranking to chronological, serve stale cache, shed load for low-priority users, disable expensive features first.</p>`
    ],
    solution: {
      approach: `<p><b>Layer by layer.</b></p>
        <ol>
          <li><b>Fan-out:</b> the account is flagged as celebrity, so no timeline writes. The post id goes to <code>celeb:{id}:recent</code> (one write). Notification pushes ("Account X posted") go through a rate-limited, sharded queue with jitter so the push gateway is not hammered.</li>
          <li><b>Feed service:</b> merges own timeline + celebrity lists. The celebrity list and the hydrated post are fetched from a <b>local in-process cache</b> (TTL 2–5 s) on each feed server, so 250K req/s become only a handful of origin fetches per second per server. Use request coalescing ("single flight") on misses and jittered TTLs to avoid synchronised expiry.</li>
          <li><b>Cache tier:</b> the hot key is replicated to multiple cache nodes (or suffixed <code>post:123#k</code> with k in 0..15 and clients picking randomly), spreading load instead of overwhelming one shard.</li>
          <li><b>Media:</b> images/video via CDN with long TTL; segments are immutable, versioned URLs. Pre-warm edges as soon as the post is created.</li>
          <li><b>Counters &amp; replies:</b> likes use sharded Redis counters flushed in batches; the count shown is cached for seconds. Replies are stored in a time-ordered table, read with cursor paging and served from cache for the first pages; new reply writes are queued and rate-limited per user.</li>
          <li><b>Isolation &amp; capacity:</b> autoscale feed servers on request rate, but pre-provision headroom for known events; use separate pools (bulkheads) for celebrity-heavy traffic so a spike cannot starve ordinary users.</li>
          <li><b>Graceful degradation, in order:</b> (1) skip heavy ranking, use light ranker; (2) serve stale timelines; (3) show cached counts only; (4) return fewer items per page; (5) shed load by priority (background refreshes first); (6) show a friendly retry for the rest.</li>
        </ol>
        <p>Result: the database sees almost nothing from the spike; the system's behaviour is dominated by cache hit ratio and coalescing.</p>`,
      complexity: `<p>Origin load becomes O(servers × 1/TTL) fetches per hot key rather than O(requests).</p>`,
      followUps: ['How do you detect a hot key automatically?', 'How would you test this before the real event?']
    }
  });

  practice.push({
    title: 'Live Streaming to 10 Million Viewers', level: 'Hard', tags: ['live streaming', 'CDN', 'latency'], companies: ['Twitch', 'YouTube', 'Netflix'],
    statement: `<p>Extend the video design to a live event watched by 10 million concurrent viewers with 5-second glass-to-glass latency. Describe ingest, encoding, packaging, distribution, the thundering-herd problem for the newest segment, and what changes to ABR and DRM.</p>`,
    constraints: `Source is a single RTMP/SRT contribution feed at 8 Mbps. Average viewer bitrate 3 Mbps. Ingest must survive a data-centre failure. Chat and ads are out of scope.`,
    example: `<p>10M × 3 Mbps = 30 Tbps of egress. All players ask for the newest 2-second segment at nearly the same time, every 2 seconds. Without protection, that is millions of simultaneous requests for an object that does not exist on the CDN yet.</p>`,
    brute: { why: `<p><b>Naive design:</b> one server receives the feed, transcodes on the fly and each viewer connects to that server over a long-lived connection. A single machine cannot serve even thousands of viewers; the egress bandwidth and failure risk are unbounded.</p>` },
    mcq: { q: 'What protects the origin when millions request the newest live segment at once?', options: ['Bigger origin servers', 'CDN request collapsing (one origin fetch, many waiting clients) plus a mid-tier cache', 'Asking viewers to wait', 'Using UDP'], answer: 1, explain: 'Collapsing at the edge and mid-tier turns millions of identical misses into a few fetches; the origin sees load proportional to the number of cache tiers, not viewers.' },
    hints: [
      `<p>Hint 1: Live is the VOD pipeline running continuously on tiny segments, with an ingest in front.</p>`,
      `<p>Hint 2: Latency budget = capture + encode + segment duration × buffered segments + CDN + decode. Count the pieces to reach 5 s.</p>`,
      `<p>Hint 3: Use a multi-tier CDN, request collapsing, redundant ingest in two regions, and chunked transfer (LL-HLS/CMAF) for lower latency.</p>`
    ],
    solution: {
      approach: `<p><b>Pipeline.</b></p>
        <ol>
          <li><b>Ingest:</b> the broadcaster sends SRT/RTMP to the nearest of several ingest points; a redundant second feed goes to another region. A failover controller picks the healthy one and keeps segment numbering continuous.</li>
          <li><b>Live transcoding:</b> a GPU/hardware encoder cluster produces the ladder (e.g. 6 renditions) in real time with a closed GOP aligned to 2-second segments, identical keyframe positions across renditions (so ABR switching is seamless). Run active/active so a dying encoder is invisible.</li>
          <li><b>Packaging:</b> CMAF fMP4 segments of 2 s (parts of 0.5 s for low-latency), HLS/DASH manifests that are updated every segment (a sliding window of ~10 segments), DRM encryption with the key server scaled for the herd (cache license responses, use short-lived but pre-fetched keys).</li>
          <li><b>Distribution:</b> origin shield → regional mid-tier → edge. Manifest requests are tiny but constant; make them cacheable for a fraction of a segment duration. <b>Request collapsing</b> at every tier ensures that for a new segment only one request goes upstream. Pre-warm via push of the newest segment to mid-tiers as soon as it is packaged.</li>
          <li><b>Capacity:</b> 30 Tbps egress is spread over many CDNs and ISP-embedded caches (multi-CDN with real-time steering based on error rates). Per-viewer cost is why live uses lower top bitrates than VOD.</li>
          <li><b>Latency budget (≈5 s):</b> capture + contribution 0.5 s + encode 1 s + packaging 0.5 s + CDN 0.5 s + player buffer 2 × 1–2 s ≈ 4–5 s. LL-HLS parts reduce this to 2–3 s at the cost of more requests and less buffer.</li>
          <li><b>ABR changes:</b> buffer is small, so the algorithm is more conservative and drops quality sooner; avoid chasing live edge by speeding up playback slightly when behind.</li>
          <li><b>DVR/replay:</b> segments are also persisted to object storage and become the VOD asset right after the event.</li>
        </ol>`,
      complexity: `<p>Encoding cost is O(renditions) per stream (independent of viewers); distribution cost is O(viewers × bitrate), handled almost entirely by the CDN.</p>`,
      followUps: ['What would WebRTC change and when is it worth it?', 'How do you keep viewers in sync for a shared watch-party?']
    }
  });

  practice.push({
    title: 'End-to-End Encrypted Group Chat', level: 'Hard', tags: ['E2EE', 'security', 'group chat'], companies: ['Meta', 'Signal', 'Apple'],
    statement: `<p>Design the key management for an E2EE group chat so that the server cannot read messages, a message is encrypted once instead of 500 times, and when a member leaves or is removed they can no longer read future messages. Explain trade-offs versus per-recipient encryption.</p>`,
    constraints: `Group size up to 1,000. Members may be offline for days. Server stores only ciphertext and metadata. Devices can be lost or compromised.`,
    example: `<p>Alice sends one message to a 500-member group. With Sender Keys she encrypts once with her sender chain key; every member who has her sender key can decrypt. When Bob is removed, everyone rotates their sender keys so Bob's old key cannot decrypt new messages.</p>`,
    brute: { why: `<p><b>Naive design:</b> (1) one shared group password everyone knows — no forward secrecy and removing a member means changing it for everyone manually; or (2) encrypt every message separately for 500 members — 500× CPU and bandwidth for the sender and 500 ciphertexts to store.</p>` },
    mcq: { q: 'Why rotate keys when a member is removed?', options: ['To save bandwidth', 'So the removed member (who holds old keys) cannot decrypt messages sent after removal', 'To change the group name', 'Because keys expire daily'], answer: 1, explain: 'Anyone who held the old keys can read anything encrypted with them; new keys distributed only to remaining members cut off future access.' },
    hints: [
      `<p>Hint 1: Separate "how a message is encrypted" (a fast symmetric chain key) from "how that key reaches members" (pairwise secure channels).</p>`,
      `<p>Hint 2: Each sender has a sender key; distribute it to each member through the existing 1:1 encrypted sessions. Then each message needs one symmetric encryption.</p>`,
      `<p>Hint 3: On membership removal, all remaining senders create fresh sender keys and redistribute. Mention forward secrecy via ratcheting and the limits (e.g. compromised device).</p>`
    ],
    solution: {
      approach: `<p><b>Design (Signal-style Sender Keys, or MLS for large groups).</b></p>
        <ol>
          <li><b>Identity &amp; sessions:</b> every device has an identity key pair; pairwise sessions (X3DH + Double Ratchet) already exist between devices that chat 1:1. The server only relays ciphertext and prekey bundles.</li>
          <li><b>Sender key:</b> when Alice first speaks in a group she generates a random <i>sender key</i> (chain key + signing key). She sends it to each member device inside a pairwise-encrypted message (500 small messages once, not per chat message).</li>
          <li><b>Messages:</b> for each group message Alice derives a message key from her chain key (a one-way hash ratchet, so earlier keys cannot be recovered from later ones = forward secrecy), encrypts the payload once with AES-GCM, signs it, and uploads one ciphertext. The server fans it out to member inboxes.</li>
          <li><b>Membership change:</b> add: the new member receives current sender keys from members (history stays unreadable). Remove: all remaining senders discard their sender key and generate a new one (lazily, upon their next message), redistributing via pairwise channels. The removed member never obtains the new keys, so cannot decrypt later messages.</li>
          <li><b>Offline members:</b> they pick up queued sender-key updates before the messages that depend on them; a message arriving with an unknown key triggers a key re-request.</li>
          <li><b>Server-side enforcement:</b> the server also stops routing to removed members (defence in depth) and stamps group epochs.</li>
          <li><b>Limits &amp; trade-offs:</b> Sender Keys give weaker post-compromise security than per-message pairwise ratchets; MLS (tree-based group key agreement) gives O(log N) key updates and post-compromise security at higher complexity. Pairwise-per-message is the most secure and simplest but costs O(N) per message.</li>
        </ol>`,
      complexity: `<p>Send: O(1) encryption and upload; membership change: O(N) pairwise key messages per sender (or O(log N) with MLS).</p>`,
      followUps: ['How do you let a new member see recent history safely?', 'How would you add server-side spam detection without breaking E2EE?']
    }
  });

  practice.push({
    title: 'Cross-User Dedup Without Leaking Secrets', level: 'Hard', tags: ['dedup', 'privacy', 'security'], companies: ['Dropbox', 'Google', 'Microsoft'],
    statement: `<p>Global deduplication saves a lot of storage, but an attacker can upload a guessed file and learn from "upload skipped" whether someone else already stores it (for example a leaked document). Design a dedup scheme that keeps most of the savings and closes this and related leaks.</p>`,
    constraints: `Billions of chunks. Storage savings goal ≥ 25%. Users may enable client-side encryption (then dedup is off for those files). Hash of a chunk must never grant read access.`,
    example: `<p>Attacker uploads the hash of "secret-merger.pdf". If the server answers "already stored, no upload needed" the attacker knows the file exists somewhere. The fix: the answer looks the same either way, and the attacker must prove they possess the bytes.</p>`,
    brute: { why: `<p><b>Naive design:</b> <code>check(hash)</code> returns "exists" or "missing" to anyone, and a file whose hash exists is attached instantly to the uploader's account. The attacker gets an existence oracle, and anyone who only learned a hash can download the content by "uploading" that hash.</p>` },
    mcq: { q: 'What stops someone from reading a file just by knowing its hash?', options: ['Hashes are secret', 'Proof of possession: the server challenges the client to hash random byte ranges of the actual content before linking it', 'Longer hashes', 'Nothing can'], answer: 1, explain: 'A hash is an identifier, not a credential. Requiring the client to demonstrate it has the bytes (challenge-response on random ranges) prevents hash-only attacks.' },
    hints: [
      `<p>Hint 1: Think of two leaks: existence leakage (the skip answer) and access leakage (a hash grants a link to the data).</p>`,
      `<p>Hint 2: Make the server's observable behaviour independent of whether the chunk exists, or restrict dedup to cases where it reveals little.</p>`,
      `<p>Hint 3: Layer defences: proof of possession, per-user dedup by default, global dedup only for popular chunks, rate limits and monitoring for probing.</p>`
    ],
    solution: {
      approach: `<p><b>Layered design.</b></p>
        <ol>
          <li><b>Proof of possession:</b> when the client claims a chunk that exists, the server picks random offsets and asks for SHA-256 of those byte ranges (or an HMAC with a server nonce over the content). Only someone holding the real bytes can answer; a hash alone is useless. This closes the "hash = key" attack.</li>
          <li><b>Hide the oracle:</b> the client always completes the same protocol steps; the server accepts the upload stream and verifies the hash but may discard the bytes if the chunk already exists (cost: bandwidth, so apply only to small/medium files or randomly send a decoy amount). Alternatively return a uniform response and add random delay. This removes the clean signal from "skipped".</li>
          <li><b>Scope dedup:</b> default to <b>per-account (or per-organisation) dedup</b>, which leaks nothing across tenants. Enable <b>cross-account dedup only for popular chunks</b> (seen in ≥ k distinct accounts, e.g. k = 50) such as OS images and public movies. Existence of a popular chunk reveals nothing sensitive, and this still captures most of the savings because duplication follows a heavy tail.</li>
          <li><b>Encryption interplay:</b> customer-managed or client-side encrypted data bypasses dedup (ciphertext differs per key). Offer convergent encryption only with a salt scoped to an organisation, accepting that dedup works only within it.</li>
          <li><b>Abuse monitoring:</b> rate-limit chunk-existence checks per account, alert on probing patterns (many checks of never-uploaded hashes), and require an authenticated, verified account.</li>
          <li><b>Hygiene:</b> reference counts are per (account, chunk); deleting from one account never removes data another still references; legal takedowns map a hash to all referencing accounts.</li>
        </ol>
        <p>Result: most of the storage benefit, no existence oracle for sensitive uncommon files, and no access by hash.</p>`,
      complexity: `<p>Proof-of-possession costs O(challenge ranges) hashing per dedup hit, a few KB read; negligible compared with transferring the file.</p>`,
      followUps: ['How would you measure how much saving you lose by setting k = 50?', 'How does this change for a regulated health-data customer?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push({ q: 'In a WhatsApp-style design, when should the server acknowledge a message to the sender (one tick)?', options: ['When the gateway receives the bytes', 'After the message is durably stored for the recipient', 'After the recipient reads it', 'After the push notification is delivered'], answer: 1, explain: 'One tick is a promise that the server owns the message. That is only true after a durable (quorum) write; acking earlier risks losing it.' });
  quiz.push({ q: 'What is the main scaling bottleneck of a chat gateway fleet?', options: ['Disk space', 'Number of concurrent open connections', 'Number of SQL joins', 'CDN hit ratio'], answer: 1, explain: 'Messages are small and mostly idle sockets use little CPU, so memory and file descriptors per box (connections) limit capacity.' });
  quiz.push({ q: 'Why use per-chat sequence numbers instead of device timestamps to order messages?', options: ['Timestamps are too long', 'Device clocks drift and disagree; a server-assigned sequence is a consistent total order', 'Sequences compress better', 'Timestamps cannot be stored'], answer: 1, explain: 'Clock skew can place a reply before the message it answers. A monotonic sequence stamped by the server gives every client the same order.' });
  quiz.push({ q: 'Which approach is best for a normal user with 150 followers posting in a hybrid feed?', options: ['Pull at read time', 'Fan-out on write into follower timelines', 'Email the followers', 'Ignore the post'], answer: 1, explain: 'With few followers, pushing the post id into each timeline is cheap, and feed reads stay a single cache lookup.' });
  quiz.push({ q: 'Why is pure fan-out on write a bad fit for a celebrity with 50M followers?', options: ['Timelines cannot store ids', 'One post triggers 50M writes, causing lag and write storms', 'Followers dislike it', 'Reads become impossible'], answer: 1, explain: 'Write amplification is proportional to follower count; celebrities are therefore pulled at read time and merged.' });
  quiz.push({ q: 'What should a feed timeline cache store per entry?', options: ['The full post with images', 'Only the post id (hydrated at read time)', 'The user\'s password hash', 'The whole follower list'], answer: 1, explain: 'Ids are tiny (8 bytes) and keep edits, deletes and counters in one place; posts are hydrated by a batched multi-get.' });
  quiz.push({ q: 'Why do photo uploads go straight to object storage through a pre-signed URL?', options: ['It is cheaper to write code', 'Large bytes never pass through app servers, which keeps them small and scalable', 'It encrypts data automatically', 'It avoids the CDN'], answer: 1, explain: 'The signed URL authorises one direct write to storage. App servers only handle small metadata calls.' });
  quiz.push({ q: 'A like button on a viral post becomes a hot spot. Which fix is standard?', options: ['One counter row with a big lock', 'Sharded or batched counters with async flush and a unique (post, user) like record', 'COUNT(*) on every view', 'Remove likes'], answer: 1, explain: 'Splitting the counter spreads write contention; uniqueness of (post, user) prevents double likes; the shown number can lag slightly.' });
  quiz.push({ q: 'What is the purpose of a bitrate ladder in video streaming?', options: ['To compress audio only', 'To offer several quality levels so the player can match the viewer\'s bandwidth', 'To reduce the number of segments', 'To enable DRM'], answer: 1, explain: 'Multiple renditions let the adaptive player pick the best quality that the current network can sustain without buffering.' });
  quiz.push({ q: 'Why are video chunks for parallel transcoding cut at keyframes?', options: ['Keyframes are louder', 'A keyframe can be decoded alone so chunks are independent and switchable', 'It makes files bigger', 'CDNs require it'], answer: 1, explain: 'Frames between keyframes depend on earlier frames; cutting at I-frames lets chunks be encoded in parallel and stitched cleanly.' });
  quiz.push({ q: 'In adaptive bitrate streaming, where does the intelligence live?', options: ['In the origin server', 'In the client player, which chooses each segment\'s quality', 'In the load balancer', 'In the database'], answer: 1, explain: 'The server just serves static segments; the player measures throughput and buffer and picks the next rendition, which lets CDNs cache everything.' });
  quiz.push({ q: 'What does a file-sync client send to the server to avoid re-uploading unchanged data?', options: ['The whole file always', 'Chunk hashes; the server replies with which chunks it lacks', 'Only the file name', 'A screenshot'], answer: 1, explain: 'Content-addressed chunks let the server say "I already have these", so only new chunks are uploaded.' });
  quiz.push({ q: 'Two devices edit the same file offline from base version 3. The second commit arrives after the server is at version 4. What should happen?', options: ['Silently overwrite version 4', 'Reject with a conflict and keep the second edit as a conflicted copy', 'Delete both', 'Pick the larger file'], answer: 1, explain: 'Compare-and-swap on the base version detects the race; keeping both versions avoids data loss.' });
  quiz.push({ q: 'What is the risk of global cross-user deduplication?', options: ['It increases storage', 'An attacker can learn whether a given file already exists in the system', 'It slows downloads', 'It breaks chunk hashing'], answer: 1, explain: 'If "upload skipped" is observable, it becomes an existence oracle. Mitigate with proof of possession, scoped or popularity-gated dedup.' });

  /* ================= INTERVIEW ================= */
  interview.push({
    q: 'Walk me through how a message travels in a WhatsApp-like system when the receiver is offline.', level: 'I',
    a: `<p>Alice's app sends the message over its WebSocket with a client-generated id. The gateway forwards it to the Chat Service, which deduplicates on that id and writes it to the recipient's durable inbox (quorum write, per-recipient sequence number). Only then does it ack Alice (one tick). It asks the session store where Bob is connected; finding nothing, it triggers a content-free push notification through APNs/FCM. When Bob opens the app, it connects to a gateway and sends its last acked sequence; the server streams everything after it in order. Bob's app acks, the server deletes the rows and forwards a delivered receipt to Alice (two ticks). Delivery is at-least-once, and the client drops duplicates, so the human sees it exactly once.</p>`,
    followUps: ['What if the push notification fails?', 'What if the inbox grows for a user offline for 6 months?']
  });
  interview.push({
    q: 'Why WebSockets for chat instead of HTTP polling?', level: 'B',
    a: `<p>Polling asks "anything new?" repeatedly: most answers are "no", every request carries headers (hundreds of bytes), and latency is half the polling interval on average. With 100M online users even one poll per 5 seconds is 20M requests per second of mostly empty traffic. A WebSocket upgrades one HTTP connection to a persistent two-way pipe: the server pushes a message the instant it arrives, framing overhead is a few bytes, and idle connections cost only memory. The trade-off is that servers become stateful (a user is pinned to the gateway holding the socket), so you need a session map, heartbeats, graceful draining on deploys and push notifications for when the OS kills background sockets. Where WebSockets are blocked, fall back to long polling.</p>`,
    followUps: ['How do you deploy a new gateway version without disconnecting everyone at once?', 'When would Server-Sent Events be enough?']
  });
  interview.push({
    q: 'How do you guarantee message ordering in 1:1 and group chats?', level: 'I',
    a: `<p>Never trust client clocks. The server assigns a monotonically increasing sequence number per conversation (or per recipient inbox) at the moment it durably stores the message; clients sort and render by that number. For groups, route all messages of a group to the same partition or actor so one owner assigns sequences without distributed coordination. This gives a total order per conversation, which is all users need; there is no global order across conversations. Within a client, show a pending message locally with a temporary id and re-sort when the server sequence arrives. Gaps in the sequence signal a missing message, which the client repairs by requesting the missing range.</p>`,
    followUps: ['What if the sequencer for a group crashes?', 'Is causal ordering across different groups needed?']
  });
  interview.push({
    q: 'Explain fan-out on write versus fan-out on read for a news feed, and when you would use each.', level: 'I',
    a: `<p>Fan-out on write precomputes each follower's timeline: when someone posts, workers insert the post id into every follower's cached list. Feed reads become one cache lookup, which is ideal for read-heavy systems (reads outnumber posts 50:1), but writes cost followers-per-post and become impractical for accounts with millions of followers. Fan-out on read stores the post once and, when a user opens the feed, fetches the latest posts from everyone they follow and merges them; writes are free, reads are expensive and slow for users who follow many accounts. Real systems use a hybrid: push for ordinary accounts, pull for celebrities, merge both at read time, and skip fan-out to inactive users. The threshold is a cost decision based on active followers.</p>`,
    followUps: ['How do you choose the celebrity threshold?', 'What happens when an account crosses the threshold?']
  });
  interview.push({
    q: 'How would you design the feed read path to meet a 200 ms p99?', level: 'A',
    a: `<p>Keep the hot path to a few cache reads: fetch the user's precomputed timeline (ids) from Redis, fetch recent lists of followed celebrities (local or replicated cache), merge by id, hydrate the page with one batched multi-get from the post cache, then rank. Make ranking staged: ~1,000 candidates, a light model to ~200, a heavy model to ~50, then re-rank for diversity; the heavy model gets a strict time budget with a fallback to chronological order. Parallelise independent calls with timeouts and hedged requests, cap fan-in, and materialise a session snapshot so later pages do no ranking. Use cursor pagination and degrade gracefully (stale timeline, cached counts) when dependencies are slow.</p>`,
    followUps: ['Where would you put hedged requests?', 'How do you A/B test ranking models safely?']
  });
  interview.push({
    q: 'Design the photo upload flow for Instagram. Why pre-signed URLs?', level: 'I',
    a: `<p>The client requests an upload slot; the API creates a media row with status UPLOADING and returns a pre-signed URL for one direct write to object storage. The phone uploads the bytes straight to storage, so app servers handle only small metadata calls. A storage event puts a job on a queue; workers scan for abuse, strip EXIF, generate several renditions plus a blur placeholder, write them under deterministic keys and then mark the media READY (compare-and-set). The client creates the post, which triggers feed fan-out. Readers get renditions through a CDN. Idempotent jobs and a dead-letter queue handle crashes; a janitor removes orphaned uploads. Pre-signed URLs keep bandwidth, memory and CPU off the application tier and make it scale like object storage does.</p>`,
    followUps: ['How do you support resumable uploads for video?', 'How would you serve WebP/AVIF to supported clients?']
  });
  interview.push({
    q: 'How do you count likes on a post that gets 200K likes per second?', level: 'A',
    a: `<p>Separate the set from the number. The set (post_id, user_id) is stored with a unique key so likes are idempotent and "liked by me" is a lookup. The number is derived: increment a Redis counter, sharded into k cells for a hot post (user hash picks the cell), and emit an event to Kafka. A batching consumer aggregates deltas and writes the authoritative count to the database every few seconds, so the database sees one update per post per batch instead of 200K per second. Reads show the cached sum, formatted ("1.2M"). The count is eventually consistent; Redis can be rebuilt from the like set. Detect hot posts dynamically and raise the number of shards; apply rate limits and bot filtering.</p>`,
    followUps: ['What if the counter must be strictly accurate (e.g. a paid vote)?', 'How do you show likes by people you follow?']
  });
  interview.push({
    q: 'Describe the YouTube/Netflix upload-to-playback pipeline.', level: 'I',
    a: `<p>The upload (resumable) lands in a raw store. A workflow engine probes the file, splits it at keyframes into chunks, and schedules chunk × rendition encode tasks across a large pool of workers (often spot instances), all idempotent and retried on failure. A packager stitches encoded chunks, cuts short CMAF segments (2-6 s), applies DRM and writes HLS/DASH manifests. Outputs go to an origin store and are marked READY; popular titles are pre-warmed at CDN edges. Playback: the player downloads the manifest, picks a start quality, and fetches segments from the nearest edge, switching quality per segment depending on measured throughput and buffer. Views come from heartbeat events processed by a stream job; metadata and search sit beside this pipeline.</p>`,
    followUps: ['How do you prioritise a premiere over back-catalogue re-encodes?', 'How do you decide when to use AV1?']
  });
  interview.push({
    q: 'How does adaptive bitrate streaming work and what are its trade-offs?', level: 'I',
    a: `<p>Video is encoded at several bitrates and cut into short segments. A manifest lists renditions. The player downloads one segment at a time, measures throughput and buffer occupancy, and chooses the rendition for the next segment: throughput-based schemes choose the highest bitrate below about 80% of the smoothed estimate; buffer-based schemes map buffer level to bitrate; hybrid schemes optimise quality minus stall and switching penalties. Good players step up gradually but step down quickly. Trade-offs: short segments adapt faster but increase request overhead and latency; long segments are efficient but sluggish. The server is just static files, so CDNs cache everything, and quality, stalls and switching must be balanced since users hate stalls most.</p>`,
    followUps: ['What happens at start-up and why start low?', 'How does live streaming change the buffer strategy?']
  });
  interview.push({
    q: 'Why is a CDN essential for video, and how does Netflix go further?', level: 'I',
    a: `<p>Video egress is the dominant cost and latency factor: 1B hours/day at 3 Mbps is on the order of 100+ Tbps. A CDN serves immutable segments from locations near viewers, so the origin only handles cache misses, and long-tail popularity means a small share of titles produces most traffic and caches well. Netflix places its own appliances (Open Connect) inside ISP networks and fills them during off-peak hours with titles predicted to be popular in that region, so peak-time viewing never crosses the internet backbone. Techniques: tiered caches (edge, mid-tier, origin shield), request collapsing, consistent hashing across cache servers, versioned URLs, and multi-CDN steering by real-time error rates.</p>`,
    followUps: ['How do you decide what to prefill each night?', 'How do you handle a sudden hit title nobody predicted?']
  });
  interview.push({
    q: 'How does file sync work in Dropbox/Google Drive? Why chunking?', level: 'I',
    a: `<p>The client watches the file system, splits changed files into chunks (about 4 MB, ideally content-defined), and hashes each. It asks the block server which hashes are missing and uploads only those, then commits a new file version (an ordered list of chunk hashes) to the strongly consistent metadata service with its base version. The commit appends to a per-namespace change log; a notification service pings other devices, which fetch the changes, diff chunk lists and download only missing chunks. Chunking gives delta sync (edit 1 MB of a 1 GB file, send one chunk), resumable transfers, deduplication, cheap versions (share chunks), and parallel upload/download. The cost is metadata volume (billions of chunk records) and CPU for hashing.</p>`,
    followUps: ['Why are content-defined chunks better than fixed-size?', 'How is garbage collection of chunks done safely?']
  });
  interview.push({
    q: 'How would you resolve sync conflicts when two devices edit the same file offline?', level: 'A',
    a: `<p>Use optimistic concurrency: every commit carries the base version it was derived from, and the metadata service performs a compare-and-swap. If the base is stale the commit is rejected as a conflict. For arbitrary binary files the safe policy is to keep both: store the loser as a new "conflicted copy" file, so nothing is lost, and let the user reconcile. For text and code a three-way merge using the common base can resolve automatically; for live collaborative documents use operational transformation or CRDTs. Identify files by immutable ids so a rename and an edit touch different attributes and merge naturally. Last-write-wins by timestamp is dangerous for user data because of clock skew and silent loss.</p>`,
    followUps: ['How do you handle delete vs edit?', 'How do you prevent sync loops?']
  });
  interview.push({
    q: 'What are the privacy and security issues with deduplication?', level: 'A',
    a: `<p>Cross-user dedup leaks existence: if an upload is skipped because the chunk exists, an attacker can confirm whether a specific file is stored by someone else. Treating a hash as a credential lets people with only the hash obtain the data. Mitigations: proof of possession (challenge random byte ranges), keep the observable behaviour identical for hits and misses, scope dedup to an account or organisation by default and enable cross-account dedup only for chunks seen by many accounts, rate-limit and monitor existence probes, and never authorise based on the hash alone. Encryption interplay: client-side encryption defeats dedup, and convergent encryption restores it at the cost of guess-the-file attacks, so use it only within a trust boundary.</p>`,
    followUps: ['How much saving do you lose by restricting to popular chunks?', 'How do takedown requests work with shared chunks?']
  });
  interview.push({
    q: 'A celebrity with 100M followers posts and traffic spikes. What do you do?', level: 'E',
    a: `<p>Do not fan the post out; store it once and add it to the celebrity recent list. Serve the hot objects (the post, the list, the author's profile) from replicated, in-process caches with short jittered TTLs and single-flight coalescing so 250K reads per second cause only a handful of origin fetches. Replicate the hot key or add suffixes to spread cache shard load; push media to the CDN as soon as it is created. Counters use sharded, batched writes; replies are paged and cached. Isolate this traffic with bulkheads and autoscale pre-provisioned capacity. If overloaded, degrade in order: cheaper ranking, stale timelines, cached counts, smaller pages, then prioritised load shedding. Rehearse using load tests and game-day drills before big events.</p>`,
    followUps: ['How do you detect hot keys automatically?', 'How would you protect the push notification service?']
  });
  interview.push({
    q: 'How does end-to-end encryption change the design of a messaging system?', level: 'E',
    a: `<p>The server becomes a blind relay for ciphertext plus routing metadata. Consequences: no server-side search, spam scanning or AI features on content (must run on-device or with explicit opt-in); each device holds its own keys, so fan-out counts devices and a message is encrypted per device (or once with a group sender key); history cannot be restored from the server, so device linking needs an encrypted transfer; server-side deduplication of media is limited; push notifications must carry no content. Group membership changes require key rotation so removed members cannot read future messages. Metadata (who talks to whom, when, sizes) is still visible and must be minimised and protected. Abuse reporting relies on user-forwarded plaintext.</p>`,
    followUps: ['How would you build smart replies in an E2EE app?', 'What are the trade-offs of Sender Keys versus MLS?']
  });

  registerModule({
    id: 'hld15',
    title: 'Case Studies II: WhatsApp, News Feed, Instagram, YouTube/Netflix, Google Drive',
    intro: `<p>This module walks through five of the most-asked system design interview questions, end to end: <b>WhatsApp</b> (real-time messaging), the <b>News Feed</b> (fan-out and the celebrity problem), <b>Instagram</b> (media storage, CDN and counters), <b>YouTube/Netflix</b> (transcoding and adaptive streaming) and <b>Google Drive</b> (chunked file sync, dedup and conflicts). Each case follows the same interview frame: requirements, back-of-envelope numbers, APIs, data model, high-level architecture, deep dives and trade-offs. You will step through animated message flows, fan-out queues, transcoding pipelines, bitrate switching and chunk-hash dedup, then practise with 15 problems and interview questions. It builds directly on caching, messaging, databases at scale and Case Studies I.</p>`,
    goals: [
      'Run the full interview frame (requirements, estimates, APIs, data model, architecture, deep dives, trade-offs) on five classic systems',
      'Explain real-time messaging with WebSockets, store-and-forward, delivery and read receipts, and ordering with sequence numbers',
      'Choose between fan-out on write, fan-out on read and the hybrid approach, and size the celebrity threshold with cost reasoning',
      'Design media upload, storage, thumbnailing, CDN delivery and hot-key counters for a photo or video product',
      'Explain parallel transcoding pipelines and adaptive bitrate streaming, including the client-side bitrate decision',
      'Design chunked, resumable, deduplicated file sync with metadata/block separation and sensible conflict resolution'
    ],
    prereqs: `HLD 3 (Estimation &amp; the Interview Framework), HLD 4 (DNS, CDN, Proxies &amp; Load Balancing), HLD 5 (Databases at Scale), HLD 6 (Caching), HLD 8 (Messaging &amp; Streaming), HLD 9 (APIs, Gateways &amp; Rate Limiting) and HLD 14 (Case Studies I).`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
