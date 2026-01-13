"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Plus, Trash2, ListChecks, Clock, MapPin, Zap, ShieldCheck, Target, Heart, ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { EmotionalState, RoutineBlock } from "@/types/routine-types";

export default function NewRoutineWizard() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const routineId = searchParams.get('id');
    const isEditing = !!routineId;

    const [step, setStep] = useState(1);

    // State for the routine creation
    const [formData, setFormData] = useState({
        name: "",
        image_url: "",
        start_time: "06:00",
        ideal_duration_days: 28,
        intention: "",
        emotional_states: [] as EmotionalState[],
        blocks: [] as Partial<RoutineBlock>[],
        context: {
            location: "",
            trigger: "",
            non_negotiable_rules: [] as string[],
            plan_b: ""
        },
        commitment_statement: "",
        acceptance_of_resistance: false
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditing);

    useEffect(() => {
        if (isEditing && routineId) {
            fetchRoutineData(routineId);
        }
    }, [routineId]);

    const fetchRoutineData = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('routines')
                .select(`
                    *,
                    blocks:routine_blocks(*),
                    context:routine_context(*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data) {
                setFormData({
                    name: data.name,
                    image_url: data.image_url || "",
                    start_time: data.start_time,
                    ideal_duration_days: data.ideal_duration_days,
                    intention: data.intention || "",
                    emotional_states: data.emotional_states || [],
                    blocks: data.blocks ? data.blocks.sort((a: any, b: any) => a.order - b.order) : [],
                    context: {
                        location: data.context?.[0]?.location || "",
                        trigger: data.context?.[0]?.trigger || "",
                        non_negotiable_rules: data.context?.[0]?.non_negotiable_rules || [],
                        plan_b: data.context?.[0]?.plan_b || ""
                    },
                    commitment_statement: data.commitment_statement || "",
                    acceptance_of_resistance: data.acceptance_of_resistance || false
                });
            }
        } catch (error: any) {
            console.error('Error fetching routine for edit:', error);
            toast.error("No se pudo cargar la rutina para editar");
        } finally {
            setIsLoading(false);
        }
    };

    const totalDuration = formData.blocks.reduce((acc, b) => acc + (b.duration_minutes || 0), 0);

    const handleSave = async () => {
        setIsSaving(true);
        console.log('Starting routine save...', formData);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No hay sesión activa. Por favor, inicia sesión de nuevo.");

            let currentRoutineId = routineId;

            // 1. Insert or Update Routine
            const routinePayload = {
                user_id: session.user.id,
                name: formData.name,
                image_url: formData.image_url,
                start_time: formData.start_time,
                ideal_duration_days: formData.ideal_duration_days,
                intention: formData.intention,
                emotional_states: formData.emotional_states,
                commitment_statement: formData.commitment_statement,
                acceptance_of_resistance: formData.acceptance_of_resistance
            };

            if (isEditing && routineId) {
                console.log('Updating routine...', routineId);
                const { error: updateError } = await supabase
                    .from('routines')
                    .update(routinePayload)
                    .eq('id', routineId);

                if (updateError) throw new Error(`Error al actualizar la rutina: ${updateError.message}`);
            } else {
                console.log('Inserting new routine...');
                const { data: routine, error: routineError } = await supabase
                    .from('routines')
                    .insert(routinePayload)
                    .select()
                    .single();

                if (routineError) throw new Error(`Error al crear la rutina base: ${routineError.message}`);
                currentRoutineId = routine.id;
            }

            console.log('Routine base saved successfully:', currentRoutineId);

            // 2. Handle Blocks (Intelligent Update to preserve IDs/History)
            if (isEditing && routineId) {
                console.log('Processing block updates...');

                // Fetch current blocks from DB to identify deletions
                const { data: dbBlocks } = await supabase
                    .from('routine_blocks')
                    .select('id')
                    .eq('routine_id', routineId);

                const dbBlockIds = dbBlocks?.map(b => b.id) || [];
                const currentBlockIds = formData.blocks.map(b => b.id).filter(Boolean);

                // Blocks to delete: in DB but not in current form
                const idsToDelete = dbBlockIds.filter(id => !currentBlockIds.includes(id));
                if (idsToDelete.length > 0) {
                    await supabase.from('routine_blocks').delete().in('id', idsToDelete);
                }

                // Split into updates and inserts
                for (let i = 0; i < formData.blocks.length; i++) {
                    const b = formData.blocks[i];
                    const blockPayload = {
                        routine_id: currentRoutineId,
                        type: b.type,
                        duration_minutes: isNaN(Number(b.duration_minutes)) ? 5 : Number(b.duration_minutes),
                        objective: b.objective || "",
                        order: i
                    };

                    if (b.id) {
                        // Update existing
                        await supabase.from('routine_blocks').update(blockPayload).eq('id', b.id);
                    } else {
                        // Insert new
                        await supabase.from('routine_blocks').insert(blockPayload);
                    }
                }
            } else {
                // New routine: simple insert
                if (formData.blocks.length > 0) {
                    console.log('Inserting new blocks...');
                    const { error: blocksError } = await supabase
                        .from('routine_blocks')
                        .insert(formData.blocks.map((b, idx) => ({
                            routine_id: currentRoutineId,
                            type: b.type,
                            duration_minutes: isNaN(Number(b.duration_minutes)) ? 5 : Number(b.duration_minutes),
                            objective: b.objective || "",
                            order: idx
                        })));

                    if (blocksError) throw new Error(`Error al crear los bloques: ${blocksError.message}`);
                }
            }

            // 3. Handle Context (Upsert)
            console.log('Saving context...');
            const contextPayload = {
                routine_id: currentRoutineId,
                location: formData.context.location || "",
                trigger: formData.context.trigger || "",
                non_negotiable_rules: formData.context.non_negotiable_rules || [],
                plan_b: formData.context.plan_b || ""
            };

            const { error: contextError } = await supabase
                .from('routine_context')
                .upsert(contextPayload, { onConflict: 'routine_id' });

            if (contextError) throw new Error(`Error al guardar el contexto: ${contextError.message}`);

            console.log('All operations completed successfully!');
            toast.success(isEditing ? "Rutina actualizada correctamente" : t("common.success"));
            router.push(isEditing ? `/routines/${currentRoutineId}` : '/routines');
        } catch (error: any) {
            console.error('Detailed Save Error:', error);
            toast.error(error.message || t("common.error"));
        } finally {
            setIsSaving(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && !formData.name) {
            toast.error("El nombre es obligatorio");
            return;
        }
        if (step === 4) handleSave();
        else setStep(step + 1);
    };

    const prevStep = () => setStep(step - 1);

    if (isLoading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent shadow-[0_0_20px_rgba(249,115,22,0.5)]" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-orange-500/30">
            {/* Nav */}
            <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 h-20 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all active:scale-95 group">
                        <ChevronLeft className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                    </button>
                    <div>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest block leading-none mb-1">
                            {isEditing ? "Ajusta tu Protocolo" : "Crea tu Identidad"}
                        </span>
                        <span className="text-lg font-black text-white tracking-tight">
                            {isEditing ? "Editar Rutina" : t("routines.wizard.title")}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-[0.2em]">
                        {isEditing ? "MODO EDICIÓN" : t("routines.wizard.mode")}
                    </div>
                </div>
            </header>

            {/* Stepper */}
            <div className="max-w-4xl w-full mx-auto px-4 py-10 flex-1">
                <div className="flex items-center justify-between mb-16 relative px-10">
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2 -z-10" />
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className="bg-slate-950 px-4">
                            <div
                                className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 border-2 ${step >= s
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-110'
                                    : 'bg-slate-900 border-white/5 text-slate-500'
                                    }`}
                            >
                                {step > s ? '✓' : s}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="glass-panel rounded-[40px] p-8 md:p-12 shadow-2xl relative"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-600 opacity-50" />
                        {step === 1 && (
                            <Step1Intention formData={formData} setFormData={setFormData} />
                        )}
                        {step === 2 && (
                            <Step2Blocks formData={formData} setFormData={setFormData} totalDuration={totalDuration} />
                        )}
                        {step === 3 && (
                            <Step3Context formData={formData} setFormData={setFormData} />
                        )}
                        {step === 4 && (
                            <Step4Commitment formData={formData} setFormData={setFormData} />
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Actions */}
                <div className="mt-12 flex items-center justify-between">
                    <button
                        onClick={prevStep}
                        disabled={step === 1}
                        className={`px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all text-slate-400 hover:text-white active:scale-95 ${step === 1 ? 'opacity-0 cursor-default' : ''
                            }`}
                    >
                        <ChevronLeft className="h-5 w-5" />
                        {t("common.back")}
                    </button>
                    <button
                        onClick={nextStep}
                        disabled={isSaving}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? t("common.saving") : step === 4 ? t("common.save") : t("common.next")}
                        {step < 4 && !isSaving && <ChevronRight className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Step1Intention({ formData, setFormData }: { formData: any, setFormData: any }) {
    const { t } = useLanguage();
    const emotionalStates: EmotionalState[] = ['En calma', 'Enfocado', 'Poderoso', 'Agradecido', 'Creativo'];

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step1.nameLabel")}</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 rounded-[20px] px-6 h-16 focus:ring-2 focus:ring-orange-500/50 focus:bg-white/10 outline-none transition-all text-white font-bold placeholder:text-slate-600 shadow-inner"
                        placeholder="Ej: Rutina Millonaria"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL de Imagen (Opcional)</label>
                    <input
                        type="text"
                        value={formData.image_url}
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 rounded-[20px] px-6 h-16 focus:ring-2 focus:ring-orange-500/50 focus:bg-white/10 outline-none transition-all text-white font-bold placeholder:text-slate-600 shadow-inner"
                        placeholder="https://..."
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step1.startTimeLabel")}</label>
                        <TimePicker
                            value={formData.start_time}
                            onChange={(val) => setFormData({ ...formData, start_time: val })}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step1.durationLabel")}</label>
                        <select
                            value={formData.ideal_duration_days}
                            onChange={e => setFormData({ ...formData, ideal_duration_days: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/5 rounded-[20px] px-6 h-16 focus:ring-2 focus:ring-orange-500/50 focus:bg-white/10 outline-none transition-all text-white font-bold cursor-pointer appearance-none shadow-inner"
                        >
                            {[7, 14, 21, 28, 60, 90].map(d => (
                                <option key={d} value={d} className="bg-slate-900 text-white">{d} Días</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step1.intentionLabel")}</label>
                <textarea
                    value={formData.intention}
                    onChange={e => setFormData({ ...formData, intention: e.target.value })}
                    className="w-full bg-white/5 border border-white/5 rounded-[24px] p-6 min-h-[140px] focus:ring-2 focus:ring-orange-500/50 focus:bg-white/10 outline-none transition-all text-white font-bold placeholder:text-slate-600 resize-none leading-relaxed shadow-inner"
                    placeholder="Lograr transformar mi vida a través de..."
                />
                <p className="text-[10px] font-medium text-slate-500 italic ml-1">{t("routines.wizard.step1.intentionSub")}</p>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step1.emotionLabel")}</label>
                <div className="flex flex-wrap gap-2.5">
                    {emotionalStates.map(state => (
                        <button
                            key={state}
                            onClick={() => {
                                const states = formData.emotional_states.includes(state)
                                    ? formData.emotional_states.filter((s: string) => s !== state)
                                    : [...formData.emotional_states, state];
                                setFormData({ ...formData, emotional_states: states });
                            }}
                            className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.emotional_states.includes(state)
                                ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {state}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-8 bg-orange-500/5 border border-orange-500/10 rounded-[32px] space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-3xl -mr-12 -mt-12" />
                <div className="flex items-center gap-3 text-orange-400 relative z-10">
                    <Zap className="h-5 w-5 fill-orange-400/20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("routines.wizard.step1.identityTip").split(".")[0]}</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed font-medium relative z-10">
                    {t("routines.wizard.step1.identityTip").split(".")[1]}.
                </p>
                <div className="pt-4 border-t border-white/5 relative z-10">
                    <p className="text-[10px] text-orange-400/60 font-black uppercase tracking-widest">
                        {t("routines.wizard.step1.durationTip")}
                    </p>
                </div>
            </div>
        </div>
    );
}

function Step2Blocks({ formData, setFormData, totalDuration }: { formData: any, setFormData: any, totalDuration: number }) {
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [newBlock, setNewBlock] = useState<Partial<RoutineBlock>>({
        type: "Gratitud",
        duration_minutes: 5,
        objective: ""
    });

    const addBlock = () => {
        setFormData({
            ...formData,
            blocks: [...formData.blocks, { ...newBlock, order: formData.blocks.length }]
        });
        setNewBlock({ type: "Gratitud", duration_minutes: 5, objective: "" });
        setShowForm(false);
    };

    const removeBlock = (idx: number) => {
        setFormData({
            ...formData,
            blocks: formData.blocks.filter((_: any, i: number) => i !== idx)
        });
    };

    const moveBlock = (idx: number, direction: 'up' | 'down') => {
        const newBlocks = [...formData.blocks];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newBlocks.length) return;

        [newBlocks[idx], newBlocks[targetIdx]] = [newBlocks[targetIdx], newBlocks[idx]];

        setFormData({
            ...formData,
            blocks: newBlocks
        });
    };

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">{t("routines.wizard.step2.title")}</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{t("routines.wizard.step2.subtitle")}</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/10">
                    {t("routines.wizard.step2.totalDuration")}: <span className="text-white ml-1">{totalDuration} MIN</span>
                </div>
            </div>

            <div className="space-y-4">
                {formData.blocks.map((block: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-6 bg-white/[0.02] p-6 rounded-[28px] group transition-all hover:bg-white/[0.05] border border-white/5 hover:border-white/10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/30 group-hover:bg-orange-500 transition-all" />
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => moveBlock(idx, 'up')}
                                disabled={idx === 0}
                                className={`p-1.5 rounded-lg hover:bg-white/5 transition-all ${idx === 0 ? 'opacity-0' : 'text-slate-600 hover:text-orange-400'}`}
                            >
                                <ChevronUp className="h-4 w-4" />
                            </button>
                            <div className="h-8 w-8 bg-white/5 rounded-xl flex items-center justify-center font-black text-slate-500 text-xs border border-white/5 group-hover:border-orange-500/20 group-hover:text-orange-400 transition-all">
                                {idx + 1}
                            </div>
                            <button
                                onClick={() => moveBlock(idx, 'down')}
                                disabled={idx === formData.blocks.length - 1}
                                className={`p-1.5 rounded-lg hover:bg-white/5 transition-all ${idx === formData.blocks.length - 1 ? 'opacity-0' : 'text-slate-600 hover:text-orange-400'}`}
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                                <span className="font-black text-white text-lg tracking-tight">{block.type}</span>
                                <span className="px-2 py-0.5 bg-white/5 text-slate-500 rounded-md text-[8px] font-black border border-white/5">{block.duration_minutes} MIN</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium line-clamp-1">{block.objective}</p>
                        </div>
                        <button
                            onClick={() => removeBlock(idx)}
                            className="p-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all font-bold bg-white/5 rounded-xl border border-white/5 hover:bg-red-400/10 active:scale-95"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}

                {formData.blocks.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
                        <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <ListChecks className="h-6 w-6 text-slate-700" />
                        </div>
                        <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">{t("routines.wizard.step2.noBlocks")}</p>
                    </div>
                )}

                {!showForm ? (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full py-6 border-2 border-dashed border-orange-500/20 text-orange-400/60 rounded-[32px] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-orange-500/5 hover:border-orange-500/40 hover:text-orange-400 transition-all active:scale-[0.99]"
                    >
                        <Plus className="h-4 w-4" />
                        {t("routines.wizard.step2.addBlock")}
                    </button>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-8 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-orange-500" />
                        <h3 className="font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
                            <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                            {t("routines.wizard.step2.form.title")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step2.form.typeLabel")}</label>
                                <select
                                    value={newBlock.type}
                                    onChange={e => setNewBlock({ ...newBlock, type: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-[20px] px-6 h-14 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all cursor-pointer font-bold text-white appearance-none shadow-inner"
                                >
                                    <option className="bg-slate-900">Gratitud</option>
                                    <option className="bg-slate-900">Meditación</option>
                                    <option className="bg-slate-900">Journal</option>
                                    <option className="bg-slate-900">Lectura</option>
                                    <option className="bg-slate-900">Movimiento</option>
                                    <option className="bg-slate-900">Hidratación</option>
                                    <option className="bg-slate-900">Silencio</option>
                                    <option className="bg-slate-900">Visualización</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step2.form.timeLabel")}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={newBlock.duration_minutes}
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            setNewBlock({ ...newBlock, duration_minutes: isNaN(val) ? 0 : val });
                                        }}
                                        className="w-full bg-slate-950 border border-white/5 rounded-[20px] px-6 h-14 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-bold text-white shadow-inner"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase tracking-widest">MIN</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step2.form.objectiveLabel")}</label>
                            <textarea
                                value={newBlock.objective}
                                onChange={e => setNewBlock({ ...newBlock, objective: e.target.value })}
                                className="w-full bg-slate-950 border border-white/5 rounded-[24px] p-6 min-h-[120px] focus:ring-2 focus:ring-orange-500/50 outline-none transition-all resize-none font-bold text-white placeholder:text-slate-700 leading-relaxed shadow-inner"
                                placeholder="Ej: Dar gracias por 3 cosas específicas..."
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 py-5 bg-white/5 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/5"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={addBlock}
                                className="flex-[2] py-5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-orange-500/20 hover:from-orange-600 hover:to-amber-700 transition-all active:scale-95"
                            >
                                {t("routines.wizard.step2.form.createBtn")}
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function Step3Context({ formData, setFormData }: { formData: any, setFormData: any }) {
    const { t } = useLanguage();
    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step3.locationLabel")}</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.context.location}
                            onChange={e => setFormData({ ...formData, context: { ...formData.context, location: e.target.value } })}
                            className="w-full bg-white/5 border border-white/5 rounded-[20px] px-6 h-16 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-white font-bold placeholder:text-slate-700 shadow-inner"
                            placeholder="Ej: Sala de estar, Escritorio..."
                        />
                        <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step3.triggerLabel")}</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.context.trigger}
                            onChange={e => setFormData({ ...formData, context: { ...formData.context, trigger: e.target.value } })}
                            className="w-full bg-white/5 border border-white/5 rounded-[20px] px-6 h-16 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-white font-bold placeholder:text-slate-700 shadow-inner"
                            placeholder="Ej: Levantarme, Escuchar la alarma..."
                        />
                        <Zap className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                    </div>
                </div>
            </div>

            <div className="space-y-5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step3.rulesLabel")}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['Sin celular', 'Sin redes sociales', 'En silencio', 'Antes del trabajo'].map(rule => (
                        <button
                            key={rule}
                            onClick={() => {
                                const rules = formData.context.non_negotiable_rules.includes(rule)
                                    ? formData.context.non_negotiable_rules.filter((r: string) => r !== rule)
                                    : [...formData.context.non_negotiable_rules, rule];
                                setFormData({ ...formData, context: { ...formData.context, non_negotiable_rules: rules } });
                            }}
                            className={`flex items-center gap-4 p-5 rounded-[24px] border transition-all relative overflow-hidden group ${formData.context.non_negotiable_rules.includes(rule)
                                ? 'bg-orange-500/10 border-orange-500/30 text-white shadow-lg shadow-orange-500/5'
                                : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10'
                                }`}
                        >
                            <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.context.non_negotiable_rules.includes(rule)
                                ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                                : 'border-white/10 bg-slate-950'
                                }`}>
                                {formData.context.non_negotiable_rules.includes(rule) && '✓'}
                            </div>
                            <span className="font-black text-xs uppercase tracking-widest">{rule}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("routines.wizard.step3.planBLabel")}</label>
                <textarea
                    value={formData.context.plan_b}
                    onChange={e => setFormData({ ...formData, context: { ...formData.context, plan_b: e.target.value } })}
                    className="w-full bg-white/5 border border-white/5 rounded-[24px] p-6 min-h-[140px] focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-white font-bold placeholder:text-slate-700 resize-none leading-relaxed shadow-inner"
                    placeholder="En días sin tiempo: 1 min meditación, 1 min hidratación..."
                />
                <p className="text-[10px] font-medium text-slate-500 italic ml-1">{t("routines.wizard.step3.planBSub")}</p>
            </div>
        </div>
    );
}

function Step4Commitment({ formData, setFormData }: { formData: any, setFormData: any }) {
    const { t } = useLanguage();
    return (
        <div className="space-y-10 text-center">
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("routines.wizard.step4.commitmentLabel")}</label>
                <textarea
                    value={formData.commitment_statement}
                    onChange={e => setFormData({ ...formData, commitment_statement: e.target.value })}
                    className="w-full bg-transparent border-none rounded-none p-0 min-h-[180px] focus:ring-0 outline-none transition-all text-white text-3xl md:text-4xl font-black tracking-tighter italic text-center placeholder:text-slate-900 leading-[1.1]"
                    placeholder="Yo me comprometo a..."
                />
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto" />
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
                <button
                    onClick={() => setFormData({ ...formData, acceptance_of_resistance: !formData.acceptance_of_resistance })}
                    className={`flex items-start gap-6 p-8 rounded-[40px] border transition-all relative overflow-hidden text-left ${formData.acceptance_of_resistance
                        ? 'bg-orange-500/10 border-orange-500/30 ring-1 ring-orange-500/20 shadow-2xl shadow-orange-500/10'
                        : 'bg-white/5 border-white/5'
                        }`}
                >
                    <div className={`mt-1 h-8 w-8 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ${formData.acceptance_of_resistance
                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                        : 'border-white/10 bg-slate-950 text-transparent'
                        }`}>
                        ✓
                    </div>
                    <div>
                        <h4 className={`font-black text-xl tracking-tight ${formData.acceptance_of_resistance ? 'text-white' : 'text-slate-500'}`}>
                            {t("routines.wizard.step4.resistanceLabel")}
                        </h4>
                        <p className={`text-sm mt-2 leading-relaxed font-medium ${formData.acceptance_of_resistance ? 'text-slate-400' : 'text-slate-600'}`}>
                            Soy consciente de que mi cerebro buscará el camino fácil. Acepto el desafío de forjar mi nueva identidad a pesar de la resistencia.
                        </p>
                    </div>
                </button>

                <div className="grid grid-cols-2 gap-6">
                    <div className="glass-panel p-8 rounded-[32px] space-y-2 border-white/5 flex flex-col items-center">
                        <div className="h-10 w-10 bg-white/5 rounded-2xl flex items-center justify-center mb-3 border border-white/5 shadow-inner">
                            <Target className="h-5 w-5 text-orange-400" />
                        </div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{t("routines.wizard.steps.intention")}</span>
                        <p className="font-black text-white text-sm mt-1 line-clamp-1">{formData.name || "Sin nombre"}</p>
                    </div>
                    <div className="glass-panel p-8 rounded-[32px] space-y-2 border-white/5 flex flex-col items-center">
                        <div className="h-10 w-10 bg-white/5 rounded-2xl flex items-center justify-center mb-3 border border-white/5 shadow-inner">
                            <Heart className="h-5 w-5 text-amber-500" />
                        </div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{t("routines.wizard.steps.blocks")}</span>
                        <p className="font-black text-white text-sm mt-1">{formData.blocks.length} BLOQUES</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 py-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 scale-150 animate-pulse" />
                    <ShieldCheck className="h-16 w-16 text-orange-500 relative z-10 drop-shadow-2xl" />
                </div>
                <div>
                    <p className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Identidad Confirmada</p>
                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest mt-1">Contrato de Forja Digital</p>
                </div>
            </div>
        </div>
    );
}

function TimePicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, mins] = value.split(':').map(Number);

    const setHours = (h: number) => {
        onChange(`${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    };

    const setMins = (m: number) => {
        onChange(`${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/5 border border-white/5 rounded-[20px] px-6 h-16 flex items-center justify-between focus:ring-2 focus:ring-orange-500/50 focus:bg-white/10 outline-none transition-all text-white font-bold shadow-inner group"
            >
                <span className="text-xl tracking-tighter group-active:scale-95 transition-transform">{value}</span>
                <Clock className={`h-5 w-5 transition-colors ${isOpen ? 'text-orange-500' : 'text-slate-500'}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute top-full mt-4 left-0 right-0 md:left-auto md:w-64 bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] flex gap-4 ring-1 ring-white/10"
                        >
                            <div className="flex-1 space-y-3">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Horas</p>
                                <div className="h-40 overflow-y-auto custom-scrollbar space-y-1">
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setHours(i)}
                                            className={`w-full py-2.5 rounded-xl text-xs font-black transition-all ${hours === i ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {i.toString().padStart(2, '0')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 space-y-3">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Minutos</p>
                                <div className="h-40 overflow-y-auto custom-scrollbar space-y-1">
                                    {Array.from({ length: 60 }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setMins(i)}
                                            className={`w-full py-2.5 rounded-xl text-xs font-black transition-all ${mins === i ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {i.toString().padStart(2, '0')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
