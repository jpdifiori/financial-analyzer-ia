"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, TrendingDown, Calendar, CreditCard, AlertTriangle, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";
import { GhostExpensesList } from "./ghost-expenses-list";

interface AnalysisResult {
    summary: {
        total_pay: number;
        total_ars?: number;
        total_usd?: number;
        min_pay: number;
        previous_balance?: number; // Saldo Anterior
        total_payments?: number; // Pagos realizados
        payment_date?: string; // Fecha de pago
        currency: string;
        due_date: string;
        closing_date: string;
        interest_rate: string | null;
        bank_name?: string;
        card_issuer?: string;
        card_last_4?: string;
        period?: string;
    };
    installments: {
        description: string;
        current_installment: number;
        total_installments: number;
        installment_amount: number;
        remaining_amount: number;
        currency?: string;
    }[];
    categories: { name: string; amount: number; percentage: number; currency?: string }[];
    ghost_expenses: { description: string; amount: number; date: string; frequency: string; currency?: string; }[];
    financial_insights: string[];
    interest_alert?: {
        detected: boolean;
        amount: number;
        currency: string;
        reason: string;
        description: string;
    };
}

interface AnalysisDashboardProps {
    data: AnalysisResult;
}

export function AnalysisDashboard({ data }: AnalysisDashboardProps) {

    // Helper for currency format
    const formatCurrency = (amount: number, currencyCode?: string) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencyCode || data.summary.currency || 'ARS' }).format(amount);
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("Reporte Financiero Detallado", 20, 20);

        doc.setFontSize(14);
        doc.text(`Total: ${formatCurrency(data.summary.total_pay)}`, 20, 40);
        if (data.summary.total_ars) doc.text(`Total Pesos: ${formatCurrency(data.summary.total_ars, 'ARS')}`, 20, 46);
        if (data.summary.total_usd) doc.text(`Total Dólares: ${formatCurrency(data.summary.total_usd, 'USD')}`, 100, 46);

        doc.text(`Vencimiento: ${data.summary.due_date}`, 20, 60);

        if (data.summary.bank_name) {
            doc.text(`Tarjeta: ${data.summary.bank_name} - ${data.summary.card_issuer}`, 20, 70);
        }

        // Warning in PDF
        if (data.interest_alert?.detected) {
            doc.setTextColor(220, 38, 38); // Red
            doc.text(`ALERTA: Se detectaron intereses por ${formatCurrency(data.interest_alert.amount, data.interest_alert.currency)} (${data.interest_alert.reason})`, 20, 80);
            doc.setTextColor(0, 0, 0); // Black
        }

        doc.text("Cuotas / Playazos:", 20, 90);
        let y = 100;
        data.installments.forEach(ins => {
            doc.setFontSize(10);
            const curr = ins.currency || 'ARS';
            doc.text(`${ins.description} (${ins.current_installment}/${ins.total_installments}) - ${formatCurrency(ins.installment_amount, curr)}`, 20, y);
            y += 8;
        });

        y += 10;
        doc.setFontSize(14);
        doc.text("Gastos Fantasma:", 20, y);
        y += 10;
        data.ghost_expenses.forEach(g => {
            doc.setFontSize(10);
            const curr = g.currency || 'ARS';
            doc.text(`${g.description} - ${formatCurrency(g.amount, curr)}`, 20, y);
            y += 8;
        });

        doc.save("analisis-financiero-completo.pdf");
    };

    // Simple SVG Donut Chart Logic... (omitted for brevity, keep existing comments if needed)

    return (
        <div className="space-y-8 w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">

            {/* Payment Analysis - New Feature */}
            {(data.summary.previous_balance !== undefined && data.summary.total_payments !== undefined) && (
                <div className="mb-8">
                    <Card className="bg-white border-2 border-slate-100 shadow-lg overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <TrendingDown className="h-5 w-5 text-blue-600" /> Análisis de Pago Anterior
                            </CardTitle>
                            <CardDescription>Comportamiento de pago del último período cerrado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                                {/* Balance vs Payment */}
                                <div className="space-y-2 col-span-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Deuda Anterior</p>
                                            <p className="text-2xl font-mono font-bold text-slate-900">{formatCurrency(data.summary.previous_balance)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pago Realizado</p>
                                            <p className={cn("text-2xl font-mono font-bold",
                                                data.summary.total_payments >= data.summary.previous_balance ? "text-emerald-600" : "text-orange-500"
                                            )}>
                                                {formatCurrency(data.summary.total_payments)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                        <div
                                            className={cn("h-full transition-all duration-1000",
                                                data.summary.total_payments >= data.summary.previous_balance ? "bg-emerald-500" : "bg-orange-400"
                                            )}
                                            style={{ width: `${Math.min((data.summary.total_payments / data.summary.previous_balance) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 font-mono">
                                        <span>Cobertura: {Math.round((data.summary.total_payments / data.summary.previous_balance) * 100)}%</span>
                                        {data.summary.payment_date && <span>Fecha de Pago: {data.summary.payment_date}</span>}
                                    </div>
                                </div>

                                {/* Interest & Status */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center h-full">
                                    {data.interest_alert?.detected ? (
                                        <>
                                            <div className="bg-red-100 p-2 rounded-full mb-2"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
                                            <p className="text-xs text-red-700 font-bold uppercase">Intereses Pagados</p>
                                            <p className="text-xl font-mono font-black text-red-600">{formatCurrency(data.interest_alert.amount, data.interest_alert.currency)}</p>
                                            <p className="text-[10px] text-red-500 mt-1 max-w-[150px] leading-tight">{data.interest_alert.reason}</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-emerald-100 p-2 rounded-full mb-2"><Calendar className="h-6 w-6 text-emerald-600" /></div>
                                            <p className="text-xs text-emerald-700 font-bold uppercase">Estado de Cuenta</p>
                                            <p className="text-lg font-bold text-emerald-600">Al Día</p>
                                            <p className="text-[10px] text-emerald-500 mt-1">Sin intereses detectados</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header / Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-slate-900 text-white border-0 shadow-xl col-span-2 md:col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Total a Pagar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-1">
                            {data.summary.total_ars !== undefined && (
                                <div className="text-2xl font-bold text-white">{formatCurrency(data.summary.total_ars || 0, 'ARS')}</div>
                            )}
                            {data.summary.total_usd !== undefined && data.summary.total_usd > 0 && (
                                <div className="text-xl font-bold text-emerald-400">{formatCurrency(data.summary.total_usd || 0, 'USD')}</div>
                            )}
                            {/* Fallback if separated totals missing */}
                            {!data.summary.total_ars && !data.summary.total_usd && (
                                <div className="text-3xl font-bold">{formatCurrency(data.summary.total_pay)}</div>
                            )}
                        </div>

                        <div className="text-xs text-slate-400 mt-2 flex flex-col gap-1">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Vence: {data.summary.due_date}</span>
                            {data.summary.bank_name && (
                                <span className="font-semibold text-orange-400">
                                    {data.summary.bank_name} {data.summary.card_issuer} {data.summary.card_last_4 ? `••• ${data.summary.card_last_4}` : ''}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Pago Mínimo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(data.summary.min_pay || 0)}</div>
                        <div className="text-xs text-gray-400 mt-1">Interés est: {data.summary.interest_rate || "N/A"}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Cierre</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-700">{data.summary.closing_date}</div>
                        <div className="text-xs text-gray-400 mt-1">Fecha de corte</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{data.installments.length + data.categories.length}</div>
                        <div className="text-xs text-gray-400 mt-1">Transacciones</div>
                    </CardContent>
                </Card>
            </div>

            {/* Interest Warning Banner */}
            {data.interest_alert?.detected && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-4 animate-pulse">
                    <div className="bg-red-100 p-3 rounded-full h-fit">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-red-900 font-bold text-lg">¡Alerta Financiera Detectada!</h3>
                        <p className="text-red-700">
                            Detectamos un cargo por <strong>{data.interest_alert.reason}</strong> de <span className="font-bold text-xl">{formatCurrency(data.interest_alert.amount, data.interest_alert.currency)}</span>.
                        </p>
                        <p className="text-red-600 text-sm mt-1">
                            Esto suele ocurrir por pagar el mínimo o fuera de término. ¡Evita regalar dinero al banco!
                        </p>
                    </div>
                </div>
            )}

            {/* Insights Banner */}
            {data.financial_insights?.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 text-indigo-900 text-sm">
                    <AlertTriangle className="h-5 w-5 text-indigo-600 shrink-0" />
                    <ul className="list-disc pl-4 space-y-1">
                        {data.financial_insights.map((insight, i) => <li key={i}>{insight}</li>)}
                    </ul>
                </div>
            )}

            {/* Categories and Ghost Expenses */}
            <div className="space-y-10">
                {/* Categories Cards */}
                <div className="space-y-4">

                    <h3 className="text-lg font-serif italic text-slate-700 flex items-center gap-2">
                        <PieChart className="h-5 w-5" /> Distribución del Gasto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {data.categories.map((cat, idx) => (
                            <Card key={idx} className="bg-slate-50 border-2 border-slate-200 shadow-md hover:shadow-xl hover:bg-white hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden cursor-default">
                                <CardHeader className="pb-2 relative z-10">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">{cat.name}</CardTitle>
                                        <div className={cn("h-2 w-2 rounded-full", idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-violet-500" : "bg-orange-400")} />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="text-3xl font-mono font-black text-slate-900 mb-4 tracking-tighter">{formatCurrency(cat.amount, cat.currency)}</div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-1000",
                                                    idx === 0 ? "bg-emerald-500" :
                                                        idx === 1 ? "bg-blue-500" :
                                                            idx === 2 ? "bg-violet-500" : "bg-orange-400"
                                                )}
                                                style={{ width: `${cat.percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-500">{cat.percentage}%</span>
                                    </div>
                                </CardContent>
                                {/* Stronger decorative gradient */}
                                <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full blur-[40px] opacity-10 group-hover:opacity-30 transition-opacity duration-500",
                                    idx === 0 ? "bg-emerald-500" :
                                        idx === 1 ? "bg-blue-500" :
                                            idx === 2 ? "bg-violet-500" : "bg-orange-400"
                                )} />
                            </Card>
                        ))}
                    </div>

                </div>

                {/* Ghost Expenses */}
                <div>
                    <GhostExpensesList expenses={data.ghost_expenses} currency={data.summary.currency} />
                </div>
            </div>

            {/* Installments Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" /> Cuotas Pendientes
                    </CardTitle>
                    <CardDescription>Planificación de pagos futuros</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Comercio</th>
                                    <th className="px-4 py-3">Progreso</th>
                                    <th className="px-4 py-3">Cuota Actual</th>
                                    <th className="px-4 py-3 rounded-tr-lg text-right">Deuda Restante</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.installments
                                    .filter(ins => ins.current_installment < ins.total_installments)
                                    .map((ins, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium">{ins.description}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs w-10">{ins.current_installment} / {ins.total_installments}</span>
                                                    <div className="w-20 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-slate-800 h-full rounded-full"
                                                            style={{ width: `${(ins.current_installment / ins.total_installments) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{formatCurrency(ins.installment_amount, ins.currency)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(ins.remaining_amount, ins.currency)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        {data.installments.length === 0 && (
                            <div className="text-center py-8 text-gray-400">No hay compras en cuotas registradas.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-center pt-6">
                <Button onClick={generatePDF} size="lg" className="w-full md:w-auto gap-2 bg-slate-900 hover:bg-slate-800 h-12 px-8">
                    <Download className="h-4 w-4" /> Descargar Auditoría Completa
                </Button>
            </div>
        </div>
    );
}
