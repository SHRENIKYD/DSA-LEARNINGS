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

  /* =====================================================================
     TOPIC 1 — Project layout, first app, running with Uvicorn
     ===================================================================== */
  topics.push({
    title: 'Your First FastAPI App: Project Layout, ASGI and Running with Uvicorn',
    analogy: `<p>Think of a <b>restaurant</b>. <b>Uvicorn</b> is the front door and the waiter: it accepts people (TCP connections), takes their orders (HTTP requests) and carries plates back. <b>FastAPI</b> is the kitchen: it reads the order slip, sends it to the right cook (your function) and plates the food (JSON). <b>ASGI</b> is the agreed shape of the order slip, so any waiter can work with any kitchen.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> FastAPI is a Python web framework. You write normal Python functions with <b>type hints</b>, put a decorator such as <code>@app.get("/items/{item_id}")</code> on top, and FastAPI does the boring parts for you: it reads the URL, converts and checks the inputs, calls your function, turns the result into JSON, and writes interactive documentation. You already know these HTTP ideas from <b>Backend 1</b> and <b>Backend 4</b>. Here we do them the Python way.</p>
      <p><b>Install and run</b> (inside a virtual environment):</p>
      ${H.table(['Step', 'Command', 'What it does'], [
        ['1', '<code>python -m venv .venv</code> then <code>source .venv/bin/activate</code>', 'A private box of packages for this project (Windows: <code>.venv\\Scripts\\activate</code>)'],
        ['2', '<code>pip install "fastapi[standard]"</code>', 'FastAPI + Uvicorn + the <code>fastapi</code> CLI + a few helpers (the quotes stop your shell eating the brackets)'],
        ['3', '<code>fastapi dev main.py</code>', 'Development server on <code>http://127.0.0.1:8000</code> with auto-reload'],
        ['3 (alt)', '<code>uvicorn main:app --reload</code>', 'Same thing, calling Uvicorn directly: module <code>main</code>, variable <code>app</code>'],
        ['4', 'open <code>http://127.0.0.1:8000/docs</code>', 'Swagger UI: try every endpoint in the browser'],
        ['prod', '<code>fastapi run main.py</code> or <code>uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4</code>', 'No reload, listen on all interfaces, several processes']
      ])}
      <p><b>What is ASGI?</b> It is a tiny contract: "the server calls <code>await app(scope, receive, send)</code>". <code>scope</code> is a dict describing the request (method, path, headers), <code>receive</code> gives you the body, <code>send</code> sends the response. FastAPI (built on <b>Starlette</b>) is one big ASGI app. Uvicorn is one ASGI server. Older Python frameworks (Flask, classic Django) use <b>WSGI</b>, which is the same idea but synchronous only.</p>
      <p><b>Project layout.</b> One file is fine for a demo. A real service splits by feature, with one <code>APIRouter</code> per area:</p>
      <pre>app/
  main.py            # create FastAPI(), include routers, lifespan
  core/config.py     # settings (read from environment)
  api/deps.py        # shared dependencies (db session, current user)
  api/routers/items.py, users.py
  schemas/item.py    # Pydantic models: ItemCreate, ItemOut
  services/items.py  # business logic, no HTTP in here
  db/...             # (Python Backend II)
tests/test_items.py</pre>
      <p>The rule from <b>Backend 2</b> still holds: <b>routes stay thin</b>. A route reads input, calls a service, returns output. Business rules live in <code>services/</code> so you can test them without HTTP.</p>`,
    clues: [
      '"How do you run a FastAPI app?" → <code>fastapi dev main.py</code> in development, <code>fastapi run</code> / <code>uvicorn main:app --workers N</code> in production',
      '"What is the difference between WSGI and ASGI?" → ASGI is async-capable (websockets, long-lived connections); WSGI is sync request/response only',
      '"<code>uvicorn main:app</code> — what is <code>main:app</code>?" → the module path, a colon, then the variable holding the app object',
      '"How would you structure a bigger FastAPI project?" → <code>APIRouter</code> per feature, schemas, services, deps, <code>include_router</code> with prefix and tags',
      '"Where do you open the DB pool / load an ML model at startup?" → the <code>lifespan</code> context manager (not the deprecated <code>on_event</code>)',
      '"The app works on my laptop but not in Docker" → it listens on 127.0.0.1; use <code>--host 0.0.0.0</code>'
    ],
    code: [
      {
        lang: 'python', title: 'main.py — the smallest real app',
        code: `# pip install "fastapi[standard]"
# run:  fastapi dev main.py      (or: uvicorn main:app --reload)
from fastapi import FastAPI

app = FastAPI(title="Hello API", version="1.0.0")   # the ASGI application object


@app.get("/")                     # path operation: GET on "/"
def read_root() -> dict[str, str]:
    # Return plain Python data; FastAPI turns it into JSON for you.
    return {"message": "Hello, world"}


@app.get("/health")
def health() -> dict[str, str]:
    # Load balancers and Kubernetes call this to see if the process is alive.
    return {"status": "ok"}`
      },
      {
        lang: 'python', title: 'A feature router and the app factory with lifespan',
        code: `# app/api/routers/items.py
from fastapi import APIRouter

router = APIRouter(prefix="/items", tags=["items"])   # every route below starts with /items


@router.get("")                    # final path: GET /items
def list_items() -> list[dict]:
    return [{"id": 1, "name": "pen"}]


@router.get("/{item_id}")          # final path: GET /items/{item_id}
def get_item(item_id: int) -> dict:
    return {"id": item_id, "name": "pen"}


# app/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code before 'yield' runs ONCE at startup: open pools, load models, warm caches.
    app.state.ready = True
    yield
    # Code after 'yield' runs ONCE at shutdown: close pools, flush buffers.
    app.state.ready = False


def create_app() -> FastAPI:
    application = FastAPI(title="Shop API", version="1.0.0", lifespan=lifespan)
    application.include_router(router, prefix="/api/v1")   # final: /api/v1/items
    return application


app = create_app()`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a raw ASGI app with no framework (what Uvicorn actually calls)',
        code: `import asyncio

# An ASGI app is just an async callable: app(scope, receive, send).
async def app(scope, receive, send):
    assert scope["type"] == "http"
    body = ('{"path": "' + scope["path"] + '"}').encode()
    await send({"type": "http.response.start", "status": 200,
                "headers": [(b"content-type", b"application/json")]})
    await send({"type": "http.response.body", "body": body})


# A fake "server" playing Uvicorn's role for one request.
async def fake_server():
    scope = {"type": "http", "method": "GET", "path": "/hello", "headers": []}

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    sent = []

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)
    for m in sent:
        print(m["type"], m.get("status", ""), m.get("body", b"").decode())

asyncio.run(fake_server())`
      }
    ],
    codeTitle: ['main.py — hello FastAPI', 'Routers + app factory + lifespan', 'Raw ASGI (runnable, no framework)'],
    viz: {
      title: 'One request: browser → Uvicorn → FastAPI → your function',
      input: 'GET /items/42',
      inputLabel: 'Request line (method and path)',
      gen: function (input) {
        var s = String(input || '').trim().split(/\s+/);
        if (s.length < 2 || !/^(GET|POST|PUT|PATCH|DELETE)$/i.test(s[0]) || s[1].charAt(0) !== '/') throw new Error('Type something like: GET /items/42');
        var method = s[0].toUpperCase(), p = s[1].slice(0, 40);
        var known = /^\/items\/\d+$/.test(p) && method === 'GET';
        var nodes = [bx('c', 'Client (browser/curl)', 8, 30, 18), bx('u', 'Uvicorn (ASGI server)', 32, 30, 18), bx('s', 'Starlette routing', 55, 15, 16), bx('f', 'FastAPI: validate + DI', 55, 45, 16), bx('h', 'get_item()', 82, 30, 14)];
        var edges = [['c', 'u'], ['u', 's'], ['s', 'f'], ['f', 'h']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 60, label: 'Request path', nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        var f = [];
        f.push({ narr: 'The client opens a TCP connection to port 8000 and sends <code>' + hesc(method + ' ' + p) + '</code>. Nothing Python-specific yet: just bytes.', parts: [g({ c: 'cur' }), { type: 'text', label: 'Raw bytes', html: '<code>' + hesc(method + ' ' + p) + ' HTTP/1.1<br>Host: 127.0.0.1:8000</code>' }] });
        f.push({ narr: '<b>Uvicorn</b> parses the HTTP bytes and builds an ASGI <code>scope</code> dict. Then it calls <code>await app(scope, receive, send)</code>.', parts: [g({ u: 'cur' }, { 'c-u': 'ok' }), { type: 'map', label: 'ASGI scope (simplified)', entries: [['type', 'http'], ['method', method], ['path', p], ['headers', '[(b"host", ...)]']] }] });
        f.push({ narr: 'Starlette (the toolkit under FastAPI) walks the route table <b>in the order routes were added</b> and picks the first match.', parts: [g({ s: 'cur' }, { 'u-s': 'ok' }), { type: 'table', label: 'Route table', columns: ['#', 'method', 'path template', 'match?'], rows: [['0', 'GET', '/', p === '/' && method === 'GET' ? 'yes' : 'no'], ['1', 'GET', '/health', p === '/health' && method === 'GET' ? 'yes' : 'no'], ['2', 'GET', '/items/{item_id}', known ? 'yes' : 'no']], hl: known ? { 2: 'ok' } : {} }] });
        if (!known && !(p === '/' || p === '/health')) {
          f.push({ narr: 'No route matched, so the app answers <b>404 Not Found</b> with <code>{"detail":"Not Found"}</code>. Your code never ran. (Right path but wrong method would give <b>405</b>.)', parts: [g({ s: 'bad' }, { 'u-s': 'bad' }), { type: 'vars', label: 'Response', vals: { status: /^\/items\/\d+$/.test(p) ? 405 : 404, body: /^\/items\/\d+$/.test(p) ? '{"detail":"Method Not Allowed"}' : '{"detail":"Not Found"}' }, hl: { status: 'bad' } }] });
          f.push({ narr: 'Try <code>GET /items/42</code> to see the happy path, or <code>GET /items/abc</code> to see a 404 from the route table (the template only matches here because the demo route uses digits).', parts: [g({}), { type: 'text', html: 'Tip: in real FastAPI, <code>/items/abc</code> DOES match the template, then fails type validation with <b>422</b>. Topic 2 shows this.' }] });
          return f;
        }
        var id = known ? p.split('/')[2] : null;
        f.push({ narr: 'FastAPI reads your function signature <code>get_item(item_id: int)</code>, pulls <code>"' + (id || '') + '"</code> out of the path and converts it to the int <b>' + (id || '') + '</b>. If conversion failed it would answer 422 for you.', parts: [g({ f: 'cur' }, { 's-f': 'ok' }), { type: 'vars', label: 'Inputs after validation', vals: id ? { item_id: Number(id) } : { '(none)': '-' }, hl: { item_id: 'ok' } }] });
        f.push({ narr: 'Your function runs with plain Python values. It returns a dict. It knows nothing about bytes, sockets or headers.', parts: [g({ h: 'cur' }, { 'f-h': 'ok' }), pyc('Your code', '@app.get("/items/{item_id}")\ndef get_item(item_id: int) -> dict:\n    return {"id": item_id, "name": "pen"}', { 3: 'cur' })] });
        f.push({ narr: 'FastAPI serialises the dict to JSON, sets <code>content-type: application/json</code> and status 200, then calls <code>send()</code> twice: headers, then body. Uvicorn writes the bytes back.', parts: [g({ c: 'ok', u: 'done', s: 'done', f: 'done', h: 'done' }, { 'c-u': 'ok', 'u-s': 'ok', 's-f': 'ok', 'f-h': 'ok' }), { type: 'vars', label: 'Response', vals: { status: 200, 'content-type': 'application/json', body: '{"id":' + (id || 0) + ',"name":"pen"}' }, hl: { status: 'ok' } }] });
        return f;
      }
    },
    examples: [
      {
        title: 'Run it two ways and see the same thing',
        html: `<p>Save the hello app as <code>main.py</code>. Run <code>fastapi dev main.py</code>. The CLI prints the URL, the docs URL and "Watching for file changes". Now stop it and run <code>uvicorn main:app --reload</code>. Same server. The CLI is a friendly wrapper around Uvicorn.</p>
        ${H.table(['Request', 'Status', 'Body'], [['<code>curl -i localhost:8000/</code>', '200', '<code>{"message":"Hello, world"}</code>'], ['<code>curl -i localhost:8000/nope</code>', '<span class="c-r">404</span>', '<code>{"detail":"Not Found"}</code>'], ['<code>curl -i -X POST localhost:8000/</code>', '<span class="c-r">405</span>', '<code>{"detail":"Method Not Allowed"}</code>']])}
        <p>Notice 404 vs 405: the path exists but not for POST, so FastAPI says "method not allowed" and adds an <code>allow: GET</code> header.</p>`
      },
      {
        title: 'Splitting into routers with prefixes',
        html: `<p>A router declared with <code>prefix="/items"</code> and included with <code>prefix="/api/v1"</code> gives final paths <code>/api/v1/items</code> and <code>/api/v1/items/{item_id}</code>. Tags group them in <code>/docs</code>. Prefixes add up left to right, so keep each layer short and never repeat <code>/items</code> in the decorators.</p>`,
        code: { lang: 'python', run: true, code: `# How prefixes combine (plain Python, same rule FastAPI applies)
def final_path(*parts: str) -> str:
    return "".join(p.rstrip("/") for p in parts if p) or "/"

print(final_path("/api/v1", "/items", ""))           # router.get("")
print(final_path("/api/v1", "/items", "/{item_id}"))  # router.get("/{item_id}")
print(final_path("/api/v1", "/users", "/me"))` }
      },
      {
        title: 'Startup work with lifespan',
        html: `<p>You need one HTTP client shared by all requests. Create it in <code>lifespan</code> before <code>yield</code>, store it on <code>app.state</code>, and close it after <code>yield</code>. If you create it inside every request, you pay a new TLS handshake every time. The old <code>@app.on_event("startup")</code> still works but is deprecated; <code>lifespan</code> keeps setup and teardown next to each other.</p>`,
        code: { lang: 'python', run: true, code: `import asyncio
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    print("startup: open pool")
    app["pool"] = "pool-1"
    yield
    print("shutdown: close", app["pool"])

async def main():
    app = {}
    async with lifespan(app):          # the server does this for you
        print("serving requests with", app["pool"])

asyncio.run(main())` }
      },
      {
        title: 'Production flags that matter',
        html: `<p><code>--reload</code> watches files and restarts. Never use it in production (slow, and restarts on any write). <code>--workers 4</code> starts 4 processes, because one Python process runs Python code on one core at a time. Behind a proxy or load balancer, add <code>--proxy-headers</code> (and set <code>--forwarded-allow-ips</code>) so <code>request.url</code> shows https and the real client IP. In Docker you must bind <code>--host 0.0.0.0</code>. Python Backend V covers Gunicorn with Uvicorn workers and container images.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>What FastAPI really is.</b> <code>FastAPI</code> is a subclass of Starlette's <code>Starlette</code> class. Starlette gives routing, requests/responses, middleware, websockets and the test client. FastAPI adds the part that reads your <b>type hints</b>: for each route it builds a "dependant" tree at import time (parameters, body model, dependencies) and an OpenAPI description. At request time it walks that tree, so per-request work is mostly validation, which runs in Pydantic v2's Rust core (<code>pydantic-core</code>).</p>
      <p><b>The middleware onion.</b> Requests pass through <code>ServerErrorMiddleware</code> (turns crashes into 500), your middleware (CORS, GZip, timing), <code>ExceptionMiddleware</code> (calls your exception handlers), then the router. Middleware added later wraps earlier middleware.</p>
      <p><b>Reload vs workers.</b> <code>--reload</code> runs a supervisor that restarts a child process on file change; <code>--workers</code> forks N independent processes that each import your app, so <b>module-level state is not shared</b> (a global dict counter gives different answers per worker). Shared state belongs in a database or Redis.</p>
      <p><b>Event loop.</b> Uvicorn uses <code>uvloop</code> and <code>httptools</code> when installed (they come with <code>fastapi[standard]</code>), which are faster C-based implementations of the event loop and HTTP parser. <code>fastapi dev</code> binds to 127.0.0.1 with reload; <code>fastapi run</code> binds 0.0.0.0 without reload.</p>
      <p><b>Python version.</b> Current FastAPI needs Python 3.8+ (3.9+ in recent releases); use 3.11+ in 2026 for speed and nicer errors, and the <code>list[int]</code> / <code>int | None</code> syntax.</p>`,
    aiEra: `<p>🤖 Assistants scaffold a FastAPI project in seconds. The scaffolds are often <b>outdated</b>: <code>@app.on_event("startup")</code>, Pydantic v1 <code>class Config</code>, <code>orm_mode = True</code>, or <code>pip install fastapi uvicorn</code> without the CLI. Know the 2026 shape: <code>fastapi[standard]</code>, <code>lifespan</code>, <code>model_config</code>, <code>Annotated</code>. When you accept generated code, check three things: routes are thin, settings come from the environment (not hard-coded secrets), and the run command matches where it will run (no <code>--reload</code> in a Dockerfile). A good prompt: "Create a FastAPI project with routers for items and users, a services layer, lifespan for startup, Pydantic v2 schemas, and pytest tests using TestClient. Use Annotated dependencies." Then read every file; you own it.</p>`,
    problems: [
      {
        title: 'Lay Out and Run a Small Service',
        level: 'Easy', tags: ['project layout', 'uvicorn', 'routers'], companies: ['Swiggy', 'Razorpay'],
        statement: `<p>You are starting a <b>notes</b> service. Create the project layout, a router for notes mounted at <code>/api/v1/notes</code>, a <code>/health</code> endpoint, and a lifespan that prints on startup and shutdown. Give the exact commands to install, run in development, and run in production with 2 workers.</p>`,
        constraints: `Python 3.11+, FastAPI ≥ 0.110. No database yet: keep notes in a module-level dict (and say why that breaks with workers).`,
        example: `${H.table(['Request', 'Status', 'Body'], [['<code>GET /health</code>', '200', '<code>{"status":"ok"}</code>'], ['<code>GET /api/v1/notes</code>', '200', '<code>[]</code>'], ['<code>GET /notes</code>', '<span class="c-r">404</span>', 'prefix missing']])}`,
        brute: { why: `<p>Everything in one 600-line <code>main.py</code>: routes, SQL, settings and helpers. It runs, but every change touches the same file, tests need the whole app, and two people cannot work on it without merge conflicts.</p>` },
        mcq: { q: 'You run <code>uvicorn main:app</code> and get "Error loading ASGI app. Attribute app not found". Why?', options: ['The FastAPI object in main.py is not named <code>app</code>', 'Uvicorn is not installed', 'Port 8000 is busy', 'You forgot <code>--reload</code>'], answer: 0, explain: 'main:app means "import module main, take attribute app". If you called it application, run uvicorn main:application.' },
        hints: [
          `<p>Hint 1: one router per feature: <code>APIRouter(prefix="/notes", tags=["notes"])</code>. The version prefix goes on <code>include_router</code>.</p>`,
          `<p>Hint 2: lifespan is an <code>@asynccontextmanager</code> function taking the app; pass it as <code>FastAPI(lifespan=lifespan)</code>.</p>`,
          `<p>Hint 3: dev = <code>fastapi dev app/main.py</code>; prod = <code>fastapi run app/main.py --workers 2</code> or <code>uvicorn app.main:app --host 0.0.0.0 --workers 2</code>. With 2 workers there are 2 separate dicts.</p>`
        ],
        solution: {
          approach: `<p>Split by responsibility: <code>app/main.py</code> creates the app and includes routers; <code>app/routers/notes.py</code> holds the note routes; schemas and services get their own modules as the service grows. The version prefix <code>/api/v1</code> is applied once at <code>include_router</code>. Lifespan wraps startup and shutdown. The in-memory dict is fine for a demo, but each worker process has its own copy, so a note created via worker 1 is invisible to worker 2. That is the reason real services keep state in a database (Python Backend II).</p>`,
          code: { lang: 'python', code: `# app/routers/notes.py
from fastapi import APIRouter

router = APIRouter(prefix="/notes", tags=["notes"])
NOTES: dict[int, str] = {}          # demo only: one copy PER worker process


@router.get("")
def list_notes() -> list[dict]:
    return [{"id": k, "text": v} for k, v in NOTES.items()]


# app/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("notes service starting")
    yield
    print("notes service stopping")


app = FastAPI(title="Notes", lifespan=lifespan)
app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

# Commands:
#   pip install "fastapi[standard]"
#   fastapi dev app/main.py
#   fastapi run app/main.py --workers 2
#   (or) uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2` },
          complexity: `<p>No algorithmic cost. Each extra worker costs one more Python process worth of memory (often 50-150 MB each with dependencies loaded).</p>`,
          followUps: ['How would you add a <code>/ready</code> endpoint that fails until the database pool is open?', 'Why might you prefer an app factory function in tests?']
        },
        tests: { skip: 'framework wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — Routing, path parameters and query parameters
     ===================================================================== */
  topics.push({
    title: 'Routing, Path Parameters and Query Parameters',
    analogy: `<p>A <b>postal address</b> has two parts. The street and house number say <b>which house</b> (path: <code>/users/42</code>). A note on the envelope like "leave at the back door, after 5pm" says <b>how</b> to deliver (query: <code>?sort=name&amp;limit=10</code>). The post office checks addresses <b>in order</b> down a list, and the first matching rule wins.</p>`,
    explain: `<p>🟢 <b>Path operation = method + path + function.</b> <code>@app.get("/users/{user_id}")</code> registers "GET on this path template calls this function". There is one decorator per method: <code>get</code>, <code>post</code>, <code>put</code>, <code>patch</code>, <code>delete</code>.</p>
      <p><b>How FastAPI decides where each argument comes from:</b></p>
      ${H.table(['Your parameter', 'FastAPI reads it from', 'Example'], [
        ['Name appears in the path template <code>{user_id}</code>', '<b>Path</b>', '<code>def get(user_id: int)</code>'],
        ['Simple type (int, str, bool, float, Enum, list[str]) not in the path', '<b>Query string</b>', '<code>def search(q: str, limit: int = 10)</code>'],
        ['A Pydantic model', '<b>JSON body</b>', '<code>def create(item: ItemCreate)</code> (Topic 3)'],
        ['Marked with <code>Header()</code>, <code>Cookie()</code>, <code>Form()</code>, <code>File()</code>', 'That part of the request', '<code>user_agent: Annotated[str | None, Header()] = None</code>']
      ])}
      <p><b>Types do real work.</b> <code>user_id: int</code> means <code>/users/42</code> gives you the int <code>42</code>, and <code>/users/abc</code> never reaches your function: FastAPI answers <b>422</b> with a clear message. For query params, a default makes them optional: <code>limit: int = 10</code>. <code>q: str | None = None</code> means "optional, may be missing". No default means <b>required</b>: missing → 422.</p>
      <p><b>Booleans are friendly:</b> <code>?active=true</code>, <code>1</code>, <code>yes</code>, <code>on</code> all become <code>True</code>. <b>Lists</b> need <code>Query()</code>: <code>tags: Annotated[list[str], Query()] = []</code> reads <code>?tags=a&amp;tags=b</code>.</p>
      <p><b>Constraints with <code>Annotated</code>.</b> Put rules next to the type:</p>
      <pre>limit: Annotated[int, Query(ge=1, le=100)] = 20
user_id: Annotated[int, Path(gt=0)]
q: Annotated[str | None, Query(min_length=2, max_length=50)] = None</pre>
      <p><b>Order matters.</b> Routes are checked top to bottom. If <code>/users/{user_id}</code> is declared before <code>/users/me</code>, a request for <code>/users/me</code> matches the first one and fails with 422 ("me" is not an int). <b>Declare fixed paths before parameter paths.</b></p>
      <p><b>Fixed choices:</b> use an <code>Enum</code> (or <code>Literal["asc", "desc"]</code>). Docs show a dropdown, and bad values get a 422 listing the allowed ones.</p>`,
    clues: [
      '"<code>/users/me</code> returns 422 but <code>/users/5</code> works" → route order: fixed path must come before <code>{user_id}</code>',
      '"Optional filter / page size / sort" → query parameter with a default; required identity → path parameter',
      '"Limit must be between 1 and 100" → <code>Annotated[int, Query(ge=1, le=100)]</code>, not an if-statement inside the handler',
      '"Accept several tags in one request" → <code>list[str]</code> with <code>Query()</code> → <code>?tags=a&amp;tags=b</code>',
      '"Only allow asc or desc" → <code>Enum</code> or <code>Literal</code> type',
      '"A path parameter that contains slashes (a file path)" → <code>{file_path:path}</code> converter'
    ],
    code: [
      {
        lang: 'python', title: 'Path and query parameters with constraints',
        code: `from enum import Enum
from typing import Annotated

from fastapi import FastAPI, Path, Query

app = FastAPI()


class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


# Fixed path FIRST, so "/users/me" is not swallowed by "/users/{user_id}".
@app.get("/users/me")
def read_me() -> dict:
    return {"id": 0, "name": "current user"}


@app.get("/users/{user_id}")
def read_user(user_id: Annotated[int, Path(gt=0, description="User id")]) -> dict:
    return {"id": user_id}


@app.get("/products")
def search_products(
    q: Annotated[str | None, Query(min_length=2, max_length=50)] = None,   # optional text
    category: str | None = None,                                           # optional, no rules
    in_stock: bool = False,                                                # ?in_stock=true
    tags: Annotated[list[str], Query()] = [],                              # ?tags=a&tags=b
    sort: SortOrder = SortOrder.asc,                                       # only asc|desc
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict:
    return {"q": q, "category": category, "in_stock": in_stock, "tags": tags,
            "sort": sort, "limit": limit, "offset": offset}


@app.get("/files/{file_path:path}")          # ":path" lets the value contain "/"
def read_file(file_path: str) -> dict:
    return {"file_path": file_path}`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a tiny router that matches like FastAPI (first match wins, types checked)',
        code: `# A toy version of Starlette routing: templates -> compiled patterns, tried in order.
import re

ROUTES = []  # list of (method, regex, param_types, name)

def route(method: str, template: str, name: str, **types):
    # "{user_id}" -> named group; types decide what the group may look like later
    pattern = "^" + re.sub(r"{(\\w+)}", r"(?P<\\1>[^/]+)", template) + "$"
    ROUTES.append((method, re.compile(pattern), types, name))

route("GET", "/users/{user_id}", "read_user", user_id=int)   # declared FIRST (bug!)
route("GET", "/users/me", "read_me")

def dispatch(method: str, path: str):
    path_matched = False
    for m, rx, types, name in ROUTES:
        hit = rx.match(path)
        if not hit:
            continue
        path_matched = True
        if m != method:
            continue
        params = {}
        for key, raw in hit.groupdict().items():
            conv = types.get(key, str)
            try:
                params[key] = conv(raw)
            except ValueError:
                # FastAPI does NOT try the next route: the match already happened.
                return 422, {"detail": [{"loc": ["path", key], "msg": "Input should be a valid integer", "input": raw}]}
        return 200, {"handler": name, "params": params}
    return (405, {"detail": "Method Not Allowed"}) if path_matched else (404, {"detail": "Not Found"})

for req in [("GET", "/users/5"), ("GET", "/users/me"), ("POST", "/users/5"), ("GET", "/orders")]:
    print(req, "->", dispatch(*req))`
      }
    ],
    codeTitle: ['Path + query parameters', 'Toy router (runnable)'],
    viz: {
      title: 'Which route wins? (order matters)',
      input: 'GET /users/me',
      inputLabel: 'Request (try GET /users/me, GET /users/7, GET /users/0, GET /files/a/b.txt)',
      gen: function (input) {
        var s = String(input || '').trim().split(/\s+/);
        if (s.length < 2 || s[1].charAt(0) !== '/') throw new Error('Type like: GET /users/me');
        var method = s[0].toUpperCase(), path = s[1].split('?')[0].slice(0, 50);
        var routes = [
          { m: 'GET', t: '/users/me', rx: /^\/users\/me$/, conv: null },
          { m: 'GET', t: '/users/{user_id}', rx: /^\/users\/([^/]+)$/, conv: 'int>0' },
          { m: 'POST', t: '/users', rx: /^\/users$/, conv: null },
          { m: 'GET', t: '/files/{file_path:path}', rx: /^\/files\/(.+)$/, conv: 'path' }
        ];
        var rows = routes.map(function (r, i) { return [String(i), r.m, r.t, '']; });
        var frames = [];
        frames.push({ narr: 'FastAPI keeps routes in a list <b>in declaration order</b>. It tries each one against <code>' + hesc(method + ' ' + path) + '</code> until one path template matches.', parts: [{ type: 'table', label: 'Route table', columns: ['#', 'method', 'template', 'result'], rows: cp(rows) }] });
        var pathHit = false;
        for (var i = 0; i < routes.length; i++) {
          var r = routes[i], mm = path.match(r.rx), hl = {};
          if (!mm) {
            rows[i][3] = 'path no';
            hl[i] = 'done';
            frames.push({ narr: 'Route ' + i + ' <code>' + hesc(r.t) + '</code>: the path shape does not fit. Move on.', parts: [{ type: 'table', label: 'Route table', columns: ['#', 'method', 'template', 'result'], rows: cp(rows), hl: hl }] });
            continue;
          }
          pathHit = true;
          if (r.m !== method) {
            rows[i][3] = 'path yes, method no';
            hl[i] = 'cur';
            frames.push({ narr: 'Route ' + i + ': path fits but method is ' + r.m + ', not ' + hesc(method) + '. Remember this: if nothing else matches, the answer is 405, not 404.', parts: [{ type: 'table', label: 'Route table', columns: ['#', 'method', 'template', 'result'], rows: cp(rows), hl: hl }] });
            continue;
          }
          rows[i][3] = 'MATCH';
          hl[i] = 'ok';
          frames.push({ narr: 'Route ' + i + ' <code>' + hesc(r.t) + '</code> matches. Routing <b>stops here</b>. Later routes are never tried.', parts: [{ type: 'table', label: 'Route table', columns: ['#', 'method', 'template', 'result'], rows: cp(rows), hl: hl }] });
          if (r.conv === 'int>0') {
            var raw = mm[1], ok = /^-?\d+$/.test(raw), val = ok ? parseInt(raw, 10) : null;
            if (!ok) {
              frames.push({ narr: 'Now validation: <code>user_id: int</code> but the text is <code>"' + hesc(raw) + '"</code>. Not an integer → <b>422</b>. FastAPI does not go back and try other routes.', parts: [{ type: 'vars', label: 'Path params', vals: { user_id: '"' + raw + '"' }, hl: { user_id: 'bad' } }, { type: 'text', label: 'Response 422', html: '<code>{"detail":[{"type":"int_parsing","loc":["path","user_id"],"msg":"Input should be a valid integer, unable to parse string as an integer","input":"' + hesc(raw) + '"}]}</code>' }] });
            } else if (val <= 0) {
              frames.push({ narr: 'It parses to ' + val + ', but the rule <code>Path(gt=0)</code> fails → <b>422</b> "Input should be greater than 0".', parts: [{ type: 'vars', label: 'Path params', vals: { user_id: val }, hl: { user_id: 'bad' } }] });
            } else {
              frames.push({ narr: 'Text <code>"' + raw + '"</code> becomes the int <b>' + val + '</b> and passes <code>gt=0</code>. <code>read_user(user_id=' + val + ')</code> runs → 200.', parts: [{ type: 'vars', label: 'Path params', vals: { user_id: val }, hl: { user_id: 'ok' } }] });
            }
          } else if (r.conv === 'path') {
            frames.push({ narr: 'The <code>:path</code> converter lets the value contain slashes, so <code>file_path = "' + hesc(mm[1]) + '"</code>.', parts: [{ type: 'vars', label: 'Path params', vals: { file_path: mm[1] }, hl: { file_path: 'ok' } }] });
          } else {
            frames.push({ narr: 'No parameters to convert. The handler runs → 200. Because <code>/users/me</code> is declared <b>before</b> <code>/users/{user_id}</code>, "me" never gets treated as an id.', parts: [{ type: 'vars', label: 'Handler', vals: { called: 'read_me()', status: 200 }, hl: { status: 'ok' } }] });
          }
          var skipped = {};
          for (var k = i + 1; k < routes.length; k++) { rows[k][3] = 'never tried'; skipped[k] = 'done'; }
          skipped[i] = 'ok';
          frames.push({ narr: (i + 1 < routes.length ? 'Routes after #' + i + ' were <b>never tried</b>. ' : '') + 'Lesson: put fixed paths (<code>/users/me</code>) above parameter paths (<code>/users/{user_id}</code>). Try swapping their meaning in your head: "me" would hit the int route and fail with 422.', parts: [{ type: 'table', label: 'Route table (final)', columns: ['#', 'method', 'template', 'result'], rows: cp(rows), hl: skipped }] });
          return frames;
        }
        frames.push({ narr: pathHit ? 'A path matched but never with method ' + hesc(method) + ' → <b>405 Method Not Allowed</b> with an <code>allow</code> header.' : 'No template matched → <b>404 Not Found</b>.', parts: [{ type: 'vars', label: 'Response', vals: { status: pathHit ? 405 : 404 }, hl: { status: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Query parameters: required, optional, defaulted',
        html: `<p>Signature <code>def search(q: str, page: int = 1, tag: str | None = None)</code>:</p>
        ${H.table(['Request', 'Result'], [['<code>/search?q=pen</code>', '<span class="c-g">q="pen", page=1, tag=None</span>'], ['<code>/search?q=pen&amp;page=3</code>', 'page=3 (converted from "3")'], ['<code>/search</code>', '<span class="c-r">422</span> q is required (no default)'], ['<code>/search?q=pen&amp;page=two</code>', '<span class="c-r">422</span> page: Input should be a valid integer'], ['<code>/search?q=pen&amp;color=red</code>', 'extra query keys are <b>ignored</b> by default']])}`
      },
      {
        title: 'The /users/me ordering bug, fixed',
        html: `<p>Bug report: "GET /users/me returns 422: user_id Input should be a valid integer". The cause is declaration order. Move <code>@app.get("/users/me")</code> above <code>@app.get("/users/{user_id}")</code>. The same applies across routers: the router included first is checked first.</p>`,
        code: { lang: 'python', code: `from fastapi import FastAPI

app = FastAPI()

@app.get("/users/me")            # 1. fixed path first
def read_me() -> dict:
    return {"me": True}

@app.get("/users/{user_id}")     # 2. then the parameter path
def read_user(user_id: int) -> dict:
    return {"id": user_id}` }
      },
      {
        title: 'Enum vs Literal for fixed choices',
        html: `<p><code>sort: Literal["price", "-price", "name"] = "name"</code> is short and fine. A <code>str</code>-based <code>Enum</code> is better when the values are reused in code (a service compares <code>SortOrder.desc</code>). Either way <code>?sort=random</code> gets a 422 whose message lists the allowed values, and <code>/docs</code> shows a dropdown.</p>`
      },
      {
        title: 'Lists, headers and aliases',
        html: `<p>Some names are not valid Python identifiers, such as <code>item-query</code> or a header <code>X-Request-ID</code>. Use <code>alias</code> for query names: <code>Annotated[str | None, Query(alias="item-query")]</code>. For headers FastAPI converts underscores to hyphens for you: <code>x_request_id: Annotated[str | None, Header()] = None</code> reads <code>X-Request-ID</code>.</p>`,
        code: { lang: 'python', code: `from typing import Annotated

from fastapi import FastAPI, Header, Query

app = FastAPI()

@app.get("/items")
def items(
    tags: Annotated[list[str], Query()] = [],                     # ?tags=a&tags=b
    item_query: Annotated[str | None, Query(alias="item-query")] = None,
    x_request_id: Annotated[str | None, Header()] = None,         # X-Request-ID header
) -> dict:
    return {"tags": tags, "item_query": item_query, "request_id": x_request_id}` }
      }
    ],
    deepDive: `<p>🟣 <b>How matching really works.</b> Starlette compiles each template to a regex once, at startup. <code>{name}</code> becomes <code>[^/]+</code>; convertors <code>{x:int}</code>, <code>{x:float}</code>, <code>{x:uuid}</code>, <code>{x:path}</code> change the regex. FastAPI usually leaves them as plain strings and does the type conversion with Pydantic so the error is a nice 422 instead of a 404. Matching is linear over the route list. With hundreds of routes that is still microseconds, so don't optimise it.</p>
      <p><b>Partial matches give 405.</b> If a route's path matched but its method did not, Starlette remembers that and, if nothing else fully matches, answers 405 with an <code>Allow</code> header. <b>Trailing slashes:</b> a request for <code>/items/</code> when you declared <code>/items</code> gets a <b>307 redirect</b> to the other form (<code>redirect_slashes=True</code> by default). Some clients drop the body or auth on redirect, so pick one style and stick to it.</p>
      <p><b>Query parsing rules.</b> Values arrive as strings. Pydantic converts them in "lax" mode: <code>"3"</code> → <code>3</code>, <code>"true"</code>/<code>"1"</code>/<code>"on"</code> → <code>True</code>. Repeated keys only become a list when the type is a list. Since FastAPI 0.115 you can group query params in a Pydantic model: <code>filters: Annotated[ProductFilters, Query()]</code>, and use <code>model_config = {"extra": "forbid"}</code> to reject unknown keys.</p>
      <p><b>Mutable default <code>= []</code>.</b> In plain Python that is a famous bug (py modules). In a FastAPI signature it is safe because FastAPI builds a fresh value per request, but in a Pydantic model or normal function prefer <code>Field(default_factory=list)</code>.</p>`,
    aiEra: `<p>🤖 Generated routes often skip constraints: <code>limit: int = 100</code> with no upper bound means someone can request <code>limit=10000000</code> and take your database down. When reviewing AI code, look at every path and query parameter and ask: is there a type, a range, a max length? Is a fixed path declared before a parameter path? Ask the assistant: "List every route in this file in the order FastAPI will try them, and flag any route that can shadow a later one." It is good at that mechanical check. It is less good at choosing whether something belongs in the path or the query; that is your API design call from Backend 4.</p>`
  });

  /* =====================================================================
     TOPIC 3 — Request bodies, Pydantic models and validation
     ===================================================================== */
  topics.push({
    title: 'Request Bodies with Pydantic: Models, Field Rules and Validation Errors',
    analogy: `<p>A <b>bank form</b> has boxes with rules printed next to them: "name (required)", "age (18 or older)", "email (must contain @)". The clerk checks the <b>whole form</b> and hands it back with every wrong box circled, not just the first one. A <b>Pydantic model</b> is that form. FastAPI is the clerk. The circled boxes are the <b>422 response</b>.</p>`,
    explain: `<p>🟢 <b>A model is a class that describes JSON.</b> You subclass <code>BaseModel</code> and list the fields with types. When a parameter's type is a model, FastAPI reads the request body as JSON, checks it against the model, and hands your function a ready-made object.</p>
      <pre>class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0)
    tags: list[str] = []
    description: str | None = None</pre>
      ${H.table(['Body sent', 'What happens'], [
        ['<code>{"name":"pen","price":2.5}</code>', '<span class="c-g">OK</span>: tags=[], description=None (defaults)'],
        ['<code>{"name":"pen","price":"2.5"}</code>', '<span class="c-g">OK</span>: lax mode converts the string "2.5" to 2.5'],
        ['<code>{"price":-1}</code>', '<span class="c-r">422</span> with <b>two</b> errors: name missing, price must be &gt; 0'],
        ['<code>not json</code>', '<span class="c-r">422</span> json_invalid'],
        ['<code>{"name":"pen","price":1,"colour":"red"}</code>', 'OK by default: unknown key ignored (set <code>extra="forbid"</code> to reject)']
      ])}
      <p><b>The 422 shape.</b> FastAPI returns <code>{"detail": [ ...errors ]}</code>. Each error has <code>type</code> (machine code, e.g. <code>missing</code>, <code>greater_than</code>), <code>loc</code> (where: <code>["body","price"]</code>), <code>msg</code> (human text) and <code>input</code> (what was sent). Clients can map <code>loc</code> straight to form fields.</p>
      <p><b>Three levels of rules:</b></p>
      <ol>
        <li><b>Type + Field constraints</b>: <code>gt, ge, lt, le, min_length, max_length, pattern, multiple_of</code>. Covers most rules.</li>
        <li><b>Special types</b>: <code>EmailStr</code> (needs the <code>email-validator</code> package, included in <code>fastapi[standard]</code>), <code>HttpUrl</code>, <code>UUID</code>, <code>datetime</code>, <code>Decimal</code>, <code>Literal</code>.</li>
        <li><b>Custom validators</b>: <code>@field_validator("name")</code> for one field, <code>@model_validator(mode="after")</code> for rules across fields ("end date after start date").</li>
      </ol>
      <p><b>Model settings</b> live in <code>model_config = ConfigDict(...)</code> (Pydantic v2). Useful ones: <code>extra="forbid"</code> (reject unknown keys, catches typos and mass-assignment), <code>str_strip_whitespace=True</code>, <code>strict=True</code> (no "2.5" → 2.5 conversion), <code>frozen=True</code> (immutable).</p>
      <p><b>Nested models</b> just work: <code>items: list[OrderLine]</code> validates every line, and errors point to <code>["body","items",2,"qty"]</code>.</p>`,
    clues: [
      '"Validate the request body" → Pydantic model as the parameter type; never <code>await request.json()</code> plus hand-written ifs',
      '"Return all the errors at once, per field" → Pydantic collects every error; FastAPI returns them as a 422 list with <code>loc</code>',
      '"End date must be after start date" → <code>@model_validator(mode="after")</code>',
      '"Reject unknown fields / typos like <code>emial</code>" → <code>model_config = ConfigDict(extra="forbid")</code>',
      '"Client sends price as a string" → lax mode converts it; <code>strict=True</code> if you want to refuse',
      '"Pydantic v1 code: <code>class Config</code>, <code>@validator</code>, <code>.dict()</code>" → v2 names: <code>model_config</code>, <code>@field_validator</code>, <code>.model_dump()</code>'
    ],
    code: [
      {
        lang: 'python', title: 'Body models with Field rules and validators (Pydantic v2)',
        code: `from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import FastAPI, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

app = FastAPI()


class OrderLine(BaseModel):
    sku: str = Field(pattern=r"^[A-Z]{3}-\\d{3}$", examples=["PEN-001"])
    qty: int = Field(ge=1, le=1000)


class OrderCreate(BaseModel):
    # Reject unknown keys and trim spaces around every string.
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    customer_email: EmailStr
    lines: list[OrderLine] = Field(min_length=1, max_length=50)
    coupon: Annotated[str | None, Field(max_length=20)] = None
    deliver_from: date
    deliver_to: date
    tip: Decimal = Field(default=Decimal("0"), ge=0, max_digits=6, decimal_places=2)

    @field_validator("coupon")
    @classmethod
    def coupon_upper(cls, v: str | None) -> str | None:
        # Runs after the type check; return the (possibly changed) value.
        return v.upper() if v else v

    @model_validator(mode="after")
    def window_is_valid(self) -> "OrderCreate":
        # Cross-field rule: needs both dates, so it runs on the whole model.
        if self.deliver_to < self.deliver_from:
            raise ValueError("deliver_to must be on or after deliver_from")
        return self


@app.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(order: OrderCreate) -> dict:
    # 'order' is already validated. Convert to plain data with model_dump().
    data = order.model_dump()
    return {"id": 1, "lines": len(data["lines"]), "coupon": data["coupon"]}`
      },
      {
        lang: 'python', run: true, title: 'Runnable: how a validator collects EVERY error with a loc path (stdlib only)',
        code: `# A tiny imitation of Pydantic's behaviour: check every field, collect every error.
def validate_item(body: dict) -> list[dict]:
    errors = []

    def err(loc, typ, msg, value):
        errors.append({"type": typ, "loc": ["body", *loc], "msg": msg, "input": value})

    if not isinstance(body, dict):
        err([], "model_attributes_type", "Input should be an object", body)
        return errors

    name = body.get("name")
    if "name" not in body:
        err(["name"], "missing", "Field required", None)
    elif not isinstance(name, str):
        err(["name"], "string_type", "Input should be a valid string", name)
    elif len(name) < 1:
        err(["name"], "string_too_short", "String should have at least 1 character", name)

    price = body.get("price")
    if "price" not in body:
        err(["price"], "missing", "Field required", None)
    else:
        try:
            p = float(price)          # lax mode: "2.5" is accepted
            if p <= 0:
                err(["price"], "greater_than", "Input should be greater than 0", price)
        except (TypeError, ValueError):
            err(["price"], "float_parsing", "Input should be a valid number", price)

    for i, tag in enumerate(body.get("tags", [])):
        if not isinstance(tag, str):
            err(["tags", i], "string_type", "Input should be a valid string", tag)
    return errors

for body in [{"name": "pen", "price": "2.5"},
             {"price": -1},
             {"name": "", "price": "abc", "tags": ["ok", 7]}]:
    errs = validate_item(body)
    print(422 if errs else 200, [(".".join(map(str, e["loc"])), e["type"]) for e in errs])`
      }
    ],
    codeTitle: ['Pydantic v2 models', 'Error collection (runnable)'],
    viz: {
      title: 'Validate a body field by field and build the 422',
      input: '{"name": "", "price": -3, "qty": "2", "extra": 1}',
      inputLabel: 'JSON body for model {name: str min 1, price: float > 0, qty: int 1..99, extra forbidden}',
      gen: function (input) {
        var body;
        try { body = JSON.parse(String(input || '{}')); } catch (e) { throw new Error('Enter a JSON object, e.g. {"name":"pen","price":2}'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('The body must be a JSON object { ... }');
        var fields = ['name', 'price', 'qty'], errors = [], frames = [];
        function errRows() { return errors.map(function (e) { return [e.loc, e.type, e.msg]; }); }
        frames.push({ narr: 'FastAPI parsed the JSON. Now Pydantic checks it against <code>ItemCreate</code>. It will <b>not stop at the first problem</b>; it collects them all.', parts: [{ type: 'map', label: 'Incoming body', entries: Object.keys(body).slice(0, 8).map(function (k) { return [k, JSON.stringify(body[k])]; }) }, pyc('Model', 'class ItemCreate(BaseModel):\n    model_config = ConfigDict(extra="forbid")\n    name: str = Field(min_length=1)\n    price: float = Field(gt=0)\n    qty: int = Field(ge=1, le=99)')] });
        fields.forEach(function (f, i) {
          var v = body[f], line = i + 3, res;
          if (!(f in body)) res = ['missing', 'Field required'];
          else if (f === 'name') res = typeof v !== 'string' ? ['string_type', 'Input should be a valid string'] : v.length < 1 ? ['string_too_short', 'String should have at least 1 character'] : null;
          else if (f === 'price') { var n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : null); res = n === null ? ['float_parsing', 'Input should be a valid number'] : n <= 0 ? ['greater_than', 'Input should be greater than 0'] : null; }
          else { var q = typeof v === 'number' && Math.floor(v) === v ? v : (typeof v === 'string' && /^-?\d+$/.test(v) ? parseInt(v, 10) : null); res = q === null ? ['int_parsing', 'Input should be a valid integer'] : q < 1 ? ['greater_than_equal', 'Input should be greater than or equal to 1'] : q > 99 ? ['less_than_equal', 'Input should be less than or equal to 99'] : null; }
          if (res) errors.push({ loc: 'body.' + f, type: res[0], msg: res[1] });
          var hl = {}; hl[line] = res ? 'bad' : 'ok';
          var conv = (!res && typeof v === 'string' && f !== 'name') ? ' The string <code>"' + hesc(v) + '"</code> was <b>converted</b> (lax mode).' : '';
          frames.push({ narr: 'Field <b>' + f + '</b> = <code>' + hesc(f in body ? JSON.stringify(v) : '(missing)') + '</code> → ' + (res ? '<span class="c-r">' + res[0] + '</span>: ' + res[1] + '. Keep going.' : '<span class="c-g">valid</span>.' + conv), parts: [pyc('Model', 'class ItemCreate(BaseModel):\n    model_config = ConfigDict(extra="forbid")\n    name: str = Field(min_length=1)\n    price: float = Field(gt=0)\n    qty: int = Field(ge=1, le=99)', hl), { type: 'table', label: 'Errors so far', columns: ['loc', 'type', 'msg'], rows: errRows(), hl: res ? (function () { var h = {}; h[errors.length - 1] = 'bad'; return h; })() : {} }] });
        });
        var extras = Object.keys(body).filter(function (k) { return fields.indexOf(k) < 0; });
        extras.forEach(function (k) { errors.push({ loc: 'body.' + k, type: 'extra_forbidden', msg: 'Extra inputs are not permitted' }); });
        frames.push({ narr: extras.length ? 'Unknown keys ' + extras.map(function (k) { return '<code>' + hesc(k) + '</code>'; }).join(', ') + ' hit <code>extra="forbid"</code>. Without that setting they would be silently dropped.' : 'No unknown keys. (With the default <code>extra="ignore"</code> they would be dropped anyway.)', parts: [pyc('Model', 'class ItemCreate(BaseModel):\n    model_config = ConfigDict(extra="forbid")\n    name: str = Field(min_length=1)\n    price: float = Field(gt=0)\n    qty: int = Field(ge=1, le=99)', { 2: extras.length ? 'bad' : 'ok' }), { type: 'table', label: 'Errors', columns: ['loc', 'type', 'msg'], rows: errRows() }] });
        frames.push({ narr: errors.length ? 'Result: <b>422 Unprocessable Content</b> with ' + errors.length + ' error(s). Your route function was <b>never called</b>.' : 'Result: valid. FastAPI builds an <code>ItemCreate</code> object and calls your function with it.', parts: [{ type: 'vars', label: 'Outcome', vals: { status: errors.length ? 422 : 200, errors: errors.length, handler_called: errors.length ? 'no' : 'yes' }, hl: { status: errors.length ? 'bad' : 'ok' } }, { type: 'text', label: 'Response body', html: errors.length ? '<code>{"detail": [' + errors.map(function (e) { return '{"type":"' + e.type + '","loc":["' + e.loc.split('.').join('","') + '"],"msg":"' + hesc(e.msg) + '"}'; }).join(', ') + ']}</code>' : '<code>(whatever your function returns)</code>' }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Cross-field rule with model_validator',
        html: `<p>A booking needs <code>check_out &gt; check_in</code>. A field validator only sees one field, so use <code>@model_validator(mode="after")</code>: it runs after every field is valid and receives the model. Raise <code>ValueError</code> and Pydantic turns it into a 422 entry with type <code>value_error</code> and <code>loc ["body"]</code>.</p>`,
        code: { lang: 'python', code: `from datetime import date

from pydantic import BaseModel, Field, model_validator


class BookingCreate(BaseModel):
    room_id: int = Field(gt=0)
    check_in: date
    check_out: date
    guests: int = Field(ge=1, le=6)

    @model_validator(mode="after")
    def dates_in_order(self) -> "BookingCreate":
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in")
        return self` }
      },
      {
        title: 'Reading the 422 like a client',
        html: `<p>Body <code>{"lines":[{"sku":"PEN-001","qty":0}],"deliver_from":"2026-10-10"}</code> to <code>/orders</code> gives errors:</p>
        ${H.table(['loc', 'type', 'meaning'], [['body.customer_email', 'missing', 'required field absent'], ['body.lines.0.qty', 'greater_than_equal', 'first line, qty must be ≥ 1'], ['body.deliver_to', 'missing', 'required field absent']])}
        <p>A front end loops over <code>detail</code>, joins <code>loc</code> after <code>body</code>, and puts each <code>msg</code> under the matching input box.</p>`
      },
      {
        title: 'Strict mode vs lax mode',
        html: `<p>By default Pydantic is <b>lax</b>: <code>"42"</code> becomes <code>42</code> for an <code>int</code> field, <code>"true"</code> becomes <code>True</code>. That is friendly for query strings, which are always text. For a payments API you may want <code>model_config = ConfigDict(strict=True)</code>, or per field <code>amount: int = Field(strict=True)</code>, so a client that sends <code>"100"</code> gets a 422 instead of silent conversion. Note: lax mode never truncates; <code>3.7</code> into an <code>int</code> is an error.</p>`
      },
      {
        title: 'Same rules reused with Annotated',
        html: `<p>Define a rule once and reuse it everywhere: <code>Username = Annotated[str, Field(min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")]</code>. Then <code>username: Username</code> in any model, query or path. Shared types keep all endpoints consistent, which is easy to lose when the same rule is copied into ten files.</p>`,
        code: { lang: 'python', code: `from typing import Annotated

from pydantic import BaseModel, Field

Username = Annotated[str, Field(min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")]
Money = Annotated[int, Field(ge=0, description="Amount in paise/cents")]


class SignupIn(BaseModel):
    username: Username
    starting_credit: Money = 0` }
      }
    ],
    deepDive: `<p>🟣 <b>Pydantic v2 internals.</b> When a model class is created, Pydantic builds a <b>core schema</b> and compiles it into a validator in <code>pydantic-core</code> (Rust). That is why v2 is many times faster than v1. FastAPI calls this validator once per request on the parsed body. <code>model_validate(dict)</code> validates Python data; <code>model_validate_json(bytes)</code> parses and validates in one pass; <code>model_dump()</code> / <code>model_dump_json()</code> go back out.</p>
      <p><b>Validator modes.</b> <code>field_validator(mode="after")</code> (default) gets the already-typed value; <code>mode="before"</code> gets the raw input (useful to split <code>"a,b"</code> into a list before the list check); <code>mode="wrap"</code> can run code around the inner validator. <code>model_validator(mode="before")</code> gets the raw dict. Raise <code>ValueError</code> or <code>AssertionError</code>-style errors; do not raise <code>HTTPException</code> inside validators (the model may be used outside HTTP).</p>
      <p><b>Body shape rules in FastAPI.</b> One model parameter → the body IS that object. Two model parameters (<code>item: Item, user: User</code>) → the body must be <code>{"item": {...}, "user": {...}}</code>. <code>Body(embed=True)</code> forces the wrapped form for a single model. A plain <code>int</code> marked <code>Body()</code> becomes a key in the body.</p>
      <p><b>Security angle.</b> <code>extra="forbid"</code> blocks <b>mass assignment</b>: a client sending <code>"is_admin": true</code> gets a 422 instead of reaching a model that might copy every key into the DB row. Also cap sizes: <code>max_length</code> on strings and lists stops a 50 MB JSON array from eating memory (and set a body size limit at the proxy).</p>
      <p><b>Status code 422.</b> Recent FastAPI versions name it <code>HTTP_422_UNPROCESSABLE_CONTENT</code> (RFC 9110 wording); older code says <code>HTTP_422_UNPROCESSABLE_ENTITY</code>. Same number.</p>`,
    aiEra: `<p>🤖 Pydantic is where AI-generated code most often mixes versions. Watch for <code>@validator</code>, <code>@root_validator</code>, <code>class Config: orm_mode = True</code>, <code>.dict()</code>, <code>.parse_obj()</code>: all v1. The v2 equivalents are <code>@field_validator</code>, <code>@model_validator</code>, <code>model_config = ConfigDict(from_attributes=True)</code>, <code>.model_dump()</code>, <code>.model_validate()</code>. A useful prompt: "Here is my business rule list. Write a Pydantic v2 model with Field constraints first, and a validator only when a constraint cannot express the rule. Then list 10 JSON bodies that should fail, with the expected error loc and type." Run those bodies as tests. Pydantic models are also how you get <b>structured output from LLMs</b>: the same model that validates a request can validate what a model returns.</p>`,
    problems: [
      {
        title: 'Model a Booking Request',
        level: 'Medium', tags: ['pydantic', 'validation', 'model_validator'], companies: ['MakeMyTrip', 'Airbnb'],
        statement: `<p>Write the Pydantic v2 request model and the route <code>POST /bookings</code> for a hotel. Rules: <code>room_id</code> positive int; <code>guest_email</code> valid email; <code>check_in</code> and <code>check_out</code> dates with check_out after check_in and at most 30 nights; <code>guests</code> 1-6; optional <code>note</code> up to 200 chars, trimmed; unknown keys rejected. Return 201 with the number of nights.</p>`,
        constraints: `FastAPI ≥ 0.110, Pydantic v2 only. All rules must surface as 422 errors with a useful <code>loc</code>.`,
        example: `${H.table(['Body', 'Result'], [['<code>{"room_id":3,"guest_email":"a@b.co","check_in":"2026-12-01","check_out":"2026-12-04","guests":2}</code>', '<span class="c-g">201</span> <code>{"nights":3}</code>'], ['same with <code>"check_out":"2026-11-30"</code>', '<span class="c-r">422</span> value_error at body'], ['same plus <code>"vip":true</code>', '<span class="c-r">422</span> extra_forbidden at body.vip']])}`,
        brute: {
          why: `<p>Taking <code>request: Request</code>, calling <code>await request.json()</code> and writing a chain of <code>if</code> statements. It returns on the first error, gives inconsistent messages, does no type conversion for dates, and does not appear in the OpenAPI docs, so clients do not know the shape.</p>`,
          code: { lang: 'python', code: `from fastapi import FastAPI, HTTPException, Request

app = FastAPI()

@app.post("/bookings")
async def create_booking(request: Request) -> dict:
    data = await request.json()
    if "room_id" not in data:
        raise HTTPException(400, "room_id missing")      # first error only, wrong code
    if data["guests"] > 6:                                # KeyError -> 500 if absent
        raise HTTPException(400, "too many guests")
    return {"ok": True}` }
        },
        mcq: { q: 'Where should "check_out must be after check_in" live?', options: ['A <code>@model_validator(mode="after")</code> on the model', 'A <code>@field_validator("check_out")</code> that reads a global', 'An if-statement in the route raising HTTPException(400)', 'A database CHECK constraint only'], answer: 0, explain: 'The rule needs two fields, so it belongs on the whole model, after each field is typed. That keeps it reusable and returns a normal 422. A DB constraint is a good extra safety net, not the first line.' },
        hints: [
          `<p>Hint 1: each single-field rule is a <code>Field(...)</code> argument: <code>gt=0</code>, <code>ge=1, le=6</code>, <code>max_length=200</code>.</p>`,
          `<p>Hint 2: <code>model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)</code> handles unknown keys and trimming for every string field.</p>`,
          `<p>Hint 3: in a model validator compute <code>(self.check_out - self.check_in).days</code>; raise ValueError if ≤ 0 or &gt; 30; return self.</p>`
        ],
        solution: {
          approach: `<p>Put every single-field rule in <code>Field</code>, the cross-field rules in one <code>model_validator(mode="after")</code>, and the global behaviour (no extra keys, trimmed strings) in <code>model_config</code>. The route then contains no validation at all: by the time it runs, the booking is correct. Use <code>EmailStr</code> for the email (installed with <code>fastapi[standard]</code>). Return 201 because a booking resource is created.</p>`,
          code: { lang: 'python', code: `from datetime import date

from fastapi import FastAPI, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

app = FastAPI()
MAX_NIGHTS = 30


class BookingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    room_id: int = Field(gt=0)
    guest_email: EmailStr
    check_in: date
    check_out: date
    guests: int = Field(ge=1, le=6)
    note: str | None = Field(default=None, max_length=200)

    @property
    def nights(self) -> int:
        return (self.check_out - self.check_in).days

    @model_validator(mode="after")
    def check_dates(self) -> "BookingCreate":
        if self.nights <= 0:
            raise ValueError("check_out must be after check_in")
        if self.nights > MAX_NIGHTS:
            raise ValueError(f"a booking can be at most {MAX_NIGHTS} nights")
        return self


@app.post("/bookings", status_code=status.HTTP_201_CREATED)
def create_booking(booking: BookingCreate) -> dict:
    return {"room_id": booking.room_id, "nights": booking.nights}` },
          complexity: `<p>Validation is O(size of body). Pydantic v2 runs it in compiled Rust, typically microseconds for a body this small.</p>`,
          followUps: ['How would you also reject a check_in in the past, and how do you test that without depending on today\'s date?', 'Where would "room must be free on those dates" be checked, and what status code would it return?']
        },
        tests: { skip: 'framework wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Response models
     ===================================================================== */
  topics.push({
    title: 'Response Models: Shaping and Filtering What You Send Back',
    analogy: `<p>A <b>hospital file</b> has everything: name, diagnosis, insurance number, doctor's private notes. When the patient asks for a <b>discharge summary</b>, the clerk does not photocopy the whole file. They fill in a fixed summary form, and only those boxes leave the building. A <b>response model</b> is that summary form: whatever your code returns, only the declared fields go out.</p>`,
    explain: `<p>🟢 <b>Input and output are different shapes.</b> A client sends a password when signing up; the server must <b>never</b> send it back. The database row has <code>password_hash</code>, <code>created_at</code>, internal flags. So you usually write <b>three models</b> per resource:</p>
      ${H.table(['Model', 'Used for', 'Fields (user example)'], [
        ['<code>UserCreate</code>', 'request body of POST', 'email, password, full_name'],
        ['<code>UserOut</code> (or <code>UserPublic</code>)', 'response body', 'id, email, full_name, created_at'],
        ['<code>UserInDB</code> / ORM class', 'internal only', 'everything + password_hash, is_admin, ...']
      ])}
      <p><b>Two ways to declare the output:</b></p>
      <ol>
        <li><b>Return type annotation</b>: <code>def get_user(...) -&gt; UserOut:</code>. FastAPI validates and filters the return value through <code>UserOut</code>, and documents it.</li>
        <li><b><code>response_model=UserOut</code></b> in the decorator. Use this when your function returns something else on purpose (a dict, an ORM object, a <code>UserInDB</code>) and you want FastAPI to filter it. If both exist, <code>response_model</code> wins.</li>
      </ol>
      <p>Either way FastAPI <b>re-validates</b> the data through the output model and <b>drops every field the model does not declare</b>. That is your safety net: even if someone later adds <code>password_hash</code> to the dict you return, it will not leak.</p>
      <p><b>Lists and wrappers:</b> <code>-&gt; list[UserOut]</code>, or a page wrapper <code>class Page(BaseModel): items: list[UserOut]; total: int</code>. <b>From ORM objects:</b> set <code>model_config = ConfigDict(from_attributes=True)</code> on the output model so it can read attributes (<code>user.email</code>) instead of dict keys.</p>
      <p><b>Trimming options:</b> <code>response_model_exclude_unset=True</code> sends only fields that were actually set (good for sparse resources), <code>response_model_exclude_none=True</code> drops nulls. Use them on purpose: clients may rely on a key always being present.</p>`,
    clues: [
      '"Don\'t leak the password hash / internal fields" → separate <code>UserOut</code> model as <code>response_model</code> or return type',
      '"Return an ORM object directly" → output model with <code>from_attributes=True</code>',
      '"Function returns a dict but docs should show the real shape" → <code>response_model=</code>',
      '"Same resource, create vs read vs update shapes" → <code>UserCreate</code>, <code>UserOut</code>, <code>UserUpdate</code> sharing a <code>UserBase</code>',
      '"Partial objects, omit fields not stored" → <code>response_model_exclude_unset=True</code>',
      '"Return a file / redirect / HTML" → return a <code>Response</code> subclass and set <code>response_model=None</code> if the annotation confuses FastAPI'
    ],
    code: [
      {
        lang: 'python', title: 'In / Out / DB models and response_model filtering',
        code: `from datetime import datetime, timezone

from fastapi import FastAPI, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field

app = FastAPI()


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=80)


class UserCreate(UserBase):            # what the client SENDS
    password: str = Field(min_length=12)


class UserOut(UserBase):               # what the client RECEIVES
    model_config = ConfigDict(from_attributes=True)   # can read ORM objects too
    id: int
    created_at: datetime


class UserInDB(UserOut):               # internal: never returned as-is
    password_hash: str
    is_admin: bool = False


FAKE_DB: dict[int, UserInDB] = {}


def fake_hash(pw: str) -> str:         # real hashing: Python Backend III
    return "hashed:" + pw[::-1]


@app.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate) -> UserInDB:
    # We return the INTERNAL model on purpose; response_model filters it to UserOut.
    user = UserInDB(id=len(FAKE_DB) + 1, email=body.email, full_name=body.full_name,
                    created_at=datetime.now(timezone.utc),
                    password_hash=fake_hash(body.password))
    FAKE_DB[user.id] = user
    return user                        # password_hash and is_admin are dropped


@app.get("/users")
def list_users() -> list[UserOut]:     # return annotation also acts as response model
    return [UserOut.model_validate(u.model_dump()) for u in FAKE_DB.values()]`
      },
      {
        lang: 'python', run: true, title: 'Runnable: filtering output through a declared shape (stdlib dataclasses)',
        code: `from dataclasses import dataclass, fields, asdict
from datetime import datetime, timezone

@dataclass
class UserOut:                 # the "summary form": only these leave the server
    id: int
    email: str
    full_name: str
    created_at: str

def to_response(data: dict, model) -> dict:
    allowed = [f.name for f in fields(model)]
    missing = [n for n in allowed if n not in data]
    if missing:
        # FastAPI raises ResponseValidationError -> 500: a server bug, not a client one
        raise ValueError(f"response is missing {missing}")
    return asdict(model(**{n: data[n] for n in allowed}))

row = {"id": 7, "email": "asha@example.com", "full_name": "Asha",
       "created_at": datetime(2026, 10, 1, tzinfo=timezone.utc).isoformat(),
       "password_hash": "$argon2id$v=19$...", "is_admin": True}

print(to_response(row, UserOut))          # hash and is_admin are gone
try:
    to_response({"id": 1}, UserOut)
except ValueError as e:
    print("500 Internal Server Error:", e)`
      }
    ],
    codeTitle: ['Response model filtering', 'Filtering idea (runnable)'],
    viz: {
      title: 'What leaves the server: return value → response model → JSON',
      input: 'id,email,full_name,created_at,password_hash,is_admin',
      inputLabel: 'Keys your function returns (comma separated)',
      gen: function (input) {
        var keys = String(input || '').split(',').map(function (k) { return k.trim(); }).filter(Boolean).slice(0, 10);
        if (!keys.length) throw new Error('List some keys, e.g. id,email,password_hash');
        var model = ['id', 'email', 'full_name', 'created_at'];
        var sample = { id: '7', email: '"asha@example.com"', full_name: '"Asha"', created_at: '"2026-10-01T00:00:00Z"', password_hash: '"$argon2id$..."', is_admin: 'true' };
        var frames = [];
        frames.push({ narr: 'Your function returns an object with <b>' + keys.length + '</b> keys. Some are internal. Without a response model, all of them would be sent.', parts: [{ type: 'map', label: 'Return value', entries: keys.map(function (k) { return [k, sample[k] || '"…"']; }) }, { type: 'set', label: 'UserOut declares', items: model }] });
        var out = [], dropped = [];
        keys.forEach(function (k) {
          var keep = model.indexOf(k) >= 0, hl = {};
          if (keep) out.push(k); else dropped.push(k);
          hl[k] = keep ? 'ok' : 'bad';
          frames.push({ narr: '<code>' + hesc(k) + '</code>: ' + (keep ? '<span class="c-g">declared in UserOut</span>, validated and kept.' : '<span class="c-r">not in UserOut</span>, dropped. ' + (/pass|hash|secret|token|admin/.test(k) ? 'This is exactly the leak response models prevent.' : '')), parts: [{ type: 'map', label: 'Return value', entries: keys.map(function (x) { return [x, sample[x] || '"…"']; }), hl: hl }, { type: 'set', label: 'Will be sent', items: out.slice(), hl: keep ? (function () { var h = {}; h[k] = 'ok'; return h; })() : {} }, { type: 'set', label: 'Dropped', items: dropped.slice() }] });
        });
        var missing = model.filter(function (k) { return keys.indexOf(k) < 0; });
        if (missing.length) {
          frames.push({ narr: 'UserOut requires ' + missing.map(function (k) { return '<code>' + k + '</code>'; }).join(', ') + ' but your function did not return it. That is a <b>server bug</b>: FastAPI raises <code>ResponseValidationError</code> and the client gets <b>500</b>, not 422.', parts: [{ type: 'set', label: 'Missing required output fields', items: missing, hl: (function () { var h = {}; missing.forEach(function (k) { h[k] = 'bad'; }); return h; })() }, { type: 'vars', label: 'Response', vals: { status: 500 }, hl: { status: 'bad' } }] });
        } else {
          frames.push({ narr: 'All required output fields are present. FastAPI serialises only the kept fields to JSON.', parts: [{ type: 'text', label: 'JSON sent', html: '<code>{' + out.map(function (k) { return '"' + k + '": ' + hesc(sample[k] || '"…"'); }).join(', ') + '}</code>' }, { type: 'vars', label: 'Response', vals: { status: 200, fields_sent: out.length, fields_dropped: dropped.length }, hl: { status: 'ok' } }] });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Return annotation vs response_model',
        html: `<p><code>def get_user(user_id: int) -&gt; UserOut</code> works when you really build a <code>UserOut</code>. If you return a <code>UserInDB</code> (a subclass with extra fields), FastAPI still filters to <code>UserOut</code> because it validates through the declared type. If you return a plain <code>dict</code>, a type checker like mypy complains about the annotation, so use <code>@app.get(..., response_model=UserOut)</code> with <code>-&gt; dict</code> or <code>-&gt; Any</code>. Rule: <b>response_model for "filter this", annotation for "this is exactly what I return"</b>.</p>`
      },
      {
        title: 'Update model with all-optional fields',
        html: `<p>For <code>PATCH /users/{id}</code> (PATCH semantics are in Backend 4), make every field optional and apply only what was sent: <code>body.model_dump(exclude_unset=True)</code>. A field the client did not send stays untouched; a field sent as <code>null</code> is set to null on purpose.</p>`,
        code: { lang: 'python', code: `from pydantic import BaseModel, Field


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=500)


def apply_patch(current: dict, patch: UserUpdate) -> dict:
    changes = patch.model_dump(exclude_unset=True)   # only keys the client sent
    return {**current, **changes}` }
      },
      {
        title: 'A paginated wrapper as the response model',
        html: `<p>Lists should be wrapped so you can add metadata later without breaking clients. <code>class Page(BaseModel, Generic[T])</code> is possible, but a concrete <code>class UserPage(BaseModel): items: list[UserOut]; total: int; next: str | None</code> is simpler and shows nicely in docs. Returning a bare list makes adding <code>total</code> a breaking change.</p>`,
        code: { lang: 'python', code: `from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    email: str


class UserPage(BaseModel):
    items: list[UserOut]
    total: int
    limit: int
    offset: int
    next: str | None = None` }
      },
      {
        title: 'Responses that are not JSON models',
        html: `<p>Downloading a CSV, redirecting, or sending HTML: return <code>StreamingResponse</code>, <code>RedirectResponse</code>, <code>HTMLResponse</code> or <code>FileResponse</code>. FastAPI passes a <code>Response</code> object through untouched (no filtering, no validation). Annotating <code>-&gt; RedirectResponse</code> is fine; for union returns like <code>-&gt; Response | dict</code> set <code>response_model=None</code>.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Output validation cost and failure.</b> FastAPI runs your return value through the response model's validator and then its serializer. In Pydantic v2 this is fast, and FastAPI (since 0.100+) can serialize straight to JSON in Rust. If the data does not fit (a required field missing, wrong type), FastAPI raises <code>ResponseValidationError</code>, logged as a server error, and the client sees 500. That is correct: the client did nothing wrong.</p>
      <p><b>Serialization details.</b> <code>datetime</code> becomes ISO 8601 strings, <code>Decimal</code> becomes a string or number depending on config, <code>UUID</code> a string, <code>Enum</code> its value. Customise with <code>@field_serializer</code> or <code>Field(serialization_alias="createdAt")</code>; enable camelCase for a whole model with <code>model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)</code> and FastAPI uses <code>by_alias=True</code> by default for responses.</p>
      <p><b>Inheritance trap.</b> If <code>UserOut</code> inherits from <code>UserCreate</code> you inherit the password field. Build hierarchies from a <b>shared base without secrets</b> (<code>UserBase</code>), then add input-only fields to the create model and output-only fields to the out model.</p>
      <p><b>ORM objects and lazy loading.</b> With <code>from_attributes=True</code>, reading a relationship attribute during serialization can trigger extra database queries (the N+1 problem from Backend 8) or fail with async SQLAlchemy. Load what the response needs before returning (Python Backend II).</p>`,
    aiEra: `<p>🤖 A very common AI-written bug is <code>return user</code> from an endpoint with no response model, where <code>user</code> is the ORM row, so the hash goes out. Another is one model used for both input and output, so clients can send <code>id</code> or <code>is_admin</code>. When you review generated endpoints, list for each route: input model, output model, and which internal fields exist. Ask the assistant: "For each endpoint, show the exact JSON keys that can be returned, and confirm no field named like password, hash, token, secret or internal is present." Pair it with a test that asserts the response keys exactly; that test will catch the leak even after future AI edits.</p>`
  });

  /* =====================================================================
     TOPIC 5 — Status codes, HTTPException and exception handlers
     ===================================================================== */
  topics.push({
    title: 'Status Codes, HTTPException and Custom Exception Handlers',
    analogy: `<p>At an <b>airport check-in desk</b>, there is a fixed set of answers: "here is your boarding pass" (200), "new booking created" (201), "you are not on this flight" (404), "your bag is too heavy" (422), "the flight is full" (409), "our system is down" (500). The desk does not invent a new speech for every problem. It picks a standard answer and fills in a <b>short, clear reason</b>. Exception handlers are the rule book that says which problem gets which answer.</p>`,
    explain: `<p>🟢 <b>Success codes are set on the decorator.</b> The default is 200. Use the <code>status</code> module so names are readable:</p>
      <pre>@app.post("/items", status_code=status.HTTP_201_CREATED)
@app.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)</pre>
      <p>A <b>204</b> must have no body, so the function returns <code>None</code>. For a 201, also set a <code>Location</code> header (take a <code>response: Response</code> parameter and set <code>response.headers["Location"]</code>).</p>
      <p><b>Errors: raise, don't return.</b> <code>raise HTTPException(status_code=404, detail="Item not found")</code> stops the function anywhere, even deep inside a helper, and FastAPI sends <code>{"detail": "Item not found"}</code> with status 404. <code>detail</code> can be a string, dict or list. You can add <code>headers={"WWW-Authenticate": "Bearer"}</code> or <code>{"Retry-After": "30"}</code>.</p>
      <p><b>Better: domain exceptions + handlers.</b> Services should not know about HTTP. They raise <code>ItemNotFound</code> or <code>OutOfStock</code>. One place maps them to HTTP:</p>
      <pre>@app.exception_handler(ItemNotFound)
async def not_found_handler(request: Request, exc: ItemNotFound):
    return JSONResponse(status_code=404, content={...})</pre>
      ${H.table(['Situation', 'Code', 'Who raises it'], [
        ['Bad JSON / failed Pydantic validation', '<b>422</b>', 'FastAPI automatically (<code>RequestValidationError</code>)'],
        ['Missing / invalid credentials', '<b>401</b> + <code>WWW-Authenticate</code>', 'auth dependency (Python Backend III)'],
        ['Logged in but not allowed', '<b>403</b>', 'permission dependency'],
        ['Resource does not exist', '<b>404</b>', 'your code / domain handler'],
        ['Duplicate email, version conflict, wrong state', '<b>409</b>', 'domain handler'],
        ['Well-formed but breaks a business rule', '<b>422</b> or <b>409</b> (be consistent)', 'domain handler'],
        ['Too many requests', '<b>429</b> + <code>Retry-After</code>', 'rate limiter'],
        ['Unhandled crash', '<b>500</b>', 'Starlette catches it; never leak the traceback']
      ])}
      <p><b>One error shape everywhere.</b> Backend 4 recommended RFC 9457 <code>application/problem+json</code> (<code>type, title, status, detail, instance</code>). In FastAPI you get there by overriding handlers for <code>HTTPException</code> and <code>RequestValidationError</code>, plus one for your domain base class.</p>`,
    clues: [
      '"Return 201 for create, 204 for delete" → <code>status_code=status.HTTP_201_CREATED</code> on the decorator, <code>None</code> body for 204',
      '"Service layer must not import FastAPI" → domain exceptions + <code>@app.exception_handler(DomainError)</code>',
      '"All errors must use the same JSON format" → override handlers for <code>StarletteHTTPException</code>, <code>RequestValidationError</code> and a catch-all',
      '"Return 400 instead of 422 for validation errors" → custom <code>RequestValidationError</code> handler (and say why you would or would not)',
      '"Don\'t leak stack traces" → generic 500 handler that logs the exception with a request id and returns a neutral message',
      '"Unauthorized response must ask for a token" → <code>HTTPException(401, headers={"WWW-Authenticate": "Bearer"})</code>'
    ],
    code: [
      {
        lang: 'python', title: 'Status codes, HTTPException, domain exceptions and problem+json handlers',
        code: `import logging
import uuid

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("api")
app = FastAPI()


# ---- domain errors: plain Python, no HTTP inside ----
class DomainError(Exception):
    status = 400
    title = "Bad request"

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class NotFound(DomainError):
    status, title = 404, "Not found"


class Conflict(DomainError):
    status, title = 409, "Conflict"


class OutOfStock(Conflict):
    title = "Out of stock"


def problem(status_code: int, title: str, detail, request: Request) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        media_type="application/problem+json",
        content={"type": "about:blank", "title": title, "status": status_code,
                 "detail": detail, "instance": str(request.url.path)},
    )


@app.exception_handler(DomainError)                 # also catches every subclass
async def domain_handler(request: Request, exc: DomainError):
    return problem(exc.status, exc.title, exc.detail, request)


@app.exception_handler(StarletteHTTPException)      # HTTPException + router 404/405
async def http_handler(request: Request, exc: StarletteHTTPException):
    resp = problem(exc.status_code, "HTTP error", exc.detail, request)
    if exc.headers:
        resp.headers.update(exc.headers)
    return resp


@app.exception_handler(RequestValidationError)      # bad body / query / path
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = [{"loc": e["loc"], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return problem(422, "Validation failed", errors, request)


@app.exception_handler(Exception)                   # last resort: no traceback to client
async def crash_handler(request: Request, exc: Exception):
    ref = uuid.uuid4().hex[:8]
    log.exception("unhandled error ref=%s", ref)
    return problem(500, "Internal error", f"Something went wrong (ref {ref})", request)


# ---- routes ----
STOCK = {"PEN-001": 3}


class ItemIn(BaseModel):
    sku: str
    qty: int


@app.post("/reservations", status_code=status.HTTP_201_CREATED)
def reserve(body: ItemIn, response: Response) -> dict:
    if body.sku not in STOCK:
        raise NotFound(f"sku {body.sku} does not exist")
    if STOCK[body.sku] < body.qty:
        raise OutOfStock(f"only {STOCK[body.sku]} left")
    STOCK[body.sku] -= body.qty
    response.headers["Location"] = "/reservations/1"
    return {"id": 1, "sku": body.sku, "qty": body.qty}


@app.delete("/reservations/{rid}", status_code=status.HTTP_204_NO_CONTENT)
def cancel(rid: int) -> None:
    if rid != 1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No such reservation")
    return None                                     # 204: no body`
      },
      {
        lang: 'python', run: true, title: 'Runnable: how the handler is chosen (most specific class in the MRO wins)',
        code: `# Starlette looks up handlers by walking type(exc).__mro__ and taking the first registered class.
class DomainError(Exception): pass
class NotFound(DomainError): pass
class Conflict(DomainError): pass
class OutOfStock(Conflict): pass

HANDLERS = {
    DomainError: lambda e: (400, "domain: " + str(e)),
    Conflict:    lambda e: (409, "conflict: " + str(e)),
    NotFound:    lambda e: (404, "not found: " + str(e)),
    Exception:   lambda e: (500, "internal error"),     # never echo str(e) for crashes
}

def handle(exc: Exception):
    for cls in type(exc).__mro__:
        if cls in HANDLERS:
            return cls.__name__, HANDLERS[cls](exc)
    raise exc

for exc in [NotFound("sku 9"), OutOfStock("only 2 left"), DomainError("bad coupon"),
            KeyError("price")]:
    print(type(exc).__name__.ljust(11), "->", handle(exc))`
      }
    ],
    codeTitle: ['Errors done properly', 'Handler lookup (runnable)'],
    viz: {
      title: 'An exception travels to its handler',
      input: 'OutOfStock',
      inputLabel: 'Raise one of: NotFound, OutOfStock, Conflict, HTTPException404, ValidationError, KeyError',
      gen: function (input) {
        var e = String(input || '').trim();
        var M = {
          NotFound: { mro: ['NotFound', 'DomainError', 'Exception'], handler: 'DomainError', status: 404, title: 'Not found', where: 'service' },
          OutOfStock: { mro: ['OutOfStock', 'Conflict', 'DomainError', 'Exception'], handler: 'DomainError', status: 409, title: 'Out of stock', where: 'service' },
          Conflict: { mro: ['Conflict', 'DomainError', 'Exception'], handler: 'DomainError', status: 409, title: 'Conflict', where: 'service' },
          HTTPException404: { mro: ['HTTPException (FastAPI)', 'StarletteHTTPException', 'Exception'], handler: 'StarletteHTTPException', status: 404, title: 'HTTP error', where: 'route' },
          ValidationError: { mro: ['RequestValidationError', 'ValidationException', 'Exception'], handler: 'RequestValidationError', status: 422, title: 'Validation failed', where: 'fastapi' },
          KeyError: { mro: ['KeyError', 'LookupError', 'Exception'], handler: 'Exception', status: 500, title: 'Internal error', where: 'service' }
        };
        if (!M[e]) throw new Error('Pick one of: ' + Object.keys(M).join(', '));
        var x = M[e];
        var nodes = [bx('client', 'Client', 8, 30, 12), bx('fa', 'FastAPI validation', 30, 12, 16), bx('route', 'route function', 30, 48, 14), bx('svc', 'service layer', 55, 48, 14), bx('exm', 'ExceptionMiddleware', 62, 12, 18), bx('h', 'handler', 88, 30, 12)];
        var edges = [['client', 'fa'], ['fa', 'route'], ['route', 'svc'], ['svc', 'exm'], ['route', 'exm'], ['fa', 'exm'], ['exm', 'h'], ['h', 'client']];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 60, label: 'Where the error goes', nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        var handlers = ['DomainError', 'StarletteHTTPException', 'RequestValidationError', 'Exception'];
        var frames = [];
        frames.push({ narr: 'A request arrives. FastAPI validates it before calling your code.', parts: [g({ client: 'cur' }, { 'client-fa': 'ok' }), { type: 'set', label: 'Registered handlers', items: handlers }] });
        var raiser = x.where === 'fastapi' ? 'fa' : x.where === 'route' ? 'route' : 'svc';
        if (x.where === 'fastapi') {
          frames.push({ narr: 'The body fails the Pydantic model. FastAPI raises <code>RequestValidationError</code> itself; your route is <b>never called</b>.', parts: [g({ fa: 'bad' }, { 'client-fa': 'ok' })] });
        } else {
          frames.push({ narr: 'Validation passed; the route runs and calls the service.', parts: [g({ fa: 'done', route: 'cur' }, { 'fa-route': 'ok' })] });
          frames.push({ narr: x.where === 'route' ? 'The route raises <code>HTTPException(404, "No such reservation")</code>. Raising stops the function immediately.' : 'Deep inside the service, <code>' + e + '</code> is raised. The service knows nothing about HTTP; it just signals a problem.', parts: [g({ route: x.where === 'route' ? 'bad' : 'done', svc: x.where === 'route' ? '' : 'bad' }, { 'route-svc': 'ok' })] });
        }
        frames.push({ narr: 'The exception bubbles up through every function until <b>ExceptionMiddleware</b> catches it. It walks the class chain (MRO) of the exception: <code>' + x.mro.join(' → ') + '</code>.', parts: [g({ exm: 'cur' }, (function () { var h = {}; h[raiser + '-exm'] = 'bad'; return h; })()), { type: 'array', label: 'MRO of ' + hesc(e), values: x.mro, hl: (function () { var h = {}; h[x.mro.indexOf(x.handler === 'StarletteHTTPException' ? 'StarletteHTTPException' : x.handler)] = 'ok'; return h; })() }] });
        frames.push({ narr: 'First class in that chain with a registered handler: <b>' + x.handler + '</b>. ' + (x.handler === 'Exception' ? 'Nothing more specific matched, so the catch-all handles it: log the traceback with a reference id, send a neutral message.' : 'That handler builds the response.'), parts: [g({ h: 'cur' }, { 'exm-h': 'ok' }), { type: 'set', label: 'Registered handlers', items: handlers, hl: (function () { var h = {}; h[x.handler] = 'sel'; return h; })() }] });
        frames.push({ narr: 'The client receives <b>' + x.status + '</b> as <code>application/problem+json</code>. Same shape as every other error in the API.', parts: [g({ client: x.status >= 500 ? 'bad' : 'ok' }, { 'h-client': 'ok' }), { type: 'map', label: 'Response body', entries: [['type', 'about:blank'], ['title', x.title], ['status', String(x.status)], ['detail', x.status === 500 ? 'Something went wrong (ref 3f9a1c2e)' : x.status === 422 ? '[{loc, msg, type}, ...]' : 'human-readable reason'], ['instance', '/reservations']] }] });
        return frames;
      }
    },
    examples: [
      {
        title: '201 with a Location header',
        html: `<p>For <code>POST /items</code>: decorator <code>status_code=201</code>, a <code>response: Response</code> parameter, and <code>response.headers["Location"] = f"/items/{item.id}"</code>. FastAPI merges headers you set on that injected response into the final one. Clients (and Backend 4's REST rules) use Location to find the new resource without guessing.</p>`
      },
      {
        title: 'HTTPException deep inside a helper',
        html: `<p>A helper <code>get_item_or_404(item_id)</code> can raise <code>HTTPException(404)</code> and every route using it gets the right behaviour without an if-statement. It is handy, but it ties the helper to HTTP. Fine inside the API layer (<code>api/deps.py</code>); in the service layer prefer domain exceptions.</p>`,
        code: { lang: 'python', code: `from fastapi import HTTPException, status

ITEMS = {1: {"id": 1, "name": "pen"}}


def get_item_or_404(item_id: int) -> dict:
    item = ITEMS.get(item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Item {item_id} not found")
    return item` }
      },
      {
        title: 'Choosing codes for tricky cases',
        html: `${H.table(['Case', 'Code', 'Why'], [['Email already registered', '409', 'conflicts with current state of the users collection'], ['Order cannot be cancelled after shipping', '409', 'resource is in the wrong state'], ['<code>limit=1000</code> but max is 100', '422', 'FastAPI <code>Query(le=100)</code> does it for you'], ['Item exists but belongs to another tenant', '404', 'do not reveal it exists'], ['Upstream payment gateway timed out', '502/504', 'not the client\'s fault, may retry'], ['Async job accepted', '202', 'work happens later; return a status URL']])}`
      },
      {
        title: 'Keeping the default 422 vs switching to 400',
        html: `<p>Some teams' clients expect 400 for every bad input. You can register a <code>RequestValidationError</code> handler that returns 400. Trade-off: 422 is the FastAPI and OpenAPI default, generated clients expect it, and it separates "malformed request" (400, e.g. invalid JSON syntax at a proxy) from "well-formed but invalid" (422). Pick one, document it, and keep it the same on every route.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Two HTTPException classes.</b> FastAPI's <code>HTTPException</code> subclasses Starlette's and allows any JSON-able <code>detail</code>. The router itself raises <b>Starlette's</b> class for 404/405. So register your handler on <code>starlette.exceptions.HTTPException</code> to catch both. If your handler wants the default behaviour for some cases, import and call <code>fastapi.exception_handlers.http_exception_handler</code>.</p>
      <p><b>Where 500s come from.</b> A handler for <code>Exception</code> (or 500) is installed on <code>ServerErrorMiddleware</code>, the outermost layer. It still runs your handler, but the exception is <b>re-raised afterwards</b> so the server logs it. In debug mode (<code>FastAPI(debug=True)</code>) Starlette shows a traceback page: never enable that in production.</p>
      <p><b>Errors after the response started.</b> With <code>StreamingResponse</code>, once the status line and headers are sent, an exception cannot change the status code; the connection just breaks. Validate everything before you start streaming.</p>
      <p><b>Exceptions in dependencies with yield.</b> An exception raised in your route passes through the dependency's <code>yield</code>, so a <code>try/except/finally</code> there can roll back a transaction. If you catch it in the dependency, re-raise it (or raise a new one); if you swallow it, FastAPI never learns about the error and the client gets a generic 500 with the real cause hidden.</p>
      <p><b>Security.</b> Never put <code>str(exc)</code> of an unexpected exception into a response: it can contain SQL, file paths or secrets. Log it with a correlation id; send the id to the client.</p>`,
    aiEra: `<p>🤖 Generated FastAPI code tends to wrap every route body in <code>try: ... except Exception as e: raise HTTPException(500, str(e))</code>. That leaks internals, turns real 404/409 cases into 500s, and hides bugs from your error tracker. Replace it with domain exceptions plus central handlers. When you ask AI for help, give it your error contract: "Every error must be problem+json with type, title, status, detail; list which domain exceptions map to which status." Then ask it to generate a table-driven test hitting each error path. Also, AI agents that call your API (tool use, MCP servers) rely heavily on clear <code>detail</code> messages and correct status codes to decide whether to retry; a precise 409 with "only 2 left" is far more useful to an agent than a bare 400.</p>`,
    problems: [
      {
        title: 'Map Domain Errors to Status Codes',
        level: 'Easy', tags: ['status codes', 'exception handlers', 'mro'], companies: ['Flipkart', 'Stripe'],
        statement: `<p>Your service raises these domain errors: <code>DomainError</code> (base), <code>NotFound</code>, <code>Conflict</code>, <code>OutOfStock</code> (a kind of Conflict), <code>PermissionDenied</code>, <code>RateLimited</code>. Write <code>status_for(error_name)</code> returning the HTTP status your exception handler should use. Unknown names are bugs and map to 500. The hierarchy must be respected: a subclass with no own mapping uses its parent's code.</p>`,
        constraints: `Names are case-sensitive. Mapping: DomainError 400, NotFound 404, Conflict 409, PermissionDenied 403, RateLimited 429. OutOfStock has no own entry.`,
        example: `${H.table(['error_name', 'status', 'why'], [['"NotFound"', '404', 'direct mapping'], ['"OutOfStock"', '409', 'inherits from Conflict'], ['"KeyError"', '500', 'not a domain error: a crash']])}`,
        brute: {
          why: `<p>A long <code>if/elif</code> chain with one branch per class. Every new subclass needs a new branch, and forgetting one sends a 500 for a normal business case. It also duplicates what the class hierarchy already says.</p>`,
          code: { lang: 'python', code: `def status_for(error_name: str) -> int:
    if error_name == "NotFound":
        return 404
    elif error_name == "Conflict":
        return 409
    # forgot OutOfStock -> 500 for a normal "sold out" case
    return 500` }
        },
        mcq: { q: 'Starlette has handlers for <code>DomainError</code> and <code>Conflict</code>. <code>OutOfStock(Conflict)</code> is raised. Which handler runs?', options: ['Conflict: the first registered class found walking the MRO', 'DomainError: base classes win', 'Both, in order', 'Neither; only exact classes match'], answer: 0, explain: 'The lookup walks type(exc).__mro__ = OutOfStock, Conflict, DomainError, Exception and stops at the first class that has a handler.' },
        hints: [
          `<p>Hint 1: store the hierarchy as a <code>parent</code> dict (<code>{"OutOfStock": "Conflict", "Conflict": "DomainError", ...}</code>) and the codes as a <code>codes</code> dict.</p>`,
          `<p>Hint 2: walk up from the name: if it has a code return it, else move to its parent. That is the MRO walk.</p>`,
          `<p>Hint 3: names not in the hierarchy at all are not domain errors → 500. Guard against loops by stopping when there is no parent.</p>`
        ],
        solution: {
          approach: `<p>Model exactly what Starlette does: walk the class chain from the most specific class upward and return the first mapped status. Unknown names fall through to the catch-all 500. Adding a new subclass now needs only one entry in <code>PARENT</code>, and it automatically gets its parent's code until you give it its own.</p>`,
          code: { lang: 'python', run: true, code: `PARENT = {
    "NotFound": "DomainError",
    "Conflict": "DomainError",
    "OutOfStock": "Conflict",
    "PermissionDenied": "DomainError",
    "RateLimited": "DomainError",
    "DomainError": None,
}
CODES = {"DomainError": 400, "NotFound": 404, "Conflict": 409,
         "PermissionDenied": 403, "RateLimited": 429}


def status_for(error_name: str) -> int:
    if error_name not in PARENT:
        return 500                        # not a domain error: an unexpected crash
    cls = error_name
    while cls is not None:                # walk the "MRO" upward
        if cls in CODES:
            return CODES[cls]
        cls = PARENT[cls]
    return 500


for name in ["NotFound", "OutOfStock", "RateLimited", "DomainError", "KeyError"]:
    print(name, status_for(name))` },
          dry: { head: ['input', 'chain walked', 'result'], rows: [['NotFound', 'NotFound ✔', '404'], ['OutOfStock', 'OutOfStock ✘ → Conflict ✔', '409'], ['KeyError', 'not in hierarchy', '500']] },
          complexity: `<p>O(depth of hierarchy) per lookup, tiny. Starlette caches nothing here either; the MRO is short.</p>`,
          followUps: ['How would you include a machine-readable <code>type</code> URI per error in the problem+json body?', 'Should PermissionDenied ever become 404 instead of 403?']
        },
        tests: { fn: 'statusFor', names: { python: 'status_for' }, sig: 'string -> int', cases: [[['NotFound'], 404], [['OutOfStock'], 409], [['Conflict'], 409], [['PermissionDenied'], 403], [['RateLimited'], 429], [['DomainError'], 400], [['KeyError'], 500], [['notfound'], 500]] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Dependency injection with Depends
     ===================================================================== */
  topics.push({
    title: 'Dependency Injection with Depends: Sessions, Current User, Pagination and Overrides',
    analogy: `<p>A <b>film set</b>: the actor (your route) just says "I need a costume, a script and a microphone". The crew (FastAPI) prepares each item, in the right order, before the scene, and cleans up after. If two actors need the same microphone in one scene, the crew brings <b>one</b>, not two. For a rehearsal (a test), the crew can swap the real microphone for a fake one without the actor noticing.</p>`,
    explain: `<p>🟢 <b>A dependency is a function your route needs to run first.</b> You declare it in the signature, FastAPI calls it, and passes the result in:</p>
      <pre>def pagination(limit: int = 20, offset: int = 0) -> dict:
    return {"limit": min(limit, 100), "offset": offset}

@app.get("/items")
def list_items(page: Annotated[dict, Depends(pagination)]):
    ...</pre>
      <p>The dependency can itself take query params, headers, the body, or <b>other dependencies</b>. FastAPI builds the whole tree, resolves it per request, and documents every parameter in OpenAPI.</p>
      <p><b>Name the dependency once with <code>Annotated</code>:</b> <code>SessionDep = Annotated[Session, Depends(get_session)]</code>. Then every route just writes <code>session: SessionDep</code>. This is the style the FastAPI docs recommend since 0.95.</p>
      ${H.table(['Pattern', 'What it gives you'], [
        ['<code>def get_settings()</code> + <code>@lru_cache</code>', 'config loaded once, injectable, overridable in tests'],
        ['<code>def get_session(): ... yield session ... finally: close</code>', 'one DB session per request, always closed (yield dependency)'],
        ['<code>get_current_user(token=Depends(oauth2), session=SessionDep)</code>', 'auth: chain of dependencies (Python Backend III)'],
        ['<code>class Pagination: def __init__(self, limit: int = 20, offset: int = 0)</code>', 'a class as dependency: <code>Depends(Pagination)</code>'],
        ['<code>APIRouter(dependencies=[Depends(require_api_key)])</code>', 'run a check on every route of a router, ignore the value'],
        ['<code>app.dependency_overrides[get_session] = fake_session</code>', 'swap real things for fakes in tests']
      ])}
      <p><b>Per-request cache.</b> If <code>get_current_user</code> and <code>get_permissions</code> both depend on <code>get_session</code>, FastAPI calls <code>get_session</code> <b>once</b> for that request and gives both the same object. Use <code>Depends(fn, use_cache=False)</code> if you really need a fresh call.</p>
      <p><b>Yield dependencies</b> are like a <code>with</code> block around your request: code before <code>yield</code> is setup, the yielded value is injected, code after <code>yield</code> (put it in <code>finally</code>) is cleanup, and an exception from the route is re-raised at the <code>yield</code> so you can roll back.</p>`,
    clues: [
      '"Share a DB session / HTTP client / settings across routes" → dependency with <code>Depends</code>, often a yield dependency',
      '"Every route needs the current user" → <code>CurrentUser = Annotated[User, Depends(get_current_user)]</code>',
      '"How do you test without the real database?" → <code>app.dependency_overrides[get_session] = ...</code>',
      '"Apply an API-key check to a whole router" → <code>APIRouter(dependencies=[Depends(check_key)])</code>',
      '"Two dependencies need the same object in one request" → per-request dependency cache (default <code>use_cache=True</code>)',
      '"Close the session even when the route fails" → <code>try: yield ... finally: close()</code>'
    ],
    code: [
      {
        lang: 'python', title: 'Settings, session (yield), current user, pagination class, router-level checks',
        code: `from functools import lru_cache
from typing import Annotated, Iterator

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query, status
from pydantic import BaseModel


# ---- settings: loaded once, injectable ----
class Settings(BaseModel):
    api_key: str = "dev-key"          # real apps: pydantic-settings from env (Python Backend III)
    max_page_size: int = 100


@lru_cache
def get_settings() -> Settings:
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]


# ---- a fake session with explicit open/close so you can see the lifecycle ----
class Session:
    def __init__(self) -> None:
        self.open = True

    def close(self) -> None:
        self.open = False


def get_session() -> Iterator[Session]:
    session = Session()               # setup (once per request)
    try:
        yield session                 # injected into the route
    finally:
        session.close()               # cleanup, even if the route raised


SessionDep = Annotated[Session, Depends(get_session)]


# ---- current user: depends on a header AND on the session ----
class User(BaseModel):
    id: int
    name: str


def get_current_user(session: SessionDep,
                     x_user_id: Annotated[int | None, Header()] = None) -> User:
    if x_user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-User-Id",
                            headers={"WWW-Authenticate": "Bearer"})
    return User(id=x_user_id, name=f"user{x_user_id}")


CurrentUser = Annotated[User, Depends(get_current_user)]


# ---- a class as a dependency ----
class Pagination:
    def __init__(self, settings: SettingsDep,
                 limit: Annotated[int, Query(ge=1)] = 20,
                 offset: Annotated[int, Query(ge=0)] = 0) -> None:
        self.limit = min(limit, settings.max_page_size)
        self.offset = offset


PageDep = Annotated[Pagination, Depends()]   # Depends() with no arg = use the annotated class


# ---- router-level check: value ignored, just must not raise ----
def require_api_key(settings: SettingsDep,
                    x_api_key: Annotated[str | None, Header()] = None) -> None:
    if x_api_key != settings.api_key:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid API key")


router = APIRouter(prefix="/orders", tags=["orders"],
                   dependencies=[Depends(require_api_key)])


@router.get("")
def list_orders(user: CurrentUser, page: PageDep, session: SessionDep) -> dict:
    # get_session ran ONCE: 'session' here is the same object get_current_user received.
    return {"user": user.name, "limit": page.limit, "offset": page.offset,
            "session_open": session.open}


app = FastAPI()
app.include_router(router)`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a mini dependency resolver (signature inspection, per-request cache, yield cleanup)',
        code: `import inspect
from contextlib import ExitStack, contextmanager

class Depends:
    def __init__(self, fn):
        self.fn = fn

def resolve(fn, request: dict, cache: dict, stack: ExitStack, depth=0):
    """Call fn, first resolving every parameter it declares."""
    kwargs = {}
    for name, param in inspect.signature(fn).parameters.items():
        if isinstance(param.default, Depends):
            dep = param.default.fn
            if dep not in cache:                       # per-request cache
                print("  " * depth + "resolve", dep.__name__)
                cache[dep] = resolve(dep, request, cache, stack, depth + 1)
            else:
                print("  " * depth + "cached ", dep.__name__)
            kwargs[name] = cache[dep]
        else:
            kwargs[name] = request.get(name, param.default)   # "query param"
    result = fn(**kwargs)
    if inspect.isgenerator(result):                    # yield dependency
        result = stack.enter_context(contextmanager(lambda: result)())
    return result

def get_session():
    print("    open session")
    try:
        yield {"id": "S1"}
    finally:
        print("    close session")

def get_user(session=Depends(get_session), user_id=0):
    return {"id": user_id, "via": session["id"]}

def list_orders(user=Depends(get_user), session=Depends(get_session), limit=20):
    return f"orders for user {user['id']} (session {session['id']}), limit {limit}"

with ExitStack() as stack:                             # one request
    print(resolve(list_orders, {"user_id": 7, "limit": 5}, {}, stack))
print("request finished")`
      }
    ],
    codeTitle: ['Real dependency patterns', 'Mini resolver (runnable)'],
    viz: {
      title: 'Resolving the dependency tree for one request',
      input: 'cache on',
      inputLabel: 'Per-request cache: "cache on" or "cache off" (use_cache=False)',
      gen: function (input) {
        var t = String(input || '').toLowerCase();
        if (t.indexOf('on') < 0 && t.indexOf('off') < 0) throw new Error('Type "cache on" or "cache off"');
        var cacheOn = t.indexOf('off') < 0;
        var nodes = [bx('route', 'list_orders', 50, 6, 16), bx('user', 'get_current_user', 22, 26, 18), bx('page', 'Pagination', 78, 26, 14), bx('sess', 'get_session', 22, 50, 14), bx('set', 'get_settings', 78, 50, 14)];
        var edges = [['route', 'user'], ['route', 'page'], ['route', 'sess'], ['user', 'sess'], ['page', 'set']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 60, label: 'Dependency graph (arrow = "needs")', nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        var calls = [], cache = [], frames = [];
        function st(extra) { return [{ type: 'stack', label: 'Cleanup stack (after-yield code)', items: extra.slice() }, { type: 'map', label: 'Per-request cache', entries: cache.map(function (c) { return [c, 'value']; }) }, { type: 'array', label: 'Calls made (in order)', values: calls.length ? calls.slice() : ['(none)'] }]; }
        var cleanup = [];
        frames.push({ narr: 'At startup FastAPI read <code>list_orders</code>\'s signature and built this graph. Now a request arrives. It resolves <b>depth-first</b>: children before parents.', parts: [g({ route: 'cur' })].concat(st(cleanup)) });
        calls.push('get_session'); cleanup.push('close session #1'); if (cacheOn) cache.push('get_session');
        frames.push({ narr: '<code>get_current_user</code> needs a session. <code>get_session()</code> runs up to its <code>yield</code>: session #1 is opened. Its cleanup is pushed on the stack.', parts: [g({ user: 'cur', sess: 'ok' }, { 'user-sess': 'ok' })].concat(st(cleanup)) });
        calls.push('get_current_user'); if (cacheOn) cache.push('get_current_user');
        frames.push({ narr: '<code>get_current_user(session, x_user_id)</code> runs and returns the User. (If the header were missing it would raise 401 here and the route would never run.)', parts: [g({ user: 'ok', sess: 'done' }, { 'route-user': 'ok' })].concat(st(cleanup)) });
        calls.push('get_settings'); if (cacheOn) cache.push('get_settings');
        frames.push({ narr: '<code>Pagination</code> needs settings. <code>get_settings()</code> runs (it is also <code>@lru_cache</code>d, so across requests it is computed only once).', parts: [g({ page: 'cur', set: 'ok' }, { 'page-set': 'ok' })].concat(st(cleanup)) });
        calls.push('Pagination'); if (cacheOn) cache.push('Pagination');
        frames.push({ narr: '<code>Pagination(settings, limit, offset)</code> is constructed with the query params.', parts: [g({ page: 'ok', set: 'done' }, { 'route-page': 'ok' })].concat(st(cleanup)) });
        if (cacheOn) {
          frames.push({ narr: 'The route itself also asks for <code>SessionDep</code>. <code>get_session</code> is <b>already in the cache</b> for this request → the <b>same</b> session #1 is reused. One session, one transaction.', parts: [g({ sess: 'sel' }, { 'route-sess': 'ok' }, { sess: 'cached' })].concat(st(cleanup)) });
        } else {
          calls.push('get_session'); cleanup.push('close session #2');
          frames.push({ narr: 'With <code>use_cache=False</code> the route gets a <b>second</b> session #2. Now the user was loaded in one session and the orders in another: two connections, two transactions. Usually a bug.', parts: [g({ sess: 'bad' }, { 'route-sess': 'bad' }, { sess: 'x2' })].concat(st(cleanup)) });
        }
        calls.push('list_orders');
        frames.push({ narr: 'All inputs ready. <code>list_orders(user, page, session)</code> runs and returns.', parts: [g({ route: 'ok', user: 'done', page: 'done', sess: 'done', set: 'done' })].concat(st(cleanup)) });
        while (cleanup.length) {
          var c = cleanup.pop();
          frames.push({ narr: 'After the response is built, FastAPI unwinds the cleanup stack (last in, first out): <b>' + c + '</b> (the code after <code>yield</code>, in <code>finally</code>).', parts: [g({ sess: 'done' })].concat(st(cleanup)) });
        }
        frames.push({ narr: 'Request done. Total function calls: <b>' + calls.length + '</b>' + (cacheOn ? ' (get_session called once).' : ' (get_session called twice).') + ' The cache is thrown away; the next request starts fresh.', parts: [{ type: 'array', label: 'Calls made', values: calls.slice(), hl: (function () { var h = {}; calls.forEach(function (c, i) { if (c === 'get_session') h[i] = cacheOn ? 'ok' : 'bad'; }); return h; })() }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Swapping the database in a test',
        html: `<p>In tests you do not want the real database. Override the dependency on the app: every route that uses <code>get_session</code> now gets the fake. Clear overrides after the test. (Python Backend IV covers pytest fixtures for this.)</p>`,
        code: { lang: 'python', code: `from fastapi.testclient import TestClient

from app.api.deps import get_session
from app.main import app


class FakeSession:
    def __init__(self) -> None:
        self.rows: list[dict] = []


def fake_session():
    yield FakeSession()


def test_list_orders_uses_fake_db() -> None:
    app.dependency_overrides[get_session] = fake_session
    try:
        client = TestClient(app)
        r = client.get("/orders", headers={"X-User-Id": "7", "X-Api-Key": "dev-key"})
        assert r.status_code == 200
    finally:
        app.dependency_overrides.clear()` }
      },
      {
        title: 'A reusable "get or 404" dependency',
        html: `<p>Many routes start with "load item by id or 404". Make that a dependency that takes the path param itself. Each route then just declares <code>item: ItemDep</code>. The path parameter name in the dependency must match the template (<code>{item_id}</code>).</p>`,
        code: { lang: 'python', code: `from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

app = FastAPI()
ITEMS = {1: {"id": 1, "name": "pen"}}


def load_item(item_id: int) -> dict:            # reads the {item_id} path param
    item = ITEMS.get(item_id)
    if item is None:
        raise HTTPException(404, f"Item {item_id} not found")
    return item


ItemDep = Annotated[dict, Depends(load_item)]


@app.get("/items/{item_id}")
def read_item(item: ItemDep) -> dict:
    return item


@app.delete("/items/{item_id}", status_code=204)
def delete_item(item: ItemDep) -> None:
    ITEMS.pop(item["id"])` }
      },
      {
        title: 'Dependency vs middleware',
        html: `${H.table(['Need', 'Use', 'Why'], [['Current user for some routes', 'dependency', 'typed value, per route, documented in OpenAPI'], ['Request timing header on every response', 'middleware', 'wraps everything, even 404s'], ['API key on one router', 'router <code>dependencies=[...]</code>', 'scoped, shows in docs'], ['CORS, GZip', 'middleware', 'protocol-level, not business logic']])}<p>Rule: if the route needs the <b>value</b>, or only some routes need it, use a dependency.</p>`
      },
      {
        title: 'Global dependencies on the app',
        html: `<p><code>FastAPI(dependencies=[Depends(log_request_id)])</code> runs a dependency for every path operation. It is useful for a correlation id or a maintenance-mode switch. It does not run for router-level 404s (no route matched), so use middleware when you need truly every request.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How FastAPI resolves.</b> At startup, <code>get_dependant()</code> inspects each route and builds a tree of <code>Dependant</code> objects: path/query/header/cookie/body params plus sub-dependants. At request time <code>solve_dependencies()</code> walks the tree depth-first, validating params and calling each dependency. The cache key is the function plus its security scopes. Sync dependencies (<code>def</code>) run in the threadpool, async ones (<code>async def</code>) on the event loop, same as routes (Topic 7).</p>
      <p><b>Yield dependency timing.</b> Since FastAPI 0.106, the exit code of yield dependencies runs <b>before the response is sent</b> (earlier versions ran it after, which allowed using a DB session inside a background task but kept connections open too long). For <code>StreamingResponse</code> that means the session may be closed while you still stream; open what the stream needs inside the generator, or in very recent versions use the <code>scope="function"</code> / <code>scope="request"</code> option on <code>Depends</code> to choose when cleanup runs.</p>
      <p><b>Overrides are keyed by the original function object.</b> If you wrap a dependency in <code>Annotated</code> aliases, override the inner function (<code>get_session</code>), not the alias. Overrides affect the whole app object, so tests running in parallel threads on the same app can interfere: create the app per test with a factory when that matters.</p>
      <p><b>Why DI matters for design.</b> It is the same idea as Spring's IoC container from Backend 6, but explicit and function-based: no global registry, no reflection magic beyond reading signatures. Each route says exactly what it needs, which makes routes easy to read and test.</p>`,
    aiEra: `<p>🤖 AI code often creates a global <code>db = SessionLocal()</code> at import time and uses it in every route: one session shared by all requests and threads, which leaks transactions and breaks under load. Ask for "a yield dependency that creates one session per request and closes it in finally". Another frequent miss: dependencies that do heavy work (a network call) without the per-request cache, called three times per request. When you review, draw the dependency graph for one route (or ask the assistant to draw it as a list of edges) and count how many times each function runs. Dependency overrides also make AI-written tests safer: the agent can test routes with fakes without needing real credentials.</p>`,
    problems: [
      {
        title: 'Wire a Current-User Chain',
        level: 'Medium', tags: ['dependency injection', 'auth', 'testing'], companies: ['Zomato', 'PhonePe'],
        statement: `<p>Write dependencies so that routes can declare <code>user: CurrentUser</code> and <code>admin: AdminUser</code>. <code>get_current_user</code> reads a bearer token from the <code>Authorization</code> header, looks it up in a token table via a session dependency, and raises 401 (with <code>WWW-Authenticate: Bearer</code>) if missing or unknown. <code>get_admin</code> depends on the current user and raises 403 unless the role is admin. Show <code>GET /me</code>, <code>DELETE /users/{user_id}</code> (admin only, 204), and a test override that skips token lookup.</p>`,
        constraints: `Use <code>Annotated</code> aliases. The session must be created once per request and closed. No real JWT yet (Python Backend III).`,
        example: `${H.table(['Request', 'Result'], [['<code>GET /me</code> no header', '<span class="c-r">401</span> + WWW-Authenticate'], ['<code>GET /me</code> Bearer t-alice', '200 <code>{"id":1,"name":"alice","role":"user"}</code>'], ['<code>DELETE /users/2</code> Bearer t-alice', '<span class="c-r">403</span>'], ['<code>DELETE /users/2</code> Bearer t-root', '204']])}`,
        brute: {
          why: `<p>Copy the token parsing and role check into every route. Ten routes means ten copies, one of which will forget the role check. It also cannot be overridden in tests without monkeypatching.</p>`,
          code: { lang: 'python', code: `from fastapi import FastAPI, HTTPException, Request

app = FastAPI()
TOKENS = {"t-root": {"id": 9, "name": "root", "role": "admin"}}

@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, request: Request) -> None:
    token = request.headers.get("authorization", "").removeprefix("Bearer ")
    user = TOKENS.get(token)
    if not user:
        raise HTTPException(401)
    # role check copied (or forgotten) in every route` }
        },
        mcq: { q: '<code>get_admin</code> and the route both depend on <code>get_session</code>. How many sessions are created per request?', options: ['One: dependencies are cached per request', 'Two: one per declaration', 'One per worker process', 'Zero until the first query'], answer: 0, explain: 'FastAPI caches each dependency result for the duration of one request (use_cache=True by default), so the whole tree shares one session.' },
        hints: [
          `<p>Hint 1: <code>authorization: Annotated[str | None, Header()] = None</code> reads the header; strip the <code>Bearer </code> prefix with <code>removeprefix</code> after checking it starts with it.</p>`,
          `<p>Hint 2: <code>get_admin(user: CurrentUser) -&gt; User</code> is a dependency on a dependency. Then <code>AdminUser = Annotated[User, Depends(get_admin)]</code>.</p>`,
          `<p>Hint 3: in tests, <code>app.dependency_overrides[get_current_user] = lambda: User(id=1, name="t", role="admin")</code>; the token code never runs.</p>`
        ],
        solution: {
          approach: `<p>Build a small chain: <code>get_session</code> (yield, closed in finally) → <code>get_current_user</code> (header + session → User or 401) → <code>get_admin</code> (User → User or 403). Expose them as <code>Annotated</code> aliases so routes stay one line. Because of the per-request cache, everything shares one session. For tests override <code>get_current_user</code> directly, which removes the need for tokens.</p>`,
          code: { lang: 'python', code: `from typing import Annotated, Iterator

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel

app = FastAPI()


class User(BaseModel):
    id: int
    name: str
    role: str = "user"


class Session:
    TOKENS = {"t-alice": User(id=1, name="alice"), "t-root": User(id=9, name="root", role="admin")}

    def user_for_token(self, token: str) -> User | None:
        return self.TOKENS.get(token)

    def close(self) -> None:
        pass


def get_session() -> Iterator[Session]:
    s = Session()
    try:
        yield s
    finally:
        s.close()


SessionDep = Annotated[Session, Depends(get_session)]


def unauthorized(msg: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, msg, headers={"WWW-Authenticate": "Bearer"})


def get_current_user(session: SessionDep,
                     authorization: Annotated[str | None, Header()] = None) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise unauthorized("Missing bearer token")
    user = session.user_for_token(authorization.removeprefix("Bearer ").strip())
    if user is None:
        raise unauthorized("Invalid token")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_admin(user: CurrentUser) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admins only")
    return user


AdminUser = Annotated[User, Depends(get_admin)]


@app.get("/me")
def me(user: CurrentUser) -> User:
    return user


@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, admin: AdminUser, session: SessionDep) -> None:
    return None


# tests/test_users.py
def test_admin_can_delete() -> None:
    from fastapi.testclient import TestClient
    app.dependency_overrides[get_current_user] = lambda: User(id=1, name="t", role="admin")
    try:
        assert TestClient(app).delete("/users/2").status_code == 204
    finally:
        app.dependency_overrides.clear()` },
          complexity: `<p>Constant work per request: one dict lookup for the token. The dependency tree is built once at startup.</p>`,
          followUps: ['How would scopes (read:orders, write:orders) change this chain?', 'Why is 404 sometimes better than 403 for another user\'s resource?']
        },
        tests: { skip: 'framework wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — async def vs def endpoints
     ===================================================================== */
  topics.push({
    title: 'async def vs def: The Event Loop, the Threadpool and Blocking Calls',
    analogy: `<p>A <b>single chef</b> (the event loop) can cook ten dishes at once <b>if</b> they say "this needs 10 minutes in the oven, I will come back" (<code>await</code>). If one dish says "stand here and stir for 10 minutes" (a blocking call), every other dish waits. FastAPI also has a <b>team of helpers</b> (the threadpool): give the stirring job to a helper (<code>def</code> endpoint), and the chef stays free.</p>`,
    explain: `<p>🟢 <b>FastAPI accepts both kinds of route functions, and treats them differently:</b></p>
      ${H.table(['You write', 'Where it runs', 'Good for', 'Danger'], [
        ['<code>async def</code>', 'directly on the <b>event loop</b> (one thread per worker)', 'awaiting async libraries: <code>httpx.AsyncClient</code>, <code>asyncpg</code>, async SQLAlchemy, <code>redis.asyncio</code>', 'any blocking call (<code>time.sleep</code>, <code>requests.get</code>, sync DB driver, big CPU loop) <b>freezes every request</b> in that worker'],
        ['<code>def</code>', 'in a <b>threadpool</b> (AnyIO, 40 threads by default)', 'sync libraries: <code>requests</code>, sync SQLAlchemy, file I/O, most SDKs', 'only 40 run at once; the 41st waits for a free thread']
      ])}
      <p><b>The one rule:</b> inside <code>async def</code>, only call things you can <code>await</code>, or quick pure-Python code. If you must call a blocking function from <code>async def</code>, push it to a thread: <code>await asyncio.to_thread(slow_fn, arg)</code> (or <code>run_in_threadpool</code> from Starlette).</p>
      <p><b>Choosing:</b></p>
      <ul>
        <li>All your I/O libraries are async → <code>async def</code>. Most efficient: thousands of waiting requests cost almost nothing.</li>
        <li>You use sync libraries (very common: sync SQLAlchemy, boto3) → plain <code>def</code>. Totally fine and not "slow"; FastAPI handles the threads.</li>
        <li>Not sure → <code>def</code> is the safe default. A wrong <code>async def</code> is far worse than a <code>def</code>.</li>
        <li>CPU-heavy work (image resize, big JSON, ML inference) → neither helps much because of the GIL: use more worker processes, a process pool, or a task queue (Python Backend V).</li>
      </ul>
      <p><b>Dependencies follow the same rule:</b> <code>async def</code> dependencies run on the loop, <code>def</code> ones in the threadpool. You can mix them freely.</p>`,
    clues: [
      '"The whole API freezes when one endpoint is slow" → blocking call inside <code>async def</code>',
      '"Should this endpoint be async?" → only if every I/O call inside is awaitable; otherwise <code>def</code>',
      '"Call a sync SDK from an async route" → <code>await asyncio.to_thread(...)</code> / <code>run_in_threadpool</code>',
      '"Make three outbound HTTP calls concurrently" → <code>async def</code> + <code>httpx.AsyncClient</code> + <code>asyncio.gather</code>',
      '"CPU-bound endpoint (PDF, image) is slow under load" → more processes / task queue, not async',
      '"Requests queue up after ~40 concurrent slow sync calls" → threadpool limit (AnyIO default 40 tokens)'
    ],
    code: [
      {
        lang: 'python', title: 'Right and wrong ways to wait',
        code: `import asyncio
import time

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/bad")
async def bad() -> dict:
    time.sleep(2)                 # BLOCKS the event loop: every other request in this worker waits
    return {"ok": True}


@app.get("/sync-ok")
def sync_ok() -> dict:
    time.sleep(2)                 # fine: runs in a threadpool thread, the loop stays free
    return {"ok": True}


@app.get("/async-ok")
async def async_ok() -> dict:
    await asyncio.sleep(2)        # yields control while waiting
    return {"ok": True}


def legacy_sdk_call(order_id: int) -> str:   # imagine a blocking vendor SDK
    time.sleep(0.5)
    return f"status-of-{order_id}"


@app.get("/orders/{order_id}/status")
async def order_status(order_id: int) -> dict:
    # Need async elsewhere in this route, but the SDK is sync: hand it to a thread.
    status = await asyncio.to_thread(legacy_sdk_call, order_id)
    return {"order_id": order_id, "status": status}


@app.get("/dashboard")
async def dashboard() -> dict:
    # Three independent calls at the same time: total time = slowest, not the sum.
    async with httpx.AsyncClient(base_url="https://internal.example", timeout=2.0) as client:
        users, orders, stock = await asyncio.gather(
            client.get("/users/count"), client.get("/orders/today"), client.get("/stock/low"),
        )
    return {"users": users.json(), "orders": orders.json(), "stock": stock.json()}`
      },
      {
        lang: 'python', run: true, title: 'Runnable: one blocking call stalls all other "requests" on the loop',
        code: `import asyncio
import time

async def handler(name: str, blocking: bool, log: list, t0: float):
    if blocking:
        time.sleep(0.3)               # like requests.get() inside async def
    else:
        await asyncio.sleep(0.3)      # like await client.get()
    log.append((name, round(time.perf_counter() - t0, 1)))

async def serve(blocking: bool):
    log, t0 = [], time.perf_counter()
    # five requests arrive at the same moment
    await asyncio.gather(*(handler(f"req{i}", blocking, log, t0) for i in range(5)))
    return log

async def serve_with_threads():
    log, t0 = [], time.perf_counter()
    async def h(name):
        await asyncio.to_thread(time.sleep, 0.3)   # what FastAPI does for 'def' routes
        log.append((name, round(time.perf_counter() - t0, 1)))
    await asyncio.gather(*(h(f"req{i}") for i in range(5)))
    return log

print("await asyncio.sleep :", asyncio.run(serve(False)))
print("time.sleep in async :", asyncio.run(serve(True)))
print("sync work in threads:", asyncio.run(serve_with_threads()))`
      }
    ],
    codeTitle: ['Waiting correctly', 'Blocking demo (runnable)'],
    viz: {
      title: 'Event-loop timeline: 3 requests, each waits 3 ticks for I/O',
      input: 'blocking',
      inputLabel: 'Mode: blocking (time.sleep in async def), await, or thread (def route)',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (['blocking', 'await', 'thread'].indexOf(mode) < 0) throw new Error('Type blocking, await or thread');
        var T = mode === 'blocking' ? 12 : 6, reqs = ['req A', 'req B', 'req C'];
        var colHead = []; for (var c = 0; c < T; c++) colHead.push('t' + c);
        var plan = {};
        if (mode === 'blocking') {
          plan = { 'req A': '#BBB........', 'req B': '....#BBB....', 'req C': '........#BBB' };
        } else if (mode === 'await') {
          plan = { 'req A': '#WWW..', 'req B': '.#WWW.', 'req C': '..#WWW' };
        } else {
          plan = { 'req A': '#TTT..', 'req B': '.#TTT.', 'req C': '..#TTT' };
        }
        var sym = { '#': 'run', B: 'BLOCK', W: 'await', T: 'thread', '.': '' };
        var frames = [];
        function grid(upto) {
          var rows = reqs.map(function (r) { var out = []; for (var c = 0; c < T; c++) out.push(c <= upto ? sym[plan[r].charAt(c)] || '' : ''); return out; });
          var loopRow = []; for (var c = 0; c < T; c++) { var busy = reqs.some(function (r) { var ch = plan[r].charAt(c); return ch === '#' || ch === 'B'; }); loopRow.push(c <= upto ? (busy ? 'busy' : 'idle') : ''); }
          rows.push(loopRow);
          var hl = {};
          reqs.forEach(function (r, i) { for (var c = 0; c <= upto && c < T; c++) { var ch = plan[r].charAt(c); if (ch === 'B') hl[i + ',' + c] = 'bad'; else if (ch === 'W' || ch === 'T') hl[i + ',' + c] = 'win'; else if (ch === '#') hl[i + ',' + c] = 'cur'; } });
          for (var c2 = 0; c2 <= upto && c2 < T; c2++) hl[reqs.length + ',' + c2] = loopRow[c2] === 'busy' ? 'cur' : 'ok';
          return { type: 'grid', label: 'Timeline (one worker, one event loop)', rows: rows, rowHead: reqs.concat(['event loop']), colHead: colHead, hl: hl };
        }
        var intro = { blocking: 'Mode <b>blocking</b>: the route is <code>async def</code> but calls <code>time.sleep(3)</code> (or <code>requests.get</code>). The loop cannot switch while it is blocked.', await: 'Mode <b>await</b>: the route is <code>async def</code> and uses <code>await asyncio.sleep</code> / <code>await client.get()</code>. While waiting, the loop runs other requests.', thread: 'Mode <b>thread</b>: the route is plain <code>def</code> with a blocking call. FastAPI runs it in a threadpool thread; the loop only dispatches.' };
        frames.push({ narr: intro[mode] + ' Three requests arrive at t0, t1, t2.', parts: [grid(-1), pyc('Route', mode === 'blocking' ? 'async def handler():\n    time.sleep(3)          # blocks the loop\n    return {...}' : mode === 'await' ? 'async def handler():\n    await asyncio.sleep(3) # gives the loop back\n    return {...}' : 'def handler():\n    time.sleep(3)          # runs in a worker thread\n    return {...}', { 2: mode === 'blocking' ? 'bad' : 'ok' })] });
        for (var t = 0; t < T; t++) {
          var notes = [];
          reqs.forEach(function (r) { var ch = plan[r].charAt(t); if (ch === '#') notes.push(r + ' gets the loop'); if (ch === 'B') notes.push(r + ' is <span class="c-r">blocking the loop</span>'); if (ch === 'W') notes.push(r + ' is awaiting I/O (loop free)'); if (ch === 'T') notes.push(r + ' sleeps in a thread (loop free)'); });
          var waiting = mode === 'blocking' ? reqs.filter(function (r, i) { return t >= i && plan[r].lastIndexOf('#') > t; }) : [];
          frames.push({ narr: '<b>t' + t + '</b>: ' + (notes.join('; ') || 'nothing running') + (waiting.length ? '. Waiting in line: ' + waiting.join(', ') + '.' : '.'), parts: [grid(t)] });
        }
        var finish = mode === 'blocking' ? 'C started only at t8 and finishes at t11: about <b>3x slower</b> for the last client, and health checks time out too.' : 'All three finish by t5. Waiting overlapped, so total time ≈ one request\'s wait.';
        frames.push({ narr: finish + (mode === 'thread' ? ' Threads are limited (40 by default), so a burst of 100 slow sync calls would queue after 40.' : ''), parts: [grid(T - 1), { type: 'vars', label: 'Result', vals: { mode: mode, last_request_done_at: 't' + (T - 1) }, hl: { last_request_done_at: mode === 'blocking' ? 'bad' : 'ok' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Diagnosing a frozen API',
        html: `<p>Symptom: p99 latency jumps for <b>all</b> endpoints when one report endpoint is called. Look at that endpoint: <code>async def report()</code> calls <code>pandas.read_sql(...)</code> with a sync driver. Fix options: make it <code>def report()</code> (threadpool), or keep async and wrap the call with <code>await asyncio.to_thread(...)</code>. For truly heavy reports, return 202 and build the report in a background worker.</p>`
      },
      {
        title: 'Sync SQLAlchemy is fine with def',
        html: `<p>A typical CRUD service uses sync SQLAlchemy sessions. Write the routes and the session dependency as plain <code>def</code>. Each request gets a thread, the DB call blocks that thread only, and the event loop keeps accepting connections. Async SQLAlchemy (Python Backend II) helps when you have many slow concurrent queries or want to mix lots of async I/O; it is not automatically faster for simple CRUD.</p>`,
        code: { lang: 'python', code: `from typing import Annotated, Iterator

from fastapi import Depends, FastAPI

app = FastAPI()


class SyncSession:                       # stand-in for sqlalchemy.orm.Session
    def get(self, item_id: int) -> dict:
        return {"id": item_id}

    def close(self) -> None:
        pass


def get_session() -> Iterator[SyncSession]:
    s = SyncSession()
    try:
        yield s
    finally:
        s.close()


@app.get("/items/{item_id}")
def read_item(item_id: int, session: Annotated[SyncSession, Depends(get_session)]) -> dict:
    return session.get(item_id)          # blocking call, but we are in a thread: OK` }
      },
      {
        title: 'Concurrency inside one request',
        html: `<p>A product page needs price (200 ms), reviews (300 ms) and stock (150 ms) from three services. Sequential awaits: 650 ms. <code>asyncio.gather</code>: about 300 ms. Add a timeout per call and decide what to do if one fails: <code>return_exceptions=True</code> lets you return the page with "reviews unavailable" instead of a 500 (graceful degradation, Backend 12).</p>`,
        code: { lang: 'python', run: true, code: `import asyncio
import time

async def fetch(name: str, ms: int) -> str:
    await asyncio.sleep(ms / 1000)
    if name == "reviews":
        raise TimeoutError("reviews slow")
    return name + " ok"

async def page():
    t0 = time.perf_counter()
    results = await asyncio.gather(fetch("price", 200), fetch("reviews", 300),
                                   fetch("stock", 150), return_exceptions=True)
    shown = [r if isinstance(r, str) else "unavailable" for r in results]
    print(shown, f"{time.perf_counter() - t0:.2f}s")

asyncio.run(page())` }
      }
    ],
    deepDive: `<p>🟣 <b>What happens under the hood.</b> For a <code>def</code> route FastAPI calls <code>starlette.concurrency.run_in_threadpool</code>, which uses <code>anyio.to_thread.run_sync</code> with a default <b>capacity limiter of 40</b>. You can raise it at startup (<code>anyio.to_thread.current_default_thread_limiter().total_tokens = 100</code>) but more threads mean more memory and more DB connections; size it with your connection pool. Sync dependencies and sync <code>yield</code> dependencies also use this pool.</p>
      <p><b>The GIL.</b> Threads help for I/O because a thread waiting on a socket releases the GIL. They do not make CPU work parallel in standard CPython. Python 3.13+ ships an optional free-threaded build (no GIL), and 3.14 makes it officially supported, but most production stacks in 2026 still scale CPU work with processes (<code>--workers</code>) or task queues.</p>
      <p><b>Detecting blocking.</b> Run with <code>PYTHONASYNCIODEBUG=1</code> or <code>loop.slow_callback_duration</code>: asyncio logs callbacks that hold the loop longer than 100 ms. Profilers like py-spy show which function sits on the loop thread. A simple production signal: a <code>/health</code> endpoint (<code>async def</code>, trivial) whose latency spikes means something is blocking the loop.</p>
      <p><b>Async is contagious.</b> An <code>async</code> function can call sync code, but sync code cannot <code>await</code>. Do not call <code>asyncio.run()</code> inside a route (there is already a running loop). Background work started with <code>asyncio.create_task</code> must keep a reference or it can be garbage-collected; prefer FastAPI <code>BackgroundTasks</code> or a real queue (Python Backend V).</p>
      <p><b>Throughput reality.</b> For a CRUD API dominated by DB time, <code>def</code> vs <code>async def</code> barely changes latency. The win of async shows up with many concurrent slow I/O waits (calls to LLM APIs, websockets, fan-out to other services).</p>`,
    aiEra: `<p>🤖 This is the most common subtle bug in AI-generated FastAPI code: <code>async def</code> everywhere (it "looks modern") plus <code>requests</code>, sync SQLAlchemy or the sync OpenAI/Anthropic client inside. It works on a laptop with one user and collapses under load. Rules for reviewing generated routes: (1) for every <code>async def</code>, check every call inside is awaited or trivially fast; (2) prefer async clients (<code>httpx.AsyncClient</code>, the SDKs' async clients) when calling LLM APIs, since those calls take seconds and async lets one worker hold hundreds of them; (3) stream LLM tokens with <code>StreamingResponse</code> over an async generator. Ask the assistant explicitly: "Point out any blocking call inside an async function in this file."</p>`,
    problems: [
      {
        title: 'async def or def? Classify the Endpoint',
        level: 'Medium', tags: ['async', 'threadpool', 'event loop'], companies: ['Uber', 'CRED'],
        statement: `<p>Write <code>choose_mode(calls)</code>. <code>calls</code> lists what a route does, each tagged: <code>"await:..."</code> (an awaitable async call), <code>"block:..."</code> (a blocking I/O call, e.g. <code>requests</code> or a sync DB driver), <code>"cpu:..."</code> (heavy CPU work) or <code>"fast:..."</code> (trivial Python). Return the right style:</p>
        <ul><li><code>"offload"</code> if there is any <code>cpu:</code> call (send to a process pool / task queue).</li><li><code>"async+to_thread"</code> if there are both <code>await:</code> and <code>block:</code> calls.</li><li><code>"async"</code> if there are <code>await:</code> calls and no blocking ones.</li><li><code>"def"</code> otherwise (blocking only, or only fast code: the safe default).</li></ul>`,
        constraints: `0 ≤ len(calls) ≤ 50. Every item has one of the four prefixes. Rules are checked in the order listed.`,
        example: `${H.table(['calls', 'answer', 'why'], [['["await:httpx.get", "fast:dict"]', '"async"', 'all I/O is awaitable'], ['["block:requests.get"]', '"def"', 'FastAPI runs it in a thread'], ['["await:redis.get", "block:boto3.put"]', '"async+to_thread"', 'need async, but one call blocks'], ['["cpu:resize_image"]', '"offload"', 'threads and async do not beat the GIL']])}`,
        brute: {
          why: `<p>"Always use <code>async def</code>, it is faster". With any blocking call inside, that freezes the event loop for every client. The opposite brute force, "always <code>def</code>", is safe but wastes the chance to overlap many awaits.</p>`,
          code: { lang: 'python', code: `def choose_mode(calls: list[str]) -> str:
    return "async"        # wrong whenever a blocking or CPU call is present` }
        },
        mcq: { q: 'A route calls the sync <code>boto3</code> S3 client and nothing else. Best choice?', options: ['<code>def</code> route', '<code>async def</code> route calling boto3 directly', '<code>async def</code> with <code>asyncio.run()</code> inside', 'A middleware'], answer: 0, explain: 'With only blocking calls, plain def is simplest and correct: FastAPI runs it in the threadpool so the loop stays free.' },
        hints: [
          `<p>Hint 1: you only need to know which <b>kinds</b> appear: build a set of prefixes with <code>c.split(":", 1)[0]</code>.</p>`,
          `<p>Hint 2: check the rules in priority order: cpu first, then await+block, then await, then default.</p>`,
          `<p>Hint 3: the empty list and "fast only" both fall through to <code>"def"</code>.</p>`
        ],
        solution: {
          approach: `<p>Collect the set of kinds, then apply the decision table from the topic in priority order. CPU work wins because neither threads nor the event loop make it parallel under the GIL. A mix of awaits and blocking calls needs <code>async def</code> plus <code>asyncio.to_thread</code> for the blocking ones. Only awaits → <code>async def</code>. Everything else → <code>def</code>, the safe default.</p>`,
          code: { lang: 'python', run: true, code: `def choose_mode(calls: list[str]) -> str:
    kinds = {c.split(":", 1)[0] for c in calls}
    if "cpu" in kinds:
        return "offload"                 # process pool / task queue
    if "await" in kinds and "block" in kinds:
        return "async+to_thread"         # await asyncio.to_thread(blocking_fn)
    if "await" in kinds:
        return "async"
    return "def"                         # blocking-only or trivial: threadpool is fine


print(choose_mode(["await:httpx.get", "fast:dict"]))
print(choose_mode(["block:requests.get"]))
print(choose_mode(["await:redis.get", "block:boto3.put"]))
print(choose_mode(["cpu:resize_image", "await:s3.put"]))
print(choose_mode([]))` },
          dry: { head: ['calls', 'kinds', 'rule hit', 'answer'], rows: [['await, fast', '{await, fast}', 'await only', 'async'], ['await, block', '{await, block}', 'mix', 'async+to_thread'], ['cpu, await', '{cpu, await}', 'cpu first', 'offload']] },
          complexity: `<p>O(n) to build the set, O(1) decisions.</p>`,
          followUps: ['What changes if you run on free-threaded Python 3.14?', 'How would you detect blocking calls automatically in CI?']
        },
        tests: { fn: 'chooseMode', names: { python: 'choose_mode' }, sig: 'string[] -> string', cases: [[[['await:httpx.get', 'fast:dict']], 'async'], [[['block:requests.get']], 'def'], [[['await:redis.get', 'block:boto3.put']], 'async+to_thread'], [[['cpu:resize_image', 'await:s3.put']], 'offload'], [[[]], 'def'], [[['fast:a', 'fast:b']], 'def'], [[['block:x', 'cpu:y']], 'offload']] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 8 — OpenAPI docs
     ===================================================================== */
  topics.push({
    title: 'Automatic OpenAPI Docs: /docs, /redoc, Tags, Examples and Error Responses',
    analogy: `<p>A <b>restaurant menu</b> that writes itself: every time the chef adds a dish, the menu updates with the name, ingredients, price and allergy warnings. Customers never have to ask the kitchen what exists. FastAPI's <b>OpenAPI schema</b> is that menu, written from your type hints. <code>/docs</code> is the menu with a "try it" button on every dish.</p>`,
    explain: `<p>🟢 <b>You get three URLs for free:</b></p>
      ${H.table(['URL', 'What it is'], [
        ['<code>/openapi.json</code>', 'the machine-readable contract (OpenAPI 3.1 JSON Schema) built from your routes and models'],
        ['<code>/docs</code>', 'Swagger UI: interactive, send real requests, see responses'],
        ['<code>/redoc</code>', 'ReDoc: clean read-only reference docs']
      ])}
      <p>Everything you already wrote feeds it: path and query params with their constraints (<code>ge=1, le=100</code> shows as minimum/maximum), body models (field types, required, patterns), response models, status codes, and dependencies' parameters (headers, query).</p>
      <p><b>Make the docs good, not just present:</b></p>
      <ul>
        <li><code>FastAPI(title=..., version=..., description=...)</code> for the API as a whole.</li>
        <li><code>tags=["orders"]</code> on routers to group endpoints; <code>openapi_tags=[...]</code> to describe each group.</li>
        <li><code>summary=</code> and the function <b>docstring</b> (Markdown) for each endpoint; <code>Field(description=..., examples=[...])</code> for each field.</li>
        <li><code>responses={404: {"model": Problem, "description": "Order not found"}}</code> to document <b>error</b> responses. FastAPI only knows about the success response and 422 by itself.</li>
        <li><code>deprecated=True</code> to mark an endpoint as going away (Backend 4 versioning).</li>
        <li><code>include_in_schema=False</code> to hide internal endpoints (health, metrics).</li>
      </ul>
      <p><b>Why it matters:</b> front-end and mobile teams generate typed clients from <code>/openapi.json</code> (openapi-generator, orval, openapi-typescript). Contract tests (Python Backend IV) compare it between versions to catch breaking changes. Gateways import it. And in 2026, AI agents and tool frameworks read OpenAPI to learn how to call your API.</p>
      <p><b>Production:</b> you may hide docs from the public: <code>FastAPI(docs_url=None, redoc_url=None)</code>, or keep <code>openapi_url</code> but serve it only on an internal network.</p>`,
    clues: [
      '"How do clients know your API contract?" → OpenAPI generated from type hints, served at <code>/openapi.json</code>',
      '"The docs don\'t show the 404 response" → <code>responses={404: {"model": Problem}}</code> on the route',
      '"Generate a TypeScript client" → run a generator against <code>/openapi.json</code> and stable <code>operation_id</code>s',
      '"Hide /docs in production" → <code>docs_url=None, redoc_url=None</code> (or <code>openapi_url=None</code> to remove the schema too)',
      '"Group and describe endpoints" → router <code>tags</code> + <code>openapi_tags</code> metadata',
      '"Detect breaking API changes in CI" → diff the generated OpenAPI between branches'
    ],
    code: [
      {
        lang: 'python', title: 'A well-documented endpoint',
        code: `from typing import Annotated

from fastapi import APIRouter, FastAPI, Path, status
from fastapi.routing import APIRoute
from pydantic import BaseModel, Field


class Problem(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None


class OrderOut(BaseModel):
    id: int = Field(description="Order id", examples=[42])
    status: str = Field(description="Lifecycle state", examples=["PAID"])
    total_cents: int = Field(ge=0, description="Total in cents", examples=[1999])


def custom_operation_id(route: APIRoute) -> str:
    # Stable, readable names for generated clients: orders-get_order
    return f"{route.tags[0]}-{route.name}" if route.tags else route.name


tags_metadata = [{"name": "orders", "description": "Create and track orders."}]

app = FastAPI(
    title="Shop API",
    version="2.3.0",
    description="Public API for the shop. **Markdown** works here.",
    openapi_tags=tags_metadata,
    generate_unique_id_function=custom_operation_id,
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get(
    "/{order_id}",
    summary="Get one order",
    response_model=OrderOut,
    responses={
        404: {"model": Problem, "description": "No order with this id"},
        403: {"model": Problem, "description": "Order belongs to another customer"},
    },
)
def get_order(order_id: Annotated[int, Path(gt=0, description="The order id")]) -> OrderOut:
    """Return a single order.

    - Only the owner (or an admin) can read it.
    - Amounts are integers in cents to avoid float rounding.
    """
    return OrderOut(id=order_id, status="PAID", total_cents=1999)


@router.get("/legacy/{order_id}", deprecated=True, summary="Old path, use /orders/{order_id}")
def get_order_legacy(order_id: int) -> OrderOut:
    return get_order(order_id)


@app.get("/health", include_in_schema=False)     # internal: not in the public docs
def health() -> dict:
    return {"ok": True}


app.include_router(router)`
      },
      {
        lang: 'python', run: true, title: 'Runnable: generating an OpenAPI-style operation from a signature (stdlib)',
        code: `# FastAPI reads your function's signature and type hints. Here is the core idea in plain Python.
import inspect
import json
import re
import typing

TYPE_MAP = {int: "integer", str: "string", float: "number", bool: "boolean"}

def describe(path: str, method: str, fn) -> dict:
    hints = typing.get_type_hints(fn)
    path_names = set(re.findall(r"{(\\w+)}", path))
    params = []
    for name, p in inspect.signature(fn).parameters.items():
        typ = hints.get(name, str)
        params.append({
            "name": name,
            "in": "path" if name in path_names else "query",
            "required": name in path_names or p.default is inspect.Parameter.empty,
            "schema": {"type": TYPE_MAP.get(typ, "string"),
                       **({} if p.default is inspect.Parameter.empty else {"default": p.default})},
        })
    return {path: {method: {"operationId": fn.__name__,
                            "summary": (fn.__doc__ or "").strip().splitlines()[0],
                            "parameters": params}}}

def list_orders(customer_id: int, status: str = "PAID", limit: int = 20):
    """List a customer's orders.

    Longer description here.
    """

print(json.dumps(describe("/customers/{customer_id}/orders", "get", list_orders), indent=2))`
      }
    ],
    codeTitle: ['Documented endpoint', 'Signature → OpenAPI (runnable)'],
    viz: {
      title: 'From Python code to the OpenAPI document',
      input: 'get_order',
      inputLabel: 'Endpoint: get_order or create_order',
      gen: function (input) {
        var k = String(input || '').trim();
        var E = {
          get_order: {
            code: '@router.get("/{order_id}", response_model=OrderOut,\n            responses={404: {"model": Problem}})\ndef get_order(order_id: Annotated[int, Path(gt=0)]):\n    """Return a single order."""',
            steps: [
              { line: 1, narr: 'The decorator gives method <b>get</b> and path <code>/orders/{order_id}</code> (router prefix added). That becomes a key under <code>paths</code>.', kv: [['paths', '/orders/{order_id}'], ['method', 'get'], ['operationId', 'orders-get_order']] },
              { line: 3, narr: '<code>order_id</code> appears in the path template, so it is a <b>path parameter</b>, required. <code>int</code> + <code>gt=0</code> becomes <code>{"type":"integer","exclusiveMinimum":0}</code>.', kv: [['parameters[0].name', 'order_id'], ['in', 'path'], ['required', 'true'], ['schema', '{type: integer, exclusiveMinimum: 0}']] },
              { line: 4, narr: 'The docstring becomes the <b>description</b>; <code>summary</code> defaults to the function name in title case ("Get Order") unless you set it.', kv: [['summary', 'Get Order'], ['description', 'Return a single order.']] },
              { line: 1, narr: '<code>response_model=OrderOut</code> → response <b>200</b> with <code>$ref: #/components/schemas/OrderOut</code>. The model itself is written once under <code>components.schemas</code>.', kv: [['responses.200', '$ref OrderOut'], ['components.schemas', 'OrderOut, Problem, HTTPValidationError']] },
              { line: 2, narr: '<code>responses={404: ...}</code> adds the documented error. FastAPI adds <b>422</b> automatically because there is a validated parameter.', kv: [['responses.404', '$ref Problem'], ['responses.422', '$ref HTTPValidationError (auto)']] }
            ]
          },
          create_order: {
            code: '@router.post("", status_code=201, response_model=OrderOut)\ndef create_order(body: OrderCreate,\n                 idempotency_key: Annotated[str, Header()]):\n    """Create an order."""',
            steps: [
              { line: 1, narr: 'Method <b>post</b>, path <code>/orders</code>. <code>status_code=201</code> means the success response is documented as <b>201</b>, not 200.', kv: [['paths', '/orders'], ['method', 'post'], ['success', '201']] },
              { line: 2, narr: '<code>body: OrderCreate</code> is a Pydantic model → <b>requestBody</b>, <code>application/json</code>, required, <code>$ref OrderCreate</code>.', kv: [['requestBody.required', 'true'], ['content', 'application/json → $ref OrderCreate']] },
              { line: 3, narr: '<code>Header()</code> → a <b>header parameter</b> named <code>idempotency-key</code> (underscores become hyphens), required because there is no default.', kv: [['parameters[0].name', 'idempotency-key'], ['in', 'header'], ['required', 'true']] },
              { line: 4, narr: 'Docstring → description. Summary defaults to "Create Order".', kv: [['summary', 'Create Order'], ['description', 'Create an order.']] },
              { line: 1, narr: 'Responses: 201 with <code>OrderOut</code>, plus the automatic 422. Error codes like 409 must be added with <code>responses=</code>, or clients will not know about them.', kv: [['responses.201', '$ref OrderOut'], ['responses.422', 'auto'], ['responses.409', 'missing! add it']] }
            ]
          }
        };
        if (!E[k]) throw new Error('Type get_order or create_order');
        var e = E[k], acc = [], frames = [];
        frames.push({ narr: 'At startup, FastAPI walks every route and builds one OpenAPI document. Let us follow <code>' + k + '</code>.', parts: [pyc('Your code', e.code), { type: 'map', label: 'openapi.json (being built)', entries: [['openapi', '3.1.0'], ['info.title', 'Shop API']] }] });
        e.steps.forEach(function (s) {
          var hl = {}; hl[s.line] = 'cur';
          var mh = {};
          s.kv.forEach(function (p) { acc.push(p); mh[p[0]] = 'ok'; if (/missing/.test(p[1])) mh[p[0]] = 'bad'; });
          frames.push({ narr: s.narr, parts: [pyc('Your code', e.code, hl), { type: 'map', label: 'openapi.json (being built)', entries: [['openapi', '3.1.0'], ['info.title', 'Shop API']].concat(acc.slice()), hl: mh }] });
        });
        frames.push({ narr: 'Swagger UI at <code>/docs</code> just fetches this JSON and renders forms from it. A client generator does the same and writes typed functions such as <code>' + (k === 'get_order' ? 'ordersGetOrder(orderId)' : 'ordersCreateOrder(body, {idempotencyKey})') + '</code>.', parts: [{ type: 'graph', directed: true, height: 40, label: 'Who reads the schema', nodes: [bx('o', '/openapi.json', 15, 20, 16), bx('d', 'Swagger UI /docs', 50, 6, 18), bx('g', 'client generator', 50, 20, 18), bx('a', 'AI agent / gateway', 50, 34, 18), bx('t', 'contract test in CI', 85, 20, 18)], edges: [['o', 'd'], ['o', 'g'], ['o', 'a'], ['g', 't']], hl: { o: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Field examples show up in "Try it out"',
        html: `<p><code>Field(examples=["PEN-001"])</code> on a model field, or <code>model_config = {"json_schema_extra": {"examples": [{...}]}}</code> on the whole model, pre-fills the request body in Swagger UI. Use realistic values. Testers will copy them, so never put real customer data or real tokens there.</p>`,
        code: { lang: 'python', code: `from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    model_config = {
        "json_schema_extra": {
            "examples": [{"sku": "PEN-001", "qty": 2, "coupon": "WELCOME10"}]
        }
    }
    sku: str = Field(pattern=r"^[A-Z]{3}-\\d{3}$")
    qty: int = Field(ge=1, le=1000)
    coupon: str | None = None` }
      },
      {
        title: 'Exporting the schema in CI',
        html: `<p>You do not need a running server to get the schema: import the app and call <code>app.openapi()</code>. Write it to a file in CI, commit it or diff it against <code>main</code>, and fail the build if a field was removed or became required (a breaking change from Backend 4). Tools like <code>oasdiff</code> automate the comparison.</p>`,
        code: { lang: 'python', code: `# scripts/export_openapi.py
import json
from pathlib import Path

from app.main import app

Path("openapi.json").write_text(json.dumps(app.openapi(), indent=2, sort_keys=True))
print("wrote openapi.json with", len(app.openapi()["paths"]), "paths")` }
      },
      {
        title: 'Securing the docs',
        html: `<p>Public APIs often keep docs public. Internal services may not want to advertise every endpoint. Options: <code>FastAPI(openapi_url=None)</code> removes the schema and both UIs; or set <code>docs_url=None, redoc_url=None</code> and serve your own docs route behind a dependency that checks staff auth. Hiding docs is <b>not</b> security: every endpoint must still check auth itself.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How the schema is built.</b> <code>app.openapi()</code> calls <code>fastapi.openapi.utils.get_openapi()</code> once and caches the result in <code>app.openapi_schema</code>. For each route it collects parameters from the dependant tree, asks Pydantic for JSON Schemas (<code>model_json_schema</code>, in validation and serialization modes, so an input model and output model with the same class can appear as <code>Item-Input</code> and <code>Item-Output</code> when they differ), and places shared models under <code>components/schemas</code>. To customise globally (add a logo, security schemes, servers), override <code>app.openapi</code> with a function that edits and caches the dict.</p>
      <p><b>OpenAPI 3.1.</b> FastAPI emits 3.1, which is fully aligned with JSON Schema 2020-12 (so <code>null</code> is a type: <code>anyOf: [{type: string}, {type: null}]</code>). Some older generators only understand 3.0; check yours.</p>
      <p><b>Operation ids.</b> The default id is <code>{function_name}_{path}_{method}</code>, which makes ugly client method names and changes if you rename a path. A <code>generate_unique_id_function</code> gives stable names. Function names must be unique across the app or generated clients collide.</p>
      <p><b>Security schemes.</b> Using <code>OAuth2PasswordBearer</code> or <code>APIKeyHeader</code> as dependencies adds <code>securitySchemes</code> automatically and an "Authorize" button in <code>/docs</code> (Python Backend III).</p>`,
    aiEra: `<p>🤖 Your OpenAPI schema is now <b>documentation for machines</b>, including AI agents. Tool-calling frameworks and MCP adapters can turn each operation into a tool whose description is your <code>summary</code> and docstring. Vague docs ("Get data") make agents call the wrong endpoint. Write descriptions that say what it does, when to use it, and what errors mean. Assistants are great at the reverse job too: paste <code>openapi.json</code> and ask "Find inconsistencies: endpoints without error responses, fields without descriptions, inconsistent naming, missing pagination." Do not let generated docs become fiction: because FastAPI derives them from code, keep it that way and avoid hand-maintained YAML that drifts.</p>`,
    problems: [
      {
        title: 'Document an Endpoint So a Client Team Can Use It Blind',
        level: 'Easy', tags: ['openapi', 'docs', 'responses'], companies: ['Freshworks', 'Postman'],
        statement: `<p>A mobile team will generate a Kotlin client from your schema and never read your code. Document <code>POST /orders</code>: a summary, a docstring, a body model with field descriptions and an example, a 201 response with <code>OrderOut</code>, and documented 409 (duplicate idempotency key) and 422 errors. Give the operation a stable id <code>createOrder</code>, and hide <code>/internal/metrics</code> from the schema.</p>`,
        constraints: `FastAPI ≥ 0.110. Do not hand-write YAML; everything must come from code.`,
        example: `<p>In <code>/openapi.json</code>: <code>paths["/orders"].post.operationId == "createOrder"</code>, responses <code>201</code>, <code>409</code>, <code>422</code>; <code>/internal/metrics</code> absent.</p>`,
        brute: { why: `<p>Writing a separate <code>openapi.yaml</code> by hand. It is out of date the day after someone adds a field, and the generated client then fails at runtime instead of compile time.</p>` },
        mcq: { q: 'Your route raises <code>HTTPException(409)</code> in one branch. Is 409 in the OpenAPI schema automatically?', options: ['No; add it with <code>responses={409: {...}}</code>', 'Yes, FastAPI scans the function body', 'Yes, but only in /redoc', 'Only if debug=True'], answer: 0, explain: 'FastAPI only knows declared things: the success response and 422 when there are validated inputs. It does not inspect code paths for raised exceptions.' },
        hints: [
          `<p>Hint 1: <code>operation_id="createOrder"</code> is a decorator argument.</p>`,
          `<p>Hint 2: <code>responses={409: {"model": Problem, "description": "..."}}</code>; 422 is already added but you can give it a better description too.</p>`,
          `<p>Hint 3: <code>include_in_schema=False</code> on the metrics route.</p>`
        ],
        solution: {
          approach: `<p>Everything a generator needs is declared in code: a body model with <code>Field(description=..., examples=...)</code>, <code>status_code=201</code> with <code>response_model</code>, extra error responses via <code>responses=</code> using a shared <code>Problem</code> model, a stable <code>operation_id</code>, and <code>include_in_schema=False</code> for internal routes. The docstring becomes the description the mobile developers see in their IDE.</p>`,
          code: { lang: 'python', code: `from typing import Annotated

from fastapi import FastAPI, Header, status
from pydantic import BaseModel, Field

app = FastAPI(title="Shop API", version="1.4.0")


class Problem(BaseModel):
    title: str
    status: int
    detail: str | None = None


class OrderCreate(BaseModel):
    sku: str = Field(description="Product code", examples=["PEN-001"])
    qty: int = Field(ge=1, le=100, description="Units to buy", examples=[2])


class OrderOut(BaseModel):
    id: int
    sku: str
    qty: int
    status: str = Field(examples=["PENDING"])


@app.post(
    "/orders",
    status_code=status.HTTP_201_CREATED,
    response_model=OrderOut,
    operation_id="createOrder",
    summary="Create an order",
    tags=["orders"],
    responses={
        409: {"model": Problem, "description": "Idempotency-Key reused with a different body"},
        422: {"description": "Body or headers failed validation"},
    },
)
def create_order(body: OrderCreate,
                 idempotency_key: Annotated[str, Header(min_length=8)]) -> OrderOut:
    """Create a new order in PENDING state.

    Send a unique Idempotency-Key per logical order so retries are safe.
    """
    return OrderOut(id=1, sku=body.sku, qty=body.qty, status="PENDING")


@app.get("/internal/metrics", include_in_schema=False)
def metrics() -> dict:
    return {"requests": 0}` },
          complexity: `<p>Schema generation runs once and is cached; no per-request cost.</p>`,
          followUps: ['How would a CI step fail the build when <code>qty</code> becomes required in a response?', 'Which fields would you mark <code>deprecated</code> instead of deleting?']
        },
        tests: { skip: 'framework wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Convert Path and Query Values Like FastAPI',
    level: 'Easy', tags: ['path params', 'query params', 'type conversion'], companies: ['Infosys', 'Paytm'],
    statement: `<p>Every path and query value arrives as <b>text</b>. Write <code>convert_param(raw, kind)</code> that converts it the way a FastAPI parameter of that type would (simplified rules below) and returns a tagged string: <code>"int:42"</code>, <code>"float:2.5"</code>, <code>"bool:true"</code>, <code>"str:abc"</code>, or an error tag <code>"error:int_parsing"</code>, <code>"error:float_parsing"</code>, <code>"error:bool_parsing"</code>, <code>"error:unknown_kind"</code>.</p>
      <ul><li><b>int</b>: optional + or - sign then ASCII digits only (surrounding spaces ignored). <code>"4.5"</code> is an error (no truncation). Output the Python int, so <code>"007"</code> → <code>int:7</code>.</li>
      <li><b>float</b>: anything Python's <code>float()</code> accepts, except nan and infinity. Output <code>repr</code> of the float.</li>
      <li><b>bool</b>: case-insensitive <code>1 on t true y yes</code> → true, <code>0 off f false n no</code> → false.</li>
      <li><b>str</b>: unchanged (spaces kept).</li></ul>`,
    constraints: `0 ≤ len(raw) ≤ 100. kind is any string.`,
    example: `${H.table(['raw', 'kind', 'result'], [['"42"', 'int', '<span class="c-g">int:42</span>'], ['"4.5"', 'int', '<span class="c-r">error:int_parsing</span> (a 422 in FastAPI)'], ['"YES"', 'bool', '<span class="c-g">bool:true</span>'], ['"nan"', 'float', '<span class="c-r">error:float_parsing</span>']])}`,
    brute: {
      why: `<p>Calling <code>int(raw)</code> and <code>bool(raw)</code> directly. <code>int(" 42 ")</code> happens to work, but <code>bool("false")</code> is <code>True</code> because any non-empty string is truthy. That exact bug shows up when people parse query flags by hand instead of letting FastAPI do it.</p>`,
      code: { lang: 'python', code: `def convert_param(raw: str, kind: str) -> str:
    if kind == "bool":
        return "bool:" + str(bool(raw)).lower()   # bool("false") is True!
    if kind == "int":
        return "int:" + str(int(float(raw)))       # "4.5" silently becomes 4
    return "str:" + raw` }
    },
    mcq: { q: 'A route has <code>active: bool = False</code>. What does <code>?active=false</code> give?', options: ['<code>False</code>', '<code>True</code>, because the string is non-empty', 'A 422 error', '<code>None</code>'], answer: 0, explain: 'FastAPI (Pydantic) parses common words for booleans: false/0/off/no/f/n become False. Hand-written bool(raw) would wrongly give True.' },
    hints: [
      `<p>Hint 1: strip spaces for int/float/bool, but not for str.</p>`,
      `<p>Hint 2: for int, remove one leading sign, then check <code>isdigit()</code> and <code>isascii()</code> (so "²" or Arabic digits do not sneak in).</p>`,
      `<p>Hint 3: for float, wrap <code>float()</code> in try/except ValueError and then reject with <code>math.isfinite</code>.</p>`
    ],
    solution: {
      approach: `<p>Dispatch on the kind. Each converter is strict about what it accepts and returns a tagged string; any failure becomes the matching <code>error:*_parsing</code> tag, the same type codes Pydantic uses in a 422. In a real FastAPI app you never write this: you just annotate <code>item_id: int</code> or <code>active: bool</code>. Knowing the rules lets you predict what clients will see.</p>`,
      code: { lang: 'python', run: true, code: `import math

TRUE_WORDS = {"1", "on", "t", "true", "y", "yes"}
FALSE_WORDS = {"0", "off", "f", "false", "n", "no"}


def convert_param(raw: str, kind: str) -> str:
    if kind == "str":
        return "str:" + raw
    s = raw.strip()
    if kind == "int":
        digits = s[1:] if s.startswith(("+", "-")) else s
        if digits.isdigit() and digits.isascii():
            return "int:" + str(int(s))
        return "error:int_parsing"
    if kind == "float":
        try:
            value = float(s)
        except ValueError:
            return "error:float_parsing"
        return "float:" + repr(value) if math.isfinite(value) else "error:float_parsing"
    if kind == "bool":
        low = s.lower()
        if low in TRUE_WORDS:
            return "bool:true"
        if low in FALSE_WORDS:
            return "bool:false"
        return "error:bool_parsing"
    return "error:unknown_kind"


for raw, kind in [("42", "int"), ("007", "int"), ("4.5", "int"), ("YES", "bool"),
                  ("nan", "float"), ("2.50", "float"), (" me ", "str")]:
    print(repr(raw), kind, "->", convert_param(raw, kind))` },
      complexity: `<p>O(len(raw)) time, O(1) extra space.</p>`,
      followUps: ['What does FastAPI do with <code>?limit=10&amp;limit=20</code> when the type is <code>int</code>?', 'How would you accept a comma-separated list <code>?ids=1,2,3</code>?']
    },
    tests: { fn: 'convertParam', names: { python: 'convert_param' }, sig: 'string string -> string', cases: [
      [['42', 'int'], 'int:42'], [['-7', 'int'], 'int:-7'], [['007', 'int'], 'int:7'], [[' 12 ', 'int'], 'int:12'], [['4.5', 'int'], 'error:int_parsing'], [['', 'int'], 'error:int_parsing'], [['-', 'int'], 'error:int_parsing'],
      [['YES', 'bool'], 'bool:true'], [['off', 'bool'], 'bool:false'], [['maybe', 'bool'], 'error:bool_parsing'],
      [['2.50', 'float'], 'float:2.5'], [['nan', 'float'], 'error:float_parsing'], [['inf', 'float'], 'error:float_parsing'], [['x1', 'float'], 'error:float_parsing'],
      [[' me ', 'str'], 'str: me '], [['5', 'uuid'], 'error:unknown_kind']
    ] }
  });

  practice.push({
    title: 'Pick the Status Code',
    level: 'Easy', tags: ['status codes', 'http'], companies: ['TCS', 'Zoho'],
    statement: `<p>Your team wants one helper that tells route authors which status to use. Write <code>choose_status(method, outcome)</code>:</p>
      ${H.table(['outcome', 'status'], [['created', '201'], ['ok', '200, except <b>204</b> when the method is DELETE (nothing to return)'], ['accepted', '202 (work queued)'], ['malformed', '400'], ['invalid', '422'], ['unauthenticated', '401'], ['forbidden', '403'], ['not_found', '404'], ['conflict', '409'], ['rate_limited', '429'], ['anything else', '500']])}
      <p>Method is case-insensitive.</p>`,
    constraints: `method is one of GET, POST, PUT, PATCH, DELETE in any case. outcome is any string.`,
    example: `${H.table(['method', 'outcome', 'status'], [['POST', 'created', '201'], ['delete', 'ok', '204'], ['GET', 'ok', '200'], ['GET', 'kaboom', '500']])}`,
    brute: {
      why: `<p>Returning 200 for everything and putting <code>{"error": ...}</code> in the body. Clients, proxies, monitoring and retries all depend on the status code; a 200 with an error inside is invisible to them.</p>`,
      code: { lang: 'python', code: `def choose_status(method: str, outcome: str) -> int:
    return 200        # errors hidden inside the body: monitoring sees 100% success` }
    },
    mcq: { q: 'In FastAPI, how do you make a successful DELETE return 204?', options: ['<code>@app.delete(..., status_code=204)</code> and return None', 'Return <code>{"status": 204}</code>', 'Raise <code>HTTPException(204)</code>', 'Set <code>response_model=None</code>'], answer: 0, explain: 'Success codes are set on the decorator; a 204 response must not have a body, so the function returns None.' },
    hints: [
      `<p>Hint 1: a dict from outcome to code covers almost everything.</p>`,
      `<p>Hint 2: the only method-dependent case is ok + DELETE.</p>`,
      `<p>Hint 3: use <code>dict.get(outcome, 500)</code> so unknown outcomes become 500.</p>`
    ],
    solution: {
      approach: `<p>A lookup table with one special case. In FastAPI the success part goes on the decorator (<code>status_code=status.HTTP_201_CREATED</code>), and the error part goes into exception handlers. The table is also a good thing to put in your team's API guidelines.</p>`,
      code: { lang: 'python', run: true, code: `CODES = {"created": 201, "ok": 200, "accepted": 202, "malformed": 400, "invalid": 422,
         "unauthenticated": 401, "forbidden": 403, "not_found": 404, "conflict": 409,
         "rate_limited": 429}


def choose_status(method: str, outcome: str) -> int:
    if outcome == "ok" and method.upper() == "DELETE":
        return 204
    return CODES.get(outcome, 500)


print(choose_status("POST", "created"), choose_status("delete", "ok"), choose_status("GET", "boom"))` },
      complexity: `<p>O(1): one dictionary lookup per call.</p>`,
      followUps: ['When would a DELETE return 200 with a body?', 'Which of these codes should a client retry automatically?']
    },
    tests: { fn: 'chooseStatus', names: { python: 'choose_status' }, sig: 'string string -> int', cases: [
      [['POST', 'created'], 201], [['DELETE', 'ok'], 204], [['delete', 'ok'], 204], [['GET', 'ok'], 200], [['PATCH', 'ok'], 200], [['POST', 'accepted'], 202],
      [['POST', 'invalid'], 422], [['POST', 'malformed'], 400], [['GET', 'unauthenticated'], 401], [['GET', 'forbidden'], 403], [['GET', 'not_found'], 404],
      [['PUT', 'conflict'], 409], [['GET', 'rate_limited'], 429], [['GET', 'kaboom'], 500], [['DELETE', 'not_found'], 404]
    ] }
  });

  practice.push({
    title: 'Fix the Route That Returns 422 for /users/me',
    level: 'Easy', tags: ['routing', 'debugging'], companies: ['Wipro', 'Ola'],
    statement: `<p>A teammate's code is below. <code>GET /users/42</code> works, but <code>GET /users/me</code> returns 422 "Input should be a valid integer", and <code>GET /users/</code> sometimes redirects. Find and fix both problems.</p>
      <pre>@app.get("/users/{user_id}")
def read_user(user_id: int): ...

@app.get("/users/me")
def read_me(): ...

@app.get("/users/")
def list_users(): ...</pre>`,
    constraints: `Keep the same three endpoints. Use one trailing-slash style for the whole API.`,
    example: `${H.table(['Request', 'Before', 'After'], [['GET /users/me', '<span class="c-r">422</span>', '<span class="c-g">200</span> read_me'], ['GET /users/42', '200', '200'], ['GET /users', '<span class="c-r">307</span> redirect to /users/', '<span class="c-g">200</span>']])}`,
    brute: { why: `<p>Changing <code>user_id: int</code> to <code>user_id: str</code> and adding <code>if user_id == "me"</code> inside <code>read_user</code>. It "works" but you lose type validation for real ids, the docs now say ids are strings, and you mix two endpoints in one function.</p>` },
    mcq: { q: 'Why does FastAPI not "fall through" to /users/me after the int conversion fails?', options: ['Routing matched the template first; validation happens after the match, so the 422 is final', 'Because 422 is cached', 'Because /users/me is shadowed only in production', 'Because routes are sorted alphabetically'], answer: 0, explain: 'Starlette matches by path shape (any segment), then FastAPI validates. A validation failure does not restart routing.' },
    hints: [
      `<p>Hint 1: routes are tried in declaration order; a parameter segment matches any text.</p>`,
      `<p>Hint 2: move the fixed path above the parameter path.</p>`,
      `<p>Hint 3: declare <code>/users</code> without the trailing slash (most APIs do) so <code>GET /users</code> does not need the 307 redirect.</p>`
    ],
    solution: {
      approach: `<p>Two fixes. (1) Order: declare <code>/users/me</code> before <code>/users/{user_id}</code>, because a <code>{user_id}</code> segment matches any text and validation happens only after the match. (2) Trailing slash: declare the collection as <code>/users</code>; FastAPI's <code>redirect_slashes</code> sends a 307 from the other form, which some clients mishandle (lost auth headers or bodies). Add <code>Path(gt=0)</code> so <code>/users/0</code> fails clearly.</p>`,
      code: { lang: 'python', code: `from typing import Annotated

from fastapi import FastAPI, Path

app = FastAPI()


@app.get("/users")                        # collection, no trailing slash
def list_users() -> list[dict]:
    return [{"id": 1}, {"id": 2}]


@app.get("/users/me")                     # fixed path BEFORE the parameter path
def read_me() -> dict:
    return {"id": 0, "me": True}


@app.get("/users/{user_id}")
def read_user(user_id: Annotated[int, Path(gt=0)]) -> dict:
    return {"id": user_id}` },
      complexity: `<p>Routing is a linear scan of compiled regexes; order costs nothing but decides correctness.</p>`,
      followUps: ['How would you write a test that fails if someone reorders these routes?', 'What if /users/me lives in a different router than /users/{user_id}?']
    },
    tests: { skip: 'framework wiring, verified by reading' }
  });

  practice.push({
    title: 'Stop Leaking the Password Hash',
    level: 'Easy', tags: ['response model', 'security', 'pydantic'], companies: ['Razorpay', 'Atlassian'],
    statement: `<p>This endpoint returns the whole user row, including <code>password_hash</code> and <code>is_admin</code>, and uses one model for input and output, so clients can also <b>send</b> <code>is_admin: true</code>. Rewrite it with proper input and output models so the response only contains <code>id, email, full_name</code> and the request cannot set <code>id</code> or <code>is_admin</code>.</p>
      <pre>class User(BaseModel):
    id: int | None = None
    email: str
    full_name: str
    password: str | None = None
    password_hash: str | None = None
    is_admin: bool = False

@app.post("/users")
def create_user(user: User):
    user.password_hash = hash(user.password)
    db.save(user)
    return user</pre>`,
    constraints: `Pydantic v2. Unknown request keys must give 422. Response status 201.`,
    example: `${H.table(['Request body', 'Result'], [['<code>{"email":"a@b.co","full_name":"A","password":"correct horse battery"}</code>', '201 <code>{"id":1,"email":"a@b.co","full_name":"A"}</code>'], ['same + <code>"is_admin":true</code>', '<span class="c-r">422</span> extra_forbidden']])}`,
    brute: { why: `<p>Keeping the single model and doing <code>del data["password_hash"]</code> before returning. The next developer who adds a field (<code>reset_token</code>) leaks it, and the mass-assignment hole on input is still open.</p>` },
    mcq: { q: 'Your route returns an object with extra fields but declares <code>response_model=UserOut</code>. What happens to the extras?', options: ['They are dropped from the JSON', 'FastAPI returns 500', 'They are included', 'They are renamed with a leading underscore'], answer: 0, explain: 'FastAPI validates the return value through the response model and serialises only its declared fields.' },
    hints: [
      `<p>Hint 1: three models: <code>UserCreate</code> (email, full_name, password), <code>UserOut</code> (id, email, full_name), internal row with the hash.</p>`,
      `<p>Hint 2: <code>model_config = ConfigDict(extra="forbid")</code> on <code>UserCreate</code> turns <code>is_admin</code> in the body into a 422.</p>`,
      `<p>Hint 3: <code>response_model=UserOut</code> (or return a <code>UserOut</code>) plus <code>status_code=201</code>.</p>`
    ],
    solution: {
      approach: `<p>Split input, output and storage shapes. The input model has only what a client may set and forbids extras (blocks mass assignment). The output model has only what a client may see. The route builds the internal record, and FastAPI filters it through <code>UserOut</code>, so even future fields on the internal record never leak. Hash with a real algorithm (argon2/bcrypt) in Python Backend III.</p>`,
      code: { lang: 'python', code: `import hashlib

from fastapi import FastAPI, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field

app = FastAPI()


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=12, max_length=128)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str


class UserRecord(BaseModel):          # internal only
    id: int
    email: str
    full_name: str
    password_hash: str
    is_admin: bool = False


DB: dict[int, UserRecord] = {}


def demo_hash(pw: str) -> str:
    # placeholder for argon2 (Python Backend III); sha256 is NOT for real passwords
    return hashlib.sha256(pw.encode()).hexdigest()


@app.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate) -> UserRecord:
    record = UserRecord(id=len(DB) + 1, email=body.email, full_name=body.full_name,
                        password_hash=demo_hash(body.password))
    DB[record.id] = record
    return record                     # filtered to id, email, full_name` },
      complexity: `<p>O(fields) to validate and filter.</p>`,
      followUps: ['Write a test that fails if any response key contains "password" or "hash".', 'How would an admin-only endpoint expose <code>is_admin</code> safely?']
    },
    tests: { skip: 'framework wiring, verified by reading' }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Validate a Signup Payload, One Error per Field',
    level: 'Medium', tags: ['validation', 'pydantic', 'errors'], companies: ['Swiggy', 'Meesho'],
    statement: `<p>Implement the core of a signup validator as a pure function <code>validate_signup(username, email, age)</code>. It returns a list of <code>"field:error_type"</code> strings in field order (username, email, age), at most <b>one error per field</b> (the first rule that fails), or an empty list if valid. This is exactly what a Pydantic model would report as 422 entries; writing it by hand shows you how the rules stack.</p>
      ${H.table(['Field', 'Rules in order', 'Error type'], [['username', 'length 3..20', '<code>string_too_short</code> / <code>string_too_long</code>'], ['', 'starts with a lowercase letter, then only a-z, 0-9, _', '<code>string_pattern_mismatch</code>'], ['email', 'exactly one @, non-empty local part, domain has a dot not at either end', '<code>value_error</code>'], ['age', '13..120', '<code>greater_than_equal</code> / <code>less_than_equal</code>']])}`,
    constraints: `ASCII only for usernames. 0 ≤ len(strings) ≤ 200. age is any int.`,
    example: `${H.table(['input', 'output'], [['("asha_01", "asha@example.com", 30)', '<span class="c-g">[]</span>'], ['("Al", "no-at-sign", 9)', '<span class="c-r">["username:string_too_short", "email:value_error", "age:greater_than_equal"]</span>'], ['("1abc", "a@b.co", 200)', '<span class="c-r">["username:string_pattern_mismatch", "age:less_than_equal"]</span>']])}<p>Why all three in the second row: validation does not stop at the first bad field, so the client can fix everything in one round trip.</p>`,
    brute: {
      why: `<p>Return on the first error. The user fixes the username, submits, sees the email error, fixes it, submits, sees the age error. Three round trips for one form, and a front end that cannot highlight all problems at once.</p>`,
      code: { lang: 'python', code: `def validate_signup(username: str, email: str, age: int) -> list[str]:
    if len(username) < 3:
        return ["username:string_too_short"]      # stops here; email and age unchecked
    if "@" not in email:
        return ["email:value_error"]
    return []` }
    },
    mcq: { q: 'In FastAPI, which model expresses the username rules without a custom validator?', options: ['<code>username: str = Field(min_length=3, max_length=20, pattern=r"^[a-z][a-z0-9_]*$")</code>', '<code>username: constr()</code> with no arguments', '<code>username: str</code> plus an if-statement in the route', '<code>username: EmailStr</code>'], answer: 0, explain: 'Length and pattern are built-in Field constraints. Pydantic reports string_too_short, string_too_long or string_pattern_mismatch with loc ["body","username"].' },
    hints: [
      `<p>Hint 1: one small checker per field returning an error type or None; collect the non-None ones.</p>`,
      `<p>Hint 2: check length before pattern so "Al" reports too_short, not pattern_mismatch.</p>`,
      `<p>Hint 3: email: <code>email.count("@") == 1</code>, then split; the domain must contain "." and must not start or end with it.</p>`
    ],
    solution: {
      approach: `<p>Run every field's checks independently and collect the first failure of each field. That mirrors Pydantic: each field reports its own error, and all fields are checked. In the FastAPI app the same rules are declared on the model (<code>Field(min_length=3, max_length=20, pattern=...)</code>, <code>EmailStr</code>, <code>Field(ge=13, le=120)</code>) and you write zero code like this.</p>`,
      code: { lang: 'python', run: true, code: `import string

ALLOWED = set(string.ascii_lowercase + string.digits + "_")


def check_username(u: str) -> str | None:
    if len(u) < 3:
        return "string_too_short"
    if len(u) > 20:
        return "string_too_long"
    if not (u[0] in string.ascii_lowercase and set(u) <= ALLOWED):
        return "string_pattern_mismatch"
    return None


def check_email(e: str) -> str | None:
    if e.count("@") != 1:
        return "value_error"
    local, domain = e.split("@")
    if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
        return "value_error"
    return None


def check_age(a: int) -> str | None:
    if a < 13:
        return "greater_than_equal"
    if a > 120:
        return "less_than_equal"
    return None


def validate_signup(username: str, email: str, age: int) -> list[str]:
    errors = []
    for field, err in (("username", check_username(username)),
                       ("email", check_email(email)),
                       ("age", check_age(age))):
        if err:
            errors.append(f"{field}:{err}")
    return errors


print(validate_signup("asha_01", "asha@example.com", 30))
print(validate_signup("Al", "no-at-sign", 9))` },
      complexity: `<p>O(len(username) + len(email)).</p>`,
      followUps: ['Pydantic gives the full loc <code>["body","username"]</code>; how would the front end use it?', 'Which of these rules should also exist as a database constraint?']
    },
    tests: { fn: 'validateSignup', names: { python: 'validate_signup' }, sig: 'string string int -> string[]', cases: [
      [['asha_01', 'asha@example.com', 30], []],
      [['Al', 'no-at-sign', 9], ['username:string_too_short', 'email:value_error', 'age:greater_than_equal']],
      [['1abc', 'a@b.co', 200], ['username:string_pattern_mismatch', 'age:less_than_equal']],
      [['abcdefghijklmnopqrstu', 'a@b.co', 13], ['username:string_too_long']],
      [['Asha', 'a@b.co', 120], ['username:string_pattern_mismatch']],
      [['bob', '@b.co', 20], ['email:value_error']],
      [['bob', 'a@@b.co', 20], ['email:value_error']],
      [['bob', 'a@bco', 20], ['email:value_error']],
      [['bob', 'a@b.', 20], ['email:value_error']],
      [['bob-x', 'a@.b', 12], ['username:string_pattern_mismatch', 'email:value_error', 'age:greater_than_equal']],
      [['abc', 'x@y.z', 13], []]
    ] }
  });

  practice.push({
    title: 'Compute Pagination Links for limit/offset',
    level: 'Medium', tags: ['pagination', 'api design', 'query params'], companies: ['Amazon', 'Shopify'],
    statement: `<p><code>GET /items?limit=&amp;offset=</code> must return navigation links. Write <code>page_links(total, limit, offset)</code> returning strings in this order: <code>self</code>, <code>first</code>, <code>prev</code> (only if offset &gt; 0), <code>next</code> (only if offset + limit &lt; total), <code>last</code>. Each looks like <code>"next=/items?limit=10&amp;offset=20"</code>.</p>
      <ul><li>prev offset = max(0, offset - limit).</li><li>last offset = the start of the final page: <code>((total - 1) // limit) * limit</code>, or 0 when total is 0.</li><li>If <code>limit</code> is outside 1..100 or <code>offset &lt; 0</code>, return <code>["error:422"]</code> (in FastAPI, <code>Query(ge=1, le=100)</code> would do this).</li></ul>`,
    constraints: `0 ≤ total ≤ 10<sup>9</sup>. limit and offset are any ints.`,
    example: `${H.table(['total, limit, offset', 'links'], [['45, 10, 20', 'self=…offset=20, first=…offset=0, prev=…offset=10, next=…offset=30, last=…offset=40'], ['45, 10, 0', 'self, first, next(10), last(40): no prev'], ['45, 10, 40', 'self, first, prev(30), last(40): no next'], ['0, 10, 0', 'self, first, last all offset 0']])}`,
    brute: {
      why: `<p>Returning only the items and letting each client compute pages. Every client re-implements the arithmetic, gets the last page wrong (<code>total // limit * limit</code> is off by one page when total is a multiple of limit), and breaks the day you switch to cursors.</p>`,
      code: { lang: 'python', code: `def page_links(total: int, limit: int, offset: int) -> list[str]:
    last = total // limit * limit          # wrong when total % limit == 0 (points past the end)
    return [f"next=/items?limit={limit}&offset={offset + limit}", f"last=/items?limit={limit}&offset={last}"]` }
    },
    mcq: { q: 'total = 40, limit = 10. What is the offset of the last page?', options: ['30', '40', '39', '4'], answer: 0, explain: 'Pages start at 0, 10, 20, 30. (40 - 1) // 10 * 10 = 30. Using 40 // 10 * 10 = 40 would point to an empty page.' },
    hints: [
      `<p>Hint 1: validate first, exactly like <code>Query(ge=1, le=100)</code> and <code>Query(ge=0)</code> would.</p>`,
      `<p>Hint 2: write one tiny helper <code>link(name, off)</code> that formats the string, then append conditionally.</p>`,
      `<p>Hint 3: the off-by-one trap is the last page: use <code>(total - 1) // limit</code>, and special-case total 0.</p>`
    ],
    solution: {
      approach: `<p>Validate the inputs, compute the five offsets, and only include prev/next when they exist. In the FastAPI route, the inputs come from a <code>Pagination</code> dependency with <code>Query</code> constraints, and the links go into the page wrapper model (<code>links: dict[str, str]</code>) or a <code>Link</code> header, as Backend 4 described.</p>`,
      code: { lang: 'python', run: true, code: `def page_links(total: int, limit: int, offset: int) -> list[str]:
    if not (1 <= limit <= 100) or offset < 0:
        return ["error:422"]

    def link(name: str, off: int) -> str:
        return f"{name}=/items?limit={limit}&offset={off}"

    last = ((total - 1) // limit) * limit if total > 0 else 0
    links = [link("self", offset), link("first", 0)]
    if offset > 0:
        links.append(link("prev", max(0, offset - limit)))
    if offset + limit < total:
        links.append(link("next", offset + limit))
    links.append(link("last", last))
    return links


for args in [(45, 10, 20), (40, 10, 0), (0, 10, 0), (45, 0, 0)]:
    print(args, page_links(*args))` },
      alt: [{ lang: 'python', title: 'Wired into FastAPI', code: `from typing import Annotated

from fastapi import FastAPI, Query
from pydantic import BaseModel

app = FastAPI()
ITEMS = [{"id": i} for i in range(1, 46)]


class Page(BaseModel):
    items: list[dict]
    total: int
    links: dict[str, str]


@app.get("/items")
def list_items(limit: Annotated[int, Query(ge=1, le=100)] = 10,
               offset: Annotated[int, Query(ge=0)] = 0) -> Page:
    total = len(ITEMS)
    last = ((total - 1) // limit) * limit if total else 0
    links = {"self": f"/items?limit={limit}&offset={offset}", "first": f"/items?limit={limit}&offset=0",
             "last": f"/items?limit={limit}&offset={last}"}
    if offset > 0:
        links["prev"] = f"/items?limit={limit}&offset={max(0, offset - limit)}"
    if offset + limit < total:
        links["next"] = f"/items?limit={limit}&offset={offset + limit}"
    return Page(items=ITEMS[offset:offset + limit], total=total, links=links)` }],
      complexity: `<p>O(1). (The query behind it is the expensive part: large offsets are slow, see the cursor problem.)</p>`,
      followUps: ['Why do large offsets get slow in SQL, and what replaces them?', 'Should <code>total</code> always be computed? What does COUNT(*) cost on a big table?']
    },
    tests: { fn: 'pageLinks', names: { python: 'page_links' }, sig: 'int int int -> string[]', cases: [
      [[45, 10, 20], ['self=/items?limit=10&offset=20', 'first=/items?limit=10&offset=0', 'prev=/items?limit=10&offset=10', 'next=/items?limit=10&offset=30', 'last=/items?limit=10&offset=40']],
      [[45, 10, 0], ['self=/items?limit=10&offset=0', 'first=/items?limit=10&offset=0', 'next=/items?limit=10&offset=10', 'last=/items?limit=10&offset=40']],
      [[45, 10, 40], ['self=/items?limit=10&offset=40', 'first=/items?limit=10&offset=0', 'prev=/items?limit=10&offset=30', 'last=/items?limit=10&offset=40']],
      [[40, 10, 0], ['self=/items?limit=10&offset=0', 'first=/items?limit=10&offset=0', 'next=/items?limit=10&offset=10', 'last=/items?limit=10&offset=30']],
      [[0, 10, 0], ['self=/items?limit=10&offset=0', 'first=/items?limit=10&offset=0', 'last=/items?limit=10&offset=0']],
      [[45, 10, 5], ['self=/items?limit=10&offset=5', 'first=/items?limit=10&offset=0', 'prev=/items?limit=10&offset=0', 'next=/items?limit=10&offset=15', 'last=/items?limit=10&offset=40']],
      [[45, 0, 0], ['error:422']], [[45, 101, 0], ['error:422']], [[45, 10, -1], ['error:422']],
      [[1, 100, 0], ['self=/items?limit=100&offset=0', 'first=/items?limit=100&offset=0', 'last=/items?limit=100&offset=0']]
    ] }
  });

  practice.push({
    title: 'Parse and Whitelist a sort Query Parameter',
    level: 'Medium', tags: ['query params', 'security', 'parsing'], companies: ['Flipkart', 'GitHub'],
    statement: `<p><code>GET /products?sort=-created_at,name</code> means "newest first, then by name". Write <code>parse_sort(sort, allowed)</code> returning SQL-ready terms like <code>["created_at DESC", "name ASC"]</code>. A leading <code>-</code> means DESC; a leading <code>+</code> or nothing means ASC. Spaces around items are ignored. Return a <b>single error</b> list for the first problem found:</p>
      <ul><li>an empty item (e.g. <code>"name,,price"</code>) → <code>["error:empty sort field"]</code></li><li>a field not in <code>allowed</code> → <code>["error:cannot sort by 'x'"]</code></li><li>the same field twice (any direction) → <code>["error:duplicate sort field 'x'"]</code></li></ul>
      <p>An empty or all-space <code>sort</code> means no sorting: return <code>[]</code>.</p>`,
    constraints: `len(sort) ≤ 200, len(allowed) ≤ 20. Field names are case-sensitive.`,
    example: `${H.table(['sort', 'result'], [['"-created_at,name"', '["created_at DESC", "name ASC"]'], ['"price; DROP TABLE"', '<span class="c-r">["error:cannot sort by \'price; DROP TABLE\'"]</span>'], ['"name,-name"', '<span class="c-r">["error:duplicate sort field \'name\'"]</span>']])}`,
    brute: {
      why: `<p>Pasting the raw parameter into SQL: <code>f"ORDER BY {sort}"</code>. Bind parameters cannot be used for column names, so this is a real <b>SQL injection</b> hole. Whitelisting the allowed columns is the only safe approach.</p>`,
      code: { lang: 'python', code: `def build_query(sort: str) -> str:
    return f"SELECT * FROM products ORDER BY {sort}"   # sort="1; DROP TABLE products" ... injection` }
    },
    mcq: { q: 'Why can\'t you use a bound parameter (<code>ORDER BY ?</code>) for the sort column?', options: ['Placeholders bind values, not identifiers like column names', 'It works, but is slower', 'SQLite does not support ORDER BY', 'Only ORMs support it'], answer: 0, explain: 'Bind parameters are for literal values. ORDER BY ? would sort by a constant string. Identifiers must come from a fixed allow-list in your code.' },
    hints: [
      `<p>Hint 1: if <code>sort.strip()</code> is empty return []. Otherwise <code>split(",")</code> and strip each item.</p>`,
      `<p>Hint 2: peel the direction with <code>item[0] in "+-"</code> (only after checking the item is non-empty).</p>`,
      `<p>Hint 3: keep a <code>seen</code> set of field names to catch duplicates in either direction.</p>`
    ],
    solution: {
      approach: `<p>Split, strip, peel off the direction, then check the field against the allow-list and a seen-set. Fail fast with one clear message: for a sort parameter a single error is enough. In FastAPI wrap it in a dependency that raises <code>HTTPException(422, detail=...)</code>, so every list endpoint reuses it with its own allow-list.</p>`,
      code: { lang: 'python', run: true, code: `def parse_sort(sort: str, allowed: list[str]) -> list[str]:
    if not sort.strip():
        return []
    terms, seen = [], set()
    for raw in sort.split(","):
        item = raw.strip()
        if not item:
            return ["error:empty sort field"]
        direction = "ASC"
        if item[0] in "+-":
            direction = "DESC" if item[0] == "-" else "ASC"
            item = item[1:].strip()
        if item not in allowed:
            return [f"error:cannot sort by '{item}'"]
        if item in seen:
            return [f"error:duplicate sort field '{item}'"]
        seen.add(item)
        terms.append(f"{item} {direction}")
    return terms


ALLOWED = ["created_at", "name", "price"]
for s in ["-created_at,name", " +price ", "name,,price", "price; DROP TABLE", "name,-name", ""]:
    print(repr(s), "->", parse_sort(s, ALLOWED))` },
      alt: [{ lang: 'python', title: 'As a reusable FastAPI dependency', code: `from typing import Annotated, Callable

from fastapi import Depends, FastAPI, HTTPException, Query

app = FastAPI()


def sort_param(allowed: list[str]) -> Callable[..., list[str]]:
    def dependency(sort: Annotated[str, Query(max_length=200)] = "") -> list[str]:
        terms = []
        for raw in filter(None, (s.strip() for s in sort.split(","))):
            desc = raw.startswith("-")
            name = raw.lstrip("+-")
            if name not in allowed:
                raise HTTPException(422, f"cannot sort by '{name}'")
            terms.append(f"{name} {'DESC' if desc else 'ASC'}")
        return terms
    return dependency


@app.get("/products")
def list_products(order: Annotated[list[str], Depends(sort_param(["created_at", "name", "price"]))]) -> dict:
    return {"order_by": order}` }],
      complexity: `<p>O(len(sort)) time, O(number of fields) for the seen-set.</p>`,
      followUps: ['How would sorting interact with cursor pagination (the cursor must include the sort key)?', 'Should unknown sort fields be ignored or rejected? Argue both.']
    },
    tests: { fn: 'parseSort', names: { python: 'parse_sort' }, sig: 'string string[] -> string[]', cases: [
      [['-created_at,name', ['created_at', 'name', 'price']], ['created_at DESC', 'name ASC']],
      [[' +price ', ['created_at', 'name', 'price']], ['price ASC']],
      [['', ['name']], []], [['   ', ['name']], []],
      [['name,,price', ['name', 'price']], ['error:empty sort field']],
      [['price; DROP TABLE', ['name', 'price']], ["error:cannot sort by 'price; DROP TABLE'"]],
      [['name,-name', ['name']], ["error:duplicate sort field 'name'"]],
      [['Name', ['name']], ["error:cannot sort by 'Name'"]],
      [['-', ['name']], ["error:cannot sort by ''"]],
      [['- price, name', ['name', 'price']], ['price DESC', 'name ASC']],
      [['name,', ['name']], ['error:empty sort field']]
    ] }
  });

  practice.push({
    title: 'Validate Nested Order Lines with Exact loc Paths',
    level: 'Medium', tags: ['validation', 'nested models', 'errors'], companies: ['Zepto', 'BigBasket'],
    statement: `<p>A <code>POST /orders</code> body has <code>lines: list[OrderLine]</code>. To understand nested 422 errors, write <code>validate_lines(skus, qtys)</code> where line <i>i</i> is <code>(skus[i], qtys[i])</code>. Return every error as <code>"loc:type"</code>, with loc joined by dots, in line order, sku before qty:</p>
      <ul><li>lists of different length → only <code>["body.lines:length_mismatch"]</code></li><li>no lines → <code>["body.lines:too_short"]</code>; more than 50 → <code>["body.lines:too_long"]</code></li><li>sku must be 3 uppercase letters, a dash, 3 digits (<code>PEN-001</code>) → else <code>body.lines.{i}.sku:string_pattern_mismatch</code></li><li>a valid sku already used on an earlier line → <code>body.lines.{i}.sku:duplicate</code></li><li>qty must be 1..1000 → <code>greater_than_equal</code> / <code>less_than_equal</code> at <code>body.lines.{i}.qty</code></li></ul>`,
    constraints: `0 ≤ len ≤ 200. Indexes are 0-based like Pydantic's.`,
    example: `${H.table(['skus / qtys', 'errors'], [['["PEN-001","INK-002"] / [2,1]', '<span class="c-g">[]</span>'], ['["PEN-001","pen-2","PEN-001"] / [0,5,2000]', '<span class="c-r">["body.lines.0.qty:greater_than_equal", "body.lines.1.sku:string_pattern_mismatch", "body.lines.2.sku:duplicate", "body.lines.2.qty:less_than_equal"]</span>']])}`,
    brute: {
      why: `<p>Reporting "invalid order" with no location. The client cannot tell which of 30 lines is wrong. Pydantic's <code>loc</code> exists so a UI can put the message next to the exact input.</p>`,
      code: { lang: 'python', code: `def validate_lines(skus: list[str], qtys: list[int]) -> list[str]:
    if any(q < 1 for q in qtys):
        return ["invalid order"]        # which line? which field?
    return []` }
    },
    mcq: { q: 'In Pydantic, where does a cross-line rule like "no duplicate SKUs" belong?', options: ['A <code>model_validator</code> or <code>field_validator("lines")</code> on the order model', 'A <code>field_validator</code> on <code>OrderLine.sku</code>', 'The route function', 'The OpenAPI schema'], answer: 0, explain: 'One line cannot see the others, so the rule must run where the whole list is visible: a validator on the parent model or its lines field.' },
    hints: [
      `<p>Hint 1: check the whole-list errors first and return early, since per-line checks make no sense if lengths differ.</p>`,
      `<p>Hint 2: write <code>sku_ok(s)</code> using <code>len(s) == 7</code>, <code>s[:3].isalpha() and s[:3].isupper()</code>, <code>s[3] == "-"</code>, <code>s[4:].isdigit()</code> (and isascii).</p>`,
      `<p>Hint 3: keep a set of valid SKUs seen; only a valid sku can be a duplicate.</p>`
    ],
    solution: {
      approach: `<p>Validate the container, then each line, building <code>loc</code> exactly as Pydantic does: <code>body</code> → field name → list index → sub-field. In the real model this is <code>lines: list[OrderLine] = Field(min_length=1, max_length=50)</code> with <code>sku: str = Field(pattern=...)</code> and <code>qty: int = Field(ge=1, le=1000)</code>, plus a <code>field_validator("lines")</code> for duplicates.</p>`,
      code: { lang: 'python', run: true, code: `def sku_ok(s: str) -> bool:
    return (len(s) == 7 and s.isascii() and s[:3].isalpha() and s[:3].isupper()
            and s[3] == "-" and s[4:].isdigit())


def validate_lines(skus: list[str], qtys: list[int]) -> list[str]:
    if len(skus) != len(qtys):
        return ["body.lines:length_mismatch"]
    if not skus:
        return ["body.lines:too_short"]
    if len(skus) > 50:
        return ["body.lines:too_long"]
    errors, seen = [], set()
    for i, (sku, qty) in enumerate(zip(skus, qtys)):
        base = f"body.lines.{i}"
        if not sku_ok(sku):
            errors.append(f"{base}.sku:string_pattern_mismatch")
        elif sku in seen:
            errors.append(f"{base}.sku:duplicate")
        else:
            seen.add(sku)
        if qty < 1:
            errors.append(f"{base}.qty:greater_than_equal")
        elif qty > 1000:
            errors.append(f"{base}.qty:less_than_equal")
    return errors


print(validate_lines(["PEN-001", "INK-002"], [2, 1]))
print(validate_lines(["PEN-001", "pen-2", "PEN-001"], [0, 5, 2000]))` },
      alt: [{ lang: 'python', title: 'The same rules as Pydantic v2 models', code: `from pydantic import BaseModel, Field, field_validator


class OrderLine(BaseModel):
    sku: str = Field(pattern=r"^[A-Z]{3}-[0-9]{3}$")
    qty: int = Field(ge=1, le=1000)


class OrderCreate(BaseModel):
    lines: list[OrderLine] = Field(min_length=1, max_length=50)

    @field_validator("lines")
    @classmethod
    def unique_skus(cls, lines: list[OrderLine]) -> list[OrderLine]:
        skus = [line.sku for line in lines]
        if len(skus) != len(set(skus)):
            raise ValueError("each sku may appear only once")
        return lines` }],
      complexity: `<p>O(n) with a set for duplicates.</p>`,
      followUps: ['Pydantic reports the duplicate at <code>body.lines</code>, not at the line. How would you point it at the exact line?', 'How do you cap total body size before Pydantic even runs?']
    },
    tests: { fn: 'validateLines', names: { python: 'validate_lines' }, sig: 'string[] int[] -> string[]', cases: [
      [[['PEN-001', 'INK-002'], [2, 1]], []],
      [[['PEN-001', 'pen-2', 'PEN-001'], [0, 5, 2000]], ['body.lines.0.qty:greater_than_equal', 'body.lines.1.sku:string_pattern_mismatch', 'body.lines.2.sku:duplicate', 'body.lines.2.qty:less_than_equal']],
      [[['PEN-001'], [1, 2]], ['body.lines:length_mismatch']],
      [[[], []], ['body.lines:too_short']],
      [[['ABC-123'], [1000]], []],
      [[['ABC-12X'], [1]], ['body.lines.0.sku:string_pattern_mismatch']],
      [[['AB1-123', 'ABCD123'], [1, 1]], ['body.lines.0.sku:string_pattern_mismatch', 'body.lines.1.sku:string_pattern_mismatch']],
      [[['bad', 'bad'], [1, 1]], ['body.lines.0.sku:string_pattern_mismatch', 'body.lines.1.sku:string_pattern_mismatch']],
      [[['ABC-001', 'ABC-002', 'ABC-001', 'ABC-001'], [1, 1, 1, -3]], ['body.lines.2.sku:duplicate', 'body.lines.3.sku:duplicate', 'body.lines.3.qty:greater_than_equal']]
    ] }
  });

  practice.push({
    title: 'One Error Format for the Whole API (problem+json)',
    level: 'Medium', tags: ['exception handlers', 'errors', 'rfc 9457'], companies: ['Stripe', 'Adobe'],
    statement: `<p>Right now your API returns three different error shapes: <code>{"detail":"Not Found"}</code> from the router, <code>{"detail":[...]}</code> for validation, and a plain-text "Internal Server Error" on crashes. Make <b>every</b> error <code>application/problem+json</code> with <code>type, title, status, detail, instance</code>, plus <code>errors</code> for validation failures and a <code>request_id</code> on 500s. Domain code raises <code>NotFound</code> / <code>Conflict</code> without importing FastAPI.</p>`,
    constraints: `Handlers registered in one module (<code>app/errors.py</code>) with a function <code>install_error_handlers(app)</code>. Keep any headers an HTTPException carried (e.g. WWW-Authenticate, Retry-After).`,
    example: `${H.table(['Trigger', 'Status', 'title'], [['unknown URL', '404', 'Not Found'], ['body fails model', '422', 'Validation failed (+ errors list)'], ['<code>raise Conflict("email taken")</code>', '409', 'Conflict'], ['<code>1/0</code> in a route', '500', 'Internal Server Error (+ request_id, no traceback)']])}`,
    brute: { why: `<p>Wrapping every route in <code>try/except Exception</code> and building the JSON inline. It duplicates code in every route, misses router-level 404/405 and validation errors (they never reach your route), and often leaks <code>str(e)</code>.</p>` },
    mcq: { q: 'Why register the handler on <code>starlette.exceptions.HTTPException</code> instead of <code>fastapi.HTTPException</code>?', options: ['The router raises Starlette\'s class for 404/405; registering the base catches both', 'FastAPI\'s class cannot be handled', 'It is faster', 'Starlette\'s class adds problem+json automatically'], answer: 0, explain: 'fastapi.HTTPException subclasses Starlette\'s. Routing errors use the Starlette class, so only a handler on the base catches everything.' },
    hints: [
      `<p>Hint 1: one helper <code>problem(status, title, detail, request, **extra)</code> builds the JSONResponse with <code>media_type="application/problem+json"</code>.</p>`,
      `<p>Hint 2: four handlers: DomainError, StarletteHTTPException, RequestValidationError, Exception.</p>`,
      `<p>Hint 3: in the Exception handler log with <code>log.exception</code> and a generated request id; never include the exception text in the response.</p>`
    ],
    solution: {
      approach: `<p>Centralise. A <code>DomainError</code> base class carries <code>status</code> and <code>title</code>; subclasses override them. <code>install_error_handlers(app)</code> registers four handlers that all call one <code>problem()</code> builder, so the shape cannot drift. HTTPException headers are copied over. The catch-all logs the traceback with a request id and returns only the id. Validation errors are slimmed to <code>loc/msg/type</code> (dropping <code>input</code>, which might echo secrets like a password back).</p>`,
      code: { lang: 'python', code: `# app/errors.py
import logging
import uuid
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("app.errors")


class DomainError(Exception):
    status: int = 400
    title: str = "Bad Request"

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFound(DomainError):
    status, title = 404, "Not Found"


class Conflict(DomainError):
    status, title = 409, "Conflict"


def problem(status: int, title: str, detail, request: Request, headers=None, **extra) -> JSONResponse:
    body = {"type": "about:blank", "title": title, "status": status,
            "detail": detail, "instance": request.url.path, **extra}
    return JSONResponse(body, status_code=status, headers=headers,
                        media_type="application/problem+json")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain(request: Request, exc: DomainError):
        return problem(exc.status, exc.title, exc.detail, request)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        title = HTTPStatus(exc.status_code).phrase
        return problem(exc.status_code, title, exc.detail, request, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        return problem(422, "Validation failed", "The request is invalid", request, errors=errors)

    @app.exception_handler(Exception)
    async def _crash(request: Request, exc: Exception):
        request_id = uuid.uuid4().hex
        log.exception("unhandled error request_id=%s path=%s", request_id, request.url.path)
        return problem(500, "Internal Server Error", "Unexpected error", request,
                       request_id=request_id)


# app/main.py
app = FastAPI()
install_error_handlers(app)` },
      complexity: `<p>O(number of validation errors) per failing request; nothing on the success path.</p>`,
      followUps: ['How would you give each domain error its own <code>type</code> URI and document them in OpenAPI?', 'Where should the request id come from if a gateway already sets <code>X-Request-ID</code>?']
    },
    tests: { skip: 'framework wiring, verified by reading' }
  });

  practice.push({
    title: 'Unfreeze the API: Fix Blocking Calls in async Routes',
    level: 'Medium', tags: ['async', 'performance', 'debugging'], companies: ['Uber', 'Dream11'],
    statement: `<p>Under load, every endpoint (even <code>/health</code>) becomes slow. The code below is the cause. Fix each route, choosing between <code>def</code>, <code>async def</code> + an async client, and <code>asyncio.to_thread</code>, and explain the choice.</p>
      <pre>@app.get("/weather/{city}")
async def weather(city: str):
    r = requests.get(f"https://api.example.com/w/{city}", timeout=5)
    return r.json()

@app.get("/report")
async def report():
    rows = db_sync.query("SELECT ...")      # sync driver, 2 s
    return {"rows": len(rows)}

@app.get("/thumb")
async def thumb(url: str):
    img = await http.get(url)               # async, fine
    return resize(img.content)              # pure-Python CPU work, 800 ms</pre>`,
    constraints: `Keep the same paths and responses. Show one shared <code>httpx.AsyncClient</code> created in lifespan.`,
    example: `${H.table(['Route', 'Problem', 'Fix'], [['/weather', 'requests blocks the loop', 'httpx.AsyncClient + await'], ['/report', 'sync DB call in async def', 'make it def (threadpool)'], ['/thumb', 'CPU work on the loop', 'await asyncio.to_thread or a process pool / queue']])}`,
    brute: { why: `<p>Adding more Uvicorn workers. It hides the problem a little (each worker freezes separately) but every worker still stalls whenever one of these routes runs, and memory goes up with every worker.</p>` },
    mcq: { q: 'Which change alone fixes <code>/report</code> with the least code?', options: ['Change <code>async def report</code> to <code>def report</code>', 'Add <code>await</code> before <code>db_sync.query</code>', 'Wrap it in <code>asyncio.run()</code>', 'Increase the timeout'], answer: 0, explain: 'A def route runs in the threadpool, so the blocking driver blocks only that thread. You cannot await a sync function, and asyncio.run inside a running loop raises an error.' },
    hints: [
      `<p>Hint 1: for HTTP calls, the async replacement for <code>requests</code> is <code>httpx.AsyncClient</code>; create one in lifespan and reuse it (connection pooling).</p>`,
      `<p>Hint 2: when the whole route is sync work, plain <code>def</code> is the simplest fix.</p>`,
      `<p>Hint 3: CPU work blocks whichever thread runs it; <code>to_thread</code> frees the loop, but for heavy load use a <code>ProcessPoolExecutor</code> or a task queue.</p>`
    ],
    solution: {
      approach: `<p>Rule: inside <code>async def</code>, every I/O must be awaited. <b>/weather</b>: switch to a shared <code>httpx.AsyncClient</code> (created in lifespan, stored on <code>app.state</code>) and <code>await</code> it. <b>/report</b>: it only does sync work, so make it <code>def</code>; FastAPI runs it in the threadpool. <b>/thumb</b>: keep the async download, then move CPU work off the loop with <code>await asyncio.to_thread(resize, data)</code> (Pillow releases the GIL for much of its work), or a process pool for pure-Python CPU code. Verify with a load test: <code>/health</code> latency must stay flat while the other routes are busy.</p>`,
      code: { lang: 'python', code: `import asyncio
from concurrent.futures import ProcessPoolExecutor
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request

POOL = ProcessPoolExecutor(max_workers=2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=5.0)   # one pooled client for the app
    yield
    await app.state.http.aclose()
    POOL.shutdown()


app = FastAPI(lifespan=lifespan)


class DbSync:                                          # stand-in for a sync driver
    def query(self, sql: str) -> list[tuple]:
        return [(1,), (2,)]


db_sync = DbSync()


def resize(data: bytes) -> dict:                       # CPU-heavy, top-level so it pickles
    return {"bytes_in": len(data), "thumb": "64x64"}


@app.get("/weather/{city}")
async def weather(city: str, request: Request) -> dict:
    r = await request.app.state.http.get(f"https://api.example.com/w/{city}")
    r.raise_for_status()
    return r.json()


@app.get("/report")
def report() -> dict:                                  # sync route -> threadpool
    rows = db_sync.query("SELECT 1")
    return {"rows": len(rows)}


@app.get("/thumb")
async def thumb(url: str, request: Request) -> dict:
    img = await request.app.state.http.get(url)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(POOL, resize, img.content)   # CPU off the loop


@app.get("/health")
async def health() -> dict:
    return {"ok": True}` },
      complexity: `<p>Latency of each route is unchanged; what changes is that the loop is never blocked, so concurrent requests no longer wait for each other.</p>`,
      followUps: ['How would you detect a blocking call in production before users notice?', 'Why should the URL in /thumb be validated (SSRF)?']
    },
    tests: { skip: 'framework wiring, verified by reading' }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Build a Route Matcher with Typed Parameters, 404, 405 and 422',
    level: 'Hard', tags: ['routing', 'parsing', 'starlette internals'], companies: ['Google', 'Postman'],
    statement: `<p>Implement <code>match_route(routes, method, path)</code> that behaves like FastAPI routing. Each route is <code>"METHOD /template"</code>. Template segments are literal text, <code>{name}</code> (one segment, string), <code>{name:int}</code> (one segment, must be an int <b>after</b> matching) or <code>{name:path}</code> (only as the last segment; the rest of the path, at least one non-empty segment). Rules:</p>
      <ol><li>Drop any <code>?query</code>. Paths are compared segment by segment, exactly (no slash redirects).</li><li>Try routes in order. The first route whose path <b>and</b> method match wins: return <code>"200 &lt;route&gt;"</code> plus <code>" name=value"</code> for each parameter in template order.</li><li>If that winning route has an int parameter that is not an integer (optional leading -, digits), return <code>"422 name"</code>. Routing does not continue.</li><li>If no route matched both, but some route matched the path, return <code>"405"</code>; otherwise <code>"404"</code>.</li></ol>`,
    constraints: `≤ 50 routes, paths ≤ 200 chars. Method compare is case-insensitive; output the route string as given.`,
    example: `${H.table(['routes', 'request', 'result'], [['GET /users/{id:int}, GET /users/me', 'GET /users/me', '<span class="c-r">422 id</span> (shadowed!)'], ['GET /users/me, GET /users/{id:int}', 'GET /users/me', '<span class="c-g">200 GET /users/me</span>'], ['same', 'DELETE /users/7', '405'], ['GET /files/{p:path}', 'GET /files/a/b.txt', '200 GET /files/{p:path} p=a/b.txt']])}`,
    brute: {
      why: `<p>Comparing whole strings, or using <code>startswith</code>. <code>"/users/7".startswith("/users")</code> also matches <code>/users7</code> and <code>/users/7/orders</code>. You need per-segment matching, and you must remember a path-only match to tell 405 from 404.</p>`,
      code: { lang: 'python', code: `def match_route(routes: list[str], method: str, path: str) -> str:
    for r in routes:
        m, t = r.split(" ", 1)
        if path.startswith(t.split("{")[0]):       # far too loose; ignores method and types
            return "200 " + r
    return "404"` }
    },
    mcq: { q: 'Routes: <code>POST /users</code>, <code>GET /users</code>. Request <code>DELETE /users</code>. Result?', options: ['405 Method Not Allowed', '404 Not Found', '200 from the first route', '422'], answer: 0, explain: 'The path matched at least one route, just not with DELETE, so the correct answer is 405 (with an Allow header listing GET, POST).' },
    hints: [
      `<p>Hint 1: split both template and path on "/" (after removing the query). A helper <code>match_path(template_parts, path_parts)</code> returns a list of (name, kind, value) or None.</p>`,
      `<p>Hint 2: for <code>{x:path}</code> at position i, the value is <code>"/".join(path_parts[i:])</code>, which must be non-empty; for other segments the counts must be equal.</p>`,
      `<p>Hint 3: loop over routes; on path match set <code>seen_path = True</code>; if the method also matches, validate int params and return. After the loop: 405 if seen_path else 404. Empty path segments (from "//") never match a parameter.</p>`
    ],
    solution: {
      approach: `<p>Two phases, like Starlette and FastAPI. <b>Matching</b> is purely about the shape of the path: literal segments must be equal, <code>{x}</code> and <code>{x:int}</code> take any one non-empty segment, <code>{x:path}</code> swallows the rest. <b>Validation</b> runs only on the chosen route: an int parameter that does not parse becomes 422 for that route, and routing does not try later ones, which is exactly why <code>/users/me</code> must be declared before <code>/users/{id}</code>. A path-only match is remembered to answer 405 instead of 404.</p>`,
      code: { lang: 'python', run: true, code: `def match_path(template: str, path: str):
    """Return [(name, kind, value), ...] if the shapes fit, else None."""
    t_parts = template.strip("/").split("/") if template.strip("/") else []
    p_parts = path.strip("/").split("/") if path.strip("/") else []
    if path.startswith("/") and path != "/" and path.endswith("/"):
        p_parts.append("")                    # trailing slash = an extra empty segment
    params = []
    for i, seg in enumerate(t_parts):
        if seg.startswith("{") and seg.endswith("}"):
            name, _, kind = seg[1:-1].partition(":")
            kind = kind or "str"
            if kind == "path":
                rest = "/".join(p_parts[i:])
                if i != len(t_parts) - 1 or not rest.strip("/"):
                    return None
                params.append((name, kind, rest))
                return params
            if i >= len(p_parts) or p_parts[i] == "":
                return None
            params.append((name, kind, p_parts[i]))
        elif i >= len(p_parts) or p_parts[i] != seg:
            return None
    return params if len(p_parts) == len(t_parts) else None


def is_int(s: str) -> bool:
    digits = s[1:] if s.startswith("-") else s
    return digits.isdigit() and digits.isascii()


def match_route(routes: list[str], method: str, path: str) -> str:
    path = path.split("?", 1)[0]
    seen_path = False
    for route in routes:
        r_method, template = route.split(" ", 1)
        params = match_path(template, path)
        if params is None:
            continue
        seen_path = True
        if r_method.upper() != method.upper():
            continue
        for name, kind, value in params:
            if kind == "int" and not is_int(value):
                return f"422 {name}"
        return " ".join(["200 " + route] + [f"{n}={v}" for n, _, v in params])
    return "405" if seen_path else "404"


R = ["GET /users/me", "GET /users/{id:int}", "POST /users", "GET /files/{p:path}"]
for m, p in [("GET", "/users/me"), ("GET", "/users/7?x=1"), ("GET", "/users/abc"),
             ("DELETE", "/users/7"), ("GET", "/files/a/b.txt"), ("GET", "/orders")]:
    print(m, p, "->", match_route(R, m, p))` },
      dry: { head: ['route tried', 'path fits?', 'method?', 'outcome'], rows: [['GET /users/me', 'no (7 ≠ me)', '-', 'next'], ['GET /users/{id:int}', 'yes', 'DELETE ≠ GET', 'seen_path = True'], ['POST /users', 'no (2 segs vs 1)', '-', 'next'], ['GET /files/{p:path}', 'no', '-', 'end → 405']] },
      complexity: `<p>O(R × S) for R routes and S segments. Starlette is the same idea with precompiled regexes.</p>`,
      followUps: ['How would you build the <code>Allow</code> header for a 405?', 'How would a radix tree router change the complexity, and why does FastAPI not need one?']
    },
    tests: { fn: 'matchRoute', names: { python: 'match_route' }, sig: 'string[] string string -> string', cases: [
      [[['GET /users/me', 'GET /users/{id:int}', 'POST /users', 'GET /files/{p:path}'], 'GET', '/users/me'], '200 GET /users/me'],
      [[['GET /users/me', 'GET /users/{id:int}', 'POST /users', 'GET /files/{p:path}'], 'GET', '/users/7?x=1'], '200 GET /users/{id:int} id=7'],
      [[['GET /users/me', 'GET /users/{id:int}', 'POST /users', 'GET /files/{p:path}'], 'get', '/users/abc'], '422 id'],
      [[['GET /users/me', 'GET /users/{id:int}', 'POST /users', 'GET /files/{p:path}'], 'DELETE', '/users/7'], '405'],
      [[['GET /users/me', 'GET /users/{id:int}', 'POST /users', 'GET /files/{p:path}'], 'GET', '/files/a/b.txt'], '200 GET /files/{p:path} p=a/b.txt'],
      [[['GET /users/me', 'GET /users/{id:int}', 'POST /users', 'GET /files/{p:path}'], 'GET', '/orders'], '404'],
      [[['GET /users/{id:int}', 'GET /users/me'], 'GET', '/users/me'], '422 id'],
      [[['GET /users/{id:int}'], 'GET', '/users/-3'], '200 GET /users/{id:int} id=-3'],
      [[['GET /users/{id:int}'], 'GET', '/users/7/orders'], '404'],
      [[['GET /users/{id:int}'], 'GET', '/users/'], '404'],
      [[['GET /files/{p:path}'], 'GET', '/files/'], '404'],
      [[['POST /users', 'GET /users'], 'DELETE', '/users'], '405'],
      [[['POST /users', 'GET /users'], 'GET', '/users'], '200 GET /users'],
      [[['GET /'], 'GET', '/'], '200 GET /'],
      [[['GET /shops/{shop}/items/{item_id:int}'], 'GET', '/shops/north/items/42'], '200 GET /shops/{shop}/items/{item_id:int} shop=north item_id=42'],
      [[['PUT /items/{id:int}', 'GET /items/{id:int}'], 'GET', '/items/x'], '422 id']
    ] }
  });

  practice.push({
    title: 'Resolve a Dependency Graph with Caching and Cycle Detection',
    level: 'Hard', tags: ['dependency injection', 'graphs', 'dfs'], companies: ['Microsoft', 'Atlassian'],
    statement: `<p>Simulate how FastAPI resolves dependencies for one request. <code>edges</code> are strings <code>"a-&gt;b"</code> meaning "a needs b", listed in the order the parameters appear in <code>a</code>'s signature. Write <code>resolve_order(edges, target)</code> returning the order in which functions are <b>called</b>: every dependency before the function that needs it, each function called <b>once</b> (per-request cache), children visited in edge order. If there is a cycle reachable from the target, return <code>["error:cycle x-&gt;y-&gt;x"]</code> naming the cycle path in the order it was found.</p>`,
    constraints: `≤ 200 edges, names are identifiers. A target with no edges is just called: <code>[target]</code>.`,
    example: `${H.table(['edges', 'target', 'result'], [['list_orders→get_user, list_orders→pagination, list_orders→get_session, get_user→get_session, pagination→get_settings', 'list_orders', '<span class="c-g">[get_session, get_user, get_settings, pagination, list_orders]</span>'], ['a→b, b→c, c→a', 'a', '<span class="c-r">["error:cycle a->b->c->a"]</span>']])}<p>Why get_session appears once: get_user asked for it first, the route's own request hit the cache.</p>`,
    brute: {
      why: `<p>Plain recursion without a cache calls <code>get_session</code> once per path that reaches it: two sessions for one request, two transactions, and exponential blow-up on diamond-shaped graphs. Without a "currently visiting" set, a cycle recurses until <code>RecursionError</code>.</p>`,
      code: { lang: 'python', code: `def resolve_order(edges: list[str], target: str) -> list[str]:
    graph = {}
    for e in edges:
        a, b = e.split("->")
        graph.setdefault(a, []).append(b)

    def call(n):                       # no cache, no cycle check
        out = []
        for d in graph.get(n, []):
            out += call(d)
        return out + [n]
    return call(target)` }
    },
    mcq: { q: 'Which DFS state detects a cycle?', options: ['A node that is currently on the recursion stack ("visiting") is reached again', 'A node that was fully resolved earlier is reached again', 'A node has more than two children', 'The graph has more edges than nodes'], answer: 0, explain: 'Reaching a finished node is normal (a cache hit, diamond shape). Reaching a node that is still being resolved means a back edge: a cycle.' },
    hints: [
      `<p>Hint 1: build an adjacency list preserving edge order. Use three states: unvisited, visiting (on the stack), done.</p>`,
      `<p>Hint 2: post-order DFS: resolve every child, then append the node. A done child is skipped (cache hit).</p>`,
      `<p>Hint 3: keep the current stack as a list; when you meet a visiting node n, the cycle is <code>stack[stack.index(n):] + [n]</code>. Raise or return a sentinel to stop everything.</p>`
    ],
    solution: {
      approach: `<p>Topological order by post-order DFS. <code>done</code> plays the role of FastAPI's per-request dependency cache: once a function's value exists it is reused. <code>stack</code> is the chain of functions currently being resolved; meeting one of them again is a cycle, which FastAPI would hit as infinite recursion at startup. The order of children follows parameter order, which is also the order FastAPI uses.</p>`,
      code: { lang: 'python', run: true, code: `class Cycle(Exception):
    pass


def resolve_order(edges: list[str], target: str) -> list[str]:
    graph: dict[str, list[str]] = {}
    for e in edges:
        a, b = (s.strip() for s in e.split("->"))
        graph.setdefault(a, []).append(b)

    order, done, stack = [], set(), []

    def visit(n: str) -> None:
        if n in done:
            return                                  # cache hit: already called
        if n in stack:
            raise Cycle("->".join(stack[stack.index(n):] + [n]))
        stack.append(n)
        for dep in graph.get(n, []):
            visit(dep)
        stack.pop()
        done.add(n)
        order.append(n)                             # called after all its deps

    try:
        visit(target)
    except Cycle as c:
        return [f"error:cycle {c}"]
    return order


E = ["list_orders->get_user", "list_orders->pagination", "list_orders->get_session",
     "get_user->get_session", "pagination->get_settings"]
print(resolve_order(E, "list_orders"))
print(resolve_order(["a->b", "b->c", "c->a"], "a"))` },
      dry: { head: ['call', 'stack', 'done', 'order'], rows: [['visit list_orders', '[list_orders]', '{}', '[]'], ['visit get_user → get_session', '[list_orders, get_user, get_session]', '{}', '[]'], ['finish get_session, get_user', '[list_orders]', '{get_session, get_user}', '[get_session, get_user]'], ['visit pagination → get_settings', '[list_orders, pagination, get_settings]', '…', '[…, get_settings, pagination]'], ['get_session again', '[list_orders]', 'hit', 'skip; then list_orders']] },
      complexity: `<p>O(V + E) time and O(V) space; each node is finished once, each edge examined once.</p>`,
      followUps: ['How would <code>use_cache=False</code> on one edge change the algorithm?', 'FastAPI resolves sub-dependencies of a route concurrently? (It does not: they run in order. Why might that matter for async dependencies?)']
    },
    tests: { fn: 'resolveOrder', names: { python: 'resolve_order' }, sig: 'string[] string -> string[]', cases: [
      [[['list_orders->get_user', 'list_orders->pagination', 'list_orders->get_session', 'get_user->get_session', 'pagination->get_settings'], 'list_orders'], ['get_session', 'get_user', 'get_settings', 'pagination', 'list_orders']],
      [[['a->b', 'b->c', 'c->a'], 'a'], ['error:cycle a->b->c->a']],
      [[[], 'health'], ['health']],
      [[['a->b', 'a->c', 'b->d', 'c->d'], 'a'], ['d', 'b', 'c', 'a']],
      [[['a->b', 'b->c', 'c->b'], 'a'], ['error:cycle b->c->b']],
      [[['x->y', 'a->b'], 'a'], ['b', 'a']],
      [[['a->a'], 'a'], ['error:cycle a->a']],
      [[['r->s', 'r->u', 'u->s', 'u->t', 't->s'], 'r'], ['s', 't', 'u', 'r']]
    ] }
  });

  practice.push({
    title: 'Cursor Pagination with an Opaque Cursor',
    level: 'Hard', tags: ['pagination', 'api design', 'base64'], companies: ['Twitter', 'Slack'],
    statement: `<p>Offsets get slow and skip or repeat rows when data changes. Implement keyset pagination for <code>GET /events?cursor=&amp;limit=</code>. Write <code>next_page(ids, cursor, limit)</code>: <code>ids</code> is the sorted (ascending, unique) list of event ids; <code>cursor</code> is <code>""</code> for the first page, otherwise the URL-safe base64 (with padding) of the text <code>"after:&lt;id&gt;"</code>. Return the page's ids as strings, then one final entry: <code>"next=&lt;cursor&gt;"</code> encoding the last id on the page if more items exist after it, else <code>"next=null"</code>.</p>
      <ul><li><code>limit</code> outside 1..100 → <code>["error:invalid limit"]</code>.</li><li>A cursor that is not valid base64, not UTF-8, lacks the <code>after:</code> prefix or has a non-integer id → <code>["error:invalid cursor"]</code>.</li><li>A valid cursor whose id is not in the list is fine: continue after that value.</li></ul>`,
    constraints: `≤ 10<sup>5</sup> ids. The cursor id can be any integer (including negative).`,
    example: `${H.table(['ids', 'cursor', 'limit', 'result'], [['[1,2,3,5,8]', '""', '2', '["1","2","next=YWZ0ZXI6Mg=="]'], ['[1,2,3,5,8]', '"YWZ0ZXI6Mg==" (after:2)', '2', '["3","5","next=YWZ0ZXI6NQ=="]'], ['[1,2,3,5,8]', '"YWZ0ZXI6NQ==" (after:5)', '2', '["8","next=null"]'], ['[1,2,3]', '"hello"', '2', '["error:invalid cursor"]']])}`,
    brute: {
      why: `<p>Offset paging <code>ids[offset:offset+limit]</code>. If a new event is inserted at the front between two requests, every item shifts and the client sees one item twice; a delete makes it skip one. In SQL, <code>OFFSET 100000</code> also reads and throws away 100,000 rows. Exposing a raw id (<code>?after=5</code>) works but locks you into that format forever; an opaque cursor lets you change it later.</p>`,
      code: { lang: 'python', code: `def next_page_offset(ids: list[int], offset: int, limit: int) -> list[int]:
    return ids[offset:offset + limit]       # shifts when rows are inserted or deleted` }
    },
    mcq: { q: 'Why is a keyset cursor stable when new rows are inserted at the start?', options: ['It continues "after id X", which does not depend on how many rows come before X', 'Because base64 is ordered', 'Because the server stores each client\'s position', 'It is not stable'], answer: 0, explain: 'The query is WHERE id > X ORDER BY id LIMIT n. Inserting rows before X changes offsets, not which rows have id > X.' },
    hints: [
      `<p>Hint 1: decode with <code>base64.urlsafe_b64decode(cursor.encode())</code> inside try/except (it raises <code>binascii.Error</code> / <code>ValueError</code>); then <code>.decode("utf-8")</code>.</p>`,
      `<p>Hint 2: find the start with <code>bisect.bisect_right(ids, after)</code>: the first index with id &gt; after, in O(log n), just like an index seek in SQL.</p>`,
      `<p>Hint 3: take <code>ids[start:start+limit]</code>; there is a next page if <code>start + limit &lt; len(ids)</code>. Encode the last id of the page as the next cursor.</p>`
    ],
    solution: {
      approach: `<p>The cursor is an opaque token, so clients cannot depend on its format. Decoding is strict, and any error becomes a clear 400/422-style error. The position is found by binary search (the in-memory version of <code>WHERE id &gt; :after ORDER BY id LIMIT :limit</code> using the primary-key index). Only emit a next cursor when more data exists, so clients can stop. In FastAPI, the route takes <code>cursor: str = ""</code> and <code>limit: Annotated[int, Query(ge=1, le=100)] = 20</code>, raises <code>HTTPException(400, "invalid cursor")</code> on bad input, and returns <code>{"items": [...], "next_cursor": ...}</code>.</p>`,
      code: { lang: 'python', run: true, code: `import base64
import binascii
from bisect import bisect_right


def encode_cursor(last_id: int) -> str:
    return base64.urlsafe_b64encode(f"after:{last_id}".encode()).decode()


def decode_cursor(cursor: str) -> int:
    raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8")
    if not raw.startswith("after:"):
        raise ValueError("bad prefix")
    return int(raw.removeprefix("after:"))


def next_page(ids: list[int], cursor: str, limit: int) -> list[str]:
    if not 1 <= limit <= 100:
        return ["error:invalid limit"]
    start = 0
    if cursor:
        try:
            after = decode_cursor(cursor)
        except (binascii.Error, ValueError, UnicodeError):
            return ["error:invalid cursor"]
        start = bisect_right(ids, after)          # first id > after (index seek)
    page = ids[start:start + limit]
    has_more = start + limit < len(ids)
    nxt = encode_cursor(page[-1]) if has_more and page else "null"
    return [str(i) for i in page] + [f"next={nxt}"]


ids = [1, 2, 3, 5, 8]
c = ""
while True:
    out = next_page(ids, c, 2)
    print(out)
    if out[-1] == "next=null":
        break
    c = out[-1].removeprefix("next=")` },
      alt: [{ lang: 'python', title: 'The FastAPI route around it', code: `import base64
import binascii
from bisect import bisect_right
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

app = FastAPI()
EVENT_IDS = list(range(1, 101))


class EventPage(BaseModel):
    items: list[int]
    next_cursor: str | None


@app.get("/events")
def list_events(cursor: Annotated[str, Query(max_length=64)] = "",
                limit: Annotated[int, Query(ge=1, le=100)] = 20) -> EventPage:
    start = 0
    if cursor:
        try:
            raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode()
            if not raw.startswith("after:"):
                raise ValueError(raw)
            start = bisect_right(EVENT_IDS, int(raw.removeprefix("after:")))
        except (binascii.Error, ValueError, UnicodeError):
            raise HTTPException(status_code=400, detail="invalid cursor")
    page = EVENT_IDS[start:start + limit]
    more = start + limit < len(EVENT_IDS)
    nxt = base64.urlsafe_b64encode(f"after:{page[-1]}".encode()).decode() if more and page else None
    return EventPage(items=page, next_cursor=nxt)` }],
      complexity: `<p>O(log n + limit) per page with binary search; in SQL an index seek plus limit rows, independent of how deep the client has paged.</p>`,
      followUps: ['How do you paginate by <code>created_at</code> when timestamps are not unique?', 'Should the cursor be signed (HMAC) so clients cannot forge one? When does that matter?']
    },
    tests: { fn: 'nextPage', names: { python: 'next_page' }, sig: 'int[] string int -> string[]', cases: [
      [[[1, 2, 3, 5, 8], '', 2], ['1', '2', 'next=YWZ0ZXI6Mg==']],
      [[[1, 2, 3, 5, 8], 'YWZ0ZXI6Mg==', 2], ['3', '5', 'next=YWZ0ZXI6NQ==']],
      [[[1, 2, 3, 5, 8], 'YWZ0ZXI6NQ==', 2], ['8', 'next=null']],
      [[[1, 2, 3, 5, 8], 'YWZ0ZXI6Mw==', 3], ['5', '8', 'next=null']],
      [[[1, 2, 3], 'hello', 2], ['error:invalid cursor']],
      [[[1, 2, 3], 'YWZ0ZXI6eA==', 2], ['error:invalid cursor']],
      [[[1, 2, 3], 'YmVmb3JlOjM=', 2], ['error:invalid cursor']],
      [[[1, 2, 3], '', 0], ['error:invalid limit']],
      [[[1, 2, 3], '', 101], ['error:invalid limit']],
      [[[], '', 10], ['next=null']],
      [[[1, 2, 3, 4], '', 4], ['1', '2', '3', '4', 'next=null']],
      [[[1, 2, 3, 4], '', 3], ['1', '2', '3', 'next=YWZ0ZXI6Mw==']],
      [[[10, 20, 30], 'YWZ0ZXI6NQ==', 1], ['10', 'next=YWZ0ZXI6MTA=']]
    ] }
  });

  practice.push({
    title: 'Design a Complete Notes API in FastAPI',
    level: 'Hard', tags: ['api design', 'routers', 'dependencies', 'pydantic'], companies: ['Notion', 'Atlassian', 'Amazon'],
    statement: `<p>Build the full HTTP layer for a multi-user notes service (in-memory storage is fine). Requirements:</p>
      <ul><li><code>POST /api/v1/notes</code> (201 + Location), <code>GET /api/v1/notes</code> (filter by <code>tag</code>, search <code>q</code>, <code>limit/offset</code> pagination with total), <code>GET/PATCH/DELETE /api/v1/notes/{note_id}</code>.</li>
      <li>Users identified by a dependency reading <code>X-User-Id</code> (401 if missing). Users only see their own notes; another user's note is <b>404</b>.</li>
      <li>Models: <code>NoteCreate</code> (title 1-120, body ≤ 10 000, tags ≤ 10 unique lowercase), <code>NoteUpdate</code> (all optional, PATCH with <code>exclude_unset</code>), <code>NoteOut</code>, <code>NotePage</code>. Unknown keys rejected.</li>
      <li>Domain errors in a service layer mapped by exception handlers. OpenAPI documents the 401/404 responses. A test overrides the user dependency.</li></ul>`,
    constraints: `FastAPI ≥ 0.110, Pydantic v2, Python 3.11+. Routes contain no business rules.`,
    example: `${H.table(['Request', 'Result'], [['POST /api/v1/notes (user 1) {"title":"Plan","tags":["Work"]}', '201, Location: /api/v1/notes/1, tags ["work"]'], ['GET /api/v1/notes/1 (user 2)', '<span class="c-r">404</span>'], ['PATCH /api/v1/notes/1 (user 1) {"title":""}', '<span class="c-r">422</span>'], ['GET /api/v1/notes?limit=500', '<span class="c-r">422</span>']])}`,
    brute: { why: `<p>One file, one <code>Note</code> model for everything, ownership checked with an <code>if</code> in some routes but not others, and errors returned as <code>{"error": "..."}</code> with status 200. It works in a demo; it fails security review (cross-user reads, mass assignment) and every client has to special-case the errors.</p>` },
    mcq: { q: 'User 2 requests user 1\'s note. Which response is best?', options: ['404, so the API does not reveal the note exists', '403 with "this note belongs to user 1"', '200 with an empty body', '401'], answer: 0, explain: 'For resources scoped to an owner, 404 avoids leaking which ids exist (an enumeration risk). 403 is used when the caller may know the resource exists but lacks permission.' },
    hints: [
      `<p>Hint 1: layers: <code>schemas</code> (Pydantic), <code>service</code> (NotesService with an owner argument, raises NoteNotFound), <code>router</code> (thin), <code>deps</code> (CurrentUser, service provider), <code>errors</code> (handlers).</p>`,
      `<p>Hint 2: the service's <code>get(owner, note_id)</code> raises NoteNotFound both when the note does not exist and when it belongs to someone else: one code path, no leak.</p>`,
      `<p>Hint 3: normalise tags in a <code>field_validator</code> (lowercase, strip, dedupe preserving order) and cap with <code>max_length</code>. PATCH: <code>body.model_dump(exclude_unset=True)</code>.</p>`
    ],
    solution: {
      approach: `<p><b>Schemas</b> define the contract (input, update, output, page), with <code>extra="forbid"</code> and constraints. <b>The service</b> owns storage and rules and receives the owner id explicitly; it raises <code>NoteNotFound</code> for missing and foreign notes alike. <b>Dependencies</b> provide the current user (401 if absent) and the service (one instance, overridable). <b>The router</b> only translates HTTP to service calls and sets 201/204 and Location. <b>Handlers</b> map domain errors to problem-style JSON. <b>OpenAPI</b> lists 401/404 via <code>responses</code>. A test overrides <code>get_current_user_id</code> to act as different users.</p>`,
      code: { lang: 'python', code: `from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------- schemas ----------
def clean_tags(tags: list[str] | None) -> list[str] | None:
    if tags is None:
        return None
    out: list[str] = []
    for t in tags:
        t = t.strip().lower()
        if t and t not in out:
            out.append(t)
    return out


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(default="", max_length=10_000)
    tags: list[Annotated[str, Field(max_length=30)]] = Field(default_factory=list, max_length=10)

    @field_validator("tags")
    @classmethod
    def normalise_tags(cls, v: list[str] | None) -> list[str] | None:
        return clean_tags(v)


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str | None = Field(default=None, min_length=1, max_length=120)
    body: str | None = Field(default=None, max_length=10_000)
    tags: list[Annotated[str, Field(max_length=30)]] | None = Field(default=None, max_length=10)

    @field_validator("tags")
    @classmethod
    def normalise_tags(cls, v: list[str] | None) -> list[str] | None:
        return clean_tags(v)


class NoteOut(BaseModel):
    id: int
    title: str
    body: str
    tags: list[str]
    updated_at: datetime


class NotePage(BaseModel):
    items: list[NoteOut]
    total: int
    limit: int
    offset: int


class Problem(BaseModel):
    title: str
    status: int
    detail: str


# ---------- service (no FastAPI imports needed here) ----------
class NoteNotFound(Exception):
    def __init__(self, note_id: int) -> None:
        super().__init__(f"note {note_id} not found")
        self.note_id = note_id


class NotesService:
    def __init__(self) -> None:
        self._notes: dict[int, dict] = {}
        self._next = 1

    def _owned(self, owner: int, note_id: int) -> dict:
        note = self._notes.get(note_id)
        if note is None or note["owner"] != owner:   # same answer: no existence leak
            raise NoteNotFound(note_id)
        return note

    def create(self, owner: int, data: NoteCreate) -> dict:
        note = {"id": self._next, "owner": owner, **data.model_dump(),
                "updated_at": datetime.now(timezone.utc)}
        self._notes[note["id"]] = note
        self._next += 1
        return note

    def get(self, owner: int, note_id: int) -> dict:
        return self._owned(owner, note_id)

    def update(self, owner: int, note_id: int, changes: dict) -> dict:
        note = self._owned(owner, note_id)
        note.update(changes, updated_at=datetime.now(timezone.utc))
        return note

    def delete(self, owner: int, note_id: int) -> None:
        self._owned(owner, note_id)
        del self._notes[note_id]

    def search(self, owner: int, tag: str | None, q: str | None, limit: int, offset: int):
        rows = [n for n in self._notes.values() if n["owner"] == owner
                and (tag is None or tag.lower() in n["tags"])
                and (q is None or q.lower() in (n["title"] + " " + n["body"]).lower())]
        rows.sort(key=lambda n: n["id"])
        return rows[offset:offset + limit], len(rows)


# ---------- dependencies ----------
_service = NotesService()


def get_service() -> NotesService:
    return _service


def get_current_user_id(x_user_id: Annotated[int | None, Header(gt=0)] = None) -> int:
    if x_user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-User-Id header required",
                            headers={"WWW-Authenticate": "Bearer"})
    return x_user_id


ServiceDep = Annotated[NotesService, Depends(get_service)]
UserId = Annotated[int, Depends(get_current_user_id)]
ERRORS = {401: {"model": Problem, "description": "Not authenticated"},
          404: {"model": Problem, "description": "Note not found (or not yours)"}}

# ---------- router ----------
router = APIRouter(prefix="/notes", tags=["notes"], responses={401: ERRORS[401]})


@router.post("", status_code=status.HTTP_201_CREATED, response_model=NoteOut)
def create_note(body: NoteCreate, user: UserId, svc: ServiceDep, response: Response) -> dict:
    note = svc.create(user, body)
    response.headers["Location"] = f"/api/v1/notes/{note['id']}"
    return note


@router.get("", response_model=NotePage)
def list_notes(user: UserId, svc: ServiceDep,
               tag: Annotated[str | None, Query(max_length=30)] = None,
               q: Annotated[str | None, Query(min_length=2, max_length=50)] = None,
               limit: Annotated[int, Query(ge=1, le=100)] = 20,
               offset: Annotated[int, Query(ge=0)] = 0) -> dict:
    items, total = svc.search(user, tag, q, limit, offset)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{note_id}", response_model=NoteOut, responses={404: ERRORS[404]})
def read_note(note_id: int, user: UserId, svc: ServiceDep) -> dict:
    return svc.get(user, note_id)


@router.patch("/{note_id}", response_model=NoteOut, responses={404: ERRORS[404]})
def update_note(note_id: int, body: NoteUpdate, user: UserId, svc: ServiceDep) -> dict:
    return svc.update(user, note_id, body.model_dump(exclude_unset=True))


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: ERRORS[404]})
def delete_note(note_id: int, user: UserId, svc: ServiceDep) -> None:
    svc.delete(user, note_id)


# ---------- app + error mapping ----------
app = FastAPI(title="Notes API", version="1.0.0")
app.include_router(router, prefix="/api/v1")


@app.exception_handler(NoteNotFound)
async def note_not_found(request: Request, exc: NoteNotFound) -> JSONResponse:
    return JSONResponse(status_code=404, media_type="application/problem+json",
                        content={"title": "Not Found", "status": 404, "detail": str(exc)})


# ---------- test (pytest) ----------
def test_users_cannot_read_each_others_notes() -> None:
    from fastapi.testclient import TestClient
    client = TestClient(app)
    created = client.post("/api/v1/notes", json={"title": "Plan", "tags": ["Work"]},
                          headers={"X-User-Id": "1"})
    assert created.status_code == 201 and created.json()["tags"] == ["work"]
    note_url = created.headers["Location"]
    app.dependency_overrides[get_current_user_id] = lambda: 2
    try:
        assert client.get(note_url).status_code == 404
    finally:
        app.dependency_overrides.clear()` },
      complexity: `<p>In-memory search is O(n) per list call; a real database (Python Backend II) with an index on <code>(owner_id, id)</code> makes it O(log n + limit).</p>`,
      followUps: ['How would you add optimistic locking (ETag / If-Match) to PATCH (Backend 4)?', 'What changes when the service becomes async with an async database driver?']
    },
    tests: { skip: 'framework wiring, verified by reading' }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({
    q: 'What does <code>main:app</code> mean in <code>uvicorn main:app --reload</code>?',
    options: ['Import module <code>main</code> and use its attribute <code>app</code> as the ASGI application', 'Run function <code>app()</code> in file main', 'Use the <code>main</code> branch of the <code>app</code> repository', 'Start the <code>app</code> worker in the main process'],
    answer: 0,
    explain: 'Uvicorn imports the module path before the colon and takes the variable after it. The variable must be the FastAPI (ASGI) object.'
  });
  quiz.push({
    q: 'Routes are declared in this order: <code>GET /items/{item_id}</code> (item_id: int), then <code>GET /items/latest</code>. What does <code>GET /items/latest</code> return?',
    options: ['422, because "latest" matched the first route and is not an int', '200 from the latest route', '404', '405'],
    answer: 0,
    explain: 'The first template matches any segment. Validation runs after the match and fails; FastAPI does not try later routes. Declare fixed paths first.'
  });
  quiz.push({
    q: 'Signature <code>def search(q: str, page: int = 1)</code>. Request <code>GET /search?page=2</code>. Result?',
    options: ['422: q is required because it has no default', '200 with q = ""', '200 with q = None', '400'],
    answer: 0,
    explain: 'A query parameter without a default is required. Use <code>q: str | None = None</code> to make it optional.'
  });
  quiz.push({
    q: 'Which Pydantic v2 code rejects a request body containing an unknown key <code>"is_admin"</code>?',
    options: ['<code>model_config = ConfigDict(extra="forbid")</code>', '<code>class Config: extra = "forbid"</code> only', '<code>Field(strict=True)</code> on every field', 'Nothing; Pydantic always rejects unknown keys'],
    answer: 0,
    explain: 'v2 uses model_config. The default is extra="ignore", which silently drops unknown keys. class Config is the v1 style.'
  });
  quiz.push({
    q: 'Your route returns a <code>UserInDB</code> object (with <code>password_hash</code>) and the decorator has <code>response_model=UserOut</code>. What reaches the client?',
    options: ['Only the fields declared on UserOut', 'All fields including password_hash', 'A 500 error because the types differ', 'An empty object'],
    answer: 0,
    explain: 'FastAPI validates the return value through the response model and serialises only its fields. That is the main safety reason to use response models.'
  });
  quiz.push({
    q: 'The return value is missing a field that the response model requires. What does the client receive?',
    options: ['500, because it is a server-side bug (ResponseValidationError)', '422', '200 with the field set to null', '400'],
    answer: 0,
    explain: '422 is for invalid client input. An invalid response is the server\'s fault, so FastAPI raises ResponseValidationError and answers 500.'
  });
  quiz.push({
    q: 'Which is the correct way to make a successful DELETE return 204?',
    options: ['<code>@app.delete("/x/{id}", status_code=status.HTTP_204_NO_CONTENT)</code> and return None', '<code>raise HTTPException(204)</code>', '<code>return {"status": 204}</code>', '<code>return Response(status_code=200)</code>'],
    answer: 0,
    explain: 'Success status codes are set on the decorator. 204 means no body, so the function returns None.'
  });
  quiz.push({
    q: 'Handlers are registered for <code>DomainError</code> and <code>Conflict</code>. <code>class OutOfStock(Conflict)</code> is raised. Which handler runs?',
    options: ['Conflict\'s handler', 'DomainError\'s handler', 'Both', 'The default 500 handler'],
    answer: 0,
    explain: 'Starlette walks the exception class MRO (OutOfStock, Conflict, DomainError, Exception) and uses the first class that has a handler.'
  });
  quiz.push({
    q: 'Two dependencies of the same route both declare <code>Depends(get_session)</code>. How many times does <code>get_session</code> run in one request?',
    options: ['Once (per-request cache), unless use_cache=False', 'Twice', 'Once per application lifetime', 'Zero; it is lazy'],
    answer: 0,
    explain: 'FastAPI caches dependency results within a request, so the whole tree shares one session.'
  });
  quiz.push({
    q: 'In a yield dependency, where should <code>session.close()</code> go so it always runs?',
    options: ['In a <code>finally:</code> block after <code>yield</code>', 'Before <code>yield</code>', 'In the route function', 'In a middleware only'],
    answer: 0,
    explain: 'If the route raises, the exception is re-raised at the yield. Code after yield without try/finally would be skipped.'
  });
  quiz.push({
    q: 'An <code>async def</code> route calls <code>requests.get(url)</code>, which takes 2 seconds. What happens to other requests on that worker?',
    options: ['They all wait: the event loop is blocked for 2 seconds', 'Nothing; FastAPI moves it to a thread automatically', 'They get 503', 'Only requests to the same route wait'],
    answer: 0,
    explain: 'async def routes run directly on the event loop. A blocking call freezes the loop. Use def (threadpool), an async client, or asyncio.to_thread.'
  });
  quiz.push({
    q: 'Your route raises <code>HTTPException(409)</code> in one branch. Does <code>/openapi.json</code> list a 409 response automatically?',
    options: ['No; declare it with <code>responses={409: {...}}</code>', 'Yes, FastAPI analyses the code', 'Yes, all 4xx codes are always listed', 'Only when debug=True'],
    answer: 0,
    explain: 'FastAPI documents the success response and 422 for validated inputs. Other error responses must be declared.'
  });
  quiz.push({
    q: 'What does <code>pip install "fastapi[standard]"</code> add compared with <code>pip install fastapi</code>?',
    options: ['Uvicorn, the fastapi CLI and extras such as email-validator and httpx', 'A database driver', 'Pydantic v1 compatibility', 'Gunicorn'],
    answer: 0,
    explain: 'The standard extra pulls in uvicorn[standard], fastapi-cli (for fastapi dev / fastapi run) and common optional dependencies.'
  });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({
    q: 'What is FastAPI and why would you choose it over Flask or Django for an API?',
    level: 'B',
    a: `<p>FastAPI is an ASGI web framework built on Starlette and Pydantic. You write functions with type hints and it gives you request parsing, validation with clear 422 errors, response filtering, dependency injection and OpenAPI docs from those hints. Compared with <b>Flask</b> (WSGI, sync, validation is up to you) it removes a lot of boilerplate and supports async natively. Compared with <b>Django</b>, it is lighter: no ORM, admin or templates built in, which is good for API-only services but means you pick your own database layer (SQLAlchemy). I would pick Django when I want the admin, auth and ORM in one batteries-included package, and FastAPI for typed JSON APIs, async I/O heavy services (calls to other services, LLM APIs) and teams that value the generated contract.</p>`,
    followUps: ['What is Starlette\'s role?', 'When would async give no benefit?']
  });
  interview.push({
    q: 'Explain ASGI vs WSGI.',
    level: 'I',
    a: `<p>Both are contracts between a Python web server and a web application. <b>WSGI</b> (PEP 3333) is a synchronous call: <code>app(environ, start_response)</code> returns the body; one request occupies one thread or process until done, and long-lived connections like websockets do not fit. <b>ASGI</b> is the async successor: <code>await app(scope, receive, send)</code>. The app receives events and sends events, so it supports HTTP, websockets and lifespan events, and one process can interleave thousands of waiting connections on an event loop. Uvicorn, Hypercorn and Granian are ASGI servers; FastAPI and Starlette are ASGI apps. Gunicorn is a WSGI process manager, used with Uvicorn worker classes to run ASGI apps.</p>`,
    followUps: ['What is in the ASGI scope dict?', 'What are lifespan events?']
  });
  interview.push({
    q: 'How does FastAPI decide whether a parameter comes from the path, query or body?',
    level: 'B',
    a: `<p>By looking at the signature. If the name appears in the path template (<code>{item_id}</code>), it is a path parameter. If the type is a Pydantic model, it is read from the JSON body. Other simple types (int, str, bool, float, Enum, list with <code>Query()</code>) are query parameters; a default makes them optional, no default makes them required. You can be explicit with <code>Annotated[..., Path()]</code>, <code>Query()</code>, <code>Header()</code>, <code>Cookie()</code>, <code>Body()</code>, <code>Form()</code>, <code>File()</code>, which also carry constraints like <code>ge</code>, <code>le</code>, <code>max_length</code> and descriptions for OpenAPI.</p>`,
    followUps: ['How do you read a list from the query string?', 'What happens with two model parameters?']
  });
  interview.push({
    q: 'Walk me through what happens when a request body fails validation.',
    level: 'I',
    a: `<p>Uvicorn hands the request to the app; routing picks the path operation; FastAPI reads the body and runs it through the Pydantic model's compiled validator. Pydantic checks <b>every</b> field and collects all errors rather than stopping at the first. FastAPI raises <code>RequestValidationError</code> with that list, and the default handler responds <b>422</b> with <code>{"detail": [{"type", "loc", "msg", "input", "ctx"}]}</code>. <code>loc</code> points to the exact spot, e.g. <code>["body", "lines", 2, "qty"]</code>. The route function never runs. You can override the handler to produce problem+json or drop the <code>input</code> field so secrets are not echoed back.</p>`,
    followUps: ['When would you return 400 instead of 422?', 'How do custom validators report errors?']
  });
  interview.push({
    q: 'Why have separate input and output models? Give the typical set for a User.',
    level: 'I',
    a: `<p>Inputs and outputs have different security needs. <code>UserCreate</code> has email, name and password; it should forbid extra keys so a client cannot set <code>is_admin</code> or <code>id</code> (mass assignment). <code>UserOut</code> has id, email, name, created_at, and never the password or hash. <code>UserUpdate</code> has all-optional fields for PATCH, applied with <code>model_dump(exclude_unset=True)</code>. Internally an ORM model or <code>UserInDB</code> holds everything. Share a <code>UserBase</code> without secrets. Using <code>response_model=UserOut</code> means even if the route returns the internal object, FastAPI filters it, so future fields cannot leak by accident.</p>`,
    followUps: ['What does from_attributes do?', 'How would you test that no secret fields leak?']
  });
  interview.push({
    q: 'How does dependency injection work in FastAPI, and how is it different from Spring\'s?',
    level: 'I',
    a: `<p>You declare dependencies in the signature with <code>Depends(fn)</code>, usually via <code>Annotated</code> aliases. At startup FastAPI inspects each route and builds a tree of dependencies (which can have their own parameters and sub-dependencies). Per request it resolves the tree depth-first, caches each result for that request, injects values, and for <code>yield</code> dependencies runs cleanup afterwards. Tests swap implementations with <code>app.dependency_overrides</code>. Spring (Backend 6) uses a container of long-lived beans wired by type, with scopes and proxies. FastAPI's DI is explicit and function-based: no container, no classpath scanning, per-request by default, and each route's needs are visible in its signature. Singletons come from <code>lru_cache</code> or lifespan state.</p>`,
    followUps: ['How would you provide a singleton HTTP client?', 'What is the per-request cache keyed on?']
  });
  interview.push({
    q: 'When should a FastAPI endpoint be async def and when def?',
    level: 'I',
    a: `<p><code>async def</code> runs on the event loop, so it is right when every I/O call inside is awaitable (httpx.AsyncClient, asyncpg, async SQLAlchemy, redis.asyncio) and lets one worker handle many concurrent waits. <code>def</code> runs in a threadpool (AnyIO, 40 threads default), so it is right for sync libraries like requests, boto3 or sync SQLAlchemy. The dangerous case is a blocking call inside <code>async def</code>: it freezes every request on that worker. If I need async plus one blocking call, I use <code>await asyncio.to_thread(fn)</code>. CPU-bound work goes to more processes or a task queue because of the GIL. When unsure, <code>def</code> is the safe default.</p>`,
    followUps: ['How would you find a blocking call in production?', 'What does the threadpool limit mean for DB connection pool sizing?']
  });
  interview.push({
    q: 'How do you design error handling in a FastAPI service?',
    level: 'A',
    a: `<p>Three layers. (1) Validation errors come from Pydantic automatically (422). (2) Business errors are <b>domain exceptions</b> (<code>NotFound</code>, <code>Conflict</code>, <code>PermissionDenied</code>) raised by the service layer, which never imports FastAPI. (3) A central module registers exception handlers that map each domain class to a status and one response shape (RFC 9457 problem+json), plus handlers for Starlette's HTTPException (to catch router 404/405 too), RequestValidationError and a catch-all Exception that logs with a request id and returns a neutral 500. Handlers are found by walking the exception's MRO, so subclasses inherit mappings. Error responses are declared with <code>responses=</code> so they appear in OpenAPI. I avoid try/except Exception in routes because it turns real 404s into 500s and leaks <code>str(e)</code>.</p>`,
    followUps: ['How do you keep headers like Retry-After?', 'How do errors interact with yield dependencies and transactions?']
  });
  interview.push({
    q: 'How is the OpenAPI schema generated, and how do you use it beyond /docs?',
    level: 'I',
    a: `<p><code>app.openapi()</code> walks every route once, collects parameters from the dependency tree, asks Pydantic for JSON Schemas of the models, puts shared models in <code>components/schemas</code>, and caches the result; <code>/openapi.json</code> serves it and <code>/docs</code> and <code>/redoc</code> render it. Beyond docs: generate typed clients (TypeScript, Kotlin, Swift) with stable <code>operation_id</code>s; diff the schema in CI to catch breaking changes; import it into API gateways; and give it to AI agents or MCP adapters as tool definitions. To make it accurate, declare error responses with <code>responses=</code>, add descriptions and examples, and hide internal routes with <code>include_in_schema=False</code>.</p>`,
    followUps: ['How do you export the schema without running a server?', 'Why do Item-Input and Item-Output schemas sometimes appear?']
  });
  interview.push({
    q: 'How do you run FastAPI in production?',
    level: 'A',
    a: `<p>No <code>--reload</code>. Run <code>fastapi run</code> or <code>uvicorn main:app --host 0.0.0.0 --port 8000 --workers N</code>, or Gunicorn with Uvicorn workers, or in Kubernetes one Uvicorn process per container and scale pods instead of workers. N is roughly the number of CPU cores, adjusted by memory. Behind a load balancer use <code>--proxy-headers</code> and <code>--forwarded-allow-ips</code> so scheme and client IP are correct. Set timeouts (keep-alive, graceful shutdown), expose <code>/health</code> and <code>/ready</code>, log in JSON to stdout, put open/close of pools in <code>lifespan</code>, and disable or protect <code>/docs</code> if the API is internal. Remember each worker is a separate process with its own memory: no shared in-process state (Python Backend V covers containers and workers in depth).</p>`,
    followUps: ['Workers per container or one process per pod?', 'How does graceful shutdown interact with lifespan?']
  });
  interview.push({
    q: 'What is lifespan and why did it replace on_event?',
    level: 'I',
    a: `<p><code>lifespan</code> is an async context manager passed to <code>FastAPI(lifespan=...)</code>. Code before <code>yield</code> runs once when the server starts (open DB pools, create a shared <code>httpx.AsyncClient</code>, load an ML model), and code after <code>yield</code> runs once at shutdown (close them). It replaced <code>@app.on_event("startup")</code> / <code>("shutdown")</code> because keeping setup and teardown in one function makes resources easy to pair correctly, works with <code>async with</code> resources naturally, and follows the ASGI lifespan protocol. Objects created there are stored on <code>app.state</code> or yielded as a state dict and reached via <code>request.state</code>. In tests, <code>with TestClient(app)</code> triggers lifespan.</p>`,
    followUps: ['What happens if startup code raises?', 'Why not create the HTTP client per request?']
  });
  interview.push({
    q: 'Users report that /users/me returns 422. Debug it.',
    level: 'B',
    a: `<p>The message is likely "user_id: Input should be a valid integer", which tells me the request matched <code>/users/{user_id}</code> instead of <code>/users/me</code>. FastAPI tries routes in declaration order; a parameter segment matches any text, and validation happens after the match, so routing never reaches the later fixed route. Fix: declare <code>/users/me</code> first (and check router include order if they live in different routers). Add a test that calls <code>/users/me</code> so a future reorder fails CI. I would also check the trailing-slash style, since <code>/users/me/</code> would get a 307 redirect.</p>`,
    followUps: ['How could you make the id path unambiguous?', 'What would 405 tell you instead?']
  });
  interview.push({
    q: 'How would you implement pagination for a list endpoint in FastAPI?',
    level: 'A',
    a: `<p>Start with a <code>Pagination</code> dependency: <code>limit: Annotated[int, Query(ge=1, le=100)] = 20</code> and either <code>offset: Annotated[int, Query(ge=0)] = 0</code> or an opaque <code>cursor</code>. Return a wrapper model (<code>items</code>, <code>total</code> or <code>next_cursor</code>, links) rather than a bare list, so metadata can grow without breaking clients. Offset is simple and allows jumping to page N, but is slow for deep pages and unstable when rows are inserted. Cursor (keyset) pagination encodes the last sort key (base64 of "after:id", optionally signed) and queries <code>WHERE id &gt; :after ORDER BY id LIMIT :n</code>: stable and fast at any depth. Sort fields come from an allow-list, and the cursor must include the sort key. Counting totals on big tables is expensive, so make it optional.</p>`,
    followUps: ['How do you paginate on a non-unique column?', 'How do you document the cursor in OpenAPI?']
  });
  interview.push({
    q: 'How do you test FastAPI endpoints that depend on a database and the current user?',
    level: 'A',
    a: `<p>Use <code>TestClient</code> (or <code>httpx.AsyncClient</code> with <code>ASGITransport</code> for async tests) against the app object. Replace infrastructure with <code>app.dependency_overrides</code>: override <code>get_session</code> with a test session (a transaction rolled back after each test, Python Backend IV) and <code>get_current_user</code> with a fixed user, so no tokens are needed. Clear overrides after each test, ideally in a pytest fixture, and build the app with a factory if tests run in parallel. Test the contract: status codes, response keys exactly (to catch leaks), error shapes, and validation boundaries (limit 0, 1, 100, 101). Keep business logic in services so most tests are plain unit tests without HTTP.</p>`,
    followUps: ['Why does <code>with TestClient(app)</code> matter for lifespan?', 'How would you test a 500 handler?']
  });

  /* =====================================================================
     REGISTER
     ===================================================================== */
  registerModule({
    id: 'be17',
    title: 'Python Backend I: FastAPI Fundamentals',
    lang: 'python',
    intro: `<p>This is where the <b>Python backend route</b> turns into real services. You already know Python, HTTP and REST design. Now you build APIs with <b>FastAPI</b>, the most popular modern Python API framework. You write normal Python functions with type hints, and FastAPI turns them into validated, documented HTTP endpoints. Every example in this module is Python; no Java needed.</p>
      <p>You will lay out a project and run it with Uvicorn, route requests with path and query parameters, validate bodies with <b>Pydantic v2</b>, shape responses so secrets never leak, choose status codes and centralise error handling, share sessions and the current user with <b>dependency injection</b>, decide between <code>async def</code> and <code>def</code> without freezing the event loop, and publish an <b>OpenAPI</b> contract other teams can generate clients from. Where an idea can be shown without FastAPI installed (routing, validation, DI, the event loop), there is a small runnable demo in plain Python.</p>
      <p>Next on the route: databases with SQLAlchemy and Alembic (Python Backend II), then auth and security (III), testing (IV), and workers and deployment (V).</p>`,
    goals: [
      'Install FastAPI with <code>pip install "fastapi[standard]"</code>, structure a project with routers, services and schemas, and run it with <code>fastapi dev</code> / <code>uvicorn main:app</code>',
      'Declare path, query, header and body parameters with types and <code>Annotated</code> constraints, and predict which route a request matches (including 404, 405 and 422)',
      'Write Pydantic v2 models with <code>Field</code> rules, <code>field_validator</code>, <code>model_validator</code> and <code>model_config</code>, and read a 422 error by its <code>loc</code>',
      'Separate input, output and internal models and use response models so internal fields such as password hashes never leave the server',
      'Set correct status codes, raise <code>HTTPException</code>, and map domain exceptions to one problem+json error format with exception handlers',
      'Build dependency chains with <code>Depends</code> (settings, per-request session with yield, current user, pagination) and override them in tests',
      'Choose between <code>async def</code> and <code>def</code>, spot blocking calls on the event loop, and offload with <code>asyncio.to_thread</code>',
      'Produce accurate OpenAPI docs with tags, summaries, examples, declared error responses and stable operation ids'
    ],
    prereqs: `Python fundamentals through errors, type hints and testing (Python modules, especially Python 9), HTTP and REST basics from <b>Backend 1</b> (How Backends Work &amp; HTTP Basics) and API design from <b>Backend 4</b> (HTTP Deep Dive &amp; API Design). Helpful: SQL basics. Python 3.11+ installed. No Java required.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
