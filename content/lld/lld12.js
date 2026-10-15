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
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
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

        System.out.println("file got  " + file.lines().size() + " lines: " + file.lines());
        System.out.println("pager got " + pager.lines().size() + " line: " + pager.lines());
        System.out.println("same object? " + (lm.getLogger("com.shop.db") == db));

        // Async decorator with a tiny queue: DEBUG/INFO may be dropped, WARN+ never.
        MemoryAppender slowDisk = new MemoryAppender(new PlainFormatter());
        AsyncAppender async = new AsyncAppender(slowDisk, 4);
        for (int i = 0; i < 50; i++)
            async.append(new LogMessage(i % 10 == 0 ? LogLevel.WARN : LogLevel.INFO, "load", "msg " + i,
                                        0, "main", Map.of()));
        async.close();
        System.out.println("async wrote " + slowDisk.lines().size() + ", dropped " + async.dropped()
                           + " (total 50, all 5 WARNs kept)");
    }
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
      { narr: '<b>LogMessage</b> is an immutable <code>record</code>: level, logger name, text, time, thread and MDC context. Immutable matters because the same object is shared by many handlers and maybe a background thread.', on: ['MSG', 'LVL'], edges: ['LG-MSG', 'MSG-LVL'] },
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
  ['<code>LogMessage</code> (record)', 'Immutable bundle: level, logger name, text, time, thread, context', 'Value object'],
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
      '"Attach requestId/userId to every log line" → MDC (ThreadLocal context).',
      '"Thread-safe" → immutable LogMessage, synchronized or single-writer appenders, ConcurrentHashMap registry.'
    ],
    code: [LOG_CORE],
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
      { title: 'Adding a Slack appender without touching the core', html: `<p>Product wants ERRORs in a Slack channel. With the good design this is <b>one new class and one line of config</b>. Logger, LogHandler and every existing appender stay untouched — that is Open/Closed in action.</p>`, code: String.raw`
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
}` },
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
])}`, code: String.raw`
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
}` },
      { title: 'Async appender under load: drop or block?', html: `<p>Queue capacity 4, a burst of 50 messages (45 INFO, 5 WARN), slow disk. Policy: <b>WARN+ blocks</b> until there is space; <b>INFO is dropped</b> when full (and counted). Result in the demo: all 5 WARNs written, some INFOs dropped, the count printed so operators know. Logback\'s <code>AsyncAppender</code> does something very similar: when the queue is 80% full it discards TRACE/DEBUG/INFO by default (<code>discardingThreshold</code>), and <code>neverBlock=true</code> drops instead of blocking.</p>` }
    ],
    deepDive: `<p><b>1. The cost model.</b> A disabled log call must be almost free. Order inside <code>log()</code>: (a) compare two ints, (b) only then format, allocate, read the clock, copy MDC. That is why APIs offer <code>log.debug("x={}", x)</code> (no concatenation unless enabled) and <code>log.debug(() -&gt; expensive())</code> (Supplier, lazy). <code>log.debug("x=" + x)</code> builds the string even when DEBUG is off.</p>
<p><b>2. Thread safety.</b> The message is immutable, so sharing it is safe. Appenders are the shared mutable part: a file appender must not interleave two half-lines. Options: <code>synchronized append</code> (simple, contention under load), a <b>single writer thread</b> fed by a queue (AsyncAppender), or a lock-free ring buffer — Log4j 2\'s async loggers use the <b>LMAX Disruptor</b> and reach millions of messages per second.</p>
<p><b>3. Back-pressure policy is a product decision.</b> When the queue is full you can block (never lose logs, but slow requests), drop (fast, lossy), or drop low levels first. Always <b>count drops</b> and expose the number as a metric. On shutdown, flush with a <b>poison pill</b> and a <b>bounded join</b> so the JVM can still exit.</p>
<p><b>4. MDC and async.</b> MDC uses a <code>ThreadLocal</code>, so it must be <b>snapshotted into the message</b> on the calling thread — the background writer thread has a different (empty) MDC. Thread pools reuse threads, so always <code>MDC.clear()</code> in a finally block or you leak one user\'s requestId into another user\'s logs.</p>
<p><b>5. Security: Log4Shell (CVE-2021-44228).</b> Log4j 2 evaluated <code>$&#123;jndi:ldap://...}</code> lookups inside <i>logged data</i>, so an attacker who could get a string logged could run code. Lesson for your design: the formatter must treat user text as <b>plain data</b>, never as instructions. Also redact secrets/PII in a formatter or filter, and escape newlines to stop log-forging (fake extra lines).</p>
<p><b>6. Production extras.</b> Rolling files by size/time with retention; structured JSON logs shipped to ELK/Loki/Datadog; sampling for very chatty DEBUG; SLF4J as a <b>facade</b> so libraries never pick the backend; per-logger levels changeable at runtime (JMX/actuator) — which is why <code>level</code> is <code>volatile</code> in the code above.</p>`,
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
        code: String.raw`
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
}`
      },
      mcq: { q: 'Product asks: "send WARN and above to a new Kafka topic." In the good design, what changes?', options: ['Add a KafkaSink class and link it into the chain via config', 'Edit Logger.log() to add a Kafka branch', 'Add a boolean toKafka flag to every logger', 'Subclass Logger as KafkaLogger'], answer: 0, explain: 'A new sink is a new class implementing the sink interface, linked into the chain. Nothing existing is edited — Open/Closed.' },
      hints: [
        `<p>Separate the three questions: <b>should</b> we log (level gate), <b>where</b> (sinks), <b>how it looks</b> (formatter). Each becomes its own type.</p>`,
        `<p>Give each sink a <code>next</code> pointer and a <code>minLevel</code>. <code>handle(msg)</code>: write if <code>msg.level ≥ minLevel</code>, then <code>next.handle(msg)</code>. Use an enum with ordinal/severity for levels.</p>`,
        `<p>Edge cases: logger gate before building strings (use <code>Supplier&lt;String&gt;</code>), synchronized writes in sinks, null <code>next</code> at the end of the chain. Recipe: enum Level → record Msg → interface Formatter → abstract Sink(chain) → Logger(gate + head) → demo.</p>`
      ],
      solution: {
        approach: `<p>Level enum with severities; an immutable message record; a <code>Formatter</code> strategy; an abstract <code>Sink</code> forming a chain where each link writes if the level is high enough and always forwards; a <code>Logger</code> that checks its own level first and only then builds the message lazily. Sinks are in-memory lists with synchronized writes. Adding a sink = one subclass + one <code>linkWith</code> call.</p>`,
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
        SimpleLogger quiet = new SimpleLogger(Level.INFO, new FileSink(Level.INFO, plain));
        FileSink sink = new FileSink(Level.INFO, plain);
        SimpleLogger multi = new SimpleLogger(Level.INFO, sink);
        ExecutorService pool = Executors.newFixedThreadPool(4);
        for (int t = 0; t < 4; t++) pool.submit(() -> { for (int i = 0; i < 100; i++) multi.info("x" + i); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("concurrent lines = " + sink.lines().size());   // 400
        quiet.debug("not built");
    }
}`,
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
record TopicPartition(String topic, int partition) { }

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
    }
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
    code: [MQ_CORE],
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
      { title: 'At-least-once + idempotent consumer = effectively once', html: `<p>Commit after processing; if the same message comes twice, skip it using a store of processed ids. In real systems the "processed ids" check and the side effect are written in the <b>same database transaction</b>.</p>`, code: String.raw`
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
}` },
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
<p><b>6. Concurrency in your LLD code.</b> Make <code>Partition.append/read</code> synchronized (or use a lock per partition — never one global lock). Offsets per group live in a <code>ConcurrentHashMap</code>. For blocking consumers, use <code>wait/notifyAll</code> or a <code>Condition</code> with a timeout (long polling), and always provide <code>shutdown()</code> that interrupts and joins with a bound so tests never hang.</p>`,
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
        code: String.raw`
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
}`
      },
      mcq: { q: 'Subscriber B is 100× slower than A. In the log + offset design, what happens?', options: ['B\'s offset falls behind (lag grows); A and the publisher are unaffected', 'The publisher blocks until B catches up', 'A must wait for B to keep order', 'Messages are dropped for B'], answer: 0, explain: 'Each subscriber reads from the shared log at its own offset on its own thread. Slowness shows up as lag, not as back-pressure on others (until retention deletes data B has not read).' },
      hints: [
        `<p>Store each message <b>once</b> per topic in an append-only list. A subscriber is just "a thread + an offset".</p>`,
        `<p>Worker loop: <code>off = topic.awaitReadable(offset)</code> (wait while offset ≥ size, re-reading the offset after every wake-up), consume, then advance. <code>publish</code> appends and calls <code>notifyAll()</code>. Use <code>AtomicInteger</code> for the offset so <code>resetOffset</code> from another thread is safe (compareAndSet when advancing).</p>`,
        `<p>Edge cases: reset while a message is being processed (CAS keeps the reset), subscriber throws (catch, log, continue or move to a dead-letter list), shutdown (interrupt workers; <code>wait()</code> throws InterruptedException; join with timeout). Recipe: TopicLog{list, publish, awaitReadable, get} → Worker{sub, offset, run} → Queue{topics, workers, publish, subscribe, reset, shutdown}.</p>`
      ],
      solution: {
        approach: `<p>One <code>TopicLog</code> per topic holds messages in an <code>ArrayList</code> guarded by its monitor. Each subscription is a <code>SubscriberWorker</code> thread with an <code>AtomicInteger</code> offset. The worker blocks in <code>awaitReadable(offset)</code> using <code>wait()</code> until a message exists at its <i>current</i> offset (re-read on every wake-up, so a reset is never missed), consumes it, then advances with <code>compareAndSet(off, off + 1)</code> so a concurrent <code>resetOffset</code> is never overwritten. <code>publish</code> = append + <code>notifyAll</code>. <code>shutdown</code> interrupts all workers and joins with a timeout.</p>`,
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
    SubscriberWorker(TopicLog topic, Subscriber sub) { this.topic = topic; this.sub = sub; }
    public void run() {
        try {
            while (!Thread.currentThread().isInterrupted()) {
                int off = topic.awaitReadable(offset);
                String msg = topic.get(off);
                try { sub.consume(msg); }
                catch (Exception e) { System.out.println(sub.id() + " failed on " + msg + ": " + e.getMessage()); }
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
    final String id; final long delayMs; final CountDownLatch latch;
    final List<String> got = Collections.synchronizedList(new ArrayList<>());
    RecordingSub(String id, long delayMs, CountDownLatch latch) { this.id = id; this.delayMs = delayMs; this.latch = latch; }
    public String id() { return id; }
    public void consume(String m) throws Exception { if (delayMs > 0) Thread.sleep(delayMs); got.add(m); latch.countDown(); }
}

class PubSubSolution {
    public static void main(String[] args) throws Exception {
        MessageQueue q = new MessageQueue();
        q.createTopic("orders");
        CountDownLatch done = new CountDownLatch(9);              // A: 3 + 3 replayed, B: 3
        RecordingSub a = new RecordingSub("A", 0, done);
        RecordingSub b = new RecordingSub("B", 5, done);
        q.subscribe("orders", a);
        q.subscribe("orders", b);
        long t = System.nanoTime();
        for (String m : List.of("m1", "m2", "m3")) q.publish("orders", m);
        System.out.println("publish took " + (System.nanoTime() - t) / 1000 + " us (not blocked by slow B)");
        while (a.got.size() < 3) Thread.sleep(1);
        q.resetOffset("orders", "A", 0);                          // replay for A only
        boolean ok = done.await(2, TimeUnit.SECONDS);
        System.out.println("all delivered=" + ok + " A=" + a.got + " B=" + b.got);
        q.shutdown();
        System.out.println("shutdown complete");
    }
}`,
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
    frames.push(F('Game status for ' + sideName + ': run the same funnel for <b>every</b> piece → <b>' + total + '</b> legal move(s) in total. ' + (status === 'CHECKMATE' ? H.c('r', 'In check with no legal moves = CHECKMATE.') : status === 'STALEMATE' ? H.c('y', 'Not in check but no legal moves = STALEMATE (draw).') : 'The game goes on (' + status + ').') + ' (This visualizer skips castling and en passant; the Java code handles both.)', [chGrid(b, hl), TABLE('Status rule', ['in check?', 'any legal move?', 'status'], [['no', 'yes', 'ACTIVE'], ['yes', 'yes', 'CHECK'], ['yes', 'no', 'CHECKMATE'], ['no', 'no', 'STALEMATE']], one(['ACTIVE', 'CHECK', 'CHECKMATE', 'STALEMATE'].indexOf(status), 'sel'))]));
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
    code: [CHESS_CORE],
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
])}<p>Five legal moves out of eight pseudo-legal ones. Load this exact position in the visualizer (it is the default input).</p>` },
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
      { title: 'perft: how engine authors prove move generation is right', html: `<p><b>perft(d)</b> counts all positions reachable in exactly d plies. Known values from the start: <b>20, 400, 8,902, 197,281, 4,865,609</b>. If your generator prints 8,902 at depth 3, pawns, knights, bishops, checks and pins are almost certainly right. Special "tricky" positions (like "Kiwipete") exercise castling, en passant and promotion. The Java demo above computes depths 1–3 as a built-in self test — a great thing to mention in an interview.</p>` }
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
        code: String.raw`
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
}`
      },
      mcq: { q: 'Your king is in check from a bishop. Which approach correctly finds ALL legal replies (block, capture, king move)?', options: ['Simulate every pseudo-legal move on a copy and keep those where the king is not attacked', 'Only generate king moves', 'Only generate captures of the checking piece', 'Generate moves normally; check is handled at the end of the game'], answer: 0, explain: 'Copy-make + isAttacked covers blocks, captures and king moves uniformly, including double checks where only king moves work.' },
      hints: [
        `<p>Separate <b>can this piece reach that square</b> (per-piece rule) from <b>is my king safe afterwards</b> (one global check). The second needs no knowledge of piece types except for computing attacks.</p>`,
        `<p>Store rules in a <code>Map&lt;Character, MoveRule&gt;</code> (Strategy registry). Sliders use a shared <code>pathClear</code> that walks one step at a time with <code>Integer.signum</code>. For king safety: copy the board, make the move, find your king, and ask every enemy piece\'s rule "can you reach the king square?".</p>`,
        `<p>Edge cases: from == to, empty from-square, wrong colour, capturing own piece, pawn direction depends on colour, pawn captures only diagonally and only when the target is occupied by an enemy, king capturing a defended piece (the simulation handles it). Recipe: parse → basic checks → rule.canReach → simulate → !inCheck.</p>`
      ],
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
    }
}`,
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
    }
}`;

  var KV_NODES = [
    B('CL', 'Client / CommandParser', 14, 8, 24), B('KV', 'KVStore (synchronized facade)', 48, 8, 28), B('TK', 'Ticker (clock)', 84, 8, 16),
    B('DT', 'data: Map<key, Entry>', 16, 34, 24), B('TX', 'txStack: Deque<undo map>', 48, 34, 26), B('PQ', 'expiries: min-heap', 82, 34, 20),
    B('EN', 'Entry(value, expireAt)', 16, 60, 24), B('IX', 'valueCount index', 48, 60, 20), B('EX', 'Expiry(at, key)', 82, 60, 18)
  ];
  var KV_EDGES = [['CL', 'KV', 'SET/GET/BEGIN…'], ['KV', 'TK', 'now()'], ['KV', 'DT', 'owns'], ['KV', 'TX', 'owns'], ['KV', 'PQ', 'owns'], ['DT', 'EN', 'values'], ['KV', 'IX', 'owns'], ['PQ', 'EX', 'items']];
  function kvClassViz() {
    return classTour('KV store — class diagram', KV_NODES, KV_EDGES, [
      { narr: 'The whole store is one <b>facade</b> class with four private data structures. Every public method is <code>synchronized</code>, so the four always change together (one lock = no torn updates).', on: ['KV'] },
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
<p><b>The naive design (brute force) and why it breaks:</b> on BEGIN, <code>new HashMap&lt;&gt;(data)</code>. Correct, but a store with 10 million keys copies 10 million entries for <b>every</b> BEGIN — seconds of CPU and gigabytes of memory, and nested transactions multiply it. Also the naive <code>COUNT v</code> scans every key (O(n)). The undo log only pays for keys a transaction actually <b>touches</b>, and a <code>valueCount</code> index answers COUNT in O(1).</p>
<p><b>The rule that makes nested commit correct:</b> when an inner transaction commits, move its undo entries into the parent <b>only for keys the parent has not saved yet</b> (<code>putIfAbsent</code>). Then a later rollback of the parent still restores the value from <i>before the parent began</i>. Getting this wrong is the #1 bug in this problem — the visualizer lets you test it.</p>
<p><b>TTL in one line each:</b> store absolute <code>expireAt</code> (not "seconds left"); <b>lazy</b> check on every read; <b>active</b> sweep with a min-heap ordered by expireAt (skip stale heap items whose time no longer matches the entry); inject a <b>clock</b> so tests do not sleep.</p>
<p><b>Classes:</b> <code>KVStore</code> (synchronized facade), <code>Entry(value, expireAt)</code>, <code>Expiry(at, key)</code>, <code>Ticker</code> (clock interface), and in a full answer a <code>CommandParser</code> + <code>Command</code> objects for the text protocol.</p>`,
    clues: [
      '"BEGIN / ROLLBACK / COMMIT" with "nested transactions" → stack of undo logs (or overlay layers), never a full copy.',
      '"NUMEQUALTO / COUNT of a value in O(1)" → secondary index value → count, updated in one private write method.',
      '"Keys expire after N seconds" → absolute expireAt + lazy check on read + active cleanup (heap or sampling).',
      '"Tests must be deterministic" or "do not use sleep" → inject a Clock/Ticker.',
      '"Thread-safe store" → one lock around all four structures (or lock striping + careful index updates).',
      '"Each client has its own transaction" → per-session overlay write-sets, or optimistic WATCH-style versioning.',
      '"Design Redis-lite" → command parsing (Command pattern), data structures, expiry, persistence (AOF/snapshot) as follow-ups.'
    ],
    code: [KV_CORE],
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
      { title: 'Overlay design (per-session isolation) in a few lines', html: `<p>When several clients have their own transactions, writes must stay invisible to others until commit. Keep a stack of <b>write-sets</b>; reads search from the top; a tombstone marks deletes; commit merges the top layer down.</p>`, code: String.raw`
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
}` },
      { title: 'COUNT with an index vs a scan', html: `<p>Keys a=10, b=10, c=20. <code>COUNT 10</code>:</p>${H.kv([['10', '2'], ['20', '1']], { label: 'valueCount' })}<p>Scan: look at all n keys → O(n) per query. Index: one map lookup → O(1). The price: every write, delete, rollback and expiry must update the index — which is why the code funnels <b>all</b> changes through <code>writeRaw()</code>. Remove a counter when it reaches 0 so the index does not leak memory.</p>` },
      { title: 'TTL + transactions: what does rollback restore?', html: `<p><code>SET session s1 EX 10</code> (expireAt = 10 s). At 3 s: <code>BEGIN; SET session s2</code> (no TTL); <code>ROLLBACK</code>. The undo log stored the <b>whole Entry</b>, so the key gets back value s1 <b>and</b> expireAt 10 s — TTL 7 s left. If you stored only the value, rollback would silently make the key immortal. If time passes the old expireAt during the transaction, the restored entry is simply expired on the next read (lazy check) — still correct.</p>` },
      { title: 'How real Redis does it (and how it differs)', html: `${H.table(['Topic', 'Our design', 'Redis'], [
  ['Transactions', 'BEGIN/ROLLBACK with undo log', '<code>MULTI</code> queues commands, <code>EXEC</code> runs them atomically, <code>DISCARD</code> drops the queue; ' + H.c('r', 'no rollback') + ' of executed commands; <code>WATCH</code> = optimistic locking'],
  ['Active expiry', 'min-heap by expireAt', 'background cycle samples random keys with a TTL (repeats if many were expired)'],
  ['Lazy expiry', 'on GET', 'on every key access'],
  ['Concurrency', 'one lock', 'single-threaded command execution (I/O threads optional)']
])}` }
    ],
    deepDive: `<p><b>1. Why one lock is fine here, and when it is not.</b> All four structures (data, index, undo stack, heap) must change together, so a single <code>synchronized</code> facade is the simplest correct answer and is fast for in-memory ops (Redis itself executes commands on one thread). To scale: shard the keyspace into N independent stores by <code>hash(key) % N</code>, each with its own lock and heap; cross-shard transactions then need a lock ordering or 2PC — say this explicitly.</p>
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
        code: String.raw`
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
}`
      },
      mcq: { q: 'With the undo-log design, what does ROLLBACK cost?', options: ['O(number of keys the innermost transaction changed)', 'O(total keys in the database)', 'O(1) always', 'O(depth of the transaction stack × n)'], answer: 0, explain: 'Each open transaction remembers only the keys it touched (old value saved once). Rollback writes exactly those back.' },
      hints: [
        `<p>Do not copy data on BEGIN. Instead, when a key is changed inside a transaction, remember its <b>old</b> value (only the first time in that transaction).</p>`,
        `<p>Use <code>Deque&lt;Map&lt;String, String&gt;&gt;</code> of undo maps (null value = "did not exist") and a <code>Map&lt;String, Integer&gt;</code> value counter. Route every change through one <code>apply(name, newValue)</code> that updates both maps.</p>`,
        `<p>Edge cases: SET the same key twice in one transaction (keep the first old value: <code>containsKey</code> check, since the old value may be null), UNSET a missing key, ROLLBACK/COMMIT with no transaction, counters reaching zero (remove them). COMMIT here closes all transactions: simply clear the stack — data is already applied.</p>`
      ],
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
    }
}`,
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
      code: String.raw`
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
}`
    },
    mcq: { q: 'Which lookup sequence finds the effective level of <code>a.b.c</code>?', options: ['a.b.c → a.b → a → root, stop at the first configured one', 'root → a → a.b → a.b.c, take the last configured', 'Only a.b.c, else root', 'Any config key that is a substring of a.b.c'], answer: 0, explain: 'Climbing from the most specific name and stopping at the first hit gives the closest ancestor in O(depth) hash lookups. Option 2 also works but always walks the full depth.' },
    hints: [
      `<p>An ancestor is obtained by cutting at the last dot: <code>name.substring(0, name.lastIndexOf('.'))</code>. That respects the dot boundary automatically.</p>`,
      `<p>Put the config in a <code>HashMap</code>; loop: if map contains name → done; else cut the last part; when no dot is left, use root.</p>`,
      `<p>Edge cases: the logger "root" itself, names without dots, unknown levels (validate), and caching results per logger name if config rarely changes (real frameworks cache the effective level and invalidate on config reload).</p>`
    ],
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
    }
}`,
      complexity: `<p>O(D) hash lookups per query, D = number of name parts (≤ 10). Memory O(C).</p>`,
      followUps: ['Cache effective levels and invalidate on config change.', 'Support wildcards like com.*.db.']
    }
  });

  practice.push({
    title: 'Pick the Partition: Key Hash and Round-Robin',
    level: 'Easy', tags: ['pub-sub', 'hashing', 'kafka'], companies: ['Confluent', 'LinkedIn', 'Uber'],
    statement: `<p>Implement <code>int partitionFor(String key, int n)</code> for a producer: messages with a key go to <code>hash(key) mod n</code> (same key → same partition, always); messages with a <code>null</code> key are spread round-robin. The result must always be in <code>[0, n)</code>.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>4</sup>. Any String is a valid key — including ones whose <code>hashCode()</code> is negative or <code>Integer.MIN_VALUE</code>.</p>`,
    example: `<p>n = 3, keys <code>u1, null, u1, null, null</code> → u1 always the same partition; nulls go 0, 1, 2. Key <code>"polygenelubricants"</code> has <code>hashCode() == Integer.MIN_VALUE</code>: ${H.c('r', 'Math.abs gives a negative number')}, ${H.c('g', 'floorMod gives 1')}.</p>`,
    brute: {
      why: `<p><code>Math.abs(key.hashCode()) % n</code> looks right but <code>Math.abs(Integer.MIN_VALUE)</code> is still negative (it overflows), so one-in-four-billion keys produce a negative partition and crash the producer in production. A random choice for null keys also loses even spread guarantees.</p>`,
      code: String.raw`
class AbsPartitioner {
    static int partitionFor(String key, int n) { return Math.abs(key.hashCode()) % n; }
    public static void main(String[] args) {
        System.out.println("polygenelubricants".hashCode());               // -2147483648
        System.out.println(partitionFor("polygenelubricants", 3));         // negative -> invalid partition!
    }
}`
    },
    mcq: { q: 'Why does every message with key "order-42" land in the same partition?', options: ['The partition is a pure function of the key hash and the partition count', 'The broker remembers which partition each key used', 'Round-robin is applied per key', 'Consumers request it'], answer: 0, explain: 'hash(key) mod n is deterministic — as long as n does not change. That is why adding partitions reshuffles keys.' },
    hints: [
      `<p>Use <code>Math.floorMod(hash, n)</code>: it always returns a value in [0, n) even for negative hashes. Alternatively mask the sign bit: <code>(hash &amp; 0x7fffffff) % n</code>.</p>`,
      `<p>For null keys keep an <code>AtomicInteger</code> counter and use <code>floorMod(counter.getAndIncrement(), n)</code> — floorMod also protects you when the counter overflows.</p>`,
      `<p>Mention: Kafka uses murmur2 for better spread than String.hashCode, and modern Kafka uses a "sticky" partitioner for null keys (fill one batch, then switch) to improve batching.</p>`
    ],
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
    }
}`,
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
      code: String.raw`
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
}`
    },
    mcq: { q: 'Why is <code>|dr| × |dc| == 2</code> exactly the knight\'s move?', options: ['The only positive integer factorisations of 2 are 1×2 and 2×1', 'It also allows 2×2', 'It counts diagonal moves', 'It requires the path to be empty'], answer: 0, explain: '|dr|·|dc| = 2 forces one delta to be 1 and the other 2 — the L shape. Knights jump, so no path check.' },
    hints: [
      `<p>Use the 8 fixed deltas (±1, ±2) and (±2, ±1); keep only those on the board.</p>`,
      `<p>For the minimum moves, run BFS on the 64-square graph where edges are knight jumps; the first time you reach t is the answer.</p>`,
      `<p>Edge cases: s == t → 0; corners have only 2 moves. In the OOP chess design this is exactly <code>Knight.pseudoLegalMoves</code> via the shared <code>jumps(deltas)</code> helper.</p>`
    ],
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
    }
}`,
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
      code: String.raw`
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
}`
    },
    mcq: { q: 'Why store <code>expireAt = now + ttl</code> instead of <code>ttl</code>?', options: ['Checking becomes one comparison and does not drift as time passes', 'It uses less memory', 'Java requires it', 'It makes keys never expire'], answer: 0, explain: 'An absolute deadline is compared directly with the current time; a relative TTL would need its start time stored anyway.' },
    hints: [
      `<p>Define <code>interface Clock { long now(); }</code> and a <code>FakeClock</code> with <code>advance(ms)</code> for tests.</p>`,
      `<p>On <code>get</code>: if the entry exists and <code>now ≥ expireAt</code>, remove it and return null (lazy expiry). For <code>size()</code> keep a min-heap of (expireAt, key) and pop all due items first.</p>`,
      `<p>Edge cases: overwriting a key leaves a stale heap item — check the entry\'s expireAt matches before removing; ttl ≤ 0 means "no expiry"; expiry exactly at the boundary (≥, not &gt;).</p>`
    ],
    solution: {
      approach: `<p>HashMap of entries with absolute expiry; lazy removal on read; a min-heap to purge due keys before <code>size()</code>; injected clock.</p>`,
      code: String.raw`
interface Clock { long now(); }
class FakeClock implements Clock { long t; public long now() { return t; } void advance(long ms) { t += ms; } }

class TtlCache {
    private record Item(String value, long expireAt) { }
    private record Due(long at, String key) { }
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
    }
}`,
      complexity: `<p>put O(log n) with TTL (heap), get O(1), size amortised O(k log n) for k expired items.</p>`,
      followUps: ['Add LRU eviction when size exceeds a limit.', 'Make it thread-safe without one global lock (lock striping).']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'SLF4J-Style Message Formatter with {} Placeholders',
    level: 'Medium', tags: ['logging', 'strings', 'formatter'], companies: ['Atlassian', 'Salesforce'],
    statement: `<p>Implement <code>format(pattern, Object... args)</code>: each <code>{}</code> is replaced by the next argument (<code>String.valueOf</code>); <code>\\{}</code> prints a literal <code>{}</code>; missing arguments leave <code>{}</code> as is; if the <b>last</b> argument is a <code>Throwable</code> not used by a placeholder, append <code> | exception: Type: message</code>.</p>`,
    constraints: `<p>Pattern length ≤ 10<sup>4</sup>, arguments may contain any characters including <code>$</code> and <code>\\</code>. Must be O(length).</p>`,
    example: `${H.table(['Pattern / args', 'Output'], [['"user {} paid {}" / asha, $5', 'user asha paid $5'], ['"set \\\\{} to {}" / x', 'set {} to x'], ['"a {} b {}" / 1', 'a 1 b {}'], ['"failed {}" / 42, IOException("disk")', 'failed 42 | exception: IOException: disk']])}`,
    brute: {
      why: `<p>Looping <code>replaceFirst("\\{\\}", arg)</code> treats the pattern as a regex and the <b>replacement</b> as a template too: an argument like <code>$5</code> throws (it is read as "insert regex group 5"), and <code>\\</code> is eaten. Each call also rescans the whole string → O(length × args).</p>`,
      code: String.raw`
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
}`
    },
    mcq: { q: 'Why do logging APIs prefer <code>log.debug("x={}", x)</code> over <code>log.debug("x=" + x)</code>?', options: ['Formatting happens only if DEBUG is enabled', 'It is shorter to type', 'It is required by Java', 'It makes logs JSON'], answer: 0, explain: 'With concatenation the string is built before the call even if the line is then dropped; with placeholders the work happens after the level check.' },
    hints: [
      `<p>Scan the pattern once with an index and a <code>StringBuilder</code>. At each position check for <code>\\{}</code> (escape) and <code>{}</code> (placeholder).</p>`,
      `<p>Track how many arguments you used. After the scan, if the last argument is a Throwable and was not consumed, append its class simple name and message.</p>`,
      `<p>Edge cases: null args print "null", arrays (use <code>Arrays.toString</code> for Object[]), a lone <code>{</code>, pattern ending in a backslash. Never interpret argument text — that is the Log4Shell lesson.</p>`
    ],
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
    }
}`,
      complexity: `<p>O(L + total argument length). No regex, no re-scanning.</p>`,
      followUps: ['Add lazy Supplier arguments evaluated only when formatting happens.', 'Mask values whose key looks like "password" or a 16-digit card number.']
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
      code: String.raw`
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
}`
    },
    mcq: { q: 'Which structure makes "shift .1→.2→.3 and drop the oldest" O(1)?', options: ['A Deque of backups: addFirst the current file, pollLast when too many', 'An array copied on every rotation', 'A HashMap keyed by file name rebuilt each time', 'A TreeMap sorted by size'], answer: 0, explain: 'The rotated files are a sliding window of the most recent K; a Deque gives O(1) push-front and pop-back. Names are derived from position when listing.' },
    hints: [
      `<p>Keep the current file as a list and the rotated files in a <code>Deque&lt;List&lt;String&gt;&gt;</code>, newest first.</p>`,
      `<p>On append: if current is full, <code>addFirst(current)</code>, start a new list, and <code>pollLast()</code> while the deque has more than maxBackups.</p>`,
      `<p>Derive names only when listing: index i in the deque → <code>app.log.(i+1)</code>. Edge cases: maxBackups = 0 (just start fresh), thread safety (synchronized append), time-based rotation as a follow-up.</p>`
    ],
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
    }
}`,
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
      code: String.raw`
class EveryoneReadsAll {
    public static void main(String[] args) {
        List<String> consumers = List.of("c1", "c2", "c3");
        int partitions = 7, processed = 0;
        for (String c : consumers) for (int p = 0; p < partitions; p++) processed++;   // each reads all
        System.out.println("each message processed " + processed / partitions + " times");  // 3
    }
}`
    },
    mcq: { q: 'Group has 3 consumers and the topic has 2 partitions. What happens?', options: ['One consumer is idle', 'Partitions are split into halves', 'Two consumers share a partition and both get every message', 'The group refuses to start'], answer: 0, explain: 'Inside a group a partition has exactly one owner, so partitions cap the parallelism.' },
    hints: [
      `<p>Sort consumer ids so every member computes the same answer (assignment must be deterministic).</p>`,
      `<p>Range: base = P / C, extra = P % C; consumer i gets base + (i &lt; extra ? 1 : 0) partitions starting where the previous one ended. Round-robin: partition p → consumer p % C.</p>`,
      `<p>Discuss: with many topics, range assigns per topic so c1 gets the extra partition of <i>every</i> topic (skew); round-robin over all topic-partitions balances better; cooperative-sticky minimises movement on rebalance.</p>`
    ],
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
    }
}`,
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
      code: String.raw`
