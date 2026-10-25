-- 0005: store the learner's play layer with their progress: XP bonus, game wins, daily quest records, activity days and the
-- spaced-review queue ({play, review, days, updatedAt}). Nullable; the app merges it on pull (max XP, per-game max wins, union of
-- days and reviews, newer record per quest day; see docs/DATABASE.md). It gets its own 256 KB cap so the limits from 0003 and 0004
-- keep working unchanged.

alter table public.progress add column if not exists play jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'progress_play_size_limit' and conrelid = 'public.progress'::regclass) then
    alter table public.progress add constraint progress_play_size_limit
      check (octet_length(coalesce(play::text, '')) <= 262144) not valid;
  end if;
end $$;

revoke all on public.progress from anon;
