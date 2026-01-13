"use client";

import { JournalEntry } from "@/types/journal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bot, Info, AlertCircle, CheckCircle2, User, Sparkles, Mic, Type } from "lucide-react";

interface JournalEntryViewProps {
    entry: JournalEntry;
}

import { useLanguage } from "@/context/language-context";

export function JournalEntryView({ entry }: JournalEntryViewProps) {
    const { t, language } = useLanguage();

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 px-4 md:px-0">
            {/* Context Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        {entry.categoryTag?.replace('_', ' ') || 'REFLEXIÓN'}
                    </span>
                </div>
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight">
                    {/* Only show summary in header if it's NOT a prompt question (traditional summary) */}
                    {(!entry.promptId || entry.promptId === 'quick_entry') ? (entry.summary || t("journal.reflectionDay")) : t("journal.reflectionDay")}
                </h2>
            </div>

            {/* User Content & Question Merged Card */}
            <div className="pt-3 md:pt-4 px-6 md:px-10 pb-6 md:pb-10 bg-slate-900 border border-white/5 rounded-[24px] md:rounded-[32px] shadow-xl space-y-6 md:space-y-8 relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    {entry.type === "voice" ? (
                        <Mic className="h-4 w-4 text-indigo-400" />
                    ) : (
                        <Type className="h-4 w-4 text-slate-500" />
                    )}
                </div>

                {/* Question Section */}
                {entry.summary && entry.promptId && entry.promptId !== 'quick_entry' && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500/50" />
                            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-300">
                                {t("journal.promptQuestion")}
                            </h4>
                        </div>
                        <p className="text-base md:text-xl font-serif italic text-white leading-tight pr-8">
                            {entry.summary}
                        </p>
                    </div>
                )}

                {/* Response Section */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500/50" />
                        <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-300">
                            {t("journal.yourReflection")}
                        </h4>
                    </div>
                    <div className="text-sm md:text-base leading-relaxed text-slate-200 font-medium italic whitespace-pre-wrap pl-3 border-l-2 border-indigo-500/20">
                        "{entry.userContent}"
                    </div>
                </div>
            </div>

            {/* AI Feedback - Only if content exists */}
            {entry.aiFeedback && (
                entry.aiFeedback.assistance ||
                entry.aiFeedback.recommendations.length > 0 ||
                entry.aiFeedback.alerts.length > 0 ||
                entry.aiFeedback.workPoints.length > 0
            ) && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                                <Sparkles className="h-3 w-3 text-indigo-400" />
                            </div>
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">
                                {t("journal.aiInsights")}
                            </h3>
                        </div>

                        {/* Assistance Note */}
                        {entry.aiFeedback.assistance && (
                            <div className="p-4 md:p-6 bg-white/5 border border-white/10 rounded-[24px] md:rounded-[32px] italic text-slate-400 text-xs md:text-sm leading-normal relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />
                                "{entry.aiFeedback.assistance}"
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {/* Recommendations */}
                            {entry.aiFeedback.recommendations.length > 0 && (
                                <div className="p-5 md:p-6 bg-indigo-600/5 border border-indigo-500/10 rounded-[24px] md:rounded-[32px] space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Info className="h-3 w-3 text-indigo-400" />
                                        <h4 className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            {t("journal.recommendations")}
                                        </h4>
                                    </div>
                                    <ul className="space-y-2">
                                        {entry.aiFeedback.recommendations.map((r, i) => (
                                            <li key={i} className="text-[11px] md:text-xs text-slate-400 flex items-start gap-2 leading-tight">
                                                <div className="h-1 w-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Work Points */}
                            {entry.aiFeedback.workPoints.length > 0 && (
                                <div className="p-5 md:p-6 bg-slate-900 border border-white/5 rounded-[24px] md:rounded-[32px] space-y-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                        <h4 className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            {t("journal.workPoints") || "Work Points"}
                                        </h4>
                                    </div>
                                    <ul className="space-y-2">
                                        {entry.aiFeedback.workPoints.map((w, i) => (
                                            <li key={i} className="text-[11px] md:text-xs text-slate-400 flex items-start gap-2 leading-tight">
                                                <div className="h-1 w-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Alerts */}
                            {entry.aiFeedback.alerts.length > 0 && (
                                <div className="p-5 md:p-6 bg-red-600/5 border border-red-500/10 rounded-[24px] md:rounded-[32px] space-y-4">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3 text-red-500" />
                                        <h4 className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            {t("journal.alerts")}
                                        </h4>
                                    </div>
                                    <ul className="space-y-2">
                                        {entry.aiFeedback.alerts.map((a, i) => (
                                            <li key={i} className="text-[11px] md:text-xs text-red-200/60 flex items-start gap-2 leading-tight italic">
                                                <div className="h-1 w-1 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                                {a}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Focus Areas */}
                        {entry.aiFeedback.focusAreas.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                {entry.aiFeedback.focusAreas.map((f, i) => (
                                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        {f}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
}
