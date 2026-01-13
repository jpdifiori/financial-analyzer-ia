"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { createTask, createMission, updateTask } from "@/app/actions/command";
import { analyzeTask, AIAnalysisResult } from "@/app/actions/ai-command";
import { toast } from "sonner";
import { CommandPriority, CommandTaskStatus, CommandTask } from "@/types/command";
import { AlertCircle, Calendar as CalendarIcon, Clock, Sparkles, ArrowRight, Check, X, AlertTriangle, Zap, Target, Users, CheckCircle2 } from "lucide-react";
import { CommandDatePicker } from "./command-date-picker";

interface AdvancedTaskDialogProps {
    userId: string;
    onTaskCreated?: () => void;
    children?: React.ReactNode;
    defaultStatus?: CommandTaskStatus;
    initialTask?: CommandTask; // If editing/analyzing existing
}

export function AdvancedTaskDialog({ userId, onTaskCreated, children, defaultStatus = "inbox", initialTask }: AdvancedTaskDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

    // Fields
    const [priority, setPriority] = useState<CommandPriority>(initialTask?.priority || "medium");
    const [dueDate, setDueDate] = useState(initialTask?.due_date ? new Date(initialTask.due_date).toISOString().split('T')[0] : "");
    const [estimatedTime, setEstimatedTime] = useState(initialTask?.estimated_time || 0);
    const [description, setDescription] = useState(initialTask?.description || "");

    const handleAnalyze = async () => {
        if (!description.trim()) {
            toast.error("Ingrese una descripción para analizar");
            return;
        }
        setIsAnalyzing(true);
        try {
            const lines = description.trim().split("\n");
            const title = lines[0];
            const details = description;
            const result = await analyzeTask(title, details);
            setAiResult(result);
            if (result.priority) setPriority(result.priority);
            if (result.estimatedTime) setEstimatedTime(result.estimatedTime);
            toast.success("Análisis completado");
        } catch (error) {
            toast.error("Error al analizar con IA");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAction = async (targetCategory: "action" | "mission" | "delegate") => {
        setIsLoading(true);
        try {
            const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
            if (!session?.access_token) throw new Error("No authenticated session found");

            const lines = description.trim().split("\n");
            const title = lines[0].substring(0, 100);

            if (targetCategory === "mission") {
                const mission = await createMission(session.access_token, {
                    user_id: userId,
                    name: title,
                    objective: description, // Keep original description as objective
                    status: "active",
                    priority: priority,
                    due_date: dueDate ? new Date(dueDate).toISOString() : null,
                });

                // Create subtasks if suggested
                if (aiResult?.suggestedSubtasks && aiResult.suggestedSubtasks.length > 0) {
                    await Promise.all(aiResult.suggestedSubtasks.map(subtaskTitle =>
                        createTask(session.access_token, {
                            user_id: userId,
                            mission_id: mission.id,
                            title: subtaskTitle,
                            description: `Tarea sugerida por IA para la misión: ${mission.name}`,
                            status: "todo",
                            priority: priority,
                            due_date: null,
                            is_delegated: false,
                        })
                    ));
                }

                // If it was an existing task, mark as done
                if (initialTask) {
                    await updateTask(session.access_token, initialTask.id, { status: "done" });
                }
                toast.success("Misión y subtareas creadas correctamente");
            } else if (targetCategory === "delegate") {
                await createTask(session.access_token, {
                    user_id: userId,
                    title: title,
                    description: description,
                    status: "todo",
                    priority: priority,
                    due_date: dueDate ? new Date(dueDate).toISOString() : null,
                    estimated_time: estimatedTime > 0 ? estimatedTime : null,
                    is_delegated: true,
                });
                if (initialTask) {
                    await updateTask(session.access_token, initialTask.id, { status: "done" });
                }
                toast.success("Tarea delegada");
            } else {
                // Action (Todo)
                if (initialTask) {
                    await updateTask(session.access_token, initialTask.id, {
                        status: "todo",
                        priority,
                        due_date: dueDate ? new Date(dueDate).toISOString() : null,
                        estimated_time: estimatedTime > 0 ? estimatedTime : null,
                    });
                } else {
                    await createTask(session.access_token, {
                        user_id: userId,
                        title: title,
                        description: description,
                        status: "todo",
                        priority: priority,
                        due_date: dueDate ? new Date(dueDate).toISOString() : null,
                        estimated_time: estimatedTime > 0 ? estimatedTime : null,
                        is_delegated: false,
                    });
                }
                toast.success("Tarea movida a Accionar");
            }

            setOpen(false);
            resetForm();
            onTaskCreated?.();
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setDescription("");
        setPriority("medium");
        setDueDate("");
        setEstimatedTime(0);
        setAiResult(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        setIsLoading(true);
        try {
            const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
            if (!session?.access_token) throw new Error("No authenticated session found");

            const lines = description.trim().split("\n");
            const title = lines[0];

            if (initialTask) {
                await updateTask(session.access_token, initialTask.id, {
                    description: description,
                    priority: priority,
                    due_date: dueDate ? new Date(dueDate).toISOString() : null,
                    estimated_time: estimatedTime > 0 ? estimatedTime : null,
                });
                toast.success("Tarea actualizada");
            } else {
                await createTask(session.access_token, {
                    user_id: userId,
                    title: title.substring(0, 100) + (title.length > 100 ? "..." : ""),
                    description: description,
                    status: defaultStatus,
                    priority: priority,
                    due_date: dueDate ? new Date(dueDate).toISOString() : null,
                    estimated_time: estimatedTime > 0 ? estimatedTime : null,
                    is_delegated: false,
                });
                toast.success("Tarea creada");
            }
            setOpen(false);
            resetForm();
            onTaskCreated?.();
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold">
                        <Plus className="mr-2 h-4 w-4" /> Nueva Tarea
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-white text-slate-900 p-0 overflow-hidden gap-0 rounded-xl">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <DialogTitle className="text-lg font-bold">Gestión de tareas</DialogTitle>
                    {/* Close button is auto-added by DialogContentUsually, but we can custom if needed. 
                        The image shows a custom close. Shadcn handles this. */}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Meta Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as CommandPriority)}
                                className="w-full h-12 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                    <CalendarIcon className="h-3 w-3" /> Fecha Límite
                                </label>
                                <CommandDatePicker
                                    selected={dueDate ? new Date(dueDate) : null}
                                    onChange={(date) => setDueDate(date.toISOString().split('T')[0])}
                                    className="w-full bg-white/5 border-white/10 text-white h-11"
                                />
                            </div>
                        </div>
                        <div className="relative">
                            <select
                                value={estimatedTime}
                                onChange={(e) => setEstimatedTime(Number(e.target.value))}
                                className="w-full h-12 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                            >
                                <option value="0">Tiempo Est. (Opcional)</option>
                                <option value="30">30 min</option>
                                <option value="60">1 Hora</option>
                                <option value="120">2 Horas</option>
                                <option value="180">3 Horas</option>
                                <option value="240">4 Horas</option>
                                <option value="480">8 Horas</option>
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Description Area */}
                    <div className="space-y-2">
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <Textarea
                                placeholder="Ingrese la descripción de la tarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-transparent border-0 focus-visible:ring-0 min-h-[150px] text-slate-900 p-4 text-base resize-none"
                            />
                        </div>
                    </div>

                    {/* AI Analysis Section */}
                    {aiResult && (
                        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Sparkles className="h-5 w-5 text-orange-600" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-orange-900 flex items-center gap-2">
                                        Recomendación de IA:
                                        <span className="uppercase text-[10px] bg-orange-200 px-2 py-0.5 rounded-full">
                                            {aiResult.category === "action" ? "Acción Rápida" :
                                                aiResult.category === "mission" ? "Mini Proyecto" : "Delegar"}
                                        </span>
                                    </h4>
                                    <p className="text-sm text-orange-800 leading-relaxed">
                                        {aiResult.rationale}
                                    </p>
                                </div>
                            </div>

                            {aiResult.suggestedSubtasks && aiResult.suggestedSubtasks.length > 0 && (
                                <div className="pl-12 space-y-2">
                                    <p className="text-xs font-bold text-orange-900/60 uppercase tracking-wider">Subtareas sugeridas:</p>
                                    <ul className="text-sm text-orange-800 space-y-1">
                                        {aiResult.suggestedSubtasks.map((sub, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <div className="w-1 h-1 bg-orange-300 rounded-full" />
                                                {sub}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3 pt-2">
                                <Button
                                    type="button"
                                    onClick={() => handleAction("action")}
                                    className="bg-white border-emerald-100 text-emerald-700 hover:bg-emerald-50 border-2 font-bold h-11"
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Accionar
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleAction("mission")}
                                    className="bg-white border-blue-100 text-blue-700 hover:bg-blue-50 border-2 font-bold h-11"
                                >
                                    <Target className="mr-2 h-4 w-4" /> Misión
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleAction("delegate")}
                                    className="bg-white border-amber-100 text-amber-700 hover:bg-amber-50 border-2 font-bold h-11"
                                >
                                    <Users className="mr-2 h-4 w-4" /> Delegar
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            Cancelar
                        </Button>

                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !description.trim()}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" /> Analizar con IA
                                    </>
                                )}
                            </Button>

                            <Button
                                type="submit"
                                disabled={isLoading || !description.trim()}
                                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 shadow-lg shadow-orange-500/20"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" /> {initialTask ? "Guardar" : "Crear"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    );
}
