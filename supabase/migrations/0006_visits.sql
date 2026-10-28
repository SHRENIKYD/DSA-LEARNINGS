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
