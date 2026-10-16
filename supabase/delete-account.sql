-- Interview Mastery: let signed-in users delete their own account (required by Google Play).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Deleting the auth user also deletes their progress row (progress.user_id has "on delete cascade").

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
