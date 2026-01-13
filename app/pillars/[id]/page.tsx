"use client";

import { useEffect, useState } from "react";
import {
    Heart, Users, Zap, Brain, Briefcase, Wallet, Compass,
    ChevronLeft, Target, Sparkles, Plus, Trash2, Save,
    CheckCircle2, AlertCircle, Info, ArrowRight,
    Type, Lightbulb, Eye, User, Footprints, Flag
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
    Pillar, PillarType, PillarBelief, PillarHabit, PillarMilestone, PillarWithDetails
} from "@/types/pillars";
import { toast } from "sonner";
import { format } from "date-fns";

const PILLAR_CONFIG: Record<PillarType, { icon: any; color: string; bg: string; border: string }> = {
    body: { icon: Heart, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    relationships: { icon: Users, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    inner_strength: { icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    mind: { icon: Brain, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    mission: { icon: Briefcase, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    finance: { icon: Wallet, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    lifestyle: { icon: Compass, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" }
};

type TabType = 'identity' | 'habits' | 'milestones';
type IdentitySubTab = 'beliefs' | 'why' | 'vision' | 'statement';

export default function PillarDetailPage({ params }: { params: { id: string } }) {
    const pillarId = params.id;
    const [pillar, setPillar] = useState<PillarWithDetails | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('identity');
    const [identitySubTab, setIdentitySubTab] = useState<IdentitySubTab>('beliefs');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPillarData();
    }, [pillarId]);

    const loadPillarData = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('pillars')
            .select(`
                *,
                beliefs:pillar_beliefs(*),
                habits:pillar_habits(*),
                milestones:pillar_milestones(*)
            `)
            .eq('id', pillarId)
            .single();

        if (error) {
            console.error("Error loading pillar details:", error);
            toast.error("Error al cargar los detalles del pilar");
        } else {
            setPillar(data);
        }
        setIsLoading(false);
    };

    const handleUpdatePillar = async (updates: Partial<Pillar>) => {
        setIsSaving(true);
        const { error } = await supabase
            .from('pillars')
            .update(updates)
            .eq('id', pillarId);

        if (error) {
            toast.error("Error al guardar los cambios");
        } else {
            setPillar(prev => prev ? { ...prev, ...updates } : null);
            toast.success("Progreso guardado");
        }
        setIsSaving(false);
    };

    const handleAddBelief = async () => {
        const { data, error } = await supabase
            .from('pillar_beliefs')
            .insert({
                pillar_id: pillarId,
                limiting_belief: "Nueva Creencia Limitante",
                empowering_belief: "Nueva Creencia Empoderadora"
            })
            .select()
            .single();

        if (error) toast.error("Error al añadir creencia");
        else setPillar(prev => prev ? { ...prev, beliefs: [...prev.beliefs, data] } : null);
    };

    const handleUpdateBelief = async (beliefId: string, updates: Partial<PillarBelief>) => {
        const { error } = await supabase
            .from('pillar_beliefs')
            .update(updates)
            .eq('id', beliefId);

        if (error) toast.error("Error al actualizar creencia");
        else {
            setPillar(prev => prev ? {
                ...prev,
                beliefs: prev.beliefs.map(b => b.id === beliefId ? { ...b, ...updates } : b)
            } : null);
        }
    };

    const handleDeleteBelief = async (beliefId: string) => {
        const { error } = await supabase
            .from('pillar_beliefs')
            .delete()
            .eq('id', beliefId);

        if (error) toast.error("Error al eliminar creencia");
        else {
            setPillar(prev => prev ? {
                ...prev,
                beliefs: prev.beliefs.filter(b => b.id !== beliefId)
            } : null);
            toast.success("Creencia eliminada");
        }
    };

    const handleAddHabit = async () => {
        const { data, error } = await supabase
            .from('pillar_habits')
            .insert({
                pillar_id: pillarId,
                title: "Nuevo Hábito",
                frequency: "diario"
            })
            .select()
            .single();

        if (error) toast.error("Error al añadir hábito");
        else setPillar(prev => prev ? { ...prev, habits: [...prev.habits, data] } : null);
    };

    const handleUpdateHabit = async (habitId: string, updates: Partial<PillarHabit>) => {
        const { error } = await supabase
            .from('pillar_habits')
            .update(updates)
            .eq('id', habitId);

        if (error) toast.error("Error al actualizar hábito");
        else {
            setPillar(prev => prev ? {
                ...prev,
                habits: prev.habits.map(h => h.id === habitId ? { ...h, ...updates } : h)
            } : null);
        }
    };

    const handleDeleteHabit = async (habitId: string) => {
        const { error } = await supabase
            .from('pillar_habits')
            .delete()
            .eq('id', habitId);

        if (error) toast.error("Error al eliminar hábito");
        else {
            setPillar(prev => prev ? {
                ...prev,
                habits: prev.habits.filter(h => h.id !== habitId)
            } : null);
            toast.success("Hábito eliminado");
        }
    };

    const handleAddMilestone = async () => {
        const { data, error } = await supabase
            .from('pillar_milestones')
            .insert({
                pillar_id: pillarId,
                title: "Nuevo Hito",
                status: "pending"
            })
            .select()
            .single();

        if (error) toast.error("Error al añadir hito");
        else setPillar(prev => prev ? { ...prev, milestones: [...prev.milestones, data] } : null);
    };

    const handleUpdateMilestone = async (milestoneId: string, updates: Partial<PillarMilestone>) => {
        const { error } = await supabase
            .from('pillar_milestones')
            .update(updates)
            .eq('id', milestoneId);

        if (error) toast.error("Error al actualizar hito");
        else {
            setPillar(prev => prev ? {
                ...prev,
                milestones: prev.milestones.map(m => m.id === milestoneId ? { ...m, ...updates } : m)
            } : null);
        }
    };

    const handleDeleteMilestone = async (milestoneId: string) => {
        const { error } = await supabase
            .from('pillar_milestones')
            .delete()
            .eq('id', milestoneId);

        if (error) toast.error("Error al eliminar hito");
        else {
            setPillar(prev => prev ? {
                ...prev,
                milestones: prev.milestones.filter(m => m.id !== milestoneId)
            } : null);
            toast.success("Hito eliminado");
        }
    };

    if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Sparkles className="h-8 w-8 text-indigo-500 animate-spin" /></div>;
    if (!pillar) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Pilar no encontrado</div>;

    const config = PILLAR_CONFIG[pillar.type as PillarType];
    const Icon = config.icon;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            {/* Top Navigation */}
            <div className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/pillars" className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all group">
                            <ChevronLeft className="h-5 w-5 text-slate-400 group-hover:text-white" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center shadow-lg", config.border, config.bg)}>
                                <Icon className={cn("h-5 w-5", config.color)} />
                            </div>
                            <h1 className="text-xl font-black tracking-tight">{pillar.name}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
                        <button
                            onClick={() => setActiveTab('identity')}
                            className={cn(
                                "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'identity' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white"
                            )}
                        >
                            Identidad
                        </button>
                        <button
                            onClick={() => setActiveTab('habits')}
                            className={cn(
                                "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'habits' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white"
                            )}
                        >
                            Hábitos
                        </button>
                        <button
                            onClick={() => setActiveTab('milestones')}
                            className={cn(
                                "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'milestones' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white"
                            )}
                        >
                            Hitos
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-6 md:p-12 space-y-12 pb-32">
                {/* 1. IDENTITY TAB */}
                {activeTab === 'identity' && (
                    <div className="space-y-12">
                        {/* Sub-Tabs Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 bg-white/5 rounded-3xl border border-white/5">
                            <button
                                onClick={() => setIdentitySubTab('beliefs')}
                                className={cn(
                                    "px-6 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all",
                                    identitySubTab === 'beliefs' ? "bg-slate-900 border border-white/10 shadow-2xl" : "hover:bg-white/5 grayscale"
                                )}
                            >
                                <Lightbulb className={cn("h-5 w-5", identitySubTab === 'beliefs' ? "text-amber-400" : "text-slate-500")} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Creencias</span>
                            </button>
                            <button
                                onClick={() => setIdentitySubTab('why')}
                                className={cn(
                                    "px-6 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all",
                                    identitySubTab === 'why' ? "bg-slate-900 border border-white/10 shadow-2xl" : "hover:bg-white/5 grayscale"
                                )}
                            >
                                <Type className={cn("h-5 w-5", identitySubTab === 'why' ? "text-indigo-400" : "text-slate-500")} />
                                <span className="text-[9px] font-black uppercase tracking-widest">El Porqué</span>
                            </button>
                            <button
                                onClick={() => setIdentitySubTab('vision')}
                                className={cn(
                                    "px-6 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all",
                                    identitySubTab === 'vision' ? "bg-slate-900 border border-white/10 shadow-2xl" : "hover:bg-white/5 grayscale"
                                )}
                            >
                                <Eye className={cn("h-5 w-5", identitySubTab === 'vision' ? "text-emerald-400" : "text-slate-500")} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Visión</span>
                            </button>
                            <button
                                onClick={() => setIdentitySubTab('statement')}
                                className={cn(
                                    "px-6 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all",
                                    identitySubTab === 'statement' ? "bg-slate-900 border border-white/10 shadow-2xl" : "hover:bg-white/5 grayscale"
                                )}
                            >
                                <User className={cn("h-5 w-5", identitySubTab === 'statement' ? "text-purple-400" : "text-slate-500")} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Identidad</span>
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="min-h-[400px]">
                            {identitySubTab === 'beliefs' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-black tracking-tight">Arquitectura de Creencias</h2>
                                            <p className="text-xs text-slate-500 tracking-wider">Transforma sombras en pilares de luz.</p>
                                        </div>
                                        <button
                                            onClick={handleAddBelief}
                                            className="px-6 py-3 bg-white text-slate-950 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                        >
                                            Nueva Creencia
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {pillar.beliefs.map((belief) => (
                                            <div key={belief.id} className="p-1 rounded-[32px] bg-gradient-to-br from-white/10 to-transparent border border-white/5 shadow-2xl">
                                                <div className="bg-slate-900 rounded-[30px] p-8 space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-rose-500">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Creencia Limitante
                                                        </div>
                                                        <textarea
                                                            className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-xs italic text-slate-400 focus:border-rose-500/30 outline-none resize-none"
                                                            value={belief.limiting_belief}
                                                            onChange={(e) => handleUpdateBelief(belief.id, { limiting_belief: e.target.value })}
                                                            placeholder="¿Qué te detiene hoy?"
                                                        />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Creencia Empoderadora
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteBelief(belief.id)}
                                                                className="text-slate-700 hover:text-rose-500 transition-colors"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-xs font-bold text-white focus:border-emerald-500/30 outline-none resize-none"
                                                            value={belief.empowering_belief}
                                                            onChange={(e) => handleUpdateBelief(belief.id, { empowering_belief: e.target.value })}
                                                            placeholder="¿Cuál es la nueva verdad?"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {identitySubTab === 'why' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-4xl font-black tracking-tighter">La Razón Profunda</h2>
                                        <p className="text-sm text-slate-500 italic">"Quien tiene un porqué lo suficientemente fuerte, puede superar cualquier cómo."</p>
                                    </div>
                                    <div className="bg-slate-900 p-10 rounded-[48px] border border-white/5 shadow-2xl relative">
                                        <div className="absolute -top-4 -left-4 h-16 w-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
                                            <Target className="h-8 w-8 text-indigo-400" />
                                        </div>
                                        <textarea
                                            className="w-full h-80 bg-transparent border-none text-lg font-serif italic text-slate-200 placeholder:text-slate-700 outline-none resize-none scrollbar-hide"
                                            value={pillar.why || ""}
                                            onChange={(e) => setPillar({ ...pillar, why: e.target.value })}
                                            placeholder="Indaga en lo más profundo. ¿Por qué esto es vital para ti?..."
                                        />
                                        <button
                                            onClick={() => handleUpdatePillar({ why: pillar.why })}
                                            disabled={isSaving}
                                            className="mt-4 w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {isSaving ? "Guardando..." : "Sellar mi Porqué"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {identitySubTab === 'vision' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-4xl font-black tracking-tighter">Visión de Metamorfosis</h2>
                                        <p className="text-sm text-slate-500 italic">Visualiza el estado final. No escatimes en gloria.</p>
                                    </div>
                                    <div className="bg-slate-900 p-10 rounded-[48px] border border-white/5 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Eye className="h-64 w-64 text-emerald-500 -mr-20 -mt-20" />
                                        </div>
                                        <textarea
                                            className="relative z-10 w-full h-80 bg-transparent border-none text-lg font-serif text-white placeholder:text-slate-700 outline-none resize-none scrollbar-hide"
                                            value={pillar.vision || ""}
                                            onChange={(e) => setPillar({ ...pillar, vision: e.target.value })}
                                            placeholder="En un año, en cinco años... ¿Cómo se ve este pilar en su máxima expresión?"
                                        />
                                        <button
                                            onClick={() => handleUpdatePillar({ vision: pillar.vision })}
                                            disabled={isSaving}
                                            className="relative z-10 mt-4 w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {isSaving ? "Guardando..." : "Gobernar mi Visión"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {identitySubTab === 'statement' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-4xl font-black tracking-tighter">Nueva Identidad</h2>
                                        <p className="text-sm text-slate-500 italic">Define quién eres ahora. En tiempo presente.</p>
                                    </div>
                                    <div className="p-1 rounded-[48px] bg-gradient-to-br from-purple-500/20 via-transparent to-indigo-500/20 shadow-2xl">
                                        <div className="bg-slate-950 p-12 rounded-[46px] border border-white/5 space-y-10">
                                            <div className="space-y-4">
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">Declaración de Poder</span>
                                                <input
                                                    type="text"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-2xl font-black tracking-tight text-white placeholder:text-slate-800 outline-none focus:border-purple-500/50"
                                                    value={pillar.identity_statement || ""}
                                                    onChange={(e) => setPillar({ ...pillar, identity_statement: e.target.value })}
                                                    placeholder="YO SOY..."
                                                />
                                            </div>
                                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                                                <Info className="h-5 w-5 text-purple-400 shrink-0 mt-1" />
                                                <p className="text-xs text-slate-500 leading-relaxed italic">
                                                    "Cada acción que tomas es un voto por el tipo de persona en la que te quieres convertir."
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleUpdatePillar({ identity_statement: pillar.identity_statement })}
                                                disabled={isSaving}
                                                className="w-full py-5 bg-purple-600 hover:bg-purple-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-purple-600/20"
                                            >
                                                {isSaving ? "Guardando..." : "Asumir mi Identidad"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. HABITS TAB (Atomic Habits Framework) */}
                {activeTab === 'habits' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black tracking-tighter">Habit Engine</h2>
                                <p className="text-sm text-slate-500 italic">"Los hábitos son el interés compuesto de la superación personal."</p>
                            </div>
                            <button
                                onClick={handleAddHabit}
                                className="h-14 w-14 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-110 transition-all shadow-2xl"
                            >
                                <Plus className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            {pillar.habits.length > 0 ? pillar.habits.map((habit) => (
                                <div key={habit.id} className="group relative bg-slate-900 border border-white/10 rounded-[40px] p-10 hover:border-white/30 transition-all shadow-2xl overflow-hidden">
                                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:opacity-10 transition-opacity">
                                        <Footprints className="h-32 w-32" />
                                    </div>
                                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                                        <div className="space-y-4 flex-1 w-full">
                                            <div className="flex items-center justify-between">
                                                <input
                                                    className="text-2xl font-black tracking-tight text-white bg-transparent border-none outline-none w-full"
                                                    value={habit.title}
                                                    onChange={(e) => handleUpdateHabit(habit.id, { title: e.target.value })}
                                                />
                                                <button
                                                    onClick={() => handleDeleteHabit(habit.id)}
                                                    className="text-slate-600 hover:text-rose-500 transition-colors p-2"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <select
                                                    className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 outline-none"
                                                    value={habit.frequency}
                                                    onChange={(e) => handleUpdateHabit(habit.id, { frequency: e.target.value })}
                                                >
                                                    <option value="diario">Diario</option>
                                                    <option value="semanal">Semanal</option>
                                                    <option value="mensual">Mensual</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full flex-[2]">
                                            {[
                                                { label: "Señal", key: "cue", val: habit.cue, icon: Sparkles, color: "text-amber-400" },
                                                { label: "Anhelo", key: "craving", val: habit.craving, icon: Heart, color: "text-rose-400" },
                                                { label: "Respuesta", key: "response", val: habit.response, icon: Zap, color: "text-indigo-400" },
                                                { label: "Recompensa", key: "reward", val: habit.reward, icon: Flag, color: "text-emerald-400" }
                                            ].map((item, i) => (
                                                <div key={i} className="p-4 rounded-3xl bg-black/20 border border-white/5 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <item.icon className={cn("h-3 w-3", item.color)} />
                                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
                                                    </div>
                                                    <textarea
                                                        className="w-full bg-transparent border-none text-[10px] text-slate-300 font-medium leading-relaxed resize-none h-12 outline-none"
                                                        value={item.val || ""}
                                                        onChange={(e) => handleUpdateHabit(habit.id, { [item.key]: e.target.value })}
                                                        placeholder="Define..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-20 border-2 border-dashed border-white/5 rounded-[48px] text-center space-y-6">
                                    <Footprints className="h-16 w-16 text-slate-800 mx-auto" />
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-slate-400 tracking-tight">Arquitectura de Hábitos Vacía</h3>
                                        <p className="text-xs text-slate-600 max-w-xs mx-auto italic">Diseña sistemas que hagan que tu nueva identidad sea inevitable.</p>
                                    </div>
                                    <button
                                        onClick={handleAddHabit}
                                        className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                                    >
                                        Diseñar Hábito
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. MILESTONES TAB */}
                {activeTab === 'milestones' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black tracking-tighter">Hitos de Conquista</h2>
                                <p className="text-sm text-slate-500 italic">Puntos de inflexión en tu camino hacia la excelencia.</p>
                            </div>
                            <button
                                onClick={handleAddMilestone}
                                className="h-14 w-14 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-110 transition-all shadow-2xl"
                            >
                                <Plus className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {pillar.milestones.length > 0 ? pillar.milestones.map((milestone) => (
                                <div key={milestone.id} className="group p-1 rounded-3xl bg-white/5 hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-transparent transition-all">
                                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-[22px] p-6 flex flex-col md:flex-row gap-6 items-center">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center border",
                                            milestone.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-slate-600"
                                        )}>
                                            <Flag className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 text-center md:text-left space-y-2">
                                            <input
                                                className="text-lg font-bold tracking-tight text-white bg-transparent border-none outline-none w-full"
                                                value={milestone.title}
                                                onChange={(e) => handleUpdateMilestone(milestone.id, { title: e.target.value })}
                                            />
                                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Fecha Límite:</span>
                                                <input
                                                    type="date"
                                                    className="bg-transparent border-none outline-none text-[10px] text-slate-400 font-black uppercase tracking-widest"
                                                    value={milestone.target_date || ""}
                                                    onChange={(e) => handleUpdateMilestone(milestone.id, { target_date: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <select
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border bg-transparent outline-none cursor-pointer",
                                                    milestone.status === 'completed' ? "border-emerald-500/20 text-emerald-400" : "border-amber-500/20 text-amber-500"
                                                )}
                                                value={milestone.status}
                                                onChange={(e) => handleUpdateMilestone(milestone.id, { status: e.target.value as any })}
                                            >
                                                <option value="pending" className="bg-slate-900">Pendiente</option>
                                                <option value="in_progress" className="bg-slate-900">En Progreso</option>
                                                <option value="completed" className="bg-slate-900">Completado</option>
                                            </select>
                                            <button
                                                onClick={() => handleDeleteMilestone(milestone.id)}
                                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all text-slate-500 hover:text-rose-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-20 border-2 border-dashed border-white/5 rounded-[48px] text-center space-y-6">
                                    <Flag className="h-16 w-16 text-slate-800 mx-auto" />
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-slate-400 tracking-tight">Sin Hitos de Conquista</h3>
                                        <p className="text-xs text-slate-600 max-w-xs mx-auto italic">Define victorias tangibles que validen tu nueva identidad.</p>
                                    </div>
                                    <button
                                        onClick={handleAddMilestone}
                                        className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                                    >
                                        Definir Hito
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Save Bar (Visible when identity text is dirty) */}
            <div className="fixed bottom-0 left-0 right-0 p-8 z-40 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none">
                <div className="max-w-4xl mx-auto flex justify-center pointer-events-auto">
                    {isSaving && (
                        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando con el Nexo...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
