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
        min_pay: number;
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
        amount: number;
        remaining_amount: number;
    }[];
    categories: { name: string; amount: number; percentage: number }[];
    ghost_expenses: { description: string; amount: number; date: string; frequency: string }[];
    financial_insights: string[];
}

interface AnalysisDashboardProps {
    data: AnalysisResult;
}

export function AnalysisDashboard({ data }: AnalysisDashboardProps) {

    // Helper for currency format
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: data.summary.currency || 'USD' }).format(amount);
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("Reporte Financiero Detallado", 20, 20);

        doc.setFontSize(14);
        doc.text(`Total: ${formatCurrency(data.summary.total_pay)}`, 20, 40);
        doc.text(`Vencimiento: ${data.summary.due_date}`, 20, 50);

        if (data.summary.bank_name) {
            doc.text(`Tarjeta: ${data.summary.bank_name} - ${data.summary.card_issuer}`, 20, 60);
        }

        doc.text("Cuotas / Playazos:", 20, 80);
        let y = 90;
        data.installments.forEach(ins => {
            doc.setFontSize(10);
            doc.text(`${ins.description} (${ins.current_installment}/${ins.total_installments}) - ${formatCurrency(ins.amount)}`, 20, y);
            y += 8;
        });

        y += 10;
        doc.setFontSize(14);
        doc.text("Gastos Fantasma:", 20, y);
        y += 10;
        data.ghost_expenses.forEach(g => {
            doc.setFontSize(10);
            doc.text(`${g.description} - ${formatCurrency(g.amount)}`, 20, y);
            y += 8;
        });

        doc.save("analisis-financiero-completo.pdf");
    };

    // Simple SVG Donut Chart Logic
    const calculateDonutSegments = () => {
        let cumulativePercent = 0;
        return data.categories.map((cat, index) => {
            const startX = Math.cos(2 * Math.PI * cumulativePercent);
            const startY = Math.sin(2 * Math.PI * cumulativePercent);
            cumulativePercent += cat.percentage / 100;
            const endX = Math.cos(2 * Math.PI * cumulativePercent);
            const endY = Math.sin(2 * Math.PI * cumulativePercent);

            const largeArcFlag = cat.percentage > 50 ? 1 : 0;

            const pathData = [
                `M 0 0`,
                `L ${startX} ${startY}`,
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `Z`
            ].join(' ');

            return { path: pathData, color: `hsl(${index * 60 + 200}, 70%, 50%)`, name: cat.name, percent: cat.percentage };
        });
    };

    // Note: Creating a robust SVG chart from scratch in React is wordy. 
    // I'll stick to a clean CSS bar layout for reliability if the SVG math gets tricky, 
    // but a bar chart is often friendlier for this data than a donut. 
    // Let's use clean colored progress bars for categories, it's safer and looks great.

    return (
        <div className="space-y-8 w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">

            {/* Header / Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-slate-900 text-white border-0 shadow-xl col-span-2 md:col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Total a Pagar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatCurrency(data.summary.total_pay)}</div>
                        <div className="text-xs text-slate-400 mt-1 flex flex-col gap-1">
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
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(data.summary.min_pay)}</div>
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

            {/* Insights Banner */}
            {data.financial_insights.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 text-indigo-900 text-sm">
                    <AlertTriangle className="h-5 w-5 text-indigo-600 shrink-0" />
                    <ul className="list-disc pl-4 space-y-1">
                        {data.financial_insights.map((insight, i) => <li key={i}>{insight}</li>)}
                    </ul>
                </div>
            )}

            <div className="grid gap-8 md:grid-cols-2">
                {/* Categories Chart */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" /> Distribución de Gastos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-5">
                            {data.categories.map((cat, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{cat.name}</span>
                                        <span className="text-gray-500">{cat.percentage}% ({formatCurrency(cat.amount)})</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-1000 ease-out",
                                                idx === 0 ? "bg-blue-500" :
                                                    idx === 1 ? "bg-violet-500" :
                                                        idx === 2 ? "bg-emerald-500" : "bg-orange-400"
                                            )}
                                            style={{ width: `${cat.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Ghost Expenses */}
                <div className="md:col-span-1">
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
                                {data.installments.map((ins, idx) => (
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
                                        <td className="px-4 py-3">{formatCurrency(ins.amount)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(ins.remaining_amount)}</td>
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
