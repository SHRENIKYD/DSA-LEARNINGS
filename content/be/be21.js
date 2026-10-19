(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  function hesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  function pyc(label, code, hl) { return { type: 'code', label: label, lang: 'python', code: code, hl: hl || {} }; }
  function txt(label, html) { return { type: 'text', label: label, html: html }; }
  function kvParse(input, fmt) {
    var o = {};
    String(input || '').trim().split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      var i = tok.indexOf('=');
      if (i <= 0) throw new Error('Use key=value pairs separated by spaces, e.g. ' + fmt);
      o[tok.slice(0, i).toLowerCase()] = tok.slice(i + 1);
    });
    return o;
  }
  function num(o, k, def, lo, hi, fmt) {
    if (o[k] === undefined) return def;
    var v = Number(o[k]);
    if (!isFinite(v) || v < lo || v > hi) throw new Error(k + ' must be a number from ' + lo + ' to ' + hi + ', e.g. ' + fmt);
    return v;
  }
  function yes(o, k, def) {
    if (o[k] === undefined) return def;
    return /^(1|y|yes|true|on)$/i.test(o[k]);
  }
  // Small seeded random generator (mulberry32) so visualizer "jitter" is repeatable.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* =====================================================================
     TOPIC 1 — Background work inside the web process: BackgroundTasks and its limits
     ===================================================================== */
  topics.push({
    title: 'Background Work in FastAPI: BackgroundTasks, asyncio Tasks and Where They Stop',
    analogy: `<p>A café cashier takes your order, hands you a receipt, and <b>then</b> wipes the counter before the next customer. That is <code>BackgroundTasks</code>: small jobs done right after you leave, by the same person. If the cashier faints, nobody remembers the counter. For a cake order that must be baked tomorrow, you write it in the <b>order book</b> in the kitchen (a task queue), so any baker can pick it up even if the cashier goes home.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> Some work does not need to finish before you answer the user: sending a welcome email, writing an audit row, warming a cache, calling a webhook. Making the user wait for it wastes their time and holds a web worker. Python gives you three places to put that work:</p>
      ${H.table(['Where', 'How', 'Survives a crash or deploy?', 'Retries?', 'Good for'], [
        ['Same request, after the response', '<code>BackgroundTasks.add_task(fn, ...)</code>', H.c('r', 'No'), H.c('r', 'No'), 'Tiny, optional jobs (under ~1 s): a log line, a cache warm-up, a "nice to have" email'],
        ['Same process, fire and forget', '<code>asyncio.create_task(coro)</code>', H.c('r', 'No'), H.c('r', 'No'), 'Rarely the right answer; easy to lose the task or its error'],
        ['Another process via a broker', 'Celery / RQ / arq / Dramatiq (next topic)', H.c('g', 'Yes, the message waits in Redis / RabbitMQ'), H.c('g', 'Yes'), 'Anything that must happen, takes long, or eats CPU']
      ])}
      <p><b>How BackgroundTasks works.</b> You add a parameter typed <code>BackgroundTasks</code>; FastAPI injects one per request. You call <code>background_tasks.add_task(fn, *args, **kwargs)</code>. After the response has been sent, Starlette runs the tasks <b>one after another, in the same worker process</b>: an <code>async def</code> task is awaited on the event loop, a plain <code>def</code> task runs in the threadpool. You can also add tasks from a dependency; they all share the request's one list.</p>
      <p><b>The limits you must say out loud in an interview:</b></p>
      <ul>
        <li><b>No durability.</b> The task list lives in memory. A deploy, an OOM kill or a crash between "response sent" and "task finished" loses it silently.</li>
        <li><b>No retries, no schedule, no status.</b> If the SMTP server is down, the email is just gone (unless you write the retry loop yourself).</li>
        <li><b>It uses your web capacity.</b> A slow sync task holds one of the 40 threadpool threads; a CPU-heavy one blocks the event loop and every other request on that worker.</li>
        <li><b>Request-scoped objects may be gone.</b> Do not pass the request's DB session into the task. Pass IDs and open a fresh session inside the task.</li>
        <li><b>Graceful shutdown helps only a little.</b> Uvicorn waits for in-flight requests (including their background tasks) during a graceful stop, but Kubernetes kills the pod after <code>terminationGracePeriodSeconds</code> anyway.</li>
      </ul>
      <p>Rule of thumb: <b>if losing the work would create a support ticket, it does not belong in BackgroundTasks.</b> Put it in a queue, ideally written in the same database transaction as the business change (the outbox pattern from <b>Backend 9</b>).</p>`,
    clues: [
      '"Send an email after signup without slowing the response" → <code>BackgroundTasks</code> if losing one is acceptable, a task queue if it is not',
      '"The job must survive a deploy / must be retried" → a broker-backed queue (Celery, RQ, arq), never in-process tasks',
      '"Return 202 Accepted and let the client poll" → enqueue a job, return its id, expose <code>GET /jobs/{id}</code>',
      '"The app got slow after we added a background PDF export" → CPU or long work is running inside the web worker; move it to a worker process',
      '"<code>asyncio.create_task</code> in a route and the task sometimes never runs" → no reference kept, or the process exits; this is not a job system',
      '"Can I use the request\'s DB session inside the background task?" → no; pass ids and open a new session'
    ],
    code: [
      {
        lang: 'python', title: 'FastAPI BackgroundTasks: the right way to use it',
        code: `# pip install "fastapi[standard]"
import logging

from fastapi import BackgroundTasks, Depends, FastAPI, status
from pydantic import BaseModel, EmailStr

from app.db import SessionLocal, get_session      # your SQLAlchemy setup (Python Backend II)
from app.mail import send_mail                      # a plain sync function using smtplib/httpx
from app.models import User

app = FastAPI()
log = logging.getLogger("signup")


class SignupIn(BaseModel):
    email: EmailStr
    name: str


def send_welcome_email(user_id: int) -> None:
    """Runs AFTER the response, in the threadpool (it is a plain def)."""
    with SessionLocal() as db:                      # fresh session: the request's one is closed
        user = db.get(User, user_id)
        if user is None:
            return
        try:
            send_mail(to=user.email, subject="Welcome!", body=f"Hi {user.name}")
        except OSError:
            # No retry exists here. Log loudly so someone notices.
            log.exception("welcome email failed", extra={"user_id": user_id})


@app.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, background_tasks: BackgroundTasks, db=Depends(get_session)):
    user = User(email=body.email, name=body.name)
    db.add(user)
    db.commit()                                    # the important work is done and durable
    background_tasks.add_task(send_welcome_email, user.id)   # pass the id, not the session
    return {"id": user.id}`
      },
      {
        lang: 'python', run: true, title: 'Runnable: what BackgroundTasks really does, and what a restart loses (stdlib only)',
        code: `# What FastAPI's BackgroundTasks really is: "run this after the response, in the same process".
# Modelled with asyncio so you can see the timing and what is lost on a restart.
import asyncio
import time

T0 = time.perf_counter()


def ms():
    return int((time.perf_counter() - T0) * 1000)


class BackgroundTasks:
    """Tiny copy of the idea: a list of callables run after the response is sent."""

    def __init__(self):
        self.tasks = []

    def add_task(self, fn, *args):
        self.tasks.append((fn, args))

    async def run(self):
        for fn, args in self.tasks:              # one after another, in order
            await fn(*args)


async def send_welcome_email(email):
    await asyncio.sleep(0.3)                     # SMTP is slow
    print("%4d ms  email sent to %s" % (ms(), email))


async def signup(email, bg):
    print("%4d ms  user %s saved" % (ms(), email))
    bg.add_task(send_welcome_email, email)
    return {"status": "created"}


async def server(email, crash_after_ms=None):
    bg = BackgroundTasks()
    response = await signup(email, bg)
    print("%4d ms  response sent: %s  (the client stops waiting here)" % (ms(), response))
    work = asyncio.create_task(bg.run())         # same process, same event loop
    if crash_after_ms is None:
        await work
    else:
        await asyncio.sleep(crash_after_ms / 1000)
        work.cancel()                            # a deploy / OOM kill / crash
        print("%4d ms  worker restarted: the queued email for %s is GONE (no retry, no record)" % (ms(), email))


asyncio.run(server("ana@example.com"))
asyncio.run(server("bo@example.com", crash_after_ms=100))`
      }
    ],
    codeTitle: ['FastAPI BackgroundTasks', 'Runnable model'],
    viz: {
      title: 'One request, three ways to do the slow part',
      input: 'mode=background email_ms=800 crash=no',
      inputLabel: 'mode=inline|background|queue, email_ms=50..5000, crash=yes|no (a deploy hits right after the response)',
      gen: function (input) {
        var o = kvParse(input, 'mode=background email_ms=800 crash=no');
        var mode = (o.mode || 'background').toLowerCase();
        if (['inline', 'background', 'queue'].indexOf(mode) < 0) throw new Error('mode must be inline, background or queue');
        var em = num(o, 'email_ms', 800, 50, 5000, 'email_ms=800');
        var crash = yes(o, 'crash', false);
        var nodes = [bx('client', 'Client', 8, 30), bx('api', 'API worker', 38, 30), bx('db', 'Postgres', 38, 6), bx('broker', 'Redis broker', 68, 30), bx('worker', 'Celery worker', 92, 30), bx('smtp', 'SMTP', 68, 54)];
        var frames = [];
        function g(hl, ehl, edges) { return { type: 'graph', label: 'mode = ' + mode, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl }; }
        var base = [['client', 'api', 'POST /signup'], ['api', 'db', 'INSERT user']];
        var timeline = [];
        function tl() { return { type: 'table', label: 'Timeline', columns: ['t (ms)', 'event'], rows: timeline.slice() }; }
        frames.push({ narr: 'The client sends <code>POST /signup</code>. The API worker inserts the user and commits (~20 ms). That part must finish before we answer.', parts: [g({ api: 'cur', db: 'ok' }, { 'client-api': 'cur', 'api-db': 'ok' }, base), tl()] });
        timeline.push(['0', 'request in']); timeline.push(['20', 'user committed']);
        if (mode === 'inline') {
          timeline.push([String(20 + em), 'email sent (client still waiting)']);
          frames.push({ narr: 'Inline: the route calls SMTP itself. The client waits the full <b>' + em + ' ms</b> for an email it does not care about, and one slow SMTP server makes signup slow.', parts: [g({ api: 'cur', smtp: 'cur' }, { 'api-smtp': 'cur' }, base.concat([['api', 'smtp', 'send']])), tl()] });
          timeline.push([String(20 + em), 'response 201']);
          frames.push({ narr: 'Only now the response leaves. Total latency ≈ ' + (20 + em) + ' ms, and the worker was busy the whole time.', parts: [g({ client: 'ok' }, { 'api-client': 'ok' }, base.concat([['api', 'client', '201']])), tl()] });
          frames.push({ narr: crash ? 'A crash after the response does not matter here: the email was already sent. Inline is safe but slow; if SMTP fails, the user sees an error for a side job.' : 'Inline is simple and nothing is lost, but users pay the latency and SMTP outages become signup outages.', parts: [g({}, {}, base), tl()] });
        } else if (mode === 'background') {
          timeline.push(['21', 'response 201 sent']);
          frames.push({ narr: '<code>background_tasks.add_task(send_welcome_email, user.id)</code> only appends to a list. The response goes out at ~21 ms. The client is happy.', parts: [g({ client: 'ok', api: 'cur' }, { 'api-client': 'ok' }, base.concat([['api', 'client', '201']])), tl()] });
          if (crash) {
            timeline.push(['60', H.c('r', 'deploy: worker killed')]);
            frames.push({ narr: 'A deploy stops this worker 40 ms later. The task list lived only in this process\'s memory.', parts: [g({ api: 'bad' }, {}, base), tl()] });
            timeline.push(['-', H.c('r', 'email never sent, no error, no retry')]);
            frames.push({ narr: H.c('r', 'Lost silently.') + ' Nobody gets an alert and nothing retries. Fine for a cache warm-up; not fine for a password-reset email or a payment webhook.', parts: [g({ smtp: 'bad' }, {}, base), tl()] });
          } else {
            timeline.push([String(21 + em), 'email sent by the same worker']);
            frames.push({ narr: 'After the response, Starlette runs the task in the same process (threadpool for <code>def</code>). For ' + em + ' ms that thread is busy, which is fine for small jobs.', parts: [g({ api: 'cur', smtp: 'ok' }, { 'api-smtp': 'ok' }, base.concat([['api', 'smtp', 'send']])), tl()] });
            frames.push({ narr: 'It worked because nothing went wrong. BackgroundTasks has no retries and no record, so if SMTP had returned an error, only your log would know.', parts: [g({ smtp: 'ok' }, {}, base), tl()] });
          }
        } else {
          timeline.push(['22', 'job pushed to Redis (LPUSH)']); timeline.push(['23', 'response 202/201 sent']);
          frames.push({ narr: '<code>send_welcome_email.delay(user.id)</code> writes a small JSON message to the broker (~1 ms) and the response leaves right away.', parts: [g({ broker: 'ok', client: 'ok' }, { 'api-broker': 'ok', 'api-client': 'ok' }, base.concat([['api', 'broker', 'enqueue'], ['api', 'client', '201']])), tl()] });
          if (crash) {
            timeline.push(['60', 'deploy: API worker killed']);
            frames.push({ narr: 'The API worker dies, but who cares: the message sits in Redis, not in its memory.', parts: [g({ api: 'bad', broker: 'ok' }, {}, base.concat([['api', 'broker', 'enqueue']])), tl()] });
          }
          timeline.push([String(30 + em), 'Celery worker sent the email']);
          frames.push({ narr: 'A separate worker process takes the job and sends the email. If SMTP fails, <code>autoretry_for</code> + backoff try again, and after the last try the job lands in a dead-letter place you can inspect.', parts: [g({ worker: 'cur', smtp: 'ok' }, { 'broker-worker': 'cur', 'worker-smtp': 'ok' }, base.concat([['broker', 'worker', 'reserve'], ['worker', 'smtp', 'send']])), tl()] });
          frames.push({ narr: 'Cost: one more moving part (broker + worker deployment + monitoring). Benefit: durable, retried, observable, and the web worker stays free.', parts: [g({ broker: 'sel', worker: 'sel' }, {}, base.concat([['api', 'broker', 'enqueue'], ['broker', 'worker', 'reserve']])), tl()] });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Which jobs may live in BackgroundTasks?',
        html: `${H.table(['Job', 'Loss acceptable?', 'Duration', 'Where'], [
          ['Audit "user viewed page"', 'yes', '5 ms', H.c('g', 'BackgroundTasks')],
          ['Warm the cache for the new product', 'yes', '50 ms', H.c('g', 'BackgroundTasks')],
          ['Password-reset email', H.c('r', 'no'), '300 ms', H.c('b', 'queue')],
          ['Charge a card / call a payment webhook', H.c('r', 'no'), 'varies', H.c('b', 'queue + idempotency key')],
          ['Generate a 40-page PDF report', 'no', '20 s CPU', H.c('b', 'queue, separate worker pool')],
          ['Resize 10 uploaded photos', 'no', '3 s CPU', H.c('b', 'queue')]
        ])}<p>Two questions decide it: <b>can we lose it?</b> and <b>does it hold a web worker for long?</b> One "no / yes" answer is enough to move it to a queue.</p>`
      },
      {
        title: 'The 202 Accepted + polling pattern',
        html: `<p>For a job the user <i>does</i> wait for (an export), answer fast with <b>202 Accepted</b> and a job id, then let the client poll or receive a webhook. The route only enqueues; the worker does the work and writes the status.</p>`,
        code: { lang: 'python', code: `from celery.result import AsyncResult
from fastapi import FastAPI, status

from app.worker import celery_app, build_export

app = FastAPI()


@app.post("/exports", status_code=status.HTTP_202_ACCEPTED)
def start_export(account_id: int):
    job = build_export.delay(account_id)              # returns at once with a task id
    return {"job_id": job.id, "status_url": f"/exports/{job.id}"}


@app.get("/exports/{job_id}")
def export_status(job_id: str):
    res = AsyncResult(job_id, app=celery_app)       # needs a result backend
    body = {"job_id": job_id, "state": res.state}   # PENDING, STARTED, RETRY, SUCCESS, FAILURE
    if res.successful():
        body["download_url"] = res.result
    return body` }
      },
      {
        title: 'asyncio.create_task in a route: the quiet bug',
        html: `<p>The event loop keeps only a <b>weak</b> reference to tasks. A task nobody holds can be garbage-collected mid-flight, and its exception is only printed as "Task exception was never retrieved". If you really need a fire-and-forget coroutine (say, publishing a metric), keep a strong reference set and log failures. For anything that matters, use BackgroundTasks or a queue.</p>`,
        code: { lang: 'python', code: `import asyncio
import logging

log = logging.getLogger("bg")
_running: set[asyncio.Task] = set()


def fire_and_forget(coro) -> None:
    task = asyncio.create_task(coro)
    _running.add(task)                       # strong reference until it finishes

    def _done(t: asyncio.Task) -> None:
        _running.discard(t)
        if not t.cancelled() and t.exception() is not None:
            log.error("background coroutine failed", exc_info=t.exception())

    task.add_done_callback(_done)` }
      }
    ],
    deepDive: `<p>🟣 <b>Inside Starlette.</b> <code>BackgroundTasks</code> is a list of <code>BackgroundTask(func, *args, **kwargs)</code> attached to the response. The response object's ASGI <code>__call__</code> sends headers and body, then <code>await self.background()</code>. Because it runs inside the same ASGI call, the server still counts the request as active. With Uvicorn that means a graceful shutdown waits for it (up to <code>--timeout-graceful-shutdown</code>), and middleware that measures "request time" may include the task time. That surprises people reading latency graphs.</p>
      <p><b>Order and failures.</b> Tasks run sequentially. If task 1 raises, task 2 does not run, and the exception goes to the server log (the client already has its response). Wrap each task body in try/except and log with the request id.</p>
      <p><b>Dependencies with <code>yield</code>.</b> FastAPI has changed when the code after <code>yield</code> runs relative to background tasks more than once across versions. Do not rely on it: a background task should open and close its own resources (session, HTTP client). That rule works on every version.</p>
      <p><b>Lifespan-owned workers.</b> A middle ground some teams use: an <code>asyncio.Queue</code> plus N consumer tasks started in <code>lifespan</code>, drained on shutdown. It gives back-pressure and ordering inside one process, but it still loses whatever is in memory on a crash, so it is for metrics batching and cache refreshes, not business events.</p>
      <p><b>Production reality.</b> Kubernetes sends SIGTERM, waits <code>terminationGracePeriodSeconds</code> (30 s default), then SIGKILL. Anything still in memory dies. The safe design is: durable state change and the "to-do" record in the <b>same transaction</b> (outbox table), then a relay or worker processes it. Then even a crash between commit and enqueue loses nothing.</p>`,
    aiEra: `<p>🤖 Code assistants reach for <code>BackgroundTasks</code> whenever you say "do this in the background", including for payments, webhooks and multi-minute exports. Review generated code with two questions: what happens if the pod dies one second after the response, and what happens if the external call fails? If the answer is "the work is lost", ask for a queue-backed version.</p>
      <p>AI-heavy endpoints made this more important: an LLM call can take 10 to 60 seconds, and agents may chain several. Those belong in a worker with a job id and streaming or polling, not in a request-scoped background task. Assistants are good at generating the boilerplate for the 202 + status endpoint pattern; you still decide what may be lost.</p>`,
    problems: [
      {
        title: 'Where Should This Work Run?',
        level: 'Easy',
        tags: ['background tasks', 'task queue', 'design'],
        companies: ['Swiggy', 'Atlassian'],
        statement: `<p>Your team keeps debating where new work should run. Write <code>choose_runner(duration_ms, needs_result, must_not_lose, cpu_heavy)</code> that returns one of:</p>
          <ul>
            <li><code>"inline"</code>: the client needs the result, it takes at most 2,000 ms and is not CPU-heavy, so do it in the request;</li>
            <li><code>"queue_and_poll"</code>: the client needs the result but it is slow or CPU-heavy, so enqueue, return 202 and a job id;</li>
            <li><code>"queue"</code>: the client does not need the result, but the work must not be lost, or it is CPU-heavy, or it takes more than 10,000 ms;</li>
            <li><code>"background_tasks"</code>: everything else (small, optional, after the response).</li>
          </ul>`,
        constraints: `<p>0 ≤ duration_ms ≤ 10<sup>7</sup>. Check <code>needs_result</code> first.</p>`,
        example: `${H.table(['duration_ms', 'needs_result', 'must_not_lose', 'cpu_heavy', 'answer'], [['50', 'true', 'false', 'false', H.c('g', 'inline')], ['2001', 'true', 'true', 'false', H.c('b', 'queue_and_poll')], ['300', 'false', 'true', 'false', H.c('b', 'queue')], ['300', 'false', 'false', 'false', H.c('g', 'background_tasks')]])}`,
        brute: {
          why: `<p>"Put everything in BackgroundTasks, it is built in." That loses payments on every deploy and lets PDF rendering block the event loop. The opposite, "queue everything", adds a broker hop and operational cost to a 5 ms audit log.</p>`,
          code: `def choose_runner(duration_ms, needs_result, must_not_lose, cpu_heavy):
    return "background_tasks"     # wrong for anything durable, slow or CPU-heavy`
        },
        mcq: {
          q: 'A password-reset email takes ~300 ms. Where should it be sent from?',
          options: ['A task queue, because losing it creates a support ticket', 'BackgroundTasks, because it is short', 'Inline, so the user waits for SMTP', '<code>asyncio.create_task</code>'],
          answer: 0,
          explain: 'Short is not the only question. It must not be lost and should be retried if SMTP is down, so it needs a durable queue.'
        },
        hints: [
          'Hint 1: two questions dominate: does the client need the answer now, and is losing the work acceptable?',
          'Hint 2: when the client needs the result, the only question is "fast and light enough to do in the request?" (≤ 2,000 ms and not CPU-heavy).',
          'Hint 3: otherwise: must_not_lose OR cpu_heavy OR duration_ms &gt; 10,000 → "queue"; the rest → "background_tasks". Watch the boundaries: 2,000 is inline, 10,000 is still background.'
        ],
        solution: {
          approach: `<p>Encode the decision table from the topic in priority order. The client's need comes first because it decides the API shape (200 with data vs 202 with a job id). For fire-and-forget work, durability and CPU are the reasons to leave the web process; long duration is too, because it holds a worker thread and is likely to be cut by a deploy.</p>`,
          code: { lang: 'python', run: true, code: `def choose_runner(duration_ms: int, needs_result: bool, must_not_lose: bool, cpu_heavy: bool) -> str:
    if needs_result:
        if duration_ms <= 2000 and not cpu_heavy:
            return "inline"                  # answer in the request
        return "queue_and_poll"              # 202 Accepted + job id + status endpoint
    if must_not_lose or cpu_heavy or duration_ms > 10000:
        return "queue"                       # Celery / RQ / arq worker
    return "background_tasks"                # small, optional, after the response


print(choose_runner(50, True, False, False))       # inline
print(choose_runner(300, False, True, False))      # queue
print(choose_runner(300, False, False, False))     # background_tasks` },
          complexity: `<p>O(1) time and space: a few comparisons per call.</p>`,
          followUps: ['Where would you put a job that is optional but takes 30 s of I/O?', 'How does an outbox table change the "must not lose" answer?']
        },
        tests: { fn: 'choose_runner', sig: 'int bool bool bool -> string', cases: [
          [[50, true, false, false], 'inline'],
          [[2000, true, false, false], 'inline'],
          [[2001, true, true, false], 'queue_and_poll'],
          [[300, true, false, true], 'queue_and_poll'],
          [[300, false, false, false], 'background_tasks'],
          [[300, false, true, false], 'queue'],
          [[10000, false, false, false], 'background_tasks'],
          [[10001, false, false, false], 'queue'],
          [[5, false, false, true], 'queue']
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — Task queues: Celery, RQ, arq
     ===================================================================== */
  topics.push({
    title: 'Task Queues in Python: Celery, RQ and arq (Workers, Beat and Result Backends)',
    analogy: `<p>A busy restaurant kitchen uses a <b>ticket rail</b>. Waiters clip order tickets on the rail (the broker). Cooks (workers) take the next ticket, cook, and only throw the ticket away when the plate is out (<b>late ack</b>). If a cook faints mid-dish, the ticket is still on the rail and another cook picks it up. A clock on the wall rings "make the bread at 5 am" (<b>beat</b>), and a whiteboard shows which orders are ready (<b>result backend</b>).</p>`,
    explain: `<p>🟢 <b>The big idea.</b> A task queue splits work into three parts: your web app <b>produces</b> a small message ("send receipt for order 42"), a <b>broker</b> (Redis, RabbitMQ, SQS) stores it, and one or more <b>worker processes</b> consume it and run a normal Python function. Backend 9 taught the queue theory; here we wire it in Python.</p>
      ${H.table(['', 'Celery', 'RQ', 'arq'], [
        ['Style', 'Big, feature-rich, sync functions (prefork pool)', 'Tiny and simple, sync, forks a "work horse" per job', 'Small, <b>async-first</b> (<code>async def</code> jobs)'],
        ['Brokers', 'RabbitMQ, Redis, SQS, more', 'Redis only', 'Redis only'],
        ['Retries', '<code>autoretry_for</code>, <code>retry_backoff</code>, <code>max_retries</code>', '<code>Retry(max=3, interval=[10, 30, 60])</code>', '<code>raise Retry(defer=...)</code>, <code>max_tries</code>'],
        ['Scheduling', '<b>celery beat</b> with <code>crontab()</code>', '<code>enqueue_in</code> / <code>enqueue_at</code> + <code>--with-scheduler</code>', '<code>cron(...)</code> in WorkerSettings'],
        ['Results', 'Result backend (Redis, DB, …), <code>AsyncResult</code>', 'Stored on the Job in Redis (<code>result_ttl</code>)', 'Stored in Redis, <code>await job.result()</code>'],
        ['Workflows', 'chain, group, chord (canvas)', 'job dependencies (<code>depends_on</code>)', 'none built in'],
        ['Pick it when', 'You need routing, many queues, RabbitMQ, workflows, a huge ecosystem (Flower, Django integration)', 'You want the simplest thing that works', 'Your code is asyncio (FastAPI + httpx + async DB) and jobs are I/O-bound']
      ])}
      <p><b>Celery vocabulary in one breath.</b> <code>@app.task</code> turns a function into a task. <code>task.delay(42)</code> (shortcut for <code>apply_async(args=[42])</code>) sends a message and returns an <code>AsyncResult</code> with a task id. A worker started with <code>celery -A app.worker worker</code> runs tasks. <b>Ack</b> = telling the broker "done, delete it". By default Celery acks <b>just before</b> running the task (at-most-once); <code>acks_late=True</code> acks <b>after</b> it returns (at-least-once, so the task must be idempotent). <code>bind=True</code> gives you <code>self</code>, so you can read <code>self.request.id</code> and <code>self.request.retries</code> or call <code>self.retry()</code>. <b>Beat</b> is a separate single process that sends scheduled messages. The <b>result backend</b> stores return values and states; skip it (<code>ignore_result=True</code>) for fire-and-forget tasks.</p>
      <p><b>The safe defaults</b> most production teams set:</p>
      ${H.table(['Setting', 'Value', 'Why'], [
        ['<code>task_acks_late</code>', 'True', 'A crash mid-task means redelivery, not loss'],
        ['<code>task_reject_on_worker_lost</code>', 'True', 'If the worker process is killed (OOM), requeue instead of marking failed'],
        ['<code>worker_prefetch_multiplier</code>', '1', 'Long tasks: do not let one worker hoard messages others could run'],
        ['<code>task_time_limit</code> / <code>task_soft_time_limit</code>', 'e.g. 600 / 540 s', 'Kill stuck tasks; the soft limit raises an exception you can catch to clean up'],
        ['<code>task_serializer</code> / <code>accept_content</code>', 'json / ["json"]', 'Never accept pickle from a shared broker (remote code execution risk)'],
        ['<code>broker_transport_options.visibility_timeout</code> (Redis/SQS)', 'longer than your longest task or ETA', 'Otherwise unacked messages are handed to a second worker (duplicates!)'],
        ['<code>result_expires</code>', 'e.g. 1 day', 'Results do not pile up forever in Redis']
      ])}`,
    clues: [
      '"Python background jobs with retries" → Celery (or RQ/arq) with a Redis or RabbitMQ broker',
      '"Our stack is fully async (FastAPI + httpx)" → arq or Taskiq fit naturally; Celery runs sync functions',
      '"A task ran twice" → <code>acks_late</code> + crash/redelivery, Redis <code>visibility_timeout</code> shorter than an ETA or a long task, or the producer sent it twice',
      '"Run this every night at 02:15" → celery beat with <code>crontab(hour=2, minute=15)</code>; exactly ONE beat process',
      '"Get the result of a background job" → result backend + <code>AsyncResult(id)</code>, or better, write the result to your DB',
      '"Workers are idle but the queue is full" / "one worker hogs tasks" → prefetch multiplier, separate queues per workload'
    ],
    code: [
      {
        lang: 'python', title: 'app/worker.py — Celery app, safe config, a retrying task and beat',
        code: `# pip install "celery[redis]" httpx
import os

import httpx
from celery import Celery
from celery.schedules import crontab
from celery.utils.log import get_task_logger

# URLs come from the environment, e.g. CELERY_BROKER_URL=redis://redis:6379/0 (never hard-code secrets)
celery_app = Celery(
    "shop",
    broker=os.environ["CELERY_BROKER_URL"],
    backend=os.environ.get("CELERY_RESULT_BACKEND"),   # optional; None disables results
    include=["app.worker"],
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=600,
    task_soft_time_limit=540,
    result_expires=24 * 3600,
    broker_transport_options={"visibility_timeout": 4 * 3600},   # > longest task / countdown
    broker_connection_retry_on_startup=True,
    task_routes={"app.worker.build_report": {"queue": "reports"}},  # slow work on its own queue
)

log = get_task_logger(__name__)


class UpstreamUnavailable(Exception):
    """Raised for 429/5xx answers we want to retry."""


@celery_app.task(
    bind=True,
    autoretry_for=(httpx.TransportError, UpstreamUnavailable),  # only TRANSIENT errors
    retry_backoff=True,          # 1, 2, 4, 8 ... seconds
    retry_backoff_max=600,       # never wait more than 10 minutes
    retry_jitter=True,           # random 0..countdown, so retries do not arrive in waves
    max_retries=6,
    acks_late=True,
    ignore_result=True,          # nobody reads the return value
)
def send_receipt(self, order_id: int) -> None:
    log.info("sending receipt order=%s try=%s task=%s", order_id, self.request.retries, self.request.id)
    resp = httpx.post(
        os.environ["MAILER_URL"],
        json={"template": "receipt", "order_id": order_id},
        headers={"Idempotency-Key": f"receipt-{order_id}"},   # the provider dedupes retries
        timeout=10,
    )
    if resp.status_code in (429, 500, 502, 503, 504):
        raise UpstreamUnavailable(f"mailer answered {resp.status_code}")
    resp.raise_for_status()      # other 4xx: a bug or bad data, retrying will not help


@celery_app.task(bind=True, acks_late=True)
def build_report(self, account_id: int) -> str:
    # long CPU/IO work runs on the "reports" queue with its own workers
    return f"s3://reports/{account_id}/latest.pdf"


@celery_app.task(ignore_result=True)
def close_day() -> None:
    log.info("closing the books for yesterday")


celery_app.conf.beat_schedule = {
    "close-day-0215-utc": {"task": "app.worker.close_day", "schedule": crontab(hour=2, minute=15)},
    "refresh-fx-every-5-min": {"task": "app.worker.close_day", "schedule": 300.0},
}`
      },
      {
        lang: 'bash', title: 'Running producers, workers and beat',
        code: `# one terminal per process (in production: one container / deployment each)
export CELERY_BROKER_URL="redis://localhost:6379/0"      # placeholder; real value from your secret store
celery -A app.worker worker --loglevel=INFO --queues=default --concurrency=8
celery -A app.worker worker --loglevel=INFO --queues=reports --concurrency=2 --hostname=reports@%h
celery -A app.worker beat --loglevel=INFO               # exactly ONE beat in the whole system
celery -A app.worker inspect active                     # what is running right now
celery -A app.worker purge                              # drop all waiting messages (careful!)`
      },
      {
        lang: 'python', title: 'RQ and arq: the same job in the two lighter libraries',
        code: `# ---------- RQ (pip install rq) ----------
import os
from datetime import timedelta

from redis import Redis
from rq import Queue, Retry

redis_conn = Redis.from_url(os.environ["REDIS_URL"])
emails = Queue("emails", connection=redis_conn)


def send_welcome(user_id: int) -> None:
    print("sending welcome to", user_id)


job = emails.enqueue(send_welcome, 42, retry=Retry(max=3, interval=[10, 30, 60]),
                     job_timeout=120, result_ttl=600, job_id="welcome-42")
later = emails.enqueue_in(timedelta(minutes=10), send_welcome, 43)   # needs: rq worker --with-scheduler
# worker:  rq worker emails --url "$REDIS_URL" --with-scheduler

# ---------- arq (pip install arq) ----------
from arq import Retry as ArqRetry
from arq import create_pool, cron
from arq.connections import RedisSettings

REDIS = RedisSettings.from_dsn(os.environ["REDIS_URL"])


async def send_welcome_async(ctx, user_id: int) -> str:
    client = ctx["http"]                                  # created once in on_startup
    resp = await client.post(os.environ["MAILER_URL"], json={"user_id": user_id})
    if resp.status_code >= 500:
        raise ArqRetry(defer=ctx["job_try"] * 10)         # 10 s, 20 s, 30 s ...
    return "sent"


async def nightly_cleanup(ctx) -> None:
    print("cleanup")


async def startup(ctx) -> None:
    import httpx
    ctx["http"] = httpx.AsyncClient(timeout=10)


async def shutdown(ctx) -> None:
    await ctx["http"].aclose()


class WorkerSettings:                                     # run:  arq app.jobs.WorkerSettings
    functions = [send_welcome_async]
    cron_jobs = [cron(nightly_cleanup, hour=3, minute=0)]
    redis_settings = REDIS
    on_startup = startup
    on_shutdown = shutdown
    max_jobs = 20            # concurrent jobs per worker (it is asyncio, so I/O overlaps)
    job_timeout = 300
    max_tries = 5


async def enqueue_from_fastapi(user_id: int) -> None:
    pool = await create_pool(REDIS)                       # in real code: create once in lifespan
    await pool.enqueue_job("send_welcome_async", user_id, _job_id=f"welcome:{user_id}")  # same id = not enqueued twice
    await pool.aclose()`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a job queue with worker threads, backoff + jitter, a dead-letter list and idempotency keys (stdlib only)',
        code: `# In-process job queue: worker threads, retries with exponential backoff + full jitter,
# a dead-letter list, and idempotency keys so a retried "charge" never charges twice.
import queue
import random
import threading

SCALE = 0.001          # 1 "second" of backoff = 1 ms here, so the demo finishes fast
MAX_RETRIES = 4        # 1 first try + up to 4 retries
BASE, CAP = 1, 30      # backoff seconds: 1, 2, 4, 8 ... capped at 30


class TransientError(Exception):
    """Worth retrying: timeout, 503, connection reset."""


class PermanentError(Exception):
    """Never retry: bad input, card declined, 400."""


class FakePaymentAPI:
    """Fails some calls on purpose. Its charge() is NOT idempotent by itself."""

    def __init__(self, seed):
        self.rng = random.Random(seed)
        self.lock = threading.Lock()
        self.charges = []                       # what really hit the card network

    def charge(self, order_id, cents):
        with self.lock:
            roll = self.rng.random()
        if cents <= 0:
            raise PermanentError("amount must be positive")
        if roll < 0.35:
            raise TransientError("503 from provider")      # nothing charged
        with self.lock:
            self.charges.append((order_id, cents))
        if roll < 0.5:
            # The worst case: the charge WENT THROUGH but the reply was lost.
            raise TransientError("timeout after charge")


class IdempotencyStore:
    """Remembers finished keys. In production: a DB table with a UNIQUE key, or Redis SET NX."""

    def __init__(self):
        self.done = {}
        self.lock = threading.Lock()

    def claim(self, key):
        """Atomic 'first one wins' (like SET key NX). False = someone already has it."""
        with self.lock:
            if key in self.done:
                return False
            self.done[key] = "in progress"
            return True

    def finish(self, key, result):
        with self.lock:
            self.done[key] = result


def backoff(attempt, rng):
    """Full jitter: random value between 0 and min(CAP, BASE * 2**attempt)."""
    return rng.uniform(0, min(CAP, BASE * 2 ** attempt))


def worker(name, jobs, api, store, dead, log, rng, timers):
    while True:
        job = jobs.get()
        if job is None:                         # poison pill = shut down
            jobs.task_done()
            return
        key = "charge:" + job["order_id"]       # the idempotency key: one charge per order
        try:
            # A retry already owns the claim; a NEW job for the same order must claim first.
            if job["attempt"] == 0 and not store.claim(key):
                log.append((job["order_id"], "skipped duplicate"))
                continue
            # The provider also accepts an idempotency key in real life (Stripe: Idempotency-Key header).
            # Here we simulate that by checking the provider's ledger before charging again.
            if any(o == job["order_id"] for o, _ in api.charges):
                store.finish(key, "already charged")
                log.append((job["order_id"], "recovered: provider already charged"))
                continue
            api.charge(job["order_id"], job["cents"])
            store.finish(key, "ok")
            log.append((job["order_id"], "ok after %d retries" % job["attempt"]))
        except TransientError as e:
            if job["attempt"] >= MAX_RETRIES:
                dead.append((job["order_id"], str(e)))
            else:
                delay = backoff(job["attempt"], rng)
                job = dict(job, attempt=job["attempt"] + 1)
                timer = threading.Timer(delay * SCALE, jobs.put, args=(job,))
                timers.append(timer)
                timer.start()                    # re-enqueue later; the worker moves on at once
        except PermanentError as e:
            dead.append((job["order_id"], "permanent: " + str(e)))
        finally:
            if job is not None:
                jobs.task_done()


def main():
    jobs = queue.Queue()
    api, store = FakePaymentAPI(seed=7), IdempotencyStore()
    dead, log, timers = [], [], []
    orders = [("A1", 1999), ("A2", 500), ("A3", 0), ("A4", 1250), ("A5", 800), ("A2", 500)]
    for oid, cents in orders:                    # note A2 is enqueued twice (double click)
        jobs.put({"order_id": oid, "cents": cents, "attempt": 0})
    threads = [threading.Thread(target=worker, args=("w%d" % i, jobs, api, store, dead, log, random.Random(i), timers))
               for i in range(3)]
    for t in threads:
        t.start()
    while True:                                   # wait until no job is queued AND no retry is pending
        jobs.join()
        waiting = [t for t in timers if t.is_alive()]
        if not waiting and jobs.unfinished_tasks == 0:
            break
        for t in waiting:
            t.join()
    for _ in threads:
        jobs.put(None)
    for t in threads:
        t.join()
    print("results:")
    for oid, what in sorted(log):
        print("  ", oid, "->", what)
    print("dead letters:", sorted(dead))
    charged = sorted(o for o, _ in api.charges)
    print("charges at provider:", charged)
    assert len(charged) == len(set(charged)), "double charge!"
    print("no order was charged twice")


main()`
      }
    ],
    codeTitle: ['Celery app', 'CLI', 'RQ and arq', 'Runnable job queue'],
    viz: {
      title: 'Celery message life: early ack vs acks_late when a worker dies',
      input: 'acks_late=yes crash=during',
      inputLabel: 'acks_late=yes|no, crash=none|during|after (when the worker process dies)',
      gen: function (input) {
        var o = kvParse(input, 'acks_late=yes crash=during');
        var late = yes(o, 'acks_late', true);
        var crash = (o.crash || 'during').toLowerCase();
        if (['none', 'during', 'after'].indexOf(crash) < 0) throw new Error('crash must be none, during or after');
        var q = ['receipt#41', 'receipt#42', 'receipt#43'], frames = [], runs = 0, sideEffects = [];
        function st(note, qhl, w) {
          return [
            { type: 'queue', label: 'Broker queue "default"', items: q.slice(), hl: qhl || {}, frontLabel: 'next', backLabel: 'new' },
            { type: 'vars', label: 'Worker A', vals: { holding: w || '-', acks_late: late ? 'True' : 'False', executions_of_42: runs }, hl: {} },
            { type: 'table', label: 'Side effects (emails really sent)', columns: ['#', 'what'], rows: sideEffects.map(function (s, i) { return [String(i + 1), s]; }) },
            txt('Note', note)
          ];
        }
        frames.push({ narr: 'Three messages wait. Each is just JSON: task name, args <code>[42]</code>, a task id, retry count. Worker A will take <b>receipt#42</b> (we follow that one).', parts: st('acks_late = ' + (late ? 'True: ack AFTER the function returns' : 'False (Celery default): ack right BEFORE running'), { 1: 'cur' }) });
        q.splice(1, 1);
        if (!late) {
          frames.push({ narr: 'Early ack: the worker tells the broker "delete it" <b>before</b> running. The broker forgets the message.', parts: st('Broker no longer has #42.', {}, 'receipt#42 (acked)') });
        } else {
          frames.push({ narr: 'Late ack: the message is <b>reserved</b> (invisible to others) but not deleted. With Redis it stays in an "unacked" hash until ack or until <code>visibility_timeout</code>.', parts: st('#42 is reserved, not deleted.', {}, 'receipt#42 (reserved)') });
        }
        runs++;
        if (crash === 'during') {
          frames.push({ narr: 'The task starts. Halfway through, the worker process is OOM-killed (or the pod is evicted). The email was <b>not</b> sent yet.', parts: st(H.c('r', 'Worker A died mid-task.'), {}, 'receipt#42 (running... killed)') });
          if (late) {
            q.unshift('receipt#42');
            frames.push({ narr: 'Because it was never acked, the broker makes #42 visible again (immediately on a lost connection, or after <code>visibility_timeout</code> with Redis/SQS). With <code>task_reject_on_worker_lost=True</code> Celery requeues it on purpose.', parts: st(H.c('g', 'Redelivered: nothing lost.'), { 0: 'ok' }) });
            runs++; sideEffects.push('receipt for order 42');
            frames.push({ narr: 'Worker B runs #42 again and the email goes out once. ' + H.c('g', 'At-least-once') + ' delivery saved us.', parts: st('Run #2 succeeded and acked.', {}, 'receipt#42 (done, acked)') });
            frames.push({ narr: 'But if the crash had come <b>after</b> the email was sent and before the ack, run #2 would send a <b>second</b> email. That is why acks_late tasks must be <b>idempotent</b> (next topic).', parts: st('acks_late trades loss for possible duplicates.', {}) });
          } else {
            frames.push({ narr: H.c('r', 'Lost.') + ' The broker already deleted #42. No retry, no error in the queue. Early ack = at-most-once.', parts: st(H.c('r', 'Receipt for order 42 is never sent.'), {}) });
            frames.push({ narr: 'Early ack is fine for jobs you can lose (refresh a cache). For receipts, payments and webhooks, use <code>acks_late=True</code> plus idempotency.', parts: st('Choose per task: losing vs repeating.', {}) });
          }
        } else if (crash === 'after') {
          sideEffects.push('receipt for order 42');
          frames.push({ narr: 'The task runs and the email is sent. Then, a millisecond before the ack, the worker dies.', parts: st('Email sent, ack not yet sent.', {}, 'receipt#42 (finished, not acked)') });
          if (late) {
            q.unshift('receipt#42');
            frames.push({ narr: 'The broker never got the ack, so it redelivers #42.', parts: st(H.c('y', 'Redelivered although the work was done.'), { 0: 'cur' }) });
            runs++; sideEffects.push(H.c('r', 'receipt for order 42 AGAIN'));
            frames.push({ narr: H.c('r', 'Duplicate email.') + ' The fix is not to drop acks_late but to make the task idempotent: a key like <code>receipt-42</code> checked in your DB or sent as the provider\'s Idempotency-Key.', parts: st('At-least-once means "maybe twice".', {}) });
          } else {
            frames.push({ narr: 'With early ack the message was already gone, and the work was finished. Nothing bad happens in this particular timing.', parts: st('Early ack is safe only when the crash comes after the work.', {}) });
            frames.push({ narr: 'You cannot choose when crashes happen, so judge each mode by its worst case: early ack can lose, late ack can repeat.', parts: st('Worst cases: lose (early) vs repeat (late).', {}) });
          }
        } else {
          sideEffects.push('receipt for order 42');
          frames.push({ narr: 'The task runs, sends the email and returns.', parts: st('Happy path.', {}, 'receipt#42 (running)') });
          frames.push({ narr: (late ? 'Now the worker acks and the broker deletes the message.' : 'The message was already deleted at the start.') + ' Both modes look the same when nothing fails.', parts: st('Done.', {}, '-') });
          frames.push({ narr: 'The difference only shows in failures. Try <code>crash=during</code> and <code>crash=after</code> with both ack modes.', parts: st('Try the other inputs.', {}) });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Calling tasks: delay, apply_async, countdown and queues',
        html: `<p><code>delay</code> is the short form. <code>apply_async</code> takes options: <code>countdown</code> (seconds from now), <code>eta</code> (a datetime), <code>expires</code>, <code>queue</code>, <code>priority</code>, <code>task_id</code>. Long countdowns are a trap with Redis/SQS: the worker holds the message unacked until the ETA, and if that is longer than <code>visibility_timeout</code>, the broker hands it to another worker. For "send in 3 days", store a row with <code>due_at</code> and let beat pick due rows every minute.</p>`,
        code: { lang: 'python', code: `from datetime import datetime, timedelta, timezone

from app.worker import build_report, send_receipt

send_receipt.delay(42)                                               # now, default queue
send_receipt.apply_async(args=[42], countdown=30)                    # in 30 s
build_report.apply_async(args=[7], queue="reports", expires=3600)    # drop it if not started within 1 h
send_receipt.apply_async(args=[42], eta=datetime.now(timezone.utc) + timedelta(minutes=5))` }
      },
      {
        title: 'Canvas: a chain with a group inside',
        html: `<p>Export an order: fetch data, then render PDF and CSV in parallel, then email both links. <code>chain</code> passes each result into the next signature; <code>group</code> runs in parallel; a <code>chord</code> (group + callback) needs a result backend because the callback waits for all results. Keep payloads small: pass ids and storage paths, never big blobs.</p>`,
        code: { lang: 'python', code: `from celery import chain, chord

from app.worker import celery_app


@celery_app.task
def fetch(order_id: int) -> int:
    return order_id


@celery_app.task
def render_pdf(order_id: int) -> str:
    return f"s3://exports/{order_id}.pdf"


@celery_app.task
def render_csv(order_id: int) -> str:
    return f"s3://exports/{order_id}.csv"


@celery_app.task
def email_links(links: list[str]) -> None:
    print("emailing", links)


workflow = chain(fetch.s(42), chord([render_pdf.s(), render_csv.s()], email_links.s()))
workflow.apply_async()` }
      },
      {
        title: 'Choosing between the three for a FastAPI shop',
        html: `${H.table(['Situation', 'Pick', 'Reason'], [
          ['Team knows Celery, needs RabbitMQ routing, chords, Flower dashboards', 'Celery', 'Most features and tooling; huge community'],
          ['10 simple jobs, Redis already there, sync code', 'RQ', 'Ten lines of setup, easy to reason about'],
          ['Everything is <code>async def</code>; jobs mostly call HTTP APIs or LLMs', 'arq (or Taskiq)', 'Many concurrent awaits per worker, no sync bridge'],
          ['Multi-step business workflows that must survive days and code deploys', 'A workflow engine (Temporal, Hatchet, AWS Step Functions)', 'Durable state per step; queues alone make you rebuild this']
        ])}`
      }
    ],
    deepDive: `<p>🟣 <b>Prefork and memory.</b> The default Celery pool forks <code>--concurrency</code> child processes (default = number of CPUs). Each child imports your app, so a 300 MB app with concurrency 8 needs about 2.4 GB. <code>--max-tasks-per-child</code> and <code>--max-memory-per-child</code> recycle children to contain leaks. For I/O-heavy tasks, <code>--pool=threads</code> or <code>gevent</code> give hundreds of concurrent tasks per process; CPU-heavy ones want prefork.</p>
      <p><b>Prefetch.</b> Each worker process reserves <code>prefetch_multiplier × concurrency</code> messages ahead of time. With long tasks and the default (4), one worker can sit on messages other idle workers could run. Set 1 for long tasks; keep a higher value for millions of tiny tasks. Separate queues (<code>-Q emails</code>, <code>-Q reports</code>) stop slow jobs from starving fast ones.</p>
      <p><b>Redis as a broker.</b> Celery uses lists plus an "unacked" hash. Messages not acked within <code>visibility_timeout</code> are restored to the queue. This is the root of most "task ran twice" bugs (long tasks, long ETAs). RabbitMQ tracks unacked messages per connection instead: a dropped connection requeues them, and a newer RabbitMQ <code>consumer_timeout</code> (30 min default) closes channels that hold a message too long. SQS uses a per-message visibility timeout the same way.</p>
      <p><b>Beat.</b> Beat only <i>sends</i> messages on schedule; workers run them. Two beat processes means every job fires twice, so run it as a single replica (or use a locking scheduler such as RedBeat). Beat stores its last-run state in a local file by default; in containers that file disappears on restart, which is harmless for crontab schedules but can re-fire interval schedules.</p>
      <p><b>Result backend cost.</b> Every task with a result writes a key; with Redis and millions of tasks, that is memory you pay for. Set <code>ignore_result=True</code> by default and write business results into your own tables. <code>AsyncResult.get()</code> inside a task can deadlock the pool, and Celery warns against it.</p>
      <p><b>Async code in Celery.</b> Celery tasks are sync. Calling async libraries means <code>asyncio.run(coro)</code> per task (a new loop each time, so no shared async clients), or choosing arq/Taskiq. Do not share one async engine/connection pool across forked children; create it after fork (<code>worker_process_init</code> signal).</p>`,
    aiEra: `<p>🤖 Assistants write Celery tasks quickly, but they often (1) retry on <code>Exception</code>, including bugs and 400s, (2) leave the default early ack for money-moving tasks, (3) use <code>pickle</code>, (4) call <code>.get()</code> on another task inside a task, or (5) schedule week-long countdowns on a Redis broker. Keep a checklist and paste it into the prompt.</p>
      <p>LLM workloads changed queue sizing: a job that calls a model may wait 30 s on the network, so async workers (arq, Taskiq, Celery with threads/gevent) are much denser than prefork. Agent pipelines also need per-step durability and human-in-the-loop pauses, which is why durable workflow engines (Temporal, Hatchet, Inngest) became popular next to classic queues in 2025–2026.</p>`,
    problems: [
      {
        title: 'Debug a Task That Executes Twice',
        level: 'Hard',
        tags: ['celery', 'redis', 'visibility timeout', 'idempotency'],
        companies: ['Stripe', 'Razorpay', 'Shopify'],
        statement: `<p>Customers sometimes get <b>two</b> invoices. The invoice is created by this Celery task, scheduled at checkout with <code>generate_invoice.apply_async(args=[order_id], countdown=2 * 3600)</code> ("send it two hours after purchase, after the cancellation window"). The broker is Redis with default settings and the task has <code>acks_late=True</code>. Logs show the <b>same task id</b> started on worker A at 14:05 and on worker B at 15:05; both finished successfully.</p>
          <p>Explain the cause and fix it so that duplicates cannot create two invoices, even if the broker redelivers again in the future.</p>`,
        constraints: `<p>Keep at-least-once delivery (no invoice may be lost). Several worker pods. Postgres is available.</p>`,
        example: `<p>Timeline: 12:05 checkout → message sent with ETA 14:05. Worker A reserves it at once (ETA tasks are held by a worker until due) → 13:05: the message is still unacked after <b>3,600 s</b> (Redis default <code>visibility_timeout</code>) → Redis restores it → worker B reserves it too → at 14:05 A runs it, at 15:05 B runs it again (its own 1 h later). ${H.c('r', 'Two invoices.')}</p>`,
        brute: {
          why: `<p>Turning off <code>acks_late</code> trades duplicates for lost invoices on crashes. Adding <code>if invoice_exists(order_id): return</code> before inserting is a check-then-act race: two workers can both see "no invoice" and both insert.</p>`,
          code: `@celery_app.task(acks_late=True)
def generate_invoice(order_id: int) -> None:
    if not Invoice.exists(order_id):        # RACE: two workers both see False
        Invoice.create(order_id)            # two rows, two emails
        send_invoice_email(order_id)`
        },
        mcq: {
          q: 'Which single change makes a second execution harmless no matter WHY it happens?',
          options: ['A UNIQUE constraint on the invoice\'s business key, with insert-or-skip', 'Raising <code>visibility_timeout</code>', 'Setting <code>worker_prefetch_multiplier=1</code>', 'Running only one worker'],
          answer: 0,
          explain: 'Config changes remove one cause; the database constraint makes the effect idempotent for every cause (redelivery, double enqueue, manual replay).'
        },
        hints: [
          'Hint 1: the two runs are exactly one visibility_timeout apart. What does Redis do with a message that has been reserved but not acked for that long?',
          'Hint 2: ETA/countdown tasks are reserved by a worker immediately and held unacked until they are due. A 2 h countdown is longer than the default 1 h timeout.',
          'Hint 3: fix in layers: (1) do not use long countdowns on Redis/SQS (store <code>due_at</code> and let beat pick due rows) or raise the timeout; (2) make the effect idempotent with a UNIQUE key and <code>INSERT ... ON CONFLICT DO NOTHING RETURNING</code>; only the run that inserted sends the email.'
        ],
        solution: {
          approach: `<p><b>Cause.</b> With the Redis transport, a worker reserves ETA/countdown tasks immediately and keeps them unacked until they run. After <code>visibility_timeout</code> (default 1 h) without an ack, Redis restores the message and another worker reserves it. The countdown (2 h) is longer than the timeout, so every such invoice is delivered twice. Long-running tasks with <code>acks_late</code> hit the same bug.</p>
            <p><b>Fix, layer 1 (stop the cause):</b> do not schedule far-future work as countdowns. Write <code>invoice_due_at</code> on the order and let a beat job every minute enqueue due orders (one short-lived message each). If you must use countdowns, set <code>broker_transport_options={"visibility_timeout": ...}</code> above the longest ETA plus runtime (but a huge timeout delays recovery after real crashes).</p>
            <p><b>Fix, layer 2 (make duplicates harmless):</b> a UNIQUE constraint on <code>invoices(order_id)</code> and an atomic insert-or-skip. Only the execution whose INSERT returned a row sends the email. The email call also carries an idempotency key so a retry after "sent but crashed" is deduplicated by the provider. Add a metric for "duplicate execution skipped" so you can see whether layer 1 works.</p>`,
          code: { lang: 'python', code: `import os

from celery import Celery
from sqlalchemy import text

from app.db import SessionLocal
from app.mail import send_invoice_email

celery_app = Celery("shop", broker=os.environ["CELERY_BROKER_URL"])
celery_app.conf.broker_transport_options = {"visibility_timeout": 4 * 3600}   # > longest task


@celery_app.task(bind=True, acks_late=True, autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=8)
def generate_invoice(self, order_id: int) -> str:
    with SessionLocal() as db, db.begin():
        row = db.execute(
            text(
                "INSERT INTO invoices (order_id, created_by_task) VALUES (:oid, :tid) "
                "ON CONFLICT (order_id) DO NOTHING RETURNING id"
            ),
            {"oid": order_id, "tid": self.request.id},
        ).first()
    if row is None:
        return "duplicate-skipped"            # another execution already created it
    send_invoice_email(order_id, idempotency_key=f"invoice-{order_id}")
    return "created"


@celery_app.task
def enqueue_due_invoices() -> int:
    """Beat runs this every minute instead of 2-hour countdowns."""
    with SessionLocal() as db, db.begin():
        due = db.execute(
            text(
                "UPDATE orders SET invoice_enqueued = true "
                "WHERE invoice_due_at <= now() AND NOT invoice_enqueued "
                "RETURNING id"
            )
        ).scalars().all()
    for order_id in due:
        generate_invoice.delay(order_id)
    return len(due)` },
          complexity: `<p>One indexed INSERT per execution; duplicate runs cost one failed insert. The beat query uses an index on <code>(invoice_enqueued, invoice_due_at)</code>.</p>`,
          followUps: ['What happens if the worker crashes after the INSERT commits but before the email is sent?', 'How would you alert on duplicate executions?', 'Why does RabbitMQ behave differently here?']
        },
        tests: { skip: 'infrastructure wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — Retries, backoff and idempotent jobs
     ===================================================================== */
  topics.push({
    title: 'Retries, Backoff with Jitter and Idempotent Jobs: Safe to Run Twice',
    analogy: `<p>Pressing a lift button five times does not bring five lifts: the button is <b>idempotent</b>. A vending machine that takes your coin, jams, and takes another coin when you try again is <b>not</b>. When a phone line is busy you do not redial every second with a hundred other people; you wait a bit longer each time, and not exactly the same time as everyone else (<b>backoff with jitter</b>).</p>`,
    explain: `<p>🟢 <b>The big idea.</b> Queues deliver <b>at least once</b>. Workers crash after doing the work but before the ack, producers resend after a timeout, users double-click, and you will one day replay a dead-letter queue by hand. So every job must be safe to run twice, and every retry must be polite to the system it is retrying.</p>
      <p><b>Part 1: decide WHAT to retry.</b></p>
      ${H.table(['Error', 'Retry?', 'Examples'], [
        ['Transient', H.c('g', 'yes, with backoff'), 'timeouts, connection reset, DNS blip, HTTP 408/425/429/500/502/503/504, deadlock / serialization failure in the DB'],
        ['Permanent', H.c('r', 'no, fail fast → dead letter'), 'HTTP 400/401/403/404/409/422, validation error, "card declined", a bug (<code>KeyError</code>)'],
        ['Unknown outcome', H.c('y', 'yes, but only if idempotent'), 'timeout <b>after</b> the request was sent: maybe it worked']
      ])}
      <p><b>Part 2: decide WHEN to retry: exponential backoff with full jitter.</b> Delay for retry <i>n</i> (0-based) = <code>random(0, min(cap, base × 2<sup>n</sup>))</code>. With base 1 s and cap 60 s the ceilings are 1, 2, 4, 8, 16, 32, 60, 60 … The random part spreads 10,000 clients that failed at the same second over the whole window instead of hitting the server again in one wave. Respect <code>Retry-After</code> if the server sends it. Cap the <b>number</b> of attempts too, and give each attempt its own timeout.</p>
      <p><b>Part 3: make the job idempotent.</b> Pick one or more:</p>
      <ul>
        <li><b>Natural idempotency:</b> "set status = shipped" is safe to repeat; "balance -= 25" is not. Prefer absolute writes and upserts.</li>
        <li><b>Idempotency key + dedupe table:</b> a UNIQUE key per business action (<code>charge:order-42</code>), inserted in the <b>same transaction</b> as the effect. A second run hits the constraint and skips.</li>
        <li><b>State machine guard:</b> <code>UPDATE orders SET status='paid' WHERE id=42 AND status='pending'</code>; zero rows updated means someone already did it.</li>
        <li><b>Provider idempotency keys:</b> Stripe, Adyen and most payment and email APIs accept an <code>Idempotency-Key</code> header and return the first result again.</li>
        <li><b>Short dedupe windows in Redis:</b> <code>SET key 1 NX EX 86400</code> for webhook ids. Fast, but not transactional with your database, so use it as a filter, not the source of truth.</li>
      </ul>
      <p>After the last attempt, put the job in a <b>dead-letter queue</b> (or a <code>failed_jobs</code> table) with the error, so a human can fix the cause and redrive it, which again only works because the job is idempotent.</p>`,
    clues: [
      '"The same message may arrive twice" / "at-least-once" → idempotent consumer: UNIQUE key + effect in one transaction',
      '"Retry a flaky API without making the outage worse" → exponential backoff + full jitter + cap + max attempts + honour Retry-After',
      '"Customers were charged twice after a timeout" → the timeout hid a success; send an idempotency key to the provider and dedupe locally',
      '"Which errors should we retry?" → transient (timeouts, 429, 5xx) yes; 4xx validation/auth no; bugs no',
      '"Messages keep failing and blocking the queue" → poison message: max attempts, then dead-letter queue with the error',
      '"Retries multiplied our load 27×" → retries at every layer (3 × 3 × 3); retry at one layer, use a retry budget'
    ],
    code: [
      {
        lang: 'python', title: 'tenacity (sync and async) and the same policy in Celery',
        code: `# pip install tenacity httpx
import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    stop_after_delay,
    wait_random_exponential,
)

RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504}


class Retryable(Exception):
    pass


def check(resp: httpx.Response) -> httpx.Response:
    if resp.status_code in RETRYABLE_STATUS:
        raise Retryable(f"status {resp.status_code}")
    resp.raise_for_status()                  # other 4xx: permanent, raise and stop
    return resp


@retry(
    retry=retry_if_exception_type((Retryable, httpx.TransportError)),
    wait=wait_random_exponential(multiplier=1, max=60),     # full jitter, 1..60 s ceilings
    stop=(stop_after_attempt(6) | stop_after_delay(300)),   # whichever comes first
    reraise=True,                                           # surface the real error at the end
)
async def fetch_rates(client: httpx.AsyncClient) -> dict:
    resp = check(await client.get("/rates", timeout=5.0))   # each attempt has its own timeout
    return resp.json()


# Celery equivalent on a task:
# @celery_app.task(bind=True, autoretry_for=(Retryable, httpx.TransportError),
#                  retry_backoff=True, retry_backoff_max=60, retry_jitter=True, max_retries=5)`
      },
      {
        lang: 'python', run: true, title: 'Runnable: at-least-once delivery vs an idempotent consumer (sqlite3, stdlib only)',
        code: `# At-least-once delivery + an idempotent consumer, using sqlite3 from the standard library.
# The UNIQUE constraint makes "have I done this already?" and "do it" one atomic step.
import random
import sqlite3


def make_db():
    db = sqlite3.connect(":memory:", isolation_level=None)   # we control transactions by hand
    db.executescript("""
        CREATE TABLE accounts (id TEXT PRIMARY KEY, balance_cents INTEGER NOT NULL);
        CREATE TABLE processed (idempotency_key TEXT PRIMARY KEY, result TEXT NOT NULL);
        INSERT INTO accounts VALUES ('ana', 10000), ('bo', 10000);
    """)
    return db


def naive_consumer(db, msg):
    db.execute("UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?", (msg["cents"], msg["account"]))


def idempotent_consumer(db, msg):
    db.execute("BEGIN")
    try:
        cur = db.execute("INSERT OR IGNORE INTO processed VALUES (?, 'charged')", (msg["key"],))
        if cur.rowcount == 0:                      # key already there: a duplicate delivery
            db.execute("ROLLBACK")
            return "duplicate"
        db.execute("UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?", (msg["cents"], msg["account"]))
        db.execute("COMMIT")                       # the key and the effect commit TOGETHER
        return "applied"
    except Exception:
        db.execute("ROLLBACK")                     # neither the key nor the effect is kept
        raise


def deliver_at_least_once(messages, seed):
    """A broker that sometimes redelivers (lost ack, worker restart, visibility timeout)."""
    rng = random.Random(seed)
    stream = []
    for m in messages:
        stream.append(m)
        while rng.random() < 0.4:                  # 40 % chance of each extra copy
            stream.append(m)
    return stream


orders = [{"key": "pay-1001", "account": "ana", "cents": 2500},
          {"key": "pay-1002", "account": "bo", "cents": 1200},
          {"key": "pay-1003", "account": "ana", "cents": 300}]
stream = deliver_at_least_once(orders, seed=3)
print("broker delivered", len(stream), "messages for", len(orders), "orders:", [m["key"] for m in stream])

for name, consumer in [("naive", naive_consumer), ("idempotent", idempotent_consumer)]:
    db = make_db()
    outcomes = [consumer(db, m) for m in stream]
    balances = dict(db.execute("SELECT id, balance_cents FROM accounts ORDER BY id"))
    print("%-10s balances: %s" % (name, balances), "" if name == "naive" else "outcomes: %s" % outcomes)

print("expected  balances: {'ana': 7200, 'bo': 8800}")`
      }
    ],
    codeTitle: ['tenacity + Celery', 'Runnable idempotent consumer'],
    viz: [
      {
        title: 'Backoff schedules: fixed vs exponential vs exponential + full jitter',
        input: 'base=1 cap=30 retries=7 clients=4 seed=3',
        inputLabel: 'base=0.1..10 s, cap=1..600 s, retries=1..10, clients=1..6, seed=any number',
        gen: function (input) {
          var o = kvParse(input, 'base=1 cap=30 retries=7 clients=4 seed=3');
          var base = num(o, 'base', 1, 0.1, 10, 'base=1'), cap = num(o, 'cap', 30, 1, 600, 'cap=30');
          var n = Math.round(num(o, 'retries', 7, 1, 10, 'retries=7')), c = Math.round(num(o, 'clients', 4, 1, 6, 'clients=4'));
          var r = rng(Math.round(num(o, 'seed', 3, 0, 1e9, 'seed=3')));
          var frames = [], ceil = [], i, k;
          for (i = 0; i < n; i++) ceil.push(Math.min(cap, base * Math.pow(2, i)));
          var idx = ceil.map(function (_, j) { return 'retry ' + (j + 1); });
          frames.push({ narr: 'Fixed delay (' + base + ' s every time): all ' + c + ' clients that failed together come back together, ' + n + ' times. During an outage that is a synchronized hammer.', parts: [{ type: 'bars', label: 'Delay before each retry (s), every client identical', values: ceil.map(function () { return base; }), idxLabels: idx, texts: ceil.map(function () { return base + 's'; }) }] });
          frames.push({ narr: 'Exponential: ceiling = min(cap, base × 2<sup>n</sup>) = ' + ceil.map(function (x) { return +x.toFixed(2); }).join(', ') + '. The server gets more and more breathing room, and the cap (' + cap + ' s) stops waits from growing forever.', parts: [{ type: 'bars', label: 'Ceiling per retry (s)', values: ceil, idxLabels: idx, texts: ceil.map(function (x) { return +x.toFixed(2) + 's'; }), hl: (function () { var h = {}; ceil.forEach(function (x, j) { if (x >= cap) h[j] = 'bad'; }); return h; })() }] });
          frames.push({ narr: 'But without randomness, every client still retries at the <b>same</b> moments (1 s, 3 s, 7 s … after the failure). Waves stay waves, just further apart.', parts: [{ type: 'table', label: 'Retry times, no jitter', columns: ['client'].concat(idx), rows: (function () { var rows = []; for (k = 0; k < c; k++) { var t = 0; rows.push(['c' + (k + 1)].concat(ceil.map(function (x) { t += x; return (+t.toFixed(1)) + 's'; }))); } return rows; })() }] });
          var total = [];
          var table = [];
          for (k = 0; k < c; k++) {
            var t = 0, row = ['c' + (k + 1)];
            for (i = 0; i < n; i++) { var d = r() * ceil[i]; t += d; row.push((+t.toFixed(1)) + 's'); if (k === 0) total.push(+d.toFixed(2)); }
            table.push(row);
          }
          frames.push({ narr: 'Full jitter: delay = random(0, ceiling). Client 1 drew these delays. Each client draws its own, so their retries scatter across the window.', parts: [{ type: 'bars', label: 'Client 1 delays with full jitter (s)', values: total, idxLabels: idx, texts: total.map(function (x) { return x + 's'; }) }] });
          frames.push({ narr: 'Retry moments for all clients with full jitter: no two rows line up. AWS measured that full jitter needs the fewest total calls to get everyone through a contended resource.', parts: [{ type: 'table', label: 'Retry times with full jitter', columns: ['client'].concat(idx), rows: table }] });
          var worst = ceil.reduce(function (a, b) { return a + b; }, 0);
          frames.push({ narr: 'Budget check: the worst-case total wait is the sum of ceilings ≈ <b>' + (+worst.toFixed(1)) + ' s</b> (average about half). If the caller is a user request with a 2 s timeout, retry at most once or twice there and leave the long schedule to a background job.', parts: [{ type: 'vars', label: 'Policy', vals: { base_s: base, cap_s: cap, retries: n, worst_case_total_s: +worst.toFixed(1), expected_total_s: +(worst / 2).toFixed(1) }, hl: { worst_case_total_s: 'cur' } }] });
          return frames;
        }
      },
      {
        title: 'Idempotency key table: duplicates bounce off the UNIQUE constraint',
        input: 'pay-1:2500 pay-2:1200 pay-1:2500 pay-3:300 pay-2:1200',
        inputLabel: 'Delivered messages "key:cents" in order (duplicates allowed, up to 12)',
        gen: function (input) {
          var msgs = String(input || '').trim().split(/\s+/).filter(Boolean).slice(0, 12).map(function (t) {
            var m = t.match(/^([\w-]+):(\d+)$/);
            if (!m) throw new Error('Write messages like pay-1:2500 pay-1:2500');
            return { key: m[1], cents: +m[2] };
          });
          if (!msgs.length) throw new Error('Give at least one message, e.g. pay-1:2500');
          var seen = {}, keys = [], naive = 0, safe = 0, frames = [];
          frames.push({ narr: 'The broker delivers ' + msgs.length + ' messages. Some are copies (lost acks, retries, double clicks). The naive consumer subtracts every one; the idempotent one first inserts the key.', parts: [{ type: 'queue', label: 'Deliveries', items: msgs.map(function (m) { return m.key + ':' + m.cents; }) }, { type: 'vars', label: 'Money charged', vals: { naive_cents: 0, idempotent_cents: 0 } }] });
          msgs.forEach(function (m, i) {
            naive += m.cents;
            var dup = !!seen[m.key];
            if (!dup) { seen[m.key] = true; keys.push(m.key); safe += m.cents; }
            var hl = {}; hl[m.key] = dup ? 'bad' : 'ok';
            frames.push({ narr: 'Message ' + (i + 1) + ' <code>' + hesc(m.key) + '</code>: ' + (dup ? H.c('r', 'INSERT fails on the UNIQUE key') + ' → rollback, skip, ack. The naive consumer charges again.' : H.c('g', 'INSERT succeeds') + ' and the charge commits in the same transaction.'), parts: [{ type: 'set', label: 'processed.idempotency_key (UNIQUE)', items: keys.slice(), hl: hl }, { type: 'vars', label: 'Money charged', vals: { naive_cents: naive, idempotent_cents: safe }, hl: dup ? { naive_cents: 'bad' } : { idempotent_cents: 'ok' } }] });
          });
          frames.push({ narr: 'Result: the naive consumer charged <b>' + naive + '</b> cents, the idempotent one <b>' + safe + '</b>. Because the key and the effect commit together, a crash between them can never leave "key saved but not charged" or the reverse.', parts: [{ type: 'set', label: 'processed keys', items: keys.slice() }, { type: 'vars', label: 'Final', vals: { naive_cents: naive, idempotent_cents: safe, overcharge: naive - safe }, hl: { overcharge: naive > safe ? 'bad' : 'ok' } }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'The timeout that hid a success',
        html: `<p>The worker calls the payment API with a 5 s timeout. The provider charges the card at 4.9 s, the reply arrives at 5.1 s, the client gives up and Celery retries. Second call: a second charge. The fix is an <b>idempotency key per business action</b> (not per attempt!) sent with every attempt; the provider returns the stored result of the first call.</p>
          ${H.table(['Attempt', 'Idempotency-Key', 'Provider does', 'Customer charged'], [['1 (timed out)', 'charge-order-42', 'charges, stores result', '1×'], ['2 (retry)', 'charge-order-42', H.c('g', 'returns stored result'), H.c('g', 'still 1×')], ['2 without key', '-', H.c('r', 'charges again'), H.c('r', '2×')]])}`,
        code: { lang: 'python', code: `import httpx


def charge(client: httpx.Client, order_id: int, cents: int) -> dict:
    resp = client.post(
        "/v1/charges",
        json={"amount": cents, "currency": "eur", "order": order_id},
        headers={"Idempotency-Key": f"charge-order-{order_id}"},   # same key on EVERY attempt
        timeout=5.0,
    )
    resp.raise_for_status()
    return resp.json()` }
      },
      {
        title: 'State-machine guard instead of a dedupe table',
        html: `<p>For "mark order shipped and email the customer", the order row already knows its state. A conditional UPDATE is the lock: only the run that moved <code>paid → shipped</code> sends the email.</p>`,
        code: { lang: 'python', code: `from sqlalchemy import update

from app.db import SessionLocal
from app.mail import send_shipping_email
from app.models import Order


def ship(order_id: int) -> bool:
    with SessionLocal() as db, db.begin():
        moved = db.execute(
            update(Order)
            .where(Order.id == order_id, Order.status == "paid")
            .values(status="shipped")
        ).rowcount
    if moved == 0:
        return False             # already shipped (or not paid): do nothing
    send_shipping_email(order_id)  # side effect only for the run that won
    return True` }
      },
      {
        title: 'Retry amplification across layers',
        html: `<p>Browser retries 3×, the API gateway 3×, your service 3× its call to the database. One user click during an outage becomes up to <b>3 × 3 × 3 = 27</b> database calls. Rules: retry at <b>one</b> layer (usually the one closest to the failure that knows if it is safe), make the others fail fast, and use a <b>retry budget</b> (for example "retries may add at most 10 % extra traffic") so retries switch off when most calls are failing anyway.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Why full jitter.</b> With "equal jitter" (<code>c/2 + random(0, c/2)</code>) and "decorrelated jitter" (<code>min(cap, random(base, prev × 3))</code>) as alternatives, AWS's simulations showed full jitter does about the least total work and finishes about as fast. Celery's <code>retry_jitter=True</code> is full jitter on top of <code>retry_backoff</code>; tenacity's <code>wait_random_exponential</code> is the same idea.</p>
      <p><b>Exactly-once is an effect, not a delivery.</b> No broker can promise a function runs once (the ack can always be lost after the work). What you can promise is that its <b>effect</b> appears once: idempotent writes, dedupe keys in the same transaction as the effect, and an outbox for the messages you produce. Kafka's "exactly-once semantics" is the same trick inside Kafka's own transactions.</p>
      <p><b>Dedupe key lifetime.</b> A DB dedupe table grows forever; partition it by day and drop partitions older than the longest possible redelivery (broker retention + DLQ redrive window). A Redis key with TTL is cheaper but can expire before a late duplicate arrives, and it is not atomic with your DB commit. If you crash after <code>SET NX</code> and before the commit, the retry is skipped and the work is lost, so set the key <i>after</i> commit or store it in the DB.</p>
      <p><b>Ordering.</b> Retries reorder messages: update #2 can be applied before update #1's retry. Use version numbers (<code>WHERE version &lt; :v</code>) or event timestamps so an older event never overwrites a newer state.</p>
      <p><b>Poison messages and DLQs.</b> A message that always fails (bad data, a bug) burns worker time forever unless attempts are capped. After the cap, park it with the exception, traceback, attempt count and first-seen time. Alert on DLQ depth, and build a one-command redrive. Celery does not have a built-in DLQ for Redis; teams use a <code>failed_jobs</code> table in a failure handler (<code>on_failure</code> or the <code>task_failure</code> signal), or RabbitMQ's dead-letter exchange with <code>task_reject_on_worker_lost</code> and rejections.</p>`,
    aiEra: `<p>🤖 LLM APIs are the flakiest dependency many teams now have: 429 rate limits, 529/503 overloads, long tails. Official SDKs (OpenAI, Anthropic and others) already retry with backoff by default. Wrapping them in another tenacity loop and a Celery retry gives you three layers of retries and the amplification problem above. Read what the SDK does first, set its <code>max_retries</code>, and retry at one layer.</p>
      <p>Assistants generate <code>@retry(stop=stop_after_attempt(3))</code> on everything, including non-idempotent POSTs. Review every generated retry with: "what if attempt 1 actually succeeded?" Agents that call tools with side effects (send email, create ticket) need idempotency keys per tool call for the same reason: the agent loop may repeat a step after a timeout.</p>`,
    problems: [
      {
        title: 'Make the Payment Job Idempotent',
        level: 'Medium',
        tags: ['idempotency', 'at-least-once', 'payments'],
        companies: ['Stripe', 'PayPal', 'PhonePe'],
        statement: `<p>A payment worker receives messages at least once. Each message has an <b>idempotency key</b> and an amount in cents. Write <code>process_payments(keys, amounts)</code> that simulates an idempotent consumer and returns <code>[total_charged, charges_made, duplicates_skipped, conflicts]</code>:</p>
          <ul>
            <li>first time a key is seen: charge the amount;</li>
            <li>key seen again with the <b>same</b> amount: a duplicate delivery, skip it (and return the stored result in real life);</li>
            <li>key seen again with a <b>different</b> amount: a <b>conflict</b> (a client bug reusing a key), do not charge, count it. Stripe answers this case with an error, too.</li>
          </ul>
          <p>The amount stored for a key is the amount of its <b>first</b> message. Keys are case-sensitive.</p>`,
        constraints: `<p>0 ≤ n ≤ 10<sup>5</sup>, <code>len(keys) == len(amounts)</code>, 1 ≤ amount ≤ 10<sup>7</sup>.</p>`,
        example: `<p>keys <code>["x","y","x","y","x"]</code>, amounts <code>[10,20,10,25,11]</code>: x charged 10, y charged 20, x again with 10 → ${H.c('g', 'duplicate')}, y with 25 → ${H.c('r', 'conflict')}, x with 11 → ${H.c('r', 'conflict')}. Answer <code>[30, 2, 1, 2]</code>.</p>`,
        brute: {
          why: `<p>Charging every message is the naive consumer: each redelivery is another charge. Checking "did we already charge?" in one step and charging in another is the classic race; real code must make check and effect one atomic step (UNIQUE constraint).</p>`,
          code: `def process_payments(keys, amounts):
    total = sum(amounts)                 # every redelivery charges again
    return [total, len(keys), 0, 0]`
        },
        mcq: {
          q: 'Why store the amount with the key, not just the key?',
          options: ['To detect a key reused for a different request (a client bug) instead of silently returning the wrong result', 'To make lookups faster', 'Because SQL needs two columns', 'To sort charges by amount'],
          answer: 0,
          explain: 'An idempotency key promises "same request, same result". If the request differs, quietly treating it as a duplicate hides a serious bug.'
        },
        hints: [
          'Hint 1: one dict <code>first_amount[key]</code> is the whole dedupe store.',
          'Hint 2: on each message: key missing → charge and remember; present and equal → duplicate; present and different → conflict.',
          'Hint 3: in production the dict is a table with <code>idempotency_key PRIMARY KEY, request_hash, response</code>, inserted in the same transaction as the charge.'
        ],
        solution: {
          approach: `<p>Keep a dictionary from key to the first amount seen. That is exactly what a real idempotency table stores (a hash of the request plus the response). Each message is O(1): a missing key is charged, a present key with the same amount is a duplicate, and a present key with a different amount is a conflict. In a database, the "missing" check and the insert happen together through <code>INSERT ... ON CONFLICT DO NOTHING</code>, so two workers cannot both charge.</p>`,
          code: { lang: 'python', run: true, code: `def process_payments(keys: list[str], amounts: list[int]) -> list[int]:
    first_amount: dict[str, int] = {}     # the idempotency table: key -> request it stood for
    total = charges = duplicates = conflicts = 0
    for key, cents in zip(keys, amounts):
        if key not in first_amount:
            first_amount[key] = cents     # INSERT ... ON CONFLICT DO NOTHING succeeded
            total += cents
            charges += 1
        elif first_amount[key] == cents:
            duplicates += 1               # same request again: return the stored result
        else:
            conflicts += 1                # same key, different request: reject (e.g. HTTP 422)
    return [total, charges, duplicates, conflicts]


print(process_payments(["k1", "k2", "k1"], [100, 200, 100]))            # [300, 2, 1, 0]
print(process_payments(["x", "y", "x", "y", "x"], [10, 20, 10, 25, 11]))  # [30, 2, 1, 2]` },
          complexity: `<p>O(n) time, O(distinct keys) space.</p>`,
          followUps: ['How long must a key be kept?', 'What do you return to the caller for a duplicate while the first attempt is still running?']
        },
        tests: { fn: 'process_payments', sig: 'string[] int[] -> int[]', cases: [
          [[['k1', 'k2', 'k1'], [100, 200, 100]], [300, 2, 1, 0]],
          [[[], []], [0, 0, 0, 0]],
          [[['k1', 'k1', 'k1'], [50, 50, 60]], [50, 1, 1, 1]],
          [[['a', 'b', 'c'], [1, 2, 3]], [6, 3, 0, 0]],
          [[['x', 'y', 'x', 'y', 'x'], [10, 20, 10, 25, 11]], [30, 2, 1, 2]],
          [[['K', 'k'], [5, 5]], [10, 2, 0, 0]]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Redis caching patterns with redis.asyncio
     ===================================================================== */
  topics.push({
    title: 'Redis Caching Patterns in Python: redis.asyncio, Cache-Aside, Stampede Locks, Write-Through and Write-Behind',
    analogy: `<p>A librarian keeps the 50 most-asked books on the front desk (the cache) instead of walking to the basement stacks (the database) every time. Each desk copy has a sticky note "return by 3 pm" (TTL). When a popular book's note expires and 40 students ask at once, a smart librarian sends <b>one</b> runner to the basement and tells the others to wait a moment (single-flight), instead of sending 40 runners.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> Backend 9 covered Redis types and the theory of cache-aside, invalidation, stampedes and penetration. This topic is the <b>Python implementation</b>: an async client, serialization, key design, TTLs, a stampede lock that works across many worker processes, and the two write patterns.</p>
      <p><b>The client.</b> <code>redis-py</code> ships an asyncio client: <code>import redis.asyncio as redis</code>. Create <b>one</b> client per process in FastAPI's <code>lifespan</code> (it holds a connection pool), read the URL from the environment, and close it with <code>await client.aclose()</code> on shutdown. Every call is <code>await r.get(...)</code>, <code>await r.set(key, value, ex=ttl, nx=True)</code> and so on. Set <code>socket_timeout</code> so a slow Redis cannot hang requests, and treat Redis errors as cache misses (the cache is an optimisation, not the source of truth).</p>
      ${H.table(['Pattern', 'Read path', 'Write path', 'Use when'], [
        ['<b>Cache-aside</b> (lazy)', 'get → miss → load DB → set with TTL', 'write DB, then <b>delete</b> the key', 'Default for read-heavy APIs'],
        ['<b>Read-through</b>', 'the cache library loads on miss', 'same as above', 'When a library hides the loader (same idea as cache-aside)'],
        ['<b>Write-through</b>', 'always hits cache', 'write DB <b>and</b> cache synchronously', 'Read-after-write must be fast and fresh; writes are rare'],
        ['<b>Write-behind</b> (write-back)', 'cache', 'write cache now, flush to DB later in batches', 'Counters, view counts, metrics: high write rate, small loss acceptable']
      ])}
      <p><b>Five rules for production cache-aside:</b></p>
      <ol>
        <li><b>Keys:</b> <code>app:entity:version:id</code>, e.g. <code>shop:product:v3:42</code>. Bump <code>v3 → v4</code> when the cached shape changes, so old pods and new pods do not read each other's format.</li>
        <li><b>TTL with jitter:</b> <code>ttl = base + random(0, 10 %)</code> so keys written together do not expire together.</li>
        <li><b>Invalidate after commit:</b> delete the key <i>after</i> the DB transaction commits, never before (otherwise a reader can refill the old value in between).</li>
        <li><b>Stampede protection:</b> only one process rebuilds a hot key (lock with <code>SET lock NX PX</code>), others wait briefly or serve the stale value.</li>
        <li><b>Negative caching:</b> cache "not found" for a short TTL (30 s) so bots asking for ids that do not exist cannot hammer the DB.</li>
      </ol>`,
    clues: [
      '"Cache this endpoint in a FastAPI service" → <code>redis.asyncio</code> client in lifespan + cache-aside helper with TTL + delete on write',
      '"Popular key expired and the DB CPU spiked" → cache stampede; single-flight lock, TTL jitter, or early refresh',
      '"Users see stale data right after an update" → invalidate after commit; for read-your-writes, write-through or skip cache for that user briefly',
      '"Millions of counter updates per minute" → write-behind: <code>INCR</code> in Redis, flush to the DB in batches',
      '"Bots request random product ids" → negative caching + input validation (Backend 9 adds Bloom filters)',
      '"Redis went down and the API went down with it" → timeouts and treat cache errors as misses; maybe a circuit breaker'
    ],
    code: [
      {
        lang: 'python', title: 'app/cache.py — async cache-aside with a cross-process stampede lock',
        code: `# pip install "redis>=5" fastapi
import asyncio
import json
import os
import random
import secrets
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

import redis.asyncio as redis
from fastapi import FastAPI, Request

MISSING = "__missing__"          # marker stored for negative caching

# Lua: delete the lock only if it is still OUR token (safe release)
RELEASE = """
if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = redis.from_url(
        os.environ["REDIS_URL"],          # e.g. redis://cache:6379/0, or rediss:// for TLS
        decode_responses=True,
        socket_timeout=0.25,              # a slow cache must not slow every request
        socket_connect_timeout=0.25,
        health_check_interval=30,
    )
    yield
    await app.state.redis.aclose()


async def cached(
    r: redis.Redis,
    key: str,
    ttl: int,
    loader: Callable[[], Awaitable[Any]],
    negative_ttl: int = 30,
) -> Any:
    try:
        raw = await r.get(key)
    except redis.RedisError:
        return await loader()                     # cache down: degrade to the DB
    if raw is not None:
        return None if raw == MISSING else json.loads(raw)

    lock_key, token = f"lock:{key}", secrets.token_hex(8)
    got_lock = await r.set(lock_key, token, nx=True, px=5000)   # single-flight across ALL pods
    if not got_lock:
        for _ in range(20):                       # someone else is rebuilding: wait up to ~1 s
            await asyncio.sleep(0.05)
            raw = await r.get(key)
            if raw is not None:
                return None if raw == MISSING else json.loads(raw)
        return await loader()                     # gave up waiting: load ourselves (rare)
    try:
        value = await loader()
        jitter = random.randint(0, max(1, ttl // 10))
        if value is None:
            await r.set(key, MISSING, ex=negative_ttl)
        else:
            await r.set(key, json.dumps(value), ex=ttl + jitter)
        return value
    finally:
        await r.eval(RELEASE, 1, lock_key, token)


app = FastAPI(lifespan=lifespan)


@app.get("/products/{pid}")
async def get_product(pid: int, request: Request):
    r: redis.Redis = request.app.state.redis
    return await cached(r, f"shop:product:v3:{pid}", ttl=300, loader=lambda: load_product_from_db(pid))


async def update_product(pid: int, changes: dict, r: redis.Redis) -> None:
    await save_product_to_db(pid, changes)       # commit first ...
    await r.delete(f"shop:product:v3:{pid}")      # ... then invalidate


async def load_product_from_db(pid: int) -> dict | None:
    await asyncio.sleep(0.01)                     # stands in for an async SQLAlchemy query
    return {"id": pid, "name": "Mug", "price_cents": 1299}


async def save_product_to_db(pid: int, changes: dict) -> None:
    await asyncio.sleep(0.01)`
      },
      {
        lang: 'python', run: true, title: 'Runnable: cache-aside with TTL, an injectable clock and single-flight (threads, stdlib only)',
        code: `# Cache-aside with TTL, an injectable clock, and single-flight stampede protection.
# Same shape as a Redis cache: get -> miss -> load from DB -> set with TTL.
import random
import threading
import time


class FakeClock:
    """Tests move time by hand instead of sleeping."""

    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class TTLCache:
    """Stands in for Redis: values expire after ttl seconds."""

    def __init__(self, clock):
        self.clock, self.data, self.lock = clock, {}, threading.Lock()

    def get(self, key):
        with self.lock:
            item = self.data.get(key)
            if item is None or item[1] <= self.clock():
                self.data.pop(key, None)        # lazy expiry, like Redis on access
                return None
            return item[0]

    def set(self, key, value, ttl):
        with self.lock:
            self.data[key] = (value, self.clock() + ttl)

    def delete(self, key):
        with self.lock:
            self.data.pop(key, None)


class SlowDB:
    def __init__(self):
        self.loads, self.lock = 0, threading.Lock()

    def load_product(self, pid):
        with self.lock:
            self.loads += 1
        time.sleep(0.05)                         # a slow query: this is what the stampede multiplies
        return {"id": pid, "price": 1999}


class CacheAside:
    def __init__(self, cache, db, ttl, single_flight, rng=None):
        self.cache, self.db, self.ttl = cache, db, ttl
        self.single_flight = single_flight
        self.rng = rng or random.Random(0)
        self.key_locks, self.guard = {}, threading.Lock()

    def _lock_for(self, key):
        with self.guard:
            return self.key_locks.setdefault(key, threading.Lock())

    def get_product(self, pid):
        key = "product:%d" % pid
        value = self.cache.get(key)
        if value is not None:
            return value                         # HIT
        if not self.single_flight:
            return self._load_and_set(key, pid)  # every concurrent miss hits the DB
        with self._lock_for(key):                # only one loader per key
            value = self.cache.get(key)          # double-check: maybe it was filled while we waited
            if value is not None:
                return value
            return self._load_and_set(key, pid)

    def _load_and_set(self, key, pid):
        value = self.db.load_product(pid)
        jitter = self.rng.uniform(0, 0.1 * self.ttl)   # spread expiries so keys do not all die together
        self.cache.set(key, value, self.ttl + jitter)
        return value


def stampede(single_flight, clients=50):
    clock, db = FakeClock(), SlowDB()
    svc = CacheAside(TTLCache(clock), db, ttl=60, single_flight=single_flight)
    start = threading.Barrier(clients)

    def client():
        start.wait()                             # everyone arrives at the same instant
        svc.get_product(7)

    threads = [threading.Thread(target=client) for _ in range(clients)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    hits_before = db.loads
    clock.now += 30                              # still fresh: no DB call
    svc.get_product(7)
    clock.now += 40                              # 70 s later: past TTL (60 + up to 6 jitter)
    svc.get_product(7)
    return hits_before, db.loads


for mode in (False, True):
    burst, total = stampede(mode)
    print("single_flight=%-5s DB loads during the burst: %2d, total after 2 more reads: %d" % (mode, burst, total))`
      },
      {
        lang: 'python', run: true, title: 'Runnable: write-through vs write-behind (stdlib only)',
        code: `# Write-through vs write-behind (write-back), side by side, with a fake slow database.
import collections


class SlowDB:
    def __init__(self):
        self.rows, self.writes, self.ms = {}, 0, 0

    def write_many(self, items):
        self.ms += 20 + 2 * len(items)           # one round trip + a little per row
        self.writes += 1
        self.rows.update(items)


class WriteThrough:
    """Every write goes to the DB first, then the cache. Slow writes, never loses data."""

    def __init__(self, db):
        self.db, self.cache = db, {}

    def put(self, key, value):
        self.db.write_many({key: value})         # if this raises, the cache is untouched
        self.cache[key] = value


class WriteBehind:
    """Writes land in the cache and a buffer; a flusher writes batches later."""

    def __init__(self, db, max_batch):
        self.db, self.cache = db, {}
        self.dirty = collections.OrderedDict()   # key -> latest value, first-seen order
        self.max_batch = max_batch

    def put(self, key, value):
        self.cache[key] = value
        self.dirty[key] = value                  # 10 updates to one key = 1 DB row write
        if len(self.dirty) >= self.max_batch:
            self.flush()

    def flush(self):
        if self.dirty:
            self.db.write_many(dict(self.dirty))
            self.dirty.clear()


# 1,000 "view counter" updates spread over 20 articles
updates = [("article:%d" % (i % 20), i) for i in range(1000)]

db1 = SlowDB()
wt = WriteThrough(db1)
for k, v in updates:
    wt.put(k, v)
wt.put("article:3", 5000)

db2 = SlowDB()
wb = WriteBehind(db2, max_batch=50)
for i, (k, v) in enumerate(updates):
    wb.put(k, v)
    if i % 100 == 99:
        wb.flush()                               # a timer tick: flush at least every "second"
wb.put("article:3", 5000)                        # one more update arrives after the last tick...
lost_if_crash_now = len(wb.dirty)                # ...and is only in memory until the next flush
wb.flush()

print("write-through: %4d DB writes, %5d ms of DB time" % (db1.writes, db1.ms))
print("write-behind : %4d DB writes, %5d ms of DB time" % (db2.writes, db2.ms))
print("same final rows:", db1.rows == db2.rows)
print("write-behind keys at risk before the last flush:", lost_if_crash_now)`
      }
    ],
    codeTitle: ['redis.asyncio cache-aside', 'Runnable stampede', 'Runnable write patterns'],
    viz: {
      title: 'A hot key expires: stampede vs single-flight',
      input: 'clients=8 load_ms=200 single_flight=no',
      inputLabel: 'clients=1..12 arriving together, load_ms=10..2000 (DB query time), single_flight=yes|no',
      gen: function (input) {
        var o = kvParse(input, 'clients=8 load_ms=200 single_flight=no');
        var n = Math.round(num(o, 'clients', 8, 1, 12, 'clients=8')), lm = Math.round(num(o, 'load_ms', 200, 10, 2000, 'load_ms=200'));
        var sf = yes(o, 'single_flight', false);
        var frames = [], st = [], i;
        for (i = 0; i < n; i++) st.push('miss');
        function bars(label, vals, hl) { return { type: 'bars', label: label, values: vals, idxLabels: vals.map(function (_, j) { return 'c' + (j + 1); }), hl: hl || {} }; }
        frames.push({ narr: 'At 12:00:00 the key <code>shop:product:v3:42</code> expires. In the same 5 ms, ' + n + ' requests (from different pods) ask for it. Every one sees a <b>miss</b>.', parts: [{ type: 'array', label: 'Each client\'s GET result', values: st.slice(), hl: (function () { var h = {}; st.forEach(function (_, j) { h[j] = 'bad'; }); return h; })() }, { type: 'vars', label: 'Database', vals: { concurrent_queries: 0, key_state: 'expired' } }] });
        if (!sf) {
          var load = st.map(function () { return 1; });
          frames.push({ narr: 'Without a lock, all ' + n + ' run the same query. The DB does the same work ' + n + ' times, and each copy gets slower because they compete for CPU and locks.', parts: [bars('Queries each client sends', load, (function () { var h = {}; load.forEach(function (_, j) { h[j] = 'bad'; }); return h; })()), { type: 'vars', label: 'Database', vals: { concurrent_queries: n, est_query_ms: Math.round(lm * (1 + (n - 1) * 0.35)) }, hl: { concurrent_queries: 'bad' } }] });
          frames.push({ narr: 'All ' + n + ' then <code>SET</code> the same value with the same TTL. Worse: they expire together again next time. Under real traffic (thousands of requests per second on one key) this is how a cache miss turns into a database outage.', parts: [{ type: 'array', label: 'Who wrote the cache', values: st.map(function () { return 'SET'; }), hl: (function () { var h = {}; st.forEach(function (_, j) { h[j] = 'bad'; }); return h; })() }, { type: 'vars', label: 'Totals', vals: { db_queries: n, wasted: n - 1 }, hl: { wasted: 'bad' } }] });
          frames.push({ narr: 'Fix it with three cheap tools: a single-flight lock (<code>SET lock:key token NX PX 5000</code>), TTL jitter, and for very hot keys an early refresh before expiry. Re-run with <code>single_flight=yes</code>.', parts: [txt('Fix', '<code>single_flight=yes</code> · TTL jitter · early refresh')] });
        } else {
          frames.push({ narr: 'Every client tries <code>SET lock:shop:product:v3:42 &lt;token&gt; NX PX 5000</code>. Redis is single-threaded, so exactly one wins: c1.', parts: [{ type: 'array', label: 'SET NX result', values: st.map(function (_, j) { return j === 0 ? 'OK' : 'nil'; }), hl: (function () { var h = { 0: 'ok' }; for (var j = 1; j < n; j++) h[j] = 'cur'; return h; })() }, { type: 'vars', label: 'Database', vals: { concurrent_queries: 1, lock_owner: 'c1' }, hl: { concurrent_queries: 'ok' } }] });
          frames.push({ narr: 'c1 runs the query (' + lm + ' ms). The others poll the cache every 50 ms (or serve a stale copy if you keep one). The DB sees <b>one</b> query.', parts: [bars('Queries each client sends', st.map(function (_, j) { return j === 0 ? 1 : 0; }), { 0: 'ok' }), { type: 'vars', label: 'Waiting', vals: { waiting_clients: n - 1, polls_each: Math.ceil(lm / 50) } }] });
          frames.push({ narr: 'c1 writes the value with <code>EX 300 + jitter</code> and releases the lock with the compare-and-delete Lua script (so it never deletes a lock someone else took after a timeout).', parts: [{ type: 'array', label: 'Next GET result', values: st.map(function (_, j) { return j === 0 ? 'SET' : 'hit'; }), hl: (function () { var h = { 0: 'sel' }; for (var j = 1; j < n; j++) h[j] = 'ok'; return h; })() }, { type: 'vars', label: 'Totals', vals: { db_queries: 1, wasted: 0 }, hl: { db_queries: 'ok' } }] });
          frames.push({ narr: 'The waiters find the value on their next poll. Total extra latency for them: about one query time. Lock TTL (5 s) matters: if c1 dies, the lock expires and another client rebuilds.', parts: [txt('Trade-off', 'Waiters pay ≈' + lm + ' ms once; the DB is protected. For keys that must never block, serve stale while one worker refreshes.')] });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Picking TTLs per data type',
        html: `${H.table(['Data', 'Changes', 'Stale OK?', 'TTL', 'Invalidation'], [
          ['Product description', 'rarely', 'minutes', '1 h + jitter', 'delete on edit'],
          ['Price', 'daily', H.c('r', 'no (legal / checkout)'), '5 min', 'delete on edit; checkout reads DB'],
          ['Stock count', 'every sale', 'seconds', '10–30 s or none', 'do not cache at checkout'],
          ['Exchange rates', 'every minute (feed)', '1 min', '60 s', 'refresh job writes the key (write-through)'],
          ['User profile (own)', 'sometimes', H.c('r', 'not for the owner'), '10 min', 'delete on edit; read-your-writes'],
          ['"Product 999 not found"', '-', 'yes', '30 s', 'negative cache, short']
        ])}<p>Start from "how stale may this be for this reader?", not from "how long can I cache it?".</p>`
      },
      {
        title: 'Write-behind counters with INCR and a flush job',
        html: `<p>Article view counts: 5,000 increments per second would crush Postgres. Redis <code>INCR</code> absorbs them; a job every 10 s swaps the counters out atomically (<code>GETDEL</code>, Redis 6.2+) and writes one UPDATE per article. If Redis is lost, at most 10 s of views are lost, which is acceptable for this data and unacceptable for money.</p>`,
        code: { lang: 'python', code: `import redis.asyncio as redis
from sqlalchemy import text


async def count_view(r: redis.Redis, article_id: int) -> None:
    await r.incr(f"views:pending:{article_id}")
    await r.sadd("views:dirty", article_id)


async def flush_views(r: redis.Redis, session) -> int:
    flushed = 0
    while (article_id := await r.spop("views:dirty")) is not None:
        n = await r.getdel(f"views:pending:{article_id}")    # take and reset in one step
        if n:
            await session.execute(
                text("UPDATE articles SET views = views + :n WHERE id = :id"),
                {"n": int(n), "id": int(article_id)},
            )
            flushed += 1
    await session.commit()
    return flushed` }
      },
      {
        title: 'The invalidation race, and why "delete after commit" wins',
        html: `${H.table(['Time', 'Writer', 'Reader'], [
          ['t1', 'DELETE key (before commit!)', ''],
          ['t2', '', 'GET key → miss, reads DB → <b>old</b> row (not committed yet)'],
          ['t3', 'COMMIT new price', ''],
          ['t4', '', H.c('r', 'SET key = old price, TTL 1 h')]
        ])}<p>Deleting <b>after</b> commit closes most of this window. A tiny race remains (a reader that loaded just before the commit and writes after the delete). For data where that matters, use short TTLs, versioned values (store <code>updated_at</code> and refuse to overwrite a newer one), or a second "delayed delete" a second later.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Connection pools and async.</b> <code>redis.asyncio.Redis</code> keeps a <code>ConnectionPool</code>; each awaited command borrows a connection. With 500 concurrent requests and a pool limit of 50, the rest wait on the pool (<code>BlockingConnectionPool</code> with a timeout makes that explicit). Pipelines (<code>async with r.pipeline(transaction=False) as p</code>) send many commands in one round trip, which is how you <code>MGET</code>-style warm a page of 50 products in one network hop.</p>
      <p><b>Serialization.</b> JSON is readable and safe; <code>orjson</code> is 5–10× faster. Never <code>pickle</code> into a shared cache: anyone who can write to Redis can then run code in your app. Store Pydantic models with <code>model.model_dump_json()</code> and read with <code>Model.model_validate_json(raw)</code>; include the schema version in the key.</p>
      <p><b>Probabilistic early refresh (XFetch).</b> Instead of locking at expiry, each reader refreshes early with a probability that grows as expiry approaches: refresh if <code>now − δ·β·ln(rand()) ≥ expiry</code>, where δ is the recompute time. Hot keys get refreshed by one lucky reader before they expire, so nobody waits.</p>
      <p><b>Redis Cluster and hot keys.</b> All requests for one key go to one shard. A single celebrity key at 200k reads/s can saturate one node; mitigate with a tiny in-process L1 cache (next topic) for 1–5 s, or replicate the key under several names (<code>key#0..7</code>) and read a random one.</p>
      <p><b>Client-side caching.</b> Redis 6+ can push invalidation messages to clients that track keys (RESP3 <code>CLIENT TRACKING</code>); redis-py added support for it in recent versions. It gives an L1 cache that is invalidated by the server, though most teams still use short L1 TTLs for simplicity.</p>
      <p><b>Production reality.</b> Watch hit ratio per key prefix, evictions (<code>evicted_keys</code>), memory, and p99 command latency. Set <code>maxmemory</code> with <code>allkeys-lru</code> or <code>allkeys-lfu</code> on a pure cache. Never mix the Celery broker and a cache that evicts keys in the same Redis database with an eviction policy: eviction can delete queued tasks.</p>`,
    aiEra: `<p>🤖 Ask an assistant for "a Redis cache decorator" and you usually get cache-aside with a fixed TTL, <code>pickle</code>, no stampede protection, no timeout, and invalidation before commit. These are exactly the details interviewers probe. Give it the five rules from this topic as requirements and it will produce a solid helper.</p>
      <p>LLM apps added a new cache layer: <b>semantic caching</b> (embedding the prompt and returning a stored answer for a close-enough earlier prompt) and provider-side <b>prompt caching</b> of long shared prefixes. The same questions apply (TTL, invalidation when the source documents change, per-user isolation so one user's answer is never served to another).</p>`,
    problems: [
      {
        title: 'Cache-Aside with an Injectable Clock',
        level: 'Medium',
        tags: ['cache-aside', 'ttl', 'invalidation', 'testing'],
        companies: ['Flipkart', 'Booking.com', 'Zalando'],
        statement: `<p>Build a testable cache-aside layer. Time is passed in explicitly (an injectable clock) so tests never sleep. Implement class <code>CacheAside(ttl)</code>:</p>
          <ul>
            <li><code>db_put(key, value)</code>: write the database, then <b>invalidate</b> the cached entry for that key;</li>
            <li><code>get(key, now)</code>: if a cached entry exists and <code>now &lt; expires_at</code>, return it (hit). Otherwise load from the database (count one load), cache it with <code>expires_at = now + ttl</code>, and return it. A key missing from the database returns <code>-1</code>, counts as a load, and is <b>not</b> cached;</li>
            <li><code>loads()</code>: how many times the database was read.</li>
          </ul>`,
        constraints: `<p>0 ≤ ttl ≤ 10<sup>6</sup>; <code>now</code> never decreases; values are non-negative integers; up to 10<sup>4</sup> operations.</p>`,
        example: `<p><code>CacheAside(60)</code>, <code>db_put("p1", 100)</code>, <code>get("p1", 0)</code> → 100 (load #1, expires at 60), <code>get("p1", 59)</code> → 100 (${H.c('g', 'hit')}), <code>get("p1", 60)</code> → 100 (${H.c('y', 'expired')}, load #2), <code>loads()</code> → 2.</p>`,
        brute: {
          why: `<p>Calling <code>time.time()</code> inside the cache makes the test sleep 60 real seconds to see an expiry, so people stop testing expiry at all. Not invalidating on write serves stale data for a full TTL.</p>`,
          code: `import time


class CacheAside:
    def __init__(self, ttl):
        self.ttl, self.db, self.cache, self.n = ttl, {}, {}, 0

    def db_put(self, key, value):
        self.db[key] = value          # BUG: cached copy stays stale for a whole TTL

    def get(self, key, now=None):
        now = time.time()             # BUG: real clock, untestable without sleeping
        if key in self.cache and now < self.cache[key][1]:
            return self.cache[key][0]
        self.n += 1
        value = self.db.get(key, -1)
        self.cache[key] = (value, now + self.ttl)
        return value

    def loads(self):
        return self.n`
        },
        mcq: {
          q: 'With TTL 60, an entry is cached at t = 0. At what time is it first considered expired?',
          options: ['t = 60 (fresh only while now &lt; 60)', 't = 61', 't = 59', 'Never, until deleted'],
          answer: 0,
          explain: 'expires_at = 0 + 60 and a hit requires now &lt; expires_at, so t = 60 is already a miss. Redis behaves the same: EX 60 means gone after 60 s.'
        },
        hints: [
          'Hint 1: store <code>(value, expires_at)</code> per key; a hit needs <code>now &lt; expires_at</code>.',
          'Hint 2: <code>db_put</code> must pop the cached entry (delete-on-write), not update it.',
          'Hint 3: count a load on every DB read, including the "not found" case; do not cache -1 (or cache it with a short negative TTL in real life).'
        ],
        solution: {
          approach: `<p>Two dicts: the "database" and the cache of <code>(value, expires_at)</code>. <code>get</code> checks freshness with the injected <code>now</code>; on a miss it reads the DB, counts the load, and caches found values. <code>db_put</code> writes then invalidates (the cache-aside rule "write DB, delete key"). Passing time in makes every expiry rule testable in microseconds; in the real app you pass <code>time.monotonic()</code> or inject a clock object.</p>`,
          code: { lang: 'python', run: true, code: `class CacheAside:
    def __init__(self, ttl: int):
        self.ttl = ttl
        self.db: dict[str, int] = {}
        self.cache: dict[str, tuple[int, int]] = {}    # key -> (value, expires_at)
        self.n_loads = 0

    def db_put(self, key: str, value: int) -> None:
        self.db[key] = value                            # 1. commit to the database
        self.cache.pop(key, None)                       # 2. then invalidate

    def get(self, key: str, now: int) -> int:
        entry = self.cache.get(key)
        if entry is not None and now < entry[1]:
            return entry[0]                             # fresh hit
        self.n_loads += 1                               # miss or expired: read the DB
        if key not in self.db:
            self.cache.pop(key, None)
            return -1                                   # not cached (no negative caching here)
        value = self.db[key]
        self.cache[key] = (value, now + self.ttl)
        return value

    def loads(self) -> int:
        return self.n_loads


c = CacheAside(60)
c.db_put("p1", 100)
print(c.get("p1", 0), c.get("p1", 59), c.get("p1", 60), c.loads())   # 100 100 100 2` },
          complexity: `<p>O(1) per operation; memory O(keys in the DB + cached keys).</p>`,
          followUps: ['Add negative caching with its own TTL.', 'Add single-flight: what changes when two threads miss at once?', 'How do you add TTL jitter and still test deterministically?']
        },
        tests: { cls: 'CacheAside', sigs: { CacheAside: 'int', db_put: 'string int -> void', get: 'string int -> int', loads: '-> int' }, cases: [
          { ops: ['CacheAside', 'db_put', 'get', 'get', 'get', 'loads'], args: [[60], ['p1', 100], ['p1', 0], ['p1', 59], ['p1', 60], []], out: [null, null, 100, 100, 100, 2] },
          { ops: ['CacheAside', 'db_put', 'get', 'db_put', 'get', 'get', 'loads'], args: [[30], ['a', 5], ['a', 10], ['a', 7], ['a', 11], ['a', 12], []], out: [null, null, 5, null, 7, 7, 2] },
          { ops: ['CacheAside', 'get', 'get', 'loads'], args: [[10], ['zz', 0], ['zz', 1], []], out: [null, -1, -1, 2] },
          { ops: ['CacheAside', 'db_put', 'get', 'get', 'loads'], args: [[0], ['k', 1], ['k', 5], ['k', 5], []], out: [null, null, 1, 1, 2] },
          { ops: ['CacheAside', 'db_put', 'db_put', 'get', 'get', 'get', 'get', 'get', 'loads'], args: [[100], ['a', 1], ['b', 2], ['a', 0], ['b', 50], ['a', 99], ['b', 149], ['a', 100], []], out: [null, null, null, 1, 2, 1, 2, 1, 3] },
          { ops: ['CacheAside', 'db_put', 'db_put', 'get', 'loads'], args: [[60], ['x', 9], ['x', 10], ['x', 0], []], out: [null, null, null, 10, 1] }
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — In-process caches: lru_cache, OrderedDict LRU, two-level caching
     ===================================================================== */
  topics.push({
    title: 'In-Process Caches: functools.lru_cache, a Hand-Made LRU and Two-Level (L1 + Redis) Caching',
    analogy: `<p>Redis is the shared fridge in the office kitchen: everyone can use it, but you have to walk there. An in-process cache is the snack drawer in <b>your own desk</b>: instant, but tiny, and your colleagues cannot see what is in it. When the drawer is full you throw out whatever you have not touched for the longest time (<b>least recently used</b>).</p>`,
    explain: `<p>🟢 <b>The big idea.</b> A Python dict lookup takes about 50 nanoseconds; a Redis round trip takes about 0.3–1 millisecond, roughly <b>10,000× slower</b>. For data that is read constantly and changes rarely (config, feature flags, exchange rates, a JWKS key set, compiled templates), a small cache <b>inside each worker process</b> is the fastest thing you can build.</p>
      ${H.table(['Tool', 'Eviction', 'Expiry (TTL)', 'Thread-safe', 'Notes'], [
        ['<code>@functools.lru_cache(maxsize=N)</code>', 'LRU', H.c('r', 'no'), 'yes (its internal state)', 'Pure functions with hashable args; <code>cache_info()</code>, <code>cache_clear()</code>'],
        ['<code>@functools.cache</code>', 'none (unbounded)', 'no', 'yes', 'Same as <code>lru_cache(maxsize=None)</code>: can grow forever'],
        ['<code>OrderedDict</code> LRU by hand', 'LRU', 'add it yourself', 'add a lock', 'Full control: TTL, stats, size by bytes'],
        ['<code>cachetools.TTLCache</code> / <code>LRUCache</code>', 'LRU / TTL', 'yes', 'no (wrap with a lock)', 'Popular small library; <code>@cached(cache, lock=...)</code>'],
        ['<code>async-lru</code> (<code>@alru_cache</code>)', 'LRU', 'optional ttl', 'per event loop', '<code>lru_cache</code> does not work on <code>async def</code> (it caches the coroutine object)']
      ])}
      <p><b>How an LRU works.</b> Keep keys in order of last use. A hit moves the key to the "most recent" end. A new key goes on the recent end, and if the cache is over capacity, the key at the "least recent" end is evicted. Python's <code>OrderedDict</code> gives exactly this in O(1): <code>move_to_end(key)</code> and <code>popitem(last=False)</code>. <code>lru_cache</code> does the same with a C-level doubly linked list.</p>
      <p><b>The catch: every process has its own copy.</b> With 4 Gunicorn workers on 10 pods you have 40 independent caches. An update invalidates nothing in them, so you <b>must</b> use short TTLs (seconds) or a broadcast (Redis pub/sub) to clear them. That makes the classic two-level design:</p>
      ${H.table(['Level', 'Where', 'TTL', 'Hit cost'], [['L1', 'dict / LRU inside the process', '1–30 s', '~0.05 µs'], ['L2', 'Redis, shared by all pods', 'minutes–hours', '~0.5 ms'], ['Source', 'Postgres', '-', '2–50 ms']])}`,
    clues: [
      '"Cache the result of a pure function" → <code>@functools.lru_cache(maxsize=...)</code>',
      '"Implement an LRU cache with O(1) get and put" → <code>OrderedDict</code> with <code>move_to_end</code> / <code>popitem(last=False)</code> (or hash map + doubly linked list)',
      '"Memory of the worker keeps growing" → unbounded <code>@cache</code> / <code>lru_cache(maxsize=None)</code> on high-cardinality arguments',
      '"Redis CPU is high because of one hot key" → add a short-TTL L1 cache in each process',
      '"Cache an async function" → <code>async-lru</code> or a dict of futures, not <code>lru_cache</code>',
      '"Users see different values depending on which pod they hit" → per-process caches without invalidation; shorten L1 TTL or broadcast'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'Runnable: functools.lru_cache vs a hand-made OrderedDict LRU (stdlib only)',
        code: `# functools.lru_cache vs a hand-made LRU on OrderedDict.
import collections
import functools

calls = collections.Counter()


@functools.lru_cache(maxsize=3)
def exchange_rate(pair):
    calls[pair] += 1                             # pretend this is a slow HTTP call
    return {"USD/EUR": 0.92, "USD/INR": 83.1, "USD/GBP": 0.79, "USD/JPY": 151.0}[pair]


for p in ["USD/EUR", "USD/INR", "USD/EUR", "USD/GBP", "USD/JPY", "USD/INR"]:
    exchange_rate(p)
print("lru_cache:", exchange_rate.cache_info())
print("real calls per pair:", dict(calls))


class LRU:
    """get/put in O(1). The OrderedDict keeps keys from least to most recently used."""

    def __init__(self, capacity):
        self.capacity, self.data = capacity, collections.OrderedDict()
        self.hits = self.misses = 0

    def get(self, key, default=None):
        if key not in self.data:
            self.misses += 1
            return default
        self.hits += 1
        self.data.move_to_end(key)               # now the most recent
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            evicted, _ = self.data.popitem(last=False)   # oldest first
            print("  evict", evicted)


cache = LRU(3)
for key in ["a", "b", "c", "a", "d", "b", "a"]:
    if cache.get(key) is None:
        cache.put(key, key.upper())
print("hand-made LRU order (old -> new):", list(cache.data), "hits", cache.hits, "misses", cache.misses)`
      },
      {
        lang: 'python', title: 'A thread-safe L1 TTL cache in front of Redis (two-level read)',
        code: `import json
import threading
import time
from collections import OrderedDict

import redis


class L1Cache:
    """Small LRU with TTL, one per process. Never the source of truth."""

    def __init__(self, capacity: int = 1024, ttl: float = 5.0, clock=time.monotonic):
        self.capacity, self.ttl, self.clock = capacity, ttl, clock
        self.data: OrderedDict[str, tuple[object, float]] = OrderedDict()
        self.lock = threading.Lock()          # threadpool routes run in parallel threads

    def get(self, key: str):
        with self.lock:
            item = self.data.get(key)
            if item is None:
                return None
            value, expires = item
            if expires <= self.clock():
                del self.data[key]
                return None
            self.data.move_to_end(key)
            return value

    def set(self, key: str, value: object) -> None:
        with self.lock:
            self.data[key] = (value, self.clock() + self.ttl)
            self.data.move_to_end(key)
            while len(self.data) > self.capacity:
                self.data.popitem(last=False)


l1 = L1Cache(capacity=2000, ttl=5)


def get_flags(r: redis.Redis, tenant: str) -> dict:
    key = f"flags:v2:{tenant}"
    value = l1.get(key)                       # 1. this process (nanoseconds)
    if value is not None:
        return value
    raw = r.get(key)                          # 2. Redis (sub-millisecond)
    if raw is None:
        value = load_flags_from_db(tenant)    # 3. database
        r.set(key, json.dumps(value), ex=300)
    else:
        value = json.loads(raw)
    l1.set(key, value)
    return value


def load_flags_from_db(tenant: str) -> dict:
    return {"new_checkout": tenant.startswith("beta")}`
      }
    ],
    codeTitle: ['Runnable LRU', 'L1 + Redis'],
    viz: {
      title: 'LRU cache step by step (OrderedDict order: old → new)',
      input: 'cap=3 seq=a b c a d b a e',
      inputLabel: 'cap=1..6 and seq= a list of keys to read (on a miss the key is loaded and put)',
      gen: function (input) {
        var m = String(input || '').match(/cap\s*=\s*(\d+)\s+seq\s*=\s*(.+)$/i);
        if (!m) throw new Error('Format: cap=3 seq=a b c a d');
        var cap = +m[1];
        if (cap < 1 || cap > 6) throw new Error('cap must be 1..6');
        var seq = m[2].trim().split(/\s+/).slice(0, 16);
        var order = [], hits = 0, misses = 0, frames = [];
        frames.push({ narr: 'Empty cache with capacity ' + cap + '. Left = least recently used (evicted first), right = most recently used.', parts: [{ type: 'array', label: 'OrderedDict keys (old → new)', values: [] }, { type: 'vars', label: 'Stats', vals: { hits: 0, misses: 0 } }] });
        seq.forEach(function (k) {
          var i = order.indexOf(k), narr, hl = {}, ev = null;
          if (i >= 0) {
            hits++; order.splice(i, 1); order.push(k);
            narr = '<code>get(' + hesc(k) + ')</code>: ' + H.c('g', 'hit') + '. <code>move_to_end</code> makes it the most recent, so it is now the last to be evicted.';
            hl[order.length - 1] = 'ok';
          } else {
            misses++; order.push(k);
            if (order.length > cap) ev = order.shift();
            narr = '<code>get(' + hesc(k) + ')</code>: ' + H.c('r', 'miss') + ', load it and put it at the recent end.' + (ev ? ' Over capacity, so <code>popitem(last=False)</code> evicts <b>' + hesc(ev) + '</b>, the least recently used.' : '');
            hl[order.length - 1] = 'cur';
          }
          frames.push({ narr: narr, parts: [{ type: 'array', label: 'OrderedDict keys (old → new)', values: order.slice(), hl: hl }, { type: 'vars', label: 'Stats', vals: { hits: hits, misses: misses, evicted: ev || '-' }, hl: ev ? { evicted: 'bad' } : {} }] });
        });
        frames.push({ narr: 'Done: ' + hits + ' hits, ' + misses + ' misses, hit ratio ' + Math.round(100 * hits / Math.max(1, seq.length)) + '%. <code>lru_cache.cache_info()</code> reports the same numbers for a decorated function.', parts: [{ type: 'array', label: 'Final order', values: order.slice() }, { type: 'vars', label: 'Stats', vals: { hits: hits, misses: misses, hit_ratio: Math.round(100 * hits / Math.max(1, seq.length)) + '%' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'lru_cache on a method leaks objects',
        html: `<p><code>@lru_cache</code> on an instance method includes <code>self</code> in the key, so the cache keeps every instance alive forever (a memory leak in a long-running worker). Cache a module-level function, use <code>functools.cached_property</code> for per-instance values, or keep a cache dict on the instance.</p>`,
        code: { lang: 'python', code: `from functools import cached_property, lru_cache


class PriceService:
    @lru_cache(maxsize=1024)          # BAD: holds a reference to every PriceService ever made
    def price(self, sku: str) -> int:
        return 100

    @cached_property                  # OK: computed once per instance, freed with it
    def tax_table(self) -> dict:
        return {"DE": 19, "FR": 20}


@lru_cache(maxsize=1024)              # OK: module-level, args are plain values
def price_for(sku: str) -> int:
    return 100` }
      },
      {
        title: 'Unhashable arguments and mutable results',
        html: `<p><code>lru_cache</code> needs hashable arguments: pass a tuple, not a list, or a frozen Pydantic model. It also returns the <b>same object</b> every time: if a caller mutates the returned dict, every later caller sees the change. Return immutable values (tuples, frozen dataclasses, <code>MappingProxyType</code>) or copy before mutating.</p>
          ${H.table(['Call', 'Result'], [['<code>f([1, 2])</code>', H.c('r', 'TypeError: unhashable type: list')], ['<code>f((1, 2))</code>', H.c('g', 'cached')], ['<code>r = g(); r["x"] = 1</code>', H.c('r', 'cache poisoned for everyone')]])}`
      },
      {
        title: 'Sizing the L1 TTL',
        html: `<p>Feature flags change maybe once a day, but when they change, product wants them live within 10 seconds. With 40 processes and an L1 TTL of 5 s, the worst-case staleness is 5 s, and Redis receives at most 40 reads per key per 5 s (8/s) instead of thousands. That is the whole trade: <b>worst staleness = L1 TTL</b>, <b>load on L2 = processes ÷ TTL</b> per key.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How <code>lru_cache</code> is built.</b> CPython's C implementation keeps a dict from a key (built from args, and kwargs in order) to a node in a circular doubly linked list. A hit unlinks and relinks the node at the front: O(1). The key building is the real cost: for one int argument it uses the int itself; for several arguments it builds a tuple. <code>typed=True</code> keeps <code>f(1)</code> and <code>f(1.0)</code> apart. The internal lock protects the cache's structure, but two threads that miss on the same key at once both call the function (no single-flight).</p>
      <p><b>OrderedDict vs dict.</b> Since Python 3.7 plain dicts keep insertion order, so you can build an LRU with <code>d.pop(k)</code> + reinsert and <code>next(iter(d))</code> for the oldest key. <code>OrderedDict.move_to_end</code> is clearer and O(1); both work.</p>
      <p><b>Forking and caches.</b> Gunicorn with <code>--preload</code> forks workers after the app is imported; a cache filled at import time is shared copy-on-write until a worker writes to it. Reference counting writes to every object it touches, so in practice pages get copied anyway. Do not count on fork to share memory for caches.</p>
      <p><b>Invalidating L1 across processes.</b> Options: short TTL (simplest), a version number in Redis checked every N seconds, or Redis pub/sub where each process subscribes to <code>cache-invalidate</code> and drops keys when a message arrives. Pub/sub is fire-and-forget: a process that is reconnecting misses messages, so keep a TTL as the safety net.</p>
      <p><b>Production reality.</b> Bound everything: count and, for large values, approximate bytes. Export per-cache hits, misses and evictions as metrics. An L1 hit ratio under ~50 % usually means the cache is too small or the keys too varied to be worth the memory.</p>`,
    aiEra: `<p>🤖 "Implement an LRU cache" is still one of the most asked coding questions, and every assistant can write it. The interview signal moved to the follow-ups: thread safety, TTL, async functions, memory bounds, per-process copies and invalidation. Practise explaining those, not typing the class.</p>
      <p>In AI services, in-process caches hold tokenizers, embedding models and prompt templates. Those are large (hundreds of MB), so load them once per process in <code>lifespan</code> and size worker counts by memory, not CPU (topic 7). An assistant that suggests <code>@lru_cache</code> on a function returning a 2 GB model per argument value can exhaust memory fast.</p>`,
    problems: [
      {
        title: 'Build an O(1) LRU Cache for a Worker Process',
        level: 'Medium',
        tags: ['lru', 'ordereddict', 'design'],
        companies: ['Amazon', 'Microsoft', 'Uber'],
        statement: `<p>Your API looks up exchange rates by integer currency id thousands of times per second. Build a per-process cache class <code>LRUCache(capacity)</code> with:</p>
          <ul><li><code>get(key)</code>: the value, or <code>-1</code> if absent; a hit makes the key most recently used;</li>
          <li><code>put(key, value)</code>: insert or update (an update also makes the key most recently used); if the size goes over capacity, evict the least recently used key.</li></ul>
          <p>Both operations must be O(1).</p>`,
        constraints: `<p>1 ≤ capacity ≤ 3000; keys and values are integers 0..10<sup>4</sup>; up to 2·10<sup>5</sup> calls.</p>`,
        example: `<p>capacity 2: <code>put(1,1)</code>, <code>put(2,2)</code>, <code>get(1)</code> → 1 (order now 2, 1), <code>put(3,3)</code> evicts ${H.c('r', '2')}, <code>get(2)</code> → -1, <code>put(4,4)</code> evicts ${H.c('r', '1')}, <code>get(1)</code> → -1, <code>get(3)</code> → 3, <code>get(4)</code> → 4.</p>`,
        brute: {
          why: `<p>A list of keys in use order works but <code>list.remove(key)</code> and <code>list.pop(0)</code> are O(n), so at capacity 3,000 every call scans thousands of entries.</p>`,
          code: `class LRUCache:
    def __init__(self, capacity):
        self.capacity, self.order, self.data = capacity, [], {}

    def get(self, key):
        if key not in self.data:
            return -1
        self.order.remove(key)          # O(n)
        self.order.append(key)
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.order.remove(key)      # O(n)
        self.order.append(key)
        self.data[key] = value
        if len(self.order) > self.capacity:
            del self.data[self.order.pop(0)]   # O(n)`
        },
        mcq: {
          q: 'Which OrderedDict call evicts the least recently used entry?',
          options: ['<code>popitem(last=False)</code>', '<code>popitem()</code>', '<code>move_to_end(key, last=False)</code>', '<code>pop(key)</code>'],
          answer: 0,
          explain: 'Hits and inserts move keys to the end, so the front holds the oldest one; popitem(last=False) removes from the front.'
        },
        hints: [
          'Hint 1: you need a fast lookup (a dict) and a fast "which is the oldest" (an order you can update in O(1)).',
          'Hint 2: <code>collections.OrderedDict</code> gives both: <code>move_to_end(key)</code> on every hit and update, <code>popitem(last=False)</code> to evict.',
          'Hint 3: on <code>put</code> of an existing key, update the value AND move it to the end; evict only after inserting, when <code>len &gt; capacity</code>.'
        ],
        solution: {
          approach: `<p>An <code>OrderedDict</code> is a hash map plus a doubly linked list, which is exactly the textbook LRU structure. Keep keys ordered from least to most recently used. <code>get</code> moves a found key to the end. <code>put</code> writes, moves to the end, and pops the front item if the size exceeds capacity. In a threaded server, wrap both methods in a <code>threading.Lock</code>; in production you would also add a TTL.</p>`,
          code: { lang: 'python', run: true, code: `from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data: OrderedDict[int, int] = OrderedDict()   # oldest first, newest last

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)          # now the most recently used
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        self.data[key] = value
        self.data.move_to_end(key)          # new or updated: most recent
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)   # evict the least recently used


c = LRUCache(2)
c.put(1, 1); c.put(2, 2); print(c.get(1)); c.put(3, 3); print(c.get(2), c.get(3))   # 1, then -1 3` },
          dry: { head: ['op', 'order after (old → new)', 'returns'], rows: [['put(1,1)', '[1]', '-'], ['put(2,2)', '[1, 2]', '-'], ['get(1)', '[2, 1]', '1'], ['put(3,3)', '[1, 3] (evict 2)', '-'], ['get(2)', '[1, 3]', '-1']] },
          complexity: `<p>O(1) average per call; O(capacity) memory.</p>`,
          followUps: ['Add a TTL per entry.', 'Make it safe for 40 threadpool threads.', 'Size the cache by bytes instead of count.']
        },
        tests: { cls: 'LRUCache', sigs: { LRUCache: 'int', get: 'int -> int', put: 'int int -> void' }, cases: [
          { ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]], out: [null, null, null, 1, null, -1, null, -1, 3, 4] },
          { ops: ['LRUCache', 'put', 'put', 'get', 'get', 'put', 'get'], args: [[1], [1, 1], [2, 2], [1], [2], [2, 20], [2]], out: [null, null, null, -1, 2, null, 20] },
          { ops: ['LRUCache', 'put', 'put', 'put', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [1, 10], [3, 3], [2], [1], [3]], out: [null, null, null, null, null, -1, 10, 3] },
          { ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [3], [1]], out: [null, null, null, 1, null, -1, 3, 1] },
          { ops: ['LRUCache', 'put', 'put', 'put', 'get', 'put', 'get', 'get', 'put', 'get', 'get', 'get'], args: [[3], [1, 1], [2, 2], [3, 3], [2], [4, 4], [1], [3], [5, 5], [2], [4], [5]], out: [null, null, null, null, 2, null, -1, 3, null, -1, 4, 5] },
          { ops: ['LRUCache', 'get'], args: [[2], [5]], out: [null, -1] }
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Docker images for Python apps
     ===================================================================== */
  topics.push({
    title: 'Docker Images for Python Services: Multi-Stage, Slim, Non-Root, Locked and Health-Checked',
    analogy: `<p>Moving house: you pack the furniture, not the workshop where it was built. A multi-stage build is the workshop (compilers, headers, caches) in one room and a moving van that only takes the finished furniture (the virtualenv and your code). You also lock the boxes with a list of exactly what is inside (the lockfile), and the movers do not get the keys to the house (non-root user).</p>`,
    explain: `<p>🟢 <b>The big idea.</b> DevOps modules (Backend 13 and the Docker module in the DevOps route) teach layers, caching and multi-stage builds in general. Python adds its own traps: compilers needed only to build wheels, pip's download cache, <code>.pyc</code> files, a virtualenv that must live at the same path in both stages, and lockfiles. A good Python image is <b>small</b> (≈ 100–250 MB), <b>reproducible</b> (locked versions), <b>non-root</b> and <b>fast to rebuild</b> (dependency layer cached).</p>
      ${H.table(['Choice', 'Do', 'Why'], [
        ['Base image', '<code>python:3.12-slim</code> (Debian, glibc), pinned by tag or digest', 'Full <code>python:3.12</code> is ~1 GB; <code>alpine</code> uses musl, so many wheels must compile from source and some behave differently'],
        ['Stages', 'builder installs into <code>/app/.venv</code>; runtime copies only that venv + code', 'gcc, headers and caches never reach production'],
        ['Lockfile', '<code>uv.lock</code> with <code>uv sync --locked</code>, or pip-tools <code>requirements.txt</code> with <code>--require-hashes</code>', 'Same versions on every build; hashes stop tampered packages'],
        ['pip', '<code>pip install --no-cache-dir</code>', 'pip\'s cache would add 50–200 MB to the layer'],
        ['Layer order', 'copy lockfile → install deps → copy source', 'A code change does not reinstall dependencies'],
        ['.dockerignore', '<code>.git</code>, <code>.venv</code>, <code>__pycache__</code>, <code>.env</code>, tests data', 'Smaller context, no secrets baked in, better cache hits'],
        ['User', '<code>USER app</code> (non-root, fixed uid)', 'A compromised process cannot write to system paths; many clusters forbid root'],
        ['Env', '<code>PYTHONUNBUFFERED=1</code>, <code>PYTHONDONTWRITEBYTECODE=1</code>', 'Logs appear immediately; no stray .pyc writes at runtime'],
        ['CMD', 'exec form <code>["gunicorn", ...]</code>', 'The server is PID 1 and receives SIGTERM for graceful shutdown'],
        ['HEALTHCHECK', 'a tiny HTTP probe of <code>/health</code>', 'Docker / Compose can tell "running" from "working" (Kubernetes uses its own probes instead)']
      ])}
      <p><b>Secrets:</b> never <code>ENV API_KEY=...</code> or <code>COPY .env</code>: every layer is readable by anyone who pulls the image. Runtime secrets come from the orchestrator's environment or a secret store; build-time secrets (a private package index token) use <code>RUN --mount=type=secret</code>, which never lands in a layer.</p>`,
    clues: [
      '"Our Python image is 1.2 GB" → slim base, multi-stage, <code>--no-cache-dir</code>, .dockerignore, no build tools in runtime',
      '"Every build reinstalls all dependencies" → copy the lockfile and install BEFORE copying source',
      '"Builds are not reproducible / a minor version broke prod" → lockfile (uv.lock or pip-compile with hashes)',
      '"Container ignores Ctrl+C / takes 30 s to stop" → shell-form CMD, so PID 1 is <code>sh</code>; use exec form',
      '"Should I use Alpine for Python?" → usually no: musl breaks manylinux wheels and makes builds slow; prefer slim',
      '"Security scan: container runs as root" → create a user and set <code>USER</code>'
    ],
    code: [
      {
        lang: 'text', check: false, title: 'Dockerfile — uv, multi-stage, non-root, HEALTHCHECK',
        code: `# syntax=docker/dockerfile:1
# ---------- stage 1: build the virtualenv ----------
FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \\
    UV_LINK_MODE=copy \\
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app
# 1) dependencies only (cached until pyproject.toml or uv.lock change)
RUN --mount=type=cache,target=/root/.cache/uv \\
    --mount=type=bind,source=uv.lock,target=uv.lock \\
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \\
    uv sync --locked --no-install-project --no-dev
# 2) then the project itself
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --locked --no-dev

# ---------- stage 2: runtime ----------
FROM python:3.12-slim
RUN groupadd --system --gid 10001 app \\
 && useradd --system --uid 10001 --gid app --no-create-home app
WORKDIR /app
COPY --from=builder --chown=app:app /app /app
ENV PATH="/app/.venv/bin:$PATH" \\
    PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \\
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"]
CMD ["gunicorn", "app.main:app", "-k", "uvicorn_worker.UvicornWorker", "-c", "gunicorn.conf.py"]`
      },
      {
        lang: 'text', check: false, title: 'Dockerfile — the same with pip-tools and hashes',
        code: `# requirements.txt is generated on a dev machine / in CI:
#   pip-compile --generate-hashes -o requirements.txt pyproject.toml
FROM python:3.12-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev \\
 && rm -rf /var/lib/apt/lists/*
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir --require-hashes -r requirements.txt

FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 \\
 && rm -rf /var/lib/apt/lists/* \\
 && useradd --system --uid 10001 app
COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY --chown=app:app app/ ./app/
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1
USER app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]`
      },
      {
        lang: 'text', check: false, title: '.dockerignore',
        code: `.git
.gitignore
.venv
venv
__pycache__/
*.pyc
.pytest_cache
.mypy_cache
.ruff_cache
.coverage
htmlcov
.env
.env.*
*.sqlite3
node_modules
docs/
tests/fixtures/big/
Dockerfile*
docker-compose*.yml`
      },
      {
        lang: 'yaml', title: 'compose.yaml — API, worker, beat and Redis for local development',
        code: `services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env                      # local only; never baked into the image
    environment:
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/1
    depends_on:
      redis:
        condition: service_healthy
  worker:
    build: .
    command: ["celery", "-A", "app.worker", "worker", "--loglevel=INFO", "--concurrency=4"]
    env_file: .env
    environment:
      CELERY_BROKER_URL: redis://redis:6379/1
    depends_on: [redis]
  beat:
    build: .
    command: ["celery", "-A", "app.worker", "beat", "--loglevel=INFO"]
    env_file: .env
    environment:
      CELERY_BROKER_URL: redis://redis:6379/1
    deploy:
      replicas: 1                       # exactly one scheduler
  redis:
    image: redis:7.4-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 10`
      }
    ],
    codeTitle: ['Dockerfile (uv)', 'Dockerfile (pip-tools)', '.dockerignore', 'compose.yaml'],
    viz: {
      title: 'Shrinking a Python image, one change at a time',
      input: 'start=1200',
      inputLabel: 'start= starting image size in MB (300..3000)',
      gen: function (input) {
        var o = kvParse(input, 'start=1200');
        var start = Math.round(num(o, 'start', 1200, 300, 3000, 'start=1200'));
        var steps = [
          ['python:3.12 (full Debian + gcc + headers)', 0, 'The starting point: the full image already ships compilers and dev headers, and <code>COPY . .</code> also copied <code>.git</code> and a local <code>.venv</code>.'],
          ['add .dockerignore', 0.12, 'Stop copying <code>.git</code>, <code>.venv</code>, caches and test data into the build context and the image.'],
          ['pip install --no-cache-dir', 0.08, 'pip kept every downloaded wheel in <code>/root/.cache/pip</code> inside the layer.'],
          ['switch to python:3.12-slim', 0.45, 'Slim drops compilers, docs and most dev libraries: the biggest single win.'],
          ['multi-stage: build in builder, copy only the venv', 0.12, 'gcc and <code>libpq-dev</code> stay in the builder; runtime gets only <code>libpq5</code> and the venv.'],
          ['remove dev deps (pytest, mypy, ruff)', 0.05, '<code>uv sync --no-dev</code>: test tools do not belong in production.']
        ];
        var sizes = [], labels = [], frames = [], cur = start;
        steps.forEach(function (s, i) {
          if (i > 0) cur = Math.max(80, Math.round(cur - start * s[1]));
          sizes.push(cur); labels.push('#' + i);
          var hl = {}; hl[i] = i === 0 ? 'bad' : 'ok';
          frames.push({ narr: '<b>' + s[0] + '</b>: ' + s[2] + ' Size now ≈ <b>' + cur + ' MB</b>.', parts: [{ type: 'bars', label: 'Image size (MB) after each change', values: sizes.slice(), idxLabels: labels.slice(), texts: sizes.map(function (x) { return x + 'MB'; }), hl: hl }, { type: 'table', label: 'Changes so far', columns: ['#', 'change'], rows: steps.slice(0, i + 1).map(function (x, j) { return [String(j), x[0]]; }) }] });
        });
        frames.push({ narr: 'From ' + start + ' MB to about ' + cur + ' MB (' + Math.round(100 * (1 - cur / start)) + '% smaller). Smaller images pull faster on autoscaling, have fewer CVEs to patch, and start sooner. Check with <code>docker image ls</code> and <code>docker history</code> or the <code>dive</code> tool.', parts: [{ type: 'vars', label: 'Result', vals: { before_mb: start, after_mb: cur, saved_pct: Math.round(100 * (1 - cur / start)) + '%' }, hl: { after_mb: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Why exec-form CMD matters for graceful shutdown',
        html: `${H.table(['CMD', 'PID 1', 'On <code>docker stop</code> (SIGTERM)'], [
          ['<code>CMD gunicorn app.main:app</code> (shell form)', '<code>/bin/sh -c</code>', H.c('r', 'sh ignores SIGTERM; after 10 s Docker sends SIGKILL; in-flight requests die')],
          ['<code>CMD ["gunicorn", "app.main:app"]</code>', 'gunicorn', H.c('g', 'stops accepting, finishes requests within graceful-timeout, exits')],
          ['shell script entrypoint ending in <code>exec gunicorn ...</code>', 'gunicorn (exec replaced sh)', H.c('g', 'same as exec form')]
        ])}<p>Celery workers need the same treatment: SIGTERM triggers a <b>warm shutdown</b> (finish current tasks); a SIGKILL loses unacked work only if you did not use <code>acks_late</code>.</p>`
      },
      {
        title: 'One image, many processes',
        html: `<p>Build one image and run it with different commands: <code>gunicorn ...</code> for the API, <code>celery ... worker</code> for workers, <code>celery ... beat</code> for the scheduler, <code>alembic upgrade head</code> as a migration job before rollout. One build, one scan, one version tag (the git SHA) for everything.</p>
          ${H.table(['Deployment', 'Command', 'Replicas'], [['api', 'gunicorn app.main:app -c gunicorn.conf.py', '3–30 (autoscaled on CPU / latency)'], ['worker-default', 'celery -A app.worker worker -Q default', '2–20 (autoscaled on queue depth)'], ['worker-reports', 'celery -A app.worker worker -Q reports -c 2', '1–4'], ['beat', 'celery -A app.worker beat', H.c('y', 'exactly 1')], ['migrate (Job)', 'alembic upgrade head', 'once per release']])}`
      },
      {
        title: 'Build secrets for a private package index',
        html: `<p>You need a token to install from a private index at build time. <code>ARG TOKEN</code> stays visible in <code>docker history</code>. A BuildKit secret mount exists only during that one <code>RUN</code>.</p>`,
        code: { lang: 'bash', code: `# the token comes from your CI secret store, not from the Dockerfile
docker build --secret id=pypi_token,env=PYPI_TOKEN -t orders-api:"$GIT_SHA" .
# in the Dockerfile:
#   RUN --mount=type=secret,id=pypi_token \\
#       UV_INDEX_PRIVATE_PASSWORD="$(cat /run/secrets/pypi_token)" uv sync --locked --no-dev` }
      }
    ],
    deepDive: `<p>🟣 <b>Wheels, manylinux and musl.</b> PyPI ships prebuilt binary wheels tagged <code>manylinux</code> (glibc) and, increasingly, <code>musllinux</code>. On slim (glibc) almost everything installs as a wheel in seconds. On Alpine, packages without musl wheels compile from source, which needs gcc and headers, takes minutes, and can behave differently (musl's DNS resolver and memory allocator). The "tiny Alpine" image often ends up bigger after adding build tools.</p>
      <p><b>Virtualenv paths.</b> A venv hard-codes its absolute path in scripts' shebangs, so it must live at the same path in builder and runtime (<code>/app/.venv</code> or <code>/opt/venv</code>). Copy the whole venv; do not "pip install" again in runtime. <code>UV_COMPILE_BYTECODE=1</code> precompiles <code>.pyc</code> at build so startup is faster and the read-only runtime filesystem is never written.</p>
      <p><b>Reproducibility.</b> Pin the base image by digest (<code>python:3.12-slim@sha256:...</code>) and let a bot (Renovate, Dependabot) bump it, so security patches still arrive. <code>uv sync --locked</code> fails if <code>uv.lock</code> is out of date with <code>pyproject.toml</code>, which catches "forgot to relock" in CI.</p>
      <p><b>Distroless and Chainguard.</b> Distroless or hardened Python images remove the shell and package manager, cutting CVE counts further; the cost is no <code>sh</code> for debugging (use ephemeral debug containers). Make sure the runtime Python version matches the builder's exactly, because compiled extensions are tied to it.</p>
      <p><b>HEALTHCHECK vs Kubernetes probes.</b> Kubernetes ignores the Dockerfile HEALTHCHECK and uses <code>livenessProbe</code>/<code>readinessProbe</code>. Make <code>/health</code> (liveness) cheap and dependency-free; make <code>/ready</code> check the DB and Redis. If liveness checks the database, a DB blip restarts every pod at once.</p>`,
    aiEra: `<p>🤖 Assistants are fluent in Dockerfiles but still produce the classic mistakes: <code>COPY . .</code> before installing, Alpine "to be small", <code>latest</code> tags, root user, shell-form CMD, secrets in <code>ENV</code>. Ask for "multi-stage, slim, uv lockfile, non-root uid 10001, exec-form CMD, BuildKit cache mounts", then verify with <code>docker history</code> and a scanner (Trivy, Grype, Docker Scout).</p>
      <p>ML and LLM images are the new size problem: a CUDA PyTorch image can be 8–10 GB. Keep model weights out of the image (download to a volume or a cache at startup), use CPU-only wheels where possible (<code>--index-url https://download.pytorch.org/whl/cpu</code>), and split the API image from the GPU worker image.</p>`,
    problems: [
      {
        title: 'Shrink a 1.2 GB Image',
        level: 'Medium',
        tags: ['docker', 'image size', 'security'],
        companies: ['Shopify', 'Delivery Hero', 'Grab'],
        statement: `<p>This FastAPI service image is 1.2 GB, rebuilds all dependencies on every commit, runs as root and takes 10 s to stop. Rewrite it.</p><pre>FROM python:3.12
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt pytest mypy
ENV DATABASE_URL=postgresql://admin:Sup3rS3cret@db/prod
CMD uvicorn app.main:app --host 0.0.0.0</pre>`,
        constraints: `<p>Needs <code>psycopg</code> built against libpq. Must run on Kubernetes with a read-only root filesystem. The credentials must not stay in the image.</p>`,
        example: `<p>Target: ≈ 150–250 MB, dependency layer cached across code changes, uid 10001, SIGTERM reaches the server, no secret in any layer (${H.c('r', 'that password is already leaked')}: rotate it now, removing it from the Dockerfile does not remove it from old images).</p>`,
        brute: {
          why: `<p>"Add <code>RUN rm -rf /root/.cache</code> at the end" does nothing for size: the files still exist in the earlier layer. Deleting the <code>ENV</code> line in a new commit does not un-leak a password already pushed to a registry.</p>`,
          code: { lang: 'text', check: false, code: `FROM python:3.12
COPY . .
RUN pip install -r requirements.txt
RUN rm -rf /root/.cache          # too late: still in the previous layer` }
        },
        mcq: {
          q: 'Which change alone saves the most space here?',
          options: ['Switching the base to <code>python:3.12-slim</code> (with a builder stage for compilers)', 'Adding <code>PYTHONDONTWRITEBYTECODE=1</code>', 'Using exec-form CMD', 'Adding a HEALTHCHECK'],
          answer: 0,
          explain: 'The full image carries ~600 MB of compilers, headers and tools. The others matter for correctness, not size.'
        },
        hints: [
          'Hint 1: list each problem separately: base image, layer order, dev tools, pip cache, secret, user, CMD form.',
          'Hint 2: a builder stage can have gcc and libpq-dev; the runtime stage needs only libpq5 and the venv.',
          'Hint 3: secrets come from the environment at runtime (Kubernetes Secret → env var), never from the image; rotate the leaked one.'
        ],
        solution: {
          approach: `<p>Fix each problem with its own tool. <b>Size:</b> slim base, multi-stage (compilers only in the builder), <code>--no-cache-dir</code>, no pytest/mypy, <code>.dockerignore</code>. <b>Speed:</b> copy only the lockfile before installing so the dependency layer is cached. <b>Security:</b> remove the <code>ENV</code> secret and rotate the password (it lives forever in old layers and registries); inject <code>DATABASE_URL</code> from a Kubernetes Secret; run as uid 10001; a read-only root filesystem works because nothing writes at runtime (bytecode is compiled at build). <b>Shutdown:</b> exec-form CMD so the server is PID 1 and handles SIGTERM.</p>`,
          code: { lang: 'text', check: false, code: `FROM python:3.12-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev \\
 && rm -rf /var/lib/apt/lists/*
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir --require-hashes -r requirements.txt \\
 && python -m compileall -q /opt/venv

FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 \\
 && rm -rf /var/lib/apt/lists/* \\
 && useradd --system --uid 10001 app
COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY --chown=app:app app/ ./app/
RUN python -m compileall -q /app/app
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
# DATABASE_URL is provided at runtime by the orchestrator (e.g. a Kubernetes Secret)` },
          complexity: `<p>Build time drops from minutes to seconds for code-only changes (dependency layer cached); image ≈ 150–250 MB instead of 1.2 GB.</p>`,
          followUps: ['How would you prove no secret is left in any layer?', 'What changes for a GPU worker image?']
        },
        tests: { skip: 'infrastructure wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Gunicorn / Uvicorn workers and the production process model
     ===================================================================== */
  topics.push({
    title: 'Running Python in Production: Gunicorn + Uvicorn Workers, Worker Counts, Timeouts and Graceful Shutdown',
    analogy: `<p>A call centre: the <b>manager</b> (Gunicorn master) does not answer phones; it hires agents (workers), replaces any who faint, and at closing time says "finish your current call, then go home". How many agents? Enough to use every desk (CPU core), but not more than the room can hold (memory). An <b>async</b> agent can keep 100 callers on hold and switch between them; a <b>sync</b> agent handles one caller at a time.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> One Python process runs Python code on one core at a time (the GIL). To use a 4-core machine you run <b>several worker processes</b>, each with its own copy of the app, behind one listening socket.</p>
      ${H.table(['Command', 'What you get'], [
        ['<code>uvicorn app.main:app --workers 4</code>', 'Uvicorn\'s own supervisor starts 4 worker processes; recent versions also restart a worker that dies'],
        ['<code>gunicorn app.main:app -k uvicorn_worker.UvicornWorker -w 4</code>', 'Gunicorn master (mature process management: timeouts, <code>max_requests</code>, hooks, graceful reload with HUP) running Uvicorn\'s ASGI worker. <code>uvicorn.workers.UvicornWorker</code> is the older, deprecated path; the class moved to the <code>uvicorn-worker</code> package'],
        ['<code>fastapi run --workers 4</code>', 'A thin wrapper around Uvicorn with the same behaviour'],
        ['Kubernetes: 1 process per pod', '<code>uvicorn app.main:app</code> with no workers flag; the cluster runs N pods and restarts dead ones']
      ])}
      <p><b>How many workers?</b></p>
      <ul>
        <li><b>Sync workers</b> (Flask/Django with Gunicorn's default <code>sync</code> class) handle one request at a time and wait on I/O, so the classic rule is <code>2 × cores + 1</code>: while some wait on the DB, others use the CPU.</li>
        <li><b>Async workers</b> (Uvicorn) overlap I/O inside one process, so start at <b>1 per core</b>. More only adds context switching; fewer leaves cores idle.</li>
        <li><b>Memory caps everything:</b> each worker loads the whole app (150–500 MB, much more with ML models). Workers ≤ (container memory − headroom) ÷ worker RSS.</li>
        <li><b>Use the container's limit, not the host's.</b> <code>os.cpu_count()</code> returns the host's cores (64!) inside a container limited to 2 CPUs. Read the cgroup quota or pass the number explicitly.</li>
        <li><b>The database is a shared budget:</b> workers × pool size × pods must fit <code>max_connections</code> (Python Backend II).</li>
      </ul>
      <p><b>The settings that prevent outages:</b> <code>timeout</code> (kill a worker stuck longer than N s), <code>graceful_timeout</code> (time to finish in-flight requests after SIGTERM), <code>keepalive</code> slightly <b>longer</b> than the load balancer's idle timeout (so the app never closes a connection the LB is about to reuse, which shows up as random 502s; e.g. LB 60 s → keep-alive 65 s), <code>max_requests</code> + <code>max_requests_jitter</code> (recycle workers to contain memory leaks without restarting all at once), and <code>forwarded_allow_ips</code>/<code>--proxy-headers</code> so client IP and https scheme are correct behind a proxy.</p>`,
    clues: [
      '"How many Gunicorn workers for 4 cores?" → sync: 2×4+1 = 9; Uvicorn/async: ~4; then cap by memory',
      '"Gunicorn or uvicorn --workers?" → both fine; Gunicorn for mature process management on VMs; in Kubernetes often one Uvicorn process per pod',
      '"WORKER TIMEOUT in the logs" → a request (or a blocking call on the event loop) ran longer than <code>timeout</code>; fix the blocking code before raising the timeout',
      '"Requests fail during every deploy" → no graceful shutdown: shell-form CMD, short grace period, or readiness not failing first',
      '"Memory grows until OOM over a day" → leak; <code>max_requests</code> with jitter as a guard, then find it',
      '"Random 502s from the load balancer" → keep-alive timeout of the app shorter than the LB idle timeout'
    ],
    code: [
      {
        lang: 'python', title: 'gunicorn.conf.py — a production config (it is plain Python)',
        code: `# gunicorn.conf.py   run with:  gunicorn app.main:app -c gunicorn.conf.py
# pip install gunicorn uvicorn-worker
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
worker_class = "uvicorn_worker.UvicornWorker"     # ASGI workers for FastAPI
# Explicit is better than guessing: set WEB_CONCURRENCY from your container's CPU limit.
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))

timeout = 60                 # kill a worker that does not respond for 60 s
graceful_timeout = 30        # after SIGTERM: finish in-flight requests for up to 30 s
keepalive = 65               # longer than the load balancer's 60 s idle timeout
max_requests = 2000          # recycle a worker after N requests (memory-leak guard)
max_requests_jitter = 200    # ... but not all workers at the same moment
forwarded_allow_ips = os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1")
accesslog = "-"              # stdout; structured app logs go to stdout too
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info")
preload_app = False          # True saves memory via fork, but every pool must then be created after fork


def post_fork(server, worker):
    # good place to (re)initialise per-process clients, e.g. OpenTelemetry exporters
    server.log.info("worker %s started", worker.pid)


def child_exit(server, worker):
    # prometheus_client multiprocess mode: clean up the dead worker's metric files
    if os.environ.get("PROMETHEUS_MULTIPROC_DIR"):
        from prometheus_client import multiprocess
        multiprocess.mark_process_dead(worker.pid)`
      },
      {
        lang: 'python', run: true, title: 'Runnable: worker count from the container\'s real CPU and memory limits (stdlib only)',
        code: `# How many web workers fit this container? Reads the cgroup CPU limit when there is one.
import os


def cgroup_cpus():
    """cgroup v2 'cpu.max' looks like '200000 100000' (quota, period) or 'max 100000'."""
    try:
        with open("/sys/fs/cgroup/cpu.max") as f:
            quota, period = f.read().split()
        if quota != "max":
            return max(1, int(quota) // int(period))
    except (OSError, ValueError):
        pass
    return None


def cgroup_memory_mb():
    try:
        with open("/sys/fs/cgroup/memory.max") as f:
            raw = f.read().strip()
        if raw != "max":
            return int(raw) // (1024 * 1024)
    except (OSError, ValueError):
        pass
    return None


def plan(cpus, mem_mb, worker_mb, reserve_mb, kind):
    by_cpu = 2 * cpus + 1 if kind == "sync" else cpus
    by_mem = (mem_mb - reserve_mb) // worker_mb
    n = min(by_cpu, by_mem)
    return n if n >= 1 else 0, by_cpu, by_mem


host = os.cpu_count() or 1
limit = cgroup_cpus()
cpus = limit or host
mem = cgroup_memory_mb() or 4096
print("os.cpu_count() =", host, "| cgroup CPU limit =", limit, "| using", cpus, "CPU(s),", mem, "MB")
for kind, worker_mb in [("sync", 180), ("async", 350)]:
    n, by_cpu, by_mem = plan(cpus, mem, worker_mb, reserve_mb=512, kind=kind)
    print("%-5s workers: by CPU %d, by memory %d -> use %d" % (kind, by_cpu, by_mem, n))
print("example: 4 CPUs, 2048 MB, 300 MB/worker, sync ->", plan(4, 2048, 300, 512, "sync")[0])`
      },
      {
        lang: 'bash', title: 'Typical commands',
        code: `# development
fastapi dev app/main.py
# a VM or a big container: Gunicorn manages Uvicorn workers
WEB_CONCURRENCY=4 gunicorn app.main:app -c gunicorn.conf.py
# Uvicorn's own multi-process mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --proxy-headers --timeout-graceful-shutdown 30
# Kubernetes: one process per container, scale with replicas
uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
# zero-downtime reload of code on a VM: new workers start, old ones finish and exit
kill -HUP "$(cat /run/gunicorn.pid)"`
      }
    ],
    codeTitle: ['gunicorn.conf.py', 'Runnable sizing', 'Commands'],
    viz: {
      title: 'Sizing workers for one container',
      input: 'cpus=4 mem_mb=4096 worker_mb=350 reserve_mb=512 kind=async',
      inputLabel: 'cpus=1..32 (the container LIMIT), mem_mb, worker_mb (RSS of one worker), reserve_mb, kind=sync|async',
      gen: function (input) {
        var o = kvParse(input, 'cpus=4 mem_mb=4096 worker_mb=350 reserve_mb=512 kind=async');
        var cpus = Math.round(num(o, 'cpus', 4, 1, 32, 'cpus=4')), mem = Math.round(num(o, 'mem_mb', 4096, 128, 262144, 'mem_mb=4096'));
        var wmb = Math.round(num(o, 'worker_mb', 350, 20, 32768, 'worker_mb=350')), res = Math.round(num(o, 'reserve_mb', 512, 0, 65536, 'reserve_mb=512'));
        var kind = (o.kind || 'async').toLowerCase();
        if (kind !== 'sync' && kind !== 'async') throw new Error('kind must be sync or async');
        var byCpu = kind === 'sync' ? 2 * cpus + 1 : cpus, byMem = Math.floor((mem - res) / wmb), n = Math.min(byCpu, byMem);
        if (n < 1) n = 0;
        var frames = [];
        frames.push({ narr: 'Start from the container\'s <b>limits</b>: ' + cpus + ' CPU(s) and ' + mem + ' MB. Not <code>os.cpu_count()</code> of the host, which may say 64.', parts: [{ type: 'vars', label: 'Inputs', vals: { cpus: cpus, mem_mb: mem, worker_mb: wmb, reserve_mb: res, kind: kind } }] });
        frames.push({ narr: kind === 'sync' ? 'Sync workers block on I/O, so oversubscribe the CPU: 2 × ' + cpus + ' + 1 = <b>' + byCpu + '</b>.' : 'Async (Uvicorn) workers overlap I/O inside each process, so one per core: <b>' + byCpu + '</b>. More processes would just compete for the same cores.', parts: [{ type: 'bars', label: 'Limit by CPU', values: [byCpu], idxLabels: ['by_cpu'], texts: [String(byCpu)] }] });
        frames.push({ narr: 'Memory: (' + mem + ' − ' + res + ' headroom) ÷ ' + wmb + ' MB per worker = <b>' + byMem + '</b>. Headroom covers the master process, page cache and spikes; an OOM kill takes all in-flight requests with it.', parts: [{ type: 'bars', label: 'Limit by CPU vs memory', values: [byCpu, Math.max(0, byMem)], idxLabels: ['by_cpu', 'by_mem'], texts: [String(byCpu), String(byMem)], hl: byMem < byCpu ? { 1: 'bad' } : { 0: 'cur' } }] });
        var rows = [], r, c, per = 4, cells = Math.max(n, 1);
        for (r = 0; r < Math.ceil(cells / per); r++) { var row = []; for (c = 0; c < per; c++) { var k = r * per + c; row.push(k < n ? 'w' + (k + 1) : ''); } rows.push(row); }
        frames.push({ narr: n ? 'Answer: <b>' + n + '</b> workers (the smaller limit wins). ' + (byMem < byCpu ? 'Memory is the bottleneck: make workers lighter (lazy-load big models, fewer imports) or give the pod more memory.' : 'CPU is the bottleneck, which is the healthy case.') : H.c('r', 'Not even one worker fits.') + ' Give the container more memory or shrink the app.', parts: [{ type: 'grid', label: 'Worker processes in this container', rows: rows, hl: (function () { var h = {}; for (var k = 0; k < n; k++) h[Math.floor(k / per) + ',' + (k % per)] = 'ok'; return h; })() }, { type: 'vars', label: 'Result', vals: { workers: n, bottleneck: byMem < byCpu ? 'memory' : 'cpu' }, hl: { workers: n ? 'ok' : 'bad' } }] });
        frames.push({ narr: 'Last check, the database: if each worker has a pool of 5 + 5 overflow and you run 10 pods, that is ' + (n * 10 * 10) + ' possible connections. Make sure Postgres (or PgBouncer) can take it. Then load-test: the formula is a starting point, the p99 latency graph is the judge.', parts: [{ type: 'vars', label: 'Fleet check', vals: { pods: 10, workers_per_pod: n, max_db_connections_needed: n * 10 * 10 } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Graceful shutdown, second by second',
        html: `${H.table(['t', 'Kubernetes', 'App'], [
          ['0 s', 'pod marked Terminating; removed from Service endpoints (takes a few seconds to propagate)', 'still receiving some requests'],
          ['0 s', 'runs <code>preStop</code> hook (e.g. <code>sleep 5</code>)', 'keeps serving while load balancers catch up'],
          ['5 s', 'sends SIGTERM to PID 1', 'Gunicorn stops accepting; workers finish in-flight requests (<code>graceful_timeout</code>)'],
          ['≤ 35 s', '-', 'lifespan shutdown: close DB pool, Redis, flush logs/metrics'],
          ['30 s after Terminating', 'SIGKILL if still running (<code>terminationGracePeriodSeconds</code>)', H.c('r', 'anything unfinished dies')]
        ])}<p>Make <code>terminationGracePeriodSeconds</code> ≥ preStop + graceful_timeout + a margin. For Celery workers, set it longer than your longest task or rely on <code>acks_late</code> redelivery.</p>`
      },
      {
        title: 'WORKER TIMEOUT that was really a blocking call',
        html: `<p>Logs: <code>[CRITICAL] WORKER TIMEOUT (pid:41)</code> every few minutes. The team raised <code>timeout</code> to 300. The real cause: an <code>async def</code> route calling <code>requests.get()</code> to a slow partner API. That froze the event loop, so the worker could not even answer Gunicorn's heartbeat. Fix: use <code>httpx.AsyncClient</code> with a 5 s timeout (or <code>def</code> route), and keep <code>timeout</code> at 60 as a safety net.</p>`
      },
      {
        title: 'Workers in a pod vs more pods',
        html: `${H.table(['', '4 workers × 3 pods', '1 worker × 12 pods'], [
          ['Memory', 'shared libs once per pod; preload can share pages', 'every pod pays the full Python + app overhead'],
          ['Failure blast radius', 'one pod loss = 33 % capacity', 'one pod loss = 8 %'],
          ['Autoscaling granularity', 'coarse', 'fine'],
          ['Who restarts dead workers', 'Gunicorn / Uvicorn supervisor', 'Kubernetes'],
          ['Metrics', 'needs multiprocess mode for prometheus_client', 'one process = simple']
        ])}<p>Both are valid; on Kubernetes, "one process per pod with 1–2 CPUs" is the common default because it keeps metrics and scaling simple.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>The pre-fork model.</b> The Gunicorn master opens the listening socket, then forks workers that all <code>accept()</code> on it; the kernel spreads connections between them. The master never touches requests: it monitors heartbeats (a temp file each worker updates), kills workers that miss <code>timeout</code>, and handles signals: <b>HUP</b> = start new workers with new code then stop old ones, <b>TERM</b> = graceful stop, <b>INT/QUIT</b> = fast stop, <b>TTIN/TTOU</b> = one more/less worker.</p>
      <p><b>preload_app.</b> With <code>--preload</code> the master imports the app once and workers share those memory pages copy-on-write, saving RAM and catching import errors before forking. The price: anything opened at import (DB engine connections, Redis clients, threads, gRPC channels) is now shared by forked children, which corrupts connections. Create such resources in <code>lifespan</code> (it runs in each worker) or in <code>post_fork</code>. Also, <code>HUP</code> reloads cannot pick up new code with preload.</p>
      <p><b>Threads.</b> Gunicorn's <code>gthread</code> worker gives sync apps (Django, Flask) concurrency inside a process: workers × threads concurrent requests. For FastAPI, the threadpool for <code>def</code> routes (40 threads by default) plays that role inside each Uvicorn worker.</p>
      <p><b>Free-threaded Python.</b> Python 3.13 added an optional no-GIL build, and 3.14 made it officially supported. In theory one process could use all cores; in 2026 most production web stacks still use processes, because many C extensions are only just becoming thread-safe and single-thread speed is slightly lower on free-threaded builds.</p>
      <p><b>Production reality.</b> Watch per-worker RSS, restarts (<code>max_requests</code> recycles should look regular; OOM kills should be zero), the event-loop lag of async workers, and the 502/504 rate at the load balancer during deploys. A deploy that causes any 5xx means the shutdown sequence is wrong.</p>`,
    aiEra: `<p>🤖 Ask "how many Gunicorn workers" and you will often get <code>multiprocessing.cpu_count() * 2 + 1</code> pasted into a config that then runs in a 1-CPU container on a 64-core node: 129 workers, instant OOM. Always size from the container limit, cap by memory, and set the value explicitly through an environment variable that your deployment controls.</p>
      <p>AI services change the memory math: a worker that loads a 1.5 GB embedding model makes "workers by CPU" meaningless. The usual 2026 pattern is a thin API process (many workers, small RSS) that calls a separate model server (vLLM, TGI, Triton, or a hosted API) that owns the GPU and batches requests.</p>`,
    problems: [
      {
        title: 'Size Gunicorn Workers for a Container',
        level: 'Easy',
        tags: ['gunicorn', 'capacity', 'workers'],
        companies: ['Heroku', 'Zomato', 'Canva'],
        statement: `<p>Write <code>web_workers(cpus, mem_mb, worker_mb, reserve_mb, kind)</code>:</p>
          <ul><li>by CPU: <code>2 × cpus + 1</code> if <code>kind == "sync"</code>, else <code>cpus</code> (for <code>"async"</code> Uvicorn workers);</li>
          <li>by memory: <code>(mem_mb − reserve_mb) // worker_mb</code>;</li>
          <li>answer: the smaller of the two, or <code>0</code> if that is below 1 (the container cannot run even one worker).</li></ul>`,
        constraints: `<p>1 ≤ cpus ≤ 256; 0 ≤ reserve_mb ≤ mem_mb ≤ 10<sup>6</sup>; 1 ≤ worker_mb ≤ 10<sup>5</sup>; kind is "sync" or "async".</p>`,
        example: `<p>4 CPUs, 2,048 MB, 300 MB per worker, 512 MB reserve, sync: by CPU 9, by memory 1536 // 300 = ${H.c('r', '5')} → answer <b>5</b>. Memory, not CPU, is the limit.</p>`,
        brute: {
          why: `<p><code>multiprocessing.cpu_count() * 2 + 1</code> ignores the container's CPU limit (it reads the host) and ignores memory entirely, which is how a 1-CPU pod ends up with 129 workers and gets OOM-killed.</p>`,
          code: `import multiprocessing


def web_workers(cpus, mem_mb, worker_mb, reserve_mb, kind):
    return multiprocessing.cpu_count() * 2 + 1     # host cores, no memory check`
        },
        mcq: {
          q: 'An 8-CPU container runs FastAPI with Uvicorn workers, each 400 MB, with 16 GB of memory. Best starting worker count?',
          options: ['8', '17', '40', '1'],
          answer: 0,
          explain: 'Async workers: about one per core = 8. Memory allows ~39, so CPU is the limit. 17 is the sync-worker rule.'
        },
        hints: [
          'Hint 1: compute both limits separately, then take the minimum.',
          'Hint 2: integer division for memory: you cannot run 5.12 workers.',
          'Hint 3: if the minimum is 0 or negative (reserve larger than memory left for workers), return 0.'
        ],
        solution: {
          approach: `<p>The worker count is bounded by two independent resources. CPU decides how many processes can usefully run (sync workers oversubscribe because they wait on I/O; async workers do not need to). Memory decides how many fit without an OOM kill. The smaller bound wins. Returning 0 makes "this container is too small" explicit instead of silently starting one worker that will be killed.</p>`,
          code: { lang: 'python', run: true, code: `def web_workers(cpus: int, mem_mb: int, worker_mb: int, reserve_mb: int, kind: str) -> int:
    by_cpu = 2 * cpus + 1 if kind == "sync" else cpus
    by_mem = (mem_mb - reserve_mb) // worker_mb
    n = min(by_cpu, by_mem)
    return n if n >= 1 else 0


print(web_workers(4, 8192, 300, 512, "sync"))    # 9  (CPU-bound)
print(web_workers(4, 2048, 300, 512, "sync"))    # 5  (memory-bound)
print(web_workers(4, 8192, 300, 512, "async"))   # 4` },
          complexity: `<p>O(1) time and space.</p>`,
          followUps: ['How do you read the CPU limit inside a container?', 'How does the DB connection budget cap this further?']
        },
        tests: { fn: 'web_workers', sig: 'int int int int string -> int', cases: [
          [[4, 8192, 300, 512, 'sync'], 9],
          [[4, 2048, 300, 512, 'sync'], 5],
          [[4, 8192, 300, 512, 'async'], 4],
          [[1, 1024, 250, 256, 'async'], 1],
          [[2, 512, 400, 256, 'sync'], 0],
          [[16, 4096, 200, 0, 'async'], 16],
          [[16, 4096, 300, 1096, 'sync'], 10],
          [[3, 1000, 100, 0, 'sync'], 7]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 8 — Structured logging, metrics and tracing for Python services
     ===================================================================== */
  topics.push({
    title: 'Observability in Python: JSON Logs with Request IDs, Prometheus Metrics and OpenTelemetry',
    analogy: `<p>A delivery company tracks parcels three ways. Every scan writes a line in a logbook with the <b>parcel number</b> (structured logs with a request id). A wall board shows totals: parcels per hour, how many were late (metrics). And for one lost parcel, you can replay its whole journey depot by depot (a trace). Without the parcel number on every line, the logbook is just noise.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> Backend 16 explains <i>why</i>: RED/USE methods, percentiles, alerting, tracing concepts. Here is the Python wiring for a FastAPI service and its Celery workers.</p>
      <p><b>1. Structured logs.</b> Log <b>JSON objects</b>, one per line, to stdout; the platform (Loki, Elasticsearch, CloudWatch, Datadog) parses them. Every line carries the same core fields: time, level, logger, message, <code>request_id</code>, plus event fields (<code>order_id</code>, <code>duration_ms</code>). The request id comes from the incoming <code>X-Request-ID</code> header or is generated by a middleware, and is stored in a <b><code>contextvars.ContextVar</code></b>. Context variables are per-task in asyncio and per-thread in threads, so concurrent requests never mix their ids. A <code>logging.Filter</code> copies it onto every record. Libraries: the standard <code>logging</code> module plus a JSON formatter (<code>python-json-logger</code>), or <b>structlog</b> (<code>structlog.contextvars.bind_contextvars(request_id=...)</code>).</p>
      <p><b>2. Metrics.</b> <code>prometheus_client</code> gives <code>Counter</code> (only goes up: requests, errors, jobs processed), <code>Gauge</code> (up and down: queue depth, in-flight requests), and <code>Histogram</code> (durations in buckets, from which Prometheus computes p95/p99). Expose them at <code>/metrics</code> for Prometheus to scrape. Labels must have <b>low cardinality</b>: method, route <i>template</i> (<code>/orders/{id}</code>), status class. Never user ids, raw URLs or error messages.</p>
      <p><b>3. Traces.</b> OpenTelemetry (OTel) instruments FastAPI, httpx, SQLAlchemy, Redis and Celery automatically and propagates the trace context across services and <b>through the queue</b> (in the task message headers), so one trace shows API → Redis → Celery task → payment API. Put the <code>trace_id</code> in your log lines to jump from a log to its trace.</p>
      ${H.table(['Signal', 'Answers', 'Python tool', 'Cost driver'], [
        ['Logs', 'What exactly happened to request X?', 'logging + JSON formatter / structlog', 'volume (GB/day)'],
        ['Metrics', 'How many, how fast, how often failing?', 'prometheus_client / OTel metrics', 'number of label combinations (series)'],
        ['Traces', 'Where did the time go across services?', 'opentelemetry-instrument', 'span count; use sampling']
      ])}`,
    clues: [
      '"Correlate all log lines of one request" → request-id middleware + <code>ContextVar</code> + logging filter (or structlog contextvars)',
      '"Logs from concurrent async requests get mixed up" → thread-locals do not work for asyncio; use <code>contextvars</code>',
      '"Expose metrics for Prometheus from FastAPI" → <code>prometheus_client</code> Counter/Histogram + <code>make_asgi_app()</code> at <code>/metrics</code>',
      '"Metrics jump around / reset with Gunicorn workers" → each worker has its own registry; use <code>PROMETHEUS_MULTIPROC_DIR</code> multiprocess mode',
      '"Prometheus memory exploded" → high-cardinality labels (user id, raw path)',
      '"Trace a request through the Celery worker" → OTel Celery instrumentation propagates context via message headers'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'Runnable: JSON logs with a request-id ContextVar across concurrent asyncio tasks (stdlib only)',
        code: `# Structured JSON logs with the standard library, plus a request id carried by a contextvar.
import asyncio
import contextvars
import json
import logging
import sys
import time
import uuid

request_id = contextvars.ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id.get()     # copy the current request's id onto every record
        return True


class JsonFormatter(logging.Formatter):
    SKIP = set(vars(logging.makeLogRecord({}))) | {"message", "request_id"}

    def format(self, record):
        doc = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)) + "Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": record.request_id,
        }
        for k, v in vars(record).items():       # anything passed with extra={...}
            if k not in self.SKIP:
                doc[k] = v
        if record.exc_info:
            doc["exc"] = self.formatException(record.exc_info)
        return json.dumps(doc, default=str)


handler = logging.StreamHandler(sys.stdout)
handler.addFilter(RequestIdFilter())
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
log = logging.getLogger("orders")


async def charge(order_id):
    await asyncio.sleep(0.01)                    # other requests run while we wait
    log.info("charged card", extra={"order_id": order_id, "amount_cents": 1999})


async def handle_request(order_id):
    # Middleware would do this: take X-Request-ID from the client or make a new one.
    token = request_id.set(uuid.uuid4().hex[:8])
    try:
        log.info("request started", extra={"path": "/orders/%d/pay" % order_id})
        await charge(order_id)
        if order_id == 3:
            raise ValueError("card expired")
    except ValueError:
        log.exception("payment failed", extra={"order_id": order_id})
    finally:
        request_id.reset(token)


async def main():
    # Three requests interleave on one event loop, yet every line keeps ITS request id,
    # because each asyncio task gets its own copy of the context.
    await asyncio.gather(*(handle_request(i) for i in (1, 2, 3)))
    log.info("outside any request")


asyncio.run(main())`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a Prometheus counter and histogram, and the /metrics text format, by hand (stdlib only)',
        code: `# A Prometheus-style Counter and Histogram, and the text format /metrics returns, built by hand.
import bisect
import threading


def fmt_labels(names, values, extra=()):
    pairs = list(zip(names, values)) + list(extra)
    if not pairs:
        return ""
    return "{" + ",".join('%s="%s"' % (k, v) for k, v in pairs) + "}"


class Counter:
    def __init__(self, name, doc, labelnames=()):
        self.name, self.doc, self.labelnames = name, doc, tuple(labelnames)
        self.values, self.lock = {}, threading.Lock()

    def inc(self, *labels, amount=1):
        if amount < 0:
            raise ValueError("counters only go up")    # use a Gauge for things that go down
        with self.lock:
            self.values[labels] = self.values.get(labels, 0) + amount

    def expose(self):
        out = ["# HELP %s %s" % (self.name, self.doc), "# TYPE %s counter" % self.name]
        for labels in sorted(self.values):
            out.append("%s%s %s" % (self.name, fmt_labels(self.labelnames, labels), self.values[labels]))
        return out


class Histogram:
    def __init__(self, name, doc, buckets):
        self.name, self.doc = name, doc
        self.bounds = sorted(buckets)
        self.counts = [0] * (len(self.bounds) + 1)    # last slot = above every bound (+Inf only)
        self.sum, self.lock = 0.0, threading.Lock()

    def observe(self, seconds):
        with self.lock:
            # first bucket whose upper bound is >= value ("le" means less than or equal)
            self.counts[bisect.bisect_left(self.bounds, seconds)] += 1
            self.sum += seconds

    def expose(self):
        out = ["# HELP %s %s" % (self.name, self.doc), "# TYPE %s histogram" % self.name]
        running = 0
        for bound, c in zip(self.bounds, self.counts):
            running += c                              # buckets are CUMULATIVE
            out.append('%s_bucket{le="%s"} %d' % (self.name, bound, running))
        running += self.counts[-1]
        out.append('%s_bucket{le="+Inf"} %d' % (self.name, running))
        out.append("%s_sum %s" % (self.name, round(self.sum, 6)))
        out.append("%s_count %d" % (self.name, running))
        return out


REQUESTS = Counter("http_requests_total", "HTTP requests.", ["method", "route", "status"])
LATENCY = Histogram("http_request_duration_seconds", "Request latency.", [0.05, 0.1, 0.25, 0.5, 1.0])

# route TEMPLATES, never raw paths: /orders/{id}, not /orders/123 (that would explode cardinality)
traffic = [("GET", "/orders/{id}", 200, 0.031), ("GET", "/orders/{id}", 200, 0.072),
           ("POST", "/orders", 201, 0.180), ("GET", "/orders/{id}", 404, 0.012),
           ("POST", "/orders", 500, 0.950), ("GET", "/orders/{id}", 200, 2.4)]
for method, route, status, secs in traffic:
    REQUESTS.inc(method, route, str(status))
    LATENCY.observe(secs)

for line in REQUESTS.expose() + LATENCY.expose():
    print(line)`
      },
      {
        lang: 'python', title: 'FastAPI: request-id middleware, prometheus_client metrics and /metrics',
        code: `# pip install fastapi prometheus-client
import contextvars
import time
import uuid

from fastapi import FastAPI, Request
from prometheus_client import Counter, Gauge, Histogram, make_asgi_app

request_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

REQUESTS = Counter("http_requests_total", "HTTP requests", ["method", "route", "status"])
LATENCY = Histogram(
    "http_request_duration_seconds", "Request latency", ["method", "route"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5),
)
IN_FLIGHT = Gauge("http_requests_in_flight", "Requests being served")

app = FastAPI()
app.mount("/metrics", make_asgi_app())       # Prometheus scrapes this


@app.middleware("http")
async def observe(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex
    token = request_id.set(rid)
    IN_FLIGHT.inc()
    start = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["X-Request-ID"] = rid
        return response
    finally:
        route = request.scope.get("route")
        template = getattr(route, "path", "unmatched")   # "/orders/{order_id}", never the raw path
        LATENCY.labels(request.method, template).observe(time.perf_counter() - start)
        REQUESTS.labels(request.method, template, str(status)).inc()
        IN_FLIGHT.dec()
        request_id.reset(token)`
      },
      {
        lang: 'bash', title: 'OpenTelemetry auto-instrumentation (no code changes)',
        code: `pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install            # installs instrumentations for the libraries it finds
export OTEL_SERVICE_NAME=orders-api
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317    # placeholder: your collector
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1            # keep 10 % of new traces
export OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true   # adds trace ids to log records
opentelemetry-instrument uvicorn app.main:app --host 0.0.0.0 --port 8000
# the Celery worker gets the same wrapper and becomes part of the same traces:
OTEL_SERVICE_NAME=orders-worker opentelemetry-instrument celery -A app.worker worker --loglevel=INFO`
      }
    ],
    codeTitle: ['Runnable JSON logs', 'Runnable metrics', 'FastAPI metrics', 'OpenTelemetry'],
    viz: {
      title: 'Requests flowing into a counter and a cumulative histogram',
      input: '31 72 180 12 950 2400',
      inputLabel: 'Request durations in ms (up to 12), buckets are 50, 100, 250, 500, 1000 ms and +Inf',
      gen: function (input) {
        var ds = String(input || '').trim().split(/[\s,]+/).filter(Boolean).slice(0, 12).map(Number);
        if (!ds.length || ds.some(function (d) { return !isFinite(d) || d < 0; })) throw new Error('Type durations in ms, e.g. 31 72 180 950');
        var bounds = [50, 100, 250, 500, 1000], counts = [0, 0, 0, 0, 0, 0], sum = 0, frames = [];
        var labels = ['≤50', '≤100', '≤250', '≤500', '≤1000', '+Inf'];
        function cum() { var r = 0; return counts.map(function (c) { r += c; return r; }); }
        frames.push({ narr: 'A histogram is a row of buckets with upper bounds ("le" = less or equal). Prometheus stores them <b>cumulatively</b>: each bucket counts every request at or below its bound.', parts: [{ type: 'bars', label: 'cumulative bucket counts', values: cum(), idxLabels: labels }, { type: 'vars', label: 'Series', vals: { _count: 0, _sum_ms: 0 } }] });
        ds.forEach(function (d, i) {
          var b = 0; while (b < bounds.length && d > bounds[b]) b++;
          counts[b]++; sum += d;
          var hl = {}; for (var j = b; j < 6; j++) hl[j] = j === b ? 'cur' : 'ok';
          frames.push({ narr: 'Request ' + (i + 1) + ' took <b>' + d + ' ms</b>: it lands in bucket <code>le="' + (b < 5 ? bounds[b] / 1000 : '+Inf') + '"</code>, and every larger bucket also goes up by one (that is what cumulative means). <code>_count</code> and <code>_sum</code> grow too.', parts: [{ type: 'bars', label: 'cumulative bucket counts', values: cum(), idxLabels: labels, hl: hl }, { type: 'vars', label: 'Series', vals: { _count: i + 1, _sum_ms: sum } }] });
        });
        var c = cum(), n = ds.length, target = 0.95 * n, k = 0;
        while (k < 6 && c[k] < target) k++;
        frames.push({ narr: 'p95 estimate: 95 % of ' + n + ' = ' + (+target.toFixed(2)) + ' requests. The first bucket reaching that is <b>' + labels[k] + '</b>' + (k === 5 ? ', the +Inf bucket, so the estimate is just "above 1 s". Add a 2.5 s and 5 s bucket if your SLO needs it.' : '. <code>histogram_quantile(0.95, ...)</code> interpolates inside that bucket.') + ' Average = ' + Math.round(sum / n) + ' ms, which hides the slow tail completely.', parts: [{ type: 'bars', label: 'cumulative bucket counts', values: c, idxLabels: labels, hl: (function () { var h = {}; h[k] = 'sel'; return h; })() }, { type: 'vars', label: 'Summary', vals: { count: n, avg_ms: Math.round(sum / n), p95_bucket: labels[k] }, hl: { p95_bucket: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'From an f-string log to a structured event',
        html: `${H.table(['Before', 'After'], [['<code>log.info(f"user {uid} paid {amt} for {oid}")</code>', '<code>log.info("payment captured", extra={"user_id": uid, "amount_cents": amt, "order_id": oid})</code>'], ['Search: regex over text', 'Search: <code>order_id = 42</code>, chart <code>amount_cents</code>'], ['Message changes break dashboards', 'Fields are a stable contract']])}<p>Keep the message constant ("payment captured") and put variables in fields. Never log secrets, tokens, full card numbers or passwords; add a redaction filter as a safety net.</p>`
      },
      {
        title: 'Carry the request id into Celery tasks',
        html: `<p>The worker runs in another process, so the ContextVar does not travel by itself. Send it in the task headers and restore it with Celery signals. (OTel instrumentation does the same for trace context.)</p>`,
        code: { lang: 'python', code: `from celery.signals import before_task_publish, task_postrun, task_prerun

from app.logging import request_id          # the same ContextVar the API uses

_tokens = {}


@before_task_publish.connect
def add_request_id(headers=None, **kwargs):
    headers["request_id"] = request_id.get()


@task_prerun.connect
def restore_request_id(task_id=None, task=None, **kwargs):
    rid = getattr(task.request, "request_id", None) or task_id
    _tokens[task_id] = request_id.set(rid)


@task_postrun.connect
def clear_request_id(task_id=None, **kwargs):
    token = _tokens.pop(task_id, None)
    if token is not None:
        request_id.reset(token)` }
      },
      {
        title: 'Worker metrics that matter',
        html: `${H.table(['Metric', 'Type', 'Alert when'], [
          ['<code>jobs_processed_total{task, outcome}</code>', 'counter', 'failure ratio &gt; 5 % for 10 min'],
          ['<code>job_duration_seconds{task}</code>', 'histogram', 'p95 above the task SLO'],
          ['<code>queue_depth{queue}</code>', 'gauge (exporter reads <code>LLEN</code>)', 'growing for 15 min (workers cannot keep up)'],
          ['<code>oldest_job_age_seconds{queue}</code>', 'gauge', 'older than the business promise (e.g. emails within 5 min)'],
          ['<code>dead_letter_total{task}</code>', 'counter', 'any increase for payment tasks']
        ])}<p>Queue depth alone misleads (10,000 tiny jobs can be fine); the <b>age of the oldest job</b> is what users feel.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>ContextVars, precisely.</b> Each asyncio Task runs in a copy of the context taken when the task is created; <code>set()</code> inside one task is invisible to others. <code>asyncio.to_thread</code> and Starlette's threadpool copy the current context into the worker thread, so sync routes see the same request id. Plain <code>ThreadPoolExecutor.submit</code> does <b>not</b> copy it: wrap the call with <code>contextvars.copy_context().run</code>. Always <code>reset(token)</code> in <code>finally</code>.</p>
      <p><b>prometheus_client with many processes.</b> Each Gunicorn/Uvicorn worker has its own in-memory registry, so a scrape hits one random worker and counters appear to jump backwards. Multiprocess mode fixes this: set <code>PROMETHEUS_MULTIPROC_DIR</code> to an empty directory before start, build a <code>CollectorRegistry</code> with <code>MultiProcessCollector</code> for <code>/metrics</code>, and call <code>multiprocess.mark_process_dead(pid)</code> in Gunicorn's <code>child_exit</code>. Gauges need a <code>multiprocess_mode</code> (e.g. <code>"livesum"</code>). The alternative is one process per container, or pushing OTel metrics to a collector.</p>
      <p><b>Histogram design.</b> Buckets are fixed at creation; choose them around your SLO (if the target is 300 ms, have bounds at 250 and 500). Each bucket × label combination is a time series, so 10 buckets × 50 routes × 3 methods × 5 status classes = 7,500 series per process. OTel and recent Prometheus versions support <b>native/exponential histograms</b> that pick buckets automatically with far fewer series.</p>
      <p><b>Log cost and sampling.</b> At 2,000 req/s, three 500-byte lines per request is about 250 GB/day. Log one access line per request, keep DEBUG off in production, and sample noisy success logs while keeping every error. Traces use head sampling (decide at the start, e.g. 10 %) or tail sampling in the collector (keep all slow or failed traces).</p>
      <p><b>Logging in async code.</b> Handlers that write to a network service block the event loop. Log to stdout and let the platform ship it, or use <code>QueueHandler</code> + <code>QueueListener</code> so the slow I/O happens on a background thread.</p>`,
    aiEra: `<p>🤖 Two shifts matter. First, OpenTelemetry won: in 2026 most vendors ingest OTLP, so instrument once with OTel and switch backends by config. Assistants can generate collector configs and dashboards from your metric names. Second, LLM calls need their own telemetry: tokens in/out, model, latency to first token, cost, and cache hits, following OTel's GenAI semantic conventions.</p>
      <p>Be careful with logs as AI input: logs often contain personal data, and pasting them into an assistant can leak it. Redact at the source (a logging filter), and prefer giving assistants structured, aggregated queries (error counts by route) over raw log dumps.</p>`,
    problems: [
      {
        title: 'Fill the Histogram Buckets',
        level: 'Easy',
        tags: ['metrics', 'prometheus', 'histogram'],
        companies: ['Grafana Labs', 'Datadog', 'Cloudflare'],
        statement: `<p>Write <code>bucket_counts(bounds_ms, durations_ms)</code> returning the <b>cumulative</b> Prometheus bucket counts: for each upper bound in <b>ascending</b> order, how many durations are <code>≤</code> that bound; then a final <code>+Inf</code> count (all durations). <code>bounds_ms</code> may arrive unsorted.</p>`,
        constraints: `<p>0 ≤ len(bounds) ≤ 30; 0 ≤ len(durations) ≤ 10<sup>5</sup>; values are non-negative integers. Output length = len(bounds) + 1.</p>`,
        example: `<p>bounds <code>[50, 100, 250, 500, 1000]</code>, durations <code>[31, 72, 180, 12, 950, 2400]</code> → <code>[2, 3, 4, 4, 5, 6]</code>. 31 and 12 are ≤ 50; 72 adds to ≤ 100; 180 to ≤ 250; nothing new up to 500; 950 to ≤ 1000; 2400 only in +Inf.</p>`,
        brute: {
          why: `<p>Counting each bucket separately with a full scan is O(buckets × n). Fine for 6 values, wasteful for 10<sup>5</sup> durations × 30 buckets; and storing non-cumulative counts breaks <code>histogram_quantile</code>.</p>`,
          code: `def bucket_counts(bounds_ms, durations_ms):
    out = [sum(1 for d in durations_ms if d <= b) for b in sorted(bounds_ms)]
    return out + [len(durations_ms)]`
        },
        mcq: {
          q: 'A request takes exactly 100 ms. Which buckets does it increase with bounds 50, 100, 250?',
          options: ['le="100", le="250" and le="+Inf"', 'only le="100"', 'only le="250"', 'le="50" and up'],
          answer: 0,
          explain: '"le" means less than or equal, and buckets are cumulative, so it counts in its own bucket and every larger one.'
        },
        hints: [
          'Hint 1: sort the bounds first, because the output must follow ascending bounds.',
          'Hint 2: find each duration\'s first bucket with <code>bisect.bisect_left(bounds, d)</code> (value equal to a bound belongs to that bound), and count per slot.',
          'Hint 3: a running sum over the per-slot counts gives the cumulative answer; the last slot is +Inf.'
        ],
        solution: {
          approach: `<p>This is what <code>Histogram.observe</code> does internally: binary-search the first bound that is ≥ the value (<code>bisect_left</code>, so equal values belong to that bucket), increment that slot, and at exposition time turn the per-slot counts into running totals. The extra slot at the end is the +Inf bucket, whose cumulative value equals <code>_count</code>.</p>`,
          code: { lang: 'python', run: true, code: `import bisect


def bucket_counts(bounds_ms: list[int], durations_ms: list[int]) -> list[int]:
    bounds = sorted(bounds_ms)
    slots = [0] * (len(bounds) + 1)                 # last slot: above every bound
    for d in durations_ms:
        slots[bisect.bisect_left(bounds, d)] += 1   # first bound >= d
    out, running = [], 0
    for c in slots:
        running += c                                # cumulative, like Prometheus
        out.append(running)
    return out


print(bucket_counts([50, 100, 250, 500, 1000], [31, 72, 180, 12, 950, 2400]))   # [2, 3, 4, 4, 5, 6]` },
          complexity: `<p>O(b log b + n log b) time, O(b) space for b bounds and n durations.</p>`,
          followUps: ['Estimate p95 from these counts with linear interpolation.', 'Why can you add histograms from two workers but not two p95 values?']
        },
        tests: { fn: 'bucket_counts', sig: 'int[] int[] -> int[]', cases: [
          [[[50, 100, 250, 500, 1000], [31, 72, 180, 12, 950, 2400]], [2, 3, 4, 4, 5, 6]],
          [[[100], []], [0, 0]],
          [[[100, 200], [100, 200, 201]], [1, 2, 3]],
          [[[10, 20, 30], [5, 5, 5]], [3, 3, 3, 3]],
          [[[1, 2], [3, 4]], [0, 0, 2]],
          [[[], [7, 8]], [2]],
          [[[250, 50, 100], [60]], [0, 1, 1, 1]]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 9 — Django overview and when to choose it
     ===================================================================== */
  topics.push({
    title: 'Django and DRF in One Hour: How It Compares to FastAPI and When to Choose It',
    analogy: `<p>FastAPI is a well-equipped <b>workshop</b>: excellent tools, and you choose the wood, the glue and the layout yourself. Django is a <b>furnished house</b>: kitchen (ORM), front door with locks (auth), a living room for guests (admin), wiring already done (migrations, forms, sessions). You can move in on day one, but rearranging the walls takes more effort.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> Django (current releases: 5.2 LTS and the 6.x line) is the "batteries included" Python web framework. Django REST Framework (DRF) adds serializers, viewsets, routers, permissions and a browsable API on top. Everything you learned in Python Backend I–V exists in Django too, under different names:</p>
      ${H.table(['Concern', 'FastAPI stack (this route)', 'Django / DRF'], [
        ['Routing and handlers', '<code>@app.get</code>, <code>APIRouter</code>', '<code>urls.py</code> + views / DRF <code>ViewSet</code> + <code>DefaultRouter</code>'],
        ['Validation and schemas', 'Pydantic models', 'DRF <code>Serializer</code> / <code>ModelSerializer</code> (Django Ninja uses Pydantic)'],
        ['ORM and migrations', 'SQLAlchemy 2.0 + Alembic (separate)', 'Django ORM + <code>makemigrations</code> / <code>migrate</code> (built in)'],
        ['Auth', 'You assemble: pwdlib, JWT, OAuth2 deps', 'Users, groups, permissions, sessions, password hashing built in; DRF auth classes; allauth for OAuth'],
        ['Admin UI', 'none (build one or use a library)', H.c('g', '<code>django.contrib.admin</code>: CRUD back-office in minutes')],
        ['Async', 'Native: async routes, async drivers everywhere', 'Async views and ASGI supported; async ORM API exists but parts still run in threads; many apps stay sync'],
        ['Background jobs', 'Celery / RQ / arq', 'Celery (most common), plus a built-in Tasks API since 6.0 that needs a worker backend'],
        ['API docs', 'OpenAPI generated automatically', 'drf-spectacular / Ninja for OpenAPI'],
        ['Serving', 'Uvicorn workers (ASGI)', 'Gunicorn sync/gthread workers on <code>wsgi.py</code>, or Uvicorn on <code>asgi.py</code>'],
        ['Sweet spot', 'APIs, microservices, async I/O, ML/LLM serving', 'Content-heavy products, internal tools, CRUD + admin, monoliths with many models']
      ])}
      <p><b>Choose Django</b> when you need an admin back-office, user accounts, many related models, server-rendered pages, or a team that already knows it; time to a full product is shortest. <b>Choose FastAPI</b> for API-only services, heavy async I/O (websockets, streaming, many outbound calls, LLM gateways), strict typed contracts, or small focused services. Both scale to very large companies (Instagram runs Django; many ML platforms run FastAPI), so the choice is about the <b>shape of the product and the team</b>, not raw speed: the database dominates latency either way.</p>`,
    clues: [
      '"We need an internal admin panel for ops by next week" → Django admin',
      '"API gateway that streams LLM responses to thousands of websocket clients" → FastAPI (async-native)',
      '"Team of Django developers, product is CRUD-heavy with accounts and content" → Django + DRF (or Ninja)',
      '"Why not use Django for everything?" → it is synchronous at heart; async-heavy I/O and tiny services fit FastAPI better',
      '"Send the email only if the order is saved" in Django → <code>transaction.on_commit(lambda: task.delay(id))</code>',
      '"FastAPI-style typed endpoints but inside Django" → Django Ninja'
    ],
    code: [
      {
        lang: 'python', title: 'Django + DRF: model, serializer, viewset, router',
        code: `# products/models.py
from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=200)
    price_cents = models.PositiveIntegerField()
    category = models.ForeignKey("Category", on_delete=models.PROTECT, related_name="products")
    updated_at = models.DateTimeField(auto_now=True)


# products/serializers.py
from rest_framework import serializers


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "price_cents", "category", "updated_at"]
        read_only_fields = ["updated_at"]


# products/views.py
from rest_framework import permissions, viewsets


class ProductViewSet(viewsets.ModelViewSet):            # list, retrieve, create, update, destroy
    queryset = Product.objects.select_related("category").order_by("id")   # avoid N+1
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# config/urls.py
from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

router = routers.DefaultRouter()
router.register("products", ProductViewSet)
urlpatterns = [path("admin/", admin.site.urls), path("api/", include(router.urls))]`
      },
      {
        lang: 'python', title: 'Celery inside Django, enqueued only after commit',
        code: `# config/celery.py
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")   # reads CELERY_BROKER_URL etc.
app.autodiscover_tasks()                                             # finds tasks.py in every app


# orders/tasks.py
from celery import shared_task


@shared_task(bind=True, acks_late=True, autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=5)
def send_receipt(self, order_id: int) -> None:
    print("receipt for", order_id)


# orders/views.py
from django.db import transaction


def place_order(request):
    with transaction.atomic():
        order = Order.objects.create(user=request.user, total_cents=1999)
        # NOT send_receipt.delay(order.id) here: the worker could run before COMMIT and not find the row
        transaction.on_commit(lambda: send_receipt.delay(order.id))
    return JsonResponse({"id": order.id}, status=201)`
      },
      {
        lang: 'python', title: 'Django Ninja: FastAPI-style typing inside Django',
        code: `# pip install django-ninja
from ninja import NinjaAPI, Schema

api = NinjaAPI()


class ProductOut(Schema):
    id: int
    name: str
    price_cents: int


@api.get("/products/{product_id}", response=ProductOut)
def get_product(request, product_id: int):
    return Product.objects.get(id=product_id)       # validated and documented like FastAPI

# urls.py:  path("api/", api.urls)`
      }
    ],
    codeTitle: ['DRF', 'Celery + Django', 'Django Ninja'],
    viz: {
      title: 'Score the requirements: Django or FastAPI?',
      input: 'admin=yes accounts=yes async_io=no websockets=no team=django microservice=no',
      inputLabel: 'yes/no for: admin, accounts, async_io, websockets, microservice; team=django|fastapi|none',
      gen: function (input) {
        var o = kvParse(input, 'admin=yes accounts=yes async_io=no');
        var team = (o.team || 'none').toLowerCase();
        if (['django', 'fastapi', 'none'].indexOf(team) < 0) throw new Error('team must be django, fastapi or none');
        var rules = [
          ['admin', 'Needs an admin back-office', 3, 0, 'Django admin is a huge head start.'],
          ['accounts', 'User accounts, groups, permissions', 2, 0, 'Django ships users, sessions, permissions.'],
          ['async_io', 'Many slow outbound calls / streaming', 0, 3, 'Async-native stacks keep thousands of waits cheap.'],
          ['websockets', 'Websockets / server-sent events at scale', 0, 2, 'FastAPI/Starlette handle them natively; Django needs Channels.'],
          ['microservice', 'Small single-purpose API service', 0, 2, 'Django\'s batteries are mostly unused there.']
        ];
        var dj = 0, fa = 0, rows = [], frames = [];
        frames.push({ narr: 'Each requirement adds points to one side. The numbers are a conversation tool, not a law: the point is to make the trade-offs explicit.', parts: [{ type: 'table', label: 'Scorecard', columns: ['requirement', 'present?', 'Django', 'FastAPI'], rows: [] }, { type: 'vars', label: 'Score', vals: { django: 0, fastapi: 0 } }] });
        rules.forEach(function (r) {
          var on = yes(o, r[0], false);
          if (on) { dj += r[2]; fa += r[3]; }
          rows.push([r[1], on ? 'yes' : 'no', on && r[2] ? '+' + r[2] : '', on && r[3] ? '+' + r[3] : '']);
          frames.push({ narr: '<b>' + r[1] + '</b>: ' + (on ? r[4] : 'not needed, no points.'), parts: [{ type: 'table', label: 'Scorecard', columns: ['requirement', 'present?', 'Django', 'FastAPI'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = on ? 'cur' : 'done'; return h; })() }, { type: 'vars', label: 'Score', vals: { django: dj, fastapi: fa } }] });
        });
        if (team === 'django') dj += 2; else if (team === 'fastapi') fa += 2;
        rows.push(['Team experience: ' + team, team === 'none' ? 'no' : 'yes', team === 'django' ? '+2' : '', team === 'fastapi' ? '+2' : '']);
        var pick = dj > fa ? 'Django (+ DRF or Ninja)' : fa > dj ? 'FastAPI' : 'Either: decide on team and ecosystem';
        frames.push({ narr: 'Team experience counts: a team shipping in a framework it knows beats a "better" framework it does not. Verdict: <b>' + pick + '</b>. Mixed answers are common: a Django monolith with admin, plus a small FastAPI service for the async/streaming part, sharing one Postgres and one Celery broker.', parts: [{ type: 'table', label: 'Scorecard', columns: ['requirement', 'present?', 'Django', 'FastAPI'], rows: rows.slice() }, { type: 'vars', label: 'Score', vals: { django: dj, fastapi: fa, verdict: pick }, hl: { verdict: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The same endpoint in both',
        html: `${H.table(['Step', 'FastAPI', 'DRF'], [
          ['Shape', '<code>class ProductOut(BaseModel)</code>', '<code>class ProductSerializer(ModelSerializer)</code>'],
          ['Handler', '<code>@router.get("/products/{id}", response_model=ProductOut)</code>', '<code>ProductViewSet.retrieve</code> via router'],
          ['DB access', '<code>session.get(Product, id)</code>', '<code>Product.objects.get(pk=id)</code>'],
          ['Auth', '<code>Depends(get_current_user)</code>', '<code>permission_classes = [IsAuthenticated]</code>'],
          ['Docs', 'automatic <code>/docs</code>', 'add drf-spectacular'],
          ['Run', '<code>uvicorn app.main:app</code>', '<code>gunicorn config.wsgi:application</code>']
        ])}`
      },
      {
        title: 'Deploying Django: what is different',
        html: `<p>Static files: run <code>python manage.py collectstatic</code> at image build and serve them with WhiteNoise or a CDN. Migrations: <code>python manage.py migrate</code> as a release job, like <code>alembic upgrade head</code>. Settings: <code>DEBUG=False</code>, <code>ALLOWED_HOSTS</code>, <code>SECRET_KEY</code> and <code>DATABASES</code> from environment variables (django-environ), <code>CONN_MAX_AGE</code> for persistent connections. Workers: Gunicorn <code>sync</code> or <code>gthread</code>, so the <code>2 × cores + 1</code> rule applies.</p>`,
        code: { lang: 'bash', code: `python manage.py collectstatic --noinput            # at image build
python manage.py migrate --noinput                  # release job, before new pods take traffic
gunicorn config.wsgi:application --workers 5 --threads 4 --worker-class gthread --bind 0.0.0.0:8000 --timeout 60` }
      },
      {
        title: 'The admin as a product feature',
        html: `<p>A support team needs to search orders, refund one, and ban a user. In Django that is a few lines of <code>ModelAdmin</code> (<code>list_display</code>, <code>search_fields</code>, an admin action for refunds) and it inherits authentication and permissions. In a FastAPI stack you would build a React admin or adopt a library such as SQLAdmin. For many startups, this alone decides the framework.</p>`,
        code: { lang: 'python', code: `from django.contrib import admin


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "total_cents", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["id", "user__email"]
    actions = ["refund"]

    @admin.action(description="Refund selected orders")
    def refund(self, request, queryset):
        for order in queryset.filter(status="paid"):
            refund_order.delay(order.id)       # a Celery task, idempotent per order` }
      }
    ],
    deepDive: `<p>🟣 <b>Django's request path.</b> WSGI/ASGI handler → middleware stack (security, sessions, CSRF, auth) → URL resolver → view → ORM → template or JSON. The ORM is lazy: a <code>QuerySet</code> runs SQL when iterated. <code>select_related</code> (JOIN for foreign keys) and <code>prefetch_related</code> (second query for reverse/many-to-many) are the N+1 cures, the same ideas as SQLAlchemy's <code>joinedload</code>/<code>selectinload</code>.</p>
      <p><b>Async Django, honestly.</b> Async views work under ASGI, and the ORM offers <code>aget()</code>, <code>acreate()</code>, <code>async for</code> over querysets. Much of the database layer still runs sync code in a thread via <code>sync_to_async</code>, and transactions in async code are limited. Mixing is fine for a few async views (calling external APIs), but an async-everything design fits FastAPI better.</p>
      <p><b>Transactions and tasks.</b> <code>ATOMIC_REQUESTS=True</code> wraps every view in a transaction. Enqueueing inside it without <code>on_commit</code> is the classic Django-Celery bug: the worker looks up the row before it is committed and fails or sees old data. Django 5.0+ also offers <code>on_commit(..., robust=True)</code> so one failing callback does not stop the others.</p>
      <p><b>Built-in tasks.</b> Django 6.0 added a standard Tasks API: you decorate a function with <code>@task</code> and call <code>.enqueue()</code>, and a configured backend runs it. Django itself ships only development/test backends; production needs a backend with real workers (for example the <code>django-tasks</code> database backend, or adapters to existing queues). For retries, routing and beat-style schedules, Celery is still the default in 2026.</p>
      <p><b>Performance.</b> Benchmarks of "hello world" show FastAPI ahead, but a real endpoint spends most of its time in the database and serialization. Django at scale is about the same discipline: indexes, <code>select_related</code>, caching (Django's cache framework speaks Redis natively since 4.0), and horizontal scaling.</p>`,
    aiEra: `<p>🤖 Both frameworks are extremely well represented in training data, so assistants write good Django and good FastAPI. The risk is <b>mixing idioms</b>: Pydantic code in a DRF project, sync ORM calls inside async Django views (raises <code>SynchronousOnlyOperation</code>), or FastAPI-style dependency injection reinvented in Django. Tell the assistant the framework, version and conventions of the repository.</p>
      <p>Django's admin and conventions also make it attractive for AI-assisted development: an agent can generate a model, run <code>makemigrations</code>, register the admin and add a DRF viewset in one pass, and the result follows a structure every Django developer recognises. Typed FastAPI code gives assistants strong signals through type hints and OpenAPI. Either way, review migrations by hand.</p>`,
    problems: [
      {
        title: 'Pick the Framework for Three Products',
        level: 'Medium',
        tags: ['django', 'fastapi', 'architecture', 'trade-offs'],
        companies: ['Instagram', 'Zerodha', 'Thoughtworks'],
        statement: `<p>Recommend Django (with DRF or Ninja) or FastAPI for each, with reasons and the main risk:</p>
          <ol><li>A marketplace MVP: sellers, buyers, listings, orders, an ops team that must edit listings and refund orders, 4 developers, launch in 8 weeks.</li>
          <li>An LLM gateway: authenticates internal apps, streams model tokens over SSE to 5,000 concurrent clients, enforces per-team rate limits and logs token usage.</li>
          <li>A company already running a large Django monolith wants a new webhook ingestion service that receives 3,000 events/s from partners and puts them on a queue.</li></ol>`,
        constraints: `<p>One recommendation per product; mention background jobs and deployment for each.</p>`,
        example: `<p>A good answer names the deciding requirement for each product (${H.c('g', 'admin + accounts')}, ${H.c('b', 'async streaming')}, ${H.c('y', 'tiny, I/O-bound, but team context')}) instead of saying "FastAPI is faster".</p>`,
        brute: {
          why: `<p>"Always FastAPI, it is modern and fast" ignores weeks of building an admin and auth for the marketplace. "Always Django, it has everything" puts 5,000 long-lived streaming connections on a framework whose ORM and middleware are sync at heart.</p>`,
          code: `def pick(product: str) -> str:
    return "fastapi"      # one answer for every product: no trade-offs considered`
        },
        mcq: {
          q: 'For the LLM gateway, what is the deciding requirement?',
          options: ['Thousands of concurrent, long-lived streaming connections waiting on I/O', 'The need for an admin panel', 'Database migrations', 'Template rendering'],
          answer: 0,
          explain: 'Most of the time is spent waiting on the model provider while holding a connection open, which is exactly what an async-native stack does cheaply.'
        },
        hints: [
          'Hint 1: for each product, find the one requirement that is expensive to build yourself or hard for one of the frameworks.',
          'Hint 2: marketplace → admin, accounts, many models; gateway → async streaming and concurrency; webhook service → small, I/O-bound, but consider what the team already runs.',
          'Hint 3: also say how jobs run (Celery with on_commit, arq, or just a queue producer) and how each is served (Gunicorn sync/gthread vs Uvicorn).'
        ],
        solution: {
          approach: `<p><b>1. Marketplace → Django + DRF.</b> The deciding features are the admin (ops edits and refunds through <code>ModelAdmin</code> actions) and built-in accounts, permissions and migrations; with 4 developers and 8 weeks, not building these is the whole schedule. Background jobs: Celery with <code>transaction.on_commit</code> for emails, payouts and image processing. Serve with Gunicorn gthread workers. Risk: the monolith grows tangled; keep apps (Django modules) with clear boundaries.</p>
            <p><b>2. LLM gateway → FastAPI.</b> 5,000 concurrent SSE streams spend almost all their time awaiting the provider; async workers (Uvicorn, 1 per core) hold them cheaply, and <code>httpx.AsyncClient</code> streams upstream tokens straight through. Rate limits in Redis (token bucket via <code>redis.asyncio</code>), usage logged as structured events and counted as metrics, and token totals written in batches (write-behind) by an arq worker. Risk: one blocking call on the event loop stalls thousands of streams; enforce async-only clients in review.</p>
            <p><b>3. Webhook ingestion → a small FastAPI service</b> (or a minimal async Django view if the team strongly prefers one stack). The job is: verify the signature, dedupe by event id (<code>SET NX EX</code>), push to the queue, return 202 in milliseconds; no admin or ORM needed. Sharing the Django project's Celery broker lets the monolith's workers process the events. Risk: two stacks to maintain; mitigate with shared CI, one Dockerfile pattern and the same logging/metrics conventions.</p>`,
          complexity: `<p>Decision cost, not runtime cost: the framework that removes the most custom work for the deciding requirement wins, adjusted by team skills.</p>`,
          followUps: ['When would you split the marketplace monolith into services?', 'How would the gateway enforce per-team token budgets across pods?']
        },
        tests: { skip: 'architecture reasoning, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Predict Celery\'s Retry Countdowns',
    level: 'Easy', tags: ['celery', 'retries', 'backoff'], companies: ['Stripe', 'Freshworks'],
    statement: `<p>A Celery task uses <code>retry_backoff=factor</code>, <code>retry_backoff_max=maximum</code>, <code>max_retries=n</code> and <b>no jitter</b>. Celery waits <code>min(maximum, factor × 2<sup>r</sup>)</code> seconds before retry number <code>r</code> (0-based: the first retry uses r = 0). Write <code>celery_countdowns(factor, maximum, max_retries)</code> returning the list of waits, so you can check the total delay against the business promise ("receipts within 10 minutes").</p>`,
    constraints: `<p>1 ≤ factor ≤ 60; 1 ≤ maximum ≤ 86,400; 0 ≤ max_retries ≤ 30. <code>retry_backoff=True</code> means factor 1.</p>`,
    example: `<p>factor 5, maximum 60, 6 retries → <code>[5, 10, 20, 40, 60, 60]</code>: doubling until the cap. Total ${H.c('b', '195 s')} of waiting before the last attempt.</p>`,
    brute: {
      why: `<p>Guessing "about a minute" instead of computing it. With <code>retry_backoff=True</code>, the Celery default <code>retry_backoff_max=600</code> and <code>max_retries=10</code>, the total wait is 1+2+…+512 = 1,023 s: the receipt promise is already broken.</p>`,
      code: `def celery_countdowns(factor, maximum, max_retries):
    return [factor] * max_retries          # forgets the doubling and the cap`
    },
    mcq: { q: 'With <code>retry_jitter=True</code> (the default when backoff is on), what is the real wait for retry r?', options: ['A random value between 0 and the countdown', 'Exactly the countdown', 'The countdown plus 1 s', 'Twice the countdown'], answer: 0, explain: 'Celery applies full jitter: the computed countdown becomes the upper bound of a random wait.' },
    hints: [
      'Hint 1: the countdown for retry r is factor × 2<sup>r</sup>, starting at r = 0, so the first wait equals the factor.',
      'Hint 2: apply the cap with <code>min(maximum, ...)</code> on every element, not just the last one.',
      'Hint 3: max_retries = 0 means no retries at all, so return an empty list.'
    ],
    solution: {
      approach: `<p>One list comprehension over <code>range(max_retries)</code> mirrors Celery's <code>get_exponential_backoff_interval</code> with jitter turned off. Summing the list gives the worst-case extra latency, which you compare with the SLO before shipping the retry policy.</p>`,
      code: { lang: 'python', run: true, code: `def celery_countdowns(factor: int, maximum: int, max_retries: int) -> list[int]:
    return [min(maximum, factor * 2 ** r) for r in range(max_retries)]


waits = celery_countdowns(5, 60, 6)
print(waits, "total", sum(waits), "s")       # [5, 10, 20, 40, 60, 60] total 195 s` },
      complexity: `<p>O(max_retries) time and space.</p>`,
      followUps: ['What is the expected total wait with full jitter?', 'How would you honour a Retry-After header instead?']
    },
    tests: { fn: 'celery_countdowns', sig: 'int int int -> int[]', cases: [
      [[1, 600, 5], [1, 2, 4, 8, 16]], [[2, 600, 5], [2, 4, 8, 16, 32]], [[5, 60, 6], [5, 10, 20, 40, 60, 60]],
      [[1, 600, 0], []], [[3, 3, 3], [3, 3, 3]], [[10, 1000, 8], [10, 20, 40, 80, 160, 320, 640, 1000]], [[1, 1, 1], [1]]
    ] }
  });

  practice.push({
    title: 'Build a Canonical Cache Key',
    level: 'Easy', tags: ['cache', 'redis', 'keys'], companies: ['Myntra', 'Etsy'],
    statement: `<p>A product search endpoint is cached in Redis. <code>?size=m&amp;color=red</code> and <code>?color=red&amp;size=m</code> are the same query and must hit the same key. Write <code>cache_key(prefix, version, params)</code> where <code>params</code> is a list of <code>"name=value"</code> strings:</p>
      <ul><li>names are lower-cased; values keep their case;</li><li>params with an empty value are dropped;</li><li>if a name repeats, the <b>later</b> value wins;</li><li>sort by name and join as <code>name=value</code> with <code>&amp;</code>;</li><li>result: <code>prefix:v{version}:{query}</code>, or <code>prefix:v{version}</code> if no params remain.</li></ul>`,
    constraints: `<p>0 ≤ len(params) ≤ 50; each param contains exactly one <code>=</code>; 1 ≤ version ≤ 10<sup>6</sup>.</p>`,
    example: `<p><code>cache_key("products", 3, ["size=m", "Color=red"])</code> → <code>"products:v3:color=red&amp;size=m"</code>. Bumping the version to 4 after changing the cached JSON shape makes old entries unreachable at once.</p>`,
    brute: {
      why: `<p>Using the raw query string as the key gives a different key for every parameter order and casing, so the hit ratio collapses and the same data is stored many times.</p>`,
      code: `def cache_key(prefix, version, params):
    return prefix + ":" + "&".join(params)     # order-dependent, no version`
    },
    mcq: { q: 'Why put a version number in the key?', options: ['To invalidate every old entry at once when the cached format changes', 'Redis requires it', 'To make keys shorter', 'To sort keys'], answer: 0, explain: 'Old pods and new pods during a rollout would otherwise read each other\'s incompatible JSON.' },
    hints: [
      'Hint 1: build a dict from lower-cased name to value; inserting later params overwrites earlier ones automatically.',
      'Hint 2: drop names whose final value is empty, then sort the remaining names.',
      'Hint 3: join name=value pairs with "&amp;" and attach them after <code>prefix:v{version}:</code>; no trailing colon when nothing is left.'
    ],
    solution: {
      approach: `<p>Normalise first, then serialise in a fixed order. A dict handles "later wins", lower-casing handles name case, a filter removes empty values, and sorting gives one canonical order. The version prefix is the cheapest invalidation tool you have.</p>`,
      code: { lang: 'python', run: true, code: `def cache_key(prefix: str, version: int, params: list[str]) -> str:
    merged: dict[str, str] = {}
    for p in params:
        name, value = p.split("=", 1)
        merged[name.lower()] = value            # later value wins
    query = "&".join(f"{k}={v}" for k, v in sorted(merged.items()) if v != "")
    base = f"{prefix}:v{version}"
    return f"{base}:{query}" if query else base


print(cache_key("products", 3, ["size=m", "Color=red"]))   # products:v3:color=red&size=m` },
      complexity: `<p>O(p log p) for p params (the sort).</p>`,
      followUps: ['How do you keep keys short when queries are long? (hash the query)', 'Which params should never be part of a shared cache key?']
    },
    tests: { fn: 'cache_key', sig: 'string int string[] -> string', cases: [
      [['products', 3, ['size=m', 'Color=red']], 'products:v3:color=red&size=m'], [['products', 3, []], 'products:v3'],
      [['search', 1, ['q=shoes', 'page=2', 'sort=']], 'search:v1:page=2&q=shoes'], [['search', 2, ['page=1', 'page=3']], 'search:v2:page=3'],
      [['u', 10, ['B=2', 'a=1']], 'u:v10:a=1&b=2'], [['p', 1, ['sort=']], 'p:v1'], [['p', 1, ['q=Red']], 'p:v1:q=Red']
    ] }
  });

  practice.push({
    title: 'Should This Call Be Retried?',
    level: 'Easy', tags: ['retries', 'http', 'errors'], companies: ['Twilio', 'Postman'],
    statement: `<p>Write <code>should_retry(status, attempt, max_attempts)</code> for a worker calling an external API. <code>status</code> is the HTTP status, or <code>0</code> for a network error / timeout. <code>attempt</code> is how many attempts have already been made (1 after the first call). Retry only when attempts remain (<code>attempt &lt; max_attempts</code>) and the status is transient: <code>0, 408, 425, 429, 500, 502, 503, 504</code>.</p>`,
    constraints: `<p>0 ≤ status ≤ 599; 1 ≤ attempt; 1 ≤ max_attempts ≤ 20.</p>`,
    example: `${H.table(['status', 'attempt', 'max', 'retry?', 'why'], [['503', '1', '3', H.c('g', 'true'), 'transient, attempts left'], ['503', '3', '3', H.c('r', 'false'), 'out of attempts → dead letter'], ['400', '1', '3', H.c('r', 'false'), 'our request is wrong'], ['501', '1', '5', H.c('r', 'false'), '"not implemented" will not change']])}`,
    brute: {
      why: `<p>Retrying on any non-2xx status repeats 400s and 401s forever (they will never succeed) and burns the provider's rate limit, which then causes real 429s for everyone.</p>`,
      code: `def should_retry(status, attempt, max_attempts):
    return status >= 400 and attempt < max_attempts     # retries 400, 401, 404 ...`
    },
    mcq: { q: 'A POST times out (status 0). When is retrying it safe?', options: ['When the request carries an idempotency key the server honours', 'Always', 'Never', 'Only on weekends'], answer: 0, explain: 'A timeout may hide a success; only an idempotent request can be repeated without risking a double effect.' },
    hints: [
      'Hint 1: keep the retryable statuses in a set for a clear O(1) check that reviewers can read.',
      'Hint 2: two conditions must both hold: the status is transient AND attempt &lt; max_attempts.',
      'Hint 3: 501 and 505 are 5xx but permanent, so do not write <code>status &gt;= 500</code>; list the codes explicitly.'
    ],
    solution: {
      approach: `<p>An explicit allow-list of transient statuses plus an attempt cap. The cap guarantees poison calls end up in the dead-letter path instead of looping. In real code, also respect <code>Retry-After</code> on 429/503 and only retry non-idempotent requests when they carry an idempotency key.</p>`,
      code: { lang: 'python', run: true, code: `RETRYABLE = {0, 408, 425, 429, 500, 502, 503, 504}


def should_retry(status: int, attempt: int, max_attempts: int) -> bool:
    return attempt < max_attempts and status in RETRYABLE


print(should_retry(503, 1, 3), should_retry(503, 3, 3), should_retry(400, 1, 3))   # True False False` },
      complexity: `<p>O(1) time and space.</p>`,
      followUps: ['Should 409 Conflict be retried?', 'How do you add a retry budget across all calls?']
    },
    tests: { fn: 'should_retry', sig: 'int int int -> bool', cases: [
      [[503, 1, 3], true], [[503, 3, 3], false], [[400, 1, 3], false], [[0, 2, 3], true], [[429, 1, 1], false],
      [[501, 1, 5], false], [[504, 4, 5], true], [[200, 1, 3], false], [[409, 1, 3], false]
    ] }
  });

  practice.push({
    title: 'Redact Secrets Before Logging',
    level: 'Easy', tags: ['logging', 'security', 'structured logs'], companies: ['Okta', 'Plaid'],
    statement: `<p>Your JSON logger receives fields as <code>"key=value"</code> strings. Write <code>redact(fields)</code> that replaces the value with <code>***</code> whenever the lower-cased key <b>contains</b> any of: <code>password</code>, <code>secret</code>, <code>token</code>, <code>authorization</code>, <code>api_key</code>, <code>cookie</code>. Split on the <b>first</b> <code>=</code>. Strings without <code>=</code> pass through unchanged. Keep the order.</p>`,
    constraints: `<p>0 ≤ len(fields) ≤ 1000. Substring matching is deliberately conservative: hiding a harmless field is better than leaking a secret.</p>`,
    example: `<p><code>["user=ana", "password=hunter2"]</code> → <code>["user=ana", "password=***"]</code>; <code>"set_cookie=a=b"</code> → <code>"set_cookie=***"</code>; <code>"tokenizer=bpe"</code> → <code>"tokenizer=***"</code> (contains "token": a false positive we accept).</p>`,
    brute: {
      why: `<p>Matching exact key names misses <code>refresh_token</code>, <code>X-Api-Key</code> spellings and nested names; one missed variant puts live credentials into a log system many people can read.</p>`,
      code: `def redact(fields):
    return ["password=***" if f.startswith("password=") else f for f in fields]`
    },
    mcq: { q: 'Where is the best place to redact?', options: ['In a logging filter/formatter in the app, before the log leaves the process', 'In the log dashboard', 'Manually when reading logs', 'In the database'], answer: 0, explain: 'Once a secret reaches the log pipeline it is copied to storage, indexes and backups; redact at the source.' },
    hints: [
      'Hint 1: use <code>field.partition("=")</code> to split on the first "=" only; the separator is empty when there is no "=".',
      'Hint 2: lower-case the key and check <code>any(word in key for word in SENSITIVE)</code>.',
      'Hint 3: rebuild the string as <code>key + "=***"</code> for sensitive keys; keep everything else exactly as it was.'
    ],
    solution: {
      approach: `<p>Partition each field on its first <code>=</code>, test the lower-cased key against a list of sensitive substrings, and replace the value when it matches. In a real service this logic lives in a <code>logging.Filter</code> that walks the record's extra fields, so every logger in the process is protected, including third-party ones.</p>`,
      code: { lang: 'python', run: true, code: `SENSITIVE = ("password", "secret", "token", "authorization", "api_key", "cookie")


def redact(fields: list[str]) -> list[str]:
    out = []
    for f in fields:
        key, sep, _value = f.partition("=")
        if sep and any(word in key.lower() for word in SENSITIVE):
            out.append(key + "=***")
        else:
            out.append(f)
    return out


print(redact(["user=ana", "password=hunter2", "Authorization=Bearer abc"]))` },
      complexity: `<p>O(total characters) time; O(n) output.</p>`,
      followUps: ['How would you redact secrets inside free-text messages?', 'How do you test that a new field cannot leak?']
    },
    tests: { fn: 'redact', sig: 'string[] -> string[]', cases: [
      [[['user=ana', 'password=hunter2']], ['user=ana', 'password=***']],
      [[['Authorization=Bearer abc', 'path=/x']], ['Authorization=***', 'path=/x']],
      [[['refresh_token=r1', 'x_api_key=k']], ['refresh_token=***', 'x_api_key=***']],
      [[[]], []], [[['tokenizer=bpe']], ['tokenizer=***']],
      [[['msg=hello', 'set_cookie=a=b']], ['msg=hello', 'set_cookie=***']], [[['noequals']], ['noequals']]
    ] }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Token Bucket for a Rate-Limited Partner API',
    level: 'Medium', tags: ['rate limiting', 'token bucket', 'workers'], companies: ['Shopify', 'Twilio', 'Razorpay'],
    statement: `<p>A partner API allows bursts of <code>capacity</code> calls and <code>rate</code> calls per second on average. Your workers must throttle themselves instead of collecting 429s. Implement <code>TokenBucket(capacity, rate)</code> with <code>allow(now_ms)</code> → bool. The bucket starts <b>full</b> at time 0. Before each check, add <code>elapsed_ms × rate / 1000</code> tokens (fractions count), never above capacity; if at least one whole token is available, take it and return true.</p>`,
    constraints: `<p>0 ≤ capacity ≤ 10<sup>4</sup>; 0 ≤ rate ≤ 10<sup>4</sup>; <code>now_ms</code> never decreases. Use integer arithmetic (milli-tokens) to avoid float drift.</p>`,
    example: `<p>capacity 2, rate 1/s: allow(0) ✔, allow(0) ✔, allow(0) ✘ (empty), allow(500) ✘ (0.5 token), allow(1000) ✔ (1.0 token), allow(3000) ✔ (refilled to the cap of 2), allow(3000) ✔.</p>`,
    brute: {
      why: `<p>A fixed window ("max N per second, reset each second") allows 2N calls across a window boundary and rejects bursts that the partner would accept; sleeping a fixed time between calls wastes the burst allowance.</p>`,
      code: `class TokenBucket:
    def __init__(self, capacity, rate):
        self.rate, self.window, self.count = rate, -1, 0

    def allow(self, now_ms):
        second = now_ms // 1000
        if second != self.window:
            self.window, self.count = second, 0
        self.count += 1
        return self.count <= self.rate          # bursty at window edges`
    },
    mcq: { q: 'Your 20 Celery workers share one partner limit. Where must the bucket live?', options: ['In Redis, updated atomically (Lua script), so all workers share it', 'In each worker\'s memory', 'In the Celery result backend', 'In an environment variable'], answer: 0, explain: 'A per-process bucket lets each of 20 workers use the full limit: 20× too many calls. A shared atomic bucket enforces the real limit.' },
    hints: [
      'Hint 1: store tokens as milli-tokens: a full bucket is capacity × 1000, one call costs 1000.',
      'Hint 2: refill = (now − last) × rate milli-tokens (rate tokens/s = rate milli-tokens/ms); cap at capacity × 1000 and set last = now.',
      'Hint 3: allow if tokens ≥ 1000 then subtract 1000; capacity 0 means always false.'
    ],
    solution: {
      approach: `<p>Lazy refill: there is no timer; each call computes how many tokens accumulated since the last call. Milli-token integers keep the arithmetic exact. For a fleet of workers, the same algorithm runs inside a Redis Lua script on a hash <code>{tokens, last}</code> so the read-refill-take step is atomic (Backend 9 shows that script).</p>`,
      code: { lang: 'python', run: true, code: `class TokenBucket:
    def __init__(self, capacity: int, rate: int):
        self.cap_milli = capacity * 1000
        self.rate = rate                    # tokens per second = milli-tokens per ms
        self.tokens = self.cap_milli        # start full
        self.last = 0

    def allow(self, now_ms: int) -> bool:
        self.tokens = min(self.cap_milli, self.tokens + (now_ms - self.last) * self.rate)
        self.last = now_ms
        if self.tokens >= 1000:
            self.tokens -= 1000
            return True
        return False


b = TokenBucket(2, 1)
print([b.allow(t) for t in (0, 0, 0, 500, 1000, 3000, 3000)])` },
      complexity: `<p>O(1) time and space per call.</p>`,
      followUps: ['Turn it into a Redis Lua script.', 'Instead of rejecting, return how long to wait (for <code>self.retry(countdown=...)</code>).']
    },
    tests: { cls: 'TokenBucket', sigs: { TokenBucket: 'int int', allow: 'int -> bool' }, cases: [
      { ops: ['TokenBucket', 'allow', 'allow', 'allow', 'allow', 'allow', 'allow', 'allow'], args: [[2, 1], [0], [0], [0], [500], [1000], [3000], [3000]], out: [null, true, true, false, false, true, true, true] },
      { ops: ['TokenBucket', 'allow', 'allow', 'allow', 'allow'], args: [[1, 2], [0], [499], [500], [500]], out: [null, true, false, true, false] },
      { ops: ['TokenBucket', 'allow', 'allow', 'allow', 'allow', 'allow', 'allow'], args: [[3, 10], [0], [0], [0], [0], [100], [150]], out: [null, true, true, true, false, true, false] },
      { ops: ['TokenBucket', 'allow'], args: [[5, 1], [100000]], out: [null, true] },
      { ops: ['TokenBucket', 'allow', 'allow', 'allow'], args: [[1, 1], [0], [999], [1000]], out: [null, true, false, true] },
      { ops: ['TokenBucket', 'allow', 'allow'], args: [[0, 5], [0], [10000]], out: [null, false, false] }
    ] }
  });

  practice.push({
    title: 'Pick TTLs and Invalidation for a Product Page',
    level: 'Medium', tags: ['cache', 'ttl', 'invalidation', 'design'], companies: ['Amazon', 'Flipkart', 'Zalando'],
    statement: `<p>A product page API (FastAPI, Postgres, Redis) returns: description and images, price, stock level, average rating and review count, "customers also bought" recommendations (computed nightly), and the signed-in user's own wishlist flag. Traffic: 20k reads/s at peak, 50 price changes/day per 100k products, stock changes on every sale. Design the caching: what is cached, under which keys, with which TTLs, and how each part is invalidated. Price shown on the page may be at most 1 minute stale; checkout must always use the exact price.</p>`,
    constraints: `<p>No per-user data may ever be served to another user. Redis memory budget: 8 GB.</p>`,
    example: `<p>One cached blob for the whole page with a 1 h TTL is the trap: either the price is stale for an hour or every stock change invalidates the description too.</p>`,
    brute: {
      why: `<p>"Cache the full response for 10 minutes" mixes data with different freshness needs and, worse, caches the user's wishlist flag inside a shared response, so one user's state leaks to everyone.</p>`,
      code: `CACHE_TTL = 600     # one TTL for description, price, stock and the user's wishlist flag`
    },
    mcq: { q: 'Where should the user-specific wishlist flag come from?', options: ['A separate per-user lookup (or key that includes the user id), never the shared page cache', 'The shared page cache', 'The CDN', 'A cookie set by the cache'], answer: 0, explain: 'Shared caches must never contain per-user data; compose the response from a shared part and a per-user part.' },
    hints: [
      'Hint 1: split the page into fragments by freshness: static (description), slow (price), fast (stock), nightly (recommendations), per-user (wishlist).',
      'Hint 2: each fragment gets its own key prefix, TTL and invalidation trigger; compose them in the handler (one <code>MGET</code> for all shared fragments).',
      'Hint 3: checkout reads the price from the database inside its transaction, whatever the cache says.'
    ],
    solution: {
      approach: `<p>Cache <b>fragments</b>, not pages. <b>Description/images</b>: <code>shop:prod:v4:{id}:desc</code>, TTL 1 h + jitter, delete on edit (after commit). <b>Price</b>: <code>…:{id}:price</code>, TTL 60 s (the stated staleness bound) plus delete on change, so it is usually fresh at once and never older than a minute. <b>Stock</b>: do not cache an exact count; cache a coarse availability label (<code>in_stock / low / out</code>) for 10 s, recomputed on sale events; checkout locks the real row. <b>Rating</b>: TTL 10 min, refreshed by a worker when reviews arrive (write-through from the job). <b>Recommendations</b>: written by the nightly job with a 26 h TTL and a dated version key, so a failed run keeps yesterday's values. <b>Wishlist flag</b>: never in a shared key; read from <code>user:{uid}:wishlist</code> (a Redis set, TTL 1 day) or the DB. The handler does one <code>MGET</code> for shared fragments plus one per-user lookup, uses single-flight on misses for hot products, negative-caches unknown ids for 30 s, and an L1 cache of 2 s absorbs the top 100 products. Memory check: ~3 KB of fragments × 2M products ≈ 6 GB, within the 8 GB budget with <code>allkeys-lfu</code> eviction.</p>`,
      code: { lang: 'python', code: `import redis.asyncio as redis

PAGE_FRAGMENTS = {               # suffix -> TTL seconds
    "desc": 3600,
    "price": 60,
    "avail": 10,
    "rating": 600,
    "recs": 26 * 3600,
}


def fragment_keys(pid: int) -> list[str]:
    return [f"shop:prod:v4:{pid}:{name}" for name in PAGE_FRAGMENTS]


async def read_fragments(r: redis.Redis, pid: int) -> dict[str, str | None]:
    values = await r.mget(fragment_keys(pid))          # one round trip for all shared parts
    return dict(zip(PAGE_FRAGMENTS, values))


async def wishlisted(r: redis.Redis, user_id: int, pid: int) -> bool:
    return bool(await r.sismember(f"user:{user_id}:wishlist", pid))   # per-user, never shared` },
      complexity: `<p>One MGET (5 keys) plus one SISMEMBER per page view: two Redis round trips, O(1) each; misses fall back to per-fragment loaders.</p>`,
      followUps: ['How would you put the description fragment on a CDN?', 'What changes if prices are personalised per customer segment?']
    },
    tests: { skip: 'infrastructure wiring, verified by reading' }
  });

  practice.push({
    title: 'Coalesce Writes in a Write-Behind Buffer',
    level: 'Medium', tags: ['write-behind', 'batching', 'cache'], companies: ['Meta', 'ShareChat'],
    statement: `<p>A write-behind buffer receives <code>"key=value"</code> updates in order. It keeps only the <b>latest</b> value per key, remembers the order in which keys <b>first entered the current buffer</b>, and flushes a batch as soon as it holds <code>max_batch</code> distinct keys (checked after each write). At the end, any remainder is flushed. Write <code>coalesce_writes(writes, max_batch)</code> returning each flushed batch as <code>"k1=v1,k2=v2"</code>. Split each write on the first <code>=</code>.</p>`,
    constraints: `<p>0 ≤ len(writes) ≤ 10<sup>5</sup>; 1 ≤ max_batch ≤ 1000. A key flushed earlier starts fresh in the next buffer.</p>`,
    example: `<p><code>["a=1","b=1","a=2","c=1"]</code>, max 2 → after b: 2 keys → flush <code>"a=1,b=1"</code>; then a=2, c=1 → flush <code>"a=2,c=1"</code>. Four updates became two DB batches.</p>`,
    brute: {
      why: `<p>Writing every update to the database (write-through) costs one round trip per update; for counters updated thousands of times per second that is the bottleneck write-behind exists to remove.</p>`,
      code: `def coalesce_writes(writes, max_batch):
    return list(writes)          # one DB write per update, no coalescing`
    },
    mcq: { q: 'What is the main risk of write-behind?', options: ['Updates still in the buffer are lost if the process or cache dies before the flush', 'Reads become slower', 'It needs more DB writes', 'It cannot batch'], answer: 0, explain: 'Data lives only in memory/Redis until the flush; use it where losing a few seconds of updates is acceptable.' },
    hints: [
      'Hint 1: a Python dict keeps insertion order and updating an existing key does not move it, which is exactly "first entered" order.',
      'Hint 2: after each write, if <code>len(buffer) &gt;= max_batch</code>, serialise and clear it.',
      'Hint 3: do not forget the final partial flush, and do not emit an empty batch when there is nothing left.'
    ],
    solution: {
      approach: `<p>A plain dict is the buffer: assignment updates the value in place (latest wins) without changing the key's position (first-seen order). Flushing on size bounds both memory and the amount of data at risk; in production a timer also flushes every few seconds, as in the topic's runnable demo.</p>`,
      code: { lang: 'python', run: true, code: `def coalesce_writes(writes: list[str], max_batch: int) -> list[str]:
    batches: list[str] = []
    buffer: dict[str, str] = {}

    def flush() -> None:
        if buffer:
            batches.append(",".join(f"{k}={v}" for k, v in buffer.items()))
            buffer.clear()

    for w in writes:
        key, _, value = w.partition("=")
        buffer[key] = value                 # latest value, original position
        if len(buffer) >= max_batch:
            flush()
    flush()
    return batches


print(coalesce_writes(["a=1", "b=1", "a=2", "c=1"], 2))     # ['a=1,b=1', 'a=2,c=1']` },
      complexity: `<p>O(total characters) time; O(max_batch) buffer memory.</p>`,
      followUps: ['Add a time-based flush with an injectable clock.', 'How do you make the flush idempotent if it is retried?']
    },
    tests: { fn: 'coalesce_writes', sig: 'string[] int -> string[]', cases: [
      [[['a=1', 'b=1', 'a=2', 'c=1'], 2], ['a=1,b=1', 'a=2,c=1']], [[['a=1', 'a=2', 'a=3'], 2], ['a=3']], [[[], 3], []],
      [[['x=1', 'y=2', 'z=3'], 1], ['x=1', 'y=2', 'z=3']], [[['a=1', 'b=2', 'a=3', 'b=4', 'c=5'], 3], ['a=3,b=4,c=5']],
      [[['k=v=1', 'k=2'], 5], ['k=2']], [[['b=1', 'a=1'], 10], ['b=1,a=1']]
    ] }
  });

  practice.push({
    title: 'Deduplicate Webhooks with a TTL Window',
    level: 'Medium', tags: ['idempotency', 'redis', 'webhooks'], companies: ['GitHub', 'Stripe'],
    statement: `<p>Partners retry webhooks, so the same event id can arrive many times. Your endpoint uses <code>SET seen:{id} 1 NX EX window</code>: the first arrival sets the key and is accepted; arrivals while the key is alive are duplicates (and <b>do not</b> extend its life, because NX fails). The key is alive while <code>now &lt; set_time + window</code>. Write <code>dedupe(ids, times, window)</code> returning the accepted ids in order.</p>`,
    constraints: `<p>0 ≤ n ≤ 10<sup>5</sup>; times are non-decreasing integers (seconds); 0 ≤ window ≤ 10<sup>7</sup>. window 0 accepts everything.</p>`,
    example: `<p>ids <code>["e1","e1","e1"]</code> at <code>[0, 9, 15]</code>, window 10: accept at 0 (key alive until 10), duplicate at 9, accept at 15 (key expired) → <code>["e1","e1"]</code>. Pick the window longer than the partner's retry horizon.</p>`,
    brute: {
      why: `<p>Remembering every id forever in memory works until the process restarts (all memory lost) or grows without bound; checking the database with a separate SELECT then INSERT has a race between two concurrent deliveries.</p>`,
      code: `def dedupe(ids, times, window):
    seen, out = set(), []
    for i in ids:
        if i not in seen:            # never expires, grows forever
            seen.add(i)
            out.append(i)
    return out`
    },
    mcq: { q: 'Why must duplicates NOT refresh the TTL?', options: ['A partner retrying every few seconds would keep the key alive forever and a legitimately new event with a reused id could never pass; NX semantics match the real Redis behaviour', 'Redis cannot refresh TTLs', 'It would use more memory', 'It makes the code slower'], answer: 0, explain: '<code>SET NX EX</code> does nothing when the key exists, so the expiry stays anchored to the first arrival.' },
    hints: [
      'Hint 1: store the set-time per id in a dict, like the value of the Redis key.',
      'Hint 2: an arrival is a duplicate only if the id is stored and <code>now &lt; set_time + window</code>.',
      'Hint 3: on acceptance overwrite the set-time; on duplicates leave it unchanged.'
    ],
    solution: {
      approach: `<p>Model Redis exactly: a dict from id to the time its key was set. Each arrival checks whether the key is still alive; if not (missing or expired), it is accepted and the key is set again. In production this is one atomic <code>SET NX EX</code> per request, and the durable idempotency (in the same DB transaction as the effect) still sits behind it.</p>`,
      code: { lang: 'python', run: true, code: `def dedupe(ids: list[str], times: list[int], window: int) -> list[str]:
    set_at: dict[str, int] = {}
    accepted = []
    for event_id, now in zip(ids, times):
        t0 = set_at.get(event_id)
        if t0 is not None and now < t0 + window:
            continue                        # SET NX failed: duplicate, TTL unchanged
        set_at[event_id] = now              # SET NX EX succeeded
        accepted.append(event_id)
    return accepted


print(dedupe(["e1", "e1", "e1"], [0, 9, 15], 10))   # ['e1', 'e1']` },
      complexity: `<p>O(n) time; O(distinct ids) memory (Redis frees expired keys for you).</p>`,
      followUps: ['What happens if processing fails after the key was set?', 'How do you verify the webhook signature before deduping?']
    },
    tests: { fn: 'dedupe', sig: 'string[] int[] int -> string[]', cases: [
      [[['e1', 'e2', 'e1'], [0, 1, 2], 10], ['e1', 'e2']], [[['e1', 'e1'], [0, 10], 10], ['e1', 'e1']],
      [[['e1', 'e1', 'e1'], [0, 9, 15], 10], ['e1', 'e1']], [[[], [], 5], []],
      [[['a', 'b', 'a', 'b'], [0, 0, 4, 6], 5], ['a', 'b', 'b']], [[['x'], [100], 0], ['x']], [[['x', 'x'], [1, 1], 0], ['x', 'x']]
    ] }
  });

  practice.push({
    title: 'Merge Metrics from Several Workers',
    level: 'Medium', tags: ['metrics', 'prometheus', 'gunicorn'], companies: ['Grafana Labs', 'Zerodha'],
    statement: `<p>Four Gunicorn workers each expose their own counters, so <code>/metrics</code> shows different numbers on every scrape. Write <code>merge_metrics(lines)</code> that takes the exposition lines of all workers concatenated and returns one merged list: ignore blank lines and lines starting with <code>#</code>; the series is everything before the <b>last</b> space and the value (an integer) is after it; sum values per series; return <code>"series value"</code> lines sorted by series.</p>`,
    constraints: `<p>0 ≤ lines ≤ 10<sup>5</sup>; values are non-negative integers; label values may contain spaces (so split on the last space).</p>`,
    example: `<p><code>a_total{r="/x"} 2</code>, <code>a_total{r="/y"} 1</code>, <code>a_total{r="/x"} 5</code> → <code>a_total{r="/x"} 7</code> and <code>a_total{r="/y"} 1</code>.</p>`,
    brute: {
      why: `<p>Taking the last worker's value (or averaging) is wrong for counters: totals must be <b>summed</b>. Splitting on the first space breaks series whose label values contain spaces.</p>`,
      code: `def merge_metrics(lines):
    last = {}
    for line in lines:
        if line and not line.startswith("#"):
            series, value = line.split(" ", 1)     # breaks on labels with spaces
            last[series] = value                    # keeps one worker, drops the rest
    return sorted(f"{s} {v}" for s, v in last.items())`
    },
    mcq: { q: 'Which metric type can NOT be merged across workers by summing?', options: ['A gauge such as "current memory of this process" when you want the max, or a precomputed quantile', 'A counter', 'Histogram bucket counts', 'A request total'], answer: 0, explain: 'Counters and histogram buckets add up; quantiles do not, and gauges need a declared rule (sum, max, min, per-process). prometheus_client\'s multiprocess_mode encodes that choice.' },
    hints: [
      'Hint 1: <code>line.rsplit(" ", 1)</code> splits on the last space only, so label values with spaces stay intact.',
      'Hint 2: accumulate with a dict <code>series → total</code> (or <code>collections.Counter</code>).',
      'Hint 3: skip <code>#</code> comment lines and empty strings, then sort the series names for stable output.'
    ],
    solution: {
      approach: `<p>Parse, group, sum: that is what <code>prometheus_client</code>'s <code>MultiProcessCollector</code> does for counters (it reads each worker's mmap file and adds them up). Splitting on the last space respects the text format, where the value always comes last.</p>`,
      code: { lang: 'python', run: true, code: `from collections import Counter


def merge_metrics(lines: list[str]) -> list[str]:
    totals: Counter[str] = Counter()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        series, value = line.rsplit(" ", 1)
        totals[series] += int(value)
    return [f"{s} {totals[s]}" for s in sorted(totals)]


worker1 = ['# TYPE jobs_total counter', 'jobs_total{queue="emails"} 3']
worker2 = ['jobs_total{queue="emails"} 4', 'jobs_total{queue="reports"} 1']
print(merge_metrics(worker1 + worker2))` },
      complexity: `<p>O(L + s log s) for L lines and s distinct series.</p>`,
      followUps: ['How should histograms be merged?', 'Why can a merged counter still appear to reset?']
    },
    tests: { fn: 'merge_metrics', sig: 'string[] -> string[]', cases: [
      [[['a_total 1', 'a_total 2']], ['a_total 3']],
      [[['# HELP a_total x', 'a_total{r="/x"} 2', 'a_total{r="/y"} 1', 'a_total{r="/x"} 5']], ['a_total{r="/x"} 7', 'a_total{r="/y"} 1']],
      [[[]], []], [[['b 1', 'a 2', '']], ['a 2', 'b 1']],
      [[['jobs_total{q="emails"} 0', 'jobs_total{q="emails"} 10']], ['jobs_total{q="emails"} 10']],
      [[['x{l="a b"} 4', 'x{l="a b"} 1']], ['x{l="a b"} 5']]
    ] }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Count Database Loads in a Cache Stampede',
    level: 'Hard', tags: ['cache', 'stampede', 'simulation', 'single-flight'], companies: ['Netflix', 'Hotstar', 'Twitter'],
    statement: `<p>Before arguing for a stampede lock, simulate it. Write <code>stampede_loads(times, ttl, load_ms, single_flight)</code> that returns how many database loads happen for requests arriving at <code>times</code> (ms, non-decreasing) on one key that starts <b>empty</b>:</p>
      <ol><li>Before handling a request at time <code>t</code>, every in-flight load that completes at <code>c ≤ t</code> finishes (in completion order) and sets the cache to expire at <code>c + ttl</code> (overwriting).</li>
      <li>If a value is cached and <code>t &lt; expires</code>: hit.</li>
      <li>Otherwise, if <code>single_flight</code> and a load is in flight: the request waits for it (no new load).</li>
      <li>Otherwise: start a load that completes at <code>t + load_ms</code> (count it).</li></ol>`,
    constraints: `<p>0 ≤ len(times) ≤ 10<sup>5</sup>; 0 ≤ ttl, load_ms ≤ 10<sup>6</sup>.</p>`,
    example: `<p>times <code>[0, 10, 20, 100, 200]</code>, ttl 100, load 50. Without single-flight: loads at 0, 10, 20 (all misses while nothing is cached), hit at 100 (cached until 170), load at 200 → ${H.c('r', '4')}. With single-flight: load at 0, 10 and 20 wait, hit at 100 (cached until 150), load at 200 → ${H.c('g', '2')}.</p>`,
    brute: {
      why: `<p>Reasoning with averages ("hit ratio is 99 %, so the DB is fine") misses that all misses cluster in the few milliseconds after expiry. Only an event-by-event simulation (or production metrics per key) shows the burst.</p>`,
      code: `def stampede_loads(times, ttl, load_ms, single_flight):
    return 1 if times else 0          # assumes exactly one miss per expiry: wrong without a lock`
    },
    mcq: { q: '1,000 requests arrive in the 50 ms a load takes, with no lock. How many loads?', options: ['Up to 1,000', 'Exactly 1', '2', '50'], answer: 0, explain: 'Every request that sees a miss before the first load finishes starts its own load.' },
    hints: [
      'Hint 1: keep a sorted list (or min-heap) of in-flight completion times, and the current <code>expires</code> (or None).',
      'Hint 2: at each request, first pop every completion ≤ t and set <code>expires = c + ttl</code>; then decide hit / wait / load.',
      'Hint 3: with single-flight, "a load is in flight" just means the in-flight list is non-empty after the completions were processed.'
    ],
    solution: {
      approach: `<p>Discrete-event simulation. A min-heap holds in-flight completion times. Each request first drains completions that happened at or before it (completion before request on ties), updating the expiry. Then a fresh value is a hit; a miss either waits (single-flight with a load in flight) or starts a new load. Running it with real arrival traces is a cheap way to justify the lock or TTL jitter in a design review.</p>`,
      code: { lang: 'python', run: true, code: `import heapq


def stampede_loads(times: list[int], ttl: int, load_ms: int, single_flight: bool) -> int:
    in_flight: list[int] = []          # completion times (min-heap)
    expires = None
    loads = 0
    for t in times:
        while in_flight and in_flight[0] <= t:
            c = heapq.heappop(in_flight)
            expires = c + ttl            # the load wrote the cache
        if expires is not None and t < expires:
            continue                     # hit
        if single_flight and in_flight:
            continue                     # wait for the running load
        loads += 1
        heapq.heappush(in_flight, t + load_ms)
    return loads


print(stampede_loads([0, 10, 20, 100, 200], 100, 50, False), stampede_loads([0, 10, 20, 100, 200], 100, 50, True))` },
      complexity: `<p>O(n log n) time, O(n) space for the heap in the worst case (no single-flight).</p>`,
      followUps: ['Add TTL jitter and show its effect across many keys.', 'Model "serve stale while revalidating".']
    },
    tests: { fn: 'stampede_loads', sig: 'int[] int int bool -> int', cases: [
      [[[0, 0, 0, 0], 60, 50, false], 4], [[[0, 0, 0, 0], 60, 50, true], 1],
      [[[0, 10, 20, 100, 200], 100, 50, true], 2], [[[0, 10, 20, 100, 200], 100, 50, false], 4],
      [[[0, 50], 10, 50, true], 1], [[[0, 50], 10, 50, false], 1], [[[], 10, 10, true], 0],
      [[[0, 5, 30, 31], 20, 10, true], 2], [[[0, 5, 30, 31], 20, 10, false], 2]
    ] }
  });

  practice.push({
    title: 'Simulate a Retrying Worker with a Dead-Letter Queue',
    level: 'Hard', tags: ['retries', 'backoff', 'dlq', 'simulation'], companies: ['Uber', 'DoorDash', 'Atlassian'],
    statement: `<p>One worker processes jobs on a virtual clock that starts at 0. Job <code>i</code> named <code>names[i]</code> fails its first <code>fails[i]</code> attempts and then succeeds. Every attempt takes exactly 1 time unit. Rules:</p>
      <ul><li>All jobs are ready at time 0, in input order.</li>
      <li>The worker picks, among jobs whose ready time ≤ clock, the one with the smallest <code>(ready_time, sequence)</code>; sequence increases every time a job is (re)queued. If none is ready, the clock jumps to the earliest ready time.</li>
      <li>An attempt starting at <code>s</code> ends at <code>e = s + 1</code> (the clock becomes e). On success emit <code>"name:ok@e"</code>.</li>
      <li>On failure: if the job has already used <code>max_retries</code> retries, emit <code>"name:dlq@e"</code>; otherwise it uses one more retry (r = retries used so far, now incremented) and becomes ready at <code>e + base × 2<sup>r−1</sup></code>.</li></ul>
      <p>Write <code>run_jobs(names, fails, max_retries, base)</code> returning the events in order.</p>`,
    constraints: `<p>0 ≤ n ≤ 1000; 0 ≤ fails[i] ≤ 50; 0 ≤ max_retries ≤ 20; 1 ≤ base ≤ 100.</p>`,
    example: `<p>names <code>[a, b]</code>, fails <code>[1, 0]</code>, 3 retries, base 2: a fails at 0→1 and is ready again at 1 + 2 = 3; b runs 1→2 → <code>b:ok@2</code>; nothing ready at 2, so the clock jumps to 3; a runs 3→4 → <code>a:ok@4</code>. Backoff lets healthy work go first.</p>`,
    brute: {
      why: `<p>Retrying immediately in a loop (<code>while not ok: try again</code>) blocks the worker on one failing job, so healthy jobs wait behind it and the flaky dependency gets hammered.</p>`,
      code: `def run_jobs(names, fails, max_retries, base):
    t, out = 0, []
    for name, f in zip(names, fails):
        tries = 0
        while True:                       # hot-loop retries block every other job
            t += 1
            if tries >= f:
                out.append(f"{name}:ok@{t}")
                break
            if tries >= max_retries:
                out.append(f"{name}:dlq@{t}")
                break
            tries += 1
    return out`
    },
    mcq: { q: 'Why does a job go to the dead-letter queue instead of retrying forever?', options: ['A poison job would otherwise consume worker time forever and hide the bug; parking it lets humans fix and redrive it', 'Queues cannot hold old jobs', 'Retries are expensive to log', 'Because Redis requires it'], answer: 0, explain: 'Capped retries plus a DLQ keeps the pipeline flowing and makes failures visible.' },
    hints: [
      'Hint 1: a min-heap of <code>(ready_time, seq, job_index)</code> gives the next job; seq breaks ties in queue order.',
      'Hint 2: the next attempt starts at <code>max(clock, ready_time)</code>; that covers both "pick a ready job" and "jump to the earliest one".',
      'Hint 3: track attempts and retries per job; a failure with <code>retries == max_retries</code> goes to the DLQ, otherwise retries += 1 and push with ready = e + base × 2<sup>retries−1</sup>.'
    ],
    solution: {
      approach: `<p>Because there is one worker and the heap is ordered by <code>(ready_time, seq)</code>, popping the minimum always yields the right job: if its ready time is in the past, it is the earliest-ready (ties by queue order); if it is in the future, no job is ready and the clock must jump to it. That is exactly what Celery/RQ do with delayed retries (a sorted set by ETA). The output shows how backoff reorders work and when the DLQ catches a poison job.</p>`,
      code: { lang: 'python', run: true, code: `import heapq


def run_jobs(names: list[str], fails: list[int], max_retries: int, base: int) -> list[str]:
    heap = [(0, i, i) for i in range(len(names))]      # (ready_time, seq, job)
    heapq.heapify(heap)
    seq = len(names)
    attempts = [0] * len(names)
    retries = [0] * len(names)
    clock, events = 0, []
    while heap:
        ready, _, j = heapq.heappop(heap)
        start = max(clock, ready)
        clock = start + 1
        attempts[j] += 1
        if attempts[j] > fails[j]:
            events.append(f"{names[j]}:ok@{clock}")
        elif retries[j] == max_retries:
            events.append(f"{names[j]}:dlq@{clock}")
        else:
            retries[j] += 1
            heapq.heappush(heap, (clock + base * 2 ** (retries[j] - 1), seq, j))
            seq += 1
    return events


print(run_jobs(["a", "b", "c"], [2, 0, 1], 3, 1))   # ['b:ok@2', 'c:ok@5', 'a:ok@7']` },
      complexity: `<p>O(A log n) for A total attempts (at most n × (max_retries + 1)), O(n) memory.</p>`,
      followUps: ['Add full jitter with a seeded RNG and keep it testable.', 'Add k parallel workers.', 'How would you redrive the DLQ safely?']
    },
    tests: { fn: 'run_jobs', sig: 'string[] int[] int int -> string[]', cases: [
      [[['a', 'b'], [0, 0], 3, 2], ['a:ok@1', 'b:ok@2']], [[['a', 'b'], [1, 0], 3, 2], ['b:ok@2', 'a:ok@4']],
      [[['a'], [5], 2, 1], ['a:dlq@6']], [[['a', 'b', 'c'], [2, 0, 1], 3, 1], ['b:ok@2', 'c:ok@5', 'a:ok@7']],
      [[[], [], 3, 1], []], [[['x'], [1], 0, 5], ['x:dlq@1']], [[['a', 'b'], [1, 1], 1, 10], ['a:ok@12', 'b:ok@13']]
    ] }
  });

  practice.push({
    title: 'Design a Pipeline to Send 1M Emails',
    level: 'Hard', tags: ['task queue', 'celery', 'rate limiting', 'idempotency', 'design'], companies: ['Mailchimp', 'Swiggy', 'Booking.com'],
    statement: `<p>Marketing wants to send a campaign to <b>1,000,000</b> users. The email provider allows <b>500 sends/s</b> per account and returns 429 above that, plus occasional 5xx. Requirements: no user gets the email twice, users who unsubscribed in the last minute are skipped, the campaign can be paused and resumed, progress is visible, and the API that starts it must answer in under 200 ms. Design it with FastAPI, Postgres, Redis and Celery (or arq).</p>`,
    constraints: `<p>Finish within ~1 hour. Workers may crash at any point. The campaign may be re-run by mistake.</p>`,
    example: `<p>1,000,000 ÷ 500/s = 2,000 s ≈ ${H.c('b', '33 minutes')} of pure sending at the limit, so the budget is fine if the pipeline keeps the provider busy and never exceeds the limit.</p>`,
    brute: {
      why: `<p>One task per user enqueued from the API request (1M <code>delay()</code> calls blocks the request for minutes), or one giant task looping over all users (a crash at user 600,000 restarts from zero and re-sends). Neither has rate limiting, so the provider answers 429 to most calls.</p>`,
      code: `@app.post("/campaigns/{cid}/send")
def send(cid: int):
    for user in all_users():               # 1M rows inside the request
        send_email_task.delay(user.id, cid) # minutes of enqueueing; rerun = 1M duplicates
    return {"ok": True}`
    },
    mcq: { q: 'What makes a mistaken re-run of the campaign harmless?', options: ['A UNIQUE (campaign_id, user_id) row claimed before each send, plus the provider idempotency key', 'Running only one worker', 'A longer TTL', 'Turning off retries'], answer: 0, explain: 'Exactly-once effect comes from a durable dedupe key per (campaign, recipient), not from delivery guarantees.' },
    hints: [
      'Hint 1: the API only inserts a <code>campaigns</code> row (status=queued) and enqueues ONE planner task, then returns 202 with the campaign id.',
      'Hint 2: the planner pages through users by keyset (id &gt; last_id LIMIT 1000) and enqueues batch tasks; a <code>deliveries(campaign_id, user_id) UNIQUE</code> table is the dedupe and progress record.',
      'Hint 3: a shared Redis token bucket (500/s) gates sends; 429/5xx retry with backoff + jitter; pause = a flag checked by the planner and each batch; progress = counts from deliveries.'
    ],
    solution: {
      approach: `<p><b>API (fast):</b> <code>POST /campaigns/{id}/send</code> sets the campaign to <code>queued</code> (only from <code>draft</code>, a state-machine guard so a double click does nothing) and enqueues one <code>plan_campaign(id)</code> via the outbox. Returns 202 + status URL.</p>
        <p><b>Planner:</b> pages users with keyset pagination (1,000 per page), stores the cursor on the campaign row after each page (so a crash resumes, not restarts), and enqueues <code>send_batch(campaign_id, first_id, last_id)</code>. It stops when the campaign is <code>paused</code>.</p>
        <p><b>Batch worker</b> (<code>acks_late</code>, prefetch 1, its own <code>emails</code> queue): for each user in the range, skip unsubscribed users (read at send time, not plan time), then <code>INSERT INTO deliveries (campaign_id, user_id, status) VALUES (..., 'sending') ON CONFLICT DO NOTHING RETURNING id</code>. No row returned = already handled, skip. Take a token from a shared Redis token bucket (500/s, Lua script) or wait. Send with <code>Idempotency-Key: campaign-{cid}-user-{uid}</code>, then mark <code>sent</code>. 429/5xx: retry with exponential backoff + jitter, honouring <code>Retry-After</code>; 4xx (bad address) → <code>failed</code>, no retry. Rows stuck in <code>sending</code> for 10 min are re-checked by a sweeper (the provider key makes a resend harmless).</p>
        <p><b>Capacity:</b> 500/s at ~200 ms per call needs ≈ 100 concurrent sends: e.g. 4 arq workers × 25 concurrent jobs, or Celery with threads/gevent pools; prefork with 100 processes would waste memory. <b>Visibility:</b> progress = <code>COUNT(*) GROUP BY status</code> on deliveries for this campaign; metrics for sends/s, 429s, queue age; DLQ for batches that fail repeatedly. <b>Re-run by mistake:</b> the UNIQUE key turns every duplicate into a no-op.</p>`,
      code: { lang: 'python', code: `import os

from celery import Celery
from sqlalchemy import text

from app.db import SessionLocal
from app.mail import provider_send, RateLimited, TransientMailError
from app.ratelimit import take_token          # Redis Lua token bucket shared by all workers

celery_app = Celery("mail", broker=os.environ["CELERY_BROKER_URL"])


@celery_app.task(bind=True, acks_late=True, autoretry_for=(RateLimited, TransientMailError),
                 retry_backoff=2, retry_backoff_max=300, retry_jitter=True, max_retries=10)
def send_batch(self, campaign_id: int, first_id: int, last_id: int) -> int:
    sent = 0
    with SessionLocal() as db:
        if db.execute(text("SELECT status FROM campaigns WHERE id = :c"), {"c": campaign_id}).scalar() == "paused":
            return 0
        users = db.execute(
            text("SELECT id, email FROM users WHERE id BETWEEN :a AND :b AND NOT unsubscribed ORDER BY id"),
            {"a": first_id, "b": last_id},
        ).all()
        for uid, email in users:
            claimed = db.execute(
                text("INSERT INTO deliveries (campaign_id, user_id, status) VALUES (:c, :u, 'sending') "
                     "ON CONFLICT (campaign_id, user_id) DO NOTHING RETURNING id"),
                {"c": campaign_id, "u": uid},
            ).first()
            db.commit()
            if claimed is None:
                continue                                    # already sent or in progress
            take_token("provider:emails", rate=500, capacity=500)   # blocks until allowed
            provider_send(email, campaign_id, idempotency_key=f"campaign-{campaign_id}-user-{uid}")
            db.execute(text("UPDATE deliveries SET status = 'sent' WHERE campaign_id = :c AND user_id = :u"),
                       {"c": campaign_id, "u": uid})
            db.commit()
            sent += 1
    return sent` },
      complexity: `<p>≈ 1,000 batch tasks, 1M dedupe inserts (indexed), 1M sends paced at 500/s ≈ 33–40 minutes end to end.</p>`,
      followUps: ['How do you prioritise transactional emails over the campaign?', 'How do you handle bounces and complaints coming back by webhook?']
    },
    tests: { skip: 'infrastructure wiring, verified by reading' }
  });

  practice.push({
    title: 'Zero-Downtime Deploys for API, Workers and Migrations',
    level: 'Hard', tags: ['deployment', 'gunicorn', 'celery', 'migrations', 'kubernetes'], companies: ['GitLab', 'Monzo', 'Shopify'],
    statement: `<p>Every deploy of your FastAPI + Celery service (Kubernetes, Postgres, Redis broker) causes: a burst of 502s at the load balancer, a few tasks that fail with "column does not exist", and occasionally duplicated emails. The release renames <code>orders.total</code> to <code>orders.total_cents</code>. Design a deploy process that has none of these problems.</p>`,
    constraints: `<p>Old and new code versions run side by side for several minutes during a rolling update. Celery tasks may be queued by the old version and executed by the new one (and vice versa).</p>`,
    example: `<p>The "column does not exist" errors come from the rename: new code reads <code>total_cents</code> while old pods still write <code>total</code>, or the migration dropped <code>total</code> while old workers still run.</p>`,
    brute: {
      why: `<p>"Run <code>alembic upgrade head</code> in the container entrypoint and rename the column in one migration": every pod races to migrate, old pods break the moment the column disappears, and SIGKILLed workers lose or repeat tasks.</p>`,
      code: { lang: 'bash', code: `# entrypoint.sh (the naive version)
alembic upgrade head          # every replica runs it at startup, racing each other
exec gunicorn app.main:app -c gunicorn.conf.py` }
    },
    mcq: { q: 'Which migration strategy lets old and new code run together?', options: ['Expand/contract: add the new column, dual-write and backfill, switch reads, drop the old column in a later release', 'Rename the column in one migration', 'Stop all pods, migrate, start all pods', 'Let each pod migrate at startup'], answer: 0, explain: 'Each step is compatible with both the previous and the next code version, so a rolling update never sees a schema it does not understand.' },
    hints: [
      'Hint 1: 502s mean connections reach pods that are shutting down; think readiness, preStop and graceful_timeout.',
      'Hint 2: schema changes must be backward compatible for one release (expand/contract), and migrations run once as a separate Job before the rollout.',
      'Hint 3: task payloads are an API between versions too: add fields with defaults, keep old task names working, and keep tasks idempotent for redeliveries during worker restarts.'
    ],
    solution: {
      approach: `<p><b>1. HTTP traffic.</b> Readiness probe on <code>/ready</code>; <code>preStop: sleep 5</code> so endpoints are removed before SIGTERM; exec-form CMD so Gunicorn gets SIGTERM; <code>graceful_timeout</code> 30 s and <code>terminationGracePeriodSeconds</code> 45 s; keep-alive longer than the LB idle timeout; <code>maxUnavailable: 0, maxSurge: 25%</code> in the rollout.</p>
        <p><b>2. Schema: expand/contract over three releases.</b> R1: migration adds <code>total_cents</code> (nullable); code writes both columns and reads <code>total</code>; a batched backfill job fills old rows. R2: code reads <code>total_cents</code>, still writes both; add NOT NULL once backfilled. R3: stop writing <code>total</code>, then a later migration drops it. Migrations run as a Kubernetes Job (or CI step) <b>once</b>, before the rollout, with <code>lock_timeout</code> set so DDL cannot block traffic.</p>
        <p><b>3. Workers.</b> SIGTERM triggers Celery's warm shutdown (finish current tasks); grace period longer than the longest task, or rely on <code>acks_late</code> + <code>task_reject_on_worker_lost</code> for redelivery. Task signatures are versioned like an API: only add optional kwargs, never rename a task in one step (register the new name and keep the old one as an alias for a release). Because redelivery can happen during restarts, email tasks use idempotency keys, which removes the duplicate emails.</p>
        <p><b>4. Beat.</b> One replica with <code>strategy: Recreate</code> so two schedulers never overlap. <b>5. Verify.</b> The deploy is "done" only when 5xx rate, task failure rate and queue age stay flat; otherwise roll back (possible because every step was backward compatible).</p>`,
      code: { lang: 'yaml', code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate: {maxUnavailable: 0, maxSurge: 1}
  selector:
    matchLabels: {app: orders-api}
  template:
    metadata:
      labels: {app: orders-api}
    spec:
      terminationGracePeriodSeconds: 45
      containers:
        - name: api
          image: registry.example.com/orders-api:GIT_SHA
          args: ["gunicorn", "app.main:app", "-c", "gunicorn.conf.py"]
          envFrom:
            - secretRef: {name: orders-api-env}      # DATABASE_URL, REDIS_URL: never in the image
          readinessProbe:
            httpGet: {path: /ready, port: 8000}
            periodSeconds: 5
          livenessProbe:
            httpGet: {path: /health, port: 8000}
            periodSeconds: 10
          lifecycle:
            preStop:
              exec: {command: ["sleep", "5"]}` },
      complexity: `<p>Three releases for a rename instead of one, in exchange for zero downtime and safe rollback at every step.</p>`,
      followUps: ['How do you backfill 200M rows without locking the table?', 'How would you canary the new worker version?']
    },
    tests: { skip: 'infrastructure wiring, verified by reading' }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'When do FastAPI <code>BackgroundTasks</code> run?', options: ['After the response is sent, in the same worker process', 'In a separate Celery worker', 'Before the response, blocking the client', 'In a new OS process per task'], answer: 0, explain: 'Starlette runs them after sending the response, inside the same ASGI call; a crash or deploy loses them.' });
  quiz.push({ q: 'A Celery task has <code>acks_late=True</code>. The worker is killed after the email was sent but before the ack. What happens?', options: ['The message is redelivered and the email may be sent twice unless the task is idempotent', 'The message is lost', 'Celery detects the email was sent and skips it', 'The broker deletes the message after 1 s'], answer: 0, explain: 'Late ack gives at-least-once delivery: no loss, possible duplicates.' });
  quiz.push({ q: 'With the Redis broker, a task is scheduled with <code>countdown=7200</code> and the default <code>visibility_timeout</code>. What is the risk?', options: ['The unacked reserved message is restored after 1 h and another worker runs it too', 'The task runs immediately', 'The task is silently dropped after 1 h', 'Redis rejects countdowns over 1 h'], answer: 0, explain: 'ETA tasks are held unacked by a worker; after the visibility timeout (default 3600 s) Redis hands them out again.' });
  quiz.push({ q: 'Full jitter backoff with base 1 s and cap 60 s: what is the wait before retry number 3 (0-based r = 3)?', options: ['A random value between 0 and 8 s', 'Exactly 8 s', 'Exactly 3 s', 'A random value between 0 and 60 s'], answer: 0, explain: 'Ceiling = min(60, 1 × 2<sup>3</sup>) = 8; full jitter draws uniformly from 0 to the ceiling.' });
  quiz.push({ q: 'Which error should a worker NOT retry?', options: ['HTTP 422 from the partner: the request is invalid', 'HTTP 503', 'A connection timeout', 'HTTP 429 with Retry-After'], answer: 0, explain: 'A validation error will fail the same way every time; send it to the dead-letter path and fix the data or the bug.' });
  quiz.push({ q: 'What makes an idempotency key effective against double charges?', options: ['It is UNIQUE and inserted in the same transaction as the charge record (or honoured by the provider)', 'It is random per attempt', 'It is stored only in the worker\'s memory', 'It is logged'], answer: 0, explain: 'The key must identify the business action (same on every retry) and be checked atomically with the effect.' });
  quiz.push({ q: 'In cache-aside, when should the cached key be deleted on an update?', options: ['After the database transaction commits', 'Before the transaction starts', 'Never; wait for the TTL', 'Inside the transaction before the UPDATE'], answer: 0, explain: 'Deleting before commit lets a reader refill the cache with the old row in between.' });
  quiz.push({ q: 'Why is <code>@functools.lru_cache</code> on an <code>async def</code> function a bug?', options: ['It caches the coroutine object, which can only be awaited once', 'It is not thread-safe', 'It ignores maxsize', 'It only works with ints'], answer: 0, explain: 'The second caller gets the same, already-awaited coroutine and fails; use async-lru or cache results yourself.' });
  quiz.push({ q: 'A container has a 2-CPU limit on a 64-core node. Uvicorn workers, 300 MB each, 4 GB memory. Good starting worker count?', options: ['2', '129', '64', '13'], answer: 0, explain: 'Async workers ≈ one per allowed CPU = 2; memory allows ~12. Using the host core count would start 64 or 129 workers.' });
  quiz.push({ q: 'Why use exec-form <code>CMD ["gunicorn", ...]</code> in a Dockerfile?', options: ['So the server is PID 1 and receives SIGTERM for a graceful shutdown', 'It makes the image smaller', 'It is required for multi-stage builds', 'It enables the HEALTHCHECK'], answer: 0, explain: 'Shell form makes /bin/sh PID 1, which does not forward SIGTERM; Docker then SIGKILLs the app after the timeout.' });
  quiz.push({ q: 'Prometheus scrapes a FastAPI app running 4 Gunicorn workers with plain <code>prometheus_client</code>. What do you see?', options: ['Counters that jump around, because each scrape hits a different worker\'s registry', 'Correct totals', 'No metrics at all', 'Metrics multiplied by 4'], answer: 0, explain: 'Each process has its own registry; use multiprocess mode (PROMETHEUS_MULTIPROC_DIR) or one process per container.' });
  quiz.push({ q: 'Which label is a cardinality bomb on <code>http_requests_total</code>?', options: ['<code>user_id</code>', '<code>method</code>', '<code>route</code> template like <code>/orders/{id}</code>', '<code>status</code>'], answer: 0, explain: 'Every distinct label value creates a new time series; user ids create millions.' });
  quiz.push({ q: 'In Django, how do you enqueue a Celery task so the worker can see the new row?', options: ['<code>transaction.on_commit(lambda: task.delay(obj.id))</code>', 'Call <code>task.delay</code> inside <code>atomic()</code> before commit', 'Use <code>time.sleep(1)</code> before <code>delay</code>', 'Pass the model instance with pickle'], answer: 0, explain: 'on_commit runs the callback only after the transaction commits, so the worker never reads a row that does not exist yet.' });
  quiz.push({ q: 'Why prefer <code>python:3.12-slim</code> over <code>python:3.12-alpine</code> for most Python services?', options: ['Alpine uses musl, so many packages lack wheels and compile from source, making images slower to build and sometimes larger', 'Alpine has no Python', 'Slim is always smaller', 'Alpine cannot run as non-root'], answer: 0, explain: 'manylinux wheels target glibc; slim (Debian) installs them directly.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({
    q: 'When would you use FastAPI BackgroundTasks, and when a task queue?', level: 'I',
    a: `<p>BackgroundTasks run after the response, in the same process, with no persistence, retries or visibility. I use them only for small, optional work where loss is acceptable: an audit log line, a cache warm-up, a metrics push. Anything that must happen (password reset, payment webhook, invoice), takes more than about a second, or uses CPU goes to a broker-backed queue (Celery, RQ, arq): the message survives deploys and crashes, gets retries with backoff, and runs on separate workers so web latency is unaffected. If the user needs the result of slow work, I return 202 with a job id and a status endpoint. For "must not lose", I also write the job in the same DB transaction as the business change (outbox), so a crash between commit and enqueue loses nothing.</p>`,
    followUps: ['What happens to BackgroundTasks during a Kubernetes rolling update?', 'How would you implement the job status endpoint?']
  });
  interview.push({
    q: 'Explain acks_late in Celery and its trade-off.', level: 'A',
    a: `<p>By default Celery acknowledges a message just before executing the task, so if the worker dies mid-task the message is gone: at-most-once. With <code>acks_late=True</code> it acknowledges after the task returns, so a crash causes redelivery: at-least-once. The trade-off is duplicates: if the crash happens after the side effect but before the ack, the task runs again. So acks_late requires idempotent tasks (dedupe key in the same transaction, provider idempotency keys, state-machine guards). I pair it with <code>task_reject_on_worker_lost=True</code> (requeue when the child process is killed), <code>worker_prefetch_multiplier=1</code> for long tasks, time limits, and a <code>visibility_timeout</code> longer than the longest task or ETA on Redis/SQS, otherwise the broker redelivers tasks that are still running.</p>`,
    followUps: ['Why can prefetching cause duplicates with Redis?', 'Which tasks would you leave with early ack?']
  });
  interview.push({
    q: 'Compare Celery, RQ and arq. Which would you choose for a FastAPI service?', level: 'I',
    a: `<p>Celery is the full-featured option: many brokers (RabbitMQ, Redis, SQS), routing to queues, canvas workflows (chain, group, chord), beat for schedules, result backends, rate limits, Flower monitoring and deep Django integration. Its tasks are synchronous functions run in a prefork pool. RQ is Redis-only and minimal: enqueue a function, a worker forks per job, simple retries and a scheduler flag; very easy to operate. arq is Redis-only and async-first: jobs are <code>async def</code> functions with a ctx, one worker runs many concurrent jobs, it has retries, cron jobs and job-id deduplication. For a fully async FastAPI service whose jobs are I/O-bound (HTTP calls, LLM APIs), I would pick arq or Taskiq. If I need RabbitMQ, complex routing, workflows or the team already runs Celery, Celery. For a handful of simple sync jobs, RQ.</p>`,
    followUps: ['How do you call async code from a Celery task?', 'When does a durable workflow engine beat a queue?']
  });
  interview.push({
    q: 'A customer was charged twice. Walk me through how you would find and fix the cause.', level: 'A',
    a: `<p>First, evidence: find both charges at the provider and match them to our logs by order id and request id. Typical causes: (1) the worker timed out waiting for the provider, the charge had actually succeeded, and the retry charged again; (2) the message was delivered twice (acks_late + crash, Redis visibility timeout shorter than the task or its ETA, or the producer enqueued twice after a timeout); (3) the user double-clicked and the API created two jobs. The fix is layered: an idempotency key per business action (<code>charge-order-42</code>) sent to the provider on every attempt; a UNIQUE row in our DB claimed in the same transaction as the payment record so a second run skips; a state-machine guard on the order (<code>pending → paid</code> only once); an idempotency key on the API endpoint for client retries; and config fixes (visibility timeout, no long countdowns). Then refund the customer, add a metric for "duplicate execution skipped", and write a test that delivers the same message twice.</p>`,
    followUps: ['How long do you keep idempotency keys?', 'What if the provider has no idempotency support?']
  });
  interview.push({
    q: 'How do you design retries for a flaky third-party API?', level: 'I',
    a: `<p>Classify errors: retry only transient ones (timeouts, connection errors, 408/425/429/5xx except 501), never validation or auth errors. Use exponential backoff with full jitter (<code>random(0, min(cap, base × 2<sup>n</sup>))</code>), a cap, a max number of attempts and a total deadline, and honour <code>Retry-After</code>. Give every attempt its own timeout. Make the call idempotent before retrying anything non-GET. Retry at one layer only, because retries multiply across layers; add a retry budget or circuit breaker so retries switch off when the dependency is fully down. Throttle proactively with a shared token bucket if the API has a known rate limit. After the last attempt, send the job to a dead-letter queue with the error, and alert on DLQ growth. In code: tenacity's <code>wait_random_exponential</code> or Celery's <code>autoretry_for</code> + <code>retry_backoff</code> + <code>retry_jitter</code>.</p>`,
    followUps: ['Why is full jitter better than a fixed delay?', 'How do official LLM SDK retries interact with yours?']
  });
  interview.push({
    q: 'How would you add Redis caching to a FastAPI endpoint? What can go wrong?', level: 'I',
    a: `<p>Create one <code>redis.asyncio</code> client per process in lifespan from <code>REDIS_URL</code>, with short socket timeouts, and close it with <code>aclose()</code>. Implement cache-aside: GET the key; on hit, deserialize; on miss, load from the DB and SET with a TTL plus jitter. Keys are namespaced and versioned (<code>shop:product:v3:42</code>). On updates, delete the key after commit. Things that go wrong: stampedes when a hot key expires (fix with a SET NX lock or early refresh), stale reads from invalidating before commit, cache penetration from missing ids (negative caching), unbounded memory (TTL everywhere, maxmemory policy), Redis outages taking the API down (treat errors as misses), pickle security issues (use JSON), per-user data in shared keys, and evictions deleting Celery messages when the broker shares a Redis with the cache.</p>`,
    followUps: ['How do you implement single-flight across pods?', 'When would you choose write-through instead?']
  });
  interview.push({
    q: 'Explain write-through versus write-behind with examples.', level: 'I',
    a: `<p>Write-through writes the database and the cache synchronously on every update, so the cache is always fresh and nothing is lost, but every write pays the DB cost. It fits data read right after being written with a strict freshness need and a moderate write rate: user settings, a feature-flag service, exchange rates written by a refresh job. Write-behind (write-back) writes to the cache or an in-memory buffer immediately and flushes to the database later in batches, coalescing many updates to the same key into one row write. It turns 1,000 view-count increments into a few batched UPDATEs, but anything not yet flushed is lost if the process or cache dies, and the DB is temporarily behind. So write-behind is for counters, analytics and metrics, never for money or orders. Implementation: Redis INCR plus a periodic flush with GETDEL, or an in-process buffer flushed by size and time.</p>`,
    followUps: ['How do you make the flush safe to retry?', 'What happens to reads while the DB is behind?']
  });
  interview.push({
    q: 'Implement an LRU cache in Python and discuss using it in a web server.', level: 'B',
    a: `<p>Use <code>collections.OrderedDict</code>: <code>get</code> returns -1 if missing, otherwise <code>move_to_end(key)</code> and return the value; <code>put</code> sets the value, moves it to the end, and if the size exceeds capacity calls <code>popitem(last=False)</code> to evict the least recently used. Both are O(1) because OrderedDict is a hash map plus a doubly linked list. For pure functions, <code>functools.lru_cache(maxsize=N)</code> does this in C with <code>cache_info()</code> stats. In a server: each worker process has its own copy, so invalidation needs short TTLs or a pub/sub broadcast; threadpool routes need a lock around a hand-made cache; <code>lru_cache</code> has no TTL, does not work on async functions, leaks instances when used on methods, and returns shared mutable objects. I size it by count or bytes and export hit/miss/eviction metrics.</p>`,
    followUps: ['Add a TTL.', 'How would you implement it without OrderedDict?']
  });
  interview.push({
    q: 'How do you build a production Docker image for a Python API?', level: 'I',
    a: `<p>Multi-stage: a builder from <code>python:3.12-slim</code> installs locked dependencies into a venv (<code>uv sync --locked --no-dev</code> with a cache mount, or <code>pip install --no-cache-dir --require-hashes -r requirements.txt</code> from pip-tools), copying only the lock files first so the dependency layer is cached across code changes. The runtime stage is also slim, copies only the venv and the code, installs only runtime system libs (libpq5, not libpq-dev), creates a non-root user with a fixed uid, sets <code>PYTHONUNBUFFERED=1</code>, uses an exec-form CMD (Gunicorn with Uvicorn workers or plain Uvicorn), exposes a port and has a HEALTHCHECK for Docker/Compose (Kubernetes uses probes). A <code>.dockerignore</code> excludes .git, venvs, caches and .env. No secrets in ENV or layers; build secrets use BuildKit secret mounts. Pin the base image by digest with automated bumps, scan with Trivy, and tag with the git SHA. One image serves API, workers, beat and migration jobs with different commands.</p>`,
    followUps: ['Why not Alpine?', 'How do you keep ML model weights out of the image?']
  });
  interview.push({
    q: 'How many Gunicorn/Uvicorn workers would you run, and how do you shut them down safely?', level: 'A',
    a: `<p>Start from the container's limits, not the host: read the cgroup CPU quota or set <code>WEB_CONCURRENCY</code> explicitly. Sync workers (Django/Flask): about 2 × CPUs + 1, or fewer workers with gthread threads. Uvicorn async workers: about one per CPU. Then cap by memory: (limit − headroom) ÷ worker RSS, and check the database budget: pods × workers × pool size ≤ max_connections. Load-test and watch p99 and CPU. In Kubernetes I often run one process per pod and scale replicas. Safe shutdown: readiness fails first and a preStop sleep lets load balancers drop the pod; exec-form CMD so Gunicorn gets SIGTERM; <code>graceful_timeout</code> lets in-flight requests finish; lifespan closes pools; <code>terminationGracePeriodSeconds</code> is longer than all of that; keep-alive is longer than the LB idle timeout; <code>max_requests</code> with jitter recycles leaky workers.</p>`,
    followUps: ['What does --preload change?', 'What does WORKER TIMEOUT usually mean in an async app?']
  });
  interview.push({
    q: 'How do you correlate logs for one request across an async FastAPI app and Celery workers?', level: 'A',
    a: `<p>A middleware reads <code>X-Request-ID</code> (or generates one), stores it in a <code>contextvars.ContextVar</code> and echoes it in the response. A logging filter copies it onto every record, and a JSON formatter outputs it as a field. ContextVars are per asyncio task, so concurrent requests never mix ids, and Starlette's threadpool copies the context into sync routes; for my own thread pools I use <code>copy_context().run</code>. For Celery, the ID must travel in the message: a <code>before_task_publish</code> signal adds it to the headers, <code>task_prerun</code> sets the ContextVar in the worker and <code>task_postrun</code> resets it. With OpenTelemetry, the trace context propagates the same way automatically, and I add <code>trace_id</code> to logs so I can jump from a log line to the whole trace across API, Redis, Celery and external calls.</p>`,
    followUps: ['Why do thread-locals fail in asyncio?', 'How do you sample logs without losing errors?']
  });
  interview.push({
    q: 'Which metrics would you expose for an API and its workers, and how with Python?', level: 'A',
    a: `<p>API (RED): <code>http_requests_total{method, route, status}</code> counter, <code>http_request_duration_seconds{method, route}</code> histogram with buckets around the SLO, and an in-flight gauge. Workers: jobs processed by task and outcome, job duration histograms, retries and dead letters, queue depth and, most important, the age of the oldest job per queue. Dependencies: DB pool checkout wait, Redis latency, cache hits/misses per prefix. With <code>prometheus_client</code> I define Counter/Histogram/Gauge objects, use route templates as labels (low cardinality), and mount <code>make_asgi_app()</code> at /metrics. With several Gunicorn workers I use multiprocess mode (PROMETHEUS_MULTIPROC_DIR, MultiProcessCollector, mark_process_dead in child_exit) or one process per pod. Alternatively OTel metrics exported over OTLP. Alerts are on symptoms: error ratio, latency SLO burn, queue age.</p>`,
    followUps: ['Why are histograms better than averages?', 'How do you count the cost of LLM calls?']
  });
  interview.push({
    q: 'Django or FastAPI: how do you decide?', level: 'I',
    a: `<p>I decide on the product's shape and the team. Django gives an ORM with migrations, auth, sessions, forms, an admin back-office and a huge ecosystem (DRF, allauth, Celery integration), so CRUD-heavy products, content sites, internal tools and monoliths with many models ship fastest there. FastAPI is async-native and typed: Pydantic validation, automatic OpenAPI, cheap concurrency for long I/O (streaming, websockets, many outbound calls, LLM gateways) and small focused services; you assemble the rest (SQLAlchemy, Alembic, auth). Performance rarely decides: the database dominates both. A team that knows Django ships faster in Django. Mixed setups are common: a Django monolith with admin plus a FastAPI service for async streaming, sharing Postgres and a Celery broker. If a Django team wants FastAPI-style typed endpoints, Django Ninja is a middle ground.</p>`,
    followUps: ['What are the limits of async Django today?', 'How does background work differ between them?']
  });

  /* =====================================================================
     REGISTER
     ===================================================================== */
  registerModule({
    id: 'be21',
    title: 'Python Backend V: Async Workers, Caching & Deployment',
    lang: 'python',
    langExplain: `<p>This module belongs to the <b>Python backend route</b>, so every example is Python (plus Dockerfiles, YAML and shell commands where those are the real artefacts). The ideas, such as queues, idempotency, caching, worker sizing and observability, carry over to Java and Node; Backend 9, 13 and 16 cover them for those stacks.</p>`,
    intro: `<p>Your FastAPI service works, stores data with SQLAlchemy and is secured. This final module of the Python backend route makes it <b>production-grade</b>: slow work moves off the request path, hot data is served from caches, and the whole thing ships as a small, safe container that runs with the right number of workers and tells you what it is doing.</p>
      <p>You will decide what may run in <b>BackgroundTasks</b> and what needs a <b>task queue</b> (Celery, RQ, arq); configure Celery safely (<code>acks_late</code>, retries with backoff and jitter, beat, result backends); make jobs <b>idempotent</b> so redeliveries and double clicks never double-charge; implement <b>Redis caching</b> with <code>redis.asyncio</code>, stampede locks, write-through and write-behind; use <b>in-process LRU caches</b> wisely; build <b>multi-stage, non-root Docker images</b> with locked dependencies; size <b>Gunicorn/Uvicorn workers</b> and shut them down gracefully; and wire <b>structured logs, Prometheus metrics and OpenTelemetry</b>. A last topic compares <b>Django and DRF</b> so you can choose the right framework. Many ideas come with runnable standard-library demos: a job queue with retries and a dead-letter list, cache-aside with single-flight, a JSON logger with request ids, and a hand-built <code>/metrics</code> page.</p>`,
    goals: [
      'Choose between inline work, FastAPI <code>BackgroundTasks</code>, and a broker-backed task queue, and explain what each loses on a crash or deploy',
      'Configure Celery for production (<code>acks_late</code>, <code>task_reject_on_worker_lost</code>, prefetch, time limits, JSON serialization, <code>visibility_timeout</code>, beat, result backends) and write the same job in RQ and arq',
      'Design retry policies (transient vs permanent errors, exponential backoff with full jitter, caps, dead-letter queues) and make jobs idempotent with keys, UNIQUE constraints and state-machine guards',
      'Implement cache-aside with <code>redis.asyncio</code> including TTL jitter, delete-after-commit invalidation, negative caching and a cross-process single-flight lock; explain write-through vs write-behind',
      'Use <code>functools.lru_cache</code> and an OrderedDict LRU correctly, and design a two-level (in-process + Redis) cache with bounded staleness',
      'Build a small, reproducible, non-root Python image with a multi-stage Dockerfile, uv or pip-tools lockfiles, <code>.dockerignore</code> and a HEALTHCHECK',
      'Size Gunicorn/Uvicorn workers from container CPU and memory limits and configure timeouts and graceful shutdown',
      'Emit JSON logs with request ids via <code>contextvars</code>, expose Prometheus metrics (including multiprocess mode), and add OpenTelemetry tracing across API and workers',
      'Compare Django/DRF with FastAPI and recommend one for a given product and team'
    ],
    prereqs: `<p><b>Required:</b> <b>Python Backend II</b> (Databases with SQLAlchemy &amp; Alembic: sessions, transactions, connection pools) and <b>Python Backend III</b> (Auth, Security &amp; Configuration: settings and secrets from the environment), which both build on <b>Python Backend I</b> (FastAPI Fundamentals: lifespan, dependencies, <code>async def</code> vs <code>def</code>). Helpful: <b>Backend 9</b> (Caching &amp; Asynchronous Processing), which teaches Redis data structures and queue theory that this module applies in Python without repeating, and the DevOps module <b>Containers with Docker</b> for image and layer basics. Python Backend IV (Testing) is useful but not required. Python 3.11+, Docker, and a local Redis (for the library examples; the runnable demos need only the standard library). No Java required.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
