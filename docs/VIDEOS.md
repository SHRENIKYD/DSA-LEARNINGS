# Lesson videos

Each lesson topic can show one YouTube video under "Watch it explained". Nothing loads from YouTube until the learner taps the video; it then plays in YouTube's privacy-enhanced player (`youtube-nocookie.com`).

## How videos are chosen

`tools/find-videos.js` searches YouTube for every topic (track name + topic title), looks at up to 8 results and keeps the best one that:

- can be embedded, is public and is not a live stream,
- is 3 to 45 minutes long.

It scores the rest by views, like ratio, how many words of the topic title appear in the video title, the search rank, a bonus for well-known teaching channels, and a penalty for non-English audio. The choice is saved in `data/videos.json`; the build turns it into `assets/videos.js`.

Reviewed choices carry `curated: true`, a review date and a coverage note. Discovery preserves these choices. A changed topic title marks a curated choice stale; an unavailable curated choice retains its ID for review. Both are hidden by the build until corrected. Unreviewed unavailable choices can be searched again.

## Setup (once)

1. Google Cloud Console → create or pick a project → **APIs & Services → Library** → enable **YouTube Data API v3**.
2. **APIs & Services → Credentials → Create credentials → API key**. Restrict it: **API restrictions → YouTube Data API v3**.
3. GitHub → repo → Settings → Secrets and variables → Actions → **New repository secret** `YOUTUBE_API_KEY` = the key.
4. Actions → **Lesson videos** → **Run workflow** for the first batch, or wait for the daily run.

## Quota and schedule

The free quota is 10,000 units a day and one topic search costs about 101 units, so each daily run searches 95 topics. Coverage depends on available relevant results; automated search does not guarantee a suitable video for every topic. After that the daily run only checks existing videos (a few units).

Each run that changes `data/videos.json` commits it to `main` and redeploys the website. The app picks up new videos with its next version.

## Fixing a bad pick

Edit the topic's entry in `data/videos.json`: set `id` to the 11-character video id from the YouTube link (`watch?v=<id>`) and update `title`, `channel` and `secs`, or set `"id": null` to show no video for that topic. Keep `t` aligned with the current topic title. Record the reason and evidence in `data/video-review.json` when changing a reviewed choice. Run `npm run test:videos`.

## Reviewed playback

`src/video.js` shares validation and URL generation across lesson pages and the Watchtower. Optional `start`/`end` timestamps select relevant chapters; external YouTube links retain the start time and are visible before playback. Coverage notes distinguish a focused introduction from a complete lesson. Unknown durations use `secs: 0`.

See [the 232-video review](VIDEO_REVIEW.md) for scope and verification limits.
