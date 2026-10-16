# Changelog

Versions follow [Semantic Versioning](https://semver.org): MAJOR for breaking changes to progress data or URLs, MINOR for new features or modules, PATCH for fixes. Each release is a `vX.Y.Z` git tag on `main`, and `package.json` holds the current version for both the website and the mobile app. The Android workflow creates the tag and a GitHub Release (with the APK) automatically when a new version reaches `main`.

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
