"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface DomainStats {
    domain: string;
    total_xp: number;
    current_level: number;
    level_title?: string;
    rank_group?: string;
    next_level_xp?: number;
    progress_to_next?: number; // 0 to 100
}

export async function getUserGamificationStats(accessToken: string, userId: string) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        // 1. Fetch all domain stats for the user
        const { data: stats, error: statsError } = await supabase
            .from("user_domain_stats")
            .select(`
                *,
                levels:gamification_levels(title, rank_group, min_xp)
            `)
            .eq("user_id", userId);

        if (statsError) {
            console.error("Supabase error in getUserGamificationStats:", statsError);
            return []; // Return empty if table doesn't exist or other DB error
        }

        if (!stats || stats.length === 0) return [];

        // 2. Fetch all levels to calculate progress to next
        const { data: allLevels, error: levelsErr } = await supabase
            .from("gamification_levels")
            .select("*")
            .order("min_xp", { ascending: true });

        if (levelsErr) return [];

        // 3. Map and enhance data
        const enhancedStats: DomainStats[] = stats.map(s => {
            const domainLevels = allLevels?.filter(l => l.domain === s.domain) || [];
            const nextLevel = domainLevels.find(l => l.min_xp > s.total_xp);
            const currentLevelData = domainLevels.find(l => l.level === s.current_level);

            let progress = 100;
            if (nextLevel && currentLevelData) {
                const range = nextLevel.min_xp - currentLevelData.min_xp;
                const currentProgress = s.total_xp - currentLevelData.min_xp;
                progress = Math.min(Math.round((currentProgress / range) * 100), 100);
            }

            return {
                domain: s.domain,
                total_xp: s.total_xp,
                current_level: s.current_level,
                level_title: s.levels?.title || 'Aspirante',
                rank_group: s.levels?.rank_group || 'The Conquest Path',
                next_level_xp: nextLevel?.min_xp,
                progress_to_next: progress
            };
        });

        return enhancedStats;
    } catch (e) {
        console.error("Runtime error in getUserGamificationStats:", e);
        return [];
    }
}
