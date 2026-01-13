-- DANGER: This script wipes ALL routine and gamification data.
-- Use this to reset the module to a clean state.

BEGIN;

-- 1. Truncate Routine tables (Cascade will handle dependent tables if FKs are set correct, but explicit is safer for clarity)
TRUNCATE TABLE routine_logs CASCADE;
TRUNCATE TABLE routine_context CASCADE;
TRUNCATE TABLE routine_blocks CASCADE;
TRUNCATE TABLE routines CASCADE;

-- 2. Truncate Gamification User Data (Keep Levels and Achievements catalogs intact)
TRUNCATE TABLE user_xp_logs CASCADE;
TRUNCATE TABLE user_achievements CASCADE;
TRUNCATE TABLE user_gamification_stats CASCADE;

COMMIT;
