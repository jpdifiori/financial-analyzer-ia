-- 1. Ensure completed_blocks column exists
alter table routine_logs 
add column if not exists completed_blocks text[] default array[]::text[];

-- 2. Ensure Unique Constraint for UPSERT (routine_id + completed_at)
-- Drop old constraint/index if it exists to ensure clean slate
alter table routine_logs drop constraint if exists routine_logs_routine_id_completed_at_key;
-- Re-add constraint
alter table routine_logs add constraint routine_logs_routine_id_completed_at_key unique (routine_id, completed_at);

-- 3. Reset RLS Policy for Logs
alter table routine_logs enable row level security;

-- Drop existing policy to avoid conflicts
drop policy if exists "Users can manage logs of their routines" on routine_logs;

-- Create permissive policy for owner
create policy "Users can manage logs of their routines" on routine_logs 
for all 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 4. Verify routine_blocks RLS just in case (read access needed for calculation)
alter table routine_blocks enable row level security;
drop policy if exists "Users can manage blocks of their routines" on routine_blocks;
create policy "Users can manage blocks of their routines" on routine_blocks 
for all 
using (exists (select 1 from routines where id = routine_id and user_id = auth.uid()));
