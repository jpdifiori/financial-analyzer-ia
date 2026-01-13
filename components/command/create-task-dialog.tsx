"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Assuming exists
import { Loader2, Plus } from "lucide-react";
import { createTask } from "@/app/actions/command";
import { supabase } from "@/lib/supabase";

import { toast } from "sonner";

interface CreateTaskDialogProps {
    userId: string;
    onTaskCreated?: () => void;
    children?: React.ReactNode;
}

export function CreateTaskDialog({ userId, onTaskCreated, children }: CreateTaskDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("Debes iniciar sesión");
                return;
            }

            await createTask(session.access_token, {
                user_id: userId,
                title,
                description,
                status: "inbox",
                priority: "medium",
                is_delegated: false,
            });
            toast.success("Entrada creada");
            setOpen(false);
            setTitle("");
            setDescription("");
            onTaskCreated?.();
        } catch (error) {
            console.error("Error creating task:", error);
            toast.error("Error al crear la entrada");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="default" className="bg-orange-600 hover:bg-orange-500">
                        <Plus className="mr-2 h-4 w-4" /> Crear Entrada
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-slate-950 border-white/10 text-slate-100">
                <DialogHeader>
                    <DialogTitle>Nueva Entrada</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="¿Qué tienes en mente?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-slate-900/50 border-white/10 focus-visible:ring-orange-500"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Textarea
                            placeholder="Detalles adicionales (opcional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-slate-900/50 border-white/10 min-h-[100px] focus-visible:ring-orange-500 resize-none"
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading || !title.trim()}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-bold"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                                </>
                            ) : (
                                "Guardar en Inbox"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
