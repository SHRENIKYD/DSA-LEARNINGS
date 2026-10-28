(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // String.raw keeps backslashes exactly as typed, so Python regexes stay intact.
  var R = String.raw;

  /* ----------------------------------------------------------------------
     Shared visualizer helpers for py14 (Packaging, Environments & Tooling)
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function words(s) { return String(s === undefined ? '' : s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }
  function normName(n) { return String(n).toLowerCase().replace(/[-_.]+/g, '-'); }
  // Tiny PEP 440 subset parser for the visualizers (release + pre + post + dev).
  function parseVer(t) {
    var m = /^v?(?:(\d+)!)?(\d+(?:\.\d+)*)(?:[-_.]?(a|b|rc)(\d*))?(?:[-_.]?post(\d*))?(?:[-_.]?dev(\d*))?$/i.exec(String(t).trim());
    if (!m) throw new Error('Use versions like 1.2.3, 2.0rc1, 1.0.post2 or 3.1.dev4');
    var rel = m[2].split('.').map(Number), trimmed = rel.slice();
    while (trimmed.length > 1 && trimmed[trimmed.length - 1] === 0) trimmed.pop();
    return { text: t, epoch: Number(m[1] || 0), rel: rel, trimmed: trimmed, pre: m[3] ? [m[3].toLowerCase(), Number(m[4] || 0)] : null,
      post: m[5] !== undefined ? Number(m[5] || 0) : null, dev: m[6] !== undefined ? Number(m[6] || 0) : null };
  }
  function cmpArr(a, b) {
    var n = Math.max(a.length, b.length);
    for (var i = 0; i < n; i++) { var x = a[i] || 0, y = b[i] || 0; if (x !== y) return x < y ? -1 : 1; }
    return 0;
  }
  // Sort keys mirroring packaging's _cmpkey: [rank, n...] arrays.
  function preKey(v) { var P = { a: 0, b: 1, rc: 2 }; if (!v.pre && v.post === null && v.dev !== null) return [0]; if (!v.pre) return [2]; return [1, P[v.pre[0]], v.pre[1]]; }
  function postKey(v) { return v.post === null ? [0] : [1, v.post]; }
  function devKey(v) { return v.dev === null ? [2] : [1, v.dev]; }

  /* ======================================================================
     Shared Python source pasted into several solutions (each solution must
     run on its own, so the code is embedded rather than imported).
     ====================================================================== */
  var VERSION_PY = R`import re

# PEP 440 version grammar (epoch, release, pre, post, dev, local).
_VERSION_RE = re.compile(
    r"^\s*v?(?:(?P<epoch>\d+)!)?(?P<release>\d+(?:\.\d+)*)"
    r"(?:[-_.]?(?P<pre_l>alpha|beta|preview|pre|rc|a|b|c)[-_.]?(?P<pre_n>\d*))?"
    r"(?:-(?P<post_n1>\d+)|[-_.]?(?P<post_l>post|rev|r)[-_.]?(?P<post_n2>\d*))?"
    r"(?:[-_.]?(?P<dev_l>dev)[-_.]?(?P<dev_n>\d*))?"
    r"(?:\+(?P<local>[a-z0-9]+(?:[-_.][a-z0-9]+)*))?\s*$",
    re.IGNORECASE,
)
_PRE = {"a": 0, "alpha": 0, "b": 1, "beta": 1, "rc": 2, "c": 2, "pre": 2, "preview": 2}
NEG, POS = (0,), (2,)          # sort sentinels: "minus infinity" / "plus infinity"


def parse_version(text):
    m = _VERSION_RE.match(text)
    if not m:
        raise ValueError(f"invalid version: {text!r}")
    pre = (_PRE[m["pre_l"].lower()], int(m["pre_n"] or 0)) if m["pre_l"] else None
    if m["post_n1"] is not None:
        post = int(m["post_n1"])
    elif m["post_l"]:
        post = int(m["post_n2"] or 0)
    else:
        post = None
    dev = int(m["dev_n"] or 0) if m["dev_l"] else None
    release = tuple(int(p) for p in m["release"].split("."))
    return {"epoch": int(m["epoch"] or 0), "release": release, "pre": pre,
            "post": post, "dev": dev, "local": m["local"]}


def version_key(text):
    v = parse_version(text)
    release = list(v["release"])
    while len(release) > 1 and release[-1] == 0:   # 1.0 == 1.0.0 == 1
        release.pop()
    if v["pre"] is None and v["post"] is None and v["dev"] is not None:
        pre = NEG                                   # 1.0.dev1 sorts before 1.0a1
    elif v["pre"] is None:
        pre = POS                                   # a final release beats its pre-releases
    else:
        pre = (1,) + v["pre"]
    post = NEG if v["post"] is None else (1, v["post"])
    dev = POS if v["dev"] is None else (1, v["dev"])
    if v["local"] is None:
        local = NEG
    else:                                           # numeric local segments beat text ones
        local = (1, tuple((1, int(s), "") if s.isdigit() else (0, 0, s.lower())
                          for s in re.split(r"[-_.]", v["local"])))
    return (v["epoch"], tuple(release), pre, post, dev, local)`;

  var SPEC_PY = VERSION_PY + R`


def is_prerelease(text):
    v = parse_version(text)
    return v["pre"] is not None or v["dev"] is not None


def _public(text):
    return text.split("+", 1)[0]


def _base_release(text):
    rel = list(parse_version(text)["release"])
    while len(rel) > 1 and rel[-1] == 0:
        rel.pop()
    return (parse_version(text)["epoch"], tuple(rel))


def _clause_ok(version, op, target):
    if target.endswith(".*"):                       # prefix match: ==1.4.*  /  !=1.4.*
        prefix = [int(p) for p in parse_version(target[:-2])["release"]]
        cand = parse_version(version)
        rel = list(cand["release"]) + [0] * len(prefix)
        same = cand["epoch"] == parse_version(target[:-2])["epoch"] and rel[:len(prefix)] == prefix
        return same if op == "==" else not same
    if op == "~=":                                  # ~=1.4.5  ==  >=1.4.5, ==1.4.*
        rel = parse_version(target)["release"]
        prefix = ".".join(str(p) for p in rel[:-1]) + ".*"
        return _clause_ok(version, ">=", target) and _clause_ok(version, "==", prefix)
    v = version if "+" in target else _public(version)
    kv, kt = version_key(v), version_key(target)
    if op == "==":
        return kv == kt
    if op == "!=":
        return kv != kt
    kv = version_key(_public(version))
    if op == ">=":
        return kv >= kt
    if op == "<=":
        return kv <= kt
    if op == ">":                                   # >1.7 must not admit 1.7.post1
        if parse_version(target)["post"] is None and parse_version(version)["post"] is not None \
                and _base_release(version) == _base_release(target):
            return False
        return kv > kt
    if op == "<":                                   # <1.7 must not admit 1.7rc1
        if not is_prerelease(target) and is_prerelease(version) \
                and _base_release(version) == _base_release(target):
            return False
        return kv < kt
    raise ValueError(f"unknown operator {op!r}")


def matches(version, spec):
    clauses = []
    for raw in spec.split(","):
        raw = raw.strip()
        if raw:
            m = re.match(r"^(~=|==|!=|<=|>=|<|>)\s*(\S+)$", raw)
            if not m:
                raise ValueError(f"bad clause {raw!r}")
            clauses.append((m[1], m[2]))
    allow_pre = any(op != "!=" and is_prerelease(t.rstrip(".*")) for op, t in clauses)
    if is_prerelease(version) and not allow_pre:
        return False                                # pre-releases are opt-in
    return all(_clause_ok(version, op, t) for op, t in clauses)`;

  /* ======================================================================
     TOPIC 1 — Virtual environments: venv, interpreters, PATH, site-packages
     ====================================================================== */
  topics.push({
    title: 'Virtual Environments: venv, PATH and site-packages',
    analogy: R`<p>Think of each project as a <b>separate kitchen</b>. Project A needs flour brand X version 2, project B needs brand X version 3. If both cook in one shared kitchen (your system Python), one recipe always breaks. A <b>virtual environment</b> is a small private kitchen next to the big one: it borrows the oven (the Python interpreter) but has its <b>own pantry</b> (<code>site-packages</code>). "Activating" it just puts that kitchen's door first on your list of doors to try.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> A virtual environment (venv) is a folder, usually <code>.venv/</code>, that contains:</p>
<ul><li><code>pyvenv.cfg</code> — a tiny text file saying which base interpreter it came from (<code>home = /usr/bin</code>, <code>version = 3.12.7</code>).</li>
<li><code>bin/python</code> (Windows: <code>Scripts\python.exe</code>) — a symlink or copy of the base interpreter.</li>
<li><code>lib/python3.12/site-packages/</code> — an empty pantry where <code>pip install</code> puts packages for <i>this project only</i>.</li></ul>
<p>When <code>bin/python</code> starts, it sees <code>pyvenv.cfg</code> one level up and sets <code>sys.prefix</code> to the venv folder, so imports look in the venv's <code>site-packages</code> instead of the global one. <code>sys.base_prefix</code> still points at the real installation (that is how you detect "am I in a venv?": <code>sys.prefix != sys.base_prefix</code>).</p>
<p><b>Activation is optional.</b> <code>source .venv/bin/activate</code> only (1) prepends <code>.venv/bin</code> to <code>PATH</code>, (2) sets <code>VIRTUAL_ENV</code>, and (3) changes your prompt. Running <code>.venv/bin/python script.py</code> directly works identically without activating — which is exactly what CI, Docker and <code>uv run</code> do.</p>
<p>The classic "it works on my machine" bug is a <b>PATH mix-up</b>: <code>pip</code> belongs to one interpreter and <code>python</code> to another. Always prefer <code>python -m pip install …</code> — it guarantees pip installs into the interpreter you are about to run.</p>`,
    clues: [
      '"ModuleNotFoundError, but I just pip installed it" → two interpreters; check <code>python -m pip --version</code> and <code>sys.executable</code>',
      '"error: externally-managed-environment" (PEP 668) → the OS Python refuses global installs; create a venv or use <code>pipx</code>/<code>uv tool</code>',
      '"how do you isolate dependencies per project?" → venv per project, never <code>sudo pip</code>',
      '"which python is running?" → <code>PATH</code> is searched left to right; activation just prepends <code>.venv/bin</code>',
      '"how does Python know it is in a venv?" → <code>pyvenv.cfg</code> next to the interpreter sets <code>sys.prefix</code>'
    ],
    code: [{ lang: 'bash', title: 'Create, use and inspect a venv (no activation needed)', code: R`
python3.12 -m venv .venv              # stdlib way; uv equivalent: uv venv --python 3.12
.venv/bin/python -m pip install requests
.venv/bin/python -c "import sys; print(sys.prefix, sys.base_prefix)"
cat .venv/pyvenv.cfg                  # home = /usr/bin, include-system-site-packages = false, version = 3.12.7
source .venv/bin/activate             # optional: prepends .venv/bin to PATH
which python                          # -> /path/to/project/.venv/bin/python
deactivate
` }, { lang: 'python', run: true, title: 'Am I inside a virtual environment?', code: R`
import sys, sysconfig

in_venv = sys.prefix != sys.base_prefix
print("interpreter   :", sys.executable)
print("in a venv?    :", in_venv)
print("prefix        :", sys.prefix)
print("site-packages :", sysconfig.get_paths()["purelib"])
` }],
    viz: [{
      title: 'How the shell finds "python" (PATH search, before vs after activate)',
      input: '.venv/bin /usr/local/bin /usr/bin',
      inputLabel: 'PATH directories, left to right (files: .venv/bin/python, /usr/bin/python, /usr/local/bin/pip)',
      gen: function (input) {
        var dirs = words(input).map(function (d) { return d.replace(/\/+$/, ''); });
        if (!dirs.length || dirs.length > 6) throw new Error('Give 1–6 directories separated by spaces');
        var files = ['.venv/bin/python', '.venv/bin/pip', '/usr/bin/python', '/usr/local/bin/pip'];
        var frames = [];
        frames.push(fr('You type <code>python</code>. The shell does not know where it lives, so it walks <code>PATH</code> <b>left to right</b> and runs the first match.', [
          { type: 'array', label: 'PATH', values: dirs.slice() },
          { type: 'set', label: 'executables that exist', items: files.slice() }
        ]));
        var found = -1;
        for (var i = 0; i < dirs.length; i++) {
          var hit = files.indexOf(dirs[i] + '/python') >= 0, hl = {}; hl[i] = hit ? 'ok' : 'cur';
          frames.push(fr('Check <code>' + esc(dirs[i]) + '/python</code> → ' + (hit ? '<b>exists — stop here</b>.' : 'not there, try the next directory.'), [
            { type: 'array', label: 'PATH', values: dirs.slice(), hl: hl, ptr: (function () { var p = {}; p[i] = 'look'; return p; })() },
            { type: 'vars', label: 'search', vals: { candidate: dirs[i] + '/python', found: hit } }
          ]));
          if (hit) { found = i; break; }
        }
        var winner = found >= 0 ? dirs[found] + '/python' : '(command not found)';
        var isVenv = found >= 0 && dirs[found].indexOf('.venv') === 0;
        frames.push(fr('Result: <code>' + esc(winner) + '</code>. ' + (isVenv ? 'That is the venv interpreter, so imports use <code>.venv/lib/.../site-packages</code>.' : 'That is <b>not</b> the venv — packages installed in .venv are invisible. Run <code>source .venv/bin/activate</code> (prepends .venv/bin) or call <code>.venv/bin/python</code> directly.'), [
          { type: 'vars', label: 'outcome', vals: { python: winner, sys_prefix: isVenv ? '/project/.venv' : '/usr', in_venv: isVenv }, hl: { python: isVenv ? 'ok' : 'bad' } }
        ]));
        var pipDir = -1;
        for (var j = 0; j < dirs.length; j++) if (files.indexOf(dirs[j] + '/pip') >= 0) { pipDir = j; break; }
        var pipW = pipDir >= 0 ? dirs[pipDir] + '/pip' : '(not found)';
        var mismatch = pipDir >= 0 && found >= 0 && (dirs[pipDir].indexOf('.venv') === 0) !== isVenv;
        frames.push(fr('Same search for <code>pip</code> finds <code>' + esc(pipW) + '</code>. ' + (mismatch ? H.c('r', 'pip and python come from different places') + ' — the classic "I installed it but import fails" bug. Use <code>python -m pip</code> so pip always matches python.' : 'pip and python agree. Still, <code>python -m pip</code> is the habit that makes this impossible to get wrong.'), [
          { type: 'table', label: 'who answers each command', columns: ['command', 'resolved to', 'installs into'], rows: [['python', winner, isVenv ? '.venv site-packages' : 'system site-packages'], ['pip', pipW, pipW.indexOf('.venv') === 0 ? '.venv site-packages' : 'system site-packages']], hl: mismatch ? { 1: 'bad' } : { 0: 'ok', 1: 'ok' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Detecting the "two interpreters" bug', html: R`<p>You run <code>pip install httpx</code> and then <code>python app.py</code> fails with <code>ModuleNotFoundError: httpx</code>. Diagnose in 10 seconds: <code>which -a python pip</code> and <code>python -m pip --version</code> (it prints the site-packages path). If pip says <code>/usr/lib/python3/...</code> but <code>python</code> is <code>.venv/bin/python</code>, they disagree. Fix: <code>python -m pip install httpx</code>.</p>`, code: { lang: 'bash', code: R`
which -a python pip
python -m pip --version     # pip 24.2 from /proj/.venv/lib/python3.12/site-packages/pip (python 3.12)
python -c "import sys; print(sys.executable)"
` } },
      { title: 'PEP 668: externally managed environments', html: R`<p>Debian/Ubuntu, Fedora and Homebrew Pythons ship an <code>EXTERNALLY-MANAGED</code> marker file. pip 23+ then refuses <code>pip install</code> outside a venv with <code>error: externally-managed-environment</code>, to stop you breaking OS tools that depend on system packages. The right answer is a venv for projects and <code>pipx install ruff</code> / <code>uv tool install ruff</code> for CLI tools — <i>not</i> <code>--break-system-packages</code>.</p>` },
      { title: 'Managing Python versions themselves', html: R`<p>A venv pins packages, not the interpreter version. To get Python 3.13 next to 3.12 use <code>uv python install 3.13</code> (downloads a standalone build), <code>pyenv</code>, or your OS packages. <code>.python-version</code> (read by uv and pyenv) records the version for the project, and <code>requires-python = "&gt;=3.11"</code> in <code>pyproject.toml</code> tells installers which interpreters may use the package.</p>`, code: { lang: 'bash', code: R`
uv python install 3.13
uv venv --python 3.13        # creates .venv from that interpreter
uv python pin 3.13           # writes .python-version
` } }
    ],
    deepDive: R`<p>🟣 <b>How startup finds packages.</b> On start-up the <code>site</code> module looks for <code>pyvenv.cfg</code> next to or one level above the executable. If it finds one, it sets <code>sys.prefix</code>/<code>sys.exec_prefix</code> to the venv and builds <code>sys.path</code> as: the script's directory (or <code>''</code> for <code>-c</code>/REPL), the stdlib zip and directories from the <i>base</i> install, then the venv's <code>site-packages</code>. <code>include-system-site-packages = true</code> adds the global site-packages after it. <code>.pth</code> files in site-packages add more entries — editable installs and <code>distutils-precedence.pth</code> use this hook. Python 3.11+ has <code>-P</code> / <code>PYTHONSAFEPATH=1</code> to <i>not</i> put the script directory first, which stops local files shadowing installed packages.</p>
<p><b>Venvs are not relocatable.</b> Console scripts in <code>bin/</code> have an absolute shebang (<code>#!/proj/.venv/bin/python</code>), so moving or copying a venv breaks them. In Docker, build the venv at the final path. <b>Symlinks vs copies:</b> on POSIX the venv interpreter is a symlink, so upgrading the base Python in place (3.12.6 → 3.12.7) silently upgrades the venv; a minor upgrade (3.12 → 3.13) needs a new venv because site-packages paths and compiled extension ABIs change. <code>uv venv</code> creates a venv in milliseconds and without seeding pip — install with <code>uv pip</code> or add <code>--seed</code>. <b>Conda</b> environments are a different model: they manage the interpreter and non-Python libraries (CUDA, MKL) too.</p>`,
    aiEra: R`<p>🤖 AI coding assistants often generate <code>pip install x</code> lines that land in the wrong interpreter, or suggest <code>sudo pip</code> / <code>--break-system-packages</code> to silence PEP 668. Treat those as red flags. A good workflow is: keep a <code>.venv</code> per repo, run every command through <code>uv run</code> or <code>.venv/bin/python</code>, and tell your agent that rule in the repo instructions (for example a CLAUDE.md or AGENTS.md line "use <code>uv run</code> for all Python commands"). Agents running in sandboxes or containers rely on the same idea: an isolated, disposable environment that can be rebuilt from the lock file in seconds. When an assistant says "it works", ask it to print <code>sys.executable</code> and <code>pip --version</code> so you know which environment it tested.</p>`,
    problems: [{
      title: 'Which Executable Runs? Simulate PATH Lookup',
      level: 'Easy', tags: ['PATH', 'venv', 'simulation'], companies: ['Google', 'Atlassian', 'Shopify'],
      statement: R`<p>Write <code>which(path_dirs, files, cmd)</code> that behaves like the shell's lookup. <code>path_dirs</code> is the <code>PATH</code> list in order; <code>files</code> lists every executable that exists as <code>"dir/name"</code>. Return the full path <code>"dir/cmd"</code> of the <b>first</b> directory that contains <code>cmd</code>, or <code>""</code> if none does. Trailing slashes on PATH entries must be ignored, and duplicate entries are allowed.</p>`,
      constraints: R`0 ≤ len(path_dirs) ≤ 10<sup>4</sup>; 0 ≤ len(files) ≤ 10<sup>5</sup>; names are case-sensitive; no glob or relative-path tricks.`,
      example: R`<p><code>path_dirs = [".venv/bin", "/usr/bin"]</code>, <code>files = ["/usr/bin/python", ".venv/bin/python"]</code>, <code>cmd = "python"</code> → ${H.c('g', '".venv/bin/python"')}. Why: <code>.venv/bin</code> is earlier on PATH, which is exactly what <code>source .venv/bin/activate</code> arranges.</p>`,
      brute: { why: R`<p>For each PATH entry, scan the whole <code>files</code> list looking for a match: O(D·F). With 10<sup>4</sup> dirs and 10<sup>5</sup> files that is 10<sup>9</sup> string comparisons. The wasted work is re-scanning <code>files</code> for every directory — put them in a set once.</p>`, code: { lang: 'python', code: R`
def which_slow(path_dirs, files, cmd):
    for d in path_dirs:
        d = d.rstrip("/")
        for f in files:                  # linear scan per directory
            if f == d + "/" + cmd:
                return f
    return ""
` } },
      mcq: { q: 'After <code>source .venv/bin/activate</code>, why does <code>python</code> become the venv interpreter?', options: ['Activation prepends <code>.venv/bin</code> to PATH, and PATH is searched left to right', 'Activation copies the venv interpreter over <code>/usr/bin/python</code>', 'Activation edits <code>sys.path</code> of the system Python', 'Activation sets <code>PYTHONHOME</code> to the venv'], answer: 0, explain: 'The activate script only changes PATH (plus VIRTUAL_ENV and the prompt). The shell then finds .venv/bin/python first. Nothing is copied, and PYTHONHOME is actually unset.' },
      hints: [R`<p>Hint 1: order matters only for <code>path_dirs</code>; the <code>files</code> list is just "what exists".</p>`, R`<p>Hint 2: put <code>files</code> into a <code>set</code> once, then each directory costs one O(1) membership test.</p>`, R`<p>Hint 3: strip trailing <code>/</code> from each dir, build <code>dir + "/" + cmd</code>, return the first candidate in the set; after the loop return <code>""</code>. An empty PATH returns <code>""</code>.</p>`],
      tests: { sig: 'string[] string[] string -> string', fn: 'which', cases: [
        [[['.venv/bin', '/usr/bin'], ['/usr/bin/python', '.venv/bin/python'], 'python'], '.venv/bin/python'],
        [[['/usr/bin', '.venv/bin'], ['/usr/bin/python', '.venv/bin/python'], 'python'], '/usr/bin/python'],
        [[['/usr/local/bin/', '/usr/bin'], ['/usr/local/bin/pip', '/usr/bin/pip'], 'pip'], '/usr/local/bin/pip'],
        [[['/opt/x', '/usr/bin'], ['/usr/bin/ruff'], 'mypy'], ''],
        [[[], ['/usr/bin/python'], 'python'], ''],
        [[['/a', '/a', '/b'], ['/b/tool'], 'tool'], '/b/tool'],
        [[['/bin'], ['/bin/Python'], 'python'], ''],
        [[['/x/', '/y//'], ['/y/uv'], 'uv'], '/y/uv']
      ] },
      solution: {
        approach: R`<p>Build a set of existing executables, then walk PATH in order and return the first candidate that exists. This mirrors the shell exactly and explains activation: the venv directory simply wins because it is first.</p>`,
        code: { lang: 'python', run: true, code: R`
def which(path_dirs, files, cmd):
    existing = set(files)                 # O(1) membership
    for d in path_dirs:
        candidate = d.rstrip("/") + "/" + cmd
        if candidate in existing:
            return candidate              # first match wins
    return ""


print(which([".venv/bin", "/usr/bin"], ["/usr/bin/python", ".venv/bin/python"], "python"))
print(repr(which(["/usr/bin"], [], "mypy")))
` },
        dry: { head: ['dir', 'candidate', 'in set?', 'action'], rows: [['.venv/bin', '.venv/bin/python', 'yes', 'return it'], ['/usr/bin', '(not reached)', '-', '-']] },
        complexity: R`<p>O(F + D) time (build the set, one lookup per directory), O(F) extra space.</p>`,
        followUps: ['How would you return <i>all</i> matches, like <code>which -a</code>?', 'On Windows, PATHEXT adds <code>.exe</code>/<code>.bat</code> candidates. How would you extend the function?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — pip, PEP 440 versions, specifiers and dependency resolution
     ====================================================================== */
  topics.push({
    title: 'pip, PEP 440 Versions and Dependency Resolution',
    analogy: R`<p>Planning a dinner party: Alice only comes if Bob comes, Bob refuses to sit with Carol version 2, and Carol must bring a dessert newer than 1.5. You keep trying seatings, and when one fails you <b>back up</b> and try the next option. pip's <b>resolver</b> does exactly this with package versions — and <b>PEP 440</b> is the shared rulebook for what "newer than 1.5" even means.</p>`,
    explain: R`<p>🟢 <b>Versions (PEP 440).</b> A version looks like <code>[N!]N(.N)*[{a|b|rc}N][.postN][.devN][+local]</code>. Ordering is <i>not</i> string ordering: <code>1.10 &gt; 1.9</code>, <code>1.0 == 1.0.0</code>, and for one release the order is <code>1.0.dev1 &lt; 1.0a1 &lt; 1.0b1 &lt; 1.0rc1 &lt; 1.0 &lt; 1.0.post1</code>. The <b>epoch</b> (<code>1!</code>) resets the scheme when a project changes its numbering, e.g. switching from dates to semver.</p>
<p>🟢 <b>Specifiers.</b> A requirement like <code>httpx[http2]&gt;=0.27,&lt;1 ; python_version &gt;= "3.10"</code> has a name, optional <b>extras</b>, a <b>specifier set</b> (comma = AND) and an optional <b>environment marker</b>. Operators: <code>== != &lt; &lt;= &gt; &gt;=</code>, wildcard <code>==1.4.*</code>, and <b>compatible release</b> <code>~=1.4.5</code> (means <code>&gt;=1.4.5, ==1.4.*</code>). Pre-releases are <b>opt-in</b>: <code>&gt;=1.0</code> does not pick <code>2.0rc1</code> unless you write a pre-release in the specifier or pass <code>--pre</code>.</p>
<p>🟢 <b>Resolution.</b> Since pip 20.3 the resolver is a <b>backtracking</b> solver (resolvelib): it picks the newest candidate for each requirement, adds that candidate's dependencies, and when something conflicts it backtracks and tries an older version. If no combination works you get <code>ResolutionImpossible</code> with the conflicting chain. uv uses a faster PubGrub-based resolver that also explains conflicts as a human-readable proof.</p>`,
    clues: [
      '"pip says ResolutionImpossible" → two requirements have disjoint ranges; read the chain and loosen or upgrade one side',
      '"pip is backtracking for ages" → too-loose constraints on a deep tree; add lower bounds or a constraints file',
      '"why didn\'t pip install the 2.0 beta?" → pre-releases are opt-in (<code>--pre</code> or a pre-release in the specifier)',
      '"is 1.10 newer than 1.9?" → PEP 440 compares numerically per segment',
      '"~=" in an interview → compatible release: <code>~=2.2</code> means <code>&gt;=2.2, ==2.*</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'PEP 440 ordering from scratch (no third-party packages)', code: VERSION_PY + R`


versions = ["1.0", "1.0.post1", "1.0rc1", "1.0.dev1", "1.10", "1.9", "1.0a1", "1!0.1"]
print(sorted(versions, key=version_key))
# ['1.0.dev1', '1.0a1', '1.0rc1', '1.0', '1.0.post1', '1.9', '1.10', '1!0.1']
print(version_key("1.0") == version_key("1.0.0"))   # True
` }, { lang: 'bash', title: 'Inspecting resolution with pip and uv', code: R`
python -m pip install "httpx>=0.27,<1" --dry-run --report report.json   # resolve only, write JSON
python -m pip install -c constraints.txt -r requirements.in               # constraints cap versions without adding deps
python -m pip check                                                       # verify installed deps are consistent
uv pip compile requirements.in -o requirements.txt                        # resolve + pin the whole tree
uv tree                                                                    # show the resolved dependency graph
` }],
    viz: [{
      title: 'Compare two PEP 440 versions segment by segment',
      input: '1.0rc1 1.0',
      inputLabel: 'two versions separated by a space',
      gen: function (input) {
        var t = words(input);
        if (t.length !== 2) throw new Error('Type exactly two versions, e.g. 1.0rc1 1.0');
        var a = parseVer(t[0]), b = parseVer(t[1]), frames = [];
        function row(v) { return [v.text, v.epoch, v.trimmed.join('.'), v.pre ? v.pre.join('') : '—', v.post === null ? '—' : 'post' + v.post, v.dev === null ? '—' : 'dev' + v.dev]; }
        var cols = ['version', 'epoch', 'release', 'pre', 'post', 'dev'];
        frames.push(fr('Parse both strings into PEP 440 parts. Trailing zeros in the release are dropped, so <code>1.0.0</code> and <code>1</code> become the same release <code>1</code>.', [
          { type: 'table', label: 'parsed', columns: cols, rows: [row(a), row(b)] }
        ]));
        var steps = [
          ['epoch', a.epoch === b.epoch ? 0 : (a.epoch < b.epoch ? -1 : 1), 'Epoch first: a bigger epoch always wins, whatever the rest says.'],
          ['release', cmpArr(a.trimmed, b.trimmed), 'Release numbers compare <b>numerically</b>, segment by segment (so 1.10 &gt; 1.9).'],
          ['pre', cmpArr(preKey(a), preKey(b)), 'Pre-release: dev-only &lt; a &lt; b &lt; rc &lt; (none). A final release beats its own pre-releases.'],
          ['post', cmpArr(postKey(a), postKey(b)), 'Post-release: none &lt; post0 &lt; post1 … (a post release fixes packaging, not code).'],
          ['dev', cmpArr(devKey(a), devKey(b)), 'Dev: devN &lt; (none). A dev release comes before everything else with the same prefix.']
        ];
        var decided = 0, at = '';
        steps.forEach(function (s, i) {
          if (decided) return;
          decided = s[1]; at = s[0];
          var hl = {}; hl[0] = decided < 0 ? 'ok' : decided > 0 ? 'bad' : 'cur'; hl[1] = decided > 0 ? 'ok' : decided < 0 ? 'bad' : 'cur';
          frames.push(fr('Step ' + (i + 1) + ' — compare <b>' + s[0] + '</b>. ' + s[2] + ' ' + (s[1] === 0 ? 'Equal here, so move on.' : 'Different, so this decides it.'), [
            { type: 'table', label: 'parsed', columns: cols, rows: [row(a), row(b)], hl: hl },
            { type: 'vars', label: 'comparison', vals: { segment: s[0], result: s[1] } }
          ]));
        });
        var word = decided < 0 ? '&lt;' : decided > 0 ? '&gt;' : '==';
        frames.push(fr('Final answer: <code>' + esc(a.text) + '</code> ' + word + ' <code>' + esc(b.text) + '</code>' + (decided ? ' (decided at <b>' + at + '</b>).' : ' — they are the <b>same version</b> to an installer.'), [
          { type: 'vars', label: 'result', vals: { compare: decided }, hl: { compare: 'sel' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Reading a ResolutionImpossible error', html: R`<p>Your app needs <code>pydantic&gt;=2</code>, but an old plugin pins <code>pydantic&lt;2</code>. pip prints "The conflict is caused by: The user requested pydantic&gt;=2; oldplugin 0.3 depends on pydantic&lt;2". The fix is never <code>--no-deps</code>: upgrade the plugin to a version that supports pydantic 2, drop it, or (last resort) pin your own requirement lower.</p>` },
      { title: 'Compatible-release operator in practice', html: R`<p><code>~=2.31</code> → <code>&gt;=2.31, ==2.*</code> (any 2.x from 2.31). <code>~=2.31.0</code> → <code>&gt;=2.31.0, ==2.31.*</code> (patch updates only). Libraries usually prefer a plain lower bound; apps usually lock exact versions in a lock file instead of hand-written <code>~=</code>.</p>`, code: { lang: 'python', run: true, code: SPEC_PY + R`


for v in ["2.30.0", "2.31.0", "2.32.3", "3.0.0", "2.33.0rc1"]:
    print(v, matches(v, "~=2.31"), matches(v, "~=2.31.0"))
` } },
      { title: 'Constraints files vs requirements files', html: R`<p>A <b>requirements file</b> (<code>-r</code>) says "install these". A <b>constraints file</b> (<code>-c</code>, or <code>PIP_CONSTRAINT</code>) only says "if you install X, it must be this version" — it never adds packages. Large monorepos use one shared constraints file so every service resolves the same versions of shared libraries.</p>` }
    ],
    deepDive: R`<p>🟣 <b>Why resolution is hard.</b> Dependency resolution with version ranges is NP-complete in general (it encodes SAT), so every resolver uses heuristics. pip's resolvelib resolves the most constrained requirements first and backtracks on conflict; it must <i>download metadata</i> to learn each candidate's dependencies. That used to mean downloading whole wheels; PEP 658/714 lets indexes serve the <code>METADATA</code> file separately, and pip/uv fetch only that. uv's PubGrub resolver learns "incompatibilities" from each conflict so it never retries the same doomed combination, and it caches aggressively — the main reason it is 10–100× faster.</p>
<p><b>Markers and extras.</b> Markers (<code>sys_platform == "win32"</code>, <code>python_version &lt; "3.11"</code>) are evaluated against the target environment. A cross-platform lock (uv.lock, poetry.lock) resolves for <i>all</i> marker combinations ("universal resolution") and may fork the graph, whereas <code>pip freeze</code> only describes the current machine. <b>Yanked</b> releases (PEP 592) are skipped unless pinned exactly with <code>==</code>. pip 24+ also rejects invalid legacy versions such as <code>0.1-SNAPSHOT</code> because <code>packaging</code> 22+ dropped <code>LegacyVersion</code>.</p>`,
    aiEra: R`<p>🤖 LLMs frequently suggest a dependency version that does not exist yet, or one that conflicts with your tree — or even a package name that does not exist at all, which attackers squat ("slopsquatting"). Let the resolver be the judge: run <code>uv add pkg</code> or <code>pip install --dry-run</code> and read the result before trusting a suggested pin. AI is genuinely good at <i>explaining</i> a long ResolutionImpossible chain or a uv conflict proof in plain words — paste the error and ask "which two requirements are incompatible and what are my options?". Bots like Dependabot and Renovate already open upgrade PRs automatically; the human (or reviewing agent) job is to read the changelog and the CI result.</p>`,
    problems: [{
      title: 'PEP 440 Version Comparator',
      level: 'Medium', tags: ['parsing', 'regex', 'PEP 440', 'sorting keys'], companies: ['Datadog', 'JetBrains', 'Anaconda'],
      statement: R`<p>Implement <code>compare_versions(a, b)</code> returning <code>-1</code>, <code>0</code> or <code>1</code> using PEP 440 rules: optional epoch <code>N!</code>, numeric release segments (trailing zeros ignored), pre-releases <code>a/b/rc</code> (spellings <code>alpha/beta/c/pre/preview</code> allowed, separators <code>. - _</code> optional), <code>.postN</code> (or <code>-N</code>), <code>.devN</code>, an optional leading <code>v</code> and a <code>+local</code> label. Raise <code>ValueError</code> for invalid input (tests only use valid versions).</p>`,
      constraints: R`Each version string has ≤ 64 characters; release segments fit in normal ints; comparison must be case-insensitive.`,
      example: R`<p><code>compare_versions("1.0rc1", "1.0")</code> → ${H.c('g', '-1')}: same release, and a release candidate comes <i>before</i> the final. <code>compare_versions("1.10", "1.9")</code> → ${H.c('g', '1')}: 10 &gt; 9 numerically (string order would say otherwise).</p>`,
      brute: { why: R`<p>Comparing strings, or splitting on dots and comparing ints, breaks on <code>1.0rc1</code> vs <code>1.0</code> (rc must be smaller), <code>1.0</code> vs <code>1.0.0</code> (equal), and <code>1.0.dev1</code> vs <code>1.0a1</code> (dev-only is smallest). The naive version is right only for plain numeric releases.</p>`, code: { lang: 'python', code: R`
def compare_naive(a, b):
    pa = [int(x) for x in a.split(".")]   # crashes on "1.0rc1"
    pb = [int(x) for x in b.split(".")]
    return (pa > pb) - (pa < pb)          # also says 1.0 < 1.0.0
` } },
      mcq: { q: 'Which list is in correct PEP 440 order?', options: ['1.0.dev1 &lt; 1.0a1 &lt; 1.0rc1 &lt; 1.0 &lt; 1.0.post1', '1.0 &lt; 1.0.dev1 &lt; 1.0a1 &lt; 1.0rc1 &lt; 1.0.post1', '1.0a1 &lt; 1.0.dev1 &lt; 1.0 &lt; 1.0rc1 &lt; 1.0.post1', '1.0.post1 &lt; 1.0 &lt; 1.0rc1 &lt; 1.0a1 &lt; 1.0.dev1'], answer: 0, explain: 'Development releases come first, then alpha, beta and release candidates, then the final release, and post-releases come after the final.' },
      hints: [R`<p>Hint 1: turn each version into a <b>sort key</b> tuple; then comparing tuples does all the work.</p>`, R`<p>Hint 2: key = (epoch, release-without-trailing-zeros, pre, post, dev, local). Use sentinels for "missing": no pre → +∞ (final beats rc), no post → −∞, no dev → +∞.</p>`, R`<p>Hint 3: special case — a version with only <code>.devN</code> (no pre, no post) gets pre = −∞ so <code>1.0.dev1 &lt; 1.0a1</code>. Encode sentinels as <code>(0,)</code> and <code>(2,)</code> and real values as <code>(1, n)</code> so all tuples compare cleanly.</p>`],
      tests: { sig: 'string string -> int', fn: 'compare_versions', cases: [
        [['1.0rc1', '1.0'], -1], [['1.10', '1.9'], 1], [['1.0', '1.0.0'], 0], [['1.0.dev1', '1.0a1'], -1],
        [['1.0.post1', '1.0'], 1], [['1!0.1', '2024.10'], 1], [['1.0a1', '1.0b1'], -1], [['2.0.0-rc.2', '2.0.0rc2'], 0],
        [['v1.2', '1.2'], 0], [['1.0+local.1', '1.0'], 1], [['1.0a1.post1', '1.0a1'], 1], [['1.0.post1.dev2', '1.0.post1'], -1],
        [['1.0-1', '1.0.post1'], 0], [['1.0ALPHA2', '1.0a2'], 0], [['0', '0.0.0.0'], 0], [['1.0+5', '1.0+abc'], 1]
      ] },
      solution: {
        approach: R`<p>Parse with one regex into named groups, then build a key tuple whose natural ordering equals PEP 440 ordering (the same idea as <code>packaging.version.Version._key</code>). The comparator is just <code>(ka &gt; kb) - (ka &lt; kb)</code>. In real code, use <code>packaging.version.Version</code>; interviewers ask for this to see if you know the dev/pre/post rules.</p>`,
        code: { lang: 'python', run: true, code: VERSION_PY + R`


def compare_versions(a, b):
    ka, kb = version_key(a), version_key(b)
    return (ka > kb) - (ka < kb)


print(compare_versions("1.0rc1", "1.0"), compare_versions("1.10", "1.9"), compare_versions("1.0", "1.0.0"))
` },
        dry: { head: ['version', 'epoch', 'release', 'pre', 'post', 'dev'], rows: [['1.0rc1', '0', '(1,)', '(1, 2, 1)', '(0,)', '(2,)'], ['1.0', '0', '(1,)', '(2,) = none', '(0,)', '(2,)'], ['→ compare', 'equal', 'equal', '(1,…) &lt; (2,)', '-', 'answer -1']] },
        complexity: R`<p>O(L) per version (regex + tuple build), O(L) space. Sorting n versions with this key is O(n log n · L).</p>`,
        followUps: ['How would you sort a list of versions and pick the newest non-pre-release?', 'Why does <code>packaging</code> 22+ reject <code>1.0-SNAPSHOT</code>, and what did <code>LegacyVersion</code> used to do?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — pyproject.toml, build backends, wheels vs sdists
     ====================================================================== */
  var PYPROJECT = R`[build-system]                      # PEP 518: what is needed to BUILD this project
requires = ["hatchling>=1.25"]
build-backend = "hatchling.build"   # PEP 517: the object pip/uv/build call

[project]                           # PEP 621: standard metadata
name = "acme-billing"
version = "1.4.0"                   # or: dynamic = ["version"]
description = "Invoices and payments for Acme"
readme = "README.md"
requires-python = ">=3.10"
license = "MIT"                     # PEP 639 SPDX expression
authors = [{ name = "Ada Lovelace", email = "ada@example.com" }]
dependencies = [
  "httpx>=0.27",
  "pydantic>=2.6,<3",
  "tomli>=2.0; python_version < '3.11'",
]

[project.optional-dependencies]     # extras: pip install "acme-billing[pdf]"
pdf = ["weasyprint>=62"]

[project.scripts]                   # console entry point -> bin/acme-bill
acme-bill = "acme_billing.cli:main"

[dependency-groups]                 # PEP 735: dev-only groups, never published
dev = ["pytest>=8", "ruff>=0.6", "mypy>=1.11"]

[tool.ruff]                         # tools read their own [tool.*] tables
line-length = 100`;

  topics.push({
    title: 'pyproject.toml, Build Backends, Wheels vs sdists',
    analogy: R`<p>An <b>sdist</b> is a flat-pack furniture box: all the parts plus instructions, and you need tools and time to assemble it at home. A <b>wheel</b> is the same furniture already assembled and labelled "fits rooms of type X" — you just carry it in. <code>pyproject.toml</code> is the label on the box: what it is, what it needs, and which <b>factory</b> (build backend) knows how to assemble it.</p>`,
    explain: R`<p>🟢 <b>One file to describe a project.</b> <code>pyproject.toml</code> replaced <code>setup.py</code> + <code>setup.cfg</code> + <code>requirements.txt</code> sprawl. It has three kinds of tables:</p>
<ul><li><code>[build-system]</code> (PEP 518/517): which packages are needed to build, and the <b>backend</b> to call — hatchling, setuptools, flit-core, pdm-backend, poetry-core, uv_build, or maturin/scikit-build-core for compiled code.</li>
<li><code>[project]</code> (PEP 621): name, version, dependencies, extras, entry points, <code>requires-python</code>. Every modern tool reads the same fields (Poetry 2 supports them too).</li>
<li><code>[tool.*]</code>: settings for ruff, mypy, pytest, uv, poetry and so on.</li></ul>
<p>🟢 <b>Two artefacts.</b> <code>python -m build</code> or <code>uv build</code> produces an <b>sdist</b> (<code>.tar.gz</code> with source + <code>PKG-INFO</code>) and a <b>wheel</b> (<code>.whl</code>, a zip ready to unpack into site-packages). Installing a wheel is just unzip + write metadata — no code runs. Installing an sdist means building a wheel first, in an isolated environment, which can fail without a compiler.</p>
<p>🟢 <b>Wheel tags.</b> The file name says where it fits: <code>{name}-{version}(-{build})?-{python}-{abi}-{platform}.whl</code>. <code>py3-none-any</code> = pure Python, installs anywhere. <code>cp312-cp312-manylinux_2_17_x86_64</code> = compiled for CPython 3.12 on glibc ≥ 2.17 x86-64 Linux. <code>cp312-abi3-…</code> = stable ABI, works on 3.12 and later.</p>`,
    clues: [
      '"pip is compiling numpy from source / needs gcc" → no wheel matches your platform tags, so pip fell back to the sdist',
      '"setup.py is deprecated?" → <code>setup.py install</code> is; the build moved to PEP 517 hooks behind <code>pyproject.toml</code>',
      '"what is a manylinux wheel?" → compiled against an old glibc so it runs on most Linux distros (PEP 600)',
      '"pure Python package" → one <code>py3-none-any</code> wheel serves every platform',
      '"how do you ship a CLI?" → <code>[project.scripts]</code> entry points; installers generate the launcher'
    ],
    code: [{ lang: 'text', title: 'A complete modern pyproject.toml', code: PYPROJECT }, { lang: 'bash', title: 'Build and inspect the artefacts', code: R`
uv build                         # or: python -m build   -> dist/*.tar.gz + dist/*.whl
unzip -l dist/acme_billing-1.4.0-py3-none-any.whl
# acme_billing/__init__.py, acme_billing/cli.py,
# acme_billing-1.4.0.dist-info/METADATA, WHEEL, RECORD, entry_points.txt
python -m pip debug --verbose | head -20     # tags this interpreter accepts, best first
` }],
    viz: [{
      title: 'Is this wheel installable here? Expand and match the tags',
      input: 'orjson-3.10.7-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl',
      inputLabel: 'wheel file name (interpreter: CPython 3.12 on x86-64 Linux, glibc 2.35)',
      gen: function (input) {
        var f = String(input).trim();
        if (!/\.whl$/.test(f)) throw new Error('Enter a wheel file name ending in .whl');
        var parts = f.slice(0, -4).split('-');
        if (parts.length !== 5 && parts.length !== 6) throw new Error('A wheel name has 5 or 6 dash-separated parts');
        var py = parts[parts.length - 3], abi = parts[parts.length - 2], plat = parts[parts.length - 1];
        var supported = ['cp312-cp312-manylinux_2_35_x86_64', 'cp312-cp312-manylinux_2_17_x86_64', 'cp312-cp312-manylinux2014_x86_64', 'cp312-abi3-manylinux_2_17_x86_64', 'cp311-abi3-manylinux_2_17_x86_64', 'cp312-none-manylinux_2_17_x86_64', 'py312-none-any', 'py3-none-any'];
        var frames = [];
        frames.push(fr('Split the name on <code>-</code>. The last three fields are the <b>compatibility tags</b>: python, abi, platform.', [
          { type: 'table', label: 'fields', columns: ['name', 'version', 'python', 'abi', 'platform'], rows: [[parts[0], parts[1], py, abi, plat]], hl: { 0: 'cur' } }
        ]));
        var combos = [];
        py.split('.').forEach(function (p) { abi.split('.').forEach(function (a) { plat.split('.').forEach(function (pl) { combos.push(p + '-' + a + '-' + pl); }); }); });
        frames.push(fr('Dots mean "any of these" (a <b>compressed tag set</b>). Expanding gives ' + combos.length + ' concrete tag(s).', [
          { type: 'set', label: 'tags this wheel claims', items: combos.slice(0, 12) }
        ]));
        frames.push(fr('The installer asks the interpreter for <b>its</b> supported tags, most specific first (this is what <code>pip debug --verbose</code> prints).', [
          { type: 'array', label: 'interpreter tags (best first)', values: supported.slice() }
        ]));
        var best = -1, bestTag = '';
        supported.forEach(function (s, i) { if (best < 0 && combos.indexOf(s) >= 0) { best = i; bestTag = s; } });
        var hl = {}; if (best >= 0) hl[best] = 'ok';
        frames.push(fr(best >= 0 ? 'Match on <code>' + esc(bestTag) + '</code> (priority ' + best + '). The wheel installs by unzipping — no compiler needed.' : H.c('r', 'No tag matches.') + ' pip/uv skip this wheel and fall back to another wheel or the <b>sdist</b>, which must be compiled locally.', [
          { type: 'array', label: 'interpreter tags (best first)', values: supported.slice(), hl: hl },
          { type: 'vars', label: 'decision', vals: { compatible: best >= 0, matched_tag: bestTag || '—' }, hl: { compatible: best >= 0 ? 'ok' : 'bad' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'setuptools in pyproject (no setup.py needed)', html: R`<p>setuptools still works and is still very common; it simply reads <code>[project]</code> now. <code>setup.py</code> is only needed for custom build steps, and running <code>python setup.py install</code> directly is deprecated.</p>`, code: { lang: 'text', check: false, code: R`
[build-system]
requires = ["setuptools>=70", "setuptools-scm>=8"]
build-backend = "setuptools.build_meta"

[project]
name = "acme-geo"
dynamic = ["version"]          # setuptools-scm derives it from the git tag

[tool.setuptools-scm]
` } },
      { title: 'Compiled extensions: maturin and scikit-build-core', html: R`<p>For Rust (PyO3) use <code>build-backend = "maturin"</code>; for C/C++ via CMake use <code>scikit-build-core</code>. CI then builds one wheel per platform with <b>cibuildwheel</b> (Linux manylinux/musllinux, macOS arm64/x86-64, Windows), so users never need a compiler.</p>` },
      { title: 'What a wheel contains', html: R`<p>A wheel is a zip: your package files plus <code>{name}-{ver}.dist-info/</code> holding <code>METADATA</code> (the PEP 621 data in email-header format), <code>WHEEL</code> (tags, generator), <code>RECORD</code> (every file with its sha256, used for uninstall and integrity), and <code>entry_points.txt</code>. <code>importlib.metadata.version("acme-billing")</code> reads that METADATA at runtime.</p>`, code: { lang: 'python', run: true, code: R`
from importlib.metadata import version, PackageNotFoundError

for dist in ["pip", "surely-not-installed-xyz"]:
    try:
        print(dist, version(dist))
    except PackageNotFoundError:
        print(dist, "is not installed")
` } }
    ],
    deepDive: R`<p>🟣 <b>PEP 517 build flow.</b> The frontend (pip, uv, <code>build</code>) reads <code>[build-system]</code>, creates an <b>isolated</b> temporary environment, installs <code>requires</code>, imports the backend and calls hooks: <code>get_requires_for_build_wheel</code>, optionally <code>prepare_metadata_for_build_wheel</code>, then <code>build_wheel</code> (and <code>build_sdist</code>). Build isolation means your venv's packages are <i>not</i> visible during the build — <code>--no-build-isolation</code> turns that off, useful when the build needs a pre-installed torch/CUDA. PEP 660 adds <code>build_editable</code> for editable installs.</p>
<p><b>Platform tags.</b> <code>manylinux_2_28_x86_64</code> (PEP 600) means "built against glibc 2.28" and runs on any distro with glibc ≥ 2.28; Alpine uses musl and needs <code>musllinux</code> wheels. macOS tags include the minimum OS version (<code>macosx_11_0_arm64</code>); <code>universal2</code> is both architectures. The stable ABI (<code>abi3</code>, PEP 384) lets one binary wheel serve every CPython from its minimum version up. The free-threaded 3.13t/3.14t builds use a separate ABI tag (<code>cp313t</code>), so they need their own wheels. Metadata 2.4 (PEP 639) adds <code>License-Expression</code> and <code>License-File</code>.</p>`,
    aiEra: R`<p>🤖 Assistants were trained on a decade of <code>setup.py</code> examples, so they still produce <code>setup.py</code> files, <code>python setup.py sdist upload</code> or <code>[tool.poetry.dependencies]</code> layouts that Poetry 2 now discourages. Ask for "a PEP 621 <code>pyproject.toml</code> with hatchling (or uv_build)" explicitly, then run <code>uv build</code> and <code>twine check dist/*</code> to validate. AI is useful for writing <code>cibuildwheel</code> matrices and decoding odd platform tags, but always confirm tag support with <code>pip debug --verbose</code> on the target machine, because the answer depends on the actual glibc and CPU.</p>`,
    problems: [{
      title: 'Wheel Tag Compatibility Checker',
      level: 'Medium', tags: ['parsing', 'sets', 'wheels'], companies: ['Anaconda', 'Microsoft', 'Bloomberg'],
      statement: R`<p>Write <code>wheel_compatible(filename, supported)</code>. <code>filename</code> is a wheel name <code>{name}-{version}(-{build})?-{python}-{abi}-{platform}.whl</code>; each of the three tag fields may be a <b>compressed set</b> joined by dots (<code>py2.py3</code>). <code>supported</code> is the interpreter's list of tags like <code>"cp312-cp312-manylinux_2_17_x86_64"</code>. Return <code>True</code> if any expanded tag of the wheel is in <code>supported</code>. Return <code>False</code> for anything that is not a well-formed wheel name.</p>`,
      constraints: R`len(supported) ≤ 2000; each compressed field has ≤ 6 alternatives; comparison is exact (tags are lowercase).`,
      example: R`<p><code>"six-1.16.0-py2.py3-none-any.whl"</code> with <code>["cp312-cp312-linux_x86_64", "py3-none-any"]</code> → ${H.c('g', 'True')}: expanding gives <code>py2-none-any</code> and <code>py3-none-any</code>, and the second is supported.</p>`,
      brute: { why: R`<p>Comparing the raw string <code>"py2.py3-none-any"</code> against supported tags never matches, because supported tags are always single tags. You must expand the cross product first. Searching a list for each combination is also O(C·S); a set fixes that.</p>`, code: { lang: 'python', code: R`
def wheel_compatible_naive(filename, supported):
    tag = "-".join(filename[:-4].split("-")[-3:])
    return tag in supported              # misses compressed tag sets
` } },
      mcq: { q: 'A wheel named <code>pkg-1.0-cp39-abi3-manylinux_2_17_x86_64.whl</code> — which interpreter can install it?', options: ['CPython 3.12 on x86-64 Linux with glibc ≥ 2.17', 'Only CPython 3.9 exactly', 'PyPy 3.10 on any OS', 'CPython 3.12 on Alpine Linux (musl)'], answer: 0, explain: 'abi3 is the stable ABI, so a cp39-abi3 wheel works on CPython 3.9 and every later version. manylinux needs glibc, so musl-based Alpine needs a musllinux wheel instead.' },
      hints: [R`<p>Hint 1: strip <code>.whl</code>, split on <code>-</code>; there must be 5 or 6 fields, and the <b>last three</b> are python, abi, platform.</p>`, R`<p>Hint 2: split each of those three on <code>.</code> and take the cross product (<code>itertools.product</code>).</p>`, R`<p>Hint 3: turn <code>supported</code> into a set, then <code>any(f"{p}-{a}-{pl}" in s for …)</code>. Reject names without the suffix or with the wrong field count.</p>`],
      tests: { sig: 'string string[] -> bool', fn: 'wheel_compatible', cases: [
        [['six-1.16.0-py2.py3-none-any.whl', ['cp312-cp312-linux_x86_64', 'py3-none-any']], true],
        [['orjson-3.10.7-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl', ['cp312-cp312-manylinux2014_x86_64']], true],
        [['orjson-3.10.7-cp311-cp311-manylinux_2_17_x86_64.whl', ['cp312-cp312-manylinux_2_17_x86_64', 'py3-none-any']], false],
        [['pkg-1.0-1-py3-none-any.whl', ['py3-none-any']], true],
        [['pkg-1.0.tar.gz', ['py3-none-any']], false],
        [['pkg-1.0-py3-none.whl', ['py3-none-any']], false],
        [['pkg-1.0-py3-none-any.whl', []], false],
        [['cryptography-43.0.1-cp39-abi3-macosx_10_9_universal2.whl', ['cp312-abi3-macosx_10_9_universal2', 'cp39-abi3-macosx_10_9_universal2']], true]
      ] },
      solution: {
        approach: R`<p>Validate the shape, expand the three compressed fields with a cross product, and test each concrete tag against a set of supported tags. This is what <code>packaging.tags.parse_tag</code> + <code>packaging.utils.parse_wheel_filename</code> do inside pip and uv.</p>`,
        code: { lang: 'python', run: true, code: R`
from itertools import product


def wheel_compatible(filename, supported):
    if not filename.endswith(".whl"):
        return False
    parts = filename[:-4].split("-")
    if len(parts) not in (5, 6):
        return False
    py, abi, plat = parts[-3:]
    ok = set(supported)
    return any(f"{p}-{a}-{pl}" in ok
               for p, a, pl in product(py.split("."), abi.split("."), plat.split(".")))


print(wheel_compatible("six-1.16.0-py2.py3-none-any.whl", ["py3-none-any"]))   # True
` },
        dry: { head: ['step', 'value'], rows: [['fields', 'six | 1.16.0 | py2.py3 | none | any'], ['expanded', 'py2-none-any, py3-none-any'], ['py2-none-any in set?', 'no'], ['py3-none-any in set?', 'yes → True']] },
        complexity: R`<p>O(S + C) where S = supported tags and C = expanded combinations (≤ 216).</p>`,
        followUps: ['How would you choose the <i>best</i> of several compatible wheels?', 'Why does pip prefer <code>cp312-cp312</code> over <code>cp312-abi3</code> when both exist?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Poetry and uv, pinning and lock files
     ====================================================================== */
  topics.push({
    title: 'Poetry, uv, Pinning and Lock Files',
    analogy: R`<p>Your recipe says "a ripe tomato" — that is your <b>declared</b> dependency. The shopping receipt says "Roma tomato, batch 4471, farm X, 152 g" — that is the <b>lock file</b>. Cooking from the recipe gives a slightly different dish each time; cooking from the receipt gives the same dish on every machine, in CI and in production.</p>`,
    explain: R`<p>🟢 <b>Two layers of dependency information.</b></p>
<ul><li><b>Declared, abstract</b> requirements in <code>pyproject.toml</code>: <code>httpx&gt;=0.27</code>. Humans edit these. Libraries should keep them loose so they combine well with other libraries.</li>
<li><b>Locked, concrete</b> versions of the <i>entire</i> transitive tree, with hashes: <code>uv.lock</code>, <code>poetry.lock</code>, <code>pdm.lock</code>, a pip-compile <code>requirements.txt</code>, or the new standard <code>pylock.toml</code> (PEP 751). Tools write these. Applications commit them so every install is identical.</li></ul>
<p>🟢 <b>uv</b> (Astral, written in Rust) is an all-in-one, very fast tool: <code>uv init</code>, <code>uv add httpx</code> (edits pyproject + updates <code>uv.lock</code> + syncs <code>.venv</code>), <code>uv lock</code>, <code>uv sync --locked</code>, <code>uv run pytest</code>, <code>uv python install</code>, <code>uv tool run ruff</code>/<code>uvx</code>, plus a pip-compatible <code>uv pip</code> interface. Its lock file is <b>universal</b>: one file covers every OS and Python version via markers.</p>
<p>🟢 <b>Poetry</b> (1.8 / 2.x) does the same jobs with <code>poetry add</code>, <code>poetry lock</code>, <code>poetry install</code>, <code>poetry run</code>, <code>poetry build</code>, <code>poetry publish</code>. Poetry 2.0 (Jan 2025) supports the standard <code>[project]</code> table, so <code>[tool.poetry.dependencies]</code> with caret <code>^1.2</code> constraints is now the legacy style; <code>poetry shell</code> moved to a plugin and <code>poetry export</code> to <code>poetry-plugin-export</code>.</p>`,
    clues: [
      '"works on my machine, fails in CI" → no lock file or CI installs without <code>--locked</code>/<code>--frozen</code>',
      '"should a library pin exact versions?" → no; loose ranges in pyproject, lock only for its own dev/CI',
      '"reproducible installs" → lock file with hashes + <code>uv sync --locked</code> / <code>poetry sync</code>',
      '"Poetry caret ^1.2" → means <code>&gt;=1.2,&lt;2.0</code>; "^0.3" means <code>&gt;=0.3,&lt;0.4</code>',
      '"review a dependency upgrade PR" → diff the lock file: added, removed and changed packages'
    ],
    code: [{ lang: 'bash', title: 'uv project workflow', code: R`
uv init acme-billing && cd acme-billing
uv add "httpx>=0.27" pydantic          # updates pyproject.toml + uv.lock + .venv
uv add --dev pytest ruff mypy          # goes to [dependency-groups] dev
uv lock --upgrade-package httpx        # bump one package, keep the rest pinned
uv sync --locked                       # CI: fail if uv.lock is out of date
uv run pytest -q                       # runs inside the project venv
uv export --format requirements-txt > requirements.txt   # for tools that need it
` }, { lang: 'bash', title: 'Poetry 2 workflow', code: R`
poetry new acme-billing && cd acme-billing
poetry add "httpx>=0.27"               # writes to [project].dependencies in Poetry 2
poetry add --group dev pytest
poetry lock                            # Poetry 2: does not upgrade by default (old --no-update)
poetry sync                            # Poetry 2: make the venv exactly match the lock (1.8: install --sync)
poetry run pytest
poetry check --lock                    # is poetry.lock consistent with pyproject?
` }],
    viz: [{
      title: 'Diff two lock files (what will this upgrade PR change?)',
      input: 'httpx==0.27.0 anyio==4.4.0 idna==3.7 sniffio==1.3.1 ; httpx==0.28.1 anyio==4.6.2 idna==3.7 h11==0.14.0',
      inputLabel: 'old pins ; new pins (name==version, space separated)',
      gen: function (input) {
        var halves = String(input).split(';');
        if (halves.length !== 2) throw new Error('Separate old and new pins with a single ;');
        function parse(s) {
          var m = {};
          words(s).forEach(function (t) { var p = t.split('=='); if (p.length !== 2 || !p[0] || !p[1]) throw new Error('Each pin must look like name==1.2.3'); m[normName(p[0])] = p[1]; });
          return m;
        }
        var oldM = parse(halves[0]), newM = parse(halves[1]);
        var names = Object.keys(oldM).concat(Object.keys(newM).filter(function (k) { return !(k in oldM); })).sort();
        if (names.length > 14) throw new Error('Keep it to 14 packages or fewer');
        var frames = [];
        frames.push(fr('Load both lock files into maps <b>name → version</b>. Names are normalized (PEP 503) so <code>Typing_Extensions</code> and <code>typing-extensions</code> are the same key.', [
          { type: 'map', label: 'old lock', entries: Object.keys(oldM).sort().map(function (k) { return [k, oldM[k]]; }) },
          { type: 'map', label: 'new lock', entries: Object.keys(newM).sort().map(function (k) { return [k, newM[k]]; }) }
        ]));
        var rows = [], hl = {};
        names.forEach(function (n) {
          var o = oldM[n], w = newM[n], line, cls;
          if (o === undefined) { line = '+ ' + n + ' ' + w; cls = 'ok'; }
          else if (w === undefined) { line = '- ' + n + ' ' + o; cls = 'bad'; }
          else if (o !== w) { line = '~ ' + n + ' ' + o + ' -> ' + w; cls = 'cur'; }
          else line = null;
          if (line) { hl[rows.length] = cls; rows.push([line]); }
          frames.push(fr('<code>' + esc(n) + '</code>: old ' + (o || '—') + ', new ' + (w || '—') + ' → ' + (line ? '<b>' + esc(line) + '</b>' : 'unchanged, not reported') + '.', [
            { type: 'table', label: 'diff so far', columns: ['change'], rows: rows.slice(), hl: Object.assign({}, hl) }
          ]));
        });
        frames.push(fr('Done. Reviewers read this list, then the changelogs of the <b>~</b> lines (especially major bumps), and check the <b>+</b> lines for new transitive dependencies.', [
          { type: 'table', label: 'lock diff', columns: ['change'], rows: rows, hl: hl }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'A uv.lock entry', html: R`<p>Each package records the exact version, its source, its own dependencies, and hashes of the sdist and every wheel, so <code>uv sync</code> can verify downloads and install for any platform.</p>`, code: { lang: 'text', check: false, code: R`
[[package]]
name = "idna"
version = "3.10"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/.../idna-3.10.tar.gz", hash = "sha256:12f6...", size = 190490 }
wheels = [
    { url = "https://files.pythonhosted.org/.../idna-3.10-py3-none-any.whl", hash = "sha256:946d...", size = 70442 },
]
` } },
      { title: 'pip-tools style locking with plain pip', html: R`<p>No uv or Poetry? Keep top-level requirements in <code>requirements.in</code>, compile them to a fully pinned, hashed <code>requirements.txt</code> and install with <code>--require-hashes</code>. <code>uv pip compile</code> is a drop-in faster replacement for <code>pip-compile</code>.</p>`, code: { lang: 'bash', code: R`
pip-compile --generate-hashes requirements.in -o requirements.txt
python -m pip install --require-hashes -r requirements.txt
python -m pip lock -r requirements.in -o pylock.toml     # pip 25.1+: experimental PEP 751 lock
` } },
      { title: 'Poetry caret and tilde in the old style', html: R`<p>Legacy <code>[tool.poetry.dependencies]</code> uses caret/tilde shorthands: <code>^1.2.3</code> = <code>&gt;=1.2.3,&lt;2.0.0</code>, <code>^0.2.3</code> = <code>&gt;=0.2.3,&lt;0.3.0</code>, <code>~1.2.3</code> = <code>&gt;=1.2.3,&lt;1.3.0</code>. Libraries that used <code>^</code> everywhere caused famous over-tight upper bounds; PEP 621 style with plain lower bounds avoids that.</p>` }
    ],
    deepDive: R`<p>🟣 <b>What "locked" really guarantees.</b> A lock file fixes versions and artifact hashes, so the same <i>files</i> are installed. It does not fix the interpreter build, OS libraries (OpenSSL, glibc), or environment variables, so pair it with a pinned base image or <code>.python-version</code>. <code>uv sync --locked</code> fails if pyproject and lock disagree; <code>--frozen</code> uses the lock without even checking. Poetry stores a <code>content-hash</code> of the relevant pyproject sections to detect a stale lock.</p>
<p><b>Upper bounds debate.</b> Capping (<code>&lt;3</code>) in a <i>library</i> blocks users from new major versions even when they would work, and capped transitive deps make resolution fail. The common guidance (Henry Schreiner's essay, the uv and PyPA docs) is: libraries use lower bounds and cap only on known breakage; applications rely on the lock. <b>Standard lock files:</b> PEP 751 (accepted 2025) defines <code>pylock.toml</code>, which pip 25.1 can write experimentally and uv can export, so tools can interoperate. <b>Workspaces:</b> uv workspaces and Poetry path dependencies let a monorepo share one lock across several packages.</p>`,
    aiEra: R`<p>🤖 Lock files are huge, machine-written and a natural place for supply-chain attacks to hide, so let tooling summarise them: Renovate/Dependabot open PRs with a lock diff and release notes, and an AI reviewer can explain "what changed and what could break" from the changelogs. Never let an agent hand-edit <code>uv.lock</code> or <code>poetry.lock</code>; ask it to run <code>uv lock</code>/<code>poetry lock</code> and commit the result. A good guardrail for agents is CI running <code>uv sync --locked</code> (or <code>poetry check --lock</code>), which fails loudly if anyone changed dependencies without regenerating the lock.</p>`,
    problems: [{
      title: 'Lock File Diff',
      level: 'Medium', tags: ['hash map', 'normalization', 'lock files'], companies: ['GitHub', 'Mend', 'Snyk'],
      statement: R`<p>Write <code>lock_diff(old, new)</code>. Each input is a list of lines in <code>requirements.txt</code> style: <code>name==version</code>, possibly with blank lines, <code># comments</code>, trailing comments or surrounding spaces. Names must be normalized with PEP 503 (lowercase, runs of <code>-_.</code> become one <code>-</code>). Return the changes sorted by normalized name: <code>"+ name ver"</code> for added, <code>"- name ver"</code> for removed, <code>"~ name old -> new"</code> for changed. Unchanged packages are omitted.</p>`,
      constraints: R`Up to 10<sup>4</sup> lines per file; each package appears at most once per file; versions are compared as plain strings.`,
      example: R`<p>old <code>["httpx==0.27.0", "idna==3.7"]</code>, new <code>["httpx==0.28.1", "h11==0.14.0", "idna==3.7"]</code> → ${H.c('g', '["+ h11 0.14.0", "~ httpx 0.27.0 -> 0.28.1"]')}: h11 is new, httpx changed, idna is identical.</p>`,
      brute: { why: R`<p>For every old line, scan all new lines for the same name (and vice versa): O(n·m). It also breaks on <code>Typing_Extensions</code> vs <code>typing-extensions</code> unless names are normalized first.</p>`, code: { lang: 'python', code: R`
def lock_diff_slow(old, new):
    out = []
    for o in old:
        name, ver = o.split("==")
        hits = [n for n in new if n.split("==")[0] == name]   # O(m) scan
        if not hits:
            out.append(f"- {name} {ver}")
    return out
` } },
      mcq: { q: 'Why normalize names before diffing two lock files?', options: ['Because <code>Typing_Extensions</code> and <code>typing-extensions</code> are the same project on PyPI', 'To make the diff run faster', 'Because pip rejects uppercase names', 'To sort versions correctly'], answer: 0, explain: 'PEP 503 says names compare case-insensitively with runs of -, _ and . treated as equal. Without normalizing, a harmless re-spelling shows up as one removal plus one addition.' },
      hints: [R`<p>Hint 1: parse each file into a dict <code>{normalized_name: version}</code>, skipping blanks and comments.</p>`, R`<p>Hint 2: normalization is <code>re.sub(r"[-_.]+", "-", name).lower()</code>. Strip <code># ...</code> and whitespace before splitting on <code>==</code>.</p>`, R`<p>Hint 3: loop over <code>sorted(old.keys() | new.keys())</code>: only-in-new → <code>+</code>, only-in-old → <code>-</code>, different → <code>~</code>. Empty inputs give <code>[]</code>.</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'lock_diff', cases: [
        [[['httpx==0.27.0', 'idna==3.7'], ['httpx==0.28.1', 'h11==0.14.0', 'idna==3.7']], ['+ h11 0.14.0', '~ httpx 0.27.0 -> 0.28.1']],
        [[[], []], []],
        [[['a==1'], []], ['- a 1']],
        [[[], ['# generated', '', 'B==2']], ['+ b 2']],
        [[['Typing_Extensions==4.12.2'], ['typing-extensions==4.12.2']], []],
        [[['zope.interface==6.0  # via twisted', 'requests==2.31.0'], ['  zope-interface==7.0', 'requests==2.31.0']], ['~ zope-interface 6.0 -> 7.0']],
        [[['c==1', 'b==1', 'a==1'], ['a==2', 'd==1']], ['~ a 1 -> 2', '- b 1', '- c 1', '+ d 1']],
        [[['x__y==1.0'], ['X-Y==1.0.0']], ['~ x-y 1.0 -> 1.0.0']]
      ] },
      solution: {
        approach: R`<p>Parse both files into normalized dictionaries, then walk the sorted union of keys once. Dictionaries make every lookup O(1), so the whole diff is linear plus a sort.</p>`,
        code: { lang: 'python', run: true, code: R`
import re


def _parse(lines):
    pins = {}
    for line in lines:
        line = line.split("#", 1)[0].strip()       # drop comments and spaces
        if not line:
            continue
        name, _, ver = line.partition("==")
        pins[re.sub(r"[-_.]+", "-", name.strip()).lower()] = ver.strip()
    return pins


def lock_diff(old, new):
    a, b = _parse(old), _parse(new)
    out = []
    for name in sorted(a.keys() | b.keys()):
        if name not in a:
            out.append(f"+ {name} {b[name]}")
        elif name not in b:
            out.append(f"- {name} {a[name]}")
        elif a[name] != b[name]:
            out.append(f"~ {name} {a[name]} -> {b[name]}")
    return out


print(lock_diff(["httpx==0.27.0", "idna==3.7"], ["httpx==0.28.1", "h11==0.14.0", "idna==3.7"]))
` },
        dry: { head: ['name', 'old', 'new', 'output'], rows: [['h11', '—', '0.14.0', '+ h11 0.14.0'], ['httpx', '0.27.0', '0.28.1', '~ httpx 0.27.0 -> 0.28.1'], ['idna', '3.7', '3.7', '(skip)']] },
        complexity: R`<p>O((n + m) log(n + m)) for the sort, O(n + m) space.</p>`,
        followUps: ['How would you flag major-version bumps (<code>1.x → 2.x</code>) separately?', 'How would you diff <code>uv.lock</code> (TOML) instead of requirements lines?']
      }
    }]
  });

  var HA = '8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8';   // sha256("alpha")
  var HB = 'f44e64e75f3948e9f73f8dfa94721c4ce8cbb4f265c4790c702b2d41cfbf2753';   // sha256("beta")
  var HG = 'be9d587defa1f0c09ef49eb17e206983a5f8f8289e4281860bd0ee5a19592c67';   // sha256("gamma")

  /* ======================================================================
     TOPIC 5 — src layout, editable installs and how imports are found
     ====================================================================== */
  topics.push({
    title: 'src Layout, Editable Installs and Import Resolution',
    analogy: R`<p>A restaurant tests a new dish. If the chef tastes it straight from the prep table, they might taste raw ingredients that never reach the customer. The <b>src layout</b> forces the chef to taste only from the <b>plate that went through the pass</b> (the installed package). An <b>editable install</b> is a magic plate that always shows what is currently on the prep table, so you do not have to re-plate after every change.</p>`,
    explain: R`<p>🟢 <b>Two layouts.</b></p>
<ul><li><b>Flat layout</b>: <code>myproj/acme/__init__.py</code> next to <code>tests/</code>. Running <code>pytest</code> or <code>python -m</code> from the root puts the root on <code>sys.path</code>, so <code>import acme</code> picks the <i>local folder</i>, even if packaging is broken (missing files, wrong <code>package-data</code>). Tests pass; the published wheel is broken.</li>
<li><b>src layout</b>: <code>myproj/src/acme/__init__.py</code>. The root no longer contains an importable <code>acme</code>, so tests can only import the <b>installed</b> package. Packaging mistakes fail on your machine first. uv (<code>uv init --lib</code>), Hatch, PDM and the PyPA guide default to it.</li></ul>
<p>🟢 <b>Editable installs.</b> <code>pip install -e .</code> / <code>uv pip install -e .</code> (uv sync does it for the project automatically) install the package so that it points at your source tree: edit a file, re-import, see the change, no reinstall. Since PEP 660, the backend implements it — often a <code>.pth</code> file that adds <code>src/</code> to <code>sys.path</code>, or an import hook that maps only your package names. Metadata changes (new dependency, new entry point) still need a reinstall.</p>
<p>🟢 <b>How <code>import a.b</code> resolves:</b> Python searches <code>sys.path</code> in order for the top-level name <code>a</code> (a package directory with <code>__init__.py</code> wins over <code>a.py</code> in the same entry), then looks for <code>b</code> <i>only inside that package's <code>__path__</code></i>. First hit wins, which is why a stray <code>random.py</code> or a local <code>requests/</code> folder shadows the real one.</p>`,
    clues: [
      '"tests pass locally but the installed package is missing a module" → flat layout hid a packaging bug; switch to src layout',
      '"ModuleNotFoundError when running tests in src layout" → the project is not installed; <code>uv sync</code> or <code>pip install -e .</code>',
      '"my file named random.py breaks imports" → shadowing: the script directory is first on <code>sys.path</code>',
      '"edits are not picked up" → non-editable install, or a metadata change that needs reinstalling',
      '"python -m pkg.mod vs python pkg/mod.py" → <code>-m</code> imports through sys.path so relative imports work'
    ],
    code: [{ lang: 'text', title: 'src layout tree', code: R`
acme-billing/
├── pyproject.toml
├── uv.lock
├── src/
│   └── acme_billing/
│       ├── __init__.py
│       ├── py.typed          # marks the package as typed (PEP 561)
│       └── cli.py
└── tests/
    └── test_cli.py           # imports acme_billing from the INSTALLED package
` }, { lang: 'python', run: true, title: 'See the search path and where a module came from', code: R`
import sys, json, importlib.util

print("first sys.path entries:", sys.path[:3])
spec = importlib.util.find_spec("json")
print("json is loaded from:", spec.origin)
print("is a package?", spec.submodule_search_locations is not None)
print(json.__name__, "came from", json.__file__)
` }],
    viz: [{
      title: 'Resolve an import across sys.path (flat vs src layout)',
      input: 'acme.cli',
      inputLabel: 'module to import (tree: ./acme/__init__.py, ./src/acme/__init__.py, ./src/acme/cli.py, site/acme/__init__.py, site/acme/cli.py)',
      gen: function (input) {
        var mod = String(input).trim();
        if (!/^[A-Za-z_]\w*(\.[A-Za-z_]\w*){0,3}$/.test(mod)) throw new Error('Type a dotted module name like acme.cli');
        var files = ['acme/__init__.py', 'src/acme/__init__.py', 'src/acme/cli.py', 'site/acme/__init__.py', 'site/acme/cli.py'];
        var sp = ['', 'site'];
        var parts = mod.split('.'), frames = [];
        frames.push(fr('Flat layout run from the repo root: <code>sys.path = ["" (cwd), site-packages]</code>. Python looks for the top-level name <code>' + esc(parts[0]) + '</code> in each entry, in order.', [
          { type: 'array', label: 'sys.path', values: ['"" (cwd)', 'site-packages'] },
          { type: 'set', label: 'files on disk', items: files.slice() }
        ]));
        var top = null;
        sp.forEach(function (e, i) {
          if (top) return;
          var base = e ? e + '/' : '', pkg = base + parts[0] + '/__init__.py', modf = base + parts[0] + '.py';
          var hit = files.indexOf(pkg) >= 0 ? pkg : files.indexOf(modf) >= 0 ? modf : null;
          var hl = {}; hl[i] = hit ? 'ok' : 'cur';
          frames.push(fr('Entry ' + (e ? e : '"" (cwd)') + ': ' + (hit ? 'found <code>' + esc(hit) + '</code> — the search for the top-level name <b>stops here</b>.' : 'nothing called ' + esc(parts[0]) + ', keep going.'), [
            { type: 'array', label: 'sys.path', values: ['"" (cwd)', 'site-packages'], hl: hl }
          ]));
          if (hit) top = { dir: base + parts[0], pkg: hit.slice(-11) === '__init__.py' };
        });
        var result = 'ModuleNotFoundError';
        if (top) {
          var cur = top.dir, isPkg = top.pkg, ok = true;
          for (var k = 1; k < parts.length && ok; k++) {
            var sub = cur + '/' + parts[k];
            if (isPkg && files.indexOf(sub + '/__init__.py') >= 0) { cur = sub; }
            else if (isPkg && files.indexOf(sub + '.py') >= 0) { cur = sub + '.py'; isPkg = false; }
            else ok = false;
            frames.push(fr('Look for <code>' + esc(parts[k]) + '</code> <b>only inside</b> <code>' + esc(top.dir) + '/</code> (the package\'s <code>__path__</code>). ' + (ok ? 'Found.' : H.c('r', 'Not there') + ' — Python does <i>not</i> go back to site-packages, even though the installed copy has it.'), [
              { type: 'vars', label: 'lookup', vals: { looking_for: sub, found: ok } , hl: { found: ok ? 'ok' : 'bad' } }
            ]));
          }
          if (ok) result = isPkg ? cur + '/__init__.py' : cur;
        }
        frames.push(fr('Flat layout result: <code>' + esc(result) + '</code>. The stale local <code>./acme</code> folder <b>shadowed</b> the installed package.', [
          { type: 'vars', label: 'flat layout', vals: { result: result }, hl: { result: result.indexOf('site/') === 0 ? 'ok' : 'bad' } }
        ]));
        frames.push(fr('With a <b>src layout</b> the repo root contains no importable <code>acme</code> (the stale folder would not exist), and <code>src/</code> is reached only through the editable install. Tests therefore import exactly what users get.', [
          { type: 'table', label: 'layout comparison', columns: ['layout', 'what tests import'], rows: [['flat', 'whatever folder is in the cwd'], ['src', 'the installed (or editable) package']], hl: { 1: 'ok' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'The shadowing bug', html: R`<p>You create <code>email.py</code> for a quick experiment and suddenly <code>import smtplib</code> fails with "module 'email' has no attribute 'utils'". The script directory is <code>sys.path[0]</code>, so your file shadows the stdlib <code>email</code> package. Rename the file (and delete <code>__pycache__</code>). Python 3.13 now prints a hint when this happens, and <code>python -P</code> (3.11+) avoids adding the script directory at all.</p>` },
      { title: 'Editable install under the hood', html: R`<p>After <code>uv pip install -e .</code> with hatchling, site-packages contains <code>_acme_billing.pth</code> whose single line is the absolute path to <code>src</code>. The <code>site</code> module appends it to <code>sys.path</code> at start-up. setuptools may instead install a small finder (<code>__editable___acme_billing_finder.py</code>) that maps only your top-level package, so other stray files in the repo are not importable.</p>`, code: { lang: 'bash', code: R`
uv pip install -e .
cat .venv/lib/python3.12/site-packages/_acme_billing.pth   # /home/me/acme-billing/src
python -c "import acme_billing; print(acme_billing.__file__)"
` } },
      { title: 'Configuring pytest for src layout', html: R`<p>With the project installed (uv sync does this), pytest just works. Projects that do not want to install can set <code>pythonpath = ["src"]</code> in <code>[tool.pytest.ini_options]</code>, but that reintroduces "tests see the source tree, not the package". The recommended setting is <code>--import-mode=importlib</code>, so test files do not insert their own directories into <code>sys.path</code>.</p>`, code: { lang: 'text', check: false, code: R`
[tool.pytest.ini_options]
addopts = ["--import-mode=importlib"]
testpaths = ["tests"]
` } }
    ],
    deepDive: R`<p>🟣 <b>The import system.</b> <code>import a.b</code> checks <code>sys.modules</code> first, then asks each finder in <code>sys.meta_path</code> (built-in, frozen, then <code>PathFinder</code>). <code>PathFinder</code> walks <code>sys.path</code> using <code>sys.path_importer_cache</code> and <code>sys.path_hooks</code> (FileFinder, zipimport). For a submodule it searches <code>a.__path__</code> instead of <code>sys.path</code>. In one directory, a regular package (<code>a/__init__.py</code>) beats a module <code>a.py</code>, which beats a directory without <code>__init__.py</code>; directories without <code>__init__.py</code> become <b>namespace packages</b> (PEP 420) only if no regular package or module is found in <i>any</i> entry, and their <code>__path__</code> combines every matching directory.</p>
<p><b>Why editable installs vary.</b> A path-based <code>.pth</code> exposes the whole <code>src</code> folder; an import-hook editable exposes only the declared packages and is stricter, but static analysers (mypy, Pyright, IDEs) cannot follow import hooks — hence setuptools' <code>editable_mode=compat</code> and Hatch's <code>dev-mode-exact</code> options. Compiled extensions in editable mode need a rebuild after C/Rust edits (maturin develop, scikit-build-core's rebuild-on-import). The <b>src layout also protects</b> the root from accidentally shipping <code>tests/</code> or <code>scripts/</code> as top-level packages.</p>`,
    aiEra: R`<p>🤖 When an AI agent "fixes" an ImportError, the classic bad patch is <code>sys.path.insert(0, "..")</code> at the top of a test or script. It hides packaging bugs and breaks when the file moves. Ask instead for the structural fix: install the project (<code>uv sync</code>), use <code>python -m package.module</code>, or correct the package discovery settings. Agents are good at generating the src-layout scaffold (<code>uv init --lib</code>, tests, py.typed) and at explaining an import traceback; give them <code>python -c "import sys; print(sys.path)"</code> and <code>find_spec</code> output so they reason from facts, not guesses.</p>`,
    problems: [{
      title: 'Import Path Resolver (src Layout and Shadowing)',
      level: 'Medium', tags: ['simulation', 'import system', 'hash set'], companies: ['Meta', 'Dropbox', 'Instagram'],
      statement: R`<p>Implement <code>resolve_import(sys_path, files, module)</code>. <code>sys_path</code> lists directories in search order (<code>""</code> or <code>"."</code> means the current directory, whose files have no prefix). <code>files</code> lists every file that exists. Rules (regular packages only — no namespace packages):</p>
<ul><li>Find the top-level name in the <b>first</b> sys.path entry that has either <code>name/__init__.py</code> (preferred) or <code>name.py</code>.</li>
<li>Each later part is searched <b>only inside</b> the package found so far: <code>part/__init__.py</code> first, then <code>part.py</code>. A plain module has no submodules.</li>
<li>Return the file path that would be executed for the full module, or <code>"ModuleNotFoundError"</code>.</li></ul>`,
      constraints: R`len(files) ≤ 10<sup>5</sup>; module has ≤ 10 dotted parts; directory names have no trailing slash except possibly in sys_path entries.`,
      example: R`<p><code>sys_path = ["", "site"]</code>, files <code>["acme/__init__.py", "site/acme/__init__.py", "site/acme/cli.py"]</code>, module <code>"acme.cli"</code> → ${H.c('r', '"ModuleNotFoundError"')}. The local <code>acme/</code> folder wins the top-level search, and <code>cli</code> is then looked for only inside it — the installed copy is never consulted.</p>`,
      brute: { why: R`<p>A tempting shortcut checks every sys.path entry for the <i>full</i> dotted path (<code>entry/acme/cli.py</code>) and returns the first hit. That finds <code>site/acme/cli.py</code> in the example, which is wrong: Python commits to the first package it finds for the top-level name. It also ignores the "package beats module" rule.</p>`, code: { lang: 'python', code: R`
def resolve_wrong(sys_path, files, module):
    rel = module.replace(".", "/")
    for e in sys_path:
        base = "" if e in ("", ".") else e.rstrip("/") + "/"
        for cand in (base + rel + "/__init__.py", base + rel + ".py"):
            if cand in files:
                return cand              # ignores which package won the top-level search
    return "ModuleNotFoundError"
` } },
      mcq: { q: 'The repo root has a stale <code>acme/</code> folder and the real package is installed in site-packages. Tests run from the root import <code>acme</code>. Which do they get?', options: ['The stale local folder, because the cwd/script dir comes before site-packages on sys.path', 'The installed package, because site-packages always wins', 'Whichever was modified most recently', 'An ImportError because the name is ambiguous'], answer: 0, explain: 'sys.path is searched in order and the first match wins. That shadowing is exactly the problem the src layout removes.' },
      hints: [R`<p>Hint 1: two phases — find the top-level name across <code>sys_path</code>, then descend <b>within</b> that location only.</p>`, R`<p>Hint 2: a set of files gives O(1) checks. Normalize the base: <code>""</code>/<code>"."</code> → no prefix, otherwise <code>entry.rstrip("/") + "/"</code>.</p>`, R`<p>Hint 3: track <code>(path, is_package)</code>. If you hit a plain module but still have parts left, it is ModuleNotFoundError. At the end return <code>path + "/__init__.py"</code> for a package or the <code>.py</code> path.</p>`],
      tests: { sig: 'string[] string[] string -> string', fn: 'resolve_import', cases: [
        [[['', 'site'], ['acme/__init__.py', 'site/acme/__init__.py', 'site/acme/cli.py'], 'acme.cli'], 'ModuleNotFoundError'],
        [[['site'], ['acme/__init__.py', 'site/acme/__init__.py', 'site/acme/cli.py'], 'acme.cli'], 'site/acme/cli.py'],
        [[['.', 'site'], ['acme.py', 'site/acme/__init__.py'], 'acme'], 'acme.py'],
        [[['src'], ['src/acme/__init__.py', 'src/acme.py'], 'acme'], 'src/acme/__init__.py'],
        [[['src/', 'site'], ['src/acme/__init__.py', 'src/acme/sub/__init__.py', 'src/acme/sub/core.py'], 'acme.sub.core'], 'src/acme/sub/core.py'],
        [[['src'], ['src/acme/__init__.py', 'src/acme/sub/core.py'], 'acme.sub.core'], 'ModuleNotFoundError'],
        [[['lib'], ['lib/tool.py'], 'tool.x'], 'ModuleNotFoundError'],
        [[[], ['acme/__init__.py'], 'acme'], 'ModuleNotFoundError'],
        [[['a', 'b'], ['b/pkg/__init__.py', 'a/other.py'], 'pkg'], 'b/pkg/__init__.py'],
        [[['src'], ['src/acme/__init__.py', 'src/acme/sub/__init__.py'], 'acme.sub'], 'src/acme/sub/__init__.py']
      ] },
      solution: {
        approach: R`<p>Phase 1 scans <code>sys_path</code> for the top-level name (package before module in each entry). Phase 2 walks the remaining parts inside that package only, mirroring how submodules are searched in <code>package.__path__</code>. A set makes every existence check O(1).</p>`,
        code: { lang: 'python', run: true, code: R`
def resolve_import(sys_path, files, module):
    fs = set(files)
    parts = module.split(".")
    found = None
    for entry in sys_path:                         # phase 1: top-level name
        base = "" if entry in ("", ".") else entry.rstrip("/") + "/"
        if base + parts[0] + "/__init__.py" in fs:
            found = (base + parts[0], True)        # regular package wins
            break
        if base + parts[0] + ".py" in fs:
            found = (base + parts[0] + ".py", False)
            break
    if found is None:
        return "ModuleNotFoundError"
    path, is_pkg = found
    for name in parts[1:]:                         # phase 2: inside the package only
        if not is_pkg:
            return "ModuleNotFoundError"           # a plain module has no submodules
        if path + "/" + name + "/__init__.py" in fs:
            path = path + "/" + name
        elif path + "/" + name + ".py" in fs:
            path, is_pkg = path + "/" + name + ".py", False
        else:
            return "ModuleNotFoundError"
    return path + "/__init__.py" if is_pkg else path


print(resolve_import(["", "site"], ["acme/__init__.py", "site/acme/__init__.py", "site/acme/cli.py"], "acme.cli"))
print(resolve_import(["src"], ["src/acme/__init__.py", "src/acme/cli.py"], "acme.cli"))
` },
        dry: { head: ['step', 'check', 'result'], rows: [['top-level, entry ""', 'acme/__init__.py', 'found → package acme'], ['submodule cli', 'acme/cli/__init__.py', 'no'], ['submodule cli', 'acme/cli.py', 'no → ModuleNotFoundError']] },
        complexity: R`<p>O(F + P + K) time: build the set, at most 2 checks per sys.path entry (P) and per dotted part (K). O(F) space.</p>`,
        followUps: ['Extend it to PEP 420 namespace packages (directories without <code>__init__.py</code>).', 'How does <code>sys.modules</code> caching change the answer if the module was already imported?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Ruff, mypy and pre-commit
     ====================================================================== */
  topics.push({
    title: 'Linting, Formatting and Type Checking: Ruff, mypy, pre-commit',
    analogy: R`<p>Before a plane takes off, the crew runs a <b>checklist</b>: fuel, flaps, doors. Nobody argues about it each flight, and it catches the boring mistakes that cause disasters. <b>Ruff</b> is the checklist for style and common bugs, <b>mypy</b> checks that the parts actually fit together (types), and <b>pre-commit</b> makes sure the checklist runs before every take-off (commit), not just when someone remembers.</p>`,
    explain: R`<p>🟢 <b>Ruff</b> (Astral, Rust) is one fast tool replacing Flake8 + dozens of plugins, isort, pyupgrade, pydocstyle and Black. <code>ruff check</code> lints with 800+ rules grouped by prefix: <code>E</code>/<code>W</code> (pycodestyle), <code>F</code> (Pyflakes: unused imports F401, undefined names F821), <code>I</code> (import sorting), <code>B</code> (bugbear), <code>UP</code> (pyupgrade), <code>SIM</code>, <code>RUF</code> and more. <code>ruff check --fix</code> applies safe fixes. <code>ruff format</code> is a Black-compatible formatter. Defaults select only <code>E4, E7, E9, F</code>; you opt into more with <code>select</code>/<code>extend-select</code>.</p>
<p>🟢 <b>mypy</b> is a static type checker: it reads annotations (<code>def total(xs: list[int]) -&gt; int</code>) and reports mismatches without running code. Start lenient, then tighten with <code>strict = true</code> per module. Libraries ship type information with a <code>py.typed</code> marker (PEP 561) or separate <code>types-*</code> stub packages. Alternatives: Pyright/basedpyright, and Astral's <b>ty</b> (beta).</p>
<p>🟢 <b>pre-commit</b> runs configured hooks on staged files at <code>git commit</code> time, each in its own isolated environment pinned by <code>rev</code>. The same hooks run in CI (<code>pre-commit run --all-files</code>) so nobody can skip them.</p>`,
    clues: [
      '"enforce code style across the team" → Ruff format + lint in pre-commit and CI',
      '"replace flake8/isort/black" → Ruff (<code>ruff check</code> + <code>ruff format</code>)',
      '"catch None-related bugs before runtime" → mypy/Pyright with <code>strict_optional</code> (on by default)',
      '"untyped third-party library" → install <code>types-*</code> stubs or add a per-module <code>ignore_missing_imports</code>',
      '"gradually adopt typing in a big codebase" → per-module overrides, <code>--strict</code> on new code, baseline the rest'
    ],
    code: [{ lang: 'text', title: 'pyproject.toml: Ruff and mypy settings', code: R`
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "SIM"]
ignore = ["E501"]                        # the formatter owns line length
per-file-ignores = { "tests/*" = ["S101"] }

[tool.mypy]
python_version = "3.11"
strict = true
warn_unreachable = true

[[tool.mypy.overrides]]
module = ["legacy.*"]
disallow_untyped_defs = false
` }, { lang: 'text', title: '.pre-commit-config.yaml', code: R`
repos:
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
        additional_dependencies: [pydantic>=2.6]
` }, { lang: 'python', run: true, title: 'What mypy would catch (and why it matters at runtime)', code: R`
from typing import Optional


def find_user(users: dict[str, int], name: str) -> Optional[int]:
    return users.get(name)


age = find_user({"ada": 36}, "bob")
# mypy: error: Unsupported operand types for + ("None" and "int")
try:
    print(age + 1)
except TypeError as e:
    print("runtime crash mypy would have flagged:", e)
` }],
    viz: [{
      title: 'A commit passes through pre-commit hooks',
      input: 'src/acme/cli.py tests/test_cli.py README.md',
      inputLabel: 'staged files (space separated)',
      gen: function (input) {
        var files = words(input);
        if (!files.length || files.length > 8) throw new Error('Give 1–8 staged file paths');
        var hooks = [
          { id: 'ruff --fix', types: /\.pyi?$/, outcome: 'fixed 1 import order (I001), file modified' },
          { id: 'ruff-format', types: /\.pyi?$/, outcome: 'reformatted 0 files' },
          { id: 'mypy', types: /\.pyi?$/, outcome: 'Success: no issues found' },
          { id: 'end-of-file-fixer', types: /./, outcome: 'Passed' }
        ];
        var frames = [];
        frames.push(fr('<code>git commit</code> triggers pre-commit. It takes the <b>staged</b> files and runs each hook only on the files that match the hook\'s file types.', [
          { type: 'array', label: 'staged files', values: files.slice() },
          { type: 'queue', label: 'hooks (in config order)', items: hooks.map(function (h) { return h.id; }) }
        ]));
        var modified = false;
        hooks.forEach(function (h, i) {
          var mine = files.filter(function (f) { return h.types.test(f); });
          var hl = {}; files.forEach(function (f, j) { if (mine.indexOf(f) >= 0) hl[j] = 'cur'; });
          var res = mine.length ? h.outcome : '(no files) Skipped';
          if (i === 0 && mine.length) modified = true;
          frames.push(fr('Hook <b>' + h.id + '</b> runs on ' + mine.length + ' file(s): ' + esc(res) + '.', [
            { type: 'array', label: 'staged files', values: files.slice(), hl: hl },
            { type: 'queue', label: 'hooks', items: hooks.map(function (x) { return x.id; }), hl: (function () { var q = {}; q[i] = 'cur'; return q; })() }
          ]));
        });
        frames.push(fr(modified ? H.c('r', 'A hook modified files, so the commit is aborted.') + ' Review the change, <code>git add</code> it, and commit again — this time every hook passes.' : H.c('g', 'All hooks passed') + ' and the commit is created.', [
          { type: 'vars', label: 'commit', vals: { status: modified ? 'aborted (files fixed)' : 'created', next: modified ? 'git add -u && git commit' : 'push' }, hl: { status: modified ? 'bad' : 'ok' } }
        ]));
        frames.push(fr('CI runs the same thing with <code>pre-commit run --all-files</code> (or <code>ruff check</code> + <code>ruff format --check</code> + <code>mypy</code>), so a <code>--no-verify</code> commit is still caught.', [
          { type: 'graph', directed: true, height: 40, nodes: [{ id: 'dev', label: 'git commit', x: 10, y: 20, shape: 'box' }, { id: 'pc', label: 'pre-commit', x: 40, y: 20, shape: 'box' }, { id: 'ci', label: 'CI: --all-files', x: 70, y: 20, shape: 'box' }, { id: 'm', label: 'merge', x: 92, y: 20, shape: 'box' }], edges: [['dev', 'pc'], ['pc', 'ci'], ['ci', 'm']], hl: { ci: 'ok' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Selecting and ignoring rules', html: R`<p>Selectors are prefixes. <code>select = ["E", "F"]</code> enables all pycodestyle errors and Pyflakes; <code>ignore = ["E501"]</code> turns off one rule. When select and ignore overlap, the <b>more specific</b> prefix wins, so <code>select = ["E501"]</code> with <code>ignore = ["E"]</code> keeps E501 on. Silence one line with <code># noqa: F401</code> and audit stale ones with rule <code>RUF100</code>.</p>`, code: { lang: 'bash', code: R`
ruff check .                     # lint
ruff check --fix .               # apply safe fixes
ruff check --select I --fix .    # just sort imports
ruff format --check .            # CI: fail if not formatted
ruff rule F401                   # explain a rule
` } },
      { title: 'Running mypy usefully', html: R`<p><code>mypy src</code> checks the package. <code>reveal_type(x)</code> inside code makes mypy print the inferred type. <code>--strict</code> turns on flags such as <code>disallow_untyped_defs</code>, <code>no_implicit_reexport</code> and <code>warn_return_any</code>. Run mypy in the project environment (<code>uv run mypy src</code>) so it sees installed packages and their stubs; in pre-commit, list typed runtime deps in <code>additional_dependencies</code> because the hook has its own venv.</p>` },
      { title: 'A tiny F401 checker with ast', html: R`<p>Linters parse code into an abstract syntax tree and walk it. This sketch finds imported names that are never used — the core idea behind Ruff's F401.</p>`, code: { lang: 'python', run: true, code: R`
import ast

src = "import os\nimport sys\nfrom typing import List\nprint(sys.argv)\n"
tree = ast.parse(src)
imported = {a.asname or a.name.split(".")[0]
            for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))
            for a in n.names}
used = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
print(sorted(imported - used))      # ['List', 'os']
` } }
    ],
    deepDive: R`<p>🟣 <b>Why Ruff is fast.</b> It parses each file once into a Rust AST, runs all rules in a single traversal, parallelises across files and caches results keyed by file content and settings (<code>.ruff_cache</code>). Fixes are classified <b>safe</b> or <b>unsafe</b> (may change behaviour); <code>--unsafe-fixes</code> opts in. Configuration is hierarchical: the closest <code>pyproject.toml</code>/<code>ruff.toml</code> applies, and <code>extend</code> can inherit a shared config. Rule precedence follows specificity, with <code>ignore</code> winning ties.</p>
<p><b>mypy internals.</b> mypy builds a module dependency graph, type checks in SCC order and caches results in <code>.mypy_cache</code>; incremental runs are fast and the <code>dmypy</code> daemon is faster still. Key concepts: <code>Any</code> silently disables checking (watch <code>warn_return_any</code>), <code>Optional</code>/<code>X | None</code> narrowing via <code>if x is not None</code>, <code>TypedDict</code>, <code>Protocol</code> for structural typing, <code>TypeVar</code>/PEP 695 generics (<code>def first[T](xs: list[T]) -&gt; T</code>, 3.12+). Pyright is faster and stricter about inference and powers Pylance; teams pick one checker for CI. Typed packages need <code>py.typed</code> in the wheel or the checker treats them as untyped.</p>`,
    aiEra: R`<p>🤖 Linters and type checkers are the cheapest guardrails for AI-written code: they catch hallucinated imports (F401/F821), undefined attributes and wrong argument types in milliseconds. Run <code>ruff check --fix</code>, <code>ruff format</code> and <code>mypy</code> in the agent's loop — many coding agents can be told to run them after each edit — and fail CI on any error. Be careful with mass auto-fixes and <code># type: ignore</code> or <code># noqa</code> comments sprinkled by an assistant to make errors "go away"; require an error code (<code># type: ignore[arg-type]</code>) and enable RUF100 / <code>warn_unused_ignores</code> so suppressions stay honest.</p>`,
    problems: [{
      title: 'Mini Linter: Find Unused Imports (F401)',
      level: 'Medium', tags: ['ast', 'static analysis', 'sets'], companies: ['Astral', 'JetBrains', 'Microsoft'],
      statement: R`<p>Write <code>unused_imports(source)</code> returning the names bound by import statements that are never used, in the order they were imported (each name once). Rules:</p>
<ul><li><code>import a.b.c</code> binds <code>a</code>; <code>import x as y</code> binds <code>y</code>; <code>from m import n as k</code> binds <code>k</code>.</li>
<li>A name is "used" if it appears anywhere as an identifier (<code>ast.Name</code>), or as a string inside a module-level <code>__all__ = [...]</code> list/tuple.</li>
<li>Skip <code>from __future__ import …</code>, star imports, and any import statement whose first line contains <code># noqa</code>.</li></ul>`,
      constraints: R`source is valid Python 3, ≤ 10<sup>4</sup> lines. Shadowing and scoping subtleties (a later re-assignment of the same name) can be ignored.`,
      example: R`<p><code>"import os\nimport sys\nfrom typing import List\nprint(sys.argv)\n"</code> → ${H.c('g', '["os", "List"]')}. <code>sys</code> is used as a Name in <code>sys.argv</code>; <code>os</code> and <code>List</code> never appear.</p>`,
      brute: { why: R`<p>A regex/substring search ("does the word <code>os</code> appear later?") is fooled by comments, strings and longer identifiers like <code>cosine</code> or <code>pos</code>. Parsing with <code>ast</code> means only real identifiers count.</p>`, code: { lang: 'python', code: R`
def unused_naive(source):
    names = [ln.split()[1] for ln in source.splitlines() if ln.startswith("import ")]
    body = source
    return [n for n in names if body.count(n) == 1]   # "pos" counts as a use of "os"
` } },
      mcq: { q: 'Why does a real linter treat names listed in <code>__all__</code> as used?', options: ['They are re-exported on purpose, so removing the import would break <code>from pkg import *</code> users', 'Because <code>__all__</code> runs the imports again', 'Because mypy requires it', 'It does not; they are reported anyway'], answer: 0, explain: 'An import that only exists to re-export a name is intentional. Pyflakes/Ruff look at __all__ to avoid flagging those, which is why packages list re-exports there.' },
      hints: [R`<p>Hint 1: <code>ast.parse</code> the source, then walk it twice: once for import nodes, once for <code>ast.Name</code> identifiers.</p>`, R`<p>Hint 2: for <code>ast.Import</code> the bound name is <code>alias.asname or alias.name.split(".")[0]</code>; for <code>ast.ImportFrom</code> it is <code>alias.asname or alias.name</code>. Use <code>node.lineno</code> to read the source line and look for <code># noqa</code>.</p>`, R`<p>Hint 3: collect strings from top-level <code>__all__</code> assignments into the used set. Keep imports in a list (sorted by line/col) and output those not in used, without duplicates.</p>`],
      tests: { sig: 'string -> string[]', fn: 'unused_imports', cases: [
        [['import os\nimport sys\nfrom typing import List\nprint(sys.argv)\n'], ['os', 'List']],
        [[''], []],
        [['import os.path\nprint(os.path.join("a", "b"))\n'], []],
        [['import numpy as np\nimport pandas as pd\nx = np.zeros(3)\n'], ['pd']],
        [['from __future__ import annotations\nfrom json import *\nimport re  # noqa: F401\n'], []],
        [['from .core import api, helper\n__all__ = ["api"]\n'], ['helper']],
        [['import collections\npos = 1\n# os is mentioned\n'], ['collections']],
        [['import a\nimport a\n'], ['a']],
        [['from x import (\n    y,\n    z,\n)\ndef f() -> "y":\n    return z\n'], ['y']]
      ] },
      solution: {
        approach: R`<p>Parse once with <code>ast</code>. Collect <code>(lineno, col, name)</code> for every bound import name (skipping <code>__future__</code>, <code>*</code> and <code># noqa</code> lines), collect every <code>ast.Name</code> id plus strings in top-level <code>__all__</code>, and return the imported names not used, in source order. Note: string annotations like <code>"y"</code> are not parsed here, so <code>y</code> is reported — real Ruff does parse them, a good follow-up.</p>`,
        code: { lang: 'python', run: true, code: R`
import ast


def unused_imports(source):
    tree = ast.parse(source)
    lines = source.splitlines()
    imported = []                                   # (line, col, name)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.ImportFrom) and node.module == "__future__":
                continue
            if "# noqa" in lines[node.lineno - 1]:
                continue
            for alias in node.names:
                if alias.name == "*":
                    continue
                if isinstance(node, ast.Import):
                    name = alias.asname or alias.name.split(".")[0]
                else:
                    name = alias.asname or alias.name
                imported.append((node.lineno, node.col_offset, name))
    used = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
    for stmt in tree.body:                          # module-level __all__ re-exports
        if isinstance(stmt, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "__all__" for t in stmt.targets):
            if isinstance(stmt.value, (ast.List, ast.Tuple)):
                used |= {e.value for e in stmt.value.elts if isinstance(e, ast.Constant) and isinstance(e.value, str)}
    out = []
    for _, _, name in sorted(imported):
        if name not in used and name not in out:
            out.append(name)
    return out


print(unused_imports("import os\nimport sys\nfrom typing import List\nprint(sys.argv)\n"))
` },
        dry: { head: ['import', 'binds', 'used?', 'report'], rows: [['import os', 'os', 'no', 'os'], ['import sys', 'sys', 'yes (sys.argv)', '-'], ['from typing import List', 'List', 'no', 'List']] },
        complexity: R`<p>O(N) in the number of AST nodes; O(I + U) extra space for imported and used names.</p>`,
        followUps: ['How would you handle names used only inside string annotations or <code>TYPE_CHECKING</code> blocks?', 'How would you generate a safe auto-fix that deletes only the unused alias from a multi-name import?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Publishing to PyPI, reproducible builds in CI and Docker
     ====================================================================== */
  topics.push({
    title: 'Publishing to PyPI and Reproducible Builds in CI and Docker',
    analogy: R`<p>A pharmacy does not hand out pills from an unlabelled jar. Each box has a <b>batch number and a seal</b>; if the seal does not match the batch record, the box is rejected. Hash-checked installs are that seal for packages. <b>Trusted publishing</b> is the factory proving its identity to the pharmacy with a short-lived badge instead of a master key that could be stolen.</p>`,
    explain: R`<p>🟢 <b>Publishing.</b> Build once (<code>uv build</code> / <code>python -m build</code>), check (<code>twine check dist/*</code>), then upload to <b>TestPyPI</b> first and PyPI second (<code>uv publish</code> or <code>twine upload</code>). Versions are immutable: you can never re-upload the same file name, only yank it (PEP 592) and release a new version. The modern way to authenticate from CI is <b>Trusted Publishing</b>: PyPI trusts an OIDC token from a specific GitHub Actions workflow/environment, so no long-lived API token is stored anywhere. PyPI also supports <b>attestations</b> (PEP 740) that prove which workflow built a file.</p>
<p>🟢 <b>Reproducible installs in CI.</b> Pin the Python version, install from the lock (<code>uv sync --locked</code>, <code>poetry sync</code>, or <code>pip install --require-hashes -r requirements.txt</code>), cache the package cache keyed on the lock file hash, and run the same checks as pre-commit plus tests.</p>
<p>🟢 <b>Docker.</b> Order layers from least to most frequently changed: base image (pinned by digest), then copy <b>only</b> <code>pyproject.toml</code> + lock and install dependencies, then copy the source. A code change then reuses the cached dependency layer. Use a multi-stage build so compilers and caches stay out of the final image.</p>`,
    clues: [
      '"how do you publish without storing a PyPI token?" → Trusted Publishing (OIDC) from CI',
      '"I uploaded a broken release" → yank it and publish a fixed version; files cannot be replaced',
      '"Docker rebuild reinstalls all dependencies on every code change" → copy the lock file before the source',
      '"protect against a tampered package" → hashes in the lock + <code>--require-hashes</code>',
      '"same build every time" → pinned base image digest, locked deps, <code>SOURCE_DATE_EPOCH</code> for byte-identical artefacts'
    ],
    code: [{ lang: 'text', title: 'GitHub Actions: test, build and trusted-publish', code: R`
name: release
on: { push: { tags: ["v*"] } }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true }          # cache keyed on uv.lock
      - run: uv sync --locked
      - run: uv run ruff check . && uv run ruff format --check . && uv run mypy src
      - run: uv run pytest -q
  publish:
    needs: test
    runs-on: ubuntu-latest
    environment: pypi
    permissions: { id-token: write }          # OIDC token for Trusted Publishing
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv build
      - run: uv publish                       # no password: PyPI trusts this workflow
` }, { lang: 'text', title: 'Dockerfile: cache-friendly, multi-stage, locked', code: R`
FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.4.20 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project --no-dev   # deps layer: cached until the lock changes
COPY src ./src
RUN uv sync --locked --no-dev                        # installs just the project

FROM python:3.12-slim
COPY --from=build /app /app
ENV PATH="/app/.venv/bin:$PATH"
USER 1000
CMD ["acme-bill"]
` }],
    viz: [{
      title: 'Docker layer cache: which steps rebuild after a change?',
      input: 'src/acme/cli.py',
      inputLabel: 'changed files (space separated), e.g. uv.lock or src/acme/cli.py',
      gen: function (input) {
        var changed = words(input);
        if (changed.length > 8) throw new Error('Give at most 8 changed files');
        var steps = [
          { s: 'FROM python:3.12-slim', copy: null },
          { s: 'COPY pyproject.toml uv.lock ./', copy: ['pyproject.toml', 'uv.lock'] },
          { s: 'RUN uv sync --locked --no-install-project', copy: null },
          { s: 'COPY src ./src', copy: ['src'] },
          { s: 'RUN uv sync --locked', copy: null }
        ];
        var frames = [], status = steps.map(function () { return 'cached'; }), broken = -1;
        frames.push(fr('Docker caches every layer. A <code>COPY</code> layer is reused only if the copied files are byte-identical; once one layer rebuilds, <b>every later layer rebuilds</b> too.', [
          { type: 'table', label: 'Dockerfile', columns: ['#', 'step', 'cache'], rows: steps.map(function (st, i) { return [i, st.s, '?']; }) },
          { type: 'set', label: 'changed files', items: changed.length ? changed : ['(none)'] }
        ]));
        steps.forEach(function (st, i) {
          var hit = false;
          if (broken < 0 && st.copy) hit = changed.some(function (f) { return st.copy.some(function (c) { return f === c || f.indexOf(c + '/') === 0; }); });
          if (hit && broken < 0) broken = i;
          if (broken >= 0 && i >= broken) status[i] = 'REBUILD';
          var hl = {}; hl[i] = status[i] === 'REBUILD' ? 'bad' : 'ok';
          frames.push(fr('Step ' + i + ' <code>' + esc(st.s) + '</code>: ' + (status[i] === 'REBUILD' ? (i === broken ? 'its input changed, so the cache is <b>invalidated here</b>.' : 'rebuilt because an earlier layer changed.') : 'inputs unchanged → reuse cached layer.'), [
            { type: 'table', label: 'Dockerfile', columns: ['#', 'step', 'cache'], rows: steps.map(function (s2, j) { return [j, s2.s, j <= i ? status[j] : '?']; }), hl: hl }
          ]));
        });
        frames.push(fr(broken < 0 ? 'Nothing relevant changed: the whole image comes from cache.' : broken >= 3 ? H.c('g', 'Only the source layers rebuilt') + ' — the slow dependency install (step 2) was reused. That is why the lock file is copied first.' : H.c('r', 'Dependencies reinstall') + ' because pyproject.toml or uv.lock changed — expected after a dependency update.', [
          { type: 'vars', label: 'summary', vals: { first_rebuilt_step: broken, deps_reinstalled: broken >= 0 && broken <= 2 }, hl: { first_rebuilt_step: 'sel' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Trusted Publishing setup', html: R`<p>On PyPI: project → Publishing → add a trusted publisher (owner, repo, workflow file name, environment). In the workflow give the job <code>permissions: id-token: write</code> and call <code>uv publish</code> or <code>pypa/gh-action-pypi-publish</code>. For a brand-new project you can register a "pending publisher" before the first upload. Protect the <code>pypi</code> environment with required reviewers so a tag alone cannot release.</p>` },
      { title: 'Hash-checking mode', html: R`<p>With <code>--require-hashes</code> pip refuses any requirement that is not pinned with <code>==</code> and does not carry a <code>--hash</code>, and fails if a download's sha256 does not match. That defends against a compromised mirror or a re-uploaded file at a different URL. uv verifies the hashes in <code>uv.lock</code> automatically.</p>`, code: { lang: 'text', check: false, code: R`
# requirements.txt (generated by: uv pip compile --generate-hashes requirements.in)
idna==3.10 \
    --hash=sha256:12f65c9b470abda6dc35cf8e63cc574b1c52b11df2c86030af0ac09b01b13ea9 \
    --hash=sha256:946d195a0d259cbba61165e88e65941f16e9b36ea6ddb97f00452bae8b1287d3
` } },
      { title: 'Byte-for-byte reproducible artefacts', html: R`<p>Two builds of the same commit should produce identical wheels, so anyone can verify a release. Set <code>SOURCE_DATE_EPOCH</code> (to the commit timestamp) so zip entry times are fixed; hatchling, flit and setuptools respect it. Pin the build backend in <code>[build-system] requires</code> and build in a pinned image. Then compare sha256 sums from two independent builds.</p>`, code: { lang: 'bash', code: R`
export SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)
uv build && sha256sum dist/*
` } }
    ],
    deepDive: R`<p>🟣 <b>Supply-chain threats</b> include typosquatting (<code>reqeusts</code>), dependency confusion (a public package with the same name as your private one wins because of a higher version — fix with a single index or uv's <code>index-strategy</code> default of "first index wins", or explicit <code>[[tool.uv.index]]</code> pinning), compromised maintainer accounts, and malicious install-time code in sdists' build backends. Mitigations: lock with hashes, prefer wheels (<code>--only-binary :all:</code>), mirror through a private index (Artifactory, devpi, AWS CodeArtifact), scan with <code>pip-audit</code>/OSV, and verify PEP 740 attestations or Sigstore signatures.</p>
<p><b>CI caching details.</b> Cache uv's or pip's download cache, not the venv, keyed on the lock hash plus Python version and OS; <code>uv cache prune --ci</code> keeps the cache small by dropping wheels it can rebuild cheaply. In Docker, <code>RUN --mount=type=cache,target=/root/.cache/uv</code> reuses downloads between builds without baking them into layers. <b>Version numbering</b>: dynamic versions from git tags (setuptools-scm, hatch-vcs) avoid "forgot to bump" mistakes; <code>uv version --bump minor</code> or <code>poetry version minor</code> edit a static version. Never reuse a version number, even on TestPyPI.</p>`,
    aiEra: R`<p>🤖 Supply-chain attacks increasingly target AI workflows: assistants can hallucinate package names that attackers then register, and agents with shell access may run <code>pip install</code> on anything. Defences: run agents in containers built from your lock file, block arbitrary installs (or allow only a private index), and require human review for dependency additions. On the positive side, AI is very good at writing CI workflows and Dockerfiles from a description — but check the details it often gets wrong: missing <code>id-token: write</code>, copying the whole repo before installing dependencies, or <code>pip install</code> without the lock file.</p>`,
    problems: [{
      title: 'Hash-Checking Mode: Verify Downloads Against a Lock',
      level: 'Medium', tags: ['hashing', 'hashlib', 'security'], companies: ['Google', 'Chainguard', 'GitLab'],
      statement: R`<p>Simulate pip's <code>--require-hashes</code>. <code>lock</code> lines look like <code>"name==ver --hash=sha256:HEX"</code> (zero or more <code>--hash</code> options; any one may match). <code>downloads</code> lines are <code>"name==ver:content"</code>, where the file bytes are <code>content.encode()</code>. Return a list of problems, empty if everything is fine:</p>
<ul><li>For each lock line, in order: <code>"name==ver: no hash"</code> if it has no hash; else <code>"name==ver: missing"</code> if it was not downloaded; else <code>"name==ver: hash mismatch"</code> if sha256 of the content matches none of its hashes.</li>
<li>Then, in download order, <code>"name==ver: not in lock"</code> for downloads that no lock line pins.</li></ul>`,
      constraints: R`≤ 10<sup>4</sup> lines each; content contains no newline; hashes are lowercase hex; <code>name==ver</code> strings are compared exactly.`,
      example: R`<p>lock <code>["idna==3.10 --hash=sha256:${HA}"]</code>, downloads <code>["idna==3.10:alpha"]</code> → ${H.c('g', '[]')} because sha256("alpha") equals the pinned hash. With content <code>"beta"</code> the answer is ${H.c('r', '["idna==3.10: hash mismatch"]')}.</p>`,
      brute: { why: R`<p>Checking only that the <i>name and version</i> match (no hashing) accepts a tampered file — exactly the attack hashes exist to stop. And scanning the download list for each lock line is O(n·m); a dict keyed by <code>name==ver</code> is linear.</p>`, code: { lang: 'python', code: R`
def verify_naive(lock, downloads):
    got = [d.split(":", 1)[0] for d in downloads]
    return [l.split()[0] + ": missing" for l in lock if l.split()[0] not in got]   # never checks content
` } },
      mcq: { q: 'In <code>--require-hashes</code> mode, what happens to a requirement written as <code>idna&gt;=3</code>?', options: ['pip rejects it: every requirement must be pinned with == and carry a hash', 'pip installs the newest idna and records its hash', 'pip ignores hashes for unpinned packages', 'pip downloads it but skips verification'], answer: 0, explain: 'Hash checking only makes sense for one exact file, so pip demands == pins (and hashes) for every requirement, including transitive ones.' },
      hints: [R`<p>Hint 1: parse downloads into a dict <code>{"name==ver": content}</code> first.</p>`, R`<p>Hint 2: for each lock line, the first token is the pin; collect every token starting with <code>--hash=sha256:</code> into a set. <code>hashlib.sha256(content.encode()).hexdigest()</code> gives the digest.</p>`, R`<p>Hint 3: check in the order no hash → missing → mismatch. Afterwards walk downloads and report pins not seen in the lock. Split downloads on the <b>first</b> <code>:</code> only.</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'verify_hashes', cases: [
        [[['idna==3.10 --hash=sha256:' + HA], ['idna==3.10:alpha']], []],
        [[['idna==3.10 --hash=sha256:' + HA], ['idna==3.10:beta']], ['idna==3.10: hash mismatch']],
        [[['idna==3.10 --hash=sha256:' + HB + ' --hash=sha256:' + HA], ['idna==3.10:alpha']], []],
        [[['six==1.16.0'], ['six==1.16.0:gamma']], ['six==1.16.0: no hash']],
        [[['a==1 --hash=sha256:' + HA, 'b==2 --hash=sha256:' + HB], ['b==2:beta']], ['a==1: missing']],
        [[[], ['evil==9.9:alpha']], ['evil==9.9: not in lock']],
        [[[], []], []],
        [[['a==1 --hash=sha256:' + HG, 'b==2', 'c==3 --hash=sha256:' + HB], ['c==3:gamma', 'x==0:alpha', 'a==1:gamma']], ['b==2: no hash', 'c==3: hash mismatch', 'x==0: not in lock']],
        [[['url==1 --hash=sha256:' + HA], ['url==1:alpha:with:colons']], ['url==1: hash mismatch']]
      ] },
      solution: {
        approach: R`<p>Index downloads by pin, then check each lock line in order with the precedence no-hash → missing → mismatch, and finally report unexpected downloads. The real pip also requires every transitive dependency to be in the file, which is what the "not in lock" rule models.</p>`,
        code: { lang: 'python', run: true, code: R`
import hashlib


def verify_hashes(lock, downloads):
    files = {}
    for d in downloads:
        pin, _, content = d.partition(":")           # split on the first ":" only
        files[pin] = content
    problems, pinned = [], set()
    for line in lock:
        tokens = line.split()
        pin = tokens[0]
        pinned.add(pin)
        allowed = {t[len("--hash=sha256:"):] for t in tokens[1:] if t.startswith("--hash=sha256:")}
        if not allowed:
            problems.append(f"{pin}: no hash")
        elif pin not in files:
            problems.append(f"{pin}: missing")
        elif hashlib.sha256(files[pin].encode()).hexdigest() not in allowed:
            problems.append(f"{pin}: hash mismatch")
    for d in downloads:
        pin = d.partition(":")[0]
        if pin not in pinned:
            problems.append(f"{pin}: not in lock")
    return problems


good = "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8"   # sha256("alpha")
print(verify_hashes([f"idna==3.10 --hash=sha256:{good}"], ["idna==3.10:alpha"]))   # []
print(verify_hashes([f"idna==3.10 --hash=sha256:{good}"], ["idna==3.10:beta"]))
` },
        dry: { head: ['lock pin', 'hashes', 'downloaded', 'sha256 match', 'report'], rows: [['a==1', '{be9d…}', 'gamma', 'yes', '-'], ['b==2', '{}', '-', '-', 'no hash'], ['c==3', '{f44e…}', 'gamma', 'no', 'hash mismatch'], ['x==0', '(not pinned)', 'alpha', '-', 'not in lock']] },
        complexity: R`<p>O(L + D + total content size) time for hashing, O(D) extra space.</p>`,
        followUps: ['Real lock files store one hash per wheel/sdist. How would you choose which file to download and then verify?', 'Why is hash-checking alone not enough against a malicious but correctly hashed release?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE ARENA (Easy → Medium → Hard)
     ====================================================================== */
  practice.push({
    title: 'Normalize a Package Name (PEP 503)',
    level: 'Easy', tags: ['strings', 'regex', 'PEP 503'], companies: ['PyPI', 'Shopify', 'Atlassian'],
    statement: R`<p>Package indexes treat <code>Typing_Extensions</code>, <code>typing-extensions</code> and <code>typing.extensions</code> as the same project. Write <code>normalize_name(name)</code>: lowercase the name and replace every run of <code>-</code>, <code>_</code> or <code>.</code> with a single <code>-</code>.</p>`,
    constraints: R`1 ≤ len(name) ≤ 200; name contains only ASCII letters, digits, <code>-</code>, <code>_</code>, <code>.</code>.`,
    example: R`<p><code>"Zope.Interface"</code> → ${H.c('g', '"zope-interface"')}; <code>"A--B__c..d"</code> → ${H.c('g', '"a-b-c-d"')} (each <i>run</i> becomes one dash).</p>`,
    brute: { why: R`<p>Replacing each character separately turns <code>"a__b"</code> into <code>"a--b"</code>, which is not normalized. Runs must collapse.</p>`, code: { lang: 'python', code: R`
def normalize_wrong(name):
    return name.lower().replace("_", "-").replace(".", "-")   # "a__b" -> "a--b"
` } },
    mcq: { q: 'Which pair names the <b>same</b> PyPI project?', options: ['<code>Flask_SQLAlchemy</code> and <code>flask-sqlalchemy</code>', '<code>pyyaml</code> and <code>yaml</code>', '<code>bs4</code> and <code>beautifulsoup4</code>', '<code>sklearn</code> and <code>scikit-learn</code>'], answer: 0, explain: 'Normalization only touches case and the separators - _ and .; different words are different projects (bs4 and sklearn are separate, mostly placeholder, distributions).' },
    hints: [R`<p>Hint 1: the rule is about <b>runs</b> of separators, so think regex with <code>+</code>.</p>`, R`<p>Hint 2: <code>re.sub(r"[-_.]+", "-", name)</code> collapses each run into one dash.</p>`, R`<p>Hint 3: apply <code>.lower()</code> as well; a single-character name stays as it is.</p>`],
    tests: { sig: 'string -> string', fn: 'normalize_name', cases: [
      [['Typing_Extensions'], 'typing-extensions'], [['Zope.Interface'], 'zope-interface'], [['A--B__c..d'], 'a-b-c-d'],
      [['requests'], 'requests'], [['Django'], 'django'], [['a-_.b'], 'a-b'], [['x'], 'x'], [['ruamel.yaml.clib'], 'ruamel-yaml-clib']
    ] },
    solution: {
      approach: R`<p>One regex substitution plus <code>lower()</code>. This exact function is in PEP 503 and is what pip, uv and PyPI use to compare names.</p>`,
      code: { lang: 'python', run: true, code: R`
import re


def normalize_name(name):
    return re.sub(r"[-_.]+", "-", name).lower()


print(normalize_name("Typing_Extensions"), normalize_name("A--B__c..d"))
` },
      dry: { head: ['input', 'after re.sub', 'after lower'], rows: [['A--B__c..d', 'A-B-c-d', 'a-b-c-d'], ['Zope.Interface', 'Zope-Interface', 'zope-interface']] },
      complexity: R`<p>O(n) time and space.</p>`,
      followUps: ['Where else does normalization matter: wheel file names (PEP 427 uses underscores), lock files, import names?']
    }
  });

  practice.push({
    title: 'Parse a Wheel File Name',
    level: 'Easy', tags: ['strings', 'parsing', 'wheels'], companies: ['Anaconda', 'Amazon', 'Red Hat'],
    statement: R`<p>Write <code>parse_wheel_name(filename)</code> returning <code>[name, version, build, python, abi, platform]</code> for a wheel named <code>{name}-{version}(-{build})?-{python}-{abi}-{platform}.whl</code>. <code>build</code> is <code>""</code> when absent and, when present, must start with a digit. Return <code>[]</code> for anything invalid (wrong suffix, wrong number of fields, bad build tag).</p>`,
    constraints: R`len(filename) ≤ 255. Names in wheel files use underscores instead of dashes, so splitting on <code>-</code> is safe.`,
    example: R`<p><code>"pkg-1.0-1-py3-none-any.whl"</code> → ${H.c('g', '["pkg", "1.0", "1", "py3", "none", "any"]')}; <code>"pkg-1.0.tar.gz"</code> → ${H.c('r', '[]')}.</p>`,
    brute: { why: R`<p>Unpacking exactly five fields crashes on wheels with a build tag (six fields) and accepts sdists by accident if they contain dashes.</p>`, code: { lang: 'python', code: R`
def parse_naive(filename):
    name, ver, py, abi, plat = filename[:-4].split("-")   # ValueError with a build tag
    return [name, ver, "", py, abi, plat]
` } },
    mcq: { q: 'What does the optional build tag in a wheel name do?', options: ['Breaks ties between wheels of the same version and tags (higher build wins)', 'Marks a pre-release', 'Selects the CPU architecture', 'Names the build backend'], answer: 0, explain: 'A build number lets a project re-publish a fixed wheel for the same version and tags; installers prefer the higher build tag.' },
    hints: [R`<p>Hint 1: check the <code>.whl</code> suffix, strip it, split on <code>-</code>.</p>`, R`<p>Hint 2: 5 fields → no build; 6 fields → the third field is the build tag.</p>`, R`<p>Hint 3: validate that the build tag starts with a digit; anything else returns <code>[]</code>.</p>`],
    tests: { sig: 'string -> string[]', fn: 'parse_wheel_name', cases: [
      [['six-1.16.0-py2.py3-none-any.whl'], ['six', '1.16.0', '', 'py2.py3', 'none', 'any']],
      [['numpy-2.1.2-cp312-cp312-macosx_14_0_arm64.whl'], ['numpy', '2.1.2', '', 'cp312', 'cp312', 'macosx_14_0_arm64']],
      [['pkg-1.0-1-py3-none-any.whl'], ['pkg', '1.0', '1', 'py3', 'none', 'any']],
      [['pkg-1.0.tar.gz'], []],
      [['pkg-1.0-py3-none.whl'], []],
      [['typing_extensions-4.12.2-py3-none-any.whl'], ['typing_extensions', '4.12.2', '', 'py3', 'none', 'any']],
      [['pkg-1.0-x1-py3-none-any.whl'], []],
      [['a-1-2-3-4-5-6.whl'], []]
    ] },
    solution: {
      approach: R`<p>Validate the suffix, split once, branch on the field count, and validate the build tag. <code>packaging.utils.parse_wheel_filename</code> does this (plus name normalization) in real tools.</p>`,
      code: { lang: 'python', run: true, code: R`
def parse_wheel_name(filename):
    if not filename.endswith(".whl"):
        return []
    parts = filename[:-4].split("-")
    if len(parts) == 5:
        name, ver, py, abi, plat = parts
        build = ""
    elif len(parts) == 6:
        name, ver, build, py, abi, plat = parts
        if not build[:1].isdigit():
            return []
    else:
        return []
    return [name, ver, build, py, abi, plat]


print(parse_wheel_name("pkg-1.0-1-py3-none-any.whl"))
` },
      dry: { head: ['fields', 'count', 'result'], rows: [['pkg|1.0|1|py3|none|any', '6', 'build = "1" (digit) → ok'], ['pkg|1.0|py3|none', '4', 'wrong count → []']] },
      complexity: R`<p>O(n) time and space.</p>`,
      followUps: ['How would you also normalize <code>name</code> and validate <code>version</code> with PEP 440?']
    }
  });

  practice.push({
    title: 'Is It a Pre-release?',
    level: 'Easy', tags: ['regex', 'PEP 440'], companies: ['Datadog', 'Stripe', 'Canonical'],
    statement: R`<p>Installers skip pre-releases by default. Write <code>is_prerelease(version)</code> that returns <code>True</code> if a valid PEP 440 version has an alpha/beta/rc segment (any spelling: <code>a</code>, <code>alpha</code>, <code>b</code>, <code>beta</code>, <code>rc</code>, <code>c</code>, <code>pre</code>, <code>preview</code>) <b>or</b> a <code>.dev</code> segment. Post-releases and local labels alone do not count.</p>`,
    constraints: R`Input is a valid PEP 440 version, ≤ 64 characters, case-insensitive.`,
    example: R`<p><code>"1.0.dev4"</code> → ${H.c('g', 'True')} (dev releases are pre-releases); <code>"1.0.post1"</code> → ${H.c('r', 'False')}; <code>"3.1.0-alpha.1"</code> → ${H.c('g', 'True')}.</p>`,
    brute: { why: R`<p>Searching for the letters <code>a</code>, <code>b</code> or <code>c</code> anywhere in the string misfires on local labels like <code>1.0+abc</code>, and misses nothing obvious only by luck. Parse the grammar instead.</p>`, code: { lang: 'python', code: R`
def is_pre_naive(v):
    return any(ch in v.lower() for ch in "abc") or "dev" in v   # "1.0+abc" -> True (wrong)
` } },
    mcq: { q: 'Is <code>1.0.dev1</code> installed by <code>pip install "pkg&gt;=0.9"</code> by default?', options: ['No — dev releases count as pre-releases and are opt-in', 'Yes — dev releases are normal releases', 'Only on Python 3.12+', 'Only if it is the newest version'], answer: 0, explain: 'PEP 440 treats dev releases as pre-releases. pip includes them only with --pre, an explicit pre-release in the specifier, or (as a fallback) when nothing else satisfies the requirement.' },
    hints: [R`<p>Hint 1: drop any <code>+local</code> part first; it never makes a version a pre-release.</p>`, R`<p>Hint 2: a regex with groups for the pre segment and the dev segment is enough; the post segment can simply be matched and ignored.</p>`, R`<p>Hint 3: return <code>pre_group is not None or dev_group is not None</code>, using <code>re.IGNORECASE</code>.</p>`],
    tests: { sig: 'string -> bool', fn: 'is_prerelease', cases: [
      [['1.0'], false], [['1.0rc1'], true], [['2.0.0b3'], true], [['1.0.dev4'], true],
      [['1.0.post1'], false], [['1.0a1.post2'], true], [['3.1.0-alpha.1'], true], [['1.0+abc'], false], [['1.0.post1.dev2'], true]
    ] },
    solution: {
      approach: R`<p>Reuse the PEP 440 parser and check the pre and dev fields — the same rule as <code>packaging.version.Version.is_prerelease</code>.</p>`,
      code: { lang: 'python', run: true, code: VERSION_PY + R`


def is_prerelease(version):
    v = parse_version(version)
    return v["pre"] is not None or v["dev"] is not None


print([is_prerelease(v) for v in ["1.0", "1.0rc1", "1.0.dev4", "1.0.post1"]])
` },
      dry: { head: ['version', 'pre', 'dev', 'answer'], rows: [['1.0rc1', '(2, 1)', 'None', 'True'], ['1.0.post1', 'None', 'None', 'False'], ['1.0.post1.dev2', 'None', '2', 'True']] },
      complexity: R`<p>O(n) time per call for the regex match, O(1) extra space.</p>`,
      followUps: ['How does pip decide to install a pre-release when it is the <i>only</i> version that satisfies the requirement?']
    }
  });

  practice.push({
    title: 'Requirement Specifier Matcher',
    level: 'Medium', tags: ['PEP 440', 'parsing', 'specifiers'], companies: ['Astral', 'Anaconda', 'Bloomberg'],
    statement: R`<p>Write <code>matches(version, spec)</code>. <code>spec</code> is a comma-separated set of clauses (all must hold; empty spec matches everything) using <code>== != &lt;= &gt;= &lt; &gt; ~=</code> and wildcard <code>==X.Y.*</code>/<code>!=X.Y.*</code>. Follow PEP 440:</p>
<ul><li><code>~=V</code> means <code>&gt;=V</code> and <code>==</code> V's release without its last segment, as a prefix.</li>
<li><code>&gt;V</code> never matches a post-release of V; <code>&lt;V</code> never matches a pre-release of V (unless V is itself a pre-release).</li>
<li>Pre-release candidates match only if some non-<code>!=</code> clause names a pre-release (pip's default without <code>--pre</code>).</li>
<li><code>==V</code> ignores the candidate's <code>+local</code> label when V has none.</li></ul>`,
    constraints: R`Versions are valid PEP 440; ≤ 10 clauses; whitespace around clauses may appear.`,
    example: R`<p><code>matches("1.4.7", "~=1.4.5")</code> → ${H.c('g', 'True')} (≥ 1.4.5 and starts with 1.4). <code>matches("2.0rc1", "&gt;=1.0")</code> → ${H.c('r', 'False')}: pre-releases are opt-in.</p>`,
    brute: { why: R`<p>Converting versions to float (<code>float("1.10") &lt; float("1.9")</code>) or comparing strings gets the order wrong, and ignoring the pre-release and post-release rules lets pip-incompatible versions through.</p>`, code: { lang: 'python', code: R`
def matches_naive(version, spec):
    op, target = spec[:2], spec[2:]
    return {">=": float(version) >= float(target)}[op]   # 1.10 < 1.9 as floats
` } },
    mcq: { q: 'What does <code>~=2.2</code> allow?', options: ['<code>&gt;=2.2, ==2.*</code> — any 2.x from 2.2', '<code>&gt;=2.2, ==2.2.*</code> — patch releases only', 'Exactly 2.2', 'Anything ≥ 2.2 including 3.0'], answer: 0, explain: 'Compatible release drops the last written segment: ~=2.2 keeps the major 2. Write ~=2.2.0 if you want only 2.2.x.' },
    hints: [R`<p>Hint 1: parse each version into a PEP 440 sort key first; every ordered operator is then a tuple comparison.</p>`, R`<p>Hint 2: wildcard <code>==1.4.*</code> is a prefix test on the release numbers (pad the candidate with zeros), and <code>~=</code> is <code>&gt;=</code> plus a wildcard.</p>`, R`<p>Hint 3: decide the pre-release rule once for the whole set, then <code>all(...)</code> over the clauses; add the special cases for <code>&gt;</code> (post of same release) and <code>&lt;</code> (pre of same release).</p>`],
    tests: { sig: 'string string -> bool', fn: 'matches', cases: [
      [['1.4.7', '~=1.4.5'], true], [['1.5.0', '~=1.4.5'], false], [['2.0rc1', '>=1.0'], false], [['2.0rc1', '>=2.0rc1'], true],
      [['1.7.post1', '>1.7'], false], [['1.7.1', '>1.7'], true], [['1.6', '>=1.0, <1.7'], true], [['1.0+abc', '==1.0'], true],
      [['1.4.2', '==1.4.*'], true], [['1.40', '==1.4.*'], false], [['2.0', '!=2.0.*,>=1'], false], [['3.0', ''], true],
      [['1.0', '<=1.0.0'], true], [['1.0', '==1.0.0'], true]
    ] },
    solution: {
      approach: R`<p>Implement each operator on top of the PEP 440 key, handle wildcards as release-prefix tests, rewrite <code>~=</code> as two clauses, apply the two exclusive-operator special cases, and gate pre-releases once per specifier set. This mirrors <code>packaging.specifiers.SpecifierSet.contains</code> with pip's default pre-release policy.</p>`,
      code: { lang: 'python', run: true, code: SPEC_PY + R`


print(matches("1.4.7", "~=1.4.5"), matches("2.0rc1", ">=1.0"), matches("1.7.post1", ">1.7"))
` },
      dry: { head: ['clause', 'candidate 1.4.7', 'result'], rows: [['~=1.4.5 → >=1.4.5', '(1,4,7) ≥ (1,4,5)', 'True'], ['~=1.4.5 → ==1.4.*', 'release starts 1.4', 'True'], ['pre-release gate', 'not a pre-release', 'pass']] },
      complexity: R`<p>O(c · L) for c clauses of length L.</p>`,
      followUps: ['How would you compute the <i>intersection</i> of two specifier sets as a version range?', 'What does the arbitrary-equality operator <code>===</code> do and why is it discouraged?']
    }
  });

  practice.push({
    title: 'Sort Versions the PEP 440 Way',
    level: 'Medium', tags: ['sorting', 'key functions', 'PEP 440'], companies: ['GitHub', 'JetBrains', 'Spotify'],
    statement: R`<p>Write <code>sort_versions(versions)</code> that returns the versions in ascending PEP 440 order. Versions that are equal under PEP 440 (<code>1.0</code> and <code>1.0.0</code>) keep their input order.</p>`,
    constraints: R`0 ≤ n ≤ 10<sup>5</sup>; all versions valid; strings must be returned unchanged.`,
    example: R`<p><code>["1.10", "1.9", "1.0rc1", "1.0", "1.0.post1", "1.0.dev1"]</code> → ${H.c('g', '["1.0.dev1", "1.0rc1", "1.0", "1.0.post1", "1.9", "1.10"]')}.</p>`,
    brute: { why: R`<p><code>sorted(versions)</code> uses string order: <code>"1.10" &lt; "1.9"</code> and <code>"1.0" &lt; "1.0.dev1"</code>. A comparator with <code>cmp_to_key</code> works but is slower than a key function.</p>`, code: { lang: 'python', code: R`
def sort_naive(versions):
    return sorted(versions)        # ['1.0', '1.0.dev1', '1.0.post1', '1.0rc1', '1.10', '1.9']
` } },
    mcq: { q: 'Why is a key function better than <code>functools.cmp_to_key</code> here?', options: ['The key is computed once per item (n times) instead of on every comparison (n log n times)', 'cmp_to_key is not stable', 'Keys allow sorting strings only', 'cmp_to_key is removed in Python 3'], answer: 0, explain: 'sorted() caches keys; a comparator re-parses both versions on each of the O(n log n) comparisons. Both are stable.' },
    hints: [R`<p>Hint 1: build a tuple key per version so plain tuple comparison gives PEP 440 order.</p>`, R`<p>Hint 2: release with trailing zeros removed; sentinels for missing pre (+∞), post (−∞), dev (+∞); dev-only gets pre = −∞.</p>`, R`<p>Hint 3: <code>sorted(versions, key=version_key)</code> — Python's sort is stable, so equal versions keep input order automatically.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'sort_versions', cases: [
      [[['1.10', '1.9', '1.0rc1', '1.0', '1.0.post1', '1.0.dev1']], ['1.0.dev1', '1.0rc1', '1.0', '1.0.post1', '1.9', '1.10']],
      [[['1.0', '1.0.0']], ['1.0', '1.0.0']], [[['1.0.0', '1.0']], ['1.0.0', '1.0']], [[[]], []],
      [[['2!1.0', '2024.1', '1!9']], ['2024.1', '1!9', '2!1.0']], [[['0.1a1', '0.1b1', '0.1a2']], ['0.1a1', '0.1a2', '0.1b1']],
      [[['1.0+b', '1.0+a', '1.0']], ['1.0', '1.0+a', '1.0+b']], [[['5']], ['5']]
    ] },
    solution: {
      approach: R`<p>Use the PEP 440 key from the version parser with <code>sorted</code>. Stability handles equal versions; epochs, pre/post/dev and local labels are all inside the key.</p>`,
      code: { lang: 'python', run: true, code: VERSION_PY + R`


def sort_versions(versions):
    return sorted(versions, key=version_key)


print(sort_versions(["1.10", "1.9", "1.0rc1", "1.0", "1.0.post1", "1.0.dev1"]))
` },
      dry: { head: ['version', 'key (abridged)'], rows: [['1.0.dev1', '(0, (1,), NEG, NEG, (1,1))'], ['1.0rc1', '(0, (1,), (1,2,1), NEG, POS)'], ['1.0', '(0, (1,), POS, NEG, POS)'], ['1.0.post1', '(0, (1,), POS, (1,1), POS)']] },
      complexity: R`<p>O(n log n) comparisons on precomputed keys, O(n · L) to build the keys.</p>`,
      followUps: ['Return only the newest final release that satisfies a specifier.']
    }
  });

  practice.push({
    title: 'Translate Poetry Caret and Tilde Constraints',
    level: 'Medium', tags: ['strings', 'Poetry', 'semver'], companies: ['Thoughtworks', 'Spotify', 'Revolut'],
    statement: R`<p>Old-style Poetry constraints use shorthands. Write <code>poetry_constraint(c)</code> that converts to a PEP 440 range string <code>"&gt;=L,&lt;U"</code>, with L and U padded to three parts:</p>
<ul><li><code>^X.Y.Z</code> (caret): bump the <b>first non-zero</b> written part; if all written parts are zero, bump the last written part. <code>^1.2.3 → &gt;=1.2.3,&lt;2.0.0</code>, <code>^0.2.3 → &gt;=0.2.3,&lt;0.3.0</code>, <code>^0.0 → &gt;=0.0.0,&lt;0.1.0</code>.</li>
<li><code>~X.Y.Z</code> (tilde): bump the second part, or the first if only one is written. <code>~1.2.3 → &gt;=1.2.3,&lt;1.3.0</code>, <code>~1 → &gt;=1.0.0,&lt;2.0.0</code>.</li>
<li>Wildcard <code>X.Y.*</code>: <code>&gt;=X.Y.0,&lt;X.(Y+1).0</code>; a lone <code>*</code> gives <code>"&gt;=0.0.0"</code>.</li>
<li>A plain version is exact: <code>"==" + c</code>.</li></ul>`,
    constraints: R`Versions have 1–3 numeric parts; input has no spaces.`,
    example: R`<p><code>"^0.0.3"</code> → ${H.c('g', '"&gt;=0.0.3,&lt;0.0.4"')}: the first non-zero part is the patch, so only patch 3 is allowed. That is why <code>^0.x</code> constraints feel so strict.</p>`,
    brute: { why: R`<p>Always bumping the major part (<code>^0.2.3 → &lt;1.0.0</code>) is how npm-style caret is often misremembered; it would let breaking 0.3 releases in, which caret is designed to block.</p>`, code: { lang: 'python', code: R`
def caret_wrong(c):
    major = int(c[1:].split(".")[0])
    return f">={c[1:]},<{major + 1}.0.0"      # ^0.2.3 -> <1.0.0 (too loose)
` } },
    mcq: { q: 'In Poetry, <code>^0.4.1</code> allows which version?', options: ['0.4.9', '0.5.0', '1.0.0', '0.4.0'], answer: 0, explain: 'For 0.x the first non-zero part is the minor, so ^0.4.1 means >=0.4.1,<0.5.0.' },
    hints: [R`<p>Hint 1: strip the operator, split the version into ints, and remember how many parts were <b>written</b>.</p>`, R`<p>Hint 2: write one helper <code>bump(parts, i)</code> → parts[:i] + [parts[i] + 1] + zeros, padded to 3.</p>`, R`<p>Hint 3: caret index = first non-zero among written parts, else last written; tilde index = 0 if one part else 1; wildcard index = number of fixed parts − 1.</p>`],
    tests: { sig: 'string -> string', fn: 'poetry_constraint', cases: [
      [['^1.2.3'], '>=1.2.3,<2.0.0'], [['^0.2.3'], '>=0.2.3,<0.3.0'], [['^0.0.3'], '>=0.0.3,<0.0.4'], [['^0.0'], '>=0.0.0,<0.1.0'],
      [['^0'], '>=0.0.0,<1.0.0'], [['~1.2.3'], '>=1.2.3,<1.3.0'], [['~1'], '>=1.0.0,<2.0.0'], [['1.2.*'], '>=1.2.0,<1.3.0'],
      [['*'], '>=0.0.0'], [['2.0.1'], '==2.0.1'], [['^1.2'], '>=1.2.0,<2.0.0'], [['~1.2'], '>=1.2.0,<1.3.0'], [['3.*'], '>=3.0.0,<4.0.0']
    ] },
    solution: {
      approach: R`<p>Normalize to integer parts, choose which index to bump according to the operator, and format both bounds padded to three parts. Poetry 2 still accepts these in <code>[tool.poetry]</code>, but new projects write PEP 440 ranges in <code>[project]</code> directly.</p>`,
      code: { lang: 'python', run: true, code: R`
def _pad(parts):
    return ".".join(str(p) for p in (parts + [0, 0, 0])[:3])


def _bump(parts, i):
    return _pad(parts[:i] + [parts[i] + 1])


def poetry_constraint(c):
    if c == "*":
        return ">=0.0.0"
    if c.endswith(".*"):
        fixed = [int(p) for p in c[:-2].split(".")]
        return f">={_pad(fixed)},<{_bump(fixed, len(fixed) - 1)}"
    if c[0] in "^~":
        parts = [int(p) for p in c[1:].split(".")]
        if c[0] == "^":
            i = next((k for k, p in enumerate(parts) if p != 0), len(parts) - 1)
        else:
            i = 0 if len(parts) == 1 else 1
        return f">={_pad(parts)},<{_bump(parts, i)}"
    return "==" + c


for c in ["^1.2.3", "^0.2.3", "^0.0", "~1", "1.2.*", "2.0.1"]:
    print(c, "->", poetry_constraint(c))
` },
      dry: { head: ['input', 'parts', 'bump index', 'output'], rows: [['^0.2.3', '[0,2,3]', '1 (first non-zero)', '>=0.2.3,<0.3.0'], ['^0.0', '[0,0]', '1 (last written)', '>=0.0.0,<0.1.0'], ['~1', '[1]', '0', '>=1.0.0,<2.0.0']] },
      complexity: R`<p>O(1) — at most three parts.</p>`,
      followUps: ['Why do many maintainers argue that caret upper bounds in <i>libraries</i> do more harm than good?']
    }
  });

  practice.push({
    title: 'Install Order (Topological Sort with Cycle Detection)',
    level: 'Medium', tags: ['graphs', 'topological sort', 'heap'], companies: ['Amazon', 'Uber', 'Meta'],
    statement: R`<p>Each line of <code>deps</code> is <code>"pkg: dep1, dep2"</code> (or <code>"pkg:"</code>). Packages mentioned only as dependencies have no dependencies of their own. Return an install order where every package comes <b>after</b> its dependencies; when several are ready, take the alphabetically smallest first. If there is any cycle, return <code>["CYCLE"]</code>.</p>`,
    constraints: R`≤ 10<sup>4</sup> packages, ≤ 10<sup>5</sup> edges; duplicate dependencies on one line count once.`,
    example: R`<p><code>["app: web, db", "web: http", "db:", "http:"]</code> → ${H.c('g', '["db", "http", "web", "app"]')}: db and http are ready first (alphabetical), then web, then app.</p>`,
    brute: { why: R`<p>Repeatedly scanning all packages for one whose deps are all installed is O(V²·D). Kahn's algorithm with in-degree counts and a min-heap is O((V + E) log V).</p>`, code: { lang: 'python', code: R`
def order_slow(graph):                     # graph: {pkg: set(deps)}
    done, out = set(), []
    while len(out) < len(graph):
        ready = sorted(p for p in graph if p not in done and graph[p] <= done)
        if not ready:
            return ["CYCLE"]
        done.add(ready[0]); out.append(ready[0])
    return out
` } },
    mcq: { q: 'Why must an installer detect cycles before installing?', options: ['No order satisfies "dependencies first" when packages depend on each other in a loop', 'Cycles make downloads slower', 'pip cannot read cyclic metadata', 'Cycles only matter for sdists'], answer: 0, explain: 'A topological order exists only for a DAG. pip actually tolerates runtime cycles by installing them together, but a strict "deps first" order is impossible.' },
    hints: [R`<p>Hint 1: build <code>deps[pkg] = set(...)</code> and the reverse map <code>users[dep] = [pkgs]</code>; every name mentioned is a node.</p>`, R`<p>Hint 2: Kahn: in-degree = number of unresolved deps. Push all zero in-degree nodes into a min-heap.</p>`, R`<p>Hint 3: pop smallest, append, decrement its users, push those reaching zero. If the output is shorter than the node count, there is a cycle.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'install_order', cases: [
      [[['app: web, db', 'web: http', 'db:', 'http:']], ['db', 'http', 'web', 'app']],
      [[['a: b', 'b: a']], ['CYCLE']], [[[]], []], [[['a: z']], ['z', 'a']], [[['c:', 'b:', 'a:']], ['a', 'b', 'c']],
      [[['a: b', 'b: c', 'c: b', 'd:']], ['CYCLE']], [[['a: a']], ['CYCLE']], [[['x: y, y']], ['y', 'x']]
    ] },
    solution: {
      approach: R`<p>Kahn's algorithm with a min-heap for deterministic alphabetical tie-breaking. Leftover nodes mean a cycle.</p>`,
      code: { lang: 'python', run: true, code: R`
import heapq
from collections import defaultdict


def install_order(deps):
    needs, users = defaultdict(set), defaultdict(list)
    for line in deps:
        pkg, _, rest = line.partition(":")
        pkg = pkg.strip()
        needs[pkg]                                   # make sure the node exists
        for d in {x.strip() for x in rest.split(",") if x.strip()}:
            needs[pkg].add(d)
            needs[d]
    for pkg, ds in list(needs.items()):
        for d in ds:
            users[d].append(pkg)
    indeg = {p: len(ds) for p, ds in needs.items()}
    heap = [p for p, k in indeg.items() if k == 0]
    heapq.heapify(heap)
    out = []
    while heap:
        p = heapq.heappop(heap)
        out.append(p)
        for u in users[p]:
            indeg[u] -= 1
            if indeg[u] == 0:
                heapq.heappush(heap, u)
    return out if len(out) == len(needs) else ["CYCLE"]


print(install_order(["app: web, db", "web: http", "db:", "http:"]))
` },
      dry: { head: ['heap', 'pop', 'newly ready', 'out'], rows: [['[db, http]', 'db', '-', '[db]'], ['[http]', 'http', 'web', '[db, http]'], ['[web]', 'web', 'app', '[db, http, web]'], ['[app]', 'app', '-', '[db, http, web, app]']] },
      complexity: R`<p>O((V + E) log V) time, O(V + E) space.</p>`,
      followUps: ['Return the packages in each cycle (strongly connected components).', 'How would you install independent packages in parallel batches?']
    }
  });

  practice.push({
    title: 'Which Ruff Rules Are Enabled?',
    level: 'Medium', tags: ['prefix matching', 'configuration', 'Ruff'], companies: ['Astral', 'Shopify', 'Instacart'],
    statement: R`<p>Write <code>ruff_rules(all_rules, select, ignore, extend_select)</code> returning the sorted enabled rule codes. Rules:</p>
<ul><li>A selector matches a rule if the code starts with it; <code>"ALL"</code> matches every rule with specificity 0, any other selector has specificity = its length.</li>
<li>If <code>select</code> is empty it defaults to <code>["E4", "E7", "E9", "F"]</code>; <code>extend_select</code> is added on top.</li>
<li>A rule is enabled when its most specific matching select selector is <b>strictly</b> more specific than its most specific matching ignore selector (no match counts as −1). Ties go to ignore.</li></ul>`,
    constraints: R`≤ 2000 rules, ≤ 100 selectors per list.`,
    example: R`<p>Rules <code>["E401", "E501", "F401"]</code>, select <code>["E501"]</code>, ignore <code>["E"]</code> → ${H.c('g', '["E501"]')}: E501 (length 4) beats E (length 1).</p>`,
    brute: { why: R`<p>Applying "select everything, then remove everything ignored" gets the specificity rule wrong: <code>select = ["E501"]</code> with <code>ignore = ["E"]</code> would disable E501, but Ruff keeps it on.</p>`, code: { lang: 'python', code: R`
def rules_naive(all_rules, select, ignore):
    on = {r for r in all_rules if any(r.startswith(s) for s in select)}
    return sorted(r for r in on if not any(r.startswith(i) for i in ignore))
` } },
    mcq: { q: 'With no <code>select</code> configured, which rule families does Ruff enable by default?', options: ['<code>E4</code>, <code>E7</code>, <code>E9</code> and <code>F</code>', 'All rules', 'Only <code>F</code>', '<code>E</code>, <code>W</code>, <code>F</code>, <code>I</code>'], answer: 0, explain: 'Ruff defaults to a conservative subset of pycodestyle errors that do not overlap with the formatter, plus Pyflakes.' },
    hints: [R`<p>Hint 1: write <code>best(rule, selectors)</code> = the largest specificity of any matching selector, or −1.</p>`, R`<p>Hint 2: <code>"ALL"</code> has specificity 0 and matches anything; others match by <code>startswith</code>.</p>`, R`<p>Hint 3: enabled iff <code>best(rule, select + extend_select) &gt; best(rule, ignore)</code>; apply the default when select is empty, then sort.</p>`],
    tests: { sig: 'string[] string[] string[] string[] -> string[]', fn: 'ruff_rules', cases: [
      [[['E401', 'E501', 'E711', 'E902', 'F401', 'F841', 'I001', 'B023', 'UP006', 'W291'], [], [], []], ['E401', 'E711', 'E902', 'F401', 'F841']],
      [[['E401', 'E501', 'E711', 'E902', 'F401', 'F841', 'I001', 'B023', 'UP006', 'W291'], ['E', 'F', 'I'], ['E501'], []], ['E401', 'E711', 'E902', 'F401', 'F841', 'I001']],
      [[['E401', 'E501', 'F401'], ['E501'], ['E'], []], ['E501']],
      [[['E401', 'E501', 'E711', 'E902', 'F401', 'F841', 'I001', 'B023', 'UP006', 'W291'], ['ALL'], ['E', 'W291'], []], ['B023', 'F401', 'F841', 'I001', 'UP006']],
      [[['E401', 'E501', 'E711', 'E902', 'F401', 'F841', 'I001', 'B023', 'UP006', 'W291'], [], [], ['B', 'UP']], ['B023', 'E401', 'E711', 'E902', 'F401', 'F841', 'UP006']],
      [[['F401', 'F841'], ['F'], ['F'], []], []],
      [[['F401', 'F841'], ['F401'], ['F4'], ['F']], ['F401', 'F841']],
      [[[], ['ALL'], [], []], []]
    ] },
    solution: {
      approach: R`<p>Compute, per rule, the best matching specificity in the select side and the ignore side, and keep the rule when select is strictly more specific. This is the precedence Ruff documents for <code>select</code>/<code>ignore</code> at the same configuration level.</p>`,
      code: { lang: 'python', run: true, code: R`
DEFAULT_SELECT = ["E4", "E7", "E9", "F"]


def _best(rule, selectors):
    best = -1
    for s in selectors:
        if s == "ALL":
            best = max(best, 0)
        elif rule.startswith(s):
            best = max(best, len(s))
    return best


def ruff_rules(all_rules, select, ignore, extend_select):
    chosen = (select or DEFAULT_SELECT) + extend_select
    return sorted(r for r in all_rules if _best(r, chosen) > _best(r, ignore))


print(ruff_rules(["E401", "E501", "F401"], ["E501"], ["E"], []))
` },
      dry: { head: ['rule', 'best select', 'best ignore', 'enabled'], rows: [['E401', '-1', '1 (E)', 'no'], ['E501', '4 (E501)', '1 (E)', 'yes'], ['F401', '-1', '-1', 'no']] },
      complexity: R`<p>O(R · S) for R rules and S selectors.</p>`,
      followUps: ['Add <code>per-file-ignores</code>: a glob → ignore list applied on top for matching files.']
    }
  });

  practice.push({
    title: 'Docker Layer Cache: First Rebuilt Step',
    level: 'Medium', tags: ['simulation', 'Docker', 'caching'], companies: ['Docker', 'Google', 'Netflix'],
    statement: R`<p>Given Dockerfile <code>steps</code> and the list of <code>changed</code> files, return the index of the first step whose cache is invalidated, or <code>-1</code>. Only <code>COPY</code>/<code>ADD</code> steps look at files: tokens after the instruction, ignoring flags that start with <code>--</code>, are sources followed by one destination. A source matches a changed file if it is <code>"."</code>, equals the file, or is a directory prefix of it (<code>src</code> or <code>src/</code> matches <code>src/a.py</code>). Other steps never invalidate by themselves.</p>`,
    constraints: R`≤ 200 steps, ≤ 10<sup>4</sup> changed files; paths are relative and use <code>/</code>.`,
    example: R`<p>Steps <code>FROM … / WORKDIR /app / COPY pyproject.toml uv.lock ./ / RUN uv sync … / COPY src ./src / RUN uv sync</code> with <code>["src/acme/cli.py"]</code> → ${H.c('g', '4')}: the dependency layer (step 3) is reused.</p>`,
    brute: { why: R`<p>Treating "any file changed" as "rebuild from the first COPY" over-estimates rebuilds and hides the real lesson: order COPY steps from least to most frequently changed.</p>`, code: { lang: 'python', code: R`
def first_rebuild_naive(steps, changed):
    if not changed:
        return -1
    return next(i for i, s in enumerate(steps) if s.startswith("COPY"))   # ignores which files
` } },
    mcq: { q: 'Why copy <code>pyproject.toml</code> and the lock file before <code>COPY . .</code>?', options: ['So the slow dependency-install layer stays cached when only source code changes', 'Because Docker requires TOML files first', 'To make the image smaller', 'So pip can read the README'], answer: 0, explain: 'Layer caching is invalidated by the first changed input. Copying only the lock first means code edits never invalidate the dependency layer.' },
    hints: [R`<p>Hint 1: walk the steps in order; the first COPY/ADD that matches any changed file is the answer.</p>`, R`<p>Hint 2: sources are <code>tokens[1:-1]</code> after removing <code>--flag</code> tokens.</p>`, R`<p>Hint 3: matching: <code>src == "." or f == src or f.startswith(src.rstrip("/") + "/")</code>. Be careful that <code>src</code> must not match <code>srcfoo/x.py</code>.</p>`],
    tests: { sig: 'string[] string[] -> int', fn: 'docker_rebuild_from', cases: [
      [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY pyproject.toml uv.lock ./', 'RUN uv sync --locked --no-install-project', 'COPY src ./src', 'RUN uv sync --locked'], ['src/acme/cli.py']], 4],
      [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY pyproject.toml uv.lock ./', 'RUN uv sync --locked --no-install-project', 'COPY src ./src', 'RUN uv sync --locked'], ['uv.lock']], 2],
      [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY pyproject.toml uv.lock ./', 'RUN uv sync --locked --no-install-project', 'COPY src ./src', 'RUN uv sync --locked'], ['README.md']], -1],
      [[['FROM python:3.12-slim', 'COPY src ./src'], []], -1],
      [[['FROM python:3.12', 'COPY . .', 'RUN pip install -r requirements.txt'], ['src/app.py']], 1],
      [[['FROM x', 'COPY --chown=app:app requirements.txt /app/', 'RUN pip install -r /app/requirements.txt', 'ADD src/ /app/src/'], ['src/main.py']], 3],
      [[['FROM python:3.12-slim', 'WORKDIR /app', 'COPY pyproject.toml uv.lock ./', 'RUN uv sync --locked --no-install-project', 'COPY src ./src', 'RUN uv sync --locked'], ['src/acme/cli.py', 'pyproject.toml']], 2],
      [[['FROM python:3.12-slim', 'COPY src ./src'], ['srcfoo/x.py']], -1]
    ] },
    solution: {
      approach: R`<p>Scan steps in order, parse COPY/ADD sources, and return the first step that any changed file falls under. Everything after it rebuilds, which is why the answer is just one index.</p>`,
      code: { lang: 'python', run: true, code: R`
def _covers(src, f):
    return src == "." or f == src or f.startswith(src.rstrip("/") + "/")


def docker_rebuild_from(steps, changed):
    for i, step in enumerate(steps):
        tokens = step.split()
        if not tokens or tokens[0].upper() not in ("COPY", "ADD"):
            continue
        args = [t for t in tokens[1:] if not t.startswith("--")]
        sources = args[:-1]                         # last token is the destination
        if any(_covers(s, f) for s in sources for f in changed):
            return i
    return -1


steps = ["FROM python:3.12-slim", "COPY pyproject.toml uv.lock ./", "RUN uv sync", "COPY src ./src"]
print(docker_rebuild_from(steps, ["src/acme/cli.py"]), docker_rebuild_from(steps, ["uv.lock"]))
` },
      dry: { head: ['step', 'sources', 'matches src/acme/cli.py?'], rows: [['2 COPY', 'pyproject.toml, uv.lock', 'no'], ['3 RUN', '-', '-'], ['4 COPY', 'src', 'yes → 4']] },
      complexity: R`<p>O(S · C) worst case; precompute a set of changed directory prefixes to make each source check O(depth).</p>`,
      followUps: ['Model <code>.dockerignore</code>: files it excludes can never invalidate a COPY.', 'How do BuildKit cache mounts change what is worth caching in layers?']
    }
  });

  practice.push({
    title: 'Parse a PEP 508 Requirement Line',
    level: 'Medium', tags: ['regex', 'parsing', 'PEP 508'], companies: ['GitLab', 'Mend', 'Snyk'],
    statement: R`<p>Write <code>parse_requirement(line)</code> returning <code>[name, extras, specifier, marker]</code>: the name as written; extras sorted and joined by <code>,</code> (spaces removed); the specifier with all whitespace removed; and the marker after <code>;</code> with surrounding spaces stripped. Missing parts are <code>""</code>.</p>`,
    constraints: R`No URLs (<code>@ https://…</code>) or parenthesized specifiers; names start with a letter or digit and contain <code>A-Z a-z 0-9 . _ -</code>.`,
    example: R`<p><code>"requests[socks,security] &gt;=2.31, &lt;3 ; python_version &gt;= '3.9'"</code> → ${H.c('g', `["requests", "security,socks", "&gt;=2.31,&lt;3", "python_version &gt;= '3.9'"]`)}.</p>`,
    brute: { why: R`<p>Splitting on spaces breaks because spaces are optional anywhere; splitting on <code>,</code> first breaks extras. Recognize the four regions in order with one regex.</p>`, code: { lang: 'python', code: R`
def parse_naive(line):
    name, spec = line.split(" ", 1)        # "Django>=4.2" has no space
    return [name, "", spec, ""]
` } },
    mcq: { q: 'What does <code>; python_version &lt; "3.11"</code> in a requirement do?', options: ['The requirement is installed only on interpreters older than 3.11', 'It pins the package to Python 3.11', 'It is a comment', 'It installs the package for every Python version except 3.11'], answer: 0, explain: 'Environment markers (PEP 508) are evaluated against the target environment; when false, the requirement is skipped entirely.' },
    hints: [R`<p>Hint 1: the line has up to four regions in a fixed order: name, <code>[extras]</code>, specifier, <code>; marker</code>.</p>`, R`<p>Hint 2: a regex like <code>^\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[([^\]]*)\])?\s*([^;]*?)\s*(?:;\s*(.*?))?\s*$</code> captures them.</p>`, R`<p>Hint 3: post-process: extras split on <code>,</code>, strip, drop empties, sort, join; specifier <code>"".join(spec.split())</code>; marker as captured or <code>""</code>.</p>`],
    tests: { sig: 'string -> string[]', fn: 'parse_requirement', cases: [
      [["requests[socks,security] >=2.31, <3 ; python_version >= '3.9'"], ['requests', 'security,socks', '>=2.31,<3', "python_version >= '3.9'"]],
      [['httpx'], ['httpx', '', '', '']], [['Django>=4.2'], ['Django', '', '>=4.2', '']],
      [["tomli>=2.0; python_version < '3.11'"], ['tomli', '', '>=2.0', "python_version < '3.11'"]],
      [['pkg [ b , a ]'], ['pkg', 'a,b', '', '']], [['numpy ==2.1.*'], ['numpy', '', '==2.1.*', '']],
      [["pywin32 ; sys_platform == 'win32'"], ['pywin32', '', '', "sys_platform == 'win32'"]],
      [['zope.interface~=6.0'], ['zope.interface', '', '~=6.0', '']]
    ] },
    solution: {
      approach: R`<p>One anchored regex identifies the four regions; light post-processing normalizes extras and specifier. Production code should use <code>packaging.requirements.Requirement</code>, which implements the full PEP 508 grammar including URLs and marker parsing.</p>`,
      code: { lang: 'python', run: true, code: R`
import re

_REQ = re.compile(r"^\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[([^\]]*)\])?\s*([^;]*?)\s*(?:;\s*(.*?))?\s*$")


def parse_requirement(line):
    m = _REQ.match(line)
    if not m:
        raise ValueError(f"invalid requirement: {line!r}")
    name, extras, spec, marker = m.groups()
    extras = ",".join(sorted(e.strip() for e in (extras or "").split(",") if e.strip()))
    return [name, extras, "".join(spec.split()), marker or ""]


print(parse_requirement("requests[socks,security] >=2.31, <3 ; python_version >= '3.9'"))
` },
      dry: { head: ['region', 'captured', 'normalized'], rows: [['name', 'requests', 'requests'], ['extras', 'socks,security', 'security,socks'], ['spec', '>=2.31, <3', '>=2.31,<3'], ['marker', "python_version >= '3.9'", 'same']] },
      complexity: R`<p>O(n) for the regex match and post-processing.</p>`,
      followUps: ['Evaluate the marker for a given environment dict (python_version, sys_platform).']
    }
  });

  practice.push({
    title: 'Dependency Resolver with Backtracking and Conflicts',
    level: 'Hard', tags: ['backtracking', 'resolution', 'PEP 440'], companies: ['Astral', 'Google', 'Bloomberg'],
    statement: R`<p>Build a mini pip resolver. <code>index</code> lines are <code>"name==ver: dep1; dep2"</code> where each dep is <code>name</code> optionally followed by a specifier (e.g. <code>http&gt;=1,&lt;2</code>). <code>roots</code> are requirements in the same form. Process requirements in FIFO order; for an unpinned name try its versions <b>newest first</b> (PEP 440 order, honouring every constraint seen so far for that name and pip's pre-release rule); when a constraint conflicts with an existing pin, backtrack. Return the sorted list <code>"name==ver"</code> with names normalized (PEP 503), or <code>["CONFLICT"]</code>.</p>`,
    constraints: R`≤ 30 packages × 10 versions. Specifiers use the operators from the matcher problem.`,
    example: R`<p><code>app</code> needs <code>web&gt;=2</code> and <code>db</code>; <code>web 2.1</code> needs <code>http&gt;=1,&lt;2</code>; <code>db 3.0</code> needs <code>http&gt;=2</code> but <code>db 2.9</code> needs <code>http&lt;2</code>. Result ${H.c('g', '["app==1.0", "db==2.9", "http==1.5", "web==2.1"]')}: db 3.0 fails, so the resolver backtracks to db 2.9.</p>`,
    brute: { why: R`<p>Trying every combination of versions (the Cartesian product) is O(k<sup>n</sup>) and explodes immediately. Greedy "newest of everything" without backtracking returns a broken set or gives up too early.</p>`, code: { lang: 'python', code: R`
def resolve_greedy(avail, roots):
    # avail: {name: [versions newest first]} -- picks newest, never reconsiders
    return sorted(f"{n}=={avail[n][0]}" for n in roots)
` } },
    mcq: { q: 'pip reports <code>ResolutionImpossible</code>. What does that guarantee?', options: ['No combination of available versions satisfies all constraints (given the candidates it could see)', 'The network failed', 'One package has no wheel', 'The lock file is out of date'], answer: 0, explain: 'The backtracking resolver has exhausted the search space. The fix is to change constraints (upgrade, loosen, or remove a requirement), not to force-install.' },
    hints: [R`<p>Hint 1: state = (pending requirements, pins, constraints per name). Recursion returns the pins or <code>None</code>.</p>`, R`<p>Hint 2: if the name is pinned, just check the new specifier against the pin; otherwise try each version (newest first) that satisfies <i>all</i> constraints for that name, append its deps to the queue, recurse.</p>`, R`<p>Hint 3: join all constraints for a name with commas and use the specifier matcher (it also handles "no pre-releases unless asked"). A missing package simply has no candidates.</p>`],
    tests: { sig: 'string[] string[] -> string[]', fn: 'resolve', cases: [
      [[['app==1.0: web>=2; db', 'web==2.1: http>=1,<2', 'web==2.0: http>=1', 'http==1.5:', 'http==2.0:', 'db==3.0: http>=2', 'db==2.9: http<2'], ['app']], ['app==1.0', 'db==2.9', 'http==1.5', 'web==2.1']],
      [[['a==1.0: c>=2', 'b==1.0: c<2', 'c==1.0:', 'c==2.0:'], ['a', 'b']], ['CONFLICT']],
      [[['x==1.0:'], []], []],
      [[['x==1.0:', 'x==1.1:', 'x==2.0:'], ['x<2']], ['x==1.1']],
      [[['a==1.0: ghost>=1'], ['a']], ['CONFLICT']],
      [[['Foo_Bar==1.0:'], ['foo-bar']], ['foo-bar==1.0']],
      [[['p==2.0rc1:', 'p==1.9:'], ['p']], ['p==1.9']],
      [[['p==1.0:', 'p==1.5:', 'p==2.0:'], ['p>=1', 'p<1.5']], ['p==1.0']],
      [[['a==2.0: b==1.0', 'a==1.0: b==2.0', 'b==1.0: c>=5', 'b==2.0:', 'c==4.0:'], ['a']], ['a==1.0', 'b==2.0']]
    ] },
    solution: {
      approach: R`<p>Depth-first backtracking over a FIFO queue of requirements. Pins and constraints are copied into each recursive call (immutable dict merges), so backtracking is automatic. Real resolvers add heuristics (most-constrained first), cache metadata, and — in uv's PubGrub — learn incompatibilities to avoid repeating failures and to explain conflicts.</p>`,
      code: { lang: 'python', run: true, code: SPEC_PY + R`


def _norm(name):
    return re.sub(r"[-_.]+", "-", name).lower()


def _split_req(req):
    m = re.match(r"\s*([A-Za-z0-9._-]+)\s*(.*)$", req)
    return _norm(m[1]), m[2].strip()


def resolve(index, roots):
    avail = {}
    for line in index:
        head, _, tail = line.partition(":")
        name, ver = head.strip().split("==")
        deps = [d.strip() for d in tail.split(";") if d.strip()]
        avail.setdefault(_norm(name), []).append((ver.strip(), deps))
    for versions in avail.values():
        versions.sort(key=lambda p: version_key(p[0]), reverse=True)   # newest first

    def solve(pending, pins, cons):
        if not pending:
            return pins
        (name, spec), rest = pending[0], pending[1:]
        specs = cons.get(name, []) + ([spec] if spec else [])
        if name in pins:                                   # already chosen: just verify
            if spec and not matches(pins[name], spec):
                return None
            return solve(rest, pins, {**cons, name: specs})
        for ver, deps in avail.get(name, []):
            if matches(ver, ",".join(specs)):
                found = solve(rest + [_split_req(d) for d in deps],
                              {**pins, name: ver}, {**cons, name: specs})
                if found is not None:
                    return found
        return None                                        # triggers backtracking

    result = solve([_split_req(r) for r in roots], {}, {})
    if result is None:
        return ["CONFLICT"]
    return sorted(f"{n}=={v}" for n, v in result.items())


idx = ["app==1.0: web>=2; db", "web==2.1: http>=1,<2", "web==2.0: http>=1",
       "http==1.5:", "http==2.0:", "db==3.0: http>=2", "db==2.9: http<2"]
print(resolve(idx, ["app"]))
` },
      dry: { head: ['step', 'decision', 'queue after'], rows: [['app', 'pin 1.0', 'web>=2, db'], ['web>=2', 'pin 2.1', 'db, http>=1,<2'], ['db', 'pin 3.0', 'http>=1,<2, http>=2'], ['http>=1,<2', 'pin 1.5', 'http>=2'], ['http>=2', '1.5 fails → backtrack', '-'], ['db (retry)', 'pin 2.9', 'http>=1,<2, http<2'], ['http', 'pin 1.5, then <2 ok', 'done']] },
      complexity: R`<p>Exponential in the worst case (resolution is NP-complete); each node does O(c·L) specifier work. Small real-world graphs resolve quickly because constraints prune early.</p>`,
      followUps: ['Explain a conflict: return the chain of requirements that made the last package impossible.', 'Add "prefer already-installed versions" like <code>pip install</code> without <code>--upgrade</code>.']
    }
  });

  practice.push({
    title: 'Pick the Best Wheel for This Interpreter',
    level: 'Hard', tags: ['ranking', 'sets', 'wheels'], companies: ['Anaconda', 'Microsoft', 'Databricks'],
    statement: R`<p>Write <code>select_wheel(files, supported)</code>. <code>files</code> are one release's distribution files (wheels and possibly an sdist ending in <code>.tar.gz</code>). <code>supported</code> is the interpreter's complete tag list, <b>most preferred first</b>. Each wheel's priority is the smallest index of any of its expanded tags in <code>supported</code>. Return the wheel with the best (smallest) priority, the earliest file on ties; if no wheel fits, return the first sdist; otherwise <code>""</code>.</p>`,
    constraints: R`≤ 500 files, ≤ 2000 supported tags; compressed tag sets allowed in every field; malformed wheel names are ignored.`,
    example: R`<p>With <code>supported[0] = "cp312-cp312-manylinux_2_17_x86_64"</code>, files <code>["pkg-1.0-py3-none-any.whl", "pkg-1.0-cp312-cp312-manylinux_2_17_x86_64.whl", "pkg-1.0.tar.gz"]</code> → ${H.c('g', 'the cp312 wheel')}: priority 0 beats the pure wheel's priority 4.</p>`,
    brute: { why: R`<p>Returning the first compatible wheel picks <code>py3-none-any</code> even when an optimized binary wheel exists. For each wheel, scanning the supported list per tag is O(T·S); a dict tag → index makes it O(T).</p>`, code: { lang: 'python', code: R`
def select_first(files, supported):
    for f in files:
        if f.endswith(".whl") and "-".join(f[:-4].split("-")[-3:]) in supported:
            return f                     # first fit, not best fit; ignores compressed tags
    return ""
` } },
    mcq: { q: 'Why do installers rank tags instead of just checking compatibility?', options: ['Several wheels can be compatible, and the most specific one (e.g. cp312-cp312) is usually fastest and most correct', 'Ranking is required by PyPI', 'To prefer smaller downloads', 'Because sdists are always preferred'], answer: 0, explain: 'packaging.tags.sys_tags() yields tags from most to least specific; pip and uv choose the compatible wheel whose best tag appears earliest.' },
    hints: [R`<p>Hint 1: precompute <code>rank = {tag: i for i, tag in enumerate(supported)}</code>.</p>`, R`<p>Hint 2: for each well-formed wheel, expand its compressed tags with <code>itertools.product</code> and take the minimum rank among supported ones.</p>`, R`<p>Hint 3: keep the best (priority, file index); if none, return the first <code>.tar.gz</code>; else <code>""</code>.</p>`],
    tests: { sig: 'string[] string[] -> string', fn: 'select_wheel', cases: [
      [[['pkg-1.0-py3-none-any.whl', 'pkg-1.0-cp312-cp312-manylinux_2_17_x86_64.whl', 'pkg-1.0.tar.gz'], ['cp312-cp312-manylinux_2_17_x86_64', 'cp312-abi3-manylinux_2_17_x86_64', 'cp311-abi3-manylinux_2_17_x86_64', 'py3-none-manylinux_2_17_x86_64', 'py3-none-any']], 'pkg-1.0-cp312-cp312-manylinux_2_17_x86_64.whl'],
      [[['pkg-1.0-cp39-abi3-manylinux_2_17_x86_64.whl', 'pkg-1.0-py3-none-any.whl'], ['cp312-cp312-manylinux_2_17_x86_64', 'cp312-abi3-manylinux_2_17_x86_64', 'cp311-abi3-manylinux_2_17_x86_64', 'py3-none-manylinux_2_17_x86_64', 'py3-none-any']], 'pkg-1.0-py3-none-any.whl'],
      [[['pkg-1.0-cp313-cp313-win_amd64.whl', 'pkg-1.0.tar.gz'], ['cp312-cp312-manylinux_2_17_x86_64', 'py3-none-any']], 'pkg-1.0.tar.gz'],
      [[['pkg-1.0-cp313-cp313-win_amd64.whl'], ['cp312-cp312-manylinux_2_17_x86_64', 'py3-none-any']], ''],
      [[[], ['py3-none-any']], ''],
      [[['a-1.0-py2.py3-none-any.whl', 'b-1.0-py3-none-any.whl'], ['py3-none-any']], 'a-1.0-py2.py3-none-any.whl'],
      [[['pkg-1.0-cp311.cp312-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl', 'pkg-1.0-py3-none-any.whl'], ['cp312-cp312-manylinux_2_17_x86_64', 'cp312-abi3-manylinux_2_17_x86_64', 'cp311-abi3-manylinux_2_17_x86_64', 'py3-none-manylinux_2_17_x86_64', 'py3-none-any']], 'pkg-1.0-cp311.cp312-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl'],
      [[['pkg-1.0.zip', 'bad.whl'], ['py3-none-any']], '']
    ] },
    solution: {
      approach: R`<p>Rank lookup via a dict, cross-product expansion of compressed tags, then a single pass keeping the minimum (priority, position). Fall back to the sdist exactly as pip does when no wheel fits (unless <code>--only-binary</code> forbids it).</p>`,
      code: { lang: 'python', run: true, code: R`
from itertools import product


def select_wheel(files, supported):
    rank = {tag: i for i, tag in enumerate(supported)}
    best = None                                   # (priority, position, file)
    for pos, f in enumerate(files):
        if not f.endswith(".whl"):
            continue
        parts = f[:-4].split("-")
        if len(parts) not in (5, 6):
            continue
        py, abi, plat = parts[-3:]
        prios = [rank[t] for t in ("-".join(c) for c in product(py.split("."), abi.split("."), plat.split(".")))
                 if t in rank]
        if prios and (best is None or (min(prios), pos) < best[:2]):
            best = (min(prios), pos, f)
    if best:
        return best[2]
    return next((f for f in files if f.endswith(".tar.gz")), "")


sup = ["cp312-cp312-manylinux_2_17_x86_64", "py3-none-any"]
print(select_wheel(["pkg-1.0-py3-none-any.whl", "pkg-1.0-cp312-cp312-manylinux_2_17_x86_64.whl"], sup))
` },
      dry: { head: ['file', 'expanded tags in rank', 'priority'], rows: [['py3-none-any wheel', 'py3-none-any → 4', '4'], ['cp312-cp312 wheel', 'cp312-cp312-manylinux_2_17_x86_64 → 0', '0 ← best'], ['pkg-1.0.tar.gz', 'sdist (fallback only)', '-']] },
      complexity: R`<p>O(S + Σ T<sub>f</sub>) where T<sub>f</sub> is the number of expanded tags per wheel.</p>`,
      followUps: ['Break ties by the wheel build tag, as pip does.', 'How does <code>--only-binary :all:</code> change the fallback?']
    }
  });

  practice.push({
    title: 'Expand Extras into the Full Install Set',
    level: 'Hard', tags: ['graphs', 'BFS', 'extras'], companies: ['Databricks', 'Hugging Face', 'Stripe'],
    statement: R`<p><code>meta</code> lines are either <code>"pkg: dep, dep[extra]"</code> (base dependencies) or <code>"pkg[extra]: deps"</code> (what an extra adds). Write <code>expand(meta, root)</code> for a root like <code>"web[db,cache]"</code> and return the sorted names of every package that gets installed, including the root. An extra pulls in the package's base dependencies too. Unknown extras are ignored (pip only warns) and unknown packages have no dependencies. Cycles must terminate.</p>`,
    constraints: R`≤ 10<sup>4</sup> meta lines; names are lowercase; no version specifiers.`,
    example: R`<p>With <code>web[db]: orm[postgres]</code> and <code>orm[postgres]: psycopg</code>, <code>expand(meta, "web[db]")</code> includes ${H.c('g', 'orm, psycopg, sqlcore')} plus web's base dependencies — extras chain transitively.</p>`,
    brute: { why: R`<p>Ignoring the extras on <i>dependencies</i> (treating <code>orm[postgres]</code> as plain <code>orm</code>) silently drops <code>psycopg</code>, the classic "works locally because it happened to be installed" bug. Tracking visited by name only (not by name+extra) also drops extras requested later.</p>`, code: { lang: 'python', code: R`
def expand_wrong(base, root):              # base: {pkg: [deps]} - forgets extras
    seen, stack = set(), [root.split("[")[0]]
    while stack:
        p = stack.pop()
        if p not in seen:
            seen.add(p)
            stack.extend(d.split("[")[0] for d in base.get(p, []))
    return sorted(seen)
` } },
    mcq: { q: 'What does <code>pip install "web[db]"</code> install?', options: ['web, its base dependencies, and the dependencies listed for the <code>db</code> extra', 'Only the db extra\'s dependencies', 'A separate package named web-db', 'web without any dependencies'], answer: 0, explain: 'Extras are optional groups of additional requirements declared in [project.optional-dependencies]; the base requirements always come along.' },
    hints: [R`<p>Hint 1: parse into two maps: <code>base[pkg]</code> and <code>extra[(pkg, name)]</code>; parse items like <code>"orm[postgres]"</code> into <code>("orm", {"postgres"})</code>.</p>`, R`<p>Hint 2: do a BFS over <b>(package, extra-or-None)</b> nodes, so <code>orm</code> and <code>orm[postgres]</code> are visited separately.</p>`, R`<p>Hint 3: visiting <code>(p, None)</code> enqueues base deps; visiting <code>(p, e)</code> also enqueues <code>(p, None)</code> and the extra's deps. Collect package names, sort.</p>`],
    tests: { sig: 'string[] string -> string[]', fn: 'expand', cases: [
      [[['web: http, jsonlib', 'web[db]: orm[postgres]', 'web[cache]: redis', 'orm: sqlcore', 'orm[postgres]: psycopg', 'http:', 'jsonlib:', 'sqlcore:', 'psycopg:', 'redis: hiredis', 'hiredis:'], 'web'], ['http', 'jsonlib', 'web']],
      [[['web: http, jsonlib', 'web[db]: orm[postgres]', 'web[cache]: redis', 'orm: sqlcore', 'orm[postgres]: psycopg', 'http:', 'jsonlib:', 'sqlcore:', 'psycopg:', 'redis: hiredis', 'hiredis:'], 'web[db]'], ['http', 'jsonlib', 'orm', 'psycopg', 'sqlcore', 'web']],
      [[['web: http, jsonlib', 'web[db]: orm[postgres]', 'web[cache]: redis', 'orm: sqlcore', 'orm[postgres]: psycopg', 'http:', 'jsonlib:', 'sqlcore:', 'psycopg:', 'redis: hiredis', 'hiredis:'], 'web[db,cache]'], ['hiredis', 'http', 'jsonlib', 'orm', 'psycopg', 'redis', 'sqlcore', 'web']],
      [[['web: http, jsonlib', 'web[db]: orm[postgres]', 'http:', 'jsonlib:'], 'web[unknown]'], ['http', 'jsonlib', 'web']],
      [[['orm: sqlcore', 'orm[postgres]: psycopg', 'sqlcore:', 'psycopg:'], 'orm[postgres]'], ['orm', 'psycopg', 'sqlcore']],
      [[[], 'ghost'], ['ghost']],
      [[['a: b[x]', 'b: a', 'b[x]: c', 'c:'], 'a'], ['a', 'b', 'c']],
      [[['a: b', 'b[x]: c', 'c: a[y]', 'a[y]: d'], 'a'], ['a', 'b']]
    ] },
    solution: {
      approach: R`<p>Graph search over (package, extra) states with a visited set. The base state of a package is implied by any of its extras. This is the same expansion pip and uv perform before resolving versions.</p>`,
      code: { lang: 'python', run: true, code: R`
import re
from collections import deque


def _item(text):
    m = re.match(r"\s*([a-z0-9._-]+)\s*(?:\[([^\]]*)\])?\s*$", text)
    return m[1], {e.strip() for e in (m[2] or "").split(",") if e.strip()}


def expand(meta, root):
    base, extra = {}, {}
    for line in meta:
        head, _, tail = line.partition(":")
        deps = [d for d in (x.strip() for x in tail.split(",")) if d]
        name, extras = _item(head)
        if extras:
            for e in extras:
                extra[(name, e)] = deps
        else:
            base[name] = deps
    queue, seen = deque(), set()
    name, extras = _item(root)
    queue.append((name, None))
    queue.extend((name, e) for e in extras)
    while queue:
        node = queue.popleft()
        if node in seen:
            continue
        seen.add(node)
        pkg, e = node
        deps = base.get(pkg, []) if e is None else extra.get((pkg, e), [])
        if e is not None:
            queue.append((pkg, None))               # an extra implies the base package
        for d in deps:
            dn, des = _item(d)
            queue.append((dn, None))
            queue.extend((dn, x) for x in des)
    return sorted({pkg for pkg, _ in seen})


meta = ["web: http", "web[db]: orm[postgres]", "orm: sqlcore", "orm[postgres]: psycopg"]
print(expand(meta, "web[db]"))
` },
      dry: { head: ['visit', 'enqueues'], rows: [['(web, None)', 'http, jsonlib'], ['(web, db)', '(web, None), orm, (orm, postgres)'], ['(orm, None)', 'sqlcore'], ['(orm, postgres)', '(orm, None), psycopg']] },
      complexity: R`<p>O(N + E) over (package, extra) states and dependency edges.</p>`,
      followUps: ['Add environment markers like <code>extra == "db"</code>, which is how extras are actually encoded in wheel METADATA.', 'How do PEP 735 dependency groups differ from extras?']
    }
  });

  /* ======================================================================
     QUIZ (correct option authored first, rotated below)
     ====================================================================== */
  quiz.push(
    { q: R`What does <code>source .venv/bin/activate</code> actually change?`, options: ['It prepends <code>.venv/bin</code> to PATH, sets VIRTUAL_ENV and changes the prompt', 'It installs a new Python interpreter', 'It copies site-packages into the system Python', 'It is required before <code>.venv/bin/python</code> can run'], answer: 0, explain: 'Activation is a convenience. Running .venv/bin/python directly gives the same environment, which is what CI and Docker usually do.' },
    { q: R`How can code detect that it is running inside a virtual environment?`, options: ['<code>sys.prefix != sys.base_prefix</code>', '<code>sys.version</code> contains "venv"', '<code>os.getcwd()</code> ends with .venv', '<code>import venv</code> succeeds'], answer: 0, explain: 'The venv interpreter sets sys.prefix to the venv directory while sys.base_prefix keeps pointing at the base installation.' },
    { q: R`Which version is the <b>smallest</b> under PEP 440?`, options: ['<code>2.0.dev1</code>', '<code>2.0a1</code>', '<code>2.0rc1</code>', '<code>2.0</code>'], answer: 0, explain: 'A dev release without a pre-release segment sorts before the alphas of the same release.' },
    { q: R`<code>pip install "lib&gt;=1.0"</code> — the index has 1.4 and 2.0b1. What is installed by default?`, options: ['1.4', '2.0b1', 'Nothing, the request is ambiguous', 'Both, side by side'], answer: 0, explain: 'Pre-releases are opt-in. pip only falls back to a pre-release when no final release satisfies the specifier, or with --pre.' },
    { q: R`A wheel tagged <code>py3-none-any</code> means…`, options: ['Pure Python: works on any Python 3 interpreter on any platform', 'It contains compiled code for every platform', 'It needs a compiler at install time', 'It works only on CPython 3.0'], answer: 0, explain: 'none = no ABI requirement and any = no platform requirement, so the same file serves every OS and CPU.' },
    { q: R`Which table in <code>pyproject.toml</code> tells pip how to <b>build</b> the project?`, options: ['<code>[build-system]</code>', '<code>[project]</code>', '<code>[tool.setuptools]</code>', '<code>[dependency-groups]</code>'], answer: 0, explain: 'PEP 518/517: build-system.requires lists build dependencies and build-backend names the object whose hooks build the wheel and sdist.' },
    { q: R`Why should a reusable <b>library</b> avoid exact pins like <code>requests==2.32.3</code> in its dependencies?`, options: ['They make it impossible to install alongside other packages needing a different version', 'PyPI rejects exact pins', 'Exact pins slow down imports', 'Wheels cannot contain exact pins'], answer: 0, explain: 'Libraries share one environment with other libraries. Exact pins cause unresolvable conflicts; applications lock exact versions instead.' },
    { q: R`What does <code>uv sync --locked</code> do when <code>uv.lock</code> no longer matches <code>pyproject.toml</code>?`, options: ['Fails with an error instead of updating the lock', 'Silently rewrites the lock', 'Installs only the packages in pyproject', 'Deletes the virtual environment'], answer: 0, explain: '--locked asserts the lock is up to date, which is exactly what CI should check. --frozen would use the lock without checking.' },
    { q: R`In a <b>src layout</b>, why do tests catch packaging mistakes that a flat layout hides?`, options: ['The package is not importable from the repo root, so tests must import the installed package', 'src layout runs tests in parallel', 'src layout disables editable installs', 'pytest refuses to run in flat layouts'], answer: 0, explain: 'With a flat layout the current directory is on sys.path and the local folder shadows the installed package.' },
    { q: R`<code>ruff check</code> with <code>select = ["E", "F"]</code> and <code>ignore = ["E501"]</code> — is E501 reported?`, options: ['No: the more specific ignore selector wins', 'Yes: select always beats ignore', 'Only with --fix', 'Only if line-length is unset'], answer: 0, explain: 'E501 matches both, and the ignore selector (E501) is more specific than the select selector (E).' },
    { q: R`What is the main benefit of <b>Trusted Publishing</b> to PyPI?`, options: ['CI authenticates with a short-lived OIDC token, so no long-lived API token can leak', 'Uploads are faster', 'It allows re-uploading the same version', 'It signs the code with the maintainer\'s GPG key'], answer: 0, explain: 'PyPI trusts a specific workflow identity and mints a short-lived token for each run; there is nothing secret to store or steal.' },
    { q: R`In a Dockerfile, why copy <code>uv.lock</code> before the application source?`, options: ['The dependency-install layer stays cached when only source code changes', 'uv refuses to run without it at the top', 'It makes the final image smaller', 'Docker reads TOML files faster'], answer: 0, explain: 'A layer is rebuilt when its inputs change, and everything after it rebuilds too. Copying the lock first isolates slow dependency installs from code edits.' },
    { q: R`<code>pip install</code> fails with <code>error: externally-managed-environment</code>. What is the right fix?`, options: ['Create a virtual environment (or use pipx / uv tool for CLI tools)', 'Re-run with <code>sudo</code>', 'Always add <code>--break-system-packages</code>', 'Delete the EXTERNALLY-MANAGED file'], answer: 0, explain: 'PEP 668 protects the OS Python that system tools depend on. Projects belong in venvs; CLI tools in pipx/uv tool environments.' },
    { q: R`What does mypy do with a function that has no annotations at all (default settings)?`, options: ['It does not check the body (treats it as untyped) unless check_untyped_defs or strict is on', 'It reports an error', 'It infers all types and checks fully', 'It crashes'], answer: 0, explain: 'mypy is gradual: unannotated functions are skipped by default, which is why strict mode or disallow_untyped_defs is used to force annotations.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: R`What is a virtual environment, how does it work, and why use one per project?`, level: 'B', a: R`<p>A virtual environment is a directory with a <code>pyvenv.cfg</code>, an interpreter link in <code>bin/</code> and its own empty <code>site-packages</code>. When that interpreter starts, <code>site</code> reads <code>pyvenv.cfg</code>, sets <code>sys.prefix</code> to the venv and puts the venv's site-packages on <code>sys.path</code> instead of the global one; <code>sys.base_prefix</code> still names the real installation. Each project gets its own set of package versions, so projects cannot break each other or the OS Python (PEP 668 now enforces that). Activation only edits PATH; CI typically calls <code>.venv/bin/python</code> or <code>uv run</code> directly.</p>`, followUps: ['Why are venvs not relocatable?', 'How does conda differ from venv?', 'What does <code>include-system-site-packages</code> do?'] },
    { q: R`<code>pip install requests</code> succeeded but <code>import requests</code> fails. How do you debug it?`, level: 'B', a: R`<p>Almost always two interpreters. Check <code>which -a python pip</code>, <code>python -m pip --version</code> (shows the site-packages pip writes to) and <code>python -c "import sys; print(sys.executable, sys.path)"</code>. If pip belongs to a different interpreter, reinstall with <code>python -m pip install requests</code> so both agree. Other causes: an IDE using a different interpreter, a local file or folder named <code>requests</code> shadowing the package (check <code>requests.__file__</code>), installing as a different user (<code>--user</code> site), or running under sudo with root's PATH.</p>`, followUps: ['How does PEP 668 change the "pip install outside venv" situation?', 'How would you make this impossible for a team?'] },
    { q: R`Explain wheels versus sdists. What happens when pip installs each?`, level: 'I', a: R`<p>A wheel is a built, ready-to-install zip with compatibility tags in its name; installing it is unpacking files, writing <code>RECORD</code>/<code>INSTALLER</code> metadata and generating entry-point scripts — no project code runs. An sdist is source plus <code>PKG-INFO</code>; pip must build a wheel first: read <code>[build-system]</code>, create an isolated build env, install the build requirements, call the PEP 517 hooks (<code>get_requires_for_build_wheel</code>, <code>build_wheel</code>), then install the result. Builds can need compilers and run arbitrary code, so projects publish wheels for every platform (cibuildwheel) and security-sensitive installs use <code>--only-binary :all:</code>.</p>`, followUps: ['What does <code>manylinux_2_28</code> guarantee?', 'What is the stable ABI (abi3)?', 'When would you use <code>--no-build-isolation</code>?'] },
    { q: R`Walk through the main sections of a modern <code>pyproject.toml</code>.`, level: 'B', a: R`<p><code>[build-system]</code> (PEP 518/517) declares build requirements and the backend (hatchling, setuptools, flit-core, pdm-backend, poetry-core, uv_build, maturin, scikit-build-core). <code>[project]</code> (PEP 621) holds standard metadata: name, version (or <code>dynamic</code>), <code>requires-python</code>, dependencies, <code>optional-dependencies</code> (extras), <code>scripts</code>/<code>entry-points</code>, license (PEP 639 SPDX), readme, URLs. <code>[dependency-groups]</code> (PEP 735) holds dev/test groups that are not published. <code>[tool.*]</code> tables configure ruff, mypy, pytest, uv, poetry and others. One file replaces setup.py, setup.cfg, requirements-dev.txt and most tool config files.</p>`, followUps: ['When is a <code>setup.py</code> still needed?', 'Extras vs dependency groups — when do you use each?'] },
    { q: R`How does pip resolve dependencies, and what do you do about <code>ResolutionImpossible</code>?`, level: 'I', a: R`<p>Since 20.3 pip uses resolvelib, a backtracking resolver: it picks candidate versions (newest first, preferring already-installed ones unless upgrading), fetches their metadata (only the METADATA file when the index supports PEP 658), adds their dependencies, and backtracks when a constraint conflicts. ResolutionImpossible means no combination works: pip prints the conflicting requirements. Fixes: upgrade or drop the package with the old pin, loosen your own constraint, ask upstream to relax an over-tight upper bound, or use a constraints file to steer the search. Long backtracking is fixed by adding sensible lower bounds. uv's PubGrub resolver is much faster and gives a readable derivation of the conflict.</p>`, followUps: ['Why is dependency resolution NP-hard in general?', 'What is the difference between <code>-r</code> and <code>-c</code> files?'] },
    { q: R`Library vs application: how should each declare and lock dependencies?`, level: 'I', a: R`<p>A library declares abstract, permissive requirements in <code>[project].dependencies</code> — lower bounds for features it uses, upper bounds only for known incompatibilities — because it must co-install with other libraries in the user's environment. An application or service also declares requirements, but deploys from a lock file (<code>uv.lock</code>, <code>poetry.lock</code>, pip-compile output with hashes, or PEP 751 <code>pylock.toml</code>) that pins the entire transitive tree, so dev, CI and production install the same bytes. Libraries may still keep a lock for their own CI and dev tools, and test against minimum versions (<code>uv sync --resolution lowest-direct</code>) and latest versions.</p>`, followUps: ['Why do caret constraints in libraries cause trouble?', 'How do you keep locked dependencies up to date safely?'] },
    { q: R`Compare pip + venv, Poetry and uv. Which would you choose for a new project?`, level: 'I', a: R`<p><b>pip + venv</b> are built in and universal, but locking needs pip-tools (or experimental <code>pip lock</code>) and you manage venvs and Python versions yourself. <b>Poetry</b> (1.8/2.x) adds project management, a lock file, dependency groups, building and publishing; Poetry 2 uses the standard <code>[project]</code> table. <b>uv</b> covers all of that plus Python version installation, tool running (<code>uvx</code>), workspaces, a universal cross-platform lock and a pip-compatible interface, and is typically 10–100× faster thanks to Rust, parallel downloads and a global cache with hard links. For a new project I would usually pick uv with a PEP 621 pyproject, since it is fast in CI and still standards-based, so moving away later is cheap. In an organization standardised on Poetry, consistency wins.</p>`, followUps: ['What does a "universal" lock file mean?', 'How would you migrate a Poetry 1.x project to Poetry 2 or uv?'] },
    { q: R`What is the src layout, and how do editable installs work?`, level: 'I', a: R`<p>In the src layout the package lives in <code>src/pkg/</code>, so the repo root (which is on <code>sys.path</code> when you run tests or scripts) does not contain an importable <code>pkg</code>. Tests must import the installed package, which surfaces missing files, wrong package discovery and absent package data before release. Editable installs (PEP 660, <code>pip install -e .</code>, automatic in <code>uv sync</code>) make the installed package point back at the source: either a <code>.pth</code> file that adds <code>src/</code> to <code>sys.path</code> at startup, or an import hook mapping just your packages. Code edits show up immediately; metadata changes (dependencies, entry points) need a reinstall, and compiled extensions need a rebuild.</p>`, followUps: ['Why can static type checkers fail to see import-hook editable installs?', 'What does <code>python -P</code> do?'] },
    { q: R`How do you set up linting, formatting and type checking for a team?`, level: 'I', a: R`<p>Configure everything in <code>pyproject.toml</code>: Ruff for lint (start from defaults plus <code>I</code>, <code>B</code>, <code>UP</code>, <code>SIM</code>; ignore E501 when using the formatter) and <code>ruff format</code> for formatting; mypy (or Pyright) with strict settings for new modules and per-module overrides for legacy code. Run them locally via pre-commit hooks pinned by <code>rev</code>, and again in CI (<code>pre-commit run --all-files</code> or explicit <code>ruff check</code>, <code>ruff format --check</code>, <code>mypy</code>), failing the build on any error so <code>--no-verify</code> cannot bypass them. Add a one-time formatting commit to <code>.git-blame-ignore-revs</code>. Require error codes on suppressions and enable RUF100 and <code>warn_unused_ignores</code> to keep them honest.</p>`, followUps: ['How would you introduce mypy to a 500k-line untyped codebase?', 'Ruff vs Black + isort + flake8: what changes for the team?'] },
    { q: R`How do you publish a package to PyPI safely?`, level: 'I', a: R`<p>Use a standards-based backend; derive or bump the version (hatch-vcs/setuptools-scm from git tags, or <code>uv version --bump</code>); build both sdist and wheel(s) in CI (<code>uv build</code>, cibuildwheel for compiled code); validate with <code>twine check</code> and an install-and-import smoke test; publish to TestPyPI first. Publish to PyPI via Trusted Publishing (OIDC from a protected GitHub environment with <code>id-token: write</code>), which avoids long-lived tokens and lets PyPI record PEP 740 attestations. Releases are immutable: never reuse a version; yank broken ones and release a fix. Enable 2FA on the account and limit maintainers.</p>`, followUps: ['What does yanking do for users who pinned the version?', 'How would you publish wheels for Linux, macOS and Windows?'] },
    { q: R`How do you make Python builds reproducible in CI and Docker?`, level: 'A', a: R`<p>Pin every input. Interpreter: <code>.python-version</code> / <code>requires-python</code> and a base image pinned by digest. Dependencies: a committed lock with hashes, installed with <code>uv sync --locked</code>, <code>poetry sync</code> or <code>pip install --require-hashes</code>, never a bare <code>pip install -r</code> of loose requirements. Build tools: pin the backend in <code>[build-system].requires</code>. Artefacts: set <code>SOURCE_DATE_EPOCH</code> so wheels are byte-identical, then compare hashes across two builds. Docker: copy the lock before the source, install dependencies in their own layer, use BuildKit cache mounts for the package cache, multi-stage builds to drop compilers, and a non-root user. CI: cache keyed on the lock hash, the same checks as pre-commit, and Dependabot/Renovate for controlled updates.</p>`, followUps: ['What can still differ between two "identical" builds?', 'Why cache the package cache rather than the venv?'] },
    { q: R`Describe Python supply-chain attacks and how packaging choices mitigate them.`, level: 'A', a: R`<p>Threats: typosquatting and AI-hallucinated names (slopsquatting), dependency confusion (a public package shadows an internal name with a higher version), compromised maintainer accounts or CI tokens, malicious code in sdist build steps or <code>.pth</code> files, and tampered mirrors. Mitigations: lock files with hashes and <code>--require-hashes</code>; prefer wheels (<code>--only-binary</code>); use one controlled index or explicit per-package index pinning (uv's first-index strategy, private proxy with allow-lists); audit with <code>pip-audit</code>/OSV in CI; review lock diffs for new transitive packages; Trusted Publishing and attestations for your own releases; least-privilege CI; and run untrusted builds and AI agents in disposable containers built from the lock.</p>`, followUps: ['How does pip\'s <code>--extra-index-url</code> enable dependency confusion?', 'What does a PEP 740 attestation prove — and what does it not?'] },
    { q: R`What are wheel compatibility tags and how does an installer choose among several wheels?`, level: 'A', a: R`<p>Each wheel name ends in <code>{python}-{abi}-{platform}</code>, possibly with dot-compressed sets (<code>py2.py3</code>). The interpreter computes an ordered list of the tags it supports (<code>packaging.tags.sys_tags()</code>, visible via <code>pip debug --verbose</code>): most specific first — e.g. <code>cp312-cp312-manylinux_2_39_x86_64</code> … older manylinux levels, then <code>cp312-abi3</code> and older <code>cp3x-abi3</code>, then <code>cp312-none</code>, <code>py312-none</code>, ending with <code>py3-none-any</code>. For each candidate version the installer keeps wheels whose expanded tags intersect that list and picks the one whose best tag ranks highest (build tag breaks ties); if none match it falls back to the sdist. Free-threaded builds (<code>cp313t</code>) and musl (<code>musllinux</code>) have separate tags.</p>`, followUps: ['Why does an Alpine Docker image often compile packages from source?', 'How does the abi3 tag let one wheel serve many Python versions?'] },
    { q: R`Your team's CI install takes 6 minutes. How would you speed it up?`, level: 'E', a: R`<p>Measure first: is the time in resolution, downloading, building sdists, or installing? Then: install from the lock without resolving (<code>uv sync --locked</code>; switching from pip to uv alone often cuts minutes to seconds); cache the package cache keyed on the lock + Python + OS (setup-uv's cache, <code>uv cache prune --ci</code>); eliminate sdist builds by upgrading to versions that ship wheels for your platform or prebuilding wheels into a private index; avoid Alpine/musl if wheels are missing; split dependency groups so lint jobs do not install the ML stack; and use prebuilt CI images or Docker layers with dependencies baked in, rebuilt only when the lock changes. Finally, parallelise test jobs and keep the critical path short.</p>`, followUps: ['How would you detect a package that silently falls back to building from source?', 'What risks come with caching whole virtual environments?'] }
  );

  /* ----------------------------------------------------------------------
     Spread correct answers across positions (authored first, rotated).
     ---------------------------------------------------------------------- */
  function rotateMcq(m, k) {
    var n = m.options.length, shift = k % n;
    if (!shift) return;
    var opts = m.options.slice(), out = [];
    for (var i = 0; i < n; i++) out[(i + shift) % n] = opts[i];
    m.options = out;
    m.answer = (m.answer + shift) % n;
  }
  quiz.forEach(function (q, i) { rotateMcq(q, i + 1); });
  var mcqCounter = 0;
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { if (p.mcq) rotateMcq(p.mcq, 2 + mcqCounter++); }); });
  practice.forEach(function (p) { if (p.mcq) rotateMcq(p.mcq, 1 + mcqCounter++); });

  registerModule({
    id: 'py14',
    title: 'Packaging, Environments & Tooling',
    intro: R`<p>Writing Python is half the job; the other half is making it <b>install the same way everywhere</b>. This module shows how real Python projects are structured and shipped: <b>virtual environments</b> and how the interpreter finds packages, <b>pip</b> and PEP 440 versions with backtracking dependency resolution, <b>pyproject.toml</b> and build backends, <b>wheels vs sdists</b> and their compatibility tags, <b>Poetry and uv</b> with lock files, the <b>src layout</b> and editable installs, <b>Ruff, mypy and pre-commit</b>, and finally <b>publishing to PyPI</b> and <b>reproducible builds in CI and Docker</b>.</p>
<p>Config files and shell commands are shown as reference snippets. Every problem, though, is plain Python you can run and test: a PEP 440 comparator, a specifier matcher, a backtracking resolver, a lock-file diff, a wheel-tag selector, an import-path resolver, a mini linter and a hash verifier — the algorithms that pip, uv and Ruff run for you every day.</p>`,
    goals: [
      'Create and inspect virtual environments, explain <code>sys.prefix</code>/PATH, and fix "installed but cannot import" bugs',
      'Compare PEP 440 versions and evaluate specifiers (<code>~=</code>, wildcards, pre-release rules) by hand and in code',
      'Write a standards-based <code>pyproject.toml</code>, pick a build backend, and explain wheels, sdists and compatibility tags',
      'Use uv or Poetry with lock files, explain library vs application pinning, and review lock diffs',
      'Structure a package with the src layout, use editable installs, and predict how imports resolve',
      'Set up Ruff, mypy and pre-commit locally and in CI',
      'Publish to PyPI with Trusted Publishing and build reproducible, cache-friendly CI pipelines and Docker images'
    ],
    prereqs: R`Python 3 (<b>Functions, Modules &amp; Scope</b>) — modules, packages, imports and <code>__name__</code>. Helpful: basic shell and git usage.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
