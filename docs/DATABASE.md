# Database (Supabase)

The database holds accounts' progress (`progress`) and anonymous error reports (`client_errors`).
Everything is defined in `supabase/migrations/`, applied in file-name order. Every file is safe to run twice.
`supabase/schema.sql` is the same thing in one file, for pasting into the SQL editor.

| File | What it adds |
| --- | --- |
| `0001_progress_and_delete_account.sql` | `progress` table, row level security (own row only), `delete_my_account()` |
| `0002_client_errors.sql` | `client_errors` table, insert-only for anon/authenticated, length checks |
| `0003_progress_size_limit.sql` | 256 KB cap on each progress JSON column; anon has no access to `progress` |
| `0004_progress_prefs.sql` | Nullable `prefs jsonb` on `progress` (route preference `{id, lang, hours, mode, onboarded, known, updatedAt}`, synced last-write-wins by `updatedAt`), with its own 256 KB cap |
| `0005_progress_play.sql` | Nullable `play jsonb` on `progress` (play layer `{play, review, days, updatedAt}`, merged on pull, see below), with its own 256 KB cap |

## Apply migrations to the real project

Option 1, SQL editor: Supabase dashboard > SQL Editor > New query. Paste each file from `supabase/migrations/`
in order (or all of `supabase/schema.sql` once) and press Run. Re-running is harmless.

Option 2, CLI: `supabase link --project-ref <ref>` then `supabase db push`.

To add a change later, create the next numbered file (`0006_...sql`), keep it idempotent, mirror it in
`supabase/schema.sql`, and open a PR. The "Database check" workflow runs `node tools/rls-check.js`, which
builds a throwaway PostgreSQL, applies every migration, and tests who can read and write what.
Run it locally with `node tools/rls-check.js` (needs PostgreSQL installed; pass a folder to test a copy).

## The `play` column (play layer sync)

`progress.play` holds the app's play layer and the learner state that used to live only on the device, as one JSON blob
written by `src/auth.js` (the website and the Capacitor app share the code):

| Key | From local storage | Contents |
| --- | --- | --- |
| `play` | `imastery.play` | `bonus` (XP from quests and games), `games` (`{wins, at}` per game), `days` (per-day quest counters `t/q/g/x/r`), `claimed` (quests claimed per day), `seen` (items already credited), `lastGame`, `lastLevel`, `track`, `gameCat`, `region`, `settings` (synced subset only) |
| `review` | `imastery.review` | spaced-review queue, `{id, mod, title, step, due, misses}` per section |
| `days` | `imastery.days` | days with any activity (`YYYY-MM-DD`, last 60) for the planner's streak and catch-up |
| `updatedAt` | `imastery.playmeta` | ms timestamp of the last local change |

Device settings (`sound`, `haptics`, `motion`, `bit`, `tts`) are never uploaded; they stay in `imastery.play.settings` on the device
and are kept when a pull writes merged data. Guests are not affected: nothing is read or written without a signed-in user.

Pulling does **not** use last-write-wins, because two devices can both play before they sync. The local copy and the server
copy are merged (`mergeBlob` in `src/auth.js`), and the result is written back locally and pushed when it differs from the server:

| Field | Rule |
| --- | --- |
| XP bonus (`play.bonus`) | maximum of both |
| Game wins (`play.games[id]`) | per game: maximum `wins`, latest `at` timestamp |
| Daily quest records (`play.days[YYYY-MM-DD]`) | union of days; for a day present on both sides the record from the blob with the later `updatedAt` wins |
| Claimed quests (`play.claimed[day]`) | union, so a claimed quest is never claimable twice |
| Seen items (`play.seen`) | union, so a tick credited on one device is not credited again on the other |
| Streak and freezes | derived by `Play.streak` from the merged day records, so the record with the later `updatedAt` decides the current day |
| Synced settings and other scalars (`lastGame`, `track`, ...) | value from the blob with the later `updatedAt`; the other blob fills gaps |
| Activity days (`days`) | union, sorted, last 60 |
| Review queue (`review`) | union by section `id`; the entry with the later `due` wins; at most 300 entries |
| `updatedAt` | maximum of both |

