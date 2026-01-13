"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    TrendingUp, TrendingDown, Target, Wallet,
    PieChart, Activity, ShieldCheck, ArrowUpRight,
    ChevronRight, Sparkles
} from "lucide-react";

export function ExecutiveSummary({ selectedMonth }: { selectedMonth: string }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        netWorth: 0,
        assets: 0,
        liabilities: 0,
        savingsRate: 0,
        budgetProgress: 0,
        totalIncome: 0,
        totalSpent: 0,
        activeGoals: [] as any[]
    });

    useEffect(() => {
        fetchExecutiveData();
    }, [selectedMonth]);

    const fetchExecutiveData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [yh, mh] = selectedMonth.split('-');
            const ms = `${selectedMonth}-01`;
            const me = `${selectedMonth}-31`;

            const [
                { data: assets },
                { data: liabilities },
                { data: goals },
                { data: budgets },
                { data: incomes },
                { data: fixedExp },
                { data: variableExp },
                { data: analyses }
            ] = await Promise.all([
                supabase.from("assets").select("amount"),
                supabase.from("liabilities").select("total_amount"),
                supabase.from("savings_goals").select("*").order("created_at", { ascending: false }).limit(3),
                supabase.from("budgets").select("amount").eq("period", selectedMonth),
                supabase.from("incomes").select("*").eq("user_id", user.id),
                supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
                supabase.from("variable_expenses").select("*").eq("user_id", user.id).gte("date", ms).lte("date", me),
                supabase.from("analyses").select("*").eq("user_id", user.id).eq("summary->>period", selectedMonth)
            ]);

            // Calculations
            const totalAssets = assets?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
            const totalLiabilities = liabilities?.reduce((sum, l) => sum + Number(l.total_amount), 0) || 0;

            // Income for selected month
            let monthlyIncome = 0;
            incomes?.forEach(inc => {
                if (!inc.is_recurring && inc.receive_date?.startsWith(selectedMonth)) {
                    monthlyIncome += Number(inc.amount);
                } else if (inc.is_recurring) {
                    const s = inc.start_date ? new Date(inc.start_date) : null;
                    const e = inc.end_date ? new Date(inc.end_date) : null;
                    const monthDate = new Date(Number(yh), Number(mh) - 1, 1);
                    if ((!s || s <= new Date(Number(yh), Number(mh), 0)) && (!e || e >= monthDate)) {
                        monthlyIncome += Number(inc.amount);
                    }
                }
            });

            // Expenses for selected month
            let monthlySpent = 0;
            fixedExp?.forEach(f => {
                const s = f.start_date ? new Date(f.start_date) : null;
                const e = f.end_date ? new Date(f.end_date) : null;
                const monthDate = new Date(Number(yh), Number(mh) - 1, 1);
                if ((!s || s <= new Date(Number(yh), Number(mh), 0)) && (!e || e >= monthDate)) {
                    monthlySpent += Number(f.amount);
                }
            });
            variableExp?.forEach(v => monthlySpent += Number(v.amount));
            analyses?.forEach(a => monthlySpent += Number(a.summary?.total_spent || 0));

            const totalBudget = budgets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
            const budgetProgress = totalBudget > 0 ? (monthlySpent / totalBudget) * 100 : 0;
            const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlySpent) / monthlyIncome) * 100 : 0;

            setStats({
                netWorth: totalAssets - totalLiabilities,
                assets: totalAssets,
                liabilities: totalLiabilities,
                savingsRate,
                budgetProgress,
                totalIncome: monthlyIncome,
                totalSpent: monthlySpent,
                activeGoals: goals || []
            });

        } catch (error) {
            console.error("Error fetching executive data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Top Row: Patrimonio & Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Net Worth Card */}
                <Card className="lg:col-span-2 relative overflow-hidden bg-slate-900 border-none shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Wallet className="h-32 w-32 text-white" />
                    </div>
                    <CardContent className="p-8 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Patrimonio Neto Total</span>
                            <Sparkles className="h-3 w-3 text-orange-400" />
                        </div>
                        <div className="flex items-baseline gap-4 mb-8">
                            <h2 className="text-5xl font-black text-white tracking-tighter">
                                ${stats.netWorth.toLocaleString()}
                            </h2>
                            <div className="flex items-center text-emerald-400 text-sm font-bold">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                +2.4%
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
                            <div>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Activos (Lo que tienes)</p>
                                <p className="text-xl font-bold text-emerald-400">${stats.assets.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Pasivos (Lo que debes)</p>
                                <p className="text-xl font-bold text-red-400">${stats.liabilities.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Savings Rate Gauge */}
                <Card className="bg-white border-slate-200/60 shadow-sm flex flex-col justify-center items-center p-8 text-center">
                    <div className="relative h-32 w-32 mb-4">
                        <svg className="h-full w-full" viewBox="0 0 100 100">
                            <circle className="text-slate-100" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                            <circle className="text-orange-500" strokeWidth="10" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - Math.max(0, stats.savingsRate) / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" transform="rotate(-90 50 50)" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-slate-900">{stats.savingsRate.toFixed(0)}%</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ahorro</span>
                        </div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Capacidad de Ahorro</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-[150px]">Estás ahorrando el {stats.savingsRate.toFixed(1)}% de tus ingresos este mes.</p>
                </Card>
            </div>

            {/* Bottom Row: Budgets & Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Budget Pulse */}
                <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-slate-400" /> Control de Presupuesto
                        </CardTitle>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 py-0.5 border rounded-full">Mensual</span>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-2xl font-black text-slate-900">${stats.totalSpent.toLocaleString()}</p>
                                <p className="text-xs text-slate-400">Gastado de tus presupuestos</p>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-bold ${stats.budgetProgress > 90 ? 'text-red-500' : 'text-orange-600'}`}>
                                    {stats.budgetProgress.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        <Progress value={stats.budgetProgress} className={`h-3 ${stats.budgetProgress > 90 ? '[&>div]:bg-red-500' : '[&>div]:bg-orange-500'}`} />

                        <div className="mt-6 flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-emerald-800 tracking-tight">Estatus: En Control</p>
                                    <p className="text-[10px] text-emerald-600">No has excedido tus límites.</p>
                                </div>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                {/* Goals Progress */}
                <Card className="border-slate-200/60 shadow-sm flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Target className="h-4 w-4 text-slate-400" /> Metas de Ahorro
                        </CardTitle>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col justify-center">
                        {stats.activeGoals.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-400 text-sm">No tienes metas registradas.</p>
                                <button className="mt-2 text-xs font-bold text-orange-600 hover:underline">Crear primera meta</button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {stats.activeGoals.map(goal => (
                                    <div key={goal.id}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-bold text-slate-700">{goal.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}</span>
                                        </div>
                                        <Progress
                                            value={(goal.current_amount / goal.target_amount) * 100}
                                            className="h-1.5"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
