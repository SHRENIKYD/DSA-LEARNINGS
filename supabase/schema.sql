-- Interview Mastery: full database schema (all of supabase/migrations/ in one file).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run. Safe to re-run.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  done       jsonb not null default '{}'::jsonb,
  last       jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "progress: read own" on public.progress;
create policy "progress: read own" on public.progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "progress: insert own" on public.progress;
create policy "progress: insert own" on public.progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "progress: update own" on public.progress;
create policy "progress: update own" on public.progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.progress_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists progress_touch on public.progress;
create trigger progress_touch before insert or update on public.progress
  for each row execute function public.progress_touch();

create or replace function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'You must be signed in to delete your account.';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---- 0002_client_errors.sql ----

create table if not exists public.client_errors (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  app        text,
  version    text,
  page       text,
  message    text,
  stack      text,
  ua         text
);

alter table public.client_errors enable row level security;

drop policy if exists "client_errors: insert only" on public.client_errors;
create policy "client_errors: insert only" on public.client_errors
  for insert to anon, authenticated
  with check (
    app in ('web', 'android')
    and char_length(coalesce(message, '')) <= 500
    and char_length(coalesce(stack, '')) <= 4000
    and char_length(coalesce(page, '')) <= 200
    and char_length(coalesce(ua, '')) <= 300
    and char_length(coalesce(version, '')) <= 50
  );

revoke all on public.client_errors from anon, authenticated;
grant insert on public.client_errors to anon, authenticated;
revoke all on sequence public.client_errors_id_seq from anon, authenticated;
grant usage on sequence public.client_errors_id_seq to anon, authenticated;

-- ---- 0003_progress_size_limit.sql ----
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'progress_size_limit' and conrelid = 'public.progress'::regclass) then
    alter table public.progress add constraint progress_size_limit
      check (octet_length(done::text) <= 262144 and octet_length(coalesce(last::text, '')) <= 262144) not valid;
  end if;
end $$;

revoke all on public.progress from anon;

-- ---- 0004_progress_prefs.sql ----
alter table public.progress add column if not exists prefs jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'progress_prefs_size_limit' and conrelid = 'public.progress'::regclass) then
    alter table public.progress add constraint progress_prefs_size_limit
      check (octet_length(coalesce(prefs::text, '')) <= 262144) not valid;
  end if;
end $$;

revoke all on public.progress from anon;

-- ---- 0005_progress_play.sql ----
alter table public.progress add column if not exists play jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'progress_play_size_limit' and conrelid = 'public.progress'::regclass) then
    alter table public.progress add constraint progress_play_size_limit
      check (octet_length(coalesce(play::text, '')) <= 262144) not valid;
  end if;
end $$;

revoke all on public.progress from anon;

-- ---- 0006_visits.sql ----
-- 0006: private visit statistics for the site owner.
-- Each browser or app install keeps a random visitor id (localStorage imastery.vid). One row per visitor, page and
-- UTC day; no names, emails, account ids, IP addresses or full user-agent strings are stored.
-- Nobody can read the table directly: the site logs through log_visit(), and only accounts listed in
-- public.visit_admins can call visits_summary(). Add yourself once in the SQL editor:
--   insert into public.visit_admins (user_id) select id from auth.users where email = '<your sign-in email>';

create table if not exists public.visits (
  day        date        not null default (now() at time zone 'utc')::date,
  visitor    uuid        not null,
  page       text        not null,
  surface    text        not null,
  device     text        not null,
  os         text        not null,
  browser    text        not null,
  signed_in  boolean     not null default false,
  hits       integer     not null default 1,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (day, visitor, page),
  constraint visits_surface check (surface in ('web', 'app')),
  constraint visits_device check (device in ('mobile', 'tablet', 'desktop')),
  constraint visits_os check (os in ('Android', 'iOS', 'Windows', 'macOS', 'Linux', 'ChromeOS', 'Other')),
  constraint visits_browser check (browser in ('Chrome', 'Edge', 'Firefox', 'Safari', 'Samsung', 'Opera', 'App', 'Other')),
  constraint visits_page check (page ~ '^[a-z0-9._/#-]{1,60}$')
);
create index if not exists visits_day on public.visits (day);

alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;

create table if not exists public.visit_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.visit_admins enable row level security;
revoke all on public.visit_admins from anon, authenticated;

-- Records one page view. Same visitor + page + day only increases hits, so repeated loads do not add rows.
create or replace function public.log_visit(p_visitor uuid, p_page text, p_surface text, p_device text, p_os text, p_browser text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor is null then return; end if;
  insert into public.visits as v (visitor, page, surface, device, os, browser, signed_in)
  values (p_visitor, lower(p_page), p_surface, p_device, p_os, p_browser, auth.uid() is not null)
  on conflict (day, visitor, page) do update
    set hits = least(v.hits + 1, 10000), last_seen = now(), signed_in = v.signed_in or excluded.signed_in;
end;
$$;
revoke all on function public.log_visit(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.log_visit(uuid, text, text, text, text, text) to anon, authenticated;

-- Aggregates for the owner's dashboard (admin.html). Raises for anyone not in visit_admins.
create or replace function public.visits_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d    integer := greatest(1, least(coalesce(p_days, 30), 365));
  since date := (now() at time zone 'utc')::date - (d - 1);
  today date := (now() at time zone 'utc')::date;
begin
  if not exists (select 1 from public.visit_admins where user_id = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'days', d,
    'today', (select count(distinct visitor) from public.visits where day = today),
    'week', (select count(distinct visitor) from public.visits where day > today - 7),
    'period', (select count(distinct visitor) from public.visits where day >= since),
    'views', (select coalesce(sum(hits), 0) from public.visits where day >= since),
    'signedIn', (select count(distinct visitor) from public.visits where day >= since and signed_in),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'visitors', g.n, 'views', g.v) order by g.day), '[]'::jsonb)
              from (select day, count(distinct visitor) n, sum(hits) v from public.visits where day >= since group by day) g),
    'devices', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select device k, count(distinct visitor) n from public.visits where day >= since group by device) x),
    'os', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select os k, count(distinct visitor) n from public.visits where day >= since group by os) x),
    'browsers', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select browser k, count(distinct visitor) n from public.visits where day >= since group by browser) x),
    'surfaces', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select surface k, count(distinct visitor) n from public.visits where day >= since group by surface) x),
    'pages', (select coalesce(jsonb_agg(jsonb_build_object('page', k, 'visitors', n, 'views', v) order by n desc, k), '[]'::jsonb)
              from (select page k, count(distinct visitor) n, sum(hits) v from public.visits where day >= since group by page order by count(distinct visitor) desc, page limit 25) x)
  );
end;
$$;
revoke all on function public.visits_summary(integer) from public, anon, authenticated;
grant execute on function public.visits_summary(integer) to authenticated;
