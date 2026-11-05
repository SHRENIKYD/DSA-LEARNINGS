# Lesson videos

Each lesson topic can show one YouTube video under "Watch it explained". Nothing loads from YouTube until the learner taps the video; it then plays in YouTube's privacy-enhanced player (`youtube-nocookie.com`).

## How videos are chosen

`tools/find-videos.js` searches YouTube for every topic (track name + topic title), looks at up to 8 results and keeps the best one that:

- can be embedded, is public and is not a live stream,
- is 3 to 90 minutes long.

It scores the rest by views, like ratio, how many words of the topic title appear in the video title, the search rank, a bonus for well-known teaching channels, and a penalty for non-English audio. The choice is saved in `data/videos.json`; the build turns it into `assets/videos.js`.

Reviewed choices carry `curated: true`, a review date and a coverage note. Discovery preserves these choices. A changed topic title marks a curated choice stale; an unavailable curated choice retains its ID for review. Both are hidden by the build until corrected. The daily search looks for a replacement for an unavailable curated choice; the replacement is shown as a bot pick and the old choice is kept under `was` for review (if nothing matches, it tries again after 30 days). Unreviewed unavailable choices can be searched again. Topic notes in brackets are left out of the query, and acronyms such as BST, DFS or LRU count when matching titles.

## Videos per language

The DSA and Low-Level Design tracks are taught in the learner's language, so their topics can carry one extra pick per language. An entry in `data/videos.json` may gain:

```json
"byLang": { "python": { "id": "...", "title": "...", "channel": "...", "secs": 600 }, "js": {}, "cpp": {}, "java": {} }
```

Keys are `java`, `python`, `js` and `cpp`; each value has the same fields as the default pick (`id` null means searched, nothing suitable). The top-level pick stays as the default for learners with no chosen language and for languages without a pick. Other tracks never get `byLang`.

`node tools/find-videos.js --lang python [--max 40]` searches dsa and lld topics that have no `byLang.python`, with the query "Python" + topic title. It applies the same embeddable, public, non-live, 3 to 45 minute and scoring rules, and also requires the language name in the video title or channel so a Java video is never saved as a Python pick. `--check` also validates every `byLang` id and drops removed or non-embeddable ones; a default pick that disappears keeps the entry if it still has language picks.

In the browser `LessonVideo.pick(entry, lang)` (src/video.js) returns `byLang[lang]` when present, else the default (or null). The language is read from `imastery.route` (or `Learn.pref()` when loaded). `window.IM_VIDEOS[topicId]` resolves through it on every read, so lesson pages need no change and follow the learner's language. `window.IM_VIDEOS_RAW` and the Watchtower catalog keep the full `byLang` data.

The Watchtower shows language-neutral tracks plus the learner's own language track; the Java, Python, JS/TS, C++ and C# tracks of other languages are not rendered at all. A "Change language" link opens the route page, where picking "Show every language" brings them back. A card using a per-language pick carries a language badge. Learners with no chosen language see everything.

## Setup (once)

1. Google Cloud Console → create or pick a project → **APIs & Services → Library** → enable **YouTube Data API v3**.
2. **APIs & Services → Credentials → Create credentials → API key**. Restrict it: **API restrictions → YouTube Data API v3**.
3. GitHub → repo → Settings → Secrets and variables → Actions → **New repository secret** `YOUTUBE_API_KEY` = the key.
4. Actions → **Lesson videos** → **Run workflow** for the first batch, or wait for the daily run.

### More searches a day (several keys)

Each Google Cloud project has its own quota. To search more topics a day, repeat steps 1–2 in more projects (one key per project; keys from the same project share one quota), then add the repository secret `YOUTUBE_API_KEYS` = all keys separated by commas, e.g. `key1,key2,key3`. When set, it is used instead of `YOUTUBE_API_KEY` (include that key in the list to keep using it). The daily runner shares one budget across all tracks and languages, retaining its current key between searches and moving to the next key when Google reports daily quota exhaustion. Four keys from separate projects provide more capacity; four keys from the same project do not.

## Quota and schedule

The daily workflow checks availability, then runs `node tools/video-daily.js`. It round-robins across every track's default/retry queue and all five language queues (Java, Python, JavaScript, C++ and C#). Empty queues give their capacity to others. It prioritizes unsearched picks, then unsuccessful searches at least seven days old, oldest first; the same miss is not retried daily. Curated replacements retain their existing 30-day retry policy. The standalone `find-videos.js` commands retain their 30-day default cooldown.

The shared budget defaults to 90 topic searches per configured key: four keys allow up to 360 total, rather than a separate allowance for every pass. The manual `max` input now means searches per key (1–95); `SEARCHES_PER_KEY` controls the CLI runner. Under the current accounting a search plus metadata costs about 101 units, leaving headroom for availability checks. Actual Google quota errors are authoritative: all queues stop once every key is exhausted, and completed results are saved after each topic. Retries of transient API errors may add requests. Logs report attempts, matches, remaining eligible work and the reason the runner stopped. Fewer than 360 searches is expected if all eligible queues empty first.

Coverage depends on relevant results, not just quota. The existing relevance, duration, embeddability and language filters remain unchanged. The language search checks 15 results and requires the language name in the title, channel or description. More searches do not guarantee more suitable videos. The schedule and duplicate-release guard are unchanged.

Each run that changes `data/videos.json` commits it to `main` and redeploys the website; when at least one video became playable it also bumps the app version and uploads a new release to Google Play.

## Fixing a bad pick

Edit the topic's entry in `data/videos.json`: set `id` to the 11-character video id from the YouTube link (`watch?v=<id>`) and update `title`, `channel` and `secs`, or set `"id": null` to show no video for that topic. Keep `t` aligned with the current topic title. Record the reason and evidence in `data/video-review.json` when changing a reviewed choice. Run `npm run test:videos`.

## Reviewed playback

`src/video.js` shares validation and URL generation across lesson pages and the Watchtower. Optional `start`/`end` timestamps select relevant chapters; external YouTube links retain the start time and are visible before playback. Coverage notes distinguish a focused introduction from a complete lesson. Unknown durations use `secs: 0`.

See [the 232-video review](VIDEO_REVIEW.md) for scope and verification limits.

## Daily app release for new videos

The app carries its own copy of the catalog (built in by `tools/build-app.js`), so new videos reach it only through a new app version. After saving `data/videos.json`, the daily workflow runs `tools/video-release.js`: when at least `VIDEO_APP_RELEASE_MIN` (repository variable, default 1) videos became playable, it bumps `appVersion`, adds a "Lesson videos" entry to `CHANGELOG-APP.md` and syncs the iOS project in the same pull request, then starts the Android workflow, which tags the version and uploads it to Google Play. Days without new videos release nothing. Set the repository variable `VIDEO_APP_RELEASE=false` to switch it off. Every upload goes through Google Play review; a new upload while one is in review replaces it.
