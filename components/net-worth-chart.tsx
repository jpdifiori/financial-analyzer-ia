"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp, Wallet } from "lucide-react";

interface NetWorthChartProps {
    data: any[]; // History data from OverviewDashboard
    loading: boolean;
}

export function NetWorthChart({ selectedMonth }: { selectedMonth: string }) {
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Date Ranges (Last 6 months from selectedMonth)
            const [y, m] = selectedMonth.split('-');
            const historyMonths = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(Number(y), Number(m) - 1 - (5 - i), 1);
                return d.toISOString().slice(0, 7);
            });

            const [
                { data: allIncomes },
                { data: fixedExp },
                { data: allVariable },
                { data: allAnalyses },
                { data: dbAssets },
                { data: dbLiabilities }
            ] = await Promise.all([
                supabase.from("incomes").select("*").eq("user_id", user.id),
                supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
                supabase.from("variable_expenses").select("*").eq("user_id", user.id).gte("date", `${historyMonths[0]}-01`),
                supabase.from("analyses").select("*").eq("user_id", user.id).gte("summary->>period", historyMonths[0]),
                supabase.from("assets").select("*").eq("user_id", user.id),
                supabase.from("liabilities").select("*").eq("user_id", user.id)
            ]);

            const currentAssetsTotal = dbAssets?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
            const currentLiabilitiesTotal = dbLiabilities?.reduce((sum, l) => sum + Number(l.total_amount), 0) || 0;

            const enriched = historyMonths.map(m => {
                const [y, mm] = m.split('-');
                const ms = new Date(Number(y), Number(mm) - 1, 1);
                const me = new Date(Number(y), Number(mm), 0, 23, 59, 59);

                const income = allIncomes?.reduce((sum, inc) => {
                    const rd = new Date(inc.receive_date || inc.created_at);
                    const sd = inc.start_date ? new Date(inc.start_date) : null;
                    const ed = inc.end_date ? new Date(inc.end_date) : null;

                    if (inc.is_recurring) {
                        return ((!sd || sd <= me) && (!ed || ed >= ms)) ? sum + Number(inc.amount) : sum;
                    }
                    return (rd >= ms && rd <= me) ? sum + Number(inc.amount) : sum;
                }, 0) || 0;

                const fixed = fixedExp?.reduce((sum, f) => {
                    const sd = f.start_date ? new Date(f.start_date) : null;
                    const ed = f.end_date ? new Date(f.end_date) : null;
                    return ((!sd || sd <= me) && (!ed || ed >= ms)) ? sum + Number(f.amount) : sum;
                }, 0) || 0;

                const variables = allVariable?.filter(v => v.date.startsWith(m)).reduce((s, i) => s + Number(i.amount), 0) || 0;
                const cards = allAnalyses?.filter(a => a.summary?.period === m).reduce((s, a) => s + (a.summary?.total_pay || 0), 0) || 0;
                return { month: m, income, fixed_total: fixed, variable_total: variables + cards };
            });

            setHistoryData(enriched);
            // We can store the current balance sheet totals if needed
            (window as any)._currentBalance = { assets: currentAssetsTotal, liabilities: currentLiabilitiesTotal };
        } catch (error) {
            console.error("Error fetching net worth data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>;

    // Process data to calculate cumulative net worth
    let cumulativeAssets = 0;
    let cumulativeLiabilities = 0;

    const netWorthData = historyData.map(m => {
        cumulativeAssets += m.income;
        cumulativeLiabilities += m.fixed_total + m.variable_total;
        return {
            month: m.month,
            assets: cumulativeAssets,
            liabilities: cumulativeLiabilities,
            net: cumulativeAssets - cumulativeLiabilities
        };
    });

    const currentNet = netWorthData.length > 0 ? netWorthData[netWorthData.length - 1].net : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Activos Acumulados", val: cumulativeAssets, color: "emerald", icon: Wallet },
                    { label: "Pasivos Acumulados", val: cumulativeLiabilities, color: "red", icon: TrendingUp },
                ].map((item, i) => (
                    <Card key={i} className="border-none bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ring-1 ring-slate-200/50">
                        <div className="p-4 flex flex-col justify-between h-full relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className={cn("p-1.5 rounded-lg transition-colors",
                                    item.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                )}>
                                    <item.icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                                <div className="text-xl font-black text-slate-900 font-outfit">
                                    ${item.val.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                <Card className="border-none bg-slate-950 shadow-md p-4 overflow-hidden text-white relative group">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="mb-3">
                            <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Patrimonio Neto</p>
                            <div className="text-2xl font-black text-white font-outfit">
                                ${currentNet.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <TrendingUp className="h-10 w-10 text-white" />
                    </div>
                </Card>
            </div>

            <Card className="border-none bg-white shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
                <CardHeader className="bg-slate-50/30 py-3 border-b border-slate-100">
                    <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Wallet className="h-3 w-3 text-indigo-600" /> Histórico de Patrimonio
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={netWorthData}>
                                <defs>
                                    <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={(v) => `$${v / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                    formatter={(v: any) => [`$${Number(v || 0).toLocaleString()}`, '']}
                                />
                                <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }} />
                                <Area
                                    type="monotone"
                                    name="Activos"
                                    dataKey="assets"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorAssets)"
                                />
                                <Area
                                    type="monotone"
                                    name="Pasivos"
                                    dataKey="liabilities"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorLiabilities)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
