(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers used by several visualizers ---------- */
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function T(html, label) { return { type: 'text', label: label, html: html }; }
  function TB(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows, hl: hl || {} }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function words(s) { return String(s).trim().split(/[\s,]+/).filter(Boolean); }

  /* ---------- tiny semver engine (ES5) used by the semver visualizer ---------- */
  function svParse(s) {
    var p = String(s).trim().replace(/^v/, '').split('.');
    if (p.length !== 3 || p.some(function (x) { return !/^\d+$/.test(x); })) throw new Error('Bad version "' + s + '" - use MAJOR.MINOR.PATCH like 1.4.2');
    return p.map(Number);
  }
  function svCmp(a, b) { for (var i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; }
  function svChecks(r) {
    r = r.trim();
    var m;
    if (r === '' || r === '*' || r === 'x' || r === 'latest') return [];
    if ((m = r.match(/^\^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/))) {
      var a = +m[1], b = +(m[2] || 0), c = +(m[3] || 0);
      var hi = a > 0 ? [a + 1, 0, 0] : b > 0 ? [0, b + 1, 0] : [0, 0, c + 1];
      return [['>=', [a, b, c]], ['<', hi]];
    }
    if ((m = r.match(/^~(\d+)(?:\.(\d+))?(?:\.(\d+))?$/))) {
      var a2 = +m[1], b2 = +(m[2] || 0), c2 = +(m[3] || 0);
      return [['>=', [a2, b2, c2]], ['<', m[2] === undefined ? [a2 + 1, 0, 0] : [a2, b2 + 1, 0]]];
    }
    if ((m = r.match(/^(\d+)\.(?:x|\*)$/))) return [['>=', [+m[1], 0, 0]], ['<', [+m[1] + 1, 0, 0]]];
    if ((m = r.match(/^(\d+)\.(\d+)\.(?:x|\*)$/))) return [['>=', [+m[1], +m[2], 0]], ['<', [+m[1], +m[2] + 1, 0]]];
    if ((m = r.match(/^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/))) return [[m[1] || '=', svParse(m[2])]];
    throw new Error('Cannot read range "' + r + '" - try ^1.2.3, ~1.2.3, >=1.0.0 &lt;2.0.0, 1.x or 1.2.3');
  }
  function svSets(range) {
    return String(range).split('||').map(function (part) {
      var out = [];
      part.trim().split(/\s+/).forEach(function (tok) { out = out.concat(svChecks(tok)); });
      return out;
    });
  }
  function svOp(op, v, w) {
    var c = svCmp(v, w);
    return op === '>=' ? c >= 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : op === '<' ? c < 0 : c === 0;
  }
  function svTest(v, sets) { return sets.some(function (set) { return set.every(function (ch) { return svOp(ch[0], v, ch[1]); }); }); }
  function svText(sets) {
    return sets.map(function (set) { return set.length ? set.map(function (ch) { return ch[0] + ch[1].join('.'); }).join(' and ') : 'anything'; }).join('  OR  ');
  }
  function svWhy(v, sets) {
    return sets.map(function (set) {
      return set.length ? set.map(function (ch) { return ch[0] + ch[1].join('.') + (svOp(ch[0], v, ch[1]) ? ' yes' : ' NO'); }).join(', ') : 'no limits';
    }).join(' | ');
  }

  /* ================================================================
     TOPIC 1 - npm / pnpm, package.json, semver, lockfiles
     ================================================================ */
  topics.push({
    title: 'Package Managers: npm, pnpm, package.json, Semver & Lockfiles',
    analogy: `<p>Think of <b>package.json</b> as a <b>shopping list</b> that says "about 2 kg of tomatoes, any ripe ones are fine". The <b>lockfile</b> is the <b>till receipt</b>: it records the exact brand, batch and price you really bought. Anyone who cooks from the receipt gets the same dish; anyone who cooks from the shopping list might get a different tomato today than last month. The <b>package manager</b> (npm, pnpm, yarn) is the shopper who reads the list, visits the shop (the registry), and fills your pantry (<code>node_modules</code>).</p>`,
    explain: `<p>🟢 <b>Almost every frontend project is mostly other people's code.</b> A "package" is a folder of code with a <code>package.json</code> that names it and lists what it needs. A <b>package manager</b> downloads those packages, and the packages <i>they</i> need, and so on. That whole family tree is your <b>dependency graph</b>.</p>
      <p><b>The package.json fields you must know:</b></p>
      ${H.table(['Field', 'What it is', 'Example'], [
        ['<code>name</code> / <code>version</code>', 'Who this package is', '<code>"my-shop" 1.0.0</code>'],
        ['<code>scripts</code>', 'Named shell commands you run with <code>npm run &lt;name&gt;</code>', '<code>"build": "vite build"</code>'],
        ['<code>dependencies</code>', 'Needed at <b>runtime</b> (ships to users)', '<code>"react": "^18.3.1"</code>'],
        ['<code>devDependencies</code>', 'Needed only to <b>build / test</b> (never shipped)', '<code>"vitest": "^2.0.0"</code>'],
        ['<code>peerDependencies</code>', '"You (the host app) must install this, I will share yours"', 'A React component library asking for <code>react</code>'],
        ['<code>engines</code>', 'Which Node versions work', '<code>"node": "&gt;=22"</code>'],
        ['<code>type</code>', '<code>"module"</code> makes <code>.js</code> files ES modules', '<code>"type": "module"</code>'],
        ['<code>sideEffects</code>', 'Hint for bundlers: which files can be dropped if unused', '<code>false</code> (covered in the tree shaking topic)']
      ])}
      <p>🔵 <b>Semantic versioning (semver)</b> is a promise written in three numbers: <b>MAJOR.MINOR.PATCH</b>.</p>
      ${H.table(['Number', 'Bump it when…', 'Safe to auto-update?'], [
        ['PATCH <code>1.4.<b>2</b></code>', 'You fixed a bug, nothing else changed', H.c('g', 'Yes')],
        ['MINOR <code>1.<b>4</b>.2</code>', 'You added a feature, old code still works', H.c('g', 'Usually yes')],
        ['MAJOR <code><b>1</b>.4.2</code>', 'You broke something on purpose (breaking change)', H.c('r', 'Never automatically')]
      ])}
      <p><b>Range operators</b> in package.json say which versions you accept:</p>
      ${H.table(['Range', 'Means', 'Accepts', 'Rejects'], [
        ['<code>1.4.2</code>', 'Exactly this', '1.4.2', 'everything else'],
        ['<code>~1.4.2</code>', 'Patch updates only', '1.4.2, 1.4.9', '1.5.0'],
        ['<code>^1.4.2</code>', 'Anything compatible (same MAJOR)', '1.4.2, 1.9.0', '2.0.0'],
        ['<code>^0.4.2</code>', '0.x is "unstable": caret locks the MINOR', '0.4.9', '0.5.0'],
        ['<code>&gt;=1.0.0 &lt;2.0.0</code>', 'An explicit window', '1.0.0 … 1.99.9', '2.0.0'],
        ['<code>1.x</code> / <code>*</code>', 'Any minor / anything', '1.0.0 … 1.99.9 / all', '2.0.0 (for 1.x)']
      ])}
      <p>🔵 <b>The lockfile</b> (<code>package-lock.json</code>, <code>pnpm-lock.yaml</code>, <code>yarn.lock</code>) records the <b>exact version, download URL and integrity hash</b> of every package in the whole tree. Without it, "^1.4.2" resolves to whatever is newest <i>today</i>. With it, every laptop and every CI server installs the identical tree. You <b>always commit</b> the lockfile for applications.</p>
      <p><b>npm vs pnpm vs yarn:</b> all three read the same package.json. <b>npm</b> ships with Node. <b>pnpm</b> keeps one global content-addressable store and <b>hard-links</b> files into each project, so installs are fast and use little disk, and it is <b>strict</b>: you can only import what you declared (no accidental "phantom" dependencies). <b>yarn</b> (Berry) adds Plug'n'Play and workspaces features.</p>`,
    clues: [
      '"works on my machine but not in CI" → missing or ignored lockfile, or different Node / package versions',
      '"what is the difference between <code>^</code> and <code>~</code>?" → caret allows MINOR+PATCH, tilde allows PATCH only',
      '"dependencies vs devDependencies vs peerDependencies" → runtime / build-time / "host app provides it"',
      '"installs are slow / node_modules is huge / monorepo" → pnpm, workspaces, content-addressable store',
      '"a package update broke production overnight" → unpinned range with no lockfile, or a bad MAJOR bump',
      '"supply-chain attack / typosquatting / malicious postinstall" → lockfile integrity hashes, <code>npm audit</code>, <code>--ignore-scripts</code>'
    ],
    code: [
      { lang: 'json', title: 'A realistic package.json', code: `{
  "name": "my-shop",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "~5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5",
    "eslint": "^9.9.0"
  },
  "engines": { "node": ">=22" }
}` },
      { lang: 'js', run: true, title: 'A tiny semver range matcher (runnable)', code: `// Supports ^ ~ >= > <= < = , x-ranges (1.x, 1.2.x), * and "||" (OR).
function parseV(s) {
  const p = String(s).trim().replace(/^v/, '').split('.');
  if (p.length !== 3 || p.some((x) => !/^\\d+$/.test(x))) throw new Error('bad version: ' + s);
  return p.map(Number);
}
// compare two [major, minor, patch] triples: -1, 0 or 1
function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}
// Turn ONE range word into a list of [operator, version] checks that must ALL pass.
function toChecks(r) {
  r = r.trim();
  let m;
  if (r === '' || r === '*' || r === 'x') return [];
  if ((m = r.match(/^\\^(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?$/))) {
    const a = +m[1], b = +(m[2] || 0), c = +(m[3] || 0);
    // caret: lock the left-most NON-ZERO number
    const hi = a > 0 ? [a + 1, 0, 0] : b > 0 ? [0, b + 1, 0] : [0, 0, c + 1];
    return [['>=', [a, b, c]], ['<', hi]];
  }
  if ((m = r.match(/^~(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?$/))) {
    const a = +m[1], b = +(m[2] || 0), c = +(m[3] || 0);
    // tilde: patch updates only (or minor updates if only a major was written)
    return [['>=', [a, b, c]], ['<', m[2] === undefined ? [a + 1, 0, 0] : [a, b + 1, 0]]];
  }
  if ((m = r.match(/^(\\d+)\\.(?:x|\\*)$/))) return [['>=', [+m[1], 0, 0]], ['<', [+m[1] + 1, 0, 0]]];
  if ((m = r.match(/^(\\d+)\\.(\\d+)\\.(?:x|\\*)$/))) return [['>=', [+m[1], +m[2], 0]], ['<', [+m[1], +m[2] + 1, 0]]];
  if ((m = r.match(/^(>=|<=|>|<|=)?(\\d+\\.\\d+\\.\\d+)$/))) return [[m[1] || '=', parseV(m[2])]];
  throw new Error('unsupported range: ' + r);
}
function check(op, v, w) {
  const c = cmp(v, w);
  return op === '>=' ? c >= 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : op === '<' ? c < 0 : c === 0;
}
// "||" separates alternatives; spaces inside one alternative mean AND.
function satisfies(version, range) {
  const v = parseV(version);
  return range.split('||').some((part) => {
    const checks = part.trim().split(/\\s+/).flatMap(toChecks);
    return checks.every(([op, w]) => check(op, v, w));
  });
}
// what npm install does: pick the HIGHEST published version that fits the range
function maxSatisfying(versions, range) {
  const ok = versions.filter((v) => satisfies(v, range));
  ok.sort((a, b) => cmp(parseV(a), parseV(b)));
  return ok.length ? ok[ok.length - 1] : null;
}

const published = ['0.4.2', '0.4.9', '0.5.0', '1.4.2', '1.4.9', '1.5.0', '1.9.3', '2.0.0'];
for (const range of ['^1.4.2', '~1.4.2', '^0.4.2', '>=1.4.9 <2.0.0', '1.x', '<1.0.0 || 2.x', '*']) {
  console.log(range.padEnd(16), '->', maxSatisfying(published, range));
}
console.log('satisfies 1.5.0 ^1.4.2?', satisfies('1.5.0', '^1.4.2'));
console.log('satisfies 2.0.0 ^1.4.2?', satisfies('2.0.0', '^1.4.2'));` },
      { lang: 'bash', title: 'Everyday commands (npm vs pnpm)', code: `# install everything from package.json (and update the lockfile if needed)
npm install            # or: pnpm install
# CI-friendly: install EXACTLY what the lockfile says, fail if they disagree
npm ci                 # or: pnpm install --frozen-lockfile
# add a runtime dependency / a dev-only dependency
npm install react      # or: pnpm add react
npm install -D vitest  # or: pnpm add -D vitest
# why is this package in my tree? what is outdated? any known vulnerabilities?
npm ls left-pad        # or: pnpm why left-pad
npm outdated
npm audit
# run a package binary without installing it globally
npx create-vite@latest # or: pnpm dlx create-vite` }
    ],
    codeTitle: ['package.json', 'Semver matcher', 'Commands'],
    viz: [
      {
        title: 'Semver resolution: which version does npm pick?',
        input: '^1.2.3 ; 1.0.0 1.2.2 1.2.3 1.4.0 1.9.9 2.0.0',
        inputLabel: 'range ; published versions',
        gen: function (input) {
          var parts = String(input).split(';');
          if (parts.length !== 2) throw new Error('Format: range ; version version ... (example: ^1.2.3 ; 1.0.0 1.2.3 2.0.0)');
          var range = parts[0].trim();
          var vers = words(parts[1]);
          if (vers.length < 2 || vers.length > 10) throw new Error('Give between 2 and 10 versions');
          var parsed = vers.map(svParse);
          var sets = svSets(range);
          var rows = [], hl = {}, frames = [], best = -1, i;
          frames.push(F('You wrote the range <code>' + esc(range) + '</code> in package.json. npm turns it into plain comparisons: <b>' + esc(svText(sets)) + '</b>. Now it checks every version the registry has published.',
            [TB('Registry versions (not checked yet)', ['version', 'checks', 'fits?'], vers.map(function (v) { return [v, '-', '?']; }))]));
          for (i = 0; i < vers.length; i++) {
            var ok = svTest(parsed[i], sets);
            rows.push([vers[i], svWhy(parsed[i], sets), ok ? 'YES' : 'no']);
            hl[i] = ok ? 'ok' : 'bad';
            if (ok && (best < 0 || svCmp(parsed[i], parsed[best]) > 0)) best = i;
            var shown = rows.slice();
            for (var j = i + 1; j < vers.length; j++) shown.push([vers[j], '-', '?']);
            frames.push(F('Version <b>' + vers[i] + '</b>: ' + (ok ? '<span class="c-g">fits the range</span> - it is a candidate.' : '<span class="c-r">outside the range</span> - npm ignores it.'),
              [TB('Checking version ' + (i + 1) + ' of ' + vers.length, ['version', 'checks', 'fits?'], shown, JSON.parse(JSON.stringify(hl)))]));
          }
          var finalHl = JSON.parse(JSON.stringify(hl));
          if (best >= 0) finalHl[best] = 'sel';
          frames.push(F(best >= 0 ? 'npm picks the <b>highest</b> version that fits: <b class="c-p">' + vers[best] + '</b>. That exact number is then frozen into the lockfile.' : '<span class="c-r">No published version fits this range</span> - npm install fails with ETARGET (no matching version).',
            [TB('Result', ['version', 'checks', 'fits?'], rows, finalHl), { type: 'vars', vals: { range: range, resolved: best >= 0 ? vers[best] : 'none' }, hl: { resolved: best >= 0 ? 'sel' : 'bad' } }]));
          return frames;
        }
      },
      {
        title: 'Why the lockfile matters: same list, different dinner',
        input: '^1.4.0',
        inputLabel: 'range in package.json',
        gen: function (input) {
          var range = String(input).trim() || '^1.4.0';
          var sets = svSets(range);
          var day1 = ['1.3.0', '1.4.0'], day90 = day1.concat(['1.4.1', '1.5.0', '1.9.0']);
          var pick = function (list) { var b = null; list.forEach(function (v) { if (svTest(svParse(v), sets) && (b === null || svCmp(svParse(v), svParse(b)) > 0)) b = v; }); return b || 'none'; };
          var a = pick(day1), b = pick(day90);
          return [
            F('<b>Day 1.</b> Alice runs <code>npm install</code>. The registry has ' + day1.join(', ') + '. Range <code>' + esc(range) + '</code> resolves to <b>' + a + '</b>. npm writes it into <code>package-lock.json</code>.',
              [{ type: 'map', label: 'Alice (day 1)', entries: [['resolved', a]], hl: { resolved: 'ok' } }, { type: 'map', label: 'package-lock.json', entries: [['dep', a]], hl: { dep: 'sel' } }]),
            F('<b>Day 90.</b> The author has published more versions: ' + day90.join(', ') + '. Bob joins the team and clones the repo.',
              [{ type: 'set', label: 'Registry now', items: day90, hl: { '1.4.1': 'cur', '1.5.0': 'cur', '1.9.0': 'cur' } }]),
            F('<b>Without a lockfile</b> Bob runs <code>npm install</code> and gets <b>' + b + '</b>. Alice has ' + a + '. A bug that exists in only one of them is now "works on my machine".',
              [{ type: 'map', label: 'Alice', entries: [['dep', a]], hl: { dep: 'ok' } }, { type: 'map', label: 'Bob (no lockfile)', entries: [['dep', b]], hl: { dep: a === b ? 'ok' : 'bad' } }]),
            F('<b>With a lockfile</b> Bob runs <code>npm ci</code>. npm ignores the range and installs exactly <b>' + a + '</b> (checked against the integrity hash). CI and production get the same tree too.',
              [{ type: 'map', label: 'Alice', entries: [['dep', a]], hl: { dep: 'ok' } }, { type: 'map', label: 'Bob (npm ci)', entries: [['dep', a]], hl: { dep: 'ok' } }, { type: 'map', label: 'CI server (npm ci)', entries: [['dep', a]], hl: { dep: 'ok' } }]),
            F('<b>Upgrading on purpose:</b> run <code>npm update</code> (or a Renovate/Dependabot PR). The lockfile changes to ' + b + ' in a reviewable diff, tests run, and only then does the team adopt it.',
              [{ type: 'map', label: 'package-lock.json after upgrade PR', entries: [['dep', b]], hl: { dep: 'sel' } }])
          ];
        }
      }
    ],
    examples: [
      {
        title: 'Reading a package.json line by line',
        html: `<p>Look at <code>"react": "^18.3.1"</code> in <b>dependencies</b>, <code>"typescript": "~5.5.4"</code> in <b>devDependencies</b>, and <code>"build": "tsc --noEmit &amp;&amp; vite build"</code> in <b>scripts</b>.</p>
          <ul><li><code>react ^18.3.1</code> → any 18.x.y that is 18.3.1 or newer. It is a <b>runtime</b> dependency, so it ends up in the browser bundle.</li>
          <li><code>typescript ~5.5.4</code> → only 5.5.x patch releases. TypeScript does not follow semver strictly (minors can add new errors), so teams use tilde to stay calm.</li>
          <li><code>build</code> first type-checks (<code>--noEmit</code> means "check, write nothing"), then bundles. If the type check fails, <code>&amp;&amp;</code> stops the build.</li></ul>`
      },
      {
        title: 'What does ^0.4.2 allow? The zero-major surprise',
        html: `<p>Versions below 1.0.0 mean "anything can change". So caret locks the <b>first non-zero number</b>:</p>
          ${H.table(['Range', 'Means', 'Accepts', 'Rejects'], [['<code>^1.2.3</code>', '≥1.2.3 and &lt;2.0.0', '1.9.0', '2.0.0'], ['<code>^0.2.3</code>', '≥0.2.3 and &lt;0.3.0', '0.2.9', '0.3.0'], ['<code>^0.0.3</code>', '≥0.0.3 and &lt;0.0.4', '0.0.3', '0.0.4']])}
          <p>This is why a "tiny" bump from 0.4 to 0.5 can break you even though you wrote a caret.</p>`,
        code: { lang: 'js', run: true, title: 'Check it yourself', code: `// bounds of a caret range, written out
function caretBounds(a, b, c) {
  const hi = a > 0 ? [a + 1, 0, 0] : b > 0 ? [0, b + 1, 0] : [0, 0, c + 1];
  return '>=' + [a, b, c].join('.') + ' <' + hi.join('.');
}
console.log('^1.2.3 =', caretBounds(1, 2, 3));
console.log('^0.2.3 =', caretBounds(0, 2, 3));
console.log('^0.0.3 =', caretBounds(0, 0, 3));` }
      },
      {
        title: 'npm install vs npm ci - which one in CI?',
        html: `<p><b><code>npm install</code></b> reads package.json, may <i>change</i> the lockfile, and is happy to resolve fresh versions. <b><code>npm ci</code></b> ("clean install") deletes node_modules, reads <b>only the lockfile</b>, and <b>fails</b> if package.json and the lockfile disagree. That failure is a feature: it catches the "I edited package.json but forgot to commit the lockfile" mistake before it reaches production. The pnpm equivalent is <code>pnpm install --frozen-lockfile</code> (CI turns this on automatically).</p>`
      },
      {
        title: 'Peer dependency warning, decoded',
        html: `<p>You install <code>react-select</code> and see <i>"requires a peer of react@^18 but none is installed"</i>. A <b>peer dependency</b> is a library saying "I do not bring my own React; I will use <b>yours</b>". If it brought its own copy you would have <b>two Reacts</b> on the page and hooks would crash ("Invalid hook call"). Fix: install a React version that satisfies the peer range. npm 7+ and pnpm 8+ install missing peers automatically and still warn when versions conflict.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How resolution really works.</b> npm builds an <i>ideal tree</i>: for each dependency it asks the registry for the packument (the list of versions), picks the highest match for the range, then recurses. Two packages that need compatible ranges of the same library are <b>deduped</b> to one copy hoisted to the top of <code>node_modules</code>; incompatible ones get nested copies. That flat layout is why code can <code>import</code> packages it never declared ("phantom dependencies"). <b>pnpm</b> avoids this: <code>node_modules</code> holds only your declared deps as symlinks into <code>.pnpm/</code>, which hard-links files from a global store keyed by content hash.</p>
      <p><b>Lockfile contents:</b> for every package, the resolved version, tarball URL, and an <code>integrity</code> hash (sha512). On install npm re-hashes the tarball; a mismatch is a hard error, which is your defence against a registry or CDN tampering. <b>Prerelease versions</b> (<code>1.0.0-beta.1</code>) are never matched by a plain range unless the range itself names a prerelease on the same MAJOR.MINOR.PATCH.</p>
      <p><b>Security reality:</b> install scripts (<code>postinstall</code>) run arbitrary code on your machine. Use <code>npm audit</code>, <code>pnpm audit</code>, a bot like Renovate, <code>--ignore-scripts</code> for untrusted installs, and 2FA + provenance for packages you publish. <b>Libraries</b> publish ranges and usually <i>do not</i> commit a lockfile that consumers use; <b>applications</b> commit the lockfile. <b>Monorepos</b> use <code>workspaces</code> so many packages share one lockfile and link to each other locally (<code>"workspace:*"</code> in pnpm). <b>Overrides</b> (<code>"overrides"</code> in npm, <code>"pnpm.overrides"</code>) force a patched transitive version when a deep dependency has a CVE and the parent has not updated yet.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants happily suggest <code>npm install some-package</code> for every problem, and they sometimes invent package names that do not exist. Attackers register those exact names ("slopsquatting") with malware inside. AI also writes package.json from memory of old versions, so you get outdated majors and removed APIs.</p>
      <p><b>Work alongside it:</b> ask <code>Explain what ^2.3.0 allows and list three versions it rejects</code> to check your understanding, or <code>Read this npm audit output and tell me which findings are reachable in a frontend bundle</code>. Let AI draft a Renovate config or a monorepo layout, then review it.</p>
      <p><b>Where it goes wrong:</b> confident but wrong peer-dependency fixes (<code>--force</code> or <code>--legacy-peer-deps</code> hides the real conflict), and recommending packages with no maintainers. <b>You must still own:</b> checking a package exists, is maintained, and is small (look at its bundle size and download counts), committing the lockfile, and reviewing every dependency diff like it is code you wrote.</p>`,
    problems: [{
      title: 'Read a package.json: Which Version Gets Installed?',
      level: 'Easy', tags: ['semver', 'package.json', 'npm'], companies: ['Atlassian', 'Shopify'],
      statement: `<p>Write <code>maxSatisfying(versions, range)</code> that returns the highest published version that satisfies a range. Support exact versions, <code>^</code>, <code>~</code> and <code>&gt;=</code>/<code>&lt;</code> comparators. Return <code>null</code> when nothing fits. Use it to explain which version <code>npm install</code> picks for <code>"lodash": "^4.17.0"</code>.</p>`,
      constraints: `Versions are always MAJOR.MINOR.PATCH numbers (no prereleases). At most 1000 published versions. Ranges have no spaces except between comparators.`,
      example: `<p>Published: <code>3.9.0, 4.16.0, 4.17.0, 4.17.21, 5.0.0</code></p>${H.table(['range', 'result', 'why'], [['<code>^4.17.0</code>', H.c('g', '4.17.21'), 'same MAJOR 4, highest'], ['<code>~4.17.0</code>', H.c('g', '4.17.21'), 'MINOR locked at 17'], ['<code>^5.1.0</code>', H.c('r', 'null'), '5.0.0 is below 5.1.0']])}`,
      brute: { why: `<p>Sorting every version and testing them with ad-hoc string comparison (<code>"4.9.0" &gt; "4.17.0"</code> is true as text!) gives wrong answers. Comparing as strings is the bug, not the speed.</p>`, code: `function maxSatisfyingWrong(versions, range) {
  // BUG: string comparison, "4.9.0" sorts after "4.17.0"
  const sorted = versions.slice().sort().reverse();
  const base = range.replace(/^[\\^~]/, '');
  return sorted.find((v) => v.split('.')[0] === base.split('.')[0]) || null;
}` },
      mcq: { q: 'Why does comparing versions as plain strings fail?', options: ['"4.9.0" > "4.17.0" as text because "9" > "1"', 'Strings are slower than numbers', 'Versions contain dots', 'JavaScript cannot compare strings'], answer: 0, explain: 'Text comparison goes character by character. You must split on dots and compare each part as a number.' },
      hints: [`<p>Hint 1: Parse "4.17.21" into three <b>numbers</b>. Compare MAJOR, then MINOR, then PATCH.</p>`, `<p>Hint 2: Turn each range into a lower bound (inclusive) and an upper bound (exclusive): caret → next MAJOR, tilde → next MINOR. Then filter and take the max.</p>`, `<p>Hint 3: Edge cases - nothing fits (return null), range with <code>0.x</code> (caret locks MINOR), exact version with no operator. Recipe: parse → bounds → filter → reduce to the maximum.</p>`],
      solution: {
        approach: `<p>Convert every range into <code>[lowInclusive, highExclusive]</code>, keep the versions inside, and return the largest using a numeric triple comparison.</p>`,
        code: { lang: 'js', run: true, code: `function parse(v) { return v.split('.').map(Number); }
function cmp(a, b) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }

// returns [low (inclusive), high (exclusive or null)]
function bounds(range) {
  const m = range.match(/^([\\^~]|>=)?(\\d+)\\.(\\d+)\\.(\\d+)$/);
  if (!m) throw new Error('unsupported range ' + range);
  const [, op, a, b, c] = m;
  const lo = [+a, +b, +c];
  if (op === '^') return [lo, +a > 0 ? [+a + 1, 0, 0] : +b > 0 ? [0, +b + 1, 0] : [0, 0, +c + 1]];
  if (op === '~') return [lo, [+a, +b + 1, 0]];
  if (op === '>=') return [lo, null];
  return [lo, [+a, +b, +c + 1]]; // exact version: window of size one
}

function maxSatisfying(versions, range) {
  const [lo, hi] = bounds(range);
  let best = null;
  for (const v of versions) {
    const p = parse(v);
    if (cmp(p, lo) < 0) continue;            // too old
    if (hi && cmp(p, hi) >= 0) continue;     // too new
    if (best === null || cmp(p, parse(best)) > 0) best = v;
  }
  return best;
}

const published = ['3.9.0', '4.16.0', '4.17.0', '4.17.21', '5.0.0'];
console.log(maxSatisfying(published, '^4.17.0')); // 4.17.21
console.log(maxSatisfying(published, '~4.16.0')); // 4.16.0
console.log(maxSatisfying(published, '^5.1.0'));  // null` },
        dry: { head: ['version', 'in [4.17.0, 5.0.0)?', 'best so far'], rows: [['3.9.0', 'no (too old)', 'null'], ['4.17.0', 'yes', '4.17.0'], ['4.17.21', 'yes', '4.17.21'], ['5.0.0', 'no (too new)', '4.17.21']] },
        complexity: `<p>Time O(V) for V published versions, space O(1) extra.</p>`,
        followUps: ['Support prerelease tags like 1.0.0-beta.2', 'Support OR ranges with <code>||</code>']
      }
    }]
  });

  /* ---------- module-graph bundler model (ES5) used by the bundler visualizer ---------- */
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function bundParse(input) {
    var lines = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) throw new Error('Format: main>a,b,~lazy ; a>c ; ...   (~ means import() on demand)');
    var adj = {}, names = [], entry = null;
    function add(n) { if (!has(adj, n)) { adj[n] = []; names.push(n); } }
    lines.forEach(function (ln) {
      var m = ln.match(/^([\w.-]+)\s*>\s*(.*)$/);
      if (!m) throw new Error('Each part must look like name>dep1,dep2 (got "' + ln + '")');
      add(m[1]);
      if (!entry) entry = m[1];
      words(m[2]).forEach(function (t) {
        var dyn = t.charAt(0) === '~', n = dyn ? t.slice(1) : t;
        if (!/^[\w.-]+$/.test(n)) throw new Error('Bad module name "' + t + '"');
        add(n);
        adj[m[1]].push({ to: n, dyn: dyn });
      });
    });
    if (names.length > 12) throw new Error('Use at most 12 modules');
    return { adj: adj, names: names, entry: entry };
  }
  function bundPlan(g) {
    var have = {}, chunks = [], pending = [g.entry], queued = {};
    queued[g.entry] = true;
    while (pending.length) {
      var start = pending.shift(), mods = [], order = [], seen = {};
      (function walk(n) {
        if (seen[n] || have[n]) return;
        seen[n] = true; mods.push(n);
        g.adj[n].forEach(function (e) {
          if (e.dyn) { if (!queued[e.to] && !have[e.to]) { queued[e.to] = true; pending.push(e.to); } } else walk(e.to);
        });
        order.push(n);
      })(start);
      if (!mods.length) continue;
      mods.forEach(function (m) { have[m] = true; });
      chunks.push({ name: chunks.length === 0 ? 'main.js' : start + '.chunk.js', entry: start, mods: mods, order: order });
    }
    return chunks;
  }
  function modKb(n) { return 8 + (n.length * 7) % 23; }
  function bundLayout(g, H) {
    var depth = {}, q = [g.entry], i;
    depth[g.entry] = 0;
    while (q.length) {
      var u = q.shift();
      g.adj[u].forEach(function (e) { if (!has(depth, e.to)) { depth[e.to] = depth[u] + 1; q.push(e.to); } });
    }
    var maxD = 0;
    g.names.forEach(function (n) { if (has(depth, n) && depth[n] > maxD) maxD = depth[n]; });
    var cols = {};
    g.names.forEach(function (n) { var d = has(depth, n) ? depth[n] : -1; (cols[d] = cols[d] || []).push(n); });
    var pos = {};
    Object.keys(cols).forEach(function (d) {
      var list = cols[d];
      list.forEach(function (n, k) {
        var dd = +d;
        pos[n] = { x: dd < 0 ? 92 : (maxD ? 10 + dd * (70 / maxD) : 50), y: (k + 1) * H / (list.length + 1) };
        if (dd < 0) pos[n].y = (k + 1) * H / (list.length + 1);
      });
    });
    return { pos: pos, depth: depth };
  }
  function bundGraphPart(g, lay, H, label, hl, ehl, tags) {
    var edges = [], nodes = g.names.map(function (n) { return { id: n, label: n, x: lay.pos[n].x, y: lay.pos[n].y, shape: 'box' }; });
    g.names.forEach(function (u) { g.adj[u].forEach(function (e) { edges.push([u, e.to, e.dyn ? 'import()' : '']); }); });
    return { type: 'graph', label: label, directed: true, height: H, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }

  /* ================================================================
     TOPIC 2 - bundlers: webpack, Vite, esbuild
     ================================================================ */
  topics.push({
    title: 'Bundlers: webpack, Vite, esbuild & Code Splitting',
    analogy: `<p>Imagine moving house. You could carry 400 loose items one at a time (400 browser requests), or you can <b>pack boxes</b>: a bundler walks through your home starting at the front door (the <b>entry file</b>), follows every "this needs that" note (<code>import</code>), and packs everything into a few labelled boxes (<b>bundles / chunks</b>). Things you only need on a rare day (the attic's Christmas decorations) go in a separate box that you fetch later: that is <b>code splitting</b>.</p>`,
    explain: `<p>🟢 <b>Why do we need a bundler at all?</b> Browsers can load ES modules, but real projects hit four problems:</p>
      <ul><li><b>Bare imports</b>: <code>import React from 'react'</code> means nothing to a browser. Something must find <code>node_modules/react</code>.</li>
      <li><b>Not-plain-JS files</b>: JSX, TypeScript, CSS imports, SVGs and images need converting.</li>
      <li><b>Too many tiny files</b>: hundreds of requests are slower than a handful (less so with HTTP/2, but still).</li>
      <li><b>Size</b>: users should download minified, unused-code-free, cache-friendly files.</li></ul>
      <p>🔵 <b>What a bundler does, in order:</b></p>
      ${H.table(['Stage', 'Plain meaning'], [
        ['1. Resolve', 'Turn <code>"./utils"</code> or <code>"react"</code> into a real file path'],
        ['2. Load + transform', 'Read the file, run it through loaders/plugins (TS → JS, JSX → JS, CSS → string)'],
        ['3. Build the module graph', 'Parse imports and repeat for each new file: a directed graph'],
        ['4. Chunk', 'Split the graph into files: one main, extra ones at every <code>import()</code>, shared vendor code'],
        ['5. Optimize', 'Tree shake, minify, scope-hoist, add content hashes (<code>app.3fa9c1.js</code>)'],
        ['6. Emit', 'Write files to <code>dist/</code> plus an HTML file that links them and source maps']
      ])}
      <p><b>The big three today:</b></p>
      ${H.table(['Tool', 'Core idea', 'Strength', 'Watch out'], [
        ['<b>webpack</b>', 'Everything is a module; loaders + plugins; its own runtime', 'Most mature, huge plugin ecosystem, module federation', 'Config is long; dev builds slow on big apps'],
        ['<b>Vite</b>', 'Dev: serve native ES modules on demand (deps are pre-bundled). Build: Rolldown (Vite 8 and later; earlier versions used esbuild and Rollup)', 'Near-instant dev start and HMR, small config', 'Dev and prod use different engines (rare surprises)'],
        ['<b>esbuild</b>', 'Written in Go, extremely fast bundler + minifier', 'Speed (10-100x), great as a building block', 'Fewer plugins; limited code-splitting controls'],
        ['<b>Rollup / Rolldown / Rspack / Turbopack</b>', 'Rollup: library bundler with best tree shaking. Rolldown, Rspack, Turbopack: Rust rewrites', 'Speed with familiar APIs (Rspack mimics webpack)', 'Newer, check plugin support']
      ])}
      <p>🔵 <b>Code splitting</b> = shipping several files instead of one big one. The three ways: (1) <b>per route</b> with <code>import()</code> and <code>React.lazy</code>, (2) <b>per heavy feature</b> (chart library, editor, PDF viewer) loaded when clicked, (3) <b>vendor / shared chunks</b> so rarely changing library code stays cached across deploys.</p>`,
    clues: [
      '"the first page load is slow / bundle is 3 MB" → code splitting, tree shaking, analyse the bundle',
      '"dev server takes 60 seconds to start" → switch to Vite/esbuild (native ESM dev), or Rspack',
      '"what does <code>import()</code> do?" → dynamic import = a split point = a new chunk loaded on demand',
      '"cache users\' downloads across deploys" → content-hashed filenames + a separate vendor chunk',
      '"webpack loader vs plugin" → loader transforms one file at a time, plugin hooks into the whole build',
      '"HMR / hot reload" → dev server swaps only the changed module in the running page'
    ],
    code: [
      { lang: 'js', run: true, title: 'A toy bundler planner: crawl, chunk, order (runnable)', code: `// Each module lists what it imports. A leading "~" means a dynamic import() (a split point).
const graph = {
  main: ['react', 'utils', '~chart'],
  utils: ['math'],
  chart: ['d3', 'utils'],
  react: [], math: [], d3: []
};

function plan(graph, entry) {
  const owner = {};            // module -> chunk name that already contains it
  const chunks = [];
  const queue = [entry];       // every chunk starts at an entry or a dynamic import target
  const queued = new Set(queue);

  while (queue.length) {
    const start = queue.shift();
    const chunk = { name: chunks.length === 0 ? 'main.js' : start + '.chunk.js', order: [] };
    const visiting = new Set(), done = new Set();

    // Depth-first walk: a module is emitted AFTER its static dependencies (topological order).
    const walk = (mod) => {
      if (owner[mod] || done.has(mod)) return;   // already shipped in an earlier chunk
      if (visiting.has(mod)) {                    // cycle: a -> b -> a
        console.log('  warning: circular import involving', mod);
        return;
      }
      visiting.add(mod);
      for (const dep of graph[mod] || []) {
        if (dep.startsWith('~')) {                // split point: schedule a NEW chunk
          const target = dep.slice(1);
          if (!queued.has(target)) { queued.add(target); queue.push(target); }
        } else {
          walk(dep);
        }
      }
      visiting.delete(mod);
      done.add(mod);
      chunk.order.push(mod);
    };

    walk(start);
    if (chunk.order.length) {
      chunk.order.forEach((m) => { owner[m] = chunk.name; });
      chunks.push(chunk);
    }
  }
  return chunks;
}

for (const c of plan(graph, 'main')) console.log(c.name.padEnd(18), '->', c.order.join(' , '));
// "utils" is already in main.js, so chart.chunk.js reuses it instead of copying it.` },
      { lang: 'js', check: false, title: 'vite.config.js (typical)', code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],                    // JSX + React Fast Refresh
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  build: {
    sourcemap: true,                     // let the error tracker show original code
    rollupOptions: {
      output: {
        // keep rarely-changing libraries in their own long-cached file
        manualChunks: { vendor: ['react', 'react-dom'] }
      }
    }
  }
});` },
      { lang: 'js', check: false, title: 'webpack.config.js (the same idea, spelled out)', code: `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'production',                              // minify + tree shake
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',           // new name only when content changes
    clean: true
  },
  module: {
    rules: [
      { test: /\\.[jt]sx?$/, exclude: /node_modules/, use: 'babel-loader' },  // loader: per-file transform
      { test: /\\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  plugins: [new HtmlWebpackPlugin({ template: './index.html' })],  // plugin: whole-build job
  optimization: { splitChunks: { chunks: 'all' } },                // vendor / shared chunks
  devtool: 'source-map'
};` },
      { lang: 'bash', title: 'esbuild from the command line', code: `# bundle + minify + source map in a few milliseconds
npx esbuild src/index.tsx --bundle --minify --sourcemap --outdir=dist --target=es2020
# code splitting needs ESM output
npx esbuild src/index.tsx --bundle --splitting --format=esm --outdir=dist` }
    ],
    codeTitle: ['Bundler planner (runnable)', 'vite.config.js', 'webpack.config.js', 'esbuild'],
    viz: {
      title: 'Module graph → chunks',
      input: 'main>react,utils,~chart ; utils>math ; chart>d3,utils ; react> ; math> ; d3> ; oldPolyfill>',
      inputLabel: 'module>imports (~ = import())',
      gen: function (input) {
        var g = bundParse(input), chunks = bundPlan(g), H = 70, lay = bundLayout(g, H), frames = [], hl = {}, tags = {}, ehl = {};
        var palette = ['ok', 'win', 'sel', 'cur'];
        frames.push(F('This is the <b>module graph</b>: each box is a file, each arrow is an <code>import</code>. A dashed-looking label <code>import()</code> marks a lazy import. The bundler starts at the entry <b>' + g.entry + '</b>.',
          [bundGraphPart(g, lay, H, 'Imports', {}, {}, (function () { var t = {}; t[g.entry] = 'entry'; return t; })())]));
        chunks.forEach(function (ch, ci) {
          var cls = palette[ci % palette.length], got = [];
          frames.push(F('A new chunk begins at <b>' + ch.entry + '</b>' + (ci === 0 ? ' (the entry point)' : ' - it was reached through <code>import()</code>, so it becomes its own file <b>' + ch.name + '</b>.'),
            [bundGraphPart(g, lay, H, 'Imports', JSON.parse(JSON.stringify(hl)), ehl, tags), { type: 'set', label: ch.name + ' will contain', items: [] }]));
          ch.mods.forEach(function (mod) {
            got.push(mod); hl[mod] = cls; tags[mod] = ch.name.replace('.chunk.js', '').replace('.js', '');
            g.adj[mod].forEach(function (e) { if (e.dyn) ehl[mod + '-' + e.to] = 'sel'; });
            var nh = JSON.parse(JSON.stringify(hl)); nh[mod] = 'cur';
            frames.push(F('Visit <b>' + mod + '</b>: add it to <b>' + ch.name + '</b>. ' + (g.adj[mod].some(function (e) { return e.dyn; }) ? 'It has an <code>import()</code>, so that target is saved for a separate chunk. ' : '') + (g.adj[mod].length ? 'Then follow its static imports.' : 'No imports: this is a leaf.'),
              [bundGraphPart(g, lay, H, 'Imports', nh, ehl, tags), { type: 'set', label: ch.name + ' will contain', items: got.slice(), hl: (function () { var h = {}; h[mod] = 'cur'; return h; })() }]));
          });
          frames.push(F('<b>' + ch.name + '</b> is complete. Emit order puts every module <i>after</i> the things it imports: <code>' + esc(ch.order.join(' → ')) + '</code>.',
            [bundGraphPart(g, lay, H, 'Imports', JSON.parse(JSON.stringify(hl)), ehl, tags), { type: 'queue', label: 'Emit order inside ' + ch.name, items: ch.order.slice(), frontLabel: 'runs first', backLabel: 'runs last' }]));
        });
        var orphans = g.names.filter(function (n) { return !has(lay.depth, n); });
        orphans.forEach(function (n) { hl[n] = 'bad'; tags[n] = 'dead'; });
        frames.push(F(orphans.length ? '<span class="c-r">' + esc(orphans.join(', ')) + '</span> is not imported by anything reachable from the entry, so the bundler never even reads it: it is <b>left out</b>. This is the simplest kind of dead-code removal.' : 'Every module was reachable from the entry, so nothing is left out.',
          [bundGraphPart(g, lay, H, 'Final colouring: one colour per chunk', hl, ehl, tags)]));
        var rows = chunks.map(function (ch) { var kb = ch.mods.reduce(function (s, m) { return s + modKb(m); }, 0); return [ch.name, ch.order.join(' → '), kb + ' KB']; });
        frames.push(F('Result: <b>' + chunks.length + ' file(s)</b>. The browser downloads <b>' + chunks[0].name + '</b> first; the others (pretend sizes) are fetched only when the code actually calls <code>import()</code>.',
          [TB('Chunks', ['file', 'modules (dependencies first)', 'pretend size'], rows, { 0: 'ok' }), { type: 'bars', label: 'Pretend KB per chunk', values: chunks.map(function (ch) { return ch.mods.reduce(function (s, m) { return s + modKb(m); }, 0); }), idxLabels: chunks.map(function (ch) { return ch.name; }), hl: { 0: 'ok' } }]));
        return frames;
      }
    },
    examples: [
      {
        title: 'How "react" and "./utils" get resolved',
        html: `<p>Relative paths (<code>./utils</code>) are simple: look next to the current file and try extensions (<code>.js, .ts, .tsx, /index.js</code>). <b>Bare</b> names (<code>react</code>) trigger the <b>node resolution</b> walk: look in <code>./node_modules/react</code>, then <code>../node_modules/react</code>, and so on up to the root, then read that package's <code>package.json</code> (<code>exports</code> / <code>module</code> / <code>main</code> fields) to find the entry file. Aliases (<code>@/components/Button</code>) are extra rules you add in the bundler and in tsconfig <code>paths</code> so both tools agree.</p>`
      },
      {
        title: 'Lazy route: one import() saves the first load',
        html: `<p>Without splitting, the admin dashboard code (and its heavy chart library) is downloaded by every visitor, even those who never open it. With one line it becomes a separate chunk fetched on first visit to <code>/admin</code>:</p>`,
        code: { lang: 'js', check: false, code: `import { lazy, Suspense } from 'react';

// the bundler sees import() and cuts a new file: Admin.[hash].js
const Admin = lazy(() => import('./pages/Admin'));

export function App() {
  return (
    <Suspense fallback={<p>Loading admin…</p>}>
      <Admin />
    </Suspense>
  );
}` }
      },
      {
        title: 'Content hashes and long-term caching',
        html: `<p>If the file is called <code>app.js</code>, the browser cannot cache it for long: on deploy day you would not know whether the user has the old copy. If the name is <code>app.3fa9c1.js</code> (hash of the <i>content</i>), you can tell the browser "cache this for one year, <code>immutable</code>". A new deploy produces <code>app.b7210d.js</code>, a new URL, so no stale copy is possible. Only <code>index.html</code> (the tiny file that names the hashed files) is served with <code>no-cache</code>. This is why you keep <b>vendor code in its own chunk</b>: your daily edits change only <code>app.*.js</code>; <code>vendor.*.js</code> keeps its hash and stays cached.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Why Vite dev is fast:</b> there is <b>no bundling step in dev</b>. The browser requests <code>/src/main.tsx</code>; Vite transforms just that file (esbuild, ~1 ms) and answers. Each <code>import</code> in it triggers another request, so only the modules the current page needs are ever processed. Third-party packages (hundreds of tiny files, often CommonJS) are <b>pre-bundled once</b> by esbuild into single ES modules and cached. HMR works through the module graph: when a file changes, Vite finds the nearest "HMR boundary" (a module that accepts updates, like a React component via Fast Refresh) and swaps only that.</p>
      <p><b>webpack internals:</b> the output has a small <b>runtime</b> (a module registry and a chunk loader that creates <code>&lt;script&gt;</code> tags). Each module becomes a function in a map keyed by id; <code>__webpack_require__(id)</code> executes it once and caches exports. <code>splitChunks</code> applies size and shared-count heuristics to move common modules into shared chunks. <b>Module federation</b> extends this so separately built apps can share modules at runtime (covered under micro-frontends).</p>
      <p><b>Trade-offs and traps:</b> circular imports run but may see <code>undefined</code> exports; too many tiny chunks create request waterfalls (use <code>&lt;link rel="modulepreload"&gt;</code> or prefetch hints); splitting by every route can hurt when users navigate a lot. Measure with a bundle visualizer (<code>rollup-plugin-visualizer</code>, <code>webpack-bundle-analyzer</code>) and keep a <b>performance budget</b> in CI. Environment variables are <b>inlined at build time</b>: in Vite only names starting with <code>VITE_</code> are exposed, and anything exposed is public. Never put a secret in a frontend env var.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI is very good at writing a first <code>vite.config.js</code> or a webpack rule for an unusual file type, and at migrating a webpack config to Vite. Coding agents also run <code>vite build</code> themselves and read the error output to fix it.</p>
      <p><b>Work alongside it:</b> paste your build output sizes and ask <code>Which of these chunks look too big and what would you check first?</code> or <code>Explain this webpack stats warning in plain words</code>. Ask for <b>two</b> options (for example manualChunks vs dynamic import) and the trade-off of each.</p>
      <p><b>Where AI goes wrong:</b> it mixes webpack 4 and 5 options, invents plugin settings that do not exist, or splits so aggressively that you get a waterfall of requests. It rarely checks that the output actually got smaller. <b>You must still own:</b> opening the bundle visualizer, comparing sizes before and after, knowing what each chunk is for, and understanding caching headers well enough to review the config.</p>`,
    problems: [{
      title: 'Order the Modules: A Mini Bundler',
      level: 'Medium', tags: ['graph', 'topological sort', 'bundler'], companies: ['Meta', 'Vercel'],
      statement: `<p>You are given a map of module names to the modules they import (static imports only). Return the order in which a bundler must <b>emit</b> (or execute) modules starting from an entry point so that every module appears <b>after</b> everything it imports. Modules not reachable from the entry must be left out. If a circular import is found, <b>return the order anyway</b> but also report the cycle edge so the caller can warn the developer.</p>`,
      constraints: `1 ≤ modules ≤ 10<sup>4</sup>, total imports ≤ 5·10<sup>4</sup>. Names are unique strings. Recursion depth could reach 10<sup>4</sup>, so think about an iterative version for the follow-up.`,
      example: `<p>Input graph: <code>main→[app, utils]</code>, <code>app→[utils, math]</code>, <code>utils→[math]</code>, <code>math→[]</code>, <code>unused→[math]</code></p><p>Output order: ${H.c('g', 'math, utils, app, main')}. <code>unused</code> is unreachable from <code>main</code> so it is dropped. <code>math</code> comes first because everybody needs it.</p>`,
      brute: { why: `<p>Sorting by "number of imports" or by name is wrong: a module with 0 imports might still need to come late. Repeatedly scanning all modules for "one whose imports are all emitted" works but costs O(V·(V+E)) because every pass rescans the whole list.</p>`, code: `function orderBrute(graph, entry) {
  // find reachable set first (omitted for brevity in the naive version: use all modules)
  const emitted = [];
  const remaining = new Set(Object.keys(graph));
  while (remaining.size) {
    let progress = false;
    for (const m of remaining) {
      // emit m only when every import was already emitted: rescans everything each time
      if ((graph[m] || []).every((d) => emitted.includes(d))) {
        emitted.push(m); remaining.delete(m); progress = true;
      }
    }
    if (!progress) break; // a cycle: nothing can move
  }
  return emitted; // also includes unreachable modules, which is wrong
}` },
      mcq: { q: 'Which traversal gives "dependencies before dependents" in one pass?', options: ['Depth-first search, pushing a module AFTER visiting its imports (post-order)', 'Breadth-first search printing modules as they are discovered', 'Sorting module names alphabetically', 'Depth-first search, pushing a module BEFORE visiting its imports (pre-order)'], answer: 0, explain: 'Post-order DFS finishes a module only after all of its imports are finished, which is exactly the order a bundler needs. Pre-order would put a module before its dependencies.' },
      hints: [`<p>Hint 1: This is a <b>topological sort</b> of a directed graph where an edge goes from a module to what it imports.</p>`, `<p>Hint 2: Run DFS from the entry only (this automatically drops unreachable modules). Add a module to the output list <b>after</b> its children are done. Use three states: unseen, in-progress, done.</p>`, `<p>Hint 3: If DFS meets a module that is <b>in-progress</b>, you found a cycle (a back edge). Record it and skip, do not loop forever. Recipe: <code>visit(m)</code>: if done return; if in-progress record cycle and return; mark in-progress; visit each import; mark done; push m.</p>`],
      solution: {
        approach: `<p>Depth-first search from the entry with three colours (0 unseen, 1 in progress, 2 done). The output is the post-order. A visit that reaches an in-progress node reports a cycle edge but does not recurse, so the algorithm always terminates.</p>`,
        code: { lang: 'js', run: true, code: `function emitOrder(graph, entry) {
  const state = {};          // undefined = unseen, 1 = in progress, 2 = done
  const order = [];
  const cycles = [];

  function visit(mod) {
    if (state[mod] === 2) return;                 // already emitted
    if (state[mod] === 1) return;                 // in progress: handled by the caller
    state[mod] = 1;
    for (const dep of graph[mod] || []) {
      if (state[dep] === 1) cycles.push(mod + ' -> ' + dep);  // back edge = circular import
      else visit(dep);
    }
    state[mod] = 2;
    order.push(mod);                              // post-order: AFTER all imports
  }

  visit(entry);
  return { order, cycles };
}

const graph = { main: ['app', 'utils'], app: ['utils', 'math'], utils: ['math'], math: [], unused: ['math'] };
console.log(emitOrder(graph, 'main'));
const cyc = { a: ['b'], b: ['c'], c: ['a'] };
console.log(emitOrder(cyc, 'a'));` },
        dry: { head: ['visit', 'state change', 'order so far'], rows: [['main', 'main in progress', '[]'], ['app', 'app in progress', '[]'], ['utils', 'in progress', '[]'], ['math', 'done', '[math]'], ['utils', 'done', '[math, utils]'], ['app', 'done (math already done)', '[math, utils, app]'], ['main', 'done', '[math, utils, app, main]']] },
        complexity: `<p>Time O(V + E) for the reachable part, space O(V) for the state map and recursion stack.</p>`,
        followUps: ['Make it iterative to survive 10<sup>5</sup>-deep import chains', 'Group the order into chunks when some edges are dynamic <code>import()</code>']
      }
    }]
  });

  /* ---------- tree-shaking model (ES5) ---------- */
  function shakeParse(input) {
    var parts = String(input).split(';');
    if (parts.length !== 2) throw new Error('Format: exports ; uses:...  Example: math.add math.mul>math.add util.debounce ; uses: math.mul');
    var deps = {}, ids = [];
    words(parts[0]).forEach(function (tok) {
      var m = tok.match(/^([\w$]+\.[\w$]+)(?:>(.+))?$/);
      if (!m) throw new Error('Each export looks like module.name or module.name>module.other (got "' + tok + '")');
      if (!has(deps, m[1])) { deps[m[1]] = []; ids.push(m[1]); }
      if (m[2]) m[2].split(',').forEach(function (d) { deps[m[1]].push(d); });
    });
    var uses = words(parts[1].replace(/^\s*uses\s*:/i, ''));
    if (ids.length < 2 || ids.length > 14) throw new Error('Use between 2 and 14 exports');
    uses.forEach(function (u) { if (!has(deps, u)) throw new Error('"' + u + '" is used but not exported'); });
    ids.forEach(function (id) { deps[id].forEach(function (d) { if (!has(deps, d)) throw new Error('"' + id + '" depends on unknown "' + d + '"'); }); });
    return { deps: deps, ids: ids, uses: uses };
  }
  function expKb(id) { return 1 + (id.length * 3) % 6; }
  function shakeSets(s, hl) {
    var mods = {}, order = [];
    s.ids.forEach(function (id) { var m = id.split('.')[0]; if (!mods[m]) { mods[m] = []; order.push(m); } mods[m].push(id); });
    return order.map(function (m) { return { type: 'set', label: 'module "' + m + '" exports', items: mods[m], hl: hl }; });
  }

  /* ================================================================
     TOPIC 3 - transpiling, polyfills, tree shaking
     ================================================================ */
  topics.push({
    title: 'Transpiling, Polyfills & Tree Shaking',
    analogy: `<p><b>Transpiling</b> is a <b>translator</b>: you wrote a letter in modern slang, but the reader only knows older formal language, so the translator rewrites each sentence (same meaning, older words). A <b>polyfill</b> is a <b>missing tool lent to the reader</b>: if the reader lacks a stapler, you ship a stapler. <b>Tree shaking</b> is <b>shaking an apple tree</b>: ripe apples (code you actually use) stay on the branch, dead leaves and rotten fruit (unused exports) fall off and are not packed in the box.</p>`,
    explain: `<p>🟢 <b>Transpiling</b> rewrites <i>syntax</i> that older browsers cannot parse into syntax they can. <b>Polyfilling</b> adds missing <i>runtime features</i> (new functions, like <code>Array.prototype.at</code> or <code>Promise.allSettled</code>). Both are driven by a list of the browsers you support.</p>
      ${H.table(['Question', 'Syntax (transpile)', 'API (polyfill)'], [
        ['Example', '<code>a?.b ?? 1</code>, <code>class A { #x }</code>, JSX, TypeScript types', '<code>Array.prototype.at</code>, <code>structuredClone</code>, <code>fetch</code>'],
        ['If the browser lacks it', 'A <b>SyntaxError</b>: the whole file will not run', 'A <b>TypeError</b> only when that line runs'],
        ['Fix', 'Rewrite the code at build time (Babel, SWC, esbuild, tsc)', 'Ship a copy of the function (core-js) or load it only if missing'],
        ['Controlled by', 'Your <code>browserslist</code> targets', 'Same targets + the usage of each feature']
      ])}
      <p>🔵 <b>The tools:</b> <b>Babel</b> (the original, plugin-based, JavaScript), <b>SWC</b> (Rust, used by Next.js), <b>esbuild</b> (Go, used by Vite). <b>TypeScript</b> itself only <i>removes types</i> and lowers syntax; most modern setups let esbuild/SWC strip the types (fast) and run <code>tsc --noEmit</code> separately for checking. <b>browserslist</b> (in <code>package.json</code>) is the shared "who do we support?" list: <code>"&gt; 0.5%, last 2 versions, not dead"</code>. The smaller the list, the less code you ship.</p>
      <p>🔵 <b>Tree shaking</b> = removing <b>exports nobody imports</b>, found by analysing the module graph. It works because ES module <code>import</code>/<code>export</code> are <b>static</b>: the names are visible without running the code. CommonJS <code>require()</code> is a function call that can take any string, so a bundler cannot prove what is unused.</p>
      ${H.table(['Style', 'Can be shaken?', 'Why'], [
        ['<code>import { debounce } from "lodash-es"</code>', H.c('g', 'Yes'), 'Static named import of an ES module'],
        ['<code>import _ from "lodash"</code> (CommonJS)', H.c('r', 'No'), 'The bundler must keep the whole object'],
        ['<code>import * as utils from "./utils"</code>', H.c('y', 'Mostly'), 'Fine if you only use <code>utils.a</code> statically'],
        ['<code>const m = require(name)</code>', H.c('r', 'No'), 'Name decided at runtime']
      ])}
      <p>🔵 <b>Side effects:</b> a file that does something just by being imported (<code>import './polyfill'</code>, registers a global, patches a prototype, imports CSS) must be kept even if no export is used. Library authors tell the bundler "I have none" with <code>"sideEffects": false</code> in <code>package.json</code>, or list the files that do (<code>["*.css"]</code>). Without that hint, <b>barrel files</b> (<code>index.js</code> that re-exports 100 components) stop shaking from working well.</p>`,
    clues: [
      '"the bundle contains the whole library though I use one function" → CommonJS import, barrel file, or missing <code>sideEffects</code>',
      '"why does tree shaking need ES modules?" → static <code>import/export</code> can be analysed without running code',
      '"app crashes on an older Safari with a syntax error" → target list too new, or a dependency was not transpiled',
      '"transpile vs polyfill" → syntax is rewritten at build time; APIs are added at runtime',
      '"dead code elimination vs tree shaking" → the minifier removes unreachable statements; tree shaking removes unused exports across files',
      '"import cost / package size review" → check bundlephobia, <code>import</code> analyser, prefer <code>lodash-es</code> or per-function imports'
    ],
    code: [
      { lang: 'js', run: true, title: 'A used-exports analyser: what survives tree shaking? (runnable)', code: `// Each module lists its exports; an export may "use" other exports (its dependencies).
// "pure" modules can be dropped completely if nothing is used. Others are kept (side effects).
const modules = {
  math:  { sideEffects: false, exports: { add: [], sub: [], mul: ['add'], div: ['mul'] } },
  util:  { sideEffects: false, exports: { debounce: [], throttle: [] } },
  ui:    { sideEffects: false, exports: { Button: [], Modal: ['Button'], Tooltip: [] } },
  setup: { sideEffects: true,  exports: { init: [] } }      // e.g. patches window: must stay
};
// What the app code actually imports (the entry point's import list)
const imports = ['math.mul', 'util.debounce', 'ui.Modal'];

function shake(modules, imports) {
  const keep = new Set();
  const stack = imports.slice();
  while (stack.length) {                       // mark: follow usage edges
    const id = stack.pop();
    if (keep.has(id)) continue;
    keep.add(id);
    const [m, name] = id.split('.');
    for (const dep of modules[m].exports[name]) stack.push(m + '.' + dep);
  }
  const removed = [];
  for (const [m, mod] of Object.entries(modules)) {
    for (const name of Object.keys(mod.exports)) {
      const id = m + '.' + name;
      const wholeFileKept = mod.sideEffects;   // side-effect files are kept in full
      if (!keep.has(id) && !wholeFileKept) removed.push(id);   // sweep
    }
  }
  return { kept: [...keep].sort(), removed };
}

const r = shake(modules, imports);
console.log('kept   :', r.kept.join(', '));
console.log('removed:', r.removed.join(', '));
// note: math.div is removed even though it uses math.mul - using is one-directional.` },
      { lang: 'json', title: 'Where the browser targets and sideEffects live (package.json excerpt)', code: `{
  "name": "ui-kit",
  "version": "2.3.0",
  "type": "module",
  "sideEffects": ["*.css"],
  "module": "./dist/index.js",
  "exports": {
    ".": { "import": "./dist/index.js", "require": "./dist/index.cjs" }
  },
  "browserslist": ["> 0.5%", "last 2 versions", "not dead"]
}` },
      { lang: 'json', title: '.babelrc (what preset-env does)', code: `{
  "presets": [
    ["@babel/preset-env", { "useBuiltIns": "usage", "corejs": 3, "modules": false }],
    ["@babel/preset-react", { "runtime": "automatic" }],
    "@babel/preset-typescript"
  ]
}` },
      { lang: 'js', title: 'Before: modern source', code: `const user = { profile: { name: 'Asha' } };
class Counter { #count = 0; inc = () => ++this.#count; }
const city = user.profile?.address?.city ?? 'unknown';
const last = [1, 2, 3].at(-1);
console.log(city, last, new Counter().inc());` },
      { lang: 'js', title: 'After: roughly what an old target gets', code: `var _a, _b;
var user = { profile: { name: 'Asha' } };
var Counter = (function () {
  var _count = new WeakMap();
  function Counter() {
    var self = this;
    _count.set(this, 0);
    this.inc = function () { var v = _count.get(self) + 1; _count.set(self, v); return v; };
  }
  return Counter;
})();
var city = (_b = (_a = user.profile) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.city;
if (city === null || city === void 0) city = 'unknown';
// Array.prototype.at is an API: needs a polyfill, not a rewrite
var last = [1, 2, 3].at(-1);
console.log(city, last, new Counter().inc());` }
    ],
    codeTitle: ['Used-exports analyser', 'package.json excerpt', '.babelrc', 'Modern source', 'Transpiled output'],
    viz: [
      {
        title: 'Tree shaking: mark what is used, shake off the rest',
        input: 'math.add math.sub math.mul>math.add math.div>math.mul util.debounce util.throttle ui.Button ui.Modal>ui.Button ui.Tooltip ; uses: math.mul util.debounce ui.Modal',
        inputLabel: 'exports (a>b = a uses b) ; uses: what the app imports',
        gen: function (input) {
          var s = shakeParse(input), frames = [], keep = {}, hl = {}, stack = [], order = [];
          function sets() { return shakeSets(s, JSON.parse(JSON.stringify(hl))); }
          frames.push(F('The libraries together export <b>' + s.ids.length + '</b> functions. The app imports only <b>' + s.uses.length + '</b> of them: <code>' + esc(s.uses.join(', ')) + '</code>. The bundler must decide which of the other exports are safe to throw away.', sets()));
          s.uses.forEach(function (u) { stack.push(u); });
          while (stack.length) {
            var id = stack.shift();
            if (keep[id]) continue;
            keep[id] = true; order.push(id);
            var h2 = JSON.parse(JSON.stringify(hl)); h2[id] = 'cur';
            var dep = s.deps[id];
            frames.push(F('Mark <b>' + id + '</b> as used (' + (s.uses.indexOf(id) >= 0 ? 'the app imports it directly' : 'another kept export calls it') + ').' + (dep.length ? ' It calls <b>' + esc(dep.join(', ')) + '</b>, so those are needed too.' : ' It calls nothing else.'),
              shakeSets(s, h2)));
            hl[id] = 'ok';
            dep.forEach(function (d) { stack.push(d); });
          }
          var removed = s.ids.filter(function (id) { return !keep[id]; });
          removed.forEach(function (id) { hl[id] = 'bad'; });
          frames.push(F(removed.length ? 'Sweep: <span class="c-r">' + esc(removed.join(', ')) + '</span> are never reached from any import, so they are <b>shaken off</b> and will not be in the bundle.' : 'Everything is used, so nothing can be removed. (Try adding an export nobody imports.)', sets()));
          var before = s.ids.reduce(function (a, id) { return a + expKb(id); }, 0), after = order.reduce(function (a, id) { return a + expKb(id); }, 0);
          frames.push(F('Pretend sizes: <b>' + before + ' KB</b> if you ship every export, <b>' + after + ' KB</b> after tree shaking. Savings: <b class="c-g">' + (before - after) + ' KB</b>.',
            [{ type: 'bars', label: 'Pretend KB', values: [before, after], idxLabels: ['everything', 'after shaking'], hl: { 0: 'bad', 1: 'ok' } }].concat(sets())));
          return frames;
        }
      },
      {
        title: 'Why some imports cannot be shaken',
        input: 'cjs',
        inputLabel: 'style: esm | cjs | barrel',
        gen: function (input) {
          var kind = String(input).trim().toLowerCase();
          if (['esm', 'cjs', 'barrel'].indexOf(kind) < 0) throw new Error('Type esm, cjs or barrel');
          if (kind === 'esm') return [
            F('You write <code>import { debounce } from "lodash-es"</code>. The library is published as ES modules: every function is its own export.', [TB('Import style', ['code', 'module format', 'static?'], [['import { debounce } from "lodash-es"', 'ESM', 'yes']], { 0: 'ok' })]),
            F('The bundler reads the import <b>without running anything</b> and sees the name <code>debounce</code>.', [{ type: 'set', label: 'names imported', items: ['debounce'], hl: { debounce: 'ok' } }]),
            F('It marks <code>debounce</code> and what it calls as used. The other ~300 lodash functions are unreachable.', [{ type: 'set', label: 'lodash-es exports', items: ['debounce', 'map', 'filter', 'chunk', 'zip', '…300 more'], hl: { debounce: 'ok', map: 'bad', filter: 'bad', chunk: 'bad', zip: 'bad', '…300 more': 'bad' } }]),
            F('Result: only a few KB reach the browser instead of the full ~70 KB.', [{ type: 'bars', label: 'KB shipped', values: [70, 3], idxLabels: ['whole lodash', 'debounce only'], hl: { 0: 'bad', 1: 'ok' } }])
          ];
          if (kind === 'cjs') return [
            F('You write <code>import _ from "lodash"</code>. The classic lodash package is CommonJS: one big object assigned to <code>module.exports</code>.', [TB('Import style', ['code', 'module format', 'static?'], [['import _ from "lodash"', 'CommonJS', 'no']], { 0: 'bad' })]),
            F('CommonJS exports are built by <b>running code</b>: <code>module.exports = lodash</code>. The bundler cannot tell which properties you will read later (<code>_[name]</code> could use any).', [{ type: 'text', html: '<code>const key = pick(); _[key](x)</code> &larr; name chosen at runtime' }]),
            F('Safe choice for the bundler: <b>keep everything</b>. No export can be proven unused.', [{ type: 'set', label: 'lodash exports', items: ['debounce', 'map', 'filter', 'chunk', 'zip', '…300 more'], hl: { debounce: 'cur', map: 'cur', filter: 'cur', chunk: 'cur', zip: 'cur', '…300 more': 'cur' } }]),
            F('Result: you ship the whole library to use one function. The fix is <code>lodash-es</code>, or <code>import debounce from "lodash/debounce"</code>.', [{ type: 'bars', label: 'KB shipped', values: [70, 70], idxLabels: ['expected', 'actual'], hl: { 0: 'ok', 1: 'bad' } }])
          ];
          return [
            F('A UI kit has <code>index.js</code> that re-exports 40 components. You write <code>import { Button } from "ui-kit"</code>. This is a <b>barrel file</b>.', [TB('Files', ['file', 'role'], [['index.js', 'barrel: export * from each component'], ['Button.js', 'wanted'], ['Chart.js', 'huge, not wanted'], ['Editor.js', 'huge, not wanted']], { 1: 'ok', 2: 'bad', 3: 'bad' })]),
            F('To keep only <code>Button</code> the bundler still has to <b>load and parse</b> every file that the barrel re-exports, because importing a file may run code (a side effect).', [{ type: 'text', html: 'Could <code>Chart.js</code> register a global or inject CSS when loaded? The bundler cannot know.' }]),
            F('Without a hint it plays safe and <span class="c-r">keeps the side-effect-capable files</span>. Bundle: 480 KB for one button.', [{ type: 'bars', label: 'KB shipped (no hint)', values: [480], idxLabels: ['ui-kit'], hl: { 0: 'bad' } }]),
            F('The library author adds <code>"sideEffects": false</code> to package.json. Now the bundler may drop any re-exported file whose exports are unused.', [{ type: 'map', label: 'package.json', entries: [['sideEffects', 'false']], hl: { sideEffects: 'ok' } }]),
            F('Result: only <code>Button.js</code> remains (12 KB). Also consider importing from the file path directly while debugging a size problem.', [{ type: 'bars', label: 'KB shipped', values: [480, 12], idxLabels: ['no hint', 'sideEffects:false'], hl: { 0: 'bad', 1: 'ok' } }])
          ];
        }
      }
    ],
    examples: [
      {
        title: 'Transpile vs polyfill on one line',
        html: `<p><code>const last = list.at(-1) ?? 'none';</code> contains <b>two</b> different problems for an old browser. <code>??</code> is new <b>syntax</b>: an old parser throws a <b>SyntaxError</b> for the entire file, so a transpiler must rewrite it into an <code>if</code>/ternary. <code>.at()</code> is a new <b>method</b>: an old runtime has the syntax <code>list.at(...)</code> but throws <b>TypeError: list.at is not a function</b> when it executes, so a <b>polyfill</b> must add <code>Array.prototype.at</code>. Babel's <code>useBuiltIns: "usage"</code> adds only the polyfills your code appears to use.</p>`
      },
      {
        title: 'Tracing one import by hand',
        html: `<p>The app has <code>import { mul } from './math'</code>. In <code>math.js</code>: <code>export const add = ...</code>, <code>export const sub = ...</code>, <code>export const mul = (a,b) =&gt; repeat(b, add, a)</code>. The bundler marks <b>mul</b> used. Reading mul's body it sees a call to <b>add</b>, so add stays. <b>sub</b> is never referenced anywhere, so it is dropped. Notice the rule: <i>used</i> flows from the importer to what the used code calls, never backwards.</p>`
      },
      {
        title: 'Why side effects keep dead-looking code alive',
        html: `<p>Consider <code>import './analytics';</code> with no names. The import list is empty, yet <code>analytics.js</code> may call <code>window.track = ...</code> when loaded. A bundler must keep it. Now consider a library file <code>Button.js</code> that also contains <code>document.title = "x"</code> at top level. If its package says <code>"sideEffects": false</code> that line is a lie, and when no export of Button is used, the bundler may remove the whole file including that assignment. Rule of thumb: <b>top-level code should only define things, not do things</b>.</p>`,
        code: { lang: 'js', code: `// BAD for tree shaking: runs at import time
window.analytics = createTracker();
export const track = (e) => window.analytics.send(e);

// GOOD: nothing runs until someone calls it
export function createAnalytics() {
  return createTracker();
}` }
      }
    ],
    deepDive: `<p>🟣 <b>Algorithm:</b> modern bundlers (Rollup, esbuild, webpack's <code>usedExports</code> + <code>concatenateModules</code>) do a <b>mark and sweep</b> over the module graph: start from entry-point exports, mark every binding referenced by kept code, drop unmarked declarations. Rollup goes statement-by-statement ("treeshake" is fine-grained); webpack marks unused exports with a magic comment and lets the minifier (Terser, SWC, esbuild) physically delete them. That is why tree shaking only fully works in <b>production mode</b>.</p>
      <p><b>Purity annotations:</b> a call like <code>createStore(...)</code> at the top level might have side effects, so even if the variable is unused the bundler must keep the call. Tools therefore recognise <code>/*#__PURE__*/ createStore(...)</code>, or <code>@__PURE__</code>, as "safe to drop if unused". Compilers (Babel, TypeScript) emit these for classes and helper calls. <b>Scope hoisting</b> (module concatenation) puts modules in one function scope, shrinking wrapper overhead and giving the minifier more to work with.</p>
      <p><b>Real-world traps:</b> TypeScript <code>enum</code> and decorated classes compile to code that looks side-effecting; <code>export default { a, b }</code> (an object) hides which members are used, so prefer named exports; <code>import * as ns</code> plus dynamic access (<code>ns[name]</code>) defeats shaking; transpiling dependencies to CommonJS before bundling (<code>modules: "commonjs"</code> in Babel) destroys the static structure, so use <code>modules: false</code> and let the bundler handle modules. For differential serving, ship modern syntax to <code>&lt;script type="module"&gt;</code> browsers (all evergreen browsers), and only produce a legacy bundle if your analytics prove you need it.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI can read a bundle analyser report and tell you "this 140 KB chunk is moment.js with all locales", and it can rewrite <code>import _ from 'lodash'</code> across a codebase into precise imports in minutes. It is also useful for converting a CommonJS library to ESM or writing the <code>exports</code> map.</p>
      <p><b>Work alongside it:</b> give it the analyser output and ask <code>Rank the top five wins by saved KB and by effort</code>. Ask <code>Why would this import not be tree-shaken?</code> with the actual import lines pasted in. Ask it to generate a tiny reproduction so you can verify.</p>
      <p><b>Where it goes wrong:</b> it may claim a library "is tree-shakeable" from memory of an older version; it may add <code>sideEffects: false</code> to a package that really has CSS imports, which silently removes your styles in production; it may recommend polyfilling everything "to be safe", bloating the bundle. <b>You must still own:</b> measuring (build, then analyse), testing the production build in a real browser, and knowing the difference between a syntax problem and an API problem.</p>`,
    problems: [{
      title: 'What Does Tree Shaking Remove?',
      level: 'Medium', tags: ['tree shaking', 'graph', 'bundler'], companies: ['Google', 'Shopify'],
      statement: `<p>Given several modules and the exports each module has, and for each export the list of other exports it uses, plus the list of exports that the application imports, return the exports that tree shaking <b>removes</b>. A module marked <code>sideEffects: true</code> is kept completely (none of its exports are removed). Output removed exports sorted alphabetically as <code>module.name</code>.</p>`,
      constraints: `Up to 200 modules, up to 2000 exports in total, up to 5000 usage edges. Usage graphs can contain cycles (a uses b, b uses a). Every used name exists.`,
      example: `<p>math exports: <code>add</code>, <code>sub</code>, <code>mul → add</code>. App imports <code>math.mul</code>.</p>${H.arr(['add', 'sub', 'mul'], { hl: { 0: 'g', 1: 'r', 2: 'g' }, label: 'math (green = kept)' })}<p>Output: ${H.c('r', 'math.sub')}. mul is imported; add is kept because mul uses it; sub is never reached.</p>`,
      brute: { why: `<p>Repeatedly scanning every export to see whether "anything kept uses it" until nothing changes is O(E·(V+E)): each round rescans everything. With cycles you must also avoid counting a self-supporting loop as "used".</p>`, code: `function removedBrute(modules, imports) {
  const keep = new Set(imports);
  let changed = true;
  while (changed) {                      // repeat until stable
    changed = false;
    for (const [m, mod] of Object.entries(modules)) {
      for (const [name, uses] of Object.entries(mod.exports)) {
        if (!keep.has(m + '.' + name)) continue;
        for (const u of uses) {          // rescan EVERYTHING each round
          const id = m + '.' + u;
          if (!keep.has(id)) { keep.add(id); changed = true; }
        }
      }
    }
  }
  const out = [];
  for (const [m, mod] of Object.entries(modules))
    for (const name of Object.keys(mod.exports))
      if (!keep.has(m + '.' + name) && !mod.sideEffects) out.push(m + '.' + name);
  return out.sort();
}` },
      mcq: { q: 'Export <code>div</code> uses <code>mul</code>, and the app imports only <code>mul</code>. What happens to <code>div</code>?', options: ['Removed: usage flows from the importer to what it uses, not backwards', 'Kept: it is related to mul', 'Kept because it is in the same file', 'Removed only if it is last in the file'], answer: 0, explain: 'Nothing reachable from an import refers to div, so it is unused. "div uses mul" keeps mul alive only when div itself is alive.' },
      hints: [`<p>Hint 1: This is a <b>reachability</b> problem: start from the imported names and follow "uses" edges. Everything reached is kept; the rest is removed.</p>`, `<p>Hint 2: Use a stack (or queue) of ids and a <code>Set</code> of kept ids. Skip ids already kept - this also makes cycles safe.</p>`, `<p>Hint 3: Do not forget modules with <code>sideEffects: true</code>: none of their exports may be reported. Recipe: mark (DFS from imports) then sweep (list every export not in the kept set, excluding side-effect modules), then sort.</p>`],
      solution: {
        approach: `<p>Mark and sweep. Mark: iterative DFS from the imported ids following usage edges, with a visited set. Sweep: walk all exports, report those not marked and not in a side-effect module.</p>`,
        code: { lang: 'js', run: true, code: `function removedExports(modules, imports) {
  const kept = new Set();
  const stack = [...imports];
  while (stack.length) {
    const id = stack.pop();
    if (kept.has(id)) continue;            // visited: also stops cycles
    kept.add(id);
    const dot = id.indexOf('.');
    const mod = id.slice(0, dot), name = id.slice(dot + 1);
    for (const u of modules[mod].exports[name]) stack.push(mod + '.' + u);
  }
  const removed = [];
  for (const [mod, info] of Object.entries(modules)) {
    if (info.sideEffects) continue;        // kept entirely
    for (const name of Object.keys(info.exports)) {
      if (!kept.has(mod + '.' + name)) removed.push(mod + '.' + name);
    }
  }
  return removed.sort();
}

const modules = {
  math: { sideEffects: false, exports: { add: [], sub: [], mul: ['add'], div: ['mul'] } },
  util: { sideEffects: false, exports: { a: ['b'], b: ['a'], c: [] } },   // a and b form a cycle
  boot: { sideEffects: true, exports: { init: [] } }
};
console.log(removedExports(modules, ['math.mul', 'util.a']));
// [ 'math.div', 'math.sub', 'util.c' ]` },
        dry: { head: ['pop', 'kept after', 'new pushes'], rows: [['util.a', '{util.a}', 'util.b'], ['util.b', '{util.a, util.b}', 'util.a (already kept)'], ['math.mul', '{.., math.mul}', 'math.add'], ['math.add', '{.., math.add}', 'none']] },
        complexity: `<p>Time O(V + E), space O(V). Each export is marked once.</p>`,
        followUps: ['Report the saved bytes if each export has a size', 'Handle <code>export * from</code> re-exports as extra edges']
      }
    }]
  });

  /* ---------- props type-checker model for the TypeScript visualizer ---------- */
  var BTN_SCHEMA = {
    label: { line: 2, type: 'string', req: true },
    onClick: { line: 3, type: 'function', req: true },
    size: { line: 4, type: 'sm | md | lg', req: false, oneOf: ['sm', 'md', 'lg'] },
    disabled: { line: 5, type: 'boolean', req: false }
  };
  function kindOf(v) {
    if (v === undefined) return 'boolean';
    if (v === 'fn') return 'function';
    if (v === 'true' || v === 'false') return 'boolean';
    if (/^-?\d+(\.\d+)?$/.test(v)) return 'number';
    return 'string';
  }
  var BTN_CODE = 'interface ButtonProps {\n  label: string;\n  onClick: () => void;\n  size?: \'sm\' | \'md\' | \'lg\';\n  disabled?: boolean;\n}\n\n<Button ... />';

  /* ================================================================
     TOPIC 4 - TypeScript in the frontend
     ================================================================ */
  topics.push({
    title: 'TypeScript in the Frontend: Props, Generics & Config',
    analogy: `<p>TypeScript is a <b>spell-checker and grammar-checker for your code</b>, plus <b>labels on every drawer</b>. A drawer labelled "socks" will not accept a hammer: you find out while tidying (writing code), not when you are already late and need socks (users are clicking). The labels exist only in your head and in your editor: when the code is "printed" (compiled to JavaScript) all the labels are peeled off. The browser never sees them.</p>`,
    explain: `<p>🟢 <b>TypeScript (TS) = JavaScript + types.</b> You describe the <i>shape</i> of data (a string, a number, an object with these fields). The compiler checks that every use matches the shape. Mistakes like <code>user.nmae</code> or passing a string where a number is expected are caught <b>before</b> the code runs. At build time the types are <b>erased</b>; what ships is plain JavaScript.</p>
      <p>🔵 <b>The 8 type tools you will use every day in React code:</b></p>
      ${H.table(['Tool', 'Example', 'Use'], [
        ['Primitive types', '<code>string</code>, <code>number</code>, <code>boolean</code>', 'Basic values'],
        ['Object type / interface', '<code>interface User { id: number; name: string }</code>', 'Props, API responses'],
        ['Optional field', '<code>size?: "sm" | "lg"</code>', 'May be left out'],
        ['Union', '<code>"loading" | "ok" | "error"</code>', 'One of several values'],
        ['Literal type', '<code>"sm"</code> (only that exact string)', 'Fixed choices, no typos'],
        ['Function type', '<code>(id: number) =&gt; void</code>', 'Callbacks like onClick'],
        ['Generic', '<code>Array&lt;T&gt;</code>, <code>useState&lt;User | null&gt;</code>', 'Reusable over many types'],
        ['Utility types', '<code>Partial&lt;T&gt;</code>, <code>Pick&lt;T,K&gt;</code>, <code>Omit&lt;T,K&gt;</code>', 'Make new types from old ones']
      ])}
      <p>🔵 <b>Typing a React component</b> means typing its <b>props</b>. The pattern: write an <code>interface XProps</code>, make the component function accept it, destructure inside. Event handlers have named types: <code>React.ChangeEvent&lt;HTMLInputElement&gt;</code>, <code>React.MouseEvent</code>. State: <code>useState&lt;User | null&gt;(null)</code> (the generic is needed because <code>null</code> alone tells TS nothing about the later value). Children: <code>children: React.ReactNode</code>. Wrapping a native element? Reuse its props: <code>React.ComponentProps&lt;"button"&gt;</code>.</p>
      <p>🔵 <b>Build setup:</b> two jobs that are <b>separate</b>. (1) <b>Type-check</b> with <code>tsc --noEmit</code> (slow-ish, run in CI and in the editor). (2) <b>Strip types</b> inside the bundler (esbuild/SWC/Babel: very fast, does <i>not</i> check). A failing type error does not break <code>vite dev</code>, so CI must run the checker, or you merge broken types.</p>
      <p><b>The tsconfig flags that matter:</b> <code>"strict": true</code> (turn it on: it enables null checks and no implicit <code>any</code>), <code>"jsx": "react-jsx"</code>, <code>"moduleResolution": "bundler"</code>, <code>"noEmit": true</code>, <code>"isolatedModules": true</code> (each file must be compilable on its own, which esbuild needs), <code>"skipLibCheck": true</code>, and <code>"paths"</code> for aliases.</p>`,
    clues: [
      '"type this component\'s props" → interface + optional fields + union of literals + callback type',
      '"any vs unknown" → <code>any</code> turns checking off; <code>unknown</code> forces you to narrow first',
      '"the types say it is fine but the API sent null" → types are erased at runtime; validate at the boundary (zod / type guards)',
      '"generic component: Select, Table, List of anything" → <code>function Select&lt;T&gt;(props: SelectProps&lt;T&gt;)</code>',
      '"state can be loading, error or success" → discriminated union, narrow with <code>status</code>',
      '"Vite built fine but CI fails on types" → bundlers strip types without checking; run <code>tsc --noEmit</code>'
    ],
    code: [
      { lang: 'ts', title: 'Typing a React component (Button.tsx)', code: `import type { ReactNode } from 'react';

// One interface = the "contract" of the component.
interface ButtonProps {
  label: string;                         // required text
  onClick: () => void;                   // required callback, returns nothing
  size?: 'sm' | 'md' | 'lg';             // optional, only these three strings
  disabled?: boolean;
  icon?: ReactNode;                      // anything React can render
}

export function Button({ label, onClick, size = 'md', disabled = false, icon }: ButtonProps) {
  return (
    <button className={'btn btn-' + size} onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </button>
  );
}

// <Button label="Save" onClick={save} size="xl" />   // error: "xl" is not assignable to 'sm' | 'md' | 'lg'
// <Button label="Save" />                             // error: property 'onClick' is missing` },
      { lang: 'ts', title: 'Generics: a reusable Select and a typed hook', code: `import { useState } from 'react';

interface SelectProps<T> {
  options: T[];
  value: T | null;
  getLabel: (item: T) => string;          // how to show one option
  getKey: (item: T) => string | number;
  onChange: (item: T) => void;            // gets the SAME T back, no casting
}

export function Select<T>({ options, value, getLabel, getKey, onChange }: SelectProps<T>) {
  return (
    <select
      value={value ? String(getKey(value)) : ''}
      onChange={(e) => {
        const picked = options.find((o) => String(getKey(o)) === e.target.value);
        if (picked) onChange(picked);
      }}
    >
      {options.map((o) => (
        <option key={getKey(o)} value={String(getKey(o))}>{getLabel(o)}</option>
      ))}
    </select>
  );
}

// A generic custom hook: T is decided by the caller
export function useToggleList<T>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const add = (item: T) => setItems((prev) => [...prev, item]);
  return { items, add } as const;
}` },
      { lang: 'ts', title: 'Discriminated union for async state', code: `type Fetch<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

function render(state: Fetch<string[]>): string {
  switch (state.status) {
    case 'loading':
      return 'Spinner';
    case 'error':
      return 'Oops: ' + state.message;          // TS knows .message exists here
    case 'success':
      return state.data.join(', ');             // and .data exists here
    default: {
      const _never: never = state;              // compile error if a new status is added and not handled
      return _never;
    }
  }
}` },
      { lang: 'json', title: 'tsconfig.json for a Vite + React app', code: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}` },
      { lang: 'js', run: true, title: 'Types vanish at runtime: validate the boundary (runnable)', code: `// TypeScript can say "this is a User", but JSON from the network is just data.
// This is what a runtime check (what zod does for you) looks like.
function isUser(x) {
  return typeof x === 'object' && x !== null &&
    typeof x.id === 'number' && typeof x.name === 'string';
}
function parseUser(json) {
  const data = JSON.parse(json);               // type: unknown / any
  if (!isUser(data)) throw new Error('Server sent a bad user: ' + json);
  return data;                                 // now it is safe to trust
}
console.log(parseUser('{"id":1,"name":"Asha"}'));
try { parseUser('{"id":"1","name":"Asha"}'); } catch (e) { console.log(e.message); }` }
    ],
    codeTitle: ['Button.tsx', 'Generics', 'Discriminated union', 'tsconfig.json', 'Runtime validation'],
    viz: [
      {
        title: 'The compiler checks a component\'s props',
        input: 'label=Save size=xl disabled=yes',
        inputLabel: 'props you pass (key=value, fn = a function, bare key = true)',
        gen: function (input) {
          var toks = words(input);
          if (!toks.length || toks.length > 8) throw new Error('Give 1 to 8 props, e.g. label=Save onClick=fn size=md disabled');
          var given = {}, order = [];
          toks.forEach(function (t) { var k = t.split('=')[0], v = t.indexOf('=') >= 0 ? t.slice(t.indexOf('=') + 1) : undefined; given[k] = v; order.push(k); });
          var rows = [], hl = {}, errors = 0, frames = [];
          frames.push(F('The component says what it accepts: <code>ButtonProps</code>. Now we use it as <code>&lt;Button ' + esc(toks.join(' ')) + ' /&gt;</code> and the compiler checks every prop against the contract.',
            [{ type: 'code', label: 'ButtonProps', lang: 'ts', code: BTN_CODE, hl: {} }]));
          order.forEach(function (k) {
            var sp = BTN_SCHEMA[k], v = given[k], got = kindOf(v), verdict, cls, line;
            if (!sp) { verdict = 'Error: property "' + k + '" does not exist on ButtonProps'; cls = 'bad'; line = 1; }
            else if (sp.oneOf) {
              if (got === 'string' && sp.oneOf.indexOf(v) >= 0) { verdict = 'ok'; cls = 'ok'; }
              else { verdict = 'Error: "' + (v === undefined ? 'true' : v) + '" is not assignable to ' + sp.type; cls = 'bad'; }
              line = sp.line;
            } else if (got === sp.type) { verdict = 'ok'; cls = 'ok'; line = sp.line; }
            else { verdict = 'Error: ' + got + ' is not assignable to ' + sp.type; cls = 'bad'; line = sp.line; }
            if (cls === 'bad') errors++;
            rows.push([k, sp ? sp.type : '(none)', v === undefined ? 'true (boolean)' : v + ' (' + got + ')', verdict]);
            hl[rows.length - 1] = cls;
            var ch = {}; ch[line] = cls;
            frames.push(F('Prop <b>' + esc(k) + '</b>: expected <code>' + esc(sp ? sp.type : 'nothing') + '</code>, got <code>' + esc(v === undefined ? 'true' : v) + '</code> → ' + (cls === 'ok' ? '<span class="c-g">accepted</span>.' : '<span class="c-r">compile error</span>. ' + esc(verdict)),
              [{ type: 'code', label: 'ButtonProps', lang: 'ts', code: BTN_CODE, hl: ch }, TB('Checked props', ['prop', 'expected', 'got', 'result'], rows.slice(), JSON.parse(JSON.stringify(hl)))]));
          });
          var missing = Object.keys(BTN_SCHEMA).filter(function (k) { return BTN_SCHEMA[k].req && !has(given, k); });
          var mh = {};
          missing.forEach(function (k) { mh[BTN_SCHEMA[k].line] = 'bad'; errors++; rows.push([k, BTN_SCHEMA[k].type, '(not passed)', 'Error: property "' + k + '" is missing']); hl[rows.length - 1] = 'bad'; });
          frames.push(F(missing.length ? 'Required props that were <span class="c-r">never passed</span>: <b>' + esc(missing.join(', ')) + '</b>. Without a <code>?</code> in the interface, leaving them out is an error.' : 'All required props (<code>label</code>, <code>onClick</code>) were passed.',
            [{ type: 'code', label: 'ButtonProps', lang: 'ts', code: BTN_CODE, hl: mh }, TB('Checked props', ['prop', 'expected', 'got', 'result'], rows.slice(), JSON.parse(JSON.stringify(hl)))]));
          frames.push(F(errors ? '<span class="c-r">tsc reports ' + errors + ' error(s).</span> Vite would still run the page (it only strips types), so a CI step with <code>tsc --noEmit</code> is what stops this merge.' : '<span class="c-g">tsc reports 0 errors.</span> The types are now erased and plain JavaScript ships.',
            [{ type: 'vars', vals: { errors: errors, 'tsc exit code': errors ? 1 : 0 }, hl: { errors: errors ? 'bad' : 'ok' } }, TB('Checked props', ['prop', 'expected', 'got', 'result'], rows, hl)]));
          return frames;
        }
      },
      {
        title: 'Narrowing a discriminated union',
        input: 'success',
        inputLabel: 'runtime status: loading | error | success',
        gen: function (input) {
          var st = String(input).trim();
          if (['loading', 'error', 'success'].indexOf(st) < 0) throw new Error('Type loading, error or success');
          var code = 'type Fetch =\n  | { status: "loading" }\n  | { status: "error"; message: string }\n  | { status: "success"; data: string[] };\n\nfunction render(s: Fetch) {\n  if (s.status === "loading") return "Spinner";\n  if (s.status === "error") return s.message;\n  return s.data.join(", ");\n}';
          var typeAt = { 7: 'Fetch (all three)', 8: '{status:"error"; message:string}', 9: '{status:"success"; data:string[]}' };
          var frames = [
            F('<code>Fetch</code> is a union of three shapes. The shared field <code>status</code> is the <b>tag</b> (the discriminant). At the top of <code>render</code>, TypeScript only knows <code>s</code> is <i>one of the three</i>.', [{ type: 'code', label: 'Union', lang: 'ts', code: code, hl: { 1: 'cur', 2: 'cur', 3: 'cur', 4: 'cur' } }, { type: 'vars', vals: { 's': 'Fetch (any of 3)' } }]),
            F('Line 7: <code>s.status === "loading"</code>. Inside this branch TS <b>narrows</b> <code>s</code> to <code>{status:"loading"}</code>. Writing <code>s.message</code> here would be a compile error.', [{ type: 'code', label: 'Union', lang: 'ts', code: code, hl: { 7: st === 'loading' ? 'ok' : 'cur' } }, { type: 'vars', vals: { 's here': '{ status: "loading" }' }, hl: { 's here': 'sel' } }]),
            F('Line 8: after the first <code>if</code> returned, <code>loading</code> is ruled out. With <code>status === "error"</code> TS narrows to the error shape, so <code>s.message</code> is allowed and is a <code>string</code>.', [{ type: 'code', label: 'Union', lang: 'ts', code: code, hl: { 8: st === 'error' ? 'ok' : 'cur' } }, { type: 'vars', vals: { 's here': typeAt[8] }, hl: { 's here': 'sel' } }]),
            F('Line 9: both other cases are gone, so what is left can only be the success shape: <code>s.data</code> exists. Add a fourth status later and TS can force you to handle it (the <code>never</code> trick).', [{ type: 'code', label: 'Union', lang: 'ts', code: code, hl: { 9: st === 'success' ? 'ok' : 'cur' } }, { type: 'vars', vals: { 's here': typeAt[9] }, hl: { 's here': 'sel' } }]),
            F('At runtime your value is <b>status = "' + st + '"</b>, so the branch on line ' + (st === 'loading' ? 7 : st === 'error' ? 8 : 9) + ' runs. The types vanished long ago; only the <code>if</code> checks remain in the shipped JavaScript.', [{ type: 'code', label: 'Union', lang: 'ts', code: code, hl: (function () { var h = {}; h[st === 'loading' ? 7 : st === 'error' ? 8 : 9] = 'ok'; return h; })() }])
          ];
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Typing events and state in a form',
        html: `<p>Common beginner pain: "what is the type of <code>e</code>?" Hover in your editor, or use the pattern <code>React.ChangeEvent&lt;HTMLInputElement&gt;</code>. For state that starts empty, give <code>useState</code> a generic so later values fit.</p>`,
        code: { lang: 'ts', code: `import { useState } from 'react';

interface User { id: number; name: string }

export function SearchBox() {
  const [query, setQuery] = useState('');                    // inferred: string
  const [picked, setPicked] = useState<User | null>(null);   // needs the generic: null alone is useless
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);
  const onPick = (u: User) => setPicked(u);
  return (
    <div>
      <input value={query} onChange={onChange} />
      <button onClick={() => onPick({ id: 1, name: query })}>Pick</button>
      {picked && <p>{picked.name}</p>}
    </div>
  );
}` }
      },
      {
        title: 'unknown vs any: the safe door and the open door',
        html: `<p><code>any</code> says "stop checking this". <code>unknown</code> says "I do not know what it is yet, prove it first". Data from <code>JSON.parse</code>, <code>fetch().json()</code> and <code>catch (e)</code> is best treated as <code>unknown</code>. You narrow with <code>typeof</code>, <code>in</code>, <code>instanceof</code> or a validator, then TypeScript lets you use it.</p>`,
        code: { lang: 'ts', code: `function describe(x: unknown): string {
  if (typeof x === 'string') return 'text of length ' + x.length;   // narrowed to string
  if (typeof x === 'number') return 'number ' + x.toFixed(1);       // narrowed to number
  if (Array.isArray(x)) return 'list of ' + x.length;
  return 'something else';
}
// with "any" you could write x.toFixed(1) on a string and only find out in production` }
      },
      {
        title: 'Utility types: build new types from old ones',
        html: `<p>You have one big <code>User</code> type and many views of it. Instead of copying fields (they will drift apart), derive them:</p>`,
        code: { lang: 'ts', code: `interface User { id: number; name: string; email: string; role: 'admin' | 'user' }

type UserCard = Pick<User, 'id' | 'name'>;            // only these two fields
type NewUser = Omit<User, 'id'>;                      // everything except id (the server creates it)
type UserPatch = Partial<User>;                       // every field optional (for PATCH requests)
type Roles = User['role'];                            // 'admin' | 'user' (indexed access)
const defaultUser = { id: 0, name: '', email: '', role: 'user' } satisfies User;   // checked, but keeps exact literal types` }
      }
    ],
    deepDive: `<p>🟣 <b>Structural typing.</b> TypeScript compares <i>shapes</i>, not names: any object with <code>id: number</code> and <code>name: string</code> is a <code>User</code>. That is why you can pass a bigger object where a smaller type is expected (but a fresh object literal gets an "excess property" check to catch typos). <b>Inference</b> does most of the work: you rarely annotate local variables; annotate function parameters, exported functions and component props.</p>
      <p><b>Why erasing types matters:</b> <code>enum</code>, <code>namespace</code> and parameter properties generate runtime code, which esbuild/SWC in <code>isolatedModules</code> mode cannot always handle (const enums across files). Prefer string-literal unions or <code>as const</code> objects. Use <code>import type { X }</code> (or <code>verbatimModuleSyntax</code>) so type-only imports vanish and do not create accidental runtime imports or circular dependencies.</p>
      <p><b>Typing server data:</b> generate types from the source of truth (OpenAPI → <code>openapi-typescript</code>, GraphQL → codegen, tRPC for end-to-end inference) rather than hand-writing them. Because types are erased, pair them with runtime validation at trust boundaries (zod, valibot) and let the validator <i>produce</i> the type (<code>z.infer</code>). <b>Performance:</b> huge unions, deeply recursive conditional types and big monorepos slow <code>tsc</code>; use project references, <code>incremental</code>, and keep type-level cleverness proportional to its value. <b>Migration strategy:</b> turn on <code>allowJs</code> + <code>checkJs</code> per file, add <code>strict</code> gradually (<code>strictNullChecks</code> first), and use <code>// @ts-expect-error</code> (which fails when the error disappears) rather than <code>@ts-ignore</code>. TypeScript 5.x can also be run directly by newer Node versions that strip types, but the browser still needs JavaScript, so your bundler step remains.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI writes TypeScript fluently, infers interfaces from sample JSON, and converts JS files to TS in bulk. The type checker has become the AI's <b>safety net</b>: an agent that edits code and runs <code>tsc --noEmit</code> catches many of its own mistakes. Strong types also make AI suggestions better, because the editor feeds the signatures into the prompt.</p>
      <p><b>Work alongside it:</b> paste an API response and ask <code>Write the TypeScript interface and a zod schema; mark fields that can be null</code>. Ask <code>Why does TS say Type 'string | undefined' is not assignable to 'string'?</code> and have it explain the narrowing needed instead of just patching it.</p>
      <p><b>Where it goes wrong:</b> to make errors disappear it reaches for <code>any</code>, <code>as unknown as X</code>, or <code>// @ts-ignore</code>. Those silence the checker without fixing the problem. It also invents props that a library does not have and over-engineers conditional types. <b>You must still own:</b> a strict config, a zero-<code>any</code> policy on code review, understanding what a cast promises (nothing is verified), and validating untrusted data at runtime.</p>`,
    problems: [{
      title: 'Type a React Prop Interface (Generic Select)',
      level: 'Medium', tags: ['typescript', 'react', 'generics'], companies: ['Microsoft', 'Airbnb'],
      lang: 'ts',
      statement: `<p>You are building a reusable <code>&lt;Select&gt;</code> dropdown. It receives a list of <code>options</code> of <b>any</b> type <code>T</code>, the currently chosen <code>value</code> (or <code>null</code>), a function <code>getLabel</code> that turns one option into display text, an optional <code>placeholder</code> text, an optional <code>disabled</code> flag and an <code>onChange</code> callback that receives the <b>chosen option with the same type T</b> (not a string). Write the props interface and the component signature so that <code>&lt;Select options={users} onChange={(u) =&gt; u.name} .../&gt;</code> type-checks and <code>onChange={(u) =&gt; u.nope}</code> does not.</p>`,
      constraints: `Do not use <code>any</code>. Optional props must be marked optional. The same <code>T</code> must flow through options, value, getLabel and onChange.`,
      example: `<p>With <code>options: User[]</code> where <code>User = {id:number; name:string}</code>:</p><p>${H.c('g', '&lt;Select options={users} value={null} getLabel={(u) =&gt; u.name} onChange={(u) =&gt; save(u.id)} /&gt;')} compiles: <code>u</code> is a User.</p><p>${H.c('r', 'onChange={(u) =&gt; u.nope}')} is an error: <code>nope</code> does not exist on User. That is the whole point of the generic.</p>`,
      brute: { why: `<p>Typing everything as <code>any</code> (or <code>unknown[]</code>) compiles but throws away safety: <code>onChange</code> receives <code>any</code> so <code>u.nope</code> compiles and crashes in the browser. Using <code>string</code> for the callback forces every caller to look the object up again.</p>`, code: { lang: 'ts', code: `interface SelectPropsBad {
  options: any[];                    // no link between options and the callback
  value: any;
  getLabel: (item: any) => string;
  onChange: (item: any) => void;     // u.nope compiles. Boom at runtime.
  placeholder?: string;
  disabled?: boolean;
}` } },
      mcq: { q: 'Why make the component generic (<code>Select&lt;T&gt;</code>) instead of using <code>any</code>?', options: ['So T links options, value and the onChange argument, and mistakes are compile errors', 'Generics make the component faster at runtime', 'Generics are required for every React component', 'Because interfaces cannot have optional fields otherwise'], answer: 0, explain: 'A generic is a type placeholder. The caller\'s options decide T, and the same T is used in every place it appears. There is no runtime cost: types are erased.' },
      hints: [`<p>Hint 1: Put the type parameter on the interface: <code>interface SelectProps&lt;T&gt;</code>. Every place that talks about "one option" uses <code>T</code>.</p>`, `<p>Hint 2: <code>value</code> is "an option or nothing" → <code>T | null</code>. <code>getLabel</code> is a function from T to string. <code>onChange</code> is a function taking T.</p>`, `<p>Hint 3: Optional props use <code>?</code>. The component is a function declaration <code>function Select&lt;T&gt;(props: SelectProps&lt;T&gt;)</code> (not an arrow function, to avoid TSX parsing ambiguity). Recipe: interface with T, function with T, use the callbacks inside.</p>`],
      solution: {
        approach: `<p>Declare a generic props interface <code>SelectProps&lt;T&gt;</code>, then a generic function component. TypeScript infers <code>T</code> from the <code>options</code> array at each call site and checks the other props against it.</p>`,
        code: { lang: 'ts', code: `import type { ReactElement } from 'react';

interface SelectProps<T> {
  options: T[];                          // the list, any element type
  value: T | null;                       // chosen option or nothing chosen yet
  getLabel: (option: T) => string;       // how to show one option
  onChange: (option: T) => void;         // receives the real object, not a string
  placeholder?: string;                  // optional
  disabled?: boolean;                    // optional
}

export function Select<T>({ options, value, getLabel, onChange, placeholder = 'Choose…', disabled = false }: SelectProps<T>): ReactElement {
  const selectedIndex = value === null ? -1 : options.indexOf(value);
  return (
    <select
      disabled={disabled}
      value={selectedIndex}
      onChange={(e) => {
        const i = Number(e.target.value);
        if (i >= 0) onChange(options[i] as T);   // index lookup keeps the original object (same T)
      }}
    >
      <option value={-1}>{placeholder}</option>
      {options.map((o, i) => (
        <option key={i} value={i}>{getLabel(o)}</option>
      ))}
    </select>
  );
}

// usage: T is inferred as User
// <Select options={users} value={picked} getLabel={(u) => u.name} onChange={(u) => setPicked(u)} />` },
        complexity: `<p>Compile time only. The runtime cost is the same as the untyped component: O(n) to render n options.</p>`,
        followUps: ['Require a <code>getKey</code> so React keys are stable instead of using the index', 'Allow <code>multiple</code> selection with a discriminated union of props']
      }
    }]
  });

  /* ================================================================
     TOPIC 5 - linting & formatting
     ================================================================ */
  topics.push({
    title: 'Linting & Formatting: ESLint, Prettier, Git Hooks',
    analogy: `<p>Writing code with a team is like writing a school newspaper. <b>Prettier</b> is the <b>layout editor</b>: it decides fonts, margins and line breaks so nobody argues about them. <b>ESLint</b> is the <b>fact-checker and proofreader</b>: it spots real problems (a variable that is never used, a missing <code>await</code>, a hook called in a loop). A <b>pre-commit hook</b> is the <b>door guard</b> at the printing room: only pages that passed both checks get through.</p>`,
    explain: `<p>🟢 Two different jobs that people often mix up:</p>
      ${H.table(['', 'Prettier (formatter)', 'ESLint (linter)'], [
        ['Question it answers', '"How should this code <i>look</i>?"', '"Is this code <i>correct and safe</i>?"'],
        ['Examples', 'Quotes, semicolons, indentation, line width, trailing commas', 'Unused variables, <code>==</code> instead of <code>===</code>, missing hook dependencies, no <code>alt</code> on images'],
        ['Customisable?', 'Very few options on purpose', 'Hundreds of rules, each off / warn / error'],
        ['Can auto-fix?', 'Always (it rewrites the file)', 'Only some rules (<code>--fix</code>)'],
        ['Runs on', 'Any file: JS, TS, CSS, JSON, Markdown…', 'JavaScript / TypeScript (plugins add more)']
      ])}
      <p>🔵 <b>ESLint basics.</b> You turn on rule sets: <code>js.configs.recommended</code> (bug-catchers), <code>typescript-eslint</code> (type-aware rules), <code>eslint-plugin-react-hooks</code> (the rules of hooks and exhaustive dependencies), <code>eslint-plugin-jsx-a11y</code> (accessibility). Each rule has a severity: <code>"off"</code>, <code>"warn"</code> (shown, does not fail) or <code>"error"</code> (fails the run). Since ESLint 9 the config is a <b>flat config</b> file, <code>eslint.config.js</code>: an array of objects, later ones override earlier ones.</p>
      <p>🔵 <b>Making them friends.</b> If both tools care about the same thing (say, quotes) they fight. Fix: let Prettier own formatting and turn the conflicting ESLint rules off (<code>eslint-config-prettier</code>). Faster all-in-one alternatives exist: <b>Biome</b> (lint + format, Rust) and <b>oxlint</b>. <b>EditorConfig</b> keeps the editor\'s basics (indent, newline) aligned. <b>Stylelint</b> does the ESLint job for CSS.</p>
      <p>🔵 <b>Where they run</b> (three gates, from fastest to safest):</p>
      <ol><li><b>In the editor</b> on save: instant feedback, not enforced.</li>
      <li><b>Pre-commit hook</b> (husky + lint-staged): runs only on the <i>staged</i> files, so it stays fast. Can be skipped with <code>--no-verify</code>.</li>
      <li><b>CI</b>: runs on the whole project for every pull request. This is the one that cannot be skipped.</li></ol>`,
    clues: [
      '"enforce a consistent code style across the team" → Prettier + editor save action + CI check (<code>prettier --check</code>)',
      '"catch bugs before runtime / stale closure in useEffect" → ESLint with <code>react-hooks/exhaustive-deps</code>',
      '"lint and prettier conflict" → <code>eslint-config-prettier</code>, or let one tool do each job',
      '"pre-commit is too slow" → lint-staged (only changed files), cache, a faster tool (Biome / oxlint)',
      '"a developer bypassed the hook" → the real gate is CI, hooks are only convenience',
      '"introduce lint rules to a legacy codebase" → set new rules to <code>warn</code>, fix by folder, ratchet to <code>error</code>; use <code>--max-warnings</code>'
    ],
    code: [
      { lang: 'js', check: false, title: 'eslint.config.js (flat config, ESLint 9)', code: `import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',        // hooks only at the top level of a component
      'react-hooks/exhaustive-deps': 'warn',        // effect depends on everything it reads
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  prettier                                             // LAST: switches off rules that clash with Prettier
);` },
      { lang: 'json', title: '.prettierrc and lint-staged config (package.json excerpt)', code: `{
  "prettier": {
    "singleQuote": true,
    "semi": true,
    "printWidth": 100,
    "trailingComma": "all"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix --max-warnings=0"],
    "*.{css,md,json}": ["prettier --write"]
  },
  "scripts": {
    "lint": "eslint . --max-warnings=0",
    "format:check": "prettier --check .",
    "prepare": "husky"
  }
}` },
      { lang: 'bash', title: 'Hook script: .husky/pre-commit', code: `# runs automatically on "git commit"; a non-zero exit blocks the commit
npx lint-staged
npx tsc --noEmit` },
      { lang: 'js', run: true, title: 'A mini linter with auto-fix: how rules really work (runnable)', code: `// A rule = a name + a check(line) that returns a message (or null) + an optional fix(line).
const rules = [
  { name: 'no-var', check: (l) => /\\bvar\\s/.test(l) && 'Unexpected var, use let or const', fix: (l) => l.replace(/\\bvar\\s/, 'let ') },
  { name: 'eqeqeq', check: (l) => /[^=!]==[^=]/.test(l) && 'Expected === instead of ==', fix: (l) => l.replace(/([^=!])==([^=])/, '$1===$2') },
  { name: 'no-console', check: (l) => /console\\.log\\(/.test(l) && 'Unexpected console.log', fix: null },
  { name: 'no-trailing-spaces', check: (l) => /\\s+$/.test(l) && 'Trailing spaces', fix: (l) => l.replace(/\\s+$/, '') }
];

function lint(source, { fix = false } = {}) {
  const problems = [];
  const out = source.split('\\n').map((line, i) => {
    let current = line;
    for (const r of rules) {
      const msg = r.check(current);
      if (!msg) continue;
      if (fix && r.fix) current = r.fix(current);      // fixable rules rewrite the line
      else problems.push({ line: i + 1, rule: r.name, msg });
    }
    return current;
  });
  return { problems, output: out.join('\\n') };
}

const src = 'var total = 0;  \\nif (total == 0) console.log("empty");\\nconst ok = 1;';
console.log('--- lint only ---');
lint(src).problems.forEach((p) => console.log(p.line + ':' + p.rule + ' - ' + p.msg));
console.log('--- after --fix ---');
const fixed = lint(src, { fix: true });
console.log(fixed.output);
console.log('left for a human:', fixed.problems.map((p) => p.rule).join(', ') || 'nothing');` }
    ],
    codeTitle: ['eslint.config.js', 'Prettier + lint-staged', 'Husky hook', 'Mini linter'],
    viz: {
      title: 'Pre-commit gate: format, lint, then commit',
      input: 'Button.tsx api.ts~ cart.tsx!lint styles.css~ utils.js',
      inputLabel: 'staged files (~ = needs formatting, !lint = real lint error)',
      gen: function (input) {
        var toks = words(input);
        if (toks.length < 2 || toks.length > 8) throw new Error('Give 2 to 8 files, e.g. a.js b.ts~ c.tsx!lint');
        var files = toks.map(function (t) {
          var bad = /!lint$/.test(t), fmt = /~$/.test(t);
          return { name: t.replace(/!lint$/, '').replace(/~$/, ''), bad: bad, fmt: fmt };
        });
        var frames = [], rows = [], hl = {}, blocked = false, i;
        frames.push(F('You run <code>git commit</code>. The pre-commit hook asks lint-staged to run only on the <b>' + files.length + ' staged files</b>: first <b>prettier --write</b> (fix the look), then <b>eslint --fix</b> (fix what can be fixed, report the rest).',
          [{ type: 'queue', label: 'Staged files waiting', items: files.map(function (f) { return f.name; }), hl: { 0: 'cur' }, frontLabel: 'next', backLabel: 'last' }]));
        for (i = 0; i < files.length; i++) {
          var f = files[i], rest = files.slice(i + 1).map(function (x) { return x.name; });
          frames.push(F('<b>' + esc(f.name) + '</b>: Prettier ' + (f.fmt ? '<span class="c-y">found messy formatting and rewrote the file</span> (spaces, quotes, commas).' : 'finds nothing to change.') + ' Then ESLint ' + (f.bad ? '<span class="c-r">finds an error that <code>--fix</code> cannot repair</span> (for example a missing await or an unused import that has side effects).' : 'is happy (any simple issues were auto-fixed).'),
            [{ type: 'queue', label: 'Still waiting', items: [f.name].concat(rest), hl: { 0: f.bad ? 'bad' : 'cur' }, frontLabel: 'working on', backLabel: 'last' }, TB('Results so far', ['file', 'prettier', 'eslint', 'verdict'], rows.concat([[f.name, f.fmt ? 'rewrote' : 'clean', f.bad ? 'ERROR' : 'clean', f.bad ? 'blocks commit' : 'pass']]), (function () { var h = JSON.parse(JSON.stringify(hl)); h[rows.length] = f.bad ? 'bad' : 'ok'; return h; })())]));
          rows.push([f.name, f.fmt ? 'rewrote' : 'clean', f.bad ? 'ERROR' : 'clean', f.bad ? 'blocks commit' : 'pass']);
          hl[rows.length - 1] = f.bad ? 'bad' : 'ok';
          if (f.bad) blocked = true;
        }
        frames.push(F(blocked ? '<span class="c-r">Commit blocked.</span> The hook exits with a non-zero code, git stops, and you see the ESLint message. Fix the file, <code>git add</code> it, and commit again. (Prettier\'s rewrites were already saved in your working copy.)' : '<span class="c-g">All checks passed.</span> The hook exits with code 0 and git creates the commit with already-formatted code, so reviewers never see style noise.',
          [{ type: 'vars', vals: { 'exit code': blocked ? 1 : 0, commit: blocked ? 'blocked' : 'created' }, hl: { commit: blocked ? 'bad' : 'ok', 'exit code': blocked ? 'bad' : 'ok' } }, TB('Final results', ['file', 'prettier', 'eslint', 'verdict'], rows, hl)]));
        frames.push(F('Remember: <code>git commit --no-verify</code> skips the hook. That is why the <b>same checks run again in CI</b> on the whole project: the hook is a convenience, CI is the guarantee.',
          [{ type: 'text', html: '<b>Three gates:</b> editor on save → pre-commit hook (staged files) → <b>CI on every pull request</b> (cannot be skipped).' }]));
        return frames;
      }
    },
    examples: [
      {
        title: 'The same bug, three tools',
        html: `<p>Consider <code>if (user.age == "18") { var msg = 'adult' }</code>. <b>Prettier</b> only fixes spacing and quotes. <b>ESLint</b> reports <code>eqeqeq</code> (loose equality converts types, so <code>18 == "18"</code> is true) and <code>no-var</code>. <b>TypeScript</b> would flag comparing a <code>number</code> to a <code>string</code>. Each tool catches a <i>different</i> layer, which is why teams run all three.</p>`
      },
      {
        title: 'react-hooks/exhaustive-deps catches a stale closure',
        html: `<p>The rule reads your <code>useEffect</code> and warns when the effect uses a variable that is missing from the dependency array. Without the fix the effect keeps using the <b>old</b> value of <code>query</code> forever.</p>`,
        code: { lang: 'js', check: false, code: `useEffect(() => {
  fetch('/api/search?q=' + query).then(setResults);
}, []);   // warning: React Hook useEffect has a missing dependency: 'query'

// fixed:
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/search?q=' + query, { signal: controller.signal }).then((r) => r.json()).then(setResults);
  return () => controller.abort();
}, [query]);` }
      },
      {
        title: 'Rolling out a new rule on a legacy codebase',
        html: `<p>You turn on <code>no-explicit-any</code> and get <b>1,412 errors</b>. Do not make the team fix them in one pull request. Plan: (1) set the rule to <code>"warn"</code> so nothing breaks, (2) commit a "baseline" or use flat-config <code>files</code> overrides so <b>new</b> folders are <code>error</code> while old folders stay <code>warn</code>, (3) fix folder by folder, (4) when the warning count hits zero, change the rule to <code>"error"</code> and add <code>--max-warnings=0</code> in CI so it can never creep back.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How ESLint works inside.</b> It parses code into an <b>AST</b> (abstract syntax tree: a tree of nodes like <code>CallExpression</code>, <code>VariableDeclaration</code>). A rule is an object with a visitor: <code>create(context) { return { CallExpression(node) { … context.report({ node, message }) } } }</code>. ESLint walks the tree once and calls every rule\'s handlers, so adding rules is cheap. A fix is a function returning text edits, which ESLint applies and then <b>re-lints repeatedly</b> (up to 10 passes) because one fix can enable another. Type-aware rules (<code>no-floating-promises</code>) need the TypeScript program and are noticeably slower; run them in CI, or only on changed files locally.</p>
      <p><b>Prettier internals:</b> it parses to an AST, throws away your original whitespace, and re-prints from scratch with a layout algorithm (Wadler-style "fits on one line? else break"). That is why it is deterministic: the output depends on the AST and the width, not on how you typed it. It deliberately keeps a few things (blank lines, object first-key line break) as a nod to author intent.</p>
      <p><b>Production practices:</b> commit the config and pin versions so everyone formats identically; use <code>.git-blame-ignore-revs</code> so the one-time "reformat everything" commit does not ruin <code>git blame</code>; cache ESLint (<code>--cache</code>) in CI; split slow type-aware linting into its own job; use <code>--max-warnings=0</code>; keep suppressions explainable (<code>// eslint-disable-next-line rule -- reason</code>) and ban blanket <code>/* eslint-disable */</code>. Custom rules can encode your design system ("use &lt;Button&gt; not &lt;button&gt;") and are one of the highest-value uses of the AST API.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI generates a lot of code fast, which makes automatic guardrails <b>more</b> important, not less. Linters, formatters and type-checkers are the cheap, deterministic judges that tell an AI agent "that is wrong" with an exact line number. Agents can run <code>npm run lint -- --fix</code> in a loop until it is clean. AI can also write custom ESLint rules and codemods, or explain a confusing rule.</p>
      <p><b>Work alongside it:</b> keep one command (<code>npm run check</code> = lint + types + tests) and tell your coding agent to run it before it says "done". Ask <code>Explain why this lint rule exists and show a bad and a good example</code> instead of blindly disabling it.</p>
      <p><b>Where it goes wrong:</b> to turn the red lines green it may add <code>eslint-disable</code> comments, delete a failing rule from the config, or add an unnecessary dependency to <code>useEffect</code> that causes an infinite loop. <b>You must still own:</b> reviewing config changes in a pull request as carefully as code, treating suppressions as red flags, and keeping CI as the single source of truth.</p>`,
    problems: [{
      title: 'Build a Mini Linter (no-var, eqeqeq, no-console)',
      level: 'Easy', tags: ['eslint', 'regex', 'strings'], companies: ['Atlassian', 'Stripe'],
      statement: `<p>Write <code>lint(source)</code> that takes JavaScript source text and returns an array of problems <code>{ line, rule, message }</code> sorted by line number. Implement three rules: <b>no-var</b> (the word <code>var</code> followed by a space at the start of a statement), <b>eqeqeq</b> (<code>==</code> or <code>!=</code> used instead of <code>===</code>/<code>!==</code>) and <b>no-console</b> (any <code>console.log(</code> call). Lines are numbered from 1. A line can break several rules; report each separately.</p>`,
      constraints: `Source up to 10<sup>4</sup> lines. Simple line-by-line checking is enough (you do not need a real parser for this exercise). Ignore comment-only lines that start with <code>//</code>.`,
      example: `<p>Source:</p><pre>var a = 1;\nif (a == 1) console.log("x");\n// var ignored</pre><p>Output: ${H.c('r', 'line 1 no-var')}, ${H.c('r', 'line 2 eqeqeq')}, ${H.c('r', 'line 2 no-console')}. Line 3 is a comment, skipped.</p>`,
      brute: { why: `<p>Running one big regex over the whole file and returning only the first match loses line numbers and misses multiple problems per line. Checking by <code>includes("var")</code> also flags words like <code>variable</code>.</p>`, code: `function lintBrute(source) {
  const problems = [];
  if (source.includes('var')) problems.push({ line: 0, rule: 'no-var', message: 'var found' });  // flags "variable" too, no line
  if (source.includes('==')) problems.push({ line: 0, rule: 'eqeqeq', message: '== found' });     // also matches === !
  return problems;
}` },
      mcq: { q: 'Why use <code>/\\bvar\\s/</code> instead of <code>includes("var")</code>?', options: ['\\b is a word boundary, so "variable" does not match', 'It runs faster', 'includes cannot search strings', 'Regex is required by ESLint'], answer: 0, explain: 'A word boundary requires var to start a word, and \\s requires a space after it. Plain includes would flag "variable", "invariant" and "avarice".' },
      hints: [`<p>Hint 1: Split the source on newlines and examine each line separately. The index plus 1 is the line number.</p>`, `<p>Hint 2: Each rule is a small test on one line: a regex for no-var and no-console, and one that finds <code>==</code> not surrounded by other <code>=</code> or <code>!</code> characters for eqeqeq.</p>`, `<p>Hint 3: Skip lines whose trimmed text starts with <code>//</code>. Push a problem for every rule that matches (not <code>else if</code>), then the array is already ordered by line. Recipe: rules array of {name, test, message}; loop lines; loop rules.</p>`],
      solution: {
        approach: `<p>Describe each rule as data (name, regex, message) and run every rule on every non-comment line. Because the outer loop goes line by line, the results are already sorted by line number.</p>`,
        code: { lang: 'js', run: true, code: `const RULES = [
  { rule: 'no-var', re: /\\bvar\\s/, message: 'Unexpected var, use let or const' },
  // a lone == or != : not part of ===, !==, <=, >=, =>
  { rule: 'eqeqeq', re: /(?<![=!<>])(==|!=)(?!=)/, message: 'Expected === or !==' },
  { rule: 'no-console', re: /\\bconsole\\.log\\(/, message: 'Unexpected console.log' }
];

function lint(source) {
  const problems = [];
  source.split('\\n').forEach((text, i) => {
    if (text.trim().startsWith('//')) return;        // comment line: ignore
    for (const { rule, re, message } of RULES) {
      if (re.test(text)) problems.push({ line: i + 1, rule, message });
    }
  });
  return problems;
}

const src = 'var a = 1;\\nif (a == 1) console.log("x");\\n// var ignored\\nconst b = a === 1;';
console.log(lint(src));` },
        dry: { head: ['line', 'text', 'rules matched'], rows: [['1', 'var a = 1;', 'no-var'], ['2', 'if (a == 1) console.log("x");', 'eqeqeq, no-console'], ['3', '// var ignored', 'skipped (comment)'], ['4', 'const b = a === 1;', 'none (=== is fine)']] },
        complexity: `<p>Time O(L·R) for L lines and R rules, space O(P) for P problems.</p>`,
        followUps: ['Add an auto-fix function per rule and re-run until no more fixes apply', 'Replace regexes with a real parser (acorn) to avoid false positives inside strings']
      }
    }]
  });

  /* ================================================================
     TOPIC 6 - unit testing, Jest / Vitest, the test pyramid
     ================================================================ */
  topics.push({
    title: 'Unit Testing: Jest, Vitest & the Test Pyramid',
    analogy: `<p>Building a car: you test each <b>part on a bench</b> (does this spark plug fire? - a <b>unit test</b>, cheap, thousands of them), then test <b>parts working together</b> (engine plus gearbox - an <b>integration test</b>), and finally take the finished car on a <b>real road</b> (an <b>end-to-end test</b>, slow and expensive, only a few). If you only ever test on the road, a failure tells you "the car does not go" but not <i>which part</i> is broken, and every test drive takes a day.</p>`,
    explain: `<p>🟢 <b>A test is code that runs your code and shouts if the answer is wrong.</b> Every test has three steps, the <b>AAA</b> pattern:</p>
      ${H.table(['Step', 'Meaning', 'Example'], [
        ['<b>A</b>rrange', 'Set up inputs and the world', '<code>const cart = [{ price: 5 }, { price: 7 }]</code>'],
        ['<b>A</b>ct', 'Call the thing under test, once', '<code>const total = sum(cart)</code>'],
        ['<b>A</b>ssert', 'Check the result', '<code>expect(total).toBe(12)</code>']
      ])}
      <p>🔵 <b>Jest vs Vitest.</b> Both give you <code>describe</code>, <code>it</code> / <code>test</code>, <code>expect</code>, mocks and snapshots with almost the <b>same API</b>. <b>Jest</b> (Meta) is the long-time standard: zero-config for many setups, transforms files with Babel or SWC, CommonJS-first. <b>Vitest</b> reuses your <b>Vite</b> config and pipeline (so TS, aliases and ESM just work), is very fast in watch mode, and replaces <code>jest.fn()</code> with <code>vi.fn()</code>. New Vite projects pick Vitest; large older codebases often stay on Jest.</p>
      <p>🔵 <b>Matchers you will use daily:</b></p>
      ${H.table(['Matcher', 'Checks', 'Careful'], [
        ['<code>toBe(x)</code>', 'Same value / same reference (<code>Object.is</code>)', '<code>expect([1]).toBe([1])</code> FAILS: two different arrays'],
        ['<code>toEqual(x)</code>', 'Deep equality of contents', 'Ignores <code>undefined</code> properties'],
        ['<code>toStrictEqual(x)</code>', 'Deep equality incl. <code>undefined</code> keys and classes', 'Stricter, good for APIs'],
        ['<code>toThrow(msg)</code>', 'A function throws', 'Pass the <b>function</b>, do not call it'],
        ['<code>toContain / toHaveLength</code>', 'Arrays and strings', ''],
        ['<code>toHaveBeenCalledWith(...)</code>', 'A mock was called with these arguments', 'Needs <code>vi.fn()</code> / <code>jest.fn()</code>']
      ])}
      <p>🔵 <b>Test doubles</b> (stand-ins) keep a unit test small and fast: a <b>stub</b> returns canned answers, a <b>spy</b> records calls on the real thing, a <b>mock</b> is a fake with expectations on how it is called, a <b>fake</b> is a simple working replacement (in-memory database). Use <code>vi.mock('./api')</code> to replace a whole module, <code>vi.useFakeTimers()</code> to control <code>setTimeout</code> and <code>Date</code>, and <code>it.each([...])</code> to run one test body over a table of cases.</p>
      <p>🔵 <b>The test pyramid</b> says: many fast unit tests at the bottom, fewer integration tests in the middle, a handful of end-to-end (E2E) tests on top. Frontend teams often prefer the <b>testing trophy</b>: lots of <i>integration-style component tests</i> (the next topic) because they best match how users use the page. Both agree on one rule: <b>the higher the test, the slower, flakier and more expensive</b>, so push checks as low as they can reasonably go.</p>`,
    clues: [
      '"write unit tests for this function" → AAA, happy path + edge cases (empty, null, boundaries, error)',
      '"Jest or Vitest?" → same API; Vitest if you use Vite (shared config, ESM, speed), Jest for legacy / React Native',
      '"test is flaky / passes alone but fails in the suite" → shared state, real timers / network / randomness, order dependence',
      '"mock vs stub vs spy" → canned answers / recorded calls / expectations on calls',
      '"what coverage should we aim for?" → coverage finds <i>untested</i> code, it does not prove tests are good; chase risk, not 100%',
      '"how to test code that uses setTimeout / Date / fetch?" → fake timers, mock the network layer (MSW), inject dependencies'
    ],
    code: [
      { lang: 'js', run: true, title: 'A 50-line test framework: describe, it, expect (runnable)', code: `// ---- tiny framework ----
const tests = [], hooks = [], prefix = [];
function describe(name, fn) { prefix.push(name); const saved = hooks.length; fn(); hooks.length = saved; prefix.pop(); }
function beforeEach(fn) { hooks.push(fn); }
function it(name, fn) { tests.push({ name: prefix.concat(name).join(' > '), fn, hooks: hooks.slice() }); }

const show = (v) => (typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v) ?? String(v));
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}
function expect(actual) {
  const make = (neg) => {
    const check = (pass, matcher, expected) => {
      if (pass === neg) throw new Error('expected ' + show(actual) + (neg ? ' not ' : ' ') + matcher + (expected === undefined ? '' : ' ' + show(expected)));
    };
    return {
      toBe: (e) => check(Object.is(actual, e), 'toBe', e),
      toEqual: (e) => check(deepEqual(actual, e), 'toEqual', e),
      toBeTruthy: () => check(!!actual, 'toBeTruthy'),
      toContain: (e) => check(actual.includes(e), 'toContain', e),
      toThrow: (msg) => {
        let threw = false, text = '';
        try { actual(); } catch (err) { threw = true; text = err.message; }
        check(threw && (msg === undefined || text.includes(msg)), 'toThrow', msg);
      }
    };
  };
  const m = make(false);
  m.not = make(true);
  return m;
}
async function run() {
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      for (const h of t.hooks) await h();    // beforeEach hooks run before every test
      await t.fn();                           // async tests just return a promise
      passed++; console.log('  PASS  ' + t.name);
    } catch (e) {
      failed++; console.log('  FAIL  ' + t.name + '\\n          ' + e.message);
    }
  }
  console.log('Tests: ' + failed + ' failed, ' + passed + ' passed, ' + tests.length + ' total');
}

// ---- code under test ----
const sum = (items) => items.reduce((t, i) => t + i.price * (i.qty ?? 1), 0);
function divide(a, b) { if (b === 0) throw new Error('Cannot divide by zero'); return a / b; }

// ---- the tests ----
describe('sum', () => {
  let cart;
  beforeEach(() => { cart = [{ price: 5 }, { price: 7, qty: 2 }]; });   // fresh data per test
  it('adds price times quantity', () => { expect(sum(cart)).toBe(19); });
  it('returns 0 for an empty cart', () => { expect(sum([])).toBe(0); });
  it('deep-equals objects with toEqual, not toBe', () => {
    expect({ a: [1, 2] }).toEqual({ a: [1, 2] });
    expect({ a: 1 }).not.toBe({ a: 1 });
  });
});
describe('divide', () => {
  it('throws on zero', () => { expect(() => divide(1, 0)).toThrow('zero'); });
  it('fails on purpose to show a report', () => { expect(divide(9, 3)).toBe(4); });
});
run();` },
      { lang: 'js', check: false, title: 'Vitest: the same style in a real project (cart.test.js)', code: `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sum, fetchTotal } from './cart';

describe('sum', () => {
  it.each([
    [[], 0],
    [[{ price: 5 }], 5],
    [[{ price: 5 }, { price: 7, qty: 2 }], 19]
  ])('sum(%j) = %i', (items, expected) => {      // one body, many rows
    expect(sum(items)).toBe(expected);
  });
});

describe('fetchTotal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('calls the API once and returns the total', async () => {
    const api = { get: vi.fn().mockResolvedValue({ total: 19 }) };   // stub with a recorded call
    const result = await fetchTotal(api, 'cart-1');
    expect(result).toBe(19);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/carts/cart-1');
  });

  it('retries after 1 second without waiting for real', async () => {
    const api = { get: vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ total: 3 }) };
    const p = fetchTotal(api, 'cart-2', { retryMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);                         // jump the clock
    await expect(p).resolves.toBe(3);
  });
});` },
      { lang: 'js', check: false, title: 'vitest.config.js (jsdom for component tests, coverage)', code: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',                 // fake browser DOM for component tests
    setupFiles: ['./src/test/setup.js'],  // e.g. import '@testing-library/jest-dom/vitest'
    globals: false,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'], thresholds: { lines: 80 } }
  }
});` }
    ],
    codeTitle: ['Mini test framework (runnable)', 'Vitest test file', 'vitest.config.js'],
    viz: [
      {
        title: 'The test pyramid: counts, time and cost',
        input: 'unit=300 integration=60 e2e=12',
        inputLabel: 'number of tests per layer',
        gen: function (input) {
          var m = {};
          words(input).forEach(function (t) { var p = t.split('='); m[p[0]] = Number(p[1]); });
          if (['unit', 'integration', 'e2e'].some(function (k) { return !(m[k] >= 0) || m[k] > 5000; })) throw new Error('Format: unit=300 integration=60 e2e=12 (numbers 0-5000)');
          var perTest = { unit: 0.02, integration: 0.5, e2e: 20 }, names = ['unit', 'integration', 'e2e'], counts = names.map(function (k) { return m[k]; });
          var total = names.map(function (k) { return +(m[k] * perTest[k]).toFixed(1); });
          var cone = m.e2e > m.unit;
          return [
            F('Three layers of tests. <b>Unit</b> tests check one function or component in isolation. <b>Integration</b> tests check several pieces together (a component with its store and a fake API). <b>E2E</b> tests drive a real browser through the whole app.',
              [{ type: 'bars', label: 'How many tests (your input)', values: counts, idxLabels: names, hl: { 0: 'ok', 1: 'win', 2: 'sel' } }]),
            F('Time per test is wildly different: unit about <b>0.02 s</b>, integration about <b>0.5 s</b>, E2E about <b>20 s</b> (start browser, load page, wait for network).',
              [{ type: 'bars', label: 'Seconds per ONE test', values: [0.02, 0.5, 20], texts: ['0.02 s', '0.5 s', '20 s'], idxLabels: names, hl: { 2: 'bad' } }]),
            F('Multiply count by time. Total suite time: unit <b>' + total[0] + ' s</b>, integration <b>' + total[1] + ' s</b>, E2E <b>' + total[2] + ' s</b>. A few slow tests can dominate the whole run.',
              [{ type: 'bars', label: 'Total seconds per layer', values: total, texts: total.map(function (v) { return v + ' s'; }), idxLabels: names, hl: { 0: 'ok', 1: 'win', 2: total[2] > total[0] + total[1] ? 'bad' : 'sel' } }]),
            F('How much a failure <b>tells you</b>: a failing unit test names the exact function. A failing E2E test says "checkout is broken" - could be 50 causes. But E2E tests prove the <i>whole</i> system works, which unit tests never can. You need both, in the right proportion.',
              [TB('Trade-offs', ['layer', 'speed', 'pinpoints bug?', 'flaky risk', 'realism'], [['unit', 'very fast', 'yes', 'very low', 'low'], ['integration', 'fast', 'mostly', 'low', 'medium'], ['e2e', 'slow', 'no', 'high', 'high']], { 0: 'ok', 1: 'win', 2: 'sel' })]),
            F(cone ? '<span class="c-r">Ice-cream cone warning.</span> You have more E2E tests (' + m.e2e + ') than unit tests (' + m.unit + '). The suite will be slow, flaky and hard to debug. Move checks <b>down</b> the pyramid.' : '<span class="c-g">Healthy shape.</span> Many cheap tests at the bottom, few expensive ones at the top. A common starting guide is roughly 70 / 20 / 10 percent, but the real goal is "fast feedback, high confidence".',
              [{ type: 'bars', label: 'Your shape', values: counts, idxLabels: names, hl: { 0: cone ? 'bad' : 'ok', 1: 'win', 2: cone ? 'bad' : 'sel' } }])
          ];
        }
      },
      {
        title: 'A test runner reports pass and fail',
        input: '2+3=5 1+1=3 0+0=0 10+5=15',
        inputLabel: 'tests for sum(a,b): a+b=expected',
        gen: function (input) {
          var toks = words(input);
          if (toks.length < 2 || toks.length > 8) throw new Error('Give 2 to 8 tests like 2+3=5');
          var tests = toks.map(function (t) {
            var m = t.match(/^(-?\d+)\+(-?\d+)=(-?\d+)$/);
            if (!m) throw new Error('Test "' + t + '" must look like 2+3=5');
            return { a: +m[1], b: +m[2], exp: +m[3] };
          });
          var sum = function (a, b) { return a + b; };
          var frames = [], rows = [], hl = {}, pass = 0, fail = 0;
          frames.push(F('The runner collects every <code>it()</code> block first. Each test calls <code>sum(a, b)</code> and compares with <code>expect(...).toBe(expected)</code>. Tests run one at a time and are independent.',
            [TB('Collected tests', ['test', 'expected', 'received', 'status'], tests.map(function (t) { return ['sum(' + t.a + ', ' + t.b + ')', t.exp, '-', 'pending']; }))]));
          tests.forEach(function (t, i) {
            var got = sum(t.a, t.b), ok = got === t.exp;
            ok ? pass++ : fail++;
            rows.push(['sum(' + t.a + ', ' + t.b + ')', t.exp, got, ok ? 'PASS' : 'FAIL']);
            hl[i] = ok ? 'ok' : 'bad';
            var shown = rows.slice();
            for (var j = i + 1; j < tests.length; j++) shown.push(['sum(' + tests[j].a + ', ' + tests[j].b + ')', tests[j].exp, '-', 'pending']);
            frames.push(F('<b>sum(' + t.a + ', ' + t.b + ')</b> returned <b>' + got + '</b>, expected <b>' + t.exp + '</b>: ' + (ok ? '<span class="c-g">the assertion holds, test passes.</span>' : '<span class="c-r">toBe fails. The runner records the error, prints the diff and carries on with the next test.</span>'),
              [TB('Running', ['test', 'expected', 'received', 'status'], shown, JSON.parse(JSON.stringify(hl)))]));
          });
          frames.push(F('Summary: <b class="c-g">' + pass + ' passed</b>, <b class="c-r">' + fail + ' failed</b>, ' + tests.length + ' total. The process exits with code ' + (fail ? 1 : 0) + ', which is what makes a CI job turn ' + (fail ? 'red.' : 'green.'),
            [{ type: 'vars', vals: { passed: pass, failed: fail, 'exit code': fail ? 1 : 0 }, hl: { failed: fail ? 'bad' : 'ok', passed: 'ok', 'exit code': fail ? 'bad' : 'ok' } }, TB('Report', ['test', 'expected', 'received', 'status'], rows, hl)]));
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'What to test in a pure function (slugify)',
        html: `<p>A <b>pure function</b> (same input → same output, no side effects) is the easiest thing to test. Think in categories: the <b>happy path</b> ("Hello World" → "hello-world"), <b>boundaries</b> (empty string, one character), <b>messy input</b> (extra spaces, punctuation, accents), <b>invalid input</b> (null → throws?), and <b>idempotence</b> (slugify of a slug is the same slug). Five small tests like these give more confidence than one big one.</p>`
      },
      {
        title: 'toBe vs toEqual: the classic trap',
        html: `<p><code>expect({ a: 1 }).toBe({ a: 1 })</code> <b>fails</b> because they are two different objects in memory (<code>toBe</code> uses <code>Object.is</code>). <code>toEqual</code> compares contents and passes. Primitive values (numbers, strings, booleans) work with either.</p>`,
        code: { lang: 'js', run: true, code: `const a = { id: 1 }, b = { id: 1 };
console.log('same reference?', Object.is(a, b));                  // false -> toBe would fail
console.log('same contents? ', JSON.stringify(a) === JSON.stringify(b)); // true -> toEqual would pass
console.log('NaN toBe NaN?  ', Object.is(NaN, NaN));              // true (unlike NaN === NaN)
console.log('0 toBe -0?     ', Object.is(0, -0));                // false` }
      },
      {
        title: 'Snapshot tests: useful, and easy to abuse',
        html: `<p><code>expect(tree).toMatchSnapshot()</code> saves the output the first time and compares on later runs. Great for small stable output (an error message, a serialized config). Dangerous for huge component trees: nobody reads a 600-line snapshot diff, so people press "update" and real regressions slip by. Prefer <b>inline snapshots</b> (<code>toMatchInlineSnapshot</code>) for small values and <b>explicit assertions</b> for behaviour.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How a test runner works.</b> Jest and Vitest start <b>worker processes or threads</b> and give each a test file. Inside a file the framework runs <code>describe</code> bodies <i>synchronously</i> to build a tree of tests, then executes them one by one, awaiting each, applying <code>beforeEach</code>/<code>afterEach</code>. Files run in parallel; tests in one file run in order. Every test file gets a <b>fresh module registry</b> (mocks and module state do not leak between files). In Jest, <code>jest.mock</code> calls are <b>hoisted</b> to the top by a Babel transform so they run before imports; Vitest does the same for <code>vi.mock</code>.</p>
      <p><b>Environments:</b> <code>node</code> (no DOM) is fastest; <code>jsdom</code> and <code>happy-dom</code> simulate a browser DOM in Node, good for component tests but they do not do layout, so <code>offsetWidth</code> is 0. Real-browser mode (Vitest Browser Mode, Playwright component testing) trades speed for realism. <b>Coverage</b> is measured with V8's built-in counters or Istanbul instrumentation: line, branch, function. A 100% line number can still hide untested branches and zero assertions; treat coverage as a map of <i>unvisited</i> code, not a quality score. <b>Mutation testing</b> (Stryker) checks test quality by changing your code (flip a <code>&lt;</code> to <code>&lt;=</code>) and seeing if any test fails.</p>
      <p><b>Flakiness causes</b> to eliminate: real clocks and timers, real network, random data without a seed, shared mutable state, test order, async work not awaited (the test ends before the assertion runs), animations. Practices: dependency injection (pass the clock or the API in), deterministic factories, no <code>sleep</code>, run tests in random order occasionally, and quarantine (not ignore) a flaky test with a ticket. Test <b>behaviour users or callers rely on</b>, not private implementation: tests tied to internals break on every refactor and teach the team to distrust tests.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI is excellent at generating test cases, edge-case lists and boilerplate (<code>it.each</code> tables, mock setup). It can read a function and propose twenty inputs including nasty ones (empty, huge, unicode, negative). Agents also use your test suite as their <b>feedback loop</b>: "make the tests pass" is a clear goal they can check themselves.</p>
      <p><b>Work alongside it:</b> write the test names yourself (they are the spec), then let AI fill in the bodies. Ask <code>List edge cases for this function. Do not write code yet</code>. After AI writes a fix, ask <code>Which of my tests would have failed before this change?</code> to confirm the tests actually test something.</p>
      <p><b>Where it goes wrong:</b> it writes tests that mirror the implementation (assert what the code already does, bugs included), over-mocks until nothing real is tested, writes <code>expect(true).toBe(true)</code>-style vacuous assertions, or "fixes" a failing test by weakening the assertion. <b>You must still own:</b> deciding what the correct behaviour is, reading every assertion, running mutation or "break it on purpose" checks, and never accepting a green suite without asking what it would catch.</p>`,
    problems: [{
      title: 'Write Unit Tests for a Pure Function (slugify)',
      level: 'Easy', tags: ['jest', 'vitest', 'unit test', 'pure function'], companies: ['Shopify', 'Notion'],
      statement: `<p>You are given <code>slugify(text)</code> which turns a title into a URL slug: lowercase, letters and digits kept, every run of other characters becomes a single <code>-</code>, and no leading or trailing dash. It throws a <code>TypeError</code> if the input is not a string. Write a test suite (Vitest or Jest style) with at least <b>six</b> tests covering the happy path, spaces, punctuation, edge cases (empty, only symbols), idempotence and the error.</p>`,
      constraints: `Each test checks one behaviour and has a name that reads like a sentence. Tests must not depend on each other or on execution order.`,
      example: `${H.table(['input', 'slugify(input)'], [['<code>"Hello World"</code>', '<code>"hello-world"</code>'], ['<code>"  Hi!!  There  "</code>', '<code>"hi-there"</code>'], ['<code>"!!!"</code>', '<code>""</code>'], ['<code>42</code>', 'throws TypeError']])}`,
      brute: { why: `<p>One giant test with many assertions: when it fails you do not know which behaviour broke, and the first failing <code>expect</code> hides all the later ones. Also a test that only checks the happy path misses the empty-string and symbol cases where bugs live.</p>`, code: { lang: 'js', check: false, code: `import { it, expect } from 'vitest';
import { slugify } from './slugify';

it('works', () => {
  expect(slugify('Hello World')).toBe('hello-world');
  expect(slugify('A  B')).toBe('a-b');
  expect(slugify('')).toBe('');
});   // when this fails, which behaviour is broken?` } },
      mcq: { q: 'Which test name is best?', options: ['it("collapses repeated separators into a single dash")', 'it("test 2")', 'it("works")', 'it("slugify")'], answer: 0, explain: 'A good name states the behaviour. When it fails in CI the name alone tells you what broke, without opening the file.' },
      hints: [`<p>Hint 1: Make a list of behaviours first: normal, repeated spaces, punctuation, trimming, empty, only symbols, already a slug, wrong type.</p>`, `<p>Hint 2: One <code>it()</code> per behaviour with AAA: arrange the input, act by calling slugify, assert one thing. Use <code>it.each</code> when only the data changes.</p>`, `<p>Hint 3: For the error test, wrap the call in a function: <code>expect(() =&gt; slugify(42)).toThrow(TypeError)</code>. For idempotence: <code>slugify(slugify(x))</code> equals <code>slugify(x)</code>. Recipe: describe('slugify') with 6+ small tests.</p>`],
      solution: {
        approach: `<p>One behaviour per test, a table for the data-driven cases, and a wrapped call for the thrown error. Below is the Vitest file; the alternative tab runs the same checks with a tiny harness so you can see the output.</p>`,
        code: { lang: 'js', check: false, code: `import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it.each([
    ['Hello World', 'hello-world'],
    ['  Hi!!  There  ', 'hi-there'],
    ['Rock & Roll 2024', 'rock-roll-2024'],
    ['a---b', 'a-b']
  ])('turns %j into %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('returns an empty string for an empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('returns an empty string when there are only symbols', () => {
    expect(slugify('!!!')).toBe('');
  });

  it('is idempotent: slugifying a slug changes nothing', () => {
    const once = slugify('My First Post');
    expect(slugify(once)).toBe(once);
  });

  it('throws a TypeError for non-string input', () => {
    expect(() => slugify(42)).toThrow(TypeError);
  });
});`},
        alt: [{ lang: 'js', run: true, title: 'Same checks with a 10-line harness (runnable)', code: `function slugify(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
let failed = 0;
function test(name, fn) { try { fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '-', e.message); } }
function eq(actual, expected) { if (actual !== expected) throw new Error('got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected)); }

[['Hello World', 'hello-world'], ['  Hi!!  There  ', 'hi-there'], ['Rock & Roll 2024', 'rock-roll-2024'], ['a---b', 'a-b']]
  .forEach(([input, expected]) => test('turns ' + JSON.stringify(input) + ' into ' + JSON.stringify(expected), () => eq(slugify(input), expected)));
test('empty string stays empty', () => eq(slugify(''), ''));
test('only symbols gives empty string', () => eq(slugify('!!!'), ''));
test('idempotent', () => { const once = slugify('My First Post'); eq(slugify(once), once); });
test('throws TypeError for numbers', () => { try { slugify(42); throw new Error('did not throw'); } catch (e) { eq(e instanceof TypeError, true); } });
console.log(failed ? failed + ' failed' : 'all passed');` }],
        complexity: `<p>Each test is O(length of the input). The point is coverage of behaviours, not speed.</p>`,
        followUps: ['Add a test for accented letters (decide the expected behaviour first)', 'What would a property-based test (fast-check) assert here?']
      }
    }]
  });

  /* ---------- a tiny accessibility tree for the React Testing Library visualizer ---------- */
  var RTL_DOM = [
    { tag: '<h1>', text: 'Account settings', role: 'heading', name: 'Account settings' },
    { tag: '<input id="email"> + <label>Email</label>', text: '(text box)', role: 'textbox', name: 'Email' },
    { tag: '<input type="checkbox"> + <label>Subscribe</label>', text: '(checkbox)', role: 'checkbox', name: 'Subscribe' },
    { tag: '<button>', text: 'Save', role: 'button', name: 'Save' },
    { tag: '<button>', text: 'Cancel', role: 'button', name: 'Cancel' },
    { tag: '<div onClick>', text: 'Delete account', role: 'generic', name: '' },
    { tag: '<a href="/help">', text: 'Help', role: 'link', name: 'Help' }
  ];
  var SUBSCRIBE_SRC = 'function SubscribeForm() {\n  const [email, setEmail] = useState("");\n  const [status, setStatus] = useState("idle");   // idle | error | done\n  function onSubmit(e) {\n    e.preventDefault();\n    setStatus(/^\\S+@\\S+\\.\\S+$/.test(email) ? "done" : "error");\n  }\n  return (\n    <form onSubmit={onSubmit}>\n      <label htmlFor="email">Email address</label>\n      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />\n      <button type="submit">Subscribe</button>\n      {status === "error" && <p role="alert">Enter a valid email</p>}\n      {status === "done" && <p role="status">Thanks, {email}!</p>}\n    </form>\n  );\n}';

  /* ================================================================
     TOPIC 7 - React Testing Library
     ================================================================ */
  topics.push({
    title: 'React Testing Library: Test Like a User',
    analogy: `<p>Imagine hiring a <b>secretary to test your shop</b>. You do not hand them the building plans and ask "is the wire behind panel C connected?" (that is testing <i>implementation</i>). You say: "Walk in, find the button that says <b>Buy</b>, press it, and tell me if a receipt appears." The secretary only uses what a customer can see and touch: labels, buttons, text. If you later rewire the shop (refactor), the secretary's checklist still works. That is React Testing Library (RTL).</p>`,
    explain: `<p>🟢 <b>The guiding rule of RTL:</b> <i>"The more your tests resemble the way your software is used, the more confidence they can give you."</i> So you do <b>not</b> test a component's state, its method names or its CSS classes. You render it, find things the way a person (or a screen reader) would, interact, and check what appears.</p>
      <p>🔵 <b>The loop of almost every RTL test:</b></p>
      <ol><li><b>render</b> the component into a fake browser (jsdom).</li>
      <li><b>query</b> elements with <code>screen.getByRole("button", { name: "Save" })</code>.</li>
      <li><b>act like a user</b> with <code>await user.click(...)</code> / <code>user.type(...)</code> (from <code>@testing-library/user-event</code>).</li>
      <li><b>assert</b> what the user would see with <code>expect(...).toBeInTheDocument()</code> (from <code>jest-dom</code>).</li></ol>
      <p>🔵 <b>Which query? Use this priority ladder</b> (top = best, it also proves your page is accessible):</p>
      ${H.table(['Priority', 'Query', 'Use for'], [
        ['1', '<code>getByRole(role, { name })</code>', 'Almost everything: buttons, links, headings, textboxes, checkboxes'],
        ['2', '<code>getByLabelText</code>', 'Form fields with a <code>&lt;label&gt;</code>'],
        ['3', '<code>getByPlaceholderText</code>', 'Only if there is no label (weak)'],
        ['4', '<code>getByText</code>', 'Non-interactive text (paragraphs)'],
        ['5', '<code>getByDisplayValue</code>, <code>getByAltText</code>, <code>getByTitle</code>', 'Current input value, images, title attrs'],
        ['last', '<code>getByTestId("save-btn")</code>', 'Escape hatch when nothing user-visible works']
      ])}
      <p>🔵 <b>Three families of query</b> (pick by what you expect):</p>
      ${H.table(['Prefix', 'No match', 'One match', 'Many matches', 'Use when'], [
        ['<code>getBy…</code>', 'throws', 'element', 'throws', 'It must be there now'],
        ['<code>queryBy…</code>', 'returns <code>null</code>', 'element', 'throws', 'Asserting something is <b>absent</b>: <code>expect(queryByText("x")).not.toBeInTheDocument()</code>'],
        ['<code>findBy…</code>', 'waits, then throws', 'element (a Promise)', 'throws', 'It appears <b>later</b> (after fetch / timer)'],
        ['<code>…AllBy…</code>', '', 'array', 'array', 'Lists']
      ])}
      <p>🔵 <b>Network and providers.</b> Components that call <code>fetch</code> are tested by intercepting the network with <b>MSW</b> (Mock Service Worker) so the real fetching code runs. Components that need Redux, Router or Query providers are rendered inside a small <b>wrapper</b>. Never reach into a component to set its internal state.</p>`,
    clues: [
      '"test a component the way a user uses it" → RTL, query by role/label/text, <code>user-event</code>',
      '"how do you select elements in RTL?" → priority ladder: role &gt; label &gt; text &gt; testId last',
      '"assert that something is NOT rendered" → <code>queryBy…</code> returning null, not <code>getBy…</code>',
      '"the text shows up after an API call" → <code>await findBy…</code> or <code>waitFor</code>, mock the API with MSW',
      '"tests break whenever we refactor" → they test implementation details (state, class names, internal functions)',
      '"act(...) warning" → a state update happened outside awaited user events; await the interaction or the <code>findBy</code>'
    ],
    code: [
      { lang: 'js', run: true, title: 'getByRole from scratch on a fake accessibility tree (runnable)', code: `// A page, described the way a screen reader sees it: role + accessible name.
const tree = [
  { role: 'heading', name: 'Account settings' },
  { role: 'textbox', name: 'Email' },
  { role: 'checkbox', name: 'Subscribe' },
  { role: 'button', name: 'Save' },
  { role: 'button', name: 'Cancel' },
  { role: 'generic', name: '' },            // a clickable <div>: NOT a button for a screen reader
  { role: 'link', name: 'Help' }
];

// Like RTL: no name given = any name; a string = exact match; a RegExp = pattern.
function queryAllByRole(role, name) {
  return tree.filter((el) => {
    if (el.role !== role) return false;
    if (name === undefined) return true;
    return name instanceof RegExp ? name.test(el.name) : el.name === name;
  });
}
function getByRole(role, name) {
  const found = queryAllByRole(role, name);
  if (found.length === 0) {
    const roles = [...new Set(tree.map((e) => e.role))].join(', ');
    throw new Error('Unable to find an accessible element with the role "' + role + '"' + (name ? ' and name "' + name + '"' : '') + '. Available roles: ' + roles);
  }
  if (found.length > 1) throw new Error('Found multiple elements with the role "' + role + '". Add a name to narrow it down.');
  return found[0];
}
const attempt = (label, fn) => { try { console.log(label, '->', JSON.stringify(fn())); } catch (e) { console.log(label, '-> ERROR:', e.message); } };

attempt('getByRole("button", "Save")        ', () => getByRole('button', 'Save'));
attempt('getByRole("button")                ', () => getByRole('button'));          // two buttons
attempt('getByRole("button", "Delete account")', () => getByRole('button', 'Delete account')); // div is not a button
attempt('getByRole("link", /help/i)         ', () => getByRole('link', /help/i));
attempt('getByRole("button", "save")        ', () => getByRole('button', 'save'));  // exact + case-sensitive` },
      { lang: 'js', check: false, title: 'A form test with user-event (Subscribe.test.jsx)', code: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscribeForm } from './SubscribeForm';

it('shows a thank-you after a valid email is submitted', async () => {
  const user = userEvent.setup();                                   // 1. create the "person"
  render(<SubscribeForm />);                                        // 2. render

  await user.type(screen.getByLabelText('Email address'), 'asha@example.com');
  await user.click(screen.getByRole('button', { name: 'Subscribe' }));

  expect(screen.getByRole('status')).toHaveTextContent('Thanks, asha@example.com!');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();      // queryBy: asserting ABSENCE
});` },
      { lang: 'js', check: false, title: 'Async data with MSW + findBy', code: `import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { UserList } from './UserList';

const server = setupServer(
  http.get('/api/users', () => HttpResponse.json([{ id: 1, name: 'Asha' }, { id: 2, name: 'Ben' }]))
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('shows a loading state, then the users', async () => {
  render(<UserList />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();          // getBy: it is there right now
  expect(await screen.findByText('Asha')).toBeInTheDocument();   // findBy waits
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

it('shows an error message when the API fails', async () => {
  server.use(http.get('/api/users', () => new HttpResponse(null, { status: 500 })));
  render(<UserList />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
});` },
      { lang: 'js', check: false, title: 'A render helper with providers and a hook test', code: `import { render, renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useCounter } from './useCounter';

export function renderWithProviders(ui, { route = '/' } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });  // no retries in tests
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

it('custom hook: increments', () => {
  const { result } = renderHook(() => useCounter(5));
  act(() => result.current.increment());
  expect(result.current.count).toBe(6);
});` }
    ],
    codeTitle: ['getByRole model (runnable)', 'Form test', 'MSW async test', 'Provider helper + hook'],
    viz: [
      {
        title: 'getByRole walks the accessibility tree',
        input: 'button:Save',
        inputLabel: 'role:name (name optional, exact match)',
        gen: function (input) {
          var q = String(input).trim();
          var idx = q.indexOf(':'), role = idx >= 0 ? q.slice(0, idx).trim() : q, name = idx >= 0 ? q.slice(idx + 1).trim() : undefined;
          if (!role) throw new Error('Type something like button:Save or heading or textbox:Email');
          var rows = [], hl = {}, found = [], frames = [];
          var shown = function (upTo) { return RTL_DOM.map(function (e, i) { return i <= upTo ? rows[i] : [e.tag, e.text, '-', '-', '?']; }); };
          frames.push(F('The page contains these elements. Behind the scenes the browser (and jsdom) builds an <b>accessibility tree</b>: every element gets a <b>role</b> (what it is) and an <b>accessible name</b> (what it is called). Your query is <code>getByRole("' + esc(role) + '"' + (name ? ', { name: "' + esc(name) + '" }' : '') + ')</code>.',
            [TB('Elements on the page', ['element', 'visible text', 'role', 'accessible name', 'match?'], RTL_DOM.map(function (e) { return [e.tag, e.text, e.role, e.name || '(none)', '?']; }))]));
          RTL_DOM.forEach(function (e, i) {
            var roleOk = e.role === role, nameOk = name === undefined || e.name === name, ok = roleOk && nameOk;
            rows[i] = [e.tag, e.text, e.role, e.name || '(none)', ok ? 'MATCH' : 'no'];
            if (ok) found.push(e);
            hl[i] = ok ? 'ok' : (roleOk ? 'bad' : 'done');
            frames.push(F('<b>' + esc(e.tag) + '</b> has role <code>' + e.role + '</code>' + (e.name ? ' and name <code>' + esc(e.name) + '</code>' : ' and no name') + ': ' + (ok ? '<span class="c-g">both match, collect it.</span>' : (!roleOk ? 'wrong role, skip.' : '<span class="c-r">role matches but the name is different</span> (matching is exact and case-sensitive).')) + (e.role === 'generic' && e.text === 'Delete account' ? ' Note: a clickable <code>&lt;div&gt;</code> is <b>not</b> a button to assistive technology, so getByRole will never find it.' : ''),
              [TB('Checking element ' + (i + 1) + ' of ' + RTL_DOM.length, ['element', 'visible text', 'role', 'accessible name', 'match?'], shown(i), (function () { var h = JSON.parse(JSON.stringify(hl)); h[i] = ok ? 'ok' : 'cur'; return h; })())]));
          });
          var verdict, cls;
          if (found.length === 1) { verdict = '<span class="c-g">Exactly one match.</span> <code>getByRole</code> returns that element and the test continues.'; cls = 'ok'; }
          else if (found.length === 0) { verdict = '<span class="c-r">No match.</span> <code>getByRole</code> throws "Unable to find an accessible element…" and prints the roles that DO exist - a great debugging hint. (<code>queryByRole</code> would return null; <code>findByRole</code> would keep retrying for 1 second first.)'; cls = 'bad'; }
          else { verdict = '<span class="c-r">' + found.length + ' matches.</span> <code>getByRole</code> throws "Found multiple elements". Add <code>{ name: "…" }</code> to narrow it, or use <code>getAllByRole</code>.'; cls = 'bad'; }
          var finalHl = {};
          Object.keys(hl).forEach(function (k) { finalHl[k] = hl[k] === 'ok' ? (found.length === 1 ? 'sel' : 'bad') : 'done'; });
          frames.push(F(verdict, [TB('Result', ['element', 'visible text', 'role', 'accessible name', 'match?'], rows, finalHl), { type: 'vars', vals: { matches: found.length, outcome: found.length === 1 ? 'element returned' : 'error thrown' }, hl: { matches: cls, outcome: cls } }]));
          return frames;
        }
      },
      {
        title: 'findBy waits; getBy does not',
        input: '300',
        inputLabel: 'ms until the data appears (0-2000)',
        gen: function (input) {
          var delay = Number(String(input).trim());
          if (!(delay >= 0 && delay <= 2000)) throw new Error('Type a number of milliseconds between 0 and 2000');
          delay = Math.round(delay / 50) * 50;
          var frames = [], polls = [], hl = {}, t, found = -1;
          frames.push(F('A component fetches users and shows them after <b>' + delay + ' ms</b>. At time 0 the page shows "Loading…". The test must choose how to look for "Asha".',
            [{ type: 'vars', vals: { 'data arrives at': delay + ' ms', 'findBy timeout': '1000 ms', 'poll every': '50 ms' } }]));
          frames.push(F('<b>getByText("Asha")</b> looks <i>once, right now</i>. At t = 0 the text is not there, so it <span class="c-r">throws immediately</span>. This is the wrong tool for data that arrives later.',
            [{ type: 'queue', label: 'getBy polls', items: ['t=0 ms: not found -> THROW'], hl: { 0: 'bad' }, frontLabel: 'only try', backLabel: '' }]));
          for (t = 0; t <= 1000; t += 50) {
            var ok = t >= delay;
            polls.push('t=' + t + (ok ? ' found' : ' miss'));
            hl[polls.length - 1] = ok ? 'ok' : 'bad';
            if (ok) { found = t; }
            frames.push(F('<b>await findByText("Asha")</b> checks at t = ' + t + ' ms: ' + (ok ? '<span class="c-g">the text is on the page, the promise resolves.</span>' : 'not yet, wait 50 ms and try again.'),
              [{ type: 'queue', label: 'findBy polls (every 50 ms)', items: polls.slice(), hl: JSON.parse(JSON.stringify(hl)), frontLabel: 'first try', backLabel: 'latest' }]));
            if (ok) break;
          }
          frames.push(F(found >= 0 ? 'Result: <b>findBy resolved after ' + found + ' ms</b>. Under the hood RTL uses <code>waitFor</code>: retry + a MutationObserver that re-checks whenever the DOM changes. The test stays fast because it never waits longer than needed.' : '<span class="c-r">findBy gave up after 1000 ms</span> and threw a timeout error, because the data arrives later than the limit. Either the app is too slow, or pass <code>{ timeout: 3000 }</code> deliberately.',
            [{ type: 'vars', vals: { outcome: found >= 0 ? 'passed' : 'timeout error', 'waited (ms)': found >= 0 ? found : 1000 }, hl: { outcome: found >= 0 ? 'ok' : 'bad' } }]));
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Fragile test vs resilient test',
        html: `<p>Same feature, two tests. The first reaches into class names and DOM structure; it breaks when a designer renames <code>.btn-primary</code> or wraps the button in a div. The second uses what a user sees, so it survives refactors.</p>`,
        code: { lang: 'js', check: false, code: `// FRAGILE: tied to markup details
const { container } = render(<SubscribeForm />);
container.querySelector('.form > div:nth-child(2) input').value = 'a@b.co';
container.querySelector('.btn-primary').click();
expect(container.querySelector('.msg-ok').textContent).toBe('Thanks, a@b.co!');

// RESILIENT: tied to what the user can see and do
render(<SubscribeForm />);
await userEvent.type(screen.getByLabelText('Email address'), 'a@b.co');
await userEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
expect(screen.getByRole('status')).toHaveTextContent('Thanks, a@b.co!');` }
      },
      {
        title: 'The accessibility bonus: if getByRole fails, a user may be stuck too',
        html: `<p>Suppose your test cannot find <code>getByRole("button", { name: "Delete account" })</code> because the app uses <code>&lt;div onClick&gt;Delete account&lt;/div&gt;</code>. That is not just a test problem: a keyboard user cannot tab to a div, and a screen reader never announces it as a button. The failing test just found a real accessibility bug. Fix the markup (<code>&lt;button&gt;</code>), not the test. Likewise an unlabeled input fails <code>getByLabelText</code>, which tells you the label is missing for everyone.</p>`
      },
      {
        title: 'userEvent vs fireEvent',
        html: `<p><code>fireEvent.click(button)</code> dispatches <b>one</b> synthetic event. <code>await user.click(button)</code> simulates what a real browser does: pointer move, mousedown, focus, mouseup, click, and it respects <code>disabled</code>, <code>pointer-events: none</code> and hidden elements. <code>user.type</code> sends keydown, keypress, input and keyup for every character, with the right focus and selection. So <code>userEvent</code> catches bugs that <code>fireEvent</code> hides (for example, a button that is visually covered). Use <code>fireEvent</code> only for events users cannot produce directly.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How it works.</b> <code>render</code> mounts your component with React DOM into a <code>div</code> appended to <code>document.body</code> in jsdom, wrapped in <code>act()</code> so React flushes effects and state updates before you assert. <code>screen</code> is bound to <code>document.body</code>. <code>getByRole</code> uses <code>dom-accessibility-api</code> to compute roles (explicit <code>role</code> attribute, else the implicit ARIA role of the tag) and the accessible name (aria-labelledby, aria-label, native label, alt text, content). It also ignores elements hidden from the accessibility tree unless you pass <code>hidden: true</code>. That computation is slow on huge DOMs; <code>getByRole</code> in a 5,000-node tree can take hundreds of ms, so for giant tables prefer scoping with <code>within(row)</code>.</p>
      <p><b>Async details.</b> <code>waitFor(cb)</code> retries <code>cb</code> every 50 ms (and on DOM mutations) until it stops throwing or 1000 ms pass. Put <b>one assertion</b> inside; do not put side effects such as clicks in it (they would repeat). <code>findBy</code> is just <code>waitFor(() =&gt; getBy…)</code>. With fake timers you must advance time yourself. React's <code>act</code> warnings mean "something updated state when I was not watching": almost always an un-awaited <code>user</code> call or a promise that resolves after the test ended; fix by awaiting the visible outcome.</p>
      <p><b>What RTL is not for.</b> jsdom has no layout engine, no real CSS cascade for visibility rules beyond simple ones, no scroll, no canvas, no real focus ring. Anything about pixels, responsive breakpoints, drag and drop, file uploads in real browsers, or cross-page navigation belongs in Playwright (next topic) or visual-regression tests. <b>Server Components and Next.js:</b> async Server Components cannot be rendered with RTL today; test their pure logic in unit tests and their behaviour in E2E, and keep Client Components thin enough to test with RTL. <b>Mocking policy:</b> mock at the network edge (MSW) rather than mocking your own hooks and modules, so the test covers fetching, parsing and rendering together.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI writes RTL boilerplate quickly, and "write tests for this component" is one of the most common prompts. The good news: RTL's role-based queries read almost like English, so AI output is easy to review. The bad news: AI defaults to the habits of old tutorials (<code>getByTestId</code> everywhere, <code>fireEvent</code>, snapshot of the whole tree, <code>container.querySelector</code>).</p>
      <p><b>Work alongside it:</b> give it a rule in your prompt or project instructions: <code>Use getByRole/getByLabelText first, userEvent not fireEvent, mock the network with MSW, no snapshots, one behaviour per test</code>. Paste the rendered DOM (<code>screen.debug()</code> or <code>logRoles</code>) and ask <code>Which role and name should I query for the Save button?</code>.</p>
      <p><b>Where it goes wrong:</b> it invents roles and names that are not in the DOM, writes assertions that always pass (<code>expect(screen.getByText("x")).toBeDefined()</code> never fails the way you think), forgets <code>await</code>, and mocks the very hook you wanted to test. <b>You must still own:</b> running the test, then <i>breaking the component on purpose</i> to see the test fail, and checking that the test would still pass after a harmless refactor.</p>`,
    problems: [{
      title: 'Write an RTL Test by Role (Subscribe Form)',
      level: 'Medium', tags: ['react testing library', 'user-event', 'accessibility'], companies: ['Airbnb', 'Atlassian'],
      statement: `<p>Here is a small component. Write a React Testing Library test file (Vitest or Jest) that checks <b>two behaviours</b> using only <b>role / label queries</b> and <code>userEvent</code>: (1) typing a valid email and pressing Subscribe shows "Thanks, &lt;email&gt;!" and no error, (2) submitting an invalid email shows an alert saying "Enter a valid email" and no thank-you message.</p><pre><code>${H.esc(SUBSCRIBE_SRC)}</code></pre>`,
      constraints: `No <code>getByTestId</code>, no <code>container.querySelector</code>, no snapshots, no implementation details (do not read state). Use <code>await</code> for every user interaction.`,
      example: `${H.table(['user does', 'user sees'], [['types <code>asha@example.com</code>, clicks Subscribe', H.c('g', 'status: "Thanks, asha@example.com!"')], ['types <code>nope</code>, clicks Subscribe', H.c('r', 'alert: "Enter a valid email"')]])}<p>The component gives us accessible hooks for free: a <code>label</code>, a <code>button</code> named "Subscribe", <code>role="alert"</code> for errors and <code>role="status"</code> for success.</p>`,
      brute: { why: `<p>The brittle approach selects by CSS class and DOM position and reads innerHTML. It couples the test to markup the user never sees, so any harmless restructuring breaks it, and it proves nothing about accessibility.</p>`, code: { lang: 'js', check: false, code: `it('works', () => {
  const { container } = render(<SubscribeForm />);
  const input = container.querySelector('form > input');            // position-based
  fireEvent.change(input, { target: { value: 'asha@example.com' } });
  container.querySelector('button').click();                         // first button, whatever it is
  expect(container.innerHTML).toContain('Thanks');                   // string search in HTML
});` } },
      mcq: { q: 'How do you assert the error message is NOT on screen at the start?', options: ['expect(screen.queryByRole("alert")).not.toBeInTheDocument()', 'expect(screen.getByRole("alert")).not.toBeInTheDocument()', 'expect(screen.findByRole("alert")).toBeNull()', 'expect(container.innerHTML).not.toBe("alert")'], answer: 0, explain: 'getBy throws when nothing matches, so the test would crash before the assertion. queryBy returns null, which is exactly what you want when checking absence.' },
      hints: [`<p>Hint 1: Think about what the user does: find the field by its label, type, click the button named Subscribe. Then what they read: a message with a role.</p>`, `<p>Hint 2: <code>const user = userEvent.setup()</code>, then <code>await user.type(screen.getByLabelText(...), '...')</code> and <code>await user.click(screen.getByRole('button', { name: 'Subscribe' }))</code>.</p>`, `<p>Hint 3: Success → <code>getByRole('status')</code> with <code>toHaveTextContent</code>; the error must be absent: <code>queryByRole('alert')</code> is null. Failure → <code>getByRole('alert')</code> present and <code>queryByRole('status')</code> null. Write two separate <code>it</code> blocks.</p>`],
      solution: {
        approach: `<p>Two behaviour-focused tests. Each renders fresh, finds the field by label and the button by role and name, performs awaited user actions, and asserts on roles that real users and screen readers see. Absence is asserted with <code>queryByRole</code>.</p>`,
        code: { lang: 'js', check: false, code: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscribeForm } from './SubscribeForm';

describe('SubscribeForm', () => {
  it('thanks the user after a valid email', async () => {
    const user = userEvent.setup();
    render(<SubscribeForm />);

    await user.type(screen.getByLabelText('Email address'), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(screen.getByRole('status')).toHaveTextContent('Thanks, asha@example.com!');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error for an invalid email', async () => {
    const user = userEvent.setup();
    render(<SubscribeForm />);

    await user.type(screen.getByLabelText('Email address'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows neither message before the form is submitted', () => {
    render(<SubscribeForm />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});` },
        complexity: `<p>Test cost is dominated by jsdom rendering and the userEvent delays (milliseconds). Use <code>userEvent.setup({ delay: null })</code> to skip artificial delays with fake timers.</p>`,
        followUps: ['Add a test that the button is disabled while submitting', 'Mock a POST request with MSW and assert the success message waits for the response']
      }
    }]
  });

  /* ---------- E2E (Playwright) visualizer helpers ---------- */
  function e2eGraph(hl, ehl, tags) {
    return {
      type: 'graph', label: 'Who talks to whom during the test', directed: true, height: 56,
      nodes: [
        { id: 'T', label: 'Test runner (Node)', x: 14, y: 12, shape: 'box' },
        { id: 'B', label: 'Browser + Page', x: 14, y: 40, shape: 'box' },
        { id: 'S', label: 'Web server (app)', x: 52, y: 40, shape: 'box' },
        { id: 'A', label: 'Login API', x: 84, y: 40, shape: 'box' },
        { id: 'D', label: 'Database', x: 84, y: 12, shape: 'box' }
      ],
      edges: [['T', 'B', 'commands'], ['B', 'S', 'HTTP'], ['S', 'A', ''], ['A', 'D', '']],
      hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }

  /* ================================================================
     TOPIC 8 - E2E with Playwright
     ================================================================ */
  topics.push({
    title: 'End-to-End Tests with Playwright',
    analogy: `<p>An E2E test is a <b>robot customer</b>. It walks into the real shop (a real browser), looks for the sign that says "Sign in", types a username with real keystrokes, presses buttons, and then checks that the welcome banner appears. It does not care how the shop is built inside. The robot is <b>patient</b>: if the door is still opening, it waits a moment instead of walking into it. That patience (<b>auto-waiting</b>) is the secret that makes Playwright tests stable.</p>`,
    explain: `<p>🟢 <b>End-to-end (E2E) tests</b> run your whole app in a real browser, exactly as a user would: real HTML, real CSS, real JavaScript, real network (or a controlled one). They are the only tests that prove "a user can really sign up and pay". They are also the slowest, so you write <b>few</b>, for the <b>critical journeys</b>: sign up, log in, search, add to cart, checkout.</p>
      <p>🔵 <b>Playwright</b> (by Microsoft) drives Chromium, Firefox and WebKit (Safari's engine) with one API, from Node, Python, Java or .NET. Compared with the others:</p>
      ${H.table(['Tool', 'Idea', 'Notes'], [
        ['<b>Playwright</b>', 'Talks to browsers over their debugging protocol; tests run <i>outside</i> the page', 'Multi-browser, multi-tab, auto-wait, trace viewer, parallel by default'],
        ['<b>Cypress</b>', 'Test code runs <i>inside</i> the browser next to your app', 'Great dev experience, historically one tab and fewer browsers'],
        ['<b>Selenium</b>', 'WebDriver standard, any language', 'Oldest, more manual waiting, heavier setup']
      ])}
      <p>🔵 <b>The four ideas that make Playwright tests good:</b></p>
      <ol><li><b>Locators</b>, not selectors: <code>page.getByRole("button", { name: "Sign in" })</code>. Same priority ladder as RTL (role, label, text, test id last). A locator is a <i>recipe to find</i> the element, re-evaluated on every use.</li>
      <li><b>Auto-waiting</b>: before an action (<code>click</code>, <code>fill</code>) Playwright waits until the element is <b>attached, visible, stable (not animating), enabled, and not covered</b>. You never write <code>sleep(2000)</code>.</li>
      <li><b>Web-first assertions</b>: <code>await expect(page).toHaveURL(/dashboard/)</code> and <code>await expect(locator).toBeVisible()</code> <b>retry</b> until they pass or time out (5 s by default). Do not use <code>expect(await locator.isVisible()).toBe(true)</code>: that checks once.</li>
      <li><b>Isolation</b>: every test gets a fresh <b>browser context</b> (like a brand-new incognito profile): empty cookies, storage and cache. Tests cannot leak into each other, so they run in parallel.</li></ol>
      <p>🔵 <b>Things you will use in real projects:</b> <code>playwright.config</code> (projects per browser or device, <code>baseURL</code>, <code>retries</code>, <code>webServer</code> to start your dev server); <b>storageState</b> to log in once and reuse the cookies; <b>page.route</b> to fake or block network calls; <b>fixtures</b> and <b>page objects</b> for reuse; the <b>trace viewer</b> (a time-travel recording with DOM snapshots, network and console) to debug a failure from CI; <code>npx playwright codegen</code> to record a first draft.</p>`,
    clues: [
      '"test the login / checkout flow in a real browser" → Playwright, locators by role, one test per journey',
      '"the test passes locally, fails in CI sometimes (flaky)" → manual sleeps, shared accounts/data, animations, un-awaited steps; use auto-wait + traces',
      '"how do you avoid logging in in every test?" → global setup + <code>storageState</code>',
      '"test must not hit the real payment API" → <code>page.route</code> mocks or a test backend',
      '"cross-browser / mobile viewport testing" → projects for chromium/firefox/webkit and device descriptors',
      '"speed up a 40-minute E2E suite" → parallel workers, sharding across CI machines, fewer/better tests, reuse auth, run only on affected areas'
    ],
    code: [
      { lang: 'js', run: true, title: 'Why web-first assertions beat "check once" (runnable simulation)', code: `// Virtual clock: the page finishes loading the dashboard at 1200 ms.
const APP_READY_AT = 1200;
const pageUrlAt = (t) => (t >= APP_READY_AT ? '/dashboard' : '/login');

// NAIVE: check once, right after the click (t = 50 ms). Flaky: depends on speed.
function naiveCheck() {
  const url = pageUrlAt(50);
  return url === '/dashboard' ? 'PASS' : 'FAIL (url was ' + url + ')';
}

// WEB-FIRST: retry the assertion every 100 ms until it passes or the timeout (like expect(page).toHaveURL).
function webFirst(timeout = 5000, interval = 100) {
  for (let t = 50; t <= 50 + timeout; t += interval) {
    if (pageUrlAt(t) === '/dashboard') return 'PASS after ' + (t - 50) + ' ms of waiting';
  }
  return 'FAIL: timed out after ' + timeout + ' ms, last url ' + pageUrlAt(50 + timeout);
}

console.log('naive check once :', naiveCheck());
console.log('web-first retry  :', webFirst());
console.log('only a 1s ceiling :', webFirst(1000));   // the app needs 1200 ms, so this gives up at 1000 ms
// Lesson: never "sleep(2000)". Wait for the CONDITION, with a ceiling.` },
      { lang: 'js', check: false, title: 'playwright.config.js', code: `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,                       // tests in different files AND the same file run in parallel
  retries: process.env.CI ? 2 : 0,           // retry only in CI, so flakiness is visible locally
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',                 // record a trace only when a test had to retry
    screenshot: 'only-on-failure'
  },
  webServer: {                               // start the app before tests, wait until the URL answers
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ]
});` },
      { lang: 'js', check: false, title: 'A login test (e2e/login.spec.js)', code: `import { test, expect } from '@playwright/test';

test.describe('login', () => {
  test('a valid user reaches the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Password').fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\\/dashboard$/);                                   // retries until true
    await expect(page.getByRole('heading', { name: 'Welcome back, Asha' })).toBeVisible();
  });

  test('a wrong password shows an error and stays on the page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\\/login$/);
  });
});` },
      { lang: 'js', check: false, title: 'Log in once, reuse everywhere (storageState) + mock the network', code: `// e2e/auth.setup.js : runs once before the other tests
import { test as setup, expect } from '@playwright/test';
setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_USER);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.context().storageState({ path: 'e2e/.auth/user.json' });   // cookies + localStorage saved
});
// in playwright.config.js: use: { storageState: 'e2e/.auth/user.json' }, dependencies: ['setup']

// e2e/orders.spec.js : fake a slow/failed backend without touching a real one
import { test, expect } from '@playwright/test';
test('shows a friendly message when the orders API fails', async ({ page }) => {
  await page.route('**/api/orders', (route) => route.fulfill({ status: 500, json: { error: 'down' } }));
  await page.goto('/orders');
  await expect(page.getByRole('alert')).toContainText('could not load your orders');
});` },
      { lang: 'bash', title: 'Day-to-day commands', code: `npx playwright install --with-deps      # download browsers (and OS libraries on CI)
npx playwright test                      # run everything, headless, in parallel
npx playwright test login --project=webkit --headed
npx playwright test --ui                 # interactive runner with time travel
npx playwright show-report               # open the HTML report
npx playwright show-trace trace.zip      # inspect a failed CI run step by step
npx playwright codegen http://localhost:5173   # record clicks into test code` }
    ],
    codeTitle: ['Auto-wait model (runnable)', 'playwright.config.js', 'Login spec', 'storageState + route', 'CLI'],
    viz: [
      {
        title: 'A Playwright login test, step by step',
        input: '1200',
        inputLabel: 'ms the login API takes to answer (0-9000)',
        gen: function (input) {
          var ms = Number(String(input).trim());
          if (!(ms >= 0 && ms <= 9000)) throw new Error('Type a number of milliseconds between 0 and 9000');
          var timeout = 5000, passes = ms <= timeout, frames = [];
          frames.push(F('The test file lives in the <b>test runner</b> (a Node process). It starts a fresh browser context, then sends commands to the page one at a time. Our app\'s login API will take <b>' + ms + ' ms</b>.',
            [e2eGraph({ T: 'cur' }, {}, { T: 'spec', B: 'fresh context' })]));
          frames.push(F('<code>await page.goto("/login")</code>: the browser requests the login page from the web server and waits for the <b>load</b> event.',
            [e2eGraph({ T: 'ok', B: 'cur', S: 'cur' }, { 'T-B': 'ok', 'B-S': 'sel' }, {})]));
          frames.push(F('<code>getByLabel("Email").fill(...)</code> and <code>getByLabel("Password").fill(...)</code>: Playwright first checks each field is visible and enabled (<b>actionability</b>), then types. Nothing hits the network yet.',
            [e2eGraph({ T: 'ok', B: 'cur' }, { 'T-B': 'ok' }, { B: 'fields filled' })]));
          frames.push(F('<code>getByRole("button", { name: "Sign in" }).click()</code>: the browser sends <b>POST /api/login</b>. The test line returns right after the click was performed - it does <i>not</i> wait for the answer.',
            [e2eGraph({ T: 'ok', B: 'ok', S: 'cur', A: 'cur' }, { 'T-B': 'ok', 'B-S': 'sel', 'S-A': 'sel' }, { A: ms + ' ms' })]));
          frames.push(F('<code>await expect(page).toHaveURL(/dashboard/)</code>: a <b>web-first assertion</b>. It checks, waits a little, checks again... up to <b>' + timeout + ' ms</b>. The API needs ' + ms + ' ms, so ' + (passes ? 'it fits inside the limit.' : '<span class="c-r">it does not fit.</span>'),
            [e2eGraph({ T: 'cur', B: 'cur', A: 'cur', D: ms > 0 ? 'cur' : '' }, { 'S-A': 'sel', 'A-D': 'sel' }, { T: 'polling every ~100ms' }), { type: 'bars', label: 'API time vs assertion limit (ms)', values: [ms, timeout], idxLabels: ['login API', 'expect timeout'], hl: { 0: passes ? 'ok' : 'bad' } }]));
          frames.push(passes ? F('<span class="c-g">The page navigated to /dashboard at ' + ms + ' ms.</span> The assertion passes on its next poll. Notice there was no <code>sleep</code>: a fast server makes the test fast, a slow-but-OK server still passes.',
            [e2eGraph({ T: 'ok', B: 'ok', S: 'ok', A: 'ok', D: 'ok' }, { 'T-B': 'ok', 'B-S': 'ok', 'S-A': 'ok', 'A-D': 'ok' }, { B: '/dashboard' })])
            : F('<span class="c-r">Timeout.</span> After ' + timeout + ' ms the assertion fails: "Expected pattern /dashboard/, received /login". Playwright saves the trace so you can see in the recording that the request was still pending. Real fix: speed up the API or investigate; only raise the timeout if slowness is expected.',
              [e2eGraph({ T: 'bad', B: 'bad', A: 'cur' }, { 'T-B': 'bad' }, { B: 'still /login' })]));
          frames.push(F('Afterwards the browser context is thrown away: cookies, storage and cache vanish, so the next test starts clean. That isolation is why E2E tests can run <b>in parallel</b> without fighting.',
            [{ type: 'vars', vals: { result: passes ? 'passed' : 'failed (timeout)', 'wasted sleep': '0 ms' }, hl: { result: passes ? 'ok' : 'bad' } }]));
          return frames;
        }
      },
      {
        title: 'Auto-wait: actionability checks before a click',
        input: '400',
        inputLabel: 'ms a loading overlay covers the button (0-3000)',
        gen: function (input) {
          var cover = Number(String(input).trim());
          if (!(cover >= 0 && cover <= 3000)) throw new Error('Type a number of milliseconds between 0 and 3000');
          cover = Math.round(cover / 100) * 100;
          var frames = [], clicked = -1, t, hl = {}, rows = [];
          frames.push(F('The test runs <code>click()</code> on "Pay now". Before touching it Playwright checks five things, again and again, until all are true: <b>attached</b> to the DOM, <b>visible</b>, <b>stable</b> (not moving), <b>enabled</b>, and <b>receives events</b> (nothing on top of it). A spinner overlay covers the button for <b>' + cover + ' ms</b>.',
            [TB('Actionability checks', ['time', 'attached', 'visible', 'stable', 'enabled', 'not covered', 'action'], [])]));
          for (t = 0; t <= 3000; t += 100) {
            var covered = t < cover;
            rows.push([t + ' ms', 'yes', 'yes', 'yes', 'yes', covered ? 'NO (spinner)' : 'yes', covered ? 'wait 100 ms' : 'CLICK']);
            hl[rows.length - 1] = covered ? 'bad' : 'ok';
            frames.push(F(covered ? 'At <b>' + t + ' ms</b> the spinner overlay still sits on top of the button. A real click would hit the spinner, so Playwright <span class="c-y">keeps waiting</span> and retries.' : 'At <b>' + t + ' ms</b> every check passes. Playwright performs the click <b>now</b>. A hand-written <code>sleep(3000)</code> would have wasted ' + (3000 - t) + ' ms here, or been too short if the overlay lasted longer.',
              [TB('Actionability checks', ['time', 'attached', 'visible', 'stable', 'enabled', 'not covered', 'action'], rows.slice(), JSON.parse(JSON.stringify(hl)))]));
            if (!covered) { clicked = t; break; }
          }
          frames.push(F('Total waiting: <b>' + clicked + ' ms</b>, exactly as long as needed. If the condition never became true, the action would fail at the <b>action timeout</b> with a log like "element intercepts pointer events", which tells you precisely what was wrong.',
            [{ type: 'vars', vals: { 'clicked at': clicked + ' ms', 'sleep used': 'none' }, hl: { 'clicked at': 'ok' } }]));
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Locators: stable by design',
        html: `<p>A <b>locator</b> is not an element; it is a <i>description</i> that Playwright re-resolves each time. If React re-renders and replaces the button, the next action finds the new one. That is why you can store <code>const save = page.getByRole("button", { name: "Save" })</code> early and use it later.</p>`,
        code: { lang: 'js', check: false, code: `// prefer user-facing locators
page.getByRole('button', { name: 'Save' });
page.getByLabel('Email');
page.getByText('Order confirmed');
page.getByTestId('cart-count');                       // last resort: needs data-testid in the markup
// narrow inside a region instead of using fragile CSS paths
const row = page.getByRole('row', { name: /Asha/ });
await row.getByRole('button', { name: 'Delete' }).click();` }
      },
      {
        title: 'The flaky test checklist',
        html: `<p>A flaky test passes and fails with no code change. Go through the usual suspects: (1) <b>fixed sleeps</b> or <code>waitForTimeout</code> (replace with an assertion on the thing you wait for); (2) <b>shared data</b> (two tests use the same user and delete each other's cart; give each worker its own data); (3) <b>animations</b> (disable them in test mode with <code>reducedMotion</code> or CSS); (4) <b>un-awaited promises</b> (a missing <code>await</code> before <code>click</code>); (5) <b>depending on third parties</b> (mock them); (6) <b>testing too much in one test</b>. Turn on <code>trace: "on-first-retry"</code> and open the trace instead of guessing.</p>`
      },
      {
        title: 'What belongs in E2E and what does not',
        html: `<p>Keep E2E for <b>journeys that cross layers</b>: sign up (form → API → email link → login), checkout (cart → payment → confirmation). Do <b>not</b> use it to test every validation message (a unit or RTL test does that in 5 ms) or every combination of filters. A common rule: write the E2E test only if a bug there would cost money or trust, and if the lower layers cannot cover it. 20 great E2E tests beat 400 shaky ones.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Architecture.</b> Playwright launches a browser (or connects to one) and speaks its <b>debugging protocol</b> (Chrome DevTools Protocol for Chromium; patched builds for Firefox and WebKit) over a pipe or WebSocket. The runner is Node; each worker process owns its browsers and runs tests from the queue. A <b>context</b> is a cheap isolated profile inside one browser process (milliseconds to create), which is why per-test isolation is affordable. Because commands go over a protocol, Playwright can do things in-page scripts cannot: multiple tabs and origins, file downloads/uploads, geolocation and permission grants, request interception, and emulating devices.</p>
      <p><b>Auto-waiting internals:</b> actions run a small injected script that evaluates the actionability conditions and, for "stable", compares bounding boxes across two animation frames. Assertions with <code>expect(locator)</code> poll with increasing intervals (about 100, 250, 500, 1000 ms). Timeouts are layered: <b>test</b> (30 s), <b>expect</b> (5 s), <b>action</b> (none by default, bounded by the test), <b>navigation</b>. In CI, <b>sharding</b> (<code>--shard=1/4</code>) splits files across machines and a merge step combines the reports.</p>
      <p><b>Production practice:</b> test against a <b>production-like build</b> (<code>vite preview</code>), not the dev server; seed data through an API or database fixture, not through the UI; keep secrets in CI variables; upload the HTML report and traces as artifacts; track flakiness rate and fix or delete quarantined tests within a deadline. <b>Visual regression</b> (<code>toHaveScreenshot</code>) compares pixels, but fonts and OS differences cause noise, so run it in the same Docker image everywhere. <b>Accessibility</b> checks are cheap to add with <code>@axe-core/playwright</code> on each key page. A good E2E suite also exercises the <b>deployed preview URL</b> of every pull request.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI agents can now <b>drive a browser</b> (Playwright MCP, computer-use tools) to explore your app, record a flow and turn it into a spec file. They can read a failed trace or a screenshot and propose a fix. This makes writing the first draft of an E2E test very cheap, and shifts the real skill to <b>choosing what to cover and keeping tests reliable</b>.</p>
      <p><b>Work alongside it:</b> let the agent run <code>codegen</code> or explore the page, but give it rules: <code>role/label locators only, no waitForTimeout, one journey per test, seed data via API</code>. When a test fails in CI, paste the error and the trace summary and ask <code>What is the most likely root cause: app bug, test bug, or environment?</code>.</p>
      <p><b>Where it goes wrong:</b> it adds <code>waitForTimeout(2000)</code> or <code>{ force: true }</code> to make a failure disappear (hiding a real overlay bug), builds locators from brittle CSS, or asserts only that "no error was thrown". Self-healing test tools can silently adapt to a <i>broken</i> UI and keep passing. <b>You must still own:</b> the list of critical journeys, the definition of "correct", reviewing every assertion, and watching flake rates over time.</p>`,
    problems: [{
      title: 'A Playwright Login Test',
      level: 'Medium', tags: ['playwright', 'e2e', 'auth'], companies: ['Microsoft', 'Stripe'],
      statement: `<p>Your app has a login page at <code>/login</code> with a field labelled <b>Email</b>, a field labelled <b>Password</b> and a button named <b>Sign in</b>. A successful login redirects to <code>/dashboard</code> and shows a heading "Welcome back, Asha". A failed login stays on <code>/login</code> and shows an element with role <code>alert</code> containing "Invalid email or password". Submitting with empty fields shows "Email is required". Write a Playwright spec with three tests covering these behaviours, with no fixed sleeps.</p>`,
      constraints: `Use <code>@playwright/test</code>, a <code>baseURL</code> from config (so use relative paths), locators by role or label, and web-first assertions only.`,
      example: `${H.table(['Test', 'Steps', 'Expect'], [['valid user', 'fill both fields, click Sign in', H.c('g', 'URL /dashboard, heading "Welcome back, Asha"')], ['wrong password', 'fill email + wrong password, click', H.c('r', 'alert "Invalid email or password", URL still /login')], ['empty form', 'click Sign in immediately', H.c('r', 'alert "Email is required"')]])}`,
      brute: { why: `<p>Fixed sleeps and CSS selectors: too short on a slow CI machine (flaky failure), too long everywhere else (slow suite), and the selectors break at the next design tweak. <code>isVisible()</code> checks once and does not wait.</p>`, code: { lang: 'js', check: false, code: `test('login', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'asha@example.com');          // brittle id
  await page.fill('#pw', 'correct-horse-battery');
  await page.click('.btn.btn-primary');                    // brittle class
  await page.waitForTimeout(3000);                         // slow AND flaky
  expect(await page.isVisible('h1')).toBe(true);          // checks once
});` } },
      mcq: { q: 'Which assertion waits for the redirect to happen?', options: ['await expect(page).toHaveURL(/dashboard/)', 'expect(page.url()).toContain("dashboard")', 'expect(await page.isVisible("h1")).toBe(true)', 'await page.waitForTimeout(3000)'], answer: 0, explain: 'toHaveURL is a web-first assertion: it retries until the URL matches or the timeout is reached. page.url() is read once, isVisible checks once, and a sleep guesses.' },
      hints: [`<p>Hint 1: Group three tests in <code>test.describe("login")</code>. Each starts with <code>await page.goto("/login")</code> (every test has a fresh browser context).</p>`, `<p>Hint 2: Use <code>getByLabel("Email")</code>, <code>getByLabel("Password")</code>, <code>getByRole("button", { name: "Sign in" })</code>. Assert with <code>expect(page).toHaveURL</code> and <code>expect(locator).toBeVisible/toHaveText</code>.</p>`, `<p>Hint 3: For the error cases also assert you are still on <code>/login</code>. Put the repeated three steps in a small helper <code>login(page, email, password)</code> to avoid copy-paste. Recipe: helper + 3 tests, zero sleeps.</p>`],
      solution: {
        approach: `<p>One helper fills the form and clicks; each test then asserts the visible outcome with retrying assertions. Locators are user-facing (label and role), so the tests survive markup changes, and nothing sleeps.</p>`,
        code: { lang: 'js', check: false, code: `import { test, expect } from '@playwright/test';

async function login(page, email, password) {
  await page.goto('/login');
  if (email) await page.getByLabel('Email').fill(email);
  if (password) await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('login', () => {
  test('valid credentials open the dashboard', async ({ page }) => {
    await login(page, 'asha@example.com', 'correct-horse-battery');
    await expect(page).toHaveURL(/\\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Welcome back, Asha' })).toBeVisible();
  });

  test('a wrong password shows an error and stays on /login', async ({ page }) => {
    await login(page, 'asha@example.com', 'not-the-password');
    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\\/login$/);
  });

  test('empty form asks for an email', async ({ page }) => {
    await login(page, '', '');
    await expect(page.getByRole('alert')).toHaveText('Email is required');
    await expect(page).toHaveURL(/\\/login$/);
  });
});` },
        complexity: `<p>Each test costs roughly one page load plus one API call (about 1 to 3 seconds). Three tests run in parallel in separate contexts.</p>`,
        followUps: ['Log in once with storageState and reuse it for dashboard tests', 'Mock the login API with page.route to test a 500 error without a real backend']
      }
    }]
  });

  /* ---------- CI pipeline model ---------- */
  var CI_STAGES = {
    install: { x: 9, y: 30, deps: [], sec: 40, label: 'install' },
    lint: { x: 33, y: 8, deps: ['install'], sec: 20, label: 'lint' },
    types: { x: 33, y: 30, deps: ['install'], sec: 30, label: 'typecheck' },
    test: { x: 33, y: 52, deps: ['install'], sec: 45, label: 'unit tests' },
    build: { x: 57, y: 30, deps: ['lint', 'types', 'test'], sec: 60, label: 'build' },
    e2e: { x: 75, y: 30, deps: ['build'], sec: 120, label: 'e2e' },
    deploy: { x: 92, y: 30, deps: ['e2e'], sec: 30, label: 'deploy' }
  };
  var CI_ORDER = ['install', 'lint', 'types', 'test', 'build', 'e2e', 'deploy'];
  var CI_WAVES = [['install'], ['lint', 'types', 'test'], ['build'], ['e2e'], ['deploy']];
  function ciGraph(hl, ehl, tags) {
    var edges = [];
    CI_ORDER.forEach(function (k) { CI_STAGES[k].deps.forEach(function (d) { edges.push([d, k, '']); }); });
    return {
      type: 'graph', label: 'Pipeline (each box is a job; arrows mean "needs")', directed: true, height: 60,
      nodes: CI_ORDER.map(function (k) { return { id: k, label: CI_STAGES[k].label, x: CI_STAGES[k].x, y: CI_STAGES[k].y, shape: 'box' }; }),
      edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }
  function ciDescendants(k) {
    var out = {};
    (function walk(n) { CI_ORDER.forEach(function (m) { if (CI_STAGES[m].deps.indexOf(n) >= 0 && !out[m]) { out[m] = true; walk(m); } }); })(k);
    return out;
  }

  /* ================================================================
     TOPIC 9 - CI pipelines
     ================================================================ */
  topics.push({
    title: 'Continuous Integration: Pipelines, Caching & Quality Gates',
    analogy: `<p>A <b>CI pipeline is an airport security line for your code</b>. Every change (a passenger) must pass the same checkpoints in order: ID check (install and lint), baggage scan (type-check and tests), then the gate (build and deploy). Nobody is exempt, however senior. The line is fast because several scanners work <b>in parallel</b>, and the same bag is not unpacked twice because results are <b>cached</b>. If one checkpoint raises an alarm, the passenger stops there and does not board (the pull request cannot merge).</p>`,
    explain: `<p>🟢 <b>Continuous Integration (CI)</b> means: every time someone pushes code or opens a pull request (PR), a server automatically builds the project and runs the checks, on a clean machine, the same way every time. It answers "does this change break anything?" within minutes, before a human reviews it. <b>Continuous Delivery/Deployment (CD)</b> goes one step further: if everything is green, the build is shipped (to a preview URL, staging, or production).</p>
      <p>🔵 <b>Typical frontend pipeline stages:</b></p>
      ${H.table(['Stage', 'Command', 'Catches', 'Time'], [
        ['Install', '<code>npm ci</code> / <code>pnpm install --frozen-lockfile</code>', 'Lockfile out of sync, missing packages', '10-60 s (cached: 3 s)'],
        ['Lint + format check', '<code>eslint .</code>, <code>prettier --check .</code>', 'Bugs, style drift', '10-30 s'],
        ['Type-check', '<code>tsc --noEmit</code>', 'Type errors Vite ignores', '20-60 s'],
        ['Unit + component tests', '<code>vitest run --coverage</code>', 'Logic and UI regressions', '30-120 s'],
        ['Build', '<code>vite build</code>', 'Broken imports, bundle too large (budget)', '30-120 s'],
        ['E2E', '<code>playwright test</code> against the built app or a preview', 'Broken user journeys', '2-10 min'],
        ['Deploy', 'upload to CDN / hosting', '(nothing, it ships)', '10-60 s']
      ])}
      <p>🔵 <b>Speed tricks.</b> <b>Parallel jobs</b>: lint, types and tests do not depend on each other, so run them side by side (total time = the slowest, not the sum). <b>Caching</b>: store the package manager cache (and build caches) keyed by a hash of the lockfile; if the lockfile did not change, restore in seconds. <b>Matrix</b>: run the same job over several Node versions or operating systems. <b>Cancel outdated runs</b> when you push again. <b>Fail fast</b>: put cheap checks first so a typo fails in 20 seconds, not 8 minutes.</p>
      <p>🔵 <b>Quality gates.</b> Mark the important jobs as <b>required status checks</b> in branch protection: a PR cannot merge until they are green and someone approved. Add <b>coverage thresholds</b>, <b>bundle-size budgets</b>, <b>Lighthouse CI</b> scores and <b>dependency audit</b> as extra gates. The popular hosts: <b>GitHub Actions</b> (YAML files in <code>.github/workflows/</code>), GitLab CI, CircleCI, Jenkins. A <b>preview deployment</b> per PR (Vercel, Netlify, Cloudflare) lets reviewers click the real change.</p>
      <p>🔵 <b>Secrets and safety.</b> Tokens live in the CI secret store, never in the repository. Give the workflow the <b>least permission</b> (<code>permissions: contents: read</code>). Be careful with PRs from forks (they should not see secrets). Pin third-party actions to a version or commit SHA.</p>`,
    clues: [
      '"design a CI/CD pipeline for a React app" → install → lint/types/test in parallel → build → e2e → deploy preview/prod, with caching',
      '"the pipeline takes 25 minutes" → parallelise, cache dependencies and build output, shard tests, run affected-only (nx/turbo), cancel stale runs',
      '"how do you stop broken code reaching main?" → branch protection + required checks + review; no direct pushes',
      '"works locally, fails in CI" → different Node version, uncommitted lockfile, env vars, case-sensitive file names on Linux',
      '"rollback strategy" → immutable hashed assets, previous build kept, one-click redeploy, feature flags',
      '"secrets in a frontend pipeline" → CI secret store, short-lived tokens (OIDC), never <code>VITE_</code> variables for secrets'
    ],
    code: [
      { lang: 'js', run: true, title: 'Run a pipeline graph: waves, failure and skipped jobs (runnable)', code: `// Each job lists what it "needs" and how long it takes (seconds).
const jobs = {
  install: { needs: [], sec: 40 },
  lint:    { needs: ['install'], sec: 20 },
  types:   { needs: ['install'], sec: 30 },
  test:    { needs: ['install'], sec: 45 },
  build:   { needs: ['lint', 'types', 'test'], sec: 60 },
  e2e:     { needs: ['build'], sec: 120 },
  deploy:  { needs: ['e2e'], sec: 30 }
};

function runPipeline(jobs, failing) {
  const status = {};                           // job -> 'passed' | 'failed' | 'skipped'
  let wall = 0;
  const names = Object.keys(jobs);
  while (names.some((n) => !status[n])) {
    // a "wave" = every job whose needs are all finished: they run in PARALLEL
    const wave = names.filter((n) => !status[n] && jobs[n].needs.every((d) => status[d]));
    const runnable = wave.filter((n) => jobs[n].needs.every((d) => status[d] === 'passed'));
    wave.forEach((n) => { if (!runnable.includes(n)) status[n] = 'skipped'; });   // a needed job failed or was skipped
    runnable.forEach((n) => { status[n] = n === failing ? 'failed' : 'passed'; });
    if (runnable.length) wall += Math.max(...runnable.map((n) => jobs[n].sec));    // parallel: the slowest decides
    console.log('wave', wave.join(', ').padEnd(24), '->', wave.map((n) => n + ':' + status[n]).join('  '));
  }
  const sequential = names.filter((n) => status[n] !== 'skipped').reduce((s, n) => s + jobs[n].sec, 0);
  console.log('wall time:', wall + 's', '| if run one-by-one:', sequential + 's');
  console.log('PR check:', Object.values(status).includes('failed') ? 'RED - merge blocked' : 'GREEN - can merge');
}
console.log('--- all good ---');   runPipeline(jobs, null);
console.log('--- unit tests fail ---'); runPipeline(jobs, 'test');` },
      { lang: 'yaml', title: '.github/workflows/ci.yml', code: `name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# a new push to the same PR cancels the older run
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read            # least privilege

jobs:
  check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [22, 24]      # run the whole job on two Node versions
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          cache: npm                  # caches ~/.npm, key = hash of package-lock.json
      - run: npm ci                   # exact versions from the lockfile
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test -- --coverage
      - run: npm run build
      - uses: actions/upload-artifact@v4
        if: matrix.node == 22
        with:
          name: dist
          path: dist
          retention-days: 7

  e2e:
    needs: check                       # only if the cheap checks passed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()                  # keep the report/trace only when something broke
        with:
          name: playwright-report
          path: playwright-report

  deploy:
    needs: [check, e2e]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production            # can require a human approval
    permissions:
      contents: read
      id-token: write                  # short-lived cloud credentials via OIDC, no stored keys
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - run: ./scripts/deploy.sh dist
        env:
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}` },
      { lang: 'json', title: 'renovate.json: automated dependency PRs that go through the same pipeline', code: `{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "schedule": ["before 6am on monday"],
  "packageRules": [
    { "matchUpdateTypes": ["minor", "patch"], "matchDepTypes": ["devDependencies"], "automerge": true },
    { "matchUpdateTypes": ["major"], "labels": ["breaking"], "automerge": false }
  ],
  "lockFileMaintenance": { "enabled": true }
}` }
    ],
    codeTitle: ['Pipeline runner (runnable)', 'GitHub Actions workflow', 'renovate.json'],
    viz: [
      {
        title: 'CI pipeline: stages, parallel jobs and a failing step',
        input: 'fail=test',
        inputLabel: 'which job fails (install, lint, types, test, build, e2e, deploy, or none)',
        gen: function (input) {
          var m = String(input).trim().match(/^fail\s*=\s*(\w+)$/);
          if (!m || (m[1] !== 'none' && !CI_STAGES[m[1]])) throw new Error('Type fail=test (or lint, types, build, e2e, deploy, install, none)');
          var failing = m[1] === 'none' ? null : m[1], hl = {}, ehl = {}, tags = {}, frames = [], wall = 0, rows = [], statusOf = {};
          var skipped = failing ? ciDescendants(failing) : {};
          frames.push(F('A developer pushes a pull request. The CI server creates a clean machine and reads the workflow file. Jobs form a graph: an arrow means "needs". <code>lint</code>, <code>typecheck</code> and <code>unit tests</code> all need only <code>install</code>, so they can run <b>at the same time</b>.',
            [ciGraph({}, {}, { install: 'starts first' }), { type: 'queue', label: 'Job order', items: CI_ORDER.map(function (k) { return CI_STAGES[k].label; }), hl: {}, frontLabel: 'first', backLabel: 'last' }]));
          CI_WAVES.forEach(function (wave) {
            var runnable = wave.filter(function (k) { return !skipped[k]; });
            if (!runnable.length) {
              wave.forEach(function (k) { hl[k] = 'done'; tags[k] = 'skipped'; statusOf[k] = 'skipped'; rows.push([CI_STAGES[k].label, 'skipped', '0 s']); });
              frames.push(F('<b>' + wave.map(function (k) { return CI_STAGES[k].label; }).join(', ') + '</b> never start: a job they <i>need</i> failed, so GitHub marks them <b>skipped</b>. No minutes are wasted building or deploying broken code.', [ciGraph(JSON.parse(JSON.stringify(hl)), ehl, tags)]));
              return;
            }
            var running = JSON.parse(JSON.stringify(hl));
            runnable.forEach(function (k) { running[k] = 'cur'; tags[k] = CI_STAGES[k].sec + ' s'; });
            frames.push(F('Running now' + (runnable.length > 1 ? ' <b>in parallel</b>' : '') + ': <b>' + runnable.map(function (k) { return CI_STAGES[k].label; }).join(', ') + '</b>. ' + (runnable.length > 1 ? 'The wave lasts as long as its slowest job (' + Math.max.apply(null, runnable.map(function (k) { return CI_STAGES[k].sec; })) + ' s), not the sum.' : ''),
              [ciGraph(running, ehl, tags)]));
            wall += Math.max.apply(null, runnable.map(function (k) { return CI_STAGES[k].sec; }));
            var anyBad = false;
            runnable.forEach(function (k) {
              var bad = k === failing;
              hl[k] = bad ? 'bad' : 'ok'; statusOf[k] = bad ? 'FAILED' : 'passed';
              rows.push([CI_STAGES[k].label, bad ? 'FAILED' : 'passed', CI_STAGES[k].sec + ' s']);
              CI_ORDER.forEach(function (n) { if (CI_STAGES[n].deps.indexOf(k) >= 0) ehl[k + '-' + n] = bad ? 'bad' : 'ok'; });
              if (bad) anyBad = true;
            });
            frames.push(F(anyBad ? '<span class="c-r">' + CI_STAGES[failing].label + ' FAILED.</span> The job exits with a non-zero code. ' + (runnable.length > 1 ? 'The other parallel jobs finish (or are cancelled with fail-fast) but ' : 'Everything that ') + '<b>needs</b> it will be skipped.' : '<span class="c-g">' + runnable.map(function (k) { return CI_STAGES[k].label; }).join(', ') + ' passed.</span> The next jobs may start.',
              [ciGraph(JSON.parse(JSON.stringify(hl)), ehl, tags)]));
          });
          var total = CI_ORDER.reduce(function (s, k) { return s + (skipped[k] ? 0 : CI_STAGES[k].sec); }, 0);
          frames.push(F(failing ? '<span class="c-r">PR check: RED.</span> Branch protection marks the required check as failed, so the <b>merge button is disabled</b>. The author sees the log, fixes the code, pushes again, and a new run starts (the old one is cancelled).' : '<span class="c-g">PR check: GREEN.</span> With review approval the PR can merge, and the same pipeline then runs on <code>main</code> and deploys.',
            [{ type: 'vars', vals: { 'wall time': wall + ' s', 'if run one-by-one': total + ' s', 'merge': failing ? 'blocked' : 'allowed' }, hl: { merge: failing ? 'bad' : 'ok', 'wall time': 'sel' } }, TB('Run summary', ['job', 'result', 'duration'], rows, (function () { var h = {}; rows.forEach(function (r, i) { h[i] = r[1] === 'FAILED' ? 'bad' : r[1] === 'skipped' ? 'done' : 'ok'; }); return h; })())]));
          return frames;
        }
      },
      {
        title: 'Dependency cache: hit or miss?',
        input: 'a b! c d! e',
        inputLabel: 'commits in order (! = package-lock.json changed)',
        gen: function (input) {
          var toks = words(input);
          if (toks.length < 2 || toks.length > 8) throw new Error('Give 2 to 8 commits like: a b! c (a ! means the lockfile changed)');
          toks.forEach(function (t) { if (!/^[A-Za-z0-9]+!?$/.test(t)) throw new Error('Bad commit "' + t + '". Use letters/digits, optional trailing !'); });
          var version = 1, saved = {}, rows = [], hl = {}, times = [], labels = [], frames = [];
          frames.push(F('The cache key is built from a <b>hash of the lockfile</b>: <code>npm-<i>hash</i></code>. Same lockfile → same key → restore the stored <code>node_modules</code> download cache (about <b>3 s</b>). Changed lockfile → new key → nothing found → a full <code>npm ci</code> (about <b>55 s</b>), then the new cache is saved.',
            [{ type: 'map', label: 'Cache store (starts empty)', entries: [] }]));
          toks.forEach(function (t, i) {
            var name = t.replace('!', ''), changed = /!$/.test(t);
            if (changed) version++;
            var key = 'npm-lock-v' + version, hit = !!saved[key];
            saved[key] = true;
            rows.push([name, changed ? 'yes' : 'no', key, hit ? 'HIT' : 'MISS', hit ? '3 s' : '55 s']);
            hl[i] = hit ? 'ok' : 'bad';
            times.push(hit ? 3 : 55); labels.push(name);
            frames.push(F('Commit <b>' + esc(name) + '</b>: the lockfile ' + (changed ? '<span class="c-y">changed</span>, so the key becomes <b>' + key + '</b>' : 'is the same, key stays <b>' + key + '</b>') + '. ' + (hit ? '<span class="c-g">Cache HIT</span>: restored in about 3 seconds.' : '<span class="c-r">Cache MISS</span>: nothing stored under this key, install from the network (about 55 s) and save it for next time.'),
              [TB('Pipeline runs', ['commit', 'lockfile changed?', 'cache key', 'result', 'install time'], rows.slice(), JSON.parse(JSON.stringify(hl))), { type: 'map', label: 'Cache store', entries: Object.keys(saved).map(function (k) { return [k, 'saved']; }), hl: (function () { var h = {}; h[key] = hit ? 'ok' : 'sel'; return h; })() }]));
          });
          var withCache = times.reduce(function (a, b) { return a + b; }, 0), without = toks.length * 55;
          frames.push(F('Over ' + toks.length + ' runs you spent <b>' + withCache + ' s</b> installing instead of <b>' + without + ' s</b> without a cache: saved <b class="c-g">' + (without - withCache) + ' s</b> (and a lot of network and registry load). Every developer waiting on a PR feels this.',
            [{ type: 'bars', label: 'Install seconds per run', values: times, idxLabels: labels, hl: hl }]));
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Reading a failing run in the logs',
        html: `<p>A PR shows a red cross. Open the failed job and read <b>from the bottom up</b>: the last red step is the culprit, and the lines just above it are the error. Typical findings: <code>npm ERR! ... package-lock.json is not in sync</code> (you changed package.json but forgot the lockfile), <code>error TS2322</code> (a type error that Vite ignored locally), a Linux-only failure such as <code>Cannot find module './Button'</code> when the file is really <code>button.tsx</code> (macOS/Windows file systems ignore case, Linux does not), or <code>Process completed with exit code 1</code> from a test with the real assertion above it. Re-run once to see whether the failure repeats: if not, it is flaky, and flakiness is a bug to fix.</p>`
      },
      {
        title: 'Branch protection: the rule that makes CI matter',
        html: `<p>A pipeline nobody has to obey is only a suggestion. In the repository settings you protect <code>main</code>: <b>require a pull request</b>, <b>require status checks</b> (<code>check</code>, <code>e2e</code>) to pass and the branch to be up to date, <b>require 1+ approval</b>, block force-push, and optionally use a <b>merge queue</b> which re-tests each PR on top of the others before merging. Now "it was green on my branch" cannot become "main is broken" when two PRs conflict semantically.</p>`
      },
      {
        title: 'Preview deployments and release safety',
        html: `<p>For each PR the pipeline builds the app and publishes it to a unique URL (<code>pr-482.preview.example.com</code>). Designers and product managers click it before merging, and Playwright can run against that URL. For production: because filenames contain content hashes, a new release never overwrites the old files; rolling back means pointing <code>index.html</code> at the previous build. Pair deploys with <b>feature flags</b> so risky code ships dark and is switched on gradually, and with <b>error monitoring</b> that can alert on a spike in the first minutes after a release.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How runners work.</b> A CI job is a script executed on a <b>runner</b>: an ephemeral VM or container started for that job and thrown away after. That is why every run starts from nothing, and why caches and artifacts exist: the <b>cache</b> is keyed storage that survives between runs (an optimisation, may be missing, never rely on it for correctness); an <b>artifact</b> is a file produced by one job and handed to another or kept for humans (the built <code>dist</code>, test reports). Jobs run in parallel unless they <code>needs:</code> another; steps inside a job run in order and share a filesystem.</p>
      <p><b>Cache design.</b> Key by a hash of everything that should invalidate it (<code>hashFiles('**/package-lock.json')</code>) with <b>restore-keys</b> fallbacks to a partial match (older cache, then install only the diff). Cache the package manager's store (npm cache, pnpm store), not <code>node_modules</code> itself, to avoid platform-specific breakage. Monorepos add <b>remote build caches</b> (Turborepo, Nx): hash each task's inputs, and if another machine already produced that output, download it and skip the work. <b>Affected-only</b> runs use the dependency graph (<code>nx affected</code>) so a change to one package does not rebuild everything.</p>
      <p><b>Security & reliability.</b> Supply-chain attacks target CI: pin actions to commit SHAs, use <code>permissions:</code> least privilege, use <b>OIDC</b> to get short-lived cloud credentials rather than long-lived keys, never run untrusted PR code with secrets (<code>pull_request_target</code> is a classic trap), and review dependency-update PRs. Make pipelines <b>deterministic</b>: lockfile, pinned Node version (<code>.nvmrc</code> or <code>engines</code>), pinned browser versions for Playwright. Measure <b>DORA</b> metrics (lead time, deploy frequency, change failure rate, time to restore): a pipeline that takes 40 minutes quietly discourages small, safe changes. Prefer <b>trunk-based development</b> with short-lived branches over long-lived ones so integration stays continuous.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI can draft a complete workflow file in seconds, explain a cryptic CI log, and bisect "which commit broke the build". Coding agents now open PRs themselves, so the CI pipeline becomes the <b>main safety system</b> for machine-written code: agents run the same checks, read the failure output, and iterate. Some teams add AI review bots as an extra (non-blocking) check.</p>
      <p><b>Work alongside it:</b> paste the failing log and ask <code>Summarise the root cause in two lines and show the smallest fix</code>. Ask it to <b>optimise</b> a slow workflow: <code>Here are my job timings; where can I parallelise or cache?</code>. Provide your constraints in the prompt (<code>pin actions to SHAs, least-privilege permissions, no secrets in forks</code>).</p>
      <p><b>Where it goes wrong:</b> it uses outdated action versions, invents inputs that do not exist, grants <code>permissions: write-all</code> to make an error vanish, adds <code>continue-on-error: true</code> to hide a red job, or "fixes" a flaky test by adding retries. AI-generated PRs can also overwhelm reviewers, so keep checks strict and PRs small. <b>You must still own:</b> branch protection settings, secret handling, which checks are required, and treating every workflow change as security-sensitive code.</p>`,
    problems: [{
      title: 'Write a CI Pipeline YAML',
      level: 'Medium', tags: ['github actions', 'ci', 'yaml', 'caching'], companies: ['GitHub', 'Atlassian'],
      statement: `<p>Write a GitHub Actions workflow <code>.github/workflows/ci.yml</code> for a Vite + React app that: runs on pull requests to <code>main</code> and on pushes to <code>main</code>; cancels older runs of the same branch; uses Node 22 with the npm cache; runs <code>npm ci</code>, lint, type-check, unit tests and build in a <b>job called check</b>; runs the Playwright tests in a second job <b>only after</b> <code>check</code> passes; uploads the Playwright report only when that job fails; and deploys only on a push to main, only after both jobs passed.</p>`,
      constraints: `Least-privilege <code>permissions</code>. No secrets hard-coded: the deploy token comes from <code>secrets.DEPLOY_TOKEN</code>. Use <code>actions/checkout@v4</code> and <code>actions/setup-node@v4</code>.`,
      example: `${H.table(['Event', 'check', 'e2e', 'deploy'], [['PR opened', H.c('g', 'runs'), H.c('g', 'runs if check ok'), H.c('m', 'skipped (not main)')], ['push to main', H.c('g', 'runs'), H.c('g', 'runs if check ok'), H.c('g', 'runs if both ok')], ['unit tests fail', H.c('r', 'FAILED'), H.c('m', 'skipped'), H.c('m', 'skipped')]])}`,
      brute: { why: `<p>One long job that does <code>npm install</code>, everything in sequence, no cache, no concurrency control, runs the deploy on every PR with broad permissions. It is slow (re-downloads packages each run), wastes minutes on stale runs, deploys unreviewed code and can leak secrets to forks.</p>`, code: { lang: 'yaml', code: `name: CI
on: [push, pull_request]
permissions: write-all          # far too much power
jobs:
  everything:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install        # not reproducible, no cache
      - run: npm run lint
      - run: npm test
      - run: npx playwright install && npx playwright test
      - run: npm run build
      - run: ./deploy.sh        # deploys even from pull requests!` } },
      mcq: { q: 'Which line makes the e2e job wait for the check job and skip if check fails?', options: ['needs: check', 'if: always()', 'concurrency: check', 'runs-on: check'], answer: 0, explain: '<code>needs</code> declares a dependency: the job starts only after the listed jobs succeed. If check fails, e2e is skipped automatically.' },
      hints: [`<p>Hint 1: Start from the triggers (<code>on:</code>) and add a <code>concurrency</code> group using the ref, with <code>cancel-in-progress: true</code>.</p>`, `<p>Hint 2: Three jobs: <code>check</code>, <code>e2e</code> (<code>needs: check</code>), <code>deploy</code> (<code>needs: [check, e2e]</code>). Use <code>setup-node</code> with <code>cache: npm</code> and <code>npm ci</code> in each job that installs.</p>`, `<p>Hint 3: Upload the report with <code>if: failure()</code>. Limit deploy with <code>if: github.ref == 'refs/heads/main' &amp;&amp; github.event_name == 'push'</code> and pass the secret via <code>env</code>. Set top-level <code>permissions: contents: read</code>.</p>`],
      solution: {
        approach: `<p>Three jobs forming a chain, each with the smallest permissions it needs. Caching is handled by <code>setup-node</code>, ordering by <code>needs</code>, and safety by the <code>if</code> condition on the deploy job.</p>`,
        code: { lang: 'yaml', code: `name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build

  e2e:
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report

  deploy:
    needs: [check, e2e]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: ./scripts/deploy.sh dist
        env:
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}` },
        complexity: `<p>Wall time = check + e2e + deploy in sequence, but inside each job the cache cuts install to seconds. Splitting lint, types and tests into parallel jobs would reduce <code>check</code> to its slowest part.</p>`,
        followUps: ['Run lint, types and tests as parallel jobs and make build depend on all of them', 'Add a Node 22 and 24 matrix and shard Playwright across 4 machines']
      }
    }]
  });

  /* ================================================================
     PRACTICE PROBLEMS  (Easy x4, Medium x6, Hard x4)
     ================================================================ */
  var R = String.raw;

  /* ---------- EASY 1 ---------- */
  practice.push({
    title: 'Is the Lockfile in Sync? (the npm ci check)',
    level: 'Easy', tags: ['npm', 'lockfile', 'semver'], companies: ['GitHub', 'Atlassian'],
    statement: `<p>Write <code>lockProblems(deps, lock)</code>. <code>deps</code> is the <code>dependencies</code> object of a package.json (<code>name → range</code>) and <code>lock</code> maps each package name to the exact version recorded in the lockfile. Return a list of messages for every dependency that is <b>missing</b> from the lockfile or whose locked version <b>does not satisfy</b> the range. This is the check that makes <code>npm ci</code> fail when someone edits package.json and forgets to commit the lockfile. Ranges are exact (<code>1.2.3</code>), <code>^1.2.3</code>, <code>~1.2.3</code> or <code>&gt;=1.2.3</code>.</p>`,
    constraints: `Up to 1000 dependencies. All versions are MAJOR.MINOR.PATCH. An empty result means the lockfile is in sync.`,
    example: `<p>deps <code>{ react: "^18.2.0", lodash: "~4.17.0", zod: "^3.0.0" }</code>, lock <code>{ react: "18.3.1", lodash: "4.18.0" }</code></p>${H.table(['package', 'verdict'], [['react', H.c('g', '18.3.1 satisfies ^18.2.0')], ['lodash', H.c('r', '4.18.0 is outside ~4.17.0 (needs &lt;4.18.0)')], ['zod', H.c('r', 'missing from lockfile')]])}`,
    brute: { why: `<p>Comparing the range string to the locked version as text (<code>"^18.2.0" === "18.3.1"</code>) is never true, so everything is reported as a mismatch. Even stripping the symbol and comparing equality rejects every valid caret upgrade.</p>`, code: `function lockProblemsBrute(deps, lock) {
  const out = [];
  for (const [name, range] of Object.entries(deps)) {
    if (lock[name] !== range.replace(/^[\\^~]/, '')) out.push(name + ' differs'); // wrong: ^18.2.0 allows 18.3.1
  }
  return out;
}` },
    mcq: { q: 'Which tuple is the exclusive upper bound of <code>~1.4.2</code>?', options: ['1.5.0', '2.0.0', '1.4.3', '1.4.99'], answer: 0, explain: 'Tilde allows patch updates only, so anything below the next MINOR (1.5.0) is accepted.' },
    hints: [`<p>Hint 1: Split a version "18.3.1" into three numbers so you can compare numerically, not as text.</p>`, `<p>Hint 2: Write <code>satisfies(version, range)</code>: parse the operator, build a lower bound (inclusive) and an upper bound (exclusive) and test the version between them.</p>`, `<p>Hint 3: Caret upper bound = next MAJOR (or next MINOR when MAJOR is 0). Tilde upper bound = next MINOR. Loop over deps: missing key → "missing"; not satisfied → "mismatch".</p>`],
    solution: {
      approach: `<p>Build a small <code>satisfies</code> function that works with number triples, then loop over the dependencies once and collect messages.</p>`,
      code: { lang: 'js', run: true, code: R`const parse = (v) => v.split('.').map(Number);
const cmp = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

function satisfies(version, range) {
  const m = range.match(/^([\^~]|>=)?(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error('unsupported range ' + range);
  const v = parse(version), lo = [+m[2], +m[3], +m[4]];
  if (cmp(v, lo) < 0) return false;                       // below the lower bound
  if (m[1] === '^') {
    const hi = lo[0] > 0 ? [lo[0] + 1, 0, 0] : lo[1] > 0 ? [0, lo[1] + 1, 0] : [0, 0, lo[2] + 1];
    return cmp(v, hi) < 0;
  }
  if (m[1] === '~') return cmp(v, [lo[0], lo[1] + 1, 0]) < 0;
  if (m[1] === '>=') return true;
  return cmp(v, lo) === 0;                                // exact
}

function lockProblems(deps, lock) {
  const out = [];
  for (const [name, range] of Object.entries(deps)) {
    if (!(name in lock)) out.push(name + ': missing from lockfile');
    else if (!satisfies(lock[name], range)) out.push(name + ': locked ' + lock[name] + ' does not satisfy ' + range);
  }
  return out;
}

console.log(lockProblems({ react: '^18.2.0', lodash: '~4.17.0', zod: '^3.0.0' }, { react: '18.3.1', lodash: '4.18.0' }));` },
      complexity: `<p>Time O(D) for D dependencies, space O(P) for P problems.</p>`,
      followUps: ['Also report lockfile entries that no dependency asks for (extraneous)', 'Handle transitive dependencies by walking the whole tree']
    }
  });

  /* ---------- EASY 2 ---------- */
  practice.push({
    title: 'dependencies or devDependencies?',
    level: 'Easy', tags: ['package.json', 'npm'], companies: ['Shopify', 'Netflix'],
    statement: `<p>You are given <code>usage</code>: for every installed package, the list of files that import it. Decide where each package belongs in package.json. A package is a <b>dependency</b> (ships to users) if at least one <b>source file</b> imports it. A source file is one that starts with <code>src/</code> and is not a test (<code>.test.</code> or <code>.spec.</code> in the name). Otherwise it is a <b>devDependency</b>. Return <code>{ dependencies: [...], devDependencies: [...] }</code> with both lists sorted.</p>`,
    constraints: `Up to 500 packages and 50 files per package. File paths use forward slashes.`,
    example: `<p><code>react</code> is imported by <code>src/App.jsx</code> → ${H.c('g', 'dependency')}. <code>vitest</code> is imported only by <code>src/App.test.jsx</code> and <code>vitest.config.js</code> → ${H.c('b', 'devDependency')}. <code>lodash</code> is used by <code>src/utils.js</code> and a test → ${H.c('g', 'dependency')} (one real use is enough).</p>`,
    brute: { why: `<p>Putting everything in <code>dependencies</code> "to be safe" works but ships build tools and test libraries into production installs, slowing deploys and widening the supply-chain attack surface. Deciding by the package name (<code>if name.includes("test")</code>) is guesswork.</p>`, code: `function classifyBrute(usage) {
  const dependencies = Object.keys(usage).sort();   // everything is "runtime": wrong for vitest, eslint...
  return { dependencies, devDependencies: [] };
}` },
    mcq: { q: 'A library is imported only by <code>vite.config.js</code>. Where does it go?', options: ['devDependencies', 'dependencies', 'peerDependencies', 'optionalDependencies'], answer: 0, explain: 'The config file runs on the build machine, never in the user\'s browser, so the package is a build-time (dev) dependency.' },
    hints: [`<p>Hint 1: Ask for each package "is there ANY file that really ships to the browser and imports it?".</p>`, `<p>Hint 2: Write a helper <code>isShipped(path)</code> that checks the <code>src/</code> prefix and rejects names containing <code>.test.</code> or <code>.spec.</code>.</p>`, `<p>Hint 3: Use <code>some()</code> over the file list, push the package name to one of two arrays, and sort both before returning.</p>`],
    solution: {
      approach: `<p>A single pass: a package is runtime if any importing file is a shipped source file. Everything else is dev-only.</p>`,
      code: { lang: 'js', run: true, code: R`const isShipped = (file) => file.startsWith('src/') && !/\.(test|spec)\./.test(file);

function classify(usage) {
  const dependencies = [], devDependencies = [];
  for (const [pkg, files] of Object.entries(usage)) {
    (files.some(isShipped) ? dependencies : devDependencies).push(pkg);
  }
  return { dependencies: dependencies.sort(), devDependencies: devDependencies.sort() };
}

console.log(classify({
  react: ['src/App.jsx'],
  vitest: ['src/App.test.jsx', 'vitest.config.js'],
  eslint: ['eslint.config.js'],
  lodash: ['src/utils.js', 'src/utils.test.js']
}));` },
      complexity: `<p>Time O(total file mentions), space O(P).</p>`,
      followUps: ['Packages used only for types (<code>@types/react</code>) belong in dev: how would you detect them?', 'How would a package imported only from <code>scripts/</code> be handled?']
    }
  });

  /* ---------- EASY 3 ---------- */
  practice.push({
    title: 'Spot the Unused Exports',
    level: 'Easy', tags: ['tree shaking', 'esm', 'regex'], companies: ['Google', 'Meta'],
    statement: `<p>Given the exports of each module and a list of <code>import</code> lines from the rest of the app, return the exports nobody imports, as sorted strings <code>file:name</code>. Imports look like <code>import { add, mul as times } from './math.js';</code> (a rename uses the original name) or <code>import * as ui from './ui.js';</code> (a namespace import counts as <b>using every export</b> of that file because the bundler cannot tell which ones).</p>`,
    constraints: `Up to 200 files, 5000 import lines. Only named and namespace imports (no default imports). Paths in imports match the keys of the export map exactly.`,
    example: `<p>exports <code>{ "./math.js": ["add","sub","mul"], "./ui.js": ["Button","Modal"] }</code></p><p>imports <code>import { add, mul as times } from './math.js'</code> and <code>import * as ui from './ui.js'</code></p><p>Unused: ${H.c('r', './math.js:sub')} only. All of ui.js counts as used because of the namespace import.</p>`,
    brute: { why: `<p>Searching the whole source text for the export name (<code>text.includes("sub")</code>) finds the word in comments and unrelated identifiers like <code>substring</code>, and misses renamed imports and namespace imports.</p>`, code: `function unusedBrute(exportsByFile, importLines) {
  const text = importLines.join('\\n');
  const out = [];
  for (const [file, names] of Object.entries(exportsByFile))
    for (const n of names) if (!text.includes(n)) out.push(file + ':' + n); // "sub" matches "substring"
  return out.sort();
}` },
    mcq: { q: 'Why does <code>import * as ui from "./ui.js"</code> stop any export of ui.js from being shaken?', options: ['The bundler cannot know which members are accessed, so it keeps them all', 'Namespace imports are always slow', 'Because the file name is ui.js', 'It is a syntax error'], answer: 0, explain: 'A namespace object can be passed around or indexed dynamically (ui[name]), so a conservative bundler keeps every export.' },
    hints: [`<p>Hint 1: Build a set of "used" ids <code>file:name</code> while reading every import line, then subtract it from all exports.</p>`, `<p>Hint 2: Parse one line with two regexes: a named import with a braces list, and a namespace import with <code>* as</code>. Take the part before <code>as</code> in each name.</p>`, `<p>Hint 3: A namespace import adds every export of that file to the used set. Finally loop over all exports, keep those not in the set, and sort.</p>`],
    solution: {
      approach: `<p>Collect used ids from the imports (handling renames and namespace imports), then report all exported ids that are not in that set.</p>`,
      code: { lang: 'js', run: true, code: R`function unusedExports(exportsByFile, importLines) {
  const used = new Set();
  for (const line of importLines) {
    let m = line.match(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/);
    if (m) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0];      // "mul as times" -> "mul"
        if (name) used.add(m[2] + ':' + name);
      }
      continue;
    }
    m = line.match(/import\s*\*\s*as\s+\w+\s+from\s*['"]([^'"]+)['"]/);
    if (m) for (const n of exportsByFile[m[1]] || []) used.add(m[1] + ':' + n);   // namespace = everything
  }
  const unused = [];
  for (const [file, names] of Object.entries(exportsByFile))
    for (const n of names) if (!used.has(file + ':' + n)) unused.push(file + ':' + n);
  return unused.sort();
}

console.log(unusedExports(
  { './math.js': ['add', 'sub', 'mul'], './ui.js': ['Button', 'Modal'] },
  ["import { add, mul as times } from './math.js';", "import * as ui from './ui.js';"]
)); // [ './math.js:sub' ]` },
      complexity: `<p>Time O(I + E) for I import lines and E exports, space O(E).</p>`,
      followUps: ['Support default imports and re-exports (<code>export { x } from</code>)', 'Account for exports used only inside their own file']
    }
  });

  /* ---------- EASY 4 ---------- */
  practice.push({
    title: 'Type the Props of an Avatar Component',
    level: 'Easy', tags: ['typescript', 'react', 'props'], companies: ['Airbnb', 'Spotify'], lang: 'ts',
    statement: `<p>Write the TypeScript for an <code>Avatar</code> component. Props: <code>name</code> (required string), <code>src</code> (optional image URL), <code>size</code> (optional, only <code>"sm" | "md" | "lg"</code>, default <code>"md"</code>), and <code>onClick</code> (optional, receives the <code>name</code>). When <code>src</code> is missing, show the initials of the name (first letters of the first and last word, uppercase). The component must also let callers pass any other normal <code>&lt;img&gt;</code> attribute such as <code>loading</code> or <code>className</code>, but not override <code>src</code>/<code>alt</code>.</p>`,
    constraints: `No <code>any</code>. Reuse the built-in React image props instead of retyping them.`,
    example: `<p>${H.c('g', '&lt;Avatar name="Asha Rao" size="lg" /&gt;')} renders initials <b>AR</b>. ${H.c('r', '&lt;Avatar size="xl" name="Asha" /&gt;')} is a compile error: "xl" is not one of the allowed sizes. ${H.c('r', '&lt;Avatar /&gt;')} is an error: name is required.</p>`,
    brute: { why: `<p>Typing props loosely as <code>{ [key: string]: any }</code> compiles everything, including typos like <code>sise="lg"</code>, so the type checker protects nothing.</p>`, code: { lang: 'ts', code: `type AvatarPropsBad = { [key: string]: any };   // sise="lg", size="xl" and a missing name all compile` } },
    mcq: { q: 'Which type lets a component accept all normal img attributes except src and alt?', options: ['Omit&lt;React.ComponentProps&lt;"img"&gt;, "src" | "alt"&gt;', 'Partial&lt;string&gt;', 'React.ReactNode', 'keyof HTMLImageElement'], answer: 0, explain: 'ComponentProps<"img"> gives every attribute of an img; Omit removes the two you control yourself.' },
    hints: [`<p>Hint 1: Start with an <code>interface AvatarProps</code> listing the four props. Make everything except <code>name</code> optional with <code>?</code>.</p>`, `<p>Hint 2: Size is a union of string literals. Callback: <code>(name: string) =&gt; void</code>.</p>`, `<p>Hint 3: Extend <code>Omit&lt;React.ComponentProps&lt;'img'&gt;, 'src' | 'alt' | 'onClick'&gt;</code> and spread <code>...rest</code> onto the img. A small helper function computes initials.</p>`],
    solution: {
      approach: `<p>Extend the native img props (minus the ones we control), add our own props, give defaults in the destructuring and spread the rest.</p>`,
      code: { lang: 'ts', code: `import type { ComponentProps } from 'react';

type NativeImg = Omit<ComponentProps<'img'>, 'src' | 'alt' | 'onClick'>;

interface AvatarProps extends NativeImg {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (name: string) => void;
}

const PX = { sm: 24, md: 40, lg: 64 } as const;

export function initials(name: string): string {
  const parts = name.trim().split(/\\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', onClick, ...rest }: AvatarProps) {
  const px = PX[size];
  if (!src) {
    return (
      <span role="img" aria-label={name} style={{ width: px, height: px }} onClick={() => onClick?.(name)}>
        {initials(name)}
      </span>
    );
  }
  return <img {...rest} src={src} alt={name} width={px} height={px} onClick={() => onClick?.(name)} />;
}` },
      complexity: `<p>Compile-time only. Runtime cost is O(length of name) for the initials.</p>`,
      followUps: ['Make <code>onClick</code> required when the avatar is rendered as a button using a discriminated union', 'Add a <code>status</code> prop limited to "online" | "away" | "offline"']
    }
  });

  /* ---------- MEDIUM 1 ---------- */
  practice.push({
    title: 'Semver Sorter (with Prereleases)',
    level: 'Medium', tags: ['semver', 'sorting', 'comparators'], companies: ['npm', 'GitHub'],
    statement: `<p>Sort an array of semver strings in <b>ascending</b> order. Versions look like <code>1.2.3</code> or <code>1.2.3-beta.2</code>. Rules: compare MAJOR, MINOR, PATCH as numbers. A version <b>with</b> a prerelease tag is lower than the same version without one (<code>1.0.0-rc.1 &lt; 1.0.0</code>). Prerelease tags are compared part by part (split on dots): numeric parts numerically, text parts alphabetically, a numeric part is lower than a text part, and a shorter list is lower when all earlier parts are equal.</p>`,
    constraints: `Up to 10<sup>5</sup> versions. Do not mutate the input. Versions are well-formed.`,
    example: `<p>Input: <code>["1.0.0","1.0.0-beta.11","1.0.0-beta.2","1.0.0-alpha","1.10.0","1.2.0","0.9.9"]</code></p><p>Output: ${H.c('g', '0.9.9, 1.0.0-alpha, 1.0.0-beta.2, 1.0.0-beta.11, 1.0.0, 1.2.0, 1.10.0')}. Note beta.2 &lt; beta.11 (numeric) and 1.2.0 &lt; 1.10.0 (numeric).</p>`,
    brute: { why: `<p>The default <code>Array.prototype.sort()</code> compares strings character by character, so <code>"1.10.0" &lt; "1.2.0"</code> and <code>"1.0.0" &lt; "1.0.0-alpha"</code>. It is fast but answers the wrong question.</p>`, code: `function sortVersionsBrute(versions) {
  return versions.slice().sort();   // "1.10.0" sorts before "1.2.0": wrong
}` },
    mcq: { q: 'Which is the correct order?', options: ['1.0.0-rc.1 < 1.0.0', '1.0.0 < 1.0.0-rc.1', '1.0.0-rc.1 = 1.0.0', '1.0.0-rc.1 < 0.9.0'], answer: 0, explain: 'A prerelease means "not final yet", so it comes before the final release with the same numbers.' },
    hints: [`<p>Hint 1: Write one <code>compare(a, b)</code> function, then call <code>sort</code> on a copy using it.</p>`, `<p>Hint 2: Split each version at the first dash into the core "1.2.3" and the prerelease "beta.2". Compare the three core numbers first.</p>`, `<p>Hint 3: If cores are equal: no tag beats a tag. Otherwise compare tag parts left to right with the numeric/text rules; if one runs out first, the shorter is smaller.</p>`],
    solution: {
      approach: `<p>Implement the semver precedence rules in a comparator and use it with <code>sort</code>. The comparator is a total order, so the sort is deterministic.</p>`,
      code: { lang: 'js', run: true, code: R`function parse(v) {
  const dash = v.indexOf('-');
  const core = dash < 0 ? v : v.slice(0, dash);
  const pre = dash < 0 ? [] : v.slice(dash + 1).split('.');
  return { nums: core.split('.').map(Number), pre };
}

function comparePre(a, b) {
  if (!a.length && !b.length) return 0;
  if (!a.length) return 1;           // release is higher than any prerelease
  if (!b.length) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return -1;   // shorter list is lower
    if (b[i] === undefined) return 1;
    const an = /^\d+$/.test(a[i]), bn = /^\d+$/.test(b[i]);
    if (an && bn) { if (+a[i] !== +b[i]) return +a[i] < +b[i] ? -1 : 1; }
    else if (an) return -1;              // numbers are lower than text
    else if (bn) return 1;
    else if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function compare(x, y) {
  const a = parse(x), b = parse(y);
  for (let i = 0; i < 3; i++) if (a.nums[i] !== b.nums[i]) return a.nums[i] - b.nums[i];
  return comparePre(a.pre, b.pre);
}

const sortVersions = (versions) => versions.slice().sort(compare);
console.log(sortVersions(['1.0.0', '1.0.0-beta.11', '1.0.0-beta.2', '1.0.0-alpha', '1.10.0', '1.2.0', '0.9.9']));` },
      complexity: `<p>Time O(n log n · k) for n versions with k parts per version; space O(n) for the copy.</p>`,
      followUps: ['Ignore build metadata after a plus sign (<code>1.0.0+abc</code>)', 'Return the highest version that satisfies a caret range using this comparator']
    }
  });

  /* ---------- MEDIUM 2 ---------- */
  practice.push({
    title: 'Code-Split Planner with a Shared Chunk',
    level: 'Medium', tags: ['bundler', 'code splitting', 'graph'], companies: ['Vercel', 'Meta'],
    statement: `<p>You are given a module graph where each module lists static imports (<code>"x"</code>) and dynamic imports (<code>"~x"</code>), and an entry module. Every dynamic import target starts an <b>async chunk</b>. Assign each module to exactly one output chunk using these rules: a module reachable through <b>static</b> imports from the entry goes to <code>main</code>. Otherwise, if it is statically reachable from <b>exactly one</b> async entry, it goes to that entry's chunk (named after the entry). If it is statically reachable from <b>two or more</b> async entries (and not main), it goes to a <code>shared:a+b</code> chunk (entry names sorted, joined with <code>+</code>). Return an object chunk → sorted module list.</p>`,
    constraints: `Up to 10<sup>3</sup> modules, up to 5·10<sup>3</sup> imports, cycles are possible. Modules not reachable at all are dropped.`,
    example: `<p>main → [react, ~chart, ~table]; chart → [d3, fmt]; table → [fmt, grid]</p><p>Result: ${H.c('g', 'main: main, react')}; ${H.c('b', 'chart: chart, d3')}; ${H.c('b', 'table: table, grid')}; ${H.c('p', 'shared:chart+table: fmt')}. <code>fmt</code> is used by both lazy chunks but not main, so it gets its own shared file instead of being copied twice.</p>`,
    brute: { why: `<p>Copying every module into every chunk that needs it works but duplicates shared code in each async file (fmt would be downloaded twice) and defeats caching. Putting everything in main ignores code splitting entirely.</p>`, code: `function planBrute(graph, entry) {
  const chunks = { main: [] };
  for (const m of Object.keys(graph)) chunks.main.push(m);   // one big bundle, no splitting
  return chunks;
}` },
    mcq: { q: 'Why create a shared chunk for modules used by two lazy chunks?', options: ['So the code is downloaded and cached once instead of duplicated', 'To make the main chunk bigger', 'Because dynamic imports require it', 'To avoid using ES modules'], answer: 0, explain: 'Duplicating the module in each async chunk wastes bytes. A shared chunk is fetched once and reused from cache.' },
    hints: [`<p>Hint 1: For each "root" (the entry and every dynamic target) compute the set of modules reachable through static imports only.</p>`, `<p>Hint 2: For each module, collect which roots can reach it. Then decide by the rules: main first, else one root, else the shared group.</p>`, `<p>Hint 3: Find dynamic targets with a graph walk from the entry that follows both kinds of edges (a lazy chunk can itself contain a dynamic import). Use a visited set to survive cycles; sort names for stable output.</p>`],
    solution: {
      approach: `<p>First discover all roots by walking every edge. Then compute static closures per root and invert them: module → set of roots. The set decides the chunk name.</p>`,
      code: { lang: 'js', run: true, code: `function planChunks(graph, entry) {
  // 1. find every root: the entry plus every reachable dynamic import target
  const roots = new Set([entry]);
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const m = stack.pop();
    if (seen.has(m)) continue;
    seen.add(m);
    for (const dep of graph[m] || []) {
      const dyn = dep.startsWith('~');
      const name = dyn ? dep.slice(1) : dep;
      if (dyn) roots.add(name);
      stack.push(name);
    }
  }

  // 2. static closure of each root (follow only non-dynamic imports)
  const reachedBy = {};                       // module -> Set of roots
  for (const root of roots) {
    const visited = new Set();
    const st = [root];
    while (st.length) {
      const m = st.pop();
      if (visited.has(m)) continue;
      visited.add(m);
      (reachedBy[m] = reachedBy[m] || new Set()).add(root);
      for (const dep of graph[m] || []) if (!dep.startsWith('~')) st.push(dep);
    }
  }

  // 3. choose the chunk for each module
  const chunks = {};
  for (const [m, rs] of Object.entries(reachedBy)) {
    let name;
    if (rs.has(entry)) name = 'main';
    else if (rs.size === 1) name = [...rs][0];
    else name = 'shared:' + [...rs].sort().join('+');
    (chunks[name] = chunks[name] || []).push(m);
  }
  for (const k of Object.keys(chunks)) chunks[k].sort();
  return chunks;
}

const graph = {
  main: ['react', '~chart', '~table'],
  chart: ['d3', 'fmt'],
  table: ['fmt', 'grid'],
  react: [], d3: [], fmt: [], grid: []
};
console.log(planChunks(graph, 'main'));` },
      complexity: `<p>Time O(R·(V+E)) for R roots (each static closure is a walk), space O(V·R) for the reachedBy sets.</p>`,
      followUps: ['Add a minimum size so tiny shared modules are merged into main', 'Name the shared chunk with a content hash']
    }
  });

  /* ---------- MEDIUM 3 ---------- */
  practice.push({
    title: 'Build jest.fn() from Scratch',
    level: 'Medium', tags: ['mocks', 'jest', 'closures', 'testing'], companies: ['Meta', 'Atlassian'],
    statement: `<p>Implement a mock-function factory <code>fn(impl?)</code> like <code>jest.fn()</code> / <code>vi.fn()</code>. The returned function must record every call in <code>mock.calls</code> (array of argument arrays) and every result in <code>mock.results</code> (<code>{ type: "return", value }</code> or <code>{ type: "throw", value }</code>), and support <code>mockReturnValue(v)</code>, <code>mockImplementation(f)</code>, <code>mockReturnValueOnce(v)</code> (used once, in order, before the normal value) and <code>mockClear()</code> (forget calls and results but keep behaviour). Also write helper <code>calledWith(mockFn, ...args)</code> that returns true if any call matched the arguments (shallow equality per argument).</p>`,
    constraints: `A thrown error from the implementation must still be recorded and re-thrown. Calls with no implementation return <code>undefined</code>.`,
    example: `<pre>const add = fn((a, b) =&gt; a + b);\nadd(2, 3); add(4, 5);\nadd.mock.calls   // [[2,3],[4,5]]\nadd.mockReturnValueOnce(100);\nadd(1, 1)        // 100 (once)\nadd(1, 1)        // 2</pre>`,
    brute: { why: `<p>A plain wrapper that only counts calls (<code>count++</code>) cannot tell you <i>which arguments</i> were used, so you could never assert <code>toHaveBeenCalledWith</code>. It also cannot return configured values.</p>`, code: `function fnBrute(impl) {
  let count = 0;
  const wrapper = (...args) => { count++; return impl ? impl(...args) : undefined; };
  wrapper.count = () => count;       // no arguments, no results, no stubbing
  return wrapper;
}` },
    mcq: { q: 'What must a mock do when its implementation throws?', options: ['Record the throw in results and re-throw the error', 'Swallow the error and return undefined', 'Record nothing', 'Call mockClear automatically'], answer: 0, explain: 'The test needs to see the throw in mock.results, and the code under test must still observe the real exception so behaviour is unchanged.' },
    hints: [`<p>Hint 1: A mock is a function with extra properties. Create an inner function and attach <code>mock</code>, <code>mockReturnValue</code>, etc. to it.</p>`, `<p>Hint 2: Keep three pieces of state in the closure: the current implementation, a queue of one-time return values, and the <code>mock</code> object holding calls and results.</p>`, `<p>Hint 3: On each call: push args; if the once-queue has a value, return it; otherwise run the implementation inside try/catch and store the result before returning or re-throwing. <code>mockClear</code> empties both arrays in place.</p>`],
    solution: {
      approach: `<p>A closure holds the state. The returned function records the call, chooses between a once-value and the implementation, records the outcome, and exposes chainable configuration methods.</p>`,
      code: { lang: 'js', run: true, code: `function fn(impl) {
  let implementation = impl;
  const once = [];                                   // queued one-time return values
  const mock = { calls: [], results: [] };

  function mockFn(...args) {
    mock.calls.push(args);
    if (once.length) {
      const value = once.shift();
      mock.results.push({ type: 'return', value });
      return value;
    }
    try {
      const value = implementation ? implementation(...args) : undefined;
      mock.results.push({ type: 'return', value });
      return value;
    } catch (error) {
      mock.results.push({ type: 'throw', value: error });
      throw error;                                   // behave like the real function
    }
  }

  mockFn.mock = mock;
  mockFn.mockImplementation = (f) => { implementation = f; return mockFn; };
  mockFn.mockReturnValue = (v) => { implementation = () => v; return mockFn; };
  mockFn.mockReturnValueOnce = (v) => { once.push(v); return mockFn; };
  mockFn.mockClear = () => { mock.calls.length = 0; mock.results.length = 0; return mockFn; };
  return mockFn;
}

function calledWith(mockFn, ...expected) {
  return mockFn.mock.calls.some((args) => args.length === expected.length && args.every((a, i) => Object.is(a, expected[i])));
}

const add = fn((a, b) => a + b);
add(2, 3); add(4, 5);
console.log(add.mock.calls);                 // [ [ 2, 3 ], [ 4, 5 ] ]
add.mockReturnValueOnce(100);
console.log(add(1, 1), add(1, 1));           // 100 2
console.log(calledWith(add, 2, 3), calledWith(add, 9, 9)); // true false
const boom = fn(() => { throw new Error('nope'); });
try { boom(); } catch (e) { console.log('rethrown:', e.message, boom.mock.results[0].type); }
add.mockClear();
console.log(add.mock.calls.length);          // 0` },
      complexity: `<p>Each call is O(1) plus the cost of the implementation. <code>calledWith</code> is O(calls · args).</p>`,
      followUps: ['Add <code>mockResolvedValue</code> for promise-returning mocks', 'Implement <code>spyOn(obj, "method")</code> that wraps the original and can be restored']
    }
  });

  /* ---------- MEDIUM 4 ---------- */
  practice.push({
    title: 'CI Critical Path and Skipped Jobs',
    level: 'Medium', tags: ['ci', 'graph', 'dp', 'pipeline'], companies: ['GitHub', 'Datadog'],
    statement: `<p>A pipeline is a set of jobs; each has <code>needs</code> (other job names) and a duration in seconds. Jobs whose needs are all finished start immediately and run in <b>parallel</b> (unlimited runners). If one job <b>fails</b>, every job that needs it (directly or indirectly) is <b>skipped</b>. Jobs unrelated to the failure still run. Write <code>simulate(jobs, failing)</code> returning <code>{ wallTime, skipped, order }</code> where <code>wallTime</code> is the time until the last executed job finishes, <code>skipped</code> is a sorted list of skipped jobs and <code>order</code> lists executed jobs by finish time (ties by name).</p>`,
    constraints: `Up to 500 jobs, the dependency graph is acyclic, <code>failing</code> is one job name or <code>null</code>. A failing job still takes its full duration.`,
    example: `<p>install(40) → lint(20), types(30), test(45) → build(60) → e2e(120) → deploy(30). With <code>failing = "test"</code>: install ends at 40, test ends at 85 (failed). lint (60) and types (70) still finish. build, e2e, deploy are ${H.c('r', 'skipped')}. wallTime = <b>85</b>.</p>`,
    brute: { why: `<p>Adding up all durations assumes one job at a time, so a pipeline that finishes in 5 minutes with parallelism looks like 11. Re-simulating time ticks second by second is slow and unnecessary.</p>`, code: `function simulateBrute(jobs, failing) {
  let total = 0;
  for (const j of Object.values(jobs)) total += j.sec;   // ignores parallelism and skipping
  return { wallTime: total, skipped: [], order: Object.keys(jobs) };
}` },
    mcq: { q: 'With unlimited parallel runners, the total time of a successful pipeline equals…', options: ['The length of the longest dependency path (critical path)', 'The sum of all job durations', 'The duration of the slowest single job', 'The number of jobs × 60 s'], answer: 0, explain: 'A job can start only after everything it needs has finished, so the slowest chain of dependent jobs decides the total time.' },
    hints: [`<p>Hint 1: A job can start when all its needs are done. So <code>finish(job) = max(finish(need)) + duration(job)</code> for executed jobs.</p>`, `<p>Hint 2: Use memoised recursion (DFS) so each job is solved once. A job is skipped if any of its needs failed or was skipped.</p>`, `<p>Hint 3: Return an object per job <code>{ state, finish }</code>. After resolving all jobs, wallTime is the maximum finish among executed ones; sort executed jobs by (finish, name).</p>`],
    solution: {
      approach: `<p>Memoised DFS over the acyclic graph computes each job's state (passed / failed / skipped) and finish time. Parallelism is implicit in the <code>max</code> over the needs.</p>`,
      code: { lang: 'js', run: true, code: `function simulate(jobs, failing) {
  const memo = {};
  function solve(name) {
    if (memo[name]) return memo[name];
    const job = jobs[name];
    let start = 0, blocked = false;
    for (const dep of job.needs) {
      const d = solve(dep);
      if (d.state !== 'passed') blocked = true;     // a failed or skipped need blocks this job
      start = Math.max(start, d.finish);
    }
    if (blocked) return (memo[name] = { state: 'skipped', finish: 0 });
    return (memo[name] = { state: name === failing ? 'failed' : 'passed', finish: start + job.sec });
  }
  const names = Object.keys(jobs);
  names.forEach(solve);

  const executed = names.filter((n) => memo[n].state !== 'skipped');
  executed.sort((a, b) => memo[a].finish - memo[b].finish || (a < b ? -1 : 1));
  return {
    wallTime: executed.length ? Math.max(...executed.map((n) => memo[n].finish)) : 0,
    skipped: names.filter((n) => memo[n].state === 'skipped').sort(),
    order: executed
  };
}

const jobs = {
  install: { needs: [], sec: 40 }, lint: { needs: ['install'], sec: 20 }, types: { needs: ['install'], sec: 30 },
  test: { needs: ['install'], sec: 45 }, build: { needs: ['lint', 'types', 'test'], sec: 60 },
  e2e: { needs: ['build'], sec: 120 }, deploy: { needs: ['e2e'], sec: 30 }
};
console.log(simulate(jobs, null));
console.log(simulate(jobs, 'test'));` },
      complexity: `<p>Time O(J + N) for J jobs and N needs-edges (each job solved once), space O(J).</p>`,
      followUps: ['Limit the runners to k parallel jobs: now it is a scheduling problem', 'Add per-job retry counts with a flaky probability and compute the expected time']
    }
  });

  /* ---------- MEDIUM 5 ---------- */
  practice.push({
    title: 'Playwright: Cart Page with a Mocked API',
    level: 'Medium', tags: ['playwright', 'e2e', 'network mocking'], companies: ['Microsoft', 'Shopify'],
    statement: `<p>The <code>/cart</code> page calls <code>GET /api/cart</code> on load. While waiting it shows the text "Loading cart…". On success it renders one <code>listitem</code> per product (name and price) and a total labelled "Total: $30.00". On failure (HTTP 500) it shows an element with role <code>alert</code> saying "Could not load your cart". Write three Playwright tests using <code>page.route</code> so no real backend is needed: (1) success with two items, (2) server error, (3) a slow response where "Loading cart…" is visible first and the items appear after the response is released.</p>`,
    constraints: `No fixed sleeps. Use user-facing locators. The slow-response test must control exactly when the response is sent.`,
    example: `${H.table(['Mock', 'Expect'], [['<code>[{Shirt $10}, {Mug $20}]</code>', H.c('g', '2 list items and "Total: $30.00"')], ['status 500', H.c('r', 'alert "Could not load your cart", no list')], ['held response', H.c('b', '"Loading cart…" first, then items after release')]])}`,
    brute: { why: `<p>Hitting the real backend makes the test depend on seeded data, network speed and other tests; an error state cannot be triggered on demand; and waiting with a fixed timeout for the "slow" case is flaky.</p>`, code: { lang: 'js', check: false, code: `test('cart', async ({ page }) => {
  await page.goto('/cart');                      // real API, unknown data
  await page.waitForTimeout(2000);               // hope it loaded
  expect(await page.locator('li').count()).toBeGreaterThan(0);
});` } },
    mcq: { q: 'How do you make the mocked API respond only when the test says so?', options: ['Store the route in a Promise and call route.fulfill after an explicit release', 'Use waitForTimeout(5000) inside the handler', 'Call page.reload() repeatedly', 'Disable JavaScript in the browser'], answer: 0, explain: 'Awaiting a promise inside the route handler holds the request open. Resolving that promise from the test releases it at exactly the moment you choose.' },
    hints: [`<p>Hint 1: Register the mock <b>before</b> <code>page.goto("/cart")</code> with <code>await page.route("**/api/cart", handler)</code>.</p>`, `<p>Hint 2: The handler calls <code>route.fulfill({ json })</code> for success and <code>route.fulfill({ status: 500 })</code> for the error.</p>`, `<p>Hint 3: For the slow case create <code>let release; const gate = new Promise(r =&gt; release = r);</code>, <code>await gate</code> inside the handler, assert "Loading cart…", then call <code>release()</code> and assert the items.</p>`],
    solution: {
      approach: `<p>Intercept the network call per test. A manually controlled promise "gates" the slow response so the loading state can be asserted deterministically, with retrying assertions instead of sleeps.</p>`,
      code: { lang: 'js', check: false, code: `import { test, expect } from '@playwright/test';

const items = [{ id: 1, name: 'Shirt', price: 10 }, { id: 2, name: 'Mug', price: 20 }];

test.describe('cart page', () => {
  test('lists the items and the total', async ({ page }) => {
    await page.route('**/api/cart', (route) => route.fulfill({ json: items }));
    await page.goto('/cart');

    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByRole('listitem').first()).toContainText('Shirt');
    await expect(page.getByText('Total: $30.00')).toBeVisible();
  });

  test('shows an error when the API fails', async ({ page }) => {
    await page.route('**/api/cart', (route) => route.fulfill({ status: 500, json: { error: 'down' } }));
    await page.goto('/cart');

    await expect(page.getByRole('alert')).toHaveText('Could not load your cart');
    await expect(page.getByRole('listitem')).toHaveCount(0);
  });

  test('shows a loading state until the response arrives', async ({ page }) => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route('**/api/cart', async (route) => {
      await gate;                                    // hold the request open
      await route.fulfill({ json: items });
    });
    await page.goto('/cart');

    await expect(page.getByText('Loading cart…')).toBeVisible();
    release();                                       // now let the response through
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByText('Loading cart…')).toBeHidden();
  });
});` },
      complexity: `<p>Each test is one page load with an instant mocked response (about a second). No real network or database is involved.</p>`,
      followUps: ['Assert that the page sent the right request headers using <code>route.request()</code>', 'Add a visual snapshot of the error state']
    }
  });

  /* ---------- MEDIUM 6 ---------- */
  practice.push({
    title: 'RTL: Test Loading, Success and Error States',
    level: 'Medium', tags: ['react testing library', 'async', 'mocking fetch'], companies: ['Atlassian', 'Airbnb'],
    statement: `<p>A <code>UserList</code> component fetches <code>/api/users</code>. It first shows "Loading…", then either a <code>list</code> with one <code>listitem</code> per user name, or (if the response is not ok) an element with role <code>alert</code> saying "Failed to load users". Write three React Testing Library tests (Vitest) that control <code>fetch</code> with a mock and use <b>findBy</b> for things that appear later. Also check the component called <code>fetch</code> exactly once with <code>/api/users</code>.</p>`,
    constraints: `Do not use <code>setTimeout</code> in the tests. Restore global mocks between tests. Use role-based queries.`,
    example: `${H.table(['fetch returns', 'screen shows'], [['ok + [Asha, Ben]', H.c('g', 'Loading… then 2 list items')], ['ok: false', H.c('r', 'alert "Failed to load users"')], ['never resolves', H.c('b', 'only "Loading…"')]])}`,
    brute: { why: `<p>Testing with real timers and the real network makes the test slow and unreliable. Using <code>getBy</code> for text that appears after the fetch throws immediately because the data has not arrived yet.</p>`, code: { lang: 'js', check: false, code: `it('shows users', async () => {
  render(<UserList />);
  await new Promise((r) => setTimeout(r, 1000));          // fixed sleep
  expect(screen.getByText('Asha')).toBeInTheDocument();   // real API, real data
});` } },
    mcq: { q: 'Which query is right for the user list that appears after the fetch resolves?', options: ['await screen.findAllByRole("listitem")', 'screen.getAllByRole("listitem")', 'screen.queryAllByRole("listitem")', 'screen.getByTestId("list")'], answer: 0, explain: 'findBy/findAllBy returns a promise and retries until the elements appear (default 1 s). getAllBy would throw before the data arrives.' },
    hints: [`<p>Hint 1: Replace the global with <code>vi.stubGlobal("fetch", vi.fn())</code> in <code>beforeEach</code> and <code>vi.unstubAllGlobals()</code> in <code>afterEach</code>.</p>`, `<p>Hint 2: Success: <code>fetch.mockResolvedValue({ ok: true, json: async () =&gt; [...] })</code>. Failure: the same with <code>ok: false</code>.</p>`, `<p>Hint 3: Assert "Loading…" with <code>getByText</code> immediately after render, then <code>await findAllByRole("listitem")</code> or <code>await findByRole("alert")</code>. Finally <code>expect(fetch).toHaveBeenCalledTimes(1)</code> and check the URL argument.</p>`],
    solution: {
      approach: `<p>Stub <code>fetch</code> so each test decides the response. The loading state is visible right after render; the later states are awaited with <code>findBy</code> queries. The stub is removed after every test so tests do not leak into each other.</p>`,
      code: { lang: 'js', check: false, code: `import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserList } from './UserList';

describe('UserList', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows loading and then the users', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => [{ id: 1, name: 'Asha' }, { id: 2, name: 'Ben' }] });
    render(<UserList />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();           // right now
    const items = await screen.findAllByRole('listitem');               // later
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Asha');
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/users', expect.anything());
  });

  it('shows an error when the response is not ok', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    render(<UserList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('stays in the loading state while the request is pending', () => {
    fetch.mockReturnValue(new Promise(() => {}));                       // never resolves
    render(<UserList />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});` },
      complexity: `<p>Each test is a few milliseconds: jsdom render plus a resolved promise, with no network.</p>`,
      followUps: ['Replace the fetch stub with MSW so the real fetching code path (headers, JSON parsing) is exercised', 'Test that unmounting before the response does not trigger a state update warning']
    }
  });

  /* ---------- HARD 1 ---------- */
  practice.push({
    title: 'npm-style Dependency Resolver with Hoisting',
    level: 'Hard', tags: ['npm', 'semver', 'graph', 'node_modules'], companies: ['npm', 'Vercel'],
    statement: `<p>Given a <code>registry</code> (<code>name → version → { dependencies }</code>) and the root <code>dependencies</code> of an app, simulate how npm builds <code>node_modules</code>. For every requirement pick the <b>highest</b> version satisfying the range (support exact, <code>^</code>, <code>~</code>). Place a package at the <b>top level</b> (hoisted) when no copy of that name exists there yet. When the copy that Node would find by walking up the folders does <b>not</b> satisfy the range, install a nested copy inside the requiring package. If a satisfying copy is already visible, reuse it. Process requirements breadth-first in the order given. Return the sorted list of install paths like <code>node_modules/b@1.0.0/node_modules/c@2.1.0</code>.</p>`,
    constraints: `Up to 500 packages, acyclic dependencies, every requirement is satisfiable (otherwise throw an Error). Versions are MAJOR.MINOR.PATCH.`,
    example: `<p>root needs a ^1.0.0 and b ^1.0.0. a@1.1.0 needs c ^1.0.0. b@1.0.0 needs c ^2.0.0.</p><p>${H.c('g', 'node_modules/a@1.1.0')}, ${H.c('g', 'node_modules/b@1.0.0')}, ${H.c('g', 'node_modules/c@1.2.0')} (hoisted for a), and ${H.c('p', 'node_modules/b@1.0.0/node_modules/c@2.1.0')} because b cannot use the hoisted c 1.x.</p>`,
    brute: { why: `<p>Installing every package into its own nested folder always works but duplicates shared libraries hundreds of times (the original npm 2 behaviour: huge disk use and deep paths). Hoisting everything to the top without checking ranges silently gives a package the wrong major version.</p>`, code: `function installBrute(registry, rootDeps) {
  const out = [];
  (function walk(deps, prefix) {
    for (const [name, range] of Object.entries(deps)) {
      const versions = Object.keys(registry[name]);
      const v = versions[versions.length - 1];            // ignores the range!
      out.push(prefix + 'node_modules/' + name + '@' + v);
      walk(registry[name][v].dependencies || {}, prefix + 'node_modules/' + name + '@' + v + '/');
    }
  })(rootDeps, '');
  return out.sort();
}` },
    mcq: { q: 'Package b needs c ^2.0.0 but c 1.2.0 is hoisted at the top. What does npm do?', options: ['Install c 2.x nested inside b', 'Replace the top-level c with 2.x and break a', 'Fail with an error', 'Ignore the range'], answer: 0, explain: 'Node resolves b\'s require("c") from b\'s own node_modules first, so a nested copy gives b the right version while a keeps the hoisted one.' },
    hints: [`<p>Hint 1: Model the tree as nodes <code>{ name, version, children, parent }</code> with a virtual root. Resolving "c" from node N means: check N.children, then N.parent.children, up to the root.</p>`, `<p>Hint 2: Use a queue of <code>{ from, deps }</code> items for breadth-first order. For each requirement: find the first copy up the chain; if it satisfies reuse it.</p>`, `<p>Hint 3: If nothing is found, place at root when root has no such name, else under <code>from</code>. If a copy is found but is wrong, place under <code>from</code>. After placing, enqueue the new node's own dependencies with <code>from = newNode</code>.</p>`],
    solution: {
      approach: `<p>Emulate Node's resolution walk. The placement rule (hoist if free, nest on conflict) reproduces npm's flat layout. A queue keeps the order deterministic.</p>`,
      code: { lang: 'js', run: true, code: R`const parse = (v) => v.split('.').map(Number);
const cmp = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
function satisfies(version, range) {
  const m = range.match(/^([\^~])?(\d+)\.(\d+)\.(\d+)$/);
  const v = parse(version), lo = [+m[2], +m[3], +m[4]];
  if (cmp(v, lo) < 0) return false;
  if (m[1] === '^') return cmp(v, lo[0] > 0 ? [lo[0] + 1, 0, 0] : lo[1] > 0 ? [0, lo[1] + 1, 0] : [0, 0, lo[2] + 1]) < 0;
  if (m[1] === '~') return cmp(v, [lo[0], lo[1] + 1, 0]) < 0;
  return cmp(v, lo) === 0;
}
const best = (registry, name, range) => {
  const ok = Object.keys(registry[name] || {}).filter((v) => satisfies(v, range)).sort((a, b) => cmp(parse(a), parse(b)));
  if (!ok.length) throw new Error('No version of ' + name + ' satisfies ' + range);
  return ok[ok.length - 1];
};

function install(registry, rootDeps) {
  const root = { children: {}, parent: null };
  const queue = [{ from: root, deps: rootDeps }];
  while (queue.length) {
    const { from, deps } = queue.shift();
    for (const [name, range] of Object.entries(deps)) {
      // what would require(name) find from here? walk up the folders
      let found = null;
      for (let n = from; n; n = n.parent) {
        if (n.children[name]) { found = n.children[name]; break; }
      }
      if (found && satisfies(found.version, range)) continue;           // reuse
      const version = best(registry, name, range);
      const node = { name, version, children: {}, parent: null };
      const home = !root.children[name] ? root : from;                  // hoist if free, else nest
      node.parent = home;
      home.children[name] = node;
      queue.push({ from: node, deps: registry[name][version].dependencies || {} });
    }
  }
  const paths = [];
  (function walk(node, prefix) {
    for (const child of Object.values(node.children)) {
      const here = prefix + 'node_modules/' + child.name + '@' + child.version;
      paths.push(here);
      walk(child, here + '/');
    }
  })(root, '');
  return paths.sort();
}

const registry = {
  a: { '1.0.0': { dependencies: { c: '^1.0.0' } }, '1.1.0': { dependencies: { c: '^1.0.0' } } },
  b: { '1.0.0': { dependencies: { c: '^2.0.0' } } },
  c: { '1.0.0': {}, '1.2.0': {}, '2.0.0': {}, '2.1.0': {} }
};
console.log(install(registry, { a: '^1.0.0', b: '^1.0.0' }));` },
      complexity: `<p>Time O(N · (D + V)) for N installed nodes, depth D of the lookup walk and V versions scanned; space O(N).</p>`,
      followUps: ['Deduplicate by moving a nested copy up when it later becomes compatible', 'Support peerDependencies by failing when the host provides an incompatible version']
    }
  });

  /* ---------- HARD 2 ---------- */
  practice.push({
    title: 'Emit a Runnable Bundle (Mini webpack Runtime)',
    level: 'Hard', tags: ['bundler', 'commonjs', 'runtime', 'closures'], companies: ['Meta', 'Vercel'],
    statement: `<p>Write <code>bundle(modules, entry)</code>. <code>modules</code> maps a module id to its CommonJS source text (<code>const b = require('./b'); module.exports = ...</code>). Return a <b>string of JavaScript</b> that, when evaluated, runs the entry module and returns its <code>module.exports</code>. The output must contain only modules reachable from the entry (found by scanning <code>require('...')</code> calls), wrap each in a function <code>(module, exports, require)</code>, and include a tiny runtime with a <b>module cache</b> so each module runs once and <b>circular imports</b> see the partially filled exports instead of looping forever.</p>`,
    constraints: `Up to 200 modules. Ids in <code>require()</code> match the keys exactly. Single or double quotes are allowed in require calls. Source text contains no backticks.`,
    example: `<p>modules: <code>"./main"</code>: <code>const {inc} = require('./math'); module.exports = inc(41);</code>; <code>"./math"</code>: <code>exports.inc = (x) =&gt; x + 1;</code>; <code>"./unused"</code>: anything.</p><p>Evaluating the bundle returns ${H.c('g', '42')}, and <code>./unused</code> does not appear in the output text at all.</p>`,
    brute: { why: `<p>Concatenating all files into one script makes their top-level variables collide (every file's <code>const b</code> lives in the same scope), runs unreachable files, and gives modules no <code>require</code> or <code>module.exports</code> at all.</p>`, code: `function bundleBrute(modules) {
  return Object.values(modules).join('\\n');   // shared global scope, no exports, includes dead files
}` },
    mcq: { q: 'Why does the runtime store the module object in the cache BEFORE running its code?', options: ['So a circular require gets the partially built exports instead of recursing forever', 'To make the code run faster', 'Because functions cannot run twice', 'To sort the modules'], answer: 0, explain: 'If a requires b and b requires a, the second require finds a in the cache (still incomplete) and returns it, ending the cycle.' },
    hints: [`<p>Hint 1: First find reachable modules with a DFS from the entry, using a regex that extracts the path inside <code>require(...)</code>.</p>`, `<p>Hint 2: The runtime is a function <code>req(id)</code>: if cached return <code>cache[id].exports</code>; else create <code>{ exports: {} }</code>, store it, call the module function with <code>(module, module.exports, req)</code>, return exports.</p>`, `<p>Hint 3: Build the output string with a modules table whose values are <code>function (module, exports, require) { SOURCE }</code>. Use <code>JSON.stringify(id)</code> for keys. Test it with <code>new Function("return " + code)()</code>.</p>`],
    solution: {
      approach: `<p>Reachability by regex scan, then string assembly of an IIFE: a table of module wrapper functions plus a cached <code>require</code>. This is exactly the structure of a webpack 4 bundle.</p>`,
      code: { lang: 'js', run: true, code: R`function bundle(modules, entry) {
  // 1. reachable modules only (this is "tree shaking" at module level)
  const reachable = [];
  const seen = new Set();
  (function visit(id) {
    if (seen.has(id)) return;
    if (!(id in modules)) throw new Error('Cannot resolve ' + id);
    seen.add(id);
    reachable.push(id);
    const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = re.exec(modules[id]))) visit(m[1]);
  })(entry);

  // 2. module table: every module becomes a function with its own scope
  const table = reachable
    .map((id) => JSON.stringify(id) + ': function (module, exports, require) {\n' + modules[id] + '\n}')
    .join(',\n');

  // 3. the runtime: cache first, run second (so cycles see partial exports)
  return '(function (modules) {\n' +
    '  var cache = {};\n' +
    '  function req(id) {\n' +
    '    if (cache[id]) return cache[id].exports;\n' +
    '    var module = cache[id] = { exports: {} };\n' +
    '    modules[id](module, module.exports, req);\n' +
    '    return module.exports;\n' +
    '  }\n' +
    '  return req(' + JSON.stringify(entry) + ');\n' +
    '})({\n' + table + '\n})';
}

const mods = {
  './main': "const { inc } = require('./math'); module.exports = inc(41);",
  './math': "const log = require('./log'); exports.inc = (x) => { log.count++; return x + 1; };",
  './log': "exports.count = 0;",
  './unused': "module.exports = 'never bundled';"
};
const code = bundle(mods, './main');
console.log(new Function('return ' + code)());          // 42
console.log('contains unused?', code.includes('never bundled'));
const cyc = { './a': "exports.name = 'a'; const b = require('./b'); exports.fromB = b.seenA;", './b': "const a = require('./a'); exports.seenA = a.name;" };
console.log(new Function('return ' + bundle(cyc, './a'))());   // { name: 'a', fromB: 'a' }` },
      complexity: `<p>Time O(total source length) for scanning and joining, space O(output size).</p>`,
      followUps: ['Rewrite require calls to numeric ids to shrink the output', 'Support dynamic <code>import()</code> by emitting a second file and a loader']
    }
  });

  /* ---------- HARD 3 ---------- */
  practice.push({
    title: 'Mini Tree-Shaker on Source Text',
    level: 'Hard', tags: ['tree shaking', 'parsing', 'esm', 'graph'], companies: ['Google', 'Meta'],
    statement: `<p>Each module is source text made of top-level declarations that each start on a line beginning with <code>export function name</code> or <code>export const name</code> (a declaration continues until the next line that starts with <code>export</code>), optional <code>import { a, b } from './x'</code> lines, and nothing else. The app entry imports a list of names. Return, for every module, the source after shaking: keep only exports that are imported by the app or <b>used by (mentioned as a whole word in)</b> a kept declaration of the same module, and keep import lines only if one of their names is still mentioned by kept code. Cross-module use counts too: if a kept declaration mentions a name imported from another module, that export is kept there.</p>`,
    constraints: `Up to 50 modules, 500 declarations. Names are identifiers, unique across all modules to keep the exercise simple. Whole-word matching is enough (no real parser).`,
    example: `<p>math: <code>export const add = ...</code>, <code>export const sub = ...</code>, <code>export const twice = (x) =&gt; add(x, x)</code>. App imports <code>twice</code>.</p><p>Kept: ${H.c('g', 'twice')} and ${H.c('g', 'add')} (used by twice). Removed: ${H.c('r', 'sub')}.</p>`,
    brute: { why: `<p>Keeping every declaration (no analysis) ships all the dead code. Removing declarations that are not imported by the app, without following usage inside kept code, deletes <code>add</code> and breaks <code>twice</code> at runtime.</p>`, code: `function shakeBrute(mods, appImports) {
  const out = {};
  for (const [id, src] of Object.entries(mods)) {
    out[id] = src.split(/\\n(?=export )/).filter((d) => appImports.some((n) => d.includes(' ' + n + ' '))).join('\\n');
  } // drops 'add' even though 'twice' needs it
  return out;
}` },
    mcq: { q: 'Why must the algorithm repeat until no new names are marked?', options: ['A newly kept declaration can mention more names, which then also become used', 'Because regex only matches once', 'To sort the output', 'To reduce memory'], answer: 0, explain: 'Usage is transitive: twice uses add, add might use helper. Keeping twice makes add used, which can make helper used, and so on.' },
    hints: [`<p>Hint 1: Split each module into declarations and remember each declaration's name and text. Make a global map name → declaration.</p>`, `<p>Hint 2: Start a worklist with the names the app imports. Pop a name, mark it kept, and scan its declaration text for every other known export name as a whole word (<code>\\bname\\b</code>); push unseen ones.</p>`, `<p>Hint 3: Rebuild each module from kept declarations only. For import lines, keep the names still in the kept set; drop the line if none remain. A name imported but never mentioned must not keep anything alive.</p>`],
    solution: {
      approach: `<p>Mark and sweep over declarations: the worklist marks transitively used names, then each module is rewritten with only the kept declarations and the needed import names.</p>`,
      code: { lang: 'js', run: true, code: R`function shake(mods, appImports) {
  // 1. parse declarations and import lines
  const decls = {};                       // name -> { module, text }
  const imports = {};                     // module -> [{ names, from }]
  for (const [id, src] of Object.entries(mods)) {
    imports[id] = [];
    for (const block of src.split(/\n(?=export |import )/)) {
      const imp = block.match(/^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/);
      if (imp) { imports[id].push({ names: imp[1].split(',').map((s) => s.trim()).filter(Boolean), from: imp[2] }); continue; }
      const d = block.match(/^export\s+(?:function|const)\s+([A-Za-z_$][\w$]*)/);
      if (d) decls[d[1]] = { module: id, text: block };
    }
  }
  // 2. mark transitively
  const kept = new Set();
  const work = [...appImports];
  while (work.length) {
    const name = work.pop();
    if (kept.has(name) || !decls[name]) continue;
    kept.add(name);
    for (const other of Object.keys(decls)) {
      if (other !== name && new RegExp('\\b' + other + '\\b').test(decls[name].text)) work.push(other);
    }
  }
  // 3. rebuild each module
  const out = {};
  for (const id of Object.keys(mods)) {
    const lines = [];
    for (const imp of imports[id]) {
      const names = imp.names.filter((n) => kept.has(n) && Object.keys(decls).some((k) => decls[k].module !== id && k === n));
      if (names.length) lines.push("import { " + names.join(', ') + " } from '" + imp.from + "';");
    }
    for (const [name, d] of Object.entries(decls)) if (d.module === id && kept.has(name)) lines.push(d.text);
    out[id] = lines.join('\n');
  }
  return out;
}

const mods = {
  './math': "export const add = (a, b) => a + b;\nexport const sub = (a, b) => a - b;\nexport const twice = (x) => add(x, x);",
  './fmt': "import { twice } from './math';\nexport const label = (x) => 'x2=' + twice(x);\nexport const unusedFmt = () => 'dead';"
};
const result = shake(mods, ['label']);
for (const [id, src] of Object.entries(result)) console.log('// ' + id + '\n' + src);` },
      complexity: `<p>Time O(K·D) for K kept declarations and D total declarations (each kept name scans all names); space O(D).</p>`,
      followUps: ['Respect a <code>sideEffects</code> list: keep whole modules that run code at import time', 'Replace regex matching with a real parser so strings and comments are ignored']
    }
  });

  /* ---------- HARD 4 ---------- */
  practice.push({
    title: 'Affected Packages in a Monorepo (Affected-Only CI)',
    level: 'Hard', tags: ['monorepo', 'ci', 'graph', 'topological sort'], companies: ['Google', 'Nx'],
    statement: `<p>A monorepo has packages with dependencies between them (<code>app</code> depends on <code>ui</code>, which depends on <code>utils</code>). A pull request changed some files. Write <code>affected(packages, changedFiles)</code> where <code>packages</code> maps a name to <code>{ dir, deps: [names] }</code>. A package is <b>directly changed</b> if a changed file path starts with its <code>dir + "/"</code>. A package is <b>affected</b> if it is directly changed or depends (directly or indirectly) on an affected package. Return affected packages in a valid <b>build order</b> (dependencies first, ties alphabetical). Files outside every package dir (like a root <code>package.json</code> or <code>pnpm-lock.yaml</code>) mean <b>everything</b> is affected.</p>`,
    constraints: `Up to 2000 packages, acyclic. Changed files up to 10<sup>4</sup>. Treat a changed root-level lockfile or <code>package.json</code> as "rebuild all".`,
    example: `<p>utils ← ui ← app, and docs (no deps). Changed: <code>packages/utils/src/a.js</code>.</p><p>Affected in order: ${H.c('g', 'utils, ui, app')}. <code>docs</code> is untouched, so CI skips it, saving minutes. Changing <code>pnpm-lock.yaml</code> returns all four.</p>`,
    brute: { why: `<p>Rebuilding and testing every package on every pull request is correct but wasteful: in a repo with 200 packages a README fix would trigger a 40 minute pipeline. Checking only directly changed packages is fast but misses dependants that now break.</p>`, code: `function affectedBrute(packages, changedFiles) {
  const names = Object.keys(packages);
  return names.filter((n) => changedFiles.some((f) => f.startsWith(packages[n].dir + '/'))).sort();
  // misses packages that depend on a changed package
}` },
    mcq: { q: 'Package ui depends on utils. utils changed. What about ui?', options: ['ui is affected and must be rebuilt after utils', 'ui is unaffected', 'ui is deleted', 'Only utils is tested'], answer: 0, explain: 'Dependants consume the changed code, so their build and tests could break. The change flows along reverse dependency edges.' },
    hints: [`<p>Hint 1: Build a reverse graph: for each package, who depends on it? A change spreads from a package to everything that depends on it.</p>`, `<p>Hint 2: Start from directly changed packages and do BFS/DFS along the reverse edges, collecting an affected set. First handle the "root file changed" rule.</p>`, `<p>Hint 3: To order the result, run a topological sort restricted to the affected set (Kahn's algorithm with a sorted ready list, counting only dependencies that are also affected).</p>`],
    solution: {
      approach: `<p>Find directly changed packages, expand through reverse dependencies, then topologically sort only the affected subgraph using Kahn's algorithm with alphabetical tie-breaking.</p>`,
      code: { lang: 'js', run: true, code: `function affected(packages, changedFiles) {
  const names = Object.keys(packages);
  const inAnyPackage = (f) => names.some((n) => f.startsWith(packages[n].dir + '/'));
  const everything = changedFiles.some((f) => !inAnyPackage(f));       // root lockfile, root package.json...
  const set = new Set();

  if (everything) names.forEach((n) => set.add(n));
  else {
    // reverse edges: dep -> packages that depend on it
    const dependants = {};
    for (const n of names) for (const d of packages[n].deps) (dependants[d] = dependants[d] || []).push(n);
    const stack = names.filter((n) => changedFiles.some((f) => f.startsWith(packages[n].dir + '/')));
    while (stack.length) {
      const n = stack.pop();
      if (set.has(n)) continue;
      set.add(n);
      for (const up of dependants[n] || []) stack.push(up);           // the change flows upward
    }
  }

  // Kahn's algorithm on the affected subgraph, dependencies first
  const indeg = {};
  for (const n of set) indeg[n] = packages[n].deps.filter((d) => set.has(d)).length;
  const ready = [...set].filter((n) => indeg[n] === 0).sort();
  const order = [];
  while (ready.length) {
    const n = ready.shift();
    order.push(n);
    for (const m of set) {
      if (packages[m].deps.includes(n) && --indeg[m] === 0) { ready.push(m); ready.sort(); }
    }
  }
  return order;
}

const packages = {
  utils: { dir: 'packages/utils', deps: [] },
  ui: { dir: 'packages/ui', deps: ['utils'] },
  app: { dir: 'apps/app', deps: ['ui', 'utils'] },
  docs: { dir: 'apps/docs', deps: [] }
};
console.log(affected(packages, ['packages/utils/src/a.js']));  // [ 'utils', 'ui', 'app' ]
console.log(affected(packages, ['apps/docs/readme.md']));      // [ 'docs' ]
console.log(affected(packages, ['pnpm-lock.yaml']));           // everything` },
      complexity: `<p>Time O(P + E + F·P) in this simple version (F files, P packages, E edges); with a prefix trie for directories it drops to O(P + E + F). Space O(P + E).</p>`,
      followUps: ['Cache task outputs by hashing inputs so even affected packages skip work on a cache hit', 'Add a per-task graph (build, test, lint) instead of per-package only']
    }
  });

  /* ================================================================
     QUIZ
     ================================================================ */
  quiz.push({ q: 'package.json has <code>"left-pad": "^1.3.0"</code> and the registry has 1.3.0, 1.9.2 and 2.0.0. Without a lockfile, what does a fresh install give?', options: ['1.9.2', '2.0.0', '1.3.0', 'It fails'], answer: 0, explain: 'Caret allows any version with the same MAJOR that is at least 1.3.0, and npm picks the highest of those: 1.9.2. 2.0.0 is a new MAJOR.' });
  quiz.push({ q: 'What does <code>~2.4.1</code> accept?', options: ['2.4.1 up to but not including 2.5.0', '2.4.1 up to but not including 3.0.0', 'Exactly 2.4.1', 'Anything below 2.4.1'], answer: 0, explain: 'Tilde allows patch-level changes only, so the MINOR number is frozen.' });
  quiz.push({ q: 'Why does CI use <code>npm ci</code> instead of <code>npm install</code>?', options: ['It installs exactly what the lockfile says and fails if package.json disagrees', 'It is always faster at downloading', 'It ignores devDependencies', 'It updates all packages to the latest'], answer: 0, explain: 'Reproducibility is the goal: the same lockfile gives the same tree on every machine, and drift is reported as an error.' });
  quiz.push({ q: 'Which is TRUE about tree shaking?', options: ['It relies on the static structure of ES module import/export', 'It works equally well on CommonJS require()', 'It removes unused CSS classes only', 'It happens at runtime in the browser'], answer: 0, explain: 'Static imports/exports can be analysed at build time. CommonJS require is a runtime function call, so usage cannot be proven.' });
  quiz.push({ q: 'A UI package re-exports 40 components from <code>index.js</code> and has no <code>sideEffects</code> field. You import one component. What is the likely result?', options: ['The bundler may keep many unused components because it cannot prove they have no side effects', 'Exactly one component is bundled, always', 'The build fails', 'Only CSS is bundled'], answer: 0, explain: 'Without sideEffects: false, evaluating a file could matter, so unused re-exported files are retained.' });
  quiz.push({ q: 'What is the difference between transpiling and polyfilling?', options: ['Transpiling rewrites new syntax at build time; polyfilling adds missing APIs at runtime', 'They are the same', 'Polyfills rewrite syntax; transpilers add functions', 'Transpiling only minifies'], answer: 0, explain: 'Optional chaining needs a syntax rewrite; Array.prototype.at needs a function that did not exist, so a polyfill supplies it.' });
  quiz.push({ q: 'Vite builds and runs your TypeScript app although it contains a type error. Why?', options: ['Vite only strips types (esbuild); type checking is a separate tsc step', 'Vite is lenient by design in production only', 'TypeScript errors are warnings by default', 'The error is not real'], answer: 0, explain: 'Bundlers erase types without checking them. Run tsc --noEmit in CI and the editor to enforce types.' });
  quiz.push({ q: 'In ESLint plus Prettier setups, what is Prettier\'s job?', options: ['Formatting (layout) only', 'Finding bugs like unused variables', 'Type checking', 'Running tests'], answer: 0, explain: 'Prettier prints code consistently; ESLint finds problematic patterns. eslint-config-prettier switches off ESLint rules that would clash.' });
  quiz.push({ q: 'What does <code>expect({a: 1}).toBe({a: 1})</code> do in Jest or Vitest?', options: ['Fails, because toBe compares references and these are two different objects', 'Passes, because the contents match', 'Throws a syntax error', 'Passes only in strict mode'], answer: 0, explain: 'toBe uses Object.is. Use toEqual for deep content comparison.' });
  quiz.push({ q: 'You want to assert that an error message is NOT on the screen in React Testing Library. Which query?', options: ['queryByRole("alert") with not.toBeInTheDocument()', 'getByRole("alert") with not.toBeInTheDocument()', 'findByRole("alert")', 'getByTestId("alert")'], answer: 0, explain: 'queryBy returns null when nothing matches, whereas getBy throws, so only queryBy can express absence.' });
  quiz.push({ q: 'Which RTL query should you try FIRST for a button?', options: ['getByRole("button", { name: "Save" })', 'getByTestId("save")', 'container.querySelector(".btn")', 'getByClassName("btn-primary")'], answer: 0, explain: 'Role plus accessible name matches how users and assistive technology find the button and also proves it is accessible.' });
  quiz.push({ q: 'Playwright\'s <code>await expect(page).toHaveURL(/dashboard/)</code> is better than <code>expect(page.url()).toContain("dashboard")</code> because…', options: ['It retries until the condition holds or times out', 'It is shorter', 'It checks the page title', 'It skips the browser'], answer: 0, explain: 'Web-first assertions poll, so they tolerate the normal delay of navigation. page.url() is read once, right now.' });
  quiz.push({ q: 'How does Playwright keep tests from affecting each other?', options: ['Each test gets a fresh browser context with empty cookies and storage', 'Tests always run one at a time', 'It clears the database', 'It restarts the computer'], answer: 0, explain: 'A context is a cheap, isolated browser profile, which also makes parallel runs safe.' });
  quiz.push({ q: 'A pipeline has install → [lint, types, test] → build. Durations: install 40, lint 20, types 30, test 45, build 60. With parallel jobs and no failure, what is the total time?', options: ['145 s', '195 s', '60 s', '100 s'], answer: 0, explain: 'install 40 + slowest parallel job (test 45) + build 60 = 145 seconds. The sum of all jobs (195 s) only applies if run one by one.' });
  quiz.push({ q: 'Why is the CI cache key usually derived from a hash of the lockfile?', options: ['Cache stays valid until dependencies change, then a new key forces a fresh install', 'So the cache never expires', 'Because lockfiles are small', 'To encrypt the cache'], answer: 0, explain: 'The lockfile fully describes the dependency tree, so its hash is a precise invalidation signal.' });

  /* ================================================================
     INTERVIEW
     ================================================================ */
  interview.push({ q: 'Explain semantic versioning and the difference between <code>^</code> and <code>~</code> in package.json.', level: 'B', a: `<p>Semver is <b>MAJOR.MINOR.PATCH</b>: patch for bug fixes, minor for backwards-compatible features, major for breaking changes. <code>^1.4.2</code> (caret) accepts new MINOR and PATCH versions but not a new MAJOR, so up to but excluding 2.0.0. <code>~1.4.2</code> (tilde) accepts only PATCH updates, up to but excluding 1.5.0. Below 1.0.0 the caret is stricter: <code>^0.4.2</code> stays below 0.5.0 because 0.x versions make no stability promise. In practice npm resolves the range to the highest matching published version, then freezes it in the lockfile.</p>`, followUps: ['What happens with prerelease versions?', 'Why do some teams pin exact versions for TypeScript?'] });
  interview.push({ q: 'Why do we commit a lockfile, and what is the difference between <code>npm install</code> and <code>npm ci</code>?', level: 'B', a: `<p>package.json holds <i>ranges</i>; the lockfile records the <b>exact version, URL and integrity hash</b> of every package in the tree, direct and transitive. Committing it means every developer, CI run and production build installs the identical tree, so "works on my machine" bugs from silent upstream updates disappear, and tampering is detected by the hash. <code>npm install</code> may resolve new versions and rewrite the lockfile. <code>npm ci</code> deletes node_modules, installs strictly from the lockfile and fails if it disagrees with package.json. Use <code>npm ci</code> (or <code>pnpm install --frozen-lockfile</code>) in CI and deploys. Libraries usually still commit it for their own CI, but consumers ignore it.</p>`, followUps: ['How do you upgrade dependencies safely?', 'What is an integrity hash protecting against?'] });
  interview.push({ q: 'npm vs pnpm vs yarn: why might a team choose pnpm?', level: 'I', a: `<p>All three read package.json and produce a dependency tree. <b>pnpm</b> stores each package version once in a global content-addressable store and <b>hard-links</b> files into projects, so installs are fast and disk use is low, especially in monorepos. Its <code>node_modules</code> is <b>strict</b>: only declared dependencies are linked at the top, which prevents "phantom dependencies" (importing a package you never listed that happened to be hoisted). It has first-class workspaces (<code>workspace:*</code>) and a deterministic lockfile. Costs: occasional tools that assume the flat npm layout need configuration, and the team must learn a few new commands. npm is the zero-setup default; Yarn Berry offers Plug'n'Play and constraints.</p>`, followUps: ['What is a phantom dependency and why is it dangerous?', 'How do workspaces help a monorepo?'] });
  interview.push({ q: 'What does a bundler do, and why do we still need one in the era of native ES modules?', level: 'I', a: `<p>A bundler starts at an entry file, <b>resolves</b> each import to a file, <b>transforms</b> it (TypeScript, JSX, CSS, assets), builds the <b>module graph</b>, splits it into <b>chunks</b>, <b>optimises</b> (tree shaking, minification, hashing) and <b>emits</b> files. Browsers can load ES modules, but bare imports like <code>react</code> are not understood, JSX and TypeScript are not native, hundreds of small files cause request overhead and waterfalls, and production needs minified, tree-shaken, content-hashed, code-split output. In development, tools like Vite skip bundling for speed and serve modules on demand; for production they still bundle.</p>`, followUps: ['How does code splitting with import() work?', 'What do content hashes buy you?'] });
  interview.push({ q: 'Compare webpack, Vite and esbuild. When would you choose each?', level: 'I', a: `<p><b>webpack</b> bundles everything, with loaders and plugins and a runtime; it is the most configurable (module federation, exotic assets, huge ecosystem) but slow to configure and to run on large apps. <b>Vite</b> serves native ES modules in development (dependencies are pre-bundled) so start-up and HMR are near-instant, and uses Rolldown (Vite 8 and later; Rollup before that) for production with a small config; it is the default for new React/Vue/Svelte apps. <b>esbuild</b> is a Go bundler/minifier that is 10 to 100 times faster but with a smaller plugin and code-splitting feature set, so it is usually a building block (inside Vite, tsup) or used for libraries and scripts. Choose Vite for new apps, webpack/Rspack when you need federation or have a large webpack investment, esbuild for tooling and libraries.</p>`, followUps: ['What are Rspack and Turbopack?', 'Why can dev and production behave differently in Vite?'] });
  interview.push({ q: 'How would you reduce the JavaScript bundle size of a slow-loading React app?', level: 'I', a: `<p>Measure first with a bundle analyser to see what is big. Then: (1) <b>code-split</b> by route and by heavy features using <code>import()</code> and <code>React.lazy</code>; (2) <b>tree shake</b> by using ES-module builds (<code>lodash-es</code>), fixing barrel-file imports and checking <code>sideEffects</code>; (3) replace heavy libraries (moment → date-fns or Temporal/Intl, large icon sets → per-icon imports); (4) <b>lower the target</b> (modern syntax, fewer polyfills); (5) compress with Brotli and cache with content hashes; (6) lazy-load below-the-fold components and images; (7) set a <b>performance budget</b> in CI to stop regressions. Verify with Lighthouse and real-user metrics, not only bundle size.</p>`, followUps: ['How do you prevent regressions after the cleanup?', 'What is the trade-off of too many small chunks?'] });
  interview.push({ q: 'What is tree shaking, what makes it fail, and what is the <code>sideEffects</code> field?', level: 'A', a: `<p>Tree shaking removes <b>exports that nothing imports</b>, determined by analysing the static ES-module graph, then deleting them (the bundler marks them and the minifier removes the code). It fails or weakens when code is CommonJS (<code>require</code> is dynamic), when modules are transpiled to CommonJS before bundling (<code>modules: "commonjs"</code>), with <code>import * as</code> plus dynamic property access, with top-level code that has side effects or impure calls the bundler cannot prove safe (fix with <code>/*#__PURE__*/</code>), and with barrel files. The <code>sideEffects</code> field in a package.json tells the bundler that files are free of import-time effects (<code>false</code>) or lists the ones that have them (<code>["*.css"]</code>), so unused modules can be dropped entirely. Lying in that field removes code that mattered, such as CSS imports.</p>`, followUps: ['How would you debug why a library is not shaken?', 'What is the difference between tree shaking and minifier dead-code elimination?'] });
  interview.push({ q: 'Why use TypeScript in a frontend codebase, and what does it NOT protect you from?', level: 'I', a: `<p>TypeScript catches whole classes of errors at build time (wrong prop names, missing fields, possible <code>undefined</code>), documents component contracts, powers editor autocomplete and safe refactors, and makes large teams faster. Discriminated unions model UI states precisely. It does <b>not</b> protect you at runtime: types are erased, so JSON from the network, <code>localStorage</code>, URL params and third-party scripts can violate the types. Validate those boundaries (zod, valibot) and infer types from the schema. Also casts (<code>as</code>) and <code>any</code> disable checking, and bundlers do not type-check, so run <code>tsc --noEmit</code> in CI. Use <code>strict</code> mode from the start.</p>`, followUps: ['any vs unknown?', 'How would you migrate a large JS codebase gradually?'] });
  interview.push({ q: 'How do you type a reusable React component such as <code>Select</code> or <code>Table</code>?', level: 'A', a: `<p>Make the props interface <b>generic</b>: <code>interface SelectProps&lt;T&gt; { options: T[]; value: T | null; getLabel: (o: T) =&gt; string; onChange: (o: T) =&gt; void }</code> and <code>function Select&lt;T&gt;(props: SelectProps&lt;T&gt;)</code>. TypeScript infers <code>T</code> from the options at the call site, so <code>onChange</code> receives the real object type with no casting. Use literal unions for fixed choices, optional properties with <code>?</code>, <code>React.ReactNode</code> for children, <code>React.ComponentProps&lt;"button"&gt;</code> (with <code>Omit</code>) to inherit native attributes, and discriminated unions when props depend on each other (for example <code>multiple: true</code> means <code>value: T[]</code>). Keep generics shallow: type-level cleverness must pay for its complexity.</p>`, followUps: ['How would you require onChange only when the field is not readOnly?', 'Generic components and forwardRef: what is the difficulty?'] });
  interview.push({ q: 'ESLint vs Prettier: how do they differ, and how do you set up a team workflow around them?', level: 'B', a: `<p>Prettier is an opinionated <b>formatter</b>: it re-prints code from its AST so style arguments disappear. ESLint is a <b>linter</b>: it finds probable bugs and bad patterns (unused variables, <code>==</code>, missing hook dependencies, missing alt text) with configurable rules and some auto-fixes. They overlap on style rules, so use <code>eslint-config-prettier</code> to turn those off. Workflow: format on save in the editor, a <b>pre-commit hook</b> with husky and lint-staged that runs both on staged files only, and the <b>same checks in CI</b> (<code>eslint --max-warnings=0</code>, <code>prettier --check</code>) because hooks can be skipped. Commit the configs, pin versions, and roll out new rules gradually as warnings first.</p>`, followUps: ['What is lint-staged for?', 'How do you introduce a strict rule to a legacy codebase?'] });
  interview.push({ q: 'How do you structure unit tests, and what makes a good one? Jest vs Vitest?', level: 'I', a: `<p>Use <b>Arrange, Act, Assert</b>: set up inputs, call the unit once, assert one behaviour. Name tests as sentences describing behaviour. Keep tests <b>independent, deterministic and fast</b>: no shared mutable state, fake timers and clocks, no real network (stub or use MSW), seeded randomness. Test <b>behaviour and public contracts</b>, not private implementation, so refactors do not break tests. Cover happy path, boundaries (empty, zero, max), invalid input and errors. Use <code>it.each</code> for tables of cases and mocks only at boundaries. Jest and Vitest share nearly the same API; Vitest reuses the Vite config (ESM, TypeScript, aliases) and is faster in watch mode, Jest is mature and common in older and React Native projects. Coverage reveals untested code, not test quality.</p>`, followUps: ['Mock vs stub vs spy?', 'How do you deal with a flaky unit test?'] });
  interview.push({ q: 'Explain the test pyramid. How does it apply to a React frontend?', level: 'I', a: `<p>The pyramid says: many fast, cheap <b>unit</b> tests at the base, fewer <b>integration</b> tests in the middle, and a small number of slow, realistic <b>end-to-end</b> tests on top, because cost, flakiness and debugging difficulty grow with height. For React, a popular variant is the <b>testing trophy</b>: static analysis (TypeScript, ESLint) at the base, then some unit tests for pure logic, <b>mostly component/integration tests with React Testing Library</b> (render a feature with its state and a mocked network and interact like a user), and a few Playwright journeys for critical paths (login, checkout). Avoid the inverted "ice-cream cone" where most checks are slow E2E tests. Push each check down to the cheapest layer that can catch the bug.</p>`, followUps: ['What would you put in the E2E layer for an online shop?', 'Where do visual regression tests fit?'] });
  interview.push({ q: 'What is the philosophy of React Testing Library, and how do you choose queries?', level: 'I', a: `<p>RTL says tests should resemble how users use the software, so you interact with the rendered DOM and avoid implementation details (state, instance methods, class names, component names). Query priority: <code>getByRole</code> with an accessible name first (it mirrors assistive technology and exposes accessibility bugs), then <code>getByLabelText</code> for fields, <code>getByPlaceholderText</code>/<code>getByText</code>, then <code>getByDisplayValue</code>, <code>getByAltText</code>, <code>getByTitle</code>, and <code>getByTestId</code> only as a last resort. Use <code>getBy</code> when it must exist now, <code>queryBy</code> to assert absence, <code>findBy</code> (async, retrying) for things that appear later. Interact with <code>userEvent</code>, assert with jest-dom matchers, and mock the network at the edge with MSW.</p>`, followUps: ['getBy vs queryBy vs findBy?', 'Why prefer userEvent over fireEvent?'] });
  interview.push({ q: 'How do you make Playwright E2E tests reliable instead of flaky?', level: 'A', a: `<p>Rely on <b>auto-waiting</b> and <b>web-first assertions</b> (<code>await expect(locator).toBeVisible()</code>, <code>toHaveURL</code>) that retry until true; never use fixed sleeps. Use <b>user-facing locators</b> (role, label, text) and scope within regions instead of long CSS paths. Isolate tests: each runs in a fresh context and owns its data, created via API or fixtures rather than through the UI; log in once with <code>storageState</code>. Control the world: mock or stub third-party calls with <code>page.route</code>, freeze time when needed, disable animations. Keep tests short and about one journey. Configure <code>retries</code> only in CI with <code>trace: "on-first-retry"</code> and read the trace to find the root cause. Track flake rate and quarantine, then fix or delete, flaky tests. Run against a production build in a pinned browser and OS image.</p>`, followUps: ['How do you test a feature that sends an email?', 'How do you run a big suite faster in CI?'] });
  interview.push({ q: 'Design a CI/CD pipeline for a React app: stages, speed, safety.', level: 'A', a: `<p>On each pull request: checkout, set up Node with the dependency <b>cache</b> (key from the lockfile), <code>npm ci</code>; run <b>lint, type-check and unit/component tests in parallel</b> jobs; then <b>build</b> and enforce a bundle-size budget; deploy a <b>preview URL</b> and run <b>Playwright</b> E2E and optionally Lighthouse/axe against it. Mark essential jobs as <b>required checks</b> with branch protection and review. Cancel superseded runs with <code>concurrency</code>. On merge to main: re-run, build once, publish the immutable hashed assets, deploy (progressive rollout or feature flags), run smoke tests, keep the previous release for fast rollback and watch error monitoring. Safety: least-privilege <code>permissions</code>, secrets in the CI store, OIDC for cloud credentials, pinned actions, dependency bot PRs, no secrets for forks. Speed: caching, sharding tests, affected-only builds in a monorepo, cheap checks first.</p>`, followUps: ['How do you shorten a 30 minute pipeline?', 'How would you handle a flaky test blocking everyone?'] });
  interview.push({ q: 'AI coding assistants are writing more of your code. How do build, test and CI tooling change in importance?', level: 'E', a: `<p>They become the <b>verification layer</b> that makes machine-written code trustworthy. Fast deterministic gates (formatter, linter, type-checker, unit and component tests, build, E2E) give an agent precise feedback and give reviewers confidence without reading every line. So: keep one command that runs all checks and make it fast, enforce it in CI with branch protection, keep tests meaningful (behaviour-based, mutation-checked) because agents can write vacuous or implementation-mirroring tests and can weaken assertions to go green. Review config and test changes with extra care (disabled rules, <code>continue-on-error</code>, widened permissions), pin and audit dependencies because assistants may suggest hallucinated or typosquatted packages, and treat workflow files as security-sensitive. Humans still own requirements, the definition of correct, and the risk decisions.</p>`, followUps: ['How would you detect a test written to pass rather than to verify?', 'What guardrails would you add before letting an agent open PRs automatically?'] });

  registerModule({
    id: 'fe14',
    title: 'Tooling, Build & Testing',
    intro: `<p>Writing the component is half the job. The other half is the machinery around it: <b>package managers</b> that fetch other people's code, <b>bundlers</b> that turn hundreds of files into a few fast ones, <b>transpilers and tree shaking</b> that shrink and modernise the output, <b>TypeScript, ESLint and Prettier</b> that catch mistakes early, <b>tests</b> at every level (Jest/Vitest, React Testing Library, Playwright) and a <b>CI pipeline</b> that runs it all on every pull request. In this module you will read a package.json like a pro, see exactly what a bundler and tree shaker do, and write the tests and pipelines that interviewers ask about.</p>`,
    goals: [
      'Read a package.json, resolve semver ranges by hand and explain why the lockfile and <code>npm ci</code> matter',
      'Explain how a bundler builds a module graph, splits chunks and what tree shaking can and cannot remove',
      'Type a React component\'s props (including generics) and explain what TypeScript does not check at runtime',
      'Set up ESLint, Prettier and git hooks, and know why CI is the real gate',
      'Write unit tests (Jest/Vitest), React Testing Library tests by role, and a Playwright login test without sleeps',
      'Design a fast, safe CI pipeline in YAML with caching, parallel jobs, required checks and a failing-step story'
    ],
    prereqs: `Frontend modules on JavaScript fundamentals, React Fundamentals and Hooks (fe08, fe09), and Frontend Security &amp; Networking (fe13) is helpful. You should be comfortable running commands in a terminal.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
