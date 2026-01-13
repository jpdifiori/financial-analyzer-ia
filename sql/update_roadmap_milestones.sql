-- Migración para enriquecer los Hitos del Roadmap
alter table challenge_roadmap
add column if not exists description text,
add column if not exists target_date date,
add column if not exists priority text check (priority in ('low', 'medium', 'high', 'critical')) default 'medium',
add column if not exists status text check (status in ('pending', 'in_progress', 'completed', 'cancelled')) default 'pending',
add column if not exists notes text;
