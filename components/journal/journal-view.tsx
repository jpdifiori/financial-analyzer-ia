"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { HorizontalCalendar } from "./horizontal-calendar";
import { JournalChat } from "./journal-chat";
import { JournalEntryView } from "./journal-entry-view";
import { JournalEntry } from "@/types/journal";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/language-context";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, Loader2, Calendar } from "lucide-react";
import * as Icons from "lucide-react";
import { toast } from "sonner";

export function JournalView() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingNew, setIsAddingNew] = useState(false);

    const { t, language } = useLanguage(); // Injected useLanguage hook

    const fetchEntries = async (date: Date) => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const dateStr = format(date, "yyyy-MM-dd");
            // console.log(`Fetching entries for ${dateStr}...`); // Removed console.log
            const { data, error } = await supabase
                .from("journal_records")
                .select("*")
                .eq("user_id", user.id)
                .eq("entry_date", dateStr)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // console.log(`Found ${data?.length || 0} entries for ${dateStr}:`, data); // Removed console.log
            if (data) {
                setEntries(data.map(d => ({
                    id: d.id,
                    userId: d.user_id,
                    entryDate: d.entry_date,
                    userContent: d.user_content,
                    chatHistory: d.chat_history || [],
                    aiFeedback: d.ai_feedback ? {
                        recommendations: d.ai_feedback.recommendations || [],
                        workPoints: d.ai_feedback.work_points || [],
                        focusAreas: d.ai_feedback.focus_areas || [],
                        alerts: d.ai_feedback.alerts || [],
                        assistance: d.ai_feedback.assistance || ""
                    } : undefined,
                    type: d.type,
                    status: d.status,
                    promptId: d.prompt_id,
                    categoryTag: d.category_tag,
                    summary: d.summary,
                    mood: d.mood,
                    createdAt: d.created_at
                })));
            } else {
                setEntries([]);
            }
        } catch (error: any) {
            // console.error("Fetch entries error detailed:", error); // Removed console.error
            toast.error(t("common.error")); // Translated error message
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries(selectedDate);

        const handleRefresh = () => fetchEntries(selectedDate);
        window.addEventListener("journal-entry-saved", handleRefresh);

        return () => window.removeEventListener("journal-entry-saved", handleRefresh);
    }, [selectedDate, t]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-jakarta">
            {/* Header Area */}
            <div className="pt-8 md:pt-16 pb-4 md:pb-6 px-4 md:px-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className="h-12 w-12 md:h-16 md:w-16 bg-indigo-600 rounded-2xl md:rounded-[28px] flex items-center justify-center shadow-xl shadow-indigo-600/20">
                            <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                            {t("journal.title")}
                        </h1>
                        <p className="text-slate-500 max-w-xl font-medium leading-relaxed text-sm md:text-base">
                            {t("journal.description")}
                        </p>
                    </div>
                </div>
            </div>

            <main className="flex-1 px-4 md:px-8 pb-32 max-w-6xl mx-auto w-full space-y-8 md:space-y-12">
                {/* 1. Sección de Entrada (Chat) */}
                <section className="space-y-6 md:space-y-8">
                    <JournalChat
                        selectedDate={selectedDate}
                        onEntrySaved={(newEntry) => {
                            fetchEntries(selectedDate);
                        }}
                    />
                </section>

                {/* 2. Sección de Navegación (Calendario) */}
                <section className="space-y-8 md:space-y-12">
                    <div className="border-t border-white/5 pt-8 md:pt-12">
                        <div className="flex items-center gap-3 px-2 md:px-4 mb-6 md:mb-8">
                            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-slate-500" />
                            <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                                {t("journal.history")}
                            </h2>
                        </div>
                        <HorizontalCalendar
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                        />
                    </div>
                </section>

                {/* 3. Sección de Historial (Cards) */}
                <section className="min-h-[300px] md:min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-[200px] flex items-center justify-center"
                            >
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            </motion.div>
                        ) : entries.length > 0 ? (
                            <motion.div
                                key="entries-list"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-8 md:space-y-12"
                            >
                                {entries.map((entry) => (
                                    <div key={entry.id} className="border-b border-white/5 pb-8 md:pb-10 last:border-0">
                                        <JournalEntryView entry={entry} />
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-[200px] flex flex-col items-center justify-center text-center space-y-4"
                            >
                                <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5">
                                    <BookOpen className="h-5 w-5 text-slate-800" />
                                </div>
                                <div className="space-y-1 px-4">
                                    <h3 className="text-base md:text-lg font-bold text-white">
                                        {t("journal.empty")}
                                    </h3>
                                    <p className="text-slate-500 text-xs md:text-sm">
                                        {format(selectedDate, "d 'de' MMMM", { locale: language === "es" ? es : undefined })}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            </main>
        </div>
    );
}
