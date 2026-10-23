-- 0002: anonymous error reports from the web site and Android app.
-- Insert-only: anon/authenticated can add rows, nobody but the service role can read them.
-- No user ids, cookies or IPs are stored.

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