class LagSimulate {
    public static void main(String[] args) {
        long[] end = {120, 50, 80}, committed = {100, 50, 30};
        long lag = 0;
        for (int p = 0; p < end.length; p++)
            for (long off = committed[p]; off < end[p]; off++) lag++;     // O(messages), not O(partitions)
        System.out.println("total lag " + lag);
    }
}`
    },
    mcq: { q: 'Lag on one partition keeps growing while the others stay near 0. Most likely cause?', options: ['A hot key or a slow/poison message on that partition', 'The broker is down', 'Too many partitions overall', 'Auto-commit is disabled everywhere'], answer: 0, explain: 'Per-partition skew points to that partition: a hot key sending most traffic there, or one message that keeps failing and blocking progress.' },
    hints: [
      `<p>Everything is arithmetic on offsets: lag = end − committed, re-delivered = position − committed.</p>`,
      `<p>Use <code>long</code>, validate the ordering invariant, and return a small record per partition plus totals.</p>`,
      `<p>Production notes: lag in <i>messages</i> can mislead when messages are bursty; also report lag in <i>time</i> (age of the oldest unconsumed message). Alert on lag growth rate, not just its size.</p>`
    ],
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
        System.out.println(r);
        System.out.println("total lag " + r.stream().mapToLong(LagReport::lag).sum()
            + ", re-delivered " + r.stream().mapToLong(LagReport::redelivered).sum());   // 70, 55
    }
}`,
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
      code: String.raw`
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
}`
    },
    mcq: { q: 'Why look outward FROM the king instead of from every enemy piece?', options: ['Only 8 rays + 8 knight squares + 2 pawn squares can contain an attacker', 'Enemy pieces cannot be iterated', 'It handles castling', 'It is required for en passant'], answer: 0, explain: 'A "super-piece" placed on the king square reveals all attackers: slide like a queen and see who is at the end of each ray, jump like a knight, and check the two pawn-capture squares.' },
    hints: [
      `<p>Place an imaginary queen + knight on the king\'s square. Any enemy piece at the end of a straight ray that is a rook/queen, or at the end of a diagonal ray that is a bishop/queen, attacks the king.</p>`,
      `<p>Also check the 8 knight squares for an enemy knight, the 8 neighbours for the enemy king, and the 2 squares from which an enemy pawn would capture (for White\'s king: one rank up, since black pawns move down).</p>`,
      `<p>Stop each ray at the first piece of any colour. Return square names so the caller can tell single from double check.</p>`
    ],
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
    }
}`,
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
      code: String.raw`
