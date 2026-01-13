-- TABLA PARA EL MOTOR DE EJECUCIÓN "THE POWER 5"

CREATE TABLE IF NOT EXISTS power_five_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    slot_number INTEGER CHECK (slot_number >= 1 AND slot_number <= 5),
    task_id UUID REFERENCES command_tasks(id) ON DELETE SET NULL, -- Vínculo opcional a ACCIONAR/MISIONES
    custom_title TEXT, -- Título manual si no viene de importación
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    date DATE DEFAULT CURRENT_DATE, -- Fecha de creación/activación
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date, slot_number)
);

-- RLS para Power 5
ALTER TABLE power_five_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own power five tasks"
ON power_five_tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own power five tasks"
ON power_five_tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own power five tasks"
ON power_five_tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own power five tasks"
ON power_five_tasks FOR DELETE
USING (auth.uid() = user_id);

-- ACTUALIZACIÓN DE NIVELES "DISCIPLINE" (THE CONQUEST PATH)
-- Usamos el dominio 'discipline' para no interferir con otros módulos
INSERT INTO gamification_levels (domain, level, min_xp, title, rank_group) VALUES
('discipline', 1, 0, 'Aspirante', 'The Conquest Path'),
('discipline', 2, 500, 'Iniciado', 'The Conquest Path'),
('discipline', 5, 2500, 'Explorador', 'The Conquest Path'),
('discipline', 10, 10000, 'Guerrero', 'The Conquest Path'),
('discipline', 15, 25000, 'Veterano', 'The Conquest Path'),
('discipline', 25, 60000, 'Comandante', 'The Conquest Path'),
('discipline', 50, 150000, 'Conquistador', 'The Conquest Path'),
('discipline', 75, 400000, 'Soberano', 'The Conquest Path'),
('discipline', 100, 1000000, 'Leyenda', 'The Conquest Path')
ON CONFLICT (domain, level) DO UPDATE SET 
    title = EXCLUDED.title,
    min_xp = EXCLUDED.min_xp,
    rank_group = EXCLUDED.rank_group;

-- ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_power_five_user_date ON power_five_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_power_five_status ON power_five_tasks(status);
