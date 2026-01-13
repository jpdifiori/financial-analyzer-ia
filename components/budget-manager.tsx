"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Wallet, Target, TrendingUp, DollarSign, Edit2, Check, History, X as CloseIcon } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

export function BudgetManager({ selectedMonth }: { selectedMonth: string }) {
    const [loading, setLoading] = useState(true);
    const [budgets, setBudgets] = useState<Record<string, number>>({});
    const [spending, setSpending] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState<string | null>(null); // Stores category being saved
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [tempBudget, setTempBudget] = useState("");
    const [history, setHistory] = useState<any[]>([]);
    const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    useEffect(() => {
        if (editingCategory && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCategory]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Budgets
            const { data: budgetData } = await supabase
                .from("budgets")
                .select("category, amount")
                .eq("user_id", user.id)
                .eq("period", selectedMonth);

            const budgetMap: Record<string, number> = {};
            budgetData?.forEach(b => budgetMap[b.category] = b.amount);
            setBudgets(budgetMap);

            // 2. Fetch Spending (Variable, Fixed, Cards)
            const [
                { data: fixedExp },
                { data: variableExp },
                { data: analyses }
            ] = await Promise.all([
                supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
                supabase.from("variable_expenses").select("*").eq("user_id", user.id).gte("date", `${selectedMonth}-01`).lte("date", `${selectedMonth}-31`),
                supabase.from("analyses").select("*").eq("user_id", user.id).eq("summary->>period", selectedMonth)
            ]);

            const spendMap: Record<string, number> = {};

            // Add Fixed (Respecting versions)
            const [y, m] = selectedMonth.split('-');
            const ms = new Date(Number(y), Number(m) - 1, 1);
            const me = new Date(Number(y), Number(m), 0, 23, 59, 59);

            fixedExp?.forEach(f => {
                const s = f.start_date ? new Date(f.start_date) : null;
                const e = f.end_date ? new Date(f.end_date) : null;

                if ((!s || s <= me) && (!e || e >= ms)) {
                    const cat = f.category || "Otros";
                    spendMap[cat] = (spendMap[cat] || 0) + Number(f.amount);
                }
            });

            // Add Variable
            variableExp?.forEach(v => {
                const cat = v.category || "Otros";
                spendMap[cat] = (spendMap[cat] || 0) + Number(v.amount);
            });

            // Add Card Analyses
            analyses?.forEach(a => {
                Object.entries(a.summary?.categories || {}).forEach(([cat, val]) => {
                    spendMap[cat] = (spendMap[cat] || 0) + Number(val);
                });
            });

            setSpending(spendMap);
        } catch (error) {
            console.error("Error fetching budget data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (category: string) => {
        setLoadingHistory(true);
        setShowHistoryFor(category);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("budget_history")
                .select("*")
                .eq("user_id", user.id)
                .eq("category", category)
                .order("change_date", { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error("Error fetching budget history:", error);
            toast.error("Error al cargar el historial");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSaveBudget = async (category: string) => {
        const amount = parseFloat(tempBudget);
        if (isNaN(amount) || amount < 0) {
            setEditingCategory(null);
            return;
        }

        setSaving(category);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("budgets")
                .upsert({
                    user_id: user.id,
                    category,
                    amount,
                    period: selectedMonth
                }, { onConflict: 'user_id,category,period' });

            if (error) throw error;
            setBudgets({ ...budgets, [category]: amount });
            toast.success("Presupuesto actualizado");
        } catch (error) {
            console.error("Error saving budget:", error);
            toast.error("Error al guardar presupuesto");
        } finally {
            setSaving(null);
            setEditingCategory(null);
        }
    };

    const startEditing = (category: string, currentAmount: number) => {
        setEditingCategory(category);
        setTempBudget(currentAmount ? currentAmount.toString() : "");
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-cyan-400" /></div>;

    const exceededCategories = Object.entries(spending).filter(([cat, amount]) => {
        const budget = budgets[cat] || 0;
        return budget > 0 && amount > budget;
    });

    const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
    const totalSpent = Object.values(spending).reduce((a, b) => a + b, 0);
    const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Summary Header */}
            <div className="bg-slate-950/50 border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-cyan-500/5 opacity-50 pointer-events-none" />
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Target className="w-32 h-32 text-indigo-400" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight mb-2">
                            Presupuesto Mensual
                        </h2>
                        <div className="flex items-center gap-4 text-slate-400 text-sm">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Wallet className="w-3.5 h-3.5" />
                                <span className="font-mono font-bold">${totalBudget.toLocaleString()}</span> Meta
                            </span>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span className="font-mono font-bold">${totalSpent.toLocaleString()}</span> Gastado
                            </span>
                        </div>
                    </div>

                    <div className="w-full md:w-1/3">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                            <span>Ejecución</span>
                            <span className={cn(totalPercent > 100 ? "text-rose-400" : "text-cyan-400")}>{Math.round(totalPercent)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(totalPercent, 100)}%` }}
                                className={cn(
                                    "h-full rounded-full transition-all duration-700",
                                    totalPercent > 100 ? "bg-gradient-to-r from-rose-500 to-orange-500" : "bg-gradient-to-r from-cyan-500 to-indigo-500"
                                )}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {exceededCategories.length > 0 && (
                <Alert variant="destructive" className="bg-rose-950/30 border-rose-500/30 text-rose-200 backdrop-blur-sm">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <AlertTitle className="font-bold tracking-wide">Presupuesto Excedido</AlertTitle>
                    <AlertDescription className="text-rose-200/80">
                        Has superado tu límite en: {exceededCategories.map(([cat]) => cat).join(", ")}.
                    </AlertDescription>
                </Alert>
            )}

            {/* Budget Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {EXPENSE_CATEGORIES.map(category => {
                    const spent = spending[category] || 0;
                    const budget = budgets[category] || 0;
                    const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                    const diff = budget - spent;
                    const isOver = budget > 0 && spent > budget;
                    const isEditing = editingCategory === category;

                    return (
                        <Card key={category} className="border border-white/5 bg-slate-900/40 shadow-lg hover:bg-slate-800/60 transition-all duration-300 group overflow-hidden backdrop-blur-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                            <div className="p-6 flex flex-col h-full relative">
                                {isOver && (
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-bl-[4rem] pointer-events-none" />
                                )}

                                <div className="flex justify-between items-center mb-8 gap-4">
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-200 truncate group-hover:text-white transition-colors">
                                                {category}
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-0.5">Categoría</span>
                                    </div>

                                    {/* Editable Budget Target */}
                                    <div
                                        onClick={() => !isEditing && startEditing(category, budget)}
                                        className={cn(
                                            "relative cursor-pointer transition-all rounded-[14px] border px-3 py-2 flex items-center gap-3 ml-auto",
                                            isEditing
                                                ? "bg-slate-950 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-105"
                                                : "bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/60"
                                        )}
                                    >
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest select-none">Meta</span>
                                        {isEditing ? (
                                            <div className="flex items-center">
                                                <span className="text-cyan-500 font-bold mr-1 text-sm">$</span>
                                                <input
                                                    ref={inputRef}
                                                    type="number"
                                                    value={tempBudget}
                                                    onChange={(e) => setTempBudget(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveBudget(category);
                                                        if (e.key === 'Escape') setEditingCategory(null);
                                                    }}
                                                    onBlur={() => handleSaveBudget(category)}
                                                    className="w-16 bg-transparent text-sm font-mono font-bold text-white outline-none p-0"
                                                    placeholder="0"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className={cn("font-mono font-bold text-sm", budget > 0 ? "text-cyan-400" : "text-slate-600")}>
                                                    {budget > 0 ? `$${budget.toLocaleString()}` : "------"}
                                                </span>
                                                <Edit2 className="w-3 h-3 text-slate-600" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6 flex-1">
                                    <div className="flex flex-col">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ejecución actual</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchHistory(category);
                                                    }}
                                                    className="p-1 bg-white/5 border border-white/10 rounded-md text-slate-600 hover:text-indigo-400 hover:bg-white/10 transition-all"
                                                    title="Ver historial"
                                                >
                                                    <History className="h-2.5 w-2.5" />
                                                </button>
                                            </div>
                                            {budget > 0 && (
                                                <span className={cn(
                                                    "text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full border shadow-sm",
                                                    isOver ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                )}>
                                                    {isOver ? "Excedido" : "En Meta"}
                                                </span>
                                            )}
                                        </div>
                                        <div className={cn(
                                            "text-4xl font-black font-sans tracking-tight leading-none py-2",
                                            budget === 0 ? "text-slate-700/50 italic text-2xl" :
                                                isOver
                                                    ? "text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-rose-600 drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                                                    : "text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                        )}>
                                            {budget > 0
                                                ? `$${Math.abs(diff).toLocaleString()}`
                                                : "Sin definir"
                                            }
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                                            {budget > 0 ? (isOver ? "Monto sobre el límite" : "Monto disponible") : "Define una meta para trackear"}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gastado</span>
                                            <span className="text-sm font-mono font-bold text-slate-200">${spent.toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Progreso</span>
                                            <span className={cn(
                                                "text-sm font-mono font-black",
                                                isOver ? "text-rose-400" : (percent > 80 ? "text-orange-400" : "text-emerald-400")
                                            )}>
                                                {Math.round(percent)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percent}%` }}
                                            className={cn(
                                                "h-full rounded-full transition-all duration-700",
                                                isOver ? "bg-gradient-to-r from-rose-600 to-red-500 shadow-[0_0_10px_rgba(225,29,72,0.4)]" :
                                                    (percent > 80 ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]")
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* History Modal/Overlay */}
            <AnimatePresence>
                {showHistoryFor && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHistoryFor(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden p-8"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                                        <History className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white tracking-tight">Historial de Cambios</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{showHistoryFor}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowHistoryFor(null)}
                                    className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
                                >
                                    <CloseIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                {loadingHistory ? (
                                    <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>
                                ) : history.length > 0 ? (
                                    history.map((item, idx) => (
                                        <div key={idx} className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
                                            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                                                    {new Date(item.change_date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold uppercase tracking-tighter">
                                                    {item.period}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-lg font-black text-white">${Number(item.amount).toLocaleString()}</span>
                                                {item.previous_amount !== null && (
                                                    <span className="text-xs text-slate-500 line-through font-mono">
                                                        ${Number(item.previous_amount).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-sm text-slate-500 italic">No hay registros históricos para esta categoría.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
