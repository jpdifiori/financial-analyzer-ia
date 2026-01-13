-- SCRIPT DEFINITIVO DE REPARACIÓN "THE POWER 5"
-- Ejecutar en el SQL Editor de Supabase para activar el módulo correctamente.

-- 1. Crear la tabla de tareas Power 5 (con IF NOT EXISTS para seguridad)
CREATE TABLE IF NOT EXISTS power_five_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    slot_number INTEGER CHECK (slot_number >= 1 AND slot_number <= 5) NOT NULL,
    task_id UUID REFERENCES command_tasks(id) ON DELETE SET NULL,
    custom_title TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date, slot_number)
);

-- 2. Habilitar Seguridad de Fila (RLS)
ALTER TABLE power_five_tasks ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Seguridad (si no existen)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'power_five_tasks' AND policyname = 'Users view own tasks') THEN
        CREATE POLICY "Users view own tasks" ON power_five_tasks FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'power_five_tasks' AND policyname = 'Users insert own tasks') THEN
        CREATE POLICY "Users insert own tasks" ON power_five_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'power_five_tasks' AND policyname = 'Users update own tasks') THEN
        CREATE POLICY "Users update own tasks" ON power_five_tasks FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'power_five_tasks' AND policyname = 'Users delete own pending tasks') THEN
        CREATE POLICY "Users delete own pending tasks" ON power_five_tasks FOR DELETE USING (user_id = auth.uid() AND status = 'pending');
    END IF;
END $$;

-- 4. Crear Índices de Performance
CREATE INDEX IF NOT EXISTS idx_power_five_user_date ON power_five_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_power_five_status ON power_five_tasks(status);

-- 5. Verificar que el dominio gamificado 'discipline' exista
-- (Asegura que awardXP funcione después)
INSERT INTO gamification_levels (domain, level, min_xp, title, rank_group) VALUES
('discipline', 1, 0, 'Aprendiz de Foco', 'Maestría de Ejecución'),
('discipline', 5, 2000, 'Forjador', 'Maestría de Ejecución'),
('discipline', 10, 5000, 'Centurión', 'Maestría de Ejecución')
ON CONFLICT (domain, level) DO NOTHING;
