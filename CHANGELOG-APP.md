# Changelog — mobile app

Versions follow [Semantic Versioning](https://semver.org). The app's version is `appVersion` in `package.json`; it sets the Android `versionName` and `versionCode` (`1.7.0` → `10700`) and, through `node tools/version-sync.js`, the iOS project. The Android workflow tags each new one as `app-vX.Y.Z` on `main`, publishes a GitHub Release with the APK and bundle, and uploads it to Google Play. Up to 1.6.1 the app and website shared one version; that history is in [CHANGELOG.md](CHANGELOG.md).

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

