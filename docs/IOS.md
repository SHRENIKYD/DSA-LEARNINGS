# iPhone and iPad

There is no App Store build and no downloadable iOS file: building an iOS app needs Xcode, which runs only on macOS, and the project does not use macOS builds. iPhone and iPad users have two options.

## 1. Install the website (recommended)

The website works as an installable app with offline support.

1. Open https://shrenikyd.github.io/DSA-LEARNINGS/ in **Safari** (on iOS 16.4 and later, Chrome and Edge can also do this from their Share menu).
2. Tap **Share** (the square with an arrow).
3. Tap **Add to Home Screen**, then **Add**.

It opens full screen from its own icon. Pages you have opened once keep working offline. Progress is saved on the device, and syncs if you sign in. To remove it, press and hold the icon and choose **Remove App**.

Play mode (XP, quests, island world, games) is only in the Android app and the native iOS build below.

## 2. Build the native app yourself (needs a Mac)

The Capacitor iOS project is in `ios/`. On a Mac with Xcode installed:

```bash
npm ci
node tools/build-app.js
npx cap sync ios
npx cap open ios
```

In Xcode, select the **App** target → **Signing & Capabilities**, choose your Apple ID as the team (a free Apple ID works), connect your iPhone and press **Run**. With a free Apple ID the app stops opening after 7 days; run it again from Xcode to renew it.
