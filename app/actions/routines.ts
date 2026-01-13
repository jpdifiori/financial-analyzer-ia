"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize Supabase client factory
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function updateRoutineLog(
    accessToken: string,
    routineId: string,
    completedBlocks: string[],
    successPercentage: number,
    date: string
) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const userId = user.id;

    // Direct Upsert with client-provided state
    const { error } = await supabase.from("routine_logs").upsert(
        {
            routine_id: routineId,
            user_id: userId,
            completed_at: date,
            completed_blocks: completedBlocks,
            success_percentage: successPercentage,
        },
        { onConflict: "routine_id,completed_at" }
    );

    if (error) {
        console.error("Error updating routine log:", error);
        throw new Error("Failed to save progress: " + error.message);
    }

    revalidatePath(`/routines/${routineId}`);
    return { success: true };
}
