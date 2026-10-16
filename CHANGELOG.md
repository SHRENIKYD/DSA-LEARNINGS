# Changelog

Versions follow [Semantic Versioning](https://semver.org): MAJOR for breaking changes to progress data or URLs, MINOR for new features or modules, PATCH for fixes. Each release is a `vX.Y.Z` git tag on `main`, and `package.json` holds the current version for both the website and the mobile app. The Android workflow creates the tag and a GitHub Release (with the APK) automatically when a new version reaches `main`.

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