class ForeverDedupe {
    private final Set<String> seen = new HashSet<>();      // grows forever
    final List<String> out = new ArrayList<>();
    void append(String m) { if (seen.add(m)) out.add(m); }
    public static void main(String[] args) {
        ForeverDedupe d = new ForeverDedupe();
        d.append("disk full"); d.append("ok"); d.append("disk full");   // an hour later: silently dropped!
        System.out.println(d.out);                                         // [disk full, ok]
    }
}`
    },
    mcq: { q: 'Which pattern lets you add de-duplication to ANY appender without editing it?', options: ['Decorator', 'Singleton', 'Builder', 'Visitor'], answer: 0, explain: 'The de-duplicator implements the same Appender interface and wraps another Appender, adding behaviour before delegating.' },
    hints: [
      `<p>You only need to remember the <b>last</b> message, when it was first seen, and how many repeats were suppressed.</p>`,
      `<p>On append: same text and within window → count++ and return. Otherwise flush the "repeated N times" line (if N &gt; 0), write the new message, and reset the state.</p>`,
      `<p>Edge cases: flush pending repeats on close(); the window is measured from the first occurrence (not sliding) so a constant stream still prints once per window.</p>`
    ],
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
    }
}`,
      complexity: `<p>O(1) time and memory per message.</p>`,
      followUps: ['Collapse per logger name instead of globally (map of states, bounded LRU).', 'Emit the repeat summary on a timer even if no new message arrives.']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Checkmate, Stalemate or Play On?',
    level: 'Hard', tags: ['chess', 'move generation', 'simulation'], companies: ['Chess.com', 'Google', 'Amazon'],
    statement: `<p>Given a board (8 strings, rank 8 first; uppercase White) and the side to move, return <code>CHECKMATE</code>, <code>STALEMATE</code>, <code>CHECK</code> or <code>ACTIVE</code>. Ignore castling and en passant (they never rescue a king from check anyway in this simplified version). Pawns may promote — treat a promotion as a normal move for counting.</p>`,
    constraints: `<p>Exactly one king per side. Must be correct for pins, blocks, captures of the checker, and double checks.</p>`,
    example: `${H.table(['Position', 'To move', 'Answer'], [['White Kh1, Pg2, Ph2; Black Kg8, Ra1', 'White', H.c('r', 'CHECKMATE')], ['White Kh1; Black Kf2, Qg3', 'White', H.c('y', 'STALEMATE')], ['Same back-rank, plus a White rook on d2', 'White', 'CHECK']])}<p>In the last line the rook can step to d1 and <b>block</b> the attack, so it is only check — a king-only test would wrongly say mate.</p>`,
    brute: {
      why: `<p>A common shortcut: "in check and the king has no safe square → checkmate". It ignores the other pieces, which can <b>capture the checker</b> or <b>block</b> the line. It also calls every no-safe-square position without check "stalemate" even when other pieces can move.</p>`,
      code: String.raw`
class KingOnlyMate {
    // brute: decide using only king moves (wrong whenever another piece can block or capture)
    public static void main(String[] args) {
        boolean inCheck = true;          // white Kh1, pawns g2 h2, black Ra1, but a WHITE ROOK on d2 can block on d1
        int kingSafeSquares = 0;
        System.out.println(inCheck && kingSafeSquares == 0 ? "CHECKMATE (wrong: Rd2-d1 blocks)" : "CHECK");
    }
}`
    },
    mcq: { q: 'Your king is attacked by two pieces at once (double check). Which replies can be legal?', options: ['Only king moves', 'Blocking either line', 'Capturing one attacker with another piece', 'Any move'], answer: 0, explain: 'One block or capture removes at most one attacker; the other still checks. The simulate-and-test approach finds this automatically.' },
    hints: [
      `<p>Status = (in check?, any legal move?). Both come from the same two tools: "is square attacked" and "enumerate legal moves".</p>`,
      `<p>Enumerate pseudo-legal moves for every piece of the side to move (sliders: rays; knight/king: jumps; pawn: forward + diagonal captures), apply each on a copy, and keep it if the king is not attacked. Stop at the first legal move — you only need to know whether one exists.</p>`,
      `<p>Edge cases: pawn double step needs both squares empty; pawn on the last rank promotes (the piece type does not matter for king safety unless it blocks — use a queen); king moves must check the destination, not the original square.</p>`
    ],
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
      code: String.raw`
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
}`
    },
    mcq: { q: 'Why does Kafka keep tombstones for a while (delete.retention.ms) instead of removing them at once?', options: ['So slow consumers still see that the key was deleted', 'To save disk space', 'Because offsets must be contiguous', 'Tombstones are never removed'], answer: 0, explain: 'A consumer rebuilding state from the topic must observe the delete; if the tombstone vanished before it read it, the consumer would keep the old value forever.' },
    hints: [
      `<p>Pass 1: map key → offset of its latest record (later records overwrite earlier ones in the map).</p>`,
      `<p>Pass 2: walk the log in order; keep a record only if its offset equals <code>latest.get(key)</code> and its value is not null.</p>`,
      `<p>Real compaction runs on closed segments only (never the active tail), in the background, and keeps the newest tombstones for a grace period. Offsets are never rewritten.</p>`
    ],
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
    public static void main(String[] args) {
        List<LogRec> out = compact(List.of(new LogRec(0, "u1", "Delhi"), new LogRec(1, "u2", "Pune"),
            new LogRec(2, "u3", "Goa"), new LogRec(3, "u1", "Mumbai"), new LogRec(4, "u2", null)));
        System.out.println(out);
        System.out.println("new head offset = " + (out.isEmpty() ? -1 : out.get(0).offset()));   // 2
    }
}`,
      complexity: `<p>O(n) time, O(distinct keys) extra memory.</p>`,
      followUps: ['Compact only records older than the active segment boundary.', 'Keep tombstones younger than T milliseconds.']
    }
  });

  practice.push({
    title: 'Consumer Retries with Exponential Backoff and a Dead-Letter Queue',
    level: 'Hard', tags: ['pub-sub', 'retry', 'priority queue', 'simulation'], companies: ['Uber', 'Stripe', 'DoorDash'],
    statement: `<p>A consumer handles messages with a handler that sometimes fails. A failed message is retried after <code>base × 2<sup>attempt−1</sup></code> ms (attempt 1 → base, 2 → 2·base, …); after <code>maxAttempts</code> failures it goes to a <b>dead-letter queue</b>. A failing ("poison") message must <b>not</b> block other messages. Simulate with a virtual clock and return the processing timeline and the DLQ.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> messages; no <code>Thread.sleep</code>; O(n log n) total.</p>`,
    example: `<p>base = 100 ms, maxAttempts = 3; m2 always fails, m3 fails once:</p>${H.table(['time', 'event'], [['0', 'm1 ok'], ['0', 'm2 fail #1 → retry at 100'], ['0', 'm3 fail #1 → retry at 100'], ['100', 'm2 fail #2 → retry at 300'], ['100', 'm3 ok'], ['300', H.c('r', 'm2 fail #3 → DLQ')]])}`,
    brute: {
      why: `<p>Retrying in place (<code>while (!ok) retry()</code>) blocks the whole partition behind one poison message — every later message waits forever (or until a human intervenes). Sleeping between retries also stalls the thread. The brute below caps itself at 1000 attempts just so the demo ends.</p>`,
      code: String.raw`
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
}`
    },
    mcq: { q: 'Why add random jitter to the backoff delay in production?', options: ['To stop many consumers retrying at the same instant and overloading the dependency', 'To make retries faster', 'Because exponential backoff overflows', 'To guarantee ordering'], answer: 0, explain: 'Without jitter, failures that happened together retry together ("thundering herd"). Jitter spreads the retries out.' },
    hints: [
      `<p>Separate the main queue from a <b>retry schedule</b>: a min-heap of (nextAttemptTime, message, attempt).</p>`,
      `<p>Event loop: process all main-queue messages at the current time; then jump the virtual clock to the earliest retry time and process the due retries; failures are rescheduled or sent to the DLQ.</p>`,
      `<p>Edge cases: maxAttempts = 1 (straight to DLQ), ties in time (use a sequence number for stable order), and note that retries break strict per-key ordering — if ordering matters, park the whole key, not just the message.</p>`
    ],
    solution: {
      approach: `<p>Discrete-event simulation: a FIFO for fresh messages, a priority queue keyed by (time, sequence) for retries, a virtual clock that jumps to the next event, and a DLQ list. Poison messages only ever occupy a heap slot, never the head of the main queue.</p>`,
      code: String.raw`
