# Changelog — website

From 1.10.1 each website release, whether it brings fixes or features, raises the last number: 1.10.1, 1.10.2, … up to 1.10.100. The release after 1.10.100 is 1.11.0, and the same pattern repeats (1.11.1 … 1.11.100, then 1.12.0). MAJOR is still reserved for breaking changes to progress data or URLs.

From 1.7.0 the website and the mobile app have separate versions. This file is the website's: its version is `version` in `package.json`, it is shown in the home page footer, and the Pages workflow tags each new one as `web-vX.Y.Z` on `main`. The app's version is `appVersion` in `package.json`, with its own history in [CHANGELOG-APP.md](CHANGELOG-APP.md). Up to 1.6.1 both shared one version, tagged `vX.Y.Z`.

## [1.10.5] — 2026-10-24 · Personalized navigation and the study planner

### Added
- Pick a path: a short first-visit setup (goal, language, hours per week) that can be skipped. Existing learners keep today's view and see a small "Pick a path" banner.
- My path mode: next step first on Home, lands and islands on your path highlighted and the rest dimmed but open, track pages listing your path's modules first, search ranking on-path results first with "Search everything".
- Home in My path mode: greeting, streak, today's budget, one Continue button with the reason, path progress and one card per track on your path.
- Today page: a daily plan sized to your hours, with due reviews, lessons split into parts, practice blocks and, in the last week before an interview, mock rounds.
- Plan page: hours per week, interview date, rest day, placement (mark what you already know, or prove it with a readiness check), weeks forecast and a timed mock round.
- Adaptive path: a riddle gate scored under 60% inserts a review and extra practice; 85% or more fast-tracks the recommended modules in that stage. An interview date trims optional, then recommended modules until the required ones fit.
- Your chosen path, hours and interview date sync with your account (see the privacy policy).
- Profile photo: add one from the passport page; it shows in the header on every page and syncs with your account. The Watchtower picks a track from a dropdown instead of a row of chips.
- Full-width layout on every page, styled dropdowns everywhere, and alignment fixes on the home, passport, track and module pages.

### Changed
- Sections for frameworks you are not learning (for example Spring for a Python learner) collapse behind a "Show it" line.
- Switching paths never touches your progress and can be undone.

## [1.10.4] — 2026-10-23 · Faster pages, offline use and hardening (phases B and C)

### Added
- Install the site as an app and use it offline: a service worker keeps the pages you have opened, and an offline page explains the rest. On iPhone and iPad, Safari → Share → Add to Home Screen (see `docs/IOS.md`).
- "Download my data" on the account page and in the privacy policy: a JSON file with your account details, your saved progress on the server and the progress on this device.
- Skeleton placeholders while a lesson loads, with a Retry button if it cannot be fetched.
- Automated accessibility checks (axe, WCAG 2.1 AA) on key pages in both themes; see `docs/ACCESSIBILITY.md`.
- `npm run release` bumps both versions and drafts the changelog entries.

### Changed
- Track pages load each module only when you open it, and files are minified with content hashes: opening the DSA track now downloads about 263 KB instead of 3.6 MB (gzip).
- Better colour contrast in both themes, and scrollable code blocks, visualizers and tables can be reached with the keyboard.
- Supply chain: every GitHub Action is pinned to an exact commit, Dependabot proposes weekly updates, and a weekly `npm audit` runs.

### Fixed
- The hourly uptime check failed after its checks passed, because it could not tell which repository to report to.

## [1.10.3] — 2026-10-23 · Production readiness, phase A

### Added
- Anonymous crash reports: browser errors are sent to our own database with emails and URL queries removed, at most 5 per page load, no account id or cookies. Reports are deleted after 90 days; the privacy page explains what is sent and how to opt out.
- Database migrations (`supabase/migrations/`), a size limit on stored progress, and an access check (`tools/rls-check.js`) proving users can reach only their own data.
- Weekly encrypted database backups kept for 30 days, an hourly uptime check that opens a GitHub issue during an outage, and `docs/OPERATIONS.md` and `docs/DATABASE.md`.

### Changed
- Only `main` deploys the site, and every deploy waits for a strict build and a browser smoke test (all pages load without errors, one module per track opens, search works, internal links resolve, no page is wider than a 360 px phone).

