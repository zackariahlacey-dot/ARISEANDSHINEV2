-- Atomic increment of profiles.completed_jobs_count.
--
-- The previous implementation fetched the count, added 1, and wrote it
-- back from the application — two concurrent completeJob() calls could
-- both see the same old value and lose one increment. This RPC does the
-- read-and-write in a single statement under the row's write lock so
-- the count stays accurate even at high concurrency.

create or replace function increment_completed_jobs_count(p_contractor_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  update profiles
     set completed_jobs_count = coalesce(completed_jobs_count, 0) + 1
   where id = p_contractor_id
     and role = 'contractor'
  returning completed_jobs_count into new_count;
  return new_count;
end;
$$;

-- Allow service role + authenticated to invoke (RPC permission is checked
-- in addition to the underlying table RLS).
grant execute on function increment_completed_jobs_count(uuid) to authenticated, service_role;
