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
