# Operations guide (owner)

One page: how the project fits together, how a release happens, how to roll back, and what to do when it is down. Secret and variable names are listed here; their values never are.

## Architecture in brief

- **Site.** `node tools/build.js site` builds the study site from `content/`, `src/` and `data/` into `site/`. `.github/workflows/pages.yml` deploys it to GitHub Pages, from `main` only, and tags each new website version `web-vX.Y.Z`.
- **Checks.** `checks.yml` validates and tests changed modules on pull requests and runs a full check weekly.
- **App.** `node tools/build-app.js` builds `app-www/`; Capacitor wraps it as an Android app. `android.yml` runs the tests, builds a debug APK (workflow artifact only) and a signed `.aab`, tags `app-vX.Y.Z`, publishes a GitHub Release with the `.aab`, and uploads it to Google Play.
- **Supabase.** Accounts and progress sync (`src/auth.js`, `supabase/schema.sql`), plus the `client_errors` table that receives browser and app error reports. The builds contain only the URL and the publishable key.
- **Video bot.** `videos.yml` runs daily, searches YouTube for lesson videos, checks the catalog with `tools/video-test.js`, then saves `data/videos.json` through a pull request that it opens and merges itself (main requires PRs) and redeploys the site. It needs Settings → Actions → General → "Read and write permissions" and "Allow GitHub Actions to create and approve pull requests".
- **Play listing.** `play-listing.yml` is started by hand; it regenerates store graphics and can upload them and the listing text to Google Play.
- **Uptime.** `uptime.yml` checks the live site (and Supabase, if configured) every hour and opens a GitHub issue labelled `outage` when something fails.

## How a release happens

1. Open a pull request. Checks run (`checks.yml`, and `android.yml` tests when app files change).
2. Merge it to `main`.
3. Website: if `version` in `package.json` is new, `pages.yml` deploys the site and tags `web-vX.Y.Z`.
4. App: if `appVersion` in `package.json` is new, `android.yml` builds the signed bundle, tags `app-vX.Y.Z`, creates the GitHub Release and uploads to the Play track in `PLAY_TRACK` (default internal, status default draft). Promote or publish in Play Console as needed.

## Versioning rule

- Website: patch .1 to .100, then the next minor (1.10.100 is followed by 1.11.0). See the header of `CHANGELOG.md`.
- App: patch .1 to .99, then the next minor (1.11.99 is followed by 1.12.0). The patch stops at 99 because the Android `versionCode` is MAJOR x 10000 + MINOR x 100 + PATCH. See the header of `CHANGELOG-APP.md`.

## Rollback

- **Site.** Revert the bad merge commit and push the revert through a pull request; the deploy runs on merge. Alternatively re-run `pages.yml` (Actions → Deploy site to GitHub Pages → Run workflow) on an older commit; the revert pull request is the safe default.
- **App.** In Play Console halt the staged rollout (Release → the track → Halt rollout). Users who already have the bad version keep it, so ship a fixed version with a higher `appVersion` (a version code cannot be reused).

## Secrets and variables used by the workflows

Secrets (Settings → Secrets and variables → Actions → Secrets):

| Name | Purpose |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Upload keystore, base64. Enables the signed bundle. |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password. |
| `ANDROID_KEY_ALIAS` | Key alias in the keystore. |
| `ANDROID_KEY_PASSWORD` | Key password. |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Play service account key. Enables the Play upload. |
| `SUPABASE_URL` | Supabase project URL (only if not set as a variable). |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (only if not set as a variable). |
| `YOUTUBE_API_KEY` | YouTube Data API key for the video bot. |

Variables (same page, Variables tab):

| Name | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL for builds and the uptime check. |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key for builds. |
| `CONTACT_EMAIL` | Contact address shown in the app. |
| `PLAY_TRACK` | Play track to upload to (default `internal`). |
| `PLAY_RELEASE_STATUS` | `draft` (default), `completed` or `inProgress`. |
| `PLAY_USER_FRACTION` | Fraction for a staged rollout, used only with `inProgress` (0.1 = 10%). |

Workflows also use the automatic `GITHUB_TOKEN`; `uptime.yml` gets `issues: write` only.

## Outage response

An issue titled "Outage: uptime check failed" with the `outage` label means one or more hourly checks failed; new failures are added as comments, and the issue closes itself with a comment when all checks pass again.

First checks:
1. Open the run link in the issue and read which check failed.
2. Home page, module page or `assets/videos.js` failing: open the site yourself, check githubstatus.com, then look at the last `pages.yml` run in Actions. If a recent deploy broke it, roll back as above.
3. Supabase auth health failing: check the Supabase dashboard (project paused? status page?). The study site works without it; only sign-in and sync are affected.
4. One failed check that passes on the next hour is usually a blip; the issue closes by itself.
