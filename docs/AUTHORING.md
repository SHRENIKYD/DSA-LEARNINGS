# Authoring Guide — one module per author

Repo root: `/home/user/DSA-LEARNINGS` (ROOT). The engine is done (`src/`). You write exactly ONE file:
`ROOT/content/<track>/<moduleId>.js` (e.g. `content/sql/sql06.js`). Never edit `src/`, `tools/`, `docs/`, other modules, or git.

1. Find your module in `ROOT/src/tracks.js` — its `level`, `title` and `scope` string. **Cover every item in the scope**, in depth, from beginner to expert within the module's level.
2. Read `ROOT/docs/example-module.js` — a working example of every field and every visualizer part type.
3. Write the module (in pieces if large, see "Writing large files").
4. Run the validator until it prints PASSED: `cd ROOT && node tools/validate.js content/<track>/<id>.js --code`

## Voice & teaching style (most important)
- **Super simple everyday English** — explain like a friend over coffee. Define unavoidable jargon in one plain sentence.
- **Real-world analogy FIRST** for every topic (`analogy`).
- **Visual explanations**: small numbers, step tables (`H.table`), mini arrays (`H.arr`), bit rows (`H.bits`), sets/maps (`H.chips`, `H.kv`), colour (`H.c`). No scary equations without a worked numeric example.
- **Beginner → expert layering inside every topic**: `explain` (🟢 plain idea) → `viz` + `code` (🔵 how it really works) → `examples` (worked cases) → `deepDive` (🟣 internals, proofs, edge cases, performance, production reality) → `aiEra` (🤖).
- **Clues in the Question** (`clues`, ≥ 3, aim 5+): exact interview phrases + constraint hints that signal this concept/pattern (e.g. "N ≤ 10<sup>5</sup> → O(N log N)", "minimize the maximum", "design for 100M users", "consistent reads after write").
- **Old school vs new school**: fundamentals by hand first; `aiEra` explains how AI changes the topic and how to work alongside it.
- Be factually correct and current (2026). Code must be correct, idiomatic, heavily commented, no placeholders.

## Required counts (validator enforces)
| Field | Requirement |
|---|---|
| module `intro` | ≥ 120 chars HTML |
| `goals` | ≥ 3 concrete outcomes |
| `prereqs` | HTML shown above the lessons. Required and helpful modules come from `src/paths.js` (`NEEDS`, `RECS`); add the new module's id there too, and `node tools/paths-check.js` must pass |
| `hours` | number, realistic incl. practice |
| `topics` | ≥ 3 (typically 4–8; one per scope item group) |
| each topic | `analogy` ≥ 80 · `explain` ≥ 300 · `deepDive` ≥ 250 · `aiEra` ≥ 250 chars of text · `clues` ≥ 3 · **`viz` ≥ 1 (MANDATORY)** · **`examples` ≥ 3** |
| guided problems (`topic.problems`) | ≥ 3 across the module (aim one per topic) |
| `practice` | **12–20** problems: ≥ 3 Easy, ≥ 4 Medium, ≥ 3 Hard; order Easy → Medium → Hard |
| `quiz` | **≥ 10** MCQs |
| `interview` | **≥ 12** Q&A (answer ≥ 150 chars) with `followUps` |

## Schema
```js
registerModule({
  id: 'sql06',                                // must equal file name and tracks.js id
  title: 'Window Functions',
  lang: 'sql',                                // optional; default = track lang
  intro: `<p>HTML</p>`,
  goals: ['HTML', ...], prereqs: `HTML`, hours: 8,
  databases: { shop: `CREATE TABLE ...; INSERT ...;` },   // SQL track / any SQL snippet with db: sample DBs (SQLite dialect)
  topics: [{
    title: 'ROW_NUMBER vs RANK vs DENSE_RANK',
    analogy: `HTML`, explain: `HTML`, clues: ['HTML', ...],
    code: snippet | [snippet, ...], codeTitle: 'title' | ['t1', ...],   // optional reference code
    viz: vizObject | [vizObject, ...],                                // REQUIRED ≥ 1
    examples: [{ title: 'text', html: `HTML`, code: snippet? }, ...], // REQUIRED ≥ 3
    deepDive: `HTML`, aiEra: `HTML`, after: `HTML?`,
    problems: [problem, ...]                                          // guided "Solve It Yourself"
  }],
  quiz: [{ q: `HTML`, options: [`HTML` x3-5], answer: 0, explain: `HTML` }],
  interview: [{ q: `HTML`, a: `HTML`, level: 'B'|'I'|'A'|'E', followUps: [`HTML`, ...] }],
  practice: [problem, ...]
});
```
**snippet** = a string (in the module/track default language) or `{ lang, code, title?, db?, run?, check? }`
- `lang`: java · python · js · ts · cpp · sql · go · bash · yaml · json · html · css · http · text
- `db: 'shop'` (SQL) → adds a ▶ Run button that executes against `databases.shop` in the browser (SQLite via sql.js). The validator runs it too.
- `run: true` (js, python) → ▶ Run button (JS in a sandboxed iframe — no DOM-dependent code; Python via Pyodide). Validator executes it: must finish < 10 s without error, print something useful.
- `check: false` → skip compile check. ONLY for code needing external frameworks/dialects (Spring/Express/React/Kafka client/Postgres-only syntax/Dockerfile etc.). Everything else must compile.

