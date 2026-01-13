"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, DollarSign, Loader2, Save, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface Income {
    id: string;
    description: string;
    amount: number;
    type: "Salario" | "Renta" | "Inversiones" | "Otro";
    is_recurring?: boolean;
    receive_date?: string;
    start_date?: string;
    end_date?: string;
}

export function IncomeTracker({ selectedMonth, setSelectedMonth }: { selectedMonth: string, setSelectedMonth?: (month: string) => void }) {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [viewYear, setViewYear] = useState(parseInt(selectedMonth.split('-')[0]));

    // Update view year when selected month changes externally
    useEffect(() => {
        setViewYear(parseInt(selectedMonth.split('-')[0]));
    }, [selectedMonth]);

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<Income["type"]>("Salario");
    const [isRecurring, setIsRecurring] = useState(true);
    const [receiveDate, setReceiveDate] = useState<string>(selectedMonth + '-01');
    const [startDate, setStartDate] = useState<string>(selectedMonth + '-01');
    const [endDate, setEndDate] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);

    // Load from Supabase on mount
    useEffect(() => {
        fetchIncomes();
    }, [selectedMonth]); // Refetch or re-filter when month changes

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
                toast.error("Debes iniciar sesión");
                return;
            }

            const newIncome = {
                user_id: user.id,
                description,
                amount: parseFloat(amount),
                type,
                is_recurring: isRecurring,
                receive_date: !isRecurring ? receiveDate : null,
                start_date: isRecurring ? startDate : null,
                end_date: isRecurring && endDate ? endDate : null
            };

            const { data, error } = await supabase
                .from("incomes")
                .insert(newIncome)
                .select()
                .single();

            if (error) throw error;

            setIncomes([data, ...incomes]);
            resetForm();
            toast.success("Ingreso registrado");
        } catch (error: any) {
            console.error("Error adding income:", error);
            toast.error(`Error al guardar ingreso: ${error.message || "Error desconocido"}`);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setDescription("");
        setAmount("");
        setEndDate("");
        setEditingIncome(null);
        setReceiveDate(new Date().toISOString().split('T')[0]);
        setStartDate(new Date().toISOString().split('T')[0].slice(0, 8) + '01');
    };

    const handleUpdateIncome = async () => {
        if (!editingIncome || !amount || !description) return;
        setLoading(true);
        try {
            const newAmount = parseFloat(amount);
            const isAmountChanged = newAmount !== editingIncome.amount;

            if (editingIncome.is_recurring && isAmountChanged) {
                // Versioning logic: 
                // 1. Close the current one (end date = last day of last month)
                const lastMonthEnd = new Date();
                lastMonthEnd.setDate(0); // Last day of previous month
                const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

                await supabase.from("incomes").update({ end_date: lastMonthEndStr }).eq("id", editingIncome.id);

                // 2. Create new one (start date = first day of this month)
                const thisMonthStartStr = new Date().toISOString().split('T')[0].slice(0, 8) + '01';
                const { data: newRec, error } = await supabase.from("incomes").insert({
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    description,
                    amount: newAmount,
                    type,
                    is_recurring: true,
                    start_date: thisMonthStartStr,
                    end_date: endDate || null
                }).select().single();

                if (error) throw error;
                setIncomes([newRec, ...incomes.filter(i => i.id !== editingIncome.id)]);
            } else {
                // Typo fix or non-recurring
                const { data, error } = await supabase.from("incomes").update({
                    description,
                    amount: newAmount,
                    type,
                    receive_date: (!isRecurring ? receiveDate : (editingIncome.receive_date)) || null,
                    start_date: (isRecurring ? startDate : (editingIncome.start_date)) || null,
                    end_date: (isRecurring && endDate) ? endDate : null
                }).eq("id", editingIncome.id).select().single();

                if (error) throw error;
                setIncomes(incomes.map(i => i.id === data.id ? data : i));
            }
            resetForm();
            toast.success("Ingreso actualizado correctamente");
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message);
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
            toast.success("Ingreso eliminado");
        } catch (error) {
            console.error("Error deleting income:", error);
            toast.error("Error al eliminar");
        }
    };

    // Monthly Accounting Logic: Filter records belonging to the selected month
    const filteredIncomes = incomes.filter(inc => {
        const [yh, mh] = selectedMonth.split('-');
        const ms = new Date(Number(yh), Number(mh) - 1, 1);
        const me = new Date(Number(yh), Number(mh), 0, 23, 59, 59);

        if (inc.is_recurring) {
            const start = inc.start_date ? new Date(inc.start_date) : null;
            const end = inc.end_date ? new Date(inc.end_date) : null;
            return (!start || start <= me) && (!end || end >= ms);
        } else {
            const rDate = inc.receive_date ? new Date(inc.receive_date) : null;
            return rDate && rDate >= ms && rDate <= me;
        }
    });

    const totalIncome = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Input Card - Aurora Glass */}
            <div className="bg-slate-950/50 border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-100" />
                <div className="absolute -top-24 -right-24 h-64 w-64 bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 relative z-10">
                    <div>
                        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight flex items-center gap-3">
                            <div className="h-10 w-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                <DollarSign className="h-5 w-5 text-cyan-400" />
                            </div>
                            {editingIncome ? "Editar Ingreso" : "Nuevo Ingreso"}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1 ml-[52px]">
                            {editingIncome ? "Modifica los detalles del ingreso seleccionado." : "Registra una nueva fuente de ingresos."}
                        </p>
                    </div>
                    {/* Monthly Total Pill */}
                    <div className="bg-black/20 rounded-2xl p-4 flex flex-col items-end border border-white/5 shadow-inner">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1 drop-shadow-sm">Total Mensual</span>
                        <span className="text-2xl font-mono font-bold text-white drop-shadow-md">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(totalIncome)}
                        </span>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-4 items-end mb-8 relative z-10">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Descripción</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Sueldo Mensual"
                            className="w-full p-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Monto</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-3 bg-slate-900/80 border border-white/10 rounded-xl text-white font-mono font-bold placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Categoría</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            className="w-full p-3 bg-slate-900/80 border border-white/10 rounded-xl text-white font-medium cursor-pointer focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                        >
                            <option value="Salario" className="bg-slate-950">Salario</option>
                            <option value="Renta" className="bg-slate-950">Renta</option>
                            <option value="Inversiones" className="bg-slate-950">Inversiones</option>
                            <option value="Otro" className="bg-slate-950">Otro</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap gap-6 items-center mb-8 p-6 bg-slate-900/40 rounded-2xl border border-white/5 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                id="isRecurring"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-slate-600 bg-slate-900 checked:border-cyan-500 checked:bg-cyan-500 transition-all"
                            />
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <label htmlFor="isRecurring" className="text-sm font-bold text-slate-200 cursor-pointer select-none">Recurrente Mensual</label>
                    </div>

                    <div className="flex gap-4 items-center flex-1">
                        {isRecurring ? (
                            <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-2 rounded-xl border border-white/5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasta:</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="text-xs font-mono text-white bg-transparent outline-none [&::-webkit-calendar-picker-indicator]:invert"
                                    title="Dejar vacío si es indefinido"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-2 rounded-xl border border-white/5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha:</label>
                                <input
                                    type="date"
                                    value={receiveDate}
                                    onChange={(e) => setReceiveDate(e.target.value)}
                                    className="text-xs font-mono text-white bg-transparent outline-none [&::-webkit-calendar-picker-indicator]:invert"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 justify-end relative z-10">
                    {editingIncome ? (
                        <>
                            <Button variant="outline" onClick={resetForm} disabled={loading} className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 bg-transparent">
                                Cancelar
                            </Button>
                            <Button onClick={handleUpdateIncome} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-8 shadow-[0_0_20px_rgba(8,145,178,0.4)] border border-cyan-400/50">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Guardar
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleAddIncome} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-8 py-6 shadow-[0_0_20px_rgba(8,145,178,0.4)] border border-cyan-400/50 transition-all hover:scale-[1.02]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Agregar Ingreso
                        </Button>
                    )}
                </div>
            </div>

            {/* Horizontal Annual Calendar */}
            <div className="relative">
                <div className="flex items-center justify-between mb-4 px-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        Calendario de Ingresos <span className="text-cyan-500">•</span> {viewYear}
                    </h4>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewYear(prev => prev - 1)}
                            className="p-1 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-mono font-bold text-slate-300 text-sm">{viewYear}</span>
                        <button
                            onClick={() => setViewYear(prev => prev + 1)}
                            className="p-1 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-950/30 border-y border-white/5 backdrop-blur-sm p-4 mb-8 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-3 min-w-max px-2">
                        {Array.from({ length: 12 }, (_, i) => {
                            const monthNum = i + 1;
                            const monthStr = `${viewYear}-${monthNum.toString().padStart(2, '0')}`;
                            const isSelected = selectedMonth === monthStr;
                            const isPast = monthStr < selectedMonth;

                            return (
                                <button
                                    key={monthNum}
                                    onClick={() => setSelectedMonth?.(monthStr)}
                                    className={`
                                        relative group flex flex-col items-center justify-center min-w-[80px] h-[80px] rounded-2xl border transition-all duration-300
                                        ${isSelected
                                            ? 'bg-cyan-600/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }
                                    `}
                                >
                                    <span className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`}>
                                        {new Date(2024, i, 1).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span className={`text-xl font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                        {monthNum.toString().padStart(2, '0')}
                                    </span>

                                    {isSelected && (
                                        <div className="absolute -bottom-1 w-8 h-1 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] pl-4">Historial de Ingresos</h4>

                {loading && incomes.length === 0 ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-cobalt-blue" /></div>
                ) : filteredIncomes.length === 0 ? (
                    <div className="bg-white rounded-[24px] p-12 text-center border border-slate-200 shadow-sm">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <DollarSign className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">No hay ingresos registrados en este período.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredIncomes.map((inc) => (
                            <div key={inc.id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 bg-white rounded-[24px] shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 border border-slate-200 hover:border-slate-300 cursor-default">
                                <div className="flex items-center gap-5 mb-4 md:mb-0">
                                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center group-hover:bg-cobalt-blue group-hover:text-white transition-colors duration-300 border border-slate-200 group-hover:border-cobalt-blue shadow-sm">
                                        <DollarSign className="h-5 w-5 text-slate-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg text-slate-900 mb-1">{inc.description}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">{inc.type}</span>
                                            {inc.is_recurring ? (
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-blue-50 text-cobalt-blue rounded-lg border border-blue-200 flex items-center gap-1">
                                                    Recurrente
                                                    {inc.end_date && <span className="opacity-70 mx-1">• Hasta {inc.end_date}</span>}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                                                    Único • {inc.receive_date}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-[68px] md:pl-0">
                                    <span className="font-mono font-bold text-xl text-cobalt-blue">
                                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(inc.amount)}
                                    </span>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setEditingIncome(inc);
                                                setDescription(inc.description);
                                                setAmount(inc.amount.toString());
                                                setType(inc.type);
                                                setIsRecurring(!!inc.is_recurring);
                                                setEndDate(inc.end_date || "");
                                                setReceiveDate(inc.receive_date || "");
                                                setStartDate(inc.start_date || "");
                                            }}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-all"
                                            title="Editar"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inc.id)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-vibrant-magenta rounded-full transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