### Fixed
- Signing out right after a failed sync deleted the unsaved progress. Sign-out now retries first and, if that fails, keeps the progress and stays signed in.
- Long inline code and wide tables made module pages wider than a 360 px phone.

 — 2026-10-21 · Cleanup and test gaps

### Changed
- Generic filler that some modules appended to short hints and complexity notes ("Take a moment to reason it through…", "Try it on paper first…", "Verify the numbers with a real measurement.") is gone. About 520 hints, complexity notes and explanations in 16 modules (GenAI 3, 11, 12, 13, 15, 16; Backend 12, 14, 16; Behavioral 1–3; CS 2, 7, 10, 12) were rewritten as specific hints for their problems.
- C++ 9–13: 85 problems that were tested with a single run of the demo program are now tested function by function with 7–31 cases each. The 16 that stay single-run are "predict the output" programs, concurrency litmus tests and compile-time demonstrations.

### Fixed
- Cloud & DevOps 9 and 18 target AWS provider 6 (checked with `terraform validate` on provider 6.69); the capstone uses version 21 of the EKS module.
- Cloud & DevOps 10 pins ansible-core 2.21 and ansible-lint 26; all 30 playbooks pass `--syntax-check`, and four lint findings in the lesson playbooks are fixed.
- Cloud & DevOps 14: the pinned Bitnami Redis chart pulls an image that no longer exists; the lesson now uses a chart based on the official Redis image and explains why.
- Backend 9: the Spring Kafka example explains correctly when the offset is committed relative to the database transaction, and uses `ON CONFLICT DO NOTHING` instead of catching a duplicate-key error inside the transaction.
- JavaScript 1: a follow-up question now names the real limit of the Date-based leap-year check (years past 275,760).

### Tests and tools
- Solutions that also teach a second version of the method (for example an idiomatic one-liner next to the loop) now test that version too, with `tests.also` in `tools/solution-check.js` (15 versions in 9 modules).
- The Java 11 Fair Ticket Lock test is lighter and stricter: it checks that no two threads are ever inside the lock at once, so it no longer times out under load.
- `tools/validate.js` retries a C++ snippet compile that timed out and reports a timeout as a timeout, instead of a failure with no message.

## [1.10.1] — 2026-10-21 · Content review

Full release notes: [docs/RELEASE_REVIEW.md](docs/RELEASE_REVIEW.md).

### Fixed
- 584 corrections in 184 modules after a review of all 220 (188 modules changed in this release in total): 301 wrong facts, 54 outdated claims, 158 inconsistencies between text, examples and code, and 71 clarity rewrites.
- Four solutions whose code was wrong: the awk minute extraction and systemd unit in CS 8, a lab step in Cloud & DevOps 1, and a Dockerfile in Cloud & DevOps 8 that would not build.
- Two quiz explanations referred to options by number, which pointed at the wrong options after shuffling; they now use letters.
- 34 claims the review could not confirm were checked against official documentation, release notes and source code, and corrected (52 edits in 30 modules), for example Spring Boot 3 session config, ingress-nginx retirement, AWS Database Savings Plans, FastAPI yield dependencies, OWASP 2025, Vite 8, Node 20 end of life, PyO3 `detach` and Zod 4.
- Readiness checks and mixed checkpoints showed options in file order, so in some modules the first option was always correct. They now shuffle options, label them A, B, C and relabel explanations to match.
- 79 of the 232 lesson videos covered a different topic from their lesson and were replaced; the other 153 were reviewed and kept.

### Added
- Lesson videos start and stop at the matching chapter where one exists, show a coverage note, and say whether they were selected for the lesson or suggested automatically.
- The daily video search keeps reviewed choices, and `tools/video-test.js` (in CI as the `videos` job) validates every video mapping. Review details: [docs/VIDEO_REVIEW.md](docs/VIDEO_REVIEW.md).

## [1.10.0] — 2026-10-20 · Phase 3 of 3

Full release notes: [docs/RELEASE_PHASE3.md](docs/RELEASE_PHASE3.md).

