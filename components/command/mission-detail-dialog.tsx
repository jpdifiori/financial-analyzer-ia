"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    Target,
    Check,
    Plus,
    Trash2,
    CheckCircle2,
    Calendar,
    Circle,
    Clock,
    AlertCircle,
    X
} from "lucide-react";
import { getTasks, updateTask, deleteTask, updateMission, deleteMission, createTask } from "@/app/actions/command";
import { CommandMission, CommandTask } from "@/types/command";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EditableInput } from "./editable-input";
import { CommandDatePicker } from "./command-date-picker";

interface MissionDetailDialogProps {
    mission: CommandMission;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}

export function MissionDetailDialog({ mission, open, onOpenChange, onUpdate }: MissionDetailDialogProps) {
    const [tasks, setTasks] = useState<CommandTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (open) {
            loadTasks();
        }
    }, [open, mission.id]);

    const loadTasks = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                const data = await getTasks(session.access_token, mission.user_id, undefined, mission.id);
                setTasks(data || []);
            }
        } catch (error) {
            console.error("Error loading mission tasks:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTaskStatusToggle = async (task: CommandTask) => {
        const newStatus = task.status === "done" ? "todo" : "done";

        // --- 1. Robust Optimistic Update ---
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

        // --- 2. UI Feedback ---
        if (newStatus === "done") {
            confetti({
                particleCount: 30,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#10b981', '#34d399', '#6ee7b7'],
                disableForReducedMotion: true
            });
            toast.success("Tarea completada");
        } else {
            toast("Tarea pendiente");
        }

        // --- 3. Database Sync ---
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error("No active session");
            }
            await updateTask(session.access_token, task.id, { status: newStatus });
        } catch (error) {
            console.error("Mission task status toggle error:", error);
            toast.error("Error al sincronizar estado");
            loadTasks(); // Robust rollback
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("¿Eliminar esta tarea?")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            await deleteTask(session.access_token, taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            toast.success("Tarea eliminada");
        } catch (error) {
            toast.error("Error al eliminar tarea");
        }
    };

    const handleDeleteMission = async () => {
        if (!confirm("¿Eliminar toda la misión y sus tareas?")) return;
        setIsUpdating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            await deleteMission(session.access_token, mission.id);
            toast.success("Misión eliminada");
            onOpenChange(false);
            onUpdate();
        } catch (error) {
            toast.error("Error al eliminar misión");
        } finally {
            setIsUpdating(false);
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
            loadTasks();
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
            loadTasks();
        }
    };

    const handleUpdateMissionName = async (newName: string) => {
        if (!newName.trim()) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            await updateMission(session.access_token, mission.id, { name: newName });
            toast.success("Nombre de misión actualizado");
            onUpdate();
        } catch (error) {
            toast.error("Error al actualizar nombre");
        }
    };

    const handleUpdateMissionObjective = async (newObjective: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            await updateMission(session.access_token, mission.id, { objective: newObjective });
            toast.success("Objetivo actualizado");
            onUpdate();
        } catch (error) {
            toast.error("Error al actualizar objetivo");
        }
    };

    const handleUpdateMissionDate = async (date: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            await updateMission(session.access_token, mission.id, { due_date: date ? new Date(date).toISOString() : null });
            toast.success("Fecha de misión actualizada");
            onUpdate();
        } catch (error) {
            toast.error("Error al actualizar fecha");
        }
    };

    const [newTaskTitle, setNewTaskTitle] = useState("");

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            setIsUpdating(true);
            const newTask = await createTask(session.access_token, {
                user_id: mission.user_id,
                mission_id: mission.id,
                title: newTaskTitle.trim(),
                description: "",
                status: "todo",
                priority: mission.priority,
                due_date: null,
                is_delegated: false,
            });

            setTasks(prev => [newTask, ...prev]);
            setNewTaskTitle("");
            toast.success("Tarea añadida");
        } catch (error) {
            toast.error("Error al añadir tarea");
        } finally {
            setIsUpdating(false);
        }
    };

    const sortedTasks = [...tasks].sort((a, b) => {
        // Sort by status first (todo before done)
        if (a.status !== b.status) {
            return a.status === "todo" ? -1 : 1;
        }

        // Then sort by date
        if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        // Fallback to creation order
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[850px] bg-slate-950 border-white/5 p-0 overflow-hidden rounded-2xl">
                <div className="relative h-48 bg-gradient-to-br from-indigo-900/50 to-slate-900 p-8 flex flex-col justify-end border-b border-white/5">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-white"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Target className="h-6 w-6 text-indigo-400" />
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 uppercase tracking-widest border border-indigo-500/30">
                                Misión
                            </span>
                        </div>
                        <EditableInput
                            initialValue={mission.name}
                            onSave={handleUpdateMissionName}
                            className="text-3xl font-bold text-white tracking-tight cursor-text"
                        />
                        {mission.objective !== undefined && (
                            <EditableInput
                                initialValue={mission.objective || ""}
                                onSave={handleUpdateMissionObjective}
                                placeholder="Añadir objetivo..."
                                className="text-sm text-slate-400 italic cursor-text"
                            />
                        )}
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 max-h-[70vh] overflow-y-auto">
                    {/* Left Column: Details & Stats */}
                    <div className="md:col-span-1 space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Detalles de Misión</h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 flex items-center gap-2">
                                        <Calendar className="h-3 w-3" /> Fecha Límite
                                    </label>
                                    <CommandDatePicker
                                        selected={mission.due_date ? new Date(mission.due_date) : null}
                                        onChange={(date) => handleUpdateMissionDate(date.toISOString())}
                                        className="w-full bg-white/5 border-white/10 text-slate-300 h-10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 flex items-center gap-2">
                                        <Clock className="h-3 w-3" /> Estado
                                    </label>
                                    <div className="text-sm text-slate-300 font-medium capitalize">
                                        {mission.status}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3" /> Prioridad
                                    </label>
                                    <div className={cn(
                                        "text-sm font-bold capitalize",
                                        mission.priority === "critical" ? "text-red-400" :
                                            mission.priority === "high" ? "text-orange-400" :
                                                mission.priority === "medium" ? "text-yellow-400" : "text-slate-400"
                                    )}>
                                        {mission.priority}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full bg-red-900/20 border border-red-900/30 text-red-400 hover:bg-red-900/40"
                                onClick={handleDeleteMission}
                                disabled={isUpdating}
                            >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar Misión"}
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Tasks Checklist */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-white/5">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Plan de Ejecución</h3>
                            <span className="text-[10px] font-mono text-slate-500">
                                {tasks.filter(t => t.status === "done").length}/{tasks.length} Completadas
                            </span>
                        </div>

                        {/* New Task Form */}
                        <form onSubmit={handleCreateTask} className="flex gap-2">
                            <Input
                                placeholder="Añadir nueva tarea..."
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="bg-white/[0.03] border-white/10 text-white text-sm flex-1 h-11"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={isUpdating || !newTaskTitle.trim()}
                                className="bg-white/10 hover:bg-white/20 text-white h-11 w-11"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </form>

                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500/50" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedTasks.map((task) => (
                                    <motion.div
                                        layout
                                        key={task.id}
                                        className={cn(
                                            "group flex flex-col p-4 rounded-xl border transition-all gap-3 relative overflow-hidden",
                                            task.status === "done"
                                                ? "bg-emerald-500/5 border-emerald-500/10 opacity-70"
                                                : "bg-white/[0.02] border-white/5"
                                        )}
                                    >
                                        {/* Dynamic Success Aura Blob */}
                                        <motion.div
                                            initial={false}
                                            animate={task.status === "done" ? {
                                                scale: [1, 2, 1.5],
                                                opacity: [0.03, 0.3, 0.1],
                                                filter: ["blur(20px)", "blur(35px)", "blur(28px)"],
                                                background: [
                                                    "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
                                                    "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)",
                                                    "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)"
                                                ]
                                            } : {
                                                scale: 1,
                                                opacity: 0.03,
                                                filter: "blur(20px)",
                                                background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)"
                                            }}
                                            transition={{
                                                duration: task.status === "done" ? 0.8 : 0.3,
                                                ease: "easeOut"
                                            }}
                                            className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full pointer-events-none z-0"
                                        />

                                        <div className="flex items-start justify-between gap-3 relative z-10">
                                            <div className="flex items-start gap-3 flex-1">
                                                <button
                                                    onClick={() => handleTaskStatusToggle(task)}
                                                    className={cn(
                                                        "mt-1 transition-colors",
                                                        task.status === "done" ? "text-emerald-500" : "text-slate-600 hover:text-white"
                                                    )}
                                                >
                                                    {task.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                                </button>

                                                <EditableInput
                                                    initialValue={task.title}
                                                    onSave={(val: string) => handleUpdateTaskTitle(task.id, val)}
                                                    className={cn(
                                                        "text-sm font-medium transition-all shadow-none",
                                                        task.status === "done" ? "line-through text-slate-500" : "text-slate-200"
                                                    )}
                                                />
                                            </div>

                                            <button
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4 pl-8">
                                            <div className="flex items-center gap-2">
                                                <CommandDatePicker
                                                    selected={task.due_date ? new Date(task.due_date) : null}
                                                    onChange={(date) => handleUpdateTaskDate(task.id, date.toISOString())}
                                                    className="bg-transparent border-0 h-auto p-0 hover:bg-transparent"
                                                />
                                            </div>
                                            {task.status !== "done" && (
                                                <span className="text-[10px] font-bold text-indigo-500/50 uppercase tracking-widest">
                                                    Ejecución
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}

                                {tasks.length === 0 && (
                                    <div className="text-center py-12 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                                        <p className="text-sm text-slate-600 italic">No hay tareas vinculadas. Te recomiendo usar el Asistente IA en el Inbox para generar un plan.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
