"use client";

import React, { useEffect, useState } from "react";
import { Plus, Loader2, Inbox, Zap, Sparkles, ArrowRight } from "lucide-react";
import { getTasks } from "@/app/actions/command";
import { CommandTask } from "@/types/command";
import { supabase } from "@/lib/supabase";
import { CreateTaskDialog } from "./create-task-dialog";
import { AdvancedTaskDialog } from "./advanced-task-dialog";
import { toast } from "sonner";

export function InboxView() {
    const [tasks, setTasks] = useState<CommandTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
                loadTasks(user.id);
            }
        });
    }, []);

    const loadTasks = async (uid: string) => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                const data = await getTasks(session.access_token, uid, "inbox");
                setTasks(data || []);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleMoveToAction = async (taskId: string) => {
        const { updateTask } = await import("@/app/actions/command");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("No authenticated session");

            await updateTask(session.access_token, taskId, { status: "todo" });
            toast.success("Movido a Accionar");
            if (userId) loadTasks(userId);
        } catch (error) {
            toast.error("Error al mover la tarea");
        }
    };

    if (isLoading && !userId) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">Inbox</span>
                    <span className="text-sm font-medium text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md border border-white/5">
                        {tasks.length}
                    </span>
                </div>
                {userId && (
                    <AdvancedTaskDialog userId={userId} onTaskCreated={() => loadTasks(userId)}>
                        <button className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-orange-500/20">
                            <Plus className="h-4 w-4" />
                            Crear Entrada
                        </button>
                    </AdvancedTaskDialog>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.map((task) => {
                    const priorityColor = {
                        low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                        medium: "bg-slate-500/10 text-slate-400 border-slate-500/20",
                        high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                        critical: "bg-red-500/10 text-red-400 border-red-500/20"
                    }[task.priority] || "bg-slate-500/10 text-slate-400";

                    return (
                        <AdvancedTaskDialog
                            key={task.id}
                            userId={userId!}
                            initialTask={task}
                            onTaskCreated={() => loadTasks(userId!)}
                        >
                            <div className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/10 p-5 rounded-2xl transition-all cursor-pointer relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent -mr-8 -mt-8 rounded-full blur-2xl group-hover:from-white/10 transition-colors pointer-events-none`} />

                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${priorityColor}`}>
                                        {task.priority}
                                    </span>
                                    {task.due_date && (
                                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                                            {new Date(task.due_date).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-slate-200 font-medium leading-relaxed group-hover:text-white transition-colors mb-4 line-clamp-2">
                                    {task.title}
                                </h3>

                                <div className="flex items-center gap-3 mt-auto pt-3 border-t border-white/5">
                                    {task.estimated_time && (
                                        <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded flex items-center gap-1">
                                            ⏱ {task.estimated_time < 60 ? `${task.estimated_time}m` : `${task.estimated_time / 60}h`}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-600 ml-auto flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-orange-500/50" />
                                        Asistente IA
                                    </span>
                                </div>

                                {/* Hover Action Overlay - Integrated with Dialog */}
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <div className="px-4 py-2 bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2">
                                        Ver con Asistente <ArrowRight className="h-3 w-3" />
                                    </div>
                                </div>
                            </div>
                        </AdvancedTaskDialog>
                    );
                })}

                {tasks.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        <Inbox className="h-12 w-12 mb-4 opacity-50" />
                        <p className="font-medium text-slate-300">No hay entradas en el Inbox.</p>
                        <p className="text-sm text-slate-600 mb-6">Comienza agregando lo que tienes en mente.</p>
                        {userId && (
                            <AdvancedTaskDialog userId={userId} onTaskCreated={() => loadTasks(userId)}>
                                <button className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 hover:scale-105">
                                    <Plus className="h-4 w-4" />
                                    Crear Primera Entrada
                                </button>
                            </AdvancedTaskDialog>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
