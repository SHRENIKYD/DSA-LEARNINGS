# Release notes: Phase 3 of 3 (website 1.10.0, app 1.11.0)

Phase 3 is the last phase of the study-path plan in [STUDY_PATHS_PLAN.md](STUDY_PATHS_PLAN.md):
- Phase 1 ([RELEASE_PHASE1.md](RELEASE_PHASE1.md)) built the routes and the first half of DSA.
- Phase 2 ([RELEASE_PHASE2.md](RELEASE_PHASE2.md)) finished DSA, Low-Level Design and Cloud & DevOps in four languages.
- Phase 3 tests the language and SQL tracks, removes the last Java-only text, makes projects count, and puts every check into CI.

## In one paragraph
All 1,508 problems in the Java, Python, JavaScript/TypeScript, C++ and SQL tracks now have tests, and the tested solutions pass them:
- SQL answers run on the same SQLite engine the site uses, and on PostgreSQL where it matters.
- TypeScript type puzzles are checked by the TypeScript compiler itself.

Every brute-force sketch and visualizer code pane in the DSA and Low-Level Design tracks now comes in Java, Python, JavaScript/TypeScript and C++, so a learner never has to read Java to follow a lesson. Route projects have real checklists that count towards progress. The app has the full route page. CI now runs every check on every change.

Testing found and fixed more than 110 faults in solutions, statements and examples.

## What is in Phase 3

### 1. Tests for the language and SQL tracks
| Track | Problems | Tested | Skipped (with the reason shown in the module) |
|---|---|---|---|
| Java (14 modules) | 310 | 309 | 1: a JMH benchmark, which needs the JMH harness |
| Python (13) | 283 | 283 | 0 |
| JavaScript / TypeScript (14) | 308 | 308 | 0 |
| C++ (13) | 280 | 279 | 1: a program that reports through its exit status and `argv` |
| SQL (15) | 327 | 323 | 4: three need two concurrent sessions, and one answer is prose |

How the tests work:
- **Which modes:** each problem is tested the way it is taught:
  - function and class tests for code that returns values;
  - program tests for code whose point is what it prints;
  - SQL tests that compare result rows or expect a constraint to reject bad data.
- **Expected answers:** worked out independently, by hand or with a separate brute-force program, never copied from the solution.
- **Concurrency:** concurrent code is made deterministic. Threads are joined and invariants are checked, with no sleeps.
- **Single-case problems:** "predict the output" programs, which take no input, have one test each.

### 2. No more Java-only text in DSA and Low-Level Design
- **Brute-force sketches:** all 913 "brute force / naive approach" sketches now have Python, JavaScript (TypeScript in Low-Level Design) and C++ versions next to the Java one.
  - They show the same naive approach, and the same deliberate bug where the sketch has one.
  - Where a language cannot show the bug (Python integers never overflow), a comment says so.
- **Visualizer code panes:** these now show the learner's chosen language. The highlighted line follows the step in every language.
  - A handful of panes stay Java-only because they teach Java itself: the Java string pool, `PriorityQueue`'s API, the Java memory model in the singleton lesson, and a `HashSet` subclassing trap.
- **Quiz and interview items:** 122 quiz and interview items, and 13 per-problem quick-check questions, were reworded where the Java was incidental. Their order, options and correct answers are unchanged.

### 3. Projects that count
- Each of the 20 route projects has a checklist of 6 concrete criteria, written for that project's brief.
- Learners tick the criteria on the route page. The ticks sync with accounts like other progress.
- A project is done when every criterion is ticked:
  - its hours then count towards the route's progress;
  - a stage shows as complete only when its required modules are mastered and its project is done;
  - "Study next" points at a project once its stage's modules are mastered.

### 4. The full route page in the app
The app's "Your route" card now opens a full route screen. It has:
- the route, language and hours pickers;
- the schedule;
- "Study next" with reasons;
- the reviews that are due;
- every stage with each module's status and missing prerequisites;
- the project checklists.

It works offline.

### 5. Continuous checks
A new workflow, `.github/workflows/checks.yml`, runs on every push and pull request that touches content or tools:
- `tools/paths-check.js --strict`;
- `tools/validate.js --code` and `tools/solution-check.js` on every changed module, plus one sample module per track when a tool changes. Each track requires its languages: DSA needs all four, and Low-Level Design needs Java, Python, TypeScript and C++.

A weekly run, which can also be started by hand, checks every module of every track. The guarantees in these release notes therefore stay true as content changes.

### 6. Faults found and fixed
More than 110 faults were found and fixed. A selection:

