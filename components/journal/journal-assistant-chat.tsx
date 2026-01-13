"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, BookOpen, Target, Brain, Heart, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const INTROSPECTION_PROMPTS = [
    { id: "gratitude", labelKey: "journal.assistant.gratitude", prompt: "Quiero reflexionar sobre lo que agradezco hoy." },
    { id: "pattern", labelKey: "journal.assistant.pattern", prompt: "¿Viste algún patrón en mis últimas reflexiones?" },
    { id: "emotion", labelKey: "journal.assistant.emotion", prompt: "Me siento un poco abrumado, ayúdame a procesarlo." },
    { id: "growth", labelKey: "journal.assistant.growth", prompt: "¿En qué área crees que estoy creciendo más?" }
];

export function JournalAssistantChat() {
    const { t, language } = useLanguage();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalized, setIsFinalized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Only show on journal pages
    if (!pathname?.includes("/journal")) return null;

    const handleSend = async (content: string) => {
        if (!content.trim() || isLoading) return;

        const userMsg = { role: "user", content };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/journal/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    entryDate: new Date().toISOString().split('T')[0],
                    context: { language }
                })
            });
            const data = await res.json();
            if (data.message) {
                setMessages(prev => [...prev, { role: "model", content: data.message }]);

                if (data.isFinalEntry && data.aiFeedback) {
                    await saveEntry(messages, userMsg, data.aiFeedback);
                    setIsFinalized(true);
                }
            }
        } catch (error) {
            console.error("Journal Assistant error:", error);
            setMessages(prev => [...prev, { role: "model", content: t("journal.assistant.error") || "Error connecting..." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveEntry = async (history: any[], lastUserMsg: any, aiFeedback: any) => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const userContent = [...history, lastUserMsg]
                .filter(m => m.role === "user")
                .map(m => m.content)
                .join("\n\n");

            const { error } = await supabase
                .from("journal_records")
                .insert([{
                    user_id: user.id,
                    entry_date: new Date().toISOString().split('T')[0],
                    user_content: userContent,
                    chat_history: [...history, lastUserMsg, { role: "model", content: aiFeedback.assistance }],
                    ai_feedback: {
                        recommendations: aiFeedback.recommendations || [],
                        work_points: aiFeedback.workPoints || [],
                        focus_areas: aiFeedback.focusAreas || [],
                        alerts: aiFeedback.alerts || [],
                        assistance: aiFeedback.assistance || ""
                    },
                    status: "finalized",
                    mood: aiFeedback.mood,
                    summary: aiFeedback.summary || "Reflexión con IA",
                    type: "text"
                }]);

            if (error) throw error;

            toast.success(t("common.success"));
            // Dispatch event to refresh JournalView entries
            window.dispatchEvent(new CustomEvent("journal-entry-saved"));

        } catch (error) {
            console.error("Error auto-saving journal:", error);
            toast.error(t("common.error"));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-jakarta">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="mb-4 w-[380px] h-[550px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 bg-slate-950/50 flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xs uppercase tracking-widest text-white">Guía de Bitácora</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">En sintonía</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/20 no-scrollbar">
                            {messages.length === 0 && (
                                <div className="space-y-6">
                                    <div className="p-6 bg-white/5 border border-white/5 rounded-2xl shadow-sm">
                                        <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                                            {t("journal.assistant.welcome") || "Hola. Estoy aquí para acompañar tu reflexión. ¿Qué hay en tu mente?"}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {INTROSPECTION_PROMPTS.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleSend(s.prompt)}
                                                className="text-left px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-between group"
                                            >
                                                {t(s.labelKey) || s.id}
                                                <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-[20px] text-sm ${m.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-900/20'
                                        : 'bg-slate-800/80 border border-white/5 text-slate-200 shadow-sm rounded-tl-none font-medium leading-relaxed'
                                        }`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800/50 border border-white/5 p-4 rounded-2xl rounded-tl-none">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-slate-950 border-t border-white/5 flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                                placeholder={t("journal.assistant.placeholder") || "Escribe tu reflexión..."}
                                disabled={isLoading || isSaving}
                                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-700 transition-all font-medium disabled:opacity-50"
                            />
                            <div className="flex gap-2">
                                {messages.length > 0 && !isFinalized && (
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => handleSend("Guardar esta sesión ahora")}
                                        disabled={isLoading || isSaving}
                                        className="border-white/10 hover:bg-white/5 rounded-xl shrink-0"
                                        title="Guardar sesión"
                                    >
                                        <Save className="h-4 w-4 text-slate-400" />
                                    </Button>
                                )}
                                <Button
                                    size="icon"
                                    onClick={() => handleSend(input)}
                                    disabled={isLoading || isSaving || !input.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shrink-0 shadow-lg shadow-indigo-900/20"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="h-16 w-16 bg-slate-950 rounded-full shadow-2xl flex items-center justify-center text-white border-2 border-white/10 overflow-hidden relative group"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-700 to-indigo-400 opacity-20 group-hover:opacity-40 transition-opacity" />
                <Brain className="h-7 w-7 relative z-10 text-indigo-400" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 rounded-full border-2 border-slate-950 animate-pulse" />
            </motion.button>
        </div>
    );
}
