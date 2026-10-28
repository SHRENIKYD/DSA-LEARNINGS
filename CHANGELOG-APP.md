# Changelog — mobile app

From 1.11.1 each app release, whether it brings fixes or features, raises the last number: 1.11.1, 1.11.2, … up to 1.11.99. The release after 1.11.99 is 1.12.0, and the same pattern repeats. The patch number stops at 99 because the Android `versionCode` is MAJOR×10000 + MINOR×100 + PATCH, and a patch of 100 would give the same code as the next minor version, which Google Play rejects. The app's version is `appVersion` in `package.json`; it sets the Android `versionName` and `versionCode` (`1.7.0` → `10700`) and, through `node tools/version-sync.js`, the iOS project. The Android workflow tags each new one as `app-vX.Y.Z` on `main`, publishes a GitHub Release with the APK and bundle, and uploads it to Google Play. Up to 1.6.1 the app and website shared one version; that history is in [CHANGELOG.md](CHANGELOG.md).

## [1.11.12] — 2026-10-28 · Lesson videos

### Changed
- 86 new lesson videos (921 in the app now, counting per-language picks).

## [1.11.11] — 2026-10-28 · Lesson videos

### Changed
- 190 new lesson videos (835 in the app now, counting per-language picks).

## [1.11.10] — 2026-10-28 · Lesson videos

### Changed
- 169 new lesson videos (645 in the app now, counting per-language picks).

## [1.11.9] — 2026-10-28 · Lesson videos

### Changed
- 15 new lesson videos (476 in the app now, counting per-language picks).

## [1.11.8] — 2026-10-28 · Latest videos and visitor statistics

### Added
- Private visitor statistics for the site owner: active visitors, devices, OS, browsers and top pages. Anonymous, no third-party analytics; see the privacy page.
- Every lesson video the daily bot has found so far is included in the app.
- Language Valley: Continue expedition follows your chosen code language.

### Changed
- The daily video bot now also releases the app when it finds new videos.
- Video bot: clearer quota errors, more matches, C# every other day.
- Website: the logo is the browser-tab icon.
- CI: workflows pinned to Ubuntu 24.04; GitHub Actions updated.

## [1.11.7] — 2026-10-26 · C# course, game hints and nine new games