**SQL**
- Wrong boundaries: a 30-day window counted midnight twice, and a session gap of exactly 30 minutes was split by floating-point noise.
- Missing constraints: a stored order total could disagree with its order lines, a lost dependency was enforced only on insert, and a star schema accepted orphan facts.
- Wrong reports:
  - a deadlock detector reported each cycle twice;
  - a shard-imbalance figure ignored empty shards;
  - a rejected duplicate left a ghost row;
  - an outage report closed open outages;
  - a pivot total was NULL where its months showed 0.
- Statements and examples: unordered `group_concat`, solutions whose final query was not the asked-for result, and examples with the wrong numbers.

**Python**
- Recursion limits: four recursive solutions crashed on inputs the constraints allow. They are now iterative.
- Wrong answers:
  - `-8 ** 0.5` returned a complex number;
  - wrong leading digits of 2^N;
  - a superscript digit crashed a log parser;
  - a type-checking decorator rejected every partly annotated function;
  - `atomic_write` failed in binary mode.

**JavaScript / TypeScript**
- Crashes:
  - a vote tally miscounted a candidate called "constructor";
  - a path getter threw although its statement says it never does;
  - a retry helper crashed on a `null` rejection;
  - a module-cycle walker overflowed the stack.
- Wrong behaviour:
  - an LRU memoiser took two minutes at full size;
  - a deep-equal treated arrays of different lengths as equal;
  - a frame scheduler ran writes queued too late.

**Java**
- An overflowing `BitSet` size.
- Three lesson programs that could not compile.
- A demo with a hard-coded size.
- Seven Python versions in the Java track that behaved differently from the Java.

**C++**
- Integer overflows that are undefined behaviour.
- A thread that was never joined, which terminates the program.
- A `printf` whose argument order is unspecified.
- A loop counter that overflowed near `INT_MAX`.
- A type-erased container that rejected string literals.

### 7. Tools
`tools/solution-check.js` gained:
- **SQL mode:**
  - runs on the site's own sql.js build, and on PostgreSQL 16 (`engine: 'postgres' | 'both'`);
  - compares rows in order or as a set, can pick any result set (`result: k`), and accepts expected errors;
  - strips SQLite `PRAGMA` lines before running on PostgreSQL.
- **TypeScript type tests** (`tests.types`): `Expect<Equal<…>>` and `@ts-expect-error` assertions compiled under `--strict`.
- **Nested generated values,** for example a 300 × 100 grid written as `{ $rep: { $range: [0, 100] }, n: 300 }`.
- **Big design tests:** design cases can have thousands of generated operations, because Java now runs each block in its own method.
- **Whole lesson programs:** C++ lesson programs keep their own `main()`, and function tests still call their functions with many cases.
- **Matching the site:** code is dedented the way the site displays it. Illustrative alternatives marked `check: false` are skipped, and `tests.alt` picks which alternative to test.

The site highlights Terraform (HCL) code. `tools/ci-check.js` is the runner the CI workflow uses.

**Lesson videos.** The daily video search (`tools/find-videos.js`, 95 searches a day within YouTube's free quota) used to work through the tracks in a fixed order, so only DSA had videos. Now:
- each day's searches are spread across every track;
- the first topic of every module is covered before any module's second topic.

Every track starts receiving videos the day after this release. At this rate every topic will have been searched in about 15 days.

## Checks run for this release
- `tools/paths-check.js --strict` passes for every route in every language.
- `tools/validate.js --code` passes on all 220 modules.
- `tools/solution-check.js`, with each track's required languages:
  - **DSA** 1–28: 665 problems in Java, Python, JavaScript and C++;
  - **Low-Level Design** 1–12: 248 programs in Java, Python, TypeScript and C++;
  - **Language and SQL tracks:** every tested problem;
  - 0 failing.
- **Builds and app tests:** the site and app builds pass. The browser end-to-end test passes, apart from the intentional error demos in JS 7 and 8. The app tests pass.

## Known limits
- **Single-run C++ problems:** some C++ 8–13 problems are tested as whole programs with one run each. The checker can now test them function by function with many cases; converting them is listed for the bug-fix phase.
- **Untested alternative versions:** some solutions also teach a second version of the method (for example an idiomatic one-liner next to the hand-written loop). Tests call the main method only, so the second version is not run. A mutation audit (deliberate small bugs, checked against the tests) found this pattern. In the main methods it found no weak tests. Testing the second versions is listed for the bug-fix phase.
- **Shared Java process:** Java tests run in one process with ASCII output, so non-ASCII strings are checked through code points.
- **Two-session concurrency:** problems that need two concurrent database sessions are explained, not executed.
- **Version-sensitive details:** a few library and cloud facts are written to current documentation and marked for review.

## What is next
The study-path plan is complete. The next work is bug fixing: reported issues first, then the items under Known limits.

## Versions
- Website **1.10.0**: see [CHANGELOG.md](../CHANGELOG.md).
- App **1.11.0** (build 11100): see [CHANGELOG-APP.md](../CHANGELOG-APP.md).
