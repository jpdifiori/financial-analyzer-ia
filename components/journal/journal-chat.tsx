"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, Mic, Save, X, Bot, Info, AlertCircle, CheckCircle2, Shuffle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { JournalEntry, JournalAIFeedback, JournalCategory, JournalQuestion } from "@/types/journal";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface JournalChatProps {
    selectedDate: Date;
    onEntrySaved: (entry: any) => void;
}

export function JournalChat({ selectedDate, onEntrySaved }: JournalChatProps) {
    const { t, language } = useLanguage();
    const [categories, setCategories] = useState<JournalCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<JournalCategory | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<JournalQuestion | null>(null);

    const [messages, setMessages] = useState<{ role: "user" | "model"; content: string; feedback?: JournalAIFeedback }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [finalFeedback, setFinalFeedback] = useState<JournalAIFeedback | null>(null);
    const [hasUsedVoice, setHasUsedVoice] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        fetch("/api/prompts")
            .then(res => res.json())
            .then(data => setCategories(data));
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const selectCategory = (cat: JournalCategory) => {
        setSelectedCategory(cat);
        const randomQ = cat.questions[Math.floor(Math.random() * cat.questions.length)];
        setActiveQuestion(randomQ);
        // Translation for the intro message
        const intro = language === "en"
            ? `You have selected **${cat.title}**. Let's dive deeper into this:\n\n**${randomQ.text}**`
            : `Has seleccionado **${cat.title}**. Profundicemos en esto:\n\n**${randomQ.text}**`;
        setMessages([{ role: "model", content: intro }]);
    };

    const shuffleQuestion = () => {
        if (!selectedCategory) return;
        const otherQuestions = selectedCategory.questions.filter(q => q.id !== activeQuestion?.id);
        if (otherQuestions.length === 0) {
            setMessages(prev => [...prev, { role: "model", content: t("journal.shuffleEnd") || "Already explored everything." }]);
            return;
        }
        const randomQ = otherQuestions[Math.floor(Math.random() * otherQuestions.length)];
        setActiveQuestion(randomQ);
        const changeMsg = language === "en" ? `Let's change focus:\n\n**${randomQ.text}**` : `Cambiemos el enfoque:\n\n**${randomQ.text}**`;
        setMessages(prev => [...prev, { role: "model", content: changeMsg }]);
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: "user" as const, content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/journal/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    entryDate: format(selectedDate, "yyyy-MM-dd"),
                    context: {
                        category: selectedCategory?.slug,
                        question: activeQuestion?.text,
                        language: language
                    }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: "model", content: data.message }]);

            if (data.isFinalEntry && data.aiFeedback) {
                setFinalFeedback(data.aiFeedback);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: "model", content: language === "en" ? "Sorry, I lost the thread..." : "Lo siento, perdí el hilo..." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveEntry = async () => {
        setIsSaving(true);
        try {
            const userContent = messages.filter(m => m.role === "user").map(m => m.content).join("\n\n");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { data, error } = await supabase
                .from("journal_records")
                .insert([{
                    user_id: user.id,
                    entry_date: format(selectedDate, "yyyy-MM-dd"),
                    user_content: userContent,
                    chat_history: messages,
                    prompt_id: activeQuestion?.id,
                    category_tag: selectedCategory?.slug,
                    ai_feedback: {
                        recommendations: finalFeedback?.recommendations || [],
                        work_points: finalFeedback?.workPoints || [],
                        focus_areas: finalFeedback?.focusAreas || [],
                        alerts: finalFeedback?.alerts || [],
                        assistance: finalFeedback?.assistance || ""
                    },
                    status: "finalized",
                    mood: finalFeedback?.mood,
                    summary: (finalFeedback as any)?.summary || activeQuestion?.text,
                    type: hasUsedVoice ? "voice" : "text"
                }])
                .select().single();

            if (error) throw error;
            toast.success(t("common.success"));

            setMessages([]);
            setFinalFeedback(null);
            setSelectedCategory(null);
            setActiveQuestion(null);
            setInput("");
            setHasUsedVoice(false);

            onEntrySaved(data);
        } catch (error: any) {
            toast.error(t("common.error"));
        } finally {
            setIsSaving(false);
        }
    };

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);

    const toggleRecording = async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder.current = new MediaRecorder(stream);
                mediaRecorder.current.start();
                setIsRecording(true);
            } catch (err) { console.error("Error micro:", err); }
        } else {
            mediaRecorder.current?.stop();
            setIsRecording(false);
            setHasUsedVoice(true);
            const audioText = language === "en" ? "[Audio reflection captured]" : "[Reflexión por audio capturada]";
            setMessages(prev => [...prev, { role: "user", content: audioText }]);
            handleSendWithContent(audioText);
        }
    };

    const handleSendWithContent = async (content: string) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/journal/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, { role: "user", content }],
                    entryDate: format(selectedDate, "yyyy-MM-dd"),
                    context: {
                        category: selectedCategory?.slug,
                        question: activeQuestion?.text,
                        language: language
                    }
                })
            });
            const data = await response.json();
            setMessages(prev => [...prev, { role: "model", content: data.message }]);
            if (data.isFinalEntry && data.aiFeedback) setFinalFeedback(data.aiFeedback);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    if (!selectedCategory) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 py-4 md:py-6 px-4">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        {t("journal.focusToday")}
                    </h2>
                    <p className="text-slate-500 font-medium tracking-wide italic text-sm md:text-base px-6">
                        {language === "en"
                            ? "\"The one who doesn't know where they're going, any wind is favorable.\""
                            : "\"El que no sabe a dónde va, cualquier viento le es favorable.\""}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {categories.map((cat) => {
                        const IconComponent = (Icons as any)[cat.icon] || Icons.Sparkles;
                        return (
                            <motion.button
                                key={cat.slug}
                                whileHover={{ y: -6, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => selectCategory(cat)}
                                className={`group p-4 md:p-6 rounded-[24px] md:rounded-[32px] bg-slate-900 border border-white/5 hover:border-white/20 text-left transition-all relative overflow-hidden h-36 md:h-48 flex flex-col justify-between shadow-xl`}
                            >
                                <div className={`h-10 w-10 md:h-12 md:w-12 bg-gradient-to-tr ${cat.color} rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-black/40`}>
                                    <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-white" />
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <h3 className="text-base md:text-lg font-bold text-white leading-tight">{cat.title}</h3>
                                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-400 transition-colors">
                                        {t("journal.selectFocus")} →
                                    </p>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] md:h-[750px] max-w-4xl mx-auto bg-slate-900 border border-white/5 rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl relative">
            {/* Header */}
            <div className={`p-4 md:p-6 bg-slate-950/50 flex flex-col md:flex-row gap-4 md:items-center justify-between border-b border-white/5 shrink-0`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (messages.length > 0 && !confirm(t("journal.backConfirmation"))) return;
                            setSelectedCategory(null);
                            setMessages([]);
                            setFinalFeedback(null);
                            setActiveQuestion(null);
                        }}
                        className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h2 className="font-black text-white tracking-tight flex items-center gap-2 text-sm md:text-base">
                            {selectedCategory.title}
                            <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${selectedCategory.color}`} />
                        </h2>
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            {format(selectedDate, "d 'de' MMMM", { locale: language === "es" ? es : undefined })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!finalFeedback && (
                        <button
                            onClick={shuffleQuestion}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all border border-white/5"
                        >
                            <Shuffle className="h-4 w-4" /> {t("journal.shuffle")}
                        </button>
                    )}

                    {messages.length > 0 && (
                        <button
                            onClick={saveEntry}
                            disabled={isSaving}
                            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 md:px-6 py-2 md:py-3 font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? t("journal.saving") : t("journal.saveNote")}
                        </button>
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 scroll-smooth"
            >
                <style jsx>{`
                    div::-webkit-scrollbar { width: 4px; }
                    div::-webkit-scrollbar-track { background: transparent; }
                    div::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                `}</style>

                <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className="max-w-[90%] md:max-w-[85%]">
                                <div className={`p-4 md:p-6 rounded-[24px] md:rounded-[32px] text-xs md:text-sm leading-relaxed ${m.role === "user"
                                    ? "bg-indigo-600 text-white rounded-tr-none shadow-xl shadow-indigo-600/10"
                                    : "bg-slate-800/40 border border-white/5 text-slate-200 rounded-tl-none font-medium"
                                    }`}>
                                    {m.content.split('\n').map((line, idx) => (
                                        <p key={idx} className={line.startsWith('**') ? "text-base md:text-lg font-black my-2 text-white" : "mb-1"}>
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {finalFeedback && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 md:p-8 glass-panel rounded-[32px] md:rounded-[40px] space-y-6 md:space-y-8"
                    >
                        <div className="flex items-center gap-3">
                            <Bot className="h-5 w-5 text-indigo-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                                {t("journal.aiInsights")}
                            </h3>
                        </div>

                        {finalFeedback.assistance && (
                            <p className="text-xs md:text-sm text-slate-300 italic border-l-2 border-indigo-500/30 pl-4 py-1">
                                "{finalFeedback.assistance}"
                            </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Info className="h-3 w-3" /> {t("journal.recommendations")}
                                </h4>
                                <ul className="space-y-3">
                                    {finalFeedback.recommendations.map((r, i) => (
                                        <li key={i} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                                            <div className="h-1 w-1 bg-indigo-500 rounded-full mt-1.5 shrink-0" /> {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-red-400" /> {t("journal.alerts")}
                                </h4>
                                <ul className="space-y-3">
                                    {finalFeedback.alerts.map((a, i) => (
                                        <li key={i} className="text-xs text-red-200/50 flex items-start gap-2 leading-relaxed italic">
                                            <div className="h-1 w-1 bg-red-400 rounded-full mt-1.5 shrink-0" /> {a}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-slate-800/50 p-3 md:p-4 rounded-2xl border border-white/5">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Input Footer */}
            <div className="p-4 md:p-8 bg-slate-950/80 border-t border-white/5 backdrop-blur-xl shrink-0">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder={t("journal.placeholder")}
                        className="w-full bg-slate-900 border border-white/5 rounded-2xl md:rounded-3xl pl-4 md:pl-6 pr-24 md:pr-32 py-4 md:py-5 text-xs md:text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors resize-none h-20 md:h-24 placeholder:text-slate-700"
                    />
                    <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex gap-1 md:gap-2">
                        <button
                            onClick={toggleRecording}
                            title={t("journal.voiceInstructions")}
                            className={`h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-lg ${isRecording
                                ? "bg-red-500 text-white animate-pulse shadow-red-500/20"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700 shadow-black/20"
                                }`}
                        >
                            <Mic className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="h-10 w-10 md:h-12 md:w-12 bg-indigo-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 transition-all shadow-lg shadow-indigo-600/20"
                        >
                            <Send className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                    </div>
                </div>
                <p className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 text-center mt-4">
                    {t("journal.keyboardInstructions")}
                </p>
            </div>
        </div>
    );
}
