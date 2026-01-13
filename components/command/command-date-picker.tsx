"use client";

import React from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CommandDatePickerProps {
    selected?: Date | null;
    onChange: (date: Date) => void;
    className?: string;
    label?: string;
}

export function CommandDatePicker({ selected, onChange, className, label }: CommandDatePickerProps) {
    const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());
    const [isOpen, setIsOpen] = React.useState(false);

    const days = React.useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm text-slate-300",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4 text-slate-500" />
                    <span>
                        {selected ? format(selected, "PPP", { locale: es }) : label || "Seleccionar fecha"}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-4 bg-slate-950 border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-[100]"
                align="start"
                sideOffset={8}
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white capitalize">
                            {format(currentMonth, "MMMM yyyy", { locale: es })}
                        </h4>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-1.5 hover:bg-white/5 rounded-md text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-1.5 hover:bg-white/5 rounded-md text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {["dom", "lun", "mar", "mié", "jue", "vie", "sáb"].map((day) => (
                            <div key={day} className="text-[10px] font-bold text-slate-500 uppercase text-center py-1">
                                {day}
                            </div>
                        ))}
                        {days.map((day, idx) => {
                            const isSelected = selected && isSameDay(day, selected);
                            const isToday = isSameDay(day, startOfToday());
                            const isCurrentMonth = isSameMonth(day, currentMonth);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        onChange(day);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "h-9 w-9 flex items-center justify-center rounded-lg text-xs font-medium transition-all",
                                        !isCurrentMonth && "text-slate-700 pointer-events-none opacity-20",
                                        isToday && !isSelected && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                                        isSelected
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                            : isCurrentMonth && "text-slate-300 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {format(day, "d")}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
