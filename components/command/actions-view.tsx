"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTasks, updateTask } from "@/app/actions/command";
import { CommandTask } from "@/types/command";
import { supabase } from "@/lib/supabase";
import { Loader2, Flame, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdvancedTaskDialog } from "./advanced-task-dialog";
import { Plus } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { EditableInput } from "./editable-input";
import { CommandDatePicker } from "./command-date-picker";

export function ActionsView() {
    const [tasks, setTasks] = useState<CommandTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (token) {
                    Promise.all([
                        getTasks(token, user.id, "todo"),
                        getTasks(token, user.id, "in_progress"),
                        getTasks(token, user.id, "done")
                    ]).then(([todos, inProgress, done]) => {
                        const allTasks = [...(todos || []), ...(inProgress || []), ...(done || [])];
                        // Solo mostrar tareas que NO pertenecen a una misión (Standalone Tasks)
                        setTasks(allTasks.filter(t => !t.mission_id));
                    }).finally(() => setIsLoading(false));
                }
            }
        });
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    const sortedTasks = [...tasks].sort((a, b) => {
        // First sort by status (todo/in_progress before done)
        if (a.status !== b.status) {
            if (a.status === "done") return 1;
            if (b.status === "done") return -1;
        }

        // Then sort by date (ascending)
        if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    const handleCompleteTask = async (task: CommandTask) => {
        const newStatus = task.status === "done" ? "todo" : "done";

        // --- 1. Robust Optimistic Update ---
        setTasks((prev) => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

        // --- 2. Elegant UI Feedback ---
        if (newStatus === "done") {
            confetti({
                particleCount: 40,
                spread: 70,
                origin: { y: 0.8 },
                colors: ['#10b981', '#34d399', '#6ee7b7'],
                disableForReducedMotion: true
            });
            toast.success("Tarea completada", { duration: 2000 });
        } else {
            toast("Tarea marcada como pendiente");
        }

        // --- 3. Database Sync ---
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error("No active session found");
            }

            await updateTask(session.access_token, task.id, { status: newStatus });
        } catch (error) {
            console.error("Task completion sync error:", error);
            toast.error("Error al sincronizar con la base de datos");
            // Rollback only on hard failure
            setTasks((prev) => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
        }
    };

    const handleUpdateTaskTitle = async (taskId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            // Optimistic update
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
            await updateTask(session.access_token, taskId, { title: newTitle });
            toast.success("Tarea actualizada");
        } catch (error) {
            toast.error("Error al actualizar tarea");
        }
    };

    const handleUpdateTaskDate = async (taskId: string, date: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            // Optimistic update
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: date ? new Date(date).toISOString() : null } : t));
            await updateTask(session.access_token, taskId, { due_date: date ? new Date(date).toISOString() : null });
        } catch (error) {
            toast.error("Error al actualizar fecha");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Flame className="h-6 w-6 text-orange-500" />
                <span className="text-xl font-bold text-white">Linea de Fuego!</span>
                <span className="text-sm font-medium text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md border border-white/5">
                    {tasks.length}
                </span>
            </div>

            {userId && (
                <div className="flex justify-end mb-4">
                    <AdvancedTaskDialog userId={userId} onTaskCreated={() => {
                        supabase.auth.getSession().then(({ data: { session } }) => {
                            if (session?.access_token) {
                                Promise.all([
                                    getTasks(session.access_token, userId, "todo"),
                                    getTasks(session.access_token, userId, "in_progress")
                                ]).then(([todos, inProgress]) => {
                                    setTasks([...(todos || []), ...(inProgress || [])]);
                                });
                            }
                        });
                    }} defaultStatus="todo">
                        <button className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-orange-500/20">
                            <Plus className="h-4 w-4" />
                            Nueva Tarea de Acción
                        </button>
                    </AdvancedTaskDialog>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                    {sortedTasks.map((task) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                            key={task.id}
                            className={cn(
                                "group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 p-4 rounded-xl flex items-center justify-between relative overflow-hidden transition-all duration-500",
                                task.status === "done" && "opacity-50 grayscale-[0.5] border-emerald-500/10 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                            )}
                        >
                            {/* Dynamic Success Aura Blob */}
                            <motion.div
                                initial={false}
                                animate={task.status === "done" ? {
                                    scale: [1, 2, 1.5],
                                    opacity: [0.05, 0.4, 0.15],
                                    filter: ["blur(24px)", "blur(40px)", "blur(32px)"],
                                    background: [
                                        "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
                                        "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)",
                                        "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)"
                                    ]
                                } : {
                                    scale: 1,
                                    opacity: 0.05,
                                    filter: "blur(24px)",
                                    background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)"
                                }}
                                transition={{
                                    duration: task.status === "done" ? 0.8 : 0.3,
                                    ease: "easeOut"
                                }}
                                className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full pointer-events-none z-0"
                            />

                            <div className="flex items-center gap-4 relative z-10 flex-1">
                                <div className={cn(
                                    "w-1 h-12 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all",
                                    task.status === "done" ? "bg-emerald-500 shadow-emerald-500/50" :
                                        task.priority === "critical" ? "bg-red-500 shadow-red-500/50" :
                                            task.priority === "high" ? "bg-orange-500 shadow-orange-500/50" :
                                                task.priority === "medium" ? "bg-amber-400 shadow-amber-400/50" : "bg-slate-500"
                                )} />
                                <div className="space-y-1 flex-1">
                                    <div className="relative">
                                        <EditableInput
                                            initialValue={task.title}
                                            onSave={(val: string) => handleUpdateTaskTitle(task.id, val)}
                                            className={cn(
                                                "text-slate-200 font-medium group-hover:text-white transition-all text-lg",
                                                task.status === "done" && "line-through text-slate-500 decoration-emerald-500/50"
                                            )}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                        <CommandDatePicker
                                            selected={task.due_date ? new Date(task.due_date) : null}
                                            onChange={(date) => handleUpdateTaskDate(task.id, date.toISOString())}
                                            className={cn(
                                                "bg-transparent border-0 h-auto p-0 hover:bg-transparent transition-colors",
                                                task.status === "done" && "text-emerald-500/50"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 relative z-10">
                                {task.status !== "done" && (
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border",
                                        task.priority === "critical" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                            task.priority === "high" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                                                "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                    )}>
                                        {task.priority}
                                    </span>
                                )}

                                <button
                                    onClick={() => handleCompleteTask(task)}
                                    className={cn(
                                        "group/check p-2 rounded-full transition-all hover:scale-110 active:scale-95",
                                        task.status === "done" ? "bg-emerald-500/20" : "hover:bg-emerald-500/20"
                                    )}
                                    title={task.status === "done" ? "Desmarcar" : "Marcar como completa"}
                                >
                                    <CheckCircle2 className={cn(
                                        "h-6 w-6 transition-colors",
                                        task.status === "done" ? "text-emerald-500" : "text-slate-600 group-hover/check:text-emerald-500"
                                    )} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        <p>No hay tareas en la línea de fuego.</p>
                        <p className="text-sm text-slate-600">Mueve tareas desde el Inbox para accionar.</p>
                    </div>
                )}
            </div>
        </div >
    );
}
