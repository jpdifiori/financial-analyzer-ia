-- Add completed_blocks to routine_logs table
alter table routine_logs 
add column if not exists completed_blocks text[] default array[]::text[];