**problem**
```js
{
  title, level: 'Easy'|'Medium'|'Hard', tags: [...], companies: ['Amazon', ...]?, lang?,
  statement: `HTML`, constraints: `HTML`,
  example: `HTML`,            // colour-coded sample I/O + WHY the output is what it is
  brute: { why: `HTML`, code: snippet },   // naive approach + where the wasted work is
  mcq: { q, options, answer, explain },    // "What would you do?" intuition check
  hints: [`Hint 1: the aha observation`, `Hint 2: data structure / approach`, `Hint 3: edge cases + plain-English recipe/pseudocode`],
  solution: {
    approach: `HTML`, code: snippet, alt: [snippet, ...]?,   // alt = same solution in other languages (tabs)
    dry: { head: [...], rows: [[...], ...] },               // dry-run table (required for guided problems in DSA & language tracks)
    complexity: `HTML`, followUps: [`HTML`, ...]?
  }
}
```
Tests and languages (DSA and LLD; see `docs/LANGUAGE_AUTHORING.md` for the full format):
- every problem has `tests` (function, design-class or stdin/stdout program mode, ≥ 6 cases incl. boundaries), checked with `node tools/solution-check.js content/<track>/<id>.js --require java,python,js,cpp` (LLD: `ts` instead of `js`);
- `solution.code` is Java; `solution.alt` holds Python, JS (LLD: TypeScript) and C++ versions that pass the same tests;
- Java lesson code gets the same `alt` tabs; the learner's chosen language is shown first;
- module `langNotes: { java, python, js, cpp }` (HTML) covers recursion limits, integer behaviour, heaps and complexity traps for that module;
- a module outside DSA/LLD whose code is in one language sets `langExplain` (HTML) to say why, so learners on another language route are not left guessing.

Track rules (from `src/tracks.js`): `code: 'required'` tracks (dsa, java, py, js, cpp, sql, lld, fe) need `brute.code` and `solution.code` on every problem. `code: 'optional'` tracks (hld, be, ai, cs, beh) may omit code, but then `solution.approach` must be ≥ 200 chars (a full written design/answer). For HLD use `brute` = naive design and why it breaks; for behavioral use `brute` = a weak answer and why it fails, `solution.approach` = a strong model answer.

### Java / Python / JS / TS / C++ / SQL checks
- Java: compiled with javac 21 + `java.util.*`, `java.util.function.*`, `java.util.stream.*`, `java.util.concurrent.*` (+atomic, locks), `java.io.*`, `java.math.*`, `java.time.*`. Snippet may be full classes, methods, or statements. `ListNode`/`TreeNode` (LeetCode-style) auto-provided; define any other helper class yourself.
- Python: compiled; `run: true` ones executed.  JS/TS/JSX/TSX: syntax-checked (TypeScript parser); `run: true` JS executed in Node.
- C++: `g++ -std=c++20 -fsyntax-only` with `<bits/stdc++.h>` + `using namespace std;` pre-included; full program or statements.
- SQL: executed in SQLite 3.45 (window functions, CTEs, UPSERT supported). With `db`, against that schema; without `db`, on an empty DB (so DDL must be self-contained).

## HTML rules
- Prose is HTML. Escape literal `<`/`>` in prose: `List&lt;Integer&gt;`, `i &lt; n`, `&lt;div&gt;`. (Code fields are auto-escaped — write normal code there.)
- Allowed tags: p b i u em strong code pre sub sup br hr small mark kbd span div ul ol li table thead tbody tr th td details summary h4 h5 blockquote a. Keep tags balanced.
- Colour spans: `c-g` green, `c-r` red, `c-b` blue, `c-y` amber, `c-p` purple, `c-m` muted.
- Template literals (backticks). Never write `</script` anywhere. Never leave literal `${` in HTML.
- Math: `<sup>`, `<sub>`, `≤ ≥ ≠ → ⌊ ⌋ √ ∑ log₂`. No LaTeX.