### Added
- Tests for every problem in the Java, Python, JavaScript/TypeScript, C++ and SQL tracks: 1,508 problems, 6 skipped with the reason shown. SQL runs on the site's own SQLite build and on PostgreSQL, and TypeScript type puzzles are checked by the compiler.
- Python, JavaScript/TypeScript and C++ versions of every brute-force sketch in DSA and Low-Level Design (913), and of the visualizer code panes, which now show the learner's language.
- Route project checklists (6 criteria each) that count towards route progress and stage completion; "Study next" can point at a project.
- Terraform (HCL) syntax highlighting.
- The daily lesson-video search now spreads across every track (each module's first topic first) instead of finishing DSA before starting the next track.
- A CI workflow that validates and tests every changed module on each push and pull request, plus a weekly full run.

### Fixed
- More than 110 faults in solutions, statements and examples found by the new tests: SQL boundaries and missing constraints, Python recursion crashes, JavaScript crashes and slow paths, Java code that could not compile, and C++ undefined behaviour.
- Quiz, interview and quick-check wording that assumed Java now names each language's equivalent, with the same answers.
- Two lessons had code blocks tagged with the wrong language: C++ programs in CS 8 were tagged as shell, and a RabbitMQ routing sketch in Backend 9 was tagged as YAML. They now display and validate correctly.

### Changed
- The solution checker gained SQL and TypeScript-type modes, nested generated values, large design tests, and support for C++ lesson programs that keep their own `main()`.

## [1.9.0] — 2026-10-19 · Phase 2 of 3

Full release notes: [docs/RELEASE_PHASE2.md](docs/RELEASE_PHASE2.md).

### Added
- DSA 18–28 in Java, Python, JavaScript and C++. All 28 DSA modules (665 problems) are now tested in four languages, with lesson tabs and language notes.
- Low-Level Design 1–12 in Python, TypeScript and C++ alongside Java: 248 design programs that print identical output in every language, with tests that check it.
- Cloud & DevOps 13–18 (Kubernetes, Helm and day-2 operations, observability, DevSecOps, advanced cloud architecture, and SRE practice with a capstone). The track is complete at 18 modules.
- JavaScript heap lesson: a new final topic in JS 2 that builds a priority queue, plus two practice problems.

### Fixed
- More than 40 faults found by testing every solution at its full stated size, in four languages, with normal stack limits. They include:
  - overflow and stack crashes in DSA;
  - wrong results in money, booking, quota and allocation designs;
  - hangs in the concurrency designs;
  - unclear crashes on unknown input;
  - underspecified hash functions in two statements.
- The Git module's environment-variable example now has Python, Java and C++ versions.
- The browser "Run" button no longer wraps every JavaScript example in a block, which had broken the `var`/`function` hoisting demos in JS 4. It now wraps only code that declares a name the browser reserves, such as `top`.

### Changed
- The test checker runs each language with its default limits, supports richer generated inputs and test-only helpers, and gives compiles their own time limit.

## [1.8.0] — 2026-10-19 · Phase 1 of 3

Full release notes: [docs/RELEASE_PHASE1.md](docs/RELEASE_PHASE1.md).

### Added
- Career routes (software engineer, Python backend, frontend, Java backend, AI application engineer, systems, Cloud & DevOps) in prerequisite order, for Java, Python, JavaScript/TypeScript or C++. Schedules at 5, 10, 20 or 40 hours a week, including revision and project time. A new route page (`route.html`) and a "Your route" card on the home page.
- Prerequisites on every module page: what is required, what helps, what is missing, a "test out" readiness check and what the module unlocks.
- Mastery: a module counts only when the quiz, lessons, half the practice and a checkpoint or readiness check are done, with no overdue reviews. Mixed zone checkpoints and spaced review (1, 3, 7 and 21 days) are included.
- DSA modules 1–17: all 418 problems have tested solutions in Java, Python, JavaScript and C++ (1,672 language runs). Lesson code has a tab for each language, and every module has language notes. Your chosen language is shown first.
- New content (20 modules): Python Backend I–V (FastAPI, SQLAlchemy and Alembic, auth and security, testing, workers and deployment); Linear Algebra, Probability & Statistics, and Calculus & Optimization for ML; and Cloud & DevOps modules 1–12, a new track and the 7th region, "Cloud Citadel".
- A Passport stamp for the new region (17 in total).

### Fixed
- 9 Java tree solutions and the recursive Reverse String crashed with a stack overflow at sizes their constraints allow. They no longer recurse deeply.
- Python solutions whose names did not match the problem (so they could never run) were renamed and are now tested.
- Problem statements and constraints: Maximum Product Subarray (overflow), Reverse Bits, Number Complement, Sum of Two Integers, Tower of Hanoi, Huffman codes and a refuelling hint. Two arithmetic slips in maths explanations were also corrected.
- The blockchain example in the backend security lesson now uses real SHA-256, and the MCP streaming example follows the real session lifecycle.
- The browser "Run" button runs JavaScript inside its own block, so variables named like browser globals (`top`) work. `process.stdout.write` prints too.

### Changed
- Wording that assumed Java now names the equivalent in each language, and single-language modules explain their choice.
- Published study-time estimates were corrected; they were 3–5 times too short.

## [1.7.0] — 2026-10-19

### Added
- Story-journey redesign. The home page is a world map of 6 regions (Foundation Isle, Language Valley, Design Peaks, Builder Port, AI Observatory, Career Harbor), with a next-stop card, today's expedition (landmark, riddle gate, treasure), a journey log, a destination picker (Backend, Frontend, Full-stack, ML / AI) with route progress, region cards and learning routes. The footer shows the website version.
- Track pages are lands: a banner with progress and a continue button, a "you are here" card with the current place's landmarks, riddle gate, practice arena and interview tavern, and places grouped by zone (Beginner Shore, Intermediate Forest, Advanced Peaks, Expert Summit).
- Passport page (`passport.html`) with 16 rubber-stamp badges drawn as SVG (10 milestones and one per region), lands explored, settings (daylight map, destination) and account.
- Shared top bar on every page: World map, Watchtower (videos), Passport, theme and passport avatar.
- `assets/progress-map.js`: a small per-module item map so the passport works without loading the search index.

### Changed
- New palette (night and daylight), Bricolage Grotesque headings and Atkinson Hyperlegible body text. Lessons use the journey names: the legend (analogy, on a paper card), hidden treasure (guided problem, violet), riddle gate (quiz) and interview tavern.
- Videos page restyled as the Watchtower.
- Separate versions for the website and the app (see above).

## [1.6.1] — 2026-10-19

### Added
- Android app: a Videos card on the home screen opens the Videos page, and each module screen shows how many videos it has, opening the Videos page filtered to that track. The first app build with the lesson videos.
- Videos page on the website (`videos.html`): every lesson video in one place, grouped by track, with search, track filters, play in place and a link to each lesson. A track id in the address (`videos.html#dsa`) opens it filtered to that track.

## [1.6.0] — 2026-10-19

### Added
- YouTube videos in lessons: each topic can show one video under "Watch it explained", with a Video link in the topic's lesson menu. Nothing loads from YouTube until you tap it; it then plays in YouTube's privacy-enhanced player, with an "Open on YouTube" link.
- `tools/find-videos.js` and the daily **Lesson videos** workflow pick a video per topic with the YouTube Data API (embeddable, public, 3–45 minutes, scored for relevance, popularity and teaching channels) and save them in `data/videos.json`. It covers all topics in about 16 days within the free quota, then re-checks them daily. Setup: `docs/VIDEOS.md`.

### Changed
- Privacy policy: YouTube listed as a processor when you play a video.
- Play uploads go to the track named in the repository variable `PLAY_TRACK` (`internal`, `alpha` for closed testing, `beta` for open testing or `production`); internal testing when it is not set.

## [1.5.0] — 2026-10-16

### Added
- 18 new concept games (26 in total), each a fresh random puzzle every play. Algorithms: Best stretch (Kadane), Prefix sum sprint, Coin change trap, Merge two lists, Tree walk, Heap climb, Dijkstra's pick. SQL: Which rows come back?, Group it up, Join counter. Java: Java output, == or equals?. JavaScript: Event loop order, Coercion quiz. Python: Slice it, Python output. CS & systems: Subnet sprint, LRU cache.
- Topic filters on the Play tab (Algorithms, SQL, Java, JavaScript, Python, CS & systems); Surprise me and Another game stay within the chosen topic.

### Changed
- Quiz and problem options are shuffled every time a lesson opens, so the right answer is no longer usually A or B. Explanations that name an option by letter follow the shuffle.
- Checkmarks tick themselves and can no longer be ticked by hand: a topic when you reach its end with its questions answered correctly, a problem when you answer it correctly and open the full solution, a quiz when every answer is right, the interview bank when every question has been opened. You can untick any checkmark to redo that section.
- Game Master badge: win 20 different games (was all 8).
- On tablets, screens and games keep a readable width instead of stretching across the display.

### Fixed
- Light and dark theme now stay the same on every page. The app's home, games, Play bar and read-aloud player have a light theme (Me → Light theme), lessons and the app share one setting, and a page you return to with Back picks up a theme changed elsewhere.

## [1.4.0] — 2026-10-16

### Added
- Google Play release setup: signed release bundle (.aab) built in CI from GitHub secrets, attached to each GitHub release, and uploaded to the Play internal testing track when a service account is configured. Step-by-step guide in `docs/PLAY_RELEASE.md`.
- Account deletion: Me → Delete account in the app and `login.html?delete=1` on the web, backed by `supabase/delete-account.sql`. Removes the account and its synced progress.
- Privacy policy page (`privacy.html`), linked from the login page and the app's Me tab.
- App icon and splash screens with Bit the mascot, a Play Store icon, a feature graphic, listing text and 1080×1920 screenshots (`store/`).

### Changed
- The app bundles its fonts, so it makes no requests to Google Fonts and text renders the same offline.
- Two-pointer hunt never starts with the answer already under the pointers.

 — 2026-10-16

### Added
- Four new concept games: Two-pointer hunt (DSA 6), Bracket stack (DSA 13), Swap sort (DSA 7) and Bit flipper (DSA 4). Eight games in total.
- Every play is a new random puzzle: Guess the number picks a new range and size, Big-O race a new N and pair of runners (31 combinations), Rotten oranges a new grid (sometimes one that can never finish), Hash lockers new names and table size, and the new games new strings, arrays, targets and numbers.
- 🎲 New puzzle and Next puzzle buttons, 🔀 Another game, and 🎲 Surprise me on the Play tab, which never repeats your last game. Today's game on Home changes daily.
- Replays earn +5 XP (up to 10 a day) after the first +25 XP win. New badges: Game Master (win all 8 games) and Puzzle Addict (25 wins).

### Changed
- Big-O race hides the step counts until you bet.

 — 2026-10-16

### Added
- Read aloud in the app: a 🔊 button on every lesson, module and game screen opens a player that reads the topic paragraph by paragraph (code and visualizers are skipped), highlights and scrolls to what it is reading, and can continue into the next topic.
- Speech controls: play / pause, previous / next paragraph, speed 0.75×–2×, voice picker (English voices on the device), tap any paragraph to jump there. Settings are remembered. Uses the phone's own text-to-speech engine on Android and iOS.
- Sound effects: taps, correct and wrong answers (games and quizzes), XP, level-ups and badges, made in code with Web Audio. "Sound effects" switch in Me.

### Fixed
- Google sign-in in the app left you on the website instead of returning to the app. Google now returns to the website's `login.html?app=1`, an address Supabase already allows, which hands the sign-in code straight back to the app (with an "Open the app" button as a fallback). The handoff page never uses the code itself.
- Dropdowns (examples, hints, solutions, interview answers) now work like an accordion on the website and in the app: opening one closes the open one next to it, and the page keeps the opened one in place.
- Track chips on the Boss fights and Map screens were squashed to a thin strip on long lists; screen sections no longer shrink.

## [1.1.0] — 2026-10-16

### Added
- Android and iOS app (Capacitor 8) with play mode: XP and levels, daily quests, streaks with freezes, a track map with boss fights, badges, and celebrations.
- Four concept games that teach the idea before the lesson: Guess the number (binary search), Big-O race, Rotten oranges (multi-source BFS) and Hash lockers.
- XP bar and toasts on lesson pages inside the app.
- Google sign-in in the app through the system browser and a deep link (`io.github.shrenikyd.interviewmastery://login-callback`).
- App version and build number come from `package.json`; CI builds a debug APK, tags `vX.Y.Z` and publishes a GitHub Release with the APK.

### Changed
- The search index records each practice problem's difficulty, so XP is 15 / 25 / 40 for easy / medium / hard.

## [1.0.0] — 2026-10-16

### Added
- 13 tracks, 194 modules, 4254 problems and 2129 visualizers, beginner to expert.
- Night Lab theme with light mode.
- Accounts with Supabase: email and password, Google sign-in, password reset.
- Per-user progress sync across devices, with offline retry.
- Google profile picture in the sidebar account box.

### Fixed
- Account box no longer hides the email behind a stretched Sign out button.
- Main column fills wide screens on every page.
