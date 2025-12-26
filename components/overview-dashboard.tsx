"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingDown, TrendingUp, DollarSign, CreditCard } from "lucide-react";
import { GhostExpensesList } from "./ghost-expenses-list";
import { FinancialTank } from "./financial-tank";

export function OverviewDashboard() {
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [metrics, setMetrics] = useState({
        income: 0,
        fixed: 0,
        variable: 0,
        cards: 0,
        balance: 0
    });
    const [cards, setCards] = useState<any[]>([]);
    const [selectedCard, setSelectedCard] = useState<string>("all");
    const [ghostExpenses, setGhostExpenses] = useState<any[]>([]);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 0. Fetch User Cards (for filter)
                const { data: userCards } = await supabase
                    .from("credit_cards")
                    .select("id, bank_name, issuer, last_4")
                    .eq("user_id", user.id);
                setCards(userCards || []);

                // Date Ranges
                const [year, month] = selectedMonth.split('-');
                const startOfMonth = `${selectedMonth}-01`;
                // Calculate end of month correctly
                const endDate = new Date(parseInt(year), parseInt(month), 0);
                const endOfMonth = `${selectedMonth}-${endDate.getDate()}`; // YYYY-MM-DD

                // 1. Fetch Incomes
                const { data: incomes } = await supabase
                    .from("incomes")
                    .select("*")
                    .eq("user_id", user.id);

                let totalIncome = 0;
                if (incomes) {
                    const monthStartObj = new Date(Number(year), Number(month) - 1, 1);
                    const monthEndObj = new Date(Number(year), Number(month), 0, 23, 59, 59);

                    totalIncome = incomes.reduce((sum, inc) => {
                        // Robust Date Parsing
                        const receiveStr = inc.receive_date || inc.created_at;
                        const receiveDate = new Date(receiveStr);
                        const endDateObj = inc.end_date ? new Date(inc.end_date) : null;

                        // Normalize
                        receiveDate.setHours(0, 0, 0, 0);
                        if (endDateObj) endDateObj.setHours(0, 0, 0, 0);

                        if (inc.is_recurring) {
                            // Relaxed Logic: Active if it hasn't ended yet.
                            // We ignore the 'start date' (receiveDate) constraint to allow users to see 
                            // their budget projected in past/future months seamlessly.
                            const active = (!endDateObj || endDateObj >= monthStartObj);
                            return active ? sum + Number(inc.amount) : sum;
                        } else {
                            // One-time: strict month match
                            const inMonth = receiveDate >= monthStartObj && receiveDate <= monthEndObj;
                            return inMonth ? sum + Number(inc.amount) : sum;
                        }
                    }, 0);
                }

                // 2. Fetch Fixed Expenses
                // Fixed Expenses are recurring configuration (due_day).
                // We fetch all active fixed expenses and sum them up for ANY month selected.
                const { data: fixed } = await supabase
                    .from("fixed_expenses")
                    .select("*")
                    .eq("user_id", user.id);

                let totalFixed = 0;
                if (fixed) {
                    totalFixed = fixed.reduce((sum, item) => sum + Number(item.amount), 0);
                }

                // 3. Fetch Variable Expenses (Range)
                const { data: variable } = await supabase
                    .from("variable_expenses")
                    .select("amount, date")
                    .eq("user_id", user.id)
                    .gte("date", startOfMonth)
                    .lte("date", endOfMonth);

                const totalVariable = variable?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

                // 4. Fetch Card Expenses
                let analysesQuery = supabase
                    .from("analyses")
                    .select("summary, ghost_expenses, card_id")
                    .eq("user_id", user.id)
                    .eq("summary->>period", selectedMonth);

                if (selectedCard !== "all") {
                    analysesQuery = analysesQuery.eq("card_id", selectedCard);
                }

                const { data: analyses } = await analysesQuery;

                const totalCards = analyses?.reduce((sum, a) => sum + (a.summary?.total_pay || 0), 0) || 0;

                const aggregatedGhost = analyses?.flatMap(a => a.ghost_expenses || []) || [];
                setGhostExpenses(aggregatedGhost);

                // Calculation
                const totalExpenses = totalFixed + totalVariable + totalCards;

                setMetrics({
                    income: totalIncome,
                    fixed: totalFixed,
                    variable: totalVariable,
                    cards: totalCards,
                    balance: totalIncome - totalExpenses
                });
            } catch (error) {
                console.error("Error calculating metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [selectedMonth, selectedCard]);

    const totalExpenses = metrics.fixed + metrics.variable + metrics.cards;
    const isHealthy = metrics.balance >= 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Date Filter & Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Resumen Financiero</h2>
                <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
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
                    {/* Header Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-600" /> Ingresos (Capacidad)
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
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-orange-400" /> Gastos Variables
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
                                <p className="text-xs text-slate-400 mt-1">Resúmenes: {selectedMonth}</p>
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
                </>
            )}
        </div>
    );
}
