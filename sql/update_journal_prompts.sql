-- Actualización para Bitácora Basada en Prompts
alter table journal_entries 
add column if not exists prompt_id text,
add column if not exists category_tag text;

-- Asegurar que los campos de feedback tengan los nuevos nombres solicitados si es necesario
-- (En el paso anterior usamos ai_feedback jsonb que cubre las necesidades de análisis)
