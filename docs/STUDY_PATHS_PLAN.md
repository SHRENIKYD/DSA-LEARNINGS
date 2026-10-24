# Study paths, language support and Cloud & DevOps: implementation plan

Status: all three phases released (see the table below).

## Status by phase

The plan shipped in three phases, all released; details are in [RELEASE_PHASE1.md](RELEASE_PHASE1.md), [RELEASE_PHASE2.md](RELEASE_PHASE2.md) and [RELEASE_PHASE3.md](RELEASE_PHASE3.md).

| Phase | Contents | State |
|---|---|---|
| 1 | Routes, prerequisites, schedules, mastery, readiness checks and spaced review; DSA 1–17 in four languages; Python Backend I–V; maths for ML (3 modules); Cloud & DevOps 1–12; Stage 1 fault repairs; app route card and journey look; checking tools | Released (website 1.8.0, app 1.9.0) |
| 2 | DSA 18–28 in four languages; LLD 1–12 in Python, TypeScript and C++; Cloud & DevOps 13–18; the JavaScript heap lesson; `paths-check --strict` passes for every route | Released (website 1.9.0, app 1.10.0); details in [RELEASE_PHASE2.md](RELEASE_PHASE2.md) |
| 3 | Tests for the language and SQL tracks; project rubrics; the remaining Java-only text; the full route page in the app; solution and path checks in CI; HCL highlighting | Released (website 1.10.0, app 1.11.0); details in [RELEASE_PHASE3.md](RELEASE_PHASE3.md) |

## 0. Where the syllabus stands today

| Finding | Evidence |
|---|---|
| Difficulty and learning order are mixed | `level` (B/I/A/E) is the only ordering signal. CS Core puts Networking Basics (cs10, Beginner) after Containers (cs09, Expert). Prerequisites exist only as prose in each module's `prereqs` text. |
| DSA assumes Java | All 665 DSA problems have a Java solution, 193 have Python, 22 have C++, none have JavaScript/TypeScript. 16 of 28 DSA prerequisite texts name Java, and the topic code is Java-first throughout. |
| LLD assumes Java | All 248 LLD problems are Java only. |
| Python backend has no home | The Backend track is Spring Boot plus Node.js. There is no FastAPI/Django, SQLAlchemy or pytest-for-APIs content. |
| AI route has no maths stage | Only ai03 (Math & Python for AI) and parts of dsa02/dsa25 cover maths. Linear algebra, probability and statistics for ML have no module. |
| JavaScript has no heap | No JS lesson builds a binary heap or priority queue, which DSA modules 15, 16 and 20 need (and several later modules use). |
| Published schedules are 3–5× too short | SDE-1 route = 781 required hours, published as 12–16 weeks (that would need 50–65 h/week). Frontend = 733 h vs "14 weeks"; AI = 807 h vs "14 weeks"; SDE-2 = 947 h vs "16–20 weeks". |
| Solutions are compile-checked, not answer-checked | `tools/validate.js --code` compiles Java, syntax-checks C++, and runs Python and JS only when a snippet is marked runnable. Solutions are bare functions with no test cases, so a wrong answer passes every check. |

## 1. Stage 1: repair current faults

| Item | Status |
|---|---|
| Weak hash in the security demo (be15 audit log fell back to a 32-bit djb2 hash named `sha256` in the browser) | **Done.** Replaced with a plain-JS SHA-256 (FIPS 180-4) that runs everywhere, with the official "abc" self-test; verified against Node's crypto on padding-boundary lengths and Unicode; genesis hash widened to 64 hex characters. |
| Streaming session example (ai10 MCP Streamable HTTP said only that "sessions can be tracked with a session id header") | **Done.** Now a five-step lifecycle: `Mcp-Session-Id` issued on `initialize`, sent on every request, SSE event ids plus `Last-Event-ID` to resume, `404` means start a new session, `DELETE` to end; plus the sticky-routing vs shared-store consequence. |
| Python and Java solution failures | **Needs the reproduced list.** The full compile check of all 194 modules is the baseline (results in section 9). Wrong-answer failures need the case list, and Stage 2 adds test cases so they are caught automatically from then on. |
| Stale module references | Scan of every "Module N" / "DSA N" reference against the real module list found no out-of-range numbers; 4 loose matches checked by hand and correct. The `prereqs` texts are replaced by structured data in Stage 2, which removes this class of fault. |
| Prerequisites, examples, constraints, expected answers | Covered by the Stage 2 data model plus the release checks in section 8. |

## 2. Stage 2: prerequisite data model

Each module entry in `src/tracks.js` gains structured fields. Difficulty (`level`) stays as it is and is shown as a badge only; order comes from prerequisites.

