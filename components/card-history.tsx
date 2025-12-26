"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, CreditCard, ChevronDown, ChevronUp, DollarSign, PieChart, TrendingUp, AlertCircle, Trash2 } from "lucide-react";

import { MultiSelectCardFilter } from "@/components/multi-select-card-filter";

export function CardHistory() {
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [expensesLoading, setExpensesLoading] = useState(false);

    // Filter State
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

    // New State for Selection/Deletion
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchAnalyses();
    }, []);

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
        } catch (error) {
            console.error("Error deleting analyses:", error);
            alert("Error al eliminar. Intenta nuevamente.");
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const filteredAnalyses = selectedCardIds.length > 0
        ? analyses.filter(a => selectedCardIds.includes(a.card_id))
        : analyses;

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

    if (analyses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed rounded-xl shadow-sm">
                <div className="bg-blue-50 p-4 rounded-full mb-4">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Sin Historial Disponible</h3>
                <p className="text-gray-500 mt-2 max-w-sm">
                    Sube y analiza un resumen de tarjeta en la pestaña "Nueva Carga" para ver tu historial aquí.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 py-2 border-b border-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="h-6 w-6 text-orange-600" /> Historial
                        </h2>
                        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm">
                            {filteredAnalyses.length}
                        </span>
                    </div>

                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2 animate-in fade-in slide-in-from-right-2 border border-red-100 shadow-sm"
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

            {filteredAnalyses.map((analysis) => {
                const isExpanded = expandedAnalysisId === analysis.id;
                const isSelected = selectedIds.includes(analysis.id);
                const summary = analysis.summary || {};
                const installments = analysis.installments || [];

                // Format dates safely
                const closingDate = summary.closing_date ? new Date(summary.closing_date).toLocaleDateString('es-AR') : 'N/A';
                const dueDate = summary.due_date ? new Date(summary.due_date).toLocaleDateString('es-AR') : 'N/A';

                return (
                    <div key={analysis.id} className="relative group pl-2 md:pl-0">
                        {/* Selection Checkbox - Positioned absolutely left for desktop */}
                        <div className="absolute left-[-40px] top-8 md:top-10 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center w-10 hidden md:flex">
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelection(analysis.id)}
                                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300 cursor-pointer accent-orange-600"
                            />
                        </div>

                        {/* Card Wrapper with conditional margin/styling if selected */}
                        <div className={`transition-all duration-300 ${isSelected ? 'md:translate-x-2' : ''}`}>
                            <Card className={`overflow-hidden border transition-all duration-300 
                                ${isSelected ? 'border-orange-400 ring-2 ring-orange-50 bg-orange-50/10' : 'hover:border-slate-300 hover:shadow-md'}
                                ${isExpanded ? 'border-orange-300 shadow-lg' : ''} // changed from blue to orange
                            `}>
                                {/* Summary Header */}
                                <div
                                    className="p-5 cursor-pointer bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                    onClick={(e) => {
                                        // Specific check to avoid toggling when clicking checkbox or interactive elements
                                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                                        toggleExpand(analysis.id)
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Mobile Checkbox (visible inside on mobile) */}
                                        <div className="md:hidden pr-2 border-r border-gray-100 mr-2">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(analysis.id);
                                                }}
                                                className="w-5 h-5 text-orange-600 rounded border-gray-300 accent-orange-600"
                                            />
                                        </div>

                                        <div className={`p-3 rounded-full transition-colors ${isExpanded ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-600 group-hover:bg-slate-100'}`}>
                                            <Calendar className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 capitalize">
                                                    {summary.bank_name || "Tarjeta"} <span className="text-gray-400 font-normal">|</span> {summary.period || "Desconocido"}
                                                </h3>
                                                {summary.card_issuer && (
                                                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase tracking-wide">
                                                        {summary.card_issuer}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                Cierre: {closingDate} <span className="text-gray-300">|</span> Vencimiento: {dueDate}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-8 w-full md:w-auto pl-14 md:pl-0">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total a Pagar</p>
                                            <p className="text-2xl font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors">
                                                ${summary.total_pay?.toLocaleString('es-AR') || "0.00"}
                                            </p>
                                        </div>
                                        {isExpanded ? <ChevronUp className="h-6 w-6 text-orange-500" /> : <ChevronDown className="h-6 w-6 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="bg-slate-50 border-t border-gray-100 p-6 space-y-8 animate-in slide-in-from-top-2">

                                        {/* 1. Installments Section */}
                                        {installments.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4" /> Cuotas en Curso
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {installments.map((inst: any, idx: number) => {
                                                        const progress = (inst.current_installment / inst.total_installments) * 100;
                                                        return (
                                                            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="font-semibold text-gray-800 line-clamp-1 text-sm" title={inst.description}>
                                                                        {inst.description}
                                                                    </div>
                                                                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                        {inst.current_installment}/{inst.total_installments}
                                                                    </span>
                                                                </div>

                                                                {/* Progress Bar */}
                                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-2">
                                                                    <div
                                                                        className="bg-orange-500 h-full rounded-full transition-all duration-1000"
                                                                        style={{ width: `${progress}%` }}
                                                                    ></div>
                                                                </div>

                                                                <div className="flex justify-between items-end mt-1">
                                                                    <div>
                                                                        <p className="text-[10px] text-gray-400 uppercase">Cuota</p>
                                                                        <p className="font-bold text-gray-900 text-sm">${inst.amount?.toLocaleString()}</p>
                                                                    </div>
                                                                    {inst.remaining_amount > 0 && (
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] text-gray-400 uppercase">Resta</p>
                                                                            <p className="font-medium text-gray-600 text-sm">${inst.remaining_amount?.toLocaleString()}</p>
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
                                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" /> Detalle de Consumos
                                            </h4>

                                            {expensesLoading ? (
                                                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>
                                            ) : (
                                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100 text-xs uppercase tracking-wider">
                                                                <tr>
                                                                    <th className="px-6 py-3 bg-gray-50/50">Fecha</th>
                                                                    <th className="px-6 py-3 bg-gray-50/50">Descripción</th>
                                                                    <th className="px-6 py-3 bg-gray-50/50">Categoría</th>
                                                                    <th className="px-6 py-3 bg-gray-50/50 text-right">Monto</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {expenses.map((item) => (
                                                                    <tr key={item.id} className="hover:bg-orange-50/30 transition-colors group">
                                                                        <td className="px-6 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">
                                                                            {item.date}
                                                                        </td>
                                                                        <td className="px-6 py-3 font-medium text-gray-900 group-hover:text-orange-700 transition-colors text-sm">
                                                                            {item.description}
                                                                        </td>
                                                                        <td className="px-6 py-3">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                                                {item.suggested_category || "General"}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-right font-bold text-gray-900 text-sm">
                                                                            ${item.amount?.toLocaleString('es-AR')}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {expenses.length === 0 && (
                                                        <div className="p-8 text-center text-gray-400 text-sm">No se encontraron transacciones para este período.</div>
                                                    )}
                                                </div>
                                            )}
                                        </section>

                                        {/* 3. Category Distribution Chart */}
                                        {analysis.categories && analysis.categories.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <PieChart className="h-4 w-4" /> Distribución por Categoría
                                                </h4>
                                                <Card className="border-gray-200 shadow-sm">
                                                    <CardContent className="pt-6">
                                                        <div className="space-y-4">
                                                            {analysis.categories.map((cat: any, idx: number) => (
                                                                <div key={idx} className="space-y-1.5">
                                                                    <div className="flex justify-between text-xs font-medium">
                                                                        <span className="text-gray-700 flex items-center gap-2">
                                                                            <div className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-orange-500" :
                                                                                idx === 1 ? "bg-slate-700" :
                                                                                    idx === 2 ? "bg-slate-400" : "bg-gray-300"
                                                                                }`}></div>
                                                                            {cat.name}
                                                                        </span>
                                                                        <span className="text-gray-500">{cat.percentage}% <span className="text-gray-300 mx-1">|</span> {new Intl.NumberFormat('es-AR', { style: 'currency', currency: analysis.summary?.currency || 'ARS' }).format(cat.amount)}</span>
                                                                    </div>
                                                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${idx === 0 ? "bg-orange-500" :
                                                                                idx === 1 ? "bg-slate-700" :
                                                                                    idx === 2 ? "bg-slate-400" : "bg-gray-300"
                                                                                }`}
                                                                            style={{ width: `${cat.percentage}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </section>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
