(function () { var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared helpers for visualizers ---------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* =========================================================
   TOPIC 1 — Connecting to a database
   ========================================================= */
topics.push({
  title: 'Connecting to a Database: App → Connection → Driver → DB',
  analogy: `<p>Think of calling a restaurant to order food. You need the <b>phone number</b> (the database URL), you must <b>speak a language they understand</b> (the driver translates your Java or Node call into the database's wire protocol), and once the call is connected you have a <b>line that stays busy</b> until you hang up (the connection). Dialling takes time, so smart shops keep a few lines open and reuse them (a connection pool). And the restaurant asks "who is calling?" - your username and password, which you never write on the front door of your app.</p>`,
  explain: `<p>🟢 <b>The plain idea.</b> A database is a separate program, usually on another machine. Your backend cannot just "read" it like a variable. It has to <b>open a connection</b> (a network socket plus a login), <b>send text commands</b> (SQL), and <b>read the answers</b> back. Four things take part in every round trip:</p>
  <ol>
    <li><b>Your app code</b> - says "give me user 7".</li>
    <li><b>A connection</b> - an open, logged-in session to one database. It is an expensive thing to create (TCP handshake, TLS, login, session setup) so you borrow and return it.</li>
    <li><b>A driver</b> - a library that knows the database's private network language (PostgreSQL, MySQL, SQLite each speak differently). In Java the standard API is <b>JDBC</b> (<code>java.sql.*</code>); the driver is a plug-in jar behind it. In Node you use a driver such as <code>pg</code> or <code>mysql2</code>; in Python, <code>psycopg</code>, <code>mysql-connector</code> or the built-in <code>sqlite3</code>.</li>
    <li><b>The database server</b> - parses your SQL, plans it, runs it, and sends rows back.</li>
  </ol>
  <p>🔵 <b>The connection URL.</b> Everything needed to find the database lives in one string:</p>
  ${H.table(['Part', 'Example', 'Meaning'], [
    ['scheme', '<code>jdbc:postgresql://</code>', 'Which driver to load: "JDBC, talking to PostgreSQL".'],
    ['host', '<code>db.internal</code>', 'Which machine. <code>localhost</code> means your own laptop.'],
    ['port', '<code>5432</code>', 'The door number. PostgreSQL 5432, MySQL 3306, SQL Server 1433, MongoDB 27017.'],
    ['database', '<code>/shop</code>', 'Which database on that server.'],
    ['options', '<code>?sslmode=require</code>', 'Extra settings such as encryption and timeouts.']
  ])}
  <p>🔴 <b>Credentials never live in code.</b> The username and password come from the <i>environment</i> at runtime: <code>System.getenv("DB_PASSWORD")</code> in Java, <code>process.env.DB_PASSWORD</code> in Node, <code>os.environ["DB_PASSWORD"]</code> in Python. In production they are injected by a secrets manager or Kubernetes Secret. If you commit a password to git, treat it as leaked - rotate it.</p>
  <p>🟣 <b>Always give the connection back.</b> A leaked connection is like leaving the phone off the hook: the database has a limited number of lines (PostgreSQL defaults to about 100), and when they run out every other request waits or fails. In Java use <b>try-with-resources</b>; in Node use <code>pool.query()</code> or <code>client.release()</code> in a <code>finally</code>.</p>`,
  clues: [
    '"connect to a database from Java / Node / Python" - the answer starts with URL + driver + credentials from the environment',
    '"Connection refused" / "too many connections" / "timeout acquiring connection" - connection lifecycle or pool exhaustion',
    '"where do you keep the DB password?" - environment variable or secrets manager, never source code or git',
    '"what is JDBC?" - the standard Java API (java.sql) that drivers plug into, so your code does not change per database',
    '"app is slow under load but the database is idle" - probably opening a new connection per request instead of pooling'
  ],
  code: [
    `import java.sql.*;

public class ConnectDemo {
    public static void main(String[] args) {
        // URL, user and password come from the environment - never hard-coded.
        String url  = System.getenv().getOrDefault("DB_URL", "jdbc:postgresql://localhost:5432/shop");
        String user = System.getenv("DB_USER");
        String pass = System.getenv("DB_PASSWORD");

        // try-with-resources closes the connection even if an exception is thrown.
        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            // isValid pings the server: proves the whole chain app -> driver -> DB works.
            System.out.println("connected = " + conn.isValid(2));
            DatabaseMetaData meta = conn.getMetaData();
            System.out.println("product   = " + meta.getDatabaseProductName());
        } catch (SQLException e) {
            // SQLState is a standard 5-char code: 08xxx = connection problem, 28xxx = bad login.
            System.err.println("failed: " + e.getSQLState() + " " + e.getMessage());
        }
    }
}`,
    { lang: 'js', title: 'Node.js with the pg driver and a pool', code: `// npm install pg
const { Pool } = require('pg');

// A Pool keeps several connections open and lends them out one at a time.
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'shop',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // from the environment, never from source code
  max: 10,                           // at most 10 connections at once
  connectionTimeoutMillis: 2000      // fail fast instead of waiting forever
});

async function main() {
  // pool.query borrows a connection, runs the SQL, and returns it automatically.
  const result = await pool.query('SELECT 1 AS ok');
  console.log(result.rows[0].ok);
  await pool.end(); // on shutdown, close every connection politely
}
main().catch(function (err) { console.error(err.message); process.exit(1); });` },
    { lang: 'python', run: true, title: 'Python: connect, ask, hang up (runnable, built-in sqlite3)', code: `import sqlite3

# sqlite3 ships with Python: the "database" is just a file (or memory).
# For a server database you would pass host/user/password from os.environ instead.
conn = sqlite3.connect(":memory:")        # 1. open the connection
cur = conn.cursor()                        # 2. a cursor sends commands and holds results
cur.execute("SELECT sqlite_version()")     # 3. one round trip: app -> driver -> engine
print("engine version:", cur.fetchone()[0])
cur.execute("SELECT 1 + 1")
print("1 + 1 =", cur.fetchone()[0])
conn.close()                               # 4. always close
try:
    cur.execute("SELECT 1")
except sqlite3.ProgrammingError as e:
    print("after close ->", e)` }
  ],
  codeTitle: ['JDBC connection with env-based credentials', 'Node.js pool (pg)', 'Python sqlite3 round trip'],
  viz: {
    title: 'One query: app → connection → driver → database and back',
    input: 'SELECT name FROM users WHERE id = 7',
    inputLabel: 'A SQL statement (max 80 characters)',
    gen: function (input) {
      var sql = String(input == null ? '' : input).replace(/\s+/g, ' ').trim();
      if (!sql) throw new Error('Type a SQL statement, e.g. SELECT name FROM users WHERE id = 7');
      if (sql.length > 80) throw new Error('Keep the statement under 80 characters');
      var isSel = /^select/i.test(sql);
      var verb = (sql.split(' ')[0] || '').toUpperCase();
      var nodes = [
        { id: 'app', label: 'Your app', x: 11, y: 22, shape: 'box', w: 16 },
        { id: 'conn', label: 'Connection', x: 37, y: 22, shape: 'box', w: 16 },
        { id: 'drv', label: 'Driver', x: 63, y: 22, shape: 'box', w: 16 },
        { id: 'db', label: 'Database', x: 89, y: 22, shape: 'box', w: 16 }
      ];
      var edges = [['app', 'conn', 'borrow'], ['conn', 'drv', 'encode'], ['drv', 'db', 'TCP']];
      function g(hl, ehl, tags) { return { type: 'graph', label: 'The round trip', directed: true, height: 44, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      var rows = [['7', 'asha']];
      var frames = [];
      frames.push({ narr: 'Your code wants to run <code>' + esc(sql) + '</code>. It cannot talk to the database directly - it needs a <b>connection</b> and a <b>driver</b> in between.', parts: [g({ app: 'cur' }), { type: 'vars', label: 'In your app', vals: { sql: sql, password: 'read from env DB_PASSWORD' }, hl: { sql: 'cur' } }] });
      frames.push({ narr: 'Step 1: the app <b>borrows a connection</b> (from a pool, or opens a new one). Opening a new one costs a TCP handshake, TLS and a login - tens of milliseconds. A pool makes this nearly free.', parts: [g({ app: 'ok', conn: 'cur' }, { 'app-conn': 'ok' }, { conn: 'logged in' }), { type: 'text', html: 'Pool says: <b>"connection #3 is idle - it is yours."</b>' }] });
      frames.push({ narr: 'Step 2: the <b>driver</b> turns your call into the database\'s private wire protocol (for PostgreSQL: a "Parse/Bind/Execute" message). Your SQL travels as text; any parameters travel separately.', parts: [g({ conn: 'ok', drv: 'cur' }, { 'conn-drv': 'ok' }, { drv: 'encode' }), { type: 'vars', label: 'On the wire', vals: { protocol: 'binary message', payload: sql }, hl: { payload: 'cur' } }] });
      frames.push({ narr: 'Step 3: the packet crosses the <b>network</b> to the database server. This hop is why a query is thousands of times slower than a function call - every round trip pays network latency.', parts: [g({ drv: 'ok', db: 'cur' }, { 'drv-db': 'ok' }, { db: 'received' })] });
      frames.push({ narr: 'Step 4: the database <b>parses, plans and executes</b> the statement. For a ' + verb + ' it ' + (isSel ? 'finds the matching rows (ideally using an index).' : 'changes the stored data and reports how many rows were affected.'), parts: [g({ db: 'sel' }, { 'drv-db': 'ok' }, { db: 'running ' + verb }), { type: 'table', label: 'Inside the database: users', columns: ['id', 'name'], rows: [['6', 'zoe'], ['7', 'asha'], ['8', 'ben']], hl: isSel ? { 1: 'sel' } : { 1: 'cur' } }] });
      frames.push({ narr: 'Step 5: the answer travels <b>back</b> the same road: database → driver → connection → app. ' + (isSel ? 'The driver decodes the bytes into a <code>ResultSet</code> (Java) or an array of row objects (Node).' : 'The driver returns an "update count".'), parts: [g({ db: 'ok', drv: 'cur' }, { 'drv-db': 'win' }, { drv: 'decode' }), isSel ? { type: 'table', label: 'ResultSet seen by your code', columns: ['id', 'name'], rows: rows, hl: { 0: 'ok' } } : { type: 'vars', label: 'Update count', vals: { rowsAffected: 1 }, hl: { rowsAffected: 'ok' } }] });
      frames.push({ narr: 'Step 6: your code reads the result and maps it into something useful (a <code>User</code> object, a JSON field). Then it <b>returns the connection</b> to the pool - forgetting this step is how "too many connections" outages start.', parts: [g({ app: 'ok', conn: 'cur' }, { 'app-conn': 'win' }, { conn: 'returned to pool' }), { type: 'vars', label: 'In your app', vals: { user: isSel ? 'User(id=7, name=asha)' : 'updated 1 row', connection: 'released' }, hl: { connection: 'ok' } }] });
      frames.push({ narr: 'Done. One query = <b>one network round trip</b>. Remember this when you later meet the N+1 problem: 100 small queries mean 100 round trips.', parts: [g({ app: 'ok', conn: 'ok', drv: 'ok', db: 'ok' }, { 'app-conn': 'ok', 'conn-drv': 'ok', 'drv-db': 'ok' }, { app: 'done' })] });
      return frames;
    }
  },
  examples: [
    { title: 'Reading a JDBC URL like a sentence', html: `<p>Take <code>jdbc:mysql://db.example.com:3306/shop?useSSL=true</code> and read it left to right: "use <b>JDBC</b> with the <b>MySQL</b> driver, connect to the machine <b>db.example.com</b> on door <b>3306</b>, open the database named <b>shop</b>, and turn encryption on."</p>
      ${H.table(['URL', 'Database', 'Where'], [['jdbc:postgresql://localhost:5432/shop', 'PostgreSQL', 'your own laptop'], ['jdbc:mysql://db:3306/shop', 'MySQL', 'a container named <code>db</code>'], ['jdbc:sqlite:./shop.db', 'SQLite', 'a file next to your app (no server at all)'], ['jdbc:h2:mem:test', 'H2', 'memory only - perfect for unit tests']])}
      <p>If a connection fails, check the sentence in this order: right host? right port? database exists? user allowed? That is 90% of "Connection refused" bugs.</p>` },
    { title: 'Spring Boot: the config file reads the environment for you', html: `<p>Spring Boot builds the pool and the <code>DataSource</code> from three lines of config. The <code>&#36;{...}</code> parts are <b>placeholders</b> filled from environment variables at startup, so the file is safe to commit.</p>`,
      code: { lang: 'yaml', title: 'application.yml', code: `spring:
  datasource:
    url: \${DB_URL:jdbc:postgresql://localhost:5432/shop}   # default after the colon for local dev
    username: \${DB_USER}
    password: \${DB_PASSWORD}                               # no default on purpose: fail fast if missing
    hikari:
      maximum-pool-size: 10
      connection-timeout: 2000` } },
    { title: 'Prove the chain works: a health check', html: `<p>Real services expose a <code>/health</code> endpoint that runs a tiny query such as <code>SELECT 1</code>. If it fails, the load balancer stops sending traffic to that instance. The code below returns true only if the whole chain (pool → driver → network → database) is healthy, and it gives up after two seconds so the health check itself never hangs.</p>`,
      code: `import java.sql.*;
import javax.sql.DataSource;

class DbHealth {
    private final DataSource ds;
    DbHealth(DataSource ds) { this.ds = ds; }

    boolean isUp() {
        try (Connection c = ds.getConnection();
             Statement st = c.createStatement()) {
            st.setQueryTimeout(2);                    // seconds
            try (ResultSet rs = st.executeQuery("SELECT 1")) {
                return rs.next() && rs.getInt(1) == 1;
            }
        } catch (SQLException e) {
            return false;                              // any failure means "not healthy"
        }
    }
}` },
    { title: 'Common connection errors and what they usually mean', html: `${H.table(['Error message', 'Real cause', 'First thing to check'], [
      ['Connection refused', 'Nothing is listening on that host:port', 'Is the DB running? Right port? Docker network name?'],
      ['password authentication failed', 'Wrong user or password', 'Is the env var actually set in this process? Trailing space?'],
      ['unknown database "shop"', 'Server is up but the database was never created', 'Run the migration or <code>CREATE DATABASE</code>'],
      ['too many connections', 'Leaked connections or too many app instances', 'Missing close(); pool size × instance count vs server limit'],
      ['timeout acquiring connection', 'Pool is empty - all connections busy or leaked', 'Slow queries holding connections; pool too small']
    ])}` }
  ],
  deepDive: `<p><b>What a connection really is.</b> On the server, each connection is a session: PostgreSQL forks a whole OS process per connection (roughly 5-10 MB each), MySQL uses a thread. That is why you cannot simply open 10,000 connections - the database spends its memory and CPU on sessions instead of queries. A typical rule of thumb: pool size ≈ (CPU cores × 2) + number of disks, then measure; a pool of 10-20 per app instance is common, and total connections across <i>all</i> instances must stay below the server limit.</p>
  <p><b>JDBC internals.</b> <code>DriverManager.getConnection</code> asks every registered <code>java.sql.Driver</code> whether it accepts the URL. Since JDBC 4 drivers register themselves through the <code>ServiceLoader</code> mechanism (a file in <code>META-INF/services</code>), so the old <code>Class.forName("org.postgresql.Driver")</code> line is no longer needed. Production code does not call <code>DriverManager</code> at all - it asks a <code>DataSource</code> (usually HikariCP) which hands out wrapped connections whose <code>close()</code> means "return to pool", not "hang up".</p>
  <p><b>Transport and security.</b> Always use TLS to the database (<code>sslmode=verify-full</code> in PostgreSQL) when it is not on the same host; the login and your data otherwise cross the network in the clear. Prefer short-lived credentials: cloud IAM database auth (AWS RDS IAM, GCP Cloud SQL IAM) issues tokens that expire in minutes, so there is no long-lived password to leak. Give the app its own least-privilege DB user: it needs SELECT/INSERT/UPDATE/DELETE on its tables, not <code>DROP</code> and not superuser.</p>
  <p><b>Failure behaviour.</b> Connections die: the database restarts, a firewall drops idle sockets after 5 minutes, a failover moves the primary. A good pool tests connections before lending them (<code>isValid</code> or a validation query) and retires old ones (<code>maxLifetime</code>) before the firewall does. Your code must treat <code>SQLException</code> with SQLState class <code>08</code> as "transient - may retry" and class <code>23</code> (constraint violation) as "my data is wrong - do not retry".</p>
  <p><b>Node and Python differences.</b> Node's event loop makes pools essential: <code>client.query</code> returns a promise, so many requests share few connections. Python's DB-API (PEP 249) gives the same <code>connect → cursor → execute → fetch → close</code> shape for every driver, which is why the sqlite3 demo above translates almost line for line to PostgreSQL's <code>psycopg</code>.</p>`,
  aiEra: `<p><b>What AI changes.</b> Assistants write connection boilerplate in seconds and are good at it. But they love to <b>inline a sample password</b> ("password123") or open a new connection per call "for simplicity". Both are production bugs that look fine in a demo.</p>
  <p><b>Use AI as a partner:</b> ask <code>Review this DAO: list every place a Connection, Statement or ResultSet might not be closed, and every hard-coded credential</code>. Or paste a stack trace and ask which of URL, port, credentials, network, or pool exhaustion it points to. AI agents with database access (MCP database tools) should connect with a <b>read-only user</b> and a statement timeout - never with your admin credentials.</p>
  <p><b>Where AI goes wrong:</b> it may use a driver version that does not exist, mix JDBC URL formats between databases, or suggest <code>DriverManager</code> in a Spring app that already has a pool. <b>What you must still own:</b> where secrets live, how many connections the whole fleet may open, TLS settings, and failure behaviour - these are architecture choices, not boilerplate.</p>`,
  problems: [{
    title: 'Diagnose Three Connection Failures',
    level: 'Easy', tags: ['jdbc', 'connection', 'debugging'], companies: ['Infosys', 'Amazon'],
    statement: `<p>Your teammate deploys a Java service. The logs show three different errors on three different days: (1) <code>Connection refused: db:5433</code>, (2) <code>FATAL: password authentication failed for user "shop_app"</code>, (3) <code>HikariPool-1 - Connection is not available, request timed out after 30000ms</code>. For each one, say what is most likely wrong and the first thing you would check.</p>`,
    constraints: `Database is PostgreSQL 16 in Docker; the app reads DB_URL, DB_USER and DB_PASSWORD from the environment.`,
    example: `<p>Error (1) mentions port <b>5433</b>, but PostgreSQL listens on <b>5432</b> by default. ${H.c('g', 'Likely a typo in DB_URL')}, or the container maps a different port.</p>`,
    brute: { why: `<p>Weak answer: "restart everything and see". It hides the cause, and the same failure returns. Each error message points at a different layer: network (1), login (2), pool (3).</p>` },
    mcq: { q: 'Which error most strongly suggests connections are being leaked (never closed)?', options: ['Connection refused', 'password authentication failed', 'Pool timed out waiting for a connection', 'unknown database'], answer: 2, explain: 'The pool had no idle connection to lend for 30 s. Either every connection is busy with slow queries or code forgot to close them.' },
    hints: [`<p>Hint 1: read the message as a path - network → login → database name → pool. Each message stops at one layer.</p>`, `<p>Hint 2: "refused" means nobody answered at that host:port; "authentication failed" means someone answered and rejected you; "request timed out" means the pool itself ran dry.</p>`, `<p>Hint 3: for each error write cause + first check + fix. For (3) include both "leak" and "pool too small / queries too slow" and say how to tell them apart (thread dump or Hikari leak-detection-threshold).</p>`],
    solution: {
      approach: `<p><b>(1) Connection refused db:5433.</b> The TCP connection never reached a listening server. Check the URL port (5433 vs 5432), whether the container is running (<code>docker ps</code>), and that the hostname <code>db</code> resolves inside the app's Docker network. Fix the URL or the port mapping.</p>
      <p><b>(2) Password authentication failed for "shop_app".</b> The server was reached and answered, so network and URL are fine; the login was rejected. Check that <code>DB_PASSWORD</code> is really set in the app's process (not just in your shell), no stray whitespace or quotes, and that the user was created with that password in this database instance. A rotated secret that the app did not reload is a classic cause.</p>
      <p><b>(3) Hikari: Connection is not available, request timed out after 30000ms.</b> The pool had no free connection for 30 seconds. Two causes: connections are <b>leaked</b> (code path without try-with-resources) or the pool is <b>saturated</b> by slow queries/long transactions. Turn on <code>leak-detection-threshold</code> to log the stack trace of whoever holds a connection too long; check the slow query log; only then consider a bigger pool - a bigger pool on a struggling database usually makes things worse.</p>`,
      complexity: `<p>Diagnosis is O(1) once you map message → layer. The lesson: errors name the layer, so debug the layer.</p>`,
      followUps: ['How would you make the service fail fast at startup when DB_PASSWORD is missing?', 'What metric would alert you to pool exhaustion before users notice?']
    }
  }]
});

/* =========================================================
   TOPIC 2 — SQL from code (JDBC DAO, Python sqlite3, Node)
   ========================================================= */
topics.push({
  title: 'SQL from Code: JDBC, ResultSet and a Real DAO',
  analogy: `<p>Writing SQL in a database console is like asking the waiter a question face to face. Writing SQL <i>from code</i> is like sending the waiter a <b>written order slip</b> and then reading the dishes that come back on a tray. The slip is the SQL text. The tray is a <b>ResultSet</b> - a cursor that points at one row at a time, starting <i>before</i> the first row. You must call <code>next()</code> to step onto each dish, then pick its fields by column name.</p>`,
  explain: `<p>🟢 <b>The plain idea.</b> From code you do the same three things in every language: (1) <b>send</b> a SQL string, (2) <b>read</b> the rows that come back, (3) <b>map</b> each row into an object your program understands. The code that does this for one table is called a <b>DAO</b> (Data Access Object) or, in Spring, a repository.</p>
  <p>🔵 <b>The JDBC vocabulary (java.sql).</b></p>
  ${H.table(['Type', 'Role', 'Everyday meaning'], [
    ['<code>Connection</code>', 'An open session', 'The phone line'],
    ['<code>Statement</code>', 'Runs fixed SQL text', 'A note with no blanks (use rarely)'],
    ['<code>PreparedStatement</code>', 'Runs SQL with <code>?</code> placeholders', 'A form with blanks to fill in - the safe way'],
    ['<code>ResultSet</code>', 'Cursor over result rows', 'The tray of dishes, one at a time'],
    ['<code>SQLException</code>', 'Anything that goes wrong', 'The waiter says "kitchen is closed"']
  ])}
  <p>The three execute methods are easy to mix up:</p>
  ${H.table(['Method', 'Use for', 'Returns'], [
    ['<code>executeQuery()</code>', '<code>SELECT</code>', 'a <code>ResultSet</code>'],
    ['<code>executeUpdate()</code>', '<code>INSERT / UPDATE / DELETE / DDL</code>', 'an <code>int</code> = rows changed'],
    ['<code>execute()</code>', 'unknown or mixed SQL', 'boolean: true if a ResultSet was produced']
  ])}
  <p>🔴 <b>Rules that save you in code review.</b></p>
  <ul>
    <li>Read with a loop: <code>while (rs.next()) { ... }</code>. The cursor starts <i>before</i> the first row, so reading without <code>next()</code> throws.</li>
    <li>Fetch by <b>column name</b> (<code>rs.getString("email")</code>), not number - adding a column later will not break you.</li>
    <li><code>SELECT *</code> in code is a trap: name the columns you need so the query stays fast and stable.</li>
    <li>Check <b>NULL</b>: <code>rs.getInt("age")</code> returns 0 for NULL; use <code>rs.getObject("age", Integer.class)</code> or call <code>rs.wasNull()</code>.</li>
    <li>After INSERT, ask for the new id with <code>RETURN_GENERATED_KEYS</code> instead of running a second SELECT.</li>
    <li>Check the <code>executeUpdate()</code> count: an UPDATE that changed <b>0 rows</b> usually means "no such record" and should not look like success.</li>
  </ul>
  <p>🟣 <b>Same shape everywhere.</b> Python's DB-API: <code>cursor.execute(sql, params)</code> then <code>fetchone()/fetchall()</code>. Node's pg: <code>await pool.query(sql, params)</code> then <code>result.rows</code>. The names change; the idea (send text + parameters, read rows) does not.</p>`,
  clues: [
    '"write a DAO / data access layer for a User table" - connection, PreparedStatement, ResultSet mapping, try-with-resources',
    '"what is the difference between executeQuery and executeUpdate?" - SELECT returns a ResultSet, DML returns a row count',
    '"how do you get the auto-generated id after INSERT?" - RETURN_GENERATED_KEYS / getGeneratedKeys (or RETURNING in PostgreSQL)',
    '"insert 10,000 rows quickly" - batching: addBatch / executeBatch, one round trip instead of 10,000',
    '"map a row to an object" - hand-written RowMapper vs ORM; know what an ORM automates'
  ],
  code: [
    `import java.sql.*;
import java.util.*;
import javax.sql.DataSource;

/** One row of the users table, as an immutable value. */
record User(long id, String name, String email) {}

/** DAO = Data Access Object: all SQL for the users table lives here and nowhere else. */
class UserDao {
    private final DataSource ds;
    UserDao(DataSource ds) { this.ds = ds; }

    /** READ one. Returns Optional because the row may not exist. */
    Optional<User> findById(long id) throws SQLException {
        String sql = "SELECT id, name, email FROM users WHERE id = ?";   // ? = a blank to fill
        try (Connection c = ds.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, id);                                            // fill blank #1 (1-based!)
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        }
    }

    /** READ many. LIKE needs the wildcard in the VALUE, not in the SQL text. */
    List<User> findByNamePrefix(String prefix) throws SQLException {
        String sql = "SELECT id, name, email FROM users WHERE name LIKE ? ORDER BY name";
        List<User> out = new ArrayList<>();
        try (Connection c = ds.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, prefix + "%");
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(map(rs));                       // cursor moves one row per next()
            }
        }
        return out;
    }

    /** CREATE. Returns the database-generated id. */
    long insert(String name, String email) throws SQLException {
        String sql = "INSERT INTO users(name, email) VALUES (?, ?)";
        try (Connection c = ds.getConnection();
             PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name);
            ps.setString(2, email);
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (!keys.next()) throw new SQLException("insert returned no key");
                return keys.getLong(1);
            }
        }
    }

    /** UPDATE. The row count tells us whether anything matched. */
    boolean updateEmail(long id, String email) throws SQLException {
        String sql = "UPDATE users SET email = ? WHERE id = ?";
        try (Connection c = ds.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, email);
            ps.setLong(2, id);
            return ps.executeUpdate() == 1;                               // 0 means "no such user"
        }
    }

    /** DELETE. */
    boolean delete(long id) throws SQLException {
        try (Connection c = ds.getConnection();
             PreparedStatement ps = c.prepareStatement("DELETE FROM users WHERE id = ?")) {
            ps.setLong(1, id);
            return ps.executeUpdate() == 1;
        }
    }

    /** The mapper: one ResultSet row in, one User out. */
    private static User map(ResultSet rs) throws SQLException {
        return new User(rs.getLong("id"), rs.getString("name"), rs.getString("email"));
    }
}`,
    { lang: 'python', run: true, title: 'Python sqlite3: the whole CRUD cycle (runnable)', code: `import sqlite3

conn = sqlite3.connect(":memory:")
conn.row_factory = sqlite3.Row          # rows behave like dicts: row["name"]
conn.execute("""CREATE TABLE users(
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    email TEXT UNIQUE)""")

# CREATE - always use ? placeholders and pass values separately.
cur = conn.execute("INSERT INTO users(name, email) VALUES (?, ?)", ("asha", "asha@shop.test"))
print("new id:", cur.lastrowid)         # like getGeneratedKeys
conn.executemany("INSERT INTO users(name, email) VALUES (?, ?)",
                 [("ben", "ben@shop.test"), ("chen", "chen@shop.test")])   # batch insert
conn.commit()                            # make it permanent

# READ one / many
row = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (1,)).fetchone()
print("one:", dict(row))
for r in conn.execute("SELECT id, name FROM users WHERE name LIKE ? ORDER BY name", ("%e%",)):
    print("like %e%:", r["id"], r["name"])

# UPDATE - rowcount says how many rows matched
cur = conn.execute("UPDATE users SET email = ? WHERE id = ?", ("asha@new.test", 1))
print("updated rows:", cur.rowcount)
cur = conn.execute("UPDATE users SET email = ? WHERE id = ?", ("ghost@x.test", 99))
print("updated rows for missing id:", cur.rowcount)   # 0 -> treat as 'not found'

# DELETE
cur = conn.execute("DELETE FROM users WHERE id = ?", (2,))
print("deleted rows:", cur.rowcount)
conn.commit()

print("final:", [tuple(r) for r in conn.execute("SELECT id, name, email FROM users ORDER BY id")])
conn.close()` },
    { lang: 'js', title: 'Node.js (pg): the same four operations', code: `// npm install pg   - $1, $2 are PostgreSQL's placeholders (MySQL uses ?)
const { Pool } = require('pg');
const pool = new Pool({ host: process.env.DB_HOST, user: process.env.DB_USER,
                        password: process.env.DB_PASSWORD, database: process.env.DB_NAME });

async function createUser(name, email) {
  // RETURNING gives back the generated id in the same round trip
  const r = await pool.query('INSERT INTO users(name, email) VALUES ($1, $2) RETURNING id', [name, email]);
  return r.rows[0].id;
}
async function findUser(id) {
  const r = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
  return r.rows[0] || null;                 // rows is an array of plain objects
}
async function updateEmail(id, email) {
  const r = await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, id]);
  return r.rowCount === 1;                  // rowCount = rows changed
}
async function deleteUser(id) {
  const r = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return r.rowCount === 1;
}
module.exports = { createUser, findUser, updateEmail, deleteUser };` }
  ],
  codeTitle: ['JDBC UserDao with PreparedStatement', 'Python sqlite3 CRUD', 'Node pg CRUD'],
  viz: {
    title: 'ResultSet cursor: how while (rs.next()) walks the rows',
    input: 'user',
    inputLabel: 'Role to select (admin, user or all)',
    gen: function (input) {
      var role = String(input == null ? 'user' : input).trim().toLowerCase();
      if (['admin', 'user', 'all'].indexOf(role) < 0) throw new Error('Type admin, user or all');
      var all = [[1, 'asha', 'admin'], [2, 'ben', 'user'], [3, 'chen', 'user'], [4, 'divya', 'user'], [5, 'eli', 'admin']];
      var sel = all.filter(function (r) { return role === 'all' || r[2] === role; });
      var sql = role === 'all' ? 'SELECT id, name FROM users' : 'SELECT id, name FROM users WHERE role = ?';
      var cols = ['id', 'name'];
      var rs = sel.map(function (r) { return [r[0], r[1]]; });
      var frames = [];
      var mapped = [];
      frames.push({ narr: 'The database ran <code>' + sql + '</code>' + (role === 'all' ? '' : ' with ? = "' + role + '"') + ' and produced <b>' + rs.length + ' row(s)</b>. The driver hands your code a <code>ResultSet</code> - but the cursor sits <b>before the first row</b>.', parts: [
        { type: 'table', label: 'Rows waiting inside the ResultSet', columns: cols, rows: rs, hl: {} },
        { type: 'vars', label: 'Cursor', vals: { cursor: 'before first row', 'objects mapped': 0 }, hl: { cursor: 'cur' } }
      ] });
      for (var i = 0; i < rs.length; i++) {
        mapped.push('User(' + rs[i][0] + ',' + rs[i][1] + ')');
        var hl = {}; for (var d = 0; d < i; d++) hl[d] = 'done'; hl[i] = 'cur';
        frames.push({ narr: '<code>rs.next()</code> returns <b>true</b> and moves the cursor to row ' + (i + 1) + '. Now <code>rs.getLong("id")</code> = <b>' + rs[i][0] + '</b> and <code>rs.getString("name")</code> = <b>' + esc(rs[i][1]) + '</b>. The mapper builds one <code>User</code> from these two values.', parts: [
          { type: 'table', label: 'ResultSet (cursor on the amber row)', columns: cols, rows: rs, hl: hl },
          { type: 'vars', label: 'Cursor and mapper', vals: { cursor: 'row ' + (i + 1), 'rs.getLong("id")': rs[i][0], 'rs.getString("name")': rs[i][1], 'objects mapped': mapped.length }, hl: { cursor: 'cur', 'objects mapped': 'ok' } },
          { type: 'array', label: 'List&lt;User&gt; result', values: mapped.slice(), hl: { [mapped.length - 1]: 'ok' } }
        ] });
      }
      var hlAll = {}; for (var k = 0; k < rs.length; k++) hlAll[k] = 'done';
      frames.push({ narr: 'The next call to <code>rs.next()</code> returns <b>false</b>: the cursor ran off the end, the <code>while</code> loop stops. If the query matched nothing, this is the <i>first</i> call - the loop body never runs and you get an empty list.', parts: [
        { type: 'table', label: 'ResultSet (cursor after last row)', columns: cols, rows: rs, hl: hlAll },
        { type: 'vars', label: 'Cursor', vals: { 'rs.next()': 'false', 'objects mapped': mapped.length }, hl: { 'rs.next()': 'bad' } }
      ] });
      frames.push({ narr: 'The <code>try-with-resources</code> block closes the <b>ResultSet, then the PreparedStatement, then the Connection</b> (in reverse order of opening). Only the mapped <code>User</code> objects survive - never return a ResultSet out of your DAO; it dies with the connection.', parts: [
        { type: 'array', label: 'What the DAO returns', values: mapped.slice(), hl: (function () { var h = {}; for (var q = 0; q < mapped.length; q++) h[q] = 'sel'; return h; })() },
        { type: 'vars', label: 'Resources', vals: { ResultSet: 'closed', PreparedStatement: 'closed', Connection: 'returned to pool' }, hl: { Connection: 'ok' } }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'Insert 1,000 rows with one batch (not 1,000 round trips)', html: `<p>Each <code>executeUpdate()</code> is a full network round trip. For bulk work, queue many parameter sets with <code>addBatch()</code> and send them together. In practice this can be 10-50 times faster. Send in chunks (say 500-1000) so a failure does not lose everything and memory stays small.</p>`,
      code: `import java.sql.*;
import java.util.*;

class BatchInsert {
    static void insertAll(Connection c, List<String> names) throws SQLException {
        String sql = "INSERT INTO users(name, email) VALUES (?, ?)";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            int n = 0;
            for (String name : names) {
                ps.setString(1, name);
                ps.setString(2, name + "@shop.test");
                ps.addBatch();                       // queue, do not send yet
                if (++n % 500 == 0) ps.executeBatch(); // flush every 500 rows
            }
            ps.executeBatch();                       // flush the remainder
        }
    }
}` },
    { title: 'NULL handling and wasNull', html: `<p>A SQL <code>NULL</code> has no Java primitive equivalent. <code>rs.getInt("age")</code> quietly returns <b>0</b> for NULL, which is a wrong answer that looks right. Two safe ways: <code>getObject(col, Integer.class)</code> (returns <code>null</code>), or call <code>wasNull()</code> right after reading.</p>`,
      code: `import java.sql.*;

class NullDemo {
    static Integer readAge(ResultSet rs) throws SQLException {
        int age = rs.getInt("age");          // 0 if the column is NULL
        return rs.wasNull() ? null : age;    // wasNull() refers to the LAST column read
    }
    static Integer readAge2(ResultSet rs) throws SQLException {
        return rs.getObject("age", Integer.class); // cleaner: null stays null
    }
}` },
    { title: 'Run the SQL itself first (in the browser)', html: `<p>Before pasting SQL into code, run it in a console. Here is the exact query the DAO's <code>findByNamePrefix("a")</code> sends. Press Run and compare with the Java loop above.</p>`,
      code: { lang: 'sql', db: 'shop', title: 'What findByNamePrefix("a") asks the database', code: `SELECT id, name, email FROM users WHERE name LIKE 'a%' ORDER BY name;` } },
    { title: 'Selecting only what you need', html: `<p>Compare two ways to show a list of order totals. The second moves far fewer bytes and can be answered from an index alone. Rule: <b>the database should filter and aggregate; the app should only display.</b></p>`,
      code: { lang: 'sql', db: 'shop', title: 'Let the database do the counting', code: `-- Bad: SELECT * FROM orders;  then sum in Java after pulling every column of every row.
-- Good: one small row per customer comes back.
SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent
FROM orders
GROUP BY customer_id
ORDER BY spent DESC;` } }
  ],
  deepDive: `<p><b>try-with-resources and ordering.</b> Resources close in reverse order of declaration, so ResultSet → PreparedStatement → Connection is automatic. Closing a <code>Statement</code> also closes its ResultSets, and closing a pooled <code>Connection</code> returns it to the pool - but relying on that "implicit" closing hides bugs; declare each resource explicitly. A leaked ResultSet or Statement can hold <b>server-side cursors and memory</b>, not just a connection.</p>
  <p><b>Streaming big results.</b> By default many drivers load the <i>entire</i> result into memory (PostgreSQL does unless autocommit is off and <code>setFetchSize(n)</code> is set; MySQL needs <code>Integer.MIN_VALUE</code> or <code>useCursorFetch</code>). For exports of millions of rows, set a fetch size and process row by row, or better, paginate with keyset pagination (a later module). An <code>OutOfMemoryError</code> on a "simple" report is almost always an unbounded ResultSet.</p>
  <p><b>Type mapping.</b> Money is <code>DECIMAL</code> in SQL and <code>BigDecimal</code> in Java - never <code>double</code>. Timestamps: prefer <code>TIMESTAMP WITH TIME ZONE</code> and <code>rs.getObject(col, OffsetDateTime.class)</code> (or <code>Instant</code>) to avoid time zone bugs. <code>getDate/getTimestamp</code> are legacy. <code>CHAR(1)</code> booleans and database-specific enums need explicit mapping.</p>
  <p><b>Errors you can act on.</b> <code>SQLException.getSQLState()</code> is portable: <code>23505</code> = unique violation (return HTTP 409), <code>23503</code> = foreign key violation, <code>40001</code> = serialization failure (retry), <code>08xxx</code> = connection trouble. Map them to business errors in the DAO so the controller never sees raw SQL exceptions; Spring does this for you by translating to <code>DuplicateKeyException</code>, <code>DataIntegrityViolationException</code> and friends.</p>
  <p><b>Why a DAO at all?</b> It puts every SQL string in one place: easy to review for injection, easy to tune with an index, easy to mock in tests. Services call <code>userDao.findById(7)</code> and never see a <code>Connection</code>. That boundary is exactly what Spring Data repositories formalise.</p>`,
  aiEra: `<p><b>What AI changes.</b> Writing a DAO is the kind of repetitive code AI is excellent at - and the classic place it slips in subtle bugs. Typical misses: not closing the ResultSet on an early return, <code>setString(0, ...)</code> (JDBC parameters start at <b>1</b>), mapping NULL integers to 0, and string-building the <code>WHERE</code> clause.</p>
  <p><b>Use AI as a partner:</b> generate the boilerplate, then run a second pass: <code>Audit this DAO for resource leaks, SQL injection, NULL handling and missing row-count checks. Quote the line for each finding.</code> Ask it for the <code>CREATE TABLE</code> plus a test that inserts, reads, updates, deletes against an in-memory database. For Node and Python, ask for the same CRUD and compare parameter styles ($1 vs ? vs %s).</p>
  <p><b>Where AI goes wrong:</b> it mixes placeholder styles between databases, forgets <code>RETURN_GENERATED_KEYS</code>, and pulls <code>SELECT *</code> by habit. <b>What you must still own:</b> the contract of each method (what does "not found" return?), transaction boundaries, and reading every SQL string it wrote before it ships.</p>`,
  problems: [{
    title: 'Fix the Leaky, Fragile DAO Method',
    level: 'Medium', tags: ['jdbc', 'resultset', 'resources'], companies: ['Flipkart', 'Oracle'],
    statement: `<p>A junior wrote this method. It works on the happy path but has at least <b>four</b> problems. Find them and rewrite the method.</p>
    <pre>User find(Connection c, int id) throws Exception {
    Statement st = c.createStatement();
    ResultSet rs = st.executeQuery("SELECT * FROM users WHERE id = " + id);
    rs.next();
    return new User(rs.getInt(1), rs.getString(2), rs.getString(3));
}</pre>`,
    constraints: `Must return Optional&lt;User&gt;, must be safe when the id does not exist, and must not leak resources even on exceptions.`,
    example: `<p>With <code>id = 99</code> (no such row) the original throws an exception at <code>rs.getInt(1)</code> because <code>rs.next()</code> returned ${H.c('r', 'false')} and was ignored. The fixed method returns ${H.c('g', 'Optional.empty()')}.</p>`,
    brute: { why: `<p>The original compiles and passes a quick manual test, which is exactly why it ships. Problems: (1) Statement and ResultSet never closed; (2) the <code>rs.next()</code> result is ignored; (3) <code>SELECT *</code> plus column numbers breaks when a column is added; (4) the id is concatenated into SQL (safe for an int here, but a habit that becomes injection with strings).</p>`, code: `import java.sql.*;

class Brute {
    record User(int id, String name, String email) {}
    User find(Connection c, int id) throws Exception {
        Statement st = c.createStatement();
        ResultSet rs = st.executeQuery("SELECT * FROM users WHERE id = " + id);
        rs.next();
        return new User(rs.getInt(1), rs.getString(2), rs.getString(3));
    }
}` },
    mcq: { q: 'What does rs.next() return when the query matched no rows?', options: ['true, with null values', 'false', 'It throws SQLException', '0'], answer: 1, explain: 'next() returns false when there is no (more) row. Check it before reading any column.' },
    hints: [`<p>Hint 1: list what must be closed (three things) and what must be checked (the boolean from <code>next()</code>).</p>`, `<p>Hint 2: use <code>PreparedStatement</code> with <code>?</code>, try-with-resources for Connection-scoped statement and ResultSet, and return <code>Optional</code>.</p>`, `<p>Hint 3: name the columns in SELECT, read by name, and let the caller own the Connection (so a transaction can span several DAO calls).</p>`],
    solution: {
      approach: `<p>Four fixes: close resources with try-with-resources; honour the boolean from <code>next()</code> and return <code>Optional.empty()</code>; select named columns and read by name; use a PreparedStatement instead of concatenation. The method takes a Connection from the caller so it can take part in a larger transaction; it closes only what it opened (statement and result set).</p>`,
      code: `import java.sql.*;
import java.util.*;

class Fixed {
    record User(long id, String name, String email) {}

    Optional<User> find(Connection c, long id) throws SQLException {
        String sql = "SELECT id, name, email FROM users WHERE id = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Optional.empty();     // no row -> empty, not an exception
                return Optional.of(new User(rs.getLong("id"), rs.getString("name"), rs.getString("email")));
            }
        }
    }
}`,
      complexity: `<p>One round trip, O(1) rows read (primary key lookup). Memory O(1).</p>`,
      followUps: ['What if two rows match? Should the method throw?', 'How would this change if the DAO should manage its own connection?']
    }
  }]
});

/* =========================================================
   TOPIC 3 — Prepared statements and SQL injection
   ========================================================= */
topics.push({
  title: 'Prepared Statements and SQL Injection',
  analogy: `<p>A restaurant order form has printed sentences with <b>blanks</b>: "I want ______ with ______ sauce." The customer may only write a dish name in a blank. Now imagine instead you hand the customer a blank sheet and type whatever they dictate into the kitchen's instructions. A tricky customer says: "<i>one tea - and also give me the cash register</i>". The kitchen cannot tell your words from the customer's words. <b>SQL injection</b> is exactly this; a <b>prepared statement</b> is the printed form where customer text can only ever fill a blank.</p>`,
  explain: `<p>🟢 <b>The plain idea.</b> If you build SQL by gluing user text into a string, the user can type text that <i>changes the meaning of the query</i>. The database cannot tell which part you wrote and which part the user typed - it just sees one string.</p>
  <p>🔴 <b>The classic attack.</b> Login code: <code>"SELECT * FROM users WHERE name = '" + name + "'"</code>. An attacker types this as the name:</p>
  <pre>x' OR '1'='1</pre>
  <p>The string becomes <code>... WHERE name = 'x' OR '1'='1'</code>. Since <code>'1'='1'</code> is always true, <b>every row matches</b>. Other famous payloads:</p>
  ${H.table(['Payload typed by attacker', 'Resulting SQL idea', 'Damage'], [
    ['<code>x\' OR \'1\'=\'1</code>', '<code>WHERE name = \'x\' OR \'1\'=\'1\'</code>', 'Returns all rows (login bypass, data leak)'],
    ['<code>admin\'--</code>', '<code>WHERE name = \'admin\'--\' AND pw = ...</code>', '<code>--</code> comments out the password check'],
    ['<code>x\'; DROP TABLE users;--</code>', 'Second statement appended after <code>;</code>', 'Deletes data (when the driver allows multiple statements)'],
    ['<code>x\' UNION SELECT password_hash, 1, 2 FROM users--</code>', 'Glues a second query\'s rows onto the first', 'Steals other tables']
  ])}
  <p>🔵 <b>The fix: prepared statements (parameterized queries).</b> You send the SQL <i>with</i> <code>?</code> blanks first. The database <b>parses and plans it once</b>. Then you send the values <i>separately</i>. Values are only ever treated as <b>data</b>, never as SQL, so a quote in the value is just a quote character.</p>
  <pre>PreparedStatement ps = c.prepareStatement("SELECT id, name FROM users WHERE name = ?");
ps.setString(1, userInput);   // the whole text, quotes and all, is ONE value</pre>
  <p>With the payload above the database simply looks for a user whose name is literally the odd text <code>x' OR '1'='1</code> - finds nobody, returns zero rows. ${H.c('g', 'Attack neutralised.')}</p>
  <p>🟣 <b>What placeholders cannot do.</b> Only <i>values</i> can be parameters. You cannot parameterize a <b>table name, column name, or <code>ASC/DESC</code></b> (<code>ORDER BY ?</code> sorts by a constant, not a column). For those, pick from an <b>allowlist</b> in code: <code>Map.of("name","name","date","created_at")</code> and use your own mapped string, never the user's text.</p>
  <p>⚠️ <b>Not magic.</b> Prepared statements protect only if you really use <code>?</code>. <code>prepareStatement("... WHERE name = '" + name + "'")</code> is still injectable. And ORMs are safe only when you use their parameter binding: JPQL strings, Sequelize <code>sequelize.query</code>, Prisma <code>$queryRawUnsafe</code> can all be injected if you concatenate.</p>`,
  clues: [
    '"how do you prevent SQL injection?" - parameterized queries / prepared statements first; then allowlists, least privilege, input validation',
    '"login form returns every user" / "\' OR 1=1" - injection example the interviewer expects you to explain line by line',
    '"user can choose the sort column or table" - placeholders cannot bind identifiers: use an allowlist',
    '"is an ORM safe from SQL injection?" - safe when binding parameters, unsafe with concatenated JPQL or raw queries',
    '"PreparedStatement vs Statement" - precompiled plan, values sent separately, injection-safe, reusable and often faster'
  ],
  code: [
    `import java.sql.*;
import java.util.*;

class LoginDao {
    /** VULNERABLE - never write this. User text becomes part of the SQL. */
    static List<String> findUserUnsafe(Connection c, String name) throws SQLException {
        String sql = "SELECT name FROM users WHERE name = '" + name + "'"; // glued together!
        List<String> out = new ArrayList<>();
        try (Statement st = c.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) out.add(rs.getString("name"));
        }
        return out;
    }

    /** SAFE - the SQL has a blank (?), the value is sent separately as data. */
    static List<String> findUserSafe(Connection c, String name) throws SQLException {
        String sql = "SELECT name FROM users WHERE name = ?";
        List<String> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, name);                 // quotes inside name are harmless
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(rs.getString("name"));
            }
        }
        return out;
    }
}`,
    { lang: 'python', run: true, title: 'Break it, then fix it (runnable sqlite3 demo)', code: `import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, pw TEXT, role TEXT);
INSERT INTO users VALUES (1,'asha','s3cret!','admin'),(2,'ben','hunter2','user');
""")

def login_unsafe(name, pw):
    # DANGER: string concatenation
    sql = "SELECT id, name, role FROM users WHERE name = '" + name + "' AND pw = '" + pw + "'"
    print("   SQL sent:", sql)
    try:
        return conn.execute(sql).fetchall()
    except sqlite3.Error as e:
        return "error: " + str(e)

def login_safe(name, pw):
    # SAFE: placeholders; values travel separately
    sql = "SELECT id, name, role FROM users WHERE name = ? AND pw = ?"
    return conn.execute(sql, (name, pw)).fetchall()

attacks = [("asha", "s3cret!"),            # honest login
           ("x' OR '1'='1", "x' OR '1'='1"),  # tautology: every row matches
           ("asha'--", "wrong")]            # comment trick: password check disappears

for name, pw in attacks:
    print("input:", repr(name), repr(pw))
    print("   UNSAFE ->", login_unsafe(name, pw))
    print("   SAFE   ->", login_safe(name, pw))` },
    `import java.sql.*;
import java.util.*;

class SafeSort {
    // Identifiers (column names) cannot be bound with ?, so map user choices to known-good SQL.
    private static final Map<String, String> SORTABLE = Map.of(
            "name", "name",
            "newest", "created_at",
            "price", "price");

    static List<String> listProducts(Connection c, String sortKey, boolean desc, int minPrice) throws SQLException {
        // Unknown key -> fall back to a default. The user's text never touches the SQL.
        String column = SORTABLE.getOrDefault(sortKey, "name");
        String dir = desc ? "DESC" : "ASC";
        String sql = "SELECT name FROM products WHERE price >= ? ORDER BY " + column + " " + dir;
        List<String> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, minPrice);                  // values still use ?
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(rs.getString(1));
            }
        }
        return out;
    }

    // IN (...) lists: build one ? per element, then bind each value.
    static String placeholders(int n) {
        return String.join(",", Collections.nCopies(n, "?"));
    }
}`
  ],
  codeTitle: ['Unsafe vs safe lookup (JDBC)', 'Injection demo that really runs', 'Allowlist for ORDER BY and IN lists'],
  viz: {
    title: 'String-concatenated SQL vs parameterized query',
    input: "x' OR '1'='1",
    inputLabel: 'Name typed by the user (try asha, then an attack)',
    gen: function (input) {
      var s = String(input == null ? '' : input);
      if (s.length > 60) throw new Error('Keep the input under 60 characters');
      var users = [[1, 'asha', 'admin'], [2, 'ben', 'user'], [3, 'chen', 'user']];
      var cols = ['id', 'name', 'role'];
      var prefix = "SELECT id, name, role FROM users WHERE name = '";
      var built = prefix + s + "'";
      var q = s.indexOf("'");
      var kind = 'normal', rows = [], note = '', hlBad = {};
      if (q < 0 && s.indexOf(';') < 0 && s.indexOf('--') < 0) {
        kind = 'normal';
        rows = users.filter(function (u) { return u[1] === s; });
        note = rows.length ? 'Looks harmless: the database compares the name and finds the matching row.' : 'Harmless input, but no user has that name, so zero rows.';
      } else if (/'\s*or\b/i.test(s)) {
        kind = 'tautology'; rows = users.slice();
        note = 'The extra <code>OR \'1\'=\'1\'</code> is always TRUE, so the WHERE clause lets every row through.';
      } else if (q >= 0 && /--/.test(s)) {
        kind = 'comment';
        var nm = s.slice(0, q).trim();
        rows = users.filter(function (u) { return u[1] === nm; });
        note = 'Everything after <code>--</code> became a comment, so the rest of the condition vanished.';
      } else if (q >= 0 && s.indexOf(';') >= 0) {
        kind = 'stacked'; rows = [];
        note = 'The <code>;</code> ends the first statement and a SECOND statement written by the attacker runs next (if the driver allows multiple statements).';
      } else {
        kind = 'syntax'; rows = [];
        note = 'The stray quote breaks the SQL grammar: the database raises a syntax error - and the error message may leak table details to the attacker.';
      }
      var injected = kind !== 'normal';
      for (var i = 0; i < rows.length; i++) if (kind === 'tautology' || kind === 'comment') hlBad[i] = (kind === 'tautology' || rows[i][1] !== s) ? 'bad' : 'ok';
      var frames = [];
      frames.push({ narr: 'A login/search box asks for a <b>name</b>. The developer wrote the query as a string: <code>"SELECT ... WHERE name = \'" + name + "\'"</code>. The user typed: <code>' + esc(s) + '</code>.', parts: [
        { type: 'vars', label: 'Inputs', vals: { 'SQL template': prefix + '" + name + "\'', name: s }, hl: { name: injected ? 'bad' : 'cur' } }
      ] });
      var pieces = [['query written by the developer', prefix, 'code']];
      if (q < 0) { pieces.push(['text typed by the user', s, 'data (stays inside the quotes)']); pieces.push(['closing quote added by developer', "'", 'code']); }
      else { pieces.push(['user text up to the first quote', s.slice(0, q), 'data']); pieces.push(['user text from the quote onward', s.slice(q), 'INJECTED SQL']); pieces.push(['closing quote added by developer', "'", 'code']); }
      var pHl = {}; if (q >= 0) pHl[2] = 'bad'; else pHl[1] = 'ok';
      frames.push({ narr: 'Concatenation glues three pieces into <b>one string</b>. The database receives only the final text - it has no way to know which part was typed by the user.' + (q >= 0 ? ' Notice the <span class="c-r">quote</span> inside the user text: it <b>closes the string early</b>, so what follows is read as SQL.' : ''), parts: [
        { type: 'table', label: 'Pieces of the final string', columns: ['piece', 'text', 'role'], rows: pieces, hl: pHl },
        { type: 'text', html: '<b>String sent to the database:</b><pre>' + esc(built) + '</pre>' }
      ] });
      frames.push({ narr: (injected ? '<span class="c-r">The database obeys the whole string.</span> ' : '') + note, parts: [
        { type: 'text', html: '<b>What the database actually runs:</b><pre>' + esc(built) + '</pre>' },
        { type: 'vars', label: 'Verdict', vals: { 'attack worked': injected ? 'YES' : 'no', kind: kind }, hl: { 'attack worked': injected ? 'bad' : 'ok' } }
      ] });
      if (kind === 'syntax' || kind === 'stacked') {
        frames.push({ narr: kind === 'stacked' ? 'The second statement is attacker-controlled: it could be <code>DROP TABLE users</code> or <code>UPDATE users SET role = \'admin\'</code>. This is why a web app\'s DB user must never be allowed to drop tables.' : 'The query fails with a syntax error. The attacker learns the SQL shape and tweaks the payload until it works (this is how "error-based" injection starts).', parts: [
          { type: 'table', label: 'Result with string concatenation', columns: cols, rows: [], hl: {} },
          { type: 'vars', label: 'Outcome', vals: { result: kind === 'stacked' ? 'attacker statement executed' : 'SQL syntax error' }, hl: { result: 'bad' } }
        ] });
      } else {
        frames.push({ narr: injected ? 'Result with concatenation: <b>' + rows.length + ' row(s)</b>. ' + (rows.length === users.length ? 'Every user came back, including the <b>admin</b> - an instant login bypass or data leak.' : 'The attacker chose which user to become.') : 'Result with concatenation: <b>' + rows.length + ' row(s)</b>. With honest input the unsafe code behaves correctly - which is exactly why the bug survives testing.', parts: [
          { type: 'table', label: 'Result with string concatenation', columns: cols, rows: rows, hl: hlBad }
        ] });
      }
      frames.push({ narr: 'Now the fix. The SQL is sent <b>with a blank</b>: <code>WHERE name = ?</code>. The database parses and plans <i>this fixed text</i> first. No user text is in it.', parts: [
        { type: 'vars', label: 'Message 1 - the statement (sent once)', vals: { sql: 'SELECT id, name, role FROM users WHERE name = ?' }, hl: { sql: 'ok' } },
        { type: 'text', html: 'Plan ready: <i>"find rows where name equals parameter #1"</i>. The shape of the query is now <b>locked</b>.' }
      ] });
      frames.push({ narr: 'Message 2 carries the value: parameter #1 = <code>' + esc(s) + '</code>. It is bound as a plain <b>string value</b>. Quotes, <code>OR</code>, <code>--</code>, <code>;</code> have no special meaning - they are just characters in a name.', parts: [
        { type: 'vars', label: 'Message 2 - the data', vals: { 'param #1': s, 'treated as': 'data only' }, hl: { 'param #1': 'sel', 'treated as': 'ok' } }
      ] });
      var safeRows = users.filter(function (u) { return u[1] === s; });
      frames.push({ narr: 'The database looks for a user named exactly <code>' + esc(s) + '</code>: ' + (safeRows.length ? 'found ' + safeRows.length + ' row.' : '<span class="c-g">nobody has that name, so zero rows - the attack is just a weird name.</span>') + ' Same input, safe result.', parts: [
        { type: 'table', label: 'Result with PreparedStatement', columns: cols, rows: safeRows, hl: safeRows.length ? { 0: 'ok' } : {} },
        { type: 'vars', label: 'Verdict', vals: { 'attack worked': 'no' }, hl: { 'attack worked': 'ok' } }
      ] });
      frames.push({ narr: 'Summary: <b>code</b> (the SQL you wrote) and <b>data</b> (what users typed) travel separately, so data can never turn into code. Try other inputs: <code>asha</code>, <code>admin\'--</code>, <code>x\'; DROP TABLE users;--</code>.', parts: [
        { type: 'table', label: 'Side by side', columns: ['', 'Concatenation', 'PreparedStatement'], rows: [['Input', s, s], ['Rows returned', rows.length, safeRows.length], ['Injectable?', injected ? 'YES' : 'yes (latent)', 'no']], hl: { 2: 'sel' } }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'Run the injected query yourself', html: `<p>This is the exact SQL string the vulnerable code builds for the input <code>x' OR '1'='1</code>. Run it and watch every row come back. Then run the second query, which is what the prepared statement really does with the same input.</p>`,
      code: { lang: 'sql', db: 'shop', title: 'Injected string (attack works); the second query is the parameterized meaning', code: `SELECT id, name, role FROM users WHERE name = 'x' OR '1'='1';
-- With a PreparedStatement the whole input is ONE string value (quotes doubled), so it matches nobody:
SELECT id, name, role FROM users WHERE name = 'x'' OR ''1''=''1';` } },
    { title: 'Comment-out attack on a login with a password', html: `<p>Vulnerable query: <code>SELECT * FROM users WHERE name = '</code>NAME<code>' AND pw = '</code>PW<code>'</code>. The attacker types <code>admin'--</code> as the name and anything as the password. The result is <code>WHERE name = 'admin'--' AND pw = 'anything'</code>. In SQL, <code>--</code> starts a comment, so the password check is <b>ignored</b> and they are logged in as admin without knowing the password.</p>
      <p>Real systems also never store plain passwords (they store a salted slow hash like bcrypt/argon2 and compare in code), but fixing injection and hashing are <i>separate</i> jobs; you need both.</p>` },
    { title: 'Dynamic filters without string-building values', html: `<p>Search pages often have optional filters (name? min price? city?). The trick: build the <i>SQL text</i> from fixed fragments you wrote, and collect <i>values</i> into a separate list that you bind. The user never influences the text, only the values.</p>`,
      code: `import java.sql.*;
import java.util.*;

class SearchDao {
    static List<String> search(Connection c, String nameLike, Integer minPrice) throws SQLException {
        StringBuilder sql = new StringBuilder("SELECT name FROM products WHERE 1 = 1");
        List<Object> args = new ArrayList<>();
        if (nameLike != null) { sql.append(" AND name LIKE ?"); args.add("%" + nameLike + "%"); }
        if (minPrice != null) { sql.append(" AND price >= ?"); args.add(minPrice); }
        List<String> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(sql.toString())) {
            for (int i = 0; i < args.size(); i++) ps.setObject(i + 1, args.get(i));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(rs.getString(1));
            }
        }
        return out;
    }
}` },
    { title: 'The same defence in Node and Prisma', html: `<p>Every language has the same two-lane idea: SQL text in one lane, values in another. In <code>pg</code> it is <code>$1</code>; in MySQL drivers <code>?</code>; in Prisma the tagged template <code>$queryRaw</code> turns every <code>&#36;{...}</code> into a bound parameter automatically, while <code>$queryRawUnsafe</code> glues strings (avoid).</p>`,
      code: { lang: 'js', title: 'Safe patterns (pg and Prisma)', code: `// pg: values are in the second argument, never inside the SQL string.
async function findByName(pool, name) {
  const r = await pool.query('SELECT id, name FROM users WHERE name = $1', [name]);
  return r.rows;
}

// Prisma: the query builder always binds values.
async function findByNamePrisma(prisma, name) {
  return prisma.user.findMany({ where: { name: name } });
}

// Prisma raw SQL: the TAGGED TEMPLATE form binds each interpolation as a parameter.
async function rawSafe(prisma, name) {
  return prisma.$queryRaw\`SELECT id, name FROM users WHERE name = \${name}\`;
}

// UNSAFE - do not do this:
//   prisma.$queryRawUnsafe("SELECT * FROM users WHERE name = '" + name + "'");` } }
  ],
  deepDive: `<p><b>How the protocol makes it safe.</b> PostgreSQL's extended query protocol has separate messages: <i>Parse</i> (SQL text with <code>$1</code>), <i>Bind</i> (parameter values, in binary or text), <i>Execute</i>. Values are never re-parsed as SQL. Honest caveat: some drivers only <b>emulate</b> prepared statements by escaping values client-side (MySQL Connector/J's default <code>useServerPrepStmts=false</code>; PDO emulation). Escaping is safe when done right, but depends on the client and charset - it has had real bypass bugs (multi-byte charset issues). Prefer drivers/settings that use true server-side binding for high-risk apps.</p>
  <p><b>Performance side effect.</b> A server-side prepared statement can be parsed and planned <i>once</i> and executed many times with different values, which saves CPU. Caveat: PostgreSQL may switch from per-value ("custom") plans to a generic plan after five executions; for very skewed data this can pick a worse plan. Also, each <i>distinct</i> SQL text creates a separate cache entry, so string-built IN lists of varying length churn the plan cache; bind arrays (<code>= ANY(?)</code>) or pad lists to fixed sizes.</p>
  <p><b>Kinds of injection.</b> <i>In-band</i> (results visible: tautology, UNION), <i>error-based</i> (leak data through error messages), <i>blind</i> (no output; attacker asks yes/no questions with <code>AND SUBSTRING(...)=...</code> and watches response time or content), and <i>second-order</i> (malicious text is stored safely first, then later concatenated into a different query - e.g. a username <code>bob'--</code> saved at signup and used unsafely in an admin report). The fix is the same: <b>every</b> query parameterized, including internal and batch code.</p>
  <p><b>Defence in depth.</b> (1) Parameterize everything. (2) Least privilege: the app's DB user can't drop tables, read system catalogs or touch other schemas; separate read-only user for reports. (3) Validate input type and length early (a numeric id should be parsed to <code>long</code> before it nears SQL). (4) Never return raw SQL errors to clients - log them, send a generic message. (5) Allowlists for identifiers. (6) Static analysis and code review rules (e.g. SpotBugs <code>SQL_INJECTION</code>, Semgrep) that flag <code>+</code> inside SQL strings. (7) A WAF can reduce noise but is <b>not</b> a fix.</p>
  <p><b>LIKE and wildcards.</b> Binding <code>"%" + term + "%"</code> is safe from injection, but a user can still type <code>%</code> or <code>_</code> to force a slow, broad scan. If that matters, escape wildcards (<code>LIKE ? ESCAPE '\\'</code>). Injection safety and abuse resistance are different problems.</p>`,
  aiEra: `<p><b>What AI changes.</b> Attackers use AI to generate and mutate payloads at scale and to scan codebases for concatenated SQL. Defenders use the same tools in code review. AI code assistants are surprisingly inconsistent: they write correct <code>PreparedStatement</code> code most of the time, but under "make it quick" prompts they still produce <code>"... WHERE id = " + id</code>, especially in scripts, tests and admin tools - the places that later become production.</p>
  <p><b>Use AI as a partner:</b> <code>Scan this repository for any SQL built with string concatenation, String.format or f-strings, and list file:line and a parameterized rewrite</code>. Ask it to generate 15 injection payloads to test <i>your</i> endpoint in a staging environment, including a second-order case. Give AI agents that run SQL a read-only database role, a row limit and a statement timeout; treat LLM-generated SQL itself as untrusted input (it can be steered by prompt injection from data it reads).</p>
  <p><b>Where AI goes wrong:</b> it "sanitizes" by replacing quotes (broken - escaping by hand misses encodings), or claims an ORM call is safe when it uses a raw fragment. <b>What you must still own:</b> the rule "values are bound, identifiers are allowlisted", and the habit of reading every SQL string in a diff.</p>`,
  problems: [{
    title: 'Make the Product Search Injection-Proof',
    level: 'Medium', tags: ['sql-injection', 'jdbc', 'security'], companies: ['PayPal', 'Atlassian'],
    statement: `<p>An endpoint <code>GET /products?category=X&amp;sort=Y</code> runs this code:</p>
    <pre>String sql = "SELECT name, price FROM products WHERE category = '" + category
           + "' ORDER BY " + sort;</pre>
    <p>Show a payload for each parameter that breaks it, then rewrite the code safely. <code>sort</code> may be one of <code>name</code>, <code>price</code>.</p>`,
    constraints: `Use JDBC. Values must be bound; the sort column must come from a fixed allowlist; unknown sort values fall back to <code>name</code>.`,
    example: `<p>category = ${H.c('r', "x' UNION SELECT password_hash, 0 FROM users--")} leaks hashes. sort = ${H.c('r', '(CASE WHEN (SELECT COUNT(*) FROM users)>0 THEN name ELSE price END)')} runs a sub-query inside ORDER BY - used for blind injection.</p>`,
    brute: { why: `<p>"Escape the quotes with replace()" fixes the first payload only when done perfectly and does nothing for <code>sort</code>, which sits outside any quotes. Hand-written escaping is the classic failed fix.</p>` },
    mcq: { q: 'Why can ORDER BY ? not be used to bind a column name?', options: ['Placeholders only bind values, so ORDER BY ? sorts by a constant string', 'JDBC forbids ORDER BY', 'It is too slow', 'Column names are case-sensitive'], answer: 0, explain: 'A bound parameter is a value. A value in ORDER BY is a constant, not an identifier, so identifiers need an allowlist in code.' },
    hints: [`<p>Hint 1: two different problems - one value (category) and one identifier (sort).</p>`, `<p>Hint 2: values go through <code>?</code> and <code>setString</code>; the identifier comes from a <code>Map</code> that you write.</p>`, `<p>Hint 3: never insert the user's <code>sort</code> text into SQL, only the mapped value. Add a default for unknown keys. Mention least-privilege DB user as a second line of defence.</p>`],
    solution: {
      approach: `<p>The category is a <b>value</b>: bind it with <code>?</code>. The sort is an <b>identifier</b>: look the user's key up in a fixed map and append only the mapped constant. Anything unknown falls back to <code>name</code>, so nothing from the request ever becomes SQL text. Also run the app under a database user that cannot read the users table at all - then even a future mistake cannot leak hashes.</p>`,
      code: `import java.sql.*;
import java.util.*;

class ProductSearch {
    private static final Map<String, String> SORT = Map.of("name", "name", "price", "price");

    static List<String> find(Connection c, String category, String sort) throws SQLException {
        String col = SORT.getOrDefault(sort, "name");      // allowlist for the identifier
        String sql = "SELECT name, price FROM products WHERE category = ? ORDER BY " + col;
        List<String> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, category);                      // bound value
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(rs.getString("name") + " " + rs.getBigDecimal("price"));
            }
        }
        return out;
    }
}`,
      complexity: `<p>No extra cost: one prepared query; the allowlist lookup is O(1).</p>`,
      followUps: ['How would you let the user choose ASC or DESC safely?', 'What changes if the sort comes from a JSON body instead of a query string?']
    }
  }]
});

/* =========================================================
   TOPIC 4 — ORM basics and entities
   ========================================================= */
topics.push({
  title: 'ORM Basics: Entities, Mapping and JPA/Hibernate vs Prisma/Sequelize',
  analogy: `<p>Your program thinks in <b>objects</b> ("an Order that has a list of items"). The database thinks in <b>tables</b> ("rows in <code>orders</code> and rows in <code>order_items</code> joined by a number"). They speak different languages, like an English speaker talking to a French speaker. An <b>ORM</b> (Object-Relational Mapper) is the <b>interpreter</b> standing between them: you say "save this Order object", it writes the INSERT statements; you say "give me Order 5", it runs the SELECT and builds the object back. A good interpreter saves hours; a careless one can mistranslate, so you still need to know both languages.</p>`,
  explain: `<p>🟢 <b>The plain idea.</b> Writing JDBC by hand means for every table: write SQL, set each parameter, read each column, build the object. An ORM lets you <b>describe the mapping once</b> (this class ↔ that table, this field ↔ that column) and then generates the SQL for you.</p>
  ${H.table(['Object world', 'Database world'], [
    ['class <code>Order</code> (an <b>entity</b>)', 'table <code>orders</code>'],
    ['field <code>customerName</code>', 'column <code>customer_name</code>'],
    ['one object instance', 'one row'],
    ['<code>@Id</code> field', 'primary key column'],
    ['<code>List&lt;OrderItem&gt; items</code>', 'rows in <code>order_items</code> that point back with <code>order_id</code> (foreign key)'],
    ['<code>enum OrderStatus</code>', 'text column (<code>\'NEW\'</code>, <code>\'PAID\'</code>)']
  ])}
  <p>🔵 <b>Java: JPA and Hibernate.</b> <b>JPA</b> (Jakarta Persistence) is the <i>specification</i> - the annotations like <code>@Entity</code>, <code>@Id</code>, <code>@OneToMany</code> and the <code>EntityManager</code> API. <b>Hibernate</b> is the most popular <i>implementation</i> that actually does the work. Spring Boot's <code>spring-boot-starter-data-jpa</code> wires Hibernate in for you.</p>
  <p>🔵 <b>Node: Prisma and Sequelize.</b> <b>Prisma</b> is <i>schema-first</i>: you write <code>schema.prisma</code>, run <code>prisma generate</code>, and get a fully typed client (<code>prisma.order.create(...)</code>). <b>Sequelize</b> is <i>model-first</i> in JavaScript: you define models with <code>sequelize.define</code> or classes, and call <code>Order.findAll()</code>. TypeORM and Drizzle are other popular choices.</p>
  <p>🔵 <b>Relationships.</b> A foreign key always lives on the <b>"many" side</b>: many <code>order_items</code> rows each hold one <code>order_id</code>. In JPA the owning side is the <code>@ManyToOne</code> in <code>OrderItem</code>; the <code>@OneToMany(mappedBy = "order")</code> in <code>Order</code> is just a convenient mirror.</p>
  <p>🔴 <b>Three habits that prevent most ORM pain.</b></p>
  <ul>
    <li><b>Know the SQL it produces.</b> Turn on SQL logging in development (<code>spring.jpa.show-sql=true</code>, Prisma <code>log: ['query']</code>). If you cannot read the SQL, you cannot find the slowness.</li>
    <li><b>Entities are not API responses.</b> Return small DTOs (plain data objects) so a lazy field or a password hash never leaks into JSON.</li>
    <li><b>Keep the database as the source of truth for the schema.</b> Use migrations (Flyway, Liquibase, Prisma Migrate). Do not let Hibernate's <code>ddl-auto=update</code> change a production database.</li>
  </ul>
  <p>🟣 <b>When not to use an ORM.</b> Complex reports with window functions, bulk updates of millions of rows, or very hot paths are often cleaner and faster in plain SQL (jOOQ, JdbcTemplate, Prisma <code>$queryRaw</code>). Mature teams mix both.</p>`,
  clues: [
    '"what is an ORM / JPA / Hibernate, and how do they relate?" - spec vs implementation; mapper between objects and tables',
    '"map an Order with line items" - @Entity, @Id, @OneToMany(mappedBy) / @ManyToOne + @JoinColumn, cascade',
    '"Prisma vs Sequelize vs TypeORM" - schema-first generated client vs model definitions; type safety and migrations',
    '"why is saving an order issuing 20 queries?" - lazy loading, N+1, missing batch/fetch join (next modules)',
    '"entity vs DTO" - never expose entities directly from controllers'
  ],
  code: [
    { lang: 'java', check: false, title: 'JPA entities: Order and OrderItem (needs jakarta.persistence)', code: `import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")                       // "order" is a reserved SQL word, so we pick a safe name
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)   // database auto-increment
    private Long id;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Enumerated(EnumType.STRING)              // store 'NEW' / 'PAID', not 0 / 1 (ordinals break when you reorder)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.NEW;

    @Column(nullable = false, precision = 12, scale = 2)  // money: BigDecimal, never double
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // One order has many items. mappedBy = "order" says: the FK column lives in OrderItem.
    // cascade = ALL: saving/deleting the order saves/deletes its items too.
    // orphanRemoval: removing an item from the list deletes its row.
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    protected Order() { }                     // JPA needs a no-arg constructor
    public Order(String customerName) { this.customerName = customerName; }

    // Helper keeps BOTH sides of the relationship in sync.
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
        total = total.add(item.lineTotal());
    }
    public Long getId() { return id; }
    public String getCustomerName() { return customerName; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public BigDecimal getTotal() { return total; }
    public List<OrderItem> getItems() { return items; }
}

enum OrderStatus { NEW, PAID, SHIPPED, CANCELLED }

@Entity
@Table(name = "order_items")
class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)  // LAZY: do not load the order until asked
    @JoinColumn(name = "order_id", nullable = false)      // the foreign key column
    private Order order;

    @Column(nullable = false)
    private String product;
    @Column(nullable = false)
    private int qty;
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    protected OrderItem() { }
    OrderItem(String product, int qty, BigDecimal unitPrice) { this.product = product; this.qty = qty; this.unitPrice = unitPrice; }
    BigDecimal lineTotal() { return unitPrice.multiply(BigDecimal.valueOf(qty)); }
    void setOrder(Order order) { this.order = order; }
}` },
    { lang: 'sql', title: 'The tables those entities map to (runnable)', code: `CREATE TABLE orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'NEW',
  total         NUMERIC NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,  -- the foreign key
  product    TEXT    NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0),
  unit_price NUMERIC NOT NULL
);
CREATE INDEX idx_items_order ON order_items(order_id);  -- FKs deserve an index
INSERT INTO orders(customer_name, status, total) VALUES ('asha', 'NEW', 3400);
INSERT INTO order_items(order_id, product, qty, unit_price) VALUES (1, 'Keyboard', 2, 1500), (1, 'Mouse', 1, 400);
SELECT o.id, o.customer_name, i.product, i.qty, i.qty * i.unit_price AS line
FROM orders o JOIN order_items i ON i.order_id = o.id;` },
    { lang: 'text', title: 'Prisma: schema.prisma (schema-first)', code: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")      // read from the environment, never a literal URL with a password
}

generator client {
  provider = "prisma-client-js"
}

enum OrderStatus {
  NEW
  PAID
  SHIPPED
  CANCELLED
}

model Order {
  id           Int         @id @default(autoincrement())
  customerName String      @map("customer_name")      // field customerName <-> column customer_name
  status       OrderStatus @default(NEW)
  total        Decimal     @db.Decimal(12, 2) @default(0)
  createdAt    DateTime    @default(now()) @map("created_at")
  items        OrderItem[]                             // the "one" side: no column, just a relation
  @@map("orders")                                      // model Order <-> table orders
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int     @map("order_id")
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)  // the FK side
  product   String
  qty       Int
  unitPrice Decimal @map("unit_price") @db.Decimal(12, 2)
  @@index([orderId])
  @@map("order_items")
}` },
    { lang: 'js', title: 'Sequelize: models and association', code: `// npm install sequelize pg
const { Sequelize, DataTypes } = require('sequelize');

// Connection details come from the environment, never from source code.
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  logging: false
});

const Order = sequelize.define('Order', {
  customerName: { type: DataTypes.STRING(100), allowNull: false, field: 'customer_name' },
  status: { type: DataTypes.ENUM('NEW', 'PAID', 'SHIPPED', 'CANCELLED'), defaultValue: 'NEW' },
  total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'orders' });

const OrderItem = sequelize.define('OrderItem', {
  product: { type: DataTypes.STRING, allowNull: false },
  qty: { type: DataTypes.INTEGER, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'unit_price' }
}, { tableName: 'order_items' });

// hasMany puts the foreign key (orderId) on OrderItem.
Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = { sequelize, Order, OrderItem };` }
  ],
  codeTitle: ['JPA entities', 'SQL tables behind them', 'Prisma schema', 'Sequelize models'],
  viz: {
    title: 'Entity ↔ table row: saving an Order with items',
    input: 'asha,Keyboard:2,Mouse:1',
    inputLabel: 'customer,product:qty,product:qty (max 3 items)',
    gen: function (input) {
      var parts = String(input == null ? '' : input).split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x; });
      if (parts.length < 2) throw new Error('Format: customer,product:qty,product:qty  e.g. asha,Keyboard:2,Mouse:1');
      if (parts.length > 4) throw new Error('Use at most 3 items');
      var cust = parts[0];
      var prices = { keyboard: 1500, mouse: 400, monitor: 9000, cable: 150 };
      var items = [], total = 0;
      for (var i = 1; i < parts.length; i++) {
        var kv = parts[i].split(':');
        var q = parseInt(kv[1], 10);
        if (!kv[0] || isNaN(q) || q < 1 || q > 99) throw new Error('Each item must look like product:qty (qty 1-99), got "' + parts[i] + '"');
        var pr = prices[kv[0].toLowerCase()] || 100;
        items.push({ product: kv[0], qty: q, price: pr });
        total += q * pr;
      }
      var frames = [];
      var javaCode = 'Order o = new Order("' + cust + '");\n' + items.map(function (it) { return 'o.addItem(new OrderItem("' + it.product + '", ' + it.qty + ', ' + it.price + '));'; }).join('\n') + '\nrepo.save(o);';
      frames.push({ narr: 'In memory you build an <b>object graph</b>: one <code>Order</code> holding a list of <code>OrderItem</code> objects. Nothing is in the database yet - these are ordinary Java objects.', parts: [
        { type: 'code', label: 'Your code', lang: 'java', code: javaCode, hl: { 1: 'cur' } },
        { type: 'map', label: 'Order object (fields)', entries: [['customerName', cust], ['status', 'NEW'], ['total', total], ['items', items.length + ' OrderItem objects']], hl: { customerName: 'cur' } }
      ] });
      frames.push({ narr: 'The mapping says: class <code>Order</code> → table <code>orders</code>, and each field → a column (<code>customerName</code> → <code>customer_name</code>). This translation is written once with annotations, then reused for every row.', parts: [
        { type: 'map', label: 'Field → column mapping for Order', entries: [['Order (class)', 'orders (table)'], ['id', 'id'], ['customerName', 'customer_name'], ['status', 'status'], ['total', 'total']], hl: { 'Order (class)': 'sel', customerName: 'cur' } },
        { type: 'table', label: 'Table orders (before save)', columns: ['id', 'customer_name', 'status', 'total'], rows: [], hl: {} }
      ] });
      frames.push({ narr: '<code>save(order)</code> makes the ORM run an <code>INSERT INTO orders</code>. The database <b>generates the id</b> (auto-increment) and the ORM writes it back into the object\'s <code>id</code> field. Now object and row are tied together.', parts: [
        { type: 'code', label: 'SQL the ORM sent (1)', lang: 'sql', code: "INSERT INTO orders(customer_name, status, total)\nVALUES (?, 'NEW', " + total + ");", hl: { 1: 'ok' } },
        { type: 'table', label: 'Table orders (after INSERT)', columns: ['id', 'customer_name', 'status', 'total'], rows: [[1, cust, 'NEW', total]], hl: { 0: 'ok' } },
        { type: 'vars', label: 'Object after save', vals: { 'order.id': 1 }, hl: { 'order.id': 'ok' } }
      ] });
      var itemRows = items.map(function (it, k) { return [k + 1, 1, it.product, it.qty, it.price]; });
      var hl2 = {}; itemRows.forEach(function (_, k) { hl2[k] = 'ok'; });
      frames.push({ narr: 'Because of <code>cascade = ALL</code>, saving the order also saves its items. Each <code>OrderItem</code> becomes a row in <code>order_items</code>, and the <b>foreign key</b> <code>order_id = 1</code> points back to the order. That is how a Java <i>list</i> is stored in a relational database: not as a list, but as many rows that share a parent id.', parts: [
        { type: 'code', label: 'SQL the ORM sent (2..n)', lang: 'sql', code: items.map(function () { return 'INSERT INTO order_items(order_id, product, qty, unit_price) VALUES (1, ?, ?, ?);'; }).join('\n'), hl: { 1: 'ok' } },
        { type: 'table', label: 'Table order_items (order_id = foreign key)', columns: ['id', 'order_id', 'product', 'qty', 'unit_price'], rows: itemRows, hl: hl2 }
      ] });
      frames.push({ narr: 'Reading back: <code>findById(1)</code> runs <code>SELECT ... FROM orders WHERE id = 1</code>. The ORM turns that single row into an <code>Order</code> object. The <code>items</code> list is <b>lazy</b>: no <code>order_items</code> query has run yet.', parts: [
        { type: 'table', label: 'Row read from orders', columns: ['id', 'customer_name', 'status', 'total'], rows: [[1, cust, 'NEW', total]], hl: { 0: 'sel' } },
        { type: 'map', label: 'Rebuilt Order object', entries: [['id', 1], ['customerName', cust], ['items', '<not loaded yet - lazy proxy>']], hl: { items: 'cur' } }
      ] });
      frames.push({ narr: 'The moment your code touches <code>order.getItems()</code>, a second query runs: <code>SELECT ... FROM order_items WHERE order_id = 1</code>. Each row becomes an <code>OrderItem</code> object. This "load on first touch" is lazy loading - convenient, but the root of the N+1 problem you will meet in the Data Access Patterns module.', parts: [
        { type: 'table', label: 'Rows read from order_items', columns: ['id', 'order_id', 'product', 'qty', 'unit_price'], rows: itemRows, hl: hl2 },
        { type: 'map', label: 'Order object now', entries: [['id', 1], ['customerName', cust], ['items', items.map(function (it) { return it.product + 'x' + it.qty; }).join(', ')]], hl: { items: 'ok' } }
      ] });
      frames.push({ narr: 'Dirty checking: you call <code>order.setStatus(PAID)</code> inside a transaction and never call save. The ORM notices the field changed and, on commit, sends <code>UPDATE orders SET status = \'PAID\' WHERE id = 1</code>. The object is the "source of intent"; the ORM keeps the row in step.', parts: [
        { type: 'code', label: 'Your code', lang: 'java', code: 'order.setStatus(OrderStatus.PAID);\n// transaction commits -> flush', hl: { 1: 'cur' } },
        { type: 'table', label: 'Table orders (after flush)', columns: ['id', 'customer_name', 'status', 'total'], rows: [[1, cust, 'PAID', total]], hl: { 0: 'cur' } }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'Naming rules: where the ORM guesses the column name', html: `<p>By default Spring Boot + Hibernate turn <code>customerName</code> into <code>customer_name</code> (snake_case naming strategy). Prisma and Sequelize use the field name as is unless you write <code>@map</code> / <code>field:</code>. Explicit mapping beats surprise.</p>
      ${H.table(['Java field', 'Default column (Spring Boot)', 'Explicit'], [['customerName', 'customer_name', '<code>@Column(name = "customer_name")</code>'], ['createdAt', 'created_at', '<code>@Column(name = "created_at")</code>'], ['Order (class)', 'order (reserved word!)', '<code>@Table(name = "orders")</code>']])}` },
    { title: 'Keep both sides of a relationship in sync (plain Java, no ORM)', html: `<p>The most common beginner bug: adding an item to <code>order.getItems()</code> but forgetting <code>item.setOrder(order)</code>. The list looks right in memory, but the foreign-key side is empty, so the row is saved with a null <code>order_id</code>. A helper method makes it impossible to forget. This plain-Java version shows the idea without any framework.</p>`,
      code: `import java.math.BigDecimal;
import java.util.*;

class PlainOrder {
    final String customer;
    final List<PlainItem> items = new ArrayList<>();
    PlainOrder(String customer) { this.customer = customer; }

    void addItem(PlainItem item) {
        items.add(item);          // parent -> child
        item.order = this;        // child -> parent (this is the side that owns the foreign key)
    }
    BigDecimal total() {
        BigDecimal sum = BigDecimal.ZERO;
        for (PlainItem i : items) sum = sum.add(i.unitPrice.multiply(BigDecimal.valueOf(i.qty)));
        return sum;
    }
}

class PlainItem {
    PlainOrder order;
    final String product; final int qty; final BigDecimal unitPrice;
    PlainItem(String product, int qty, BigDecimal unitPrice) { this.product = product; this.qty = qty; this.unitPrice = unitPrice; }
}

class PlainDemo {
    public static void main(String[] args) {
        PlainOrder o = new PlainOrder("asha");
        o.addItem(new PlainItem("Keyboard", 2, new BigDecimal("1500")));
        o.addItem(new PlainItem("Mouse", 1, new BigDecimal("400")));
        System.out.println(o.total() + " " + (o.items.get(0).order == o)); // 3400 true
    }
}` },
    { title: 'Run the SQL the ORM would generate', html: `<p>Press Run on the DDL snippet in the code section above to create both tables and see the join result: one order, two item rows, each carrying <code>order_id = 1</code>. Below is the "total per order" query an ORM can't easily express without a custom query - a good example of where plain SQL is clearer.</p>`,
      code: { lang: 'sql', db: 'shop', title: 'Aggregate across the relationship', code: `SELECT o.id, o.status, COUNT(i.id) AS lines, SUM(i.qty * i.unit_price) AS computed_total
FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
GROUP BY o.id, o.status;` } },
    { title: 'DTOs: what to send to the client', html: `<p>An entity can hold lazy collections, internal flags or secrets. Controllers should return a small immutable <b>DTO</b>. Java <code>record</code>s are perfect:</p>`,
      code: `import java.math.BigDecimal;
import java.util.List;

record OrderItemView(String product, int qty, BigDecimal unitPrice) {}
record OrderView(long id, String customer, String status, BigDecimal total, List<OrderItemView> items) {}` }
  ],
  deepDive: `<p><b>Persistence context (first-level cache).</b> Inside one transaction, Hibernate keeps an identity map: asking twice for <code>Order 1</code> returns the <i>same Java object</i> without a second SELECT. It also remembers a snapshot of each loaded entity; at flush time it compares snapshots with current values (<b>dirty checking</b>) and generates UPDATEs only for changed fields. Entities live in four states: <i>transient</i> (new), <i>managed</i> (attached to the context), <i>detached</i> (context closed), <i>removed</i>. The infamous <code>LazyInitializationException</code> means "you touched a lazy field after the context closed."</p>
  <p><b>Id strategies.</b> <code>IDENTITY</code> uses the DB's auto-increment but disables JDBC insert batching in Hibernate (the id is needed right after each insert). <code>SEQUENCE</code> (PostgreSQL, Oracle) lets Hibernate pre-allocate ids in blocks and batch inserts. UUIDs avoid central counters and leak less (sequential ids reveal order volume) but are bigger in indexes; time-ordered UUIDv7 gives the best of both.</p>
  <p><b>equals / hashCode.</b> Never base them on all fields or on a generated id that is <code>null</code> before saving; put entities in a <code>HashSet</code> and they get lost after save. Use a business key or a stable approach, and avoid Lombok's <code>@Data</code> on entities (it also generates toString that triggers lazy loads and infinite loops in bidirectional relations).</p>
  <p><b>Schema ownership.</b> <code>hibernate.hbm2ddl.auto=update</code> is fine in a throwaway demo, dangerous in production (it never drops or renames, and can silently diverge). Use versioned migrations; set <code>validate</code> so the app refuses to start if entities and tables disagree. Prisma Migrate and Sequelize migrations follow the same principle: migration files in git, applied in CI.</p>
  <p><b>Prisma vs Sequelize at a glance.</b> Prisma generates types from the schema, so a typo in a field name is a compile error, and relations return typed results; it has its own query engine and a migration tool. Sequelize is more dynamic, with hooks and raw-query escape hatches, but types are weaker (the TypeScript story takes effort). TypeORM resembles JPA (decorators). Pick by team skills and need for type safety - and always read the generated SQL.</p>
  <p><b>The impedance mismatch.</b> Inheritance, collections, identity and navigation do not map one-to-one to relational tables: objects are navigated by reference, rows are joined by value; objects have identity by memory address, rows by key. ORMs bridge this with conventions, and each bridge has a cost (extra queries, caches, proxies). This is why "ORM magic" needs to be understood, not just used.</p>`,
  aiEra: `<p><b>What AI changes.</b> Given a table description, AI generates entity classes, Prisma schemas and migrations in seconds, and it can reverse-engineer a schema from an existing database (<code>prisma db pull</code> does this without AI). That removes boilerplate, not judgement: the hard questions - which side owns the relation, cascade or not, nullable or not, lazy or eager - depend on your business rules.</p>
  <p><b>Use AI as a partner:</b> <code>Here is my CREATE TABLE script. Generate JPA entities with correct relationships, then list every place where cascade, orphanRemoval or fetch type is a judgement call and explain the trade-off.</code> Ask for an ER diagram in Mermaid to review before coding. Ask it to explain a stack trace like <code>LazyInitializationException</code> or <code>detached entity passed to persist</code>.</p>
  <p><b>Where AI goes wrong:</b> it loves <code>@Data</code> on entities, <code>CascadeType.ALL</code> on every relation (deleting a user deletes everything), <code>FetchType.EAGER</code> "to be safe" (hidden performance cost), <code>double</code> for money, and enum <code>ORDINAL</code>. <b>What you must still own:</b> the data model, constraints in the database (NOT NULL, UNIQUE, FK), and the migration that changes production safely.</p>`,
  problems: [{
    title: 'Map Order and OrderItem Correctly',
    level: 'Medium', tags: ['jpa', 'hibernate', 'mapping', 'relationships'], companies: ['Walmart', 'Zalando'],
    statement: `<p>An online shop has an <code>orders</code> table and an <code>order_items</code> table (<code>order_id</code> is a foreign key to <code>orders.id</code>). Design the JPA entities. Requirements: items cannot exist without an order; deleting an order deletes its items; removing an item from an order's list deletes the row; the status is stored as readable text; money is exact; and you can add an item without forgetting to set the other side of the relationship. Explain who owns the foreign key.</p>`,
    constraints: `Use jakarta.persistence annotations. Order name clashes with the SQL keyword ORDER, so choose the table name explicitly.`,
    example: `<p>${H.c('g', 'Order.addItem(new OrderItem("Mouse", 1, 400))')} puts the item in the list <i>and</i> sets <code>item.order</code>. Saving the order inserts 1 row in <code>orders</code> and N rows in <code>order_items</code>, each with the right <code>order_id</code>.</p>`,
    brute: { why: `<p>A first attempt often uses <code>@OneToMany</code> without <code>mappedBy</code> (Hibernate then invents a join table <code>orders_items</code>), <code>@Enumerated</code> without STRING (stores 0/1), <code>double</code> for money, and no helper method (so <code>order_id</code> stays NULL).</p>` },
    mcq: { q: 'Which side owns the foreign key column in the Order/OrderItem mapping?', options: ['Order, via @OneToMany', 'OrderItem, via @ManyToOne + @JoinColumn', 'Neither; Hibernate decides at runtime', 'A separate join table'], answer: 1, explain: 'The foreign key column order_id lives in the order_items table, so the @ManyToOne side in OrderItem owns it. mappedBy on the Order side just points to that owner.' },
    hints: [`<p>Hint 1: the "many" side holds the foreign key. Which table is that here?</p>`, `<p>Hint 2: <code>@OneToMany(mappedBy = "order", cascade = ALL, orphanRemoval = true)</code> on Order and <code>@ManyToOne(fetch = LAZY) @JoinColumn(name = "order_id")</code> on OrderItem.</p>`, `<p>Hint 3: add <code>@Enumerated(EnumType.STRING)</code>, <code>BigDecimal</code> with precision/scale, an <code>addItem</code> helper, and a protected no-arg constructor. Also add <code>ON DELETE CASCADE</code> or rely on JPA cascade, and index <code>order_id</code>.</p>`],
    solution: {
      approach: `<p><b>Ownership:</b> <code>OrderItem</code> owns the foreign key (the column <code>order_id</code> is in its table), so it carries <code>@ManyToOne</code> + <code>@JoinColumn(name = "order_id", nullable = false)</code>. <code>Order</code> has <code>@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)</code>, which gives "delete order deletes items" and "remove from list deletes row" and prevents an extra join table. Status uses <code>@Enumerated(EnumType.STRING)</code>, money is <code>BigDecimal</code> with precision 12 scale 2, and the table is named <code>orders</code> explicitly. <code>addItem</code> updates both sides so <code>order_id</code> is never null. Fetch type on <code>@ManyToOne</code> is LAZY because EAGER loads the parent every time an item is read.</p>`,
      code: { lang: 'java', check: false, code: `@Entity @Table(name = "orders")
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private OrderStatus status = OrderStatus.NEW;
    @Column(precision = 12, scale = 2, nullable = false) private BigDecimal total = BigDecimal.ZERO;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    public void addItem(OrderItem item) { items.add(item); item.setOrder(this); }
    public void removeItem(OrderItem item) { items.remove(item); item.setOrder(null); }
}

@Entity @Table(name = "order_items")
class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    void setOrder(Order o) { this.order = o; }
}` },
      complexity: `<p>Saving an order with N items runs 1 + N INSERTs (batched if the id strategy allows). The index on <code>order_id</code> keeps "items of order X" a fast lookup.</p>`,
      followUps: ['Should deleting an order really delete its items in a real shop, or archive them?', 'What breaks if you switch the id strategy from IDENTITY to SEQUENCE?']
    }
  }]
});

/* =========================================================
   TOPIC 5 — Repositories and CRUD by naming convention
   ========================================================= */
topics.push({
  title: 'Repositories: CRUD, Naming-Convention Queries and Spring Data / Prisma Clients',
  analogy: `<p>A <b>repository</b> is a <b>librarian</b>. You do not walk into the stacks, decode shelf codes and pull books yourself (that is raw SQL). You say, "Please find all books by this author published after 2020", "add this new book", "remove that one". The librarian knows the shelving system. In Spring Data you do not even teach the librarian - you simply <i>write the sentence as a method name</i> (<code>findByAuthorAndYearGreaterThan</code>) and the framework works out the shelf lookup.</p>`,
  explain: `<p>🟢 <b>The plain idea.</b> The <b>Repository pattern</b> hides all database access behind an interface that looks like a <i>collection of objects</i>: <code>save</code>, <code>findById</code>, <code>findAll</code>, <code>delete</code>. Business code asks the repository; only the repository knows about SQL, tables and connections. This is the "R" in the controller → service → <b>repository</b> layering from the REST module.</p>
  <p>🔵 <b>Spring Data JPA in one minute.</b> You write only an <i>interface</i>:</p>
  <pre>public interface OrderRepository extends JpaRepository&lt;Order, Long&gt; { }</pre>
  <p>Spring generates the implementation at startup. You instantly get:</p>
  ${H.table(['Method', 'What it does', 'SQL behind it (roughly)'], [
    ['<code>save(order)</code>', 'insert if new (no id), update if it exists', '<code>INSERT ...</code> or <code>UPDATE ...</code>'],
    ['<code>findById(5)</code>', 'returns <code>Optional&lt;Order&gt;</code>', '<code>SELECT ... WHERE id = 5</code>'],
    ['<code>findAll()</code>', 'all rows (careful on big tables!)', '<code>SELECT ... FROM orders</code>'],
    ['<code>existsById(5)</code>', 'boolean', '<code>SELECT 1 ... WHERE id = 5</code>'],
    ['<code>count()</code>', 'number of rows', '<code>SELECT COUNT(*)</code>'],
    ['<code>deleteById(5)</code>', 'remove one', '<code>DELETE ... WHERE id = 5</code>']
  ])}
  <p>🔵 <b>Queries from the method name.</b> Spring splits the name into words and builds the query: <code>find</code> + <code>By</code> + <i>property</i> + <i>operator</i>.</p>
  ${H.table(['Method name', 'Meaning', 'SQL idea'], [
    ['<code>findByCustomerName(String n)</code>', 'equals', '<code>WHERE customer_name = ?</code>'],
    ['<code>findByStatusAndTotalGreaterThan(s, min)</code>', 'two conditions', '<code>WHERE status = ? AND total &gt; ?</code>'],
    ['<code>findByTotalBetween(a, b)</code>', 'range', '<code>WHERE total BETWEEN ? AND ?</code>'],
    ['<code>findByCustomerNameContainingIgnoreCase(t)</code>', 'substring search', '<code>WHERE lower(customer_name) LIKE lower(\'%t%\')</code>'],
    ['<code>findTop3ByStatusOrderByCreatedAtDesc(s)</code>', 'latest three', '<code>... ORDER BY created_at DESC LIMIT 3</code>'],
    ['<code>existsByCustomerName(n)</code>', 'does it exist?', '<code>SELECT 1 ... LIMIT 1</code>'],
    ['<code>countByStatus(s)</code>', 'count', '<code>SELECT COUNT(*) ... WHERE status = ?</code>'],
    ['<code>deleteByStatus(s)</code>', 'bulk delete (loads then deletes each!)', 'see deep dive']
  ])}
  <p>When the name would be too long or the query is complex, write it yourself with <code>@Query("select o from Order o join fetch o.items where o.id = :id")</code> (JPQL, which uses class and field names) or a native SQL query. Method names are great for 1-3 conditions; beyond that they become unreadable.</p>
  <p>🔵 <b>Node clients.</b> Prisma gives <code>prisma.order.findMany({ where: { status: 'NEW', total: { gt: 100 } } })</code>, <code>create</code>, <code>update</code>, <code>delete</code>, <code>count</code>. Sequelize: <code>Order.findAll({ where: { status: 'NEW' } })</code>, <code>Order.create(...)</code>, <code>instance.update(...)</code>, <code>destroy()</code>. Same ideas, different spelling.</p>
  <p>🔴 <b>Rules.</b> Return <code>Optional</code> (or throw a clear "not found" error) instead of null; never call <code>findAll()</code> on a large table - use pagination (<code>Pageable</code>, Prisma <code>take/skip</code>); keep business rules in the service, not in the repository; map to DTOs before returning from the controller.</p>`,
  clues: [
    '"write a Spring Data repository method to find ..." - derived query naming: findBy, And/Or, GreaterThan, Between, Containing, OrderBy, Top',
    '"how does Spring create the repository implementation if you only write an interface?" - runtime proxy, query derivation from method names',
    '"save() vs persist() vs merge()" - Spring Data save decides insert vs update by checking whether the entity is new',
    '"repository pattern, why?" - isolate persistence, easy mocking and swapping the data source',
    '"Prisma/Sequelize CRUD" - create, findUnique/findMany, update, delete, count with where filters'
  ],
  code: [
    { lang: 'java', check: false, title: 'Spring Data JPA repository (needs Spring)', code: `import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // Derived queries: the method NAME is the query.
    List<Order> findByCustomerName(String customerName);
    List<Order> findByStatusAndTotalGreaterThan(OrderStatus status, BigDecimal min);
    List<Order> findByCustomerNameContainingIgnoreCase(String fragment);
    Optional<Order> findFirstByCustomerNameOrderByCreatedAtDesc(String customerName);
    List<Order> findTop3ByStatusOrderByCreatedAtDesc(OrderStatus status);
    boolean existsByCustomerName(String customerName);
    long countByStatus(OrderStatus status);

    // Pagination and sorting are parameters, not hand-written LIMIT/OFFSET.
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    // When the name gets silly, write the query. :id is a NAMED PARAMETER (bound, injection-safe).
    @Query("select o from Order o join fetch o.items where o.id = :id")
    Optional<Order> findWithItems(@Param("id") Long id);

    // Bulk update in ONE statement instead of loading every entity.
    @Modifying
    @Query("update Order o set o.status = :to where o.status = :from")
    int bulkChangeStatus(@Param("from") OrderStatus from, @Param("to") OrderStatus to);
}` },
    { lang: 'java', title: 'The repository PATTERN in plain Java (compiles anywhere)', code: `import java.util.*;
import java.util.stream.*;

record Person(Long id, String name, int age) {}

/** The contract: business code depends on THIS, never on JDBC or a table. */
interface PersonRepository {
    Person save(Person p);                       // insert (id == null) or update
    Optional<Person> findById(long id);
    List<Person> findByAgeGreaterThan(int age);
    boolean deleteById(long id);
    long count();
}

/** One implementation: in memory (great for unit tests). A JDBC or JPA one can replace it later. */
class InMemoryPersonRepository implements PersonRepository {
    private final Map<Long, Person> rows = new LinkedHashMap<>();
    private long nextId = 1;                     // plays the role of AUTO_INCREMENT

    public Person save(Person p) {
        Person saved = p.id() == null ? new Person(nextId++, p.name(), p.age()) : p;
        rows.put(saved.id(), saved);
        return saved;
    }
    public Optional<Person> findById(long id) { return Optional.ofNullable(rows.get(id)); }
    public List<Person> findByAgeGreaterThan(int age) {
        return rows.values().stream().filter(p -> p.age() > age).collect(Collectors.toList());
    }
    public boolean deleteById(long id) { return rows.remove(id) != null; }
    public long count() { return rows.size(); }
}

/** A service uses the interface only - it cannot tell which implementation it got. */
class BirthdayService {
    private final PersonRepository repo;
    BirthdayService(PersonRepository repo) { this.repo = repo; }

    Person haveBirthday(long id) {
        Person p = repo.findById(id).orElseThrow(() -> new NoSuchElementException("no person " + id));
        return repo.save(new Person(p.id(), p.name(), p.age() + 1));  // same id -> update
    }
}` },
    { lang: 'python', run: true, title: 'A repository class over sqlite3 (runnable)', code: `import sqlite3

class PersonRepository:
    """All SQL for the person table lives here. Callers never see a cursor."""
    def __init__(self, conn):
        self.conn = conn
        self.conn.execute("CREATE TABLE IF NOT EXISTS person(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER NOT NULL)")

    def save(self, name, age, id=None):
        if id is None:                                   # new -> INSERT
            cur = self.conn.execute("INSERT INTO person(name, age) VALUES (?, ?)", (name, age))
            self.conn.commit()
            return cur.lastrowid
        self.conn.execute("UPDATE person SET name = ?, age = ? WHERE id = ?", (name, age, id))   # existing -> UPDATE
        self.conn.commit()
        return id

    def find_by_id(self, id):
        row = self.conn.execute("SELECT id, name, age FROM person WHERE id = ?", (id,)).fetchone()
        return row                                       # None if absent

    def find_by_age_greater_than(self, age):
        return self.conn.execute("SELECT id, name, age FROM person WHERE age > ? ORDER BY id", (age,)).fetchall()

    def delete_by_id(self, id):
        cur = self.conn.execute("DELETE FROM person WHERE id = ?", (id,))
        self.conn.commit()
        return cur.rowcount == 1

    def count(self):
        return self.conn.execute("SELECT COUNT(*) FROM person").fetchone()[0]

repo = PersonRepository(sqlite3.connect(":memory:"))
ann = repo.save("Ann", 30)
bob = repo.save("Bob", 25)
cy = repo.save("Cy", 41)
print("older than 26:", repo.find_by_age_greater_than(26))
repo.save("Ann", 31, id=ann)                              # update
print("after birthday:", repo.find_by_id(ann))
print("deleted bob:", repo.delete_by_id(bob), "| deleted again:", repo.delete_by_id(bob))
print("count:", repo.count())` },
    { lang: 'js', title: 'Prisma client: the same CRUD in Node', code: `// Assumes: const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient();
async function demo(prisma) {
  // CREATE (with a nested create: order + items in one call, one transaction)
  const order = await prisma.order.create({
    data: {
      customerName: 'asha',
      total: 3400,
      items: { create: [ { product: 'Keyboard', qty: 2, unitPrice: 1500 }, { product: 'Mouse', qty: 1, unitPrice: 400 } ] }
    },
    include: { items: true }          // also return the items
  });

  // READ
  const one = await prisma.order.findUnique({ where: { id: order.id } });                 // null if absent
  const many = await prisma.order.findMany({
    where: { status: 'NEW', total: { gt: 1000 } },                                          // derived-query equivalent
    orderBy: { createdAt: 'desc' }, take: 10, skip: 0                                       // pagination
  });
  const n = await prisma.order.count({ where: { status: 'NEW' } });

  // UPDATE
  await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });         // throws if id missing
  await prisma.order.updateMany({ where: { status: 'NEW' }, data: { status: 'CANCELLED' } }); // bulk, returns { count }

  // DELETE (cascade removes the items because of onDelete: Cascade in the schema)
  await prisma.order.delete({ where: { id: order.id } });
  return { one, many, n };
}
module.exports = { demo };` },
    { lang: 'js', title: 'Sequelize: the same CRUD', code: `// Assumes models from the previous topic: const { Order, OrderItem } = require('./models');
async function demo(Order, OrderItem) {
  const order = await Order.create({ customerName: 'asha', total: 3400 });          // INSERT
  await OrderItem.create({ orderId: order.id, product: 'Keyboard', qty: 2, unitPrice: 1500 });

  const one = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] }); // SELECT + JOIN
  const many = await Order.findAll({ where: { status: 'NEW' }, order: [['createdAt', 'DESC']], limit: 10 });
  const n = await Order.count({ where: { status: 'NEW' } });

  await order.update({ status: 'PAID' });                                            // UPDATE
  await Order.update({ status: 'CANCELLED' }, { where: { status: 'NEW' } });         // bulk update
  await order.destroy();                                                             // DELETE
  return { one, many, n };
}
module.exports = { demo };` }
  ],
  codeTitle: ['Spring Data JPA repository', 'Repository pattern in plain Java', 'Python repository (runs here)', 'Prisma CRUD', 'Sequelize CRUD'],
  viz: {
    title: 'Repository calls changing the table',
    input: 'save Ann 30; save Bob 25; save Cy 41; findByAgeGreaterThan 26; update 1 31; delete 2; count',
    inputLabel: 'Calls separated by ; (save name age | update id age | delete id | findById id | findByName n | findByAgeGreaterThan n | count)',
    gen: function (input) {
      var cmds = String(input == null ? '' : input).split(';').map(function (x) { return x.trim(); }).filter(function (x) { return x; });
      if (!cmds.length) throw new Error('Enter calls such as: save Ann 30; delete 1');
      if (cmds.length > 10) throw new Error('Use at most 10 calls');
      var rows = [], nextId = 1, cols = ['id', 'name', 'age'];
      function copy() { return rows.map(function (r) { return r.slice(); }); }
      var frames = [];
      frames.push({ narr: 'The table <code>person</code> is empty. A repository exposes <b>methods</b>; each call below becomes one SQL statement. Watch the table after every call.', parts: [
        { type: 'table', label: 'Table: person', columns: cols, rows: [], hl: {} },
        { type: 'vars', label: 'Next auto-increment id', vals: { nextId: 1 }, hl: {} }
      ] });
      for (var c = 0; c < cmds.length; c++) {
        var w = cmds[c].split(/\s+/), op = w[0], idx, r, sql, call, narr, res = '', hl = {}, tableRows;
        if (op === 'save') {
          var age = parseInt(w[2], 10);
          if (!w[1] || isNaN(age)) throw new Error('save needs a name and a number: save Ann 30');
          rows.push([nextId, w[1], age]); hl[rows.length - 1] = 'ok';
          call = 'repo.save(new Person(null, "' + w[1] + '", ' + age + '));';
          sql = 'INSERT INTO person(name, age) VALUES (?, ?);   -- id ' + nextId + ' generated by DB';
          narr = '<code>save</code> with <b>no id</b> means "new": the repository issues an <b>INSERT</b>, the database assigns id <b>' + nextId + '</b>, and the saved object comes back with that id.';
          nextId++;
        } else if (op === 'update') {
          var uid = parseInt(w[1], 10), nage = parseInt(w[2], 10);
          if (isNaN(uid) || isNaN(nage)) throw new Error('update needs id and age: update 1 31');
          idx = -1; for (var i = 0; i < rows.length; i++) if (rows[i][0] === uid) idx = i;
          call = 'person.setAge(' + nage + '); repo.save(person);   // id = ' + uid;
          sql = 'UPDATE person SET name = ?, age = ? WHERE id = ' + uid + ';';
          if (idx < 0) { narr = 'No row has id <b>' + uid + '</b>, so the UPDATE changes <b>0 rows</b>. A good service treats that as "not found".'; }
          else { rows[idx][2] = nage; hl[idx] = 'cur'; narr = '<code>save</code> with an <b>existing id</b> means "update": same method, but now an <b>UPDATE ... WHERE id = ' + uid + '</b>. Only that row changes.'; }
        } else if (op === 'delete') {
          var did = parseInt(w[1], 10);
          if (isNaN(did)) throw new Error('delete needs an id: delete 2');
          idx = -1; for (var j = 0; j < rows.length; j++) if (rows[j][0] === did) idx = j;
          call = 'repo.deleteById(' + did + ');';
          sql = 'DELETE FROM person WHERE id = ' + did + ';';
          if (idx < 0) { narr = 'No row has id <b>' + did + '</b>: <code>DELETE</code> affects 0 rows. (Spring Data older versions throw EmptyResultDataAccessException here; newer ones ignore it - know your version.)'; }
          else {
            hl[idx] = 'bad';
            frames.push({ narr: 'About to run <code>' + sql + '</code> - the row marked red will be removed.', parts: [{ type: 'code', label: 'Repository call', lang: 'java', code: call, hl: { 1: 'cur' } }, { type: 'table', label: 'Table: person (before delete)', columns: cols, rows: copy(), hl: hl }] });
            rows.splice(idx, 1); hl = {};
            narr = 'Row <b>' + did + '</b> is gone. Notice the other ids do not shift: ids are labels, not positions, and a deleted id is never reused.';
          }
        } else if (op === 'findById') {
          var fid = parseInt(w[1], 10);
          if (isNaN(fid)) throw new Error('findById needs an id');
          call = 'Optional<Person> p = repo.findById(' + fid + ');';
          sql = 'SELECT id, name, age FROM person WHERE id = ' + fid + ';';
          var hit = -1; for (var k = 0; k < rows.length; k++) if (rows[k][0] === fid) hit = k;
          if (hit >= 0) { hl[hit] = 'sel'; res = 'Optional[' + rows[hit][1] + ']'; narr = '<code>findById</code> reads without changing anything. The matching row is highlighted and returned inside an <code>Optional</code>.'; }
          else { res = 'Optional.empty'; narr = 'No such id, so the result is <code>Optional.empty</code> - an explicit "nothing", not a null surprise.'; }
        } else if (op === 'findByName') {
          if (!w[1]) throw new Error('findByName needs a name');
          call = 'List<Person> list = repo.findByName("' + w[1] + '");';
          sql = 'SELECT id, name, age FROM person WHERE name = ?;';
          var cnt = 0; rows.forEach(function (rr, ri) { if (rr[1] === w[1]) { hl[ri] = 'sel'; cnt++; } });
          res = cnt + ' row(s)'; narr = 'The method name <code>findByName</code> was turned into <code>WHERE name = ?</code> by the framework. Matches: <b>' + cnt + '</b>.';
        } else if (op === 'findByAgeGreaterThan') {
          var lim = parseInt(w[1], 10);
          if (isNaN(lim)) throw new Error('findByAgeGreaterThan needs a number');
          call = 'List<Person> list = repo.findByAgeGreaterThan(' + lim + ');';
          sql = 'SELECT id, name, age FROM person WHERE age > ' + lim + ';';
          var cnt2 = 0; rows.forEach(function (rr, ri) { if (rr[2] > lim) { hl[ri] = 'sel'; cnt2++; } });
          res = cnt2 + ' row(s)'; narr = '<b>GreaterThan</b> in the method name became <code>age &gt; ' + lim + '</code>. Purple rows are the result; the table itself is unchanged by a read.';
        } else if (op === 'count') {
          call = 'long n = repo.count();'; sql = 'SELECT COUNT(*) FROM person;'; res = String(rows.length);
          narr = '<code>count()</code> returns <b>' + rows.length + '</b>. The database counts; your code does not load rows just to count them.';
        } else { throw new Error('Unknown call "' + op + '". Use save, update, delete, findById, findByName, findByAgeGreaterThan or count'); }
        var parts = [{ type: 'code', label: 'Repository call', lang: 'java', code: call, hl: { 1: 'cur' } }, { type: 'code', label: 'SQL sent', lang: 'sql', code: sql, hl: { 1: 'ok' } }, { type: 'table', label: 'Table: person', columns: cols, rows: copy(), hl: hl }];
        if (res) parts.push({ type: 'vars', label: 'Returned to caller', vals: { result: res }, hl: { result: 'ok' } });
        frames.push({ narr: narr, parts: parts });
      }
      frames.push({ narr: 'End state of the table after ' + cmds.length + ' call(s). Reads never change it; <code>save</code> inserts or updates; <code>delete</code> removes. The repository hid every SQL string behind a method name.', parts: [{ type: 'table', label: 'Table: person (final)', columns: cols, rows: copy(), hl: {} }] });
      return frames;
    }
  },
  examples: [
    { title: 'Turn English requirements into repository methods', html: `<p>Practice reading the sentence as a method name: "<i>orders that are PAID, for this customer, newest first</i>" becomes <code>findByCustomerNameAndStatusOrderByCreatedAtDesc(name, PAID)</code>. Read it aloud and it matches the sentence.</p>
      ${H.table(['Requirement', 'Method'], [
        ['Does an account with this email exist?', '<code>boolean existsByEmail(String email)</code>'],
        ['Five most expensive products', '<code>List&lt;Product&gt; findTop5ByOrderByPriceDesc()</code>'],
        ['Users created between two dates', '<code>List&lt;User&gt; findByCreatedAtBetween(Instant a, Instant b)</code>'],
        ['Orders whose status is NEW or PAID', '<code>List&lt;Order&gt; findByStatusIn(Collection&lt;OrderStatus&gt; s)</code>'],
        ['Users with no phone number', '<code>List&lt;User&gt; findByPhoneIsNull()</code>']
      ])}` },
    { title: 'save() decides insert vs update', html: `<p>Spring Data's <code>save</code> asks "is this entity new?" - by default: is the id <code>null</code> (or a primitive 0)? New → <code>persist</code> (INSERT). Not new → <code>merge</code> (SELECT then UPDATE if different). Two consequences: (1) if you assign ids yourself (UUIDs set in the constructor) Spring thinks the entity is not new and runs an extra SELECT before INSERT - implement <code>Persistable</code> or use a <code>@Version</code> field; (2) <code>save</code> on a <i>managed</i> entity inside a transaction is unnecessary, because dirty checking flushes changes anyway.</p>`,
      code: { lang: 'java', check: false, code: `@Service
public class OrderService {
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; }

    @Transactional
    public Order markPaid(Long id) {
        Order o = repo.findById(id)
                      .orElseThrow(() -> new OrderNotFoundException(id));   // maps to HTTP 404 elsewhere
        o.setStatus(OrderStatus.PAID);
        return o;          // no repo.save(o) needed: o is managed, the UPDATE happens at commit
    }
}` } },
    { title: 'Pagination instead of findAll', html: `<p><code>findAll()</code> on a million-row table loads a million objects. Pass a <code>Pageable</code> and Spring adds <code>LIMIT/OFFSET</code> (and an extra <code>COUNT(*)</code> for page totals). In Prisma it is <code>take</code> and <code>skip</code>; in Sequelize <code>limit</code> and <code>offset</code>.</p>`,
      code: { lang: 'java', check: false, code: `Pageable page = PageRequest.of(0, 20, Sort.by("createdAt").descending()); // page 0, 20 rows
Page<Order> result = orderRepository.findByStatus(OrderStatus.NEW, page);
System.out.println(result.getContent().size() + " of " + result.getTotalElements());` } },
    { title: 'Testing the service without a database', html: `<p>Because the service depends on the <code>PersonRepository</code> <i>interface</i>, a unit test can pass the in-memory version: no Docker, no network, runs in milliseconds. This is the practical payoff of the pattern. A compact version of the idea:</p>`,
      code: `import java.util.*;

class RepoTest {
    record Person(Long id, String name, int age) {}
    interface PersonRepository { Person save(Person p); Optional<Person> findById(long id); }

    // A tiny fake used only in tests: a HashMap pretending to be the database.
    static class FakeRepo implements PersonRepository {
        private final Map<Long, Person> rows = new HashMap<>();
        private long next = 1;
        public Person save(Person p) {
            Person s = p.id() == null ? new Person(next++, p.name(), p.age()) : p;
            rows.put(s.id(), s);
            return s;
        }
        public Optional<Person> findById(long id) { return Optional.ofNullable(rows.get(id)); }
    }

    static Person haveBirthday(PersonRepository repo, long id) {
        Person p = repo.findById(id).orElseThrow();
        return repo.save(new Person(p.id(), p.name(), p.age() + 1));
    }

    public static void main(String[] args) {
        PersonRepository repo = new FakeRepo();
        Person ann = repo.save(new Person(null, "Ann", 30));
        System.out.println(haveBirthday(repo, ann.id()).age());   // 31, no database needed
    }
}` }
  ],
  deepDive: `<p><b>How Spring builds the implementation.</b> At startup Spring scans for interfaces extending <code>Repository</code>, creates a JDK dynamic proxy backed by <code>SimpleJpaRepository</code>, and for each declared method uses a <code>QueryLookupStrategy</code>: first an explicit <code>@Query</code>, else a named query, else it <b>parses the method name</b> with <code>PartTree</code> into a JPA Criteria query. Typos like <code>findByCostumerName</code> fail at <i>startup</i> ("No property costumerName found"), not at the first call - an excellent fail-fast property.</p>
  <p><b>Derived deletes are slow.</b> <code>deleteByStatus</code> first SELECTs all matching entities, then deletes them one at a time (so lifecycle callbacks and cascades run). For millions of rows use a <code>@Modifying @Query("delete ...")</code> bulk statement - but remember bulk statements bypass the persistence context, so entities already loaded in memory become stale (use <code>clearAutomatically = true</code>).</p>
  <p><b>Projections and N+1.</b> Returning full entities when you need two columns is wasteful. Spring Data supports interface/record projections (<code>List&lt;OrderSummary&gt; findByStatus(...)</code>) that select only the needed columns. And <code>findAll()</code> followed by touching a lazy collection on each entity is the classic N+1; solve with <code>join fetch</code>, <code>@EntityGraph</code>, or batch fetching (Data Access Patterns module).</p>
  <p><b>Repository vs DAO.</b> A DAO is table-centred ("CRUD for the users table"); a repository is domain-centred ("a collection of Orders" that may combine several tables). In Domain-Driven Design you have one repository per <i>aggregate root</i> (Order with its items), never one per table. Spring Data blurs the terms, but the thinking still matters: do not create <code>OrderItemRepository</code> if items are only ever changed through the Order.</p>
  <p><b>Concurrency.</b> <code>findById</code> then <code>save</code> is a read-modify-write: two requests can overwrite each other. Add a <code>@Version</code> field for optimistic locking (the UPDATE includes <code>WHERE version = ?</code> and fails if someone else changed the row). Prisma offers the same by hand with a version column in <code>where</code>.</p>
  <p><b>Prisma errors.</b> <code>findUnique</code> returns <code>null</code>; <code>update</code> and <code>delete</code> throw <code>P2025</code> ("record not found"); a unique violation throws <code>P2002</code>. Catch these codes in the service and translate them to 404 / 409.</p>`,
  aiEra: `<p><b>What AI changes.</b> Repositories are close to pure boilerplate, so AI writes them well and fast: "give me a repository for these 6 queries" usually works the first time. The risk moves to <b>what you asked for</b>. AI will happily generate <code>findAll()</code> plus filtering in Java ("it is simpler"), or a derived method with six conditions that nobody can read.</p>
  <p><b>Use AI as a partner:</b> <code>Translate these business questions into Spring Data method names, and flag any that should be @Query instead.</code> Or paste the SQL log of a slow endpoint and ask which repository call produced each statement and where an N+1 hides. Ask for a Testcontainers-based test that runs the real repository against a real PostgreSQL.</p>
  <p><b>Where AI goes wrong:</b> inventing keywords that do not exist (<code>findByNameLike%</code>), mixing JPQL and SQL table names, returning entities from controllers, and calling <code>save()</code> in a loop for 10,000 rows (use batching). <b>What you must still own:</b> which queries your app needs, the indexes that support them (a derived query does not create an index!), and pagination limits.</p>`,
  problems: [{
    title: 'Repository Methods from Requirements',
    level: 'Easy', tags: ['spring-data', 'derived-queries', 'repository'], companies: ['TCS', 'Cognizant'],
    statement: `<p>Given <code>entity Product(id, name, category, price, active, createdAt)</code>, write the Spring Data <code>ProductRepository</code> method signatures for: (a) all active products in a category; (b) products whose name contains a word, ignoring case; (c) the 5 newest active products; (d) whether any product has a given name; (e) products priced between two numbers, cheapest first; (f) the count of inactive products.</p>`,
    constraints: `Use derived query names only (no @Query). Entity fields as listed.`,
    example: `<p>(a) ${H.c('g', 'List&lt;Product&gt; findByCategoryAndActiveTrue(String category);')} becomes <code>WHERE category = ? AND active = true</code>.</p>`,
    brute: { why: `<p>Calling <code>findAll()</code> and filtering with Java streams works on 20 rows in a demo but loads every product into memory on a real catalogue, wastes bandwidth and ignores indexes.</p>` },
    mcq: { q: 'Which method returns the 3 newest active products?', options: ['findTop3ByActiveTrueOrderByCreatedAtDesc()', 'findByActiveTrueTop3()', 'findFirst3ByCreatedAt()', 'getNewest3()'], answer: 0, explain: 'Top/First N comes right after find, then By, then conditions, then OrderBy. The other names do not follow the grammar and fail at startup.' },
    hints: [`<p>Hint 1: the sentence order is find + By + property + operator + And/Or + OrderBy + Property + Asc/Desc.</p>`, `<p>Hint 2: booleans have shortcuts <code>True</code>/<code>False</code>; ranges use <code>Between</code>; text uses <code>Containing</code> plus <code>IgnoreCase</code>; limits use <code>Top5</code>.</p>`, `<p>Hint 3: return types: <code>List</code> for many, <code>boolean</code> for exists, <code>long</code> for count.</p>`],
    solution: {
      approach: `<p>Each requirement maps straight to a name. (a) <code>findByCategoryAndActiveTrue</code>. (b) <code>findByNameContainingIgnoreCase</code>. (c) <code>findTop5ByActiveTrueOrderByCreatedAtDesc</code>. (d) <code>existsByName</code>. (e) <code>findByPriceBetweenOrderByPriceAsc</code>. (f) <code>countByActiveFalse</code>. Each runs as one SQL statement with bound parameters. Remember to add database indexes matching the filters (for example on <code>(category, active)</code> and <code>created_at</code>), because derived queries do not create them.</p>`,
      code: { lang: 'java', check: false, code: `public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByCategoryAndActiveTrue(String category);
    List<Product> findByNameContainingIgnoreCase(String word);
    List<Product> findTop5ByActiveTrueOrderByCreatedAtDesc();
    boolean existsByName(String name);
    List<Product> findByPriceBetweenOrderByPriceAsc(BigDecimal min, BigDecimal max);
    long countByActiveFalse();
}` },
      complexity: `<p>Each is one query; cost depends on indexes: with matching indexes lookups are O(log n); a <code>Containing</code> search (<code>LIKE '%x%'</code>) cannot use a normal B-tree index and scans the table.</p>`,
      followUps: ['Which of these would you turn into @Query if a seventh condition appeared?', 'How would you add pagination to (a)?']
    }
  }]
});

/* =========================================================
   TOPIC 6 — Transactions: the money transfer
   ========================================================= */
topics.push({
  title: 'Transactions from Code: Commit, Rollback and the Money Transfer',
  analogy: `<p>You move ₹300 from your account to a friend's. Two things must happen: <b>take 300 from you</b> and <b>give 300 to your friend</b>. If the bank's computer crashed after the first step, the money would simply vanish. A <b>transaction</b> is a promise: "either <i>both</i> steps happen, or <i>neither</i> does." It is like putting both steps in a sealed envelope: the bank only opens and executes the envelope when everything inside succeeded (<b>commit</b>); if anything fails, the envelope is shredded and nothing changed (<b>rollback</b>).</p>`,
  explain: `<p>🟢 <b>The plain idea.</b> Many real actions need several SQL statements that belong together: transfer money, place an order (insert order + insert items + reduce stock), register a user (insert user + insert profile). A <b>transaction</b> groups them into one unit with the famous <b>ACID</b> guarantees:</p>
  ${H.table(['Letter', 'Word', 'Everyday meaning'], [
    ['A', 'Atomicity', 'All steps happen or none do - no half-done work'],
    ['C', 'Consistency', 'Rules (like balance ≥ 0, foreign keys) hold before and after'],
    ['I', 'Isolation', 'Other people do not see your half-finished work'],
    ['D', 'Durability', 'Once committed, it survives a crash or power cut']
  ])}
  <p>🔵 <b>Autocommit is the trap.</b> By default JDBC runs in <b>autocommit</b> mode: <i>every statement is its own tiny transaction</i> that commits immediately. A two-statement transfer in autocommit mode can leave the money taken but never given. To group statements you must switch it off:</p>
  <pre>conn.setAutoCommit(false);   // start grouping
... statement 1 ...
... statement 2 ...
conn.commit();              // success: make both permanent
// on any error:  conn.rollback();   // undo both</pre>
  <p>🔵 <b>The shape of every transaction code</b> (in any language):</p>
  <ol>
    <li><b>Begin</b> (turn off autocommit / <code>BEGIN</code>).</li>
    <li>Run the statements, checking each result (did the debit change exactly one row?).</li>
    <li><b>Commit</b> if all good.</li>
    <li>In <code>catch</code>: <b>rollback</b>, then rethrow so the caller knows it failed.</li>
    <li>In <code>finally</code>: restore autocommit and release the connection.</li>
  </ol>
  <p>🔴 <b>Two bugs that appear in almost every first attempt:</b></p>
  <ul>
    <li><b>Using two different connections</b> for the two statements. A transaction belongs to <i>one connection</i>. If the debit runs on connection A and the credit on connection B, they are two separate transactions and rollback cannot undo the other.</li>
    <li><b>Check-then-act:</b> "read balance, if enough then subtract" in two steps lets two concurrent requests both pass the check. Do it in <i>one statement</i>: <code>UPDATE accounts SET balance = balance - 300 WHERE id = 1 AND balance &gt;= 300</code> and check the row count is 1.</li>
  </ul>
  <p>🟣 <b>In frameworks.</b> Spring: annotate the service method with <code>@Transactional</code> and Spring opens the transaction, commits on normal return and rolls back on an unchecked exception. Prisma: <code>prisma.$transaction([...])</code> or an interactive <code>$transaction(async tx =&gt; ...)</code>. Sequelize: <code>sequelize.transaction(async t =&gt; ...)</code> where every query receives <code>{ transaction: t }</code>. (Propagation, isolation levels and pitfalls come in the Spring Boot Deep Dive and Data Access Patterns modules.)</p>`,
  clues: [
    '"transfer money between two accounts" - one transaction, atomic debit and credit, rollback on failure',
    '"ACID" / "what does atomicity mean?" - all-or-nothing, with the money transfer as the standard example',
    '"two requests spend the same balance at once" - atomic conditional UPDATE, row locks, isolation level, optimistic version column',
    '"@Transactional is not rolling back" - checked exception, self-invocation, or different connection/thread (Spring deep dive)',
    '"deadlock between two transfers A→B and B→A" - lock rows in a consistent order (lowest id first)'
  ],
  code: [
    `import java.math.BigDecimal;
import java.sql.*;

class TransferService {

    /** Moves money atomically. Throws if anything is wrong; in that case NOTHING has changed. */
    static void transfer(Connection conn, long fromId, long toId, BigDecimal amount) throws SQLException {
        if (amount.signum() <= 0) throw new IllegalArgumentException("amount must be positive");
        if (fromId == toId) throw new IllegalArgumentException("cannot transfer to the same account");

        boolean oldAutoCommit = conn.getAutoCommit();
        conn.setAutoCommit(false);                          // BEGIN: group the statements
        try {
            // Debit and the balance check in ONE statement: no race between "check" and "act".
            try (PreparedStatement debit = conn.prepareStatement(
                    "UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?")) {
                debit.setBigDecimal(1, amount);
                debit.setLong(2, fromId);
                debit.setBigDecimal(3, amount);
                if (debit.executeUpdate() != 1)             // 0 rows = no such account OR not enough money
                    throw new SQLException("insufficient funds or unknown source account");
            }
            try (PreparedStatement credit = conn.prepareStatement(
                    "UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
                credit.setBigDecimal(1, amount);
                credit.setLong(2, toId);
                if (credit.executeUpdate() != 1)
                    throw new SQLException("unknown destination account");   // debit will be rolled back too
            }
            conn.commit();                                  // COMMIT: both changes become permanent together
        } catch (SQLException | RuntimeException e) {
            conn.rollback();                                // ROLLBACK: undo the debit if it already ran
            throw e;                                        // let the caller know it failed
        } finally {
            conn.setAutoCommit(oldAutoCommit);              // leave the connection as we found it
        }
    }
}`,
    { lang: 'python', run: true, title: 'Commit vs rollback with sqlite3 (runnable)', code: `import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
CREATE TABLE accounts(id INTEGER PRIMARY KEY, owner TEXT, balance INTEGER NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 'asha', 1000), (2, 'ben', 200);
""")

def balances():
    return [tuple(r) for r in conn.execute("SELECT owner, balance FROM accounts ORDER BY id")]

def transfer(src, dst, amount, crash=False):
    try:
        with conn:                                    # commits on success, ROLLS BACK if an exception escapes
            cur = conn.execute("UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?",
                               (amount, src, amount))
            if cur.rowcount != 1:
                raise ValueError("insufficient funds")
            if crash:
                raise RuntimeError("server crashed between debit and credit!")
            conn.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (amount, dst))
        return "COMMITTED"
    except (ValueError, RuntimeError) as e:
        return "ROLLED BACK (" + str(e) + ")"

print("start             ", balances())
print("transfer 300      ", transfer(1, 2, 300), balances())
print("crash after debit ", transfer(1, 2, 100, crash=True), balances())   # asha must NOT lose 100
print("too much (5000)   ", transfer(1, 2, 5000), balances())
total = sum(b for _, b in balances())
print("total money:", total, "(must always be 1200)")` },
    `import java.sql.*;
import javax.sql.DataSource;

class SafeTransferWithOrdering {
    /**
     * Two transfers running in opposite directions (A to B and B to A) can deadlock:
     * each locks its own source row, then waits for the other's. Fix: always lock rows in the same order.
     */
    static void lockInOrder(Connection c, long a, long b) throws SQLException {
        long first = Math.min(a, b), second = Math.max(a, b);
        try (PreparedStatement ps = c.prepareStatement("SELECT id FROM accounts WHERE id IN (?, ?) ORDER BY id FOR UPDATE")) {
            ps.setLong(1, first);
            ps.setLong(2, second);
            try (ResultSet rs = ps.executeQuery()) { while (rs.next()) { /* rows are now locked until commit */ } }
        }
    }
}`,
    { lang: 'java', check: false, title: 'Spring: let the framework manage the transaction', code: `@Service
public class PaymentService {
    private final AccountRepository accounts;
    public PaymentService(AccountRepository accounts) { this.accounts = accounts; }

    // Spring opens a transaction, commits on return, rolls back on RuntimeException.
    // rollbackFor: also roll back on checked exceptions (default does NOT).
    @Transactional(rollbackFor = Exception.class)
    public void transfer(long from, long to, BigDecimal amount) {
        int debited = accounts.debitIfEnough(from, amount);      // UPDATE ... WHERE balance >= :amount
        if (debited != 1) throw new InsufficientFundsException(from);
        accounts.credit(to, amount);
    }
}` },
    { lang: 'js', title: 'Prisma and Sequelize transactions', code: `// Prisma interactive transaction: everything on 'tx' shares ONE connection and commits together.
async function transferPrisma(prisma, from, to, amount) {
  return prisma.$transaction(async function (tx) {
    const debit = await tx.account.updateMany({
      where: { id: from, balance: { gte: amount } },      // check + act in one statement
      data: { balance: { decrement: amount } }
    });
    if (debit.count !== 1) throw new Error('insufficient funds');   // throwing = rollback
    await tx.account.update({ where: { id: to }, data: { balance: { increment: amount } } });
  });
}

// Sequelize managed transaction: resolves => commit, throws => rollback.
async function transferSequelize(sequelize, Account, from, to, amount) {
  return sequelize.transaction(async function (t) {
    const [affected] = await Account.decrement('balance', { by: amount, where: { id: from }, transaction: t });
    await Account.increment('balance', { by: amount, where: { id: to }, transaction: t });
    return affected;                                      // pass { transaction: t } to EVERY query
  });
}` }
  ],
  codeTitle: ['JDBC money transfer', 'Python commit vs rollback (runs here)', 'Deadlock-safe locking order', 'Spring @Transactional', 'Prisma and Sequelize'],
  viz: {
    title: 'Transaction: commit vs rollback (money transfer)',
    input: '300',
    inputLabel: 'Amount from Asha (balance 1000) to Ben (200). Add "crash" to simulate a failure, e.g. 300 crash',
    gen: function (input) {
      var w = String(input == null ? '' : input).trim().toLowerCase().split(/\s+/);
      var amt = parseInt(w[0], 10);
      if (isNaN(amt) || amt < 1 || amt > 100000) throw new Error('Type an amount from 1 to 100000, optionally followed by the word crash');
      var crash = w[1] === 'crash';
      var A = 1000, B = 200;
      var cols = ['account', 'balance'];
      function committed(a, b) { return { type: 'table', label: 'What OTHER sessions see (committed data)', columns: cols, rows: [['Asha', a], ['Ben', b]], hl: {} }; }
      function mine(a, b, hl) { return { type: 'table', label: 'What THIS transaction sees', columns: cols, rows: [['Asha', a], ['Ben', b]], hl: hl || {} }; }
      var frames = [];
      frames.push({ narr: 'Asha has <b>1000</b>, Ben has <b>200</b>. Total money in the system: <b>1200</b>. We want to move <b>' + amt + '</b> from Asha to Ben. The transaction queue below holds the work done so far.', parts: [
        committed(A, B), { type: 'queue', label: 'Transaction queue (statements run so far)', items: [], frontLabel: 'first', backLabel: 'latest' }
      ] });
      frames.push({ narr: '<code>setAutoCommit(false)</code> = <b>BEGIN</b>. From now on, changes are held in a private "sealed envelope" for this connection. Other sessions cannot see them yet (isolation).', parts: [
        mine(A, B), committed(A, B), { type: 'queue', label: 'Transaction queue', items: ['BEGIN'], hl: { 0: 'cur' }, frontLabel: 'first', backLabel: 'latest' }
      ] });
      var failDebit = amt > A;
      if (failDebit) {
        frames.push({ narr: 'Statement 1: <code>UPDATE accounts SET balance = balance - ' + amt + ' WHERE id = 1 AND balance &gt;= ' + amt + '</code>. Asha only has 1000, so the <b>WHERE condition is false</b> and <b>0 rows</b> change. The code sees <code>executeUpdate() != 1</code> and throws "insufficient funds".', parts: [
          mine(A, B, { 0: 'bad' }), { type: 'queue', label: 'Transaction queue', items: ['BEGIN', 'debit Asha: 0 rows changed'], hl: { 1: 'bad' }, frontLabel: 'first', backLabel: 'latest' }
        ] });
        frames.push({ narr: '<span class="c-r">ROLLBACK.</span> Nothing was changed, but we still roll back to release locks and end the transaction cleanly, then rethrow the error to the caller (HTTP 409/422 in a real API).', parts: [
          mine(A, B), committed(A, B), { type: 'queue', label: 'Transaction queue', items: ['BEGIN', 'debit Asha: 0 rows changed'], hl: { 0: 'bad', 1: 'bad' }, frontLabel: 'first', backLabel: 'latest' }
        ] });
        frames.push({ narr: 'The queue is emptied. Money total is still <b>1200</b>. The failed request left <b>no trace</b> in the data - that is atomicity.', parts: [
          committed(A, B), { type: 'queue', label: 'Transaction queue', items: [], frontLabel: 'first', backLabel: 'latest' }, { type: 'vars', label: 'Result', vals: { outcome: 'ROLLED BACK', total: A + B }, hl: { outcome: 'bad', total: 'ok' } }
        ] });
        return frames;
      }
      frames.push({ narr: 'Statement 1 (debit): Asha\'s balance becomes <b>' + (A - amt) + '</b> <i>inside this transaction</i>. Other sessions still see <b>1000</b>. The money has left Asha but has not arrived at Ben yet - this half-finished state is exactly what a crash would expose without a transaction.', parts: [
        mine(A - amt, B, { 0: 'cur' }), committed(A, B), { type: 'queue', label: 'Transaction queue', items: ['BEGIN', 'debit Asha -' + amt], hl: { 1: 'cur' }, frontLabel: 'first', backLabel: 'latest' }
      ] });
      if (crash) {
        frames.push({ narr: '<span class="c-r">Crash!</span> An exception is thrown (server error, network drop, a bug) before the credit runs. The code jumps to <code>catch</code>.', parts: [
          mine(A - amt, B, { 0: 'bad' }), committed(A, B), { type: 'queue', label: 'Transaction queue', items: ['BEGIN', 'debit Asha -' + amt, 'credit Ben: NEVER RAN'], hl: { 1: 'bad', 2: 'bad' }, frontLabel: 'first', backLabel: 'latest' }
        ] });
        frames.push({ narr: '<code>conn.rollback()</code>: the database <b>discards the pending debit</b>. Asha\'s balance goes back to <b>1000</b>. Even if the process had been killed instead of catching the exception, the database would roll back the unfinished transaction when the connection died.', parts: [
          mine(A, B, { 0: 'ok' }), committed(A, B), { type: 'queue', label: 'Transaction queue (undone)', items: ['BEGIN', 'debit Asha -' + amt], hl: { 0: 'bad', 1: 'bad' }, frontLabel: 'first', backLabel: 'latest' }
        ] });
        frames.push({ narr: 'Queue cleared, money total still <b>1200</b>. Compare with autocommit mode, where the debit would already be permanent and ' + amt + ' would simply vanish.', parts: [
          committed(A, B), { type: 'queue', label: 'Transaction queue', items: [], frontLabel: 'first', backLabel: 'latest' }, { type: 'vars', label: 'Result', vals: { outcome: 'ROLLED BACK', total: A + B }, hl: { outcome: 'bad', total: 'ok' } }
        ] });
        return frames;
      }
      frames.push({ narr: 'Statement 2 (credit): Ben\'s balance becomes <b>' + (B + amt) + '</b> inside the transaction. Both halves are now done, but still invisible to other sessions.', parts: [
        mine(A - amt, B + amt, { 0: 'cur', 1: 'cur' }), committed(A, B), { type: 'queue', label: 'Transaction queue', items: ['BEGIN', 'debit Asha -' + amt, 'credit Ben +' + amt], hl: { 2: 'cur' }, frontLabel: 'first', backLabel: 'latest' }
      ] });
      frames.push({ narr: '<span class="c-g">COMMIT.</span> The database writes the change to its log on disk (durability) and then makes <b>both updates visible at the same instant</b>. There is no moment when anyone sees the money in neither account.', parts: [
        mine(A - amt, B + amt, { 0: 'ok', 1: 'ok' }), committed(A - amt, B + amt), { type: 'queue', label: 'Transaction queue (committed)', items: ['BEGIN', 'debit Asha -' + amt, 'credit Ben +' + amt, 'COMMIT'], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' }, frontLabel: 'first', backLabel: 'latest' }
      ] });
      frames.push({ narr: 'The queue empties; the transaction ends and the connection returns to autocommit and to the pool. Total money: <b>' + (A - amt + B + amt) + '</b>, unchanged. Try the input <code>' + amt + ' crash</code> or an amount over 1000 to see rollback.', parts: [
        committed(A - amt, B + amt), { type: 'queue', label: 'Transaction queue', items: [], frontLabel: 'first', backLabel: 'latest' }, { type: 'vars', label: 'Result', vals: { outcome: 'COMMITTED', total: A + B }, hl: { outcome: 'ok', total: 'ok' } }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'Autocommit: the bug that loses money', html: `<p>This looks innocent but there is no <code>setAutoCommit(false)</code>. Each <code>executeUpdate</code> commits immediately. If the process dies between the two calls, the debit is permanent and the credit never happens. Always check: <b>"if this line crashes, what state is the data in?"</b></p>`,
      code: `import java.sql.*;

class BrokenTransfer {
    static void transfer(Connection conn) throws SQLException {
        // autocommit is ON by default: every statement is its own transaction
        try (Statement st = conn.createStatement()) {
            st.executeUpdate("UPDATE accounts SET balance = balance - 300 WHERE id = 1"); // committed already!
            if (true) throw new IllegalStateException("crash here");                       // simulated failure
            st.executeUpdate("UPDATE accounts SET balance = balance + 300 WHERE id = 2"); // never reached
        }
    }
}` },
    { title: 'Rollback you can run in the browser', html: `<p>This script starts a transaction, makes a change, then rolls it back. The final SELECT shows the original balances because the change was never made permanent. Press Run, then change <code>ROLLBACK</code> to <code>COMMIT</code> and run again to see the difference.</p>`,
      code: { lang: 'sql', db: 'shop', title: 'BEGIN ... ROLLBACK', code: `BEGIN;
UPDATE accounts SET balance = balance - 300 WHERE id = 1;
UPDATE accounts SET balance = balance + 300 WHERE id = 2;
ROLLBACK;
SELECT owner, balance FROM accounts ORDER BY id;` } },
    { title: 'A constraint as a safety net', html: `<p>Application checks can have bugs; database constraints cannot be skipped. With <code>CHECK (balance &gt;= 0)</code> a debit that would make the balance negative raises an error <i>inside the database</i>, the transaction fails, and the rollback restores everything. Use both: check in code for a friendly message, and keep the constraint as the last line of defence.</p>`,
      code: { lang: 'sql', title: 'CHECK constraint stops overdraft (self-contained)', code: `CREATE TABLE acct(id INTEGER PRIMARY KEY, balance INTEGER NOT NULL CHECK (balance >= 0));
INSERT INTO acct VALUES (1, 100);
-- A plain "balance = balance - 150" would make the balance -50 and the CHECK constraint would reject it.
-- The conditional form below is the polite way: it simply changes 0 rows, and your code reports 'insufficient funds'.
UPDATE acct SET balance = balance - 150 WHERE id = 1 AND balance >= 150;   -- changes 0 rows
UPDATE acct SET balance = balance - 40  WHERE id = 1 AND balance >= 40;    -- changes 1 row
SELECT id, balance FROM acct;` } },
    { title: 'Order placement: three tables, one transaction', html: `<p>Placing an order touches several tables: insert the order, insert each item, decrease stock. If stock for the last item is insufficient, the first insert must vanish. In JPA this is one <code>@Transactional</code> service method; with plain JDBC it is one connection with one commit.</p>
      ${H.table(['Step', 'SQL', 'If it fails'], [['1', 'INSERT INTO orders', 'rollback'], ['2', 'INSERT INTO order_items (per line)', 'rollback'], ['3', 'UPDATE stock SET qty = qty - ? WHERE sku = ? AND qty &gt;= ?', 'rows = 0 → out of stock → rollback all'], ['4', 'COMMIT', '-']])}
      <p>Keep transactions <b>short</b>: never call a slow external service (payment gateway, email) while holding a transaction open - locks stay held and the pool drains.</p>` }
  ],
  deepDive: `<p><b>How durability works.</b> Databases use a <b>write-ahead log (WAL)</b>: before touching data pages, they append the change to a sequential log and <code>fsync</code> it. COMMIT returns only after the log record is on disk. After a crash the database <i>replays</i> committed log records and <i>undoes</i> uncommitted ones. That is why rollback after a crash is automatic, and why commits cost an fsync (often the main write latency; group commit batches several transactions per fsync).</p>
  <p><b>Isolation levels.</b> Real databases do not give full isolation by default, because it is expensive. Anomalies: <i>dirty read</i> (see uncommitted data), <i>non-repeatable read</i> (same row read twice differs), <i>phantom</i> (new rows appear in a repeated range query), <i>lost update</i> (two read-modify-writes overwrite). PostgreSQL's default is READ COMMITTED; MySQL InnoDB's is REPEATABLE READ; SERIALIZABLE prevents all anomalies but can abort transactions with SQLState <code>40001</code> that your code must <b>retry</b>. The conditional <code>UPDATE ... WHERE balance &gt;= ?</code> is safe even at READ COMMITTED because the row lock makes the second request re-evaluate the condition after the first commits.</p>
  <p><b>Locks and deadlocks.</b> An UPDATE takes a row lock until commit. Transfer A→B locks A then B; transfer B→A locks B then A; run together, each waits for the other: a <b>deadlock</b>. The database detects it and kills one transaction (error <code>40P01</code> in PostgreSQL). Prevention: acquire locks in a global order (lowest account id first), keep transactions short, retry on deadlock errors. <code>SELECT ... FOR UPDATE</code> locks rows early when you really need read-then-write.</p>
  <p><b>Savepoints and partial rollback.</b> <code>Savepoint sp = conn.setSavepoint(); ... conn.rollback(sp);</code> undoes only the part after the savepoint - useful for "try optional step, continue if it fails" inside a bigger transaction (Spring's <code>NESTED</code> propagation uses them).</p>
  <p><b>Distributed reality.</b> A transaction covers <i>one database</i>. Once your transfer calls another service (a payment provider, a message broker), there is no shared rollback. Real systems use the <b>outbox pattern</b> (write the event to an outbox table in the same transaction, publish it after commit), <b>idempotency keys</b> (retrying a request must not move money twice) and sagas with compensating actions. Remember also that a commit can succeed while the network drops the acknowledgement: the client does not know - which is why idempotency matters.</p>
  <p><b>Money rules.</b> Use integer minor units (paise/cents) or <code>DECIMAL</code>/<code>BigDecimal</code>, never floating point. Record transfers as immutable ledger entries (double-entry: a debit row and a credit row) rather than only overwriting balances, so you can audit and reconcile.</p>`,
  aiEra: `<p><b>What AI changes.</b> AI writes a clean-looking <code>@Transactional</code> transfer method in seconds - and quietly gets the dangerous parts wrong: read-then-write balance checks (race conditions), <code>double</code> for money, catching the exception inside the method so Spring never sees it and does not roll back, and calling an external payment API inside the transaction.</p>
  <p><b>Use AI as a partner:</b> ask it to <i>attack</i> your code: <code>Find every way this transfer can lose or duplicate money: crash points, concurrent requests, retries, deadlocks.</code> Have it write a concurrency test (100 threads transferring both directions) and check the total stays constant. Ask it to explain a deadlock log. AI agents that modify data on a user's behalf should run inside a transaction with a human-approval step before COMMIT for destructive operations.</p>
  <p><b>Where AI goes wrong:</b> it assumes a single connection when your code actually uses a pool and multiple threads; it forgets that rollback only helps the database - not the email you already sent. <b>What you must still own:</b> the transaction boundary (what must succeed together), isolation and locking choices, idempotency of retries, and proof under concurrency.</p>`,
  problems: [{
    title: 'Transfer Money Safely Under Concurrency',
    level: 'Hard', tags: ['transactions', 'jdbc', 'concurrency', 'acid'], companies: ['Stripe', 'Goldman Sachs', 'PhonePe'],
    statement: `<p>Implement <code>transfer(from, to, amount)</code> for a bank service using plain JDBC. Requirements: atomic (no money lost or created), no overdraft even if 100 requests hit the same account at once, no deadlock when A→B and B→A run simultaneously, and a retried request (same <code>requestId</code>) must not move money twice. Describe the algorithm and the code.</p>`,
    constraints: `PostgreSQL, READ COMMITTED default, one DB. Table accounts(id, balance NUMERIC CHECK (balance &gt;= 0)); table transfers(request_id PRIMARY KEY, from_id, to_id, amount).`,
    example: `<p>Two requests each debit ${H.c('b', '600')} from an account holding ${H.c('b', '1000')}: exactly one succeeds. The second sees 400 after the first commits, the condition <code>balance &gt;= 600</code> is false, 0 rows change, and it rolls back with "insufficient funds".</p>`,
    brute: { why: `<p>Naive: <code>SELECT balance</code>, check in Java, then two UPDATEs with autocommit on. Failures: (1) crash between UPDATEs loses money; (2) two threads both read 1000, both pass the check, balance goes to -200 (without a CHECK constraint) or one fails randomly; (3) opposite transfers deadlock; (4) a client retry after a timeout transfers twice.</p>`, code: `import java.math.BigDecimal;
import java.sql.*;

class BruteTransfer {
    static void transfer(Connection c, long from, long to, BigDecimal amt) throws SQLException {
        BigDecimal bal;
        try (PreparedStatement ps = c.prepareStatement("SELECT balance FROM accounts WHERE id = ?")) {
            ps.setLong(1, from);
            try (ResultSet rs = ps.executeQuery()) { rs.next(); bal = rs.getBigDecimal(1); }
        }
        if (bal.compareTo(amt) < 0) throw new SQLException("insufficient");   // check ...
        try (PreparedStatement d = c.prepareStatement("UPDATE accounts SET balance = balance - ? WHERE id = ?")) {
            d.setBigDecimal(1, amt); d.setLong(2, from); d.executeUpdate();   // ... then act (race!), autocommit ON
        }
        try (PreparedStatement k = c.prepareStatement("UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
            k.setBigDecimal(1, amt); k.setLong(2, to); k.executeUpdate();
        }
    }
}` },
    mcq: { q: 'Which single change fixes the race between the balance check and the debit?', options: ['Check in Java with synchronized', 'Use UPDATE ... SET balance = balance - ? WHERE id = ? AND balance >= ? and verify 1 row changed', 'Increase the connection pool size', 'Use double instead of BigDecimal'], answer: 1, explain: 'Putting check and change into one SQL statement makes the database evaluate it atomically under a row lock. synchronized only protects one JVM and fails with multiple app instances.' },
    hints: [`<p>Hint 1: four independent problems - atomicity, race on balance, lock order, duplicate retries. Give each its own tool.</p>`, `<p>Hint 2: one transaction on one connection; conditional UPDATE with row count check; lock or update the lower id first; insert the <code>requestId</code> into a table with a PRIMARY KEY at the start of the transaction.</p>`, `<p>Hint 3: recipe - BEGIN; INSERT transfers(request_id,...) (duplicate key = already done, return success); update lower id first; check rows; update the other; COMMIT; on 40001/40P01 retry the whole transaction a few times with backoff.</p>`],
    solution: {
      approach: `<p><b>Algorithm.</b> (1) Validate input, <code>setAutoCommit(false)</code> on one connection. (2) Insert a row into <code>transfers(request_id, ...)</code>. If it violates the primary key, this request already ran: roll back and return the earlier result (idempotency, and the insert is part of the same transaction so it is undone if the transfer fails). (3) Apply the two updates in <b>ascending account id order</b> so two opposite transfers always take locks in the same order and cannot deadlock; the debit uses <code>WHERE balance &gt;= ?</code> and must change exactly 1 row, the credit must change exactly 1 row. (4) Commit. (5) On any exception roll back; on serialization or deadlock errors (SQLState 40001, 40P01) retry the entire transaction with small backoff. The CHECK constraint stays as a last line of defence. Everything stays inside the DB so it works with many app instances. Keep the transaction short; do notifications after commit.</p>`,
      code: `import java.math.BigDecimal;
import java.sql.*;

class SafeTransfer {
    static void transfer(Connection c, String requestId, long from, long to, BigDecimal amt) throws SQLException {
        for (int attempt = 1; ; attempt++) {
            boolean old = c.getAutoCommit();
            c.setAutoCommit(false);
            try {
                try (PreparedStatement p = c.prepareStatement(
                        "INSERT INTO transfers(request_id, from_id, to_id, amount) VALUES (?, ?, ?, ?)")) {
                    p.setString(1, requestId); p.setLong(2, from); p.setLong(3, to); p.setBigDecimal(4, amt);
                    p.executeUpdate();                       // duplicate request_id -> SQLState 23505
                }
                // Always touch the lower id first -> consistent lock order -> no deadlock.
                if (from < to) { debit(c, from, amt); credit(c, to, amt); }
                else           { credit(c, to, amt);  debit(c, from, amt); }
                c.commit();
                return;
            } catch (SQLException e) {
                c.rollback();
                String st = e.getSQLState();
                if ("23505".equals(st)) return;              // already processed: idempotent success
                boolean retryable = "40001".equals(st) || "40P01".equals(st);
                if (!retryable || attempt >= 3) throw e;     // give up, or retry the whole transaction
            } finally {
                c.setAutoCommit(old);
            }
        }
    }
    private static void debit(Connection c, long id, BigDecimal amt) throws SQLException {
        try (PreparedStatement p = c.prepareStatement("UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?")) {
            p.setBigDecimal(1, amt); p.setLong(2, id); p.setBigDecimal(3, amt);
            if (p.executeUpdate() != 1) throw new SQLException("insufficient funds", "P0001");
        }
    }
    private static void credit(Connection c, long id, BigDecimal amt) throws SQLException {
        try (PreparedStatement p = c.prepareStatement("UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
            p.setBigDecimal(1, amt); p.setLong(2, id);
            if (p.executeUpdate() != 1) throw new SQLException("unknown account", "P0002");
        }
    }
}`,
      complexity: `<p>Each attempt is 3 statements and one commit (O(1) round trips). Contention only affects the two rows involved. Retries are bounded (3).</p>`,
      followUps: ['What changes if the two accounts live in different databases?', 'How would you add an audit ledger (double-entry) to this design?']
    }
  }]
});

/* =========================================================
   PRACTICE — Easy and Medium
   ========================================================= */
practice.push({
  title: 'Fail-Fast Connection Factory', level: 'Easy', tags: ['jdbc', 'config', 'secrets'], companies: ['Infosys', 'Capgemini'],
  statement: `<p>Write a small <code>Db</code> class with a method <code>open()</code> that returns a JDBC <code>Connection</code>. The URL, user and password must come from the environment variables <code>DB_URL</code>, <code>DB_USER</code> and <code>DB_PASSWORD</code>. If any is missing or blank, throw an exception <b>naming the missing variable</b> (but never printing a password). Also add a <code>describe()</code> method that returns a log-safe description of the target.</p>`,
  constraints: `No credentials in source code. Use try-with-resources at call sites; open() must not leak a connection if setup fails.`,
  example: `<p>With <code>DB_PASSWORD</code> unset: ${H.c('r', 'IllegalStateException: Missing environment variable DB_PASSWORD')}. With everything set, <code>describe()</code> returns ${H.c('g', 'shop_app@jdbc:postgresql://db:5432/shop')} (no password).</p>`,
  brute: { why: `<p>Hard-coding <code>"jdbc:mysql://localhost/shop", "root", "root"</code> works on the author's laptop and then ends up in git history, in the container image and in every developer's clone. A leaked password must be rotated everywhere.</p>`, code: `import java.sql.*;

class BadDb {
    static Connection open() throws SQLException {
        return DriverManager.getConnection("jdbc:mysql://localhost/shop", "root", "root"); // secrets in source!
    }
}` },
  mcq: { q: 'Where should a production database password come from?', options: ['A constant in the source code', 'application.properties committed to git', 'The environment / a secrets manager injected at runtime', 'A comment next to the connection code'], answer: 2, explain: 'Secrets must be injected at runtime (environment variables, Kubernetes Secrets, a vault) so they never live in git or in the image.' },
  hints: [`<p>Hint 1: a tiny helper <code>required(name)</code> that reads <code>System.getenv</code> and throws if null or blank removes the repeated checks.</p>`, `<p>Hint 2: if <code>getConnection</code> throws, nothing was opened, so there is nothing to close; but if you did extra setup after opening, close the connection in a catch before rethrowing.</p>`, `<p>Hint 3: <code>describe()</code> should use only user and URL. Never include the password in logs, exception messages or toString.</p>`],
  solution: {
    approach: `<p>A <code>required</code> helper validates each variable and names it in the error. <code>open()</code> reads the three variables first (fail fast before any network call), then connects. <code>describe()</code> builds the string from user and URL only. Callers wrap the connection in try-with-resources.</p>`,
    code: `import java.sql.*;

class Db {
    private static String required(String name) {
        String v = System.getenv(name);
        if (v == null || v.isBlank()) throw new IllegalStateException("Missing environment variable " + name);
        return v;
    }

    static Connection open() throws SQLException {
        String url = required("DB_URL");
        String user = required("DB_USER");
        String pass = required("DB_PASSWORD");          // read, but never logged
        return DriverManager.getConnection(url, user, pass);
    }

    static String describe() {
        return required("DB_USER") + "@" + required("DB_URL"); // no password here
    }
}`,
    complexity: `<p>O(1). The value is failing at startup with a clear message instead of an obscure authentication error later.</p>`,
    followUps: ['How would you support rotating the password without restarting the app?', 'Why prefer a connection pool over calling open() per request?']
  }
});

practice.push({
  title: 'Spot the Injectable Queries', level: 'Easy', tags: ['sql-injection', 'code-review'], companies: ['Cisco', 'Wipro'],
  statement: `<p>Review these four lines and say which are vulnerable to SQL injection, why, and the fix for each.</p>
  <pre>1) st.executeQuery("SELECT * FROM users WHERE id = " + userId);          // userId is a String from the URL
2) ps = c.prepareStatement("SELECT * FROM users WHERE name = ?"); ps.setString(1, name);
3) ps = c.prepareStatement("SELECT * FROM users WHERE name = '" + name + "'");
4) st.executeQuery("SELECT * FROM products ORDER BY " + sortParam);</pre>`,
  constraints: `userId, name and sortParam all come straight from HTTP request parameters.`,
  example: `<p>Line 2 is ${H.c('g', 'safe')}: the value is bound. Line 3 ${H.c('r', 'is still vulnerable')}: calling prepareStatement on a concatenated string prepares the already-poisoned text.</p>`,
  brute: { why: `<p>"Anything using PreparedStatement is safe" is the common wrong answer: it is the <i>placeholders</i> that protect you, not the class name.</p>` },
  mcq: { q: 'Line 4 uses ORDER BY with user text. What is the correct fix?', options: ['Bind it with ?', 'Escape single quotes', 'Map the user value through a fixed allowlist of column names', 'Convert to upper case'], answer: 2, explain: 'Placeholders only bind values, not identifiers. Allowlist the allowed sort columns in code.' },
  hints: [`<p>Hint 1: for each line ask "can request text change the SQL grammar (add a keyword, close a quote)?"</p>`, `<p>Hint 2: line 1 has no quotes, but a number position still accepts <code>1 OR 1=1</code>. Parsing to a number would help too, but binding is the real fix.</p>`, `<p>Hint 3: fixes: 1 and 3 use <code>?</code> with setLong/setString; 4 uses an allowlist map with a safe default.</p>`],
  solution: {
    approach: `<p><b>Line 1 - vulnerable.</b> No quotes needed: <code>userId = "0 OR 1=1"</code> returns every row. Fix: <code>WHERE id = ?</code> and <code>setLong(1, Long.parseLong(userId))</code> (parsing also rejects garbage early). <b>Line 2 - safe.</b> Value bound as data. <b>Line 3 - vulnerable.</b> Quotes plus concatenation; <code>' OR '1'='1</code> breaks out. Using prepareStatement here changes nothing because the SQL text already contains the attack. Fix: <code>name = ?</code>. <b>Line 4 - vulnerable.</b> The identifier position cannot be bound; the attacker can append sub-queries or <code>CASE</code> expressions for blind extraction. Fix: <code>Map.of("name","name","price","price").getOrDefault(sortParam, "name")</code> and use only the mapped constant. As defence in depth, run the app with a least-privilege database user.</p>`,
    complexity: `<p>Review cost is linear in lines of SQL; the discipline is "values bound, identifiers allowlisted".</p>`,
    followUps: ['How would you find all such lines in a 500k-line codebase?', 'What does a static-analysis rule need to detect?']
  }
});

practice.push({
  title: 'Student Records CRUD with Python sqlite3', level: 'Easy', tags: ['python', 'sqlite3', 'crud'], companies: ['Accenture', 'Zoho'], lang: 'python',
  statement: `<p>Using Python's built-in <code>sqlite3</code>, write functions <code>add_student(conn, name, grade)</code> (returns new id), <code>get_student(conn, id)</code> (returns a dict or None), <code>update_grade(conn, id, grade)</code> (returns True if a row changed), <code>delete_student(conn, id)</code> (returns True if deleted) and <code>top_students(conn, min_grade)</code>. Demonstrate each. All values must be bound with <code>?</code>.</p>`,
  constraints: `In-memory database; table student(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, grade INTEGER NOT NULL).`,
  example: `<p>add Asha 88 → id ${H.c('g', '1')}; update_grade(1, 92) → ${H.c('g', 'True')}; update_grade(99, 50) → ${H.c('r', 'False')} (no such student).</p>`,
  brute: { why: `<p>Building SQL with f-strings (<code>f"INSERT ... VALUES ('{name}', {grade})"</code>) breaks for a student named <code>O'Brien</code> and is injectable. Also forgetting <code>commit()</code> loses the data on close.</p>`, code: { lang: 'python', code: `def add_student_bad(conn, name, grade):
    conn.execute(f"INSERT INTO student(name, grade) VALUES ('{name}', {grade})")  # breaks on O'Brien, injectable
    # no commit -> change is lost when the connection closes` } },
  mcq: { q: 'How do you know whether an UPDATE changed anything in sqlite3?', options: ['cursor.rowcount', 'cursor.lastrowid', 'conn.total_changes is always 0', 'It raises an error when no row matches'], answer: 0, explain: 'rowcount reports how many rows matched and changed; 0 means "not found". lastrowid is for INSERT.' },
  hints: [`<p>Hint 1: <code>conn.execute(sql, params)</code> returns a cursor; params must be a tuple, so a single value is <code>(id,)</code>.</p>`, `<p>Hint 2: set <code>conn.row_factory = sqlite3.Row</code> and convert a row with <code>dict(row)</code>.</p>`, `<p>Hint 3: call <code>conn.commit()</code> after writes; use <code>cur.rowcount == 1</code> for update/delete results; <code>cur.lastrowid</code> after insert.</p>`],
  solution: {
    approach: `<p>Each function runs one parameterized statement. Writes commit; reads convert rows to dicts. Update and delete return whether exactly one row was affected so callers can distinguish "not found".</p>`,
    code: { lang: 'python', run: true, code: `import sqlite3

def connect():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE student(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, grade INTEGER NOT NULL)")
    return conn

def add_student(conn, name, grade):
    cur = conn.execute("INSERT INTO student(name, grade) VALUES (?, ?)", (name, grade))
    conn.commit()
    return cur.lastrowid

def get_student(conn, sid):
    row = conn.execute("SELECT id, name, grade FROM student WHERE id = ?", (sid,)).fetchone()
    return dict(row) if row else None

def update_grade(conn, sid, grade):
    cur = conn.execute("UPDATE student SET grade = ? WHERE id = ?", (grade, sid))
    conn.commit()
    return cur.rowcount == 1

def delete_student(conn, sid):
    cur = conn.execute("DELETE FROM student WHERE id = ?", (sid,))
    conn.commit()
    return cur.rowcount == 1

def top_students(conn, min_grade):
    rows = conn.execute("SELECT id, name, grade FROM student WHERE grade >= ? ORDER BY grade DESC", (min_grade,))
    return [dict(r) for r in rows]

conn = connect()
a = add_student(conn, "Asha", 88)
b = add_student(conn, "O'Brien", 75)        # the apostrophe is harmless with placeholders
print("ids:", a, b)
print(get_student(conn, a), get_student(conn, 99))
print("update:", update_grade(conn, a, 92), update_grade(conn, 99, 50))
print("top >= 80:", top_students(conn, 80))
print("delete:", delete_student(conn, b), delete_student(conn, b))` },
    complexity: `<p>Each call is one statement: primary-key operations are O(log n); top_students scans unless grade is indexed.</p>`,
    followUps: ['Add UNIQUE(name) and handle sqlite3.IntegrityError.', 'Wrap two operations in a single transaction.']
  }
});

practice.push({
  title: 'Fix the Broken PreparedStatement', level: 'Easy', tags: ['jdbc', 'prepared-statement', 'debugging'], companies: ['HCL', 'Tech Mahindra'],
  statement: `<p>This method should rename a user. It has five bugs (two cause runtime exceptions, two silently misbehave, one leaks). Find and fix them.</p>
  <pre>boolean rename(Connection c, long id, String newName) throws SQLException {
    PreparedStatement ps = c.prepareStatement("UPDATE users SET name = '?' WHERE id = ?");
    ps.setString(0, newName);
    ps.setLong(1, id);
    ps.executeQuery();
    return true;
}</pre>`,
  constraints: `Return true only if a row was actually updated.`,
  example: `<p>Bugs: ${H.c('r', "'?' in quotes is a literal question mark, not a placeholder")}; ${H.c('r', 'setString(0, ...) - JDBC indices start at 1')}; ${H.c('r', 'executeQuery on an UPDATE throws')}; statement never closed; and always returning true hides "no such user".</p>`,
  brute: { why: `<p>The buggy version compiles, which is why it slips through review. Each bug only fails at runtime or silently.</p>`, code: `import java.sql.*;

class BrokenRename {
    boolean rename(Connection c, long id, String newName) throws SQLException {
        PreparedStatement ps = c.prepareStatement("UPDATE users SET name = '?' WHERE id = ?");
        ps.setString(0, newName);
        ps.setLong(1, id);
        ps.executeQuery();
        return true;
    }
}` },
  mcq: { q: 'Why does name = \'?\' not work as a placeholder?', options: ['Quotes turn the question mark into a literal string, so there is no parameter to bind', 'JDBC forbids UPDATE', 'Question marks only work in SELECT', 'It works but is slow'], answer: 0, explain: 'Placeholders must stand alone; the driver adds quoting itself. Inside quotes, ? is just a character.' },
  hints: [`<p>Hint 1: count placeholders vs setXxx calls and check their numbering starts at 1.</p>`, `<p>Hint 2: for UPDATE/INSERT/DELETE use <code>executeUpdate()</code>, which returns an int.</p>`, `<p>Hint 3: use try-with-resources and return <code>count == 1</code>.</p>`],
  solution: {
    approach: `<p>Remove the quotes around the question mark, number parameters from 1, call <code>executeUpdate</code> (UPDATE returns a row count, executeQuery expects a ResultSet and throws), close the statement with try-with-resources, and return whether exactly one row changed so callers can tell "renamed" from "no such user".</p>`,
    code: `import java.sql.*;

class FixedRename {
    boolean rename(Connection c, long id, String newName) throws SQLException {
        String sql = "UPDATE users SET name = ? WHERE id = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, newName);       // parameters are 1-based
            ps.setLong(2, id);
            return ps.executeUpdate() == 1; // row count, not a ResultSet
        }
    }
}`,
    complexity: `<p>O(1) round trip, primary-key update.</p>`,
    followUps: ['What happens if two users may share a name and name has a UNIQUE constraint?', 'How would you return the updated user in one round trip?']
  }
});

practice.push({
  title: 'Insert 100,000 Rows Fast', level: 'Medium', tags: ['jdbc', 'batch', 'performance'], companies: ['Flipkart', 'Swiggy'],
  statement: `<p>You must load 100,000 events from memory into an <code>events(id, type, payload)</code> table. The first version calls <code>executeUpdate</code> in a loop with autocommit on and takes minutes. Rewrite it with batching and one transaction per chunk, and explain why it is faster and what can go wrong.</p>`,
  constraints: `JDBC, PostgreSQL. Memory must stay small; a failure should not leave half of a chunk inserted.`,
  example: `<p>100,000 single inserts = ${H.c('r', '100,000 network round trips + 100,000 commits')}. Batches of 1,000 = ${H.c('g', '100 round trips + 100 commits')}.</p>`,
  brute: { why: `<p>Autocommit + one statement per row pays a network round trip <i>and</i> a commit (log flush to disk) for each row. At 1 ms each that is almost two minutes of pure waiting.</p>`, code: `import java.sql.*;
import java.util.*;

class SlowLoad {
    static void load(Connection c, List<String> types) throws SQLException {
        for (String t : types) {                     // autocommit ON: each row commits separately
            try (PreparedStatement ps = c.prepareStatement("INSERT INTO events(type) VALUES (?)")) {
                ps.setString(1, t);
                ps.executeUpdate();
            }
        }
    }
}` },
  mcq: { q: 'What are the two main savings from batching inside a transaction?', options: ['Fewer network round trips and fewer commits', 'Smaller SQL text and no indexes', 'No locking and no logging', 'Compression and caching'], answer: 0, explain: 'addBatch/executeBatch sends many parameter sets per round trip, and committing once per chunk avoids a log flush per row.' },
  hints: [`<p>Hint 1: reuse one PreparedStatement and call <code>addBatch()</code> per row.</p>`, `<p>Hint 2: flush with <code>executeBatch()</code> every N rows (say 1000) and commit after each chunk; turn autocommit off first.</p>`, `<p>Hint 3: for PostgreSQL add <code>reWriteBatchedInserts=true</code> to the URL; mention COPY for the absolute fastest bulk load. On chunk failure roll back that chunk and report the chunk index.</p>`],
  solution: {
    approach: `<p>Turn autocommit off, prepare once, add rows to a batch and flush every 1,000 rows, committing after each flush. Memory holds one chunk. A failure rolls back only the current chunk, so completed chunks stay and the job can resume from the failed chunk. With the PostgreSQL driver, <code>reWriteBatchedInserts=true</code> turns a batch into multi-row INSERTs; for millions of rows use <code>COPY</code> (CopyManager).</p>`,
    code: `import java.sql.*;
import java.util.*;

class FastLoad {
    static void load(Connection c, List<String> types) throws SQLException {
        final int CHUNK = 1000;
        boolean old = c.getAutoCommit();
        c.setAutoCommit(false);
        try (PreparedStatement ps = c.prepareStatement("INSERT INTO events(type) VALUES (?)")) {
            int n = 0;
            for (String t : types) {
                ps.setString(1, t);
                ps.addBatch();
                if (++n % CHUNK == 0) {
                    ps.executeBatch();
                    c.commit();                       // one commit per chunk
                }
            }
            ps.executeBatch();                        // remainder
            c.commit();
        } catch (SQLException e) {
            c.rollback();                             // only the uncommitted chunk is undone
            throw e;
        } finally {
            c.setAutoCommit(old);
        }
    }
}`,
    complexity: `<p>N rows → about N/1000 round trips and commits instead of N. Memory O(chunk).</p>`,
    followUps: ['How do you make the load restartable?', 'When would you prefer COPY or a staging table?']
  }
});

practice.push({
  title: 'Prisma Schema for Customers and Addresses', level: 'Medium', tags: ['prisma', 'orm', 'relations'], companies: ['Razorpay', 'Postman'],
  statement: `<p>A customer can have many addresses; each address belongs to exactly one customer; deleting a customer deletes the addresses; each customer has a unique email. Write the Prisma models, then the Node code that creates a customer with two addresses in one call and lists customers in a city.</p>`,
  constraints: `PostgreSQL via Prisma; snake_case table names; DATABASE_URL from the environment.`,
  example: `<p>One <code>Customer</code> row ↔ many <code>Address</code> rows; the foreign key <code>customer_id</code> lives on ${H.c('b', 'Address')} (the "many" side).</p>`,
  brute: { why: `<p>Storing addresses as a JSON string or comma-separated text in a column makes filtering by city a full scan with string parsing, and loses constraints.</p>` },
  mcq: { q: 'In Prisma, which model holds the @relation(fields, references) pair with the foreign key?', options: ['Customer (the one side)', 'Address (the many side)', 'Both', 'Neither'], answer: 1, explain: 'The model whose table has the foreign key column declares fields/references; the one-side only lists Address[].' },
  hints: [`<p>Hint 1: the one side gets <code>addresses Address[]</code>; the many side gets <code>customerId Int</code> and a <code>@relation</code> line.</p>`, `<p>Hint 2: <code>@unique</code> on email, <code>onDelete: Cascade</code>, <code>@@map</code> for table names, <code>@@index([customerId])</code>.</p>`, `<p>Hint 3: nested write: <code>addresses: { create: [ {...}, {...} ] }</code>; filter through the relation with <code>where: { addresses: { some: { city: 'Pune' } } }</code>.</p>`],
  solution: {
    approach: `<p>Two models. <code>Customer</code> has <code>email String @unique</code> and <code>addresses Address[]</code> (no column). <code>Address</code> has <code>customerId</code>, the <code>@relation(fields: [customerId], references: [id], onDelete: Cascade)</code> and an index on the foreign key. A nested <code>create</code> inserts the customer and both addresses in a single transaction. The city filter uses the relation filter <code>some</code>, which Prisma translates to an <code>EXISTS</code> sub-query.</p>`,
    code: { lang: 'text', code: `model Customer {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String
  addresses Address[]
  @@map("customers")
}

model Address {
  id         Int      @id @default(autoincrement())
  city       String
  line1      String
  customerId Int      @map("customer_id")
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  @@index([customerId])
  @@map("addresses")
}` },
    alt: [{ lang: 'js', code: `async function demo(prisma) {
  const c = await prisma.customer.create({
    data: { email: 'asha@shop.test', name: 'Asha',
            addresses: { create: [ { city: 'Pune', line1: '12 MG Road' }, { city: 'Delhi', line1: '4 CP' } ] } },
    include: { addresses: true }
  });
  const inPune = await prisma.customer.findMany({
    where: { addresses: { some: { city: 'Pune' } } },
    include: { addresses: true }
  });
  return { c, inPune };
}` }],
    complexity: `<p>Nested create: 1 transaction, 3 INSERTs. The city query is index-assisted if you add an index on <code>addresses(city)</code>.</p>`,
    followUps: ['How would you mark one address as the default?', 'Soft delete vs cascade delete for customers?']
  }
});

practice.push({
  title: 'Safe IN (...) Queries with Many Ids', level: 'Medium', tags: ['jdbc', 'injection', 'in-clause'], companies: ['Oracle', 'SAP'],
  statement: `<p>Write <code>findUsers(Connection c, List&lt;Long&gt; ids)</code> that returns the names of users whose id is in the list. Do not concatenate ids into SQL. The list may be empty (return empty without querying) or contain 5,000 ids while the database allows at most 1,000 items per IN list.</p>`,
  constraints: `JDBC only. Preserve safety: every id is bound via ?.`,
  example: `<p>ids = [3, 7, 9] → SQL ${H.c('g', 'WHERE id IN (?, ?, ?)')} and three setLong calls. ids = [] → return an empty list ${H.c('r', '(IN () is a syntax error)')}.</p>`,
  brute: { why: `<p>Joining ids into a string (<code>"IN (" + String.join(",", ids) + ")"</code>) is injection-prone when ids arrive as strings, and every different list length produces a different SQL text, which defeats statement/plan caches.</p>` },
  mcq: { q: 'What is the issue with WHERE id IN () for an empty list?', options: ['It returns all rows', 'It is invalid SQL in most databases, so handle empty input before building the query', 'It is a deadlock', 'It is fine'], answer: 1, explain: 'An empty IN list is a syntax error in standard SQL. Short-circuit in code.' },
  hints: [`<p>Hint 1: generate the placeholder string with <code>Collections.nCopies(n, "?")</code> joined by commas.</p>`, `<p>Hint 2: split ids into chunks of 1000 with a loop and merge results.</p>`, `<p>Hint 3: bind each id with setLong(i + 1, id); handle the empty list first.</p>`],
  solution: {
    approach: `<p>Return early on an empty list. Process ids in chunks of at most 1,000. For each chunk build a SQL text from fixed pieces plus one <code>?</code> per id, bind each id, and add the names to a result list. User data never enters the SQL text, only its length (a number) does.</p>`,
    code: `import java.sql.*;
import java.util.*;

class InQuery {
    static List<String> findUsers(Connection c, List<Long> ids) throws SQLException {
        List<String> out = new ArrayList<>();
        if (ids.isEmpty()) return out;                           // IN () would be a syntax error
        for (int from = 0; from < ids.size(); from += 1000) {
            List<Long> chunk = ids.subList(from, Math.min(from + 1000, ids.size()));
            String marks = String.join(",", Collections.nCopies(chunk.size(), "?"));
            String sql = "SELECT name FROM users WHERE id IN (" + marks + ")";
            try (PreparedStatement ps = c.prepareStatement(sql)) {
                for (int i = 0; i < chunk.size(); i++) ps.setLong(i + 1, chunk.get(i));
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) out.add(rs.getString(1));
                }
            }
        }
        return out;
    }
}`,
    complexity: `<p>ceil(n / 1000) queries; each O(k log N) with an index on id.</p>`,
    followUps: ['How does PostgreSQL = ANY(?) with an array parameter simplify this?', 'How would you avoid plan-cache churn from varying list lengths?']
  }
});

practice.push({
  title: 'Second-Order Injection in a Report', level: 'Medium', tags: ['sql-injection', 'python', 'security'], companies: ['Okta', 'Adobe'], lang: 'python',
  statement: `<p>Users sign up with any username; the signup code uses safe placeholders. Later, an admin report builds <code>"SELECT * FROM orders WHERE owner = '" + username + "'"</code> using names read <i>from the database</i> ("it is trusted, it came from our own table"). A user registered as <code>x' OR '1'='1</code>. Show that the report leaks every order, then fix it.</p>`,
  constraints: `Python sqlite3, runnable. Show output before and after the fix.`,
  example: `<p>Signup stores the odd name safely. The report then produces ${H.c('r', "WHERE owner = 'x' OR '1'='1'")} and prints orders belonging to everyone.</p>`,
  brute: { why: `<p>Assuming data from your own database is clean. It is only as clean as the first place it was written; this is "second-order" (stored) injection.</p>` },
  mcq: { q: 'Which statement is true about data read back from your own database?', options: ['It is always safe to concatenate', 'It must be bound as a parameter like any other value', 'It is safe if it was validated at signup', 'It is safe if the app is behind a firewall'], answer: 1, explain: 'Trust is about how a value is used in a query, not where it came from. Bind every value.' },
  hints: [`<p>Hint 1: first reproduce: insert the user and some orders and run the string-built report.</p>`, `<p>Hint 2: the fix is the same as ever: <code>WHERE owner = ?</code> with the value passed separately.</p>`, `<p>Hint 3: print both versions' row counts to prove the difference.</p>`],
  solution: {
    approach: `<p>Signup is safe, but the report concatenates the stored username into SQL. When the nasty username is read back, the tautology matches every order. Replacing the concatenation with a bound parameter makes the same stored value just a name that matches only its own orders (none). The rule: bind every value in every query, including internal jobs and reports.</p>`,
    code: { lang: 'python', run: true, code: `import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT);
CREATE TABLE orders(id INTEGER PRIMARY KEY, owner TEXT, total INTEGER);
INSERT INTO orders VALUES (1,'asha',500),(2,'ben',300),(3,'chen',900);
""")
evil = "x' OR '1'='1"
conn.execute("INSERT INTO users(username) VALUES (?)", (evil,))   # signup is safe

def report_unsafe(conn):
    out = []
    for (name,) in conn.execute("SELECT username FROM users").fetchall():
        sql = "SELECT id, owner, total FROM orders WHERE owner = '" + name + "'"   # trusts stored data!
        out += conn.execute(sql).fetchall()
    return out

def report_safe(conn):
    out = []
    for (name,) in conn.execute("SELECT username FROM users").fetchall():
        out += conn.execute("SELECT id, owner, total FROM orders WHERE owner = ?", (name,)).fetchall()
    return out

print("unsafe report rows:", len(report_unsafe(conn)), report_unsafe(conn))
print("safe report rows:  ", len(report_safe(conn)), report_safe(conn))` },
    complexity: `<p>Same cost; the fix is purely about separating code from data.</p>`,
    followUps: ['What other internal paths often concatenate SQL (migrations, admin scripts, ETL)?', 'How can a linter catch this class of bug?']
  }
});

practice.push({
  title: 'Place an Order: Three Tables, One Transaction', level: 'Medium', tags: ['jdbc', 'transactions', 'inventory'], companies: ['Amazon', 'Myntra'],
  statement: `<p>Implement <code>placeOrder(Connection c, long customerId, Map&lt;String,Integer&gt; skuToQty)</code>: insert a row into <code>orders</code>, a row per SKU into <code>order_items</code>, and decrement <code>stock.qty</code> for each SKU. If any SKU lacks enough stock, nothing at all may be saved. Return the new order id.</p>`,
  constraints: `JDBC, one connection. stock(sku PRIMARY KEY, qty INT CHECK (qty &gt;= 0)). No check-then-act races.`,
  example: `<p>Order {A:2, B:5} with stock A=10, B=3 → B fails (3 &lt; 5). The inserted order and the already-decremented A must be ${H.c('r', 'rolled back')}, leaving A=10.</p>`,
  brute: { why: `<p>Checking stock with a SELECT first, then inserting, then updating: two buyers can both see qty 1 and both succeed (oversell). Also, with autocommit on, a failure on the second SKU leaves the order and first decrement saved.</p>` },
  mcq: { q: 'Which stock decrement is safe under concurrency?', options: ['SELECT qty, then UPDATE with qty - n computed in Java', 'UPDATE stock SET qty = qty - ? WHERE sku = ? AND qty >= ? and check 1 row changed', 'Synchronize the Java method', 'Retry until it works'], answer: 1, explain: 'The conditional UPDATE is atomic in the database and works across multiple app instances.' },
  hints: [`<p>Hint 1: one connection, <code>setAutoCommit(false)</code>, one commit at the very end.</p>`, `<p>Hint 2: insert the order with <code>RETURN_GENERATED_KEYS</code> to get its id for the items.</p>`, `<p>Hint 3: for each SKU run the conditional UPDATE; if it changes 0 rows throw, catch outside, rollback, rethrow. Sort SKUs to lock rows in a consistent order.</p>`],
  solution: {
    approach: `<p>Begin a transaction. Insert the order and read the generated id. For each SKU in sorted order (consistent lock order), run <code>UPDATE stock SET qty = qty - ? WHERE sku = ? AND qty &gt;= ?</code>; a count other than 1 means out of stock and throws. Insert the matching order_items row. Commit once. Any exception triggers rollback, which undoes the order row and earlier decrements together.</p>`,
    code: `import java.sql.*;
import java.util.*;

class OrderService {
    static long placeOrder(Connection c, long customerId, Map<String, Integer> skuToQty) throws SQLException {
        boolean old = c.getAutoCommit();
        c.setAutoCommit(false);
        try {
            long orderId;
            try (PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO orders(customer_id, status) VALUES (?, 'NEW')", Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, customerId);
                ps.executeUpdate();
                try (ResultSet k = ps.getGeneratedKeys()) { k.next(); orderId = k.getLong(1); }
            }
            try (PreparedStatement take = c.prepareStatement("UPDATE stock SET qty = qty - ? WHERE sku = ? AND qty >= ?");
                 PreparedStatement item = c.prepareStatement("INSERT INTO order_items(order_id, sku, qty) VALUES (?, ?, ?)")) {
                for (Map.Entry<String, Integer> e : new TreeMap<>(skuToQty).entrySet()) {   // sorted = consistent lock order
                    take.setInt(1, e.getValue());
                    take.setString(2, e.getKey());
                    take.setInt(3, e.getValue());
                    if (take.executeUpdate() != 1) throw new SQLException("out of stock: " + e.getKey());
                    item.setLong(1, orderId);
                    item.setString(2, e.getKey());
                    item.setInt(3, e.getValue());
                    item.executeUpdate();
                }
            }
            c.commit();
            return orderId;
        } catch (SQLException | RuntimeException e) {
            c.rollback();
            throw e;
        } finally {
            c.setAutoCommit(old);
        }
    }
}`,
    complexity: `<p>O(k) statements for k SKUs, one commit. Row locks are held only for the short transaction.</p>`,
    followUps: ['How would you reserve stock for 15 minutes before payment?', 'How do you avoid holding locks while charging the card?']
  }
});

practice.push({
  title: 'Design the Repository Layer for a Blog', level: 'Medium', tags: ['spring-data', 'repository', 'design'], companies: ['Atlassian', 'Freshworks'],
  statement: `<p>A blog has <code>Post(id, title, body, authorId, published, createdAt)</code> and <code>Author(id, name, email)</code>. Design the Spring Data repositories and methods for: newest 10 published posts; posts by an author (paged); search titles containing a word; one post with its author in a single query; publish all drafts of an author in one statement. Explain which are derived and which are @Query, and what indexes you would add.</p>`,
  constraints: `Spring Data JPA. Avoid N+1 when listing posts with author names.`,
  example: `<p>Newest ten: ${H.c('g', 'findTop10ByPublishedTrueOrderByCreatedAtDesc()')}. Bulk publish: ${H.c('b', '@Modifying @Query("update Post p set p.published = true where p.author.id = :a and p.published = false")')}.</p>`,
  brute: { why: `<p><code>findAll()</code> then filter and sort in Java loads the whole table, and accessing <code>post.getAuthor().getName()</code> in a loop issues one extra query per post (N+1).</p>` },
  mcq: { q: 'How do you load a Post together with its Author in one query?', options: ['Call getAuthor() later', '@Query with join fetch (or @EntityGraph)', 'Use FetchType.EAGER everywhere', 'Run findAll twice'], answer: 1, explain: 'join fetch / EntityGraph tells JPA to select the author in the same SQL join. Global EAGER often causes extra queries elsewhere.' },
  hints: [`<p>Hint 1: first list the five questions as sentences, then turn each into a method name.</p>`, `<p>Hint 2: derived names cover the first three; "post with author" and bulk publish need @Query (join fetch; @Modifying).</p>`, `<p>Hint 3: indexes: <code>posts(published, created_at)</code>, <code>posts(author_id, created_at)</code>; title search with Containing cannot use a B-tree (consider full-text search).</p>`],
  solution: {
    approach: `<p>Derived: <code>findTop10ByPublishedTrueOrderByCreatedAtDesc()</code>, <code>Page&lt;Post&gt; findByAuthorId(Long id, Pageable p)</code>, <code>findByTitleContainingIgnoreCase(String w)</code>. Custom: <code>@Query("select p from Post p join fetch p.author where p.id = :id") Optional&lt;Post&gt; findWithAuthor(Long id)</code> avoids lazy-loading the author with a second query, and a <code>@Modifying @Query</code> update publishes all drafts in a single SQL statement rather than loading entities one by one. For listings that need author names use a join-fetch query or a DTO projection. Indexes: (published, created_at) for the front page, (author_id, created_at) for author pages. Title substring search (<code>LIKE '%w%'</code>) does a scan; at scale use a full-text index (PostgreSQL GIN/tsvector) or a search engine.</p>`,
    code: { lang: 'java', check: false, code: `public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findTop10ByPublishedTrueOrderByCreatedAtDesc();
    Page<Post> findByAuthorId(Long authorId, Pageable pageable);
    List<Post> findByTitleContainingIgnoreCase(String word);

    @Query("select p from Post p join fetch p.author where p.id = :id")
    Optional<Post> findWithAuthor(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("update Post p set p.published = true where p.author.id = :a and p.published = false")
    int publishDrafts(@Param("a") Long authorId);
}` },
    complexity: `<p>Each method is one SQL statement; costs depend on the indexes above.</p>`,
    followUps: ['What breaks if you return Post entities directly from the controller?', 'How would keyset pagination replace Pageable for the front page?']
  }
});

/* =========================================================
   PRACTICE — Hard (and one more Medium-style mix kept in order)
   ========================================================= */
practice.push({
  title: 'Build a Mini JdbcTemplate with Transactions', level: 'Hard', tags: ['jdbc', 'design', 'generics', 'transactions'], companies: ['Google', 'Uber'],
  statement: `<p>Spring's <code>JdbcTemplate</code> removes JDBC boilerplate. Build <code>MiniJdbc</code> with: <code>query(sql, mapper, args...)</code> returning a list, <code>queryOne</code> returning <code>Optional</code>, <code>update(sql, args...)</code> returning the row count, and <code>inTransaction(work)</code> so that several calls inside the work share one connection and commit or roll back together. Callers must never touch a Connection, Statement or ResultSet.</p>`,
  constraints: `Plain JDK (java.sql, javax.sql.DataSource). Thread-safe; nested inTransaction calls join the outer one.`,
  example: `<p><code>db.inTransaction(() -> { db.update(debitSql, 300, 1); db.update(creditSql, 300, 2); return null; })</code> - both updates run on ${H.c('g', 'one connection')}; an exception from either one rolls both back.</p>`,
  brute: { why: `<p>Each DAO method opens its own connection, so two calls can never be in the same transaction, and every method repeats the same try/catch/close ritual (where one forgotten close leaks connections).</p>`, code: `import java.sql.*;
import javax.sql.DataSource;

class RepeatedBoilerplate {
    DataSource ds;
    int countUsers() throws SQLException {
        Connection c = ds.getConnection();
        try {
            PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM users");
            ResultSet rs = ps.executeQuery();
            rs.next();
            int n = rs.getInt(1);
            rs.close(); ps.close();
            return n;
        } finally {
            c.close();                    // copy-pasted into every method
        }
    }
}` },
  mcq: { q: 'How can several MiniJdbc calls share one connection without passing it around?', options: ['Make the connection a static field', 'Bind the transaction connection to the current thread (ThreadLocal) while the work runs', 'Open a new connection for each call and hope', 'Use synchronized on every method'], answer: 1, explain: 'A ThreadLocal holding the transactional connection lets every call on that thread reuse it, then it is removed in finally. Spring does the same with TransactionSynchronizationManager.' },
  hints: [`<p>Hint 1: define a functional interface <code>RowMapper&lt;T&gt;</code> with <code>T map(ResultSet rs, int rowNum)</code> so the caller writes only the mapping lambda.</p>`, `<p>Hint 2: one private helper decides which connection to use: the thread's current transaction connection if present (do not close it), otherwise a fresh pooled one (close it).</p>`, `<p>Hint 3: inTransaction sets autocommit false, stores the connection in a ThreadLocal, runs the work, commits, rolls back on exception, and always clears the ThreadLocal and restores autocommit in finally. If a transaction is already active, just run the work (join).</p>`],
  solution: {
    approach: `<p>Core design: callers supply SQL, arguments and a mapper lambda; the template owns all resource handling. A private <code>withConnection</code> picks the transaction's connection if one is bound to the thread (and leaves it open), or borrows a pooled one for a single call. <code>inTransaction</code> borrows one connection, turns off autocommit, binds it to the thread, runs the work, commits, and on failure rolls back and rethrows; the <code>finally</code> clears the binding and restores autocommit so the pooled connection is clean. Nested calls join the outer transaction, mirroring <code>PROPAGATION_REQUIRED</code>. Thread-safety: the only shared state is the DataSource (thread-safe); transaction state is per thread.</p>`,
    code: `import java.sql.*;
import java.util.*;
import javax.sql.DataSource;

@FunctionalInterface interface RowMapper<T> { T map(ResultSet rs, int rowNum) throws SQLException; }
@FunctionalInterface interface TxWork<R> { R run() throws SQLException; }
@FunctionalInterface interface ConnWork<R> { R apply(Connection c) throws SQLException; }

class MiniJdbc {
    private final DataSource ds;
    private final ThreadLocal<Connection> current = new ThreadLocal<>();

    MiniJdbc(DataSource ds) { this.ds = ds; }

    <T> List<T> query(String sql, RowMapper<T> mapper, Object... args) throws SQLException {
        return withConnection(c -> {
            try (PreparedStatement ps = c.prepareStatement(sql)) {
                bind(ps, args);
                try (ResultSet rs = ps.executeQuery()) {
                    List<T> out = new ArrayList<>();
                    int row = 0;
                    while (rs.next()) out.add(mapper.map(rs, row++));
                    return out;
                }
            }
        });
    }

    <T> Optional<T> queryOne(String sql, RowMapper<T> mapper, Object... args) throws SQLException {
        List<T> rows = query(sql, mapper, args);
        if (rows.size() > 1) throw new SQLException("expected at most one row but got " + rows.size());
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    int update(String sql, Object... args) throws SQLException {
        return withConnection(c -> {
            try (PreparedStatement ps = c.prepareStatement(sql)) {
                bind(ps, args);
                return ps.executeUpdate();
            }
        });
    }

    <R> R inTransaction(TxWork<R> work) throws SQLException {
        if (current.get() != null) return work.run();           // join the surrounding transaction
        try (Connection c = ds.getConnection()) {
            boolean old = c.getAutoCommit();
            c.setAutoCommit(false);
            current.set(c);
            try {
                R result = work.run();
                c.commit();
                return result;
            } catch (SQLException | RuntimeException e) {
                c.rollback();
                throw e;
            } finally {
                current.remove();
                c.setAutoCommit(old);
            }
        }
    }

    private <R> R withConnection(ConnWork<R> work) throws SQLException {
        Connection tx = current.get();
        if (tx != null) return work.apply(tx);                   // transactional: reuse, never close here
        try (Connection c = ds.getConnection()) { return work.apply(c); }
    }

    private static void bind(PreparedStatement ps, Object[] args) throws SQLException {
        for (int i = 0; i < args.length; i++) ps.setObject(i + 1, args[i]);   // 1-based
    }
}`,
    complexity: `<p>Overhead per call is O(args). One connection per transaction; the ThreadLocal makes the lookup O(1).</p>`,
    followUps: ['How would you support async code where the thread changes mid-transaction?', 'Add savepoint-based nested transactions.']
  }
});

practice.push({
  title: 'Optimistic Locking with a Version Column', level: 'Hard', tags: ['concurrency', 'jdbc', 'optimistic-locking'], companies: ['Shopify', 'Microsoft'],
  statement: `<p>Two admins open the same product page and both change the price. Admin A saves at 10:00, admin B (who loaded the page earlier) saves at 10:01 and silently overwrites A's change (lost update). Prevent this without holding a database lock while a human edits. Implement it in JDBC with a <code>version</code> column, return a clear conflict signal, and show a bounded retry for the automated case.</p>`,
  constraints: `products(id, price, version INT NOT NULL DEFAULT 0). No long-held locks. Must work with several app instances.`,
  example: `<p>Both load version ${H.c('b', '3')}. A saves: <code>... WHERE id = 7 AND version = 3</code> → 1 row, version becomes 4. B saves with version 3 → ${H.c('r', '0 rows')}: conflict, B must reload and decide.</p>`,
  brute: { why: `<p>Plain <code>UPDATE products SET price = ? WHERE id = ?</code> from a stale form: last writer wins and the earlier change disappears with no error. A pessimistic <code>SELECT ... FOR UPDATE</code> held while the human thinks would block everyone and pile up connections.</p>`, code: `import java.math.BigDecimal;
import java.sql.*;

class LastWriterWins {
    static void setPrice(Connection c, long id, BigDecimal price) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("UPDATE products SET price = ? WHERE id = ?")) {
            ps.setBigDecimal(1, price);
            ps.setLong(2, id);
            ps.executeUpdate();        // silently overwrites whatever someone else saved meanwhile
        }
    }
}` },
  mcq: { q: 'What signals an optimistic-lock conflict in the UPDATE ... WHERE id = ? AND version = ? approach?', options: ['An SQLException about deadlock', 'The update count is 0', 'The version column becomes NULL', 'The connection closes'], answer: 1, explain: 'If someone else already bumped the version, no row matches the WHERE clause, so zero rows are updated. That is your conflict signal.' },
  hints: [`<p>Hint 1: store a version number that increases on every successful update.</p>`, `<p>Hint 2: the UPDATE says "change the row only if it still has the version I read" and bumps it in the same statement.</p>`, `<p>Hint 3: count 0 → throw a domain exception (HTTP 409). For an automatic change, re-read and retry a few times; for human edits, show the new data and let them merge.</p>`],
  solution: {
    approach: `<p>Read the row with its version (no lock). When saving, run <code>UPDATE ... SET price = ?, version = version + 1 WHERE id = ? AND version = ?</code>. The database evaluates the condition atomically, so exactly one of two concurrent writers matches; the other gets 0 rows and a conflict exception, which the web layer maps to HTTP 409 with the current data (ETag/If-Match is the HTTP equivalent). Automated jobs wrap read-modify-write in a loop of at most three attempts with a small randomized backoff. No lock is held while a human thinks, so throughput stays high; the trade-off is occasional retries under heavy contention (use pessimistic locking only for very hot rows). JPA offers the same with a <code>@Version</code> field.</p>`,
    code: `import java.math.BigDecimal;
import java.sql.*;
import java.util.function.UnaryOperator;

class OptimisticPrice {
    static class ConflictException extends RuntimeException {
        ConflictException(String m) { super(m); }
    }

    /** Human flow: caller passes the version it loaded earlier. */
    static void setPrice(Connection c, long id, BigDecimal price, int expectedVersion) throws SQLException {
        String sql = "UPDATE products SET price = ?, version = version + 1 WHERE id = ? AND version = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setBigDecimal(1, price);
            ps.setLong(2, id);
            ps.setInt(3, expectedVersion);
            if (ps.executeUpdate() != 1) throw new ConflictException("product " + id + " was changed by someone else");
        }
    }

    /** Automated flow: read, compute, write, retry on conflict (bounded). */
    static void adjustPrice(Connection c, long id, UnaryOperator<BigDecimal> change) throws SQLException {
        for (int attempt = 1; ; attempt++) {
            BigDecimal price; int version;
            try (PreparedStatement ps = c.prepareStatement("SELECT price, version FROM products WHERE id = ?")) {
                ps.setLong(1, id);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) throw new SQLException("no product " + id);
                    price = rs.getBigDecimal("price");
                    version = rs.getInt("version");
                }
            }
            try {
                setPrice(c, id, change.apply(price), version);
                return;
            } catch (ConflictException e) {
                if (attempt >= 3) throw e;       // give up after 3 tries
            }
        }
    }
}`,
    complexity: `<p>O(1) statements per attempt; no locks held between read and write. Expected attempts stay near 1 unless contention is high.</p>`,
    followUps: ['When would you choose SELECT ... FOR UPDATE instead?', 'How do ETag and If-Match map to the version column in a REST API?']
  }
});

practice.push({
  title: 'Idempotent Payment Writes', level: 'Hard', tags: ['idempotency', 'transactions', 'design'], companies: ['Stripe', 'Razorpay', 'Paytm'],
  statement: `<p>A mobile app calls <code>POST /payments</code> and the network drops after the server committed but before the response arrived. The app retries. Design the backend so the customer is <b>charged exactly once</b> no matter how many times the request is retried or sent concurrently. Describe the table, the transaction flow, the response on retry, and failure cases.</p>`,
  constraints: `PostgreSQL, multiple app instances, external payment gateway that also supports idempotency keys. Retries may arrive concurrently.`,
  example: `<p>Client sends header ${H.c('b', 'Idempotency-Key: 7c1e...')} twice. First request creates the payment; second returns the ${H.c('g', 'same stored result')} (HTTP 200/201 with the same payment id) and does not charge again.</p>`,
  brute: { why: `<p>"Check if a similar payment exists, if not insert" has a race: two concurrent retries both see nothing and both insert. Deduplicating by amount and time window wrongly blocks two genuine identical purchases.</p>` },
  mcq: { q: 'What makes the idempotency check race-free across app instances?', options: ['A synchronized Java method', 'A UNIQUE constraint / primary key on the idempotency key enforced by the database', 'An in-memory HashSet', 'Checking the clock'], answer: 1, explain: 'Only the database can arbitrate between servers. A unique key makes exactly one concurrent INSERT win; the others see a conflict.' },
  hints: [`<p>Hint 1: the client generates a unique key per user intent and sends it on every retry of that intent.</p>`, `<p>Hint 2: store the key with a UNIQUE constraint, together with a status and the stored response; insert it first inside the transaction.</p>`, `<p>Hint 3: insert conflict → read the existing row: COMPLETED → return stored result; IN_PROGRESS → return 409 or wait; also pass the same key to the gateway and verify the request body hash matches.</p>`],
  solution: {
    approach: `<p><b>Table:</b> <code>payments(idempotency_key PRIMARY KEY, request_hash, status, gateway_ref, response_json, created_at)</code>. <b>Flow:</b> (1) Insert the key with status IN_PROGRESS using <code>INSERT ... ON CONFLICT DO NOTHING</code> and check the row count. (2) If 1 row inserted, this request owns the key: call the gateway passing the same key, then update the row to COMPLETED with the gateway reference and response in one short transaction. (3) If 0 rows inserted, a previous attempt exists: load it; if COMPLETED return the stored response unchanged; if IN_PROGRESS return 409 "processing" (client retries later) or poll briefly; if the stored <code>request_hash</code> differs, reject with 422 because the key was reused for a different request. (4) Crash safety: a recovery job re-queries the gateway for IN_PROGRESS rows older than a threshold (using the key) and finalises them. Never hold the DB transaction open during the gateway call. Keys expire after e.g. 24 hours. This gives at-least-once delivery from the client plus exactly-once effect.</p>`,
    code: { lang: 'sql', title: 'The core trick, runnable (SQLite spelling of INSERT ... ON CONFLICT DO NOTHING)', code: `CREATE TABLE payments(
  idempotency_key TEXT PRIMARY KEY,
  amount          INTEGER NOT NULL,
  status          TEXT NOT NULL
);
-- First attempt: inserted (1 row).
INSERT INTO payments(idempotency_key, amount, status) VALUES ('k-123', 500, 'IN_PROGRESS')
ON CONFLICT(idempotency_key) DO NOTHING;
-- Retry with the same key: conflict, 0 rows inserted, so the code must NOT charge again.
INSERT INTO payments(idempotency_key, amount, status) VALUES ('k-123', 500, 'IN_PROGRESS')
ON CONFLICT(idempotency_key) DO NOTHING;
UPDATE payments SET status = 'COMPLETED' WHERE idempotency_key = 'k-123';
SELECT idempotency_key, amount, status, (SELECT COUNT(*) FROM payments) AS total_rows FROM payments;` },
    complexity: `<p>One indexed insert per request; retries cost one primary-key lookup. Storage grows with keys, so expire old ones.</p>`,
    followUps: ['What if the gateway call succeeds but your UPDATE to COMPLETED fails?', 'How do idempotent consumers in Kafka relate to this design?']
  }
});

practice.push({
  title: 'Find String-Built SQL with a Scanner', level: 'Hard', tags: ['sql-injection', 'static-analysis', 'python'], companies: ['Snyk', 'GitHub'], lang: 'python',
  statement: `<p>Your company has 2,000 Java files and an audit finding "SQL built by concatenation". Write a small Python scanner that flags lines where a SQL keyword inside a string literal is joined with <code>+</code> to a variable or built with <code>String.format</code>, and ignores lines that use <code>?</code> placeholders correctly. Run it on a sample and explain its limits and the migration plan.</p>`,
  constraints: `Plain Python, regex-based, must run. Report line number and snippet. Explain false positives and negatives.`,
  example: `<p>${H.c('r', 'ps = c.prepareStatement("SELECT * FROM users WHERE name = \'" + name + "\'");')} is flagged; ${H.c('g', 'ps = c.prepareStatement("SELECT * FROM users WHERE name = ?");')} is not.</p>`,
  brute: { why: `<p>Manual code review of 2,000 files: slow, inconsistent, and new vulnerable lines keep arriving. A scanner in CI stops regressions; humans handle the judgement calls.</p>` },
  mcq: { q: 'Which is a known weakness of a regex scanner for SQL injection?', options: ['It is too fast', 'It misses SQL built across several statements or helper methods, and flags harmless constant concatenation', 'It needs a database', 'It cannot read text files'], answer: 1, explain: 'Regexes see text, not data flow. Real tools (CodeQL, Semgrep, SpotBugs) trace values, but even a simple scanner in CI catches the common cases.' },
  hints: [`<p>Hint 1: define "SQL string" as a string literal containing SELECT, INSERT, UPDATE, DELETE and a keyword like FROM, SET, INTO or WHERE.</p>`, `<p>Hint 2: flag if that literal is adjacent to <code>+</code> and a non-literal, or the line uses <code>String.format</code> / <code>.formatted(</code> with the SQL.</p>`, `<p>Hint 3: exclude lines with only constant concatenation (two literals joined) and note the output as "suspects to review", not verdicts.</p>`],
  solution: {
    approach: `<p>The scanner looks for a quoted string containing a SQL verb and a clause keyword, then checks whether the same line concatenates it with something that is not another string literal, or formats it. Hits are printed as suspects. Limits: false negatives when the string is built in a variable on earlier lines or in a helper; false positives for log messages containing the word select. Migration plan: run the scanner in CI to freeze the problem (fail on new hits), fix the worst endpoints first (public input), convert to placeholders with a shared helper, allowlist identifiers, run tests, then replace the regex by Semgrep or CodeQL rules for data-flow accuracy, and finally restrict the DB user so a missed spot cannot drop tables.</p>`,
    code: { lang: 'python', run: true, code: `import re

SAMPLE = """\\
ps = c.prepareStatement("SELECT * FROM users WHERE name = ?");
st.executeQuery("SELECT * FROM users WHERE id = " + userId);
ps = c.prepareStatement("DELETE FROM carts WHERE owner = '" + owner + "'");
String q = String.format("UPDATE items SET qty = %d WHERE sku = '%s'", qty, sku);
log.info("select started for " + user);
String ok = "SELECT id " + "FROM users WHERE active = 1";
"""

SQL_LITERAL = re.compile(r'"[^"]*\\b(SELECT|INSERT|UPDATE|DELETE)\\b[^"]*\\b(FROM|INTO|SET|WHERE)\\b[^"]*"', re.I)
CONCAT_VAR = re.compile(r'"\\s*\\+\\s*[A-Za-z_]|[A-Za-z_\\)]\\s*\\+\\s*"')
FORMATTED = re.compile(r'String\\.format\\(|\\.formatted\\(')

def scan(text):
    hits = []
    for n, line in enumerate(text.splitlines(), 1):
        if not SQL_LITERAL.search(line):
            continue                                  # no SQL-looking literal on this line
        if FORMATTED.search(line) or CONCAT_VAR.search(line):
            hits.append((n, line.strip()))
    return hits

for n, line in scan(SAMPLE):
    print("line", n, "SUSPECT:", line)
print("done:", len(scan(SAMPLE)), "suspects (expected 3)")` },
    complexity: `<p>O(total characters). CI-friendly: scans thousands of files in seconds.</p>`,
    followUps: ['Write a Semgrep rule that follows data flow from request parameters to execute calls.', 'How do you handle generated code or test fixtures?']
  }
});

/* =========================================================
   QUIZ
   ========================================================= */
quiz.push({ q: 'In JDBC, what does a ResultSet cursor point at right after executeQuery() returns?', options: ['The first row', 'Before the first row - you must call next()', 'The last row', 'Nothing; the data is in an array'], answer: 1, explain: 'The cursor starts before the first row. rs.next() moves to the first row and returns false when there are no more rows.' });
quiz.push({ q: 'Which element of the connection URL jdbc:postgresql://db.internal:5432/shop?sslmode=require is the port?', options: ['db.internal', '5432', 'shop', 'sslmode=require'], answer: 1, explain: 'host:port comes right after //. 5432 is the PostgreSQL default port; shop is the database name.' });
quiz.push({ q: 'A user types x\' OR \'1\'=\'1 as a name. With string concatenation the WHERE clause becomes name = \'x\' OR \'1\'=\'1\'. Why does this return every row?', options: ['The database ignores quotes', '\'1\'=\'1\' is always true, and OR makes the whole condition true', 'The OR keyword deletes the filter', 'The driver adds a wildcard'], answer: 1, explain: 'The attacker closed the string early and added a condition that is always true. OR then lets every row pass.' });
quiz.push({ q: 'Which technique is the primary defence against SQL injection?', options: ['Replacing single quotes with spaces', 'Parameterized queries / prepared statements', 'Hiding the database port', 'Using uppercase SQL'], answer: 1, explain: 'Parameters travel separately from the SQL text and are never parsed as SQL, so data cannot change the query structure.' });
quiz.push({ q: 'You need ORDER BY to depend on a column chosen by the user. What is the safe approach?', options: ['ORDER BY ? with setString', 'Concatenate the column name after escaping quotes', 'Map the user\'s choice through a fixed allowlist of column names in code', 'Use SELECT *'], answer: 2, explain: 'Placeholders bind values, not identifiers. An allowlist guarantees only known column names are ever inserted into the SQL.' });
quiz.push({ q: 'What is the relationship between JPA and Hibernate?', options: ['They are competing databases', 'JPA is a specification (annotations and API); Hibernate is an implementation of it', 'Hibernate is the specification; JPA is the driver', 'They are the same thing with two names'], answer: 1, explain: 'JPA (Jakarta Persistence) defines @Entity, EntityManager and so on. Hibernate is the most widely used implementation. Spring Data JPA sits on top.' });
quiz.push({ q: 'In the Order / OrderItem mapping, which table holds the foreign key column order_id?', options: ['orders', 'order_items', 'Both', 'A separate join table'], answer: 1, explain: 'The foreign key always lives on the "many" side: many items each point to one order. In JPA the @ManyToOne side in OrderItem owns it.' });
quiz.push({ q: 'Why is @Enumerated(EnumType.STRING) usually preferred to ORDINAL?', options: ['Strings are faster', 'ORDINAL stores 0,1,2... so reordering or inserting enum constants silently corrupts existing data', 'ORDINAL is not supported', 'STRING uses less space'], answer: 1, explain: 'Ordinal values depend on the declaration order. Storing the name makes stored data stable and readable.' });
quiz.push({ q: 'What does Spring Data do with the method name findByStatusAndTotalGreaterThan(status, min)?', options: ['Nothing; you must also write @Query', 'Derives the query WHERE status = ? AND total > ? from the name', 'Runs findAll() and filters in memory', 'Throws an error at runtime on first call only'], answer: 1, explain: 'Spring parses the name into a query at startup. A typo in a property name fails at startup, not at the first call.' });
quiz.push({ q: 'A JDBC connection is in autocommit mode (the default). You run two UPDATE statements and the second throws. What state is the data in?', options: ['Both rolled back', 'The first UPDATE is already committed', 'Both committed', 'Undefined; the database locks'], answer: 1, explain: 'In autocommit every statement commits immediately. To group statements into one transaction you must call setAutoCommit(false) and commit() yourself.' });
quiz.push({ q: 'Which debit statement is safe against two concurrent withdrawals?', options: ['SELECT balance, then if enough, UPDATE balance = newValue', 'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ? and check 1 row changed', 'Use a static synchronized method', 'Read the balance twice'], answer: 1, explain: 'Check and change in one SQL statement is atomic in the database and works across many app instances.' });
quiz.push({ q: 'Two transfers (A to B and B to A) run at the same time and both freeze. Most likely cause and fix?', options: ['A deadlock; always lock/update rows in a consistent order, such as lowest id first', 'The CPU is overloaded; add more RAM', 'A syntax error; restart', 'The pool is too large; shrink it to 1'], answer: 0, explain: 'Each transaction holds one row lock and waits for the other. A global lock order removes the cycle.' });
quiz.push({ q: 'What is the main benefit of using a repository interface in the service layer?', options: ['It makes SQL run faster', 'The service does not depend on how data is stored, so it is easy to test with a fake and to change the storage', 'It removes the need for a database', 'It encrypts passwords'], answer: 1, explain: 'The service talks to a collection-like abstraction. Tests can pass an in-memory implementation; production uses JPA or JDBC.' });

/* =========================================================
   INTERVIEW
   ========================================================= */
interview.push({ level: 'B', q: 'What is JDBC and what are the main steps to run a query?', a: `<p><b>JDBC</b> (Java Database Connectivity) is the standard Java API in <code>java.sql</code> for talking to relational databases. Your code uses interfaces (<code>Connection</code>, <code>PreparedStatement</code>, <code>ResultSet</code>) and a vendor <b>driver</b> jar supplies the implementation, so the same code runs on PostgreSQL, MySQL or others.</p>
  <p>Steps: (1) obtain a <code>Connection</code> (from a <code>DataSource</code>/pool in real apps; URL and credentials from the environment); (2) create a <code>PreparedStatement</code> with <code>?</code> placeholders; (3) bind values with <code>setXxx(index, value)</code> (1-based); (4) run <code>executeQuery()</code> for SELECT or <code>executeUpdate()</code> for INSERT/UPDATE/DELETE; (5) loop <code>while (rs.next())</code> and read columns by name; (6) close everything with try-with-resources so the connection returns to the pool.</p>`, followUps: ['What does executeUpdate return?', 'Why use try-with-resources here?'] });
interview.push({ level: 'B', q: 'What is SQL injection and how do you prevent it?', a: `<p>SQL injection happens when untrusted input becomes part of the SQL <i>text</i>, so the attacker can change the meaning of the query. Example: <code>"... WHERE name = '" + name + "'"</code> with input <code>x' OR '1'='1</code> returns every row; <code>admin'--</code> comments out a password check; <code>'; DROP TABLE users;--</code> can run extra statements.</p>
  <p><b>Prevention:</b> (1) parameterized queries / prepared statements so values are sent separately and never parsed as SQL; (2) allowlists for things that cannot be parameters (table/column names, ASC/DESC); (3) least-privilege database accounts; (4) validate types early (a numeric id must parse to a number); (5) do not show raw SQL errors to users; (6) code review and static analysis rules for string-built SQL. Escaping by hand is not a reliable defence.</p>`, followUps: ['Does using an ORM make you immune?', 'What is second-order injection?'] });
interview.push({ level: 'B', q: 'Statement vs PreparedStatement - what is the difference and why prefer the latter?', a: `<p>A <code>Statement</code> executes a complete SQL string that you built yourself; a <code>PreparedStatement</code> takes SQL with <code>?</code> placeholders and binds values separately. Advantages of PreparedStatement: (1) <b>security</b> - bound values cannot alter the query structure; (2) <b>correctness</b> - the driver handles quoting, dates, nulls and special characters (a name like O'Brien just works); (3) <b>performance</b> - the database can parse/plan once and reuse the plan, and batches are easy (<code>addBatch</code>); (4) readability - SQL text is constant and easy to review.</p>
  <p>Use plain <code>Statement</code> only for fixed SQL with no input, such as DDL in a migration or <code>SELECT 1</code>.</p>`, followUps: ['Can you bind a table name with ?', 'What is a server-side prepared statement?'] });
interview.push({ level: 'B', q: 'Why should database credentials never be in source code, and where should they live?', a: `<p>Source code is copied everywhere: git history, CI logs, developer laptops, container images, code review tools. A password committed once must be considered leaked forever and rotated. Credentials also differ per environment (dev, staging, prod), so they are <i>configuration</i>, not code.</p>
  <p>Put them in environment variables (<code>System.getenv("DB_PASSWORD")</code>, <code>process.env.DB_PASSWORD</code>) injected at deploy time, ideally from a secrets manager (Kubernetes Secrets, AWS Secrets Manager, HashiCorp Vault). Config files in git should contain only placeholders like <code>&#36;{DB_PASSWORD}</code>. Even better: short-lived credentials (cloud IAM database authentication), a dedicated least-privilege user per service, and secret scanning in CI to catch accidents.</p>`, followUps: ['How do you rotate a password without downtime?', 'What would you do if a password was committed by mistake?'] });
interview.push({ level: 'I', q: 'What is an ORM, and what are the trade-offs versus raw JDBC/SQL?', a: `<p>An ORM maps objects to tables so you save and load objects instead of writing SQL for each operation: entities, relationships, change tracking, generated queries, caching. <b>Benefits:</b> far less boilerplate, type safety, easy CRUD, relationship navigation, database portability, integrated transactions and migrations (in some tools).</p>
  <p><b>Costs:</b> hidden SQL (N+1 queries, over-fetching), a learning curve (persistence context, lazy loading, flush order), awkward fit for complex reporting, bulk operations and database-specific features, and performance surprises if you never look at the generated SQL. Mature teams use the ORM for everyday CRUD and drop to SQL (<code>@Query</code> native, jOOQ, <code>$queryRaw</code>) for reports, bulk updates and hot paths, always with SQL logging on in development.</p>`, followUps: ['What is the object-relational impedance mismatch?', 'Give an example where raw SQL beats the ORM.'] });
interview.push({ level: 'I', q: 'Explain JPA vs Hibernate vs Spring Data JPA.', a: `<p><b>JPA</b> (Jakarta Persistence API) is a <i>specification</i>: annotations such as <code>@Entity</code>, <code>@Id</code>, <code>@OneToMany</code>, the <code>EntityManager</code> API and JPQL. <b>Hibernate</b> is the most popular <i>implementation</i> of that specification (EclipseLink is another); it also has extras beyond JPA. <b>Spring Data JPA</b> is a layer on top: you declare a repository interface and it generates the implementation using JPA (and so Hibernate) underneath, including derived queries from method names, pagination and sorting.</p>
  <p>So a call like <code>orderRepository.findByStatus(NEW)</code> goes: Spring Data (derives the query) → JPA/EntityManager API → Hibernate (generates SQL, tracks entities) → JDBC driver → database.</p>`, followUps: ['What is the EntityManager?', 'Can you use JPA without Spring?'] });
interview.push({ level: 'I', q: 'How do you map a one-to-many relationship such as Order and OrderItem in JPA? Who owns the foreign key?', a: `<p>The foreign key lives in <code>order_items</code> (the "many" side). In <code>OrderItem</code> write <code>@ManyToOne(fetch = LAZY, optional = false) @JoinColumn(name = "order_id")</code> - this is the <b>owning side</b>. In <code>Order</code> write <code>@OneToMany(mappedBy = "order", cascade = ALL, orphanRemoval = true) List&lt;OrderItem&gt; items</code> - the inverse side that mirrors it; <code>mappedBy</code> prevents Hibernate from creating an extra join table.</p>
  <p>Add helper methods (<code>addItem</code>/<code>removeItem</code>) that update both sides so <code>order_id</code> is never null; keep collections initialised; use <code>@Enumerated(STRING)</code> and <code>BigDecimal</code>; index the foreign key; avoid EAGER fetching and Lombok <code>@Data</code> on entities. Return DTOs from controllers.</p>`, followUps: ['What does orphanRemoval do?', 'What goes wrong if you only add to the list and not set item.order?'] });
interview.push({ level: 'I', q: 'How does Spring Data JPA turn findByStatusAndTotalGreaterThan into a query? When would you use @Query instead?', a: `<p>At startup Spring Data inspects each repository method. If there is no <code>@Query</code> or named query, it parses the method name with a <code>PartTree</code>: subject (<code>find</code>, <code>count</code>, <code>exists</code>, <code>delete</code>, optional <code>Top3</code>/<code>Distinct</code>), <code>By</code>, then predicates separated by <code>And</code>/<code>Or</code>, each a property plus an operator keyword (<code>GreaterThan</code>, <code>Between</code>, <code>Containing</code>, <code>IgnoreCase</code>, <code>In</code>, <code>IsNull</code>), then <code>OrderBy...</code>. It builds a JPA criteria query with bound parameters; unknown property names fail at startup.</p>
  <p>Use <code>@Query</code> when the name becomes long or unreadable (more than ~3 conditions), when you need joins with <code>join fetch</code>, aggregates, projections, native SQL features, or bulk updates (<code>@Modifying</code>). Remember that neither style creates indexes.</p>`, followUps: ['Why is deleteByStatus slow?', 'What is a projection?'] });
interview.push({ level: 'I', q: 'Walk me through making a money transfer safe in JDBC.', a: `<p>Four concerns: <b>atomicity</b>, <b>no overdraft under concurrency</b>, <b>no deadlock</b>, <b>no duplicate on retry</b>. (1) Use one connection with <code>setAutoCommit(false)</code>; debit and credit in the same transaction; <code>commit()</code> at the end, <code>rollback()</code> in catch, restore autocommit in finally. (2) Debit with one conditional statement <code>UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance &gt;= ?</code> and verify exactly one row changed; keep a <code>CHECK (balance &gt;= 0)</code> constraint as a safety net. (3) Update rows in a fixed order (lower id first) to avoid deadlocks; retry on deadlock/serialization errors (SQLState 40P01/40001). (4) Add an idempotency key with a UNIQUE constraint inserted in the same transaction. (5) Use <code>BigDecimal</code>/integer minor units, keep the transaction short, and publish notifications after commit.</p>`, followUps: ['What isolation level do you need for this?', 'How would you audit every movement?'] });
interview.push({ level: 'I', q: 'What is the difference between autocommit and an explicit transaction? What can go wrong with autocommit?', a: `<p>With <b>autocommit</b> on (the JDBC default) every statement is its own transaction and commits as soon as it finishes. With <b>explicit transactions</b> you turn autocommit off, run several statements, then <code>commit()</code> or <code>rollback()</code>, so they succeed or fail together.</p>
  <p>Autocommit is fine for a single statement, but dangerous for multi-step business operations: if step 2 fails, step 1 is already permanent (money debited but never credited, order saved without items). It is also slower for bulk loads (one log flush per statement). Remember a transaction is tied to <b>one connection</b>: using two different pooled connections for the two steps silently creates two transactions.</p>`, followUps: ['What happens to an uncommitted transaction when the connection dies?', 'What is a savepoint?'] });
interview.push({ level: 'A', q: 'Explain the persistence context in Hibernate: first-level cache, dirty checking and flush. What is LazyInitializationException?', a: `<p>The <b>persistence context</b> (the session/EntityManager scope, usually one transaction) is an identity map of managed entities: loading the same id twice returns the same Java object without a second query (first-level cache). Hibernate keeps a snapshot of each loaded entity; at <b>flush</b> time (before commit, before a query that needs consistency, or on <code>flush()</code>) it compares snapshots to current state (<b>dirty checking</b>) and issues INSERT/UPDATE/DELETE only for changes, ordered to respect constraints. That is why modifying a managed entity inside <code>@Transactional</code> needs no <code>save()</code>.</p>
  <p><b>LazyInitializationException</b> occurs when you access a lazy association (a proxy or uninitialised collection) after the session closed, e.g. in the controller after the service returned. Fixes: fetch what you need inside the transaction (<code>join fetch</code>, <code>@EntityGraph</code>), map to DTOs in the service, or use projections. Open-in-view hides the problem but keeps connections busy and encourages N+1 - disable it in serious services.</p>`, followUps: ['What is the N+1 problem and how do you detect it?', 'What are the four entity states?'] });
interview.push({ level: 'A', q: 'Optimistic vs pessimistic locking: when do you use each, and how are they implemented with JPA/JDBC?', a: `<p><b>Optimistic locking</b> assumes conflicts are rare. Add a <code>version</code> column (JPA <code>@Version</code>). The UPDATE is <code>... SET ..., version = version + 1 WHERE id = ? AND version = ?</code>; zero rows updated means someone else changed the row, and you raise a conflict (HTTP 409) or retry. No locks are held while users think; ideal for web forms and mostly-read data.</p>
  <p><b>Pessimistic locking</b> locks the row up front (<code>SELECT ... FOR UPDATE</code>, JPA <code>LockModeType.PESSIMISTIC_WRITE</code>) so others wait. Use it for high-contention rows where retries would be wasteful (inventory counters, ticket seats) and keep the transaction very short to avoid blocking and deadlocks (lock in a consistent order, set lock timeouts). Often the best option is a single atomic conditional UPDATE (<code>qty = qty - 1 WHERE qty &gt;= 1</code>), which needs neither.</p>`, followUps: ['How does HTTP ETag/If-Match relate?', 'What is a lost update?'] });
interview.push({ level: 'A', q: 'Prisma vs Sequelize vs TypeORM vs raw SQL in Node: how would you choose?', a: `<p><b>Prisma:</b> schema-first, generated and fully typed client, good migrations and developer experience; its query engine hides some SQL control and complex SQL needs <code>$queryRaw</code>. <b>Sequelize:</b> mature, flexible, model/hook based with a large community; TypeScript typing is weaker and the API has legacy quirks. <b>TypeORM:</b> decorator style similar to JPA, supports Active Record and Data Mapper; known rough edges in migrations and maintenance. <b>Query builders / raw SQL</b> (Knex, Kysely, Drizzle, pg): full control and best for complex or performance-critical queries, but more manual mapping.</p>
  <p>Choose by team skills, type-safety needs, query complexity and operational concerns (migrations, connection pooling in serverless, observability). Whatever the choice: bind parameters (never concatenate into raw queries), log SQL in development, keep migrations in version control, and be ready to drop to SQL for hot paths.</p>`, followUps: ['How does serverless affect connection management?', 'How do you run migrations safely in CI/CD?'] });
interview.push({ level: 'E', q: 'Design the data-access approach for a service that must never double-charge or lose a payment, covering ORM usage, transactions, retries and failure modes.', a: `<p><b>Model:</b> an append-only ledger (double-entry rows) plus a payments table keyed by an <b>idempotency key</b> (UNIQUE). Money as integer minor units or DECIMAL. <b>Writes:</b> a short transaction that inserts the key (conflict means a retry: return the stored result), writes ledger entries and updates balances with conditional statements (<code>balance &gt;= ?</code>), ordered consistently to avoid deadlocks, with optimistic <code>version</code> checks where users edit. Never call the external gateway inside the DB transaction: record IN_PROGRESS, call the gateway with the same idempotency key, then finalise in a second short transaction; a reconciliation job resolves stuck IN_PROGRESS rows by querying the gateway.</p>
  <p><b>Reliability:</b> outbox table written in the same transaction and published after commit, so events are not lost; retries with exponential backoff on 40001/40P01 and network errors; timeouts everywhere; a pool sized for the database limit; read replicas only for lagging-tolerant reads. <b>ORM use:</b> entities for simple aggregates, explicit SQL for ledger and bulk operations, DTOs at the edge, SQL logging and slow-query alerts, migrations in CI. <b>Verification:</b> concurrency tests (parallel transfers keep total constant), crash tests (kill between steps), and invariant checks (sum of ledger = sum of balances) running continuously.</p>`, followUps: ['How would you reconcile with the payment provider daily?', 'What happens if the database fails over mid-transaction?'] });
interview.push({ level: 'E', q: 'How would you stop an LLM-powered feature that writes SQL for users from becoming an injection or data-leak vector?', a: `<p>Treat model-generated SQL as <b>untrusted input</b> (prompt injection can steer it, and users can ask for anything). Layers: (1) a dedicated <b>read-only database role</b> with access limited to specific views or a replica, no access to credentials or PII tables; row-level security per tenant; (2) <b>statement timeout</b>, row limit, and cost limits; (3) parse the SQL and allow only a single <code>SELECT</code> against an allowlist of tables/columns (reject multiple statements, DDL, functions like <code>pg_read_file</code>); (4) prefer a constrained interface - the model fills a typed query spec (filters, group by) that <i>your</i> code turns into parameterized SQL, rather than free-form SQL; (5) log every generated query with the user and prompt for audit; (6) human confirmation for any write; (7) never place secrets in the prompt context.</p>
  <p>This is the same principle as classic injection: data and instructions must be separated, and the account that executes the statement should be able to do very little.</p>`, followUps: ['What is the difference between this and classic SQL injection?', 'How would you test the guardrails?'] });

/* =========================================================
   MODULE REGISTRATION
   ========================================================= */
registerModule({
  id: 'be03',
  title: 'Databases from Code: CRUD & ORM Basics',
  intro: `<p>Your REST API is only useful if it can remember things. This module shows how a backend actually <b>talks to a database</b>: opening a connection safely, sending SQL from code, reading rows back, and then letting an <b>ORM</b> (JPA/Hibernate in Java, Prisma and Sequelize in Node) do the repetitive work through <b>entities</b> and <b>repositories</b>.</p>
  <p>You will learn the single most important security habit in backend work - <b>prepared statements</b> versus <b>SQL injection</b> - by breaking a query on purpose and fixing it. You will map an <code>Order</code> with <code>OrderItem</code> rows, write repository methods by naming convention, and make a money transfer all-or-nothing with a <b>transaction</b>. Every idea has a visualizer, runnable Python/SQL, and Java you can compile.</p>`,
  goals: [
    'Explain the round trip <b>app → connection → driver → database</b> and configure it with credentials from the environment, never from source code',
    'Write a complete <b>JDBC DAO</b> (create, read, update, delete) with <code>PreparedStatement</code>, <code>ResultSet</code> mapping and correct resource closing',
    'Show a <b>SQL injection</b> payload, explain exactly why it works, and fix it with bound parameters and allowlists',
    'Map an <b>Order/OrderItem</b> one-to-many relationship as JPA entities and as Prisma/Sequelize models, and explain the ORM trade-offs',
    'Use <b>repositories</b>: Spring Data derived queries by method name, @Query, pagination, and Prisma/Sequelize equivalents',
    'Make multi-step changes <b>atomic</b> with transactions (commit/rollback), avoid lost updates and deadlocks in a money transfer'
  ],
  prereqs: `Module "How Backends Work &amp; HTTP Basics" and "Your First REST API" (controller-service-repository layering), plus basic SQL (SQL track: SELECT/INSERT/UPDATE/DELETE and joins) and Java or JavaScript fundamentals.`,
  hours: 10,
  databases: {
    shop: `CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT, role TEXT NOT NULL DEFAULT 'user', password_hash TEXT);
INSERT INTO users VALUES (1,'asha','asha@shop.test','admin','h1'),(2,'ben','ben@shop.test','user','h2'),(3,'chen','chen@shop.test','user','h3');
CREATE TABLE accounts(id INTEGER PRIMARY KEY, owner TEXT NOT NULL, balance INTEGER NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES (1,'asha',1000),(2,'ben',200);
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER, customer_name TEXT, status TEXT NOT NULL DEFAULT 'NEW', total INTEGER NOT NULL DEFAULT 0);
CREATE TABLE order_items(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), product TEXT NOT NULL, qty INTEGER NOT NULL, unit_price INTEGER NOT NULL);
INSERT INTO orders VALUES (1,1,'asha','NEW',3400),(2,2,'ben','PAID',400),(3,1,'asha','PAID',900);
INSERT INTO order_items VALUES (1,1,'Keyboard',2,1500),(2,1,'Mouse',1,400),(3,2,'Mouse',1,400),(4,3,'Cable',6,150);`
  },
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
