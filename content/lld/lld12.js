(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by all visualizers ---------- */
  // a box node for class / component diagrams
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  // a graph part; edges are [from, to, label]
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: o.undirected ? false : true, height: o.h || 60, nodes: nodes, edges: edges, hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function CODE(label, code, hl, alt) { var p = { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; if (!alt && typeof ALT_BY_CODE !== 'undefined') alt = ALT_BY_CODE[code]; if (alt) p.alt = alt; return p; }
  var GETLOGGER_PY = [
    "def get_logger(self, name):",
    "    dot = name.rfind(\".\")",
    "    parent = self.root if dot < 0 else self.get_logger(name[:dot])",
    "    if name not in self.loggers: self.loggers[name] = Logger(name, parent)",
    "    return self.loggers[name]"
  ].join('\n');
  var GETLOGGER_TS = [
    "getLogger(name: string): Logger {",
    "  const dot = name.lastIndexOf(\".\");",
    "  const parent = dot < 0 ? this.root : this.getLogger(name.slice(0, dot));",
    "  if (!this.loggers.has(name)) this.loggers.set(name, new Logger(name, parent));",
    "  return this.loggers.get(name)!;",
    "}"
  ].join('\n');
  var GETLOGGER_CPP = [
    "Logger& getLogger(const string& name) {",
    "  size_t dot = name.rfind('.');",
    "  Logger* parent = dot == string::npos ? &root : &getLogger(name.substr(0, dot));",
    "  auto it = loggers.try_emplace(name, name, parent).first;",
    "  return it->second; }"
  ].join('\n');
  var GETLOGGER_ALT = { python: { code: GETLOGGER_PY, map: {} }, js: { lang: 'ts', code: GETLOGGER_TS, map: {} }, cpp: { code: GETLOGGER_CPP, map: {} } };
  var LOG_PY = [
    "def log(self, lv, p, *a):",
    "    if not self.is_enabled(lv): return   # cheap exit",
    "    self.dispatch(LogMessage(lv, self.name, fill(p, a), now(), current_thread(), MDC.snapshot()))"
  ].join('\n');
  var LOG_TS = [
    "log(lv: LogLevel, p: string, ...a: unknown[]): void {",
    "  if (!this.isEnabled(lv)) return;   // cheap exit",
    "  this.dispatch(new LogMessage(lv, this.name, fill(p, a), now(), threadId(), MDC.snapshot()));",
    "}"
  ].join('\n');
  var LOG_CPP = [
    "template <class... A> void log(LogLevel lv, const string& p, A... a) {",
    "  if (!isEnabled(lv)) return;   // cheap exit",
    "  dispatch(LogMessage(lv, name, fill(p, a...), now(), this_thread::get_id(), MDC::snapshot()));",
    "}"
  ].join('\n');
  var LOG_ALT = { python: { code: LOG_PY, map: {} }, js: { lang: 'ts', code: LOG_TS, map: {} }, cpp: { code: LOG_CPP, map: {} } };
  var HANDLE_PY = [
    "def handle(self, m):",
    "    if m.level >= self.min_level: self.write(m)",
    "    if self.next is not None: self.next.handle(m)"
  ].join('\n');
  var HANDLE_TS = [
    "handle(m: LogMessage): void {",
    "  if (m.level >= this.minLevel) this.write(m);",
    "  if (this.next !== null) this.next.handle(m);",
    "}"
  ].join('\n');
  var HANDLE_CPP = [
    "void handle(const LogMessage& m) {",
    "  if (m.level >= minLevel) write(m);",
    "  if (next != nullptr) next->handle(m);",
    "}"
  ].join('\n');
  var HANDLE_ALT = { python: { code: HANDLE_PY, map: {} }, js: { lang: 'ts', code: HANDLE_TS, map: {} }, cpp: { code: HANDLE_CPP, map: {} } };
  var CHOOSE_PY = [
    "def choose(self, key, n):",
    "    if key is None: return next(self.rr) % n",
    "    return stable_hash(key) % n"
  ].join('\n');
  var CHOOSE_TS = [
    "choose(key: string | null, n: number): number {",
    "  if (key === null) return mod(this.rr++, n);",
    "  return mod(stableHash(key), n);",
    "}"
  ].join('\n');
  var CHOOSE_CPP = [
    "int choose(const optional<string>& key, int n) {",
    "  if (!key) return floorMod(rr++, n);",
    "  return floorMod(hash<string>{}(*key), n);",
    "}"
  ].join('\n');
  var CHOOSE_ALT = { python: { code: CHOOSE_PY, map: {} }, js: { lang: 'ts', code: CHOOSE_TS, map: {} }, cpp: { code: CHOOSE_CPP, map: {} } };
  var APPEND_PY = [
    "def append(self, key, value):",
    "    with self.lock:",
    "        offset = self.start_offset + len(self.log)",
    "        self.log.append(StoredMessage(offset, key, value, now()))",
    "        return offset"
  ].join('\n');
  var APPEND_TS = [
    "append(key: string | null, value: string): number {   // runs to completion: no other caller interleaves",
    "  const offset = this.startOffset + this.log.length;",
    "  this.log.push(new StoredMessage(offset, key, value, now()));",
    "  return offset;",
    "}"
  ].join('\n');
  var APPEND_CPP = [
    "long long append(const optional<string>& key, const string& value) {",
    "  lock_guard<mutex> g(m);",
    "  long long offset = startOffset + log.size();",
    "  log.push_back(StoredMessage{offset, key, value, now()});",
    "  return offset;",
    "}"
  ].join('\n');
  var APPEND_ALT = { python: { code: APPEND_PY, map: {"2":3,"3":4} }, js: { lang: 'ts', code: APPEND_TS, map: {} }, cpp: { code: APPEND_CPP, map: {"2":3,"3":4} } };
  var BATCH_PY = [
    "batch = p.read(position, max)",
    "if batch:",
    "    position = last_offset + 1   # local only!"
  ].join('\n');
  var BATCH_TS = [
    "const batch = p.read(position, max);",
    "if (batch.length > 0)",
    "  position = lastOffset + 1;   // local only!"
  ].join('\n');
  var BATCH_CPP = [
    "auto batch = p.read(position, max);",
    "if (!batch.empty())",
    "  position = lastOffset + 1;   // local only!"
  ].join('\n');
  var BATCH_ALT = { python: { code: BATCH_PY, map: {} }, js: { lang: 'ts', code: BATCH_TS, map: {} }, cpp: { code: BATCH_CPP, map: {} } };
  var BISHOP_PY = [
    "class Bishop(Piece):",
    "    def pseudo_legal_moves(self, b, f):",
    "        return self.slide(b, f, DIAGONAL)"
  ].join('\n');
  var BISHOP_TS = [
    "class Bishop extends Piece {",
    "  pseudoLegalMoves(b: Board, f: Position): Move[] {",
    "    return this.slide(b, f, DIAGONAL);",
    "  }",
    "}"
  ].join('\n');
  var BISHOP_CPP = [
    "struct Bishop : Piece {",
    "  vector<Move> pseudoLegalMoves(const Board& b, Position f) const override {",
    "    return slide(b, f, DIAGONAL);",
    "  }",
    "};"
  ].join('\n');
  var BISHOP_ALT = { python: { code: BISHOP_PY, map: {} }, js: { lang: 'ts', code: BISHOP_TS, map: {} }, cpp: { code: BISHOP_CPP, map: {} } };
  var LEGAL_PY = [
    "for m in piece.pseudo_legal_moves(b, frm):",
    "    nxt = b.copy()",
    "    nxt.apply(m)",
    "    if not nxt.is_attacked(nxt.king_of(side), enemy): legal.append(m)"
  ].join('\n');
  var LEGAL_TS = [
    "for (const m of piece.pseudoLegalMoves(b, from)) {",
    "  const next = b.copy();",
    "  next.apply(m);",
    "  if (!next.isAttacked(next.kingOf(side), enemy)) legal.push(m);",
    "}"
  ].join('\n');
  var LEGAL_CPP = [
    "for (const Move& m : piece->pseudoLegalMoves(b, from)) {",
    "  Board next = b;",
    "  next.apply(m);",
    "  if (!next.isAttacked(next.kingOf(side), enemy)) legal.push_back(m);",
    "}"
  ].join('\n');
  var LEGAL_ALT = { python: { code: LEGAL_PY, map: {} }, js: { lang: 'ts', code: LEGAL_TS, map: {} }, cpp: { code: LEGAL_CPP, map: {} } };
  var SLIDE_PY = [
    "for p in ray(frm, d):          # frm + d, frm + 2d, ... while on the board",
    "    if empty(p): add(p); continue",
    "    if enemy(p): add(p)         # capture",
    "    break                       # blocked"
  ].join('\n');
  var SLIDE_TS = [
    "for (const p of ray(from, d)) {   // from + d, from + 2d, ... while on the board",
    "  if (empty(p)) { add(p); continue; }",
    "  if (enemy(p)) add(p);   // capture",
    "  break;                  // blocked",
    "}"
  ].join('\n');
  var SLIDE_CPP = [
    "for (Position p = from + d; p.onBoard(); p = p + d) {",
    "  if (empty(p)) { add(p); continue; }",
    "  if (enemy(p)) add(p);   // capture",
    "  break;                  // blocked",
    "}"
  ].join('\n');
  var SLIDE_ALT = { python: { code: SLIDE_PY, map: {} }, js: { lang: 'ts', code: SLIDE_TS, map: {} }, cpp: { code: SLIDE_CPP, map: {} } };
  var STAGE2_PY = [
    "nxt = board.copy()",
    "nxt.apply(move)",
    "if nxt.is_attacked(nxt.king_of(side), enemy):",
    "    reject(move)   # leaves own king in check"
  ].join('\n');
  var STAGE2_TS = [
    "const next = board.copy();",
    "next.apply(move);",
    "if (next.isAttacked(next.kingOf(side), enemy))",
    "  reject(move);   // leaves own king in check"
  ].join('\n');
  var STAGE2_CPP = [
    "Board next = board;",
    "next.apply(move);",
    "if (next.isAttacked(next.kingOf(side), enemy))",
    "  reject(move);   // leaves own king in check"
  ].join('\n');
  var STAGE2_ALT = { python: { code: STAGE2_PY, map: {} }, js: { lang: 'ts', code: STAGE2_TS, map: {} }, cpp: { code: STAGE2_CPP, map: {} } };
  var JUMP_PY = [
    "for dr, dc in deltas:",
    "    p = frm.plus(dr, dc)",
    "    if p.on_board() and (empty(p) or enemy(p)): add(p)"
  ].join('\n');
  var JUMP_TS = [
    "for (const [dr, dc] of deltas) {",
    "  const p = from.plus(dr, dc);",
    "  if (p.onBoard() && (empty(p) || enemy(p))) add(p);",
    "}"
  ].join('\n');
  var JUMP_CPP = [
    "for (auto [dr, dc] : deltas) {",
    "  Position p = from.plus(dr, dc);",
    "  if (p.onBoard() && (empty(p) || enemy(p))) add(p);",
    "}"
  ].join('\n');
  var JUMP_ALT = { python: { code: JUMP_PY, map: {} }, js: { lang: 'ts', code: JUMP_TS, map: {} }, cpp: { code: JUMP_CPP, map: {} } };
  var UNDO_PY = [
    "def _record_undo(self, key):",
    "    if self.tx_stack:",
    "        self.tx_stack[-1].setdefault(key,",
    "            self.data.get(key))   # None = \"key was absent\""
  ].join('\n');
  var UNDO_TS = [
    "private recordUndo(key: string): void {",
    "  if (this.txStack.length > 0)",
    "    setIfAbsent(this.txStack[this.txStack.length - 1], key,",
    "        this.data.get(key) ?? null);   // null = \"key was absent\"",
    "}"
  ].join('\n');
  var UNDO_CPP = [
    "void recordUndo(const string& key) {",
    "  if (!txStack.empty())",
    "    txStack.back().try_emplace(key,",
    "        data.count(key) ? optional<Entry>(data.at(key)) : nullopt);",
    "}"
  ].join('\n');
  var UNDO_ALT = { python: { code: UNDO_PY, map: {} }, js: { lang: 'ts', code: UNDO_TS, map: {} }, cpp: { code: UNDO_CPP, map: {} } };
  var WRITE_PY = [
    "def _write_raw(self, key, e):",
    "    old = self.data.get(key)",
    "    if e is None: self.data.pop(key, None)",
    "    else: self.data[key] = e",
    "    if old is not None: self._decrement(old.value)",
    "    if e is not None: self._increment(e.value)"
  ].join('\n');
  var WRITE_TS = [
    "private writeRaw(key: string, e: Entry | null): void {",
    "  const old = this.data.get(key);",
    "  if (e === null) this.data.delete(key); else this.data.set(key, e);",
    "  if (old !== undefined) this.decrement(old.value);",
    "  if (e !== null) this.increment(e.value);",
    "}"
  ].join('\n');
  var WRITE_CPP = [
    "void writeRaw(const string& key, const optional<Entry>& e) {",
    "  auto it = data.find(key);",
    "  optional<Entry> old = it == data.end() ? nullopt : optional<Entry>(it->second);",
    "  if (e) data[key] = *e; else data.erase(key);",
    "  if (old) decrement(old->value);",
    "  if (e) increment(e->value);",
    "}"
  ].join('\n');
  var WRITE_ALT = { python: { code: WRITE_PY, map: {"2":3,"3":5,"4":6} }, js: { lang: 'ts', code: WRITE_TS, map: {"2":3,"3":4,"4":5} }, cpp: { code: WRITE_CPP, map: {"2":4,"3":5,"4":6} } };
  var ALT_BY_CODE = {};
  ALT_BY_CODE["Logger getLogger(String name) {\n  int dot = name.lastIndexOf('.');\n  Logger parent = dot < 0 ? root : getLogger(name.substring(0, dot));\n  return loggers.computeIfAbsent(name, n -> new Logger(n, parent));\n}"] = GETLOGGER_ALT;
  ALT_BY_CODE["void log(LogLevel lv, String p, Object... a) {\n  if (!isEnabled(lv)) return;   // cheap exit\n  dispatch(new LogMessage(lv, name, fill(p, a), now, thread, MDC.snapshot()));\n}"] = LOG_ALT;
  ALT_BY_CODE["final void handle(LogMessage m) {\n  if (m.level().atLeast(minLevel)) write(m);\n  if (next != null) next.handle(m);\n}"] = HANDLE_ALT;
  ALT_BY_CODE["int choose(String key, int n) {\n  if (key == null) return floorMod(rr.getAndIncrement(), n);\n  return floorMod(key.hashCode(), n);\n}"] = CHOOSE_ALT;
  ALT_BY_CODE["synchronized long append(String key, String value) {\n  long offset = startOffset + log.size();\n  log.add(new StoredMessage(offset, key, value, now));\n  return offset;\n}"] = APPEND_ALT;
  ALT_BY_CODE["List<StoredMessage> batch = p.read(position, max);\nif (!batch.isEmpty())\n  position = lastOffset + 1;   // local only!"] = BATCH_ALT;
  ALT_BY_CODE["class Bishop extends Piece {\n  List<Move> pseudoLegalMoves(Board b, Position f) {\n    return slide(b, f, DIAGONAL);\n  }\n}"] = BISHOP_ALT;
  ALT_BY_CODE["for (Move m : piece.pseudoLegalMoves(b, from)) {\n  Board next = b.copy();\n  next.apply(m);\n  if (!next.isAttacked(next.kingOf(side), enemy)) legal.add(m);\n}"] = LEGAL_ALT;
  ALT_BY_CODE["for (p = from + d; p.onBoard(); p = p + d) {\n  if (empty(p)) { add(p); continue; }\n  if (enemy(p)) add(p);   // capture\n  break;                  // blocked\n}"] = SLIDE_ALT;
  ALT_BY_CODE["Board next = board.copy();\nnext.apply(move);\nif (next.isAttacked(next.kingOf(side), enemy))\n  reject(move);   // leaves own king in check"] = STAGE2_ALT;
  ALT_BY_CODE["for (int[] d : deltas) {\n  Position p = from.plus(d[0], d[1]);\n  if (p.onBoard() && (empty(p) || enemy(p))) add(p);\n}"] = JUMP_ALT;
  ALT_BY_CODE["private void recordUndo(String key) {\n  if (!txStack.isEmpty())\n    txStack.peek().putIfAbsent(key,\n        Optional.ofNullable(data.get(key)));\n}"] = UNDO_ALT;
  ALT_BY_CODE["private void writeRaw(String key, Entry e) {\n  Entry old = e == null ? data.remove(key) : data.put(key, e);\n  if (old != null) decrement(old.value());\n  if (e != null) increment(e.value());\n}"] = WRITE_ALT;
  function VARS(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function MAP(label, entries, hl) { return { type: 'map', label: label, entries: entries.map(function (e) { return [String(e[0]), String(e[1])]; }), hl: hl || {} }; }
  function STACK(label, items, hl) { return { type: 'stack', label: label, items: items.slice(), hl: hl || {} }; }
  function QUEUE(label, items, hl, front, back) { return { type: 'queue', label: label, items: items.slice(), hl: hl || {}, frontLabel: front || 'front', backLabel: back || 'back' }; }
  function TABLE(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function GRID(label, rows, rowHead, colHead, hl) { return { type: 'grid', label: label, rows: rows.map(function (r) { return r.slice(); }), rowHead: rowHead, colHead: colHead, hl: hl || {} }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // walk a class diagram: one frame per highlighted class, with a note
  function classTour(label, nodes, edges, steps, h) {
    return steps.map(function (s) {
      var hl = {}, ehl = {};
      (s.on || []).forEach(function (id) { hl[id] = s.cls || 'cur'; });
      (s.edges || []).forEach(function (e) { ehl[e] = 'ok'; });
      var parts = [G(label, nodes, edges, { hl: hl, ehl: ehl, h: h || 60, tags: s.tags || {} })];
      if (s.code) parts.push(CODE(s.codeLabel || 'Key code', s.code, s.codeHl));
      if (s.table) parts.push(TABLE(s.table.label, s.table.cols, s.table.rows, s.table.hl));
      return F(s.narr, parts);
    });
  }

  /* ======================= TOPIC 1: LOGGING FRAMEWORK ======================= */
  var LOG_CORE = String.raw`
// ===== A small but real logging framework (think: a mini Log4j / Logback) =====

// 1) Levels: an enum with a number, so "is WARN at least INFO?" is one comparison.
enum LogLevel {
    DEBUG(10), INFO(20), WARN(30), ERROR(40), FATAL(50);
    final int severity;
    LogLevel(int severity) { this.severity = severity; }
    boolean atLeast(LogLevel other) { return this.severity >= other.severity; }
}

// 2) The message: an immutable record. Built ONCE, then shared by every handler/appender.
record LogMessage(LogLevel level, String logger, String text, long epochMillis,
                  String thread, Map<String, String> context) { }

// 3) MDC = "Mapped Diagnostic Context": per-thread key/values (requestId, userId)
//    that get stamped on every message without passing them as parameters.
final class MDC {
    private static final ThreadLocal<Map<String, String>> CTX = ThreadLocal.withInitial(HashMap::new);
    static void put(String k, String v) { CTX.get().put(k, v); }
    static void clear() { CTX.get().clear(); }
    static Map<String, String> snapshot() { return Map.copyOf(CTX.get()); }  // copy: message must not change later
}

// 4) Formatter = HOW a message looks (Strategy pattern).
interface LogFormatter { String format(LogMessage m); }

class PlainFormatter implements LogFormatter {
    public String format(LogMessage m) {
        String ctx = m.context().isEmpty() ? "" : " " + new TreeMap<>(m.context());
        return String.format("%-5s [%s] %s -%s %s", m.level(), m.thread(), m.logger(), ctx, m.text());
    }
}

class JsonFormatter implements LogFormatter {
    public String format(LogMessage m) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"ts\":").append(m.epochMillis())
          .append(",\"level\":\"").append(m.level()).append('"')
          .append(",\"logger\":\"").append(m.logger()).append('"')
          .append(",\"msg\":\"").append(m.text().replace("\"", "'")).append('"');
        for (Map.Entry<String, String> e : new TreeMap<>(m.context()).entrySet())
            sb.append(",\"").append(e.getKey()).append("\":\"").append(e.getValue()).append('"');
        return sb.append('}').toString();
    }
}

// 5) Appender = WHERE a message goes (console, file, network...). New target = new class.
interface Appender {
    void append(LogMessage m);
    default void close() { }
}

class ConsoleAppender implements Appender {
    private final LogFormatter formatter;
    ConsoleAppender(LogFormatter formatter) { this.formatter = formatter; }
    // synchronized: two threads must not interleave half-lines
    public synchronized void append(LogMessage m) { System.out.println(formatter.format(m)); }
}

// Stands in for a FileAppender: keeps lines in memory so the demo has no disk side effects.
class MemoryAppender implements Appender {
    private final LogFormatter formatter;
    private final List<String> lines = Collections.synchronizedList(new ArrayList<>());
    MemoryAppender(LogFormatter formatter) { this.formatter = formatter; }
    public void append(LogMessage m) { lines.add(formatter.format(m)); }
    List<String> lines() { return List.copyOf(lines); }
}

// Decorator: makes ANY appender asynchronous. Callers only pay for a queue offer.
class AsyncAppender implements Appender {
    private static final LogMessage POISON = new LogMessage(LogLevel.FATAL, "", "", 0, "", Map.of());
    private final Appender target;
    private final BlockingQueue<LogMessage> queue;
    private final AtomicLong dropped = new AtomicLong();
    private final Thread worker;

    AsyncAppender(Appender target, int capacity) {
        this.target = target;
        this.queue = new ArrayBlockingQueue<>(capacity);
        this.worker = new Thread(this::drain, "log-writer");
        this.worker.setDaemon(true);          // never keeps the JVM alive
        this.worker.start();
    }

    public void append(LogMessage m) {
        if (m.level().atLeast(LogLevel.WARN)) {
            try { queue.put(m); }             // important messages: wait for space
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        } else if (!queue.offer(m)) {
            dropped.incrementAndGet();        // DEBUG/INFO under pressure: drop, but count it
        }
    }

    private void drain() {
        try {
            while (true) {
                LogMessage m = queue.take();
                if (m == POISON) return;
                target.append(m);
            }
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    public void close() {
        try {
            queue.put(POISON);                // everything queued before it gets written first
            worker.join(2000);                // bounded wait: shutdown can never hang
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        target.close();
    }
    long dropped() { return dropped.get(); }
}

// 6) Chain of Responsibility: each handler checks its own minimum level,
//    writes if it cares, then passes the SAME message to the next handler.
abstract class LogHandler {
    private LogHandler next;
    protected final LogLevel minLevel;
    LogHandler(LogLevel minLevel) { this.minLevel = minLevel; }
    LogHandler linkWith(LogHandler next) { this.next = next; return next; }  // returns next for fluent chaining
    final void handle(LogMessage m) {                                          // template method: order is fixed
        if (m.level().atLeast(minLevel)) write(m);
        if (next != null) next.handle(m);
    }
    protected abstract void write(LogMessage m);
}

class AppenderHandler extends LogHandler {
    private final Appender appender;
    AppenderHandler(LogLevel minLevel, Appender appender) { super(minLevel); this.appender = appender; }
    protected void write(LogMessage m) { appender.append(m); }
}

// 7) Logger: named, hierarchical ("com.shop.db" -> "com.shop" -> "com" -> root).
class Logger {
    private final String name;
    private final Logger parent;
    private volatile LogLevel level;          // null = inherit from parent
    private volatile LogHandler handlers;     // head of this logger's chain (may be null)
    private volatile boolean additive = true; // also send to parent's handlers?

    Logger(String name, Logger parent) { this.name = name; this.parent = parent; }

    void setLevel(LogLevel level) { this.level = level; }
    void setHandlers(LogHandler head) { this.handlers = head; }
    void setAdditive(boolean additive) { this.additive = additive; }

    LogLevel effectiveLevel() {
        for (Logger l = this; l != null; l = l.parent) if (l.level != null) return l.level;
        return LogLevel.INFO;                 // safe default if even root has none
    }
    boolean isEnabled(LogLevel lv) { return lv.atLeast(effectiveLevel()); }

    // Cheap exit FIRST: if disabled we never build the string.
    void log(LogLevel lv, String pattern, Object... args) {
        if (!isEnabled(lv)) return;
        dispatch(new LogMessage(lv, name, fill(pattern, args), System.currentTimeMillis(),
                                Thread.currentThread().getName(), MDC.snapshot()));
    }
    // Lazy variant: the Supplier runs only when the level is enabled.
    void log(LogLevel lv, Supplier<String> lazy) {
        if (!isEnabled(lv)) return;
        dispatch(new LogMessage(lv, name, lazy.get(), System.currentTimeMillis(),
                                Thread.currentThread().getName(), MDC.snapshot()));
    }
    void debug(String p, Object... a) { log(LogLevel.DEBUG, p, a); }
    void info(String p, Object... a)  { log(LogLevel.INFO, p, a); }
    void warn(String p, Object... a)  { log(LogLevel.WARN, p, a); }
    void error(String p, Object... a) { log(LogLevel.ERROR, p, a); }

    // Second chain: walk up the logger tree until a non-additive logger stops it.
    private void dispatch(LogMessage m) {
        for (Logger l = this; l != null; l = l.parent) {
            LogHandler h = l.handlers;
            if (h != null) h.handle(m);
            if (!l.additive) break;
        }
    }

    // "{}" placeholders, SLF4J style. Plain text is NEVER interpreted (no lookups -> no Log4Shell).
    static String fill(String pattern, Object... args) {
        StringBuilder sb = new StringBuilder();
        int a = 0, i = 0;
        while (i < pattern.length()) {
            if (a < args.length && pattern.startsWith("{}", i)) { sb.append(args[a++]); i += 2; }
            else sb.append(pattern.charAt(i++));
        }
        return sb.toString();
    }
}

// 8) LogManager: the single registry (Singleton + Factory). Same name -> same Logger object.
final class LogManager {
    private static final LogManager INSTANCE = new LogManager();
    private final Logger root = new Logger("root", null);
    private final ConcurrentHashMap<String, Logger> loggers = new ConcurrentHashMap<>();
    private LogManager() { }
    static LogManager get() { return INSTANCE; }
    Logger root() { return root; }

    Logger getLogger(String name) {
        Logger existing = loggers.get(name);
        if (existing != null) return existing;
        int dot = name.lastIndexOf('.');
        Logger parent = dot < 0 ? root : getLogger(name.substring(0, dot));   // create ancestors first
        return loggers.computeIfAbsent(name, n -> new Logger(n, parent));
    }
}

public class LoggingDemo {
    public static void main(String[] args) {
        LogManager lm = LogManager.get();
        MemoryAppender file = new MemoryAppender(new JsonFormatter());
        MemoryAppender pager = new MemoryAppender(new PlainFormatter());

        // root chain: Console(>=DEBUG) -> File(>=INFO) -> Pager(>=ERROR)
        LogHandler head = new AppenderHandler(LogLevel.DEBUG, new ConsoleAppender(new PlainFormatter()));
        head.linkWith(new AppenderHandler(LogLevel.INFO, file))
            .linkWith(new AppenderHandler(LogLevel.ERROR, pager));
        lm.root().setLevel(LogLevel.INFO);
        lm.root().setHandlers(head);

        Logger db = lm.getLogger("com.shop.db");
        Logger pay = lm.getLogger("com.shop.payment");
        db.setLevel(LogLevel.DEBUG);                // turn on DEBUG only for the DB package

        MDC.put("requestId", "r-77");
        db.debug("SELECT took {} ms", 12);          // console only (DEBUG < INFO for file)
        pay.debug("never built: {}", "x");          // payment inherits INFO from root -> skipped cheaply
        pay.info("charged order {} amount {}", 42, 499);
        pay.error("gateway timeout for order {}", 43);
        MDC.clear();

        // The clock differs on every run, so the demo prints the JSON lines with "ts" zeroed.
        List<String> fileLines = file.lines().stream().map(l -> l.replaceAll("\"ts\":\\d+", "\"ts\":0")).toList();
        System.out.println("file got  " + fileLines.size() + " lines: " + fileLines);
        System.out.println("pager got " + pager.lines().size() + " line: " + pager.lines());
        System.out.println("same object? " + (lm.getLogger("com.shop.db") == db));

        // A disabled call never builds its message (the lazy Supplier is not even called).
        int[] built = {0};
        pay.log(LogLevel.DEBUG, () -> { built[0]++; return "expensive text"; });
        System.out.println("lazy message built while disabled? " + (built[0] > 0));

        // additive = false keeps a private audit log away from the root handlers.
        MemoryAppender auditFile = new MemoryAppender(new PlainFormatter());
        Logger audit = lm.getLogger("com.shop.audit");
        audit.setHandlers(new AppenderHandler(LogLevel.INFO, auditFile));
        audit.setAdditive(false);
        audit.info("user {} exported data", "asha");
        System.out.println("audit file " + auditFile.lines() + ", root file still " + file.lines().size() + " lines");

        // Async decorator with a tiny queue: DEBUG/INFO may be dropped, WARN+ never.
        // How many INFOs are dropped depends on thread timing, so only the invariants are printed.
        MemoryAppender slowDisk = new MemoryAppender(new PlainFormatter());
        AsyncAppender async = new AsyncAppender(slowDisk, 4);
        for (int i = 0; i < 50; i++)
            async.append(new LogMessage(i % 10 == 0 ? LogLevel.WARN : LogLevel.INFO, "load", "msg " + i,
                                        0, "main", Map.of()));
        async.close();
        List<String> warns = slowDisk.lines().stream().filter(l -> l.startsWith("WARN")).toList();
        System.out.println("async: written + dropped = " + (slowDisk.lines().size() + async.dropped()) + " of 50");
        System.out.println("WARN lines kept: " + warns.size() + " " + warns);
    }
}`;
  var LOG_CORE_PY = `
# ===== A small but real logging framework (think: a mini Log4j / Logback) =====
import queue
import re
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Callable, Mapping, Optional, Union


# 1) Levels: an Enum with a number, so "is WARN at least INFO?" is one comparison.
class LogLevel(Enum):
    DEBUG = 10
    INFO = 20
    WARN = 30
    ERROR = 40
    FATAL = 50

    def at_least(self, other: "LogLevel") -> bool:
        return self.value >= other.value


# 2) The message: a frozen dataclass. Built ONCE, then shared by every handler/appender.
@dataclass(frozen=True)
class LogMessage:
    level: LogLevel
    logger: str
    text: str
    epoch_millis: int
    thread: str
    context: Mapping[str, str]


# 3) MDC = "Mapped Diagnostic Context": per-thread key/values (requestId, userId)
#    that get stamped on every message without passing them as parameters.
class MDC:
    _local = threading.local()               # every thread sees its own dict

    @classmethod
    def _ctx(cls) -> dict:
        if not hasattr(cls._local, "ctx"):
            cls._local.ctx = {}
        return cls._local.ctx

    @classmethod
    def put(cls, k: str, v: str) -> None:
        cls._ctx()[k] = v

    @classmethod
    def clear(cls) -> None:
        cls._ctx().clear()

    @classmethod
    def snapshot(cls) -> Mapping[str, str]:   # copy: the message must not change later
        return MappingProxyType(dict(cls._ctx()))


def show_map(m: Mapping[str, str]) -> str:   # sorted, Java-style {k=v, k2=v2}
    return "{" + ", ".join(f"{k}={m[k]}" for k in sorted(m)) + "}"


# 4) Formatter = HOW a message looks (Strategy pattern).
class LogFormatter(ABC):
    @abstractmethod
    def format(self, m: LogMessage) -> str: ...


class PlainFormatter(LogFormatter):
    def format(self, m: LogMessage) -> str:
        ctx = " " + show_map(m.context) if m.context else ""
        return f"{m.level.name:<5} [{m.thread}] {m.logger} -{ctx} {m.text}"


class JsonFormatter(LogFormatter):
    def format(self, m: LogMessage) -> str:
        out = (f'{{"ts":{m.epoch_millis},"level":"{m.level.name}","logger":"{m.logger}",'
               f'"msg":"{m.text.replace(chr(34), chr(39))}"')
        for k in sorted(m.context):
            out += f',"{k}":"{m.context[k]}"'
        return out + "}"


# 5) Appender = WHERE a message goes (console, file, network...). New target = new class.
class Appender(ABC):
    @abstractmethod
    def append(self, m: LogMessage) -> None: ...

    def close(self) -> None:
        pass


class ConsoleAppender(Appender):
    def __init__(self, formatter: LogFormatter) -> None:
        self._formatter = formatter
        self._lock = threading.Lock()         # two threads must not interleave half-lines

    def append(self, m: LogMessage) -> None:
        with self._lock:
            print(self._formatter.format(m))


# Stands in for a FileAppender: keeps lines in memory so the demo has no disk side effects.
class MemoryAppender(Appender):
    def __init__(self, formatter: LogFormatter) -> None:
        self._formatter = formatter
        self._lines: list[str] = []
        self._lock = threading.Lock()

    def append(self, m: LogMessage) -> None:
        line = self._formatter.format(m)
        with self._lock:
            self._lines.append(line)

    def lines(self) -> list[str]:
        with self._lock:
            return list(self._lines)


# Decorator: makes ANY appender asynchronous. Callers only pay for a queue put.
class AsyncAppender(Appender):
    _POISON = LogMessage(LogLevel.FATAL, "", "", 0, "", {})

    def __init__(self, target: Appender, capacity: int) -> None:
        self._target = target
        self._queue: "queue.Queue[LogMessage]" = queue.Queue(maxsize=capacity)
        self._dropped = 0
        self._lock = threading.Lock()         # \`+=\` on an int is not atomic, even with the GIL
        self._worker = threading.Thread(target=self._drain, name="log-writer", daemon=True)
        self._worker.start()                  # daemon: never keeps the process alive

    def append(self, m: LogMessage) -> None:
        if m.level.at_least(LogLevel.WARN):
            self._queue.put(m)                # important messages: wait for space
        else:
            try:
                self._queue.put_nowait(m)
            except queue.Full:                # DEBUG/INFO under pressure: drop, but count it
                with self._lock:
                    self._dropped += 1

    def _drain(self) -> None:
        while True:
            m = self._queue.get()
            if m is self._POISON:
                return
            self._target.append(m)

    def close(self) -> None:
        self._queue.put(self._POISON)         # everything queued before it gets written first
        self._worker.join(timeout=2)          # bounded wait: shutdown can never hang
        self._target.close()

    @property
    def dropped(self) -> int:
        with self._lock:
            return self._dropped


# 6) Chain of Responsibility: each handler checks its own minimum level,
#    writes if it cares, then passes the SAME message to the next handler.
class LogHandler(ABC):
    def __init__(self, min_level: LogLevel) -> None:
        self._next: Optional["LogHandler"] = None
        self._min_level = min_level

    def link_with(self, nxt: "LogHandler") -> "LogHandler":   # returns next for fluent chaining
        self._next = nxt
        return nxt

    def handle(self, m: LogMessage) -> None:                  # template method: order is fixed
        if m.level.at_least(self._min_level):
            self._write(m)
        if self._next is not None:
            self._next.handle(m)

    @abstractmethod
    def _write(self, m: LogMessage) -> None: ...


class AppenderHandler(LogHandler):
    def __init__(self, min_level: LogLevel, appender: Appender) -> None:
        super().__init__(min_level)
        self._appender = appender

    def _write(self, m: LogMessage) -> None:
        self._appender.append(m)


def thread_name() -> str:
    t = threading.current_thread()
    return "main" if t is threading.main_thread() else t.name


# 7) Logger: named, hierarchical ("com.shop.db" -> "com.shop" -> "com" -> root).
class Logger:
    def __init__(self, name: str, parent: Optional["Logger"]) -> None:
        self._name = name
        self._parent = parent
        self._level: Optional[LogLevel] = None        # None = inherit from parent
        self._handlers: Optional[LogHandler] = None   # head of this logger's chain (may be None)
        self._additive = True                         # also send to parent's handlers?

    def set_level(self, level: Optional[LogLevel]) -> None:
        self._level = level

    def set_handlers(self, head: Optional[LogHandler]) -> None:
        self._handlers = head

    def set_additive(self, additive: bool) -> None:
        self._additive = additive

    def effective_level(self) -> LogLevel:
        lg: Optional[Logger] = self
        while lg is not None:
            if lg._level is not None:
                return lg._level
            lg = lg._parent
        return LogLevel.INFO                          # safe default if even root has none

    def is_enabled(self, lv: LogLevel) -> bool:
        return lv.at_least(self.effective_level())

    # Cheap exit FIRST: if disabled we never build the string.
    # \`text\` is a "{}" pattern, or a zero-argument function (lazy) that runs only when enabled.
    def log(self, lv: LogLevel, text: Union[str, Callable[[], str]], *args: object) -> None:
        if not self.is_enabled(lv):
            return
        body = text() if callable(text) else fill(text, *args)
        self._dispatch(LogMessage(lv, self._name, body, int(time.time() * 1000),
                                  thread_name(), MDC.snapshot()))

    def debug(self, p: str, *a: object) -> None: self.log(LogLevel.DEBUG, p, *a)
    def info(self, p: str, *a: object) -> None: self.log(LogLevel.INFO, p, *a)
    def warn(self, p: str, *a: object) -> None: self.log(LogLevel.WARN, p, *a)
    def error(self, p: str, *a: object) -> None: self.log(LogLevel.ERROR, p, *a)

    # Second chain: walk up the logger tree until a non-additive logger stops it.
    def _dispatch(self, m: LogMessage) -> None:
        lg: Optional[Logger] = self
        while lg is not None:
            if lg._handlers is not None:
                lg._handlers.handle(m)
            if not lg._additive:
                break
            lg = lg._parent


# "{}" placeholders, SLF4J style. Plain text is NEVER interpreted (no lookups -> no Log4Shell).
def fill(pattern: str, *args: object) -> str:
    out: list[str] = []
    a = i = 0
    while i < len(pattern):
        if a < len(args) and pattern.startswith("{}", i):
            out.append(str(args[a]))
            a += 1
            i += 2
        else:
            out.append(pattern[i])
            i += 1
    return "".join(out)


# 8) LogManager: the single registry (Singleton + Factory). Same name -> same Logger object.
class LogManager:
    def __init__(self) -> None:
        self._root = Logger("root", None)
        self._loggers: dict[str, Logger] = {}
        self._lock = threading.RLock()

    @staticmethod
    def get() -> "LogManager":
        return _INSTANCE

    def root(self) -> Logger:
        return self._root

    def get_logger(self, name: str) -> Logger:
        with self._lock:
            existing = self._loggers.get(name)
            if existing is not None:
                return existing
            dot = name.rfind(".")
            parent = self._root if dot < 0 else self.get_logger(name[:dot])   # ancestors first
            return self._loggers.setdefault(name, Logger(name, parent))


_INSTANCE = LogManager()    # a module body runs once, so this one object is the singleton


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def main() -> None:
    lm = LogManager.get()
    file = MemoryAppender(JsonFormatter())
    pager = MemoryAppender(PlainFormatter())

    # root chain: Console(>=DEBUG) -> File(>=INFO) -> Pager(>=ERROR)
    head = AppenderHandler(LogLevel.DEBUG, ConsoleAppender(PlainFormatter()))
    head.link_with(AppenderHandler(LogLevel.INFO, file)).link_with(AppenderHandler(LogLevel.ERROR, pager))
    lm.root().set_level(LogLevel.INFO)
    lm.root().set_handlers(head)

    db = lm.get_logger("com.shop.db")
    pay = lm.get_logger("com.shop.payment")
    db.set_level(LogLevel.DEBUG)                # turn on DEBUG only for the DB package

    MDC.put("requestId", "r-77")
    db.debug("SELECT took {} ms", 12)           # console only (DEBUG < INFO for file)
    pay.debug("never built: {}", "x")           # payment inherits INFO from root -> skipped cheaply
    pay.info("charged order {} amount {}", 42, 499)
    pay.error("gateway timeout for order {}", 43)
    MDC.clear()

    # The clock differs on every run, so the demo prints the JSON lines with "ts" zeroed.
    file_lines = [re.sub(r'"ts":\\d+', '"ts":0', ln) for ln in file.lines()]
    print(f"file got  {len(file_lines)} lines: {show(file_lines)}")
    print(f"pager got {len(pager.lines())} line: {show(pager.lines())}")
    print(f"same object? {str(lm.get_logger('com.shop.db') is db).lower()}")

    # A disabled call never builds its message (the lazy function is not even called).
    built = [0]

    def expensive() -> str:
        built[0] += 1
        return "expensive text"

    pay.log(LogLevel.DEBUG, expensive)
    print(f"lazy message built while disabled? {str(built[0] > 0).lower()}")

    # additive = False keeps a private audit log away from the root handlers.
    audit_file = MemoryAppender(PlainFormatter())
    audit = lm.get_logger("com.shop.audit")
    audit.set_handlers(AppenderHandler(LogLevel.INFO, audit_file))
    audit.set_additive(False)
    audit.info("user {} exported data", "asha")
    print(f"audit file {show(audit_file.lines())}, root file still {len(file.lines())} lines")

    # Async decorator with a tiny queue: DEBUG/INFO may be dropped, WARN+ never.
    # How many INFOs are dropped depends on thread timing, so only the invariants are printed.
    slow_disk = MemoryAppender(PlainFormatter())
    async_app = AsyncAppender(slow_disk, 4)
    for i in range(50):
        async_app.append(LogMessage(LogLevel.WARN if i % 10 == 0 else LogLevel.INFO, "load",
                                    f"msg {i}", 0, "main", {}))
    async_app.close()
    warns = [ln for ln in slow_disk.lines() if ln.startswith("WARN")]
    print(f"async: written + dropped = {len(slow_disk.lines()) + async_app.dropped} of 50")
    print(f"WARN lines kept: {len(warns)} {show(warns)}")


if __name__ == "__main__":
    main()`;
  var LOG_CORE_TS = `
// ===== A small but real logging framework (think: a mini Log4j / Logback) =====

// 1) Levels: a numeric enum, so "is WARN at least INFO?" is one comparison (>=).
enum LogLevel { DEBUG = 10, INFO = 20, WARN = 30, ERROR = 40, FATAL = 50 }

// 2) The message: a readonly interface. Built ONCE, then shared by every handler/appender.
interface LogMessage {
  readonly level: LogLevel;
  readonly logger: string;
  readonly text: string;
  readonly epochMillis: number;
  readonly thread: string;
  readonly context: Readonly<Record<string, string>>;
}

// 3) MDC = "Mapped Diagnostic Context": key/values (requestId, userId) stamped on every
//    message without passing them as parameters. Node runs our code on one thread, so a
//    plain object is enough here (AsyncLocalStorage is the per-request version).
class MDC {
  private static ctx: Record<string, string> = {};
  static put(k: string, v: string): void { MDC.ctx[k] = v; }
  static clear(): void { MDC.ctx = {}; }
  static snapshot(): Readonly<Record<string, string>> { return Object.freeze({ ...MDC.ctx }); } // copy
}

function showMap(m: Readonly<Record<string, string>>): string {   // sorted, Java-style {k=v, k2=v2}
  return "{" + Object.keys(m).sort().map((k) => k + "=" + m[k]).join(", ") + "}";
}

// 4) Formatter = HOW a message looks (Strategy pattern).
interface LogFormatter { format(m: LogMessage): string; }

class PlainFormatter implements LogFormatter {
  format(m: LogMessage): string {
    const ctx = Object.keys(m.context).length === 0 ? "" : " " + showMap(m.context);
    return LogLevel[m.level].padEnd(5) + " [" + m.thread + "] " + m.logger + " -" + ctx + " " + m.text;
  }
}

class JsonFormatter implements LogFormatter {
  format(m: LogMessage): string {
    let out = '{"ts":' + m.epochMillis + ',"level":"' + LogLevel[m.level] + '","logger":"' + m.logger +
      '","msg":"' + m.text.replaceAll('"', "'") + '"';
    for (const k of Object.keys(m.context).sort()) out += ',"' + k + '":"' + m.context[k] + '"';
    return out + "}";
  }
}

// 5) Appender = WHERE a message goes (console, file, network...). New target = new class.
interface Appender {
  append(m: LogMessage): void;
  close(): void;
}

class ConsoleAppender implements Appender {
  constructor(private readonly formatter: LogFormatter) {}
  append(m: LogMessage): void { console.log(this.formatter.format(m)); }
  close(): void {}
}

// Stands in for a FileAppender: keeps lines in memory so the demo has no disk side effects.
class MemoryAppender implements Appender {
  private readonly _lines: string[] = [];
  constructor(private readonly formatter: LogFormatter) {}
  append(m: LogMessage): void { this._lines.push(this.formatter.format(m)); }
  lines(): string[] { return [...this._lines]; }
  close(): void {}
}

// Decorator: makes ANY appender asynchronous. Callers only pay for a push; the target is written
// on a later turn of the event loop. JavaScript cannot block a caller, so WARN+ is always accepted
// (it may exceed the capacity) and only DEBUG/INFO are dropped when the queue is full.
class AsyncAppender implements Appender {
  private queue: LogMessage[] = [];
  private droppedCount = 0;
  private scheduled = false;

  constructor(private readonly target: Appender, private readonly capacity: number) {}

  append(m: LogMessage): void {
    if (m.level >= LogLevel.WARN || this.queue.length < this.capacity) this.queue.push(m);
    else this.droppedCount++;                 // DEBUG/INFO under pressure: drop, but count it
    if (!this.scheduled) {
      this.scheduled = true;
      setTimeout(() => this.drain(), 0);      // the "background worker": a later event-loop turn
    }
  }

  private drain(): void {
    this.scheduled = false;
    for (const m of this.queue.splice(0)) this.target.append(m);   // take all, keep order
  }

  close(): void {
    this.drain();                             // everything queued so far is written first
    this.target.close();
  }
  dropped(): number { return this.droppedCount; }
}

// 6) Chain of Responsibility: each handler checks its own minimum level,
//    writes if it cares, then passes the SAME message to the next handler.
abstract class LogHandler {
  private next: LogHandler | null = null;
  constructor(protected readonly minLevel: LogLevel) {}
  linkWith(next: LogHandler): LogHandler { this.next = next; return next; }  // returns next for chaining
  handle(m: LogMessage): void {                                              // template method: order is fixed
    if (m.level >= this.minLevel) this.write(m);
    if (this.next !== null) this.next.handle(m);
  }
  protected abstract write(m: LogMessage): void;
}

class AppenderHandler extends LogHandler {
  constructor(minLevel: LogLevel, private readonly appender: Appender) { super(minLevel); }
  protected write(m: LogMessage): void { this.appender.append(m); }
}

// 7) Logger: named, hierarchical ("com.shop.db" -> "com.shop" -> "com" -> root).
class Logger {
  private level: LogLevel | null = null;          // null = inherit from parent
  private handlers: LogHandler | null = null;     // head of this logger's chain (may be null)
  private additive = true;                        // also send to parent's handlers?

  constructor(private readonly name: string, private readonly parent: Logger | null) {}

  setLevel(level: LogLevel | null): void { this.level = level; }
  setHandlers(head: LogHandler | null): void { this.handlers = head; }
  setAdditive(additive: boolean): void { this.additive = additive; }

  effectiveLevel(): LogLevel {
    for (let l: Logger | null = this; l !== null; l = l.parent) if (l.level !== null) return l.level;
    return LogLevel.INFO;                         // safe default if even root has none
  }
  isEnabled(lv: LogLevel): boolean { return lv >= this.effectiveLevel(); }

  // Cheap exit FIRST: if disabled we never build the string.
  // \`text\` is a "{}" pattern, or a function (lazy) that runs only when the level is enabled.
  log(lv: LogLevel, text: string | (() => string), ...args: unknown[]): void {
    if (!this.isEnabled(lv)) return;
    const body = typeof text === "function" ? text() : fill(text, ...args);
    this.dispatch({ level: lv, logger: this.name, text: body, epochMillis: Date.now(), thread: "main", context: MDC.snapshot() });
  }
  debug(p: string, ...a: unknown[]): void { this.log(LogLevel.DEBUG, p, ...a); }
  info(p: string, ...a: unknown[]): void { this.log(LogLevel.INFO, p, ...a); }
  warn(p: string, ...a: unknown[]): void { this.log(LogLevel.WARN, p, ...a); }
  error(p: string, ...a: unknown[]): void { this.log(LogLevel.ERROR, p, ...a); }

  // Second chain: walk up the logger tree until a non-additive logger stops it.
  private dispatch(m: LogMessage): void {
    for (let l: Logger | null = this; l !== null; l = l.parent) {
      if (l.handlers !== null) l.handlers.handle(m);
      if (!l.additive) break;
    }
  }
}

// "{}" placeholders, SLF4J style. Plain text is NEVER interpreted (no lookups -> no Log4Shell).
function fill(pattern: string, ...args: unknown[]): string {
  let out = "";
  let a = 0;
  let i = 0;
  while (i < pattern.length) {
    if (a < args.length && pattern.startsWith("{}", i)) { out += String(args[a++]); i += 2; }
    else out += pattern[i++];
  }
  return out;
}

// 8) LogManager: the single registry (Singleton + Factory). Same name -> same Logger object.
class LogManager {
  private static readonly INSTANCE = new LogManager();
  private readonly rootLogger = new Logger("root", null);
  private readonly loggers = new Map<string, Logger>();
  private constructor() {}
  static get(): LogManager { return LogManager.INSTANCE; }
  root(): Logger { return this.rootLogger; }

  getLogger(name: string): Logger {
    const existing = this.loggers.get(name);
    if (existing !== undefined) return existing;
    const dot = name.lastIndexOf(".");
    const parent = dot < 0 ? this.rootLogger : this.getLogger(name.substring(0, dot));   // ancestors first
    const created = new Logger(name, parent);
    this.loggers.set(name, created);
    return created;
  }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";

function main(): void {
  const lm = LogManager.get();
  const file = new MemoryAppender(new JsonFormatter());
  const pager = new MemoryAppender(new PlainFormatter());

  // root chain: Console(>=DEBUG) -> File(>=INFO) -> Pager(>=ERROR)
  const head = new AppenderHandler(LogLevel.DEBUG, new ConsoleAppender(new PlainFormatter()));
  head.linkWith(new AppenderHandler(LogLevel.INFO, file))
      .linkWith(new AppenderHandler(LogLevel.ERROR, pager));
  lm.root().setLevel(LogLevel.INFO);
  lm.root().setHandlers(head);

  const db = lm.getLogger("com.shop.db");
  const pay = lm.getLogger("com.shop.payment");
  db.setLevel(LogLevel.DEBUG);                    // turn on DEBUG only for the DB package

  MDC.put("requestId", "r-77");
  db.debug("SELECT took {} ms", 12);              // console only (DEBUG < INFO for file)
  pay.debug("never built: {}", "x");              // payment inherits INFO from root -> skipped cheaply
  pay.info("charged order {} amount {}", 42, 499);
  pay.error("gateway timeout for order {}", 43);
  MDC.clear();

  // The clock differs on every run, so the demo prints the JSON lines with "ts" zeroed.
  const fileLines = file.lines().map((l) => l.replace(/"ts":\\d+/, '"ts":0'));
  console.log("file got  " + fileLines.length + " lines: " + show(fileLines));
  console.log("pager got " + pager.lines().length + " line: " + show(pager.lines()));
  console.log("same object? " + (lm.getLogger("com.shop.db") === db));

  // A disabled call never builds its message (the lazy function is not even called).
  let built = 0;
  pay.log(LogLevel.DEBUG, () => { built++; return "expensive text"; });
  console.log("lazy message built while disabled? " + (built > 0));

  // additive = false keeps a private audit log away from the root handlers.
  const auditFile = new MemoryAppender(new PlainFormatter());
  const audit = lm.getLogger("com.shop.audit");
  audit.setHandlers(new AppenderHandler(LogLevel.INFO, auditFile));
  audit.setAdditive(false);
  audit.info("user {} exported data", "asha");
  console.log("audit file " + show(auditFile.lines()) + ", root file still " + file.lines().length + " lines");

  // Async decorator with a tiny queue: DEBUG/INFO may be dropped, WARN+ never.
  // The exact drop count is an implementation detail, so only the invariants are printed.
  const slowDisk = new MemoryAppender(new PlainFormatter());
  const asyncApp = new AsyncAppender(slowDisk, 4);
  for (let i = 0; i < 50; i++) {
    asyncApp.append({ level: i % 10 === 0 ? LogLevel.WARN : LogLevel.INFO, logger: "load", text: "msg " + i,
                   epochMillis: 0, thread: "main", context: {} });
  }
  asyncApp.close();
  const warns = slowDisk.lines().filter((l) => l.startsWith("WARN"));
  console.log("async: written + dropped = " + (slowDisk.lines().length + asyncApp.dropped()) + " of 50");
  console.log("WARN lines kept: " + warns.length + " " + show(warns));
}

main();`;
  var LOG_CORE_CPP = String.raw`
// ===== A small but real logging framework (think: a mini Log4j / Logback) =====

// 1) Levels: an enum class with numbers, so "is WARN at least INFO?" is one comparison.
enum class LogLevel { DEBUG = 10, INFO = 20, WARN = 30, ERROR = 40, FATAL = 50 };

bool atLeast(LogLevel a, LogLevel b) { return static_cast<int>(a) >= static_cast<int>(b); }

string levelName(LogLevel l) {
    switch (l) {
        case LogLevel::DEBUG: return "DEBUG";
        case LogLevel::INFO:  return "INFO";
        case LogLevel::WARN:  return "WARN";
        case LogLevel::ERROR: return "ERROR";
        default:              return "FATAL";
    }
}

// 2) The message: an immutable struct (all members const). Built ONCE, then shared by reference.
struct LogMessage {
    const LogLevel level;
    const string logger;
    const string text;
    const long long epochMillis;
    const string thread;
    const map<string, string> context;       // std::map keeps the keys sorted
};

// 3) MDC = "Mapped Diagnostic Context": per-thread key/values (requestId, userId)
//    that get stamped on every message without passing them as parameters.
class MDC {
    static map<string, string>& ctx() {
        thread_local map<string, string> c;  // every thread has its own copy
        return c;
    }
public:
    static void put(const string& k, const string& v) { ctx()[k] = v; }
    static void clear() { ctx().clear(); }
    static map<string, string> snapshot() { return ctx(); }   // a copy: the message must not change later
};

string showMap(const map<string, string>& m) {   // Java-style {k=v, k2=v2}
    string out = "{";
    bool first = true;
    for (const auto& [k, v] : m) {
        if (!first) out += ", ";
        out += k + "=" + v;
        first = false;
    }
    return out + "}";
}

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

// 4) Formatter = HOW a message looks (Strategy pattern).
class LogFormatter {
public:
    virtual ~LogFormatter() = default;
    virtual string format(const LogMessage& m) const = 0;
};

class PlainFormatter : public LogFormatter {
public:
    string format(const LogMessage& m) const override {
        string ctx = m.context.empty() ? "" : " " + showMap(m.context);
        ostringstream out;
        out << left << setw(5) << levelName(m.level) << " [" << m.thread << "] " << m.logger << " -" << ctx << " " << m.text;
        return out.str();
    }
};

class JsonFormatter : public LogFormatter {
public:
    string format(const LogMessage& m) const override {
        string msg = m.text;
        replace(msg.begin(), msg.end(), '"', '\'');
        string out = "{\"ts\":" + to_string(m.epochMillis) + ",\"level\":\"" + levelName(m.level) +
                     "\",\"logger\":\"" + m.logger + "\",\"msg\":\"" + msg + "\"";
        for (const auto& [k, v] : m.context) out += ",\"" + k + "\":\"" + v + "\"";
        return out + "}";
    }
};

// 5) Appender = WHERE a message goes (console, file, network...). New target = new class.
class Appender {
public:
    virtual ~Appender() = default;
    virtual void append(const LogMessage& m) = 0;
    virtual void close() {}
};

class ConsoleAppender : public Appender {
    shared_ptr<LogFormatter> formatter;
    mutex mu;                                // two threads must not interleave half-lines
public:
    explicit ConsoleAppender(shared_ptr<LogFormatter> f) : formatter(move(f)) {}
    void append(const LogMessage& m) override {
        lock_guard<mutex> lock(mu);
        cout << formatter->format(m) << "\n";
    }
};

// Stands in for a FileAppender: keeps lines in memory so the demo has no disk side effects.
class MemoryAppender : public Appender {
    shared_ptr<LogFormatter> formatter;
    vector<string> lines_;
    mutable mutex mu;
public:
    explicit MemoryAppender(shared_ptr<LogFormatter> f) : formatter(move(f)) {}
    void append(const LogMessage& m) override {
        string line = formatter->format(m);
        lock_guard<mutex> lock(mu);
        lines_.push_back(move(line));
    }
    vector<string> lines() const {
        lock_guard<mutex> lock(mu);
        return lines_;                       // returns a copy
    }
};

// Decorator: makes ANY appender asynchronous. Callers only pay for a queue push.
class AsyncAppender : public Appender {
    shared_ptr<Appender> target;
    const size_t capacity;
    deque<LogMessage> queue;
    mutex mu;
    condition_variable notFull, notEmpty;
    bool closing = false;
    atomic<long long> dropped_{0};
    thread worker;

    void drain() {
        unique_lock<mutex> lock(mu);
        while (true) {
            notEmpty.wait(lock, [&] { return !queue.empty() || closing; });
            if (queue.empty()) return;       // closing and nothing left
            LogMessage m = move(queue.front());
            queue.pop_front();
            notFull.notify_one();
            lock.unlock();
            target->append(m);               // the slow part runs without the lock
            lock.lock();
        }
    }
public:
    AsyncAppender(shared_ptr<Appender> t, size_t cap) : target(move(t)), capacity(cap), worker([this] { drain(); }) {}
    ~AsyncAppender() override { close(); }   // RAII: the thread is always joined

    void append(const LogMessage& m) override {
        unique_lock<mutex> lock(mu);
        if (atLeast(m.level, LogLevel::WARN)) {
            notFull.wait(lock, [&] { return queue.size() < capacity; });   // important: wait for space
        } else if (queue.size() >= capacity) {
            dropped_++;                      // DEBUG/INFO under pressure: drop, but count it
            return;
        }
        queue.push_back(m);
        notEmpty.notify_one();
    }

    void close() override {
        {
            lock_guard<mutex> lock(mu);
            if (closing) return;
            closing = true;                  // the worker writes everything queued, then stops
        }
        notEmpty.notify_all();
        if (worker.joinable()) worker.join();
        target->close();
    }
    long long dropped() const { return dropped_.load(); }
};

// 6) Chain of Responsibility: each handler checks its own minimum level,
//    writes if it cares, then passes the SAME message to the next handler.
class LogHandler {
    unique_ptr<LogHandler> next;             // each link owns the one after it
    const LogLevel minLevel;
protected:
    virtual void write(const LogMessage& m) = 0;
public:
    explicit LogHandler(LogLevel min) : minLevel(min) {}
    virtual ~LogHandler() = default;
    LogHandler* linkWith(unique_ptr<LogHandler> n) {   // returns next for fluent chaining
        next = move(n);
        return next.get();
    }
    void handle(const LogMessage& m) {                 // template method: order is fixed
        if (atLeast(m.level, minLevel)) write(m);
        if (next) next->handle(m);
    }
};

class AppenderHandler : public LogHandler {
    shared_ptr<Appender> appender;
protected:
    void write(const LogMessage& m) override { appender->append(m); }
public:
    AppenderHandler(LogLevel min, shared_ptr<Appender> a) : LogHandler(min), appender(move(a)) {}
};

string threadName() { return "main"; }       // C++ threads have no names; this demo logs from main

// "{}" placeholders, SLF4J style. Plain text is NEVER interpreted (no lookups -> no Log4Shell).
string fill(const string& pattern, const vector<string>& args) {
    string out;
    size_t a = 0, i = 0;
    while (i < pattern.size()) {
        if (a < args.size() && pattern.compare(i, 2, "{}") == 0) { out += args[a++]; i += 2; }
        else out += pattern[i++];
    }
    return out;
}

template <class T>
string str(const T& v) { ostringstream o; o << v; return o.str(); }

// 7) Logger: named, hierarchical ("com.shop.db" -> "com.shop" -> "com" -> root).
class Logger {
    const string name;
    Logger* const parent;                    // not owned: LogManager owns every Logger
    optional<LogLevel> level;                // empty = inherit from parent
    unique_ptr<LogHandler> handlers;         // head of this logger's chain (may be null)
    bool additive = true;                    // also send to parent's handlers?

    // Second chain: walk up the logger tree until a non-additive logger stops it.
    void dispatch(const LogMessage& m) const {
        for (const Logger* l = this; l != nullptr; l = l->parent) {
            if (l->handlers) l->handlers->handle(m);
            if (!l->additive) break;
        }
    }
    void emit(LogLevel lv, const string& body) const {
        long long now = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
        dispatch(LogMessage{lv, name, body, now, threadName(), MDC::snapshot()});
    }
public:
    Logger(string n, Logger* p) : name(move(n)), parent(p) {}

    void setLevel(optional<LogLevel> l) { level = l; }
    void setHandlers(unique_ptr<LogHandler> head) { handlers = move(head); }
    void setAdditive(bool a) { additive = a; }

    LogLevel effectiveLevel() const {
        for (const Logger* l = this; l != nullptr; l = l->parent) if (l->level) return *l->level;
        return LogLevel::INFO;               // safe default if even root has none
    }
    bool isEnabled(LogLevel lv) const { return atLeast(lv, effectiveLevel()); }

    // Cheap exit FIRST: if disabled we never build the string.
    void log(LogLevel lv, const string& pattern, const vector<string>& args = {}) const {
        if (!isEnabled(lv)) return;
        emit(lv, fill(pattern, args));
    }
    // Lazy variant: the function runs only when the level is enabled.
    void log(LogLevel lv, const function<string()>& lazy) const {
        if (!isEnabled(lv)) return;
        emit(lv, lazy());
    }
    template <class... A> void debug(const string& p, const A&... a) const { log(LogLevel::DEBUG, p, vector<string>{str(a)...}); }
    template <class... A> void info(const string& p, const A&... a) const  { log(LogLevel::INFO, p, vector<string>{str(a)...}); }
    template <class... A> void warn(const string& p, const A&... a) const  { log(LogLevel::WARN, p, vector<string>{str(a)...}); }
    template <class... A> void error(const string& p, const A&... a) const { log(LogLevel::ERROR, p, vector<string>{str(a)...}); }
};

// 8) LogManager: the single registry (Singleton + Factory). Same name -> same Logger object.
class LogManager {
    Logger root_{"root", nullptr};
    map<string, unique_ptr<Logger>> loggers;
    recursive_mutex mu;
    LogManager() = default;
public:
    LogManager(const LogManager&) = delete;            // no copies: there is only one
    LogManager& operator=(const LogManager&) = delete;
    static LogManager& get() {
        static LogManager instance;                    // created on first use, thread-safe since C++11
        return instance;
    }
    Logger& root() { return root_; }

    Logger& getLogger(const string& name) {
        lock_guard<recursive_mutex> lock(mu);
        auto it = loggers.find(name);
        if (it != loggers.end()) return *it->second;
        size_t dot = name.rfind('.');
        Logger* parent = dot == string::npos ? &root_ : &getLogger(name.substr(0, dot));   // ancestors first
        return *(loggers[name] = make_unique<Logger>(name, parent));
    }
};

int main() {
    LogManager& lm = LogManager::get();
    auto file = make_shared<MemoryAppender>(make_shared<JsonFormatter>());
    auto pager = make_shared<MemoryAppender>(make_shared<PlainFormatter>());

    // root chain: Console(>=DEBUG) -> File(>=INFO) -> Pager(>=ERROR)
    auto head = make_unique<AppenderHandler>(LogLevel::DEBUG, make_shared<ConsoleAppender>(make_shared<PlainFormatter>()));
    head->linkWith(make_unique<AppenderHandler>(LogLevel::INFO, file))
        ->linkWith(make_unique<AppenderHandler>(LogLevel::ERROR, pager));
    lm.root().setLevel(LogLevel::INFO);
    lm.root().setHandlers(move(head));

    Logger& db = lm.getLogger("com.shop.db");
    Logger& pay = lm.getLogger("com.shop.payment");
    db.setLevel(LogLevel::DEBUG);                      // turn on DEBUG only for the DB package

    MDC::put("requestId", "r-77");
    db.debug("SELECT took {} ms", 12);                 // console only (DEBUG < INFO for file)
    pay.debug("never built: {}", "x");                 // payment inherits INFO from root -> skipped cheaply
    pay.info("charged order {} amount {}", 42, 499);
    pay.error("gateway timeout for order {}", 43);
    MDC::clear();

    // The clock differs on every run, so the demo prints the JSON lines with "ts" zeroed.
    vector<string> fileLines;
    for (const string& l : file->lines()) fileLines.push_back(regex_replace(l, regex("\"ts\":\\d+"), "\"ts\":0"));
    cout << "file got  " << fileLines.size() << " lines: " << show(fileLines) << "\n";
    cout << "pager got " << pager->lines().size() << " line: " << show(pager->lines()) << "\n";
    cout << boolalpha << "same object? " << (&lm.getLogger("com.shop.db") == &db) << "\n";

    // A disabled call never builds its message (the lazy function is not even called).
    int built = 0;
    pay.log(LogLevel::DEBUG, function<string()>([&] { built++; return string("expensive text"); }));
    cout << "lazy message built while disabled? " << (built > 0) << "\n";

    // additive = false keeps a private audit log away from the root handlers.
    auto auditFile = make_shared<MemoryAppender>(make_shared<PlainFormatter>());
    Logger& audit = lm.getLogger("com.shop.audit");
    audit.setHandlers(make_unique<AppenderHandler>(LogLevel::INFO, auditFile));
    audit.setAdditive(false);
    audit.info("user {} exported data", "asha");
    cout << "audit file " << show(auditFile->lines()) << ", root file still " << file->lines().size() << " lines\n";

    // Async decorator with a tiny queue: DEBUG/INFO may be dropped, WARN+ never.
    // How many INFOs are dropped depends on thread timing, so only the invariants are printed.
    auto slowDisk = make_shared<MemoryAppender>(make_shared<PlainFormatter>());
    AsyncAppender async(slowDisk, 4);
    for (int i = 0; i < 50; i++)
        async.append(LogMessage{i % 10 == 0 ? LogLevel::WARN : LogLevel::INFO, "load", "msg " + to_string(i), 0, "main", {}});
    async.close();
    vector<string> warns;
    for (const string& l : slowDisk->lines()) if (l.rfind("WARN", 0) == 0) warns.push_back(l);
    cout << "async: written + dropped = " << slowDisk->lines().size() + async.dropped() << " of 50\n";
    cout << "WARN lines kept: " << warns.size() << " " << show(warns) << "\n";
}`;

  var LOG_NODES = [
    B('LM', 'LogManager «singleton»', 12, 8, 22), B('LG', 'Logger', 38, 8), B('MSG', 'LogMessage «record»', 64, 8, 20), B('LVL', 'LogLevel «enum»', 89, 8, 18),
    B('LH', 'LogHandler «abstract»', 12, 33, 22), B('AH', 'AppenderHandler', 38, 33, 20), B('AP', 'Appender «interface»', 64, 33, 22), B('FM', 'LogFormatter', 89, 33, 18),
    B('AS', 'AsyncAppender', 30, 58, 18), B('CA', 'ConsoleAppender', 52, 58, 19), B('FA', 'FileAppender', 72, 58, 16), B('JF', 'Json/Plain Fmt', 91, 58, 16)
  ];
  var LOG_EDGES = [['LM', 'LG', 'creates + caches'], ['LG', 'MSG', 'builds'], ['MSG', 'LVL', 'has'], ['LG', 'LH', 'chain head'], ['AH', 'LH', 'is-a'], ['AH', 'AP', 'writes to'],
    ['AP', 'FM', 'uses'], ['AS', 'AP', 'is-a + wraps'], ['CA', 'AP', 'is-a'], ['FA', 'AP', 'is-a'], ['JF', 'FM', 'is-a']];

  function logClassViz() {
    var steps = [
      { narr: 'The whole framework on one page. Read it as a sentence: <b>LogManager</b> hands out <b>Loggers</b>; a Logger builds a <b>LogMessage</b> and pushes it down a <b>chain of handlers</b>; each handler writes through an <b>Appender</b>, which uses a <b>Formatter</b>.', on: [] },
      { narr: '<b>LogManager</b> is the single registry (Singleton + Factory). <code>getLogger("com.shop.db")</code> always returns the <b>same</b> Logger object, creating parents <code>com.shop</code> and <code>com</code> on the way, so the tree is wired automatically.', on: ['LM', 'LG'], edges: ['LM-LG'],
        code: 'Logger getLogger(String name) {\n  int dot = name.lastIndexOf(\'.\');\n  Logger parent = dot < 0 ? root : getLogger(name.substring(0, dot));\n  return loggers.computeIfAbsent(name, n -> new Logger(n, parent));\n}', codeHl: { 3: 'cur', 4: 'ok' } },
      { narr: '<b>Logger</b> owns three knobs: its <b>level</b> (null means "ask my parent"), the <b>head of its handler chain</b>, and an <b>additive</b> flag (should my parent\'s handlers also see this?). The level check happens FIRST, before any string is built.', on: ['LG'], tags: { LG: 'level / parent / additive' },
        code: 'void log(LogLevel lv, String p, Object... a) {\n  if (!isEnabled(lv)) return;   // cheap exit\n  dispatch(new LogMessage(lv, name, fill(p, a), now, thread, MDC.snapshot()));\n}', codeHl: { 2: 'cur', 3: 'ok' } },
      { narr: '<b>LogMessage</b> is an immutable value object (a Java <code>record</code>, Python frozen dataclass, TypeScript <code>readonly</code> interface, C++ struct of const members): level, logger name, text, time, thread and MDC context. Immutable matters because the same object is shared by many handlers and maybe a background thread.', on: ['MSG', 'LVL'], edges: ['LG-MSG', 'MSG-LVL'] },
      { narr: '<b>Chain of Responsibility</b>: <code>LogHandler</code> has a <code>next</code> pointer. <code>handle()</code> = "if the level is high enough for me, write; then pass it on". Adding a Pager or Slack handler = one new link, zero edits to Logger.', on: ['LH', 'AH'], edges: ['LG-LH', 'AH-LH'], tags: { LH: 'next →' },
        code: 'final void handle(LogMessage m) {\n  if (m.level().atLeast(minLevel)) write(m);\n  if (next != null) next.handle(m);\n}', codeHl: { 2: 'ok', 3: 'cur' } },
      { narr: '<b>Appender</b> = WHERE (console, file, socket, Kafka). <b>LogFormatter</b> = HOW it looks (plain text, JSON). Two independent axes, two interfaces. 3 targets × 2 formats = 5 small classes, not 6 combined ones.', on: ['AP', 'FM', 'CA', 'FA', 'JF'], edges: ['AH-AP', 'AP-FM', 'CA-AP', 'FA-AP', 'JF-FM'] },
      { narr: '<b>AsyncAppender</b> is a <b>Decorator</b>: it IS an Appender and WRAPS another Appender. The calling thread only drops the message into a bounded queue; a background thread does the slow disk write.', on: ['AS'], edges: ['AS-AP'], cls: 'sel',
        table: { label: 'Which pattern lives where', cols: ['Pattern', 'Class', 'Why'], rows: [['Singleton + Factory', 'LogManager', 'one registry, same logger per name'], ['Chain of Responsibility', 'LogHandler.next, Logger.parent', 'each link decides, then passes on'], ['Strategy', 'LogFormatter', 'swap the look without touching appenders'], ['Decorator', 'AsyncAppender', 'add async to ANY appender'], ['Template Method', 'LogHandler.handle()', 'fixed order, subclasses fill write()']] } }
    ];
    return classTour('Logging framework — class diagram', LOG_NODES, LOG_EDGES, steps, 68);
  }

  // Config used by the message-flow visualizer
  var LOG_CFG = {
    'root': { level: 'INFO', handlers: [['Console', 'DEBUG'], ['File', 'INFO'], ['Pager', 'ERROR']], additive: true },
    'com.shop': { level: null, handlers: [], additive: true },
    'com.shop.db': { level: 'DEBUG', handlers: [['SlowQueryLog', 'DEBUG']], additive: true },
    'com.shop.payment': { level: 'WARN', handlers: [['AuditFile', 'WARN']], additive: true },
    'com.shop.audit': { level: 'INFO', handlers: [['AuditOnly', 'INFO']], additive: false }
  };
  var LV = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40, FATAL: 50 };

  function logFlowViz(input) {
    var s = String(input === undefined ? '' : input).trim();
    var m = s.match(/^(\w+)\s+([\w.]+)\s+(.+)$/);
    if (!m) throw new Error('Format: LEVEL logger.name message — e.g. "ERROR com.shop.payment Card declined"');
    var level = m[1].toUpperCase(), lname = m[2], text = m[3].slice(0, 60);
    if (!LV[level]) throw new Error('Level must be one of DEBUG, INFO, WARN, ERROR, FATAL');
    if (lname.split('.').length > 4) throw new Error('Use a logger name with at most 4 parts, e.g. com.shop.db');
    // ancestors: most specific first, root last
    var chain = [], parts = lname === 'root' ? [] : lname.split('.');
    for (var k = parts.length; k >= 1; k--) chain.push(parts.slice(0, k).join('.'));
    chain.push('root');
    function cfg(n) { return LOG_CFG[n] || { level: null, handlers: [], additive: true }; }
    // build graph: loggers left column, their handlers to the right
    var nodes = [], edges = [], gap = 15, h = chain.length * gap + 4;
    chain.forEach(function (n, i) {
      var y = 8 + i * gap, c = cfg(n);
      nodes.push(B('L' + i, n + ' [' + (c.level || 'inherit') + ']' + (c.additive ? '' : ' additive=false'), 16, y, 30));
      if (i > 0) edges.push(['L' + (i - 1), 'L' + i, 'parent']);
      c.handlers.forEach(function (hd, j) {
        nodes.push(B('H' + i + '_' + j, hd[0] + ' ≥' + hd[1], 46 + j * 19, y, 17));
        edges.push([j === 0 ? 'L' + i : 'H' + i + '_' + (j - 1), 'H' + i + '_' + j, j === 0 ? 'head' : 'next']);
      });
    });
    var frames = [], outputs = [], hl = {}, ehl = {};
    function snap(narr, extra) {
      var p = [G('Logger tree (left) and each logger\'s handler chain (right)', nodes, edges, { hl: clone(hl), ehl: clone(ehl), h: h })];
      p.push(TABLE('Where the message was written', ['Appender', 'Result'], outputs.length ? outputs : [['—', 'nothing yet']]));
      if (extra) p = p.concat(extra);
      frames.push(F(narr, p));
    }
    var msgVars = { level: level + ' (' + LV[level] + ')', logger: lname, text: text, thread: 'http-7' };
    snap('Your code calls <code>' + esc(lname) + '.' + level.toLowerCase() + '("' + esc(text) + '")</code>. The framework first finds the logger object for <b>' + esc(lname) + '</b> (created on demand, with all its parents).', [VARS('call', msgVars)]);
    // effective level resolution
    var eff = null, effFrom = null;
    for (var i = 0; i < chain.length; i++) {
      var c = cfg(chain[i]);
      hl['L' + i] = 'cur';
      if (c.level) { eff = c.level; effFrom = chain[i]; snap('Level lookup: <b>' + esc(chain[i]) + '</b> has an explicit level <b>' + c.level + '</b>. That is the <b>effective level</b>. Stop climbing.', [VARS('level check', { messageLevel: level, effectiveLevel: eff, from: effFrom }, { effectiveLevel: 'ok' })]); break; }
      snap('Level lookup: <b>' + esc(chain[i]) + '</b> has no level of its own ("inherit"), so climb to the parent.', [VARS('level check', { messageLevel: level, effectiveLevel: '?' })]);
      hl['L' + i] = 'done';
    }
    Object.keys(hl).forEach(function (k) { delete hl[k]; });
    if (LV[level] < LV[eff]) {
      hl.L0 = 'bad';
      snap(H.c('r', 'Dropped at the door.') + ' ' + level + ' (' + LV[level] + ') is below the effective level ' + eff + ' (' + LV[eff] + '). We return immediately — no string is built, no LogMessage object, no handler is touched. This is why <code>isEnabled()</code> runs first: a disabled DEBUG line costs ~1 nanosecond.', [VARS('level check', { messageLevel: level, effectiveLevel: eff, result: 'SKIP' }, { result: 'bad' })]);
      snap('Try <code>WARN ' + esc(lname) + ' ...</code> or <code>ERROR ...</code> in the input box to see a message travel the whole chain.', [TXT('Rule: <b>message level ≥ effective level</b> → log it, else drop it.')]);
      return frames;
    }
    snap(H.c('g', 'Passes the level gate') + ': ' + level + ' ≥ ' + eff + '. NOW we build the immutable <b>LogMessage</b> (format the text, stamp time, thread and MDC) exactly once.', [VARS('LogMessage', msgVars, { level: 'ok' })]);
    // dispatch through each logger's handler chain
    for (i = 0; i < chain.length; i++) {
      var cc = cfg(chain[i]);
      hl['L' + i] = 'cur';
      if (i > 0) ehl['L' + (i - 1) + '-L' + i] = 'ok';
      if (!cc.handlers.length) snap('Logger <b>' + esc(chain[i]) + '</b> has no handlers of its own. Additive = true, so walk up to its parent.');
      cc.handlers.forEach(function (hd, j) {
        var id = 'H' + i + '_' + j, writes = LV[level] >= LV[hd[1]];
        ehl[(j === 0 ? 'L' + i : 'H' + i + '_' + (j - 1)) + '-' + id] = 'ok';
        hl[id] = writes ? 'ok' : 'done';
        outputs.push([hd[0], writes ? 'WROTE (' + level + ' ≥ ' + hd[1] + ')' : 'skipped (' + level + ' &lt; ' + hd[1] + ')']);
        snap('Handler <b>' + hd[0] + '</b> (min ' + hd[1] + '): ' + (writes ? H.c('g', 'writes it') + ' because ' + level + ' ≥ ' + hd[1] + '.' : H.c('m', 'ignores it') + ' because ' + level + ' &lt; ' + hd[1] + '.') + ' Either way it then calls <code>next.handle(m)</code> — that is the chain.');
      });
      hl['L' + i] = 'done';
      if (!cc.additive) {
        hl['L' + i] = 'sel';
        snap('Logger <b>' + esc(chain[i]) + '</b> has <code>additive = false</code>, so the climb <b>stops here</b>. Parents never see this message (useful for a private audit log).');
        break;
      }
    }
    var wrote = outputs.filter(function (r) { return r[1].indexOf('WROTE') === 0; }).length;
    snap('Done. One <code>' + level.toLowerCase() + '()</code> call → <b>' + wrote + '</b> appender(s) wrote it. Notice the logger code never mentioned Console, File or Pager: they are plugged in by configuration. Try the levels DEBUG, WARN, ERROR or loggers <code>com.shop.audit</code> (non-additive) and <code>com.shop.cart</code> (inherits).');
    return frames;
  }

  topics.push({
    title: 'Logging Framework: Levels, Appenders, Formatters & Chain of Responsibility',
    analogy: `<p>Think of the <b>announcement system in a big railway station</b>. Every announcement has an <b>importance</b>: "platform change" (info), "train delayed" (warning), "fire on platform 3" (emergency). The same announcement can go to <b>several places at once</b>: the loudspeakers, the display boards, the station master's phone. Each place has its own rule: the display boards show everything, the station master's phone only rings for emergencies.</p><p>A logging framework is exactly this. Your code makes an announcement (<code>log.warn("...")</code>) with a <b>level</b>. The framework passes it along a <b>line of handlers</b>; each one decides "is this important enough for me?", writes it if yes, and passes it to the next. The person making the announcement never needs to know where it ends up.</p>`,
    explain: `<p><b>Why interviewers love this question:</b> everybody has used <code>log.info()</code>, but few people have thought about what happens inside. It tests whether you can split one fuzzy requirement ("we need logging") into small classes with <b>one job each</b>, and whether you know Chain of Responsibility, Strategy, Decorator and Singleton in a <i>real</i> setting.</p>
<p><b>Step 1 — the requirements you should say out loud (2 minutes):</b></p>
<ul>
<li>Levels: DEBUG &lt; INFO &lt; WARN &lt; ERROR &lt; FATAL. A logger set to WARN ignores DEBUG and INFO.</li>
<li>Many destinations (<b>appenders</b>): console, file, remote server. Each can have its own minimum level.</li>
<li>Pluggable <b>format</b>: plain text for humans, JSON for machines.</li>
<li>Named, hierarchical loggers: <code>com.shop.db</code> inherits settings from <code>com.shop</code>, then root.</li>
<li>Thread-safe, fast when disabled, optionally asynchronous.</li>
</ul>
<p><b>Step 2 — the nouns become classes:</b></p>
${H.table(['Class', 'One job', 'Pattern'], [
  ['<code>LogLevel</code> (enum)', 'Order the levels with a number so "is WARN ≥ INFO?" is one comparison', '—'],
  ['<code>LogMessage</code> (immutable value type)', 'Immutable bundle: level, logger name, text, time, thread, context', 'Value object'],
  ['<code>Logger</code>', 'Entry point. Checks level, builds message, starts the chain', 'Facade'],
  ['<code>LogHandler</code>', 'One link of the chain: "write if level ≥ my min, then pass on"', 'Chain of Responsibility'],
  ['<code>Appender</code>', 'WHERE the line goes (console, file, socket)', 'Strategy / plug-in'],
  ['<code>LogFormatter</code>', 'HOW the line looks (plain, JSON)', 'Strategy'],
  ['<code>AsyncAppender</code>', 'Makes ANY appender asynchronous via a queue', 'Decorator'],
  ['<code>LogManager</code>', 'One registry: same name → same Logger', 'Singleton + Factory']
])}
<p><b>Step 3 — the flow of one call</b> (the visualizer below animates it):</p>
${H.arr(['log.warn()', 'level gate', 'build message', 'handler 1', 'handler 2', 'handler 3', 'parent logger'], { hl: { 1: 'y', 2: 'g', 3: 'b', 4: 'b', 5: 'b', 6: 'p' }, idx: false })}
<p><b>The naive design (brute force) and why it breaks:</b> one static method with a big <code>if/else</code> on level and on boolean flags like <code>toFile</code>, <code>toConsole</code>, <code>toEmail</code>. It works on day one. Then: ${H.c('r', 'adding Slack means editing the core method')} (breaks Open/Closed), ${H.c('r', 'one global level for the whole app')} (you cannot turn on DEBUG just for the database package), ${H.c('r', 'string building even when the line is dropped')} (slow), and ${H.c('r', 'the disk write happens on the request thread')} (a slow disk slows every user). Each of these pains maps to exactly one class in the good design.</p>
<p><b>Two chains, not one.</b> Real frameworks have a chain of <b>handlers</b> inside a logger, and a chain of <b>loggers</b> (child → parent). The <code>additive</code> flag decides whether the climb to the parent continues. Many candidates only describe the first; mentioning both is an easy expert point.</p>`,
    clues: [
      '"Design a logging library / logger framework" → Chain of Responsibility + Strategy (formatters) + Singleton/Factory (LogManager).',
      '"Messages should go to multiple destinations (console, file, DB) and new ones will be added" → <code>Appender</code> interface, Open/Closed.',
      '"Each destination has its own level" or "only page on-call for ERROR" → per-handler minimum level in a chain.',
      '"Logging must not slow down requests" → AsyncAppender (bounded queue + background thread) and a drop/block policy.',
      '"Enable DEBUG for one module only" → hierarchical named loggers with inherited levels.',
      '"Attach requestId/userId to every log line" → MDC (per-thread context: Java <code>ThreadLocal</code>, Python <code>threading.local</code>, C++ <code>thread_local</code>, Node <code>AsyncLocalStorage</code>).',
      '"Thread-safe" → immutable LogMessage, locked or single-writer appenders, a concurrent (or locked) registry map.'
    ],
    code: [{ lang: 'java', code: LOG_CORE, alt: [{ lang: 'python', code: LOG_CORE_PY }, { lang: 'ts', code: LOG_CORE_TS }, { lang: 'cpp', code: LOG_CORE_CPP },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

// ===== A small but real logging framework (think: a mini log4net / NLog) =====

// 1) Levels: an enum with a number, so "is WARN at least INFO?" is one comparison.
enum LogLevel { DEBUG = 10, INFO = 20, WARN = 30, ERROR = 40, FATAL = 50 }
static class LogLevelExt { public static bool AtLeast(this LogLevel l, LogLevel other) { return (int)l >= (int)other; } }

// 2) The message: immutable. Built ONCE, then shared by every handler/appender.
sealed class LogMessage {
    public readonly LogLevel Level; public readonly string Logger, Text, Thread; public readonly long EpochMillis;
    public readonly IReadOnlyDictionary<string, string> Context;
    public LogMessage(LogLevel level, string logger, string text, long epochMillis, string thread, IDictionary<string, string> context) {
        Level = level; Logger = logger; Text = text; EpochMillis = epochMillis; Thread = thread;
        Context = new SortedDictionary<string, string>(context, StringComparer.Ordinal);
    }
}

// 3) MDC = "Mapped Diagnostic Context": per-thread key/values (requestId, userId)
//    that get stamped on every message without passing them as parameters.
static class MDC {
    private static readonly ThreadLocal<Dictionary<string, string>> CTX = new ThreadLocal<Dictionary<string, string>>(() => new Dictionary<string, string>());
    public static void Put(string k, string v) { CTX.Value[k] = v; }
    public static void Clear() { CTX.Value.Clear(); }
    public static Dictionary<string, string> Snapshot() { return new Dictionary<string, string>(CTX.Value); }  // copy: message must not change later
}

// 4) Formatter = HOW a message looks (Strategy pattern).
interface ILogFormatter { string Format(LogMessage m); }

class PlainFormatter : ILogFormatter {
    public string Format(LogMessage m) {
        string ctx = m.Context.Count == 0 ? "" : " {" + string.Join(", ", m.Context.Select(kv => kv.Key + "=" + kv.Value)) + "}";
        return string.Format("{0,-5} [{1}] {2} -{3} {4}", m.Level, m.Thread, m.Logger, ctx, m.Text);
    }
}

class JsonFormatter : ILogFormatter {
    public string Format(LogMessage m) {
        StringBuilder sb = new StringBuilder("{");
        sb.Append("\\"ts\\":").Append(m.EpochMillis)
          .Append(",\\"level\\":\\"").Append(m.Level).Append('"')
          .Append(",\\"logger\\":\\"").Append(m.Logger).Append('"')
          .Append(",\\"msg\\":\\"").Append(m.Text.Replace("\\"", "'")).Append('"');
        foreach (var e in m.Context) sb.Append(",\\"").Append(e.Key).Append("\\":\\"").Append(e.Value).Append('"');
        return sb.Append('}').ToString();
    }
}

// 5) Appender = WHERE a message goes (console, file, network...). New target = new class.
interface IAppender {
    void Append(LogMessage m);
    void Close();
}

class ConsoleAppender : IAppender {
    private readonly ILogFormatter formatter;
    private readonly object gate = new object();
    public ConsoleAppender(ILogFormatter formatter) { this.formatter = formatter; }
    // locked: two threads must not interleave half-lines
    public void Append(LogMessage m) { lock (gate) Console.WriteLine(formatter.Format(m)); }
    public void Close() { }
}

// Stands in for a FileAppender: keeps lines in memory so the demo has no disk side effects.
class MemoryAppender : IAppender {
    private readonly ILogFormatter formatter;
    private readonly List<string> lines = new List<string>();
    public MemoryAppender(ILogFormatter formatter) { this.formatter = formatter; }
    public void Append(LogMessage m) { string line = formatter.Format(m); lock (lines) lines.Add(line); }
    public List<string> Lines() { lock (lines) return new List<string>(lines); }
    public void Close() { }
}

// Decorator: makes ANY appender asynchronous. Callers only pay for a queue offer.
class AsyncAppender : IAppender {
    private static readonly LogMessage POISON = new LogMessage(LogLevel.FATAL, "", "", 0, "", new Dictionary<string, string>());
    private readonly IAppender target;
    private readonly BlockingCollection<LogMessage> queue;
    private long dropped;
    private readonly Thread worker;

    public AsyncAppender(IAppender target, int capacity) {
        this.target = target;
        queue = new BlockingCollection<LogMessage>(capacity);
        worker = new Thread(Drain) { Name = "log-writer", IsBackground = true };   // never keeps the process alive
        worker.Start();
    }

    public void Append(LogMessage m) {
        if (m.Level.AtLeast(LogLevel.WARN)) queue.Add(m);           // important messages: wait for space
        else if (!queue.TryAdd(m)) Interlocked.Increment(ref dropped);   // DEBUG/INFO under pressure: drop, but count it
    }

    private void Drain() {
        while (true) {
            LogMessage m = queue.Take();
            if (m == POISON) return;
            target.Append(m);
        }
    }

    public void Close() {
        queue.Add(POISON);                // everything queued before it gets written first
        worker.Join(2000);                // bounded wait: shutdown can never hang
        target.Close();
    }
    public long Dropped() { return Interlocked.Read(ref dropped); }
}

// 6) Chain of Responsibility: each handler checks its own minimum level,
//    writes if it cares, then passes the SAME message to the next handler.
abstract class LogHandler {
    private LogHandler next;
    protected readonly LogLevel MinLevel;
    protected LogHandler(LogLevel minLevel) { MinLevel = minLevel; }
    public LogHandler LinkWith(LogHandler next) { this.next = next; return next; }  // returns next for fluent chaining
    public void Handle(LogMessage m) {                                              // template method: order is fixed
        if (m.Level.AtLeast(MinLevel)) Write(m);
        if (next != null) next.Handle(m);
    }
    protected abstract void Write(LogMessage m);
}

class AppenderHandler : LogHandler {
    private readonly IAppender appender;
    public AppenderHandler(LogLevel minLevel, IAppender appender) : base(minLevel) { this.appender = appender; }
    protected override void Write(LogMessage m) { appender.Append(m); }
}

// 7) Logger: named, hierarchical ("com.shop.db" -> "com.shop" -> "com" -> root).
class Logger {
    private readonly string name;
    private readonly Logger parent;
    private volatile object level;            // boxed LogLevel; null = inherit from parent
    private volatile LogHandler handlers;     // head of this logger's chain (may be null)
    private volatile bool additive = true;    // also send to parent's handlers?

    public Logger(string name, Logger parent) { this.name = name; this.parent = parent; }

    public void SetLevel(LogLevel lv) { level = lv; }
    public void SetHandlers(LogHandler head) { handlers = head; }
    public void SetAdditive(bool a) { additive = a; }

    public LogLevel EffectiveLevel() {
        for (Logger l = this; l != null; l = l.parent) { object lv = l.level; if (lv != null) return (LogLevel)lv; }
        return LogLevel.INFO;                 // safe default if even root has none
    }
    public bool IsEnabled(LogLevel lv) { return lv.AtLeast(EffectiveLevel()); }

    static long NowMillis() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
    static string ThreadName() { return System.Threading.Thread.CurrentThread.Name ?? "main"; }

    // Cheap exit FIRST: if disabled we never build the string.
    public void Log(LogLevel lv, string pattern, params object[] args) {
        if (!IsEnabled(lv)) return;
        Dispatch(new LogMessage(lv, name, Fill(pattern, args), NowMillis(), ThreadName(), MDC.Snapshot()));
    }
    // Lazy variant: the delegate runs only when the level is enabled.
    public void Log(LogLevel lv, Func<string> lazy) {
        if (!IsEnabled(lv)) return;
        Dispatch(new LogMessage(lv, name, lazy(), NowMillis(), ThreadName(), MDC.Snapshot()));
    }
    public void Debug(string p, params object[] a) { Log(LogLevel.DEBUG, p, a); }
    public void Info(string p, params object[] a)  { Log(LogLevel.INFO, p, a); }
    public void Warn(string p, params object[] a)  { Log(LogLevel.WARN, p, a); }
    public void Error(string p, params object[] a) { Log(LogLevel.ERROR, p, a); }

    // Second chain: walk up the logger tree until a non-additive logger stops it.
    private void Dispatch(LogMessage m) {
        for (Logger l = this; l != null; l = l.parent) {
            LogHandler h = l.handlers;
            if (h != null) h.Handle(m);
            if (!l.additive) break;
        }
    }

    // "{}" placeholders, SLF4J style. Plain text is NEVER interpreted (no lookups -> no Log4Shell).
    public static string Fill(string pattern, params object[] args) {
        StringBuilder sb = new StringBuilder();
        int a = 0, i = 0;
        while (i < pattern.Length) {
            if (a < args.Length && string.CompareOrdinal(pattern, i, "{}", 0, 2) == 0) { sb.Append(args[a++]); i += 2; }
            else sb.Append(pattern[i++]);
        }
        return sb.ToString();
    }
}

// 8) LogManager: the single registry (Singleton + Factory). Same name -> same Logger object.
sealed class LogManager {
    private static readonly LogManager INSTANCE = new LogManager();
    private readonly Logger root = new Logger("root", null);
    private readonly ConcurrentDictionary<string, Logger> loggers = new ConcurrentDictionary<string, Logger>();
    private LogManager() { }
    public static LogManager Get() { return INSTANCE; }
    public Logger Root() { return root; }

    public Logger GetLogger(string name) {
        Logger existing;
        if (loggers.TryGetValue(name, out existing)) return existing;
        int dot = name.LastIndexOf('.');
        Logger parent = dot < 0 ? root : GetLogger(name.Substring(0, dot));   // create ancestors first
        return loggers.GetOrAdd(name, n => new Logger(n, parent));
    }
}

class LoggingDemo {
    static string L(List<string> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        LogManager lm = LogManager.Get();
        MemoryAppender file = new MemoryAppender(new JsonFormatter());
        MemoryAppender pager = new MemoryAppender(new PlainFormatter());

        // root chain: Console(>=DEBUG) -> File(>=INFO) -> Pager(>=ERROR)
        LogHandler head = new AppenderHandler(LogLevel.DEBUG, new ConsoleAppender(new PlainFormatter()));
        head.LinkWith(new AppenderHandler(LogLevel.INFO, file))
            .LinkWith(new AppenderHandler(LogLevel.ERROR, pager));
        lm.Root().SetLevel(LogLevel.INFO);
        lm.Root().SetHandlers(head);

        Logger db = lm.GetLogger("com.shop.db");
        Logger pay = lm.GetLogger("com.shop.payment");
        db.SetLevel(LogLevel.DEBUG);                // turn on DEBUG only for the DB package

        MDC.Put("requestId", "r-77");
        db.Debug("SELECT took {} ms", 12);          // console only (DEBUG < INFO for file)
        pay.Debug("never built: {}", "x");          // payment inherits INFO from root -> skipped cheaply
        pay.Info("charged order {} amount {}", 42, 499);
        pay.Error("gateway timeout for order {}", 43);
        MDC.Clear();

        // The clock differs on every run, so the demo prints the JSON lines with "ts" zeroed.
        List<string> fileLines = file.Lines().Select(l => Regex.Replace(l, "\\"ts\\":\\\\d+", "\\"ts\\":0")).ToList();
        Console.WriteLine("file got  " + fileLines.Count + " lines: " + L(fileLines));
        Console.WriteLine("pager got " + pager.Lines().Count + " line: " + L(pager.Lines()));
        Console.WriteLine("same object? " + (lm.GetLogger("com.shop.db") == db).ToString().ToLower());

        // A disabled call never builds its message (the lazy delegate is not even called).
        int built = 0;
        pay.Log(LogLevel.DEBUG, () => { built++; return "expensive text"; });
        Console.WriteLine("lazy message built while disabled? " + (built > 0).ToString().ToLower());

        // additive = false keeps a private audit log away from the root handlers.
        MemoryAppender auditFile = new MemoryAppender(new PlainFormatter());
        Logger audit = lm.GetLogger("com.shop.audit");
        audit.SetHandlers(new AppenderHandler(LogLevel.INFO, auditFile));
        audit.SetAdditive(false);
        audit.Info("user {} exported data", "asha");
        Console.WriteLine("audit file " + L(auditFile.Lines()) + ", root file still " + file.Lines().Count + " lines");

        // Async decorator with a tiny queue: DEBUG/INFO may be dropped, WARN+ never.
        // How many INFOs are dropped depends on thread timing, so only the invariants are printed.
        MemoryAppender slowDisk = new MemoryAppender(new PlainFormatter());
        AsyncAppender async = new AsyncAppender(slowDisk, 4);
        for (int i = 0; i < 50; i++)
            async.Append(new LogMessage(i % 10 == 0 ? LogLevel.WARN : LogLevel.INFO, "load", "msg " + i, 0, "main", new Dictionary<string, string>()));
        async.Close();
        List<string> warns = slowDisk.Lines().Where(l => l.StartsWith("WARN")).ToList();
        Console.WriteLine("async: written + dropped = " + (slowDisk.Lines().Count + async.Dropped()) + " of 50");
        Console.WriteLine("WARN lines kept: " + warns.Count + " " + L(warns));
    }
}` }] }],
    codeTitle: ['Complete logging framework — levels, MDC, formatters, appenders, async decorator, handler chain, logger hierarchy (runnable main)'],
    viz: [
      { title: 'Class diagram tour: who does what in the logging framework', gen: function () { return logClassViz(); } },
      { title: 'One log call flowing through the logger tree and handler chain', input: 'ERROR com.shop.payment Card gateway timeout', inputLabel: 'LEVEL logger.name message  (loggers: com.shop.db, com.shop.payment, com.shop.audit, or any name)', gen: logFlowViz }
    ],
    examples: [
      { title: 'Which lines get printed? (level gate)', html: `<p>Logger level = <b>WARN</b>. The code logs four lines:</p>
${H.table(['Call', 'Severity', '≥ WARN (30)?', 'Printed?'], [
  ['<code>debug("cache miss")</code>', '10', 'no', H.c('r', 'no — returns before building the string')],
  ['<code>info("user login")</code>', '20', 'no', H.c('r', 'no')],
  ['<code>warn("disk 91%")</code>', '30', 'yes', H.c('g', 'yes')],
  ['<code>error("payment failed")</code>', '40', 'yes', H.c('g', 'yes')]
])}<p>Why numbers 10/20/30/40 instead of 1/2/3/4? Gaps leave room to add a custom level (e.g. <code>AUDIT(35)</code>) later without renumbering.</p>` },
      { title: 'Adding a Slack appender without touching the core', html: `<p>Product wants ERRORs in a Slack channel. With the good design this is <b>one new class and one line of config</b>. Logger, LogHandler and every existing appender stay untouched — that is Open/Closed in action.</p>`, code: { lang: 'java', code: String.raw`
interface Appender { void append(String line); }

// A brand-new destination. Nothing else changes.
class SlackAppender implements Appender {
    private final String channel;
    private final List<String> sent = new ArrayList<>();   // stands in for an HTTP client
    SlackAppender(String channel) { this.channel = channel; }
    public void append(String line) { sent.add("#" + channel + ": " + line); }
    List<String> sent() { return sent; }
}

class SlackDemo {
    public static void main(String[] args) {
        SlackAppender slack = new SlackAppender("payments-alerts");
        slack.append("ERROR gateway timeout order=43");
        System.out.println(slack.sent());   // [#payments-alerts: ERROR gateway timeout order=43]
    }
}`,
        alt: [
          { lang: 'python', code: String.raw`
from abc import ABC, abstractmethod


class Appender(ABC):
    @abstractmethod
    def append(self, line: str) -> None: ...


# A brand-new destination. Nothing else changes.
class SlackAppender(Appender):
    def __init__(self, channel: str) -> None:
        self._channel = channel
        self.sent: list[str] = []            # stands in for an HTTP client

    def append(self, line: str) -> None:
        self.sent.append(f"#{self._channel}: {line}")


slack = SlackAppender("payments-alerts")
slack.append("ERROR gateway timeout order=43")
print("[" + ", ".join(slack.sent) + "]")     # [#payments-alerts: ERROR gateway timeout order=43]` },
          { lang: 'ts', code: String.raw`
interface Appender { append(line: string): void; }

// A brand-new destination. Nothing else changes.
class SlackAppender implements Appender {
  readonly sent: string[] = [];              // stands in for an HTTP client
  constructor(private readonly channel: string) {}
  append(line: string): void { this.sent.push("#" + this.channel + ": " + line); }
}

const slack = new SlackAppender("payments-alerts");
slack.append("ERROR gateway timeout order=43");
console.log("[" + slack.sent.join(", ") + "]");   // [#payments-alerts: ERROR gateway timeout order=43]` },
          { lang: 'cpp', code: String.raw`
class Appender {
public:
    virtual ~Appender() = default;
    virtual void append(const string& line) = 0;
};

// A brand-new destination. Nothing else changes.
class SlackAppender : public Appender {
    string channel;
    vector<string> sent_;                    // stands in for an HTTP client
public:
    explicit SlackAppender(string c) : channel(move(c)) {}
    void append(const string& line) override { sent_.push_back("#" + channel + ": " + line); }
    const vector<string>& sent() const { return sent_; }
};

int main() {
    SlackAppender slack("payments-alerts");
    slack.append("ERROR gateway timeout order=43");
    cout << "[" << slack.sent()[0] << "]\n";  // [#payments-alerts: ERROR gateway timeout order=43]
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IAppender { void Append(string line); }

// A brand-new destination. Nothing else changes.
class SlackAppender : IAppender {
    private readonly string channel;
    private readonly List<string> sent = new List<string>();   // stands in for an HTTP client
    public SlackAppender(string channel) { this.channel = channel; }
    public void Append(string line) { sent.Add("#" + channel + ": " + line); }
    public List<string> Sent() { return sent; }
}

class SlackDemo {
    static void Main() {
        SlackAppender slack = new SlackAppender("payments-alerts");
        slack.Append("ERROR gateway timeout order=43");
        Console.WriteLine("[" + string.Join(", ", slack.Sent()) + "]");   // [#payments-alerts: ERROR gateway timeout order=43]
    }
}` }
        ] } },
      { title: 'Logger hierarchy: one setting, many packages', html: `<p>Config: root = INFO, <code>com.shop.db</code> = DEBUG, nothing else set.</p>
${H.table(['Logger', 'Own level', 'Effective level', 'Why'], [
  ['<code>com.shop.db.pool</code>', '—', 'DEBUG', 'climbs to com.shop.db'],
  ['<code>com.shop.db</code>', 'DEBUG', 'DEBUG', 'explicit'],
  ['<code>com.shop.cart</code>', '—', 'INFO', 'climbs com.shop → root'],
  ['<code>root</code>', 'INFO', 'INFO', 'explicit']
])}<p>Set <code>additive=false</code> on <code>com.shop.audit</code> and its lines go only to its own AuditFile, never to the root console. Forgetting additivity is the #1 cause of <b>duplicate log lines</b> in Log4j/Logback setups (same appender attached at child and parent).</p>` },
      { title: 'Strict (classic GoF) chain vs pipeline chain', html: `<p>Two flavours you may be asked about:</p>
${H.table(['Flavour', 'Rule', 'Use when'], [
  ['<b>Strict</b> (textbook)', 'Each handler owns ONE level. If it matches, handle and <b>stop</b>; otherwise pass on.', 'Interviewer says "INFO handler, DEBUG handler, ERROR handler" — exactly one handles each message'],
  ['<b>Pipeline</b> (real frameworks)', 'Every handler sees the message; each writes if level ≥ its min; always pass on.', 'One message must reach console AND file AND pager']
])}`, code: { lang: 'java', code: String.raw`
enum Lvl { DEBUG, INFO, ERROR }

abstract class StrictHandler {
    private StrictHandler next;
    StrictHandler setNext(StrictHandler n) { next = n; return n; }
    void handle(Lvl lvl, String msg) {
        if (canHandle(lvl)) { System.out.println(name() + " handled: " + msg); return; }   // stop here
        if (next != null) next.handle(lvl, msg);
        else System.out.println("nobody handled: " + msg);
    }
    abstract boolean canHandle(Lvl lvl);
    abstract String name();
}
class DebugH extends StrictHandler { boolean canHandle(Lvl l) { return l == Lvl.DEBUG; } String name() { return "DebugHandler"; } }
class InfoH  extends StrictHandler { boolean canHandle(Lvl l) { return l == Lvl.INFO; }  String name() { return "InfoHandler"; } }
class ErrorH extends StrictHandler { boolean canHandle(Lvl l) { return l == Lvl.ERROR; } String name() { return "ErrorHandler"; } }

class StrictDemo {
    public static void main(String[] args) {
        StrictHandler chain = new DebugH();
        chain.setNext(new InfoH()).setNext(new ErrorH());
        chain.handle(Lvl.INFO, "user logged in");     // InfoHandler handled
        chain.handle(Lvl.ERROR, "db down");          // ErrorHandler handled
    }
}`,
        alt: [
          { lang: 'python', code: String.raw`
from abc import ABC, abstractmethod
from enum import Enum, auto
from typing import Optional


class Lvl(Enum):
    DEBUG = auto()
    INFO = auto()
    ERROR = auto()


class StrictHandler(ABC):
    def __init__(self) -> None:
        self._next: Optional["StrictHandler"] = None

    def set_next(self, n: "StrictHandler") -> "StrictHandler":
        self._next = n
        return n

    def handle(self, lvl: Lvl, msg: str) -> None:
        if self.can_handle(lvl):
            print(f"{self.name()} handled: {msg}")      # stop here
        elif self._next is not None:
            self._next.handle(lvl, msg)
        else:
            print(f"nobody handled: {msg}")

    @abstractmethod
    def can_handle(self, lvl: Lvl) -> bool: ...

    @abstractmethod
    def name(self) -> str: ...


class DebugH(StrictHandler):
    def can_handle(self, lvl: Lvl) -> bool: return lvl is Lvl.DEBUG
    def name(self) -> str: return "DebugHandler"


class InfoH(StrictHandler):
    def can_handle(self, lvl: Lvl) -> bool: return lvl is Lvl.INFO
    def name(self) -> str: return "InfoHandler"


class ErrorH(StrictHandler):
    def can_handle(self, lvl: Lvl) -> bool: return lvl is Lvl.ERROR
    def name(self) -> str: return "ErrorHandler"


chain = DebugH()
chain.set_next(InfoH()).set_next(ErrorH())
chain.handle(Lvl.INFO, "user logged in")     # InfoHandler handled
chain.handle(Lvl.ERROR, "db down")           # ErrorHandler handled` },
          { lang: 'ts', code: String.raw`
enum Lvl { DEBUG, INFO, ERROR }

abstract class StrictHandler {
  private next: StrictHandler | null = null;
  setNext(n: StrictHandler): StrictHandler { this.next = n; return n; }
  handle(lvl: Lvl, msg: string): void {
    if (this.canHandle(lvl)) console.log(this.name() + " handled: " + msg);   // stop here
    else if (this.next !== null) this.next.handle(lvl, msg);
    else console.log("nobody handled: " + msg);
  }
  abstract canHandle(lvl: Lvl): boolean;
  abstract name(): string;
}
class DebugH extends StrictHandler { canHandle(l: Lvl): boolean { return l === Lvl.DEBUG; } name(): string { return "DebugHandler"; } }
class InfoH extends StrictHandler { canHandle(l: Lvl): boolean { return l === Lvl.INFO; } name(): string { return "InfoHandler"; } }
class ErrorH extends StrictHandler { canHandle(l: Lvl): boolean { return l === Lvl.ERROR; } name(): string { return "ErrorHandler"; } }

const chain = new DebugH();
chain.setNext(new InfoH()).setNext(new ErrorH());
chain.handle(Lvl.INFO, "user logged in");    // InfoHandler handled
chain.handle(Lvl.ERROR, "db down");          // ErrorHandler handled` },
          { lang: 'cpp', code: String.raw`
enum class Lvl { DEBUG, INFO, ERROR };

class StrictHandler {
    unique_ptr<StrictHandler> next;
public:
    virtual ~StrictHandler() = default;
    StrictHandler* setNext(unique_ptr<StrictHandler> n) { next = move(n); return next.get(); }
    void handle(Lvl lvl, const string& msg) const {
        if (canHandle(lvl)) cout << name() << " handled: " << msg << "\n";     // stop here
        else if (next) next->handle(lvl, msg);
        else cout << "nobody handled: " << msg << "\n";
    }
    virtual bool canHandle(Lvl lvl) const = 0;
    virtual string name() const = 0;
};
class DebugH : public StrictHandler {
public:
    bool canHandle(Lvl l) const override { return l == Lvl::DEBUG; }
    string name() const override { return "DebugHandler"; }
};
class InfoH : public StrictHandler {
public:
    bool canHandle(Lvl l) const override { return l == Lvl::INFO; }
    string name() const override { return "InfoHandler"; }
};
class ErrorH : public StrictHandler {
public:
    bool canHandle(Lvl l) const override { return l == Lvl::ERROR; }
    string name() const override { return "ErrorHandler"; }
};

int main() {
    DebugH chain;
    chain.setNext(make_unique<InfoH>())->setNext(make_unique<ErrorH>());
    chain.handle(Lvl::INFO, "user logged in");    // InfoHandler handled
    chain.handle(Lvl::ERROR, "db down");          // ErrorHandler handled
}` },
  { lang: 'csharp', code: `
using System;

enum Lvl { DEBUG, INFO, ERROR }

abstract class StrictHandler {
    private StrictHandler next;
    public StrictHandler SetNext(StrictHandler n) { next = n; return n; }
    public void Handle(Lvl lvl, string msg) {
        if (CanHandle(lvl)) { Console.WriteLine(Name() + " handled: " + msg); return; }   // stop here
        if (next != null) next.Handle(lvl, msg);
        else Console.WriteLine("nobody handled: " + msg);
    }
    protected abstract bool CanHandle(Lvl lvl);
    protected abstract string Name();
}
class DebugH : StrictHandler { protected override bool CanHandle(Lvl l) { return l == Lvl.DEBUG; } protected override string Name() { return "DebugHandler"; } }
class InfoH  : StrictHandler { protected override bool CanHandle(Lvl l) { return l == Lvl.INFO; }  protected override string Name() { return "InfoHandler"; } }
class ErrorH : StrictHandler { protected override bool CanHandle(Lvl l) { return l == Lvl.ERROR; } protected override string Name() { return "ErrorHandler"; } }

class StrictDemo {
    static void Main() {
        StrictHandler chain = new DebugH();
        chain.SetNext(new InfoH()).SetNext(new ErrorH());
        chain.Handle(Lvl.INFO, "user logged in");     // InfoHandler handled
        chain.Handle(Lvl.ERROR, "db down");           // ErrorHandler handled
    }
}` }
        ] } },
      { title: 'Async appender under load: drop or block?', html: `<p>Queue capacity 4, a burst of 50 messages (45 INFO, 5 WARN), slow disk. Policy: <b>WARN+ blocks</b> until there is space; <b>INFO is dropped</b> when full (and counted). Result in the demo: all 5 WARNs are written, and some INFOs are dropped. How many depends on thread timing, so the demo prints the invariant <code>written + dropped = 50</code> and the 5 WARN lines (operators would get the count as a metric). JavaScript cannot block a caller, so the TypeScript version always accepts WARN+ and drops only INFO/DEBUG. Logback\'s <code>AsyncAppender</code> does something very similar: when the queue is 80% full it discards TRACE/DEBUG/INFO by default (<code>discardingThreshold</code>), and <code>neverBlock=true</code> drops instead of blocking.</p>` }
    ],
    deepDive: `<p><b>1. The cost model.</b> A disabled log call must be almost free. Order inside <code>log()</code>: (a) compare two ints, (b) only then format, allocate, read the clock, copy MDC. That is why APIs offer <code>log.debug("x={}", x)</code> (no concatenation unless enabled) and <code>log.debug(() -&gt; expensive())</code> (a lazy callback: Java <code>Supplier</code>, Python <code>lambda</code>, C++ <code>std::function</code>). <code>log.debug("x=" + x)</code> builds the string even when DEBUG is off.</p>
<p><b>2. Thread safety.</b> The message is immutable, so sharing it is safe. Appenders are the shared mutable part: a file appender must not interleave two half-lines. Options: a lock around <code>append</code> (Java <code>synchronized</code>, Python <code>threading.Lock</code>, C++ <code>std::mutex</code>; simple, contention under load), a <b>single writer thread</b> fed by a queue (AsyncAppender), or a lock-free ring buffer — Log4j 2\'s async loggers use the <b>LMAX Disruptor</b> and reach millions of messages per second.</p>
<p><b>3. Back-pressure policy is a product decision.</b> When the queue is full you can block (never lose logs, but slow requests), drop (fast, lossy), or drop low levels first. Always <b>count drops</b> and expose the number as a metric. On shutdown, flush with a <b>poison pill</b> and a <b>bounded join</b> so the process can still exit.</p>
<p><b>4. MDC and async.</b> MDC is per-thread state (Java <code>ThreadLocal</code>, Python <code>threading.local</code>, C++ <code>thread_local</code>), so it must be <b>snapshotted into the message</b> on the calling thread — the background writer thread has a different (empty) MDC. Thread pools reuse threads, so always <code>MDC.clear()</code> in a finally block or you leak one user\'s requestId into another user\'s logs.</p>
<p><b>5. Security: Log4Shell (CVE-2021-44228).</b> Log4j 2 evaluated <code>$&#123;jndi:ldap://...}</code> lookups inside <i>logged data</i>, so an attacker who could get a string logged could run code. Lesson for your design: the formatter must treat user text as <b>plain data</b>, never as instructions. Also redact secrets/PII in a formatter or filter, and escape newlines to stop log-forging (fake extra lines).</p>
<p><b>6. Production extras.</b> Rolling files by size/time with retention; structured JSON logs shipped to ELK/Loki/Datadog; sampling for very chatty DEBUG; SLF4J as a <b>facade</b> so libraries never pick the backend; per-logger levels changeable at runtime (JMX/actuator) — which is why the Java code marks <code>level</code> <code>volatile</code> (C++ uses <code>std::atomic</code>; Python and Node need nothing special).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant writes the boilerplate of this design (enum, interfaces, three appenders) in seconds, and modern observability stacks (OpenTelemetry) already correlate logs with traces. Your value moves to the <b>decisions</b>: which pattern, what back-pressure policy, what must never be logged.</p>
<p><b>Use AI as a partner:</b> <code>Review my AsyncAppender: can close() hang? Can a message be lost between offer and shutdown?</code> or <code>Generate 10 log lines with tricky content (newlines, quotes, $&#123;...}, emojis) to test my JSON formatter</code>.</p>
<p><b>Where AI goes wrong:</b> it often forgets the level check happens <i>before</i> string building, joins the worker thread without a timeout, reads MDC on the wrong thread, or concatenates strings inside <code>debug()</code>.</p>
<p><b>New-school concern — logs are now read by AI.</b> Teams pipe logs into LLMs for incident summaries. That makes logs a <b>prompt-injection</b> channel ("ignore previous instructions…" inside a user-agent string) and a <b>PII leak</b> channel. Structured JSON fields, redaction filters and clear separation of "message" vs "user data" fields matter more than ever.</p>
<p><b>What you must still own:</b> drawing the two chains from memory, explaining additivity, and defending your drop/block choice under load.</p>`,
    problems: [{
      title: 'Machine Coding: Logger Library with Levels and Multiple Sinks',
      level: 'Medium', tags: ['chain of responsibility', 'strategy', 'singleton', 'logging'], companies: ['Amazon', 'Flipkart', 'Uber', 'Atlassian'],
      statement: `<p>Build a logger library in 45 minutes. Requirements: (1) levels DEBUG, INFO, WARN, ERROR; (2) a logger has a minimum level; (3) messages go through a <b>chain of sinks</b> (console, file, alert) and each sink has its own minimum level; (4) adding a new sink must not change existing classes; (5) the format of a line is pluggable. Show it working with a small demo.</p>`,
      constraints: `<p>In-memory sinks are fine (no real files). Must be thread-safe for concurrent <code>log()</code> calls. A disabled level must not build the message string.</p>`,
      example: `<p>Logger min = INFO. Chain: Console(≥DEBUG) → File(≥INFO) → Alert(≥ERROR).</p>
${H.table(['Call', 'Console', 'File', 'Alert'], [['debug("a")', H.c('m', 'dropped at logger gate'), '—', '—'], ['info("b")', H.c('g', 'b'), H.c('g', 'b'), '—'], ['error("c")', H.c('g', 'c'), H.c('g', 'c'), H.c('g', 'c')]])}
<p>DEBUG never reaches the chain because the logger itself is INFO.</p>`,
      brute: {
        why: `<p>The naive version is one static method full of <code>if</code>s on level strings and boolean flags. Every new sink or rule edits that same method (Open/Closed broken), string comparison of levels is fragile ("Info" vs "INFO"), there is one global level, and the message string is built before we know if it is needed.</p>`,
        code: { lang: 'java', code: String.raw`
class NaiveLogger {
    static String level = "INFO";
    static boolean toConsole = true, toFile = true, toAlert = true;
    static final List<String> file = new ArrayList<>(), alerts = new ArrayList<>();

    static void log(String lvl, String msg) {
        // fragile string ladder: every new level = edit here
        if (lvl.equals("DEBUG") && !level.equals("DEBUG")) return;
        if (lvl.equals("INFO") && (level.equals("WARN") || level.equals("ERROR"))) return;
        if (lvl.equals("WARN") && level.equals("ERROR")) return;
        String line = "[" + lvl + "] " + msg;
        if (toConsole) System.out.println(line);
        if (toFile && !lvl.equals("DEBUG")) file.add(line);
        if (toAlert && lvl.equals("ERROR")) alerts.add(line);   // new sink? edit this method again
    }

    public static void main(String[] args) {
        log("DEBUG", "a"); log("INFO", "b"); log("ERROR", "c");
        System.out.println("file=" + file + " alerts=" + alerts);
    }
}`, alt: [{ lang: 'python', code: "# fragile string ladder: every new level = edit log()\nlevel = \"INFO\"\nto_console = to_file = to_alert = True\nfile, alerts = [], []\n\ndef log(lvl, msg):\n    if lvl == \"DEBUG\" and level != \"DEBUG\": return\n    if lvl == \"INFO\" and level in (\"WARN\", \"ERROR\"): return\n    if lvl == \"WARN\" and level == \"ERROR\": return\n    line = f\"[{lvl}] {msg}\"\n    if to_console: print(line)\n    if to_file and lvl != \"DEBUG\": file.append(line)\n    if to_alert and lvl == \"ERROR\": alerts.append(line)   # new sink? edit this function again\n\nif __name__ == \"__main__\":\n    log(\"DEBUG\", \"a\"); log(\"INFO\", \"b\"); log(\"ERROR\", \"c\")\n    print(f\"file={file} alerts={alerts}\")\n" }, { lang: 'ts', code: "class NaiveLogger {\n  static level = \"INFO\";\n  static toConsole = true; static toFile = true; static toAlert = true;\n  static file: string[] = []; static alerts: string[] = [];\n\n  static log(lvl: string, msg: string): void {\n    // fragile string ladder: every new level = edit here\n    if (lvl === \"DEBUG\" && NaiveLogger.level !== \"DEBUG\") return;\n    if (lvl === \"INFO\" && (NaiveLogger.level === \"WARN\" || NaiveLogger.level === \"ERROR\")) return;\n    if (lvl === \"WARN\" && NaiveLogger.level === \"ERROR\") return;\n    const line = \"[\" + lvl + \"] \" + msg;\n    if (NaiveLogger.toConsole) console.log(line);\n    if (NaiveLogger.toFile && lvl !== \"DEBUG\") NaiveLogger.file.push(line);\n    if (NaiveLogger.toAlert && lvl === \"ERROR\") NaiveLogger.alerts.push(line);   // new sink? edit this method again\n  }\n}\n\nNaiveLogger.log(\"DEBUG\", \"a\"); NaiveLogger.log(\"INFO\", \"b\"); NaiveLogger.log(\"ERROR\", \"c\");\nconsole.log(\"file=\" + JSON.stringify(NaiveLogger.file) + \" alerts=\" + JSON.stringify(NaiveLogger.alerts));\n" }, { lang: 'cpp', code: "struct NaiveLogger {\n    static inline string level = \"INFO\";\n    static inline bool toConsole = true, toFile = true, toAlert = true;\n    static inline vector<string> file, alerts;\n\n    static void log(const string& lvl, const string& msg) {\n        // fragile string ladder: every new level = edit here\n        if (lvl == \"DEBUG\" && level != \"DEBUG\") return;\n        if (lvl == \"INFO\" && (level == \"WARN\" || level == \"ERROR\")) return;\n        if (lvl == \"WARN\" && level == \"ERROR\") return;\n        string line = \"[\" + lvl + \"] \" + msg;\n        if (toConsole) cout << line << endl;\n        if (toFile && lvl != \"DEBUG\") file.push_back(line);\n        if (toAlert && lvl == \"ERROR\") alerts.push_back(line);   // new sink? edit this method again\n    }\n};\n\nint main() {\n    NaiveLogger::log(\"DEBUG\", \"a\"); NaiveLogger::log(\"INFO\", \"b\"); NaiveLogger::log(\"ERROR\", \"c\");\n    cout << \"file=\" << NaiveLogger::file.size() << \" alerts=\" << NaiveLogger::alerts.size() << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\n\nstatic class NaiveLogger {\n    static string level = \"INFO\";\n    static bool toConsole = true, toFile = true, toAlert = true;\n    static readonly List<string> file = new List<string>(), alerts = new List<string>();\n\n    static void Log(string lvl, string msg) {\n        // fragile string ladder: every new level = edit here\n        if (lvl == \"DEBUG\" && level != \"DEBUG\") return;\n        if (lvl == \"INFO\" && (level == \"WARN\" || level == \"ERROR\")) return;\n        if (lvl == \"WARN\" && level == \"ERROR\") return;\n        string line = \"[\" + lvl + \"] \" + msg;\n        if (toConsole) Console.WriteLine(line);\n        if (toFile && lvl != \"DEBUG\") file.Add(line);\n        if (toAlert && lvl == \"ERROR\") alerts.Add(line);   // new sink? edit this method again\n    }\n\n    static void Main() {\n        Log(\"DEBUG\", \"a\"); Log(\"INFO\", \"b\"); Log(\"ERROR\", \"c\");\n        Console.WriteLine(\"file=[\" + string.Join(\", \", file) + \"] alerts=[\" + string.Join(\", \", alerts) + \"]\");\n    }\n}\n" }] }
      },
      mcq: { q: 'Product asks: "send WARN and above to a new Kafka topic." In the good design, what changes?', options: ['Add a KafkaSink class and link it into the chain via config', 'Edit Logger.log() to add a Kafka branch', 'Add a boolean toKafka flag to every logger', 'Subclass Logger as KafkaLogger'], answer: 0, explain: 'A new sink is a new class implementing the sink interface, linked into the chain. Nothing existing is edited — Open/Closed.' },
      hints: [
        `<p>Separate the three questions: <b>should</b> we log (level gate), <b>where</b> (sinks), <b>how it looks</b> (formatter). Each becomes its own type.</p>`,
        `<p>Give each sink a <code>next</code> pointer and a <code>minLevel</code>. <code>handle(msg)</code>: write if <code>msg.level ≥ minLevel</code>, then <code>next.handle(msg)</code>. Use an enum with ordinal/severity for levels.</p>`,
        `<p>Edge cases: logger gate before building strings (pass the text as a lazy callback: Java <code>Supplier&lt;String&gt;</code>, Python <code>lambda</code>, C++ <code>std::function</code>), locked writes in sinks, null <code>next</code> at the end of the chain. Recipe: Level enum → Msg value type → Formatter interface → abstract Sink(chain) → Logger(gate + head) → demo.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "[INFO] b\n[ERROR] c\nfile=[[INFO] b, [ERROR] c] alert=[PAGE: c]\nconcurrent lines = 400\nINFO built 0 strings\n[ERROR] kept\nERROR built 1 strings in total\n" }] },
      solution: {
        approach: `<p>Level enum with severities; an immutable message value type; a <code>Formatter</code> strategy; an abstract <code>Sink</code> forming a chain where each link writes if the level is high enough and always forwards; a <code>Logger</code> that checks its own level first and only then builds the message lazily. Sinks are in-memory lists with locked writes. Adding a sink = one subclass + one <code>linkWith</code> call.</p>`,
        code: String.raw`
enum Level { DEBUG, INFO, WARN, ERROR;
    boolean atLeast(Level o) { return ordinal() >= o.ordinal(); } }

record Msg(Level level, String text, long time) { }

interface Formatter { String format(Msg m); }

abstract class Sink {
    private final Level min;
    private final Formatter fmt;
    private Sink next;
    protected final List<String> written = new ArrayList<>();
    Sink(Level min, Formatter fmt) { this.min = min; this.fmt = fmt; }
    Sink linkWith(Sink n) { next = n; return n; }
    final void handle(Msg m) {
        if (m.level().atLeast(min)) write(fmt.format(m));
        if (next != null) next.handle(m);
    }
    protected synchronized void write(String line) { written.add(line); }
    synchronized List<String> lines() { return new ArrayList<>(written); }
}
class ConsoleSink extends Sink {
    ConsoleSink(Level min, Formatter f) { super(min, f); }
    protected synchronized void write(String line) { super.write(line); System.out.println(line); }
}
class FileSink extends Sink { FileSink(Level min, Formatter f) { super(min, f); } }
class AlertSink extends Sink { AlertSink(Level min, Formatter f) { super(min, f); } }

class SimpleLogger {
    private volatile Level level;
    private final Sink head;
    SimpleLogger(Level level, Sink head) { this.level = level; this.head = head; }
    void setLevel(Level l) { level = l; }
    void log(Level l, Supplier<String> text) {
        if (!l.atLeast(level)) return;                 // gate first: no string built
        head.handle(new Msg(l, text.get(), System.currentTimeMillis()));
    }
    void debug(String s) { log(Level.DEBUG, () -> s); }
    void info(String s)  { log(Level.INFO, () -> s); }
    void error(String s) { log(Level.ERROR, () -> s); }
}

class LoggerSolution {
    public static void main(String[] args) throws Exception {
        Formatter plain = m -> "[" + m.level() + "] " + m.text();
        ConsoleSink console = new ConsoleSink(Level.DEBUG, plain);
        FileSink file = new FileSink(Level.INFO, plain);
        AlertSink alert = new AlertSink(Level.ERROR, m -> "PAGE: " + m.text());
        console.linkWith(file).linkWith(alert);
        SimpleLogger log = new SimpleLogger(Level.INFO, console);

        log.debug("a"); log.info("b"); log.error("c");
        System.out.println("file=" + file.lines() + " alert=" + alert.lines());

        // concurrency smoke test: 4 threads x 100 lines, nothing lost
        FileSink sink = new FileSink(Level.INFO, plain);
        SimpleLogger multi = new SimpleLogger(Level.INFO, sink);
        ExecutorService pool = Executors.newFixedThreadPool(4);
        for (int t = 0; t < 4; t++) pool.submit(() -> { for (int i = 0; i < 100; i++) multi.info("x" + i); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("concurrent lines = " + sink.lines().size());   // 400

        // raise the level at run time: a disabled call never builds its text
        int[] built = {0};
        log.setLevel(Level.ERROR);
        log.log(Level.INFO, () -> { built[0]++; return "hidden"; });
        System.out.println("INFO built " + built[0] + " strings");
        log.log(Level.ERROR, () -> { built[0]++; return "kept"; });
        System.out.println("ERROR built " + built[0] + " strings in total");
    }
}`,
      alt: [
          { lang: 'python', code: String.raw`
import threading
import time
from abc import ABC
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from enum import IntEnum
from typing import Callable, Optional


class Level(IntEnum):
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3

    def at_least(self, other: "Level") -> bool:
        return self >= other


@dataclass(frozen=True)
class Msg:
    level: Level
    text: str
    time: int


Formatter = Callable[[Msg], str]


class Sink(ABC):
    def __init__(self, min_level: Level, fmt: Formatter) -> None:
        self._min = min_level
        self._fmt = fmt
        self._next: Optional["Sink"] = None
        self._written: list[str] = []
        self._lock = threading.Lock()

    def link_with(self, n: "Sink") -> "Sink":
        self._next = n
        return n

    def handle(self, m: Msg) -> None:
        if m.level.at_least(self._min):
            self._write(self._fmt(m))
        if self._next is not None:
            self._next.handle(m)

    def _write(self, line: str) -> None:
        with self._lock:
            self._written.append(line)

    def lines(self) -> list[str]:
        with self._lock:
            return list(self._written)


class ConsoleSink(Sink):
    def _write(self, line: str) -> None:
        with self._lock:
            self._written.append(line)
            print(line)


class FileSink(Sink):
    pass


class AlertSink(Sink):
    pass


class SimpleLogger:
    def __init__(self, level: Level, head: Sink) -> None:
        self._level = level
        self._head = head

    def set_level(self, level: Level) -> None:
        self._level = level

    def log(self, level: Level, text: Callable[[], str]) -> None:
        if not level.at_least(self._level):
            return                                       # gate first: no string built
        self._head.handle(Msg(level, text(), int(time.time() * 1000)))

    def debug(self, s: str) -> None: self.log(Level.DEBUG, lambda: s)
    def info(self, s: str) -> None: self.log(Level.INFO, lambda: s)
    def error(self, s: str) -> None: self.log(Level.ERROR, lambda: s)


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def main() -> None:
    def plain(m: Msg) -> str:
        return f"[{m.level.name}] {m.text}"

    console = ConsoleSink(Level.DEBUG, plain)
    file = FileSink(Level.INFO, plain)
    alert = AlertSink(Level.ERROR, lambda m: "PAGE: " + m.text)
    console.link_with(file).link_with(alert)
    log = SimpleLogger(Level.INFO, console)

    log.debug("a")
    log.info("b")
    log.error("c")
    print(f"file={show(file.lines())} alert={show(alert.lines())}")

    # concurrency smoke test: 4 threads x 100 lines, nothing lost
    sink = FileSink(Level.INFO, plain)
    multi = SimpleLogger(Level.INFO, sink)

    def worker() -> None:
        for i in range(100):
            multi.info(f"x{i}")

    with ThreadPoolExecutor(max_workers=4) as pool:
        for _ in range(4):
            pool.submit(worker)
    print(f"concurrent lines = {len(sink.lines())}")     # 400

    # raise the level at run time: a disabled call never builds its text
    built = [0]

    def build(text: str) -> Callable[[], str]:
        def make() -> str:
            built[0] += 1
            return text
        return make

    log.set_level(Level.ERROR)
    log.log(Level.INFO, build("hidden"))
    print(f"INFO built {built[0]} strings")
    log.log(Level.ERROR, build("kept"))
    print(f"ERROR built {built[0]} strings in total")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: String.raw`
enum Level { DEBUG, INFO, WARN, ERROR }

interface Msg { readonly level: Level; readonly text: string; readonly time: number; }

type Formatter = (m: Msg) => string;

abstract class Sink {
  private next: Sink | null = null;
  protected readonly written: string[] = [];
  constructor(private readonly min: Level, private readonly fmt: Formatter) {}
  linkWith(n: Sink): Sink { this.next = n; return n; }
  handle(m: Msg): void {
    if (m.level >= this.min) this.write(this.fmt(m));
    if (this.next !== null) this.next.handle(m);
  }
  protected write(line: string): void { this.written.push(line); }
  lines(): string[] { return [...this.written]; }
}
class ConsoleSink extends Sink {
  protected override write(line: string): void { super.write(line); console.log(line); }
}
class FileSink extends Sink {}
class AlertSink extends Sink {}

class SimpleLogger {
  constructor(private level: Level, private readonly head: Sink) {}
  setLevel(l: Level): void { this.level = l; }
  log(l: Level, text: () => string): void {
    if (l < this.level) return;                    // gate first: no string built
    this.head.handle({ level: l, text: text(), time: Date.now() });
  }
  debug(s: string): void { this.log(Level.DEBUG, () => s); }
  info(s: string): void { this.log(Level.INFO, () => s); }
  error(s: string): void { this.log(Level.ERROR, () => s); }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";

async function main(): Promise<void> {
  const plain: Formatter = (m) => "[" + Level[m.level] + "] " + m.text;
  const console_ = new ConsoleSink(Level.DEBUG, plain);
  const file = new FileSink(Level.INFO, plain);
  const alert = new AlertSink(Level.ERROR, (m) => "PAGE: " + m.text);
  console_.linkWith(file).linkWith(alert);
  const log = new SimpleLogger(Level.INFO, console_);

  log.debug("a");
  log.info("b");
  log.error("c");
  console.log("file=" + show(file.lines()) + " alert=" + show(alert.lines()));

  // concurrency smoke test: 4 async writers x 100 lines, nothing lost.
  // JavaScript runs one task at a time, so writes can only interleave at an await.
  const sink = new FileSink(Level.INFO, plain);
  const multi = new SimpleLogger(Level.INFO, sink);
  const writer = async (): Promise<void> => {
    for (let i = 0; i < 100; i++) { multi.info("x" + i); await Promise.resolve(); }
  };
  await Promise.all([writer(), writer(), writer(), writer()]);
  console.log("concurrent lines = " + sink.lines().length);   // 400

  // raise the level at run time: a disabled call never builds its text
  let built = 0;
  log.setLevel(Level.ERROR);
  log.log(Level.INFO, () => { built++; return "hidden"; });
  console.log("INFO built " + built + " strings");
  log.log(Level.ERROR, () => { built++; return "kept"; });
  console.log("ERROR built " + built + " strings in total");
}

main();` },
          { lang: 'cpp', code: String.raw`
enum class Level { DEBUG, INFO, WARN, ERROR };

bool atLeast(Level a, Level b) { return static_cast<int>(a) >= static_cast<int>(b); }

string levelName(Level l) {
    static const char* names[] = {"DEBUG", "INFO", "WARN", "ERROR"};
    return names[static_cast<int>(l)];
}

struct Msg {
    Level level;
    string text;
    long long time;
};

using Formatter = function<string(const Msg&)>;

class Sink {
    const Level min;
    const Formatter fmt;
    unique_ptr<Sink> next;                   // each link owns the one after it
    vector<string> written;
    mutable mutex mu;
protected:
    virtual void write(const string& line) {
        lock_guard<mutex> lock(mu);
        written.push_back(line);
    }
public:
    Sink(Level m, Formatter f) : min(m), fmt(move(f)) {}
    virtual ~Sink() = default;
    Sink* linkWith(unique_ptr<Sink> n) { next = move(n); return next.get(); }
    void handle(const Msg& m) {
        if (atLeast(m.level, min)) write(fmt(m));
        if (next) next->handle(m);
    }
    vector<string> lines() const {
        lock_guard<mutex> lock(mu);
        return written;
    }
};
class ConsoleSink : public Sink {
protected:
    void write(const string& line) override { Sink::write(line); cout << line << "\n"; }
public:
    using Sink::Sink;
};
class FileSink : public Sink { public: using Sink::Sink; };
class AlertSink : public Sink { public: using Sink::Sink; };

class SimpleLogger {
    atomic<int> level;
    Sink& head;
public:
    SimpleLogger(Level l, Sink& h) : level(static_cast<int>(l)), head(h) {}
    void setLevel(Level l) { level = static_cast<int>(l); }
    void log(Level l, const function<string()>& text) {
        if (static_cast<int>(l) < level) return;          // gate first: no string built
        long long now = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
        head.handle(Msg{l, text(), now});
    }
    void debug(const string& s) { log(Level::DEBUG, [&] { return s; }); }
    void info(const string& s) { log(Level::INFO, [&] { return s; }); }
    void error(const string& s) { log(Level::ERROR, [&] { return s; }); }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

int main() {
    Formatter plain = [](const Msg& m) { return "[" + levelName(m.level) + "] " + m.text; };
    auto console = make_unique<ConsoleSink>(Level::DEBUG, plain);
    auto file = make_unique<FileSink>(Level::INFO, plain);
    auto alert = make_unique<AlertSink>(Level::ERROR, [](const Msg& m) { return "PAGE: " + m.text; });
    FileSink* filePtr = file.get();                       // the chain owns the sinks; keep views to read them
    AlertSink* alertPtr = alert.get();
    console->linkWith(move(file))->linkWith(move(alert));
    SimpleLogger log(Level::INFO, *console);

    log.debug("a");
    log.info("b");
    log.error("c");
    cout << "file=" << show(filePtr->lines()) << " alert=" << show(alertPtr->lines()) << "\n";

    // concurrency smoke test: 4 threads x 100 lines, nothing lost
    FileSink sink(Level::INFO, plain);
    SimpleLogger multi(Level::INFO, sink);
    {
        vector<jthread> pool;
        for (int t = 0; t < 4; t++)
            pool.emplace_back([&multi] { for (int i = 0; i < 100; i++) multi.info("x" + to_string(i)); });
    }                                                      // jthread joins when the vector is destroyed
    cout << "concurrent lines = " << sink.lines().size() << "\n";   // 400

    // raise the level at run time: a disabled call never builds its text
    int built = 0;
    log.setLevel(Level::ERROR);
    log.log(Level::INFO, [&] { built++; return string("hidden"); });
    cout << "INFO built " << built << " strings\n";
    log.log(Level::ERROR, [&] { built++; return string("kept"); });
    cout << "ERROR built " << built << " strings in total\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Threading;

enum Level { DEBUG, INFO, WARN, ERROR }
static class LevelExt { public static bool AtLeast(this Level l, Level o) { return (int)l >= (int)o; } }

sealed class Msg {
    public readonly Level Level; public readonly string Text; public readonly long Time;
    public Msg(Level level, string text, long time) { Level = level; Text = text; Time = time; }
}

delegate string Formatter(Msg m);

abstract class Sink {
    private readonly Level min;
    private readonly Formatter fmt;
    private Sink next;
    protected readonly List<string> Written = new List<string>();
    protected readonly object Gate = new object();
    protected Sink(Level min, Formatter fmt) { this.min = min; this.fmt = fmt; }
    public Sink LinkWith(Sink n) { next = n; return n; }
    public void Handle(Msg m) {
        if (m.Level.AtLeast(min)) Write(fmt(m));
        if (next != null) next.Handle(m);
    }
    protected virtual void Write(string line) { lock (Gate) Written.Add(line); }
    public List<string> Lines() { lock (Gate) return new List<string>(Written); }
}
class ConsoleSink : Sink {
    public ConsoleSink(Level min, Formatter f) : base(min, f) { }
    protected override void Write(string line) { lock (Gate) { base.Write(line); Console.WriteLine(line); } }
}
class FileSink : Sink { public FileSink(Level min, Formatter f) : base(min, f) { } }
class AlertSink : Sink { public AlertSink(Level min, Formatter f) : base(min, f) { } }

class SimpleLogger {
    private volatile int level;                         // stored as int so it can be volatile
    private readonly Sink head;
    public SimpleLogger(Level level, Sink head) { this.level = (int)level; this.head = head; }
    public void SetLevel(Level l) { level = (int)l; }
    public void Log(Level l, Func<string> text) {
        if (!l.AtLeast((Level)level)) return;           // gate first: no string built
        head.Handle(new Msg(l, text(), DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));
    }
    public void Debug(string s) { Log(Level.DEBUG, () => s); }
    public void Info(string s)  { Log(Level.INFO, () => s); }
    public void Error(string s) { Log(Level.ERROR, () => s); }
}

class LoggerSolution {
    static string L(List<string> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        Formatter plain = m => "[" + m.Level + "] " + m.Text;
        ConsoleSink console = new ConsoleSink(Level.DEBUG, plain);
        FileSink file = new FileSink(Level.INFO, plain);
        AlertSink alert = new AlertSink(Level.ERROR, m => "PAGE: " + m.Text);
        console.LinkWith(file).LinkWith(alert);
        SimpleLogger log = new SimpleLogger(Level.INFO, console);

        log.Debug("a"); log.Info("b"); log.Error("c");
        Console.WriteLine("file=" + L(file.Lines()) + " alert=" + L(alert.Lines()));

        // concurrency smoke test: 4 threads x 100 lines, nothing lost
        FileSink sink = new FileSink(Level.INFO, plain);
        SimpleLogger multi = new SimpleLogger(Level.INFO, sink);
        Thread[] ts = new Thread[4];
        for (int t = 0; t < 4; t++) { ts[t] = new Thread(() => { for (int i = 0; i < 100; i++) multi.Info("x" + i); }); ts[t].Start(); }
        foreach (Thread t in ts) t.Join(5000);
        Console.WriteLine("concurrent lines = " + sink.Lines().Count);   // 400

        // raise the level at run time: a disabled call never builds its text
        int built = 0;
        log.SetLevel(Level.ERROR);
        log.Log(Level.INFO, () => { built++; return "hidden"; });
        Console.WriteLine("INFO built " + built + " strings");
        log.Log(Level.ERROR, () => { built++; return "kept"; });
        Console.WriteLine("ERROR built " + built + " strings in total");
    }
}` }
        ],
        complexity: `<p>Gate check O(1). A passing message costs O(H) for H sinks in the chain plus formatting. Memory: one immutable message per call shared by all sinks.</p>`,
        followUps: ['Make the File sink asynchronous without changing Sink or Logger (hint: Decorator).', 'Add per-package levels (com.app.db = DEBUG) — what new class do you need?', 'How would you rotate the file sink every 10 MB?', 'Add a filter that masks credit-card numbers before any sink sees them.']
      }
    }]
  });

  /* ======================= TOPIC 2: KAFKA-LIKE PUB-SUB ======================= */
  var MQ_CORE = String.raw`
// ===== A Kafka-like, in-memory pub-sub log: topics, partitions, offsets, consumer groups =====

// One stored message. The offset is its permanent "page number" inside its partition.
record StoredMessage(long offset, String key, String value, long timestamp) {
    public String toString() { return key + ":" + value + "@" + offset; }   // short form for printing
}

// Where a published message landed.
record RecordMetadata(String topic, int partition, long offset) { }

// Identifies one partition of one topic (used as a map key for offsets).
record TopicPartition(String topic, int partition) {
    public String toString() { return topic + "-" + partition; }   // short form for printing
}

// A partition = an append-only list. Messages are never changed, only appended (and old ones expired).
class Partition {
    private final int id;
    private final List<StoredMessage> log = new ArrayList<>();
    private long startOffset = 0;               // first offset still kept after retention

    Partition(int id) { this.id = id; }
    int id() { return id; }

    synchronized long append(String key, String value) {
        long offset = startOffset + log.size(); // next page number
        log.add(new StoredMessage(offset, key, value, System.currentTimeMillis()));
        return offset;
    }

    // Read up to max messages starting AT fromOffset. Reading never deletes anything.
    synchronized List<StoredMessage> read(long fromOffset, int max) {
        if (fromOffset < startOffset) throw new IllegalArgumentException("offset " + fromOffset + " already deleted");
        int from = (int) (fromOffset - startOffset);
        int to = Math.min(log.size(), from + max);
        return from >= to ? List.of() : new ArrayList<>(log.subList(from, to));
    }

    synchronized long startOffset() { return startOffset; }
    synchronized long endOffset() { return startOffset + log.size(); }   // "log-end offset": next offset to write

    // Retention: drop everything before newStart (time/size based in real Kafka).
    synchronized void deleteBefore(long newStart) {
        int n = (int) Math.min(log.size(), Math.max(0, newStart - startOffset));
        log.subList(0, n).clear();
        startOffset += n;
    }
}

// Strategy: which partition gets a message.
interface Partitioner { int choose(String key, int numPartitions); }

class KeyHashPartitioner implements Partitioner {
    private final AtomicInteger roundRobin = new AtomicInteger();
    public int choose(String key, int n) {
        if (key == null) return Math.floorMod(roundRobin.getAndIncrement(), n);   // no key: spread evenly
        return Math.floorMod(key.hashCode(), n);                                  // same key -> same partition -> ordered
    }
}

class Topic {
    final String name;
    final List<Partition> partitions = new ArrayList<>();
    Topic(String name, int count) {
        this.name = name;
        for (int i = 0; i < count; i++) partitions.add(new Partition(i));
    }
}

// The broker owns topics and the committed offsets of every consumer group.
class Broker {
    private final Map<String, Topic> topics = new ConcurrentHashMap<>();
    private final Map<String, Map<TopicPartition, Long>> committed = new ConcurrentHashMap<>();

    Topic createTopic(String name, int partitions) {
        return topics.computeIfAbsent(name, n -> new Topic(n, partitions));
    }
    Topic topic(String name) {
        Topic t = topics.get(name);
        if (t == null) throw new IllegalArgumentException("no topic " + name);
        return t;
    }
    RecordMetadata append(String topic, int partition, String key, String value) {
        long off = topic(topic).partitions.get(partition).append(key, value);
        return new RecordMetadata(topic, partition, off);
    }
    // Committed offset = "next offset this GROUP should read". Missing = never committed.
    void commit(String group, TopicPartition tp, long nextOffset) {
        committed.computeIfAbsent(group, g -> new ConcurrentHashMap<>()).merge(tp, nextOffset, Math::max);
    }
    OptionalLong committed(String group, TopicPartition tp) {
        Long v = committed.getOrDefault(group, Map.of()).get(tp);
        return v == null ? OptionalLong.empty() : OptionalLong.of(v);
    }
}

class Producer {
    private final Broker broker;
    private final Partitioner partitioner;
    Producer(Broker broker, Partitioner partitioner) { this.broker = broker; this.partitioner = partitioner; }
    RecordMetadata send(String topic, String key, String value) {
        int p = partitioner.choose(key, broker.topic(topic).partitions.size());
        return broker.append(topic, p, key, value);
    }
}

// Group coordinator: decides which member reads which partition (each partition -> exactly ONE member).
class ConsumerGroup {
    final String groupId;
    final String topic;
    private final Broker broker;
    private final List<GroupConsumer> members = new ArrayList<>();
    ConsumerGroup(String groupId, String topic, Broker broker) { this.groupId = groupId; this.topic = topic; this.broker = broker; }

    synchronized GroupConsumer join(String consumerId) {
        GroupConsumer c = new GroupConsumer(consumerId, this, broker);
        members.add(c);
        rebalance();
        return c;
    }
    synchronized void leave(GroupConsumer c) { members.remove(c); rebalance(); }   // crash or shutdown

    // Round-robin assignment; every member restarts from the COMMITTED offsets.
    private void rebalance() {
        members.sort(Comparator.comparing(m -> m.id));
        members.forEach(GroupConsumer::clearAssignment);
        int n = broker.topic(topic).partitions.size();
        for (int p = 0; p < n && !members.isEmpty(); p++)
            members.get(p % members.size()).assign(new TopicPartition(topic, p));
    }
}

class GroupConsumer {
    final String id;
    private final ConsumerGroup group;
    private final Broker broker;
    private final Map<TopicPartition, Long> position = new TreeMap<>(Comparator.comparingInt(TopicPartition::partition));

    GroupConsumer(String id, ConsumerGroup group, Broker broker) { this.id = id; this.group = group; this.broker = broker; }

    void clearAssignment() { position.clear(); }
    void assign(TopicPartition tp) {
        Partition p = broker.topic(tp.topic()).partitions.get(tp.partition());
        long start = broker.committed(group.groupId, tp).orElse(p.startOffset());   // auto.offset.reset = earliest
        position.put(tp, Math.max(start, p.startOffset()));                         // committed offset may be expired
    }
    Set<TopicPartition> assignment() { return position.keySet(); }

    // Pull model: the consumer asks for data at its own pace.
    List<StoredMessage> poll(int maxPerPartition) {
        List<StoredMessage> out = new ArrayList<>();
        for (Map.Entry<TopicPartition, Long> e : position.entrySet()) {
            Partition p = broker.topic(e.getKey().topic()).partitions.get(e.getKey().partition());
            List<StoredMessage> batch = p.read(e.getValue(), maxPerPartition);
            if (!batch.isEmpty()) e.setValue(batch.get(batch.size() - 1).offset() + 1);   // advance local position
            out.addAll(batch);
        }
        return out;
    }
    // At-least-once: call AFTER processing. A crash before this = those messages are re-read by someone.
    void commitSync() { position.forEach((tp, next) -> broker.commit(group.groupId, tp, next)); }
}

public class PubSubDemo {
    public static void main(String[] args) {
        Broker broker = new Broker();
        broker.createTopic("orders", 3);
        Producer producer = new Producer(broker, new KeyHashPartitioner());
        String[][] events = { {"u1", "login"}, {"u2", "view"}, {"u1", "cart"}, {"u3", "view"},
                              {"u2", "pay"}, {"u1", "buy"}, {"u3", "exit"}, {null, "heartbeat"} };
        for (String[] ev : events) {
            RecordMetadata md = producer.send("orders", ev[0], ev[1]);
            System.out.println("sent " + ev[0] + ":" + ev[1] + " -> p" + md.partition() + "@" + md.offset());
        }

        ConsumerGroup billing = new ConsumerGroup("billing", "orders", broker);
        GroupConsumer c1 = billing.join("c1");
        GroupConsumer c2 = billing.join("c2");
        System.out.println("c1 owns " + c1.assignment() + ", c2 owns " + c2.assignment());

        System.out.println("c1 polled " + c1.poll(2));
        c1.commitSync();
        System.out.println("c2 polled " + c2.poll(2) + "  ...and crashes before commit!");
        billing.leave(c2);                                   // rebalance: c1 now owns all partitions
        List<StoredMessage> again = c1.poll(10);
        System.out.println("after rebalance c1 got " + again.size() + " msgs (includes c2's uncommitted = redelivery)");
        c1.commitSync();

        // A second group reads the SAME data independently, from the beginning.
        ConsumerGroup analytics = new ConsumerGroup("analytics", "orders", broker);
        GroupConsumer a1 = analytics.join("a1");
        System.out.println("analytics read " + a1.poll(100).size() + " of 8 messages");

        // Retention deletes old messages; an expired committed offset jumps to the earliest kept one.
        broker.topic("orders").partitions.get(0).deleteBefore(1);
        System.out.println("p0 now starts at offset " + broker.topic("orders").partitions.get(0).startOffset());

        // Failure paths: reading a deleted offset, and a stale bookmark that points at a deleted message.
        try { broker.topic("orders").partitions.get(0).read(0, 5); }
        catch (IllegalArgumentException e) { System.out.println("read p0@0: " + e.getMessage()); }
        broker.commit("audit", new TopicPartition("orders", 0), 0);
        GroupConsumer audit = new ConsumerGroup("audit", "orders", broker).join("x1");
        System.out.println("audit polled " + audit.poll(100).size() + " of 8 (p0@0 was deleted, stale bookmark skipped ahead)");
        try { producer.send("payments", "u1", "x"); }
        catch (IllegalArgumentException e) { System.out.println("send: " + e.getMessage()); }
    }
}`;
  var MQ_CORE_PY = String.raw`
# ===== A Kafka-like, in-memory pub-sub log: topics, partitions, offsets, consumer groups =====
import itertools
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


# One stored message. The offset is its permanent "page number" inside its partition.
@dataclass(frozen=True)
class StoredMessage:
    offset: int
    key: Optional[str]
    value: str
    timestamp: int

    def __str__(self) -> str:                 # short form for printing
        return f"{'null' if self.key is None else self.key}:{self.value}@{self.offset}"


# Where a published message landed.
@dataclass(frozen=True)
class RecordMetadata:
    topic: str
    partition: int
    offset: int


# Identifies one partition of one topic. Frozen dataclasses are hashable, so it works as a dict key.
@dataclass(frozen=True)
class TopicPartition:
    topic: str
    partition: int

    def __str__(self) -> str:
        return f"{self.topic}-{self.partition}"


# A partition = an append-only list. Messages are never changed, only appended (and old ones expired).
class Partition:
    def __init__(self, pid: int) -> None:
        self.id = pid
        self._log: list[StoredMessage] = []
        self._start_offset = 0                # first offset still kept after retention
        self._lock = threading.Lock()

    def append(self, key: Optional[str], value: str) -> int:
        with self._lock:
            offset = self._start_offset + len(self._log)          # next page number
            self._log.append(StoredMessage(offset, key, value, int(time.time() * 1000)))
            return offset

    # Read up to max messages starting AT from_offset. Reading never deletes anything.
    def read(self, from_offset: int, max_count: int) -> list[StoredMessage]:
        with self._lock:
            if from_offset < self._start_offset:
                raise ValueError(f"offset {from_offset} already deleted")
            start = from_offset - self._start_offset
            return self._log[start:start + max_count]              # slicing already returns a copy

    def start_offset(self) -> int:
        with self._lock:
            return self._start_offset

    def end_offset(self) -> int:              # "log-end offset": next offset to write
        with self._lock:
            return self._start_offset + len(self._log)

    # Retention: drop everything before new_start (time/size based in real Kafka).
    def delete_before(self, new_start: int) -> None:
        with self._lock:
            n = min(len(self._log), max(0, new_start - self._start_offset))
            del self._log[:n]
            self._start_offset += n


# Strategy: which partition gets a message.
class Partitioner(ABC):
    @abstractmethod
    def choose(self, key: Optional[str], num_partitions: int) -> int: ...


def java_hash(s: str) -> int:
    """Java's String.hashCode (31*h + c, wrapped to 32 bits) so every language picks the same partition."""
    h = 0
    for ch in s:
        h = (31 * h + ord(ch)) & 0xFFFFFFFF
    return h - (1 << 32) if h >= (1 << 31) else h


class KeyHashPartitioner(Partitioner):
    def __init__(self) -> None:
        self._round_robin = itertools.count()
        self._lock = threading.Lock()

    def choose(self, key: Optional[str], n: int) -> int:
        if key is None:                       # no key: spread evenly
            with self._lock:
                return next(self._round_robin) % n
        return java_hash(key) % n             # same key -> same partition -> ordered (% is floor-mod in Python)


class Topic:
    def __init__(self, name: str, count: int) -> None:
        self.name = name
        self.partitions = [Partition(i) for i in range(count)]


# The broker owns topics and the committed offsets of every consumer group.
class Broker:
    def __init__(self) -> None:
        self._topics: dict[str, Topic] = {}
        self._committed: dict[str, dict[TopicPartition, int]] = {}
        self._lock = threading.Lock()

    def create_topic(self, name: str, partitions: int) -> Topic:
        with self._lock:
            return self._topics.setdefault(name, Topic(name, partitions))

    def topic(self, name: str) -> Topic:
        t = self._topics.get(name)
        if t is None:
            raise ValueError(f"no topic {name}")
        return t

    def append(self, topic: str, partition: int, key: Optional[str], value: str) -> RecordMetadata:
        off = self.topic(topic).partitions[partition].append(key, value)
        return RecordMetadata(topic, partition, off)

    # Committed offset = "next offset this GROUP should read". Missing = never committed.
    def commit(self, group: str, tp: TopicPartition, next_offset: int) -> None:
        with self._lock:
            offsets = self._committed.setdefault(group, {})
            offsets[tp] = max(offsets.get(tp, next_offset), next_offset)   # never moves backwards

    def committed(self, group: str, tp: TopicPartition) -> Optional[int]:
        with self._lock:
            return self._committed.get(group, {}).get(tp)


class Producer:
    def __init__(self, broker: Broker, partitioner: Partitioner) -> None:
        self._broker = broker
        self._partitioner = partitioner

    def send(self, topic: str, key: Optional[str], value: str) -> RecordMetadata:
        p = self._partitioner.choose(key, len(self._broker.topic(topic).partitions))
        return self._broker.append(topic, p, key, value)


# Group coordinator: decides which member reads which partition (each partition -> exactly ONE member).
class ConsumerGroup:
    def __init__(self, group_id: str, topic: str, broker: Broker) -> None:
        self.group_id = group_id
        self.topic = topic
        self._broker = broker
        self._members: list["GroupConsumer"] = []
        self._lock = threading.RLock()

    def join(self, consumer_id: str) -> "GroupConsumer":
        with self._lock:
            c = GroupConsumer(consumer_id, self, self._broker)
            self._members.append(c)
            self._rebalance()
            return c

    def leave(self, c: "GroupConsumer") -> None:      # crash or shutdown
        with self._lock:
            self._members.remove(c)
            self._rebalance()

    # Round-robin assignment; every member restarts from the COMMITTED offsets.
    def _rebalance(self) -> None:
        self._members.sort(key=lambda m: m.id)
        for m in self._members:
            m.clear_assignment()
        n = len(self._broker.topic(self.topic).partitions)
        for p in range(n):
            if not self._members:
                break
            self._members[p % len(self._members)].assign(TopicPartition(self.topic, p))


class GroupConsumer:
    def __init__(self, cid: str, group: ConsumerGroup, broker: Broker) -> None:
        self.id = cid
        self._group = group
        self._broker = broker
        self._position: dict[TopicPartition, int] = {}

    def clear_assignment(self) -> None:
        self._position.clear()

    def assign(self, tp: TopicPartition) -> None:
        p = self._broker.topic(tp.topic).partitions[tp.partition]
        committed = self._broker.committed(self._group.group_id, tp)
        start = p.start_offset() if committed is None else committed       # auto.offset.reset = earliest
        self._position[tp] = max(start, p.start_offset())                  # committed offset may be expired

    def assignment(self) -> list[TopicPartition]:
        return sorted(self._position, key=lambda tp: tp.partition)

    # Pull model: the consumer asks for data at its own pace.
    def poll(self, max_per_partition: int) -> list[StoredMessage]:
        out: list[StoredMessage] = []
        for tp in self.assignment():
            p = self._broker.topic(tp.topic).partitions[tp.partition]
            batch = p.read(self._position[tp], max_per_partition)
            if batch:
                self._position[tp] = batch[-1].offset + 1                   # advance local position
            out.extend(batch)
        return out

    # At-least-once: call AFTER processing. A crash before this = those messages are re-read by someone.
    def commit_sync(self) -> None:
        for tp, nxt in self._position.items():
            self._broker.commit(self._group.group_id, tp, nxt)


def show(items: list) -> str:
    return "[" + ", ".join(str(i) for i in items) + "]"


def main() -> None:
    broker = Broker()
    broker.create_topic("orders", 3)
    producer = Producer(broker, KeyHashPartitioner())
    events = [("u1", "login"), ("u2", "view"), ("u1", "cart"), ("u3", "view"),
              ("u2", "pay"), ("u1", "buy"), ("u3", "exit"), (None, "heartbeat")]
    for key, value in events:
        md = producer.send("orders", key, value)
        print(f"sent {'null' if key is None else key}:{value} -> p{md.partition}@{md.offset}")

    billing = ConsumerGroup("billing", "orders", broker)
    c1 = billing.join("c1")
    c2 = billing.join("c2")
    print(f"c1 owns {show(c1.assignment())}, c2 owns {show(c2.assignment())}")

    print(f"c1 polled {show(c1.poll(2))}")
    c1.commit_sync()
    print(f"c2 polled {show(c2.poll(2))}  ...and crashes before commit!")
    billing.leave(c2)                                   # rebalance: c1 now owns all partitions
    again = c1.poll(10)
    print(f"after rebalance c1 got {len(again)} msgs (includes c2's uncommitted = redelivery)")
    c1.commit_sync()

    # A second group reads the SAME data independently, from the beginning.
    analytics = ConsumerGroup("analytics", "orders", broker)
    a1 = analytics.join("a1")
    print(f"analytics read {len(a1.poll(100))} of 8 messages")

    # Retention deletes old messages; an expired committed offset jumps to the earliest kept one.
    broker.topic("orders").partitions[0].delete_before(1)
    print(f"p0 now starts at offset {broker.topic('orders').partitions[0].start_offset()}")

    # Failure paths: reading a deleted offset, and a stale bookmark that points at a deleted message.
    try:
        broker.topic("orders").partitions[0].read(0, 5)
    except ValueError as e:
        print(f"read p0@0: {e}")
    broker.commit("audit", TopicPartition("orders", 0), 0)
    audit = ConsumerGroup("audit", "orders", broker).join("x1")
    print(f"audit polled {len(audit.poll(100))} of 8 (p0@0 was deleted, stale bookmark skipped ahead)")
    try:
        producer.send("payments", "u1", "x")
    except ValueError as e:
        print(f"send: {e}")


if __name__ == "__main__":
    main()`;
  var MQ_CORE_TS = String.raw`
// ===== A Kafka-like, in-memory pub-sub log: topics, partitions, offsets, consumer groups =====

// One stored message. The offset is its permanent "page number" inside its partition.
interface StoredMessage {
  readonly offset: number;
  readonly key: string | null;
  readonly value: string;
  readonly timestamp: number;
}
const showMessage = (m: StoredMessage): string => (m.key ?? "null") + ":" + m.value + "@" + m.offset;   // short form

// Where a published message landed.
interface RecordMetadata { readonly topic: string; readonly partition: number; readonly offset: number; }

// Identifies one partition of one topic. Objects compare by identity, so we key maps by this string.
interface TopicPartition { readonly topic: string; readonly partition: number; }
const tpKey = (tp: TopicPartition): string => tp.topic + "-" + tp.partition;

// A partition = an append-only list. Messages are never changed, only appended (and old ones expired).
class Partition {
  private log: StoredMessage[] = [];
  private start = 0;                          // first offset still kept after retention

  constructor(readonly id: number) {}

  append(key: string | null, value: string): number {
    const offset = this.start + this.log.length;                      // next page number
    this.log.push({ offset, key, value, timestamp: Date.now() });
    return offset;
  }

  // Read up to max messages starting AT fromOffset. Reading never deletes anything.
  read(fromOffset: number, max: number): StoredMessage[] {
    if (fromOffset < this.start) throw new Error("offset " + fromOffset + " already deleted");
    const from = fromOffset - this.start;
    return this.log.slice(from, from + max);                          // slice returns a copy
  }

  startOffset(): number { return this.start; }
  endOffset(): number { return this.start + this.log.length; }        // "log-end offset": next offset to write

  // Retention: drop everything before newStart (time/size based in real Kafka).
  deleteBefore(newStart: number): void {
    const n = Math.min(this.log.length, Math.max(0, newStart - this.start));
    this.log.splice(0, n);
    this.start += n;
  }
}

// Strategy: which partition gets a message.
interface Partitioner { choose(key: string | null, numPartitions: number): number; }

// Java's String.hashCode (31*h + c, wrapped to 32 bits) so every language picks the same partition.
function javaHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
const floorMod = (a: number, n: number): number => ((a % n) + n) % n;   // JS % keeps the sign of a

class KeyHashPartitioner implements Partitioner {
  private roundRobin = 0;
  choose(key: string | null, n: number): number {
    if (key === null) return floorMod(this.roundRobin++, n);            // no key: spread evenly
    return floorMod(javaHash(key), n);                                  // same key -> same partition -> ordered
  }
}

class Topic {
  readonly partitions: Partition[] = [];
  constructor(readonly name: string, count: number) {
    for (let i = 0; i < count; i++) this.partitions.push(new Partition(i));
  }
}

// The broker owns topics and the committed offsets of every consumer group.
class Broker {
  private readonly topics = new Map<string, Topic>();
  private readonly committedOffsets = new Map<string, Map<string, number>>();   // group -> "topic-p" -> offset

  createTopic(name: string, partitions: number): Topic {
    let t = this.topics.get(name);
    if (t === undefined) { t = new Topic(name, partitions); this.topics.set(name, t); }
    return t;
  }
  topic(name: string): Topic {
    const t = this.topics.get(name);
    if (t === undefined) throw new Error("no topic " + name);
    return t;
  }
  append(topic: string, partition: number, key: string | null, value: string): RecordMetadata {
    const offset = this.topic(topic).partitions[partition].append(key, value);
    return { topic, partition, offset };
  }
  // Committed offset = "next offset this GROUP should read". Missing = never committed.
  commit(group: string, tp: TopicPartition, nextOffset: number): void {
    let offsets = this.committedOffsets.get(group);
    if (offsets === undefined) { offsets = new Map(); this.committedOffsets.set(group, offsets); }
    offsets.set(tpKey(tp), Math.max(offsets.get(tpKey(tp)) ?? nextOffset, nextOffset));   // never moves backwards
  }
  committed(group: string, tp: TopicPartition): number | undefined {
    return this.committedOffsets.get(group)?.get(tpKey(tp));
  }
}

class Producer {
  constructor(private readonly broker: Broker, private readonly partitioner: Partitioner) {}
  send(topic: string, key: string | null, value: string): RecordMetadata {
    const p = this.partitioner.choose(key, this.broker.topic(topic).partitions.length);
    return this.broker.append(topic, p, key, value);
  }
}

// Group coordinator: decides which member reads which partition (each partition -> exactly ONE member).
class ConsumerGroup {
  private members: GroupConsumer[] = [];
  constructor(readonly groupId: string, readonly topic: string, private readonly broker: Broker) {}

  join(consumerId: string): GroupConsumer {
    const c = new GroupConsumer(consumerId, this, this.broker);
    this.members.push(c);
    this.rebalance();
    return c;
  }
  leave(c: GroupConsumer): void {             // crash or shutdown
    this.members = this.members.filter((m) => m !== c);
    this.rebalance();
  }

  // Round-robin assignment; every member restarts from the COMMITTED offsets.
  private rebalance(): void {
    this.members.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    this.members.forEach((m) => m.clearAssignment());
    const n = this.broker.topic(this.topic).partitions.length;
    for (let p = 0; p < n && this.members.length > 0; p++)
      this.members[p % this.members.length].assign({ topic: this.topic, partition: p });
  }
}

class GroupConsumer {
  private readonly position = new Map<number, number>();   // partition -> next offset to read

  constructor(readonly id: string, private readonly group: ConsumerGroup, private readonly broker: Broker) {}

  clearAssignment(): void { this.position.clear(); }
  assign(tp: TopicPartition): void {
    const p = this.broker.topic(tp.topic).partitions[tp.partition];
    const start = this.broker.committed(this.group.groupId, tp) ?? p.startOffset();   // auto.offset.reset = earliest
    this.position.set(tp.partition, Math.max(start, p.startOffset()));              // committed offset may be expired
  }
  assignment(): TopicPartition[] {
    return [...this.position.keys()].sort((a, b) => a - b).map((partition) => ({ topic: this.group.topic, partition }));
  }

  // Pull model: the consumer asks for data at its own pace.
  poll(maxPerPartition: number): StoredMessage[] {
    const out: StoredMessage[] = [];
    for (const tp of this.assignment()) {
      const p = this.broker.topic(tp.topic).partitions[tp.partition];
      const batch = p.read(this.position.get(tp.partition)!, maxPerPartition);
      if (batch.length > 0) this.position.set(tp.partition, batch[batch.length - 1].offset + 1);   // advance local position
      out.push(...batch);
    }
    return out;
  }
  // At-least-once: call AFTER processing. A crash before this = those messages are re-read by someone.
  commitSync(): void {
    for (const [partition, next] of this.position) this.broker.commit(this.group.groupId, { topic: this.group.topic, partition }, next);
  }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";
const showTps = (tps: TopicPartition[]): string => show(tps.map(tpKey));

function main(): void {
  const broker = new Broker();
  broker.createTopic("orders", 3);
  const producer = new Producer(broker, new KeyHashPartitioner());
  const events: [string | null, string][] = [["u1", "login"], ["u2", "view"], ["u1", "cart"], ["u3", "view"],
    ["u2", "pay"], ["u1", "buy"], ["u3", "exit"], [null, "heartbeat"]];
  for (const [key, value] of events) {
    const md = producer.send("orders", key, value);
    console.log("sent " + (key ?? "null") + ":" + value + " -> p" + md.partition + "@" + md.offset);
  }

  const billing = new ConsumerGroup("billing", "orders", broker);
  const c1 = billing.join("c1");
  const c2 = billing.join("c2");
  console.log("c1 owns " + showTps(c1.assignment()) + ", c2 owns " + showTps(c2.assignment()));

  console.log("c1 polled " + show(c1.poll(2).map(showMessage)));
  c1.commitSync();
  console.log("c2 polled " + show(c2.poll(2).map(showMessage)) + "  ...and crashes before commit!");
  billing.leave(c2);                          // rebalance: c1 now owns all partitions
  const again = c1.poll(10);
  console.log("after rebalance c1 got " + again.length + " msgs (includes c2's uncommitted = redelivery)");
  c1.commitSync();

  // A second group reads the SAME data independently, from the beginning.
  const analytics = new ConsumerGroup("analytics", "orders", broker);
  const a1 = analytics.join("a1");
  console.log("analytics read " + a1.poll(100).length + " of 8 messages");

  // Retention deletes old messages; an expired committed offset jumps to the earliest kept one.
  broker.topic("orders").partitions[0].deleteBefore(1);
  console.log("p0 now starts at offset " + broker.topic("orders").partitions[0].startOffset());

  // Failure paths: reading a deleted offset, and a stale bookmark that points at a deleted message.
  try { broker.topic("orders").partitions[0].read(0, 5); }
  catch (e) { console.log("read p0@0: " + (e as Error).message); }
  broker.commit("audit", { topic: "orders", partition: 0 }, 0);
  const audit = new ConsumerGroup("audit", "orders", broker).join("x1");
  console.log("audit polled " + audit.poll(100).length + " of 8 (p0@0 was deleted, stale bookmark skipped ahead)");
  try { producer.send("payments", "u1", "x"); }
  catch (e) { console.log("send: " + (e as Error).message); }
}

main();`;
  var MQ_CORE_CPP = String.raw`
// ===== A Kafka-like, in-memory pub-sub log: topics, partitions, offsets, consumer groups =====

// One stored message. The offset is its permanent "page number" inside its partition.
struct StoredMessage {
    long long offset;
    optional<string> key;                     // empty = message without a key
    string value;
    long long timestamp;
};
string str(const StoredMessage& m) { return m.key.value_or("null") + ":" + m.value + "@" + to_string(m.offset); }

// Where a published message landed.
struct RecordMetadata {
    string topic;
    int partition;
    long long offset;
};

// Identifies one partition of one topic. The defaulted <=> makes it usable as a std::map key.
struct TopicPartition {
    string topic;
    int partition;
    auto operator<=>(const TopicPartition&) const = default;
};
string str(const TopicPartition& tp) { return tp.topic + "-" + to_string(tp.partition); }

// A partition = an append-only list. Messages are never changed, only appended (and old ones expired).
class Partition {
    vector<StoredMessage> log;
    long long start = 0;                      // first offset still kept after retention
    mutable mutex mu;
public:
    long long append(const optional<string>& key, const string& value) {
        lock_guard<mutex> lock(mu);
        long long offset = start + static_cast<long long>(log.size());            // next page number
        long long now = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
        log.push_back({offset, key, value, now});
        return offset;
    }

    // Read up to max messages starting AT fromOffset. Reading never deletes anything.
    vector<StoredMessage> read(long long fromOffset, int max) const {
        lock_guard<mutex> lock(mu);
        if (fromOffset < start) throw invalid_argument("offset " + to_string(fromOffset) + " already deleted");
        size_t from = static_cast<size_t>(fromOffset - start);
        size_t to = min(log.size(), from + max);
        if (from >= to) return {};
        return vector<StoredMessage>(log.begin() + from, log.begin() + to);       // a copy
    }

    long long startOffset() const { lock_guard<mutex> lock(mu); return start; }
    long long endOffset() const { lock_guard<mutex> lock(mu); return start + static_cast<long long>(log.size()); }   // next offset to write

    // Retention: drop everything before newStart (time/size based in real Kafka).
    void deleteBefore(long long newStart) {
        lock_guard<mutex> lock(mu);
        long long n = min<long long>(log.size(), max<long long>(0, newStart - start));
        log.erase(log.begin(), log.begin() + n);
        start += n;
    }
};

// Strategy: which partition gets a message.
class Partitioner {
public:
    virtual ~Partitioner() = default;
    virtual int choose(const optional<string>& key, int numPartitions) = 0;
};

// Java's String.hashCode (31*h + c, wrapped to 32 bits) so every language picks the same partition.
int32_t javaHash(const string& s) {
    uint32_t h = 0;                           // unsigned arithmetic wraps; signed overflow would be undefined
    for (unsigned char c : s) h = 31 * h + c;
    return static_cast<int32_t>(h);
}
int floorMod(long long a, int n) { return static_cast<int>(((a % n) + n) % n); }

class KeyHashPartitioner : public Partitioner {
    atomic<int> roundRobin{0};
public:
    int choose(const optional<string>& key, int n) override {
        if (!key) return floorMod(roundRobin++, n);       // no key: spread evenly
        return floorMod(javaHash(*key), n);                // same key -> same partition -> ordered
    }
};

class Topic {
public:
    const string name;
    vector<unique_ptr<Partition>> partitions;
    Topic(string n, int count) : name(move(n)) {
        for (int i = 0; i < count; i++) partitions.push_back(make_unique<Partition>());
    }
};

// The broker owns topics and the committed offsets of every consumer group.
class Broker {
    map<string, unique_ptr<Topic>> topics;
    map<string, map<TopicPartition, long long>> committedOffsets;
    mutable mutex mu;
public:
    Topic& createTopic(const string& name, int partitions) {
        lock_guard<mutex> lock(mu);
        auto& slot = topics[name];
        if (!slot) slot = make_unique<Topic>(name, partitions);
        return *slot;
    }
    Topic& topic(const string& name) {
        lock_guard<mutex> lock(mu);
        auto it = topics.find(name);
        if (it == topics.end()) throw invalid_argument("no topic " + name);
        return *it->second;
    }
    RecordMetadata append(const string& topicName, int partition, const optional<string>& key, const string& value) {
        long long off = topic(topicName).partitions[partition]->append(key, value);
        return {topicName, partition, off};
    }
    // Committed offset = "next offset this GROUP should read". Missing = never committed.
    void commit(const string& group, const TopicPartition& tp, long long nextOffset) {
        lock_guard<mutex> lock(mu);
        auto& offsets = committedOffsets[group];
        auto it = offsets.find(tp);
        if (it == offsets.end()) offsets[tp] = nextOffset;
        else it->second = max(it->second, nextOffset);    // never moves backwards
    }
    optional<long long> committed(const string& group, const TopicPartition& tp) const {
        lock_guard<mutex> lock(mu);
        auto g = committedOffsets.find(group);
        if (g == committedOffsets.end()) return nullopt;
        auto it = g->second.find(tp);
        if (it == g->second.end()) return nullopt;
        return it->second;
    }
};

class Producer {
    Broker& broker;
    Partitioner& partitioner;
public:
    Producer(Broker& b, Partitioner& p) : broker(b), partitioner(p) {}
    RecordMetadata send(const string& topic, const optional<string>& key, const string& value) {
        int p = partitioner.choose(key, static_cast<int>(broker.topic(topic).partitions.size()));
        return broker.append(topic, p, key, value);
    }
};

class ConsumerGroup;

class GroupConsumer {
    const ConsumerGroup& group;
    Broker& broker;
    map<int, long long> position;             // partition -> next offset to read (sorted by partition)
public:
    const string id;
    GroupConsumer(string i, const ConsumerGroup& g, Broker& b) : group(g), broker(b), id(move(i)) {}

    void clearAssignment() { position.clear(); }
    void assign(const TopicPartition& tp);
    vector<TopicPartition> assignment() const;

    // Pull model: the consumer asks for data at its own pace.
    vector<StoredMessage> poll(int maxPerPartition);
    // At-least-once: call AFTER processing. A crash before this = those messages are re-read by someone.
    void commitSync();
};

// Group coordinator: decides which member reads which partition (each partition -> exactly ONE member).
class ConsumerGroup {
    Broker& broker;
    vector<unique_ptr<GroupConsumer>> members;           // the group owns its consumers
    mutex mu;

    // Round-robin assignment; every member restarts from the COMMITTED offsets.
    void rebalance() {
        sort(members.begin(), members.end(), [](const auto& a, const auto& b) { return a->id < b->id; });
        for (auto& m : members) m->clearAssignment();
        int n = static_cast<int>(broker.topic(topic).partitions.size());
        for (int p = 0; p < n && !members.empty(); p++)
            members[p % members.size()]->assign({topic, p});
    }
public:
    const string groupId, topic;
    ConsumerGroup(string g, string t, Broker& b) : broker(b), groupId(move(g)), topic(move(t)) {}

    GroupConsumer& join(const string& consumerId) {
        lock_guard<mutex> lock(mu);
        members.push_back(make_unique<GroupConsumer>(consumerId, *this, broker));
        GroupConsumer& c = *members.back();
        rebalance();
        return c;
    }
    // Crash or shutdown. The member object is destroyed, so do not use its reference afterwards.
    void leave(GroupConsumer& c) {
        lock_guard<mutex> lock(mu);
        members.erase(remove_if(members.begin(), members.end(), [&](const auto& m) { return m.get() == &c; }), members.end());
        rebalance();
    }
};

void GroupConsumer::assign(const TopicPartition& tp) {
    Partition& p = *broker.topic(tp.topic).partitions[tp.partition];
    long long start = broker.committed(group.groupId, tp).value_or(p.startOffset());   // auto.offset.reset = earliest
    position[tp.partition] = max(start, p.startOffset());                              // committed offset may be expired
}
vector<TopicPartition> GroupConsumer::assignment() const {
    vector<TopicPartition> out;
    for (const auto& [partition, next] : position) out.push_back({group.topic, partition});
    return out;
}
vector<StoredMessage> GroupConsumer::poll(int maxPerPartition) {
    vector<StoredMessage> out;
    for (auto& [partition, next] : position) {
        Partition& p = *broker.topic(group.topic).partitions[partition];
        vector<StoredMessage> batch = p.read(next, maxPerPartition);
        if (!batch.empty()) next = batch.back().offset + 1;                            // advance local position
        out.insert(out.end(), batch.begin(), batch.end());
    }
    return out;
}
void GroupConsumer::commitSync() {
    for (const auto& [partition, next] : position) broker.commit(group.groupId, {group.topic, partition}, next);
}

template <class T>
string show(const vector<T>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + str(items[i]);
    return out + "]";
}

int main() {
    Broker broker;
    broker.createTopic("orders", 3);
    KeyHashPartitioner partitioner;
    Producer producer(broker, partitioner);
    vector<pair<optional<string>, string>> events = {{"u1", "login"}, {"u2", "view"}, {"u1", "cart"}, {"u3", "view"},
        {"u2", "pay"}, {"u1", "buy"}, {"u3", "exit"}, {nullopt, "heartbeat"}};
    for (const auto& [key, value] : events) {
        RecordMetadata md = producer.send("orders", key, value);
        cout << "sent " << key.value_or("null") << ":" << value << " -> p" << md.partition << "@" << md.offset << "\n";
    }

    ConsumerGroup billing("billing", "orders", broker);
    GroupConsumer& c1 = billing.join("c1");
    GroupConsumer& c2 = billing.join("c2");
    cout << "c1 owns " << show(c1.assignment()) << ", c2 owns " << show(c2.assignment()) << "\n";

    cout << "c1 polled " << show(c1.poll(2)) << "\n";
    c1.commitSync();
    cout << "c2 polled " << show(c2.poll(2)) << "  ...and crashes before commit!\n";
    billing.leave(c2);                        // rebalance: c1 now owns all partitions
    vector<StoredMessage> again = c1.poll(10);
    cout << "after rebalance c1 got " << again.size() << " msgs (includes c2's uncommitted = redelivery)\n";
    c1.commitSync();

    // A second group reads the SAME data independently, from the beginning.
    ConsumerGroup analytics("analytics", "orders", broker);
    GroupConsumer& a1 = analytics.join("a1");
    cout << "analytics read " << a1.poll(100).size() << " of 8 messages\n";

    // Retention deletes old messages; an expired committed offset jumps to the earliest kept one.
    broker.topic("orders").partitions[0]->deleteBefore(1);
    cout << "p0 now starts at offset " << broker.topic("orders").partitions[0]->startOffset() << "\n";

    // Failure paths: reading a deleted offset, and a stale bookmark that points at a deleted message.
    try { broker.topic("orders").partitions[0]->read(0, 5); }
    catch (const invalid_argument& e) { cout << "read p0@0: " << e.what() << "\n"; }
    broker.commit("audit", {"orders", 0}, 0);
    ConsumerGroup auditGroup("audit", "orders", broker);
    GroupConsumer& audit = auditGroup.join("x1");
    cout << "audit polled " << audit.poll(100).size() << " of 8 (p0@0 was deleted, stale bookmark skipped ahead)\n";
    try { producer.send("payments", "u1", "x"); }
    catch (const invalid_argument& e) { cout << "send: " << e.what() << "\n"; }
}`;

  var MQ_NODES = [
    B('PR', 'Producer', 10, 8, 14), B('PT', 'Partitioner «strategy»', 10, 32, 22), B('BR', 'Broker', 38, 8, 14), B('TP', 'Topic', 62, 8, 12), B('PA', 'Partition (append-only log)', 88, 8, 24),
    B('SM', 'StoredMessage(offset,key,value)', 86, 32, 28), B('OF', 'committed offsets: group → (tp → next)', 50, 32, 30),
    B('CG', 'ConsumerGroup (coordinator)', 30, 58, 26), B('GC', 'GroupConsumer (position map)', 66, 58, 28)
  ];
  var MQ_EDGES = [['PR', 'PT', 'asks partition'], ['PR', 'BR', 'send'], ['BR', 'TP', 'owns'], ['TP', 'PA', '1..N'], ['PA', 'SM', 'holds'], ['BR', 'OF', 'stores'],
    ['CG', 'GC', 'assigns partitions'], ['GC', 'PA', 'poll(from offset)'], ['GC', 'OF', 'commit']];

  function mqClassViz() {
    return classTour('Pub-sub log — class diagram', MQ_NODES, MQ_EDGES, [
      { narr: 'Big picture: <b>producers append</b>, <b>consumers read by offset</b>, the <b>broker</b> keeps the logs and the bookmarks. Nothing is deleted when it is read — that is the key difference from a classic queue.', on: [] },
      { narr: '<b>Producer + Partitioner (Strategy)</b>: the partitioner picks the partition. With a key: <code>hash(key) % N</code>, so all events of user u1 land in the same partition and stay <b>in order</b>. Without a key: spread round-robin.', on: ['PR', 'PT'], edges: ['PR-PT', 'PR-BR'],
        code: 'int choose(String key, int n) {\n  if (key == null) return floorMod(rr.getAndIncrement(), n);\n  return floorMod(key.hashCode(), n);\n}', codeHl: { 3: 'ok' } },
      { narr: '<b>Topic → Partitions</b>. A topic is just a name for N partitions. Each <b>Partition</b> is an append-only list; a message\'s position is its <b>offset</b> (0, 1, 2, …), unique only <i>within</i> that partition.', on: ['BR', 'TP', 'PA', 'SM'], edges: ['BR-TP', 'TP-PA', 'PA-SM'],
        code: 'synchronized long append(String key, String value) {\n  long offset = startOffset + log.size();\n  log.add(new StoredMessage(offset, key, value, now));\n  return offset;\n}', codeHl: { 2: 'cur', 3: 'ok' } },
      { narr: '<b>ConsumerGroup</b> = a team sharing the work. The coordinator gives each partition to <b>exactly one</b> member, so members never step on each other and order per partition is kept. Join/leave triggers a <b>rebalance</b>.', on: ['CG', 'GC'], edges: ['CG-GC'] },
      { narr: '<b>GroupConsumer.poll()</b> reads from its local <b>position</b> and moves the position forward. It is a <b>pull</b> model: slow consumers simply fall behind (this is called <b>lag</b>) instead of being flooded.', on: ['GC', 'PA'], edges: ['GC-PA'],
        code: 'List<StoredMessage> batch = p.read(position, max);\nif (!batch.isEmpty())\n  position = lastOffset + 1;   // local only!', codeHl: { 1: 'cur', 3: 'ok' } },
      { narr: '<b>Committed offsets</b> live in the broker, per <b>group</b>. Position = "where I am"; committed = "where the group restarts after a crash". The gap between them is exactly what gets <b>re-delivered</b>.', on: ['OF', 'GC'], edges: ['GC-OF', 'BR-OF'], cls: 'sel',
        table: { label: 'Three offsets to know', cols: ['Name', 'Owner', 'Meaning'], rows: [['log-end offset', 'partition', 'next offset a producer will write'], ['position', 'consumer (memory)', 'next offset this consumer will read'], ['committed', 'broker, per group', 'restart point after crash/rebalance'], ['lag', 'derived', 'log-end − committed']] } }
    ], 68);
  }

  // simple deterministic hash so learners can verify by hand: sum of char codes
  function mqHash(k) { var s = 0; for (var i = 0; i < k.length; i++) s += k.charCodeAt(i); return s; }

  function mqFlowViz(input) {
    var s = String(input === undefined ? '' : input);
    var P = 3, C = 2, m;
    if ((m = s.match(/P\s*=\s*(\d+)/i))) P = +m[1];
    if ((m = s.match(/C\s*=\s*(\d+)/i))) C = +m[1];
    if (P < 1 || P > 4) throw new Error('P (partitions) must be 1..4');
    if (C < 1 || C > 4) throw new Error('C (consumers) must be 1..4');
    var msgText = s.replace(/[PC]\s*=\s*\d+\s*;?/gi, '').trim();
    var msgs = msgText.split(/\s+/).filter(function (x) { return x; }).map(function (x) { var q = x.split(':'); if (q.length !== 2 || !q[0] || !q[1]) throw new Error('Messages look like key:value, e.g. u1:login u2:view'); return { k: q[0].slice(0, 6), v: q[1].slice(0, 8) }; });
    if (msgs.length < 2) throw new Error('Give at least 2 messages, e.g. "P=3; C=2; u1:login u2:view u1:buy"');
    if (msgs.length > 12) throw new Error('Use at most 12 messages');
    var parts = []; for (var p = 0; p < P; p++) parts.push([]);
    var frames = [], hl = {};
    var rowHead = parts.map(function (_, i) { return 'P' + i; });
    function grid(label, hlx) {
      var w = Math.max(1, Math.max.apply(null, parts.map(function (r) { return r.length; })));
      var rows = parts.map(function (r) { var o = []; for (var i = 0; i < w; i++) o.push(r[i] ? r[i].k + ':' + r[i].v : ''); return o; });
      var col = []; for (var i = 0; i < w; i++) col.push('off ' + i);
      return GRID(label || 'Topic "orders" — rows = partitions, columns = offsets', rows, rowHead, col, hlx || {});
    }
    frames.push(F('Topic <b>orders</b> with <b>' + P + '</b> partitions, all empty. Each partition is an append-only list; the column number is the <b>offset</b>. Partitioner rule (simplified so you can check by hand): <code>partition = (sum of char codes of key) % ' + P + '</code>.', [grid(), TXT('Real Kafka uses <b>murmur2(key) % N</b>; the idea is identical.')]));
    msgs.forEach(function (mm) {
      var h = mqHash(mm.k), pi = h % P, off = parts[pi].length;
      parts[pi].push(mm);
      frames.push(F('Producer sends <b>' + esc(mm.k) + ':' + esc(mm.v) + '</b>. hash("' + esc(mm.k) + '") = ' + h + ', ' + h + ' % ' + P + ' = <b>P' + pi + '</b>. It is appended at the end → <b>offset ' + off + '</b>. Same key always lands in the same partition, so its events stay in order.', [grid(null, one(pi + ',' + off, 'ok')), VARS('send()', { key: mm.k, hash: h, partition: 'P' + pi, offset: off }, { partition: 'ok', offset: 'ok' })]));
    });
    // consumer group state
    var members = []; for (var c = 1; c <= C; c++) members.push('c' + c);
    var committed = {}, pos = {}, owner = {}, processed = {}, seenBy = {};
    for (p = 0; p < P; p++) { committed[p] = 0; processed[p] = 0; }
    function assign() {
      owner = {};
      for (var p = 0; p < P; p++) { owner[p] = members[p % members.length]; pos[p] = committed[p]; }
    }
    function assignEntries() { return members.map(function (mb) { var ps = []; for (var p = 0; p < P; p++) if (owner[p] === mb) ps.push('P' + p); return [mb, ps.length ? ps.join(', ') : '(idle — more consumers than partitions)']; }); }
    function offsetEntries() { var e = []; for (var p = 0; p < P; p++) e.push(['P' + p, 'position ' + pos[p] + ' | committed ' + committed[p] + ' | end ' + parts[p].length]); return e; }
    assign();
    frames.push(F('Consumer group <b>billing</b> starts with ' + C + ' member(s). <b>Rebalance</b>: partitions are dealt round-robin, and each partition goes to <b>exactly one</b> member. Everyone starts at the <b>committed</b> offset (0 — nothing committed yet).' + (C > P ? ' ' + H.c('y', 'More consumers than partitions → some sit idle!') : ''), [grid(), MAP('assignment', assignEntries()), MAP('offsets per partition', offsetEntries())]));
    function pollRound(who, maxPer, tag) {
      var hlx = {}, got = [];
      for (var p = 0; p < P; p++) {
        if (owner[p] !== who) continue;
        for (var k = 0; k < maxPer && pos[p] < parts[p].length; k++) {
          var off = pos[p], dup = seenBy[p + ',' + off];
          hlx[p + ',' + off] = dup ? 'bad' : 'win';
          got.push(parts[p][off].k + ':' + parts[p][off].v + '@P' + p + '/' + off + (dup ? ' (AGAIN!)' : ''));
          seenBy[p + ',' + off] = true;
          pos[p]++;
        }
      }
      return { hl: hlx, got: got };
    }
    var crashing = C >= 2 ? members[members.length - 1] : null;
    members.forEach(function (mb) {
      var r = pollRound(mb, 2);
      frames.push(F('<b>' + mb + '.poll(max 2 per partition)</b> reads from its own position and moves the position forward. Reading does NOT delete anything — another group could read the same cells.' + (r.got.length ? '' : ' Nothing to read.'), [grid(null, r.hl), QUEUE(mb + ' got', r.got.length ? r.got : ['(nothing)'], {}, 'first', 'last'), MAP('offsets per partition', offsetEntries())]));
    });
    // commits
    var cm = {};
    members.forEach(function (mb) { if (mb === crashing) return; for (var p = 0; p < P; p++) if (owner[p] === mb) { committed[p] = pos[p]; cm['P' + p] = 'ok'; } });
    frames.push(F((crashing ? 'Everyone except <b>' + crashing + '</b> processes the batch and calls <code>commitSync()</code>: committed = position. ' + H.c('r', crashing + ' crashes after processing but BEFORE committing.') : 'c1 processes the batch and commits: committed = position.'), [grid(), MAP('offsets per partition', offsetEntries(), cm)]));
    if (crashing) {
      members = members.filter(function (x) { return x !== crashing; });
      assign();
      frames.push(F('The coordinator notices ' + crashing + ' is gone (no heartbeat) → <b>rebalance</b>. Its partitions move to the survivors, who start at the <b>committed</b> offset, not at ' + crashing + '\'s lost in-memory position.', [grid(), MAP('assignment', assignEntries()), MAP('offsets per partition', offsetEntries())]));
    }
    // drain
    var guard = 0, any = true;
    while (any && guard++ < 6) {
      any = false;
      members.forEach(function (mb) {
        var r = pollRound(mb, 3);
        if (!r.got.length) return;
        any = true;
        var dups = r.got.filter(function (g) { return g.indexOf('AGAIN') >= 0; }).length;
        frames.push(F('<b>' + mb + '.poll()</b> continues. ' + (dups ? H.c('r', dups + ' message(s) delivered a SECOND time') + ' — they were processed by the crashed consumer but never committed. This is <b>at-least-once</b> delivery: make processing idempotent (e.g. dedupe by order id).' : 'Fresh messages only.'), [grid(null, r.hl), QUEUE(mb + ' got', r.got, {}, 'first', 'last'), MAP('offsets per partition', offsetEntries())]));
        for (var p = 0; p < P; p++) if (owner[p] === mb) committed[p] = pos[p];
      });
    }
    var lag = []; for (p = 0; p < P; p++) lag.push(['P' + p, parts[p].length, committed[p], parts[p].length - committed[p]]);
    frames.push(F('All caught up and committed. <b>Lag</b> = log-end offset − committed offset = 0 everywhere. Monitoring lag per partition is how teams know a consumer is too slow.', [grid(), TABLE('Consumer lag for group billing', ['partition', 'log-end', 'committed', 'lag'], lag)]));
    var an = []; for (p = 0; p < P; p++) an.push(['P' + p, 'committed 0 (never read)']);
    frames.push(F('A second group, <b>analytics</b>, subscribes now. It has its <b>own</b> committed offsets, so it reads every message from offset 0 — independent of billing. One log, many readers: that is publish-subscribe.', [grid(), MAP('billing offsets', offsetEntries()), MAP('analytics offsets', an, { P0: 'ok' })]));
    return frames;
  }

  topics.push({
    title: 'Kafka-like Pub-Sub Queue: Topics, Partitions, Offsets & Consumer Groups',
    analogy: `<p>Picture a <b>library of notebooks</b>. Each <b>topic</b> ("orders", "payments") is a shelf. On each shelf there are a few <b>notebooks (partitions)</b>. Writers only ever add a new line at the <b>end</b> of a notebook, and every line has a printed <b>line number (offset)</b>. Nobody tears pages out when they read.</p><p>Readers use <b>bookmarks</b>. A <b>team of readers (consumer group)</b> splits the notebooks between them — Asha reads notebook 0 and 2, Ben reads notebook 1 — and the team keeps <b>one shared bookmark per notebook</b> at the front desk. A completely different team (analytics) has its <b>own</b> bookmarks, so both teams read the same notebooks without disturbing each other. If Ben goes home sick, Asha picks up his notebook from the team\'s last bookmark.</p>`,
    explain: `<p><b>What is different from a normal queue?</b> In a classic queue (like a ticket counter line) a message is <b>removed</b> once someone takes it. In a Kafka-style log, messages <b>stay</b>; each reader just remembers <b>how far it has read</b>. That one change gives you replay, many independent readers, and ordering.</p>
${H.table(['Word', 'Plain meaning'], [
  ['<b>Topic</b>', 'A named stream of messages, e.g. <code>orders</code>.'],
  ['<b>Partition</b>', 'One append-only list inside a topic. More partitions = more parallel readers.'],
  ['<b>Offset</b>', 'The position number of a message inside its partition: 0, 1, 2…'],
  ['<b>Key</b>', 'Optional label (e.g. user id). Same key → same partition → kept in order.'],
  ['<b>Consumer group</b>', 'A team sharing the work. Each partition is read by exactly ONE member of a group.'],
  ['<b>Committed offset</b>', 'The group\'s saved bookmark: "next message to read after a restart".'],
  ['<b>Lag</b>', 'How far behind a group is: last offset written − committed offset.']
])}
<p><b>The flow:</b> ${H.arr(['producer.send(key, value)', 'partition = hash(key) % N', 'append → offset', 'consumer.poll()', 'process', 'commit offset'], { hl: { 1: 'y', 2: 'g', 3: 'b', 5: 'p' }, idx: false })}</p>
<p><b>The naive design (brute force) and why it breaks:</b> "one <code>Queue&lt;String&gt;</code> per subscriber; <code>publish()</code> loops over subscribers and pushes a copy (or calls them directly)". Problems: ${H.c('r', 'memory × number of subscribers')}, ${H.c('r', 'a slow or crashing subscriber blocks the publisher')} (if delivery is synchronous), ${H.c('r', 'no replay')} (once taken, gone), ${H.c('r', 'no way to split one subscriber\'s work over several machines')} without losing order. The log + offsets design fixes all four: one shared copy, readers pull at their own speed, replay = move the bookmark back, and partitions give parallelism while keeping per-key order.</p>
<p><b>Classes for the interview (the visualizer shows them):</b> <code>Broker</code>, <code>Topic</code>, <code>Partition</code>, <code>StoredMessage</code>, <code>Producer</code> + <code>Partitioner</code> (Strategy), <code>ConsumerGroup</code> (coordinator, rebalancing), <code>GroupConsumer</code> (position map, poll, commit). Keep <b>committed offsets in the broker</b> (keyed by group + topic + partition) so a replacement consumer can continue.</p>
<p><b>Delivery guarantees come from WHEN you commit:</b> commit <i>before</i> processing → <b>at-most-once</b> (a crash loses messages). Commit <i>after</i> processing → <b>at-least-once</b> (a crash re-delivers; make processing idempotent). <b>Exactly-once</b> needs extra machinery (idempotent producer + transactions, or storing the offset atomically with the result).</p>`,
    clues: [
      '"Design a message queue / pub-sub like Kafka" or "multiple subscribers must each get every message" → log + per-subscriber (per-group) offsets.',
      '"Subscribers should be able to replay / reset offset" → messages are not deleted on read; offset is just a number.',
      '"Events for the same user/order must be processed in order" → partition by key.',
      '"Scale consumers horizontally" → consumer group, one partition per member, partitions = max parallelism.',
      '"No message should be lost even if a consumer crashes" → commit after processing (at-least-once) + idempotent handler.',
      '"Slow consumers must not affect producers" → pull model, bounded retention, lag monitoring.',
      '"Messages older than 7 days can be deleted" → retention by time/size; reset policy (earliest/latest) for expired offsets.'
    ],
    code: [{ lang: 'java', code: MQ_CORE, alt: [{ lang: 'python', code: MQ_CORE_PY }, { lang: 'ts', code: MQ_CORE_TS }, { lang: 'cpp', code: MQ_CORE_CPP },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

// ===== A Kafka-like, in-memory pub-sub log: topics, partitions, offsets, consumer groups =====

// One stored message. The offset is its permanent "page number" inside its partition.
sealed class StoredMessage {
    public readonly long Offset; public readonly string Key, Value; public readonly long Timestamp;
    public StoredMessage(long offset, string key, string value, long timestamp) { Offset = offset; Key = key; Value = value; Timestamp = timestamp; }
    public override string ToString() { return (Key ?? "null") + ":" + Value + "@" + Offset; }   // short form for printing
}

// Where a published message landed.
sealed class RecordMetadata {
    public readonly string Topic; public readonly int Partition; public readonly long Offset;
    public RecordMetadata(string topic, int partition, long offset) { Topic = topic; Partition = partition; Offset = offset; }
}

// Identifies one partition of one topic (used as a map key for offsets).
sealed class TopicPartition : IEquatable<TopicPartition> {
    public readonly string Topic; public readonly int Partition;
    public TopicPartition(string topic, int partition) { Topic = topic; Partition = partition; }
    public bool Equals(TopicPartition o) { return o != null && o.Topic == Topic && o.Partition == Partition; }
    public override bool Equals(object o) { return Equals(o as TopicPartition); }
    public override int GetHashCode() { return Topic.GetHashCode() * 31 + Partition; }
    public override string ToString() { return Topic + "-" + Partition; }   // short form for printing
}

// A partition = an append-only list. Messages are never changed, only appended (and old ones expired).
class Partition {
    private readonly int id;
    private readonly List<StoredMessage> log = new List<StoredMessage>();
    private long startOffset = 0;               // first offset still kept after retention
    private readonly object gate = new object();

    public Partition(int id) { this.id = id; }
    public int Id() { return id; }

    public long Append(string key, string value) {
        lock (gate) {
            long offset = startOffset + log.Count; // next page number
            log.Add(new StoredMessage(offset, key, value, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));
            return offset;
        }
    }

    // Read up to max messages starting AT fromOffset. Reading never deletes anything.
    public List<StoredMessage> Read(long fromOffset, int max) {
        lock (gate) {
            if (fromOffset < startOffset) throw new ArgumentException("offset " + fromOffset + " already deleted");
            int from = (int)(fromOffset - startOffset);
            int to = Math.Min(log.Count, from + max);
            return from >= to ? new List<StoredMessage>() : log.GetRange(from, to - from);
        }
    }

    public long StartOffset() { lock (gate) return startOffset; }
    public long EndOffset() { lock (gate) return startOffset + log.Count; }   // "log-end offset": next offset to write

    // Retention: drop everything before newStart (time/size based in real Kafka).
    public void DeleteBefore(long newStart) {
        lock (gate) {
            int n = (int)Math.Min(log.Count, Math.Max(0, newStart - startOffset));
            log.RemoveRange(0, n);
            startOffset += n;
        }
    }
}

// Strategy: which partition gets a message.
interface IPartitioner { int Choose(string key, int numPartitions); }

class KeyHashPartitioner : IPartitioner {
    private int roundRobin = -1;
    static int FloorMod(int a, int n) { int r = a % n; return r < 0 ? r + n : r; }
    static int StableHash(string s) { int h = 0; foreach (char c in s) h = unchecked(31 * h + c); return h; }   // same on every run and machine
    public int Choose(string key, int n) {
        if (key == null) return FloorMod(Interlocked.Increment(ref roundRobin), n);   // no key: spread evenly
        return FloorMod(StableHash(key), n);                                          // same key -> same partition -> ordered
    }
}

class Topic {
    public readonly string Name;
    public readonly List<Partition> Partitions = new List<Partition>();
    public Topic(string name, int count) {
        Name = name;
        for (int i = 0; i < count; i++) Partitions.Add(new Partition(i));
    }
}

// The broker owns topics and the committed offsets of every consumer group.
class Broker {
    private readonly ConcurrentDictionary<string, Topic> topics = new ConcurrentDictionary<string, Topic>();
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<TopicPartition, long>> committed = new ConcurrentDictionary<string, ConcurrentDictionary<TopicPartition, long>>();

    public Topic CreateTopic(string name, int partitions) { return topics.GetOrAdd(name, n => new Topic(n, partitions)); }
    public Topic TopicOf(string name) {
        Topic t;
        if (!topics.TryGetValue(name, out t)) throw new ArgumentException("no topic " + name);
        return t;
    }
    public RecordMetadata Append(string topic, int partition, string key, string value) {
        long off = TopicOf(topic).Partitions[partition].Append(key, value);
        return new RecordMetadata(topic, partition, off);
    }
    // Committed offset = "next offset this GROUP should read". Missing = never committed.
    public void Commit(string group, TopicPartition tp, long nextOffset) {
        committed.GetOrAdd(group, g => new ConcurrentDictionary<TopicPartition, long>()).AddOrUpdate(tp, nextOffset, (k, old) => Math.Max(old, nextOffset));
    }
    public long? Committed(string group, TopicPartition tp) {
        ConcurrentDictionary<TopicPartition, long> m; long v;
        return committed.TryGetValue(group, out m) && m.TryGetValue(tp, out v) ? v : (long?)null;
    }
}

class Producer {
    private readonly Broker broker;
    private readonly IPartitioner partitioner;
    public Producer(Broker broker, IPartitioner partitioner) { this.broker = broker; this.partitioner = partitioner; }
    public RecordMetadata Send(string topic, string key, string value) {
        int p = partitioner.Choose(key, broker.TopicOf(topic).Partitions.Count);
        return broker.Append(topic, p, key, value);
    }
}

// Group coordinator: decides which member reads which partition (each partition -> exactly ONE member).
class ConsumerGroup {
    public readonly string GroupId;
    public readonly string Topic;
    private readonly Broker broker;
    private readonly List<GroupConsumer> members = new List<GroupConsumer>();
    private readonly object gate = new object();
    public ConsumerGroup(string groupId, string topic, Broker broker) { GroupId = groupId; Topic = topic; this.broker = broker; }

    public GroupConsumer Join(string consumerId) {
        lock (gate) {
            GroupConsumer c = new GroupConsumer(consumerId, this, broker);
            members.Add(c);
            Rebalance();
            return c;
        }
    }
    public void Leave(GroupConsumer c) { lock (gate) { members.Remove(c); Rebalance(); } }   // crash or shutdown

    // Round-robin assignment; every member restarts from the COMMITTED offsets.
    private void Rebalance() {
        members.Sort((a, b) => string.CompareOrdinal(a.Id, b.Id));
        foreach (GroupConsumer m in members) m.ClearAssignment();
        int n = broker.TopicOf(Topic).Partitions.Count;
        for (int p = 0; p < n && members.Count > 0; p++)
            members[p % members.Count].Assign(new TopicPartition(Topic, p));
    }
}

class GroupConsumer {
    public readonly string Id;
    private readonly ConsumerGroup group;
    private readonly Broker broker;
    private readonly SortedDictionary<int, KeyValuePair<TopicPartition, long>> position = new SortedDictionary<int, KeyValuePair<TopicPartition, long>>();   // by partition number

    public GroupConsumer(string id, ConsumerGroup group, Broker broker) { Id = id; this.group = group; this.broker = broker; }

    public void ClearAssignment() { position.Clear(); }
    public void Assign(TopicPartition tp) {
        Partition p = broker.TopicOf(tp.Topic).Partitions[tp.Partition];
        long start = broker.Committed(group.GroupId, tp) ?? p.StartOffset();          // auto.offset.reset = earliest
        position[tp.Partition] = new KeyValuePair<TopicPartition, long>(tp, Math.Max(start, p.StartOffset()));   // committed offset may be expired
    }
    public List<TopicPartition> Assignment() { return position.Values.Select(kv => kv.Key).ToList(); }

    // Pull model: the consumer asks for data at its own pace.
    public List<StoredMessage> Poll(int maxPerPartition) {
        List<StoredMessage> result = new List<StoredMessage>();
        foreach (int k in position.Keys.ToList()) {
            var e = position[k];
            Partition p = broker.TopicOf(e.Key.Topic).Partitions[e.Key.Partition];
            List<StoredMessage> batch = p.Read(e.Value, maxPerPartition);
            if (batch.Count > 0) position[k] = new KeyValuePair<TopicPartition, long>(e.Key, batch[batch.Count - 1].Offset + 1);   // advance local position
            result.AddRange(batch);
        }
        return result;
    }
    // At-least-once: call AFTER processing. A crash before this = those messages are re-read by someone.
    public void CommitSync() { foreach (var e in position.Values) broker.Commit(group.GroupId, e.Key, e.Value); }
}

class PubSubDemo {
    static string L<T>(IEnumerable<T> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        Broker broker = new Broker();
        broker.CreateTopic("orders", 3);
        Producer producer = new Producer(broker, new KeyHashPartitioner());
        string[][] events = { new[] { "u1", "login" }, new[] { "u2", "view" }, new[] { "u1", "cart" }, new[] { "u3", "view" },
                              new[] { "u2", "pay" }, new[] { "u1", "buy" }, new[] { "u3", "exit" }, new[] { null, "heartbeat" } };
        foreach (string[] ev in events) {
            RecordMetadata md = producer.Send("orders", ev[0], ev[1]);
            Console.WriteLine("sent " + (ev[0] ?? "null") + ":" + ev[1] + " -> p" + md.Partition + "@" + md.Offset);
        }

        ConsumerGroup billing = new ConsumerGroup("billing", "orders", broker);
        GroupConsumer c1 = billing.Join("c1");
        GroupConsumer c2 = billing.Join("c2");
        Console.WriteLine("c1 owns " + L(c1.Assignment()) + ", c2 owns " + L(c2.Assignment()));

        Console.WriteLine("c1 polled " + L(c1.Poll(2)));
        c1.CommitSync();
        Console.WriteLine("c2 polled " + L(c2.Poll(2)) + "  ...and crashes before commit!");
        billing.Leave(c2);                                   // rebalance: c1 now owns all partitions
        List<StoredMessage> again = c1.Poll(10);
        Console.WriteLine("after rebalance c1 got " + again.Count + " msgs (includes c2's uncommitted = redelivery)");
        c1.CommitSync();

        // A second group reads the SAME data independently, from the beginning.
        ConsumerGroup analytics = new ConsumerGroup("analytics", "orders", broker);
        GroupConsumer a1 = analytics.Join("a1");
        Console.WriteLine("analytics read " + a1.Poll(100).Count + " of 8 messages");

        // Retention deletes old messages; an expired committed offset jumps to the earliest kept one.
        broker.TopicOf("orders").Partitions[0].DeleteBefore(1);
        Console.WriteLine("p0 now starts at offset " + broker.TopicOf("orders").Partitions[0].StartOffset());

        // Failure paths: reading a deleted offset, and a stale bookmark that points at a deleted message.
        try { broker.TopicOf("orders").Partitions[0].Read(0, 5); }
        catch (ArgumentException e) { Console.WriteLine("read p0@0: " + e.Message); }
        broker.Commit("audit", new TopicPartition("orders", 0), 0);
        GroupConsumer audit = new ConsumerGroup("audit", "orders", broker).Join("x1");
        Console.WriteLine("audit polled " + audit.Poll(100).Count + " of 8 (p0@0 was deleted, stale bookmark skipped ahead)");
        try { producer.Send("payments", "u1", "x"); }
        catch (ArgumentException e) { Console.WriteLine("send: " + e.Message); }
    }
}` }] }],
    codeTitle: ['Complete in-memory pub-sub log — partitions, key partitioner, broker-stored offsets, consumer group rebalance, retention (runnable main)'],
    viz: [
      { title: 'Class diagram tour: producer → broker → partitions ← consumer groups', gen: function () { return mqClassViz(); } },
      { title: 'Partitions & offsets: produce, poll, commit, crash, rebalance, re-delivery', input: 'P=3; C=2; u1:login u2:view u1:cart u3:view u2:pay u1:buy u3:exit u2:refund', inputLabel: 'P=partitions(1-4); C=consumers(1-4); then key:value messages', gen: mqFlowViz }
    ],
    examples: [
      { title: 'Ordering per key (and how adding partitions breaks it)', html: `<p>3 partitions, keys hashed with our hand rule (sum of char codes % 3): u1 → P1, u2 → P2, u3 → P0. Events <code>u1:login, u1:cart, u1:buy</code> sit at offsets 0, 1, 2 of P1, so one consumer reads them in exactly that order.</p>
${H.table(['Key', 'hash', '% 3', '% 4'], [['u1', '166', 'P1', H.c('r', 'P2')], ['u2', '167', 'P2', H.c('r', 'P3')], ['u3', '168', 'P0', 'P0']])}
<p>Increase to 4 partitions and u1\'s <b>new</b> events go to P2 while old ones are in P1. Two different consumers may now process u1\'s events at the same time — ${H.c('r', 'order is broken during the change')}. That is why Kafka partition counts are planned up front, and why "add partitions" is a classic follow-up.</p>` },
      { title: 'Two consumer groups, one log', html: `<p><b>billing</b> and <b>analytics</b> both subscribe to <code>orders</code>. Billing is at offset 50 on P0, analytics is at offset 12 (it is slower). Neither affects the other; the broker stores one copy of the data and two bookmarks.</p>${H.kv([['billing / P0', '50'], ['analytics / P0', '12'], ['log-end P0', '57']], { label: 'committed offsets' })}<p>Lag: billing 7, analytics 45. A new team "fraud" can join tomorrow and read from offset 0 (<code>earliest</code>) or only new data (<code>latest</code>).</p>` },
      { title: 'More consumers than partitions', html: `<p>Topic with 3 partitions, group with 5 consumers: c1→P0, c2→P1, c3→P2, ${H.c('y', 'c4 and c5 idle')}. The partition count is the <b>ceiling on parallelism</b> inside one group. Rule of thumb in interviews: choose partitions ≥ the max consumers you expect, but not thousands (each costs files, memory and rebalance time).</p>` },
      { title: 'At-least-once + idempotent consumer = effectively once', html: `<p>Commit after processing; if the same message comes twice, skip it using a store of processed ids. In real systems the "processed ids" check and the side effect are written in the <b>same database transaction</b>.</p>`, code: { lang: 'java', code: String.raw`
record Event(String orderId, int amount) { }

class IdempotentBilling {
    private final Set<String> processed = new HashSet<>();   // in production: a DB table with a unique key
    private int totalCharged = 0;

    void handle(Event e) {
        if (!processed.add(e.orderId())) {                   // add() returns false if already present
            System.out.println("skip duplicate " + e.orderId());
            return;
        }
        totalCharged += e.amount();
    }

    public static void main(String[] args) {
        IdempotentBilling b = new IdempotentBilling();
        b.handle(new Event("o1", 100));
        b.handle(new Event("o2", 50));
        b.handle(new Event("o1", 100));                      // re-delivered after a crash
        System.out.println("charged = " + b.totalCharged);   // 150, not 250
    }
}`,
        alt: [
          { lang: 'python', code: String.raw`
from dataclasses import dataclass


@dataclass(frozen=True)
class Event:
    order_id: str
    amount: int


class IdempotentBilling:
    def __init__(self) -> None:
        self._processed: set[str] = set()        # in production: a DB table with a unique key
        self.total_charged = 0

    def handle(self, e: Event) -> None:
        if e.order_id in self._processed:        # already seen: a re-delivery
            print(f"skip duplicate {e.order_id}")
            return
        self._processed.add(e.order_id)
        self.total_charged += e.amount


b = IdempotentBilling()
b.handle(Event("o1", 100))
b.handle(Event("o2", 50))
b.handle(Event("o1", 100))                       # re-delivered after a crash
print("charged =", b.total_charged)              # 150, not 250` },
          { lang: 'ts', code: String.raw`
interface OrderEvent { readonly orderId: string; readonly amount: number; }

class IdempotentBilling {
  private readonly processed = new Set<string>();   // in production: a DB table with a unique key
  totalCharged = 0;

  handle(e: OrderEvent): void {
    if (this.processed.has(e.orderId)) {            // already seen: a re-delivery
      console.log("skip duplicate " + e.orderId);
      return;
    }
    this.processed.add(e.orderId);
    this.totalCharged += e.amount;
  }
}

const b = new IdempotentBilling();
b.handle({ orderId: "o1", amount: 100 });
b.handle({ orderId: "o2", amount: 50 });
b.handle({ orderId: "o1", amount: 100 });           // re-delivered after a crash
console.log("charged = " + b.totalCharged);         // 150, not 250` },
          { lang: 'cpp', code: String.raw`
struct Event {
    string orderId;
    int amount;
};

class IdempotentBilling {
    unordered_set<string> processed;                // in production: a DB table with a unique key
    int totalCharged_ = 0;
public:
    void handle(const Event& e) {
        if (!processed.insert(e.orderId).second) {  // insert() reports false if already present
            cout << "skip duplicate " << e.orderId << "\n";
            return;
        }
        totalCharged_ += e.amount;
    }
    int totalCharged() const { return totalCharged_; }
};

int main() {
    IdempotentBilling b;
    b.handle({"o1", 100});
    b.handle({"o2", 50});
    b.handle({"o1", 100});                          // re-delivered after a crash
    cout << "charged = " << b.totalCharged() << "\n";   // 150, not 250
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Event { public readonly string OrderId; public readonly int Amount; public Event(string o, int a) { OrderId = o; Amount = a; } }

class IdempotentBilling {
    private readonly HashSet<string> processed = new HashSet<string>();   // in production: a DB table with a unique key
    private int totalCharged = 0;

    public void Handle(Event e) {
        if (!processed.Add(e.OrderId)) {                     // Add() returns false if already present
            Console.WriteLine("skip duplicate " + e.OrderId);
            return;
        }
        totalCharged += e.Amount;
    }

    static void Main() {
        IdempotentBilling b = new IdempotentBilling();
        b.Handle(new Event("o1", 100));
        b.Handle(new Event("o2", 50));
        b.Handle(new Event("o1", 100));                      // re-delivered after a crash
        Console.WriteLine("charged = " + b.totalCharged);    // 150, not 250
    }
}` }
        ] } },
      { title: 'Delivery semantics cheat sheet', html: `${H.table(['Guarantee', 'Recipe', 'Failure effect', 'Use for'], [
  ['At-most-once', 'commit, then process', 'crash → message lost', 'metrics, click logs'],
  ['At-least-once', 'process, then commit', 'crash → message repeated', 'most business events (+ idempotency)'],
  ['Exactly-once', 'idempotent producer + transactions, or offset stored with result atomically', 'neither lost nor repeated (within the system)', 'payments, ledgers, stream joins']
])}<p>Interview tip: say "exactly-once <b>processing</b> inside Kafka; end-to-end exactly-once needs the sink to be idempotent too".</p>` }
    ],
    deepDive: `<p><b>1. Why a log is fast.</b> Appends are sequential disk writes; reads by offset are sequential too. Real Kafka splits each partition into <b>segment files</b> (e.g. 1 GB) with a sparse <b>offset index</b> and time index, relies on the OS <b>page cache</b>, and sends data to consumers with <b>zero-copy</b> (<code>sendfile</code>). Retention simply deletes whole old segments — no per-message delete cost.</p>
<p><b>2. Replication.</b> Each partition has a <b>leader</b> and followers. Followers that are caught up form the <b>ISR</b> (in-sync replicas). With <code>acks=all</code> + <code>min.insync.replicas=2</code>, a write is confirmed only when enough replicas have it. Consumers only see messages up to the <b>high watermark</b> (replicated to all ISR), so a leader crash never "un-shows" a message someone already read.</p>
<p><b>3. Producer side.</b> Batching (<code>linger.ms</code>, <code>batch.size</code>) and compression trade a few ms of latency for big throughput. The <b>idempotent producer</b> (default since Kafka 3.0) tags batches with producer id + sequence number so broker-side retries do not create duplicates. Messages without a key use a <b>sticky partitioner</b> (fill a batch for one partition, then switch) rather than strict round-robin.</p>
<p><b>4. Rebalancing.</b> Old "eager" rebalances stopped the whole group. <b>Cooperative sticky</b> assignment moves only the partitions that must move; <b>static membership</b> avoids rebalances on quick restarts; Kafka 4.0 made the new server-side consumer protocol (KIP-848) generally available and removed ZooKeeper entirely (KRaft only). Share groups (KIP-932) add queue-style consumption where many consumers can share one partition with per-message acks.</p>
<p><b>5. Log compaction.</b> For "latest value per key" topics (user profile, config), compaction keeps only the newest message for each key and tombstones (null value) delete a key. Offsets stay the same; there are just gaps.</p>
<p><b>6. Concurrency in your LLD code.</b> Guard <code>Partition.append/read</code> with a lock (Java <code>synchronized</code>, Python <code>threading.Lock</code>, C++ <code>std::mutex</code>), one lock per partition and never one global lock. Keep the offsets per group in a concurrent or locked map. For blocking consumers, use a condition variable with a timeout (long polling): <code>wait/notifyAll</code> in Java, <code>threading.Condition</code> in Python, <code>std::condition_variable</code> in C++, and in JavaScript a promise that the producer resolves. Always provide <code>shutdown()</code> that stops the workers and joins with a bound so tests never hang.</p>`,
    aiEra: `<p><b>What AI changes:</b> event streams are now the main way data reaches AI systems — real-time features for ML models, change-data-capture feeding vector indexes, and queues that smooth bursty LLM inference traffic. AI tools also write consumer boilerplate in seconds.</p>
<p><b>Use AI as a partner:</b> <code>Here is my consumer loop. List every point where a crash causes loss or duplication.</code> or <code>Generate a test where a consumer dies between process and commit, and assert re-delivery.</code></p>
<p><b>Where AI goes wrong:</b> committing offsets before processing ("auto-commit" defaults), assuming global ordering across partitions, forgetting that adding partitions remaps keys, ignoring rebalances (a consumer keeps processing a partition it no longer owns), and writing <code>while(true)</code> loops with no shutdown path.</p>
<p><b>Agents and retries:</b> AI agents retry tool calls aggressively. Any consumer that triggers side effects (emails, payments, agent actions) must be <b>idempotent</b>, ideally keyed by a message id — that habit from Kafka design now protects agent pipelines too.</p>
<p><b>What you must still own:</b> choosing partition keys and counts, choosing the delivery guarantee per use case, and explaining the three offsets (end, position, committed) on a whiteboard.</p>`,
    problems: [{
      title: 'Machine Coding: In-Memory Pub-Sub Queue with Independent Subscribers and Replay',
      level: 'Hard', tags: ['pub-sub', 'concurrency', 'offsets', 'observer'], companies: ['Uber', 'Flipkart', 'PhonePe', 'Confluent'],
      statement: `<p>Implement an in-memory message queue: <code>createTopic(name)</code>, <code>subscribe(topic, subscriber)</code>, <code>publish(topic, message)</code>, <code>resetOffset(topic, subscriberId, offset)</code>. Every subscriber gets <b>every</b> message of its topic, <b>in order</b>, on its <b>own thread</b>, at its own speed. Resetting the offset must replay messages from that point. A slow subscriber must not slow down the publisher or other subscribers. Provide a clean <code>shutdown()</code>.</p>`,
      constraints: `<p>Up to 100 topics, 1000 subscribers, 10<sup>6</sup> messages in memory. Thread-safe. No busy-waiting. <code>shutdown()</code> must return within 2 seconds.</p>`,
      example: `<p>publish m1, m2, m3 to "orders"; subscribers A (fast) and B (slow, 5 ms per message).</p>
${H.table(['Time', 'A sees', 'B sees'], [['t1', 'm1 m2 m3', 'm1'], ['t2', '—', 'm1 m2 m3'], ['resetOffset(A, 0)', H.c('g', 'm1 m2 m3 again'), '—']])}
<p>Each subscriber has its own offset; the topic stores each message once.</p>`,
      brute: {
        why: `<p>Calling every subscriber directly inside <code>publish()</code> means the publisher waits for the slowest subscriber, one exception stops delivery to the rest, and nothing is stored, so replay is impossible. Copying into one queue per subscriber fixes speed but multiplies memory and still cannot replay.</p>`,
        code: { lang: 'java', code: String.raw`
interface Sub { String id(); void consume(String msg); }

class NaiveBus {
    private final Map<String, List<Sub>> subs = new HashMap<>();
    void subscribe(String topic, Sub s) { subs.computeIfAbsent(topic, t -> new ArrayList<>()).add(s); }
    void publish(String topic, String msg) {
        for (Sub s : subs.getOrDefault(topic, List.of()))
            s.consume(msg);              // publisher blocked by slow subscribers; an exception stops the loop
    }                                    // message not stored anywhere: no replay possible

    public static void main(String[] args) {
        NaiveBus bus = new NaiveBus();
        bus.subscribe("orders", new Sub() { public String id() { return "A"; } public void consume(String m) { System.out.println("A got " + m); } });
        long t = System.nanoTime();
        bus.subscribe("orders", new Sub() { public String id() { return "B"; } public void consume(String m) {
            try { Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } } });
        bus.publish("orders", "m1");
        bus.publish("orders", "m2");
        System.out.println("publisher spent ~" + (System.nanoTime() - t) / 1_000_000 + " ms waiting for slow B");
    }
}`, alt: [{ lang: 'python', code: "import time\n\nclass NaiveBus:\n    def __init__(self): self.subs = {}\n    def subscribe(self, topic, s): self.subs.setdefault(topic, []).append(s)\n    def publish(self, topic, msg):\n        for s in self.subs.get(topic, []):\n            s.consume(msg)              # publisher blocked by slow subscribers; an exception stops the loop\n                                        # message not stored anywhere: no replay possible\n\nclass A:\n    id = \"A\"\n    def consume(self, m): print(\"A got\", m)\n\nclass B:\n    id = \"B\"\n    def consume(self, m): time.sleep(0.02)\n\nif __name__ == \"__main__\":\n    bus = NaiveBus()\n    bus.subscribe(\"orders\", A())\n    t = time.perf_counter()\n    bus.subscribe(\"orders\", B())\n    bus.publish(\"orders\", \"m1\")\n    bus.publish(\"orders\", \"m2\")\n    print(f\"publisher spent ~{int((time.perf_counter() - t) * 1000)} ms waiting for slow B\")\n" }, { lang: 'ts', code: "interface Sub { id: string; consume(msg: string): void }\n\nclass NaiveBus {\n  private subs = new Map<string, Sub[]>();\n  subscribe(topic: string, s: Sub): void {\n    if (!this.subs.has(topic)) this.subs.set(topic, []);\n    this.subs.get(topic)!.push(s);\n  }\n  publish(topic: string, msg: string): void {\n    for (const s of this.subs.get(topic) ?? [])\n      s.consume(msg);              // publisher blocked by slow subscribers; an exception stops the loop\n  }                                // message not stored anywhere: no replay possible\n}\n\nconst sleepMs = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);\nconst bus = new NaiveBus();\nbus.subscribe(\"orders\", { id: \"A\", consume: (m) => console.log(\"A got \" + m) });\nconst t = Date.now();\nbus.subscribe(\"orders\", { id: \"B\", consume: () => sleepMs(20) });\nbus.publish(\"orders\", \"m1\");\nbus.publish(\"orders\", \"m2\");\nconsole.log(\"publisher spent ~\" + (Date.now() - t) + \" ms waiting for slow B\");\n" }, { lang: 'cpp', code: "struct Sub { virtual string id() = 0; virtual void consume(const string& msg) = 0; virtual ~Sub() = default; };\n\nclass NaiveBus {\n    unordered_map<string, vector<Sub*>> subs;\npublic:\n    void subscribe(const string& topic, Sub* s) { subs[topic].push_back(s); }\n    void publish(const string& topic, const string& msg) {\n        for (Sub* s : subs[topic])\n            s->consume(msg);             // publisher blocked by slow subscribers; an exception stops the loop\n    }                                    // message not stored anywhere: no replay possible\n};\n\nstruct A : Sub { string id() override { return \"A\"; } void consume(const string& m) override { cout << \"A got \" << m << endl; } };\nstruct B : Sub { string id() override { return \"B\"; } void consume(const string&) override { this_thread::sleep_for(chrono::milliseconds(20)); } };\n\nint main() {\n    NaiveBus bus; A a; B b;\n    bus.subscribe(\"orders\", &a);\n    auto t = chrono::steady_clock::now();\n    bus.subscribe(\"orders\", &b);\n    bus.publish(\"orders\", \"m1\");\n    bus.publish(\"orders\", \"m2\");\n    cout << \"publisher spent ~\" << chrono::duration_cast<chrono::milliseconds>(chrono::steady_clock::now() - t).count() << \" ms waiting for slow B\" << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nusing System.Diagnostics;\nusing System.Threading;\n\ninterface ISub { string Id(); void Consume(string msg); }\nclass FastSub : ISub { public string Id() { return \"A\"; } public void Consume(string m) { Console.WriteLine(\"A got \" + m); } }\nclass SlowSub : ISub { public string Id() { return \"B\"; } public void Consume(string m) { Thread.Sleep(20); } }\n\nclass NaiveBus {\n    private readonly Dictionary<string, List<ISub>> subs = new Dictionary<string, List<ISub>>();\n    public void Subscribe(string topic, ISub s) { List<ISub> l; if (!subs.TryGetValue(topic, out l)) { l = new List<ISub>(); subs[topic] = l; } l.Add(s); }\n    public void Publish(string topic, string msg) {\n        List<ISub> l;\n        if (!subs.TryGetValue(topic, out l)) return;\n        foreach (ISub s in l) s.Consume(msg);   // publisher blocked by slow subscribers; an exception stops the loop\n    }                                           // message not stored anywhere: no replay possible\n\n    static void Main() {\n        NaiveBus bus = new NaiveBus();\n        bus.Subscribe(\"orders\", new FastSub());\n        Stopwatch sw = Stopwatch.StartNew();\n        bus.Subscribe(\"orders\", new SlowSub());\n        bus.Publish(\"orders\", \"m1\");\n        bus.Publish(\"orders\", \"m2\");\n        Console.WriteLine(\"publisher spent ~\" + sw.ElapsedMilliseconds + \" ms waiting for slow B\");\n    }\n}\n" }] }
      },
      mcq: { q: 'Subscriber B is 100× slower than A. In the log + offset design, what happens?', options: ['B\'s offset falls behind (lag grows); A and the publisher are unaffected', 'The publisher blocks until B catches up', 'A must wait for B to keep order', 'Messages are dropped for B'], answer: 0, explain: 'Each subscriber reads from the shared log at its own offset on its own thread. Slowness shows up as lag, not as back-pressure on others (until retention deletes data B has not read).' },
      hints: [
        `<p>Store each message <b>once</b> per topic in an append-only list. A subscriber is just "a thread + an offset".</p>`,
        `<p>Worker loop: <code>off = topic.awaitReadable(offset)</code> (wait while offset ≥ size, re-reading the offset after every wake-up), consume, then advance. <code>publish</code> appends and wakes all waiters (<code>notifyAll()</code>). Use an atomic integer for the offset (Java <code>AtomicInteger</code>, C++ <code>std::atomic&lt;int&gt;</code>, Python an int behind a lock) so <code>resetOffset</code> from another thread is safe (compare-and-set when advancing).</p>`,
        `<p>Edge cases: reset while a message is being processed (CAS keeps the reset), subscriber throws (catch, log, continue or move to a dead-letter list), shutdown (signal the workers: Java interrupts them, Python and C++ set a stop flag and wake them; join with a timeout). Recipe: TopicLog{list, publish, awaitReadable, get} → Worker{sub, offset, run} → Queue{topics, workers, publish, subscribe, reset, shutdown}.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "published 3 messages while B was stuck, B has received 0\nall delivered=true A=[m1, m2, m3, m1, m2, m3] B=[m1, m2, m3] C=[m1, m3]\nerrors=[C failed on m2: bad message]\npublish failed: unknown topic audit\nshutdown complete\n" }] },
      solution: {
        approach: `<p>One <code>TopicLog</code> per topic holds messages in a list guarded by its lock. Each subscription is a <code>SubscriberWorker</code> thread with an atomic offset. The worker blocks in <code>awaitReadable(offset)</code> on a condition variable (<code>wait()</code> in Java) until a message exists at its <i>current</i> offset (re-read on every wake-up, so a reset is never missed), consumes it, then advances with <code>compareAndSet(off, off + 1)</code> so a concurrent <code>resetOffset</code> is never overwritten. <code>publish</code> = append + wake all. <code>shutdown</code> stops all workers and joins with a timeout. TypeScript has no threads: each worker is an async loop that sleeps on a promise, and the compare-and-set becomes "advance only if the offset is unchanged".</p>`,
        code: String.raw`
interface Subscriber { String id(); void consume(String msg) throws Exception; }

class TopicLog {
    final String name;
    private final List<String> messages = new ArrayList<>();
    TopicLog(String name) { this.name = name; }
    synchronized void publish(String m) { messages.add(m); notifyAll(); }
    // Re-reads the AtomicInteger inside the loop, so a resetOffset() wakes us up correctly.
    synchronized int awaitReadable(AtomicInteger offset) throws InterruptedException {
        while (offset.get() >= messages.size()) wait();  // no busy-waiting
        return offset.get();
    }
    synchronized String get(int i) { return messages.get(i); }
    synchronized void wakeAll() { notifyAll(); }
}

class SubscriberWorker implements Runnable {
    final TopicLog topic;
    final Subscriber sub;
    final AtomicInteger offset = new AtomicInteger();
    final List<String> errors = new CopyOnWriteArrayList<>();   // failed deliveries, so tests can read them
    SubscriberWorker(TopicLog topic, Subscriber sub) { this.topic = topic; this.sub = sub; }
    public void run() {
        try {
            while (!Thread.currentThread().isInterrupted()) {
                int off = topic.awaitReadable(offset);
                String msg = topic.get(off);
                try { sub.consume(msg); }
                catch (Exception e) { errors.add(sub.id() + " failed on " + msg + ": " + e.getMessage()); }  // one bad message never stops the loop
                offset.compareAndSet(off, off + 1);       // if reset happened meanwhile, keep the reset
            }
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
    void reset(int newOffset) { offset.set(newOffset); topic.wakeAll(); }
}

class MessageQueue {
    private final Map<String, TopicLog> topics = new ConcurrentHashMap<>();
    private final Map<String, SubscriberWorker> workers = new ConcurrentHashMap<>();
    private final List<Thread> threads = new CopyOnWriteArrayList<>();

    void createTopic(String name) { topics.putIfAbsent(name, new TopicLog(name)); }
    void publish(String topic, String msg) { get(topic).publish(msg); }
    void subscribe(String topic, Subscriber s) {
        SubscriberWorker w = new SubscriberWorker(get(topic), s);
        workers.put(topic + "/" + s.id(), w);
        Thread t = new Thread(w, "sub-" + s.id());
        t.setDaemon(true);
        threads.add(t);
        t.start();
    }
    void resetOffset(String topic, String subId, int offset) { workers.get(topic + "/" + subId).reset(offset); }
    List<String> errors() {
        List<String> all = new ArrayList<>();
        workers.values().forEach(w -> all.addAll(w.errors));
        return all;
    }
    void shutdown() throws InterruptedException {
        threads.forEach(Thread::interrupt);
        for (Thread t : threads) t.join(2000);
    }
    private TopicLog get(String name) {
        TopicLog t = topics.get(name);
        if (t == null) throw new IllegalArgumentException("unknown topic " + name);
        return t;
    }
}

class RecordingSub implements Subscriber {
    final String id; final CountDownLatch gate; final String poison; final CountDownLatch latch;
    final List<String> got = Collections.synchronizedList(new ArrayList<>());
    // gate: a slow subscriber is stuck until the gate opens (null = fast); poison: a message that makes consume() throw
    RecordingSub(String id, CountDownLatch gate, String poison, CountDownLatch latch) {
        this.id = id; this.gate = gate; this.poison = poison; this.latch = latch;
    }
    public String id() { return id; }
    public void consume(String m) throws Exception {
        if (gate != null) gate.await();
        if (m.equals(poison)) throw new Exception("bad message");
        got.add(m); latch.countDown();
    }
}

class PubSubSolution {
    public static void main(String[] args) throws Exception {
        MessageQueue q = new MessageQueue();
        q.createTopic("orders");
        CountDownLatch done = new CountDownLatch(11);             // A: 3 + 3 replayed, B: 3, C: 2 (m2 fails)
        CountDownLatch gateB = new CountDownLatch(1);             // B is "slow": stuck until we open the gate
        RecordingSub a = new RecordingSub("A", null, null, done);
        RecordingSub b = new RecordingSub("B", gateB, null, done);
        RecordingSub c = new RecordingSub("C", null, "m2", done);
        q.subscribe("orders", a);
        q.subscribe("orders", b);
        q.subscribe("orders", c);
        for (String m : List.of("m1", "m2", "m3")) q.publish("orders", m);
        System.out.println("published 3 messages while B was stuck, B has received " + b.got.size());
        gateB.countDown();                                        // B wakes up and catches up
        while (a.got.size() < 3) Thread.sleep(1);
        q.resetOffset("orders", "A", 0);                          // replay for A only
        boolean ok = done.await(2, TimeUnit.SECONDS);
        System.out.println("all delivered=" + ok + " A=" + a.got + " B=" + b.got + " C=" + c.got);
        System.out.println("errors=" + q.errors());
        try { q.publish("audit", "x"); }
        catch (IllegalArgumentException e) { System.out.println("publish failed: " + e.getMessage()); }
        q.shutdown();
        System.out.println("shutdown complete");
    }
}`,
      alt: [
          { lang: 'python', code: String.raw`
import threading
import time
from abc import ABC, abstractmethod
from typing import Optional


class Subscriber(ABC):
    @property
    @abstractmethod
    def id(self) -> str: ...

    @abstractmethod
    def consume(self, msg: str) -> None: ...


class AtomicInt:
    """A tiny lock-protected int with compare-and-set (Python has no AtomicInteger)."""

    def __init__(self, value: int = 0) -> None:
        self._value = value
        self._lock = threading.Lock()

    def get(self) -> int:
        with self._lock:
            return self._value

    def set(self, value: int) -> None:
        with self._lock:
            self._value = value

    def compare_and_set(self, expected: int, new: int) -> bool:
        with self._lock:
            if self._value != expected:
                return False
            self._value = new
            return True


class CountDownLatch:
    def __init__(self, count: int) -> None:
        self._count = count
        self._cond = threading.Condition()

    def count_down(self) -> None:
        with self._cond:
            self._count -= 1
            if self._count <= 0:
                self._cond.notify_all()

    def wait(self, timeout: float) -> bool:
        with self._cond:
            return self._cond.wait_for(lambda: self._count <= 0, timeout)


class TopicLog:
    def __init__(self, name: str) -> None:
        self.name = name
        self._messages: list[str] = []
        self._cond = threading.Condition()

    def publish(self, m: str) -> None:
        with self._cond:
            self._messages.append(m)
            self._cond.notify_all()

    # Re-reads the offset inside the loop, so a reset() wakes us up correctly. None = asked to stop.
    def await_readable(self, offset: AtomicInt, stop: threading.Event) -> Optional[int]:
        with self._cond:
            while offset.get() >= len(self._messages) and not stop.is_set():
                self._cond.wait()                      # no busy-waiting
            return None if stop.is_set() else offset.get()

    def get(self, i: int) -> str:
        with self._cond:
            return self._messages[i]

    def wake_all(self) -> None:
        with self._cond:
            self._cond.notify_all()


class SubscriberWorker:
    def __init__(self, topic: TopicLog, sub: Subscriber) -> None:
        self.topic = topic
        self.sub = sub
        self.offset = AtomicInt()
        self.errors: list[str] = []                    # failed deliveries, so tests can read them
        self.stop = threading.Event()
        self.thread = threading.Thread(target=self._run, name=f"sub-{sub.id}", daemon=True)

    def _run(self) -> None:
        while not self.stop.is_set():
            off = self.topic.await_readable(self.offset, self.stop)
            if off is None:
                return
            msg = self.topic.get(off)
            try:
                self.sub.consume(msg)
            except Exception as e:                     # one bad message never stops the loop
                self.errors.append(f"{self.sub.id} failed on {msg}: {e}")
            self.offset.compare_and_set(off, off + 1)  # if a reset happened meanwhile, keep the reset

    def reset(self, new_offset: int) -> None:
        self.offset.set(new_offset)
        self.topic.wake_all()

    def shutdown(self) -> None:
        self.stop.set()
        self.topic.wake_all()


class MessageQueue:
    def __init__(self) -> None:
        self._topics: dict[str, TopicLog] = {}
        self._workers: dict[str, SubscriberWorker] = {}
        self._lock = threading.Lock()

    def create_topic(self, name: str) -> None:
        with self._lock:
            self._topics.setdefault(name, TopicLog(name))

    def publish(self, topic: str, msg: str) -> None:
        self._get(topic).publish(msg)

    def subscribe(self, topic: str, s: Subscriber) -> None:
        w = SubscriberWorker(self._get(topic), s)
        with self._lock:
            self._workers[f"{topic}/{s.id}"] = w
        w.thread.start()

    def reset_offset(self, topic: str, sub_id: str, offset: int) -> None:
        self._workers[f"{topic}/{sub_id}"].reset(offset)

    def errors(self) -> list[str]:
        with self._lock:
            return [e for w in self._workers.values() for e in w.errors]

    def shutdown(self) -> None:
        with self._lock:
            workers = list(self._workers.values())
        for w in workers:
            w.shutdown()
        for w in workers:
            w.thread.join(timeout=2)

    def _get(self, name: str) -> TopicLog:
        t = self._topics.get(name)
        if t is None:
            raise ValueError(f"unknown topic {name}")
        return t


class RecordingSub(Subscriber):
    # gate: a slow subscriber is stuck until the gate opens (None = fast);
    # poison: a message that makes consume() raise
    def __init__(self, sid: str, gate: Optional[threading.Event], poison: Optional[str], latch: CountDownLatch) -> None:
        self._id = sid
        self.gate = gate
        self.poison = poison
        self.latch = latch
        self.got: list[str] = []

    @property
    def id(self) -> str:
        return self._id

    def consume(self, m: str) -> None:
        if self.gate is not None:
            self.gate.wait()
        if m == self.poison:
            raise RuntimeError("bad message")
        self.got.append(m)
        self.latch.count_down()


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def main() -> None:
    q = MessageQueue()
    q.create_topic("orders")
    done = CountDownLatch(11)                          # A: 3 + 3 replayed, B: 3, C: 2 (m2 fails)
    gate_b = threading.Event()                         # B is "slow": stuck until we open the gate
    a = RecordingSub("A", None, None, done)
    b = RecordingSub("B", gate_b, None, done)
    c = RecordingSub("C", None, "m2", done)
    q.subscribe("orders", a)
    q.subscribe("orders", b)
    q.subscribe("orders", c)
    for m in ["m1", "m2", "m3"]:
        q.publish("orders", m)
    print(f"published 3 messages while B was stuck, B has received {len(b.got)}")
    gate_b.set()                                       # B wakes up and catches up
    while len(a.got) < 3:
        time.sleep(0.001)
    q.reset_offset("orders", "A", 0)                   # replay for A only
    ok = done.wait(2)
    print(f"all delivered={str(ok).lower()} A={show(a.got)} B={show(b.got)} C={show(c.got)}")
    print(f"errors={show(q.errors())}")
    try:
        q.publish("audit", "x")
    except ValueError as e:
        print(f"publish failed: {e}")
    q.shutdown()
    print("shutdown complete")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: String.raw`
interface Subscriber {
  readonly id: string;
  consume(msg: string): Promise<void>;
}

// JavaScript has no threads here: each subscriber is an async loop that sleeps on a promise.
class TopicLog {
  private readonly messages: string[] = [];
  private waiters: Array<() => void> = [];
  constructor(readonly name: string) {}

  publish(m: string): void {
    this.messages.push(m);
    this.wakeAll();
  }
  length(): number { return this.messages.length; }
  get(i: number): string { return this.messages[i]; }
  wakeAll(): void {
    const w = this.waiters;
    this.waiters = [];
    w.forEach((resolve) => resolve());
  }
  // Sleeps until a wake-up; the caller re-checks its condition in a loop (no busy-waiting).
  nextWakeUp(): Promise<void> {
    return new Promise((resolve) => this.waiters.push(resolve));
  }
}

class SubscriberWorker {
  offset = 0;
  readonly errors: string[] = [];                  // failed deliveries, so tests can read them
  private stopped = false;
  private running: Promise<void> = Promise.resolve();

  constructor(private readonly topic: TopicLog, private readonly sub: Subscriber) {}

  start(): void { this.running = this.run(); }

  private async run(): Promise<void> {
    while (!this.stopped) {
      while (!this.stopped && this.offset >= this.topic.length()) await this.topic.nextWakeUp();
      if (this.stopped) return;
      const off = this.offset;
      const msg = this.topic.get(off);
      try { await this.sub.consume(msg); }
      catch (e) { this.errors.push(this.sub.id + " failed on " + msg + ": " + (e as Error).message); }  // one bad message never stops the loop
      if (this.offset === off) this.offset = off + 1;   // if a reset happened meanwhile, keep the reset
    }
  }

  reset(newOffset: number): void { this.offset = newOffset; this.topic.wakeAll(); }
  async shutdown(): Promise<void> { this.stopped = true; this.topic.wakeAll(); await this.running; }
}

class MessageQueue {
  private readonly topics = new Map<string, TopicLog>();
  private readonly workers = new Map<string, SubscriberWorker>();

  createTopic(name: string): void { if (!this.topics.has(name)) this.topics.set(name, new TopicLog(name)); }
  publish(topic: string, msg: string): void { this.get(topic).publish(msg); }
  subscribe(topic: string, s: Subscriber): void {
    const w = new SubscriberWorker(this.get(topic), s);
    this.workers.set(topic + "/" + s.id, w);
    w.start();
  }
  resetOffset(topic: string, subId: string, offset: number): void {
    const w = this.workers.get(topic + "/" + subId);
    if (w === undefined) throw new Error("unknown subscriber " + subId);
    w.reset(offset);
  }
  errors(): string[] { return [...this.workers.values()].flatMap((w) => w.errors); }
  async shutdown(): Promise<void> { await Promise.all([...this.workers.values()].map((w) => w.shutdown())); }
  private get(name: string): TopicLog {
    const t = this.topics.get(name);
    if (t === undefined) throw new Error("unknown topic " + name);
    return t;
  }
}

class CountDownLatch {
  private waiters: Array<() => void> = [];
  constructor(private count: number) {}
  countDown(): void {
    if (--this.count <= 0) { this.waiters.forEach((r) => r()); this.waiters = []; }
  }
  // resolves true when the count reaches 0, false after timeoutMs
  wait(timeoutMs: number): Promise<boolean> {
    if (this.count <= 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      this.waiters.push(() => { clearTimeout(timer); resolve(true); });
    });
  }
}

class RecordingSub implements Subscriber {
  readonly got: string[] = [];
  // gate: a slow subscriber is stuck until the gate opens (null = fast);
  // poison: a message that makes consume() throw
  constructor(readonly id: string, private readonly gate: Promise<void> | null,
              private readonly poison: string | null, private readonly latch: CountDownLatch) {}
  async consume(m: string): Promise<void> {
    if (this.gate !== null) await this.gate;
    if (m === this.poison) throw new Error("bad message");
    this.got.push(m);
    this.latch.countDown();
  }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const q = new MessageQueue();
  q.createTopic("orders");
  const done = new CountDownLatch(11);             // A: 3 + 3 replayed, B: 3, C: 2 (m2 fails)
  let openGate: () => void = () => {};
  const gateB = new Promise<void>((resolve) => { openGate = resolve; });   // B is "slow": stuck until we open the gate
  const a = new RecordingSub("A", null, null, done);
  const b = new RecordingSub("B", gateB, null, done);
  const c = new RecordingSub("C", null, "m2", done);
  q.subscribe("orders", a);
  q.subscribe("orders", b);
  q.subscribe("orders", c);
  for (const m of ["m1", "m2", "m3"]) q.publish("orders", m);
  await sleep(10);                                 // let the workers run: A and C finish, B stays stuck
  console.log("published 3 messages while B was stuck, B has received " + b.got.length);
  openGate();                                      // B wakes up and catches up
  while (a.got.length < 3) await sleep(1);
  q.resetOffset("orders", "A", 0);                 // replay for A only
  const ok = await done.wait(2000);
  console.log("all delivered=" + ok + " A=" + show(a.got) + " B=" + show(b.got) + " C=" + show(c.got));
  console.log("errors=" + show(q.errors()));
  try { q.publish("audit", "x"); }
  catch (e) { console.log("publish failed: " + (e as Error).message); }
  await q.shutdown();
  console.log("shutdown complete");
}

main();` },
          { lang: 'cpp', code: String.raw`
class Subscriber {
public:
    virtual ~Subscriber() = default;
    virtual string id() const = 0;
    virtual void consume(const string& msg) = 0;       // may throw
};

class CountDownLatch {
    int count;
    mutex mu;
    condition_variable cv;
public:
    explicit CountDownLatch(int c) : count(c) {}
    void countDown() {
        lock_guard<mutex> lock(mu);
        if (--count <= 0) cv.notify_all();
    }
    void await() {
        unique_lock<mutex> lock(mu);
        cv.wait(lock, [&] { return count <= 0; });
    }
    bool await(chrono::milliseconds timeout) {
        unique_lock<mutex> lock(mu);
        return cv.wait_for(lock, timeout, [&] { return count <= 0; });
    }
};

class TopicLog {
    vector<string> messages;
    mutable mutex mu;
    condition_variable cv;
public:
    const string name;
    explicit TopicLog(string n) : name(move(n)) {}

    void publish(const string& m) {
        { lock_guard<mutex> lock(mu); messages.push_back(m); }
        cv.notify_all();
    }
    // Sleeps until offset is readable or stop is set (no busy-waiting). Re-reads the atomic inside the predicate,
    // so a reset() wakes us up correctly. Returns false when asked to stop.
    bool awaitReadable(const atomic<int>& offset, const atomic<bool>& stop) {
        unique_lock<mutex> lock(mu);
        cv.wait(lock, [&] { return stop.load() || offset.load() < static_cast<int>(messages.size()); });
        return !stop.load();
    }
    string get(int i) const { lock_guard<mutex> lock(mu); return messages[i]; }
    void wakeAll() {
        { lock_guard<mutex> lock(mu); }                 // take the lock so no waiter misses the wake-up
        cv.notify_all();
    }
};

class SubscriberWorker {
    TopicLog& topic;
    Subscriber& sub;
    atomic<int> offset{0};
    atomic<bool> stop{false};
    vector<string> errors_;                             // failed deliveries, so tests can read them
    mutable mutex errMu;
    thread thr;

    void run() {
        while (topic.awaitReadable(offset, stop)) {
            int off = offset.load();
            string msg = topic.get(off);
            try { sub.consume(msg); }
            catch (const exception& e) {                // one bad message never stops the loop
                lock_guard<mutex> lock(errMu);
                errors_.push_back(sub.id() + " failed on " + msg + ": " + e.what());
            }
            offset.compare_exchange_strong(off, off + 1);   // if a reset happened meanwhile, keep the reset
        }
    }
public:
    SubscriberWorker(TopicLog& t, Subscriber& s) : topic(t), sub(s), thr([this] { run(); }) {}
    ~SubscriberWorker() { shutdown(); }

    void reset(int newOffset) { offset = newOffset; topic.wakeAll(); }
    vector<string> errors() const { lock_guard<mutex> lock(errMu); return errors_; }
    void shutdown() {
        stop = true;
        topic.wakeAll();
        if (thr.joinable()) thr.join();
    }
};

class MessageQueue {
    map<string, unique_ptr<TopicLog>> topics;
    map<string, unique_ptr<SubscriberWorker>> workers;
    mutex mu;

    TopicLog& get(const string& name) {
        lock_guard<mutex> lock(mu);
        auto it = topics.find(name);
        if (it == topics.end()) throw invalid_argument("unknown topic " + name);
        return *it->second;
    }
public:
    void createTopic(const string& name) {
        lock_guard<mutex> lock(mu);
        if (!topics.count(name)) topics[name] = make_unique<TopicLog>(name);
    }
    void publish(const string& topic, const string& msg) { get(topic).publish(msg); }
    // The queue does not own the subscriber: it must outlive the queue.
    void subscribe(const string& topic, Subscriber& s) {
        auto w = make_unique<SubscriberWorker>(get(topic), s);
        lock_guard<mutex> lock(mu);
        workers[topic + "/" + s.id()] = move(w);
    }
    void resetOffset(const string& topic, const string& subId, int offset) {
        lock_guard<mutex> lock(mu);
        workers.at(topic + "/" + subId)->reset(offset);
    }
    vector<string> errors() {
        lock_guard<mutex> lock(mu);
        vector<string> all;
        for (auto& [key, w] : workers) for (auto& e : w->errors()) all.push_back(e);
        return all;
    }
    void shutdown() {
        lock_guard<mutex> lock(mu);
        for (auto& [key, w] : workers) w->shutdown();   // each worker is told to stop, then joined
    }
};

class RecordingSub : public Subscriber {
    const string id_;
    CountDownLatch* gate;                               // a slow subscriber is stuck until the gate opens (null = fast)
    const string poison;                                // a message that makes consume() throw
    CountDownLatch& latch;
    vector<string> got_;
    mutable mutex mu;
public:
    RecordingSub(string i, CountDownLatch* g, string p, CountDownLatch& l) : id_(move(i)), gate(g), poison(move(p)), latch(l) {}
    string id() const override { return id_; }
    void consume(const string& m) override {
        if (gate) gate->await();
        if (m == poison) throw runtime_error("bad message");
        { lock_guard<mutex> lock(mu); got_.push_back(m); }
        latch.countDown();
    }
    vector<string> got() const { lock_guard<mutex> lock(mu); return got_; }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

int main() {
    MessageQueue q;
    q.createTopic("orders");
    CountDownLatch done(11);                            // A: 3 + 3 replayed, B: 3, C: 2 (m2 fails)
    CountDownLatch gateB(1);                            // B is "slow": stuck until we open the gate
    RecordingSub a("A", nullptr, "", done);
    RecordingSub b("B", &gateB, "", done);
    RecordingSub c("C", nullptr, "m2", done);
    q.subscribe("orders", a);
    q.subscribe("orders", b);
    q.subscribe("orders", c);
    for (const char* m : {"m1", "m2", "m3"}) q.publish("orders", m);
    cout << "published 3 messages while B was stuck, B has received " << b.got().size() << "\n";
    gateB.countDown();                                  // B wakes up and catches up
    while (a.got().size() < 3) this_thread::sleep_for(chrono::milliseconds(1));
    q.resetOffset("orders", "A", 0);                    // replay for A only
    bool ok = done.await(chrono::milliseconds(2000));
    cout << "all delivered=" << boolalpha << ok << " A=" << show(a.got()) << " B=" << show(b.got()) << " C=" << show(c.got()) << "\n";
    cout << "errors=" << show(q.errors()) << "\n";
    try { q.publish("audit", "x"); }
    catch (const invalid_argument& e) { cout << "publish failed: " << e.what() << "\n"; }
    q.shutdown();
    cout << "shutdown complete\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

interface ISubscriber { string Id(); void Consume(string msg); }

class TopicLog {
    public readonly string Name;
    private readonly List<string> messages = new List<string>();
    public TopicLog(string name) { Name = name; }
    public void Publish(string m) { lock (messages) { messages.Add(m); Monitor.PulseAll(messages); } }
    // Re-reads the offset inside the loop, so a ResetOffset() wakes us up correctly.
    public int AwaitReadable(Func<int> offset) {
        lock (messages) {
            while (offset() >= messages.Count) Monitor.Wait(messages);   // no busy-waiting; Interrupt() wakes it with an exception
            return offset();
        }
    }
    public string Get(int i) { lock (messages) return messages[i]; }
    public void WakeAll() { lock (messages) Monitor.PulseAll(messages); }
}

class SubscriberWorker {
    public readonly TopicLog Topic;
    public readonly ISubscriber Sub;
    private int offset;
    public readonly ConcurrentQueue<string> Errors = new ConcurrentQueue<string>();   // failed deliveries, so tests can read them
    public SubscriberWorker(TopicLog topic, ISubscriber sub) { Topic = topic; Sub = sub; }
    public void Run() {
        try {
            while (true) {
                int off = Topic.AwaitReadable(() => Volatile.Read(ref offset));
                string msg = Topic.Get(off);
                try { Sub.Consume(msg); }
                catch (Exception e) { Errors.Enqueue(Sub.Id() + " failed on " + msg + ": " + e.Message); }  // one bad message never stops the loop
                Interlocked.CompareExchange(ref offset, off + 1, off);    // if reset happened meanwhile, keep the reset
            }
        } catch (ThreadInterruptedException) { /* shutdown */ }
    }
    public void Reset(int newOffset) { Interlocked.Exchange(ref offset, newOffset); Topic.WakeAll(); }
}

class MessageQueue {
    private readonly ConcurrentDictionary<string, TopicLog> topics = new ConcurrentDictionary<string, TopicLog>();
    private readonly ConcurrentDictionary<string, SubscriberWorker> workers = new ConcurrentDictionary<string, SubscriberWorker>();
    private readonly List<SubscriberWorker> order = new List<SubscriberWorker>();
    private readonly List<Thread> threads = new List<Thread>();

    public void CreateTopic(string name) { topics.TryAdd(name, new TopicLog(name)); }
    public void Publish(string topic, string msg) { Get(topic).Publish(msg); }
    public void Subscribe(string topic, ISubscriber s) {
        SubscriberWorker w = new SubscriberWorker(Get(topic), s);
        workers[topic + "/" + s.Id()] = w;
        Thread t = new Thread(w.Run) { Name = "sub-" + s.Id(), IsBackground = true };
        lock (threads) { threads.Add(t); order.Add(w); }
        t.Start();
    }
    public void ResetOffset(string topic, string subId, int offset) { workers[topic + "/" + subId].Reset(offset); }
    public List<string> Errors() {
        List<string> all = new List<string>();
        lock (threads) foreach (SubscriberWorker w in order) all.AddRange(w.Errors);
        return all;
    }
    public void Shutdown() {
        List<Thread> ts; lock (threads) ts = new List<Thread>(threads);
        foreach (Thread t in ts) t.Interrupt();
        foreach (Thread t in ts) t.Join(2000);
    }
    private TopicLog Get(string name) {
        TopicLog t;
        if (!topics.TryGetValue(name, out t)) throw new ArgumentException("unknown topic " + name);
        return t;
    }
}

class RecordingSub : ISubscriber {
    readonly string id; readonly ManualResetEventSlim gate; readonly string poison; readonly CountdownEvent latch;
    public readonly List<string> Got = new List<string>();
    // gate: a slow subscriber is stuck until the gate opens (null = fast); poison: a message that makes Consume() throw
    public RecordingSub(string id, ManualResetEventSlim gate, string poison, CountdownEvent latch) {
        this.id = id; this.gate = gate; this.poison = poison; this.latch = latch;
    }
    public string Id() { return id; }
    public void Consume(string m) {
        if (gate != null) gate.Wait();
        if (m == poison) throw new Exception("bad message");
        lock (Got) Got.Add(m);
        latch.Signal();
    }
    public int Count() { lock (Got) return Got.Count; }
    public override string ToString() { lock (Got) return "[" + string.Join(", ", Got) + "]"; }
}

class PubSubSolution {
    static void Main() {
        MessageQueue q = new MessageQueue();
        q.CreateTopic("orders");
        CountdownEvent done = new CountdownEvent(11);                    // A: 3 + 3 replayed, B: 3, C: 2 (m2 fails)
        ManualResetEventSlim gateB = new ManualResetEventSlim(false);    // B is "slow": stuck until we open the gate
        RecordingSub a = new RecordingSub("A", null, null, done);
        RecordingSub b = new RecordingSub("B", gateB, null, done);
        RecordingSub c = new RecordingSub("C", null, "m2", done);
        q.Subscribe("orders", a);
        q.Subscribe("orders", b);
        q.Subscribe("orders", c);
        foreach (string m in new[] { "m1", "m2", "m3" }) q.Publish("orders", m);
        Console.WriteLine("published 3 messages while B was stuck, B has received " + b.Count());
        gateB.Set();                                                     // B wakes up and catches up
        while (a.Count() < 3) Thread.Sleep(1);
        q.ResetOffset("orders", "A", 0);                                 // replay for A only
        bool ok = done.Wait(2000);
        Console.WriteLine("all delivered=" + ok.ToString().ToLower() + " A=" + a + " B=" + b + " C=" + c);
        Console.WriteLine("errors=[" + string.Join(", ", q.Errors()) + "]");
        try { q.Publish("audit", "x"); }
        catch (ArgumentException e) { Console.WriteLine("publish failed: " + e.Message); }
        q.Shutdown();
        Console.WriteLine("shutdown complete");
    }
}` }
        ],
        complexity: `<p>publish O(1) amortised + waking waiters. Each delivery O(1). Memory O(total messages) — stored once regardless of subscriber count. Threads: one per subscriber (use a pool / virtual threads for thousands).</p>`,
        followUps: ['Add consumer groups: several workers share one subscription, one partition each.', 'Add retention: delete messages every subscriber has passed — how do you find the minimum offset quickly?', 'Add retries with backoff and a dead-letter topic for messages that fail 3 times.', 'Replace one thread per subscriber with virtual threads or a shared executor — what changes?']
      }
    }]
  });

  /* ======================= TOPIC 3: CHESS ======================= */
  var CHESS_CORE = String.raw`
// ===== Chess core: pieces know HOW they move; the rule engine knows WHAT is legal =====

enum Color { WHITE, BLACK;
    Color opposite() { return this == WHITE ? BLACK : WHITE; } }

enum PieceType { KING('K'), QUEEN('Q'), ROOK('R'), BISHOP('B'), KNIGHT('N'), PAWN('P');
    final char symbol;
    PieceType(char s) { symbol = s; } }

// row 0 = rank 1, col 0 = file a.  "e4" -> (3, 4)
record Position(int row, int col) {
    static Position of(String sq) { return new Position(sq.charAt(1) - '1', sq.charAt(0) - 'a'); }
    boolean onBoard() { return row >= 0 && row < 8 && col >= 0 && col < 8; }
    Position plus(int dr, int dc) { return new Position(row + dr, col + dc); }
    public String toString() { return "" + (char) ('a' + col) + (char) ('1' + row); }
}

enum MoveType { NORMAL, DOUBLE_PAWN, EN_PASSANT, CASTLE_KING, CASTLE_QUEEN, PROMOTION }

record Move(Position from, Position to, MoveType type) {
    public String toString() { return from + "-" + to + (type == MoveType.NORMAL ? "" : "(" + type + ")"); }
}

// Pieces are immutable: no position, no hasMoved flag. The Board owns that state.
abstract class Piece {
    final Color color;
    Piece(Color color) { this.color = color; }
    abstract PieceType type();
    // Moves that follow the piece's movement rule, ignoring "does this leave my king in check?"
    abstract List<Move> pseudoLegalMoves(Board b, Position from);
    // Squares this piece attacks (used for check detection). Same as moves for most pieces.
    List<Position> attacks(Board b, Position from) {
        List<Position> out = new ArrayList<>();
        for (Move m : pseudoLegalMoves(b, from)) out.add(m.to());
        return out;
    }
    char symbol() { return color == Color.WHITE ? type().symbol : Character.toLowerCase(type().symbol); }

    // Rook/Bishop/Queen: walk each direction until the edge or a piece.
    protected List<Move> slide(Board b, Position from, int[][] dirs) {
        List<Move> out = new ArrayList<>();
        for (int[] d : dirs) {
            for (Position p = from.plus(d[0], d[1]); p.onBoard(); p = p.plus(d[0], d[1])) {
                Piece occ = b.at(p);
                if (occ == null) { out.add(new Move(from, p, MoveType.NORMAL)); continue; }
                if (occ.color != color) out.add(new Move(from, p, MoveType.NORMAL));   // capture
                break;                                                                   // blocked either way
            }
        }
        return out;
    }
    // King/Knight: fixed jumps.
    protected List<Move> jumps(Board b, Position from, int[][] deltas) {
        List<Move> out = new ArrayList<>();
        for (int[] d : deltas) {
            Position p = from.plus(d[0], d[1]);
            if (p.onBoard() && (b.at(p) == null || b.at(p).color != color)) out.add(new Move(from, p, MoveType.NORMAL));
        }
        return out;
    }
    static final int[][] STRAIGHT = { {1, 0}, {-1, 0}, {0, 1}, {0, -1} };
    static final int[][] DIAGONAL = { {1, 1}, {1, -1}, {-1, 1}, {-1, -1} };
    static final int[][] ALL8 = { {1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1} };
}

class Rook extends Piece { Rook(Color c) { super(c); } PieceType type() { return PieceType.ROOK; }
    List<Move> pseudoLegalMoves(Board b, Position f) { return slide(b, f, STRAIGHT); } }
class Bishop extends Piece { Bishop(Color c) { super(c); } PieceType type() { return PieceType.BISHOP; }
    List<Move> pseudoLegalMoves(Board b, Position f) { return slide(b, f, DIAGONAL); } }
class Queen extends Piece { Queen(Color c) { super(c); } PieceType type() { return PieceType.QUEEN; }
    List<Move> pseudoLegalMoves(Board b, Position f) { return slide(b, f, ALL8); } }
class Knight extends Piece { Knight(Color c) { super(c); } PieceType type() { return PieceType.KNIGHT; }
    static final int[][] L = { {2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2} };
    List<Move> pseudoLegalMoves(Board b, Position f) { return jumps(b, f, L); } }

class King extends Piece {
    King(Color c) { super(c); }
    PieceType type() { return PieceType.KING; }
    // attacks = one step only (castling never attacks anything; also avoids infinite recursion)
    List<Position> attacks(Board b, Position f) {
        List<Position> out = new ArrayList<>();
        for (Move m : jumps(b, f, ALL8)) out.add(m.to());
        return out;
    }
    List<Move> pseudoLegalMoves(Board b, Position f) {
        List<Move> out = jumps(b, f, ALL8);
        int r = color == Color.WHITE ? 0 : 7;
        Color enemy = color.opposite();
        if (!f.equals(new Position(r, 4)) || b.isAttacked(f, enemy)) return out;       // cannot castle out of check
        char k = color == Color.WHITE ? 'K' : 'k', q = color == Color.WHITE ? 'Q' : 'q';
        if (b.castling.indexOf(k) >= 0 && b.at(new Position(r, 5)) == null && b.at(new Position(r, 6)) == null
                && !b.isAttacked(new Position(r, 5), enemy) && !b.isAttacked(new Position(r, 6), enemy))
            out.add(new Move(f, new Position(r, 6), MoveType.CASTLE_KING));
        if (b.castling.indexOf(q) >= 0 && b.at(new Position(r, 3)) == null && b.at(new Position(r, 2)) == null
                && b.at(new Position(r, 1)) == null
                && !b.isAttacked(new Position(r, 3), enemy) && !b.isAttacked(new Position(r, 2), enemy))
            out.add(new Move(f, new Position(r, 2), MoveType.CASTLE_QUEEN));
        return out;
    }
}

class Pawn extends Piece {
    Pawn(Color c) { super(c); }
    PieceType type() { return PieceType.PAWN; }
    private int dir() { return color == Color.WHITE ? 1 : -1; }
    List<Position> attacks(Board b, Position f) {          // pawns capture diagonally, move straight
        List<Position> out = new ArrayList<>();
        for (int dc : new int[] {-1, 1}) { Position p = f.plus(dir(), dc); if (p.onBoard()) out.add(p); }
        return out;
    }
    List<Move> pseudoLegalMoves(Board b, Position f) {
        List<Move> out = new ArrayList<>();
        int startRow = color == Color.WHITE ? 1 : 6, lastRow = color == Color.WHITE ? 7 : 0;
        Position one = f.plus(dir(), 0);
        if (one.onBoard() && b.at(one) == null) {
            out.add(new Move(f, one, one.row() == lastRow ? MoveType.PROMOTION : MoveType.NORMAL));
            Position two = f.plus(2 * dir(), 0);
            if (f.row() == startRow && b.at(two) == null) out.add(new Move(f, two, MoveType.DOUBLE_PAWN));
        }
        for (Position d : attacks(b, f)) {
            Piece t = b.at(d);
            if (t != null && t.color != color) out.add(new Move(f, d, d.row() == lastRow ? MoveType.PROMOTION : MoveType.NORMAL));
            else if (t == null && d.equals(b.enPassantTarget)) out.add(new Move(f, d, MoveType.EN_PASSANT));
        }
        return out;
    }
}

// The Board = the full position: squares + castling rights + en-passant square.
class Board {
    private final Piece[][] grid = new Piece[8][8];
    String castling = "KQkq";            // FEN-style rights still available
    Position enPassantTarget;            // square a pawn may capture INTO this move, or null

    Piece at(Position p) { return grid[p.row()][p.col()]; }
    void put(Position p, Piece x) { grid[p.row()][p.col()] = x; }

    static Board standard() {
        Board b = new Board();
        for (int c = 0; c < 8; c++) { b.grid[1][c] = new Pawn(Color.WHITE); b.grid[6][c] = new Pawn(Color.BLACK); }
        Color[] sides = { Color.WHITE, Color.BLACK };
        for (Color s : sides) {
            int r = s == Color.WHITE ? 0 : 7;
            b.grid[r][0] = new Rook(s); b.grid[r][7] = new Rook(s);
            b.grid[r][1] = new Knight(s); b.grid[r][6] = new Knight(s);
            b.grid[r][2] = new Bishop(s); b.grid[r][5] = new Bishop(s);
            b.grid[r][3] = new Queen(s); b.grid[r][4] = new King(s);
        }
        return b;
    }

    Board copy() {                        // pieces are immutable, so a shallow grid copy is enough
        Board b = new Board();
        for (int r = 0; r < 8; r++) b.grid[r] = grid[r].clone();
        b.castling = castling;
        b.enPassantTarget = enPassantTarget;
        return b;
    }

    Position kingOf(Color c) {
        for (int r = 0; r < 8; r++) for (int col = 0; col < 8; col++) {
            Piece p = grid[r][col];
            if (p != null && p.color == c && p.type() == PieceType.KING) return new Position(r, col);
        }
        throw new IllegalStateException("no " + c + " king");
    }

    boolean isAttacked(Position target, Color by) {
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            Piece p = grid[r][c];
            if (p != null && p.color == by && p.attacks(this, new Position(r, c)).contains(target)) return true;
        }
        return false;
    }

    // Executes a move that is already known to be legal; handles all special rules.
    void apply(Move m) {
        Piece p = at(m.from());
        put(m.to(), p);
        put(m.from(), null);
        int r = m.from().row();
        switch (m.type()) {
            case EN_PASSANT -> put(new Position(r, m.to().col()), null);              // captured pawn is beside us
            case CASTLE_KING -> { put(new Position(r, 5), at(new Position(r, 7))); put(new Position(r, 7), null); }
            case CASTLE_QUEEN -> { put(new Position(r, 3), at(new Position(r, 0))); put(new Position(r, 0), null); }
            case PROMOTION -> put(m.to(), new Queen(p.color));                          // auto-queen (extension: ask player)
            default -> { }
        }
        enPassantTarget = m.type() == MoveType.DOUBLE_PAWN ? new Position((m.from().row() + m.to().row()) / 2, m.from().col()) : null;
        loseRights(m.from());
        loseRights(m.to());                                                            // a captured rook also loses rights
    }
    private void loseRights(Position sq) {
        String s = sq.toString();
        if (s.equals("e1")) castling = castling.replace("K", "").replace("Q", "");
        if (s.equals("h1")) castling = castling.replace("K", "");
        if (s.equals("a1")) castling = castling.replace("Q", "");
        if (s.equals("e8")) castling = castling.replace("k", "").replace("q", "");
        if (s.equals("h8")) castling = castling.replace("k", "");
        if (s.equals("a8")) castling = castling.replace("q", "");
    }

    String render() {
        StringBuilder sb = new StringBuilder();
        for (int r = 7; r >= 0; r--) {
            sb.append(r + 1).append(' ');
            for (int c = 0; c < 8; c++) sb.append(grid[r][c] == null ? '.' : grid[r][c].symbol()).append(' ');
            sb.append('\n');
        }
        return sb.append("  a b c d e f g h").toString();
    }
}

// Rule engine: the ONLY place that knows "a move may not leave your own king in check".
final class MoveValidator {
    private MoveValidator() { }
    static List<Move> legalMoves(Board b, Color side, Position from) {
        Piece p = b.at(from);
        if (p == null || p.color != side) return List.of();
        List<Move> legal = new ArrayList<>();
        for (Move m : p.pseudoLegalMoves(b, from)) {
            Board next = b.copy();                                   // copy-make: simulate, then test
            next.apply(m);
            if (!next.isAttacked(next.kingOf(side), side.opposite())) legal.add(m);
        }
        return legal;
    }
    static List<Move> allLegalMoves(Board b, Color side) {
        List<Move> all = new ArrayList<>();
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) all.addAll(legalMoves(b, side, new Position(r, c)));
        return all;
    }
    // perft = count leaf positions at a depth; the standard way to test a move generator.
    static long perft(Board b, Color side, int depth) {
        if (depth == 0) return 1;
        long n = 0;
        for (Move m : allLegalMoves(b, side)) { Board next = b.copy(); next.apply(m); n += perft(next, side.opposite(), depth - 1); }
        return n;
    }
}

enum GameStatus { ACTIVE, CHECK, CHECKMATE, STALEMATE }

class Game {
    private Board board = Board.standard();
    private Color turn = Color.WHITE;
    private GameStatus status = GameStatus.ACTIVE;
    private final Deque<Board> history = new ArrayDeque<>();     // Memento: snapshots for undo
    private final List<Move> moves = new ArrayList<>();

    String move(String from, String to) {
        if (status == GameStatus.CHECKMATE || status == GameStatus.STALEMATE) return "game over: " + status;
        Position f = Position.of(from), t = Position.of(to);
        Piece p = board.at(f);
        if (p == null) return "illegal: no piece on " + from;
        if (p.color != turn) return "illegal: it is " + turn + "'s turn";
        for (Move m : MoveValidator.legalMoves(board, turn, f)) {
            if (m.to().equals(t)) {
                history.push(board.copy());
                board.apply(m);
                moves.add(m);
                turn = turn.opposite();
                updateStatus();
                return "ok " + m + (status == GameStatus.ACTIVE ? "" : " -> " + status);
            }
        }
        boolean pseudo = p.pseudoLegalMoves(board, f).stream().anyMatch(m -> m.to().equals(t));
        return pseudo ? "illegal: " + from + "-" + to + " would leave your king in check" : "illegal: " + p.type() + " cannot move like that";
    }

    boolean undo() {
        if (history.isEmpty()) return false;
        board = history.pop();
        moves.remove(moves.size() - 1);
        turn = turn.opposite();
        updateStatus();
        return true;
    }

    private void updateStatus() {
        boolean inCheck = board.isAttacked(board.kingOf(turn), turn.opposite());
        boolean canMove = !MoveValidator.allLegalMoves(board, turn).isEmpty();
        status = canMove ? (inCheck ? GameStatus.CHECK : GameStatus.ACTIVE) : (inCheck ? GameStatus.CHECKMATE : GameStatus.STALEMATE);
    }
    GameStatus status() { return status; }
    Board board() { return board; }
}

public class ChessDemo {
    public static void main(String[] args) {
        System.out.println("perft(1..3) = " + MoveValidator.perft(Board.standard(), Color.WHITE, 1) + ", "
            + MoveValidator.perft(Board.standard(), Color.WHITE, 2) + ", "
            + MoveValidator.perft(Board.standard(), Color.WHITE, 3) + "   (expected 20, 400, 8902)");

        Game g = new Game();
        System.out.println(g.move("e2", "e5"));           // pawn cannot jump 3
        System.out.println(g.move("e7", "e5"));           // wrong turn
        String[][] scholar = { {"e2", "e4"}, {"e7", "e5"}, {"f1", "c4"}, {"b8", "c6"}, {"d1", "h5"}, {"g8", "f6"}, {"h5", "f7"} };
        for (String[] m : scholar) System.out.println(m[0] + m[1] + ": " + g.move(m[0], m[1]));
        System.out.println(g.board().render());
        System.out.println("status = " + g.status());     // CHECKMATE
        g.undo();
        System.out.println("after undo: " + g.status() + ", white to move again");
        System.out.println("black tries to move: " + g.move("a7", "a6"));      // not black's turn
        System.out.println("replay Qxf7: " + g.move("h5", "f7"));
    }
}`;
  var CHESS_CORE_PY = String.raw`
# ===== Chess core: pieces know HOW they move; the rule engine knows WHAT is legal =====
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Color(Enum):
    WHITE = 0
    BLACK = 1

    def opposite(self) -> "Color":
        return Color.BLACK if self is Color.WHITE else Color.WHITE


class PieceType(Enum):
    KING = "K"
    QUEEN = "Q"
    ROOK = "R"
    BISHOP = "B"
    KNIGHT = "N"
    PAWN = "P"


# row 0 = rank 1, col 0 = file a.  "e4" -> (3, 4)
@dataclass(frozen=True)
class Position:
    row: int
    col: int

    @staticmethod
    def of(sq: str) -> "Position":
        return Position(ord(sq[1]) - ord("1"), ord(sq[0]) - ord("a"))

    def on_board(self) -> bool:
        return 0 <= self.row < 8 and 0 <= self.col < 8

    def plus(self, dr: int, dc: int) -> "Position":
        return Position(self.row + dr, self.col + dc)

    def __str__(self) -> str:
        return chr(ord("a") + self.col) + chr(ord("1") + self.row)


class MoveType(Enum):
    NORMAL = 0
    DOUBLE_PAWN = 1
    EN_PASSANT = 2
    CASTLE_KING = 3
    CASTLE_QUEEN = 4
    PROMOTION = 5


@dataclass(frozen=True)
class Move:
    src: Position
    dst: Position
    type: MoveType

    def __str__(self) -> str:
        suffix = "" if self.type is MoveType.NORMAL else f"({self.type.name})"
        return f"{self.src}-{self.dst}{suffix}"


STRAIGHT = [(1, 0), (-1, 0), (0, 1), (0, -1)]
DIAGONAL = [(1, 1), (1, -1), (-1, 1), (-1, -1)]
ALL8 = STRAIGHT + DIAGONAL
KNIGHT_JUMPS = [(2, 1), (2, -1), (-2, 1), (-2, -1), (1, 2), (1, -2), (-1, 2), (-1, -2)]


# Pieces are immutable: no position, no has-moved flag. The Board owns that state.
class Piece(ABC):
    def __init__(self, color: Color) -> None:
        self.color = color

    @property
    @abstractmethod
    def type(self) -> PieceType: ...

    # Moves that follow the piece's movement rule, ignoring "does this leave my king in check?"
    @abstractmethod
    def pseudo_legal_moves(self, b: "Board", src: Position) -> list[Move]: ...

    # Squares this piece attacks (used for check detection). Same as moves for most pieces.
    def attacks(self, b: "Board", src: Position) -> list[Position]:
        return [m.dst for m in self.pseudo_legal_moves(b, src)]

    def symbol(self) -> str:
        s = self.type.value
        return s if self.color is Color.WHITE else s.lower()

    # Rook/Bishop/Queen: walk each direction until the edge or a piece.
    def slide(self, b: "Board", src: Position, dirs: list[tuple[int, int]]) -> list[Move]:
        out: list[Move] = []
        for dr, dc in dirs:
            p = src.plus(dr, dc)
            while p.on_board():
                occ = b.at(p)
                if occ is None:
                    out.append(Move(src, p, MoveType.NORMAL))
                else:
                    if occ.color is not self.color:
                        out.append(Move(src, p, MoveType.NORMAL))     # capture
                    break                                              # blocked either way
                p = p.plus(dr, dc)
        return out

    # King/Knight: fixed jumps.
    def jumps(self, b: "Board", src: Position, deltas: list[tuple[int, int]]) -> list[Move]:
        out: list[Move] = []
        for dr, dc in deltas:
            p = src.plus(dr, dc)
            if p.on_board():
                occ = b.at(p)
                if occ is None or occ.color is not self.color:
                    out.append(Move(src, p, MoveType.NORMAL))
        return out


class Rook(Piece):
    @property
    def type(self) -> PieceType: return PieceType.ROOK
    def pseudo_legal_moves(self, b: "Board", src: Position) -> list[Move]: return self.slide(b, src, STRAIGHT)


class Bishop(Piece):
    @property
    def type(self) -> PieceType: return PieceType.BISHOP
    def pseudo_legal_moves(self, b: "Board", src: Position) -> list[Move]: return self.slide(b, src, DIAGONAL)


class Queen(Piece):
    @property
    def type(self) -> PieceType: return PieceType.QUEEN
    def pseudo_legal_moves(self, b: "Board", src: Position) -> list[Move]: return self.slide(b, src, ALL8)


class Knight(Piece):
    @property
    def type(self) -> PieceType: return PieceType.KNIGHT
    def pseudo_legal_moves(self, b: "Board", src: Position) -> list[Move]: return self.jumps(b, src, KNIGHT_JUMPS)


class King(Piece):
    @property
    def type(self) -> PieceType: return PieceType.KING

    # attacks = one step only (castling never attacks anything; also avoids infinite recursion)
    def attacks(self, b: "Board", src: Position) -> list[Position]:
        return [m.dst for m in self.jumps(b, src, ALL8)]

    def pseudo_legal_moves(self, b: "Board", src: Position) -> list[Move]:
        out = self.jumps(b, src, ALL8)
        r = 0 if self.color is Color.WHITE else 7
        enemy = self.color.opposite()
        if src != Position(r, 4) or b.is_attacked(src, enemy):           # cannot castle out of check
            return out
        k, q = ("K", "Q") if self.color is Color.WHITE else ("k", "q")
        if (k in b.castling and b.at(Position(r, 5)) is None and b.at(Position(r, 6)) is None
                and not b.is_attacked(Position(r, 5), enemy) and not b.is_attacked(Position(r, 6), enemy)):
            out.append(Move(src, Position(r, 6), MoveType.CASTLE_KING))
        if (q in b.castling and b.at(Position(r, 3)) is None and b.at(Position(r, 2)) is None
                and b.at(Position(r, 1)) is None
                and not b.is_attacked(Position(r, 3), enemy) and not b.is_attacked(Position(r, 2), enemy)):
            out.append(Move(src, Position(r, 2), MoveType.CASTLE_QUEEN))
        return out


class Pawn(Piece):
    @property
    def type(self) -> PieceType: return PieceType.PAWN

    def _dir(self) -> int:
        return 1 if self.color is Color.WHITE else -1

    def attacks(self, b: "Board", src: Position) -> list[Position]:   # pawns capture diagonally, move straight
        return [p for p in (src.plus(self._dir(), dc) for dc in (-1, 1)) if p.on_board()]

    def pseudo_legal_moves(self, b: "Board", src: Position) -> list[Move]:
        out: list[Move] = []
        start_row, last_row = (1, 7) if self.color is Color.WHITE else (6, 0)
        one = src.plus(self._dir(), 0)
        if one.on_board() and b.at(one) is None:
            out.append(Move(src, one, MoveType.PROMOTION if one.row == last_row else MoveType.NORMAL))
            two = src.plus(2 * self._dir(), 0)
            if src.row == start_row and b.at(two) is None:
                out.append(Move(src, two, MoveType.DOUBLE_PAWN))
        for d in self.attacks(b, src):
            t = b.at(d)
            if t is not None and t.color is not self.color:
                out.append(Move(src, d, MoveType.PROMOTION if d.row == last_row else MoveType.NORMAL))
            elif t is None and d == b.en_passant_target:
                out.append(Move(src, d, MoveType.EN_PASSANT))
        return out


# The Board = the full position: squares + castling rights + en-passant square.
class Board:
    def __init__(self) -> None:
        self._grid: list[list[Optional[Piece]]] = [[None] * 8 for _ in range(8)]
        self.castling = "KQkq"                            # FEN-style rights still available
        self.en_passant_target: Optional[Position] = None  # square a pawn may capture INTO this move

    def at(self, p: Position) -> Optional[Piece]:
        return self._grid[p.row][p.col]

    def put(self, p: Position, x: Optional[Piece]) -> None:
        self._grid[p.row][p.col] = x

    @staticmethod
    def standard() -> "Board":
        b = Board()
        for c in range(8):
            b._grid[1][c] = Pawn(Color.WHITE)
            b._grid[6][c] = Pawn(Color.BLACK)
        for s in (Color.WHITE, Color.BLACK):
            r = 0 if s is Color.WHITE else 7
            for c, kind in enumerate([Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook]):
                b._grid[r][c] = kind(s)
        return b

    def copy(self) -> "Board":                            # pieces are immutable, so a shallow grid copy is enough
        b = Board()
        b._grid = [row[:] for row in self._grid]
        b.castling = self.castling
        b.en_passant_target = self.en_passant_target
        return b

    def king_of(self, c: Color) -> Position:
        for r in range(8):
            for col in range(8):
                p = self._grid[r][col]
                if p is not None and p.color is c and p.type is PieceType.KING:
                    return Position(r, col)
        raise RuntimeError(f"no {c.name} king")

    def is_attacked(self, target: Position, by: Color) -> bool:
        for r in range(8):
            for c in range(8):
                p = self._grid[r][c]
                if p is not None and p.color is by and target in p.attacks(self, Position(r, c)):
                    return True
        return False

    # Executes a move that is already known to be legal; handles all special rules.
    def apply(self, m: Move) -> None:
        p = self.at(m.src)
        assert p is not None
        self.put(m.dst, p)
        self.put(m.src, None)
        r = m.src.row
        if m.type is MoveType.EN_PASSANT:
            self.put(Position(r, m.dst.col), None)         # captured pawn is beside us
        elif m.type is MoveType.CASTLE_KING:
            self.put(Position(r, 5), self.at(Position(r, 7)))
            self.put(Position(r, 7), None)
        elif m.type is MoveType.CASTLE_QUEEN:
            self.put(Position(r, 3), self.at(Position(r, 0)))
            self.put(Position(r, 0), None)
        elif m.type is MoveType.PROMOTION:
            self.put(m.dst, Queen(p.color))                # auto-queen (extension: ask player)
        self.en_passant_target = (Position((m.src.row + m.dst.row) // 2, m.src.col)
                                  if m.type is MoveType.DOUBLE_PAWN else None)
        self._lose_rights(m.src)
        self._lose_rights(m.dst)                           # a captured rook also loses rights

    def _lose_rights(self, sq: Position) -> None:
        lost = {"e1": "KQ", "h1": "K", "a1": "Q", "e8": "kq", "h8": "k", "a8": "q"}.get(str(sq), "")
        self.castling = "".join(ch for ch in self.castling if ch not in lost)

    def render(self) -> str:
        lines = []
        for r in range(7, -1, -1):
            cells = "".join((self._grid[r][c].symbol() if self._grid[r][c] else ".") + " " for c in range(8))
            lines.append(f"{r + 1} {cells}")
        return "\n".join(lines) + "\n  a b c d e f g h"


# Rule engine: the ONLY place that knows "a move may not leave your own king in check".
class MoveValidator:
    @staticmethod
    def legal_moves(b: Board, side: Color, src: Position) -> list[Move]:
        p = b.at(src)
        if p is None or p.color is not side:
            return []
        legal = []
        for m in p.pseudo_legal_moves(b, src):
            nxt = b.copy()                                 # copy-make: simulate, then test
            nxt.apply(m)
            if not nxt.is_attacked(nxt.king_of(side), side.opposite()):
                legal.append(m)
        return legal

    @staticmethod
    def all_legal_moves(b: Board, side: Color) -> list[Move]:
        return [m for r in range(8) for c in range(8) for m in MoveValidator.legal_moves(b, side, Position(r, c))]

    # perft = count leaf positions at a depth; the standard way to test a move generator.
    @staticmethod
    def perft(b: Board, side: Color, depth: int) -> int:
        if depth == 0:
            return 1
        n = 0
        for m in MoveValidator.all_legal_moves(b, side):
            nxt = b.copy()
            nxt.apply(m)
            n += MoveValidator.perft(nxt, side.opposite(), depth - 1)
        return n


class GameStatus(Enum):
    ACTIVE = 0
    CHECK = 1
    CHECKMATE = 2
    STALEMATE = 3


class Game:
    def __init__(self) -> None:
        self._board = Board.standard()
        self._turn = Color.WHITE
        self._status = GameStatus.ACTIVE
        self._history: list[Board] = []                    # Memento: snapshots for undo
        self._moves: list[Move] = []

    def move(self, src: str, dst: str) -> str:
        if self._status in (GameStatus.CHECKMATE, GameStatus.STALEMATE):
            return f"game over: {self._status.name}"
        f, t = Position.of(src), Position.of(dst)
        p = self._board.at(f)
        if p is None:
            return f"illegal: no piece on {src}"
        if p.color is not self._turn:
            return f"illegal: it is {self._turn.name}'s turn"
        for m in MoveValidator.legal_moves(self._board, self._turn, f):
            if m.dst == t:
                self._history.append(self._board.copy())
                self._board.apply(m)
                self._moves.append(m)
                self._turn = self._turn.opposite()
                self._update_status()
                tail = "" if self._status is GameStatus.ACTIVE else f" -> {self._status.name}"
                return f"ok {m}{tail}"
        pseudo = any(m.dst == t for m in p.pseudo_legal_moves(self._board, f))
        return (f"illegal: {src}-{dst} would leave your king in check" if pseudo
                else f"illegal: {p.type.name} cannot move like that")

    def undo(self) -> bool:
        if not self._history:
            return False
        self._board = self._history.pop()
        self._moves.pop()
        self._turn = self._turn.opposite()
        self._update_status()
        return True

    def _update_status(self) -> None:
        in_check = self._board.is_attacked(self._board.king_of(self._turn), self._turn.opposite())
        can_move = bool(MoveValidator.all_legal_moves(self._board, self._turn))
        if can_move:
            self._status = GameStatus.CHECK if in_check else GameStatus.ACTIVE
        else:
            self._status = GameStatus.CHECKMATE if in_check else GameStatus.STALEMATE

    @property
    def status(self) -> GameStatus:
        return self._status

    @property
    def board(self) -> Board:
        return self._board


def main() -> None:
    p1, p2, p3 = (MoveValidator.perft(Board.standard(), Color.WHITE, d) for d in (1, 2, 3))
    print(f"perft(1..3) = {p1}, {p2}, {p3}   (expected 20, 400, 8902)")

    g = Game()
    print(g.move("e2", "e5"))                     # pawn cannot jump 3
    print(g.move("e7", "e5"))                     # wrong turn
    scholar = [("e2", "e4"), ("e7", "e5"), ("f1", "c4"), ("b8", "c6"), ("d1", "h5"), ("g8", "f6"), ("h5", "f7")]
    for a, b in scholar:
        print(f"{a}{b}: {g.move(a, b)}")
    print(g.board.render())
    print(f"status = {g.status.name}")            # CHECKMATE
    g.undo()
    print(f"after undo: {g.status.name}, white to move again")
    print(f"black tries to move: {g.move('a7', 'a6')}")      # not black's turn
    print(f"replay Qxf7: {g.move('h5', 'f7')}")


if __name__ == "__main__":
    main()`;
  var CHESS_CORE_TS = String.raw`
// ===== Chess core: pieces know HOW they move; the rule engine knows WHAT is legal =====

enum Color { WHITE, BLACK }
const opposite = (c: Color): Color => (c === Color.WHITE ? Color.BLACK : Color.WHITE);

enum PieceType { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN }
const SYMBOL: Record<PieceType, string> = {
  [PieceType.KING]: "K", [PieceType.QUEEN]: "Q", [PieceType.ROOK]: "R",
  [PieceType.BISHOP]: "B", [PieceType.KNIGHT]: "N", [PieceType.PAWN]: "P",
};

// row 0 = rank 1, col 0 = file a.  "e4" -> (3, 4)
class Position {
  constructor(readonly row: number, readonly col: number) {}
  static of(sq: string): Position {
    return new Position(sq.charCodeAt(1) - "1".charCodeAt(0), sq.charCodeAt(0) - "a".charCodeAt(0));
  }
  onBoard(): boolean { return this.row >= 0 && this.row < 8 && this.col >= 0 && this.col < 8; }
  plus(dr: number, dc: number): Position { return new Position(this.row + dr, this.col + dc); }
  equals(o: Position | null): boolean { return o !== null && o.row === this.row && o.col === this.col; }
  toString(): string { return String.fromCharCode(97 + this.col) + String.fromCharCode(49 + this.row); }
}

enum MoveType { NORMAL, DOUBLE_PAWN, EN_PASSANT, CASTLE_KING, CASTLE_QUEEN, PROMOTION }

class Move {
  constructor(readonly from: Position, readonly to: Position, readonly type: MoveType) {}
  toString(): string {
    return this.from + "-" + this.to + (this.type === MoveType.NORMAL ? "" : "(" + MoveType[this.type] + ")");
  }
}

type Dir = readonly [number, number];
const STRAIGHT: Dir[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAL: Dir[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ALL8: Dir[] = [...STRAIGHT, ...DIAGONAL];
const KNIGHT_JUMPS: Dir[] = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];

// Pieces are immutable: no position, no hasMoved flag. The Board owns that state.
abstract class Piece {
  constructor(readonly color: Color) {}
  abstract type(): PieceType;
  // Moves that follow the piece's movement rule, ignoring "does this leave my king in check?"
  abstract pseudoLegalMoves(b: Board, from: Position): Move[];
  // Squares this piece attacks (used for check detection). Same as moves for most pieces.
  attacks(b: Board, from: Position): Position[] { return this.pseudoLegalMoves(b, from).map((m) => m.to); }
  symbol(): string {
    const s = SYMBOL[this.type()];
    return this.color === Color.WHITE ? s : s.toLowerCase();
  }

  // Rook/Bishop/Queen: walk each direction until the edge or a piece.
  protected slide(b: Board, from: Position, dirs: readonly Dir[]): Move[] {
    const out: Move[] = [];
    for (const [dr, dc] of dirs) {
      for (let p = from.plus(dr, dc); p.onBoard(); p = p.plus(dr, dc)) {
        const occ = b.at(p);
        if (occ === null) { out.push(new Move(from, p, MoveType.NORMAL)); continue; }
        if (occ.color !== this.color) out.push(new Move(from, p, MoveType.NORMAL));   // capture
        break;                                                                         // blocked either way
      }
    }
    return out;
  }
  // King/Knight: fixed jumps.
  protected jumps(b: Board, from: Position, deltas: readonly Dir[]): Move[] {
    const out: Move[] = [];
    for (const [dr, dc] of deltas) {
      const p = from.plus(dr, dc);
      if (!p.onBoard()) continue;
      const occ = b.at(p);
      if (occ === null || occ.color !== this.color) out.push(new Move(from, p, MoveType.NORMAL));
    }
    return out;
  }
}

class Rook extends Piece {
  type(): PieceType { return PieceType.ROOK; }
  pseudoLegalMoves(b: Board, f: Position): Move[] { return this.slide(b, f, STRAIGHT); }
}
class Bishop extends Piece {
  type(): PieceType { return PieceType.BISHOP; }
  pseudoLegalMoves(b: Board, f: Position): Move[] { return this.slide(b, f, DIAGONAL); }
}
class Queen extends Piece {
  type(): PieceType { return PieceType.QUEEN; }
  pseudoLegalMoves(b: Board, f: Position): Move[] { return this.slide(b, f, ALL8); }
}
class Knight extends Piece {
  type(): PieceType { return PieceType.KNIGHT; }
  pseudoLegalMoves(b: Board, f: Position): Move[] { return this.jumps(b, f, KNIGHT_JUMPS); }
}

class King extends Piece {
  type(): PieceType { return PieceType.KING; }
  // attacks = one step only (castling never attacks anything; also avoids infinite recursion)
  override attacks(b: Board, f: Position): Position[] { return this.jumps(b, f, ALL8).map((m) => m.to); }
  pseudoLegalMoves(b: Board, f: Position): Move[] {
    const out = this.jumps(b, f, ALL8);
    const r = this.color === Color.WHITE ? 0 : 7;
    const enemy = opposite(this.color);
    if (!f.equals(new Position(r, 4)) || b.isAttacked(f, enemy)) return out;      // cannot castle out of check
    const [k, q] = this.color === Color.WHITE ? ["K", "Q"] : ["k", "q"];
    const free = (...cols: number[]): boolean => cols.every((c) => b.at(new Position(r, c)) === null);
    const safe = (...cols: number[]): boolean => cols.every((c) => !b.isAttacked(new Position(r, c), enemy));
    if (b.castling.includes(k) && free(5, 6) && safe(5, 6)) out.push(new Move(f, new Position(r, 6), MoveType.CASTLE_KING));
    if (b.castling.includes(q) && free(3, 2, 1) && safe(3, 2)) out.push(new Move(f, new Position(r, 2), MoveType.CASTLE_QUEEN));
    return out;
  }
}

class Pawn extends Piece {
  type(): PieceType { return PieceType.PAWN; }
  private dir(): number { return this.color === Color.WHITE ? 1 : -1; }
  override attacks(b: Board, f: Position): Position[] {   // pawns capture diagonally, move straight
    return [-1, 1].map((dc) => f.plus(this.dir(), dc)).filter((p) => p.onBoard());
  }
  pseudoLegalMoves(b: Board, f: Position): Move[] {
    const out: Move[] = [];
    const startRow = this.color === Color.WHITE ? 1 : 6;
    const lastRow = this.color === Color.WHITE ? 7 : 0;
    const one = f.plus(this.dir(), 0);
    if (one.onBoard() && b.at(one) === null) {
      out.push(new Move(f, one, one.row === lastRow ? MoveType.PROMOTION : MoveType.NORMAL));
      const two = f.plus(2 * this.dir(), 0);
      if (f.row === startRow && b.at(two) === null) out.push(new Move(f, two, MoveType.DOUBLE_PAWN));
    }
    for (const d of this.attacks(b, f)) {
      const t = b.at(d);
      if (t !== null && t.color !== this.color) out.push(new Move(f, d, d.row === lastRow ? MoveType.PROMOTION : MoveType.NORMAL));
      else if (t === null && d.equals(b.enPassantTarget)) out.push(new Move(f, d, MoveType.EN_PASSANT));
    }
    return out;
  }
}

// The Board = the full position: squares + castling rights + en-passant square.
class Board {
  private grid: (Piece | null)[][] = Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));
  castling = "KQkq";                            // FEN-style rights still available
  enPassantTarget: Position | null = null;      // square a pawn may capture INTO this move, or null

  at(p: Position): Piece | null { return this.grid[p.row][p.col]; }
  put(p: Position, x: Piece | null): void { this.grid[p.row][p.col] = x; }

  static standard(): Board {
    const b = new Board();
    for (let c = 0; c < 8; c++) { b.grid[1][c] = new Pawn(Color.WHITE); b.grid[6][c] = new Pawn(Color.BLACK); }
    for (const s of [Color.WHITE, Color.BLACK]) {
      const r = s === Color.WHITE ? 0 : 7;
      b.grid[r] = [new Rook(s), new Knight(s), new Bishop(s), new Queen(s), new King(s), new Bishop(s), new Knight(s), new Rook(s)];
    }
    return b;
  }

  copy(): Board {                               // pieces are immutable, so a shallow grid copy is enough
    const b = new Board();
    b.grid = this.grid.map((row) => row.slice());
    b.castling = this.castling;
    b.enPassantTarget = this.enPassantTarget;
    return b;
  }

  kingOf(c: Color): Position {
    for (let r = 0; r < 8; r++) for (let col = 0; col < 8; col++) {
      const p = this.grid[r][col];
      if (p !== null && p.color === c && p.type() === PieceType.KING) return new Position(r, col);
    }
    throw new Error("no " + Color[c] + " king");
  }

  isAttacked(target: Position, by: Color): boolean {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.grid[r][c];
      if (p !== null && p.color === by && p.attacks(this, new Position(r, c)).some((a) => a.equals(target))) return true;
    }
    return false;
  }

  // Executes a move that is already known to be legal; handles all special rules.
  apply(m: Move): void {
    const p = this.at(m.from)!;
    this.put(m.to, p);
    this.put(m.from, null);
    const r = m.from.row;
    switch (m.type) {
      case MoveType.EN_PASSANT: this.put(new Position(r, m.to.col), null); break;      // captured pawn is beside us
      case MoveType.CASTLE_KING: this.put(new Position(r, 5), this.at(new Position(r, 7))); this.put(new Position(r, 7), null); break;
      case MoveType.CASTLE_QUEEN: this.put(new Position(r, 3), this.at(new Position(r, 0))); this.put(new Position(r, 0), null); break;
      case MoveType.PROMOTION: this.put(m.to, new Queen(p.color)); break;               // auto-queen (extension: ask player)
      default: break;
    }
    this.enPassantTarget = m.type === MoveType.DOUBLE_PAWN ? new Position((m.from.row + m.to.row) / 2, m.from.col) : null;
    this.loseRights(m.from);
    this.loseRights(m.to);                                                              // a captured rook also loses rights
  }
  private loseRights(sq: Position): void {
    const lost: Record<string, string> = { e1: "KQ", h1: "K", a1: "Q", e8: "kq", h8: "k", a8: "q" };
    const gone = lost[sq.toString()] ?? "";
    this.castling = [...this.castling].filter((ch) => !gone.includes(ch)).join("");
  }

  render(): string {
    const lines: string[] = [];
    for (let r = 7; r >= 0; r--) {
      lines.push((r + 1) + " " + this.grid[r].map((p) => (p === null ? "." : p.symbol()) + " ").join(""));
    }
    return lines.join("\n") + "\n  a b c d e f g h";
  }
}

// Rule engine: the ONLY place that knows "a move may not leave your own king in check".
class MoveValidator {
  static legalMoves(b: Board, side: Color, from: Position): Move[] {
    const p = b.at(from);
    if (p === null || p.color !== side) return [];
    return p.pseudoLegalMoves(b, from).filter((m) => {
      const next = b.copy();                    // copy-make: simulate, then test
      next.apply(m);
      return !next.isAttacked(next.kingOf(side), opposite(side));
    });
  }
  static allLegalMoves(b: Board, side: Color): Move[] {
    const all: Move[] = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) all.push(...MoveValidator.legalMoves(b, side, new Position(r, c)));
    return all;
  }
  // perft = count leaf positions at a depth; the standard way to test a move generator.
  static perft(b: Board, side: Color, depth: number): number {
    if (depth === 0) return 1;
    let n = 0;
    for (const m of MoveValidator.allLegalMoves(b, side)) {
      const next = b.copy();
      next.apply(m);
      n += MoveValidator.perft(next, opposite(side), depth - 1);
    }
    return n;
  }
}

enum GameStatus { ACTIVE, CHECK, CHECKMATE, STALEMATE }

class Game {
  private boardNow = Board.standard();
  private turn = Color.WHITE;
  private statusNow = GameStatus.ACTIVE;
  private readonly history: Board[] = [];       // Memento: snapshots for undo
  private readonly moves: Move[] = [];

  move(from: string, to: string): string {
    if (this.statusNow === GameStatus.CHECKMATE || this.statusNow === GameStatus.STALEMATE) return "game over: " + GameStatus[this.statusNow];
    const f = Position.of(from), t = Position.of(to);
    const p = this.boardNow.at(f);
    if (p === null) return "illegal: no piece on " + from;
    if (p.color !== this.turn) return "illegal: it is " + Color[this.turn] + "'s turn";
    for (const m of MoveValidator.legalMoves(this.boardNow, this.turn, f)) {
      if (m.to.equals(t)) {
        this.history.push(this.boardNow.copy());
        this.boardNow.apply(m);
        this.moves.push(m);
        this.turn = opposite(this.turn);
        this.updateStatus();
        return "ok " + m + (this.statusNow === GameStatus.ACTIVE ? "" : " -> " + GameStatus[this.statusNow]);
      }
    }
    const pseudo = p.pseudoLegalMoves(this.boardNow, f).some((m) => m.to.equals(t));
    return pseudo ? "illegal: " + from + "-" + to + " would leave your king in check"
                  : "illegal: " + PieceType[p.type()] + " cannot move like that";
  }

  undo(): boolean {
    const previous = this.history.pop();
    if (previous === undefined) return false;
    this.boardNow = previous;
    this.moves.pop();
    this.turn = opposite(this.turn);
    this.updateStatus();
    return true;
  }

  private updateStatus(): void {
    const inCheck = this.boardNow.isAttacked(this.boardNow.kingOf(this.turn), opposite(this.turn));
    const canMove = MoveValidator.allLegalMoves(this.boardNow, this.turn).length > 0;
    this.statusNow = canMove ? (inCheck ? GameStatus.CHECK : GameStatus.ACTIVE)
                             : (inCheck ? GameStatus.CHECKMATE : GameStatus.STALEMATE);
  }
  status(): GameStatus { return this.statusNow; }
  board(): Board { return this.boardNow; }
}

function main(): void {
  const perft = [1, 2, 3].map((d) => MoveValidator.perft(Board.standard(), Color.WHITE, d));
  console.log("perft(1..3) = " + perft.join(", ") + "   (expected 20, 400, 8902)");

  const g = new Game();
  console.log(g.move("e2", "e5"));              // pawn cannot jump 3
  console.log(g.move("e7", "e5"));              // wrong turn
  const scholar = [["e2", "e4"], ["e7", "e5"], ["f1", "c4"], ["b8", "c6"], ["d1", "h5"], ["g8", "f6"], ["h5", "f7"]];
  for (const [a, b] of scholar) console.log(a + b + ": " + g.move(a, b));
  console.log(g.board().render());
  console.log("status = " + GameStatus[g.status()]);   // CHECKMATE
  g.undo();
  console.log("after undo: " + GameStatus[g.status()] + ", white to move again");
  console.log("black tries to move: " + g.move("a7", "a6"));      // not black's turn
  console.log("replay Qxf7: " + g.move("h5", "f7"));
}

main();`;
  var CHESS_CORE_CPP = String.raw`
// ===== Chess core: pieces know HOW they move; the rule engine knows WHAT is legal =====

enum class Color { WHITE, BLACK };
Color opposite(Color c) { return c == Color::WHITE ? Color::BLACK : Color::WHITE; }
string name(Color c) { return c == Color::WHITE ? "WHITE" : "BLACK"; }

enum class PieceType { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN };
string name(PieceType t) {
    static const char* names[] = {"KING", "QUEEN", "ROOK", "BISHOP", "KNIGHT", "PAWN"};
    return names[static_cast<int>(t)];
}

// row 0 = rank 1, col 0 = file a.  "e4" -> (3, 4)
struct Position {
    int row, col;
    static Position of(const string& sq) { return {sq[1] - '1', sq[0] - 'a'}; }
    bool onBoard() const { return row >= 0 && row < 8 && col >= 0 && col < 8; }
    Position plus(int dr, int dc) const { return {row + dr, col + dc}; }
    bool operator==(const Position&) const = default;
    string toString() const { return string{static_cast<char>('a' + col), static_cast<char>('1' + row)}; }
};

enum class MoveType { NORMAL, DOUBLE_PAWN, EN_PASSANT, CASTLE_KING, CASTLE_QUEEN, PROMOTION };
string name(MoveType t) {
    static const char* names[] = {"NORMAL", "DOUBLE_PAWN", "EN_PASSANT", "CASTLE_KING", "CASTLE_QUEEN", "PROMOTION"};
    return names[static_cast<int>(t)];
}

struct Move {
    Position from, to;
    MoveType type;
    string toString() const {
        return from.toString() + "-" + to.toString() + (type == MoveType::NORMAL ? "" : "(" + name(type) + ")");
    }
};

using Dir = pair<int, int>;
const vector<Dir> STRAIGHT = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
const vector<Dir> DIAGONAL = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
const vector<Dir> ALL8 = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
const vector<Dir> KNIGHT_JUMPS = {{2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2}};

class Board;

// Pieces are immutable: no position, no hasMoved flag. The Board owns that state.
class Piece {
public:
    const Color color;
    explicit Piece(Color c) : color(c) {}
    virtual ~Piece() = default;
    virtual PieceType type() const = 0;
    // Moves that follow the piece's movement rule, ignoring "does this leave my king in check?"
    virtual vector<Move> pseudoLegalMoves(const Board& b, Position from) const = 0;
    // Squares this piece attacks (used for check detection). Same as moves for most pieces.
    virtual vector<Position> attacks(const Board& b, Position from) const;
    char symbol() const {
        static const char sym[] = {'K', 'Q', 'R', 'B', 'N', 'P'};
        char s = sym[static_cast<int>(type())];
        return color == Color::WHITE ? s : static_cast<char>(tolower(s));
    }
protected:
    vector<Move> slide(const Board& b, Position from, const vector<Dir>& dirs) const;   // Rook/Bishop/Queen
    vector<Move> jumps(const Board& b, Position from, const vector<Dir>& deltas) const; // King/Knight
};

class Rook : public Piece {
public:
    using Piece::Piece;
    PieceType type() const override { return PieceType::ROOK; }
    vector<Move> pseudoLegalMoves(const Board& b, Position f) const override { return slide(b, f, STRAIGHT); }
};
class Bishop : public Piece {
public:
    using Piece::Piece;
    PieceType type() const override { return PieceType::BISHOP; }
    vector<Move> pseudoLegalMoves(const Board& b, Position f) const override { return slide(b, f, DIAGONAL); }
};
class Queen : public Piece {
public:
    using Piece::Piece;
    PieceType type() const override { return PieceType::QUEEN; }
    vector<Move> pseudoLegalMoves(const Board& b, Position f) const override { return slide(b, f, ALL8); }
};
class Knight : public Piece {
public:
    using Piece::Piece;
    PieceType type() const override { return PieceType::KNIGHT; }
    vector<Move> pseudoLegalMoves(const Board& b, Position f) const override { return jumps(b, f, KNIGHT_JUMPS); }
};
class King : public Piece {
public:
    using Piece::Piece;
    PieceType type() const override { return PieceType::KING; }
    vector<Position> attacks(const Board& b, Position f) const override;
    vector<Move> pseudoLegalMoves(const Board& b, Position f) const override;
};
class Pawn : public Piece {
    int dir() const { return color == Color::WHITE ? 1 : -1; }
public:
    using Piece::Piece;
    PieceType type() const override { return PieceType::PAWN; }
    vector<Position> attacks(const Board& b, Position f) const override;
    vector<Move> pseudoLegalMoves(const Board& b, Position f) const override;
};

// The Board = the full position: squares + castling rights + en-passant square.
class Board {
    // shared_ptr<const Piece>: pieces never change, so copying a Board just copies the pointers.
    array<array<shared_ptr<const Piece>, 8>, 8> grid;
    void loseRights(Position sq) {
        static const map<string, string> lost = {{"e1", "KQ"}, {"h1", "K"}, {"a1", "Q"}, {"e8", "kq"}, {"h8", "k"}, {"a8", "q"}};
        auto it = lost.find(sq.toString());
        if (it == lost.end()) return;
        string kept;
        for (char ch : castling) if (it->second.find(ch) == string::npos) kept += ch;
        castling = kept;
    }
public:
    string castling = "KQkq";                 // FEN-style rights still available
    optional<Position> enPassantTarget;       // square a pawn may capture INTO this move, or empty

    const Piece* at(Position p) const { return grid[p.row][p.col].get(); }
    void put(Position p, shared_ptr<const Piece> x) { grid[p.row][p.col] = move(x); }

    static Board standard() {
        Board b;
        for (int c = 0; c < 8; c++) {
            b.grid[1][c] = make_shared<Pawn>(Color::WHITE);
            b.grid[6][c] = make_shared<Pawn>(Color::BLACK);
        }
        for (Color s : {Color::WHITE, Color::BLACK}) {
            int r = s == Color::WHITE ? 0 : 7;
            b.grid[r] = {make_shared<Rook>(s), make_shared<Knight>(s), make_shared<Bishop>(s), make_shared<Queen>(s),
                         make_shared<King>(s), make_shared<Bishop>(s), make_shared<Knight>(s), make_shared<Rook>(s)};
        }
        return b;
    }

    Position kingOf(Color c) const {
        for (int r = 0; r < 8; r++) for (int col = 0; col < 8; col++) {
            const Piece* p = grid[r][col].get();
            if (p && p->color == c && p->type() == PieceType::KING) return {r, col};
        }
        throw logic_error("no " + name(c) + " king");
    }

    bool isAttacked(Position target, Color by) const {
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            const Piece* p = grid[r][c].get();
            if (!p || p->color != by) continue;
            for (Position a : p->attacks(*this, {r, c})) if (a == target) return true;
        }
        return false;
    }

    // Executes a move that is already known to be legal; handles all special rules.
    void apply(const Move& m) {
        shared_ptr<const Piece> p = grid[m.from.row][m.from.col];
        put(m.to, p);
        put(m.from, nullptr);
        int r = m.from.row;
        switch (m.type) {
            case MoveType::EN_PASSANT: put({r, m.to.col}, nullptr); break;              // captured pawn is beside us
            case MoveType::CASTLE_KING: put({r, 5}, grid[r][7]); put({r, 7}, nullptr); break;
            case MoveType::CASTLE_QUEEN: put({r, 3}, grid[r][0]); put({r, 0}, nullptr); break;
            case MoveType::PROMOTION: put(m.to, make_shared<Queen>(p->color)); break;   // auto-queen (extension: ask player)
            default: break;
        }
        enPassantTarget = m.type == MoveType::DOUBLE_PAWN ? optional<Position>(Position{(m.from.row + m.to.row) / 2, m.from.col}) : nullopt;
        loseRights(m.from);
        loseRights(m.to);                                                               // a captured rook also loses rights
    }

    string render() const {
        string out;
        for (int r = 7; r >= 0; r--) {
            out += to_string(r + 1) + " ";
            for (int c = 0; c < 8; c++) { out += grid[r][c] ? grid[r][c]->symbol() : '.'; out += ' '; }
            out += '\n';
        }
        return out + "  a b c d e f g h";
    }
};

vector<Position> Piece::attacks(const Board& b, Position from) const {
    vector<Position> out;
    for (const Move& m : pseudoLegalMoves(b, from)) out.push_back(m.to);
    return out;
}
vector<Move> Piece::slide(const Board& b, Position from, const vector<Dir>& dirs) const {
    vector<Move> out;
    for (auto [dr, dc] : dirs) {
        for (Position p = from.plus(dr, dc); p.onBoard(); p = p.plus(dr, dc)) {
            const Piece* occ = b.at(p);
            if (!occ) { out.push_back({from, p, MoveType::NORMAL}); continue; }
            if (occ->color != color) out.push_back({from, p, MoveType::NORMAL});   // capture
            break;                                                                  // blocked either way
        }
    }
    return out;
}
vector<Move> Piece::jumps(const Board& b, Position from, const vector<Dir>& deltas) const {
    vector<Move> out;
    for (auto [dr, dc] : deltas) {
        Position p = from.plus(dr, dc);
        if (!p.onBoard()) continue;
        const Piece* occ = b.at(p);
        if (!occ || occ->color != color) out.push_back({from, p, MoveType::NORMAL});
    }
    return out;
}

// attacks = one step only (castling never attacks anything; also avoids infinite recursion)
vector<Position> King::attacks(const Board& b, Position f) const {
    vector<Position> out;
    for (const Move& m : jumps(b, f, ALL8)) out.push_back(m.to);
    return out;
}
vector<Move> King::pseudoLegalMoves(const Board& b, Position f) const {
    vector<Move> out = jumps(b, f, ALL8);
    int r = color == Color::WHITE ? 0 : 7;
    Color enemy = opposite(color);
    if (!(f == Position{r, 4}) || b.isAttacked(f, enemy)) return out;                // cannot castle out of check
    char k = color == Color::WHITE ? 'K' : 'k', q = color == Color::WHITE ? 'Q' : 'q';
    auto free = [&](initializer_list<int> cols) { return all_of(cols.begin(), cols.end(), [&](int c) { return !b.at({r, c}); }); };
    auto safe = [&](initializer_list<int> cols) { return all_of(cols.begin(), cols.end(), [&](int c) { return !b.isAttacked({r, c}, enemy); }); };
    if (b.castling.find(k) != string::npos && free({5, 6}) && safe({5, 6})) out.push_back({f, {r, 6}, MoveType::CASTLE_KING});
    if (b.castling.find(q) != string::npos && free({3, 2, 1}) && safe({3, 2})) out.push_back({f, {r, 2}, MoveType::CASTLE_QUEEN});
    return out;
}

vector<Position> Pawn::attacks(const Board&, Position f) const {   // pawns capture diagonally, move straight
    vector<Position> out;
    for (int dc : {-1, 1}) { Position p = f.plus(dir(), dc); if (p.onBoard()) out.push_back(p); }
    return out;
}
vector<Move> Pawn::pseudoLegalMoves(const Board& b, Position f) const {
    vector<Move> out;
    int startRow = color == Color::WHITE ? 1 : 6, lastRow = color == Color::WHITE ? 7 : 0;
    Position one = f.plus(dir(), 0);
    if (one.onBoard() && !b.at(one)) {
        out.push_back({f, one, one.row == lastRow ? MoveType::PROMOTION : MoveType::NORMAL});
        Position two = f.plus(2 * dir(), 0);
        if (f.row == startRow && !b.at(two)) out.push_back({f, two, MoveType::DOUBLE_PAWN});
    }
    for (Position d : attacks(b, f)) {
        const Piece* t = b.at(d);
        if (t && t->color != color) out.push_back({f, d, d.row == lastRow ? MoveType::PROMOTION : MoveType::NORMAL});
        else if (!t && b.enPassantTarget && d == *b.enPassantTarget) out.push_back({f, d, MoveType::EN_PASSANT});
    }
    return out;
}

// Rule engine: the ONLY place that knows "a move may not leave your own king in check".
class MoveValidator {
public:
    MoveValidator() = delete;
    static vector<Move> legalMoves(const Board& b, Color side, Position from) {
        const Piece* p = b.at(from);
        if (!p || p->color != side) return {};
        vector<Move> legal;
        for (const Move& m : p->pseudoLegalMoves(b, from)) {
            Board next = b;                                  // copy-make: simulate, then test
            next.apply(m);
            if (!next.isAttacked(next.kingOf(side), opposite(side))) legal.push_back(m);
        }
        return legal;
    }
    static vector<Move> allLegalMoves(const Board& b, Color side) {
        vector<Move> all;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            vector<Move> ms = legalMoves(b, side, {r, c});
            all.insert(all.end(), ms.begin(), ms.end());
        }
        return all;
    }
    // perft = count leaf positions at a depth; the standard way to test a move generator.
    static long long perft(const Board& b, Color side, int depth) {
        if (depth == 0) return 1;
        long long n = 0;
        for (const Move& m : allLegalMoves(b, side)) { Board next = b; next.apply(m); n += perft(next, opposite(side), depth - 1); }
        return n;
    }
};

enum class GameStatus { ACTIVE, CHECK, CHECKMATE, STALEMATE };
string name(GameStatus s) {
    static const char* names[] = {"ACTIVE", "CHECK", "CHECKMATE", "STALEMATE"};
    return names[static_cast<int>(s)];
}

class Game {
    Board board_ = Board::standard();
    Color turn = Color::WHITE;
    GameStatus status_ = GameStatus::ACTIVE;
    vector<Board> history;                        // Memento: snapshots for undo
    vector<Move> moves;

    void updateStatus() {
        bool inCheck = board_.isAttacked(board_.kingOf(turn), opposite(turn));
        bool canMove = !MoveValidator::allLegalMoves(board_, turn).empty();
        status_ = canMove ? (inCheck ? GameStatus::CHECK : GameStatus::ACTIVE)
                          : (inCheck ? GameStatus::CHECKMATE : GameStatus::STALEMATE);
    }
public:
    string move(const string& from, const string& to) {
        if (status_ == GameStatus::CHECKMATE || status_ == GameStatus::STALEMATE) return "game over: " + name(status_);
        Position f = Position::of(from), t = Position::of(to);
        const Piece* p = board_.at(f);
        if (!p) return "illegal: no piece on " + from;
        if (p->color != turn) return "illegal: it is " + name(turn) + "'s turn";
        for (const Move& m : MoveValidator::legalMoves(board_, turn, f)) {
            if (m.to == t) {
                history.push_back(board_);
                board_.apply(m);
                moves.push_back(m);
                turn = opposite(turn);
                updateStatus();
                return "ok " + m.toString() + (status_ == GameStatus::ACTIVE ? "" : " -> " + name(status_));
            }
        }
        bool pseudo = false;
        for (const Move& m : p->pseudoLegalMoves(board_, f)) if (m.to == t) pseudo = true;
        return pseudo ? "illegal: " + from + "-" + to + " would leave your king in check"
                      : "illegal: " + name(p->type()) + " cannot move like that";
    }

    bool undo() {
        if (history.empty()) return false;
        board_ = history.back();
        history.pop_back();
        moves.pop_back();
        turn = opposite(turn);
        updateStatus();
        return true;
    }
    GameStatus status() const { return status_; }
    const Board& board() const { return board_; }
};

int main() {
    cout << "perft(1..3) = " << MoveValidator::perft(Board::standard(), Color::WHITE, 1) << ", "
         << MoveValidator::perft(Board::standard(), Color::WHITE, 2) << ", "
         << MoveValidator::perft(Board::standard(), Color::WHITE, 3) << "   (expected 20, 400, 8902)\n";

    Game g;
    cout << g.move("e2", "e5") << "\n";           // pawn cannot jump 3
    cout << g.move("e7", "e5") << "\n";           // wrong turn
    vector<pair<string, string>> scholar = {{"e2", "e4"}, {"e7", "e5"}, {"f1", "c4"}, {"b8", "c6"}, {"d1", "h5"}, {"g8", "f6"}, {"h5", "f7"}};
    for (const auto& [a, b] : scholar) cout << a << b << ": " << g.move(a, b) << "\n";
    cout << g.board().render() << "\n";
    cout << "status = " << name(g.status()) << "\n";      // CHECKMATE
    g.undo();
    cout << "after undo: " << name(g.status()) << ", white to move again\n";
    cout << "black tries to move: " << g.move("a7", "a6") << "\n";      // not black's turn
    cout << "replay Qxf7: " << g.move("h5", "f7") << "\n";
}`;

  /* ---- JS mini move generator for the board visualizer (no castling / en passant) ---- */
  var CH_UNI = { wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙', bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟' };
  var CH_NAME = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };
  var CH_STR = [[1, 0], [-1, 0], [0, 1], [0, -1]], CH_DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var CH_KN = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
  var CH_DIRNAME = { '1,0': 'up', '-1,0': 'down', '0,1': 'right', '0,-1': 'left', '1,1': 'up-right', '1,-1': 'up-left', '-1,1': 'down-right', '-1,-1': 'down-left' };
  function chSq(r, c) { return 'abcdefgh'[c] + (r + 1); }
  function chOn(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function chParseSq(s) {
    var m = /^([a-h])([1-8])$/.exec(s);
    if (!m) throw new Error('Bad square "' + s + '" — use a1..h8');
    return [m[2].charCodeAt(0) - 49, m[1].charCodeAt(0) - 97];
  }
  function chParse(input) {
    var b = [], r, sel = null, kings = { w: 0, b: 0 }, count = 0;
    for (r = 0; r < 8; r++) b.push([null, null, null, null, null, null, null, null]);
    String(input === undefined ? '' : input).split('|').forEach(function (sec) {
      var kv = sec.split(':');
      if (kv.length !== 2) return;
      var key = kv[0].trim().toLowerCase(), val = kv[1].trim();
      if (key === 'select') { sel = chParseSq(val.toLowerCase()); return; }
      var col = key === 'white' ? 'w' : key === 'black' ? 'b' : null;
      if (!col) throw new Error('Sections must be white:, black:, select:');
      val.split(/[\s,]+/).filter(function (x) { return x; }).forEach(function (tok) {
        var t = tok.charAt(0).toUpperCase(), sq = tok.slice(1).toLowerCase();
        if (!CH_NAME[t]) throw new Error('Piece "' + tok + '": start with K, Q, R, B, N or P, e.g. Ke1');
        var p = chParseSq(sq);
        if (b[p[0]][p[1]]) throw new Error('Two pieces on ' + sq);
        if (t === 'P' && (p[0] === 0 || p[0] === 7)) throw new Error('Pawns cannot stand on rank 1 or 8 (' + tok + ')');
        if (++count > 32) throw new Error('At most 32 pieces');
        b[p[0]][p[1]] = { c: col, t: t };
        if (t === 'K') kings[col]++;
      });
    });
    if (kings.w !== 1 || kings.b !== 1) throw new Error('Each side needs exactly one king (K)');
    if (!sel) throw new Error('Add "| select: e2" to choose the piece to inspect');
    if (!b[sel[0]][sel[1]]) throw new Error('No piece on the selected square ' + chSq(sel[0], sel[1]));
    return { b: b, sel: sel };
  }
  // is square (r,c) attacked by colour `by`? returns attacker [r,c] or null
  function chAttacker(b, r, c, by) {
    var i, d, rr, cc, p;
    for (i = 0; i < 8; i++) { rr = r + CH_KN[i][0]; cc = c + CH_KN[i][1]; if (chOn(rr, cc) && (p = b[rr][cc]) && p.c === by && p.t === 'N') return [rr, cc]; }
    for (i = 0; i < 8; i++) { d = CH_STR.concat(CH_DIAG)[i]; rr = r + d[0]; cc = c + d[1]; if (chOn(rr, cc) && (p = b[rr][cc]) && p.c === by && p.t === 'K') return [rr, cc]; }
    var pr = by === 'w' ? r - 1 : r + 1;
    for (i = -1; i <= 1; i += 2) { cc = c + i; if (chOn(pr, cc) && (p = b[pr][cc]) && p.c === by && p.t === 'P') return [pr, cc]; }
    var sets = [[CH_STR, 'R'], [CH_DIAG, 'B']];
    for (var s = 0; s < 2; s++) for (i = 0; i < 4; i++) {
      d = sets[s][0][i];
      for (rr = r + d[0], cc = c + d[1]; chOn(rr, cc); rr += d[0], cc += d[1]) {
        p = b[rr][cc];
        if (!p) continue;
        if (p.c === by && (p.t === sets[s][1] || p.t === 'Q')) return [rr, cc];
        break;
      }
    }
    return null;
  }
  function chKing(b, col) { for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) if (b[r][c] && b[r][c].c === col && b[r][c].t === 'K') return [r, c]; return null; }
  // pseudo-legal moves, grouped into "rays" for explanation
  function chPseudo(b, r, c) {
    var p = b[r][c], rays = [], i;
    function ray(name, list, stop) { rays.push({ name: name, sq: list, stop: stop }); }
    if (p.t === 'R' || p.t === 'B' || p.t === 'Q') {
      var dirs = p.t === 'R' ? CH_STR : p.t === 'B' ? CH_DIAG : CH_STR.concat(CH_DIAG);
      dirs.forEach(function (d) {
        var list = [], stop = null;
        for (var rr = r + d[0], cc = c + d[1]; chOn(rr, cc); rr += d[0], cc += d[1]) {
          var q = b[rr][cc];
          if (!q) { list.push({ r: rr, c: cc }); continue; }
          if (q.c !== p.c) { list.push({ r: rr, c: cc, cap: true }); stop = { r: rr, c: cc, why: 'capture' }; } else stop = { r: rr, c: cc, why: 'own' };
          break;
        }
        ray(CH_DIRNAME[d[0] + ',' + d[1]], list, stop);
      });
    } else if (p.t === 'N' || p.t === 'K') {
      var list = [], blocked = [];
      (p.t === 'N' ? CH_KN : CH_STR.concat(CH_DIAG)).forEach(function (d) {
        var rr = r + d[0], cc = c + d[1];
        if (!chOn(rr, cc)) return;
        var q = b[rr][cc];
        if (!q) list.push({ r: rr, c: cc }); else if (q.c !== p.c) list.push({ r: rr, c: cc, cap: true }); else blocked.push({ r: rr, c: cc });
      });
      rays.push({ name: p.t === 'N' ? 'L-shaped jumps (can leap over pieces)' : 'one step in any direction', sq: list, blocked: blocked });
    } else {
      var dir = p.c === 'w' ? 1 : -1, start = p.c === 'w' ? 1 : 6, fw = [], cap = [];
      if (chOn(r + dir, c) && !b[r + dir][c]) {
        fw.push({ r: r + dir, c: c });
        if (r === start && !b[r + 2 * dir][c]) fw.push({ r: r + 2 * dir, c: c });
      }
      for (i = -1; i <= 1; i += 2) if (chOn(r + dir, c + i) && b[r + dir][c + i] && b[r + dir][c + i].c !== p.c) cap.push({ r: r + dir, c: c + i, cap: true });
      rays.push({ name: 'straight forward (1, or 2 from the start rank), never captures', sq: fw });
      rays.push({ name: 'diagonal forward, ONLY to capture', sq: cap });
    }
    return rays;
  }
  function chGrid(b, hl, label) {
    var rows = [], h = {};
    for (var i = 0; i < 8; i++) { var r = 7 - i, row = []; for (var c = 0; c < 8; c++) { var p = b[r][c]; row.push(p ? CH_UNI[p.c + p.t] : '·'); } rows.push(row); }
    Object.keys(hl).forEach(function (k) { var a = k.split(','); h[(7 - +a[0]) + ',' + a[1]] = hl[k]; });
    return GRID(label || 'Board (rank 8 at top, as White sees it)', rows, ['8', '7', '6', '5', '4', '3', '2', '1'], ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], h);
  }
  function chessViz(input) {
    var P = chParse(input), b = P.b, sr = P.sel[0], sc = P.sel[1], me = b[sr][sc], side = me.c, enemy = side === 'w' ? 'b' : 'w';
    var sideName = side === 'w' ? 'White' : 'Black', frames = [], hl = {};
    var kingSq = chKing(b, side), checker = chAttacker(b, kingSq[0], kingSq[1], enemy);
    hl[sr + ',' + sc] = 'sel';
    frames.push(F('The position. We inspect the <b>' + sideName + ' ' + CH_NAME[me.t] + '</b> on <b>' + chSq(sr, sc) + '</b> (purple). Legal-move generation is a two-stage funnel: <b>(1)</b> what the piece\'s movement rule allows (pseudo-legal), then <b>(2)</b> throw away any move that leaves your own king attacked.' + (checker ? ' ' + H.c('r', sideName + ' is IN CHECK right now') + ' from ' + chSq(checker[0], checker[1]) + ' — only moves that fix the check will survive stage 2.' : ''), [chGrid(b, hl), VARS('state', { sideToMove: sideName, piece: CH_NAME[me.t] + ' ' + chSq(sr, sc), inCheck: checker ? 'YES' : 'no' }, checker ? { inCheck: 'bad' } : {})]));
    var rays = chPseudo(b, sr, sc), cand = [];
    rays.forEach(function (ry) {
      var h2 = clone(hl), why;
      ry.sq.forEach(function (s) { h2[s.r + ',' + s.c] = s.cap ? 'cur' : 'win'; cand.push(s); });
      (ry.blocked || []).forEach(function (s) { h2[s.r + ',' + s.c] = 'done'; });
      if (ry.stop) h2[ry.stop.r + ',' + ry.stop.c] = ry.stop.why === 'capture' ? 'cur' : 'done';
      why = ry.sq.length ? ry.sq.length + ' square(s): ' + ry.sq.map(function (s) { return chSq(s.r, s.c) + (s.cap ? '×' : ''); }).join(', ') + '.' : 'no squares.';
      if (ry.stop) why += ry.stop.why === 'capture' ? ' Stops at ' + chSq(ry.stop.r, ry.stop.c) + ' — an enemy piece: we may capture it (amber) but not pass it.' : ' Blocked by our own piece on ' + chSq(ry.stop.r, ry.stop.c) + ' (faded): cannot land on or pass it.';
      if (ry.blocked && ry.blocked.length) why += ' Squares with our own pieces (faded) are excluded.';
      frames.push(F('Stage 1, <b>' + ry.name + '</b>: ' + why, [chGrid(b, h2), CODE('Piece rule (stage 1)', me.t === 'N' || me.t === 'K' ? 'for (int[] d : deltas) {\n  Position p = from.plus(d[0], d[1]);\n  if (p.onBoard() && (empty(p) || enemy(p))) add(p);\n}' : me.t === 'P' ? 'if (empty(one)) add(one);\nif (onStartRank && empty(one) && empty(two)) add(two);\nfor (diag : diagonals) if (enemy(diag)) add(diag);' : 'for (p = from + d; p.onBoard(); p = p + d) {\n  if (empty(p)) { add(p); continue; }\n  if (enemy(p)) add(p);   // capture\n  break;                  // blocked\n}', { 2: 'cur', 3: 'ok' })]));
    });
    var h3 = clone(hl);
    cand.forEach(function (s) { h3[s.r + ',' + s.c] = s.cap ? 'cur' : 'win'; });
    frames.push(F('Stage 1 result: <b>' + cand.length + '</b> pseudo-legal move(s) (blue, captures amber). Now stage 2: for EACH one, <b>simulate</b> it on a copy of the board and ask "is my king attacked?"', [chGrid(b, h3), TABLE('Candidates', ['#', 'move'], cand.map(function (s, i) { return [i + 1, chSq(sr, sc) + '→' + chSq(s.r, s.c) + (s.cap ? ' (capture)' : '')]; }))]));
    var legal = [], rows = [], shown = 0;
    cand.forEach(function (s) {
      var save = b[s.r][s.c];
      b[s.r][s.c] = me; b[sr][sc] = null;
      var k = me.t === 'K' ? [s.r, s.c] : kingSq, att = chAttacker(b, k[0], k[1], enemy);
      b[sr][sc] = me; b[s.r][s.c] = save;
      var mv = chSq(sr, sc) + '→' + chSq(s.r, s.c);
      if (att) {
        rows.push([mv, H.c('r', 'ILLEGAL'), 'king on ' + chSq(k[0], k[1]) + ' would be hit from ' + chSq(att[0], att[1])]);
        if (shown++ < 4) {
          var h4 = clone(hl); h4[s.r + ',' + s.c] = 'bad'; h4[att[0] + ',' + att[1]] = 'bad'; h4[k[0] + ',' + k[1]] = 'cur';
          frames.push(F('Simulate <b>' + mv + '</b>: afterwards the ' + sideName + ' king on ' + chSq(k[0], k[1]) + ' would be attacked by the piece on <b>' + chSq(att[0], att[1]) + '</b>. ' + H.c('r', 'Rejected.') + (me.t === 'K' ? ' A king may never step onto an attacked square.' : checker ? ' This move does not solve the check.' : ' Our piece was <b>pinned</b>: it was the only thing shielding the king.'), [chGrid(b, h4), CODE('Rule engine (stage 2)', 'Board next = board.copy();\nnext.apply(move);\nif (next.isAttacked(next.kingOf(side), enemy))\n  reject(move);   // leaves own king in check', { 3: 'bad', 4: 'bad' })]));
        }
      } else { legal.push(s); rows.push([mv, H.c('g', 'legal'), s.cap ? 'captures ' + CH_NAME[save.t] : 'king stays safe']); }
    });
    var h5 = clone(hl);
    legal.forEach(function (s) { h5[s.r + ',' + s.c] = s.cap ? 'cur' : 'ok'; });
    frames.push(F('Final answer: <b>' + legal.length + '</b> legal move(s) for the ' + CH_NAME[me.t] + ' (green, captures amber). ' + (legal.length < cand.length ? (cand.length - legal.length) + ' pseudo-legal move(s) were removed by the king-safety check.' : 'Nothing was removed — the king was never in danger.'), [chGrid(b, h5), TABLE('Stage 2 verdicts', ['move', 'verdict', 'reason'], rows.length ? rows : [['—', '—', 'no candidates']])]));
    // whole-side status
    var total = 0;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var q = b[r][c];
      if (!q || q.c !== side) continue;
      chPseudo(b, r, c).forEach(function (ry) {
        ry.sq.forEach(function (s) {
          var save = b[s.r][s.c]; b[s.r][s.c] = q; b[r][c] = null;
          var k = q.t === 'K' ? [s.r, s.c] : kingSq;
          if (!chAttacker(b, k[0], k[1], enemy)) total++;
          b[r][c] = q; b[s.r][s.c] = save;
        });
      });
    }
    var status = total ? (checker ? 'CHECK' : 'ACTIVE') : (checker ? 'CHECKMATE' : 'STALEMATE');
    frames.push(F('Game status for ' + sideName + ': run the same funnel for <b>every</b> piece → <b>' + total + '</b> legal move(s) in total. ' + (status === 'CHECKMATE' ? H.c('r', 'In check with no legal moves = CHECKMATE.') : status === 'STALEMATE' ? H.c('y', 'Not in check but no legal moves = STALEMATE (draw).') : 'The game goes on (' + status + ').') + ' (This visualizer skips castling and en passant; the full code in the topic handles both.)', [chGrid(b, hl), TABLE('Status rule', ['in check?', 'any legal move?', 'status'], [['no', 'yes', 'ACTIVE'], ['yes', 'yes', 'CHECK'], ['yes', 'no', 'CHECKMATE'], ['no', 'no', 'STALEMATE']], one(['ACTIVE', 'CHECK', 'CHECKMATE', 'STALEMATE'].indexOf(status), 'sel'))]));
    return frames;
  }

  var CH_NODES = [
    B('GM', 'Game (turn, status, history)', 14, 8, 26), B('PL', 'Player', 42, 8, 12), B('MV', 'MoveValidator (rule engine)', 72, 8, 28),
    B('BD', 'Board (grid, castling, ep)', 14, 34, 26), B('MO', 'Move(from,to,type)', 46, 34, 20), B('PS', 'Position(row,col)', 76, 34, 20),
    B('PC', 'Piece «abstract»', 14, 60, 18), B('SL', 'Rook / Bishop / Queen', 42, 60, 22), B('JP', 'King / Knight', 66, 60, 16), B('PW', 'Pawn', 88, 60, 10)
  ];
  var CH_EDGES = [['GM', 'PL', '2'], ['GM', 'MV', 'asks'], ['GM', 'BD', 'owns'], ['MV', 'BD', 'copy + apply'], ['BD', 'PC', '8×8'], ['MV', 'MO', 'produces'], ['MO', 'PS', 'from/to'],
    ['SL', 'PC', 'is-a (slide)'], ['JP', 'PC', 'is-a (jump)'], ['PW', 'PC', 'is-a']];
  function chessClassViz() {
    return classTour('Chess — class diagram', CH_NODES, CH_EDGES, [
      { narr: 'Chess in one picture. The key design decision: <b>pieces know how they MOVE</b>, the <b>MoveValidator knows what is LEGAL</b>, the <b>Game knows whose TURN it is and the result</b>. Three jobs, three places.', on: [] },
      { narr: '<b>Piece</b> is abstract with one polymorphic method <code>pseudoLegalMoves(board, from)</code>. Sliding pieces share a <code>slide(dirs)</code> helper; King and Knight share <code>jumps(deltas)</code>; Pawn is special (direction, double step, diagonal capture, promotion, en passant).', on: ['PC', 'SL', 'JP', 'PW'], edges: ['SL-PC', 'JP-PC', 'PW-PC'],
        code: 'class Bishop extends Piece {\n  List<Move> pseudoLegalMoves(Board b, Position f) {\n    return slide(b, f, DIAGONAL);\n  }\n}', codeHl: { 3: 'ok' } },
      { narr: 'Pieces are <b>immutable</b> and do not store their own square. The <b>Board</b> stores the 8×8 grid plus the state the rules need: <b>castling rights</b> and the <b>en-passant square</b>. That makes <code>copy()</code> cheap and undo trivial.', on: ['BD', 'PC'], edges: ['BD-PC'] },
      { narr: '<b>Move</b> and <b>Position</b> are small value records. <code>Move</code> carries a <b>type</b> (NORMAL, DOUBLE_PAWN, EN_PASSANT, CASTLE_KING, CASTLE_QUEEN, PROMOTION) so <code>Board.apply()</code> knows the side effects (move the rook, remove the passed pawn, promote).', on: ['MO', 'PS'], edges: ['MO-PS'] },
      { narr: '<b>MoveValidator</b> (the rule engine): for each pseudo-legal move, copy the board, apply, and reject it if our king is attacked. This one rule covers pins, moving into check, and having to answer a check — no special cases needed.', on: ['MV', 'BD', 'MO'], edges: ['MV-BD', 'MV-MO'], cls: 'sel',
        code: 'for (Move m : piece.pseudoLegalMoves(b, from)) {\n  Board next = b.copy();\n  next.apply(m);\n  if (!next.isAttacked(next.kingOf(side), enemy)) legal.add(m);\n}', codeHl: { 4: 'ok' } },
      { narr: '<b>Game</b> runs the flow: check turn → ask validator → apply → switch turn → compute status (CHECK / CHECKMATE / STALEMATE) → push a snapshot for <b>undo</b> (Memento). <b>Player</b> can be Human or AI (Strategy) without the Game caring.', on: ['GM', 'PL', 'MV'], edges: ['GM-PL', 'GM-MV', 'GM-BD'],
        table: { label: 'Patterns in the chess design', cols: ['Pattern', 'Where'], rows: [['Polymorphism / Template', 'Piece.pseudoLegalMoves, slide/jumps helpers'], ['Strategy', 'Player: HumanPlayer, BotPlayer'], ['Memento / Command', 'undo via board snapshots or Move objects'], ['Factory', 'Board.standard(), FEN parser'], ['Observer', 'UI / clocks listening to move events']] } }
    ], 68);
  }

  topics.push({
    title: 'Chess: Board, Pieces, Move Validation, Check, Checkmate & Special Moves',
    analogy: `<p>Think of a <b>football match</b>. Each player knows <b>how they are allowed to move</b> (the goalkeeper may use hands, others may not). But there is also a <b>referee</b> who checks rules that depend on the <b>whole field</b> — offside, whose turn for a free kick, has the game ended. A player cannot judge offside alone; the referee looks at everyone.</p><p>Chess design is the same split. Each <b>piece</b> knows its own movement shape ("bishop goes diagonally"). The <b>rule engine</b> (referee) checks things that need the whole board: "is the path blocked?", "would this leave your king under attack?", "is it checkmate?". The <b>game</b> is the match organiser: whose turn, the move history, the final result.</p>`,
    explain: `<p><b>Why it is an "expert" LLD question:</b> the class diagram looks easy (Board, Piece, Player, Game), but the interviewer is really testing <b>where you put the rules</b>. Put everything in one class and it becomes a 1,000-line monster. Put the king-safety check inside every piece and you duplicate it six times.</p>
<p><b>The funnel for a legal move</b> (the visualizer animates it on a real board):</p>
${H.table(['Stage', 'Question', 'Who answers', 'Example rejection'], [
  ['0. Basic', 'Is there a piece of the side to move on <i>from</i>?', '<code>Game</code>', 'Black tries to move on White\'s turn'],
  ['1. Pseudo-legal', 'Does the piece\'s movement rule reach <i>to</i>? Is the path clear? Not landing on own piece?', '<code>Piece.pseudoLegalMoves()</code>', 'Rook jumping over a pawn'],
  ['2. Legal', 'After the move, is my own king attacked?', '<code>MoveValidator</code> (simulate on a copy)', 'Moving a pinned knight; king stepping next to enemy queen'],
  ['3. Result', 'Does the opponent have any legal move? Are they in check?', '<code>Game.updateStatus()</code>', '—  (decides CHECK / CHECKMATE / STALEMATE)']
])}
<p><b>Why stage 2 is "simulate, then test":</b> the rule "you may not leave your king in check" covers three situations at once — <b>pins</b> (moving a piece that shields the king), <b>walking into check</b>, and <b>failing to answer a check</b>. Instead of three special-case algorithms, we apply the move on a <b>copy</b> of the board and ask one question: <code>isAttacked(myKing, enemy)</code>. Simple, obviously correct, and fast enough for an interview (and for a UI).</p>
<p><b>Classes:</b> <code>Color</code>, <code>PieceType</code> (enums); <code>Position</code>, <code>Move</code> (records); <code>Piece</code> (abstract) with <code>Rook/Bishop/Queen</code> (share <code>slide</code>), <code>King/Knight</code> (share <code>jumps</code>), <code>Pawn</code>; <code>Board</code> (grid + castling rights + en-passant square, <code>copy()</code>, <code>apply()</code>, <code>isAttacked()</code>); <code>MoveValidator</code>; <code>Game</code> (turn, status, history, undo); <code>Player</code> (human/bot).</p>
<p><b>Special moves, in plain words:</b></p>
<ul>
<li><b>Castling</b>: king moves two squares toward a rook, rook jumps over. Allowed only if neither has moved (tracked as <i>rights</i>), squares between are empty, the king is not in check and does not pass through or land on an attacked square.</li>
<li><b>En passant</b>: if an enemy pawn just moved two squares and landed beside your pawn, you may capture it as if it had moved one — <b>only on the very next move</b>. So the board remembers one "en-passant target square" that is cleared after every move.</li>
<li><b>Promotion</b>: a pawn reaching the last rank becomes (usually) a queen.</li>
</ul>
<p><b>The naive design (brute force) and why it breaks:</b> a <code>switch(pieceType)</code> inside <code>Game.move()</code> that only checks the <b>shape</b> of the move. It ${H.c('r', 'lets rooks jump over pieces')}, ${H.c('r', 'lets pinned pieces move')}, ${H.c('r', 'lets the king walk into check')}, and every new rule (castling, en passant) is another branch in the same method. The good design gives each rule exactly one home.</p>`,
    clues: [
      '"Design a chess game" / "validate a move" → abstract Piece with polymorphic move generation + a separate rule engine for check.',
      '"A move is illegal if it leaves the king in check" → simulate on a copy (copy-make) and test <code>isAttacked</code>.',
      '"Support undo" → Memento (board snapshots) or Command (Move objects with undo data).',
      '"Players can be humans or AI" → Strategy for Player; Game does not care who chooses the move.',
      '"Add a new piece / variant (Chess960, a Camel piece)" → new Piece subclass or rule plug-in; Open/Closed.',
      '"Detect checkmate and stalemate" → count all legal moves of the side to move + in-check flag.',
      '"Online multiplayer / timers" → Observer for move events, Game state machine, server-side validation.'
    ],
    code: [{ lang: 'java', code: CHESS_CORE, alt: [{ lang: 'python', code: CHESS_CORE_PY }, { lang: 'ts', code: CHESS_CORE_TS }, { lang: 'cpp', code: CHESS_CORE_CPP },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

// ===== Chess core: pieces know HOW they move; the rule engine knows WHAT is legal =====

enum Color { WHITE, BLACK }
static class ColorExt { public static Color Opposite(this Color c) { return c == Color.WHITE ? Color.BLACK : Color.WHITE; } }

enum PieceType { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN }
static class PieceTypeExt { public static char Symbol(this PieceType t) { return "KQRBNP"[(int)t]; } }

// row 0 = rank 1, col 0 = file a.  "e4" -> (3, 4)
sealed class Position : IEquatable<Position> {
    public readonly int Row, Col;
    public Position(int row, int col) { Row = row; Col = col; }
    public static Position Of(string sq) { return new Position(sq[1] - '1', sq[0] - 'a'); }
    public bool OnBoard() { return Row >= 0 && Row < 8 && Col >= 0 && Col < 8; }
    public Position Plus(int dr, int dc) { return new Position(Row + dr, Col + dc); }
    public bool Equals(Position o) { return o != null && o.Row == Row && o.Col == Col; }
    public override bool Equals(object o) { return Equals(o as Position); }
    public override int GetHashCode() { return Row * 8 + Col; }
    public override string ToString() { return "" + (char)('a' + Col) + (char)('1' + Row); }
}

enum MoveType { NORMAL, DOUBLE_PAWN, EN_PASSANT, CASTLE_KING, CASTLE_QUEEN, PROMOTION }

sealed class Move {
    public readonly Position From, To; public readonly MoveType Type;
    public Move(Position from, Position to, MoveType type) { From = from; To = to; Type = type; }
    public override string ToString() { return From + "-" + To + (Type == MoveType.NORMAL ? "" : "(" + Type + ")"); }
}

// Pieces are immutable: no position, no hasMoved flag. The Board owns that state.
abstract class Piece {
    public readonly Color Color;
    protected Piece(Color color) { Color = color; }
    public abstract PieceType Type();
    // Moves that follow the piece's movement rule, ignoring "does this leave my king in check?"
    public abstract List<Move> PseudoLegalMoves(Board b, Position from);
    // Squares this piece attacks (used for check detection). Same as moves for most pieces.
    public virtual List<Position> Attacks(Board b, Position from) { return PseudoLegalMoves(b, from).Select(m => m.To).ToList(); }
    public char Symbol() { return Color == Color.WHITE ? Type().Symbol() : char.ToLower(Type().Symbol()); }

    // Rook/Bishop/Queen: walk each direction until the edge or a piece.
    protected List<Move> Slide(Board b, Position from, int[][] dirs) {
        List<Move> result = new List<Move>();
        foreach (int[] d in dirs) {
            for (Position p = from.Plus(d[0], d[1]); p.OnBoard(); p = p.Plus(d[0], d[1])) {
                Piece occ = b.At(p);
                if (occ == null) { result.Add(new Move(from, p, MoveType.NORMAL)); continue; }
                if (occ.Color != Color) result.Add(new Move(from, p, MoveType.NORMAL));   // capture
                break;                                                                     // blocked either way
            }
        }
        return result;
    }
    // King/Knight: fixed jumps.
    protected List<Move> Jumps(Board b, Position from, int[][] deltas) {
        List<Move> result = new List<Move>();
        foreach (int[] d in deltas) {
            Position p = from.Plus(d[0], d[1]);
            if (p.OnBoard() && (b.At(p) == null || b.At(p).Color != Color)) result.Add(new Move(from, p, MoveType.NORMAL));
        }
        return result;
    }
    protected static readonly int[][] STRAIGHT = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
    protected static readonly int[][] DIAGONAL = { new[] { 1, 1 }, new[] { 1, -1 }, new[] { -1, 1 }, new[] { -1, -1 } };
    protected static readonly int[][] ALL8 = STRAIGHT.Concat(DIAGONAL).ToArray();
}

class Rook : Piece { public Rook(Color c) : base(c) { } public override PieceType Type() { return PieceType.ROOK; }
    public override List<Move> PseudoLegalMoves(Board b, Position f) { return Slide(b, f, STRAIGHT); } }
class Bishop : Piece { public Bishop(Color c) : base(c) { } public override PieceType Type() { return PieceType.BISHOP; }
    public override List<Move> PseudoLegalMoves(Board b, Position f) { return Slide(b, f, DIAGONAL); } }
class Queen : Piece { public Queen(Color c) : base(c) { } public override PieceType Type() { return PieceType.QUEEN; }
    public override List<Move> PseudoLegalMoves(Board b, Position f) { return Slide(b, f, ALL8); } }
class Knight : Piece { public Knight(Color c) : base(c) { } public override PieceType Type() { return PieceType.KNIGHT; }
    static readonly int[][] L = { new[] { 2, 1 }, new[] { 2, -1 }, new[] { -2, 1 }, new[] { -2, -1 }, new[] { 1, 2 }, new[] { 1, -2 }, new[] { -1, 2 }, new[] { -1, -2 } };
    public override List<Move> PseudoLegalMoves(Board b, Position f) { return Jumps(b, f, L); } }

class King : Piece {
    public King(Color c) : base(c) { }
    public override PieceType Type() { return PieceType.KING; }
    // attacks = one step only (castling never attacks anything; also avoids infinite recursion)
    public override List<Position> Attacks(Board b, Position f) { return Jumps(b, f, ALL8).Select(m => m.To).ToList(); }
    public override List<Move> PseudoLegalMoves(Board b, Position f) {
        List<Move> result = Jumps(b, f, ALL8);
        int r = Color == Color.WHITE ? 0 : 7;
        Color enemy = Color.Opposite();
        if (!f.Equals(new Position(r, 4)) || b.IsAttacked(f, enemy)) return result;       // cannot castle out of check
        char k = Color == Color.WHITE ? 'K' : 'k', q = Color == Color.WHITE ? 'Q' : 'q';
        if (b.Castling.IndexOf(k) >= 0 && b.At(new Position(r, 5)) == null && b.At(new Position(r, 6)) == null
                && !b.IsAttacked(new Position(r, 5), enemy) && !b.IsAttacked(new Position(r, 6), enemy))
            result.Add(new Move(f, new Position(r, 6), MoveType.CASTLE_KING));
        if (b.Castling.IndexOf(q) >= 0 && b.At(new Position(r, 3)) == null && b.At(new Position(r, 2)) == null
                && b.At(new Position(r, 1)) == null
                && !b.IsAttacked(new Position(r, 3), enemy) && !b.IsAttacked(new Position(r, 2), enemy))
            result.Add(new Move(f, new Position(r, 2), MoveType.CASTLE_QUEEN));
        return result;
    }
}

class Pawn : Piece {
    public Pawn(Color c) : base(c) { }
    public override PieceType Type() { return PieceType.PAWN; }
    private int Dir() { return Color == Color.WHITE ? 1 : -1; }
    public override List<Position> Attacks(Board b, Position f) {          // pawns capture diagonally, move straight
        List<Position> result = new List<Position>();
        foreach (int dc in new[] { -1, 1 }) { Position p = f.Plus(Dir(), dc); if (p.OnBoard()) result.Add(p); }
        return result;
    }
    public override List<Move> PseudoLegalMoves(Board b, Position f) {
        List<Move> result = new List<Move>();
        int startRow = Color == Color.WHITE ? 1 : 6, lastRow = Color == Color.WHITE ? 7 : 0;
        Position one = f.Plus(Dir(), 0);
        if (one.OnBoard() && b.At(one) == null) {
            result.Add(new Move(f, one, one.Row == lastRow ? MoveType.PROMOTION : MoveType.NORMAL));
            Position two = f.Plus(2 * Dir(), 0);
            if (f.Row == startRow && b.At(two) == null) result.Add(new Move(f, two, MoveType.DOUBLE_PAWN));
        }
        foreach (Position d in Attacks(b, f)) {
            Piece t = b.At(d);
            if (t != null && t.Color != Color) result.Add(new Move(f, d, d.Row == lastRow ? MoveType.PROMOTION : MoveType.NORMAL));
            else if (t == null && d.Equals(b.EnPassantTarget)) result.Add(new Move(f, d, MoveType.EN_PASSANT));
        }
        return result;
    }
}

// The Board = the full position: squares + castling rights + en-passant square.
class Board {
    private readonly Piece[][] grid = new Piece[8][];
    public string Castling = "KQkq";            // FEN-style rights still available
    public Position EnPassantTarget;            // square a pawn may capture INTO this move, or null

    public Board() { for (int r = 0; r < 8; r++) grid[r] = new Piece[8]; }
    public Piece At(Position p) { return grid[p.Row][p.Col]; }
    public void Put(Position p, Piece x) { grid[p.Row][p.Col] = x; }

    public static Board Standard() {
        Board b = new Board();
        for (int c = 0; c < 8; c++) { b.grid[1][c] = new Pawn(Color.WHITE); b.grid[6][c] = new Pawn(Color.BLACK); }
        foreach (Color s in new[] { Color.WHITE, Color.BLACK }) {
            int r = s == Color.WHITE ? 0 : 7;
            b.grid[r][0] = new Rook(s); b.grid[r][7] = new Rook(s);
            b.grid[r][1] = new Knight(s); b.grid[r][6] = new Knight(s);
            b.grid[r][2] = new Bishop(s); b.grid[r][5] = new Bishop(s);
            b.grid[r][3] = new Queen(s); b.grid[r][4] = new King(s);
        }
        return b;
    }

    public Board Copy() {                        // pieces are immutable, so a shallow grid copy is enough
        Board b = new Board();
        for (int r = 0; r < 8; r++) b.grid[r] = (Piece[])grid[r].Clone();
        b.Castling = Castling;
        b.EnPassantTarget = EnPassantTarget;
        return b;
    }

    public Position KingOf(Color c) {
        for (int r = 0; r < 8; r++) for (int col = 0; col < 8; col++) {
            Piece p = grid[r][col];
            if (p != null && p.Color == c && p.Type() == PieceType.KING) return new Position(r, col);
        }
        throw new InvalidOperationException("no " + c + " king");
    }

    public bool IsAttacked(Position target, Color by) {
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            Piece p = grid[r][c];
            if (p != null && p.Color == by && p.Attacks(this, new Position(r, c)).Contains(target)) return true;
        }
        return false;
    }

    // Executes a move that is already known to be legal; handles all special rules.
    public void Apply(Move m) {
        Piece p = At(m.From);
        Put(m.To, p);
        Put(m.From, null);
        int r = m.From.Row;
        switch (m.Type) {
            case MoveType.EN_PASSANT: Put(new Position(r, m.To.Col), null); break;              // captured pawn is beside us
            case MoveType.CASTLE_KING: Put(new Position(r, 5), At(new Position(r, 7))); Put(new Position(r, 7), null); break;
            case MoveType.CASTLE_QUEEN: Put(new Position(r, 3), At(new Position(r, 0))); Put(new Position(r, 0), null); break;
            case MoveType.PROMOTION: Put(m.To, new Queen(p.Color)); break;                        // auto-queen (extension: ask player)
        }
        EnPassantTarget = m.Type == MoveType.DOUBLE_PAWN ? new Position((m.From.Row + m.To.Row) / 2, m.From.Col) : null;
        LoseRights(m.From);
        LoseRights(m.To);                                                                        // a captured rook also loses rights
    }
    private void LoseRights(Position sq) {
        string s = sq.ToString();
        if (s == "e1") Castling = Castling.Replace("K", "").Replace("Q", "");
        if (s == "h1") Castling = Castling.Replace("K", "");
        if (s == "a1") Castling = Castling.Replace("Q", "");
        if (s == "e8") Castling = Castling.Replace("k", "").Replace("q", "");
        if (s == "h8") Castling = Castling.Replace("k", "");
        if (s == "a8") Castling = Castling.Replace("q", "");
    }

    public string Render() {
        StringBuilder sb = new StringBuilder();
        for (int r = 7; r >= 0; r--) {
            sb.Append(r + 1).Append(' ');
            for (int c = 0; c < 8; c++) sb.Append(grid[r][c] == null ? '.' : grid[r][c].Symbol()).Append(' ');
            sb.Append('\\n');
        }
        return sb.Append("  a b c d e f g h").ToString();
    }
}

// Rule engine: the ONLY place that knows "a move may not leave your own king in check".
static class MoveValidator {
    public static List<Move> LegalMoves(Board b, Color side, Position from) {
        Piece p = b.At(from);
        if (p == null || p.Color != side) return new List<Move>();
        List<Move> legal = new List<Move>();
        foreach (Move m in p.PseudoLegalMoves(b, from)) {
            Board next = b.Copy();                                   // copy-make: simulate, then test
            next.Apply(m);
            if (!next.IsAttacked(next.KingOf(side), side.Opposite())) legal.Add(m);
        }
        return legal;
    }
    public static List<Move> AllLegalMoves(Board b, Color side) {
        List<Move> all = new List<Move>();
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) all.AddRange(LegalMoves(b, side, new Position(r, c)));
        return all;
    }
    // perft = count leaf positions at a depth; the standard way to test a move generator.
    public static long Perft(Board b, Color side, int depth) {
        if (depth == 0) return 1;
        long n = 0;
        foreach (Move m in AllLegalMoves(b, side)) { Board next = b.Copy(); next.Apply(m); n += Perft(next, side.Opposite(), depth - 1); }
        return n;
    }
}

enum GameStatus { ACTIVE, CHECK, CHECKMATE, STALEMATE }

class Game {
    private Board board = Board.Standard();
    private Color turn = Color.WHITE;
    private GameStatus status = GameStatus.ACTIVE;
    private readonly Stack<Board> history = new Stack<Board>();     // Memento: snapshots for undo
    private readonly List<Move> moves = new List<Move>();

    public string MakeMove(string from, string to) {
        if (status == GameStatus.CHECKMATE || status == GameStatus.STALEMATE) return "game over: " + status;
        Position f = Position.Of(from), t = Position.Of(to);
        Piece p = board.At(f);
        if (p == null) return "illegal: no piece on " + from;
        if (p.Color != turn) return "illegal: it is " + turn + "'s turn";
        foreach (Move m in MoveValidator.LegalMoves(board, turn, f)) {
            if (m.To.Equals(t)) {
                history.Push(board.Copy());
                board.Apply(m);
                moves.Add(m);
                turn = turn.Opposite();
                UpdateStatus();
                return "ok " + m + (status == GameStatus.ACTIVE ? "" : " -> " + status);
            }
        }
        bool pseudo = p.PseudoLegalMoves(board, f).Any(m => m.To.Equals(t));
        return pseudo ? "illegal: " + from + "-" + to + " would leave your king in check" : "illegal: " + p.Type() + " cannot move like that";
    }

    public bool Undo() {
        if (history.Count == 0) return false;
        board = history.Pop();
        moves.RemoveAt(moves.Count - 1);
        turn = turn.Opposite();
        UpdateStatus();
        return true;
    }

    private void UpdateStatus() {
        bool inCheck = board.IsAttacked(board.KingOf(turn), turn.Opposite());
        bool canMove = MoveValidator.AllLegalMoves(board, turn).Count > 0;
        status = canMove ? (inCheck ? GameStatus.CHECK : GameStatus.ACTIVE) : (inCheck ? GameStatus.CHECKMATE : GameStatus.STALEMATE);
    }
    public GameStatus Status() { return status; }
    public Board CurrentBoard() { return board; }
}

class ChessDemo {
    static void Main() {
        Console.WriteLine("perft(1..3) = " + MoveValidator.Perft(Board.Standard(), Color.WHITE, 1) + ", "
            + MoveValidator.Perft(Board.Standard(), Color.WHITE, 2) + ", "
            + MoveValidator.Perft(Board.Standard(), Color.WHITE, 3) + "   (expected 20, 400, 8902)");

        Game g = new Game();
        Console.WriteLine(g.MakeMove("e2", "e5"));           // pawn cannot jump 3
        Console.WriteLine(g.MakeMove("e7", "e5"));           // wrong turn
        string[][] scholar = { new[] { "e2", "e4" }, new[] { "e7", "e5" }, new[] { "f1", "c4" }, new[] { "b8", "c6" }, new[] { "d1", "h5" }, new[] { "g8", "f6" }, new[] { "h5", "f7" } };
        foreach (string[] m in scholar) Console.WriteLine(m[0] + m[1] + ": " + g.MakeMove(m[0], m[1]));
        Console.WriteLine(g.CurrentBoard().Render());
        Console.WriteLine("status = " + g.Status());         // CHECKMATE
        g.Undo();
        Console.WriteLine("after undo: " + g.Status() + ", white to move again");
        Console.WriteLine("black tries to move: " + g.MakeMove("a7", "a6"));      // not black's turn
        Console.WriteLine("replay Qxf7: " + g.MakeMove("h5", "f7"));
    }
}` }] }],
    codeTitle: ['Chess core — pieces, board with castling/en passant/promotion, rule engine, perft self-test, game with check/checkmate/stalemate and undo (runnable main)'],
    viz: [
      { title: 'Class diagram tour: Game, Board, Pieces, MoveValidator', gen: function () { return chessClassViz(); } },
      { title: 'Legal moves on a real board: piece rule → king-safety filter → game status', input: 'white: Ke1 Re2 Pd2 Nb1 | black: Kg8 Re7 Pg7 | select: e2', inputLabel: 'white: pieces | black: pieces | select: square   (pieces = K Q R B N P + square, e.g. Ke1; try select: e1, or white: Kh1 Ph2 Pg2 | black: Kg8 Ra1 Rb2 | select: h1)', gen: chessViz }
    ],
    examples: [
      { title: 'A pinned rook: only moves along the pin survive', html: `<p>White Ke1, Re2, Pd2; Black Re7, Kg8. The white rook\'s movement rule allows e3–e7 (up the file, capturing on e7) and f2, g2, h2 (sideways). Leftwards it is blocked by its own pawn on d2; downwards by its own king.</p>
${H.table(['Move', 'Stage 1', 'Stage 2 (simulate)', 'Verdict'], [
  ['Re2–e5', 'ok', 'king still shielded on the e-file', H.c('g', 'legal')],
  ['Re2xe7', 'ok (capture)', 'attacker removed', H.c('g', 'legal')],
  ['Re2–g2', 'ok', 'e-file opens: Re7 hits Ke1', H.c('r', 'illegal (pin)')],
  ['Re2–d2', H.c('m', 'blocked by own pawn'), '—', H.c('r', 'never generated')]
])}<p>Five legal moves out of eight pseudo-legal ones. The visualizer's default input is this position plus a White knight on b1 and a Black pawn on g7; the rook's moves are the same.</p>` },
      { title: 'Checkmate vs stalemate: same count, different check flag', html: `${H.table(['Position', 'In check?', 'Legal moves', 'Result'], [
  ['White Kh1, Pg2, Ph2 — Black Kg8, Ra1 (back-rank mate)', 'yes (Ra1 on rank 1)', '0', H.c('r', 'CHECKMATE')],
  ['White Kh1 — Black Kf2, Qg3', 'no', '0', H.c('y', 'STALEMATE (draw)')],
  ['Start position', 'no', '20', 'ACTIVE']
])}<p>Both end positions have zero legal moves; only the "am I in check right now?" flag separates a win from a draw. That is why <code>updateStatus()</code> computes both. Try <code>white: Kh1 Ph2 Pg2 | black: Kg8 Ra1 | select: h1</code> in the visualizer.</p>` },
      { title: 'En passant needs one square of memory', html: `<p>White pawn on e5. Black plays d7–d5 (double step, landing beside it). The board stores <code>enPassantTarget = d6</code>. On White\'s very next move, <code>e5xd6</code> is generated as type <code>EN_PASSANT</code>; <code>apply()</code> moves the pawn to d6 and removes the black pawn from <b>d5</b> (not d6!). After any other move the target is reset to null, so the chance is gone. Common bug: the en-passant capture can expose your king along the rank — the copy-make check catches that automatically.</p>` },
      { title: 'Castling checklist (each line is a separate condition)', html: `${H.table(['Condition', 'Where it lives in the code'], [
  ['King and that rook have never moved', '<code>Board.castling</code> rights string ("KQkq"), removed in <code>loseRights()</code>'],
  ['Squares between are empty', '<code>at(f1) == null && at(g1) == null</code>'],
  ['King not currently in check', '<code>!isAttacked(e1, enemy)</code>'],
  ['King does not pass through / land on attacked square', '<code>!isAttacked(f1) && !isAttacked(g1)</code> (+ final copy-make test)'],
  ['Rook moves too', '<code>apply()</code> case CASTLE_KING: h1 → f1']
])}<p>Note the rook square b1 must be empty for queen-side castling but does NOT need to be safe — only the king\'s path matters.</p>` },
      { title: 'perft: how engine authors prove move generation is right', html: `<p><b>perft(d)</b> counts all positions reachable in exactly d plies. Known values from the start: <b>20, 400, 8,902, 197,281, 4,865,609</b>. If your generator prints 8,902 at depth 3, pawns, knights, bishops, checks and pins are almost certainly right. Special "tricky" positions (like "Kiwipete") exercise castling, en passant and promotion. The demo above computes depths 1–3 as a built-in self test — a great thing to mention in an interview.</p>` }
    ],
    deepDive: `<p><b>1. Copy-make vs make-unmake.</b> Our validator copies the board (64 references + 2 fields) for every candidate move. Real engines instead <b>make</b> the move in place and <b>unmake</b> it, storing just the captured piece, old castling rights and old en-passant square in an undo record (Command pattern). That avoids allocation and is much faster when searching millions of positions.</p>
<p><b>2. Faster check detection.</b> Our <code>isAttacked</code> asks every enemy piece for its attack list (≈ 16 × up to 27 squares). Better: look <b>outward from the king</b> — knight jumps, pawn diagonals, and 8 rays stopping at the first piece. Even better: <b>bitboards</b> (one 64-bit long per piece type and colour), where attacks are computed with shifts and precomputed tables ("magic bitboards" for sliders). Pins can be precomputed once per position so each move is checked in O(1).</p>
<p><b>3. Draw rules need history.</b> <b>Threefold repetition</b> needs a fingerprint of each position: <b>Zobrist hashing</b> (XOR of random 64-bit numbers for each piece-on-square, side to move, castling rights, en-passant file) updated incrementally per move. The <b>50-move rule</b> needs a half-move clock reset on pawn moves and captures. Insufficient material (K vs K, K+B vs K) is another draw check.</p>
<p><b>4. Notation and persistence.</b> <b>FEN</b> stores one position in a single line (pieces, side to move, castling, en passant, clocks) — perfect for tests and for the "load position" factory. <b>PGN</b> stores the full game in algebraic notation (<code>Nf3</code>, <code>exd5</code>, <code>O-O</code>); generating it requires disambiguation (<code>Nbd2</code>) and check suffixes (+, #).</p>
<p><b>5. Product-level design.</b> Online chess adds a <b>clock</b> (per-player time with increment — a state machine), <b>server-authoritative validation</b> (never trust the client), <b>Observer</b> events for spectators, resignation/draw offers as Commands, and a match-making service. Keep the rule engine a pure library with no I/O so the same code validates moves on the server, in the client and in tests.</p>`,
    aiEra: `<p><b>What AI changes:</b> engines like Stockfish (with NNUE neural evaluation) and AlphaZero-style networks are far beyond humans, and an assistant can generate a working move generator quickly. But AI-written chess code is a classic source of <b>subtle rule bugs</b>: castling through check, en passant that exposes the king along a rank, forgetting to clear the en-passant square, promotion only to queen, wrong pawn direction for Black.</p>
<p><b>Use AI as a partner:</b> <code>Write JUnit tests using perft positions (start, Kiwipete) with known node counts for depths 1-3</code>, or <code>Give me 10 FEN positions that test pins, discovered check and en-passant edge cases</code>. Tests with known answers are the best way to trust generated code.</p>
<p><b>Design for AI players:</b> make <code>Player</code> a Strategy with <code>Move chooseMove(Game view)</code>; a bot (minimax, MCTS, or an LLM-backed coach) plugs in without touching the rules. Never let an LLM output a move directly into the game — always pass it through <code>MoveValidator</code>, because language models do produce illegal moves.</p>
<p><b>What you must still own:</b> the split between movement rules and legality, the simulate-and-test argument, and explaining why checkmate/stalemate detection is just "count legal moves + in-check flag".</p>`,
    problems: [{
      title: 'Machine Coding: Chess Move Validator (isLegal) with Check Rule',
      level: 'Hard', tags: ['chess', 'strategy', 'simulation', 'validation'], companies: ['Google', 'Microsoft', 'Amazon', 'Chess.com'],
      statement: `<p>Given a board (8 strings, rank 8 first; uppercase = White, lowercase = Black, <code>.</code> = empty), the side to move, and a move like <code>"e2" → "e4"</code>, return whether the move is <b>legal</b>: correct piece movement, path not blocked, not capturing your own piece, and not leaving your own king in check. Castling and en passant can be ignored for this round. Design it so that adding a new piece type does not modify existing rules.</p>`,
      constraints: `<p>Exactly one king per side. Up to 10<sup>4</sup> validations per second. Must handle pins, moving into check and responding to check.</p>`,
      example: `<p>Start position, White to move:</p>${H.table(['Move', 'Answer', 'Why'], [['e2→e4', H.c('g', 'true'), 'double step from start rank, both squares empty'], ['e2→e5', H.c('r', 'false'), 'pawn cannot move 3'], ['f1→c4', H.c('r', 'false'), 'bishop path blocked by e2 pawn'], ['g1→f3', H.c('g', 'true'), 'knight jumps over pieces']])}`,
      brute: {
        why: `<p>The naive validator checks only the <b>shape</b> of the move (rook: same row or column; bishop: |dr| = |dc|). It ignores blocking pieces and the king. So it accepts a rook jumping over pieces and a pinned piece moving away — exactly the bugs interviewers test. All rules sit in one switch, so a new piece edits the same method.</p>`,
        code: { lang: 'java', code: String.raw`
class NaiveChess {
    // row 0 = rank 1
    static boolean shapeOnly(char piece, int fr, int fc, int tr, int tc) {
        int dr = Math.abs(tr - fr), dc = Math.abs(tc - fc);
        switch (Character.toUpperCase(piece)) {
            case 'R': return fr == tr || fc == tc;          // no path check!
            case 'B': return dr == dc;
            case 'Q': return fr == tr || fc == tc || dr == dc;
            case 'N': return dr * dc == 2;
            case 'K': return dr <= 1 && dc <= 1;
            default:  return tc == fc && tr == fr + 1;      // pawn, white only, no captures
        }
    }
    public static void main(String[] args) {
        // White rook a1 "moves" to a8 straight through its own pawn on a2: accepted. Wrong.
        System.out.println("Ra1-a8 through a2 pawn accepted? " + shapeOnly('R', 0, 0, 7, 0));
        // A pinned piece moving away would also be accepted: no king check at all.
        System.out.println("Bishop shape c1-h6 accepted? " + shapeOnly('B', 0, 2, 5, 7));
    }
}`, alt: [{ lang: 'python', code: "class NaiveChess:\n    # row 0 = rank 1\n    @staticmethod\n    def shape_only(piece, fr, fc, tr, tc):\n        dr, dc = abs(tr - fr), abs(tc - fc)\n        p = piece.upper()\n        if p == \"R\": return fr == tr or fc == tc            # no path check!\n        if p == \"B\": return dr == dc\n        if p == \"Q\": return fr == tr or fc == tc or dr == dc\n        if p == \"N\": return dr * dc == 2\n        if p == \"K\": return dr <= 1 and dc <= 1\n        return tc == fc and tr == fr + 1                    # pawn, white only, no captures\n\nif __name__ == \"__main__\":\n    # White rook a1 \"moves\" to a8 straight through its own pawn on a2: accepted. Wrong.\n    print(\"Ra1-a8 through a2 pawn accepted?\", NaiveChess.shape_only(\"R\", 0, 0, 7, 0))\n    # A pinned piece moving away would also be accepted: no king check at all.\n    print(\"Bishop shape c1-h6 accepted?\", NaiveChess.shape_only(\"B\", 0, 2, 5, 7))\n" }, { lang: 'ts', code: "class NaiveChess {\n  // row 0 = rank 1\n  static shapeOnly(piece: string, fr: number, fc: number, tr: number, tc: number): boolean {\n    const dr = Math.abs(tr - fr), dc = Math.abs(tc - fc);\n    switch (piece.toUpperCase()) {\n      case \"R\": return fr === tr || fc === tc;          // no path check!\n      case \"B\": return dr === dc;\n      case \"Q\": return fr === tr || fc === tc || dr === dc;\n      case \"N\": return dr * dc === 2;\n      case \"K\": return dr <= 1 && dc <= 1;\n      default:  return tc === fc && tr === fr + 1;      // pawn, white only, no captures\n    }\n  }\n}\n// White rook a1 \"moves\" to a8 straight through its own pawn on a2: accepted. Wrong.\nconsole.log(\"Ra1-a8 through a2 pawn accepted? \" + NaiveChess.shapeOnly(\"R\", 0, 0, 7, 0));\n// A pinned piece moving away would also be accepted: no king check at all.\nconsole.log(\"Bishop shape c1-h6 accepted? \" + NaiveChess.shapeOnly(\"B\", 0, 2, 5, 7));\n" }, { lang: 'cpp', code: "struct NaiveChess {\n    // row 0 = rank 1\n    static bool shapeOnly(char piece, int fr, int fc, int tr, int tc) {\n        int dr = abs(tr - fr), dc = abs(tc - fc);\n        switch (toupper(piece)) {\n            case 'R': return fr == tr || fc == tc;          // no path check!\n            case 'B': return dr == dc;\n            case 'Q': return fr == tr || fc == tc || dr == dc;\n            case 'N': return dr * dc == 2;\n            case 'K': return dr <= 1 && dc <= 1;\n            default:  return tc == fc && tr == fr + 1;      // pawn, white only, no captures\n        }\n    }\n};\n\nint main() {\n    // White rook a1 \"moves\" to a8 straight through its own pawn on a2: accepted. Wrong.\n    cout << \"Ra1-a8 through a2 pawn accepted? \" << boolalpha << NaiveChess::shapeOnly('R', 0, 0, 7, 0) << endl;\n    // A pinned piece moving away would also be accepted: no king check at all.\n    cout << \"Bishop shape c1-h6 accepted? \" << NaiveChess::shapeOnly('B', 0, 2, 5, 7) << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nstatic class NaiveChess {\n    // row 0 = rank 1\n    public static bool ShapeOnly(char piece, int fr, int fc, int tr, int tc) {\n        int dr = Math.Abs(tr - fr), dc = Math.Abs(tc - fc);\n        switch (char.ToUpper(piece)) {\n            case 'R': return fr == tr || fc == tc;          // no path check!\n            case 'B': return dr == dc;\n            case 'Q': return fr == tr || fc == tc || dr == dc;\n            case 'N': return dr * dc == 2;\n            case 'K': return dr <= 1 && dc <= 1;\n            default:  return tc == fc && tr == fr + 1;      // pawn, white only, no captures\n        }\n    }\n    static void Main() {\n        // White rook a1 \"moves\" to a8 straight through its own pawn on a2: accepted. Wrong.\n        Console.WriteLine(\"Ra1-a8 through a2 pawn accepted? \" + ShapeOnly('R', 0, 0, 7, 0).ToString().ToLower());\n        // A pinned piece moving away would also be accepted: no king check at all.\n        Console.WriteLine(\"Bishop shape c1-h6 accepted? \" + ShapeOnly('B', 0, 2, 5, 7).ToString().ToLower());\n    }\n}\n" }] }
      },
      mcq: { q: 'Your king is in check from a bishop. Which approach correctly finds ALL legal replies (block, capture, king move)?', options: ['Simulate every pseudo-legal move on a copy and keep those where the king is not attacked', 'Only generate king moves', 'Only generate captures of the checking piece', 'Generate moves normally; check is handled at the end of the game'], answer: 0, explain: 'Copy-make + isAttacked covers blocks, captures and king moves uniformly, including double checks where only king moves work.' },
      hints: [
        `<p>Separate <b>can this piece reach that square</b> (per-piece rule) from <b>is my king safe afterwards</b> (one global check). The second needs no knowledge of piece types except for computing attacks.</p>`,
        `<p>Store rules in a map from piece letter to <code>MoveRule</code> function (Strategy registry; <code>Map&lt;Character, MoveRule&gt;</code> in Java). Sliders use a shared <code>pathClear</code> that walks one step at a time with the sign of each difference (<code>Integer.signum</code> in Java). For king safety: copy the board, make the move, find your king, and ask every enemy piece\'s rule "can you reach the king square?".</p>`,
        `<p>Edge cases: from == to, empty from-square, wrong colour, capturing own piece, pawn direction depends on colour, pawn captures only diagonally and only when the target is occupied by an enemy, king capturing a defended piece (the simulation handles it). Recipe: parse → basic checks → rule.canReach → simulate → !inCheck.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "e2-e4 true\ne2-e5 false\nf1-c4 false\ng1-f3 true\ne7-e5 false\npinned Re2-g2 false\npinned Re2-e7 true\nKe1-f2 true\nempty square e3-e4 false\nown piece d1-d2 false\nKe1-e2 into rook check false\nKe1xd2 takes the rook true\n" }] },
      solution: {
        approach: `<p>A <b>Strategy registry</b>: one small <code>MoveRule</code> lambda per piece letter, so a new piece = one new entry (composition instead of a class hierarchy — the other valid design besides the subclass version in the topic code). <code>isLegal</code> does the funnel: basic checks → rule → simulate on a copy → reject if own king is attacked. Attack detection reuses the same rules, because "piece X can capture the king square" is exactly "piece X attacks it" (pawn rule only allows diagonal moves onto occupied enemy squares, which is the attack pattern).</p>`,
        code: String.raw`
interface MoveRule { boolean canReach(char[][] b, int fr, int fc, int tr, int tc); }

class ChessRules {
    static final Map<Character, MoveRule> RULES = new HashMap<>();
    static {
        RULES.put('R', (b, fr, fc, tr, tc) -> (fr == tr || fc == tc) && pathClear(b, fr, fc, tr, tc));
        RULES.put('B', (b, fr, fc, tr, tc) -> Math.abs(fr - tr) == Math.abs(fc - tc) && pathClear(b, fr, fc, tr, tc));
        RULES.put('Q', (b, fr, fc, tr, tc) -> RULES.get('R').canReach(b, fr, fc, tr, tc) || RULES.get('B').canReach(b, fr, fc, tr, tc));
        RULES.put('N', (b, fr, fc, tr, tc) -> Math.abs(fr - tr) * Math.abs(fc - tc) == 2);
        RULES.put('K', (b, fr, fc, tr, tc) -> Math.abs(fr - tr) <= 1 && Math.abs(fc - tc) <= 1);
        RULES.put('P', (b, fr, fc, tr, tc) -> {
            boolean white = Character.isUpperCase(b[fr][fc]);
            int dir = white ? 1 : -1, dr = tr - fr, dc = Math.abs(tc - fc);
            char target = b[tr][tc];
            if (dc == 0 && dr == dir) return target == '.';
            if (dc == 0 && dr == 2 * dir) return fr == (white ? 1 : 6) && target == '.' && b[fr + dir][fc] == '.';
            return dc == 1 && dr == dir && target != '.' && Character.isUpperCase(target) != white;
        });
    }

    // Walk from (fr,fc) toward (tr,tc) one step at a time; every square in between must be empty.
    static boolean pathClear(char[][] b, int fr, int fc, int tr, int tc) {
        int sr = Integer.signum(tr - fr), sc = Integer.signum(tc - fc);
        for (int r = fr + sr, c = fc + sc; r != tr || c != tc; r += sr, c += sc)
            if (b[r][c] != '.') return false;
        return true;
    }

    static char[][] parse(String[] ranks8to1) {
        char[][] b = new char[8][];
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i].toCharArray();   // row 0 = rank 1
        return b;
    }

    static boolean isLegal(char[][] b, String from, String to, boolean whiteToMove) {
        int fr = from.charAt(1) - '1', fc = from.charAt(0) - 'a', tr = to.charAt(1) - '1', tc = to.charAt(0) - 'a';
        char piece = b[fr][fc];
        if (piece == '.' || Character.isUpperCase(piece) != whiteToMove) return false;   // empty or wrong side
        if (fr == tr && fc == tc) return false;
        char target = b[tr][tc];
        if (target != '.' && Character.isUpperCase(target) == whiteToMove) return false; // own piece
        MoveRule rule = RULES.get(Character.toUpperCase(piece));
        if (rule == null || !rule.canReach(b, fr, fc, tr, tc)) return false;
        char[][] next = new char[8][];
        for (int r = 0; r < 8; r++) next[r] = b[r].clone();
        next[tr][tc] = piece;
        next[fr][fc] = '.';
        return !inCheck(next, whiteToMove);
    }

    static boolean inCheck(char[][] b, boolean white) {
        char king = white ? 'K' : 'k';
        int kr = -1, kc = -1;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == king) { kr = r; kc = c; }
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            char p = b[r][c];
            if (p == '.' || Character.isUpperCase(p) == white) continue;              // only enemy pieces
            if (RULES.get(Character.toUpperCase(p)).canReach(b, r, c, kr, kc)) return true;
        }
        return false;
    }
}

class ChessValidatorDemo {
    public static void main(String[] args) {
        char[][] start = ChessRules.parse(new String[] {
            "rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR" });
        System.out.println("e2-e4 " + ChessRules.isLegal(start, "e2", "e4", true));   // true
        System.out.println("e2-e5 " + ChessRules.isLegal(start, "e2", "e5", true));   // false
        System.out.println("f1-c4 " + ChessRules.isLegal(start, "f1", "c4", true));   // false (blocked)
        System.out.println("g1-f3 " + ChessRules.isLegal(start, "g1", "f3", true));   // true
        System.out.println("e7-e5 " + ChessRules.isLegal(start, "e7", "e5", true));   // false (not your piece)

        char[][] pin = ChessRules.parse(new String[] {
            "......k.", "....r...", "........", "........", "........", "........", "...PR...", "....K..." });
        System.out.println("pinned Re2-g2 " + ChessRules.isLegal(pin, "e2", "g2", true));  // false
        System.out.println("pinned Re2-e7 " + ChessRules.isLegal(pin, "e2", "e7", true));  // true (capture)
        System.out.println("Ke1-f2 " + ChessRules.isLegal(pin, "e1", "f2", true));         // true

        System.out.println("empty square e3-e4 " + ChessRules.isLegal(start, "e3", "e4", true));   // false
        System.out.println("own piece d1-d2 " + ChessRules.isLegal(start, "d1", "d2", true));      // false
        char[][] rookNear = ChessRules.parse(new String[] {
            "k.......", "........", "........", "........", "........", "........", "...r....", "....K..." });
        System.out.println("Ke1-e2 into rook check " + ChessRules.isLegal(rookNear, "e1", "e2", true));   // false
        System.out.println("Ke1xd2 takes the rook " + ChessRules.isLegal(rookNear, "e1", "d2", true));    // true
    }
}`,
      alt: [
          { lang: 'python', code: String.raw`
from typing import Callable

Board = list[list[str]]
MoveRule = Callable[[Board, int, int, int, int], bool]


def sign(x: int) -> int:
    return (x > 0) - (x < 0)


# Walk from (fr,fc) toward (tr,tc) one step at a time; every square in between must be empty.
def path_clear(b: Board, fr: int, fc: int, tr: int, tc: int) -> bool:
    sr, sc = sign(tr - fr), sign(tc - fc)
    r, c = fr + sr, fc + sc
    while (r, c) != (tr, tc):
        if b[r][c] != ".":
            return False
        r, c = r + sr, c + sc
    return True


def rook_rule(b: Board, fr: int, fc: int, tr: int, tc: int) -> bool:
    return (fr == tr or fc == tc) and path_clear(b, fr, fc, tr, tc)


def bishop_rule(b: Board, fr: int, fc: int, tr: int, tc: int) -> bool:
    return abs(fr - tr) == abs(fc - tc) and path_clear(b, fr, fc, tr, tc)


def pawn_rule(b: Board, fr: int, fc: int, tr: int, tc: int) -> bool:
    white = b[fr][fc].isupper()
    direction, dr, dc = (1 if white else -1), tr - fr, abs(tc - fc)
    target = b[tr][tc]
    if dc == 0 and dr == direction:
        return target == "."
    if dc == 0 and dr == 2 * direction:
        return fr == (1 if white else 6) and target == "." and b[fr + direction][fc] == "."
    return dc == 1 and dr == direction and target != "." and target.isupper() != white


RULES: dict[str, MoveRule] = {
    "R": rook_rule,
    "B": bishop_rule,
    "Q": lambda b, fr, fc, tr, tc: rook_rule(b, fr, fc, tr, tc) or bishop_rule(b, fr, fc, tr, tc),
    "N": lambda b, fr, fc, tr, tc: abs(fr - tr) * abs(fc - tc) == 2,
    "K": lambda b, fr, fc, tr, tc: abs(fr - tr) <= 1 and abs(fc - tc) <= 1,
    "P": pawn_rule,
}


class ChessRules:
    @staticmethod
    def parse(ranks8to1: list[str]) -> Board:
        return [list(ranks8to1[7 - r]) for r in range(8)]          # row 0 = rank 1

    @staticmethod
    def is_legal(b: Board, src: str, dst: str, white_to_move: bool) -> bool:
        fr, fc, tr, tc = int(src[1]) - 1, ord(src[0]) - 97, int(dst[1]) - 1, ord(dst[0]) - 97
        piece = b[fr][fc]
        if piece == "." or piece.isupper() != white_to_move:        # empty or wrong side
            return False
        if (fr, fc) == (tr, tc):
            return False
        target = b[tr][tc]
        if target != "." and target.isupper() == white_to_move:     # own piece
            return False
        rule = RULES.get(piece.upper())
        if rule is None or not rule(b, fr, fc, tr, tc):
            return False
        nxt = [row[:] for row in b]
        nxt[tr][tc] = piece
        nxt[fr][fc] = "."
        return not ChessRules.in_check(nxt, white_to_move)

    @staticmethod
    def in_check(b: Board, white: bool) -> bool:
        king = "K" if white else "k"
        kr, kc = next((r, c) for r in range(8) for c in range(8) if b[r][c] == king)
        for r in range(8):
            for c in range(8):
                p = b[r][c]
                if p == "." or p.isupper() == white:                # only enemy pieces
                    continue
                if RULES[p.upper()](b, r, c, kr, kc):
                    return True
        return False


def show(flag: bool) -> str:
    return str(flag).lower()


def main() -> None:
    start = ChessRules.parse(["rnbqkbnr", "pppppppp", "........", "........",
                              "........", "........", "PPPPPPPP", "RNBQKBNR"])
    print("e2-e4", show(ChessRules.is_legal(start, "e2", "e4", True)))    # true
    print("e2-e5", show(ChessRules.is_legal(start, "e2", "e5", True)))    # false
    print("f1-c4", show(ChessRules.is_legal(start, "f1", "c4", True)))    # false (blocked)
    print("g1-f3", show(ChessRules.is_legal(start, "g1", "f3", True)))    # true
    print("e7-e5", show(ChessRules.is_legal(start, "e7", "e5", True)))    # false (not your piece)

    pin = ChessRules.parse(["......k.", "....r...", "........", "........",
                            "........", "........", "...PR...", "....K..."])
    print("pinned Re2-g2", show(ChessRules.is_legal(pin, "e2", "g2", True)))   # false
    print("pinned Re2-e7", show(ChessRules.is_legal(pin, "e2", "e7", True)))   # true (capture)
    print("Ke1-f2", show(ChessRules.is_legal(pin, "e1", "f2", True)))          # true

    print("empty square e3-e4", show(ChessRules.is_legal(start, "e3", "e4", True)))   # false
    print("own piece d1-d2", show(ChessRules.is_legal(start, "d1", "d2", True)))      # false
    rook_near = ChessRules.parse(["k.......", "........", "........", "........",
                                  "........", "........", "...r....", "....K..."])
    print("Ke1-e2 into rook check", show(ChessRules.is_legal(rook_near, "e1", "e2", True)))   # false
    print("Ke1xd2 takes the rook", show(ChessRules.is_legal(rook_near, "e1", "d2", True)))    # true


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: String.raw`
type Board = string[][];
type MoveRule = (b: Board, fr: number, fc: number, tr: number, tc: number) => boolean;

const isUpper = (ch: string): boolean => ch !== ch.toLowerCase();

// Walk from (fr,fc) toward (tr,tc) one step at a time; every square in between must be empty.
function pathClear(b: Board, fr: number, fc: number, tr: number, tc: number): boolean {
  const sr = Math.sign(tr - fr), sc = Math.sign(tc - fc);
  for (let r = fr + sr, c = fc + sc; r !== tr || c !== tc; r += sr, c += sc) {
    if (b[r][c] !== ".") return false;
  }
  return true;
}

const rookRule: MoveRule = (b, fr, fc, tr, tc) => (fr === tr || fc === tc) && pathClear(b, fr, fc, tr, tc);
const bishopRule: MoveRule = (b, fr, fc, tr, tc) => Math.abs(fr - tr) === Math.abs(fc - tc) && pathClear(b, fr, fc, tr, tc);
const pawnRule: MoveRule = (b, fr, fc, tr, tc) => {
  const white = isUpper(b[fr][fc]);
  const dir = white ? 1 : -1, dr = tr - fr, dc = Math.abs(tc - fc);
  const target = b[tr][tc];
  if (dc === 0 && dr === dir) return target === ".";
  if (dc === 0 && dr === 2 * dir) return fr === (white ? 1 : 6) && target === "." && b[fr + dir][fc] === ".";
  return dc === 1 && dr === dir && target !== "." && isUpper(target) !== white;
};

const RULES = new Map<string, MoveRule>([
  ["R", rookRule],
  ["B", bishopRule],
  ["Q", (b, fr, fc, tr, tc) => rookRule(b, fr, fc, tr, tc) || bishopRule(b, fr, fc, tr, tc)],
  ["N", (_b, fr, fc, tr, tc) => Math.abs(fr - tr) * Math.abs(fc - tc) === 2],
  ["K", (_b, fr, fc, tr, tc) => Math.abs(fr - tr) <= 1 && Math.abs(fc - tc) <= 1],
  ["P", pawnRule],
]);

class ChessRules {
  static parse(ranks8to1: string[]): Board {
    return Array.from({ length: 8 }, (_, r) => [...ranks8to1[7 - r]]);   // row 0 = rank 1
  }

  static isLegal(b: Board, from: string, to: string, whiteToMove: boolean): boolean {
    const fr = from.charCodeAt(1) - 49, fc = from.charCodeAt(0) - 97, tr = to.charCodeAt(1) - 49, tc = to.charCodeAt(0) - 97;
    const piece = b[fr][fc];
    if (piece === "." || isUpper(piece) !== whiteToMove) return false;       // empty or wrong side
    if (fr === tr && fc === tc) return false;
    const target = b[tr][tc];
    if (target !== "." && isUpper(target) === whiteToMove) return false;     // own piece
    const rule = RULES.get(piece.toUpperCase());
    if (rule === undefined || !rule(b, fr, fc, tr, tc)) return false;
    const next = b.map((row) => row.slice());
    next[tr][tc] = piece;
    next[fr][fc] = ".";
    return !ChessRules.inCheck(next, whiteToMove);
  }

  static inCheck(b: Board, white: boolean): boolean {
    const king = white ? "K" : "k";
    let kr = -1, kc = -1;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === king) { kr = r; kc = c; }
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (p === "." || isUpper(p) === white) continue;                       // only enemy pieces
      if (RULES.get(p.toUpperCase())!(b, r, c, kr, kc)) return true;
    }
    return false;
  }
}

function main(): void {
  const start = ChessRules.parse(["rnbqkbnr", "pppppppp", "........", "........",
                                  "........", "........", "PPPPPPPP", "RNBQKBNR"]);
  console.log("e2-e4 " + ChessRules.isLegal(start, "e2", "e4", true));   // true
  console.log("e2-e5 " + ChessRules.isLegal(start, "e2", "e5", true));   // false
  console.log("f1-c4 " + ChessRules.isLegal(start, "f1", "c4", true));   // false (blocked)
  console.log("g1-f3 " + ChessRules.isLegal(start, "g1", "f3", true));   // true
  console.log("e7-e5 " + ChessRules.isLegal(start, "e7", "e5", true));   // false (not your piece)

  const pin = ChessRules.parse(["......k.", "....r...", "........", "........",
                                "........", "........", "...PR...", "....K..."]);
  console.log("pinned Re2-g2 " + ChessRules.isLegal(pin, "e2", "g2", true));   // false
  console.log("pinned Re2-e7 " + ChessRules.isLegal(pin, "e2", "e7", true));   // true (capture)
  console.log("Ke1-f2 " + ChessRules.isLegal(pin, "e1", "f2", true));          // true

  console.log("empty square e3-e4 " + ChessRules.isLegal(start, "e3", "e4", true));   // false
  console.log("own piece d1-d2 " + ChessRules.isLegal(start, "d1", "d2", true));      // false
  const rookNear = ChessRules.parse(["k.......", "........", "........", "........",
                                     "........", "........", "...r....", "....K..."]);
  console.log("Ke1-e2 into rook check " + ChessRules.isLegal(rookNear, "e1", "e2", true));   // false
  console.log("Ke1xd2 takes the rook " + ChessRules.isLegal(rookNear, "e1", "d2", true));    // true
}

main();` },
          { lang: 'cpp', code: String.raw`
using Board = vector<string>;                 // 8 strings of 8 chars, row 0 = rank 1
using MoveRule = function<bool(const Board&, int, int, int, int)>;

int sign(int x) { return (x > 0) - (x < 0); }
bool isUpper(char ch) { return isupper(static_cast<unsigned char>(ch)) != 0; }

// Walk from (fr,fc) toward (tr,tc) one step at a time; every square in between must be empty.
bool pathClear(const Board& b, int fr, int fc, int tr, int tc) {
    int sr = sign(tr - fr), sc = sign(tc - fc);
    for (int r = fr + sr, c = fc + sc; r != tr || c != tc; r += sr, c += sc)
        if (b[r][c] != '.') return false;
    return true;
}

bool rookRule(const Board& b, int fr, int fc, int tr, int tc) { return (fr == tr || fc == tc) && pathClear(b, fr, fc, tr, tc); }
bool bishopRule(const Board& b, int fr, int fc, int tr, int tc) { return abs(fr - tr) == abs(fc - tc) && pathClear(b, fr, fc, tr, tc); }
bool pawnRule(const Board& b, int fr, int fc, int tr, int tc) {
    bool white = isUpper(b[fr][fc]);
    int dir = white ? 1 : -1, dr = tr - fr, dc = abs(tc - fc);
    char target = b[tr][tc];
    if (dc == 0 && dr == dir) return target == '.';
    if (dc == 0 && dr == 2 * dir) return fr == (white ? 1 : 6) && target == '.' && b[fr + dir][fc] == '.';
    return dc == 1 && dr == dir && target != '.' && isUpper(target) != white;
}

const map<char, MoveRule>& rules() {
    static const map<char, MoveRule> RULES = {
        {'R', rookRule},
        {'B', bishopRule},
        {'Q', [](const Board& b, int fr, int fc, int tr, int tc) { return rookRule(b, fr, fc, tr, tc) || bishopRule(b, fr, fc, tr, tc); }},
        {'N', [](const Board&, int fr, int fc, int tr, int tc) { return abs(fr - tr) * abs(fc - tc) == 2; }},
        {'K', [](const Board&, int fr, int fc, int tr, int tc) { return abs(fr - tr) <= 1 && abs(fc - tc) <= 1; }},
        {'P', pawnRule},
    };
    return RULES;
}

class ChessRules {
public:
    static Board parse(const vector<string>& ranks8to1) {
        Board b(8);
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i];      // row 0 = rank 1
        return b;
    }

    static bool isLegal(const Board& b, const string& from, const string& to, bool whiteToMove) {
        int fr = from[1] - '1', fc = from[0] - 'a', tr = to[1] - '1', tc = to[0] - 'a';
        char piece = b[fr][fc];
        if (piece == '.' || isUpper(piece) != whiteToMove) return false;       // empty or wrong side
        if (fr == tr && fc == tc) return false;
        char target = b[tr][tc];
        if (target != '.' && isUpper(target) == whiteToMove) return false;     // own piece
        auto it = rules().find(static_cast<char>(toupper(piece)));
        if (it == rules().end() || !it->second(b, fr, fc, tr, tc)) return false;
        Board next = b;
        next[tr][tc] = piece;
        next[fr][fc] = '.';
        return !inCheck(next, whiteToMove);
    }

    static bool inCheck(const Board& b, bool white) {
        char king = white ? 'K' : 'k';
        int kr = -1, kc = -1;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == king) { kr = r; kc = c; }
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            char p = b[r][c];
            if (p == '.' || isUpper(p) == white) continue;                      // only enemy pieces
            if (rules().at(static_cast<char>(toupper(p)))(b, r, c, kr, kc)) return true;
        }
        return false;
    }
};

int main() {
    cout << boolalpha;
    Board start = ChessRules::parse({"rnbqkbnr", "pppppppp", "........", "........",
                                     "........", "........", "PPPPPPPP", "RNBQKBNR"});
    cout << "e2-e4 " << ChessRules::isLegal(start, "e2", "e4", true) << "\n";   // true
    cout << "e2-e5 " << ChessRules::isLegal(start, "e2", "e5", true) << "\n";   // false
    cout << "f1-c4 " << ChessRules::isLegal(start, "f1", "c4", true) << "\n";   // false (blocked)
    cout << "g1-f3 " << ChessRules::isLegal(start, "g1", "f3", true) << "\n";   // true
    cout << "e7-e5 " << ChessRules::isLegal(start, "e7", "e5", true) << "\n";   // false (not your piece)

    Board pin = ChessRules::parse({"......k.", "....r...", "........", "........",
                                   "........", "........", "...PR...", "....K..."});
    cout << "pinned Re2-g2 " << ChessRules::isLegal(pin, "e2", "g2", true) << "\n";   // false
    cout << "pinned Re2-e7 " << ChessRules::isLegal(pin, "e2", "e7", true) << "\n";   // true (capture)
    cout << "Ke1-f2 " << ChessRules::isLegal(pin, "e1", "f2", true) << "\n";          // true

    cout << "empty square e3-e4 " << ChessRules::isLegal(start, "e3", "e4", true) << "\n";   // false
    cout << "own piece d1-d2 " << ChessRules::isLegal(start, "d1", "d2", true) << "\n";      // false
    Board rookNear = ChessRules::parse({"k.......", "........", "........", "........",
                                        "........", "........", "...r....", "....K..."});
    cout << "Ke1-e2 into rook check " << ChessRules::isLegal(rookNear, "e1", "e2", true) << "\n";   // false
    cout << "Ke1xd2 takes the rook " << ChessRules::isLegal(rookNear, "e1", "d2", true) << "\n";    // true
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

delegate bool MoveRule(char[][] b, int fr, int fc, int tr, int tc);

static class ChessRules {
    public static readonly Dictionary<char, MoveRule> RULES = new Dictionary<char, MoveRule>();
    static ChessRules() {
        RULES['R'] = (b, fr, fc, tr, tc) => (fr == tr || fc == tc) && PathClear(b, fr, fc, tr, tc);
        RULES['B'] = (b, fr, fc, tr, tc) => Math.Abs(fr - tr) == Math.Abs(fc - tc) && PathClear(b, fr, fc, tr, tc);
        RULES['Q'] = (b, fr, fc, tr, tc) => RULES['R'](b, fr, fc, tr, tc) || RULES['B'](b, fr, fc, tr, tc);
        RULES['N'] = (b, fr, fc, tr, tc) => Math.Abs(fr - tr) * Math.Abs(fc - tc) == 2;
        RULES['K'] = (b, fr, fc, tr, tc) => Math.Abs(fr - tr) <= 1 && Math.Abs(fc - tc) <= 1;
        RULES['P'] = (b, fr, fc, tr, tc) => {
            bool white = char.IsUpper(b[fr][fc]);
            int dir = white ? 1 : -1, dr = tr - fr, dc = Math.Abs(tc - fc);
            char target = b[tr][tc];
            if (dc == 0 && dr == dir) return target == '.';
            if (dc == 0 && dr == 2 * dir) return fr == (white ? 1 : 6) && target == '.' && b[fr + dir][fc] == '.';
            return dc == 1 && dr == dir && target != '.' && char.IsUpper(target) != white;
        };
    }

    // Walk from (fr,fc) toward (tr,tc) one step at a time; every square in between must be empty.
    public static bool PathClear(char[][] b, int fr, int fc, int tr, int tc) {
        int sr = Math.Sign(tr - fr), sc = Math.Sign(tc - fc);
        for (int r = fr + sr, c = fc + sc; r != tr || c != tc; r += sr, c += sc)
            if (b[r][c] != '.') return false;
        return true;
    }

    public static char[][] Parse(string[] ranks8to1) {
        char[][] b = new char[8][];
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i].ToCharArray();   // row 0 = rank 1
        return b;
    }

    public static bool IsLegal(char[][] b, string from, string to, bool whiteToMove) {
        int fr = from[1] - '1', fc = from[0] - 'a', tr = to[1] - '1', tc = to[0] - 'a';
        char piece = b[fr][fc];
        if (piece == '.' || char.IsUpper(piece) != whiteToMove) return false;   // empty or wrong side
        if (fr == tr && fc == tc) return false;
        char target = b[tr][tc];
        if (target != '.' && char.IsUpper(target) == whiteToMove) return false; // own piece
        MoveRule rule;
        if (!RULES.TryGetValue(char.ToUpper(piece), out rule) || !rule(b, fr, fc, tr, tc)) return false;
        char[][] next = new char[8][];
        for (int r = 0; r < 8; r++) next[r] = (char[])b[r].Clone();
        next[tr][tc] = piece;
        next[fr][fc] = '.';
        return !InCheck(next, whiteToMove);
    }

    public static bool InCheck(char[][] b, bool white) {
        char king = white ? 'K' : 'k';
        int kr = -1, kc = -1;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == king) { kr = r; kc = c; }
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            char p = b[r][c];
            if (p == '.' || char.IsUpper(p) == white) continue;              // only enemy pieces
            if (RULES[char.ToUpper(p)](b, r, c, kr, kc)) return true;
        }
        return false;
    }
}

class ChessValidatorDemo {
    static string B(bool b) { return b.ToString().ToLower(); }
    static void Main() {
        char[][] start = ChessRules.Parse(new[] {
            "rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR" });
        Console.WriteLine("e2-e4 " + B(ChessRules.IsLegal(start, "e2", "e4", true)));   // true
        Console.WriteLine("e2-e5 " + B(ChessRules.IsLegal(start, "e2", "e5", true)));   // false
        Console.WriteLine("f1-c4 " + B(ChessRules.IsLegal(start, "f1", "c4", true)));   // false (blocked)
        Console.WriteLine("g1-f3 " + B(ChessRules.IsLegal(start, "g1", "f3", true)));   // true
        Console.WriteLine("e7-e5 " + B(ChessRules.IsLegal(start, "e7", "e5", true)));   // false (not your piece)

        char[][] pin = ChessRules.Parse(new[] {
            "......k.", "....r...", "........", "........", "........", "........", "...PR...", "....K..." });
        Console.WriteLine("pinned Re2-g2 " + B(ChessRules.IsLegal(pin, "e2", "g2", true)));  // false
        Console.WriteLine("pinned Re2-e7 " + B(ChessRules.IsLegal(pin, "e2", "e7", true)));  // true (capture)
        Console.WriteLine("Ke1-f2 " + B(ChessRules.IsLegal(pin, "e1", "f2", true)));         // true

        Console.WriteLine("empty square e3-e4 " + B(ChessRules.IsLegal(start, "e3", "e4", true)));   // false
        Console.WriteLine("own piece d1-d2 " + B(ChessRules.IsLegal(start, "d1", "d2", true)));      // false
        char[][] rookNear = ChessRules.Parse(new[] {
            "k.......", "........", "........", "........", "........", "........", "...r....", "....K..." });
        Console.WriteLine("Ke1-e2 into rook check " + B(ChessRules.IsLegal(rookNear, "e1", "e2", true)));   // false
        Console.WriteLine("Ke1xd2 takes the rook " + B(ChessRules.IsLegal(rookNear, "e1", "d2", true)));    // true
    }
}` }
        ],
        dry: { head: ['Move', 'Basic checks', 'Rule', 'Simulated king safe?', 'Result'], rows: [['e2→e4 (start)', 'ok', 'pawn double step, e3 & e4 empty', 'yes', H.c('g', 'true')], ['f1→c4 (start)', 'ok', 'bishop diagonal, but e2 occupied', '—', H.c('r', 'false')], ['Re2→g2 (pin)', 'ok', 'rook straight, f2 empty', 'no: re7 sees Ke1', H.c('r', 'false')], ['Re2→e7 (pin)', 'ok', 'rook straight, e3..e6 empty', 'yes: attacker captured', H.c('g', 'true')]] },
        complexity: `<p>Rule check O(8) for the path. King-safety check scans 64 squares and runs a rule (≤ 8 steps) for each enemy piece: O(64 · 8) ≈ constant. Copy O(64). Comfortably 10<sup>5</sup>+ validations per second.</p>`,
        followUps: ['Add castling: what extra state must the board carry?', 'Add en passant without breaking the "pawn captures only occupied squares" rule.', 'Return the reason for rejection (enum) instead of a boolean.', 'Make inCheck O(1)-ish by scanning outward from the king instead of over all pieces.']
      }
    }]
  });

  /* ======================= TOPIC 4: KV STORE WITH TRANSACTIONS + TTL ======================= */
  var KV_CORE = String.raw`
// ===== In-memory key-value store: GET/SET/DEL/COUNT, nested BEGIN/ROLLBACK/COMMIT, TTL =====

// Time is injected so tests can move the clock by hand (no Thread.sleep in tests!).
interface Ticker { long nowMillis(); }

class ManualTicker implements Ticker {
    private long now;
    public long nowMillis() { return now; }
    void advance(long ms) { now += ms; }
}

// expireAt == 0 means "never expires".
record Entry(String value, long expireAt) {
    boolean expired(long now) { return expireAt > 0 && now >= expireAt; }
}

// One scheduled expiry. Stale ones (key overwritten or deleted) are skipped when popped.
record Expiry(long at, String key) { }

class KVStore {
    private final Map<String, Entry> data = new HashMap<>();
    private final Map<String, Integer> valueCount = new HashMap<>();      // value -> how many keys hold it
    // Undo log per open transaction: key -> value BEFORE the transaction first touched it
    // (Optional.empty() = key did not exist). Top of the stack = innermost transaction.
    private final Deque<Map<String, Optional<Entry>>> txStack = new ArrayDeque<>();
    private final PriorityQueue<Expiry> expiries = new PriorityQueue<>(Comparator.comparingLong(Expiry::at));
    private final Ticker clock;

    KVStore(Ticker clock) { this.clock = clock; }

    // ---------- reads ----------
    synchronized String get(String key) {
        Entry e = data.get(key);
        if (e == null) return null;
        if (e.expired(clock.nowMillis())) { writeRaw(key, null); return null; }   // LAZY expiry on access
        return e.value();
    }
    synchronized int count(String value) {
        expireDue();                                   // make the index exact before answering
        return valueCount.getOrDefault(value, 0);
    }
    // Redis-style TTL: -2 = no such key, -1 = no expiry, else milliseconds left.
    synchronized long ttl(String key) {
        if (get(key) == null) return -2;
        Entry e = data.get(key);
        return e.expireAt() == 0 ? -1 : e.expireAt() - clock.nowMillis();
    }

    // ---------- writes (all go through recordUndo + writeRaw) ----------
    synchronized void set(String key, String value) { set(key, value, 0); }
    synchronized void set(String key, String value, long ttlMillis) {
        recordUndo(key);
        writeRaw(key, new Entry(value, ttlMillis > 0 ? clock.nowMillis() + ttlMillis : 0));
    }
    synchronized boolean delete(String key) {
        if (get(key) == null) return false;
        recordUndo(key);
        writeRaw(key, null);
        return true;
    }

    // ---------- transactions ----------
    synchronized void begin() { txStack.push(new HashMap<>()); }

    synchronized boolean rollback() {
        if (txStack.isEmpty()) return false;           // "NO TRANSACTION"
        Map<String, Optional<Entry>> undo = txStack.pop();
        undo.forEach((k, old) -> writeRaw(k, old.orElse(null)));   // put every touched key back
        return true;
    }

    // Commit the innermost transaction. Its undo info moves into the parent,
    // so rolling back the parent later still restores the ORIGINAL values.
    synchronized boolean commit() {
        if (txStack.isEmpty()) return false;
        Map<String, Optional<Entry>> top = txStack.pop();
        if (!txStack.isEmpty()) top.forEach(txStack.peek()::putIfAbsent);   // parent's older snapshot wins
        return true;
    }
    synchronized int depth() { return txStack.size(); }

    // ---------- expiry ----------
    // ACTIVE expiry: remove everything whose time has come (a scheduler would call this every 100 ms).
    synchronized int expireDue() {
        int removed = 0;
        long now = clock.nowMillis();
        while (!expiries.isEmpty() && expiries.peek().at() <= now) {
            Expiry x = expiries.poll();
            Entry e = data.get(x.key());
            if (e != null && e.expireAt() == x.at()) { writeRaw(x.key(), null); removed++; }   // skip stale heap entries
        }
        return removed;
    }

    // ---------- internals ----------
    private void recordUndo(String key) {
        if (!txStack.isEmpty()) txStack.peek().putIfAbsent(key, Optional.ofNullable(data.get(key)));  // first touch only
    }
    // The ONLY method that changes data; keeps the value index and expiry heap in sync.
    private void writeRaw(String key, Entry e) {
        Entry old = e == null ? data.remove(key) : data.put(key, e);
        if (old != null) valueCount.merge(old.value(), -1, (a, b) -> a + b == 0 ? null : a + b);
        if (e != null) {
            valueCount.merge(e.value(), 1, Integer::sum);
            if (e.expireAt() > 0) expiries.add(new Expiry(e.expireAt(), key));
        }
    }
}

public class KVStoreDemo {
    public static void main(String[] args) {
        ManualTicker clock = new ManualTicker();
        KVStore kv = new KVStore(clock);

        kv.set("a", "10");
        kv.begin();                         // T1
        kv.set("a", "20");
        kv.set("b", "20");
        System.out.println("T1: a=" + kv.get("a") + " count(20)=" + kv.count("20"));     // 20, 2
        kv.begin();                         // T2 (nested)
        kv.delete("a");
        System.out.println("T2: a=" + kv.get("a"));                                      // null
        kv.rollback();                      // undo T2 only
        System.out.println("after rollback T2: a=" + kv.get("a"));                       // 20
        kv.commit();                        // T1 becomes permanent
        System.out.println("after commit: a=" + kv.get("a") + " b=" + kv.get("b") + " depth=" + kv.depth());

        kv.begin();
        kv.set("a", "99");
        kv.begin();
        kv.set("a", "100");
        kv.commit();                        // inner commit merges undo into outer
        kv.rollback();                      // outer rollback must restore 20, not 99
        System.out.println("nested commit then outer rollback: a=" + kv.get("a"));       // 20
        System.out.println("rollback with no tx -> " + kv.rollback());                    // false

        kv.set("session", "s-1", 5_000);    // TTL 5 s
        kv.set("otp", "1234", 2_000);       // TTL 2 s
        clock.advance(1_000);
        System.out.println("t=1s ttl(otp)=" + kv.ttl("otp") + "ms, ttl(a)=" + kv.ttl("a"));
        clock.advance(1_500);
        System.out.println("t=2.5s otp=" + kv.get("otp") + " (lazy expiry on read)");
        kv.set("session", "s-2", 10_000);   // overwrite -> old heap entry becomes stale
        kv.set("cache", "v", 1_000);        // nobody will read this one: only the active sweep frees it
        clock.advance(4_000);
        System.out.println("t=6.5s expireDue removed " + kv.expireDue() + ", session=" + kv.get("session"));

        kv.begin();
        kv.set("session", "s-3");           // remove TTL inside a tx
        kv.rollback();                      // TTL entry restored, including its expiry time
        System.out.println("after rollback ttl(session)=" + kv.ttl("session") + "ms");
        System.out.println("commit with no tx -> " + kv.commit() + ", delete of a missing key -> " + kv.delete("nope"));
    }
}`;
  var KV_CORE_PY = String.raw`
# ===== In-memory key-value store: GET/SET/DEL/COUNT, nested BEGIN/ROLLBACK/COMMIT, TTL =====
import heapq
import threading
from dataclasses import dataclass
from typing import Optional, Protocol


# Time is injected so tests can move the clock by hand (no time.sleep in tests!).
class Ticker(Protocol):
    def now_millis(self) -> int: ...


class ManualTicker:
    def __init__(self) -> None:
        self._now = 0

    def now_millis(self) -> int:
        return self._now

    def advance(self, ms: int) -> None:
        self._now += ms


# expire_at == 0 means "never expires".
@dataclass(frozen=True)
class Entry:
    value: str
    expire_at: int

    def expired(self, now: int) -> bool:
        return self.expire_at > 0 and now >= self.expire_at


class KVStore:
    def __init__(self, clock: Ticker) -> None:
        self._data: dict[str, Entry] = {}
        self._value_count: dict[str, int] = {}                  # value -> how many keys hold it
        # Undo log per open transaction: key -> Entry BEFORE the transaction first touched it
        # (None = key did not exist). The last item of the list is the innermost transaction.
        self._tx_stack: list[dict[str, Optional[Entry]]] = []
        # One scheduled expiry per (at, key). Stale ones (key overwritten or deleted) are skipped when popped.
        self._expiries: list[tuple[int, str]] = []
        self._clock = clock
        self._lock = threading.RLock()

    # ---------- reads ----------
    def get(self, key: str) -> Optional[str]:
        with self._lock:
            e = self._data.get(key)
            if e is None:
                return None
            if e.expired(self._clock.now_millis()):
                self._write_raw(key, None)                       # LAZY expiry on access
                return None
            return e.value

    def count(self, value: str) -> int:
        with self._lock:
            self.expire_due()                                    # make the index exact before answering
            return self._value_count.get(value, 0)

    # Redis-style TTL: -2 = no such key, -1 = no expiry, else milliseconds left.
    def ttl(self, key: str) -> int:
        with self._lock:
            if self.get(key) is None:
                return -2
            e = self._data[key]
            return -1 if e.expire_at == 0 else e.expire_at - self._clock.now_millis()

    # ---------- writes (all go through _record_undo + _write_raw) ----------
    def set(self, key: str, value: str, ttl_millis: int = 0) -> None:
        with self._lock:
            self._record_undo(key)
            expire_at = self._clock.now_millis() + ttl_millis if ttl_millis > 0 else 0
            self._write_raw(key, Entry(value, expire_at))

    def delete(self, key: str) -> bool:
        with self._lock:
            if self.get(key) is None:
                return False
            self._record_undo(key)
            self._write_raw(key, None)
            return True

    # ---------- transactions ----------
    def begin(self) -> None:
        with self._lock:
            self._tx_stack.append({})

    def rollback(self) -> bool:
        with self._lock:
            if not self._tx_stack:
                return False                                     # "NO TRANSACTION"
            undo = self._tx_stack.pop()
            for k, old in undo.items():                          # put every touched key back
                self._write_raw(k, old)
            return True

    # Commit the innermost transaction. Its undo info moves into the parent,
    # so rolling back the parent later still restores the ORIGINAL values.
    def commit(self) -> bool:
        with self._lock:
            if not self._tx_stack:
                return False
            top = self._tx_stack.pop()
            if self._tx_stack:
                for k, old in top.items():
                    self._tx_stack[-1].setdefault(k, old)        # parent's older snapshot wins
            return True

    def depth(self) -> int:
        with self._lock:
            return len(self._tx_stack)

    # ---------- expiry ----------
    # ACTIVE expiry: remove everything whose time has come (a scheduler would call this every 100 ms).
    def expire_due(self) -> int:
        with self._lock:
            removed = 0
            now = self._clock.now_millis()
            while self._expiries and self._expiries[0][0] <= now:
                at, key = heapq.heappop(self._expiries)
                e = self._data.get(key)
                if e is not None and e.expire_at == at:          # skip stale heap entries
                    self._write_raw(key, None)
                    removed += 1
            return removed

    # ---------- internals ----------
    def _record_undo(self, key: str) -> None:
        if self._tx_stack:
            self._tx_stack[-1].setdefault(key, self._data.get(key))   # first touch only

    # The ONLY method that changes data; keeps the value index and expiry heap in sync.
    def _write_raw(self, key: str, e: Optional[Entry]) -> None:
        old = self._data.pop(key, None) if e is None else self._data.get(key)
        if e is not None:
            self._data[key] = e
        if old is not None:
            left = self._value_count[old.value] - 1
            if left == 0:
                del self._value_count[old.value]
            else:
                self._value_count[old.value] = left
        if e is not None:
            self._value_count[e.value] = self._value_count.get(e.value, 0) + 1
            if e.expire_at > 0:
                heapq.heappush(self._expiries, (e.expire_at, key))


def show(v: Optional[str]) -> str:
    return "null" if v is None else v


def main() -> None:
    clock = ManualTicker()
    kv = KVStore(clock)

    kv.set("a", "10")
    kv.begin()                          # T1
    kv.set("a", "20")
    kv.set("b", "20")
    print(f"T1: a={show(kv.get('a'))} count(20)={kv.count('20')}")             # 20, 2
    kv.begin()                          # T2 (nested)
    kv.delete("a")
    print(f"T2: a={show(kv.get('a'))}")                                         # null
    kv.rollback()                       # undo T2 only
    print(f"after rollback T2: a={show(kv.get('a'))}")                          # 20
    kv.commit()                         # T1 becomes permanent
    print(f"after commit: a={show(kv.get('a'))} b={show(kv.get('b'))} depth={kv.depth()}")

    kv.begin()
    kv.set("a", "99")
    kv.begin()
    kv.set("a", "100")
    kv.commit()                         # inner commit merges undo into outer
    kv.rollback()                       # outer rollback must restore 20, not 99
    print(f"nested commit then outer rollback: a={show(kv.get('a'))}")          # 20
    print(f"rollback with no tx -> {str(kv.rollback()).lower()}")               # false

    kv.set("session", "s-1", 5_000)     # TTL 5 s
    kv.set("otp", "1234", 2_000)        # TTL 2 s
    clock.advance(1_000)
    print(f"t=1s ttl(otp)={kv.ttl('otp')}ms, ttl(a)={kv.ttl('a')}")
    clock.advance(1_500)
    print(f"t=2.5s otp={show(kv.get('otp'))} (lazy expiry on read)")
    kv.set("session", "s-2", 10_000)    # overwrite -> old heap entry becomes stale
    kv.set("cache", "v", 1_000)         # nobody will read this one: only the active sweep frees it
    clock.advance(4_000)
    removed = kv.expire_due()
    print(f"t=6.5s expireDue removed {removed}, session={show(kv.get('session'))}")

    kv.begin()
    kv.set("session", "s-3")            # remove TTL inside a tx
    kv.rollback()                       # TTL entry restored, including its expiry time
    print(f"after rollback ttl(session)={kv.ttl('session')}ms")
    print(f"commit with no tx -> {str(kv.commit()).lower()}, delete of a missing key -> {str(kv.delete('nope')).lower()}")


if __name__ == "__main__":
    main()`;
  var KV_CORE_TS = String.raw`
// ===== In-memory key-value store: GET/SET/DEL/COUNT, nested BEGIN/ROLLBACK/COMMIT, TTL =====

// Time is injected so tests can move the clock by hand (no setTimeout in tests!).
interface Ticker { nowMillis(): number; }

class ManualTicker implements Ticker {
  private now = 0;
  nowMillis(): number { return this.now; }
  advance(ms: number): void { this.now += ms; }
}

// expireAt === 0 means "never expires".
interface Entry { readonly value: string; readonly expireAt: number; }
const expired = (e: Entry, now: number): boolean => e.expireAt > 0 && now >= e.expireAt;

// One scheduled expiry. Stale ones (key overwritten or deleted) are skipped when popped.
interface Expiry { readonly at: number; readonly key: string; }

// JavaScript has no built-in heap, so here is a small binary min-heap.
class MinHeap<T> {
  private readonly items: T[] = [];
  constructor(private readonly less: (a: T, b: T) => boolean) {}
  get size(): number { return this.items.length; }
  peek(): T | undefined { return this.items[0]; }
  push(x: T): void {
    const a = this.items;
    a.push(x);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop() as T;
    if (a.length > 0) {
      a[0] = last;
      for (let i = 0;;) {
        let m = i;
        const l = 2 * i + 1, r = l + 1;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class KVStore {
  private readonly data = new Map<string, Entry>();
  private readonly valueCount = new Map<string, number>();      // value -> how many keys hold it
  // Undo log per open transaction: key -> Entry BEFORE the transaction first touched it
  // (null = key did not exist). The last item of the array is the innermost transaction.
  private readonly txStack: Map<string, Entry | null>[] = [];
  private readonly expiries = new MinHeap<Expiry>((a, b) => a.at < b.at);

  constructor(private readonly clock: Ticker) {}

  // ---------- reads ----------
  get(key: string): string | null {
    const e = this.data.get(key);
    if (e === undefined) return null;
    if (expired(e, this.clock.nowMillis())) { this.writeRaw(key, null); return null; }   // LAZY expiry on access
    return e.value;
  }
  count(value: string): number {
    this.expireDue();                                           // make the index exact before answering
    return this.valueCount.get(value) ?? 0;
  }
  // Redis-style TTL: -2 = no such key, -1 = no expiry, else milliseconds left.
  ttl(key: string): number {
    if (this.get(key) === null) return -2;
    const e = this.data.get(key)!;
    return e.expireAt === 0 ? -1 : e.expireAt - this.clock.nowMillis();
  }

  // ---------- writes (all go through recordUndo + writeRaw) ----------
  set(key: string, value: string, ttlMillis = 0): void {
    this.recordUndo(key);
    this.writeRaw(key, { value, expireAt: ttlMillis > 0 ? this.clock.nowMillis() + ttlMillis : 0 });
  }
  delete(key: string): boolean {
    if (this.get(key) === null) return false;
    this.recordUndo(key);
    this.writeRaw(key, null);
    return true;
  }

  // ---------- transactions ----------
  begin(): void { this.txStack.push(new Map()); }

  rollback(): boolean {
    const undo = this.txStack.pop();
    if (undo === undefined) return false;                       // "NO TRANSACTION"
    for (const [k, old] of undo) this.writeRaw(k, old);         // put every touched key back
    return true;
  }

  // Commit the innermost transaction. Its undo info moves into the parent,
  // so rolling back the parent later still restores the ORIGINAL values.
  commit(): boolean {
    const top = this.txStack.pop();
    if (top === undefined) return false;
    const parent = this.txStack[this.txStack.length - 1];
    if (parent !== undefined) for (const [k, old] of top) if (!parent.has(k)) parent.set(k, old);   // parent's older snapshot wins
    return true;
  }
  depth(): number { return this.txStack.length; }

  // ---------- expiry ----------
  // ACTIVE expiry: remove everything whose time has come (a scheduler would call this every 100 ms).
  expireDue(): number {
    let removed = 0;
    const now = this.clock.nowMillis();
    for (let x = this.expiries.peek(); x !== undefined && x.at <= now; x = this.expiries.peek()) {
      this.expiries.pop();
      const e = this.data.get(x.key);
      if (e !== undefined && e.expireAt === x.at) { this.writeRaw(x.key, null); removed++; }   // skip stale heap entries
    }
    return removed;
  }

  // ---------- internals ----------
  private recordUndo(key: string): void {
    const top = this.txStack[this.txStack.length - 1];
    if (top !== undefined && !top.has(key)) top.set(key, this.data.get(key) ?? null);           // first touch only
  }
  // The ONLY method that changes data; keeps the value index and expiry heap in sync.
  private writeRaw(key: string, e: Entry | null): void {
    const old = this.data.get(key);
    if (e === null) this.data.delete(key); else this.data.set(key, e);
    if (old !== undefined) {
      const left = (this.valueCount.get(old.value) ?? 0) - 1;
      if (left === 0) this.valueCount.delete(old.value); else this.valueCount.set(old.value, left);
    }
    if (e !== null) {
      this.valueCount.set(e.value, (this.valueCount.get(e.value) ?? 0) + 1);
      if (e.expireAt > 0) this.expiries.push({ at: e.expireAt, key });
    }
  }
}

const show = (v: string | null): string => v ?? "null";

function main(): void {
  const clock = new ManualTicker();
  const kv = new KVStore(clock);

  kv.set("a", "10");
  kv.begin();                         // T1
  kv.set("a", "20");
  kv.set("b", "20");
  console.log("T1: a=" + show(kv.get("a")) + " count(20)=" + kv.count("20"));     // 20, 2
  kv.begin();                         // T2 (nested)
  kv.delete("a");
  console.log("T2: a=" + show(kv.get("a")));                                      // null
  kv.rollback();                      // undo T2 only
  console.log("after rollback T2: a=" + show(kv.get("a")));                       // 20
  kv.commit();                        // T1 becomes permanent
  console.log("after commit: a=" + show(kv.get("a")) + " b=" + show(kv.get("b")) + " depth=" + kv.depth());

  kv.begin();
  kv.set("a", "99");
  kv.begin();
  kv.set("a", "100");
  kv.commit();                        // inner commit merges undo into outer
  kv.rollback();                      // outer rollback must restore 20, not 99
  console.log("nested commit then outer rollback: a=" + show(kv.get("a")));       // 20
  console.log("rollback with no tx -> " + kv.rollback());                          // false

  kv.set("session", "s-1", 5_000);    // TTL 5 s
  kv.set("otp", "1234", 2_000);       // TTL 2 s
  clock.advance(1_000);
  console.log("t=1s ttl(otp)=" + kv.ttl("otp") + "ms, ttl(a)=" + kv.ttl("a"));
  clock.advance(1_500);
  console.log("t=2.5s otp=" + show(kv.get("otp")) + " (lazy expiry on read)");
  kv.set("session", "s-2", 10_000);   // overwrite -> old heap entry becomes stale
  kv.set("cache", "v", 1_000);        // nobody will read this one: only the active sweep frees it
  clock.advance(4_000);
  const removed = kv.expireDue();
  console.log("t=6.5s expireDue removed " + removed + ", session=" + show(kv.get("session")));

  kv.begin();
  kv.set("session", "s-3");           // remove TTL inside a tx
  kv.rollback();                      // TTL entry restored, including its expiry time
  console.log("after rollback ttl(session)=" + kv.ttl("session") + "ms");
  console.log("commit with no tx -> " + kv.commit() + ", delete of a missing key -> " + kv.delete("nope"));
}

main();`;
  var KV_CORE_CPP = String.raw`
// ===== In-memory key-value store: GET/SET/DEL/COUNT, nested BEGIN/ROLLBACK/COMMIT, TTL =====

// Time is injected so tests can move the clock by hand (no sleep_for in tests!).
class Ticker {
public:
    virtual ~Ticker() = default;
    virtual long long nowMillis() const = 0;
};

class ManualTicker : public Ticker {
    long long now = 0;
public:
    long long nowMillis() const override { return now; }
    void advance(long long ms) { now += ms; }
};

// expireAt == 0 means "never expires".
struct Entry {
    string value;
    long long expireAt;
    bool expired(long long now) const { return expireAt > 0 && now >= expireAt; }
};

// One scheduled expiry. Stale ones (key overwritten or deleted) are skipped when popped.
struct Expiry {
    long long at;
    string key;
    bool operator>(const Expiry& o) const { return at > o.at; }
};

class KVStore {
    map<string, Entry> data;
    map<string, int> valueCount;                                   // value -> how many keys hold it
    // Undo log per open transaction: key -> Entry BEFORE the transaction first touched it
    // (empty optional = key did not exist). The back of the vector is the innermost transaction.
    vector<map<string, optional<Entry>>> txStack;
    priority_queue<Expiry, vector<Expiry>, greater<Expiry>> expiries;   // min-heap (the default is a max-heap)
    const Ticker& clock;
    mutable recursive_mutex mu;

    void recordUndo(const string& key) {
        if (txStack.empty()) return;
        auto it = data.find(key);
        txStack.back().try_emplace(key, it == data.end() ? nullopt : optional<Entry>(it->second));   // first touch only
    }
    // The ONLY method that changes data; keeps the value index and expiry heap in sync.
    void writeRaw(const string& key, const optional<Entry>& e) {
        auto it = data.find(key);
        optional<Entry> old = it == data.end() ? nullopt : optional<Entry>(it->second);
        if (e) data[key] = *e; else data.erase(key);
        if (old && --valueCount[old->value] == 0) valueCount.erase(old->value);
        if (e) {
            valueCount[e->value]++;
            if (e->expireAt > 0) expiries.push({e->expireAt, key});
        }
    }
public:
    explicit KVStore(const Ticker& c) : clock(c) {}

    // ---------- reads ----------
    optional<string> get(const string& key) {
        lock_guard<recursive_mutex> lock(mu);
        auto it = data.find(key);
        if (it == data.end()) return nullopt;
        if (it->second.expired(clock.nowMillis())) { writeRaw(key, nullopt); return nullopt; }   // LAZY expiry on access
        return it->second.value;
    }
    int count(const string& value) {
        lock_guard<recursive_mutex> lock(mu);
        expireDue();                                               // make the index exact before answering
        auto it = valueCount.find(value);
        return it == valueCount.end() ? 0 : it->second;
    }
    // Redis-style TTL: -2 = no such key, -1 = no expiry, else milliseconds left.
    long long ttl(const string& key) {
        lock_guard<recursive_mutex> lock(mu);
        if (!get(key)) return -2;
        const Entry& e = data.at(key);
        return e.expireAt == 0 ? -1 : e.expireAt - clock.nowMillis();
    }

    // ---------- writes (all go through recordUndo + writeRaw) ----------
    void set(const string& key, const string& value, long long ttlMillis = 0) {
        lock_guard<recursive_mutex> lock(mu);
        recordUndo(key);
        writeRaw(key, Entry{value, ttlMillis > 0 ? clock.nowMillis() + ttlMillis : 0});
    }
    bool del(const string& key) {                                  // "delete" is a C++ keyword
        lock_guard<recursive_mutex> lock(mu);
        if (!get(key)) return false;
        recordUndo(key);
        writeRaw(key, nullopt);
        return true;
    }

    // ---------- transactions ----------
    void begin() { lock_guard<recursive_mutex> lock(mu); txStack.emplace_back(); }

    bool rollback() {
        lock_guard<recursive_mutex> lock(mu);
        if (txStack.empty()) return false;                         // "NO TRANSACTION"
        auto undo = move(txStack.back());
        txStack.pop_back();
        for (const auto& [k, old] : undo) writeRaw(k, old);        // put every touched key back
        return true;
    }

    // Commit the innermost transaction. Its undo info moves into the parent,
    // so rolling back the parent later still restores the ORIGINAL values.
    bool commit() {
        lock_guard<recursive_mutex> lock(mu);
        if (txStack.empty()) return false;
        auto top = move(txStack.back());
        txStack.pop_back();
        if (!txStack.empty()) for (auto& [k, old] : top) txStack.back().try_emplace(k, old);   // parent's older snapshot wins
        return true;
    }
    int depth() const { lock_guard<recursive_mutex> lock(mu); return static_cast<int>(txStack.size()); }

    // ---------- expiry ----------
    // ACTIVE expiry: remove everything whose time has come (a scheduler would call this every 100 ms).
    int expireDue() {
        lock_guard<recursive_mutex> lock(mu);
        int removed = 0;
        long long now = clock.nowMillis();
        while (!expiries.empty() && expiries.top().at <= now) {
            Expiry x = expiries.top();
            expiries.pop();
            auto it = data.find(x.key);
            if (it != data.end() && it->second.expireAt == x.at) { writeRaw(x.key, nullopt); removed++; }   // skip stale heap entries
        }
        return removed;
    }
};

string show(const optional<string>& v) { return v.value_or("null"); }

int main() {
    cout << boolalpha;
    ManualTicker clock;
    KVStore kv(clock);

    kv.set("a", "10");
    kv.begin();                         // T1
    kv.set("a", "20");
    kv.set("b", "20");
    cout << "T1: a=" << show(kv.get("a")) << " count(20)=" << kv.count("20") << "\n";     // 20, 2
    kv.begin();                         // T2 (nested)
    kv.del("a");
    cout << "T2: a=" << show(kv.get("a")) << "\n";                                        // null
    kv.rollback();                      // undo T2 only
    cout << "after rollback T2: a=" << show(kv.get("a")) << "\n";                         // 20
    kv.commit();                        // T1 becomes permanent
    cout << "after commit: a=" << show(kv.get("a")) << " b=" << show(kv.get("b")) << " depth=" << kv.depth() << "\n";

    kv.begin();
    kv.set("a", "99");
    kv.begin();
    kv.set("a", "100");
    kv.commit();                        // inner commit merges undo into outer
    kv.rollback();                      // outer rollback must restore 20, not 99
    cout << "nested commit then outer rollback: a=" << show(kv.get("a")) << "\n";         // 20
    cout << "rollback with no tx -> " << kv.rollback() << "\n";                            // false

    kv.set("session", "s-1", 5'000);    // TTL 5 s
    kv.set("otp", "1234", 2'000);       // TTL 2 s
    clock.advance(1'000);
    cout << "t=1s ttl(otp)=" << kv.ttl("otp") << "ms, ttl(a)=" << kv.ttl("a") << "\n";
    clock.advance(1'500);
    cout << "t=2.5s otp=" << show(kv.get("otp")) << " (lazy expiry on read)\n";
    kv.set("session", "s-2", 10'000);   // overwrite -> old heap entry becomes stale
    kv.set("cache", "v", 1'000);        // nobody will read this one: only the active sweep frees it
    clock.advance(4'000);
    int removed = kv.expireDue();
    cout << "t=6.5s expireDue removed " << removed << ", session=" << show(kv.get("session")) << "\n";

    kv.begin();
    kv.set("session", "s-3");           // remove TTL inside a tx
    kv.rollback();                      // TTL entry restored, including its expiry time
    cout << "after rollback ttl(session)=" << kv.ttl("session") << "ms\n";
    bool committed = kv.commit();
    bool deleted = kv.del("nope");
    cout << "commit with no tx -> " << committed << ", delete of a missing key -> " << deleted << "\n";
}`;

  var KV_NODES = [
    B('CL', 'Client / CommandParser', 14, 8, 24), B('KV', 'KVStore (synchronized facade)', 48, 8, 28), B('TK', 'Ticker (clock)', 84, 8, 16),
    B('DT', 'data: Map<key, Entry>', 16, 34, 24), B('TX', 'txStack: Deque<undo map>', 48, 34, 26), B('PQ', 'expiries: min-heap', 82, 34, 20),
    B('EN', 'Entry(value, expireAt)', 16, 60, 24), B('IX', 'valueCount index', 48, 60, 20), B('EX', 'Expiry(at, key)', 82, 60, 18)
  ];
  var KV_EDGES = [['CL', 'KV', 'SET/GET/BEGIN…'], ['KV', 'TK', 'now()'], ['KV', 'DT', 'owns'], ['KV', 'TX', 'owns'], ['KV', 'PQ', 'owns'], ['DT', 'EN', 'values'], ['KV', 'IX', 'owns'], ['PQ', 'EX', 'items']];
  function kvClassViz() {
    return classTour('KV store — class diagram', KV_NODES, KV_EDGES, [
      { narr: 'The whole store is one <b>facade</b> class with four private data structures. Every public method takes the one lock (Java <code>synchronized</code>, Python <code>RLock</code>, C++ <code>recursive_mutex</code>; JavaScript runs one task at a time), so the four always change together (one lock = no torn updates).', on: ['KV'] },
      { narr: '<b>data</b> maps key → <b>Entry(value, expireAt)</b>. Storing the absolute expiry time (not "seconds left") makes checks a single comparison: <code>now ≥ expireAt</code>.', on: ['DT', 'EN'], edges: ['KV-DT', 'DT-EN'] },
      { narr: '<b>txStack</b>: one <b>undo map</b> per open transaction. On the FIRST write to a key inside a transaction we save its old Entry (or "absent"). ROLLBACK = write the saved values back. COMMIT = pop and merge into the parent.', on: ['TX'], edges: ['KV-TX'], cls: 'sel',
        code: 'private void recordUndo(String key) {\n  if (!txStack.isEmpty())\n    txStack.peek().putIfAbsent(key,\n        Optional.ofNullable(data.get(key)));\n}', codeHl: { 3: 'ok' } },
      { narr: '<b>valueCount</b> is a secondary index (value → number of keys). It makes <code>COUNT value</code> O(1) instead of scanning every key. Because ALL changes go through one private <code>writeRaw()</code>, the index can never drift.', on: ['IX'], edges: ['KV-IX'],
        code: 'private void writeRaw(String key, Entry e) {\n  Entry old = e == null ? data.remove(key) : data.put(key, e);\n  if (old != null) decrement(old.value());\n  if (e != null) increment(e.value());\n}', codeHl: { 2: 'cur', 3: 'ok', 4: 'ok' } },
      { narr: '<b>expiries</b> is a min-heap of <b>Expiry(at, key)</b> for <b>active</b> expiry: pop everything whose time has passed. <b>Lazy</b> expiry also runs on every GET. Overwritten keys leave stale heap items — we skip them by comparing <code>expireAt</code>.', on: ['PQ', 'EX'], edges: ['KV-PQ', 'PQ-EX'] },
      { narr: '<b>Ticker</b> is an injected clock. Tests use a ManualTicker and call <code>advance(2000)</code> instead of sleeping — fast, deterministic tests. This "inject time" habit is what interviewers look for in any TTL/rate-limit design.', on: ['TK', 'CL'], edges: ['KV-TK', 'CL-KV'],
        table: { label: 'Operation costs', cols: ['Operation', 'Cost'], rows: [['GET / SET / DEL', 'O(1) (+ O(log n) heap push if TTL)'], ['COUNT value', 'O(1) after expiring due keys'], ['BEGIN', 'O(1)'], ['ROLLBACK', 'O(keys touched in that tx)'], ['COMMIT (nested)', 'O(keys touched in that tx)'], ['expireDue', 'O(k log n) for k expired items']] } }
    ], 68);
  }

  function kvTxViz(input) {
    var cmds = String(input === undefined ? '' : input).split(/[;\n]/).map(function (s) { return s.trim(); }).filter(function (s) { return s; });
    if (!cmds.length) throw new Error('Enter commands separated by ; e.g. SET a 10; BEGIN; SET a 20; ROLLBACK; GET a');
    if (cmds.length > 24) throw new Error('Use at most 24 commands');
    var data = {}, order = [], stack = [], frames = [], out = [];
    function cnt() { var c = {}; order.forEach(function (k) { if (data[k] !== undefined) c[data[k]] = (c[data[k]] || 0) + 1; }); return Object.keys(c).map(function (v) { return [v, c[v]]; }); }
    function dataEntries() { return order.filter(function (k) { return data[k] !== undefined; }).map(function (k) { return [k, data[k]]; }); }
    function stackItems() { return stack.map(function (u, i) { var ks = Object.keys(u); return 'T' + (i + 1) + ' undo {' + (ks.length ? ks.map(function (k) { return k + ':' + (u[k] === null ? '∅' : u[k]); }).join(', ') : '') + '}'; }); }
    function snap(narr, hlKey, hlCls, stHl) {
      var mh = {}; if (hlKey) mh[hlKey] = hlCls || 'ok';
      var sh = {}; if (stHl !== undefined && stack.length) sh[stHl] = 'cur';
      frames.push(F(narr, [STACK('Transaction stack (top = innermost) — each holds old values', stack.length ? stackItems() : ['(no open transaction)'], sh), MAP('data (what GET sees)', dataEntries().length ? dataEntries() : [['(empty)', '']], mh), MAP('valueCount index (for COUNT)', cnt().length ? cnt() : [['(empty)', '']]), TABLE('Output', ['#', 'command', 'result'], out.length ? out.slice(-6) : [['', '', '']])]));
    }
    function write(k, v) {
      if (stack.length) { var top = stack[stack.length - 1]; if (!(k in top)) top[k] = data[k] === undefined ? null : data[k]; }
      if (v === null) delete data[k]; else { if (order.indexOf(k) < 0) order.push(k); data[k] = v; }
    }
    snap('Empty store, no transaction. Writes go straight into <b>data</b>; inside a transaction we ALSO remember the old value (once per key) in the top undo map.');
    cmds.forEach(function (line, n) {
      var t = line.split(/\s+/), op = t[0].toUpperCase(), k = t[1], v = t[2], res, narr;
      if (op === 'SET') {
        if (!k || v === undefined) throw new Error('SET needs a key and a value: SET a 10');
        var hadUndo = stack.length && (k in stack[stack.length - 1]);
        write(k, v); res = 'OK';
        narr = '<b>SET ' + esc(k) + ' ' + esc(v) + '</b>. ' + (stack.length ? (hadUndo ? 'T' + stack.length + ' already saved the old value of ' + esc(k) + ' — keep the OLDEST one (putIfAbsent), so rollback goes back to how it was when T' + stack.length + ' began.' : 'First touch of <b>' + esc(k) + '</b> in T' + stack.length + ': save its old value (' + (stack[stack.length - 1][k] === null ? '∅ = did not exist' : stack[stack.length - 1][k]) + ') in the undo map, then write.') : 'No transaction open, so it is written permanently.');
        out.push([n + 1, esc(line), res]); snap(narr, k, 'ok', stack.length - 1);
      } else if (op === 'GET') {
        if (!k) throw new Error('GET needs a key');
        res = data[k] === undefined ? 'NULL' : data[k];
        out.push([n + 1, esc(line), res]);
        snap('<b>GET ' + esc(k) + '</b> → <b>' + esc(res) + '</b>. Reads look only at <b>data</b>: O(1), no matter how many transactions are open (that is the advantage of the undo-log design).', data[k] === undefined ? null : k, 'sel');
      } else if (op === 'DEL' || op === 'DELETE' || op === 'UNSET') {
        if (!k) throw new Error('DEL needs a key');
        var existed = data[k] !== undefined;
        if (existed) write(k, null);
        out.push([n + 1, esc(line), existed ? '1' : '0']);
        snap('<b>DEL ' + esc(k) + '</b>: ' + (existed ? 'removed. ' + (stack.length ? 'Undo map remembers it so ROLLBACK can bring it back.' : '') : 'key not present, nothing to do.'), null, null, stack.length - 1);
      } else if (op === 'COUNT') {
        if (!k) throw new Error('COUNT needs a value');
        var c = 0; order.forEach(function (x) { if (data[x] === k) c++; });
        out.push([n + 1, esc(line), String(c)]);
        snap('<b>COUNT ' + esc(k) + '</b> → ' + c + '. Answered from the <b>valueCount</b> index in O(1); every write and every rollback keeps it in sync.');
      } else if (op === 'BEGIN') {
        stack.push({}); out.push([n + 1, 'BEGIN', 'T' + stack.length + ' opened']);
        snap('<b>BEGIN</b>: push an empty undo map <b>T' + stack.length + '</b>. Cost O(1) — we do NOT copy the data (copying would be O(n) per BEGIN).', null, null, stack.length - 1);
      } else if (op === 'ROLLBACK') {
        if (!stack.length) { out.push([n + 1, 'ROLLBACK', 'NO TRANSACTION']); snap('<b>ROLLBACK</b> with no open transaction → <span class="c-r">NO TRANSACTION</span>.'); return; }
        var u = stack.pop(), keys = Object.keys(u);
        keys.forEach(function (x) { if (u[x] === null) delete data[x]; else { if (order.indexOf(x) < 0) order.push(x); data[x] = u[x]; } });
        out.push([n + 1, 'ROLLBACK', 'restored ' + (keys.join(', ') || 'nothing')]);
        snap('<b>ROLLBACK</b>: pop T' + (stack.length + 1) + ' and write each saved old value back (' + (keys.length ? keys.map(function (x) { return esc(x) + '→' + (u[x] === null ? 'deleted' : esc(u[x])); }).join(', ') : 'nothing was touched') + '). Cost = number of keys that transaction touched, not the size of the store.', keys[0] || null, 'bad');
      } else if (op === 'COMMIT') {
        if (!stack.length) { out.push([n + 1, 'COMMIT', 'NO TRANSACTION']); snap('<b>COMMIT</b> with no open transaction → <span class="c-r">NO TRANSACTION</span>.'); return; }
        var top = stack.pop(), merged = [];
        if (stack.length) { var par = stack[stack.length - 1]; Object.keys(top).forEach(function (x) { if (!(x in par)) { par[x] = top[x]; merged.push(x); } }); }
        out.push([n + 1, 'COMMIT', stack.length ? 'merged into T' + stack.length : 'permanent']);
        snap('<b>COMMIT</b>: the data is already in place, so we just pop T' + (stack.length + 1) + '. ' + (stack.length ? 'Its undo entries move into parent T' + stack.length + ' (only keys the parent had not saved yet' + (merged.length ? ': ' + merged.join(', ') : '') + '), so a later ROLLBACK of T' + stack.length + ' still restores the original values.' : 'No parent: the changes are now permanent.'), null, null, stack.length - 1);
      } else throw new Error('Unknown command "' + t[0] + '". Use SET, GET, DEL, COUNT, BEGIN, ROLLBACK, COMMIT');
    });
    snap('Script finished. ' + (stack.length ? H.c('y', stack.length + ' transaction(s) still open') + ' — a real server would roll them back if the client disconnects.' : 'All transactions closed.') + ' Try: <code>BEGIN; SET x 1; BEGIN; SET x 2; COMMIT; ROLLBACK; GET x</code>.');
    return frames;
  }

  function kvTtlViz(input) {
    var cmds = String(input === undefined ? '' : input).split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
    if (cmds.length < 2) throw new Error('Format: @t COMMAND; e.g. @0 SET otp 1234 EX 2; @3 GET otp');
    if (cmds.length > 16) throw new Error('Use at most 16 commands');
    var data = {}, heap = [], now = 0, frames = [], out = [];
    function heapItems() { return heap.slice().sort(function (a, b) { return a.at - b.at || (a.key < b.key ? -1 : 1); }).map(function (h) { return h.key + '@' + h.at + 's'; }); }
    function entries() { var e = Object.keys(data).map(function (k) { return [k, data[k].v + (data[k].at ? ' (expires @' + data[k].at + 's)' : ' (no TTL)')]; }); return e.length ? e : [['(empty)', '']]; }
    function snap(narr, mh, hh) {
      frames.push(F(narr, [VARS('clock', { now: now + 's' }, { now: 'cur' }), MAP('data', entries(), mh || {}), { type: 'array', label: 'expiry min-heap (sorted view: earliest first)', values: heap.length ? heapItems() : ['(empty)'], hl: hh || {} }, TABLE('Output', ['time', 'command', 'result'], out.length ? out.slice(-5) : [['', '', '']])]));
    }
    snap('Clock at 0 s. Each key stores an absolute <b>expireAt</b>; a min-heap orders upcoming expiries so the cleaner only looks at the front.');
    cmds.forEach(function (line) {
      var m = /^@(\d+)\s+(.+)$/.exec(line);
      if (!m) throw new Error('Each command starts with @time, e.g. "@3 GET otp"');
      var t = +m[1]; if (t < now) throw new Error('Times must not go backwards (' + line + ')'); if (t > 999) throw new Error('Keep times ≤ 999');
      now = t;
      var p = m[2].trim().split(/\s+/), op = p[0].toUpperCase(), k = p[1];
      if (op === 'SET') {
        if (!k || p[2] === undefined) throw new Error('SET key value [EX seconds]');
        var ex = p[3] && p[3].toUpperCase() === 'EX' ? +p[4] : 0;
        if (p[3] && (isNaN(ex) || ex <= 0)) throw new Error('EX needs a positive number of seconds');
        var stale = data[k] && data[k].at;
        data[k] = { v: p[2], at: ex ? now + ex : 0 };
        if (ex) heap.push({ key: k, at: now + ex });
        out.push(['@' + now, esc(m[2]), 'OK']);
        snap('@' + now + 's <b>SET ' + esc(k) + '</b>' + (ex ? ' with TTL ' + ex + ' s → expireAt = ' + now + ' + ' + ex + ' = <b>' + (now + ex) + 's</b>, pushed on the heap.' : ' without TTL (lives forever).') + (stale ? ' The old heap item for ' + esc(k) + ' (@' + stale + 's) is now <b>stale</b>; we leave it and skip it later — cheaper than searching the heap.' : ''), one(k, 'ok'));
      } else if (op === 'GET' || op === 'TTL') {
        if (!k) throw new Error(op + ' needs a key');
        var e = data[k], res, narr;
        if (e && e.at && now >= e.at) {
          delete data[k];
          res = op === 'GET' ? 'NULL' : '-2';
          narr = '@' + now + 's <b>' + op + ' ' + esc(k) + '</b>: the entry is still in memory but now (' + now + ') ≥ expireAt (' + e.at + ') → <b>lazy expiry</b>: delete it right here and answer as if it never existed.';
          out.push(['@' + now, esc(m[2]), res]); snap(narr, {}, {}); return;
        }
        res = !e ? (op === 'GET' ? 'NULL' : '-2') : op === 'GET' ? e.v : e.at ? String(e.at - now) + 's left' : '-1 (no TTL)';
        out.push(['@' + now, esc(m[2]), res]);
        snap('@' + now + 's <b>' + op + ' ' + esc(k) + '</b> → ' + esc(res) + '. ' + (e ? 'Not expired yet (now ' + now + ' &lt; ' + (e.at || '∞') + ').' : 'No such key.'), e ? one(k, 'sel') : {});
      } else if (op === 'TICK' || op === 'CLEAN') {
        var removed = [], skipped = [];
        heap.sort(function (a, b) { return a.at - b.at; });
        while (heap.length && heap[0].at <= now) {
          var x = heap.shift();
          if (data[x.key] && data[x.key].at === x.at) { delete data[x.key]; removed.push(x.key); } else skipped.push(x.key + '@' + x.at);
        }
        out.push(['@' + now, 'TICK', 'removed ' + (removed.join(', ') || 'none')]);
        snap('@' + now + 's <b>active expiry sweep</b>: pop heap items with at ≤ ' + now + '. Removed: <b>' + (removed.join(', ') || 'none') + '</b>' + (skipped.length ? '; skipped stale items ' + skipped.join(', ') + ' (key was overwritten/deleted, its expireAt no longer matches)' : '') + '. Without this sweep, keys nobody reads would sit in memory forever.', {}, one(0, 'cur'));
      } else throw new Error('Commands: SET k v [EX s], GET k, TTL k, TICK');
    });
    snap('Done. <b>Lazy</b> expiry gives correct answers; <b>active</b> expiry frees memory. Real Redis combines lazy expiry with a background cycle that samples random keys that have a TTL, instead of a heap.');
    return frames;
  }

  topics.push({
    title: 'In-Memory Key-Value Store with Nested Transactions and TTL',
    analogy: `<p>Imagine a <b>whiteboard</b> in an office where people write <b>name → value</b> notes. When you say <b>BEGIN</b>, you take a small <b>notebook</b> and, before you change any note on the board, you write down what it said before ("a was 10"). If your boss says <b>"undo"</b> (ROLLBACK), you read your notebook and put every note back. If the boss says <b>"keep it"</b> (COMMIT), you just close the notebook. Notebooks can stack: a notebook inside a notebook = a nested transaction.</p><p><b>TTL</b> is like the <b>expiry date on milk</b>. You check the date whenever you pick the carton up (lazy expiry), and once a week someone also clears out old cartons nobody touched (active expiry).</p>`,
    explain: `<p><b>The requirements</b> (this is a very common machine-coding round — Redis-lite / "Simple Database"):</p>
<ul>
<li><code>SET k v</code>, <code>GET k</code>, <code>DEL k</code>, <code>COUNT v</code> (how many keys hold value v).</li>
<li><code>BEGIN</code>, <code>ROLLBACK</code> (undo the innermost transaction), <code>COMMIT</code> — transactions can be <b>nested</b>.</li>
<li><code>SET k v EX seconds</code> — the key disappears after its time to live; <code>TTL k</code> reports time left.</li>
</ul>
<p><b>Two designs for transactions:</b></p>
${H.table(['Design', 'BEGIN', 'Write', 'GET', 'ROLLBACK', 'Good for'], [
  ['<b>Undo log</b> (used in the code)', 'push empty map', 'save old value once, write to data', H.c('g', 'O(1)'), 'restore saved keys', 'single client, fast reads, easy COUNT index'],
  ['<b>Overlay / write-set</b>', 'push empty map', 'write into top layer only', 'search layers top → bottom: O(depth)', H.c('g', 'just pop'), 'per-session isolation (others never see uncommitted data)'],
  [H.c('r', '<b>Snapshot copy</b> (naive)'), H.c('r', 'copy whole map O(n)'), 'write to copy', 'O(1)', 'swap back', 'never — memory × depth']
])}
<p><b>The naive design (brute force) and why it breaks:</b> on BEGIN, copy the whole map (<code>new HashMap&lt;&gt;(data)</code>, <code>dict(data)</code>, <code>new Map(data)</code>). Correct, but a store with 10 million keys copies 10 million entries for <b>every</b> BEGIN — seconds of CPU and gigabytes of memory, and nested transactions multiply it. Also the naive <code>COUNT v</code> scans every key (O(n)). The undo log only pays for keys a transaction actually <b>touches</b>, and a <code>valueCount</code> index answers COUNT in O(1).</p>
<p><b>The rule that makes nested commit correct:</b> when an inner transaction commits, move its undo entries into the parent <b>only for keys the parent has not saved yet</b> (<code>putIfAbsent</code>). Then a later rollback of the parent still restores the value from <i>before the parent began</i>. Getting this wrong is the #1 bug in this problem — the visualizer lets you test it.</p>
<p><b>TTL in one line each:</b> store absolute <code>expireAt</code> (not "seconds left"); <b>lazy</b> check on every read; <b>active</b> sweep with a min-heap ordered by expireAt (skip stale heap items whose time no longer matches the entry); inject a <b>clock</b> so tests do not sleep.</p>
<p><b>Classes:</b> <code>KVStore</code> (locked facade), <code>Entry(value, expireAt)</code>, <code>Expiry(at, key)</code>, <code>Ticker</code> (clock interface), and in a full answer a <code>CommandParser</code> + <code>Command</code> objects for the text protocol.</p>`,
    clues: [
      '"BEGIN / ROLLBACK / COMMIT" with "nested transactions" → stack of undo logs (or overlay layers), never a full copy.',
      '"NUMEQUALTO / COUNT of a value in O(1)" → secondary index value → count, updated in one private write method.',
      '"Keys expire after N seconds" → absolute expireAt + lazy check on read + active cleanup (heap or sampling).',
      '"Tests must be deterministic" or "do not use sleep" → inject a Clock/Ticker.',
      '"Thread-safe store" → one lock around all four structures (or lock striping + careful index updates).',
      '"Each client has its own transaction" → per-session overlay write-sets, or optimistic WATCH-style versioning.',
      '"Design Redis-lite" → command parsing (Command pattern), data structures, expiry, persistence (AOF/snapshot) as follow-ups.'
    ],
    code: [{ lang: 'java', code: KV_CORE, alt: [{ lang: 'python', code: KV_CORE_PY }, { lang: 'ts', code: KV_CORE_TS }, { lang: 'cpp', code: KV_CORE_CPP },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// ===== In-memory key-value store: GET/SET/DEL/COUNT, nested BEGIN/ROLLBACK/COMMIT, TTL =====

// Time is injected so tests can move the clock by hand (no Thread.Sleep in tests!).
interface ITicker { long NowMillis(); }

class ManualTicker : ITicker {
    private long now;
    public long NowMillis() { return now; }
    public void Advance(long ms) { now += ms; }
}

// expireAt == 0 means "never expires".
sealed class Entry {
    public readonly string Value; public readonly long ExpireAt;
    public Entry(string value, long expireAt) { Value = value; ExpireAt = expireAt; }
    public bool Expired(long now) { return ExpireAt > 0 && now >= ExpireAt; }
}

class KVStore {
    private readonly Dictionary<string, Entry> data = new Dictionary<string, Entry>();
    private readonly Dictionary<string, int> valueCount = new Dictionary<string, int>();      // value -> how many keys hold it
    // Undo log per open transaction: key -> value BEFORE the transaction first touched it
    // (null = key did not exist). Top of the stack = innermost transaction.
    private readonly Stack<Dictionary<string, Entry>> txStack = new Stack<Dictionary<string, Entry>>();
    // Min-heap of scheduled expiries ordered by (time, key, seq); stale ones are skipped when popped.
    private readonly SortedSet<Tuple<long, long, string>> expiries = new SortedSet<Tuple<long, long, string>>();
    private long expirySeq = 0;
    private readonly ITicker clock;
    private readonly object gate = new object();

    public KVStore(ITicker clock) { this.clock = clock; }

    // ---------- reads ----------
    public string Get(string key) {
        lock (gate) {
            Entry e;
            if (!data.TryGetValue(key, out e)) return null;
            if (e.Expired(clock.NowMillis())) { WriteRaw(key, null); return null; }   // LAZY expiry on access
            return e.Value;
        }
    }
    public int Count(string value) {
        lock (gate) {
            ExpireDue();                                   // make the index exact before answering
            int n; return valueCount.TryGetValue(value, out n) ? n : 0;
        }
    }
    // Redis-style TTL: -2 = no such key, -1 = no expiry, else milliseconds left.
    public long Ttl(string key) {
        lock (gate) {
            if (Get(key) == null) return -2;
            Entry e = data[key];
            return e.ExpireAt == 0 ? -1 : e.ExpireAt - clock.NowMillis();
        }
    }

    // ---------- writes (all go through RecordUndo + WriteRaw) ----------
    public void Set(string key, string value) { Set(key, value, 0); }
    public void Set(string key, string value, long ttlMillis) {
        lock (gate) {
            RecordUndo(key);
            WriteRaw(key, new Entry(value, ttlMillis > 0 ? clock.NowMillis() + ttlMillis : 0));
        }
    }
    public bool Delete(string key) {
        lock (gate) {
            if (Get(key) == null) return false;
            RecordUndo(key);
            WriteRaw(key, null);
            return true;
        }
    }

    // ---------- transactions ----------
    public void Begin() { lock (gate) txStack.Push(new Dictionary<string, Entry>()); }

    public bool Rollback() {
        lock (gate) {
            if (txStack.Count == 0) return false;           // "NO TRANSACTION"
            Dictionary<string, Entry> undo = txStack.Pop();
            foreach (var kv in undo) WriteRaw(kv.Key, kv.Value);   // put every touched key back
            return true;
        }
    }

    // Commit the innermost transaction. Its undo info moves into the parent,
    // so rolling back the parent later still restores the ORIGINAL values.
    public bool Commit() {
        lock (gate) {
            if (txStack.Count == 0) return false;
            Dictionary<string, Entry> top = txStack.Pop();
            if (txStack.Count > 0) {
                Dictionary<string, Entry> parent = txStack.Peek();
                foreach (var kv in top) if (!parent.ContainsKey(kv.Key)) parent[kv.Key] = kv.Value;   // parent's older snapshot wins
            }
            return true;
        }
    }
    public int Depth() { lock (gate) return txStack.Count; }

    // ---------- expiry ----------
    // ACTIVE expiry: remove everything whose time has come (a scheduler would call this every 100 ms).
    public int ExpireDue() {
        lock (gate) {
            int removed = 0;
            long now = clock.NowMillis();
            while (expiries.Count > 0 && expiries.Min.Item1 <= now) {
                var x = expiries.Min; expiries.Remove(x);
                Entry e;
                if (data.TryGetValue(x.Item3, out e) && e.ExpireAt == x.Item1) { WriteRaw(x.Item3, null); removed++; }   // skip stale heap entries
            }
            return removed;
        }
    }

    // ---------- internals ----------
    private void RecordUndo(string key) {
        if (txStack.Count == 0) return;
        Dictionary<string, Entry> top = txStack.Peek();
        if (!top.ContainsKey(key)) { Entry cur; data.TryGetValue(key, out cur); top[key] = cur; }  // first touch only
    }
    // The ONLY method that changes data; keeps the value index and expiry heap in sync.
    private void WriteRaw(string key, Entry e) {
        Entry old; data.TryGetValue(key, out old);
        if (e == null) data.Remove(key); else data[key] = e;
        if (old != null) { int c = valueCount[old.Value] - 1; if (c == 0) valueCount.Remove(old.Value); else valueCount[old.Value] = c; }
        if (e != null) {
            int c; valueCount.TryGetValue(e.Value, out c); valueCount[e.Value] = c + 1;
            if (e.ExpireAt > 0) expiries.Add(Tuple.Create(e.ExpireAt, expirySeq++, key));
        }
    }
}

class KVStoreDemo {
    static string S(string v) { return v ?? "null"; }
    static string B(bool b) { return b.ToString().ToLower(); }
    static void Main() {
        ManualTicker clock = new ManualTicker();
        KVStore kv = new KVStore(clock);

        kv.Set("a", "10");
        kv.Begin();                         // T1
        kv.Set("a", "20");
        kv.Set("b", "20");
        Console.WriteLine("T1: a=" + S(kv.Get("a")) + " count(20)=" + kv.Count("20"));     // 20, 2
        kv.Begin();                         // T2 (nested)
        kv.Delete("a");
        Console.WriteLine("T2: a=" + S(kv.Get("a")));                                      // null
        kv.Rollback();                      // undo T2 only
        Console.WriteLine("after rollback T2: a=" + S(kv.Get("a")));                       // 20
        kv.Commit();                        // T1 becomes permanent
        Console.WriteLine("after commit: a=" + S(kv.Get("a")) + " b=" + S(kv.Get("b")) + " depth=" + kv.Depth());

        kv.Begin();
        kv.Set("a", "99");
        kv.Begin();
        kv.Set("a", "100");
        kv.Commit();                        // inner commit merges undo into outer
        kv.Rollback();                      // outer rollback must restore 20, not 99
        Console.WriteLine("nested commit then outer rollback: a=" + S(kv.Get("a")));       // 20
        Console.WriteLine("rollback with no tx -> " + B(kv.Rollback()));                    // false

        kv.Set("session", "s-1", 5000);     // TTL 5 s
        kv.Set("otp", "1234", 2000);        // TTL 2 s
        clock.Advance(1000);
        Console.WriteLine("t=1s ttl(otp)=" + kv.Ttl("otp") + "ms, ttl(a)=" + kv.Ttl("a"));
        clock.Advance(1500);
        Console.WriteLine("t=2.5s otp=" + S(kv.Get("otp")) + " (lazy expiry on read)");
        kv.Set("session", "s-2", 10000);    // overwrite -> old heap entry becomes stale
        kv.Set("cache", "v", 1000);         // nobody will read this one: only the active sweep frees it
        clock.Advance(4000);
        Console.WriteLine("t=6.5s expireDue removed " + kv.ExpireDue() + ", session=" + S(kv.Get("session")));

        kv.Begin();
        kv.Set("session", "s-3");           // remove TTL inside a tx
        kv.Rollback();                      // TTL entry restored, including its expiry time
        Console.WriteLine("after rollback ttl(session)=" + kv.Ttl("session") + "ms");
        Console.WriteLine("commit with no tx -> " + B(kv.Commit()) + ", delete of a missing key -> " + B(kv.Delete("nope")));
    }
}` }] }],
    codeTitle: ['KV store — undo-log transactions (nested commit/rollback), value-count index, lazy + active TTL with an injected clock (runnable main)'],
    viz: [
      { title: 'Class diagram tour: one facade, four data structures', gen: function () { return kvClassViz(); } },
      { title: 'BEGIN / SET / ROLLBACK / COMMIT: undo-log stack and data map', input: 'SET a 10; SET b 10; BEGIN; SET a 20; COUNT 10; BEGIN; DEL b; SET a 30; GET a; ROLLBACK; GET a; GET b; COMMIT; GET a; ROLLBACK; GET a', inputLabel: 'Commands separated by ; (SET k v, GET k, DEL k, COUNT v, BEGIN, ROLLBACK, COMMIT)', gen: kvTxViz },
      { title: 'TTL: lazy expiry on read vs active sweep with a min-heap', input: '@0 SET session s1 EX 5; @0 SET otp 1234 EX 2; @0 SET name asha; @1 TTL otp; @3 GET otp; @3 SET session s2 EX 10; @6 TICK; @6 GET session; @14 TICK; @14 GET name', inputLabel: '@time COMMAND; … (SET k v [EX s], GET k, TTL k, TICK)', gen: kvTtlViz }
    ],
    examples: [
      { title: 'Nested commit then outer rollback (the classic trap)', html: `${H.table(['Step', 'Command', 'data.a', 'T1 undo', 'T2 undo'], [
  ['1', 'SET a 10', '10', '—', '—'],
  ['2', 'BEGIN (T1)', '10', '{}', '—'],
  ['3', 'SET a 20', '20', '{a: 10}', '—'],
  ['4', 'BEGIN (T2)', '20', '{a: 10}', '{}'],
  ['5', 'SET a 30', '30', '{a: 10}', '{a: 20}'],
  ['6', 'COMMIT (T2)', '30', H.c('g', '{a: 10}') + ' (kept — putIfAbsent)', 'popped'],
  ['7', 'ROLLBACK (T1)', H.c('g', '10'), 'popped', '—']
])}<p>If step 6 had <b>overwritten</b> T1\'s entry with T2\'s <code>{a: 20}</code>, step 7 would wrongly give 20.</p>` },
      { title: 'Overlay design (per-session isolation) in a few lines', html: `<p>When several clients have their own transactions, writes must stay invisible to others until commit. Keep a stack of <b>write-sets</b>; reads search from the top; a tombstone marks deletes; commit merges the top layer down.</p>`, code: { lang: 'java', code: String.raw`
class OverlayStore {
    private static final String TOMBSTONE = "\u0000deleted";
    private final Map<String, String> base = new HashMap<>();
    private final Deque<Map<String, String>> layers = new ArrayDeque<>();   // per session in a real server

    void begin() { layers.push(new HashMap<>()); }
    void set(String k, String v) { (layers.isEmpty() ? base : layers.peek()).put(k, v); }
    void delete(String k) { if (layers.isEmpty()) base.remove(k); else layers.peek().put(k, TOMBSTONE); }
    String get(String k) {
        for (Map<String, String> layer : layers)                 // iterates top -> bottom
            if (layer.containsKey(k)) { String v = layer.get(k); return TOMBSTONE.equals(v) ? null : v; }
        return base.get(k);
    }
    boolean rollback() { return layers.poll() != null; }       // O(1): just drop the layer
    boolean commit() {
        Map<String, String> top = layers.poll();
        if (top == null) return false;
        Map<String, String> target = layers.isEmpty() ? null : layers.peek();
        top.forEach((k, v) -> {
            if (target != null) target.put(k, v);
            else if (TOMBSTONE.equals(v)) base.remove(k); else base.put(k, v);
        });
        return true;
    }
    public static void main(String[] args) {
        OverlayStore s = new OverlayStore();
        s.set("a", "10");
        s.begin(); s.set("a", "20"); s.delete("a");
        System.out.println("inside tx a=" + s.get("a"));   // null
        s.rollback();
        System.out.println("after rollback a=" + s.get("a")); // 10
    }
}`,
        alt: [
          { lang: 'python', code: String.raw`
from typing import Optional

TOMBSTONE = "\x00deleted"


class OverlayStore:
    def __init__(self) -> None:
        self._base: dict[str, str] = {}
        self._layers: list[dict[str, str]] = []          # per session in a real server; last = top

    def begin(self) -> None:
        self._layers.append({})

    def set(self, k: str, v: str) -> None:
        (self._layers[-1] if self._layers else self._base)[k] = v

    def delete(self, k: str) -> None:
        if self._layers:
            self._layers[-1][k] = TOMBSTONE
        else:
            self._base.pop(k, None)

    def get(self, k: str) -> Optional[str]:
        for layer in reversed(self._layers):             # top -> bottom
            if k in layer:
                return None if layer[k] == TOMBSTONE else layer[k]
        return self._base.get(k)

    def rollback(self) -> bool:                          # O(1): just drop the layer
        if not self._layers:
            return False
        self._layers.pop()
        return True

    def commit(self) -> bool:
        if not self._layers:
            return False
        top = self._layers.pop()
        for k, v in top.items():
            if self._layers:
                self._layers[-1][k] = v
            elif v == TOMBSTONE:
                self._base.pop(k, None)
            else:
                self._base[k] = v
        return True


def show(v: Optional[str]) -> str:
    return "null" if v is None else v


s = OverlayStore()
s.set("a", "10")
s.begin(); s.set("a", "20"); s.delete("a")
print("inside tx a=" + show(s.get("a")))             # null
s.rollback()
print("after rollback a=" + show(s.get("a")))        # 10` },
          { lang: 'ts', code: String.raw`
const TOMBSTONE = "\u0000deleted";

class OverlayStore {
  private readonly base = new Map<string, string>();
  private readonly layers: Map<string, string>[] = [];      // per session in a real server; last = top

  begin(): void { this.layers.push(new Map()); }
  set(k: string, v: string): void { (this.layers[this.layers.length - 1] ?? this.base).set(k, v); }
  delete(k: string): void {
    if (this.layers.length === 0) this.base.delete(k);
    else this.layers[this.layers.length - 1].set(k, TOMBSTONE);
  }
  get(k: string): string | null {
    for (let i = this.layers.length - 1; i >= 0; i--) {   // top -> bottom
      const v = this.layers[i].get(k);
      if (v !== undefined) return v === TOMBSTONE ? null : v;
    }
    return this.base.get(k) ?? null;
  }
  rollback(): boolean { return this.layers.pop() !== undefined; }   // O(1): just drop the layer
  commit(): boolean {
    const top = this.layers.pop();
    if (top === undefined) return false;
    const target = this.layers[this.layers.length - 1];
    for (const [k, v] of top) {
      if (target !== undefined) target.set(k, v);
      else if (v === TOMBSTONE) this.base.delete(k);
      else this.base.set(k, v);
    }
    return true;
  }
}

const s = new OverlayStore();
s.set("a", "10");
s.begin(); s.set("a", "20"); s.delete("a");
console.log("inside tx a=" + s.get("a"));       // null
s.rollback();
console.log("after rollback a=" + s.get("a"));  // 10` },
          { lang: 'cpp', code: String.raw`
const string TOMBSTONE = string("\0deleted", 8);

class OverlayStore {
    unordered_map<string, string> base;
    vector<unordered_map<string, string>> layers;    // per session in a real server; back = top
public:
    void begin() { layers.emplace_back(); }
    void set(const string& k, const string& v) { (layers.empty() ? base : layers.back())[k] = v; }
    void del(const string& k) {                      // "delete" is a C++ keyword
        if (layers.empty()) base.erase(k); else layers.back()[k] = TOMBSTONE;
    }
    optional<string> get(const string& k) const {
        for (auto it = layers.rbegin(); it != layers.rend(); ++it) {   // top -> bottom
            auto f = it->find(k);
            if (f != it->end()) return f->second == TOMBSTONE ? nullopt : optional<string>(f->second);
        }
        auto f = base.find(k);
        return f == base.end() ? nullopt : optional<string>(f->second);
    }
    bool rollback() {                                // O(1): just drop the layer
        if (layers.empty()) return false;
        layers.pop_back();
        return true;
    }
    bool commit() {
        if (layers.empty()) return false;
        auto top = move(layers.back());
        layers.pop_back();
        for (auto& [k, v] : top) {
            if (!layers.empty()) layers.back()[k] = v;
            else if (v == TOMBSTONE) base.erase(k);
            else base[k] = v;
        }
        return true;
    }
};

int main() {
    OverlayStore s;
    s.set("a", "10");
    s.begin(); s.set("a", "20"); s.del("a");
    cout << "inside tx a=" << s.get("a").value_or("null") << "\n";        // null
    s.rollback();
    cout << "after rollback a=" << s.get("a").value_or("null") << "\n";   // 10
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class OverlayStore {
    private const string TOMBSTONE = "\\u0000deleted";
    private readonly Dictionary<string, string> b = new Dictionary<string, string>();
    private readonly LinkedList<Dictionary<string, string>> layers = new LinkedList<Dictionary<string, string>>();   // First = top; per session in a real server

    public void Begin() { layers.AddFirst(new Dictionary<string, string>()); }
    public void Set(string k, string v) { (layers.Count == 0 ? b : layers.First.Value)[k] = v; }
    public void Delete(string k) { if (layers.Count == 0) b.Remove(k); else layers.First.Value[k] = TOMBSTONE; }
    public string Get(string k) {
        foreach (Dictionary<string, string> layer in layers) {                // iterates top -> bottom
            string v;
            if (layer.TryGetValue(k, out v)) return v == TOMBSTONE ? null : v;
        }
        string bv; return b.TryGetValue(k, out bv) ? bv : null;
    }
    public bool Rollback() { if (layers.Count == 0) return false; layers.RemoveFirst(); return true; }   // O(1): just drop the layer
    public bool Commit() {
        if (layers.Count == 0) return false;
        Dictionary<string, string> top = layers.First.Value; layers.RemoveFirst();
        Dictionary<string, string> target = layers.Count == 0 ? null : layers.First.Value;
        foreach (var kv in top) {
            if (target != null) target[kv.Key] = kv.Value;
            else if (kv.Value == TOMBSTONE) b.Remove(kv.Key); else b[kv.Key] = kv.Value;
        }
        return true;
    }
    static void Main() {
        OverlayStore s = new OverlayStore();
        s.Set("a", "10");
        s.Begin(); s.Set("a", "20"); s.Delete("a");
        Console.WriteLine("inside tx a=" + (s.Get("a") ?? "null"));   // null
        s.Rollback();
        Console.WriteLine("after rollback a=" + s.Get("a")); // 10
    }
}` }
        ] } },
      { title: 'COUNT with an index vs a scan', html: `<p>Keys a=10, b=10, c=20. <code>COUNT 10</code>:</p>${H.kv([['10', '2'], ['20', '1']], { label: 'valueCount' })}<p>Scan: look at all n keys → O(n) per query. Index: one map lookup → O(1). The price: every write, delete, rollback and expiry must update the index — which is why the code funnels <b>all</b> changes through <code>writeRaw()</code>. Remove a counter when it reaches 0 so the index does not leak memory.</p>` },
      { title: 'TTL + transactions: what does rollback restore?', html: `<p><code>SET session s1 EX 10</code> (expireAt = 10 s). At 3 s: <code>BEGIN; SET session s2</code> (no TTL); <code>ROLLBACK</code>. The undo log stored the <b>whole Entry</b>, so the key gets back value s1 <b>and</b> expireAt 10 s — TTL 7 s left. If you stored only the value, rollback would silently make the key immortal. If time passes the old expireAt during the transaction, the restored entry is simply expired on the next read (lazy check) — still correct.</p>` },
      { title: 'How real Redis does it (and how it differs)', html: `${H.table(['Topic', 'Our design', 'Redis'], [
  ['Transactions', 'BEGIN/ROLLBACK with undo log', '<code>MULTI</code> queues commands, <code>EXEC</code> runs them atomically, <code>DISCARD</code> drops the queue; ' + H.c('r', 'no rollback') + ' of executed commands; <code>WATCH</code> = optimistic locking'],
  ['Active expiry', 'min-heap by expireAt', 'background cycle samples random keys with a TTL (repeats if many were expired)'],
  ['Lazy expiry', 'on GET', 'on every key access'],
  ['Concurrency', 'one lock', 'single-threaded command execution (I/O threads optional)']
])}` }
    ],
    deepDive: `<p><b>1. Why one lock is fine here, and when it is not.</b> All four structures (data, index, undo stack, heap) must change together, so a single locked facade is the simplest correct answer and is fast for in-memory ops (Redis itself executes commands on one thread). To scale: shard the keyspace into N independent stores by <code>hash(key) % N</code>, each with its own lock and heap; cross-shard transactions then need a lock ordering or 2PC — say this explicitly.</p>
<p><b>2. Isolation.</b> The undo-log store gives atomicity (all-or-nothing) for one client but <b>no isolation</b>: other readers see uncommitted writes (dirty reads). For multi-client transactions use per-session overlays (read-your-writes, commit merges under the lock), or <b>MVCC</b>: every key keeps versions tagged with a commit timestamp; a transaction reads the snapshot at its start time, and commit fails on write-write conflicts (optimistic). That is how most databases avoid readers blocking writers.</p>
<p><b>3. Expiry at scale.</b> A heap costs O(log n) per TTL set and holds stale items after overwrites (bounded by writes; rebuild when stale ratio is high). Alternatives: a <b>timing wheel</b> (buckets per second, O(1) insert — used by Kafka and Netty), or Redis-style <b>random sampling</b> (no extra structure; probabilistic memory reclaim). Always keep lazy expiry for correctness.</p>
<p><b>4. Durability.</b> Memory is lost on crash. Options: <b>append-only file</b> (log every write command; replay on start; fsync every second is the usual trade-off; rewrite/compact periodically) and <b>snapshots</b> (fork + copy-on-write in Redis, RDB files). Store TTLs as <b>absolute</b> timestamps in the log so a restart does not extend lifetimes.</p>
<p><b>5. Memory limits and eviction.</b> When full: reject writes, or evict by policy — LRU, LFU, random, or "volatile-*" (only keys with TTL). That connects this design to the LRU/LFU cache designs from LLD 10.</p>
<p><b>6. The command layer.</b> Parse text into <code>Command</code> objects (<code>SetCommand</code>, <code>BeginCommand</code>…) registered in a map by name — Command pattern + Open/Closed for new commands, and the same objects can be written to the AOF.</p>`,
    aiEra: `<p><b>What AI changes:</b> "build Redis-lite" is a favourite prompt for AI coding assistants, and they produce a working SET/GET quickly. Your edge is the parts they get wrong and the trade-offs they do not explain.</p>
<p><b>Use AI as a partner:</b> <code>Generate 30 random command sequences with nested BEGIN/COMMIT/ROLLBACK and compare my store against a naive full-copy reference implementation</code> — differential testing against the brute-force version is the fastest way to find transaction bugs. Also: <code>List every way COUNT can drift from the real data in this code.</code></p>
<p><b>Where AI goes wrong:</b> overwriting the parent\'s undo entry on nested commit, storing relative TTL ("5 seconds") instead of absolute time, calling <code>System.currentTimeMillis()</code> directly so tests need <code>sleep</code>, forgetting to restore the TTL on rollback, and claiming Redis MULTI supports rollback (it does not).</p>
<p><b>AI-era use case:</b> KV stores with TTL are the backbone of LLM apps — response/semantic caches, conversation memory with expiry, rate-limit counters per API key, and idempotency keys for agent tool calls. Knowing exactly how TTL and atomic updates behave lets you design those reliably.</p>
<p><b>What you must still own:</b> choosing undo-log vs overlay vs MVCC for the isolation required, and proving nested commit/rollback correct with a small table.</p>`,
    problems: [{
      title: 'Machine Coding: Simple Database with Nested Transactions (SET / GET / UNSET / NUMEQUALTO)',
      level: 'Hard', tags: ['transactions', 'undo log', 'hashmap', 'command pattern'], companies: ['Thumbtack', 'Stripe', 'Coinbase', 'Rubrik'],
      statement: `<p>Process commands, one per line: <code>SET name value</code>, <code>GET name</code> (print value or NULL), <code>UNSET name</code>, <code>NUMEQUALTO value</code> (print how many names have that value), <code>BEGIN</code>, <code>ROLLBACK</code> (undo the most recent open transaction; print <code>NO TRANSACTION</code> if none), <code>COMMIT</code> (close <b>all</b> open transactions permanently; print <code>NO TRANSACTION</code> if none), <code>END</code>. Return the printed lines.</p>`,
      constraints: `<p>Up to 10<sup>5</sup> commands. GET, SET, UNSET, NUMEQUALTO must be O(log n) or better. A transaction's cost must be proportional to the keys it changes, not to the database size.</p>`,
      example: `<p>Input: <code>SET a 10, SET b 10, NUMEQUALTO 10, BEGIN, SET a 20, NUMEQUALTO 10, ROLLBACK, NUMEQUALTO 10, GET a, ROLLBACK, END</code></p><p>Output: ${H.c('g', '2')}, ${H.c('g', '1')} (a moved to 20), ${H.c('g', '2')} (rolled back), ${H.c('g', '10')}, ${H.c('r', 'NO TRANSACTION')}.</p>`,
      brute: {
        why: `<p>The snapshot approach copies the entire map on every BEGIN and counts values by scanning. With 10<sup>5</sup> keys and many BEGINs this is O(n) per BEGIN and per NUMEQUALTO — up to 10<sup>10</sup> work and huge memory for nested transactions.</p>`,
        code: { lang: 'java', code: String.raw`
class SnapshotDb {
    private Map<String, String> data = new HashMap<>();
    private final Deque<Map<String, String>> snapshots = new ArrayDeque<>();

    List<String> run(List<String> cmds) {
        List<String> out = new ArrayList<>();
        for (String line : cmds) {
            String[] t = line.split(" ");
            switch (t[0]) {
                case "SET" -> data.put(t[1], t[2]);
                case "UNSET" -> data.remove(t[1]);
                case "GET" -> out.add(data.getOrDefault(t[1], "NULL"));
                case "NUMEQUALTO" -> out.add(String.valueOf(data.values().stream().filter(t[1]::equals).count())); // O(n) scan
                case "BEGIN" -> snapshots.push(new HashMap<>(data));                                                // O(n) copy
                case "ROLLBACK" -> { if (snapshots.isEmpty()) out.add("NO TRANSACTION"); else data = snapshots.pop(); }
                case "COMMIT" -> { if (snapshots.isEmpty()) out.add("NO TRANSACTION"); else snapshots.clear(); }
                default -> { }
            }
        }
        return out;
    }
    public static void main(String[] args) {
        System.out.println(new SnapshotDb().run(List.of("SET a 10", "BEGIN", "SET a 20", "ROLLBACK", "GET a")));  // [10]
    }
}`, alt: [{ lang: 'python', code: "class SnapshotDb:\n    def __init__(self):\n        self.data = {}\n        self.snapshots = []\n\n    def run(self, cmds):\n        out = []\n        for line in cmds:\n            t = line.split(\" \")\n            if t[0] == \"SET\": self.data[t[1]] = t[2]\n            elif t[0] == \"UNSET\": self.data.pop(t[1], None)\n            elif t[0] == \"GET\": out.append(self.data.get(t[1], \"NULL\"))\n            elif t[0] == \"NUMEQUALTO\": out.append(str(sum(1 for v in self.data.values() if v == t[1])))   # O(n) scan\n            elif t[0] == \"BEGIN\": self.snapshots.append(dict(self.data))                                  # O(n) copy\n            elif t[0] == \"ROLLBACK\":\n                if not self.snapshots: out.append(\"NO TRANSACTION\")\n                else: self.data = self.snapshots.pop()\n            elif t[0] == \"COMMIT\":\n                if not self.snapshots: out.append(\"NO TRANSACTION\")\n                else: self.snapshots.clear()\n        return out\n\nif __name__ == \"__main__\":\n    print(SnapshotDb().run([\"SET a 10\", \"BEGIN\", \"SET a 20\", \"ROLLBACK\", \"GET a\"]))  # ['10']\n" }, { lang: 'ts', code: "class SnapshotDb {\n  private data = new Map<string, string>();\n  private snapshots: Map<string, string>[] = [];\n\n  run(cmds: string[]): string[] {\n    const out: string[] = [];\n    for (const line of cmds) {\n      const t = line.split(\" \");\n      switch (t[0]) {\n        case \"SET\": this.data.set(t[1], t[2]); break;\n        case \"UNSET\": this.data.delete(t[1]); break;\n        case \"GET\": out.push(this.data.get(t[1]) ?? \"NULL\"); break;\n        case \"NUMEQUALTO\": out.push(String([...this.data.values()].filter((v) => v === t[1]).length)); break;   // O(n) scan\n        case \"BEGIN\": this.snapshots.push(new Map(this.data)); break;                                            // O(n) copy\n        case \"ROLLBACK\": { const s = this.snapshots.pop(); if (!s) out.push(\"NO TRANSACTION\"); else this.data = s; break; }\n        case \"COMMIT\": if (this.snapshots.length === 0) out.push(\"NO TRANSACTION\"); else this.snapshots = []; break;\n      }\n    }\n    return out;\n  }\n}\n\nconsole.log(new SnapshotDb().run([\"SET a 10\", \"BEGIN\", \"SET a 20\", \"ROLLBACK\", \"GET a\"]));  // [ '10' ]\n" }, { lang: 'cpp', code: "class SnapshotDb {\n    map<string, string> data;\n    vector<map<string, string>> snapshots;\npublic:\n    vector<string> run(const vector<string>& cmds) {\n        vector<string> out;\n        for (const string& line : cmds) {\n            istringstream in(line);\n            vector<string> t; string w;\n            while (in >> w) t.push_back(w);\n            if (t[0] == \"SET\") data[t[1]] = t[2];\n            else if (t[0] == \"UNSET\") data.erase(t[1]);\n            else if (t[0] == \"GET\") out.push_back(data.count(t[1]) ? data[t[1]] : \"NULL\");\n            else if (t[0] == \"NUMEQUALTO\") out.push_back(to_string(count_if(data.begin(), data.end(), [&](auto& kv) { return kv.second == t[1]; })));   // O(n) scan\n            else if (t[0] == \"BEGIN\") snapshots.push_back(data);                                                                                      // O(n) copy\n            else if (t[0] == \"ROLLBACK\") { if (snapshots.empty()) out.push_back(\"NO TRANSACTION\"); else { data = snapshots.back(); snapshots.pop_back(); } }\n            else if (t[0] == \"COMMIT\") { if (snapshots.empty()) out.push_back(\"NO TRANSACTION\"); else snapshots.clear(); }\n        }\n        return out;\n    }\n};\n\nint main() {\n    for (auto& s : SnapshotDb().run({\"SET a 10\", \"BEGIN\", \"SET a 20\", \"ROLLBACK\", \"GET a\"})) cout << s << endl;   // 10\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\nclass SnapshotDb {\n    private Dictionary<string, string> data = new Dictionary<string, string>();\n    private readonly Stack<Dictionary<string, string>> snapshots = new Stack<Dictionary<string, string>>();\n\n    public List<string> Run(List<string> cmds) {\n        List<string> result = new List<string>();\n        foreach (string line in cmds) {\n            string[] t = line.Split(' ');\n            switch (t[0]) {\n                case \"SET\": data[t[1]] = t[2]; break;\n                case \"UNSET\": data.Remove(t[1]); break;\n                case \"GET\": { string v; result.Add(data.TryGetValue(t[1], out v) ? v : \"NULL\"); break; }\n                case \"NUMEQUALTO\": result.Add(data.Values.Count(v => v == t[1]).ToString()); break;     // O(n) scan\n                case \"BEGIN\": snapshots.Push(new Dictionary<string, string>(data)); break;              // O(n) copy\n                case \"ROLLBACK\": if (snapshots.Count == 0) result.Add(\"NO TRANSACTION\"); else data = snapshots.Pop(); break;\n                case \"COMMIT\": if (snapshots.Count == 0) result.Add(\"NO TRANSACTION\"); else snapshots.Clear(); break;\n            }\n        }\n        return result;\n    }\n    static void Main() {\n        Console.WriteLine(\"[\" + string.Join(\", \", new SnapshotDb().Run(new List<string> { \"SET a 10\", \"BEGIN\", \"SET a 20\", \"ROLLBACK\", \"GET a\" })) + \"]\");  // [10]\n    }\n}\n" }] }
      },
      mcq: { q: 'With the undo-log design, what does ROLLBACK cost?', options: ['O(number of keys the innermost transaction changed)', 'O(total keys in the database)', 'O(1) always', 'O(depth of the transaction stack × n)'], answer: 0, explain: 'Each open transaction remembers only the keys it touched (old value saved once). Rollback writes exactly those back.' },
      hints: [
        `<p>Do not copy data on BEGIN. Instead, when a key is changed inside a transaction, remember its <b>old</b> value (only the first time in that transaction).</p>`,
        `<p>Use a stack of undo maps (<code>Deque&lt;Map&lt;String, String&gt;&gt;</code> in Java; a "no value" entry = "did not exist") and a hash map from value to count (<code>Map&lt;String, Integer&gt;</code>). Route every change through one <code>apply(name, newValue)</code> that updates both maps.</p>`,
        `<p>Edge cases: SET the same key twice in one transaction (keep the first old value: check whether the key is already in the undo map, since the saved old value may be "absent"), UNSET a missing key, ROLLBACK/COMMIT with no transaction, counters reaching zero (remove them). COMMIT here closes all transactions: simply clear the stack — data is already applied.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "[2, 1, 2, 10, NO TRANSACTION]\n[40, NO TRANSACTION]\n[50, NULL, 60, 60]\n[NO TRANSACTION, NULL, UNKNOWN FLY, 0]\n" }] },
      solution: {
        approach: `<p>Writes are applied immediately to <code>data</code>; each open transaction keeps an undo map of first-touched keys → old value (null = absent). A <code>counts</code> map tracks how many names have each value and is updated in the single <code>apply</code> method, so NUMEQUALTO is O(1). ROLLBACK pops one undo map and applies its old values; COMMIT clears the whole stack because changes are already in place.</p>`,
        code: String.raw`
class SimpleDatabase {
    private final Map<String, String> data = new HashMap<>();
    private final Map<String, Integer> counts = new HashMap<>();
    private final Deque<Map<String, String>> undo = new ArrayDeque<>();   // value null = key did not exist

    private void apply(String name, String value) {           // the ONLY mutation point
        String old = value == null ? data.remove(name) : data.put(name, value);
        if (old != null) counts.computeIfPresent(old, (k, c) -> c == 1 ? null : c - 1);
        if (value != null) counts.merge(value, 1, Integer::sum);
    }
    private void write(String name, String value) {
        Map<String, String> top = undo.peek();
        if (top != null && !top.containsKey(name)) top.put(name, data.get(name));   // remember first old value
        apply(name, value);
    }

    List<String> run(List<String> commands) {
        List<String> out = new ArrayList<>();
        for (String line : commands) {
            String[] t = line.trim().split(" ");
            switch (t[0]) {
                case "SET" -> write(t[1], t[2]);
                case "UNSET" -> { if (data.containsKey(t[1])) write(t[1], null); }
                case "GET" -> out.add(data.getOrDefault(t[1], "NULL"));
                case "NUMEQUALTO" -> out.add(String.valueOf(counts.getOrDefault(t[1], 0)));
                case "BEGIN" -> undo.push(new HashMap<>());
                case "ROLLBACK" -> {
                    Map<String, String> u = undo.poll();
                    if (u == null) out.add("NO TRANSACTION");
                    else u.forEach(this::apply);                    // restore old values (null = delete)
                }
                case "COMMIT" -> { if (undo.isEmpty()) out.add("NO TRANSACTION"); else undo.clear(); }
                case "END" -> { return out; }
                default -> out.add("UNKNOWN " + t[0]);
            }
        }
        return out;
    }

    public static void main(String[] args) {
        System.out.println(new SimpleDatabase().run(List.of(
            "SET a 10", "SET b 10", "NUMEQUALTO 10", "BEGIN", "SET a 20", "NUMEQUALTO 10",
            "ROLLBACK", "NUMEQUALTO 10", "GET a", "ROLLBACK", "END")));      // [2, 1, 2, 10, NO TRANSACTION]
        System.out.println(new SimpleDatabase().run(List.of(
            "BEGIN", "SET a 30", "BEGIN", "SET a 40", "COMMIT", "GET a", "ROLLBACK", "END")));  // [40, NO TRANSACTION]
        System.out.println(new SimpleDatabase().run(List.of(
            "SET a 50", "BEGIN", "GET a", "SET a 60", "BEGIN", "UNSET a", "GET a",
            "ROLLBACK", "GET a", "COMMIT", "GET a", "END")));                   // [50, NULL, 60, 60]
        // failure paths: no transaction, unset of a missing name, unknown command, END stops the run
        System.out.println(new SimpleDatabase().run(List.of(
            "COMMIT", "UNSET zzz", "GET zzz", "FLY away", "NUMEQUALTO 5", "END", "GET a")));  // [NO TRANSACTION, NULL, UNKNOWN FLY, 0]
    }
}`,
      alt: [
          { lang: 'python', code: String.raw`
from typing import Optional


class SimpleDatabase:
    def __init__(self) -> None:
        self._data: dict[str, str] = {}
        self._counts: dict[str, int] = {}
        self._undo: list[dict[str, Optional[str]]] = []      # value None = key did not exist

    def _apply(self, name: str, value: Optional[str]) -> None:   # the ONLY mutation point
        old = self._data.pop(name, None) if value is None else self._data.get(name)
        if value is not None:
            self._data[name] = value
        if old is not None:
            if self._counts[old] == 1:
                del self._counts[old]
            else:
                self._counts[old] -= 1
        if value is not None:
            self._counts[value] = self._counts.get(value, 0) + 1

    def _write(self, name: str, value: Optional[str]) -> None:
        if self._undo and name not in self._undo[-1]:
            self._undo[-1][name] = self._data.get(name)           # remember first old value
        self._apply(name, value)

    def run(self, commands: list[str]) -> list[str]:
        out: list[str] = []
        for line in commands:
            t = line.strip().split(" ")
            match t[0]:
                case "SET":
                    self._write(t[1], t[2])
                case "UNSET":
                    if t[1] in self._data:
                        self._write(t[1], None)
                case "GET":
                    out.append(self._data.get(t[1], "NULL"))
                case "NUMEQUALTO":
                    out.append(str(self._counts.get(t[1], 0)))
                case "BEGIN":
                    self._undo.append({})
                case "ROLLBACK":
                    if not self._undo:
                        out.append("NO TRANSACTION")
                    else:
                        for name, old in self._undo.pop().items():  # restore old values (None = delete)
                            self._apply(name, old)
                case "COMMIT":
                    if not self._undo:
                        out.append("NO TRANSACTION")
                    else:
                        self._undo.clear()
                case "END":
                    return out
                case _:
                    out.append("UNKNOWN " + t[0])
        return out


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def main() -> None:
    print(show(SimpleDatabase().run([
        "SET a 10", "SET b 10", "NUMEQUALTO 10", "BEGIN", "SET a 20", "NUMEQUALTO 10",
        "ROLLBACK", "NUMEQUALTO 10", "GET a", "ROLLBACK", "END"])))        # [2, 1, 2, 10, NO TRANSACTION]
    print(show(SimpleDatabase().run([
        "BEGIN", "SET a 30", "BEGIN", "SET a 40", "COMMIT", "GET a", "ROLLBACK", "END"])))   # [40, NO TRANSACTION]
    print(show(SimpleDatabase().run([
        "SET a 50", "BEGIN", "GET a", "SET a 60", "BEGIN", "UNSET a", "GET a",
        "ROLLBACK", "GET a", "COMMIT", "GET a", "END"])))                   # [50, NULL, 60, 60]
    # failure paths: no transaction, unset of a missing name, unknown command, END stops the run
    print(show(SimpleDatabase().run([
        "COMMIT", "UNSET zzz", "GET zzz", "FLY away", "NUMEQUALTO 5", "END", "GET a"])))     # [NO TRANSACTION, NULL, UNKNOWN FLY, 0]


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: String.raw`
class SimpleDatabase {
  private readonly data = new Map<string, string>();
  private readonly counts = new Map<string, number>();
  private readonly undo: Map<string, string | null>[] = [];      // value null = key did not exist

  private apply(name: string, value: string | null): void {      // the ONLY mutation point
    const old = this.data.get(name);
    if (value === null) this.data.delete(name); else this.data.set(name, value);
    if (old !== undefined) {
      const c = this.counts.get(old)!;
      if (c === 1) this.counts.delete(old); else this.counts.set(old, c - 1);
    }
    if (value !== null) this.counts.set(value, (this.counts.get(value) ?? 0) + 1);
  }
  private write(name: string, value: string | null): void {
    const top = this.undo[this.undo.length - 1];
    if (top !== undefined && !top.has(name)) top.set(name, this.data.get(name) ?? null);   // remember first old value
    this.apply(name, value);
  }

  run(commands: string[]): string[] {
    const out: string[] = [];
    for (const line of commands) {
      const t = line.trim().split(" ");
      switch (t[0]) {
        case "SET": this.write(t[1], t[2]); break;
        case "UNSET": if (this.data.has(t[1])) this.write(t[1], null); break;
        case "GET": out.push(this.data.get(t[1]) ?? "NULL"); break;
        case "NUMEQUALTO": out.push(String(this.counts.get(t[1]) ?? 0)); break;
        case "BEGIN": this.undo.push(new Map()); break;
        case "ROLLBACK": {
          const u = this.undo.pop();
          if (u === undefined) out.push("NO TRANSACTION");
          else for (const [name, old] of u) this.apply(name, old);   // restore old values (null = delete)
          break;
        }
        case "COMMIT":
          if (this.undo.length === 0) out.push("NO TRANSACTION"); else this.undo.length = 0;
          break;
        case "END": return out;
        default: out.push("UNKNOWN " + t[0]);
      }
    }
    return out;
  }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";

console.log(show(new SimpleDatabase().run([
  "SET a 10", "SET b 10", "NUMEQUALTO 10", "BEGIN", "SET a 20", "NUMEQUALTO 10",
  "ROLLBACK", "NUMEQUALTO 10", "GET a", "ROLLBACK", "END"])));        // [2, 1, 2, 10, NO TRANSACTION]
console.log(show(new SimpleDatabase().run([
  "BEGIN", "SET a 30", "BEGIN", "SET a 40", "COMMIT", "GET a", "ROLLBACK", "END"])));   // [40, NO TRANSACTION]
console.log(show(new SimpleDatabase().run([
  "SET a 50", "BEGIN", "GET a", "SET a 60", "BEGIN", "UNSET a", "GET a",
  "ROLLBACK", "GET a", "COMMIT", "GET a", "END"])));                   // [50, NULL, 60, 60]
// failure paths: no transaction, unset of a missing name, unknown command, END stops the run
console.log(show(new SimpleDatabase().run([
  "COMMIT", "UNSET zzz", "GET zzz", "FLY away", "NUMEQUALTO 5", "END", "GET a"])));     // [NO TRANSACTION, NULL, UNKNOWN FLY, 0]` },
          { lang: 'cpp', code: String.raw`
class SimpleDatabase {
    unordered_map<string, string> data;
    unordered_map<string, int> counts;
    vector<map<string, optional<string>>> undo;          // value empty = key did not exist

    void apply(const string& name, const optional<string>& value) {   // the ONLY mutation point
        auto it = data.find(name);
        optional<string> old = it == data.end() ? nullopt : optional<string>(it->second);
        if (value) data[name] = *value; else data.erase(name);
        if (old && --counts[*old] == 0) counts.erase(*old);
        if (value) counts[*value]++;
    }
    void write(const string& name, const optional<string>& value) {
        if (!undo.empty() && !undo.back().count(name)) {
            auto it = data.find(name);
            undo.back()[name] = it == data.end() ? nullopt : optional<string>(it->second);   // remember first old value
        }
        apply(name, value);
    }
public:
    vector<string> run(const vector<string>& commands) {
        vector<string> out;
        for (const string& line : commands) {
            vector<string> t;
            istringstream in(line);
            for (string w; in >> w;) t.push_back(w);
            const string& cmd = t[0];
            if (cmd == "SET") write(t[1], t[2]);
            else if (cmd == "UNSET") { if (data.count(t[1])) write(t[1], nullopt); }
            else if (cmd == "GET") out.push_back(data.count(t[1]) ? data[t[1]] : "NULL");
            else if (cmd == "NUMEQUALTO") out.push_back(to_string(counts.count(t[1]) ? counts[t[1]] : 0));
            else if (cmd == "BEGIN") undo.emplace_back();
            else if (cmd == "ROLLBACK") {
                if (undo.empty()) out.push_back("NO TRANSACTION");
                else {
                    auto u = move(undo.back());
                    undo.pop_back();
                    for (const auto& [name, old] : u) apply(name, old);   // restore old values (empty = delete)
                }
            }
            else if (cmd == "COMMIT") {
                if (undo.empty()) out.push_back("NO TRANSACTION"); else undo.clear();
            }
            else if (cmd == "END") return out;
            else out.push_back("UNKNOWN " + cmd);
        }
        return out;
    }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

int main() {
    cout << show(SimpleDatabase().run({
        "SET a 10", "SET b 10", "NUMEQUALTO 10", "BEGIN", "SET a 20", "NUMEQUALTO 10",
        "ROLLBACK", "NUMEQUALTO 10", "GET a", "ROLLBACK", "END"})) << "\n";        // [2, 1, 2, 10, NO TRANSACTION]
    cout << show(SimpleDatabase().run({
        "BEGIN", "SET a 30", "BEGIN", "SET a 40", "COMMIT", "GET a", "ROLLBACK", "END"})) << "\n";   // [40, NO TRANSACTION]
    cout << show(SimpleDatabase().run({
        "SET a 50", "BEGIN", "GET a", "SET a 60", "BEGIN", "UNSET a", "GET a",
        "ROLLBACK", "GET a", "COMMIT", "GET a", "END"})) << "\n";                   // [50, NULL, 60, 60]
    // failure paths: no transaction, unset of a missing name, unknown command, END stops the run
    cout << show(SimpleDatabase().run({
        "COMMIT", "UNSET zzz", "GET zzz", "FLY away", "NUMEQUALTO 5", "END", "GET a"})) << "\n";     // [NO TRANSACTION, NULL, UNKNOWN FLY, 0]
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class SimpleDatabase {
    private readonly Dictionary<string, string> data = new Dictionary<string, string>();
    private readonly Dictionary<string, int> counts = new Dictionary<string, int>();
    private readonly Stack<Dictionary<string, string>> undo = new Stack<Dictionary<string, string>>();   // value null = key did not exist

    private void Apply(string name, string value) {           // the ONLY mutation point
        string old; data.TryGetValue(name, out old);
        if (value == null) data.Remove(name); else data[name] = value;
        if (old != null) { int c = counts[old]; if (c == 1) counts.Remove(old); else counts[old] = c - 1; }
        if (value != null) { int c; counts.TryGetValue(value, out c); counts[value] = c + 1; }
    }
    private void Write(string name, string value) {
        if (undo.Count > 0) {
            Dictionary<string, string> top = undo.Peek();
            if (!top.ContainsKey(name)) { string cur; data.TryGetValue(name, out cur); top[name] = cur; }   // remember first old value
        }
        Apply(name, value);
    }

    public List<string> Run(List<string> commands) {
        List<string> result = new List<string>();
        foreach (string line in commands) {
            string[] t = line.Trim().Split(' ');
            switch (t[0]) {
                case "SET": Write(t[1], t[2]); break;
                case "UNSET": if (data.ContainsKey(t[1])) Write(t[1], null); break;
                case "GET": { string v; result.Add(data.TryGetValue(t[1], out v) ? v : "NULL"); break; }
                case "NUMEQUALTO": { int c; counts.TryGetValue(t[1], out c); result.Add(c.ToString()); break; }
                case "BEGIN": undo.Push(new Dictionary<string, string>()); break;
                case "ROLLBACK":
                    if (undo.Count == 0) result.Add("NO TRANSACTION");
                    else foreach (var kv in undo.Pop()) Apply(kv.Key, kv.Value);   // restore old values (null = delete)
                    break;
                case "COMMIT": if (undo.Count == 0) result.Add("NO TRANSACTION"); else undo.Clear(); break;
                case "END": return result;
                default: result.Add("UNKNOWN " + t[0]); break;
            }
        }
        return result;
    }

    static string Run(params string[] cmds) { return "[" + string.Join(", ", new SimpleDatabase().Run(new List<string>(cmds))) + "]"; }

    static void Main() {
        Console.WriteLine(Run("SET a 10", "SET b 10", "NUMEQUALTO 10", "BEGIN", "SET a 20", "NUMEQUALTO 10",
            "ROLLBACK", "NUMEQUALTO 10", "GET a", "ROLLBACK", "END"));      // [2, 1, 2, 10, NO TRANSACTION]
        Console.WriteLine(Run("BEGIN", "SET a 30", "BEGIN", "SET a 40", "COMMIT", "GET a", "ROLLBACK", "END"));  // [40, NO TRANSACTION]
        Console.WriteLine(Run("SET a 50", "BEGIN", "GET a", "SET a 60", "BEGIN", "UNSET a", "GET a",
            "ROLLBACK", "GET a", "COMMIT", "GET a", "END"));                   // [50, NULL, 60, 60]
        // failure paths: no transaction, unset of a missing name, unknown command, END stops the run
        Console.WriteLine(Run("COMMIT", "UNSET zzz", "GET zzz", "FLY away", "NUMEQUALTO 5", "END", "GET a"));  // [NO TRANSACTION, NULL, UNKNOWN FLY, 0]
    }
}` }
        ],
        dry: { head: ['Command', 'data', 'undo stack', 'counts', 'output'], rows: [['SET a 10, SET b 10', 'a=10 b=10', '[]', '10→2', ''], ['BEGIN, SET a 20', 'a=20 b=10', '[{a:10}]', '10→1, 20→1', ''], ['NUMEQUALTO 10', '', '', '', '1'], ['ROLLBACK', 'a=10 b=10', '[]', '10→2', ''], ['ROLLBACK', '', '[]', '', 'NO TRANSACTION']] },
        complexity: `<p>SET/GET/UNSET/NUMEQUALTO O(1) average. BEGIN O(1). ROLLBACK O(k) for k keys touched by that transaction. COMMIT O(depth) to clear. Memory O(n + total touched keys across open transactions).</p>`,
        followUps: ['Make COMMIT close only the innermost transaction (merge undo maps with putIfAbsent).', 'Add TTL: SET name value EX 10 — what must the undo map store now?', 'Two clients each with their own transaction: switch to overlays or MVCC?', 'Persist to an append-only log; how do you replay transactions that never committed?']
      }
    }]
  });

  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Effective Log Level with Per-Package Overrides',
    level: 'Easy', tags: ['logging', 'hashmap', 'hierarchy'], companies: ['Amazon', 'Atlassian'],
    statement: `<p>A logging config maps logger names to levels, e.g. <code>root=INFO</code>, <code>com.shop=WARN</code>, <code>com.shop.db=DEBUG</code>. Logger names are dot-separated. The <b>effective level</b> of a logger is the level of the closest configured ancestor (itself first, then its parent by removing the last <code>.part</code>, … up to root). Implement <code>shouldLog(loggerName, messageLevel)</code>.</p>`,
    constraints: `<p>Up to 10<sup>4</sup> config entries, 10<sup>6</sup> queries, names up to 10 parts. Levels: DEBUG &lt; INFO &lt; WARN &lt; ERROR.</p>`,
    example: `${H.table(['Query', 'Effective level', 'Answer'], [['com.shop.db.pool, DEBUG', 'DEBUG (from com.shop.db)', H.c('g', 'true')], ['com.shop.cart, INFO', 'WARN (from com.shop)', H.c('r', 'false')], ['com.shopx, INFO', 'INFO (root — com.shopx is NOT a child of com.shop)', H.c('g', 'true')]])}`,
    brute: {
      why: `<p>Scanning every config entry with <code>startsWith</code> is O(C) per query (10<sup>10</sup> total here) and has a boundary bug: <code>"com.shopx".startsWith("com.shop")</code> is true, so it wrongly inherits WARN.</p>`,
      code: { lang: 'java', code: String.raw`
class LevelScan {
    static final List<String> ORDER = List.of("DEBUG", "INFO", "WARN", "ERROR");
    static boolean shouldLog(Map<String, String> cfg, String logger, String level) {
        String best = "root"; int bestLen = -1;
        for (String name : cfg.keySet())                                  // O(C) per query
            if (!name.equals("root") && logger.startsWith(name) && name.length() > bestLen) { best = name; bestLen = name.length(); }
        return ORDER.indexOf(level) >= ORDER.indexOf(cfg.get(best));
    }
    public static void main(String[] args) {
        Map<String, String> cfg = Map.of("root", "INFO", "com.shop", "WARN", "com.shop.db", "DEBUG");
        System.out.println(shouldLog(cfg, "com.shopx", "INFO"));         // false: boundary bug (should be true)
    }
}`, alt: [{ lang: 'python', code: "class LevelScan:\n    ORDER = [\"DEBUG\", \"INFO\", \"WARN\", \"ERROR\"]\n\n    @staticmethod\n    def should_log(cfg, logger, level):\n        best, best_len = \"root\", -1\n        for name in cfg:                                          # O(C) per query\n            if name != \"root\" and logger.startswith(name) and len(name) > best_len: best, best_len = name, len(name)\n        return LevelScan.ORDER.index(level) >= LevelScan.ORDER.index(cfg[best])\n\nif __name__ == \"__main__\":\n    cfg = {\"root\": \"INFO\", \"com.shop\": \"WARN\", \"com.shop.db\": \"DEBUG\"}\n    print(LevelScan.should_log(cfg, \"com.shopx\", \"INFO\"))         # False: boundary bug (should be True)\n" }, { lang: 'ts', code: "class LevelScan {\n  static ORDER = [\"DEBUG\", \"INFO\", \"WARN\", \"ERROR\"];\n  static shouldLog(cfg: Map<string, string>, logger: string, level: string): boolean {\n    let best = \"root\", bestLen = -1;\n    for (const name of cfg.keys())                                // O(C) per query\n      if (name !== \"root\" && logger.startsWith(name) && name.length > bestLen) { best = name; bestLen = name.length; }\n    return LevelScan.ORDER.indexOf(level) >= LevelScan.ORDER.indexOf(cfg.get(best)!);\n  }\n}\nconst cfg = new Map([[\"root\", \"INFO\"], [\"com.shop\", \"WARN\"], [\"com.shop.db\", \"DEBUG\"]]);\nconsole.log(LevelScan.shouldLog(cfg, \"com.shopx\", \"INFO\"));       // false: boundary bug (should be true)\n" }, { lang: 'cpp', code: "struct LevelScan {\n    static bool shouldLog(const map<string, string>& cfg, const string& logger, const string& level) {\n        static const vector<string> ORDER = {\"DEBUG\", \"INFO\", \"WARN\", \"ERROR\"};\n        string best = \"root\"; int bestLen = -1;\n        for (auto& [name, lvl] : cfg)                                 // O(C) per query\n            if (name != \"root\" && logger.rfind(name, 0) == 0 && (int)name.size() > bestLen) { best = name; bestLen = name.size(); }\n        auto idx = [&](const string& l) { return find(ORDER.begin(), ORDER.end(), l) - ORDER.begin(); };\n        return idx(level) >= idx(cfg.at(best));\n    }\n};\n\nint main() {\n    map<string, string> cfg = {{\"root\", \"INFO\"}, {\"com.shop\", \"WARN\"}, {\"com.shop.db\", \"DEBUG\"}};\n    cout << boolalpha << LevelScan::shouldLog(cfg, \"com.shopx\", \"INFO\") << endl;   // false: boundary bug (should be true)\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nstatic class LevelScan {\n    static readonly List<string> ORDER = new List<string> { \"DEBUG\", \"INFO\", \"WARN\", \"ERROR\" };\n    public static bool ShouldLog(Dictionary<string, string> cfg, string logger, string level) {\n        string best = \"root\"; int bestLen = -1;\n        foreach (string name in cfg.Keys)                                  // O(C) per query\n            if (name != \"root\" && logger.StartsWith(name) && name.Length > bestLen) { best = name; bestLen = name.Length; }\n        return ORDER.IndexOf(level) >= ORDER.IndexOf(cfg[best]);\n    }\n    static void Main() {\n        var cfg = new Dictionary<string, string> { { \"root\", \"INFO\" }, { \"com.shop\", \"WARN\" }, { \"com.shop.db\", \"DEBUG\" } };\n        Console.WriteLine(ShouldLog(cfg, \"com.shopx\", \"INFO\").ToString().ToLower());   // false: boundary bug (should be true)\n    }\n}\n" }] }
    },
    mcq: { q: 'Which lookup sequence finds the effective level of <code>a.b.c</code>?', options: ['a.b.c → a.b → a → root, stop at the first configured one', 'root → a → a.b → a.b.c, take the last configured', 'Only a.b.c, else root', 'Any config key that is a substring of a.b.c'], answer: 0, explain: 'Climbing from the most specific name and stopping at the first hit gives the closest ancestor in O(depth) hash lookups. Option 2 also works but always walks the full depth.' },
    hints: [
      `<p>An ancestor is obtained by cutting at the last dot: <code>name.substring(0, name.lastIndexOf('.'))</code>. That respects the dot boundary automatically.</p>`,
      `<p>Put the config in a hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>); loop: if map contains name → done; else cut the last part; when no dot is left, use root.</p>`,
      `<p>Edge cases: the logger "root" itself, names without dots, unknown levels (validate), and caching results per logger name if config rarely changes (real frameworks cache the effective level and invalidate on config reload).</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "true\nfalse\ntrue\nWARN true\nINFO\n" }] },
    solution: {
      approach: `<p>Walk up the hierarchy with <code>lastIndexOf('.')</code> doing O(1) hash lookups; the first configured name wins; fall back to root. Compare level ordinals.</p>`,
      code: String.raw`
enum Lv { DEBUG, INFO, WARN, ERROR }

class LevelResolver {
    private final Map<String, Lv> cfg;
    LevelResolver(Map<String, Lv> cfg) { this.cfg = cfg; }

    Lv effective(String logger) {
        String name = logger;
        while (true) {
            Lv lv = cfg.get(name);
            if (lv != null) return lv;
            int dot = name.lastIndexOf('.');
            if (dot < 0) return cfg.getOrDefault("root", Lv.INFO);
            name = name.substring(0, dot);                      // climb exactly one level
        }
    }
    boolean shouldLog(String logger, Lv level) { return level.ordinal() >= effective(logger).ordinal(); }

    public static void main(String[] args) {
        LevelResolver r = new LevelResolver(Map.of("root", Lv.INFO, "com.shop", Lv.WARN, "com.shop.db", Lv.DEBUG));
        System.out.println(r.shouldLog("com.shop.db.pool", Lv.DEBUG));  // true
        System.out.println(r.shouldLog("com.shop.cart", Lv.INFO));      // false
        System.out.println(r.shouldLog("com.shopx", Lv.INFO));          // true
        System.out.println(r.effective("com.shop") + " " + r.shouldLog("com.shop.db", Lv.ERROR));  // WARN true
        System.out.println(new LevelResolver(Map.of()).effective("a.b.c"));                       // INFO (nothing configured)
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
from enum import IntEnum


class Lv(IntEnum):
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3


class LevelResolver:
    def __init__(self, cfg: dict[str, Lv]) -> None:
        self._cfg = cfg

    def effective(self, logger: str) -> Lv:
        name = logger
        while True:
            lv = self._cfg.get(name)
            if lv is not None:
                return lv
            dot = name.rfind(".")
            if dot < 0:
                return self._cfg.get("root", Lv.INFO)
            name = name[:dot]                           # climb exactly one level

    def should_log(self, logger: str, level: Lv) -> bool:
        return level >= self.effective(logger)


def main() -> None:
    r = LevelResolver({"root": Lv.INFO, "com.shop": Lv.WARN, "com.shop.db": Lv.DEBUG})
    print(str(r.should_log("com.shop.db.pool", Lv.DEBUG)).lower())    # true
    print(str(r.should_log("com.shop.cart", Lv.INFO)).lower())        # false
    print(str(r.should_log("com.shopx", Lv.INFO)).lower())            # true
    print(f"{r.effective('com.shop').name} {str(r.should_log('com.shop.db', Lv.ERROR)).lower()}")   # WARN true
    print(LevelResolver({}).effective("a.b.c").name)                  # INFO (nothing configured)


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
enum Lv { DEBUG, INFO, WARN, ERROR }

class LevelResolver {
  constructor(private readonly cfg: ReadonlyMap<string, Lv>) {}

  effective(logger: string): Lv {
    let name = logger;
    for (;;) {
      const lv = this.cfg.get(name);
      if (lv !== undefined) return lv;
      const dot = name.lastIndexOf(".");
      if (dot < 0) return this.cfg.get("root") ?? Lv.INFO;
      name = name.substring(0, dot);                    // climb exactly one level
    }
  }
  shouldLog(logger: string, level: Lv): boolean { return level >= this.effective(logger); }
}

const r = new LevelResolver(new Map([["root", Lv.INFO], ["com.shop", Lv.WARN], ["com.shop.db", Lv.DEBUG]]));
console.log(r.shouldLog("com.shop.db.pool", Lv.DEBUG));   // true
console.log(r.shouldLog("com.shop.cart", Lv.INFO));       // false
console.log(r.shouldLog("com.shopx", Lv.INFO));           // true
console.log(Lv[r.effective("com.shop")] + " " + r.shouldLog("com.shop.db", Lv.ERROR));   // WARN true
console.log(Lv[new LevelResolver(new Map()).effective("a.b.c")]);                       // INFO (nothing configured)` },
        { lang: 'cpp', code: String.raw`
enum class Lv { DEBUG, INFO, WARN, ERROR };

string name(Lv lv) {
    static const char* names[] = {"DEBUG", "INFO", "WARN", "ERROR"};
    return names[static_cast<int>(lv)];
}

class LevelResolver {
    map<string, Lv> cfg;
public:
    explicit LevelResolver(map<string, Lv> c) : cfg(move(c)) {}

    Lv effective(string logger) const {
        while (true) {
            auto it = cfg.find(logger);
            if (it != cfg.end()) return it->second;
            size_t dot = logger.rfind('.');
            if (dot == string::npos) {
                auto root = cfg.find("root");
                return root == cfg.end() ? Lv::INFO : root->second;
            }
            logger.resize(dot);                          // climb exactly one level
        }
    }
    bool shouldLog(const string& logger, Lv level) const { return level >= effective(logger); }
};

int main() {
    cout << boolalpha;
    LevelResolver r({{"root", Lv::INFO}, {"com.shop", Lv::WARN}, {"com.shop.db", Lv::DEBUG}});
    cout << r.shouldLog("com.shop.db.pool", Lv::DEBUG) << "\n";    // true
    cout << r.shouldLog("com.shop.cart", Lv::INFO) << "\n";        // false
    cout << r.shouldLog("com.shopx", Lv::INFO) << "\n";            // true
    cout << name(r.effective("com.shop")) << " " << r.shouldLog("com.shop.db", Lv::ERROR) << "\n";   // WARN true
    cout << name(LevelResolver({}).effective("a.b.c")) << "\n";    // INFO (nothing configured)
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum Lv { DEBUG, INFO, WARN, ERROR }

class LevelResolver {
    private readonly Dictionary<string, Lv> cfg;
    public LevelResolver(Dictionary<string, Lv> cfg) { this.cfg = cfg; }

    public Lv Effective(string logger) {
        string name = logger;
        while (true) {
            Lv lv;
            if (cfg.TryGetValue(name, out lv)) return lv;
            int dot = name.LastIndexOf('.');
            if (dot < 0) return cfg.TryGetValue("root", out lv) ? lv : Lv.INFO;
            name = name.Substring(0, dot);                      // climb exactly one level
        }
    }
    public bool ShouldLog(string logger, Lv level) { return (int)level >= (int)Effective(logger); }

    static string B(bool b) { return b.ToString().ToLower(); }
    static void Main() {
        LevelResolver r = new LevelResolver(new Dictionary<string, Lv> { { "root", Lv.INFO }, { "com.shop", Lv.WARN }, { "com.shop.db", Lv.DEBUG } });
        Console.WriteLine(B(r.ShouldLog("com.shop.db.pool", Lv.DEBUG)));  // true
        Console.WriteLine(B(r.ShouldLog("com.shop.cart", Lv.INFO)));      // false
        Console.WriteLine(B(r.ShouldLog("com.shopx", Lv.INFO)));          // true
        Console.WriteLine(r.Effective("com.shop") + " " + B(r.ShouldLog("com.shop.db", Lv.ERROR)));  // WARN true
        Console.WriteLine(new LevelResolver(new Dictionary<string, Lv>()).Effective("a.b.c"));       // INFO (nothing configured)
    }
}` }
      ],
      complexity: `<p>O(D) hash lookups per query, D = number of name parts (≤ 10). Memory O(C).</p>`,
      followUps: ['Cache effective levels and invalidate on config change.', 'Support wildcards like com.*.db.']
    }
  });

  practice.push({
    title: 'Pick the Partition: Key Hash and Round-Robin',
    level: 'Easy', tags: ['pub-sub', 'hashing', 'kafka'], companies: ['Confluent', 'LinkedIn', 'Uber'],
    statement: `<p>Implement <code>int partitionFor(String key, int n)</code> (Python <code>partition_for</code>) for a producer: messages with a key go to <code>hash(key) mod n</code> (same key → same partition, always); messages with a <code>null</code> key are spread round-robin. The result must always be in <code>[0, n)</code>.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>4</sup>. Any string is a valid key. The hash is Java's <code>String.hashCode()</code> (31·h + c, wrapped to a signed 32-bit int), which can be negative or even the minimum int, −2<sup>31</sup>. The Python, TypeScript and C++ versions compute the same value, so all four languages choose the same partition.</p>`,
    example: `<p>n = 3, keys <code>u1, null, u1, null, null</code> → u1 always the same partition; nulls go 0, 1, 2. Key <code>"polygenelubricants"</code> has hash −2<sup>31</sup> (<code>Integer.MIN_VALUE</code>): ${H.c('r', 'taking the absolute value first still gives a negative number')}, ${H.c('g', 'a floor-mod gives 1')}.</p>`,
    brute: {
      why: `<p><code>abs(hash) % n</code> looks right, but the absolute value of the minimum 32-bit int is still negative (<code>Math.abs(Integer.MIN_VALUE)</code> overflows), so one-in-four-billion keys produce a negative partition and crash the producer in production. Also, <code>%</code> keeps the sign of its left operand in Java, C++ and JavaScript (not in Python). A random choice for null keys also loses even spread guarantees.</p>`,
      code: { lang: 'java', code: String.raw`
class AbsPartitioner {
    static int partitionFor(String key, int n) { return Math.abs(key.hashCode()) % n; }
    public static void main(String[] args) {
        System.out.println("polygenelubricants".hashCode());               // -2147483648
        System.out.println(partitionFor("polygenelubricants", 3));         // negative -> invalid partition!
    }
}`, alt: [{ lang: 'python', code: "import math\n\nclass AbsPartitioner:\n    @staticmethod\n    def string_hash(s):                                       # Java's String.hashCode(): signed 32-bit\n        h = 0\n        for ch in s: h = (31 * h + ord(ch)) & 0xFFFFFFFF\n        return h - (1 << 32) if h >= (1 << 31) else h\n\n    @staticmethod\n    def partition_for(key, n):\n        a = abs(AbsPartitioner.string_hash(key))\n        if a >= (1 << 31): a -= 1 << 32                       # a 32-bit abs() overflows for the minimum int\n        return int(math.fmod(a, n))                           # fmod keeps the sign, like % in Java/C++/JS\n\nif __name__ == \"__main__\":\n    print(AbsPartitioner.string_hash(\"polygenelubricants\"))   # -2147483648\n    print(AbsPartitioner.partition_for(\"polygenelubricants\", 3))   # negative -> invalid partition!\n" }, { lang: 'ts', code: "class AbsPartitioner {\n  static stringHash(s: string): number {                      // Java's String.hashCode(): signed 32-bit\n    let h = 0;\n    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;\n    return h;\n  }\n  static partitionFor(key: string, n: number): number { return (Math.abs(AbsPartitioner.stringHash(key)) | 0) % n; }\n}\nconsole.log(AbsPartitioner.stringHash(\"polygenelubricants\"));          // -2147483648\nconsole.log(AbsPartitioner.partitionFor(\"polygenelubricants\", 3));     // negative -> invalid partition!\n" }, { lang: 'cpp', code: "struct AbsPartitioner {\n    static int stringHash(const string& s) {                  // Java's String.hashCode(): signed 32-bit\n        uint32_t h = 0;\n        for (char ch : s) h = 31 * h + (unsigned char)ch;\n        return (int)h;\n    }\n    static int partitionFor(const string& key, int n) { return abs(stringHash(key)) % n; }\n};\n\nint main() {\n    cout << AbsPartitioner::stringHash(\"polygenelubricants\") << endl;          // -2147483648\n    cout << AbsPartitioner::partitionFor(\"polygenelubricants\", 3) << endl;     // abs(INT_MIN) overflows: negative -> invalid partition!\n}\n" }, { lang: 'csharp', code: "using System;\nstatic class AbsPartitioner {\n    // Java's String.hashCode, so the overflow example is the same in every language\n    public static int JavaHash(string s) { int h = 0; foreach (char c in s) h = unchecked(31 * h + c); return h; }\n    public static int PartitionFor(string key, int n) {\n        int h = JavaHash(key);\n        return (h == int.MinValue ? h : Math.Abs(h)) % n;          // Math.Abs(int.MinValue) overflows: Java returns MIN_VALUE, C# throws\n    }\n    static void Main() {\n        Console.WriteLine(JavaHash(\"polygenelubricants\"));              // -2147483648\n        Console.WriteLine(PartitionFor(\"polygenelubricants\", 3));       // negative -> invalid partition!\n    }\n}\n" }] }
    },
    mcq: { q: 'Why does every message with key "order-42" land in the same partition?', options: ['The partition is a pure function of the key hash and the partition count', 'The broker remembers which partition each key used', 'Round-robin is applied per key', 'Consumers request it'], answer: 0, explain: 'hash(key) mod n is deterministic — as long as n does not change. That is why adding partitions reshuffles keys.' },
    hints: [
      `<p>Use a floor-mod (Java <code>Math.floorMod(hash, n)</code>; Python's <code>%</code> already is one; in C++ and JavaScript write <code>((hash % n) + n) % n</code>): it always returns a value in [0, n) even for negative hashes. Alternatively mask the sign bit: <code>(hash &amp; 0x7fffffff) % n</code>.</p>`,
      `<p>For null keys keep an atomic counter (<code>AtomicInteger</code>, <code>std::atomic</code>, or a lock-guarded int) and use <code>floorMod(counter.getAndIncrement(), n)</code> — floorMod also protects you when the counter overflows.</p>`,
      `<p>Mention: Kafka uses murmur2 for better spread than String.hashCode, and modern Kafka uses a "sticky" partitioner for null keys (fill one batch, then switch) to improve batching.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "1\n1 0 1 1 2\nrejected: n must be positive\n" }] },
    solution: {
      approach: `<p>Deterministic floorMod of the key hash for keyed messages; an atomic round-robin counter for null keys; both always land in range.</p>`,
      code: String.raw`
class SafePartitioner {
    private final AtomicInteger rr = new AtomicInteger();
    int partitionFor(String key, int n) {
        if (n <= 0) throw new IllegalArgumentException("n must be positive");
        if (key == null) return Math.floorMod(rr.getAndIncrement(), n);
        return Math.floorMod(key.hashCode(), n);
    }
    public static void main(String[] args) {
        SafePartitioner p = new SafePartitioner();
        System.out.println(p.partitionFor("polygenelubricants", 3));      // 1, never negative
        StringBuilder sb = new StringBuilder();
        for (String k : new String[] {"u1", null, "u1", null, null}) sb.append(p.partitionFor(k, 3)).append(' ');
        System.out.println(sb.toString().trim());                         // u1 twice the same; nulls 0 1 2
        try { p.partitionFor("x", 0); }
        catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
import itertools
import threading
from typing import Optional


def java_hash(s: str) -> int:
    """Java's String.hashCode: 31*h + c wrapped to a signed 32-bit int (the result may be negative)."""
    h = 0
    for ch in s:
        h = (31 * h + ord(ch)) & 0xFFFFFFFF
    return h - (1 << 32) if h >= (1 << 31) else h


class SafePartitioner:
    def __init__(self) -> None:
        self._rr = itertools.count()
        self._lock = threading.Lock()

    def partition_for(self, key: Optional[str], n: int) -> int:
        if n <= 0:
            raise ValueError("n must be positive")
        if key is None:
            with self._lock:
                return next(self._rr) % n
        return java_hash(key) % n                       # Python's % is already a floor-mod: never negative


def main() -> None:
    p = SafePartitioner()
    print(p.partition_for("polygenelubricants", 3))      # 1, never negative
    print(" ".join(str(p.partition_for(k, 3)) for k in ["u1", None, "u1", None, None]))   # u1 twice the same; nulls 0 1 2
    try:
        p.partition_for("x", 0)
    except ValueError as e:
        print(f"rejected: {e}")


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
// Java's String.hashCode: 31*h + c wrapped to a signed 32-bit int (the result may be negative).
function javaHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
const floorMod = (a: number, n: number): number => ((a % n) + n) % n;   // JS % keeps the sign of a

class SafePartitioner {
  private rr = 0;
  partitionFor(key: string | null, n: number): number {
    if (n <= 0) throw new Error("n must be positive");
    if (key === null) return floorMod(this.rr++, n);
    return floorMod(javaHash(key), n);
  }
}

const p = new SafePartitioner();
console.log(p.partitionFor("polygenelubricants", 3));    // 1, never negative
console.log(["u1", null, "u1", null, null].map((k) => p.partitionFor(k, 3)).join(" "));   // u1 twice the same; nulls 0 1 2
try { p.partitionFor("x", 0); }
catch (e) { console.log("rejected: " + (e as Error).message); }` },
        { lang: 'cpp', code: String.raw`
// Java's String.hashCode: 31*h + c wrapped to a signed 32-bit int (the result may be negative).
int32_t javaHash(const string& s) {
    uint32_t h = 0;                                      // unsigned arithmetic wraps; signed overflow would be undefined
    for (unsigned char c : s) h = 31 * h + c;
    return static_cast<int32_t>(h);
}
int floorMod(long long a, int n) { return static_cast<int>(((a % n) + n) % n); }   // C++ % keeps the sign of a

class SafePartitioner {
    atomic<int> rr{0};
public:
    int partitionFor(const optional<string>& key, int n) {
        if (n <= 0) throw invalid_argument("n must be positive");
        if (!key) return floorMod(rr++, n);
        return floorMod(javaHash(*key), n);
    }
};

int main() {
    SafePartitioner p;
    cout << p.partitionFor("polygenelubricants", 3) << "\n";      // 1, never negative
    string line;
    for (const optional<string>& k : vector<optional<string>>{"u1", nullopt, "u1", nullopt, nullopt})
        line += (line.empty() ? "" : " ") + to_string(p.partitionFor(k, 3));
    cout << line << "\n";                                          // u1 twice the same; nulls 0 1 2
    try { p.partitionFor("x", 0); }
    catch (const invalid_argument& e) { cout << "rejected: " << e.what() << "\n"; }
}` },
  { lang: 'csharp', code: `
using System;
using System.Text;
using System.Threading;

class SafePartitioner {
    private int rr = -1;
    static int JavaHash(string s) { int h = 0; foreach (char c in s) h = unchecked(31 * h + c); return h; }   // stable across runs
    static int FloorMod(long a, int n) { long r = a % n; return (int)(r < 0 ? r + n : r); }
    public int PartitionFor(string key, int n) {
        if (n <= 0) throw new ArgumentException("n must be positive");
        if (key == null) return FloorMod(Interlocked.Increment(ref rr), n);
        return FloorMod(JavaHash(key), n);
    }
    static void Main() {
        SafePartitioner p = new SafePartitioner();
        Console.WriteLine(p.PartitionFor("polygenelubricants", 3));      // 1, never negative
        StringBuilder sb = new StringBuilder();
        foreach (string k in new string[] { "u1", null, "u1", null, null }) sb.Append(p.PartitionFor(k, 3)).Append(' ');
        Console.WriteLine(sb.ToString().Trim());                         // u1 twice the same; nulls 0 1 2
        try { p.PartitionFor("x", 0); }
        catch (ArgumentException e) { Console.WriteLine("rejected: " + e.Message); }
    }
}` }
      ],
      complexity: `<p>O(length of key) to hash, O(1) otherwise.</p>`,
      followUps: ['What happens to per-key ordering when n grows from 3 to 4?', 'Design a consistent-hashing partitioner to reduce key movement.']
    }
  });

  practice.push({
    title: 'Knight Moves from a Square',
    level: 'Easy', tags: ['chess', 'grid', 'bfs'], companies: ['Google', 'Chess.com'],
    statement: `<p>On an empty 8×8 board, list every square a knight on square <code>s</code> (like "b1") can reach in one move, in sorted order. Follow-up: the minimum number of knight moves from <code>s</code> to <code>t</code>.</p>`,
    constraints: `<p>Squares a1..h8. The follow-up must be O(64).</p>`,
    example: `<p>${H.c('b', 'b1')} → ${H.chips(['a3', 'c3', 'd2'], { hl: { a3: 'g', c3: 'g', d2: 'g' } })} (the other 5 L-jumps fall off the board). Corner a1 → 2 squares; centre d4 → 8 squares. Min moves a1 → h8 = 6.</p>`,
    brute: {
      why: `<p>Testing all 64 squares with <code>|dr|·|dc| == 2</code> works but does 8× more checks than needed and does not extend to the follow-up. For min-moves, trying all move sequences recursively explodes exponentially (8<sup>d</sup>).</p>`,
      code: { lang: 'java', code: String.raw`
class KnightScan {
    static List<String> moves(String s) {
        int r = s.charAt(1) - '1', c = s.charAt(0) - 'a';
        List<String> out = new ArrayList<>();
        for (int rr = 0; rr < 8; rr++) for (int cc = 0; cc < 8; cc++)       // scan all 64
            if (Math.abs(rr - r) * Math.abs(cc - c) == 2) out.add("" + (char) ('a' + cc) + (rr + 1));
        Collections.sort(out);
        return out;
    }
    public static void main(String[] args) { System.out.println(moves("b1")); }
}`, alt: [{ lang: 'python', code: "class KnightScan:\n    @staticmethod\n    def moves(s):\n        r, c = int(s[1]) - 1, ord(s[0]) - ord(\"a\")\n        out = []\n        for rr in range(8):\n            for cc in range(8):                                    # scan all 64\n                if abs(rr - r) * abs(cc - c) == 2: out.append(chr(ord(\"a\") + cc) + str(rr + 1))\n        return sorted(out)\n\nif __name__ == \"__main__\":\n    print(KnightScan.moves(\"b1\"))\n" }, { lang: 'ts', code: "class KnightScan {\n  static moves(s: string): string[] {\n    const r = s.charCodeAt(1) - 49, c = s.charCodeAt(0) - 97;\n    const out: string[] = [];\n    for (let rr = 0; rr < 8; rr++) for (let cc = 0; cc < 8; cc++)       // scan all 64\n      if (Math.abs(rr - r) * Math.abs(cc - c) === 2) out.push(String.fromCharCode(97 + cc) + (rr + 1));\n    return out.sort();\n  }\n}\nconsole.log(KnightScan.moves(\"b1\"));\n" }, { lang: 'cpp', code: "struct KnightScan {\n    static vector<string> moves(const string& s) {\n        int r = s[1] - '1', c = s[0] - 'a';\n        vector<string> out;\n        for (int rr = 0; rr < 8; rr++) for (int cc = 0; cc < 8; cc++)       // scan all 64\n            if (abs(rr - r) * abs(cc - c) == 2) out.push_back(string(1, 'a' + cc) + to_string(rr + 1));\n        sort(out.begin(), out.end());\n        return out;\n    }\n};\n\nint main() { for (auto& m : KnightScan::moves(\"b1\")) cout << m << \" \"; cout << endl; }\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nstatic class KnightScan {\n    public static List<string> Moves(string s) {\n        int r = s[1] - '1', c = s[0] - 'a';\n        List<string> result = new List<string>();\n        for (int rr = 0; rr < 8; rr++) for (int cc = 0; cc < 8; cc++)       // scan all 64\n            if (Math.Abs(rr - r) * Math.Abs(cc - c) == 2) result.Add(\"\" + (char)('a' + cc) + (rr + 1));\n        result.Sort(StringComparer.Ordinal);\n        return result;\n    }\n    static void Main() { Console.WriteLine(\"[\" + string.Join(\", \", Moves(\"b1\")) + \"]\"); }\n}\n" }] }
    },
    mcq: { q: 'Why is <code>|dr| × |dc| == 2</code> exactly the knight\'s move?', options: ['The only positive integer factorisations of 2 are 1×2 and 2×1', 'It also allows 2×2', 'It counts diagonal moves', 'It requires the path to be empty'], answer: 0, explain: '|dr|·|dc| = 2 forces one delta to be 1 and the other 2 — the L shape. Knights jump, so no path check.' },
    hints: [
      `<p>Use the 8 fixed deltas (±1, ±2) and (±2, ±1); keep only those on the board.</p>`,
      `<p>For the minimum moves, run BFS on the 64-square graph where edges are knight jumps; the first time you reach t is the answer.</p>`,
      `<p>Edge cases: s == t → 0; corners have only 2 moves. In the OOP chess design this is exactly <code>Knight.pseudoLegalMoves</code> via the shared <code>jumps(deltas)</code> helper.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "[a3, c3, d2] 2 8\na1->h8 = 6\n0 [f7, g6]\n" }] },
    solution: {
      approach: `<p>Apply the 8 deltas with a bounds check. For distances, BFS from s over at most 64 nodes.</p>`,
      code: String.raw`
class KnightMoves {
    static final int[][] D = { {2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2} };
    static String sq(int r, int c) { return "" + (char) ('a' + c) + (r + 1); }

    static List<String> moves(String s) {
        int r = s.charAt(1) - '1', c = s.charAt(0) - 'a';
        List<String> out = new ArrayList<>();
        for (int[] d : D) { int rr = r + d[0], cc = c + d[1]; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) out.add(sq(rr, cc)); }
        Collections.sort(out);
        return out;
    }
    static int minMoves(String s, String t) {
        Map<String, Integer> dist = new HashMap<>(Map.of(s, 0));
        ArrayDeque<String> q = new ArrayDeque<>(List.of(s));
        while (!q.isEmpty()) {
            String cur = q.poll();
            if (cur.equals(t)) return dist.get(cur);
            for (String nx : moves(cur)) if (dist.putIfAbsent(nx, dist.get(cur) + 1) == null) q.add(nx);
        }
        return -1;
    }
    public static void main(String[] args) {
        System.out.println(moves("b1") + " " + moves("a1").size() + " " + moves("d4").size());  // [a3, c3, d2] 2 8
        System.out.println("a1->h8 = " + minMoves("a1", "h8"));                                    // 6
        System.out.println(minMoves("a1", "a1") + " " + moves("h8"));                                // 0 [f7, g6]
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
from collections import deque

D = [(2, 1), (2, -1), (-2, 1), (-2, -1), (1, 2), (1, -2), (-1, 2), (-1, -2)]


def sq(r: int, c: int) -> str:
    return chr(ord("a") + c) + str(r + 1)


class KnightMoves:
    @staticmethod
    def moves(s: str) -> list[str]:
        r, c = int(s[1]) - 1, ord(s[0]) - ord("a")
        return sorted(sq(r + dr, c + dc) for dr, dc in D if 0 <= r + dr < 8 and 0 <= c + dc < 8)

    @staticmethod
    def min_moves(s: str, t: str) -> int:
        dist = {s: 0}
        q = deque([s])
        while q:
            cur = q.popleft()
            if cur == t:
                return dist[cur]
            for nx in KnightMoves.moves(cur):
                if nx not in dist:
                    dist[nx] = dist[cur] + 1
                    q.append(nx)
        return -1


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def main() -> None:
    print(f"{show(KnightMoves.moves('b1'))} {len(KnightMoves.moves('a1'))} {len(KnightMoves.moves('d4'))}")   # [a3, c3, d2] 2 8
    print(f"a1->h8 = {KnightMoves.min_moves('a1', 'h8')}")                                                    # 6
    print(f"{KnightMoves.min_moves('a1', 'a1')} {show(KnightMoves.moves('h8'))}")                              # 0 [f7, g6]


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
const D: readonly (readonly [number, number])[] = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
const sq = (r: number, c: number): string => String.fromCharCode(97 + c) + (r + 1);

class KnightMoves {
  static moves(s: string): string[] {
    const r = s.charCodeAt(1) - 49, c = s.charCodeAt(0) - 97;
    const out: string[] = [];
    for (const [dr, dc] of D) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) out.push(sq(rr, cc));
    }
    return out.sort();                                   // strings: the default sort is lexicographic
  }

  static minMoves(s: string, t: string): number {
    const dist = new Map<string, number>([[s, 0]]);
    const q: string[] = [s];
    for (let head = 0; head < q.length; head++) {        // index instead of shift(): O(1) per step
      const cur = q[head];
      const d = dist.get(cur)!;
      if (cur === t) return d;
      for (const nx of KnightMoves.moves(cur)) {
        if (!dist.has(nx)) { dist.set(nx, d + 1); q.push(nx); }
      }
    }
    return -1;
  }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";

console.log(show(KnightMoves.moves("b1")) + " " + KnightMoves.moves("a1").length + " " + KnightMoves.moves("d4").length);   // [a3, c3, d2] 2 8
console.log("a1->h8 = " + KnightMoves.minMoves("a1", "h8"));                                                                // 6
console.log(KnightMoves.minMoves("a1", "a1") + " " + show(KnightMoves.moves("h8")));                                         // 0 [f7, g6]` },
        { lang: 'cpp', code: String.raw`
class KnightMoves {
    static string sq(int r, int c) { return string{static_cast<char>('a' + c), static_cast<char>('1' + r)}; }
public:
    static vector<string> moves(const string& s) {
        static const int D[8][2] = {{2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2}};
        int r = s[1] - '1', c = s[0] - 'a';
        vector<string> out;
        for (const auto& d : D) {
            int rr = r + d[0], cc = c + d[1];
            if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) out.push_back(sq(rr, cc));
        }
        sort(out.begin(), out.end());
        return out;
    }

    static int minMoves(const string& s, const string& t) {
        unordered_map<string, int> dist{{s, 0}};
        queue<string> q;
        q.push(s);
        while (!q.empty()) {
            string cur = q.front();
            q.pop();
            if (cur == t) return dist[cur];
            for (const string& nx : moves(cur))
                if (dist.emplace(nx, dist[cur] + 1).second) q.push(nx);
        }
        return -1;
    }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

int main() {
    cout << show(KnightMoves::moves("b1")) << " " << KnightMoves::moves("a1").size() << " " << KnightMoves::moves("d4").size() << "\n";   // [a3, c3, d2] 2 8
    cout << "a1->h8 = " << KnightMoves::minMoves("a1", "h8") << "\n";                                                                       // 6
    cout << KnightMoves::minMoves("a1", "a1") << " " << show(KnightMoves::moves("h8")) << "\n";                                              // 0 [f7, g6]
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

static class KnightMoves {
    static readonly int[][] D = { new[] { 2, 1 }, new[] { 2, -1 }, new[] { -2, 1 }, new[] { -2, -1 }, new[] { 1, 2 }, new[] { 1, -2 }, new[] { -1, 2 }, new[] { -1, -2 } };
    static string Sq(int r, int c) { return "" + (char)('a' + c) + (r + 1); }

    public static List<string> Moves(string s) {
        int r = s[1] - '1', c = s[0] - 'a';
        List<string> result = new List<string>();
        foreach (int[] d in D) { int rr = r + d[0], cc = c + d[1]; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) result.Add(Sq(rr, cc)); }
        result.Sort(StringComparer.Ordinal);
        return result;
    }
    public static int MinMoves(string s, string t) {
        Dictionary<string, int> dist = new Dictionary<string, int> { { s, 0 } };
        Queue<string> q = new Queue<string>(); q.Enqueue(s);
        while (q.Count > 0) {
            string cur = q.Dequeue();
            if (cur == t) return dist[cur];
            foreach (string nx in Moves(cur)) if (!dist.ContainsKey(nx)) { dist[nx] = dist[cur] + 1; q.Enqueue(nx); }
        }
        return -1;
    }
    static string Show(List<string> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        Console.WriteLine(Show(Moves("b1")) + " " + Moves("a1").Count + " " + Moves("d4").Count);  // [a3, c3, d2] 2 8
        Console.WriteLine("a1->h8 = " + MinMoves("a1", "h8"));                                    // 6
        Console.WriteLine(MinMoves("a1", "a1") + " " + Show(Moves("h8")));                         // 0 [f7, g6]
    }
}` }
      ],
      complexity: `<p>One-move list O(8). BFS O(64 · 8).</p>`,
      followUps: ['Count squares reachable in exactly k moves.', 'Add obstacles (own pieces) — which squares become illegal?']
    }
  });

  practice.push({
    title: 'Key-Value Cache with Lazy TTL and an Injected Clock',
    level: 'Easy', tags: ['kv store', 'ttl', 'testability'], companies: ['Amazon', 'Razorpay', 'Swiggy'],
    statement: `<p>Implement <code>put(key, value, ttlMillis)</code>, <code>get(key)</code> (null if missing or expired) and <code>size()</code> (live keys only). Time must come from an injected <code>Clock</code>-like interface so tests can move time manually.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> operations; get and put O(1) average; size may be O(expired keys) amortised.</p>`,
    example: `${H.table(['time', 'op', 'result'], [['0', 'put(a, 1, 1000)', 'ok'], ['500', 'get(a)', H.c('g', '1')], ['1000', 'get(a)', H.c('r', 'null (expired at exactly 1000)')], ['1000', 'size()', '0']])}`,
    brute: {
      why: `<p>Purging by scanning the whole map on every call is O(n) per operation, and using <code>System.currentTimeMillis()</code> directly forces tests to <code>sleep</code> — slow and flaky.</p>`,
      code: { lang: 'java', code: String.raw`
class ScanCache {
    private final Map<String, long[]> exp = new HashMap<>();        // key -> {expireAt}
    private final Map<String, String> vals = new HashMap<>();
    private void purge() {                                            // O(n) on EVERY call
        long now = System.currentTimeMillis();
        exp.entrySet().removeIf(e -> { boolean dead = now >= e.getValue()[0]; if (dead) vals.remove(e.getKey()); return dead; });
    }
    void put(String k, String v, long ttl) { purge(); vals.put(k, v); exp.put(k, new long[] { System.currentTimeMillis() + ttl }); }
    String get(String k) { purge(); return vals.get(k); }
    public static void main(String[] args) {
        ScanCache c = new ScanCache();
        c.put("a", "1", 1000);
        System.out.println(c.get("a"));                               // to test expiry we would have to sleep 1 s
    }
}`, alt: [{ lang: 'python', code: "import time\n\nclass ScanCache:\n    def __init__(self):\n        self.exp = {}                                              # key -> expire_at\n        self.vals = {}\n\n    def _purge(self):                                              # O(n) on EVERY call\n        now = time.time() * 1000\n        for k in [k for k, e in self.exp.items() if now >= e]:\n            del self.exp[k]; del self.vals[k]\n\n    def put(self, k, v, ttl):\n        self._purge(); self.vals[k] = v; self.exp[k] = time.time() * 1000 + ttl\n\n    def get(self, k):\n        self._purge(); return self.vals.get(k)\n\nif __name__ == \"__main__\":\n    c = ScanCache()\n    c.put(\"a\", \"1\", 1000)\n    print(c.get(\"a\"))                                              # to test expiry we would have to sleep 1 s\n" }, { lang: 'ts', code: "class ScanCache {\n  private exp = new Map<string, number>();                         // key -> expireAt\n  private vals = new Map<string, string>();\n  private purge(): void {                                          // O(n) on EVERY call\n    const now = Date.now();\n    for (const [k, e] of [...this.exp]) if (now >= e) { this.exp.delete(k); this.vals.delete(k); }\n  }\n  put(k: string, v: string, ttl: number): void { this.purge(); this.vals.set(k, v); this.exp.set(k, Date.now() + ttl); }\n  get(k: string): string | undefined { this.purge(); return this.vals.get(k); }\n}\nconst c = new ScanCache();\nc.put(\"a\", \"1\", 1000);\nconsole.log(c.get(\"a\"));                                           // to test expiry we would have to sleep 1 s\n" }, { lang: 'cpp', code: "class ScanCache {\n    unordered_map<string, long long> exp;                          // key -> expireAt\n    unordered_map<string, string> vals;\n    static long long nowMs() { return chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count(); }\n    void purge() {                                                 // O(n) on EVERY call\n        long long now = nowMs();\n        for (auto it = exp.begin(); it != exp.end();) {\n            if (now >= it->second) { vals.erase(it->first); it = exp.erase(it); } else ++it;\n        }\n    }\npublic:\n    void put(const string& k, const string& v, long long ttl) { purge(); vals[k] = v; exp[k] = nowMs() + ttl; }\n    string get(const string& k) { purge(); auto it = vals.find(k); return it == vals.end() ? \"null\" : it->second; }\n};\n\nint main() {\n    ScanCache c;\n    c.put(\"a\", \"1\", 1000);\n    cout << c.get(\"a\") << endl;                                    // to test expiry we would have to sleep 1 s\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nusing System.Linq;\nclass ScanCache {\n    private readonly Dictionary<string, long> exp = new Dictionary<string, long>();        // key -> expireAt\n    private readonly Dictionary<string, string> vals = new Dictionary<string, string>();\n    static long Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }\n    private void Purge() {                                            // O(n) on EVERY call\n        long now = Now();\n        foreach (string k in exp.Where(e => now >= e.Value).Select(e => e.Key).ToList()) { exp.Remove(k); vals.Remove(k); }\n    }\n    public void Put(string k, string v, long ttl) { Purge(); vals[k] = v; exp[k] = Now() + ttl; }\n    public string Get(string k) { Purge(); string v; return vals.TryGetValue(k, out v) ? v : null; }\n    static void Main() {\n        ScanCache c = new ScanCache();\n        c.Put(\"a\", \"1\", 1000);\n        Console.WriteLine(c.Get(\"a\"));                               // to test expiry we would have to sleep 1 s\n    }\n}\n" }] }
    },
    mcq: { q: 'Why store <code>expireAt = now + ttl</code> instead of <code>ttl</code>?', options: ['Checking becomes one comparison and does not drift as time passes', 'It uses less memory', 'The language requires it', 'It makes keys never expire'], answer: 0, explain: 'An absolute deadline is compared directly with the current time; a relative TTL would need its start time stored anyway.' },
    hints: [
      `<p>Define <code>interface Clock { long now(); }</code> and a <code>FakeClock</code> with <code>advance(ms)</code> for tests.</p>`,
      `<p>On <code>get</code>: if the entry exists and <code>now ≥ expireAt</code>, remove it and return null (lazy expiry). For <code>size()</code> keep a min-heap of (expireAt, key) and pop all due items first.</p>`,
      `<p>Edge cases: overwriting a key leaves a stale heap item — check the entry\'s expireAt matches before removing; ttl ≤ 0 means "no expiry"; expiry exactly at the boundary (≥, not &gt;).</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "1\nnull\n1\n5 2\n" }] },
    solution: {
      approach: `<p>A hash map of entries with absolute expiry; lazy removal on read; a min-heap to purge due keys before <code>size()</code>; injected clock.</p>`,
      code: String.raw`
interface Clock { long now(); }
class FakeClock implements Clock { long t; public long now() { return t; } void advance(long ms) { t += ms; } }

record Item(String value, long expireAt) { }
record Due(long at, String key) { }

class TtlCache {
    private final Map<String, Item> map = new HashMap<>();
    private final PriorityQueue<Due> heap = new PriorityQueue<>(Comparator.comparingLong(Due::at));
    private final Clock clock;
    TtlCache(Clock clock) { this.clock = clock; }

    void put(String k, String v, long ttl) {
        long at = ttl > 0 ? clock.now() + ttl : Long.MAX_VALUE;
        map.put(k, new Item(v, at));
        if (ttl > 0) heap.add(new Due(at, k));
    }
    String get(String k) {
        Item it = map.get(k);
        if (it == null) return null;
        if (clock.now() >= it.expireAt()) { map.remove(k); return null; }   // lazy expiry
        return it.value();
    }
    int size() {
        while (!heap.isEmpty() && heap.peek().at() <= clock.now()) {
            Due d = heap.poll();
            Item it = map.get(d.key());
            if (it != null && it.expireAt() == d.at()) map.remove(d.key());  // skip stale heap items
        }
        return map.size();
    }
    public static void main(String[] args) {
        FakeClock clock = new FakeClock();
        TtlCache c = new TtlCache(clock);
        c.put("a", "1", 1000);
        clock.advance(500);  System.out.println(c.get("a"));   // 1
        clock.advance(500);  System.out.println(c.get("a"));   // null
        c.put("b", "2", 100); c.put("c", "3", 0);
        clock.advance(200);  System.out.println(c.size());     // 1 (only c)
        c.put("d", "4", 50); c.put("d", "5", 500);             // overwrite: the first heap item is now stale
        clock.advance(100);
        System.out.println(c.get("d") + " " + c.size());       // 5 2
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
import heapq
import sys
from dataclasses import dataclass
from typing import Optional, Protocol


class Clock(Protocol):
    def now(self) -> int: ...


class FakeClock:
    def __init__(self) -> None:
        self.t = 0

    def now(self) -> int:
        return self.t

    def advance(self, ms: int) -> None:
        self.t += ms


@dataclass(frozen=True)
class Item:
    value: str
    expire_at: int


class TtlCache:
    def __init__(self, clock: Clock) -> None:
        self._map: dict[str, Item] = {}
        self._heap: list[tuple[int, str]] = []          # (expire_at, key)
        self._clock = clock

    def put(self, k: str, v: str, ttl: int) -> None:
        at = self._clock.now() + ttl if ttl > 0 else sys.maxsize
        self._map[k] = Item(v, at)
        if ttl > 0:
            heapq.heappush(self._heap, (at, k))

    def get(self, k: str) -> Optional[str]:
        it = self._map.get(k)
        if it is None:
            return None
        if self._clock.now() >= it.expire_at:           # lazy expiry
            del self._map[k]
            return None
        return it.value

    def size(self) -> int:
        while self._heap and self._heap[0][0] <= self._clock.now():
            at, key = heapq.heappop(self._heap)
            it = self._map.get(key)
            if it is not None and it.expire_at == at:   # skip stale heap items
                del self._map[key]
        return len(self._map)


def show(v: Optional[str]) -> str:
    return "null" if v is None else v


def main() -> None:
    clock = FakeClock()
    c = TtlCache(clock)
    c.put("a", "1", 1000)
    clock.advance(500)
    print(show(c.get("a")))                             # 1
    clock.advance(500)
    print(show(c.get("a")))                             # null
    c.put("b", "2", 100)
    c.put("c", "3", 0)
    clock.advance(200)
    print(c.size())                                     # 1 (only c)
    c.put("d", "4", 50)
    c.put("d", "5", 500)                                # overwrite: the first heap item is now stale
    clock.advance(100)
    print(f"{show(c.get('d'))} {c.size()}")             # 5 2


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
interface Clock { now(): number; }

class FakeClock implements Clock {
  t = 0;
  now(): number { return this.t; }
  advance(ms: number): void { this.t += ms; }
}

interface Item { readonly value: string; readonly expireAt: number; }
interface Due { readonly at: number; readonly key: string; }

// JavaScript has no built-in heap, so here is a small binary min-heap.
class MinHeap<T> {
  private readonly items: T[] = [];
  constructor(private readonly less: (a: T, b: T) => boolean) {}
  get size(): number { return this.items.length; }
  peek(): T | undefined { return this.items[0]; }
  push(x: T): void {
    const a = this.items;
    a.push(x);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop() as T;
    if (a.length > 0) {
      a[0] = last;
      for (let i = 0;;) {
        let m = i;
        const l = 2 * i + 1, r = l + 1;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class TtlCache {
  private readonly map = new Map<string, Item>();
  private readonly heap = new MinHeap<Due>((a, b) => a.at < b.at);
  constructor(private readonly clock: Clock) {}

  put(k: string, v: string, ttl: number): void {
    const at = ttl > 0 ? this.clock.now() + ttl : Infinity;
    this.map.set(k, { value: v, expireAt: at });
    if (ttl > 0) this.heap.push({ at, key: k });
  }
  get(k: string): string | null {
    const it = this.map.get(k);
    if (it === undefined) return null;
    if (this.clock.now() >= it.expireAt) { this.map.delete(k); return null; }   // lazy expiry
    return it.value;
  }
  size(): number {
    for (let d = this.heap.peek(); d !== undefined && d.at <= this.clock.now(); d = this.heap.peek()) {
      this.heap.pop();
      const it = this.map.get(d.key);
      if (it !== undefined && it.expireAt === d.at) this.map.delete(d.key);      // skip stale heap items
    }
    return this.map.size;
  }
}

const clock = new FakeClock();
const c = new TtlCache(clock);
c.put("a", "1", 1000);
clock.advance(500); console.log(c.get("a"));   // 1
clock.advance(500); console.log(c.get("a"));   // null
c.put("b", "2", 100); c.put("c", "3", 0);
clock.advance(200); console.log(c.size());     // 1 (only c)
c.put("d", "4", 50); c.put("d", "5", 500);     // overwrite: the first heap item is now stale
clock.advance(100);
console.log(c.get("d") + " " + c.size());      // 5 2` },
        { lang: 'cpp', code: String.raw`
class Clock {
public:
    virtual ~Clock() = default;
    virtual long long now() const = 0;
};

class FakeClock : public Clock {
public:
    long long t = 0;
    long long now() const override { return t; }
    void advance(long long ms) { t += ms; }
};

class TtlCache {
    struct Item { string value; long long expireAt; };
    struct Due {
        long long at;
        string key;
        bool operator>(const Due& o) const { return at > o.at; }
    };
    unordered_map<string, Item> map;
    priority_queue<Due, vector<Due>, greater<Due>> heap;       // min-heap (the default is a max-heap)
    const Clock& clock;
public:
    explicit TtlCache(const Clock& c) : clock(c) {}

    void put(const string& k, const string& v, long long ttl) {
        long long at = ttl > 0 ? clock.now() + ttl : numeric_limits<long long>::max();
        map[k] = {v, at};
        if (ttl > 0) heap.push({at, k});
    }
    optional<string> get(const string& k) {
        auto it = map.find(k);
        if (it == map.end()) return nullopt;
        if (clock.now() >= it->second.expireAt) { map.erase(it); return nullopt; }   // lazy expiry
        return it->second.value;
    }
    int size() {
        while (!heap.empty() && heap.top().at <= clock.now()) {
            Due d = heap.top();
            heap.pop();
            auto it = map.find(d.key);
            if (it != map.end() && it->second.expireAt == d.at) map.erase(it);        // skip stale heap items
        }
        return static_cast<int>(map.size());
    }
};

int main() {
    FakeClock clock;
    TtlCache c(clock);
    c.put("a", "1", 1000);
    clock.advance(500); cout << c.get("a").value_or("null") << "\n";   // 1
    clock.advance(500); cout << c.get("a").value_or("null") << "\n";   // null
    c.put("b", "2", 100); c.put("c", "3", 0);
    clock.advance(200); cout << c.size() << "\n";                      // 1 (only c)
    c.put("d", "4", 50); c.put("d", "5", 500);                         // overwrite: the first heap item is now stale
    clock.advance(100);
    cout << c.get("d").value_or("null") << " " << c.size() << "\n";    // 5 2
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IClock { long Now(); }
class FakeClock : IClock { long t; public long Now() { return t; } public void Advance(long ms) { t += ms; } }

sealed class Item { public readonly string Value; public readonly long ExpireAt; public Item(string v, long at) { Value = v; ExpireAt = at; } }

class TtlCache {
    private readonly Dictionary<string, Item> map = new Dictionary<string, Item>();
    private readonly SortedSet<Tuple<long, long, string>> heap = new SortedSet<Tuple<long, long, string>>();   // (due, seq, key): a min-heap
    private long seq = 0;
    private readonly IClock clock;
    public TtlCache(IClock clock) { this.clock = clock; }

    public void Put(string k, string v, long ttl) {
        long at = ttl > 0 ? clock.Now() + ttl : long.MaxValue;
        map[k] = new Item(v, at);
        if (ttl > 0) heap.Add(Tuple.Create(at, seq++, k));
    }
    public string Get(string k) {
        Item it;
        if (!map.TryGetValue(k, out it)) return null;
        if (clock.Now() >= it.ExpireAt) { map.Remove(k); return null; }   // lazy expiry
        return it.Value;
    }
    public int Size() {
        while (heap.Count > 0 && heap.Min.Item1 <= clock.Now()) {
            var d = heap.Min; heap.Remove(d);
            Item it;
            if (map.TryGetValue(d.Item3, out it) && it.ExpireAt == d.Item1) map.Remove(d.Item3);  // skip stale heap items
        }
        return map.Count;
    }
    static void Main() {
        FakeClock clock = new FakeClock();
        TtlCache c = new TtlCache(clock);
        c.Put("a", "1", 1000);
        clock.Advance(500);  Console.WriteLine(c.Get("a") ?? "null");   // 1
        clock.Advance(500);  Console.WriteLine(c.Get("a") ?? "null");   // null
        c.Put("b", "2", 100); c.Put("c", "3", 0);
        clock.Advance(200);  Console.WriteLine(c.Size());               // 1 (only c)
        c.Put("d", "4", 50); c.Put("d", "5", 500);                      // overwrite: the first heap item is now stale
        clock.Advance(100);
        Console.WriteLine(c.Get("d") + " " + c.Size());                 // 5 2
    }
}` }
      ],
      complexity: `<p>put O(log n) with TTL (heap), get O(1), size amortised O(k log n) for k expired items.</p>`,
      followUps: ['Add LRU eviction when size exceeds a limit.', 'Make it thread-safe without one global lock (lock striping).']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'SLF4J-Style Message Formatter with {} Placeholders',
    level: 'Medium', tags: ['logging', 'strings', 'formatter'], companies: ['Atlassian', 'Salesforce'],
    statement: `<p>Implement <code>format(pattern, args...)</code> (Java <code>Object... args</code>, Python <code>*args</code>, TypeScript <code>...args</code>): each <code>{}</code> is replaced by the next argument converted to text (<code>String.valueOf</code> in Java; a missing value prints as <code>null</code>); <code>\\{}</code> prints a literal <code>{}</code>; missing arguments leave <code>{}</code> as is; if the <b>last</b> argument is an exception (a Java <code>Throwable</code>) not used by a placeholder, append <code> | exception: Type: message</code>.</p>`,
    constraints: `<p>Pattern length ≤ 10<sup>4</sup>, arguments may contain any characters including <code>$</code> and <code>\\</code>. Must be O(length).</p>`,
    example: `${H.table(['Pattern / args', 'Output'], [['"user {} paid {}" / asha, $5', 'user asha paid $5'], ['"set \\\\{} to {}" / x', 'set {} to x'], ['"a {} b {}" / 1', 'a 1 b {}'], ['"failed {}" / 42, IOException("disk")', 'failed 42 | exception: IOException: disk']])}`,
    brute: {
      why: `<p>Looping a regex replace (<code>replaceFirst</code> / <code>re.sub</code> / <code>replace</code> / <code>regex_replace</code>) treats the pattern as a regex and the <b>replacement</b> as a template too: an argument like <code>$5</code> throws in Java (read as "insert regex group 5"), <code>\\5</code> throws in Python, <code>$&amp;</code> re-inserts the match in JavaScript and C++, and backslashes are eaten. Each call also rescans the whole string → O(length × args).</p>`,
      code: { lang: 'java', code: String.raw`
class RegexFormat {
    static String format(String p, Object... args) {
        for (Object a : args) p = p.replaceFirst("\\{\\}", String.valueOf(a));   // regex replacement!
        return p;
    }
    public static void main(String[] args) {
        System.out.println(format("user {} paid {}", "asha", "5"));
        try { System.out.println(format("user {} paid {}", "asha", "$5")); }
        catch (RuntimeException e) { System.out.println("crash: " + e); }   // "No group 5"
    }
}`, alt: [{ lang: 'python', code: "import re\n\nclass RegexFormat:\n    @staticmethod\n    def format(p, *args):\n        for a in args:\n            p = re.sub(r\"\\{\\}\", str(a), p, count=1)          # regex replacement!\n        return p\n\nif __name__ == \"__main__\":\n    print(RegexFormat.format(\"user {} paid {}\", \"asha\", \"5\"))\n    try: print(RegexFormat.format(\"user {} paid {}\", \"asha\", r\"\\5\"))\n    except Exception as e: print(\"crash:\", e)                 # \"invalid group reference 5\"\n" }, { lang: 'ts', code: "class RegexFormat {\n  static format(p: string, ...args: unknown[]): string {\n    for (const a of args) p = p.replace(/\\{\\}/, String(a));    // regex replacement!\n    return p;\n  }\n}\nconsole.log(RegexFormat.format(\"user {} paid {}\", \"asha\", \"5\"));\nconsole.log(RegexFormat.format(\"user {} paid {}\", \"asha\", \"$&\"));   // \"$&\" is a template: inserts the matched \"{}\" again\n" }, { lang: 'cpp', code: "struct RegexFormat {\n    static string format(string p, const vector<string>& args) {\n        for (const string& a : args)\n            p = regex_replace(p, regex(\"\\\\{\\\\}\"), a, regex_constants::format_first_only);   // regex replacement!\n        return p;\n    }\n};\n\nint main() {\n    cout << RegexFormat::format(\"user {} paid {}\", {\"asha\", \"5\"}) << endl;\n    cout << RegexFormat::format(\"user {} paid {}\", {\"asha\", \"$&\"}) << endl;   // \"$&\" is a template: inserts the matched \"{}\" again\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Text.RegularExpressions;\nstatic class RegexFormat {\n    public static string Format(string p, params object[] args) {\n        foreach (object a in args) p = new Regex(\"\\\\{\\\\}\").Replace(p, a.ToString(), 1);   // regex replacement: \"$1\"-style tokens are interpreted!\n        return p;\n    }\n    static void Main() {\n        Console.WriteLine(Format(\"user {} paid {}\", \"asha\", \"5\"));\n        Console.WriteLine(Format(\"user {} paid {}\", \"asha\", \"$0\"));   // \"$0\" is replaced by the matched text: prints \"{}\" instead of \"$0\"\n    }\n}\n" }] }
    },
    mcq: { q: 'Why do logging APIs prefer <code>log.debug("x={}", x)</code> over <code>log.debug("x=" + x)</code>?', options: ['Formatting happens only if DEBUG is enabled', 'It is shorter to type', 'The language requires it', 'It makes logs JSON'], answer: 0, explain: 'With concatenation the string is built before the call even if the line is then dropped; with placeholders the work happens after the level check.' },
    hints: [
      `<p>Scan the pattern once with an index and a <code>StringBuilder</code>. At each position check for <code>\\{}</code> (escape) and <code>{}</code> (placeholder).</p>`,
      `<p>Track how many arguments you used. After the scan, if the last argument is a Throwable and was not consumed, append its class simple name and message.</p>`,
      `<p>Edge cases: null args print "null", arrays (print their elements, e.g. <code>Arrays.toString</code> in Java), a lone <code>{</code>, pattern ending in a backslash. Never interpret argument text — that is the Log4Shell lesson.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "user asha paid $5\nset {} to x\na 1 b {}\nfailed 42 | exception: IOException: disk\nids [1, 2]\nempty {} and {}\n" }] },
    solution: {
      approach: `<p>Single left-to-right scan; escapes and placeholders handled by <code>startsWith</code> at the current index; arguments appended verbatim, never re-parsed; a trailing unused Throwable is reported.</p>`,
      code: String.raw`
class MessageFormatter {
    static String format(String pattern, Object... args) {
        StringBuilder sb = new StringBuilder(pattern.length() + 16);
        int used = 0, i = 0;
        while (i < pattern.length()) {
            if (pattern.startsWith("\\{}", i)) { sb.append("{}"); i += 3; }                 // escaped literal
            else if (pattern.startsWith("{}", i) && used < args.length) { sb.append(str(args[used++])); i += 2; }
            else sb.append(pattern.charAt(i++));
        }
        if (args.length > used && args[args.length - 1] instanceof Throwable t)
            sb.append(" | exception: ").append(t.getClass().getSimpleName()).append(": ").append(t.getMessage());
        return sb.toString();
    }
    private static String str(Object o) { return o instanceof Object[] arr ? Arrays.toString(arr) : String.valueOf(o); }

    public static void main(String[] args) {
        System.out.println(format("user {} paid {}", "asha", "$5"));
        System.out.println(format("set \\{} to {}", "x"));
        System.out.println(format("a {} b {}", 1));
        System.out.println(format("failed {}", 42, new IOException("disk")));
        System.out.println(format("ids {}", (Object) new Integer[] {1, 2}));
        System.out.println(format("empty {} and {}"));
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
class IOException(Exception):
    pass


def to_text(o: object) -> str:
    if o is None:
        return "null"
    if isinstance(o, (list, tuple)):                     # Java's Object[] is printed element by element
        return "[" + ", ".join(to_text(x) for x in o) + "]"
    return str(o)


class MessageFormatter:
    @staticmethod
    def format(pattern: str, *args: object) -> str:
        out: list[str] = []
        used = i = 0
        while i < len(pattern):
            if pattern.startswith("\\{}", i):            # escaped literal
                out.append("{}")
                i += 3
            elif pattern.startswith("{}", i) and used < len(args):
                out.append(to_text(args[used]))
                used += 1
                i += 2
            else:
                out.append(pattern[i])
                i += 1
        if len(args) > used and isinstance(args[-1], BaseException):
            t = args[-1]
            out.append(f" | exception: {type(t).__name__}: {t}")
        return "".join(out)


def main() -> None:
    print(MessageFormatter.format("user {} paid {}", "asha", "$5"))
    print(MessageFormatter.format("set \\{} to {}", "x"))
    print(MessageFormatter.format("a {} b {}", 1))
    print(MessageFormatter.format("failed {}", 42, IOException("disk")))
    print(MessageFormatter.format("ids {}", [1, 2]))
    print(MessageFormatter.format("empty {} and {}"))


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
class IOException extends Error {}

function toText(o: unknown): string {
  if (Array.isArray(o)) return "[" + o.map(toText).join(", ") + "]";   // Java's Object[] is printed element by element
  return String(o);
}

class MessageFormatter {
  static format(pattern: string, ...args: unknown[]): string {
    let out = "";
    let used = 0;
    let i = 0;
    while (i < pattern.length) {
      if (pattern.startsWith("\\{}", i)) { out += "{}"; i += 3; }                      // escaped literal
      else if (pattern.startsWith("{}", i) && used < args.length) { out += toText(args[used++]); i += 2; }
      else out += pattern[i++];
    }
    const last = args[args.length - 1];
    if (args.length > used && last instanceof Error) out += " | exception: " + last.constructor.name + ": " + last.message;
    return out;
  }
}

console.log(MessageFormatter.format("user {} paid {}", "asha", "$5"));
console.log(MessageFormatter.format("set \\{} to {}", "x"));
console.log(MessageFormatter.format("a {} b {}", 1));
console.log(MessageFormatter.format("failed {}", 42, new IOException("disk")));
console.log(MessageFormatter.format("ids {}", [1, 2]));
console.log(MessageFormatter.format("empty {} and {}"));` },
        { lang: 'cpp', code: String.raw`
struct Throwable : runtime_error {
    using runtime_error::runtime_error;
    virtual string type() const { return "Throwable"; }
};
struct IOException : Throwable {
    using Throwable::Throwable;
    string type() const override { return "IOException"; }
};

using Arg = variant<int, string, vector<int>, shared_ptr<const Throwable>>;

string toText(const Arg& a) {
    if (auto* n = get_if<int>(&a)) return to_string(*n);
    if (auto* s = get_if<string>(&a)) return *s;
    if (auto* v = get_if<vector<int>>(&a)) {                 // Java's Object[] is printed element by element
        string out = "[";
        for (size_t i = 0; i < v->size(); i++) out += (i ? ", " : "") + to_string((*v)[i]);
        return out + "]";
    }
    return "<exception>";
}

class MessageFormatter {
public:
    static string format(const string& pattern, const vector<Arg>& args = {}) {
        string out;
        size_t used = 0, i = 0;
        while (i < pattern.size()) {
            if (pattern.compare(i, 3, "\\{}") == 0) { out += "{}"; i += 3; }                  // escaped literal
            else if (pattern.compare(i, 2, "{}") == 0 && used < args.size()) { out += toText(args[used++]); i += 2; }
            else out += pattern[i++];
        }
        if (args.size() > used)
            if (auto* t = get_if<shared_ptr<const Throwable>>(&args.back()))
                out += " | exception: " + (*t)->type() + ": " + (*t)->what();
        return out;
    }
};

int main() {
    cout << MessageFormatter::format("user {} paid {}", {string("asha"), string("$5")}) << "\n";
    cout << MessageFormatter::format("set \\{} to {}", {string("x")}) << "\n";
    cout << MessageFormatter::format("a {} b {}", {1}) << "\n";
    cout << MessageFormatter::format("failed {}", {42, shared_ptr<const Throwable>(make_shared<IOException>("disk"))}) << "\n";
    cout << MessageFormatter::format("ids {}", {vector<int>{1, 2}}) << "\n";
    cout << MessageFormatter::format("empty {} and {}") << "\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.IO;
using System.Text;

static class MessageFormatter {
    public static string Format(string pattern, params object[] args) {
        StringBuilder sb = new StringBuilder(pattern.Length + 16);
        int used = 0, i = 0;
        while (i < pattern.Length) {
            if (string.CompareOrdinal(pattern, i, "\\\\{}", 0, 3) == 0) { sb.Append("{}"); i += 3; }                 // escaped literal
            else if (string.CompareOrdinal(pattern, i, "{}", 0, 2) == 0 && used < args.Length) { sb.Append(Str(args[used++])); i += 2; }
            else sb.Append(pattern[i++]);
        }
        Exception t = args.Length > used ? args[args.Length - 1] as Exception : null;
        if (t != null) sb.Append(" | exception: ").Append(t.GetType().Name).Append(": ").Append(t.Message);
        return sb.ToString();
    }
    private static string Str(object o) {
        object[] arr = o as object[];
        return arr != null ? "[" + string.Join(", ", arr) + "]" : (o == null ? "null" : o.ToString());
    }

    static void Main() {
        Console.WriteLine(Format("user {} paid {}", "asha", "$5"));
        Console.WriteLine(Format("set \\\\{} to {}", "x"));
        Console.WriteLine(Format("a {} b {}", 1));
        Console.WriteLine(Format("failed {}", 42, new IOException("disk")));
        Console.WriteLine(Format("ids {}", (object)new object[] { 1, 2 }));
        Console.WriteLine(Format("empty {} and {}"));
    }
}` }
      ],
      complexity: `<p>O(L + total argument length). No regex, no re-scanning.</p>`,
      followUps: ['Add lazy arguments (a Java <code>Supplier</code>, a lambda elsewhere) evaluated only when formatting happens.', 'Mask values whose key looks like "password" or a 16-digit card number.']
    }
  });

  practice.push({
    title: 'Rolling File Appender (rotate by size, keep last K files)',
    level: 'Medium', tags: ['logging', 'appender', 'deque'], companies: ['Microsoft', 'Oracle'],
    statement: `<p>Build an appender that writes lines to <code>app.log</code>. When the current file reaches <code>maxLines</code>, it is rotated: <code>app.log</code> → <code>app.log.1</code>, the old <code>.1</code> → <code>.2</code>, and so on; only the newest <code>maxBackups</code> rotated files are kept. Simulate files in memory and expose <code>files()</code> (name → lines).</p>`,
    constraints: `<p>maxLines ≥ 1, 0 ≤ maxBackups ≤ 100, up to 10<sup>6</sup> lines. Each append must be O(1) amortised (no copying of old files on every rotation).</p>`,
    example: `<p>maxLines = 2, maxBackups = 2, append L1..L7:</p>${H.kv([['app.log', '[L7]'], ['app.log.1', '[L5, L6]'], ['app.log.2', '[L3, L4]']], { label: 'files' })}<p>[L1, L2] was deleted at the third rotation.</p>`,
    brute: {
      why: `<p>One ever-growing file fills the disk; "rotating" by clearing the file loses all history. Renaming by copying every backup\'s content on each rotation costs O(maxBackups × maxLines) per rotation.</p>`,
      code: { lang: 'java', code: String.raw`
class TruncatingAppender {
    final List<String> file = new ArrayList<>();
    final int maxLines;
    TruncatingAppender(int maxLines) { this.maxLines = maxLines; }
    void append(String line) {
        if (file.size() >= maxLines) file.clear();          // "rotation" = lose everything
        file.add(line);
    }
    public static void main(String[] args) {
        TruncatingAppender a = new TruncatingAppender(2);
        for (int i = 1; i <= 7; i++) a.append("L" + i);
        System.out.println(a.file);                           // [L7] — L1..L6 gone forever
    }
}`, alt: [{ lang: 'python', code: "class TruncatingAppender:\n    def __init__(self, max_lines):\n        self.file = []\n        self.max_lines = max_lines\n\n    def append(self, line):\n        if len(self.file) >= self.max_lines: self.file.clear()   # \"rotation\" = lose everything\n        self.file.append(line)\n\nif __name__ == \"__main__\":\n    a = TruncatingAppender(2)\n    for i in range(1, 8): a.append(f\"L{i}\")\n    print(a.file)                                               # ['L7'] - L1..L6 gone forever\n" }, { lang: 'ts', code: "class TruncatingAppender {\n  file: string[] = [];\n  constructor(private maxLines: number) {}\n  append(line: string): void {\n    if (this.file.length >= this.maxLines) this.file = [];     // \"rotation\" = lose everything\n    this.file.push(line);\n  }\n}\nconst a = new TruncatingAppender(2);\nfor (let i = 1; i <= 7; i++) a.append(\"L\" + i);\nconsole.log(a.file);                                            // [ 'L7' ] - L1..L6 gone forever\n" }, { lang: 'cpp', code: "class TruncatingAppender {\n    int maxLines;\npublic:\n    vector<string> file;\n    TruncatingAppender(int maxLines) : maxLines(maxLines) {}\n    void append(const string& line) {\n        if ((int)file.size() >= maxLines) file.clear();         // \"rotation\" = lose everything\n        file.push_back(line);\n    }\n};\n\nint main() {\n    TruncatingAppender a(2);\n    for (int i = 1; i <= 7; i++) a.append(\"L\" + to_string(i));\n    for (auto& l : a.file) cout << l << \" \";                    // L7 - L1..L6 gone forever\n    cout << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nclass TruncatingAppender {\n    public readonly List<string> File = new List<string>();\n    readonly int maxLines;\n    public TruncatingAppender(int maxLines) { this.maxLines = maxLines; }\n    public void Append(string line) {\n        if (File.Count >= maxLines) File.Clear();          // \"rotation\" = lose everything\n        File.Add(line);\n    }\n    static void Main() {\n        TruncatingAppender a = new TruncatingAppender(2);\n        for (int i = 1; i <= 7; i++) a.Append(\"L\" + i);\n        Console.WriteLine(\"[\" + string.Join(\", \", a.File) + \"]\");   // [L7] - L1..L6 gone forever\n    }\n}\n" }] }
    },
    mcq: { q: 'Which structure makes "shift .1→.2→.3 and drop the oldest" O(1)?', options: ['A Deque of backups: addFirst the current file, pollLast when too many', 'An array copied on every rotation', 'A hash map keyed by file name rebuilt each time', 'A TreeMap sorted by size'], answer: 0, explain: 'The rotated files are a sliding window of the most recent K; a Deque gives O(1) push-front and pop-back. Names are derived from position when listing.' },
    hints: [
      `<p>Keep the current file as a list and the rotated files in a deque of lists (<code>Deque&lt;List&lt;String&gt;&gt;</code>, <code>collections.deque</code>, <code>std::deque</code>; a JavaScript array with <code>unshift</code>), newest first.</p>`,
      `<p>On append: if current is full, <code>addFirst(current)</code>, start a new list, and <code>pollLast()</code> while the deque has more than maxBackups.</p>`,
      `<p>Derive names only when listing: index i in the deque → <code>app.log.(i+1)</code>. Edge cases: maxBackups = 0 (just start fresh), thread safety (lock the append), time-based rotation as a follow-up.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "{app.log=[L7], app.log.1=[L5, L6], app.log.2=[L3, L4]}\n{app.log=[L5]} {app.log=[]}\n" }] },
    solution: {
      approach: `<p>Current file + bounded deque of backups. Rotation is two O(1) deque operations; names are computed on read, which is how real appenders avoid renaming loops being part of the hot path (they rename on disk once per rotation).</p>`,
      code: String.raw`
class RollingAppender {
    private final int maxLines, maxBackups;
    private List<String> current = new ArrayList<>();
    private final Deque<List<String>> backups = new ArrayDeque<>();   // newest first

    RollingAppender(int maxLines, int maxBackups) { this.maxLines = maxLines; this.maxBackups = maxBackups; }

    synchronized void append(String line) {
        if (current.size() >= maxLines) rotate();
        current.add(line);
    }
    private void rotate() {
        if (maxBackups > 0) backups.addFirst(current);
        while (backups.size() > maxBackups) backups.pollLast();        // delete the oldest
        current = new ArrayList<>();
    }
    synchronized Map<String, List<String>> files() {
        Map<String, List<String>> out = new LinkedHashMap<>();
        out.put("app.log", List.copyOf(current));
        int i = 1;
        for (List<String> b : backups) out.put("app.log." + i++, List.copyOf(b));
        return out;
    }
    public static void main(String[] args) {
        RollingAppender a = new RollingAppender(2, 2);
        for (int i = 1; i <= 7; i++) a.append("L" + i);
        System.out.println(a.files());   // {app.log=[L7], app.log.1=[L5, L6], app.log.2=[L3, L4]}
        RollingAppender noBackups = new RollingAppender(2, 0);   // maxBackups = 0: rotation just starts fresh
        for (int i = 1; i <= 5; i++) noBackups.append("L" + i);
        System.out.println(noBackups.files() + " " + new RollingAppender(2, 1).files());   // {app.log=[L5]} {app.log=[]}
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
import threading
from collections import deque


def show_list(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def show_files(files: dict[str, list[str]]) -> str:
    return "{" + ", ".join(f"{name}={show_list(lines)}" for name, lines in files.items()) + "}"


class RollingAppender:
    def __init__(self, max_lines: int, max_backups: int) -> None:
        self._max_lines = max_lines
        self._max_backups = max_backups
        self._current: list[str] = []
        self._backups: deque[list[str]] = deque()       # newest first
        self._lock = threading.Lock()

    def append(self, line: str) -> None:
        with self._lock:
            if len(self._current) >= self._max_lines:
                self._rotate()
            self._current.append(line)

    def _rotate(self) -> None:
        if self._max_backups > 0:
            self._backups.appendleft(self._current)
        while len(self._backups) > self._max_backups:
            self._backups.pop()                         # delete the oldest
        self._current = []

    def files(self) -> dict[str, list[str]]:
        with self._lock:
            out = {"app.log": list(self._current)}
            for i, b in enumerate(self._backups, start=1):
                out[f"app.log.{i}"] = list(b)
            return out


def main() -> None:
    a = RollingAppender(2, 2)
    for i in range(1, 8):
        a.append(f"L{i}")
    print(show_files(a.files()))                        # {app.log=[L7], app.log.1=[L5, L6], app.log.2=[L3, L4]}
    no_backups = RollingAppender(2, 0)                  # max_backups = 0: rotation just starts fresh
    for i in range(1, 6):
        no_backups.append(f"L{i}")
    print(show_files(no_backups.files()), show_files(RollingAppender(2, 1).files()))   # {app.log=[L5]} {app.log=[]}


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
const showList = (items: string[]): string => "[" + items.join(", ") + "]";
const showFiles = (files: Map<string, string[]>): string =>
  "{" + [...files].map(([name, lines]) => name + "=" + showList(lines)).join(", ") + "}";

class RollingAppender {
  private current: string[] = [];
  private readonly backups: string[][] = [];             // newest first

  constructor(private readonly maxLines: number, private readonly maxBackups: number) {}

  append(line: string): void {
    if (this.current.length >= this.maxLines) this.rotate();
    this.current.push(line);
  }
  private rotate(): void {
    if (this.maxBackups > 0) this.backups.unshift(this.current);
    while (this.backups.length > this.maxBackups) this.backups.pop();   // delete the oldest
    this.current = [];
  }
  files(): Map<string, string[]> {
    const out = new Map<string, string[]>([["app.log", [...this.current]]]);
    this.backups.forEach((b, i) => out.set("app.log." + (i + 1), [...b]));
    return out;
  }
}

const a = new RollingAppender(2, 2);
for (let i = 1; i <= 7; i++) a.append("L" + i);
console.log(showFiles(a.files()));                       // {app.log=[L7], app.log.1=[L5, L6], app.log.2=[L3, L4]}
const noBackups = new RollingAppender(2, 0);             // maxBackups = 0: rotation just starts fresh
for (let i = 1; i <= 5; i++) noBackups.append("L" + i);
console.log(showFiles(noBackups.files()) + " " + showFiles(new RollingAppender(2, 1).files()));   // {app.log=[L5]} {app.log=[]}` },
        { lang: 'cpp', code: String.raw`
string showList(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}
string showFiles(const vector<pair<string, vector<string>>>& files) {
    string out = "{";
    for (size_t i = 0; i < files.size(); i++) out += (i ? ", " : "") + files[i].first + "=" + showList(files[i].second);
    return out + "}";
}

class RollingAppender {
    const size_t maxLines, maxBackups;
    vector<string> current;
    deque<vector<string>> backups;                        // newest first
    mutex mu;

    void rotate() {
        if (maxBackups > 0) backups.push_front(move(current));
        while (backups.size() > maxBackups) backups.pop_back();   // delete the oldest
        current.clear();                                  // a moved-from vector must be reset before reuse
    }
public:
    RollingAppender(size_t lines, size_t keep) : maxLines(lines), maxBackups(keep) {}

    void append(const string& line) {
        lock_guard<mutex> lock(mu);
        if (current.size() >= maxLines) rotate();
        current.push_back(line);
    }
    vector<pair<string, vector<string>>> files() {
        lock_guard<mutex> lock(mu);
        vector<pair<string, vector<string>>> out{{"app.log", current}};
        for (size_t i = 0; i < backups.size(); i++) out.push_back({"app.log." + to_string(i + 1), backups[i]});
        return out;
    }
};

int main() {
    RollingAppender a(2, 2);
    for (int i = 1; i <= 7; i++) a.append("L" + to_string(i));
    cout << showFiles(a.files()) << "\n";                 // {app.log=[L7], app.log.1=[L5, L6], app.log.2=[L3, L4]}
    RollingAppender noBackups(2, 0);                      // maxBackups = 0: rotation just starts fresh
    for (int i = 1; i <= 5; i++) noBackups.append("L" + to_string(i));
    cout << showFiles(noBackups.files()) << " " << showFiles(RollingAppender(2, 1).files()) << "\n";   // {app.log=[L5]} {app.log=[]}
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class RollingAppender {
    private readonly int maxLines, maxBackups;
    private List<string> current = new List<string>();
    private readonly LinkedList<List<string>> backups = new LinkedList<List<string>>();   // newest first
    private readonly object gate = new object();

    public RollingAppender(int maxLines, int maxBackups) { this.maxLines = maxLines; this.maxBackups = maxBackups; }

    public void Append(string line) {
        lock (gate) {
            if (current.Count >= maxLines) Rotate();
            current.Add(line);
        }
    }
    private void Rotate() {
        if (maxBackups > 0) backups.AddFirst(current);
        while (backups.Count > maxBackups) backups.RemoveLast();        // delete the oldest
        current = new List<string>();
    }
    public List<KeyValuePair<string, List<string>>> Files() {
        lock (gate) {
            var result = new List<KeyValuePair<string, List<string>>>();
            result.Add(new KeyValuePair<string, List<string>>("app.log", new List<string>(current)));
            int i = 1;
            foreach (List<string> b in backups) result.Add(new KeyValuePair<string, List<string>>("app.log." + i++, new List<string>(b)));
            return result;
        }
    }
    static string Show(List<KeyValuePair<string, List<string>>> f) { return "{" + string.Join(", ", f.Select(kv => kv.Key + "=[" + string.Join(", ", kv.Value) + "]")) + "}"; }
    static void Main() {
        RollingAppender a = new RollingAppender(2, 2);
        for (int i = 1; i <= 7; i++) a.Append("L" + i);
        Console.WriteLine(Show(a.Files()));   // {app.log=[L7], app.log.1=[L5, L6], app.log.2=[L3, L4]}
        RollingAppender noBackups = new RollingAppender(2, 0);   // maxBackups = 0: rotation just starts fresh
        for (int i = 1; i <= 5; i++) noBackups.Append("L" + i);
        Console.WriteLine(Show(noBackups.Files()) + " " + Show(new RollingAppender(2, 1).Files()));   // {app.log=[L5]} {app.log=[]}
    }
}` }
      ],
      complexity: `<p>append O(1) amortised; rotation O(1); listing O(total lines kept).</p>`,
      followUps: ['Rotate daily as well as by size (two triggering policies — Strategy).', 'Compress backups in a background thread.']
    }
  });

  practice.push({
    title: 'Consumer Group Assignment: Range vs Round-Robin',
    level: 'Medium', tags: ['pub-sub', 'kafka', 'rebalance'], companies: ['Confluent', 'Uber', 'Walmart'],
    statement: `<p>Given consumer ids (sort them first) and a partition count P, compute two assignments: <b>range</b> (contiguous chunks; the first <code>P % C</code> consumers get one extra) and <b>round-robin</b> (deal partitions like cards). Every partition must go to exactly one consumer.</p>`,
    constraints: `<p>1 ≤ C ≤ 1000, 0 ≤ P ≤ 10<sup>5</sup>. O(P + C log C).</p>`,
    example: `<p>Consumers [c1, c2, c3], P = 7:</p>${H.table(['Strategy', 'c1', 'c2', 'c3'], [['range', '0, 1, 2', '3, 4', '5, 6'], ['round-robin', '0, 3, 6', '1, 4', '2, 5']])}`,
    brute: {
      why: `<p>Letting every consumer read every partition means each message is processed C times (duplicate charges, duplicate emails). Assigning randomly can leave partitions unowned (lost messages) or doubly owned.</p>`,
      code: { lang: 'java', code: String.raw`
class EveryoneReadsAll {
    public static void main(String[] args) {
        List<String> consumers = List.of("c1", "c2", "c3");
        int partitions = 7, processed = 0;
        for (String c : consumers) for (int p = 0; p < partitions; p++) processed++;   // each reads all
        System.out.println("each message processed " + processed / partitions + " times");  // 3
    }
}`, alt: [{ lang: 'python', code: "if __name__ == \"__main__\":\n    consumers = [\"c1\", \"c2\", \"c3\"]\n    partitions, processed = 7, 0\n    for c in consumers:\n        for p in range(partitions): processed += 1             # each reads all\n    print(f\"each message processed {processed // partitions} times\")   # 3\n" }, { lang: 'ts', code: "const consumers = [\"c1\", \"c2\", \"c3\"];\nconst partitions = 7;\nlet processed = 0;\nfor (const c of consumers) for (let p = 0; p < partitions; p++) processed++;   // each reads all\nconsole.log(\"each message processed \" + Math.floor(processed / partitions) + \" times\");   // 3\n" }, { lang: 'cpp', code: "int main() {\n    vector<string> consumers = {\"c1\", \"c2\", \"c3\"};\n    int partitions = 7, processed = 0;\n    for (auto& c : consumers) for (int p = 0; p < partitions; p++) processed++;   // each reads all\n    cout << \"each message processed \" << processed / partitions << \" times\" << endl;   // 3\n}\n" }, { lang: 'csharp', code: "using System;\nclass EveryoneReadsAll {\n    static void Main() {\n        string[] consumers = { \"c1\", \"c2\", \"c3\" };\n        int partitions = 7, processed = 0;\n        foreach (string c in consumers) for (int p = 0; p < partitions; p++) processed++;   // each reads all\n        Console.WriteLine(\"each message processed \" + processed / partitions + \" times\");    // 3\n    }\n}\n" }] }
    },
    mcq: { q: 'Group has 3 consumers and the topic has 2 partitions. What happens?', options: ['One consumer is idle', 'Partitions are split into halves', 'Two consumers share a partition and both get every message', 'The group refuses to start'], answer: 0, explain: 'Inside a group a partition has exactly one owner, so partitions cap the parallelism.' },
    hints: [
      `<p>Sort consumer ids so every member computes the same answer (assignment must be deterministic).</p>`,
      `<p>Range: base = P / C, extra = P % C; consumer i gets base + (i &lt; extra ? 1 : 0) partitions starting where the previous one ended. Round-robin: partition p → consumer p % C.</p>`,
      `<p>Discuss: with many topics, range assigns per topic so c1 gets the extra partition of <i>every</i> topic (skew); round-robin over all topic-partitions balances better; cooperative-sticky minimises movement on rebalance.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "{c1=[0, 1, 2], c2=[3, 4], c3=[5, 6]}\n{c1=[0, 3, 6], c2=[1, 4], c3=[2, 5]}\n{a=[0], b=[1], c=[]}\n{a=[], b=[]}\n" }] },
    solution: {
      approach: `<p>Deterministic arithmetic on sorted ids for range; modulo dealing for round-robin. Both are pure functions — easy to test and identical on every member.</p>`,
      code: String.raw`
class Assignors {
    static Map<String, List<Integer>> range(List<String> consumers, int partitions) {
        List<String> cs = new ArrayList<>(consumers); Collections.sort(cs);
        Map<String, List<Integer>> out = new LinkedHashMap<>();
        int base = partitions / cs.size(), extra = partitions % cs.size(), p = 0;
        for (int i = 0; i < cs.size(); i++) {
            List<Integer> mine = new ArrayList<>();
            int n = base + (i < extra ? 1 : 0);
            for (int k = 0; k < n; k++) mine.add(p++);
            out.put(cs.get(i), mine);
        }
        return out;
    }
    static Map<String, List<Integer>> roundRobin(List<String> consumers, int partitions) {
        List<String> cs = new ArrayList<>(consumers); Collections.sort(cs);
        Map<String, List<Integer>> out = new LinkedHashMap<>();
        cs.forEach(c -> out.put(c, new ArrayList<>()));
        for (int p = 0; p < partitions; p++) out.get(cs.get(p % cs.size())).add(p);
        return out;
    }
    public static void main(String[] args) {
        List<String> cs = List.of("c3", "c1", "c2");
        System.out.println(range(cs, 7));        // {c1=[0, 1, 2], c2=[3, 4], c3=[5, 6]}
        System.out.println(roundRobin(cs, 7));   // {c1=[0, 3, 6], c2=[1, 4], c3=[2, 5]}
        System.out.println(range(List.of("a", "b", "c"), 2));   // c idle
        System.out.println(roundRobin(List.of("a", "b"), 0));   // no partitions: nobody gets anything
    }
}`,
    alt: [
        { lang: 'python', code: `
Assignment = dict[str, list[int]]


def show(a: Assignment) -> str:
    return "{" + ", ".join(f"{c}={ps}" for c, ps in a.items()) + "}"


class Assignors:
    @staticmethod
    def range(consumers: list[str], partitions: int) -> Assignment:
        cs = sorted(consumers)
        base, extra = divmod(partitions, len(cs))
        out: Assignment = {}
        p = 0
        for i, c in enumerate(cs):
            n = base + (1 if i < extra else 0)           # the first \`extra\` consumers get one more
            out[c] = list(range(p, p + n))
            p += n
        return out

    @staticmethod
    def round_robin(consumers: list[str], partitions: int) -> Assignment:
        cs = sorted(consumers)
        out: Assignment = {c: [] for c in cs}
        for p in range(partitions):
            out[cs[p % len(cs)]].append(p)               # deal like cards
        return out


def main() -> None:
    cs = ["c3", "c1", "c2"]
    print(show(Assignors.range(cs, 7)))                  # {c1=[0, 1, 2], c2=[3, 4], c3=[5, 6]}
    print(show(Assignors.round_robin(cs, 7)))            # {c1=[0, 3, 6], c2=[1, 4], c3=[2, 5]}
    print(show(Assignors.range(["a", "b", "c"], 2)))     # c idle
    print(show(Assignors.round_robin(["a", "b"], 0)))    # no partitions: nobody gets anything


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
type Assignment = Map<string, number[]>;

const show = (a: Assignment): string =>
  "{" + [...a].map(([c, ps]) => c + "=[" + ps.join(", ") + "]").join(", ") + "}";

class Assignors {
  static range(consumers: string[], partitions: number): Assignment {
    const cs = [...consumers].sort();                    // strings: the default sort is lexicographic
    const base = Math.floor(partitions / cs.length), extra = partitions % cs.length;
    const out: Assignment = new Map();
    let p = 0;
    cs.forEach((c, i) => {
      const n = base + (i < extra ? 1 : 0);              // the first \`extra\` consumers get one more
      out.set(c, Array.from({ length: n }, () => p++));
    });
    return out;
  }

  static roundRobin(consumers: string[], partitions: number): Assignment {
    const cs = [...consumers].sort();
    const out: Assignment = new Map(cs.map((c): [string, number[]] => [c, []]));
    for (let p = 0; p < partitions; p++) out.get(cs[p % cs.length])!.push(p);   // deal like cards
    return out;
  }
}

const cs = ["c3", "c1", "c2"];
console.log(show(Assignors.range(cs, 7)));               // {c1=[0, 1, 2], c2=[3, 4], c3=[5, 6]}
console.log(show(Assignors.roundRobin(cs, 7)));          // {c1=[0, 3, 6], c2=[1, 4], c3=[2, 5]}
console.log(show(Assignors.range(["a", "b", "c"], 2)));  // c idle
console.log(show(Assignors.roundRobin(["a", "b"], 0)));  // no partitions: nobody gets anything` },
        { lang: 'cpp', code: `
using Assignment = vector<pair<string, vector<int>>>;     // consumers in sorted order

string show(const Assignment& a) {
    string out = "{";
    for (size_t i = 0; i < a.size(); i++) {
        out += (i ? ", " : "") + a[i].first + "=[";
        for (size_t k = 0; k < a[i].second.size(); k++) out += (k ? ", " : "") + to_string(a[i].second[k]);
        out += "]";
    }
    return out + "}";
}

class Assignors {
public:
    static Assignment range(vector<string> consumers, int partitions) {
        sort(consumers.begin(), consumers.end());
        int c = static_cast<int>(consumers.size()), base = partitions / c, extra = partitions % c, p = 0;
        Assignment out;
        for (int i = 0; i < c; i++) {
            vector<int> mine(base + (i < extra ? 1 : 0));      // the first \`extra\` consumers get one more
            iota(mine.begin(), mine.end(), p);
            p += static_cast<int>(mine.size());
            out.push_back({consumers[i], mine});
        }
        return out;
    }

    static Assignment roundRobin(vector<string> consumers, int partitions) {
        sort(consumers.begin(), consumers.end());
        Assignment out;
        for (const string& c : consumers) out.push_back({c, {}});
        for (int p = 0; p < partitions; p++) out[p % out.size()].second.push_back(p);   // deal like cards
        return out;
    }
};

int main() {
    vector<string> cs = {"c3", "c1", "c2"};
    cout << show(Assignors::range(cs, 7)) << "\\n";                     // {c1=[0, 1, 2], c2=[3, 4], c3=[5, 6]}
    cout << show(Assignors::roundRobin(cs, 7)) << "\\n";                // {c1=[0, 3, 6], c2=[1, 4], c3=[2, 5]}
    cout << show(Assignors::range({"a", "b", "c"}, 2)) << "\\n";        // c idle
    cout << show(Assignors::roundRobin({"a", "b"}, 0)) << "\\n";        // no partitions: nobody gets anything
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

static class Assignors {
    public static List<KeyValuePair<string, List<int>>> Range(IEnumerable<string> consumers, int partitions) {
        List<string> cs = consumers.OrderBy(c => c, StringComparer.Ordinal).ToList();
        var result = new List<KeyValuePair<string, List<int>>>();
        int b = partitions / cs.Count, extra = partitions % cs.Count, p = 0;
        for (int i = 0; i < cs.Count; i++) {
            List<int> mine = new List<int>();
            int n = b + (i < extra ? 1 : 0);
            for (int k = 0; k < n; k++) mine.Add(p++);
            result.Add(new KeyValuePair<string, List<int>>(cs[i], mine));
        }
        return result;
    }
    public static List<KeyValuePair<string, List<int>>> RoundRobin(IEnumerable<string> consumers, int partitions) {
        List<string> cs = consumers.OrderBy(c => c, StringComparer.Ordinal).ToList();
        var result = cs.Select(c => new KeyValuePair<string, List<int>>(c, new List<int>())).ToList();
        for (int p = 0; p < partitions; p++) result[p % cs.Count].Value.Add(p);
        return result;
    }
    static string Show(List<KeyValuePair<string, List<int>>> m) { return "{" + string.Join(", ", m.Select(kv => kv.Key + "=[" + string.Join(", ", kv.Value) + "]")) + "}"; }
    static void Main() {
        string[] cs = { "c3", "c1", "c2" };
        Console.WriteLine(Show(Range(cs, 7)));        // {c1=[0, 1, 2], c2=[3, 4], c3=[5, 6]}
        Console.WriteLine(Show(RoundRobin(cs, 7)));   // {c1=[0, 3, 6], c2=[1, 4], c3=[2, 5]}
        Console.WriteLine(Show(Range(new[] { "a", "b", "c" }, 2)));   // c idle
        Console.WriteLine(Show(RoundRobin(new[] { "a", "b" }, 0)));   // no partitions: nobody gets anything
    }
}` }
      ],
      complexity: `<p>O(C log C + P) time, O(P) output.</p>`,
      followUps: ['Implement a sticky assignor that keeps as many old assignments as possible.', 'How many partitions move when one of 10 consumers leaves under round-robin vs sticky?']
    }
  });

  practice.push({
    title: 'Consumer Lag and Re-delivery After a Crash',
    level: 'Medium', tags: ['pub-sub', 'offsets', 'monitoring'], companies: ['LinkedIn', 'Datadog'],
    statement: `<p>For each partition you know: <code>end</code> (log-end offset, next offset to be written), <code>committed</code> (group\'s committed offset) and <code>position</code> (how far the consumer had processed when it crashed, ≥ committed). Return per-partition lag (<code>end − committed</code>), the total lag, and how many messages will be <b>processed twice</b> after restart (<code>position − committed</code>).</p>`,
    constraints: `<p>Up to 10<sup>5</sup> partitions; offsets up to 10<sup>12</sup> (use long). Validate committed ≤ position ≤ end.</p>`,
    example: `${H.table(['partition', 'end', 'committed', 'position', 'lag', 'redelivered'], [['P0', '120', '100', '110', '20', H.c('r', '10')], ['P1', '50', '50', '50', '0', '0'], ['P2', '80', '30', '75', '50', H.c('r', '45')]])}<p>Total lag 70, total re-delivered 55 → the consumer must be idempotent.</p>`,
    brute: {
      why: `<p>Simulating message by message (walk from committed to end, counting) costs O(total lag) — billions of steps on a busy cluster — when the answer is plain subtraction per partition.</p>`,
      code: { lang: 'java', code: String.raw`
class LagSimulate {
    public static void main(String[] args) {
        long[] end = {120, 50, 80}, committed = {100, 50, 30};
        long lag = 0;
        for (int p = 0; p < end.length; p++)
            for (long off = committed[p]; off < end[p]; off++) lag++;     // O(messages), not O(partitions)
        System.out.println("total lag " + lag);
    }
}`, alt: [{ lang: 'python', code: "if __name__ == \"__main__\":\n    end, committed = [120, 50, 80], [100, 50, 30]\n    lag = 0\n    for p in range(len(end)):\n        for off in range(committed[p], end[p]): lag += 1      # O(messages), not O(partitions)\n    print(\"total lag\", lag)\n" }, { lang: 'ts', code: "const end = [120, 50, 80], committed = [100, 50, 30];\nlet lag = 0;\nfor (let p = 0; p < end.length; p++)\n  for (let off = committed[p]; off < end[p]; off++) lag++;     // O(messages), not O(partitions)\nconsole.log(\"total lag \" + lag);\n" }, { lang: 'cpp', code: "int main() {\n    long long end[] = {120, 50, 80}, committed[] = {100, 50, 30};\n    long long lag = 0;\n    for (int p = 0; p < 3; p++)\n        for (long long off = committed[p]; off < end[p]; off++) lag++;     // O(messages), not O(partitions)\n    cout << \"total lag \" << lag << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nclass LagSimulate {\n    static void Main() {\n        long[] end = { 120, 50, 80 }, committed = { 100, 50, 30 };\n        long lag = 0;\n        for (int p = 0; p < end.Length; p++)\n            for (long off = committed[p]; off < end[p]; off++) lag++;     // O(messages), not O(partitions)\n        Console.WriteLine(\"total lag \" + lag);\n    }\n}\n" }] }
    },
    mcq: { q: 'Lag on one partition keeps growing while the others stay near 0. Most likely cause?', options: ['A hot key or a slow/poison message on that partition', 'The broker is down', 'Too many partitions overall', 'Auto-commit is disabled everywhere'], answer: 0, explain: 'Per-partition skew points to that partition: a hot key sending most traffic there, or one message that keeps failing and blocking progress.' },
    hints: [
      `<p>Everything is arithmetic on offsets: lag = end − committed, re-delivered = position − committed.</p>`,
      `<p>Use <code>long</code>, validate the ordering invariant, and return a small value object per partition plus totals.</p>`,
      `<p>Production notes: lag in <i>messages</i> can mislead when messages are bursty; also report lag in <i>time</i> (age of the oldest unconsumed message). Alert on lag growth rate, not just its size.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "P0 lag=20 redelivered=10\nP1 lag=0 redelivered=0\nP2 lag=50 redelivered=45\ntotal lag 70, re-delivered 55\nbad offsets on P3\n" }] },
    solution: {
      approach: `<p>One pass over partitions computing two subtractions each, with invariant checks; totals summed in longs.</p>`,
      code: String.raw`
record PartitionState(int id, long end, long committed, long position) { }
record LagReport(int id, long lag, long redelivered) { }

class LagCalculator {
    static List<LagReport> report(List<PartitionState> parts) {
        List<LagReport> out = new ArrayList<>();
        for (PartitionState p : parts) {
            if (p.committed() > p.position() || p.position() > p.end())
                throw new IllegalArgumentException("bad offsets on P" + p.id());
            out.add(new LagReport(p.id(), p.end() - p.committed(), p.position() - p.committed()));
        }
        return out;
    }
    public static void main(String[] args) {
        List<LagReport> r = report(List.of(new PartitionState(0, 120, 100, 110),
                                           new PartitionState(1, 50, 50, 50),
                                           new PartitionState(2, 80, 30, 75)));
        for (LagReport x : r) System.out.println("P" + x.id() + " lag=" + x.lag() + " redelivered=" + x.redelivered());
        System.out.println("total lag " + r.stream().mapToLong(LagReport::lag).sum()
            + ", re-delivered " + r.stream().mapToLong(LagReport::redelivered).sum());   // 70, 55
        try { report(List.of(new PartitionState(3, 10, 8, 5))); }                       // committed > position
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
from dataclasses import dataclass


@dataclass(frozen=True)
class PartitionState:
    id: int
    end: int
    committed: int
    position: int


@dataclass(frozen=True)
class LagReport:
    id: int
    lag: int
    redelivered: int


class LagCalculator:
    @staticmethod
    def report(parts: list[PartitionState]) -> list[LagReport]:
        out: list[LagReport] = []
        for p in parts:
            if p.committed > p.position or p.position > p.end:
                raise ValueError(f"bad offsets on P{p.id}")
            out.append(LagReport(p.id, p.end - p.committed, p.position - p.committed))
        return out


def main() -> None:
    r = LagCalculator.report([PartitionState(0, 120, 100, 110),
                              PartitionState(1, 50, 50, 50),
                              PartitionState(2, 80, 30, 75)])
    for x in r:
        print(f"P{x.id} lag={x.lag} redelivered={x.redelivered}")
    print(f"total lag {sum(x.lag for x in r)}, re-delivered {sum(x.redelivered for x in r)}")   # 70, 55
    try:
        LagCalculator.report([PartitionState(3, 10, 8, 5)])    # committed > position
    except ValueError as e:
        print(e)


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
interface PartitionState { readonly id: number; readonly end: number; readonly committed: number; readonly position: number; }
interface LagReport { readonly id: number; readonly lag: number; readonly redelivered: number; }

class LagCalculator {
  static report(parts: readonly PartitionState[]): LagReport[] {
    return parts.map((p) => {
      if (p.committed > p.position || p.position > p.end) throw new Error("bad offsets on P" + p.id);
      return { id: p.id, lag: p.end - p.committed, redelivered: p.position - p.committed };
    });
  }
}

const r = LagCalculator.report([
  { id: 0, end: 120, committed: 100, position: 110 },
  { id: 1, end: 50, committed: 50, position: 50 },
  { id: 2, end: 80, committed: 30, position: 75 },
]);
for (const x of r) console.log("P" + x.id + " lag=" + x.lag + " redelivered=" + x.redelivered);
console.log("total lag " + r.reduce((s, x) => s + x.lag, 0) + ", re-delivered " + r.reduce((s, x) => s + x.redelivered, 0));   // 70, 55
try { LagCalculator.report([{ id: 3, end: 10, committed: 8, position: 5 }]); }                                       // committed > position
catch (e) { console.log((e as Error).message); }` },
        { lang: 'cpp', code: String.raw`
struct PartitionState {
    int id;
    long long end, committed, position;
};
struct LagReport {
    int id;
    long long lag, redelivered;
};

class LagCalculator {
public:
    static vector<LagReport> report(const vector<PartitionState>& parts) {
        vector<LagReport> out;
        for (const PartitionState& p : parts) {
            if (p.committed > p.position || p.position > p.end)
                throw invalid_argument("bad offsets on P" + to_string(p.id));
            out.push_back({p.id, p.end - p.committed, p.position - p.committed});
        }
        return out;
    }
};

int main() {
    vector<LagReport> r = LagCalculator::report({{0, 120, 100, 110}, {1, 50, 50, 50}, {2, 80, 30, 75}});
    long long lag = 0, redelivered = 0;
    for (const LagReport& x : r) {
        cout << "P" << x.id << " lag=" << x.lag << " redelivered=" << x.redelivered << "\n";
        lag += x.lag;
        redelivered += x.redelivered;
    }
    cout << "total lag " << lag << ", re-delivered " << redelivered << "\n";   // 70, 55
    try { LagCalculator::report({{3, 10, 8, 5}}); }                            // committed > position
    catch (const invalid_argument& e) { cout << e.what() << "\n"; }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class PartitionState { public readonly int Id; public readonly long End, Committed, Position; public PartitionState(int id, long end, long committed, long position) { Id = id; End = end; Committed = committed; Position = position; } }
sealed class LagReport { public readonly int Id; public readonly long Lag, Redelivered; public LagReport(int id, long lag, long redelivered) { Id = id; Lag = lag; Redelivered = redelivered; } }

static class LagCalculator {
    public static List<LagReport> Report(List<PartitionState> parts) {
        List<LagReport> result = new List<LagReport>();
        foreach (PartitionState p in parts) {
            if (p.Committed > p.Position || p.Position > p.End)
                throw new ArgumentException("bad offsets on P" + p.Id);
            result.Add(new LagReport(p.Id, p.End - p.Committed, p.Position - p.Committed));
        }
        return result;
    }
    static void Main() {
        List<LagReport> r = Report(new List<PartitionState> { new PartitionState(0, 120, 100, 110), new PartitionState(1, 50, 50, 50), new PartitionState(2, 80, 30, 75) });
        foreach (LagReport x in r) Console.WriteLine("P" + x.Id + " lag=" + x.Lag + " redelivered=" + x.Redelivered);
        Console.WriteLine("total lag " + r.Sum(x => x.Lag) + ", re-delivered " + r.Sum(x => x.Redelivered));   // 70, 55
        try { Report(new List<PartitionState> { new PartitionState(3, 10, 8, 5) }); }                          // committed > position
        catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
      ],
      complexity: `<p>O(P) time, O(P) output.</p>`,
      followUps: ['Commit every N messages instead of every batch: how does that bound re-delivery?', 'Compute time-based lag given message timestamps.']
    }
  });

  practice.push({
    title: 'Is the King in Check? (and by whom)',
    level: 'Medium', tags: ['chess', 'grid', 'rays'], companies: ['Google', 'Microsoft'],
    statement: `<p>Given a board as 8 strings (rank 8 first; uppercase White, lowercase Black, <code>.</code> empty) and a colour, return the list of squares of enemy pieces that attack that colour\'s king (empty list = not in check). Two attackers = <b>double check</b>.</p>`,
    constraints: `<p>Exactly one king per side. Must run in O(64) or better per query.</p>`,
    example: `<p>White Ke1, Black Re8 and Nd3: ${H.chips(['e8', 'd3'], { hl: { e8: 'r', d3: 'r' } })} → double check (only a king move can answer it). Put a white pawn on e4 and the rook no longer attacks: ${H.chips(['d3'], { hl: { d3: 'r' } })}.</p>`,
    brute: {
      why: `<p>Generating every enemy move with a full move generator and checking if any lands on the king works, but builds lists for all 16 pieces (including irrelevant ones) — often 10× slower than looking outward from the king, and easy to get wrong for pawns (pawn moves ≠ pawn attacks).</p>`,
      code: { lang: 'java', code: String.raw`
class CheckByAllMoves {
    // simplified brute: test every enemy rook/queen in a straight line with a path walk
    static boolean rookAttacks(char[][] b, int r, int c, int kr, int kc) {
        if (r != kr && c != kc) return false;
        int sr = Integer.signum(kr - r), sc = Integer.signum(kc - c);
        for (int i = r + sr, j = c + sc; i != kr || j != kc; i += sr, j += sc) if (b[i][j] != '.') return false;
        return true;
    }
    public static void main(String[] args) {
        char[][] b = new char[8][8];
        for (char[] row : b) Arrays.fill(row, '.');
        b[0][4] = 'K'; b[7][4] = 'r';
        int found = 0;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++)                // scans all 64 squares
            if (b[r][c] == 'r' && rookAttacks(b, r, c, 0, 4)) found++;
        System.out.println("rook attackers: " + found);
    }
}`, alt: [{ lang: 'python', code: "class CheckByAllMoves:\n    # simplified brute: test every enemy rook/queen in a straight line with a path walk\n    @staticmethod\n    def rook_attacks(b, r, c, kr, kc):\n        if r != kr and c != kc: return False\n        sr = (kr > r) - (kr < r)\n        sc = (kc > c) - (kc < c)\n        i, j = r + sr, c + sc\n        while i != kr or j != kc:\n            if b[i][j] != \".\": return False\n            i += sr; j += sc\n        return True\n\nif __name__ == \"__main__\":\n    b = [[\".\"] * 8 for _ in range(8)]\n    b[0][4] = \"K\"; b[7][4] = \"r\"\n    found = 0\n    for r in range(8):\n        for c in range(8):                                     # scans all 64 squares\n            if b[r][c] == \"r\" and CheckByAllMoves.rook_attacks(b, r, c, 0, 4): found += 1\n    print(\"rook attackers:\", found)\n" }, { lang: 'ts', code: "class CheckByAllMoves {\n  // simplified brute: test every enemy rook/queen in a straight line with a path walk\n  static rookAttacks(b: string[][], r: number, c: number, kr: number, kc: number): boolean {\n    if (r !== kr && c !== kc) return false;\n    const sr = Math.sign(kr - r), sc = Math.sign(kc - c);\n    for (let i = r + sr, j = c + sc; i !== kr || j !== kc; i += sr, j += sc) if (b[i][j] !== \".\") return false;\n    return true;\n  }\n}\nconst b: string[][] = Array.from({ length: 8 }, () => new Array<string>(8).fill(\".\"));\nb[0][4] = \"K\"; b[7][4] = \"r\";\nlet found = 0;\nfor (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)          // scans all 64 squares\n  if (b[r][c] === \"r\" && CheckByAllMoves.rookAttacks(b, r, c, 0, 4)) found++;\nconsole.log(\"rook attackers: \" + found);\n" }, { lang: 'cpp', code: "struct CheckByAllMoves {\n    // simplified brute: test every enemy rook/queen in a straight line with a path walk\n    static bool rookAttacks(const vector<vector<char>>& b, int r, int c, int kr, int kc) {\n        if (r != kr && c != kc) return false;\n        int sr = (kr > r) - (kr < r), sc = (kc > c) - (kc < c);\n        for (int i = r + sr, j = c + sc; i != kr || j != kc; i += sr, j += sc) if (b[i][j] != '.') return false;\n        return true;\n    }\n};\n\nint main() {\n    vector<vector<char>> b(8, vector<char>(8, '.'));\n    b[0][4] = 'K'; b[7][4] = 'r';\n    int found = 0;\n    for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++)         // scans all 64 squares\n        if (b[r][c] == 'r' && CheckByAllMoves::rookAttacks(b, r, c, 0, 4)) found++;\n    cout << \"rook attackers: \" << found << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nstatic class CheckByAllMoves {\n    // simplified brute: test every enemy rook/queen in a straight line with a path walk\n    static bool RookAttacks(char[][] b, int r, int c, int kr, int kc) {\n        if (r != kr && c != kc) return false;\n        int sr = Math.Sign(kr - r), sc = Math.Sign(kc - c);\n        for (int i = r + sr, j = c + sc; i != kr || j != kc; i += sr, j += sc) if (b[i][j] != '.') return false;\n        return true;\n    }\n    static void Main() {\n        char[][] b = new char[8][];\n        for (int r = 0; r < 8; r++) b[r] = \"........\".ToCharArray();\n        b[0][4] = 'K'; b[7][4] = 'r';\n        int found = 0;\n        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++)                // scans all 64 squares\n            if (b[r][c] == 'r' && RookAttacks(b, r, c, 0, 4)) found++;\n        Console.WriteLine(\"rook attackers: \" + found);\n    }\n}\n" }] }
    },
    mcq: { q: 'Why look outward FROM the king instead of from every enemy piece?', options: ['Only 8 rays + 8 knight squares + 2 pawn squares can contain an attacker', 'Enemy pieces cannot be iterated', 'It handles castling', 'It is required for en passant'], answer: 0, explain: 'A "super-piece" placed on the king square reveals all attackers: slide like a queen and see who is at the end of each ray, jump like a knight, and check the two pawn-capture squares.' },
    hints: [
      `<p>Place an imaginary queen + knight on the king\'s square. Any enemy piece at the end of a straight ray that is a rook/queen, or at the end of a diagonal ray that is a bishop/queen, attacks the king.</p>`,
      `<p>Also check the 8 knight squares for an enemy knight, the 8 neighbours for the enemy king, and the 2 squares from which an enemy pawn would capture (for White\'s king: one rank up, since black pawns move down).</p>`,
      `<p>Stop each ray at the first piece of any colour. Return square names so the caller can tell single from double check.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "[e8, d3]\n[d3]\n[d7]\n[]\n" }] },
    solution: {
      approach: `<p>Find the king, then probe 8 rays (stop at the first piece), 8 knight jumps, 8 king neighbours and 2 pawn squares — at most ~40 squares instead of all enemy moves.</p>`,
      code: String.raw`
class CheckDetector {
    static final int[][] STRAIGHT = { {1, 0}, {-1, 0}, {0, 1}, {0, -1} }, DIAG = { {1, 1}, {1, -1}, {-1, 1}, {-1, -1} };
    static final int[][] KNIGHT = { {2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2} };

    static List<String> attackers(String[] ranks8to1, boolean white) {
        char[][] b = new char[8][];
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i].toCharArray();
        int kr = -1, kc = -1;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == (white ? 'K' : 'k')) { kr = r; kc = c; }
        List<String> out = new ArrayList<>();
        ray(b, kr, kc, STRAIGHT, white, "RQ", out);
        ray(b, kr, kc, DIAG, white, "BQ", out);
        jump(b, kr, kc, KNIGHT, white, 'N', out);
        jump(b, kr, kc, new int[][] { {1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1} }, white, 'K', out);
        int pr = white ? kr + 1 : kr - 1;                         // enemy pawns capture toward us
        jump(b, kr, kc, new int[][] { {pr - kr, 1}, {pr - kr, -1} }, white, 'P', out);
        return out;
    }
    private static boolean enemy(char p, boolean white) { return p != '.' && Character.isUpperCase(p) != white; }
    private static String sq(int r, int c) { return "" + (char) ('a' + c) + (r + 1); }
    private static void ray(char[][] b, int kr, int kc, int[][] dirs, boolean white, String kinds, List<String> out) {
        for (int[] d : dirs)
            for (int r = kr + d[0], c = kc + d[1]; r >= 0 && r < 8 && c >= 0 && c < 8; r += d[0], c += d[1]) {
                if (b[r][c] == '.') continue;
                if (enemy(b[r][c], white) && kinds.indexOf(Character.toUpperCase(b[r][c])) >= 0) out.add(sq(r, c));
                break;                                            // first piece blocks the ray
            }
    }
    private static void jump(char[][] b, int kr, int kc, int[][] ds, boolean white, char kind, List<String> out) {
        for (int[] d : ds) {
            int r = kr + d[0], c = kc + d[1];
            if (r >= 0 && r < 8 && c >= 0 && c < 8 && enemy(b[r][c], white) && Character.toUpperCase(b[r][c]) == kind) out.add(sq(r, c));
        }
    }
    public static void main(String[] args) {
        String[] dbl = { "....r...", "........", "........", "........", "........", "...n....", "........", "....K..." };
        System.out.println(attackers(dbl, true));                   // [e8, d3] double check
        String[] blocked = { "....r...", "........", "........", "........", "....P...", "...n....", "........", "....K..." };
        System.out.println(attackers(blocked, true));               // [d3]
        String[] pawnCheck = { "....k...", "...P....", "........", "........", "........", "........", "........", "....K..." };
        System.out.println(attackers(pawnCheck, false));            // [d7] a white pawn attacks the black king
        String[] safe = { "........", "........", "........", "........", "........", "........", "r.......", "....K..k" };
        System.out.println(attackers(safe, true));                  // [] not in check
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
Dirs = list[tuple[int, int]]

STRAIGHT: Dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
DIAG: Dirs = [(1, 1), (1, -1), (-1, 1), (-1, -1)]
KNIGHT: Dirs = [(2, 1), (2, -1), (-2, 1), (-2, -1), (1, 2), (1, -2), (-1, 2), (-1, -2)]


def enemy(p: str, white: bool) -> bool:
    return p != "." and p.isupper() != white


def sq(r: int, c: int) -> str:
    return chr(ord("a") + c) + str(r + 1)


def on_board(r: int, c: int) -> bool:
    return 0 <= r < 8 and 0 <= c < 8


class CheckDetector:
    @staticmethod
    def attackers(ranks8_to_1: list[str], white: bool) -> list[str]:
        b = [list(ranks8_to_1[7 - r]) for r in range(8)]                      # row 0 = rank 1
        king = "K" if white else "k"
        kr, kc = next((r, c) for r in range(8) for c in range(8) if b[r][c] == king)
        out: list[str] = []

        def ray(dirs: Dirs, kinds: str) -> None:
            for dr, dc in dirs:
                r, c = kr + dr, kc + dc
                while on_board(r, c):
                    if b[r][c] != ".":                                          # first piece blocks the ray
                        if enemy(b[r][c], white) and b[r][c].upper() in kinds:
                            out.append(sq(r, c))
                        break
                    r, c = r + dr, c + dc

        def jump(deltas: Dirs, kind: str) -> None:
            for dr, dc in deltas:
                r, c = kr + dr, kc + dc
                if on_board(r, c) and enemy(b[r][c], white) and b[r][c].upper() == kind:
                    out.append(sq(r, c))

        ray(STRAIGHT, "RQ")
        ray(DIAG, "BQ")
        jump(KNIGHT, "N")
        jump(STRAIGHT + DIAG, "K")
        pawn_dr = 1 if white else -1                                            # enemy pawns capture toward us
        jump([(pawn_dr, 1), (pawn_dr, -1)], "P")
        return out


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def main() -> None:
    dbl = ["....r...", "........", "........", "........", "........", "...n....", "........", "....K..."]
    print(show(CheckDetector.attackers(dbl, True)))                              # [e8, d3] double check
    blocked = ["....r...", "........", "........", "........", "....P...", "...n....", "........", "....K..."]
    print(show(CheckDetector.attackers(blocked, True)))                          # [d3]
    pawn_check = ["....k...", "...P....", "........", "........", "........", "........", "........", "....K..."]
    print(show(CheckDetector.attackers(pawn_check, False)))                      # [d7] a white pawn attacks the black king
    safe = ["........", "........", "........", "........", "........", "........", "r.......", "....K..k"]
    print(show(CheckDetector.attackers(safe, True)))                             # [] not in check


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
type Dir = readonly [number, number];
const STRAIGHT: Dir[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: Dir[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT: Dir[] = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];

const isUpper = (ch: string): boolean => ch !== ch.toLowerCase();
const enemy = (p: string, white: boolean): boolean => p !== "." && isUpper(p) !== white;
const sq = (r: number, c: number): string => String.fromCharCode(97 + c) + (r + 1);
const onBoard = (r: number, c: number): boolean => r >= 0 && r < 8 && c >= 0 && c < 8;

class CheckDetector {
  static attackers(ranks8to1: string[], white: boolean): string[] {
    const b = Array.from({ length: 8 }, (_, r) => [...ranks8to1[7 - r]]);   // row 0 = rank 1
    const king = white ? "K" : "k";
    let kr = -1, kc = -1;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === king) { kr = r; kc = c; }
    const out: string[] = [];

    const ray = (dirs: readonly Dir[], kinds: string): void => {
      for (const [dr, dc] of dirs) {
        for (let r = kr + dr, c = kc + dc; onBoard(r, c); r += dr, c += dc) {
          if (b[r][c] === ".") continue;
          if (enemy(b[r][c], white) && kinds.includes(b[r][c].toUpperCase())) out.push(sq(r, c));
          break;                                                             // first piece blocks the ray
        }
      }
    };
    const jump = (deltas: readonly Dir[], kind: string): void => {
      for (const [dr, dc] of deltas) {
        const r = kr + dr, c = kc + dc;
        if (onBoard(r, c) && enemy(b[r][c], white) && b[r][c].toUpperCase() === kind) out.push(sq(r, c));
      }
    };

    ray(STRAIGHT, "RQ");
    ray(DIAG, "BQ");
    jump(KNIGHT, "N");
    jump([...STRAIGHT, ...DIAG], "K");
    const pawnDr = white ? 1 : -1;                                           // enemy pawns capture toward us
    jump([[pawnDr, 1], [pawnDr, -1]], "P");
    return out;
  }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";

const dbl = ["....r...", "........", "........", "........", "........", "...n....", "........", "....K..."];
console.log(show(CheckDetector.attackers(dbl, true)));                       // [e8, d3] double check
const blocked = ["....r...", "........", "........", "........", "....P...", "...n....", "........", "....K..."];
console.log(show(CheckDetector.attackers(blocked, true)));                   // [d3]
const pawnCheck = ["....k...", "...P....", "........", "........", "........", "........", "........", "....K..."];
console.log(show(CheckDetector.attackers(pawnCheck, false)));                // [d7] a white pawn attacks the black king
const safe = ["........", "........", "........", "........", "........", "........", "r.......", "....K..k"];
console.log(show(CheckDetector.attackers(safe, true)));                      // [] not in check` },
        { lang: 'cpp', code: String.raw`
using Dir = pair<int, int>;
const vector<Dir> STRAIGHT = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
const vector<Dir> DIAG = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
const vector<Dir> KNIGHT = {{2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2}};

bool enemy(char p, bool white) { return p != '.' && (isupper(static_cast<unsigned char>(p)) != 0) != white; }
string sq(int r, int c) { return string{static_cast<char>('a' + c), static_cast<char>('1' + r)}; }
bool onBoard(int r, int c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
char upper(char c) { return static_cast<char>(toupper(static_cast<unsigned char>(c))); }

class CheckDetector {
public:
    static vector<string> attackers(const vector<string>& ranks8to1, bool white) {
        vector<string> b(8);
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i];            // row 0 = rank 1
        int kr = -1, kc = -1;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == (white ? 'K' : 'k')) { kr = r; kc = c; }
        vector<string> out;

        auto ray = [&](const vector<Dir>& dirs, const string& kinds) {
            for (auto [dr, dc] : dirs)
                for (int r = kr + dr, c = kc + dc; onBoard(r, c); r += dr, c += dc) {
                    if (b[r][c] == '.') continue;
                    if (enemy(b[r][c], white) && kinds.find(upper(b[r][c])) != string::npos) out.push_back(sq(r, c));
                    break;                                              // first piece blocks the ray
                }
        };
        auto jump = [&](const vector<Dir>& deltas, char kind) {
            for (auto [dr, dc] : deltas) {
                int r = kr + dr, c = kc + dc;
                if (onBoard(r, c) && enemy(b[r][c], white) && upper(b[r][c]) == kind) out.push_back(sq(r, c));
            }
        };

        ray(STRAIGHT, "RQ");
        ray(DIAG, "BQ");
        jump(KNIGHT, 'N');
        vector<Dir> all8 = STRAIGHT;
        all8.insert(all8.end(), DIAG.begin(), DIAG.end());
        jump(all8, 'K');
        int pawnDr = white ? 1 : -1;                                    // enemy pawns capture toward us
        jump({{pawnDr, 1}, {pawnDr, -1}}, 'P');
        return out;
    }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

int main() {
    vector<string> dbl = {"....r...", "........", "........", "........", "........", "...n....", "........", "....K..."};
    cout << show(CheckDetector::attackers(dbl, true)) << "\n";           // [e8, d3] double check
    vector<string> blocked = {"....r...", "........", "........", "........", "....P...", "...n....", "........", "....K..."};
    cout << show(CheckDetector::attackers(blocked, true)) << "\n";       // [d3]
    vector<string> pawnCheck = {"....k...", "...P....", "........", "........", "........", "........", "........", "....K..."};
    cout << show(CheckDetector::attackers(pawnCheck, false)) << "\n";    // [d7] a white pawn attacks the black king
    vector<string> safe = {"........", "........", "........", "........", "........", "........", "r.......", "....K..k"};
    cout << show(CheckDetector::attackers(safe, true)) << "\n";          // [] not in check
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

static class CheckDetector {
    static readonly int[][] STRAIGHT = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } }, DIAG = { new[] { 1, 1 }, new[] { 1, -1 }, new[] { -1, 1 }, new[] { -1, -1 } };
    static readonly int[][] KNIGHT = { new[] { 2, 1 }, new[] { 2, -1 }, new[] { -2, 1 }, new[] { -2, -1 }, new[] { 1, 2 }, new[] { 1, -2 }, new[] { -1, 2 }, new[] { -1, -2 } };

    public static List<string> Attackers(string[] ranks8to1, bool white) {
        char[][] b = new char[8][];
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i].ToCharArray();
        int kr = -1, kc = -1;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == (white ? 'K' : 'k')) { kr = r; kc = c; }
        List<string> result = new List<string>();
        Ray(b, kr, kc, STRAIGHT, white, "RQ", result);
        Ray(b, kr, kc, DIAG, white, "BQ", result);
        Jump(b, kr, kc, KNIGHT, white, 'N', result);
        Jump(b, kr, kc, new[] { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 }, new[] { 1, 1 }, new[] { 1, -1 }, new[] { -1, 1 }, new[] { -1, -1 } }, white, 'K', result);
        int pr = white ? kr + 1 : kr - 1;                         // enemy pawns capture toward us
        Jump(b, kr, kc, new[] { new[] { pr - kr, 1 }, new[] { pr - kr, -1 } }, white, 'P', result);
        return result;
    }
    private static bool Enemy(char p, bool white) { return p != '.' && char.IsUpper(p) != white; }
    private static string Sq(int r, int c) { return "" + (char)('a' + c) + (r + 1); }
    private static void Ray(char[][] b, int kr, int kc, int[][] dirs, bool white, string kinds, List<string> result) {
        foreach (int[] d in dirs)
            for (int r = kr + d[0], c = kc + d[1]; r >= 0 && r < 8 && c >= 0 && c < 8; r += d[0], c += d[1]) {
                if (b[r][c] == '.') continue;
                if (Enemy(b[r][c], white) && kinds.IndexOf(char.ToUpper(b[r][c])) >= 0) result.Add(Sq(r, c));
                break;                                            // first piece blocks the ray
            }
    }
    private static void Jump(char[][] b, int kr, int kc, int[][] ds, bool white, char kind, List<string> result) {
        foreach (int[] d in ds) {
            int r = kr + d[0], c = kc + d[1];
            if (r >= 0 && r < 8 && c >= 0 && c < 8 && Enemy(b[r][c], white) && char.ToUpper(b[r][c]) == kind) result.Add(Sq(r, c));
        }
    }
    static string Show(List<string> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        string[] dbl = { "....r...", "........", "........", "........", "........", "...n....", "........", "....K..." };
        Console.WriteLine(Show(Attackers(dbl, true)));                   // [e8, d3] double check
        string[] blocked = { "....r...", "........", "........", "........", "....P...", "...n....", "........", "....K..." };
        Console.WriteLine(Show(Attackers(blocked, true)));               // [d3]
        string[] pawnCheck = { "....k...", "...P....", "........", "........", "........", "........", "........", "....K..." };
        Console.WriteLine(Show(Attackers(pawnCheck, false)));            // [d7] a white pawn attacks the black king
        string[] safe = { "........", "........", "........", "........", "........", "........", "r.......", "....K..k" };
        Console.WriteLine(Show(Attackers(safe, true)));                  // [] not in check
    }
}` }
      ],
      complexity: `<p>O(1): at most 8 rays × 7 squares + 18 jump squares. Plus O(64) to find the king (or track it incrementally).</p>`,
      followUps: ['Also return pinned pieces (own piece first on a ray, enemy slider second).', 'Use this to generate check evasions quickly: block squares = squares between king and a single slider attacker.']
    }
  });

  practice.push({
    title: 'Duplicate-Suppressing Log Appender ("last message repeated N times")',
    level: 'Medium', tags: ['logging', 'decorator', 'time'], companies: ['Cisco', 'Juniper', 'Atlassian'],
    statement: `<p>Wrap any appender so that identical consecutive messages within <code>windowMs</code> are collapsed. When a different message arrives (or the window has passed), first emit <code>"last message repeated N times"</code> if N &gt; 0, then the new message. Time comes from an injected clock.</p>`,
    constraints: `<p>O(1) per message, O(1) memory. Must not hide a message that repeats after the window expires.</p>`,
    example: `<p>window 1000 ms. t=0 "disk full", t=10 "disk full", t=20 "disk full", t=30 "ok" →</p>${H.table(['Output'], [['disk full'], [H.c('y', 'last message repeated 2 times')], ['ok']])}`,
    brute: {
      why: `<p>Remembering every message ever seen in a Set and dropping repeats forever leaks memory and hides real recurring problems ("disk full" an hour later is never logged again).</p>`,
      code: { lang: 'java', code: String.raw`
class ForeverDedupe {
    private final Set<String> seen = new HashSet<>();      // grows forever
    final List<String> out = new ArrayList<>();
    void append(String m) { if (seen.add(m)) out.add(m); }
    public static void main(String[] args) {
        ForeverDedupe d = new ForeverDedupe();
        d.append("disk full"); d.append("ok"); d.append("disk full");   // an hour later: silently dropped!
        System.out.println(d.out);                                         // [disk full, ok]
    }
}`, alt: [{ lang: 'python', code: "class ForeverDedupe:\n    def __init__(self):\n        self.seen = set()                                      # grows forever\n        self.out = []\n\n    def append(self, m):\n        if m not in self.seen:\n            self.seen.add(m); self.out.append(m)\n\nif __name__ == \"__main__\":\n    d = ForeverDedupe()\n    d.append(\"disk full\"); d.append(\"ok\"); d.append(\"disk full\")   # an hour later: silently dropped!\n    print(d.out)                                               # ['disk full', 'ok']\n" }, { lang: 'ts', code: "class ForeverDedupe {\n  private seen = new Set<string>();                            // grows forever\n  out: string[] = [];\n  append(m: string): void { if (!this.seen.has(m)) { this.seen.add(m); this.out.push(m); } }\n}\nconst d = new ForeverDedupe();\nd.append(\"disk full\"); d.append(\"ok\"); d.append(\"disk full\");   // an hour later: silently dropped!\nconsole.log(d.out);                                            // [ 'disk full', 'ok' ]\n" }, { lang: 'cpp', code: "class ForeverDedupe {\n    unordered_set<string> seen;                                // grows forever\npublic:\n    vector<string> out;\n    void append(const string& m) { if (seen.insert(m).second) out.push_back(m); }\n};\n\nint main() {\n    ForeverDedupe d;\n    d.append(\"disk full\"); d.append(\"ok\"); d.append(\"disk full\");   // an hour later: silently dropped!\n    for (auto& m : d.out) cout << m << \" | \";                  // disk full | ok\n    cout << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nclass ForeverDedupe {\n    private readonly HashSet<string> seen = new HashSet<string>();      // grows forever\n    public readonly List<string> Out = new List<string>();\n    public void Append(string m) { if (seen.Add(m)) Out.Add(m); }\n    static void Main() {\n        ForeverDedupe d = new ForeverDedupe();\n        d.Append(\"disk full\"); d.Append(\"ok\"); d.Append(\"disk full\");   // an hour later: silently dropped!\n        Console.WriteLine(\"[\" + string.Join(\", \", d.Out) + \"]\");         // [disk full, ok]\n    }\n}\n" }] }
    },
    mcq: { q: 'Which pattern lets you add de-duplication to ANY appender without editing it?', options: ['Decorator', 'Singleton', 'Builder', 'Visitor'], answer: 0, explain: 'The de-duplicator implements the same Appender interface and wraps another Appender, adding behaviour before delegating.' },
    hints: [
      `<p>You only need to remember the <b>last</b> message, when it was first seen, and how many repeats were suppressed.</p>`,
      `<p>On append: same text and within window → count++ and return. Otherwise flush the "repeated N times" line (if N &gt; 0), write the new message, and reset the state.</p>`,
      `<p>Edge cases: flush pending repeats on close(); the window is measured from the first occurrence (not sliding) so a constant stream still prints once per window.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "[disk full, last message repeated 2 times, ok, disk full]\n[x, last message repeated 1 times, x]\n" }] },
    solution: {
      approach: `<p>A Decorator holding (lastText, windowStart, suppressed). Constant state, constant time; injected clock for deterministic tests; close() flushes.</p>`,
      code: String.raw`
interface LineSink { void write(String line); }

class DedupeAppender implements LineSink {
    private final LineSink target;
    private final long windowMs;
    private final LongSupplier clock;
    private String last;
    private long windowStart;
    private int suppressed;

    DedupeAppender(LineSink target, long windowMs, LongSupplier clock) { this.target = target; this.windowMs = windowMs; this.clock = clock; }

    public synchronized void write(String line) {
        long now = clock.getAsLong();
        if (line.equals(last) && now - windowStart < windowMs) { suppressed++; return; }
        flush();
        target.write(line);
        last = line;
        windowStart = now;
    }
    synchronized void close() { flush(); }
    private void flush() {
        if (suppressed > 0) target.write("last message repeated " + suppressed + " times");
        suppressed = 0;
    }
    public static void main(String[] args) {
        long[] t = {0};
        List<String> out = new ArrayList<>();
        DedupeAppender d = new DedupeAppender(out::add, 1000, () -> t[0]);
        for (long time : new long[] {0, 10, 20}) { t[0] = time; d.write("disk full"); }
        t[0] = 30;   d.write("ok");
        t[0] = 5000; d.write("disk full");                  // after the window: logged again
        d.close();
        System.out.println(out);   // [disk full, last message repeated 2 times, ok, disk full]

        List<String> out2 = new ArrayList<>();                      // a repeat after the window flushes the count first
        DedupeAppender d2 = new DedupeAppender(out2::add, 1000, () -> t[0]);
        t[0] = 0;    d2.write("x");
        t[0] = 5;    d2.write("x");
        t[0] = 2000; d2.write("x");
        d2.close();
        System.out.println(out2);  // [x, last message repeated 1 times, x]
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
import threading
from typing import Callable

LineSink = Callable[[str], None]


class DedupeAppender:
    def __init__(self, target: LineSink, window_ms: int, clock: Callable[[], int]) -> None:
        self._target = target
        self._window_ms = window_ms
        self._clock = clock
        self._last: str | None = None
        self._window_start = 0
        self._suppressed = 0
        self._lock = threading.Lock()

    def write(self, line: str) -> None:
        with self._lock:
            now = self._clock()
            if line == self._last and now - self._window_start < self._window_ms:
                self._suppressed += 1
                return
            self._flush()
            self._target(line)
            self._last = line
            self._window_start = now

    def close(self) -> None:
        with self._lock:
            self._flush()

    def _flush(self) -> None:
        if self._suppressed > 0:
            self._target(f"last message repeated {self._suppressed} times")
        self._suppressed = 0


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


def main() -> None:
    t = [0]
    out: list[str] = []
    d = DedupeAppender(out.append, 1000, lambda: t[0])
    for time in (0, 10, 20):
        t[0] = time
        d.write("disk full")
    t[0] = 30
    d.write("ok")
    t[0] = 5000
    d.write("disk full")                                # after the window: logged again
    d.close()
    print(show(out))                                    # [disk full, last message repeated 2 times, ok, disk full]

    out2: list[str] = []                                # a repeat after the window flushes the count first
    d2 = DedupeAppender(out2.append, 1000, lambda: t[0])
    for time in (0, 5, 2000):
        t[0] = time
        d2.write("x")
    d2.close()
    print(show(out2))                                   # [x, last message repeated 1 times, x]


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
type LineSink = (line: string) => void;

class DedupeAppender {
  private last: string | null = null;
  private windowStart = 0;
  private suppressed = 0;

  constructor(private readonly target: LineSink, private readonly windowMs: number, private readonly clock: () => number) {}

  write(line: string): void {
    const now = this.clock();
    if (line === this.last && now - this.windowStart < this.windowMs) { this.suppressed++; return; }
    this.flush();
    this.target(line);
    this.last = line;
    this.windowStart = now;
  }
  close(): void { this.flush(); }
  private flush(): void {
    if (this.suppressed > 0) this.target("last message repeated " + this.suppressed + " times");
    this.suppressed = 0;
  }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";

let t = 0;
const out: string[] = [];
const d = new DedupeAppender((l) => out.push(l), 1000, () => t);
for (const time of [0, 10, 20]) { t = time; d.write("disk full"); }
t = 30; d.write("ok");
t = 5000; d.write("disk full");                         // after the window: logged again
d.close();
console.log(show(out));                                // [disk full, last message repeated 2 times, ok, disk full]

const out2: string[] = [];                             // a repeat after the window flushes the count first
const d2 = new DedupeAppender((l) => out2.push(l), 1000, () => t);
for (const time of [0, 5, 2000]) { t = time; d2.write("x"); }
d2.close();
console.log(show(out2));                               // [x, last message repeated 1 times, x]` },
        { lang: 'cpp', code: String.raw`
using LineSink = function<void(const string&)>;

class DedupeAppender {
    LineSink target;
    const long long windowMs;
    function<long long()> clock;
    optional<string> last;
    long long windowStart = 0;
    int suppressed = 0;
    mutex mu;

    void flush() {
        if (suppressed > 0) target("last message repeated " + to_string(suppressed) + " times");
        suppressed = 0;
    }
public:
    DedupeAppender(LineSink t, long long window, function<long long()> c) : target(move(t)), windowMs(window), clock(move(c)) {}

    void write(const string& line) {
        lock_guard<mutex> lock(mu);
        long long now = clock();
        if (last && line == *last && now - windowStart < windowMs) { suppressed++; return; }
        flush();
        target(line);
        last = line;
        windowStart = now;
    }
    void close() { lock_guard<mutex> lock(mu); flush(); }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

int main() {
    long long t = 0;
    vector<string> out;
    DedupeAppender d([&](const string& l) { out.push_back(l); }, 1000, [&] { return t; });
    for (long long time : {0, 10, 20}) { t = time; d.write("disk full"); }
    t = 30; d.write("ok");
    t = 5000; d.write("disk full");                      // after the window: logged again
    d.close();
    cout << show(out) << "\n";                           // [disk full, last message repeated 2 times, ok, disk full]

    vector<string> out2;                                 // a repeat after the window flushes the count first
    DedupeAppender d2([&](const string& l) { out2.push_back(l); }, 1000, [&] { return t; });
    for (long long time : {0, 5, 2000}) { t = time; d2.write("x"); }
    d2.close();
    cout << show(out2) << "\n";                          // [x, last message repeated 1 times, x]
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface ILineSink { void Write(string line); }
class ListSink : ILineSink { readonly List<string> l; public ListSink(List<string> l) { this.l = l; } public void Write(string line) { l.Add(line); } }

class DedupeAppender : ILineSink {
    private readonly ILineSink target;
    private readonly long windowMs;
    private readonly Func<long> clock;
    private string last;
    private long windowStart;
    private int suppressed;
    private readonly object gate = new object();

    public DedupeAppender(ILineSink target, long windowMs, Func<long> clock) { this.target = target; this.windowMs = windowMs; this.clock = clock; }

    public void Write(string line) {
        lock (gate) {
            long now = clock();
            if (line == last && now - windowStart < windowMs) { suppressed++; return; }
            Flush();
            target.Write(line);
            last = line;
            windowStart = now;
        }
    }
    public void Close() { lock (gate) Flush(); }
    private void Flush() {
        if (suppressed > 0) target.Write("last message repeated " + suppressed + " times");
        suppressed = 0;
    }
    static void Main() {
        long t = 0;
        List<string> output = new List<string>();
        DedupeAppender d = new DedupeAppender(new ListSink(output), 1000, () => t);
        foreach (long time in new long[] { 0, 10, 20 }) { t = time; d.Write("disk full"); }
        t = 30;   d.Write("ok");
        t = 5000; d.Write("disk full");                  // after the window: logged again
        d.Close();
        Console.WriteLine("[" + string.Join(", ", output) + "]");   // [disk full, last message repeated 2 times, ok, disk full]

        List<string> out2 = new List<string>();                      // a repeat after the window flushes the count first
        DedupeAppender d2 = new DedupeAppender(new ListSink(out2), 1000, () => t);
        t = 0;    d2.Write("x");
        t = 5;    d2.Write("x");
        t = 2000; d2.Write("x");
        d2.Close();
        Console.WriteLine("[" + string.Join(", ", out2) + "]");     // [x, last message repeated 1 times, x]
    }
}` }
      ],
      complexity: `<p>O(1) time and memory per message.</p>`,
      followUps: ['Collapse per logger name instead of globally (map of states, bounded LRU).', 'Emit the repeat summary on a timer even if no new message arrives.']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Checkmate, Stalemate or Play On?',
    level: 'Hard', tags: ['chess', 'move generation', 'simulation'], companies: ['Chess.com', 'Google', 'Amazon'],
    statement: `<p>Given a board (8 strings, rank 8 first; uppercase White) and the side to move, return <code>CHECKMATE</code>, <code>STALEMATE</code>, <code>CHECK</code> or <code>ACTIVE</code>. Ignore castling and en passant (castling is never legal out of check; en passant is left out to keep this version simple). Pawns may promote — treat a promotion as a normal move for counting.</p>`,
    constraints: `<p>Exactly one king per side. Must be correct for pins, blocks, captures of the checker, and double checks.</p>`,
    example: `${H.table(['Position', 'To move', 'Answer'], [['White Kh1, Pg2, Ph2; Black Kg8, Ra1', 'White', H.c('r', 'CHECKMATE')], ['White Kh1; Black Kf2, Qg3', 'White', H.c('y', 'STALEMATE')], ['Same back-rank, plus a White rook on d2', 'White', 'CHECK']])}<p>In the last line the rook can step to d1 and <b>block</b> the attack, so it is only check — a king-only test would wrongly say mate.</p>`,
    brute: {
      why: `<p>A common shortcut: "in check and the king has no safe square → checkmate". It ignores the other pieces, which can <b>capture the checker</b> or <b>block</b> the line. It also calls every no-safe-square position without check "stalemate" even when other pieces can move.</p>`,
      code: { lang: 'java', code: String.raw`
class KingOnlyMate {
    // brute: decide using only king moves (wrong whenever another piece can block or capture)
    public static void main(String[] args) {
        boolean inCheck = true;          // white Kh1, pawns g2 h2, black Ra1, but a WHITE ROOK on d2 can block on d1
        int kingSafeSquares = 0;
        System.out.println(inCheck && kingSafeSquares == 0 ? "CHECKMATE (wrong: Rd2-d1 blocks)" : "CHECK");
    }
}`, alt: [{ lang: 'python', code: "# brute: decide using only king moves (wrong whenever another piece can block or capture)\nif __name__ == \"__main__\":\n    in_check = True          # white Kh1, pawns g2 h2, black Ra1, but a WHITE ROOK on d2 can block on d1\n    king_safe_squares = 0\n    print(\"CHECKMATE (wrong: Rd2-d1 blocks)\" if in_check and king_safe_squares == 0 else \"CHECK\")\n" }, { lang: 'ts', code: "// brute: decide using only king moves (wrong whenever another piece can block or capture)\nconst inCheck = true;          // white Kh1, pawns g2 h2, black Ra1, but a WHITE ROOK on d2 can block on d1\nconst kingSafeSquares = 0;\nconsole.log(inCheck && kingSafeSquares === 0 ? \"CHECKMATE (wrong: Rd2-d1 blocks)\" : \"CHECK\");\n" }, { lang: 'cpp', code: "// brute: decide using only king moves (wrong whenever another piece can block or capture)\nint main() {\n    bool inCheck = true;          // white Kh1, pawns g2 h2, black Ra1, but a WHITE ROOK on d2 can block on d1\n    int kingSafeSquares = 0;\n    cout << (inCheck && kingSafeSquares == 0 ? \"CHECKMATE (wrong: Rd2-d1 blocks)\" : \"CHECK\") << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nclass KingOnlyMate {\n    // brute: decide using only king moves (wrong whenever another piece can block or capture)\n    static void Main() {\n        bool inCheck = true;          // white Kh1, pawns g2 h2, black Ra1, but a WHITE ROOK on d2 can block on d1\n        int kingSafeSquares = 0;\n        Console.WriteLine(inCheck && kingSafeSquares == 0 ? \"CHECKMATE (wrong: Rd2-d1 blocks)\" : \"CHECK\");\n    }\n}\n" }] }
    },
    mcq: { q: 'Your king is attacked by two pieces at once (double check). Which replies can be legal?', options: ['Only king moves', 'Blocking either line', 'Capturing one attacker with another piece', 'Any move'], answer: 0, explain: 'One block or capture removes at most one attacker; the other still checks. The simulate-and-test approach finds this automatically.' },
    hints: [
      `<p>Status = (in check?, any legal move?). Both come from the same two tools: "is square attacked" and "enumerate legal moves".</p>`,
      `<p>Enumerate pseudo-legal moves for every piece of the side to move (sliders: rays; knight/king: jumps; pawn: forward + diagonal captures), apply each on a copy, and keep it if the king is not attacked. Stop at the first legal move — you only need to know whether one exists.</p>`,
      `<p>Edge cases: pawn double step needs both squares empty; pawn on the last rank promotes (the piece type does not matter for king safety unless it blocks — use a queen); king moves must check the destination, not the original square.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "CHECKMATE\nSTALEMATE\nCHECK\nACTIVE\n" }] },
    solution: {
      approach: `<p>Generate pseudo-legal moves per piece, simulate each on a cloned char board, and test king safety with an outward-from-king attack check. Early-exit when one legal move is found. Combine with the in-check flag for the status.</p>`,
      code: String.raw`
class GameStatusChecker {
    static final int[][] ST = { {1, 0}, {-1, 0}, {0, 1}, {0, -1} }, DG = { {1, 1}, {1, -1}, {-1, 1}, {-1, -1} };
    static final int[][] KN = { {2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2} };
    static final int[][] K8 = { {1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1} };

    static boolean on(int r, int c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
    static boolean mine(char p, boolean w) { return p != '.' && Character.isUpperCase(p) == w; }
    static boolean theirs(char p, boolean w) { return p != '.' && Character.isUpperCase(p) != w; }

    static boolean attacked(char[][] b, int r, int c, boolean byWhite) {
        for (int[] d : KN) { int i = r + d[0], j = c + d[1]; if (on(i, j) && b[i][j] == (byWhite ? 'N' : 'n')) return true; }
        for (int[] d : K8) { int i = r + d[0], j = c + d[1]; if (on(i, j) && b[i][j] == (byWhite ? 'K' : 'k')) return true; }
        int pr = byWhite ? r - 1 : r + 1;                          // where an attacking pawn would stand
        for (int dc = -1; dc <= 1; dc += 2) if (on(pr, c + dc) && b[pr][c + dc] == (byWhite ? 'P' : 'p')) return true;
        for (int s = 0; s < 2; s++) for (int[] d : s == 0 ? ST : DG)
            for (int i = r + d[0], j = c + d[1]; on(i, j); i += d[0], j += d[1]) {
                char p = b[i][j];
                if (p == '.') continue;
                char u = Character.toUpperCase(p);
                if (Character.isUpperCase(p) == byWhite && (u == 'Q' || u == (s == 0 ? 'R' : 'B'))) return true;
                break;
            }
        return false;
    }
    static boolean kingSafeAfter(char[][] b, int fr, int fc, int tr, int tc, boolean w) {
        char[][] n = new char[8][];
        for (int r = 0; r < 8; r++) n[r] = b[r].clone();
        char p = n[fr][fc];
        n[tr][tc] = (Character.toUpperCase(p) == 'P' && (tr == 0 || tr == 7)) ? (w ? 'Q' : 'q') : p;   // promotion
        n[fr][fc] = '.';
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (n[r][c] == (w ? 'K' : 'k')) return !attacked(n, r, c, !w);
        return false;
    }
    static boolean hasLegalMove(char[][] b, boolean w) {
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            char p = b[r][c];
            if (!mine(p, w)) continue;
            List<int[]> targets = new ArrayList<>();
            switch (Character.toUpperCase(p)) {
                case 'N' -> { for (int[] d : KN) targets.add(new int[] {r + d[0], c + d[1]}); }
                case 'K' -> { for (int[] d : K8) targets.add(new int[] {r + d[0], c + d[1]}); }
                case 'P' -> {
                    int dir = w ? 1 : -1;
                    if (on(r + dir, c) && b[r + dir][c] == '.') {
                        targets.add(new int[] {r + dir, c});
                        if (r == (w ? 1 : 6) && b[r + 2 * dir][c] == '.') targets.add(new int[] {r + 2 * dir, c});
                    }
                    for (int dc = -1; dc <= 1; dc += 2) if (on(r + dir, c + dc) && theirs(b[r + dir][c + dc], w)) targets.add(new int[] {r + dir, c + dc});
                }
                default -> {
                    char u = Character.toUpperCase(p);
                    List<int[]> dirs = new ArrayList<>();
                    if (u != 'B') dirs.addAll(List.of(ST));
                    if (u != 'R') dirs.addAll(List.of(DG));
                    for (int[] d : dirs)
                        for (int i = r + d[0], j = c + d[1]; on(i, j); i += d[0], j += d[1]) {
                            targets.add(new int[] {i, j});
                            if (b[i][j] != '.') break;
                        }
                }
            }
            for (int[] t : targets)
                if (on(t[0], t[1]) && !mine(b[t[0]][t[1]], w) && kingSafeAfter(b, r, c, t[0], t[1], w)) return true;   // early exit
        }
        return false;
    }
    static String status(String[] ranks8to1, boolean whiteToMove) {
        char[][] b = new char[8][];
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i].toCharArray();
        int kr = 0, kc = 0;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == (whiteToMove ? 'K' : 'k')) { kr = r; kc = c; }
        boolean check = attacked(b, kr, kc, !whiteToMove), moves = hasLegalMove(b, whiteToMove);
        return moves ? (check ? "CHECK" : "ACTIVE") : (check ? "CHECKMATE" : "STALEMATE");
    }
    public static void main(String[] args) {
        System.out.println(status(new String[] { "......k.", "........", "........", "........", "........", "........", "......PP", "r......K" }, true));  // CHECKMATE
        System.out.println(status(new String[] { "........", "........", "........", "........", "........", "......q.", ".....k..", ".......K" }, true));  // STALEMATE
        System.out.println(status(new String[] { "......k.", "........", "........", "........", "........", "........", "...R..PP", "r......K" }, true));  // CHECK
        System.out.println(status(new String[] { "rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR" }, true));  // ACTIVE
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
Dirs = list[tuple[int, int]]
Board = list[list[str]]

ST: Dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
DG: Dirs = [(1, 1), (1, -1), (-1, 1), (-1, -1)]
KN: Dirs = [(2, 1), (2, -1), (-2, 1), (-2, -1), (1, 2), (1, -2), (-1, 2), (-1, -2)]
K8: Dirs = ST + DG


def on(r: int, c: int) -> bool:
    return 0 <= r < 8 and 0 <= c < 8


def mine(p: str, w: bool) -> bool:
    return p != "." and p.isupper() == w


def theirs(p: str, w: bool) -> bool:
    return p != "." and p.isupper() != w


class GameStatusChecker:
    @staticmethod
    def attacked(b: Board, r: int, c: int, by_white: bool) -> bool:
        knight, king, pawn = ("N", "K", "P") if by_white else ("n", "k", "p")
        if any(on(r + dr, c + dc) and b[r + dr][c + dc] == knight for dr, dc in KN):
            return True
        if any(on(r + dr, c + dc) and b[r + dr][c + dc] == king for dr, dc in K8):
            return True
        pr = r - 1 if by_white else r + 1                  # where an attacking pawn would stand
        if any(on(pr, c + dc) and b[pr][c + dc] == pawn for dc in (-1, 1)):
            return True
        for dirs, slider in ((ST, "R"), (DG, "B")):
            for dr, dc in dirs:
                i, j = r + dr, c + dc
                while on(i, j):
                    p = b[i][j]
                    if p != ".":                           # first piece blocks the ray
                        if p.isupper() == by_white and p.upper() in ("Q", slider):
                            return True
                        break
                    i, j = i + dr, j + dc
        return False

    @staticmethod
    def king_safe_after(b: Board, fr: int, fc: int, tr: int, tc: int, w: bool) -> bool:
        n = [row[:] for row in b]
        p = n[fr][fc]
        promote = p.upper() == "P" and tr in (0, 7)
        n[tr][tc] = ("Q" if w else "q") if promote else p
        n[fr][fc] = "."
        for r in range(8):
            for c in range(8):
                if n[r][c] == ("K" if w else "k"):
                    return not GameStatusChecker.attacked(n, r, c, not w)
        return False

    @staticmethod
    def has_legal_move(b: Board, w: bool) -> bool:
        for r in range(8):
            for c in range(8):
                p = b[r][c]
                if not mine(p, w):
                    continue
                targets: list[tuple[int, int]] = []
                u = p.upper()
                if u == "N":
                    targets = [(r + dr, c + dc) for dr, dc in KN]
                elif u == "K":
                    targets = [(r + dr, c + dc) for dr, dc in K8]
                elif u == "P":
                    d = 1 if w else -1
                    if on(r + d, c) and b[r + d][c] == ".":
                        targets.append((r + d, c))
                        if r == (1 if w else 6) and b[r + 2 * d][c] == ".":
                            targets.append((r + 2 * d, c))
                    targets += [(r + d, c + dc) for dc in (-1, 1) if on(r + d, c + dc) and theirs(b[r + d][c + dc], w)]
                else:
                    dirs = (ST if u != "B" else []) + (DG if u != "R" else [])
                    for dr, dc in dirs:
                        i, j = r + dr, c + dc
                        while on(i, j):
                            targets.append((i, j))
                            if b[i][j] != ".":
                                break
                            i, j = i + dr, j + dc
                for tr, tc in targets:
                    if on(tr, tc) and not mine(b[tr][tc], w) and GameStatusChecker.king_safe_after(b, r, c, tr, tc, w):
                        return True                         # early exit
        return False

    @staticmethod
    def status(ranks8_to_1: list[str], white_to_move: bool) -> str:
        b = [list(ranks8_to_1[7 - r]) for r in range(8)]
        king = "K" if white_to_move else "k"
        kr, kc = next((r, c) for r in range(8) for c in range(8) if b[r][c] == king)
        check = GameStatusChecker.attacked(b, kr, kc, not white_to_move)
        moves = GameStatusChecker.has_legal_move(b, white_to_move)
        if moves:
            return "CHECK" if check else "ACTIVE"
        return "CHECKMATE" if check else "STALEMATE"


def main() -> None:
    print(GameStatusChecker.status(["......k.", "........", "........", "........", "........", "........", "......PP", "r......K"], True))   # CHECKMATE
    print(GameStatusChecker.status(["........", "........", "........", "........", "........", "......q.", ".....k..", ".......K"], True))   # STALEMATE
    print(GameStatusChecker.status(["......k.", "........", "........", "........", "........", "........", "...R..PP", "r......K"], True))   # CHECK
    print(GameStatusChecker.status(["rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR"], True))   # ACTIVE


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
type Dir = readonly [number, number];
type Board = string[][];

const ST: Dir[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DG: Dir[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KN: Dir[] = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
const K8: Dir[] = [...ST, ...DG];

const on = (r: number, c: number): boolean => r >= 0 && r < 8 && c >= 0 && c < 8;
const isUpper = (ch: string): boolean => ch !== ch.toLowerCase();
const mine = (p: string, w: boolean): boolean => p !== "." && isUpper(p) === w;
const theirs = (p: string, w: boolean): boolean => p !== "." && isUpper(p) !== w;

class GameStatusChecker {
  static attacked(b: Board, r: number, c: number, byWhite: boolean): boolean {
    const [knight, king, pawn] = byWhite ? ["N", "K", "P"] : ["n", "k", "p"];
    if (KN.some(([dr, dc]) => on(r + dr, c + dc) && b[r + dr][c + dc] === knight)) return true;
    if (K8.some(([dr, dc]) => on(r + dr, c + dc) && b[r + dr][c + dc] === king)) return true;
    const pr = byWhite ? r - 1 : r + 1;                    // where an attacking pawn would stand
    if ([-1, 1].some((dc) => on(pr, c + dc) && b[pr][c + dc] === pawn)) return true;
    for (const [dirs, slider] of [[ST, "R"], [DG, "B"]] as [Dir[], string][]) {
      for (const [dr, dc] of dirs) {
        for (let i = r + dr, j = c + dc; on(i, j); i += dr, j += dc) {
          const p = b[i][j];
          if (p === ".") continue;
          if (isUpper(p) === byWhite && (p.toUpperCase() === "Q" || p.toUpperCase() === slider)) return true;
          break;                                           // first piece blocks the ray
        }
      }
    }
    return false;
  }

  static kingSafeAfter(b: Board, fr: number, fc: number, tr: number, tc: number, w: boolean): boolean {
    const n = b.map((row) => row.slice());
    const p = n[fr][fc];
    n[tr][tc] = p.toUpperCase() === "P" && (tr === 0 || tr === 7) ? (w ? "Q" : "q") : p;   // promotion
    n[fr][fc] = ".";
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (n[r][c] === (w ? "K" : "k")) return !GameStatusChecker.attacked(n, r, c, !w);
    }
    return false;
  }

  static hasLegalMove(b: Board, w: boolean): boolean {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!mine(p, w)) continue;
      const targets: [number, number][] = [];
      switch (p.toUpperCase()) {
        case "N": for (const [dr, dc] of KN) targets.push([r + dr, c + dc]); break;
        case "K": for (const [dr, dc] of K8) targets.push([r + dr, c + dc]); break;
        case "P": {
          const d = w ? 1 : -1;
          if (on(r + d, c) && b[r + d][c] === ".") {
            targets.push([r + d, c]);
            if (r === (w ? 1 : 6) && b[r + 2 * d][c] === ".") targets.push([r + 2 * d, c]);
          }
          for (const dc of [-1, 1]) if (on(r + d, c + dc) && theirs(b[r + d][c + dc], w)) targets.push([r + d, c + dc]);
          break;
        }
        default: {
          const u = p.toUpperCase();
          const dirs = [...(u !== "B" ? ST : []), ...(u !== "R" ? DG : [])];
          for (const [dr, dc] of dirs) {
            for (let i = r + dr, j = c + dc; on(i, j); i += dr, j += dc) {
              targets.push([i, j]);
              if (b[i][j] !== ".") break;
            }
          }
        }
      }
      for (const [tr, tc] of targets) {
        if (on(tr, tc) && !mine(b[tr][tc], w) && GameStatusChecker.kingSafeAfter(b, r, c, tr, tc, w)) return true;   // early exit
      }
    }
    return false;
  }

  static status(ranks8to1: string[], whiteToMove: boolean): string {
    const b: Board = Array.from({ length: 8 }, (_, r) => [...ranks8to1[7 - r]]);
    let kr = 0, kc = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === (whiteToMove ? "K" : "k")) { kr = r; kc = c; }
    const check = GameStatusChecker.attacked(b, kr, kc, !whiteToMove);
    const moves = GameStatusChecker.hasLegalMove(b, whiteToMove);
    return moves ? (check ? "CHECK" : "ACTIVE") : (check ? "CHECKMATE" : "STALEMATE");
  }
}

console.log(GameStatusChecker.status(["......k.", "........", "........", "........", "........", "........", "......PP", "r......K"], true));   // CHECKMATE
console.log(GameStatusChecker.status(["........", "........", "........", "........", "........", "......q.", ".....k..", ".......K"], true));   // STALEMATE
console.log(GameStatusChecker.status(["......k.", "........", "........", "........", "........", "........", "...R..PP", "r......K"], true));   // CHECK
console.log(GameStatusChecker.status(["rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR"], true));   // ACTIVE` },
        { lang: 'cpp', code: String.raw`
using Dir = pair<int, int>;
using Board = vector<string>;

const vector<Dir> ST = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
const vector<Dir> DG = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
const vector<Dir> KN = {{2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2}};
const vector<Dir> K8 = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}};

bool on(int r, int c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
bool isUp(char ch) { return isupper(static_cast<unsigned char>(ch)) != 0; }
char up(char ch) { return static_cast<char>(toupper(static_cast<unsigned char>(ch))); }
bool mine(char p, bool w) { return p != '.' && isUp(p) == w; }
bool theirs(char p, bool w) { return p != '.' && isUp(p) != w; }

class GameStatusChecker {
public:
    static bool attacked(const Board& b, int r, int c, bool byWhite) {
        char knight = byWhite ? 'N' : 'n', king = byWhite ? 'K' : 'k', pawn = byWhite ? 'P' : 'p';
        for (auto [dr, dc] : KN) if (on(r + dr, c + dc) && b[r + dr][c + dc] == knight) return true;
        for (auto [dr, dc] : K8) if (on(r + dr, c + dc) && b[r + dr][c + dc] == king) return true;
        int pr = byWhite ? r - 1 : r + 1;                  // where an attacking pawn would stand
        for (int dc : {-1, 1}) if (on(pr, c + dc) && b[pr][c + dc] == pawn) return true;
        for (int s = 0; s < 2; s++)
            for (auto [dr, dc] : s == 0 ? ST : DG)
                for (int i = r + dr, j = c + dc; on(i, j); i += dr, j += dc) {
                    char p = b[i][j];
                    if (p == '.') continue;
                    if (isUp(p) == byWhite && (up(p) == 'Q' || up(p) == (s == 0 ? 'R' : 'B'))) return true;
                    break;                                 // first piece blocks the ray
                }
        return false;
    }

    static bool kingSafeAfter(const Board& b, int fr, int fc, int tr, int tc, bool w) {
        Board n = b;
        char p = n[fr][fc];
        n[tr][tc] = (up(p) == 'P' && (tr == 0 || tr == 7)) ? (w ? 'Q' : 'q') : p;   // promotion
        n[fr][fc] = '.';
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++)
            if (n[r][c] == (w ? 'K' : 'k')) return !attacked(n, r, c, !w);
        return false;
    }

    static bool hasLegalMove(const Board& b, bool w) {
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            char p = b[r][c];
            if (!mine(p, w)) continue;
            vector<Dir> targets;
            switch (up(p)) {
                case 'N': for (auto [dr, dc] : KN) targets.push_back({r + dr, c + dc}); break;
                case 'K': for (auto [dr, dc] : K8) targets.push_back({r + dr, c + dc}); break;
                case 'P': {
                    int d = w ? 1 : -1;
                    if (on(r + d, c) && b[r + d][c] == '.') {
                        targets.push_back({r + d, c});
                        if (r == (w ? 1 : 6) && b[r + 2 * d][c] == '.') targets.push_back({r + 2 * d, c});
                    }
                    for (int dc : {-1, 1}) if (on(r + d, c + dc) && theirs(b[r + d][c + dc], w)) targets.push_back({r + d, c + dc});
                    break;
                }
                default: {
                    vector<Dir> dirs;
                    if (up(p) != 'B') dirs.insert(dirs.end(), ST.begin(), ST.end());
                    if (up(p) != 'R') dirs.insert(dirs.end(), DG.begin(), DG.end());
                    for (auto [dr, dc] : dirs)
                        for (int i = r + dr, j = c + dc; on(i, j); i += dr, j += dc) {
                            targets.push_back({i, j});
                            if (b[i][j] != '.') break;
                        }
                }
            }
            for (auto [tr, tc] : targets)
                if (on(tr, tc) && !mine(b[tr][tc], w) && kingSafeAfter(b, r, c, tr, tc, w)) return true;   // early exit
        }
        return false;
    }

    static string status(const vector<string>& ranks8to1, bool whiteToMove) {
        Board b(8);
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i];
        int kr = 0, kc = 0;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == (whiteToMove ? 'K' : 'k')) { kr = r; kc = c; }
        bool check = attacked(b, kr, kc, !whiteToMove), moves = hasLegalMove(b, whiteToMove);
        return moves ? (check ? "CHECK" : "ACTIVE") : (check ? "CHECKMATE" : "STALEMATE");
    }
};

int main() {
    cout << GameStatusChecker::status({"......k.", "........", "........", "........", "........", "........", "......PP", "r......K"}, true) << "\n";   // CHECKMATE
    cout << GameStatusChecker::status({"........", "........", "........", "........", "........", "......q.", ".....k..", ".......K"}, true) << "\n";   // STALEMATE
    cout << GameStatusChecker::status({"......k.", "........", "........", "........", "........", "........", "...R..PP", "r......K"}, true) << "\n";   // CHECK
    cout << GameStatusChecker::status({"rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR"}, true) << "\n";   // ACTIVE
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

static class GameStatusChecker {
    static readonly int[][] ST = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } }, DG = { new[] { 1, 1 }, new[] { 1, -1 }, new[] { -1, 1 }, new[] { -1, -1 } };
    static readonly int[][] KN = { new[] { 2, 1 }, new[] { 2, -1 }, new[] { -2, 1 }, new[] { -2, -1 }, new[] { 1, 2 }, new[] { 1, -2 }, new[] { -1, 2 }, new[] { -1, -2 } };
    static readonly int[][] K8 = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 }, new[] { 1, 1 }, new[] { 1, -1 }, new[] { -1, 1 }, new[] { -1, -1 } };

    static bool On(int r, int c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
    static bool Mine(char p, bool w) { return p != '.' && char.IsUpper(p) == w; }
    static bool Theirs(char p, bool w) { return p != '.' && char.IsUpper(p) != w; }

    static bool Attacked(char[][] b, int r, int c, bool byWhite) {
        foreach (int[] d in KN) { int i = r + d[0], j = c + d[1]; if (On(i, j) && b[i][j] == (byWhite ? 'N' : 'n')) return true; }
        foreach (int[] d in K8) { int i = r + d[0], j = c + d[1]; if (On(i, j) && b[i][j] == (byWhite ? 'K' : 'k')) return true; }
        int pr = byWhite ? r - 1 : r + 1;                          // where an attacking pawn would stand
        for (int dc = -1; dc <= 1; dc += 2) if (On(pr, c + dc) && b[pr][c + dc] == (byWhite ? 'P' : 'p')) return true;
        for (int s = 0; s < 2; s++) foreach (int[] d in s == 0 ? ST : DG)
            for (int i = r + d[0], j = c + d[1]; On(i, j); i += d[0], j += d[1]) {
                char p = b[i][j];
                if (p == '.') continue;
                char u = char.ToUpper(p);
                if (char.IsUpper(p) == byWhite && (u == 'Q' || u == (s == 0 ? 'R' : 'B'))) return true;
                break;
            }
        return false;
    }
    static bool KingSafeAfter(char[][] b, int fr, int fc, int tr, int tc, bool w) {
        char[][] n = new char[8][];
        for (int r = 0; r < 8; r++) n[r] = (char[])b[r].Clone();
        char p = n[fr][fc];
        n[tr][tc] = (char.ToUpper(p) == 'P' && (tr == 0 || tr == 7)) ? (w ? 'Q' : 'q') : p;   // promotion
        n[fr][fc] = '.';
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (n[r][c] == (w ? 'K' : 'k')) return !Attacked(n, r, c, !w);
        return false;
    }
    static bool HasLegalMove(char[][] b, bool w) {
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            char p = b[r][c];
            if (!Mine(p, w)) continue;
            List<int[]> targets = new List<int[]>();
            char u = char.ToUpper(p);
            if (u == 'N') { foreach (int[] d in KN) targets.Add(new[] { r + d[0], c + d[1] }); }
            else if (u == 'K') { foreach (int[] d in K8) targets.Add(new[] { r + d[0], c + d[1] }); }
            else if (u == 'P') {
                int dir = w ? 1 : -1;
                if (On(r + dir, c) && b[r + dir][c] == '.') {
                    targets.Add(new[] { r + dir, c });
                    if (r == (w ? 1 : 6) && b[r + 2 * dir][c] == '.') targets.Add(new[] { r + 2 * dir, c });
                }
                for (int dc = -1; dc <= 1; dc += 2) if (On(r + dir, c + dc) && Theirs(b[r + dir][c + dc], w)) targets.Add(new[] { r + dir, c + dc });
            } else {
                List<int[]> dirs = new List<int[]>();
                if (u != 'B') dirs.AddRange(ST);
                if (u != 'R') dirs.AddRange(DG);
                foreach (int[] d in dirs)
                    for (int i = r + d[0], j = c + d[1]; On(i, j); i += d[0], j += d[1]) {
                        targets.Add(new[] { i, j });
                        if (b[i][j] != '.') break;
                    }
            }
            foreach (int[] t in targets)
                if (On(t[0], t[1]) && !Mine(b[t[0]][t[1]], w) && KingSafeAfter(b, r, c, t[0], t[1], w)) return true;   // early exit
        }
        return false;
    }
    public static string Status(string[] ranks8to1, bool whiteToMove) {
        char[][] b = new char[8][];
        for (int i = 0; i < 8; i++) b[7 - i] = ranks8to1[i].ToCharArray();
        int kr = 0, kc = 0;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) if (b[r][c] == (whiteToMove ? 'K' : 'k')) { kr = r; kc = c; }
        bool check = Attacked(b, kr, kc, !whiteToMove), moves = HasLegalMove(b, whiteToMove);
        return moves ? (check ? "CHECK" : "ACTIVE") : (check ? "CHECKMATE" : "STALEMATE");
    }
    static void Main() {
        Console.WriteLine(Status(new[] { "......k.", "........", "........", "........", "........", "........", "......PP", "r......K" }, true));  // CHECKMATE
        Console.WriteLine(Status(new[] { "........", "........", "........", "........", "........", "......q.", ".....k..", ".......K" }, true));  // STALEMATE
        Console.WriteLine(Status(new[] { "......k.", "........", "........", "........", "........", "........", "...R..PP", "r......K" }, true));  // CHECK
        Console.WriteLine(Status(new[] { "rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR" }, true));  // ACTIVE
    }
}` }
      ],
      complexity: `<p>At most ~218 pseudo-legal moves (the chess maximum), each simulated in O(64) → a few thousand operations; early exit usually stops much sooner.</p>`,
      followUps: ['Add castling and en passant without breaking the early exit.', 'Detect insufficient material and threefold repetition (Zobrist hashing).']
    }
  });

  practice.push({
    title: 'Log-Compacted Topic: Keep Only the Latest Value per Key',
    level: 'Hard', tags: ['pub-sub', 'compaction', 'hashmap'], companies: ['Confluent', 'LinkedIn', 'Netflix'],
    statement: `<p>A partition holds records <code>(offset, key, value)</code> in offset order; <code>value = null</code> is a <b>tombstone</b> (delete). Compact it: keep, for each key, only its <b>latest</b> record, preserving original offsets and order; keys whose latest record is a tombstone disappear entirely. Also return the new head of the log (first kept offset).</p>`,
    constraints: `<p>Up to 10<sup>6</sup> records, keys never null. O(n) time.</p>`,
    example: `${H.table(['offset', 'key', 'value', 'kept?'], [['0', 'u1', 'Delhi', H.c('r', 'no (newer at 3)')], ['1', 'u2', 'Pune', H.c('r', 'no (tombstone at 4)')], ['2', 'u3', 'Goa', H.c('g', 'yes')], ['3', 'u1', 'Mumbai', H.c('g', 'yes')], ['4', 'u2', 'null', H.c('r', 'tombstone: key removed')]])}<p>Result: [2 u3 Goa, 3 u1 Mumbai]. Offsets 2 and 3 keep their numbers — consumers\' bookmarks stay valid; there are simply gaps.</p>`,
    brute: {
      why: `<p>For each record, scanning the rest of the log for a newer record with the same key is O(n²): 10<sup>12</sup> comparisons for a million-record partition. Renumbering offsets after compaction would also break every consumer\'s committed offset.</p>`,
      code: { lang: 'java', code: String.raw`
record Rec(long offset, String key, String value) { }

class QuadraticCompaction {
    static List<Rec> compact(List<Rec> log) {
        List<Rec> out = new ArrayList<>();
        for (int i = 0; i < log.size(); i++) {
            boolean newer = false;
            for (int j = i + 1; j < log.size(); j++) if (log.get(j).key().equals(log.get(i).key())) { newer = true; break; }  // O(n^2)
            if (!newer && log.get(i).value() != null) out.add(log.get(i));
        }
        return out;
    }
    public static void main(String[] args) {
        System.out.println(compact(List.of(new Rec(0, "u1", "Delhi"), new Rec(1, "u2", "Pune"), new Rec(2, "u3", "Goa"),
                                           new Rec(3, "u1", "Mumbai"), new Rec(4, "u2", null))));
    }
}`, alt: [{ lang: 'python', code: "from collections import namedtuple\nRec = namedtuple(\"Rec\", \"offset key value\")\n\nclass QuadraticCompaction:\n    @staticmethod\n    def compact(log):\n        out = []\n        for i in range(len(log)):\n            newer = False\n            for j in range(i + 1, len(log)):\n                if log[j].key == log[i].key: newer = True; break      # O(n^2)\n            if not newer and log[i].value is not None: out.append(log[i])\n        return out\n\nif __name__ == \"__main__\":\n    print(QuadraticCompaction.compact([Rec(0, \"u1\", \"Delhi\"), Rec(1, \"u2\", \"Pune\"), Rec(2, \"u3\", \"Goa\"),\n                                       Rec(3, \"u1\", \"Mumbai\"), Rec(4, \"u2\", None)]))\n" }, { lang: 'ts', code: "interface Rec { offset: number; key: string; value: string | null }\n\nclass QuadraticCompaction {\n  static compact(log: Rec[]): Rec[] {\n    const out: Rec[] = [];\n    for (let i = 0; i < log.length; i++) {\n      let newer = false;\n      for (let j = i + 1; j < log.length; j++) if (log[j].key === log[i].key) { newer = true; break; }   // O(n^2)\n      if (!newer && log[i].value !== null) out.push(log[i]);\n    }\n    return out;\n  }\n}\nconsole.log(QuadraticCompaction.compact([\n  { offset: 0, key: \"u1\", value: \"Delhi\" }, { offset: 1, key: \"u2\", value: \"Pune\" }, { offset: 2, key: \"u3\", value: \"Goa\" },\n  { offset: 3, key: \"u1\", value: \"Mumbai\" }, { offset: 4, key: \"u2\", value: null }]));\n" }, { lang: 'cpp', code: "struct Rec { long long offset; string key; optional<string> value; };\n\nstruct QuadraticCompaction {\n    static vector<Rec> compact(const vector<Rec>& log) {\n        vector<Rec> out;\n        for (size_t i = 0; i < log.size(); i++) {\n            bool newer = false;\n            for (size_t j = i + 1; j < log.size(); j++) if (log[j].key == log[i].key) { newer = true; break; }   // O(n^2)\n            if (!newer && log[i].value.has_value()) out.push_back(log[i]);\n        }\n        return out;\n    }\n};\n\nint main() {\n    vector<Rec> log = {{0, \"u1\", \"Delhi\"}, {1, \"u2\", \"Pune\"}, {2, \"u3\", \"Goa\"}, {3, \"u1\", \"Mumbai\"}, {4, \"u2\", nullopt}};\n    for (auto& r : QuadraticCompaction::compact(log)) cout << r.offset << \" \" << r.key << \" \" << *r.value << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\nsealed class Rec {\n    public readonly long Offset; public readonly string Key, Value;\n    public Rec(long o, string k, string v) { Offset = o; Key = k; Value = v; }\n    public override string ToString() { return \"Rec[offset=\" + Offset + \", key=\" + Key + \", value=\" + (Value ?? \"null\") + \"]\"; }\n}\n\nstatic class QuadraticCompaction {\n    public static List<Rec> Compact(List<Rec> log) {\n        List<Rec> result = new List<Rec>();\n        for (int i = 0; i < log.Count; i++) {\n            bool newer = false;\n            for (int j = i + 1; j < log.Count; j++) if (log[j].Key == log[i].Key) { newer = true; break; }  // O(n^2)\n            if (!newer && log[i].Value != null) result.Add(log[i]);\n        }\n        return result;\n    }\n    static void Main() {\n        Console.WriteLine(\"[\" + string.Join(\", \", Compact(new List<Rec> { new Rec(0, \"u1\", \"Delhi\"), new Rec(1, \"u2\", \"Pune\"), new Rec(2, \"u3\", \"Goa\"),\n                                           new Rec(3, \"u1\", \"Mumbai\"), new Rec(4, \"u2\", null) })) + \"]\");\n    }\n}\n" }] }
    },
    mcq: { q: 'Why does Kafka keep tombstones for a while (delete.retention.ms) instead of removing them at once?', options: ['So slow consumers still see that the key was deleted', 'To save disk space', 'Because offsets must be contiguous', 'Tombstones are never removed'], answer: 0, explain: 'A consumer rebuilding state from the topic must observe the delete; if the tombstone vanished before it read it, the consumer would keep the old value forever.' },
    hints: [
      `<p>Pass 1: map key → offset of its latest record (later records overwrite earlier ones in the map).</p>`,
      `<p>Pass 2: walk the log in order; keep a record only if its offset equals <code>latest.get(key)</code> and its value is not null.</p>`,
      `<p>Real compaction runs on closed segments only (never the active tail), in the background, and keeps the newest tombstones for a grace period. Offsets are never rewritten.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "[2:u3=Goa, 3:u1=Mumbai]\nnew head offset = 2\n[] new head offset = -1\n" }] },
    solution: {
      approach: `<p>Two linear passes: build the latest-offset map, then filter in order. Offsets preserved, tombstoned keys dropped.</p>`,
      code: String.raw`
record LogRec(long offset, String key, String value) { }

class Compactor {
    static List<LogRec> compact(List<LogRec> log) {
        Map<String, Long> latest = new HashMap<>();
        for (LogRec r : log) latest.put(r.key(), r.offset());                       // pass 1
        List<LogRec> out = new ArrayList<>();
        for (LogRec r : log)                                                         // pass 2, original order
            if (latest.get(r.key()) == r.offset() && r.value() != null) out.add(r);
        return out;
    }
    static String show(List<LogRec> log) {
        return log.stream().map(r -> r.offset() + ":" + r.key() + "=" + r.value()).toList().toString();
    }
    static long head(List<LogRec> log) { return log.isEmpty() ? -1 : log.get(0).offset(); }

    public static void main(String[] args) {
        List<LogRec> out = compact(List.of(new LogRec(0, "u1", "Delhi"), new LogRec(1, "u2", "Pune"),
            new LogRec(2, "u3", "Goa"), new LogRec(3, "u1", "Mumbai"), new LogRec(4, "u2", null)));
        System.out.println(show(out));                          // [2:u3=Goa, 3:u1=Mumbai]
        System.out.println("new head offset = " + head(out));    // 2
        List<LogRec> gone = compact(List.of(new LogRec(0, "k", "v"), new LogRec(1, "k", null)));   // deleted by a tombstone
        System.out.println(show(gone) + " new head offset = " + head(gone));                        // [] -1
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class LogRec:
    offset: int
    key: str
    value: Optional[str]                                # None = tombstone (a delete)


class Compactor:
    @staticmethod
    def compact(log: list[LogRec]) -> list[LogRec]:
        latest = {r.key: r.offset for r in log}         # pass 1: the last offset per key wins
        return [r for r in log if latest[r.key] == r.offset and r.value is not None]   # pass 2, original order


def show(log: list[LogRec]) -> str:
    return "[" + ", ".join(f"{r.offset}:{r.key}={r.value}" for r in log) + "]"


def head(log: list[LogRec]) -> int:
    return log[0].offset if log else -1


def main() -> None:
    out = Compactor.compact([LogRec(0, "u1", "Delhi"), LogRec(1, "u2", "Pune"), LogRec(2, "u3", "Goa"),
                             LogRec(3, "u1", "Mumbai"), LogRec(4, "u2", None)])
    print(show(out))                                    # [2:u3=Goa, 3:u1=Mumbai]
    print(f"new head offset = {head(out)}")             # 2
    gone = Compactor.compact([LogRec(0, "k", "v"), LogRec(1, "k", None)])    # deleted by a tombstone
    print(f"{show(gone)} new head offset = {head(gone)}")                    # [] -1


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
interface LogRec {
  readonly offset: number;
  readonly key: string;
  readonly value: string | null;                        // null = tombstone (a delete)
}

class Compactor {
  static compact(log: readonly LogRec[]): LogRec[] {
    const latest = new Map<string, number>();
    for (const r of log) latest.set(r.key, r.offset);   // pass 1: the last offset per key wins
    return log.filter((r) => latest.get(r.key) === r.offset && r.value !== null);   // pass 2, original order
  }
}

const show = (log: LogRec[]): string => "[" + log.map((r) => r.offset + ":" + r.key + "=" + r.value).join(", ") + "]";
const head = (log: LogRec[]): number => (log.length === 0 ? -1 : log[0].offset);

const out = Compactor.compact([
  { offset: 0, key: "u1", value: "Delhi" }, { offset: 1, key: "u2", value: "Pune" },
  { offset: 2, key: "u3", value: "Goa" }, { offset: 3, key: "u1", value: "Mumbai" },
  { offset: 4, key: "u2", value: null },
]);
console.log(show(out));                                 // [2:u3=Goa, 3:u1=Mumbai]
console.log("new head offset = " + head(out));          // 2
const gone = Compactor.compact([{ offset: 0, key: "k", value: "v" }, { offset: 1, key: "k", value: null }]);   // deleted by a tombstone
console.log(show(gone) + " new head offset = " + head(gone));                                                   // [] -1` },
        { lang: 'cpp', code: String.raw`
struct LogRec {
    long long offset;
    string key;
    optional<string> value;                             // empty = tombstone (a delete)
};

class Compactor {
public:
    static vector<LogRec> compact(const vector<LogRec>& log) {
        unordered_map<string, long long> latest;
        for (const LogRec& r : log) latest[r.key] = r.offset;          // pass 1: the last offset per key wins
        vector<LogRec> out;
        for (const LogRec& r : log)                                    // pass 2, original order
            if (latest[r.key] == r.offset && r.value) out.push_back(r);
        return out;
    }
};

string show(const vector<LogRec>& log) {
    string out = "[";
    for (size_t i = 0; i < log.size(); i++)
        out += (i ? ", " : "") + to_string(log[i].offset) + ":" + log[i].key + "=" + log[i].value.value_or("null");
    return out + "]";
}
long long head(const vector<LogRec>& log) { return log.empty() ? -1 : log[0].offset; }

int main() {
    vector<LogRec> out = Compactor::compact({{0, "u1", "Delhi"}, {1, "u2", "Pune"}, {2, "u3", "Goa"},
                                             {3, "u1", "Mumbai"}, {4, "u2", nullopt}});
    cout << show(out) << "\n";                                         // [2:u3=Goa, 3:u1=Mumbai]
    cout << "new head offset = " << head(out) << "\n";                 // 2
    vector<LogRec> gone = Compactor::compact({{0, "k", "v"}, {1, "k", nullopt}});   // deleted by a tombstone
    cout << show(gone) << " new head offset = " << head(gone) << "\n"; // [] -1
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class LogRec { public readonly long Offset; public readonly string Key, Value; public LogRec(long o, string k, string v) { Offset = o; Key = k; Value = v; } }

static class Compactor {
    public static List<LogRec> Compact(List<LogRec> log) {
        Dictionary<string, long> latest = new Dictionary<string, long>();
        foreach (LogRec r in log) latest[r.Key] = r.Offset;                      // pass 1
        List<LogRec> result = new List<LogRec>();
        foreach (LogRec r in log)                                                // pass 2, original order
            if (latest[r.Key] == r.Offset && r.Value != null) result.Add(r);
        return result;
    }
    static string Show(List<LogRec> log) { return "[" + string.Join(", ", log.Select(r => r.Offset + ":" + r.Key + "=" + r.Value)) + "]"; }
    static long Head(List<LogRec> log) { return log.Count == 0 ? -1 : log[0].Offset; }

    static void Main() {
        List<LogRec> res = Compact(new List<LogRec> { new LogRec(0, "u1", "Delhi"), new LogRec(1, "u2", "Pune"),
            new LogRec(2, "u3", "Goa"), new LogRec(3, "u1", "Mumbai"), new LogRec(4, "u2", null) });
        Console.WriteLine(Show(res));                          // [2:u3=Goa, 3:u1=Mumbai]
        Console.WriteLine("new head offset = " + Head(res));    // 2
        List<LogRec> gone = Compact(new List<LogRec> { new LogRec(0, "k", "v"), new LogRec(1, "k", null) });   // deleted by a tombstone
        Console.WriteLine(Show(gone) + " new head offset = " + Head(gone));                                     // [] -1
    }
}` }
      ],
      complexity: `<p>O(n) time, O(distinct keys) extra memory.</p>`,
      followUps: ['Compact only records older than the active segment boundary.', 'Keep tombstones younger than T milliseconds.']
    }
  });

  practice.push({
    title: 'Consumer Retries with Exponential Backoff and a Dead-Letter Queue',
    level: 'Hard', tags: ['pub-sub', 'retry', 'priority queue', 'simulation'], companies: ['Uber', 'Stripe', 'DoorDash'],
    statement: `<p>A consumer handles messages with a handler that sometimes fails. A failed message is retried after <code>base × 2<sup>attempt−1</sup></code> ms (attempt 1 → base, 2 → 2·base, …); after <code>maxAttempts</code> failures it goes to a <b>dead-letter queue</b>. A failing ("poison") message must <b>not</b> block other messages. Simulate with a virtual clock and return the processing timeline and the DLQ.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> messages; no real sleeping (<code>Thread.sleep</code>, <code>time.sleep</code>); O(n log n) total.</p>`,
    example: `<p>base = 100 ms, maxAttempts = 3; m2 always fails, m3 fails once:</p>${H.table(['time', 'event'], [['0', 'm1 ok'], ['0', 'm2 fail #1 → retry at 100'], ['0', 'm3 fail #1 → retry at 100'], ['100', 'm2 fail #2 → retry at 300'], ['100', 'm3 ok'], ['300', H.c('r', 'm2 fail #3 → DLQ')]])}`,
    brute: {
      why: `<p>Retrying in place (<code>while (!ok) retry()</code>) blocks the whole partition behind one poison message — every later message waits forever (or until a human intervenes). Sleeping between retries also stalls the thread. The brute below caps itself at 1000 attempts just so the demo ends.</p>`,
      code: { lang: 'java', code: String.raw`
class RetryInPlace {
    public static void main(String[] args) {
        List<String> msgs = List.of("m1", "poison", "m3");
        List<String> done = new ArrayList<>();
        for (String m : msgs) {
            int attempts = 0;
            while (m.equals("poison") && attempts < 1000) attempts++;   // in real code: forever, blocking m3
            if (!m.equals("poison")) done.add(m);
            else System.out.println("stuck on poison for " + attempts + " attempts; m3 waited the whole time");
        }
        System.out.println(done);
    }
}`, alt: [{ lang: 'python', code: "if __name__ == \"__main__\":\n    msgs = [\"m1\", \"poison\", \"m3\"]\n    done = []\n    for m in msgs:\n        attempts = 0\n        while m == \"poison\" and attempts < 1000: attempts += 1   # in real code: forever, blocking m3\n        if m != \"poison\": done.append(m)\n        else: print(f\"stuck on poison for {attempts} attempts; m3 waited the whole time\")\n    print(done)\n" }, { lang: 'ts', code: "const msgs = [\"m1\", \"poison\", \"m3\"];\nconst done: string[] = [];\nfor (const m of msgs) {\n  let attempts = 0;\n  while (m === \"poison\" && attempts < 1000) attempts++;         // in real code: forever, blocking m3\n  if (m !== \"poison\") done.push(m);\n  else console.log(\"stuck on poison for \" + attempts + \" attempts; m3 waited the whole time\");\n}\nconsole.log(done);\n" }, { lang: 'cpp', code: "int main() {\n    vector<string> msgs = {\"m1\", \"poison\", \"m3\"};\n    vector<string> done;\n    for (const string& m : msgs) {\n        int attempts = 0;\n        while (m == \"poison\" && attempts < 1000) attempts++;    // in real code: forever, blocking m3\n        if (m != \"poison\") done.push_back(m);\n        else cout << \"stuck on poison for \" << attempts << \" attempts; m3 waited the whole time\" << endl;\n    }\n    for (auto& m : done) cout << m << \" \";\n    cout << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nclass RetryInPlace {\n    static void Main() {\n        string[] msgs = { \"m1\", \"poison\", \"m3\" };\n        List<string> done = new List<string>();\n        foreach (string m in msgs) {\n            int attempts = 0;\n            while (m == \"poison\" && attempts < 1000) attempts++;   // in real code: forever, blocking m3\n            if (m != \"poison\") done.Add(m);\n            else Console.WriteLine(\"stuck on poison for \" + attempts + \" attempts; m3 waited the whole time\");\n        }\n        Console.WriteLine(\"[\" + string.Join(\", \", done) + \"]\");\n    }\n}\n" }] }
    },
    mcq: { q: 'Why add random jitter to the backoff delay in production?', options: ['To stop many consumers retrying at the same instant and overloading the dependency', 'To make retries faster', 'Because exponential backoff overflows', 'To guarantee ordering'], answer: 0, explain: 'Without jitter, failures that happened together retry together ("thundering herd"). Jitter spreads the retries out.' },
    hints: [
      `<p>Separate the main queue from a <b>retry schedule</b>: a min-heap of (nextAttemptTime, message, attempt).</p>`,
      `<p>Event loop: process all main-queue messages at the current time; then jump the virtual clock to the earliest retry time and process the due retries; failures are rescheduled or sent to the DLQ.</p>`,
      `<p>Edge cases: maxAttempts = 1 (straight to DLQ), ties in time (use a sequence number for stable order), and note that retries break strict per-key ordering — if ordering matters, park the whole key, not just the message.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "0 m1 ok\n0 m2 fail #1 -> retry at 100\n0 m3 fail #1 -> retry at 100\n100 m2 fail #2 -> retry at 300\n100 m3 ok\n300 m2 fail #3 -> DLQ\nDLQ = [m2]\n" }] },
    solution: {
      approach: `<p>Discrete-event simulation: a FIFO for fresh messages, a priority queue keyed by (time, sequence) for retries, a virtual clock that jumps to the next event, and a DLQ list. Poison messages only ever occupy a heap slot, never the head of the main queue.</p>`,
      code: String.raw`
record Attempt(long at, long seq, String msg, int attempt) { }

class RetryingConsumer {
    static List<String> run(List<String> msgs, Predicate<String> handlerFails, long base, int maxAttempts, List<String> dlq) {
        List<String> timeline = new ArrayList<>();
        PriorityQueue<Attempt> retries = new PriorityQueue<>(Comparator.comparingLong(Attempt::at).thenComparingLong(Attempt::seq));
        Deque<Attempt> fresh = new ArrayDeque<>();
        long seq = 0, now = 0;
        for (String m : msgs) fresh.add(new Attempt(0, seq++, m, 1));
        while (!fresh.isEmpty() || !retries.isEmpty()) {
            Attempt a;
            if (!fresh.isEmpty()) a = fresh.poll();
            else { a = retries.poll(); now = Math.max(now, a.at()); }          // jump the virtual clock
            if (!handlerFails.test(a.msg() + "#" + a.attempt())) { timeline.add(now + " " + a.msg() + " ok"); continue; }
            if (a.attempt() >= maxAttempts) { dlq.add(a.msg()); timeline.add(now + " " + a.msg() + " fail #" + a.attempt() + " -> DLQ"); continue; }
            long next = now + base * (1L << (a.attempt() - 1));
            retries.add(new Attempt(next, seq++, a.msg(), a.attempt() + 1));
            timeline.add(now + " " + a.msg() + " fail #" + a.attempt() + " -> retry at " + next);
        }
        return timeline;
    }
    public static void main(String[] args) {
        List<String> dlq = new ArrayList<>();
        // m2 always fails; m3 fails only on its first attempt
        Predicate<String> fails = s -> s.startsWith("m2#") || s.equals("m3#1");
        run(List.of("m1", "m2", "m3"), fails, 100, 3, dlq).forEach(System.out::println);
        System.out.println("DLQ = " + dlq);
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
import heapq
from collections import deque
from dataclasses import dataclass, field
from typing import Callable


@dataclass(frozen=True, order=True)
class Attempt:
    at: int
    seq: int                                            # ties on time are served in arrival order
    msg: str = field(compare=False)
    attempt: int = field(compare=False)


class RetryingConsumer:
    @staticmethod
    def run(msgs: list[str], handler_fails: Callable[[str], bool], base: int, max_attempts: int,
            dlq: list[str]) -> list[str]:
        timeline: list[str] = []
        retries: list[Attempt] = []                     # a heap ordered by (at, seq)
        fresh: deque[Attempt] = deque()
        seq = now = 0
        for m in msgs:
            fresh.append(Attempt(0, seq, m, 1))
            seq += 1
        while fresh or retries:
            if fresh:
                a = fresh.popleft()
            else:
                a = heapq.heappop(retries)
                now = max(now, a.at)                    # jump the virtual clock
            if not handler_fails(f"{a.msg}#{a.attempt}"):
                timeline.append(f"{now} {a.msg} ok")
                continue
            if a.attempt >= max_attempts:
                dlq.append(a.msg)
                timeline.append(f"{now} {a.msg} fail #{a.attempt} -> DLQ")
                continue
            nxt = now + base * (1 << (a.attempt - 1))
            heapq.heappush(retries, Attempt(nxt, seq, a.msg, a.attempt + 1))
            seq += 1
            timeline.append(f"{now} {a.msg} fail #{a.attempt} -> retry at {nxt}")
        return timeline


def main() -> None:
    dlq: list[str] = []
    # m2 always fails; m3 fails only on its first attempt

    def fails(s: str) -> bool:
        return s.startswith("m2#") or s == "m3#1"

    for line in RetryingConsumer.run(["m1", "m2", "m3"], fails, 100, 3, dlq):
        print(line)
    print("DLQ = [" + ", ".join(dlq) + "]")


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
interface Attempt { readonly at: number; readonly seq: number; readonly msg: string; readonly attempt: number; }

// JavaScript has no built-in heap, so here is a small binary min-heap.
class MinHeap<T> {
  private readonly items: T[] = [];
  constructor(private readonly less: (a: T, b: T) => boolean) {}
  get size(): number { return this.items.length; }
  peek(): T | undefined { return this.items[0]; }
  push(x: T): void {
    const a = this.items;
    a.push(x);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop() as T;
    if (a.length > 0) {
      a[0] = last;
      for (let i = 0;;) {
        let m = i;
        const l = 2 * i + 1, r = l + 1;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class RetryingConsumer {
  static run(msgs: string[], handlerFails: (s: string) => boolean, base: number, maxAttempts: number, dlq: string[]): string[] {
    const timeline: string[] = [];
    const retries = new MinHeap<Attempt>((a, b) => a.at < b.at || (a.at === b.at && a.seq < b.seq));   // ties: arrival order
    let freshHead = 0;
    const fresh: Attempt[] = [];
    let seq = 0, now = 0;
    for (const m of msgs) fresh.push({ at: 0, seq: seq++, msg: m, attempt: 1 });
    while (freshHead < fresh.length || retries.size > 0) {
      let a: Attempt;
      if (freshHead < fresh.length) a = fresh[freshHead++];
      else { a = retries.pop()!; now = Math.max(now, a.at); }              // jump the virtual clock
      if (!handlerFails(a.msg + "#" + a.attempt)) { timeline.push(now + " " + a.msg + " ok"); continue; }
      if (a.attempt >= maxAttempts) { dlq.push(a.msg); timeline.push(now + " " + a.msg + " fail #" + a.attempt + " -> DLQ"); continue; }
      const next = now + base * 2 ** (a.attempt - 1);
      retries.push({ at: next, seq: seq++, msg: a.msg, attempt: a.attempt + 1 });
      timeline.push(now + " " + a.msg + " fail #" + a.attempt + " -> retry at " + next);
    }
    return timeline;
  }
}

const dlq: string[] = [];
// m2 always fails; m3 fails only on its first attempt
const fails = (s: string): boolean => s.startsWith("m2#") || s === "m3#1";
for (const line of RetryingConsumer.run(["m1", "m2", "m3"], fails, 100, 3, dlq)) console.log(line);
console.log("DLQ = [" + dlq.join(", ") + "]");` },
        { lang: 'cpp', code: String.raw`
struct Attempt {
    long long at, seq;                                  // ties on time are served in arrival order
    string msg;
    int attempt;
    bool operator>(const Attempt& o) const { return tie(at, seq) > tie(o.at, o.seq); }
};

class RetryingConsumer {
public:
    static vector<string> run(const vector<string>& msgs, const function<bool(const string&)>& handlerFails,
                              long long base, int maxAttempts, vector<string>& dlq) {
        vector<string> timeline;
        priority_queue<Attempt, vector<Attempt>, greater<Attempt>> retries;   // min-heap (the default is a max-heap)
        deque<Attempt> fresh;
        long long seq = 0, now = 0;
        for (const string& m : msgs) fresh.push_back({0, seq++, m, 1});
        while (!fresh.empty() || !retries.empty()) {
            Attempt a;
            if (!fresh.empty()) { a = fresh.front(); fresh.pop_front(); }
            else { a = retries.top(); retries.pop(); now = max(now, a.at); }   // jump the virtual clock
            if (!handlerFails(a.msg + "#" + to_string(a.attempt))) { timeline.push_back(to_string(now) + " " + a.msg + " ok"); continue; }
            if (a.attempt >= maxAttempts) {
                dlq.push_back(a.msg);
                timeline.push_back(to_string(now) + " " + a.msg + " fail #" + to_string(a.attempt) + " -> DLQ");
                continue;
            }
            long long next = now + base * (1LL << (a.attempt - 1));
            retries.push({next, seq++, a.msg, a.attempt + 1});
            timeline.push_back(to_string(now) + " " + a.msg + " fail #" + to_string(a.attempt) + " -> retry at " + to_string(next));
        }
        return timeline;
    }
};

int main() {
    vector<string> dlq;
    // m2 always fails; m3 fails only on its first attempt
    auto fails = [](const string& s) { return s.rfind("m2#", 0) == 0 || s == "m3#1"; };
    for (const string& line : RetryingConsumer::run({"m1", "m2", "m3"}, fails, 100, 3, dlq)) cout << line << "\n";
    cout << "DLQ = [";
    for (size_t i = 0; i < dlq.size(); i++) cout << (i ? ", " : "") << dlq[i];
    cout << "]\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Attempt : IComparable<Attempt> {
    public readonly long At, Seq; public readonly string Msg; public readonly int Number;
    public Attempt(long at, long seq, string msg, int number) { At = at; Seq = seq; Msg = msg; Number = number; }
    public int CompareTo(Attempt o) { int c = At.CompareTo(o.At); return c != 0 ? c : Seq.CompareTo(o.Seq); }   // time, then arrival order
}

static class RetryingConsumer {
    public static List<string> Run(List<string> msgs, Func<string, bool> handlerFails, long b, int maxAttempts, List<string> dlq) {
        List<string> timeline = new List<string>();
        SortedSet<Attempt> retries = new SortedSet<Attempt>();               // min-heap by (at, seq)
        Queue<Attempt> fresh = new Queue<Attempt>();
        long seq = 0, now = 0;
        foreach (string m in msgs) fresh.Enqueue(new Attempt(0, seq++, m, 1));
        while (fresh.Count > 0 || retries.Count > 0) {
            Attempt a;
            if (fresh.Count > 0) a = fresh.Dequeue();
            else { a = retries.Min; retries.Remove(a); now = Math.Max(now, a.At); }   // jump the virtual clock
            if (!handlerFails(a.Msg + "#" + a.Number)) { timeline.Add(now + " " + a.Msg + " ok"); continue; }
            if (a.Number >= maxAttempts) { dlq.Add(a.Msg); timeline.Add(now + " " + a.Msg + " fail #" + a.Number + " -> DLQ"); continue; }
            long next = now + b * (1L << (a.Number - 1));
            retries.Add(new Attempt(next, seq++, a.Msg, a.Number + 1));
            timeline.Add(now + " " + a.Msg + " fail #" + a.Number + " -> retry at " + next);
        }
        return timeline;
    }
    static void Main() {
        List<string> dlq = new List<string>();
        // m2 always fails; m3 fails only on its first attempt
        Func<string, bool> fails = s => s.StartsWith("m2#") || s == "m3#1";
        foreach (string line in Run(new List<string> { "m1", "m2", "m3" }, fails, 100, 3, dlq)) Console.WriteLine(line);
        Console.WriteLine("DLQ = [" + string.Join(", ", dlq) + "]");
    }
}` }
      ],
      complexity: `<p>Each attempt is one heap push/pop: O(A log A) for A total attempts (≤ n · maxAttempts).</p>`,
      followUps: ['Persist the retry schedule in "retry topics" (orders.retry.1m, orders.retry.10m) like many Kafka setups.', 'Add a DLQ replay tool that re-publishes after a bug fix.']
    }
  });

  practice.push({
    title: 'Async Logger: Bounded Queue, Drop Policy and Graceful Shutdown',
    level: 'Hard', tags: ['logging', 'concurrency', 'producer-consumer'], companies: ['Amazon', 'Goldman Sachs', 'Netflix'],
    statement: `<p>Build an asynchronous logger: many threads call <code>log(line)</code> (in TypeScript, many concurrent async tasks); one background writer drains a <b>bounded</b> queue into a slow sink. When the queue is full, <b>drop</b> the line and count it (callers must never block). <code>shutdown()</code> must write everything already queued, then stop, and must return within a timeout even if the sink is stuck.</p>`,
    constraints: `<p>8 producer threads × 10<sup>4</sup> lines; queue capacity 1024; shutdown ≤ 2 s; no lost lines except counted drops: <code>written + dropped == logged</code>.</p>`,
    example: `<p>Sink takes ~10 µs per line, 8 producers log 80,000 lines in a ~60 ms burst. The sink can only absorb a few thousand lines in that time, so ${H.c('g', 'a few thousand are written')} and ${H.c('y', 'the rest are dropped and counted')} — written + dropped is exactly 80,000 (the split depends on timing). Callers never wait for the sink.</p>`,
    brute: {
      why: `<p>Writing synchronously on the caller thread makes every request pay the sink\'s latency (a slow disk slows every user). The other naive fix — an <b>unbounded</b> queue with a non-daemon <code>while(true) take()</code> thread — can run out of memory under bursts and keeps the process from ever exiting.</p>`,
      code: { lang: 'java', code: String.raw`
class SyncLogger {
    static void slowSink(String line) {
        long end = System.nanoTime() + 20_000;            // ~20 microseconds of "disk" work
        while (System.nanoTime() < end) { Thread.onSpinWait(); }
    }
    public static void main(String[] args) {
        long t = System.nanoTime();
        for (int i = 0; i < 2000; i++) slowSink("line " + i);      // caller waits for every write
        System.out.println("caller spent " + (System.nanoTime() - t) / 1_000_000 + " ms just logging");
    }
}`, alt: [{ lang: 'python', code: "import time\n\nclass SyncLogger:\n    @staticmethod\n    def slow_sink(line):\n        end = time.perf_counter_ns() + 20_000                    # ~20 microseconds of \"disk\" work\n        while time.perf_counter_ns() < end: pass\n\nif __name__ == \"__main__\":\n    t = time.perf_counter_ns()\n    for i in range(2000): SyncLogger.slow_sink(f\"line {i}\")      # caller waits for every write\n    print(f\"caller spent {(time.perf_counter_ns() - t) // 1_000_000} ms just logging\")\n" }, { lang: 'ts', code: "class SyncLogger {\n  static slowSink(line: string): void {\n    const end = process.hrtime.bigint() + 20_000n;               // ~20 microseconds of \"disk\" work\n    while (process.hrtime.bigint() < end) { }\n  }\n}\nconst t = process.hrtime.bigint();\nfor (let i = 0; i < 2000; i++) SyncLogger.slowSink(\"line \" + i);   // caller waits for every write\nconsole.log(\"caller spent \" + Number((process.hrtime.bigint() - t) / 1_000_000n) + \" ms just logging\");\n" }, { lang: 'cpp', code: "struct SyncLogger {\n    static void slowSink(const string& line) {\n        auto end = chrono::steady_clock::now() + chrono::microseconds(20);   // ~20 microseconds of \"disk\" work\n        while (chrono::steady_clock::now() < end) { this_thread::yield(); }\n    }\n};\n\nint main() {\n    auto t = chrono::steady_clock::now();\n    for (int i = 0; i < 2000; i++) SyncLogger::slowSink(\"line \" + to_string(i));      // caller waits for every write\n    cout << \"caller spent \" << chrono::duration_cast<chrono::milliseconds>(chrono::steady_clock::now() - t).count() << \" ms just logging\" << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Diagnostics;\nusing System.Threading;\nstatic class SyncLogger {\n    static void SlowSink(string line) {\n        Stopwatch sw = Stopwatch.StartNew();                  // ~20 microseconds of \"disk\" work\n        while (sw.ElapsedTicks * 1000000L / Stopwatch.Frequency < 20) Thread.SpinWait(1);\n    }\n    static void Main() {\n        Stopwatch t = Stopwatch.StartNew();\n        for (int i = 0; i < 2000; i++) SlowSink(\"line \" + i);      // caller waits for every write\n        Console.WriteLine(\"caller spent \" + t.ElapsedMilliseconds + \" ms just logging\");\n    }\n}\n" }] }
    },
    mcq: { q: 'Why must the async writer thread be stopped with a "poison pill" placed in the queue rather than just interrupting it?', options: ['Messages queued before the pill are still written first, so nothing accepted is lost', 'Threads can never be interrupted', 'The pill is faster', 'It prevents dropping'], answer: 0, explain: 'The pill travels through the FIFO behind every accepted line, so the writer flushes them and then exits. A join with timeout guards against a stuck sink.' },
    hints: [
      `<p>Use a bounded queue with a non-blocking insert (Java <code>ArrayBlockingQueue.offer()</code>, Python <code>queue.Queue.put_nowait()</code>, C++ a deque under a mutex): if the queue is full, increment an atomic dropped counter (<code>AtomicLong</code>, or a lock-guarded int).</p>`,
      `<p>Writer loop: <code>take()</code> until it sees the poison pill. <code>shutdown()</code>: set a closed flag (reject new logs), <code>put(POISON)</code> with a timeout, then <code>join(timeout)</code>.</p>`,
      `<p>Edge cases: logs arriving after shutdown (count as dropped), sink exceptions (catch and continue, never kill the writer), daemon thread so a forgotten shutdown cannot hang the process. Check the invariant written + dropped == logged in the demo.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "producers finished with a stuck sink: true\nlogged = 80000, dropped at least 78975: true\nclean shutdown: true\nwritten + dropped = logged: true, written <= 1025: true\nlate line dropped: true\nflaky shutdown: true, written=2, dropped=1\n" }] },
    solution: {
      approach: `<p>Classic producer-consumer: a bounded queue (Java <code>ArrayBlockingQueue</code>), a non-blocking insert with a drop counter, one daemon writer thread, poison-pill shutdown with bounded waits. Counters are atomic so the invariant can be checked (TypeScript uses an async loop instead of a thread, so plain numbers are enough).</p>`,
      code: String.raw`
class AsyncLogger {
    private static final String POISON = new String("POISON");          // unique identity
    private final BlockingQueue<String> queue;
    private final Consumer<String> sink;
    private final AtomicLong dropped = new AtomicLong(), written = new AtomicLong(), logged = new AtomicLong();
    private volatile boolean closed;
    private final Thread writer;

    AsyncLogger(int capacity, Consumer<String> sink) {
        this.queue = new ArrayBlockingQueue<>(capacity);
        this.sink = sink;
        this.writer = new Thread(this::drain, "async-log-writer");
        writer.setDaemon(true);
        writer.start();
    }
    void log(String line) {
        logged.incrementAndGet();
        if (closed || !queue.offer(line)) dropped.incrementAndGet();      // never blocks the caller
    }
    private void drain() {
        try {
            while (true) {
                String line = queue.take();
                if (line == POISON) return;
                try { sink.accept(line); written.incrementAndGet(); }
                catch (RuntimeException e) { dropped.incrementAndGet(); }  // a bad line must not kill the writer
            }
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
    boolean shutdown(long timeoutMs) throws InterruptedException {
        closed = true;
        boolean queued = queue.offer(POISON, timeoutMs, TimeUnit.MILLISECONDS);
        writer.join(timeoutMs);
        return queued && !writer.isAlive();
    }
    public static void main(String[] args) throws Exception {
        // 1) A stuck sink never blocks the producers: lines are dropped (and counted) instead.
        CountDownLatch gate = new CountDownLatch(1);
        AsyncLogger log = new AsyncLogger(1024, line -> {
            try { gate.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int p = 0; p < 8; p++) pool.submit(() -> { for (int i = 0; i < 10_000; i++) log.log("line " + i); });
        pool.shutdown();
        System.out.println("producers finished with a stuck sink: " + pool.awaitTermination(5, TimeUnit.SECONDS));
        System.out.println("logged = " + log.logged.get() + ", dropped at least 78975: " + (log.dropped.get() >= 80_000 - 1024 - 1));
        gate.countDown();                                                  // the disk recovers
        System.out.println("clean shutdown: " + log.shutdown(2000));
        long w = log.written.get(), d = log.dropped.get();
        System.out.println("written + dropped = logged: " + (w + d == log.logged.get()) + ", written <= 1025: " + (w <= 1025));
        log.log("late");                                                   // after shutdown: dropped, never blocks
        System.out.println("late line dropped: " + (log.dropped.get() == d + 1));

        // 2) A sink that throws must not kill the writer thread: the bad line is counted as dropped.
        AsyncLogger flaky = new AsyncLogger(16, line -> { if (line.contains("bad")) throw new IllegalStateException("disk error"); });
        flaky.log("ok1"); flaky.log("bad line"); flaky.log("ok2");
        System.out.println("flaky shutdown: " + flaky.shutdown(2000) + ", written=" + flaky.written.get() + ", dropped=" + flaky.dropped.get());
    }
}`,
    alt: [
        { lang: 'python', code: `
import queue
import threading
from concurrent.futures import ThreadPoolExecutor, wait
from typing import Callable


class Counter:
    """A lock-protected counter: \`+= 1\` on a plain int is not atomic across threads."""

    def __init__(self) -> None:
        self._value = 0
        self._lock = threading.Lock()

    def increment(self) -> None:
        with self._lock:
            self._value += 1

    @property
    def value(self) -> int:
        with self._lock:
            return self._value


class AsyncLogger:
    _POISON = object()                                  # unique identity

    def __init__(self, capacity: int, sink: Callable[[str], None]) -> None:
        self._queue: "queue.Queue[object]" = queue.Queue(maxsize=capacity)
        self._sink = sink
        self.dropped, self.written, self.logged = Counter(), Counter(), Counter()
        self._closed = False
        self._writer = threading.Thread(target=self._drain, name="async-log-writer", daemon=True)
        self._writer.start()

    def log(self, line: str) -> None:
        self.logged.increment()
        if self._closed:
            self.dropped.increment()
            return
        try:
            self._queue.put_nowait(line)                # never blocks the caller
        except queue.Full:
            self.dropped.increment()

    def _drain(self) -> None:
        while True:
            line = self._queue.get()
            if line is self._POISON:
                return
            try:
                self._sink(str(line))
                self.written.increment()
            except Exception:                           # a bad line must not kill the writer
                self.dropped.increment()

    def shutdown(self, timeout_ms: int) -> bool:
        self._closed = True
        try:
            self._queue.put(self._POISON, timeout=timeout_ms / 1000)
            queued = True
        except queue.Full:
            queued = False
        self._writer.join(timeout_ms / 1000)
        return queued and not self._writer.is_alive()


def main() -> None:
    # 1) A stuck sink never blocks the producers: lines are dropped (and counted) instead.
    gate = threading.Event()
    log = AsyncLogger(1024, lambda line: gate.wait())

    def produce() -> None:
        for i in range(10_000):
            log.log(f"line {i}")

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(produce) for _ in range(8)]
        finished = not wait(futures, timeout=5).not_done
    print(f"producers finished with a stuck sink: {str(finished).lower()}")
    print(f"logged = {log.logged.value}, dropped at least 78975: {str(log.dropped.value >= 80_000 - 1024 - 1).lower()}")
    gate.set()                                          # the disk recovers
    print(f"clean shutdown: {str(log.shutdown(2000)).lower()}")
    w, d = log.written.value, log.dropped.value
    print(f"written + dropped = logged: {str(w + d == log.logged.value).lower()}, written <= 1025: {str(w <= 1025).lower()}")
    log.log("late")                                     # after shutdown: dropped, never blocks
    print(f"late line dropped: {str(log.dropped.value == d + 1).lower()}")

    # 2) A sink that throws must not kill the writer thread: the bad line is counted as dropped.
    def flaky_sink(line: str) -> None:
        if "bad" in line:
            raise RuntimeError("disk error")

    flaky = AsyncLogger(16, flaky_sink)
    flaky.log("ok1")
    flaky.log("bad line")
    flaky.log("ok2")
    print(f"flaky shutdown: {str(flaky.shutdown(2000)).lower()}, written={flaky.written.value}, dropped={flaky.dropped.value}")


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

class AsyncLogger {
  private readonly queue: string[] = [];
  private closed = false;
  private wake: (() => void) | null = null;
  private readonly writer: Promise<void>;
  dropped = 0;
  written = 0;
  logged = 0;

  constructor(private readonly capacity: number, private readonly sink: (line: string) => void | Promise<void>) {
    this.writer = this.drain();                       // the "writer thread": an async loop
  }

  log(line: string): void {
    this.logged++;
    if (this.closed || this.queue.length >= this.capacity) { this.dropped++; return; }   // never blocks the caller
    this.queue.push(line);
    this.wake?.();
  }

  private async drain(): Promise<void> {
    for (;;) {
      const line = this.queue.shift();
      if (line === undefined) {
        if (this.closed) return;
        await new Promise<void>((resolve) => { this.wake = resolve; });
        continue;
      }
      try { await this.sink(line); this.written++; }
      catch { this.dropped++; }                       // a bad line must not kill the writer
    }
  }

  async shutdown(timeoutMs: number): Promise<boolean> {
    this.closed = true;
    this.wake?.();
    return Promise.race([this.writer.then(() => true), sleep(timeoutMs).then(() => false)]);
  }
}

async function main(): Promise<void> {
  // 1) A stuck sink never blocks the producers: lines are dropped (and counted) instead.
  let openGate: () => void = () => {};
  const gate = new Promise<void>((resolve) => { openGate = resolve; });
  const log = new AsyncLogger(1024, () => gate);
  const produce = async (): Promise<void> => { for (let i = 0; i < 10_000; i++) log.log("line " + i); };
  const finished = await Promise.race([
    Promise.all(Array.from({ length: 8 }, produce)).then(() => true),
    sleep(5000).then(() => false),
  ]);
  console.log("producers finished with a stuck sink: " + finished);
  console.log("logged = " + log.logged + ", dropped at least 78975: " + (log.dropped >= 80_000 - 1024 - 1));
  openGate();                                         // the disk recovers
  console.log("clean shutdown: " + await log.shutdown(2000));
  const w = log.written, d = log.dropped;
  console.log("written + dropped = logged: " + (w + d === log.logged) + ", written <= 1025: " + (w <= 1025));
  log.log("late");                                    // after shutdown: dropped, never blocks
  console.log("late line dropped: " + (log.dropped === d + 1));

  // 2) A sink that throws must not kill the writer: the bad line is counted as dropped.
  const flaky = new AsyncLogger(16, (line) => { if (line.includes("bad")) throw new Error("disk error"); });
  flaky.log("ok1"); flaky.log("bad line"); flaky.log("ok2");
  console.log("flaky shutdown: " + await flaky.shutdown(2000) + ", written=" + flaky.written + ", dropped=" + flaky.dropped);
}

main();` },
        { lang: 'cpp', code: String.raw`
class Gate {                                            // a latch that stays open once opened
    bool open_ = false;
    mutex mu;
    condition_variable cv;
public:
    void open() { { lock_guard<mutex> lock(mu); open_ = true; } cv.notify_all(); }
    void wait() { unique_lock<mutex> lock(mu); cv.wait(lock, [&] { return open_; }); }
};

class AsyncLogger {
    const size_t capacity;
    function<void(const string&)> sink;
    deque<string> queue;
    mutex mu;
    condition_variable cv;                              // "queue not empty / closed" and "writer finished"
    bool closed = false, finished = false;
    atomic<long long> dropped_{0}, written_{0}, logged_{0};
    thread writer;

    void drain() {
        unique_lock<mutex> lock(mu);
        while (true) {
            cv.wait(lock, [&] { return !queue.empty() || closed; });
            if (queue.empty()) break;                   // closed and nothing left
            string line = move(queue.front());
            queue.pop_front();
            lock.unlock();
            try { sink(line); written_++; }
            catch (const exception&) { dropped_++; }    // a bad line must not kill the writer
            lock.lock();
        }
        finished = true;
        cv.notify_all();
    }
public:
    AsyncLogger(size_t cap, function<void(const string&)> s) : capacity(cap), sink(move(s)), writer([this] { drain(); }) {}
    ~AsyncLogger() { shutdown(60000); if (writer.joinable()) writer.join(); }   // RAII: the thread is always joined

    void log(const string& line) {
        logged_++;
        {
            lock_guard<mutex> lock(mu);
            if (!closed && queue.size() < capacity) { queue.push_back(line); cv.notify_all(); return; }
        }
        dropped_++;                                     // never blocks the caller
    }
    bool shutdown(long long timeoutMs) {
        unique_lock<mutex> lock(mu);
        closed = true;
        cv.notify_all();
        bool done = cv.wait_for(lock, chrono::milliseconds(timeoutMs), [&] { return finished; });
        lock.unlock();
        if (done && writer.joinable()) writer.join();
        return done;
    }
    long long dropped() const { return dropped_; }
    long long written() const { return written_; }
    long long logged() const { return logged_; }
};

const char* yn(bool b) { return b ? "true" : "false"; }

int main() {
    // 1) A stuck sink never blocks the producers: lines are dropped (and counted) instead.
    Gate gate;
    AsyncLogger log(1024, [&](const string&) { gate.wait(); });
    vector<future<void>> producers;
    for (int p = 0; p < 8; p++)
        producers.push_back(async(launch::async, [&] { for (int i = 0; i < 10000; i++) log.log("line " + to_string(i)); }));
    bool finished = true;
    for (auto& f : producers) finished = finished && f.wait_for(chrono::seconds(5)) == future_status::ready;
    cout << "producers finished with a stuck sink: " << yn(finished) << "\n";
    cout << "logged = " << log.logged() << ", dropped at least 78975: " << yn(log.dropped() >= 80000 - 1024 - 1) << "\n";
    gate.open();                                        // the disk recovers
    cout << "clean shutdown: " << yn(log.shutdown(2000)) << "\n";
    long long w = log.written(), d = log.dropped();
    cout << "written + dropped = logged: " << yn(w + d == log.logged()) << ", written <= 1025: " << yn(w <= 1025) << "\n";
    log.log("late");                                    // after shutdown: dropped, never blocks
    cout << "late line dropped: " << yn(log.dropped() == d + 1) << "\n";

    // 2) A sink that throws must not kill the writer thread: the bad line is counted as dropped.
    AsyncLogger flaky(16, [](const string& line) { if (line.find("bad") != string::npos) throw runtime_error("disk error"); });
    flaky.log("ok1"); flaky.log("bad line"); flaky.log("ok2");
    bool clean = flaky.shutdown(2000);
    cout << "flaky shutdown: " << yn(clean) << ", written=" << flaky.written() << ", dropped=" << flaky.dropped() << "\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;

class AsyncLogger {
    private static readonly string POISON = new string("POISON".ToCharArray());   // unique identity
    private readonly BlockingCollection<string> queue;
    private readonly Action<string> sink;
    public long Dropped, Written, Logged;                     // updated only with Interlocked
    private volatile bool closed;
    private readonly Thread writer;

    public AsyncLogger(int capacity, Action<string> sink) {
        queue = new BlockingCollection<string>(capacity);
        this.sink = sink;
        writer = new Thread(Drain) { Name = "async-log-writer", IsBackground = true };
        writer.Start();
    }
    public void Log(string line) {
        Interlocked.Increment(ref Logged);
        if (closed || !queue.TryAdd(line)) Interlocked.Increment(ref Dropped);   // never blocks the caller
    }
    private void Drain() {
        while (true) {
            string line = queue.Take();
            if (ReferenceEquals(line, POISON)) return;
            try { sink(line); Interlocked.Increment(ref Written); }
            catch (Exception) { Interlocked.Increment(ref Dropped); }        // a bad line must not kill the writer
        }
    }
    public bool Shutdown(int timeoutMs) {
        closed = true;
        bool queued = queue.TryAdd(POISON, timeoutMs);
        writer.Join(timeoutMs);
        return queued && !writer.IsAlive;
    }
    static string B(bool b) { return b.ToString().ToLower(); }
    static void Main() {
        // 1) A stuck sink never blocks the producers: lines are dropped (and counted) instead.
        ManualResetEventSlim gate = new ManualResetEventSlim(false);
        AsyncLogger log = new AsyncLogger(1024, line => gate.Wait());
        List<Thread> producers = new List<Thread>();
        for (int p = 0; p < 8; p++) { Thread t = new Thread(() => { for (int i = 0; i < 10000; i++) log.Log("line " + i); }); producers.Add(t); t.Start(); }
        bool finished = true;
        foreach (Thread t in producers) finished &= t.Join(5000);
        Console.WriteLine("producers finished with a stuck sink: " + B(finished));
        Console.WriteLine("logged = " + Interlocked.Read(ref log.Logged) + ", dropped at least 78975: " + B(Interlocked.Read(ref log.Dropped) >= 80000 - 1024 - 1));
        gate.Set();                                                        // the disk recovers
        Console.WriteLine("clean shutdown: " + B(log.Shutdown(2000)));
        long w = Interlocked.Read(ref log.Written), d = Interlocked.Read(ref log.Dropped);
        Console.WriteLine("written + dropped = logged: " + B(w + d == Interlocked.Read(ref log.Logged)) + ", written <= 1025: " + B(w <= 1025));
        log.Log("late");                                                   // after shutdown: dropped, never blocks
        Console.WriteLine("late line dropped: " + B(Interlocked.Read(ref log.Dropped) == d + 1));

        // 2) A sink that throws must not kill the writer thread: the bad line is counted as dropped.
        AsyncLogger flaky = new AsyncLogger(16, line => { if (line.Contains("bad")) throw new InvalidOperationException("disk error"); });
        flaky.Log("ok1"); flaky.Log("bad line"); flaky.Log("ok2");
        Console.WriteLine("flaky shutdown: " + B(flaky.Shutdown(2000)) + ", written=" + flaky.Written + ", dropped=" + flaky.Dropped);
    }
}` }
      ],
      complexity: `<p><code>log()</code> O(1) and lock-light; the writer does O(1) per line. Memory bounded by capacity.</p>`,
      followUps: ['Drop DEBUG/INFO first and block for ERROR (two-tier policy).', 'Batch writes: drainTo(list, 256) then one sink call.', 'Replace the queue with an LMAX Disruptor-style ring buffer: what gets faster and why?']
    }
  });

  practice.push({
    title: 'KV Store with Per-Session Transactions and Optimistic Conflict Detection',
    level: 'Hard', tags: ['kv store', 'transactions', 'occ', 'concurrency'], companies: ['Stripe', 'Snowflake', 'Redis', 'Rubrik'],
    statement: `<p>Several clients use one store. Each client opens a <code>Session</code>: <code>get</code>, <code>set</code>, then <code>commit()</code>. Writes stay <b>private</b> to the session until commit (no dirty reads). At commit, if any key the session <b>read</b> was changed by someone else meanwhile, the commit fails with <code>CONFLICT</code> and nothing is applied (like Redis <code>WATCH</code> or optimistic concurrency control). Otherwise all writes apply atomically.</p>`,
    constraints: `<p>Up to 100 concurrent sessions; commits must be atomic and serializable for the keys they read; reads never block.</p>`,
    example: `<p>counter = 5. Sessions A and B both read 5 and set 6. A commits first → ${H.c('g', 'OK, counter = 6')}. B commits → ${H.c('r', 'CONFLICT')} (its read of version 1 is stale); B retries: reads 6, sets 7 → ${H.c('g', 'OK')}. Final 7, not 6 — no lost update.</p>`,
    brute: {
      why: `<p>Applying each session\'s writes directly to the shared map (no versions) causes <b>lost updates</b>: both sessions read 5 and write 6, so one increment disappears. Using one global lock for the whole session duration fixes it but serialises all clients, even ones touching different keys.</p>`,
      code: { lang: 'java', code: String.raw`
class LostUpdate {
    public static void main(String[] args) {
        Map<String, Integer> store = new HashMap<>(Map.of("counter", 5));
        int a = store.get("counter");        // session A reads 5
        int b = store.get("counter");        // session B reads 5
        store.put("counter", a + 1);         // A writes 6
        store.put("counter", b + 1);         // B writes 6 -> A's increment lost
        System.out.println("counter = " + store.get("counter") + " (expected 7)");
    }
}`, alt: [{ lang: 'python', code: "if __name__ == \"__main__\":\n    store = {\"counter\": 5}\n    a = store[\"counter\"]        # session A reads 5\n    b = store[\"counter\"]        # session B reads 5\n    store[\"counter\"] = a + 1    # A writes 6\n    store[\"counter\"] = b + 1    # B writes 6 -> A's increment lost\n    print(f\"counter = {store['counter']} (expected 7)\")\n" }, { lang: 'ts', code: "const store = new Map<string, number>([[\"counter\", 5]]);\nconst a = store.get(\"counter\")!;        // session A reads 5\nconst b = store.get(\"counter\")!;        // session B reads 5\nstore.set(\"counter\", a + 1);            // A writes 6\nstore.set(\"counter\", b + 1);            // B writes 6 -> A's increment lost\nconsole.log(\"counter = \" + store.get(\"counter\") + \" (expected 7)\");\n" }, { lang: 'cpp', code: "int main() {\n    unordered_map<string, int> store = {{\"counter\", 5}};\n    int a = store[\"counter\"];        // session A reads 5\n    int b = store[\"counter\"];        // session B reads 5\n    store[\"counter\"] = a + 1;        // A writes 6\n    store[\"counter\"] = b + 1;        // B writes 6 -> A's increment lost\n    cout << \"counter = \" << store[\"counter\"] << \" (expected 7)\" << endl;\n}\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nclass LostUpdate {\n    static void Main() {\n        Dictionary<string, int> store = new Dictionary<string, int> { { \"counter\", 5 } };\n        int a = store[\"counter\"];        // session A reads 5\n        int b = store[\"counter\"];        // session B reads 5\n        store[\"counter\"] = a + 1;        // A writes 6\n        store[\"counter\"] = b + 1;        // B writes 6 -> A's increment lost\n        Console.WriteLine(\"counter = \" + store[\"counter\"] + \" (expected 7)\");\n    }\n}\n" }] }
    },
    mcq: { q: 'Session A only WRITES key x (never reads it); B commits a change to x before A commits. Under the rule "fail if a key you READ changed", what happens to A?', options: ['A commits; its write simply overwrites (last writer wins on blind writes)', 'A always fails', 'A deadlocks', 'A sees B\'s value'], answer: 0, explain: 'Validation covers the read set. Blind writes do not depend on the old value, so overwriting is serializable. If you want write-write conflicts detected too, add written keys to the validation set (as snapshot isolation does).' },
    hints: [
      `<p>Give every key a <b>version</b> number that increments on each committed write. A session records <code>readSet: key → version seen</code> and buffers <code>writeSet: key → value</code>.</p>`,
      `<p><code>get</code> checks the session\'s own writeSet first (read-your-writes), else reads the store and records the version. <code>commit</code>: under the store lock, compare every readSet version with the current one; if all match, apply the writeSet and bump versions; else return CONFLICT.</p>`,
      `<p>Edge cases: reading a missing key (version 0) then someone creates it → conflict; deletes as tombstone values; retries in a loop with a bound. The lock is held only during the short validate-and-apply step, never while the client thinks.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "A: OK, B: CONFLICT\nB-retry attempt 1: OK\ncounter = 7\ndisjoint keys: OK\nread set invalidated: CONFLICT\nstress counter = 1000\n" }] },
    solution: {
      approach: `<p>Optimistic concurrency control: versioned values, per-session read/write sets, validate-then-apply inside one short critical section. Reads take no commit lock (Java <code>ConcurrentHashMap</code>; the C++ version guards the map with a small mutex); commits are serialized by a lock, which makes validation + apply atomic.</p>`,
      code: String.raw`
class VersionedStore {
    record Versioned(String value, long version) { }
    final ConcurrentHashMap<String, Versioned> data = new ConcurrentHashMap<>();
    private final Object commitLock = new Object();

    Session begin() { return new Session(this); }

    boolean tryCommit(Map<String, Long> readSet, Map<String, String> writeSet) {
        synchronized (commitLock) {                              // short critical section: validate + apply
            for (Map.Entry<String, Long> e : readSet.entrySet()) {
                Versioned cur = data.get(e.getKey());
                long now = cur == null ? 0 : cur.version();
                if (now != e.getValue()) return false;           // someone changed what we read
            }
            writeSet.forEach((k, v) -> {
                Versioned cur = data.get(k);
                data.put(k, new Versioned(v, (cur == null ? 0 : cur.version()) + 1));
            });
            return true;
        }
    }
}

class Session {
    private final VersionedStore store;
    private final Map<String, Long> readSet = new HashMap<>();
    private final Map<String, String> writeSet = new HashMap<>();
    Session(VersionedStore store) { this.store = store; }

    String get(String k) {
        if (writeSet.containsKey(k)) return writeSet.get(k);   // read your own writes
        VersionedStore.Versioned v = store.data.get(k);
        readSet.putIfAbsent(k, v == null ? 0 : v.version());
        return v == null ? null : v.value();
    }
    void set(String k, String v) { writeSet.put(k, v); }       // invisible to others until commit
    String commit() { return store.tryCommit(readSet, writeSet) ? "OK" : "CONFLICT"; }
}

class OccDemo {
    static void increment(VersionedStore s, String who) {
        for (int attempt = 1; attempt <= 5; attempt++) {
            Session t = s.begin();
            int v = Integer.parseInt(t.get("counter"));
            t.set("counter", String.valueOf(v + 1));
            String r = t.commit();
            System.out.println(who + " attempt " + attempt + ": " + r);
            if (r.equals("OK")) return;
        }
    }
    public static void main(String[] args) throws Exception {
        VersionedStore s = new VersionedStore();
        s.data.put("counter", new VersionedStore.Versioned("5", 1));
        Session a = s.begin(), b = s.begin();
        int va = Integer.parseInt(a.get("counter")), vb = Integer.parseInt(b.get("counter"));
        a.set("counter", String.valueOf(va + 1));
        b.set("counter", String.valueOf(vb + 1));
        System.out.println("A: " + a.commit() + ", B: " + b.commit());     // OK, CONFLICT
        increment(s, "B-retry");                                             // OK on first try now
        System.out.println("counter = " + s.data.get("counter").value());    // 7

        Session reader = s.begin(), writer = s.begin();
        reader.get("counter");                                               // read-only session
        writer.set("other", "x");
        writer.commit();                                                     // a different key: no conflict
        System.out.println("disjoint keys: " + reader.commit());             // OK
        Session stale = s.begin(), bump = s.begin();
        stale.get("counter");
        bump.set("counter", "100");
        bump.commit();
        stale.set("flag", "1");                                              // writes another key, but READ a stale counter
        System.out.println("read set invalidated: " + stale.commit());       // CONFLICT

        // stress: 4 threads x 250 increments, each retrying on conflict -> exactly 1000 added
        VersionedStore s2 = new VersionedStore();
        s2.data.put("counter", new VersionedStore.Versioned("0", 1));
        ExecutorService pool = Executors.newFixedThreadPool(4);
        for (int th = 0; th < 4; th++) pool.submit(() -> {
            for (int i = 0; i < 250; i++) {
                while (true) {
                    Session t = s2.begin();
                    t.set("counter", String.valueOf(Integer.parseInt(t.get("counter")) + 1));
                    if (t.commit().equals("OK")) break;
                }
            }
        });
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("stress counter = " + s2.data.get("counter").value());   // 1000
    }
}`,
    alt: [
        { lang: 'python', code: String.raw`
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Versioned:
    value: str
    version: int


class VersionedStore:
    def __init__(self) -> None:
        self.data: dict[str, Versioned] = {}
        self._commit_lock = threading.Lock()

    def begin(self) -> "Session":
        return Session(self)

    def try_commit(self, read_set: dict[str, int], write_set: dict[str, str]) -> bool:
        with self._commit_lock:                         # short critical section: validate + apply
            for key, seen in read_set.items():
                cur = self.data.get(key)
                if (cur.version if cur else 0) != seen:
                    return False                        # someone changed what we read
            for key, value in write_set.items():
                cur = self.data.get(key)
                self.data[key] = Versioned(value, (cur.version if cur else 0) + 1)
            return True


class Session:
    def __init__(self, store: VersionedStore) -> None:
        self._store = store
        self._read_set: dict[str, int] = {}
        self._write_set: dict[str, str] = {}

    def get(self, k: str) -> Optional[str]:
        if k in self._write_set:
            return self._write_set[k]                   # read your own writes
        v = self._store.data.get(k)
        self._read_set.setdefault(k, v.version if v else 0)
        return v.value if v else None

    def set(self, k: str, v: str) -> None:
        self._write_set[k] = v                          # invisible to others until commit

    def commit(self) -> str:
        return "OK" if self._store.try_commit(self._read_set, self._write_set) else "CONFLICT"


def increment(s: VersionedStore, who: str) -> None:
    for attempt in range(1, 6):
        t = s.begin()
        v = int(t.get("counter") or "0")
        t.set("counter", str(v + 1))
        r = t.commit()
        print(f"{who} attempt {attempt}: {r}")
        if r == "OK":
            return


def main() -> None:
    s = VersionedStore()
    s.data["counter"] = Versioned("5", 1)
    a, b = s.begin(), s.begin()
    va, vb = int(a.get("counter") or "0"), int(b.get("counter") or "0")
    a.set("counter", str(va + 1))
    b.set("counter", str(vb + 1))
    print(f"A: {a.commit()}, B: {b.commit()}")          # OK, CONFLICT
    increment(s, "B-retry")                             # OK on first try now
    print(f"counter = {s.data['counter'].value}")       # 7

    reader, writer = s.begin(), s.begin()
    reader.get("counter")                               # read-only session
    writer.set("other", "x")
    writer.commit()                                     # a different key: no conflict
    print(f"disjoint keys: {reader.commit()}")          # OK
    stale, bump = s.begin(), s.begin()
    stale.get("counter")
    bump.set("counter", "100")
    bump.commit()
    stale.set("flag", "1")                              # writes another key, but READ a stale counter
    print(f"read set invalidated: {stale.commit()}")    # CONFLICT

    # stress: 4 threads x 250 increments, each retrying on conflict -> exactly 1000 added
    s2 = VersionedStore()
    s2.data["counter"] = Versioned("0", 1)

    def worker() -> None:
        for _ in range(250):
            while True:
                t = s2.begin()
                t.set("counter", str(int(t.get("counter") or "0") + 1))
                if t.commit() == "OK":
                    break

    with ThreadPoolExecutor(max_workers=4) as pool:
        for _ in range(4):
            pool.submit(worker)
    print(f"stress counter = {s2.data['counter'].value}")   # 1000


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: String.raw`
interface Versioned { readonly value: string; readonly version: number; }

class VersionedStore {
  readonly data = new Map<string, Versioned>();

  begin(): Session { return new Session(this); }

  // JavaScript runs one task at a time, so validate + apply cannot interleave: no lock is needed.
  tryCommit(readSet: ReadonlyMap<string, number>, writeSet: ReadonlyMap<string, string>): boolean {
    for (const [key, seen] of readSet) {
      if ((this.data.get(key)?.version ?? 0) !== seen) return false;   // someone changed what we read
    }
    for (const [key, value] of writeSet) {
      this.data.set(key, { value, version: (this.data.get(key)?.version ?? 0) + 1 });
    }
    return true;
  }
}

class Session {
  private readonly readSet = new Map<string, number>();
  private readonly writeSet = new Map<string, string>();
  constructor(private readonly store: VersionedStore) {}

  get(k: string): string | null {
    const mine = this.writeSet.get(k);
    if (mine !== undefined) return mine;                // read your own writes
    const v = this.store.data.get(k);
    if (!this.readSet.has(k)) this.readSet.set(k, v?.version ?? 0);
    return v?.value ?? null;
  }
  set(k: string, v: string): void { this.writeSet.set(k, v); }   // invisible to others until commit
  commit(): string { return this.store.tryCommit(this.readSet, this.writeSet) ? "OK" : "CONFLICT"; }
}

const num = (s: string | null): number => Number.parseInt(s ?? "0", 10);

function increment(s: VersionedStore, who: string): void {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const t = s.begin();
    t.set("counter", String(num(t.get("counter")) + 1));
    const r = t.commit();
    console.log(who + " attempt " + attempt + ": " + r);
    if (r === "OK") return;
  }
}

async function main(): Promise<void> {
  const s = new VersionedStore();
  s.data.set("counter", { value: "5", version: 1 });
  const a = s.begin(), b = s.begin();
  const va = num(a.get("counter")), vb = num(b.get("counter"));
  a.set("counter", String(va + 1));
  b.set("counter", String(vb + 1));
  console.log("A: " + a.commit() + ", B: " + b.commit());        // OK, CONFLICT
  increment(s, "B-retry");                                       // OK on first try now
  console.log("counter = " + s.data.get("counter")!.value);      // 7

  const reader = s.begin(), writer = s.begin();
  reader.get("counter");                                         // read-only session
  writer.set("other", "x");
  writer.commit();                                               // a different key: no conflict
  console.log("disjoint keys: " + reader.commit());              // OK
  const stale = s.begin(), bump = s.begin();
  stale.get("counter");
  bump.set("counter", "100");
  bump.commit();
  stale.set("flag", "1");                                        // writes another key, but READ a stale counter
  console.log("read set invalidated: " + stale.commit());        // CONFLICT

  // stress: 4 async workers x 250 increments, each retrying on conflict -> exactly 1000 added.
  // Awaiting between the read and the commit lets the workers interleave, so conflicts really happen.
  const s2 = new VersionedStore();
  s2.data.set("counter", { value: "0", version: 1 });
  const worker = async (): Promise<void> => {
    for (let i = 0; i < 250; i++) {
      for (;;) {
        const t = s2.begin();
        const v = num(t.get("counter"));
        await Promise.resolve();
        t.set("counter", String(v + 1));
        if (t.commit() === "OK") break;
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log("stress counter = " + s2.data.get("counter")!.value);   // 1000
}

main();` },
        { lang: 'cpp', code: String.raw`
struct Versioned {
    string value;
    long long version;
};

class Session;

class VersionedStore {
    unordered_map<string, Versioned> data_;
    mutable mutex dataMu;                               // guards the map itself (readers run while a commit applies)
    mutex commitLock;
public:
    optional<Versioned> read(const string& k) const {
        lock_guard<mutex> lock(dataMu);
        auto it = data_.find(k);
        return it == data_.end() ? nullopt : optional<Versioned>(it->second);
    }
    void put(const string& k, Versioned v) { lock_guard<mutex> lock(dataMu); data_[k] = move(v); }

    Session begin();

    bool tryCommit(const map<string, long long>& readSet, const map<string, string>& writeSet) {
        lock_guard<mutex> commit(commitLock);           // short critical section: validate + apply
        for (const auto& [key, seen] : readSet) {
            auto cur = read(key);
            if ((cur ? cur->version : 0) != seen) return false;   // someone changed what we read
        }
        for (const auto& [key, value] : writeSet) {
            auto cur = read(key);
            put(key, {value, (cur ? cur->version : 0) + 1});
        }
        return true;
    }
};

class Session {
    VersionedStore& store;
    map<string, long long> readSet;
    map<string, string> writeSet;
public:
    explicit Session(VersionedStore& s) : store(s) {}

    optional<string> get(const string& k) {
        auto mine = writeSet.find(k);
        if (mine != writeSet.end()) return mine->second;          // read your own writes
        auto v = store.read(k);
        readSet.emplace(k, v ? v->version : 0);                   // emplace keeps the first version we saw
        if (!v) return nullopt;
        return v->value;
    }
    void set(const string& k, const string& v) { writeSet[k] = v; }   // invisible to others until commit
    string commit() { return store.tryCommit(readSet, writeSet) ? "OK" : "CONFLICT"; }
};

Session VersionedStore::begin() { return Session(*this); }

int num(const optional<string>& s) { return stoi(s.value_or("0")); }

void increment(VersionedStore& s, const string& who) {
    for (int attempt = 1; attempt <= 5; attempt++) {
        Session t = s.begin();
        t.set("counter", to_string(num(t.get("counter")) + 1));
        string r = t.commit();
        cout << who << " attempt " << attempt << ": " << r << "\n";
        if (r == "OK") return;
    }
}

int main() {
    VersionedStore s;
    s.put("counter", {"5", 1});
    Session a = s.begin(), b = s.begin();
    int va = num(a.get("counter")), vb = num(b.get("counter"));
    a.set("counter", to_string(va + 1));
    b.set("counter", to_string(vb + 1));
    string ra = a.commit(), rb = b.commit();
    cout << "A: " << ra << ", B: " << rb << "\n";                  // OK, CONFLICT
    increment(s, "B-retry");                                       // OK on first try now
    cout << "counter = " << s.read("counter")->value << "\n";      // 7

    Session reader = s.begin(), writer = s.begin();
    reader.get("counter");                                         // read-only session
    writer.set("other", "x");
    writer.commit();                                               // a different key: no conflict
    cout << "disjoint keys: " << reader.commit() << "\n";          // OK
    Session stale = s.begin(), bump = s.begin();
    stale.get("counter");
    bump.set("counter", "100");
    bump.commit();
    stale.set("flag", "1");                                        // writes another key, but READ a stale counter
    cout << "read set invalidated: " << stale.commit() << "\n";    // CONFLICT

    // stress: 4 threads x 250 increments, each retrying on conflict -> exactly 1000 added
    VersionedStore s2;
    s2.put("counter", {"0", 1});
    {
        vector<jthread> pool;
        for (int th = 0; th < 4; th++)
            pool.emplace_back([&s2] {
                for (int i = 0; i < 250; i++)
                    while (true) {
                        Session t = s2.begin();
                        t.set("counter", to_string(num(t.get("counter")) + 1));
                        if (t.commit() == "OK") break;
                    }
            });
    }                                                              // jthreads join when the vector is destroyed
    cout << "stress counter = " << s2.read("counter")->value << "\n";   // 1000
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;

class VersionedStore {
    public sealed class Versioned { public readonly string Value; public readonly long Version; public Versioned(string v, long ver) { Value = v; Version = ver; } }
    public readonly ConcurrentDictionary<string, Versioned> Data = new ConcurrentDictionary<string, Versioned>();
    private readonly object commitLock = new object();

    public Session Begin() { return new Session(this); }

    public bool TryCommit(Dictionary<string, long> readSet, Dictionary<string, string> writeSet) {
        lock (commitLock) {                                      // short critical section: validate + apply
            foreach (var e in readSet) {
                Versioned cur; long now = Data.TryGetValue(e.Key, out cur) ? cur.Version : 0;
                if (now != e.Value) return false;                // someone changed what we read
            }
            foreach (var kv in writeSet) {
                Versioned cur; long v = Data.TryGetValue(kv.Key, out cur) ? cur.Version : 0;
                Data[kv.Key] = new Versioned(kv.Value, v + 1);
            }
            return true;
        }
    }
}

class Session {
    private readonly VersionedStore store;
    private readonly Dictionary<string, long> readSet = new Dictionary<string, long>();
    private readonly Dictionary<string, string> writeSet = new Dictionary<string, string>();
    public Session(VersionedStore store) { this.store = store; }

    public string Get(string k) {
        string mine;
        if (writeSet.TryGetValue(k, out mine)) return mine;      // read your own writes
        VersionedStore.Versioned v;
        bool found = store.Data.TryGetValue(k, out v);
        if (!readSet.ContainsKey(k)) readSet[k] = found ? v.Version : 0;
        return found ? v.Value : null;
    }
    public void Set(string k, string v) { writeSet[k] = v; }       // invisible to others until commit
    public string Commit() { return store.TryCommit(readSet, writeSet) ? "OK" : "CONFLICT"; }
}

class OccDemo {
    static void Increment(VersionedStore s, string who) {
        for (int attempt = 1; attempt <= 5; attempt++) {
            Session t = s.Begin();
            int v = int.Parse(t.Get("counter"));
            t.Set("counter", (v + 1).ToString());
            string r = t.Commit();
            Console.WriteLine(who + " attempt " + attempt + ": " + r);
            if (r == "OK") return;
        }
    }
    static void Main() {
        VersionedStore s = new VersionedStore();
        s.Data["counter"] = new VersionedStore.Versioned("5", 1);
        Session a = s.Begin(), b = s.Begin();
        int va = int.Parse(a.Get("counter")), vb = int.Parse(b.Get("counter"));
        a.Set("counter", (va + 1).ToString());
        b.Set("counter", (vb + 1).ToString());
        Console.WriteLine("A: " + a.Commit() + ", B: " + b.Commit());     // OK, CONFLICT
        Increment(s, "B-retry");                                           // OK on first try now
        Console.WriteLine("counter = " + s.Data["counter"].Value);         // 7

        Session reader = s.Begin(), writer = s.Begin();
        reader.Get("counter");                                             // read-only session
        writer.Set("other", "x");
        writer.Commit();                                                   // a different key: no conflict
        Console.WriteLine("disjoint keys: " + reader.Commit());            // OK
        Session stale = s.Begin(), bump = s.Begin();
        stale.Get("counter");
        bump.Set("counter", "100");
        bump.Commit();
        stale.Set("flag", "1");                                            // writes another key, but READ a stale counter
        Console.WriteLine("read set invalidated: " + stale.Commit());      // CONFLICT

        // stress: 4 threads x 250 increments, each retrying on conflict -> exactly 1000 added
        VersionedStore s2 = new VersionedStore();
        s2.Data["counter"] = new VersionedStore.Versioned("0", 1);
        Thread[] ts = new Thread[4];
        for (int th = 0; th < 4; th++) {
            ts[th] = new Thread(() => {
                for (int i = 0; i < 250; i++) {
                    while (true) {
                        Session t = s2.Begin();
                        t.Set("counter", (int.Parse(t.Get("counter")) + 1).ToString());
                        if (t.Commit() == "OK") break;
                    }
                }
            });
            ts[th].Start();
        }
        foreach (Thread t in ts) t.Join(10000);
        Console.WriteLine("stress counter = " + s2.Data["counter"].Value);   // 1000
    }
}` }
      ],
      complexity: `<p>get O(1), set O(1), commit O(|readSet| + |writeSet|) under a short lock. Under high contention on one key, retries grow — then switch that key to pessimistic locking or an atomic increment command.</p>`,
      followUps: ['Shard the commit lock by key ranges; how do you avoid deadlock for multi-shard commits?', 'Turn this into MVCC snapshot reads (keep old versions, read as of the session start).', 'Add TTL: does an expiry count as a write for conflict detection?']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'In the logging framework, why is the level check done BEFORE building the LogMessage?', options: ['A disabled call then costs almost nothing — no formatting, allocation or clock read', 'Because appenders cannot handle DEBUG', 'To keep messages in order', 'The language requires it'], answer: 0, explain: 'Most DEBUG lines are disabled in production; an int comparison up front avoids all the expensive work for them.' },
    { q: 'Which pattern is <code>AsyncAppender</code> (it implements Appender and wraps another Appender)?', options: ['Decorator', 'Adapter', 'Composite', 'Facade'], answer: 0, explain: 'Same interface, wraps an instance of it, adds behaviour (queueing) before delegating — a textbook Decorator.' },
    { q: 'Logger <code>com.shop.audit</code> has <code>additive = false</code>. An ERROR logged there…', options: ['goes only to com.shop.audit\'s own handlers', 'goes to root only', 'is dropped', 'goes to every logger in the app'], answer: 0, explain: 'Additivity controls whether the climb to parent loggers continues; false stops it at this logger.' },
    { q: 'Why must MDC values be copied into the message on the calling thread when logging asynchronously?', options: ['MDC is per-thread (thread-local); the background writer thread has its own (empty) MDC', 'MDC is too large to share', 'The writer thread cannot read maps', 'To sort the keys'], answer: 0, explain: 'Thread-local state does not travel with the message. Snapshot it into the immutable message when it is created.' },
    { q: 'A topic has 6 partitions and a consumer group has 8 members. How many members receive data?', options: ['6', '8', '3', '1'], answer: 0, explain: 'Each partition is owned by exactly one member of a group, so at most 6 are busy and 2 sit idle.' },
    { q: 'A consumer processes a batch, then crashes before committing. After the rebalance, what happens to that batch?', options: ['It is delivered again from the last committed offset (at-least-once)', 'It is lost', 'It is skipped automatically', 'The broker deletes it'], answer: 0, explain: 'The committed offset is the restart point; everything after it is re-read. Hence idempotent consumers.' },
    { q: 'Which ordering guarantee does a Kafka-like log give?', options: ['Order within a partition only', 'Global order across all partitions', 'Order per consumer group across topics', 'No ordering at all'], answer: 0, explain: 'Offsets are per partition. Use the same key for events that must stay in order so they land in one partition.' },
    { q: 'What does "lag" measure for a consumer group on one partition?', options: ['Log-end offset minus committed offset', 'Number of consumers', 'Time since the topic was created', 'Committed offset minus start offset'], answer: 0, explain: 'Lag = how many messages have been written but not yet committed as processed by that group.' },
    { q: 'In the chess design, where should the rule "a move may not leave your own king in check" live?', options: ['In one MoveValidator/rule engine that simulates the move and tests king safety', 'Inside each Piece subclass', 'In the UI', 'In the Player class'], answer: 0, explain: 'It needs the whole board and applies to every piece equally, so one central place avoids six duplicated copies.' },
    { q: 'Position A: in check, zero legal moves. Position B: NOT in check, zero legal moves. Results?', options: ['A = checkmate, B = stalemate (draw)', 'Both checkmate', 'Both stalemate', 'A = stalemate, B = checkmate'], answer: 0, explain: 'Status is decided by two facts: in-check flag and whether any legal move exists.' },
    { q: 'Why does the KV store save the old value only on the FIRST write to a key inside a transaction?', options: ['ROLLBACK must restore the value from when the transaction began, not an intermediate one', 'To save memory only', 'Because later writes are ignored', 'To make COMMIT faster'], answer: 0, explain: 'If you overwrote the undo entry on every SET, rollback would restore the second-to-last value inside the transaction.' },
    { q: 'An inner transaction COMMITs while an outer one is still open. What must happen to the inner undo map?', options: ['Merge it into the parent, keeping the parent\'s existing entries (putIfAbsent)', 'Discard it', 'Overwrite the parent\'s entries', 'Apply it to the data again'], answer: 0, explain: 'The parent still needs to be able to roll back everything to its own starting point, including keys first touched by the inner transaction.' },
    { q: 'Why does a TTL store use both lazy expiry and an active sweep?', options: ['Lazy expiry guarantees correct reads; the sweep frees memory for keys nobody reads', 'Lazy expiry is only for tests', 'The sweep makes reads faster', 'They are the same thing'], answer: 0, explain: 'Without lazy checks, reads between sweeps could return expired data; without sweeps, unread expired keys would leak memory.' }
  );

  /* ======================= INTERVIEW Q&A ======================= */
  interview.push(
    { q: 'Walk me through the class design of a logging framework.', level: 'I', a: `<p>I split it by question. <b>Should we log?</b> <code>LogLevel</code> enum with severities, and a <code>Logger</code> that checks its effective level first. <b>What is logged?</b> An immutable <code>LogMessage</code> value object (level, logger, text, time, thread, MDC snapshot). <b>Where does it go?</b> A chain of <code>LogHandler</code>s, each with a min level and an <code>Appender</code> (console, file, network). <b>How does it look?</b> A <code>LogFormatter</code> strategy. A <code>LogManager</code> singleton hands out named, hierarchical loggers. Async is a Decorator around any appender.</p>`, followUps: ['Where is Chain of Responsibility used — once or twice?', 'How do you change a level at runtime safely?'] },
    { q: 'How do you make logging not slow down request threads?', level: 'A', a: `<p>Three layers. (1) <b>Cheap exit</b>: level check before formatting; placeholders or lazy callbacks (suppliers) so disabled lines build nothing. (2) <b>Async appender</b>: the request thread only offers an immutable message to a <b>bounded</b> queue; one writer thread does I/O, ideally batching (Java <code>drainTo</code>). (3) A <b>back-pressure policy</b> for a full queue: drop DEBUG/INFO and count drops, block only for ERROR, or never block. Log4j 2 async loggers use the LMAX Disruptor ring buffer for very high throughput. Always flush on shutdown with a poison pill and a bounded join.</p>`, followUps: ['What metric would you expose?', 'Why bounded and not unbounded?'] },
    { q: 'What was Log4Shell and what does it teach about designing a logger?', level: 'E', a: `<p>CVE-2021-44228: Log4j 2 performed <b>lookups</b> (like JNDI) on strings inside logged messages, so an attacker who got text such as a crafted user-agent into a log line could make the server load and run remote code. Lesson: a logger must treat message content as <b>inert data</b> — format placeholders from the pattern only, never interpret argument text; disable or sandbox any expression features; also escape newlines (log forging) and redact secrets/PII in a filter before any appender.</p>`, followUps: ['How would you test your formatter for this?', 'Why are logs also a prompt-injection risk now?'] },
    { q: 'Design a Kafka-like message queue at class level. What are the key entities?', level: 'A', a: `<p><code>Broker</code> owns <code>Topic</code>s; a topic has N <code>Partition</code>s, each an append-only list of <code>StoredMessage(offset, key, value, ts)</code>. <code>Producer</code> uses a <code>Partitioner</code> strategy (hash of key, round-robin for null). Consumption is <b>pull</b>-based: a <code>ConsumerGroup</code> coordinator assigns each partition to one member and rebalances on join/leave; each <code>GroupConsumer</code> keeps an in-memory position per partition and commits offsets to the broker keyed by (group, topic, partition). Retention deletes old segments. Messages are never deleted on read — that enables replay and many independent groups.</p>`, followUps: ['Where do you store committed offsets and why there?', 'How do you add retention without breaking consumers?'] },
    { q: 'Explain at-most-once, at-least-once and exactly-once delivery.', level: 'I', a: `<p>It depends on <b>when you commit</b> relative to processing. Commit first, then process → a crash loses the message: <b>at-most-once</b>. Process first, then commit → a crash re-delivers: <b>at-least-once</b> (the common default; make handlers idempotent with a dedupe key). <b>Exactly-once</b> needs the processing result and the offset to be committed atomically — Kafka transactions with an idempotent producer for read-process-write inside Kafka, or storing the offset in the same database transaction as the result for external sinks.</p>`, followUps: ['How does an idempotent producer avoid duplicates on retry?', 'Give a use case where at-most-once is fine.'] },
    { q: 'How do you keep events for the same order in sequence while scaling consumers?', level: 'I', a: `<p>Use the <b>order id as the message key</b>. The partitioner maps the same key to the same partition, a partition is consumed by exactly one member of the group, and offsets within a partition are strictly ordered — so one consumer sees that order\'s events in order, while different orders spread across partitions and consumers. Caveats: changing the partition count remaps keys; retries that move a message to a retry topic break order unless you park the whole key; hot keys can overload one partition.</p>`, followUps: ['What happens to ordering during a rebalance?', 'How would you handle a hot key?'] },
    { q: 'What happens during a consumer-group rebalance and how can it hurt you?', level: 'A', a: `<p>When a member joins, leaves or misses heartbeats, the coordinator recomputes partition ownership. Members must stop processing revoked partitions and <b>commit what they finished</b> before giving them up; new owners resume from the committed offsets, so uncommitted work is redone. Old eager rebalances paused the whole group ("stop the world"); cooperative-sticky assignment moves only the partitions that must move, static membership avoids rebalances on quick restarts, and Kafka 4.0's new server-side consumer protocol (KIP-848) makes rebalances incremental by design. Long processing beyond <code>max.poll.interval.ms</code> triggers spurious rebalances.</p>`, followUps: ['How do you avoid processing a partition you no longer own?', 'Range vs round-robin vs sticky assignors?'] },
    { q: 'Design Chess. Where do you put move validation?', level: 'A', a: `<p>Three layers. <b>Pieces</b> (abstract <code>Piece</code> with Rook/Bishop/Queen sharing <code>slide</code>, King/Knight sharing <code>jumps</code>, Pawn special) generate <b>pseudo-legal</b> moves: shape, blocking, no own-piece capture. A <b>MoveValidator</b> filters them: apply each on a board copy and reject if the mover\'s king is attacked — this single rule handles pins, walking into check and answering check. <b>Game</b> handles turn order, special-move state (castling rights, en-passant square on the Board), status (check/checkmate/stalemate), history and undo. Players are a Strategy (human, bot).</p>`, followUps: ['Why are pieces immutable in your design?', 'How do you test the move generator (perft)?'] },
    { q: 'How do you detect checkmate and stalemate?', level: 'I', a: `<p>After each move, for the side to move compute two facts: <b>in check?</b> (is their king square attacked by the opponent) and <b>has any legal move?</b> (generate pseudo-legal moves for every piece, simulate, keep those that leave the king safe — stop at the first one found). In check + no moves = checkmate; not in check + no moves = stalemate (draw); otherwise check or normal play. Other draws need extra state: 50-move counter, threefold repetition via Zobrist hashes, insufficient material.</p>`, followUps: ['Why can a double check only be answered by a king move?', 'How would you make this faster for an engine?'] },
    { q: 'How would you implement undo in chess (and in general)?', level: 'I', a: `<p>Two classic options. <b>Memento</b>: push a snapshot of the board (cheap when pieces are immutable — a 64-slot copy plus castling rights and en-passant square) before each move; undo = pop. <b>Command</b>: each <code>Move</code> stores what it needs to reverse itself — captured piece, previous castling rights, previous en-passant square, promotion flag — and has <code>execute/undo</code>. Snapshots are simpler and safer; commands use less memory and are what engines use (make/unmake) because search makes millions of moves. Redo is a second stack.</p>`, followUps: ['Which info does en passant add to the undo record?', 'How does undo interact with a chess clock?'] },
    { q: 'Design an in-memory key-value store with nested transactions.', level: 'A', a: `<p>Data in a hash map. A stack of <b>undo maps</b>: BEGIN pushes an empty map; every write first records the key\'s old value in the top map with <code>putIfAbsent</code> (absent = tombstone), then writes to the data. ROLLBACK pops and restores those keys. COMMIT pops and merges the undo entries into the parent with putIfAbsent, so the parent can still roll back to its own start. Reads are O(1); transaction cost is proportional to keys touched. A value→count index answers COUNT in O(1) as long as every mutation goes through one private method. If clients need isolation, switch to per-session overlays or MVCC.</p>`, followUps: ['What breaks if COMMIT overwrites the parent\'s entries?', 'Undo log vs overlay: which gives isolation?'] },
    { q: 'How do you implement key expiry (TTL) efficiently and testably?', level: 'I', a: `<p>Store an absolute <code>expireAt</code> per key. <b>Lazy</b> expiry: on every access, if <code>now ≥ expireAt</code> delete and report missing — this guarantees correctness. <b>Active</b> expiry frees memory for keys no one reads: a min-heap (or timing wheel) of (expireAt, key) popped by a periodic task, skipping stale items whose expireAt no longer matches; Redis instead samples random keys with TTLs. Inject a clock interface so tests advance time instantly. Rollback restores the whole entry including expireAt; persistence stores absolute times so restarts do not extend lifetimes.</p>`, followUps: ['Heap vs timing wheel vs sampling?', 'What does TTL return for a key without expiry?'] },
    { q: 'Redis MULTI/EXEC vs the BEGIN/ROLLBACK store we built — what is different?', level: 'E', a: `<p>Redis <code>MULTI</code> <b>queues</b> commands; <code>EXEC</code> runs them all atomically (no other client\'s command interleaves, since execution is single-threaded); <code>DISCARD</code> drops the queue. There is <b>no rollback</b> of commands that already executed — if one command fails at runtime, the others still apply. Reads inside MULTI return results only at EXEC, so you cannot branch on them; for read-modify-write you use <code>WATCH</code> (optimistic: EXEC aborts if a watched key changed) or a Lua script / function. Our design executes immediately and keeps an undo log, giving rollback but no isolation.</p>`, followUps: ['How would you implement WATCH in our store?', 'When would you use a Lua script instead?'] },
    { q: 'In a 90-minute machine-coding round on any of these four systems, how do you plan your time?', level: 'B', a: `<p>About <b>10 min</b> clarifying scope out loud (must-haves vs extensions, concurrency needs, in-memory OK?). <b>10 min</b> class diagram and core interfaces (name the patterns: Chain, Strategy, Decorator, Memento, Command). <b>45 min</b> code the core path end to end with a runnable <code>main</code> — inject time, keep state in one place, no premature threading. <b>15 min</b> tests/demo of tricky cases (nested rollback, pin, crash before commit, queue full). <b>10 min</b> extensions and trade-offs: thread safety, persistence, scale-out. Working, readable code with clear extension points beats a half-finished "complete" design.</p>`, followUps: ['What would you cut first if time runs short?', 'How do you show extensibility without coding every feature?'] }
  );

  registerModule({
    id: 'lld12',
    title: 'Expert Case Studies: Logger, Pub-Sub, Chess, KV Store',
    intro: `<p>This is the last and hardest stop on the LLD track: four <b>expert machine-coding case studies</b> that companies like Amazon, Uber, Flipkart, Google and Stripe actually ask, each built end to end as a runnable program in Java, Python, TypeScript and C++.</p>
<ul>
<li><b>Logging framework</b>: levels, a hierarchy of named loggers, a <b>chain of responsibility</b> of handlers, appenders and formatters, MDC, and an async decorator with a drop policy.</li>
<li><b>Kafka-like pub-sub queue</b>: topics, partitions, offsets, key-based ordering, consumer groups, rebalancing, commits and re-delivery, and retention.</li>
<li><b>Chess</b>: board and pieces, move validation in two stages (piece rule, then king safety), check, checkmate, stalemate, castling, en passant, promotion and undo.</li>
<li><b>In-memory key-value store</b>: nested BEGIN/ROLLBACK/COMMIT with undo logs, an O(1) COUNT index, and TTL with lazy plus active expiry.</li>
</ul>
<p>Every topic starts from a <b>naive design</b> and shows exactly where it breaks. Then you get the class diagram as an animated visualizer, a message, move or command flowing through the system step by step, full core code, worked examples, deep dives into how the real systems (Log4j/Logback, Kafka, chess engines, Redis) do it, and a section on how AI changes the work. You finish with 15 machine-coding practice problems.</p>`,
    goals: [
      'Design a <b>logging framework</b> from scratch: levels, hierarchical loggers with additivity, a handler chain (Chain of Responsibility), appenders/formatters (Strategy), an async appender (Decorator) with a back-pressure policy, and MDC.',
      'Design a <b>Kafka-like pub-sub log</b>: partitioning by key, offsets, consumer groups and rebalancing, committed offsets vs positions, lag, and at-most/at-least/exactly-once delivery, all as runnable code in four languages.',
      'Design <b>Chess</b> with clean separation of piece movement rules, a central legality check (copy-make + king safety), special moves, check/checkmate/stalemate detection, undo, and perft-based testing.',
      'Design an <b>in-memory KV store</b> with nested transactions (undo log vs overlay vs MVCC), an O(1) value index, and TTL using lazy plus active expiry with an injected clock.',
      'Handle the expert follow-ups with confidence: thread safety, back-pressure, crash recovery, isolation, persistence, and "add a new feature without editing old classes".'
    ],
    prereqs: `<p>LLD 1–7 (OOP modelling, SOLID, the core design patterns, especially Chain of Responsibility, Strategy, Decorator, Command, Memento and Observer, and the LLD interview framework), LLD 10 (Concurrency in LLD: locks, blocking queues, producer–consumer) and LLD 11 (extensible architecture) are strongly recommended. You should be comfortable with Java 17+ records, enums, switch expressions, collections (<code>HashMap</code>, <code>ArrayDeque</code>, <code>PriorityQueue</code>, <code>ConcurrentHashMap</code>) and basic threads.</p>`,
    hours: 22,
    langNotes: {
      java: `<p><b>Interfaces vs abstract classes.</b> Use an <code>interface</code> for roles that vary (<code>Appender</code>, <code>LogFormatter</code>, <code>Partitioner</code>, <code>Ticker</code>) and an <code>abstract class</code> where the parent owns a fixed algorithm and children fill one gap: <code>LogHandler.handle()</code> is the template method and <code>Piece</code> shares <code>slide</code> and <code>jumps</code>. <b>Equality, hashing and immutability.</b> A <code>record</code> generates <code>equals</code>, <code>hashCode</code> and <code>toString</code>, so <code>Position</code>, <code>TopicPartition</code> and <code>LogMessage</code> are safe map keys and safe to share; copy mutable inputs with <code>Map.copyOf</code> or <code>List.copyOf</code> so a message cannot change later. <b>Concurrency.</b> <code>synchronized</code> for a locked facade, <code>ConcurrentHashMap</code> for registries, <code>ArrayBlockingQueue</code> (<code>offer</code> drops, <code>put</code> blocks), <code>AtomicLong</code> for counters, <code>volatile</code> for a level changed at run time, <code>ThreadLocal</code> for MDC, and <code>wait/notifyAll</code> inside a monitor. A daemon thread, a poison pill and a bounded <code>join</code> give a shutdown that cannot hang. <b>Numbers and heaps.</b> <code>int</code> overflow wraps silently, so <code>Math.abs(Integer.MIN_VALUE)</code> is still negative: use <code>Math.floorMod</code> for partitions. <code>PriorityQueue</code> is a min-heap, which is what the expiry heap needs. Use <code>String.format</code> for padding.</p>`,
      python: `<p><b>Interfaces vs abstract classes.</b> <code>abc.ABC</code> with <code>@abstractmethod</code> is the nominal interface (an abstract body may be <code>...</code>); <code>typing.Protocol</code> fits one-method roles such as <code>Ticker</code> and <code>Clock</code> because only the shape matters. Python has no <code>final</code>, so the template method <code>LogHandler.handle</code> is a plain method that subclasses are asked not to override. Method names are the Java names in <code>snake_case</code>. <b>Equality, hashing and immutability.</b> <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code>, so <code>Position</code> and <code>TopicPartition</code> are dictionary keys; a dict stored inside a frozen dataclass is still mutable, so wrap it in <code>MappingProxyType</code>. <b>Concurrency.</b> The GIL does not make <code>x += 1</code> atomic, so counters get a <code>Lock</code>. <code>queue.Queue</code> offers <code>put_nowait</code> (drop) and <code>put</code> (block), <code>threading.Condition</code> replaces <code>wait/notifyAll</code>, <code>threading.local</code> is the MDC, and threads cannot be interrupted, so stop them with an <code>Event</code> or a poison pill. <b>Numbers and heaps.</b> Integers never overflow, so Java's <code>String.hashCode</code> is rebuilt with <code>&amp; 0xFFFFFFFF</code> and a sign fix, and <code>%</code> is already a floor-mod. <code>heapq</code> is a min-heap of tuples such as <code>(expire_at, key)</code>. Use <code>collections.deque</code>, never <code>list.pop(0)</code>, for queues.</p>`,
      js: `<p><b>TypeScript.</b> <b>Interfaces vs abstract classes.</b> An <code>interface</code> exists only at compile time: use it for roles (<code>Appender</code>, <code>LogFormatter</code>, <code>Clock</code>) and for plain data (<code>LogMessage</code>, <code>Entry</code>); use an <code>abstract class</code> for the template method in <code>LogHandler</code> and for <code>Piece</code>. A numeric <code>enum</code> has a reverse mapping (<code>LogLevel[20]</code> is <code>"INFO"</code>), so <code>level &gt;= min</code> is the whole level check. <b>Equality, hashing and immutability.</b> <code>===</code>, <code>Map</code> and <code>Set</code> compare objects by identity, so key by a string (<code>"orders-0"</code>) or give the class an <code>equals</code> method (<code>Position</code>); <code>readonly</code> and <code>Object.freeze</code> are shallow. <b>Concurrency.</b> Node runs one task at a time, so there are no data races, but code interleaves at every <code>await</code>: finish check-then-act before awaiting (the optimistic-commit stress test awaits between read and commit on purpose, to force conflicts). A background writer is an async loop that sleeps on a promise, <code>setTimeout</code> defers work, and a caller can never be blocked, so a bounded queue drops (or grows for WARN+) instead of waiting. There is no thread-local (use <code>AsyncLocalStorage</code>) and no built-in heap, so the module includes a small <code>MinHeap</code> class. <b>Numbers.</b> <code>number</code> is a double: <code>Math.imul</code> and <code>| 0</code> reproduce 32-bit hashing, and <code>%</code> keeps the sign of the left operand, so write <code>((a % n) + n) % n</code>. <code>Array.prototype.shift</code> is O(n); use an index for long queues.</p>`,
      cpp: `<p><b>Interfaces vs abstract classes.</b> A class of pure virtual functions is the interface (<code>Appender</code>, <code>LogFormatter</code>, <code>Ticker</code>); always give a polymorphic base a <b>virtual destructor</b> and mark overrides with <code>override</code>. For the template method keep the public <code>handle()</code> non-virtual and the hook (<code>write</code>) pure virtual. <b>Ownership and lifetimes.</b> A chain of handlers is a chain of <code>std::unique_ptr</code> (each link owns the next); the registry owns its <code>unique_ptr&lt;Logger&gt;</code> and hands out references; pieces are immutable, so a board stores <code>shared_ptr&lt;const Piece&gt;</code> and copying a board copies only pointers. A reference must not outlive its owner (<code>ConsumerGroup::leave</code> destroys the consumer it removes). A class that owns a <code>std::thread</code> joins it in the destructor (RAII) or uses <code>std::jthread</code>. <b>Equality, hashing and immutability.</b> <code>operator==</code> and <code>operator&lt;=&gt;</code> can be <code>= default</code>, which makes <code>Position</code> comparable and <code>TopicPartition</code> a <code>std::map</code> key; <code>const</code> members make a message immutable. <b>Concurrency.</b> <code>std::mutex</code> with <code>lock_guard</code>, <code>condition_variable</code> (always pass a predicate to <code>wait</code>), <code>std::atomic</code>, <code>thread_local</code> for MDC, and <code>recursive_mutex</code> when a locked method calls another locked method. <b>Numbers and heaps.</b> Signed overflow is undefined behaviour, so hash with <code>uint32_t</code>; <code>%</code> keeps the sign of the left operand. <code>priority_queue</code> is a max-heap, so the expiry heap uses <code>greater&lt;&gt;</code>. <code>delete</code> is a keyword, so the store's method is <code>del</code>.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
