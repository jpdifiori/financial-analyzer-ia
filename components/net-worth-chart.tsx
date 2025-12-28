"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp, Wallet } from "lucide-react";

interface NetWorthChartProps {
    data: any[]; // History data from OverviewDashboard
    loading: boolean;
}

export function NetWorthChart() {
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Date Ranges (Last 6 months)
            const historyMonths = Array.from({ length: 6 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (5 - i));
                return d.toISOString().slice(0, 7);
            });

            const [
                { data: allIncomes },
                { data: fixedExp },
                { data: allVariable },
                { data: allAnalyses }
            ] = await Promise.all([
                supabase.from("incomes").select("*").eq("user_id", user.id),
                supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
                supabase.from("variable_expenses").select("*").eq("user_id", user.id).gte("date", `${historyMonths[0]}-01`),
                supabase.from("analyses").select("*").eq("user_id", user.id).gte("summary->>period", historyMonths[0])
            ]);

            const enriched = historyMonths.map(m => {
                const income = allIncomes?.reduce((sum, inc) => {
                    const rd = new Date(inc.receive_date || inc.created_at);
                    if (inc.is_recurring) return sum + Number(inc.amount); // Simplification for cumulative
                    return rd.toISOString().slice(0, 7) === m ? sum + Number(inc.amount) : sum;
                }, 0) || 0;

                const fixed = fixedExp?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
                const variables = allVariable?.filter(v => v.date.startsWith(m)).reduce((s, i) => s + Number(i.amount), 0) || 0;
                const cards = allAnalyses?.filter(a => a.summary?.period === m).reduce((s, a) => s + (a.summary?.total_pay || 0), 0) || 0;

                return { month: m, income, fixed_total: fixed, variable_total: variables + cards };
            });

            setHistoryData(enriched);
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
                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-emerald-600 uppercase">Activos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">${cumulativeAssets.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50/50 border-red-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-red-600 uppercase">Pasivos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">${cumulativeLiabilities.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase">Patrimonio Neto</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">${currentNet.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-indigo-600" /> Evolución del Patrimonio Neto
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
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
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `$${v / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Area
                                    type="monotone"
                                    name="Activos"
                                    dataKey="assets"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorAssets)"
                                />
                                <Area
                                    type="monotone"
                                    name="Pasivos"
                                    dataKey="liabilities"
                                    stroke="#ef4444"
                                    strokeWidth={3}
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
