"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, CreditCard, ChevronDown, ChevronUp, DollarSign, PieChart, TrendingUp, AlertCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { cn } from "@/lib/utils";

import { MultiSelectCardFilter } from "@/components/multi-select-card-filter";

export function CardHistory() {
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [expensesLoading, setExpensesLoading] = useState(false);

    // Calendar State
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [viewYear, setViewYear] = useState(new Date().getFullYear());

    // Filter State
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

    // New State for Selection/Deletion
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userCards, setUserCards] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalyses();
        fetchUserCards();
    }, []);

    // Sync viewYear when selectedMonth changes manually (if needed, though selectedMonth drives the view)
    useEffect(() => {
        setViewYear(parseInt(selectedMonth.split('-')[0]));
    }, [selectedMonth]);

    const fetchAnalyses = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            const { data, error } = await supabase
                .from("analyses")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAnalyses(data || []);
        } catch (error) {
            console.error("Error fetching analyses:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserCards = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
                .from("credit_cards")
                .select("*")
                .eq("user_id", session.user.id);

            if (error) throw error;
            setUserCards(data || []);
        } catch (error) {
            console.error("Error fetching cards:", error);
        }
    };

    const toggleExpand = async (analysisId: string) => {
        if (expandedAnalysisId === analysisId) {
            setExpandedAnalysisId(null);
            return;
        }

        setExpandedAnalysisId(analysisId);
        fetchExpenses(analysisId);
    };

    const fetchExpenses = async (analysisId: string) => {
        setExpensesLoading(true);
        try {
            const { data, error } = await supabase
                .from("expense_items")
                .select("*")
                .eq("analysis_id", analysisId)
                .order("date", { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setExpensesLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} resúmenes? Esta acción no se puede deshacer.`)) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from("analyses")
                .delete()
                .in("id", selectedIds);

            if (error) throw error;

            // UI Cleanup
            setAnalyses(prev => prev.filter(a => !selectedIds.includes(a.id)));
            setSelectedIds([]);
            toast.success("Resúmenes eliminados");
        } catch (error) {
            console.error("Error deleting analyses:", error);
            toast.error("Error al eliminar. Intenta nuevamente.");
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Helper to determine the payment month (YYYY-MM)
    const getPaymentMonth = (analysis: any) => {
        const summary = analysis.summary || {};

        // Priority 1: Use due_date if available
        if (summary.due_date) {
            return summary.due_date.slice(0, 7); // "YYYY-MM"
        }

        // Priority 2: Use period + 1 month fallback
        if (summary.period) {
            // summary.period is expected to be "YYYY-MM"
            const [year, month] = summary.period.split('-').map(Number);
            if (!isNaN(year) && !isNaN(month)) {
                // Javascript months are 0-indexed (0-11)
                // We want to add 1 month to the period.
                // Period Month is 1-based in string ("01" = Jan). 
                // new Date(year, monthIndex) -> new Date(year, month - 1) is the period date.
                // We want next month: new Date(year, month).
                const nextMonthDate = new Date(year, month, 1); // This effectively adds 1 month because 'month' is 1-based value used as 0-based index
                return nextMonthDate.toISOString().slice(0, 7);
            }
        }

        return "N/A";
    };

    // Filter by Month and Card
    const filteredAnalyses = analyses.filter(a => {
        // Filter by Payment Period (Month)
        const paymentMonth = getPaymentMonth(a);
        const matchesMonth = paymentMonth === selectedMonth;

        // Filter by Card Selection
        const matchesCard = selectedCardIds.length > 0 ? selectedCardIds.includes(a.card_id) : true;

        return matchesMonth && matchesCard;
    });

    // Helper to check for card events (closing/payment) on a specific day
    const getCardEventsForDay = (day: number) => {
        const events: { type: 'closing' | 'payment', cardName: string, color: string }[] = [];
        userCards.forEach(card => {
            if (card.closing_day === day) {
                events.push({ type: 'closing', cardName: card.bank_name || card.name, color: card.color_theme });
            }
            if (card.payment_day === day) {
                events.push({ type: 'payment', cardName: card.bank_name || card.name, color: card.color_theme });
            }
        });
        return events;
    };

    // Helper to check if a month has any data (for dots)
    const hasDataForMonth = (year: number, month: number) => {
        const checkPeriod = `${year}-${month.toString().padStart(2, '0')}`;
        return analyses.some(a => getPaymentMonth(a) === checkPeriod);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">

            {/* Horizontal Calendar */}
            <div className="relative">
                <div className="flex items-center justify-between mb-4 px-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        Historial de Resúmenes <span className="text-orange-500">•</span> {viewYear}
                    </h4>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewYear(prev => prev - 1)}
                            className="p-1 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-mono font-bold text-slate-300 text-sm">{viewYear}</span>
                        <button
                            onClick={() => setViewYear(prev => prev + 1)}
                            className="p-1 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-950/30 border-y border-white/5 backdrop-blur-sm p-4 mb-8 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-3 min-w-max px-2">
                        {Array.from({ length: 12 }, (_, i) => {
                            const monthNum = i + 1;
                            const monthStr = `${viewYear}-${monthNum.toString().padStart(2, '0')}`;
                            const isSelected = selectedMonth === monthStr;
                            const hasData = hasDataForMonth(viewYear, monthNum);

                            return (
                                <button
                                    key={monthNum}
                                    onClick={() => setSelectedMonth(monthStr)}
                                    className={`
                                        relative group flex flex-col items-center justify-center min-w-[80px] h-[80px] rounded-2xl border transition-all duration-300
                                        ${isSelected
                                            ? 'bg-orange-600/20 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }
                                    `}
                                >
                                    <span className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isSelected ? 'text-orange-300' : 'text-slate-500'}`}>
                                        {new Date(2024, i, 1).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span className={`text-xl font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                        {monthNum.toString().padStart(2, '0')}
                                    </span>

                                    {/* Indicator Dot for Has Data */}
                                    {hasData && !isSelected && (
                                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                    )}

                                    {/* Card Markers for the month overall - showing which days have events */}
                                    <div className="absolute top-1 left-2 flex flex-wrap gap-0.5 max-w-[40px]">
                                        {/* Show only first few events or total count to avoid clutter in the month overview */}
                                        {userCards.some(c => c.closing_day || c.payment_day) && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/50 animate-pulse" />
                                        )}
                                    </div>

                                    {isSelected && (
                                        <div className="absolute -bottom-1 w-8 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 sticky top-0 md:static z-10 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-orange-500" /> Resúmenes de {new Date(selectedMonth + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </h2>
                        <span className="text-sm text-slate-400 bg-white/5 px-2 py-1 rounded-full border border-white/5 shadow-sm font-mono">
                            {filteredAnalyses.length}
                        </span>
                    </div>

                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-rose-500/10 text-rose-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-2 animate-in fade-in slide-in-from-right-2 shadow-sm"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Eliminar ({selectedIds.length})
                        </button>
                    )}
                </div>

                {/* Credit Card Filter */}
                <MultiSelectCardFilter
                    selectedCardIds={selectedCardIds}
                    onChange={setSelectedCardIds}
                />
            </div>

            {/* Daily Grid for Card Events hidden as requested */}

            {filteredAnalyses.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white/5 border border-white/5 border-dashed rounded-xl shadow-sm backdrop-blur-sm">
                    <div className="bg-slate-800 p-4 rounded-full mb-4">
                        <CreditCard className="h-8 w-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-300">Sin Resúmenes en este Mes</h3>
                    <p className="text-slate-500 mt-2 max-w-sm">
                        No hay resúmenes cargados para el período seleccionado ({selectedMonth}).
                    </p>
                </div>
            ) : (
                filteredAnalyses.map((analysis) => {
                    const isExpanded = expandedAnalysisId === analysis.id;
                    const isSelected = selectedIds.includes(analysis.id);
                    const summary = analysis.summary || {};
                    const installments = analysis.installments || [];

                    // Format dates safely
                    // Note: Supabase dates are YYYY-MM-DD. 
                    // We need to parse them ensuring local timezone doesn't shift the day
                    const formatDate = (dateString: string) => {
                        if (!dateString) return 'N/A';
                        const [y, m, d] = dateString.split('-').map(Number);
                        return new Date(y, m - 1, d).toLocaleDateString('es-AR');
                    };

                    const closingDate = formatDate(summary.closing_date);
                    let dueDate = formatDate(summary.due_date);

                    // Fallback for dueDate if N/A
                    if (dueDate === 'N/A' && analysis.card_id) {
                        const card = userCards.find(c => c.id === analysis.card_id);
                        if (card && card.payment_day) {
                            let refDate: Date | null = null;
                            if (summary.closing_date) {
                                const [y, m, d] = summary.closing_date.split('-').map(Number);
                                refDate = new Date(y, m - 1, d);
                            } else if (summary.period) {
                                const [y, m] = summary.period.split('-').map(Number);
                                refDate = new Date(y, m - 1, 15);
                            }

                            if (refDate) {
                                const paymentDate = new Date(refDate);
                                paymentDate.setDate(card.payment_day);
                                if (paymentDate <= refDate) {
                                    paymentDate.setMonth(paymentDate.getMonth() + 1);
                                }
                                dueDate = paymentDate.toLocaleDateString('es-AR');
                            }
                        }
                    }

                    return (
                        <div key={analysis.id} className="relative group pl-2 md:pl-0">
                            {/* Selection Checkbox */}
                            <div className="absolute left-[-40px] top-8 md:top-10 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center w-10 hidden md:flex">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelection(analysis.id)}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-slate-600 cursor-pointer accent-orange-600 bg-slate-900"
                                />
                            </div>

                            {/* Card Wrapper */}
                            <div className={`transition-all duration-300 ${isSelected ? 'md:translate-x-2' : ''}`}>
                                <Card className={`overflow-hidden border transition-all duration-300 
                                    ${isSelected ? 'border-orange-500/50 ring-1 ring-orange-500/20 bg-orange-500/5' : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-800/60'}
                                    ${isExpanded ? 'border-orange-500/30' : ''}
                                `}>
                                    {/* Summary Header */}
                                    <div
                                        className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                                            toggleExpand(analysis.id)
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Mobile Checkbox */}
                                            <div className="md:hidden pr-2 border-r border-white/10 mr-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelection(analysis.id);
                                                    }}
                                                    className="w-5 h-5 text-orange-600 rounded border-slate-600 accent-orange-600 bg-slate-800"
                                                />
                                            </div>

                                            <div className={`p-3 rounded-xl transition-colors ${isExpanded ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'}`}>
                                                <Calendar className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-slate-200 capitalize">
                                                        {summary.bank_name || "Tarjeta"} <span className="text-slate-600 font-normal">|</span> {summary.period || "Desconocido"}
                                                    </h3>
                                                    {summary.card_issuer && (
                                                        <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 uppercase tracking-wide">
                                                            {summary.card_issuer}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                                                    Cierre: {closingDate} <span className="text-slate-700">|</span> Vencimiento: {dueDate}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-8 w-full md:w-auto pl-14 md:pl-0">
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total a Pagar</p>
                                                <p className="text-2xl font-black text-slate-200 font-mono tracking-tight group-hover:text-orange-400 transition-colors">
                                                    ${summary.total_pay?.toLocaleString('es-AR') || "0.00"}
                                                </p>
                                            </div>
                                            {isExpanded ? <ChevronUp className="h-6 w-6 text-orange-500" /> : <ChevronDown className="h-6 w-6 text-slate-600" />}
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="bg-slate-950/30 border-t border-white/5 p-6 space-y-8 animate-in slide-in-from-top-2">

                                            {/* 1. Installments Section */}
                                            {installments.length > 0 && (
                                                <section>
                                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                        <TrendingUp className="h-3.5 w-3.5" /> Cuotas en Curso
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {installments.map((inst: any, idx: number) => {
                                                            const progress = (inst.current_installment / inst.total_installments) * 100;
                                                            const monthlyAmount = inst.installment_amount ?? inst.amount ?? 0;
                                                            const remainingDebt = inst.remaining_amount ?? ((inst.total_installments - inst.current_installment) * monthlyAmount);

                                                            return (
                                                                <div key={idx} className="bg-slate-900 border border-white/5 p-4 rounded-xl shadow-lg hover:bg-slate-800 transition-colors">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="font-bold text-slate-300 line-clamp-1 text-sm" title={inst.description}>
                                                                            {inst.description}
                                                                        </div>
                                                                        <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full whitespace-nowrap border border-white/5">
                                                                            {inst.current_installment}/{inst.total_installments}
                                                                        </span>
                                                                    </div>

                                                                    {/* Progress Bar */}
                                                                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-white/5">
                                                                        <div
                                                                            className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                                                                            style={{ width: `${progress}%` }}
                                                                        ></div>
                                                                    </div>

                                                                    <div className="flex justify-between items-end">
                                                                        <div>
                                                                            <p className="text-[9px] text-slate-500 uppercase font-bold">Cuota</p>
                                                                            <p className="font-mono font-bold text-slate-200 text-sm">
                                                                                ${monthlyAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                                            </p>
                                                                        </div>
                                                                        {remainingDebt > 0 && (
                                                                            <div className="text-right">
                                                                                <p className="text-[9px] text-slate-500 uppercase font-bold">Resta</p>
                                                                                <p className="font-mono font-medium text-slate-400 text-sm">
                                                                                    ${remainingDebt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            )}

                                            {/* 2. Transactions Table */}
                                            <section>
                                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <DollarSign className="h-3.5 w-3.5" /> Detalle de Consumos
                                                </h4>

                                                {expensesLoading ? (
                                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>
                                                ) : (
                                                    <div className="bg-slate-900 rounded-xl shadow-lg border border-white/5 overflow-hidden">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm text-left">
                                                                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-white/5 text-[10px] uppercase tracking-wider font-mono">
                                                                    <tr>
                                                                        <th className="px-6 py-3">Fecha</th>
                                                                        <th className="px-6 py-3">Descripción</th>
                                                                        <th className="px-6 py-3">Categoría</th>
                                                                        <th className="px-6 py-3 text-right">Monto</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-white/5 text-slate-300">
                                                                    {expenses.map((item) => (
                                                                        <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                                                            <td className="px-6 py-3 whitespace-nowrap text-slate-500 font-mono text-xs">
                                                                                {item.date}
                                                                            </td>
                                                                            <td className="px-6 py-3 font-medium group-hover:text-orange-400 transition-colors text-sm">
                                                                                {item.description}
                                                                            </td>
                                                                            <td className="px-6 py-3">
                                                                                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5 uppercase">
                                                                                    {item.suggested_category || "General"}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-6 py-3 text-right font-bold font-mono text-sm group-hover:text-white">
                                                                                ${item.amount?.toLocaleString('es-AR')}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {expenses.length === 0 && (
                                                            <div className="p-8 text-center text-slate-500 text-sm italic">No se encontraron transacciones para este período.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </section>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
