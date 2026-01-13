"use client";

import { useState, useEffect } from "react";
import { Milestone } from "@/types/challenges";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Flag, Hash, Info, Save, X, MessageSquare, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MilestoneDetailsModalProps {
    milestone: Milestone | null;
    open: boolean;
    onClose: () => void;
    onUpdate: (updated: Milestone) => void;
}

export function MilestoneDetailsModal({ milestone, open, onClose, onUpdate }: MilestoneDetailsModalProps) {
    const [edited, setEdited] = useState<Milestone | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (milestone) setEdited(milestone);
    }, [milestone]);

    if (!edited) return null;

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await supabase
            .from("challenge_roadmap")
            .update({
                title: edited.title,
                description: edited.description,
                target_date: edited.targetDate,
                priority: edited.priority,
                status: edited.status,
                notes: edited.notes,
                completed: edited.status === "completed"
            })
            .eq("id", edited.id);

        if (!error) {
            onUpdate({ ...edited, completed: edited.status === "completed" });
            onClose();
        }
        setIsSaving(false);
    };

    const priorities = [
        { value: "low", label: "Baja", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
        { value: "medium", label: "Media", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
        { value: "high", label: "Alta", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
        { value: "critical", label: "Crítica", color: "bg-red-500/10 text-red-500 border-red-500/40" }
    ];

    const statuses = [
        { value: "pending", label: "Pendiente" },
        { value: "in_progress", label: "En Progreso" },
        { value: "completed", label: "Completado" },
        { value: "cancelled", label: "Cancelado" }
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white p-0 overflow-hidden rounded-[32px]">
                <DialogHeader className="p-8 pb-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-8 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                            <Flag className="h-4 w-4 text-indigo-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Detalles del Hito</span>
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight leading-none mb-6">
                        <input
                            value={edited.title}
                            onChange={(e) => setEdited({ ...edited, title: e.target.value })}
                            className="bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-slate-800"
                        />
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 pt-0 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {/* Grid de Atributos */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <Calendar className="h-3 w-3" /> Fecha Estimada
                            </label>
                            <input
                                type="date"
                                value={edited.targetDate || ""}
                                onChange={(e) => setEdited({ ...edited, targetDate: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <Flag className="h-3 w-3" /> Prioridad
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {priorities.map((p) => (
                                    <button
                                        key={p.value}
                                        onClick={() => setEdited({ ...edited, priority: p.value as any })}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${edited.priority === p.value ? p.color : "bg-slate-900 border-slate-800 text-slate-500"
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <AlertCircle className="h-3 w-3" /> Estado Actual
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {statuses.map((s) => (
                                <button
                                    key={s.value}
                                    onClick={() => setEdited({ ...edited, status: s.value as any })}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${edited.status === s.value
                                            ? "bg-white text-slate-950 border-white"
                                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <Info className="h-3 w-3" /> Descripción
                        </label>
                        <textarea
                            value={edited.description || ""}
                            onChange={(e) => setEdited({ ...edited, description: e.target.value })}
                            placeholder="¿Qué significa este hito para tu reto?"
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-colors resize-none placeholder:text-slate-700"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <MessageSquare className="h-3 w-3" /> Notas Adicionales
                        </label>
                        <textarea
                            value={edited.notes || ""}
                            onChange={(e) => setEdited({ ...edited, notes: e.target.value })}
                            placeholder="Observaciones, obstáculos o aprendizajes..."
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-colors resize-none placeholder:text-slate-700"
                        />
                    </div>
                </div>

                <div className="p-8 bg-slate-900/50 border-t border-slate-800 flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 hover:bg-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 bg-white hover:bg-slate-200 text-slate-950 font-black uppercase tracking-widest text-[10px] rounded-xl h-12 shadow-lg shadow-white/5"
                    >
                        {isSaving ? "Guardando..." : "Guardar Hito"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
