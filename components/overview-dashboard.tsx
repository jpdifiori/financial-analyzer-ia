"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
    Loader2, TrendingDown, TrendingUp, DollarSign,
    CreditCard, BarChart2, AlertCircle, AlertTriangle,
    ShoppingBag, LineChart as LineChartIcon, Building2, Wallet, PieChart
} from "lucide-react";
import { GhostExpensesList } from "./ghost-expenses-list";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function OverviewDashboard({ selectedMonth, setSelectedMonth }: { selectedMonth: string, setSelectedMonth: (m: string) => void }) {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        income: 0,
        fixed: 0,
        variable: 0,
        cards: 0,
        balance: 0,
        netWorth: 0,
        trends: {
            income: 0,
            fixed: 0,
            variable: 0,
            cards: 0
        },
        ageOfMoney: 0
    });
    const [cards, setCards] = useState<any[]>([]);
    const [selectedCard, setSelectedCard] = useState<string>("all");
    const [ghostExpenses, setGhostExpenses] = useState<any[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [budgetAlerts, setBudgetAlerts] = useState<string[]>([]);
    const [allBudgets, setAllBudgets] = useState<Record<string, { budget: number, spent: number }>>({});

    // Helper to get the "Billing Period" (Summary Period) for a given Payment Month
    // Rule: Payment in Month N corresponds to Summary of Month N-1
    const getBillingPeriod = (paymentMonth: string) => {
        if (!paymentMonth) return "";
        const [y, m] = paymentMonth.split('-').map(Number);
        const d = new Date(y, m - 2, 1); // m is 1-based. -1 for 0-based, -1 for prev month = -2
        return d.toISOString().slice(0, 7);
    };

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userCards } = await supabase
                    .from("credit_cards")
                    .select("id, bank_name, issuer, last_4")
                    .eq("user_id", user.id);
                setCards(userCards || []);

                // Generate history months (current + 5 previous)
                const [year, month] = selectedMonth.split('-').map(Number);
                const historyMonths = Array.from({ length: 6 }, (_, i) => {
                    const d = new Date(year, month - 1 - (5 - i), 1);
                    return d.toISOString().slice(0, 7);
                });

                const startOfHistory = `${historyMonths[0]}-01`;
                const endOfHistory = new Date(year, month, 0).toISOString().slice(0, 10);

                // Fetch all raw data needed
                const [
                    { data: allIncomes },
                    { data: fixedExp },
                    { data: allVariable },
                    { data: allAnalyses },
                    { data: allAssets },
                    { data: allLiabilities }
                ] = await Promise.all([
                    supabase.from("incomes").select("*").eq("user_id", user.id),
                    supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
                    supabase.from("variable_expenses").select("*").eq("user_id", user.id).gte("date", startOfHistory).lte("date", endOfHistory),
                    supabase.from("analyses").select("*").eq("user_id", user.id), // Fetch all analyses, filter in memory by billing period
                    supabase.from("assets").select("*").eq("user_id", user.id),
                    supabase.from("liabilities").select("*").eq("user_id", user.id)
                ]);

                const totalAssetsValue = allAssets?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
                const totalLiabilitiesValue = allLiabilities?.reduce((sum, l) => sum + Number(l.total_amount), 0) || 0;
                const netWorth = totalAssetsValue - totalLiabilitiesValue;

                // Process data for each month in history
                const enrichedChartData = historyMonths.map(m => {
                    const billingPeriod = getBillingPeriod(m);

                    const mVariableItems = allVariable?.filter(v => v.date.startsWith(m)) || [];
                    // Filter analyses: Payment Month 'm' matches Summary Period 'billingPeriod'
                    const mAnalyses = allAnalyses?.filter(a => a.summary?.period === billingPeriod) || [];

                    const [yh, mh] = m.split('-').map(Number);
                    const ms = new Date(yh, mh - 1, 1);
                    const me = new Date(yh, mh, 0, 23, 59, 59);

                    // Variable Breakdown
                    const varCats: Record<string, number> = {};
                    mVariableItems.forEach(i => varCats[i.category || "Otros"] = (varCats[i.category || "Otros"] || 0) + Number(i.amount));

                    // Cards Breakdown
                    const cardCats: Record<string, number> = {};
                    let cardsTotalPay = 0;
                    mAnalyses.forEach(a => {
                        const payAmt = Number(a.summary?.total_pay || a.summary?.total_ars || 0);
                        cardsTotalPay += payAmt;
                        Object.entries(a.summary?.categories || {}).forEach(([cat, val]) => {
                            cardCats[cat] = (cardCats[cat] || 0) + Number(val);
                        });
                    });

                    // Merge Categories
                    const finalVarCats: Record<string, number> = { ...varCats };
                    // Optionally merge card categories into main breakdown? 
                    // Usually user wants to see what they spent on, so yes.
                    // But strictly 'Cards' is a separate line item in the summary.
                    // For the Pie Chart (Expenses Breakdown), mixing them is good.
                    Object.entries(cardCats).forEach(([c, v]) => finalVarCats[c] = (finalVarCats[c] || 0) + v);

                    // Fixed Expenses
                    const mFixedItems = fixedExp?.filter(f => {
                        const s = f.start_date ? new Date(f.start_date) : null;
                        const e = f.end_date ? new Date(f.end_date) : null;
                        return (!s || s <= me) && (!e || e >= ms);
                    }) || [];
                    const mFixedTotal = mFixedItems.reduce((sum, f) => sum + Number(f.amount), 0);

                    const fixedCats: Record<string, number> = {};
                    mFixedItems.forEach(i => fixedCats[i.category || "Otros"] = (fixedCats[i.category || "Otros"] || 0) + Number(i.amount));

                    // Income 
                    const mIncome = allIncomes?.reduce((sum, inc) => {
                        const rd = new Date(inc.receive_date || inc.created_at);
                        const sd = inc.start_date ? new Date(inc.start_date) : null;
                        const ed = inc.end_date ? new Date(inc.end_date) : null;

                        if (inc.is_recurring) {
                            return ((!sd || sd <= me) && (!ed || ed >= ms)) ? sum + Number(inc.amount) : sum;
                        }
                        return (rd >= ms && rd <= me) ? sum + Number(inc.amount) : sum;
                    }, 0) || 0;

                    const mVariableTotal = mVariableItems.reduce((s, i) => s + Number(i.amount), 0);

                    return {
                        month: m,
                        billingPeriod: billingPeriod,
                        income: mIncome,
                        fixed_total: mFixedTotal,
                        // Total Outflow = Fixed + Variable (Cash) + Cards (Payment)
                        total_expenses: mFixedTotal + mVariableTotal + cardsTotalPay,
                        variable_cash: mVariableTotal,
                        cards_payment: cardsTotalPay,
                        var_breakdown: finalVarCats,
                        fixed_breakdown: fixedCats
                    };
                });

                const currentData = enrichedChartData.find(d => d.month === selectedMonth);

                // Card Details for specific selection
                const currentAnalyses = allAnalyses?.filter(a => {
                    const matchPeriod = a.summary?.period === getBillingPeriod(selectedMonth);
                    const matchCard = selectedCard === "all" || a.card_id === selectedCard;
                    return matchPeriod && matchCard;
                }) || [];

                // Metrics Calculation
                const income = Number(currentData?.income || 0);
                const fixed = Number(currentData?.fixed_total || 0);
                const variable = Number(currentData?.variable_cash || 0);

                // For 'cards' metric, we use the specific sum of the filtered analyses (if a card is selected) 
                // or the total from the month data.
                let cardsMetric = 0;
                if (selectedCard === "all") {
                    cardsMetric = currentData?.cards_payment || 0;
                } else {
                    cardsMetric = currentAnalyses.reduce((sum, a) => sum + Number(a.summary?.total_pay || a.summary?.total_ars || 0), 0);
                }

                const totalExpenses = fixed + variable + cardsMetric;
                const balance = income - totalExpenses;

                // Trends (vs previous month)
                const currentIdx = historyMonths.indexOf(selectedMonth);
                const trends = { income: 0, fixed: 0, variable: 0, cards: 0 };
                if (currentIdx > 0) {
                    const curr = enrichedChartData[currentIdx];
                    const prev = enrichedChartData[currentIdx - 1];
                    const calcTrend = (c: number, p: number) => p === 0 ? 0 : ((c - p) / p) * 100;

                    trends.income = calcTrend(curr.income, prev.income);
                    trends.variable = calcTrend(curr.total_expenses, prev.total_expenses); // comparing total flow
                    trends.cards = calcTrend(curr.cards_payment, prev.cards_payment);
                }

                // Age of Money (approx)
                const totalSpending6Months = enrichedChartData.reduce((sum, m) => sum + m.total_expenses, 0);
                const avgDailySpend = totalSpending6Months / (6 * 30);
                const ageOfMoney = avgDailySpend > 0 ? balance / avgDailySpend : 0;

                setMetrics({
                    income,
                    fixed,
                    variable, // This identifies "Cash Variable Expenses" explicitly
                    cards: cardsMetric,
                    balance,
                    netWorth,
                    trends,
                    ageOfMoney: Math.max(0, Math.floor(ageOfMoney))
                });

                // Ghost Expenses from the RELEVANT summaries (billing period matching selected month)
                setGhostExpenses(currentAnalyses.flatMap(a => a.ghost_expenses || []));
                setHistoryData(enrichedChartData);

                // Budget Checks
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
        <div className="min-h-screen w-full relative overflow-hidden bg-slate-950 p-6 md:p-10 font-sans text-slate-100 selection:bg-cyan-500/30">

            {/* Aurora Background Effects - Deep & Organic */}
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[10000ms]" />
            <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm">
                            Resumen Financiero
                        </h1>
                        <p className="text-slate-400 font-medium tracking-wide">Visión general de tu ecosistema económico</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <Loader2 className="animate-spin h-10 w-10 text-cyan-400" />
                    </div>
                ) : (
                    <>
                        {/* Main KPI Grid - Hero Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* Monthly Balance - Glass Card (Now Larger) */}
                            <div className={cn(
                                "lg:col-span-12 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl p-12 flex flex-col justify-center relative overflow-hidden group min-h-[400px]",
                                isHealthy ? "bg-emerald-950/30" : "bg-rose-950/30"
                            )}>
                                <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-30 transition-opacity", isHealthy ? "bg-emerald-500" : "bg-rose-500")} />

                                <div className="relative z-10 text-center space-y-8">
                                    <p className="text-sm font-bold uppercase tracking-[0.4em] text-slate-400">Balance Mensual</p>
                                    <div className={cn("text-[80px] md:text-[120px] font-black tracking-tighter drop-shadow-lg leading-none", isHealthy ? "text-emerald-400" : "text-rose-400")}>
                                        {isHealthy ? '+' : ''}<NumberTicker value={metrics.balance} />
                                    </div>
                                    <div>
                                        <div className={cn("inline-flex items-center px-8 py-3 rounded-full text-sm font-bold border backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.2)]",
                                            isHealthy ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                        )}>
                                            {isHealthy ? "Superávit Saludable" : "Atención Requerida"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Income / Expense / Cards - Neon Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: "Ingresos", value: metrics.income, icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30", shadow: "shadow-cyan-500/20", trend: metrics.trends.income },
                                { title: "Gastos Totales", value: totalExpenses, icon: TrendingDown, color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", shadow: "shadow-purple-500/20", trend: metrics.trends.variable },
                                { title: "Tarjetas (Pago Mensual)", value: metrics.cards, icon: CreditCard, color: "text-pink-400", bg: "bg-pink-500/20", border: "border-pink-500/30", shadow: "shadow-pink-500/20", trend: metrics.trends.cards },
                            ].map((item, i) => (
                                <div key={i} className="rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-xl shadow-lg p-6 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-2xl ${item.bg} ${item.border} border ${item.color} shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
                                            <item.icon className="h-6 w-6" />
                                        </div>
                                        {item.trend !== 0 && (
                                            <span className={cn("text-xs font-bold px-2 py-1 rounded-lg bg-black/40 backdrop-blur border border-white/10", item.trend > 0 ? "text-emerald-400" : "text-rose-400")}>
                                                {item.trend > 0 ? '+' : ''}{item.trend.toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{item.title}</h3>
                                    <div className={`text-4xl font-black text-white tracking-tighter drop-shadow-lg`}>
                                        $<NumberTicker value={item.value} />
                                    </div>
                                    {i === 2 && (
                                        <p className="text-[10px] text-slate-500 mt-2 font-medium">
                                            *Resumen período {getBillingPeriod(selectedMonth)}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Charts Section - Aurora Pods */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Income Evolution */}
                            <div className="rounded-[2rem] border border-white/10 bg-black/20 backdrop-blur-2xl shadow-xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                                    <BarChart2 className="h-5 w-5 text-indigo-400" />
                                    Evolución de Ingresos
                                </h3>
                                <div className="h-[250px] w-full relative z-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={historyData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v / 1000}k`} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                            />
                                            <Bar dataKey="income" fill="#6366f1" radius={[6, 6, 6, 6]} barSize={40}>
                                                {historyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fillOpacity={0.6 + (index / historyData.length) * 0.4} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Expenses Breakdown */}
                            <div className="rounded-[2rem] border border-white/10 bg-black/20 backdrop-blur-2xl shadow-xl p-8 relative overflow-hidden">
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[50px] pointer-events-none" />
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                                    <PieChart className="h-5 w-5 text-pink-400" />
                                    Distribución de Gastos
                                </h3>
                                <div className="h-[250px] w-full relative z-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={historyData.map(d => ({ month: d.month, ...d.var_breakdown }))}
                                            stackOffset="sign"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v / 1000}k`} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                            />
                                            {Array.from(new Set(historyData.flatMap(d => Object.keys(d.var_breakdown)))).map((cat, i) => (
                                                <Bar
                                                    key={cat}
                                                    dataKey={cat}
                                                    stackId="a"
                                                    fill={['#db2777', '#ec4899', '#f472b6', '#fbcfe8', '#8b5cf6'][i % 5]}
                                                    radius={[2, 2, 2, 2]}
                                                    fillOpacity={0.8}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>

                        {/* Ghost Expenses - Aurora Glass List */}
                        {ghostExpenses.length > 0 && (
                            <div className="rounded-[2rem] border border-white/10 bg-black/20 backdrop-blur-2xl shadow-xl p-8">
                                <GhostExpensesList expenses={ghostExpenses} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
