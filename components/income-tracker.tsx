"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface Income {
    id: string;
    description: string;
    amount: number;
    type: "Salario" | "Renta" | "Inversiones" | "Otro";
    is_recurring?: boolean;
    receive_date?: string;
    end_date?: string;
}

export function IncomeTracker() {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<Income["type"]>("Salario");
    const [isRecurring, setIsRecurring] = useState(true);
    const [receiveDate, setReceiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>("");
    const [loading, setLoading] = useState(true);

    // Load from Supabase on mount
    useEffect(() => {
        fetchIncomes();
    }, []);

    const fetchIncomes = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            const { data, error } = await supabase
                .from("incomes")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setIncomes(data || []);
        } catch (error) {
            console.error("Error fetching incomes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddIncome = async () => {
        if (!description || !amount) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Debes iniciar sesión");
                return;
            }

            const newIncome = {
                user_id: user.id,
                description,
                amount: parseFloat(amount),
                type,
                is_recurring: isRecurring,
                receive_date: receiveDate,
                end_date: isRecurring && endDate ? endDate : null
            };

            const { data, error } = await supabase
                .from("incomes")
                .insert(newIncome)
                .select()
                .single();

            if (error) throw error;

            setIncomes([data, ...incomes]);
            setDescription("");
            setAmount("");
            setEndDate("");
            setReceiveDate(new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error("Error adding income:", error);
            alert("Error al guardar ingreso");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from("incomes")
                .delete()
                .eq("id", id);

            if (error) throw error;
            setIncomes(incomes.filter(i => i.id !== id));
        } catch (error) {
            console.error("Error deleting income:", error);
            alert("Error al eliminar");
        }
    };

    const totalIncome = incomes.reduce((acc, curr) => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // If recurring
        if (curr.is_recurring) {
            // Check if it has an end date and if it's passed
            if (curr.end_date) {
                const endDate = new Date(curr.end_date);
                if (endDate < new Date(currentYear, currentMonth, 1)) {
                    return acc; // Expired
                }
            }
            return acc + curr.amount;
        }

        // If one-off/unique
        if (curr.receive_date) {
            const receiveDate = new Date(curr.receive_date);
            if (receiveDate.getMonth() === currentMonth && receiveDate.getFullYear() === currentYear) {
                return acc + curr.amount;
            }
        }

        return acc;
    }, 0);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-green-600" /> Registro de Ingresos
                    </CardTitle>
                    <CardDescription>
                        Registra tus fuentes de ingresos para calcular tu capacidad de pago.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4 items-end mb-6">
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Descripción</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Sueldo Mensual"
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Monto</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="w-full p-2 border rounded-md mb-4 md:mb-0 h-10 bg-white"
                            >
                                <option value="Salario">Salario</option>
                                <option value="Renta">Renta</option>
                                <option value="Inversiones">Inversiones</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isRecurring"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 cursor-pointer select-none">Ingreso Recurrente (Mensual)</label>
                        </div>

                        <div className="flex gap-4 items-center flex-1">
                            {isRecurring ? (
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-500 whitespace-nowrap">Válido Hasta:</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="text-sm p-2 border rounded-md bg-white shadow-sm"
                                        title="Dejar vacío si es indefinido"
                                    />
                                    <span className="text-xs text-gray-400">(Opcional)</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-500 whitespace-nowrap">Fecha de Ingreso:</label>
                                    <input
                                        type="date"
                                        value={receiveDate}
                                        onChange={(e) => setReceiveDate(e.target.value)}
                                        className="text-sm p-2 border rounded-md bg-white shadow-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <Button onClick={handleAddIncome} disabled={loading} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Agregar Ingreso
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Tu Lista de Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading && incomes.length === 0 ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>
                        ) : incomes.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No has registrado ingresos aún.</p>
                        ) : (
                            <div className="space-y-3">
                                {incomes.map((inc) => (
                                    <div key={inc.id} className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm">
                                        <div>
                                            <p className="font-medium text-gray-900">{inc.description}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">{inc.type}</span>
                                                {inc.is_recurring ? (
                                                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1">
                                                        Recurrente
                                                        {inc.end_date && <span className="text-blue-500"> (Hasta {inc.end_date})</span>}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded-full">
                                                        Único ({inc.receive_date})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-green-600">
                                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(inc.amount)}
                                            </span>
                                            <button onClick={() => handleDelete(inc.id)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                        <CardTitle className="text-green-800">Total Mensual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-green-700">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(totalIncome)}
                        </div>
                        <p className="text-xs text-green-600 mt-2">Capacidad total aproximada</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
