-- Fix RLS for User Gamification Stats
alter table user_gamification_stats enable row level security;

-- Drop generic policies to be safe
drop policy if exists "Users view own stats" on user_gamification_stats;
drop policy if exists "Users manage own stats" on user_gamification_stats;

-- Create comprehensive policy (Select, Insert, Update)
create policy "Users manage own stats" on user_gamification_stats
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- Fix RLS for User XP Logs
alter table user_xp_logs enable row level security;

drop policy if exists "Users view own xp logs" on user_xp_logs;
drop policy if exists "Users manage own xp logs" on user_xp_logs;

create policy "Users manage own xp logs" on user_xp_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Also fix achievements while we are at it
alter table user_achievements enable row level security;
drop policy if exists "Users manage own achievements" on user_achievements;
create policy "Users manage own achievements" on user_achievements
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
