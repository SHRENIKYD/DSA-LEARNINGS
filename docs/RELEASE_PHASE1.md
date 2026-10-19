# Release notes: Phase 1 of 3 (website 1.8.0, app 1.9.0)

This release is the first of three phases of the study-path plan in [STUDY_PATHS_PLAN.md](STUDY_PATHS_PLAN.md). Phase 1 delivers the route system, the four-language foundation, the first half of the DSA track in four languages, and three new bodies of content. Phases 2 and 3 complete the rest; they are listed at the end.

## In one paragraph
Learners now pick a **career route** and a **language** (Java, Python, JavaScript/TypeScript or C++). The site builds a study plan in prerequisite order, with a schedule at 5, 10, 20 or 40 hours a week, tells them what to study next and why, and only counts a module as **mastered** when they have shown they understand it. The first 17 DSA modules (418 problems) now have tested solutions in all four languages. There are five new Python backend modules, three maths-for-ML modules and the first 12 modules of a new **Cloud & DevOps** track. The app gets the journey look and a "Your route" card.

## What is in Phase 1

### 1. Career routes, prerequisites and schedules
- **Seven routes**: Software engineer (DSA-heavy), Python backend, Frontend, Java backend, AI application engineer, Systems, and Cloud & DevOps. Each route is a list of stages with core, recommended and optional modules, a project per stage, and behavioural preparation spread through it.
- **Prerequisites are separate from difficulty.** Every module lists what it needs and what helps (`src/paths.js`). A route always puts a module after everything it needs, and the checker proves there are no cycles.
- **Language-aware preparation.** "Prepare for DSA" resolves to the language you chose (for example Python 1–4 for a Python learner), so no route hides a Java requirement.
- **Schedules** at 5, 10, 20 or 40 hours a week. Each one adds 15% for revision plus the hours for projects, and shows core and optional time separately. The schedule always equals the sum of its module hours, and the checker verifies this. The schedules are honest: the old published plans were 3–5 times too short (for example, the software engineer route is about 820–860 hours, roughly 41–43 weeks at 20 hours a week).
- **New route page** (`route.html`) with route cards, language and hours pickers, the schedule table, "study next" with the reason for each item, reviews due, every stage with each module's status and missing prerequisites, and the projects.
- **Every module page** shows its required and helpful modules with ticks, what is still missing, a "test out" button, and what the module unlocks.

### 2. Progress that means understanding
- A module counts as **mastered** only when the quiz and lessons are done, at least half the practice is solved, a checkpoint or readiness check is passed, and no reviews are overdue.
- **Readiness checks**: a short quiz drawn from a module's prerequisites; 80% marks them as known, so learners who already know the basics can skip ahead.
- **Mixed checkpoints** at the end of each zone of a track.
- **Spaced review**: wrong quiz answers and finished quizzes come back after 1, 3, 7 and 21 days.
- All of this syncs with accounts through the existing progress store.

### 3. Four languages: Java, Python, JavaScript and C++
- **DSA modules 1–17 are complete in all four languages.** Every one of the 418 problems has a Java, Python, JavaScript and C++ solution and 6–20 test cases: 1,672 language runs, 0 failing. The modules cover programming foundations, maths and complexity, number theory, bits, arrays and prefix sums, two pointers, sorting, hashing, strings, binary search, recursion, linked lists, stacks and queues, trees, heaps and tries, greedy, and dynamic programming I.
- Every lesson code block in those modules has tabs in all four languages. Your chosen language is shown first.
- Each module has **language notes** (recursion limits, integer overflow, heaps, complexity traps) for each language.
- Wording that only made sense in Java now names the equivalent in each language ("a hash map: `HashMap` / `dict` / `Map` / `unordered_map`").
- Modules whose code is deliberately in one language (CS core, system design, behavioural, SQL 9–10) explain why, so learners on other routes are not left guessing.

### 4. New content (20 modules)
- **Python backend (5 modules)**: FastAPI fundamentals; databases with SQLAlchemy 2.0 and Alembic; auth, security and configuration; testing and quality for APIs; async workers, caching and deployment. All Python, no Java needed.
- **Maths for machine learning (3 modules)**: linear algebra, probability and statistics, and calculus and optimisation. They use plain Python, and all 70 problems are tested. Every expected answer was recomputed independently, using 465 cases checked by a second method.
- **Cloud & DevOps track, modules 1–12** (new 7th region on the map, "Cloud Citadel"):
  - Beginner: Linux for the cloud, Bash scripting, networking, Git, Cloud fundamentals I (compute and storage) and II (identity and networks).
  - Intermediate: Python for automation, Docker, Terraform, Ansible, CI/CD pipelines, managed cloud services.

  Every lab runs on your own machine or a free tier, states its cost risk and ends with cleanup. No real credentials appear anywhere.

