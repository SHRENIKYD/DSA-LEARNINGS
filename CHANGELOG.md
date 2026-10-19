# Changelog

Versions follow [Semantic Versioning](https://semver.org): MAJOR for breaking changes to progress data or URLs, MINOR for new features or modules, PATCH for fixes. Each release is a `vX.Y.Z` git tag on `main`, and `package.json` holds the current version for both the website and the mobile app. The Android workflow creates the tag and a GitHub Release (with the APK) automatically when a new version reaches `main`.

## [Unreleased]

### Added
- Videos page on the website (`videos.html`): every lesson video in one place, grouped by track, with search, track filters, play in place and a link to each lesson. Linked from the home page and every track page.

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
