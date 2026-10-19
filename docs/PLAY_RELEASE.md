# Publishing Interview Mastery on Google Play

Everything in the repo is ready: release signing, the CI build of the signed `.aab`, automatic upload to the internal testing track, the privacy policy, in-app account deletion, the icon and the store graphics. The steps below are the ones only you can do, because they need your Google accounts and your private signing key.

App id (package name): `io.github.shrenikyd.interviewmastery`. It can never change after the first upload.

## 1. Turn on account deletion in Supabase (once)

Supabase → SQL Editor → New query → paste `supabase/delete-account.sql` → Run.
This adds `delete_my_account()`, which the app's **Me → Delete account** and the web page `login.html?delete=1` call.

## 2. Create your upload key (once, on your computer)

Needs a JDK (for `keytool`). Keep the file and passwords private and back them up; if you lose them, Google support has to reset your upload key.

```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 upload.jks > upload.jks.base64     # macOS: base64 -i upload.jks -o upload.jks.base64
```

## 3. Add GitHub secrets

GitHub → repo → Settings → Secrets and variables → Actions → **Secrets** → New repository secret:

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contents of `upload.jks.base64` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | the key password |

Optional **Variable** `CONTACT_EMAIL`: shown on the privacy policy page. Without it the page links to GitHub issues.

Delete `upload.jks.base64` from your computer afterwards (keep `upload.jks` backed up).

## 4. Build the first release bundle

Bump `appVersion` in `package.json` (the app's version; `version` is the website's), run `node tools/version-sync.js`, add a `CHANGELOG-APP.md` entry and merge to `main`. The **Android app** workflow then builds `interview-mastery-app-vX.Y.Z.aab` and attaches it to the `app-vX.Y.Z` GitHub release (and as the `interview-mastery-release-aab` artifact).

## 5. Create the app in Play Console

Play Console → **Create app**: name `Interview Mastery: DSA & CS`, default language English, **App**, **Free**, accept the declarations.

### App content (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | `https://shrenikyd.github.io/DSA-LEARNINGS/privacy.html` |
| App access | All functionality is available without special access (accounts are optional) |
| Ads | No, the app does not contain ads |
| Content rating | Category: Education / reference. Answer "No" to violence, sexuality, language, drugs, gambling, user interaction/sharing of personal info (no chat or public profiles) |
| Target audience | 18 and over (choosing under-18 ages adds the Families policy requirements) |
| News app | No |
| Government, financial, health features | None |
| Data safety | See below |
| Account deletion | Users can delete in the app; web link: `https://shrenikyd.github.io/DSA-LEARNINGS/login.html?delete=1` |

### Data safety answers

- Does the app collect or share user data? **Yes, collects. Does not share.**
- Is all data encrypted in transit? **Yes.**
- Can users request deletion? **Yes** (in-app and the web link above).
- Data types collected (all **optional**, because accounts are optional; none processed ephemerally):

| Category → type | Purpose |
|---|---|
| Personal info → Email address | App functionality, Account management |
| Personal info → Name (only with Google sign-in) | Account management |
| Personal info → User IDs | App functionality, Account management |
| Personal info → Other info (Google profile picture link, only with Google sign-in) | Account management |
| App activity → Other actions (which lessons and problems are marked done, last lesson opened) | App functionality |

Not collected: location, contacts, photos/videos, audio, files, calendar, financial info, health, messages, web browsing, device IDs, analytics or crash data. Read aloud runs on the device's text-to-speech engine and nothing is uploaded.

### Store listing

Copy the text from `store/listing.md`. Upload `store/play-icon-512.png`, `store/feature-graphic-1024x500.png` and 4–6 images from `store/screenshots/`.

## 6. First upload (must be manual)

Play Console → Testing → **Internal testing** → Create new release → keep **Play App Signing** on (Google manages the app signing key) → upload the `.aab` from step 4 → add release notes → Save → Review → **Start rollout**. Add testers' Gmail addresses under the Testers tab and share the opt-in link.

## 7. Automatic uploads from GitHub (after the first upload)

1. Google Cloud Console → IAM & Admin → Service accounts → Create (no roles needed) → Keys → Add key → JSON.
2. Play Console → Users and permissions → Invite new users → paste the service account email → App permissions → Interview Mastery → grant **Release apps to testing tracks** (and **Release to production** if you want CI to promote later).
3. GitHub secret `PLAY_SERVICE_ACCOUNT_JSON` = the whole JSON key file.
4. Until the app's first release is reviewed and live on a track, Play only accepts **draft** uploads, which is the default here. After that, add the repository **Variable** `PLAY_RELEASE_STATUS` = `completed` so each upload goes straight to internal testers.

5. Optional repository **Variable** `PLAY_TRACK`: the track CI uploads to — `internal` (default), `alpha` (closed testing), `beta` (open testing) or `production`.

From then on, every new app version (`appVersion`) merged to `main` is built, signed, tagged, released on GitHub and uploaded to that track automatically. With Managed publishing on, approved changes still wait for **Publish changes** in Play Console; turn it off for fully automatic releases. You promote it to closed testing or production in Play Console.

## 8. Get production access

New personal developer accounts must run a **closed test** with at least **12 testers opted in for 14 days in a row** before applying for production. Testing → Closed testing → create a track, promote the internal release to it, invite at least 12 testers, keep them opted in for 14 days, then use **Apply for production** on the Dashboard.

## Notes

- Google sign-in in the app uses the system browser with Supabase, so it does not depend on the signing key's SHA-1; nothing to add in Google Cloud.
- `versionCode` comes from `appVersion` in `package.json` (`1.7.0` → `10700`). Every Play upload needs a higher version, so bump `appVersion` for each app release. A website-only change (only `version` bumped) builds the app but does not upload it, because its `app-vX.Y.Z` tag already exists.
- `node tools/make-icons.js` regenerates the icon, splash screens and store graphics from `store/icon.svg`; `node tools/build-app.js && node tools/store-screens.js` regenerates the screenshots. Both need Playwright with Chromium.
