# Changelog — mobile app

Versions follow [Semantic Versioning](https://semver.org). The app's version is `appVersion` in `package.json`; it sets the Android `versionName` and `versionCode` (`1.7.0` → `10700`) and, through `node tools/version-sync.js`, the iOS project. The Android workflow tags each new one as `app-vX.Y.Z` on `main`, publishes a GitHub Release with the APK and bundle, and uploads it to Google Play. Up to 1.6.0 the app and website shared one version; that history is in [CHANGELOG.md](CHANGELOG.md).

## [1.7.0] — 2026-10-19

### Added
- Videos section: a Videos card on the home screen opens the Videos page, and each module screen shows how many videos it has, opening the Videos page filtered to that track.
- Lesson videos: the first app build that includes the videos found so far (81 topics).

### Changed
- Lesson pages use the website's new story-journey look (palette, fonts, legend, hidden treasure, riddle gate, interview tavern). The app's own screens keep their current style. The website's Passport link and avatar are hidden in the app, which has its own Me screen.
- The app has its own version, separate from the website's.