Signing in on a device that holds another account's data (`imastery.sync.user` differs) replaces the local play data with the
server copy (or clears it when the account has none), exactly like `done`. Pushes are debounced (800 ms) and triggered by the
app's `save()`, the planner's activity log and every progress change; the signature of the blob is compared first so that saving
an unchanged screen does not cause a push. When the column is missing (migration not applied yet) the client falls back to syncing
`done`, `last` and `prefs` only, as it does for `prefs`. Sign-out flushes first and refuses to clear the device while a push is
still pending; "Download my data" includes the local play data and the server blob.

## Auth redirect URLs

Supabase dashboard > Authentication > URL Configuration. Site URL: `https://shrenikyd.github.io/DSA-LEARNINGS/`.
Add these under Redirect URLs (the code uses them in `src/login.js`):

- `https://shrenikyd.github.io/DSA-LEARNINGS/login.html` (also matches `?next=...&delete=1`, `?reset=1`, `?app=1` if you use a wildcard such as `https://shrenikyd.github.io/DSA-LEARNINGS/login.html**`)
- `https://shrenikyd.github.io/DSA-LEARNINGS/login.html?app=1` (Google sign-in from the Android app returns here)
- `io.github.shrenikyd.interviewmastery://login-callback` (Android app deep link, app id `io.github.shrenikyd.interviewmastery`)

Google sign-in also needs the Supabase callback `https://<project-ref>.supabase.co/auth/v1/callback`
in the Google Cloud OAuth client's authorized redirect URIs.

## Weekly backup

`.github/workflows/backup.yml` runs Sundays 04:23 UTC and on demand (Actions > Database backup > Run workflow).
It dumps the `public` schema (structure and data), gzips it, encrypts it with AES-256, and uploads it as the
`db-backup` artifact. Artifacts are deleted after 30 days, on purpose.

Set up (repo Settings > Secrets and variables > Actions > New repository secret):

- `SUPABASE_DB_URL`: Postgres connection string (Supabase > Project Settings > Database > Connection string, use the session pooler URI with the password filled in). If missing, the job prints a notice and does nothing.
- `BACKUP_PASSPHRASE`: a long random passphrase. Store it in a password manager; without it a backup cannot be opened. If missing (and the URL is set) the job fails.

Note: `auth.users` (emails, password hashes) is not in the dump, only `public`. Backed-up progress rows need their users to exist on restore (see below).

### Restore

1. Actions > Database backup > pick a run > download the `db-backup` artifact and unzip it.
2. Decrypt and decompress:
   `openssl enc -d -aes-256-cbc -pbkdf2 -in backup-YYYYMMDD.sql.gz.enc -pass env:BACKUP_PASSPHRASE | gunzip > backup.sql`
   (set `BACKUP_PASSPHRASE` in your shell first).
3. Create a scratch Supabase project (it already has `auth.users` and the roles). Do not apply the migrations: the dump creates the tables itself. Errors about objects that already exist can be ignored.
4. For a real restore, users must exist in `auth.users` with the same ids (progress has a foreign key to it).
   For a test restore, insert dummy ids into `auth.users`, or load with `psql -v ON_ERROR_STOP=0`.
5. Load: `psql "$SCRATCH_DB_URL" -f backup.sql`.
6. Check: `select count(*) from public.progress;`.

## Visit statistics (0006)

`public.visits` holds one row per random visitor id, page and UTC day (device class, OS family, browser family, web or app, signed in or not, hits). The site and app write only through `log_visit()` (`src/visits.js`); nobody can read or change the table through the API. The owner dashboard is `admin.html` (not linked anywhere), which calls `visits_summary(days)`; it works only for accounts listed in `public.visit_admins`. Add the owner once in the Supabase SQL editor:

```sql
insert into public.visit_admins (user_id) select id from auth.users where email = '<owner sign-in email>';
```

The weekly backup workflow deletes rows older than 400 days. Browsers that send Do Not Track or Global Privacy Control, and `localStorage imastery.noStats = '1'`, send nothing.
