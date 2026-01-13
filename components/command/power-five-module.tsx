"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    CheckCircle2,
    Circle,
    Zap,
    Target,
    Sparkles,
    Loader2,
    Trophy,
    Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
    getActivePowerFive,
    addToPowerFive,
    completePowerFiveTask,
    removeFromPowerFive,
    PowerFiveTask
} from "@/app/actions/power-five";
import { supabase } from "@/lib/supabase";
import { BentoCard } from "@/components/bento-dashboard";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTasks } from "@/app/actions/command";
import { CommandTask } from "@/types/command";

const MOTTO_PHRASES = [
    "La disciplina es libertad. Haz lo difícil hoy.",
    "No te detengas cuando estés cansado, detente cuando hayas terminado.",
    "Somos lo que hacemos repetidamente. La excelencia es un hábito.",
    "El dolor es temporal. El orgullo de la conquista es eterno.",
    "Vence a tu mente, o ella te vencerá a ti.",
    "La victoria ama la preparación. Ejecuta con precisión.",
    "Aquellos que sudan más en la paz, sangran menos en la guerra.",
    "La forja es dura, pero el acero es eterno.",
    "Tu comodidad es el enemigo de tu grandeza.",
    "Solo los que se atreven a fallar en grande logran victorias eternas."
];

export function PowerFiveModule() {
    const [slots, setSlots] = useState<PowerFiveTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [bloomTrigger, setBloomTrigger] = useState(false);
    const [motto, setMotto] = useState("");

    useEffect(() => {
        setMotto(MOTTO_PHRASES[Math.floor(Math.random() * MOTTO_PHRASES.length)]);
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
                loadSlots(user.id);
            }
        });
    }, []);

    const loadSlots = async (uid: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                const data = await getActivePowerFive(session.access_token, uid);
                setSlots(data);
            }
        } catch (error) {
            console.error("Error loading Power Five:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = async (slotId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token || !userId) return;

            // Trigger Bloom Pulse
            setBloomTrigger(true);
            setTimeout(() => setBloomTrigger(false), 1000);

            // Trigger Particles
            const rect = document.getElementById(`slot-${slotId}`)?.getBoundingClientRect();
            if (rect) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: {
                        x: (rect.left + rect.width / 2) / window.innerWidth,
                        y: (rect.top + rect.height / 2) / window.innerHeight
                    },
                    colors: ['#f97316', '#fbbf24', '#ffffff'],
                    ticks: 200,
                    gravity: 1.2,
                    scalar: 1.2,
                    shapes: ['circle', 'square']
                });
            }

            const result = await completePowerFiveTask(session.access_token, userId, slotId);

            if (result.powerFlush) {
                toast.success("¡POWER FLUSH! +250 XP Extra", {
                    icon: <Sparkles className="text-amber-400" />,
                    duration: 5000
                });
                // Big celebration
                confetti({
                    particleCount: 300,
                    spread: 160,
                    origin: { y: 0.6 }
                });
            } else {
                toast.success("+100 XP - ¡Poder Absoluto!");
            }

            loadSlots(userId);
        } catch (error) {
            toast.error("Error al completar tarea");
        }
    };

    if (isLoading) {
        return (
            <BentoCard className="col-span-full md:col-span-2 h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </BentoCard>
        );
    }

    return (
        <BentoCard className="col-span-full md:row-span-2 p-8 relative group">
            {/* Global Bloom Pulse Overlay */}
            <AnimatePresence>
                {bloomTrigger && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.4, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 pointer-events-none bg-radial-gradient from-orange-500/40 via-transparent to-transparent blur-3xl"
                    />
                )}
            </AnimatePresence>

            {/* Main Header Container */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 relative z-10">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-gradient-to-tr from-orange-600 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-600/30 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                            <Zap className="h-7 w-7 text-white fill-white animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">The Power 5</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Motor de Ejecución</span>
                            </div>
                        </div>
                    </div>
                    {/* Motivational Battlefield Motto */}
                    <p className="text-sm font-medium text-slate-400 italic font-serif pl-3 border-l-2 border-orange-600/50 max-w-lg">
                        "{motto}"
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 self-start md:self-end">
                    <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">Estatus:</span>
                    <span className="text-sm font-black text-orange-500">
                        {slots.filter(s => s.status === 'completed').length} / 5
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 relative z-10">
                {[1, 2, 3, 4, 5].map((num) => {
                    const slot = slots.find(s => s.slot_number === num);
                    return (
                        <PowerFiveSlot
                            key={num}
                            slotNumber={num}
                            slot={slot}
                            onComplete={(id: string) => handleComplete(id)}
                            assignedTaskIds={slots.filter(s => s.task_id).map(s => s.task_id!)}
                            onAdd={async (taskId?: string, title?: string) => {
                                if (userId) {
                                    try {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        if (session?.access_token) {
                                            await addToPowerFive(session.access_token, userId, num, taskId, title);
                                            await loadSlots(userId);
                                            toast.success("Misión asignada al slot de poder");
                                        }
                                    } catch (err: any) {
                                        console.error("Error adding to Power Five:", err);
                                        toast.error(err.message || "Error al asignar la tarea");
                                    }
                                }
                            }}
                        />
                    );
                })}
            </div>

            {/* Background Aesthetic */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full group-hover:bg-orange-600/20 transition-all duration-1000" />
        </BentoCard >
    );
}

