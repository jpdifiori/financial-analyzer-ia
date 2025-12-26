"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, PiggyBank, AlertTriangle, ArrowRight, Wallet, Target, Trash2 } from "lucide-react";
import { MultiSelectCardFilter } from "@/components/multi-select-card-filter";

export function FinancialEvolution() {
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

    const processInsightsData = (data: any[]) => {
        // 1. Prepare Last 6 Months Data (of filtered data)
        const recentHistory = data.slice(-6);

        // 2. Calculate Total Ghost Expenses
        const totalGhostExpenses = recentHistory.reduce((acc, curr) => {
            const ghosts = curr.ghost_expenses || [];
            return acc + ghosts.reduce((gAcc: number, g: any) => gAcc + (g.amount || 0), 0);
        }, 0);

        // 3. Category Trends
        const categoryTotals: Record<string, number> = {};
        recentHistory.forEach(analysis => {
            const cats = analysis.categories || [];
            cats.forEach((c: any) => {
                categoryTotals[c.name] = (categoryTotals[c.name] || 0) + c.amount;
            });
        });

        // Find highest spending category
        const topCategory = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)[0];

        // 4. Trend Analysis (Last vs Previous)
        let trendPercentage = 0;
        let trendDirection: 'up' | 'down' | 'flat' = 'flat';

        if (recentHistory.length >= 2) {
            const last = recentHistory[recentHistory.length - 1];
            const prev = recentHistory[recentHistory.length - 2];
            const lastTotal = last.summary?.total_pay || 0;
            const prevTotal = prev.summary?.total_pay || 0;

            if (prevTotal > 0) {
                trendPercentage = ((lastTotal - prevTotal) / prevTotal) * 100;
                trendDirection = trendPercentage > 0 ? 'up' : 'down';
            }
        }

        return {
            totalGhostExpenses,
            topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
            trendPercentage: Math.abs(trendPercentage),
            trendDirection,
            averageSpending: recentHistory.reduce((acc, curr) => acc + (curr.summary?.total_pay || 0), 0) / recentHistory.length
        };
    };

    // Derived state for filtered analyses
    const filteredAnalyses = selectedCardIds.length > 0
        ? analyses.filter(a => selectedCardIds.includes(a.card_id))
        : analyses;

    // Recalculate insights when filtering
    const displayInsights = filteredAnalyses.length > 0
        ? processInsightsData(filteredAnalyses)
        : null;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
                .from("analyses")
                .select("*")
                .eq("user_id", session.user.id)
                .order("summary->>period", { ascending: true }); // Chronological order

            if (error) throw error;

            const sortedData = data || [];
            if (sortedData.length > 0) {
                // Initial processing handled by displayInsights derived from state
            }
            setAnalyses(sortedData);
        } catch (error) {
            console.error("Error fetching evolution data:", error);
        } finally {
            setLoading(false);
        }
    };



    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

    if (analyses.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed rounded-xl shadow-sm min-h-[400px]">
                <div className="bg-orange-100 p-4 rounded-full mb-4">
                    <Target className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Necesitamos más datos</h3>
                <p className="text-gray-500 mt-2 max-w-md">
                    Para generar un análisis de evolución y tendencias, necesitas cargar al menos <strong>2 resúmenes de tarjeta</strong> de meses diferentes.
                </p>
            </div>
        );
    }

    // Safe access to insights (prevent crash if filtered to 0)
    const currentInsights = displayInsights || { totalGhostExpenses: 0, trendPercentage: 0, trendDirection: 'flat', averageSpending: 0, topCategory: null };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-indigo-600" /> Evolución Financiera
                    </h2>
                    <p className="text-gray-500">Análisis de comportamiento de los últimos {Math.min(filteredAnalyses.length, 6)} meses.</p>
                </div>

                {/* Credit Card Filter */}
                <MultiSelectCardFilter
                    selectedCardIds={selectedCardIds}
                    onChange={setSelectedCardIds}
                />
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Ghost Savings */}
                <Card className="bg-gradient-to-br from-red-50 to-white border-red-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Fugas Detectadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(currentInsights.totalGhostExpenses || 0)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Dinero perdido en gastos hormiga en este período.
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Monthly Trend */}
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Tendencia Mensual
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold flex items-center gap-2 ${currentInsights.trendDirection === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                            {currentInsights.trendDirection === 'up' ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                            {currentInsights.trendPercentage.toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {currentInsights.trendDirection === 'up' ? 'Tu consumo está aumentando' : 'Estás gastando menos'} respecto al último mes.
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Top Category */}
                <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-violet-600 flex items-center gap-2">
                            <Wallet className="h-4 w-4" /> Mayor Gasto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-gray-900 truncate" title={currentInsights.topCategory?.name}>
                            {currentInsights.topCategory?.name || "N/A"}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Es tu categoría principal. Representa una gran parte de tu presupuesto.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Evolution Chart */}
            <Card className="border shadow-md">
                <CardHeader>
                    <CardTitle>Historial de Consumo</CardTitle>
                    <CardDescription>Comparativa de totales por mes</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full flex items-end justify-between gap-2 md:gap-4 pt-10 px-2 md:px-6">
                        {filteredAnalyses.slice(-6).map((item, idx) => {
                            // Find max value for scaling
                            const maxVal = Math.max(...filteredAnalyses.slice(-6).map(a => a.summary?.total_pay || 0));
                            const heightPercent = item.summary?.total_pay ? (item.summary.total_pay / maxVal) * 100 : 0;

                            return (
                                <div key={idx} className="flex flex-col items-center justify-end h-full w-full group relative">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-[calc(100%+8px)] opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-10">
                                        ${item.summary?.total_pay?.toLocaleString('es-AR')}
                                    </div>

                                    {/* Bar */}
                                    <div
                                        className={`w-full max-w-[60px] rounded-t-lg transition-all duration-500 ease-out hover:opacity-90 cursor-pointer ${idx === filteredAnalyses.slice(-6).length - 1 ? 'bg-indigo-600' : 'bg-slate-300 hover:bg-slate-400'
                                            }`}
                                        style={{ height: `${heightPercent}%` }}
                                    ></div>

                                    {/* Label */}
                                    <div className="mt-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {item.summary?.period || "N/A"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card className="bg-emerald-50/50 border-emerald-100">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-emerald-800">
                        <PiggyBank className="h-5 w-5" /> Plan de Acción Sugerido
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-emerald-100">
                            <div className="bg-emerald-100 p-2 rounded-full">
                                <ArrowRight className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Reduce tus {currentInsights.topCategory?.name || "gastos principales"}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    Si logras reducir un 10% en esta categoría, ahorrarías aproximadamente
                                    <span className="font-bold text-emerald-600"> ${((currentInsights.topCategory?.amount || 0) * 0.10).toLocaleString('es-AR')}</span> extras.
                                </p>
                            </div>
                        </div>

                        {currentInsights.totalGhostExpenses > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-red-100">
                                <div className="bg-red-100 p-2 rounded-full">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Elimina Gastos Fantasma</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Tienes <span className="font-bold text-red-600">${currentInsights.totalGhostExpenses.toLocaleString('es-AR')}</span> en suscripciones o gastos pequeños detectados. Revisa si realmente los utilizas todos.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-blue-100">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <Target className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Meta de Consumo</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    Tu promedio mensual es de <span className="font-bold text-gray-800">${Math.round(currentInsights.averageSpending || 0).toLocaleString('es-AR')}</span>.
                                    Intenta mantenerte por debajo de este monto el próximo mes para equilibrar tus finanzas.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
