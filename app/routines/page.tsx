"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LayoutDashboard, Clock, CheckCircle2, MoreVertical, Trash2, ListChecks, Zap, Star, Pencil, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { supabase } from "@/lib/supabase";
import { RoutineWithDetails } from "@/types/routine-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RoutinesDashboard() {
    const { t } = useLanguage();
    const [routines, setRoutines] = useState<RoutineWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchRoutines();
    }, []);

    const fetchRoutines = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('routines')
                .select(`
                    *,
                    blocks:routine_blocks(*),
                    context:routine_context(*),
                    logs:routine_logs(*)
                `)
                .eq('user_id', session.user.id)
                .order('is_primary', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRoutines(data || []);
        } catch (error) {
            console.error('Error fetching routines:', error);
            toast.error(t("common.error"));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("common.confirmDelete") || "¿Estás seguro de eliminar esta rutina?")) return;
        try {
            const { error } = await supabase.from('routines').delete().eq('id', id);
            if (error) throw error;
            setRoutines(routines.filter(r => r.id !== id));
            toast.success("Rutina eliminada");
        } catch (error) {
            toast.error(t("common.error"));
        }
    };

    const handleSetPrimary = async (routineId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Set all routines as not primary for this user
            const { error: resetError } = await supabase
                .from('routines')
                .update({ is_primary: false })
                .eq('user_id', user.id);

            if (resetError) throw resetError;

            // 2. Set the selected routine as primary
            const { error: setPrimaryError } = await supabase
                .from('routines')
                .update({ is_primary: true })
                .eq('id', routineId);

            if (setPrimaryError) throw setPrimaryError;

            // Sort locally to trigger layout animation
            const updatedRoutines = routines.map(r => ({
                ...r,
                is_primary: r.id === routineId
            })).sort((a, b) => {
                if (a.is_primary) return -1;
                if (b.is_primary) return 1;
                return 0;
            });

            setRoutines(updatedRoutines);
            toast.success("La Corona ha sido reclamada. Nueva Rutina Principal establecida.");
        } catch (error: any) {
            console.error('Error setting primary routine:', error);
            toast.error("No se pudo establecer la jerarquía.");
        }
    };

    const activeRoutines = routines.filter(r => r.is_active !== false);
    const primaryRoutine = activeRoutines.find(r => r.is_primary);
    const squireRoutines = activeRoutines.filter(r => !r.is_primary);
    const inactiveRoutines = routines.filter(r => r.is_active === false);

    const calculateStats = () => {
        let totalXP = 0;
        let perfectDays = 0;

        routines.forEach(r => {
            r.logs?.forEach(l => {
                totalXP += l.success_percentage || 0;
                if (l.success_percentage === 100) perfectDays++;
            });
        });

        const level = Math.floor(totalXP / 500) + 1;
        const xpInLevel = totalXP % 500;
        const xpProgress = (xpInLevel / 500) * 100;

        let rank = "Aspirante";
        if (level >= 13) rank = "Maestro Forjador";
        else if (level >= 8) rank = "Arquitecto de Vida";
        else if (level >= 4) rank = "Forjador Activo";

        return { totalXP, perfectDays, level, xpInLevel, xpProgress, rank };
    };

    const stats = calculateStats();

    return (
        <div className="min-h-screen bg-slate-950 pb-32 selection:bg-orange-500/30">
            {/* Header */}
            <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight leading-none uppercase italic">SALA DE MANDOS</h1>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configura tu Jerarquía de Poder</p>
                        </div>
                    </div>
                    <Link
                        href="/routines/new"
                        className="bg-white/5 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        NUEVA RUTINA
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-12 space-y-16">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="h-12 w-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando Protocolos...</p>
                    </div>
                ) : activeRoutines.length > 0 ? (
                    <div className="space-y-12">
                        {/* THE THRONE (Primary Routine) */}
                        {primaryRoutine && (
                            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                <ThroneCard
                                    routine={primaryRoutine}
                                    onDelete={() => handleDelete(primaryRoutine.id)}
                                />
                            </motion.div>
                        )}

                        {/* THE SQUIRES (Secondary Routines) */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="h-1 w-12 bg-white/10" />
                                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Protocolos Secundarios</h2>
                                <div className="h-1 flex-1 bg-white/10" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {squireRoutines.map((routine) => (
                                        <motion.div
                                            key={routine.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <SquireCard
                                                routine={routine}
                                                onSetPrimary={() => handleSetPrimary(routine.id)}
                                                onDelete={() => handleDelete(routine.id)}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* History Toggle */}
                        {inactiveRoutines.length > 0 && (
                            <div className="pt-12 text-center">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="text-[10px] font-black text-slate-600 hover:text-orange-500 uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto"
                                >
                                    {showHistory ? "Ocultar Historial" : "Ver Historial de Identidad"}
                                    <ChevronRight className={cn("h-3 w-3 transition-transform", showHistory && "rotate-90")} />
                                </button>

                                <AnimatePresence>
                                    {showHistory && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8"
                                        >
                                            {inactiveRoutines.map(r => (
                                                <Link
                                                    key={r.id}
                                                    href={`/routines/${r.id}`}
                                                    className="glass-panel p-4 rounded-2xl border-white/5 text-left group"
                                                >
                                                    <p className="text-[10px] font-black text-white/40 group-hover:text-white transition-colors uppercase truncate">{r.name}</p>
                                                    <p className="text-[8px] font-bold text-slate-700 mt-1 uppercase">ARCHIVADA</p>
                                                </Link>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                ) : (
                    <EmptyState />
                )}
            </main>
        </div>
    );
}

function ThroneCard({ routine, onDelete }: { routine: RoutineWithDetails, onDelete: () => void }) {
    const totalMinutes = routine.blocks?.reduce((acc, b) => acc + b.duration_minutes, 0) || 0;
    const firstBlock = routine.blocks?.[0];

    return (
        <div className="relative group">
            {/* Pulsing Aura */}
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-[48px] blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <div className="relative glass-panel rounded-[48px] border-orange-500/30 overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.15)] bg-slate-950/60 backdrop-blur-3xl">
                {/* FOCUS Label */}
                <div className="absolute top-8 right-8 z-20">
                    <div className="glass-panel px-4 py-2 rounded-full border-orange-500/30 flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                        <div className="h-1.5 w-1.5 bg-orange-500 rounded-full" />
                        <span className="text-[10px] font-black text-orange-500 tracking-[0.3em] uppercase">FOCUS</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Info Section */}
                    <div className="p-10 md:p-14 space-y-10 border-r border-white/5 relative z-10">
                        {/* Framed Image Container */}
                        {routine.image_url && (
                            <div className="w-full aspect-[21/9] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl relative group/img mb-4">
                                <img
                                    src={routine.image_url}
                                    alt={routine.name}
                                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Star className="h-6 w-6 text-orange-500 fill-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                <p className="text-xl font-black text-orange-400 uppercase tracking-widest">Protocolo Principal</p>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-serif text-white tracking-tight leading-none italic font-medium">
                                {routine.name}
                            </h2>
                            {firstBlock && (
                                <div className="inline-flex items-center gap-3 py-2 px-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                    <Clock className="h-3 w-3 text-orange-400" />
                                    <p className="text-[11px] font-black text-white uppercase tracking-widest">
                                        {routine.start_time} - {firstBlock.type}
                                    </p>
                                </div>
                            )}
                        </div>

                        {routine.commitment_statement && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mantra de Identidad</p>
                                <p className="text-xl font-black text-slate-300 tracking-tight italic leading-tight">
                                    "{routine.commitment_statement}"
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Link
                                href={`/routines/${routine.id}`}
                                className="bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-[28px] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-orange-600/20 transition-all active:scale-95"
                            >
                                <Zap className="h-4 w-4 fill-white" />
                                COMENZAR
                            </Link>
                            <div className="flex gap-2">
                                <Link
                                    href={`/routines/new?id=${routine.id}`}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white py-5 rounded-[28px] border border-white/5 flex items-center justify-center transition-all"
                                >
                                    <Pencil className="h-5 w-5" />
                                </Link>
                                <button
                                    onClick={onDelete}
                                    className="w-16 bg-red-500/5 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-[28px] border border-red-500/10 flex items-center justify-center transition-all"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Section */}
                    <div className="p-10 md:p-14 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-xl font-black text-slate-500 uppercase tracking-widest">Hoja de Ruta ({totalMinutes} MIN)</p>
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{routine.blocks?.length || 0} pasos</span>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {routine.blocks?.map((block, i) => (
                                <div key={i} className="flex items-center gap-4 p-5 rounded-[24px] bg-white/[0.02] border border-white/5 group/block hover:border-orange-500/30 transition-all">
                                    <div className="h-8 w-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[10px] font-black text-orange-500">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-lg font-black text-white uppercase tracking-wider truncate">{block.type}</p>
                                        <p className="text-sm font-medium text-slate-500 uppercase tracking-tighter">{block.duration_minutes} MIN</p>
                                    </div>
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-800 group-hover/block:bg-orange-500 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SquireCard({ routine, onSetPrimary, onDelete }: { routine: RoutineWithDetails, onSetPrimary: () => void, onDelete: () => void }) {
    const totalMinutes = routine.blocks?.reduce((acc, b) => acc + b.duration_minutes, 0) || 0;

    return (
        <div className="glass-panel rounded-[40px] border-white/5 hover:border-white/20 transition-all group flex flex-col h-full bg-white/[0.02] hover:bg-white/[0.04] overflow-hidden shadow-lg hover:shadow-orange-500/5">
            {routine.image_url && (
                <div className="h-40 w-full overflow-hidden relative border-b border-white/5">
                    <img
                        src={routine.image_url}
                        alt={routine.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent" />
                </div>
            )}
            <div className="p-8 flex flex-col flex-1 relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onSetPrimary}
                        className="h-10 w-10 glass-panel rounded-xl border-white/5 text-slate-600 hover:text-amber-500 hover:border-amber-500/30 flex items-center justify-center transition-all bg-white/5"
                        title="Hacer Principal"
                    >
                        <Star className="h-4 w-4" />
                    </button>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {totalMinutes} MIN
                    </div>
                </div>

                <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-black text-white tracking-tight uppercase leading-none group-hover:text-orange-400 transition-colors truncate">
                        {routine.name}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Empieza: {routine.start_time}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                    <Link
                        href={`/routines/${routine.id}`}
                        className="bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/5 flex items-center justify-center transition-all"
                    >
                        DETALLES
                    </Link>
                    <div className="flex gap-2">
                        <Link
                            href={`/routines/new?id=${routine.id}`}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white py-4 rounded-2xl border border-white/5 flex items-center justify-center transition-all"
                        >
                            <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                            onClick={onDelete}
                            className="w-12 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-500 py-4 rounded-2xl border border-white/5 flex items-center justify-center transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto py-24 px-8 glass-panel rounded-[48px] border-dashed border-2 border-white/10 flex flex-col items-center text-center space-y-8"
        >
            <div className="h-24 w-24 bg-white/5 rounded-[32px] border border-white/10 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-orange-500/10 blur-2xl rounded-full" />
                <ListChecks className="h-10 w-10 text-slate-600" />
            </div>
            <div className="space-y-3">
                <h3 className="text-2xl font-black text-white tracking-tight leading-tight">Tu mañana ya no es un accidente.</h3>
                <p className="text-slate-400 text-sm font-medium">Diseña tu protocolo ahora y toma el mando de tu identidad.</p>
            </div>
            <Link
                href="/routines/new"
                className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all active:scale-95"
            >
                CREA TU PRIMERA RUTINA
            </Link>
        </motion.div>
    );
}