```js
['I', 'Hashing Masterclass', 'scope…', {
  id: 'dsa08',
  needs: ['dsa02', 'dsa05', 'dsa06', 'prep:dsa'],   // required, must come first
  recommends: ['dsa04'],                             // shown as "helps", never blocks
  hours: 16,                                         // learning + practice, from the module
  outcomes: ['Choose HashMap vs HashSet vs counting array', 'Prefix-sum + hash counting'],
  check: 'dsa08-ready'                               // readiness check id (Stage 6)
}]
```

- `prep:dsa` and `prep:lld` are language-neutral placeholders. Each language resolves them to its own modules (section 3), so the DSA graph never names Java.
- Each route marks modules as `core`, `recommended` or `optional`.
- The engine shows on every module: "Next up and why" (the outcome it unlocks), "Missing first" (unmet `needs`), and a "Test out" button that opens the readiness check.
- The prose `prereqs` text is generated from this data, so it can never point at a stale module again.

## 3. Language support

### Preparation each language resolves to

| Language | `prep:dsa` (before core DSA) | `prep:lld` (before LLD) |
|---|---|---|
| Java | java01, java02, java05 (strings, equality basics), java07 (collections) | java03, java04 (classes, interfaces, composition), java05 (equals/hashCode), java08 (generics) |
| Python | py01, py02, py05 (collections, mutability, `deque`, `heapq`) | py04 (classes, ABCs), py08 (protocols, dataclasses, `__eq__`/`__hash__`), py09 (type hints) |
| JavaScript/TypeScript | js01, js02 (functions, arrays, objects, sorting), js09 (`Map`, `Set`), **new topic: a heap/priority queue in JS** | js06 (classes, composition), js10 (TypeScript types, interfaces), js11 (generics) |
| C++ | cpp01, cpp02, cpp03 (references), cpp07 (STL containers), cpp08 (STL algorithms) | cpp04, cpp05 (classes, polymorphism, rule of 3/5/0), cpp06 (ownership, RAII, smart pointers) |

### Content structure

- Explanations, analogies, visualisers and approaches stay shared.
- Each solution becomes `impl: { java, python, js, cpp }`. TypeScript is the JS implementation with type annotations, shown as a TS tab. The learner's chosen language is shown first and selected by default.
- A **language notes** block per module covers only what differs:
  - Recursion limits: Python 1000 frames by default (raise the limit, or write it iteratively); Java about 10k frames (`-Xss`); JS about 10k; C++ about 8 MB of stack.
  - Integers: Java `int` wraps and needs `long`; Python integers are unbounded; JS `Number` is exact only to 2^53 (use `BigInt` past that, avoid `%` on negatives); C++ signed overflow is undefined behaviour.
  - Complexity traps: `list.pop(0)` and `Array.shift` are O(n); JS default `sort` compares strings; build strings with `StringBuilder` / `''.join` / `+=` in C++.
  - Heaps: Java `PriorityQueue` is a min-heap; Python `heapq` is min-only (negate for max); C++ `priority_queue` is a max-heap; JS has none (use the toolkit heap).
- Setup guides per language: install, run a file, run tests, and fast input/output for competitive problems.

### Rollout order (per the agreed order)

1. **Java**: fix the route, add test cases, keep it as the reference implementation.
2. **Python**: 472 DSA solutions missing, plus 248 LLD solutions and the topic code.
3. **JavaScript/TypeScript**: 665 DSA solutions, plus LLD, the JS heap topic and numeric notes.
4. **C++**: 643 DSA solutions, plus LLD with ownership-correct designs.

Every implementation must pass the same test cases as the reference (section 8). A route is shown for a language only when every **core** module in it is complete in that language. Until then the selector says "Coming soon in Python", rather than silently switching to Java.

## 4. Career routes

Projects, revision checkpoints and behavioural preparation are placed in each route, not left to the end.

| Route | Main progression (core) | Content to add |
|---|---|---|
| Interview / SDE foundations | `prep:dsa` → dsa01–dsa20 → sql01–sql06 → cs01, cs02, cs10, cs12, cs13 → `prep:lld` → lld01–lld07 → hld01–hld06 → dsa28 mocks, beh01–beh04 | Mixed-topic checkpoints and mock rounds |
| Python backend | py01–py09 → dsa01–dsa13 (Python) → sql01–sql09 → be01, be04 → **Python backend modules** → be05, be11, be15 (Python labs) → hld01–hld09 | New: FastAPI, SQLAlchemy/Alembic, pytest for APIs, async workers (about 5 modules) |
| Frontend | js01–js09 → js10–js11 (TypeScript) → fe01–fe07 → fe08–fe10 (React) → fe06, fe11, fe14 (accessibility, performance, testing) → fe15–fe16 | Small UI projects per stage |
| Java backend | java01–java09 → dsa01–dsa20 + sql01–sql12 → be01–be08, be09–be11 → java11–java12 (concurrency) → lld01–lld10 → hld01–hld12 | none |
| AI application development | py01–py09 → **essential maths** → ai01, ai03–ai06 → ai13 (evaluation) → ai08–ai11 (retrieval, tools, agents) → ai14 + ai13 guardrails (deployment, safety) | New: linear algebra, probability and statistics for ML (2–3 modules) |
| C++ / systems | cpp01–cpp08 → dsa01–dsa20 (C++) → cpp06, cpp10, cpp12 (memory, ownership) → cs01–cs07 + cpp11 (OS, concurrency) → cs10–cs14 → systems projects | New: project briefs (allocator, thread pool, HTTP server, KV store) |
| Cloud & DevOps | See section 7 | New track |

