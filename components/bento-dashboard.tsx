"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/context/language-context";
import { Plus, ArrowRight, TrendingUp, CheckCircle2, BookOpen, Wallet, Zap, BrainCircuit, Command, PenTool, ListChecks, Star, ChevronRight, Loader2, Sparkles, Target, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { PowerFiveModule } from "@/components/command/power-five-module";
import { getUserGamificationStats, DomainStats } from "@/app/actions/gamification";
import { supabase } from "@/lib/supabase";
import { RoutineWithDetails } from "@/types/routine-types";
import { Challenge } from "@/types/challenges";
import { format, startOfToday } from "date-fns";
import { updateRoutineLog } from "@/app/actions/routines";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// Mock Data for Finance (if real data loading)
const CHART_DATA = [
    { val: 1000 }, { val: 1200 }, { val: 1150 }, { val: 1400 }, { val: 1350 }, { val: 1600 }, { val: 1800 }
];

export function BentoDashboard({ userEmail, onLogout }: { userEmail?: string, onLogout: () => void }) {
    const { t } = useLanguage();
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [stats, setStats] = useState<DomainStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [primaryRoutine, setPrimaryRoutine] = useState<RoutineWithDetails | null>(null);
    const [showReward, setShowReward] = useState(false);

    // Journally State
    const [journalInput, setJournalInput] = useState("");
    const [activeQuestion, setActiveQuestion] = useState<any>(null);
    const [isSavingJournal, setIsSavingJournal] = useState(false);
    const [challenges, setChallenges] = useState<Challenge[]>([]);

    useEffect(() => {
        // Pick a random question on mount
        fetch("/api/prompts")
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    const allQuestions = data.flatMap((cat: any) => cat.questions);
                    const randomQ = allQuestions[Math.floor(Math.random() * allQuestions.length)];
                    setActiveQuestion(randomQ);
                }
            })
            .catch(err => console.error("Error fetching prompts:", err));
    }, []);

    const rotateQuestion = async () => {
        try {
            const res = await fetch("/api/prompts");
            const data = await res.json();
            const allQuestions = data.flatMap((cat: any) => cat.questions);
            const randomQ = allQuestions[Math.floor(Math.random() * allQuestions.length)];
            setActiveQuestion(randomQ);
        } catch (err) {
            console.error("Error rotating question:", err);
        }
    };
    const routineRef = useRef<RoutineWithDetails | null>(null);
    const lastUpdateTimestamp = useRef<number>(0);

    // Keep routineRef in sync with state for access in handleToggleBlock without stale closures
    useEffect(() => {
        routineRef.current = primaryRoutine;
    }, [primaryRoutine]);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async (onlyStats = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();
        if (user && session?.access_token) {
            try {
                // Fetch gamification stats
                const data = await getUserGamificationStats(session.access_token, user.id);
                setStats(data);

                if (!onlyStats) {
                    // Fetch primary routine (fallback to latest if none marked primary)
                    const { data: routine, error: routineError } = await supabase
                        .from('routines')
                        .select(`
                            *,
                            blocks:routine_blocks(*),
                            context:routine_context(*),
                            logs:routine_logs(*)
                        `)
                        .eq('user_id', user.id)
                        .order('is_primary', { ascending: false })
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (routineError) console.error("Error fetching routine:", routineError);

                    // Only update if no recent toggle has happened in the last 2 seconds
                    // or if it's the initial load
                    if (Date.now() - lastUpdateTimestamp.current > 2000 || isLoading) {
                        if (routine && routine.blocks) {
                            routine.blocks.sort((a: any, b: any) => a.order - b.order);
                        }
                        setPrimaryRoutine(routine);
                    }

                    // Fetch active challenges
                    const { data: challengesData, error: challengesError } = await supabase
                        .from('challenges')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .order('created_at', { ascending: false });

                    if (challengesError) console.error("Error fetching challenges:", challengesError);
                    else setChallenges(challengesData || []);
                }
            } catch (e) {
                console.error("Error loading dashboard data:", e);
            }
        }
        setIsLoading(false);
    };

    const handleToggleBlock = async (blockId: string) => {
        if (!primaryRoutine || !routineRef.current) return;

        const dateStr = format(startOfToday(), 'yyyy-MM-dd');
        lastUpdateTimestamp.current = Date.now();

        // 1. Snapshot the current block state from the REF to handle rapid clicks
        const currentRoutine = routineRef.current;
        const currentLog = currentRoutine.logs?.find(l => l.completed_at === dateStr);
        let blocks = currentLog?.completed_blocks || [];

        if (blocks.includes(blockId)) {
            blocks = blocks.filter((id: string) => id !== blockId);
        } else {
            blocks = [...blocks, blockId];
        }

        const successPercentage = Math.round((blocks.length / (currentRoutine.blocks?.length || 1)) * 100);

        // 2. Optimistic Update (Immediate UI reaction)
        setPrimaryRoutine(prev => {
            if (!prev) return prev;
            const updatedLogs = prev.logs ? [...prev.logs] : [];
            const idx = updatedLogs.findIndex((l: any) => l.completed_at === dateStr);
            if (idx >= 0) {
                updatedLogs[idx] = { ...updatedLogs[idx], completed_blocks: blocks, success_percentage: successPercentage };
            } else {
                updatedLogs.push({
                    id: 'temp-' + Date.now(),
                    routine_id: prev.id,
                    user_id: 'current',
                    completed_at: dateStr,
                    completed_blocks: blocks,
                    success_percentage: successPercentage,
                    notes: "",
                    created_at: new Date().toISOString()
                });
            }
            return { ...prev, logs: updatedLogs };
        });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // 3. Perform Backend Update
            await updateRoutineLog(session.access_token, currentRoutine.id, blocks, successPercentage, dateStr);

            // 4. Trigger Reward if 100% reached
            const isNowCompleted = successPercentage === 100;
            const wasAlreadyCompleted = currentLog?.success_percentage === 100;

            if (isNowCompleted && !wasAlreadyCompleted) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#F97316', '#FBBF24', '#FFFFFF']
                });
                setShowReward(true);
                setTimeout(() => setShowReward(false), 5000);
            }

            // 5. Refresh ONLY gamification stats after a short delay
            setTimeout(() => {
                loadStats(true); // onlyStats = true
            }, 500);

        } catch (error) {
            console.error('Error toggling block:', error);
            toast.error("Error al guardar progreso");
            lastUpdateTimestamp.current = 0; // Allow immediate reload on true error
            // Optionally reload the whole state if it's a real failure
            loadStats();
        }
    };

    const handleSaveJournal = async () => {
        if (!journalInput.trim()) {
            toast.error("Escribe algo primero");
            return;
        }

        setIsSavingJournal(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No session");

            const { error } = await supabase
                .from("journal_records")
                .insert({
                    user_id: user.id,
                    user_content: journalInput,
                    prompt_id: activeQuestion?.id || "quick_entry",
                    summary: activeQuestion?.text || "Quick Entry",
                    type: 'text',
                    status: 'finalized',
                    entry_date: format(new Date(), 'yyyy-MM-dd')
                });

            if (error) throw error;

            toast.success("Entrada guardada correctamente");
            setJournalInput("");
            rotateQuestion();
        } catch (error) {
            console.error("Error saving journal:", error);
            toast.error("Error al guardar la entrada");
        } finally {
            setIsSavingJournal(false);
        }
    };

    const globalStats = stats.find(s => s.domain === 'global') || {
        current_level: 1,
        level_title: 'Aspirante',
        progress_to_next: 0
    };

    const progress = globalStats.progress_to_next ?? 0;

    // Global Mouse Handler for Parallax/Glow interaction if needed
    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
    };

    return (
        <div
            className="min-h-screen bg-[#05050A] text-slate-200 p-4 md:p-8 relative overflow-hidden selection:bg-orange-500/30"
            onMouseMove={handleMouseMove}
        >
            {/* --- Living Background --- */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="blob blob-purple w-96 h-96 top-0 left-0 -translate-x-1/2 -translate-y-1/2 blur-[100px]" />
                <div className="blob blob-orange w-96 h-96 top-1/2 right-0 translate-x-1/3 -translate-y-1/2 animation-delay-2000 blur-[120px]" />
                <div className="blob blob-blue w-80 h-80 bottom-0 left-1/3 translate-y-1/3 animation-delay-4000 blur-[90px]" />
                <div className="absolute inset-0 bg-[#05050A]/40 backdrop-blur-[1px]" /> {/* Noise/Overlay optional */}
            </div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <header className="flex justify-between items-center py-4">
                    <div className="glass-panel px-6 py-2 rounded-full flex items-center gap-4">
                        <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_#f97316]" />
                        <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
                            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>

                    <button onClick={onLogout} className="glass-panel px-6 py-2 rounded-full text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors hover:bg-white/5">
                        {t("common.logout")}
                    </button>
                </header>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6 auto-rows-[200px]">

                    {/* --- THE POWER 5 (Full Width Engine) --- */}
                    <PowerFiveModule />

                    {/* 1. HERO CARD (Control Room) - 2x2 */}
                    <BentoCard className="md:col-span-2 md:row-span-2 relative group !bg-white/[0.02]">
                        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity duration-1000">
                            <Command className="h-64 w-64 text-white rotate-12" />
                        </div>

                        <div className="relative z-10 flex flex-col justify-between h-full p-2">
                            <div>
                                <h2 className="text-5xl md:text-6xl font-serif text-white tracking-tight leading-none text-glow">
                                    Ave, <br />
                                    <span className="italic text-white/80">{globalStats.level_title}.</span>
                                </h2>
                                <p className="text-sm text-slate-500 mt-4 max-w-xs font-light leading-relaxed">
                                    "La disciplina es el puente entre metas y logros."
                                </p>
                            </div>

                            {/* Progress Ring */}
                            <div className="absolute bottom-8 right-8 flex flex-col items-center">
                                <div className="relative h-32 w-32 flex items-center justify-center">
                                    <svg className="h-full w-full -rotate-90">
                                        <circle cx="64" cy="64" r="58" fill="none" strokeWidth="4" className="hero-ring-bg" />
                                        <circle cx="64" cy="64" r="58" fill="none" strokeWidth="4" className="hero-ring-progress" strokeDasharray="364" strokeDashoffset={364 - (364 * (progress / 100))} />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-3xl font-serif text-white text-glow">{globalStats.current_level}</span>
                                        <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest">Nivel Global</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <Link href="/command" className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full backdrop-blur-md transition-all group/btn">
                                    <span className="text-xs font-bold uppercase tracking-widest text-white">Comando Central</span>
                                    <ArrowRight className="h-3 w-3 text-orange-500 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </BentoCard>



                    {/* 3. JOURNALLY (Intimate) - 1x2 */}
                    <BentoCard className="md:row-span-2 flex flex-col group bg-gradient-to-br from-white/[0.03] to-indigo-900/10">
                        <div className="flex-1 flex flex-col space-y-4">
                            <div className="flex items-center justify-between">
                                <Link href="/journal" className="flex items-center gap-2 group/title">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 transition-colors group-hover/title:text-indigo-300">
                                        <BookOpen className="h-3 w-3" />
                                        Journally
                                    </span>
                                    <ChevronRight className="h-3 w-3 text-indigo-400/50 group-hover/title:text-indigo-300 group-hover/title:translate-x-0.5 transition-all" />
                                </Link>
                                <PenTool className="h-4 w-4 text-indigo-500/50" />
                            </div>

                            <div className="relative">
                                <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-indigo-500/20" />
                                <h3 className="text-base font-serif text-white/90 leading-snug pl-4 italic">
                                    "{activeQuestion?.text || "¿Cuál es tu pequeña victoria de hoy?"}"
                                </h3>
                            </div>

                            <textarea
                                value={journalInput}
                                onChange={(e) => setJournalInput(e.target.value)}
                                placeholder="Escribe sin filtro. Deja que la mente se vacíe..."
                                className="w-full flex-1 bg-white/[0.02] border border-white/5 focus:border-indigo-500/30 rounded-xl p-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none resize-none transition-all scrollbar-hide mb-8"
                            />
                        </div>

                        <div className="shrink-0 pt-2 border-t border-white/5">
                            <button
                                onClick={handleSaveJournal}
                                disabled={isSavingJournal || !journalInput.trim()}
                                className={cn(
                                    "w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg",
                                    journalInput.trim()
                                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                                        : "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                                )}
                            >
                                {isSavingJournal ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3 w-3" />
                                )}
                                {isSavingJournal ? "Guardando..." : "Guardar Nota"}
                            </button>
                        </div>
                    </BentoCard>

                    {/* 4. ROUTINES (Day System) - 1x2 */}
                    <BentoCard className="md:row-span-2 flex flex-col bg-gradient-to-b from-white/[0.03] to-orange-900/5">
                        <div className="flex items-center justify-between mb-8">
                            <Link href="/routines" className="flex items-center gap-2 group/title">
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-2 transition-colors group-hover/title:text-orange-300">
                                    <Zap className="h-3 w-3" />
                                    Day System
                                </span>
                                <ChevronRight className="h-3 w-3 text-orange-400/50 group-hover/title:text-orange-300 group-hover/title:translate-x-0.5 transition-all" />
                            </Link>
                            {primaryRoutine && (
                                <div className="flex items-center gap-2">
                                    {primaryRoutine.is_primary && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                                    <span className="text-[10px] font-mono text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                                        {primaryRoutine.start_time}
                                    </span>
                                </div>
                            )}
                        </div>

                        {primaryRoutine ? (
                            <div className="flex-1 flex flex-col">
                                <h3 className="text-xl font-black text-white tracking-tight mb-6 line-clamp-2">
                                    {primaryRoutine.name}
                                </h3>
                                <div className="space-y-2 flex-1">
                                    {primaryRoutine.blocks?.slice(0, 5).map((block, i) => {
                                        const todayStr = format(startOfToday(), 'yyyy-MM-dd');
                                        const currentLog = primaryRoutine.logs?.find(l => l.completed_at === todayStr);
                                        const isDone = currentLog?.completed_blocks?.includes(block.id);

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleToggleBlock(block.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl border bg-white/[0.02] border-white/5 transition-all duration-300 text-left group/row hover:border-orange-500/30",
                                                    isDone && "bg-orange-500/5 border-orange-500/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-4 w-4 rounded-full border transition-all flex items-center justify-center",
                                                    isDone ? "bg-orange-500 border-orange-500" : "border-slate-700 bg-transparent"
                                                )}>
                                                    {isDone && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-xs font-medium transition-all truncate",
                                                        isDone ? "text-slate-500 line-through" : "text-slate-300"
                                                    )}>
                                                        {block.objective}
                                                    </p>
                                                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{block.duration_minutes} MIN</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {primaryRoutine.blocks?.length > 5 && (
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center mt-2">
                                            + {primaryRoutine.blocks.length - 5} bloques más
                                        </p>
                                    )}
                                </div>
                                <Link href={`/routines/${primaryRoutine.id}`} className="mt-6 w-full py-3 bg-white/5 hover:bg-orange-600/20 border border-white/10 hover:border-orange-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all text-center">
                                    Iniciar Rutina
                                </Link>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="h-20 w-20 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                                    <ListChecks className="h-10 w-10 text-orange-500/50" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Sin Protocolo</h4>
                                    <p className="text-[10px] text-slate-500 mt-2 font-medium leading-relaxed">
                                        "El que no tiene una rutina, corre el riesgo de ser la rutina de otro."
                                    </p>
                                </div>
                                <Link href="/routines" className="w-full py-4 bg-orange-600 hover:bg-orange-700 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all active:scale-95">
                                    Diseñar Identidad
                                </Link>
                            </div>
                        )}
                    </BentoCard>

                    {/* 5. CHALLENGES (Live Board) - 2x1 */}
                    <BentoCard className="md:col-span-2 flex flex-col bg-gradient-to-br from-white/[0.03] to-purple-900/5 group p-6">
                        <div className="flex items-center justify-between mb-6">
                            <Link href="/challenges" className="flex items-center gap-2 group/title">
                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2 transition-colors group-hover/title:text-purple-300">
                                    <BrainCircuit className="h-3 w-3" />
                                    Live Challenges
                                </span>
                                <ChevronRight className="h-3 w-3 text-purple-400/50 group-hover/title:text-purple-300 group-hover/title:translate-x-0.5 transition-all" />
                            </Link>
                        </div>

                        {challenges.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                {challenges.slice(0, 2).map((challenge) => (
                                    <Link
                                        key={challenge.id}
                                        href={`/challenges/${challenge.id}`}
                                        className="relative p-4 rounded-2xl border border-white/5 bg-slate-950/40 hover:bg-purple-500/5 hover:border-purple-500/30 transition-all group/item overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover/item:opacity-40 transition-opacity">
                                            <Target className="h-8 w-8 text-purple-500" />
                                        </div>
                                        <div className="relative z-10 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Activo</span>
                                            </div>
                                            <h4 className="text-lg font-serif text-white leading-tight line-clamp-1 group-hover/item:text-purple-300 transition-colors">
                                                {challenge.name}
                                            </h4>
                                            <div className="pt-2 flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-t border-white/5">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(challenge.created_at || "").getFullYear()}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {challenges.length === 1 && (
                                    <Link href="/challenges" className="flex items-center justify-center p-4 rounded-2xl border border-dashed border-white/10 hover:border-purple-500/30 hover:bg-white/5 transition-all text-slate-600 hover:text-purple-400">
                                        <Plus className="h-6 w-6" />
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="h-16 w-16 bg-purple-500/5 rounded-full flex items-center justify-center border border-purple-500/10">
                                    <Target className="h-8 w-8 text-purple-500/30" />
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium italic">"No hay límites para quien no se detiene."</p>
                                <Link href="/challenges" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-purple-600/20">
                                    Iniciar Misogi
                                </Link>
                            </div>
                        )}
                    </BentoCard>

                    {/* 6. PILARES (Identity Architecture) - 1x1 */}
                    <BentoCard className="flex flex-col justify-between group bg-gradient-to-br from-white/[0.03] to-emerald-900/5 hover:bg-emerald-900/10 transition-colors">
                        <Link href="/pillars" className="h-full flex flex-col justify-between p-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                Pilares
                            </span>
                            <div>
                                <h3 className="text-3xl font-serif text-white text-glow leading-none">Identidad</h3>
                                <p className="text-[10px] text-emerald-400/60 mt-2 font-mono border-t border-emerald-500/20 pt-2 flex justify-between uppercase font-bold">
                                    <span>7 Áreas</span>
                                    <span>Activas</span>
                                </p>
                            </div>
                        </Link>
                    </BentoCard>

                    {/* 7. Settings/More (Small) - 1x1 */}
                    <BentoCard className="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors group border-dashed border-white/10">
                        <div className="text-center space-y-3">
                            <div className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform border border-white/10 group-hover:border-white/30 text-slate-400 group-hover:text-white">
                                <Plus className="h-5 w-5" />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">Añadir Módulo</p>
                        </div>
                    </BentoCard>



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
        </div>
    );
}

export function BentoCard({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} // Custom easing for premium feel
            className={cn(
                "glass-card p-6 flex flex-col",
                className
            )}
        >
            {children}
        </motion.div>
    );
}