class RetryingConsumer {
    record Attempt(long at, long seq, String msg, int attempt) { }

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
      complexity: `<p>Each attempt is one heap push/pop: O(A log A) for A total attempts (≤ n · maxAttempts).</p>`,
      followUps: ['Persist the retry schedule in "retry topics" (orders.retry.1m, orders.retry.10m) like many Kafka setups.', 'Add a DLQ replay tool that re-publishes after a bug fix.']
    }
  });

  practice.push({
    title: 'Async Logger: Bounded Queue, Drop Policy and Graceful Shutdown',
    level: 'Hard', tags: ['logging', 'concurrency', 'producer-consumer'], companies: ['Amazon', 'Goldman Sachs', 'Netflix'],
    statement: `<p>Build an asynchronous logger: many threads call <code>log(line)</code>; one background writer drains a <b>bounded</b> queue into a slow sink. When the queue is full, <b>drop</b> the line and count it (callers must never block). <code>shutdown()</code> must write everything already queued, then stop, and must return within a timeout even if the sink is stuck.</p>`,
    constraints: `<p>8 producer threads × 10<sup>4</sup> lines; queue capacity 1024; shutdown ≤ 2 s; no lost lines except counted drops: <code>written + dropped == logged</code>.</p>`,
    example: `<p>Sink takes ~10 µs per line, 8 producers log 80,000 lines in a ~60 ms burst. The sink can only absorb a few thousand lines in that time, so ${H.c('g', 'a few thousand are written')} and ${H.c('y', 'the rest are dropped and counted')} — written + dropped is exactly 80,000 (the split depends on timing). Callers never wait for the sink.</p>`,
    brute: {
      why: `<p>Writing synchronously on the caller thread makes every request pay the sink\'s latency (a slow disk slows every user). The other naive fix — an <b>unbounded</b> queue with a non-daemon <code>while(true) take()</code> thread — can run out of memory under bursts and keeps the JVM from ever exiting.</p>`,
      code: String.raw`
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
}`
    },
    mcq: { q: 'Why must the async writer thread be stopped with a "poison pill" placed in the queue rather than just interrupting it?', options: ['Messages queued before the pill are still written first, so nothing accepted is lost', 'Interrupts are not allowed in Java', 'The pill is faster', 'It prevents dropping'], answer: 0, explain: 'The pill travels through the FIFO behind every accepted line, so the writer flushes them and then exits. A join with timeout guards against a stuck sink.' },
    hints: [
      `<p>Use <code>ArrayBlockingQueue</code> with <code>offer()</code> (non-blocking): if it returns false, increment an <code>AtomicLong</code> dropped counter.</p>`,
      `<p>Writer loop: <code>take()</code> until it sees the poison pill. <code>shutdown()</code>: set a closed flag (reject new logs), <code>put(POISON)</code> with a timeout, then <code>join(timeout)</code>.</p>`,
      `<p>Edge cases: logs arriving after shutdown (count as dropped), sink exceptions (catch and continue, never kill the writer), daemon thread so a forgotten shutdown cannot hang the JVM. Check the invariant written + dropped == logged in the demo.</p>`
    ],
    solution: {
      approach: `<p>Classic producer-consumer: bounded <code>ArrayBlockingQueue</code>, non-blocking <code>offer</code> with a drop counter, one daemon writer thread, poison-pill shutdown with bounded waits. Counters are atomic so the invariant can be checked.</p>`,
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
        AsyncLogger log = new AsyncLogger(1024, line -> {
            long end = System.nanoTime() + 10_000;                         // slow sink ~10 us
            while (System.nanoTime() < end) { Thread.onSpinWait(); }
        });
        ExecutorService pool = Executors.newFixedThreadPool(8);
        long t = System.nanoTime();
        for (int p = 0; p < 8; p++) pool.submit(() -> { for (int i = 0; i < 10_000; i++) log.log("line " + i); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("producers done in " + (System.nanoTime() - t) / 1_000_000 + " ms");
        System.out.println("clean shutdown: " + log.shutdown(2000));
        long w = log.written.get(), d = log.dropped.get();
        System.out.println("written + dropped = " + (w + d) + " of " + log.logged.get() + " (dropped " + d + ")");
    }
}`,
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
      code: String.raw`
class LostUpdate {
    public static void main(String[] args) {
        Map<String, Integer> store = new HashMap<>(Map.of("counter", 5));
        int a = store.get("counter");        // session A reads 5
        int b = store.get("counter");        // session B reads 5
        store.put("counter", a + 1);         // A writes 6
        store.put("counter", b + 1);         // B writes 6 -> A's increment lost
        System.out.println("counter = " + store.get("counter") + " (expected 7)");
    }
}`
    },
    mcq: { q: 'Session A only WRITES key x (never reads it); B commits a change to x before A commits. Under the rule "fail if a key you READ changed", what happens to A?', options: ['A commits; its write simply overwrites (last writer wins on blind writes)', 'A always fails', 'A deadlocks', 'A sees B\'s value'], answer: 0, explain: 'Validation covers the read set. Blind writes do not depend on the old value, so overwriting is serializable. If you want write-write conflicts detected too, add written keys to the validation set (as snapshot isolation does).' },
    hints: [
      `<p>Give every key a <b>version</b> number that increments on each committed write. A session records <code>readSet: key → version seen</code> and buffers <code>writeSet: key → value</code>.</p>`,
      `<p><code>get</code> checks the session\'s own writeSet first (read-your-writes), else reads the store and records the version. <code>commit</code>: under the store lock, compare every readSet version with the current one; if all match, apply the writeSet and bump versions; else return CONFLICT.</p>`,
      `<p>Edge cases: reading a missing key (version 0) then someone creates it → conflict; deletes as tombstone values; retries in a loop with a bound. The lock is held only during the short validate-and-apply step, never while the client thinks.</p>`
    ],
    solution: {
      approach: `<p>Optimistic concurrency control: versioned values, per-session read/write sets, validate-then-apply inside one short critical section. Reads take no lock on a <code>ConcurrentHashMap</code>; commits are serialized by a lock, which makes validation + apply atomic.</p>`,
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
      complexity: `<p>get O(1), set O(1), commit O(|readSet| + |writeSet|) under a short lock. Under high contention on one key, retries grow — then switch that key to pessimistic locking or an atomic increment command.</p>`,
      followUps: ['Shard the commit lock by key ranges; how do you avoid deadlock for multi-shard commits?', 'Turn this into MVCC snapshot reads (keep old versions, read as of the session start).', 'Add TTL: does an expiry count as a write for conflict detection?']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'In the logging framework, why is the level check done BEFORE building the LogMessage?', options: ['A disabled call then costs almost nothing — no formatting, allocation or clock read', 'Because appenders cannot handle DEBUG', 'To keep messages in order', 'Java requires it'], answer: 0, explain: 'Most DEBUG lines are disabled in production; an int comparison up front avoids all the expensive work for them.' },
    { q: 'Which pattern is <code>AsyncAppender</code> (it implements Appender and wraps another Appender)?', options: ['Decorator', 'Adapter', 'Composite', 'Facade'], answer: 0, explain: 'Same interface, wraps an instance of it, adds behaviour (queueing) before delegating — a textbook Decorator.' },
    { q: 'Logger <code>com.shop.audit</code> has <code>additive = false</code>. An ERROR logged there…', options: ['goes only to com.shop.audit\'s own handlers', 'goes to root only', 'is dropped', 'goes to every logger in the app'], answer: 0, explain: 'Additivity controls whether the climb to parent loggers continues; false stops it at this logger.' },
    { q: 'Why must MDC values be copied into the message on the calling thread when logging asynchronously?', options: ['MDC is ThreadLocal; the background writer thread has its own (empty) MDC', 'MDC is too large to share', 'The writer thread cannot read maps', 'To sort the keys'], answer: 0, explain: 'ThreadLocal state does not travel with the message. Snapshot it into the immutable message when it is created.' },
    { q: 'A topic has 6 partitions and a consumer group has 8 members. How many members receive data?', options: ['6', '8', '3', '1'], answer: 0, explain: 'Each partition is owned by exactly one member of a group, so at most 6 are busy and 2 sit idle.' },
    { q: 'A consumer processes a batch, then crashes before committing. After the rebalance, what happens to that batch?', options: ['It is delivered again from the last committed offset (at-least-once)', 'It is lost', 'It is skipped automatically', 'The broker deletes it'], answer: 0, explain: 'The committed offset is the restart point; everything after it is re-read. Hence idempotent consumers.' },
    { q: 'Which ordering guarantee does a Kafka-like log give?', options: ['Order within a partition only', 'Global order across all partitions', 'Order per consumer group across topics', 'No ordering at all'], answer: 0, explain: 'Offsets are per partition. Use the same key for events that must stay in order so they land in one partition.' },
    { q: 'What does "lag" measure for a consumer group on one partition?', options: ['Log-end offset minus committed offset', 'Number of consumers', 'Time since the topic was created', 'Committed offset minus start offset'], answer: 0, explain: 'Lag = how many messages have been written but not yet committed as processed by that group.' },
    { q: 'In the chess design, where should the rule "a move may not leave your own king in check" live?', options: ['In one MoveValidator/rule engine that simulates the move and tests king safety', 'Inside each Piece subclass', 'In the UI', 'In the Player class'], answer: 0, explain: 'It needs the whole board and applies to every piece equally, so one central place avoids six duplicated copies.' },
    { q: 'Position: in check, zero legal moves. Position B: NOT in check, zero legal moves. Results?', options: ['A = checkmate, B = stalemate (draw)', 'Both checkmate', 'Both stalemate', 'A = stalemate, B = checkmate'], answer: 0, explain: 'Status is decided by two facts: in-check flag and whether any legal move exists.' },
    { q: 'Why does the KV store save the old value only on the FIRST write to a key inside a transaction?', options: ['ROLLBACK must restore the value from when the transaction began, not an intermediate one', 'To save memory only', 'Because later writes are ignored', 'To make COMMIT faster'], answer: 0, explain: 'If you overwrote the undo entry on every SET, rollback would restore the second-to-last value inside the transaction.' },
    { q: 'An inner transaction COMMITs while an outer one is still open. What must happen to the inner undo map?', options: ['Merge it into the parent, keeping the parent\'s existing entries (putIfAbsent)', 'Discard it', 'Overwrite the parent\'s entries', 'Apply it to the data again'], answer: 0, explain: 'The parent still needs to be able to roll back everything to its own starting point, including keys first touched by the inner transaction.' },
    { q: 'Why does a TTL store use both lazy expiry and an active sweep?', options: ['Lazy expiry guarantees correct reads; the sweep frees memory for keys nobody reads', 'Lazy expiry is only for tests', 'The sweep makes reads faster', 'They are the same thing'], answer: 0, explain: 'Without lazy checks, reads between sweeps could return expired data; without sweeps, unread expired keys would leak memory.' }
  );

  /* ======================= INTERVIEW Q&A ======================= */
  interview.push(
    { q: 'Walk me through the class design of a logging framework.', level: 'I', a: `<p>I split it by question. <b>Should we log?</b> <code>LogLevel</code> enum with severities, and a <code>Logger</code> that checks its effective level first. <b>What is logged?</b> An immutable <code>LogMessage</code> record (level, logger, text, time, thread, MDC snapshot). <b>Where does it go?</b> A chain of <code>LogHandler</code>s, each with a min level and an <code>Appender</code> (console, file, network). <b>How does it look?</b> A <code>LogFormatter</code> strategy. A <code>LogManager</code> singleton hands out named, hierarchical loggers. Async is a Decorator around any appender.</p>`, followUps: ['Where is Chain of Responsibility used — once or twice?', 'How do you change a level at runtime safely?'] },
    { q: 'How do you make logging not slow down request threads?', level: 'A', a: `<p>Three layers. (1) <b>Cheap exit</b>: level check before formatting; placeholders or Suppliers so disabled lines build nothing. (2) <b>Async appender</b>: the request thread only offers an immutable message to a <b>bounded</b> queue; one writer thread does I/O, ideally batching with <code>drainTo</code>. (3) A <b>back-pressure policy</b> for a full queue: drop DEBUG/INFO and count drops, block only for ERROR, or never block. Log4j 2 async loggers use the LMAX Disruptor ring buffer for very high throughput. Always flush on shutdown with a poison pill and a bounded join.</p>`, followUps: ['What metric would you expose?', 'Why bounded and not unbounded?'] },
    { q: 'What was Log4Shell and what does it teach about designing a logger?', level: 'E', a: `<p>CVE-2021-44228: Log4j 2 performed <b>lookups</b> (like JNDI) on strings inside logged messages, so an attacker who got text such as a crafted user-agent into a log line could make the server load and run remote code. Lesson: a logger must treat message content as <b>inert data</b> — format placeholders from the pattern only, never interpret argument text; disable or sandbox any expression features; also escape newlines (log forging) and redact secrets/PII in a filter before any appender.</p>`, followUps: ['How would you test your formatter for this?', 'Why are logs also a prompt-injection risk now?'] },
    { q: 'Design a Kafka-like message queue at class level. What are the key entities?', level: 'A', a: `<p><code>Broker</code> owns <code>Topic</code>s; a topic has N <code>Partition</code>s, each an append-only list of <code>StoredMessage(offset, key, value, ts)</code>. <code>Producer</code> uses a <code>Partitioner</code> strategy (hash of key, round-robin for null). Consumption is <b>pull</b>-based: a <code>ConsumerGroup</code> coordinator assigns each partition to one member and rebalances on join/leave; each <code>GroupConsumer</code> keeps an in-memory position per partition and commits offsets to the broker keyed by (group, topic, partition). Retention deletes old segments. Messages are never deleted on read — that enables replay and many independent groups.</p>`, followUps: ['Where do you store committed offsets and why there?', 'How do you add retention without breaking consumers?'] },
    { q: 'Explain at-most-once, at-least-once and exactly-once delivery.', level: 'I', a: `<p>It depends on <b>when you commit</b> relative to processing. Commit first, then process → a crash loses the message: <b>at-most-once</b>. Process first, then commit → a crash re-delivers: <b>at-least-once</b> (the common default; make handlers idempotent with a dedupe key). <b>Exactly-once</b> needs the processing result and the offset to be committed atomically — Kafka transactions with an idempotent producer for read-process-write inside Kafka, or storing the offset in the same database transaction as the result for external sinks.</p>`, followUps: ['How does an idempotent producer avoid duplicates on retry?', 'Give a use case where at-most-once is fine.'] },
    { q: 'How do you keep events for the same order in sequence while scaling consumers?', level: 'I', a: `<p>Use the <b>order id as the message key</b>. The partitioner maps the same key to the same partition, a partition is consumed by exactly one member of the group, and offsets within a partition are strictly ordered — so one consumer sees that order\'s events in order, while different orders spread across partitions and consumers. Caveats: changing the partition count remaps keys; retries that move a message to a retry topic break order unless you park the whole key; hot keys can overload one partition.</p>`, followUps: ['What happens to ordering during a rebalance?', 'How would you handle a hot key?'] },
    { q: 'What happens during a consumer-group rebalance and how can it hurt you?', level: 'A', a: `<p>When a member joins, leaves or misses heartbeats, the coordinator recomputes partition ownership. Members must stop processing revoked partitions and <b>commit what they finished</b> before giving them up; new owners resume from the committed offsets, so uncommitted work is redone. Old eager rebalances paused the whole group ("stop the world"); cooperative-sticky assignment moves only the partitions that must move, static membership avoids rebalances on quick restarts, and Kafka 4.0's new server-side consumer protocol (KIP-848) makes rebalances incremental by design. Long processing beyond <code>max.poll.interval.ms</code> triggers spurious rebalances.</p>`, followUps: ['How do you avoid processing a partition you no longer own?', 'Range vs round-robin vs sticky assignors?'] },
    { q: 'Design Chess. Where do you put move validation?', level: 'A', a: `<p>Three layers. <b>Pieces</b> (abstract <code>Piece</code> with Rook/Bishop/Queen sharing <code>slide</code>, King/Knight sharing <code>jumps</code>, Pawn special) generate <b>pseudo-legal</b> moves: shape, blocking, no own-piece capture. A <b>MoveValidator</b> filters them: apply each on a board copy and reject if the mover\'s king is attacked — this single rule handles pins, walking into check and answering check. <b>Game</b> handles turn order, special-move state (castling rights, en-passant square on the Board), status (check/checkmate/stalemate), history and undo. Players are a Strategy (human, bot).</p>`, followUps: ['Why are pieces immutable in your design?', 'How do you test the move generator (perft)?'] },
    { q: 'How do you detect checkmate and stalemate?', level: 'I', a: `<p>After each move, for the side to move compute two facts: <b>in check?</b> (is their king square attacked by the opponent) and <b>has any legal move?</b> (generate pseudo-legal moves for every piece, simulate, keep those that leave the king safe — stop at the first one found). In check + no moves = checkmate; not in check + no moves = stalemate (draw); otherwise check or normal play. Other draws need extra state: 50-move counter, threefold repetition via Zobrist hashes, insufficient material.</p>`, followUps: ['Why can a double check only be answered by a king move?', 'How would you make this faster for an engine?'] },
    { q: 'How would you implement undo in chess (and in general)?', level: 'I', a: `<p>Two classic options. <b>Memento</b>: push a snapshot of the board (cheap when pieces are immutable — a 64-slot copy plus castling rights and en-passant square) before each move; undo = pop. <b>Command</b>: each <code>Move</code> stores what it needs to reverse itself — captured piece, previous castling rights, previous en-passant square, promotion flag — and has <code>execute/undo</code>. Snapshots are simpler and safer; commands use less memory and are what engines use (make/unmake) because search makes millions of moves. Redo is a second stack.</p>`, followUps: ['Which info does en passant add to the undo record?', 'How does undo interact with a chess clock?'] },
    { q: 'Design an in-memory key-value store with nested transactions.', level: 'A', a: `<p>Data in a <code>HashMap</code>. A stack of <b>undo maps</b>: BEGIN pushes an empty map; every write first records the key\'s old value in the top map with <code>putIfAbsent</code> (absent = tombstone), then writes to the data. ROLLBACK pops and restores those keys. COMMIT pops and merges the undo entries into the parent with putIfAbsent, so the parent can still roll back to its own start. Reads are O(1); transaction cost is proportional to keys touched. A value→count index answers COUNT in O(1) as long as every mutation goes through one private method. If clients need isolation, switch to per-session overlays or MVCC.</p>`, followUps: ['What breaks if COMMIT overwrites the parent\'s entries?', 'Undo log vs overlay: which gives isolation?'] },
    { q: 'How do you implement key expiry (TTL) efficiently and testably?', level: 'I', a: `<p>Store an absolute <code>expireAt</code> per key. <b>Lazy</b> expiry: on every access, if <code>now ≥ expireAt</code> delete and report missing — this guarantees correctness. <b>Active</b> expiry frees memory for keys no one reads: a min-heap (or timing wheel) of (expireAt, key) popped by a periodic task, skipping stale items whose expireAt no longer matches; Redis instead samples random keys with TTLs. Inject a clock interface so tests advance time instantly. Rollback restores the whole entry including expireAt; persistence stores absolute times so restarts do not extend lifetimes.</p>`, followUps: ['Heap vs timing wheel vs sampling?', 'What does TTL return for a key without expiry?'] },
    { q: 'Redis MULTI/EXEC vs the BEGIN/ROLLBACK store we built — what is different?', level: 'E', a: `<p>Redis <code>MULTI</code> <b>queues</b> commands; <code>EXEC</code> runs them all atomically (no other client\'s command interleaves, since execution is single-threaded); <code>DISCARD</code> drops the queue. There is <b>no rollback</b> of commands that already executed — if one command fails at runtime, the others still apply. Reads inside MULTI return results only at EXEC, so you cannot branch on them; for read-modify-write you use <code>WATCH</code> (optimistic: EXEC aborts if a watched key changed) or a Lua script / function. Our design executes immediately and keeps an undo log, giving rollback but no isolation.</p>`, followUps: ['How would you implement WATCH in our store?', 'When would you use a Lua script instead?'] },
    { q: 'In a 90-minute machine-coding round on any of these four systems, how do you plan your time?', level: 'B', a: `<p>About <b>10 min</b> clarifying scope out loud (must-haves vs extensions, concurrency needs, in-memory OK?). <b>10 min</b> class diagram and core interfaces (name the patterns: Chain, Strategy, Decorator, Memento, Command). <b>45 min</b> code the core path end to end with a runnable <code>main</code> — inject time, keep state in one place, no premature threading. <b>15 min</b> tests/demo of tricky cases (nested rollback, pin, crash before commit, queue full). <b>10 min</b> extensions and trade-offs: thread safety, persistence, scale-out. Working, readable code with clear extension points beats a half-finished "complete" design.</p>`, followUps: ['What would you cut first if time runs short?', 'How do you show extensibility without coding every feature?'] }
  );

  registerModule({
    id: 'lld12',
    title: 'Expert Case Studies: Logger, Pub-Sub, Chess, KV Store',
    intro: `<p>This is the last and hardest stop on the LLD track: four <b>expert machine-coding case studies</b> that companies like Amazon, Uber, Flipkart, Google and Stripe actually ask, each built end to end in Java you can run.</p>
<ul>
<li><b>Logging framework</b>: levels, a hierarchy of named loggers, a <b>chain of responsibility</b> of handlers, appenders and formatters, MDC, and an async decorator with a drop policy.</li>
<li><b>Kafka-like pub-sub queue</b>: topics, partitions, offsets, key-based ordering, consumer groups, rebalancing, commits and re-delivery, and retention.</li>
<li><b>Chess</b>: board and pieces, move validation in two stages (piece rule, then king safety), check, checkmate, stalemate, castling, en passant, promotion and undo.</li>
<li><b>In-memory key-value store</b>: nested BEGIN/ROLLBACK/COMMIT with undo logs, an O(1) COUNT index, and TTL with lazy plus active expiry.</li>
</ul>
<p>Every topic starts from a <b>naive design</b> and shows exactly where it breaks. Then you get the class diagram as an animated visualizer, a message, move or command flowing through the system step by step, full core code, worked examples, deep dives into how the real systems (Log4j/Logback, Kafka, chess engines, Redis) do it, and a section on how AI changes the work. You finish with 15 machine-coding practice problems.</p>`,
    goals: [
      'Design a <b>logging framework</b> from scratch: levels, hierarchical loggers with additivity, a handler chain (Chain of Responsibility), appenders/formatters (Strategy), an async appender (Decorator) with a back-pressure policy, and MDC.',
      'Design a <b>Kafka-like pub-sub log</b>: partitioning by key, offsets, consumer groups and rebalancing, committed offsets vs positions, lag, and at-most/at-least/exactly-once delivery, all in runnable Java.',
      'Design <b>Chess</b> with clean separation of piece movement rules, a central legality check (copy-make + king safety), special moves, check/checkmate/stalemate detection, undo, and perft-based testing.',
      'Design an <b>in-memory KV store</b> with nested transactions (undo log vs overlay vs MVCC), an O(1) value index, and TTL using lazy plus active expiry with an injected clock.',
      'Handle the expert follow-ups with confidence: thread safety, back-pressure, crash recovery, isolation, persistence, and "add a new feature without editing old classes".'
    ],
    prereqs: `<p>LLD 1–7 (OOP modelling, SOLID, the core design patterns, especially Chain of Responsibility, Strategy, Decorator, Command, Memento and Observer, and the LLD interview framework), LLD 10 (Concurrency in LLD: locks, blocking queues, producer–consumer) and LLD 11 (extensible architecture) are strongly recommended. You should be comfortable with Java 17+ records, enums, switch expressions, collections (<code>HashMap</code>, <code>ArrayDeque</code>, <code>PriorityQueue</code>, <code>ConcurrentHashMap</code>) and basic threads.</p>`,
    hours: 22,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