### Added
- C# course in Language Valley: 13 modules of modern C# 12 on .NET 8, with tested practice problems; C# learners on the Interview / SDE route get C# modules in "Your language".
- Lesson videos: the bot now retries topics it missed, replaces removed videos and searches C# too.
- Hints in every game: a Hint button reveals two or three nudges one at a time, starting fresh with every new puzzle.
- Nine new games (43 in all): Course planner (topological sort), Friend circles (union-find), BST builder, Round-robin (CPU scheduling), C++ output, Value or reference? (C#), Pattern match (design patterns), Git rescue and CAP call. New Play filters for C++, C#, Design and Git & DevOps.

### Fixed
- The path-switch undo message is a single compact line instead of a three-line block.

## [1.11.6] — 2026-10-25 · C#, language mode and play sync

### Added
- C# as a fifth code language: every DSA and LLD module has C# solutions, brute-force code and examples, checked by the solution runner.
- Language mode: lessons show only your code language; the others are not shown until you pick "Show every language". Videos follow your language where a per-language pick exists, and the Watchtower shows only your language's tracks.
- Play state syncs through your account: XP, game wins, quests, the review queue and activity days follow you between the app and the website.
- A persistent lesson header, and a crop preview with zoom and position for your profile photo.
- A responsive Explorer sign-in screen shared with the website.

### Fixed
- Samsung tablet layout, lesson pages scrolling sideways, and the path mode switcher not filling its width.

## [1.11.5] — 2026-10-24 · Personalized navigation and the study planner

### Added
- Pick a path on first launch (skippable); existing learners keep today's view with a "Pick a path" banner.
- My path mode: Home shows your next step, streak, today's budget, path progress and track cards; islands on your path get a ring and count; track maps and search put your path first.
- Today and Plan screens: a daily plan sized to your hours, plus hours per week, interview date, rest day, placement, weeks forecast and mock rounds.
- Adaptive path from real quiz results, and the Me page switcher to change your path with undo.
- Profile photo on the Me page, shared with the website; sync status shown as an icon; styled dropdowns instead of the system picker; alignment fixes across screens.

## [1.11.4] — 2026-10-23 · Faster lessons and data export

### Added
- "Download my data" on the Me page shows your data with a Copy button.
- Skeleton placeholders while a lesson loads.

### Changed
- Lessons load only when opened, and the release build is shrunk and optimised. App data is no longer included in Android cloud backups, so a sign-in token cannot be restored onto another device; sign in again to sync progress.
- Better colour contrast and keyboard access.

## [1.11.3] — 2026-10-23 · Production readiness, phase A

### Fixed
- Signing out right after a failed sync no longer loses unsaved progress.

### Changed
- Anonymous crash reports help us fix bugs (see the privacy policy). Releases can be rolled out to a share of users first, and debug builds are no longer attached to public releases.

 — 2026-10-21 · Cleanup and test gaps

### Changed
- Lessons include the website's 1.10.2 content: specific hints instead of generic filler in 16 modules, and the corrected Cloud & DevOps, Backend 9 and JavaScript 1 lessons. See [CHANGELOG.md](CHANGELOG.md).

## [1.11.1] — 2026-10-21 · Content review

Full release notes: [docs/RELEASE_REVIEW.md](docs/RELEASE_REVIEW.md).

### Fixed
- Lessons include the website's content review: 584 corrections in 184 modules (wrong facts, outdated claims, inconsistencies and unclear explanations), plus 34 claims checked against official sources and corrected.
- Readiness checks and checkpoints now shuffle their options, so the first option is no longer always the right one.
- Lesson videos: 79 that covered a different topic were replaced, videos start at the matching chapter where one exists, and each shows a note on what it covers.

## [1.11.0] — 2026-10-20 · Phase 3 of 3

Full release notes: [docs/RELEASE_PHASE3.md](docs/RELEASE_PHASE3.md).

### Added
- A full route screen: open it from the home "Your route" card to pick your route, language and hours, see the schedule, what to study next and reviews due, follow every stage, and tick each project's checklist. It works offline.
- Project checklists count towards your route progress, and a stage is complete only when its modules are mastered and its project is done.
- Lessons include the website's Phase 3 content: brute-force sketches and visualizer code in your chosen language, and the corrected solutions and statements in the Java, Python, JavaScript, C++ and SQL tracks.

## [1.10.0] — 2026-10-20 · Phase 2 of 3

Full release notes: [docs/RELEASE_PHASE2.md](docs/RELEASE_PHASE2.md).

### Added
- Lessons inside the app include the website's Phase 2 content:
  - all 28 DSA modules with four-language solutions and tabs;
  - Low-Level Design 1–12 in Java, Python, TypeScript and C++;
  - Cloud & DevOps 13–18, completing the 18-module track;
  - the JavaScript heap lesson.

### Fixed
- The new-version popup now opens the app's page in the Google Play Store (button "Update on Google Play") instead of the GitHub release page. Without the Play Store app, it opens the Play listing in the browser. GitHub is still used only to find out that a new version exists.

## [1.9.0] — 2026-10-19 · Phase 1 of 3

Full release notes: [docs/RELEASE_PHASE1.md](docs/RELEASE_PHASE1.md).

### Added
- A "Your route" card on the home screen shows your route, language and hours per week, the percentage done, modules mastered, weeks left and what to study next with the reason. It opens the route plan.
- The Cloud Citadel island (Cloud & DevOps track) on the map, and its passport stamp.
- Lessons inside the app include the website's Phase 1 content: four-language tabs in DSA 1–17, prerequisites and readiness checks, and the new Python backend, maths for ML and Cloud & DevOps modules.

### Changed
- The app's own screens use the website's story-journey look: the night and daylight palettes, Bricolage Grotesque headings, Atkinson Hyperlegible body text, and IBM Plex Mono for numbers.
- The resume card is a paper "next stop" card. In the module path, the current place is clay, cleared places are green and the boss is violet, on a sea-coloured trail. Levels are named Beginner Shore, Intermediate Forest, Advanced Peaks and Expert Summit.
- The islands map has a sea background, land-coloured islands with region-coloured icons, a gold route, and the archipelago label moved to the bottom corner.
- The tab bar has line icons with a highlighted pill on the open tab. The Map tab is now called World.
- Bit, the lesson-page bottom bar, the read-aloud player and the confetti use the journey colours, and follow the light theme automatically.
- The launch background and status-bar colour match the new palette.

## [1.8.0] — 2026-10-19

### Added
- Animated learning archipelago connected to the existing 13 tracks, with real regional progress, track paths, module links, curriculum search and an in-app stamp passport.
- First-run introduction with Bit, a real daily-quest/streak screen, progress dashboard and home-screen shortcuts. Existing accounts, lessons, videos, read aloud, quizzes and practice arenas remain connected.
- Eight new untimed games: Queue Courier, Beacon Wave, Window Chef, Recursion Trail, Cascade Duel, HTTP Rescue, Transaction Vault and Prompt Detective. The library now contains 34 games in 9 categories, with explanations and links back to the matching lesson.
- Floating islands, moving routes, screen transitions, button feedback, beacon illumination and game-win animations. Reduced-motion preferences and the existing Motion setting disable these effects.

### Fixed
- A game’s win callback can only credit the current puzzle once. The existing daily replay XP cap is retained.

## [1.7.1] — 2026-10-19

### Added
- Android checks stable app releases at launch and resume, with a new-version popup, official release link, 24-hour snooze, and a manual check in Me. Offline checks do not block the app, and popups wait until active games and lessons are left.
- Lightbulb Logic branding across Android and iOS launcher icons, splash screens, the Play Store graphic and the in-app avatar/favicon.

### Notes
- Automatic checks begin after installing this version; earlier builds do not contain the updater. iOS release checks remain disabled until an iOS-specific published release source is available.

## [1.7.0] — 2026-10-19

### Changed
- Lesson pages use the website's new story-journey look (palette, fonts, legend, hidden treasure, riddle gate, interview tavern). The app's own screens keep their current style. The website's Passport link and avatar are hidden in the app, which has its own Me screen.
- The app has its own version, separate from the website's.

