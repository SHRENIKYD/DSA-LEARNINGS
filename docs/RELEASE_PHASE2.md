# Release notes: Phase 2 of 3 (website 1.9.0, app 1.10.0)

Phase 2 finishes the four-language syllabus and the Cloud & DevOps track. Phase 1 ([RELEASE_PHASE1.md](RELEASE_PHASE1.md)) built the route system and the first half of DSA. Phase 3 is listed at the end.

## In one paragraph
Every DSA and Low-Level Design problem now has a tested solution in Java, Python, JavaScript/TypeScript and C++. That is 665 DSA problems in 28 modules and 248 design programs in 12 modules, with the same tests in every language. The Cloud & DevOps track is complete at 18 modules, and JavaScript learners get the heap lesson they were missing. Testing every solution at its full stated input size, with each language's normal limits, found and fixed more than 40 real bugs in the original Java solutions and statements. All seven career routes now pass the strict release check in every language they offer.

## What is in Phase 2

### 1. DSA 18–28 in four languages
- 247 more problems, each with a Java, Python, JavaScript and C++ solution and 6–47 test cases. The modules are: Dynamic Programming II; Graphs I (traversals, cycles, topological sort, DSU); Graphs II (shortest paths and minimum spanning trees); range query data structures; advanced graph algorithms; advanced dynamic programming; advanced string algorithms; advanced mathematics for algorithms; geometry, randomized and amortized analysis; real-world data structure design; and interview pattern recognition and mock rounds.
- With Phase 1, **all 28 DSA modules and all 665 problems** are tested in four languages.
- Every lesson code block has a tab per language, and every module has language notes covering recursion limits, overflow, heaps and complexity traps.

### 2. Low-Level Design 1–12 in four languages
- **248 design programs.** Each design is written idiomatically in Python, TypeScript and C++:
  - Python uses abstract base classes and dataclasses.
  - TypeScript uses interfaces and composition.
  - C++ uses virtual destructors, smart pointers and `override`.
- **Identical output:** every version runs the same demo and prints exactly the same lines as Java. The tests check this line by line.
- **Failure paths:** demos now also print rejected payments, unknown ids, duplicate bookings and similar cases, so learners see the error handling, not only the happy path.
- **Threaded designs:** these print results that are the same on every run. TypeScript, which has no threads, models them with async tasks, and the language notes say so.

### 3. Cloud & DevOps 13–18: the track is complete
- Kubernetes core.
- Helm and day-2 operations.
- Observability and monitoring.
- DevSecOps and cloud security.
- Advanced cloud architecture.
- SRE practice and a capstone that ties all 18 modules together, with a free local version and an optional AWS version.

Every lab runs on a free local cluster or tool, or states its cost and how to clean up. No real credentials appear anywhere.

### 4. The JavaScript heap lesson
JavaScript has no built-in heap or priority queue, which was a hidden gap for JS learners in the DSA track. JS 2 gains a new final topic, "Priority Queues in JavaScript: Building a Binary Heap". It teaches the same `MinHeap` the DSA solutions use, with a visualizer and notes on number precision. It also adds two tested practice problems. The topic is appended, so existing progress is unaffected.

### 5. Faults found and fixed
Running every solution at its own stated maximum input, with each language's default stack and recursion limits, found real faults. They are grouped below; the full list is in the module files.

**DSA**
- **Maximum Product Subarray:** an intermediate value overflowed a 32-bit int, which gave wrong answers. For example, one input returned 1,604,378,624 instead of 800,000,000.
- **Segment intersection:** a zero-length segment that is not on the other line reported a made-up intersection point.
- **Convex hull lesson code:** returned duplicate points when every input point was the same.
- **Bloom filter and consistent-hash ring:** the statements never defined the hash functions, and the old Python version used Python's per-process random `hash()`. Both statements now define the hash exactly.

**Low-Level Design: crashes and hangs**
- Blocking queue: capacity 0 was accepted, and a later add hung forever.
- Pipeline: one malformed line killed the parser thread and hung the pipeline.
- Single-flight proxy: waiters hung forever when the backend threw an error.

