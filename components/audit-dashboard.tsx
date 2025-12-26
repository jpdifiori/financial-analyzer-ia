"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
    TrendingDown, TrendingUp, AlertTriangle, Zap, Target, Ghost, CreditCard,
    DollarSign, Calendar, ShoppingBag, Brain, ShieldAlert
} from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface AuditDashboardProps {
    report: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function AuditDashboard({ report }: AuditDashboardProps) {
    if (!report) return null;

    const {
        global_summary, debt_evolution, categories, top_merchants,
        emotional_spending, ghost_expenses, forecast, strategies,
        payment_habits, alerts, interest_vs_principal, amount_segmentation
    } = report;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-sans p-1">

            {/* 1. GLOBAL SUMMARY TILES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 text-white border-none shadow-lg">
                    <CardContent className="p-6">
                        <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Deuda Total Actual</p>
                        <div className="text-3xl font-black mt-2 text-white">${global_summary?.total_debt?.toLocaleString()}</div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-red-200">
                            <TrendingUp className="w-3 h-3" /> Estado Crítico
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Intereses Pagados</p>
                        <div className="text-3xl font-black mt-2 text-red-500">${global_summary?.total_interest_paid?.toLocaleString()}</div>
                        <p className="text-[10px] text-slate-400 mt-1">Dinero "quemado" en financiación</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Ratio Pagos/Compras</p>
                        <div className="text-3xl font-black mt-2 text-indigo-600">{(global_summary?.payments_vs_purchases_ratio * 100)?.toFixed(0)}%</div>
                        <p className="text-[10px] text-slate-400 mt-1">{global_summary?.payments_vs_purchases_ratio < 1 ? 'Compras más de lo que pagas' : 'Estás reduciendo deuda'}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Gasto Fantasmas Est.</p>
                        <div className="text-3xl font-black mt-2 text-slate-700">${ghost_expenses?.reduce((acc: number, item: any) => acc + item.amount, 0)?.toLocaleString()}</div>
                        <p className="text-[10px] text-slate-400 mt-1">Suscripciones / Comisiones</p>
                    </CardContent>
                </Card>
            </div>

            {/* 2. ALERTS SECTION (Rule 10) */}
            {alerts && alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-lg border flex items-center gap-3 shadow-sm
                            ${alert.level === 'critical' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                            <ShieldAlert className="w-5 h-5" />
                            <div>
                                <h4 className="font-bold text-sm">{alert.type}</h4>
                                <p className="text-xs opacity-90">{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 3. CHARTS ROW: Debt Evolution & Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Evolución de Deuda</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={debt_evolution}>
                                <defs>
                                    <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="balance" stroke="#ef4444" fillOpacity={1} fill="url(#colorDebt)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Distribución de Gastos</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="total"
                                >
                                    {categories?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 4. MERCHANTS & EMOTIONAL SPENDING */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Top 5 Comercios</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top_merchants?.slice(0, 5)} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" fontSize={10} hide />
                                <YAxis dataKey="name" type="category" fontSize={10} width={100} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="total" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/30 border-red-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600"><AlertTriangle className="w-4 h-4" /> Compras Emocionales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 overflow-y-auto max-h-64 pr-2">
                        {emotional_spending?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-start text-xs border-b border-red-100 pb-2 last:border-0">
                                <div>
                                    <div className="font-bold text-slate-700">{item.item}</div>
                                    <div className="text-[10px] text-red-400 bg-red-100 inline-block px-1 rounded mt-0.5">{item.tag}</div>
                                </div>
                                <div className="font-bold text-red-600">${item.amount}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* 5. GHOST EXPENSES & FORECAST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-dashed border-slate-300 bg-slate-50/50">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600"><Ghost className="w-4 h-4" /> Gastos Fantasma</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {ghost_expenses?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-slate-100 shadow-sm">
                                <div>
                                    <span className="font-medium text-slate-700 block">{item.item}</span>
                                    <span className="text-[10px] text-slate-400 uppercase">{item.frequency}</span>
                                </div>
                                <span className="font-mono font-bold text-slate-800">${item.amount}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-700"><Brain className="w-4 h-4" /> Proyección IA (3 Meses)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-4 h-32">
                            <div className="flex-1 flex flex-col justify-end items-center gap-2">
                                <div className="w-full bg-slate-300 rounded-t opacity-50 h-[30%]"></div>
                                <span className="text-[10px] font-bold text-slate-500">Actual</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end items-center gap-2">
                                <div className="w-full bg-indigo-300 rounded-t h-[40%]"></div>
                                <span className="text-[10px] font-bold text-indigo-500">+1 Mes</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end items-center gap-2">
                                <div className="w-full bg-indigo-500 rounded-t h-[60%]"></div>
                                <span className="text-[10px] font-bold text-indigo-700">+3 Meses</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-end items-center gap-2">
                                <div className="w-full bg-indigo-700 rounded-t h-[80%]"></div>
                                <span className="text-[10px] font-bold text-indigo-900">+6 Meses</span>
                            </div>
                        </div>
                        <p className="text-xs text-center mt-4 text-slate-500">
                            Si sigues gastando así, tu deuda será de
                            <span className="font-bold text-indigo-700"> ${forecast?.six_month_debt?.toLocaleString()} </span>
                            en 6 meses.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 6. STRATEGIES FOOTER */}
            <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Zap className="w-5 h-5 text-yellow-400" /> Consultor IA: Plan de Acción</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-indigo-100">
                    <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-xs">Estrategia 1</h4>
                        <p>{strategies?.recommendation_1}</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-xs">Estrategia 2</h4>
                        <p>{strategies?.recommendation_2}</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
