"use client";

import { useState, useRef, useEffect } from "react";
import { format, addDays, subDays, isSameDay, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { useLanguage } from "@/context/language-context";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
}

export function HorizontalCalendar({ selectedDate, onDateSelect }: HorizontalCalendarProps) {
    const { language } = useLanguage();
    const [startDate, setStartDate] = useState(subDays(startOfToday(), 3));
    const scrollRef = useRef<HTMLDivElement>(null);

    const days = Array.from({ length: 14 }).map((_, i) => addDays(startDate, i));

    const handlePrev = () => setStartDate(subDays(startDate, 7));
    const handleNext = () => setStartDate(addDays(startDate, 7));

    return (
        <div className="relative group px-10 md:px-12 py-6 md:py-8 glass-panel rounded-[32px] md:rounded-[40px] overflow-hidden">
            <button
                onClick={handlePrev}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors z-10"
            >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div
                ref={scrollRef}
                className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar h-full px-2"
            >
                {days.map((day, i) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, startOfToday());
                    const currentLocale = language === "es" ? es : undefined;

                    return (
                        <motion.button
                            key={i}
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onDateSelect(day)}
                            className={`flex flex-col items-center min-w-[50px] md:min-w-[60px] p-3 md:p-4 rounded-[18px] md:rounded-[20px] transition-all
                                ${isSelected
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                    : "bg-slate-900/50 border border-white/5 text-slate-500 hover:border-white/10"
                                }
                            `}
                        >
                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">
                                {format(day, "EEE", { locale: currentLocale })}
                            </span>
                            <span className="text-base md:text-lg font-black tracking-tight">
                                {format(day, "d")}
                            </span>
                            {isToday && !isSelected && (
                                <div className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-500 mt-1" />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            <button
                onClick={handleNext}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors z-10"
            >
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
        </div>
    );
}