**Low-Level Design: wrong money or state**
- E-learning: enrolling twice charged twice.
- Expense split:
  - an empty split list divided by zero, in three places;
  - a rejected edit corrupted every balance;
  - a person could owe money to themselves.
- Money: splitting a negative amount lost a paisa, and amounts with more than two decimals were accepted.
- Parking: a zero-length stay was billed ₹0.
- Hotel booking: a reused reservation id overwrote the earlier booking.
- Checkout: two order lines for the same item could oversell the stock below zero.

**Low-Level Design: wrong behaviour**
- URL shortener: returned an expired code.
- Expense approvals: unknown roles were treated as manager approval.
- Per-minute quota: clock skew let the quota be exceeded.
- Nearest-gate allocator: queues grew without limit.
- Payment template: failures escaped to the caller, against the statement.
- Lazy-loading proxy: its `equals` was one-sided.
- Logger: produced invalid JSON for messages containing a backslash.

**Low-Level Design: unclear crashes**
More than a dozen services crashed on unknown ids, bad numbers or empty input. They now reject the request with a clear message.

**Statements and demos**
Several demos printed different output on each run, so they could not be tested. They now print checks that come out the same on every run. A few statement examples that did not match the code were corrected.

### 6. Tools
`tools/solution-check.js` gained the features the work above needed:
- **Bigger and richer inputs:** generated inputs now work for linked lists, character arrays and lists of fresh objects. Test-only helper code (`tests.harness`) builds inputs the format cannot describe, such as cyclic lists, deep trees or object graphs.
- **Realistic limits:** solutions run with each language's default stack and recursion limits, so overflows learners would hit are caught.
- **Fewer false failures:**
  - very large floating-point answers are compared with a tolerance;
  - Java and C++ compiles get their own longer time limit;
  - a race between parallel C++ builds is fixed;
  - programs are launched from the class that actually contains `main`;
  - Java helper classes get the date/time and concurrency imports.
- **Browser "Run" button:** JavaScript examples now run unwrapped, so `var`/`function` hoisting demos behave as written. Only examples that declare a reserved browser name such as `top` run inside a block.
- **Validator:**
  - it supplies `ListNode` and `TreeNode` for C++;
  - it accepts `...` as a Python abstract-method body.

## Checks run for this release
- All 220 modules pass `tools/validate.js`.
- `tools/paths-check.js --strict` passes: every route puts prerequisites first, has every required solution in its language, has no unexplained language switch, and has schedules that add up. Its 2 warnings are expected: AI 15 lists the newer maths modules (AI 18 and 20) as prerequisites, which sit later in the same track.
- DSA 1–28 and LLD 1–12: every problem passes in all four languages.
- The site build passes with 220 of 220 modules live. The browser end-to-end test and the app tests pass.

## Known limits
- **Not yet tested:** problems in the language tracks (Java, Python, JS, C++) and the SQL track.
- **Java-only places:** a few quiz and interview items that are deliberately about Java, the brute-force sketches, and the code panes inside visualizers.
- **Test limits:** design-class tests are limited to about 2,000 operations per problem by Java's method-size limit. Generated values cannot yet nest inside each other, so a few huge grids are written out in full.
- **Version-sensitive details:** a few library and cloud facts (version numbers, prices) are written to current documentation, hedged in the text, and marked for review.

## What is next: Phase 3
- **Tests for the language and SQL tracks,** using the same four-language checker.
- **Project rubrics:** a checklist for each route's projects, so projects count towards mastery.
- **The remaining Java-only text:** visualizer code panes, brute-force sketches, and quiz and interview items that are not about Java.
- **The full route page in the app,** not just the home card.
- **Continuous checks:** run the solution, path and validation checks in CI on every change.
- **Tool upgrades:** nested generated values, larger design-class tests, HCL syntax highlighting, and a review pass on version-sensitive details.

## Versions
- Website **1.9.0**: see [CHANGELOG.md](../CHANGELOG.md).
- App **1.10.0**: the Phase 2 lessons, plus the fix that makes the new-version popup open Google Play instead of GitHub. See [CHANGELOG-APP.md](../CHANGELOG-APP.md).
