-- MODULO DE GAMIFICACIÓN "FORJA DE IDENTIDAD"

-- 1. Configuración de Niveles y Rangos
-- Define la progresión del usuario. Flexible para agregar más niveles.
CREATE TABLE IF NOT EXISTS gamification_levels (
    level INTEGER PRIMARY KEY,
    min_xp INTEGER NOT NULL,
    title TEXT NOT NULL, -- Ej: "Iniciado"
    rank_group TEXT NOT NULL, -- Ej: "Aprendiz de Hábitos", "Forjador de Acero"
    icon_url TEXT,
    rewards_json JSONB DEFAULT '{}' -- Premios flexibles (desbloqueo de features, badges, etc)
);

-- 2. Catálogo de Logros (Achievements)
-- Define todos los logros posibles, sus recompensas y criterios.
CREATE TABLE IF NOT EXISTS gamification_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- Ej: 'FIRST_PERFECT_WEEK'
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 50,
    category TEXT NOT NULL CHECK (category IN ('consistency', 'milestone', 'mastery', 'social')),
    criteria_type TEXT NOT NULL, -- Ej: 'streak_days', 'total_completions'
    criteria_value INTEGER NOT NULL,
    icon_name TEXT,
    is_hidden BOOLEAN DEFAULT FALSE, -- Para logros secretos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Estado del Usuario (User Stats)
-- Tabla centralizada para el progreso del usuario. Se actualiza vía triggers o funciones.
CREATE TABLE IF NOT EXISTS user_gamification_stats (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER REFERENCES gamification_levels(level) DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    perfect_days_count INTEGER DEFAULT 0,
    total_routines_completed INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Logros Desbloqueados por Usuario
-- Registro histórico de qué logros ha obtenido cada usuario.
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES gamification_achievements(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- 5. Historial de XP (Audit Log)
-- Para métricas detalladas y auditoría de cómo ganó XP el usuario.
CREATE TABLE IF NOT EXISTS user_xp_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'routine_log', 'achievement', 'manual_bonus'
    source_id UUID, -- ID de referencia (ej: ID del log de rutina o del logro)
    metadata JSONB, -- Detalles extra
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE gamification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Lectura Pública (Catalogos)
CREATE POLICY "Public read levels" ON gamification_levels FOR SELECT USING (true);
CREATE POLICY "Public read achievements" ON gamification_achievements FOR SELECT USING (true);

-- Políticas de Usuario (Sus propios datos)
CREATE POLICY "Users view own stats" ON user_gamification_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own xp logs" ON user_xp_logs FOR SELECT USING (auth.uid() = user_id);

-- Seed Data Inicial (Niveles Básicos)
INSERT INTO gamification_levels (level, min_xp, title, rank_group) VALUES
(1, 0, 'Novato', 'Aprendiz de Hábitos'),
(2, 500, 'Iniciado', 'Aprendiz de Hábitos'),
(3, 1500, 'Caminante', 'Aprendiz de Hábitos'),
(4, 3000, 'Herrero', 'Forjador de Acero'),
(5, 5000, 'Soldado', 'Forjador de Acero'),
(8, 12000, 'Arquitecto', 'Arquitecto de Identidad'),
(13, 30000, 'Maestro', 'Maestro de la Rutina')
ON CONFLICT (level) DO NOTHING;

-- Seed Data Inicial (Logros Básicos)
INSERT INTO gamification_achievements (code, name, description, xp_reward, category, criteria_type, criteria_value) VALUES
('FIRST_STEP', 'Primer Paso', 'Completa tu primera rutina al 100%', 100, 'milestone', 'total_completions', 1),
('WEEK_WARRIOR', 'Guerrero Semanal', 'Mantén una racha de 7 días', 500, 'consistency', 'streak_days', 7),
('PERFECT_MONTH', 'Mes Perfecto', '30 días de perfección absoluta', 2000, 'mastery', 'perfect_days_count', 30)
ON CONFLICT (code) DO NOTHING;
