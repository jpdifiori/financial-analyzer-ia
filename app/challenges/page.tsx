"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, Calendar, Trophy, ArrowRight, Image as ImageIcon, X, ChevronLeft, Brain } from "lucide-react";
import Link from "next/link";
import { Challenge } from "@/types/challenges";
import { Button } from "@/components/ui/button";

import { supabase } from "@/lib/supabase";

import { useLanguage } from "@/context/language-context";

export default function ChallengesDashboard() {
    const { t } = useLanguage();
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createMode, setCreateMode] = useState<"selection" | "manual" | "ai">("selection");
    const [newChallenge, setNewChallenge] = useState({ name: "", coverImage: "" });
    const [loading, setLoading] = useState(true);

    // AI Coach State
    const [chatMessages, setChatMessages] = useState<{ role: "user" | "model", content: string }[]>([]);
    const [aiInput, setAiInput] = useState("");
    const [isAILoading, setIsAILoading] = useState(false);
    const [extractedData, setExtractedData] = useState<any>({});

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("challenges")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching challenges:", error);
        } else {
            const mapped = (data || []).map((c: any) => ({
                ...c,
                coverImage: c.cover_image,
            }));
            setChallenges(mapped);
        }
        setLoading(false);
    };

    const handleCreate = async (data?: any) => {
        const finalName = data?.name || newChallenge.name;
        if (!finalName) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: challenge, error } = await supabase
            .from("challenges")
            .insert([{
                user_id: session.user.id,
                name: finalName,
                cover_image: data?.coverImage || newChallenge.coverImage || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000",
                motivation: data?.motivation || "",
                transformation: data?.transformation || "",
                status: "active"
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creating challenge:", error);
            return;
        }

        if (data?.resources?.length > 0) {
            await supabase.from("challenge_resources").insert(
                data.resources.map((r: any) => ({
                    challenge_id: challenge.id,
                    title: r.title,
                    type: r.type,
                }))
            );
        }

        if (data?.roadmap?.length > 0) {
            await supabase.from("challenge_roadmap").insert(
                data.roadmap.map((r: any) => ({
                    challenge_id: challenge.id,
                    title: r.title,
                    type: r.type,
                }))
            );
        }

        fetchChallenges();
        setShowCreateModal(false);
        setNewChallenge({ name: "", coverImage: "" });
        setCreateMode("selection");
        setChatMessages([]);
        setExtractedData({});
    };

    const handleSendMessage = async () => {
        if (!aiInput.trim() || isAILoading) return;

        const userMessage = { role: "user" as const, content: aiInput };
        const newMessages = [...chatMessages, userMessage];
        setChatMessages(newMessages);
        setAiInput("");
        setIsAILoading(true);

        try {
            const response = await fetch("/api/challenges/coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
                    currentData: extractedData
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setChatMessages([...newMessages, { role: "model", content: data.message }]);
            if (data.extractedData) {
                setExtractedData(data.extractedData);
            }
        } catch (error) {
            console.error("Error in AI Coach:", error);
        } finally {
            setIsAILoading(false);
        }
    };

    const startAICoach = () => {
        setCreateMode("ai");
        setChatMessages([{ role: "model", content: t("challenges.coach.welcome") }]);
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Sincronizando...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12 overflow-x-hidden">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-8">
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                            <ChevronLeft className="h-4 w-4" />
                            {t("challenges.backToControl")}
                        </Link>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
                            {t("challenges.title").split(' ')[0]} <span className="text-indigo-500">{t("challenges.title").split(' ').slice(1).join(' ')}</span>
                        </h1>
                        <p className="text-slate-400 max-w-lg font-medium italic">
                            {t("challenges.description")}
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] px-8 py-8 md:py-10 text-lg md:text-xl font-black shadow-2xl shadow-indigo-600/30 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        <Plus className="mr-3 h-6 w-6" /> {t("challenges.newMisogi")}
                    </Button>
                </div>

                {/* Grid */}
                {challenges.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center space-y-8 glass-panel rounded-[40px] border-dashed">
                        <div className="h-24 w-24 bg-slate-900/50 rounded-full flex items-center justify-center animate-pulse">
                            <Target className="h-10 w-10 text-slate-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-white">{t("challenges.noChallenges")}</h2>
                            <p className="text-slate-500 max-w-sm">{t("challenges.callToAction")}</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateModal(true)}
                            className="border-slate-800 text-slate-400 hover:bg-slate-900 rounded-2xl px-10 font-bold"
                        >
                            {t("challenges.startNow")}
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {challenges.map((challenge) => (
                            <Link
                                key={challenge.id}
                                href={`/challenges/${challenge.id}`}
                                className="group relative aspect-[4/5] rounded-[40px] overflow-hidden border border-white/5 bg-slate-900 flex flex-col justify-end shadow-2xl transition-all duration-700 hover:shadow-indigo-500/20 hover:scale-[1.02] hover:border-white/20"
                            >
                                <img
                                    src={challenge.coverImage}
                                    alt={challenge.name}
                                    className="absolute inset-0 w-full h-full object-cover opacity-80 saturate-[1.2] brightness-90 group-hover:scale-110 transition-transform duration-[2000ms] ease-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />

                                <div className="relative p-8 md:p-10 space-y-5 backdrop-blur-sm bg-slate-950/20">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md transition-colors ${challenge.status === 'active'
                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20'
                                            }`}>
                                            {challenge.status === 'active' ? t("challenges.active") : t("challenges.completed")}
                                        </span>
                                        <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                            {new Date(challenge.created_at || "").getFullYear()}
                                        </span>
                                    </div>
                                    <h3 className="text-4xl md:text-5xl font-black leading-none text-white group-hover:text-indigo-300 transition-colors tracking-tighter drop-shadow-2xl">
                                        {challenge.name}
                                    </h3>
                                    <div className="pt-6 flex items-center justify-between border-t border-white/10 group-hover:border-white/20 transition-colors">
                                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                            <Target className="h-4 w-4 text-indigo-500" />
                                            <span className="group-hover:text-white transition-colors">{t("challenges.misogiLevel")}</span>
                                        </div>
                                        <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:scale-110 transition-all shadow-xl">
                                            <ArrowRight className="h-6 w-6" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className={`relative w-full ${createMode === 'ai' ? 'max-w-3xl' : 'max-w-xl'} bg-slate-900 border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl flex flex-col max-h-[95vh]`}
                        >
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setCreateMode("selection");
                                    setChatMessages([]);
                                }}
                                className="absolute top-8 right-8 h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all z-20"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {createMode === "selection" && (
                                <div className="space-y-10 py-6">
                                    <div className="space-y-4 text-center">
                                        <div className="h-20 w-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                            <Trophy className="h-10 w-10 text-indigo-500" />
                                        </div>
                                        <h2 className="text-4xl font-black tracking-tighter">{t("challenges.create.title")}</h2>
                                        <p className="text-slate-400 font-medium italic">{t("challenges.create.subtitle")}</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <button
                                            onClick={startAICoach}
                                            className="group relative p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[32px] text-left hover:bg-indigo-600/10 transition-all duration-500 overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                                                <Brain className="h-24 w-24 text-indigo-500" />
                                            </div>
                                            <div className="flex items-center gap-6 mb-4">
                                                <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                                                    <Target className="h-8 w-8" />
                                                </div>
                                                <h3 className="text-2xl font-black">{t("challenges.create.aiOption")}</h3>
                                            </div>
                                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{t("challenges.create.aiDescription")}</p>
                                        </button>

                                        <button
                                            onClick={() => setCreateMode("manual")}
                                            className="group relative p-8 bg-white/5 border border-white/5 rounded-[32px] text-left hover:bg-white/10 transition-all duration-500"
                                        >
                                            <div className="flex items-center gap-6 mb-4">
                                                <div className="p-4 bg-slate-800 rounded-2xl text-slate-400">
                                                    <Plus className="h-8 w-8" />
                                                </div>
                                                <h3 className="text-2xl font-black">{t("challenges.create.manualOption")}</h3>
                                            </div>
                                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{t("challenges.create.manualDescription")}</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {createMode === "manual" && (
                                <div className="space-y-10 py-6">
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => setCreateMode("selection")} className="h-12 w-12 rounded-full border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                                            <ChevronLeft className="h-6 w-6" />
                                        </button>
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-black tracking-tighter">{t("challenges.create.manualOption")}</h2>
                                            <p className="text-slate-400 text-sm italic font-medium">Define los pilares de tu desafío.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Nombre del Desafío</label>
                                            <input
                                                type="text"
                                                placeholder={t("challenges.create.namePlaceholder")}
                                                value={newChallenge.name}
                                                onChange={(e) => setNewChallenge({ ...newChallenge, name: e.target.value })}
                                                className="w-full bg-slate-950 border border-white/5 rounded-[24px] px-8 py-6 text-xl text-white font-bold focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">URL Imagen de Portada (Opcional)</label>
                                            <div className="relative">
                                                <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-700" />
                                                <input
                                                    type="text"
                                                    placeholder="https://..."
                                                    value={newChallenge.coverImage}
                                                    onChange={(e) => setNewChallenge({ ...newChallenge, coverImage: e.target.value })}
                                                    className="w-full bg-slate-950 border border-white/5 rounded-[24px] pl-16 pr-8 py-6 text-lg text-white font-bold focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-6 pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCreateMode("selection")}
                                            className="flex-1 border-white/5 text-slate-500 hover:text-white hover:bg-white/5 rounded-[24px] py-8 font-black uppercase tracking-widest text-xs"
                                        >
                                            Atrás
                                        </Button>
                                        <Button
                                            onClick={() => handleCreate()}
                                            disabled={!newChallenge.name}
                                            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] py-8 text-xl font-black shadow-xl shadow-indigo-600/20 transition-all"
                                        >
                                            {t("challenges.create.manualOption")}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {createMode === "ai" && (
                                <div className="flex flex-col h-full space-y-8 py-4">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-8">
                                        <div className="flex items-center gap-6">
                                            <div className="h-16 w-16 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-[20px] flex items-center justify-center shadow-xl shadow-indigo-900/40">
                                                <Trophy className="h-8 w-8 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black tracking-tighter">{t("challenges.coach.title")}</h2>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-black">{t("challenges.coach.online")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleCreate(extractedData)}
                                            disabled={!extractedData.name && !newChallenge.name}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-12 text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-900/40"
                                        >
                                            {t("challenges.create.saveNow")}
                                        </Button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto min-h-[350px] space-y-6 p-6 md:p-10 bg-slate-950/50 rounded-[32px] border border-white/5 no-scrollbar scroll-smooth">
                                        {chatMessages.map((msg, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[85%] p-6 md:p-8 rounded-[28px] text-base md:text-lg leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white rounded-tr-none font-bold shadow-xl shadow-indigo-900/20'
                                                    : 'bg-slate-800/80 text-slate-200 border border-white/5 rounded-tl-none font-medium italic backdrop-blur-md'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                            </motion.div>
                                        ))}
                                        {isAILoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-slate-800/50 p-6 rounded-[24px] rounded-tl-none flex gap-2">
                                                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                                                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                                                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder={t("challenges.coach.inputPlaceholder")}
                                                value={aiInput}
                                                onChange={(e) => setAiInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                className="w-full bg-slate-950 border border-white/5 rounded-[28px] pl-8 pr-20 py-6 md:py-8 text-lg text-white font-bold focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 shadow-2xl"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!aiInput.trim() || isAILoading}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 md:h-16 md:w-16 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-900 disabled:text-slate-700 rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-indigo-600/20"
                                            >
                                                <ArrowRight className="h-6 w-6 md:h-8 md:w-8" />
                                            </button>
                                        </div>

                                        {extractedData.name && (
                                            <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[28px] flex items-center justify-between group">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 opacity-60">{t("challenges.create.detectedReto")}</p>
                                                    <p className="text-lg font-black text-white italic tracking-tight">{extractedData.name}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleCreate(extractedData)}
                                                    className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-full h-10 px-6 font-black uppercase tracking-widest text-[9px] transition-all"
                                                >
                                                    Confirmar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
