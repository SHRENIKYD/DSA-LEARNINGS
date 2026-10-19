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
     TOPIC 1 — pytest for API projects: conftest, fixtures, scopes, parametrize
     ===================================================================== */
  topics.push({
    title: 'pytest for API Projects: conftest.py, Fixture Scopes, yield Teardown, parametrize and Settings Overrides',
    analogy: `<p>Think of a <b>theatre</b>. Before the show season starts, the crew builds the stage once (a <b>session</b> fixture: the database server). Before each act, they set up that act's scenery (a <b>module</b> fixture). Before every single scene, an assistant puts fresh props on the table: a full glass, a clean letter (a <b>function</b> fixture: a clean database transaction). After each scene, the props are cleared in reverse order, and at the end of the season the stage comes down.</p>
      <p><b>parametrize</b> is the same scene performed with different actors: one script, many casts. And <code>conftest.py</code> is the <b>backstage notice board</b>: anything pinned there is available to every scene in that part of the building without anyone having to import it.</p>`,
    explain: `<p>🟢 <b>Where we start.</b> In <b>Errors, Type Hints &amp; Testing</b> (Python 9) you met pytest: plain <code>assert</code>, <code>@pytest.fixture</code>, <code>yield</code> teardown, scopes and <code>@pytest.mark.parametrize</code>. This topic turns those tools into the <b>layout of a real API test suite</b>, the one you will reuse for the rest of the module.</p>
      <p><b>1. Project layout.</b> Tests live next to <code>src/</code>, and shared fixtures live in <code>conftest.py</code> files. pytest loads every <code>conftest.py</code> from the root down to the test's folder, so fixtures defined higher up are visible lower down. You never import a fixture; you just name it as a parameter.</p>
      ${H.table(['File', 'What goes there', 'Scope it usually needs'], [
        ['<code>tests/conftest.py</code>', 'settings override, database engine, app, HTTP client, factories', 'session (engine), function (db session, client)'],
        ['<code>tests/unit/</code>', 'pure functions and services with fakes; no network, no database', 'function'],
        ['<code>tests/api/conftest.py</code>', 'an authenticated client, a seeded tenant', 'function'],
        ['<code>tests/integration/</code>', 'real PostgreSQL, real migrations, marked <code>@pytest.mark.integration</code>', 'session + function'],
        ['<code>pyproject.toml</code>', '<code>[tool.pytest.ini_options]</code>: test paths, markers, asyncio mode, strict flags', '—']
      ])}
      <p><b>2. Fixture scopes</b> decide how long one fixture value lives:</p>
      ${H.table(['Scope', 'Created', 'Destroyed', 'Typical API use'], [
        ['<code>function</code> (default)', 'before each test that asks', 'right after that test', 'DB session in a rolled-back transaction, HTTP client, fake email outbox'],
        ['<code>class</code>', 'once per test class', 'after the class', 'rare in pytest-style suites'],
        ['<code>module</code>', 'once per test file', 'after the file', 'a read-only seeded dataset for one file'],
        ['<code>package</code>', 'once per folder (package)', 'after the folder', 'a containerised service only one folder needs'],
        ['<code>session</code>', 'once per test run (per worker with xdist)', 'at the very end', 'database engine, migrated schema, Docker container']
      ])}
      <p>Two rules that explain most ordering surprises: <b>higher-scoped fixtures are set up first</b> (a session fixture is created before a function fixture in the same test, whatever order you list them), and <b>teardown runs in reverse</b> of setup. A wide fixture cannot depend on a narrower one: a session fixture asking for a function fixture raises <code>ScopeMismatch</code>.</p>
      <p><b>3. parametrize</b> turns one test into a table. Each row becomes its own test with its own id, so a failure tells you exactly which row broke. Give rows readable ids with <code>ids=[...]</code> or <code>pytest.param(..., id="missing-email")</code>, and mark a known bug row with <code>pytest.param(..., marks=pytest.mark.xfail(reason="bug 123"))</code>.</p>
      <p><b>4. Settings in tests.</b> Python Backend III loaded config with pydantic-settings and a cached <code>get_settings()</code>. Tests must never read your real <code>.env</code> or a real secret. Two clean ways: set the environment with <code>monkeypatch.setenv(...)</code> and call <code>get_settings.cache_clear()</code>, or override the dependency: <code>app.dependency_overrides[get_settings] = lambda: Settings(...)</code>. Both are undone after each test.</p>
      <p>🔵 The code below is a complete <code>conftest.py</code> skeleton; the next topics fill in the client and the database parts.</p>`,
    clues: [
      '"Where do shared fixtures go?" → <code>conftest.py</code>, discovered automatically by folder; never import fixtures',
      '"The test suite takes 10 minutes because every test creates the schema" → move engine + migrations to a <b>session</b> fixture, keep per-test state in a <b>function</b> fixture',
      '"Same test, many inputs" / "table of cases" → <code>@pytest.mark.parametrize</code> with readable <code>ids</code>',
      '"ScopeMismatch" → a wider fixture is asking for a narrower one; widen the dependency or narrow the caller',
      '"Tests pass locally but read my real API key" → settings come from <code>os.environ</code>; use <code>monkeypatch.setenv</code> + <code>cache_clear()</code> or <code>dependency_overrides[get_settings]</code>',
      '"Cleanup did not run" → put cleanup after <code>yield</code> (runs even when the test fails), or use <code>request.addfinalizer</code>'
    ],
    code: [
      {
        lang: 'text', title: 'pyproject.toml — pytest settings for an API project',
        code: `[tool.pytest.ini_options]
minversion = "8.0"
testpaths = ["tests"]
# -ra: summary of skips/xfails; strict flags turn typos into errors
addopts = ["-ra", "--strict-markers", "--strict-config"]
markers = [
    "integration: needs a real PostgreSQL (deselect with -m 'not integration')",
    "slow: takes more than a second",
]
# pytest-asyncio: every async def test runs on an event loop, no marker needed
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
# warnings in your own code become failures, so deprecations get fixed early
filterwarnings = ["error", "ignore::DeprecationWarning:some_third_party_lib.*"]`
      },
      {
        lang: 'python', title: 'tests/conftest.py — settings, app and scoped fixtures',
        code: `# tests/conftest.py
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Settings for the whole run. Values are fake and safe to commit.

    The database URL comes from the environment that CI sets up
    (a disposable container), with a local default for laptops.
    """
    import os

    return Settings(
        database_url=os.environ.get(
            "TEST_DATABASE_URL", "postgresql+psycopg://postgres@localhost:5432/app_test"
        ),
        jwt_secret="test-only-not-a-real-secret",   # never a production value
        payments_base_url="https://payments.example.test",
        environment="test",
    )


@pytest.fixture
def app(test_settings: Settings) -> Iterator[FastAPI]:
    """A fresh app per test, with settings overridden and overrides always cleared."""
    application = create_app()
    application.dependency_overrides[get_settings] = lambda: test_settings
    yield application
    application.dependency_overrides.clear()     # teardown: runs even if the test failed


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    # "with" runs the app's lifespan (startup/shutdown) around the test
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _no_real_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every test: make sure no real secret can leak in from the developer's shell."""
    for name in ("PAYMENTS_API_KEY", "OPENAI_API_KEY", "AWS_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(name, raising=False)`
      },
      {
        lang: 'python', title: 'parametrize: ids, pytest.param, marks and stacking',
        code: `import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize(
    ("payload", "bad_field"),
    [
        pytest.param({"title": "", "body": "x"}, "title", id="empty-title"),
        pytest.param({"body": "x"}, "title", id="missing-title"),
        pytest.param({"title": "t" * 121, "body": "x"}, "title", id="title-too-long"),
        pytest.param({"title": "ok", "body": 42}, "body", id="body-not-string"),
        pytest.param(
            {"title": "ok", "body": "x", "tags": ["a"] * 50}, "tags",
            id="too-many-tags",
            marks=pytest.mark.xfail(reason="limit not enforced yet, issue 311", strict=True),
        ),
    ],
)
def test_create_note_rejects_bad_payload(client: TestClient, payload: dict, bad_field: str) -> None:
    r = client.post("/notes", json=payload)
    assert r.status_code == 422
    # FastAPI puts the failing field at the end of "loc", e.g. ["body", "title"]
    locs = [err["loc"][-1] for err in r.json()["detail"]]
    assert bad_field in locs


# Stacked parametrize = every combination (2 roles x 3 methods = 6 tests).
@pytest.mark.parametrize("method", ["get", "patch", "delete"])
@pytest.mark.parametrize("role", ["anonymous", "other_user"])
def test_note_is_private(client: TestClient, role: str, method: str) -> None:
    headers = {} if role == "anonymous" else {"Authorization": "Bearer other-user-token"}
    r = client.request(method.upper(), "/notes/1", headers=headers)
    assert r.status_code in (401, 404)   # 404 for others: do not reveal that it exists`
      },
      {
        lang: 'python', title: 'Parametrized fixtures and indirect parametrization',
        code: `import pytest

from app.storage import LocalStorage, MemoryStorage, Storage


# One fixture, several implementations: every test using "storage"
# runs once per param. Good for "all backends obey the same contract".
@pytest.fixture(params=["memory", "local"], ids=lambda p: f"storage={p}")
def storage(request: pytest.FixtureRequest, tmp_path) -> Storage:
    if request.param == "memory":
        return MemoryStorage()
    return LocalStorage(root=tmp_path)          # tmp_path: a fresh folder per test


def test_roundtrip(storage: Storage) -> None:
    storage.put("a.txt", b"hello")
    assert storage.get("a.txt") == b"hello"


# indirect=True sends the parameter to the fixture (request.param) instead of the test.
@pytest.fixture
def user_with_role(request: pytest.FixtureRequest) -> dict:
    return {"id": 1, "role": request.param}


@pytest.mark.parametrize("user_with_role", ["admin", "editor"], indirect=True)
def test_can_publish(user_with_role: dict) -> None:
    assert user_with_role["role"] in {"admin", "editor"}`
      },
      {
        lang: 'python', run: true, title: 'Runnable: fixture scopes, teardown order and a mini parametrize with unittest',
        code: `# pytest is not available here, so we show the same lifecycle with the stdlib unittest:
#   setUpModule/tearDownModule  ~ module fixture
#   setUpClass/tearDownClass    ~ class fixture
#   setUp + addCleanup          ~ function fixture with yield teardown (LIFO!)
#   subTest                     ~ one row of @pytest.mark.parametrize
import io
import unittest

LOG = []


def setUpModule():
    LOG.append("setup engine (module)")


def tearDownModule():
    LOG.append("teardown engine (module)")


def normalize_email(s):
    """The code under test."""
    return s.strip().lower()


class NoteApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        LOG.append("  setup app (class)")

    @classmethod
    def tearDownClass(cls):
        LOG.append("  teardown app (class)")

    def setUp(self):
        LOG.append("    setup db transaction")
        # cleanups run in reverse order, like fixture teardown after yield
        self.addCleanup(LOG.append, "    rollback db transaction")
        LOG.append("    setup client")
        self.addCleanup(LOG.append, "    close client")

    def test_normalize_table(self):
        cases = [  # a hand-written parametrize table: (id, input, expected)
            ("spaces", "  Ann@Example.com ", "ann@example.com"),
            ("upper", "BOB@EXAMPLE.COM", "bob@example.com"),
            ("already-ok", "cy@example.com", "cy@example.com"),
        ]
        for case_id, raw, expected in cases:
            with self.subTest(case_id):            # each row reported separately
                self.assertEqual(normalize_email(raw), expected)
        LOG.append("    ran test_normalize_table (3 rows)")

    def test_second(self):
        LOG.append("    ran test_second")


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(suite)
    print("\\n".join(LOG))
    print("tests run:", result.testsRun, "| failures:", len(result.failures), "| errors:", len(result.errors))`
      }
    ],
    codeTitle: ['pyproject.toml pytest settings', 'tests/conftest.py', 'parametrize with ids and marks', 'Parametrized + indirect fixtures', 'Runnable: lifecycle with unittest'],
    viz: {
      title: 'Fixture lifecycle: what is set up, reused and torn down, test by test',
      input: 'engine:session, seed:module, db:function, client:function | test_users.py::test_create:client,db,engine ; test_users.py::test_list:db,seed ; test_notes.py::test_note:engine,client',
      inputLabel: 'fixtures name:scope, then | then tests file::name:fixtures separated by ;',
      gen: function (input) {
        var parts = String(input || '').split('|');
        if (parts.length !== 2) throw new Error('Format: name:scope, ... | file::test:fx1,fx2 ; file::test2:fx');
        var scope = {}, rank = { session: 0, module: 1, 'function': 2 };
        parts[0].split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8).forEach(function (f) {
          var kv = f.split(':');
          if (kv.length !== 2 || rank[kv[1].trim()] === undefined) throw new Error('Each fixture is name:scope with scope session, module or function');
          scope[kv[0].trim()] = kv[1].trim();
        });
        var tests = parts[1].split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 6);
        if (!tests.length) throw new Error('Add at least one test after the |');
        var active = [], log = [], frames = [], current = null;
        function snap(narr, hl) {
          var st = {};
          active.forEach(function (n, i) { if (hl && hl[n]) st[i] = hl[n]; });
          frames.push({ narr: narr, parts: [
            { type: 'stack', label: 'Active fixtures (bottom = set up first)', items: active.map(function (n) { return n + ' [' + scope[n] + ']'; }), hl: st },
            txt('Log so far', log.length ? '<code>' + log.slice(-8).map(hesc).join('</code><br><code>') + '</code>' : '<i>empty</i>')
          ] });
        }
        function teardown(which, why) {
          var gone = [];
          for (var i = active.length - 1; i >= 0; i--) if (which.indexOf(scope[active[i]]) >= 0) { gone.push(active[i]); log.push('teardown ' + active[i]); }
          if (!gone.length) return;
          var hl = {}; gone.forEach(function (g) { hl[g] = 'bad'; });
          active = active.filter(function (n) { return gone.indexOf(n) < 0; });
          snap(why + ' Torn down in <b>reverse</b> order: ' + gone.map(hesc).join(', ') + '.', hl);
        }
        snap('pytest collects the tests. Nothing is set up until a test asks for a fixture by name.', null);
        tests.forEach(function (t) {
          var m = t.match(/^([^:]+)::([^:]+):?(.*)$/);
          if (!m) throw new Error('Each test looks like file.py::test_name:fx1,fx2');
          var mod = m[1].trim(), name = m[2].trim();
          var want = m[3].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          want.forEach(function (w) { if (!scope[w]) throw new Error('Fixture "' + w + '" is not declared before the |'); });
          if (current !== null && mod !== current) teardown(['module'], 'Moving from <code>' + hesc(current) + '</code> to <code>' + hesc(mod) + '</code>: module-scoped fixtures of the old file end.');
          current = mod;
          var ordered = want.map(function (w, i) { return { w: w, i: i }; }).sort(function (a, b) { return rank[scope[a.w]] - rank[scope[b.w]] || a.i - b.i; }).map(function (o) { return o.w; });
          var made = [], reused = [];
          ordered.forEach(function (w) { if (active.indexOf(w) < 0) { active.push(w); made.push(w); log.push('setup ' + w); } else reused.push(w); });
          var hl = {}; made.forEach(function (w) { hl[w] = 'ok'; }); reused.forEach(function (w) { hl[w] = 'win'; });
          snap('<code>' + hesc(name) + '</code> asks for ' + (want.length ? want.map(hesc).join(', ') : 'nothing') + '. pytest sets up <b>higher scopes first</b>' + (made.length ? ': new ' + made.map(hesc).join(', ') : '') + (reused.length ? '; reused (already alive): ' + reused.map(hesc).join(', ') : '') + '.', hl);
          log.push('run ' + name);
          var cur = {}; want.forEach(function (w) { cur[w] = 'cur'; });
          snap('The test body runs with every fixture value injected as an argument.', cur);
          teardown(['function'], 'Test finished (pass or fail): its function-scoped fixtures run the code after <code>yield</code>.');
        });
        teardown(['module'], 'Last file done: module fixtures end.');
        teardown(['session'], 'End of the run: session fixtures end last, so the database container or engine lived for every test.');
        snap('Done. Count the setups: wide scopes were built once and shared, narrow scopes were rebuilt for every test, which is what keeps tests isolated.', null);
        return frames;
      }
    },
    examples: [
      {
        title: 'Why is my fixture set up in a different order than I listed it?',
        html: `<p>A test asks <code>def test_x(client, db, engine)</code> where <code>engine</code> is session-scoped. pytest sets up <code>engine</code> first, then <code>client</code> and <code>db</code> in the order you listed them (both function scope). Order inside one scope follows the argument list and fixture dependencies; across scopes, wider wins. If your <code>client</code> needs the database to exist, do not rely on argument order: make <code>client</code> request <code>db</code> itself.</p>
          ${H.table(['Step', 'Fixture', 'Scope', 'Why now'], [['1', 'engine', 'session', H.c('b', 'widest scope first')], ['2', 'client', 'function', 'first listed function fixture'], ['3', 'db', 'function', 'second listed'], ['after test', 'db, client', 'function', H.c('r', 'reverse order teardown')]])}`,
        code: { lang: 'python', code: `import pytest


@pytest.fixture
def client(app, db_session):          # explicit dependency: db is always ready first
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()` }
      },
      {
        title: 'Testing configuration safely with monkeypatch',
        html: `<p>The app reads <code>RATE_LIMIT_PER_MINUTE</code> from the environment through a cached <code>get_settings()</code>. A test sets a small limit, clears the cache so the new value is read, and pytest restores the environment afterwards. Without <code>cache_clear()</code> the first test's settings would leak into every later test: a classic order-dependent failure.</p>`,
        code: { lang: 'python', code: `from app.config import get_settings


def test_low_rate_limit_returns_429(monkeypatch, client):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "2")
    get_settings.cache_clear()                 # make the cached settings re-read the env
    try:
        codes = [client.get("/ping").status_code for _ in range(3)]
        assert codes == [200, 200, 429]
    finally:
        get_settings.cache_clear()             # do not leak the low limit into other tests` }
      },
      {
        title: 'Selecting tests with markers and keywords',
        html: `<p>Markers label tests so CI can run slices of the suite. With <code>--strict-markers</code> a typo like <code>@pytest.mark.intergration</code> fails at collection instead of silently creating a new marker.</p>
          ${H.table(['Command', 'Runs'], [['<code>pytest -m "not integration"</code>', 'the fast unit and API tests (pre-commit, every push)'], ['<code>pytest -m integration</code>', 'only tests that need PostgreSQL'], ['<code>pytest -k "notes and not slow"</code>', 'tests whose names match the expression'], ['<code>pytest tests/api/test_notes.py::test_create</code>', 'one test'], ['<code>pytest --lf</code> / <code>--ff</code>', 'last failed only / failed first'], ['<code>pytest -x --pdb</code>', 'stop at first failure and open the debugger']])}`
      }
    ],
    deepDive: `<p>🟣 <b>How pytest builds the fixture graph.</b> At collection, pytest records each test's argument names. At run time, for each test it resolves names to fixture definitions by searching: the test module, then <code>conftest.py</code> files from the test's folder up to the root, then plugins. The closest definition wins, so <code>tests/api/conftest.py</code> can <b>override</b> a root fixture with the same name (and can even request the parent version by using the same name as a parameter).</p>
      <p><b>Caching.</b> Each fixture value is cached per scope key: per test for function scope, per module node for module scope, and so on. When a module-scoped fixture is parametrized, pytest <b>reorders tests</b> to group them by parameter, minimising setups. That is why output order sometimes differs from file order.</p>
      <p><b>Teardown mechanics.</b> A <code>yield</code> fixture is a generator; pytest calls <code>next()</code> to set up and registers a finalizer that calls <code>next()</code> again, expecting <code>StopIteration</code>. Finalizers form a stack per scope. If setup raised before <code>yield</code>, there is nothing to tear down, so put each resource in its own fixture instead of opening three things in one fixture. If teardown itself raises, pytest reports an <b>error</b> (not a failure) for that test.</p>
      <p><b>autouse</b> fixtures run for every test in their scope without being requested. Use them for safety nets (blocking real network, clearing env vars, resetting caches), not for heavy setup: an autouse database fixture makes every pure unit test slow.</p>
      <p><b>xdist.</b> With <code>pytest -n auto</code>, each worker is a separate process with its own session. A session fixture runs once <b>per worker</b>, so four workers create four engines and need four databases (use the <code>worker_id</code> fixture to name them, topic 3).</p>
      <p><b>Production reality.</b> Keep <code>conftest.py</code> small and boring. Big suites drift into "fixture spaghetti": a test asks for <code>admin_client</code> which needs <code>tenant</code> which needs <code>seeded_db</code>, and nobody knows what data exists. Prefer explicit factories (topic 4) inside the test so the reader sees the data.</p>`,
    aiEra: `<p>🤖 Assistants are very good at writing parametrize tables: give them a function and ask for "a parametrized pytest table covering empty, boundary, unicode and invalid inputs, with readable ids". Review the table: they often produce rows that test the same branch five times and skip the boundary that matters.</p>
      <p>Common AI mistakes here: fixtures without teardown (an override left on a shared <code>app</code> object), session-scoped fixtures that hold mutable state, <code>scope="session"</code> on a fixture that depends on <code>monkeypatch</code> (a ScopeMismatch), and tests that read <code>os.environ</code> directly so they depend on the developer's shell. Ask the assistant to "list every fixture with its scope and what it cleans up", then check it against this topic.</p>
      <p>Coding agents also run your tests. A clean, fast, marker-split suite (<code>-m "not integration"</code> in seconds) is what lets an agent iterate safely; a slow suite with hidden shared state makes agents chase phantom failures.</p>`,
    problems: [
      {
        title: 'Predict the Fixture Setup and Teardown Log',
        level: 'Medium',
        tags: ['pytest', 'fixtures', 'scopes', 'teardown'],
        companies: ['Stripe', 'Datadog'],
        statement: `<p>A teammate asks why their session-scoped engine is created before a fixture they listed first, and why a module fixture vanished halfway through the run. Write <code>fixture_log(fixtures, tests)</code> that predicts pytest's log for a simplified suite.</p>
          <ul>
            <li><code>fixtures</code>: strings <code>"name:scope"</code>, scope is <code>session</code>, <code>module</code> or <code>function</code>.</li>
            <li><code>tests</code>: strings <code>"file::test_name:fx1,fx2"</code> in run order (the fixture list can be empty: <code>"file::t:"</code>). Fixtures do not depend on each other.</li>
          </ul>
          <p>Rules: before a test, set up every requested fixture that is not alive yet, <b>wider scopes first</b> (session, then module, then function), ties in the order requested. Log <code>"setup X"</code>, then <code>"run test_name"</code>. After the test, tear down its function fixtures in reverse setup order. When the file changes, tear down module fixtures (reverse order) <b>before</b> setting up the next test. At the end, tear down remaining module fixtures, then session fixtures, each in reverse order. Log <code>"teardown X"</code>.</p>`,
        constraints: `<p>1 ≤ tests ≤ 200, at most 20 fixtures, every requested fixture is declared, tests of one file are contiguous.</p>`,
        example: `<p>fixtures <code>["engine:session", "db:function"]</code>, tests <code>["a.py::t1:db,engine", "a.py::t2:db"]</code> →</p>
          <p><code>${H.c('g', '["setup engine", "setup db", "run t1", "teardown db", "setup db", "run t2", "teardown db", "teardown engine"]')}</code></p>
          <p>Why: <code>engine</code> is wider, so it is created first even though <code>db</code> was listed first. <code>db</code> is rebuilt for every test; <code>engine</code> lives to the end.</p>`,
        brute: {
          why: `<p>The naive model "set up what the test lists, in that order, and tear everything down after each test" gets two things wrong: it creates the engine after <code>db</code>, and it rebuilds the session engine for every test. That is exactly the slow, wrong mental model that leads people to put schema creation in a function fixture.</p>`,
          code: `def fixture_log_naive(fixtures, tests):
    log = []
    for t in tests:
        name, _, req = t.split("::")[1].partition(":")
        wanted = [f for f in req.split(",") if f]
        log += ["setup " + f for f in wanted]
        log.append("run " + name)
        log += ["teardown " + f for f in reversed(wanted)]
    return log`
        },
        mcq: {
          q: 'A test requests <code>(client, engine)</code>; <code>engine</code> is session-scoped and not yet alive. Which is set up first?',
          options: ['client, because it is listed first', 'engine, because higher-scoped fixtures are instantiated first', 'Random order', 'Both at the same time'],
          answer: 1,
          explain: 'pytest instantiates fixtures in scope order (session before module before function); argument order only breaks ties within a scope.'
        },
        hints: [
          'Hint 1: keep a list of <b>alive</b> fixtures in setup order. Teardown is always "walk that list backwards and remove the ones of scope S".',
          'Hint 2: sort each test\'s requested fixtures with a <b>stable</b> sort by scope rank (session 0, module 1, function 2), so ties keep request order.',
          'Hint 3: per test: if the file changed, tear down module fixtures; set up missing fixtures; log run; tear down function fixtures. After the loop: module, then session.'
        ],
        solution: {
          approach: `<p>Simulate pytest's per-scope finalizer stacks with one ordered list of alive fixtures. A stable sort by scope rank gives the "wider first, then request order" setup rule. Teardown for a scope walks the alive list in reverse and removes matching entries, which reproduces LIFO teardown. File boundaries trigger module teardown; the end of the run triggers module then session teardown.</p>`,
          code: `def fixture_log(fixtures, tests):
    rank = {"session": 0, "module": 1, "function": 2}
    scope = {}
    for f in fixtures:
        name, sc = f.split(":")
        scope[name] = sc

    alive = []          # fixture names in the order they were set up
    log = []

    def teardown(which):
        # reverse order of setup, only fixtures of the given scope
        for name in reversed(list(alive)):
            if scope[name] == which:
                log.append("teardown " + name)
                alive.remove(name)

    current_file = None
    for t in tests:
        file_name, rest = t.split("::", 1)
        test_name, _, req = rest.partition(":")
        if current_file is not None and file_name != current_file:
            teardown("module")                     # the old file's module fixtures end
        current_file = file_name

        wanted = [f for f in req.split(",") if f]
        wanted.sort(key=lambda f: rank[scope[f]])  # stable: ties keep request order
        for f in wanted:
            if f not in alive:
                log.append("setup " + f)
                alive.append(f)
        log.append("run " + test_name)
        teardown("function")                       # code after yield, every test

    teardown("module")
    teardown("session")
    return log`,
          complexity: `<p>O(T · F) for T tests and F fixtures (each teardown scans the alive list). Fine for any real suite size.</p>`,
          followUps: ['How would you add fixture dependencies (a fixture that requests another)?', 'How does pytest reorder tests when a module-scoped fixture is parametrized?']
        },
        tests: { fn: 'fixtureLog', sig: 'string[] string[] -> string[]', cases: [
          [[['engine:session', 'db:function'], ['a.py::t1:db,engine', 'a.py::t2:db']], ['setup engine', 'setup db', 'run t1', 'teardown db', 'setup db', 'run t2', 'teardown db', 'teardown engine']],
          [[['x:function'], ['a.py::t1:']], ['run t1']],
          [[['seed:module', 'db:function'], ['a.py::t1:seed', 'a.py::t2:db,seed', 'b.py::t3:seed']], ['setup seed', 'run t1', 'setup db', 'run t2', 'teardown db', 'teardown seed', 'setup seed', 'run t3', 'teardown seed']],
          [[['engine:session', 'seed:module', 'c:function', 'd:function'], ['a.py::t1:d,c,seed,engine']], ['setup engine', 'setup seed', 'setup d', 'setup c', 'run t1', 'teardown c', 'teardown d', 'teardown seed', 'teardown engine']],
          [[['engine:session', 'seed:module'], ['a.py::t1:seed', 'b.py::t2:engine', 'b.py::t3:seed']], ['setup seed', 'run t1', 'teardown seed', 'setup engine', 'run t2', 'setup seed', 'run t3', 'teardown seed', 'teardown engine']],
          [[['s1:session', 's2:session'], ['a.py::t1:s2', 'a.py::t2:s1']], ['setup s2', 'run t1', 'setup s1', 'run t2', 'teardown s1', 'teardown s2']],
          [[['db:function'], ['a.py::t1:db', 'b.py::t2:db']], ['setup db', 'run t1', 'teardown db', 'setup db', 'run t2', 'teardown db']]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — TestClient, httpx AsyncClient and dependency_overrides
     ===================================================================== */
  topics.push({
    title: 'Testing Endpoints: TestClient, httpx AsyncClient with ASGITransport, dependency_overrides and Error Paths',
    analogy: `<p>Testing an API over a real network is like testing a shop by <b>phoning it</b> from another city: slow, and the line can drop. <code>TestClient</code> and <code>ASGITransport</code> let you walk <b>straight into the shop through the back door</b>: you still hand over a real order slip (an HTTP request) and get a real receipt (a response), but no phone line is involved.</p>
      <p><code>dependency_overrides</code> is the shop manager saying "for today's inspection, use the <b>practice till</b> instead of the real bank terminal". Everything else in the shop works exactly as normal.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> A FastAPI app is an <b>ASGI</b> application: a Python function that receives a request as a dictionary and sends back response messages (you saw ASGI in Python Backend I). A test client calls that function <b>directly in memory</b>. No port, no Uvicorn, no network, yet your routing, validation, dependencies, exception handlers and middleware all run for real.</p>
      ${H.table(['Tool', 'Style', 'Runs lifespan?', 'Use it when'], [
        ['<code>fastapi.testclient.TestClient</code>', 'sync: <code>client.get(...)</code>', 'yes, inside <code>with TestClient(app) as c:</code>', 'most endpoint tests; simplest; works with sync tests'],
        ['<code>httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")</code>', 'async: <code>await ac.get(...)</code>', H.c('y', 'no, wrap with asgi-lifespan\'s LifespanManager'), 'async tests that also <code>await</code> an async DB session, or call several endpoints concurrently'],
        ['real server + <code>httpx.Client</code>', 'over TCP', 'yes', 'end-to-end smoke tests against a deployed environment only']
      ])}
      <p><b>What to assert.</b> A good endpoint test checks three things: the <b>status code</b>, the <b>body shape</b> (fields and types, not just "it is JSON"), and the <b>side effect</b> (a row exists, an email was queued). Assert on the response the client would see, not on internal function calls.</p>
      <p><b>The error paths are the real test.</b> Happy paths rarely break in production; error paths do. For every endpoint, write at least:</p>
      ${H.table(['Status', 'Trigger in the test', 'What to assert'], [
        ['<b>422</b> Unprocessable', 'missing field, wrong type, too long', '<code>detail[i]["loc"]</code> points at the bad field; nothing was written'],
        ['<b>401</b> / <b>403</b>', 'no token / a token without the scope', '<code>WWW-Authenticate</code> header on 401; no data leaked'],
        ['<b>404</b> Not Found', 'an id that does not exist, or another user\'s id', 'same body for "missing" and "not yours" (no existence leak)'],
        ['<b>409</b> Conflict', 'create the same unique email twice, or a stale version', 'the first row is unchanged; error code is stable'],
        ['<b>500</b>', 'make a dependency raise', 'your handler hides internals; use <code>TestClient(app, raise_server_exceptions=False)</code>']
      ])}
      <p><b>dependency_overrides.</b> Every external thing your endpoint touches should arrive through <code>Depends</code>: the database session, the current user, the settings, the payment client. Then a test replaces it with one line: <code>app.dependency_overrides[get_current_user] = lambda: alice</code>. FastAPI looks up the original function as a key, so you override the <b>exact function object</b> the route depends on. Always clear the overrides afterwards (a fixture with <code>yield</code> does it).</p>
      <p>🔵 Async tests need a runner plugin. With <b>pytest-asyncio</b> set <code>asyncio_mode = "auto"</code> (topic 1's config) and write <code>async def test_...</code>. With <b>anyio</b> (bundled with FastAPI's dependencies) mark tests <code>@pytest.mark.anyio</code>. Do not mix both styles in one suite.</p>`,
    clues: [
      '"Test the endpoint without starting a server" → <code>TestClient(app)</code> or <code>AsyncClient(transport=ASGITransport(app=app))</code>',
      '"My startup code did not run in the test" → TestClient only runs lifespan inside <code>with</code>; ASGITransport never does (use <code>LifespanManager</code>)',
      '"Replace the database / current user / payment client in tests" → <code>app.dependency_overrides[original_fn] = replacement</code>',
      '"Got event loop is closed" / "attached to a different loop" → async fixtures and tests on different loops; align loop scopes',
      '"Test the 422 / 404 / 409 cases" → parametrize error rows and assert status, <code>detail</code> and that nothing changed',
      '"The test passes but production returns 500" → run with <code>raise_server_exceptions=False</code> to test your error handler'
    ],
    code: [
      {
        lang: 'python', title: 'The app under test (short): notes with a repository dependency',
        code: `# app/notes.py — just enough app to test
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import User, get_current_user
from app.repo import DuplicateTitle, NoteRepo, get_repo


class NoteIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = ""


class NoteOut(NoteIn):
    id: int
    owner_id: int


router = APIRouter(prefix="/notes", tags=["notes"])
Repo = Annotated[NoteRepo, Depends(get_repo)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(body: NoteIn, repo: Repo, user: CurrentUser) -> NoteOut:
    try:
        return repo.add(owner_id=user.id, title=body.title, body=body.body)
    except DuplicateTitle:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="note title already exists") from None


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, repo: Repo, user: CurrentUser) -> NoteOut:
    note = repo.get(note_id)
    if note is None or note.owner_id != user.id:      # "not yours" looks like "missing"
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="note not found")
    return note


def create_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    return app`
      },
      {
        lang: 'python', title: 'Sync tests with TestClient and dependency_overrides',
        code: `# tests/api/test_notes.py
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.auth import User, get_current_user
from app.notes import create_app
from app.repo import InMemoryNoteRepo, get_repo

ALICE = User(id=1, email="alice@example.test")
BOB = User(id=2, email="bob@example.test")


@pytest.fixture
def repo() -> InMemoryNoteRepo:
    return InMemoryNoteRepo()          # a fake that obeys the same contract as the SQL repo


@pytest.fixture
def client(repo: InMemoryNoteRepo) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_current_user] = lambda: ALICE
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_create_returns_201_and_body(client: TestClient, repo: InMemoryNoteRepo) -> None:
    r = client.post("/notes", json={"title": "Groceries", "body": "milk"})
    assert r.status_code == 201
    data = r.json()
    assert data == {"id": data["id"], "title": "Groceries", "body": "milk", "owner_id": 1}
    assert repo.count() == 1                       # the side effect happened


@pytest.mark.parametrize(
    ("payload", "loc"),
    [
        pytest.param({}, ["body", "title"], id="missing-title"),
        pytest.param({"title": ""}, ["body", "title"], id="empty-title"),
        pytest.param({"title": "x" * 121}, ["body", "title"], id="too-long"),
        pytest.param({"title": "ok", "body": ["no"]}, ["body", "body"], id="body-wrong-type"),
    ],
)
def test_create_422(client: TestClient, repo: InMemoryNoteRepo, payload: dict, loc: list[str]) -> None:
    r = client.post("/notes", json=payload)
    assert r.status_code == 422
    assert loc in [err["loc"] for err in r.json()["detail"]]
    assert repo.count() == 0                       # nothing written on a validation error


def test_duplicate_title_409_keeps_first(client: TestClient, repo: InMemoryNoteRepo) -> None:
    first = client.post("/notes", json={"title": "Plan"})
    second = client.post("/notes", json={"title": "Plan", "body": "changed"})
    assert (first.status_code, second.status_code) == (201, 409)
    assert second.json() == {"detail": "note title already exists"}
    assert repo.get(first.json()["id"]).body == ""     # the original is untouched


def test_other_users_note_is_404(client: TestClient, repo: InMemoryNoteRepo) -> None:
    note = repo.add(owner_id=BOB.id, title="Bob's secret", body="")
    missing = client.get("/notes/999999")
    not_mine = client.get(f"/notes/{note.id}")
    assert missing.status_code == not_mine.status_code == 404
    assert missing.json() == not_mine.json()           # no existence leak`
      },
      {
        lang: 'python', title: 'Async tests with httpx.AsyncClient + ASGITransport (pytest-asyncio auto mode)',
        code: `# tests/api/test_notes_async.py
from collections.abc import AsyncIterator

import pytest
from asgi_lifespan import LifespanManager
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.notes import create_app


@pytest.fixture
async def app() -> AsyncIterator[FastAPI]:
    application = create_app()
    # ASGITransport does not send lifespan events; LifespanManager runs startup/shutdown
    async with LifespanManager(application) as manager:
        yield manager.app
    application.dependency_overrides.clear()


@pytest.fixture
async def ac(app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def test_health(ac: AsyncClient) -> None:      # asyncio_mode = "auto": no marker needed
    r = await ac.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# The same test with anyio instead of pytest-asyncio:
@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_health_anyio(ac: AsyncClient) -> None:
    assert (await ac.get("/health")).status_code == 200`
      },
      {
        lang: 'python', run: true, title: 'Runnable: what ASGITransport does, in 40 lines of asyncio',
        code: `# A test client calls the ASGI app function directly: no socket, no server.
# Here: a tiny raw ASGI app plus a hand-made "transport", driven by unittest.
import asyncio
import io
import json
import unittest

NOTES = {1: {"id": 1, "title": "hello"}}
DEPS = {"current_user": lambda: {"id": 1}}       # like FastAPI's dependency table
OVERRIDES = {}                                   # like app.dependency_overrides


def resolve(name):
    return OVERRIDES.get(name, DEPS[name])()


async def app(scope, receive, send):
    """A raw ASGI app: GET /notes/{id}."""
    assert scope["type"] == "http"
    user = resolve("current_user")
    parts = scope["path"].strip("/").split("/")
    status, body = 404, {"detail": "not found"}
    if len(parts) == 2 and parts[0] == "notes":
        if not parts[1].isdigit():
            status, body = 422, {"detail": [{"loc": ["path", "note_id"], "msg": "not an int"}]}
        elif user is None:
            status, body = 401, {"detail": "not authenticated"}
        elif int(parts[1]) in NOTES:
            status, body = 200, NOTES[int(parts[1])]
    raw = json.dumps(body).encode()
    await send({"type": "http.response.start", "status": status,
                "headers": [(b"content-type", b"application/json")]})
    await send({"type": "http.response.body", "body": raw})


async def call(method, path):
    """The 'transport': build an ASGI scope, collect the sent messages."""
    scope = {"type": "http", "method": method, "path": path, "headers": [], "query_string": b""}
    sent = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)
    status = sent[0]["status"]
    body = json.loads(b"".join(m.get("body", b"") for m in sent[1:]))
    return status, body


class ApiTests(unittest.IsolatedAsyncioTestCase):
    def tearDown(self):
        OVERRIDES.clear()                       # always undo overrides

    async def test_200(self):
        self.assertEqual(await call("GET", "/notes/1"), (200, {"id": 1, "title": "hello"}))

    async def test_404(self):
        status, _ = await call("GET", "/notes/42")
        self.assertEqual(status, 404)

    async def test_422(self):
        status, body = await call("GET", "/notes/abc")
        self.assertEqual((status, body["detail"][0]["loc"]), (422, ["path", "note_id"]))

    async def test_401_with_override(self):
        OVERRIDES["current_user"] = lambda: None     # pretend nobody is logged in
        status, _ = await call("GET", "/notes/1")
        self.assertEqual(status, 401)


out = io.StringIO()
result = unittest.TextTestRunner(stream=out, verbosity=2).run(
    unittest.defaultTestLoader.loadTestsFromTestCase(ApiTests))
print(out.getvalue().strip().splitlines()[-1])
for line in out.getvalue().splitlines():
    if " ... " in line:
        print(line)`
      }
    ],
    codeTitle: ['App under test', 'TestClient + overrides + error paths', 'AsyncClient + ASGITransport', 'Runnable: a hand-made ASGI transport'],
    viz: {
      title: 'A test request travels through the app in memory',
      input: 'POST /notes ok ; POST /notes bad ; GET /notes/99 ; POST /notes dup ; GET /notes/1 noauth',
      inputLabel: 'Scenarios separated by ";": METHOD PATH then ok | bad | dup | noauth (GET 99 = missing id)',
      gen: function (input) {
        var sc = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 6);
        if (!sc.length) throw new Error('Type scenarios like: POST /notes ok ; GET /notes/99');
        var nodes = [bx('T', 'test function', 6, 8, 16), bx('C', 'TestClient / AsyncClient', 30, 8, 20), bx('X', 'ASGITransport (no network)', 56, 8, 22), bx('V', 'Pydantic validation', 84, 8, 16),
          bx('A', 'get_current_user (override: alice)', 30, 46, 26), bx('D', 'get_repo (override: fake repo)', 58, 46, 24), bx('H', 'route handler', 84, 46, 16), bx('E', 'HTTPException / 422 handler', 6, 46, 20)];
        var edges = [['T', 'C'], ['C', 'X'], ['X', 'V'], ['V', 'H'], ['H', 'A'], ['H', 'D'], ['V', 'E'], ['H', 'E'], ['A', 'E'], ['E', 'T'], ['H', 'T']];
        var frames = [], titles = {};
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 60, label: 'Inside one test (all in one process)', nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        function fr(narr, hl, ehl, res) { frames.push({ narr: narr, parts: [g(hl, ehl), { type: 'vars', label: 'Response so far', vals: res || {}, hl: {} }] }); }
        fr('The test asks the client for a request. The client builds a real HTTP request object, but the transport calls the app function directly in memory.', { T: 'cur' }, {}, {});
        sc.forEach(function (s) {
          var w = s.split(/\s+/), method = (w[0] || 'GET').toUpperCase(), path = w[1] || '/notes', kind = (w[2] || 'ok').toLowerCase();
          var label = method + ' ' + path + (w[2] ? ' (' + kind + ')' : '');
          fr('<b>' + hesc(label) + '</b>: test → client → ASGITransport. Still no socket: the transport turns the request into an ASGI <code>scope</code> dict and awaits <code>app(scope, receive, send)</code>.', { T: 'done', C: 'cur', X: 'cur' }, { 'T-C': 'cur', 'C-X': 'cur' }, { request: label });
          if (method === 'POST' && kind === 'bad') {
            fr('Validation fails before your handler runs: <code>title</code> is missing. FastAPI\'s default handler answers <b>422</b> with <code>detail[].loc = ["body","title"]</code>. The repo is never touched, which is exactly what the test should assert.', { V: 'bad', E: 'cur' }, { 'X-V': 'cur', 'V-E': 'bad' }, { request: label, status: 422, body: 'detail[0].loc = ["body","title"]' });
            fr('The response comes back to the test. Assert status, the error location, and <code>repo.count() == 0</code>.', { T: 'ok', E: 'done' }, { 'E-T': 'ok' }, { request: label, status: 422, assert: 'status, loc, nothing written' });
            return;
          }
          fr('Validation passes. FastAPI resolves dependencies. They are <b>overridden</b>: the current user is a fixed test user and the repo is an in-memory fake.', { V: 'ok', H: 'cur', A: 'sel', D: 'sel' }, { 'X-V': 'ok', 'V-H': 'cur', 'H-A': 'cur', 'H-D': 'cur' }, { request: label, user: kind === 'noauth' ? 'None (override)' : 'alice (override)', repo: 'fake' });
          if (kind === 'noauth') {
            fr('The test overrode <code>get_current_user</code> to raise <code>HTTPException(401)</code>. The handler body never runs.', { A: 'bad', E: 'cur' }, { 'A-E': 'bad' }, { request: label, status: 401, header: 'WWW-Authenticate: Bearer' });
            fr('Back in the test: assert 401 and the <code>WWW-Authenticate</code> header. Then the fixture clears the override.', { T: 'ok' }, { 'E-T': 'ok' }, { request: label, status: 401 });
            return;
          }
          if (method === 'GET' && /\/9\d*$/.test(path)) {
            fr('The fake repo returns <code>None</code> for id 99, so the handler raises <code>HTTPException(404)</code>.', { H: 'bad', E: 'cur', D: 'done' }, { 'H-D': 'done', 'H-E': 'bad' }, { request: label, status: 404, body: '{"detail": "note not found"}' });
            fr('Test asserts 404. A good suite also checks that someone else\'s note gives the <b>same</b> 404 body.', { T: 'ok' }, { 'E-T': 'ok' }, { request: label, status: 404 });
            return;
          }
          if (kind === 'dup') {
            titles.Plan = true;
            fr('The fake repo already holds "Plan" and raises <code>DuplicateTitle</code>; the handler converts it to <b>409</b>.', { D: 'bad', H: 'cur', E: 'cur' }, { 'H-D': 'bad', 'H-E': 'bad' }, { request: label, status: 409, body: '{"detail": "note title already exists"}' });
            fr('Test asserts 409 and that the <b>first</b> note is unchanged (side effects matter on error paths too).', { T: 'ok' }, { 'E-T': 'ok' }, { request: label, status: 409 });
            return;
          }
          var st = method === 'POST' ? 201 : 200;
          fr('The handler runs with the fake repo and returns a model. <code>response_model</code> filters the fields.', { H: 'ok', D: 'ok' }, { 'H-D': 'ok' }, { request: label, status: st });
          fr('Response reaches the test: assert status ' + st + ', the exact body shape, and the side effect in the fake repo.', { T: 'ok', H: 'done' }, { 'H-T': 'ok' }, { request: label, status: st, assert: 'status, body, repo state' });
        });
        fr('After the test the fixture runs <code>app.dependency_overrides.clear()</code>, so the next test starts with a clean app.', { T: 'done' }, {}, { overrides: '{}' });
        return frames;
      }
    },
    examples: [
      {
        title: 'Testing a 500: raise_server_exceptions=False',
        html: `<p>By default <code>TestClient</code> re-raises an unhandled exception inside your test, which is great for debugging but hides what a client would see. To test your generic error handler (a JSON body with a request id and no stack trace), turn that off.</p>
          ${H.table(['Setting', 'Unhandled error in a route', 'Test sees'], [['default (<code>True</code>)', 'raised into the test', 'the Python exception'], ['<code>raise_server_exceptions=False</code>', 'handled by the app', H.c('g', 'a 500 response, as a real client would')]])}`,
        code: { lang: 'python', code: `from fastapi.testclient import TestClient


def test_unexpected_error_is_hidden(app):
    def boom():
        raise RuntimeError("database password is hunter2")   # must never reach the client

    app.dependency_overrides[get_repo] = boom
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get("/notes/1")
    assert r.status_code == 500
    assert "hunter2" not in r.text
    assert r.json()["error"] == "internal_error"` }
      },
      {
        title: 'Overriding a dependency with parameters (a class-based dependency)',
        html: `<p>If a route depends on <code>Depends(RateLimiter(times=5))</code>, the key FastAPI uses is that specific <b>instance</b>, which a test cannot easily get. Make the dependency a plain function that returns the configured object, then override the function. Rule of thumb: <b>override what you can name</b>.</p>`,
        code: { lang: 'python', code: `# app/deps.py
from app.limits import RateLimiter


def get_limiter() -> RateLimiter:          # nameable, so overridable
    return RateLimiter(times=5, seconds=60)


# tests
class AllowAll:
    def check(self, key: str) -> bool:
        return True


def test_bulk_import(app, client):
    app.dependency_overrides[get_limiter] = AllowAll
    assert client.post("/import", json=[]).status_code == 202` }
      },
      {
        title: 'Two requests at once with AsyncClient',
        html: `<p>Want to see what happens when two clients create the same email at the same moment? An async client lets you fire both concurrently with <code>asyncio.gather</code>. Against a real database with a unique constraint, exactly one should be <b>201</b> and the other <b>409</b>, never two 201s and never a 500.</p>`,
        code: { lang: 'python', code: `import asyncio


async def test_concurrent_signup_one_wins(ac):
    body = {"email": "race@example.test", "password": "correct horse battery"}
    r1, r2 = await asyncio.gather(ac.post("/signup", json=body), ac.post("/signup", json=body))
    assert sorted([r1.status_code, r2.status_code]) == [201, 409]` }
      }
    ],
    deepDive: `<p>🟣 <b>How TestClient works.</b> Since Starlette 0.21 <code>TestClient</code> is built on <b>httpx</b>: it is an <code>httpx.Client</code> with a custom transport that runs the ASGI app. Because your test is synchronous and the app is async, TestClient starts an event loop in a background thread with anyio's blocking portal and runs each request there. Consequence: an async resource created in an <code>async</code> fixture (on pytest-asyncio's loop) and then used by the app inside TestClient (on the portal's loop) fails with "attached to a different loop". If your fixtures are async, use <code>AsyncClient</code> so everything shares one loop.</p>
      <p><b>ASGITransport</b> calls the app per request with a scope built from the httpx request. It does not send <code>lifespan.startup</code>, so anything your lifespan creates (an engine, an HTTP client stored on <code>app.state</code>) is missing unless you use <code>LifespanManager</code> or set it up in a fixture. It also buffers the whole response body, so testing <b>streaming</b> responses needs care (use <code>ac.stream(...)</code> and read chunks).</p>
      <p><b>dependency_overrides</b> is a plain dict on the app consulted while solving each request's dependency graph. Overrides apply to sub-dependencies too, and the override's own parameters are resolved like a normal dependency, so an override can itself <code>Depends</code> on other things. A <code>yield</code> override's teardown runs after the response, just like the original.</p>
      <p><b>Loop scopes in pytest-asyncio 1.x.</b> The old <code>event_loop</code> fixture is gone. Each test gets a loop according to <code>loop_scope</code> (default function). A session-scoped async engine must run on a session-scoped loop: declare <code>@pytest_asyncio.fixture(scope="session", loop_scope="session")</code> and mark tests with <code>@pytest.mark.asyncio(loop_scope="session")</code>, or keep the engine sync for tests.</p>
      <p><b>Production reality.</b> API tests through the client are slower than unit tests (validation, serialisation, middleware) but catch the bugs users see: wrong status codes, leaked fields, missing auth. A healthy FastAPI suite is mostly these, backed by fast unit tests for tricky logic and a handful of real-database tests.</p>`,
    aiEra: `<p>🤖 Assistants write endpoint tests fast, but they love the happy path: "POST returns 201". Explicitly ask for "the 401, 403, 404, 409 and 422 paths, asserting the error body and that nothing was written". That one sentence doubles the value of the generated tests.</p>
      <p>Watch for outdated patterns in generated code: <code>AsyncClient(app=app)</code> (the <code>app=</code> shortcut was removed from httpx; use <code>transport=ASGITransport(app=app)</code>), a custom <code>event_loop</code> fixture (removed in pytest-asyncio 1.0), and overrides that are never cleared. Also check that tests assert on <b>responses</b>, not on mocks of your own handler internals.</p>
      <p>If you build LLM features behind endpoints, the same pattern applies: put the model client behind a dependency, override it with a fake that returns canned completions, and test the endpoint's validation and error mapping deterministically.</p>`,
    problems: [
      {
        title: 'Test the 422, 404 and 409 Paths of a Create-and-Fetch API',
        level: 'Medium',
        tags: ['TestClient', 'dependency_overrides', 'error paths', 'parametrize'],
        companies: ['Shopify', 'Atlassian'],
        statement: `<p>The <code>/users</code> API has <code>POST /users</code> (email must be unique and valid, name 1–80 characters) and <code>GET /users/{user_id}</code>. Its only tests check that a valid POST returns 201. Last week a refactor made duplicate emails return <b>500</b> and nobody noticed. Write a test module that pins down every error path:</p>
          <ul>
            <li>422 for: missing email, invalid email, empty name, name too long, a non-integer <code>user_id</code> in the path.</li>
            <li>409 for a duplicate email (case-insensitive), with the original row unchanged.</li>
            <li>404 for an unknown id, with a stable body.</li>
          </ul>
          <p>The app gets its repository through <code>Depends(get_user_repo)</code>. Use a fake repository so the tests need no database.</p>`,
        constraints: `<p>pytest 8, FastAPI with <code>TestClient</code>. No network, no real database, no shared state between tests. Each error case must be its own test id.</p>`,
        example: `<p><code>POST /users {"email": "Ann@Example.test", "name": "Ann"}</code> → ${H.c('g', '201')}; then <code>POST /users {"email": "ann@example.test", "name": "Other"}</code> → ${H.c('r', '409')} and <code>GET /users/1</code> still shows <code>name = "Ann"</code>.</p>
          <p>Why: the email is unique ignoring case, the conflict must not overwrite the first user, and the client gets a clear 409 instead of a 500.</p>`,
        brute: {
          why: `<p>The existing suite only posts one valid user and checks the status. It never sends bad input, never repeats an email and never fetches a missing id, so any regression in error handling (like a 500 for duplicates) slips through. It also uses the real database through the default dependency, so it is slow and order-dependent.</p>`,
          code: `def test_create_user(client):
    r = client.post("/users", json={"email": "a@example.test", "name": "A"})
    assert r.status_code == 201        # the only assertion in the suite`
        },
        mcq: {
          q: 'Your duplicate-email test gets 500 instead of 409. Where is the bug most likely?',
          options: ['In the test client', 'The handler does not catch the repository\'s unique-violation error and map it to 409', 'Pydantic validation', 'The test should expect 500'],
          answer: 1,
          explain: 'Unique violations surface as a repository or database exception; the endpoint must translate it into an HTTP 409. The test caught a real bug.'
        },
        hints: [
          'Hint 1: a fake repository with a dict keyed by <b>lower-cased email</b> lets you reproduce the 409 rule without a database.',
          'Hint 2: one fixture builds the app, installs <code>dependency_overrides[get_user_repo]</code>, yields a <code>TestClient</code>, and clears overrides afterwards.',
          'Hint 3: parametrize the 422 cases with <code>pytest.param(payload, expected_loc, id=...)</code>; for 409 and 404 assert status, body, and repository state after the call.'
        ],
        solution: {
          approach: `<p>Isolate the API from storage with a fake repository behind the same dependency. Each test gets a fresh fake and a fresh app through function-scoped fixtures, so no state leaks. Validation failures become one parametrized test with readable ids that checks the status and the exact <code>loc</code> FastAPI reports. The conflict test checks three things: 201 then 409, the error body, and that the original record is unchanged. The 404 test fixes the body shape so clients can rely on it. A final test with <code>raise_server_exceptions=False</code> guards against the "500 for duplicates" regression returning in a different form.</p>`,
          code: `# tests/api/test_users_errors.py
from collections.abc import Iterator
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.users import DuplicateEmail, get_user_repo


@dataclass
class UserRow:
    id: int
    email: str
    name: str


class FakeUserRepo:
    """Same methods and errors as the SQL repository, stored in a dict."""

    def __init__(self) -> None:
        self.by_email: dict[str, UserRow] = {}
        self.by_id: dict[int, UserRow] = {}

    def add(self, email: str, name: str) -> UserRow:
        key = email.lower()
        if key in self.by_email:
            raise DuplicateEmail(email)
        row = UserRow(id=len(self.by_id) + 1, email=key, name=name)
        self.by_email[key] = row
        self.by_id[row.id] = row
        return row

    def get(self, user_id: int) -> UserRow | None:
        return self.by_id.get(user_id)


@pytest.fixture
def repo() -> FakeUserRepo:
    return FakeUserRepo()


@pytest.fixture
def client(repo: FakeUserRepo) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_user_repo] = lambda: repo
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


VALID = {"email": "ann@example.test", "name": "Ann"}


@pytest.mark.parametrize(
    ("payload", "loc"),
    [
        pytest.param({"name": "Ann"}, ["body", "email"], id="missing-email"),
        pytest.param({"email": "not-an-email", "name": "Ann"}, ["body", "email"], id="invalid-email"),
        pytest.param({"email": "a@example.test", "name": ""}, ["body", "name"], id="empty-name"),
        pytest.param({"email": "a@example.test", "name": "x" * 81}, ["body", "name"], id="name-too-long"),
    ],
)
def test_create_user_422(client: TestClient, repo: FakeUserRepo, payload: dict, loc: list[str]) -> None:
    r = client.post("/users", json=payload)
    assert r.status_code == 422
    assert loc in [e["loc"] for e in r.json()["detail"]]
    assert repo.by_id == {}                                  # nothing stored


def test_get_user_non_int_id_422(client: TestClient) -> None:
    r = client.get("/users/abc")
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"] == ["path", "user_id"]


def test_duplicate_email_is_409_case_insensitive(client: TestClient, repo: FakeUserRepo) -> None:
    first = client.post("/users", json={"email": "Ann@Example.test", "name": "Ann"})
    dup = client.post("/users", json={"email": "ann@example.test", "name": "Other"})
    assert first.status_code == 201
    assert dup.status_code == 409
    assert dup.json() == {"detail": "email already registered"}
    assert repo.get(first.json()["id"]).name == "Ann"        # first user unchanged
    assert len(repo.by_id) == 1


def test_unknown_user_404(client: TestClient) -> None:
    r = client.get("/users/424242")
    assert r.status_code == 404
    assert r.json() == {"detail": "user not found"}


def test_duplicate_never_500(repo: FakeUserRepo) -> None:
    app = create_app()
    app.dependency_overrides[get_user_repo] = lambda: repo
    with TestClient(app, raise_server_exceptions=False) as c:
        c.post("/users", json=VALID)
        assert c.post("/users", json=VALID).status_code != 500`,
          complexity: `<p>Nine fast tests, all in memory: each runs in a few milliseconds. No database, no network, no ordering dependencies because every test builds its own repo and app.</p>`,
          followUps: ['How do you make sure <code>FakeUserRepo</code> and the SQL repository really behave the same (contract tests, topic 6)?', 'Which of these tests would you also run against PostgreSQL, and why?']
        },
        tests: { skip: 'test-suite wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — Test databases and a transaction per test
     ===================================================================== */
  topics.push({
    title: 'Test Databases: Real PostgreSQL, Migrations Once, and a Rolled-Back Transaction per Test',
    analogy: `<p>Imagine a <b>whiteboard</b> shared by a whole class. If every student writes on it and nobody erases, the next student reads leftover scribbles and gets the wrong answer. That is a test suite that shares one database without cleanup.</p>
      <p>The fix is a sheet of <b>tracing paper</b> laid over the board for each student. They write freely, even "permanently" in their eyes, and when they are done you lift the paper off and throw it away. The board underneath (the migrated schema) was never touched. That tracing paper is <b>an outer transaction that is always rolled back</b>, and the "permanent" writes inside it are <b>savepoints</b>.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> Tests that touch a database need two things that pull in opposite directions: <b>realism</b> (same database engine, same migrations, same constraints as production) and <b>isolation + speed</b> (every test starts clean, the suite runs in seconds). The standard answer:</p>
      <ol>
        <li><b>Once per run</b> (session fixture): start a real PostgreSQL (a Testcontainers container locally, a service container in CI), create the engine, run <code>alembic upgrade head</code>.</li>
        <li><b>Once per test</b> (function fixture): open a connection, <code>BEGIN</code> an outer transaction, bind a <code>Session</code> to that connection in <b>savepoint mode</b>, hand that session to the app through <code>dependency_overrides[get_db]</code>.</li>
        <li><b>After the test</b>: roll back the outer transaction. Every row the test or the app wrote disappears, even rows the app "committed".</li>
      </ol>
      ${H.table(['Option', 'Speed', 'Realism', 'Verdict'], [
        ['SQLite in memory instead of PostgreSQL', H.c('g', 'fastest'), H.c('r', 'different SQL: no JSONB, different locking, looser types, other error codes'), 'fine for pure ORM logic; misses real bugs'],
        ['Real PostgreSQL + transaction rollback per test', H.c('g', 'fast (ms per test)'), H.c('g', 'same engine, constraints, migrations'), H.c('g', 'the default choice')],
        ['Real PostgreSQL + TRUNCATE all tables after each test', 'slower (tens of ms)', 'works when the app uses several connections', 'for code with background threads/workers'],
        ['A new database per test (from a TEMPLATE)', 'slow-ish (100 ms+)', 'perfect isolation', 'for tests that must COMMIT for real (e.g. testing LISTEN/NOTIFY)'],
        ['Mocking the session', 'fast', H.c('r', 'tests nothing about SQL'), 'avoid for repositories']
      ])}
      <p><b>Why savepoints?</b> Your endpoint calls <code>session.commit()</code>. Without savepoints that would commit the outer transaction and the rollback trick would fail. SQLAlchemy 2.0 solves it with <code>Session(bind=connection, join_transaction_mode="create_savepoint")</code>: the session never commits the outer transaction it joined; its own <code>commit()</code> only releases a <code>SAVEPOINT</code>, and its <code>rollback()</code> rolls back to the savepoint. The test sees the "committed" data, and the final outer <code>ROLLBACK</code> erases it all.</p>
      <p>🔵 <b>Connection strings come from the environment.</b> CI sets <code>TEST_DATABASE_URL</code> for its throwaway service container; locally Testcontainers generates a random password and hands you the URL. Nothing secret is written in the test code.</p>`,
    clues: [
      '"Tests pass alone but fail together" → leftover rows: isolate with a rolled-back outer transaction per test',
      '"The app calls commit, so how can the test roll back?" → <code>join_transaction_mode="create_savepoint"</code>: commit releases a SAVEPOINT only',
      '"Should tests use SQLite to be fast?" → only for pure logic; constraint, JSONB, locking and migration bugs need real PostgreSQL',
      '"Schema setup is slow" → run migrations once in a session fixture, not per test',
      '"Parallel tests with pytest-xdist corrupt each other" → one database per worker using <code>worker_id</code>',
      '"Background job uses its own connection and cannot see test data" → that test needs real commits plus TRUNCATE cleanup'
    ],
    code: [
      {
        lang: 'python', title: 'tests/conftest.py — Postgres once per run, a rolled-back transaction per test',
        code: `# tests/conftest.py
import os
from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.db import get_db
from app.main import create_app


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    """CI provides TEST_DATABASE_URL (a service container). Locally we start one."""
    url = os.environ.get("TEST_DATABASE_URL")
    if url:
        yield url
        return
    from testcontainers.postgres import PostgresContainer

    # random password generated by the container, never written in code
    with PostgresContainer("postgres:16-alpine", driver="psycopg") as pg:
        yield pg.get_connection_url()


@pytest.fixture(scope="session")
def engine(database_url: str) -> Iterator[Engine]:
    eng = create_engine(database_url, pool_pre_ping=True)
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(cfg, "head")          # real migrations, exactly like production
    yield eng
    eng.dispose()


@pytest.fixture
def db_session(engine: Engine) -> Iterator[Session]:
    """One outer transaction per test, always rolled back."""
    connection = engine.connect()
    outer = connection.begin()
    # The app's session.commit() only releases a SAVEPOINT inside "outer".
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        outer.rollback()                   # erase everything this test wrote
        connection.close()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    app: FastAPI = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()`
      },
      {
        lang: 'python', title: 'A database test: the app commits, the test still starts clean',
        code: `from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User


def test_signup_persists_user(client, db_session: Session) -> None:
    r = client.post("/signup", json={"email": "ann@example.test", "password": "long enough pw 123"})
    assert r.status_code == 201
    # the endpoint called session.commit(); inside our outer transaction we can see it
    user = db_session.scalars(select(User).where(User.email == "ann@example.test")).one()
    assert user.password_hash.startswith("$argon2id$")


def test_starts_empty(db_session: Session) -> None:
    # runs after the previous test, yet sees no users: the outer ROLLBACK erased them
    assert db_session.scalar(select(func.count()).select_from(User)) == 0


def test_unique_email_is_enforced_by_postgres(client) -> None:
    body = {"email": "dup@example.test", "password": "long enough pw 123"}
    assert client.post("/signup", json=body).status_code == 201
    assert client.post("/signup", json=body).status_code == 409   # from a real UNIQUE constraint`
      },
      {
        lang: 'python', title: 'Async version (SQLAlchemy AsyncSession + pytest-asyncio)',
        code: `# tests/conftest_async.py  (pytest-asyncio, asyncio_mode = "auto")
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.db import get_db
from app.main import create_app


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def async_engine(database_url: str) -> AsyncIterator[AsyncEngine]:
    eng = create_async_engine(database_url.replace("+psycopg", "+asyncpg"))
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def adb(async_engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    async with async_engine.connect() as conn:
        outer = await conn.begin()
        session = AsyncSession(bind=conn, join_transaction_mode="create_savepoint",
                               expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await outer.rollback()


@pytest_asyncio.fixture(loop_scope="session")
async def ac(adb: AsyncSession) -> AsyncIterator[AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: adb
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio(loop_scope="session")   # same loop as the session-scoped engine
async def test_list_empty(ac: AsyncClient) -> None:
    assert (await ac.get("/users")).json() == []`
      },
      {
        lang: 'python', title: 'pytest-xdist: one database per worker',
        code: `# Each xdist worker ("gw0", "gw1", ...) is its own process with its own session fixtures.
import os

import pytest
from sqlalchemy import create_engine, text


@pytest.fixture(scope="session")
def database_url(worker_id: str) -> str:
    base = os.environ["TEST_DATABASE_URL"]          # e.g. ...@localhost:5432/app_test
    if worker_id == "master":                       # not running under xdist
        return base
    name = f"app_test_{worker_id}"
    admin = create_engine(base, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{name}"'))
        conn.execute(text(f'CREATE DATABASE "{name}"'))
    admin.dispose()
    return base.rsplit("/", 1)[0] + "/" + name`
      },
      {
        lang: 'python', run: true, title: 'Runnable: savepoint-per-test isolation with sqlite3 + unittest',
        code: `# The same trick with the stdlib: an outer transaction per test, the "app" commits
# by releasing a SAVEPOINT, and tearDown rolls the outer transaction back.
import io
import sqlite3
import unittest

DB = sqlite3.connect(":memory:", isolation_level=None)   # we control transactions by hand
DB.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL)")
SQL_LOG = []


def run(sql, *args):
    SQL_LOG.append(sql)
    return DB.execute(sql, args)


class AppSession:
    """What the app sees: add + commit + rollback, like a SQLAlchemy Session."""

    def __init__(self):
        run("SAVEPOINT app")

    def add_user(self, email):
        run("INSERT INTO users (email) VALUES (?)", email)

    def commit(self):            # create_savepoint mode: release, then start a new one
        run("RELEASE SAVEPOINT app")
        run("SAVEPOINT app")

    def rollback(self):          # undo only since the last app commit
        run("ROLLBACK TO SAVEPOINT app")


def count():
    return DB.execute("SELECT COUNT(*) FROM users").fetchone()[0]


class DbTestCase(unittest.TestCase):
    def setUp(self):
        run("BEGIN")                       # outer transaction for this test
        self.session = AppSession()

    def tearDown(self):
        run("ROLLBACK")                    # everything this test wrote disappears


class SignupTests(DbTestCase):
    def test_1_app_commits(self):
        self.session.add_user("ann@example.test")
        self.session.commit()             # "permanent" from the app's point of view
        self.assertEqual(count(), 1)

    def test_2_starts_clean(self):
        self.assertEqual(count(), 0)      # previous test's commit was rolled back

    def test_3_app_rollback_after_error(self):
        self.session.add_user("bob@example.test")
        self.session.commit()
        try:
            self.session.add_user("bob@example.test")    # UNIQUE violation
        except sqlite3.IntegrityError:
            self.session.rollback()                      # the app recovers
        self.assertEqual(count(), 1)


out = io.StringIO()
result = unittest.TextTestRunner(stream=out, verbosity=0).run(
    unittest.defaultTestLoader.loadTestsFromTestCase(SignupTests))
print("ran", result.testsRun, "tests, failures:", len(result.failures), "errors:", len(result.errors))
print("rows left after the suite:", count())
print("SQL for the first test:")
for sql in SQL_LOG[:7]:
    print("  ", sql)`
      }
    ],
    codeTitle: ['conftest: DB fixtures', 'Tests using the DB', 'Async version', 'xdist: DB per worker', 'Runnable: savepoints with sqlite3'],
    viz: {
      title: 'Tracing paper: outer transaction, savepoints and what survives',
      input: 'test_signup: add ann; commit; add bob; rollback | test_list: count | test_dup: add cy; commit; add cy',
      inputLabel: 'Tests separated by |, each "name: steps" with steps add NAME, commit, rollback, count',
      gen: function (input) {
        var tests = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
        if (!tests.length) throw new Error('Type: test_a: add ann; commit | test_b: count');
        var frames = [], disk = [], stack = [], rows = [], spRows = [], sql = [];
        function snap(narr, hlStack) {
          var h = {}; if (hlStack !== undefined && stack.length) h[stack.length - 1] = hlStack;
          frames.push({ narr: narr, parts: [
            { type: 'stack', label: 'Transaction nesting on the test connection', items: stack.slice(), hl: h },
            tbl('Rows visible inside this test', ['email'], rows.map(function (r) { return [r]; })),
            tbl('Rows committed for real (on disk)', ['email'], disk.map(function (r) { return [r]; })),
            txt('SQL sent', sql.length ? '<code>' + sql.slice(-5).map(hesc).join('</code><br><code>') + '</code>' : '<i>none</i>')
          ] });
        }
        snap('Session fixture already ran: PostgreSQL is up and <code>alembic upgrade head</code> created the empty schema. That schema is the whiteboard; we never write on it directly.');
        tests.forEach(function (t) {
          var c = t.indexOf(':'), name = c > 0 ? t.slice(0, c).trim() : 'test', body = c > 0 ? t.slice(c + 1) : t;
          var steps = body.split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8);
          stack = ['BEGIN (outer, owned by the fixture)']; sql.push('BEGIN');
          stack.push('SAVEPOINT sa_1 (the app session)'); sql.push('SAVEPOINT sa_1');
          rows = disk.slice(); spRows = rows.slice();
          snap('<code>' + hesc(name) + '</code> starts. The <code>db_session</code> fixture opens a connection, begins the outer transaction, and the session joins it in <b>create_savepoint</b> mode.', 'ok');
          var spN = 1;
          steps.forEach(function (st) {
            var w = st.split(/\s+/), op = (w[0] || '').toLowerCase();
            if (op === 'add' && w[1]) {
              var e = w[1].slice(0, 14) + (w[1].indexOf('@') < 0 ? '@ex.test' : '');
              if (rows.indexOf(e) >= 0) {
                sql.push('INSERT ' + e + ' -- UNIQUE violation');
                snap('The app inserts <code>' + hesc(e) + '</code> again: PostgreSQL raises a <b>unique violation</b>, a real constraint you only catch with a real database. The app catches it, calls <code>session.rollback()</code> (back to the savepoint) and returns 409.', 'bad');
                sql.push('ROLLBACK TO SAVEPOINT sa_' + spN); rows = spRows.slice();
                snap('<code>ROLLBACK TO SAVEPOINT</code> undid only the work since the app\'s last commit. The outer transaction is still healthy.', 'cur');
              } else {
                rows.push(e); sql.push('INSERT ' + e);
                snap('The app inserts <code>' + hesc(e) + '</code>. It is visible inside this transaction only.', 'cur');
              }
            } else if (op === 'commit') {
              sql.push('RELEASE SAVEPOINT sa_' + spN); spN++; sql.push('SAVEPOINT sa_' + spN);
              stack[stack.length - 1] = 'SAVEPOINT sa_' + spN + ' (the app session)'; spRows = rows.slice();
              snap('The endpoint calls <code>session.commit()</code>. In savepoint mode this is only <code>RELEASE SAVEPOINT</code> + a new savepoint. The app believes the data is saved; disk is still untouched.', 'ok');
            } else if (op === 'rollback') {
              sql.push('ROLLBACK TO SAVEPOINT sa_' + spN); rows = spRows.slice();
              snap('The app calls <code>session.rollback()</code>: back to the last savepoint. Earlier "commits" survive inside the test.', 'bad');
            } else if (op === 'count') {
              snap('The test counts users and sees <b>' + rows.length + '</b>. ' + (rows.length ? '' : 'Clean slate: earlier tests left nothing behind.'), 'cur');
            } else {
              snap('Unknown step <code>' + hesc(st) + '</code>. Use add NAME, commit, rollback or count.');
            }
          });
          sql.push('ROLLBACK'); stack = []; rows = disk.slice();
          snap('<code>' + hesc(name) + '</code> ends. The fixture rolls back the <b>outer</b> transaction: every insert and every app "commit" vanishes. Committed-on-disk rows: ' + disk.length + '.');
        });
        snap('Whole run finished. The database is exactly as the migrations left it, so tests can run in any order and in parallel per worker.');
        return frames;
      }
    },
    examples: [
      {
        title: 'Why SQLite tests passed but production failed',
        html: `<p>A team tested against SQLite in memory for speed. In production on PostgreSQL three things broke that tests never saw:</p>
          ${H.table(['Code', 'SQLite in tests', 'PostgreSQL in prod'], [['Insert a 300-char string into <code>VARCHAR(120)</code>', H.c('g', 'accepted (length not enforced)'), H.c('r', 'error: value too long')], ['<code>WHERE data["tags"].contains(...)</code> on JSONB', H.c('r', 'not supported / different'), 'works'], ['Two requests update the same row with <code>with_for_update()</code>', H.c('r', 'FOR UPDATE ignored (database-level lock)'), 'row lock, second waits'], ['Catch <code>IntegrityError</code> and read the constraint name', 'different message format', 'SQLSTATE 23505 + constraint name']])}
          <p>Lesson: use the same database engine in tests as in production for anything touching SQL. Keep SQLite (or fakes) only for logic that never reaches the database.</p>`
      },
      {
        title: 'When rollback isolation is not enough: TRUNCATE cleanup',
        html: `<p>A test triggers an endpoint that starts a background thread which opens its <b>own</b> connection from the pool. That connection cannot see the test's uncommitted outer transaction, so the thread finds no user. For these few tests, let commits be real and clean up afterwards.</p>`,
        code: { lang: 'python', code: `import pytest
from sqlalchemy import text

from app.models import Base


@pytest.fixture
def committed_db(engine):
    yield engine                               # code under test commits for real
    with engine.begin() as conn:               # cleanup: one fast statement for all tables
        names = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        conn.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))` }
      },
      {
        title: 'Testing a migration itself',
        html: `<p>Migrations are code too. A cheap but powerful test: start from an empty database, upgrade to <code>head</code>, downgrade to <code>base</code>, upgrade again. It catches broken <code>downgrade()</code> functions and migrations that only work once. A second test compares the migrated schema to the models with Alembic's <code>compare_metadata</code>, so a forgotten migration fails CI.</p>`,
        code: { lang: 'python', code: `from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext

from app.models import Base


def test_migrations_roundtrip(database_url: str) -> None:
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


def test_models_match_migrations(engine) -> None:
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == [], f"models and migrations differ: {diff}"` }
      }
    ],
    deepDive: `<p>🟣 <b>What join_transaction_mode really does.</b> When a <code>Session</code> is bound to a <code>Connection</code> that already has a transaction, it must decide who owns that transaction. The modes are <code>"conservative_savepoint"</code> (the default: use a savepoint only if one is already in progress), <code>"create_savepoint"</code> (always work inside a new SAVEPOINT and never commit or roll back the outer transaction), <code>"rollback_only"</code> and <code>"control_fully"</code>. For tests you want <code>create_savepoint</code>: the session can commit and roll back as many times as the app likes, and the fixture keeps the final say. This replaced the old 1.x recipe that listened to <code>after_transaction_end</code> events to restart nested transactions.</p>
      <p><b>Visibility.</b> Inside one connection, a transaction sees its own uncommitted writes, so the test's assertions (using the same session or connection) see the app's data. A second connection (a background worker, a second engine) does not. If code under test uses <code>engine.begin()</code> on the global engine instead of the injected session, it escapes the sandbox and writes for real: a reason to route all database access through <code>get_db</code>.</p>
      <p><b>Sequences are not transactional.</b> PostgreSQL sequences do not roll back, so ids keep growing across tests. Never assert <code>id == 1</code>; assert on the returned id instead. Similarly, <code>now()</code> is the transaction start time, so many rows inserted in one test share a timestamp.</p>
      <p><b>Speed.</b> A rolled-back transaction costs about a millisecond. Container start is the slow part (1–3 s), which is why it is session-scoped. With pytest-xdist each worker needs its own database (or schema); creating them from a migrated <code>TEMPLATE</code> database (<code>CREATE DATABASE w1 TEMPLATE app_template</code>) skips re-running migrations per worker.</p>
      <p><b>Production reality.</b> Keep a small set of tests that run with real commits and real concurrency (two connections, <code>SELECT ... FOR UPDATE</code>, serialization failures). The rollback sandbox can never show you locking behaviour between two transactions.</p>`,
    aiEra: `<p>🤖 Ask an assistant for "a pytest fixture for SQLAlchemy tests" and you often get <code>Base.metadata.create_all()</code> plus <code>drop_all()</code> <b>per test</b> on SQLite: slow, unrealistic, and it skips your Alembic migrations. Ask specifically for "PostgreSQL via Testcontainers, alembic upgrade once per session, and a per-test outer transaction with <code>join_transaction_mode='create_savepoint'</code>".</p>
      <p>Older generated code uses the 1.x recipe with <code>session.begin_nested()</code> and an <code>after_transaction_end</code> event listener. It still works in many cases but is more fragile; recognise it and replace it.</p>
      <p>Agents that run your tests benefit hugely from a reliable sandbox: when every test starts clean, an agent's failing test is a real signal instead of leftover data from a previous run. Also make sure the test database URL can never point at a shared or production database: refuse to run if the database name does not end in <code>_test</code>.</p>`,
    problems: [
      {
        title: 'Build the Transaction-per-Test Sandbox',
        level: 'Hard',
        tags: ['test database', 'transactions', 'savepoint', 'sqlite3'],
        companies: ['GitLab', 'Instacart'],
        statement: `<p>Before trusting a magic fixture, build one. Write a class <code>TxnSandbox</code> over the standard-library <code>sqlite3</code> that behaves like a pytest database fixture with <code>join_transaction_mode="create_savepoint"</code>:</p>
          <ul>
            <li><code>TxnSandbox()</code>: in-memory database with table <code>users(email TEXT UNIQUE NOT NULL)</code>, created outside any test.</li>
            <li><code>begin_test()</code>: start the outer transaction and the app's savepoint.</li>
            <li><code>insert(email) -&gt; bool</code>: the app inserts a user; <code>False</code> if the email already exists (nothing changes), else <code>True</code>.</li>
            <li><code>app_commit()</code>: the app commits: the data must survive later <code>app_rollback()</code> calls in the same test.</li>
            <li><code>app_rollback()</code>: undo everything since the app's last commit (or since the test started).</li>
            <li><code>count() -&gt; int</code>: users visible now.</li>
            <li><code>end_test()</code>: discard <b>everything</b> written in this test, including app commits.</li>
          </ul>`,
        constraints: `<p>Calls arrive in a valid order: <code>insert</code>/<code>app_commit</code>/<code>app_rollback</code>/<code>count</code> happen between <code>begin_test</code> and <code>end_test</code> (count may also be called outside a test). Up to 10<sup>4</sup> calls.</p>`,
        example: `<p><code>begin_test, insert a, app_commit, insert b, app_rollback, count</code> → ${H.c('g', '1')}; then <code>end_test, count</code> → ${H.c('g', '0')}.</p>
          <p>Why: <code>a</code> was committed by the app (savepoint released), <code>b</code> was rolled back to the savepoint; the outer rollback at <code>end_test</code> removes <code>a</code> too.</p>`,
        brute: {
          why: `<p>The naive fixture lets the app call a real <code>COMMIT</code> and then deletes rows in <code>end_test</code> with <code>DELETE FROM users</code>. It is slower, forgets tables nobody listed, breaks when foreign keys need an order, and if a test crashes before cleanup the next test starts dirty.</p>`,
          code: `import sqlite3


class NaiveSandbox:
    def __init__(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("CREATE TABLE users (email TEXT UNIQUE NOT NULL)")

    def begin_test(self):
        pass

    def insert(self, email):
        try:
            self.db.execute("INSERT INTO users VALUES (?)", (email,))
            return True
        except sqlite3.IntegrityError:
            return False

    def app_commit(self):
        self.db.commit()                       # real commit

    def app_rollback(self):
        self.db.rollback()

    def count(self):
        return self.db.execute("SELECT COUNT(*) FROM users").fetchone()[0]

    def end_test(self):
        self.db.execute("DELETE FROM users")   # manual cleanup, easy to forget a table
        self.db.commit()`
        },
        mcq: {
          q: 'Inside the sandbox, the app calls <code>commit()</code>. What SQL should actually run?',
          options: ['COMMIT', 'RELEASE SAVEPOINT, then a new SAVEPOINT', 'ROLLBACK', 'Nothing at all'],
          answer: 1,
          explain: 'Releasing the savepoint keeps the work inside the outer transaction (so later app rollbacks cannot undo it), and a new savepoint gives the next unit of work a rollback point. The outer ROLLBACK still erases it all.'
        },
        hints: [
          'Hint 1: open the connection with <code>isolation_level=None</code> so Python does not start or commit transactions behind your back.',
          'Hint 2: <code>begin_test</code> = <code>BEGIN</code> + <code>SAVEPOINT app</code>. <code>app_commit</code> = <code>RELEASE SAVEPOINT app</code> + <code>SAVEPOINT app</code>. <code>app_rollback</code> = <code>ROLLBACK TO SAVEPOINT app</code> (the savepoint stays open in SQLite).',
          'Hint 3: a UNIQUE violation fails only that statement in SQLite, so catch <code>sqlite3.IntegrityError</code> and return False. <code>end_test</code> = <code>ROLLBACK</code>.'
        ],
        solution: {
          approach: `<p>Use SQL savepoints exactly as SQLAlchemy does. The outer transaction belongs to the "fixture"; the app only ever works inside a savepoint named <code>app</code>. An app commit releases the savepoint (merging its work into the outer transaction) and opens a fresh one; an app rollback returns to the current savepoint. Ending the test rolls back the outer transaction, which discards all savepoints and their work in one step. Turning off Python's implicit transaction handling makes every transaction boundary explicit.</p>`,
          code: `import sqlite3


class TxnSandbox:
    def __init__(self):
        # isolation_level=None: no implicit BEGIN/COMMIT, we send them ourselves
        self.db = sqlite3.connect(":memory:", isolation_level=None)
        self.db.execute("CREATE TABLE users (email TEXT UNIQUE NOT NULL)")  # the "migrated schema"

    def begin_test(self):
        self.db.execute("BEGIN")              # outer transaction, owned by the fixture
        self.db.execute("SAVEPOINT app")      # the app session works in here

    def insert(self, email):
        try:
            self.db.execute("INSERT INTO users (email) VALUES (?)", (email,))
            return True
        except sqlite3.IntegrityError:        # unique violation: only this statement fails
            return False

    def app_commit(self):
        self.db.execute("RELEASE SAVEPOINT app")   # keep the work inside the outer txn
        self.db.execute("SAVEPOINT app")           # fresh rollback point for the app

    def app_rollback(self):
        self.db.execute("ROLLBACK TO SAVEPOINT app")   # savepoint stays open afterwards

    def count(self):
        return self.db.execute("SELECT COUNT(*) FROM users").fetchone()[0]

    def end_test(self):
        self.db.execute("ROLLBACK")           # erase everything, including app commits`,
          complexity: `<p>Each call is one or two SQL statements, O(1) apart from the database work itself. Ending a test is a single ROLLBACK, independent of how many tables or rows the test touched.</p>`,
          followUps: ['How would you support a test that calls <code>begin_test</code> twice by mistake (nested fixtures)?', 'Why can a second connection not see the data the app "committed" here?']
        },
        tests: { cls: 'TxnSandbox', sigs: { TxnSandbox: '', begin_test: '-> void', insert: 'string -> bool', app_commit: '-> void', app_rollback: '-> void', count: '-> int', end_test: '-> void' }, cases: [
          { ops: ['TxnSandbox', 'begin_test', 'insert', 'app_commit', 'insert', 'app_rollback', 'count', 'end_test', 'count'], args: [[], [], ['a'], [], ['b'], [], [], [], []], out: [null, null, true, null, true, null, 1, null, 0] },
          { ops: ['TxnSandbox', 'count'], args: [[], []], out: [null, 0] },
          { ops: ['TxnSandbox', 'begin_test', 'insert', 'insert', 'count', 'end_test'], args: [[], [], ['x'], ['x'], [], []], out: [null, null, true, false, 1, null] },
          { ops: ['TxnSandbox', 'begin_test', 'insert', 'app_rollback', 'count', 'insert', 'count'], args: [[], [], ['x'], [], [], ['x'], []], out: [null, null, true, null, 0, true, 1] },
          { ops: ['TxnSandbox', 'begin_test', 'insert', 'app_commit', 'end_test', 'begin_test', 'insert', 'count', 'end_test'], args: [[], [], ['a'], [], [], [], ['a'], [], []], out: [null, null, true, null, null, null, true, 1, null] },
          { ops: ['TxnSandbox', 'begin_test', 'insert', 'app_commit', 'insert', 'app_commit', 'insert', 'app_rollback', 'app_rollback', 'count'], args: [[], [], ['a'], [], ['b'], [], ['c'], [], [], []], out: [null, null, true, null, true, null, true, null, null, 2] },
          { ops: ['TxnSandbox', 'begin_test', 'insert', 'app_commit', 'insert', 'count'], args: [[], [], ['dup'], [], ['dup'], []], out: [null, null, true, null, false, 1] }
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Test data: factories, fakes and property-based tests
     ===================================================================== */
  topics.push({
    title: 'Test Data: Factories (factory_boy and Plain Functions), Deterministic Fakes and Property Tests with Hypothesis',
    analogy: `<p>A <b>factory</b> is a cookie cutter with sensible defaults: every press gives a complete, valid cookie, and if you want one with chocolate chips you say "same, but with chips". You never hand-shape every cookie, and you never fight over the one cookie left on the shared plate (a fixture row that ten tests secretly depend on).</p>
      <p>A <b>property test</b> is a food inspector who does not taste three cookies you picked, but grabs hundreds at random, including burnt, tiny and weird ones, and checks a rule that must always hold: "every cookie weighs more than zero". When one breaks the rule, the inspector keeps breaking it into smaller pieces until it finds the <b>smallest</b> crumb that still shows the problem.</p>`,
    explain: `<p>🟢 <b>Why factories.</b> API tests need users, tenants, orders and line items. Writing every field in every test is noisy, and a shared "seed data" fixture creates a <b>mystery guest</b>: a test passes because of some row three files away. A factory builds a <b>valid object with defaults</b>, and the test overrides only the fields it cares about, so the important data is visible in the test itself.</p>
      ${H.table(['Style', 'Looks like', 'Good for'], [
        ['Plain function', '<code>make_user(db, role="admin")</code>', 'small projects; zero dependencies; fully typed'],
        ['factory_boy', '<code>UserFactory(role="admin")</code>, <code>OrderFactory.create_batch(3)</code>', 'many related models; sequences, Faker, SubFactory, traits'],
        ['polyfactory', '<code>NoteInFactory.build()</code> for Pydantic models', 'request payloads generated from your schemas'],
        ['Fixture rows', '<code>def admin_user(db): ...</code>', 'one or two very common actors, built with a factory inside']
      ])}
      <p><b>The factory_boy vocabulary</b> you need:</p>
      ${H.table(['Declaration', 'Meaning'], [
        ['<code>factory.Sequence(lambda n: f"user{n}@example.test")</code>', 'a unique value per object: unique constraints never collide'],
        ['<code>factory.Faker("name")</code>', 'realistic fake data (seed it so runs are repeatable)'],
        ['<code>factory.LazyAttribute(lambda o: o.name.lower() + "@example.test")</code>', 'computed from other fields of the same object'],
        ['<code>factory.SubFactory(UserFactory)</code>', 'creates the related parent object too (an order gets an owner)'],
        ['<code>class Params: admin = factory.Trait(role="admin", is_staff=True)</code>', 'a named bundle of overrides: <code>UserFactory(admin=True)</code>'],
        ['<code>.build()</code> vs <code>.create()</code>', 'in memory only vs added to the session (and flushed)']
      ])}
      <p>🟢 <b>Why property tests.</b> Example tests check the cases <i>you</i> thought of. <b>Hypothesis</b> generates hundreds of inputs from a <b>strategy</b> (<code>st.integers()</code>, <code>st.text()</code>, <code>st.lists(...)</code>, <code>st.builds(Model)</code>) and checks a <b>property</b>: a rule that must hold for every input. When it finds a failure it <b>shrinks</b> it to a minimal example and saves it in <code>.hypothesis/</code> so it is replayed next run.</p>
      ${H.table(['Property pattern', 'Example for an API'], [
        ['Round trip', '<code>decode_cursor(encode_cursor(x)) == x</code>; model → JSON → model'],
        ['Invariant', 'pagination: pages cover every item exactly once, none longer than <code>limit</code>'],
        ['Oracle / reference', 'fast price calculator equals a slow, obviously-correct one'],
        ['Idempotence', '<code>normalize(normalize(s)) == normalize(s)</code>; retrying a PUT gives the same state'],
        ['Never crashes', 'any JSON body gives 2xx or 4xx, never 500 (this is what schemathesis automates, topic 6)']
      ])}`,
    clues: [
      '"Tests break when someone edits the seed data" → mystery guest: build data with factories inside each test',
      '"duplicate key value violates unique constraint" in tests → use <code>factory.Sequence</code> for unique fields',
      '"Random test data made a test flaky" → seed Faker / factory random, assert on values you set, not on generated ones',
      '"Find edge cases I did not think of" / "for all inputs" → property-based testing with Hypothesis',
      '"Hypothesis found a 40-element failing list" → let it shrink; read the minimal example it prints',
      '"Generate request bodies from my Pydantic model" → <code>st.builds(Model)</code> or polyfactory'
    ],
    code: [
      {
        lang: 'python', title: 'Plain factory functions (typed, no extra library)',
        code: `# tests/factories.py
import itertools
from typing import Any

from sqlalchemy.orm import Session

from app.models import Note, User

_seq = itertools.count(1)


def make_user(db: Session, **overrides: Any) -> User:
    n = next(_seq)
    fields: dict[str, Any] = {
        "email": f"user{n}@example.test",     # unique, so constraints never collide
        "name": f"User {n}",
        "role": "member",
        "is_active": True,
    }
    fields.update(overrides)                   # the test states only what matters
    user = User(**fields)
    db.add(user)
    db.flush()                                 # id assigned, still inside the test transaction
    return user


def make_note(db: Session, owner: User | None = None, **overrides: Any) -> Note:
    owner = owner or make_user(db)
    note = Note(owner_id=owner.id, title=overrides.pop("title", f"Note {next(_seq)}"), **overrides)
    db.add(note)
    db.flush()
    return note


# In a test: the data that matters is right here, nothing hidden in a seed file.
def test_admin_sees_all_notes(client, db_session) -> None:
    admin = make_user(db_session, role="admin")
    make_note(db_session)
    make_note(db_session)
    r = client.get("/admin/notes", headers={"X-Test-User": str(admin.id)})
    assert len(r.json()) == 2`
      },
      {
        lang: 'python', title: 'factory_boy with SQLAlchemy: Sequence, Faker, LazyAttribute, SubFactory, Trait',
        code: `# tests/factories_fb.py
import factory
from factory.alchemy import SQLAlchemyModelFactory

from app.models import Order, OrderLine, User


class BaseFactory(SQLAlchemyModelFactory):
    class Meta:
        abstract = True
        sqlalchemy_session = None                  # set per test by a fixture (below)
        sqlalchemy_session_persistence = "flush"   # flush, never commit: the test txn rolls back


class UserFactory(BaseFactory):
    class Meta:
        model = User

    name = factory.Faker("name")
    email = factory.LazyAttribute(lambda o: o.name.lower().replace(" ", ".") + "@example.test")
    username = factory.Sequence(lambda n: f"user{n}")
    role = "member"
    is_active = True

    class Params:
        admin = factory.Trait(role="admin", is_staff=True)
        banned = factory.Trait(is_active=False)


class OrderFactory(BaseFactory):
    class Meta:
        model = Order

    owner = factory.SubFactory(UserFactory)       # an order always has a valid owner
    status = "pending"
    currency = "EUR"


class OrderLineFactory(BaseFactory):
    class Meta:
        model = OrderLine

    order = factory.SubFactory(OrderFactory)
    sku = factory.Sequence(lambda n: f"SKU-{n:05d}")
    quantity = 1
    unit_price_cents = 1999


# tests/conftest.py
import pytest
from factory.random import reseed_random


@pytest.fixture(autouse=True)
def _factories(db_session):
    reseed_random("be20-suite")                    # same fake names on every run
    for f in (UserFactory, OrderFactory, OrderLineFactory):
        f._meta.sqlalchemy_session = db_session
    yield


def test_order_total(db_session) -> None:
    order = OrderFactory(owner__admin=True)                 # "__" reaches into the SubFactory
    OrderLineFactory.create_batch(3, order=order, unit_price_cents=500)
    assert order.total_cents() == 1500
    assert order.owner.role == "admin"`
      },
      {
        lang: 'python', title: 'Hypothesis: properties for a cursor codec and pagination',
        code: `# tests/test_properties.py
from hypothesis import example, given, settings
from hypothesis import strategies as st

from app.pagination import decode_cursor, encode_cursor, paginate


@given(st.integers(min_value=0, max_value=2**63 - 1), st.datetimes())
def test_cursor_roundtrip(last_id: int, last_created) -> None:
    # round trip: whatever we encode, we must decode back exactly
    assert decode_cursor(encode_cursor(last_id, last_created)) == (last_id, last_created)


@given(st.text())
def test_decode_never_crashes_on_garbage(token: str) -> None:
    # invalid cursors must be rejected cleanly (-> 400), never crash (-> 500)
    try:
        decode_cursor(token)
    except ValueError:
        pass


@settings(max_examples=300)
@given(items=st.lists(st.integers(), unique=True), limit=st.integers(min_value=1, max_value=50))
@example(items=[], limit=1)                   # always also try this explicit edge case
def test_pages_cover_everything_once(items: list[int], limit: int) -> None:
    pages = list(paginate(items, limit))
    flat = [x for page in pages for x in page]
    assert flat == items                                   # nothing lost, nothing duplicated
    assert all(1 <= len(p) <= limit for p in pages)        # no empty or oversized pages`
      },
      {
        lang: 'python', title: 'Hypothesis with FastAPI: generate valid request bodies from the model',
        code: `from fastapi.testclient import TestClient
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from app.notes import NoteIn

# st.builds() reads type hints and Field constraints (min_length, max_length) for many types
valid_notes = st.builds(
    NoteIn,
    title=st.text(min_size=1, max_size=120).filter(lambda s: s.strip()),
    body=st.text(max_size=2000),
)


# client is function-scoped; Hypothesis reuses it across examples, which is fine here
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture], max_examples=50)
@given(note=valid_notes)
def test_any_valid_note_is_created(client: TestClient, note: NoteIn) -> None:
    r = client.post("/notes", json=note.model_dump())
    assert r.status_code == 201
    assert r.json()["title"] == note.title`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a tiny property tester that finds and shrinks a pagination bug',
        code: `# Hypothesis is not available here, so we build the core idea by hand:
# 1) generate random inputs from a seeded RNG, 2) check a property, 3) shrink the failure.
import random


def chunk(items, size):
    """BUGGY pagination: silently drops a final partial page."""
    return [items[i:i + size] for i in range(0, len(items) - size + 1, size)]


def prop_covers_all(items, size):
    flat = [x for page in chunk(items, size) for x in page]
    return flat == items


def shrink(items, size):
    """Greedy shrinking: smaller lists, smaller numbers, smaller size, while still failing."""
    changed = True
    while changed:
        changed = False
        for i in range(len(items)):                      # 1) try deleting each element
            cand = items[:i] + items[i + 1:]
            if not prop_covers_all(cand, size):
                items, changed = cand, True
                break
        else:
            for i, x in enumerate(items):                # 2) try making numbers simpler
                if x != 0:
                    cand = items[:i] + [0] + items[i + 1:]
                    if not prop_covers_all(cand, size):
                        items, changed = cand, True
                        break
            else:
                if size > 1 and not prop_covers_all(items, size - 1):   # 3) smaller size
                    size, changed = size - 1, True
    return items, size


rng = random.Random(2026)                                 # seeded: the run is reproducible
for attempt in range(1, 201):
    items = [rng.randint(-100, 100) for _ in range(rng.randint(0, 12))]
    size = rng.randint(1, 5)
    if not prop_covers_all(items, size):
        print(f"attempt {attempt}: FAILED for items={items}, size={size}")
        small_items, small_size = shrink(items, size)
        print(f"shrunk to:        items={small_items}, size={small_size}")
        print("chunk(...) returned", chunk(small_items, small_size), "so the item was lost")
        break
else:
    print("no counterexample found")

# the fix, checked against the same property on many random inputs
def chunk_fixed(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]

ok = all([x for p in chunk_fixed(xs, s) for x in p] == xs
         for xs, s in (([rng.randint(0, 9) for _ in range(rng.randint(0, 12))], rng.randint(1, 5))
                       for _ in range(500)))
print("fixed version passes 500 random cases:", ok)`
      }
    ],
    codeTitle: ['Plain factory functions', 'factory_boy + SQLAlchemy', 'Hypothesis properties', 'Hypothesis + FastAPI', 'Runnable: property test + shrinking'],
    viz: {
      title: 'Shrinking: from a messy failing input to the smallest one',
      input: '57 3 91 12 40 | 3',
      inputLabel: 'A failing list for the buggy chunk() (space separated, max 10) | page size',
      gen: function (input) {
        var p = String(input || '').split('|');
        var items = (p[0] || '').trim().split(/[\s,]+/).filter(Boolean).map(Number).slice(0, 10);
        var size = parseInt((p[1] || '3').trim(), 10);
        if (items.some(isNaN) || isNaN(size) || size < 1 || size > 6) throw new Error('Format: numbers separated by spaces | size between 1 and 6');
        function chunk(xs, s) { var out = []; for (var i = 0; i <= xs.length - s; i += s) out.push(xs.slice(i, i + s)); return out; }
        function holds(xs, s) { var f = []; chunk(xs, s).forEach(function (pg) { f = f.concat(pg); }); return f.join(',') === xs.join(','); }
        var frames = [];
        function fr(narr, xs, s, hl, verdict) {
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'candidate items', values: xs.length ? xs.slice() : ['(empty)'], hl: hl || {} },
            { type: 'vars', label: 'candidate', vals: { size: s, pages: JSON.stringify(chunk(xs, s)), property: verdict }, hl: { property: verdict === 'FAILS' ? 'bad' : 'ok' } }
          ] });
        }
        if (holds(items, size)) {
          fr('Property <code>flatten(chunk(items, size)) == items</code> <b>holds</b> for this input: its length is a multiple of the size, so nothing is dropped. Hypothesis would keep generating. Try a length that is not a multiple of the size.', items, size, {}, 'holds');
          fr('For example 5 items with size 3: the last 2 items fall off.', [1, 2, 3, 4, 5], 3, { 3: 'bad', 4: 'bad' }, 'FAILS');
          fr('Shrinking would then reduce that to the smallest failing case.', [0], 2, { 0: 'bad' }, 'FAILS');
          fr('The minimal example says it plainly: <b>one item, page size 2, the item disappears</b>.', [0], 2, { 0: 'bad' }, 'FAILS');
          return frames;
        }
        fr('Hypothesis found a failing input. The pages lose items at the end. Now it <b>shrinks</b>: it tries simpler inputs and keeps any that still fail.', items, size, {}, 'FAILS');
        var guard = 0, changed = true;
        while (changed && guard++ < 60) {
          changed = false;
          for (var i = 0; i < items.length; i++) {
            var cand = items.slice(0, i).concat(items.slice(i + 1));
            var h = {}; h[i] = 'bad';
            if (!holds(cand, size)) { fr('Delete <b>' + items[i] + '</b> (index ' + i + ')? The smaller list still fails, so keep the smaller list.', items, size, h, 'FAILS'); items = cand; changed = true; break; }
            else if (frames.length < 40) { var h2 = {}; h2[i] = 'win'; fr('Delete <b>' + items[i] + '</b>? Then the property holds, so this element is needed to show the bug. Put it back.', items, size, h2, 'FAILS'); }
          }
          if (changed) continue;
          for (var j = 0; j < items.length; j++) {
            if (items[j] !== 0) {
              var c2 = items.slice(); c2[j] = 0;
              if (!holds(c2, size)) { var h3 = {}; h3[j] = 'ok'; items = c2; fr('Replace a number with <b>0</b> (simpler). Still fails, keep it.', items, size, h3, 'FAILS'); changed = true; break; }
            }
          }
          if (changed) continue;
          if (size > 1 && !holds(items, size - 1)) { size -= 1; fr('Try a smaller page size: <b>' + size + '</b>. Still fails, keep it.', items, size, {}, 'FAILS'); changed = true; }
        }
        fr('Nothing simpler fails any more. This is the <b>minimal counterexample</b>: ' + items.length + ' item(s) with page size ' + size + ' and the last item is dropped. The bug is obvious now: the loop stops at <code>len - size</code> instead of <code>len</code>.', items, size, {}, 'FAILS');
        return frames;
      }
    },
    examples: [
      {
        title: 'The mystery guest, before and after',
        html: `<p>Before: <code>test_discount</code> passes only because <code>seed.sql</code> contains a customer with 11 orders. Someone deletes a row and an unrelated-looking test fails. After: the test creates exactly the customer it needs.</p>
          ${H.table(['', 'Shared seed data', 'Factory inside the test'], [['Can you see the important data?', H.c('r', 'no, it is in another file'), H.c('g', 'yes, one line')], ['Safe to run in any order / in parallel?', H.c('r', 'often not'), H.c('g', 'yes')], ['Breaks when unrelated data changes?', H.c('r', 'yes'), H.c('g', 'no')]])}`,
        code: { lang: 'python', code: `def test_loyal_customer_gets_10_percent(db_session, client) -> None:
    customer = UserFactory()
    OrderFactory.create_batch(11, owner=customer, status="paid")   # the reason for the discount
    r = client.get(f"/customers/{customer.id}/discount")
    assert r.json() == {"percent": 10}` }
      },
      {
        title: 'Generated data that made a test flaky',
        html: `<p>A test asserted <code>r.json()["name"] == user.name.title()</code>. It failed once a week: Faker sometimes produced names like "McDonald" or "de la Cruz" where <code>.title()</code> changes the spelling. Two fixes, both important: <b>seed</b> the generator so failures are reproducible, and <b>set the values your assertion depends on</b> explicitly (<code>UserFactory(name="Ann Lee")</code>). Generated values are for fields the test does not care about.</p>`
      },
      {
        title: 'Reading a Hypothesis failure',
        html: `<p>When a property fails, Hypothesis prints the <b>shrunk</b> example and how to reproduce it. Turn that example into a permanent regression test with <code>@example(...)</code> so it runs every time, even with a fresh <code>.hypothesis</code> database in CI.</p>
          ${H.table(['Output line', 'Meaning'], [['<code>Falsifying example: test_pages_cover_everything_once(items=[0], limit=2)</code>', 'the minimal failing input after shrinking'], ['<code>@reproduce_failure(\'6.x\', b\'...\')</code>', 'exact replay blob (only valid for that Hypothesis version)'], ['<code>Unreliable test timings! ... deadline</code>', 'an example took longer than <code>deadline</code> (default 200 ms); raise it or set <code>deadline=None</code> for I/O tests']])}`
      }
    ],
    deepDive: `<p>🟣 <b>How Hypothesis generates and shrinks.</b> Every strategy draws from one underlying sequence of bytes (a "choice sequence"). Shrinking works on that sequence, not on your objects: shorter sequences and smaller byte values mean shorter lists and smaller numbers. This is why Hypothesis can shrink almost any strategy you compose, including <code>st.builds(Model)</code> and recursive JSON, without you writing shrink code. Failures are saved to the example database (<code>.hypothesis/examples</code>) and replayed first next time.</p>
      <p><b>Settings that matter.</b> <code>max_examples</code> (default 100) trades time for depth; use a profile with fewer examples locally and more in a nightly job (<code>settings.register_profile("ci", max_examples=1000)</code>, selected with <code>--hypothesis-profile=ci</code>). <code>deadline</code> fails slow examples; set it to <code>None</code> for tests that touch a database. Avoid <code>.filter()</code> that rejects most values: build the right values directly (<code>st.integers(min_value=1)</code> instead of filtering out non-positives) or Hypothesis raises a health check.</p>
      <p><b>Stateful testing.</b> <code>RuleBasedStateMachine</code> generates <b>sequences of API calls</b> (create, update, delete, list) and checks invariants against a simple model after every step: excellent for finding bugs that need three specific calls in a row. Schemathesis builds on the same engine for OpenAPI (topic 6).</p>
      <p><b>factory_boy internals.</b> Declarations are resolved in a defined order with lazy evaluation, so a <code>LazyAttribute</code> can read fields declared after it. <code>SubFactory</code> calls the sub-factory with the same strategy (build or create). Sequences are per factory class and keep counting across tests; never assert a specific sequence value. With SQLAlchemy, prefer <code>sqlalchemy_session_persistence="flush"</code>: commit would escape a savepoint sandbox only if the session were not in savepoint mode, and flush is all you need for ids.</p>
      <p><b>Production reality.</b> Factories are the most reused test code in a backend; keep them next to the models' shapes and update them in the same pull request as a migration. Teams that skip that end up with a failing factory for every new NOT NULL column.</p>`,
    aiEra: `<p>🤖 Assistants generate factories well from a model file: paste the SQLAlchemy models and ask for "factory_boy factories with sequences for unique columns, SubFactory for foreign keys and traits for roles". Check that unique columns use sequences (generated code often uses <code>Faker("email")</code>, which can collide) and that persistence is <code>"flush"</code>.</p>
      <p>Property tests are where AI pair-programming shines in a different way: ask "what properties should hold for this function?" A good assistant lists round trips, invariants and oracles you can then encode. It is weaker at choosing <b>strategies</b>; generated code often filters heavily or generates values far outside your real domain.</p>
      <p>Property tests are also a strong check on AI-written code itself: an assistant's implementation can pass the three examples in its own tests and still fail on an empty list or a unicode string, which Hypothesis finds in seconds.</p>`,
    problems: [
      {
        title: 'Write a User Factory with Sequences, Lazy Fields and Traits',
        level: 'Medium',
        tags: ['factories', 'test data', 'factory_boy'],
        companies: ['Zalando', 'HubSpot'],
        statement: `<p>Your team does not want a new dependency yet, so write a tiny factory by hand that behaves like a factory_boy <code>UserFactory</code>. Class <code>UserFactory</code>:</p>
          <ul>
            <li><code>build(overrides) -&gt; str</code>: each call takes the next sequence number <code>n</code> (starting at 1, also consumed when fields are overridden). Defaults: <code>name = "User n"</code>, <code>email</code> = lazy: the name lower-cased with spaces replaced by dots + <code>"@example.test"</code>, <code>role = "member"</code>, <code>active = "true"</code>.</li>
            <li><code>overrides</code> is a list of <code>"field=value"</code> strings, or trait names: <code>"admin"</code> sets role to <code>admin</code>; <code>"banned"</code> sets active to <code>false</code>. Explicit <code>field=value</code> wins over a trait, whatever the order.</li>
            <li>The lazy email uses the <b>final</b> name, unless email itself is overridden.</li>
            <li>Return <code>"id=n|name=...|email=...|role=...|active=..."</code>.</li>
            <li><code>batch(k) -&gt; list[str]</code>: k default users.</li>
          </ul>`,
        constraints: `<p>Fields are only name, email, role, active. Values contain no <code>|</code> or <code>=</code>. Up to 10<sup>4</sup> builds.</p>`,
        example: `<p><code>build([])</code> → ${H.c('g', '"id=1|name=User 1|email=user.1@example.test|role=member|active=true"')}</p>
          <p><code>build(["name=Ann Lee", "admin"])</code> → ${H.c('g', '"id=2|name=Ann Lee|email=ann.lee@example.test|role=admin|active=true"')}</p>
          <p>Why: the sequence moves on every build; the email is derived from the overridden name; the trait sets the role.</p>`,
        brute: {
          why: `<p>Copy-pasting full user dictionaries into every test works until a column is added (every test breaks) or two tests use the same email (unique-constraint failures that depend on test order). A hard-coded email in a "default" also collides as soon as two users are built in one test.</p>`,
          code: `def build_user_naive():
    # same email every time: the second user in a test violates UNIQUE(email)
    return "id=1|name=Test User|email=test@example.test|role=member|active=true"`
        },
        mcq: {
          q: 'Why does a factory use a sequence for the email instead of a fixed default?',
          options: ['It looks nicer', 'Unique constraints: two users in one test would otherwise collide', 'Sequences are faster', 'Faker requires it'],
          answer: 1,
          explain: 'Any field with a unique constraint must differ between objects; a per-factory counter guarantees that without randomness.'
        },
        hints: [
          'Hint 1: keep a counter on the instance; increment it at the start of every <code>build</code>, before looking at overrides.',
          'Hint 2: apply in layers: defaults, then traits, then explicit <code>field=value</code> overrides. Only then compute the lazy email if it was not overridden.',
          'Hint 3: the lazy email is <code>name.lower().replace(" ", ".") + "@example.test"</code>; <code>batch(k)</code> is just k calls to <code>build([])</code>.'
        ],
        solution: {
          approach: `<p>Mirror factory_boy's resolution order: a sequence number per build, plain defaults, trait overrides, explicit overrides, then lazy attributes evaluated last against the final values. Splitting overrides into traits (no <code>=</code>) and explicit fields (with <code>=</code>) makes "explicit wins" automatic. The output string fixes the field order so tests can compare exactly.</p>`,
          code: `class UserFactory:
    TRAITS = {"admin": {"role": "admin"}, "banned": {"active": "false"}}

    def __init__(self):
        self.n = 0                                   # sequence, shared by all builds

    def build(self, overrides):
        self.n += 1
        n = self.n
        fields = {"name": f"User {n}", "role": "member", "active": "true"}
        explicit = {}
        for item in overrides:
            if "=" in item:
                key, value = item.split("=", 1)
                explicit[key] = value
            else:
                fields.update(self.TRAITS[item])     # traits first...
        fields.update(explicit)                      # ...explicit values win
        if "email" not in fields:                    # lazy attribute, from the final name
            fields["email"] = fields["name"].lower().replace(" ", ".") + "@example.test"
        return "id={}|name={}|email={}|role={}|active={}".format(
            n, fields["name"], fields["email"], fields["role"], fields["active"])

    def batch(self, k):
        return [self.build([]) for _ in range(k)]`,
          complexity: `<p>O(o) per build for o overrides. Memory O(1) besides the output.</p>`,
          followUps: ['How would you add a <code>SubFactory</code> so an order factory creates its owner?', 'How do you keep sequence numbers from leaking into assertions?']
        },
        tests: { cls: 'UserFactory', sigs: { UserFactory: '', build: 'string[] -> string', batch: 'int -> string[]' }, cases: [
          { ops: ['UserFactory', 'build', 'build'], args: [[], [[]], [['name=Ann Lee', 'admin']]], out: [null, 'id=1|name=User 1|email=user.1@example.test|role=member|active=true', 'id=2|name=Ann Lee|email=ann.lee@example.test|role=admin|active=true'] },
          { ops: ['UserFactory', 'build'], args: [[], [['banned']]], out: [null, 'id=1|name=User 1|email=user.1@example.test|role=member|active=false'] },
          { ops: ['UserFactory', 'build'], args: [[], [['role=editor', 'admin']]], out: [null, 'id=1|name=User 1|email=user.1@example.test|role=editor|active=true'] },
          { ops: ['UserFactory', 'build'], args: [[], [['email=boss@corp.test', 'name=Big Boss']]], out: [null, 'id=1|name=Big Boss|email=boss@corp.test|role=member|active=true'] },
          { ops: ['UserFactory', 'batch', 'build'], args: [[], [2], [['admin', 'banned']]], out: [null, ['id=1|name=User 1|email=user.1@example.test|role=member|active=true', 'id=2|name=User 2|email=user.2@example.test|role=member|active=true'], 'id=3|name=User 3|email=user.3@example.test|role=admin|active=false'] },
          { ops: ['UserFactory', 'batch'], args: [[], [0]], out: [null, []] },
          { ops: ['UserFactory', 'build', 'build'], args: [[], [['active=false']], [['name=Mary Jane Watson']]], out: [null, 'id=1|name=User 1|email=user.1@example.test|role=member|active=false', 'id=2|name=Mary Jane Watson|email=mary.jane.watson@example.test|role=member|active=true'] }
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — Mocking external services
     ===================================================================== */
  topics.push({
    title: 'Mocking External Services: Fakes vs Mocks, respx and pytest-httpx, Timeouts, Retries and No Real Network',
    analogy: `<p>A pilot does not learn engine failures by breaking real engines mid-flight. They use a <b>flight simulator</b> that can script any disaster on cue: "engine 2 fails 30 seconds after take-off". Your payment provider is that engine. In tests you want to script "first call times out, second call returns 503, third succeeds" and check that your code behaves like a calm pilot.</p>
      <p>There are two kinds of simulator. A <b>fake</b> is a small working copy of the system (an in-memory payment service that really keeps balances). A <b>mock</b> is a scripted actor that says exactly the lines you gave it and lets you check afterwards what it was asked.</p>`,
    explain: `<p>🟢 <b>Rule one: put a boundary around every external service.</b> Do not call <code>httpx.post("https://api.payments...")</code> from inside an endpoint. Write a small client class (<code>PaymentsClient</code>) with your own methods (<code>charge()</code>, <code>refund()</code>), give it to routes through <code>Depends</code>, and now you can test at three levels:</p>
      ${H.table(['Level', 'Replace what', 'Tool', 'Tests what'], [
        ['Service / endpoint tests', 'the whole <code>PaymentsClient</code>', 'a <b>fake</b> class via <code>dependency_overrides</code>', 'your business logic: order marked paid, 402 mapped to a user message'],
        ['Client tests', 'only the HTTP layer', '<b>respx</b> or <b>pytest-httpx</b>', 'your client: URL, headers, JSON, timeouts, retries, error parsing'],
        ['Contract / sandbox', 'nothing (real provider test mode)', 'a few marked tests, recorded cassettes', 'that the provider still behaves like your fake assumes']
      ])}
      <p><b>The words people mix up</b> (from Python 9, now applied):</p>
      ${H.table(['Double', 'What it is', 'Example here'], [
        ['Stub', 'returns canned answers, no logic', '<code>lambda **kw: {"id": "ch_1", "status": "succeeded"}</code>'],
        ['Fake', 'a working lightweight implementation', '<code>FakePayments</code> that stores charges in a dict and declines card "4000..."'],
        ['Mock', 'records calls so you can assert on them', '<code>MagicMock(spec=PaymentsClient)</code>, <code>assert_called_once_with(...)</code>'],
        ['Spy', 'wraps the real thing and records calls', '<code>MagicMock(wraps=real_client)</code>']
      ])}
      <p><b>What to test for an outbound call</b> (this is where real outages come from):</p>
      <ul>
        <li><b>Timeouts</b>: the provider hangs. Your client must have a timeout (httpx's default is 5 seconds; set it explicitly) and handle <code>httpx.TimeoutException</code>.</li>
        <li><b>Retries</b>: retry only safe failures (timeouts, connection errors, 429, 502/503/504), with exponential backoff, a maximum, and the <b>same Idempotency-Key</b> on every attempt so the customer is never charged twice.</li>
        <li><b>No retry</b> on 400/401/402/409: retrying a declined card is pointless and can look like fraud.</li>
        <li><b>Bad responses</b>: HTML instead of JSON, a missing field, a 200 with <code>"status": "failed"</code>.</li>
      </ul>
      <p>🔵 <b>Make sleeping and time injectable</b> so a test of "wait 100 ms, 200 ms, 400 ms" runs in microseconds and can assert the exact delays.</p>`,
    clues: [
      '"Tests call the real Stripe / OpenAI / S3" → wrap the service in your own client, override it with a fake; block real network',
      '"Test what happens when the provider times out" → <code>respx</code> route with <code>side_effect=httpx.ReadTimeout</code>, or <code>httpx_mock.add_exception(...)</code>',
      '"Customer was charged twice after a retry" → same Idempotency-Key on every attempt; assert it in the test',
      '"Retry test takes 7 seconds" → inject <code>sleep</code> (or a clock) and assert the delays instead of waiting',
      '"I patched it but the real function still ran" → patch where it is <b>looked up</b> (<code>app.billing.charge</code>), not where it is defined',
      '"The mock accepted a wrong argument name" → <code>create_autospec</code> / <code>MagicMock(spec=...)</code> so signatures are checked'
    ],
    code: [
      {
        lang: 'python', title: 'app/payments.py — a client with timeouts, retries and an idempotency key',
        code: `# app/payments.py
import asyncio
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import httpx

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class PaymentDeclined(Exception):
    pass


class PaymentUnavailable(Exception):
    pass


@dataclass(frozen=True)
class Charge:
    id: str
    status: str


class PaymentsClient:
    def __init__(
        self,
        http: httpx.AsyncClient,
        api_key: str,                                   # from settings, never hard-coded
        max_attempts: int = 4,
        base_delay: float = 0.1,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,   # injectable for tests
    ) -> None:
        self._http = http
        self._api_key = api_key
        self._max_attempts = max_attempts
        self._base_delay = base_delay
        self._sleep = sleep

    async def charge(self, amount_cents: int, currency: str, source: str,
                     idempotency_key: str | None = None) -> Charge:
        key = idempotency_key or str(uuid.uuid4())     # ONE key for all attempts
        for attempt in range(1, self._max_attempts + 1):
            try:
                r = await self._http.post(
                    "/v1/charges",
                    json={"amount": amount_cents, "currency": currency, "source": source},
                    headers={"Authorization": f"Bearer {self._api_key}", "Idempotency-Key": key},
                    timeout=httpx.Timeout(5.0, connect=2.0),
                )
            except (httpx.TimeoutException, httpx.ConnectError):
                retry_after = None
            else:
                if r.status_code in (200, 201):
                    body = r.json()
                    return Charge(id=body["id"], status=body["status"])
                if r.status_code == 402:
                    raise PaymentDeclined(r.json().get("error", {}).get("code", "declined"))
                if r.status_code not in RETRYABLE_STATUS:
                    r.raise_for_status()                # 400/401/409: a bug or config error, no retry
                retry_after = r.headers.get("Retry-After")
            if attempt == self._max_attempts:
                break
            delay = float(retry_after) if retry_after else self._base_delay * 2 ** (attempt - 1)
            await self._sleep(min(delay, 5.0))
        raise PaymentUnavailable(f"gave up after {self._max_attempts} attempts")`
      },
      {
        lang: 'python', title: 'Client tests with respx: timeouts, 503s, Retry-After, declines',
        code: `# tests/unit/test_payments_client.py  (asyncio_mode = "auto")
import httpx
import pytest
import respx

from app.payments import PaymentDeclined, PaymentsClient, PaymentUnavailable

BASE = "https://payments.example.test"


class RecordingSleep:
    def __init__(self) -> None:
        self.calls: list[float] = []

    async def __call__(self, seconds: float) -> None:
        self.calls.append(seconds)           # no real waiting


@pytest.fixture
def sleep() -> RecordingSleep:
    return RecordingSleep()


@pytest.fixture
async def client(sleep: RecordingSleep):
    async with httpx.AsyncClient(base_url=BASE) as http:
        yield PaymentsClient(http, api_key="test-key", sleep=sleep)


@pytest.mark.respx(base_url=BASE)            # configures the respx_mock fixture
async def test_retries_timeout_then_503_then_succeeds(respx_mock, client, sleep) -> None:
    route = respx_mock.post("/v1/charges").mock(side_effect=[
        httpx.ReadTimeout("provider hung"),
        httpx.Response(503),
        httpx.Response(201, json={"id": "ch_1", "status": "succeeded"}),
    ])
    charge = await client.charge(1999, "EUR", "tok_visa")
    assert charge.id == "ch_1"
    assert route.call_count == 3
    assert sleep.calls == [0.1, 0.2]                     # exponential backoff, no real sleep
    keys = {call.request.headers["Idempotency-Key"] for call in route.calls}
    assert len(keys) == 1                                # never double-charge


async def test_honours_retry_after(respx_mock, client, sleep) -> None:
    respx_mock.post(f"{BASE}/v1/charges").mock(side_effect=[
        httpx.Response(429, headers={"Retry-After": "2"}),
        httpx.Response(201, json={"id": "ch_2", "status": "succeeded"}),
    ])
    await client.charge(500, "EUR", "tok_visa")
    assert sleep.calls == [2.0]


async def test_decline_is_not_retried(respx_mock, client, sleep) -> None:
    route = respx_mock.post(f"{BASE}/v1/charges").respond(402, json={"error": {"code": "card_declined"}})
    with pytest.raises(PaymentDeclined, match="card_declined"):
        await client.charge(500, "EUR", "tok_chargeDeclined")
    assert route.call_count == 1 and sleep.calls == []


async def test_gives_up_after_max_attempts(respx_mock, client, sleep) -> None:
    respx_mock.post(f"{BASE}/v1/charges").mock(side_effect=httpx.ConnectTimeout("down"))
    with pytest.raises(PaymentUnavailable):
        await client.charge(500, "EUR", "tok_visa")
    assert sleep.calls == [0.1, 0.2, 0.4]                # 4 attempts, 3 waits`
      },
      {
        lang: 'python', title: 'The same with pytest-httpx (httpx_mock fixture)',
        code: `import httpx
import pytest
from pytest_httpx import HTTPXMock

from app.payments import PaymentsClient


async def test_timeout_then_success(httpx_mock: HTTPXMock) -> None:
    url = "https://payments.example.test/v1/charges"
    httpx_mock.add_exception(httpx.ReadTimeout("slow"), url=url, method="POST")
    httpx_mock.add_response(url=url, method="POST", status_code=201,
                            json={"id": "ch_9", "status": "succeeded"})

    async def no_sleep(_: float) -> None:
        return None

    async with httpx.AsyncClient(base_url="https://payments.example.test") as http:
        charge = await PaymentsClient(http, api_key="test-key", sleep=no_sleep).charge(100, "EUR", "tok")
    assert charge.id == "ch_9"
    # pytest-httpx fails the test if a registered response was never requested,
    # and fails on any request that matches no registered response.
    assert len(httpx_mock.get_requests()) == 2`
      },
      {
        lang: 'python', title: 'Endpoint tests use a fake, not HTTP mocks',
        code: `# tests/fakes.py
from app.payments import Charge, PaymentDeclined


class FakePayments:
    """Implements the same methods as PaymentsClient, in memory."""

    def __init__(self) -> None:
        self.charges: dict[str, Charge] = {}       # idempotency key -> charge

    async def charge(self, amount_cents: int, currency: str, source: str,
                     idempotency_key: str | None = None) -> Charge:
        if source.startswith("tok_chargeDeclined"):
            raise PaymentDeclined("card_declined")
        key = idempotency_key or f"auto-{len(self.charges)}"
        if key not in self.charges:                # same key -> same charge, like the real API
            self.charges[key] = Charge(id=f"ch_{len(self.charges) + 1}", status="succeeded")
        return self.charges[key]


# tests/api/test_checkout.py
def test_checkout_marks_order_paid(app, client, db_session) -> None:
    fake = FakePayments()
    app.dependency_overrides[get_payments] = lambda: fake
    order = OrderFactory(total_cents=1999)
    r = client.post(f"/orders/{order.id}/pay", json={"source": "tok_visa"},
                    headers={"Idempotency-Key": "order-42-pay"})
    assert r.status_code == 200 and r.json()["status"] == "paid"
    assert len(fake.charges) == 1


def test_declined_card_is_402_with_friendly_message(app, client) -> None:
    app.dependency_overrides[get_payments] = FakePayments
    order = OrderFactory()
    r = client.post(f"/orders/{order.id}/pay", json={"source": "tok_chargeDeclined"})
    assert r.status_code == 402
    assert r.json()["detail"] == "Your card was declined."`
      },
      {
        lang: 'python', run: true, title: 'Runnable: unittest.mock side_effect scripts a flaky provider',
        code: `import asyncio
import io
import unittest
from unittest.mock import AsyncMock, MagicMock, call


class Unavailable(Exception):
    pass


class Declined(Exception):
    pass


def charge_with_retry(send, sleep, amount, key, attempts=4, base=0.1):
    """send(amount, key) returns a status code or raises TimeoutError."""
    for i in range(1, attempts + 1):
        try:
            status = send(amount, key)
        except TimeoutError:
            status = None
        if status in (200, 201):
            return status
        if status == 402:
            raise Declined()
        if status not in (None, 429, 500, 502, 503, 504):
            raise RuntimeError(f"unexpected {status}")
        if i < attempts:
            sleep(base * 2 ** (i - 1))
    raise Unavailable()


async def notify(mailer, user):
    await mailer.send(to=user, subject="Paid")    # an async collaborator
    return "sent"


class RetryTests(unittest.TestCase):
    def test_timeout_then_503_then_ok(self):
        send = MagicMock(side_effect=[TimeoutError(), 503, 201])   # one item per call
        sleep = MagicMock()
        self.assertEqual(charge_with_retry(send, sleep, 1999, "key-1"), 201)
        self.assertEqual(send.call_args_list, [call(1999, "key-1")] * 3)   # same key each time
        self.assertEqual(sleep.call_args_list, [call(0.1), call(0.2)])

    def test_decline_not_retried(self):
        send, sleep = MagicMock(return_value=402), MagicMock()
        with self.assertRaises(Declined):
            charge_with_retry(send, sleep, 500, "k")
        send.assert_called_once()
        sleep.assert_not_called()

    def test_gives_up(self):
        send, sleep = MagicMock(side_effect=TimeoutError), MagicMock()
        with self.assertRaises(Unavailable):
            charge_with_retry(send, sleep, 500, "k")
        self.assertEqual(send.call_count, 4)

    def test_async_mock(self):
        mailer = MagicMock()
        mailer.send = AsyncMock(return_value=None)
        self.assertEqual(asyncio.run(notify(mailer, "ann@example.test")), "sent")
        mailer.send.assert_awaited_once_with(to="ann@example.test", subject="Paid")


out = io.StringIO()
res = unittest.TextTestRunner(stream=out, verbosity=2).run(
    unittest.defaultTestLoader.loadTestsFromTestCase(RetryTests))
for line in out.getvalue().splitlines():
    if " ... " in line:
        print(line.split(" (")[0], "->", line.rsplit(" ", 1)[-1])
print("all passed:", res.wasSuccessful())`
      }
    ],
    codeTitle: ['PaymentsClient with retries', 'respx tests', 'pytest-httpx tests', 'Fake for endpoint tests', 'Runnable: unittest.mock scripts'],
    viz: {
      title: 'Scripted provider: attempts, backoff and the idempotency key',
      input: 'timeout, 503, 429:2, 201',
      inputLabel: 'Scripted responses per attempt: timeout, connect_error, a status code, or 429:SECONDS (max 6)',
      gen: function (input) {
        var script = String(input || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean).slice(0, 6);
        if (!script.length) throw new Error('Type responses like: timeout, 503, 201');
        var max = 4, sleeps = [], frames = [], key = 'idem-7f3a';
        var retry = { 429: 1, 500: 1, 502: 1, 503: 1, 504: 1 };
        function fr(narr, i, verdict, extra) {
          var hl = {}; if (i >= 0) hl[i] = verdict;
          var vals = { 'Idempotency-Key': key, attempt: i >= 0 ? (i + 1) + ' of ' + max : '-', 'total waited (ms)': sleeps.reduce(function (a, b) { return a + b; }, 0) };
          if (extra) Object.keys(extra).forEach(function (k) { vals[k] = extra[k]; });
          frames.push({ narr: narr, parts: [
            { type: 'queue', label: 'Scripted responses (respx side_effect list)', items: script.slice(), hl: hl, frontLabel: 'call 1', backLabel: 'last' },
            { type: 'bars', label: 'Sleeps requested (ms) — recorded, not slept', values: sleeps.length ? sleeps.slice() : [0], texts: sleeps.length ? sleeps.map(function (s) { return s + ' ms'; }) : ['none'] },
            { type: 'vars', label: 'Client state', vals: vals, hl: extra && extra.result ? { result: /raised|gave/.test(extra.result) ? 'bad' : 'ok' } : {} }
          ] });
        }
        fr('The test scripts the provider with a list: each HTTP call takes the next item. The client creates <b>one</b> Idempotency-Key before the first attempt.', -1, 'cur');
        fr('The policy under test: retry timeouts, connection errors, 429 and 5xx with exponential backoff (100, 200, 400 ms) or the provider\'s <code>Retry-After</code>; never retry other 4xx; at most ' + max + ' attempts.', -1, 'cur');
        for (var i = 0; i < max; i++) {
          var r = script[i] || 'timeout', code = parseInt(r, 10), ra = null;
          if (r.indexOf('429:') === 0) { code = 429; ra = parseFloat(r.split(':')[1]); }
          var isErr = r === 'timeout' || r === 'connect_error';
          if (!isErr && isNaN(code)) throw new Error('Unknown response "' + r + '"');
          if (!isErr && (code === 200 || code === 201)) { fr('Attempt ' + (i + 1) + ': <b>' + code + '</b>. Success: return the charge. The test asserts the call count, the recorded sleeps and that every request carried the same key.', i, 'ok', { result: 'Charge returned' }); fr('Because the key never changed, even if attempt 1 secretly reached the provider before timing out, the provider de-duplicates and the customer is charged <b>once</b>.', i, 'ok', { result: 'Charge returned', 'requests with this key': i + 1 }); return frames; }
          if (!isErr && !retry[code]) { fr('Attempt ' + (i + 1) + ': <b>' + code + '</b> is not retryable' + (code === 402 ? ' (card declined: retrying is pointless and looks like fraud)' : ' (a client error: fix the request, do not repeat it)') + '. The client raises immediately.', i, 'bad', { result: code === 402 ? 'raised PaymentDeclined' : 'raised HTTPStatusError' }); fr('The test asserts exactly one call and no sleeps.', i, 'bad', { result: code === 402 ? 'raised PaymentDeclined' : 'raised HTTPStatusError', calls: 1 }); return frames; }
          if (i === max - 1) { fr('Attempt ' + max + ': <b>' + r + '</b> again and no attempts left. The client raises <code>PaymentUnavailable</code>; the endpoint maps it to 503 and the order stays unpaid.', i, 'bad', { result: 'gave up: PaymentUnavailable' }); return frames; }
          var d = ra !== null && !isNaN(ra) ? Math.min(ra * 1000, 5000) : 100 * Math.pow(2, i);
          sleeps.push(d);
          fr('Attempt ' + (i + 1) + ': <b>' + (isErr ? r.replace('_', ' ') : code) + '</b>: a temporary failure. ' + (ra !== null ? 'The provider sent <code>Retry-After: ' + ra + '</code>, so wait that long.' : 'Back off exponentially: ' + d + ' ms (100 × 2<sup>' + i + '</sup>).') + ' The injected <code>sleep</code> just records the number.', i, 'cur', { 'next wait (ms)': d });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Patch where it is looked up (the classic mock bug, API edition)',
        html: `<p><code>app/billing.py</code> does <code>from app.payments import send_receipt</code>. A test patches <code>app.payments.send_receipt</code>, yet real emails go out: <code>billing</code> holds its own reference. Patch <code>app.billing.send_receipt</code>, or better, inject the sender via <code>Depends</code> and avoid patching altogether.</p>
          ${H.table(['Import style in app/billing.py', 'Correct patch target'], [['<code>from app.payments import send_receipt</code>', '<code>"app.billing.send_receipt"</code>'], ['<code>import app.payments</code> then <code>app.payments.send_receipt()</code>', '<code>"app.payments.send_receipt"</code>'], ['received through <code>Depends(get_sender)</code>', H.c('g', 'no patch: <code>dependency_overrides[get_sender]</code>')]])}`,
        code: { lang: 'python', code: `from unittest.mock import create_autospec, patch

from app import payments


def test_receipt_sent_once(client):
    fake_send = create_autospec(payments.send_receipt)        # same signature as the real one
    with patch("app.billing.send_receipt", fake_send):          # where billing looks it up
        client.post("/orders/1/pay", json={"source": "tok_visa"})
    fake_send.assert_called_once()
    assert fake_send.call_args.kwargs["to"].endswith("@example.test")` }
      },
      {
        title: 'Block the real network for the whole suite',
        html: `<p>A test that accidentally hits a real API is slow, flaky and may send real emails or charges. Make it impossible: <b>pytest-socket</b> (<code>--disable-socket --allow-unix-socket</code>) fails any test that opens an internet socket, and respx's default <code>assert_all_mocked=True</code> rejects any request without a route. Integration tests that need the network opt in with a marker.</p>`,
        code: { lang: 'text', code: `[tool.pytest.ini_options]
addopts = ["--disable-socket", "--allow-unix-socket", "--allow-hosts=127.0.0.1,localhost"]
markers = ["external: talks to a real third-party sandbox (nightly only)"]` }
      },
      {
        title: 'Recorded responses (VCR cassettes) for realism',
        html: `<p>Hand-written mock responses drift from reality. <b>pytest-recording</b> (VCR.py) records real responses once into a YAML "cassette" and replays them offline afterwards. Filter secrets out of the recording: the cassette is committed to git.</p>
          ${H.table(['Mode', 'Behaviour'], [['<code>--record-mode=once</code>', 'record if the cassette is missing, else replay'], ['<code>--record-mode=none</code> (CI)', 'replay only; any new request fails'], ['<code>vcr_config</code> fixture', '<code>{"filter_headers": ["authorization"]}</code> keeps API keys out of git']])}`,
        code: { lang: 'python', code: `import pytest


@pytest.fixture(scope="module")
def vcr_config() -> dict:
    return {"filter_headers": ["authorization", "x-api-key"], "record_mode": "none"}


@pytest.mark.vcr
async def test_exchange_rates_parsing(rates_client) -> None:
    rates = await rates_client.latest("EUR")
    assert rates["USD"] > 0` }
      }
    ],
    deepDive: `<p>🟣 <b>How respx intercepts.</b> respx patches httpx's transport layer (<code>HTTPTransport</code>/<code>AsyncHTTPTransport</code> handle_request). Routes match on method, URL parts, headers, params or JSON; the first matching route returns its response or runs its <code>side_effect</code> (a function, an exception class or instance, or an iterable consumed one item per call). Every call is recorded on <code>route.calls</code> with the real <code>httpx.Request</code>, so you can assert headers and bodies. pytest-httpx instead installs itself as a transport for every httpx client in the test and, by default, fails the test if a registered response is never used or an unexpected request is made: strict by default, which is good.</p>
      <p><b>Mock pitfalls.</b> A plain <code>MagicMock</code> accepts any attribute and any arguments, so a renamed method or a typo still "passes". Use <code>spec=</code>/<code>create_autospec</code> so calls are checked against the real signature, and <code>AsyncMock</code> (automatically chosen by autospec for <code>async def</code>) so un-awaited coroutines are caught: <code>assert_awaited_once_with</code> fails if the code forgot <code>await</code>.</p>
      <p><b>Retry design you can test.</b> Separate the <b>policy</b> (which errors retry, delays, maximum attempts, total deadline) from the <b>mechanism</b> (sleep, clock). Libraries like <b>tenacity</b> or <b>stamina</b> provide this; stamina even has a test helper (<code>stamina.set_testing(True)</code>) that disables waiting. Add <b>jitter</b> in production (random spread of delays) but make the random source injectable so tests stay deterministic.</p>
      <p><b>Timeout semantics in httpx.</b> <code>httpx.Timeout(5.0, connect=2.0)</code> sets connect, read, write and pool timeouts; the exceptions are <code>ConnectTimeout</code>, <code>ReadTimeout</code>, <code>WriteTimeout</code>, <code>PoolTimeout</code>, all subclasses of <code>TimeoutException</code>. A read timeout after the request was sent is the dangerous case: the provider may have processed it, which is exactly why the idempotency key must stay the same.</p>
      <p><b>Production reality.</b> Fakes drift from the real service. Keep them honest with a small contract test suite that runs the <b>same tests</b> against the fake and against the provider's sandbox nightly (topic 6).</p>`,
    aiEra: `<p>🤖 Asked to "write tests for this payment code", assistants tend to <code>patch</code> everything, including your own functions, and then assert that the mocks were called: tests that mirror the implementation and pass even when the logic is wrong. Steer them: "use respx at the HTTP layer, script timeout then 503 then 201, assert the result, the call count, the recorded delays and that the idempotency key is identical".</p>
      <p>LLM APIs are external services too. Wrap the model client, fake it in endpoint tests (canned completions, scripted rate-limit errors), and test retries on 429/529 overload responses exactly like a payment provider. Record a few real responses as cassettes to keep the fake honest, and scrub API keys from them.</p>
      <p>Agents running your suite must never be able to reach production services: <code>--disable-socket</code> plus fake credentials in test settings is a cheap safety net when an agent is iterating on its own.</p>`,
    problems: [
      {
        title: 'Charge With Retries: Timeouts, Backoff, Retry-After and No Double Charge',
        level: 'Medium',
        tags: ['mocking', 'retries', 'timeouts', 'idempotency'],
        companies: ['Stripe', 'Adyen', 'Uber'],
        statement: `<p>Implement the retry policy of a payment client so it can be tested with a scripted fake provider. <code>charge_with_retry(outcomes, max_attempts)</code> receives what the provider does on each successive call and returns the event log.</p>
          <ul>
            <li>Outcomes: <code>"timeout"</code>, <code>"connect_error"</code>, a status like <code>"201"</code>, or <code>"429:S"</code> (429 with <code>Retry-After: S</code> seconds). Missing outcomes (script ran out) count as <code>"timeout"</code>.</li>
            <li>Each call logs <code>"attempt k key=idem-1"</code> (the key never changes).</li>
            <li>200/201 → log <code>"ok STATUS"</code> and stop. Retryable: timeout, connect_error, 429, 500, 502, 503, 504. Any other status → log <code>"fail STATUS"</code> and stop (no retry).</li>
            <li>Before the next attempt, log <code>"sleep MS"</code>: Retry-After × 1000 if given, else <code>100 × 2<sup>k−1</sup></code> after attempt k; every sleep is capped at 5000.</li>
            <li>If attempt <code>max_attempts</code> fails retryably, log <code>"give up"</code> (no sleep after the last attempt).</li>
          </ul>`,
        constraints: `<p>1 ≤ max_attempts ≤ 10, 0 ≤ len(outcomes) ≤ 20, Retry-After 0–60 seconds.</p>`,
        example: `<p><code>["timeout", "503", "201"]</code>, 4 → ${H.c('g', '["attempt 1 key=idem-1", "sleep 100", "attempt 2 key=idem-1", "sleep 200", "attempt 3 key=idem-1", "ok 201"]')}</p>
          <p>Why: the timeout and the 503 are temporary, so the client waits 100 then 200 ms; the same key is sent each time so the provider never charges twice.</p>`,
        brute: {
          why: `<p>The naive client retries <b>everything</b> immediately with a fresh key each time: a declined card is retried (fraud flags), a hung provider is hammered with no backoff, and a request that succeeded but timed out on the way back is charged again under a new key.</p>`,
          code: `def charge_naive(outcomes, max_attempts):
    log = []
    for k in range(1, max_attempts + 1):
        out = outcomes[k - 1] if k - 1 < len(outcomes) else "timeout"
        log.append(f"attempt {k} key=idem-{k}")      # new key every time: double charges
        if out in ("200", "201"):
            log.append("ok " + out)
            return log
    log.append("give up")
    return log`
        },
        mcq: {
          q: 'The first attempt times out on <b>read</b>. Why must the retry reuse the same Idempotency-Key?',
          options: ['Keys are expensive', 'The provider may already have processed the charge; the same key lets it return that result instead of charging again', 'httpx requires it', 'It makes the retry faster'],
          answer: 1,
          explain: 'A read timeout means the request was sent but the answer was lost. Only the key lets the provider recognise the retry as the same operation.'
        },
        hints: [
          'Hint 1: read outcome <code>k-1</code> for attempt k, defaulting to <code>"timeout"</code>; parse <code>"429:S"</code> into status 429 plus a Retry-After value.',
          'Hint 2: decide in this order: success → stop; non-retryable status → fail and stop; last attempt → give up; else compute the delay and log the sleep.',
          'Hint 3: delay = <code>min(retry_after * 1000 if retry_after is not None else 100 * 2 ** (k - 1), 5000)</code>. Log integers.'
        ],
        solution: {
          approach: `<p>Model the policy as a loop over attempts with a scripted outcome per attempt, which is exactly what a respx <code>side_effect</code> list gives a real test. The key is created once outside the loop. Classify each outcome as success, permanent failure or temporary failure; only temporary failures lead to a sleep, and only if attempts remain. Retry-After overrides the exponential delay, and a cap protects against a provider asking for an absurd wait. Because sleeping is just a logged number, the test is instant and checks the exact schedule.</p>`,
          code: `RETRYABLE = {429, 500, 502, 503, 504}


def charge_with_retry(outcomes, max_attempts):
    key = "idem-1"                    # created once, reused on every attempt
    log = []
    for k in range(1, max_attempts + 1):
        out = outcomes[k - 1] if k - 1 < len(outcomes) else "timeout"
        log.append(f"attempt {k} key={key}")
        retry_after = None
        if out in ("timeout", "connect_error"):
            status = None             # network-level failure: always retryable
        elif out.startswith("429:"):
            status, retry_after = 429, int(out.split(":", 1)[1])
        else:
            status = int(out)
        if status in (200, 201):
            log.append(f"ok {status}")
            return log
        if status is not None and status not in RETRYABLE:
            log.append(f"fail {status}")      # 400/401/402/409...: retrying cannot help
            return log
        if k == max_attempts:
            log.append("give up")
            return log
        delay = retry_after * 1000 if retry_after is not None else 100 * 2 ** (k - 1)
        log.append(f"sleep {min(delay, 5000)}")
    return log`,
          complexity: `<p>O(max_attempts) time and output size.</p>`,
          followUps: ['Add full jitter (random 0..delay) without making tests flaky: what do you inject?', 'How would a total deadline (for example 8 seconds across all attempts) change the loop?']
        },
        tests: { fn: 'chargeWithRetry', sig: 'string[] int -> string[]', cases: [
          [[['timeout', '503', '201'], 4], ['attempt 1 key=idem-1', 'sleep 100', 'attempt 2 key=idem-1', 'sleep 200', 'attempt 3 key=idem-1', 'ok 201']],
          [[['402'], 4], ['attempt 1 key=idem-1', 'fail 402']],
          [[['200'], 1], ['attempt 1 key=idem-1', 'ok 200']],
          [[[], 3], ['attempt 1 key=idem-1', 'sleep 100', 'attempt 2 key=idem-1', 'sleep 200', 'attempt 3 key=idem-1', 'give up']],
          [[['429:2', '201'], 3], ['attempt 1 key=idem-1', 'sleep 2000', 'attempt 2 key=idem-1', 'ok 201']],
          [[['429:30', '500'], 2], ['attempt 1 key=idem-1', 'sleep 5000', 'attempt 2 key=idem-1', 'give up']],
          [[['connect_error', '502', '504', '503', '500', '201'], 6], ['attempt 1 key=idem-1', 'sleep 100', 'attempt 2 key=idem-1', 'sleep 200', 'attempt 3 key=idem-1', 'sleep 400', 'attempt 4 key=idem-1', 'sleep 800', 'attempt 5 key=idem-1', 'sleep 1600', 'attempt 6 key=idem-1', 'ok 201']],
          [[['timeout', '409'], 5], ['attempt 1 key=idem-1', 'sleep 100', 'attempt 2 key=idem-1', 'fail 409']],
          [[['429:0', '201'], 2], ['attempt 1 key=idem-1', 'sleep 0', 'attempt 2 key=idem-1', 'ok 201']]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Contract tests
     ===================================================================== */
  var NOTE_SCHEMA = {
    type: 'object', required: ['id', 'title', 'status', 'tags'], additionalProperties: false,
    properties: {
      id: { type: 'integer', minimum: 1 },
      title: { type: 'string', minLength: 1, maxLength: 120 },
      status: { type: 'string', 'enum': ['draft', 'published'] },
      tags: { type: 'array', items: { type: 'string', maxLength: 20 } },
      owner: { type: 'object', required: ['id'], properties: { id: { type: 'integer' }, email: { type: 'string' } } }
    }
  };

  topics.push({
    title: 'Contract Tests: OpenAPI as the Contract, Schemathesis, Response Schema Checks, Fakes That Stay Honest and Breaking-Change Detection',
    analogy: `<p>A <b>contract</b> is the plug-and-socket agreement between your API and its clients. The socket can be rebuilt inside the wall however you like, but the holes must stay the same shape, size and spacing, or every device in the house stops working.</p>
      <p>Contract tests are the <b>plug gauge</b> an electrician pushes into a socket: they do not care how the wiring behind it works, only that the shape still matches the published standard. Schemathesis is a robot that tries thousands of strange plugs (odd inputs) to see whether the socket ever sparks (a 500 or a response that breaks the published shape).</p>`,
    explain: `<p>🟢 <b>What is the contract?</b> For a FastAPI service it is the <b>OpenAPI document</b> that FastAPI generates from your routes and Pydantic models (<code>/openapi.json</code>, Python Backend I). Clients, SDK generators and other teams rely on it. A contract test checks a promise <b>across a boundary</b>, not the internal logic.</p>
      ${H.table(['Kind', 'Question it answers', 'Tool'], [
        ['Provider conformance', 'Does my API actually return what my OpenAPI says, for many inputs, and never 500?', '<b>Schemathesis</b> (property-based, from the schema)'],
        ['Response schema check', 'Does this response body match the documented model?', 'Pydantic <code>Model.model_validate</code>, <code>jsonschema</code>'],
        ['Breaking-change detection', 'Did this pull request remove a field or make one required?', 'commit <code>openapi.json</code>, diff it in CI (for example <b>oasdiff</b>)'],
        ['Consumer-driven contracts', 'Does my API still satisfy what each consumer actually uses?', '<b>Pact</b>: consumers publish expectations, the provider verifies them'],
        ['Fake ↔ real contract', 'Does my in-memory fake behave like the real repository / provider?', 'the <b>same test suite</b> parametrized over both implementations']
      ])}
      <p><b>Breaking vs safe changes</b> for a response:</p>
      ${H.table(['Change', 'Safe for existing clients?'], [
        ['Add a new optional field to a response', H.c('g', 'yes (clients must ignore unknown fields)')],
        ['Remove a field, or rename it', H.c('r', 'breaking')],
        ['Change a field\'s type (int → string)', H.c('r', 'breaking')],
        ['Make a response field nullable / optional that was required', H.c('r', 'breaking (clients assumed it is always there)')],
        ['Add a new required field to a <b>request</b>', H.c('r', 'breaking for every old client')],
        ['Add a new enum value to a response', H.c('y', 'risky: strict clients may crash on an unknown value')]
      ])}
      <p>🔵 <b>Schemathesis</b> reads your OpenAPI document, generates requests (valid and slightly invalid) with Hypothesis, calls the app in memory, and checks every response: no 5xx, status code documented, body matches the schema, content type correct. It finds the bugs that hand-written tests miss: a unicode title that crashes slug generation, a huge integer that overflows a database column, an undocumented 400.</p>`,
    clues: [
      '"Make sure we do not break the mobile app" → commit the OpenAPI document and fail CI on breaking diffs',
      '"Fuzz the API" / "find 500s automatically" → Schemathesis against <code>/openapi.json</code>',
      '"Our fake behaves differently from the real thing" → run one contract test suite against both implementations',
      '"Several services consume our API" / "consumer-driven" → Pact contracts verified in the provider\'s CI',
      '"The response has an extra internal field" → <code>additionalProperties: false</code> / response_model and a schema check',
      '"Is adding a field breaking?" → optional response field: no; removing, renaming, retyping, newly required request field: yes'
    ],
    code: [
      {
        lang: 'python', title: 'Schemathesis against the ASGI app (property-based contract test)',
        code: `# tests/contract/test_openapi.py
import schemathesis

from app.main import create_app

app = create_app()
# Loads the schema from the app in memory; requests are sent through ASGI, no server needed.
schema = schemathesis.openapi.from_asgi("/openapi.json", app)


@schema.parametrize()
def test_api_conforms_to_its_schema(case) -> None:
    # Sends the generated request and runs the checks:
    # no 5xx, documented status code, response body and headers match the schema.
    case.call_and_validate(headers={"Authorization": "Bearer test-token"})`
      },
      {
        lang: 'bash', title: 'Schemathesis from the command line (CI against a running container)',
        code: `# Start the app (in CI: a service container), then fuzz it from its own schema.
uvicorn app.main:app --port 8000 &
sleep 2
schemathesis run http://127.0.0.1:8000/openapi.json \\
  --checks all \\
  --header "Authorization: Bearer $TEST_API_TOKEN"   # a test-only token from CI secrets`
      },
      {
        lang: 'python', title: 'One contract suite, two implementations (keeps the fake honest)',
        code: `# tests/contract/test_note_repo_contract.py
import pytest

from app.repo import DuplicateTitle, NoteRepo, SqlNoteRepo
from tests.fakes import InMemoryNoteRepo


@pytest.fixture(params=["fake", pytest.param("sql", marks=pytest.mark.integration)])
def repo(request: pytest.FixtureRequest) -> NoteRepo:
    if request.param == "fake":
        return InMemoryNoteRepo()
    db_session = request.getfixturevalue("db_session")   # only needed for the SQL variant
    return SqlNoteRepo(db_session)


def test_add_then_get(repo: NoteRepo) -> None:
    note = repo.add(owner_id=1, title="A", body="x")
    assert repo.get(note.id) == note


def test_duplicate_title_same_owner_raises(repo: NoteRepo) -> None:
    repo.add(owner_id=1, title="A", body="")
    with pytest.raises(DuplicateTitle):
        repo.add(owner_id=1, title="a", body="")      # case-insensitive in both!


def test_same_title_other_owner_is_fine(repo: NoteRepo) -> None:
    repo.add(owner_id=1, title="A", body="")
    repo.add(owner_id=2, title="A", body="")


def test_get_missing_returns_none(repo: NoteRepo) -> None:
    assert repo.get(999_999) is None`
      },
      {
        lang: 'python', title: 'Snapshot the OpenAPI document and fail on unreviewed changes',
        code: `# tests/contract/test_openapi_snapshot.py
import json
import os
from pathlib import Path

from app.main import create_app

SNAPSHOT = Path(__file__).parent / "openapi.snapshot.json"


def test_openapi_matches_snapshot() -> None:
    current = create_app().openapi()
    if os.environ.get("UPDATE_SNAPSHOTS") == "1":        # deliberate, reviewed update
        SNAPSHOT.write_text(json.dumps(current, indent=2, sort_keys=True) + "\\n")
    expected = json.loads(SNAPSHOT.read_text())
    assert current == expected, (
        "The public API changed. Review the diff (oasdiff breaking old.json new.json), "
        "then run with UPDATE_SNAPSHOTS=1 and commit the new snapshot."
    )


def test_response_matches_documented_model(client) -> None:
    from app.notes import NoteOut

    r = client.post("/notes", json={"title": "Contract"})
    NoteOut.model_validate(r.json())                       # raises if the shape drifted
    assert set(r.json()) == set(NoteOut.model_fields)      # no extra, undocumented fields`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a mini JSON-Schema validator checking API responses',
        code: `# The core of every response-contract check: walk the document and the schema together.
import json

SCHEMA = {
    "type": "object",
    "required": ["id", "title", "status"],
    "additionalProperties": False,
    "properties": {
        "id": {"type": "integer", "minimum": 1},
        "title": {"type": "string", "minLength": 1, "maxLength": 120},
        "status": {"type": "string", "enum": ["draft", "published"]},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
}

TYPES = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
}


def check(schema, value, path="$"):
    errors = []
    t = schema.get("type")
    if t and not TYPES[t](value):
        return [f"{path}: expected {t}"]
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: not one of {schema['enum']}")
    if "minimum" in schema and value < schema["minimum"]:
        errors.append(f"{path}: below minimum {schema['minimum']}")
    if "minLength" in schema and len(value) < schema["minLength"]:
        errors.append(f"{path}: too short")
    if "maxLength" in schema and len(value) > schema["maxLength"]:
        errors.append(f"{path}: too long")
    if t == "object":
        for name in schema.get("required", []):
            if name not in value:
                errors.append(f"{path}.{name}: required")
        props = schema.get("properties", {})
        for name, sub in props.items():
            if name in value:
                errors += check(sub, value[name], f"{path}.{name}")
        if schema.get("additionalProperties") is False:
            errors += [f"{path}.{k}: not allowed" for k in value if k not in props]
    if t == "array" and "items" in schema:
        for i, item in enumerate(value):
            errors += check(schema["items"], item, f"{path}[{i}]")
    return errors


responses = {
    "good": '{"id": 7, "title": "Plan", "status": "draft", "tags": ["home"]}',
    "drifted": '{"id": "7", "title": "", "status": "archived", "tags": ["a", 3], "password_hash": "x"}',
    "missing": '{"title": "Plan"}',
}
for name, raw in responses.items():
    errs = check(SCHEMA, json.loads(raw))
    print(f"{name:8} -> {'OK' if not errs else 'CONTRACT BROKEN'}")
    for e in errs:
        print("          ", e)`
      }
    ],
    codeTitle: ['Schemathesis (pytest)', 'Schemathesis (CLI)', 'Fake vs real contract suite', 'OpenAPI snapshot + model check', 'Runnable: mini schema validator'],
    viz: {
      title: 'Walking a response against its schema',
      input: '{"id": 0, "title": "Plan", "status": "archived", "tags": ["home", 7], "owner": {"email": "a@b.test"}, "secret": 1}',
      inputLabel: 'A JSON response body for GET /notes/{id} (schema: id ≥ 1, title 1–120, status draft|published, tags string[], owner {id}, no extra keys)',
      gen: function (input) {
        var doc;
        try { doc = JSON.parse(String(input || '')); } catch (e) { throw new Error('Enter valid JSON, for example {"id": 1, "title": "t", "status": "draft", "tags": []}'); }
        var frames = [], errors = [], visited = 0;
        function tname(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Math.floor(v) === v ? 'integer' : 'number') : typeof v; }
        function ok(t, v) { var n = tname(v); return t === n || (t === 'number' && n === 'integer'); }
        function snap(narr, path, cls) {
          var stack = path.split(/(?=\.|\[)/);
          var hl = {}; hl[stack.length - 1] = cls;
          frames.push({ narr: narr, parts: [
            { type: 'stack', label: 'Current path (bottom = root)', items: stack, hl: hl },
            { type: 'table', label: 'Contract violations so far', columns: ['path', 'problem'], rows: errors.length ? errors.map(function (e) { return e.slice(); }) : [['—', 'none yet']], hl: {} }
          ] });
        }
        function walk(s, v, path) {
          if (++visited > 30) return;
          if (s.type && !ok(s.type, v)) { errors.push([path, 'expected ' + s.type + ', got ' + tname(v)]); snap('<code>' + hesc(path) + '</code> should be <b>' + s.type + '</b> but is <b>' + tname(v) + '</b>. A client SDK generated from the schema would crash parsing this.', path, 'bad'); return; }
          var before = errors.length;
          if (s['enum'] && s['enum'].indexOf(v) < 0) errors.push([path, 'not one of ' + s['enum'].join('|')]);
          if (s.minimum !== undefined && v < s.minimum) errors.push([path, 'below minimum ' + s.minimum]);
          if (s.minLength !== undefined && v.length < s.minLength) errors.push([path, 'too short']);
          if (s.maxLength !== undefined && v.length > s.maxLength) errors.push([path, 'too long']);
          if (s.type !== 'object' && s.type !== 'array') snap('<code>' + hesc(path) + '</code> = <code>' + hesc(JSON.stringify(v)) + '</code>: ' + (errors.length > before ? '<b>violates</b> ' + hesc(errors[errors.length - 1][1]) + '.' : 'type and rules OK.'), path, errors.length > before ? 'bad' : 'ok');
          if (s.type === 'object') {
            snap('<code>' + hesc(path) + '</code> is an object. Check required keys first, then each known property, then reject extra keys if <code>additionalProperties</code> is false.', path, 'cur');
            (s.required || []).forEach(function (k) { if (!(k in v)) { errors.push([path + '.' + k, 'required']); snap('Required key <code>' + hesc(k) + '</code> is missing at <code>' + hesc(path) + '</code>: a <b>breaking</b> change for clients that read it.', path + '.' + k, 'bad'); } });
            Object.keys(s.properties || {}).forEach(function (k) { if (k in v) walk(s.properties[k], v[k], path + '.' + k); });
            if (s.additionalProperties === false) Object.keys(v).forEach(function (k) { if (!(k in s.properties)) { errors.push([path + '.' + k, 'not allowed']); snap('Extra key <code>' + hesc(k) + '</code> is not in the schema. Often an internal field leaking (a hash, a flag): the response model is not filtering.', path + '.' + k, 'bad'); } });
          }
          if (s.type === 'array') {
            snap('<code>' + hesc(path) + '</code> is an array of ' + v.length + ' item(s). Each item is checked against <code>items</code>.', path, 'cur');
            v.slice(0, 8).forEach(function (it, i) { walk(s.items, it, path + '[' + i + ']'); });
          }
        }
        snap('The documented contract of <code>GET /notes/{id}</code>: an object with required id (integer ≥ 1), title (1–120 chars), status (draft or published) and tags (strings); optional owner; no other keys.', '$', 'cur');
        snap('Start at the root <code>$</code> with the documented schema of <code>NoteOut</code>. This is what Schemathesis\' <code>response_schema_conformance</code> check does for every response.', '$', 'cur');
        walk(NOTE_SCHEMA, doc, '$');
        snap(errors.length ? '<b>' + errors.length + ' violation(s)</b>. In CI this fails the contract test, before a mobile app or partner integration finds it in production.' : 'The response matches its contract. Schemathesis would now try the next generated request.', '$', errors.length ? 'bad' : 'ok');
        return frames;
      }
    },
    examples: [
      {
        title: 'A 500 that only Schemathesis found',
        html: `<p>The notes API slugifies titles. Hand-written tests used "Hello World". Schemathesis generated the title <code>"\\u0000"</code> (a NUL character): PostgreSQL rejects NUL bytes in text and the endpoint crashed with a 500. The fix is in the contract: reject control characters with a Pydantic pattern, which documents the rule in OpenAPI and turns the crash into a 422.</p>
          ${H.table(['Input', 'Before', 'After'], [['<code>"Hello"</code>', '201', '201'], ['<code>"\\u0000"</code>', H.c('r', '500 (database error)'), H.c('g', '422 (documented)')], ['<code>"x" * 10000</code>', H.c('r', '500 (column too long)'), H.c('g', '422 (max_length=120)')]])}`,
        code: { lang: 'python', code: `from pydantic import BaseModel, Field


class NoteIn(BaseModel):
    # no control characters, 1..120 chars: the rule now lives in the OpenAPI schema too
    title: str = Field(min_length=1, max_length=120, pattern=r"^[^\\x00-\\x1f]+$")
    body: str = Field(default="", max_length=10_000)` }
      },
      {
        title: 'Catching a breaking change in review',
        html: `<p>A developer renames <code>owner_id</code> to <code>user_id</code> in <code>NoteOut</code> "for consistency". All unit tests are updated and pass. The OpenAPI snapshot test fails and the CI step <code>oasdiff breaking main.json pr.json</code> reports:</p>
          ${H.table(['Severity', 'Change'], [[H.c('r', 'error'), 'response property <code>owner_id</code> removed from <code>GET /notes/{note_id}</code> 200'], [H.c('g', 'info'), 'response property <code>user_id</code> added']])}
          <p>The safe version: add <code>user_id</code>, keep <code>owner_id</code> marked <code>deprecated</code> for a release cycle, and remove it later with a version bump.</p>`
      },
      {
        title: 'Consumer-driven contracts with Pact, in one paragraph',
        html: `<p>When several internal services call your API, each consumer writes a test against a Pact mock server describing <b>exactly</b> the requests it sends and the fields it reads. Those expectations are published (to a Pact Broker). Your provider CI downloads them and replays each against the real app (with provider states like "note 7 exists" set up by a fixture). You learn precisely which consumer breaks if you remove a field, and you can remove fields nobody reads with confidence. It costs more setup than an OpenAPI diff, so it pays off for many teams and many internal consumers.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How Schemathesis works.</b> It parses the OpenAPI document, resolves <code>$ref</code>s, and converts each operation's parameters and request body schema into Hypothesis strategies (it builds on <code>hypothesis-jsonschema</code> ideas). Each generated <code>case</code> holds path, query, headers and body. <code>call_and_validate()</code> sends it (in-process for ASGI/WSGI apps) and runs checks such as <code>not_a_server_error</code>, <code>status_code_conformance</code>, <code>content_type_conformance</code>, <code>response_schema_conformance</code> and <code>response_headers_conformance</code>, plus negative-testing checks that invalid input is rejected. Failures are shrunk like any Hypothesis failure and printed as a reproducible <code>curl</code> command. <b>Stateful</b> testing chains operations through OpenAPI <b>links</b> (POST returns an id that a GET consumes), finding bugs that need a sequence of calls.</p>
      <p><b>Auth and data.</b> Contract tests need valid credentials (a test token from a fixture, never a production key) and data for path parameters. Generated ids are mostly random, so most GETs return 404; that is fine for crash detection, and links or hooks add real ids when you need deeper coverage.</p>
      <p><b>FastAPI-specific traps.</b> Endpoints that return a <code>dict</code> without <code>response_model</code> produce an empty response schema, so conformance checks pass vacuously: declare response models. Errors raised as <code>HTTPException(404)</code> but not documented in <code>responses={404: ...}</code> make <code>status_code_conformance</code> fail; document them (Python Backend I). Pydantic's generated schema for <code>datetime</code>, <code>Decimal</code> and unions can differ between Pydantic versions, which is one more reason to snapshot <code>openapi.json</code>.</p>
      <p><b>Fake/real parity</b> is the contract test teams forget. Every rule the fake implements (case-insensitive uniqueness, ordering of list results, what <code>get</code> returns when missing) must be pinned by a test that also runs against the real implementation, or the fake slowly lies and fast tests give false confidence.</p>
      <p><b>Production reality.</b> Run Schemathesis on every pull request with a small example budget and nightly with a large one. Treat its failures as real bugs: in practice most are missing validation that would otherwise be found by an attacker or a confused client.</p>`,
    aiEra: `<p>🤖 Generated SDKs and AI agents both consume your OpenAPI document directly: an agent with a tool definition generated from your schema will send exactly what the schema allows. An inaccurate schema means agents send requests your API rejects or crashes on. Contract tests are how you keep that machine-readable promise true.</p>
      <p>Assistants are useful for reviewing an OpenAPI diff: paste the old and new documents and ask "list every breaking change for existing clients and suggest a backward-compatible alternative". Verify with a deterministic tool like oasdiff; do not rely on the model alone for a release gate.</p>
      <p>When an assistant writes tests for a response, it usually checks two or three fields. Ask instead for "validate the whole body against the response model and assert there are no extra keys": one line that catches every leak.</p>`,
    problems: [
      {
        title: 'Validate a Response Against a JSON Schema Subset',
        level: 'Hard',
        tags: ['contract tests', 'JSON Schema', 'recursion'],
        companies: ['Postman', 'Twilio', 'Plaid'],
        statement: `<p>Your contract tests need a small, dependency-free response checker. Write <code>validate(schema_json, doc_json)</code> returning a list of error strings <code>"PATH: MESSAGE"</code>. Paths start at <code>$</code>; object keys append <code>.key</code>, array items append <code>[i]</code>. Supported keywords and messages:</p>
          <ul>
            <li><code>type</code> (object, array, string, integer, number, boolean, null) → <code>"expected TYPE"</code>; on a type error check nothing else at that node. Booleans are not numbers; integers are numbers.</li>
            <li><code>enum</code> → <code>"not in enum"</code>; <code>minimum</code>/<code>maximum</code> → <code>"below minimum"</code>/<code>"above maximum"</code>; <code>minLength</code>/<code>maxLength</code> → <code>"too short"</code>/<code>"too long"</code>, checked in this order.</li>
            <li>Objects: first each <code>required</code> key in listed order (<code>"$.key: required"</code>), then each key of <code>properties</code> in schema order that is present (recursively), then, if <code>additionalProperties</code> is <code>false</code>, each unknown key in document order (<code>"$.key: not allowed"</code>).</li>
            <li>Arrays: each item against <code>items</code>.</li>
          </ul>`,
        constraints: `<p>Both inputs are valid JSON. Nesting depth ≤ 20, document size ≤ 10<sup>4</sup> values. Keywords outside the list are ignored.</p>`,
        example: `<p>schema <code>{"type":"object","required":["id"],"properties":{"id":{"type":"integer","minimum":1}},"additionalProperties":false}</code>, doc <code>{"id":0,"x":1}</code> → ${H.c('r', '["$.id: below minimum", "$.x: not allowed"]')}</p>
          <p>Why: <code>id</code> is present and an integer but breaks <code>minimum</code>; <code>x</code> is not a documented property.</p>`,
        brute: {
          why: `<p>The common shortcut in tests is <code>assert "id" in body and "title" in body</code>. It checks two keys at the top level, ignores types, nested objects, array items and extra leaked fields, so most contract drift passes silently.</p>`,
          code: `import json


def validate_naive(schema_json, doc_json):
    schema, doc = json.loads(schema_json), json.loads(doc_json)
    return [f"$.{k}: required" for k in schema.get("required", []) if k not in doc]`
        },
        mcq: {
          q: 'Why should a response validator treat <code>true</code> as <b>not</b> an integer, although <code>isinstance(True, int)</code> is True in Python?',
          options: ['Performance', 'JSON Schema types follow JSON: booleans and numbers are different types, and clients in other languages will see a boolean', 'Python bug', 'It does not matter'],
          answer: 1,
          explain: 'In JSON (and in TypeScript, Kotlin, Swift clients) a boolean is never a number. Python\'s bool-is-int is an implementation detail you must exclude explicitly.'
        },
        hints: [
          'Hint 1: write one recursive function <code>walk(schema, value, path)</code> that appends to a shared error list.',
          'Hint 2: a type table of predicates handles the bool trap: integer = <code>isinstance(v, int) and not isinstance(v, bool)</code>; number also accepts float; null is <code>v is None</code>.',
          'Hint 3: after the type check passes, run enum, minimum, maximum, minLength, maxLength in that order, then object or array rules. Return early after a type error.'
        ],
        solution: {
          approach: `<p>Parse both JSON strings and walk the document and the schema together. Each node first checks <code>type</code> with a predicate table (excluding booleans from numeric types); a mismatch records one error and stops at that node, because further rules would only produce noise. Scalar keywords run in a fixed order. For objects, required keys, then known properties (recursing with the extended path), then unknown keys if additional properties are forbidden. Arrays recurse into every item with an index path. Python's dicts keep insertion order, so "schema order" and "document order" fall out naturally from <code>json.loads</code>.</p>`,
          code: `import json

TYPES = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "null": lambda v: v is None,
}


def validate(schema_json, doc_json):
    schema, doc = json.loads(schema_json), json.loads(doc_json)
    errors = []

    def walk(s, v, path):
        t = s.get("type")
        if t is not None and not TYPES[t](v):
            errors.append(f"{path}: expected {t}")
            return
        if "enum" in s and v not in s["enum"]:
            errors.append(f"{path}: not in enum")
        if "minimum" in s and v < s["minimum"]:
            errors.append(f"{path}: below minimum")
        if "maximum" in s and v > s["maximum"]:
            errors.append(f"{path}: above maximum")
        if "minLength" in s and len(v) < s["minLength"]:
            errors.append(f"{path}: too short")
        if "maxLength" in s and len(v) > s["maxLength"]:
            errors.append(f"{path}: too long")
        if isinstance(v, dict) and t == "object":
            for key in s.get("required", []):
                if key not in v:
                    errors.append(f"{path}.{key}: required")
            props = s.get("properties", {})
            for key, sub in props.items():
                if key in v:
                    walk(sub, v[key], f"{path}.{key}")
            if s.get("additionalProperties") is False:
                for key in v:
                    if key not in props:
                        errors.append(f"{path}.{key}: not allowed")
        if isinstance(v, list) and t == "array" and "items" in s:
            for i, item in enumerate(v):
                walk(s["items"], item, f"{path}[{i}]")

    walk(schema, doc, "$")
    return errors`,
          complexity: `<p>O(size of the document + size of the schema): each value is visited once with constant work per keyword. Recursion depth equals nesting depth.</p>`,
          followUps: ['How would you add <code>$ref</code> with a definitions table, and guard against reference cycles?', 'How would <code>oneOf</code> change the error reporting (which branch\'s errors do you show)?']
        },
        tests: { fn: 'validate', sig: 'string string -> string[]', cases: [
          [['{"type":"object","required":["id"],"properties":{"id":{"type":"integer","minimum":1}},"additionalProperties":false}', '{"id":0,"x":1}'], ['$.id: below minimum', '$.x: not allowed']],
          [['{"type":"object","required":["id","title"],"properties":{"id":{"type":"integer"},"title":{"type":"string","minLength":1}}}', '{"id":3,"title":"ok"}'], []],
          [['{"type":"object","required":["id","title"],"properties":{"id":{"type":"integer"}}}', '{"id":true}'], ['$.title: required', '$.id: expected integer']],
          [['{"type":"array","items":{"type":"string","maxLength":3}}', '["ab","abcd",5]'], ['$[1]: too long', '$[2]: expected string']],
          [['{"type":"string","enum":["draft","published"],"minLength":6}', '"gone"'], ['$: not in enum', '$: too short']],
          [['{"type":"object","properties":{"owner":{"type":"object","required":["id"],"properties":{"id":{"type":"integer"}}}}}', '{"owner":{"email":"a@b.test"}}'], ['$.owner.id: required']],
          [['{"type":"number","minimum":0,"maximum":1}', '1.5'], ['$: above maximum']],
          [['{"type":"object","properties":{"n":{"type":"null"},"tags":{"type":"array","items":{"type":"integer"}}},"additionalProperties":false}', '{"tags":[1,2.5,null],"n":null,"zz":0}'], ['$.tags[1]: expected integer', '$.tags[2]: expected integer', '$.zz: not allowed']],
          [['{"type":"object"}', '[]'], ['$: expected object']]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Coverage, flaky tests and the test pyramid
     ===================================================================== */
  var SHIP_CODE = 'def shipping_cost(weight, country):\n    if weight <= 0:\n        raise ValueError("weight must be positive")\n    cost = 5\n    if weight > 10:\n        cost += (weight - 10) * 2\n    if country != "DE":\n        cost += 15\n    if cost > 50:\n        cost = 50\n    return cost';

  topics.push({
    title: 'Coverage, Flaky Tests and the Test Pyramid: pytest-cov, Branch Coverage, Mutation Testing, Clocks, Seeds and Ordering',
    analogy: `<p><b>Coverage</b> is a <b>highlighter pen</b> run over a city map wherever your test car has driven. Unhighlighted streets were definitely never checked. But a highlighted street only means the car drove down it; it does not mean anyone looked at the potholes. That is why 100% coverage does not mean "no bugs".</p>
      <p>A <b>flaky test</b> is a smoke alarm that sometimes goes off when you make toast. After a week everybody ignores it, and then they also ignore it during a real fire. Flaky tests are worse than missing tests because they teach the team to distrust red builds.</p>`,
    explain: `<p>🟢 <b>Coverage, measured properly.</b> <code>pytest --cov=app --cov-branch --cov-report=term-missing</code> runs the suite under coverage.py and prints, per file, the percentage and the exact <b>missing lines</b>. Two kinds:</p>
      ${H.table(['Kind', 'Counts', 'Misses'], [
        ['<b>Line</b> coverage', 'lines executed at least once', 'an <code>if</code> whose condition was always true: the "false" path never ran but every line did'],
        ['<b>Branch</b> coverage (<code>--cov-branch</code>)', 'each possible jump between lines (arcs), e.g. both outcomes of every <code>if</code>', 'still misses wrong values: a line can run and compute garbage']
      ])}
      <p>Use coverage to <b>find untested code</b> (especially error handling), not as a target to game. A sensible gate: <code>fail_under = 85</code> overall with branch coverage on, and <b>diff coverage</b> (diff-cover) of ~90% on changed lines so new code arrives tested. To check that tests actually <b>assert</b> things, use <b>mutation testing</b> (mutmut): it changes your code (<code>&gt;</code> to <code>&gt;=</code>, <code>+</code> to <code>-</code>) and expects at least one test to fail. A surviving mutant is a bug your suite would miss.</p>
      <p>🟢 <b>Flaky tests: the usual suspects</b> and their fixes:</p>
      ${H.table(['Cause', 'Symptom', 'Fix'], [
        ['<b>Time</b>', 'fails at midnight, on month end, or when CI is slow', 'inject a clock (<code>now=</code> parameter or dependency); time-machine / freezegun for code you cannot change'],
        ['<b>Randomness</b>', 'fails 1 run in 50', 'seed (<code>random.Random(seed)</code>, Faker seed); assert on values you set'],
        ['<b>Test order / shared state</b>', 'passes alone, fails in the full run', 'per-test transactions, clear caches and overrides; find it with pytest-randomly and replay with <code>--randomly-seed=N</code>'],
        ['<b>Unordered results</b>', 'list in a different order sometimes', '<code>ORDER BY</code> in the query, or compare as sets'],
        ['<b>Async races / sleeps</b>', '<code>sleep(0.1)</code> "to let the task finish"', 'await the task or an event; poll with a timeout instead of fixed sleeps'],
        ['<b>Network</b>', 'fails when a third party is slow', 'mock the boundary (topic 5), block sockets']
      ])}
      <p><b>The test pyramid for an API service</b>: many fast unit tests (pure logic, services with fakes), a solid middle of API tests through <code>TestClient</code> (most FastAPI value lives here), fewer integration tests on real PostgreSQL and Redis, a contract layer (Schemathesis, OpenAPI diff), and a handful of end-to-end smoke tests against a deployed environment. The shape is about <b>cost</b>: push each check to the cheapest layer that can catch it.</p>`,
    clues: [
      '"What does 90% coverage tell you?" → which code ran, not whether results were checked; use branch coverage and mutation testing',
      '"Fails only around midnight / on the 31st" → time dependency: inject a clock or freeze time',
      '"Passes alone, fails in the full suite" → order dependency / leaked state: run with pytest-randomly and bisect',
      '"Just add a retry to the flaky test" → quarantine at most; find the cause (time, randomness, ordering, async, network)',
      '"How would you structure tests for this service?" → the test pyramid: unit, API, integration, contract, few E2E',
      '"Coverage drops in parallel runs" → pytest-cov combines xdist data automatically; check <code>parallel = true</code> for subprocesses'
    ],
    code: [
      {
        lang: 'text', title: 'pyproject.toml — coverage settings',
        code: `[tool.coverage.run]
source = ["app"]
branch = true                 # measure both outcomes of every if/while
parallel = true               # subprocesses / xdist workers write separate data files

[tool.coverage.report]
fail_under = 85
show_missing = true
skip_covered = true
exclude_also = [
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "@(abc\\\\.)?abstractmethod",
]`
      },
      {
        lang: 'bash', title: 'Running coverage, diff coverage and mutation testing',
        code: `# full suite with branch coverage, fail if below fail_under
pytest -n auto --cov=app --cov-branch --cov-report=term-missing --cov-report=xml

# only the lines changed in this pull request must be covered
diff-cover coverage.xml --compare-branch=origin/main --fail-under=90

# hunt for flaky ordering: random order, replay a failing seed
pytest                             # pytest-randomly shuffles; prints "Using --randomly-seed=1234567"
pytest --randomly-seed=1234567     # replay exactly that order
pytest -p no:randomly              # turn shuffling off to compare

# mutation testing on the pricing module (slow: run nightly or on demand)
mutmut run
mutmut results`
      },
      {
        lang: 'python', title: 'Fixing time flakiness: inject a clock, or freeze it',
        code: `# app/tokens.py — the clock is a dependency, so tests control it
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


class ResetTokens:
    def __init__(self, ttl: timedelta, clock: Clock = utc_now) -> None:
        self._ttl = ttl
        self._clock = clock
        self._issued: dict[str, datetime] = {}

    def issue(self, token: str) -> None:
        self._issued[token] = self._clock()

    def is_valid(self, token: str) -> bool:
        issued = self._issued.get(token)
        return issued is not None and self._clock() < issued + self._ttl


# tests/unit/test_tokens.py
class FakeClock:
    def __init__(self, start: datetime) -> None:
        self.now = start

    def __call__(self) -> datetime:
        return self.now

    def advance(self, **kw: float) -> None:
        self.now += timedelta(**kw)


def test_token_expires_exactly_at_ttl() -> None:
    clock = FakeClock(datetime(2026, 1, 31, 23, 59, 59, tzinfo=UTC))   # month-end edge
    tokens = ResetTokens(timedelta(minutes=15), clock=clock)
    tokens.issue("t1")
    clock.advance(minutes=14, seconds=59)
    assert tokens.is_valid("t1")
    clock.advance(seconds=1)
    assert not tokens.is_valid("t1")          # boundary is exclusive, tested deterministically


# For code you cannot change: time-machine moves the whole process clock.
import time_machine


@time_machine.travel(datetime(2026, 2, 28, 23, 59, tzinfo=UTC), tick=False)
def test_monthly_report_on_last_day(client) -> None:
    assert client.get("/reports/current").json()["month"] == "2026-02"`
      },
      {
        lang: 'python', title: 'Fixing randomness and ordering flakiness',
        code: `import random

import pytest


# BAD: depends on global random state and on dict/set/database order
def test_pick_winner_flaky(client) -> None:
    r = client.post("/raffle/draw")
    assert r.json()["winner"] == "ann"                      # sometimes bob


# GOOD: the random source is a dependency with a fixed seed
def test_pick_winner_deterministic(app, client) -> None:
    app.dependency_overrides[get_rng] = lambda: random.Random(42)
    first = client.post("/raffle/draw").json()["winner"]
    app.dependency_overrides[get_rng] = lambda: random.Random(42)
    assert client.post("/raffle/draw").json()["winner"] == first


# GOOD: compare unordered results as sets (or add ORDER BY to the query)
def test_list_tags(client) -> None:
    assert set(client.get("/tags").json()) == {"home", "work"}


# GOOD: wait for async work instead of sleeping a guessed amount
async def test_job_finishes(ac, job_events) -> None:
    await ac.post("/jobs", json={"kind": "export"})
    await job_events.wait_for("export.done", timeout=2.0)   # polls, fails fast on timeout`
      },
      {
        lang: 'python', run: true, title: 'Runnable: line and branch coverage with sys.settrace',
        code: `# coverage.py does this (in C, or with sys.monitoring on 3.12+); here the idea in 25 lines.
import sys


def shipping_cost(weight, country):
    if weight <= 0:
        raise ValueError("weight must be positive")
    cost = 5
    if weight > 10:
        cost += (weight - 10) * 2
    if country != "DE":
        cost += 15
    if cost > 50:
        cost = 50
    return cost


FIRST = shipping_cost.__code__.co_firstlineno
lines_hit, arcs_hit = set(), set()
last = [None]


def tracer(frame, event, arg):
    if frame.f_code is not shipping_cost.__code__:
        return None
    if event == "call":
        last[0] = None
    if event == "line":
        n = frame.f_lineno - FIRST            # line number inside the function
        lines_hit.add(n)
        if last[0] is not None:
            arcs_hit.add((last[0], n))        # a jump from one line to the next = an arc
        last[0] = n
    return tracer


def run_tests(calls):
    lines_hit.clear(); arcs_hit.clear()
    sys.settrace(tracer)
    try:
        for w, c in calls:
            assert shipping_cost(w, c) > 0     # a weak assertion, on purpose
    finally:
        sys.settrace(None)


body = range(1, 11)                            # executable lines 1..10 of the body
branches = {(1, 2), (1, 3), (4, 5), (4, 6), (6, 7), (6, 8), (8, 9), (8, 10)}
for name, calls in [("one happy test", [(2, "DE")]),
                    ("three tests", [(2, "DE"), (12, "US"), (40, "US")])]:
    run_tests(calls)
    missed = [n for n in body if n not in lines_hit]
    br = len(branches & arcs_hit)
    print(f"{name}: line coverage {len(lines_hit & set(body))}/{len(body)}, "
          f"branch coverage {br}/{len(branches)}, missed lines {missed}")
print("still untested: the weight <= 0 error path, because no test passes weight 0")`
      }
    ],
    codeTitle: ['coverage settings', 'coverage / diff / mutation commands', 'Time: injected clock and time-machine', 'Randomness and ordering', 'Runnable: settrace coverage'],
    viz: {
      title: 'Coverage highlighter: which lines and branches your tests drove through',
      input: '2 DE ; 12 US',
      inputLabel: 'Test calls to shipping_cost: "weight COUNTRY" separated by ; (max 5)',
      gen: function (input) {
        var calls = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5);
        if (!calls.length) throw new Error('Type calls like: 2 DE ; 12 US');
        var hits = {}, arcs = {}, frames = [];
        var allBranches = [['2', 'if weight <= 0', 'true'], ['2', 'if weight <= 0', 'false'], ['5', 'if weight > 10', 'true'], ['5', 'if weight > 10', 'false'], ['7', 'if country != "DE"', 'true'], ['7', 'if country != "DE"', 'false'], ['9', 'if cost > 50', 'true'], ['9', 'if cost > 50', 'false']];
        function cov() {
          var lines = 0; for (var l = 2; l <= 11; l++) if (hits[l]) lines++;
          var br = allBranches.filter(function (b) { return arcs[b[0] + b[2]]; }).length;
          return { lines: lines, br: br };
        }
        function fr(narr, hl) {
          var c = cov(), entries = [];
          for (var l = 2; l <= 11; l++) entries.push(['line ' + l, hits[l] ? hits[l] + '×' : 'missed']);
          var mhl = {}; for (var k = 2; k <= 11; k++) mhl['line ' + k] = hits[k] ? 'ok' : 'bad';
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'app/shipping.py', lang: 'python', code: SHIP_CODE, hl: hl },
            { type: 'map', label: 'Hit counts', entries: entries, hl: mhl },
            { type: 'table', label: 'Branch outcomes seen', columns: ['line', 'condition', 'outcome', 'seen?'], rows: allBranches.map(function (b) { return [b[0], b[1], b[2], arcs[b[0] + b[2]] ? 'yes' : 'NO']; }), hl: {} },
            { type: 'vars', label: 'Coverage', vals: { lines: c.lines + '/10 = ' + Math.round(c.lines * 10) + '%', branches: c.br + '/8 = ' + Math.round(c.br * 12.5) + '%' }, hl: {} }
          ] });
        }
        fr('Before any test: every line is unhighlighted. Coverage.py records each line (and each jump between lines) as tests run.', {});
        calls.forEach(function (cs) {
          var w = cs.split(/\s+/), wt = parseFloat(w[0]), ct = (w[1] || 'DE').toUpperCase();
          if (isNaN(wt)) throw new Error('Each call is "weight COUNTRY", e.g. 12 US');
          var path = [], cost = 5;
          function hit(l) { hits[l] = (hits[l] || 0) + 1; path.push(l); }
          hit(2);
          if (wt <= 0) { arcs['2true'] = 1; hit(3); }
          else {
            arcs['2false'] = 1; hit(4); hit(5);
            if (wt > 10) { arcs['5true'] = 1; hit(6); cost += (wt - 10) * 2; } else arcs['5false'] = 1;
            hit(7);
            if (ct !== 'DE') { arcs['7true'] = 1; hit(8); cost += 15; } else arcs['7false'] = 1;
            hit(9);
            if (cost > 50) { arcs['9true'] = 1; hit(10); cost = 50; } else arcs['9false'] = 1;
            hit(11);
          }
          var hl = {}; path.forEach(function (l) { hl[l] = 'ok'; });
          fr('Test calls <code>shipping_cost(' + wt + ', "' + hesc(ct) + '")</code> → ' + (wt <= 0 ? '<b>ValueError</b>' : 'returns <b>' + cost + '</b>') + '. Lines ' + path.join(', ') + ' light up.', hl);
        });
        var missed = []; for (var l = 2; l <= 11; l++) if (!hits[l]) missed.push(l);
        var notSeen = allBranches.filter(function (b) { return !arcs[b[0] + b[2]]; }).map(function (b) { return 'line ' + b[0] + ' ' + b[2]; });
        var hl2 = {}; missed.forEach(function (l) { hl2[l] = 'bad'; });
        fr('Report: ' + (missed.length ? 'missed lines <b>' + missed.join(', ') + '</b>' : 'every line ran') + '; ' + (notSeen.length ? 'branch outcomes never taken: ' + notSeen.join(', ') + '.' : 'every branch outcome taken.') + ' Note how line coverage can be high while branch coverage still shows gaps.', hl2);
        fr('Even 100% here would not prove the <b>values</b> are right: a test that only asserts <code>cost &gt; 0</code> covers lines but would not notice <code>* 2</code> becoming <code>* 3</code>. Mutation testing catches exactly that.', hl2);
        return frames;
      }
    },
    examples: [
      {
        title: '100% coverage, bug still there',
        html: `<p>The discount function below has full line and branch coverage from two tests: 50 and 150. The real rule is "orders of <b>100 or more</b> get 10%". The code uses <code>&gt;</code>, so an order of exactly 100 gets nothing. No test used the boundary. A mutation tool would change <code>&gt;</code> to <code>&gt;=</code>, every test would still pass, and the <b>surviving mutant</b> would point at the missing boundary test.</p>
          ${H.table(['Test input', 'Expected', 'Actual', 'Catches the bug?'], [['50', '50', '50', 'no'], ['150', '135', '135', 'no'], [H.c('b', '100'), '90', H.c('r', '100'), H.c('g', 'yes')]])}`,
        code: { lang: 'python', code: `def discounted(total: int) -> float:
    if total > 100:            # bug: should be >= 100
        return total * 0.9
    return total


def test_boundary() -> None:
    assert discounted(99) == 99
    assert discounted(100) == 90       # fails, revealing the bug
    assert discounted(101) == 90.9` }
      },
      {
        title: 'Finding an order-dependent test',
        html: `<p>The suite fails only in CI with <code>-n 4</code>. Steps: run with pytest-randomly installed until it fails and note the seed; replay that seed to get a stable failure; then bisect the tests that ran before the victim (pytest-randomly prints the order; tools like <code>detect-test-pollution</code> automate the bisection). Typical culprit: one test sets <code>app.dependency_overrides</code> on a module-level app and never clears it, or leaves a cached settings object behind.</p>
          ${H.table(['Run', 'Order', 'Result'], [['alone', 'test_b', H.c('g', 'pass')], ['full suite', 'test_a, test_b', H.c('r', 'fail')], ['bisect', 'test_a then test_b', H.c('r', 'fail → test_a is the polluter')]])}`
      },
      {
        title: 'A test pyramid for a notes API',
        html: `${H.table(['Layer', 'Count', 'Runs in', 'Example'], [['Unit (pure functions, services with fakes)', '~400', '2 s', 'slug rules, permission matrix, retry policy'], ['API via TestClient (fake repos)', '~250', '10 s', 'every status code of every endpoint'], ['Integration (PostgreSQL, Redis in containers)', '~60', '40 s', 'repositories, migrations, unique constraints, locking'], ['Contract (Schemathesis, OpenAPI diff, fake parity)', '~10 suites', '60 s on PRs', 'no 500 for any schema-valid input'], ['E2E smoke on staging', '~8', '2 min after deploy', 'sign up, log in, create note, delete note']])}
          <p>Every pull request runs the first three plus a short contract run; nightly runs long contract fuzzing and mutation testing.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How coverage.py measures.</b> On Python ≤ 3.11 it installs a trace function (a fast C tracer) that receives a <code>line</code> event for each executed line; branch mode records <b>arcs</b> (from-line, to-line pairs) and compares them with the arcs the compiler's code structure allows, found by static analysis of the AST. On 3.12+ it can use <code>sys.monitoring</code> (PEP 669, <code>COVERAGE_CORE=sysmon</code>), which disables each event after its first hit, so overhead is far lower. Subprocesses and xdist workers write separate <code>.coverage.*</code> files that <code>coverage combine</code> merges; pytest-cov does this for you.</p>
      <p><b>Coverage of async code</b> works per line too, but a coroutine that is created and never awaited shows its <code>def</code> line as covered and its body as missed: a good signal of a missing <code>await</code>.</p>
      <p><b>Mutation testing cost.</b> Each mutant re-runs (the relevant part of) the suite, so it is O(mutants × test time). Tools use coverage to run only tests touching the mutated line, cache results, and are best run on critical modules (pricing, permissions) or only on changed files.</p>
      <p><b>Flaky test policy.</b> Track flakiness (a CI plugin or a <code>--reruns</code> report) and quarantine with a marker and an owner and deadline, not with silent retries. <code>pytest-rerunfailures</code> (<code>--reruns 2</code>) keeps the build green but also hides real race conditions that users will hit. A good rule: a test that needed a rerun opens a ticket automatically.</p>
      <p><b>Production reality.</b> Coverage numbers are easy to game (tests that call code without asserting). Review tests like code: does each test assert an outcome a user would care about? Pair a moderate global gate with strict diff coverage and occasional mutation runs on core logic.</p>`,
    aiEra: `<p>🤖 "Raise coverage to 90%" is a dangerous instruction for an AI agent: it will happily write tests that execute code and assert nothing, or that assert whatever the code currently returns, freezing bugs in place. Ask instead: "find untested <b>behaviours</b> in the coverage report (missing lines in error paths) and write tests that assert the correct outcome per the spec".</p>
      <p>Mutation testing is the perfect reviewer for AI-written tests: surviving mutants show where generated tests are decorative. Some teams run mutmut on files an agent changed before merging.</p>
      <p>Agents are also good at <b>diagnosing</b> flaky tests when given the right evidence: the failing seed, the test order, and the diff of state between runs. Without that evidence they tend to "fix" flakiness by adding sleeps or retries, which you should reject.</p>`,
    problems: [
      {
        title: 'Fix a Flaky Expiry Test with an Injectable Clock',
        level: 'Medium',
        tags: ['flaky tests', 'time', 'fakes', 'cache'],
        companies: ['Netflix', 'Booking.com'],
        statement: `<p>A session cache test fails about once a day in CI. It stores a value, calls <code>time.sleep(1)</code>, and checks that a 1-second TTL entry has expired; on a slow runner the timing drifts. Rewrite the cache to take a clock, and build the test harness class <code>CacheUnderFakeClock(ttl)</code> that wires a fake clock into the cache:</p>
          <ul>
            <li><code>put(key, value)</code>: store with the current fake time.</li>
            <li><code>get(key) -&gt; str</code>: the value, or <code>""</code> if missing or expired. An entry is expired when <code>now &gt;= stored_at + ttl</code>. Expired entries are removed on access.</li>
            <li><code>advance(seconds)</code>: move fake time forward (no real waiting).</li>
            <li><code>size() -&gt; int</code>: number of entries that are <b>not expired</b> at the current time.</li>
          </ul>
          <p>Putting an existing key overwrites it and restarts its TTL.</p>`,
        constraints: `<p>ttl ≥ 1 second (integer), advance ≥ 0, up to 10<sup>4</sup> operations. Fake time starts at 0.</p>`,
        example: `<p><code>CacheUnderFakeClock(10)</code>, <code>put("s", "ann")</code>, <code>advance(9)</code>, <code>get("s")</code> → ${H.c('g', '"ann"')}; <code>advance(1)</code>, <code>get("s")</code> → ${H.c('r', '""')}.</p>
          <p>Why: at time 9 the entry (stored at 0, ttl 10) is alive; at time 10 <code>now &gt;= 0 + 10</code>, so it is expired. The boundary is tested exactly, in microseconds.</p>`,
        brute: {
          why: `<p>The original test relies on the real clock and real sleeping. It is slow (a full second per check), it cannot test the exact boundary, and scheduler delays on a busy CI machine make it pass or fail at random. Adding a bigger sleep only makes it slower and still flaky.</p>`,
          code: `import time


class SessionCache:
    def __init__(self, ttl):
        self.ttl, self.data = ttl, {}

    def put(self, key, value):
        self.data[key] = (value, time.monotonic())     # hard-wired real clock

    def get(self, key):
        item = self.data.get(key)
        if item and time.monotonic() - item[1] < self.ttl:
            return item[0]
        return ""


def test_expiry_flaky():
    c = SessionCache(1)
    c.put("s", "ann")
    time.sleep(1)               # slow, and the boundary is a coin flip on busy CI
    assert c.get("s") == ""`
        },
        mcq: {
          q: 'What is the most reliable fix for a test that depends on <code>time.sleep</code> to pass a TTL?',
          options: ['Increase the sleep to 2 seconds', 'Mark it flaky and rerun on failure', 'Make the clock a dependency and advance a fake clock in the test', 'Run the test alone'],
          answer: 2,
          explain: 'An injected clock makes time an input: the test controls it exactly, runs instantly, and can probe the boundary (ttl - 1 and ttl).'
        },
        hints: [
          'Hint 1: the cache takes a <code>clock</code> callable; the harness owns a <code>FakeClock</code> whose <code>now</code> starts at 0 and passes <code>fake.now_fn</code> (or the instance with <code>__call__</code>).',
          'Hint 2: store <code>(value, stored_at)</code>. Expired means <code>clock() &gt;= stored_at + ttl</code>; delete on <code>get</code> when expired.',
          'Hint 3: <code>size()</code> counts entries that are not expired right now (you may also purge them). <code>advance</code> only changes the fake clock.'
        ],
        solution: {
          approach: `<p>Make time an input. <code>TTLCache</code> receives a <code>clock</code> callable (production passes <code>time.monotonic</code>); the test harness passes a <code>FakeClock</code> it controls. Expiry is a pure comparison against the injected time, so the boundary (exactly <code>ttl</code> seconds later) is deterministic. The harness class simply composes the two and exposes <code>advance</code>, which is what a pytest fixture would provide in a real suite.</p>`,
          code: `import time


class FakeClock:
    def __init__(self, start=0):
        self.now = start

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


class TTLCache:
    def __init__(self, ttl, clock=time.monotonic):   # production default: real clock
        self.ttl = ttl
        self.clock = clock
        self.data = {}

    def _expired(self, stored_at):
        return self.clock() >= stored_at + self.ttl

    def put(self, key, value):
        self.data[key] = (value, self.clock())        # overwrite restarts the TTL

    def get(self, key):
        item = self.data.get(key)
        if item is None:
            return ""
        if self._expired(item[1]):
            del self.data[key]
            return ""
        return item[0]

    def size(self):
        for key in [k for k, (_, at) in self.data.items() if self._expired(at)]:
            del self.data[key]
        return len(self.data)


class CacheUnderFakeClock:
    """What a pytest fixture would hand the test: a cache wired to a fake clock."""

    def __init__(self, ttl):
        self.clock = FakeClock()
        self.cache = TTLCache(ttl, clock=self.clock)

    def put(self, key, value):
        self.cache.put(key, value)

    def get(self, key):
        return self.cache.get(key)

    def advance(self, seconds):
        self.clock.advance(seconds)

    def size(self):
        return self.cache.size()`,
          complexity: `<p><code>put</code>/<code>get</code>/<code>advance</code> are O(1); <code>size</code> is O(n) for n stored entries. Tests run in microseconds instead of seconds.</p>`,
          followUps: ['How would you do the same in FastAPI: which dependency would the clock be, and how do you override it?', 'When is <code>time-machine</code> a better choice than injecting a clock?']
        },
        tests: { cls: 'CacheUnderFakeClock', sigs: { CacheUnderFakeClock: 'int', put: 'string string -> void', get: 'string -> string', advance: 'int -> void', size: '-> int' }, cases: [
          { ops: ['CacheUnderFakeClock', 'put', 'advance', 'get', 'advance', 'get'], args: [[10], ['s', 'ann'], [9], ['s'], [1], ['s']], out: [null, null, null, 'ann', null, ''] },
          { ops: ['CacheUnderFakeClock', 'get', 'size'], args: [[5], ['nope'], []], out: [null, '', 0] },
          { ops: ['CacheUnderFakeClock', 'put', 'advance', 'put', 'advance', 'get'], args: [[10], ['k', 'v1'], [8], ['k', 'v2'], [8], ['k']], out: [null, null, null, null, null, 'v2'] },
          { ops: ['CacheUnderFakeClock', 'put', 'advance', 'put', 'size', 'advance', 'size', 'get', 'get'], args: [[3], ['a', '1'], [2], ['b', '2'], [], [1], [], ['a'], ['b']], out: [null, null, null, null, 2, null, 1, '', '2'] },
          { ops: ['CacheUnderFakeClock', 'put', 'advance', 'get'], args: [[1], ['x', 'y'], [0], ['x']], out: [null, null, null, 'y'] },
          { ops: ['CacheUnderFakeClock', 'put', 'advance', 'size', 'put', 'get'], args: [[2], ['x', 'y'], [100], [], ['x', 'z'], ['x']], out: [null, null, null, 0, null, 'z'] }
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 8 — Static quality and CI: mypy strict, ruff, pre-commit, pipelines
     ===================================================================== */
  topics.push({
    title: 'Static Quality and CI: mypy --strict, Ruff Lint and Format, pre-commit and a GitHub Actions Pipeline',
    analogy: `<p>Before a plane takes off, the crew walks a <b>checklist</b>: fuel, flaps, doors. The checklist does not fly the plane, but it catches the silly, expensive mistakes cheaply and in the same order every time. <b>Ruff</b> (lint and format) and <b>mypy</b> (types) are that checklist for code: they read it without running it. <b>CI</b> is the rule that no plane leaves the gate until the whole checklist and the test flight (the test suite) are green, no matter how senior the pilot.</p>`,
    explain: `<p>🟢 <b>Static checks read code without running it</b>, so they are fast and catch whole classes of bugs before a test exists. Python 9 introduced type hints and mypy; here we set them up for a FastAPI project and wire everything into CI.</p>
      ${H.table(['Tool', 'Catches', 'Command'], [
        ['<b>ruff check</b>', 'unused imports, undefined names, bare except, mutable default args, <code>assert</code> in app code, blocking calls in async code, old syntax, security smells (Bandit rules)', '<code>ruff check --fix .</code>'],
        ['<b>ruff format</b>', 'formatting arguments in review (Black-compatible style)', '<code>ruff format .</code> / <code>--check</code> in CI'],
        ['<b>mypy --strict</b>', '<code>None</code> passed where a value is required, wrong return types, missing awaits, untyped functions, typos in attribute names', '<code>mypy src tests</code>'],
        ['<b>pre-commit</b>', 'runs the fast checks on every commit, before CI', '<code>pre-commit install</code>'],
        ['<b>CI (GitHub Actions)</b>', 'enforces all of it plus tests, coverage and contract checks on every pull request', 'a workflow YAML file']
      ])}
      <p><b>What "strict" turns on</b> in mypy: every function must be annotated (<code>disallow_untyped_defs</code>), no implicit <code>Any</code> from untyped calls, no implicit re-exports, warnings for unused <code>type: ignore</code> and redundant casts, and <code>Optional</code> is never implied. For FastAPI projects add the <b>Pydantic mypy plugin</b> so model constructors are type-checked. SQLAlchemy 2.0 models typed with <code>Mapped[...]</code> need no plugin.</p>
      <p><b>Reading the common mypy errors</b>:</p>
      ${H.table(['Error', 'Usual meaning', 'Fix'], [
        ['<code>Item "None" of "User | None" has no attribute "email"</code>', '<code>session.get()</code> may return None', 'check <code>if user is None: raise HTTPException(404)</code> (narrowing)'],
        ['<code>Function is missing a return type annotation</code>', 'strict mode', 'annotate, including <code>-&gt; None</code>'],
        ['<code>Returning Any from function declared to return "int"</code>', 'an untyped library or <code>json.loads</code>', 'validate with a Pydantic model or <code>cast</code> after checking'],
        ['<code>Value of type "Coroutine[...]" must be used</code>', 'a missing <code>await</code>', 'add <code>await</code>'],
        ['<code>Skipping analyzing "factory": module is installed, but missing library stubs</code>', 'library has no types', 'install stubs, or an override with <code>ignore_missing_imports</code> for that module only']
      ])}
      <p>🔵 <b>A CI pipeline</b> runs cheap checks first and fails fast: lint and format (seconds), type check (seconds to a minute), then tests with a real PostgreSQL service container and a coverage gate, then contract checks, then build the image. Every job installs the <b>locked</b> dependencies (<code>uv sync --locked</code>) so CI tests exactly what will ship.</p>`,
    clues: [
      '"Enforce code quality on every PR" → ruff + mypy + tests + coverage gate in CI, the same checks locally via pre-commit',
      '"mypy says Item None has no attribute" → narrow the Optional (check for None, raise 404) instead of <code>type: ignore</code>',
      '"Adopt mypy on a big untyped codebase" → strict for new modules via per-module overrides, ratchet the rest',
      '"Formatting debates in code review" → <code>ruff format</code> + <code>--check</code> in CI ends them',
      '"CI is slow" → fail fast ordering, cache the uv/pip downloads, parallel jobs, pytest-xdist, run slow suites nightly',
      '"Tests need a database in CI" → a <code>services: postgres</code> container with a health check and a test-only URL'
    ],
    code: [
      {
        lang: 'text', title: 'pyproject.toml — mypy strict and ruff',
        code: `[tool.mypy]
python_version = "3.12"
strict = true
warn_unreachable = true
plugins = ["pydantic.mypy"]
files = ["src", "tests"]

[tool.pydantic-mypy]
init_forbid_extra = true
init_typed = true
warn_required_dynamic_aliases = true

[[tool.mypy.overrides]]
module = ["factory.*", "testcontainers.*"]   # libraries without type information
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = ["app.legacy.*"]                     # old code: being typed gradually
disallow_untyped_defs = false

[tool.ruff]
line-length = 100
target-version = "py312"
src = ["src", "tests"]

[tool.ruff.lint]
select = [
    "E", "W", "F",   # pycodestyle + pyflakes
    "I",             # import sorting
    "B",             # bugbear: mutable defaults, loop-variable closures ...
    "UP",            # pyupgrade: modern syntax for the target version
    "SIM",           # simplifications
    "S",             # flake8-bandit security checks
    "ASYNC",         # blocking calls inside async functions
    "PT",            # pytest style
    "RUF",
]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101", "S105", "S106"]   # assert and fake test passwords are fine in tests

[tool.ruff.format]
quote-style = "double"`
      },
      {
        lang: 'yaml', title: '.pre-commit-config.yaml',
        code: `repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.2
    hooks:
      - id: mypy
        additional_dependencies: ["pydantic>=2.8", "fastapi>=0.115", "sqlalchemy>=2.0"]
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.1
    hooks:
      - id: gitleaks          # refuse commits that contain secrets`
      },
      {
        lang: 'yaml', title: '.github/workflows/ci.yml — lint, types, tests with PostgreSQL, coverage, contract',
        code: `name: ci
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true          # a new push cancels the old run

jobs:
  static:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv sync --locked
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run mypy

  tests:
    needs: static                   # fail fast: no tests if lint or types fail
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.12", "3.13"]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: app_test
          POSTGRES_HOST_AUTH_METHOD: trust   # throwaway container, no password needed
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      TEST_DATABASE_URL: postgresql+psycopg://postgres@localhost:5432/app_test
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
          python-version: \${{ matrix.python-version }}
      - run: uv sync --locked
      - run: uv run pytest -n auto --cov=app --cov-branch --cov-report=xml --cov-fail-under=85
      - run: uv run diff-cover coverage.xml --compare-branch=origin/main --fail-under=90
        if: github.event_name == 'pull_request'

  contract:
    needs: static
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - run: uv sync --locked
      - run: uv run pytest tests/contract -p no:randomly`
      },
      {
        lang: 'python', title: 'Before and after: making a service pass mypy --strict',
        code: `# BEFORE (mypy --strict reports 5 errors):
#   def find_user(db, email):                      -> missing annotations
#       user = db.scalars(select(User).where(User.email == email)).first()
#       return user.name                           -> Item "None" has no attribute "name"
#   async def send(mailer, to):
#       mailer.send(to)                            -> coroutine never awaited

# AFTER
from typing import Protocol

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


class Mailer(Protocol):
    async def send(self, to: str, subject: str) -> None: ...


def find_user_name(db: Session, email: str) -> str:
    user = db.scalars(select(User).where(User.email == email)).first()   # User | None
    if user is None:                                                      # narrowing
        raise HTTPException(status_code=404, detail="user not found")
    return user.name                                                      # now just User


async def send_welcome(mailer: Mailer, to: str) -> None:
    await mailer.send(to, subject="Welcome")      # mypy flags the call if await is missing`
      },
      {
        lang: 'python', run: true, title: 'Runnable: how a linter works (a tiny ast-based checker)',
        code: `# Ruff is written in Rust, but the idea is the same: parse to a syntax tree, walk it,
# report patterns. Three real rules: mutable default (B006), bare except (E722),
# a blocking call inside async def (ASYNC2xx).
import ast

SOURCE = '''
import time
import requests

def add_tag(note, tags=[]):
    tags.append(note)
    return tags

async def fetch_rates():
    time.sleep(1)
    return requests.get("https://rates.example.test").json()

def parse(raw):
    try:
        return int(raw)
    except:
        return None
'''

BLOCKING = {("time", "sleep"), ("requests", "get"), ("requests", "post")}


class Checker(ast.NodeVisitor):
    def __init__(self):
        self.problems = []
        self.in_async = False

    def report(self, node, code, msg):
        self.problems.append((node.lineno, code, msg))

    def visit_FunctionDef(self, node):
        for default in node.args.defaults:
            if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                self.report(default, "B006", f"mutable default argument in {node.name}()")
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node):
        self.in_async = True
        self.generic_visit(node)
        self.in_async = False

    def visit_Call(self, node):
        f = node.func
        if (self.in_async and isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name)
                and (f.value.id, f.attr) in BLOCKING):
            self.report(node, "ASYNC", f"blocking call {f.value.id}.{f.attr}() inside async def")
        self.generic_visit(node)

    def visit_ExceptHandler(self, node):
        if node.type is None:
            self.report(node, "E722", "bare except: also catches KeyboardInterrupt/SystemExit")
        self.generic_visit(node)


checker = Checker()
checker.visit(ast.parse(SOURCE))
for line, code, msg in sorted(checker.problems):
    print(f"app.py:{line}: {code} {msg}")
print(f"Found {len(checker.problems)} errors.")`
      }
    ],
    codeTitle: ['pyproject: mypy + ruff', 'pre-commit', 'GitHub Actions CI', 'Make mypy --strict pass', 'Runnable: a tiny linter'],
    viz: {
      title: 'A pull request through the CI pipeline',
      input: 'fail=none',
      inputLabel: 'Which step fails? fail=none | ruff | format | mypy | tests | coverage | contract',
      gen: function (input) {
        var m = String(input || '').match(/fail\s*=\s*(\w+)/i), fail = m ? m[1].toLowerCase() : 'none';
        var order = ['ruff', 'format', 'mypy', 'tests', 'coverage', 'contract'];
        if (fail !== 'none' && order.indexOf(fail) < 0) throw new Error('Use fail=none, ruff, format, mypy, tests, coverage or contract');
        var nodes = [bx('PR', 'pull request', 6, 30, 14), bx('ruff', 'ruff check', 28, 10, 14), bx('format', 'ruff format --check', 28, 50, 18), bx('mypy', 'mypy --strict', 50, 30, 14),
          bx('tests', 'pytest + Postgres', 70, 12, 18), bx('coverage', 'coverage gate', 70, 50, 16), bx('contract', 'schemathesis', 90, 12, 14), bx('merge', 'merge allowed', 90, 50, 14)];
        var edges = [['PR', 'ruff'], ['PR', 'format'], ['ruff', 'mypy'], ['format', 'mypy'], ['mypy', 'tests'], ['tests', 'coverage'], ['mypy', 'contract'], ['coverage', 'merge'], ['contract', 'merge']];
        var why = {
          ruff: 'ruff reports <code>F401 unused import</code> and <code>B006 mutable default</code>. Seconds after the push, the author knows.',
          format: '<code>ruff format --check</code> found 2 files that would be reformatted. Run <code>ruff format .</code> locally (pre-commit would have done it).',
          mypy: 'mypy: <code>Item "None" of "User | None" has no attribute "email"</code>. A real 500 waiting to happen, caught without running anything.',
          tests: 'pytest: <code>test_duplicate_email_is_409</code> got 500. The PostgreSQL service container gave a real unique-constraint error.',
          coverage: 'Total coverage 86% passed, but diff-cover says the new <code>refund()</code> branch has 40% coverage: below the 90% gate for changed lines.',
          contract: 'Schemathesis: <code>POST /notes</code> with title <code>"\\u0000"</code> returned 500. Undocumented, so the contract check fails.'
        };
        var frames = [], hl = {}, ehl = {};
        function fr(narr) { frames.push({ narr: narr, parts: [{ type: 'graph', directed: true, height: 60, label: 'GitHub Actions jobs', nodes: nodes, edges: edges, hl: cp(hl), ehl: cp(ehl) }] }); }
        hl.PR = 'cur'; fr('A pull request is opened. The workflow starts; <code>concurrency</code> cancels any older run for the same branch.');
        var stages = [['ruff', 'format'], ['mypy'], ['tests', 'contract'], ['coverage']];
        var failed = false;
        for (var i = 0; i < stages.length && !failed; i++) {
          stages[i].forEach(function (s) { hl[s] = 'cur'; });
          stages[i].forEach(function (s) { edges.forEach(function (e) { if (e[1] === s && hl[e[0]] === 'ok' || (e[1] === s && e[0] === 'PR')) ehl[e[0] + '-' + e[1]] = 'cur'; }); });
          fr('Running: ' + stages[i].join(' + ') + (i === 0 ? '. The cheapest checks go first, in parallel.' : i === 1 ? ' (needs the static job). Types next: still no database needed.' : i === 2 ? '. Tests run on Python 3.12 and 3.13 against a PostgreSQL service container; the contract job fuzzes the API in parallel.' : '. The coverage report from the test job is checked against the gates.'));
          stages[i].forEach(function (s) {
            if (s === fail) { hl[s] = 'bad'; failed = true; }
            else hl[s] = 'ok';
          });
          if (failed) { fr('<b>' + hesc(fail) + ' failed.</b> ' + why[fail] + ' Later jobs that depend on it are <b>skipped</b>, saving minutes, and the merge button stays blocked by branch protection.'); }
          else fr(stages[i].join(' + ') + ' passed.');
        }
        if (!failed) { hl.merge = 'ok'; ehl['coverage-merge'] = 'ok'; ehl['contract-merge'] = 'ok'; fr('Every required check is green. Branch protection allows the merge; the same locked dependencies are what the image build will use.'); }
        else { hl.merge = 'bad'; fr('Fix locally (the same commands, via pre-commit and <code>uv run pytest</code>), push, and the pipeline runs again from the start.'); }
        return frames;
      }
    },
    examples: [
      {
        title: 'Gradual typing on a legacy service',
        html: `<p>Turning on <code>strict = true</code> for a 50 000-line untyped project produces thousands of errors and the team gives up. A workable plan: enable strict globally, add an override relaxing <code>disallow_untyped_defs</code> for <code>app.legacy.*</code>, require every <b>new or touched</b> module to pass strict, and shrink the override list each sprint. Track progress with <code>mypy --html-report</code> or a simple count of overrides.</p>
          ${H.table(['Week', 'Modules under strict', 'Errors in CI'], [['1', 'new code only', '0 (gate on)'], ['6', '40%', '0'], ['16', '90%', '0'], ['20', '100%: override removed', '0']])}`
      },
      {
        title: 'A ruff rule that prevents an outage',
        html: `<p>The <code>ASYNC</code> rules flag <code>requests.get()</code> or <code>time.sleep()</code> inside <code>async def</code>. In FastAPI that call blocks the whole event loop: under load, every request on that worker stalls (Python Backend I, async vs sync). A linter catches it in the editor, long before a load test does. Similarly <code>S105</code> flags a hard-coded password string, and <code>B008</code> flags function calls in default arguments (FastAPI's <code>Depends()</code> is allowed via <code>extend-immutable-calls</code> or by using <code>Annotated</code>).</p>`,
        code: { lang: 'python', code: `import asyncio

import httpx


async def fetch_rates(client: httpx.AsyncClient) -> dict[str, float]:
    await asyncio.sleep(0)                          # never time.sleep in async code
    r = await client.get("https://rates.example.test/latest")   # async client, awaited
    r.raise_for_status()
    return dict(r.json()["rates"])` }
      },
      {
        title: 'Keeping CI fast as the suite grows',
        html: `${H.table(['Technique', 'Typical saving'], [['Cache uv / pip downloads (<code>enable-cache</code>)', '30–60 s per job'], ['<code>pytest -n auto</code> (xdist) with a DB per worker', '2–4× on test time'], ['Fail fast: tests <code>needs: static</code>', 'no wasted test minutes on lint failures'], ['Split slow suites: <code>-m "not slow"</code> on PRs, everything nightly', 'PR feedback in minutes'], ['<code>concurrency: cancel-in-progress</code>', 'no queue of outdated runs'], ['<code>pytest --durations=20</code> in CI output', 'finds the slow tests to fix first']])}`
      }
    ],
    deepDive: `<p>🟣 <b>How mypy and Ruff work.</b> Ruff parses each file into a syntax tree (in Rust, in parallel) and runs hundreds of rules re-implemented from flake8 plugins, isort, pyupgrade and Bandit; it is typically 10–100× faster than the tools it replaces, so it fits in an editor save hook. It does <b>not</b> follow types across modules. mypy builds a full semantic model: it resolves imports, infers types, and checks every expression against declared types, caching results in <code>.mypy_cache</code> so incremental runs are fast. Because it analyses imports, missing stubs for third-party packages matter; prefer installing <code>types-*</code> stub packages over ignoring.</p>
      <p><b>Typing FastAPI code.</b> Dependencies declared with <code>Annotated[Session, Depends(get_db)]</code> type-check naturally. Route functions returning ORM objects while declaring <code>response_model</code> should be annotated with the returned type (or the response model with <code>from_attributes</code>). With the Pydantic plugin, <code>NoteIn(title=1)</code> is a type error. <code>reveal_type(x)</code> is the fastest way to see what mypy believes.</p>
      <p><b>Alternatives.</b> Pyright (used by Pylance in VS Code) is faster and stricter in some areas; basedpyright and Astral's newer type checker are gaining adoption. Many teams run Pyright in the editor and mypy in CI, or standardise on one; the important part is one configuration enforced in CI.</p>
      <p><b>CI hygiene.</b> Pin tool versions (pre-commit <code>rev</code>, locked dependencies) so a new Ruff release does not break unrelated pull requests; upgrade them deliberately with an automated PR (Dependabot or Renovate). Keep secrets out of test jobs entirely: tests need fake credentials only. Make required checks explicit in branch protection so a skipped job cannot be mistaken for a passing one.</p>
      <p><b>Production reality.</b> A good pipeline is boring and fast: lint and types in under a minute, tests in under ten. When it gets slower, developers start pushing less often, batches grow, and failures become harder to debug.</p>`,
    aiEra: `<p>🤖 Static checks are the cheapest verifier for AI-generated code. Coding agents work much better when they can run <code>ruff check --fix</code>, <code>mypy</code> and <code>pytest -x</code> in a loop: the tools give precise, machine-readable feedback. Document those commands in your repository (a CONTRIBUTING file or agent instructions) so agents use the same gates as humans.</p>
      <p>Watch for the shortcuts agents take to "make mypy pass": sprinkling <code>Any</code>, <code>cast()</code> and <code>type: ignore</code>. Enable <code>warn_unused_ignores</code> (part of strict) and review every new ignore. Prefer fixes that narrow types (a <code>None</code> check that becomes a 404) over fixes that silence the checker.</p>
      <p>Assistants are great at writing CI YAML, but they often use outdated action versions, forget <code>--locked</code>, or put real secrets in env blocks. Read the workflow like production code: it has write access to your repository.</p>`,
    problems: [
      {
        title: 'Make a Repository Module Pass mypy --strict (Without Silencing It)',
        level: 'Medium',
        tags: ['mypy', 'type hints', 'narrowing', 'async'],
        companies: ['Dropbox', 'Microsoft'],
        statement: `<p>CI just turned on <code>mypy --strict</code> for <code>app/orders.py</code> and it reports these errors:</p>
          <pre>orders.py:9: error: Function is missing a type annotation  [no-untyped-def]
orders.py:11: error: Item "None" of "Order | None" has no attribute "status"  [union-attr]
orders.py:17: error: Function is missing a return type annotation  [no-untyped-def]
orders.py:19: error: Value of type "Coroutine[Any, Any, None]" must be used  [unused-coroutine]
orders.py:24: error: Returning Any from function declared to return "int"  [no-any-return]</pre>
          <p>Fix the code so mypy passes <b>without</b> <code>Any</code>, <code>cast</code> or <code>type: ignore</code>, and so the fixes also make the runtime behaviour correct.</p>
          <pre>def cancel(db, order_id):                      # line 9
    order = db.get(Order, order_id)
    order.status = "cancelled"                  # line 11
    db.commit()
    return order

async def notify(mailer: Mailer, order: Order):  # line 17
    mailer.send(order.email, "Cancelled")       # line 19

def total_cents(raw: str) -&gt; int:
    data = json.loads(raw)
    return data["total"]                        # line 24</pre>`,
        constraints: `<p>Python 3.12, mypy strict with the Pydantic plugin, SQLAlchemy 2.0 typed models. <code>Mailer.send</code> is <code>async</code>.</p>`,
        example: `<p>Each mypy error here is also a real bug: <code>cancel(db, 999)</code> would crash with <code>AttributeError</code> (a 500), <code>notify</code> never sends the email because the coroutine is not awaited, and <code>total_cents('{"total": "12"}')</code> returns a string despite the annotation.</p>`,
        brute: {
          why: `<p>The "make CI green" shortcut adds <code># type: ignore</code> on every line or annotates parameters as <code>Any</code>. mypy goes quiet and all three runtime bugs remain: the 500 on a missing order, the email that is never sent, and a string flowing into money arithmetic.</p>`,
          code: `from typing import Any


def cancel(db: Any, order_id: Any) -> Any:          # silenced, still crashes on None
    order = db.get(Order, order_id)
    order.status = "cancelled"
    db.commit()
    return order


async def notify(mailer: Any, order: Any) -> None:
    mailer.send(order.email, "Cancelled")             # type: ignore  (still not awaited)`
        },
        mcq: {
          q: 'mypy reports <code>Item "None" of "Order | None" has no attribute "status"</code>. What is the best fix in an endpoint helper?',
          options: ['<code># type: ignore[union-attr]</code>', '<code>cast(Order, order)</code>', 'Check <code>if order is None:</code> and raise a 404 (narrowing)', 'Annotate <code>order: Any</code>'],
          answer: 2,
          explain: 'The None case is real (an unknown id). Handling it both satisfies mypy through narrowing and turns a crash into a correct 404.'
        },
        hints: [
          'Hint 1: every mypy error here corresponds to a runtime bug; fix the bug and the error goes away.',
          'Hint 2: <code>Session.get</code> returns <code>Order | None</code>: narrow it with a None check that raises a domain error or <code>HTTPException(404)</code>. Add <code>-&gt; None</code> to the async function and <code>await</code> the call.',
          'Hint 3: <code>json.loads</code> returns <code>Any</code>; validate the payload with a small Pydantic model (or check <code>isinstance(..., int)</code>) so the return is really an <code>int</code>.'
        ],
        solution: {
          approach: `<p>Treat each error as a bug report. Annotate the parameters (<code>Session</code>, <code>int</code>) and return types. Narrow the optional result of <code>db.get</code> with an explicit check that raises a domain exception mapped to 404, so mypy knows <code>order</code> is an <code>Order</code> afterwards and missing ids no longer crash. Annotate <code>notify</code> as returning <code>None</code> and <code>await</code> the async send, which also makes the email actually go out. Replace the untyped dictionary access with a Pydantic model so the value is validated and typed as <code>int</code>; bad input now fails with a clear validation error instead of propagating a string.</p>`,
          code: `# app/orders.py — passes mypy --strict with no ignores
from typing import Protocol

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models import Order


class OrderNotFound(Exception):
    """Mapped to 404 by an exception handler in main.py."""


class Mailer(Protocol):
    async def send(self, to: str, subject: str) -> None: ...


def cancel(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)              # Order | None
    if order is None:
        raise OrderNotFound(order_id)            # narrowing: below this line order is Order
    order.status = "cancelled"
    db.commit()
    return order


async def notify(mailer: Mailer, order: Order) -> None:
    await mailer.send(order.email, "Cancelled")  # awaited: the email is really sent


class TotalPayload(BaseModel):
    total: int                                   # strict int; "12" is coerced, "abc" rejected


def total_cents(raw: str) -> int:
    return TotalPayload.model_validate_json(raw).total`,
          complexity: `<p>No runtime cost worth measuring; mypy's incremental cache keeps the CI check to seconds. The value is in three bugs fixed before production.</p>`,
          followUps: ['Pydantic in lax mode coerces <code>"12"</code> to 12: when would you use <code>strict=True</code> on the field?', 'How would you write a test that proves <code>notify</code> awaits the mailer (hint: <code>AsyncMock.assert_awaited_once_with</code>)?']
        },
        tests: { skip: 'type-checker exercise, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Make the Parametrized Email Table Pass',
    level: 'Easy',
    tags: ['parametrize', 'TDD', 'validation'],
    companies: ['Mailchimp', 'Shopify'],
    statement: `<p>The signup team wrote this parametrized test first (test-driven development) and now needs the function. Implement <code>normalize_email(raw)</code>: strip surrounding whitespace and lower-case it; return <code>""</code> (invalid) unless the result has <b>exactly one</b> <code>@</code>, a non-empty part before it, and a domain part that contains a dot that is not its first or last character.</p>
      <pre>@pytest.mark.parametrize(("raw", "expected"), [
    pytest.param("  Ann@Example.COM ", "ann@example.com", id="trim-and-lower"),
    pytest.param("bob@example", "", id="domain-without-dot"),
    pytest.param("@example.com", "", id="empty-local"),
    pytest.param("a@b@example.com", "", id="two-ats"),
    pytest.param("cy@.example.com", "", id="dot-first"),
])
def test_normalize_email(raw, expected):
    assert normalize_email(raw) == expected</pre>`,
    constraints: `<p>Input length ≤ 320 characters. No other validation (no unicode rules) is required.</p>`,
    example: `<p><code>"  Ann@Example.COM "</code> → ${H.c('g', '"ann@example.com"')}; <code>"bob@example"</code> → ${H.c('r', '""')} (domain has no dot).</p>`,
    brute: {
      why: `<p>A first attempt only lower-cases the input. It passes the first row and fails the four invalid rows: the table immediately shows which rule is missing, which is the point of parametrizing with readable ids.</p>`,
      code: `def normalize_email(raw):
    return raw.lower()          # ignores whitespace and every validity rule`
    },
    mcq: {
      q: 'One parametrized row fails. How does pytest report it?',
      options: ['The whole test fails with no detail', 'As its own test id, e.g. <code>test_normalize_email[two-ats]</code>', 'Only at the end of the run as a warning', 'It stops the remaining rows'],
      answer: 1,
      explain: 'Each row is a separate test item with its own id, so you see exactly which case broke and the other rows still run.'
    },
    hints: [
      'Hint 1: normalise first (<code>strip().lower()</code>), then validate the normalised string.',
      'Hint 2: <code>s.count("@") == 1</code> and <code>s.partition("@")</code> give the local part and the domain.',
      'Hint 3: the domain must contain a dot, and must not start or end with one.'
    ],
    solution: {
      approach: `<p>Normalise, then apply each rule from the table in turn and return early with <code>""</code> on the first failure. Every rule maps to one parametrized row, so the test table doubles as the specification.</p>`,
      code: `def normalize_email(raw):
    s = raw.strip().lower()
    if s.count("@") != 1:
        return ""
    local, _, domain = s.partition("@")
    if not local or "." not in domain:
        return ""
    if domain.startswith(".") or domain.endswith("."):
        return ""
    return s`,
      complexity: `<p>O(n) for an input of length n.</p>`
    },
    tests: { fn: 'normalizeEmail', sig: 'string -> string', cases: [
      [['  Ann@Example.COM '], 'ann@example.com'], [['bob@example'], ''], [['@example.com'], ''], [['a@b@example.com'], ''],
      [['cy@.example.com'], ''], [['dee@example.com.'], ''], [['x@y.z'], 'x@y.z'], [[''], '']
    ] }
  });

  practice.push({
    title: 'Write an In-Memory Fake Email Sender',
    level: 'Easy',
    tags: ['fakes', 'dependency_overrides', 'test doubles'],
    companies: ['Atlassian', 'Twilio'],
    statement: `<p>Endpoint tests must not send real emails. Write <code>FakeEmailSender</code>, a fake with the same <code>send(to, subject)</code> method as the real sender, which tests will install with <code>app.dependency_overrides[get_sender] = lambda: fake</code>. It records messages so tests can assert outcomes:</p>
      <ul><li><code>send(to, subject)</code>: record the message (addresses compared case-insensitively, stored lower-cased).</li>
      <li><code>sent_count() -&gt; int</code>, <code>last_to() -&gt; str</code> (<code>""</code> if none), <code>count_to(address) -&gt; int</code>, <code>clear()</code>.</li></ul>`,
    constraints: `<p>Up to 10<sup>4</sup> calls; addresses are non-empty strings.</p>`,
    example: `<p><code>send("Ann@x.test", "Welcome")</code>, <code>send("bob@x.test", "Reset")</code>, <code>count_to("ann@x.test")</code> → ${H.c('g', '1')}, <code>last_to()</code> → ${H.c('g', '"bob@x.test"')}.</p>`,
    brute: {
      why: `<p>Patching the real SMTP client with a bare <code>MagicMock</code> works, but every test then digs through <code>call_args_list</code> tuples, and a typo like <code>sned()</code> silently passes because MagicMock accepts any attribute. A small fake reads like the domain and fails loudly on wrong method names.</p>`,
      code: `from unittest.mock import MagicMock

sender = MagicMock()
sender.send("ann@x.test", "Welcome")
assert sender.send.call_args_list[0].args[0] == "ann@x.test"   # brittle and hard to read`
    },
    mcq: {
      q: 'Why is a fake often better than a mock for an email sender in endpoint tests?',
      options: ['Fakes are faster to import', 'Tests assert on outcomes ("one email to Ann") instead of call details, and the fake fails on unknown methods', 'Mocks cannot be used with FastAPI', 'Fakes send real email in a sandbox'],
      answer: 1,
      explain: 'A fake models the behaviour you care about with a small, explicit API; tests stay readable and survive refactors that change call details.'
    },
    hints: [
      'Hint 1: store a list of <code>(to, subject)</code> tuples.',
      'Hint 2: lower-case the address when storing and when counting.',
      'Hint 3: <code>last_to</code> reads the last tuple or returns <code>""</code>; <code>clear</code> empties the list.'
    ],
    solution: {
      approach: `<p>A list of sent messages is the whole state. Query methods express what tests want to know. Normalising addresses on the way in keeps assertions simple and mirrors how a real provider treats addresses.</p>`,
      code: `class FakeEmailSender:
    def __init__(self):
        self.outbox = []                       # (to, subject) in send order

    def send(self, to, subject):
        self.outbox.append((to.lower(), subject))

    def sent_count(self):
        return len(self.outbox)

    def last_to(self):
        return self.outbox[-1][0] if self.outbox else ""

    def count_to(self, address):
        target = address.lower()
        return sum(1 for to, _ in self.outbox if to == target)

    def clear(self):
        self.outbox.clear()`,
      complexity: `<p><code>send</code>, <code>last_to</code>, <code>sent_count</code> O(1); <code>count_to</code> O(n).</p>`
    },
    tests: { cls: 'FakeEmailSender', sigs: { FakeEmailSender: '', send: 'string string -> void', sent_count: '-> int', last_to: '-> string', count_to: 'string -> int', clear: '-> void' }, cases: [
      { ops: ['FakeEmailSender', 'send', 'send', 'count_to', 'last_to', 'sent_count'], args: [[], ['Ann@x.test', 'Welcome'], ['bob@x.test', 'Reset'], ['ann@x.test'], [], []], out: [null, null, null, 1, 'bob@x.test', 2] },
      { ops: ['FakeEmailSender', 'last_to', 'sent_count'], args: [[], [], []], out: [null, '', 0] },
      { ops: ['FakeEmailSender', 'send', 'send', 'count_to'], args: [[], ['A@x.test', 's'], ['a@X.TEST', 's'], ['A@X.test']], out: [null, null, null, 2] },
      { ops: ['FakeEmailSender', 'send', 'clear', 'sent_count', 'last_to'], args: [[], ['a@x.test', 's'], [], [], []], out: [null, null, null, 0, ''] },
      { ops: ['FakeEmailSender', 'send', 'count_to'], args: [[], ['a@x.test', 's'], ['b@x.test']], out: [null, null, 0] },
      { ops: ['FakeEmailSender', 'send', 'send', 'send', 'last_to'], args: [[], ['a@x.test', '1'], ['b@x.test', '2'], ['C@x.test', '3'], []], out: [null, null, null, null, 'c@x.test'] }
    ] }
  });

  practice.push({
    title: 'Override Settings in Tests Without Touching the Real Environment',
    level: 'Easy',
    tags: ['settings', 'monkeypatch', 'dependency_overrides', 'secrets'],
    companies: ['GitHub', 'Revolut'],
    statement: `<p>The app reads configuration with pydantic-settings through a cached dependency:</p>
      <pre>class Settings(BaseSettings):
    database_url: str
    payments_api_key: SecretStr
    signup_enabled: bool = True

@lru_cache
def get_settings() -&gt; Settings:
    return Settings()</pre>
      <p>A test must check that <code>POST /signup</code> returns <b>403</b> when signups are disabled, and another that it works when enabled. Today the tests fail on laptops without a <code>.env</code> file, and once a developer's real API key was printed in a CI log. Write the fixtures and the two tests so no real environment value or secret is ever read and nothing leaks between tests.</p>`,
    constraints: `<p>pytest, FastAPI <code>TestClient</code>. No real <code>.env</code> file; tests may run in any order and in parallel.</p>`,
    example: `<p>With <code>signup_enabled=False</code> → ${H.c('r', '403')}; with the default → ${H.c('g', '201')}. Running the disabled test first must not make the enabled test fail.</p>`,
    brute: {
      why: `<p>Setting <code>os.environ["SIGNUP_ENABLED"] = "false"</code> inside a test changes the process environment for every later test, and because <code>get_settings</code> is cached, whichever test runs first decides the value for the rest of the run. It also still reads the developer's real <code>PAYMENTS_API_KEY</code> if present.</p>`,
      code: `import os


def test_signup_disabled(client):
    os.environ["SIGNUP_ENABLED"] = "false"       # leaks into every later test
    assert client.post("/signup", json={}).status_code == 403`
    },
    mcq: {
      q: 'Why does changing an environment variable inside a test often have no effect on the app?',
      options: ['FastAPI ignores env vars', 'The settings object is cached (<code>@lru_cache</code>) and was built before the change', 'pytest blocks env changes', 'Env vars only apply after a restart of Python'],
      answer: 1,
      explain: 'The cached Settings instance was created on first use. Either clear the cache after <code>monkeypatch.setenv</code>, or override the <code>get_settings</code> dependency directly.'
    },
    hints: [
      'Hint 1: build a <code>Settings</code> object in the test with fake values, passing fields directly (and <code>_env_file=None</code> so no .env is read).',
      'Hint 2: install it with <code>app.dependency_overrides[get_settings] = lambda: settings</code> in a fixture that clears overrides after <code>yield</code>.',
      'Hint 3: a factory fixture (a function returning a client for given overrides) lets each test choose its own settings cleanly.'
    ],
    solution: {
      approach: `<p>Never let tests read the real environment. Build <code>Settings</code> explicitly with fake values (and no env file), and inject it through <code>dependency_overrides</code> so the cache is irrelevant. A factory fixture yields clients configured per test and always clears overrides; an autouse fixture removes sensitive environment variables as a safety net. Each test states the setting it depends on, so order and parallelism do not matter.</p>`,
      code: `# tests/conftest.py
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.main import create_app


def make_settings(**overrides: Any) -> Settings:
    values: dict[str, Any] = {
        "database_url": "sqlite://",                       # not used by these tests
        "payments_api_key": SecretStr("test-only-key"),    # fake, safe to commit
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)             # never read a .env file


@pytest.fixture(autouse=True)
def _scrub_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("PAYMENTS_API_KEY", "DATABASE_URL", "SIGNUP_ENABLED"):
        monkeypatch.delenv(name, raising=False)
    get_settings.cache_clear()


@pytest.fixture
def client_with() -> Iterator[Callable[..., TestClient]]:
    apps = []

    def build(**overrides: Any) -> TestClient:
        app = create_app()
        settings = make_settings(**overrides)
        app.dependency_overrides[get_settings] = lambda: settings
        apps.append(app)
        return TestClient(app)

    yield build
    for app in apps:
        app.dependency_overrides.clear()


SIGNUP = {"email": "ann@example.test", "password": "long enough pw 123"}


def test_signup_disabled_is_403(client_with) -> None:
    client = client_with(signup_enabled=False)
    assert client.post("/signup", json=SIGNUP).status_code == 403


def test_signup_enabled_by_default(client_with) -> None:
    client = client_with()
    assert client.post("/signup", json=SIGNUP).status_code == 201`,
      complexity: `<p>Two fast tests, independent of order, environment and parallel workers.</p>`
    },
    tests: { skip: 'test-suite wiring, verified by reading' }
  });

  practice.push({
    title: 'Test 401 vs 403 With Dependency Overrides',
    level: 'Easy',
    tags: ['auth', 'dependency_overrides', 'TestClient'],
    companies: ['Okta', 'Auth0'],
    statement: `<p><code>DELETE /projects/{id}</code> depends on <code>get_current_user</code> (raises 401 with <code>WWW-Authenticate: Bearer</code> when the token is missing) and then requires the <code>admin</code> role (403 otherwise). Write tests for: no token → 401 with the header; a member → 403; an admin → 204. Do not create real JWTs in these tests: Python Backend III already tested token decoding.</p>`,
    constraints: `<p>pytest + TestClient; use <code>dependency_overrides</code>; overrides must be cleared after every test.</p>`,
    example: `<p>Override <code>get_current_user</code> to return <code>User(role="member")</code> → ${H.c('r', '403')}; <code>User(role="admin")</code> → ${H.c('g', '204')}.</p>`,
    brute: {
      why: `<p>Generating real tokens with the production secret in every endpoint test couples all API tests to the token format, needs a secret in the test environment, and re-tests JWT decoding hundreds of times. Overriding the user dependency tests the endpoint's authorization logic directly.</p>`,
      code: `import jwt, os


def test_delete_as_admin(client):
    token = jwt.encode({"sub": "1", "role": "admin"}, os.environ["JWT_SECRET"], "HS256")  # real secret!
    assert client.delete("/projects/1", headers={"Authorization": f"Bearer {token}"}).status_code == 204`
    },
    mcq: {
      q: 'Which response should a request without any token get?',
      options: ['403 Forbidden', '401 Unauthorized with a <code>WWW-Authenticate</code> header', '404', '400'],
      answer: 1,
      explain: '401 means "who are you?" (no or bad credentials) and must carry the challenge header; 403 means "I know you, but you may not".'
    },
    hints: [
      'Hint 1: for the 401 case, do <b>not</b> override <code>get_current_user</code>: let the real dependency reject the missing header.',
      'Hint 2: for 403 and 204, override it with a lambda returning a user with the right role.',
      'Hint 3: parametrize role → expected status, and use a fixture that clears overrides after <code>yield</code>.'
    ],
    solution: {
      approach: `<p>Test authentication and authorization separately. The missing-token case uses the real dependency so the 401 and its header are genuine. Role cases override the user dependency with fixed users, parametrized by role and expected status. A fixture owns the app and clears overrides afterwards, so nothing leaks.</p>`,
      code: `from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth import User, get_current_user
from app.main import create_app


@pytest.fixture
def app() -> Iterator[FastAPI]:
    application = create_app()
    yield application
    application.dependency_overrides.clear()


def test_no_token_is_401(app: FastAPI) -> None:
    with TestClient(app) as c:
        r = c.delete("/projects/1")
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize(("role", "status"), [("member", 403), ("viewer", 403), ("admin", 204)])
def test_delete_by_role(app: FastAPI, role: str, status: int) -> None:
    app.dependency_overrides[get_current_user] = lambda: User(id=7, email="u@example.test", role=role)
    with TestClient(app) as c:
        assert c.delete("/projects/1").status_code == status`,
      complexity: `<p>Four fast tests, no secrets, no token generation.</p>`
    },
    tests: { skip: 'test-suite wiring, verified by reading' }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Mock an Email Provider with pytest-httpx: Retry 5xx, Never Retry 4xx',
    level: 'Medium',
    tags: ['pytest-httpx', 'mocking', 'retries'],
    companies: ['SendGrid', 'Postmark'],
    statement: `<p><code>EmailClient.send(to, subject, html)</code> posts to <code>https://mail.example.test/v3/send</code> using an injected <code>httpx.AsyncClient</code>. It retries up to 3 attempts on 5xx and timeouts with an injected async <code>sleep</code>, raises <code>EmailRejected</code> on 4xx without retrying, and sends the API key from settings in an <code>Authorization</code> header. Write the tests with <b>pytest-httpx</b>: success first time; 503 then 202; a read timeout three times (gives up); a 400 (exactly one request). Also assert the request body and that the header carries the test key.</p>`,
    constraints: `<p>pytest-asyncio in auto mode, pytest-httpx's <code>httpx_mock</code> fixture; no real network; no real sleeping.</p>`,
    example: `<p>Responses <code>[503, 202]</code> → send succeeds, 2 requests recorded, one recorded sleep. Response <code>[400]</code> → <code>EmailRejected</code>, ${H.c('g', '1 request')}.</p>`,
    brute: {
      why: `<p>Patching <code>httpx.AsyncClient.post</code> with a MagicMock returns a non-awaitable value, ignores headers and URL, and never exercises the real request building. HTTP-level mocking checks the exact request your client produces.</p>`,
      code: `from unittest.mock import patch


async def test_send(client):
    with patch("httpx.AsyncClient.post") as post:          # wrong layer, not awaited properly
        post.return_value.status_code = 202
        await client.send("a@example.test", "Hi", "<p>Hi</p>")`
    },
    mcq: {
      q: 'In pytest-httpx, what happens if you register a response that your code never requests?',
      options: ['Nothing', 'The test fails at teardown because not all registered responses were requested (default behaviour)', 'pytest-httpx sends it anyway', 'A warning is logged'],
      answer: 1,
      explain: 'By default the fixture asserts all registered responses were used, catching tests that silently stopped exercising a path.'
    },
    hints: [
      'Hint 1: register responses in the order they should be returned; each one is consumed by a matching request.',
      'Hint 2: <code>httpx_mock.add_exception(httpx.ReadTimeout("slow"))</code> simulates a timeout.',
      'Hint 3: <code>httpx_mock.get_requests()</code> returns the recorded requests: check URL, JSON body and headers.'
    ],
    solution: {
      approach: `<p>Build the client in a fixture with a fake API key and a recording sleep. Each test scripts the provider with <code>add_response</code>/<code>add_exception</code> in order, calls <code>send</code>, and asserts outcome, number of requests, recorded sleeps and request contents. pytest-httpx's strictness (unexpected or unused responses fail) keeps the scripts honest.</p>`,
      code: `import json
from collections.abc import AsyncIterator

import httpx
import pytest
from pytest_httpx import HTTPXMock

from app.email import EmailClient, EmailRejected, EmailUnavailable

URL = "https://mail.example.test/v3/send"


class RecordingSleep:
    def __init__(self) -> None:
        self.calls: list[float] = []

    async def __call__(self, s: float) -> None:
        self.calls.append(s)


@pytest.fixture
def sleep() -> RecordingSleep:
    return RecordingSleep()


@pytest.fixture
async def client(sleep: RecordingSleep) -> AsyncIterator[EmailClient]:
    async with httpx.AsyncClient() as http:
        yield EmailClient(http, api_key="test-mail-key", base_url="https://mail.example.test",
                          max_attempts=3, sleep=sleep)


async def test_success_sends_expected_request(httpx_mock: HTTPXMock, client: EmailClient) -> None:
    httpx_mock.add_response(url=URL, method="POST", status_code=202)
    await client.send("ann@example.test", "Welcome", "<p>Hi</p>")
    (req,) = httpx_mock.get_requests()
    assert req.headers["Authorization"] == "Bearer test-mail-key"
    assert json.loads(req.content) == {"to": "ann@example.test", "subject": "Welcome", "html": "<p>Hi</p>"}


async def test_retries_503(httpx_mock: HTTPXMock, client: EmailClient, sleep: RecordingSleep) -> None:
    httpx_mock.add_response(url=URL, method="POST", status_code=503)
    httpx_mock.add_response(url=URL, method="POST", status_code=202)
    await client.send("ann@example.test", "Welcome", "<p>Hi</p>")
    assert len(httpx_mock.get_requests()) == 2
    assert len(sleep.calls) == 1


async def test_gives_up_after_timeouts(httpx_mock: HTTPXMock, client: EmailClient) -> None:
    for _ in range(3):
        httpx_mock.add_exception(httpx.ReadTimeout("slow"), url=URL, method="POST")
    with pytest.raises(EmailUnavailable):
        await client.send("ann@example.test", "Welcome", "<p>Hi</p>")
    assert len(httpx_mock.get_requests()) == 3


async def test_400_not_retried(httpx_mock: HTTPXMock, client: EmailClient, sleep: RecordingSleep) -> None:
    httpx_mock.add_response(url=URL, method="POST", status_code=400, json={"error": "bad address"})
    with pytest.raises(EmailRejected):
        await client.send("not-an-address", "Welcome", "<p>Hi</p>")
    assert len(httpx_mock.get_requests()) == 1
    assert sleep.calls == []`,
      complexity: `<p>Four tests, milliseconds each, no network and no waiting.</p>`
    },
    tests: { skip: 'test-suite wiring, verified by reading' }
  });

  practice.push({
    title: 'Find the Polluting Test',
    level: 'Medium',
    tags: ['flaky tests', 'test ordering', 'shared state'],
    companies: ['Google', 'Spotify'],
    statement: `<p>A test fails only in the full suite. You have instrumented which shared state each test writes and reads (module-level caches, <code>app.dependency_overrides</code>, environment variables). Write <code>find_polluters(tests, victim)</code>. Each test is <code>"name|writes|reads"</code> where writes and reads are comma-separated keys (possibly empty). Tests run in the given order. For each key the victim reads, the culprit is the <b>last</b> test before the victim that wrote that key. Return the distinct culprits in run order. If the victim is not in the list, return an empty list.</p>`,
    constraints: `<p>Up to 10<sup>4</sup> tests and 10 keys per test; names are unique.</p>`,
    example: `<p><code>["a|cache|", "b|env|", "c|cache|", "victim||cache,env"]</code> → ${H.c('r', '["b", "c"]')}</p>
      <p>Why: <code>c</code> wrote <code>cache</code> last (overwriting <code>a</code>), <code>b</code> wrote <code>env</code>; in run order that is b, then c.</p>`,
    brute: {
      why: `<p>Re-running the suite with every subset of earlier tests to see which combination breaks the victim costs 2<sup>n</sup> runs. Even bisection needs log n full runs of slow tests; with recorded reads/writes a single pass answers it.</p>`,
      code: `def find_polluters_naive(tests, victim):
    # every earlier test that wrote ANY key: lots of false suspects
    out = []
    for t in tests:
        name, writes, _ = t.split("|")
        if name == victim:
            return out
        if writes:
            out.append(name)
    return []`
    },
    mcq: {
      q: 'Which tool helps you discover order-dependent tests in the first place?',
      options: ['pytest-randomly (random test order with a replayable seed)', 'pytest --lf', 'coverage', 'mypy'],
      answer: 0,
      explain: 'Shuffling the order exposes hidden dependencies; the printed seed lets you replay the failing order exactly.'
    },
    hints: [
      'Hint 1: walk the tests in order and keep a dict <code>last_writer[key] = name</code>.',
      'Hint 2: when you reach the victim, look up each key it reads.',
      'Hint 3: collect the culprits, deduplicate, and sort by their position in the run.'
    ],
    solution: {
      approach: `<p>One pass simulates the run, remembering the last writer of every key and each test's position. At the victim, map each read key to its last writer (if any), deduplicate and order by position. This is what pollution-detection tools do after recording state access; without instrumentation they bisect by re-running.</p>`,
      code: `def find_polluters(tests, victim):
    last_writer = {}
    position = {}
    for i, t in enumerate(tests):
        name, writes, reads = t.split("|")
        position[name] = i
        if name == victim:
            culprits = {last_writer[k] for k in reads.split(",") if k and k in last_writer}
            return sorted(culprits, key=position.get)
        for k in writes.split(","):
            if k:
                last_writer[k] = name
    return []`,
      complexity: `<p>O(total keys) time and O(distinct keys + tests) space.</p>`
    },
    tests: { fn: 'findPolluters', sig: 'string[] string -> string[]', cases: [
      [[['a|cache|', 'b|env|', 'c|cache|', 'victim||cache,env'], 'victim'], ['b', 'c']],
      [[['a|x|', 'v||y'], 'v'], []],
      [[['a|x|', 'b||x'], 'zzz'], []],
      [[['v||x', 'a|x|'], 'v'], []],
      [[['a|x,y|', 'b|z|', 'v||x,y,z'], 'v'], ['a', 'b']],
      [[['a|k|', 'b|k|', 'c|k|', 'v||k'], 'v'], ['c']],
      [[['a|k|k', 'v|k|k'], 'v'], ['a']]
    ] }
  });

  practice.push({
    title: 'Detect Breaking Changes Between Two Response Models',
    level: 'Medium',
    tags: ['contract tests', 'OpenAPI', 'API evolution'],
    companies: ['Stripe', 'Twilio'],
    statement: `<p>CI compares the response model of an endpoint before and after a pull request. Each field is <code>"name:type:required"</code> or <code>"name:type:optional"</code>. Write <code>breaking_changes(old, new)</code> returning messages in the order of the <b>old</b> fields:</p>
      <ul><li>field missing in new → <code>"removed NAME"</code></li>
      <li>type differs → <code>"type NAME OLD->NEW"</code></li>
      <li>required in old but optional in new → <code>"now optional NAME"</code> (clients relied on it being present)</li></ul>
      <p>New fields and optional → required changes are safe for a <b>response</b> and produce nothing.</p>`,
    constraints: `<p>Up to 500 fields; names are unique within a model.</p>`,
    example: `<p>old <code>["id:int:required", "owner_id:int:required", "title:str:required"]</code>, new <code>["id:str:required", "title:str:optional", "user_id:int:required"]</code> → ${H.c('r', '["type id int->str", "removed owner_id", "now optional title"]')}</p>`,
    brute: {
      why: `<p>Comparing the two JSON documents for equality flags every change, including harmless additions, so the check is either ignored or disabled. You need rules for what breaks a client.</p>`,
      code: `def breaking_changes_naive(old, new):
    return [] if old == new else ["something changed"]`
    },
    mcq: {
      q: 'For a <b>response</b> model, which change is safe for existing clients?',
      options: ['Removing a field', 'Changing <code>id</code> from integer to string', 'Adding a new optional field', 'Making a required field optional'],
      answer: 2,
      explain: 'Well-behaved clients ignore unknown fields. Every other change can break code that reads the old field or relies on it being present.'
    },
    hints: [
      'Hint 1: parse the new model into a dict <code>name → (type, required)</code>.',
      'Hint 2: iterate the old fields in order and compare against the dict.',
      'Hint 3: check removal first, then type, then required → optional.'
    ],
    solution: {
      approach: `<p>Index the new model by field name, then walk the old model in order and apply the response-compatibility rules. Additions never appear because only old fields are examined. For request models the rules flip (a new required field breaks clients), which is why tools like oasdiff know the direction of each schema.</p>`,
      code: `def breaking_changes(old, new):
    new_fields = {}
    for f in new:
        name, typ, req = f.split(":")
        new_fields[name] = (typ, req)
    out = []
    for f in old:
        name, typ, req = f.split(":")
        if name not in new_fields:
            out.append(f"removed {name}")
            continue
        new_typ, new_req = new_fields[name]
        if new_typ != typ:
            out.append(f"type {name} {typ}->{new_typ}")
        elif req == "required" and new_req == "optional":
            out.append(f"now optional {name}")
    return out`,
      complexity: `<p>O(n + m) for the two field lists.</p>`
    },
    tests: { fn: 'breakingChanges', sig: 'string[] string[] -> string[]', cases: [
      [[['id:int:required', 'owner_id:int:required', 'title:str:required'], ['id:str:required', 'title:str:optional', 'user_id:int:required']], ['type id int->str', 'removed owner_id', 'now optional title']],
      [[['id:int:required'], ['id:int:required', 'tags:list:optional']], []],
      [[[], ['a:int:required']], []],
      [[['a:int:optional'], ['a:int:required']], []],
      [[['a:int:required'], []], ['removed a']],
      [[['a:int:required', 'b:str:optional'], ['b:int:optional', 'a:int:required']], ['type b str->int']]
    ] }
  });

  practice.push({
    title: 'Compute a Branch Coverage Report',
    level: 'Medium',
    tags: ['coverage', 'branch coverage'],
    companies: ['Datadog', 'Codecov'],
    statement: `<p>Coverage tools record <b>arcs</b> (jumps between line numbers) and compare them with the arcs the code can take. Write <code>branch_report(possible, executed)</code>. Arcs are strings <code>"A>B"</code>. Return a list whose first element is <code>"branches X/Y (P%)"</code>, where Y is the number of distinct possible arcs, X how many of them were executed, P = ⌊100·X/Y⌋ (100 when Y = 0); followed by <code>"missing A>B"</code> for each possible arc never executed, in the order of <code>possible</code>. Executed arcs that are not in <code>possible</code> are ignored.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> arcs. <code>possible</code> may contain duplicates (count once, report once).</p>`,
    example: `<p>possible <code>["1>2", "1>4", "4>5", "4>6"]</code>, executed <code>["1>2", "2>4", "4>6"]</code> → ${H.c('g', '["branches 2/4 (50%)", "missing 1>4", "missing 4>5"]')}</p>`,
    brute: {
      why: `<p>Counting executed lines only (line coverage) would report every line hit and miss that the "skip the if body" jumps never happened. Scanning the executed list for every possible arc is also O(n·m).</p>`,
      code: `def branch_report_naive(possible, executed):
    hit = sum(1 for p in possible if p in executed)    # O(n*m) and double-counts duplicates
    return [f"branches {hit}/{len(possible)}"]`
    },
    mcq: {
      q: 'All lines of a function ran but branch coverage is 75%. What does that mean?',
      options: ['A tool bug', 'Some condition was only ever evaluated one way (e.g. an <code>if</code> that was always true)', 'Some lines are dead code', 'Tests are flaky'],
      answer: 1,
      explain: 'Branch coverage tracks both outcomes of each decision. An if without else whose condition is always true runs every line but never takes the "skip" arc.'
    },
    hints: [
      'Hint 1: put executed arcs in a set for O(1) lookups.',
      'Hint 2: deduplicate possible arcs while keeping their order (a dict or a seen-set).',
      'Hint 3: integer division gives the floor; guard Y = 0.'
    ],
    solution: {
      approach: `<p>Deduplicate the possible arcs preserving order, put executed arcs in a set, and count the intersection. Missing arcs are the possible ones not in the set, already in report order. This is exactly the comparison coverage.py makes between statically allowed arcs and recorded ones.</p>`,
      code: `def branch_report(possible, executed):
    arcs = list(dict.fromkeys(possible))       # dedupe, keep order
    seen = set(executed)
    hit = [a for a in arcs if a in seen]
    total = len(arcs)
    pct = 100 if total == 0 else 100 * len(hit) // total
    report = [f"branches {len(hit)}/{total} ({pct}%)"]
    report += [f"missing {a}" for a in arcs if a not in seen]
    return report`,
      complexity: `<p>O(n + m) time and space.</p>`
    },
    tests: { fn: 'branchReport', sig: 'string[] string[] -> string[]', cases: [
      [[['1>2', '1>4', '4>5', '4>6'], ['1>2', '2>4', '4>6']], ['branches 2/4 (50%)', 'missing 1>4', 'missing 4>5']],
      [[[], ['1>2']], ['branches 0/0 (100%)']],
      [[['1>2', '1>3', '3>4'], ['1>2', '1>3', '3>4']], ['branches 3/3 (100%)']],
      [[['1>2', '1>2', '1>3'], []], ['branches 0/2 (0%)', 'missing 1>2', 'missing 1>3']],
      [[['1>2', '1>3', '5>6'], ['1>3']], ['branches 1/3 (33%)', 'missing 1>2', 'missing 5>6']],
      [[['2>3', '2>9'], ['2>3', '2>3', '9>2']], ['branches 1/2 (50%)', 'missing 2>9']]
    ] }
  });

  practice.push({
    title: 'Write a Hypothesis Property Test for Keyset Pagination',
    level: 'Medium',
    tags: ['hypothesis', 'property-based testing', 'pagination'],
    companies: ['Slack', 'Notion'],
    statement: `<p><code>GET /notes?limit=N&amp;after=CURSOR</code> uses keyset pagination ordered by <code>(created_at, id)</code> (Python Backend II). A customer reported a note that appeared on two pages and another that never appeared, but only when several notes share the same <code>created_at</code>. Write property tests that would have caught this: for any set of notes (with many duplicate timestamps) and any page size, walking all pages returns every note exactly once, in order, with no page longer than the limit, and the last page has no next cursor.</p>`,
    constraints: `<p>Hypothesis, pytest; the repository function under test is <code>list_page(notes, limit, after) -&gt; (items, next_cursor)</code> working on in-memory data so hundreds of examples run fast. Keep the database version for a smaller example budget in the integration suite.</p>`,
    example: `<p>Notes with timestamps <code>[t1, t1, t1, t2]</code> and limit 2: pages must be <code>[n1, n2]</code>, <code>[n3, n4]</code>. A cursor that stores only <code>created_at</code> (not the id) returns <code>[n1, n2]</code>, then skips n3: ${H.c('r', 'lost item')}.</p>`,
    brute: {
      why: `<p>The example-based test inserts three notes with distinct timestamps and checks page one. Every note has a unique timestamp, so the tie-breaking bug never triggers. Property tests generate duplicate timestamps on purpose because the strategy draws timestamps from a tiny set.</p>`,
      code: `def test_first_page(repo):
    for i in range(3):
        repo.add(title=f"n{i}", created_at=datetime(2026, 1, 1, 0, 0, i))   # all distinct
    items, cursor = list_page(repo.all(), limit=2, after=None)
    assert len(items) == 2`
    },
    mcq: {
      q: 'Why draw timestamps from a small set (e.g. 3 possible values) instead of any datetime?',
      options: ['Speed', 'To force many ties, which is where keyset tie-breaking bugs live', 'Hypothesis cannot generate datetimes', 'To make shrinking impossible'],
      answer: 1,
      explain: 'Random datetimes almost never collide; a tiny domain makes duplicates the common case, so the property explores the dangerous region.'
    },
    hints: [
      'Hint 1: strategy: lists of <code>(created_at, id)</code> with ids unique and created_at from <code>st.sampled_from([...3 values...])</code>.',
      'Hint 2: walk pages in a loop until the cursor is <code>None</code>, with a guard on the number of pages to catch infinite loops.',
      'Hint 3: properties: concatenation equals the fully sorted list; every page length ≤ limit and ≥ 1 unless the dataset is empty.'
    ],
    solution: {
      approach: `<p>Generate notes whose timestamps collide often, sort them as the reference ordering (the oracle), and walk the paginator until it reports no next cursor. Assert the walk equals the oracle (nothing lost, nothing duplicated, correct order), each page respects the limit, and the walk terminates within a bound. Hypothesis shrinks any failure to something like three notes sharing a timestamp and limit 2, which points straight at the cursor missing the id tie-breaker.</p>`,
      code: `from datetime import UTC, datetime

from hypothesis import given, settings
from hypothesis import strategies as st

from app.pagination import Note, list_page

TIMES = [datetime(2026, 1, 1, tzinfo=UTC), datetime(2026, 1, 2, tzinfo=UTC), datetime(2026, 1, 3, tzinfo=UTC)]

notes_strategy = st.lists(
    st.builds(Note, id=st.integers(min_value=1, max_value=10_000), created_at=st.sampled_from(TIMES)),
    unique_by=lambda n: n.id,          # ids are unique, timestamps collide a lot
    max_size=40,
)


@settings(max_examples=300)
@given(notes=notes_strategy, limit=st.integers(min_value=1, max_value=7))
def test_walking_all_pages_returns_each_note_once(notes: list[Note], limit: int) -> None:
    expected = sorted(notes, key=lambda n: (n.created_at, n.id))
    seen: list[Note] = []
    cursor = None
    for _ in range(len(notes) + 2):                 # guard: must terminate
        items, cursor = list_page(notes, limit=limit, after=cursor)
        assert len(items) <= limit
        assert items or not notes                    # no empty pages mid-walk
        seen.extend(items)
        if cursor is None:
            break
    else:
        raise AssertionError("pagination did not terminate")
    assert [n.id for n in seen] == [n.id for n in expected]`,
      complexity: `<p>Each example is O(n log n) for n ≤ 40 notes; 300 examples run in well under a second in memory.</p>`
    },
    tests: { skip: 'Hypothesis test code, verified by reading' }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Find the Bug the Test Suite Misses (and Pin It With Boundary Tests)',
    level: 'Hard',
    tags: ['mutation testing', 'boundaries', 'coverage'],
    companies: ['Amazon', 'Zalando'],
    statement: `<p>Pricing has 100% line and branch coverage, yet support reports wrong totals. The rules from the product spec: code <code>SAVE10</code> gives 10% off (discount rounded <b>down</b> to whole cents) for totals of <b>10000 cents or more</b>; <code>FIXED5</code> takes 500 cents off but the total never goes below 0; any other code (including <code>""</code>) changes nothing; codes are case-insensitive. The current code and its passing tests:</p>
      <pre>def apply_discount(total_cents, code):
    if code == "SAVE10" and total_cents &gt; 10000:
        return round(total_cents * 0.9)
    if code == "FIXED5":
        return total_cents - 500
    return total_cents

def test_save10():   assert apply_discount(20000, "SAVE10") == 18000
def test_small():    assert apply_discount(5000, "SAVE10") == 5000
def test_fixed5():   assert apply_discount(2000, "FIXED5") == 1500
def test_other():    assert apply_discount(2000, "NOPE") == 2000</pre>
      <p>Find every bug, write the tests that expose them, and implement the corrected <code>apply_discount(total_cents, code)</code>.</p>`,
    constraints: `<p>0 ≤ total_cents ≤ 10<sup>9</sup>. Integer cents only: no floats in money arithmetic.</p>`,
    example: `<p><code>apply_discount(10000, "SAVE10")</code> → ${H.c('g', '9000')} (the buggy code returns 10000). <code>apply_discount(300, "FIXED5")</code> → ${H.c('g', '0')} (buggy: −200). <code>apply_discount(10005, "SAVE10")</code> → ${H.c('g', '9005')} (discount 1000.5 rounds down to 1000; buggy <code>round(9004.5)</code> gives 9004). <code>apply_discount(20000, "save10")</code> → ${H.c('g', '18000')}.</p>`,
    brute: {
      why: `<p>The existing tests use "comfortable" values far from every boundary: 20000 and 5000 never touch the 10000 threshold, 2000 never makes FIXED5 go negative, no test has odd cents, and none uses lower case. Coverage is 100% because every line runs; mutation testing would show that <code>&gt;</code> → <code>&gt;=</code> and removing the floor at zero both survive.</p>`,
      code: `def apply_discount(total_cents, code):
    if code == "SAVE10" and total_cents > 10000:      # boundary wrong
        return round(total_cents * 0.9)                 # float + banker's rounding
    if code == "FIXED5":
        return total_cents - 500                        # can go negative
    return total_cents                                  # case-sensitive codes`
    },
    mcq: {
      q: 'Which technique most directly tells you that the suite would not notice changing <code>&gt;</code> to <code>&gt;=</code>?',
      options: ['Line coverage', 'Branch coverage', 'Mutation testing', 'mypy'],
      answer: 2,
      explain: 'A mutation tool makes exactly that change and reruns the tests; if all still pass, the mutant survives and you know a boundary test is missing.'
    },
    hints: [
      'Hint 1: list every boundary in the spec: the threshold itself (9999, 10000, 10001), totals under 500, odd cents, and code casing.',
      'Hint 2: <code>round()</code> on floats uses banker\'s rounding and binary floats; compute the discount with integers: <code>total * 10 // 100</code>.',
      'Hint 3: normalise the code with <code>.upper()</code>, use <code>&gt;=</code>, and <code>max(0, total - 500)</code>.'
    ],
    solution: {
      approach: `<p>Derive tests from the spec's boundaries rather than from the code: exactly 10000, one cent below and above, a total smaller than the fixed discount, an amount whose 10% has a half cent, and a lower-case code. Each exposes one bug: the strict comparison, the negative total, float rounding (Python's <code>round</code> rounds half to even, and floats cannot represent every cent value exactly), and case-sensitivity. The fix uses integer arithmetic for money, the inclusive threshold, a floor at zero and a normalised code. A parametrized table with ids keeps all boundaries visible, and a mutation run confirms no mutant survives.</p>
        <p>The regression tests that pin every bug:</p><pre># tests/unit/test_pricing.py
import pytest


@pytest.mark.parametrize(("total", "code", "expected"), [
    pytest.param(9999, "SAVE10", 9999, id="just-below-threshold"),
    pytest.param(10000, "SAVE10", 9000, id="exactly-threshold"),
    pytest.param(10001, "SAVE10", 9001, id="just-above"),
    pytest.param(10005, "SAVE10", 9005, id="half-cent-rounds-down"),
    pytest.param(20000, "save10", 18000, id="lower-case-code"),
    pytest.param(300, "FIXED5", 0, id="fixed-never-negative"),
    pytest.param(500, "FIXED5", 0, id="fixed-exact"),
    pytest.param(2000, "", 2000, id="no-code"),
])
def test_apply_discount(total: int, code: str, expected: int) -&gt; None:
    assert apply_discount(total, code) == expected</pre>`,
      code: `def apply_discount(total_cents, code):
    code = code.strip().upper()
    if code == "SAVE10" and total_cents >= 10000:
        discount = total_cents * 10 // 100          # integer cents, rounded down
        return total_cents - discount
    if code == "FIXED5":
        return max(0, total_cents - 500)            # never negative
    return total_cents`,
      complexity: `<p>O(1) per call. The test table is eight rows that run in microseconds.</p>`,
      followUps: ['Write a Hypothesis property that would have caught the negative total without knowing the bug.', 'How would you run mutmut only on <code>pricing.py</code> in CI?']
    },
    tests: { fn: 'applyDiscount', sig: 'int string -> int', cases: [
      [[9999, 'SAVE10'], 9999], [[10000, 'SAVE10'], 9000], [[10001, 'SAVE10'], 9001], [[10005, 'SAVE10'], 9005],
      [[20000, 'save10'], 18000], [[300, 'FIXED5'], 0], [[500, 'FIXED5'], 0], [[2000, ''], 2000], [[2000, 'NOPE'], 2000], [[0, 'SAVE10'], 0]
    ] }
  });

  practice.push({
    title: 'Idempotent Charge Store That Survives Client Retries',
    level: 'Hard',
    tags: ['idempotency', 'retries', 'fakes', 'payments'],
    companies: ['Stripe', 'Square', 'Adyen'],
    statement: `<p>Your <code>POST /charges</code> endpoint accepts an <code>Idempotency-Key</code> header. Clients retry on timeouts, so the same request may arrive several times. Implement the store the endpoint uses, and which your tests (and your fake payment provider) rely on: class <code>IdempotentCharges</code> with <code>charge(key, amount_cents) -&gt; str</code>:</p>
      <ul>
        <li>First time a key is seen: create charge <code>ch_N</code> (N counts created charges from 1) and return <code>"201 ch_N"</code>.</li>
        <li>Same key and same amount again: return <code>"200 ch_N"</code> (a replay: no new charge).</li>
        <li>Same key with a different amount: return <code>"409 key reused"</code> and change nothing.</li>
        <li>Amount ≤ 0: return <code>"422 invalid amount"</code> without remembering the key.</li>
        <li>Keys expire 24 hours after first use: <code>advance(hours)</code> moves an injected fake clock; an expired key behaves as new.</li>
      </ul>
      <p>Also <code>total_charged() -&gt; int</code>: the sum of amounts of created charges.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> operations, amounts up to 10<sup>9</sup>, hours ≥ 0 (integers). A key expires when now ≥ first_use + 24.</p>`,
    example: `<p><code>charge("k1", 500)</code> → ${H.c('g', '"201 ch_1"')}; retry <code>charge("k1", 500)</code> → ${H.c('g', '"200 ch_1"')}; <code>charge("k1", 900)</code> → ${H.c('r', '"409 key reused"')}; <code>total_charged()</code> → 500.</p>
      <p>Why: the retry must return the original result, otherwise a customer whose first response was lost to a timeout pays twice.</p>`,
    brute: {
      why: `<p>Without a store every request creates a charge: a client that retries after a read timeout double-charges the customer. Remembering only the key (not the request) is also wrong: a client bug that reuses a key for a different amount would silently get the first charge back instead of an error.</p>`,
      code: `class NaiveCharges:
    def __init__(self):
        self.n = 0
        self.total = 0

    def charge(self, key, amount_cents):
        self.n += 1                          # every retry is a new charge
        self.total += amount_cents
        return f"201 ch_{self.n}"`
    },
    mcq: {
      q: 'A retried request with the same Idempotency-Key but a different body arrives. What should the API do?',
      options: ['Create a second charge', 'Return the first charge silently', 'Reject it (409/422): the key is being reused for a different operation', 'Overwrite the first charge'],
      answer: 2,
      explain: 'An idempotency key identifies one operation. A different payload means a client bug; rejecting it surfaces the bug instead of hiding it.'
    },
    hints: [
      'Hint 1: store <code>key → (amount, charge_id, first_use_hour)</code> and a counter for charge ids.',
      'Hint 2: validate the amount first; then check expiry (now ≥ first_use + 24 means forget the key).',
      'Hint 3: same amount → replay with 200; different amount → 409; new key → create, add to the total, return 201.'
    ],
    solution: {
      approach: `<p>The store maps each key to the request fingerprint (here the amount) and the result it produced, plus when it was first used. Invalid requests are rejected before touching the store, so a bad first attempt does not burn the key. Expiry is checked against an injected clock, so tests can jump 24 hours instantly and probe the exact boundary. In production the store is a database table with a unique constraint on the key (or Redis with <code>SET NX</code> and a TTL), and the fingerprint is a hash of the whole request body.</p>`,
      code: `class FakeClock:
    def __init__(self):
        self.hours = 0

    def __call__(self):
        return self.hours


class IdempotentCharges:
    TTL_HOURS = 24

    def __init__(self, clock=None):
        self.clock = clock or FakeClock()
        self.by_key = {}          # key -> (amount, charge_id, first_use)
        self.created = 0
        self.total = 0

    def advance(self, hours):
        self.clock.hours += hours

    def charge(self, key, amount_cents):
        if amount_cents <= 0:
            return "422 invalid amount"
        now = self.clock()
        entry = self.by_key.get(key)
        if entry is not None and now >= entry[2] + self.TTL_HOURS:
            del self.by_key[key]               # expired: behaves like a new key
            entry = None
        if entry is not None:
            amount, charge_id, _ = entry
            if amount != amount_cents:
                return "409 key reused"
            return f"200 {charge_id}"          # replay: same result, no new charge
        self.created += 1
        charge_id = f"ch_{self.created}"
        self.by_key[key] = (amount_cents, charge_id, now)
        self.total += amount_cents
        return f"201 {charge_id}"

    def total_charged(self):
        return self.total`,
      complexity: `<p>O(1) average per operation with a dict; O(k) memory for k live keys (expired keys are removed lazily on access).</p>`,
      followUps: ['Two identical requests arrive at the same moment on two workers: how do a unique constraint or <code>SET NX</code> make this safe, and how would you test it?', 'Should a 5xx result be stored and replayed, or should the key stay retryable?']
    },
    tests: { cls: 'IdempotentCharges', sigs: { IdempotentCharges: '', charge: 'string int -> string', advance: 'int -> void', total_charged: '-> int' }, cases: [
      { ops: ['IdempotentCharges', 'charge', 'charge', 'charge', 'total_charged'], args: [[], ['k1', 500], ['k1', 500], ['k1', 900], []], out: [null, '201 ch_1', '200 ch_1', '409 key reused', 500] },
      { ops: ['IdempotentCharges', 'charge', 'charge', 'total_charged'], args: [[], ['a', 100], ['b', 100], []], out: [null, '201 ch_1', '201 ch_2', 200] },
      { ops: ['IdempotentCharges', 'charge', 'charge', 'total_charged'], args: [[], ['a', 0], ['a', 50], []], out: [null, '422 invalid amount', '201 ch_1', 50] },
      { ops: ['IdempotentCharges', 'charge', 'advance', 'charge', 'advance', 'charge', 'total_charged'], args: [[], ['k', 300], [23], ['k', 300], [1], ['k', 300], []], out: [null, '201 ch_1', null, '200 ch_1', null, '201 ch_2', 600] },
      { ops: ['IdempotentCharges', 'total_charged'], args: [[], []], out: [null, 0] },
      { ops: ['IdempotentCharges', 'charge', 'advance', 'charge'], args: [[], ['k', 300], [30], ['k', 999]], out: [null, '201 ch_1', null, '201 ch_2'] },
      { ops: ['IdempotentCharges', 'charge', 'charge', 'charge'], args: [[], ['k', -5], ['k', 7], ['k', 7]], out: [null, '422 invalid amount', '201 ch_1', '200 ch_1'] }
    ] }
  });

  practice.push({
    title: 'Design the Test Pyramid for a Payments Service',
    level: 'Hard',
    tags: ['test strategy', 'test pyramid', 'system design'],
    companies: ['Stripe', 'PayPal', 'Wise'],
    statement: `<p>You join a team running a FastAPI payments service: <code>POST /payments</code> (creates a charge at an external provider with idempotency keys), <code>POST /refunds</code>, provider webhooks (<code>POST /webhooks/provider</code>, signed), a ledger in PostgreSQL, and a Celery worker that settles payments nightly. Today there are 40 end-to-end tests against staging that take 25 minutes and fail randomly about once a day, and almost no unit tests. Design the test strategy: what goes in each layer, which doubles you use, how test data and databases work, what runs on every pull request vs nightly, and which quality gates block a merge.</p>`,
    constraints: `<p>PR feedback under 10 minutes; no real money or provider credentials in tests; money arithmetic must be exact; the team has 6 engineers.</p>`,
    example: `<p>A good answer moves "a declined card returns 402 with a friendly message" from an E2E test (25 min, flaky) to an API test with a fake provider (5 ms, deterministic), and keeps one E2E smoke test that pays with the provider's sandbox card after each deploy.</p>`,
    brute: {
      why: `<p>"Keep the E2E suite and add retries to flaky tests" keeps feedback at 25 minutes, hides real race conditions behind reruns, cannot simulate provider timeouts or duplicate webhooks on demand, and depends on shared staging data that other teams change. Inverting the pyramid like this is why the suite is slow and distrusted.</p>`,
      code: { lang: 'yaml', code: `# CI today
- run: pytest tests/e2e --reruns 3      # 25 minutes, still red once a day` }
    },
    mcq: {
      q: 'Where should "a webhook delivered twice must not double-credit the ledger" be tested first?',
      options: ['Only in E2E against staging', 'In an integration test with a real PostgreSQL ledger and two identical webhook calls through TestClient', 'With a mock of the ledger repository', 'Manually before each release'],
      answer: 1,
      explain: 'Duplicate delivery is about database uniqueness and transactions; a real database through the API is the cheapest layer that can prove it, and it runs in milliseconds.'
    },
    hints: [
      'Hint 1: list the risks first: double charges, lost webhooks, wrong amounts, provider outages, schema drift, settlement races.',
      'Hint 2: map each risk to the cheapest layer that can catch it: pure unit, API with fakes, real-DB integration, contract, E2E smoke.',
      'Hint 3: decide doubles per boundary (fake provider, respx for the client, provider sandbox nightly), data (factories, rollback per test), and gates (lint, mypy, coverage, contract).'
    ],
    solution: {
      approach: `<p><b>Risks drive the layers.</b> (1) <b>Unit (~60% of tests, seconds):</b> money and ledger rules with integer cents and Hypothesis properties (refunds never exceed the charge, ledger entries always balance to zero), the retry policy and webhook signature verification with an injected clock, state machines for payment status. (2) <b>Provider client tests:</b> respx scripts for timeouts, 429 with Retry-After, 5xx, 402 declines and malformed bodies; assert the Idempotency-Key is reused on every attempt and that no retry happens on 4xx. (3) <b>API tests via TestClient (~30%):</b> every status path of every endpoint (201, 402, 409 key reused, 422, 401/403, 404) with a <b>FakeProvider</b> injected through <code>dependency_overrides</code>; webhook endpoint tests with valid, invalid and replayed signatures. (4) <b>Integration on real PostgreSQL</b> (Testcontainers locally, a service container in CI, migrations once per session, rolled-back transaction per test, a TRUNCATE-based fixture for the few tests that need the Celery worker's own connection): duplicate webhooks credit once (unique constraint on provider event id), concurrent payments with the same key produce one charge, settlement uses <code>SELECT ... FOR UPDATE SKIP LOCKED</code> correctly, migrations upgrade/downgrade, models match migrations. Celery tasks are tested by calling the task function directly with an injected session; one test runs a real worker in eager mode. (5) <b>Contract:</b> Schemathesis on every PR with a small budget and nightly with a large one; the OpenAPI snapshot plus oasdiff blocks breaking changes; the fake provider is kept honest by running the same contract suite against the provider sandbox nightly with sandbox keys from the CI secret store (never in PR jobs). (6) <b>E2E smoke (5 tests)</b> after each deploy on staging with sandbox cards: pay, refund, webhook round trip. The 40 old E2E tests are deleted once each risk has a cheaper owner. <b>Data:</b> factories with sequences and flush persistence, seeded Faker, no shared seed files. <b>Determinism:</b> clock and random sources injected, pytest-randomly on, <code>--disable-socket</code>, reruns forbidden except a quarantine marker with an owner and an expiry date. <b>Gates per PR</b> (target under 8 minutes with xdist): ruff check and format, mypy strict, unit + API + integration tests, branch coverage ≥ 85% and diff coverage ≥ 90%, a short Schemathesis run, OpenAPI diff. <b>Nightly:</b> long Schemathesis, provider sandbox contract suite, mutation testing on the money and ledger modules, a load test of the payment path.</p>`,
      complexity: `<p>Roughly 600 unit, 300 API, 80 integration tests and 5 smoke tests: PR pipeline about 6–8 minutes, nightly jobs about 40 minutes, flakiness close to zero because no PR test depends on the network or shared state.</p>`,
      followUps: ['How do you prove the fake provider still matches reality after the provider changes its API?', 'Which single test would you write first on day one, and why?']
    },
    tests: { skip: 'written design answer, verified by reading' }
  });

  practice.push({
    title: 'Design Quality Gates and CI for a Growing FastAPI Codebase',
    level: 'Hard',
    tags: ['CI', 'mypy', 'ruff', 'coverage', 'GitHub Actions'],
    companies: ['GitLab', 'Shopify'],
    statement: `<p>A FastAPI monolith (120k lines, 30 engineers) has: no type checking, flake8 with half the rules disabled, black and isort run manually, a 35-minute test job that runs everything serially against a shared staging database, and coverage that is measured but never enforced (61%). Merges are frequently red on main. Design the target pipeline and the migration plan: tools and configuration, job layout and ordering, test database strategy, parallelism, gates (and their numbers), how to adopt mypy strict and new lint rules without a "big bang", and how to keep the pipeline fast and secure.</p>`,
    constraints: `<p>PR pipeline under 10 minutes p90; zero shared databases; no secrets available to pull requests from forks; adoption must not block feature work for more than a day.</p>`,
    example: `<p>Week 1: replace flake8/black/isort with Ruff (same rules plus <code>B</code>, <code>ASYNC</code>, <code>S</code>), commit the formatting change in one PR and add it to <code>.git-blame-ignore-revs</code>. Week 2: tests on per-worker PostgreSQL containers with xdist: 35 → 7 minutes.</p>`,
    brute: {
      why: `<p>Turning on mypy strict, 300 new lint rules and a 90% coverage gate in one pull request produces thousands of errors; the team either disables the checks or stops shipping for weeks. Keeping the shared staging database guarantees order-dependent failures no matter how good the tests are.</p>`,
      code: `[tool.mypy]
strict = true          # flipped on for all 120k lines at once: 9,000 errors, check disabled next day`
    },
    mcq: {
      q: 'What is a good way to introduce a coverage gate on a codebase currently at 61%?',
      options: ['Require 90% overall immediately', 'Gate diff coverage on changed lines (e.g. 90%) and ratchet the global minimum upward from the current value', 'Do not gate coverage at all', 'Exclude all untested files from measurement'],
      answer: 1,
      explain: 'Diff coverage makes all new code tested from day one, and a ratchet ensures the global number can only go up, without blocking work on legacy code.'
    },
    hints: [
      'Hint 1: split into fast static jobs and test jobs; tests depend on static so failures arrive in under a minute.',
      'Hint 2: per-worker databases (Testcontainers or service containers + worker_id) and transaction rollback per test remove the shared-state flakiness.',
      'Hint 3: adopt mypy strict per package with overrides and a shrinking allow-list; adopt lint rules with <code>--add-noqa</code> once, then forbid new suppressions.'
    ],
    solution: {
      approach: `<p><b>Tooling.</b> One <code>pyproject.toml</code>: Ruff for lint (E, W, F, I, B, UP, SIM, S, ASYNC, PT, RUF) and format, mypy with <code>strict = true</code> and the Pydantic plugin, pytest with <code>--strict-markers</code>, <code>filterwarnings = error</code>, pytest-randomly, pytest-xdist, pytest-socket. Dependencies locked with uv; pre-commit runs Ruff, mypy on changed files and gitleaks so most failures never reach CI. <b>Pipeline</b> (GitHub Actions): job <code>static</code> (Ruff check, Ruff format --check, mypy with a restored cache: about 1 minute); jobs <code>tests</code> (needs static; a matrix sharded 4 ways with pytest-split by recorded durations, each shard running <code>pytest -n auto</code> with one PostgreSQL service container and a database per xdist worker created from a migrated template; transaction rollback per test; about 6 minutes) and <code>contract</code> (Schemathesis short budget plus the OpenAPI snapshot and oasdiff); a final <code>gate</code> job that combines coverage from shards (<code>coverage combine</code>), enforces global ≥ the ratchet value and diff coverage ≥ 90%, and is the single required check in branch protection. <code>concurrency: cancel-in-progress</code>, uv cache, and <code>--durations=25</code> in the logs to keep it fast. Nightly: full Schemathesis, mutation testing on core domains, dependency audit (pip-audit), and an upgrade PR from Renovate. <b>Security:</b> PR jobs get no secrets (tests use fake keys and containers); deploy jobs use OIDC to the cloud instead of long-lived keys; actions pinned by version and reviewed. <b>Migration plan.</b> Day 1: Ruff with the rules flake8 had, one formatting PR added to <code>.git-blame-ignore-revs</code>; new rules enabled with <code>ruff check --add-noqa</code> once so the baseline passes and new code is clean; a check forbids adding new <code>noqa</code> without a reason. Week 1–2: database per worker and xdist (the biggest flakiness and speed win), pytest-randomly to flush out order dependencies, quarantined tests tracked as tickets. mypy: strict globally with an override list relaxing <code>disallow_untyped_defs</code> per legacy package; every new package must be strict; a CI step fails if the override list grows; each team removes one package per sprint. Coverage: gate diff coverage immediately, set the global gate at 61% and raise it automatically when the measured value rises (a ratchet file in the repo). Success metrics: p90 PR time, main-branch red rate, flaky-test count, override list length.</p>`,
      complexity: `<p>Expected outcome after a quarter: PR pipeline about 7–8 minutes p90, main red rate from several times a week to rare, mypy strict on most packages, global coverage rising steadily with every new line covered.</p>`,
      followUps: ['How would you handle pull requests from forks that need integration tests?', 'What would make you choose Pyright over mypy for this team?']
    },
    tests: { skip: 'written design answer, verified by reading' }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({
    q: 'A test requests <code>(db, engine)</code>. <code>engine</code> is session-scoped, <code>db</code> function-scoped. Which is set up first?',
    options: ['db, because it is listed first', 'engine, because higher-scoped fixtures are instantiated first', 'They are set up in parallel', 'It depends on the file name'],
    answer: 1,
    explain: 'pytest instantiates fixtures by scope (session, package, module, class, function); argument order only breaks ties inside one scope.'
  });
  quiz.push({
    q: 'You use <code>httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")</code>. Your lifespan startup creates <code>app.state.http</code>. What happens?',
    options: ['Startup runs automatically', 'ASGITransport sends no lifespan events, so <code>app.state.http</code> is missing unless you use LifespanManager or set it up in a fixture', 'httpx raises at construction', 'TestClient is used under the hood, so it works'],
    answer: 1,
    explain: 'Only <code>with TestClient(app)</code> runs lifespan. For AsyncClient wrap the app in <code>asgi_lifespan.LifespanManager</code>.'
  });
  quiz.push({
    q: 'Your endpoint calls <code>session.commit()</code>. How can a per-test outer transaction still erase its data?',
    options: ['It cannot; use TRUNCATE', 'Bind the session with <code>join_transaction_mode="create_savepoint"</code>, so commit only releases a SAVEPOINT inside the outer transaction', 'Set <code>autocommit=True</code>', 'Mock <code>commit</code> to do nothing'],
    answer: 1,
    explain: 'In savepoint mode the session never commits the outer transaction it joined; the fixture rolls that back at teardown.'
  });
  quiz.push({
    q: 'Why is testing on SQLite while production runs PostgreSQL risky?',
    options: ['SQLite is slower', 'Different SQL behaviour: unenforced VARCHAR lengths, no JSONB, different locking and error codes, so real bugs pass', 'pytest does not support SQLite', 'SQLAlchemy cannot talk to SQLite'],
    answer: 1,
    explain: 'Tests should exercise the same database engine, constraints and migrations as production wherever SQL behaviour matters.'
  });
  quiz.push({
    q: 'Which factory_boy declaration guarantees a unique email for every object?',
    options: ['<code>factory.Faker("email")</code>', '<code>factory.Sequence(lambda n: f"user{n}@example.test")</code>', '<code>email = "test@example.test"</code>', '<code>factory.Iterator(["a@x", "b@x"])</code>'],
    answer: 1,
    explain: 'A sequence uses a per-factory counter, so values never collide. Random Faker emails can repeat, and a constant collides immediately.'
  });
  quiz.push({
    q: 'Hypothesis reports a failing example with 40 list elements and then prints one with 1 element. What happened?',
    options: ['Two different bugs', 'It shrank the failure to a minimal counterexample', 'The test is flaky', 'The deadline was exceeded'],
    answer: 1,
    explain: 'Shrinking simplifies the failing input while it still fails, giving you the smallest case to debug.'
  });
  quiz.push({
    q: '<code>app/billing.py</code> does <code>from app.mail import send_receipt</code>. Which patch target stops real emails in a test of billing?',
    options: ['<code>"app.mail.send_receipt"</code>', '<code>"app.billing.send_receipt"</code>', '<code>"send_receipt"</code>', '<code>"builtins.send_receipt"</code>'],
    answer: 1,
    explain: 'Patch where the name is looked up. billing holds its own reference created at import time.'
  });
  quiz.push({
    q: 'A payment request timed out on <b>read</b>. What must the retry reuse?',
    options: ['The TCP connection', 'The same Idempotency-Key', 'A new key, to be safe', 'The same timeout value only'],
    answer: 1,
    explain: 'The provider may have processed the first request; the same key lets it return that result instead of charging again.'
  });
  quiz.push({
    q: 'Which response-model change is <b>not</b> breaking for existing clients?',
    options: ['Removing <code>owner_id</code>', 'Changing <code>id</code> from integer to string', 'Adding an optional <code>tags</code> field', 'Making <code>title</code> optional (nullable) when it was always present'],
    answer: 2,
    explain: 'Clients ignore unknown fields. Removing, retyping or weakening a guaranteed field can break code that reads it.'
  });
  quiz.push({
    q: 'Line coverage is 100%, branch coverage 80%. What does that tell you?',
    options: ['Coverage tool is misconfigured', 'Some decisions were only ever taken one way (e.g. an <code>if</code> without else always true)', 'Some code is unreachable', 'Tests have no assertions'],
    answer: 1,
    explain: 'Branch coverage counts both outcomes of each decision; every line can run while a "skip" path never happens.'
  });
  quiz.push({
    q: 'A test fails only around midnight UTC. The best fix?',
    options: ['Add <code>@pytest.mark.flaky(reruns=3)</code>', 'Skip it in CI', 'Inject a clock (or freeze time with time-machine) so the test controls "now"', 'Run CI in a different time zone'],
    answer: 2,
    explain: 'Time is a hidden input. Making it explicit makes the test deterministic and lets you test the boundary on purpose.'
  });
  quiz.push({
    q: 'mypy --strict reports <code>Item "None" of "User | None" has no attribute "email"</code> after <code>db.get(User, id)</code>. The best fix?',
    options: ['<code># type: ignore</code>', '<code>cast(User, user)</code>', 'Check <code>if user is None:</code> and raise a 404, narrowing the type', 'Disable strict mode for the file'],
    answer: 2,
    explain: 'The None case is a real runtime path (unknown id). Handling it fixes the bug and satisfies mypy through narrowing.'
  });
  quiz.push({
    q: 'In a GitHub Actions workflow, why make the test job <code>needs: static</code>?',
    options: ['Tests cannot run without Ruff installed', 'Fail fast: lint and type errors are reported in about a minute and no test minutes are wasted', 'It is required by GitHub', 'So tests run on the same machine'],
    answer: 1,
    explain: 'Cheap checks first give fast feedback and save compute; the expensive job only runs on code that already passes static checks.'
  });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({
    q: 'How do you structure the test suite of a FastAPI service?',
    a: `<p>By cost and risk. <b>Unit tests</b> for pure logic and services with fakes (fast, many). <b>API tests</b> through <code>TestClient</code> or <code>AsyncClient</code> with <code>dependency_overrides</code> for the repository, current user, settings and external clients: every status path of every endpoint. <b>Integration tests</b> on a real PostgreSQL (Testcontainers or a CI service container), migrations once per session, a rolled-back transaction per test. <b>Contract tests</b>: Schemathesis against the OpenAPI document, an OpenAPI snapshot diff, and fake-vs-real parity suites. A handful of <b>E2E smoke tests</b> after deploy. Shared fixtures live in <code>conftest.py</code>, data comes from factories, the network is blocked, and CI runs lint, mypy, tests and coverage gates on every PR.</p>`,
    level: 'I',
    followUps: ['Which layer catches a missing unique constraint?', 'How do you keep the PR pipeline under 10 minutes as the suite grows?']
  });
  interview.push({
    q: 'Explain fixture scopes and give an example of choosing them for database tests.',
    a: `<p>Scope sets the lifetime of a fixture value: function (default), class, module, package, session. Wider scopes are set up first and torn down last; teardown runs in reverse order after <code>yield</code>, even when the test fails. For databases: a <b>session</b> fixture starts the container, creates the engine and runs <code>alembic upgrade head</code> once (expensive, shared, read-only from the tests' point of view); a <b>function</b> fixture opens a connection, begins an outer transaction and yields a session in savepoint mode, then rolls back (cheap, isolates each test). A session fixture cannot depend on a function fixture (ScopeMismatch). With xdist the session scope is per worker, so each worker needs its own database.</p>`,
    level: 'B',
    followUps: ['What does <code>autouse=True</code> do and when is it dangerous?', 'How does pytest reorder tests for a parametrized module-scoped fixture?']
  });
  interview.push({
    q: 'TestClient vs httpx AsyncClient: when do you use which?',
    a: `<p><code>TestClient</code> is a synchronous httpx client that runs the ASGI app through anyio's blocking portal in a background thread. It is the simplest choice, works with sync tests, and runs lifespan events inside <code>with TestClient(app)</code>. <code>httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")</code> runs in the test's own event loop: use it when tests or fixtures are async (an <code>AsyncSession</code>, other awaitables), or to fire concurrent requests with <code>asyncio.gather</code>. It does not run lifespan, so wrap the app in <code>LifespanManager</code>. Mixing async fixtures with TestClient causes "attached to a different loop" errors because the app runs on the portal's loop.</p>`,
    level: 'I',
    followUps: ['How do you configure pytest-asyncio loop scopes for a session-scoped async engine?', 'How would you test a streaming response?']
  });
  interview.push({
    q: 'How do you isolate tests that use a real database, and what are the limits of that approach?',
    a: `<p>The standard approach: migrated schema once per session; per test, open a connection, <code>BEGIN</code> an outer transaction, bind the <code>Session</code> with <code>join_transaction_mode="create_savepoint"</code>, override <code>get_db</code> to yield it, and roll back the outer transaction afterwards. The app's commits become SAVEPOINT releases, so everything disappears. Limits: code that opens its own connection (background threads, workers, a second engine) cannot see uncommitted data; you cannot test locking or concurrency between transactions; sequences and <code>now()</code> are not rolled back or frozen. For those tests use real commits with TRUNCATE cleanup, or a fresh database from a template.</p>`,
    level: 'A',
    followUps: ['How would you run these tests in parallel with xdist?', 'How do you test that two concurrent requests cannot both succeed?']
  });
  interview.push({
    q: 'Fakes, stubs, mocks and spies: which do you use for what in an API codebase?',
    a: `<p>A <b>stub</b> returns canned data (a settings object, a fixed user). A <b>fake</b> is a working lightweight implementation (an in-memory repository, a fake payment provider that keeps charges by idempotency key); it is my default for endpoint and service tests because tests assert outcomes and stay readable through refactors. A <b>mock</b> records calls for interaction assertions; I use it when the interaction <i>is</i> the behaviour (an email was sent once, an event was published), always with <code>spec</code>/<code>autospec</code> and <code>AsyncMock</code> for coroutines. A <b>spy</b> wraps the real object. HTTP-level mocks (respx, pytest-httpx) test my client classes. Rule: mock only boundaries I do not own; keep fakes honest with contract tests run against the real implementation.</p>`,
    level: 'I',
    followUps: ['What goes wrong when you mock your own internal classes?', 'How do you detect that a fake has drifted from the real service?']
  });
  interview.push({
    q: 'How would you test a client for a flaky third-party API with retries?',
    a: `<p>Inject the <code>httpx.AsyncClient</code>, the sleep function and any random jitter source. With respx, script the provider per call using a <code>side_effect</code> list: <code>ReadTimeout</code>, 503, 429 with <code>Retry-After</code>, then 201. Assert the result, the number of calls, the exact recorded delays, and that every request carried the same Idempotency-Key and correct auth header. Separate tests: 4xx (402/400) is not retried; giving up after the maximum raises a domain error; malformed JSON is handled. Block real network with pytest-socket. Higher up, endpoint tests use a fake provider; nightly a small suite runs against the provider's sandbox to validate assumptions.</p>`,
    level: 'I',
    followUps: ['How do you test jitter deterministically?', 'Where would a circuit breaker fit and how would you test it?']
  });
  interview.push({
    q: 'What is property-based testing and where has it paid off for you in backend work?',
    a: `<p>Instead of hand-picked examples, you state a property that must hold for all inputs and let a library (Hypothesis) generate hundreds of inputs, including edge cases like empty lists, huge integers, unicode and duplicates, then shrink any failure to a minimal example and store it for replay. Good backend targets: round trips (cursor encode/decode, model → JSON → model), invariants (pagination returns each item exactly once; ledger entries sum to zero), oracles (optimised pricing equals a simple reference), idempotence (normalising twice changes nothing), and "never 500" over any valid request body, which Schemathesis automates from OpenAPI. Strategies should target the risky region, for example timestamps from a tiny set to force ties in keyset pagination.</p>`,
    level: 'A',
    followUps: ['How do you keep property tests fast in CI?', 'What is stateful testing with RuleBasedStateMachine?']
  });
  interview.push({
    q: 'What are contract tests? How do you prevent breaking API consumers?',
    a: `<p>Contract tests check promises across a boundary rather than internal logic. For a provider API: Schemathesis verifies the app conforms to its own OpenAPI document (no 5xx, documented status codes, response schemas). The OpenAPI document is committed and diffed in CI with oasdiff, failing on removed or retyped fields, newly required request fields or removed endpoints. When many internal consumers exist, consumer-driven contracts (Pact) let each consumer publish exactly what it uses and the provider verifies them in CI. Internally, the same contract suite runs against fakes and real implementations so fakes stay honest. Evolution policy: additive changes only, deprecate before removal, version when unavoidable.</p>`,
    level: 'A',
    followUps: ['Why is adding an enum value risky even though it is additive?', 'Pact vs OpenAPI diffing: when is Pact worth its cost?']
  });
  interview.push({
    q: 'Your team has 92% coverage but bugs still reach production. What do you do?',
    a: `<p>Coverage shows what ran, not what was checked. I would look at <b>where</b> bugs come from and at test quality: turn on branch coverage; run mutation testing (mutmut) on the modules where bugs occurred, since surviving mutants reveal missing assertions and boundary tests; review tests for weak assertions (status only, no body or side effect) and for error paths that are only executed, not asserted. Check the test pyramid: maybe everything is mocked and integration with the real database, migrations or providers is untested; add real-database tests and contract tests (Schemathesis). Then make bug fixes always come with a regression test, and gate diff coverage plus mutation score on critical code instead of chasing a global percentage.</p>`,
    level: 'A',
    followUps: ['How do you make mutation testing affordable in CI?', 'Which metrics would you track instead of raw coverage?']
  });
  interview.push({
    q: 'How do you find and fix flaky tests?',
    a: `<p>First measure: track tests that fail then pass on rerun, and quarantine them with an owner instead of silently rerunning. Then find the cause by category. <b>Order/shared state:</b> run with pytest-randomly, replay the failing seed, bisect the preceding tests to find the polluter (leaked dependency overrides, cached settings, module globals, uncleaned database rows). <b>Time:</b> inject a clock or freeze time. <b>Randomness:</b> seed generators and assert on values the test controls. <b>Ordering of results:</b> add ORDER BY or compare sets. <b>Async:</b> replace sleeps with awaiting events and polling with timeouts. <b>Network:</b> mock boundaries and block sockets. <b>Parallelism:</b> per-worker databases and temp directories. Fix the root cause and add a guard (autouse fixture clearing state) so the class of problem cannot return.</p>`,
    level: 'I',
    followUps: ['Why are automatic reruns harmful as a long-term policy?', 'How would you detect a test that leaks state to the next one automatically?']
  });
  interview.push({
    q: 'How do you introduce mypy --strict into an existing FastAPI codebase?',
    a: `<p>Configure it centrally in <code>pyproject.toml</code> with <code>strict = true</code>, the Pydantic plugin and per-module overrides. Start by making new code strict and relaxing <code>disallow_untyped_defs</code> only for legacy packages via an override list that CI forbids from growing; teams remove entries over time. Install stub packages, and use <code>ignore_missing_imports</code> only for specific untyped libraries. Fix errors by narrowing (None checks that become 404s), Protocols for collaborators, and validating untyped data with Pydantic instead of <code>cast</code>. Keep <code>warn_unused_ignores</code> on and require a reason for each <code>type: ignore[code]</code>. Run it in pre-commit and in the fast CI job, with the cache restored.</p>`,
    level: 'I',
    followUps: ['mypy vs Pyright: how would you choose?', 'How do SQLAlchemy 2.0 typed models change the mypy story?']
  });
  interview.push({
    q: 'Describe a CI pipeline you would set up for a Python API.',
    a: `<p>On every pull request: a <b>static</b> job (uv sync --locked, ruff check, ruff format --check, mypy) that finishes in about a minute; then <b>tests</b> (needs static) on a PostgreSQL service container with a database per xdist worker, pytest-randomly and socket blocking, branch coverage with a global ratchet and a diff-coverage gate; in parallel a <b>contract</b> job (short Schemathesis run, OpenAPI snapshot and oasdiff); then a <b>build</b> job producing the container image tagged with the commit SHA, scanned for vulnerabilities. One aggregate required check for branch protection. Concurrency cancels outdated runs; caches keep installs fast. Nightly: long fuzzing, mutation testing, provider sandbox contracts, pip-audit. Pull requests get no secrets; deploys use OIDC with environment protection rules.</p>`,
    level: 'I',
    followUps: ['How do you handle database migrations in the deploy step?', 'How would you shard a 20-minute test suite?']
  });
  interview.push({
    q: 'How do you test code that integrates an LLM API behind a FastAPI endpoint?',
    a: `<p>Treat the model as an external service. Wrap it in your own client behind a dependency, and in endpoint tests override it with a fake returning canned completions, tool calls or scripted errors (429 rate limits, 5xx overloads, timeouts), so validation, error mapping, retries and timeouts are tested deterministically. Test the client itself with respx for request shape, headers and retry behaviour; record a few real responses as cassettes with keys filtered out. Test prompt-building and output parsing as pure functions, including malformed model output, with Hypothesis for parsers. Quality of the model's answers is a separate concern: an evaluation suite with fixed datasets and scoring, run on a schedule rather than as a unit test, because it is non-deterministic and costs money.</p>`,
    level: 'E',
    followUps: ['How do you keep the fake honest as the provider changes response formats?', 'How would you gate a prompt change in CI?']
  });

  registerModule({
    id: 'be20',
    title: 'Python Backend IV: Testing & Quality for APIs',
    lang: 'python',
    intro: `<p>You can build a FastAPI service with a real database and real auth (Python Backend I–III). This module makes it <b>trustworthy</b>: a test suite your team believes, and quality gates that stop bad code before it merges. Every example is Python; you never need Java here.</p>
      <p>You will organise pytest for an API project (<code>conftest.py</code>, fixture scopes, <code>parametrize</code>, safe settings), test endpoints in memory with <code>TestClient</code> and <code>httpx.AsyncClient</code> plus <code>dependency_overrides</code>, and run real PostgreSQL tests where each test lives in a rolled-back transaction. You will build test data with factories, find edge cases with Hypothesis, script failing third-party services with respx (timeouts, retries, idempotency keys), and keep your API's promises with contract tests and Schemathesis. Finally you will measure what your tests really check (branch coverage, mutation testing), hunt flaky tests, and wire Ruff, mypy <code>--strict</code> and the test suite into a fast CI pipeline.</p>
      <p>Runnable demos use only the standard library (<code>unittest</code>, <code>unittest.mock</code>, <code>sqlite3</code>, <code>asyncio</code>, <code>sys.settrace</code>, <code>ast</code>) so they run in the browser; pytest, httpx, respx, Hypothesis, Schemathesis and SQLAlchemy code is written for current versions and meant for your own project. Tests never contain real secrets: configuration comes from the environment or from overridden settings.</p>`,
    goals: [
      'Lay out an API test suite with <code>conftest.py</code>, choose fixture scopes (session engine, function transaction), use <code>yield</code> teardown, <code>parametrize</code> with ids and marks, markers, and override settings without reading real secrets',
      'Test endpoints in memory with <code>TestClient</code> and <code>httpx.AsyncClient(transport=ASGITransport(app=app))</code>, replace dependencies with <code>app.dependency_overrides</code>, and cover the 401/403/404/409/422/500 paths with assertions on body and side effects',
      'Run tests on real PostgreSQL (Testcontainers or a CI service), migrate once per session, and isolate each test in an outer transaction with <code>join_transaction_mode="create_savepoint"</code>; know when TRUNCATE or per-worker databases are needed',
      'Build test data with plain factories and factory_boy (Sequence, Faker, LazyAttribute, SubFactory, Trait) and write Hypothesis property tests whose failures shrink to minimal examples',
      'Mock external services at the right layer: fakes for endpoint tests, respx or pytest-httpx for clients, with tests for timeouts, retries, Retry-After and idempotency keys, and no real network',
      'Protect API contracts with Schemathesis, response-schema checks, OpenAPI snapshots and breaking-change diffs, and keep fakes honest with shared contract suites',
      'Use branch coverage, diff coverage and mutation testing sensibly, and diagnose flaky tests caused by time, randomness, ordering, async races and the network',
      'Configure mypy <code>--strict</code> (with the Pydantic plugin) and Ruff, adopt them gradually, and build a fail-fast GitHub Actions pipeline with PostgreSQL, coverage gates and contract checks'
    ],
    prereqs: `<p><b>Required:</b> <b>Python Backend I</b> (FastAPI Fundamentals: routing, Pydantic models, dependencies with <code>yield</code>, <code>async def</code> vs <code>def</code>, OpenAPI docs) and <b>Errors, Type Hints &amp; Testing</b> (Python 9: pytest basics, fixtures, <code>unittest.mock</code>, mypy basics). This module builds on them and does not re-teach them.</p>
      <p><b>Helpful:</b> <b>Python Backend II</b> (SQLAlchemy sessions and Alembic, used by the database topic) and <b>Python Backend III</b> (auth dependencies and pydantic-settings, used in the override examples). For general test strategy in Java teams, Backend <b>Testing &amp; Architecture</b>; nothing here requires Java.</p>
      <p>Tools: Python 3.12+, <code>pip install pytest pytest-asyncio pytest-cov pytest-xdist pytest-randomly httpx respx asgi-lifespan hypothesis factory-boy schemathesis testcontainers mypy ruff</code> and Docker for PostgreSQL. The runnable demos need only the standard library.</p>`,
    langExplain: `<p><b>About the code here.</b> This module belongs to the Python backend route, so every example is Python. Runnable demos use only the standard library so they run in the browser; pytest, httpx, respx, Hypothesis, Schemathesis, factory_boy and SQLAlchemy examples target current versions and are meant for your own project. If you work in Java, the same ideas (test pyramid, Testcontainers, contract tests, mocking boundaries) appear with JUnit, Mockito and Pact in the Backend module "Testing &amp; Architecture".</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
