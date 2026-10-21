# Release notes: content review (website 1.10.1, app 1.11.1)

After Phase 3 ([RELEASE_PHASE3.md](RELEASE_PHASE3.md)), every one of the 220 modules was reviewed end to end for wrong facts, outdated claims, inconsistencies between text, examples and code, and needlessly complicated explanations. Reviewers recomputed every number they touched and re-ran code outputs where possible.

## In numbers
| Kind | Corrections |
|---|---|
| Wrong facts | 301 |
| Outdated claims | 54 |
| Inconsistencies between text, examples and code | 158 |
| Clarity rewrites | 71 |
| **Total** | **584 in 184 modules** |

## What did not change
- Module ids, topic and problem order, problem counts, quiz answers and every test case are unchanged.
- Solution code changed in four problems only, where the code itself was wrong: the awk minute extraction and the systemd unit in CS 8, a lab step in Cloud & DevOps 1, and a Dockerfile in Cloud & DevOps 8 that would not build.

## Highlights by track

**DSA + Math for CS**
- Adding two values near 10^9 does not overflow a 32-bit int (2·10^9 < 2.147·10^9); the lesson now says so.
- A Python bytearray bitset uses 1 byte per cell (100 MB), not 12.5 MB; only Java BitSet and C++ bitset pack bits.
- Tower of Hanoi first overflows a 64-bit long at n = 64, not n = 63 (2^63 − 1 still fits).
- 10! is 3.6·10^6 permutations, not 3.6·10^7.
- The stock cooldown DP explanation allowed buying the day after a sale; fixed.
- Matrix-chain triangulation: n matrices map to an (n+1)-gon, not n − 1.
- The Largest Number note now warns that a plain descending string sort puts "30" before "3", which gives the wrong answer.
- DSA 28 cross-references pointed at the wrong module numbers throughout; all now match the real track.

**Low-Level Design**
- A sliding-window counter example contradicted the +1 rule used in the code.
- Chess rules: en passant can capture a checking pawn, so it can rescue a king from check.
- Short-code length (6 vs 7 characters) and LFU structure counts made consistent with the code.

**High-Level System Design**
- Availability chain recomputed to 99.94%; a storage estimate was 5 EB instead of 5 PB.
- A hash-collision estimate corrected to about one every 15 s; map tile widths and zoom levels fixed.
- Kubernetes CronJob double-fire behaviour described correctly.

**Java**
- Non-generational ZGC was removed in JDK 24, not 23. Biased locking disabled in 15, removed in 18.
- `synchronized` stopped pinning virtual threads in Java 24 (JEP 491), not 21.
- C(36,18) is about 9 billion, not 2.7 billion. `SoftMaxHeapSize` is a ZGC option, not G1.

**Python**
- Quiz explanations said "Option 2"; options are shuffled and shown with letters, so they now use letters.
- The `a, b = b, a` no-tuple optimisation is not new in 3.11; `LOAD_METHOD` merged into `LOAD_ATTR` in 3.12.
- A `~=2.2.0` example printed a result that contradicted PEP 440.

**JavaScript & TypeScript**
- Node does not enable V8 pointer compression by default; only Chrome does.
- The Ignition bytecode example was garbled; it now shows the full 16-instruction program with matching counts.
- `${number}` matches any non-empty string whose numeric value is finite, including `" 1"` and `"0x10"` (checked with tsc 6.0.2).
- Four widgets showed raw `<span>` markup to learners.

**C++**
- `1<<31` is undefined only before C++14, not before C++20. `delete nullptr;` does not compile.
- `std::vector<bool>` is a partial specialization; GCC `-fconstexpr-ops-limit` defaults to 2^25.
- A "dangling range-for" example was not undefined behaviour; replaced with one that is.
- A cpp08 problem stated 1e9 limits while its example and tests used 2e9.

**SQL + DBMS**
- Shop database figures recomputed: 40 Delhi customers, 141 September orders, 109 distinct customers.
- PostgreSQL `now()` is stable and does not force a table rewrite on `ADD COLUMN`; volatile defaults do.
- The MySQL query cache was removed in 8.0. Cassandra 5 does not ship Accord transactions.
- GA4 does not split sessions at midnight (Universal Analytics did).

**Frontend Engineering**
- SameSite=Lax by default is Chrome and Edge only; there are 7 CORS-safelisted response headers, not 6.
- The Referer is dropped on https → http, not http → https.
- React + ReactDOM are about 45 KB gzipped; 140 KB is the minified size.
- A Testing Library query (`findByRole("listitem", { name })`) could never match.

**Backend Engineering**
- Virtual-thread pinning on `synchronized` fixed in Java 24; SQS message limit is 1 MiB.
- HPA arithmetic, liveness timing and an error-budget calculation recomputed.
- GCR replaced by Artifact Registry; `terraform taint` replaced by `-replace`; `@MockBean` → `@MockitoBean`.

**GenAI & Working With AI**
- Gradient-descent worked numbers recomputed; Wᵀ·x shapes fixed.
- bcrypt is not memory-hard; BM25 is not built into PostgreSQL.
- Softmax, int8 quantisation and MoE examples corrected; EU AI Act risk tiers fixed.

**CS Core: OS + Networks**
- An awk command extracted the hour instead of the minute; systemd start-limit keys belong in `[Unit]`.
- A CPU-quota hint said 36 ms per 100 ms for a 1.8-CPU burst; it is about 180 ms.
- Light-speed distance: 100 ms RTT is 10,000 km one way, 20,000 km round trip.
- Consistent hashing from 5 to 4 backends moves about 80% of keys, not 75%.

**Cloud & DevOps**
- An SLA/SLO gap of 0.4% of a month is about 2.9 hours, not 29.
- A Dockerfile with trailing `#` comments on `COPY` lines would not build; an HCL block was invalid.
- sshd drop-in file order, Ansible vault header (`1.2`), and IAM boundary vs SCP rules corrected.

**Behavioral & Career**
- Unsupported statistics removed and numbers corrected across all six modules (47 edits).

## Not changed yet
78 claims could not be confirmed and were left as they are: mostly version pins, retirement dates and renamed APIs (for example AWS provider v6, ingress-nginx retirement, Zod 4, PyO3 `detach`). They are checked against official documentation in the next patch release.

Quiz answer positions are uneven in many modules (in some, every correct answer is the first option). Learners are not affected: options are shuffled when a quiz is shown, and explanations refer to options by letter, which the engine relabels after the shuffle. Two explanations that referred to options by number were changed to letters.

## Checks run for this release
- `tools/ci-check.js` on all 184 changed modules: `validate --code` passes and every solution passes its tests in the languages its track requires. 0 failing.
- `tools/paths-check.js --strict` passes for every route in every language.
- The site and app builds pass, and the play, updater, icon, games and app navigation tests pass.

## Versions
- Website **1.10.1**: see [CHANGELOG.md](../CHANGELOG.md).
- App **1.11.1** (build 11101): see [CHANGELOG-APP.md](../CHANGELOG-APP.md).