function PowerFiveSlot({ slotNumber, slot, onComplete, onAdd, assignedTaskIds }: any) {
    const isCompleted = slot?.status === 'completed';

    return (
        <motion.div
            id={`slot-${slot?.id || slotNumber}`}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: slotNumber * 0.1 }}
            className={cn(
                "glass-card h-[250px] p-3 flex flex-col items-center justify-between text-center transition-all duration-700 relative overflow-hidden",
                isCompleted
                    ? "bg-orange-500/[0.08] border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.15)]"
                    : "hover:bg-white/[0.05]"
            )}
        >
            {/* Background Number */}
            <span className="absolute inset-0 flex items-center justify-center text-[160px] font-black text-white/[0.02] pointer-events-none select-none">
                {slotNumber}
            </span>

            <div className="w-full space-y-4 relative z-10">
                {!slot ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all group/btn">
                                    <Plus className="h-7 w-7 text-slate-600 group-hover/btn:text-orange-500 transition-colors" />
                                </button>
                            </DialogTrigger>
                            <AddTaskSelector assignedTaskIds={assignedTaskIds} onSelect={(taskId, title) => onAdd(taskId, title)} />
                        </Dialog>
                        <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase">Sin Slot</span>
                    </div>
                ) : (
                    <div className="space-y-4 py-4 w-full h-full flex flex-col justify-between">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase">
                                {slot.task_id ? "Importado" : "Tarea Única"}
                            </span>
                            <h4 className={cn(
                                "text-base font-serif leading-tight line-clamp-3",
                                isCompleted ? "text-slate-500 line-through" : "text-white"
                            )}>
                                {slot.task?.title || slot.custom_title}
                            </h4>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9, x: [-2, 2, -1, 1, 0] }}
                                onClick={() => !isCompleted && onComplete(slot.id)}
                                disabled={isCompleted}
                                className={cn(
                                    "p-3 rounded-full transition-all duration-500",
                                    isCompleted
                                        ? "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                                        : "bg-white/5 border border-white/10 text-slate-600 hover:text-orange-500"
                                )}
                            >
                                {isCompleted ? <CheckCircle2 className="h-7 w-7" /> : <Circle className="h-7 w-7" />}
                            </motion.button>
                            {isCompleted && (
                                <motion.span
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[10px] font-black text-orange-400 tracking-tighter"
                                >
                                    +100 XP POWER
                                </motion.span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function AddTaskSelector({ onSelect, assignedTaskIds }: { onSelect: (taskId?: string, title?: string) => void, assignedTaskIds: string[] }) {
    const [tab, setTab] = useState<'import' | 'custom'>('import');
    const [tasks, setTasks] = useState<CommandTask[]>([]);
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (tab === 'import') {
            loadTasks();
        }
    }, [tab]);

    const loadTasks = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: { session } } = await supabase.auth.getSession();
            if (user && session?.access_token) {
                // Get Accionar and Mission tasks
                const result = await getTasks(session.access_token, user.id);
                // Only show todo/in_progress tasks
                setTasks(result.filter(t => t.status === 'todo' || t.status === 'in_progress'));
            }
        } catch (e) {
            console.error("Error loading tasks for selector:", e);
            setTasks([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogContent className="max-w-md bg-slate-950/90 backdrop-blur-2xl border-white/10 rounded-[32px]">
            <DialogHeader>
                <DialogTitle className="text-xl font-black text-white italic">Asignar Slot de Poder</DialogTitle>
            </DialogHeader>

            <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 mb-6">
                <button
                    onClick={() => setTab('import')}
                    className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                        tab === 'import' ? "bg-orange-600 text-white shadow-lg" : "text-slate-500 hover:text-white"
                    )}
                >
                    Importar Tarea
                </button>
                <button
                    onClick={() => setTab('custom')}
                    className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                        tab === 'custom' ? "bg-orange-600 text-white shadow-lg" : "text-slate-500 hover:text-white"
                    )}
                >
                    Tarea Única
                </button>
            </div>

            {tab === 'import' ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
                    ) : tasks.filter(t => !assignedTaskIds.includes(t.id)).map(task => (
                        <button
                            key={task.id}
                            onClick={() => onSelect(task.id, undefined)}
                            className="w-full flex items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-orange-500/5 hover:border-orange-500/20 transition-all text-left group"
                        >
                            {task.mission_id ? <Target className="h-4 w-4 text-indigo-400 mt-1" /> : <Zap className="h-4 w-4 text-orange-400 mt-1" />}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">{task.title}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                    {task.mission?.name || 'Accionable'}
                                </p>
                            </div>
                        </button>
                    ))}
                    {tasks.filter(t => !assignedTaskIds.includes(t.id)).length === 0 && !isLoading && (
                        <div className="text-center py-8">
                            <p className="text-xs text-slate-600 italic">No hay más tareas disponibles para asignar.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">¿Qué vas a conquistar hoy?</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Escribe el nombre de la tarea..."
                            className="bg-white/5 border-white/10 rounded-xl text-white placeholder:text-slate-700 h-12"
                        />
                    </div>
                    <Button
                        onClick={() => title && onSelect(undefined, title)}
                        className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-600/20"
                    >
                        Activar Slot de Poder
                    </Button>
                </div>
            )}
        </DialogContent>
    );
}
