// Runs SQL test cases on the same sql.js (SQLite) build the site uses. Called by solution-check.js.
// stdin: JSON { schema, code, cases: [{ setup, after }] }  ->  stdout: JSON [{ sets: [{ cols, rows }, ...] } | { error }]
const fs = require('fs');
const path = require('path');
const vendor = path.join(__dirname, '..', 'vendor');
const initSqlJs = require(path.join(vendor, 'sql-wasm.js'));

const job = JSON.parse(fs.readFileSync(0, 'utf8'));
initSqlJs({ locateFile: (f) => path.join(vendor, f) }).then((SQL) => {
  const out = job.cases.map((c) => {
    const db = new SQL.Database();
    try {
      if (job.schema) db.exec(job.schema);
      if (c.setup) db.exec(c.setup);
      let res = db.exec(job.code);
      if (c.after) res = db.exec(c.after);
      return { sets: res.map((s) => ({ cols: s.columns, rows: s.values.map((r) => r.map((v) => (v instanceof Uint8Array ? Array.from(v) : v))) })) };
    } catch (e) {
      return { error: String(e.message || e) };
    } finally {
      db.close();
    }
  });
  process.stdout.write(JSON.stringify(out));
}, (e) => { process.stdout.write(JSON.stringify({ fatal: String(e.message || e) })); });
