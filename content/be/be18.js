(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function hesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  function pyc(label, code, hl) { return { type: 'code', label: label, lang: 'python', code: code, hl: hl || {} }; }
  function txt(label, html) { return { type: 'text', label: label, html: html }; }
  function tbl(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: cp(rows), hl: hl || {} }; }

  /* =====================================================================
     TOPIC 1 — Engine, sessions and the unit of work
     ===================================================================== */
  topics.push({
    title: 'Engine, Sessions and the Unit of Work',
    analogy: `<p>Think of a <b>restaurant</b>. The <b>engine</b> is the kitchen's phone line plus a rack of phones (the connection pool). There is one rack for the whole restaurant, set up once when it opens.</p>
      <p>A <b>session</b> is a waiter's <b>notepad</b> for one table. The waiter writes every order on the pad: "one soup, change the salad, cancel the drinks". Nothing reaches the kitchen while the waiter is still writing. When the table is done ordering, the waiter walks to the kitchen and hands over the whole page at once (<b>flush</b>), and the kitchen confirms it (<b>commit</b>). If the guests change their minds, the waiter tears the page out (<b>rollback</b>). That notepad idea, "collect changes, then send them together", is called the <b>unit of work</b>.</p>
      <p>The waiter also remembers faces. If table 4 asks for "the guest in the red coat" twice, the waiter points at the same person, not a copy. That memory is the <b>identity map</b>.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> SQLAlchemy is the standard Python toolkit for SQL databases. It has two layers. <b>Core</b> builds SQL statements from Python objects and runs them. The <b>ORM</b> (object-relational mapper) sits on top: you work with Python classes like <code>User</code>, and it turns your changes into <code>INSERT</code>, <code>UPDATE</code> and <code>DELETE</code> for you. This module uses <b>SQLAlchemy 2.0</b> style everywhere.</p>
      <p>You meet three objects first:</p>
      ${H.table(['Object', 'Plain English', 'How many', 'Lives for'], [
        ['<code>Engine</code>', 'Knows the database URL and owns the <b>connection pool</b>', 'One per database per process', 'The whole app lifetime'],
        ['<code>sessionmaker</code>', 'A factory that makes sessions with the same settings', 'One, next to the engine', 'The whole app lifetime'],
        ['<code>Session</code>', 'Your notepad: tracks objects you loaded or added, sends SQL on flush, owns one transaction at a time', 'One per request / job / unit of work', 'Short: one request']
      ])}
      <p><b>Where the URL comes from.</b> Never type a password into code. Read it from the environment: <code>os.environ["DATABASE_URL"]</code>, for example <code>postgresql+psycopg://app:&lt;password&gt;@db:5432/shop</code>. The part before <code>://</code> is <b>dialect+driver</b>: <code>postgresql+psycopg</code> (psycopg 3), <code>postgresql+asyncpg</code> (async), <code>sqlite:///./dev.db</code> (a local file).</p>
      <p><b>What a session does for you</b>, in order:</p>
      <ol>
        <li><code>session.add(obj)</code>: the object is now <b>pending</b>. No SQL yet.</li>
        <li><b>Flush</b>: SQLAlchemy works out the needed SQL and sends it inside the current transaction. It flushes automatically before a query (<b>autoflush</b>) and before commit. You can force it with <code>session.flush()</code>, for example to get a new primary key.</li>
        <li><code>session.commit()</code>: flush, then <code>COMMIT</code>. Other connections can now see the rows.</li>
        <li><code>session.rollback()</code>: throw away the transaction. Pending objects are dropped.</li>
        <li><code>session.close()</code>: give the connection back to the pool. The <code>with</code> block does this for you.</li>
      </ol>
      <p><b>Object states</b> (you will see these words in error messages):</p>
      ${H.table(['State', 'Meaning', 'How you get there'], [
        ['transient', 'A plain Python object, the session does not know it', '<code>User(name="Ann")</code>'],
        ['pending', 'Added, not yet sent to the database', '<code>session.add(u)</code>'],
        ['persistent', 'Has a row and an identity in this session', 'after flush, or loaded by a query'],
        ['deleted', 'Will be deleted on flush', '<code>session.delete(u)</code> then flush'],
        ['detached', 'Had a row, but its session is closed', 'after <code>session.close()</code>']
      ])}
      <p>🔵 <b>Identity map.</b> Inside one session, one database row is always one Python object. <code>session.get(User, 1) is session.get(User, 1)</code> is <code>True</code>, and the second call sends no SQL at all. This is why you must not share one session across requests: everyone would see everyone's half-finished edits.</p>
      <p><b>In FastAPI</b> (you built dependencies in Python Backend I), the session is a dependency that <code>yield</code>s. FastAPI opens it for the request, hands it to your endpoint, and runs the code after <code>yield</code> to close it, even if the endpoint raised.</p>`,
    clues: [
      '"What is the difference between flush and commit?" → flush sends SQL inside the transaction; commit makes it permanent and visible',
      '"Why do I get the same object back?" / "is vs ==" → the identity map: one row, one object per session',
      '"DetachedInstanceError" / "Instance is not bound to a Session" → you touched a lazy attribute after the session closed',
      '"Where should the session live in a web app?" → one session per request, created by a <code>yield</code> dependency, never a global',
      '"I need the new id before commit" → <code>session.flush()</code> then read <code>obj.id</code>',
      '"Attributes reload after commit" → <code>expire_on_commit=True</code> (the default) expires loaded state'
    ],
    code: [
      {
        lang: 'python', title: 'db.py — engine, session factory, base class',
        code: `# db.py — created once at import time and shared by the whole process.
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Read the URL from the environment. Example value (never commit real secrets):
#   postgresql+psycopg://app:<password>@localhost:5432/shop
DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(
    DATABASE_URL,
    echo=False,          # True prints every SQL statement (great while learning)
    pool_pre_ping=True,  # test a pooled connection before handing it out
)

# The factory. Every call SessionLocal() gives a new, independent session.
SessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False,  # keep loaded values readable after commit (common in APIs)
)


class Base(DeclarativeBase):
    """All ORM models inherit from this. Base.metadata knows every table."""`
      },
      {
        lang: 'python', title: 'The unit of work in action',
        code: `from sqlalchemy import select

from db import SessionLocal
from models import User  # a mapped class with id, email, name

# "with SessionLocal() as session" closes the session at the end.
# "session.begin()" opens a transaction that commits on success
# and rolls back if anything inside raises.
with SessionLocal() as session, session.begin():
    ann = User(email="ann@example.com", name="Ann")   # transient
    session.add(ann)                                  # pending, no SQL yet

    session.flush()                                   # INSERT sent now
    print("new id:", ann.id)                          # id is known after flush

    same = session.get(User, ann.id)                  # identity map hit: no SELECT
    assert same is ann

    ann.name = "Ann Lee"                              # marked dirty, no SQL yet
    bob = session.scalars(
        select(User).where(User.email == "bob@example.com")
    ).one_or_none()                                   # autoflush sends the UPDATE first
    if bob is not None:
        session.delete(bob)                           # DELETE on the next flush
# Leaving the block: flush remaining changes, COMMIT, then close the session.`
      },
      {
        lang: 'python', title: 'FastAPI: one session per request with a yield dependency',
        code: `# deps.py
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from db import SessionLocal


def get_db() -> Iterator[Session]:
    """Open a session for this request and always close it afterwards."""
    with SessionLocal() as session:
        yield session
        # code after yield runs when the request is finished,
        # and the with-block closes the session even if the endpoint raised


DbSession = Annotated[Session, Depends(get_db)]


# routers/users.py
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from models import User

router = APIRouter(prefix="/users", tags=["users"])


class UserIn(BaseModel):
    email: EmailStr
    name: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    model_config = {"from_attributes": True}  # read from ORM objects


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserIn, db: DbSession) -> User:
    user = User(email=body.email, name=body.name)
    db.add(user)
    db.commit()          # the endpoint decides when the unit of work is done
    db.refresh(user)     # reload server-generated columns (id, defaults)
    return user


@router.get("/{user_id}", response_model=UserOut)
def read_user(user_id: int, db: DbSession) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a tiny unit of work over sqlite3 (stdlib only)',
        code: `# A toy "session" that shows the unit-of-work idea with the stdlib sqlite3 module.
# Real SQLAlchemy does the same bookkeeping, plus much more.
import sqlite3


class TinySession:
    def __init__(self, con):
        self.con = con
        self.identity = {}     # id -> dict (one object per row)
        self.new = []          # pending objects
        self.dirty = set()     # ids changed since load

    def add(self, obj):
        self.new.append(obj)

    def get(self, uid):
        if uid in self.identity:              # identity map hit, no SQL
            return self.identity[uid]
        row = self.con.execute("SELECT id, name FROM users WHERE id = ?", (uid,)).fetchone()
        print("  SQL: SELECT ... WHERE id =", uid)
        if row is None:
            return None
        obj = {"id": row[0], "name": row[1]}
        self.identity[uid] = obj
        return obj

    def set_name(self, obj, name):
        obj["name"] = name
        self.dirty.add(obj["id"])

    def flush(self):
        for obj in self.new:
            cur = self.con.execute("INSERT INTO users (name) VALUES (?)", (obj["name"],))
            obj["id"] = cur.lastrowid
            self.identity[obj["id"]] = obj
            print("  SQL: INSERT", obj["name"], "-> id", obj["id"])
        self.new = []
        for uid in sorted(self.dirty):
            self.con.execute("UPDATE users SET name = ? WHERE id = ?", (self.identity[uid]["name"], uid))
            print("  SQL: UPDATE id", uid)
        self.dirty = set()

    def commit(self):
        self.flush()
        self.con.commit()
        print("  COMMIT")

    def rollback(self):
        self.new, self.dirty, self.identity = [], set(), {}
        self.con.rollback()
        print("  ROLLBACK")


con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")
con.commit()

s = TinySession(con)
print("add Ann, add Bob (nothing sent yet)")
s.add({"name": "Ann"})
s.add({"name": "Bob"})
print("commit:")
s.commit()

print("get(1) twice:")
a = s.get(1)
b = s.get(1)
print("  same object?", a is b)

print("rename Ann, then roll back:")
s.set_name(a, "Annie")
s.flush()
s.rollback()
print("name in the database:", con.execute("SELECT name FROM users WHERE id = 1").fetchone()[0])`
      }
    ],
    codeTitle: ['db.py — engine, session factory, base class', 'The unit of work in action', 'FastAPI get_db dependency', 'Runnable: tiny unit of work (sqlite3)'],
    viz: {
      title: 'Session notepad: pending changes, identity map and the SQL sent',
      input: 'add Ann; add Bob; flush; get 1; get 1; edit 1 Annie; commit; delete 2; rollback',
      inputLabel: 'Steps separated by ";" (add NAME, edit ID NAME, delete ID, get ID, flush, commit, rollback)',
      gen: function (input) {
        var steps = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 14);
        if (!steps.length) throw new Error('Type steps like: add Ann; flush; get 1; edit 1 Annie; commit');
        var committed = [], txRows = [], identity = {}, pending = [], dirty = {}, deleted = {}, log = [], inTx = false, nextId = 1, frames = [];
        function rowsOf(list) { return list.map(function (r) { return [r.id, r.name]; }); }
        function mapEntries() { return Object.keys(identity).map(function (k) { return ['id ' + k, identity[k].name + (identity[k].expired ? ' (expired)' : '') + (dirty[k] ? ' *dirty*' : '') + (deleted[k] ? ' *delete*' : '')]; }); }
        function snap(narr, cur) {
          frames.push({ narr: narr, parts: [
            { type: 'queue', label: 'Pending (added, not sent)', items: pending.slice(), frontLabel: 'first', backLabel: 'last' },
            { type: 'map', label: 'Identity map (one object per row)', entries: mapEntries(), hl: cur ? (function () { var h = {}; h['id ' + cur] = 'cur'; return h; })() : {} },
            tbl('Rows inside this transaction', ['id', 'name'], rowsOf(txRows)),
            tbl('Rows other connections see (committed)', ['id', 'name'], rowsOf(committed)),
            txt('SQL sent so far', log.length ? '<code>' + log.slice(-6).map(hesc).join('</code><br><code>') + '</code>' : '<i>nothing yet</i>')
          ] });
        }
        function begin() { if (!inTx) { inTx = true; log.push('BEGIN (implicit)'); } }
        function find(id) { for (var i = 0; i < txRows.length; i++) if (txRows[i].id === id) return i; return -1; }
        function flush() {
          var sent = 0;
          pending.forEach(function (name) { begin(); var id = nextId++; txRows.push({ id: id, name: name }); identity[id] = { name: name }; log.push('INSERT INTO users (name) VALUES (\'' + name + '\') -- id ' + id); sent++; });
          pending = [];
          Object.keys(dirty).forEach(function (k) { begin(); var i = find(+k); if (i >= 0) txRows[i].name = identity[k].name; log.push('UPDATE users SET name=\'' + identity[k].name + '\' WHERE id=' + k); sent++; });
          dirty = {};
          Object.keys(deleted).forEach(function (k) { begin(); var i = find(+k); if (i >= 0) txRows.splice(i, 1); delete identity[k]; log.push('DELETE FROM users WHERE id=' + k); sent++; });
          deleted = {};
          return sent;
        }
        function load(id) {
          var n = flush();
          begin();
          log.push('SELECT id, name FROM users WHERE id=' + id);
          var i = find(id);
          if (i < 0) return { obj: null, flushed: n };
          identity[id] = { name: txRows[i].name };
          return { obj: identity[id], flushed: n };
        }
        snap('A new session is an empty notepad. No connection is used yet: SQLAlchemy only borrows one from the pool when it first needs to send SQL.', null);
        steps.forEach(function (st) {
          var w = st.split(/\s+/), op = w[0].toLowerCase(), id = parseInt(w[1], 10);
          if (op === 'add' && w[1]) {
            var name = w.slice(1).join(' ').slice(0, 12);
            pending.push(name);
            snap('<code>session.add(User(name="' + hesc(name) + '"))</code>: the object is <b>pending</b>. It sits on the notepad. <b>No SQL is sent</b>, so it has no id yet.', null);
          } else if (op === 'flush') {
            var n = flush();
            snap('<code>session.flush()</code>: SQLAlchemy turns the notepad into SQL and sends ' + n + ' statement(s) <b>inside the open transaction</b>. New rows now have ids. Other connections still see nothing new, because nothing is committed.', null);
          } else if (op === 'get' && !isNaN(id)) {
            if (identity[id] && !identity[id].expired) {
              snap('<code>session.get(User, ' + id + ')</code>: found in the <b>identity map</b>. No SQL at all, and you get the <b>same Python object</b> as last time.', id);
            } else {
              var r = load(id);
              snap('<code>session.get(User, ' + id + ')</code>: not in the identity map (or expired), so ' + (r.flushed ? '<b>autoflush</b> first sends the ' + r.flushed + ' pending change(s), then ' : '') + 'it sends a SELECT. ' + (r.obj ? 'The row is now tracked.' : 'No such row: the result is <code>None</code>.'), r.obj ? id : null);
            }
          } else if (op === 'edit' && !isNaN(id) && w[2]) {
            var nm = w.slice(2).join(' ').slice(0, 12);
            if (!identity[id] || identity[id].expired) { var r2 = load(id); if (!r2.obj) { snap('Row ' + id + ' does not exist, so there is nothing to edit.', null); return; } }
            identity[id].name = nm; identity[id].expired = false; dirty[id] = true;
            snap('<code>user.name = "' + hesc(nm) + '"</code>: the object is marked <b>dirty</b>. Still no SQL. The UPDATE waits on the notepad until the next flush.', id);
          } else if (op === 'delete' && !isNaN(id)) {
            if (!identity[id] || identity[id].expired) { var r3 = load(id); if (!r3.obj) { snap('Row ' + id + ' does not exist, so there is nothing to delete.', null); return; } }
            deleted[id] = true;
            snap('<code>session.delete(user)</code>: marked for deletion. The DELETE is sent on the next flush.', id);
          } else if (op === 'commit') {
            var n2 = flush();
            if (inTx) log.push('COMMIT');
            inTx = false;
            committed = cp(txRows);
            Object.keys(identity).forEach(function (k) { identity[k].expired = true; });
            snap('<code>session.commit()</code>: flush (' + n2 + ' statement(s)), then <b>COMMIT</b>. Now other connections see the rows. With the default <code>expire_on_commit=True</code> every loaded object is <b>expired</b>: the next attribute read reloads it.', null);
          } else if (op === 'rollback') {
            var hadTx = inTx;
            if (inTx) log.push('ROLLBACK');
            inTx = false; pending = []; dirty = {}; deleted = {};
            txRows = cp(committed);
            Object.keys(identity).forEach(function (k) { if (find(+k) < 0) delete identity[k]; else { identity[k].expired = true; identity[k].name = txRows[find(+k)].name; } });
            snap('<code>session.rollback()</code>: ' + (hadTx ? 'ROLLBACK is sent. ' : 'no transaction was open. ') + 'The notepad is torn out: pending and dirty changes vanish, and the rows go back to the last committed state.', null);
          } else {
            snap('I did not understand <code>' + hesc(st) + '</code>. Use: add NAME, edit ID NAME, delete ID, get ID, flush, commit, rollback.', null);
          }
        });
        snap('End of the <code>with</code> block: <code>session.close()</code> returns the connection to the pool. Uncommitted work is rolled back. Objects become <b>detached</b>.', null);
        return frames;
      }
    },
    examples: [
      {
        title: 'Flush to get an id, then use it in the same transaction',
        html: `<p>You create an order and need its id to build a payment reference. You do not want to commit yet, because the payment step might fail. Call <code>session.flush()</code>: the INSERT runs, the database assigns the id, and it is all still one transaction. If the payment fails, rollback removes the order too.</p>
          ${H.table(['Line', 'SQL sent', 'Visible to others?'], [['<code>session.add(order)</code>', 'none', 'no'], ['<code>session.flush()</code>', '<code>INSERT INTO orders ...</code>', 'no'], ['<code>order.id</code>', 'none (already known)', 'no'], ['<code>session.commit()</code>', '<code>COMMIT</code>', H.c('g', 'yes')]])}`,
        code: { lang: 'python', code: `with SessionLocal() as session, session.begin():
    order = Order(customer_id=7, total_cents=4999)
    session.add(order)
    session.flush()                         # INSERT now, id assigned
    payment_ref = f"ORD-{order.id:08d}"     # safe: same transaction
    session.add(Payment(order_id=order.id, reference=payment_ref))
# commit happens here; any exception above rolls back both rows` }
      },
      {
        title: 'Why a global session breaks under load',
        html: `<p>A beginner writes <code>session = SessionLocal()</code> at module level and uses it in every endpoint. Two requests arrive together. Request A adds a user and has not committed. Request B calls <code>session.commit()</code> for its own change and <b>commits A's half-finished user too</b>. If A then fails, it rolls back B's work. A <code>Session</code> is also <b>not thread-safe</b>, so the two threads can corrupt its internal state. The fix is the one-session-per-request <code>get_db</code> dependency.</p>
          ${H.table(['', 'Global session', 'Session per request'], [['Isolation between requests', H.c('r', 'none'), H.c('g', 'full')], ['Thread-safe', H.c('r', 'no'), H.c('g', 'yes (not shared)')], ['Identity map grows forever', H.c('r', 'yes, memory leak'), H.c('g', 'no, thrown away')]])}`
      },
      {
        title: 'expire_on_commit and the "extra SELECT" surprise',
        html: `<p>With the default <code>expire_on_commit=True</code>, after <code>commit()</code> every loaded object is marked stale. Reading <code>user.name</code> afterwards sends a fresh SELECT. That is correct (another transaction may have changed the row), but it surprises people in APIs that commit and then return the object. If the session is already closed, the read fails with <code>DetachedInstanceError</code>. Two fixes: <code>db.refresh(user)</code> before returning, or create the factory with <code>expire_on_commit=False</code>, which most FastAPI apps and every async app do.</p>`,
        code: { lang: 'python', code: `from sqlalchemy.orm import sessionmaker

from db import engine

# Default: objects expire after commit, the next attribute access reloads them.
StrictSession = sessionmaker(bind=engine)

# API-friendly: values stay readable after commit (no surprise SELECTs).
ApiSession = sessionmaker(bind=engine, expire_on_commit=False)` }
      }
    ],
    deepDive: `<p>🟣 <b>How flush decides the order of SQL.</b> SQLAlchemy keeps three collections: <code>session.new</code>, <code>session.dirty</code> and <code>session.deleted</code>. On flush it builds a dependency graph between mappers from foreign keys (a <code>Book</code> needs its <code>Author</code> row first) and runs a <b>topological sort</b>: parents are inserted before children and children are deleted before parents. Inserts of many rows of one class are batched into one <code>executemany</code> call ("insertmanyvalues" in 2.0, which also returns the new primary keys on PostgreSQL with <code>RETURNING</code>).</p>
      <p><b>Dirty means "attribute history changed", not "you touched it".</b> Each mapped attribute keeps the original loaded value. If you set <code>user.name = user.name</code>, there is no net change and no UPDATE. Mutating a plain <code>dict</code> stored in a JSON column in place is <b>not</b> detected unless you use <code>MutableDict</code> or reassign the value.</p>
      <p><b>Autoflush</b> runs before any query the session executes, so a query sees your own pending changes. Turn it off temporarily with <code>with session.no_autoflush:</code> when you are half-way through building an object that would fail a NOT NULL constraint if flushed early.</p>
      <p><b>Engine vs Connection vs Session.</b> <code>engine.connect()</code> gives a Core <code>Connection</code>; in 2.0 it does not autocommit, you call <code>conn.commit()</code>, or use <code>engine.begin()</code>, which commits on success. A <code>Session</code> borrows a connection lazily on first SQL and returns it at commit, rollback or close. One session can span several transactions one after another, but never two at once.</p>
      <p><b>Scoped sessions</b> (<code>scoped_session</code>) give a thread-local session and were common in Flask apps. With FastAPI's dependency injection you do not need them: pass the session explicitly. Explicit beats magic, and it works with async too.</p>
      <p><b>Production reality.</b> Create the engine once per process (at import or in the lifespan handler). Creating an engine per request creates a new pool per request and exhausts the database's connection limit within minutes.</p>`,
    aiEra: `<p>🤖 AI assistants write SQLAlchemy code quickly, but they were trained on a decade of <b>1.x style</b> code. Watch for <code>session.query(User).filter(...)</code>, <code>declarative_base()</code>, <code>Column(Integer)</code> without <code>Mapped</code>, and <code>autocommit=True</code> sessions (removed in 2.0). Ask explicitly for "SQLAlchemy 2.0 style with DeclarativeBase, Mapped, mapped_column and select()".</p>
      <p>The most common AI-generated bug is session scope: a module-level <code>session = SessionLocal()</code> or a session stored on a class that lives for the whole app. Review every generated data-access file for "who creates the session, who commits, who closes".</p>
      <p>Good uses: ask the assistant to "explain every SQL statement this function will send, in order", then turn on <code>echo=True</code> and compare. That habit catches hidden autoflushes and lazy loads. Old school still matters: you must know flush vs commit to judge whether the generated code is atomic.</p>`,
    problems: [
      {
        title: 'Predict what a flush sends',
        level: 'Medium',
        tags: ['unit of work', 'session', 'flush'],
        companies: ['Stripe', 'Instagram'],
        statement: `<p>A code reviewer asks: "how many statements does this endpoint send, and which ones?" Write <code>flush_statements(ops)</code> that predicts the SQL one flush sends, the way a unit of work collapses changes. Each op is a string:</p>
          <ul><li><code>"add N"</code>: a <b>new</b> object with key N is added (pending).</li><li><code>"update N"</code>: object N is changed. N may be new (added earlier) or an existing row.</li><li><code>"delete N"</code>: object N is deleted.</li></ul>
          <p>Rules of a unit of work: a new object that is updated is still just one <code>INSERT</code> (with the final values). Several updates to the same row are one <code>UPDATE</code>. A new object that is deleted before flush sends <b>nothing</b>. An existing row that is updated and then deleted sends only the <code>DELETE</code>. Return statements as <code>"INSERT N"</code>, then <code>"UPDATE N"</code>, then <code>"DELETE N"</code>; inside each group keep the order in which the key first entered that group.</p>`,
        constraints: `<p>0 ≤ ops ≤ 1000. Keys are positive integers. No op mentions a key after it was deleted, and "add" never reuses a key that already exists.</p>`,
        example: `<p><code>["add 5", "update 5", "update 2", "update 2", "delete 3", "add 6", "delete 6"]</code> → <code>${H.c('g', '["INSERT 5", "UPDATE 2", "DELETE 3"]')}</code></p>
          <p>Why: 5 is new, its update just changes what the INSERT carries. 2 is existing and updated twice: one UPDATE. 3 is existing and deleted. 6 was added and deleted before flush, so the database never hears of it.</p>`,
        brute: {
          why: `<p>The naive approach sends one statement per operation, like an "active record" library that saves on every change: 7 statements for the example, including an INSERT and DELETE for row 6 that cancel out, and two UPDATEs for row 2. That is the round-trip waste a unit of work exists to remove.</p>`,
          code: `def flush_statements_naive(ops):
    # One statement per call: what you get without a unit of work.
    out = []
    for op in ops:
        verb, key = op.split()
        out.append({"add": "INSERT", "update": "UPDATE", "delete": "DELETE"}[verb] + " " + key)
    return out`
        },
        mcq: {
          q: 'An object is added and then deleted before any flush. What does SQLAlchemy send?',
          options: ['An INSERT then a DELETE', 'Nothing: the pending object is simply removed from the session', 'Only a DELETE', 'It raises an error'],
          answer: 1,
          explain: 'Deleting a pending object just expunges it. The database never knew about it, so no SQL is needed.'
        },
        hints: [
          'Hint 1: keep one state per key: "new", "dirty" or "deleted". The final state decides the statement, not the number of ops.',
          'Hint 2: use dicts that remember insertion order (Python dicts do) for each group, so the output order falls out naturally.',
          'Hint 3: add → new. update → stays new if new, else dirty. delete → if new, forget it entirely; else remove from dirty and mark deleted. Emit INSERTs, UPDATEs, DELETEs.'
        ],
        solution: {
          approach: `<p>Track the net effect per key, exactly like <code>session.new</code>, <code>session.dirty</code> and <code>session.deleted</code>. Three insertion-ordered dicts hold the groups. An update on a new key changes nothing about the plan. A delete on a new key removes it from <code>new</code> and records nothing. A delete on a dirty key moves it to <code>deleted</code>. At the end, emit the three groups in order. Real SQLAlchemy also sorts across classes by foreign-key dependencies; with one table this simple order is what you see in the log.</p>`,
          code: `def flush_statements(ops):
    new = {}      # key -> True, insertion order = add order
    dirty = {}    # existing rows that changed
    deleted = {}  # existing rows to delete
    for op in ops:
        verb, raw = op.split()
        key = int(raw)
        if verb == "add":
            new[key] = True
        elif verb == "update":
            if key not in new:          # updating a new object only changes the INSERT
                dirty[key] = True
        elif verb == "delete":
            if key in new:              # never sent: just forget it
                del new[key]
            else:
                dirty.pop(key, None)    # the UPDATE is pointless now
                deleted[key] = True
    return ([f"INSERT {k}" for k in new]
            + [f"UPDATE {k}" for k in dirty]
            + [f"DELETE {k}" for k in deleted])`,
          complexity: `<p>O(n) time and O(k) space for n ops over k distinct keys. Each op is a constant number of dict operations.</p>`,
          followUps: ['How does SQLAlchemy order statements across two tables linked by a foreign key?', 'What changes if <code>autoflush</code> fires in the middle of the ops because a query runs?']
        },
        tests: { fn: 'flushStatements', sig: 'string[] -> string[]', cases: [
          [[['add 5', 'update 5', 'update 2', 'update 2', 'delete 3', 'add 6', 'delete 6']], ['INSERT 5', 'UPDATE 2', 'DELETE 3']],
          [[[]], []],
          [[['add 1']], ['INSERT 1']],
          [[['update 4', 'delete 4']], ['DELETE 4']],
          [[['add 1', 'add 2', 'delete 1']], ['INSERT 2']],
          [[['update 9', 'update 3', 'update 9']], ['UPDATE 9', 'UPDATE 3']],
          [[['delete 2', 'add 7', 'update 1']], ['INSERT 7', 'UPDATE 1', 'DELETE 2']]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — ORM models and relationships
     ===================================================================== */
  topics.push({
    title: 'ORM Models and Relationships (DeclarativeBase, Mapped, relationship)',
    analogy: `<p>A <b>model class</b> is like the <b>printed form</b> a clinic hands you: each box on the form is a column, and each filled-in form is a row. <code>Mapped[str]</code> says "this box takes text and must be filled in"; <code>Mapped[str | None]</code> says "optional box".</p>
      <p>A <b>relationship</b> is the <b>staple</b> that clips forms together. A patient form is stapled to many visit forms. The staple itself is just a number on each visit form ("patient #42", the foreign key). <code>relationship()</code> is the clerk who follows the staple for you, so you can write <code>patient.visits</code> instead of looking up #42 by hand.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> In SQLAlchemy 2.0 you describe a table as a Python class with <b>type hints</b>. The type hint decides the column type and whether it can be NULL. You saw the same table design in the SQL track (DDL, constraints, ER modelling); here you write it once in Python and let SQLAlchemy and Alembic produce the DDL.</p>
      ${H.table(['You write', 'Column you get', 'Why'], [
        ['<code>id: Mapped[int] = mapped_column(primary_key=True)</code>', '<code>id INTEGER PRIMARY KEY</code> (auto-increment / identity)', 'Integer primary key gets a generated value'],
        ['<code>email: Mapped[str] = mapped_column(String(255), unique=True)</code>', '<code>VARCHAR(255) NOT NULL UNIQUE</code>', '<code>Mapped[str]</code> without <code>None</code> means NOT NULL'],
        ['<code>bio: Mapped[str | None]</code>', '<code>VARCHAR NULL</code>', '<code>| None</code> means nullable'],
        ['<code>created_at: Mapped[datetime] = mapped_column(server_default=func.now())</code>', '<code>DEFAULT now()</code>', 'The database fills it in'],
        ['<code>price: Mapped[Decimal] = mapped_column(Numeric(10, 2))</code>', '<code>NUMERIC(10,2)</code>', 'Exact money; never float'],
        ['<code>team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))</code>', '<code>REFERENCES teams(id)</code>', 'The staple: the real link between tables']
      ])}
      <p><b>Relationships.</b> The foreign key column is the truth in the database. <code>relationship()</code> is a Python convenience built on it:</p>
      <ul>
        <li><b>One-to-many</b>: <code>Author.books: Mapped[list["Book"]]</code> and <code>Book.author: Mapped["Author"]</code>, joined with <code>back_populates</code> so both sides stay in sync in memory.</li>
        <li><b>Many-to-one</b>: the side with the foreign key (<code>Book.author_id</code>).</li>
        <li><b>One-to-one</b>: a scalar annotation on both sides (<code>Mapped["Profile"]</code>) plus a <b>unique</b> foreign key.</li>
        <li><b>Many-to-many</b>: a link table passed as <code>secondary=</code>. If the link needs its own data (quantity, role, joined_at), make it a full class: the <b>association object</b> pattern.</li>
      </ul>
      <p>🔵 <b>Cascades.</b> <code>cascade="all, delete-orphan"</code> on <code>Order.items</code> means: adding an order adds its items, deleting the order deletes its items, and removing an item from <code>order.items</code> deletes that item row. Pair it with <code>ForeignKey(..., ondelete="CASCADE")</code> and <code>passive_deletes=True</code> to let the database do bulk deletes instead of SQLAlchemy loading every child first.</p>
      <p><b>Coming from Java?</b> This is the same idea as JPA <code>@Entity</code>, <code>@OneToMany(mappedBy=...)</code> and <code>@ManyToOne</code> from the Backend module "Databases from Code". You do not need Java for this module, but if you know JPA, <code>back_populates</code> ≈ <code>mappedBy</code>, and SQLAlchemy relationships are <b>lazy by default</b>, like JPA collections.</p>`,
    clues: [
      '"Model a blog / shop / school in SQLAlchemy" → classes on <code>DeclarativeBase</code>, foreign keys, <code>relationship(back_populates=...)</code>',
      '"An order line needs a quantity" → association object, not a plain many-to-many <code>secondary</code>',
      '"Deleting a parent leaves orphans" → <code>cascade="all, delete-orphan"</code> and/or <code>ondelete="CASCADE"</code>',
      '"Nullable or not?" → <code>Mapped[str]</code> is NOT NULL, <code>Mapped[str | None]</code> is NULL',
      '"Store money" → <code>Numeric</code> + <code>Decimal</code> or integer cents, never <code>Float</code>',
      '"Constraint names keep changing in migrations" → set a <code>naming_convention</code> on the metadata'
    ],
    code: [
      {
        lang: 'python', title: 'models.py — a shop with all four relationship kinds',
        code: `# models.py — SQLAlchemy 2.0 typed declarative mapping.
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (CheckConstraint, Column, ForeignKey, MetaData, Numeric,
                        String, Table, UniqueConstraint, func)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# Predictable constraint names make Alembic migrations stable and reviewable.
NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


# Plain many-to-many: the link table has no extra columns.
product_tags = Table(
    "product_tags",
    Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # one-to-one: a scalar annotation means "one object, not a list"
    profile: Mapped[Optional["Profile"]] = relationship(back_populates="customer")
    # one-to-many
    orders: Mapped[list["Order"]] = relationship(back_populates="customer")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), unique=True)
    bio: Mapped[str | None]                      # nullable column, type from the hint
    customer: Mapped["Customer"] = relationship(back_populates="profile")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    products: Mapped[list["Product"]] = relationship(secondary=product_tags, back_populates="tags")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    tags: Mapped[list["Tag"]] = relationship(secondary=product_tags, back_populates="products")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    customer: Mapped["Customer"] = relationship(back_populates="orders")
    # association objects; the order owns its lines
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class OrderItem(Base):
    """Association object: a many-to-many link that carries its own data."""
    __tablename__ = "order_items"
    __table_args__ = (
        UniqueConstraint("order_id", "product_id"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int]
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))  # price at purchase time

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()`
      },
      {
        lang: 'python', title: 'Using the relationships',
        code: `from decimal import Decimal

from sqlalchemy import select

from db import SessionLocal
from models import Customer, Order, OrderItem, Product

with SessionLocal() as session, session.begin():
    ann = Customer(email="ann@example.com", name="Ann")
    mug = Product(sku="MUG-1", price=Decimal("12.50"))
    order = Order(customer=ann)                 # sets order.customer AND ann.orders
    order.items.append(OrderItem(product=mug, quantity=2, unit_price=mug.price))
    session.add(ann)                            # cascade "save-update" adds order and item too

with SessionLocal() as session, session.begin():
    order = session.scalars(select(Order).where(Order.status == "pending")).first()
    if order is not None:
        order.items.pop(0)                      # delete-orphan: this OrderItem row is deleted on flush
        print(order.customer.email)             # lazy load: one SELECT for the customer`
      }
    ],
    codeTitle: ['models.py — four relationship kinds', 'Using the relationships'],
    viz: {
      title: 'From type hints to CREATE TABLE, column by column',
      input: 'id: int pk; email: str unique; nickname: str | None; team_id: int fk teams.id; created_at: datetime now',
      inputLabel: 'Columns "name: type [pk|unique|index|fk table.col|now]" separated by ";" (types: int, str, bool, datetime, decimal)',
      gen: function (input) {
        var cols = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8);
        if (!cols.length) throw new Error('Type columns like: id: int pk; email: str unique');
        var TYPES = { int: ['int', 'INTEGER'], str: ['str', 'VARCHAR(255)'], bool: ['bool', 'BOOLEAN'], datetime: ['datetime', 'TIMESTAMP'], decimal: ['Decimal', 'NUMERIC(10, 2)'], float: ['float', 'FLOAT'] };
        var py = ['class Thing(Base):', '    __tablename__ = "things"'], sql = ['CREATE TABLE things ('], rows = [], frames = [];
        frames.push({ narr: 'Every model starts the same way: inherit from <code>Base</code> (your <code>DeclarativeBase</code> subclass) and name the table. SQLAlchemy registers the class in <code>Base.metadata</code>, which Alembic reads later.', parts: [pyc('models.py', py.join('\n')), { type: 'code', label: 'DDL SQLAlchemy would emit', lang: 'sql', code: sql.join('\n') + '\n);' }] });
        cols.forEach(function (c, ci) {
          var m = c.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z]+)\s*(\|\s*None)?\s*(.*)$/);
          if (!m) throw new Error('Could not read "' + c + '". Format: name: type [flags], e.g. email: str unique');
          var name = m[1], t = TYPES[m[2].toLowerCase()];
          if (!t) throw new Error('Unknown type "' + m[2] + '". Use int, str, bool, datetime, decimal or float.');
          var nullable = !!m[3], flags = m[4].split(/\s+/).filter(Boolean), args = [], cons = [], why = [];
          var pk = flags.indexOf('pk') >= 0, fkAt = flags.indexOf('fk'), fk = fkAt >= 0 ? (flags[fkAt + 1] || 'other.id') : null;
          if (t[0] === 'str') args.push('String(255)');
          if (t[0] === 'Decimal') args.push('Numeric(10, 2)');
          if (fk) { args.push('ForeignKey("' + fk + '")'); cons.push('REFERENCES ' + fk.replace('.', '(') + ')'); why.push('the foreign key is the real link between rows'); }
          if (pk) { args.push('primary_key=True'); cons.push('PRIMARY KEY'); why.push('an integer primary key gets a generated value'); }
          if (flags.indexOf('unique') >= 0) { args.push('unique=True'); cons.push('UNIQUE'); why.push('unique=True adds a UNIQUE constraint (and an index)'); }
          if (flags.indexOf('index') >= 0) { args.push('index=True'); why.push('index=True adds a separate CREATE INDEX'); }
          if (flags.indexOf('now') >= 0) { args.push('server_default=func.now()'); cons.push('DEFAULT now()'); why.push('server_default lets the database fill the value'); }
          var ann = 'Mapped[' + t[0] + (nullable ? ' | None' : '') + ']';
          py.push('    ' + name + ': ' + ann + (args.length ? ' = mapped_column(' + args.join(', ') + ')' : ''));
          var nn = pk ? '' : (nullable ? ' NULL' : ' NOT NULL');
          sql.push('    ' + name + ' ' + t[1] + nn + (cons.length ? ' ' + cons.join(' ') : '') + (ci < cols.length - 1 ? ',' : ''));
          rows.push([name, t[1], pk ? 'no (PK)' : (nullable ? 'yes' : 'no'), cons.join(' ') || '-']);
          var hl = {}; hl[py.length] = 'cur';
          frames.push({ narr: 'Column <code>' + hesc(name) + '</code>: the hint <code>' + hesc(ann) + '</code> picks the SQL type <b>' + t[1] + '</b> and ' + (pk ? 'primary keys are never NULL' : (nullable ? '<b>| None</b> makes it <b>NULL</b>able' : 'no <code>| None</code> means <b>NOT NULL</b>')) + '. ' + (why.length ? 'Also: ' + why.join('; ') + '.' : ''), parts: [pyc('models.py', py.join('\n'), hl), { type: 'code', label: 'DDL SQLAlchemy would emit', lang: 'sql', code: sql.join('\n') + '\n);' }, tbl('Columns so far', ['column', 'SQL type', 'nullable', 'constraints'], rows, (function () { var h = {}; h[rows.length - 1] = 'ok'; return h; })())] });
        });
        frames.push({ narr: 'Done. <code>Base.metadata.create_all(engine)</code> would run this DDL in a quick demo, but in a real project <b>Alembic</b> compares the metadata with the live database and writes a migration file instead (topic 6).', parts: [pyc('models.py', py.join('\n')), { type: 'code', label: 'Final DDL', lang: 'sql', code: sql.join('\n') + '\n);' }, tbl('Columns', ['column', 'SQL type', 'nullable', 'constraints'], rows)] });
        return frames;
      }
    },
    examples: [
      {
        title: 'back_populates keeps both sides in sync before any SQL',
        html: `<p>You write <code>book.author = ann</code>. Without <code>back_populates</code>, <code>ann.books</code> would not include the book until you reload from the database. With it, SQLAlchemy updates the other side in memory instantly. On flush it sets <code>book.author_id = ann.id</code> for you, inserting Ann first if she is new.</p>
          ${H.table(['Step', 'book.author', 'ann.books', 'book.author_id'], [['before', 'None', '[]', 'None'], ['<code>book.author = ann</code>', 'ann', H.c('g', '[book]'), 'None (not flushed)'], ['flush', 'ann', '[book]', H.c('g', 'ann.id')]])}`,
        code: { lang: 'python', code: `ann = Author(name="Ann")
book = Book(title="Dune Notes")
book.author = ann
print(book in ann.books)   # True, thanks to back_populates (no SQL needed)` }
      },
      {
        title: 'Plain many-to-many vs association object',
        html: `<p>Products and tags: a link row only says "this product has this tag", so <code>secondary=product_tags</code> is perfect. Orders and products: a link row must also store <b>quantity</b> and <b>unit price at purchase time</b>. A <code>secondary</code> table cannot hold data you can read through the relationship, so you promote the link to a class, <code>OrderItem</code>, with two many-to-one relationships.</p>
          ${H.table(['Need', 'Pattern'], [['Just "A is linked to B"', '<code>relationship(secondary=table)</code>'], ['The link has its own columns', 'Association object class'], ['The link has a lifecycle (soft delete, audit)', 'Association object class']])}`
      },
      {
        title: 'Cascade delete: ORM-side vs database-side',
        html: `<p>Deleting an order with 10,000 lines. With only <code>cascade="all, delete-orphan"</code>, SQLAlchemy first <b>loads all 10,000 items</b> and sends a DELETE for each. Add <code>ondelete="CASCADE"</code> on the foreign key and <code>passive_deletes=True</code> on the relationship, and SQLAlchemy sends one <code>DELETE FROM orders WHERE id = ?</code>; the database removes the lines itself. Always keep the database constraint: it also protects you from scripts and other services that bypass the ORM.</p>`,
        code: { lang: 'python', code: `from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(primary_key=True)
    lines: Mapped[list["InvoiceLine"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan", passive_deletes=True
    )


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    invoice: Mapped["Invoice"] = relationship(back_populates="lines")` }
      }
    ],
    deepDive: `<p>🟣 <b>How the annotations become columns.</b> At class creation, the declarative system reads <code>__annotations__</code>. <code>Mapped[X]</code> marks an attribute as mapped; <code>X</code> is looked up in a <b>type annotation map</b> (<code>int</code> → <code>Integer</code>, <code>str</code> → <code>String</code>, <code>datetime</code> → <code>DateTime</code>, <code>Decimal</code> → <code>Numeric</code>, <code>bool</code> → <code>Boolean</code>). You can extend it on the base class with <code>type_annotation_map = {str: String(255)}</code>. Explicit arguments to <code>mapped_column()</code> always win over the hint.</p>
      <p><b>String forward references.</b> <code>Mapped[list["Book"]]</code> uses a string because <code>Book</code> is defined later. SQLAlchemy resolves names against the registry when mappers are configured (on first use), so circular references between modules are fine as long as every model module is imported before you query (a common pattern: <code>models/__init__.py</code> imports them all, and Alembic's <code>env.py</code> imports that package).</p>
      <p><b>Primary keys.</b> Prefer a surrogate integer or <code>BigInteger</code> identity key, plus <code>UNIQUE</code> constraints on natural keys like email or SKU. UUID keys (<code>Mapped[uuid.UUID]</code>, native <code>UUID</code> on PostgreSQL) are good for public ids and merging data across systems; time-ordered UUIDv7 keeps B-tree inserts local, unlike random v4.</p>
      <p><b>Dataclass-style models.</b> Inherit from <code>MappedAsDataclass</code> and <code>DeclarativeBase</code> to get a generated <code>__init__</code>, <code>__repr__</code> and <code>__eq__</code>, with <code>mapped_column(init=False)</code> for server-generated fields. Useful, but remember dataclass equality compares fields, while the identity map is about <i>identity</i>.</p>
      <p><b>Production reality.</b> Models describe what you <i>want</i>; the database is what you <i>have</i>. They drift unless every change goes through a migration. Never call <code>create_all()</code> against production; it creates missing tables but never alters existing ones.</p>`,
    aiEra: `<p>🤖 Ask an assistant to "turn this ER diagram into SQLAlchemy 2.0 models with naming conventions, indexes on foreign keys and an association object for order lines" and you will get a solid first draft in seconds. Your job is the review checklist: every foreign key used in joins has an index (PostgreSQL does not create one automatically), money is <code>Numeric</code>, nullability matches the business rule, cascades are deliberate, and unique constraints exist where the business says "only one".</p>
      <p>AI tools also tend to mix 1.x and 2.0 styles (<code>Column(Integer, primary_key=True)</code> next to <code>Mapped</code>). It works, but it is inconsistent and loses type checking. Ask for <code>mypy</code>-clean models. Old school still wins at modelling itself: deciding what is an entity, what is a link and what must be unique is domain thinking the tool cannot do for you.</p>`,
    problems: [
      {
        title: 'Design the models for orders and their items',
        level: 'Medium',
        tags: ['modelling', 'relationships', 'association object'],
        companies: ['Shopify', 'Amazon'],
        statement: `<p>You are building the data layer of a small shop API. Write SQLAlchemy 2.0 models for <b>customers</b>, <b>products</b>, <b>orders</b> and <b>order items</b>. Business rules:</p>
          <ul><li>A customer has many orders; an order belongs to exactly one customer.</li>
          <li>An order has one or more lines. Each line points at a product and stores the <b>quantity</b> (at least 1) and the <b>unit price at the time of purchase</b> (prices change later).</li>
          <li>A product appears at most once per order.</li>
          <li>Deleting an order deletes its lines; deleting a product that was ever sold must be <b>refused</b>.</li>
          <li>Money must be exact. Listing a customer's orders newest first must be fast.</li></ul>`,
        constraints: `<p>SQLAlchemy 2.0 typed mapping. PostgreSQL in production.</p>`,
        example: `<p>Ann buys 2 mugs at 12.50 and 1 pen at 3.00. Rows: one <code>orders</code> row (customer Ann), two <code>order_items</code> rows: (mug, qty 2, ${H.c('g', '12.50')}) and (pen, qty 1, 3.00). If the mug price later becomes 14.00, the order total is still 28.00, because the line kept its own price.</p>`,
        brute: {
          why: `<p>A tempting shortcut is one <code>orders</code> table with a JSON column holding the lines. It works for a demo, but the database can no longer enforce that the product exists, that quantity is positive or that a sold product cannot be deleted. Reporting ("top products this month") becomes JSON parsing on every row, and no index helps.</p>`,
          code: `from sqlalchemy import JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class OrderBlob(Base):
    __tablename__ = "orders_blob"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    # [{"sku": "MUG-1", "qty": 2, "price": 12.5}] — no FK, no CHECK, float money
    lines: Mapped[list] = mapped_column(JSON)`
        },
        mcq: {
          q: 'The link between orders and products must store quantity and unit price. Which mapping fits?',
          options: ['<code>relationship(secondary=order_products)</code>', 'An association object class <code>OrderItem</code> with two foreign keys', 'A JSON column on orders', 'Two one-to-one relationships'],
          answer: 1,
          explain: 'When the link carries its own data, promote it to a mapped class with many-to-one relationships to both sides.'
        },
        hints: [
          'Hint 1: the line between an order and a product carries data (quantity, price), so it must be its own class, not a <code>secondary</code> table.',
          'Hint 2: enforce rules in the database: <code>CheckConstraint("quantity &gt; 0")</code>, <code>UniqueConstraint("order_id", "product_id")</code>, <code>ondelete="CASCADE"</code> for order → items, <code>ondelete="RESTRICT"</code> for product → items.',
          'Hint 3: fast "orders of customer X, newest first" needs a composite index on <code>(customer_id, created_at)</code>; money is <code>Numeric(10, 2)</code> with <code>Decimal</code>.'
        ],
        solution: {
          approach: `<p>Four classes. <code>Order</code> → <code>Customer</code> is many-to-one. <code>OrderItem</code> is an association object with foreign keys to both <code>orders</code> and <code>products</code>, plus <code>quantity</code> and <code>unit_price</code>. Database constraints carry the business rules: a CHECK for quantity, a UNIQUE pair for "product once per order", <code>ON DELETE CASCADE</code> from orders to items (with <code>passive_deletes=True</code> so the ORM lets the database do it), and <code>ON DELETE RESTRICT</code> from products so a sold product cannot vanish. A composite index on <code>(customer_id, created_at)</code> serves the "my orders, newest first" query with an index range scan, as in the SQL track's index module. The order total is computed from lines (or stored and kept in sync in the service layer if reads dominate).</p>`,
          code: `from datetime import datetime
from decimal import Decimal

from sqlalchemy import (CheckConstraint, ForeignKey, Index, Numeric, String,
                        UniqueConstraint, func)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    orders: Mapped[list["Order"]] = relationship(back_populates="customer")


class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))   # current price


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        # "orders of customer X, newest first" is an index range scan
        Index("ix_orders_customer_created", "customer_id", "created_at"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def total(self) -> Decimal:
        return sum((i.unit_price * i.quantity for i in self.items), Decimal("0"))


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        UniqueConstraint("order_id", "product_id", name="uq_order_items_order_product"),
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    quantity: Mapped[int]
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))  # snapshot at purchase

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()`,
          complexity: `<p>Listing a customer's orders is O(log n + k) with the composite index. Inserting an order with m lines is m + 1 rows in one transaction (batched by the unit of work).</p>`,
          followUps: ['How would you add a status history (pending → paid → shipped) without losing old values?', 'When would you store <code>total</code> on the order row instead of computing it?']
        },
        tests: { skip: 'ORM wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — Queries in SQLAlchemy 2.0 style
     ===================================================================== */
  topics.push({
    title: 'Queries in SQLAlchemy 2.0 Style: select(), joins, aggregates, bulk writes',
    analogy: `<p>Writing a query with <code>select()</code> is like <b>filling a sandwich order card</b> at a deli. You start with the bread (<code>select(User)</code>), then tick boxes one by one: "only vegetarian" (<code>.where</code>), "add cheese from the other counter" (<code>.join</code>), "biggest first" (<code>.order_by</code>), "just two" (<code>.limit</code>). Ticking boxes does not make the sandwich. The card is only handed over when you give it to the cook (<code>session.execute</code> / <code>session.scalars</code>).</p>
      <p>Because the card is a real object, you can pass it around, add a box in another function, or print it to see exactly what the cook will read.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> In 2.0 style every query is a <b>statement object</b> built with <code>select()</code>, <code>insert()</code>, <code>update()</code> or <code>delete()</code>, and run with the session. The old <code>session.query(...)</code> API still works but is "legacy"; new code uses <code>select()</code>. The SQL you learned in the SQL track maps almost one to one:</p>
      ${H.table(['SQL', 'SQLAlchemy 2.0'], [
        ['<code>SELECT * FROM users</code>', '<code>select(User)</code>'],
        ['<code>WHERE email = :e</code>', '<code>.where(User.email == e)</code>'],
        ['<code>WHERE a AND b</code> / <code>OR</code>', '<code>.where(a, b)</code> / <code>.where(or_(a, b))</code>'],
        ['<code>IN (...)</code>, <code>LIKE</code>, <code>IS NULL</code>', '<code>.in_(ids)</code>, <code>.ilike("%ann%")</code>, <code>.is_(None)</code>'],
        ['<code>JOIN orders ON ...</code>', '<code>.join(User.orders)</code> (uses the relationship\'s FK)'],
        ['<code>LEFT JOIN</code>', '<code>.outerjoin(User.orders)</code>'],
        ['<code>GROUP BY ... HAVING</code>', '<code>.group_by(User.id).having(func.count(Order.id) &gt; 3)</code>'],
        ['<code>ORDER BY created_at DESC LIMIT 20</code>', '<code>.order_by(User.created_at.desc()).limit(20)</code>'],
        ['<code>EXISTS (subquery)</code>', '<code>.where(select(Order.id).where(Order.user_id == User.id).exists())</code>']
      ])}
      <p><b>Running it.</b> Pick the method by the shape you want back:</p>
      ${H.table(['Call', 'Returns', 'Use when'], [
        ['<code>session.scalars(stmt).all()</code>', 'list of objects', 'selecting one entity, e.g. <code>select(User)</code>'],
        ['<code>session.scalars(stmt).first()</code>', 'object or <code>None</code>', 'top result of an ordered query'],
        ['<code>session.scalars(stmt).one()</code>', 'exactly one, else error', 'must exist and be unique'],
        ['<code>session.scalar(stmt)</code> / <code>.scalar_one_or_none()</code>', 'single value or <code>None</code>', 'counts, lookups by unique key'],
        ['<code>session.execute(stmt).all()</code>', 'list of <code>Row</code> tuples', 'several columns: <code>select(User.name, func.count(...))</code>'],
        ['<code>session.get(User, 5)</code>', 'object or <code>None</code>', 'by primary key; checks the identity map first']
      ])}
      <p>🔵 <b>Safety.</b> Every value you pass (<code>User.email == e</code>) becomes a <b>bound parameter</b>, never pasted into the SQL text. That is what blocks SQL injection (Backend "Databases from Code" covered prepared statements). If you must write raw SQL, use <code>text("... WHERE id = :id")</code> with a params dict, never an f-string.</p>
      <p><b>Bulk writes.</b> <code>update(User).where(...).values(active=False)</code> and <code>delete(...)</code> run one statement for many rows, without loading objects. <code>insert(User).returning(User.id)</code> with a list of dicts inserts many rows in one round trip.</p>
      <p><b>See the SQL.</b> <code>print(stmt)</code> shows the SQL with placeholders. For a specific database: <code>print(stmt.compile(dialect=postgresql.dialect()))</code>.</p>`,
    clues: [
      '"Convert this session.query code to 2.0" → <code>select()</code> + <code>session.scalars()</code> / <code>session.execute()</code>',
      '"Return the user or 404" → <code>session.get()</code> for primary keys, <code>scalar_one_or_none()</code> for unique columns',
      '"Deactivate 50,000 users" → bulk <code>update()</code>, not a loop over loaded objects',
      '"Infinite scroll / page 5000 is slow" → keyset pagination with a tuple comparison, not a big OFFSET',
      '"Search by name, user input" → bound parameters (<code>ilike</code>), never f-strings into <code>text()</code>',
      '"Count per group" → <code>select(col, func.count()).group_by(col)</code> and <code>session.execute()</code>'
    ],
    code: [
      {
        lang: 'python', title: 'Everyday queries, 2.0 style',
        code: `from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.orm import Session

from models import Customer, Order, OrderItem


def find_by_email(db: Session, email: str) -> Customer | None:
    stmt = select(Customer).where(Customer.email == email)
    return db.scalars(stmt).one_or_none()


def search_customers(db: Session, term: str, limit: int = 20) -> list[Customer]:
    stmt = (
        select(Customer)
        .where(or_(Customer.name.ilike(f"%{term}%"), Customer.email.ilike(f"%{term}%")))
        .order_by(Customer.name)
        .limit(limit)
    )
    return list(db.scalars(stmt))      # term is a bound parameter, injection-safe


def big_spenders(db: Session, min_orders: int) -> list[tuple[str, int]]:
    # JOIN + GROUP BY + HAVING; execute() returns Row tuples
    stmt = (
        select(Customer.name, func.count(Order.id).label("n"))
        .join(Customer.orders)
        .where(Order.status == "paid")
        .group_by(Customer.id, Customer.name)
        .having(func.count(Order.id) >= min_orders)
        .order_by(func.count(Order.id).desc())
    )
    return [(row.name, row.n) for row in db.execute(stmt)]


def customers_without_orders(db: Session) -> list[Customer]:
    # anti-join with NOT EXISTS (see the SQL track's JOINs module)
    has_order = select(Order.id).where(Order.customer_id == Customer.id).exists()
    return list(db.scalars(select(Customer).where(~has_order)))


def cancel_stale_orders(db: Session, older_than) -> int:
    # one UPDATE for all matching rows; no objects loaded
    result = db.execute(
        update(Order)
        .where(and_(Order.status == "pending", Order.created_at < older_than))
        .values(status="cancelled")
    )
    return result.rowcount


def purge_cancelled(db: Session) -> None:
    db.execute(delete(OrderItem).where(OrderItem.order_id.in_(
        select(Order.id).where(Order.status == "cancelled")
    )))
    db.execute(delete(Order).where(Order.status == "cancelled"))`
      },
      {
        lang: 'python', title: 'Insert many rows, upsert on PostgreSQL, raw SQL safely',
        code: `from sqlalchemy import insert, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from models import Product


def bulk_create(db: Session, rows: list[dict]) -> list[int]:
    # one round trip with RETURNING; rows like {"sku": "A", "name": "x", "price": 1}
    return list(db.scalars(insert(Product).returning(Product.id), rows))


def upsert_price(db: Session, sku: str, name: str, price) -> None:
    stmt = pg_insert(Product).values(sku=sku, name=name, price=price)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Product.sku],
        set_={"price": stmt.excluded.price, "name": stmt.excluded.name},
    )
    db.execute(stmt)


def revenue_since(db: Session, since) -> int:
    # raw SQL is fine when it is clearer, but ALWAYS with bound parameters
    sql = text("SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items oi "
               "JOIN orders o ON o.id = oi.order_id WHERE o.created_at >= :since")
    return db.scalar(sql, {"since": since})`
      },
      {
        lang: 'python', run: true, title: 'Runnable: OFFSET vs keyset pagination in sqlite3',
        code: `# Deep OFFSET pages get slower; keyset pages stay fast. Stdlib only.
import sqlite3
import time

con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE posts (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL)")
con.execute("CREATE INDEX ix_posts_created_id ON posts (created_at, id)")
con.executemany("INSERT INTO posts (created_at) VALUES (?)", [(i // 3,) for i in range(100_000)])

def offset_page(page, size=20):
    return con.execute(
        "SELECT id FROM posts ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
        (size, page * size)).fetchall()

def keyset_page(after, size=20):
    if after is None:
        return con.execute(
            "SELECT id, created_at FROM posts ORDER BY created_at DESC, id DESC LIMIT ?", (size,)).fetchall()
    return con.execute(
        "SELECT id, created_at FROM posts WHERE (created_at, id) < (?, ?) "
        "ORDER BY created_at DESC, id DESC LIMIT ?", (after[1], after[0], size)).fetchall()

for page in (0, 500, 4000):
    t = time.perf_counter()
    offset_page(page)
    print(f"OFFSET page {page:>5}: {(time.perf_counter() - t) * 1000:7.2f} ms")

# walk to the same depth with keyset, timing only the last hop
rows, cursor = keyset_page(None), None
for _ in range(4000):
    cursor = rows[-1]
    rows = keyset_page(cursor)
t = time.perf_counter()
keyset_page(cursor)
print(f"keyset at page 4000: {(time.perf_counter() - t) * 1000:7.2f} ms")
plan = con.execute("EXPLAIN QUERY PLAN SELECT id FROM posts WHERE (created_at, id) < (5, 5) "
                   "ORDER BY created_at DESC, id DESC LIMIT 20").fetchall()
print("keyset plan:", plan[0][-1])`
      }
    ],
    codeTitle: ['Everyday queries', 'Bulk insert, upsert, raw SQL safely', 'Runnable: OFFSET vs keyset (sqlite3)'],
    viz: {
      title: 'Build a select() step by step and watch the SQL grow',
      input: 'where status = paid; join customer; where customer.country = NL; order_by created_at desc; limit 20',
      inputLabel: 'Clauses separated by ";" (where COL OP VALUE, join customer|items, order_by COL [desc], limit N, offset N, count)',
      gen: function (input) {
        var parts = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8);
        if (!parts.length) throw new Error('Type clauses like: where status = paid; order_by created_at desc; limit 20');
        var py = ['stmt = select(Order)'], st = { joins: [], wheres: [], order: [], limit: null, offset: null, count: false }, params = [], frames = [];
        function colPy(c) { if (c.indexOf('.') > 0) { var a = c.split('.'); return a[0].charAt(0).toUpperCase() + a[0].slice(1) + '.' + a[1]; } return 'Order.' + c; }
        function colSql(c) { return c.indexOf('.') > 0 ? c.replace(/^customer\./, 'customers.').replace(/^items\./, 'order_items.') : 'orders.' + c; }
        function sql() {
          var s = st.count ? 'SELECT count(*) AS count_1\nFROM orders' : 'SELECT orders.id, orders.customer_id, orders.status, orders.created_at\nFROM orders';
          st.joins.forEach(function (j) { s += j === 'customer' ? '\nJOIN customers ON customers.id = orders.customer_id' : '\nJOIN order_items ON orders.id = order_items.order_id'; });
          if (st.wheres.length) s += '\nWHERE ' + st.wheres.join(' AND ');
          if (st.order.length && !st.count) s += '\nORDER BY ' + st.order.join(', ');
          if (st.limit !== null && !st.count) s += '\nLIMIT :param_lim';
          if (st.offset !== null && !st.count) s += ' OFFSET :param_off';
          return s;
        }
        function frame(narr) {
          var hl = {}; hl[py.length] = 'cur';
          frames.push({ narr: narr, parts: [pyc('Python statement (nothing runs yet)', py.join('\n'), hl), { type: 'code', label: 'print(stmt) shows', lang: 'sql', code: sql() }, { type: 'map', label: 'Bound parameters (sent separately from the SQL text)', entries: params.slice() }] });
        }
        frame('<code>select(Order)</code> is just a Python object describing a query. No database call happens while you build it.');
        parts.forEach(function (p) {
          var w = p.split(/\s+/), k = w[0].toLowerCase();
          if (k === 'where' && w.length >= 4) {
            var col = w[1], op = w[2], val = w.slice(3).join(' ');
            var OPS = { '=': '==', '==': '==', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' };
            if (!OPS[op] && op !== 'like') throw new Error('Operator must be one of = != > < >= <= like');
            if (col.indexOf('.') > 0 && st.joins.indexOf(col.split('.')[0]) < 0) {
              frame('You filter on <code>' + hesc(col) + '</code> but have not joined <code>' + hesc(col.split('.')[0]) + '</code>. SQLAlchemy would add the table to FROM without a join condition and warn about a <b>cartesian product</b>. Add <code>join ' + hesc(col.split('.')[0]) + '</code> first.');
              return;
            }
            var pname = (col.split('.').pop()) + '_' + (params.length + 1);
            params.push([':' + pname, val]);
            py.push(op === 'like' ? 'stmt = stmt.where(' + colPy(col) + '.ilike(' + JSON.stringify(val) + '))' : 'stmt = stmt.where(' + colPy(col) + ' ' + OPS[op] + ' ' + (isNaN(+val) ? JSON.stringify(val) : val) + ')');
            st.wheres.push(op === 'like' ? 'lower(' + colSql(col) + ') LIKE lower(:' + pname + ')' : colSql(col) + ' ' + (op === '==' ? '=' : op) + ' :' + pname);
            frame('<code>.where()</code> adds a condition. Several <code>.where()</code> calls are joined with <b>AND</b>. The value <b>' + hesc(val) + '</b> becomes the bound parameter <code>:' + hesc(pname) + '</code>, so it can never change the SQL text (no injection).');
          } else if (k === 'join' && (w[1] === 'customer' || w[1] === 'items')) {
            if (st.joins.indexOf(w[1]) >= 0) { frame('Already joined <code>' + w[1] + '</code>; joining twice would need an alias.'); return; }
            st.joins.push(w[1]);
            py.push('stmt = stmt.join(Order.' + w[1] + ')');
            frame('<code>.join(Order.' + w[1] + ')</code> follows the relationship, so SQLAlchemy writes the <b>ON</b> clause from the foreign key for you. ' + (w[1] === 'items' ? 'Careful: joining a one-to-many repeats each order once per item; select only what you need or use <code>.distinct()</code>.' : 'Many-to-one joins never multiply rows.'));
          } else if (k === 'order_by' && w[1]) {
            var desc = (w[2] || '').toLowerCase() === 'desc';
            py.push('stmt = stmt.order_by(' + colPy(w[1]) + (desc ? '.desc()' : '') + ')');
            st.order.push(colSql(w[1]) + (desc ? ' DESC' : ''));
            frame('<code>.order_by()</code> adds sorting. Without ORDER BY, LIMIT/OFFSET pages are <b>not stable</b>: the database may return rows in any order. Add a unique tie-breaker such as <code>Order.id</code> for pagination.');
          } else if ((k === 'limit' || k === 'offset') && /^\d+$/.test(w[1] || '')) {
            st[k] = +w[1];
            params.push([':param_' + (k === 'limit' ? 'lim' : 'off'), w[1]]);
            py.push('stmt = stmt.' + k + '(' + w[1] + ')');
            frame(k === 'limit' ? '<code>.limit(' + w[1] + ')</code> caps the rows. Always cap list endpoints; an unbounded list is a future outage.' : '<code>.offset(' + w[1] + ')</code> skips rows. The database still <b>walks past</b> every skipped row, so large offsets get slower. Keyset pagination avoids that.');
          } else if (k === 'count') {
            st.count = true;
            py.push('total = db.scalar(select(func.count()).select_from(stmt.order_by(None).limit(None).offset(None).subquery()))');
            frame('Counting: wrap the filtered statement as a subquery and <code>SELECT count(*)</code> from it, dropping ORDER BY/LIMIT which do not change a count.');
          } else {
            frame('Skipped <code>' + hesc(p) + '</code>: I understand where, join customer|items, order_by, limit, offset, count.');
          }
        });
        py.push(st.count ? 'print(total)' : 'orders = db.scalars(stmt).all()   # NOW the SQL runs');
        frame('Only now does anything hit the database: <code>' + (st.count ? 'db.scalar(...)' : 'db.scalars(stmt).all()') + '</code> sends the SQL text and the parameters separately, then turns rows into <code>Order</code> objects (registered in the identity map).');
        return frames;
      }
    },
    examples: [
      {
        title: 'Migrating a legacy query to 2.0',
        html: `<p>Old code: <code>db.query(User).filter(User.active == True).order_by(User.id).all()</code>. New code builds a statement and executes it. The behaviour is the same; the 2.0 form also works unchanged with <code>AsyncSession</code>, which has no <code>.query()</code>.</p>
          ${H.table(['1.x legacy', '2.0 style'], [['<code>db.query(User).get(5)</code>', '<code>db.get(User, 5)</code>'], ['<code>db.query(User).filter_by(email=e).first()</code>', '<code>db.scalars(select(User).filter_by(email=e)).first()</code>'], ['<code>db.query(User).count()</code>', '<code>db.scalar(select(func.count()).select_from(User))</code>'], ['<code>q.update({...})</code>', '<code>db.execute(update(User).where(...).values(...))</code>']])}`,
        code: { lang: 'python', code: `from sqlalchemy import select

from models import User

# 2.0 style
stmt = select(User).where(User.active.is_(True)).order_by(User.id)
active_users = db.scalars(stmt).all()` }
      },
      {
        title: 'Rows vs objects: execute() or scalars()?',
        html: `<p><code>db.execute(select(User))</code> returns rows that each hold <b>one</b> element: <code>Row(User(...))</code>. Beginners then write <code>row[0].name</code> everywhere. <code>db.scalars(select(User))</code> unwraps the first column for you. When you select several things, <code>select(User.name, func.count(Order.id))</code>, use <code>execute()</code> and read <code>row.name</code>, <code>row.count</code> (label your expressions).</p>
          ${H.table(['Statement', 'execute() gives', 'scalars() gives'], [['<code>select(User)</code>', '<code>[Row(User), ...]</code>', H.c('g', '<code>[User, ...]</code>')], ['<code>select(User.id)</code>', '<code>[Row(1), ...]</code>', H.c('g', '<code>[1, 2, ...]</code>')], ['<code>select(User.name, func.count())</code>', H.c('g', 'rows with two fields'), 'only the names (loses data)']])}`
      },
      {
        title: 'Bulk update: 1 statement instead of 50,000',
        html: `<p>"Deactivate users who have not logged in for a year." Loading 50,000 objects, setting a flag and flushing sends 50,000 UPDATEs and uses lots of memory. A Core <code>update()</code> sends one. Trade-off: objects already loaded in this session are not refreshed automatically unless you pass <code>execution_options(synchronize_session="fetch")</code> (or expire them), and ORM events like <code>@validates</code> do not run.</p>`,
        code: { lang: 'python', code: `from datetime import datetime, timedelta, timezone

from sqlalchemy import update

from models import User

cutoff = datetime.now(timezone.utc) - timedelta(days=365)
result = db.execute(
    update(User)
    .where(User.last_login_at < cutoff, User.active.is_(True))
    .values(active=False)
    .execution_options(synchronize_session=False)
)
db.commit()
print(result.rowcount, "users deactivated")` }
      }
    ],
    deepDive: `<p>🟣 <b>Statements are immutable and composable.</b> Each <code>.where()</code> returns a <b>new</b> statement; the old one is unchanged. That makes query-building functions safe to share: a base query for "visible to this tenant" can be extended by many endpoints. It also means <code>stmt.where(x)</code> on its own line does nothing unless you assign it.</p>
      <p><b>Compiled cache.</b> SQLAlchemy caches the compiled SQL string per statement <i>structure</i>, with values as parameters. A query with a different <code>limit()</code> number still hits the cache because the limit is a parameter. Building SQL with f-strings defeats this cache and the database's plan cache, as well as being unsafe.</p>
      <p><b>Big IN lists.</b> <code>.in_(ids)</code> with thousands of values uses "expanding" parameters: one placeholder per value at execution time. PostgreSQL handles large lists, but past a few thousand prefer <code>= ANY(:array)</code> or a temporary table / <code>VALUES</code> join.</p>
      <p><b>Keyset pagination.</b> <code>WHERE (created_at, id) &lt; (:c, :i) ORDER BY created_at DESC, id DESC LIMIT n</code> (in SQLAlchemy: <code>tuple_(Post.created_at, Post.id) &lt; (c, i)</code>) jumps straight into the index at the cursor, so page 10,000 costs the same as page 1. You lose "jump to page 37", which feeds rarely need. Offset pagination also skips or repeats rows when new rows arrive between page loads; keyset does not.</p>
      <p><b>Production reality.</b> Turn on <code>echo=True</code> or the <code>sqlalchemy.engine</code> logger in development and read the SQL. Run <code>EXPLAIN ANALYZE</code> (SQL track, query optimisation) on anything that touches large tables. The ORM writes what you asked for, including slow things.</p>`,
    aiEra: `<p>🤖 Assistants are excellent at translating SQL into SQLAlchemy and back. A strong workflow: write or ask for the SQL first, check it with <code>EXPLAIN</code> on real data, then ask for the 2.0 statement and verify with <code>print(stmt.compile(dialect=postgresql.dialect()))</code> that the generated SQL matches.</p>
      <p>Watch for three common AI mistakes: (1) legacy <code>session.query</code> code mixed into 2.0 code; (2) f-strings inside <code>text()</code>, which reintroduces SQL injection; (3) <code>.offset(page * size)</code> pagination for feeds that grow without bound. Search-style endpoints built by AI also often forget a <code>.limit()</code>, so one curious client can make your API load a million rows.</p>`,
    problems: [
      {
        title: 'Keyset pagination for a feed',
        level: 'Medium',
        tags: ['pagination', 'keyset', 'select'],
        companies: ['Twitter', 'Reddit', 'LinkedIn'],
        statement: `<p>Your <code>GET /posts</code> feed uses <code>OFFSET</code>, and deep pages time out. Switch to <b>keyset (cursor) pagination</b>. Posts are sorted newest first by <code>created_at</code>, with <code>id</code> as a tie-breaker (both descending). The client sends the <code>(created_at, id)</code> of the last post it saw; the first page uses cursor <code>(-1, -1)</code>.</p>
          <p>Write <code>keyset_page(created, ids, cursor_created, cursor_id, limit)</code>: <code>created[i]</code> and <code>ids[i]</code> describe post i (ids are unique). Return the ids of the next page. Implement it as the real SQL query against an in-memory <code>sqlite3</code> table, and also write the SQLAlchemy 2.0 statement you would use in the API.</p>`,
        constraints: `<p>0 ≤ posts ≤ 10<sup>4</sup>, 1 ≤ limit ≤ 100, ids unique and positive.</p>`,
        example: `<p>created = [5, 3, 5, 1, 3], ids = [1, 2, 3, 4, 5]. Sorted (created desc, id desc): (5,3), (5,1), (3,5), (3,2), (1,4).</p>
          <p>First page, limit 2 → ${H.c('g', '[3, 1]')}. The client sends cursor (5, 1) → ${H.c('g', '[5, 2]')}: every row strictly "after" (5,1) in this order, i.e. <code>(created, id) &lt; (5, 1)</code>.</p>`,
        brute: {
          why: `<p>OFFSET pagination asks the database to produce and throw away <code>page × size</code> rows on every request, so cost grows with depth. It also shifts when new posts arrive: a post published between two page loads pushes everything down by one and the reader sees a duplicate.</p>`,
          code: `import sqlite3


def offset_page(created, ids, page, limit):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE posts (id INTEGER PRIMARY KEY, created_at INTEGER)")
    con.executemany("INSERT INTO posts VALUES (?, ?)", list(zip(ids, created)))
    rows = con.execute("SELECT id FROM posts ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
                       (limit, page * limit)).fetchall()
    return [r[0] for r in rows]`
        },
        mcq: {
          q: 'Why does the cursor need <code>id</code> as well as <code>created_at</code>?',
          options: ['Because SQLite requires two columns', 'Because many posts can share a <code>created_at</code>; without a unique tie-breaker rows are skipped or repeated at page edges', 'To make the query use less memory', 'It does not; created_at alone is enough'],
          answer: 1,
          explain: 'The sort key must be unique. Ties on created_at would make "after this row" ambiguous, so the unique id breaks ties.'
        },
        hints: [
          'Hint 1: "the next page" means every row that sorts strictly after the cursor row. With a descending sort, that is <code>(created_at, id) &lt; (cursor_created, cursor_id)</code>.',
          'Hint 2: SQL row values compare left to right, exactly like Python tuples. SQLite and PostgreSQL both support them; SQLAlchemy writes them with <code>tuple_()</code>.',
          'Hint 3: build an in-memory table, index <code>(created_at, id)</code>, run the WHERE only if the cursor is not (-1, -1), ORDER BY both DESC, LIMIT, return the ids. Empty input → empty list.'
        ],
        solution: {
          approach: `<p>The cursor is the sort key of the last row the client saw. Because the sort is <code>(created_at DESC, id DESC)</code>, the next rows are exactly those with a smaller tuple. With an index on <code>(created_at, id)</code> the database seeks to the cursor and reads <code>limit</code> rows: O(log n + limit) no matter how deep you are. The API returns the last row's <code>(created_at, id)</code> (often base64-encoded) as <code>next_cursor</code>. The SQLAlchemy version builds the same statement with <code>tuple_</code>; it imports SQLAlchemy inside the function so this file also runs where only the standard library is installed.</p>`,
          code: `import sqlite3


def keyset_page(created, ids, cursor_created, cursor_id, limit):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE posts (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL)")
    con.execute("CREATE INDEX ix_posts_created_id ON posts (created_at, id)")
    con.executemany("INSERT INTO posts (id, created_at) VALUES (?, ?)", list(zip(ids, created)))
    if cursor_id == -1:                     # first page: no cursor yet
        rows = con.execute(
            "SELECT id FROM posts ORDER BY created_at DESC, id DESC LIMIT ?", (limit,)
        ).fetchall()
    else:                                   # rows strictly after the cursor
        rows = con.execute(
            "SELECT id FROM posts WHERE (created_at, id) < (?, ?) "
            "ORDER BY created_at DESC, id DESC LIMIT ?",
            (cursor_created, cursor_id, limit),
        ).fetchall()
    con.close()
    return [r[0] for r in rows]


def keyset_stmt(cursor, limit):
    """The same query for the API, in SQLAlchemy 2.0 (cursor = (created_at, id) or None)."""
    from sqlalchemy import select, tuple_   # imported here: the pure core above needs only stdlib
    from models import Post

    stmt = select(Post).order_by(Post.created_at.desc(), Post.id.desc()).limit(limit)
    if cursor is not None:
        stmt = stmt.where(tuple_(Post.created_at, Post.id) < cursor)
    return stmt`,
          complexity: `<p>With the composite index: O(log n + limit) per page in the database. The sqlite3 helper here also builds the table, which is O(n log n), only because the test passes the data in.</p>`,
          followUps: ['How do you encode the cursor so clients cannot tamper with it?', 'How do you support "previous page" with keyset pagination?', 'What if the sort column is nullable?']
        },
        tests: { fn: 'keysetPage', sig: 'int[] int[] int int int -> int[]', cases: [
          [[[5, 3, 5, 1, 3], [1, 2, 3, 4, 5], -1, -1, 2], [3, 1]],
          [[[5, 3, 5, 1, 3], [1, 2, 3, 4, 5], 5, 1, 2], [5, 2]],
          [[[5, 3, 5, 1, 3], [1, 2, 3, 4, 5], 3, 2, 2], [4]],
          [[[5, 3, 5, 1, 3], [1, 2, 3, 4, 5], 1, 4, 2], []],
          [[[5, 3, 5, 1, 3], [1, 2, 3, 4, 5], -1, -1, 10], [3, 1, 5, 2, 4]],
          [[[], [], -1, -1, 5], []],
          [[[7, 7, 7], [10, 20, 30], 7, 20, 5], [10]],
          [[[1, 2, 3], [3, 2, 1], 4, 0, 1], [1]]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — N+1 and eager loading
     ===================================================================== */
  topics.push({
    title: 'The N+1 Problem and Eager Loading (selectinload, joinedload, raiseload)',
    analogy: `<p>You are a teacher collecting homework from 30 students. The <b>N+1 way</b>: walk to the office to get the class list (1 trip), then walk to each student's locker one by one (30 trips). That is 31 trips, and most of the time is walking, not reading.</p>
      <p>The <b>selectin way</b>: get the class list (1 trip), then ask the office for "all homework for these 30 students" in one box (1 more trip). Two trips total. The <b>joined way</b>: ask for one big printout that already has each student's homework stapled to their row (1 trip, but the printout repeats each student's name on every page of homework).</p>`,
    explain: `<p>🟢 <b>What N+1 is.</b> Relationships are <b>lazy</b> by default: <code>author.books</code> is loaded the first time you touch it, with its own SELECT. Loop over 50 authors and touch <code>books</code> on each, and you send <b>1</b> query for the authors plus <b>50</b> for their books. Each query is fast alone, but every one is a network round trip (often 0.5–2 ms), so a page with 50 rows quietly costs 100 ms of pure waiting. You met this pattern in the Backend module "Data Access Patterns" and in JPA; SQLAlchemy has the same trap and better tools.</p>
      <p><b>The fix is to say what you need up front</b> with a <b>loader option</b> on the query:</p>
      ${H.table(['Option', 'SQL it sends', 'Best for', 'Watch out'], [
        ['<code>selectinload(Author.books)</code>', '2 queries: parents, then <code>WHERE author_id IN (...)</code>', H.c('g', 'one-to-many and many-to-many collections (the default choice)'), 'very large IN lists are chunked automatically (500 per batch)'],
        ['<code>joinedload(Book.author)</code>', '1 query with <code>LEFT OUTER JOIN</code>', H.c('g', 'many-to-one / one-to-one'), 'on collections it repeats parent columns per child; needs <code>.unique()</code>'],
        ['<code>raiseload("*")</code> or <code>lazy="raise"</code>', 'none: touching an unloaded relationship raises', H.c('g', 'guarding hot endpoints and async code'), 'you must load everything you use'],
        ['<code>contains_eager(Order.customer)</code>', 'reuses a JOIN you wrote yourself', 'when you already join to filter or sort', 'you are responsible for the join being correct'],
        ['default <code>lazy="select"</code>', '1 query per object on first access', 'rarely-used relationships', 'N+1 in loops and serializers']
      ])}
      <p>🔵 <b>Chaining.</b> Options follow paths: <code>selectinload(Customer.orders).selectinload(Order.items).joinedload(OrderItem.product)</code> loads customers → orders → items → products in four queries total, whatever the row counts.</p>
      <p><b>The FastAPI trap.</b> Your endpoint returns ORM objects and the <code>response_model</code> includes nested data (orders with items). Pydantic reads <code>order.items</code> <i>while serialising</i>, after your code ran, so the N+1 happens where you cannot see it. Eager-load exactly what the response model needs, in the same function that runs the query.</p>
      <p><b>How to catch it.</b> Turn on <code>echo=True</code> while developing and watch for the same SELECT repeated with different ids. In tests, count statements with an engine event and assert an upper bound (example 3 below).</p>`,
    clues: [
      '"The list endpoint gets slower as the page grows" / "100 rows = 101 queries" → N+1 lazy loading',
      '"Load orders with their items" → <code>selectinload(Order.items)</code>',
      '"Each order needs its customer name" → <code>joinedload(Order.customer)</code> (many-to-one)',
      '"MissingGreenlet" / "greenlet_spawn has not been called" in async code → an implicit lazy load; eager-load or use <code>awaitable_attrs</code>',
      '"Make sure nobody adds an N+1 later" → <code>raiseload("*")</code> or <code>lazy="raise"</code> plus a query-count test',
      '"Filter by the related table and also load it" → <code>join()</code> + <code>contains_eager()</code>'
    ],
    code: [
      {
        lang: 'python', title: 'From N+1 to a fixed number of queries',
        code: `from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager, joinedload, raiseload, selectinload

from models import Customer, Order, OrderItem


def report_n_plus_one(db: Session) -> None:
    # 1 query for orders ...
    for order in db.scalars(select(Order).limit(50)):
        # ... + 1 per order for the customer, + 1 per order for the items: 101 queries
        print(order.customer.name, len(order.items))


def report_fixed(db: Session) -> None:
    stmt = (
        select(Order)
        .options(
            joinedload(Order.customer),                               # many-to-one: JOIN
            selectinload(Order.items).joinedload(OrderItem.product),  # collection: IN query
            raiseload("*"),                                           # anything else: fail loudly
        )
        .limit(50)
    )
    for order in db.scalars(stmt):      # 2 queries total, for any number of orders
        print(order.customer.name, [i.product.sku for i in order.items])


def paid_orders_in_country(db: Session, country: str) -> list[Order]:
    # We JOIN anyway to filter, so reuse that join to fill order.customer.
    stmt = (
        select(Order)
        .join(Order.customer)
        .where(Customer.country == country, Order.status == "paid")
        .options(contains_eager(Order.customer))
    )
    return list(db.scalars(stmt))


def customers_with_orders_joined(db: Session) -> list[Customer]:
    # joinedload on a COLLECTION repeats each customer once per order,
    # so 2.0 requires .unique() to collapse the duplicates.
    stmt = select(Customer).options(joinedload(Customer.orders))
    return list(db.scalars(stmt).unique())`
      },
      {
        lang: 'python', title: 'Default loading strategy on the relationship itself',
        code: `from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


class Author(Base):
    __tablename__ = "authors"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    # Every query for Author loads books with an IN query unless told otherwise.
    books: Mapped[list["Book"]] = relationship(back_populates="author", lazy="selectin")


class Book(Base):
    __tablename__ = "books"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"), index=True)
    # Accidental lazy loads raise instead of silently querying.
    author: Mapped["Author"] = relationship(back_populates="books", lazy="raise")`
      },
      {
        lang: 'python', run: true, title: 'Runnable: count the queries of N+1 vs IN-batch vs JOIN (sqlite3)',
        code: `import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE books (id INTEGER PRIMARY KEY, author_id INTEGER REFERENCES authors(id), title TEXT);
CREATE INDEX ix_books_author ON books(author_id);
""")
con.executemany("INSERT INTO authors (name) VALUES (?)", [(f"author{i}",) for i in range(1, 51)])
con.executemany("INSERT INTO books (author_id, title) VALUES (?, ?)",
                [(a, f"book{a}-{k}") for a in range(1, 51) for k in range(3)])

sent = []
con.set_trace_callback(sent.append)   # records every statement sqlite runs

def lazy():          # what default lazy loading does
    out = {}
    for aid, name in con.execute("SELECT id, name FROM authors").fetchall():
        out[name] = [t for (t,) in con.execute("SELECT title FROM books WHERE author_id = ?", (aid,))]
    return out

def selectin():      # what selectinload does
    authors = con.execute("SELECT id, name FROM authors").fetchall()
    ids = [a for a, _ in authors]
    marks = ",".join("?" * len(ids))
    books = {}
    for aid, title in con.execute(f"SELECT author_id, title FROM books WHERE author_id IN ({marks})", ids):
        books.setdefault(aid, []).append(title)
    return {name: books.get(aid, []) for aid, name in authors}

def joined():        # what joinedload does
    out = {}
    for name, title in con.execute(
            "SELECT a.name, b.title FROM authors a LEFT JOIN books b ON b.author_id = a.id ORDER BY a.id"):
        out.setdefault(name, [])
        if title is not None:
            out[name].append(title)
    return out

for fn in (lazy, selectin, joined):
    sent.clear()
    result = fn()
    print(f"{fn.__name__:9} -> {len(sent):3} queries, {sum(map(len, result.values()))} books loaded")`
      }
    ],
    codeTitle: ['N+1 vs fixed', 'Default lazy strategy on the relationship', 'Runnable: count the queries (sqlite3)'],
    viz: {
      title: 'Count the round trips: lazy vs selectinload vs joinedload',
      input: 'lazy 5',
      inputLabel: 'Strategy (lazy | selectin | joined | raise) and number of authors (1-8)',
      gen: function (input) {
        var w = String(input || '').trim().toLowerCase().split(/\s+/);
        var strat = w[0], n = parseInt(w[1], 10);
        if (['lazy', 'selectin', 'joined', 'raise'].indexOf(strat) < 0 || isNaN(n) || n < 1) throw new Error('Type e.g. "lazy 5", "selectin 5", "joined 5" or "raise 3"');
        n = Math.min(n, 8);
        var books = [], authors = [];
        for (var a = 1; a <= n; a++) { authors.push([a, 'Author ' + a]); for (var k = 0; k < (a % 3) + 1; k++) books.push([books.length + 1, a, 'B' + a + '.' + (k + 1)]); }
        var log = [], counts = [], frames = [], nodes = [bx('app', 'Python app', 15, 30, 18), bx('db', 'Database', 85, 30, 16)], edges = [['app', 'db']];
        function g(cls) { return { type: 'graph', directed: true, height: 60, label: 'Round trips', nodes: nodes, edges: edges, hl: { db: cls }, ehl: { 'app-db': cls } }; }
        function push(narr, sqlText, rows, cls) {
          if (sqlText) log.push(sqlText);
          counts.push(log.length);
          frames.push({ narr: narr, parts: [g(cls || 'cur'), { type: 'stack', label: 'Statements sent (' + log.length + ')', items: log.slice(-7) }, rows || txt('Result', '<i>none</i>')] });
        }
        if (strat === 'joined') {
          var jrows = [];
          authors.forEach(function (au) { var bs = books.filter(function (b) { return b[1] === au[0]; }); bs.forEach(function (b) { jrows.push([au[0], au[1], b[2]]); }); });
          push('<code>select(Author).options(joinedload(Author.books))</code> sends <b>one</b> query with a LEFT OUTER JOIN.', 'SELECT authors.*, books_1.* FROM authors LEFT OUTER JOIN books AS books_1 ON authors.id = books_1.author_id', tbl('Rows on the wire', ['author.id', 'author.name', 'book'], jrows), 'cur');
          push('Notice the author columns are <b>repeated for every book</b>. With ' + books.length + ' books you transfer ' + jrows.length + ' rows. SQLAlchemy collapses them back into ' + n + ' Author objects, which is why 2.0 asks you to call <code>.unique()</code> on collection joins.', null, tbl('Rows on the wire', ['author.id', 'author.name', 'book'], jrows, (function () { var h = {}; jrows.forEach(function (r, i) { if (i && jrows[i - 1][0] === r[0]) h[i] = 'bad'; }); return h; })()), 'done');
          push('Looping over <code>author.books</code> now sends <b>nothing</b>. Total: <b>1 query</b>. Great for many-to-one; for big collections the duplicated parent data can cost more than a second query.', null, { type: 'bars', label: 'Queries sent', values: [1], texts: ['1'], idxLabels: ['joined'] }, 'ok');
          push('Side by side for ' + n + ' authors: lazy sends ' + (n + 1) + ' queries, selectinload 2, joinedload 1 (but with wider, repeated rows). Rule of thumb: <b>joined for to-one, selectin for to-many</b>.', null, { type: 'bars', label: 'Queries by strategy', values: [n + 1, 2, 1], texts: [String(n + 1), '2', '1'], idxLabels: ['lazy', 'selectin', 'joined'] }, 'done');
          return frames;
        }
        push('<code>select(Author)</code> ' + (strat === 'selectin' ? 'with <code>.options(selectinload(Author.books))</code>' : strat === 'raise' ? 'with <code>.options(raiseload(Author.books))</code>' : 'with default lazy loading') + ' first sends one query for the authors.', 'SELECT authors.id, authors.name FROM authors', tbl('Authors loaded', ['id', 'name'], authors), 'cur');
        if (strat === 'selectin') {
          var ids = authors.map(function (x) { return x[0]; });
          push('Right after, SQLAlchemy collects the ' + n + ' primary keys and sends <b>one</b> more query with <code>IN</code>. It then sorts the books into each author\'s list in memory.', 'SELECT books.* FROM books WHERE books.author_id IN (' + ids.join(', ') + ')', tbl('Books loaded', ['id', 'author_id', 'title'], books), 'cur');
          push('Your loop over <code>author.books</code> sends <b>nothing</b>: every list is already filled. Total: <b>2 queries</b>, and it stays 2 for 5 or 5,000 authors.', null, { type: 'bars', label: 'Queries sent', values: [2], texts: ['2'], idxLabels: ['selectin'] }, 'ok');
          push('Side by side for ' + n + ' authors: lazy sends ' + (n + 1) + ' queries, selectinload 2, joinedload 1. The selectin count never grows with the page size (SQLAlchemy only splits very long IN lists into chunks of 500).', null, { type: 'bars', label: 'Queries by strategy', values: [n + 1, 2, 1], texts: [String(n + 1), '2', '1'], idxLabels: ['lazy', 'selectin', 'joined'] }, 'done');
          return frames;
        }
        if (strat === 'raise') {
          push('The loop touches <code>authors[0].books</code>. Instead of quietly querying, SQLAlchemy raises <code>InvalidRequestError: \'Author.books\' is not available due to lazy=\'raise\'</code>. The bug is found in development, not in production latency graphs.', null, txt('Exception', '<code>sqlalchemy.exc.InvalidRequestError</code>'), 'bad');
          push('Fix: add <code>selectinload(Author.books)</code> to this query. <code>raiseload</code> is a guard rail: it forces every endpoint to declare what it loads.', null, { type: 'bars', label: 'Queries sent before the error', values: [1], texts: ['1'], idxLabels: ['raise'] }, 'ok');
          push('Tip: <code>.options(selectinload(Author.books), raiseload("*"))</code> loads what you asked for and raises on everything else.', null, txt('Pattern', '<code>select(Author).options(selectinload(Author.books), raiseload("*"))</code>'), 'done');
          return frames;
        }
        authors.forEach(function (au) {
          var bs = books.filter(function (b) { return b[1] === au[0]; });
          push('Loop step: touching <code>author.books</code> for <b>' + au[1] + '</b> triggers a <b>lazy load</b>: another round trip. Count so far: ' + (log.length + 1) + '.', 'SELECT books.* FROM books WHERE ' + au[0] + ' = books.author_id', tbl('Books for ' + au[1], ['id', 'author_id', 'title'], bs), 'bad');
        });
        push('Total: <b>1 + ' + n + ' = ' + (n + 1) + ' queries</b>. That is the N+1 problem. Each query was tiny; the cost is the waiting. Try <code>selectin ' + n + '</code> to compare.', null, { type: 'bars', label: 'Queries sent', values: [n + 1], texts: [String(n + 1)], idxLabels: ['lazy'] }, 'bad');
        return frames;
      }
    },
    examples: [
      {
        title: 'An endpoint that returns orders with items',
        html: `<p>The response model is <code>OrderOut</code> with <code>customer_name</code> and a list of <code>items</code>, each with a product SKU. Before: 1 + 50 + 50 + (items) queries for a page of 50. After adding <code>joinedload(Order.customer)</code> and <code>selectinload(Order.items).joinedload(OrderItem.product)</code>: 2 queries. p95 latency dropped from 180 ms to 25 ms in a typical setup where each round trip costs about 1 ms.</p>
          ${H.table(['Version', 'Queries for 50 orders', 'Grows with page size?'], [['lazy', '1 + 50 + 50 + 150', H.c('r', 'yes')], ['eager (joined + selectin + joined)', '2', H.c('g', 'no')]])}`,
        code: { lang: 'python', code: `@router.get("/orders", response_model=list[OrderOut])
def list_orders(db: DbSession, limit: int = 50) -> list[Order]:
    stmt = (
        select(Order)
        .options(joinedload(Order.customer),
                 selectinload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))` }
      },
      {
        title: 'Why joinedload on a big collection can be slower',
        html: `<p>One customer with 10,000 orders: <code>joinedload(Customer.orders)</code> sends 10,000 rows, each carrying all customer columns again (wide rows, more bytes, more parsing). <code>selectinload</code> sends 1 customer row + 10,000 slim order rows. The rule of thumb: <b>joined for "to-one", selectin for "to-many"</b>. Also: <code>joinedload</code> plus <code>LIMIT</code> on the parent query forces SQLAlchemy to wrap the parent query in a subquery so the limit counts parents, not joined rows.</p>`
      },
      {
        title: 'A test that fails when someone adds an N+1',
        html: `<p>Hook the engine's <code>before_cursor_execute</code> event, count statements, and assert a bound. Run the endpoint with 3 rows and with 30 rows: the count must be the same. Teams that adopt this catch N+1 in code review automatically (Python Backend IV covers test fixtures in depth).</p>`,
        code: { lang: 'python', code: `from contextlib import contextmanager

from sqlalchemy import event


@contextmanager
def count_queries(engine):
    counter = {"n": 0}

    def before(conn, cursor, statement, parameters, context, executemany):
        counter["n"] += 1

    event.listen(engine, "before_cursor_execute", before)
    try:
        yield counter
    finally:
        event.remove(engine, "before_cursor_execute", before)


def test_orders_endpoint_has_no_n_plus_one(client, engine, make_orders):
    make_orders(30)
    with count_queries(engine) as c:
        assert client.get("/orders?limit=30").status_code == 200
    assert c["n"] <= 3` }
      }
    ],
    deepDive: `<p>🟣 <b>How selectinload works inside.</b> After the parent rows are loaded, SQLAlchemy takes the primary keys of every parent in this result and runs <code>SELECT ... WHERE child.parent_id IN (...)</code>, in batches of 500 keys. For many-to-one it can even skip the query entirely for objects already in the identity map. Because it is a separate query, it does not change the parent query's row count, LIMIT or ORDER BY, which is why it is the safest default for collections.</p>
      <p><b>joinedload is "eager by JOIN" and anonymous.</b> It aliases the joined table (<code>books_1</code>) so it never interferes with your own joins and filters. That also means you cannot filter on it; if you want to filter on the related table and fill the relationship from the same join, use <code>contains_eager</code>, but then the collection only holds rows that passed your filter (a "filtered collection"), which can surprise the next reader.</p>
      <p><b>Populate existing.</b> Loader options do not overwrite relationships already loaded in the identity map. If an earlier query lazily loaded <code>author.books</code>, a later <code>selectinload</code> will not refresh it unless you add <code>.execution_options(populate_existing=True)</code>.</p>
      <p><b>Write-only and dynamic relationships.</b> For a collection that may hold millions of rows (a user's events), never load it whole. <code>relationship(lazy="write_only")</code> (2.0) gives an object where you <code>add()</code> items and build your own paginated <code>select()</code> from it.</p>
      <p><b>Production reality.</b> N+1 hides in serializers, templates, <code>__repr__</code> methods, logging lines (<code>log.info("order %s", order)</code> that prints a relationship) and admin pages. APM tools (OpenTelemetry SQLAlchemy instrumentation) show it as a "staircase" of identical spans inside one request.</p>`,
    aiEra: `<p>🤖 AI-generated endpoints very often return ORM objects with nested response models and no loader options: the textbook N+1. Make "list every relationship the response model reads, and the loader option that loads it" part of your review prompt. Assistants are good at that analysis when asked directly.</p>
      <p>The opposite mistake also appears: <code>lazy="joined"</code> on every relationship "for performance", which turns every simple query into a five-table join. Prefer per-query options plus <code>raiseload("*")</code> on hot paths, so the code states what it loads. Query-count tests are a perfect guard for AI-assisted teams, because they turn a subtle performance rule into a red test that any author, human or model, must satisfy.</p>`,
    problems: [
      {
        title: 'Fix the N+1 on the authors page',
        level: 'Medium',
        tags: ['N+1', 'selectinload', 'performance'],
        companies: ['GitHub', 'Shopify'],
        statement: `<p>The <code>/authors</code> page shows each author with the number of books. It loads authors and then reads <code>author.books</code> in a loop: 1 + N queries. Rewrite the data access to send a <b>fixed</b> number of queries, the way <code>selectinload</code> does.</p>
          <p>Write <code>author_book_counts(authors, book_author)</code>. <code>authors[i]</code> is the name of the author with id <code>i + 1</code>. <code>book_author[j]</code> is the <b>0-based index</b> of the author of book j. Store the data in an in-memory <code>sqlite3</code> database, then load it and return <code>"Name:count"</code> for each author in id order, followed by <code>"queries=Q"</code>, where Q is the number of SELECT statements your loading code sent (count them with <code>set_trace_callback</code>, after setup). Like <code>selectinload</code>, skip the second query when there are no authors.</p>`,
        constraints: `<p>0 ≤ authors ≤ 1000, 0 ≤ books ≤ 10<sup>4</sup>. Q must not depend on the number of authors.</p>`,
        example: `<p>authors = ["Ann", "Bob", "Cy"], book_author = [0, 0, 2] → ${H.c('g', '["Ann:2", "Bob:0", "Cy:1", "queries=2"]')}. Query 1 loads the authors; query 2 loads all their books with <code>WHERE author_id IN (1, 2, 3)</code>. The lazy version would report <code>queries=4</code>.</p>`,
        brute: {
          why: `<p>The lazy version sends one SELECT for the authors and then one per author. With 1,000 authors that is 1,001 round trips; at 1 ms each the page takes a second even though the database does almost no work.</p>`,
          code: `import sqlite3


def author_book_counts_lazy(authors, book_author):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT)")
    con.execute("CREATE TABLE books (id INTEGER PRIMARY KEY, author_id INTEGER)")
    con.executemany("INSERT INTO authors (name) VALUES (?)", [(a,) for a in authors])
    con.executemany("INSERT INTO books (author_id) VALUES (?)", [(i + 1,) for i in book_author])
    sent = []
    con.set_trace_callback(sent.append)
    out = []
    for aid, name in con.execute("SELECT id, name FROM authors ORDER BY id").fetchall():
        n = len(con.execute("SELECT id FROM books WHERE author_id = ?", (aid,)).fetchall())
        out.append(f"{name}:{n}")
    return out + [f"queries={len(sent)}"]`
        },
        mcq: {
          q: 'Which loader option is the usual default fix for an N+1 over a one-to-many collection?',
          options: ['<code>joinedload</code>', '<code>selectinload</code>', '<code>lazy="dynamic"</code>', '<code>noload</code>'],
          answer: 1,
          explain: 'selectinload sends one extra IN query for all parents, keeps the parent query untouched, and avoids repeating parent columns.'
        },
        hints: [
          'Hint 1: you need the books of <i>all</i> authors at once. One query with <code>WHERE author_id IN (...)</code> brings them back together.',
          'Hint 2: group the child rows in a dict keyed by author id, then walk the authors in id order and look up each list (default empty).',
          'Hint 3: install the trace callback after creating and filling the tables. If the author list is empty, return just <code>["queries=1"]</code>. Build the placeholders as <code>",".join("?" * len(ids))</code>.'
        ],
        solution: {
          approach: `<p>Exactly what <code>selectinload</code> does: query 1 loads the parents; query 2 loads every child of those parents with one <code>IN</code> list; a dict groups children by foreign key in memory. The number of queries is 2 regardless of N (SQLAlchemy chunks the IN list at 500 keys, so it is really ⌈N/500⌉ + 1, still tiny). In the real API this whole function is one line: <code>select(Author).options(selectinload(Author.books))</code>. If you only need the counts, an even better query is a single <code>LEFT JOIN ... GROUP BY</code>, also shown in the follow-ups.</p>`,
          code: `import sqlite3


def author_book_counts(authors, book_author):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")
    con.execute("CREATE TABLE books (id INTEGER PRIMARY KEY, author_id INTEGER NOT NULL)")
    con.execute("CREATE INDEX ix_books_author_id ON books (author_id)")
    con.executemany("INSERT INTO authors (name) VALUES (?)", [(a,) for a in authors])
    con.executemany("INSERT INTO books (author_id) VALUES (?)", [(i + 1,) for i in book_author])

    sent = []
    con.set_trace_callback(sent.append)       # count only the loading queries

    rows = con.execute("SELECT id, name FROM authors ORDER BY id").fetchall()   # query 1
    books_by_author = {}
    if rows:                                   # selectinload skips query 2 when empty
        ids = [aid for aid, _ in rows]
        marks = ",".join("?" * len(ids))
        for (author_id,) in con.execute(        # query 2: every child at once
                f"SELECT author_id FROM books WHERE author_id IN ({marks})", ids):
            books_by_author[author_id] = books_by_author.get(author_id, 0) + 1
    con.set_trace_callback(None)
    con.close()
    return [f"{name}:{books_by_author.get(aid, 0)}" for aid, name in rows] + [f"queries={len(sent)}"]`,
          complexity: `<p>2 round trips instead of N + 1. Database work O(N + B) with the index on <code>author_id</code>; memory O(N + B) for the grouped result.</p>`,
          followUps: ['If the page only shows counts, write it as one query: <code>select(Author.name, func.count(Book.id)).outerjoin(Author.books).group_by(Author.id)</code>.', 'When would <code>joinedload</code> beat <code>selectinload</code> here?']
        },
        tests: { fn: 'authorBookCounts', sig: 'string[] int[] -> string[]', cases: [
          [[['Ann', 'Bob', 'Cy'], [0, 0, 2]], ['Ann:2', 'Bob:0', 'Cy:1', 'queries=2']],
          [[[], []], ['queries=1']],
          [[['A'], []], ['A:0', 'queries=2']],
          [[['A', 'B'], [1, 1, 1, 0]], ['A:1', 'B:3', 'queries=2']],
          [[['a', 'b', 'c', 'd', 'e', 'f'], [5, 4, 3, 2, 1, 0, 0]], ['a:2', 'b:1', 'c:1', 'd:1', 'e:1', 'f:1', 'queries=2']],
          [[['Zed', 'Amy'], [1]], ['Zed:0', 'Amy:1', 'queries=2']]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — Transactions, isolation and locking from Python
     ===================================================================== */
  topics.push({
    title: 'Transactions from Python: begin, savepoints, isolation and locking',
    analogy: `<p>A transaction is a <b>bank teller's tray</b>. The teller puts every slip for your request on the tray: "take 100 from savings", "add 100 to checking". Only when the whole tray is checked does it go into the vault in one move (<b>commit</b>). If one slip is wrong, the whole tray goes back (<b>rollback</b>); you never get "money left savings but never arrived".</p>
      <p>A <b>savepoint</b> is a paper clip inside the tray: "if this little group of slips fails, undo just these and keep the rest". <b>Isolation</b> is how much a teller can see of other tellers' trays that are not in the vault yet. <b>Locking</b> is putting your hand on an account card so nobody else edits it until you are done.</p>`,
    explain: `<p>🟢 <b>The theory</b> (ACID, isolation levels, anomalies) is in the SQL track's transactions module. Here is how you drive it from SQLAlchemy.</p>
      ${H.table(['You want', 'SQLAlchemy 2.0'], [
        ['A block that commits on success, rolls back on error', '<code>with SessionLocal() as s, s.begin(): ...</code>'],
        ['Manual control', '<code>s.commit()</code> / <code>s.rollback()</code> (a session always starts a transaction lazily on first SQL)'],
        ['Undo part of the work, keep the rest', '<code>with s.begin_nested(): ...</code> (a SAVEPOINT)'],
        ['A stricter isolation level for the whole app', '<code>create_engine(url, isolation_level="REPEATABLE READ")</code>'],
        ['Stricter isolation for one transaction', '<code>s.connection(execution_options={"isolation_level": "SERIALIZABLE"})</code> as the first thing in the transaction'],
        ['Lock rows I am about to change', '<code>select(Account).where(...).with_for_update()</code> → <code>SELECT ... FOR UPDATE</code>'],
        ['Detect concurrent edits without locks', 'a version column: <code>__mapper_args__ = {"version_id_col": version}</code>']
      ])}
      <p><b>Rules that keep you out of trouble:</b></p>
      <ol>
        <li><b>One business action = one transaction.</b> "Place order" writes the order, the lines and the stock change together.</li>
        <li><b>Keep transactions short.</b> Never call a payment API, send an email or wait for a user while a transaction is open. Locks are held and a pooled connection is stuck "idle in transaction".</li>
        <li><b>Let the service layer own the boundary.</b> Repositories add and query; the service (or endpoint) decides when to commit. Nested functions that each call <code>commit()</code> break atomicity.</li>
        <li><b>Expect failure and retry the whole unit.</b> Under SERIALIZABLE or with deadlocks, the database aborts one transaction. Catch the error, roll back, and run the whole function again a few times.</li>
      </ol>
      <p>🔵 <b>Lost update, the classic bug.</b> Two requests read stock = 5, both subtract 1 in Python, both write 4. One sale vanished. Three fixes, from simplest: (1) do the math in SQL: <code>update(Product).values(stock=Product.stock - 1).where(Product.stock &gt; 0)</code> and check <code>rowcount</code>; (2) lock: <code>with_for_update()</code> then read and write; (3) optimistic: a version column, and the second writer gets <code>StaleDataError</code> and retries.</p>`,
    clues: [
      '"Transfer money between accounts" / "all or nothing" → one transaction, <code>session.begin()</code>',
      '"Two users bought the last item" / "counter is wrong under load" → lost update: atomic UPDATE, <code>with_for_update()</code> or a version column',
      '"Import 10,000 rows, skip bad ones but keep the good" → a SAVEPOINT per row or batch: <code>begin_nested()</code>',
      '"could not serialize access" / "deadlock detected" → retry the whole transaction; lock rows in a consistent order',
      '"Job queue in Postgres, many workers" → <code>with_for_update(skip_locked=True)</code>',
      '"Too many connections idle in transaction" → transactions held open across slow calls'
    ],
    code: [
      {
        lang: 'python', title: 'Transfer: one transaction, locks taken in a fixed order',
        code: `from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Account


class InsufficientFunds(Exception):
    pass


def transfer(db: Session, src_id: int, dst_id: int, amount_cents: int) -> None:
    if amount_cents <= 0 or src_id == dst_id:
        raise ValueError("bad transfer")
    with db.begin():                                   # commit on success, rollback on error
        # Lock both rows, always in id order, so two opposite transfers cannot deadlock.
        first, second = sorted((src_id, dst_id))
        rows = db.scalars(
            select(Account)
            .where(Account.id.in_((first, second)))
            .order_by(Account.id)
            .with_for_update()                         # SELECT ... FOR UPDATE
        ).all()
        accounts = {a.id: a for a in rows}
        if len(accounts) != 2:
            raise LookupError("account not found")
        src, dst = accounts[src_id], accounts[dst_id]
        if src.balance_cents < amount_cents:
            raise InsufficientFunds(src_id)
        src.balance_cents -= amount_cents
        dst.balance_cents += amount_cents
    # leaving the block flushes both UPDATEs and COMMITs, releasing the locks`
      },
      {
        lang: 'python', title: 'Savepoints, isolation levels, retries, optimistic locking',
        code: `import time

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.orm.exc import StaleDataError

from db import Base
from models import Product, Subscriber


def import_emails(db: Session, emails: list[str]) -> tuple[int, int]:
    """Keep good rows, skip duplicates, all in one outer transaction."""
    ok = skipped = 0
    with db.begin():
        for email in emails:
            try:
                with db.begin_nested():          # SAVEPOINT
                    db.add(Subscriber(email=email))
                    db.flush()                   # make the UNIQUE constraint fire here
                ok += 1
            except IntegrityError:               # only this savepoint is rolled back
                skipped += 1
    return ok, skipped


def sell_one(db: Session, product_id: int) -> bool:
    """Atomic decrement: no read-modify-write race at all."""
    with db.begin():
        result = db.execute(
            update(Product)
            .where(Product.id == product_id, Product.stock > 0)
            .values(stock=Product.stock - 1)
        )
    return result.rowcount == 1


def run_serializable(session_factory, work, attempts: int = 3):
    """Run work(session) under SERIALIZABLE, retrying serialization failures."""
    for attempt in range(1, attempts + 1):
        with session_factory() as db:
            try:
                with db.begin():
                    db.connection(execution_options={"isolation_level": "SERIALIZABLE"})
                    return work(db)
            except OperationalError as exc:      # psycopg raises SerializationFailure (SQLSTATE 40001)
                if getattr(exc.orig, "sqlstate", None) != "40001" or attempt == attempts:
                    raise
            time.sleep(0.05 * 2 ** attempt)      # back off, then run the WHOLE unit again


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    body: Mapped[str]
    version: Mapped[int] = mapped_column(nullable=False)
    # UPDATE ... SET version = version + 1 WHERE id = ? AND version = <old>
    __mapper_args__ = {"version_id_col": version}


def save_edit(db: Session, doc_id: int, new_body: str) -> bool:
    try:
        with db.begin():
            doc = db.get(Document, doc_id)
            doc.body = new_body
        return True
    except StaleDataError:                       # someone else saved first
        return False`
      },
      {
        lang: 'python', run: true, title: 'Runnable: commit, rollback, savepoint and read-committed with sqlite3',
        code: `import os
import sqlite3
import tempfile

path = os.path.join(tempfile.mkdtemp(), "bank.db")
a = sqlite3.connect(path, isolation_level=None)   # we issue BEGIN/COMMIT ourselves
b = sqlite3.connect(path, isolation_level=None)   # a second, independent connection
a.execute("CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL CHECK (balance >= 0))")
a.execute("INSERT INTO accounts VALUES (1, 100), (2, 50)")

def balances(con):
    return [r[0] for r in con.execute("SELECT balance FROM accounts ORDER BY id")]

print("1) a transfer that fails half-way is rolled back completely")
a.execute("BEGIN")
try:
    a.execute("UPDATE accounts SET balance = balance + 500 WHERE id = 2")   # credit first...
    a.execute("UPDATE accounts SET balance = balance - 500 WHERE id = 1")   # ...debit violates CHECK
    a.execute("COMMIT")
except sqlite3.IntegrityError as e:
    a.execute("ROLLBACK")
    print("   error:", e, "-> balances", balances(a))

print("2) uncommitted changes are invisible to other connections")
a.execute("BEGIN")
a.execute("UPDATE accounts SET balance = balance - 30 WHERE id = 1")
print("   inside a:", balances(a), " seen by b:", balances(b))
a.execute("COMMIT")
print("   after commit, b sees:", balances(b))

print("3) a savepoint undoes only part of the work")
a.execute("BEGIN")
a.execute("UPDATE accounts SET balance = balance + 1 WHERE id = 2")
a.execute("SAVEPOINT risky")
a.execute("UPDATE accounts SET balance = 0 WHERE id = 2")
a.execute("ROLLBACK TO SAVEPOINT risky")
a.execute("RELEASE SAVEPOINT risky")
a.execute("COMMIT")
print("   balances:", balances(a))`
      }
    ],
    codeTitle: ['Transfer with ordered row locks', 'Savepoints, isolation, retries, versions', 'Runnable: transactions in sqlite3'],
    viz: {
      title: 'Two requests buy the last items: lost update vs FOR UPDATE vs version column',
      input: 'naive',
      inputLabel: 'Strategy: naive | for_update | version | atomic',
      gen: function (input) {
        var s = String(input || '').trim().toLowerCase();
        if (['naive', 'for_update', 'version', 'atomic'].indexOf(s) < 0) throw new Error('Type naive, for_update, version or atomic');
        var steps = [], stock = 5, ver = 1, frames = [];
        function row(t, a, b, note) { steps.push([t, a, b, note]); }
        function fr(narr, hlRow, cls) {
          var h = {}; if (hlRow !== undefined) h[hlRow] = cls || 'cur';
          frames.push({ narr: narr, parts: [tbl('Timeline (both requests buy 1 unit)', ['time', 'request A', 'request B', 'stock in DB'], steps, h), { type: 'vars', label: 'Database row: products id=7', vals: s === 'version' ? { stock: stock, version: ver } : { stock: stock }, hl: { stock: cls === 'bad' ? 'bad' : cls === 'ok' ? 'ok' : 'cur' } }] });
        }
        fr('Stock is <b>5</b>. Two customers press "buy" at the same moment. Each request opens its own session and transaction (default READ COMMITTED on PostgreSQL).');
        if (s === 'naive') {
          row('t1', 'SELECT stock → 5', '', '5'); fr('A reads stock = 5 into a Python object.', 0);
          row('t2', '', 'SELECT stock → 5', '5'); fr('B also reads 5. Nothing stops it: plain SELECTs take no locks.', 1);
          row('t3', 'p.stock = 4; UPDATE SET stock=4', '', '4 (uncommitted)'); stock = 4; fr('A computes 5 − 1 in <b>Python</b> and writes the literal value 4.', 2);
          row('t4', 'COMMIT', 'p.stock = 4; UPDATE waits for A\'s row lock', '4'); fr('B also computed 5 − 1 = 4. Its UPDATE waits for A\'s row lock...', 3);
          row('t5', '', 'UPDATE SET stock=4; COMMIT', '4'); fr('...then writes <b>4</b> again. Two units sold, stock went down by one. This is the <b>lost update</b>. No error anywhere.', 4, 'bad');
          fr('Fixes: try <code>atomic</code> (math in SQL), <code>for_update</code> (lock first) or <code>version</code> (optimistic check).', undefined, 'bad');
        } else if (s === 'atomic') {
          row('t1', 'UPDATE SET stock = stock − 1 WHERE stock > 0', '', '4 (uncommitted)'); stock = 4; fr('A sends the arithmetic to the database: <code>update(Product).values(stock=Product.stock - 1).where(Product.stock &gt; 0)</code>.', 0);
          row('t2', 'COMMIT', 'same UPDATE: waits for the row lock', '4'); fr('B sends the same statement. It must wait for A\'s row lock.', 1);
          row('t3', '', 're-reads the row (4), sets 3; COMMIT', '3'); stock = 3; fr('After A commits, PostgreSQL re-evaluates B\'s UPDATE against the <b>new</b> row: 4 − 1 = 3. Correct, and no SELECT needed.', 2, 'ok');
          fr('Check <code>result.rowcount</code>: 1 means sold, 0 means sold out (the WHERE stopped it). Simplest fix whenever the change is expressible in SQL.', undefined, 'ok');
        } else if (s === 'for_update') {
          row('t1', 'SELECT ... FOR UPDATE → 5 (row locked)', '', '5'); fr('A uses <code>select(Product).where(...).with_for_update()</code>. It reads 5 <b>and locks the row</b>.', 0);
          row('t2', '', 'SELECT ... FOR UPDATE → waits', '5'); fr('B asks for the same lock and <b>blocks</b>. It cannot even read the row for update until A finishes.', 1);
          row('t3', 'stock = 4; UPDATE; COMMIT (lock released)', '', '4'); stock = 4; fr('A writes 4 and commits, releasing the lock.', 2);
          row('t4', '', 'gets the lock, reads 4; stock = 3; COMMIT', '3'); stock = 3; fr('B wakes up and reads the <b>fresh</b> value 4, writes 3. Correct.', 3, 'ok');
          fr('Cost: B waited. Keep the locked section tiny. For queues, <code>with_for_update(skip_locked=True)</code> lets workers grab different rows instead of waiting.', undefined, 'ok');
        } else {
          row('t1', 'SELECT → stock 5, version 1', '', '5 / v1'); fr('With <code>version_id_col</code>, A loads stock = 5 and version = 1. No locks.', 0);
          row('t2', '', 'SELECT → stock 5, version 1', '5 / v1'); fr('B loads the same: 5, version 1.', 1);
          row('t3', 'UPDATE SET stock=4, version=2 WHERE id=7 AND version=1; COMMIT', '', '4 / v2'); stock = 4; ver = 2; fr('A\'s flush adds <code>AND version = 1</code> to the UPDATE and bumps the version. 1 row matched, commit.', 2);
          row('t4', '', 'UPDATE ... WHERE version=1 → 0 rows → StaleDataError', '4 / v2'); fr('B\'s UPDATE also says <code>WHERE version = 1</code>, but the row is at version 2: <b>0 rows</b> match. SQLAlchemy raises <code>StaleDataError</code> and B rolls back.', 3, 'bad');
          row('t5', '', 'retry: SELECT → 4, v2; UPDATE → 3, v3; COMMIT', '3 / v3'); stock = 3; ver = 3; fr('B retries the whole unit of work with fresh data: 4 → 3. Correct, and nobody ever waited on a lock. Great when conflicts are rare (editing documents, settings).', 4, 'ok');
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Who commits? Service owns the transaction',
        html: `<p>A <code>place_order</code> service calls <code>orders.add()</code>, <code>stock.reserve()</code> and <code>payments.record()</code>. If each repository called <code>commit()</code>, a failure in <code>payments</code> would leave an order and a stock change without a payment. Instead, repositories only <code>add</code>/<code>flush</code>, and the service wraps all three in one <code>with db.begin():</code>.</p>
          ${H.table(['Design', 'Failure in step 3 leaves'], [['Each repository commits', H.c('r', 'order + stock change, no payment')], ['Service owns one transaction', H.c('g', 'nothing: all rolled back')]])}`
      },
      {
        title: 'Never hold a transaction across a network call',
        html: `<p>Bad: open the transaction, insert the order, call the payment provider (2 s on a bad day), then commit. During those 2 seconds the order row and stock rows are locked and a pooled connection is busy. With 20 concurrent checkouts the pool is empty and the API stalls. Better: (1) transaction 1 creates the order as <code>pending</code>; (2) call the provider with no transaction open; (3) transaction 2 marks it <code>paid</code>. Use an idempotency key so a retry of step 2 does not charge twice (Backend "HTTP Deep Dive" covers idempotency keys).</p>`
      },
      {
        title: 'Choosing an isolation level in practice',
        html: `<p>PostgreSQL defaults to <b>READ COMMITTED</b>: each statement sees data committed before it started. That is right for most API work combined with atomic updates or row locks. Use <b>REPEATABLE READ</b> for a report that must see one consistent snapshot across several queries. Use <b>SERIALIZABLE</b> for invariants that span many rows ("at most 3 on-call doctors per shift"), and wrap it in a retry loop because the database will abort conflicting transactions. MySQL InnoDB defaults to REPEATABLE READ; check your database's default before you reason about anomalies.</p>`,
        code: { lang: 'python', code: `import os

from sqlalchemy import create_engine

engine = create_engine(os.environ["DATABASE_URL"])
# a second Engine object sharing the same pool, with a stricter level
reporting_engine = engine.execution_options(isolation_level="REPEATABLE READ")` }
      }
    ],
    deepDive: `<p>🟣 <b>What the session actually sends.</b> On the first statement, the session checks out a connection and the DBAPI driver issues <code>BEGIN</code> implicitly. <code>begin_nested()</code> emits <code>SAVEPOINT sa_savepoint_1</code>; leaving it normally emits <code>RELEASE SAVEPOINT</code>, an exception emits <code>ROLLBACK TO SAVEPOINT</code>. On commit SQLAlchemy flushes, sends <code>COMMIT</code>, and returns the connection to the pool, where a "reset on return" rollback guarantees the next borrower starts clean.</p>
      <p><b>Isolation must be set before the transaction starts.</b> <code>session.connection(execution_options={"isolation_level": ...})</code> works only as the first call in a transaction; once SQL has run on that connection, the level is fixed. Engine-wide levels are applied each time a connection is checked out.</p>
      <p><b>FOR UPDATE variants.</b> <code>with_for_update(nowait=True)</code> fails immediately instead of waiting; <code>skip_locked=True</code> skips rows locked by others (the basis of Postgres job queues); <code>read=True</code> takes a shared lock (<code>FOR SHARE</code>); <code>of=Order</code> limits locking to one table in a join. Row locks are held until the transaction ends, so commit quickly.</p>
      <p><b>Deadlocks.</b> Transaction A locks row 1 then wants row 2; B locks row 2 then wants row 1. The database detects the cycle and aborts one. Prevent it by always locking in the same order (sorted ids), and still retry, because indexes, foreign keys and triggers can take locks you did not write.</p>
      <p><b>Production reality.</b> Watch <code>pg_stat_activity</code> for <code>idle in transaction</code> sessions and set <code>idle_in_transaction_session_timeout</code> and <code>statement_timeout</code> on the role your app uses. A forgotten open transaction holds back VACUUM and bloats tables.</p>`,
    aiEra: `<p>🤖 AI assistants often produce code that "works in the demo" but has a read-modify-write race: load the object, change a counter in Python, commit. Ask "what happens if two requests run this at the same time?" and the assistant will usually spot it; it rarely volunteers it. Also review for <code>commit()</code> calls scattered across helpers, and for network calls inside <code>with db.begin():</code>.</p>
      <p>Assistants are useful for writing retry wrappers and for explaining a specific deadlock from the database log. Give them the log lines and the two code paths. The judgement of which isolation level and which locking strategy fits a business rule is still yours, and it starts with the anomaly table from the SQL track.</p>`,
    problems: [
      {
        title: 'Transfer money atomically',
        level: 'Medium',
        tags: ['transactions', 'rollback', 'constraints'],
        companies: ['Stripe', 'Revolut', 'PayPal'],
        statement: `<p>Implement a money transfer that is <b>all or nothing</b>. Accounts live in a table with <code>CHECK (balance &gt;= 0)</code>. Write <code>transfer(balances, src, dst, amount)</code>: account <code>i</code> has id <code>i</code> and balance <code>balances[i]</code>. Load them into an in-memory <code>sqlite3</code> database, perform the transfer inside one transaction, and return the final balances in id order.</p>
          <p>If the amount is not positive, the accounts are the same, an account does not exist, or the source would go negative, the transaction must roll back and the balances stay unchanged. Also write the SQLAlchemy 2.0 version you would put in the service layer.</p>`,
        constraints: `<p>1 ≤ accounts ≤ 1000. Balances and amounts are integers (cents).</p>`,
        example: `<p>balances = [100, 50], transfer 30 from 0 to 1 → ${H.c('g', '[70, 80]')}. Transfer 60 from 1 to 0 → ${H.c('r', '[100, 50]')}: the debit would make account 1 negative, the CHECK constraint fires, and the credit (if it already ran) is rolled back too.</p>`,
        brute: {
          why: `<p>Running each UPDATE in autocommit mode (or calling commit after each) means a failure between the debit and the credit leaves money destroyed or created. Checking the balance in Python first and then writing two separate statements also races with concurrent transfers.</p>`,
          code: `import sqlite3


def transfer_unsafe(balances, src, dst, amount):
    con = sqlite3.connect(":memory:", isolation_level=None)   # autocommit every statement
    con.execute("CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL CHECK (balance >= 0))")
    con.executemany("INSERT INTO accounts VALUES (?, ?)", list(enumerate(balances)))
    try:
        con.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (amount, dst))  # committed!
        con.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", (amount, src))  # may fail
    except sqlite3.IntegrityError:
        pass                                   # money was created out of thin air
    return [b for (b,) in con.execute("SELECT balance FROM accounts ORDER BY id")]`
        },
        mcq: {
          q: 'The debit succeeded and the credit failed. What guarantees the debit is undone?',
          options: ['Calling the debit last', 'Both statements running inside one transaction that is rolled back on error', 'A CHECK constraint', 'Using an ORM'],
          answer: 1,
          explain: 'Atomicity comes from the transaction boundary. The constraint only detects the problem; the rollback undoes everything in the transaction.'
        },
        hints: [
          'Hint 1: validate cheap things first (amount &gt; 0, src ≠ dst), then put both UPDATEs inside one transaction.',
          'Hint 2: in <code>sqlite3</code>, <code>with con:</code> commits on success and rolls back on any exception. Raise your own exception when an UPDATE matches 0 rows (missing account).',
          'Hint 3: let the database enforce the rule: <code>balance = balance - ?</code> plus <code>CHECK (balance &gt;= 0)</code> raises <code>IntegrityError</code>. Catch errors outside the <code>with</code> block, then read the balances.'
        ],
        solution: {
          approach: `<p>Both statements run in one transaction. Arithmetic happens in SQL (<code>balance = balance - ?</code>), so there is no read-modify-write race, and the CHECK constraint is the final guard against overdrafts. A missing account shows up as <code>rowcount == 0</code>, which we turn into an exception so the context manager rolls back. In SQLAlchemy the same structure is <code>with db.begin():</code> around two Core <code>update()</code> statements (or locked ORM objects, as in the lesson code). The SQLAlchemy function imports inside itself so the stdlib core runs anywhere.</p>`,
          code: `import sqlite3


class TransferError(Exception):
    pass


def transfer(balances, src, dst, amount):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL CHECK (balance >= 0))")
    con.executemany("INSERT INTO accounts (id, balance) VALUES (?, ?)", list(enumerate(balances)))
    con.commit()
    try:
        if amount <= 0 or src == dst:
            raise TransferError("invalid transfer")
        with con:                                   # one transaction: COMMIT or ROLLBACK
            debit = con.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", (amount, src))
            if debit.rowcount != 1:
                raise TransferError("no source account")
            credit = con.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (amount, dst))
            if credit.rowcount != 1:
                raise TransferError("no destination account")
    except (TransferError, sqlite3.IntegrityError):
        pass                                        # rolled back: balances unchanged
    result = [b for (b,) in con.execute("SELECT balance FROM accounts ORDER BY id")]
    con.close()
    return result


def transfer_sqlalchemy(db, src_id, dst_id, amount_cents):
    """Service-layer version with SQLAlchemy 2.0 (db is a Session)."""
    from sqlalchemy import update      # imported here so the stdlib core needs no install
    from models import Account

    if amount_cents <= 0 or src_id == dst_id:
        raise ValueError("invalid transfer")
    with db.begin():
        debit = db.execute(update(Account)
                           .where(Account.id == src_id, Account.balance_cents >= amount_cents)
                           .values(balance_cents=Account.balance_cents - amount_cents))
        if debit.rowcount != 1:
            raise ValueError("insufficient funds or unknown account")
        credit = db.execute(update(Account)
                            .where(Account.id == dst_id)
                            .values(balance_cents=Account.balance_cents + amount_cents))
        if credit.rowcount != 1:
            raise ValueError("unknown destination")   # raising rolls back the debit too`,
          complexity: `<p>Two indexed single-row UPDATEs: O(log n) each, one transaction, one round trip per statement.</p>`,
          followUps: ['How would you make the transfer endpoint idempotent so a retried request does not move money twice?', 'Two transfers in opposite directions run at once with row locks. How do you avoid a deadlock?']
        },
        tests: { fn: 'transfer', sig: 'int[] int int int -> int[]', cases: [
          [[[100, 50], 0, 1, 30], [70, 80]],
          [[[100, 50], 1, 0, 60], [100, 50]],
          [[[10], 0, 0, 5], [10]],
          [[[5, 5, 5], 2, 0, 5], [10, 5, 0]],
          [[[100, 50], 0, 1, 0], [100, 50]],
          [[[100, 50], 0, 5, 10], [100, 50]],
          [[[0, 0], 0, 1, 1], [0, 0]],
          [[[100, 50], 0, 1, -20], [100, 50]]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Alembic migrations
     ===================================================================== */
  topics.push({
    title: 'Alembic Migrations: autogenerate, upgrade, downgrade and safe schema changes',
    analogy: `<p>Alembic is <b>git for your database schema</b>. Each migration file is a commit: "add a phone column", "create the orders table". Each file points to its parent (<code>down_revision</code>), so they form a history chain. The database keeps a sticky note saying which commit it is on (the <code>alembic_version</code> table). <code>alembic upgrade head</code> is "check out the latest commit": Alembic applies every file between the sticky note and the newest one, in order.</p>
      <p>And like with git, two people working in parallel can create two branches. Alembic notices "two heads" and asks you to merge them.</p>`,
    explain: `<p>🟢 <b>Why you need it.</b> Your models change every week. Production has real data that must survive each change. You cannot drop and recreate tables, and <code>Base.metadata.create_all()</code> never alters existing tables. Alembic writes small, reviewed, ordered scripts that move a database from one version to the next, and back.</p>
      ${H.table(['Command', 'What it does'], [
        ['<code>alembic init migrations</code>', 'Creates <code>alembic.ini</code> and a <code>migrations/</code> folder with <code>env.py</code> and <code>versions/</code> (<code>-t async</code> for an async template)'],
        ['<code>alembic revision -m "add phone"</code>', 'New empty migration file you fill in by hand'],
        ['<code>alembic revision --autogenerate -m "add phone"</code>', 'Compares your models (<code>target_metadata</code>) with the live database and drafts the file'],
        ['<code>alembic upgrade head</code>', 'Apply all pending migrations'],
        ['<code>alembic downgrade -1</code>', 'Undo the last migration (run its <code>downgrade()</code>)'],
        ['<code>alembic current</code> / <code>history</code> / <code>heads</code>', 'Where am I? What exists? Is there more than one tip?'],
        ['<code>alembic merge heads -m "merge"</code>', 'Join two branches into one revision'],
        ['<code>alembic upgrade head --sql</code>', '"Offline" mode: print the SQL instead of running it, for a DBA to review']
      ])}
      <p><b>The workflow:</b> change the model → <code>alembic revision --autogenerate -m "..."</code> → <b>read and edit the generated file</b> → run <code>upgrade head</code> locally → test <code>downgrade -1</code> and <code>upgrade head</code> again → commit the file with the code change → CI/CD runs <code>alembic upgrade head</code> before the new app version starts.</p>
      <p>🔵 <b>Autogenerate is a draft, not an oracle.</b> It sees tables, columns, nullability, indexes, unique constraints and foreign keys, and column type changes. It does <b>not</b> understand a <b>rename</b> (it writes drop + add, which deletes the data), changes to server defaults by default, data moves, or anything that is not in your metadata (views, triggers, many PostgreSQL extras). Always review.</p>
      <p><b>Adding a NOT NULL column to a table that already has rows</b> is the classic trap. <code>op.add_column("users", sa.Column("status", sa.String(20), nullable=False))</code> fails because existing rows would be NULL. The safe recipe is <b>expand → backfill → contract</b>: add it nullable (or with a server default), fill existing rows (in batches on big tables), then set <code>nullable=False</code>.</p>`,
    clues: [
      '"How do you change the schema in production?" → versioned migrations with Alembic, reviewed, run by CI/CD',
      '"Add a required column to a table with millions of rows" → expand, backfill in batches, contract',
      '"Rename a column without downtime" → add new, dual-write, backfill, switch reads, drop old (never a bare rename while old code runs)',
      '"Multiple head revisions are present" → two branches; <code>alembic merge heads</code>',
      '"Autogenerate wants to drop my column" → it did not detect a rename; edit the file to <code>op.alter_column(..., new_column_name=...)</code>',
      '"Create an index on a busy table" → <code>postgresql_concurrently=True</code> inside <code>autocommit_block()</code>'
    ],
    code: [
      {
        lang: 'bash', title: 'Day-to-day Alembic commands',
        code: `# one time, in the project root
alembic init migrations

# after editing models.py
alembic revision --autogenerate -m "add phone to users"
# review migrations/versions/<rev>_add_phone_to_users.py, then
alembic upgrade head
alembic current          # shows the revision the database is on
alembic downgrade -1     # prove the downgrade works
alembic upgrade head

# two developers merged branches that both added a migration
alembic heads
alembic merge heads -m "merge user and billing branches"

# print SQL for review instead of executing it
alembic upgrade head --sql > upgrade.sql`
      },
      {
        lang: 'python', title: 'migrations/env.py — the parts you change',
        code: `# migrations/env.py (generated by "alembic init", trimmed to the important parts)
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

import app.models  # noqa: F401  (import every model module so metadata is complete)
from app.db import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Never store the URL in alembic.ini: read it from the environment.
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

target_metadata = Base.metadata   # what autogenerate compares against


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,          # a one-off process: no pool needed
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()`
      },
      {
        lang: 'python', title: 'A migration file: schema change + data migration + downgrade',
        code: `"""add phone and status to users

Revision ID: 7c1e2a9b4d10
Revises: 3f5d8a0c6e21
Create Date: 2026-03-02 10:15:00
"""
from alembic import op
import sqlalchemy as sa

revision = "7c1e2a9b4d10"
down_revision = "3f5d8a0c6e21"
branch_labels = None
depends_on = None

# A lightweight table description for the data step. Do NOT import app models
# in migrations: models change later, this file must keep working forever.
users = sa.table(
    "users",
    sa.column("id", sa.Integer),
    sa.column("status", sa.String),
    sa.column("is_active", sa.Boolean),
)


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(20), nullable=True))

    # expand: nullable first, so existing rows are valid
    op.add_column("users", sa.Column("status", sa.String(20), nullable=True))
    # backfill (fine in one statement for a small table)
    op.execute(
        users.update().values(
            status=sa.case((users.c.is_active.is_(True), "active"), else_="inactive")
        )
    )
    # contract: now every row has a value
    op.alter_column("users", "status", existing_type=sa.String(20),
                    nullable=False, server_default="active")
    op.create_index("ix_users_status", "users", ["status"])


def downgrade() -> None:
    op.drop_index("ix_users_status", table_name="users")
    op.drop_column("users", "status")
    op.drop_column("users", "phone")`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a 40-line migration runner (the idea behind Alembic)',
        code: `# Alembic's core idea with sqlite3: ordered revisions, a version table,
# upgrade to head and downgrade one step.
import sqlite3

REVISIONS = [  # (revision, down_revision, upgrade SQL list, downgrade SQL list)
    ("a1", None, ["CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL)"],
                 ["DROP TABLE users"]),
    ("b2", "a1", ["ALTER TABLE users ADD COLUMN phone TEXT"],
                 ["ALTER TABLE users DROP COLUMN phone"]),
    ("c3", "b2", ["ALTER TABLE users ADD COLUMN status TEXT",
                  "UPDATE users SET status = 'active' WHERE status IS NULL"],
                 ["ALTER TABLE users DROP COLUMN status"]),
]

con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE alembic_version (version_num TEXT NOT NULL)")

def current():
    row = con.execute("SELECT version_num FROM alembic_version").fetchone()
    return row[0] if row else None

def set_version(rev):
    con.execute("DELETE FROM alembic_version")
    if rev:
        con.execute("INSERT INTO alembic_version VALUES (?)", (rev,))

def upgrade_head():
    order = [r[0] for r in REVISIONS]
    start = order.index(current()) + 1 if current() else 0
    for rev, _, up, _ in REVISIONS[start:]:
        with con:                               # each revision in its own transaction
            for sql in up:
                con.execute(sql)
            set_version(rev)
        print("upgraded to", rev)

def downgrade_one():
    for rev, down, _, dn in REVISIONS:
        if rev == current():
            with con:
                for sql in dn:
                    con.execute(sql)
                set_version(down)
            print("downgraded", rev, "->", down)
            return

def columns():
    return [r[1] for r in con.execute("PRAGMA table_info(users)")]

upgrade_head()
print("current:", current(), "columns:", columns())
downgrade_one()
print("current:", current(), "columns:", columns())
upgrade_head()
print("current:", current(), "columns:", columns())`
      }
    ],
    codeTitle: ['Commands', 'env.py', 'A migration file', 'Runnable: a tiny migration runner'],
    viz: {
      title: 'The revision chain and the alembic_version pointer',
      input: 'upgrade head; downgrade -1; downgrade -1; upgrade +1; upgrade head; current',
      inputLabel: 'Commands separated by ";" (upgrade head | upgrade +N | downgrade -N | downgrade base | current)',
      gen: function (input) {
        var cmds = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 10);
        if (!cmds.length) throw new Error('Type commands like: upgrade head; downgrade -1');
        var revs = [
          { id: 'base', msg: '(empty database)', cols: [] },
          { id: 'a1', msg: 'create users', cols: ['id', 'email'] },
          { id: 'b2', msg: 'add phone', cols: ['id', 'email', 'phone'] },
          { id: 'c3', msg: 'add status (nullable) + backfill', cols: ['id', 'email', 'phone', 'status NULL'] },
          { id: 'd4', msg: 'status NOT NULL', cols: ['id', 'email', 'phone', 'status NOT NULL'] }
        ];
        var pos = 0, frames = [];
        var nodes = revs.map(function (r, i) { return bx(r.id, r.id + ': ' + r.msg, 10 + i * 20, i % 2 ? 40 : 20, 18); });
        var edges = []; for (var i = 1; i < revs.length; i++) edges.push([revs[i - 1].id, revs[i].id]);
        function snap(narr, ran, cls) {
          var hl = {}; hl[revs[pos].id] = 'sel';
          var ehl = {}; (ran || []).forEach(function (e) { ehl[e] = cls || 'ok'; });
          frames.push({ narr: narr, parts: [
            { type: 'graph', directed: true, height: 60, label: 'Revision chain (down_revision → revision)', nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: (function () { var t = {}; t[revs[pos].id] = 'alembic_version'; t[revs[revs.length - 1].id] = (t[revs[revs.length - 1].id] ? t[revs[revs.length - 1].id] + ' = ' : '') + 'head'; return t; })() },
            tbl('users table now', ['column'], revs[pos].cols.map(function (c) { return [c]; })),
            { type: 'vars', label: 'alembic_version', vals: { version_num: pos ? revs[pos].id : '(no row)' }, hl: { version_num: 'cur' } }
          ] });
        }
        snap('A fresh database: no <code>alembic_version</code> row yet, so Alembic considers it at <b>base</b>. The newest revision file is the <b>head</b>.', []);
        cmds.forEach(function (c) {
          var w = c.toLowerCase().split(/\s+/), ran = [];
          if (w[0] === 'current') { snap('<code>alembic current</code> reads the single row in <code>alembic_version</code>: <b>' + (pos ? revs[pos].id : 'base') + '</b>' + (pos === revs.length - 1 ? ' (head)' : '') + '. It runs no migrations.', []); return; }
          var target = pos;
          if (w[0] === 'upgrade') target = w[1] === 'head' ? revs.length - 1 : /^\+\d+$/.test(w[1] || '') ? pos + parseInt(w[1].slice(1), 10) : -9;
          else if (w[0] === 'downgrade') target = w[1] === 'base' ? 0 : /^-\d+$/.test(w[1] || '') ? pos - parseInt(w[1].slice(1), 10) : -9;
          else target = -9;
          if (target === -9) { snap('Did not understand <code>' + hesc(c) + '</code>. Try upgrade head, upgrade +1, downgrade -1, downgrade base, current.', []); return; }
          if (target > revs.length - 1 || target < 0) { snap('<code>alembic ' + hesc(c) + '</code> fails: there is no revision that far ' + (target < 0 ? 'back' : 'ahead') + '. Nothing changed.', [], 'bad'); return; }
          if (target === pos) { snap('<code>alembic ' + hesc(c) + '</code>: already there, nothing to run.', []); return; }
          var up = target > pos, steps = [];
          if (up) { for (var k = pos + 1; k <= target; k++) { steps.push(revs[k].id + '.upgrade()'); ran.push(revs[k - 1].id + '-' + revs[k].id); } }
          else { for (var k2 = pos; k2 > target; k2--) { steps.push(revs[k2].id + '.downgrade()'); ran.push(revs[k2 - 1].id + '-' + revs[k2].id); } }
          pos = target;
          snap('<code>alembic ' + hesc(c) + '</code> runs ' + steps.map(function (s) { return '<code>' + s + '</code>'; }).join(' → ') + ' in order, then updates <code>alembic_version</code> to <b>' + (pos ? revs[pos].id : 'base (row deleted)') + '</b>. ' + (up ? 'On PostgreSQL DDL is transactional, so a failing step rolls back cleanly.' : 'Downgrades run newest first. A downgrade that drops a column <b>loses its data</b>; that is why production usually rolls forward instead.'), ran, up ? 'ok' : 'bad');
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Autogenerate thinks your rename is a drop',
        html: `<p>You rename <code>User.fullname</code> to <code>User.display_name</code> and run autogenerate. The file says <code>op.add_column("users", sa.Column("display_name", ...))</code> and <code>op.drop_column("users", "fullname")</code>. Applied as-is, every name is gone. Edit it to a real rename, and remember that old app instances still running during a deploy will query <code>fullname</code> (see the expand/contract example).</p>`,
        code: { lang: 'python', code: `from alembic import op


def upgrade() -> None:
    op.alter_column("users", "fullname", new_column_name="display_name")


def downgrade() -> None:
    op.alter_column("users", "display_name", new_column_name="fullname")` }
      },
      {
        title: 'Zero-downtime rename with expand and contract',
        html: `<p>During a rolling deploy, old and new app versions run <b>at the same time</b> against the same database. Every migration must work with both. So a rename becomes several small, backward-compatible releases:</p>
          ${H.table(['Release', 'Migration', 'App code'], [['1 expand', 'add <code>display_name</code> (nullable)', 'write both columns, read old'], ['2 backfill', 'copy <code>fullname</code> → <code>display_name</code> in batches', 'write both, read old'], ['3 switch', 'set <code>display_name</code> NOT NULL', 'write both, <b>read new</b>'], ['4 contract', 'drop <code>fullname</code>', 'only new']])}
          <p>Each step can be rolled back by deploying the previous app version, because the schema still supports it.</p>`
      },
      {
        title: 'Create an index on a busy table without blocking writes',
        html: `<p>A plain <code>CREATE INDEX</code> on PostgreSQL blocks writes to the table until it finishes, which can be minutes on a big table. <code>CREATE INDEX CONCURRENTLY</code> does not, but it cannot run inside a transaction, and Alembic runs each migration in one. <code>autocommit_block()</code> steps outside it for that statement.</p>`,
        code: { lang: 'python', code: `from alembic import op


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.create_index("ix_orders_customer_created", "orders",
                        ["customer_id", "created_at"], postgresql_concurrently=True)


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index("ix_orders_customer_created", table_name="orders",
                      postgresql_concurrently=True)` }
      }
    ],
    deepDive: `<p>🟣 <b>How Alembic finds the order.</b> Each file has <code>revision</code> and <code>down_revision</code> (a tuple for merge revisions). Alembic loads every file in <code>versions/</code>, builds a directed graph, and walks from the version stored in <code>alembic_version</code> to the target. File names do not matter; the ids do. A <b>head</b> is a revision nobody points to as its parent. Two heads means two branches; <code>upgrade head</code> refuses (use <code>heads</code> or merge first). A merge revision has <code>down_revision = ("a1b2", "c3d4")</code> and usually empty <code>upgrade()</code>.</p>
      <p><b>Transactional DDL.</b> PostgreSQL can roll back <code>CREATE TABLE</code> and <code>ALTER TABLE</code>, so a failed migration leaves no half-applied changes. MySQL commits DDL implicitly, so a failure half-way leaves the schema in between versions; keep MySQL migrations to one DDL statement each. SQLite cannot alter most columns in place; Alembic's <code>op.batch_alter_table()</code> recreates the table behind the scenes ("move and copy").</p>
      <p><b>Locks.</b> On PostgreSQL, <code>ALTER TABLE</code> takes an <code>ACCESS EXCLUSIVE</code> lock. Even a fast change waits behind long-running queries and then blocks everything queued behind it. Set <code>SET lock_timeout = '5s'</code> at the start of migrations so they fail fast instead of freezing the site. Since PostgreSQL 11, <code>ADD COLUMN ... DEFAULT &lt;constant&gt;</code> does not rewrite the table; setting <code>NOT NULL</code> later still scans it (adding a <code>CHECK (col IS NOT NULL) NOT VALID</code> constraint and validating it separately avoids the long lock).</p>
      <p><b>Running migrations.</b> Run <code>alembic upgrade head</code> as a separate deploy step (a CI job or a Kubernetes Job / init container), not inside every app replica's startup, where ten replicas would race. Test migrations in CI against a real database copy: upgrade from an empty DB to head, and downgrade-then-upgrade the latest revision.</p>`,
    aiEra: `<p>🤖 Assistants write migration files well when you show them the before and after models and say the table size and database. Ask explicitly for "expand/contract steps safe for a rolling deploy on PostgreSQL with 50M rows" and you get batching, <code>lock_timeout</code> and concurrent indexes. Without that context they produce the naive single-step version.</p>
      <p>Never let an agent run <code>alembic downgrade</code> or hand-edit <code>alembic_version</code> against a shared or production database. Review generated migrations like you review code: a <code>drop_column</code> in a diff is a red flag that needs a human "yes". Autogenerate plus AI review plus human approval is a good pipeline; any one alone is not.</p>`,
    problems: [
      {
        title: 'Add a required column to a table that already has data',
        level: 'Hard',
        tags: ['alembic', 'migrations', 'zero downtime'],
        companies: ['GitLab', 'Stripe', 'Shopify'],
        statement: `<p>The <code>orders</code> table has 40 million rows. Product wants a required <code>currency</code> column (3 letters). Existing orders are all in <code>"EUR"</code>; new orders must always set it. The app runs 6 replicas with rolling deploys, and the database is PostgreSQL 16.</p>
          <p>Write the Alembic migration(s). The site must stay up, the table must never be locked for more than a moment, and every step must be reversible.</p>`,
        constraints: `<p>PostgreSQL 16, rolling deploys, old and new app versions run at the same time for a few minutes.</p>`,
        example: `<p>Naive: <code>op.add_column("orders", sa.Column("currency", sa.String(3), nullable=False))</code> → ${H.c('r', 'ERROR: column "currency" contains null values')}. Even with a default, one giant <code>UPDATE</code> of 40M rows holds row locks for minutes and bloats the table.</p>`,
        brute: {
          why: `<p>A single <code>NOT NULL</code> add fails on existing rows. Adding it and running one huge UPDATE in the same migration holds locks on every row for the whole update, creates 40M dead tuples at once, and, inside Alembic's transaction, cannot be committed in pieces.</p>`,
          code: `from alembic import op
import sqlalchemy as sa

revision = "e1"
down_revision = "d0"


def upgrade() -> None:
    op.add_column("orders", sa.Column("currency", sa.String(3), nullable=True))
    op.execute("UPDATE orders SET currency = 'EUR'")                  # 40M rows, one lock-holding statement
    op.alter_column("orders", "currency", nullable=False)


def downgrade() -> None:
    op.drop_column("orders", "currency")`
        },
        mcq: {
          q: 'On PostgreSQL 11+, what is special about <code>ADD COLUMN currency varchar(3) DEFAULT \'EUR\'</code>?',
          options: ['It rewrites the whole table', 'It is a fast metadata-only change: existing rows read the default without a rewrite', 'It is not allowed', 'It makes the column NOT NULL automatically'],
          answer: 1,
          explain: 'Since PostgreSQL 11 a constant default is stored in the catalog and returned for old rows, so no table rewrite is needed.'
        },
        hints: [
          'Hint 1: split it into expand (add nullable column with a server default so new rows get a value), backfill, contract (set NOT NULL). Old app code that does not know the column still works because of the default.',
          'Hint 2: backfill in batches by primary-key range, committing each batch, so locks are short. In Alembic, run the batches inside <code>op.get_context().autocommit_block()</code> or as a separate script.',
          'Hint 3: to set NOT NULL without a long exclusive lock: add <code>CHECK (currency IS NOT NULL) NOT VALID</code>, then <code>VALIDATE CONSTRAINT</code> (weaker lock), then <code>SET NOT NULL</code> (PostgreSQL 12+ uses the valid check and skips the scan), then drop the check.'
        ],
        solution: {
          approach: `<p><b>Revision 1 (expand + backfill)</b>: add <code>currency</code> as nullable with <code>server_default='EUR'</code>. On PostgreSQL 11+ this is metadata-only, and every new row, even from old app versions, gets EUR. Existing rows already <i>read</i> as EUR through the stored default, but to be explicit and future-proof the backfill updates any NULLs in batches of 10,000 ids, each committed separately via <code>autocommit_block()</code> with a short <code>lock_timeout</code>. <b>Deploy</b> the app version that always sets currency. <b>Revision 2 (contract)</b>: add a <code>NOT VALID</code> check constraint, validate it (takes only a SHARE UPDATE EXCLUSIVE lock, so reads and writes continue), then <code>SET NOT NULL</code>, which PostgreSQL 12+ proves from the validated check without a full scan, then drop the helper check. Both downgrades are cheap. The two revisions ship in separate releases so the old code path never meets a NOT NULL it does not satisfy.</p>`,
          code: `"""orders.currency, step 1: expand and backfill

Revision ID: 5a0c3e7f9b21
Revises: 4d2b1a6c8e10
"""
from alembic import op
import sqlalchemy as sa

revision = "5a0c3e7f9b21"
down_revision = "4d2b1a6c8e10"
branch_labels = None
depends_on = None

BATCH = 10_000


def upgrade() -> None:
    op.execute("SET lock_timeout = '5s'")                 # fail fast instead of queueing everyone
    # PostgreSQL 11+: constant default = metadata-only, no table rewrite
    op.add_column("orders", sa.Column("currency", sa.String(3), nullable=True,
                                      server_default="EUR"))

    # Backfill outside the migration transaction, one short transaction per batch.
    with op.get_context().autocommit_block():
        bind = op.get_bind()
        max_id = bind.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM orders")).scalar_one()
        for start in range(0, max_id + 1, BATCH):
            bind.execute(
                sa.text("UPDATE orders SET currency = 'EUR' "
                        "WHERE id >= :lo AND id < :hi AND currency IS NULL"),
                {"lo": start, "hi": start + BATCH},
            )


def downgrade() -> None:
    op.drop_column("orders", "currency")`,
          alt: [
            { lang: 'python', title: 'Revision 2 — contract (next release)', code: `"""orders.currency, step 2: contract to NOT NULL

Revision ID: 6b1d4f8a0c32
Revises: 5a0c3e7f9b21
"""
from alembic import op

revision = "6b1d4f8a0c32"
down_revision = "5a0c3e7f9b21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("SET lock_timeout = '5s'")
    # NOT VALID: instant, only new writes are checked
    op.execute("ALTER TABLE orders ADD CONSTRAINT ck_orders_currency_nn "
               "CHECK (currency IS NOT NULL) NOT VALID")
    # scans the table but allows reads and writes meanwhile
    op.execute("ALTER TABLE orders VALIDATE CONSTRAINT ck_orders_currency_nn")
    # PostgreSQL 12+ uses the validated check, so no second scan under a heavy lock
    op.alter_column("orders", "currency", nullable=False)
    op.drop_constraint("ck_orders_currency_nn", "orders", type_="check")


def downgrade() -> None:
    op.alter_column("orders", "currency", nullable=True)` }
          ],
          complexity: `<p>Expand and contract are near-instant DDL. The backfill is O(n) row writes spread over ⌈n / 10,000⌉ short transactions; the validation scan is O(n) but does not block writes.</p>`,
          followUps: ['How would you run the backfill as a background job instead, and how does the contract migration know it finished?', 'What changes on MySQL 8, where DDL is not transactional?']
        },
        tests: { skip: 'ORM wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Connection pooling
     ===================================================================== */
  topics.push({
    title: 'Connection Pooling: QueuePool, sizing, timeouts and PgBouncer',
    analogy: `<p>A connection pool is the <b>rack of shopping carts</b> outside a supermarket. Building a new cart for every shopper (opening a TCP connection, TLS handshake, login) would take ages, so the store keeps a fixed rack. You take a cart, shop, and put it back. If all carts are out, a few <b>overflow</b> carts can be brought from the back. If even those are gone, you <b>wait</b> at the door, and after 30 seconds you give up and go home (a <b>pool timeout</b>).</p>
      <p>And the car park has a limit too: the database only accepts so many connections in total, shared by every store (app process) in town.</p>`,
    explain: `<p>🟢 <b>Why pool?</b> Opening a PostgreSQL connection costs a network round trip or three, TLS, authentication and a new server process: often 5–50 ms. A query often takes 1 ms. Reusing open connections removes that cost from every request. The <code>Engine</code> owns the pool; sessions borrow a connection on first SQL and give it back at commit, rollback or close.</p>
      ${H.table(['Setting (create_engine)', 'Default', 'Meaning'], [
        ['<code>pool_size</code>', '5', 'connections kept open and reused'],
        ['<code>max_overflow</code>', '10', 'extra connections allowed under bursts, closed again when returned'],
        ['<code>pool_timeout</code>', '30 s', 'how long a checkout waits before raising <code>TimeoutError</code>'],
        ['<code>pool_recycle</code>', '-1 (never)', 'replace connections older than N seconds (beat firewalls and server idle timeouts)'],
        ['<code>pool_pre_ping</code>', 'False', 'run a tiny ping on checkout and transparently replace dead connections'],
        ['<code>poolclass=NullPool</code>', '-', 'no pooling: open and close per checkout (scripts, serverless, external poolers)']
      ])}
      <p><b>The one formula to remember.</b> Every process has its <b>own</b> pool. The worst case your app can open is:</p>
      <p style="text-align:center"><b>instances × processes per instance × (pool_size + max_overflow)</b> ≤ database <code>max_connections</code> − reserved</p>
      <p>Example: 3 pods × 4 Uvicorn/Gunicorn workers × (5 + 10) = <b>180</b> connections, but PostgreSQL's default <code>max_connections</code> is <b>100</b>. Under a traffic spike the database refuses new connections ("too many clients") and the whole API fails, not just the slow part.</p>
      <p>🔵 <b>Bigger is not faster.</b> A database with 8 CPU cores can only run about 8–16 queries truly at once. Hundreds of active connections just queue inside the database, add memory per connection (PostgreSQL uses a process each) and make lock contention worse. Small pools and short transactions beat big pools.</p>
      <p><b>The classic error</b>: <code>QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00</code>. It almost always means connections are not returned (a session never closed, a transaction left open while calling another service, or a background task holding a session), not that the pool is too small.</p>`,
    clues: [
      '"QueuePool limit ... reached, connection timed out" → leaked sessions or long transactions; check that every session is closed',
      '"FATAL: sorry, too many clients already" → total pools across all processes exceed <code>max_connections</code>',
      '"server closed the connection unexpectedly" after idle periods → <code>pool_pre_ping=True</code> and/or <code>pool_recycle</code>',
      '"Lambda / serverless functions exhaust the database" → <code>NullPool</code> + an external pooler (PgBouncer, RDS Proxy)',
      '"Behind PgBouncer in transaction mode" → no session-level state, disable prepared-statement caches for asyncpg',
      '"Gunicorn with preload" → create the engine after fork, or <code>engine.dispose(close=False)</code> in each worker'
    ],
    code: [
      {
        lang: 'python', title: 'Configuring the pool for a web app',
        code: `import os

from sqlalchemy import create_engine, event

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(
    DATABASE_URL,
    pool_size=5,           # steady-state connections per process
    max_overflow=5,        # burst capacity per process
    pool_timeout=10,       # fail a request after 10 s instead of hanging for 30
    pool_recycle=1800,     # replace connections older than 30 min
    pool_pre_ping=True,    # detect connections killed by the server or a firewall
    connect_args={
        "connect_timeout": 5,                                      # psycopg: TCP connect limit
        "options": "-c statement_timeout=15000 -c lock_timeout=5000",  # per-connection safety nets
    },
)


@event.listens_for(engine, "checkout")
def on_checkout(dbapi_conn, conn_record, conn_proxy):
    # A hook for metrics: count checkouts, track how long connections are held, etc.
    conn_record.info.setdefault("checkouts", 0)
    conn_record.info["checkouts"] += 1


def pool_report() -> str:
    # e.g. "Pool size: 5  Connections in pool: 3 Current Overflow: 0 Current Checked out connections: 2"
    return engine.pool.status()`
      },
      {
        lang: 'python', title: 'Scripts, serverless and external poolers',
        code: `import os

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

# A cron script or AWS Lambda: no long-lived pool; let PgBouncer / RDS Proxy pool for you.
script_engine = create_engine(os.environ["DATABASE_URL"], poolclass=NullPool)

# asyncpg behind PgBouncer in *transaction* mode: server connections are shared
# between clients, so per-connection prepared statements must be off.
async_engine = create_async_engine(
    os.environ["ASYNC_DATABASE_URL"],          # e.g. postgresql+asyncpg://app:<password>@pgbouncer:6432/shop
    poolclass=NullPool,
    connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
)


# Gunicorn with --preload forks workers after the app (and engine) was created.
# Each worker must start with its own fresh pool, never share parent sockets.
def post_fork(server, worker):
    from app.db import engine
    engine.dispose(close=False)   # drop inherited connections without closing the parent's`
      },
      {
        lang: 'python', run: true, title: 'Runnable: simulate a pool under a burst (deterministic, stdlib only)',
        code: `# Discrete-event simulation of QueuePool: who gets a connection, who waits, who times out.
import heapq

def simulate(pool_size, max_overflow, timeout, requests):
    """requests: list of (arrival_ms, hold_ms). Returns a list of outcome strings."""
    free = pool_size          # idle pooled connections
    overflow = 0              # extra connections currently open
    releases = []             # heap of (release_time, is_overflow)
    waiting = []              # FIFO of (arrival, hold, index)
    out = [None] * len(requests)

    def release_until(t):
        nonlocal free, overflow
        while releases and releases[0][0] <= t:
            rt, is_over = heapq.heappop(releases)
            if waiting:                                  # hand the connection to the next waiter
                arr, hold, i = waiting.pop(0)
                if rt - arr > timeout:
                    out[i] = f"req{i}: TIMEOUT after {timeout} ms"
                    heapq.heappush(releases, (rt, is_over))
                    continue
                out[i] = f"req{i}: waited {rt - arr} ms"
                heapq.heappush(releases, (rt + hold, is_over))
            elif is_over:
                overflow -= 1                            # overflow connections are closed
            else:
                free += 1                                # pooled ones go back to the rack

    for i, (arr, hold) in enumerate(requests):
        release_until(arr)
        if free:
            free -= 1
            out[i] = f"req{i}: pooled connection"
            heapq.heappush(releases, (arr + hold, False))
        elif overflow < max_overflow:
            overflow += 1
            out[i] = f"req{i}: NEW overflow connection"
            heapq.heappush(releases, (arr + hold, True))
        else:
            waiting.append((arr, hold, i))
    release_until(float("inf"))
    for arr, hold, i in waiting:
        out[i] = f"req{i}: TIMEOUT after {timeout} ms"
    return out

burst = [(0, 40), (1, 300), (2, 300), (3, 40), (4, 40), (5, 40), (6, 40)]
print("pool_size=2, max_overflow=1, timeout=100 ms")
for line in simulate(2, 1, 100, burst):
    print(" ", line)`
      }
    ],
    codeTitle: ['Pool settings for a web app', 'NullPool, PgBouncer, Gunicorn fork', 'Runnable: pool simulation'],
    viz: {
      title: 'Checkouts, overflow, waiting and timeouts in a QueuePool',
      input: 'pool=2 overflow=1 requests=6 hold=3 timeout=2',
      inputLabel: 'pool, overflow, requests (all arrive at t=0..n-1), hold (ticks each request keeps its connection), timeout (ticks)',
      gen: function (input) {
        var cfg = { pool: 2, overflow: 1, requests: 6, hold: 3, timeout: 2 };
        String(input || '').split(/\s+/).forEach(function (kv) { var p = kv.split('='); if (p.length === 2 && cfg.hasOwnProperty(p[0]) && /^\d+$/.test(p[1])) cfg[p[0]] = +p[1]; });
        if (cfg.pool < 1 || cfg.pool > 6 || cfg.overflow > 4 || cfg.requests < 1 || cfg.requests > 10 || cfg.hold < 1 || cfg.hold > 8) throw new Error('Use small numbers: pool 1-6, overflow 0-4, requests 1-10, hold 1-8');
        var slots = [], i, frames = [], waiting = [], log = [], done = 0, t = 0;
        for (i = 0; i < cfg.pool; i++) slots.push({ kind: 'pool', who: null, until: 0 });
        function view(narr, hl) {
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'Connections (P = pooled, O = overflow)', values: slots.map(function (s) { return (s.kind === 'pool' ? 'P' : 'O') + ':' + (s.who === null ? 'idle' : 'req' + s.who); }), hl: hl || {} },
            { type: 'queue', label: 'Waiting for a connection', items: waiting.map(function (w) { return 'req' + w.id + ' (since t=' + w.since + ')'; }), frontLabel: 'next', backLabel: 'newest' },
            { type: 'vars', label: 'Clock and totals', vals: { t: t, open_connections: slots.length, limit: cfg.pool + cfg.overflow, finished: done } },
            { type: 'stack', label: 'Events', items: log.slice(-6) }
          ] });
        }
        view('The pool starts with ' + cfg.pool + ' idle pooled connection(s) (<code>pool_size=' + cfg.pool + '</code>) and may open up to ' + cfg.overflow + ' extra (<code>max_overflow=' + cfg.overflow + '</code>). Each request keeps its connection for ' + cfg.hold + ' ticks.');
        for (t = 0; t < cfg.requests + cfg.hold * 4 && frames.length < 28; t++) {
          var hl = {}, changed = false;
          // releases
          for (i = slots.length - 1; i >= 0; i--) {
            if (slots[i].who !== null && slots[i].until <= t) {
              log.push('t=' + t + ' req' + slots[i].who + ' returns its connection'); done++; changed = true;
              if (waiting.length) { var w = waiting.shift(); slots[i].who = w.id; slots[i].until = t + cfg.hold; log.push('t=' + t + ' req' + w.id + ' gets it after waiting ' + (t - w.since)); hl[i] = 'ok'; }
              else if (slots[i].kind === 'overflow') { slots.splice(i, 1); log.push('t=' + t + ' overflow connection closed'); }
              else { slots[i].who = null; hl[i] = 'done'; }
            }
          }
          // timeouts
          waiting = waiting.filter(function (w) { if (t - w.since > cfg.timeout) { log.push('t=' + t + ' req' + w.id + ' TimeoutError (pool_timeout)'); changed = true; done++; return false; } return true; });
          // arrival
          if (t < cfg.requests) {
            changed = true;
            var idle = -1; for (i = 0; i < slots.length; i++) if (slots[i].who === null) { idle = i; break; }
            if (idle >= 0) { slots[idle].who = t; slots[idle].until = t + cfg.hold; hl[idle] = 'ok'; log.push('t=' + t + ' req' + t + ' checks out a pooled connection'); }
            else if (slots.length < cfg.pool + cfg.overflow) { slots.push({ kind: 'overflow', who: t, until: t + cfg.hold }); hl[slots.length - 1] = 'cur'; log.push('t=' + t + ' req' + t + ' opens an OVERFLOW connection'); }
            else { waiting.push({ id: t, since: t }); log.push('t=' + t + ' req' + t + ' must WAIT'); }
          }
          if (changed) {
            var last = log[log.length - 1] || '';
            var narr = /Timeout/.test(last) ? 'A waiter gave up: after <code>pool_timeout</code> the checkout raises <code>TimeoutError: QueuePool limit ... reached</code>. The request fails with a 500 even though the database itself is fine. The real cure is shorter holds, not a longer timeout.'
              : /WAIT/.test(last) ? 'All ' + (cfg.pool + cfg.overflow) + ' allowed connections are busy, so the new request <b>waits</b> in line. Latency now includes queueing time.'
              : /OVERFLOW/.test(last) ? 'All pooled connections are busy, so the pool opens an <b>overflow</b> connection (a fresh handshake: slower). It will be closed when returned.'
              : /gets it/.test(last) ? 'A connection came back and goes straight to the <b>first waiter</b> (FIFO), without being closed.'
              : /closed/.test(last) ? 'An overflow connection is returned while nobody waits, so it is <b>closed</b>. Only <code>pool_size</code> connections stay open when idle.'
              : 'A request checks out an idle pooled connection: no handshake, instant.';
            view('t = ' + t + ': ' + narr, hl);
          }
          if (t >= cfg.requests && !waiting.length && slots.every(function (s) { return s.who === null; })) break;
        }
        view('All requests are done. ' + done + ' finished (including timeouts). Try <code>hold=1</code> to see how short transactions make even a tiny pool enough, or <code>overflow=0</code> to see more waiting.', {});
        return frames;
      }
    },
    examples: [
      {
        title: 'Sizing a real deployment',
        html: `<p>PostgreSQL <code>max_connections = 200</code>. Reserve 20 for migrations, admin tools and replication. 4 pods × 4 workers = 16 processes. Budget per process: 180 / 16 = 11 connections. Choose <code>pool_size=6, max_overflow=5</code>. If autoscaling can grow to 8 pods, plan for that maximum, or put <b>PgBouncer</b> in front so thousands of client connections share a small set of server connections.</p>
          ${H.table(['Pods', 'Workers', 'pool + overflow', 'Worst case', 'Fits 180?'], [['4', '4', '6 + 5', '176', H.c('g', 'yes')], ['8 (autoscaled)', '4', '6 + 5', '352', H.c('r', 'no')], ['8 + PgBouncer', '4', '6 + 5 (client side)', 'server side capped by PgBouncer', H.c('g', 'yes')]])}`
      },
      {
        title: 'The leaked session that empties the pool',
        html: `<p>A helper does <code>db = SessionLocal()</code>, runs a query and returns early on an error path without <code>db.close()</code>. Each leak holds one connection until garbage collection (maybe never, if something references it). After 15 leaks, every request waits 30 s and fails. Fix: always use <code>with SessionLocal() as db:</code> or the <code>get_db</code> dependency; then the connection is returned on every path, including exceptions.</p>`,
        code: { lang: 'python', code: `from sqlalchemy import select

from db import SessionLocal
from models import User


def find_user_leaky(email: str):
    db = SessionLocal()
    user = db.scalars(select(User).where(User.email == email)).first()
    if user is None:
        return None          # BUG: the session (and its connection) is never closed
    db.close()
    return user


def find_user(email: str):
    with SessionLocal() as db:   # closed on every path
        return db.scalars(select(User).where(User.email == email)).first()` }
      },
      {
        title: 'Dead connections after a database failover',
        html: `<p>At 03:00 the managed database fails over to a replica. Every pooled connection now points at a dead server. Without <code>pool_pre_ping</code>, the next request on each connection fails with "server closed the connection unexpectedly". With it, SQLAlchemy sends a cheap ping on checkout, sees the failure, discards the whole stale pool and connects again. The cost is one tiny round trip per checkout; for most APIs that is worth it. <code>pool_recycle</code> additionally retires connections before a load balancer's idle timeout silently cuts them.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Inside QueuePool.</b> Idle connections sit in a thread-safe queue (FIFO by default; <code>pool_use_lifo=True</code> reuses the most recent one so extra connections can actually go idle and be recycled by server-side timeouts). Checkout takes one or creates a new one while under <code>pool_size + max_overflow</code>, else waits on a condition up to <code>pool_timeout</code>. Check-in runs <b>reset on return</b> (a <code>ROLLBACK</code>) so the next borrower never inherits an open transaction or locks.</p>
      <p><b>Async pools.</b> <code>create_async_engine</code> uses <code>AsyncAdaptedQueuePool</code>, with the same settings. One process now runs many concurrent requests on one event loop, so a single process may want a slightly larger pool than a sync worker, but the database-wide formula still applies.</p>
      <p><b>External poolers.</b> PgBouncer in <b>transaction</b> mode gives a server connection to a client only for one transaction, so 1,000 app connections can share 50 server connections. The price: session state (<code>SET</code> commands, advisory locks held across transactions, <code>LISTEN</code>, server-side prepared statements) does not survive between transactions. Keep the app pool small too, or use <code>NullPool</code> and let PgBouncer do all pooling.</p>
      <p><b>Forking.</b> A pool's sockets must never be shared by two processes. Gunicorn with <code>--preload</code>, <code>multiprocessing</code> and Celery prefork workers all fork. Create engines after fork or call <code>engine.dispose(close=False)</code> in the child so it opens its own connections.</p>
      <p><b>Production reality.</b> Export pool metrics (checked out, overflow, wait time). Alert on rising checkout wait time; it predicts an outage minutes before the timeouts start. On the database side, watch active connections and <code>idle in transaction</code>.</p>`,
    aiEra: `<p>🤖 When an assistant sees "QueuePool limit reached", its first suggestion is often "increase <code>pool_size</code> to 50". That hides the leak and moves the failure to the database. Ask instead: "find code paths where a session or connection might not be returned, and transactions that stay open across network calls". Assistants are good at that kind of audit across many files.</p>
      <p>Assistants also do the sizing arithmetic well if you give them pods, workers, autoscaling limits and <code>max_connections</code>. Platform shifts matter: serverless functions, edge runtimes and autoscaling make the "number of processes" unbounded, which is why managed proxies (RDS Proxy, PgBouncer, Neon/Supabase poolers) became the default in 2026 architectures.</p>`,
    problems: [
      {
        title: 'Pick a safe pool_size for your fleet',
        level: 'Easy',
        tags: ['connection pool', 'capacity planning'],
        companies: ['Heroku', 'DigitalOcean'],
        statement: `<p>Your API runs on <code>instances</code> machines, each with <code>workers</code> processes. Every process has its own SQLAlchemy pool with the given <code>max_overflow</code>. The database allows <code>db_max</code> connections, and <code>reserved</code> of them must stay free for admins, migrations and monitoring.</p>
          <p>Write <code>max_pool_size(db_max, reserved, instances, workers, max_overflow)</code> that returns the <b>largest</b> <code>pool_size ≥ 1</code> such that the worst case never exceeds the budget, or <code>0</code> if even <code>pool_size = 1</code> does not fit.</p>`,
        constraints: `<p>All inputs are integers; 1 ≤ instances, workers ≤ 1000; 0 ≤ reserved ≤ db_max ≤ 10<sup>5</sup>; 0 ≤ max_overflow ≤ 100.</p>`,
        example: `<p>db_max = 100, reserved = 10, 2 instances × 4 workers = 8 processes, max_overflow = 5. Budget 90 → 90 / 8 = 11 per process → pool_size = 11 − 5 = ${H.c('g', '6')}. Check: 8 × (6 + 5) = 88 ≤ 90.</p>`,
        brute: {
          why: `<p>Trying pool sizes one by one until the total overflows works but is pointless; and the very common real-world "brute force" is worse: leaving the defaults (5 + 10) and discovering the limit during the first traffic spike.</p>`,
          code: `def max_pool_size_loop(db_max, reserved, instances, workers, max_overflow):
    best, p = 0, 1
    while instances * workers * (p + max_overflow) <= db_max - reserved:
        best, p = p, p + 1
    return best`
        },
        mcq: {
          q: 'Each of 6 processes has <code>pool_size=5, max_overflow=10</code>. What is the worst-case number of database connections?',
          options: ['15', '30', '60', '90'],
          answer: 3,
          explain: 'Every process has its own pool: 6 × (5 + 10) = 90.'
        },
        hints: [
          'Hint 1: the worst case is processes × (pool_size + max_overflow), where processes = instances × workers.',
          'Hint 2: per-process budget = (db_max − reserved) // processes (integer division, because connections are whole).',
          'Hint 3: pool_size = per-process budget − max_overflow; if that is below 1, return 0 (you must lower max_overflow or add a pooler).'
        ],
        solution: {
          approach: `<p>Turn the inequality around. We need <code>processes × (p + overflow) ≤ budget</code>, so <code>p ≤ budget / processes − overflow</code>. Integer division gives the largest whole number of connections per process. Subtract the overflow, and clamp: a result below 1 means the fleet cannot fit even one steady connection per process with that overflow. In practice you then reduce <code>max_overflow</code>, reduce workers, or add PgBouncer.</p>`,
          code: `def max_pool_size(db_max, reserved, instances, workers, max_overflow):
    processes = instances * workers
    budget = db_max - reserved
    per_process = budget // processes          # whole connections each process may hold
    pool_size = per_process - max_overflow
    return pool_size if pool_size >= 1 else 0`,
          complexity: `<p>O(1) time and space.</p>`,
          followUps: ['How does the answer change with autoscaling from 2 to 6 instances?', 'Why might you still choose a pool smaller than this maximum?']
        },
        tests: { fn: 'maxPoolSize', sig: 'int int int int int -> int', cases: [
          [[100, 10, 2, 4, 5], 6],
          [[100, 10, 3, 4, 10], 0],
          [[500, 20, 4, 4, 0], 30],
          [[100, 10, 1, 1, 0], 90],
          [[20, 5, 1, 4, 2], 1],
          [[10, 10, 1, 1, 0], 0],
          [[1000, 100, 5, 2, 10], 80]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 8 — Repository pattern and service layer
     ===================================================================== */
  topics.push({
    title: 'Repository Pattern, Service Layer and a Unit-of-Work Wrapper',
    analogy: `<p>A <b>repository</b> is a <b>librarian</b>. You ask "the book with ISBN 978-..." or "all books by Le Guin, newest first" and get books back. You do not care whether the librarian walks to shelf 7, checks the basement or phones another branch. If the library reorganises its shelves, your request does not change.</p>
      <p>The <b>service</b> is you, the reader with a goal ("borrow three books for my trip"). The <b>unit of work</b> is the checkout desk: everything you borrow in one visit is stamped together, or not at all. And for tests, you can swap the real librarian for a <b>cardboard librarian</b> who keeps a short list in a notebook (an in-memory fake), which is much faster than a real library.</p>`,
    explain: `<p>🟢 <b>The layers</b> (same idea as controller → service → repository from the Backend "First REST API" module, now in Python):</p>
      ${H.table(['Layer', 'Knows about', 'Does', 'Does NOT'], [
        ['Router (FastAPI endpoint)', 'HTTP, Pydantic schemas', 'parse input, call a service, map errors to status codes', 'write SQL, commit'],
        ['Service', 'business rules', 'one use case: "place order", "invite member"; owns the transaction', 'know HTTP or SQL details'],
        ['Repository', 'SQLAlchemy, the tables', 'load and store aggregates: <code>get</code>, <code>add</code>, <code>list_page</code>, <code>get_by_email</code>', 'commit, apply business rules'],
        ['Session / UoW', 'the connection', 'track changes, flush, commit or roll back', '-']
      ])}
      <p><b>Why bother?</b> (1) Queries live in one place, so the "active users of a tenant" filter is written once, not in 14 endpoints. (2) Services can be unit-tested with an in-memory fake repository, no database needed, in milliseconds. (3) You can change storage details (add a cache, split a table) behind the repository without touching business code.</p>
      <p>🔵 <b>Who commits?</b> Not the repository. If <code>UserRepository.add()</code> committed, a service that adds a user and an audit log row could not make them atomic. The repository only <code>add()</code>s and maybe <code>flush()</code>es (to get ids). The <b>service</b> wraps the use case in one transaction, either directly with <code>with db.begin():</code> or through a small <b>unit-of-work</b> object that bundles the session and the repositories.</p>
      <p><b>Typing the contract.</b> A <code>typing.Protocol</code> describes the methods a repository must have. The real <code>SqlUserRepository</code> and the <code>InMemoryUserRepository</code> fake both satisfy it without inheriting from anything, and <code>mypy</code> checks that your service only uses those methods.</p>
      <p><b>A caution.</b> SQLAlchemy's <code>Session</code> already <i>is</i> a unit of work with an identity map. For a small CRUD service, a thin repository (or using the session directly in services) is fine. Do not build a giant generic <code>BaseRepository</code> that re-exposes every query option; that is just a worse <code>Session</code>.</p>`,
    clues: [
      '"How do you structure data access in FastAPI?" → router → service → repository, session per request, service owns the commit',
      '"Unit-test business logic without a database" → depend on a Protocol, pass an in-memory fake repository',
      '"Two writes must succeed or fail together" → the service (or a UoW) owns one transaction; repositories never commit',
      '"The same filter is copy-pasted everywhere" → put it in a repository method or a reusable statement builder',
      '"Generic repository with get/list/filter for every model" → careful: it often leaks ORM details and adds little',
      '"Hexagonal / ports and adapters" → the repository Protocol is the port, the SQLAlchemy class is the adapter'
    ],
    code: [
      {
        lang: 'python', title: 'Protocol, SQLAlchemy repository and a service',
        code: `# app/users/repository.py
from typing import Protocol, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User


class UserRepository(Protocol):
    def get(self, user_id: int) -> User | None: ...
    def get_by_email(self, email: str) -> User | None: ...
    def add(self, user: User) -> None: ...
    def list_active(self, limit: int, after_id: int | None) -> Sequence[User]: ...


class SqlUserRepository:
    """SQLAlchemy adapter. Never commits: the caller owns the transaction."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, user_id: int) -> User | None:
        return self.session.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(func.lower(User.email) == email.lower())
        return self.session.scalars(stmt).one_or_none()

    def add(self, user: User) -> None:
        self.session.add(user)

    def list_active(self, limit: int, after_id: int | None) -> Sequence[User]:
        stmt = select(User).where(User.active.is_(True)).order_by(User.id).limit(limit)
        if after_id is not None:
            stmt = stmt.where(User.id > after_id)       # keyset pagination
        return self.session.scalars(stmt).all()


# app/users/service.py
class EmailTaken(Exception):
    pass


class UserService:
    def __init__(self, session: Session, users: UserRepository) -> None:
        self.session = session
        self.users = users

    def register(self, email: str, name: str) -> User:
        with self.session.begin():                     # the service owns the transaction
            if self.users.get_by_email(email) is not None:
                raise EmailTaken(email)
            user = User(email=email.lower(), name=name, active=True)
            self.users.add(user)
            self.session.flush()                       # id available before commit
        return user`
      },
      {
        lang: 'python', title: 'A unit-of-work wrapper and the FastAPI wiring',
        code: `# app/uow.py
from typing import Self

from sqlalchemy.orm import Session, sessionmaker

from app.orders.repository import SqlOrderRepository
from app.users.repository import SqlUserRepository


class UnitOfWork:
    """One transaction, several repositories sharing one session."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self.session_factory = session_factory

    def __enter__(self) -> Self:
        self.session = self.session_factory()
        self.users = SqlUserRepository(self.session)
        self.orders = SqlOrderRepository(self.session)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if exc_type is not None:
            self.session.rollback()
        self.session.close()            # anything not committed is rolled back

    def commit(self) -> None:
        self.session.commit()


# app/routers/users.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import SessionLocal
from app.models import User
from app.schemas import UserIn, UserOut
from app.users.service import EmailTaken

router = APIRouter(prefix="/users", tags=["users"])


def get_uow():
    with UnitOfWork(SessionLocal) as uow:
        yield uow


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: UserIn, uow: Annotated[UnitOfWork, Depends(get_uow)]):
    if uow.users.get_by_email(body.email) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")
    user = User(email=body.email.lower(), name=body.name, active=True)
    uow.users.add(user)
    uow.commit()                         # explicit: the use case is complete
    return user`
      },
      {
        lang: 'python', run: true, title: 'Runnable: test a service with an in-memory fake repository',
        code: `# The service depends on a Protocol, so a dict-backed fake is enough for unit tests.
from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class User:
    email: str
    name: str
    id: int | None = None
    active: bool = True


class UserRepository(Protocol):
    def get_by_email(self, email: str) -> User | None: ...
    def add(self, user: User) -> None: ...


@dataclass
class InMemoryUserRepository:
    rows: dict[int, User] = field(default_factory=dict)

    def get_by_email(self, email: str) -> User | None:
        return next((u for u in self.rows.values() if u.email == email.lower()), None)

    def add(self, user: User) -> None:
        user.id = len(self.rows) + 1
        self.rows[user.id] = user


class FakeTransaction:
    """Stands in for session.begin(): counts commits and rollbacks."""
    def __init__(self):
        self.commits = self.rollbacks = 0
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc, tb):
        if exc_type:
            self.rollbacks += 1
        else:
            self.commits += 1
        return False


class EmailTaken(Exception):
    pass


def register(users: UserRepository, tx: FakeTransaction, email: str, name: str) -> User:
    with tx:
        if users.get_by_email(email) is not None:
            raise EmailTaken(email)
        user = User(email=email.lower(), name=name)
        users.add(user)
    return user


repo, tx = InMemoryUserRepository(), FakeTransaction()
print(register(repo, tx, "Ann@Example.com", "Ann"))
try:
    register(repo, tx, "ann@example.com", "Ann again")
except EmailTaken as e:
    print("rejected duplicate:", e)
print("commits:", tx.commits, "rollbacks:", tx.rollbacks, "rows:", len(repo.rows))`
      }
    ],
    codeTitle: ['Protocol + SQL repository + service', 'Unit-of-work wrapper + FastAPI', 'Runnable: fake repository test'],
    viz: {
      title: 'One request through the layers (and the same service under test)',
      input: 'register ann@example.com',
      inputLabel: 'Action: "register EMAIL" (new email), "register taken@example.com" (duplicate) or "test EMAIL" (unit test with a fake)',
      gen: function (input) {
        var w = String(input || '').trim().split(/\s+/), act = (w[0] || '').toLowerCase(), email = (w[1] || '').toLowerCase().slice(0, 30);
        if ((act !== 'register' && act !== 'test') || email.indexOf('@') < 1) throw new Error('Type "register ann@example.com", "register taken@example.com" or "test bob@example.com"');
        var dup = email === 'taken@example.com', fake = act === 'test';
        var nodes = [bx('c', fake ? 'pytest' : 'HTTP client', 8, 30, 14), bx('r', 'Router', 26, 30, 12), bx('s', 'UserService', 46, 30, 15), bx('p', fake ? 'InMemory repo' : 'SqlUserRepository', 68, 30, 18), bx('d', fake ? 'Python dict' : 'Session + DB', 90, 30, 14)];
        var edges = fake ? [['c', 's'], ['s', 'p'], ['p', 'd']] : [['c', 'r'], ['r', 's'], ['s', 'p'], ['p', 'd']];
        if (fake) nodes[1] = bx('r', '(router not needed)', 26, 50, 16);
        var frames = [], sqlLog = [];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 60, label: fake ? 'Unit test path' : 'Request path', nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        function f(narr, hl, ehl) { frames.push({ narr: narr, parts: [g(hl, ehl), { type: 'stack', label: fake ? 'Calls on the fake' : 'SQL sent', items: sqlLog.slice() }] }); }
        if (!fake) {
          f('<code>POST /users</code> with <code>{"email": "' + hesc(email) + '"}</code>. FastAPI validates the body with the Pydantic schema and builds the dependencies: a session per request, the repository, the service.', { c: 'cur', r: 'cur' }, { 'c-r': 'ok' });
          f('The router does no business logic. It calls <code>service.register(email, name)</code> and will translate domain errors into HTTP status codes.', { r: 'done', s: 'cur' }, { 'r-s': 'ok' });
          sqlLog.push('BEGIN (implicit)'); sqlLog.push('SELECT users.* FROM users WHERE lower(users.email) = :email');
          f('The service opens the transaction (<code>with session.begin()</code>) and asks the repository <code>get_by_email</code>. The repository builds the <code>select()</code>; the service never sees SQL.', { s: 'cur', p: 'cur', d: 'cur' }, { 's-p': 'ok', 'p-d': 'ok' });
          if (dup) {
            sqlLog.push('ROLLBACK');
            f('A row came back: the email is taken. The service raises <code>EmailTaken</code>. Leaving the <code>with</code> block with an exception rolls back. Nothing was written.', { s: 'bad', d: 'done' }, { 's-p': 'bad' });
            f('The router catches <code>EmailTaken</code> (or an exception handler does) and returns <b>409 Conflict</b>. Business rule in the service, HTTP mapping in the router: each layer has one job.', { r: 'bad', c: 'cur' }, { 'c-r': 'bad' });
            return frames;
          }
          sqlLog.push('INSERT INTO users (email, name, active) VALUES (...) RETURNING id');
          f('No match. The service creates <code>User(...)</code> and calls <code>repo.add(user)</code>, then <code>flush()</code> to get the id. The repository did <b>not</b> commit.', { s: 'cur', p: 'ok', d: 'ok' }, { 's-p': 'ok', 'p-d': 'ok' });
          sqlLog.push('COMMIT');
          f('The service\'s <code>with session.begin()</code> block ends normally: <b>COMMIT</b>. The use case is the unit of work: check + insert are atomic together.', { s: 'ok', d: 'ok' }, { 'p-d': 'ok' });
          f('The router returns the user; the response model turns it into JSON (<code>from_attributes</code>). <b>201 Created</b>. The <code>get_db</code> dependency closes the session and returns the connection to the pool.', { r: 'ok', c: 'ok' }, { 'c-r': 'ok' });
          return frames;
        }
        f('Unit test: no FastAPI, no database. The test builds <code>UserService(fake_tx, InMemoryUserRepository())</code>. The service only knows the Protocol, so it cannot tell the difference.', { c: 'cur', s: 'cur' }, { 'c-s': 'ok' });
        sqlLog.push('fake.get_by_email("' + email + '") -> None');
        f('<code>get_by_email</code> on the fake is a dict scan: microseconds, fully deterministic.', { s: 'cur', p: 'cur', d: 'cur' }, { 's-p': 'ok', 'p-d': 'ok' });
        sqlLog.push('fake.add(User(email="' + email + '")) -> id 1');
        f('<code>add</code> stores the object and assigns an id, mimicking what flush would do.', { p: 'ok', d: 'ok' }, { 'p-d': 'ok' });
        sqlLog.push('assert service result.id == 1 and fake_tx.commits == 1');
        f('The test asserts on the result and on the fake transaction (committed once). Thousands of such tests run in a second. Keep a smaller set of <b>integration tests</b> against a real database (Python Backend IV) to check the SQL repository itself.', { c: 'ok', s: 'ok' }, { 'c-s': 'ok' });
        return frames;
      }
    },
    examples: [
      {
        title: 'A repository method that encodes a rule once',
        html: `<p>Every query for documents must respect tenancy and soft delete: <code>tenant_id = :t AND deleted_at IS NULL</code>. Forgetting it once is a data leak between customers. Put it in one private builder inside the repository, and make every public method start from it. Code review now checks one function, not every endpoint.</p>`,
        code: { lang: 'python', code: `from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models import Document


class DocumentRepository:
    def __init__(self, session: Session, tenant_id: int) -> None:
        self.session = session
        self.tenant_id = tenant_id

    def _visible(self) -> Select[tuple[Document]]:
        return select(Document).where(
            Document.tenant_id == self.tenant_id,
            Document.deleted_at.is_(None),
        )

    def get(self, doc_id: int) -> Document | None:
        return self.session.scalars(self._visible().where(Document.id == doc_id)).one_or_none()

    def search(self, term: str, limit: int = 20) -> list[Document]:
        stmt = self._visible().where(Document.title.ilike(f"%{term}%")).limit(limit)
        return list(self.session.scalars(stmt))` }
      },
      {
        title: 'Two repositories, one transaction',
        html: `<p>"Place order": insert the order (OrderRepository) and decrement stock (ProductRepository). Both repositories receive the <b>same session</b>, and the service wraps both calls in one <code>with session.begin():</code>. If the stock update finds 0 rows (sold out), the service raises and the order insert is rolled back too.</p>
          ${H.table(['Step', 'Repository', 'SQL'], [['1', 'orders.add(order)', 'INSERT orders (on flush)'], ['2', 'products.reserve(id, qty)', 'UPDATE products SET stock = stock - :q WHERE id = :id AND stock &gt;= :q'], ['3a', 'rowcount 1', H.c('g', 'COMMIT both')], ['3b', 'rowcount 0', H.c('r', 'raise OutOfStock → ROLLBACK both')]])}`
      },
      {
        title: 'When to skip the repository',
        html: `<p>A 10-endpoint internal admin API with simple CRUD gains little from three layers. Using the session directly in small service functions is clear, testable with a transactional test database, and has less code. Reach for repositories when queries repeat, rules must be enforced centrally (tenancy), or you want fast unit tests of non-trivial business logic. The architecture should earn its keep (Backend "Testing &amp; Architecture" goes deeper into hexagonal design).</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Repository per aggregate, not per table.</b> In domain-driven design an <i>aggregate</i> is a cluster saved together: an <code>Order</code> with its <code>OrderItem</code>s. One <code>OrderRepository</code> loads and saves the whole thing (with <code>selectinload(Order.items)</code> inside). There is no <code>OrderItemRepository</code>; items change only through their order. That keeps invariants ("total equals sum of lines") in one place.</p>
      <p><b>What a repository returns.</b> Returning ORM objects is pragmatic: you keep change tracking and lazy relationships. The purist alternative maps ORM rows to plain domain dataclasses (SQLAlchemy's <b>imperative mapping</b> can even map plain classes with no ORM base class). It decouples the domain from SQLAlchemy at the cost of mapping code. Pick one style per codebase.</p>
      <p><b>Leaky abstractions.</b> If a repository method returns ORM objects with lazy relationships, callers can trigger SQL after the repository "returned". Combine repositories with explicit loader options and <code>raiseload("*")</code> so the repository's contract includes what is loaded.</p>
      <p><b>Unit of work vs session.</b> The UoW wrapper adds little over a session except: a single place to construct repositories, a seam for tests (a <code>FakeUnitOfWork</code> with fake repositories and a <code>committed</code> flag), and a natural spot for collecting domain events to publish after commit (the outbox pattern from Backend "Microservices Patterns").</p>
      <p><b>Production reality.</b> Most bugs in layered codebases come from transaction boundaries: a repository that commits, a service that forgets to, or a background task that reuses a request's session after it closed. Document "who commits" in the service docstrings.</p>`,
    aiEra: `<p>🤖 Assistants love generating a <code>BaseRepository[T]</code> with <code>get_all</code>, <code>filter_by(**kwargs)</code> and <code>update(id, **fields)</code>. Push back: ask for repository methods named after use cases (<code>list_active_for_tenant</code>), not generic CRUD, and confirm none of them commit.</p>
      <p>Where AI shines: generating the in-memory fake from a Protocol, and generating unit tests for a service against that fake, including edge cases you list ("duplicate email with different case", "inactive user"). Because the fake and the real repository share a Protocol, a type checker will flag drift when either side changes, which keeps AI-generated test doubles honest.</p>`,
    problems: [
      {
        title: 'Build the in-memory fake repository for unit tests',
        level: 'Easy',
        tags: ['repository', 'testing', 'fakes'],
        companies: ['Thoughtworks', 'Spotify'],
        statement: `<p>Your <code>UserService</code> depends on a <code>UserRepository</code> Protocol. Write <code>InMemoryUserRepo</code>, a dict-backed fake that behaves like the SQL version so service tests need no database:</p>
          <ul><li><code>add(email, name)</code> → new id (1, 2, 3, ...), or <code>-1</code> if the email is already used. Emails are compared <b>case-insensitively</b> (the real table has a unique index on <code>lower(email)</code>).</li>
          <li><code>find_id_by_email(email)</code> → the id or <code>-1</code>.</li>
          <li><code>get_name(user_id)</code> → the name, or <code>""</code> if there is no such user.</li>
          <li><code>deactivate(user_id)</code> → <code>True</code> if an active user was deactivated, else <code>False</code>.</li>
          <li><code>count_active()</code> → number of active users.</li></ul>`,
        constraints: `<p>Up to 10<sup>4</sup> operations. Every method should be O(1) on average.</p>`,
        example: `<p><code>add("Ann@x.io", "Ann")</code> → 1, <code>add("ann@X.io", "Ann2")</code> → ${H.c('r', '-1')} (same email ignoring case), <code>find_id_by_email("ANN@x.io")</code> → 1, <code>deactivate(1)</code> → true, <code>deactivate(1)</code> → ${H.c('r', 'false')} (already inactive), <code>count_active()</code> → 0.</p>`,
        brute: {
          why: `<p>A list of tuples scanned on every call works, but <code>find_id_by_email</code> and the duplicate check become O(n), and tests with many users get slow. Worse, a fake that ignores the case-insensitive uniqueness rule lets service tests pass while production rejects the same input.</p>`,
          code: `class InMemoryUserRepoSlow:
    def __init__(self):
        self.rows = []                      # (id, email, name, active)

    def add(self, email, name):
        if any(r[1] == email for r in self.rows):    # bug: case-sensitive, O(n)
            return -1
        self.rows.append([len(self.rows) + 1, email, name, True])
        return len(self.rows)`
        },
        mcq: {
          q: 'Why must the fake enforce the same uniqueness rule as the database?',
          options: ['It makes the fake faster', 'Otherwise service tests can pass on behaviour that production would reject', 'Python requires it', 'It does not matter for unit tests'],
          answer: 1,
          explain: 'A fake is only useful if it honours the same contract as the real adapter, including constraints the service relies on.'
        },
        hints: [
          'Hint 1: keep two dicts: <code>id → record</code> and <code>lower(email) → id</code>, like a table plus a unique index.',
          'Hint 2: <code>add</code> checks the email index first, then assigns <code>next_id</code> and increments it, exactly like an identity column.',
          'Hint 3: keep a running <code>active</code> counter so <code>count_active</code> is O(1); only decrement it when <code>deactivate</code> actually flips an active user.'
        ],
        solution: {
          approach: `<p>Model the table and its unique index directly: a dict of rows keyed by id, and a dict from normalised email to id. <code>add</code> rejects duplicates via the index, assigns the next id, and bumps an active counter. <code>deactivate</code> flips the flag only if the user exists and is active, keeping the counter correct. In a real test suite, this class would also satisfy the <code>UserRepository</code> Protocol (returning <code>User</code> objects); the test harness here uses ints and strings.</p>`,
          code: `class InMemoryUserRepo:
    """Dict-backed fake with the same rules as the SQL repository."""

    def __init__(self):
        self.rows = {}          # id -> {"email", "name", "active"}
        self.by_email = {}      # lower(email) -> id   (the unique index)
        self.next_id = 1        # the identity column
        self.active = 0

    def add(self, email, name):
        key = email.lower()
        if key in self.by_email:
            return -1           # the real DB would raise IntegrityError
        uid = self.next_id
        self.next_id += 1
        self.rows[uid] = {"email": key, "name": name, "active": True}
        self.by_email[key] = uid
        self.active += 1
        return uid

    def find_id_by_email(self, email):
        return self.by_email.get(email.lower(), -1)

    def get_name(self, user_id):
        row = self.rows.get(user_id)
        return row["name"] if row else ""

    def deactivate(self, user_id):
        row = self.rows.get(user_id)
        if row is None or not row["active"]:
            return False
        row["active"] = False
        self.active -= 1
        return True

    def count_active(self):
        return self.active`,
          complexity: `<p>Every method is O(1) average time; memory O(n) for n users.</p>`,
          followUps: ['How would you run the same test suite against both the fake and the real SQL repository (a "contract test")?', 'Add a <code>list_active(limit, after_id)</code> method with keyset pagination to the fake.']
        },
        tests: { cls: 'InMemoryUserRepo', sigs: { InMemoryUserRepo: '', add: 'string string -> int', find_id_by_email: 'string -> int', get_name: 'int -> string', deactivate: 'int -> bool', count_active: '-> int' }, cases: [
          { ops: ['InMemoryUserRepo', 'add', 'add', 'find_id_by_email', 'deactivate', 'deactivate', 'count_active'], args: [[], ['Ann@x.io', 'Ann'], ['ann@X.io', 'Ann2'], ['ANN@x.io'], [1], [1], []], out: [null, 1, -1, 1, true, false, 0] },
          { ops: ['InMemoryUserRepo', 'count_active', 'get_name', 'find_id_by_email'], args: [[], [], [5], ['nobody@x.io']], out: [null, 0, '', -1] },
          { ops: ['InMemoryUserRepo', 'add', 'add', 'add', 'count_active', 'get_name'], args: [[], ['a@x', 'A'], ['b@x', 'B'], ['c@x', 'C'], [], [2]], out: [null, 1, 2, 3, 3, 'B'] },
          { ops: ['InMemoryUserRepo', 'add', 'deactivate', 'deactivate', 'count_active', 'add'], args: [[], ['a@x', 'A'], [2], [1], [], ['A@X', 'again']], out: [null, 1, false, true, 0, -1] },
          { ops: ['InMemoryUserRepo', 'add', 'add', 'deactivate', 'count_active', 'find_id_by_email', 'get_name'], args: [[], ['x@y', 'X'], ['z@y', 'Z'], [2], [], ['Z@Y'], [2]], out: [null, 1, 2, true, 1, 2, 'Z'] },
          { ops: ['InMemoryUserRepo', 'get_name', 'deactivate', 'add', 'get_name'], args: [[], [0], [0], ['q@q', 'Q'], [1]], out: [null, '', false, 1, 'Q'] }
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 9 — Async database access
     ===================================================================== */
  topics.push({
    title: 'Async Database Access: AsyncEngine, AsyncSession and async_sessionmaker',
    analogy: `<p>A sync worker is a <b>cashier who waits at the coffee machine</b>: while your latte brews (the database query), the whole queue stands still. An async worker is a <b>barista</b>: start your latte, take the next order, start that one, and serve each cup when the machine beeps. The coffee is not faster; the barista just never stands idle.</p>
      <p>The catch: each order needs its <b>own cup</b>. If the barista pours two orders into one cup at the same time, both are ruined. In async SQLAlchemy, the cup is the <b>AsyncSession</b>: one per task, never shared by tasks running at the same time.</p>`,
    explain: `<p>🟢 <b>The pieces</b> mirror the sync ones, with <code>await</code> wherever I/O happens:</p>
      ${H.table(['Sync', 'Async', 'Note'], [
        ['<code>create_engine(url)</code>', '<code>create_async_engine(url)</code>', 'URL uses an async driver: <code>postgresql+asyncpg://</code>, <code>postgresql+psycopg://</code> (psycopg 3 supports both), <code>sqlite+aiosqlite://</code>'],
        ['<code>sessionmaker(engine)</code>', '<code>async_sessionmaker(engine, expire_on_commit=False)</code>', '<code>expire_on_commit=False</code> is practically required (see below)'],
        ['<code>session.execute(stmt)</code>', '<code>await session.execute(stmt)</code>', 'same for <code>scalars</code>, <code>scalar</code>, <code>get</code>'],
        ['<code>session.add(obj)</code>', '<code>session.add(obj)</code>', 'no I/O, so no await'],
        ['<code>session.commit()</code>', '<code>await session.commit()</code>', 'also <code>flush</code>, <code>refresh</code>, <code>rollback</code>, <code>delete</code>, <code>close</code>'],
        ['<code>with Session() as s</code>', '<code>async with SessionLocal() as s</code>', 'and <code>async with s.begin():</code>'],
        ['<code>conn.execute(...)</code>', '<code>async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)</code>', 'run sync-only helpers inside async code']
      ])}
      <p>🔵 <b>The big rule: no implicit I/O.</b> In sync code, touching <code>user.orders</code> or an expired attribute quietly runs a SELECT. In async code that would have to <code>await</code>, and attribute access cannot await. So SQLAlchemy raises <code>MissingGreenlet: greenlet_spawn has not been called</code>. Three ways to avoid it:</p>
      <ol>
        <li><b>Eager-load</b> everything you will read: <code>select(User).options(selectinload(User.orders))</code>. This is the normal way.</li>
        <li>Explicit awaitable access: add the <code>AsyncAttrs</code> mixin to <code>Base</code> and write <code>orders = await user.awaitable_attrs.orders</code>.</li>
        <li>Keep objects from expiring: <code>expire_on_commit=False</code>, otherwise reading <code>user.name</code> after <code>await session.commit()</code> would need a refresh.</li>
      </ol>
      <p><b>When async pays off.</b> When your endpoints are <code>async def</code> and spend most of their time waiting on I/O (database, HTTP calls, Redis), one process can serve many concurrent requests. Each query is <i>not</i> faster. If your app is a classic CRUD API with sync dependencies, sync SQLAlchemy in <code>def</code> endpoints (FastAPI runs them in a thread pool) is perfectly fine. Python Backend I explained <code>async def</code> vs <code>def</code>; do not mix a sync session into an <code>async def</code> endpoint, because every query would block the event loop.</p>`,
    clues: [
      '"MissingGreenlet" / "greenlet_spawn has not been called" → implicit lazy load or expired attribute in async code',
      '"Use SQLAlchemy with async FastAPI" → <code>create_async_engine</code>, <code>async_sessionmaker</code>, an <code>async</code> yield dependency',
      '"Run three queries in parallel" → three sessions (or one connection per task) with <code>asyncio.gather</code>, never one shared session',
      '"This session is provisioning a new connection; concurrent operations are not permitted" → an AsyncSession used by two tasks at once',
      '"Async endpoint is slow under load" → a sync driver or sync session blocking the event loop',
      '"Stream a large export" → <code>await session.stream_scalars(stmt)</code> with <code>async for</code>'
    ],
    code: [
      {
        lang: 'python', title: 'Async engine, models with AsyncAttrs, FastAPI dependency and lifespan',
        code: `# app/db.py
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import (AsyncAttrs, AsyncSession, async_sessionmaker,
                                    create_async_engine)
from sqlalchemy.orm import DeclarativeBase

# e.g. postgresql+asyncpg://app:<password>@db:5432/shop
engine = create_async_engine(os.environ["DATABASE_URL"], pool_size=10, max_overflow=5,
                             pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(AsyncAttrs, DeclarativeBase):
    """AsyncAttrs adds obj.awaitable_attrs.<relationship> for explicit async loading."""


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()          # close pooled connections on shutdown


app = FastAPI(lifespan=lifespan)`
      },
      {
        lang: 'python', title: 'Async queries, eager loading and safe concurrency',
        code: `import asyncio
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import SessionLocal, app, get_db
from app.models import Customer, Order

Db = Annotated[AsyncSession, Depends(get_db)]


@app.get("/customers/{customer_id}")
async def customer_with_orders(customer_id: int, db: Db) -> dict:
    stmt = (
        select(Customer)
        .where(Customer.id == customer_id)
        .options(selectinload(Customer.orders))   # loaded now, so no lazy load later
    )
    customer = (await db.scalars(stmt)).one_or_none()
    if customer is None:
        raise HTTPException(404, "customer not found")
    return {"name": customer.name, "orders": [o.id for o in customer.orders]}


@app.post("/customers")
async def create_customer(email: str, name: str, db: Db) -> dict:
    customer = Customer(email=email, name=name)
    db.add(customer)                     # no await: no I/O yet
    await db.commit()                    # flush + COMMIT
    return {"id": customer.id}           # readable: expire_on_commit=False


async def count(model) -> int:
    async with SessionLocal() as s:      # each task gets its own session
        return await s.scalar(select(func.count()).select_from(model))


@app.get("/stats")
async def stats() -> dict:
    # Concurrent queries: separate sessions (and connections), never one shared session.
    customers, orders = await asyncio.gather(count(Customer), count(Order))
    return {"customers": customers, "orders": orders}


async def export_emails(db: AsyncSession) -> list[str]:
    out = []
    result = await db.stream_scalars(select(Customer.email).execution_options(yield_per=500))
    async for email in result:           # server-side cursor, 500 rows at a time
        out.append(email)
    return out`
      },
      {
        lang: 'python', run: true, title: 'Runnable: why async helps waiting, and why one session per task (stdlib asyncio)',
        code: `import asyncio
import time


async def fake_query(name: str, ms: int) -> str:
    await asyncio.sleep(ms / 1000)       # stands in for waiting on the database
    return name


async def sequential():
    return [await fake_query(q, 100) for q in ("users", "orders", "stats")]


async def concurrent():
    return await asyncio.gather(*(fake_query(q, 100) for q in ("users", "orders", "stats")))


class TinyAsyncSession:
    """Like AsyncSession: one operation at a time on its single connection."""
    def __init__(self):
        self.busy = False

    async def execute(self, sql: str) -> str:
        if self.busy:
            raise RuntimeError("concurrent operations are not permitted on one session")
        self.busy = True
        try:
            await asyncio.sleep(0.01)
            return f"ok: {sql}"
        finally:
            self.busy = False


async def main():
    for fn in (sequential, concurrent):
        t = time.perf_counter()
        await fn()
        print(f"{fn.__name__:10}: {(time.perf_counter() - t) * 1000:5.0f} ms")

    shared = TinyAsyncSession()
    results = await asyncio.gather(shared.execute("q1"), shared.execute("q2"), return_exceptions=True)
    print("shared session  :", [r if isinstance(r, str) else type(r).__name__ + ": " + str(r) for r in results])

    own = await asyncio.gather(TinyAsyncSession().execute("q1"), TinyAsyncSession().execute("q2"))
    print("session per task:", own)


asyncio.run(main())`
      }
    ],
    codeTitle: ['Async engine + dependency + lifespan', 'Async queries and concurrency', 'Runnable: asyncio timing and session sharing'],
    viz: {
      title: 'Event loop timeline: three requests, each waits 3 ticks on the database',
      input: 'async',
      inputLabel: 'Mode: async (AsyncSession + await) | blocking (sync session inside async def) | lazy (async + forgot eager loading)',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (['async', 'blocking', 'lazy'].indexOf(mode) < 0) throw new Error('Type async, blocking or lazy');
        var reqs = ['A', 'B', 'C'], ticks = 10, rows = reqs.map(function () { var r = []; for (var i = 0; i < ticks; i++) r.push('·'); return r; });
        var frames = [], col = [];
        for (var i = 0; i < ticks; i++) col.push('t' + i);
        function grid(hl) { return { type: 'grid', label: 'R = running Python, W = waiting on DB (loop free), B = blocking the loop, X = error', rows: cp(rows), rowHead: reqs.map(function (r) { return 'req ' + r; }), colHead: col, hl: hl || {} }; }
        function f(narr, hl, extra) { frames.push({ narr: narr, parts: [grid(hl)].concat(extra || []) }); }
        if (mode === 'async') {
          f('Three requests arrive together. One process, one event loop, an <b>AsyncSession per request</b>.');
          rows[0][0] = 'R'; rows[0][1] = 'W'; rows[0][2] = 'W'; rows[0][3] = 'W'; f('Request A runs its Python code, then hits <code>await db.execute(...)</code>. While A waits, the loop is <b>free</b>.', { '0,0': 'cur', '0,1': 'win' });
          rows[1][1] = 'R'; rows[1][2] = 'W'; rows[1][3] = 'W'; rows[1][4] = 'W'; f('So B starts at t1 and also awaits its query.', { '1,1': 'cur' });
          rows[2][2] = 'R'; rows[2][3] = 'W'; rows[2][4] = 'W'; rows[2][5] = 'W'; f('And C at t2. Three queries are now in flight at once on three pooled connections.', { '2,2': 'cur' });
          rows[0][4] = 'R'; rows[1][5] = 'R'; rows[2][6] = 'R'; f('Each request resumes when its result arrives and returns. All three finish by <b>t6</b>.', { '0,4': 'ok', '1,5': 'ok', '2,6': 'ok' });
          f('Compare with <code>blocking</code>: the same work takes much longer because nothing overlaps. Async does not make a query faster; it stops the process from idling while waiting.', {}, [{ type: 'bars', label: 'Finish tick per request', values: [5, 6, 7], idxLabels: ['A', 'B', 'C'] }]);
        } else if (mode === 'blocking') {
          f('Same three requests, but the <code>async def</code> endpoint uses a <b>sync</b> session (<code>db.execute</code> without await, a sync driver).');
          rows[0][0] = 'R'; rows[0][1] = 'B'; rows[0][2] = 'B'; rows[0][3] = 'B'; f('A runs and calls the sync driver. The thread blocks <b>inside the event loop</b>: nothing else can run, not even health checks.', { '0,1': 'bad', '0,2': 'bad', '0,3': 'bad' });
          rows[0][4] = 'R'; rows[1][5] = 'R'; rows[1][6] = 'B'; rows[1][7] = 'B'; rows[1][8] = 'B'; f('Only when A is done can B start, and B blocks the loop again.', { '1,6': 'bad', '1,7': 'bad', '1,8': 'bad' });
          rows[1][9] = 'R'; rows[2][9] = '…'; f('C has not even started at t9. Latency grows with every concurrent request.', { '2,9': 'bad' });
          f('Fix: use <code>AsyncSession</code> with an async driver, or declare the endpoint with plain <code>def</code> so FastAPI runs it in its thread pool where blocking is fine.', {}, [{ type: 'bars', label: 'Finish tick per request', values: [5, 10, 15], idxLabels: ['A', 'B', 'C'] }]);
        } else {
          f('Async again, but the code reads <code>customer.orders</code> without <code>selectinload</code>.');
          rows[0][0] = 'R'; rows[0][1] = 'W'; rows[0][2] = 'W'; rows[0][3] = 'W'; f('A awaits <code>await db.scalars(select(Customer)...)</code>. Fine so far.', { '0,1': 'win' });
          rows[0][4] = 'X'; f('Then <code>[o.id for o in customer.orders]</code>: the relationship is not loaded, so SQLAlchemy would need I/O inside a plain attribute access. It raises <code>sqlalchemy.exc.MissingGreenlet</code>. The request fails with 500.', { '0,4': 'bad' }, [txt('Error', '<code>MissingGreenlet: greenlet_spawn has not been called; can\'t call await_only() here.</code>')]);
          f('Fix 1 (usual): <code>.options(selectinload(Customer.orders))</code> on the query. Fix 2: <code>orders = await customer.awaitable_attrs.orders</code> with the <code>AsyncAttrs</code> mixin. Either way the I/O is now explicit.', {}, [pyc('Fixed query', 'stmt = select(Customer).where(Customer.id == cid).options(selectinload(Customer.orders))\ncustomer = (await db.scalars(stmt)).one()\nids = [o.id for o in customer.orders]   # no I/O: already loaded', { 1: 'ok' })]);
          f('This "error instead of hidden query" behaviour is a gift: async SQLAlchemy forces you to fix N+1 problems that sync code would hide.', {}, [txt('Takeaway', 'Eager-load in async code, always.')]);
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Converting a sync repository method to async',
        html: `<p>The query statement does not change at all, which is the beauty of 2.0 style. Only execution changes: <code>await</code> on <code>scalars</code>, and <code>async def</code> on the method. Everything that called it must now be async too ("async is contagious").</p>
          ${H.table(['Sync', 'Async'], [['<code>def get_by_email(self, email):</code>', '<code>async def get_by_email(self, email):</code>'], ['<code>return self.s.scalars(stmt).one_or_none()</code>', '<code>return (await self.s.scalars(stmt)).one_or_none()</code>'], ['<code>self.s.commit()</code>', '<code>await self.s.commit()</code>']])}`,
        code: { lang: 'python', code: `from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


class AsyncUserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        return (await self.session.scalars(stmt)).one_or_none()

    def add(self, user: User) -> None:   # add() does no I/O, so it stays sync
        self.session.add(user)` }
      },
      {
        title: 'Alembic with an async engine',
        html: `<p><code>alembic init -t async migrations</code> generates an <code>env.py</code> that creates an async engine and runs the (still synchronous) migration functions through <code>connection.run_sync(do_run_migrations)</code>. Migration files themselves stay normal <code>op.*</code> code. Read <code>DATABASE_URL</code> from the environment exactly as in the sync version.</p>`,
        code: { lang: 'python', code: `# migrations/env.py (async template, core part)
import asyncio
import os

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.db import Base

target_metadata = Base.metadata


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


asyncio.run(run_async_migrations())` }
      },
      {
        title: 'Background work after the response',
        html: `<p>An endpoint schedules <code>send_welcome_email(user_id)</code> as a background task. If the task reuses the request's <code>db</code> session, it may run after the dependency has closed that session. Pass <b>ids</b>, not ORM objects or sessions, to background work, and let the task open its own <code>async with SessionLocal() as s:</code>. The same rule applies to Celery or arq workers (Python Backend V).</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How async SQLAlchemy works inside.</b> The ORM's internals are synchronous code. The asyncio extension runs them inside a <b>greenlet</b>: when the sync code reaches the driver, the greenlet switches back to the event loop, which <code>await</code>s the real async driver call (asyncpg), then switches back. That is why "greenlet_spawn" appears in errors: an operation needed I/O outside that bridge, typically a lazy load.</p>
      <p><b>Concurrency limits.</b> An <code>AsyncSession</code> (like a <code>Session</code>) uses one connection at a time and is <b>not</b> safe for concurrent tasks. <code>asyncio.gather(repo.a(), repo.b())</code> on one session raises an error or corrupts state. Use one session per task, and remember each task holds a pooled connection: <code>gather</code> over 100 tasks needs 100 connections or waits on the pool. Bound it with a <code>asyncio.Semaphore</code>.</p>
      <p><b>Drivers.</b> <b>asyncpg</b> is fast and uses PostgreSQL's binary protocol with prepared statements (mind PgBouncer transaction mode). <b>psycopg 3</b> supports sync and async with one driver: <code>postgresql+psycopg://</code> works with both <code>create_engine</code> and <code>create_async_engine</code>. <b>aiosqlite</b> runs SQLite in a thread for tests.</p>
      <p><b>Mixing in sync code.</b> <code>await session.run_sync(fn)</code> runs a sync function that receives a regular <code>Session</code>, useful to reuse an existing sync helper. Never call a sync <code>Session</code> directly in <code>async def</code>; if you must use sync libraries, push them to a thread with <code>asyncio.to_thread</code>.</p>
      <p><b>Production reality.</b> Async gives the most benefit when requests also call other services. For pure database-bound APIs, throughput is usually limited by the database, not by Python threads. Measure before rewriting a working sync app.</p>`,
    aiEra: `<p>🤖 Async SQLAlchemy is where AI-generated code fails most often: mixing <code>Session</code> into <code>async def</code>, calling <code>session.query</code> on an <code>AsyncSession</code> (it has none), forgetting <code>await</code> on <code>commit()</code> (a coroutine never awaited: nothing is committed), and relationship access that raises <code>MissingGreenlet</code> at runtime. Linters like Ruff's async rules and running the tests catch most of these; ask the assistant to "list every await and every relationship read" when reviewing.</p>
      <p>Assistants are good at mechanical sync → async conversions once the 2.0 style is in place, because the statements stay the same. Keep the judgement call (does async actually help this service?) human, based on measurements.</p>`,
    problems: [
      {
        title: 'Fix a broken async endpoint',
        level: 'Hard',
        tags: ['async', 'AsyncSession', 'MissingGreenlet'],
        companies: ['Microsoft', 'Uber'],
        statement: `<p>This endpoint fails in production with <code>MissingGreenlet</code> on some requests and "concurrent operations are not permitted" on others. Also, users report that created orders sometimes "disappear". Find all the bugs and rewrite it correctly.</p>
          <pre><code>@app.post("/customers/{cid}/orders")
async def create_order(cid: int, body: OrderIn, db: Db):
    customer = await db.get(Customer, cid)
    order = Order(customer=customer, status="pending")
    db.add(order)
    db.commit()
    totals, recent = await asyncio.gather(
        db.scalar(select(func.sum(Order.total)).where(Order.customer_id == cid)),
        db.scalars(select(Order).where(Order.customer_id == cid).limit(5)),
    )
    return {"id": order.id, "count": len(customer.orders), "total": totals,
            "recent": [o.id for o in recent]}</code></pre>`,
        constraints: `<p>SQLAlchemy 2.0 asyncio, asyncpg, FastAPI. <code>SessionLocal = async_sessionmaker(engine)</code> with the default <code>expire_on_commit=True</code>.</p>`,
        example: `<p>Bug list: ${H.c('r', 'db.commit()')} is not awaited (a coroutine object is created and thrown away, so nothing commits: the "disappearing" orders); ${H.c('r', 'asyncio.gather')} runs two queries on <b>one</b> session at once; ${H.c('r', 'customer.orders')} is a lazy load → MissingGreenlet; with <code>expire_on_commit=True</code>, ${H.c('r', 'order.id')} after commit is expired → another implicit load; a missing customer is not handled (404).</p>`,
        brute: {
          why: `<p>The "quick fix" people try is wrapping things in <code>run_sync</code> or switching the endpoint to <code>def</code> while keeping the AsyncSession. That hides some errors but keeps the real bugs: the unawaited commit, the shared session in <code>gather</code>, and implicit I/O on relationships.</p>`,
          code: `@app.post("/customers/{cid}/orders")
async def create_order_patched(cid: int, body: OrderIn, db: Db):
    customer = await db.get(Customer, cid)
    order = Order(customer=customer, status="pending")
    db.add(order)
    await db.commit()
    # still wrong: lazy load of customer.orders and expired order.id
    count = await db.run_sync(lambda s: len(customer.orders))
    return {"id": order.id, "count": count}`
        },
        mcq: {
          q: 'What happens to <code>db.commit()</code> without <code>await</code> on an AsyncSession?',
          options: ['It commits synchronously', 'It creates a coroutine that never runs, so nothing is committed (Python warns "coroutine was never awaited")', 'It raises immediately', 'It commits after the response'],
          answer: 1,
          explain: 'Calling an async method only creates a coroutine object. Without await it never runs; the session is later closed and the transaction rolled back.'
        },
        hints: [
          'Hint 1: list every line that needs I/O: <code>get</code>, <code>commit</code>, each query, and every attribute that is not loaded (relationships, expired columns). Each must be an explicit <code>await</code> or be loaded in advance.',
          'Hint 2: one AsyncSession = one connection = one operation at a time. Either run the two read queries one after the other on <code>db</code>, or give each its own session from <code>SessionLocal()</code> if they must run concurrently.',
          'Hint 3: use <code>expire_on_commit=False</code> (or <code>await db.refresh(order)</code>), return 404 for a missing customer, and replace <code>len(customer.orders)</code> with a <code>count()</code> query.'
        ],
        solution: {
          approach: `<p>Fix each class of bug explicitly. (1) Await the commit; better, wrap the write in <code>async with db.begin():</code> so it commits or rolls back as a unit. (2) Create the factory with <code>expire_on_commit=False</code> so <code>order.id</code> stays readable. (3) Never touch an unloaded relationship: count with a query instead of <code>len(customer.orders)</code>. (4) The two read queries are cheap and run on one connection anyway, so run them <b>sequentially</b> on the same session; if they were slow and independent, each would get its own session in <code>gather</code>. (5) Return 404 when the customer does not exist, before creating anything.</p>`,
          code: `import asyncio
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db import engine
from app.models import Customer, Order

app = FastAPI()
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)   # fix: no expiry surprises


async def get_db():
    async with SessionLocal() as session:
        yield session


Db = Annotated[AsyncSession, Depends(get_db)]


class OrderIn(BaseModel):
    note: str | None = None


@app.post("/customers/{cid}/orders", status_code=201)
async def create_order(cid: int, body: OrderIn, db: Db) -> dict:
    async with db.begin():                                   # fix: commit is awaited, atomic
        customer = await db.get(Customer, cid)
        if customer is None:
            raise HTTPException(404, "customer not found")   # fix: no order for a ghost
        order = Order(customer_id=cid, status="pending")
        db.add(order)
    # fix: sequential reads on ONE session (a session is not safe for concurrent tasks)
    count = await db.scalar(select(func.count(Order.id)).where(Order.customer_id == cid))
    total = await db.scalar(select(func.coalesce(func.sum(Order.total), 0))
                            .where(Order.customer_id == cid))
    recent = (await db.scalars(select(Order.id).where(Order.customer_id == cid)
                               .order_by(Order.id.desc()).limit(5))).all()
    return {"id": order.id, "count": count, "total": total, "recent": list(recent)}


async def dashboard(cid: int) -> dict:
    """If the reads were slow and independent: one session per concurrent task."""
    async def one(stmt):
        async with SessionLocal() as s:
            return await s.scalar(stmt)

    count, total = await asyncio.gather(
        one(select(func.count(Order.id)).where(Order.customer_id == cid)),
        one(select(func.coalesce(func.sum(Order.total), 0)).where(Order.customer_id == cid)),
    )
    return {"count": count, "total": total}`,
          complexity: `<p>One write transaction plus three indexed reads on one connection. The concurrent variant uses two pooled connections to save one round trip of latency.</p>`,
          followUps: ['How would you enforce "every relationship must be eager-loaded" across the codebase?', 'How do you test async endpoints with a real database per test (Python Backend IV)?']
        },
        tests: { skip: 'ORM wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Get a user by id or email, or return 404',
    level: 'Easy',
    tags: ['select', 'FastAPI', 'result methods'],
    companies: ['Atlassian', 'Zalando'],
    statement: `<p>Write two FastAPI endpoints with SQLAlchemy 2.0: <code>GET /users/{user_id}</code> and <code>GET /users/by-email?email=...</code>. Each returns the user or <b>404</b>. Use the session from a <code>get_db</code> dependency, pick the right result method for each lookup, and make the email lookup case-insensitive.</p>`,
    constraints: `<p><code>users.email</code> is unique (on <code>lower(email)</code>). No legacy <code>session.query</code>.</p>`,
    example: `<p><code>GET /users/7</code> → <code>{"id": 7, "email": "ann@x.io"}</code>. <code>GET /users/by-email?email=ANN@x.io</code> → the same user. <code>GET /users/999</code> → ${H.c('r', '404 {"detail": "user not found"}')}.</p>`,
    brute: {
      why: `<p>Loading all users and filtering in Python (<code>[u for u in db.scalars(select(User)) if u.id == user_id]</code>) reads the whole table on every request. Using <code>.one()</code> for a lookup that may miss turns a normal "not found" into a 500 error.</p>`,
      code: `from sqlalchemy import select


def get_user_slow(db, user_id):
    users = db.scalars(select(User)).all()          # whole table
    return [u for u in users if u.id == user_id][0]  # IndexError -> 500 on a miss`
    },
    mcq: {
      q: 'For a lookup by a unique column that may not exist, which call fits best?',
      options: ['<code>db.scalars(stmt).one()</code>', '<code>db.scalars(stmt).one_or_none()</code>', '<code>db.execute(stmt).all()[0]</code>', '<code>db.scalars(stmt).all()</code>'],
      answer: 1,
      explain: '<code>one_or_none()</code> returns None on a miss and still raises if the "unique" assumption is ever broken (two rows).'
    },
    hints: [
      'Hint 1: by primary key, use <code>db.get(User, user_id)</code>: it checks the identity map first and returns None on a miss.',
      'Hint 2: by email, build <code>select(User).where(func.lower(User.email) == email.lower())</code> and call <code>db.scalars(stmt).one_or_none()</code>.',
      'Hint 3: on None, <code>raise HTTPException(status_code=404, detail="user not found")</code>. Declare <code>response_model</code> so only public fields are returned.'
    ],
    solution: {
      approach: `<p>Primary-key lookups use <code>Session.get</code>, the cheapest path (identity map, then one indexed SELECT). Unique-column lookups use a <code>select()</code> plus <code>one_or_none()</code>: None means 404, and two rows would raise loudly, revealing a broken constraint instead of silently picking one. Comparing <code>lower(email)</code> matches a functional unique index on PostgreSQL, so the query is an index lookup.</p>`,
      code: `from collections.abc import Iterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import User


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


Db = Annotated[Session, Depends(get_db)]
router = APIRouter(prefix="/users")


class UserOut(BaseModel):
    id: int
    email: str
    model_config = {"from_attributes": True}


@router.get("/by-email", response_model=UserOut)       # declared before /{user_id}
def get_by_email(email: str, db: Db) -> User:
    stmt = select(User).where(func.lower(User.email) == email.lower())
    user = db.scalars(stmt).one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Db) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user`,
      complexity: `<p>O(log n) per request with the primary-key and functional unique indexes; zero queries for a primary key already in the identity map.</p>`,
      followUps: ['Why must <code>/by-email</code> be declared before <code>/{user_id}</code>?', 'How would you return 404 for soft-deleted users too?']
    },
    tests: { skip: 'ORM wiring, verified by reading' }
  });

  practice.push({
    title: 'Count tags with an upsert',
    level: 'Easy',
    tags: ['upsert', 'ON CONFLICT', 'sqlite3'],
    companies: ['Pinterest', 'Medium'],
    statement: `<p>Every time an article is tagged, increment that tag's counter in a <code>tag_counts(name PRIMARY KEY, n)</code> table. Concurrent requests may tag at the same time, so the increment must be one atomic <b>upsert</b>, not "SELECT, then INSERT or UPDATE".</p>
      <p>Write <code>count_tags(tags)</code>: apply one upsert per tag to an in-memory <code>sqlite3</code> table and return <code>"name:n"</code> rows ordered by name (default binary ordering, so uppercase sorts before lowercase).</p>`,
    constraints: `<p>0 ≤ tags ≤ 10<sup>4</sup>. Tag names are compared exactly (case-sensitive).</p>`,
    example: `<p>["py", "sql", "py"] → ${H.c('g', '["py:2", "sql:1"]')}. The first "py" inserts n = 1; the second hits the primary-key conflict and runs <code>DO UPDATE SET n = n + 1</code>.</p>`,
    brute: {
      why: `<p>Read-then-write (<code>SELECT n</code>; if missing <code>INSERT</code> else <code>UPDATE n = old + 1</code>) has two races: two requests can both see "missing" and both INSERT (one fails with a duplicate key), or both read 4 and both write 5 (a lost update).</p>`,
      code: `import sqlite3


def count_tags_racy(tags):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE tag_counts (name TEXT PRIMARY KEY, n INTEGER NOT NULL)")
    for t in tags:
        row = con.execute("SELECT n FROM tag_counts WHERE name = ?", (t,)).fetchone()
        if row is None:
            con.execute("INSERT INTO tag_counts VALUES (?, 1)", (t,))
        else:
            con.execute("UPDATE tag_counts SET n = ? WHERE name = ?", (row[0] + 1, t))
    return [f"{a}:{b}" for a, b in con.execute("SELECT name, n FROM tag_counts ORDER BY name")]`
    },
    mcq: {
      q: 'In SQLAlchemy on PostgreSQL, how do you write this upsert?',
      options: ['<code>session.merge(TagCount(name=t))</code>', '<code>pg_insert(TagCount).values(name=t, n=1).on_conflict_do_update(index_elements=[TagCount.name], set_={"n": TagCount.n + 1})</code>', '<code>session.add(TagCount(name=t))</code> then catch errors', '<code>update(TagCount).values(n=TagCount.n + 1)</code> only'],
      answer: 1,
      explain: 'The dialect-specific <code>insert().on_conflict_do_update()</code> compiles to <code>INSERT ... ON CONFLICT (name) DO UPDATE</code>, which is atomic. <code>merge</code> is a read-then-write in Python.'
    },
    hints: [
      'Hint 1: one statement does both cases: <code>INSERT ... VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET n = n + 1</code>.',
      'Hint 2: <code>n = n + 1</code> refers to the existing row, so the increment happens inside the database, atomically.',
      'Hint 3: run the upsert for each tag inside one transaction (<code>with con:</code>), then <code>SELECT name, n ORDER BY name</code> and format each row.'
    ],
    solution: {
      approach: `<p>The upsert (SQL track, DML and UPSERT) makes the database resolve the conflict on the primary key: insert when new, increment when present, all in one atomic statement, so there is no race window. In the API you would write it with <code>sqlalchemy.dialects.postgresql.insert(...).on_conflict_do_update(...)</code> (SQLite has the same construct in <code>sqlalchemy.dialects.sqlite</code>).</p>`,
      code: `import sqlite3


def count_tags(tags):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE tag_counts (name TEXT PRIMARY KEY, n INTEGER NOT NULL)")
    with con:                                   # one transaction for the batch
        for t in tags:
            con.execute(
                "INSERT INTO tag_counts (name, n) VALUES (?, 1) "
                "ON CONFLICT(name) DO UPDATE SET n = n + 1",
                (t,),
            )
    rows = con.execute("SELECT name, n FROM tag_counts ORDER BY name").fetchall()
    con.close()
    return [f"{name}:{n}" for name, n in rows]`,
      complexity: `<p>O(t log k) for t tags and k distinct names (one index probe per upsert), plus O(k log k) to sort the output.</p>`,
      followUps: ['Write the same upsert with SQLAlchemy\'s PostgreSQL <code>insert</code> and <code>excluded</code>.', 'How would you batch 10,000 upserts into one statement?']
    },
    tests: { fn: 'countTags', sig: 'string[] -> string[]', cases: [
      [[['py', 'sql', 'py']], ['py:2', 'sql:1']],
      [[[]], []],
      [[['a']], ['a:1']],
      [[['b', 'a', 'b', 'b']], ['a:1', 'b:3']],
      [[['X', 'x']], ['X:1', 'x:1']],
      [[['z', 'y', 'x']], ['x:1', 'y:1', 'z:1']]
    ] }
  });

  practice.push({
    title: 'Write the downgrade for a migration',
    level: 'Easy',
    tags: ['alembic', 'downgrade'],
    companies: ['GitLab', 'Canonical'],
    statement: `<p>A teammate wrote this <code>upgrade()</code> and left <code>downgrade()</code> empty. Write a correct <code>downgrade()</code> that returns the schema to exactly where it was.</p>
      <pre><code>def upgrade():
    op.create_table("teams", sa.Column("id", sa.Integer, primary_key=True),
                    sa.Column("name", sa.String(80), nullable=False))
    op.add_column("users", sa.Column("team_id", sa.Integer, nullable=True))
    op.create_foreign_key("fk_users_team_id_teams", "users", "teams", ["team_id"], ["id"])
    op.create_index("ix_users_team_id", "users", ["team_id"])</code></pre>`,
    constraints: `<p>Alembic operations only. PostgreSQL.</p>`,
    example: `<p>Running <code>alembic downgrade -1</code> then <code>alembic upgrade head</code> must succeed and leave the same schema. Dropping <code>teams</code> first ${H.c('r', 'fails')}: the foreign key from <code>users.team_id</code> still depends on it.</p>`,
    brute: {
      why: `<p>Writing the downgrade in the same order as the upgrade (drop table first) fails because dependent objects still exist. Leaving it empty means a bad deploy cannot be rolled back automatically.</p>`,
      code: `from alembic import op


def downgrade() -> None:
    op.drop_table("teams")      # fails: users.team_id still references teams`
    },
    mcq: {
      q: 'In what order should a downgrade undo the upgrade\'s operations?',
      options: ['The same order', 'Exactly the reverse order', 'Any order', 'Tables first, then columns'],
      answer: 1,
      explain: 'Later operations depend on earlier ones (the FK depends on the column and the table), so undo them last-in, first-out.'
    },
    hints: [
      'Hint 1: undo in reverse: the last thing created is the first thing dropped.',
      'Hint 2: the index and the foreign key depend on <code>users.team_id</code>, which depends on nothing else; the FK also depends on <code>teams</code>.',
      'Hint 3: <code>op.drop_index(name, table_name=...)</code>, <code>op.drop_constraint(name, table, type_="foreignkey")</code>, <code>op.drop_column</code>, <code>op.drop_table</code>.'
    ],
    solution: {
      approach: `<p>Reverse the list: drop the index, then the foreign key constraint (by the explicit name the upgrade gave it, which is why naming conventions matter), then the column, then the table. Test it by running downgrade and upgrade again in CI. Note that downgrading loses any team data created since; production teams often prefer "roll forward with a fix", but a working downgrade is still essential for development and failed deploys.</p>`,
      code: `from alembic import op


def downgrade() -> None:
    op.drop_index("ix_users_team_id", table_name="users")
    op.drop_constraint("fk_users_team_id_teams", "users", type_="foreignkey")
    op.drop_column("users", "team_id")
    op.drop_table("teams")`,
      complexity: `<p>Four quick DDL statements; dropping a column is a catalog change on PostgreSQL (no table rewrite).</p>`,
      followUps: ['Which downgrades are impossible to make lossless?', 'How do you test every migration\'s downgrade automatically in CI?']
    },
    tests: { skip: 'ORM wiring, verified by reading' }
  });

  practice.push({
    title: 'Convert legacy 1.x query code to SQLAlchemy 2.0',
    level: 'Easy',
    tags: ['select', 'migration to 2.0'],
    companies: ['Dropbox', 'Reddit'],
    statement: `<p>Modernise this function to SQLAlchemy 2.0 style (no <code>session.query</code>), keeping the exact behaviour:</p>
      <pre><code>def report(session, min_total):
    vip = session.query(Customer).filter(Customer.vip == True).all()
    n = session.query(Order).filter(Order.total &gt;= min_total).count()
    first = session.query(Order).order_by(Order.created_at).first()
    session.query(Order).filter(Order.status == "draft").delete()
    return vip, n, first</code></pre>`,
    constraints: `<p>SQLAlchemy 2.0. The function must also work unchanged later with <code>AsyncSession</code> after adding <code>await</code>.</p>`,
    example: `<p><code>session.query(Order).filter(...).count()</code> becomes ${H.c('g', '<code>session.scalar(select(func.count()).select_from(Order).where(...))</code>')}: a real <code>SELECT count(*)</code> without loading rows.</p>`,
    brute: {
      why: `<p>A naive translation counts with <code>len(session.scalars(select(Order).where(...)).all())</code>, which loads every matching order into memory just to count them, and deletes by loading drafts and calling <code>session.delete</code> on each.</p>`,
      code: `from sqlalchemy import select


def report_naive(session, min_total):
    vip = session.scalars(select(Customer).where(Customer.vip == True)).all()
    n = len(session.scalars(select(Order).where(Order.total >= min_total)).all())   # loads all rows
    first = session.scalars(select(Order).order_by(Order.created_at)).first()
    for o in session.scalars(select(Order).where(Order.status == "draft")):
        session.delete(o)                                                          # N DELETEs
    return vip, n, first`
    },
    mcq: {
      q: 'Which 2.0 call replaces <code>query(...).filter(...).delete()</code>?',
      options: ['<code>session.delete(stmt)</code>', '<code>session.execute(delete(Order).where(...))</code>', '<code>session.scalars(delete(Order))</code>', '<code>Order.delete()</code>'],
      answer: 1,
      explain: 'Bulk operations are Core-style statements (<code>delete()</code>, <code>update()</code>) run with <code>session.execute()</code>.'
    },
    hints: [
      'Hint 1: <code>query(X).filter(c)</code> → <code>select(X).where(c)</code>, executed with <code>session.scalars(...)</code>.',
      'Hint 2: counts → <code>select(func.count()).select_from(Order).where(...)</code> with <code>session.scalar</code>; bulk delete → <code>session.execute(delete(Order).where(...))</code>.',
      'Hint 3: use <code>Customer.vip.is_(True)</code> instead of <code>== True</code> (cleaner SQL, and linters stop complaining).'
    ],
    solution: {
      approach: `<p>Map each legacy call to a statement object plus the right execution method. The statement objects are identical for sync and async sessions, so the async version only needs <code>await</code> in front of each <code>session.*</code> call. The bulk delete stays one statement; it does not run ORM cascades, which matches the legacy <code>query.delete()</code> behaviour.</p>`,
      code: `from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import Customer, Order


def report(session: Session, min_total):
    vip = session.scalars(select(Customer).where(Customer.vip.is_(True))).all()
    n = session.scalar(
        select(func.count()).select_from(Order).where(Order.total >= min_total)
    )
    first = session.scalars(select(Order).order_by(Order.created_at).limit(1)).first()
    session.execute(delete(Order).where(Order.status == "draft"))
    return vip, n, first`,
      complexity: `<p>Same SQL as before: one SELECT, one COUNT, one ordered LIMIT 1, one bulk DELETE.</p>`,
      followUps: ['Write the async version.', 'What does <code>synchronize_session</code> do for the bulk delete?']
    },
    tests: { skip: 'ORM wiring, verified by reading' }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Find the Alembic heads',
    level: 'Medium',
    tags: ['alembic', 'graphs', 'branches'],
    companies: ['GitHub', 'Atlassian'],
    statement: `<p>CI fails with "Multiple head revisions are present". Write the check yourself. Each migration has a <code>revision</code> id and a <code>down_revision</code>: <code>""</code> for the first migration, one id, or several ids joined by commas for a <b>merge</b> revision (e.g. <code>"b2,c3"</code>).</p>
      <p>Write <code>alembic_heads(revisions, down_revisions)</code> returning every head: a revision that no other revision lists as its parent. Order does not matter.</p>`,
    constraints: `<p>0 ≤ revisions ≤ 10<sup>4</sup>; ids are unique, non-empty and contain no commas.</p>`,
    example: `<p>revisions ["a", "b", "c"], downs ["", "a", "a"] → ${H.c('r', '["b", "c"]')}: two branches from a. Add "m" with down "b,c" → ${H.c('g', '["m"]')}: the merge revision joins them.</p>`,
    brute: {
      why: `<p>For each revision, scan every other revision's parents: O(n²). With a few hundred migrations that is fine, but it is the same answer as one pass with a set.</p>`,
      code: `def alembic_heads_slow(revisions, down_revisions):
    heads = []
    for r in revisions:
        if not any(r in d.split(",") for d in down_revisions):
            heads.append(r)
    return heads`
    },
    mcq: {
      q: 'Two branches both revise <code>a1</code>. What does <code>alembic merge heads</code> create?',
      options: ['It deletes one branch', 'A new revision whose <code>down_revision</code> is a tuple of both heads', 'It renames the revisions', 'It rewrites both files'],
      answer: 1,
      explain: 'A merge revision has two parents, so the graph has a single head again; its upgrade() is usually empty.'
    },
    hints: [
      'Hint 1: a head is a node with no children. Collect every id that appears as anyone\'s parent.',
      'Hint 2: split each down_revision on commas; ignore empty strings (the root has no parent).',
      'Hint 3: heads = revisions that are not in the parent set. One pass to build the set, one pass to filter.'
    ],
    solution: {
      approach: `<p>The migration history is a directed acyclic graph with edges parent → child. A head has out-degree zero. Build the set of all ids that appear as a parent (splitting merge parents on commas), then keep revisions not in that set. More than one head means branches that need <code>alembic merge heads</code>; zero heads with revisions present would mean a cycle, which Alembic rejects.</p>`,
      code: `def alembic_heads(revisions, down_revisions):
    parents = set()
    for down in down_revisions:
        for p in down.split(","):
            if p:
                parents.add(p.strip())
    return [r for r in revisions if r not in parents]`,
      complexity: `<p>O(n + m) for n revisions and m parent references; O(n) extra space.</p>`,
      followUps: ['Write a CI step that fails when there is more than one head.', 'How would you compute the upgrade order from base to a given head?']
    },
    tests: { fn: 'alembicHeads', sig: 'string[] string[] -> string[]', cmp: 'set', cases: [
      [[['a', 'b', 'c'], ['', 'a', 'b']], ['c']],
      [[['a', 'b', 'c'], ['', 'a', 'a']], ['b', 'c']],
      [[['a', 'b', 'c', 'm'], ['', 'a', 'a', 'b,c']], ['m']],
      [[[], []], []],
      [[['a'], ['']], ['a']],
      [[['a', 'b'], ['', '']], ['a', 'b']],
      [[['a', 'b', 'c', 'd'], ['', 'a', 'b', 'b']], ['c', 'd']]
    ] }
  });

  practice.push({
    title: 'Optimistic locking with a version column',
    level: 'Medium',
    tags: ['optimistic locking', 'concurrency', 'sqlite3'],
    companies: ['Notion', 'Figma', 'Atlassian'],
    statement: `<p>A settings document is edited from several browser tabs. Each tab loads the document with its <b>version</b>, and sends the version it read with its edit. An edit is accepted only if nobody saved in between; otherwise the client must reload (HTTP 409).</p>
      <p>Write <code>apply_edits(initial, edits)</code>. The document starts with value <code>initial</code> and version 1. Each edit is <code>[read_version, new_value]</code>. Apply them in order against an in-memory <code>sqlite3</code> table using a conditional UPDATE. Return <code>[final_value, final_version, rejected_count]</code>.</p>`,
    constraints: `<p>0 ≤ edits ≤ 10<sup>4</sup>. Versions start at 1 and grow by 1 per accepted edit.</p>`,
    example: `<p>initial 10, edits [[1, 20], [1, 30], [2, 40]] → ${H.c('g', '[40, 3, 1]')}. Edit 1 matches version 1 → value 20, version 2. Edit 2 still claims version 1 → 0 rows updated → ${H.c('r', 'rejected')}. Edit 3 read version 2 → value 40, version 3.</p>`,
    brute: {
      why: `<p>"Last write wins" (an unconditional UPDATE) silently overwrites the other tab's change. Reading the version in Python and then updating in a separate statement has a race window between the check and the write.</p>`,
      code: `import sqlite3


def apply_edits_last_write_wins(initial, edits):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE docs (id INTEGER PRIMARY KEY, value INTEGER, version INTEGER)")
    con.execute("INSERT INTO docs VALUES (1, ?, 1)", (initial,))
    for _, value in edits:
        con.execute("UPDATE docs SET value = ?, version = version + 1 WHERE id = 1", (value,))
    return list(con.execute("SELECT value, version FROM docs").fetchone()) + [0]`
    },
    mcq: {
      q: 'With <code>__mapper_args__ = {"version_id_col": version}</code>, what does SQLAlchemy do when the UPDATE matches 0 rows?',
      options: ['Retries automatically', 'Raises <code>StaleDataError</code>', 'Inserts a new row', 'Ignores it'],
      answer: 1,
      explain: 'The ORM adds <code>AND version = :old</code> to the UPDATE and checks the row count; 0 rows means a concurrent change, so it raises StaleDataError.'
    },
    hints: [
      'Hint 1: put the check inside the write: <code>UPDATE docs SET value = ?, version = version + 1 WHERE id = 1 AND version = ?</code>.',
      'Hint 2: <code>cursor.rowcount</code> tells you whether the edit won (1) or lost (0). No separate SELECT is needed, so there is no race window.',
      'Hint 3: count rejections, commit after each statement (each edit is its own request), and read the final row at the end.'
    ],
    solution: {
      approach: `<p>Compare-and-set in SQL: the UPDATE only matches if the version is still the one the client read, and bumps it in the same statement. Row count 1 means accepted; 0 means someone else saved first, which the API maps to 409 Conflict with the current version so the client can merge or reload. This is exactly what SQLAlchemy's <code>version_id_col</code> generates. No locks are held between "load" and "save", which suits long human edit sessions.</p>`,
      code: `import sqlite3


def apply_edits(initial, edits):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE docs (id INTEGER PRIMARY KEY, value INTEGER NOT NULL, version INTEGER NOT NULL)")
    con.execute("INSERT INTO docs (id, value, version) VALUES (1, ?, 1)", (initial,))
    con.commit()
    rejected = 0
    for read_version, new_value in edits:
        with con:                                     # each edit is its own transaction
            cur = con.execute(
                "UPDATE docs SET value = ?, version = version + 1 "
                "WHERE id = 1 AND version = ?",
                (new_value, read_version),
            )
        if cur.rowcount == 0:                          # someone saved in between
            rejected += 1
    value, version = con.execute("SELECT value, version FROM docs WHERE id = 1").fetchone()
    con.close()
    return [value, version, rejected]`,
      complexity: `<p>O(e) statements for e edits, each an O(log n) primary-key update; no locks held between requests.</p>`,
      followUps: ['How would the FastAPI endpoint use <code>If-Match</code> / ETag headers for the version?', 'When is pessimistic locking (FOR UPDATE) the better choice?']
    },
    tests: { fn: 'applyEdits', sig: 'int int[][] -> int[]', cases: [
      [[10, [[1, 20], [1, 30], [2, 40]]], [40, 3, 1]],
      [[5, []], [5, 1, 0]],
      [[0, [[2, 9]]], [0, 1, 1]],
      [[1, [[1, 2], [2, 3], [3, 4]]], [4, 4, 0]],
      [[7, [[1, 8], [1, 9], [1, 10]]], [8, 2, 2]],
      [[3, [[0, 1], [1, 5]]], [5, 2, 1]]
    ] }
  });

  practice.push({
    title: 'Backfill a column in keyset batches',
    level: 'Medium',
    tags: ['data migration', 'batching', 'keyset'],
    companies: ['Shopify', 'Instacart'],
    statement: `<p>You added a nullable <code>status</code> column and must fill it on a big table without one giant UPDATE. Walk the table by primary key in batches of <code>batch</code> rows (keyset: "the next <code>batch</code> ids after the last one I processed"), and in each batch set <code>status = 'active'</code> only where it is still NULL. Commit every batch.</p>
      <p>Write <code>backfill_batches(ids, already, batch)</code>: the table has rows with the given <code>ids</code>; rows whose id is in <code>already</code> have a status already. Return the number of rows updated in each batch, in order (a batch may update 0 rows).</p>`,
    constraints: `<p>0 ≤ rows ≤ 10<sup>5</sup>, ids unique and positive (may have gaps), 1 ≤ batch ≤ 10<sup>4</sup>.</p>`,
    example: `<p>ids [1, 2, 3, 10, 11], already [], batch 2 → batches {1, 2}, {3, 10}, {11} → ${H.c('g', '[2, 2, 1]')}. Id gaps do not matter because batches are "next N ids", not "id ranges of width N".</p>`,
    brute: {
      why: `<p>One <code>UPDATE ... WHERE status IS NULL</code> on 50M rows runs as a single huge transaction: it locks every row it touches for minutes, can blow up replication lag, and on failure rolls everything back. OFFSET-based batching gets slower with each batch and can skip rows.</p>`,
      code: `import sqlite3


def backfill_one_shot(ids, already, batch):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, status TEXT)")
    con.executemany("INSERT INTO users VALUES (?, ?)", [(i, "set" if i in already else None) for i in ids])
    with con:
        n = con.execute("UPDATE users SET status = 'active' WHERE status IS NULL").rowcount
    return [n] if ids else []`
    },
    mcq: {
      q: 'Why batch by "the next N ids after the last one" instead of <code>OFFSET</code>?',
      options: ['OFFSET is not valid SQL', 'Keyset seeks straight to the next ids via the primary key index; OFFSET re-scans skipped rows and shifts as rows change', 'It uses less disk', 'There is no difference'],
      answer: 1,
      explain: 'Keyset batches cost the same at the start and the end of the table, and never skip or repeat rows.'
    },
    hints: [
      'Hint 1: keep <code>last_id = 0</code>. Each batch: <code>SELECT id FROM users WHERE id &gt; ? ORDER BY id LIMIT ?</code>.',
      'Hint 2: update only those ids that are still NULL: <code>UPDATE users SET status = \'active\' WHERE id BETWEEN ? AND ? AND status IS NULL</code> using the first and last id of the batch. Record <code>rowcount</code>.',
      'Hint 3: set <code>last_id</code> to the batch\'s last id and stop when the SELECT returns no rows. Commit after each batch.'
    ],
    solution: {
      approach: `<p>A keyset loop over the primary key: fetch the next <code>batch</code> ids after the cursor, update the NULLs among them in one short transaction, advance the cursor, repeat. The <code>status IS NULL</code> guard makes the backfill <b>idempotent</b>: if it crashes half-way you simply run it again. In an Alembic data migration you run this loop inside <code>op.get_context().autocommit_block()</code> (or as a separate job), using <code>op.get_bind().execute(sa.text(...))</code>.</p>`,
      code: `import sqlite3


def backfill_batches(ids, already, batch):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, status TEXT)")
    done = set(already)
    con.executemany("INSERT INTO users (id, status) VALUES (?, ?)",
                    [(i, "set" if i in done else None) for i in ids])
    con.commit()
    counts, last_id = [], 0
    while True:
        rows = con.execute("SELECT id FROM users WHERE id > ? ORDER BY id LIMIT ?",
                           (last_id, batch)).fetchall()
        if not rows:
            break
        lo, hi = rows[0][0], rows[-1][0]
        with con:                                          # one short transaction per batch
            cur = con.execute("UPDATE users SET status = 'active' "
                              "WHERE id BETWEEN ? AND ? AND status IS NULL", (lo, hi))
        counts.append(cur.rowcount)
        last_id = hi
    con.close()
    return counts`,
      complexity: `<p>⌈n / batch⌉ batches, each O(batch + log n) via the primary-key index; total O(n). Lock time per transaction is bounded by the batch size.</p>`,
      followUps: ['How would you throttle the backfill to protect replicas (sleep, or watch replication lag)?', 'How do you report progress and resume after a crash?']
    },
    tests: { fn: 'backfillBatches', sig: 'int[] int[] int -> int[]', cases: [
      [[[1, 2, 3, 10, 11], [], 2], [2, 2, 1]],
      [[[1, 2, 3, 4], [2], 2], [1, 2]],
      [[[], [], 3], []],
      [[[5], [5], 1], [0]],
      [[[1, 2, 3, 4, 5, 6], [1, 2, 3], 3], [0, 3]],
      [[[100, 7, 50], [], 5], [3]]
    ] }
  });

  practice.push({
    title: 'Choose isolation and locking for seat booking',
    level: 'Medium',
    tags: ['isolation', 'locking', 'design'],
    companies: ['Booking.com', 'Ticketmaster', 'Airbnb'],
    statement: `<p>A concert app sells numbered seats. Two fans must never get the same seat. A second rule: one account may hold <b>at most 4 seats</b> per concert. Traffic spikes to thousands of requests per second when sales open. Using PostgreSQL and SQLAlchemy, choose how to enforce each rule (constraints, isolation level, locks) and write the booking function.</p>`,
    constraints: `<p>PostgreSQL 16, READ COMMITTED default, SQLAlchemy 2.0 sync sessions. Booking must answer within 200 ms at peak.</p>`,
    example: `<p>Fans A and B both click seat 12 at the same instant: exactly one gets <code>201</code>, the other ${H.c('r', '409 seat taken')}. Fan C already holds 4 seats and tries a 5th: ${H.c('r', '409 limit reached')}, even if C sends 3 requests in parallel.</p>`,
    brute: {
      why: `<p>"Check, then insert" in Python under READ COMMITTED: both requests see seat 12 free and both insert, and three parallel requests from C each count 3 held seats and all succeed. Switching the whole app to SERIALIZABLE fixes it but causes many retries at peak and slows everything.</p>`,
      code: `from sqlalchemy import func, select


def book_naive(db, concert_id, seat, account_id):
    taken = db.scalar(select(Booking).where(Booking.concert_id == concert_id, Booking.seat == seat))
    held = db.scalar(select(func.count()).select_from(Booking)
                     .where(Booking.concert_id == concert_id, Booking.account_id == account_id))
    if taken is None and held < 4:
        db.add(Booking(concert_id=concert_id, seat=seat, account_id=account_id))
        db.commit()`
    },
    mcq: {
      q: 'What is the most reliable way to guarantee "one booking per seat"?',
      options: ['A Python check before insert', 'A UNIQUE constraint on (concert_id, seat)', 'SERIALIZABLE isolation for the whole app', 'A cache'],
      answer: 1,
      explain: 'A unique constraint is enforced by the database for every writer at any isolation level; the loser gets an IntegrityError you map to 409.'
    },
    hints: [
      'Hint 1: rule 1 is a uniqueness rule on one row: let a <code>UNIQUE (concert_id, seat)</code> constraint enforce it and translate <code>IntegrityError</code> to 409.',
      'Hint 2: rule 2 spans several rows (a count), which a unique constraint cannot express. Serialise per account: lock that account\'s row (or a per-(account, concert) counter row) with <code>with_for_update()</code> before counting.',
      'Hint 3: keep READ COMMITTED for speed; lock only the one account row, keep the transaction tiny, and never call payments inside it.'
    ],
    solution: {
      approach: `<p><b>Seat uniqueness</b>: a <code>UNIQUE (concert_id, seat)</code> constraint. The database arbitrates races for free; the loser's INSERT fails and the API returns 409. <b>Per-account limit</b>: a cross-row invariant, the classic write-skew case. Instead of SERIALIZABLE everywhere, serialise only the competing requests: lock the account's row for this concert with <code>SELECT ... FOR UPDATE</code> (a small <code>account_concert_holds</code> row with a counter works well), check and increment the counter, insert the booking, commit. Parallel requests from the same account queue for a few milliseconds; different accounts never block each other. A <code>CHECK (held &lt;= 4)</code> on the counter is a final safety net. Payment happens after commit with a pending → paid status and a hold expiry.</p>`,
      code: `from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.db import Base


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (UniqueConstraint("concert_id", "seat", name="uq_bookings_concert_seat"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    concert_id: Mapped[int] = mapped_column(ForeignKey("concerts.id"))
    seat: Mapped[int]
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)


class AccountConcertHold(Base):
    __tablename__ = "account_concert_holds"
    __table_args__ = (CheckConstraint("held <= 4", name="ck_holds_max_four"),)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), primary_key=True)
    concert_id: Mapped[int] = mapped_column(ForeignKey("concerts.id"), primary_key=True)
    held: Mapped[int] = mapped_column(default=0)


class BookingRejected(Exception):
    pass


def book(db: Session, concert_id: int, seat: int, account_id: int) -> Booking:
    try:
        with db.begin():
            hold = db.scalars(
                select(AccountConcertHold)
                .where(AccountConcertHold.account_id == account_id,
                       AccountConcertHold.concert_id == concert_id)
                .with_for_update()                    # serialise this account only
            ).one_or_none()
            if hold is None:
                hold = AccountConcertHold(account_id=account_id, concert_id=concert_id, held=0)
                db.add(hold)
            if hold.held >= 4:
                raise BookingRejected("limit reached")
            hold.held += 1
            booking = Booking(concert_id=concert_id, seat=seat, account_id=account_id)
            db.add(booking)
            db.flush()                                # UNIQUE (concert_id, seat) fires here
        return booking
    except IntegrityError as exc:                     # seat taken (or a racing first hold insert)
        raise BookingRejected("seat taken or retry") from exc`,
      complexity: `<p>Per booking: one locked primary-key read, one counter update, one insert, all O(log n). Contention only between requests of the same account.</p>`,
      followUps: ['Two first-time requests from the same account both find no hold row. What happens, and how do you make that path race-free (INSERT ... ON CONFLICT DO NOTHING first)?', 'How would you expire unpaid holds after 10 minutes?']
    },
    tests: { skip: 'ORM wiring, verified by reading' }
  });

  practice.push({
    title: 'Fix the N+1 hidden in a response model',
    level: 'Medium',
    tags: ['N+1', 'FastAPI', 'eager loading'],
    companies: ['Stack Overflow', 'Discord'],
    statement: `<p><code>GET /posts</code> returns 20 posts. Each item includes the author's name and the list of tags. The endpoint code runs one query, yet the database log shows 41 queries per request. Explain where the other 40 come from and fix it.</p>
      <pre><code>class PostOut(BaseModel):
    id: int
    title: str
    author: AuthorOut          # many-to-one
    tags: list[TagOut]         # many-to-many
    model_config = {"from_attributes": True}

@router.get("/posts", response_model=list[PostOut])
def list_posts(db: Db):
    return db.scalars(select(Post).order_by(Post.id.desc()).limit(20)).all()</code></pre>`,
    constraints: `<p>SQLAlchemy 2.0, FastAPI, Pydantic v2. Keep the response shape.</p>`,
    example: `<p>1 query for posts + 20 lazy loads of <code>post.author</code> + 20 lazy loads of <code>post.tags</code> = ${H.c('r', '41')}. They happen while Pydantic serialises the response, after <code>list_posts</code> returned. Fixed: ${H.c('g', '2 queries')}.</p>`,
    brute: {
      why: `<p>Setting <code>lazy="joined"</code> on both relationships in the model "fixes" this endpoint but makes every other query on <code>Post</code> join authors and tags too, including bulk jobs that never need them, and joined many-to-many collections multiply rows.</p>`,
      code: `from sqlalchemy.orm import Mapped, relationship


class PostEverywhereJoined:
    # applied globally in the model: every Post query now joins two more tables
    author: Mapped["Author"] = relationship(lazy="joined")
    tags: Mapped[list["Tag"]] = relationship(secondary="post_tags", lazy="joined")`
    },
    mcq: {
      q: 'When do the lazy loads in this endpoint run?',
      options: ['Inside the SELECT for posts', 'During response serialisation, when Pydantic reads <code>post.author</code> and <code>post.tags</code>', 'At commit', 'Never'],
      answer: 1,
      explain: '<code>from_attributes</code> makes Pydantic read each attribute of each ORM object; unloaded relationships trigger a SELECT on first access.'
    },
    hints: [
      'Hint 1: look at every relationship the response model reads: <code>author</code> (to-one) and <code>tags</code> (to-many).',
      'Hint 2: load them with the query: <code>joinedload(Post.author)</code> for the to-one, <code>selectinload(Post.tags)</code> for the collection.',
      'Hint 3: add <code>raiseload("*")</code> so a future field added to <code>PostOut</code> without a loader fails in tests instead of silently adding queries.'
    ],
    solution: {
      approach: `<p>The endpoint returns ORM objects; FastAPI validates them into <code>PostOut</code>, reading <code>post.author</code> and <code>post.tags</code> on each of the 20 posts, each a lazy SELECT. Declare the loading on the query that feeds this response: <code>joinedload</code> for the many-to-one author (same query, no row multiplication), <code>selectinload</code> for tags (one IN query). <code>raiseload("*")</code> turns any future unplanned relationship read into an error. Result: 2 queries for any page size.</p>`,
      code: `from sqlalchemy import select
from sqlalchemy.orm import joinedload, raiseload, selectinload

from app.models import Post


@router.get("/posts", response_model=list[PostOut])
def list_posts(db: Db) -> list[Post]:
    stmt = (
        select(Post)
        .options(
            joinedload(Post.author),        # many-to-one: JOIN in the same query
            selectinload(Post.tags),        # many-to-many: one IN query
            raiseload("*"),                 # anything else the response reads: error
        )
        .order_by(Post.id.desc())
        .limit(20)
    )
    return list(db.scalars(stmt))`,
      complexity: `<p>2 queries per request regardless of page size (instead of 2n + 1).</p>`,
      followUps: ['Write a test asserting the endpoint sends at most 2 queries for 5 and for 50 posts.', 'How would you also return a comment count per post without loading comments?']
    },
    tests: { skip: 'ORM wiring, verified by reading' }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Import rows, skipping bad ones, with savepoints',
    level: 'Hard',
    tags: ['savepoints', 'transactions', 'sqlite3'],
    companies: ['Salesforce', 'HubSpot'],
    statement: `<p>A CSV import must load every valid row and skip invalid ones, but the import as a whole must be <b>one transaction</b> (if the process crashes, nothing is half-imported). The table is <code>items(v INTEGER NOT NULL UNIQUE CHECK (v &gt;= 0))</code>: negative values and duplicates are invalid, and only the database knows about duplicates already stored.</p>
      <p>Write <code>import_rows(values)</code> using an in-memory <code>sqlite3</code> database: one outer transaction, a <b>SAVEPOINT per row</b>, roll back to the savepoint when a row violates a constraint, then commit once. Return the stored values in insertion order.</p>`,
    constraints: `<p>0 ≤ values ≤ 10<sup>4</sup>. Let the constraints decide validity; do not pre-filter in Python.</p>`,
    example: `<p>[1, 2, -1, 2, 3] → ${H.c('g', '[1, 2, 3]')}. −1 fails the CHECK and 2 (second time) fails UNIQUE; each failure rolls back only its own savepoint, so 1, 2 and 3 survive and are committed together.</p>`,
    brute: {
      why: `<p>Without savepoints, the first constraint error aborts the whole transaction (on PostgreSQL every later statement fails with "current transaction is aborted"), so you either lose all rows or commit each row separately and lose atomicity. Pre-filtering in Python misses duplicates already in the table and races with concurrent imports.</p>`,
      code: `import sqlite3


def import_rows_all_or_nothing(values):
    con = sqlite3.connect(":memory:", isolation_level=None)
    con.execute("CREATE TABLE items (v INTEGER NOT NULL UNIQUE CHECK (v >= 0))")
    con.execute("BEGIN")
    try:
        for v in values:
            con.execute("INSERT INTO items (v) VALUES (?)", (v,))
        con.execute("COMMIT")
    except sqlite3.IntegrityError:
        con.execute("ROLLBACK")              # one bad row loses everything
    return [v for (v,) in con.execute("SELECT v FROM items ORDER BY rowid")]`
    },
    mcq: {
      q: 'In SQLAlchemy, how do you get a savepoint around one row inside a larger transaction?',
      options: ['<code>session.commit()</code> after each row', '<code>with session.begin_nested(): ...</code>', '<code>session.rollback()</code>', 'A new session per row'],
      answer: 1,
      explain: '<code>begin_nested()</code> emits SAVEPOINT; an exception inside rolls back to it, leaving the outer transaction usable.'
    },
    hints: [
      'Hint 1: open the connection with <code>isolation_level=None</code> so you control <code>BEGIN</code>, <code>SAVEPOINT</code>, <code>RELEASE</code> and <code>COMMIT</code> yourself.',
      'Hint 2: per row: <code>SAVEPOINT row</code>, INSERT, <code>RELEASE row</code>; on <code>IntegrityError</code>: <code>ROLLBACK TO row</code> and <code>RELEASE row</code>.',
      'Hint 3: one <code>COMMIT</code> at the end; read back with <code>ORDER BY rowid</code> to keep insertion order. For performance on huge files, use one savepoint per batch and fall back to per-row only for failing batches.'
    ],
    solution: {
      approach: `<p>Savepoints give "partial rollback" inside one transaction. Each row is attempted inside its own savepoint; a constraint violation rolls back to it and the outer transaction stays healthy. Constraints remain the single source of truth for validity, including duplicates against existing data. The SQLAlchemy shape is identical: <code>with session.begin():</code> outside, <code>with session.begin_nested():</code> plus <code>session.flush()</code> per row, catching <code>IntegrityError</code>. Savepoints cost a little per row, so for millions of rows use batch savepoints and retry only the failing batch row by row.</p>`,
      code: `import sqlite3


def import_rows(values):
    con = sqlite3.connect(":memory:", isolation_level=None)   # explicit transaction control
    con.execute("CREATE TABLE items (v INTEGER NOT NULL UNIQUE CHECK (v >= 0))")
    con.execute("BEGIN")
    for v in values:
        con.execute("SAVEPOINT row")
        try:
            con.execute("INSERT INTO items (v) VALUES (?)", (v,))
            con.execute("RELEASE row")
        except sqlite3.IntegrityError:
            con.execute("ROLLBACK TO row")     # undo just this row
            con.execute("RELEASE row")
    con.execute("COMMIT")                      # everything valid, atomically
    out = [v for (v,) in con.execute("SELECT v FROM items ORDER BY rowid")]
    con.close()
    return out


def import_rows_sqlalchemy(session, values):
    """Same structure with SQLAlchemy 2.0 (session is a Session)."""
    from sqlalchemy.exc import IntegrityError   # imported here: stdlib core above needs no install
    from app.models import Item

    with session.begin():
        for v in values:
            try:
                with session.begin_nested():
                    session.add(Item(v=v))
                    session.flush()
            except IntegrityError:
                pass`,
      complexity: `<p>O(n log n): one indexed insert and two savepoint statements per row, one commit in total.</p>`,
      followUps: ['Return a per-row error report (row number and constraint name) for the UI.', 'How does <code>INSERT ... ON CONFLICT DO NOTHING</code> change the design for duplicates?']
    },
    tests: { fn: 'importRows', sig: 'int[] -> int[]', cases: [
      [[[1, 2, -1, 2, 3]], [1, 2, 3]],
      [[[]], []],
      [[[-5]], []],
      [[[0, 0, 0]], [0]],
      [[[5, 4, 3]], [5, 4, 3]],
      [[[7, -1, 7, 8, -2, 9]], [7, 8, 9]]
    ] }
  });

  practice.push({
    title: 'Detect N+1 patterns in a query log',
    level: 'Hard',
    tags: ['N+1', 'observability', 'parsing'],
    companies: ['Datadog', 'Sentry', 'New Relic'],
    statement: `<p>Build the core of an N+1 detector like the ones in APM tools. Given the SQL statements one request sent, <b>normalise</b> each into a "shape" and report shapes that repeat at least <code>threshold</code> times.</p>
      <p>Normalisation: replace every single-quoted string literal (<code>'...'</code>) with <code>?</code>; replace every number that is not part of an identifier (a run of digits whose previous character is not a letter, digit or underscore, e.g. <code>= 42</code> but not <code>t1</code>) with <code>?</code>; collapse runs of spaces to one space and trim. Write <code>find_n_plus_one(queries, threshold)</code> returning offending shapes in order of first appearance.</p>`,
    constraints: `<p>0 ≤ queries ≤ 10<sup>4</sup>, each ≤ 2,000 characters; string literals contain no escaped quotes; 1 ≤ threshold.</p>`,
    example: `<p>["SELECT * FROM authors", "SELECT * FROM books WHERE author_id = 1", "... = 2", "... = 3"], threshold 3 → ${H.c('r', '["SELECT * FROM books WHERE author_id = ?"]')}. Three statements with the same shape and different ids is the N+1 fingerprint.</p>`,
    brute: {
      why: `<p>Counting exact SQL strings finds nothing, because each lazy load has a different id. Comparing every pair of queries for "similarity" is O(n²) and fuzzy. Normalising to a shape and counting with a dict is linear and precise.</p>`,
      code: `def find_exact_repeats(queries, threshold):
    counts = {}
    for q in queries:
        counts[q] = counts.get(q, 0) + 1
    return [q for q, c in counts.items() if c >= threshold]   # misses N+1: ids differ`
    },
    mcq: {
      q: 'Why must <code>t1</code> in <code>SELECT t1.id FROM t1</code> stay unchanged during normalisation?',
      options: ['It is a keyword', 'It is part of an identifier (a table alias); replacing its digit would merge unrelated shapes and break readability', 'SQLite requires it', 'It does not matter'],
      answer: 1,
      explain: 'Only literal values vary between N+1 statements; identifiers are part of the shape.'
    },
    hints: [
      'Hint 1: scan characters with an index. Inside a quote, skip to the closing quote and emit <code>?</code>.',
      'Hint 2: at a digit, look at the previous character: if it is a letter, digit or underscore, it is part of an identifier, so copy it; otherwise consume the whole digit run (and a decimal part) and emit <code>?</code>.',
      'Hint 3: after building the string, <code>" ".join(s.split())</code> collapses whitespace. Count shapes in an insertion-ordered dict and return those with count ≥ threshold.'
    ],
    solution: {
      approach: `<p>A single left-to-right scanner turns each statement into its shape: quoted literals become <code>?</code>, standalone numbers become <code>?</code>, identifiers are copied as-is, and whitespace is normalised. A dict (which preserves insertion order) counts shapes, giving the first-appearance order for free. In a real app you feed this from a SQLAlchemy <code>before_cursor_execute</code> listener per request (where statements are already parameterised, making shapes even easier) and log a warning or fail a test when a shape repeats.</p>`,
      code: `def normalise(sql):
    out = []
    i, n = 0, len(sql)
    while i < n:
        ch = sql[i]
        if ch == "'":                                  # string literal -> ?
            j = sql.find("'", i + 1)
            i = n if j == -1 else j + 1
            out.append("?")
        elif ch.isdigit():
            prev = sql[i - 1] if i > 0 else " "
            if prev.isalnum() or prev == "_":          # part of an identifier like t1
                out.append(ch)
                i += 1
            else:                                      # a numeric literal -> ?
                while i < n and (sql[i].isdigit() or sql[i] == "."):
                    i += 1
                out.append("?")
        else:
            out.append(ch)
            i += 1
    return " ".join("".join(out).split())


def find_n_plus_one(queries, threshold):
    counts = {}
    for q in queries:
        shape = normalise(q)
        counts[shape] = counts.get(shape, 0) + 1
    return [shape for shape, c in counts.items() if c >= threshold]`,
      complexity: `<p>O(total characters) time; O(distinct shapes) space.</p>`,
      followUps: ['Hook this into a pytest fixture with SQLAlchemy events so tests fail on N+1.', 'How would you also flag "same shape, sequential, within one request" vs repeated across requests?']
    },
    tests: { fn: 'findNPlusOne', names: { python: 'find_n_plus_one' }, sig: 'string[] int -> string[]', cases: [
      [[['SELECT * FROM authors', 'SELECT * FROM books WHERE author_id = 1', 'SELECT * FROM books WHERE author_id = 2', 'SELECT * FROM books WHERE author_id = 3'], 3], ['SELECT * FROM books WHERE author_id = ?']],
      [[['SELECT * FROM authors', 'SELECT * FROM books WHERE author_id = 1', 'SELECT * FROM books WHERE author_id = 2', 'SELECT * FROM books WHERE author_id = 3'], 4], []],
      [[[], 2], []],
      [[["SELECT name FROM users WHERE email = 'a@x'", "SELECT name FROM users WHERE email = 'b@y'"], 2], ['SELECT name FROM users WHERE email = ?']],
      [[['SELECT t1.id FROM t1 WHERE t1.x = 10', 'SELECT t1.id FROM t1 WHERE t1.x = 20', 'SELECT 1'], 2], ['SELECT t1.id FROM t1 WHERE t1.x = ?']],
      [[['SELECT  *  FROM a WHERE id=1', 'SELECT * FROM a WHERE id=2'], 2], ['SELECT * FROM a WHERE id=?']],
      [[['A 1', 'B 2', 'A 3', 'B 4', 'A 5'], 2], ['A ?', 'B ?']],
      [[['SELECT 1', 'SELECT 1'], 2], ['SELECT ?']]
    ] }
  });

  practice.push({
    title: 'Rename a column with zero downtime',
    level: 'Hard',
    tags: ['alembic', 'expand-contract', 'deploys'],
    companies: ['Stripe', 'GitHub', 'Shopify'],
    statement: `<p>Rename <code>users.fullname</code> to <code>users.display_name</code> on a 20M-row PostgreSQL table while the API keeps serving traffic. Deploys are rolling (old and new pods overlap for ~5 minutes), and any release must be revertible by redeploying the previous image. Write the sequence of releases with their Alembic migrations and the app-side changes.</p>`,
    constraints: `<p>PostgreSQL 16, SQLAlchemy 2.0 models, Alembic, rolling deploys, no maintenance window.</p>`,
    example: `<p>Bare <code>op.alter_column("users", "fullname", new_column_name="display_name")</code> is instant in the database, but for 5 minutes the ${H.c('r', 'old pods query "fullname" and crash with UndefinedColumn')}. Revert is also impossible without another rename.</p>`,
    brute: {
      why: `<p>A single-step rename couples the schema change and the code change into one instant, which rolling deploys cannot provide: some pods always run the other version. Old pods fail every request touching users until they are replaced.</p>`,
      code: `from alembic import op

revision = "r1"
down_revision = "r0"


def upgrade() -> None:
    op.alter_column("users", "fullname", new_column_name="display_name")   # breaks old pods


def downgrade() -> None:
    op.alter_column("users", "display_name", new_column_name="fullname")`
    },
    mcq: {
      q: 'Why does every expand/contract step keep the schema compatible with the previous app version?',
      options: ['To save disk space', 'Because during a rolling deploy (and after a revert) the previous version runs against the new schema', 'Alembic requires it', 'For faster migrations'],
      answer: 1,
      explain: 'Old and new code overlap during deploys, and reverting means old code meets the newest schema. Each step must work for both.'
    },
    hints: [
      'Hint 1: split it into expand (add the new column), migrate (dual-write and backfill), switch reads, and contract (drop the old column), each in its own release.',
      'Hint 2: dual writes can live in the app (set both attributes) or in a database trigger; a trigger also covers scripts that bypass the app.',
      'Hint 3: backfill in keyset batches with <code>WHERE display_name IS NULL</code>; set NOT NULL using the <code>NOT VALID</code> check trick; drop the old column only after no running code reads it.'
    ],
    solution: {
      approach: `<p><b>Release 1 (expand)</b>: migration adds nullable <code>display_name</code> and a trigger that copies <code>fullname</code> into it on insert/update; the app still reads and writes <code>fullname</code>. <b>Release 2 (backfill)</b>: a batched data migration copies old rows where <code>display_name IS NULL</code>. <b>Release 3 (switch)</b>: the model maps the Python attribute to the new column; the app writes both columns and reads the new one; a migration sets NOT NULL via a validated check. <b>Release 4 (contract)</b>: drop the trigger, then drop <code>fullname</code>. At every boundary, the previous image still works against the schema, so any single release can be reverted by redeploying the prior image.</p>`,
      code: `"""rename users.fullname -> display_name, release 1: expand

Revision ID: 8d2f0c1a7b33
Revises: 7c1e2a9b4d10
"""
from alembic import op
import sqlalchemy as sa

revision = "8d2f0c1a7b33"
down_revision = "7c1e2a9b4d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("SET lock_timeout = '5s'")
    op.add_column("users", sa.Column("display_name", sa.String(200), nullable=True))
    # Keep the new column in sync for writes from OLD code during the transition.
    op.execute("""
        CREATE OR REPLACE FUNCTION users_sync_display_name() RETURNS trigger AS $body$
        BEGIN
            IF NEW.display_name IS NULL THEN
                NEW.display_name := NEW.fullname;
            END IF;
            RETURN NEW;
        END
        $body$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_users_sync_display_name
        BEFORE INSERT OR UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION users_sync_display_name();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_users_sync_display_name ON users")
    op.execute("DROP FUNCTION IF EXISTS users_sync_display_name()")
    op.drop_column("users", "display_name")`,
      alt: [
        { lang: 'python', title: 'Releases 2-4: backfill, switch, contract', code: `"""rename, release 2: backfill in batches (idempotent)"""
from alembic import op
import sqlalchemy as sa

revision = "9e3a1d2b8c44"
down_revision = "8d2f0c1a7b33"


def upgrade() -> None:
    with op.get_context().autocommit_block():
        bind = op.get_bind()
        last = 0
        while True:
            ids = bind.execute(sa.text(
                "SELECT id FROM users WHERE id > :last ORDER BY id LIMIT 5000"), {"last": last}
            ).scalars().all()
            if not ids:
                break
            bind.execute(sa.text(
                "UPDATE users SET display_name = fullname "
                "WHERE id BETWEEN :lo AND :hi AND display_name IS NULL"),
                {"lo": ids[0], "hi": ids[-1]})
            last = ids[-1]


def downgrade() -> None:
    pass  # data copy only; nothing to undo


# --- app model in release 3: Python attribute now reads the new column ---
# class User(Base):
#     display_name: Mapped[str] = mapped_column("display_name", sa.String(200))
#     fullname: Mapped[str | None] = mapped_column("fullname", sa.String(200))  # still written
#
# --- release 4 migration (contract), after release 3 is fully rolled out ---
# op.execute("DROP TRIGGER IF EXISTS trg_users_sync_display_name ON users")
# op.execute("DROP FUNCTION IF EXISTS users_sync_display_name()")
# op.drop_column("users", "fullname")` }
      ],
      complexity: `<p>Expand and contract are instant DDL; the backfill is O(n) row writes in ⌈n / 5,000⌉ short transactions; the trigger adds a tiny cost per write during the transition.</p>`,
      followUps: ['What would change if the column were used in a unique index or a foreign key?', 'How do you verify release 3 is fully rolled out before running the contract migration?']
    },
    tests: { skip: 'ORM wiring, verified by reading' }
  });

  practice.push({
    title: 'A Postgres job queue with FOR UPDATE SKIP LOCKED (async)',
    level: 'Hard',
    tags: ['async', 'locking', 'SKIP LOCKED', 'workers'],
    companies: ['GitLab', 'Heroku', 'Render'],
    statement: `<p>You need a simple background job queue without adding Redis: a <code>jobs</code> table (<code>id, kind, payload JSON, status, attempts, run_after, locked_at</code>). Many async worker processes poll it. Each job must be processed by <b>exactly one</b> worker at a time; a crashed worker's job must be retried later; workers must not block each other. Write the model and the async claim/complete functions with SQLAlchemy 2.0 asyncio.</p>`,
    constraints: `<p>PostgreSQL 16, <code>AsyncSession</code> with asyncpg, 20 workers, jobs take 50 ms to 30 s.</p>`,
    example: `<p>Three workers poll at the same moment with 2 ready jobs: worker 1 claims job 7, worker 2 ${H.c('g', 'skips the locked row')} and claims job 8, worker 3 gets nothing and sleeps. If worker 1 dies mid-job, job 7 becomes claimable again after its lease expires.</p>`,
    brute: {
      why: `<p>"SELECT the oldest pending job, then UPDATE it to running" in two steps lets two workers pick the same job. Adding plain <code>FOR UPDATE</code> makes all workers queue behind the same row, so 20 workers process one job at a time. Holding the transaction open for the whole 30-second job pins a connection and a lock per worker.</p>`,
      code: `from sqlalchemy import select


async def claim_racy(db):
    job = (await db.scalars(select(Job).where(Job.status == "pending")
                            .order_by(Job.id).limit(1))).first()
    if job:                           # another worker may have selected the same row
        job.status = "running"
        await db.commit()
    return job`
    },
    mcq: {
      q: 'What does <code>with_for_update(skip_locked=True)</code> do when another worker has locked the oldest job?',
      options: ['Waits for it', 'Raises an error', 'Skips that row and returns the next unlocked one', 'Steals the lock'],
      answer: 2,
      explain: 'SKIP LOCKED makes each worker ignore rows locked by others, so workers spread across jobs instead of queueing on one row.'
    },
    hints: [
      'Hint 1: claim in one short transaction: select ready rows with <code>with_for_update(skip_locked=True)</code>, mark them <code>running</code> with <code>locked_at = now()</code>, commit, and only then do the work outside any transaction.',
      'Hint 2: "ready" means <code>status = \'pending\' AND run_after &lt;= now()</code>, or <code>status = \'running\'</code> with an expired lease (<code>locked_at &lt; now() - interval</code>) for crashed workers.',
      'Hint 3: index <code>(status, run_after)</code>; on failure increment <code>attempts</code> and set <code>run_after</code> with exponential backoff; after N attempts mark <code>dead</code>. Jobs must be idempotent because a lease can expire while a slow worker is still running.'
    ],
    solution: {
      approach: `<p>The claim is a tiny transaction: <code>SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1</code> over ready jobs (pending and due, or running with an expired lease), set <code>status='running'</code>, <code>locked_at=now()</code>, <code>attempts += 1</code>, commit. Concurrent workers skip each other's locked rows, so they never block and never double-claim. The work runs <b>without</b> an open transaction; completion is a second short transaction that sets <code>done</code>, or schedules a retry with backoff. A lease timeout recovers jobs from crashed workers, which is why handlers must be idempotent (at-least-once delivery; Python Backend V covers idempotent jobs in depth). Each worker task uses its own <code>AsyncSession</code>.</p>`,
      code: `import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import JSON, DateTime, Index, String, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, engine

LEASE = timedelta(minutes=5)
MAX_ATTEMPTS = 5
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (Index("ix_jobs_status_run_after", "status", "run_after"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(50))
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    attempts: Mapped[int] = mapped_column(default=0)
    run_after: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


async def claim(db: AsyncSession) -> Job | None:
    now = datetime.now(timezone.utc)
    async with db.begin():
        job = (await db.scalars(
            select(Job)
            .where(or_(
                (Job.status == "pending") & (Job.run_after <= now),
                (Job.status == "running") & (Job.locked_at < now - LEASE),   # crashed worker
            ))
            .order_by(Job.run_after, Job.id)
            .limit(1)
            .with_for_update(skip_locked=True)
        )).first()
        if job is not None:
            job.status, job.locked_at, job.attempts = "running", now, job.attempts + 1
    return job                         # lock released at commit; the lease protects the job now


async def finish(db: AsyncSession, job: Job, error: Exception | None) -> None:
    async with db.begin():
        if error is None:
            values = {"status": "done", "locked_at": None}
        elif job.attempts >= MAX_ATTEMPTS:
            values = {"status": "dead", "locked_at": None}
        else:
            backoff = timedelta(seconds=2 ** job.attempts)
            values = {"status": "pending", "locked_at": None,
                      "run_after": datetime.now(timezone.utc) + backoff}
        await db.execute(update(Job).where(Job.id == job.id).values(**values))


async def worker(handlers: dict, stop: asyncio.Event) -> None:
    while not stop.is_set():
        async with SessionLocal() as db:          # one session per worker task
            job = await claim(db)
            if job is None:
                await asyncio.sleep(1.0)
                continue
            try:
                await handlers[job.kind](job.payload)   # no transaction open during work
                await finish(db, job, None)
            except Exception as exc:
                await finish(db, job, exc)`,
      complexity: `<p>Claim and finish are O(log n) index operations in millisecond transactions; workers never wait on each other's locks, so throughput scales with workers until the handlers or the database become the bottleneck.</p>`,
      followUps: ['How would you use <code>LISTEN/NOTIFY</code> to avoid polling every second?', 'At what scale would you move to a dedicated queue (SQS, RabbitMQ, Kafka)?']
    },
    tests: { skip: 'ORM wiring, verified by reading' }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({
    q: 'What is the difference between <code>session.flush()</code> and <code>session.commit()</code>?',
    options: ['They are the same', 'flush sends pending SQL inside the open transaction; commit flushes and then makes the transaction permanent', 'flush closes the session; commit does not', 'commit only works after flush is called manually'],
    answer: 1,
    explain: 'After flush, rows exist inside your transaction (ids are assigned) but other connections cannot see them until commit.'
  });
  quiz.push({
    q: 'Inside one session, <code>a = session.get(User, 1)</code> and <code>b = session.get(User, 1)</code>. Which is true?',
    options: ['<code>a is b</code> and the second call sends no SQL', '<code>a == b</code> but they are different objects', 'Two SELECTs are always sent', 'The second call raises'],
    answer: 0,
    explain: 'The identity map guarantees one Python object per row per session; <code>get()</code> checks it before querying.'
  });
  quiz.push({
    q: 'Which annotation produces a nullable column in SQLAlchemy 2.0 typed mappings?',
    options: ['<code>Mapped[str]</code>', '<code>Mapped[str | None]</code>', '<code>Mapped[Nullable[str]]</code>', '<code>Column(str)</code>'],
    answer: 1,
    explain: 'Without <code>| None</code> (or <code>Optional</code>) the column is NOT NULL, unless <code>mapped_column(nullable=True)</code> overrides it.'
  });
  quiz.push({
    q: 'You loop over 100 orders and read <code>order.items</code> for each with default settings. How many queries?',
    options: ['1', '2', '101', '200'],
    answer: 2,
    explain: 'One for the orders plus one lazy load per order: the N+1 problem. <code>selectinload(Order.items)</code> makes it 2.'
  });
  quiz.push({
    q: 'Why does <code>joinedload</code> on a one-to-many collection require <code>.unique()</code> on the result in 2.0?',
    options: ['It is a bug', 'The JOIN returns the parent row once per child, so duplicates must be collapsed', 'To sort the results', 'Because of the identity map being disabled'],
    answer: 1,
    explain: 'A collection join multiplies parent rows; <code>.unique()</code> de-duplicates them into one object each.'
  });
  quiz.push({
    q: 'Which Alembic command creates a draft migration by comparing models with the database?',
    options: ['<code>alembic upgrade head</code>', '<code>alembic revision --autogenerate -m "msg"</code>', '<code>alembic init</code>', '<code>alembic stamp head</code>'],
    answer: 1,
    explain: 'Autogenerate diffs <code>target_metadata</code> against the live schema. Always review the file: renames appear as drop + add.'
  });
  quiz.push({
    q: 'Adding <code>nullable=False</code> column directly to a table with existing rows fails. What is the safe pattern?',
    options: ['Drop and recreate the table', 'Add as nullable (or with a server default), backfill, then set NOT NULL', 'Use <code>create_all()</code>', 'Disable constraints'],
    answer: 1,
    explain: 'Expand → backfill → contract keeps every step valid for existing rows and for old app versions during rolling deploys.'
  });
  quiz.push({
    q: '3 pods × 4 workers, each engine with <code>pool_size=5, max_overflow=10</code>. Worst-case connections?',
    options: ['15', '60', '180', '20'],
    answer: 2,
    explain: '12 processes × (5 + 10) = 180, which exceeds PostgreSQL\'s default <code>max_connections</code> of 100.'
  });
  quiz.push({
    q: 'Two requests read stock = 5 and each write <code>stock = 4</code> computed in Python. Which fix needs no extra SELECT or lock?',
    options: ['<code>update(Product).values(stock=Product.stock - 1).where(Product.stock &gt; 0)</code>', 'A bigger connection pool', '<code>expire_on_commit=False</code>', '<code>session.refresh()</code> before the write'],
    answer: 0,
    explain: 'Doing the arithmetic in SQL makes the database apply both decrements in order; <code>rowcount</code> tells you if stock ran out.'
  });
  quiz.push({
    q: 'In async code, reading <code>user.orders</code> (not eager-loaded) raises what?',
    options: ['<code>DetachedInstanceError</code>', '<code>MissingGreenlet</code>', '<code>StaleDataError</code>', 'Nothing, it loads lazily'],
    answer: 1,
    explain: 'Implicit I/O cannot happen inside attribute access in asyncio. Eager-load with <code>selectinload</code> or use <code>await user.awaitable_attrs.orders</code>.'
  });
  quiz.push({
    q: 'Which statement about repositories is correct?',
    options: ['Repositories should call <code>commit()</code> after each method', 'The service owns the transaction; repositories add, query and flush but do not commit', 'Each table needs its own repository', 'Repositories replace the Session'],
    answer: 1,
    explain: 'If repositories committed, a use case touching two repositories could not be atomic.'
  });
  quiz.push({
    q: 'Your app sits behind PgBouncer in transaction pooling mode with asyncpg. What must you configure?',
    options: ['Nothing', 'Disable asyncpg\'s prepared statement caches (and usually use <code>NullPool</code>)', 'SERIALIZABLE isolation', '<code>echo=True</code>'],
    answer: 1,
    explain: 'Server connections are shared between transactions, so per-connection prepared statements break; set <code>statement_cache_size=0</code> / <code>prepared_statement_cache_size=0</code>.'
  });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({
    q: 'Explain the SQLAlchemy Session. What is the unit of work and the identity map?',
    a: `<p>The <code>Session</code> is a workspace for one unit of work. It tracks objects you add or load, and on <b>flush</b> it computes the INSERT/UPDATE/DELETE statements needed, orders them by foreign-key dependencies and sends them in the current transaction. <b>Commit</b> flushes and commits. The <b>identity map</b> guarantees one object per primary key per session, so repeated <code>get()</code> calls return the same object without SQL and changes are never split across copies. A session is short-lived (one request or job), not thread-safe, and should not be shared.</p>`,
    level: 'I',
    followUps: ['What does autoflush do and when would you disable it?', 'What are the object states (transient, pending, persistent, detached)?']
  });
  interview.push({
    q: 'How do you manage database sessions in a FastAPI application?',
    a: `<p>Create one <code>Engine</code> and one <code>sessionmaker</code> per process at startup, with the URL from the environment. Provide a <code>get_db</code> dependency that opens <code>with SessionLocal() as session: yield session</code>, so every request gets its own session and it is always closed, even on errors. The service or endpoint decides when to commit (or uses <code>with session.begin()</code>). For async apps: <code>async_sessionmaker(engine, expire_on_commit=False)</code> and an <code>async</code> generator dependency; dispose the engine in the lifespan shutdown. Never use a module-level global session.</p>`,
    level: 'B',
    followUps: ['How do you override <code>get_db</code> in tests?', 'Why do many apps set <code>expire_on_commit=False</code>?']
  });
  interview.push({
    q: 'What is the N+1 query problem and how do you fix it in SQLAlchemy?',
    a: `<p>Loading N parent rows with one query and then lazily loading a relationship per parent sends N extra queries; latency grows with page size because each is a network round trip. Fix it by declaring loading on the query: <code>selectinload()</code> for collections (one extra <code>IN</code> query), <code>joinedload()</code> for many-to-one (a JOIN in the same query), <code>contains_eager()</code> when you already join for filtering. Guard hot paths with <code>raiseload("*")</code> and add query-count tests using engine events. Watch for N+1 hidden in response-model serialisation.</p>`,
    level: 'I',
    followUps: ['When is joinedload worse than selectinload?', 'How would you detect N+1 in production?']
  });
  interview.push({
    q: 'selectinload vs joinedload vs subqueryload: how do you choose?',
    a: `<p><b>joinedload</b> uses a LEFT OUTER JOIN in the same query: ideal for many-to-one/one-to-one, where it adds columns but not rows. On collections it repeats parent columns per child and interacts with LIMIT (SQLAlchemy wraps the query in a subquery). <b>selectinload</b> runs a second query with <code>WHERE fk IN (parent ids)</code>, batched at 500: the default for collections; it does not disturb the parent query. <b>subqueryload</b> re-runs the original query as a subquery; it is mostly superseded by selectinload except for composite-key edge cases. Choose by cardinality and measure with <code>echo</code>.</p>`,
    level: 'A',
    followUps: ['How do you chain loader options for three levels?', 'What does <code>populate_existing</code> do?']
  });
  interview.push({
    q: 'How do you prevent lost updates when two requests modify the same row?',
    a: `<p>Three options. (1) <b>Atomic SQL</b>: <code>UPDATE ... SET stock = stock - 1 WHERE id = :id AND stock &gt; 0</code> and check <code>rowcount</code>; simplest when the change fits in SQL. (2) <b>Pessimistic locking</b>: <code>select(...).with_for_update()</code> locks the row until commit, so the second request waits and then reads fresh data; keep the transaction short and lock rows in a consistent order to avoid deadlocks. (3) <b>Optimistic locking</b>: a version column (<code>version_id_col</code>) adds <code>AND version = :old</code>; a conflict raises <code>StaleDataError</code>, mapped to 409 or a retry. Optimistic suits rare conflicts and long human edits; pessimistic suits hot rows with short critical sections.</p>`,
    level: 'I',
    followUps: ['How would you expose optimistic locking in a REST API (ETag / If-Match)?', 'What is write skew and which isolation level prevents it?']
  });
  interview.push({
    q: 'How do you choose and set the transaction isolation level from SQLAlchemy?',
    a: `<p>Start with the database default (PostgreSQL: READ COMMITTED) plus constraints, atomic updates and row locks, which handle most API workloads. Use REPEATABLE READ for multi-query reports that need one snapshot. Use SERIALIZABLE for invariants spanning many rows, with a retry loop for serialization failures (SQLSTATE 40001). Set it engine-wide with <code>create_engine(url, isolation_level=...)</code>, per engine copy with <code>engine.execution_options(isolation_level=...)</code>, or per transaction via <code>session.connection(execution_options={"isolation_level": ...})</code> as the first call in the transaction.</p>`,
    level: 'A',
    followUps: ['Which anomalies does READ COMMITTED allow?', 'Why must a retry re-run the whole transaction, not just the failed statement?']
  });
  interview.push({
    q: 'Walk me through how you ship a schema change with Alembic.',
    a: `<p>Change the model, run <code>alembic revision --autogenerate -m "..."</code>, then <b>review and edit</b> the file: fix renames (autogenerate sees drop + add), add data migrations with lightweight <code>sa.table()</code> definitions instead of app models, and write a real <code>downgrade()</code>. Run upgrade, downgrade -1, upgrade locally and in CI against a real database. Commit the migration with the code. In deployment, run <code>alembic upgrade head</code> as a separate step before the new version starts, never concurrently from every replica. For large tables use expand/contract, batched backfills, <code>lock_timeout</code> and concurrent index creation.</p>`,
    level: 'I',
    followUps: ['What does autogenerate not detect?', 'How do you handle two developers creating migrations in parallel?']
  });
  interview.push({
    q: 'How would you add a NOT NULL column to a 100-million-row table with no downtime?',
    a: `<p>Expand: add the column nullable, ideally with a constant <code>server_default</code> (metadata-only on PostgreSQL 11+), so old app versions keep working. Deploy code that always writes it. Backfill existing rows in keyset batches by primary key, each in its own short transaction, idempotently (<code>WHERE col IS NULL</code>), throttled to protect replicas. Contract: add <code>CHECK (col IS NOT NULL) NOT VALID</code>, <code>VALIDATE CONSTRAINT</code> (no write blocking), then <code>SET NOT NULL</code> (PostgreSQL 12+ uses the valid check, skipping the scan), and drop the check. Every migration sets <code>lock_timeout</code> so it fails fast instead of blocking traffic.</p>`,
    level: 'E',
    followUps: ['How would this differ on MySQL?', 'How do you know the backfill finished before contracting?']
  });
  interview.push({
    q: 'How do you size a SQLAlchemy connection pool?',
    a: `<p>Every process has its own pool, so the worst case is instances × processes × (pool_size + max_overflow), which must stay below the database's <code>max_connections</code> minus reserved connections, at the maximum autoscaled size. Prefer small pools: the database can only execute roughly a few queries per CPU core at once, and more connections just queue and cost memory. Keep transactions short so connections return quickly; set a modest <code>pool_timeout</code>, <code>pool_pre_ping</code> and <code>pool_recycle</code>. If process counts are large or unbounded (serverless), use PgBouncer or RDS Proxy and <code>NullPool</code>/small pools in the app.</p>`,
    level: 'I',
    followUps: ['What does "QueuePool limit of size 5 overflow 10 reached" usually indicate?', 'What breaks in PgBouncer transaction mode?']
  });
  interview.push({
    q: 'What does the repository pattern buy you in a Python backend, and when is it overkill?',
    a: `<p>A repository wraps data access for an aggregate behind intention-revealing methods (<code>get_by_email</code>, <code>list_active_for_tenant</code>). Benefits: queries and cross-cutting filters (tenancy, soft delete) live in one place; services depend on a <code>Protocol</code>, so unit tests use fast in-memory fakes; storage details can change behind it. Repositories never commit; the service owns the transaction, possibly through a small unit-of-work object holding the session and repositories. It is overkill for thin CRUD apps, where a SQLAlchemy Session already provides unit of work and identity map, and generic <code>BaseRepository</code> classes often just re-expose the ORM badly.</p>`,
    level: 'I',
    followUps: ['How do you keep a fake repository honest (contract tests)?', 'Should repositories return ORM objects or domain dataclasses?']
  });
  interview.push({
    q: 'How does async SQLAlchemy differ from sync, and what are the common pitfalls?',
    a: `<p>You use <code>create_async_engine</code> with an async driver (asyncpg, psycopg 3), <code>async_sessionmaker</code> and <code>AsyncSession</code>, and <code>await</code> every I/O call: <code>execute</code>, <code>scalars</code>, <code>get</code>, <code>commit</code>, <code>refresh</code>. Statements are identical to sync 2.0 style. Pitfalls: implicit lazy loads and expired attributes raise <code>MissingGreenlet</code> (eager-load, <code>AsyncAttrs</code>, <code>expire_on_commit=False</code>); an <code>AsyncSession</code> must not be used by concurrent tasks (one per task in <code>gather</code>); forgetting <code>await</code> on <code>commit()</code> silently commits nothing; mixing sync sessions into <code>async def</code> blocks the event loop. Async helps I/O-heavy concurrency, not single-query speed.</p>`,
    level: 'A',
    followUps: ['How does the greenlet bridge work internally?', 'When would you keep a sync stack with FastAPI?']
  });
  interview.push({
    q: 'Compare SQLAlchemy with JPA/Hibernate, which you may meet in Java teams.',
    a: `<p>The core ideas match: entities/mapped classes, a session/EntityManager with a persistence context (identity map), unit of work flushing dirty state, lazy relationships by default and the same N+1 trap. Differences: SQLAlchemy exposes SQL explicitly with a first-class Core layer (<code>select()</code>, <code>update()</code>), so complex queries rarely need a separate query language like JPQL; transaction boundaries are explicit (<code>with session.begin()</code>) instead of annotation-driven <code>@Transactional</code> proxies; loading strategies are per-query options rather than mostly per-mapping annotations; migrations use Alembic rather than Flyway/Liquibase. Concepts transfer directly, so a Python developer can review a Java data layer and vice versa.</p>`,
    level: 'A',
    followUps: ['What is the equivalent of Hibernate\'s first-level cache in SQLAlchemy?', 'How do JPA entity graphs relate to loader options?']
  });
  interview.push({
    q: 'A list endpoint is slow in production. How do you investigate the database side?',
    a: `<p>First measure: tracing (OpenTelemetry SQLAlchemy instrumentation) shows how many queries a request sends and how long each takes. A staircase of identical short queries means N+1: add loader options. One slow query: capture its SQL (<code>echo</code> in staging or the trace), run <code>EXPLAIN (ANALYZE, BUFFERS)</code>, look for sequential scans, missing composite indexes on filter + sort columns, or deep <code>OFFSET</code> (switch to keyset pagination). Also check pool wait time (pool exhaustion looks like slow queries from the app's view), lock waits in <code>pg_stat_activity</code>, and whether the endpoint loads columns or rows it never returns. Fix, then add a query-count test so it stays fixed.</p>`,
    level: 'E',
    followUps: ['How do you tell pool waiting apart from slow SQL?', 'When would you add a read replica or a cache instead?']
  });

  registerModule({
    id: 'be18',
    title: 'Python Backend II: Databases with SQLAlchemy & Alembic',
    lang: 'python',
    intro: `<p>In Python Backend I you built FastAPI endpoints. Now they get a real database. This module teaches <b>SQLAlchemy 2.0</b>, the standard Python toolkit for SQL databases, and <b>Alembic</b>, its migration tool. Every example is Python; you never need Java here.</p>
      <p>You will set up an engine and a session per request, and see how the <b>unit of work</b> turns object changes into SQL. You will model tables and relationships with typed classes and write queries in 2.0 style with <code>select()</code>. You will find and fix the <b>N+1</b> problem, control transactions, isolation and locking, and ship schema changes safely with Alembic, including on big tables. Then you will size connection pools, structure code with repositories and a service layer, and move it all to <b>async</b> with <code>AsyncSession</code>.</p>
      <p>The SQL itself (joins, indexes, transactions) was covered in the SQL track; here you drive it from Python and learn what the ORM sends for you. Runnable demos use the standard-library <code>sqlite3</code> module, so you can count queries, watch rollbacks and time pagination right in the browser. SQLAlchemy code is written for SQLAlchemy 2.0 and PostgreSQL in production. Database URLs always come from <code>os.environ["DATABASE_URL"]</code>, never from code.</p>
      <p>Next on the route: auth, security and configuration (Python Backend III), then testing APIs with real databases (Python Backend IV).</p>`,
    goals: [
      'Create an <code>Engine</code> and <code>sessionmaker</code> from <code>DATABASE_URL</code>, wire a per-request <code>get_db</code> dependency into FastAPI, and explain flush vs commit, object states and the identity map',
      'Model tables with <code>DeclarativeBase</code>, <code>Mapped</code>, <code>mapped_column</code> and <code>relationship</code>: one-to-many, one-to-one, many-to-many and association objects, with constraints, cascades and naming conventions',
      'Write SQLAlchemy 2.0 queries with <code>select()</code>, joins, aggregates, <code>exists()</code>, bulk <code>update()</code>/<code>delete()</code>, upserts and keyset pagination, choosing the right result method',
      'Spot and fix N+1 queries with <code>selectinload</code>, <code>joinedload</code>, <code>contains_eager</code> and <code>raiseload</code>, and guard them with query-count tests',
      'Control transactions with <code>session.begin()</code> and savepoints, choose isolation levels, and prevent lost updates with atomic updates, <code>with_for_update()</code> or version columns',
      'Run Alembic end to end (<code>init</code>, <code>revision --autogenerate</code>, <code>upgrade head</code>, <code>downgrade</code>, merges) and write safe expand/backfill/contract migrations for large tables',
      'Size connection pools across processes, configure timeouts and pre-ping, and know when to use <code>NullPool</code> and PgBouncer',
      'Structure data access with repositories, a service layer and a unit of work, and test services with in-memory fakes',
      'Use <code>create_async_engine</code>, <code>async_sessionmaker</code> and <code>AsyncSession</code> correctly, avoiding <code>MissingGreenlet</code> and shared-session concurrency bugs'
    ],
    prereqs: `<p><b>Required:</b> Python Backend I (FastAPI fundamentals, especially dependencies with <code>yield</code> and <code>async def</code> vs <code>def</code>); from the SQL track, <b>DDL, Constraints &amp; ER Modelling</b> and <b>DML, UPSERT, Views, Procedures &amp; Triggers</b>. This module builds on them and does not re-teach SQL.</p>
      <p><b>Helpful:</b> SQL track <b>JOINs</b>, <b>Index Internals</b> and <b>Transactions, Isolation &amp; Concurrency Control</b> (the theory behind topics 3–5); Backend <b>Data Access Patterns</b> (N+1, pooling, keyset pagination in general). Optional, for the Java ORM view only: Backend <b>Databases from Code: CRUD &amp; ORM Basics</b> (JPA/Hibernate); nothing here requires Java.</p>
      <p>Tools: Python 3.11+, <code>pip install "sqlalchemy&gt;=2.0" alembic "psycopg[binary]"</code> (and <code>asyncpg</code> for the async topic), and a local PostgreSQL (for example in Docker). The runnable demos need only the standard library.</p>`,
    langExplain: `<p><b>About the code here.</b> This module belongs to the Python backend route, so every example is Python. Runnable demos use only the standard library (<code>sqlite3</code>, <code>asyncio</code>) so they run in the browser; SQLAlchemy and Alembic examples are written for SQLAlchemy 2.0 and PostgreSQL and are meant for your own project. If you work in Java, the same ideas appear with JPA/Hibernate and Flyway in the Backend modules "Databases from Code" and "Data Access Patterns".</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
