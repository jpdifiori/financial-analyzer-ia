-- REFACTORIZACIÓN DEL SISTEMA DE GAMIFICACIÓN "KONKEST NEXUS"
-- Objetivo: Gamificación modular por dominios integrada en un nivel global.

-- 1. Eliminar restricciones antiguas que bloquean la refactorización
ALTER TABLE IF EXISTS user_gamification_stats DROP CONSTRAINT IF EXISTS user_gamification_stats_current_level_fkey;
ALTER TABLE IF EXISTS gamification_levels DROP CONSTRAINT IF EXISTS gamification_levels_pkey;

-- 2. Modificar la estructura de niveles para soportar dominios (Global, Disciplina, Finanzas, Rutinas)
ALTER TABLE gamification_levels ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'global' NOT NULL;
ALTER TABLE gamification_levels ADD PRIMARY KEY (domain, level);

-- 3. Crear tabla para estadísticas por dominio
CREATE TABLE IF NOT EXISTS user_domain_stats (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL, -- 'global', 'discipline', 'finance', 'routines'
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, domain)
);

-- 4. Migrar datos existentes de user_gamification_stats a los nuevos dominios
-- Asumimos que el XP actual del usuario va al dominio 'global' y duplicamos a 'routines' si viene de ahí.
INSERT INTO user_domain_stats (user_id, domain, total_xp, current_level, last_activity_date, updated_at)
SELECT user_id, 'global', total_xp, current_level, last_activity_date, updated_at
FROM user_gamification_stats
ON CONFLICT (user_id, domain) DO UPDATE SET 
    total_xp = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level;

INSERT INTO user_domain_stats (user_id, domain, total_xp, current_level, last_activity_date, updated_at)
SELECT user_id, 'routines', total_xp, current_level, last_activity_date, updated_at
FROM user_gamification_stats
ON CONFLICT (user_id, domain) DO NOTHING;

-- 5. Vincular las tablas de forma segura
ALTER TABLE user_domain_stats 
ADD CONSTRAINT fk_domain_level FOREIGN KEY (domain, current_level) 
REFERENCES gamification_levels(domain, level);

-- 6. Insertar los niveles actualizados por dominio
-- Primero limpiamos pero con cuidado de no romper las referencias recién creadas
-- (Mejor usar INSERT ON CONFLICT)

-- DOMINIO: GLOBAL (Progreso total)
INSERT INTO gamification_levels (domain, level, min_xp, title, rank_group) VALUES
('global', 1, 0, 'Aspirante', 'Senda del Conquistador'),
('global', 2, 1000, 'Iniciado', 'Senda del Conquistador'),
('global', 5, 5000, 'Explorador', 'Senda del Conquistador'),
('global', 10, 15000, 'Guerrero', 'Senda del Conquistador'),
('global', 25, 50000, 'Comandante', 'Senda del Conquistador'),
('global', 50, 150000, 'Soberano', 'Senda del Conquistador'),
('global', 100, 500000, 'Leyenda', 'Senda del Conquistador')
ON CONFLICT (domain, level) DO UPDATE SET 
    title = EXCLUDED.title,
    min_xp = EXCLUDED.min_xp;

-- DOMINIO: DISCIPLINE (The Power 5, Tareas)
INSERT INTO gamification_levels (domain, level, min_xp, title, rank_group) VALUES
('discipline', 1, 0, 'Aprendiz de Foco', 'Maestría de Ejecución'),
('discipline', 5, 2000, 'Forjador', 'Maestría de Ejecución'),
('discipline', 10, 5000, 'Centurión', 'Maestría de Ejecución'),
('discipline', 25, 15000, 'Estratega', 'Maestría de Ejecución'),
('discipline', 50, 50000, 'Ejecutor Maestro', 'Maestría de Ejecución')
ON CONFLICT (domain, level) DO UPDATE SET 
    title = EXCLUDED.title,
    min_xp = EXCLUDED.min_xp;

-- DOMINIO: FINANCE (Wealth Building)
INSERT INTO gamification_levels (domain, level, min_xp, title, rank_group) VALUES
('finance', 1, 0, 'Analista Local', 'Arquitectura Financiera'),
('finance', 5, 1000, 'Gestor', 'Arquitectura Financiera'),
('finance', 10, 5000, 'Capitalista', 'Arquitectura Financiera'),
('finance', 25, 25000, 'Magnate', 'Arquitectura Financiera'),
('finance', 50, 100000, 'Alquimista', 'Arquitectura Financiera')
ON CONFLICT (domain, level) DO UPDATE SET 
    title = EXCLUDED.title,
    min_xp = EXCLUDED.min_xp;

-- 7. Habilitar RLS para la nueva tabla
ALTER TABLE user_domain_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own domain stats" ON user_domain_stats FOR SELECT USING (auth.uid() = user_id);

-- 8. Limpiar tabla antigua paulatinamente (opcional)
-- DROP TABLE IF EXISTS user_gamification_stats;