## H helpers (inside `${...}`)
`H.arr(values, {label, hl:{i:'g'|'r'|'b'|'y'|'p'|'m'}, ptr:{i:'L'}, idx, start})` · `H.table(head, rows)` · `H.chips(items, {label, hl})` · `H.kv([[k,v]], {label, hl})` · `H.bits(value, width, {label, hl:{bit:'y'}})` · `H.c(color, html)` · `H.esc(s)`

## Visualizers (MANDATORY on every topic)
```js
{ title, input?: 'default editable input string', inputLabel?, gen: function (input) { return frames; } }
```
- ≥ 4 frames (aim 8–30). Deterministic, fast (< 50 ms). Parse input defensively; on bad input `throw new Error('friendly format hint')`. Cap sizes. Copy arrays per frame.
- frame = `{ narr: 'HTML — WHAT happens at this step AND WHY, friendly words', parts: [part, ...] }`
- hl classes: `'cur'` amber current · `'ok'` green new/insert/match · `'bad'` red duplicate/removed/conflict/failure · `'win'` blue window/range · `'sel'` purple answer/special · `'done'` faded.

| part | fields |
|---|---|
| `array` | `label, values, hl:{i}, ptr:{i:'L' or ['L','mid']}, range:[lo,hi], showIdx, idxLabels, start` |
| `set` / `map` | `label, items` / `entries:[[k,v]]`, `hl:{'key'}` |
| `bars` | `label, values (numbers), hl, ptr, texts, idxLabels` |
| `bits` | `label, value, width ≤ 32, hl:{bitPos}, ptr, dec, showDec` |
| `stack` / `queue` | `label, items (bottom→top / front→back), hl:{i}`, queue: `frontLabel, backLabel` |
| `tree` | `label, arr (level order, null = missing), hl:{index}, ehl:{childIndex}, tags:{index}` (depth ≤ 4) |
| `graph` | `label, directed, height (default 60), nodes:[{id, label, x:0..100, y:0..height, shape:'box'?, w?}], edges:[[u, v, weightOrLabel?]], hl:{id}, ehl:{'u-v'}, tags:{id}` — use `shape:'box'` for architecture/system/flow diagrams (services, DBs, caches, clients, OS components, network hops, agent/tool/MCP flows) |
| `grid` | `label, rows, rowHead, colHead, hl:{'r,c'}` (DP tables, matrices, page tables, Gantt rows, boards) |
| `list` | `label, values, ptr, hl, next:[idx or -1], cycleTo` (linked lists) |
| `vars` | `label, vals:{name:value}, hl:{name}` |
| `code` | `label, lang, code, hl:{lineNumber(1-based):cls}` — step through code line by line (great for language tracks, event loop, output prediction) |
| `table` | `label, columns, rows, hl:{rowIndex}` — SQL result sets, intermediate query tables, comparison tables |
| `text` | `label, html` |

Ideas per area: DSA → pointers/sets/maps/bars/trees/graphs/grids. Languages → `code` part stepping lines + `vars` (stack/heap), `stack` (call stack), `queue` (event-loop queues), `map` (object/dict internals). SQL → `table` parts showing each logical step (FROM → WHERE → GROUP BY → window → SELECT), B+tree via `tree`. HLD/Backend/Frontend/CS/GenAI → `graph` with `shape:'box'` animating a request/data flow edge by edge, `queue`/`stack`/`grid`/`table` for internals (e.g. Kafka partitions, LRU cache, TCP window, page tables, attention matrix). Behavioral → `table`/`text` parts building a STAR answer step by step, weak → strong.

## Writing large files
A module is big (often 150–400 KB). Write pieces into your private scratch dir, then concatenate:
`/tmp/claude-0/-home-user-DSA-LEARNINGS/7ee5a772-4bba-50e7-a5de-ba4d0dcbd304/scratchpad/parts/<id>/NN.js`
- `01.js`: `(function () { var topics = [], practice = [], quiz = [], interview = [];`
- middle pieces: `topics.push({...});` `practice.push({...});` `quiz.push({...});` `interview.push({...});`
- last piece: `registerModule({ id: '...', title: '...', intro: `...`, goals: [...], prereqs: `...`, hours: N, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();`
- `cat .../parts/<id>/*.js > ROOT/content/<track>/<id>.js`, then validate. Fix errors in the pieces and re-concatenate.

## Finish
Validator must print PASSED (with `--code`). Final reply: only the validator's summary line + PASSED (no file dumps).
