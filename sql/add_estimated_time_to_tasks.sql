alter table command_tasks 
add column if not exists estimated_time integer; -- Minutes (or hours, depending on usage)
