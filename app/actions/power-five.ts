"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface PowerFiveTask {
    id: string;
    user_id: string;
    slot_number: number;
    task_id?: string | null;
    custom_title?: string | null;
    status: 'pending' | 'completed';
    completed_at?: string | null;
    date: string;
    created_at: string;
    // Joined task
    task?: {
        id: string;
        title: string;
        status: string;
        mission_id?: string | null;
    };
}

/**
 * Gets the active 5 slots for a user.
 * Automatically handles the "maintenance" logic:
 * - Completed tasks from yesterday are ignored (slots become free).
 * - Pending tasks from yesterday persist (debt logic).
 */
export async function getActivePowerFive(accessToken: string, userId: string) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from("power_five_tasks")
            .select(`
                *,
                task:command_tasks(id, title, status, mission_id)
            `)
            .eq("user_id", userId)
            .or(`status.eq.pending,and(status.eq.completed,date.eq.${today})`)
            .order("slot_number", { ascending: true });

        if (error) {
            console.error("Error in getActivePowerFive:", error);
            // If table doesn't exist, we fail silently to empty state
            if (error.code === '42P01') return [];
            return [];
        }
        return data as PowerFiveTask[];
    } catch (e) {
        console.error("Runtime error in getActivePowerFive:", e);
        return [];
    }
}

/**
 * Adds a task to a specific slot.
 */
export async function addToPowerFive(
    accessToken: string,
    userId: string,
    slotNumber: number,
    taskId?: string,
    customTitle?: string
) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from("power_five_tasks")
            .insert({
                user_id: userId,
                slot_number: slotNumber,
                task_id: taskId || null,
                custom_title: customTitle || null,
                date: today,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            console.error("Detailed Error in addToPowerFive:", error);
            throw new Error(`Error DB: ${error.message} (${error.code}). Revisa que la tabla power_five_tasks exista.`);
        }
        revalidatePath("/");
        return data;
    } catch (e) {
        console.error("Runtime error in addToPowerFive:", e);
        throw e instanceof Error ? e : new Error("Ocurrió un error inesperado al añadir la tarea.");
    }
}

/**
 * Completes a task and awards XP.
 */
export async function completePowerFiveTask(accessToken: string, userId: string, slotId: string) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        // 1. Update task status
        const { data: slotTask, error: updateError } = await supabase
            .from("power_five_tasks")
            .update({
                status: 'completed',
                completed_at: now
            })
            .eq("id", slotId)
            .select()
            .single();

        if (updateError) {
            console.error("Error in completePowerFiveTask:", updateError);
            throw new Error(`Error DB: ${updateError.message} (${updateError.code})`);
        }

        // 2. If it was a linked task, update the source task in command_tasks
        if (slotTask.task_id) {
            await supabase
                .from("command_tasks")
                .update({ status: 'done' })
                .eq("id", slotTask.task_id);
        }

        // 3. Award XP (+100) to Discipline and Global domains
        await awardXP(supabase, userId, 100, 'power_five_completion', slotId, 'discipline');

        // 4. Check for Power Flush (+250)
        // Counting completed slots for TODAY
        const { count } = await supabase
            .from("power_five_tasks")
            .select('*', { count: 'exact', head: true })
            .eq("user_id", userId)
            .eq("date", today)
            .eq("status", "completed");

        let powerFlush = false;
        if (count === 5) {
            // Power Flush!
            await awardXP(supabase, userId, 250, 'power_flush', today, 'discipline');
            powerFlush = true;
        }

        revalidatePath("/");
        return { ...slotTask, powerFlush };
    } catch (e) {
        console.error("Runtime error in completePowerFiveTask:", e);
        throw e instanceof Error ? e : new Error("No se pudo completar la tarea.");
    }
}

/**
 * Removes a task from a slot (only if pending).
 */
export async function removeFromPowerFive(accessToken: string, slotId: string) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const { error } = await supabase
            .from("power_five_tasks")
            .delete()
            .eq("id", slotId)
            .eq("status", "pending");

        if (error) {
            console.error("Error in removeFromPowerFive:", error);
            throw new Error(`Error DB: ${error.message} (${error.code})`);
        }
        revalidatePath("/");
    } catch (e) {
        console.error("Runtime error in removeFromPowerFive:", e);
        throw e instanceof Error ? e : new Error("No se pudo eliminar la tarea.");
    }
}

/**
 * Internal helper to award XP and handle level ups for specific domains.
 */
async function awardXP(
    supabase: any,
    userId: string,
    amount: number,
    source: string,
    sourceId: string,
    domain: string = 'global'
) {
    // 1. Log XP (Audit)
    await supabase
        .from("user_xp_logs")
        .insert({
            user_id: userId,
            amount: amount,
            source_type: source,
            source_id: sourceId,
            metadata: { domain }
        });

    // 2. Update Specific Domain
    await updateDomainStats(supabase, userId, domain, amount);

    // 3. If not global, also feed the Global Domain (Aggregate)
    if (domain !== 'global') {
        await updateDomainStats(supabase, userId, 'global', amount);
    }
}

async function updateDomainStats(supabase: any, userId: string, domain: string, amount: number) {
    // 1. Get current stats for this domain
    const { data: stats } = await supabase
        .from("user_domain_stats")
        .select("total_xp, current_level")
        .eq("user_id", userId)
        .eq("domain", domain)
        .single();

    // If not exists, initialize
    const currentXP = stats?.total_xp || 0;
    const currentLevel = stats?.current_level || 1;
    const newTotalXP = currentXP + amount;

    // 2. Check for level up in this specific domain
    const { data: levelData } = await supabase
        .from("gamification_levels")
        .select("level")
        .eq("domain", domain)
        .lte("min_xp", newTotalXP)
        .order("min_xp", { ascending: false })
        .limit(1)
        .single();

    const updates: any = {
        total_xp: newTotalXP,
        updated_at: new Date().toISOString()
    };

    if (levelData && levelData.level > currentLevel) {
        updates.current_level = levelData.level;
    }

    // 3. Upsert stats
    const { error } = await supabase
        .from("user_domain_stats")
        .upsert({
            user_id: userId,
            domain: domain,
            ...updates
        }, { onConflict: 'user_id,domain' });

    if (error) console.error(`Error updating domain stats (${domain}):`, error);
}
