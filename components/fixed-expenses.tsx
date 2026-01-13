"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Edit2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type FixedExpense = {
    id: string;
    description: string;
    amount: number;
    currency: string;
    due_day: number;
    category: string;
    type: string;
    is_recurring?: boolean;
    start_date?: string;
    end_date?: string;
};

// Internal type for items detected by AI
type ScannedFixedItem = {
    id: string;
    description: string;
    amount: number;
    due_day: number;
    category: string;
};

const CATEGORIES = [
    "Vivienda", "Servicios", "Educación", "Seguros",
    "Préstamos", "Suscripciones", "Transporte", "Salud", "Otros"
];

const TYPES = ["Esencial", "Opcional", "Lujo"];

export function FixedExpenses({ selectedMonth, setSelectedMonth }: { selectedMonth: string, setSelectedMonth?: (month: string) => void }) {
    const [expenses, setExpenses] = useState<FixedExpense[]>([]);
    const [viewYear, setViewYear] = useState(parseInt(selectedMonth.split('-')[0]));

    // Update view year when selected month changes externally
    useEffect(() => {
        setViewYear(parseInt(selectedMonth.split('-')[0]));
    }, [selectedMonth]);

    const [loading, setLoading] = useState(true);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDay, setDueDay] = useState("");
    const [category, setCategory] = useState("Vivienda");
    const [type, setType] = useState("Esencial");
    const [isRecurring, setIsRecurring] = useState(true);
    const [startDate, setStartDate] = useState<string>(selectedMonth + '-01');
    const [endDate, setEndDate] = useState<string>("");

    // States for Scanning (Reused concept from VariableExpenses)
    const [isScanning, setIsScanning] = useState(false);
    const [scannedItems, setScannedItems] = useState<ScannedFixedItem[]>([]);
    const [showReview, setShowReview] = useState(false);
    const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);

    useEffect(() => {
        fetchExpenses();
    }, [selectedMonth]);

    const fetchExpenses = async () => {
        const { data, error } = await supabase
            .from("fixed_expenses")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) console.error("Error fetching fixed expenses:", error);
        else setExpenses(data || []);
        setLoading(false);
    };

    const addExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !dueDay) return;

        const { data, error } = await supabase
            .from("fixed_expenses")
            .insert([{
                description,
                amount: parseFloat(amount),
                due_day: parseInt(dueDay),
                category,
                type,
                is_recurring: isRecurring,
                start_date: startDate,
                end_date: endDate || null,
                user_id: (await supabase.auth.getUser()).data.user?.id
            }])
            .select();

        if (error) {
            console.error("Error adding expense:", error);
            toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`);
        } else {
            setExpenses([data[0], ...expenses]);
            resetForm();
            toast.success("Gasto agregado correctamente");
        }
    };

    const resetForm = () => {
        setDescription("");
        setAmount("");
        setDueDay("");
        setCategory("Vivienda");
        setType("Esencial");
        setIsRecurring(true);
        setEndDate("");
        setStartDate(new Date().toISOString().split('T')[0].slice(0, 8) + '01');
        setEditingExpense(null);
    };

    const handleUpdateExpense = async () => {
        if (!editingExpense || !amount || !description) return;
        setLoading(true);
        try {
            const newAmount = parseFloat(amount);
            const isAmountChanged = newAmount !== editingExpense.amount;

            if (isAmountChanged) {
                // Versioning logic
                const lastMonthEnd = new Date();
                lastMonthEnd.setDate(0);
                const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

                await supabase.from("fixed_expenses").update({ end_date: lastMonthEndStr }).eq("id", editingExpense.id);

                const thisMonthStartStr = new Date().toISOString().split('T')[0].slice(0, 8) + '01';
                const { data: newRec, error } = await supabase.from("fixed_expenses").insert({
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    description,
                    amount: newAmount,
                    due_day: parseInt(dueDay),
                    category,
                    type,
                    is_recurring: true,
                    start_date: thisMonthStartStr,
                    end_date: endDate || null
                }).select().single();

                if (error) throw error;
                setExpenses([newRec, ...expenses.filter(i => i.id !== editingExpense.id)]);
            } else {
                const { data, error } = await supabase.from("fixed_expenses").update({
                    description,
                    due_day: parseInt(dueDay),
                    category,
                    type,
                    is_recurring: isRecurring,
                    start_date: startDate || null,
                    end_date: endDate || null
                }).eq("id", editingExpense.id).select().single();

                if (error) throw error;
                setExpenses(expenses.map(i => i.id === data.id ? data : i));
            }
            resetForm();
            toast.success("Gasto actualizado");
        } catch (error: any) {
            console.error("Error updating expense:", error);
            toast.error(`Error: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const deleteExpense = async (id: string) => {
        try {
            const { error } = await supabase
                .from("fixed_expenses")
                .delete()
                .eq("id", id);

            if (error) throw error;
            setExpenses(expenses.filter((e) => e.id !== id));
            toast.success("Gasto eliminado");
        } catch (error: any) {
            console.error("Error deleting expense:", error);
            toast.error("Error al eliminar el gasto");
        }
    };

    // --- SCAN TICKET LOGIC (REUSED CONCEPT) ---

    const mapCategoryForward = (aiCat: string) => {
        if (aiCat === "Hogar") return "Vivienda";
        if (aiCat === "Comida" || aiCat === "Supermercado" || aiCat === "Entretenimiento" || aiCat === "Ropa") return "Otros";
        if (CATEGORIES.includes(aiCat)) return aiCat;
        return "Otros";
    };

    const handleFileSelect = async (file: File | null) => {
        if (!file) return;
        setIsScanning(true);
        setShowReview(true);

        try {
            // 1. Convert Image to JPEG Base64 (Client-Side)
            const base64 = await new Promise<string>((resolve, reject) => {
                if (file.type.startsWith("image/")) {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL("image/jpeg", 0.8));
                    };
                    img.onerror = (err) => reject(err);
                    img.src = URL.createObjectURL(file);
                } else {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(file);
                }
            });

            // 2. Call API
            const storedSessionId = localStorage.getItem("stripe_session_id") || "free_tier";
            const res = await fetch("/api/analyze-receipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pdfBase64: base64, sessionId: storedSessionId })
            });

            const data = await res.json();

            if (data.items && Array.isArray(data.items)) {
                // ... logic
                toast.success(`${data.items.length} componentes de factura detectados`);
            } else {
                toast.error(`No se detectaron datos válidos: ${data.error || 'Error desconocido'}`);
                setShowReview(false);
            }
        } catch (e: any) {
            console.error(e);
            toast.error(`Error al escanear: ${e.message}`);
            setShowReview(false);
        } finally {
            setIsScanning(false);
        }
    };

    const confirmImport = async () => {
        if (scannedItems.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const itemsToInsert = scannedItems.map(item => ({
            user_id: user.id,
            description: item.description,
            amount: item.amount,
            due_day: item.due_day,
            category: item.category,
            type: "Esencial" // Default for scanned fixed expenses
        }));

        const { data, error } = await supabase
            .from("fixed_expenses")
            .insert(itemsToInsert)
            .select();

        if (error) {
            console.error("Error importing:", error);
            toast.error("Error al guardar los gastos.");
        } else {
            setExpenses([...(data || []), ...expenses]);
            setScannedItems([]);
            setShowReview(false);
            toast.success("¡Gastos fijos importados!");
        }
    };

    const removeScannedItem = (idx: number) => {
        setScannedItems(scannedItems.filter((_, i) => i !== idx));
    };

    // Monthly Accounting Logic: Filter records belonging to the selected month
    const filteredExpenses = expenses.filter(f => {
        const [yh, mh] = selectedMonth.split('-');
        const ms = new Date(Number(yh), Number(mh) - 1, 1);
        const me = new Date(Number(yh), Number(mh), 0, 23, 59, 59);

        const start = f.start_date ? new Date(f.start_date) : null;
        const end = f.end_date ? new Date(f.end_date) : null;
        return (!start || start <= me) && (!end || end >= ms);
    });

    const totalFixed = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Input Card - Aurora Glass */}
            <div className="bg-slate-950/50 border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 opacity-100" />
                <div className="absolute -top-24 -right-24 h-64 w-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 relative z-10">
                    <div>
                        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight flex items-center gap-3">
                            <div className="h-10 w-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                <span className="text-purple-400 font-bold text-lg">Fix</span>
                            </div>
                            Gastos Fijos
                        </h3>
                        <div className="flex items-center gap-3 mt-1 ml-[52px]">
                            <p className="text-slate-400 text-sm font-medium">
                                {new Date(selectedMonth + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                            </p>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/* .pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                                    disabled={isScanning}
                                />
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 bg-purple-500/5 rounded-full border border-purple-500/20" disabled={isScanning}>
                                    {isScanning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                                    {isScanning ? "Escaneando..." : "Escanear Factura"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Total Pill */}
                    <div className="bg-black/20 rounded-2xl p-4 flex flex-col items-end border border-white/5 shadow-inner">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-1 drop-shadow-sm">Total Estimado</span>
                        <span className="text-2xl font-mono font-bold text-white drop-shadow-md">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(totalFixed)}
                        </span>
                    </div>
                </div>

                {/* Review Section */}
                {showReview && (
                    <div className="mb-8 p-6 bg-slate-900/60 border border-white/10 rounded-2xl animate-in fade-in zoom-in duration-300 relative z-10 backdrop-blur-md">
                        <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                            Facturas Detectadas ({scannedItems.length})
                        </h3>

                        {isScanning ? (
                            <div className="text-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
                                <p className="text-slate-400 font-mono text-xs">Analizando comprobante...</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 mb-6 scrollbar-hide">
                                    {scannedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-800/40 rounded-xl border border-white/5 shadow-sm group hover:border-purple-500/30 transition-colors">
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-200 text-sm">{item.description}</p>
                                                <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-500 mt-1">
                                                    <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">Día {item.due_day}</span>
                                                    <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">{item.category}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono font-bold text-white">${item.amount.toLocaleString()}</span>
                                                <button
                                                    onClick={() => removeScannedItem(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {scannedItems.length === 0 && (
                                        <p className="text-xs text-center py-6 text-slate-500 font-mono">No se pudieron extraer datos legibles.</p>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                    <Button variant="ghost" onClick={() => { setShowReview(false); setScannedItems([]); }} className="text-slate-400 text-xs font-bold hover:text-white hover:bg-white/5">
                                        CANCELAR
                                    </Button>
                                    <Button
                                        onClick={confirmImport}
                                        disabled={scannedItems.length === 0}
                                        className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] text-xs font-bold px-6 border border-purple-400/50"
                                    >
                                        CONFIRMAR IMPORTACIÓN
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <form onSubmit={editingExpense ? (e) => { e.preventDefault(); handleUpdateExpense(); } : addExpense} className="grid grid-cols-1 md:grid-cols-6 gap-6 items-end mb-4 relative z-10">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Concepto</label>
                        <input
                            placeholder="Ej. Alquiler"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Monto</label>
                        <input
                            type="number"
                            placeholder="$0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full p-3 bg-slate-900/80 border border-white/10 rounded-xl text-white font-mono font-bold placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Día Pago</label>
                        <input
                            type="number"
                            placeholder="1-31"
                            value={dueDay}
                            onChange={(e) => setDueDay(e.target.value)}
                            className="w-full p-3 bg-slate-900/80 border border-white/10 rounded-xl text-white font-mono font-bold placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                            max={31}
                            min={1}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-3 bg-slate-900/80 border border-white/10 rounded-xl text-white font-medium cursor-pointer focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-950">{c}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Tipo</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full p-3 bg-slate-900/80 border border-white/10 rounded-xl text-white font-medium cursor-pointer focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        >
                            {TYPES.map(t => <option key={t} value={t} className="bg-slate-950">{t}</option>)}
                        </select>
                    </div>

                    <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isRecurringFixed"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-slate-600 bg-slate-900 checked:border-purple-500 checked:bg-purple-500 transition-all"
                                    />
                                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                <label htmlFor="isRecurringFixed" className="text-sm font-bold text-slate-200 cursor-pointer select-none">Pago Recurrente</label>
                            </div>

                            {isRecurring && (
                                <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-2 rounded-xl border border-white/5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fin:</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="text-xs font-mono text-white bg-transparent outline-none [&::-webkit-calendar-picker-indicator]:invert"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 ml-auto">
                            {editingExpense ? (
                                <>
                                    <Button type="button" variant="outline" onClick={resetForm} className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 bg-transparent">
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-6 shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/50">
                                        <Save className="mr-2 h-4 w-4" /> Guardar
                                    </Button>
                                </>
                            ) : (
                                <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-8 shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/50 transition-transform hover:scale-[1.02]">
                                    <Plus className="mr-2 h-4 w-4" /> Agregar Gasto
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Horizontal Annual Calendar */}
            <div className="relative">
                <div className="flex items-center justify-between mb-4 px-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        Calendario de Pagos <span className="text-purple-500">•</span> {viewYear}
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

                            // Mock calculation for having expenses (in real app, we'd check if any expense exists in this month)
                            const hasExpenses = true; // Placeholder logic

                            return (
                                <button
                                    key={monthNum}
                                    onClick={() => setSelectedMonth?.(monthStr)}
                                    className={`
                                        relative group flex flex-col items-center justify-center min-w-[80px] h-[80px] rounded-2xl border transition-all duration-300
                                        ${isSelected
                                            ? 'bg-purple-600/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }
                                    `}
                                >
                                    <span className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isSelected ? 'text-purple-300' : 'text-slate-500'}`}>
                                        {new Date(2024, i, 1).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span className={`text-xl font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                        {monthNum.toString().padStart(2, '0')}
                                    </span>

                                    {isSelected && (
                                        <div className="absolute -bottom-1 w-8 h-1 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-4">

                {loading ? (
                    <div className="text-center p-8"><Loader2 className="animate-spin h-8 w-8 text-purple-400 mx-auto" /></div>
                ) : (
                    <div className="grid gap-4">
                        {filteredExpenses.map((expense) => (
                            <div key={expense.id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-900/40 rounded-[24px] shadow-lg hover:bg-slate-800/60 transition-all duration-300 border border-white/5 hover:border-purple-500/30 cursor-default backdrop-blur-sm">
                                <div className="flex items-center gap-5 mb-4 md:mb-0">
                                    <div className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-white/5 text-slate-400 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors duration-300 border border-white/5 group-hover:border-purple-500/30 shadow-sm">
                                        <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">Día</span>
                                        <span className="text-xl font-mono font-bold leading-none">{expense.due_day}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors mb-1">{expense.description}</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-white/5 text-slate-400 rounded-lg border border-white/5">
                                                {expense.category || "General"}
                                            </span>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-lg border ${expense.type === 'Esencial' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                expense.type === 'Lujo' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                {expense.type || "Opcional"}
                                            </span>
                                            {expense.is_recurring && (
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20 flex items-center gap-1">
                                                    Recurrente
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-[76px] md:pl-0">
                                    <span className="font-mono font-bold text-xl text-white drop-shadow-md">
                                        ${expense.amount.toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setEditingExpense(expense);
                                                setDescription(expense.description);
                                                setAmount(expense.amount.toString());
                                                setDueDay(expense.due_day.toString());
                                                setCategory(expense.category);
                                                setType(expense.type);
                                                setIsRecurring(!!expense.is_recurring);
                                                setEndDate(expense.end_date || "");
                                                setStartDate(expense.start_date || "");
                                            }}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-all"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteExpense(expense.id)}
                                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {expenses.length === 0 && (
                            <div className="bg-white/5 rounded-[24px] p-12 text-center border border-white/5 backdrop-blur-sm">
                                <p className="text-slate-400 font-medium">No hay gastos fijos configurados.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
