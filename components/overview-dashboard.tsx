"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingDown, TrendingUp, DollarSign, CreditCard, BarChart2, AlertCircle, AlertTriangle } from "lucide-react";
import { GhostExpensesList } from "./ghost-expenses-list";
import { FinancialTank } from "./financial-tank";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function OverviewDashboard() {
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [metrics, setMetrics] = useState({
        income: 0,
        fixed: 0,
        variable: 0,
        cards: 0,
        balance: 0,
        trends: {
            income: 0,
            fixed: 0,
            variable: 0,
            cards: 0
        }
    });
    const [cards, setCards] = useState<any[]>([]);
    const [selectedCard, setSelectedCard] = useState<string>("all");
    const [ghostExpenses, setGhostExpenses] = useState<any[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]); // For Charts
    const [budgetAlerts, setBudgetAlerts] = useState<string[]>([]); // New state for alerts
    const [allBudgets, setAllBudgets] = useState<Record<string, { budget: number, spent: number }>>({});

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Fetch User Cards (for filter)
                const { data: userCards } = await supabase
                    .from("credit_cards")
                    .select("id, bank_name, issuer, last_4")
                    .eq("user_id", user.id);
                setCards(userCards || []);

                // 2. Date Ranges
                const [year, month] = selectedMonth.split('-');
                const historyMonths = Array.from({ length: 6 }, (_, i) => {
                    const d = new Date(parseInt(year), parseInt(month) - 1 - (5 - i), 1);
                    return d.toISOString().slice(0, 7);
                });
                const startOfHistory = `${historyMonths[0]}-01`;
                const endOfHistory = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);

                // 3. Constant Data (Fixed Expenses & All Incomes)
                const [
                    { data: allIncomes },
                    { data: fixedExp },
                    { data: allVariable },
                    { data: allAnalyses }
                ] = await Promise.all([
                    supabase.from("incomes").select("*").eq("user_id", user.id),
                    supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
                    supabase.from("variable_expenses").select("*").eq("user_id", user.id).gte("date", startOfHistory).lte("date", endOfHistory),
                    supabase.from("analyses").select("*").eq("user_id", user.id).gte("summary->>period", historyMonths[0]).lte("summary->>period", historyMonths[5])
                ]);

                const totalFixed = fixedExp?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

                // 4. Aggregate History for Charts
                const enrichedChartData = historyMonths.map(m => {
                    const mVariableItems = allVariable?.filter(v => v.date.startsWith(m)) || [];
                    const mAnalyses = allAnalyses?.filter(a => a.summary?.period === m) || [];

                    const varCats: Record<string, number> = {};
                    mVariableItems.forEach(i => varCats[i.category || "Otros"] = (varCats[i.category || "Otros"] || 0) + Number(i.amount));

                    const cardCats: Record<string, number> = {};
                    mAnalyses.forEach(a => {
                        Object.entries(a.summary?.categories || {}).forEach(([cat, val]) => {
                            cardCats[cat] = (cardCats[cat] || 0) + Number(val);
                        });
                    });

                    const finalVarCats: Record<string, number> = { ...varCats };
                    Object.entries(cardCats).forEach(([c, v]) => finalVarCats[c] = (finalVarCats[c] || 0) + v);

                    const fixedCats: Record<string, number> = {};
                    fixedExp?.forEach(i => fixedCats[i.category || "Otros"] = (fixedCats[i.category || "Otros"] || 0) + Number(i.amount));

                    // Monthly Income Calculation
                    const [yh, mh] = m.split('-');
                    const ms = new Date(Number(yh), Number(mh) - 1, 1);
                    const me = new Date(Number(yh), Number(mh), 0, 23, 59, 59);

                    const mIncome = allIncomes?.reduce((sum, inc) => {
                        const rd = new Date(inc.receive_date || inc.created_at);
                        const ed = inc.end_date ? new Date(inc.end_date) : null;
                        if (inc.is_recurring) return (!ed || ed >= ms) ? sum + Number(inc.amount) : sum;
                        return (rd >= ms && rd <= me) ? sum + Number(inc.amount) : sum;
                    }, 0) || 0;

                    return {
                        month: m,
                        income: mIncome,
                        fixed_total: totalFixed,
                        variable_total: (mVariableItems.reduce((s, i) => s + Number(i.amount), 0) + mAnalyses.reduce((s, a) => s + (a.summary?.total_pay || 0), 0)),
                        var_breakdown: finalVarCats,
                        fixed_breakdown: fixedCats
                    };
                });

                // 5. Calculate Metrics for Selected Month
                const currentData = enrichedChartData.find(d => d.month === selectedMonth);
                const currentAnalyses = allAnalyses?.filter(a => a.summary?.period === selectedMonth && (selectedCard === "all" || a.card_id === selectedCard)) || [];

                // If specific card is selected, we override the variable total with that specific card + manual variable
                let totalCards = currentData?.variable_total || 0;
                if (selectedCard !== "all") {
                    const cardSpecificPay = currentAnalyses.reduce((sum, a) => sum + (a.summary?.total_pay || 0), 0);
                    const manualVar = allVariable?.filter(v => v.date.startsWith(selectedMonth)).reduce((s, i) => s + Number(i.amount), 0) || 0;
                    totalCards = cardSpecificPay + manualVar;
                }

                // Trend Calculation
                const currentIdx = historyMonths.indexOf(selectedMonth);
                const trends = { income: 0, fixed: 0, variable: 0, cards: 0 };
                if (currentIdx > 0) {
                    const curr = enrichedChartData[currentIdx];
                    const prev = enrichedChartData[currentIdx - 1];
                    const calcTrend = (c: number, p: number) => p === 0 ? 0 : ((c - p) / p) * 100;
                    trends.income = calcTrend(curr.income, prev.income);
                    trends.variable = calcTrend(curr.variable_total, prev.variable_total);
                }

                setMetrics({
                    income: currentData?.income || 0,
                    fixed: totalFixed,
                    variable: allVariable?.filter(v => v.date.startsWith(selectedMonth)).reduce((s, i) => s + Number(i.amount), 0) || 0,
                    cards: currentAnalyses.reduce((sum, a) => sum + (a.summary?.total_pay || 0), 0),
                    balance: (currentData?.income || 0) - (totalFixed + (currentData?.variable_total || 0)),
                    trends
                });

                // This line was missing from the original code, assuming it should filter analyses for the current month
                const currentMonthAnalyses = allAnalyses?.filter(a => a.summary?.period === selectedMonth) || [];
                setGhostExpenses(currentMonthAnalyses.flatMap(a => a.ghost_expenses || []));
                setHistoryData(enrichedChartData);

                // --- 4. Fetch Budgets for Alerts ---
                const { data: budgets } = await supabase
                    .from("budgets")
                    .select("category, amount")
                    .eq("user_id", user.id)
                    .eq("period", selectedMonth);

                const alerts: string[] = [];
                const budgetStatus: Record<string, { budget: number, spent: number }> = {};
                if (budgets && currentData) {
                    budgets.forEach(b => {
                        const spent = currentData.var_breakdown[b.category] || currentData.fixed_breakdown[b.category] || 0;
                        budgetStatus[b.category] = { budget: b.amount, spent };
                        if (spent > b.amount) {
                            alerts.push(b.category);
                        }
                    });
                }
                setBudgetAlerts(alerts);
                setAllBudgets(budgetStatus);

            } catch (error) {
                console.error("Error calculating metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [selectedMonth, selectedCard]);

    const isHealthy = metrics.balance >= 0;
    const totalExpenses = metrics.fixed + metrics.variable + metrics.cards;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Date Filter & Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Resumen Financiero</h2>
                <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                    {budgetAlerts.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg animate-pulse mr-2">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">Límite Excedido</span>
                        </div>
                    )}
                    <span className="text-xs font-bold text-gray-500 uppercase px-2">Período</span>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-gray-50 border-none text-gray-900 text-sm font-semibold rounded-lg focus:ring-2 focus:ring-orange-500 p-1.5 outline-none"
                    />
                    <select
                        value={selectedCard}
                        onChange={(e) => setSelectedCard(e.target.value)}
                        className="bg-gray-50 border-none text-gray-900 text-sm font-semibold rounded-lg focus:ring-2 focus:ring-orange-500 p-1.5 outline-none h-[34px]"
                    >
                        <option value="all">Todas las Tarjetas</option>
                        {cards.map(c => (
                            <option key={c.id} value={c.id}>{c.bank_name} {c.issuer} ••• {c.last_4}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>
            ) : (
                <>
                    {/* Budget Warning Banner if any exceeded */}
                    {budgetAlerts.length > 0 && (
                        <div className="grid grid-cols-1 gap-4 mb-8">
                            <Alert variant="destructive" className="bg-red-50 border-red-200">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertTitle className="text-red-800 font-bold">¡Atención! Presupuestos Excedidos</AlertTitle>
                                <AlertDescription className="text-red-700">
                                    Has superado el límite mensual en: {budgetAlerts.join(", ")}.
                                    Revisa la pestaña de "Presupuestos" para ajustar tus gastos.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {/* Header Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-emerald-600" /> Ingresos
                                    </div>
                                    {metrics.trends.income !== 0 && (
                                        <span className={`text-[10px] font-bold ${metrics.trends.income > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {metrics.trends.income > 0 ? '+' : ''}{metrics.trends.income.toFixed(1)}%
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">${metrics.income.toLocaleString()}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-orange-600" /> Gastos Fijos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">${metrics.fixed.toLocaleString()}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-amber-500" /> Gastos Variables
                                    </div>
                                    {metrics.trends.variable !== 0 && (
                                        <span className={`text-[10px] font-bold ${metrics.trends.variable < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {metrics.trends.variable > 0 ? '+' : ''}{metrics.trends.variable.toFixed(1)}%
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">${metrics.variable.toLocaleString()}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-slate-900" /> Tarjetas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">${metrics.cards.toLocaleString()}</div>
                                <p className="text-xs text-slate-400 mt-1">{selectedMonth}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Financial Health Visualization */}
                    <Card className="border border-slate-200 shadow-lg bg-white overflow-hidden">
                        <CardHeader className="bg-slate-950 text-white py-4">
                            <CardTitle className="text-center text-lg font-light tracking-wide">BALANCE DE {selectedMonth}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-8 pb-8">
                            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                                {/* Left: Numeric Summary */}
                                <div className="text-center md:text-left">
                                    <div className={`text-5xl lg:text-6xl font-black tracking-tighter ${isHealthy ? 'text-slate-900' : 'text-red-600'} mb-2`}>
                                        ${metrics.balance.toLocaleString()}
                                    </div>
                                    <p className="text-gray-500 max-w-xs mx-auto md:mx-0">
                                        {isHealthy
                                            ? "¡Excelente! Tus ingresos superan tus gastos este mes."
                                            : "Cuidado, tus gastos superan tus ingresos este mes."}
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${isHealthy ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                            {isHealthy ? 'Presupuesto OK' : 'Déficit Detectado'}
                                        </span>
                                    </div>

                                    {/* Simple Bar for context (Income vs Expenses) */}
                                    <div className="mt-6 space-y-2 text-sm text-gray-500">
                                        <div className="flex justify-between w-full max-w-xs border-b border-gray-100 pb-1">
                                            <span>Ingresos Totales</span>
                                            <span className="font-semibold text-slate-700">${metrics.income.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between w-full max-w-xs">
                                            <span>Gastos Totales</span>
                                            <span className="font-semibold text-red-600">${totalExpenses.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: The Tank Visualization */}
                                <div className="flex flex-col items-center">
                                    <FinancialTank
                                        totalIncome={metrics.income}
                                        totalExpenses={totalExpenses}
                                        currency="ARS"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ghost Expenses List Integration */}
                    {ghostExpenses.length > 0 && (
                        <div className="pt-4">
                            <GhostExpensesList expenses={ghostExpenses} />
                        </div>
                    )}

                    {/* Historical Charts */}
                    <div className="grid grid-cols-1 gap-8">

                        {/* 1. Ingresos Mensuales */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <BarChart2 className="h-4 w-4 text-green-600" /> Evolución de Ingresos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={historyData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="income" name="Ingresos" radius={[4, 4, 0, 0]}>
                                                {historyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === historyData.length - 1 ? '#059669' : '#10b981'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Gastos Fijos (Categorizados) */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                                    <BarChart2 className="h-4 w-4 text-orange-600" /> Distribución de Gastos Fijos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={historyData.map(d => ({
                                                month: d.month,
                                                ...d.fixed_breakdown
                                            }))}
                                            stackOffset="sign"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="top" height={36} />
                                            {/* We need keys from fixed_breakdown. Since fixed_expenses is constant for all months 
                                                in our mock, we just take keys from the last month. */}
                                            {Object.keys(historyData[historyData.length - 1]?.fixed_breakdown || {}).map((cat, i) => (
                                                <Bar
                                                    key={cat}
                                                    dataKey={cat}
                                                    stackId="a"
                                                    fill={['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fff7ed'][i % 7]}
                                                    radius={i === Object.keys(historyData[historyData.length - 1]?.fixed_breakdown || {}).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. Gastos Variables (Categorizados) */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                                    <BarChart2 className="h-4 w-4 text-indigo-600" /> Consumo Variable (Analizado + Manual)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={historyData.map(d => ({
                                                month: d.month,
                                                ...d.var_breakdown
                                            }))}
                                            stackOffset="sign"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="top" height={36} />
                                            {/* Union of all keys for variable categories across history */}
                                            {Array.from(new Set(historyData.flatMap(d => Object.keys(d.var_breakdown)))).map((cat, i) => (
                                                <Bar
                                                    key={cat}
                                                    dataKey={cat}
                                                    stackId="b"
                                                    fill={['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f5f3ff'][i % 7]}
                                                    radius={i === Array.from(new Set(historyData.flatMap(d => Object.keys(d.var_breakdown)))).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </>
            )}
        </div>
    );
}
