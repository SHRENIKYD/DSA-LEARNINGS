-- 0003: cap the size of one user's progress JSON (256 KB each) so nobody can store unbounded data.
-- NOT VALID: existing rows are not re-checked, every new insert/update is.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'progress_size_limit' and conrelid = 'public.progress'::regclass) then
    alter table public.progress add constraint progress_size_limit
      check (octet_length(done::text) <= 262144 and octet_length(coalesce(last::text, '')) <= 262144) not valid;
  end if;
end $$;

revoke all on public.progress from anon;
