"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Share2, CheckCircle2, Clock, MapPin, Zap, ShieldCheck, ListChecks, Calendar, Pencil } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RoutineWithDetails, RoutineLog } from "@/types/routine-types";
import { toast } from "sonner";
import { format, addDays, startOfToday, isSameDay, subDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import confetti from "canvas-confetti";

export default function RoutineDetail() {
    const { t } = useLanguage();
    const router = useRouter();
    const { id } = useParams();
    const [routine, setRoutine] = useState<RoutineWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLogging, setIsLogging] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [showReward, setShowReward] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const todayRef = useRef<HTMLButtonElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const routineRef = useRef<RoutineWithDetails | null>(null);
    const lastUpdateTimestamp = useRef<number>(0);

    useEffect(() => {
        routineRef.current = routine;
    }, [routine]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        isDragging.current = true;
        startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
        scrollLeft.current = scrollContainerRef.current.scrollLeft;
        scrollContainerRef.current.classList.remove('scroll-smooth');
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
        if (scrollContainerRef.current) {
            scrollContainerRef.current.classList.add('scroll-smooth');
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        if (scrollContainerRef.current) {
            scrollContainerRef.current.classList.add('scroll-smooth');
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX.current) * 2; // Scroll speed
        scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
    };

    useEffect(() => {
        fetchRoutine();
    }, [id]);

    const fetchRoutine = async () => {
        try {
            const { data, error } = await supabase
                .from('routines')
                .select(`
                    *,
                    blocks:routine_blocks(*),
                    context:routine_context(*),
                    logs:routine_logs(*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data.blocks) {
                data.blocks.sort((a: any, b: any) => a.order - b.order);
            }

            // Supabase returns context as an array due to foreign key relation
            if (Array.isArray(data.context)) {
                data.context = data.context[0] || null;
            }

            // Protection against stale overwrites
            if (Date.now() - lastUpdateTimestamp.current > 2000 || loading) {
                setRoutine(data);
            }
        } catch (error) {
            console.error('Error fetching routine:', error);
            // toast.error(t("common.error")); // Avoid spam if called in background
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBlock = async (blockId: string) => {
        if (!routine || !routineRef.current) return;

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        lastUpdateTimestamp.current = Date.now();

        // 1. Snapshot and derive new state from REF
        const currentRoutine = routineRef.current;
        const currentLog = currentRoutine.logs?.find(l => l.completed_at === dateStr);
        let optimisticBlocks = currentLog?.completed_blocks || [];
        const isCurrentlyCompleted = optimisticBlocks.includes(blockId);

        if (isCurrentlyCompleted) {
            optimisticBlocks = optimisticBlocks.filter(id => id !== blockId);
        } else {
            optimisticBlocks = [...optimisticBlocks, blockId];
        }

        const successPercentage = Math.round((optimisticBlocks.length / (currentRoutine.blocks?.length || 1)) * 100);

        // 2. Immediate Functional Update
        setRoutine(prev => {
            if (!prev) return prev;
            const newLogs = prev.logs ? [...prev.logs] : [];
            const logIndex = newLogs.findIndex(l => l.completed_at === dateStr);

            if (logIndex >= 0) {
                newLogs[logIndex] = { ...newLogs[logIndex], completed_blocks: optimisticBlocks, success_percentage: successPercentage };
            } else {
                newLogs.push({
                    id: 'temp-' + Date.now(),
                    routine_id: prev.id,
                    user_id: 'current',
                    completed_at: dateStr,
                    completed_blocks: optimisticBlocks,
                    success_percentage: successPercentage,
                    notes: "",
                    created_at: new Date().toISOString()
                });
            }
            return { ...prev, logs: newLogs };
        });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            const { updateRoutineLog } = await import("@/app/actions/routines");
            const result = await updateRoutineLog(session.access_token, routine.id, optimisticBlocks, Math.round((optimisticBlocks.length / (routine.blocks?.length || 1)) * 100), dateStr);

            if (result.success && optimisticBlocks.length === (routine.blocks?.length || 0) && !isCurrentlyCompleted) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#F97316', '#FBBF24', '#FFFFFF']
                });
                setShowReward(true);
                setTimeout(() => setShowReward(false), 5000);
            }

            // Re-fetch to ensure sync
            fetchRoutine();

        } catch (error) {
            console.error('Error toggling block:', error);
            toast.error(error instanceof Error ? error.message : "Error al guardar el progreso");
            // Revert on error (could be improved)
            fetchRoutine();
        }
    };

    const handleShare = () => {
        if (!routine) return;
        const text = `🔥 Mi Rutina de Éxito: ${routine.name}\n\n` +
            `Intención: ${routine.intention}\n` +
            `Duración: ${routine.blocks.reduce((acc, b) => acc + b.duration_minutes, 0)} min\n\n` +
            routine.blocks.map((b, i) => `${i + 1}. ${b.type} (${b.duration_minutes}m) - ${b.objective}`).join('\n') +
            `\n\nCreado con Forjador de Rutinas 🚀`;

        navigator.clipboard.writeText(text);
        toast.success("Estructura copiada al portapapeles. ¡Compartila!");
    };

    useLayoutEffect(() => {
        if (todayRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const element = todayRef.current;
            const scrollLeft = element.offsetLeft - container.offsetWidth / 2 + element.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }, [routine]);

    const handleLogCompletion = async () => {
        // Log all blocks for selected date as completed
        if (!routine) return;
        const blockIds = routine.blocks?.map(b => b.id) || [];
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            const { error } = await supabase
                .from('routine_logs')
                .upsert({
                    routine_id: routine.id,
                    user_id: session.user.id,
                    completed_at: dateStr,
                    completed_blocks: blockIds,
                    success_percentage: 100
                }, { onConflict: 'routine_id,completed_at' });

            if (error) throw error;
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#F97316', '#FBBF24', '#FFFFFF']
            });
            setShowReward(true);
            setTimeout(() => setShowReward(false), 5000);
            fetchRoutine();
        } catch (error) {
            console.error('Error logging completion:', error);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
    );

    if (!routine) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            <h1 className="text-xl font-bold text-slate-900">Rutina no encontrada</h1>
            <button onClick={() => router.push('/routines')} className="mt-4 text-orange-500 font-bold">Volver al Dashboard</button>
        </div>
    );

    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const isCompletedOnSelectedDate = routine.logs?.some(l => l.completed_at === selectedDateStr && l.success_percentage === 100);
    const progress = (routine.logs?.length || 0) / routine.ideal_duration_days * 100;

    return (
        <div className="min-h-screen bg-slate-950 pb-32 selection:bg-orange-500/30">
            {/* Header */}
            <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 h-20 flex items-center justify-between">
                    <button onClick={() => router.push('/routines')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-slate-400 hover:text-white">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center block">Hoja de Ruta</span>
                        <span className="text-sm font-black text-white uppercase tracking-widest">{routine.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push(`/routines/new?id=${id}`)} className="p-2.5 bg-white/5 hover:bg-orange-600/20 rounded-xl border border-white/5 hover:border-orange-500/50 transition-all text-slate-400 hover:text-orange-400">
                            <Pencil className="h-5 w-5" />
                        </button>
                        <button onClick={handleShare} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-slate-400 hover:text-white">
                            <Share2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>
            <div className="bg-slate-950/40 border-b border-white/5 py-6 sticky top-20 z-10 backdrop-blur-md">
                <div
                    ref={scrollContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="max-w-3xl mx-auto px-4 overflow-x-auto no-scrollbar flex gap-4 items-center cursor-grab active:cursor-grabbing select-none scroll-smooth"
                >
                    {Array.from({ length: 30 }).map((_, i) => {
                        const date = subDays(addDays(startOfToday(), 7), i);
                        const isDaySelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, startOfToday());
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const log = routine.logs?.find(l => l.completed_at === dateStr);
                        const isPerfect = log?.success_percentage === 100;

                        return (
                            <button
                                key={i}
                                ref={isToday ? todayRef : null}
                                onClick={() => setSelectedDate(date)}
                                className={`flex-shrink-0 w-20 h-24 rounded-3xl flex flex-col items-center justify-center transition-all relative group ${isDaySelected
                                    ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30 scale-105 z-10'
                                    : 'bg-white/5 text-slate-500 hover:bg-white/10'
                                    }`}
                            >
                                <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDaySelected ? 'text-white/80' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                    {format(date, 'eee', { locale: es })}
                                </span>
                                <span className="text-2xl font-black tracking-tighter">{format(date, 'd')}</span>
                                {isPerfect && (
                                    <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full border-[3px] border-slate-950 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]`} />
                                )}
                                {isToday && !isDaySelected && (
                                    <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                                )}
                                {isToday && isDaySelected && (
                                    <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                            </button>
                        );
                    }).reverse()}
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
                {/* Hero */}
                <div className="space-y-6 text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-orange-500/10 blur-[80px] -z-10" />
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest mx-auto">
                        <Zap className="h-3 w-3" />
                        IDENTIDAD EN FORJA
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none break-words px-4">
                        {routine.name}
                    </h1>
                </div>

                {/* Tracking Gauge Premium */}
                {(() => {
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                    const currentLog = routine.logs?.find(l => l.completed_at === dateStr);
                    const dayProgress = currentLog?.success_percentage || 0;
                    const completedCount = currentLog?.completed_blocks?.length || 0;
                    const totalCount = routine.blocks?.length || 1;

                    return (
                        <div className="glass-panel p-8 rounded-[40px] border-white/5 shadow-2xl relative overflow-hidden group">
                            <div className="flex justify-between items-center mb-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Consistencia del Día</p>
                                    <h2 className="text-3xl font-black text-white">
                                        {completedCount} <span className="text-slate-600">/</span> {totalCount}
                                    </h2>
                                </div>
                                <div className="h-20 w-20 relative flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
                                        <motion.circle
                                            cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                                            className="text-orange-500"
                                            initial={{ strokeDasharray: "0 226" }}
                                            animate={{ strokeDasharray: `${(dayProgress / 100) * 226} 226` }}
                                            transition={{ duration: 1 }}
                                        />
                                    </svg>
                                    <span className="absolute text-sm font-black text-white">{dayProgress}%</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {routine.blocks?.map((_, idx) => (
                                    <div key={idx} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${idx < completedCount ? 'bg-orange-500' : 'bg-white/10'}`} />
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Consistency & Scaling */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel p-6 rounded-[32px] border-white/5 bg-emerald-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                        </div>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">Días Masterizados</p>
                        <p className="text-3xl font-black text-white">{routine.logs?.filter(l => l.success_percentage === 100).length || 0}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Nivel de Maestría</p>
                    </div>
                    <div className="glass-panel p-6 rounded-[32px] border-white/5 bg-orange-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Zap className="h-12 w-12 text-orange-500" />
                        </div>
                        <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-2">Racha Actual</p>
                        <p className="text-3xl font-black text-white">
                            {(() => {
                                const sortedLogs = [...(routine.logs || [])].sort((a, b) => b.completed_at.localeCompare(a.completed_at));
                                let streak = 0;
                                let checkDate = startOfToday();

                                for (const log of sortedLogs) {
                                    const logDate = new Date(log.completed_at + 'T00:00:00');
                                    if (isSameDay(logDate, checkDate) && log.success_percentage === 100) {
                                        streak++;
                                        checkDate = subDays(checkDate, 1);
                                    } else if (isSameDay(logDate, subDays(startOfToday(), 0)) && log.success_percentage < 100) {
                                        // continue to check yesterday if today is not partial/fail
                                    } else {
                                        break;
                                    }
                                }
                                return streak;
                            })()}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Días Seguidos</p>
                    </div>
                </div>

                {/* Blocks Sequence Interactive */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-1.5 bg-orange-500 rounded-full" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Hitos de la Mañana</p>
                        </div>
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{format(selectedDate, "d 'de' MMMM", { locale: es })}</span>
                    </div>
                    <div className="space-y-4">
                        {routine.blocks?.map((block, idx) => {
                            const dateStr = format(selectedDate, 'yyyy-MM-dd');
                            const currentLog = routine.logs?.find(l => l.completed_at === dateStr);
                            const isDone = currentLog?.completed_blocks?.includes(block.id);

                            return (
                                <button
                                    key={block.id}
                                    onClick={() => handleToggleBlock(block.id)}
                                    className={`w-full glass-card p-6 rounded-[32px] border-white/5 hover:border-white/10 transition-all group relative overflow-hidden text-left ${isDone ? 'bg-orange-500/5 border-orange-500/20' : ''}`}
                                >
                                    <div className={`absolute top-0 left-0 w-1 h-full transition-all ${isDone ? 'bg-orange-500' : 'bg-white/10 group-hover:bg-orange-500/50'}`} />
                                    <div className="flex items-center gap-6">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${isDone
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            : 'bg-white/5 border-white/5 text-slate-500'}`}
                                        >
                                            {isDone ? <CheckCircle2 className="h-6 w-6" /> : <span className="font-black">{idx + 1}</span>}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className={`font-black text-sm uppercase tracking-wider transition-colors ${isDone ? 'text-orange-400' : 'text-white'}`}>{block.type}</h3>
                                                <span className="text-[10px] font-black text-slate-600 uppercase">{block.duration_minutes} MIN</span>
                                            </div>
                                            <p className="text-slate-400 text-xs font-medium leading-relaxed line-clamp-1">
                                                {block.objective}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Reward Celebration Overlay */}
                <AnimatePresence>
                    {showReward && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl px-6 pointer-events-none"
                        >
                            <motion.div
                                initial={{ scale: 0.5, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="text-center space-y-8"
                            >
                                <div className="h-40 w-40 bg-orange-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_80px_rgba(249,115,22,0.6)] relative">
                                    <Zap className="h-20 w-20 text-white fill-white" />
                                    <motion.div
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute inset-0 rounded-full border-4 border-orange-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">¡Maestrazo!</h2>
                                    <p className="text-orange-400 font-bold tracking-[0.3em] uppercase text-xs">Identidad Forjada con éxito</p>
                                </div>
                                <p className="text-slate-400 text-sm max-w-xs mx-auto italic">"No eres lo que haces a veces, eres lo que forjas con consistencia hoy."</p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Context, Disparador & Plan B */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                    {/* Location */}
                    <div className="glass-panel p-8 rounded-[40px] border-white/5 space-y-4 relative overflow-hidden group">
                        <div className="flex items-center gap-3 text-slate-400">
                            <MapPin className="h-4 w-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">{t("routines.wizard.step3.locationLabel") || "Ubicación"}</p>
                        </div>
                        <p className="text-white font-black text-lg tracking-tight leading-tight">
                            {routine.context?.location || "No definida"}
                        </p>
                    </div>

                    {/* Trigger */}
                    <div className="glass-panel p-8 rounded-[40px] border-white/5 space-y-4 relative overflow-hidden group">
                        <div className="flex items-center gap-3 text-orange-400">
                            <Zap className="h-4 w-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">DISPARADOR</p>
                        </div>
                        <p className="text-white font-black text-lg tracking-tight leading-tight">
                            {routine.context?.trigger || "Sin disparador"}
                        </p>
                    </div>

                    {/* Plan B */}
                    <div className="glass-panel p-8 rounded-[40px] border-white/10 space-y-4 relative overflow-hidden group">
                        <div className="flex items-center gap-3 text-amber-500">
                            <ShieldCheck className="h-4 w-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">PLAN B</p>
                        </div>
                        <p className="text-slate-300 font-medium text-xs italic leading-relaxed">
                            {routine.context?.plan_b ? `"${routine.context.plan_b}"` : "Sin plan de contingencia"}
                        </p>
                    </div>
                </div>

                {/* Commitment */}
                <div className="py-12 px-6 text-center space-y-6">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Compromiso de Identidad</p>
                    <p className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-tight italic max-w-xl mx-auto opacity-80 decoration-orange-500/30 underline decoration-4 underline-offset-8">
                        "{routine.commitment_statement}"
                    </p>
                    <div className="flex flex-col items-center gap-3 pt-6">
                        <ShieldCheck className="h-10 w-10 text-orange-500/40" />
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Verificado digitalmente por el Forjador</p>
                    </div>
                </div>
            </main>

            {/* Floating Action Button Premium */}
            <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-30">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={handleLogCompletion}
                        disabled={isLogging || isCompletedOnSelectedDate}
                        className={`w-full py-6 rounded-[32px] font-black text-base uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 disabled:opacity-80 disabled:active:scale-100 ${isCompletedOnSelectedDate
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-none'
                            : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-orange-500/20 hover:from-orange-600 hover:to-amber-700 active:ring-4 ring-orange-500/20'
                            }`}
                    >
                        {isLogging ? (
                            <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : isCompletedOnSelectedDate ? (
                            <>
                                <CheckCircle2 className="h-6 w-6" />
                                {t("routines.detail.logged")}
                            </>
                        ) : (
                            <>
                                <Zap className="h-6 w-6 fill-white" />
                                {t("routines.detail.logBtn")}
                            </>
                        )}
                    </button>
                    {isCompletedOnSelectedDate && (
                        <p className="text-center text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.4em] mt-3 animate-fade-in">
                            {format(selectedDate, 'yyyy-MM-dd') === todayStr
                                ? "Mañana es otro día para forjar tu identidad"
                                : "Día completado con maestría"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
