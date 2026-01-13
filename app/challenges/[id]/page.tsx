"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft, Heart, Layers, Map, BookOpen,
    Share2, Trash2, CheckCircle, Clock
} from "lucide-react";
import Link from "next/link";
import { Challenge } from "@/types/challenges";
import { Button } from "@/components/ui/button";
import { PurposeSection } from "@/components/challenges/purpose-section";
import { ResourcesTab } from "@/components/challenges/resources-tab";
import { RoadmapTab } from "@/components/challenges/roadmap-tab";
import { LogbookTab } from "@/components/challenges/logbook-tab";
import { AIAssistant } from "@/components/challenges/ai-assistant";

import { supabase } from "@/lib/supabase";

export default function ChallengeDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [activeTab, setActiveTab] = useState<"purpose" | "resources" | "roadmap" | "logbook">("purpose");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchFullChallenge();
    }, [id]);

    const fetchFullChallenge = async () => {
        setLoading(true);
        try {
            // 1. Fetch main challenge data
            const { data: challengeData, error: challengeError } = await supabase
                .from("challenges")
                .select("*")
                .eq("id", id)
                .single();

            if (challengeError || !challengeData) throw challengeError;

            // 2. Fetch resources
            const { data: resources } = await supabase
                .from("challenge_resources")
                .select("*")
                .eq("challenge_id", id);

            // 3. Fetch roadmap
            const { data: roadmapItems } = await supabase
                .from("challenge_roadmap")
                .select("*")
                .eq("challenge_id", id);

            // 4. Fetch logbook
            const { data: logbookItems } = await supabase
                .from("challenge_logbook")
                .select("*")
                .eq("challenge_id", id)
                .order("created_at", { ascending: false });

            // Construct the Challenge object
            const constructed: Challenge = {
                id: challengeData.id,
                name: challengeData.name,
                cover_image: challengeData.cover_image,
                coverImage: challengeData.cover_image,
                status: challengeData.status,
                createdAt: challengeData.created_at,
                purpose: {
                    motivation: challengeData.motivation || "",
                    transformation: challengeData.transformation || ""
                },
                resources: (resources || []).map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    type: r.type,
                    acquired: r.acquired
                })),
                roadmap: {
                    milestones: (roadmapItems || []).filter((i: any) => i.type === 'milestone').map((i: any) => ({
                        id: i.id,
                        title: i.title,
                        completed: i.completed,
                        status: i.completed ? 'completed' : 'pending',
                        priority: 'medium'
                    })),
                    habits: (roadmapItems || []).filter((i: any) => i.type === 'habit').map((i: any) => ({
                        id: i.id,
                        title: i.title,
                        frequency: 'diaria',
                        completedDays: i.completed_days || []
                    })),
                    tasks: (roadmapItems || []).filter((i: any) => i.type === 'task').map((i: any) => ({
                        id: i.id,
                        title: i.title,
                        completed: i.completed
                    }))
                },
                logbook: (logbookItems || []).map((n: any) => ({
                    id: n.id,
                    content: n.content,
                    type: n.type,
                    audioUrl: n.audio_url,
                    timestamp: n.created_at
                }))
            };

            setChallenge(constructed);
        } catch (err) {
            console.error("Error loading challenge:", err);
            router.push("/challenges");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando con la nube...</div>;
    if (!challenge) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">No se encontró el desafío.</div>;

    const updateChallenge = async (updated: Challenge) => {
        // This is a local update helper, but we'll also trigger the DB update if it's a direct field change on the challenge
        setChallenge(updated);

        // Auto-save the purpose fields if they changed
        await supabase
            .from("challenges")
            .update({
                motivation: updated.purpose.motivation,
                transformation: updated.purpose.transformation
            })
            .eq("id", id);
    };

    const handleAddResource = async (title: string, type: "skill" | "equipment") => {
        const { data, error } = await supabase
            .from("challenge_resources")
            .insert([{ challenge_id: id, title, type, acquired: false }])
            .select()
            .single();

        if (!error) fetchFullChallenge();
    };

    const handleAddRoadmap = async (title: string, type: "milestone" | "task" | "habit") => {
        const { data, error } = await supabase
            .from("challenge_roadmap")
            .insert([{ challenge_id: id, title, type, completed: false, completed_days: [] }])
            .select()
            .single();

        if (!error) fetchFullChallenge();
    };

    const tabs = [
        { id: "purpose", label: "Propósito", icon: Heart },
        { id: "resources", label: "Recursos", icon: Layers },
        { id: "roadmap", label: "Hoja de Ruta", icon: Map },
        { id: "logbook", label: "Bitácora", icon: BookOpen },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
            {/* Hero Section */}
            <header className="relative h-[40vh] md:h-[50vh] overflow-hidden">
                <img
                    src={challenge.coverImage}
                    alt={challenge.name}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950" />

                <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-slate-950/80 to-transparent">
                    <Link href="/challenges" className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px] bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 hover:bg-white/20 transition-all">
                        <ChevronLeft className="h-4 w-4" />
                        Volver a mis Desafíos
                    </Link>
                    <div className="flex items-center gap-3">
                        {challenge.status === "active" && (
                            <button
                                onClick={async () => {
                                    const { error } = await supabase.from("challenges").update({ status: "completed" }).eq("id", id);
                                    if (!error) fetchFullChallenge();
                                }}
                                className="hidden md:flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/40"
                            >
                                <CheckCircle className="h-4 w-4" /> Marcar como Completado
                            </button>
                        )}
                        <button className="p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/50 hover:text-white transition-colors">
                            <Share2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={async () => {
                                if (confirm("¿Estás seguro de que quieres eliminar este Misogi? Esta acción no se puede deshacer.")) {
                                    const { error } = await supabase.from("challenges").delete().eq("id", id);
                                    if (!error) router.push("/challenges");
                                }
                            }}
                            className="p-3 rounded-full bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-6xl mx-auto space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20">
                            Año {new Date(challenge.createdAt || new Date()).getFullYear()}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                            <CheckCircle className="h-3 w-3" /> Misogi Activo
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black tracking-tight">{challenge.name}</h1>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-6">
                <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto no-scrollbar py-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-bold text-sm whitespace-nowrap
                                ${activeTab === tab.id
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                }
                            `}
                        >
                            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-white" : "text-slate-600"}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <main className="max-w-6xl mx-auto p-6 md:p-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === "purpose" && (
                            <PurposeSection challenge={challenge} onUpdate={updateChallenge} />
                        )}
                        {activeTab === "resources" && (
                            <ResourcesTab challenge={challenge} onUpdate={updateChallenge} />
                        )}
                        {activeTab === "roadmap" && (
                            <RoadmapTab challenge={challenge} onUpdate={updateChallenge} />
                        )}
                        {activeTab === "logbook" && (
                            <LogbookTab challenge={challenge} onUpdate={updateChallenge} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            <AIAssistant
                challenge={challenge}
                onUpdate={updateChallenge}
                onAddResource={handleAddResource}
                onAddRoadmap={handleAddRoadmap}
            />
        </div>
    );
}