Each route lists core, recommended and optional modules separately. The old free-text `LEARNING_PATHS` strings are replaced by this data.

## 5. Schedules

```
core_hours   = Σ hours of core modules (each already includes practice)
revision     = 15% of core_hours (spaced reviews, section 6)
projects     = Σ project hours in the route (8–20 h each)
weeks(w)     = ceil((core_hours + revision + projects) / w)   for w = 5, 10, 20, 40 h/week
optional     = shown separately as "+N weeks if you add the extensions"
```

Example with today's hours, SDE-1 core only (before projects are added):

| Hours/week | 5 | 10 | 20 | 40 |
|---|---|---|---|---|
| Weeks for 781 h + 15% revision ≈ 898 h | 180 | 90 | 45 | 23 |

The site shows this table for the chosen route and language, recalculated from the module list, so it can never drift from the content.

## 6. Progress that reflects understanding

- **Readiness checks** before each major stage: 10–15 mixed questions drawn from the prerequisite modules' quizzes and problems. 80% or more lets a learner mark the prerequisites "tested out".
- **Mixed checkpoints** at the end of each zone (for example "Beginner Shore checkpoint"): problems from several modules without topic labels.
- **Small projects** per route stage, with a rubric and a self-review checklist.
- **Spaced practice**: wrong answers and skipped topics enter a review queue resurfaced at 1, 3, 7 and 21 days. The home page shows "Due for review today".
- **Two completion states**: *visited* (lessons read, today's auto-ticks) and *mastered* (module quiz ≥ 80% + checkpoint passed + review not overdue). Stamps and route progress count mastered modules; the bar shows both.

## 7. Cloud & DevOps (new separate track)

Based on the Cloud and DevOps Career Roadmap PDF. The track id is `devops`, with a new map region (for example "Cloud Citadel") and its own stamps. It reuses existing modules as prerequisites instead of repeating them.

| # | Module | Phase / target roles | Reuses as prerequisite |
|---|---|---|---|
| 1 | Linux for the cloud: filesystem, permissions (chmod, chown), processes (top, ps), grep/awk | 1 Beginner · Cloud Support Engineer, Junior IT Admin | cs01, cs08 |
| 2 | Bash scripting for operations | 1 | — |
| 3 | Networking for cloud engineers: TCP/IP, DNS, HTTP/S, ports, subnets/CIDR, firewalls | 1 | cs10, cs11, cs13 |
| 4 | Git and GitHub/GitLab workflows | 1 | — |
| 5 | Cloud fundamentals I: compute and storage (EC2/VMs, S3/Blob), AWS first with Azure equivalents | 1 | — |
| 6 | Cloud fundamentals II: IAM and VPC/VNets | 1 | — |
| 7 | Python for automation: APIs, boto3, JSON/YAML (Go appendix) | 2 Intermediate · Cloud Engineer, Junior DevOps | py01–py03 |
| 8 | Containers: Docker, Dockerfiles, images, Compose | 2 | cs09 |
| 9 | Infrastructure as Code I: Terraform (state, modules, providers) | 2 | — |
| 10 | Configuration management: Ansible (playbooks, inventory) | 2 | — |
| 11 | CI/CD pipelines: GitHub Actions, GitLab CI, Jenkins | 2 | — |
| 12 | Managed cloud services: RDS/PostgreSQL, load balancers, auto-scaling, Lambda/Functions | 2 | hld04, hld05 |
| 13 | Kubernetes core: Pods, Deployments, Services, Ingress, ConfigMaps, Secrets | 3 Advanced · DevOps Engineer, SRE, Cloud Architect | — |
| 14 | Helm and day-2 Kubernetes operations | 3 | — |
| 15 | Observability: Prometheus, Grafana, ELK/EFK, Datadog | 3 | hld12, be16 |
| 16 | DevSecOps: Vault, pipeline scanning, least-privilege IAM, security groups | 3 | be15 |
| 17 | Advanced architecture: microservices, Istio service mesh, disaster recovery, multi-region | 3 | hld10, be10, be14 |
| 18 | SRE practice and capstone: SLOs, incidents, a 3-tier app provisioned end to end + interview prep | 3 | beh01 |

- **Overlap with be13 and be14** (Docker, Kubernetes, CI/CD, IaC, cloud architecture in the Backend track): those stay as the backend developer's overview. The DevOps modules go deeper, and each links to the other.
- **Projects** per phase: a static site on S3 + CDN with DNS; a containerised app with a CI pipeline; Terraform for a 3-tier VPC app; Kubernetes with Helm, metrics, dashboards and alerts.
- **Labs and safety**: everything runs on free tiers or locally (Docker, kind/minikube, LocalStack). Every lab has a cost warning, budget alerts, a teardown step, and the no-secrets-in-git rule.
- **Validation**: add checks for YAML, `bash -n`, Dockerfile linting, and Terraform `fmt`/`validate` where available in CI.
- **Size**: about 18 modules × 12 h ≈ 216 h core. With 15% revision plus about 60 h of projects ≈ 310 h, that is about 31 weeks at 10 h/week.
- **Career route**: modules 1–6 → 7–12 → 13–18, with behavioural prep at each phase's target-role milestone.

## 8. Release checks (a route is ready only when all pass)

A new `tools/paths-check.js` runs in CI:

1. Every `needs` id exists, and the graph has no cycles (depth-first search with an on-stack set).
2. In every route, each prerequisite comes before the module that needs it (topological order).
3. For each language a route is offered in, every core module has an implementation in that language. Scanning the route's code tabs finds no unexplained switch to another language.
4. Every problem has test cases (`tests: [{ input, expected }]`, including boundary cases such as empty input, a single element, extremes and duplicates). A per-language harness runs every implementation against them: Java with `javac` + `java`, Python, Node, and `g++ -O2`.
5. The schedule shown equals the sum of the included modules' hours.
6. Readiness-check question ids resolve to real quiz items.

## 9. Order of work

1. Stage 1 repairs (this branch).
2. Prerequisite data plus `paths-check.js` (checks 1, 2, 5), and the generated prereq text.
3. Java route correction: test cases for all DSA and LLD problems, and the harness (check 4).
4. Python: missing DSA, LLD and topic implementations; Python backend modules; maths for AI.
5. JavaScript/TypeScript: implementations, the JS heap topic, numeric notes.
6. C++: implementations and systems projects.
7. Path selector, workload-based schedules, readiness checks, review queue, mastery states.
8. Cloud & DevOps track (it can run alongside steps 4–6, since it does not depend on the solution work).

## Planner (phase 2): adaptive path, Today and Plan screens

`src/planner.js` (`Planner`, loads after `learn.js`; shipped as `assets/planner.js` to the site and the app) derives a daily plan from the stored state only, without loading modules:

- `Planner.effective()` — the path for the current preferences. With an interview date (`imastery.route.interviewDate`) it keeps the core, then adds recommended and optional modules while they fit the hours left (15% of them, at most one week, are reserved for mock rounds). Recommended modules of a stage are fast-tracked once the stage's last core module is satisfied with a riddle-gate score of 85% or more.
- `Planner.next()` — the one Continue item: an inserted review or extra practice (a riddle gate scored under 60%) first, then the first unfinished step of the effective path, then a stage project.
- `Planner.today()` — the day's list: due spaced reviews, inserted reviews/practice, a mock round in the last 7 days before the interview, then lessons in parts of at most 40 minutes with a 3-problem practice block. The budget is `hours × 60 / 6` (the rest day, `imastery.route.restDay`, is off), plus catch-up for days missed this week, capped at 1.5×. Items planned earlier the same day stay listed, struck through, once done (`imastery.today`, device-only).
- `Planner.weeks()` — the forecast per stage; `Planner.placement(level)` marks the language modules (`lang`) and the first six DSA modules (`langdsa`) as `@tested` after the UI confirms, with `Learn.readiness` as the "prove it" alternative; `Planner.mock()` runs a 12-question, 45-minute timed set from the path's quiz files (`window.IM_QUIZFILES`, emitted by `tools/build.js`).

Scores live in `imastery.done` (synced): `@score:<mod>` (riddle gate: share of riddles right at the first try; readiness and checkpoint quizzes: per module tested), `@rev:<mod>` (inserted review done), `@mock:<date>`. Activity days live in `imastery.days` (device-only) for the streak and catch-up. Every planner write dispatches `im:plan`.

Screens: the home in My path mode (greeting, chips, Next card, path progress, track cards that open the next module of the track, quick actions), `today.html` and `plan.html` (hours, interview date, rest day, placement, Weeks forecast, mock round), the "Today" header link and screen results in the home search. Explore all renders exactly as before. Tests: `node tools/planner-test.js` (unit), section 5j of `tools/smoke-test.js`, and the `today plan` / `plan screen` targets of `tools/a11y-test.js`.
