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

## Quota and schedule

The free quota is 10,000 units a day and one topic search costs about 101 units. The daily workflow runs two passes: the default pass searches up to 50 topics, then one language pass searches up to 40 dsa/lld topics for one language, rotating by day of the year (`day % 8`: C# every other day, since it has the fewest picks, and python, js, cpp and java in between; a manual run can pick the language). That is at most 90 searches, about 9,100 units, plus a few units for `--check`. Coverage depends on available relevant results; automated search does not guarantee a suitable video for every topic. Each summary line reports the quota units the run spent; when Google stops a run, the log shows its reason (`quotaExceeded` is the daily quota; per-minute limits and server errors are retried up to 3 times). A title must share at least 30% of the topic's meaningful words (filler such as "with" or "using" is ignored). A topic with no good match is retried after 30 days, since new videos keep appearing. The language pass looks at 15 results per search and accepts a video when the language is named in its title, channel or description.

Each run that changes `data/videos.json` commits it to `main` and redeploys the website. The app picks up new videos with its next version.

## Fixing a bad pick

Edit the topic's entry in `data/videos.json`: set `id` to the 11-character video id from the YouTube link (`watch?v=<id>`) and update `title`, `channel` and `secs`, or set `"id": null` to show no video for that topic. Keep `t` aligned with the current topic title. Record the reason and evidence in `data/video-review.json` when changing a reviewed choice. Run `npm run test:videos`.

## Reviewed playback

`src/video.js` shares validation and URL generation across lesson pages and the Watchtower. Optional `start`/`end` timestamps select relevant chapters; external YouTube links retain the start time and are visible before playback. Coverage notes distinguish a focused introduction from a complete lesson. Unknown durations use `secs: 0`.

See [the 232-video review](VIDEO_REVIEW.md) for scope and verification limits.
