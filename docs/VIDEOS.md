# Lesson videos

Each lesson topic can show one YouTube video under "Watch it explained". Nothing loads from YouTube until the learner taps the video; it then plays in YouTube's privacy-enhanced player (`youtube-nocookie.com`).

## How videos are chosen

`tools/find-videos.js` searches YouTube for every topic (track name + topic title), looks at up to 8 results and keeps the best one that:

- can be embedded, is public and is not a live stream,
- is 3 to 45 minutes long.

It scores the rest by views, like ratio, how many words of the topic title appear in the video title, the search rank, a bonus for well-known teaching channels, and a penalty for non-English audio. The choice is saved in `data/videos.json`; the build turns it into `assets/videos.js`.

When a topic's title changes, its video is searched again. `--check` removes videos that were deleted or can no longer be embedded, so those topics are searched again too.

## Setup (once)

1. Google Cloud Console → create or pick a project → **APIs & Services → Library** → enable **YouTube Data API v3**.
2. **APIs & Services → Credentials → Create credentials → API key**. Restrict it: **API restrictions → YouTube Data API v3**.
3. GitHub → repo → Settings → Secrets and variables → Actions → **New repository secret** `YOUTUBE_API_KEY` = the key.
4. Actions → **Lesson videos** → **Run workflow** for the first batch, or wait for the daily run.

## Quota and schedule

The free quota is 10,000 units a day and one topic search costs about 101 units, so each daily run searches 95 topics. All 1,474 topics are covered in about 16 days. After that the daily run only checks existing videos (a few units).

Each run that changes `data/videos.json` commits it to `main` and redeploys the website. The app picks up new videos with its next version.

## Fixing a bad pick

Edit the topic's entry in `data/videos.json`: set `id` to the 11-character video id from the YouTube link (`watch?v=<id>`) and update `title`, `channel` and `secs`, or set `"id": null` to show no video for that topic. Keep `t` (the topic title) unchanged, or the entry is searched again.
