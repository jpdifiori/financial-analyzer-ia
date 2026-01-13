"use client";

import React, { useState, useEffect } from "react";
import {
    format,
    addDays,
    subDays,
    isSameDay,
    startOfToday,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isToday,
    addMonths,
    subMonths,
    differenceInDays
} from "date-fns";
import { es } from "date-fns/locale";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Circle,
    Target,
    Zap,
    X,
    Loader2,
    Wallet,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommandTask } from "@/types/command";
import { getTasks, updateTask } from "@/app/actions/command";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export function CommandCalendar() {
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfToday());
    const [allTasks, setAllTasks] = useState<CommandTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [userCards, setUserCards] = useState<any[]>([]);
    const [hasNotifications, setHasNotifications] = useState(false);

    // Filter tasks for the selected date
    const dailyTasks = allTasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), selectedDate));

    useEffect(() => {
        loadTasks();
    }, [isOpen]);

    const loadTasks = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: { session } } = await supabase.auth.getSession();
            if (!user || !session?.access_token) return;

            const statuses = ["todo", "in_progress", "done"];
            const allTasksPromises = statuses.map(s => getTasks(session.access_token, user.id, s as any));

            // [NEW] Fetch user cards for calendar events
            const { data: cards } = await supabase
                .from("credit_cards")
                .select("*")
                .eq("user_id", user.id);

            const results = await Promise.all(allTasksPromises);
            const flatTasks = results.flat();

            // Store all tasks that have a due_date
            setAllTasks(flatTasks.filter(t => t.due_date));
            setUserCards(cards || []);

            // [NEW] Notification Logic: Check if any closing or payment is in the next 2 days
            if (cards) {
                const today = startOfToday();
                const isSoon = cards.some(card => {
                    return [0, 1].some(monthOffset => {
                        const targetMonth = addMonths(today, monthOffset);
                        const events = [];
                        if (card.closing_day) events.push(card.closing_day);
                        if (card.payment_day) events.push(card.payment_day);

                        return events.some(d => {
                            const eventDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), d);
                            const diff = differenceInDays(eventDate, today);
                            return diff >= 0 && diff <= 2;
                        });
                    });
                });
                setHasNotifications(isSoon);
            }
        } catch (error) {
            console.error("Error loading calendar tasks:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTaskToggle = async (task: CommandTask) => {
        const newStatus = task.status === "done" ? "todo" : "done";

        // Optimistic Update
        setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

        if (newStatus === "done") {
            confetti({
                particleCount: 40,
                spread: 70,
                origin: { y: 0.8 },
                colors: ['#10b981', '#34d399', '#6ee7b7'],
                disableForReducedMotion: true
            });
            toast.success("Tarea completada");
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                await updateTask(session.access_token, task.id, { status: newStatus });
            }
        } catch (error) {
            toast.error("Error al actualizar tarea");
            // No need for loadTasks() here, as allTasks is the source of truth now.
        }
    };

    const renderCalendarGrid = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const calendarDays = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

        const weekDays = ["D", "L", "M", "M", "J", "V", "S"];

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-white capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: es })}
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(day => (
                        <div key={day} className="text-[10px] font-bold text-slate-500 text-center py-1">
                            {day}
                        </div>
                    ))}
                    {calendarDays.map((day, i) => {
                        const isTodayByDate = isToday(day);
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentMonth));
                        const hasTasks = allTasks.some(t => t.due_date && isSameDay(new Date(t.due_date), day));
                        const hasCriticalTasks = allTasks.some(t => t.due_date && isSameDay(new Date(t.due_date), day) && t.priority === 'critical' && t.status !== 'done');

                        // [NEW] Card events for the day
                        const dayNum = day.getDate();
                        const closingEvents = userCards.filter(c => c.closing_day === dayNum && isCurrentMonth);
                        const paymentEvents = userCards.filter(c => c.payment_day === dayNum && isCurrentMonth);
                        const hasCardEvents = closingEvents.length > 0 || paymentEvents.length > 0;

                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "relative h-8 w-8 flex items-center justify-center rounded-lg text-xs transition-all",
                                    !isCurrentMonth && "text-slate-700 opacity-30",
                                    isCurrentMonth && !isSelected && "text-slate-400 hover:bg-white/5",
                                    isSelected && "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30",
                                    isToday(day) && !isSelected && "text-indigo-400 ring-1 ring-indigo-500/30",
                                    hasTasks && !isSelected && "font-bold text-slate-200"
                                )}
                            >
                                {format(day, "d")}

                                {/* Task & Card Indicators */}
                                <div className={cn(
                                    "absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5",
                                    isTodayByDate && "bottom-2"
                                )}>
                                    {hasTasks && !isSelected && (
                                        <div className={cn(
                                            "w-1 h-1 rounded-full",
                                            hasCriticalTasks ? "bg-red-500 animate-pulse" : "bg-indigo-400/60"
                                        )} />
                                    )}
                                    {closingEvents.length > 0 && !isSelected && (
                                        <div className="w-1 h-1 rounded-full bg-slate-500" />
                                    )}
                                    {paymentEvents.length > 0 && !isSelected && (
                                        <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
                                    )}
                                </div>

                                {isToday(day) && !isSelected && (
                                    <div className="absolute top-1 right-1 w-1 h-1 bg-indigo-500 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <Popover onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className="fixed top-[80px] right-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-2xl shadow-indigo-600/40 transform transition-all hover:scale-110 active:scale-95 group focus:outline-none ring-2 ring-indigo-400 ring-offset-4 ring-offset-slate-950"
                    title="Calendario Táctico"
                >
                    <CalendarIcon className="h-6 w-6" />
                    {(hasNotifications || dailyTasks.length > 0) && (
                        <div className={cn(
                            "absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-slate-950 shadow-lg",
                            hasNotifications && "animate-pulse"
                        )} />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[380px] p-6 bg-slate-950/90 backdrop-blur-xl border-white/10 rounded-[32px] shadow-2xl ring-1 ring-white/10 animate-in fade-in zoom-in duration-300 pointer-events-auto z-[100]"
                align="end"
                side="bottom"
                sideOffset={15}
            >
                <div className="space-y-6">
                    {/* Calendar Header/Grid */}
                    {renderCalendarGrid()}

                    {/* Tasks for the day */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {isToday(selectedDate) ? "Hoy" : format(selectedDate, "d 'de' MMMM", { locale: es })}
                            </h3>
                            <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                                {dailyTasks.length} Tareas
                            </span>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500/50" />
                                </div>
                            ) : (dailyTasks.length > 0 || (userCards.length > 0 && (userCards.some(c => c.closing_day === selectedDate.getDate()) || userCards.some(c => c.payment_day === selectedDate.getDate())))) ? (
                                <>
                                    {/* Card Events for the selected day */}
                                    {userCards.filter(c => c.closing_day === selectedDate.getDate()).map((c, idx) => (
                                        <div key={`closing-${idx}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-slate-500/5 border-slate-500/10 transition-all relative overflow-hidden group">
                                            <Wallet className="h-5 w-5 text-slate-400" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-200">
                                                    Cierre: <span className="capitalize">{c.bank_name || c.name}</span>
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                                                        <AlertCircle className="h-2.5 w-2.5" />
                                                        Fin de Ciclo
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="absolute right-0 top-0 w-16 h-16 -mr-8 -mt-8 bg-slate-500/10 rounded-full blur-xl pointer-events-none transition-all duration-500 opacity-0 group-hover:opacity-100" />
                                        </div>
                                    ))}

                                    {userCards.filter(c => c.payment_day === selectedDate.getDate()).map((c, idx) => (
                                        <div key={`payment-${idx}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-orange-500/5 border-orange-500/10 transition-all relative overflow-hidden group">
                                            <Wallet className="h-5 w-5 text-orange-400" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-200">
                                                    Vencimiento: <span className="capitalize">{c.bank_name || c.name}</span>
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="flex items-center gap-1 text-[9px] text-orange-400 font-bold uppercase tracking-tighter">
                                                        <AlertCircle className="h-2.5 w-2.5" />
                                                        Pago Requerido
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="absolute right-0 top-0 w-16 h-16 -mr-8 -mt-8 bg-orange-500/10 rounded-full blur-xl pointer-events-none transition-all duration-500 opacity-0 group-hover:opacity-100" />
                                        </div>
                                    ))}

                                    {dailyTasks.map(task => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={task.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-2xl border transition-all relative overflow-hidden group",
                                                task.status === "done"
                                                    ? "bg-emerald-500/5 border-emerald-500/10"
                                                    : "bg-white/[0.03] border-white/5 hover:border-white/10"
                                            )}
                                        >
                                            <button
                                                onClick={() => handleTaskToggle(task)}
                                                className={cn(
                                                    "shrink-0 transition-colors",
                                                    task.status === "done" ? "text-emerald-500" : "text-slate-600 hover:text-white"
                                                )}
                                            >
                                                {task.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "text-sm font-medium transition-all truncate",
                                                    task.status === "done" ? "line-through text-slate-500" : "text-slate-200"
                                                )}>
                                                    {task.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {task.mission_id ? (
                                                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-tighter truncate max-w-[150px]">
                                                            <Target className="h-2.5 w-2.5 text-indigo-400" />
                                                            <span className="text-emerald-400">@misión</span>
                                                            <span className="text-slate-500">{task.mission?.name || "..."}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[9px] text-orange-400 font-bold uppercase tracking-tighter">
                                                            <Zap className="h-2.5 w-2.5" />
                                                            Acción
                                                        </span>
                                                    )}
                                                    {task.priority === "critical" && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Crítico" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Background Aurora Blob */}
                                            <div className={cn(
                                                "absolute right-0 top-0 w-16 h-16 -mr-8 -mt-8 rounded-full blur-xl pointer-events-none transition-all duration-500 opacity-0 group-hover:opacity-100",
                                                task.mission_id ? "bg-indigo-500/10" : "bg-orange-500/10"
                                            )} />
                                        </motion.div>
                                    ))}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-xs text-slate-600 italic">No hay nada planeado para este día.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