### 5. Syllabus faults found and fixed
Testing every solution in four languages with each language's normal stack and recursion limits found real faults:
- **9 Java tree solutions crashed** on deep trees that the problem constraints allow (stack overflow). They were rewritten without deep recursion: Lowest Common Ancestor, Count Good Nodes, Max Sum BST, Max Path Sum, Height and Diameter, Insert into BST, Delete from BST, Validate BST, and Serialize/Deserialize.
- **Reverse String** (recursion module) crashed at its own maximum input in Java and JavaScript. It now recurses about 16 levels deep instead of 50,000.
- **Maximum Product Subarray**: the constraint allowed a middle product to overflow. It now says every subarray product fits in 32 bits, as LeetCode does.
- **Several Python solutions could never be run** because their names did not match the problem (for example `isPalindrome`, `max_subarray`, `mergeKLists`). They were renamed and are now tested.
- **Wording and statements**:
  - Reverse Bits, Number Complement, Sum of Two Integers and Tower of Hanoi were clarified.
  - A refuelling hint that wrongly claimed an overflow was corrected.
  - Huffman now says that any optimal code is accepted.
  - Two maths explanations had wrong numbers ("500×" is 550×; "4× the false positives" is 2.6×).
  - The AdamW step order and a PCA constraint were made precise.
- **Security demo**: the blockchain example now uses a real SHA-256 (with the standard self-test) instead of a weak hash.
- **MCP lesson**: the streaming session example now follows the real session lifecycle (session id, resume, re-initialise on 404, delete).
- **Browser "Run" button**: lesson JavaScript now runs inside its own block, so names like `top` no longer clash with browser globals. Node's `process.stdout.write` also prints in the browser sandbox.

### 6. The app (1.9.0)
- The app's screens use the story-journey look: palettes, fonts, the next-stop card, the islands map and the tab bar.
- A **"Your route" card** on the home screen shows your route, language, hours per week, percentage done, modules mastered, weeks left and what to study next.
- The new Cloud Citadel island is on the map, and the passport has 17 stamps.

### 7. Tools for authors (how quality is kept)
- `tools/solution-check.js` runs every problem's tests in Java, Python, JavaScript/TypeScript and C++. It supports:
  - function, class and program modes;
  - order-free and floating-point comparison, and custom checks;
  - big generated inputs (`$rep`, `$range`, `$concat`) for overflow cases at full size;
  - test-only builders for inputs such as cyclic lists or deep trees;
  - each language's real default stack and recursion limits.
- `tools/paths-check.js` checks that:
  - every id exists and there are no cycles in any language;
  - each route puts prerequisites first;
  - solutions exist in the route's language;
  - there are no unexplained language switches;
  - the schedules add up.
- `tools/validate.js` now also checks code in lesson tabs, bash (`bash -n`), YAML and language notes.
- Guides: [LANGUAGE_AUTHORING.md](LANGUAGE_AUTHORING.md) and the updated [AUTHORING.md](AUTHORING.md).

## Checks run for this release
- All 214 modules pass `tools/validate.js`.
- `tools/paths-check.js` passes. Its warnings are the Phase 2 items below: modules not written yet and solutions not yet in every language.
- DSA 1–17: every problem passes in all four languages with default stack limits.
- The Python, maths and Cloud & DevOps problems pass their Python tests.
- The site build passes. The browser end-to-end test passes for every module except JS 7 and 8, whose error-handling demos throw errors on purpose, as before.
- The app's navigation, map, games, passport, update and icon tests all pass.

## Known limits in Phase 1
- **DSA 18–28 still have Java-only solutions.** On the route page, a learner who picked another language sees these modules in a list headed "required modules do not yet have every solution in <language>".
- **LLD 1–12 are Java-only** for now, and appear in that same list.
- **Cloud & DevOps modules 13–18 are not written yet.** The track page and module menu label them "coming soon".
- Some quiz and interview questions are deliberately about Java, and the brute-force sketches in DSA problems are still Java.
- Terraform code (HCL) is shown without colour highlighting.
- A few library details in the testing and deployment modules could not be run here (Schemathesis 4, pytest-asyncio 1.x, the uv image tag). They are written to current documentation and are marked for review.

## What is next

### Phase 2: finish the four-language syllabus and the DevOps track
- **DSA 18–28 in all four languages**, with the same tests, language notes and neutral wording. DSA 18–23 are already in progress.
- **LLD 1–12 in Python, TypeScript and C++**: each design written idiomatically in every language, running the same demo with the same output.
- **Cloud & DevOps 13–18**: Kubernetes core, Helm and day-2 operations, observability and monitoring, DevSecOps and cloud security, advanced cloud architecture, and an SRE practice and capstone. Modules 13–16 are already in progress.
- **The JavaScript heap lesson** (a priority queue built from scratch, with number-precision notes), so JS learners have no hidden gap.
- **Release gate**: `tools/paths-check.js --strict` passes for every route in every language.

### Phase 3: depth and polish
- **Tests for the language tracks** (Java, Python, JavaScript, C++) and the SQL track, using the same four-language checker.
- **Projects with rubrics**: each route's projects get a checklist, so they can count towards mastery.
- **Remaining Java-only text**: quiz and interview items that are not about Java, visualizer narration, and brute-force sketches in every language.
- **The full route page in the app**, not just the home card.
- **Continuous checks**: run the solution and path checks in CI on every change, so the guarantees in this release stay true.
- Syntax highlighting for HCL, and a review pass on version-sensitive library details.

## Versions
- Website **1.8.0**: see [CHANGELOG.md](../CHANGELOG.md).
- App **1.9.0**: see [CHANGELOG-APP.md](../CHANGELOG-APP.md).
