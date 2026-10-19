# App updates and icon assets

Android checks the public GitHub releases feed at launch and when the app returns to the foreground, at most once every six hours. Only stable `app-vX.Y.Z` releases with an APK asset qualify. Website-only `vX.Y.Z` tags, drafts, prereleases and unfinished releases are ignored. The installed native version takes precedence over the bundled version string.

A newer release shows a theme-aware “New version available” dialog after the user returns to a main app screen. It does not interrupt games, lessons, background sessions or an existing celebration. **Update now** opens that release’s official GitHub page using the system browser; it does not install an APK, reload the app or overwrite progress. **Later** snoozes that release for 24 hours. **Me → Check for updates** bypasses the snooze. Failed automatic checks are silent; a failed manual check offers a retry message.

This feature starts with app 1.7.1. Earlier installed versions must be updated manually once. iOS checks are disabled because this repository currently publishes Android binaries only; an iOS-specific version source and App Store destination are needed before enabling iOS prompts. Browser previews do not perform automatic native update checks.

Release the app through the existing workflow: bump `appVersion` in `package.json`, run `node tools/version-sync.js`, add the app changelog entry, then merge the reviewed change to `main`. The workflow publishes the matching `app-vX.Y.Z` release. Keep the same signing/distribution channel when installing updates.

## Branding

`store/app-icon-master.png` is the approved Lightbulb Logic icon. `node tools/make-icons.js` uses ImageMagick's `convert` to rebuild Android density and adaptive icons, iOS's opaque 1024px icon, splash screens, the Play Store icon and feature graphic, and `app/icon.png`. Commit the generated assets. The normal app build copies the in-app icon and update script into its bundle.

Run `node tools/update-test.js`, `node tools/icon-test.js` and `node tools/play-test.js` before shipping. Android CI runs all three. Native device checks should verify system-browser handoff, background/resume behavior and launcher masking; they were not performed in this environment.
