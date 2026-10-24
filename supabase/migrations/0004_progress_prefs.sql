-- 0004: store the learner's route preference (chosen goal, language, weekly hours, view mode) with their progress.
-- Nullable; the app syncs it last-write-wins by prefs->>'updatedAt'. It gets its own size cap so the 256 KB limits
-- from 0003 on done and last keep working unchanged.

alter table public.progress add column if not exists prefs jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'progress_prefs_size_limit' and conrelid = 'public.progress'::regclass) then
    alter table public.progress add constraint progress_prefs_size_limit
      check (octet_length(coalesce(prefs::text, '')) <= 262144) not valid;
  end if;
end $$;

revoke all on public.progress from anon;
