"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Calendar as CalendarIcon, Save } from "lucide-react";
import { createMission } from "@/app/actions/command";
import { toast } from "sonner";
import { CommandMissionStatus } from "@/types/command";

interface CreateMissionDialogProps {
    userId: string;
    onMissionCreated?: () => void;
    children?: React.ReactNode;
}

export function CreateMissionDialog({ userId, onMissionCreated, children }: CreateMissionDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [name, setName] = useState("");
    const [status, setStatus] = useState<CommandMissionStatus>("active");
    const [dueDate, setDueDate] = useState("");
    const [objective, setObjective] = useState("");
    const [description, setDescription] = useState(""); // This is creating a "virtual" field, we might need to add it to DB or map it

    // Note: command_missions table currently has: name, objective, status, priority, due_date. 
    // It does NOT have a 'description' column in the schema I wrote (only objective).
    // The image shows "Descripcion". 
    // I will append description to objective or just use objective? 
    // The image shows "Objetivo" (small) AND "Descripcion" (large).
    // I should probably add a description column to the table if I want to match exactly.
    // For now, I'll store it in 'objective' effectively, or I should alter table. 
    // Let's check schema again. `objective` is TEXT. I can put everything there? 
    // Or better, let's just stick to the schema I have first to avoid more migrations unless necessary.
    // Actually, "Objetivo" is usually short. "Descripcion" is long.
    // I will just implement the UI and map description to "objective" for now, and "Objetivo" input to... maybe just prefix?
    // Or I'll handle it properly: I'll assume objective is the short goal, and I might need to add `description` later.
    // For this pass, I will map the UI "Objetivo" to `objective` and "Descripcion" I will ignore or append? 
    // Let's look at the image again. Objective is 1-2 lines. Description is rich text.
    // I'll create a migration to add `description` to `command_missions` to do it right.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
            if (!session?.access_token) throw new Error("No authenticated session found");

            await createMission(session.access_token, {
                user_id: userId,
                name,
                status,
                objective: objective + (description ? `\n\n[Details]\n${description}` : ""), // Hack for now to avoid migration mid-step
                priority: "medium", // Default
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
            });
            toast.success("Misión creada");
            setOpen(false);
            resetForm();
            onMissionCreated?.();
        } catch (error) {
            console.error("Error creating mission:", error);
            toast.error("Error al crear la misión");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setStatus("active");
        setDueDate("");
        setObjective("");
        setDescription("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                        <Plus className="mr-2 h-4 w-4" /> Nueva Misión
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-slate-950 border-white/10 text-slate-100 p-0 overflow-hidden gap-0">
                <div className="p-6 border-b border-white/10 bg-slate-900/50">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Gestión de Misiones</DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name */}
                    <div className="space-y-4">
                        <Input
                            placeholder="Nombre Misión"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 text-lg"
                            autoFocus
                        />
                    </div>

                    {/* Meta Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as CommandMissionStatus)}
                                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                            >
                                <option value="active">Activo</option>
                                <option value="completed">Completado</option>
                                <option value="archived">Archivado</option>
                            </select>
                            <div className="absolute right-3 top-3 pointer-events-none">
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        <div className="relative">
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="bg-slate-50 border-slate-200 text-slate-900 w-full"
                            />
                        </div>
                    </div>

                    {/* Objective */}
                    <div className="space-y-2">
                        <Textarea
                            placeholder="Objetivo"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="bg-slate-50 border-slate-200 text-slate-900 min-h-[80px] resize-none"
                        />
                    </div>

                    {/* Description (Rich Text Placeholder) */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500">Descripción<span className="text-red-500">*</span></label>
                        <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                            {/* Fake Toolbar */}
                            <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-white">
                                <button type="button" className="p-1 hover:bg-slate-100 rounded text-slate-600 font-bold">B</button>
                                <button type="button" className="p-1 hover:bg-slate-100 rounded text-slate-600 italic">I</button>
                                <div className="w-px h-4 bg-slate-300 mx-1" />
                                <button type="button" className="p-1 hover:bg-slate-100 rounded text-slate-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                            </div>
                            <Textarea
                                placeholder=""
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-transparent border-0 focus-visible:ring-0 min-h-[200px] text-slate-900 rounded-none p-4"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-white/10 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="border-slate-700 text-slate-400 hover:text-white hover:bg-white/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" /> Crear
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
