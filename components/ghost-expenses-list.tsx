"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Ghost, Sparkles, TrendingUp } from "lucide-react";

interface GhostExpense {
    description: string;
    amount: number;
    date: string;
    frequency: string;
    currency?: string;
}

interface GhostExpensesListProps {
    expenses: GhostExpense[];
    currency?: string;
}

export function GhostExpensesList({ expenses = [], currency = "USD" }: GhostExpensesListProps) {
    const formatCurrency = (amount: number, currencyCode?: string) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: currencyCode || currency,
        }).format(amount);
    };

    const calculateAnnualProjection = (amount: number, frequency: string) => {
        const freq = frequency?.toLowerCase() || "";
        if (freq.includes("mensual")) return amount * 12;
        if (freq.includes("bimestral")) return amount * 6;
        if (freq.includes("semanal")) return amount * 52;
        if (freq.includes("trimestral")) return amount * 4;
        return amount; // Default to single occurrence or annual
    };

    // Calculate totals based on primary currency (simplification for now)
    // Ideally we'd separate ARS/USD totals, but for space we'll sum raw numbers
    // expecting most ghosts are subscriptions in same currency or converted.
    // A better approach is to filter by currency. 
    const totalMonthlyGhost = expenses.reduce((acc, curr) => {
        const freq = curr.frequency?.toLowerCase() || "";
        let val = 0;
        if (freq.includes("mensual")) val = curr.amount;
        if (freq.includes("semanal")) val = curr.amount * 4;
        // Only sum if currency matches global or just raw sum (risk of mixing ARS/USD)
        // Let's assume raw sum for "estimation" impact.
        return acc + val;
    }, 0);

    const totalSavingsPotential = expenses.reduce((acc, curr) => {
        return acc + calculateAnnualProjection(curr.amount, curr.frequency);
    }, 0);

    if (expenses.length === 0) {
        return (
            <Card className="border-green-100 bg-green-50/50">
                <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="bg-green-100 p-3 rounded-full">
                        <Sparkles className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-green-900">¡Limpieza Total!</h3>
                        <p className="text-green-700 text-sm">No detectamos gastos fantasma en este periodo.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-red-100 bg-gradient-to-br from-white to-red-50/20 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-red-50">
                <div className="flex items-center gap-2">
                    <div className="bg-red-100 p-2 rounded-lg">
                        <Ghost className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-gray-900">Detector de Gastos Fantasma</CardTitle>
                        <CardDescription className="text-red-700 font-medium">
                            Detectamos {expenses.length} gastos que podrían evitarse
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-red-50/50">
                            <TableRow>
                                <TableHead className="w-[40%]">Descripción</TableHead>
                                <TableHead>Frecuencia</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-right text-red-700 font-semibold" title="Proyección a 1 año">Anualizado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map((expense, idx) => (
                                <TableRow key={idx} className="hover:bg-red-50/30 transition-colors">
                                    <TableCell className="font-medium">
                                        {expense.description}
                                        <div className="text-xs text-gray-400 font-normal">{expense.date}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-white hover:bg-white text-gray-600 font-normal border-gray-200">
                                            {expense.frequency || "N/A"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-gray-700">
                                        {formatCurrency(expense.amount, expense.currency)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-red-600">
                                        {formatCurrency(calculateAnnualProjection(expense.amount, expense.frequency), expense.currency)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-4 bg-red-50 border-t border-red-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-red-800">
                        <TrendingUp className="h-4 w-4" />
                        <span>Impacto Mensual Est: <strong>{formatCurrency(totalMonthlyGhost)}</strong></span>
                    </div>
                    <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-red-100 text-red-600 font-bold">
                        Ahorro Anual Potencial: {formatCurrency(totalSavingsPotential)}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
