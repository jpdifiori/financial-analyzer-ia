"use server";

import { createClient } from "@supabase/supabase-js";
import { CommandTask, CommandMission, CommandTaskStatus } from "@/types/command";
import { revalidatePath } from "next/cache";

// Initialize Supabase client for server actions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// --- Missions ---

// --- Missions ---

export async function getMissions(accessToken: string, userId: string) {
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const { data, error } = await supabaseWithAuth
            .from("command_missions")
            .select("*")
            .eq("user_id", userId)
            .neq("status", "archived")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error in getMissions:", error);
            return [];
        }
        return data as CommandMission[];
    } catch (e) {
        console.error("Runtime error in getMissions:", e);
        return [];
    }
}

export async function createMission(accessToken: string, mission: Omit<CommandMission, "id" | "created_at">) {
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const { data, error } = await supabaseWithAuth
            .from("command_missions")
            .insert(mission)
            .select()
            .single();

        if (error) throw new Error(error.message || "No se pudo crear la misión");
        revalidatePath("/command");
        return data as CommandMission;
    } catch (e) {
        console.error("Error in createMission:", e);
        throw e instanceof Error ? e : new Error("Error inesperado al crear misión");
    }
}

export async function updateMission(accessToken: string, id: string, updates: Partial<CommandMission>) {
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const { data, error } = await supabaseWithAuth
            .from("command_missions")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(error.message || "No se pudo actualizar la misión");
        revalidatePath("/command");
        return data as CommandMission;
    } catch (e) {
        console.error("Error in updateMission:", e);
        throw e instanceof Error ? e : new Error("Error inesperado al actualizar misión");
    }
}

export async function deleteMission(accessToken: string, id: string) {
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const { error } = await supabaseWithAuth
            .from("command_missions")
            .delete()
            .eq("id", id);

        if (error) throw new Error(error.message || "No se pudo eliminar la misión");
        revalidatePath("/command");
    } catch (e) {
        console.error("Error in deleteMission:", e);
        throw e instanceof Error ? e : new Error("Error inesperado al eliminar misión");
    }
}

// --- Tasks ---

export async function getTasks(accessToken: string, userId: string, status?: CommandTaskStatus, missionId?: string) {
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        let query = supabaseWithAuth
            .from("command_tasks")
            .select(`
                *,
                mission:command_missions(id, name)
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (status) {
            query = query.eq("status", status);
        }

        if (missionId) {
            query = query.eq("mission_id", missionId);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error in getTasks:", error);
            return [];
        }
        return data as CommandTask[];
    } catch (e) {
        console.error("Runtime error in getTasks:", e);
        return [];
    }
}

export async function createTask(accessToken: string, task: Omit<CommandTask, "id" | "created_at">) {
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const { data, error } = await supabaseWithAuth
            .from("command_tasks")
            .insert(task)
            .select()
            .single();

        if (error) throw new Error(error.message || "No se pudo crear la tarea");
        revalidatePath("/command");
        return data as CommandTask;
    } catch (e) {
        console.error("Error in createTask:", e);
        throw e instanceof Error ? e : new Error("Error inesperado al crear tarea");
    }
}

export async function updateTask(accessToken: string, id: string, updates: Partial<CommandTask>) {
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const { data, error } = await supabaseWithAuth
            .from("command_tasks")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(error.message || "No se pudo actualizar la tarea");
        revalidatePath("/command");
        return data as CommandTask;
    } catch (e) {
        console.error("Error in updateTask:", e);
        throw e instanceof Error ? e : new Error("Error inesperado al actualizar tarea");
    }
}

export async function deleteTask(accessToken: string, id: string) {
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    try {
        const { error } = await supabaseWithAuth
            .from("command_tasks")
            .delete()
            .eq("id", id);

        if (error) throw new Error(error.message || "No se pudo eliminar la tarea");
        revalidatePath("/command");
    } catch (e) {
        console.error("Error in deleteTask:", e);
        throw e instanceof Error ? e : new Error("Error inesperado al eliminar tarea");
    }
}
