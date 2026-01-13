-- Analytics Views for Routine tracking

-- 1. Block Performance View
-- Calculates how often each specific block is completed when the routine is logged.
CREATE OR REPLACE VIEW view_block_performance AS
SELECT 
    b.id as block_id,
    b.type as block_name,
    r.name as routine_name,
    COUNT(l.id) as total_routine_logs,
    SUM(CASE WHEN b.id = ANY(l.completed_blocks) THEN 1 ELSE 0 END) as times_completed,
    ROUND(
        (SUM(CASE WHEN b.id = ANY(l.completed_blocks) THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(l.id), 0)) * 100, 
        1
    ) as completion_rate_percentage
FROM routine_blocks b
JOIN routines r ON b.routine_id = r.id
LEFT JOIN routine_logs l ON r.id = l.routine_id
GROUP BY b.id, b.type, r.name, r.id
ORDER BY completion_rate_percentage DESC;

-- 2. Routine Consistency View
-- Analyzes the success rate of routines over time (last 30 days)
CREATE OR REPLACE VIEW view_routine_consistency AS
SELECT 
    r.name as routine_name,
    COUNT(l.id) as days_logged,
    AVG(l.success_percentage) as average_completion,
    SUM(CASE WHEN l.success_percentage = 100 THEN 1 ELSE 0 END) as perfect_days
FROM routines r
JOIN routine_logs l ON r.id = l.routine_id
WHERE l.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY r.id, r.name;
