# Database (Supabase)

The database holds accounts' progress (`progress`) and anonymous error reports (`client_errors`).
Everything is defined in `supabase/migrations/`, applied in file-name order. Every file is safe to run twice.
`supabase/schema.sql` is the same thing in one file, for pasting into the SQL editor.

| File | What it adds |
| --- | --- |
| `0001_progress_and_delete_account.sql` | `progress` table, row level security (own row only), `delete_my_account()` |
| `0002_client_errors.sql` | `client_errors` table, insert-only for anon/authenticated, length checks |
| `0003_progress_size_limit.sql` | 256 KB cap on each progress JSON column; anon has no access to `progress` |

## Apply migrations to the real project

Option 1, SQL editor: Supabase dashboard > SQL Editor > New query. Paste each file from `supabase/migrations/`
in order (or all of `supabase/schema.sql` once) and press Run. Re-running is harmless.

Option 2, CLI: `supabase link --project-ref <ref>` then `supabase db push`.

To add a change later, create the next numbered file (`0004_...sql`), keep it idempotent, mirror it in
`supabase/schema.sql`, and open a PR. The "Database check" workflow runs `node tools/rls-check.js`, which
builds a throwaway PostgreSQL, applies every migration, and tests who can read and write what.
Run it locally with `node tools/rls-check.js` (needs PostgreSQL installed; pass a folder to test a copy).

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
